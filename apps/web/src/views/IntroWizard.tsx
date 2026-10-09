/**
 * The intro wizard (REQ-14/15) — the door into a company of the visitor's own.
 *
 * Three steps: the company (name, description, and the owner's own answers to the questions
 * the team reads), the employees (typed in, exactly like the Team editor does it — name, role,
 * details, a pixel portrait, a place in the hierarchy), and the options (theme, screen effect).
 *
 * The draft lives in the save on every keystroke, so closing the tab loses nothing: the landing
 * page's start button becomes "continue where I left off". Everything collected here stays
 * editable later — the company profile in Settings, the people in Team.
 */
import { useState } from 'react';
import { useStore, type DraftEmployee, type IntroDraft } from '../data/store';
import { t, type Lang } from '../lib/i18n';
import { PORTRAITS } from '../lib/avatars.data';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { saveAttr, FX } from '../lib/prefs';
import { applyTheme, type Theme } from '../lib/theme';

const blankDraft = (): IntroDraft => ({
  mode: 'fresh',
  step: 0,
  operatorName: '',
  company: { name: '', description: '', answers: [] },
  employees: [],
  options: { theme: 'dark', fx: true },
});

/** The two questions every company answers; the owner's own rows come after them. */
const FIXED_QS = ['companyQ1', 'companyQ2'] as const;

export function IntroWizard({ lang, onLanguage }: { lang: Lang; onLanguage: () => void }) {
  const stored = useStore((s) => s.introDraft);
  const setIntroDraft = useStore((s) => s.setIntroDraft);
  const finishIntro = useStore((s) => s.finishIntro);

  const [draft, setDraft] = useState<IntroDraft>(stored ?? blankDraft);
  const [error, setError] = useState<string | null>(null);
  /** The add-employee form's own fields. */
  const [form, setForm] = useState({ name: '', nameAr: '', role: '', roleAr: '', focus: '', avatar: 0, managerId: '' });

  const update = (patch: Partial<IntroDraft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    setIntroDraft(next); // every change lands in the save — the wizard is resumable (REQ-15)
  };

  const goto = (step: number) => {
    setError(null);
    update({ step });
  };

  /** The fixed questions always occupy answers[0..1]; the owner's rows follow. */
  const setAnswer = (index: number, a: string) => {
    const answers = [...draft.company.answers];
    const fixed = FIXED_QS[index];
    const q = fixed ? t(fixed, lang) : (answers[index]?.q ?? '');
    answers[index] = { q, a };
    update({ company: { ...draft.company, answers } });
  };

  const addAnswerRow = () => {
    const answers = [...draft.company.answers];
    while (answers.length < FIXED_QS.length) {
      const key = FIXED_QS[answers.length];
      answers.push({ q: key ? t(key, lang) : '', a: '' });
    }
    answers.push({ q: '', a: '' });
    update({ company: { ...draft.company, answers } });
  };

  const removeAnswerRow = (index: number) => {
    if (index < FIXED_QS.length) return;
    update({ company: { ...draft.company, answers: draft.company.answers.filter((_, i) => i !== index) } });
  };

  const next = () => {
    if (draft.step === 0 && draft.company.name.trim() === '') {
      setError(t('errCompany', lang));
      return;
    }
    goto(Math.min(2, draft.step + 1));
  };

  const addEmployee = () => {
    if (form.name.trim() === '') { setError(t('teamErrName', lang)); return; }
    if (form.role.trim() === '') { setError(t('teamErrRole', lang)); return; }
    setError(null);
    // Draft ids number from the draft's own rows — no clock, no dice (namespace lock).
    const max = draft.employees.reduce((m, e) => {
      const n = e.id.startsWith('d-') ? Number(e.id.slice(2)) : 0;
      return Number.isFinite(n) && n > m ? n : m;
    }, 0);
    const employee: DraftEmployee = {
      id: `d-${max + 1}`,
      name: form.name.trim(),
      nameAr: form.nameAr.trim() === '' ? null : form.nameAr.trim(),
      role: form.role.trim(),
      roleAr: form.roleAr.trim() === '' ? null : form.roleAr.trim(),
      focus: form.focus.trim() === '' ? null : form.focus.trim(),
      avatar: form.avatar,
      managerId: form.managerId === '' ? null : form.managerId,
    };
    update({ employees: [...draft.employees, employee] });
    setForm({ name: '', nameAr: '', role: '', roleAr: '', focus: '', avatar: 0, managerId: '' });
  };

  const removeEmployee = (id: string) =>
    update({
      employees: draft.employees
        .filter((e) => e.id !== id)
        .map((e) => (e.managerId === id ? { ...e, managerId: null } : e)),
    });

  const finish = () => {
    // The options apply the moment the wizard closes, through the same helpers Settings uses.
    applyTheme(draft.options.theme as Theme);
    saveAttr(FX, draft.options.fx);
    finishIntro();
  };

  const employeeName = (id: string | null) =>
    id === null ? t('teamManagerYou', lang) : draft.employees.find((e) => e.id === id)?.name ?? '';

  const steps = [t('stepCompany', lang), t('stepEmployees', lang), t('stepOptions', lang)];

  return (
    <div className="intro">
      <header className="intro-top">
        <div className="brand">
          <span className="brandmark" aria-hidden="true">[a]</span>
          <span>{t('brand', lang)}<small>{t('brandSub', lang)}</small></span>
        </div>
        <button type="button" className="btn ghost" data-intro="language"
          aria-label={lang === 'en' ? 'العربية' : 'English'} onClick={onLanguage}>
          {lang === 'en' ? 'ع' : 'EN'}
        </button>
      </header>

      <main className="intro-main panel">
        <p className="eyebrow">{t('wizardTitle', lang)}</p>
        <h1 id="page-title" tabIndex={-1}>{steps[draft.step]}</h1>
        <p className="small dim">{t('wizardNote', lang)}</p>

        <nav className="intro-steps" aria-label={t('wizardTitle', lang)}>
          {steps.map((label, i) => (
            <button type="button" key={label} className="intro-step" data-intro={`step-${i}`}
              aria-current={i === draft.step ? 'step' : undefined}
              disabled={i > draft.step} onClick={() => goto(i)}>
              <span className="intro-step-num" aria-hidden="true">{i + 1}</span>
              {label}
            </button>
          ))}
          <span className="small dim intro-step-count">
            {t('stepOf', lang).replace('{n}', String(draft.step + 1)).replace('{m}', '3')}
          </span>
        </nav>

        {error ? <p className="field-error" data-intro="error" role="alert">{error}</p> : null}

        {draft.step === 0 ? (
          <div className="team-form">
            <label className="field">{t('yourNameLabel', lang)}
              <input value={draft.operatorName} data-intro="your-name"
                placeholder={t('yourNameHint', lang)}
                onChange={(e) => update({ operatorName: e.target.value })} />
            </label>
            <label className="field">{t('companyNameLabel', lang)}
              <input value={draft.company.name} data-intro="company-name"
                onChange={(e) => update({ company: { ...draft.company, name: e.target.value } })} />
            </label>
            <label className="field">{t('companyDescLabel', lang)}
              <textarea rows={2} value={draft.company.description} data-intro="company-desc"
                onChange={(e) => update({ company: { ...draft.company, description: e.target.value } })} />
            </label>
            {FIXED_QS.map((key, i) => (
              <label className="field" key={key}>{t(key, lang)}
                <textarea rows={2} value={draft.company.answers[i]?.a ?? ''} data-intro={`answer-${i}`}
                  onChange={(e) => setAnswer(i, e.target.value)} />
              </label>
            ))}
            <div className="field">
              <span>{t('customAnswersTitle', lang)}</span>
              {draft.company.answers.slice(FIXED_QS.length).map((row, offset) => {
                const i = FIXED_QS.length + offset;
                return (
                  <div className="answer-row" key={i}>
                    <label className="field">
                      <span className="sr-only">{t('questionLabel', lang)}</span>
                      <input value={row.q} placeholder={t('questionLabel', lang)}
                        onChange={(e) => update({
                          company: {
                            ...draft.company,
                            answers: draft.company.answers.map((r, j) => (j === i ? { ...r, q: e.target.value } : r)),
                          },
                        })} />
                    </label>
                    <label className="field grow">
                      <span className="sr-only">{t('answerLabel', lang)}</span>
                      <input value={row.a} placeholder={t('answerLabel', lang)}
                        onChange={(e) => setAnswer(i, e.target.value)} />
                    </label>
                    <button type="button" className="btn small ghost" data-intro={`remove-answer-${i}`}
                      aria-label={t('removeRow', lang)} onClick={() => removeAnswerRow(i)}>
                      <Icon name="close" />
                    </button>
                  </div>
                );
              })}
              <button type="button" className="btn small" data-intro="add-answer" onClick={addAnswerRow}>
                <Icon name="plus" />{t('addAnswer', lang)}
              </button>
            </div>
          </div>
        ) : null}

        {draft.step === 1 ? (
          <div className="team-form">
            <p className="small dim">{t('wizardEmployeesHint', lang)}</p>
            {draft.employees.length === 0 ? <p className="small dim" data-intro="no-employees">{t('wizardNoEmployees', lang)}</p> : (
              <ul className="draft-employees">
                {draft.employees.map((e) => (
                  <li className="draft-employee" key={e.id}>
                    <Avatar index={e.avatar} size="sm" />
                    <span className="grow">
                      <strong>{e.name}</strong>
                      <span className="small dim" style={{ display: 'block' }}>{e.role} · {employeeName(e.managerId)}</span>
                    </span>
                    <button type="button" className="btn small ghost" data-intro={`remove-employee-${e.id}`}
                      aria-label={`${t('removeRow', lang)} ${e.name}`} onClick={() => removeEmployee(e.id)}>
                      <Icon name="close" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="panel panel-pad draft-form">
              <p className="sectionhead-mini">{t('wizardAddEmployee', lang)}</p>
              <div className="answer-row">
                <label className="field grow">{t('teamNameLabel', lang)}
                  <input value={form.name} data-intro="employee-name"
                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </label>
                <label className="field grow">{t('teamRoleLabel', lang)}
                  <input value={form.role} data-intro="employee-role"
                    onChange={(e) => setForm({ ...form, role: e.target.value })} />
                </label>
              </div>
              <div className="answer-row">
                <label className="field grow">{t('teamNameArLabel', lang)}
                  <input value={form.nameAr} dir="rtl" onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
                </label>
                <label className="field grow">{t('teamRoleArLabel', lang)}
                  <input value={form.roleAr} dir="rtl" onChange={(e) => setForm({ ...form, roleAr: e.target.value })} />
                </label>
              </div>
              <label className="field">{t('teamDetailsLabel', lang)}
                <textarea rows={2} value={form.focus} onChange={(e) => setForm({ ...form, focus: e.target.value })} />
              </label>
              <div className="field">
                <span>{t('teamPortraitLabel', lang)}</span>
                <div className="portrait-grid" role="group" aria-label={t('teamPortraitLabel', lang)}>
                  {PORTRAITS.map((_, i) => (
                    <button type="button" key={i} data-portrait={i} aria-pressed={i === form.avatar}
                      aria-label={`${t('teamPortraitLabel', lang)} ${i + 1}`}
                      onClick={() => setForm({ ...form, avatar: i })}>
                      <Avatar index={i} size="sm" />
                    </button>
                  ))}
                </div>
              </div>
              <label className="field">{t('teamManagerLabel', lang)}
                <select value={form.managerId} data-intro="employee-manager"
                  onChange={(e) => setForm({ ...form, managerId: e.target.value })}>
                  <option value="">{t('teamManagerYou', lang)}</option>
                  {draft.employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </label>
              <button type="button" className="btn" data-intro="add-employee" onClick={addEmployee}>
                <Icon name="plus" />{t('wizardAddEmployee', lang)}
              </button>
            </div>
          </div>
        ) : null}

        {draft.step === 2 ? (
          <div className="team-form">
            <label className="field">{t('theme', lang)}
              <select value={draft.options.theme} data-intro="theme"
                onChange={(e) => update({ options: { ...draft.options, theme: e.target.value } })}>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="system">System</option>
              </select>
            </label>
            <label className="setting">
              <input type="checkbox" data-intro="fx" checked={draft.options.fx}
                onChange={(e) => update({ options: { ...draft.options, fx: e.target.checked } })} />
              <span>
                {t('screenEffect', lang)}
                <small>{t('screenEffectNote', lang)}</small>
              </span>
            </label>
            <p className="small dim">{t('wizardOptionsNote', lang)}</p>
          </div>
        ) : null}

        <footer className="intro-nav">
          <button type="button" className="btn" data-intro="back" disabled={draft.step === 0}
            onClick={() => goto(draft.step - 1)}>
            {t('wizardBack', lang)}
          </button>
          <span className="grow" />
          {draft.step < 2 ? (
            <button type="button" className="btn primary" data-intro="next" onClick={next}>
              {t('wizardNext', lang)}<Icon name="arrow" />
            </button>
          ) : (
            <button type="button" className="btn primary" data-intro="finish" onClick={finish}>
              <Icon name="check" />{t('wizardFinish', lang)}
            </button>
          )}
        </footer>
      </main>
    </div>
  );
}
