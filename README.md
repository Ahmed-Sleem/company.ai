# company.ai — an agent company you can see and run

One application that holds **an organisation of AI employees and humans**: a task board + decision
inbox, the company's reporting structure, conversations (with a visible model selector and voice
notes), and a visual network of the company — all in one GUI, in the designer's locked pixel style,
bilingual (English LTR / Arabic RTL).

**Status: P0 built, plus the owner's own additions** — the World Map (their studio floor, ported from
their demo and drift-checked against it), the five palettes, a custom accent that keeps its contrast,
the screen effect and the collapsed sidebar (both in Settings, both on by default), and build mode
inside the world. The designer's prototype with the network view is still in the repo and still
verified. Everything is checked by one command (`bash scripts/verify.sh`).

**Verified 2026-10-06 (the gate, green, ten steps):** type-check · generated files in sync (design
tokens, and the icons + floor plan generated from the owner's demo) · lint (0 errors) · **83**
database/API/gateway/contract tests · **86** GUI tests · repository checks · production build · the
standalone demo file matches that build · the designer's **11** checks · **58** browser checks against
the real API. The demo file has **10** checks of its own.

**Never opened this project before?** Start with *Try it without installing anything* below.

## Try it without installing anything

`demo/company-os-demo.html` is the whole product in **one file**: the real GUI, its data and its API
frozen inside it. Download it (on GitHub: open the file, then *Download raw file*) and open it in a
browser. No server, no install, no network — every screen works, and creating or moving a task works
too (the changes last until you reload).

## Run it — the full product, on your machine

Needs **Node 20 or newer** ([nodejs.org](https://nodejs.org) — the LTS button) and **Git**
([git-scm.com](https://git-scm.com/downloads)). Nothing else: the database is a local file, and model
calls go to an offline mock, so there are **no keys and no spend**.

```bash
# once — get the code and install everything
git clone https://github.com/Ahmed-Sleem/company.ai.git
cd company.ai
npm install

# terminal 1 — the API (http://127.0.0.1:8787). Leave it running.
npx tsx services/api/src/server.ts

# terminal 2 — the app (http://127.0.0.1:5173). Open this one.
npm run dev -w @company/web
```

Open **http://127.0.0.1:5173** — that is the product. `Ctrl-C` in each terminal stops them. The
database is seeded on first start and kept in `.data/`; delete that folder to start fresh.

*(No Git? On the repository page use **Code → Download ZIP**, unzip it, open a terminal in that
folder, and run the same `npm install` and the two commands above.)*

```bash
# once, only if you want the browser check inside the gate (skip it and that step says so)
npx playwright install chromium
sudo npx playwright install-deps chromium   # Linux only — the system libraries Chromium needs
```

## Check it

```bash
bash scripts/verify.sh          # the gate: everything above, in order, with a summary
```

Want the demo file rebuilt from your own working copy? `node scripts/build-demo-html.mjs` writes it
back into `demo/` using whatever you have just built.

Every check can fail on purpose (that is how they were built): `bash scripts/checks/_observe-failure.sh`
plants a violation for each repository check and confirms it fails.

## The GUI

Real captures of the prototype (`design/prototype/company-os.html`) — not mockups. Dark and light,
English and Arabic, desktop and mobile. Re-capture with `node design/screenshots/shots.mjs`.

| | |
|---|---|
| ![Team](design/screenshots/01-team-light-en.png) | ![Network — force](design/screenshots/05-network-force-light-en.png) |
| **Team** — the roster, budgets and live status | **Network** — the whole company in one view |
| ![Tasks](design/screenshots/02-tasks-light-en.png) | ![Inbox](design/screenshots/03-inbox-light-en.png) |
| **Tasks** — four stages, AI facts on the card | **Inbox** — decisions with cost and cost of delay |
| ![Conversations](design/screenshots/04-conversations-light-en.png) | ![Settings](design/screenshots/07-settings-light-en.png) |
| **Conversations** — one thread, any model | **Settings** — appearance, palettes, language, states |

| Dark | Arabic (RTL) |
|---|---|
| ![Team — dark](design/screenshots/08-team-dark-en.png) | ![Team — Arabic](design/screenshots/11-team-light-ar.png) |
| ![Network — rings](design/screenshots/06-network-rings-light-en.png) | ![Network — Arabic](design/screenshots/09-network-force-dark-ar.png) |
| ![Tasks — dark, Arabic](design/screenshots/10-tasks-dark-ar.png) | ![Network — mobile, Arabic](design/screenshots/12-network-mobile-ar.png) |

## The repository

```
company.ai/
├── README.md      ← you are here
├── LICENSE
├── THIRD_PARTY.md  every dependency and its licence, plus the blocked list
├── apps/web/       the GUI (Vite + React): the shell, seven views, the world, the tests
├── packages/       shared code: tokens · contracts · company (schema, rules, seed) · gateway
├── services/api/   the HTTP surface the GUI talks to
├── scripts/        verify.sh (the gate) · the drift checks · the demo-file builder
├── demo/           company-os-demo.html — the whole product in one file (generated)
├── design/         the product-facing visuals — NOT removable
└── _research/      everything development-only — ONE folder, removable before deployment
```

`_research/dev-docs/PROJECT_MAP.md` is the annotated version of this tree; it is kept honest.

### `design/` — the visual layer (survives deployment)

| Path | What it is |
|---|---|
| `designer-demo/ai-company-os.html` | **The designer's demo** — the visual reference, byte-verified, never edited |
| `tokens/company-os-pixel.css` `.json` | **The design system** — every colour, size, radius, shadow, duration, in one place |
| `prototype/company-os.html` | **The prototype** — the demo + the change request + the working network view (open this one) |
| `prototype/graph.js` `.css`, `prototype-changes.css`, `build-prototype.py`, `verify.mjs` | The network view, the changes, the rebuild script, the verification gate |
| `archive/gui-scaffold.html` | The first scaffold, kept for reference only (superseded) |

Everything the product draws must come from `tokens/company-os-pixel.*`. That is what keeps every
screen, and everything added later, consistent with the demo.

### `_research/` — development-only (delete before deployment)

| Path | What it is |
|---|---|
| `rules/` | **The four mandatory rule documents**, in one place, plus how they combine with the pixel style |
| `dev-docs/` | Plan, project map, append-only done log, supporting notes |
| `17`–`23`*.md | The demo review, what was built, **the plan**, the model/agent research, the decision log, the deep harvest scan, and the publish guide |
| `00`…`16`*.md, `designer-brief.md` | The research and the designer brief |
| `data/`, `harvest/` | Evidence snapshots and the reuse-cloning script |

Deleting `_research/` must never break the product: nothing outside it depends on anything inside it.

## Rules live in `_research/rules/`

`GENERAL_GUI_AGENT_RULES.md` · `UI Governance Contract.txt` · `DESIGN_SYSTEM.md` ·
`DEVELOPMENT_REQUIREMENTS.md` — read `_research/rules/README.md` first: it records how the mandatory
contract is applied together with the locked pixel style (which values deviate, and why).

## Licensing note

Reuse boundaries and licence traps: `_research/09-reuse-and-licensing-map.md` and
`_research/15-code-harvest-plan.md`. The demo's embedded font is Pixelify Sans (SIL OFL 1.1).
