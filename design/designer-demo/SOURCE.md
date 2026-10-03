# `design/designer-demo/ai-company-os.html`

**The designer’s demo — the project’s visual reference. In place and verified.**

This is the file the designer uploaded to the repo root as `ai-company-os-ready (1).html`; it has
been moved here and renamed. It is **byte-identical** to the upload.

| | |
|---|---|
| Repo | `github.com/Ahmed-Sleem/company.ai` |
| Original path | `ai-company-os-ready (1).html` (repo root of `main`, commit `aa65c9a` “Add files via upload”) |
| Size | 383,911 bytes · 801 lines |
| Git blob SHA-1 | `7dd2e203d713d0d7d13cf3371e27e28b834f79f0` — recomputed here and matching the uploaded blob |
| HTML title | `Company OS — Pixel Edition` |
| Licences in the file | Pixelify Sans (SIL OFL 1.1); portraits are the project’s own assets derived from the designer’s character sheets |

## Verified with

```bash
bash design/designer-demo/install.sh          # offline verification (default)
bash design/designer-demo/install.sh --force  # re-download, then verify
```

The script hashes the file with `git hash-object` and compares against the reviewed blob sha, so a
later designer upload is immediately detectable as “differs from the reviewed snapshot”.

## Still to do when someone has push access

The copy in the repo root is now redundant:

```bash
git rm "ai-company-os-ready (1).html"
git commit -m "design: demo moved to design/designer-demo/ (drop root copy + ' (1)' suffix)"
```

## Rule

**This file is an archive — do not edit it.** All changes happen in the product, with
`../tokens/company-os-pixel.css|json` as the style contract, and the review + change request in
`../../_research/17-demo-review.md` as the list of what to change. Keeping the demo byte-identical is
what lets the designer diff our build against what they sent.
