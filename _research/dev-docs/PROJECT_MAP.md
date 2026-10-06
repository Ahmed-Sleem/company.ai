# Project map

Human-readable map of the repository. Keep this honest: if a path here does not exist, fix this file.

```
company.ai/
├── README.md                        entry point: what this is, how to run it, and the repo layout
├── LICENSE
├── THIRD_PARTY.md                   the licence ledger (policy, tools, planned deps, forbidden list)
├── package.json / tsconfig.json / vitest.config.ts / .oxlintrc.json
│
├── packages/                        shared code, imported by name (@company/…)
│   ├── tokens/                      the design system as code: generator + generated CSS/TS
│   ├── contracts/                   shapes and vocabularies shared by every layer (ids: UUIDs)
│   ├── company/                     schema, database client, the rules (repo), the demo seed
│   └── gateway/                     the model-gateway client: adapters, registry, budget guard
├── services/                        the runnable servers
│   ├── api/                         the HTTP surface the GUI talks to (Hono)
│   └── orchestrator/                P1+ — agent runs against the gateway
├── apps/web/                        the GUI (Vite + React): shell, seven views, components
│   │   src/world/                   the studio plan: generated layout data, pure camera maths, art
│   │   src/lib/                     prefs (the owner's two switches), accent maths, the 31 icons
│   │   e2e/smoke.mjs                the browser check the gate runs (58 checks, real API)
│   └── e2e/demo.mjs                 drives the standalone demo file off disk (7 checks)
├── demo/
│   └── company-os-demo.html         GENERATED: the real GUI + its data + its API in one file
├── scripts/
│   ├── verify.sh                    THE GATE — ten steps, run before every commit
│   ├── gen-owner-data.mjs           reads the owner's demo → the icons and the plan (-—check = drift)
│   ├── build-demo-html.mjs          freezes the built app into demo/company-os-demo.html
│   └── checks/                      the repository checks + _observe-failure.sh
├── docker/                          compose + env template (deploy-ready, not deployed)
│
├── design/                          the product-facing visual layer (NOT removable)
│   ├── README.md                    contents + merge protocol + state of the design
│   ├── designer-demo/
│   │   ├── ai-company-os.html       the designer's demo — the visual reference (never edited)
│   │   ├── SOURCE.md                provenance + blob sha + how to re-verify
│   │   └── install.sh               offline verify / --force re-download helper
│   ├── owner-demo/
│   │   ├── acme-studio-os.html      the OWNER's demo — borrow source (never edited)
│   │   └── SOURCE.md                provenance, blob sha, and the unresolved art licence
│   ├── tokens/
│   │   ├── company-os-pixel.css     THE DESIGN SYSTEM — tokens, themes, pixel skin (documented)
│   │   ├── company-os-pixel.json    same values, machine-readable (for the token pipeline)
│   │   └── company-os-palettes.json the five colour palettes, borrowed from the owner's demo
│   ├── prototype/
│   │   ├── company-os.html          the demo + documented patches + the network view  ← the prototype
│   │   ├── graph.js                 network view: layout, render, interaction, persistence
│   │   ├── graph.css                network view styling (tokens only, RTL-safe)
│   │   ├── prototype-changes.css    the small changes vs the demo (E-numbers, one rule each)
│   │   ├── build-prototype.py       regenerates company-os.html from the demo (repeatable, auditable)
│   │   ├── verify.mjs               the gate: 8 checks; prints what it did not verify
│   │   └── README.md                what changed, why, and how to verify
│   └── archive/
│       └── gui-scaffold.html        the first scaffold, reference only (superseded)
│
└── _research/                       REMOVABLE BEFORE DEPLOYMENT (research + rules + dev docs)
    ├── README.md                    index of the research
    ├── 00…18*.md                    feasibility → competitors → GUI → reuse → features → build strategy
    │                                → Obsidian study → harvest plan → demo review (17) → changes (18)
    ├── designer-brief.md            the hand-off brief given to the designer
    ├── harvest/clone-all.sh         clones every reusable repo outside this repo
    ├── data/                        GitHub API snapshot + competitors CSV (evidence)
    ├── rules/                       THE FOUR RULE DOCUMENTS (single home) + how they combine here
    └── dev-docs/                    this documentation set (index in README.md)
        └── OWNER_DEMO_READING.md    what the owner's demo adds, the borrow list, and its liabilities
```

## Integration points (when the product is built)

| From | To | Contract |
|---|---|---|
| Product theme | `design/tokens/company-os-pixel.json` | generate CSS variables; no component may hard-code a value |
| Product canvas (P3) | `design/tokens/*` + `_research/14` | React Flow; force layout in a worker; same modes/filters/legend as the prototype |
| Product data model | `_research/15-code-harvest-plan.md` | `packages/contracts`; the demo's objects map 1:1 (agents, tasks, decisions, threads) |
| Rule enforcement | `scripts/verify.sh` (exists) | types, tokens-in-sync, lint, tests, repo checks, build, browser smoke, design gate — contract §16 |
| GUI → API | `apps/web` → `services/api` | one origin in deployment; the dev server proxies `/api`, so the browser never needs a second port |
