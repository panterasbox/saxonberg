/**
 * Group — managed-provider Document for a named, persistent collection
 * of player references. Lives in `Collections.Groups`.
 *
 * Membership is stored as two index-aligned parallel arrays:
 *   - `memberIds[i]` — a player reference (Avatar `playerId` for v1).
 *   - `memberRoles[i]` — one of `'owner' | 'admin' | 'member'`.
 *
 * The parallel-arrays shape (over a marshalled `Map`) honors the
 * persistence rule's preference for scalars / arrays-of-scalars and
 * makes Mongo queries (`{ memberIds: someId }`) trivial. The
 * `addMember` / `removeMember` / `setMemberRole` methods are the only
 * external mutation surface; direct array writes bypass the invariant
 * checks.
 *
 * NOT for: query-driven groups (use the MQL provider), per-Avatar
 * personal lists (use ContactsMixin), or runtime-only ad-hoc
 * groups (the requirements doc reserves "ad-hoc Group" as a flagged
 * lifetime variant of the managed provider; v1 ships ad-hoc state
 * inside `ChannelCatalogue` instead).
 */

import { Document } from '../persistence/Document';
import type { FieldMeta } from '../mixin';
import { Collections } from '../persistence/Collections';

export type GroupRole = 'owner' | 'admin' | 'member';

/**
 * Who owns a managed group — a typed principal, the `ParcelOwner`
 * shape one collection over:
 *  - `system` — seeded structure (the core/wizards/streamers groups, the
 *    parcel-title mint-or-find groups). Owned by nobody.
 *  - `player` — the creator: an Avatar `templatePath`.
 *  - `office` — a government OFFICE (slate A25: offices are heads,
 *    committees are hands). Ownership resolves on read through
 *    `CompactApi.holdsOffice`, so handing the seat hands the group with
 *    no data migration.
 * `GroupApi.ownsGroup` is the one resolution; nothing compares this
 * field by hand.
 */
export type GroupOwner =
  | { kind: 'system' }
  | { kind: 'player'; templatePath: string }
  | { kind: 'office'; office: string };

const VALID_ROLES: ReadonlySet<GroupRole> = new Set([
  'owner',
  'admin',
  'member',
]);

export class Group extends Document {
  static collectionName = Collections.Groups;
  static fieldMeta: FieldMeta = {
    name: { persistent: true },
    owner: { persistent: true },
    memberIds: { persistent: true },
    memberRoles: { persistent: true },
  };

  /** Human-readable name. Unique-indexed at the collection level. */
  name: string = '';

  /** The owning principal. See {@link GroupOwner}. */
  owner: GroupOwner = { kind: 'system' };

  static systemOwner(): GroupOwner {
    return { kind: 'system' };
  }
  static playerOwner(templatePath: string): GroupOwner {
    return { kind: 'player', templatePath };
  }
  static officeOwner(office: string): GroupOwner {
    return { kind: 'office', office };
  }

  /**
   * The stored owner, typed. A row's `owner` is always the typed
   * `GroupOwner` (there is no other writer); anything else is corrupt
   * and says so rather than being read as something it is not.
   */
  static ownerFromStored(raw: unknown): GroupOwner {
    if (raw && typeof raw === 'object' && typeof (raw as GroupOwner).kind === 'string') {
      return raw as GroupOwner;
    }
    throw new Error(`Group.owner is not a GroupOwner: ${JSON.stringify(raw)}`);
  }

  /**
   * Index-aligned with `memberRoles`. Each entry is a player reference
   * (playerId for an Avatar; future kinds may use other prefixes).
   * Mutations go through `addMember` / `removeMember` /
   * `setMemberRole`.
   */
  memberIds: string[] = [];

  /** Index-aligned with `memberIds`. One of `GroupRole`. */
  memberRoles: GroupRole[] = [];

  /** Bulk-read membership as a Map. Snapshot copy. */
  getMembership(): ReadonlyMap<string, GroupRole> {
    const out = new Map<string, GroupRole>();
    for (let i = 0; i < this.memberIds.length; i++) {
      out.set(this.memberIds[i]!, this.memberRoles[i]!);
    }
    return out;
  }

  /** Returns true if the member was added; false if already present. */
  addMember(id: string, role: GroupRole = 'member'): boolean {
    if (!VALID_ROLES.has(role)) {
      throw new Error(`Group.addMember: invalid role '${role}'`);
    }
    if (this.memberIds.includes(id)) return false;
    this.memberIds.push(id);
    this.memberRoles.push(role);
    return true;
  }

  /** Returns true if a member was removed. */
  removeMember(id: string): boolean {
    const idx = this.memberIds.indexOf(id);
    if (idx < 0) return false;
    this.memberIds.splice(idx, 1);
    this.memberRoles.splice(idx, 1);
    return true;
  }

  /** Returns true if the role changed. */
  setMemberRole(id: string, role: GroupRole): boolean {
    if (!VALID_ROLES.has(role)) {
      throw new Error(`Group.setMemberRole: invalid role '${role}'`);
    }
    const idx = this.memberIds.indexOf(id);
    if (idx < 0) return false;
    if (this.memberRoles[idx] === role) return false;
    this.memberRoles[idx] = role;
    return true;
  }

  /** Returns the role of `id` in this group, or `null` if not a member. */
  roleOf(id: string): GroupRole | null {
    const idx = this.memberIds.indexOf(id);
    if (idx < 0) return null;
    return this.memberRoles[idx] ?? null;
  }

  isMember(id: string): boolean {
    return this.memberIds.includes(id);
  }
}
