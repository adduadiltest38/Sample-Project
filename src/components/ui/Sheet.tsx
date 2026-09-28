import { useEffect, useRef, useState } from 'react';
import { motion, useAnimationControls, type PanInfo } from 'framer-motion';
import { cn } from '@/utils/cn';

interface Props {
  children: React.ReactNode;
  /** Visible heights (px) the sheet snaps to, smallest first. */
  snaps: number[];
  snapIndex: number;
  onSnapChange: (i: number) => void;
  onHeightChange?: (h: number) => void;
  className?: string;
  /** Fixed width (tablets); full width when omitted. */
  width?: number;
}

/** Draggable mobile bottom sheet with snap points. */
export function Sheet({ children, snaps, snapIndex, onSnapChange, onHeightChange, className, width }: Props) {
  const controls = useAnimationControls();
  const maxH = snaps[snaps.length - 1];
  const [vh, setVh] = useState(() => window.innerHeight);
  const current = useRef(snaps[snapIndex]);

  useEffect(() => {
    const on = () => setVh(window.innerHeight);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  useEffect(() => {
    current.current = snaps[snapIndex];
    controls.start({ y: maxH - snaps[snapIndex], transition: { type: 'spring', stiffness: 380, damping: 38 } });
    onHeightChange?.(snaps[snapIndex]);
  }, [snapIndex, snaps, maxH, controls, onHeightChange]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const visible = current.current - info.offset.y - info.velocity.y * 0.15;
    let best = 0;
    snaps.forEach((s, i) => {
      if (Math.abs(s - visible) < Math.abs(snaps[best] - visible)) best = i;
    });
    if (best === snapIndex) controls.start({ y: maxH - snaps[best], transition: { type: 'spring', stiffness: 380, damping: 38 } });
    onSnapChange(best);
  };

  return (
    <motion.div
      className={cn('glass pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-[28px] pb-[env(safe-area-inset-bottom)]', className)}
      style={{ height: Math.min(maxH, vh - 8), width }}
      initial={{ y: maxH }}
      animate={controls}
      drag="y"
      dragConstraints={{ top: 0, bottom: maxH - snaps[0] }}
      dragElastic={0.08}
      dragMomentum={false}
      onDragEnd={onDragEnd}
    >
      <div
        className="flex shrink-0 cursor-grab justify-center pb-1 pt-2.5 active:cursor-grabbing"
        onClick={() => onSnapChange(snapIndex === snaps.length - 1 ? 1 : snapIndex + 1)}
      >
        <div className="h-1.5 w-11 rounded-full bg-ink/15" />
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-6" onPointerDownCapture={(e) => e.stopPropagation()}>
        {children}
      </div>
    </motion.div>
  );
}
