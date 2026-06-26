/**
 * RenownLogic.recompute — the batch aggregator. Covers the requirements'
 * acceptance criteria:
 *   AC#2 recompute materializes a signed standing `renownOf` returns;
 *   AC#3 one event stream → different standings per scope;
 *   AC#4 re-legislating valence (now the EMOTE's valence) re-scores
 *        standing while the `renown_events` rows stay byte-identical;
 *   AC#5 dropping the aggregate + replaying the log reproduces standings;
 *   AC#6 no belief-store read occurs during the recompute.
 *
 * Valence lives on the emote (`Emote.valence`); the recompute reads it via
 * `SoulApi.all()`, which is stubbed here. Mongo is faked with a
 * COLLECTION-AWARE in-memory store (renown_events / renown / app_settings
 * must not bleed together), whose `find` honors array-contains for the
 * scope axes. The game-clock is pinned so decay is a no-op (age 0); scores
 * are pure valence sums.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RenownApi } from '../../../api/renown';
import { SoulApi } from '../../../api/soul';
import { Emote } from '../../../lib/social/Emote';
import { AppSettings } from '../../../lib/config/AppSettings';
import RenownStanding from '../../../lib/standing/RenownStanding';
import { WorldClockApi } from '../../../api/worldclock';
import { PersistenceManager } from '../../../../backend/PersistenceManager';

let stores: Map<string, Map<string, Record<string, unknown>>>;
let idCounter = 0;
let findCols: string[] = [];

function col(name: string): Map<string, Record<string, unknown>> {
  let m = stores.get(name);
  if (!m) {
    m = new Map();
    stores.set(name, m);
  }
  return m;
}

function matches(d: Record<string, unknown>, q: Record<string, unknown>): boolean {
  return Object.entries(q).every(([k, v]) => {
    const dv = d[k];
    return Array.isArray(dv) ? dv.includes(v) : dv === v;
  });
}

/** A stub emote carrying a signed valence (the polity's per-emote value). */
function emote(verb: string, valence: number): Emote {
  const e = new Emote();
  e.verb = verb;
  e.valence = valence;
  return e;
}

function stubEmotes(...emotes: Emote[]): void {
  vi.spyOn(SoulApi, 'all').mockResolvedValue(emotes);
}

const VF: Record<string, string> = {
  'renown.decayHalfLives': '{"esteem":1000000000000,"notoriety":1000000000000}',
  'renown.contextMultipliers': '{}',
  'renown.qualityWeight': '1',
  'renown.receptionValence': '0.1',
};

async function seedAppSettings(values: Record<string, string>): Promise<void> {
  const s = new AppSettings();
  for (const [k, v] of Object.entries(values)) s.setValue(k, v);
  await s.save();
  await AppSettings.warm();
}

const S = '/obj/Avatar/subject';
const R = '/obj/Avatar/reactor';

beforeEach(async () => {
  stores = new Map();
  idCounter = 0;
  findCols = [];
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(
    async (c: string, q: Record<string, unknown>) => {
      findCols.push(c);
      return [...col(c).values()].filter((d) => matches(d, q)) as never;
    }
  );
  vi.spyOn(pm, 'save').mockImplementation(
    async (c: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
      col(c).set(id, { ...doc, _id: id });
      return id;
    }
  );
  WorldClockApi._setNowProviderForTesting(() => 4242);
  RenownStanding._resetForTesting();
  stubEmotes(emote('cheer', 1), emote('boo', -1));
  await seedAppSettings(VF);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  RenownStanding._resetForTesting();
  AppSettings._resetForTesting();
});

describe('RenownLogic.recompute', () => {
  it('AC#2 materializes a signed standing renownOf returns', async () => {
    await RenownApi.append({ subject: S, source: R, signal: { emote: 'cheer' } });
    expect(RenownApi.renownOf(S)).toBe(0); // not yet recomputed
    await RenownApi.recompute();
    expect(RenownApi.renownOf(S)).toBe(1);
  });

  it('AC#3 one stream → different standings per scope', async () => {
    await RenownApi.append({
      subject: S,
      source: R,
      signal: { emote: 'cheer' },
      groups: ['managed:g1'],
    });
    await RenownApi.append({
      subject: S,
      source: R,
      signal: { emote: 'boo' },
      groups: ['managed:g2'],
    });
    await RenownApi.recompute();
    expect(RenownApi.renownOf(S, null)).toBe(0); // +1 + -1, cooperative-wide
    expect(RenownApi.renownOf(S, 'managed:g1')).toBe(1); // esteemed by the guild
    expect(RenownApi.renownOf(S, 'managed:g2')).toBe(-1); // notorious in g2
  });

  it('AC#4 re-valuing the emote re-scores; the log stays byte-identical', async () => {
    await RenownApi.append({ subject: S, source: R, signal: { emote: 'cheer' } });
    await RenownApi.recompute();
    expect(RenownApi.renownOf(S)).toBe(1);

    const logBefore = JSON.stringify([...col('renown_events').values()]);

    // The polity legislates: a cheer is now worth 2 (re-valued on the emote).
    stubEmotes(emote('cheer', 2), emote('boo', -1));
    await RenownApi.recompute();

    expect(RenownApi.renownOf(S)).toBe(2); // re-scored from the same log
    const logAfter = JSON.stringify([...col('renown_events').values()]);
    expect(logAfter).toBe(logBefore); // raw signal retained — log untouched
  });

  it('AC#5 dropping the aggregate + replaying the log reproduces standings', async () => {
    await RenownApi.append({ subject: S, source: R, signal: { emote: 'cheer' }, groups: ['managed:g1'] });
    await RenownApi.append({ subject: S, source: R, signal: { emote: 'cheer' } });
    await RenownApi.recompute();
    const before = RenownApi.renownOf(S);
    const beforeG1 = RenownApi.renownOf(S, 'managed:g1');

    // Drop the materialized aggregate entirely.
    stores.get('renown')?.clear();
    RenownStanding._resetForTesting();
    expect(RenownApi.renownOf(S)).toBe(0); // gone

    // Replay the log.
    await RenownApi.recompute();
    expect(RenownApi.renownOf(S)).toBe(before);
    expect(RenownApi.renownOf(S, 'managed:g1')).toBe(beforeG1);
  });

  it('reception standing is log-saturated (1st message ≫ 1000th)', async () => {
    // 10 distinct listeners heard the subject (already deduped at ingest).
    for (let i = 0; i < 10; i++) {
      await RenownApi.append({
        subject: S,
        source: `/obj/Avatar/L${i}`,
        kind: 'reception',
        signal: {},
      });
    }
    await RenownApi.recompute();
    // receptionValence × ln(1 + 10), decay ≈ 0 at age 0.
    expect(RenownApi.renownOf(S)).toBeCloseTo(0.1 * Math.log(11), 6);
  });

  it('reception saturates: 10× the messages is far less than 10× the renown', async () => {
    const renownAfter = async (n: number): Promise<number> => {
      stores.clear();
      RenownStanding._resetForTesting();
      for (let i = 0; i < n; i++) {
        await RenownApi.append({
          subject: S,
          source: `/obj/Avatar/L${i}`,
          kind: 'reception',
          signal: {},
        });
      }
      await RenownApi.recompute();
      return RenownApi.renownOf(S);
    };
    const one = await renownAfter(1);
    const hundred = await renownAfter(100);
    // 100× the activity yields well under 10× the renown (log curve).
    expect(hundred).toBeGreaterThan(one);
    expect(hundred).toBeLessThan(one * 10);
  });

  it('AC#6 the recompute never reads the belief store', async () => {
    await RenownApi.append({ subject: S, source: R, signal: { emote: 'cheer' } });
    findCols = []; // reset the find-collection recorder
    await RenownApi.recompute();
    expect(findCols.length).toBeGreaterThan(0);
    expect(findCols).not.toContain('beliefs');
    // It only touches the renown log + the materialized aggregate (emote
    // valences come from SoulApi.all(), stubbed — no collection read).
    expect(new Set(findCols)).toEqual(new Set(['renown_events', 'renown']));
  });
});
