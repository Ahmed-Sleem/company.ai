/** The panel — the product's one surface. Nothing draws its own border or frame. */
import type { ReactNode } from 'react';

export function Panel({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="panel">
      <header className="sectionhead">
        <div>
          <h2>{title}</h2>
          {note && <p>{note}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}
