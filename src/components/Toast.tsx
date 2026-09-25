import { useEffect } from 'react';

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onDone, 3200);
    return () => window.clearTimeout(id);
  }, [message, onDone]);

  return (
    <div className="toast fade-in" role="status">
      {message}
    </div>
  );
}
