/**
 * test-bootstrap — the framework wiring, on request.
 *
 * Import this from any test that needs a wired world:
 *
 *     import "../../../test-bootstrap";
 *
 * It runs `BootstrapManager.installFrameworkWiring()` exactly as the
 * server does at start: the registry-class handoffs, the security↔shadow
 * slot, the shadow↔command recency bridge, the glob merge-on-arrival
 * ripple, the PM scope resolver, the sandbox boundary's exempt bases.
 * Without it, the first touch of any of those is a "Registry class not
 * registered" throw.
 *
 * ## Why an import and not `setupFiles`
 *
 * It used to be a global setup file, so every test file paid for it.
 * Vitest isolates per file, so "paid for it" meant re-evaluating this
 * module's ~30-deep import graph 955 times — measured at 5.79s of the
 * 6.38s it took to run a file that needed none of it, and roughly a
 * third of the suite's wall clock.
 *
 * Making it an import means a test that needs a wired world *says* it
 * needs one, and a test that doesn't stops paying. `check-test-bootstrap`
 * (`pnpm lint:test-bootstrap`) keeps the two in sync.
 *
 * ## The once-guard
 *
 * Repeated import must be free, because it is going to happen: a test
 * file imports this, and so does the fixture module it imports. ES
 * module evaluation is already once-per-graph, so the guard is not
 * strictly needed for the import path — but it also makes the exported
 * `ensureFrameworkWiring()` safe to call from a `beforeEach`, and it
 * makes the idempotency guarantee something a test can assert rather
 * than something the module system happens to provide.
 *
 * Idempotency matters concretely: `installFrameworkWiring` registers
 * registry classes and boundary-exempt bases, and running it twice
 * against a mutated registry is not obviously harmless. Guarding is
 * cheaper than auditing every callee for re-entrancy.
 *
 * @internal — test surface. Never imported by production code.
 */

import { BootstrapManager } from "./backend/BootstrapManager";

let installed = false;

/**
 * Install the framework wiring if it has not been installed. Safe to
 * call any number of times.
 *
 * The side-effect import (`import "../../test-bootstrap"`) is the
 * normal way in; this named export exists for the idempotency test and
 * for the rare fixture that must wire mid-run.
 *
 * @returns true if this call did the work, false if it was already done.
 */
export function ensureFrameworkWiring(): boolean {
  if (installed) return false;
  installed = true;
  BootstrapManager.installFrameworkWiring();
  return true;
}

ensureFrameworkWiring();
