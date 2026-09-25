import { useState } from 'react';
import type { ClientState } from '@lib/types';
import type { Language } from '@lib/categories';
import { PlayerList } from '@/components/PlayerList';
import { ExplainButton } from '@/components/ExplainButton';
import { api, ApiError } from '@/lib/api';
import { sound } from '@/lib/sound';

export function Answering({ state, token, onChanged }: { state: ClientState; token: string; onChanged: () => void }) {
  const [text, setText] = useState(state.me.my_answer ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const language: Language = state.room.language;

  const alreadyAnswered = state.me.my_answer !== null;

  if (!state.me.my_question) {
    return (
      <div className="card center-text">
        <h2>⏳ Wachtscherm</h2>
        <p>
          {language === 'nl'
            ? 'Er loopt al een ronde. Je doet mee vanaf de volgende ronde.'
            : 'A round is already in progress. You will join from the next round.'}
        </p>
        <PlayerList players={state.players} meId={state.me.id} />
      </div>
    );
  }

  async function submit() {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.submitAnswer(token, text.trim());
      sound.submit();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Er ging iets mis.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="card">
        <p className="muted" style={{ marginBottom: 4 }}>{state.round?.category}</p>
        <h2>{state.me.my_question}</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 120))}
          placeholder={language === 'nl' ? 'Typ je antwoord…' : 'Type your answer…'}
          rows={3}
          disabled={alreadyAnswered}
        />
        <div className="row-full" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span className="muted">{text.length}/120</span>
        </div>
        <div style={{ marginTop: 10 }}>
          <ExplainButton token={token} language={language} />
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <button type="button" className="btn-primary" disabled={busy || alreadyAnswered || !text.trim()} onClick={submit}>
        {alreadyAnswered
          ? language === 'nl'
            ? '✓ Antwoord verzonden — wachten op de rest'
            : '✓ Answer submitted — waiting for others'
          : busy
            ? '…'
            : language === 'nl'
              ? 'Verstuur antwoord'
              : 'Submit answer'}
      </button>

      <div className="card">
        <h3>{language === 'nl' ? 'Wie heeft al geantwoord?' : 'Who has answered?'}</h3>
        <PlayerList players={state.players} showAnswered meId={state.me.id} />
      </div>
    </>
  );
}
