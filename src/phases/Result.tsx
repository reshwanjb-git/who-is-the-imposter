import { useState } from 'react';
import type { ClientState } from '@lib/types';
import { api, ApiError } from '@/lib/api';
import { Icon } from '@/components/Icon';

export function Result({ state, token, onChanged }: { state: ClientState; token: string; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const language = state.room.language;
  const round = state.round;
  const result = state.result;

  const imposter = state.players.find((p) => p.id === round?.imposter_player_id);
  const byId = new Map(state.players.map((p) => [p.id, p]));

  async function newRound() {
    setBusy(true);
    setError(null);
    try {
      await api.startRound(token);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Er ging iets mis.');
    } finally {
      setBusy(false);
    }
  }

  if (!round || !result) return null;

  return (
    <>
      <div className={`card center-text fade-in`} style={{ borderColor: result.imposter_caught ? 'var(--accent)' : 'var(--danger)' }}>
        <h1><Icon name={result.imposter_caught ? 'trophy' : 'mask'} className="ico-lg" /></h1>
        <h2>
          {result.imposter_caught
            ? language === 'nl'
              ? 'De groep had de imposter door!'
              : 'The group caught the imposter!'
            : result.was_tie
              ? language === 'nl'
                ? 'Gelijkspel — de imposter wint!'
                : 'Tie — the imposter wins!'
              : language === 'nl'
                ? 'De imposter is ontsnapt.'
                : 'The imposter got away.'}
        </h2>
        {imposter && (
          <p style={{ fontSize: 18 }}>
            {language === 'nl' ? 'De imposter was' : 'The imposter was'}: <strong>{imposter.emoji} {imposter.name}</strong>
          </p>
        )}
      </div>

      <div className="card">
        <p className="muted" style={{ marginBottom: 2 }}>{language === 'nl' ? 'De echte vraag' : 'The real question'}</p>
        <p style={{ color: 'var(--cream)', fontWeight: 600, marginBottom: 12 }}>{round.main_question}</p>
        <p className="muted" style={{ marginBottom: 2 }}>{language === 'nl' ? 'De imposter-vraag' : 'The imposter question'}</p>
        <p style={{ color: 'var(--danger)', fontWeight: 600 }}>{round.imposter_question}</p>
      </div>

      <div className="card">
        <h3>{language === 'nl' ? 'Wie stemde op wie' : 'Who voted for whom'}</h3>
        <div className="row row-full">
          {state.votes?.map((v) => {
            const voter = byId.get(v.player_id);
            const target = byId.get(v.target_player_id);
            if (!voter || !target) return null;
            return (
              <div key={v.player_id} className="player-chip" style={{ flex: '1 1 100%' }}>
                <span className="emoji">{voter.emoji}</span>
                <span className="name">{voter.name}</span>
                <span className="muted">→</span>
                <span className="emoji">{target.emoji}</span>
                <span className="name">{target.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {state.me.is_host ? (
        <button type="button" className="btn-primary" disabled={busy} onClick={newRound}>
          {busy ? '…' : (<><Icon name="refresh" /> {language === 'nl' ? 'Nieuwe ronde' : 'New round'}</>)}
        </button>
      ) : (
        <p className="muted center-text">
          {language === 'nl' ? 'Wachten tot de host een nieuwe ronde start…' : 'Waiting for the host to start a new round…'}
        </p>
      )}
    </>
  );
}
