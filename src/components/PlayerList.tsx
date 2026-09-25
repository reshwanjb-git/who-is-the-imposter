import type { PublicPlayer } from '@lib/types';

export function PlayerList({
  players,
  showAnswered,
  showVoted,
  meId,
}: {
  players: PublicPlayer[];
  showAnswered?: boolean;
  showVoted?: boolean;
  meId?: string;
}) {
  return (
    <div className="row">
      {players.map((p) => {
        const done = showAnswered ? p.has_answered : showVoted ? p.has_voted : undefined;
        return (
          <div key={p.id} className={`player-chip${p.is_connected ? '' : ' disconnected'}`}>
            <span className="emoji">{p.emoji}</span>
            <span className="name">
              {p.name}
              {p.id === meId ? ' (jij)' : ''}
            </span>
            {p.is_host && <span title="Host">👑</span>}
            {done !== undefined && <span className={`status-dot${done ? ' done' : ''}`} />}
          </div>
        );
      })}
    </div>
  );
}
