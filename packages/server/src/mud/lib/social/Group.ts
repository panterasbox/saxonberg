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

export type GroupRole = 'owner' | 'admin' | 'member';

const VALID_ROLES: ReadonlySet<GroupRole> = new Set([
  'owner',
  'admin',
  'member',
]);

export class Group extends Document {
  static collectionName = 'groups';
  static fieldMeta: FieldMeta = {
    name: { persistent: true },
    owner: { persistent: true },
    memberIds: { persistent: true },
    memberRoles: { persistent: true },
  };

  /** Human-readable name. Unique-indexed at the collection level. */
  name: string = '';

  /** Player reference (playerId) of the creator / owner. */
  owner: string = '';

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
