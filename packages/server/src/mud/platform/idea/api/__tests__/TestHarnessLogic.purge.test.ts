/**
 * `TestHarnessApi.purgeTestLitter` — the wire purge (test-world-lifecycle
 * D4). Test litter is a `wire-` handle AND an `@e2e.local` email, never a
 * named survivor; a connected character is left and said; each owner
 * removes its own (offices, group seats, scaffold titles, business seats,
 * balances retired to the reserve), then the per-player rows and the
 * profile go. Every store and owner is stubbed: this proves the selection
 * and the order; the drive proves it against a world.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { TestHarnessApi } from '../../../../api/test-harness';
import { PersistApi } from '../../../../api/persist';
import { PlayerApi } from '../../../../api/player';
import { CompactApi } from '../../../../api/compact';
import { GroupApi } from '../../../../api/group';
import { ParcelApi } from '../../../../api/parcel';
import { BankingApi } from '../../../../api/banking';
import { Money } from '../../../../lib/banking/Money';
import { Collections } from '../../../../lib/persistence/Collections';
import { Group } from '../../../../lib/social/Group';
import { User } from '../../../../lib/identity/User';
import { GoogleProfile } from '../../../../lib/identity/GoogleProfile';

const profile = (id: string, displayName: string, email: string) =>
  Object.assign(new GoogleProfile(), { _id: id, displayName, email });
const user = (id: string, googleProfileId: string, playerIds: string[]) =>
  Object.assign(new User(), { _id: id, googleProfileId, playerIds });

let deleted: Array<{ collection: string; filter: Record<string, unknown> }>;
let removed: Array<{ collection: string; id: string }>;
let retired: Array<{ account: string; minor: number; reason: string }>;

beforeEach(() => {
  deleted = [];
  removed = [];
  retired = [];
  vi.spyOn(GoogleProfile, 'find').mockResolvedValue([
    profile('g1', 'wire-walker-a1-b2', 'wire_walker@e2e.local'),
    profile('g2', 'founder', 'founder@e2e.local'),
    profile('g3', 'wire-lookalike', 'someone@gmail.com'),
    profile('g4', 'alice', 'alice@e2e.local'),
  ] as never);
  vi.spyOn(User, 'find').mockImplementation((async (q: { googleProfileId?: string }) =>
    q.googleProfileId === 'g1' ? [user('u1', 'g1', ['p1'])] : []) as never);
  vi.spyOn(PlayerApi, 'connectedAvatars').mockReturnValue([]);
  vi.spyOn(PlayerApi, 'findAvatarByPlayerId').mockReturnValue(undefined);
  vi.spyOn(PlayerApi, 'loadAvatarsForUser').mockResolvedValue([]);
  vi.spyOn(CompactApi, 'officeRoster').mockResolvedValue([
    { key: 'minister-of-trade', holderPlayerId: 'p1' },
    { key: 'central-bank-governor', holderPlayerId: null },
  ] as never);
  vi.spyOn(CompactApi, 'vacateOfficeForTest').mockResolvedValue(true);
  const fire = vi.fn();
  vi.spyOn(GroupApi, 'registry').mockResolvedValue({ managed: () => ({ fireChange: fire }) } as never);
  const committee = Object.assign(new Group(), { _id: 'grp', memberIds: ['/platform/agent/Avatar/p1'], memberRoles: ['member'] });
  vi.spyOn(committee, 'save').mockResolvedValue(undefined as never);
  vi.spyOn(Group, 'find').mockImplementation((async (q: { memberIds?: string }) =>
    q.memberIds === '/platform/agent/Avatar/p1' ? [committee] : []) as never);
  vi.spyOn(ParcelApi, 'extentsHeldBy').mockImplementation(async (admits) =>
    (await admits({ kind: 'player', templatePath: '/platform/agent/Avatar/p1' })) ? ['/world/testbed/annex'] : []);
  vi.spyOn(ParcelApi, 'transfer').mockResolvedValue(null);
  vi.spyOn(BankingApi, 'accountIdsOf').mockImplementation(async (owner) =>
    owner === '/platform/agent/Avatar/p1' ? ['acct-p1'] : []);
  vi.spyOn(BankingApi, 'balanceOf').mockImplementation((id) =>
    Money.of(id === 'acct-p1' ? 250 : 0, BankingApi.compactCurrency()));
  vi.spyOn(BankingApi, 'retire').mockImplementation(async (account, amount, reason) => {
    retired.push({ account, minor: amount.minor, reason });
  });
  vi.spyOn(PersistApi, 'whenQuiet').mockResolvedValue(true);
  vi.spyOn(PersistApi, 'find').mockResolvedValue([]);
  vi.spyOn(PersistApi, 'deleteMany').mockImplementation(async (collection, filter) => {
    deleted.push({ collection, filter });
    return 1;
  });
  vi.spyOn(PersistApi, 'delete').mockImplementation(async (collection, id) => {
    removed.push({ collection, id });
  });
});
afterEach(() => vi.restoreAllMocks());

describe('testharness purge', () => {
  it('⭐ removes a wire- test character: office, seat, title, money, rows, profile', async () => {
    const r = await TestHarnessApi.purgeTestLitter();
    expect(r.characters).toBe(1);
    expect(r.offices).toBe(1);
    expect(CompactApi.vacateOfficeForTest).toHaveBeenCalledWith('minister-of-trade');
    expect(r.seats).toBe(1);
    expect(r.titles).toBe(1);
    expect(ParcelApi.transfer).toHaveBeenCalledWith('/world/testbed/annex', { kind: 'group', name: 'testbed-annex' });
    expect(retired).toEqual([{ account: 'acct-p1', minor: 250, reason: 'wire purge' }]);
    expect(r.sunkMinor).toBe(250);
    expect(deleted.map((d) => d.collection)).toEqual(
      expect.arrayContaining([Collections.HolderSnapshots, Collections.PlayerFrames, Collections.Beliefs]),
    );
    expect(deleted.every((d) => Object.values(d.filter)[0] === '/platform/agent/Avatar/p1')).toBe(true);
    expect(removed).toEqual([
      { collection: Collections.Users, id: 'u1' },
      { collection: Collections.GoogleProfiles, id: 'g1' },
    ]);
  });

  it('⛔ never touches founder, a non-test email, or a handle that is not wire-', async () => {
    await TestHarnessApi.purgeTestLitter();
    const ids = removed.map((r) => r.id);
    expect(ids).not.toContain('g2');
    expect(ids).not.toContain('g3');
    expect(ids).not.toContain('g4');
  });

  it('leaves a connected test character, and says so', async () => {
    vi.mocked(PlayerApi.connectedAvatars).mockReturnValue([
      { getIdentityPath: () => '/platform/agent/Avatar/p1' } as never,
    ]);
    const r = await TestHarnessApi.purgeTestLitter();
    expect(r.characters).toBe(0);
    expect(r.skipped).toEqual(['wire-walker-a1-b2 (connected)']);
    expect(removed).toEqual([]);
    expect(retired).toEqual([]);
  });

  it('never deletes from an append-only ledger', async () => {
    await TestHarnessApi.purgeTestLitter();
    const ledgers = [Collections.BankLedger, Collections.RenownEvents, Collections.ParticipationEvents];
    expect(deleted.some((d) => (ledgers as string[]).includes(d.collection))).toBe(false);
  });
});
