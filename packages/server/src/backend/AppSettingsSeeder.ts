/**
 * AppSettingsSeeder — populate the `app_settings` singleton row from
 * `mud/config/app-settings.yaml`.
 *
 * Insert / merge-missing / idempotent — matches `EmoteSeeder` /
 * `ChannelSeeder`. The `app_settings` collection holds
 * one row (a `values` bag). On first boot the seeded values are inserted;
 * on later boots any keys NEW to the YAML are merged in, while keys an
 * operator changed via the `config` verb are left alone. The YAML is the
 * single source of the values — there are no code-side defaults.
 *
 * Source at `mud/config/app-settings.yaml` (NOT under `mud/seeds/`): these
 * are `Document` records, not Stuff templates, and don't belong in the
 * `content` collection `SeederManager` walks — same reasoning as EmoteSeeder.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { AppSettings } from '../mud/lib/config/AppSettings';

interface AppSettingSeedEntry {
  key: string;
  value: string;
}

interface AppSettingsSeedOptions {
  /** Override the seed YAML path; defaults to mud/config/app-settings.yaml. */
  seedPath?: string;
}

export class AppSettingsSeeder {
  /** Returns the number of keys newly added to the row. */
  public static async run(opts: AppSettingsSeedOptions = {}): Promise<number> {
    const path = opts.seedPath ?? AppSettingsSeeder.#defaultSeedPath();
    let raw: string;
    try {
      raw = readFileSync(path, 'utf-8');
    } catch {
      console.info(`AppSettingsSeeder: no seed file at ${path}, skipping.`);
      return 0;
    }
    const parsed = YAML.parse(raw) as
      | { settings?: AppSettingSeedEntry[] }
      | AppSettingSeedEntry[]
      | null;
    const entries: AppSettingSeedEntry[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.settings)
        ? parsed!.settings!
        : [];

    const rows = await AppSettings.find({});
    const doc = rows[0] ?? new AppSettings();

    let added = 0;
    for (const entry of entries) {
      if (!entry || typeof entry.key !== 'string' || entry.key.length === 0) {
        throw new Error(
          `AppSettingsSeeder: malformed entry in ${path}: missing 'key'`,
        );
      }
      // Merge-missing: only seed a key the row doesn't already carry, so an
      // operator's `config` change is never clobbered.
      if (doc.getValue(entry.key) === undefined) {
        doc.setValue(entry.key, String(entry.value));
        added++;
      }
    }
    if (added > 0) await doc.save();

    console.info(
      `AppSettingsSeeder: ${added} new setting${added === 1 ? '' : 's'} from ${path}`,
    );
    return added;
  }

  static #defaultSeedPath(): string {
    const here = dirname(fileURLToPath(import.meta.url));
    return join(here, '../mud/config/app-settings.yaml');
  }
}
