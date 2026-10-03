# Screenshots

Gallery images for the root `README.md`, taken from the real prototype (`../prototype/company-os.html`)
— not mockups, not drawings.

**Status: all 12 images are in place**, captured 2026-10-03 from the prototype itself on a machine
with Node + Chromium (`node design/screenshots/shots.mjs`, then verified by eye against the live
prototype). The capture drives the app's **own** controls — the nav items, the appearance and
language toggles, the graph layout buttons — and waits for the layout engine to stop moving before
shooting. If a control cannot be found or the app does not actually change state, that shot fails and
is reported as skipped: nothing is ever faked by writing to the DOM from outside the app.

Re-capture after a prototype change with the same one command; the list below is the single source of
truth for the file names.

---

## Run the capture (recommended) — needs a browser

```bash
cd design
npm install --no-save playwright      # from the repository root; keeps the tree clean
npx playwright install --with-deps chromium
cd .. && node design/screenshots/shots.mjs
```

It opens the prototype, visits every view and writes the PNGs listed below, then prints a table of what
it saved and what it skipped.

## Or take them by hand

1. Serve the repo (`python3 -m http.server 8080` inside `design/`) or just open
   `design/prototype/company-os.html` in the browser.
2. Set the window to about **1440 × 900** (a browser at 100% zoom is fine).
3. For each view: **Team · Tasks · Inbox · Conversations · Network · Settings** — screenshot and save
   with the exact names in the table. Use `⌘⇧4` (macOS) or `Win+Shift+S` (Windows).
4. Repeat for the dark theme and for Arabic (the app's own theme and language switches), then once in a
   narrow window (~390 px) for the mobile layout.

## The set to capture

| File | View | Theme | Language | Notes |
|---|---|---|---|---|
| `01-team-light-en.png` | Team | light | en | the landing view |
| `02-tasks-light-en.png` | Tasks | light | en | four stages |
| `03-inbox-light-en.png` | Inbox | light | en | decision cards |
| `04-conversations-light-en.png` | Conversations | light | en | thread + model provenance |
| `05-network-force-light-en.png` | Network | light | en | force layout |
| `06-network-rings-light-en.png` | Network | light | en | rings layout |
| `07-settings-light-en.png` | Settings | light | en | appearance/providers |
| `08-team-dark-en.png` | Team | dark | en | |
| `09-network-force-dark-ar.png` | Network | dark | ar | RTL + dark together |
| `10-tasks-dark-ar.png` | Tasks | dark | ar | |
| `11-team-light-ar.png` | Team | light | ar | |
| `12-network-mobile-ar.png` | Network | — | ar | ~390 px wide |

## Rules for this folder

- Only real captures of the prototype — never reconstructions.
- Re-take affected shots whenever the prototype changes, and say which ones were refreshed in the
  commit message.
- Keep the file names exactly as above: the README gallery and any future docs reference them.
- `shots.mjs` is the single source of truth for the list; update it and this table together.
