import { AVATAR_EMOJIS } from '@/lib/emojis';

export function EmojiPicker({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  return (
    <div className="emoji-grid" role="listbox" aria-label="Kies een avatar">
      {AVATAR_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className={emoji === value ? 'selected' : ''}
          onClick={() => onChange(emoji)}
          aria-pressed={emoji === value}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
