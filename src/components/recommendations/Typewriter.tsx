import { useEffect, useState } from 'react';

/** Reveals text progressively — used for AI responses. */
export function Typewriter({ text, speed = 14, onDone }: { text: string; speed?: number; onDone?: () => void }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const words = text.split(/(\s+)/);
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setN(i);
      if (i >= words.length) {
        clearInterval(t);
        onDone?.();
      }
    }, speed * 2.4);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  const words = text.split(/(\s+)/);
  return (
    <span>
      {words.slice(0, n).join('')}
      {n < words.length && <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-current" />}
    </span>
  );
}
