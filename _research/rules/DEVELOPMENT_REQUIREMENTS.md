# General Development Requirements

**Purpose:** reusable process rules for any project. Give this file to any developer who should work with the same discipline, documentation, validation, and checkpoint workflow.

> This folder is for development handoff only. In production deployments, remove the whole `_development_docs_REMOVE_BEFORE_DEPLOYMENT/` folder unless the deployment intentionally includes developer documentation.

---

## 1. Core Principles

- Do not guess when requirements are unclear.
- Ask specific questions before implementing ambiguous work.
- Inspect the existing project before editing.
- Think through the plan before coding.
- Prefer targeted edits over broad rewrites.
- Keep every project easy for another developer to continue.
- Every completed step must be documented and validated.
- Every project must have a project map, plan, and append-only done log.

---

## 2. Required Process for Every Task

### Step 1 — Clarify & Gather Information

Before coding:

1. Read the task carefully.
2. Identify missing information.
3. Ask the user/client for unclear details.
4. Inspect relevant files.
5. Check existing architecture and conventions.
6. Check project dependencies and host requirements.
7. Search official/current docs if external facts matter.

Do not start implementation until the requirements and constraints are clear.

### Step 2 — Plan

Before changing code:

1. Break the task into small steps.
2. Identify affected files.
3. Identify validations/tests required.
4. Identify rollback/checkpoint point.
5. Record the intended phase/task in the plan if it is not already there.

Internal reasoning can be detailed, but public handoff should summarize decisions and implementation plan clearly.

### Step 3 — Implement Incrementally

During implementation:

1. Make focused changes.
2. Avoid rewriting files unnecessarily.
3. Keep code organized.
4. Do not mix unrelated features in the same step.
5. Keep internal/admin concerns separate from public user UI.
6. Keep configuration in config/env files, not hardcoded public UI.

### Step 4 — Validate

After each meaningful step or phase:

1. Run formatting checks.
2. Run linting.
3. Run type-checking.
4. Run unit tests.
5. Run integration/security/E2E tests where applicable.
6. Run build.
7. Check production dependency audit where relevant.

Recommended generic command set for npm projects:

```bash
npm install
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run validate
npm audit --omit=dev
```

If the project uses another package manager, document the equivalent commands.

### Step 5 — Log

Append to the done log after validation.

The log entry must include:

- date/time;
- phase/task name;
- exact files changed;
- exact behavior changed;
- dependencies checked/installed;
- validation commands run;
- validation results;
- checkpoint path;
- known limitations or remaining blockers.

Never overwrite the done log.

### Step 6 — Checkpoint

After each completed phase or significant milestone, create a compressed checkpoint of the full project.

Exclude generated folders:

```txt
node_modules
.git
.svelte-kit
.next
dist
build
coverage
.cache
.local
runtime data
temporary upload folders
```

Use clear names:

```txt
project_phase_01_short_name.zip
project_complete_checkpoint.zip
```

---

## 3. Required Documentation Files for Every Project

Every serious project should contain one development-docs folder similar to:

```txt
_development_docs_REMOVE_BEFORE_DEPLOYMENT/
├── DEVELOPMENT_REQUIREMENTS.md
├── IMPLEMENTATION_PLAN.md
├── THINGS_DONE.md
├── PROJECT_MAP.md
├── SUPPORTING_NOTES.md
└── README.md
```

### DEVELOPMENT_REQUIREMENTS.md
General work rules and validation process.

### IMPLEMENTATION_PLAN.md
Phase plan, milestones, acceptance criteria, and what should happen next.

### THINGS_DONE.md
Append-only completed work log. Never rewrite.

### PROJECT_MAP.md
Human-readable map of project structure, important files, apps, packages, services, and integration points.

### SUPPORTING_NOTES.md
Merged special notes such as GUI requirements, deployment notes, security notes, mobile policy, testing checklist, and external-service acceptance notes.

### README.md
Index explaining where to start.

---

## 4. Dependency and Host Checks

Before implementation or deployment:

- Check language/runtime versions.
- Check package manager availability.
- Check dependency installation.
- Check required system services.
- Check environment variables.
- Check database availability where relevant.
- Check external service availability where relevant.

Do not silently install system dependencies on production servers unless the user explicitly approved an installer script.

For server projects, provide one command if possible, for example:

```bash
bash scripts/server-install-and-validate.sh
```

That script should report missing system requirements clearly.

---

## 5. Public UI vs Admin/Internal Configuration

For public products:

- Public users should see only product-level controls.
- Do not expose internal provider names, webhook URLs, secrets, database details, infrastructure status, or admin controls.
- Admin/operator configuration should be done through environment variables, config files, or protected admin tools.

Bad public UI labels:

```txt
n8n webhook
AuthKit config
gVisor runtime
Docker network
PostgreSQL metadata
iptables rules
```

Better public labels:

```txt
AI agent
Secure account
Temporary workspace
Desktop development tools
Preview
Terminal
```

---

## 6. Mobile Policy Template

When a product has desktop-only advanced tools, document platform differences clearly.

Example:

- Mobile is chat/input-output only.
- Mobile should not expose desktop sandbox/editor/terminal features.
- Mobile onboarding should differ from desktop onboarding.
- Generated files may be downloadable outputs, but not editable/runnable on mobile.

---

## 7. Production Readiness Checklist

Before public launch:

- all validation commands pass;
- production dependency audit is clean or documented;
- env examples are complete;
- server install instructions are complete;
- security checklist is complete;
- auth flow is tested;
- critical E2E flows pass;
- backup/restore/cleanup behavior is tested;
- monitoring/operations notes exist;
- final checkpoint is created;
- docs folder intended for development is removed from deployment if required.

---

## 8. Deployment Documentation Rule

Every project should have one place for server setup:

```txt
scripts/server-install-and-validate.sh
```

and/or:

```txt
_development_docs_REMOVE_BEFORE_DEPLOYMENT/SUPPORTING_NOTES.md
```

The user should not need to search many files to know what to do.

---

## 9. Handoff Rule

At the end of work, provide:

- latest checkpoint archive;
- what was completed;
- validation results;
- known limitations;
- next recommended step;
- exact files to give to other developers/designers.
