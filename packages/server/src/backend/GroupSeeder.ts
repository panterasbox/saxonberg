/**
 * GroupSeeder — populate the `groups` collection with authored managed-group
 * memberships from a single config YAML (`mud/config/groups.yaml`).
 *
 * Insert/ensure — idempotent (matches ChannelSeeder / EmoteSeeder /
 * SeederManager). A group is matched by `name`; a missing one is created
 * (owner from the entry), and each declared member is ensured present. Existing
 * members and author edits made in-world (`group add`) survive subsequent
 * boots — a member is only (re)added if absent, and its role is set on that
 * first add.
 *
 * Why this exists: agent authority — an NPC acting for a parcel owner — is
 * checked as membership in the owning group. That membership must be CONFERRED
 * BY THE OWNER as authored data, not minted by the member in its own class code
 * (self-issued authority is circular: the agent is "authorized" only because it
 * wrote its own name into the ledger). This seeder is that owner-authored
 * conferral. See `docs/subsystems/residence.md` § provisioning authorization.
 *
 * Source at `mud/config/groups.yaml` (NOT under `mud/seeds/`): a `Group` is a
 * Document, not a Stuff template, so it doesn't belong in the `content`
 * collection that `SeederManager` walks — same reasoning as ChannelSeeder.
 *
 * `isMember` reads the group fresh from Mongo (no cache), so a direct
 * `Group.save()` here is authoritative; no provider change-notification is
 * needed at boot (nothing is subscribed yet).
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { Group, type GroupRole } from '../mud/lib/social/Group';

interface GroupMemberSeed {
  id: string;
  role?: GroupRole;
}

interface GroupSeedEntry {
  name: string;
  owner?: string;
  members?: GroupMemberSeed[];
}

interface GroupSeedOptions {
  /** Override the seed YAML path; defaults to mud/config/groups.yaml. */
  seedPath?: string;
}

export class GroupSeeder {
  public static async run(opts: GroupSeedOptions = {}): Promise<number> {
    const path = opts.seedPath ?? GroupSeeder.#defaultSeedPath();
    let raw: string;
    try {
      raw = readFileSync(path, 'utf-8');
    } catch {
      console.info(`GroupSeeder: no seed file at ${path}, skipping.`);
      return 0;
    }
    const parsed = YAML.parse(raw) as { groups?: GroupSeedEntry[] } | null;
    const entries = Array.isArray(parsed?.groups) ? parsed!.groups! : [];

    let changed = 0;
    for (const entry of entries) {
      if (!entry || typeof entry.name !== 'string' || entry.name.length === 0) {
        throw new Error(
          `GroupSeeder: malformed entry in ${path}: missing 'name'`,
        );
      }
      let group = (await Group.find({ name: entry.name }))[0];
      if (!group) {
        group = new Group();
        group.name = entry.name;
        group.owner = entry.owner ?? 'system';
        await group.save();
      }
      let dirty = false;
      for (const member of entry.members ?? []) {
        if (
          !member ||
          typeof member.id !== 'string' ||
          member.id.length === 0
        ) {
          throw new Error(
            `GroupSeeder: malformed member in group '${entry.name}' in ${path}`,
          );
        }
        if (group.addMember(member.id, member.role ?? 'member')) dirty = true;
      }
      if (dirty) {
        await group.save();
        changed++;
      }
    }
    console.info(
      `GroupSeeder: ${changed} group${changed === 1 ? '' : 's'} updated ` +
        `from ${path}`,
    );
    return changed;
  }

  static #defaultSeedPath(): string {
    const here = dirname(fileURLToPath(import.meta.url));
    return join(here, '../mud/config/groups.yaml');
  }
}
