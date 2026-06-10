/**
 * NameBankSeeder — populate the `name_banks` collection from the
 * starter roster in `mud/config/name-banks.yaml`.
 *
 * Insert-only / idempotent (mirrors EmoteSeeder): banks are matched by
 * `key`; existing records are left alone, so author edits survive
 * reboots. Source file lives under `mud/config/` (NOT `mud/seeds/`):
 * NameBank records are plain `Document`s, not Stuff templates, so they
 * don't belong in the `domain` collection SeederManager walks.
 *
 * Runs in `AppBootstrap` after `PersistenceManager.connect` (indexes)
 * alongside EmoteSeeder, before the char-gen suggester reads the
 * collection.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { NameBank } from '../mud/lib/species/NameBank';

interface NameBankSeedEntry {
  key: string;
  given?: string[];
  surname?: string[];
  style?: string;
}

interface NameBankSeedOptions {
  /** Override the seed YAML path; defaults to mud/config/name-banks.yaml. */
  seedPath?: string;
}

export class NameBankSeeder {
  public static async run(opts: NameBankSeedOptions = {}): Promise<number> {
    const path = opts.seedPath ?? NameBankSeeder.defaultSeedPath();
    let raw: string;
    try {
      raw = readFileSync(path, 'utf-8');
    } catch {
      console.info(`NameBankSeeder: no seed file at ${path}, skipping.`);
      return 0;
    }
    const parsed = YAML.parse(raw) as
      | { banks?: NameBankSeedEntry[] }
      | NameBankSeedEntry[]
      | null;
    const entries: NameBankSeedEntry[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.banks)
        ? parsed!.banks!
        : [];

    let inserted = 0;
    for (const entry of entries) {
      if (!entry || typeof entry.key !== 'string' || entry.key.length === 0) {
        throw new Error(
          `NameBankSeeder: malformed entry in ${path}: missing 'key'`,
        );
      }
      const existing = await NameBank.find({ key: entry.key });
      if (existing.length > 0) continue;
      const bank = new NameBank();
      bank.key = entry.key;
      bank.given = entry.given ?? [];
      bank.surname = entry.surname ?? [];
      if (entry.style !== undefined) bank.style = entry.style;
      await bank.save();
      inserted++;
    }
    console.info(
      `NameBankSeeder: ${inserted} new name bank${inserted === 1 ? '' : 's'} from ${path}`,
    );
    return inserted;
  }

  private static defaultSeedPath(): string {
    const here = dirname(fileURLToPath(import.meta.url));
    return join(here, '../mud/config/name-banks.yaml');
  }
}
