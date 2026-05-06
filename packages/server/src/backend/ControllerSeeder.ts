/**
 * ControllerSeeder — populate the `domain` collection with one
 * Template per controller class shipped under `mud/obj/command/`.
 *
 * Walks `mud/obj/command/*.ts` (excluding `__tests__/`), derives the
 * controller name from the filename, and inserts
 * `{ path: '/obj/command/<Name>', class: '/obj/command/<Name>',
 *   data: {} }` when no document exists at that path. Idempotent —
 * re-runs leave existing docs alone.
 *
 * Why auto-discovery instead of per-controller seed YAMLs: controller
 * Templates are uniformly shaped (no varying data, no hydrator, class
 * field === path field). Maintaining one YAML per controller would be
 * pure boilerplate; the file-walk eliminates it.
 *
 * Runs in `main()` BEFORE `CommandApi.loadControllers` so every
 * controller path the loader queries already has a Template doc in
 * Mongo. Mirrors the SeederManager → loadHooks ordering.
 */

import { readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Collections, PersistenceManager } from './PersistenceManager';

interface ControllerSeederOptions {
  /** Override the controllers dir; defaults to `src/mud/obj/command/`. */
  controllersDir?: string;
}

export class ControllerSeeder {
  /**
   * Walk the controllers directory and insert any missing Templates
   * into the `domain` collection. Resolves with the count of newly
   * inserted templates (zero on subsequent runs).
   */
  public static async run(
    opts: ControllerSeederOptions = {}
  ): Promise<number> {
    const dir = opts.controllersDir ?? this.#defaultControllersDir();
    const collection = PersistenceManager.get().getCollection(
      Collections.Domain
    );

    let inserted = 0;
    for (const name of this.#discoverControllerNames(dir)) {
      const path = `/obj/command/${name}`;
      const existing = await collection.findOne({ path });
      if (existing) continue;
      await collection.insertOne({
        path,
        class: path,
        data: {},
      });
      inserted++;
    }

    console.info(
      `ControllerSeeder: ${inserted} new controller template${inserted === 1 ? '' : 's'} ` +
        `inserted from ${dir}`
    );
    return inserted;
  }

  /**
   * Default controllers dir relative to this module. Source layout:
   * `src/backend/ControllerSeeder.ts` → `src/mud/obj/command/`.
   */
  static #defaultControllersDir(): string {
    const here = dirname(fileURLToPath(import.meta.url));
    return join(here, '../mud/obj/command');
  }

  /**
   * Yield controller names by walking `dir`. A "controller" is any
   * top-level `.ts` file whose name ends in `Controller`. Test
   * directories and non-TS files are skipped.
   */
  static *#discoverControllerNames(dir: string): Generator<string> {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.startsWith('.')) continue;
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) continue; // skip __tests__ etc.
      if (!st.isFile()) continue;
      if (!entry.endsWith('.ts') && !entry.endsWith('.js')) continue;
      const name = entry.replace(/\.(ts|js)$/, '');
      if (!name.endsWith('Controller')) continue;
      yield name;
    }
  }
}
