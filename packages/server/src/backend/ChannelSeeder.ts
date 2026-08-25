/**
 * ChannelSeeder — populate the `channels` collection from a single
 * seed YAML containing the standalone roster (Help / Global / Chat).
 *
 * Insert-only / idempotent — matches `EmoteSeeder` and `SeederManager`.
 * Channels are matched by `name`; existing records are left alone.
 * Author edits via `chat rename` survive subsequent boots.
 *
 * Standalone channels need no backing Group (audience = every player
 * minus the future banlist); the `memberIds` array stays empty.
 *
 * Source file is at `mud/config/channels.yaml` (NOT under `mud/seeds/`):
 * Channel records aren't Stuff templates and don't belong in the
 * `content` collection that `SeederManager` walks. Same reasoning as
 * EmoteSeeder.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { Channel, type ChannelKind } from '../mud/lib/social/Channel';
import Subject from '../mud/lib/forum/Subject';

interface ChannelSeedEntry {
  name: string;
  kind?: ChannelKind;
  owner?: string;
}

interface ChannelSeedOptions {
  /** Override the seed YAML path; defaults to mud/config/channels.yaml. */
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
      // Identity + audience live on a Subject now. Seeded standalones are
      // open (empty groupRef); mint the open Subject, then a free-chat
      // Channel that manifests it. Idempotent: an existing same-title
      // Subject is reused (a prior partial seed).
      const subjectTitle = entry.name;
      let subject = (await Subject.find({ title: subjectTitle }))[0];
      if (!subject) {
        subject = new Subject();
        subject.title = subjectTitle;
        subject.owner = entry.owner ?? '';
        subject.groupRef = '';
        subject.grain = 'venue';
        await subject.save();
      }
      const c = new Channel();
      c.name = entry.name;
      c.kind = entry.kind ?? 'open-join-standalone';
      c.subject = subject._id ?? '';
      c.procedure = 'open';
      await c.save();
      subject.addManifestation('open-chat', c._id ?? '');
      await subject.save();
      inserted++;
    }
    console.info(
      `ChannelSeeder: ${inserted} new channel${inserted === 1 ? '' : 's'} from ${path}`,
    );
    return inserted;
  }

  static #defaultSeedPath(): string {
    const here = dirname(fileURLToPath(import.meta.url));
    return join(here, '../mud/config/channels.yaml');
  }
}
