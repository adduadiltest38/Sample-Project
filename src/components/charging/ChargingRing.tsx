import { motion } from 'framer-motion';

/** Circular state-of-charge gauge with target marker and pulsing halo. */
export function ChargingRing({ soc, target, start, size = 200, active = true }: { soc: number; target: number; start: number; size?: number; active?: boolean }) {
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  const arc = (pct: number) => c * (pct / 100);
  const angle = (pct: number) => (pct / 100) * 360 - 90;
  const tx = size / 2 + r * Math.cos((angle(target) * Math.PI) / 180);
  const ty = size / 2 + r * Math.sin((angle(target) * Math.PI) / 180);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {active && (
        <motion.div
          className="absolute inset-3 rounded-full bg-volt/25 blur-2xl"
          animate={{ opacity: [0.35, 0.8, 0.35], scale: [0.95, 1.04, 0.95] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <svg width={size} height={size} className="relative">
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2EF2B5" />
            <stop offset="1" stopColor="#3B9BFF" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={14} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--muted)"
          strokeOpacity={0.35}
          strokeWidth={14}
          strokeDasharray={`${arc(start)} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          strokeLinecap="round"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth={14}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={false}
          animate={{ strokeDasharray: `${arc(soc)} ${c}` }}
          transition={{ type: 'spring', stiffness: 60, damping: 18 }}
        />
        <circle cx={tx} cy={ty} r={5} fill="var(--surface-solid)" stroke="var(--ink)" strokeWidth={2.2} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="num text-[46px] font-bold leading-none tracking-tighter">
          {Math.floor(soc)}
          <span className="text-xl">%</span>
        </div>
        <div className="mt-1 text-[12px] font-semibold text-muted">target {target}%</div>
      </div>
    </div>
  );
}
