import { motion } from 'framer-motion';
import type { ActivityTag } from '@/types';
import { companionCategories } from '@/mock/recommendations';
import { cn } from '@/utils/cn';

export function CategoryChips({ value, onChange, withAll }: { value: ActivityTag | 'all'; onChange: (c: ActivityTag | 'all') => void; withAll?: boolean }) {
  const items = withAll ? [{ id: 'all' as const, label: 'For you', emoji: '✨' }, ...companionCategories] : companionCategories;
  return (
    <div className={cn(withAll ? 'no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0' : 'grid grid-cols-4 gap-2')}>
      {items.map((c, i) => {
        const active = value === c.id;
        return (
          <motion.button
            key={c.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -2 }}
            onClick={() => onChange(c.id)}
            className={cn(
              'flex shrink-0 items-center justify-center gap-1.5 rounded-2xl border text-[13px] font-semibold transition-colors',
              withAll ? 'h-9 px-3.5' : 'h-[68px] flex-col',
              active ? 'border-transparent bg-inverse text-on-inverse' : 'border-line bg-surface-solid/70 hover:bg-surface-2',
            )}
          >
            <span className={withAll ? 'text-[15px]' : 'text-[22px]'}>{c.emoji}</span>
            <span className={withAll ? '' : 'text-[11.5px]'}>{c.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
