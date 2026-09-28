import { useEffect, useRef, useState } from 'react';
import type { ClientState } from '@lib/types';
import { api, ApiError } from '@/lib/api';
import { sound } from '@/lib/sound';
import { Icon } from '@/components/Icon';

export function QuestionReveal({
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
  const played = useRef(false);
  const language = state.room.language;
  const isImposter = state.me.i_am_imposter === true;

  useEffect(() => {
    if (!played.current) {
      sound.reveal();
      played.current = true;
    }
  }, []);

  async function next() {
    setBusy(true);
    setError(null);
    try {
      await api.readyNext(token);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Er ging iets mis.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className={`card center-text fade-in ${isImposter ? 'reveal-pulse' : ''}`}>
        <p className="muted">{language === 'nl' ? 'De echte vraag was' : 'The real question was'}</p>
        <h1>{state.round?.main_question}</h1>
      </div>

      {isImposter && (
        <div className="card center-text imposter-flash" style={{ borderColor: 'var(--danger)' }}>
          <h2><Icon name="mask" className="ico-lg" /> {language === 'nl' ? 'Jij had een andere vraag.' : 'You had a different question.'}</h2>
          <p style={{ color: 'var(--cream)' }}>
            {language === 'nl' ? 'Jij bent de imposter.' : 'You are the imposter.'}
          </p>
          <p className="muted">
            {language === 'nl'
              ? 'Blijf rustig — niemand anders weet dit nog.'
              : 'Stay calm — no one else knows this yet.'}
          </p>
        </div>
      )}

      {!isImposter && (
        <p className="muted center-text">
          {language === 'nl' ? 'Jij had gewoon deze vraag.' : 'You had this exact question.'}
        </p>
      )}

      {error && <div className="error-banner">{error}</div>}

      <button type="button" className="btn-primary" disabled={busy} onClick={next}>
        {language === 'nl' ? 'Verder →' : 'Continue →'}
      </button>
    </>
  );
}
