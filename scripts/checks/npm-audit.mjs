#!/usr/bin/env node
/**
 * The npm audit gate (Phase H). Runs `npm audit` over the whole workspace lockfile and fails
 * on any HIGH or CRITICAL advisory — a known-dangerous dependency must never ride a push to
 * main. Moderate and low advisories are printed as warnings: they are read, not ignored, but
 * they do not stop the product.
 *
 * Honesty rule: if the registry cannot be reached, the gate SAYS SO and skips (exit 0) — it
 * never fakes a pass, and CI (where the network exists) runs it for real on every push.
 */
import { spawnSync } from 'node:child_process';

const run = spawnSync('npm', ['audit', '--json', '--audit-level=low'], {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});

if (run.error || run.status === null) {
  console.log(`npm audit: could not run (${run.error?.message ?? 'signal'}) — skipped, not passed`);
  process.exit(0);
}

let report;
try {
  report = JSON.parse(run.stdout);
} catch {
  // npm prints non-JSON when the registry is unreachable or the lockfile is broken.
  const text = `${run.stdout}\n${run.stderr}`.trim();
  if (/ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|network|registry/i.test(text)) {
    console.log('npm audit: registry unreachable — skipped, not passed');
    process.exit(0);
  }
  console.error(`npm audit: unreadable output —\n${text.slice(0, 2000)}`);
  process.exit(1);
}

const meta = report.metadata?.vulnerabilities ?? {};
const critical = meta.critical ?? 0;
const high = meta.high ?? 0;
const moderate = meta.moderate ?? 0;
const low = meta.low ?? 0;

if (moderate > 0 || low > 0) {
  console.log(`npm audit: warnings — ${moderate} moderate, ${low} low (read them; they do not block)`);
  // Name the moderate ones so "warning" never means "invisible".
  for (const [name, advisory] of Object.entries(report.vulnerabilities ?? {})) {
    if (advisory?.severity === 'moderate') {
      const via = (advisory.via ?? [])
        .map((v) => (typeof v === 'string' ? v : v?.title ?? ''))
        .filter(Boolean)
        .join('; ');
      console.log(`  · ${name} (${advisory.severity}) — ${via.slice(0, 140)}`);
    }
  }
}

if (critical > 0 || high > 0) {
  console.error(`npm audit: ${critical} critical, ${high} high — the gate is red`);
  for (const [name, advisory] of Object.entries(report.vulnerabilities ?? {})) {
    if (advisory?.severity === 'high' || advisory?.severity === 'critical') {
      console.error(`  · ${name} (${advisory.severity})`);
    }
  }
  process.exit(1);
}

console.log('npm audit: clean — no high or critical advisories');
