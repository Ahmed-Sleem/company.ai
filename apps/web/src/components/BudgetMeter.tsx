/**
 * Budget meter — money, as the owner's chosen policy sees it (hard caps, C5).
 * The figure is the ledger's own number; the bar is decoration on top of it.
 */
import type { Lang } from '../lib/i18n';
import { t } from '../lib/i18n';
import { money as formatMoney } from '../lib/format';

export function BudgetMeter({
  label,
  spentCents,
  limitCents,
  lang,
}: {
  label: string;
  spentCents: number;
  limitCents: number;
  lang: Lang;
}) {
  const ratio = limitCents > 0 ? Math.min(1, spentCents / limitCents) : 0;
  const over = limitCents > 0 && spentCents >= limitCents;
  return (
    <div>
      <div className="metric-label" id={`${label}-meter-label`}>
        <span>{`${formatMoney(spentCents, lang)} ${t('spendOf', lang)} ${formatMoney(limitCents, lang)}`}</span>
        {over && <span className="tag high">{t('blocked', lang)}</span>}
      </div>
      <div
        className={over ? 'meter over' : 'meter'}
        role="meter"
        aria-labelledby={`${label}-meter-label`}
        aria-valuemin={0}
        aria-valuemax={limitCents}
        aria-valuenow={spentCents}
        aria-valuetext={`${formatMoney(spentCents, lang)} ${t('spendOf', lang)} ${formatMoney(limitCents, lang)}`}
      >
        <span style={{ inlineSize: `${Math.round(ratio * 100)}%` }} />
      </div>
    </div>
  );
}
