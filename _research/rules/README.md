# Rules — the single home

All four rule documents live **here**, in one place, inside the folder that is removed before
deployment (`_research/`). They are no longer duplicated at the repository root: the root holds only
`README.md`, `LICENSE`, `design/` and `_research/`.

| Rule set | File |
|---|---|
| Agent working rules — production-ready GUI standard | `GENERAL_GUI_AGENT_RULES.md` |
| **Enterprise UI Governance Contract** (the enforced contract) | `UI Governance Contract.txt` |
| Design system & engineering style guide | `DESIGN_SYSTEM.md` |
| General development requirements (process, docs, checkpoints) | `DEVELOPMENT_REQUIREMENTS.md` |

Received 2026-10-03 via the repo upload commit `4380202`. Edit a rule only with the user's explicit
approval, and record the change in `../dev-docs/THINGS_DONE.md`.

## Classification

### MANDATORY — never edited without explicit user approval
- **`UI Governance Contract.txt`** — self-declared mandatory and it supersedes ad-hoc values: tokens
  only, the six laws, the component kit, the window system, RTL, motion, accessibility floor, and a
  definition of done. Where it disagrees with `DESIGN_SYSTEM.md`, the contract wins (its own rule).
- All of `GENERAL_GUI_AGENT_RULES.md` — completion gate, verification duties, prohibited shortcuts,
  security, dependency discipline.
- `DEVELOPMENT_REQUIREMENTS.md` — process, required docs, checkpoints.

### ADAPTABLE BY THE PROJECT
- **`DESIGN_SYSTEM.md`** — a style guide: its *structure* (tokens → primitives → layout → theming →
  governance) is mandatory, its *values* (hex colours, radii, the glass/chrome identity) are another
  product's look and conflict with this project's locked pixel style.
  **Resolution rule:** adopt its structure and rules; take visual values from
  `design/tokens/company-os-pixel.*`, which is this project's design source of truth. Conflicts and
  their resolutions are listed in `../dev-docs/SUPPORTING_NOTES.md` §1.

## How the rules apply here (the practical consequences)

1. **Centralized by construction.** One token file (`design/tokens/company-os-pixel.css|json`) is the
   only place a value is defined; one component per concept; one window system; one string table.
   Anything added later — a screen, a panel, a graph node — must read its values from there, so it
   cannot drift from the demo's design.
2. **Rounding:** the contract's radius scale cannot apply — the pixel skin is `--radius: 0px` by
   design. The contract's own §1 clause ("a specific custom geometry must be explicitly justified and
   flagged *do not correct*") is the escape hatch, and we invoke it. Same for the 34px control height
   (`--control`) instead of the contract's 32px compact default: the designer's value wins.
3. **Native `<dialog>`** (banned by `DESIGN_SYSTEM.md` §1.5 item 4, an in-house preference) is kept:
   the designer's demo uses `showModal()` deliberately, and `GENERAL_GUI_AGENT_RULES.md` §11.2
   requires exactly the focus containment, inert background and focus return it provides.
   Documented deviation.
4. **Everything else applies unchanged:** tokens-only CSS, no raw values, four data states, RTL with
   logical properties, ≥24px targets (48px on coarse pointers), motion tokens with reduced-motion, the
   accessibility floor, wording rules (no "coming soon", no internal identifiers), and the
   verification duties — including "test each new check by observing it fail".
5. **Enforcement is real, not aspirational.** `design/prototype/verify.mjs` is the project's first
   gate: it fails on raw colours, stray lengths, physical `left`/`right`, a prototype that differs
   from a fresh build, and a broken layout engine. It must grow with the product
   (`scripts/verify.sh`, per the contract §16).

## Not yet received

Nothing outstanding. All four rule documents are in place; the earlier "5 rules files" note in
`12-user-rules-received.md` is superseded by this file.
