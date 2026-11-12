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
import { readdirSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import YAML from "yaml";
import { MaterialApi } from "./mud/api/material";
import { ConditionApi } from "./mud/api/condition";
import { BiomeApi } from "./mud/api/biome";
import { blankDefaultWall } from "./mud/lib/biome/__tests__/root-biome";
import { PartyApi } from "./mud/api/party";
import { ContainmentApi } from "./mud/api/containment";
import { MessageApi } from "./mud/api/message";

let installed = false;

/**
 * ⭐⭐ The rows the ENGINE ITSELF clones.
 *
 * Since template inheritance every exit in the world is a clone of a
 * kind row — there is no `new Exit(...)` branch
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
  data: Record<string, unknown>;
}> = [
  {
    path: "/platform/idea/TemplateApplier",
    class: "/platform/idea/TemplateApplier",
    data: {},
  },
  // ⭐ The lazy dictionaries (documents W5): never booted, cloned on the
  // first reach (`StuffApi.ready`) — a harness's fake store answers the
  // clone and the warm reads its (empty) rows.
  {
    path: "/platform/idea/CorpoCatalogue",
    class: "/platform/idea/CorpoCatalogue",
    data: {},
  },
  {
    path: "/platform/idea/GovernmentCatalogue",
    class: "/platform/idea/GovernmentCatalogue",
    data: {},
  },
  {
    path: "/platform/idea/SpellCatalogue",
    class: "/platform/idea/SpellCatalogue",
    data: {},
  },
  {
    path: "/platform/idea/DisciplineCatalogue",
    class: "/platform/idea/DisciplineCatalogue",
    data: {},
  },
  {
    path: "/platform/idea/RecipeCatalogue",
    class: "/platform/idea/RecipeCatalogue",
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
    data: {},
  },
  {
    path: "/platform/idea/exits/vessel-out",
    class: "/platform/idea/Exit",
    data: {},
  },
  {
    path: "/platform/idea/exits/sandbox-crossing",
    class: "/platform/idea/SandboxCrossingExit",
    data: {},
  },
  {
    path: "/platform/idea/exits/sandbox-return",
    class: "/platform/idea/SandboxCrossingExit",
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
  rememberKernelDocuments();
  installAddressIndexStandIn();
  // A body's `onCreate` awaits the condition roster (load-on-use W6); a
  // suite has no rows to read, so the roster stands as whatever conditions
  // the suite itself makes — what every such suite read before.
  ConditionApi.standRosterForTesting();
  // Likewise the material roster (load-on-use W8): a roster read in a suite
  // answers with the materials the suite made.
  MaterialApi.standRosterForTesting();
  // And a suite with no root biome reads its default walls as a BLANK
  // material — the envelope's fallback figures (load-on-use W8).
  BiomeApi.standDefaultEnclosureForTesting(blankDefaultWall);
  return true;
}

/**
 * ⭐ The address index, in a suite (load-on-use W5). In a running world
 * `AddressApi.needs` clones the registry on the first address question and
 * its `onCreate` indexes every locality row. A suite has no locality rows
 * (and usually no store), so the harness's needs loader stands an EMPTY
 * index in instead of cloning one — "no locality covers this", which is
 * what every such suite read before the index stopped booting. A suite that
 * builds its own registry (`weather.resolve`) keeps it; a locality a suite
 * makes registers itself into whichever index is live.
 *
 * ⚠ Never a clone attempt: production code resolves addresses from
 * unawaited witnesses, so a clone in flight across a test boundary would
 * land a second registry beside the stand-in.
 */
function installAddressIndexStandIn(): void {
  // Late-bound, as the production loader is: importing the Apis at this
  // module's top would reorder every suite's module evaluation.
  const REGISTRY = "/platform/idea/AddressRegistry";
  void import("./mud/api/security").then(({ SecurityApi }) =>
    SecurityApi._registerNeedsLoader(async (needs) => {
      const { StuffApi } = await import("./mud/api/stuff");
      if (needs.includes(REGISTRY)) {
        const { standAddressIndex } =
          await import("./mud/lib/address/__tests__/address-index");
        standAddressIndex();
      }
      await StuffApi.ready(...needs);
    }),
  );
}

/**
 * ⭐ The kernel's own document vocabulary, resident as a running world has
 * it — the platform pack's `content/dirt/`, `content/formations/` and
 * `content/placements/` (documents path identity, D7: every Soilable host
 * and every place loads its share in `onCreate`; a party its chosen one). A suite has no document
 * store behind it, so the installer's half is stood in for here, from the
 * shipped files: a disk read, no database.
 */
function rememberKernelDocuments(): void {
  const root = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../content/platform/content",
  );
  const each = (
    dir: string,
    keep: (path: string, data: Record<string, unknown>) => void,
  ): void => {
    const at = join(root, dir);
    if (!existsSync(at)) return;
    for (const f of readdirSync(at)) {
      if (!f.endsWith(".yaml")) continue;
      const path = `/platform/${dir}/${f.slice(0, -".yaml".length)}`;
      keep(
        path,
        (YAML.parse(readFileSync(join(at, f), "utf8")) ?? {}) as Record<
          string,
          unknown
        >,
      );
    }
  };
  each(
    "dirt",
    (path, data) =>
      void MaterialApi.dirtKinds().remember(
        path,
        MaterialApi.dirtKinds().parse(data, path),
      ),
  );
  each(
    "cleansers",
    (path, data) =>
      void MaterialApi.cleansers().remember(
        path,
        MaterialApi.cleansers().parse(data, path),
      ),
  );
  each(
    "fabrics",
    (path, data) =>
      void MaterialApi.fabrics().remember(
        path,
        MaterialApi.fabrics().parse(data, path),
      ),
  );
  each(
    "formations",
    (path, data) =>
      void PartyApi.formations().remember(
        path,
        PartyApi.formations().parse(data, path),
      ),
  );
  each(
    "placements",
    (path, data) =>
      void ContainmentApi.placements().remember(
        path,
        ContainmentApi.placements().parse(data, path),
      ),
  );
  // The topic vocabulary, as the first scene's warm would leave it — so a
  // suite's scenes deliver synchronously, as every scene after a world's
  // first does.
  const topics: Array<{ path: string; data: Record<string, unknown> }> = [];
  each("topics", (path, data) => void topics.push({ path, data }));
  MessageApi.topics().install(topics);
}

ensureFrameworkWiring();
