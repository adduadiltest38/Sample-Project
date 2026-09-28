import { useEffect } from 'react';
import { useJourney } from '@/stores/journeyStore';

/** Drives the whole simulation from a single requestAnimationFrame loop. */
export function useSimulationLoop() {
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      useJourney.getState().tick(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
}
