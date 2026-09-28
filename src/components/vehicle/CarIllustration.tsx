import type { Vehicle } from '@/types';

/** Stylised side profile, tinted with the vehicle's paint colour. */
export function CarIllustration({ vehicle, className }: { vehicle: Vehicle; className?: string }) {
  const suv = vehicle.body === 'suv';
  const sport = vehicle.body === 'sport';
  const roof = suv ? 'M58 40 C70 20 96 14 128 14 C152 14 170 22 184 40' : sport ? 'M62 42 C78 24 104 18 130 19 C150 20 168 28 186 42' : 'M60 41 C74 22 100 16 128 17 C150 18 168 25 184 41';
  const id = `g-${vehicle.id}`;
  return (
    <svg viewBox="0 0 240 90" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={vehicle.color} />
          <stop offset="1" stopColor={vehicle.color} stopOpacity="0.78" />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1f2a3a" />
          <stop offset="1" stopColor="#0b111b" />
        </linearGradient>
      </defs>
      <ellipse cx="120" cy="80" rx="100" ry="6" fill="#000" opacity="0.18" />
      <path
        d={`${roof} L206 46 C218 48 224 54 224 62 L224 66 C224 70 220 72 216 72 L24 72 C20 72 16 70 16 66 L16 62 C16 52 28 46 44 44 L${suv ? 58 : sport ? 62 : 60} ${suv ? 40 : sport ? 42 : 41} Z`}
        fill={`url(#${id})`}
        stroke="rgba(0,0,0,0.15)"
      />
      <path
        d={suv ? 'M70 40 C80 26 98 21 124 21 L124 40 Z M130 21 C150 21 164 26 174 40 L130 40 Z' : 'M72 41 C84 27 102 23 124 23 L124 41 Z M130 23 C148 23 162 29 172 41 L130 41 Z'}
        fill={`url(#${id}-glass)`}
      />
      <path d="M30 54 H210" stroke="#fff" strokeOpacity="0.28" strokeWidth="1.5" />
      <rect x="208" y="50" width="12" height="4" rx="2" fill="#FFF7D1" />
      <rect x="18" y="52" width="8" height="4" rx="2" fill="#F43F5E" />
      {[62, 180].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="70" r="15" fill="#0b0d12" />
          <circle cx={cx} cy="70" r="9" fill="#9aa3af" />
          <circle cx={cx} cy="70" r="3.5" fill="#374151" />
        </g>
      ))}
    </svg>
  );
}
