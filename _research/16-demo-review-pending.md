# 16 — Designer demo review (DONE — review delivered in `17-demo-review.md`)

**Status: RESOLVED.** The demo was delivered via the GitHub repo (route 3 below): `ai-company-os-ready (1).html`
at the root of `main`, commit `aa65c9a`, 383,911 bytes. It could not be downloaded into the sandbox
(no outbound network here), so it was read chunk-by-chunk through a network-capable fetch tool and
reviewed from source. Review + change request: **`_research/17-demo-review.md`**; extracted style
contract: **`design/tokens/company-os-pixel.css|json`**.

Plan for the file once a session with push/network access exists: move it to
`design/designer-demo/ai-company-os.html` (drop the `" (1)"`) with a `SOURCE.md` beside it.

---

_Original blocked-state notes, kept for history:_

**Status was: BLOCKED — 4 attempts, 0 deliveries.** The attachment `ai-company-os-ready (1).html`
(three separate attempts across messages) never reached the sandbox. Verified each time:
`/home/user/uploads/` does not exist; `find / -xdev -name "*.html"` returns nothing outside the OS; no
such file in the repo or in git history; nothing matching `*ai-company*` anywhere.

This is the **fourth** failed attachment (`12-user-rules-received.md` documents the earlier ones).
Until the file is delivered by another route, no review can be given — and inventing one is not
acceptable.

## Delivery routes that work when uploads fail

1. **Paste the HTML as text in the chat message** — chat text always arrives; paste in chunks if large.
2. **Start a new coding session** and attach the file there (fresh upload channel; also restores GitHub
   push, since this session's PR was merged).
3. **Push it into the repo yourself** at `design/designer-demo/ai-company-os.html` and say so.

## Interim action taken

Because the review is blocked, a **scaffold** was built so work continues and the demo can react to
something concrete: a prototype of the app shell (+ `design/README.md`); it now lives at
`design/prototype/company-os.html` (the earlier scaffold is archived at `design/archive/gui-scaffold.html`). It carries the same element
list as the brief and codifies the style-merge protocol (tokens first, semantic colour meaning,
RTL via logical properties, network area still reserved). When the designer's demo arrives, its style is
mapped onto the scaffold's tokens — the scaffold's *structure* is disposable, its *token names* are not.

## Session constraint discovered now

The pull request for this session was **merged/closed** (`main` contains
`6b3d09c Merge pull request #1 from Ahmed-Sleem/arena/01a0f9f3-company-ai`).
Remote GitHub operations (push, PR, `gh`) are no longer available in this session.
**Local work continues to work** — files and local commits are preserved.

## How to deliver the demo

- **New coding session** + attach `ai-company-os-ready (1).html` (recommended — also restores GitHub
  push access, which we need for the next steps), or
- paste the HTML as text in chat, or
- push it into the repo yourself (e.g. `demo/ai-company-os.html`) and say so.

## Review checklist to run the moment the file arrives

**A. Fidelity to the brief (`designer-brief.md`)** — is every element present?

| # | Element group | Present? |
| --- | --- | --- |
| 1 | Company/Team: employee list w/ avatar, name, title, dept, status, current activity, cost indicator | ☐ |
| 1b | Reporting hierarchy visible · departments · one employee full profile · "add employee" entry point | ☐ |
| 2 | Tasks: board + columns; card (title, owner, priority, due, progress); task detail (desc, checklist, files, comments, activity) | ☐ |
| 2b | Decision inbox (approve/reject/ask) · notifications · filters/search | ☐ |
| 3 | Conversations: list (1:1 + group, human+AI) · thread (text, files, images, links, voice) | ☐ |
| 3b | **Model selector visible in conversation** (one or more models) · @mentions · message states (sending/working/failed/needs approval) | ☐ |
| 4 | **Reserved visual-network area** — reserved but not designed yet | ☐ |
| 5 | App-wide: navigation · global search · account/company settings · dark+light · **Arabic RTL + English LTR** · mobile · empty/loading/error states · keyboard + contrast | ☐ |

**B. Style preservation (the user's explicit requirement: keep the style)**
- Extract the visual tokens into a written spec so they survive the edits:
  colour palette (+ semantic colours: working/idle/paused/error/approval), typography scale, spacing
  scale, border radius, shadows/elevation, icon set, motion/transition timings, dark+light mapping.
- Note what is *intentional* vs accidental in the demo; only the intentional parts are locked as style.
- Convert the tokens into design tokens (CSS variables / Tailwind theme) so edits cannot drift the style.

**C. Structural issues to flag (not to fix blindly)**
- Where does the demo imply a structure we had intentionally left open (org vs flow vs health lenses)?
- Is the reserved network area a fixed region or a route? (Affects build.)
- RTL: is mirroring done by layout, or hard-coded LTR positions? Hard-coded = rework later.
- Is data realistic enough to test the layout under load (many employees, long titles, long convo
  threads, Arabic text of realistic length)?

**D. Consistency with the reuse plan (`15-code-harvest-plan.md`)**
- Which parts of the demo can be built directly with React Flow + d3-force/PixiJS + shadcn/ui?
- Any element that would force a non-permissive dependency (Dify/Flowise/LobeHub patterns)? Flag it.

## Deliverable produced after the review

A single annotated change-request document: *what to keep (locked style), what to edit (with reason),
what to add (missing brief elements), what to remove (out of scope)* — plus, if useful, a corrected
static HTML prototype that preserves the designer's style.
