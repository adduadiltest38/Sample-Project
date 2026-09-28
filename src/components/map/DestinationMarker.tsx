import { motion } from 'framer-motion';
import type { Point } from '@/types';

export function DestinationMarker({ at, z, label }: { at: Point; z: number; label: string }) {
  return (
    <g transform={`translate(${at.x} ${at.y}) scale(${1 / z})`} pointerEvents="none">
      <motion.g initial={{ y: -14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
        <ellipse rx={6} ry={2.2} fill="#000" opacity={0.25} />
        <path d="M0 0 C -4 -6, -12 -10, -12 -20 A 12 12 0 1 1 12 -20 C 12 -10, 4 -6, 0 0 Z" fill="var(--inverse)" stroke="#fff" strokeWidth={2} filter="url(#cf-shadow)" />
        <path d="M-3.5 -26 V-13.5 M-3.5 -26 H4.5 L2.5 -22.6 L4.5 -19.4 H-3.5" stroke="var(--on-inverse)" strokeWidth={1.8} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <g transform="translate(0 -44)">
          <rect x={-(label.length * 3.4 + 12)} y={-10} width={label.length * 6.8 + 24} height={20} rx={10} fill="var(--inverse)" />
          <text textAnchor="middle" y={4} fontSize={10.5} fontWeight={700} fill="var(--on-inverse)">
            {label}
          </text>
        </g>
      </motion.g>
    </g>
  );
}
