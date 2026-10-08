#!/usr/bin/env python3
"""Build design/prototype/company-os.html from the designer's demo.

The demo is the source of truth and stays untouched. This script applies a small, auditable
set of patches so the prototype is reproducible instead of hand-edited:

  P1  networkView() is replaced: the reserved placeholder becomes the real graph view
      (graphView() lives in graph.js, which is not part of the demo).
  P2  two stylesheets are linked in <head>: graph.css, prototype-changes.css
  P3  graph.js is loaded before the demo's own script (it defines window.graphView and
      installs the enhancement observer before the first render)
  P4  an HTML comment records the provenance of the build
  P5  the world becomes the seventh tab: a NAV entry, a sidebar button, a dispatch entry and
      its Arabic name in the demo's dictionary
  P6  world.css is linked beside graph.css, and world-lib.js + world.js are loaded before the
      app script (world-lib.js is the app's own world code, bundled by build-world-lib.mjs)
  P7  the product is renamed company.ai (the sidebar brand, the settings eyebrow, the page
      title and its description) — the owner's decision of 2026-10-08
  P8  the sidebar's "calm place" note is removed — the owner asked for no such note

Every patch is exact-match and counted: if the demo changes, the build fails loudly rather
than producing a half-patched file.

Usage:  python3 design/prototype/build-prototype.py [--check]
        --check  build into memory and report, writing nothing
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEMO = ROOT / "design" / "designer-demo" / "ai-company-os.html"
OUT = Path(__file__).resolve().parent / "company-os.html"

MARKER = ("<!-- Built from design/designer-demo/ai-company-os.html by "
          "design/prototype/build-prototype.py — see design/prototype/README.md.\n"
          "     The demo is byte-identical above; the prototype only replaces the reserved\n"
          "     Network placeholder and adds graph.css, graph.js, prototype-changes.css. -->")

NEW_NETWORK = """function networkView(){
  /* PATCHED (build-prototype.py): the reserved placeholder is now the real graph view.
     graphView() is defined in design/prototype/graph.js. */
  if (typeof window.graphView === 'function') return window.graphView();
  return head('A place for the bigger picture.','Company, work, and conversations — one future view.')+
    `<section class="reserved"><div class="reserved-mark" aria-hidden="true">[ · ]</div><span class="eyebrow">${t('Reserved space')}</span><h2>${t('Visual network')}</h2><p>${t('This area is reserved for the company network. Its visual design will be explored separately with the team.')}</p><span class="small dim">${t('No graph is included in this demo.')}</span></section>`;}"""


def patch_network(src: str) -> str:
    """P1 — replace the whole networkView() definition."""
    start = src.find("function networkView(){")
    if start < 0:
        raise SystemExit("P1 failed: networkView() not found — the demo changed.")
    end = src.find("function settingsView(", start)
    if end < 0:
        raise SystemExit("P1 failed: could not find the end of networkView().")
    if src.count("function networkView(){") != 1:
        raise SystemExit("P1 failed: networkView() is not unique.")
    return src[:start] + NEW_NETWORK + "\n" + src[end:]


def patch_head(src: str) -> str:
    """P2 — link the prototype stylesheets (graph.css, then the change list)."""
    if src.count("</head>") != 1:
        raise SystemExit("P2 failed: </head> is not unique.")
    links = ('<link rel="stylesheet" href="graph.css">'
             '<link rel="stylesheet" href="prototype-changes.css"></head>')
    return src.replace("</head>", links, 1)


def patch_script(src: str) -> str:
    """P3 — load graph.js before the demo's own (app) script.

    The demo has two inline scripts: a tiny pre-paint theme script in <head> and the app
    script that starts with `const VOICE_NOTE=`. graph.js goes immediately before the app
    script so every view can resolve window.graphView on its first render.
    """
    markers = [m.start() for m in re.finditer(r"<script(?![^>]*\bsrc=)", src)]
    if not markers:
        raise SystemExit("P3 failed: no inline <script> found.")
    app = src.find("const VOICE_NOTE=")
    if app < 0:
        raise SystemExit("P3 failed: app script marker (const VOICE_NOTE=) not found.")
    before = max([m for m in markers if m < app], default=None)
    if before is None:
        raise SystemExit("P3 failed: could not locate the app script tag.")
    return src[:before] + '<script src="graph.js"></script>\n' + src[before:]


def patch_marker(src: str) -> str:
    """P4 — provenance comment right after the <html …> tag."""
    m = re.search(r"<html[^>]*>", src)
    if not m:
        raise SystemExit("P4 failed: no <html> tag found.")
    return src[:m.end()] + "\n" + MARKER + src[m.end():]


def patch_world_tab(src: str) -> str:
    """P5 — the world tab: dictionary, NAV entry, sidebar button, view dispatch.

    Four exact-match edits, each counted, so a demo change fails the build instead of quietly
    producing a prototype with a tab that navigates nowhere.

      a) the demo's own words gain the tab's Arabic name — English passes through `t()` as-is;
      b) NAV gains the entry, appended (the shell renders NAV[4] and NAV[5] by index, so
         inserting in the middle would move Settings out of the sidebar);
      c) the sidebar renders it next to Settings, which is where the app puts it too;
      d) `render()` dispatches it to `window.worldView` — a bare `worldView` would work, but the
         `typeof` guard is the same shape P1 uses for graphView: if world.js ever fails to load,
         the tab degrades to the network view instead of throwing on navigation.
    """
    edits = [
        ("dictionary",
         "Network|الشبكة\nSettings|",
         "Network|الشبكة\nWorld Map|خريطة المكتب\nSettings|"),
        ("NAV entry",
         "['network','Network','network'],",
         "['network','Network','network'],['world','World Map','grid'],"),
        ("sidebar button",
         "${navButton(NAV[5])}",
         "${navButton(NAV[5])}${navButton(NAV[6])}"),
        ("view dispatch",
         "network:networkView,settings:settingsView}",
         "network:networkView,world:(typeof window.worldView==='function'?window.worldView:networkView),settings:settingsView}"),
    ]
    for label, old, new in edits:
        if src.count(old) != 1:
            raise SystemExit(f"P5 failed ({label}): expected exactly one '{old[:40]}', found {src.count(old)}.")
        src = src.replace(old, new, 1)
    return src


def patch_world_assets(src: str) -> str:
    """P6 — world.css beside the other two stylesheets, and the two world scripts before the app.

    world-lib.js first: it is the shared world code from the app (`scripts/build-world-lib.mjs`),
    and world.js reads it at use time. The order is a courtesy, not a requirement — but reading it
    in the file the way it runs is what keeps this readable.
    """
    css_old = 'href="prototype-changes.css"></head>'
    css_new = 'href="prototype-changes.css"><link rel="stylesheet" href="world.css"></head>'
    if src.count(css_old) != 1:
        raise SystemExit("P6 failed (stylesheet): prototype-changes.css link not found exactly once.")
    src = src.replace(css_old, css_new, 1)

    js_old = '<script src="graph.js"></script>'
    js_new = ('<script src="world-lib.js"></script>\n'
              '<script src="graph.js"></script>\n'
              '<script src="world.js"></script>')
    if src.count(js_old) != 1:
        raise SystemExit("P6 failed (scripts): the graph.js script tag is missing (run P3 first).")
    return src.replace(js_old, js_new, 1)



def patch_brand(src: str) -> str:
    """P7 — the product is company.ai, not company.os (owner, 2026-10-08)."""
    pairs = [
        ("<span>company.os<small>HUMAN × ARTIFICIAL</small></span>",
         "<span>company.ai<small>HUMAN × ARTIFICIAL</small></span>"),
        ("[ company.os ]", "[ company.ai ]"),
        ("<title>Company OS — Pixel Edition</title>",
         "<title>company.ai — Pixel Edition</title>"),
        ('content="Company OS — a calm, self-contained appearance demo for an AI-powered company."',
         'content="company.ai — a self-contained appearance demo for an AI-powered company."'),
    ]
    for old, new in pairs:
        if src.count(old) != 1:
            raise SystemExit(f"P7 failed: {old[:40]!r} appears {src.count(old)} times — the demo changed.")
        src = src.replace(old, new, 1)
    return src


def patch_no_calm_note(src: str) -> str:
    """P8 — the sidebar's calm-place note is gone (the owner asked for no such note).

    The dictionary keeps the sentence: the string table is the demo's, and an unused entry
    is harmless, while a missing one breaks t().
    """
    old = ('<div class="side-note"><strong>↳ ${t(\'A calm place to run your AI company.\')}</strong>'
           "${t('No live AI connections')}</div>")
    if src.count(old) != 1:
        raise SystemExit(f"P8 failed: the calm note appears {src.count(old)} times — the demo changed.")
    return src.replace(old, "", 1)


def main() -> int:
    argv = sys.argv[1:]
    check = "--check" in argv
    out = OUT
    if "--out" in argv:
        out = Path(argv[argv.index("--out") + 1]).resolve()
    if not DEMO.exists():
        raise SystemExit(f"demo not found: {DEMO}")
    original = DEMO.read_text(encoding="utf-8")
    src = patch_network(original)
    src = patch_head(src)
    src = patch_script(src)
    src = patch_marker(src)
    src = patch_world_tab(src)
    src = patch_world_assets(src)
    src = patch_brand(src)
    src = patch_no_calm_note(src)

    checks = {
        "networkView patched": "PATCHED (build-prototype.py)" in src and "function networkView(){" in src,
        "graph.css linked": 'href="graph.css"' in src,
        "changes.css linked": 'href="prototype-changes.css"' in src,
        "graph.js loaded": '<script src="graph.js"></script>' in src,
        "reserved fallback kept": 'class="reserved"' in src,
        "provenance marker": MARKER.splitlines()[0] in src,
        "settings view intact": "function settingsView(" in src,
        "no duplicate networkView": src.count("function networkView(){") == 1,
        "world tab in NAV": "['world','World Map','grid']," in src,
        "world tab in the sidebar": "${navButton(NAV[6])}" in src,
        "world tab dispatched": "window.worldView" in src,
        "world tab translated": "World Map|خريطة المكتب" in src,
        "world.css linked": 'href="world.css"' in src,
        "world-lib.js loaded": '<script src="world-lib.js"></script>' in src,
        "world.js loaded": '<script src="world.js"></script>' in src,
    }
    bad = [k for k, v in checks.items() if not v]
    print(f"demo   : {DEMO.name}  ({len(original):,} bytes)")
    print(f"output : {OUT.name}  ({len(src):,} bytes)")
    for k, v in checks.items():
        print(f"  {'ok ' if v else 'FAIL'} {k}")
    if bad:
        raise SystemExit("build failed: " + ", ".join(bad))
    if check:
        print("--check: nothing written.")
        return 0
    out.write_text(src, encoding="utf-8")
    print(f"written: {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
