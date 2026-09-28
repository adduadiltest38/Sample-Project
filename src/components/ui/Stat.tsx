import { cn } from '@/utils/cn';

export function Stat({ label, value, unit, className, accent }: { label: string; value: React.ReactNode; unit?: string; className?: string; accent?: boolean }) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className={cn('num mt-0.5 truncate text-[19px] font-semibold', accent && 'text-volt-strong')}>
        {value}
        {unit && <span className="ml-0.5 text-[12px] font-medium text-muted">{unit}</span>}
      </div>
    </div>
  );
}
