# `_research/rules/` — mandatory & editable project rules

> **Status: EMPTY — the user's rules file(s) did not arrive in the first session.**
> The attachment step produced no file in the workspace (verified by searching the whole sandbox on
> 2026-10-02). The user has been asked to re-attach them. Until then this folder is a placeholder.

## Expected layout (to be filled when rules are provided)

```
_research/rules/
├── AGENTS.md            ← MANDATORY. Agent behaviour rules (read by AI coding agents first)
├── CODING_RULES.md      ← MANDATORY or editable (per user)
├── DESIGN_RULES.md      ← MANDATORY or editable
├── SECURITY_RULES.md    ← MANDATORY (deployment/secret handling)
└── EDITABLE.md          ← rules the agent may propose changes to (with user approval)
```

## Classification protocol (applied when the rules arrive)

| Class | Meaning | How the agent treats it |
| --- | --- | --- |
| **MANDATORY** | Rules the user marked as non-negotiable, e.g. agent rules | Never modified. Any conflict is escalated to the user instead of silently resolved |
| **EDITABLE** | Rules the user allows improving | Agent may propose a diff; change only after user approves |
| **TBD** | Not yet classified | Treated as MANDATORY until the user says otherwise (safe default) |

## Why these live in `_research/`

Per the user's instruction, all rules and research artefacts stay in **one removable folder** so that
`rm -rf _research/` cleanly removes pre-deployment material. Note: if any rule file **must** be
discovered automatically at the repository root by tooling (e.g. `AGENTS.md` at root for agent
frameworks), the user will be asked whether to keep a root symlink/short pointer file. That decision is
pending until the rules arrive.
