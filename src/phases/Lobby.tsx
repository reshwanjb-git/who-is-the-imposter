import { useState } from 'react';
import type { ClientState } from '@lib/types';
import { PlayerList } from '@/components/PlayerList';
import { QRCodeImage } from '@/components/QRCode';
import { api, ApiError } from '@/lib/api';
import { joinUrlFor } from '@/lib/url';
import { Icon } from '@/components/Icon';

export function Lobby({ state, token, onChanged }: { state: ClientState; token: string; onChanged: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = joinUrlFor(state.room.code);
  const enoughPlayers = state.players.length >= 3;

  async function start() {
    setStarting(true);
    setError(null);
    try {
      await api.startRound(token);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Er ging iets mis.');
    } finally {
      setStarting(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // negeren — link staat toch al zichtbaar
    }
  }

  return (
    <>
      <div className="card center-text">
        <p className="muted" style={{ marginBottom: 4 }}>Roomcode</p>
        <div className="code-display">{state.room.code}</div>
        <div style={{ margin: '16px 0' }}>
          <QRCodeImage url={url} />
        </div>
        <button type="button" className="btn-ghost" onClick={copyLink}>
          {copied ? (<><Icon name="check" /> Link gekopieerd</>) : (<><Icon name="link" /> Kopieer joinlink</>)}
        </button>
      </div>

      <div className="card">
        <h3>Spelers ({state.players.length}/10)</h3>
        <PlayerList players={state.players} meId={state.me.id} />
        {!enoughPlayers && <p className="muted" style={{ marginTop: 10 }}>Minimaal 3 spelers nodig om te starten.</p>}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {state.me.is_host ? (
        <button type="button" className="btn-primary" disabled={!enoughPlayers || starting} onClick={start}>
          {starting ? 'Ronde wordt gestart…' : (<><Icon name="play" /> Start ronde</>)}
        </button>
      ) : (
        <p className="muted center-text">Wachten tot de host de ronde start…</p>
      )}
    </>
  );
}
