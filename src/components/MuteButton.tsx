import { useState } from 'react';
import { sound } from '@/lib/sound';
import { Icon } from '@/components/Icon';

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
      <Icon name={muted ? 'volume-off' : 'volume-on'} />
    </button>
  );
}
