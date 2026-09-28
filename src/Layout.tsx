import type { ReactNode } from 'react';
import type { ClientState } from '@lib/types';
import { MuteButton } from '@/components/MuteButton';
import { HostPanel } from '@/components/HostPanel';
import { Icon } from '@/components/Icon';

export function Layout({
  state,
  token,
  onLeave,
  onChanged,
  children,
}: {
  state: ClientState;
  token: string;
  onLeave: () => void;
  onChanged: () => void;
  children: ReactNode;
}) {
  return (
    <div className="screen">
      <div className="top-bar">
        <span className="badge"><Icon name="key" /> {state.room.code}</span>
        <div className="row" style={{ flex: 'none', width: 'auto' }}>
          <MuteButton />
          <button type="button" className="icon-btn" onClick={onLeave} title="Room verlaten" aria-label="Room verlaten">
            <Icon name="door" />
          </button>
        </div>
      </div>

      {children}

      {state.me.is_host && <HostPanel state={state} token={token} onChanged={onChanged} />}
    </div>
  );
}
