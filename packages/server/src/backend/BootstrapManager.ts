/**
 * BootstrapManager — clone runtime instances from manifest entries
 * after `SeederManager` has populated the `content` collection.
 *
 * The manager owns the `BootstrapEntry` shape; the manifest data
 * (the actual list of templates to bootstrap) lives at
 * `mud/bootstrap.ts` so lower-level developers can edit and review
 * it as things come and go from service. Imports flow mudlib →
 * backend for the type, not the other way around — backend stays
 * the privileged layer and doesn't reach into mudlib for shape
 * information.
 *
 * The manager topo-sorts entries by `dependsOn` and clones each
 * entry in order. `awaitInit` runs after the clone for entries
 * needing async setup beyond `postRegister`.
 *
 * Failure modes throw and prevent server start: `dependsOn` cycles,
 * missing `dependsOn` references, clone failures, `awaitInit`
 * rejection, duplicate `templatePath` in the manifest.
 */

import { StuffApi } from '../mud/api/stuff';
import type { Stuff } from '../mud/lib/stuff/Stuff';
import { Template } from '../mud/lib/stuff/Template';
import { bootstrapManifest } from '../mud/bootstrap';
import { PackApi } from '../mud/api/pack';
import { EventApi } from '../mud/api/event';
import { SecurityApi } from '../mud/api/security';
import {
  ExecutionContextApi,
  OMNI_SCOPE,
} from '../mud/api/execution-context';
import { PersistenceManager } from './PersistenceManager';
import { ApiLogic } from '../mud/lib/stuff/ApiLogic';
import Interactive from '../mud/obj/Interactive';
import PersistentHydrator from '../mud/obj/persistence/PersistentHydrator';
import Species from '../mud/obj/species/Species';
import BodyPlan from '../mud/obj/species/BodyPlan';
import Clade from '../mud/obj/species/Clade';
import Material from '../mud/lib/material/Material';
import Condition from '../mud/obj/Condition';
import { Modality } from '../mud/lib/perception/Modality';
import { CombatFormation } from '../mud/obj/CombatFormation';
import { LocomotionMode } from '../mud/obj/LocomotionMode';
import { Zone } from '../mud/lib/zone/Zone';
import { ShadowApi } from '../mud/api/shadow';
import { CommandApi } from '../mud/api/command';
import { GlobbableApi } from '../mud/api/glob';
import { registerSchedulerRegistryClass } from '../mud/api/scheduler';
import { registerWorldClockRegistryClass } from '../mud/api/worldclock';
import { registerMqlSubscriptionRegistryClass } from '../mud/api/mql-subscription';
import { registerCardRegistryClass } from '../mud/api/card';
import CardRegistry from '../mud/obj/CardRegistry';
import EventSubscriptions from '../mud/obj/EventSubscriptions';
import SchedulerRegistry from '../mud/obj/SchedulerRegistry';
import WorldClockRegistry from '../mud/obj/WorldClockRegistry';
import MqlSubscriptionRegistry from '../mud/obj/MqlSubscriptionRegistry';

/**
 * One entry in the engine bootstrap manifest. Owned by
 * `BootstrapManager` (the consumer of this shape); imported from
 * mudlib's `bootstrap.ts` so the data file can declare its array
 * with the right type.
 */
export interface BootstrapEntry {
  /**
   * Path of the template to clone — the identifier in the `content`
   * collection AND the runtime location of the resulting clone.
   * E.g., `/obj/EventRegistry`.
   *
   * Exactly one of `templatePath` / `templatePathPrefix` must be set.
   */
  templatePath?: string;

  /**
   * Prefix to expand into all strict descendants in the `content`
   * collection. The manager queries `Template.findDescendants(prefix)`
   * at boot and clones each match in depth-ascending order (shorter
   * paths first, so ancestor clades exist before their descendants).
   *
   * Useful for clusters of singletons that all need to be live but
   * shouldn't bloat the manifest — species clades, materials,
   * biomes. The prefix entry itself is NOT cloned (only descendants);
   * if the prefix node itself needs to exist, add a sibling
   * `templatePath` entry for it.
   *
   * `dependsOn` and `awaitInit` are not supported on prefix entries —
   * the depth-ascending order within the expansion stands in for
   * explicit deps, and per-clone async init isn't expressible when
   * the entry expands to N clones.
   *
   * Exactly one of `templatePath` / `templatePathPrefix` must be set.
   */
  templatePathPrefix?: string;

  /** Other entries' templatePaths that must complete before this. */
  dependsOn?: string[];

  /** Optional async init beyond `postRegister`'s sync surface. */
  awaitInit?: (clone: Stuff) => Promise<void>;
}

export class BootstrapManager {
  /**
   * Wire the framework's cross-module seams — the boot-lifecycle home
   * for what used to be module-scope registration statements (the
   * no-module-scope-statements rule): the four singleton-registry
   * class handoffs (each Logic lazy-creates its Registry for
   * harnesses that never run the manifest; the class can't be
   * value-imported there — cycle avoidance), the security↔shadow
   * slot, the shadow↔command recency bridge, and the glob
   * merge-on-arrival ripple. Idempotent — `run()` calls it every
   * time, and the vitest setup file calls it before every suite
   * (tests get the same wiring production does).
   */
  public static installFrameworkWiring(): void {
    EventApi._registerSubsClass(EventSubscriptions);
    registerSchedulerRegistryClass(SchedulerRegistry);
    registerWorldClockRegistryClass(WorldClockRegistry);
    registerMqlSubscriptionRegistryClass(MqlSubscriptionRegistry);
    registerCardRegistryClass(CardRegistry);
    SecurityApi._registerShadowApi(ShadowApi);
    CommandApi.installShadowBridge();
    GlobbableApi.installMergeOnArrival();
    // The sandbox scope resolver (Decision G): PM learns the ambient
    // circle scope through this injected closure — backend stays
    // import-clean of the mud layer's scope machinery, and the omni
    // sentinel collapses to null HERE so PM never knows the sentinel.
    PersistenceManager.get().setScopeResolver(() => {
      const scope = ExecutionContextApi.getCircleScope();
      return scope === OMNI_SCOPE ? null : scope;
    });
    // The sandbox boundary's infrastructure exemption (Decision J):
    // every ApiLogic singleton is boundary-exempt by base-class
    // identity (spoof-proof instanceof, late-bound here to keep
    // security.ts import-clean of the mud class graph). Interactive is
    // exempt too: the connection transport is out-of-world plumbing —
    // sockets attach to holders on either side of the boundary, and no
    // domain state rides an Interactive's surface.
    SecurityApi._registerBoundaryExemptBase(ApiLogic);
    SecurityApi._registerBoundaryExemptBase(Interactive);
    // Hydrators are shared, stateless engine singletons used as pure
    // functions BY the clone pipeline — a circle-context clone must be
    // able to call the one field-resident hydrator instance. (Found
    // live: without this, every clone inside a circle silently skipped
    // its hydration, so a wire body minted with no default loadout.)
    SecurityApi._registerBoundaryExemptBase(PersistentHydrator);
    // REFERENCE DATA — the closed, shared vocabularies every body reads
    // to know what it is, what it's made of, and how it moves. These
    // are commons, not world state: they are seeded, never mutated at
    // runtime, and the PM policy table REFUSEs writes to their rows, so
    // exempting them widens reads only.
    //
    // A body inside a circle must be able to read its own species or it
    // isn't animate — it can't walk, act, or leave (found live: the
    // wire body was refused `go` as "not currently animate", then
    // refused again on its clade's rank). This is the same category as
    // the enumerated catalogues above, expressed as base classes
    // because the instances are many and seeded, not enumerable by
    // hand. Keep the list to genuine vocabulary: anything a player can
    // change is world state and does not belong here.
    // Zone belongs to the same tier, for the same reason one step up:
    // a zone is the template tree's *classification* of a path, not
    // anything that happens at it. The circle's own wire-ness is a
    // Zone field (`/home`'s `wire: true`, inherited down the walk), so
    // the very question "am I inside a circle?" is a read of a
    // field-resident Zone — un-exempt, code inside a circle can't ask
    // it (found live: `eval` in-circle died on `lookupField`). Zone
    // rows are seeded, and the PM policy table governs writes to them
    // independently, so this widens reads only.
    for (const referenceBase of [
      Species,
      BodyPlan,
      Clade,
      LocomotionMode,
      Material,
      Modality,
      Condition,
      CombatFormation,
      Zone,
    ]) {
      SecurityApi._registerBoundaryExemptBase(referenceBase);
    }
  }

  /**
   * Run the engine manifest. Every entry is cloned through
   * `StuffApi.clone(...)` in dep-sorted order; `awaitInit` (if
   * provided) runs immediately after that entry's clone resolves.
   *
   * The default manifest is the UNION of the code manifest
   * (`mud/bootstrap.ts` — shrinking as packs take its entries, gone at
   * content-packs wave 3 step 7) and every applied pack's `boot:` list
   * (`PackApi.bootManifest`). A path present in both is the duplicate
   * error below — each move is one atomic edit.
   *
   * Visible for testing — accepts an optional manifest override.
   */
  public static async run(manifest?: BootstrapEntry[]): Promise<void> {
    BootstrapManager.installFrameworkWiring();
    manifest ??= [...bootstrapManifest, ...(await PackApi.bootManifest())];
    const expanded = await this.#expandPrefixEntries(manifest);
    const sorted = this.#topologicalSort(expanded);

    let reused = 0;
    for (const entry of sorted) {
      const path = entry.templatePath!; // expansion guarantees templatePath
      let clone: Stuff;
      // ⚠ A manifest singleton may already be RESIDENT: a lazy
      // `StuffApi.singleton` mint earlier in the boot (the content
      // installer resolving the wiki registry, whose postRegister asks
      // for the group registry) lands it before the manifest runs. A
      // second clone would leave two live instances at one path and
      // every `findByTemplatePath` throwing "expected singleton, found 2"
      // (found by the wave-2 drive). Reuse the resident one instead.
      const resident = StuffApi.findAllByTemplatePath(path);
      if (resident.length === 1) {
        clone = resident[0]!;
        reused += 1;
      } else {
      try {
        clone = await StuffApi.clone(path);
      } catch (cause) {
        throw new Error(
          `BootstrapManager: failed to clone '${path}': ` +
            (cause instanceof Error ? cause.message : String(cause)),
          { cause: cause as Error }
        );
      }

      }

      if (entry.awaitInit) {
        await entry.awaitInit(clone);
      }
    }

    console.info(
      `BootstrapManager: bootstrapped ${sorted.length} entr` +
        (sorted.length === 1 ? 'y' : 'ies') +
        (reused > 0 ? ` (${reused} already resident, reused)` : '')
    );
  }

  /**
   * Expand each `templatePathPrefix` entry into one synthetic
   * `templatePath` entry per descendant, sorted by path depth
   * ascending so ancestor clades land before their descendants.
   * Other entries pass through unchanged.
   *
   * Validates the shape constraints up front: exactly one of
   * `templatePath` / `templatePathPrefix`; no `dependsOn` /
   * `awaitInit` on prefix entries; expansion-collision dedup
   * (a descendant covered by both a prefix entry and an explicit
   * `templatePath` entry keeps the explicit one).
   */
  static async #expandPrefixEntries(
    manifest: BootstrapEntry[]
  ): Promise<BootstrapEntry[]> {
    // Two-pass:
    //   1. Pass-through explicit `templatePath` entries verbatim,
    //      tracking their paths in `explicitSeen`. Duplicate explicit
    //      paths fall through to `#topologicalSort`'s "duplicate
    //      templatePath" throw (author error).
    //   2. Expand `templatePathPrefix` entries via
    //      `Template.findDescendants`, dropping any descendant that
    //      collides with an explicit entry from pass 1 (explicit
    //      wins). Depth-ascending order so ancestor singletons land
    //      before their descendants.
    const out: BootstrapEntry[] = [];
    const explicitSeen = new Set<string>();

    for (const entry of manifest) {
      const hasPath = entry.templatePath !== undefined;
      const hasPrefix = entry.templatePathPrefix !== undefined;
      if (hasPath === hasPrefix) {
        throw new Error(
          `BootstrapManager: entry must set exactly one of ` +
            `templatePath / templatePathPrefix (got ${JSON.stringify(entry)})`
        );
      }
      if (hasPath) {
        explicitSeen.add(entry.templatePath!);
        out.push(entry);
      }
    }

    for (const entry of manifest) {
      if (entry.templatePathPrefix === undefined) continue;
      if (entry.dependsOn || entry.awaitInit) {
        throw new Error(
          `BootstrapManager: prefix entry '${entry.templatePathPrefix}' ` +
            `cannot specify dependsOn or awaitInit`
        );
      }
      const descendants = await Template.findDescendants(
        entry.templatePathPrefix
      );
      const paths = descendants
        .map((t) => t.path)
        .filter((p) => !explicitSeen.has(p))
        .sort((a, b) => {
          // Depth ascending (shorter paths first); within same depth,
          // alphabetical for stability.
          const da = a.split('/').length;
          const db = b.split('/').length;
          if (da !== db) return da - db;
          return a < b ? -1 : a > b ? 1 : 0;
        });
      for (const path of paths) {
        out.push({ templatePath: path });
      }
    }

    return out;
  }

  /**
   * Topologically sort the manifest by `dependsOn`. Throws on cycles
   * and on `dependsOn` references that point at no entry in the
   * manifest. Stable order: entries with no deps come out in their
   * original manifest order.
   */
  static #topologicalSort(manifest: BootstrapEntry[]): BootstrapEntry[] {
    // Input here is post-expansion: every entry has `templatePath` set
    // (prefix entries were converted to one-templatePath-per-descendant
    // upstream). Asserts simplify the lookups below.
    const byPath = new Map<string, BootstrapEntry>();
    for (const entry of manifest) {
      const path = entry.templatePath!;
      if (byPath.has(path)) {
        throw new Error(
          `BootstrapManager: duplicate templatePath in manifest: ` +
            `'${path}'`
        );
      }
      byPath.set(path, entry);
    }

    for (const entry of manifest) {
      for (const dep of entry.dependsOn ?? []) {
        if (!byPath.has(dep)) {
          throw new Error(
            `BootstrapManager: '${entry.templatePath}' depends on ` +
              `'${dep}', which is not in the manifest`
          );
        }
      }
    }

    const sorted: BootstrapEntry[] = [];
    const visited = new Set<string>();
    const onStack = new Set<string>();

    const visit = (entry: BootstrapEntry): void => {
      const path = entry.templatePath!;
      if (visited.has(path)) return;
      if (onStack.has(path)) {
        throw new Error(
          `BootstrapManager: dependency cycle involving '${path}'`
        );
      }
      onStack.add(path);
      for (const dep of entry.dependsOn ?? []) {
        visit(byPath.get(dep)!);
      }
      onStack.delete(path);
      visited.add(path);
      sorted.push(entry);
    };

    for (const entry of manifest) visit(entry);
    return sorted;
  }
}
