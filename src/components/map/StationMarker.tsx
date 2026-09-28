import { motion } from 'framer-motion';
import type { ChargingStation } from '@/types';

export type StationMarkerMode = 'default' | 'active' | 'selected' | 'charging' | 'dim' | 'scan';

interface Props {
  station: ChargingStation;
  z: number;
  mode: StationMarkerMode;
  showLabel: boolean;
  scanDelay?: number;
  onSelect: (id: string) => void;
}

const PIN = 'M0 0 C -4 -6, -13 -10, -13 -21 A 13 13 0 1 1 13 -21 C 13 -10, 4 -6, 0 0 Z';
const BOLT = 'M1.6 -29.5 L-5.2 -19.6 H-0.6 L-2 -12.4 L5.2 -22.6 H0.6 Z';

export function StationMarker({ station, z, mode, showLabel, scanDelay = 0, onSelect }: Props) {
  const fill = station.availableChargers === 0 ? 'url(#cf-full)' : station.availableChargers <= 1 ? 'url(#cf-busy)' : 'url(#cf-volt)';
  const scale = (mode === 'active' || mode === 'charging' || mode === 'selected' ? 1.18 : z < 0.6 ? 0.78 : 1) / z;

  return (
    <g transform={`translate(${station.position.x} ${station.position.y}) scale(${scale})`} opacity={mode === 'dim' ? 0.55 : 1}>
      {(mode === 'charging' || mode === 'active') &&
        [0, 0.9].map((d) => (
          <motion.circle
            key={d}
            cx={0}
            cy={-21}
            fill="none"
            stroke="var(--volt)"
            strokeWidth={2}
            initial={{ r: 14, opacity: 0.7 }}
            animate={{ r: 38, opacity: 0 }}
            transition={{ duration: mode === 'charging' ? 1.6 : 2.4, repeat: Infinity, delay: d, ease: 'easeOut' }}
          />
        ))}
      {mode === 'scan' && (
        <motion.circle
          cx={0}
          cy={-21}
          fill="var(--volt)"
          initial={{ r: 12, opacity: 0 }}
          animate={{ r: [12, 30], opacity: [0.5, 0] }}
          transition={{ duration: 1.1, delay: scanDelay, repeat: Infinity, repeatDelay: 0.8 }}
        />
      )}
      <motion.g
        style={{ cursor: 'pointer' }}
        whileHover={{ scale: 1.14 }}
        whileTap={{ scale: 0.94 }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(station.id);
        }}
      >
        <ellipse cx={0} cy={0} rx={6} ry={2.2} fill="#000" opacity={0.22} />
        <path d={PIN} fill={fill} stroke="#fff" strokeWidth={2} filter="url(#cf-shadow)" />
        <path d={BOLT} fill="#06281D" />
        <g transform="translate(11 -32)">
          <circle r={7.2} fill="var(--inverse)" stroke="#fff" strokeWidth={1.4} />
          <text textAnchor="middle" dy={3} fontSize={8.5} fontWeight={800} fill="var(--on-inverse)" className="num">
            {station.availableChargers}
          </text>
        </g>
      </motion.g>
      {showLabel && (
        <g transform="translate(18 -21)" pointerEvents="none">
          <rect x={0} y={-11} width={station.name.length * 6.1 + 44} height={22} rx={11} fill="var(--surface-solid)" stroke="var(--line)" filter="url(#cf-shadow)" />
          <text x={10} y={4} fontSize={11} fontWeight={700} fill="var(--ink)">
            {station.name}
          </text>
          <text x={station.name.length * 6.1 + 14} y={4} fontSize={10} fontWeight={700} fill="var(--volt-strong)" className="num">
            {station.powerKW}kW
          </text>
        </g>
      )}
    </g>
  );
}
