/**
 * lib/game-engine.ts
 *
 * Alle spellogica, los van Supabase of enige andere opslag (zie lib/store.ts).
 * Dezelfde GameEngine-klasse draait in de Vercel-functies (met SupabaseStore)
 * en in het testscript (met MemoryStore) — dat is hoe scripts/simulate.ts en
 * tests/*.test.ts de volledige spelflow kunnen testen zonder een echt
 * Supabase-project.
 *
 * Twee bewuste, redelijke keuzes waar de bouwprompt iets vraagt dat niet in
 * het vaste 6-tabellen-datamodel past (rooms/players/rounds/assignments/
 * answers/votes — er komen hier geen tabellen bij):
 *
 * 1. "Iedereen drukt op Verder, of de host duwt door" (question_reveal → answers)
 *    Er is geen tabel om per speler bij te houden wie al op Verder heeft
 *    gedrukt. Omdat er op dit scherm niets geheims meer te verliezen is
 *    (de hoofdvraag ligt al open), laat ik de EERSTE druk op Verder — van
 *    wie dan ook — de hele room laten doorgaan. Dat is functioneel gelijk
 *    aan "iedereen drukt (er is toch niemand die wil wachten) of de host
 *    duwt door", zonder een zevende tabel.
 * 2. "Verlaat de host de room permanent" → host-rol gaat naar de langst
 *    aanwezige speler. Er is geen apart "verlaten"-veld — leaveRoom()
 *    hergebruikt players.kicked_at (nu: "niet meer actief, door kick of
 *    door zelf verlaten") en draagt de host-rol dan automatisch over.
 */

import type { CategoryId, Language } from './categories';
import { getCategory } from './categories';
import type { Store } from './store';
import { makeToken } from './token';
import { generateRoomCode } from './room-code';
import { generateQuestionPair } from './question-generator';
import { buildExplainPrompt, parseExplanation, validateExplainInput, EXPLAIN_UI_TEXT } from './explain-prompt';
import { GoogleGenAI } from '@google/genai';
import type {
  Answer,
  CategorySetting,
  ClientState,
  Phase,
  Player,
  PublicPlayer,
  Room,
  Round,
  RevealedAnswer,
  RevealedVote,
} from './types';
import { GameEngineError } from './types';

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 10;
const MAX_ANSWER_LENGTH = 120;
const STALE_ROOM_MS = 12 * 60 * 60 * 1000; // 12 uur

function noAnswerText(language: Language): string {
  return language === 'nl' ? '(geen antwoord)' : '(no answer)';
}

function isActive(p: Player): boolean {
  return !p.kicked_at;
}

export class GameEngine {
  constructor(private store: Store) {}

  /* ------------------------------------------------------------------ */
  /* Room / lobby                                                        */
  /* ------------------------------------------------------------------ */

  async createRoom(input: {
    hostName: string;
    hostEmoji: string;
    language: Language;
    category: CategorySetting;
  }): Promise<{ room: Room; player: Player; token: string }> {
    const name = input.hostName.trim().slice(0, 24);
    if (!name) throw new GameEngineError('name_required', 'Naam is verplicht.');

    let code = generateRoomCode();
    // "Roomcode al in gebruik → genereer een nieuwe."
    for (let i = 0; i < 20 && (await this.store.getRoomByCode(code)); i++) {
      code = generateRoomCode();
    }

    const room = await this.store.insertRoom({
      code,
      host_player_id: '',
      phase: 'lobby',
      language: input.language,
      category: input.category,
      last_used_category: null,
      current_round_id: null,
      round_number: 0,
      state_version: 0,
    });

    const token = makeToken();
    const host = await this.store.insertPlayer({
      room_id: room.id,
      name,
      emoji: input.hostEmoji,
      player_token: token,
      is_host: true,
      is_connected: true,
      kicked_at: null,
    });

    const updatedRoom = await this.store.updateRoom(room.id, { host_player_id: host.id });
    return { room: updatedRoom, player: host, token };
  }

  async joinRoom(input: {
    code: string;
    name: string;
    emoji: string;
  }): Promise<{ room: Room; player: Player; token: string }> {
    const room = await this.store.getRoomByCode(input.code.trim());
    if (!room) throw new GameEngineError('room_not_found', 'Deze roomcode bestaat niet (meer).');

    const players = await this.store.listPlayers(room.id);
    const active = players.filter(isActive);
    if (active.length >= MAX_PLAYERS) {
      throw new GameEngineError('room_full', 'Deze room is vol (maximaal 10 spelers).');
    }

    let name = input.name.trim().slice(0, 24);
    if (!name) throw new GameEngineError('name_required', 'Naam is verplicht.');
    // "Dubbele naam in dezelfde room → automatisch een nummer erachter."
    const existingNames = new Set(active.map((p) => p.name));
    if (existingNames.has(name)) {
      let n = 2;
      while (existingNames.has(`${name} ${n}`)) n++;
      name = `${name} ${n}`;
    }

    const token = makeToken();
    const player = await this.store.insertPlayer({
      room_id: room.id,
      name,
      emoji: input.emoji,
      player_token: token,
      is_host: false,
      is_connected: true,
      kicked_at: null,
    });

    await this.touch(room.id);
    return { room, player, token };
  }

  async reconnect(token: string): Promise<{ room: Room; player: Player }> {
    const player = await this.requirePlayer(token);
    const room = await this.requireRoom(player.room_id);
    const updated = await this.store.updatePlayer(player.id, {
      is_connected: true,
      last_seen_at: new Date().toISOString(),
    });
    return { room, player: updated };
  }

  async leaveRoom(token: string): Promise<void> {
    const player = await this.requirePlayer(token);
    const room = await this.requireRoom(player.room_id);
    await this.store.updatePlayer(player.id, { kicked_at: new Date().toISOString(), is_connected: false });

    if (room.host_player_id === player.id) {
      // "Verlaat de host de room permanent, dan gaat de host-rol automatisch
      // naar de langst aanwezige speler."
      const remaining = (await this.store.listPlayers(room.id)).filter(
        (p) => isActive(p) && p.id !== player.id,
      );
      if (remaining.length > 0) {
        const nextHost = [...remaining].sort(
          (a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime(),
        )[0];
        await this.store.updatePlayer(nextHost.id, { is_host: true });
        await this.store.updateRoom(room.id, { host_player_id: nextHost.id });
      }
    }
    await this.maybeAbortForTooFewPlayers(room.id);
    await this.touch(room.id);
  }

  /* ------------------------------------------------------------------ */
  /* Ronde starten                                                       */
  /* ------------------------------------------------------------------ */

  async startRound(token: string): Promise<Room> {
    const player = await this.requirePlayer(token);
    const room = await this.requireRoom(player.room_id);
    this.requireHost(room, player);

    if (room.phase !== 'lobby' && room.phase !== 'result') {
      throw new GameEngineError('wrong_phase', 'Er loopt al een ronde.');
    }

    const players = await this.store.listPlayers(room.id);
    const active = players.filter(isActive);
    if (active.length < MIN_PLAYERS) {
      throw new GameEngineError(
        'round_broken_too_few_players',
        `Er zijn minimaal ${MIN_PLAYERS} spelers nodig om te starten.`,
      );
    }

    const previousRounds = await this.store.listRoundsForRoom(room.id);
    const usedMainQuestions = previousRounds.map((r) => r.main_question);
    const usedFallbackKeys = previousRounds.map((r) => r.used_by_all_pair_key);

    const generated = await generateQuestionPair({
      language: room.language,
      category: room.category,
      usedMainQuestions,
      usedFallbackKeys,
      playerCount: active.length,
      previousCategory: room.last_used_category,
    });

    const imposter = active[Math.floor(Math.random() * active.length)];

    const round = await this.store.insertRound({
      room_id: room.id,
      round_number: room.round_number + 1,
      category: generated.category,
      main_question: generated.main_question,
      imposter_question: generated.imposter_question,
      imposter_player_id: imposter.id,
      phase: 'answering',
      tiebreak_number: 0,
      used_by_all_pair_key: generated.source_key,
    });

    await this.store.insertAssignments(
      active.map((p) => ({
        round_id: round.id,
        player_id: p.id,
        question_text: p.id === imposter.id ? generated.imposter_question : generated.main_question,
      })),
    );

    const updatedRoom = await this.store.updateRoom(room.id, {
      current_round_id: round.id,
      round_number: room.round_number + 1,
      phase: 'answering',
      last_used_category: generated.category,
    });
    await this.touch(room.id);
    return updatedRoom;
  }

  /* ------------------------------------------------------------------ */
  /* Answering                                                            */
  /* ------------------------------------------------------------------ */

  async submitAnswer(token: string, text: string): Promise<void> {
    const player = await this.requirePlayer(token);
    const room = await this.requireRoom(player.room_id);
    if (room.phase !== 'answering') throw new GameEngineError('wrong_phase', 'Het is nu niet de beurt om te antwoorden.');
    const round = await this.requireCurrentRound(room);

    const assignment = await this.store.getAssignmentForPlayer(round.id, player.id);
    if (!assignment) {
      throw new GameEngineError('wrong_phase', 'Je doet deze ronde nog niet mee — wacht tot de volgende ronde.');
    }

    const trimmed = text.trim().slice(0, MAX_ANSWER_LENGTH);
    if (!trimmed) throw new GameEngineError('validation_error', 'Antwoord mag niet leeg zijn.');

    await this.store.upsertAnswer({ round_id: round.id, player_id: player.id, text: trimmed });
    await this.touch(room.id);
    await this.maybeAdvancePastAnswering(room, round);
  }

  private async maybeAdvancePastAnswering(room: Room, round: Round): Promise<void> {
    const players = (await this.store.listPlayers(room.id)).filter(isActive);
    const assignments = await this.store.listAssignments(round.id);
    const assignedPlayerIds = new Set(assignments.map((a) => a.player_id));
    const relevantPlayers = players.filter((p) => assignedPlayerIds.has(p.id));
    const answers = await this.store.listAnswers(round.id);
    const answeredIds = new Set(answers.map((a) => a.player_id));

    if (relevantPlayers.every((p) => answeredIds.has(p.id))) {
      await this.store.updateRound(round.id, { phase: 'question_reveal' });
      await this.store.updateRoom(room.id, { phase: 'question_reveal' });
    }
  }

  /** Host- of speler-actie: forceert de volgende fase (AFK-afhandeling). */
  async forceAdvance(token: string): Promise<void> {
    const player = await this.requirePlayer(token);
    const room = await this.requireRoom(player.room_id);
    this.requireHost(room, player);
    const round = await this.requireCurrentRound(room);

    if (room.phase === 'answering') {
      const players = (await this.store.listPlayers(room.id)).filter(isActive);
      const assignments = await this.store.listAssignments(round.id);
      const answers = await this.store.listAnswers(round.id);
      const answeredIds = new Set(answers.map((a) => a.player_id));
      for (const assignment of assignments) {
        const player = players.find((p) => p.id === assignment.player_id);
        if (player && !answeredIds.has(player.id)) {
          await this.store.upsertAnswer({
            round_id: round.id,
            player_id: player.id,
            text: noAnswerText(room.language),
          });
        }
      }
      await this.store.updateRound(round.id, { phase: 'question_reveal' });
      await this.store.updateRoom(room.id, { phase: 'question_reveal' });
      await this.touch(room.id);
      return;
    }

    if (room.phase === 'voting') {
      // "ontbrekende stemmen tellen niet mee" — gewoon nu al afronden met wat er is.
      await this.finishVoting(room, round);
      return;
    }

    throw new GameEngineError('wrong_phase', 'Forceren kan alleen tijdens het antwoorden of stemmen.');
  }

  /* ------------------------------------------------------------------ */
  /* Reveal → answers                                                     */
  /* ------------------------------------------------------------------ */

  /** Zie de opmerking (1) hierboven: de eerste druk op "Verder" laat iedereen doorgaan. */
  async readyForAnswers(token: string): Promise<void> {
    const player = await this.requirePlayer(token);
    const room = await this.requireRoom(player.room_id);
    if (room.phase !== 'question_reveal') return; // al doorgegaan, prima
    const round = await this.requireCurrentRound(room);
    await this.store.updateRound(round.id, { phase: 'answers' });
    await this.store.updateRoom(room.id, { phase: 'answers' });
    await this.touch(room.id);
  }

  async startVoting(token: string): Promise<void> {
    const player = await this.requirePlayer(token);
    const room = await this.requireRoom(player.room_id);
    this.requireHost(room, player);
    if (room.phase !== 'answers') throw new GameEngineError('wrong_phase', 'Nog niet klaar om te stemmen.');
    const round = await this.requireCurrentRound(room);
    await this.store.updateRound(round.id, { phase: 'voting' });
    await this.store.updateRoom(room.id, { phase: 'voting' });
    await this.touch(room.id);
  }

  /* ------------------------------------------------------------------ */
  /* Voting                                                               */
  /* ------------------------------------------------------------------ */

  async submitVote(token: string, targetPlayerId: string): Promise<void> {
    const player = await this.requirePlayer(token);
    const room = await this.requireRoom(player.room_id);
    if (room.phase !== 'voting') throw new GameEngineError('wrong_phase', 'Het is nu niet de beurt om te stemmen.');
    const round = await this.requireCurrentRound(room);

    const assignment = await this.store.getAssignmentForPlayer(round.id, player.id);
    if (!assignment) throw new GameEngineError('wrong_phase', 'Je doet deze ronde niet mee.');

    const targetAssignment = await this.store.getAssignmentForPlayer(round.id, targetPlayerId);
    if (!targetAssignment) throw new GameEngineError('validation_error', 'Ongeldige stem.');

    // "Op jezelf stemmen mag" — geen extra check nodig, self-vote is toegestaan.
    await this.store.upsertVote({
      round_id: round.id,
      ballot_number: round.tiebreak_number,
      player_id: player.id,
      target_player_id: targetPlayerId,
    });
    await this.touch(room.id);

    await this.maybeFinishVoting(room, round);
  }

  private async maybeFinishVoting(room: Room, round: Round): Promise<void> {
    const players = (await this.store.listPlayers(room.id)).filter(isActive);
    const assignments = await this.store.listAssignments(round.id);
    const assignedPlayerIds = new Set(assignments.map((a) => a.player_id));
    const relevantPlayers = players.filter((p) => assignedPlayerIds.has(p.id));
    const votes = await this.store.listVotes(round.id, round.tiebreak_number);
    const votedIds = new Set(votes.map((v) => v.player_id));

    if (relevantPlayers.every((p) => votedIds.has(p.id))) {
      await this.finishVoting(room, round);
    }
  }

  /** Telt de stemmen van het huidige ballot en handelt gelijkspel/tiebreak af. */
  private async finishVoting(room: Room, round: Round): Promise<void> {
    const votes = await this.store.listVotes(round.id, round.tiebreak_number);
    const tally = new Map<string, number>();
    for (const v of votes) tally.set(v.target_player_id, (tally.get(v.target_player_id) ?? 0) + 1);

    let maxVotes = -1;
    for (const count of tally.values()) maxVotes = Math.max(maxVotes, count);
    const leaders = [...tally.entries()].filter(([, count]) => count === maxVotes).map(([id]) => id);
    const isTie = leaders.length !== 1;

    if (isTie && round.tiebreak_number === 0) {
      // "Extra stemronde waarin iedereen opnieuw op iedereen kan stemmen."
      await this.store.updateRound(round.id, { tiebreak_number: 1 });
      await this.touch(room.id);
      return; // phase blijft 'voting', client ziet tiebreak_number omhoog gaan
    }

    // Definitieve uitslag: ofwel een duidelijke winnaar, ofwel — bij een
    // tiebreak die opnieuw gelijk staat — wint de imposter automatisch.
    await this.store.updateRound(round.id, { phase: 'result' });
    await this.store.updateRoom(room.id, { phase: 'result' });
    await this.touch(room.id);
  }

  /* ------------------------------------------------------------------ */
  /* Host-rechten                                                         */
  /* ------------------------------------------------------------------ */

  async kickPlayer(token: string, targetPlayerId: string): Promise<void> {
    const player = await this.requirePlayer(token);
    const room = await this.requireRoom(player.room_id);
    this.requireHost(room, player);
    if (targetPlayerId === player.id) {
      throw new GameEngineError('validation_error', 'Je kunt jezelf niet kicken — gebruik "room verlaten".');
    }
    const target = await this.store.getPlayerById(targetPlayerId);
    if (!target || target.room_id !== room.id) throw new GameEngineError('validation_error', 'Onbekende speler.');
    await this.store.updatePlayer(targetPlayerId, { kicked_at: new Date().toISOString(), is_connected: false });
    await this.maybeAbortForTooFewPlayers(room.id);
    await this.touch(room.id);
  }

  async transferHost(token: string, targetPlayerId: string): Promise<void> {
    const player = await this.requirePlayer(token);
    const room = await this.requireRoom(player.room_id);
    this.requireHost(room, player);
    const target = await this.store.getPlayerById(targetPlayerId);
    if (!target || target.room_id !== room.id || !isActive(target)) {
      throw new GameEngineError('validation_error', 'Onbekende of niet-actieve speler.');
    }
    await this.store.updatePlayer(player.id, { is_host: false });
    await this.store.updatePlayer(target.id, { is_host: true });
    await this.store.updateRoom(room.id, { host_player_id: target.id });
    await this.touch(room.id);
  }

  async updateSettings(token: string, patch: { language?: Language; category?: CategorySetting }): Promise<void> {
    const player = await this.requirePlayer(token);
    const room = await this.requireRoom(player.room_id);
    this.requireHost(room, player);
    if (room.phase !== 'lobby' && room.phase !== 'result') {
      throw new GameEngineError('wrong_phase', 'Instellingen kunnen alleen tussen rondes gewijzigd worden.');
    }
    await this.store.updateRoom(room.id, patch);
    await this.touch(room.id);
  }

  /** Als er tijdens een lopende ronde minder dan MIN_PLAYERS actieve spelers overblijven. */
  private async maybeAbortForTooFewPlayers(roomId: string): Promise<void> {
    const room = await this.requireRoom(roomId);
    if (room.phase === 'lobby' || room.phase === 'result') return;
    const active = (await this.store.listPlayers(roomId)).filter(isActive);
    if (active.length < MIN_PLAYERS) {
      await this.store.updateRoom(roomId, { phase: 'lobby', current_round_id: null });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Woordverklaring — mag NOOIT de vraag zien (zie explain-prompt.ts)   */
  /* ------------------------------------------------------------------ */

  async explainWord(token: string, rawWord: string): Promise<{ ok: boolean; text: string }> {
    const player = await this.requirePlayer(token);
    const room = await this.requireRoom(player.room_id);

    const validation = validateExplainInput(rawWord);
    if (!validation.ok) return { ok: false, text: validation.message[room.language] };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        ok: false,
        text: room.language === 'nl' ? 'Uitleg is nu niet beschikbaar.' : 'Explanation is not available right now.',
      };
    }

    try {
      const client = new GoogleGenAI({ apiKey });
      const prompt = buildExplainPrompt({ word: validation.word, language: room.language });
      const response = await client.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
        contents: prompt,
      });
      const text = response.text ?? '';
      return { ok: true, text: parseExplanation(text) };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[explainWord] AI-aanroep mislukt:', err);
      return { ok: false, text: EXPLAIN_UI_TEXT[room.language].error };
    }
  }

  /* ------------------------------------------------------------------ */
  /* Client state                                                         */
  /* ------------------------------------------------------------------ */

  async getClientState(token: string): Promise<ClientState> {
    const player = await this.requirePlayer(token);
    const room = await this.requireRoom(player.room_id);
    await this.touch(room.id);

    const allPlayers = await this.store.listPlayers(room.id);
    const active = allPlayers.filter(isActive);

    let round: Round | null = null;
    let assignments = new Map<string, string>();
    let answers: Answer[] = [];
    let myAssignment: string | null = null;

    if (room.current_round_id) {
      round = await this.store.getRound(room.current_round_id);
      if (round) {
        const list = await this.store.listAssignments(round.id);
        assignments = new Map(list.map((a) => [a.player_id, a.question_text]));
        answers = await this.store.listAnswers(round.id);
        myAssignment = assignments.get(player.id) ?? null;
      }
    }

    const answeredIds = new Set(answers.map((a) => a.player_id));
    const myAnswer = answers.find((a) => a.player_id === player.id)?.text ?? null;

    const revealed = round ? ['question_reveal', 'answers', 'voting', 'result'].includes(room.phase) : false;
    const answersVisible = round ? ['answers', 'voting', 'result'].includes(room.phase) : false;
    const resultVisible = room.phase === 'result';

    let votes: RevealedVote[] | null = null;
    let myVote: string | null = null;
    let resultInfo: ClientState['result'] = null;
    const hasVotedIds = new Set<string>();

    if (round && (room.phase === 'voting' || room.phase === 'result')) {
      const currentBallotVotes = await this.store.listVotes(round.id, round.tiebreak_number);
      for (const v of currentBallotVotes) hasVotedIds.add(v.player_id);
      const mine = currentBallotVotes.find((v) => v.player_id === player.id);
      myVote = mine?.target_player_id ?? null;

      if (resultVisible) {
        const tally = new Map<string, number>();
        for (const v of currentBallotVotes) tally.set(v.target_player_id, (tally.get(v.target_player_id) ?? 0) + 1);
        let maxVotes = -1;
        for (const c of tally.values()) maxVotes = Math.max(maxVotes, c);
        const leaders = [...tally.entries()].filter(([, c]) => c === maxVotes).map(([id]) => id);
        const wasTieAtEnd = leaders.length !== 1;
        const imposterCaught = !wasTieAtEnd && leaders[0] === round.imposter_player_id;

        votes = currentBallotVotes.map((v) => ({ player_id: v.player_id, target_player_id: v.target_player_id }));
        resultInfo = {
          imposter_caught: imposterCaught,
          vote_counts: Object.fromEntries(tally),
          was_tie: round.tiebreak_number > 0,
        };
      }
    }

    const publicPlayers: PublicPlayer[] = active.map((p) => ({
      id: p.id,
      name: p.name,
      emoji: p.emoji,
      is_host: p.is_host,
      is_connected: p.is_connected,
      has_answered: room.phase === 'answering' ? answeredIds.has(p.id) : undefined,
      has_voted: room.phase === 'voting' ? hasVotedIds.has(p.id) : undefined,
    }));

    const revealedAnswers: RevealedAnswer[] | null = answersVisible
      ? active
          .filter((p) => assignments.has(p.id))
          .map((p) => ({
            player_id: p.id,
            name: p.name,
            emoji: p.emoji,
            text: answers.find((a) => a.player_id === p.id)?.text ?? '',
          }))
      : null;

    const iAmImposter = round && myAssignment !== null ? (revealed ? player.id === round.imposter_player_id : null) : null;

    const state: ClientState = {
      room: {
        code: room.code,
        phase: room.phase,
        language: room.language,
        category: room.category,
        round_number: room.round_number,
        state_version: room.state_version,
      },
      me: {
        id: player.id,
        name: player.name,
        emoji: player.emoji,
        is_host: player.is_host,
        my_question: myAssignment,
        my_answer: myAnswer,
        my_vote: myVote,
        i_am_imposter: iAmImposter,
      },
      players: publicPlayers,
      round: round
        ? {
            id: round.id,
            category: getCategory(round.category).label[room.language],
            main_question: revealed ? round.main_question : null,
            imposter_question: resultVisible ? round.imposter_question : null,
            imposter_player_id: resultVisible ? round.imposter_player_id : null,
            tiebreak_number: round.tiebreak_number,
          }
        : null,
      answers: revealedAnswers,
      votes,
      result: resultInfo,
    };

    return state;
  }

  /* ------------------------------------------------------------------ */
  /* Onderhoud                                                            */
  /* ------------------------------------------------------------------ */

  async cleanupStaleRooms(): Promise<string[]> {
    return this.store.deleteStaleRooms(STALE_ROOM_MS);
  }

  /* ------------------------------------------------------------------ */
  /* Helpers                                                              */
  /* ------------------------------------------------------------------ */

  private async touch(roomId: string): Promise<void> {
    const room = await this.store.getRoomById(roomId);
    if (!room) return;
    await this.store.updateRoom(roomId, {
      state_version: room.state_version + 1,
      last_active_at: new Date().toISOString(),
    });
  }

  private async requirePlayer(token: string): Promise<Player> {
    const player = await this.store.getPlayerByToken(token);
    if (!player || !isActive(player)) throw new GameEngineError('invalid_token', 'Onbekende of verlopen speler.');
    return player;
  }

  private async requireRoom(roomId: string): Promise<Room> {
    const room = await this.store.getRoomById(roomId);
    if (!room) throw new GameEngineError('room_not_found', 'Deze room bestaat niet meer.');
    return room;
  }

  private requireHost(room: Room, player: Player): void {
    if (room.host_player_id !== player.id) {
      throw new GameEngineError('not_host', 'Alleen de host mag dit doen.');
    }
  }

  private async requireCurrentRound(room: Room): Promise<Round> {
    if (!room.current_round_id) throw new GameEngineError('wrong_phase', 'Er loopt geen ronde.');
    const round = await this.store.getRound(room.current_round_id);
    if (!round) throw new GameEngineError('wrong_phase', 'Ronde niet gevonden.');
    return round;
  }
}
