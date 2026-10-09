# DELETE AFTER: the 2026-10-09 owner comments are all ticked or tracked in OWNER_COMMENTS.md, the gate is green, and the push is verified live.

Session checklist — owner comments of 2026-10-09, atomic. Tick only with command/screenshot proof.

Shell
- [x] C1 footer fixed (100dvh app column; statusbar never scrolls away) — proof: scroll a long page, screenshot
- [x] C2 topbar fixed — same proof
- [x] C3 statusbar dynamic: people · open tasks · waiting decisions · last-saved time, live from the store — proof: mutate a task, watch it change
- [x] C4 the V/owner sidebar item removed; Settings still reachable via nav — proof: screenshot + no test references it
- [x] C5 motion centralised: --anim tokens + keyframes in ONE section, reused by drawer, dialogs, views, hover; prefers-reduced-motion respected — proof: grep shows single definition site
- [x] C6 search dialog opens with animation — proof: screenshot/video frame + CSS present
- [x] C7 inputs on focus: colour change, no outline ring (buttons keep their ring for a11y) — proof: focused screenshot
Views
- [x] C8 team: living roster — portrait, role, dept, status, manager, current tasks from the save, capabilities; header stats; profile dialog
- [ ] C9 inbox: one decision at a time as a slide, approve/reject, slide to next, history below; empty state
- [ ] C10 comms: messenger — team contacts rail (+threads), chat pane, composer that really writes to the save, new-conversation dialog
- [ ] C11 network: the prototype's force graph ported into the app (same behaviour: drag pan, wheel zoom, hover labels), data from the save
- [ ] C12 settings: prototype's layout — theme samples, palette grid + custom accent, language select, company profile form writing to the save, session export/import/reset, the two toggles, shortcuts aside
- [ ] C13 world fits the viewport, no page scroll — proof: phone + desktop screenshots, scrollHeight check
- [ ] C14 hint line removed — proof: grep + screenshot
- [ ] C15 world build/place re-read against the prototype's world.js; gaps fixed or tracked
- [ ] C16 zoom still smooth (K2) — proof: smoke's zoom checks pass
Guard rails
- [ ] gate 10/10 after every chunk; final whole-work review (screens of all 7 views, desktop + phone)
- [ ] nothing on the keep-list regressed (K1–K6): smoke's world/zoom/fx/rail checks + visual compare
- [ ] OWNER_COMMENTS.md statuses updated with evidence; thinking file deleted after comparison
