/**
 * A tiny, safe markdown reader (REQ-54, Phase J): the mail body is plain markdown —
 * `#` headings, `-` lists, **bold**, *italic*, `code` — and it renders as React nodes,
 * never as injected HTML. It supports exactly what the tool contract teaches the models;
 * anything else arrives as honest text.
 */
import type { ReactNode } from 'react';

function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).filter((part) => part !== '');
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = (key: string) => {
    if (list.length === 0) return;
    const items = list;
    list = [];
    blocks.push(<ul key={key}>{items.map((item, i) => <li key={i}>{inline(item)}</li>)}</ul>);
  };
  text.split('\n').forEach((line, i) => {
    const item = /^[-*] (.+)$/.exec(line.trim());
    if (item) {
      list.push(item[1]!);
      return;
    }
    flush(`ul-${i}`);
    const heading = /^(#{1,3}) (.+)$/.exec(line.trim());
    if (heading) {
      blocks.push(<h4 key={i}>{inline(heading[2]!)}</h4>);
      return;
    }
    if (line.trim() !== '') blocks.push(<p key={i}>{inline(line.trim())}</p>);
  });
  flush('ul-end');
  return <div className={className ?? 'markdown'}>{blocks}</div>;
}
