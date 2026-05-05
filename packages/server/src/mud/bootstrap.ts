/**
 * Engine bootstrap manifest. Each entry names a template the engine
 * must clone at server start. `BootstrapManager` topo-sorts by
 * `dependsOn` and clones each entry; cycles and missing deps throw
 * and prevent boot.
 *
 * Mods append their own entries to this array before
 * `BootstrapManager.run()` fires (when the modding subsystem lands).
 */

import type { Stuff } from './lib/stuff/Stuff';

export interface BootstrapEntry {
  /**
   * Path of the template to clone — the identifier in the `domain`
   * collection AND the runtime location of the resulting clone.
   * Each bootstrapped singleton lives at its own template path; we
   * don't currently support cloning one template into a different
   * runtime location.
   */
  templatePath: string;

  /** Other entries' `templatePath`s that must complete before this. */
  dependsOn?: string[];

  /** Optional async init beyond `postRegister`'s sync surface. */
  awaitInit?: (clone: Stuff) => Promise<void>;
}

export const bootstrapManifest: BootstrapEntry[] = [
  { templatePath: '/obj/EventRegistry' },
];
