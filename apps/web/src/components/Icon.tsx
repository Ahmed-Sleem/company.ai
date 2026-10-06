/**
 * One pixel icon, drawn from the owner's demo.
 *
 * The demo's `icon()` writes an 18×18 filled path; this is the same shape with React's
 * attributes. `aria-hidden` is deliberate: every icon in this product sits beside the word it
 * stands for, so announcing it again would only add noise for a screen reader. An icon with no
 * word beside it must take its own label — see `label` below, which moves it out of the
 * decoration role and gives it a name.
 */
import { ICONS, ICON_VIEWBOX, type IconName } from '../lib/icons.data';

export function Icon({
  name,
  label,
  className,
}: {
  name: IconName | string;
  /** Set only when the icon is the control's *only* label (an icon-only button, say). */
  label?: string;
  className?: string;
}) {
  const path = ICONS[name];
  if (!path) return null; // an unknown name draws nothing rather than a broken box
  return (
    <svg
      className={`icon pixel-icon${className ? ` ${className}` : ''}`}
      viewBox={`0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}`}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      focusable="false"
    >
      <path d={path} />
    </svg>
  );
}
