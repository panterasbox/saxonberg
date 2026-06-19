/**
 * Subject — the linking spine between a surface and its audience.
 *
 * A persisted `Document` (the row IS the subject) in
 * `Collections.ForumSubjects`. The Subject lifts the identity + audience
 * that chat formerly split across `Channel.owner` + `Channel.groupRef` +
 * name into one record, so a single subject can light up *à la carte*
 * across the four surfaces (chat + forum, each in two flavors) while all
 * of them inherit one `groupRef` audience binding.
 *
 * Three audience bindings, mirroring chat's three channel kinds:
 *   - **curated** — a managed Group minted alongside the subject;
 *     `groupRef = 'managed:<groupId>'`. The `Subject.owner` gates
 *     mutations; the managed group carries owner/admin/member roles.
 *   - **bound** — an existing `guild:` / `mql:` / `contacts:` ref; the
 *     subject mints nothing, it just consumes the membership.
 *   - **open** — `groupRef` empty; audience is every player (chat tuned-in
 *     subscribers; forum: everyone can read).
 *
 * **Grain.** A subject manifests at one of two grains: a board-grain
 * **venue** (a standing Board / board-wide Channel, addressed by a
 * flat-global `title` handle) or a thread-grain **topic** (a promoted
 * Thread on a parent board, addressed by a board-scoped
 * `parentSubject/boardScopedName` handle). Cycle 1 exercises both.
 *
 * **Methods-only contract** — other Stuff reads/writes through the
 * accessor methods below, never the public fields (the Hydrator carve-out
 * aside). Persistent fields are public so the persistence layer can
 * reflect into them.
 */

import { Document } from '../persistence/Document';
import { Collections } from '../../../backend/PersistenceManager';
import type { GroupRef } from '../social/GroupProvider';

/**
 * The four forum/chat surfaces a subject can light up. A subject lights
 * up any non-empty subset, at most one of each. Cycle 1 implements
 * `popularity-forum` + `free-chat`; the other two are reserved surface
 * types (taxonomy ships now, behavior later).
 */
export type SubjectSurface =
  | 'popularity-forum'
  | 'argument-forum'
  | 'free-chat'
  | 'rules-chat';

/** One lit surface: which kind, and the backing Document's id. */
export interface SubjectManifestation {
  surface: SubjectSurface;
  /** `_id` of the backing `Board` (forum surfaces) or `Channel` (chat). */
  ref: string;
}

export type SubjectLifecycle = 'standing' | 'ephemeral';
export type SubjectState = 'active' | 'archived';
export type SubjectGrain = 'venue' | 'topic';

export default class Subject extends Document {
  static collectionName = Collections.ForumSubjects;
  static persistentFields = [
    'title',
    'owner',
    'groupRef',
    'lifecycleClass',
    'state',
    'manifestations',
    'grain',
    'parentSubject',
    'boardScopedName',
  ];

  /** Addressing handle. Flat-global + unique for venues; board-scoped for topics. */
  title = '';

  /** Player reference of the creator — the mutation gate (lifted from `Channel.owner`). */
  owner = '';

  /**
   * Audience binding (lifted from `Channel.groupRef`). Empty = open.
   * `'managed:<id>'` for the curated case, or any `GroupProvider` ref.
   */
  groupRef: GroupRef = '';

  /** Cycle 1 is always `'standing'`; the ephemeral lifecycle is deferred. */
  lifecycleClass: SubjectLifecycle = 'standing';

  /** `'active'` until the deferred archive cascade flips it. */
  state: SubjectState = 'active';

  /** The lit surfaces — 1..4, at most one of each kind. */
  manifestations: SubjectManifestation[] = [];

  /** Board-grain venue vs thread-grain promoted topic. */
  grain: SubjectGrain = 'venue';

  /** For `grain: 'topic'` — the `_id` of the parent (board) subject. Null for venues. */
  parentSubject: string | null = null;

  /** For `grain: 'topic'` — the board-scoped handle segment. Null for venues. */
  boardScopedName: string | null = null;

  // --- Methods-only contract ----------------------------------------

  getTitle(): string {
    return this.title;
  }

  setTitle(title: string): void {
    this.title = title;
  }

  getOwner(): string {
    return this.owner;
  }

  getGroupRef(): GroupRef {
    return this.groupRef;
  }

  /** True when this subject binds no group — open to every player. */
  isOpen(): boolean {
    return this.groupRef === '';
  }

  getGrain(): SubjectGrain {
    return this.grain;
  }

  getParentSubject(): string | null {
    return this.parentSubject;
  }

  getBoardScopedName(): string | null {
    return this.boardScopedName;
  }

  getManifestations(): readonly SubjectManifestation[] {
    return this.manifestations;
  }

  hasManifestation(surface: SubjectSurface): boolean {
    return this.manifestations.some((m) => m.surface === surface);
  }

  /** The backing-doc ref for a lit surface, or null when unlit. */
  manifestationRef(surface: SubjectSurface): string | null {
    return this.manifestations.find((m) => m.surface === surface)?.ref ?? null;
  }

  /**
   * Light up a surface (idempotent on `surface` — at most one of each).
   * Caller is responsible for persisting via `save()`.
   */
  addManifestation(surface: SubjectSurface, ref: string): void {
    const existing = this.manifestations.find((m) => m.surface === surface);
    if (existing) {
      existing.ref = ref;
      return;
    }
    this.manifestations.push({ surface, ref });
  }
}
