# company.ai — an agent company you can see and run

One application that holds **an organisation of AI employees and humans**: a task board + decision
inbox, the company's reporting structure, conversations (with a visible model selector and voice
notes), and a visual network of the company — all in one GUI, in the designer's locked pixel style,
bilingual (English LTR / Arabic RTL).

**Status: pre-build.** Research, the designer's demo, the extracted design system, the rules, and a
working prototype with the network view are in the repo. No product build yet.

## The repository

```
company.ai/
├── README.md      ← you are here
├── LICENSE
├── design/        the product-facing visuals — NOT removable
└── _research/     everything development-only — ONE folder, removable before deployment
```

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
