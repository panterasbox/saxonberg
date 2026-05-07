/**
 * AppBootstrap — orchestrates the full app boot sequence so
 * `index.ts` stays a thin entry point.
 *
 * Owns the dependency chain across the backend's prep systems:
 * Mongo connect → seeders → PM hooks → command YAML preload →
 * runtime-instance manifest. Each underlying manager keeps its
 * narrow scope (`SeederManager` seeds, `BootstrapManager` runs the
 * manifest, etc.); this class is just the sequencer.
 *
 * Throws on any step's failure; the entry point catches and exits.
 * Exit-code policy lives at the entry point, not here.
 */

import { PersistenceManager } from './PersistenceManager';
import { SeederManager } from './SeederManager';
import { BootstrapManager } from './BootstrapManager';
import { CommandApi } from '../mud/api/command';

export interface AppBootstrapConfig {
  /** Mongo connection URI. */
  mongoUri: string;
  /** Database name within the Mongo cluster. */
  dbName: string;
}

export class AppBootstrap {
  /**
   * Run the boot sequence in dependency order. Every step must
   * complete before the next begins; any failure throws and stops
   * boot.
   *
   * Sequence:
   *
   *   1. Mongo connect — every later step touches PM.
   *
   *   2. Seed templates from disk into `domain` (idempotent —
   *      existing docs are left alone). Runs FIRST after connect
   *      because PM.loadHooks below clones the DomainHook template
   *      out of `domain`, and the bootstrap manifest may reference
   *      other seeded templates too.
   *
   *   3. Load PM hooks (folder/leaf invariant on Collections.Domain,
   *      etc.) — clones the seeded hook templates and registers
   *      them with the persistence pipeline. Seeds must exist
   *      before this runs.
   *
   *      Controllers are not pre-loaded; dispatch clones a fresh
   *      one per command via `StuffApi.clone('/obj/command/<Name>')`.
   *
   *   4. Preload command YAMLs and resolve each `validators: [...]`
   *      spec into a live function. Validators are inert until this
   *      runs (`runValidators` early-returns on absent
   *      `_resolvedValidators`), so this MUST happen before the
   *      server accepts traffic.
   *
   *   5. Bootstrap runtime instances from the engine manifest.
   *      All prior steps must be complete; failures here prevent
   *      boot.
   */
  public static async run(config: AppBootstrapConfig): Promise<void> {
    console.info(`Connecting to MongoDB database '${config.dbName}'...`);
    await PersistenceManager.get().connect(config.mongoUri, config.dbName);
    console.info('MongoDB connection successful');

    await SeederManager.run();

    await PersistenceManager.get().loadHooks();

    const cmd = await CommandApi.preloadAll();
    if (cmd.failed.length > 0) {
      throw new Error(
        `CommandApi.preloadAll: ${cmd.failed.length} command(s) failed: ` +
          cmd.failed.join(', ')
      );
    }
    console.info(`CommandApi: ${cmd.loaded} command YAML(s) preloaded`);

    await BootstrapManager.run();
  }
}
