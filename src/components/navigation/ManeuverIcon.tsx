import { ArrowUp, ArrowUpLeft, ArrowUpRight, CornerUpLeft, CornerUpRight, Flag, Navigation, Undo2, Zap } from 'lucide-react';
import type { ManeuverType } from '@/types';

export function ManeuverIcon({ type, className }: { type: ManeuverType; className?: string }) {
  const I = {
    depart: Navigation,
    straight: ArrowUp,
    'slight-left': ArrowUpLeft,
    'slight-right': ArrowUpRight,
    left: CornerUpLeft,
    right: CornerUpRight,
    uturn: Undo2,
    'charging-stop': Zap,
    arrive: Flag,
  }[type];
  return <I className={className} strokeWidth={2.6} />;
}
