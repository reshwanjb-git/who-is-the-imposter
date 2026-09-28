/**
 * Gedeelde duotone-icoonset. Vervangt losse UI-emoji (knoppen, badges,
 * statuslabels) door consistente SVG-iconen die meekleuren met het thema
 * via --ico-1 (accentlijn) en --ico-2 (zachte vulling, achtergrondcirkel).
 * Speler-avatars (emoji die de gebruiker zelf koos) blijven gewoon emoji —
 * die zijn content, geen UI-chrome.
 */
import type { SVGProps } from 'react';

export type IconName =
  | 'detective'
  | 'key'
  | 'door'
  | 'gear'
  | 'close'
  | 'skip'
  | 'dice'
  | 'crown'
  | 'volume-on'
  | 'volume-off'
  | 'link'
  | 'check'
  | 'play'
  | 'hourglass'
  | 'mask'
  | 'scale'
  | 'ballot'
  | 'refresh'
  | 'trophy';

const GLYPHS: Record<IconName, React.ReactNode> = {
  detective: (
    <>
      <circle cx="10.5" cy="10.5" r="5.5" />
      <line x1="14.5" y1="14.5" x2="20" y2="20" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="9" r="4" />
      <line x1="11.5" y1="12.5" x2="20.5" y2="21.5" />
      <line x1="15.5" y1="16.5" x2="18" y2="14" />
      <line x1="18.3" y1="19.3" x2="20.5" y2="17" />
    </>
  ),
  door: (
    <>
      <rect x="4" y="3" width="9" height="18" rx="1" />
      <circle cx="10.2" cy="12" r="0.7" fill="var(--ico-1)" stroke="none" />
      <line x1="14" y1="12" x2="20" y2="12" />
      <polyline points="17,9 20,12 17,15" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.8 5.8l2.1 2.1M16.1 16.1l2.1 2.1M18.2 5.8l-2.1 2.1M7.9 16.1l-2.1 2.1" />
    </>
  ),
  close: (
    <>
      <line x1="7" y1="7" x2="17" y2="17" />
      <line x1="17" y1="7" x2="7" y2="17" />
    </>
  ),
  skip: (
    <>
      <path d="M5 5l10 7-10 7z" />
      <line x1="18.5" y1="5" x2="18.5" y2="19" />
    </>
  ),
  dice: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <circle cx="8.5" cy="8.5" r="1" fill="var(--ico-1)" stroke="none" />
      <circle cx="15.5" cy="8.5" r="1" fill="var(--ico-1)" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="var(--ico-1)" stroke="none" />
      <circle cx="8.5" cy="15.5" r="1" fill="var(--ico-1)" stroke="none" />
      <circle cx="15.5" cy="15.5" r="1" fill="var(--ico-1)" stroke="none" />
    </>
  ),
  crown: (
    <>
      <path d="M4 19h16" />
      <path d="M4 19l-1.3-9 5.3 4 4-7.5 4 7.5 5.3-4-1.3 9z" />
    </>
  ),
  'volume-on': (
    <>
      <path d="M4 9.5h3.5L13 5v14l-5.5-4.5H4z" />
      <path d="M16.2 9a4.2 4.2 0 010 6M18.8 6.4a8 8 0 010 11.2" />
    </>
  ),
  'volume-off': (
    <>
      <path d="M4 9.5h3.5L13 5v14l-5.5-4.5H4z" />
      <line x1="16" y1="9" x2="21" y2="15" />
      <line x1="21" y1="9" x2="16" y2="15" />
    </>
  ),
  link: (
    <>
      <path d="M9.5 14.5l5-5" />
      <path d="M8 16a3.3 3.3 0 010-4.7l2-2a3.3 3.3 0 014.7 4.7" />
      <path d="M16 8a3.3 3.3 0 010 4.7l-2 2a3.3 3.3 0 01-4.7-4.7" />
    </>
  ),
  check: <polyline points="6,12.5 10,16.5 18,7.5" />,
  play: <path d="M6 4.5l14 7.5-14 7.5z" />,
  hourglass: (
    <>
      <line x1="6" y1="3" x2="18" y2="3" />
      <line x1="6" y1="21" x2="18" y2="21" />
      <path d="M7 3v4l5 5 5-5V3" />
      <path d="M7 21v-4l5-5 5 5v4" />
    </>
  ),
  mask: (
    <>
      <path d="M12 3.2c-4.1 0-7 3-7 7v3.8a7 7 0 0014 0V10.2c0-4-2.9-7-7-7z" />
      <path d="M9 12.3c.6.9 1.4.9 2 0M13 12.3c.6.9 1.4.9 2 0" />
    </>
  ),
  scale: (
    <>
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="7" y1="21" x2="17" y2="21" />
      <line x1="4.5" y1="7.5" x2="19.5" y2="7.5" />
      <path d="M3.2 12.5a2.8 2.8 0 005.6 0L6 7.5z" />
      <path d="M15.2 12.5a2.8 2.8 0 005.6 0L18 7.5z" />
    </>
  ),
  ballot: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <polyline points="8,12 10.7,14.7 16,9" />
    </>
  ),
  refresh: (
    <>
      <path d="M5 12a7 7 0 0112.3-4.6" />
      <path d="M19 12a7 7 0 01-12.3 4.6" />
      <polyline points="17,3.8 17.3,7.4 13.7,7.6" />
      <polyline points="7,20.2 6.7,16.6 10.3,16.4" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v5a5 5 0 01-10 0z" />
      <path d="M7 5.5H4.5a2.8 2.8 0 003 3.7M17 5.5h2.5a2.8 2.8 0 01-3 3.7" />
      <line x1="12" y1="14" x2="12" y2="17" />
      <line x1="9" y1="20.5" x2="15" y2="20.5" />
      <path d="M9 20.5c0-2 1.3-3 3-3s3 1 3 3" />
    </>
  ),
};

export function Icon({
  name,
  className,
  title,
  ...rest
}: { name: IconName; title?: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`ico ${className ?? ''}`}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      {...rest}
    >
      {title && <title>{title}</title>}
      <circle cx="12" cy="12" r="10.5" fill="var(--ico-2)" fillOpacity="0.18" stroke="none" />
      <g fill="none" stroke="var(--ico-1)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        {GLYPHS[name]}
      </g>
    </svg>
  );
}
