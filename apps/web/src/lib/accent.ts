/**
 * The custom accent — the one thing the owner's demo does that needed a rule rather than a copy.
 *
 * Their demo lets someone pick any colour and then *walks it* until small text on the surfaces it
 * is drawn against passes contrast. That idea is right, so it is kept; what changes is that the
 * rule is written down, pure, and tested, instead of being a loop buried in `applyPalette()`.
 *
 * The maths is standard and deliberately boring: sRGB relative luminance, mix in sRGB (which is
 * what the demo does, and what keeps the chosen hue recognisable), and a walk in 1% steps toward
 * the far end of the lightness range until every measured pair clears the bar.
 *
 * Everything here is a pure function of its arguments, so the whole rule can be tested without a
 * browser — and the app only ever writes the *result* as three custom properties on the root.
 *
 * raw-values: colour-maths exception — this file parses, mixes and measures colour, so
 * hex and rgb literals are its subject matter. It is the only file allowed to hold them,
 * and scripts/checks/raw-values.mjs names it explicitly.
 */
export type Mode = 'dark' | 'light';

/** WCAG AA for small text. The accents are used for small labels and icons. */
export const TARGET = 4.5;

export const validHex = (value: string) => /^#[0-9a-f]{6}$/i.test(value.trim());

function rgb(hex: string): [number, number, number] {
  const clean = hex.trim().replace('#', '');
  return [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16)) as [number, number, number];
}

const toHex = (parts: number[]) =>
  `#${parts.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;

/** Mix two colours: `n` is how far to move from `a` toward `b`. */
export function mix(a: string, b: string, n: number) {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  return toHex([ar + (br - ar) * n, ag + (bg - ag) * n, ab + (bb - ab) * n]);
}

function luminance(hex: string) {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (high + 0.05) / (low + 0.05);
}

/** The three tokens a palette owns, as the app draws them. */
export type Derived = { accent: string; accentBg: string; onAccent: string; walked: number };

/**
 * Turn one chosen colour into a usable accent for one theme.
 *
 * `surfaces` are the backgrounds the accent is drawn on. The walk moves the accent toward white
 * in dark mode and toward black in light mode — the direction that *increases* contrast against
 * those surfaces — and stops at the first step where every pair passes. `walked` reports how far
 * it had to move, so the interface can say so instead of silently changing someone's colour.
 */
export function deriveAccent(chosen: string, mode: Mode, surfaces: string[]): Derived {
  const requested = validHex(chosen) ? chosen.toLowerCase() : '#accab3';
  const accentBg = mix(surfaces[0] ?? (mode === 'dark' ? '#111514' : '#f5f6f1'), requested, mode === 'dark' ? 0.12 : 0.1);
  const target = mode === 'dark' ? '#ffffff' : '#000000';
  const against = [...surfaces, accentBg];

  let accent = requested;
  let walked = 0;
  for (let step = 0; step <= 100; step++) {
    accent = mix(requested, target, step / 100);
    walked = step / 100;
    // At the far end this is white in dark mode and black in light mode, so the loop always
    // terminates with a passing colour — `walked` is what tells the person how far it moved.
    if (against.every((surface) => contrast(accent, surface) >= TARGET)) break;
  }

  // What to write on top of the accent: whichever end of the range contrast *that* better.
  const onAccent =
    contrast('#111514', accent) >= contrast('#ffffff', accent)
      ? (mode === 'dark' ? '#111514' : '#0b0f0e')
      : '#ffffff';

  return { accent, accentBg, onAccent, walked };
}

/** Write a derived accent onto the document, or clear it when the presets are in charge. */
export function applyCustomAccent(derived: Derived | null) {
  const root = document.documentElement;
  const names = ['--accent', '--accent-bg', '--on-accent'] as const;
  if (!derived) {
    for (const name of names) root.style.removeProperty(name);
    delete root.dataset.customAccent;
    return null;
  }
  root.style.setProperty('--accent', derived.accent);
  root.style.setProperty('--accent-bg', derived.accentBg);
  root.style.setProperty('--on-accent', derived.onAccent);
  root.dataset.customAccent = derived.accent;
  return derived;
}
