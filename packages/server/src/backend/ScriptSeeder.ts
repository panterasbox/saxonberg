/**
 * ScriptSeeder — populate the `documents` collection from the authored
 * world recipe-/coroutine-scripts under `mud/domain/lounge/scripts/`.
 *
 * Insert-only / idempotent (mirrors `RecipeSeeder` / `EmoteSeeder`):
 * scripts are matched by their store `path`; existing records are left
 * alone. Each `<name>.script` file is seeded as a `kind: 'script'`
 * document at the path-addressed store key `/domain/lounge/scripts/<name>`
 * (world-managed content — the `/domain/` prefix selects the platform
 * resource tier in `ScriptLogic.resolveLimits`). The stored value is the
 * **source text** verbatim in `data.source` (re-parsed on resolution;
 * never compiled — the script-store decision), so the files double as the
 * human-editable CMS surface.
 *
 * These authored scripts are the *authored-as-content* exemplar (one of
 * the three authoring sources) and the `invokeByPath` targets (an
 * operator beat or an NPC bartender's brain). They are deliberately NOT
 * wired into `make <recipe>`: a player's own `make` resolves the
 * session `def` or the home recipe-script the demonstration ladder banked
 * — the world content here is the world author's parallel copy.
 *
 * Dev workflow when a `.script` changes:
 *   db.documents.deleteOne({path: '/domain/lounge/scripts/<name>'}); restart
 *
 * Runs in bootstrap alongside the other per-collection seeders, after
 * `PersistenceManager.connect` (indexes) and before `BootstrapManager.run`.
 */

import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';
import { StoredDocument } from '../mud/lib/document/StoredDocument';

interface ScriptSeedOptions {
  /** Override the seed directory; defaults to mud/domain/lounge/scripts. */
  seedDir?: string;
  /** Override the store-path prefix; defaults to /domain/lounge/scripts. */
  storePrefix?: string;
  /** Override the owner path stamped on seeded scripts. */
  owner?: string;
}

const DEFAULT_OWNER = '/domain/lounge';
const DEFAULT_PREFIX = '/domain/lounge/scripts';

export class ScriptSeeder {
  public static async run(opts: ScriptSeedOptions = {}): Promise<number> {
    const dir = opts.seedDir ?? ScriptSeeder.#defaultSeedDir();
    const prefix = opts.storePrefix ?? DEFAULT_PREFIX;
    const owner = opts.owner ?? DEFAULT_OWNER;

    let files: string[];
    try {
      files = readdirSync(dir).filter((f) => f.endsWith('.script'));
    } catch {
      console.info(`ScriptSeeder: no seed dir at ${dir}, skipping.`);
      return 0;
    }

    let inserted = 0;
    for (const file of files.sort()) {
      const name = basename(file, '.script');
      const path = `${prefix}/${name}`;
      const existing = await StoredDocument.findByPath(path);
      if (existing) continue;
      const source = readFileSync(join(dir, file), 'utf-8');
      const doc = new StoredDocument();
      doc.path = path;
      doc.owner = owner;
      doc.kind = 'script';
      doc.data = { source };
      await doc.save();
      inserted++;
    }
    console.info(
      `ScriptSeeder: ${inserted} new script${inserted === 1 ? '' : 's'} from ${dir}`,
    );
    return inserted;
  }

  static #defaultSeedDir(): string {
    const here = dirname(fileURLToPath(import.meta.url));
    return join(here, '../mud/domain/lounge/scripts');
  }
}
