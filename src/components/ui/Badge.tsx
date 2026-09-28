import { cn } from '@/utils/cn';

type Tone = 'neutral' | 'volt' | 'route' | 'amber' | 'danger' | 'inverse';

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-ink-2',
  volt: 'bg-volt-soft text-volt-strong',
  route: 'bg-route-soft text-route',
  amber: 'bg-amber-soft text-amber-600 dark:text-amber',
  danger: 'bg-danger/10 text-danger',
  inverse: 'bg-inverse text-on-inverse',
};

export function Badge({ tone = 'neutral', className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-semibold leading-none', tones[tone], className)}>
      {children}
    </span>
  );
}
