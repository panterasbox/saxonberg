/**
 * The three estate states derive from ABSENCE and nothing else (economic
 * bootstrap D16/D17): the snapshot's `writtenAt` against the Schedule's
 * two clocks; a connected avatar is active whatever its row says; an NPC
 * is never absent (D23). The touch at a return reclaims or vacates; the
 * touch at any other moment escheats past the long clock, once.
 *
 * Real time is stubbed at `Date.now` — the one clock the reads run on.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Avatar from '../../../agent/Avatar';
import { PlayerApi } from '../../../../api/player';
import { ContractApi } from '../../../../api/contract';
import { EmploymentApi } from '../../../../api/employment';
import { AppApi } from '../../../../api/app';
import { StuffApi } from '../../../../api/stuff';
import { PersistedRecord } from '../../../../lib/persistence/PersistedRecord';
import { makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';

const DAY = 86_400_000;
const NOW = 1_800_000_000_000;
const ALICE = '/platform/agent/Avatar/alice';
const BOB = '/platform/agent/Avatar/bob';

let rows: Record<string, number>;
let settings: Record<string, string>;

function makeAvatar(playerId: string, connected = false): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), `/platform/agent/Avatar/${playerId}`);
  av.setPlayerId(playerId);
  vi.spyOn(av, 'isConnected').mockReturnValue(connected);
  vi.spyOn(av, 'save').mockResolvedValue(undefined);
  PlayerApi.registerAvatar(av);
  return av;
}

beforeEach(() => {
  StuffApi.clearAll();
  PlayerApi.clearAll();
  rows = {};
  settings = { 'estate.dormantAfterDays': '30', 'estate.escheatAfterDays': '180', 'employment.absenceVacatesAfterDays': '14' };
  vi.spyOn(Date, 'now').mockReturnValue(NOW);
  vi.spyOn(AppApi, 'setting').mockImplementation(((key: string) => settings[key] ?? '') as never);
  vi.spyOn(PersistedRecord, 'findByScope').mockImplementation((async (scope: string) => {
    const at = rows[scope];
    if (at === undefined) return [];
    const r = new PersistedRecord();
    r.scope = scope;
    r.writtenAt = at;
    return [r];
  }) as never);
  // The active-member count's one query: every avatar row written since
  // the cutoff (a regex on the scope, a range on `writtenAt`).
  vi.spyOn(PersistedRecord, 'find').mockImplementation((async (query: Record<string, unknown>) => {
    const since = (query.writtenAt as { $gt: number } | undefined)?.$gt ?? -Infinity;
    return Object.entries(rows)
      .filter(([k, at]) => k.startsWith('/platform/agent/Avatar/') && at > since)
      .map(([k, at]) => {
        const r = new PersistedRecord();
        r.scope = k;
        r.writtenAt = at;
        return r;
      });
  }) as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the three states, from the snapshot clock', () => {
  it('no row → active (never played); inside the short clock → active; past it → dormant; past the long one → escheated', async () => {
    expect(await PlayerApi.estateStateOf(ALICE)).toBe('active');
    rows[ALICE] = NOW - 10 * DAY;
    expect(await PlayerApi.estateStateOf(ALICE)).toBe('active');
    rows[ALICE] = NOW - 40 * DAY;
    expect(await PlayerApi.estateStateOf(ALICE)).toBe('dormant');
    expect(Math.round(await PlayerApi.absentForDays(ALICE))).toBe(40);
    rows[ALICE] = NOW - 200 * DAY;
    expect(await PlayerApi.estateStateOf(ALICE)).toBe('escheated');
  });

  it('⭐ a resident, connected avatar is active whatever its row says', async () => {
    rows[ALICE] = NOW - 400 * DAY;
    makeAvatar('alice', true);
    expect(await PlayerApi.estateStateOf(ALICE)).toBe('active');
    expect(await PlayerApi.absentForDays(ALICE)).toBe(0);
  });

  it('an NPC is never absent (D23)', async () => {
    rows['/test/estate/agent/keeper'] = NOW - 400 * DAY;
    expect(await PlayerApi.estateStateOf('/test/estate/agent/keeper')).toBe('active');
    expect(await PlayerApi.absentForDays('/test/estate/agent/keeper')).toBe(0);
  });

  it('the clocks are the Schedule\'s', async () => {
    settings['estate.dormantAfterDays'] = '1';
    rows[ALICE] = NOW - 2 * DAY;
    expect(await PlayerApi.estateStateOf(ALICE)).toBe('dormant');
  });

  it('the active member count is the connected set plus every row inside the short clock', async () => {
    rows[ALICE] = NOW - 5 * DAY; // active by row
    rows[BOB] = NOW - 90 * DAY; // dormant by row …
    makeAvatar('bob', true); // … but connected now
    rows['/platform/agent/Avatar/carol'] = NOW - 60 * DAY; // dormant, absent
    expect(await PlayerApi.activeMemberCount()).toBe(2);
  });
});

describe('the touch at a RETURN', () => {
  it('past the vacancy clock, every seat held is vacated — and the member is told', async () => {
    rows[ALICE] = NOW - 20 * DAY;
    const alice = makeAvatar('alice', true);
    const vacate = vi.spyOn(EmploymentApi, 'vacate').mockResolvedValue(['/test/idea/house']);
    const touch = await PlayerApi.touchEstate(ALICE, { returning: true });
    expect(vacate).toHaveBeenCalledWith(alice);
    expect(touch.vacated).toEqual(['/test/idea/house']);
    expect(touch.state).toBe('active'); // twenty days: vacated, not yet dormant
  });

  it('inside the vacancy clock nothing happens', async () => {
    rows[ALICE] = NOW - 3 * DAY;
    makeAvatar('alice', true);
    const vacate = vi.spyOn(EmploymentApi, 'vacate').mockResolvedValue([]);
    const touch = await PlayerApi.touchEstate(ALICE, { returning: true });
    expect(vacate).not.toHaveBeenCalled();
    expect(touch.vacated).toEqual([]);
  });

  it('⭐ an escheated member is paid what the Treasury held, and the stamp is cleared', async () => {
    rows[ALICE] = NOW - 400 * DAY;
    const alice = makeAvatar('alice', true);
    alice.setEscheatedAt(NOW - 100 * DAY);
    const reclaim = vi.spyOn(ContractApi, 'reclaimUnclaimed').mockResolvedValue(37);
    const vacate = vi.spyOn(EmploymentApi, 'vacate').mockResolvedValue([]);
    const touch = await PlayerApi.touchEstate(ALICE, { returning: true });
    expect(reclaim).toHaveBeenCalledWith(ALICE);
    expect(touch.reclaimedMinor).toBe(37);
    expect(touch.state).toBe('escheated');
    expect(alice.getEscheatedAt()).toBe(0);
    // The estate already passed — there is no seat left to vacate.
    expect(vacate).not.toHaveBeenCalled();
  });
});

describe('the touch at any other moment', () => {
  it('does nothing for an active or dormant member', async () => {
    rows[ALICE] = NOW - 40 * DAY;
    const escheat = vi.spyOn(PlayerApi, 'escheat');
    const touch = await PlayerApi.touchEstate(ALICE);
    expect(touch.state).toBe('dormant');
    expect(escheat).not.toHaveBeenCalled();
  });

  it('a stamped avatar is left alone — the escheat is idempotent', async () => {
    rows[ALICE] = NOW - 400 * DAY;
    const alice = makeAvatar('alice', false);
    alice.setEscheatedAt(NOW - 10 * DAY);
    const reconcile = vi.spyOn(ContractApi, 'reconcileLoans');
    expect(await PlayerApi.escheat(ALICE)).toBe(0);
    expect(reconcile).not.toHaveBeenCalled();
  });

  it('a non-member key is never escheated', async () => {
    expect(await PlayerApi.escheat('/test/estate/agent/keeper')).toBe(0);
  });
});
