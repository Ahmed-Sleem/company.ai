# `design/owner-demo/acme-studio-os.html`

**The owner's own demo — the project's second reference. Additions and ideas, not a parity lock.**

The owner built this from the designer's demo and added features of their own, then uploaded it on
2026-10-06. It is kept here **byte-for-byte as uploaded**, and it is read-only in the same way the
designer's file is: nothing in this repository writes to it, and tests may read it as a fixture.

| | |
|---|---|
| Repo | `github.com/Ahmed-Sleem/company.ai` |
| Uploaded file | `acme-studio-os (1).html` |
| Size | 614,107 bytes · 1,738 lines |
| `git hash-object` (blob SHA-1) | `1a450ddc1a722e37501bbe35550fac5fb8c95646` |
| SHA-256 | `4856c8648c4b345e1bab24c4a5609a7c8a2cb0b859db29a3a15fcc362dbf3a28` |
| HTML title | `Company OS — Pixel Edition` |
| Company shown | Acme Studio |

## What it is, in one line

**The designer's demo, with every shared screen intact, plus four new systems** — a pan-and-zoom
World Map of the studio, a Build mode level editor for that map, a four-palette colour system, and
a pixel icon set (with a CRT overlay and forced-colors styles alongside them).

`_research/dev-docs/OWNER_DEMO_READING.md` carries the full comparison and the borrow plan.

## The rule for this file

- **Never edit it.** It is evidence of what the owner asked for, exactly as it was asked for.
- It is a **source of ideas and of features**, not a style source: it carries 1,179 raw colour
  literals and 630 raw pixel lengths, which this project's rules do not allow in its own code. What
  is borrowed from here is behaviour, geometry and wording — re-expressed in our tokens.
- The six screens it shares with `design/designer-demo/ai-company-os.html` are **byte-identical**
  between the two files (checked function by function), so this file can never disagree with the
  parity lock about Team, Tasks, Inbox, Conversations, Network or Settings styling.

## Provenance notes (honest, unresolved)

- The **portraits** are the same 65 the designer's demo carries, and that file records them as
  derived from the designer's own character sheets.
- The **furniture and prop artwork** (54 SVG `<symbol>` sprites, ids such as `sp-desk-modesty-panel`,
  `sp-counter-reception-curved`, `sp-chair-meeting`) has **no attribution and no licence note in the
  file**. The names match the style of Kenney's *Furniture Kit* (CC0), but that is a resemblance, not
  a verified source. **Nothing of that artwork may be used in this repository until the owner says
  where it came from**, and then it gets a row in `THIRD_PARTY.md` and passes the licence gate.
- The **Pixelify Sans** font licence block is present and unchanged from the designer's demo.
