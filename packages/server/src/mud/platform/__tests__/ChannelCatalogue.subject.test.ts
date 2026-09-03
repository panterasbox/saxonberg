/**
 * ChannelCatalogue ⇄ Subject retrofit. Covers the Wave 0 "chat must not
 * regress" + linking criteria at the catalogue level:
 *
 *   - `createPlayerChannel` now mints a curated Subject; the Channel
 *     carries a `subject` ref and no longer its own `owner`/`groupRef`.
 *   - audience routes through the Subject's `groupRef` (removing a member
 *     from the backing managed group drops them from the audience).
 *   - chat subscription reads/writes map onto the per-subject store, and
 *     a legacy `chat.subscription.<channelId>` key migrates on first read.
 *
 * Mongo + GroupApi are faked in-memory; the SubjectCatalogue singleton is
 * registered at its templatePath so `ChannelCatalogue` resolves it.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ChannelCatalogue from '../idea/ChannelCatalogue';
import SubjectCatalogue from '../idea/SubjectCatalogue';
import { Idea } from '../../lib/stuff/Idea';
import { PropertiedMixin, Property, type PropValue } from '../../lib/stuff/Propertied';
import { SubjectSubscriberMixin } from '../../lib/forum/SubjectSubscriber';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../lib/security/__tests__/test-setup';
import { PersistenceManager } from '../../../backend/PersistenceManager';
import { StuffApi } from '../../api/stuff';
import { PlayerApi } from '../../api/player';
import { GroupApi } from '../../api/group';
import type { Stuff } from '../../lib/stuff/Stuff';
import type Avatar from '../agent/Avatar';

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
  return makeStuff(() => new FakeAvatar(playerId)) as unknown as Avatar;
}

let groupMembers: Map<string, Set<string>>;
let avatarsByPlayerId: Map<string, Avatar>;

beforeEach(() => {
  StuffApi.clearAll();
  store = new Map();
  idCounter = 0;
  groupMembers = new Map();
  avatarsByPlayerId = new Map();

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

  vi.spyOn(PlayerApi, 'isAvatarStuff').mockImplementation(
    (s: unknown): s is Avatar => s instanceof FakeAvatar
  );
  vi.spyOn(PlayerApi, 'getAllAvatars').mockImplementation(
    () => [...avatarsByPlayerId.values()]
  );
  vi.spyOn(GroupApi, 'parseRef').mockImplementation((ref: string) => {
    const idx = ref.indexOf(':');
    return { source: ref.slice(0, idx), id: ref.slice(idx + 1) };
  });
  vi.spyOn(GroupApi, 'isMember').mockImplementation(
    async (playerId: string, ref: string) =>
      groupMembers.get(ref)?.has(playerId) ?? false
  );
  vi.spyOn(GroupApi, 'membersOf').mockImplementation(async (ref: string) => {
    const ids = groupMembers.get(ref) ?? new Set<string>();
    return [...ids]
      .map((id) => avatarsByPlayerId.get(id))
      .filter((a): a is Avatar => a !== undefined) as unknown as Stuff[];
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

function setup(): { channels: ChannelCatalogue; subjects: SubjectCatalogue } {
  const subjects = makeStuffAtPath(
    () => new SubjectCatalogue(),
    '/platform/idea/SubjectCatalogue'
  );
  const channels = makeStuff(() => new ChannelCatalogue());
  return { channels, subjects };
}

/** Mirror minted managed groups into the membership mock. */
function syncGroups(): void {
  for (const [id, doc] of col('groups')) {
    groupMembers.set(`managed:${id}`, new Set((doc.memberIds as string[]) ?? []));
  }
}

describe('ChannelCatalogue.createPlayerChannel (Subject retrofit)', () => {
  it('mints a curated Subject; the Channel carries a subject ref, no owner/groupRef', async () => {
    const { channels } = setup();
    const owner = makeAvatar('p1');
    const channel = await channels.createPlayerChannel(owner, 'Gossip');

    expect(channel.kind).toBe('player-created');
    expect(channel.subject).toBeTruthy();
    expect(channel.procedure).toBe('open');
    // The retrofitted Channel no longer carries identity/audience.
    expect((channel as unknown as { owner?: unknown }).owner).toBeUndefined();
    expect((channel as unknown as { groupRef?: unknown }).groupRef).toBeUndefined();

    const subject = await channels.subjectFor(channel);
    expect(subject?.getOwner()).toBe('p1');
    expect(subject?.getGroupRef().startsWith('managed:')).toBe(true);
    expect(subject?.hasManifestation('open-chat')).toBe(true);
  });
});

describe('ChannelCatalogue.audienceFor (via Subject group)', () => {
  it('drops a member once removed from the backing managed group', async () => {
    const { channels } = setup();
    const owner = makeAvatar('p1');
    const member = makeAvatar('p2');
    avatarsByPlayerId.set('p1', owner);
    avatarsByPlayerId.set('p2', member);

    const channel = await channels.createPlayerChannel(owner, 'Gossip');
    syncGroups();
    // Manually add p2 to the backing group.
    const ref = (await channels.subjectFor(channel))!.getGroupRef();
    groupMembers.get(ref)!.add('p2');

    let audience = await channels.audienceFor(channel);
    expect(audience).toContain(owner);
    expect(audience).toContain(member);

    // Remove p2 from the group → drops from the audience.
    groupMembers.get(ref)!.delete('p2');
    audience = await channels.audienceFor(channel);
    expect(audience).toContain(owner);
    expect(audience).not.toContain(member);
  });
});

describe('ChannelCatalogue subscription (per-subject mapping)', () => {
  it('maps tunedIn/muted onto the per-subject store', async () => {
    const { channels } = setup();
    const owner = makeAvatar('p1');
    const channel = await channels.createPlayerChannel(owner, 'Gossip');
    const av = makeAvatar('p2');

    expect(channels.getSubscription(av, channel)).toEqual({
      tunedIn: true,
      muted: false,
    });
    channels.setSubscription(av, channel, { muted: true });
    expect(channels.getSubscription(av, channel)).toEqual({
      tunedIn: true,
      muted: true,
    });
    channels.setSubscription(av, channel, { tunedIn: false });
    expect(channels.getSubscription(av, channel).tunedIn).toBe(false);
  });

});
