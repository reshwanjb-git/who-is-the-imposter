import { useState } from 'react';
import { EmojiPicker } from '@/components/EmojiPicker';
import { api, ApiError, type JoinResult } from '@/lib/api';
import { randomEmoji } from '@/lib/emojis';
import type { Language } from '@lib/categories';
import { Icon } from '@/components/Icon';

type Mode = 'choose' | 'create' | 'join';

export function JoinScreen({
  onJoined,
  initialCode,
}: {
  onJoined: (result: JoinResult) => void;
  initialCode: string | null;
}) {
  const [mode, setMode] = useState<Mode>(initialCode ? 'join' : 'choose');
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(randomEmoji());
  const [code, setCode] = useState(initialCode ?? '');
  const [language, setLanguage] = useState<Language>('nl');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setBusy(true);
    setError(null);
    try {
      const result = await api.createRoom({ name, emoji, language, category: 'random' });
      onJoined(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Er ging iets mis.');
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    setBusy(true);
    setError(null);
    try {
      const result = await api.joinRoom({ code: code.trim(), name, emoji });
      onJoined(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Er ging iets mis.');
    } finally {
      setBusy(false);
    }
  }

  if (mode === 'choose') {
    return (
      <div className="screen center-text">
        <div className="spacer" />
        <h1><Icon name="detective" className="ico-lg" /> Who is the Imposter</h1>
        <p>Een partyspel voor 3–10 spelers. Iedereen krijgt dezelfde vraag — behalve één.</p>
        <div className="row row-full">
          <button type="button" className="btn-primary" onClick={() => setMode('create')}>
            Nieuwe room starten
          </button>
          <button type="button" className="btn-ghost" onClick={() => setMode('join')}>
            Room joinen met code
          </button>
        </div>
        <div className="spacer" />
      </div>
    );
  }

  return (
    <div className="screen">
      <button type="button" className="btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setMode('choose')}>
        ← Terug
      </button>

      <h1>{mode === 'create' ? 'Nieuwe room' : 'Room joinen'}</h1>

      {mode === 'join' && (
        <div className="card">
          <label className="muted">Roomcode</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="1234"
            inputMode="numeric"
            maxLength={4}
            style={{ fontSize: 28, textAlign: 'center', letterSpacing: '0.2em' }}
          />
        </div>
      )}

      <div className="card">
        <label className="muted">Jouw naam</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Bijv. Resh"
          maxLength={24}
        />
        <div style={{ height: 12 }} />
        <label className="muted">Kies een avatar</label>
        <EmojiPicker value={emoji} onChange={setEmoji} />
      </div>

      {mode === 'create' && (
        <div className="card">
          <label className="muted">Taal</label>
          <div className="row">
            <button
              type="button"
              className={language === 'nl' ? 'btn-primary' : 'btn-ghost'}
              onClick={() => setLanguage('nl')}
            >
              Nederlands
            </button>
            <button
              type="button"
              className={language === 'en' ? 'btn-primary' : 'btn-ghost'}
              onClick={() => setLanguage('en')}
            >
              English
            </button>
          </div>
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}

      <button
        type="button"
        className="btn-primary"
        disabled={busy || !name.trim() || (mode === 'join' && code.length !== 4)}
        onClick={mode === 'create' ? handleCreate : handleJoin}
      >
        {busy ? 'Even geduld…' : mode === 'create' ? 'Room aanmaken' : 'Joinen'}
      </button>
    </div>
  );
}
