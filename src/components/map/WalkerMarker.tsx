import { motion } from 'framer-motion';
import { useJourney } from '@/stores/journeyStore';

/** Pedestrian marker used while exploring on foot. */
export function WalkerMarker({ z }: { z: number }) {
  const pos = useJourney((s) => s.walkerPos);
  const heading = useJourney((s) => s.walkerHeading);
  const visiting = useJourney((s) => s.state === 'VISITING');
  if (!pos) return null;
  return (
    <g transform={`translate(${pos.x} ${pos.y}) scale(${1 / z})`} pointerEvents="none">
      <motion.circle
        r={8}
        fill="var(--route)"
        initial={{ r: 8, opacity: 0.45 }}
        animate={{ r: 22, opacity: 0 }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
      />
      {!visiting && (
        <path d="M0 0 L26 -11 A28 28 0 0 1 26 11 Z" fill="var(--route)" opacity={0.22} transform={`rotate(${heading})`} />
      )}
      <motion.g animate={{ y: visiting ? 0 : [0, -1.4, 0] }} transition={{ duration: 0.5, repeat: Infinity }}>
        <circle r={8.5} fill="#fff" filter="url(#cf-shadow)" />
        <circle r={6} fill="var(--route)" />
      </motion.g>
    </g>
  );
}
