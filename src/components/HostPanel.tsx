import { useState } from 'react';
import type { ClientState } from '@lib/types';
import { CATEGORIES } from '@lib/categories';
import { api, ApiError } from '@/lib/api';

export function HostPanel({ state, token, onChanged }: { state: ClientState; token: string; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const others = state.players.filter((p) => p.id !== state.me.id);
  const canEditSettings = state.room.phase === 'lobby' || state.room.phase === 'result';

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Er ging iets mis.');
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn-ghost" onClick={() => setOpen(true)}>
        ⚙️ Host-opties
      </button>
    );
  }

  return (
    <div className="card fade-in">
      <div className="top-bar">
        <h3 style={{ margin: 0 }}>Host-opties</h3>
        <button type="button" className="icon-btn" onClick={() => setOpen(false)}>
          ✕
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {(state.room.phase === 'answering' || state.room.phase === 'voting') && (
        <button
          type="button"
          className="btn-ghost"
          style={{ width: '100%', marginTop: 10 }}
          onClick={() => run(() => api.forceAdvance(token))}
        >
          ⏭️ Iedereen laten doorgaan (AFK forceren)
        </button>
      )}

      {canEditSettings && (
        <>
          <div style={{ height: 12 }} />
          <label className="muted">Taal (volgende ronde)</label>
          <div className="row">
            <button
              type="button"
              className={state.room.language === 'nl' ? 'btn-primary' : 'btn-ghost'}
              onClick={() => run(() => api.updateSettings(token, { language: 'nl' }))}
            >
              Nederlands
            </button>
            <button
              type="button"
              className={state.room.language === 'en' ? 'btn-primary' : 'btn-ghost'}
              onClick={() => run(() => api.updateSettings(token, { language: 'en' }))}
            >
              English
            </button>
          </div>

          <div style={{ height: 12 }} />
          <label className="muted">Categorie (volgende ronde)</label>
          <div className="row">
            <button
              type="button"
              className={state.room.category === 'random' ? 'btn-primary' : 'btn-ghost'}
              onClick={() => run(() => api.updateSettings(token, { category: 'random' }))}
            >
              🎲 Willekeurig
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className={state.room.category === c.id ? 'btn-primary' : 'btn-ghost'}
                onClick={() => run(() => api.updateSettings(token, { category: c.id }))}
              >
                {c.label[state.room.language]}
              </button>
            ))}
          </div>
        </>
      )}

      {others.length > 0 && (
        <>
          <div style={{ height: 12 }} />
          <label className="muted">Spelerbeheer</label>
          {others.map((p) => (
            <div key={p.id} className="row" style={{ marginTop: 6 }}>
              <div className="player-chip" style={{ flex: '1 1 100%' }}>
                <span className="emoji">{p.emoji}</span>
                <span className="name">{p.name}</span>
              </div>
              <button type="button" className="btn-ghost" onClick={() => run(() => api.transferHost(token, p.id))}>
                👑 Maak host
              </button>
              <button type="button" className="btn-danger" onClick={() => run(() => api.kick(token, p.id))}>
                Kick
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
