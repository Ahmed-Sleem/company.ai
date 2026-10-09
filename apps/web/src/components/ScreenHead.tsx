/**
 * The screen head — the demo's `head(title, desc, action, label, glyph)`.
 *
 * Every screen in the demo opens the same way: an eyebrow naming the view and the word Overview, a
 * title, one line of description, and optionally a primary action on the end side. Keeping it in one
 * component means the screens cannot drift apart as they are built (Team and Inbox adopt it next).
 *
 * The title carries `id="page-title"` and is focusable-but-not-tabbable, which is how the demo moves
 * focus when someone changes screens — a screen-reader user hears where they have arrived.
 */
import type { ReactNode } from 'react';

export function ScreenHead({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <header className="pagehead">
      {/* The owner (fifth round) handed the visible space back to the page: the words live on
          for screen readers and the focus ritual, while the topbar now carries the name. */}
      <div className="visually-hidden">
        <div className="eyebrow">{eyebrow}</div>
        <h1 id="page-title" tabIndex={-1}>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action ? <div className="row pagehead-action">{action}</div> : null}
    </header>
  );
}
