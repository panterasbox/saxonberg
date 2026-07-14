/**
 * SubjectCatalogue — the Subject-layer runtime view. Covers the Wave 0
 * acceptance criteria at the catalogue level:
 *
 *   - `makeSubject` mints a managed group by default (curated); `--group`
 *     binds a ref and `--open` leaves it empty, both minting nothing.
 *   - `make` on a taken / reserved title throws.
 *   - case-insensitive title resolve.
 *   - per-subject follow / mute tunes all surfaces / silences one.
 *   - legacy per-channel subscription migrates onto the per-subject store.
 *   - `visibleSubjects`: open to everyone, ref-backed to members.
 *
 * Mongo + GroupApi are faked in-memory.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import SubjectCatalogue from '../SubjectCatalogue';
import { Idea } from '../../lib/stuff/Idea';
import { PropertiedMixin } from '../../lib/stuff/Propertied';
import { SubjectSubscriberMixin } from '../../lib/forum/SubjectSubscriber';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../lib/security/__tests__/test-setup';
import { PersistenceManager } from '../../../backend/PersistenceManager';
import { StuffApi } from '../../api/stuff';
import { PlayerApi } from '../../api/player';
import { GroupApi } from '../../api/group';
import type Avatar from '../Avatar';

// ---- In-memory multi-collection PM ----------------------------------

let store: Map<string, Map<string, Record<string, unknown>>>;
let idCounter: number;

function col(name: string): Map<string, Record<string, unknown>> {
  let c = store.get(name);
  if (!c) {
    c = new Map();
    store.set(name, c);
  }
  return c;
}

// ---- Propertied avatar double ---------------------------------------

class FakeAvatar extends SubjectSubscriberMixin(PropertiedMixin(Idea)) {
  private _playerId: string;
  constructor(playerId = 'p-anon') {
    super();
    this._playerId = playerId;
  }
  getPlayerId(): string {
    return this._playerId;
  }
}

function makeAvatar(playerId: string): Avatar {
  // Stable path per playerId — group membership keys on templatePath, so two
  // avatars with the same playerId must share `/obj/Avatar/<playerId>`.
  return makeStuffAtPath(
    () => new FakeAvatar(playerId),
    `/obj/Avatar/${playerId}`,
  ) as unknown as Avatar;
}

// Group membership the GroupApi mock answers from: managed ref -> playerIds.
let groupMembers: Map<string, Set<string>>;

beforeEach(() => {
  StuffApi.clearAll();
  store = new Map();
  idCounter = 0;
  groupMembers = new Map();

  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'save').mockImplementation(
    async (collection: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
      col(collection).set(id, { ...doc, _id: id });
      return id;
    }
  );
  vi.spyOn(pm, 'find').mockImplementation(
    async (collection: string, query: Record<string, unknown>) =>
      [...col(collection).values()].filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v)
      ) as never
  );
  vi.spyOn(pm, 'findById').mockImplementation(
    async (collection: string, id: string) =>
      (col(collection).get(id) ?? null) as never
  );
  vi.spyOn(pm, 'delete').mockImplementation(async (collection: string, id: string) => {
    col(collection).delete(id);
  });

  // Treat FakeAvatar as an Avatar for identity resolution.
  vi.spyOn(PlayerApi, 'isAvatarStuff').mockImplementation(
    (s: unknown): s is Avatar => s instanceof FakeAvatar
  );

  // GroupApi: managed:<groupId> membership answered from groupMembers,
  // seeded by makeSubject's mint (owner is a member). parseRef splits on ':'.
  vi.spyOn(GroupApi, 'parseRef').mockImplementation((ref: string) => {
    const idx = ref.indexOf(':');
    return { source: ref.slice(0, idx), id: ref.slice(idx + 1) };
  });
  vi.spyOn(GroupApi, 'isMember').mockImplementation(
    async (playerId: string, ref: string) =>
      groupMembers.get(ref)?.has(playerId) ?? false
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

function makeCatalogue(): SubjectCatalogue {
  return makeStuff(() => new SubjectCatalogue());
}

// When makeSubject mints a managed group, mirror its membership into the
// GroupApi mock so isMember answers correctly. The group doc lives in the
// `groups` collection; its ref is `managed:<_id>`.
function syncGroupMembership(): void {
  for (const [id, doc] of col('groups')) {
    const ids = (doc.memberIds as string[]) ?? [];
    groupMembers.set(`managed:${id}`, new Set(ids));
  }
}

describe('SubjectCatalogue.makeSubject', () => {
  it('mints a managed group by default (curated)', async () => {
    const cat = makeCatalogue();
    const owner = makeAvatar('p1');
    const subject = await cat.makeSubject(owner, 'Gossip');
    expect(subject.getOwner()).toBe('p1');
    expect(subject.isOpen()).toBe(false);
    expect(subject.getGroupRef().startsWith('managed:')).toBe(true);
    // A backing group row was minted, owner-owned.
    expect(col('groups').size).toBe(1);
    expect([...cat.getBackingGroupIds()].length).toBe(1);
  });

  it('--open leaves the groupRef empty, minting nothing', async () => {
    const cat = makeCatalogue();
    const subject = await cat.makeSubject(makeAvatar('p1'), 'Global', {
      open: true,
    });
    expect(subject.isOpen()).toBe(true);
    expect(col('groups').size).toBe(0);
  });

  it('--group binds an existing ref, minting nothing', async () => {
    const cat = makeCatalogue();
    const subject = await cat.makeSubject(makeAvatar('p1'), 'Guildhall', {
      groupRef: 'guild:knights',
    });
    expect(subject.getGroupRef()).toBe('guild:knights');
    expect(col('groups').size).toBe(0);
    // Not chat-owned (non-managed) — no backing-group bookkeeping.
    expect([...cat.getBackingGroupIds()].length).toBe(0);
  });

  it('throws on a taken title (case-insensitive)', async () => {
    const cat = makeCatalogue();
    await cat.makeSubject(makeAvatar('p1'), 'Gossip', { open: true });
    await expect(
      cat.makeSubject(makeAvatar('p2'), 'gossip', { open: true })
    ).rejects.toThrow(/already exists/);
  });

  it('throws on a reserved title', async () => {
    const cat = makeCatalogue();
    await expect(
      cat.makeSubject(makeAvatar('p1'), 'list', { open: true })
    ).rejects.toThrow(/Reserved/);
  });

  it('resolves by title case-insensitively', async () => {
    const cat = makeCatalogue();
    const made = await cat.makeSubject(makeAvatar('p1'), 'Gossip', {
      open: true,
    });
    const found = await cat.resolveByTitle('GOSSIP');
    expect(found?._id).toBe(made._id);
  });
});

describe('SubjectCatalogue subscriptions', () => {
  it('follow toggles, mute silences one surface without un-following', async () => {
    const cat = makeCatalogue();
    const subject = await cat.makeSubject(makeAvatar('p1'), 'Gossip', {
      open: true,
    });
    const av = makeAvatar('p2');
    const sid = subject._id!;

    // Default: followed, nothing muted.
    expect(cat.getSubscription(av, sid)).toEqual({
      followed: true,
      mutedSurfaces: [],
    });

    cat.follow(av, sid, false);
    expect(cat.getSubscription(av, sid).followed).toBe(false);

    cat.follow(av, sid, true);
    cat.mute(av, sid, 'free-chat', true);
    const sub = cat.getSubscription(av, sid);
    expect(sub.followed).toBe(true);
    expect(sub.mutedSurfaces).toEqual(['free-chat']);

    cat.mute(av, sid, 'free-chat', false);
    expect(cat.getSubscription(av, sid).mutedSurfaces).toEqual([]);
  });

  it('migrates a legacy per-channel subscription onto the per-subject store', async () => {
    const cat = makeCatalogue();
    const subject = await cat.makeSubject(makeAvatar('p1'), 'Gossip', {
      open: true,
    });
    const av = makeAvatar('p2');
    const sid = subject._id!;

    const migrated = cat.migrateLegacySubscription(av, sid, {
      tunedIn: false,
      muted: true,
    });
    expect(migrated).toEqual({ followed: false, mutedSurfaces: ['free-chat'] });

    // Idempotent: a second migrate doesn't clobber the now-set value.
    const again = cat.migrateLegacySubscription(av, sid, {
      tunedIn: true,
      muted: false,
    });
    expect(again).toEqual({ followed: false, mutedSurfaces: ['free-chat'] });
  });
});

describe('SubjectCatalogue.visibleSubjects', () => {
  it('shows open subjects to everyone, ref-backed only to members', async () => {
    const cat = makeCatalogue();
    await cat.makeSubject(makeAvatar('p1'), 'Global', { open: true });
    await cat.makeSubject(makeAvatar('p1'), 'Guild');
    syncGroupMembership(); // owner p1 is in the Guild group

    const insider = makeAvatar('p1');
    const outsider = makeAvatar('p2');

    const insiderTitles = (await cat.visibleSubjects(insider)).map((s) =>
      s.getTitle()
    );
    expect(insiderTitles).toContain('Global');
    expect(insiderTitles).toContain('Guild');

    const outsiderTitles = (await cat.visibleSubjects(outsider)).map((s) =>
      s.getTitle()
    );
    expect(outsiderTitles).toContain('Global');
    expect(outsiderTitles).not.toContain('Guild');
  });
});
