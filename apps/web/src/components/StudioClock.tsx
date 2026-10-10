/**
 * The studio clock (owner, fifth round; redrawn seventh round): one circle, two arcs — the
 * workday in the accent colour, the off hours dim — boundary ticks at the shift change, and a
 * hand at *now*. Wrap-safe: an overnight shift (start after end) draws exactly as well.
 *
 * The geometry is the boring kind on purpose: every angle is hours/24 of the circle, clockwise
 * from the top, and each arc carries its own span so the large-arc flag can never lie.
 */
import { useEffect, useState } from 'react';
import { readWorkHours, isWorkTime } from '../lib/schedule';
import { t, type Lang } from '../lib/i18n';

const C = 34; // the viewBox centre
const R = 26; // the ring radius

/** Clockwise arc from hour `from` to hour `to` (wrapping past midnight). */
const arc = (from: number, to: number) => {
  const span = (((to - from) % 24) + 24) % 24;
  const a0 = ((from / 24) * 2 * Math.PI) - Math.PI / 2;
  const a1 = (((from + span) / 24) * 2 * Math.PI) - Math.PI / 2;
  const x0 = C + R * Math.cos(a0);
  const y0 = C + R * Math.sin(a0);
  const x1 = C + R * Math.cos(a1);
  const y1 = C + R * Math.sin(a1);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${span > 12 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

/** A short tick at an hour mark, pointing out of the ring. */
const tick = (hour: number) => {
  const a = (hour / 24) * 2 * Math.PI - Math.PI / 2;
  const x0 = C + (R - 4) * Math.cos(a);
  const y0 = C + (R - 4) * Math.sin(a);
  const x1 = C + (R + 4) * Math.cos(a);
  const y1 = C + (R + 4) * Math.sin(a);
  return { x0, y0, x1, y1 };
};

export function StudioClock({ label, lang }: { label: string; lang: Lang }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const hours = readWorkHours();
  const nowFloat = now.getHours() + now.getMinutes() / 60;
  const hand = (nowFloat / 24) * 2 * Math.PI - Math.PI / 2;
  const t0 = tick(hours.start);
  const t1 = tick(hours.end);
  return (
    <span className="studio-clock" role="img"
      aria-label={`${label} ${hours.start}:00–${hours.end}:00`}>
      <svg viewBox="0 0 68 68">
        <path className="clock-off" d={arc(hours.end, hours.start)} fill="none" />
        <path className="clock-work" d={arc(hours.start, hours.end)} fill="none" />
        <line className="clock-tick" x1={t0.x0} y1={t0.y0} x2={t0.x1} y2={t0.y1} />
        <line className="clock-tick" x1={t1.x0} y1={t1.y0} x2={t1.x1} y2={t1.y1} />
        <line className="clock-hand" x1={C} y1={C}
          x2={C + 18 * Math.cos(hand)} y2={C + 18 * Math.sin(hand)} />
        <circle className="clock-pin" cx={C} cy={C} r={2.5} />
      </svg>
      <small>{`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`}</small>
      {/* R11 (owner): the clock says in words whether the studio is on the clock or off it. */}
      <small className={`clock-state ${isWorkTime(now) ? 'work' : 'rest'}`} data-clock-state={isWorkTime(now) ? 'work' : 'rest'}>
        {isWorkTime(now) ? t('clockWork', lang) : t('clockRest', lang)}
      </small>
    </span>
  );
}
