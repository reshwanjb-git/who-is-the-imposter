import { useEffect, useRef, useState } from 'react';
import { JoinScreen } from '@/JoinScreen';
import { Layout } from '@/Layout';
import { Toast } from '@/components/Toast';
import { Lobby } from '@/phases/Lobby';
import { Answering } from '@/phases/Answering';
import { QuestionReveal } from '@/phases/QuestionReveal';
import { AnswersPhase } from '@/phases/AnswersPhase';
import { Voting } from '@/phases/Voting';
import { Result } from '@/phases/Result';
import { useGameState } from '@/hooks/useGameState';
import { api, type JoinResult } from '@/lib/api';
import { clearSession, loadSession, saveSession } from '@/lib/storage';
import { parseJoinCodeFromUrl } from '@/lib/url';

const ACTIVE_PHASES = new Set(['answering', 'question_reveal', 'answers', 'voting']);

export default function App() {
  const [session, setSession] = useState(() => loadSession());
  const [booting, setBooting] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const { state, error, refresh } = useGameState(session?.token ?? null);
  const prevTiebreak = useRef(0);
  const prevPhase = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (session) {
        try {
          await api.reconnect(session.token);
        } catch {
          if (!cancelled) {
            clearSession();
            setSession(null);
          }
        }
      }
      if (!cancelled) setBooting(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (error && session) {
      // Roomcode bestaat niet meer / token ongeldig -> terug naar startscherm.
      clearSession();
      setSession(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  useEffect(() => {
    if (!state) return;
    const language = state.room.language;

    if (state.round && state.room.phase === 'voting' && state.round.tiebreak_number > prevTiebreak.current) {
      setToast(
        language === 'nl'
          ? 'Gelijkspel! Iedereen stemt opnieuw.'
          : 'Tie! Everyone votes again.',
      );
    }
    prevTiebreak.current = state.round?.tiebreak_number ?? 0;

    if (prevPhase.current && ACTIVE_PHASES.has(prevPhase.current) && state.room.phase === 'lobby') {
      setToast(
        language === 'nl'
          ? 'Ronde afgebroken: te weinig spelers over.'
          : 'Round aborted: too few players left.',
      );
    }
    prevPhase.current = state.room.phase;
  }, [state?.room.phase, state?.round?.tiebreak_number]);

  function handleJoined(result: JoinResult) {
    saveSession({ code: result.code, token: result.token });
    setSession({ code: result.code, token: result.token });
    window.history.replaceState(null, '', '/');
  }

  async function handleLeave() {
    if (session) await api.leave(session.token).catch(() => {});
    clearSession();
    setSession(null);
  }

  if (booting) {
    return (
      <div className="screen center-text">
        <div className="spacer" />
        <p className="muted">Laden…</p>
        <div className="spacer" />
      </div>
    );
  }

  if (!session || !state) {
    return <JoinScreen onJoined={handleJoined} initialCode={parseJoinCodeFromUrl()} />;
  }

  const phase = state.room.phase;

  return (
    <>
      <Layout state={state} token={session.token} onLeave={handleLeave} onChanged={refresh}>
        {phase === 'lobby' && <Lobby state={state} token={session.token} onChanged={refresh} />}
        {phase === 'answering' && <Answering state={state} token={session.token} onChanged={refresh} />}
        {phase === 'question_reveal' && <QuestionReveal state={state} token={session.token} onChanged={refresh} />}
        {phase === 'answers' && <AnswersPhase state={state} token={session.token} onChanged={refresh} />}
        {phase === 'voting' && <Voting state={state} token={session.token} onChanged={refresh} />}
        {phase === 'result' && <Result state={state} token={session.token} onChanged={refresh} />}
      </Layout>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}
