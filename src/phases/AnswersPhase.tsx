import { useState } from 'react';
import type { ClientState } from '@lib/types';
import { api, ApiError } from '@/lib/api';
import { Icon } from '@/components/Icon';

export function AnswersPhase({
  state,
  token,
  onChanged,
}: {
  state: ClientState;
  token: string;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const language = state.room.language;

  async function startVoting() {
    setBusy(true);
    setError(null);
    try {
      await api.startVoting(token);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Er ging iets mis.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="card center-text">
        <p className="muted">{language === 'nl' ? 'De vraag' : 'The question'}</p>
        <h2>{state.round?.main_question}</h2>
      </div>

      <div className="card">
        <h3>{language === 'nl' ? 'Alle antwoorden' : 'All answers'}</h3>
        <div className="row row-full">
          {state.answers?.map((a) => (
            <div key={a.player_id} className="player-chip fade-in" style={{ flex: '1 1 100%' }}>
              <span className="emoji">{a.emoji}</span>
              <span className="name">{a.name}</span>
              <span style={{ fontWeight: 600 }}>“{a.text}”</span>
            </div>
          ))}
        </div>
      </div>

      <p className="muted center-text">
        {language === 'nl' ? 'Bespreek het nu in het echt. Geen tijdsdruk.' : 'Discuss it for real now. No time pressure.'}
      </p>

      {error && <div className="error-banner">{error}</div>}

      {state.me.is_host && (
        <button type="button" className="btn-primary" disabled={busy} onClick={startVoting}>
          <Icon name="ballot" /> {language === 'nl' ? 'Start stemmen' : 'Start voting'}
        </button>
      )}
    </>
  );
}
