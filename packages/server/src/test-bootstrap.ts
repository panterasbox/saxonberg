/**
 * test-bootstrap — the framework wiring, on request.
 *
 * Import this from any test that needs a wired world:
 *
 *     import "../../../test-bootstrap";
 *
 * It runs `BootstrapManager.installFrameworkWiring()` exactly as the
 * server does at start: the registry-class handoffs, the security↔shadow
 * slot, the shadow↔command recency bridge, the stack merge-on-arrival
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
import { PackApi } from "./mud/api/pack";

let installed = false;

/**
 * ⭐⭐ The rows the ENGINE ITSELF clones.
 *
 * Since template inheritance every exit in the world is a clone of a
 * kind row, and a boundary's two anchors are clones of
 * `/platform/thing/BoundaryAnchor` — there is no `new Exit(...)` branch
 * left, which is the point (an exit can say what an author wrote).
 *
 * ⚠ They are declared HERE, beside `PackApi.registerSources()`, rather
 * than re-typed into every suite — but a suite still installs them
 * deliberately (`seedKernelContentStore`), because an automatic global
 * floor cannot be built at this layer: intercepting
 * `PersistenceManager.get` breaks the `vi.spyOn(pm, 'find')` pattern
 * dozens of suites use, and sixty of them went red proving it.
 */
export const KERNEL_CONTENT_ROWS: ReadonlyArray<{
  path: string;
  class: string;
  hydratorClass?: string;
  data: Record<string, unknown>;
}> = [
  {
    path: "/platform/idea/persistence/PersistentHydrator",
    class: "/platform/idea/persistence/PersistentHydrator",
    data: {},
  },
  {
    path: "/platform/idea/exits/passage",
    class: "/platform/idea/Exit",
    data: {},
  },
  {
    path: "/platform/idea/exits/vessel-in",
    class: "/platform/idea/Exit",
    hydratorClass: "/platform/idea/persistence/PersistentHydrator",
    data: {},
  },
  {
    path: "/platform/idea/exits/vessel-out",
    class: "/platform/idea/Exit",
    hydratorClass: "/platform/idea/persistence/PersistentHydrator",
    data: {},
  },
  {
    path: "/platform/idea/exits/sandbox-crossing",
    class: "/platform/idea/SandboxCrossingExit",
    hydratorClass: "/platform/idea/persistence/PersistentHydrator",
    data: {},
  },
  {
    path: "/platform/idea/exits/sandbox-return",
    class: "/platform/idea/SandboxCrossingExit",
    hydratorClass: "/platform/idea/persistence/PersistentHydrator",
    data: {},
  },
  {
    path: "/platform/thing/BoundaryAnchor",
    class: "/platform/thing/BoundaryAnchor",
    data: {},
  },
];


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
  // The capability packs' src/ → namespace table (content-packs, the
  // capability rung), so a test that clones a pack-backed row or imports
  // a pack class gets `/arcana/…` resolved without an install. A disk
  // read of the shipped manifests; no database.
  PackApi.registerSources();
  return true;
}

ensureFrameworkWiring();
