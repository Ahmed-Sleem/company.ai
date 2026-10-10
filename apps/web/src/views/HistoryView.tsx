/**
 * Phase M (REQ-57): one employee's model diary, opened in its own tab. The list is
 * windowed — only the rows inside the scroll box (plus a margin) are drawn, so a thousand
 * calls stay instant — and picking a row opens the exact transcript: the system prompt the
 * call carried, the inputs as sent, the tool calls the model made, and its exact words back.
 */
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../data/store';
import { callsFor, type HistoryRow } from '../lib/history';
import { t, type Lang } from '../lib/i18n';
import { localized } from '../lib/format';
import { ScreenHead } from '../components/ScreenHead';
import { Avatar } from '../components/Avatar';

const ROW = 64; // one collapsed call, exactly — the windowing maths leans on it
const MARGIN = 6;

export function HistoryView({ agentId, lang }: { agentId: string; lang: Lang }) {
  const agents = useStore((s) => s.agents);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [picked, setPicked] = useState<HistoryRow | null>(null);
  const [top, setTop] = useState(0);
  const [boxH, setBoxH] = useState(480);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void callsFor(agentId).then((all) => {
      setRows(all);
      setPicked(all[0] ?? null);
    });
  }, [agentId]);

  useEffect(() => {
    const measure = () => setBoxH(boxRef.current?.clientHeight ?? 480);
    measure();
    addEventListener('resize', measure);
    return () => removeEventListener('resize', measure);
  }, []);

  const agent = agents.find((a) => a.id === agentId) ?? null;
  const start = Math.max(0, Math.floor(top / ROW) - MARGIN);
  const end = Math.min(rows.length, Math.ceil((top + boxH) / ROW) + MARGIN);
  const windowed = rows.slice(start, end);

  return (
    <>
      <ScreenHead eyebrow={t('historyViewTitle', lang)}
        title={agent ? localized(agent.name, agent.nameAr, lang) : t('historyViewTitle', lang)}
        subtitle={t('historyNote', lang)} />
      <div className="pagebody">
        <div className="history" data-history-view>
          <div className="h-listbox panel" ref={boxRef} onScroll={(e) => setTop(e.currentTarget.scrollTop)}>
            <div className="h-spacer" style={{ blockSize: rows.length * ROW }}>
              {windowed.map((row, i) => (
                <button type="button" key={row.id}
                  className={`h-row${picked?.id === row.id ? ' active' : ''}`}
                  style={{ transform: `translateY(${(start + i) * ROW}px)` }}
                  onClick={() => setPicked(row)}>
                  <b>{new Date(row.at).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</b>
                  <small>{row.purpose === 'chat' ? t('historyChat', lang) : t('historyCycle', lang)} · {row.model}</small>
                  <small className="dim h-out">{row.output.slice(0, 60)}</small>
                </button>
              ))}
            </div>
            {rows.length === 0 ? <p className="small dim h-none" data-history-none>{t('historyNone', lang)}</p> : null}
          </div>
          <div className="h-detail panel panel-pad">
            {picked ? (
              <>
                <div className="h-meta">
                  {agent ? <Avatar index={agent.avatar} size="sm" /> : null}
                  <strong>{agent ? localized(agent.name, agent.nameAr, lang) : agentId}</strong>
                  <small className="dim">{picked.provider} · {picked.model} · {new Date(picked.at).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB')}</small>
                </div>
                {picked.system ? (<><h3>{t('historySystem', lang)}</h3><pre className="h-pre">{picked.system}</pre></>) : null}
                <h3>{t('historyInput', lang)}</h3><pre className="h-pre">{picked.input}</pre>
                {picked.toolCalls !== '[]' ? (<><h3>{t('historyTools', lang)}</h3><pre className="h-pre">{picked.toolCalls}</pre></>) : null}
                <h3>{t('historyOutput', lang)}</h3><pre className="h-pre">{picked.output}</pre>
              </>
            ) : <p className="small dim">{t('historyNone', lang)}</p>}
          </div>
        </div>
      </div>
    </>
  );
}
