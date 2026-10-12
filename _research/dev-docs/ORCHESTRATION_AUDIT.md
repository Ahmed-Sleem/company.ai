# Round 18 — Audit: the honest state of the build, part by part

Companion to ORCHESTRATION_UNDERSTANDING.md. Verdicts come from code read this round and from
the gate that ran after the round-18 quick-fix pass: typecheck clean · 168 web unit tests +
90 root tests green · oxlint exit 0 · smoke 122/122 · verify gate 11/11 GREEN.

## A. The realness audit (brief §15 — "no mocks anywhere")

| Place | Before this round | Now | Verified by |
| --- | --- | --- | --- |
| `store.ts pumpThread` | scripted `localVoice` reply fired for ANYONE without a key — the "model answered with no API key" bug the owner caught | real call when wired; scripted voice ONLY in labelled demoMode; otherwise the honest "not connected" line | `messenger.test.tsx` "never invents a reply…" (diary row count unchanged) |
| typing indicator | none | `typing: string[]` set around the real `chatCompletion`; CommsView shows telegram-style dots (`data-comms="typing"`) | `messenger.test.tsx` typing test with a leashed fetch |
| `engine.ts` work loop | `localHeartbeat` faked progress for unwired agents | gated `state.demoMode ? … : null`; done-tasks fire a desktop notification | engine tests still green; code read |
| diary | already real-only | unchanged + asserted | both R18 tests read `callsFor()` back from Dexie |
| statusbar | `${company} · Live` | company name only — the word is gone | smoke check "never claims the word live" |

## B. The quick-fix audit (owner's list, all shipped this round)

1. **Wizard columns** — step 2 is now `.draft-cols`: list column (`.draft-listcol`, own max
   height + scroll) and the form (`.draft-form`, sticky) never move each other; stacks under
   800px. Smoke: `.draft-cols` exists in step 2.
2. **API in the wizard** — provider select / model / key fields + Test button
   (`data-intro=test-connection`, reuses `testConnection` from `lib/providers.ts`, disabled
   until model+key). `DraftEmployee.model` carries through `finishIntro` AND `reopenIntro`.
   Smoke: fields + disabled/enabled arm checked.
3. **No FX in step 3** — checkbox removed; effects live in Settings, on by default
   (`finish()` still saves `options.fx: true`). Smoke: no checkbox in `.intro-main`.
4. **"Task added." text** — gone; replaced by the notification system (`lib/notify.ts`:
   Chrome-style permission ask, Settings toggle `data-settings=notify`, re-ask button
   `data-settings=notify-ask`, 4-way permission status). Tasks, replies, finished tasks and
   mail all notify. Tests assert `notify()` calls, not inline notes.
5. **Decision notes** — optional textarea above approve/reject (`data-mail-note`);
   `api.decide(id, verdict, note)` stores `ownerNote` on the decision AND posts
   "Approved/Rejected — {note}" into that employee's thread so the model sees the reason.
6. **Network first paint** — `setTimeout(fit, 900)` replaced: 240 synchronous `layoutStep`
   warm-up iterations, then one `fit()` at alpha floor. No visible readjust.
7. **World walker** — the seated avatar is replaced by a dashed outline (`walk-away`) while
   that person walks: one body, never a copy. Inter-employee messages fire a glow dot
   (`.glow-msg`) that travels sender desk → receiver desk.
8. **World Live toggle** — was already `aria-pressed`; smoke now proves one press flips it.
9. **Adaptive** — the 320→2200 no-overflow smoke check still passes with the new layouts.

## C. README / reuse audit (brief §13)

`README.md` "Credits & licences" (L176) already credits Dexie.js (Apache-2.0) and the rest of
the stack. Rules going forward: every borrowed repo lands there with licence; nothing is
rebuilt from scratch when a maintained repo exists. Candidates already researched for the
orchestration phase (see PLAN §Research): `@modelcontextprotocol/sdk` (MIT), isolated-vm
(ISC), PGlite + pgvector (Apache-2.0) or sqlite-vec (MIT/Apache), Transformers.js (Apache-2.0).
No new runtime dependency was added this round — `lib/notify.ts` is 30 lines over the
platform's own `Notification` API, which is the right size for what it does.

## D. Known gaps that remain OPEN (deliberately — they belong to the orchestration phase)

- Root-manager routing of user-assigned tasks + board flag (§6) — not built.
- Merged model-side transcript + history summary window + `search_history` tool (§3/§4) — not built.
- Company workspace folder, file tools, isolated code execution (§7/§9) — needs the desktop
  decision first (owner question pending: Electron vs Tauri).
- World-logic gaps the owner asked to revisit (mandatory rooms, room sizing vs employee
  count): placement is `world/placement.ts` `placeAgents`; sizing policy needs one pass in
  the orchestration plan, not a blind patch.
- Cost/limits settings sections (§10/§11) — not built.

## E. Workspace hygiene (brief §14 "clean workspace")

`uploads/` holds only the brief. No stray downloads in the repo tree; probes are deleted after
use per standing rule. `demo/company-os-demo.html` rebuilt to match the build (verify check 8
enforces this every gate run).
