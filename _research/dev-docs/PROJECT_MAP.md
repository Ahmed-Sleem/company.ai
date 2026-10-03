# Project map

Human-readable map of the repository. Keep this honest: if a path here does not exist, fix this file.

```
company.ai/                          (root holds nothing else)
├── README.md                        entry point: what this is, and the repo layout
├── LICENSE
│
├── design/                          the product-facing visual layer (NOT removable)
│   ├── README.md                    contents + merge protocol + state of the design
│   ├── designer-demo/
│   │   ├── ai-company-os.html       the designer's demo — the visual reference (never edited)
│   │   ├── SOURCE.md                provenance + blob sha + how to re-verify
│   │   └── install.sh               offline verify / --force re-download helper
│   ├── tokens/
│   │   ├── company-os-pixel.css     THE DESIGN SYSTEM — tokens, themes, pixel skin (documented)
│   │   └── company-os-pixel.json    same values, machine-readable (for the token pipeline)
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
```

## Integration points (when the product is built)

| From | To | Contract |
|---|---|---|
| Product theme | `design/tokens/company-os-pixel.json` | generate CSS variables; no component may hard-code a value |
| Product canvas (P3) | `design/tokens/*` + `_research/14` | React Flow; force layout in a worker; same modes/filters/legend as the prototype |
| Product data model | `_research/15-code-harvest-plan.md` | `packages/contracts`; the demo's objects map 1:1 (agents, tasks, decisions, threads) |
| Rule enforcement | `scripts/verify.sh` (to be created) | token check, lint, types, tests, build — contract §16 |
