import { useState } from 'react';
import { api } from '@/lib/api';
import type { Language } from '@lib/categories';

const TEXT: Record<Language, { button: string; placeholder: string; loading: string; ask: string }> = {
  nl: { button: 'Woord niet duidelijk?', placeholder: 'Typ het woord', loading: 'Even kijken…', ask: 'Vraag uitleg' },
  en: { button: 'Word unclear?', placeholder: 'Type the word', loading: 'One moment…', ask: 'Ask' },
};

/**
 * Deze knop stuurt UITSLUITEND het losse woord naar de server — nooit de
 * vraag zelf (zie lib/explain-prompt.ts). Ook toont de UI dit nergens aan
 * andere spelers: gebruik van de knop is en blijft onzichtbaar voor de rest.
 */
export function ExplainButton({ token, language }: { token: string; language: Language }) {
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const t = TEXT[language];

  async function ask() {
    if (!word.trim()) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await api.explain(token, word.trim());
      setResult(res.text);
    } catch {
      setResult(language === 'nl' ? 'Uitleg lukte niet. Probeer het nog eens.' : 'Could not explain that. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn-ghost" onClick={() => setOpen(true)}>
        {t.button}
      </button>
    );
  }

  return (
    <div className="card fade-in" style={{ padding: 12 }}>
      <div className="row row-full" style={{ marginBottom: result ? 8 : 0 }}>
        <input
          value={word}
          maxLength={40}
          placeholder={t.placeholder}
          onChange={(e) => setWord(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
        />
      </div>
      <div className="row">
        <button type="button" className="btn-primary" onClick={ask} disabled={busy}>
          {busy ? t.loading : t.ask}
        </button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
          ✕
        </button>
      </div>
      {result && <p style={{ marginTop: 10 }}>{result}</p>}
    </div>
  );
}
