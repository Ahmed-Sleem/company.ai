# Round 18 — Diff: everything this round adds, changes, creates, deletes

Verified against `git status` after rewinding the stale local index to the pushed round-17
HEAD (`8f0fd6c`): 17 modified files, 3 new files, 0 deletions. Every line below was executed
and gate-checked this round (typecheck · 168+90 tests · oxlint exit 0 · smoke 122/122 ·
verify 11/11 GREEN).

## CREATED

| File | What it is |
| --- | --- |
| `apps/web/src/lib/notify.ts` | The notification system: `notifySupported / notifyPermission / askNotify / notify(title, body, enabled)`. Platform `Notification` API only — the product asks, the browser decides; clicking a notification focuses the window. |
| `_research/dev-docs/ORCHESTRATION_UNDERSTANDING.md` | Staged doc 1: current system vs the brief. |
| `_research/dev-docs/ORCHESTRATION_AUDIT.md` | Staged doc 2: the audit, incl. README/reuse review. |
| `_research/dev-docs/ORCHESTRATION_DIFF.md` | This file — staged doc 3. |
| `_research/dev-docs/ORCHESTRATION_PLAN.md` | Staged doc 4: research cycles + the build plan. |

## CHANGED

| File | Change |
| --- | --- |
| `src/data/store.ts` | Realness core: `typing: string[]` + `notifyOn` + `setNotifyOn` (persisted); `pumpThread` = real call → typing dots → honest failure line; scripted voice ONLY in demoMode; else honest "not connected"; reply notification; diary only for real/demo calls. `DraftEmployee.model`; `finishIntro` + `reopenIntro` carry the connection; `DecisionRow.ownerNote`. |
| `src/lib/engine.ts` | `localHeartbeat` gated behind `demoMode`; finished task → desktop notification. |
| `src/lib/api.ts` | `decide(id, verdict, note?)`: trims the note, stores `ownerNote`, posts "Approved/Rejected — {note}" into the employee's thread so the next model call sees the reason. |
| `src/views/IntroWizard.tsx` | Step 2 = two independent columns (`.draft-cols`): scrolling list, sticky form. Form gains provider/model/key + Test button with live status. Step 3: FX checkbox removed. |
| `src/views/SettingsView.tsx` | Notifications section: toggle, 4-way browser-permission status, re-ask button. |
| `src/views/TasksView.tsx` | "Task added." inline note deleted; `notify()` instead. |
| `src/views/InboxView.tsx` | Optional note textarea above approve/reject (`data-mail-note`) → `api.decide`. |
| `src/views/CommsView.tsx` | Typing dots row (`data-comms="typing"`) while the model thinks. |
| `src/views/WorldView.tsx` | Walker is one body: seated avatar → dashed outline while walking; inter-employee messages fire a glow that travels desk→desk. |
| `src/views/NetworkView.tsx` | Graph settles in 240 synchronous layout steps before first paint; one `fit()`; no 900ms readjust. |
| `src/App.tsx` | Statusbar: the word "Live" is gone — company name only. |
| `src/lib/i18n.ts` | 20 new keys (en+ar): realness lines, notification strings, wizard model label, decision-note label/placeholder. |
| `src/styles/app.css` | `.draft-cols/.draft-listcol/.draft-form`, `.typing-dots` + keyframes, `.glow-msg` + `glowfly`, `.walk-away`; new tokens `--app-dot/--app-draft-h(-phone)`; 800px stack. |
| `test/messenger.test.tsx` | Two R18 tests: no invented reply (diary unchanged) + typing dots over a leashed real fetch, diary gains exactly one row. |
| `test/tasks.test.tsx` | The two note assertions became notification-contract assertions. |
| `e2e/smoke.mjs` | 8 new checks: statusbar no-live, world Live toggle flips, settings notify section + switch, wizard columns/model fields/test-button arming, no FX checkbox. 114 → 122. |
| `demo/company-os-demo.html` | Rebuilt to match the build (verify check 8). |

## DELETED

Nothing. (The FX checkbox and the "Task added." note are removals of UI, kept here as
CHANGED lines; no file was deleted.)

## Not in this diff (open, owned by the orchestration phase)

Root-manager task routing + board flags · merged model transcript + summary window +
`search_history` · workspace folder + file tools + sandboxed code execution · cost/limits
settings · world room-policy pass. All specified in ORCHESTRATION_PLAN.md, waiting on the
owner's desktop-shell decision.
