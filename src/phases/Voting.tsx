import { useState } from 'react';
import type { ClientState } from '@lib/types';
import { api, ApiError } from '@/lib/api';
import { sound } from '@/lib/sound';
import { Icon } from '@/components/Icon';

export function Voting({ state, token, onChanged }: { state: ClientState; token: string; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const language = state.room.language;
  const voted = state.me.my_vote !== null;

  async function vote(targetId: string) {
    setBusy(true);
    setError(null);
    try {
      await api.submitVote(token, targetId);
      sound.vote();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Er ging iets mis.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {state.round && state.round.tiebreak_number > 0 && (
        <div className="badge" style={{ alignSelf: 'center' }}>
          <Icon name="scale" /> {language === 'nl' ? 'Gelijkspel — extra stemronde' : 'Tie — extra voting round'}
        </div>
      )}

      <div className="card center-text">
        <p className="muted">{language === 'nl' ? 'Wie is de imposter?' : 'Who is the imposter?'}</p>
        <h2>{language === 'nl' ? 'Stem op een speler' : 'Vote for a player'}</h2>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="row row-full">
        {state.players.map((p) => {
          const isMine = state.me.my_vote === p.id;
          return (
            <button
              key={p.id}
              type="button"
              className={isMine ? 'btn-primary' : 'btn-ghost'}
              disabled={busy}
              onClick={() => vote(p.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-start' }}
            >
              <span style={{ fontSize: 22 }}>{p.emoji}</span>
              <span style={{ flex: 1, textAlign: 'left' }}>
                {p.name}
                {p.id === state.me.id ? ` (${language === 'nl' ? 'jij' : 'you'})` : ''}
              </span>
              {isMine && <Icon name="check" />}
            </button>
          );
        })}
      </div>

      <p className="muted center-text">
        {voted
          ? language === 'nl'
            ? 'Je stem is uitgebracht. Je kunt hem nog wijzigen.'
            : 'Your vote is in. You can still change it.'
          : language === 'nl'
            ? 'Op jezelf stemmen mag.'
            : 'Voting for yourself is allowed.'}
      </p>

      <div className="card">
        <h3>{language === 'nl' ? 'Wie heeft al gestemd?' : 'Who has voted?'}</h3>
        <div className="row">
          {state.players.map((p) => (
            <div key={p.id} className="player-chip">
              <span className="emoji">{p.emoji}</span>
              <span className="name">{p.name}</span>
              <span className={`status-dot${p.has_voted ? ' done' : ''}`} />
            </div>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 8 }}>
          {language === 'nl' ? 'Op wie ze stemmen blijft geheim tot iedereen klaar is.' : "Who they voted for stays hidden until everyone is done."}
        </p>
      </div>
    </>
  );
}
