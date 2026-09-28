import type { Amenity } from '@/types';
import { cn } from '@/utils/cn';

export const AMENITY_META: Record<Amenity, { emoji: string; label: string }> = {
  Coffee: { emoji: '☕', label: 'Café' },
  Food: { emoji: '🍔', label: 'Food' },
  Restroom: { emoji: '🚻', label: 'Restroom' },
  Shopping: { emoji: '🛍️', label: 'Shopping' },
  WiFi: { emoji: '📶', label: 'WiFi' },
  Lounge: { emoji: '🛋️', label: 'Lounge' },
  Cinema: { emoji: '🎬', label: 'Cinema' },
  Park: { emoji: '🌳', label: 'Park' },
  Workspace: { emoji: '💼', label: 'Workspace' },
  Beach: { emoji: '🏖️', label: 'Beach' },
  Convenience: { emoji: '🏪', label: 'Store' },
};

export function AmenityChips({ amenities, className }: { amenities: Amenity[]; className?: string }) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {amenities.map((a) => (
        <span key={a} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1.5 text-[12.5px] font-medium">
          <span>{AMENITY_META[a].emoji}</span>
          {AMENITY_META[a].label}
        </span>
      ))}
    </div>
  );
}

export function AmenityIcons({ amenities, className }: { amenities: Amenity[]; className?: string }) {
  return (
    <div className={cn('flex gap-1', className)}>
      {amenities.slice(0, 6).map((a) => (
        <span key={a} title={AMENITY_META[a].label} className="grid size-6 place-items-center rounded-lg bg-surface-2 text-[12px]">
          {AMENITY_META[a].emoji}
        </span>
      ))}
    </div>
  );
}
