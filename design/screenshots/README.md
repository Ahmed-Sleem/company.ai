# Screenshots

Gallery images for the root `README.md`, taken from the real prototype (`../prototype/company-os.html`)
— not mockups, not drawings.

**Status: the folder and the capture script are ready; the images themselves still have to be taken.**
The sandbox that built the prototype has no browser installed and no network to install one, so the
capture runs on any machine that has Node and a browser — one command, about a minute.

---

## Run the capture (recommended)

```bash
# once, to get a browser for Playwright:
npx playwright@latest install chromium

# capture everything (writes into this folder):
node design/screenshots/shots.mjs
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
