/**
 * Shape of a single bootstrap entry. Read by `BootstrapManager.run()`
 * after `SeederManager` has populated the `domain` collection from
 * disk; each entry names a template path to clone at server start.
 *
 * Most entries will have just `templatePath`. `dependsOn` lets one
 * entry require another to complete first; `awaitInit` lets an entry
 * do async setup beyond `postRegister`'s sync surface.
 *
 * Mods will append their own arrays to the engine manifest using
 * the same shape — no special mod-specific mechanism.
 */

import type { Stuff } from '../lib/stuff/Stuff';

export interface BootstrapEntry {
  /** MQL template path — e.g., `/obj/EventRegistry`. */
  templatePath: string;

  /**
   * Where the clone lives in MQL. Defaults to `templatePath`. The
   * initial implementation throws "not yet supported" if this differs
   * from `templatePath` — clones are placed at their template path.
   */
  targetPath?: string;

  /** Other entries' `templatePath`s that must complete before this. */
  dependsOn?: string[];

  /** Optional async init beyond `postRegister`'s sync surface. */
  awaitInit?: (clone: Stuff) => Promise<void>;
}
