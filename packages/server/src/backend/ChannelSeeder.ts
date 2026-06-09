/**
 * ChannelSeeder — populate the `channels` collection from a single
 * seed YAML containing the standalone roster (Help / Global / Chat).
 *
 * Insert-only / idempotent — matches `EmoteSeeder` and `SeederManager`.
 * Channels are matched by `name`; existing records are left alone.
 * Author edits via `chat rename` survive subsequent boots.
 *
 * Standalone channels need no backing Group (audience = every player
 * minus the future banlist); `backingGroupRef` stays empty.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { Channel, type ChannelKind } from '../mud/lib/social/Channel';

interface ChannelSeedEntry {
  name: string;
  kind?: ChannelKind;
  owner?: string;
  backingGroupRef?: string;
}

interface ChannelSeedOptions {
  /** Override the seed YAML path; defaults to mud/seeds/social/channels.yaml. */
  seedPath?: string;
}

export class ChannelSeeder {
  public static async run(opts: ChannelSeedOptions = {}): Promise<number> {
    const path = opts.seedPath ?? ChannelSeeder.#defaultSeedPath();
    let raw: string;
    try {
      raw = readFileSync(path, 'utf-8');
    } catch {
      console.info(`ChannelSeeder: no seed file at ${path}, skipping.`);
      return 0;
    }
    const parsed = YAML.parse(raw) as { channels?: ChannelSeedEntry[] } | ChannelSeedEntry[] | null;
    const entries: ChannelSeedEntry[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.channels)
      ? parsed!.channels!
      : [];

    let inserted = 0;
    for (const entry of entries) {
      if (!entry || typeof entry.name !== 'string' || entry.name.length === 0) {
        throw new Error(`ChannelSeeder: malformed entry in ${path}: missing 'name'`);
      }
      const existing = await Channel.find({ name: entry.name });
      if (existing.length > 0) continue;
      const c = new Channel();
      c.name = entry.name;
      c.kind = entry.kind ?? 'open-join-standalone';
      c.backingGroupRef = entry.backingGroupRef ?? '';
      c.owner = entry.owner ?? '';
      await c.save();
      inserted++;
    }
    console.info(
      `ChannelSeeder: ${inserted} new channel${inserted === 1 ? '' : 's'} from ${path}`,
    );
    return inserted;
  }

  static #defaultSeedPath(): string {
    const here = dirname(fileURLToPath(import.meta.url));
    return join(here, '../mud/seeds/social/channels.yaml');
  }
}
