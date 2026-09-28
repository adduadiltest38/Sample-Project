import { memo } from 'react';
import { arterials } from '@/lib/cityGen';
import { districtLabels, parks, waterLabels } from '@/mock/city';

/** Zoom-aware labels. Font sizes are in screen pixels (divided by zoom). */
export const MapLabels = memo(function MapLabels({ z }: { z: number }) {
  const px = (n: number) => n / z;
  return (
    <g pointerEvents="none">
      {waterLabels.map((w) => (
        <text
          key={w.name}
          x={w.x}
          y={w.y}
          transform={w.rotate ? `rotate(${w.rotate} ${w.x} ${w.y})` : undefined}
          fontSize={w.size > 20 ? Math.max(px(15), 18) : px(w.size)}
          fontStyle="italic"
          fontWeight={500}
          letterSpacing={px(3)}
          fill="var(--map-water-deep)"
          textAnchor="middle"
          style={{ filter: 'brightness(0.72)' }}
        >
          {w.name}
        </text>
      ))}

      {z >= 1.1 &&
        parks
          .filter((p) => p.kind !== 'beach' && p.points.length)
          .map((p) => {
            const cx = p.points.reduce((s, q) => s + q[0], 0) / p.points.length;
            const cy = p.points.reduce((s, q) => s + q[1], 0) / p.points.length;
            return (
              <text key={p.id} x={cx} y={cy} fontSize={px(10.5)} fontWeight={600} fill="#4d8a52" textAnchor="middle" className="map-label" strokeWidth={px(3)} opacity={0.9}>
                {p.name}
              </text>
            );
          })}

      {z >= 0.48 &&
        arterials.map((r) => {
          const offsets = r.length > 1500 ? ['18%', '52%', '84%'] : r.length > 700 ? ['30%', '72%'] : ['50%'];
          const size = r.cls === 'highway' ? 11 : 10;
          return offsets.map((o) => (
            <text
              key={`${r.id}-${o}`}
              fontSize={px(size)}
              fontWeight={r.cls === 'highway' ? 700 : 600}
              fill="var(--map-label)"
              className="map-label"
              strokeWidth={px(3.2)}
              dy={px(3.6)}
              letterSpacing={px(0.2)}
            >
              <textPath href={`#road-${r.id}`} startOffset={o} textAnchor="middle">
                {r.name}
              </textPath>
            </text>
          ));
        })}

      {z < 3 &&
        districtLabels.map((d) => (
          <text
            key={d.name}
            x={d.x}
            y={d.y}
            fontSize={px(z < 0.6 ? 10 : 11.5)}
            fontWeight={700}
            letterSpacing={px(2.4)}
            fill="var(--map-district)"
            textAnchor="middle"
            className="map-label"
            strokeWidth={px(3.5)}
          >
            {d.name.toUpperCase()}
          </text>
        ))}
    </g>
  );
});
