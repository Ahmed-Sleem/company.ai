/**
 * A first, honest rendering of the org graph — the network view's P0 preview.
 * It draws the company from the same agent rows the Team view shows; the guaranteed-spacing
 * engine (footprint, packing, hulls) arrives in P3 and replaces only the layout function.
 */
import { t, type Lang } from '../lib/i18n';

interface AgentNode {
  id: string;
  name: string;
  role: string;
  status: string;
  reportsTo?: string | null;
}

export function OrgTree({ agents, lang }: { agents: AgentNode[]; lang: Lang }) {
  const roots = agents.filter((a) => !a.reportsTo);
  const childrenOf = (id: string) => agents.filter((a) => a.reportsTo === id);
  const width = 720;
  const height = 240;
  const boxW = 150;
  const boxH = 54;
  const positions = new Map<string, { x: number; y: number }>();

  const layout = (nodes: AgentNode[], depth: number, startX: number): number => {
    let x = startX;
    for (const node of nodes) {
      const kids = childrenOf(node.id);
      const span = kids.length ? layout(kids, depth + 1, x) : boxW + 16;
      positions.set(node.id, { x: x + span / 2, y: 24 + depth * (boxH + 46) });
      x += span;
    }
    return Math.max(x - startX, boxW + 16);
  };
  layout(roots, 0, 16);

  return (
    <svg className="tree" viewBox={`0 0 ${width} ${height}`} role="img"
         aria-label={`${t('orgChart', lang)}: ${agents.map((a) => `${a.name}, ${a.role}`).join('; ')}`}>
      {agents.flatMap((a) =>
        childrenOf(a.id).map((child) => {
          const from = positions.get(a.id)!;
          const to = positions.get(child.id)!;
          return (
            <path
              key={`${a.id}-${child.id}`}
              d={`M ${from.x} ${from.y + boxH} L ${from.x} ${from.y + boxH + 22} L ${to.x} ${to.y} `}
              fill="none"
              stroke="var(--line)"
              strokeWidth={1}
            />
          );
        }),
      )}
      {agents.map((a) => {
        const p = positions.get(a.id)!;
        return (
          <g key={a.id}>
            <rect x={p.x - boxW / 2} y={p.y} width={boxW} height={boxH}
                  fill="var(--surface)" stroke="var(--line)" />
            <text x={p.x} y={p.y + 22} textAnchor="middle" fill="var(--text)" fontSize={13}
                  fontFamily="var(--font)">
              {a.name}
            </text>
            <text x={p.x} y={p.y + 40} textAnchor="middle" fill="var(--muted)" fontSize={11}
                  fontFamily="var(--font)">
              {a.role}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
