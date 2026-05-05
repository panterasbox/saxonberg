/**
 * BootstrapManager — clone runtime instances from manifest entries
 * after `SeederManager` has populated the `domain` collection.
 *
 * The manifest is a TS array imported from `mud/bootstrap`.
 * Each entry names a template path; the manager topologically sorts
 * by `dependsOn` and clones each entry in order. `awaitInit` runs
 * after the clone for entries needing async setup beyond
 * `postRegister`.
 *
 * Failure modes throw and prevent server start: dependsOn cycles,
 * missing dependsOn references, clone failures, awaitInit rejection,
 * targetPath !== templatePath (not yet supported).
 */

import { StuffApi } from '../mud/api/stuff';
import type { Stuff } from '../mud/lib/stuff/Stuff';
import { bootstrapManifest, type BootstrapEntry } from '../mud/bootstrap';

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

    console.log(
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
