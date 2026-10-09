/**
 * The studio clock (owner, fifth round): one circle, two colours — the workday arc and the
 * off-hours arc — and a hand at *now*, so anyone can see where the day is. The hours come
 * from the schedule the owner sets in Settings.
 */
import { useEffect, useState } from 'react';
import { readWorkHours } from '../lib/schedule';

const angleOf = (hourFloat: number) => (hourFloat / 24) * 360 - 90;

const arc = (fromHour: number, toHour: number, r: number, c: number) => {
  const a0 = (angleOf(fromHour) * Math.PI) / 180;
  const a1 = (angleOf(toHour) * Math.PI) / 180;
  const large = toHour - fromHour > 12 ? 1 : 0;
  const x0 = c + r * Math.cos(a0);
  const y0 = c + r * Math.sin(a0);
  const x1 = c + r * Math.cos(a1);
  const y1 = c + r * Math.sin(a1);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

export function StudioClock({ label }: { label: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const hours = readWorkHours();
  const c = 34;
  const hand = angleOf(now.getHours() + now.getMinutes() / 60);
  return (
    <span className="studio-clock" role="img"
      aria-label={`${label} ${hours.start}:00–${hours.end}:00`}>
      <svg viewBox="0 0 68 68">
        <path className="clock-off" d={arc(hours.end, hours.start + 24 > 48 ? hours.start + 24 - 24 : hours.start, c - 7, c)} fill="none" />
        <path className="clock-work" d={arc(hours.start, hours.end, c - 7, c)} fill="none" />
        <line className="clock-hand" x1={c} y1={c} x2={c + 22 * Math.cos((hand * Math.PI) / 180)} y2={c + 22 * Math.sin((hand * Math.PI) / 180)} />
        <circle className="clock-pin" cx={c} cy={c} r={2.5} />
      </svg>
      <small>{`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`}</small>
    </span>
  );
}
