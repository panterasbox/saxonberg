/**
 * SubjectCatalogue — singleton Idea owning all Subject runtime state.
 *
 * The Subject layer's runtime view, mirroring `ChannelCatalogue` for
 * chat. The Subject Documents in `forum_subjects` are the source of
 * truth; this catalogue warms them at boot and serves resolution +
 * subscription reads/writes off in-memory indexes.
 *
 * Owns:
 *   - `byId: Map<subjectId, Subject>` and `byTitle: Map<lowerTitle,
 *     Subject>` — the resolution caches, warmed at `postRegister` via
 *     `Subject.find({})`.
 *   - The reserved-name set (lifted from `ChannelCatalogue.RESERVED_NAMES`
 *     — a subject title MUST NOT collide with a subcommand word).
 *   - The per-subject subscription store (`follow` + per-surface `mute`),
 *     keyed on `subjectId` via a `PropertiedMixin` key on the Avatar.
 *     This subsumes chat's former per-channel subscription state.
 *   - The set of managed Group `_id`s minted to back curated subjects
 *     (the `getBackingGroupIds` bookkeeping, lifted from chat).
 *
 * Audience membership is read **read-only** through `GroupApi` — a
 * subject is a CONSUMER of the group substrate, never a provider. A
 * backing managed Group is minted ONLY for the curated case; bound /
 * open subjects mint nothing.
 *
 * Not persisted itself; seed YAML is `{ class: /obj/SubjectCatalogue,
 * data: {} }`.
 */

import { Idea } from '../lib/stuff/Idea';
import { PostRegistrationMixin } from '../lib/stuff/PostRegistration';
import Subject, {
  type SubjectSurface,
} from '../lib/forum/Subject';
import type { SubjectSubscription } from '../lib/forum/SubjectSubscriber';
import { Group, type GroupRole } from '../lib/social/Group';
import type { GroupRef } from '../lib/social/GroupProvider';
import type { Stuff } from '../lib/stuff/Stuff';
import { PlayerApi } from '../api/player';
import { GroupApi } from '../api/group';
import type Avatar from './Avatar';
import type { VetoResult } from '../lib/errors';

/**
 * Per-subject subscription state lives on the owner via
 * {@link SubjectSubscriberMixin} (typed keyed store, persisted with the
 * Avatar). Re-exported here so callers keep importing it from the
 * SubjectCatalogue surface.
 */
export type { SubjectSubscription };

const DEFAULT_SUBSCRIPTION: SubjectSubscription = {
  followed: true,
  mutedSurfaces: [],
};

/** Options for `makeSubject`. Default (neither flag) mints a curated managed group. */
export interface MakeSubjectOptions {
  /** Bind an existing `guild:`/`mql:`/`contacts:`/`managed:` ref; mint nothing. */
  groupRef?: GroupRef;
  /** Leave `groupRef` empty — open to every player. */
  open?: boolean;
  /**
   * Extra members for the curated managed group (beyond the owner) — used
   * when promoting an ad-hoc cohort into a curated subject. Ignored for
   * the bound / open cases.
   */
  curatedMembers?: { id: string; role: GroupRole }[];
}

const SubjectCatalogueBase = PostRegistrationMixin(Idea);

export default class SubjectCatalogue extends SubjectCatalogueBase {

  /**
   * Residency veto - a load-bearing process-lifetime singleton is
   * never culled by the self-eviction sweep.
   */
  public canEvict(): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }
  private byId: Map<string, Subject> | null = null;
  private byTitle: Map<string, Subject> = new Map();
  private backedGroupIds: Set<string> = new Set();

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.warmCache();
  }

  public async warmCache(): Promise<void> {
    const subjects = await Subject.find({});
    const byId = new Map<string, Subject>();
    const byTitle = new Map<string, Subject>();
    const backed = new Set<string>();
    for (const s of subjects) {
      if (s._id) byId.set(s._id, s);
      byTitle.set(s.title.toLowerCase(), s);
      const backingId = backingGroupIdOf(s);
      if (backingId) backed.add(backingId);
    }
    this.byId = byId;
    this.byTitle = byTitle;
    this.backedGroupIds = backed;
  }

  public invalidateCache(): void {
    // Null the gate (byId) AND clear byTitle so neither map can be read
    // stale before the next ensureCache re-warms both.
    this.byId = null;
    this.byTitle.clear();
  }

  /** Resolve a subject by its flat-global title handle (case-insensitive). */
  public async resolveByTitle(title: string): Promise<Subject | null> {
    await this.ensureCache();
    return this.byTitle.get(title.toLowerCase()) ?? null;
  }

  /** Resolve a subject by `_id`. */
  public async resolveById(id: string): Promise<Subject | null> {
    await this.ensureCache();
    return this.byId?.get(id) ?? null;
  }

  /**
   * Resolve a thread-subject by its board-scoped handle
   * (`board/thread`). The board-scoped handle is stored as the subject's
   * flat `title` (`<boardTitle>/<threadName>`), so this delegates to the
   * title index.
   */
  public async resolveBoardScoped(
    boardTitle: string,
    threadName: string,
  ): Promise<Subject | null> {
    return this.resolveByTitle(`${boardTitle}/${threadName}`);
  }

  /**
   * Create a new subject. Default (no opts) mints a managed Group with
   * `owner` as the sole owner — the curated case. `opts.groupRef` binds
   * an existing ref (mints nothing); `opts.open` leaves it empty.
   *
   * Throws on a reserved or taken title.
   */
  public async makeSubject(
    owner: Stuff,
    title: string,
    opts: MakeSubjectOptions = {},
  ): Promise<Subject> {
    const trimmed = title.trim();
    if (!trimmed) throw new Error('A subject needs a title.');
    if (RESERVED_NAMES.has(trimmed.toLowerCase())) {
      throw new Error(`Reserved name '${trimmed}' — pick another.`);
    }
    const existing = await this.resolveByTitle(trimmed);
    if (existing) {
      throw new Error(`A subject named '${trimmed}' already exists.`);
    }
    const ownerId = avatarPlayerIdOf(owner);

    let groupRef: GroupRef = '';
    if (opts.open) {
      groupRef = '';
    } else if (opts.groupRef) {
      groupRef = opts.groupRef;
    } else {
      // Curated: mint a backing managed group, owner-owned (plus any
      // extra cohort members from a promotion).
      const ids = [ownerId, ...(opts.curatedMembers ?? []).map((m) => m.id)];
      const roles: GroupRole[] = [
        'owner',
        ...(opts.curatedMembers ?? []).map((m) => m.role),
      ];
      const group = await this.mintBackingGroup(trimmed, ownerId, ids, roles);
      groupRef = `managed:${group._id}`;
      this.backedGroupIds.add(group._id!);
    }

    const s = new Subject();
    s.title = trimmed;
    s.owner = ownerId;
    s.groupRef = groupRef;
    s.grain = 'venue';
    await s.save();
    this.indexSubject(s);
    return s;
  }

  /**
   * Mint a thread-grain subject under a parent (board) subject. The
   * board-scoped handle (`<parentTitle>/<threadName>`) becomes the flat
   * `title`; audience inherits the parent's `groupRef`. Used by thread
   * promotion (Wave 1).
   */
  public async makeThreadSubject(
    owner: Stuff,
    parent: Subject,
    threadName: string,
  ): Promise<Subject> {
    const seg = threadName.trim();
    if (!seg) throw new Error('A thread subject needs a name.');
    const handle = `${parent.getTitle()}/${seg}`;
    const existing = await this.resolveByTitle(handle);
    if (existing) {
      throw new Error(`A thread subject '${handle}' already exists.`);
    }
    const s = new Subject();
    s.title = handle;
    s.owner = avatarPlayerIdOf(owner);
    s.groupRef = parent.getGroupRef();
    s.grain = 'topic';
    s.parentSubject = parent._id ?? null;
    s.boardScopedName = seg;
    await s.save();
    this.indexSubject(s);
    return s;
  }

  /** Persist a surface light-up on a subject and refresh the cache. */
  public async addManifestation(
    subject: Subject,
    surface: SubjectSurface,
    ref: string,
  ): Promise<void> {
    subject.addManifestation(surface, ref);
    await subject.save();
    this.indexSubject(subject);
  }

  /**
   * Subjects visible to `actor`: open subjects always; ref-backed
   * subjects only when the actor is a member. Mirrors the former
   * `ChannelCatalogue.visibleChannels` policy at subject grain.
   */
  public async visibleSubjects(actor: Stuff): Promise<Subject[]> {
    await this.ensureCache();
    const playerId = PlayerApi.isAvatarStuff(actor) ? actor.getPlayerId() : '';
    const out: Subject[] = [];
    for (const s of this.byTitle.values()) {
      if (s.state !== 'active') continue;
      if (s.isOpen()) {
        out.push(s);
        continue;
      }
      if (!playerId) continue;
      if (await GroupApi.isMember(playerId, s.getGroupRef())) out.push(s);
    }
    return out;
  }

  /** True when `actor` is in `subject`'s audience (open ⇒ everyone). */
  public async isAudienceMember(actor: Stuff, subject: Subject): Promise<boolean> {
    if (subject.isOpen()) return true;
    const playerId = PlayerApi.isAvatarStuff(actor) ? actor.getPlayerId() : '';
    if (!playerId) return false;
    return GroupApi.isMember(playerId, subject.getGroupRef());
  }

  // --- Subscription store -------------------------------------------

  public getSubscription(avatar: Avatar, subjectId: string): SubjectSubscription {
    return readSubscription(avatar, subjectId);
  }

  public setSubscription(
    avatar: Avatar,
    subjectId: string,
    next: Partial<SubjectSubscription>,
  ): SubjectSubscription {
    const current = readSubscription(avatar, subjectId);
    const merged: SubjectSubscription = {
      followed: next.followed ?? current.followed,
      mutedSurfaces: next.mutedSurfaces ?? current.mutedSurfaces,
    };
    avatar.setSubjectSubscription(subjectId, merged);
    return merged;
  }

  /** Follow / unfollow — one toggle tunes the actor into all lit surfaces. */
  public follow(avatar: Avatar, subjectId: string, followed: boolean): SubjectSubscription {
    return this.setSubscription(avatar, subjectId, { followed });
  }

  /** Mute / unmute a single surface without un-following. */
  public mute(
    avatar: Avatar,
    subjectId: string,
    surface: SubjectSurface,
    muted: boolean,
  ): SubjectSubscription {
    const current = readSubscription(avatar, subjectId);
    const set = new Set(current.mutedSurfaces);
    if (muted) set.add(surface);
    else set.delete(surface);
    return this.setSubscription(avatar, subjectId, {
      mutedSurfaces: [...set],
    });
  }

  /**
   * Port a legacy per-channel `{tunedIn, muted}` subscription onto the
   * per-subject store, idempotently. Called lazily by `ChannelCatalogue`
   * on first subscription read for a retrofitted channel: if the
   * per-subject key is unset but a legacy value is supplied, write it
   * through (mapping `tunedIn → followed`, `muted → free-chat in
   * mutedSurfaces`). A no-op once the per-subject key exists.
   */
  public migrateLegacySubscription(
    avatar: Avatar,
    subjectId: string,
    legacy: { tunedIn: boolean; muted: boolean },
  ): SubjectSubscription {
    if (avatar.hasSubjectSubscription(subjectId)) {
      return readSubscription(avatar, subjectId);
    }
    return this.setSubscription(avatar, subjectId, {
      followed: legacy.tunedIn,
      mutedSurfaces: legacy.muted ? ['free-chat'] : [],
    });
  }

  // --- Group bookkeeping --------------------------------------------

  public getBackingGroupIds(): ReadonlySet<string> {
    return this.backedGroupIds;
  }

  /** Delete a subject (and its backing managed group, if curated). */
  public async deleteSubject(subject: Subject): Promise<void> {
    const backingId = backingGroupIdOf(subject);
    if (backingId) {
      const g = await Group.findById(backingId);
      if (g) await g.delete();
      this.backedGroupIds.delete(backingId);
    }
    if (subject._id) {
      this.byId?.delete(subject._id);
    }
    this.byTitle.delete(subject.title.toLowerCase());
    await subject.delete();
  }

  /**
   * Rename a subject's title handle (and its backing managed group, if
   * curated). Throws on a reserved or taken new title.
   */
  public async renameSubject(subject: Subject, newTitle: string): Promise<void> {
    const trimmed = newTitle.trim();
    if (!trimmed) throw new Error('A subject needs a title.');
    if (RESERVED_NAMES.has(trimmed.toLowerCase())) {
      throw new Error(`Reserved name '${trimmed}' — pick another.`);
    }
    const clash = await this.resolveByTitle(trimmed);
    if (clash && clash._id !== subject._id) {
      throw new Error(`A subject named '${trimmed}' already exists.`);
    }
    const oldKey = subject.title.toLowerCase();
    subject.setTitle(trimmed);
    await subject.save();
    const backingId = backingGroupIdOf(subject);
    if (backingId) {
      const g = await Group.findById(backingId);
      if (g) {
        g.name = trimmed;
        await g.save();
      }
    }
    this.byTitle.delete(oldKey);
    this.indexSubject(subject);
  }

  public reservedNames(): ReadonlySet<string> {
    return RESERVED_NAMES;
  }

  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        'SubjectCatalogue is a system singleton and cannot be destructed; ' +
        'use forceDestruct (admin-gated) if you really mean it',
    };
  }

  private async mintBackingGroup(
    name: string,
    ownerId: string,
    memberIds: string[],
    memberRoles: GroupRole[],
  ): Promise<Group> {
    const g = new Group();
    g.name = name;
    g.owner = ownerId;
    // Go through addMember (not bulk field-writes) so each role is
    // validated and the two parallel arrays stay index-aligned.
    for (let i = 0; i < memberIds.length; i++) {
      g.addMember(memberIds[i]!, memberRoles[i]);
    }
    await g.save();
    return g;
  }

  private indexSubject(s: Subject): void {
    if (s._id) {
      if (!this.byId) this.byId = new Map();
      this.byId.set(s._id, s);
    }
    this.byTitle.set(s.title.toLowerCase(), s);
  }

  private async ensureCache(): Promise<void> {
    if (this.byId) return;
    await this.warmCache();
  }
}

const RESERVED_NAMES: ReadonlySet<string> = new Set([
  'list',
  'make',
  'on',
  'follow',
  'unfollow',
  'mute',
  'unmute',
  'who',
  'rename',
  'disband',
  'promote',
  'post',
  'reply',
  'read',
  'vote',
]);

function readSubscription(avatar: Avatar, subjectId: string): SubjectSubscription {
  const raw = avatar.getSubjectSubscription(subjectId);
  if (!raw) {
    return { followed: DEFAULT_SUBSCRIPTION.followed, mutedSurfaces: [] };
  }
  return {
    followed:
      typeof raw.followed === 'boolean'
        ? raw.followed
        : DEFAULT_SUBSCRIPTION.followed,
    mutedSurfaces: Array.isArray(raw.mutedSurfaces)
      ? [...raw.mutedSurfaces]
      : [],
  };
}

function avatarPlayerIdOf(s: Stuff): string {
  if (PlayerApi.isAvatarStuff(s)) return s.getPlayerId();
  return s.stuffId;
}

/**
 * Extract the backing-Group `_id` from a subject's `groupRef`. Returns
 * null when the ref is empty (open) or points at a non-managed source
 * (guild / mql / contacts — those groups aren't owned by the subject
 * layer).
 */
function backingGroupIdOf(s: Subject): string | null {
  if (!s.groupRef) return null;
  try {
    const { source, id } = GroupApi.parseRef(s.groupRef);
    if (source !== 'managed') return null;
    return id;
  } catch {
    return null;
  }
}
