/**
 * tests/game-engine.test.ts
 *
 * Test de volledige spelflow met minimaal 4 gesimuleerde spelers, tegen de
 * in-memory store (lib/memory-store.ts) — dus zonder dat er een Supabase-
 * project moet bestaan. Draai met: npm test
 *
 * Dekt precies de stappen uit "Werkwijze" punt 3 van de bouwprompt:
 * volledig verloop, gelijkspel + tiebreak, herverbinden, AFK-forceerknop.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupRoom, findImposter } from './helpers';

test('volledige ronde: lobby -> answering -> reveal -> answers -> voting -> result', async () => {
  const { engine, store, code, players } = await setupRoom(['Aap', 'Beer', 'Cavia', 'Das']);

  let room = await store.getRoomByCode(code);
  assert.equal(room?.phase, 'lobby');

  await engine.startRound(players[0].token);
  room = await store.getRoomByCode(code);
  assert.equal(room?.phase, 'answering');
  assert.ok(room?.current_round_id);

  const round1 = await store.getRound(room!.current_round_id!);
  assert.ok(round1);
  assert.notEqual(round1!.main_question, round1!.imposter_question);

  // Elke speler ziet zijn EIGEN vraag, en de imposter ziet niet dat hij imposter is.
  for (const p of players) {
    const state = await engine.getClientState(p.token);
    assert.equal(state.room.phase, 'answering');
    assert.ok(state.me.my_question, `${p.name} moet een vraag hebben`);
    assert.equal(state.me.i_am_imposter, null, 'imposter-status mag nog niet zichtbaar zijn');
    assert.equal(state.round?.main_question, null, 'hoofdvraag mag nog niet onthuld zijn');
  }

  for (const p of players) {
    await engine.submitAnswer(p.token, `antwoord van ${p.name}`);
  }

  room = await store.getRoomByCode(code);
  assert.equal(room?.phase, 'question_reveal', 'moet automatisch doorgaan zodra iedereen heeft geantwoord');

  const imposter = await findImposter(store, code, players);
  const imposterState = await engine.getClientState(imposter.token);
  assert.equal(imposterState.me.i_am_imposter, true);
  assert.ok(imposterState.round?.main_question, 'hoofdvraag moet nu onthuld zijn');

  const nonImposter = players.find((p) => p.id !== imposter.id)!;
  const otherState = await engine.getClientState(nonImposter.token);
  assert.equal(otherState.me.i_am_imposter, false);

  await engine.readyForAnswers(players[1].token);
  room = await store.getRoomByCode(code);
  assert.equal(room?.phase, 'answers');

  const answersState = await engine.getClientState(players[0].token);
  assert.equal(answersState.answers?.length, 4);
  assert.ok(answersState.answers?.every((a) => a.text.startsWith('antwoord van')));

  await engine.startVoting(players[0].token);
  room = await store.getRoomByCode(code);
  assert.equal(room?.phase, 'voting');

  // Iedereen stemt op de imposter -> duidelijke winnaar, geen gelijkspel.
  for (const p of players) {
    await engine.submitVote(p.token, imposter.id);
  }

  room = await store.getRoomByCode(code);
  assert.equal(room?.phase, 'result');

  const resultState = await engine.getClientState(players[0].token);
  assert.equal(resultState.result?.imposter_caught, true);
  assert.equal(resultState.result?.was_tie, false);
  assert.equal(resultState.round?.imposter_player_id, imposter.id);
  assert.equal(resultState.votes?.length, 4);
});

test('gelijkspel -> tiebreak -> bij opnieuw gelijk wint de imposter automatisch', async () => {
  const { engine, store, code, players } = await setupRoom(['Een', 'Twee', 'Drie', 'Vier']);
  await engine.startRound(players[0].token);
  for (const p of players) await engine.submitAnswer(p.token, `x-${p.name}`);
  await engine.readyForAnswers(players[0].token);
  await engine.startVoting(players[0].token);

  const [a, b, c, d] = players;
  // 2 stemmen op a, 2 stemmen op b -> gelijkspel.
  await engine.submitVote(a.token, a.id);
  await engine.submitVote(b.token, a.id);
  await engine.submitVote(c.token, b.id);
  await engine.submitVote(d.token, b.id);

  let room = await store.getRoomByCode(code);
  assert.equal(room?.phase, 'voting', 'blijft in voting tijdens de tiebreak');
  const roundAfterFirstTie = await store.getRound(room!.current_round_id!);
  assert.equal(roundAfterFirstTie?.tiebreak_number, 1, 'tiebreak_number moet omhoog zijn gegaan');

  // Tiebreak-ronde: weer exact gelijk verdeeld -> imposter wint automatisch.
  await engine.submitVote(a.token, a.id);
  await engine.submitVote(b.token, a.id);
  await engine.submitVote(c.token, b.id);
  await engine.submitVote(d.token, b.id);

  room = await store.getRoomByCode(code);
  assert.equal(room?.phase, 'result');
  const resultState = await engine.getClientState(a.token);
  assert.equal(resultState.result?.was_tie, true);
  assert.equal(
    resultState.result?.imposter_caught,
    false,
    'bij een tiebreak die weer gelijk staat wint de imposter automatisch',
  );
});

test('herverbinden: speler behoudt zijn antwoord en status na "Safari sluiten"', async () => {
  const { engine, store, code, players } = await setupRoom(['Noor', 'Sam', 'Ivy', 'Kai']);
  await engine.startRound(players[0].token);
  await engine.submitAnswer(players[0].token, 'mijn antwoord');

  // Simuleer het sluiten van Safari.
  await store.updatePlayer(players[0].id, { is_connected: false });

  // Terugkomen met dezelfde token (opgeslagen in localStorage).
  const { room, player } = await engine.reconnect(players[0].token);
  assert.equal(room.code, code);
  assert.equal(player.is_connected, true);

  const state = await engine.getClientState(players[0].token);
  assert.equal(state.me.my_answer, 'mijn antwoord', 'eerder ingevulde antwoord moet bewaard blijven');
});

test('host kan forceren bij AFK: ontbrekende antwoorden worden "(geen antwoord)"', async () => {
  const { engine, store, code, players } = await setupRoom(['Host', 'Wacht', 'Ook', 'Wacht2']);
  await engine.startRound(players[0].token);
  await engine.submitAnswer(players[0].token, 'ik antwoord snel');
  // players[1..3] antwoorden niet (AFK).

  await engine.forceAdvance(players[0].token);

  const room = await store.getRoomByCode(code);
  assert.equal(room?.phase, 'question_reveal');

  const state = await engine.getClientState(players[1].token);
  assert.equal(state.me.my_answer, '(geen antwoord)');
});

test('host kan forceren tijdens stemmen: ontbrekende stemmen tellen niet mee', async () => {
  const { engine, store, players } = await setupRoom(['H', 'B', 'C', 'D']);
  await engine.startRound(players[0].token);
  for (const p of players) await engine.submitAnswer(p.token, 'x');
  await engine.readyForAnswers(players[0].token);
  await engine.startVoting(players[0].token);

  // Alleen host en B stemmen; C en D zijn AFK.
  await engine.submitVote(players[0].token, players[1].id);
  await engine.submitVote(players[1].token, players[1].id);

  await engine.forceAdvance(players[0].token);

  const state = await engine.getClientState(players[0].token);
  assert.equal(state.room.phase, 'result');
  assert.equal(state.result?.vote_counts[players[1].id], 2);
});

test('minder dan 3 actieve spelers midden in een ronde breekt de ronde af', async () => {
  const { engine, store, code, players } = await setupRoom(['P1', 'P2', 'P3', 'P4']);
  await engine.startRound(players[0].token);

  await engine.kickPlayer(players[0].token, players[1].id);
  await engine.kickPlayer(players[0].token, players[2].id);

  const room = await store.getRoomByCode(code);
  assert.equal(room?.phase, 'lobby', 'ronde moet afgebroken zijn terug naar lobby');
  assert.equal(room?.current_round_id, null);
});

test('dubbele naam krijgt automatisch een nummer erachter', async () => {
  const { engine, code } = await setupRoom(['Robin']);
  const second = await engine.joinRoom({ code, name: 'Robin', emoji: '🐶' });
  assert.equal(second.player.name, 'Robin 2');
  const third = await engine.joinRoom({ code, name: 'Robin', emoji: '🐱' });
  assert.equal(third.player.name, 'Robin 3');
});

test('app werkt zonder ANTHROPIC_API_KEY: fallback-vragen worden gebruikt', async () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    const { engine, store, players } = await setupRoom(['Fox', 'Owl', 'Bee', 'Ant']);
    await engine.startRound(players[0].token);
    const state = await engine.getClientState(players[0].token);
    assert.ok(state.me.my_question, 'moet een vraag krijgen, ook zonder API-key (fallback)');
  } finally {
    if (originalKey) process.env.ANTHROPIC_API_KEY = originalKey;
  }
});
