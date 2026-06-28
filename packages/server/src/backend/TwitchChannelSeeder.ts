/**
 * TwitchChannelSeeder — populate the `twitch_channels` collection from
 * `mud/config/twitch.yaml`. Insert-only / idempotent (matched on
 * `broadcasterId`), mirroring `ChannelSeeder`. Multiple entries = multiple
 * relayed channels. Operator edits to an already-seeded row don't re-seed.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { TwitchChannel } from '../mud/lib/twitch/TwitchChannel';

interface TwitchChannelSeedEntry {
  broadcasterId: string;
  broadcasterLogin: string;
  label?: string;
}

interface TwitchChannelSeedOptions {
  /** Override the seed YAML path; defaults to mud/config/twitch.yaml. */
  seedPath?: string;
}

export class TwitchChannelSeeder {
  public static async run(opts: TwitchChannelSeedOptions = {}): Promise<number> {
    const path = opts.seedPath ?? TwitchChannelSeeder.#defaultSeedPath();
    let raw: string;
    try {
      raw = readFileSync(path, 'utf-8');
    } catch {
      console.info(`TwitchChannelSeeder: no seed file at ${path}, skipping.`);
      return 0;
    }
    const parsed = YAML.parse(raw) as
      | { channels?: TwitchChannelSeedEntry[] }
      | TwitchChannelSeedEntry[]
      | null;
    const entries: TwitchChannelSeedEntry[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.channels)
        ? parsed!.channels!
        : [];

    let inserted = 0;
    for (const entry of entries) {
      if (
        !entry ||
        typeof entry.broadcasterId !== 'string' ||
        entry.broadcasterId.length === 0 ||
        typeof entry.broadcasterLogin !== 'string' ||
        entry.broadcasterLogin.length === 0
      ) {
        throw new Error(
          `TwitchChannelSeeder: malformed entry in ${path}: ` +
            `needs 'broadcasterId' + 'broadcasterLogin'`
        );
      }
      const existing = await TwitchChannel.find({
        broadcasterId: entry.broadcasterId,
      });
      if (existing.length > 0) continue;
      const c = new TwitchChannel();
      c.broadcasterId = entry.broadcasterId;
      c.broadcasterLogin = entry.broadcasterLogin.toLowerCase();
      c.label = entry.label ?? '';
      await c.save();
      inserted++;
    }
    console.info(
      `TwitchChannelSeeder: ${inserted} new channel${
        inserted === 1 ? '' : 's'
      } from ${path}`
    );
    return inserted;
  }

  static #defaultSeedPath(): string {
    const here = dirname(fileURLToPath(import.meta.url));
    return join(here, '../mud/config/twitch.yaml');
  }
}
