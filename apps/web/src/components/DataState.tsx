/**
 * The four data states, as one component (governance contract §4.10 / §13).
 *
 * Every data-dependent region renders through this. The states are not a designer's sketch:
 * they are reachable in the running app (`?state=` on each view) and asserted by the tests,
 * so "we will add the empty state later" cannot happen silently.
 */
import type { ReactNode } from 'react';
import type { Lang } from '../lib/i18n';
import { t } from '../lib/i18n';

export type DataStateKind = 'loading' | 'empty' | 'error' | 'restricted' | 'default';

interface Props {
  state: DataStateKind;
  lang: Lang;
  onRetry?: () => void;
  children?: ReactNode;
}

export function DataState({ state, lang, onRetry, children }: Props) {
  if (state === 'default') return <>{children}</>;
  if (state === 'loading') {
    return (
      <div className="state" role="status" aria-live="polite">
        <span className="eyebrow">{t('loading', lang)}</span>
        <div className="skeleton" aria-hidden="true"><i /><i /><i /></div>
      </div>
    );
  }
  if (state === 'empty') {
    return (
      <div className="state">
        <h3>{t('emptyTitle', lang)}</h3>
        <p>{t('emptyBody', lang)}</p>
      </div>
    );
  }
  if (state === 'error') {
    return (
      <div className="state" role="alert">
        <h3>{t('errorTitle', lang)}</h3>
        <p>{t('errorBody', lang)}</p>
        {onRetry && <button className="btn" type="button" onClick={onRetry}>{t('retry', lang)}</button>}
      </div>
    );
  }
  return (
    <div className="state">
      <h3>{t('restrictedTitle', lang)}</h3>
      <p>{t('restrictedBody', lang)}</p>
    </div>
  );
}
