/**
 * ⭐ The channel gates live on the catalogue, asked with the actor
 * (controller-liquidity D9) — a bare caller that skips the controller is
 * refused exactly as the verb is: rename / anonymity / disband / chat-on
 * by a non-owner, history by a non-member, and an ad-hoc channel's
 * membership by the PERSON, never the lineage (D11).
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
import type Avatar from '../../lib/character/Avatar';

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
  override getIdentityPath(): string {
    return `/platform/agent/Avatar/${this._playerId}`;
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
  vi.spyOn(GroupApi, 'roleOf').mockResolvedValue(null);
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

describe('ChannelCatalogue — the gates are the catalogue\'s (D9)', () => {
  it('refuses a non-owner rename, anonymity and disband; the owner may', async () => {
    const { channels } = setup();
    const owner = makeAvatar('p1');
    const other = makeAvatar('p2');
    await channels.createPlayerChannel(owner, 'Gossip');

    expect(await channels.renamePlayerChannel(other, 'Gossip', 'Rumor')).toEqual({
      ok: false,
      reason: 'not-owner',
    });
    expect(await channels.setAnonymity(other, 'Gossip', 'forbidden')).toEqual({
      ok: false,
      reason: 'not-owner',
    });
    expect(await channels.disbandPlayerChannel(other, 'Gossip')).toEqual({
      ok: false,
      reason: 'not-owner',
    });
    // Nothing moved under the refusals.
    const c = await channels.resolveByName('Gossip');
    expect(c?.permitsAnonymity()).toBe(true);

    const set = await channels.setAnonymity(owner, 'Gossip', 'forbidden');
    expect(set.ok && set.channel.permitsAnonymity()).toBe(false);
    const renamed = await channels.renamePlayerChannel(owner, 'Gossip', 'Rumor');
    expect(renamed.ok && renamed.channel.name).toBe('Rumor');
    expect((await channels.disbandPlayerChannel(owner, 'Rumor')).ok).toBe(true);
    expect(await channels.resolveByName('Rumor')).toBeNull();
  });

  it("admits the audience group's owner role (a party captain who did not found it)", async () => {
    const { channels } = setup();
    const founder = makeAvatar('p1');
    const captain = makeAvatar('p3');
    await channels.createPlayerChannel(founder, 'Crew');
    vi.mocked(GroupApi.roleOf).mockImplementation(async (key: string) =>
      key === 'p3' ? 'owner' : null,
    );
    expect((await channels.disbandPlayerChannel(captain, 'Crew')).ok).toBe(true);
  });

  it('refuses a rename onto a reserved word or a taken name, after the owner gate', async () => {
    const { channels } = setup();
    const owner = makeAvatar('p1');
    await channels.createPlayerChannel(owner, 'Gossip');
    await channels.createPlayerChannel(owner, 'Market');
    expect(await channels.renamePlayerChannel(owner, 'Gossip', 'Market')).toEqual({
      ok: false,
      reason: 'name-taken',
    });
    expect(await channels.renamePlayerChannel(owner, 'Nowhere', 'X')).toEqual({
      ok: false,
      reason: 'no-such-channel',
    });
  });

  it('attaches chat to a Subject only for its owner', async () => {
    const { channels } = setup();
    const owner = makeAvatar('p1');
    const other = makeAvatar('p2');
    const c = await channels.createPlayerChannel(owner, 'Gossip');
    const subject = (await channels.subjectFor(c))!;
    expect(await channels.attachChatToSubject(other, subject, 'open')).toEqual({
      ok: false,
      reason: 'not-owner',
    });
    expect((await channels.attachChatToSubject(owner, subject, 'open')).ok).toBe(true);
  });

  it("reads a channel's history only for its audience; fails closed on no channel", async () => {
    const { channels } = setup();
    const owner = makeAvatar('p1');
    const other = makeAvatar('p2');
    const c = await channels.createPlayerChannel(owner, 'Gossip');
    syncGroups();
    const ref = (await channels.subjectFor(c))!.getGroupRef();
    groupMembers.get(ref)!.add(owner.getIdentityPath()!);
    channels.appendToHistory(c._id!, { body: 'hello' } as never);

    expect(await channels.historyFor(other, c._id!)).toEqual({
      ok: false,
      reason: 'not-member',
    });
    const mine = await channels.historyFor(owner, c._id!);
    expect(mine.ok && mine.frames.length).toBe(1);
    expect(await channels.historyFor(owner, 'no-such-id')).toEqual({
      ok: false,
      reason: 'no-such-channel',
    });
  });

  it('keys ad-hoc membership on the person, not the lineage (D11)', async () => {
    const { channels } = setup();
    const a = makeAvatar('p1');
    const b = makeAvatar('p2');
    const stranger = makeAvatar('p9');
    const ad = channels.openAdHoc(a, [a, b]);
    channels.appendToHistory(ad.handle, { body: 'psst' } as never);
    // Same row, another person: refused (a lineage key admitted everyone).
    expect(await channels.historyFor(stranger, ad.handle)).toEqual({
      ok: false,
      reason: 'not-member',
    });
    // The same person stood back up (a new body, one identity): admitted.
    const aAgain = makeAvatar('p1');
    const res = await channels.historyFor(aAgain, ad.handle);
    expect(res.ok && res.frames.length).toBe(1);
    const visible = await channels.visibleChannels(stranger);
    expect(visible.adHoc).toHaveLength(0);
  });
});
