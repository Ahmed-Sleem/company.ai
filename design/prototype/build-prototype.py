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

    checks = {
        "networkView patched": "PATCHED (build-prototype.py)" in src and "function networkView(){" in src,
        "graph.css linked": 'href="graph.css"' in src,
        "changes.css linked": 'href="prototype-changes.css"' in src,
        "graph.js loaded": '<script src="graph.js"></script>' in src,
        "reserved fallback kept": 'class="reserved"' in src,
        "provenance marker": MARKER.splitlines()[0] in src,
        "settings view intact": "function settingsView(" in src,
        "no duplicate networkView": src.count("function networkView(){") == 1,
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
