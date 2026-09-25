import { useState } from 'react';
import { sound } from '@/lib/sound';

export function MuteButton() {
  const [muted, setMuted] = useState(sound.isMuted());
  return (
    <button
      type="button"
      className="icon-btn"
      onClick={() => setMuted(sound.toggleMuted())}
      aria-label={muted ? 'Geluid aanzetten' : 'Geluid uitzetten'}
      title={muted ? 'Geluid aan' : 'Geluid uit'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
