/**
 * BootstrapManager — clone runtime instances from manifest entries
 * after `SeederManager` has populated the `domain` collection.
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
import { EventApi } from '../mud/api/event';
import { SecurityApi } from '../mud/api/security';
import { ShadowApi } from '../mud/api/shadow';
import { CommandApi } from '../mud/api/command';
import { GlobbableApi } from '../mud/api/glob';
import { registerSchedulerRegistryClass } from '../mud/api/scheduler';
import { registerWorldClockRegistryClass } from '../mud/api/worldclock';
import { registerMqlSubscriptionRegistryClass } from '../mud/api/mql-subscription';
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
   * Path of the template to clone — the identifier in the `domain`
   * collection AND the runtime location of the resulting clone.
   * E.g., `/obj/EventRegistry`.
   *
   * Exactly one of `templatePath` / `templatePathPrefix` must be set.
   */
  templatePath?: string;

  /**
   * Prefix to expand into all strict descendants in the `domain`
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
    SecurityApi._registerShadowApi(ShadowApi);
    CommandApi.installShadowBridge();
    GlobbableApi.installMergeOnArrival();
  }

  /**
   * Run the engine manifest. Every entry is cloned through
   * `StuffApi.clone(...)` in dep-sorted order; `awaitInit` (if
   * provided) runs immediately after that entry's clone resolves.
   *
   * Visible for testing — accepts an optional manifest override.
   */
  public static async run(
    manifest: BootstrapEntry[] = bootstrapManifest
  ): Promise<void> {
    BootstrapManager.installFrameworkWiring();
    const expanded = await this.#expandPrefixEntries(manifest);
    const sorted = this.#topologicalSort(expanded);

    for (const entry of sorted) {
      const path = entry.templatePath!; // expansion guarantees templatePath
      let clone: Stuff;
      try {
        clone = await StuffApi.clone(path);
      } catch (cause) {
        throw new Error(
          `BootstrapManager: failed to clone '${path}': ` +
            (cause instanceof Error ? cause.message : String(cause)),
          { cause: cause as Error }
        );
      }

      if (entry.awaitInit) {
        await entry.awaitInit(clone);
      }
    }

    console.info(
      `BootstrapManager: bootstrapped ${sorted.length} entr` +
        (sorted.length === 1 ? 'y' : 'ies')
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
