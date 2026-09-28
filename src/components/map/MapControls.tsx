import { LocateFixed, Minus, Plus } from 'lucide-react';
import { useUi } from '@/stores/uiStore';
import { IconButton } from '../ui/IconButton';
import { cn } from '@/utils/cn';

export function MapControls({ className }: { className?: string }) {
  const free = useUi((s) => s.mapFree);
  const controls = useUi((s) => s.mapControls);
  return (
    <div className={cn('pointer-events-auto flex flex-col gap-2', className)}>
      <div className="glass flex flex-col overflow-hidden rounded-2xl">
        <button className="grid size-11 place-items-center hover:bg-surface-2" onClick={() => controls.zoomBy?.(1.45)} aria-label="Zoom in">
          <Plus className="size-4.5" />
        </button>
        <div className="mx-2 h-px bg-line" />
        <button className="grid size-11 place-items-center hover:bg-surface-2" onClick={() => controls.zoomBy?.(1 / 1.45)} aria-label="Zoom out">
          <Minus className="size-4.5" />
        </button>
      </div>
      <IconButton label="Recenter" onClick={() => controls.recenter?.()} active={free} className={cn(free && 'ring-2 ring-volt/60')}>
        <LocateFixed className="size-4.5" />
      </IconButton>
    </div>
  );
}
