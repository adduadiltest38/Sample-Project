export const pad2 = (n: number) => String(Math.floor(n)).padStart(2, '0');

/** Seconds since midnight → "14:32". */
export const formatClock = (secs: number) => {
  const s = ((secs % 86400) + 86400) % 86400;
  return `${pad2(s / 3600)}:${pad2((s % 3600) / 60)}`;
};

export const formatMinutes = (min: number) => {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${pad2(m % 60)} min`;
};

export const formatDistance = (meters: number) => {
  if (meters < 950) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)} km`;
};

export const formatMoney = (v: number) => `$${v.toFixed(2)}`;

export const formatPercent = (v: number) => `${Math.round(v)}%`;
