export const AVATAR_EMOJIS = [
  '🦊', '🐸', '🐙', '🦉', '🐢', '🦔', '🐼', '🦁',
  '🐧', '🐳', '🦄', '🐺', '🦝', '🦩', '🐝', '🦈',
  '🐨', '🦋', '🐬', '🦫',
];

export function randomEmoji(): string {
  return AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];
}
