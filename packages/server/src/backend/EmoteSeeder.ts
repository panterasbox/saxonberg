/**
 * EmoteSeeder — populate the `emotes` collection from a single seed
 * YAML containing the starter roster.
 *
 * Insert-only by design (mirrors `SeederManager`). Re-runs are
 * idempotent — emotes are matched by `verb`; existing records are
 * left alone. Author edits via `soul edit` survive subsequent boots.
 *
 * Dev workflow when the seed YAML changes:
 *   db.emotes.deleteOne({verb: '<name>'}); restart
 *
 * Runs in `main()` after `PersistenceManager.connect` (which creates
 * the indexes) and before `BootstrapManager.run` (which warms the
 * `SoulCatalogue` singleton; the catalogue then reads the just-
 * populated collection).
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { Emote } from '../mud/lib/social/Emote';
import type { EmoteGrammar } from '../mud/lib/social/EmoteGrammar';

interface EmoteSeedEntry {
  verb: string;
  aliases?: string[];
  grammar: EmoteGrammar;
  echo?: 'default' | 'always' | 'never';
  emoji?: string;
  tags?: string[];
}

interface EmoteSeedOptions {
  /** Override the seed YAML path; defaults to mud/seeds/social/emotes.yaml. */
  seedPath?: string;
}

export class EmoteSeeder {
  public static async run(opts: EmoteSeedOptions = {}): Promise<number> {
    const path = opts.seedPath ?? EmoteSeeder.#defaultSeedPath();
    let raw: string;
    try {
      raw = readFileSync(path, 'utf-8');
    } catch {
      // No seed file is fine — nothing to insert.
      console.info(`EmoteSeeder: no seed file at ${path}, skipping.`);
      return 0;
    }
    const parsed = YAML.parse(raw) as { emotes?: EmoteSeedEntry[] } | EmoteSeedEntry[] | null;
    const entries: EmoteSeedEntry[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.emotes)
      ? parsed!.emotes!
      : [];
    let inserted = 0;
    for (const entry of entries) {
      if (!entry || typeof entry.verb !== 'string' || entry.verb.length === 0) {
        throw new Error(`EmoteSeeder: malformed entry in ${path}: missing 'verb'`);
      }
      if (!entry.grammar || typeof entry.grammar.template !== 'string') {
        throw new Error(
          `EmoteSeeder: emote '${entry.verb}' missing required 'grammar.template'`,
        );
      }
      const existing = await Emote.find({ verb: entry.verb.toLowerCase() });
      if (existing.length > 0) continue;
      const e = new Emote();
      e.verb = entry.verb.toLowerCase();
      e.aliases = (entry.aliases ?? []).map((a) => a.toLowerCase());
      e.grammar = entry.grammar;
      e.echo = entry.echo ?? 'default';
      if (entry.emoji !== undefined) e.emoji = entry.emoji;
      e.tags = entry.tags ?? [];
      await e.save();
      inserted++;
    }
    console.info(
      `EmoteSeeder: ${inserted} new emote${inserted === 1 ? '' : 's'} from ${path}`,
    );
    return inserted;
  }

  static #defaultSeedPath(): string {
    const here = dirname(fileURLToPath(import.meta.url));
    return join(here, '../mud/seeds/social/emotes.yaml');
  }
}
