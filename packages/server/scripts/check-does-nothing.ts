/**
 * check-does-nothing — materials-response legibility lint.
 *
 * A mandatory half of the legibility deliverable (requirements Settled 11):
 * a made thing must *do something*. This scans every `Construction` form's
 * per-channel profile and flags any construction that produces **no effect
 * against any material on any channel** — a covering form that mitigates
 * nothing everywhere, or a weapon-delivery form that delivers nothing
 * everywhere. Such a form is an authoring mistake (a mistyped grid, a
 * placeholder that shipped): it renders empty pips and turns / lands
 * nothing, silently.
 *
 * Implemented as a standalone WARN/ERROR script (the `check-gate-strings`
 * precedent) rather than an ESLint rule — same ESLint-8-legacy DX reason.
 * The *check itself* is the pure `Construction.doesNothing()` /
 * `Construction.resistProfileHasEffect` surface (fixture-tested in
 * `Construction.test.ts`); this script just walks the shipped roster.
 */

import {
  Construction,
  COVERING_FORMS,
  WEAPON_DELIVERY_FORMS,
  TEXTILE_RESIST_PROFILE,
} from '../src/mud/lib/material/Construction';

const EXIT_ON_FINDINGS = true; // CI-gating

function main(): void {
  const findings: string[] = [];

  for (const form of COVERING_FORMS) {
    if (Construction.of(form).doesNothing()) {
      findings.push(
        `covering form '${form}' mitigates nothing on any channel (all-inert profile)`,
      );
    }
  }
  /*
   * ⭐ The textile half in ONE assertion.
   *
   * Registered fabric forms live in template rows, and this script runs
   * OUTSIDE the runtime — it cannot read them. It does not have to:
   * every textile form shares one kernel resist profile, so asserting
   * over that constant covers every fabric that ships today and every
   * one a pack adds later. That is the whole reason the shared profile
   * is a kernel constant rather than an authored field.
   */
  if (!Construction.resistProfileHasEffect(Object.values(TEXTILE_RESIST_PROFILE))) {
    findings.push(
      `TEXTILE_RESIST_PROFILE is all-inert — EVERY fabric form (present ` +
        `and future) mitigates nothing, because they all share it`,
    );
  }
  for (const form of WEAPON_DELIVERY_FORMS) {
    if (Construction.of(form).doesNothing()) {
      findings.push(
        `weapon-delivery form '${form}' delivers nothing on any channel`,
      );
    }
  }

  const total = COVERING_FORMS.length + WEAPON_DELIVERY_FORMS.length + 1;
  if (findings.length === 0) {
    console.log(
      `check-does-nothing: all ${total} construction form(s) have a real effect.`,
    );
    return;
  }

  console.warn(
    `\n[lint — ${EXIT_ON_FINDINGS ? 'ERROR' : 'WARN'}] ${findings.length} ` +
      `inert construction form(s):`,
  );
  for (const f of findings) console.warn(`  ${f}`);
  if (EXIT_ON_FINDINGS) process.exit(1);
}

main();
