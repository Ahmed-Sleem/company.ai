/**
 * A person's portrait — the demo's `avatar(index, size)`.
 *
 * The demo draws every person as pixel art from its own library, and stores an *index* per agent
 * (so a portrait can be changed without touching a path). Same here: `PORTRAITS[index]`, falling
 * back to the first portrait for a value that is out of range, exactly as the demo does.
 *
 * It is decorative: the person's name is always next to it in the markup, so it is hidden from
 * assistive technology rather than read out as an unlabelled image.
 */
import { PORTRAITS } from '../lib/avatars.data';

export function Avatar({ index, size = '' }: { index: number | null | undefined; size?: '' | 'sm' | 'lg' | 'xl' }) {
  const portrait = PORTRAITS[index ?? 0] ?? PORTRAITS[0];
  if (!portrait) return null;
  return (
    <span className={`avatar ${size}`} aria-hidden="true" data-avatar={index ?? 0}>
      <svg viewBox={`-2 -2 ${portrait.grid + 4} ${portrait.grid + 4}`} shapeRendering="crispEdges">
        <path fill="currentColor" d={portrait.path} />
      </svg>
    </span>
  );
}
