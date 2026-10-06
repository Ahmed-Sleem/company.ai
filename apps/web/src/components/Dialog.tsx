/**
 * One dialog for the product (the governance contract's deviation note: native <dialog>).
 * Native gives focus handling, Escape, the top layer and a backdrop without re-implementing
 * any of it. What a dialog contains is the caller's business.
 */
import { useEffect, useRef } from 'react';

export function Dialog({
  open, onClose, title, children, actions, lang,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
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
    if (!open && dialog.open) dialog.close();
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
        <h2>{title}</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
      </header>
      <div className="dialog-body">{children}</div>
      {actions ? <footer className="dialog-actions">{actions}</footer> : null}
    </dialog>
  );
}
