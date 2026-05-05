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
import { bootstrapManifest } from '../mud/bootstrap';

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
   */
  templatePath: string;

  /** Other entries' templatePaths that must complete before this. */
  dependsOn?: string[];

  /** Optional async init beyond `postRegister`'s sync surface. */
  awaitInit?: (clone: Stuff) => Promise<void>;
}

export class BootstrapManager {
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
    const sorted = this.#topologicalSort(manifest);

    for (const entry of sorted) {
      let clone: Stuff;
      try {
        clone = await StuffApi.clone(entry.templatePath);
      } catch (cause) {
        throw new Error(
          `BootstrapManager: failed to clone '${entry.templatePath}': ` +
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
   * Topologically sort the manifest by `dependsOn`. Throws on cycles
   * and on `dependsOn` references that point at no entry in the
   * manifest. Stable order: entries with no deps come out in their
   * original manifest order.
   */
  static #topologicalSort(manifest: BootstrapEntry[]): BootstrapEntry[] {
    const byPath = new Map<string, BootstrapEntry>();
    for (const entry of manifest) {
      if (byPath.has(entry.templatePath)) {
        throw new Error(
          `BootstrapManager: duplicate templatePath in manifest: ` +
            `'${entry.templatePath}'`
        );
      }
      byPath.set(entry.templatePath, entry);
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
      if (visited.has(entry.templatePath)) return;
      if (onStack.has(entry.templatePath)) {
        throw new Error(
          `BootstrapManager: dependency cycle involving ` +
            `'${entry.templatePath}'`
        );
      }
      onStack.add(entry.templatePath);
      for (const dep of entry.dependsOn ?? []) {
        visit(byPath.get(dep)!);
      }
      onStack.delete(entry.templatePath);
      visited.add(entry.templatePath);
      sorted.push(entry);
    };

    for (const entry of manifest) visit(entry);
    return sorted;
  }
}
