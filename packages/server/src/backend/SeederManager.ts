/**
 * SeederManager — populate the `domain` collection with engine
 * templates from disk.
 *
 * Walks `packages/server/seeds/` recursively for `.yaml` files. Each
 * file's path (relative to `seeds/`, with `.yaml` stripped, prefixed
 * with `/`) becomes its MQL template path. For each template the
 * seeder inserts the parsed YAML into `Collections.Domain` ONLY when
 * no document exists at that path — re-runs are idempotent, existing
 * docs are left alone.
 *
 * Insert-only by design. Schema migrations on already-seeded
 * templates are out of scope; the dev workflow for "I changed the
 * seed YAML" is `db.domain.deleteOne({path}); restart`.
 *
 * Runs in `main()` BEFORE `BootstrapManager` so every template the
 * bootstrap manifest references already exists in Mongo.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';
import YAML from 'yaml';
import { Collections, PersistenceManager } from './PersistenceManager';

interface SeederOptions {
  /** Override the seeds directory; defaults to `packages/server/seeds`. */
  seedsDir?: string;
}

export class SeederManager {
  /**
   * Walk the seeds directory and insert any missing templates into
   * the `domain` collection. Resolves with the count of newly
   * inserted templates (zero on subsequent runs).
   */
  public static async run(opts: SeederOptions = {}): Promise<number> {
    const seedsDir = opts.seedsDir ?? this.#defaultSeedsDir();
    const collection = PersistenceManager.get().getCollection(
      Collections.Domain
    );

    let inserted = 0;
    for (const file of this.#walkYaml(seedsDir)) {
      const path = this.#fileToTemplatePath(seedsDir, file);

      const existing = await collection.findOne({ path });
      if (existing) continue;

      const raw = readFileSync(file, 'utf-8');
      const parsed = YAML.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error(
          `SeederManager: malformed YAML at ${file}: expected an object document`
        );
      }
      await collection.insertOne({ ...parsed, path });
      inserted++;
    }

    console.log(
      `SeederManager: ${inserted} new template${inserted === 1 ? '' : 's'} ` +
        `inserted from ${seedsDir}`
    );
    return inserted;
  }

  /**
   * Default seeds dir relative to this module. Source layout:
   * `packages/server/src/backend/SeederManager.ts` →
   * `packages/server/seeds/`.
   */
  static #defaultSeedsDir(): string {
    const here = dirname(fileURLToPath(import.meta.url));
    return join(here, '../../seeds');
  }

  /**
   * Recursively yield `.yaml` files under `dir`. Symlinks are followed
   * via `statSync`'s default behaviour. Files starting with `.` are
   * skipped so `.gitkeep` and friends don't try to parse.
   */
  static *#walkYaml(dir: string): Generator<string> {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      // Empty / missing seeds dir is fine — nothing to seed.
      return;
    }
    for (const entry of entries) {
      if (entry.startsWith('.')) continue;
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        yield* this.#walkYaml(full);
      } else if (st.isFile() && entry.endsWith('.yaml')) {
        yield full;
      }
    }
  }

  /**
   * Map a seed file path to its MQL template path. `seeds/obj/X.yaml`
   * → `/obj/X`.
   */
  static #fileToTemplatePath(seedsDir: string, file: string): string {
    const rel = relative(seedsDir, file);
    const noExt = rel.replace(/\.yaml$/, '');
    // Normalize Windows-style separators just in case.
    const slashed = noExt.split(/[\\/]/).join('/');
    return '/' + slashed;
  }
}
