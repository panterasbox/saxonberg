/**
 * ⭐ The renown pass scores who changed, and decay is read, not rewritten
 * (db-performance W3 — D4, D5, D6). Renown's figure is not one exponential:
 * positive reactions decay by the esteem half-life, negative by notoriety's,
 * and receptions enter log-saturated. The pass stores the three sums; a
 * read carries them forward. The proof the ANSWER did not change: a read at
 * any instant equals a fresh full pass at that instant, to 1e-9 relative,
 * in every scope, and every band agrees.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RenownApi } from '../../../../api/renown';
import { PersistApi } from '../../../../api/persist';
import { SoulApi } from '../../../../api/soul';
import { Emote } from '../../../../lib/social/Emote';
import { AppSettings } from '../../../../lib/config/AppSettings';
import RenownStanding from '../../../../lib/standing/RenownStanding';
import { Band } from '../../../../lib/standing/Band';
import { WorldClockApi } from '../../../../api/worldclock';
import { installRecordTestDb, type RecordTestDb } from '../../../../lib/persistence/__tests__/record-test-db';

const DAY = 86_400;
/** The wall clock the world clock derives game time from (ms). */
const M0 = 1_800_000_000_000;
let ms = M0;
/** Game seconds at M0 — read once the provider is set. */
let G0 = 0;
const A = '/platform/agent/Avatar/a';
const B = '/platform/agent/Avatar/b';
const TOWN = '/test/town';
const GUILD = 'group:/corpo/guild';

let db: RecordTestDb;

/** Move the world clock to `G0 + dS` game seconds (through the wall clock and the scale). */
function gameAt(dS: number): void {
  ms = M0 + (dS * 1000) / WorldClockApi.getScale();
}
/** Game seconds now. */
const game = (): number => WorldClockApi.getNow().rawValue();

function emote(verb: string, valence: number): Emote {
  const e = new Emote();
  e.verb = verb;
  e.valence = valence;
  return e;
}

async function settings(over: Record<string, string> = {}): Promise<void> {
  db.all('app_settings').splice(0);
  AppSettings._resetForTesting();
  const s = new AppSettings();
  const vf: Record<string, string> = {
    'renown.decayHalfLives': JSON.stringify({ esteem: 7 * DAY, notoriety: 30 * DAY }),
    'renown.contextMultipliers': JSON.stringify({ public: 1.5, private: 0.5 }),
    'renown.qualityWeight': '1.2',
    'renown.receptionValence': '0.8',
    ...over,
  };
  for (const [k, v] of Object.entries(vf)) s.setValue(k, v);
  await s.save();
  await AppSettings.warm();
}

function close(a: number | undefined, b: number | undefined): void {
  expect(a).toBeTypeOf('number');
  expect(Math.abs(a! - b!)).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(b!)));
}

const SLOTS: Array<[string, string | null]> = [
  [A, null], [A, TOWN], [A, GUILD], [B, null], [B, TOWN],
];
const reads = (): Array<number | undefined> => SLOTS.map(([s, sc]) => RenownApi.measuredRenownOf(s, sc));

async function react(subject: string, emoteVerb: string, at: number, tags: string[] = [], locality: string | null = null, groups: string[] = []): Promise<void> {
  await RenownApi.append({ subject, source: '/platform/agent/Avatar/x', kind: 'reaction', signal: { emote: emoteVerb, tags }, at, locality, groups });
}
async function heard(subject: string, at: number, tags: string[] = [], locality: string | null = null): Promise<void> {
  await RenownApi.append({ subject, source: '/platform/agent/Avatar/y', kind: 'reception', signal: { tags }, at, locality });
}

beforeEach(async () => {
  db = installRecordTestDb();
  ms = M0;
  WorldClockApi._setNowProviderForTesting(() => ms);
  G0 = game();
  vi.spyOn(SoulApi, 'all').mockResolvedValue([emote('cheer', 2), emote('nod', 0.5), emote('boo', -3)]);
  RenownStanding._resetForTesting();
  await settings();
  await react(A, 'cheer', G0 - 2 * DAY, ['public'], TOWN);
  await react(A, 'boo', G0 - 10 * DAY, ['private'], null, [GUILD]);
  await react(A, 'nod', G0 - DAY, [], TOWN, [GUILD]);
  await heard(A, G0 - 3 * DAY, ['public'], TOWN);
  await heard(A, G0 - 6 * DAY);
  await react(B, 'boo', G0 - 40 * DAY, [], TOWN);
  await heard(B, G0 - DAY, [], TOWN);
  await heard(B, G0 - 2 * DAY);
  await RenownApi.recompute({ full: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  RenownStanding._resetForTesting();
  AppSettings._resetForTesting();
  db.reset();
});

describe('RenownLogic — the pass scores who changed; decay is read', () => {
  it('1 — a read days later equals a fresh full pass then, in every scope; every band agrees', async () => {
    const atPass = reads();
    gameAt(5 * DAY + 77);
    const decayed = reads();
    // Decay happened — the equality below is not two stale reads agreeing.
    expect(Math.abs(decayed[0]! - atPass[0]!)).toBeGreaterThan(0.01);
    await RenownApi.recompute({ full: true });
    const fresh = reads();
    decayed.forEach((v, i) => close(v, fresh[i]));
    decayed.forEach((v, i) => expect(Band.fromScalar(v!).name).toBe(Band.fromScalar(fresh[i]!).name));
  });

  it('2 — one subject acts: only its rows are written; every read still equals a full pass', async () => {
    gameAt(DAY);
    const spy = vi.spyOn(PersistApi, 'saveMany');
    await react(B, 'cheer', game(), ['public'], TOWN);
    await RenownApi.recompute();
    const written = new Set(spy.mock.calls.flatMap(([, w]) => w.map((x) => x.doc.subject)));
    expect(written).toEqual(new Set([B]));
    gameAt(3 * DAY);
    const viaDirty = reads();
    await RenownApi.recompute({ full: true });
    viaDirty.forEach((v, i) => close(v, reads()[i]));
  });

  it('3 — nothing changed: the pass makes no database call at all', async () => {
    const find = vi.spyOn(PersistApi, 'find');
    const many = vi.spyOn(PersistApi, 'saveMany');
    gameAt(DAY);
    await RenownApi.recompute();
    expect(find).not.toHaveBeenCalled();
    expect(many).not.toHaveBeenCalled();
  });

  it('4 — a changed half-life, context multiplier or emote valence forces a full pass', async () => {
    const written = async (): Promise<Set<unknown>> => {
      const spy = vi.spyOn(PersistApi, 'saveMany');
      await RenownApi.recompute();
      const out = new Set(spy.mock.calls.flatMap(([, w]) => w.map((x) => x.doc.subject)));
      spy.mockRestore();
      return out;
    };
    await settings({ 'renown.decayHalfLives': JSON.stringify({ esteem: 3 * DAY, notoriety: 30 * DAY }) });
    expect(await written()).toEqual(new Set([A, B]));
    expect(await written()).toEqual(new Set());
    await settings({ 'renown.decayHalfLives': JSON.stringify({ esteem: 3 * DAY, notoriety: 30 * DAY }), 'renown.contextMultipliers': '{"public":3}' });
    expect(await written()).toEqual(new Set([A, B]));
    vi.spyOn(SoulApi, 'all').mockResolvedValue([emote('cheer', 5), emote('nod', 0.5), emote('boo', -3)]);
    expect(await written()).toEqual(new Set([A, B]));
  });

  it('5 — a point with no sums reads its flat value', () => {
    RenownStanding._putForTesting(RenownStanding.key('/x', '*'), 1.5);
    gameAt(90 * DAY);
    expect(RenownApi.renownOf('/x')).toBe(1.5);
  });

  it('6 — a pass that throws puts its subjects back for the next', async () => {
    await heard(B, game() + 10);
    vi.spyOn(PersistApi, 'saveMany').mockRejectedValueOnce(new Error('the link dropped'));
    await expect(RenownApi.recompute()).rejects.toThrow(/link dropped/);
    const spy = vi.spyOn(PersistApi, 'saveMany');
    await RenownApi.recompute();
    expect(new Set(spy.mock.calls.flatMap(([, w]) => w.map((x) => x.doc.subject)))).toEqual(new Set([B]));
  });

  it('a stored row carries its three sums, and a restart reads them back', async () => {
    const row = db.all('renown').find((r) => r.subject === A && r.scope === '*')!;
    expect(row.esteem).toBeTypeOf('number');
    expect(row.notoriety).toBeLessThan(0);
    expect(row.reception).toBeGreaterThan(0);
    RenownStanding._resetForTesting();
    await RenownStanding.warm();
    gameAt(4 * DAY);
    const warmed = reads();
    await RenownApi.recompute({ full: true });
    warmed.forEach((v, i) => close(v, reads()[i]));
  });
});
