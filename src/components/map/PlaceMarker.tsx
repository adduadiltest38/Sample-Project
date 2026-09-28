import { motion } from 'framer-motion';
import type { FitStatus, Place } from '@/types';

interface Props {
  place: Place;
  z: number;
  fit?: FitStatus;
  highlighted: boolean;
  dim: boolean;
  topPick: boolean;
  showLabel: boolean;
  onSelect: (id: string) => void;
}

const RING: Record<FitStatus, string> = {
  perfect: 'var(--volt)',
  plenty: 'var(--volt)',
  shortened: 'var(--amber)',
  'no-fit': '#9CA3AF',
  closed: '#9CA3AF',
};

export function PlaceMarker({ place, z, fit, highlighted, dim, topPick, showLabel, onSelect }: Props) {
  const s = (highlighted ? 1.25 : 1) / z;
  return (
    <g transform={`translate(${place.position.x} ${place.position.y}) scale(${s})`} opacity={dim ? 0.38 : 1}>
      <motion.g
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.15 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
        style={{ cursor: 'pointer' }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(place.id);
        }}
      >
        <circle r={13.5} fill="var(--surface-solid)" stroke={fit ? RING[fit] : 'var(--line)'} strokeWidth={fit ? 2.6 : 1.2} filter="url(#cf-shadow)" />
        <text textAnchor="middle" dy={4.6} fontSize={13}>
          {place.emoji}
        </text>
        {topPick && (
          <g transform="translate(10 -11)">
            <circle r={6.5} fill="var(--volt)" stroke="#fff" strokeWidth={1.2} />
            <text textAnchor="middle" dy={3} fontSize={7.5} fontWeight={800} fill="#06281D">
              ✦
            </text>
          </g>
        )}
      </motion.g>
      {showLabel && (
        <text y={27} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="var(--ink)" className="map-label" strokeWidth={3.2} pointerEvents="none">
          {place.name}
        </text>
      )}
    </g>
  );
}
