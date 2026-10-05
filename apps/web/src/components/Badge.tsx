/**
 * The one status chip. Stages, priorities, decision kinds and statuses all render through it,
 * so a "high" badge can never look like a "done" badge in one place and not another.
 */
export type BadgeTone = 'neutral' | 'accent' | 'warning' | 'danger' | 'dim';

const TONES: Record<string, BadgeTone> = {
  // task stages
  backlog: 'dim', progress: 'accent', review: 'warning', done: 'accent',
  // priorities
  low: 'dim', medium: 'neutral', high: 'danger', critical: 'danger',
  // decisions
  pending: 'warning', approved: 'accent', rejected: 'danger',
};

export function Badge({ children, tone }: { children: React.ReactNode; tone?: BadgeTone }) {
  const resolved = tone ?? 'neutral';
  return <span className={`badge ${resolved}`}>{children}</span>;
}

/** The tone a known value gets, from one table — so every surface agrees. */
export function toneOf(value: string, fallback: BadgeTone = 'neutral'): BadgeTone {
  return TONES[value] ?? fallback;
}
