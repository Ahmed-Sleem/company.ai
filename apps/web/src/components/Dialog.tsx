/**
 * One dialog for the product (the governance contract's deviation note: native <dialog>).
 * Native gives focus handling, Escape, the top layer and a backdrop without re-implementing
 * any of it. What a dialog contains is the caller's business.
 */
import { useEffect, useRef } from 'react';
import { Icon } from './Icon';

export function Dialog({
  open, onClose, title, eyebrow, children, actions, lang,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** The small line above the title (the demo's `openDialog(..., eyebrow)`), e.g. "Tasks". */
  eyebrow?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  lang: 'en' | 'ar';
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      // Browsers get the real modal (focus trap, top layer, Escape) from the native element.
      // Test environments do not implement showModal, so fall back to the open attribute —
      // the same markup, and the tests exercise the same content either way.
      if (typeof dialog.showModal === 'function') {
        try {
          dialog.showModal();
          return;
        } catch {
          /* fall through to the attribute */
        }
      }
      dialog.setAttribute('open', '');
    }
    if (!open && dialog.open) {
      // Same split as opening: real browsers close the native element, and an environment without
      // the method gets the attribute removed (which is what `open` reflects).
      if (typeof dialog.close === 'function') {
        try {
          dialog.close();
          return;
        } catch {
          /* fall through to the attribute */
        }
      }
      dialog.removeAttribute('open');
    }
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="dialog"
      lang={lang}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClose={onClose}
      aria-label={title}
    >
      <header className="dialog-head">
        <div>
          {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
          <h2>{title}</h2>
        </div>
        <button type="button" className="btn ghost iconbtn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
      </header>
      <div className="dialog-body">{children}</div>
      {actions ? <footer className="dialog-actions">{actions}</footer> : null}
    </dialog>
  );
}
