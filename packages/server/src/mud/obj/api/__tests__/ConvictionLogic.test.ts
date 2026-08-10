/**
 * ConvictionLogic — the spend half of influence. Covers (with a controllable
 * `now`): conviction builds linearly with hold time; a flip resets the ramp;
 * a drop removes the position; the tally is full-weight (no pool) and
 * non-fungible across stocks; conviction is recomputed from dwell, never
 * stored; tally signs follow the net (yea − nay).
 *
 * Mongo is faked collection-aware; `InfluenceApi.standingOf` is stubbed so
 * the tally's standing input is deterministic. Build period seeded to 1000s.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConvictionApi } from '../../../api/conviction';
import { InfluenceApi } from '../../../api/influence';
import { InfluenceStanding } from '../../../lib/standing/InfluenceStanding';
import { Band } from '../../../lib/standing/Band';
import { AppSettings } from '../../../lib/config/AppSettings';
import { WorldClockApi } from '../../../api/worldclock';
import { StuffApi } from '../../../api/stuff';
import { PersistenceManager } from '../../../../backend/PersistenceManager';

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;

const BUILD_MS = 1000 * 1000; // build period 1000s → 1_000_000 ms

/** Stub every holder's standing in `stock` to a fixed scalar. */
function stubStanding(scalar: number): void {
  vi.spyOn(InfluenceApi, 'standingOf').mockImplementation(
    (subject, stock) =>
      new InfluenceStanding(subject, stock, scalar, Band.fromScalar(scalar))
  );
}

beforeEach(async () => {
  store = new Map();
  idCounter = 0;
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(
    async (_col: string, query: Record<string, unknown>) =>
      [...store.values()].filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v)
      ) as never
  );
  vi.spyOn(pm, 'save').mockImplementation(
    async (_col: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
      store.set(id, { ...doc, _id: id });
      return id;
    }
  );
  vi.spyOn(pm, 'delete').mockImplementation(async (_col: string, id: string) => {
    store.delete(id);
  });
  WorldClockApi._setNowProviderForTesting(() => 4242);
  const s = new AppSettings();
  s.setValue('conviction.buildPeriodSeconds', '1000');
  await s.save();
  await AppSettings.warm();
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  AppSettings._resetForTesting();
  StuffApi.clearAll();
});

const HOLDER = '/obj/Avatar/holder';
const TARGET = 'bill-7';

describe('ConvictionLogic conviction ramp', () => {
  it('builds linearly from 0 to 1 over the build period', async () => {
    const t0 = 5_000_000;
    await ConvictionApi.hold(HOLDER, 'consumer', TARGET, { yea: 1, nay: 0 }, t0);

    const at0 = await ConvictionApi.positionOf(HOLDER, 'consumer', TARGET, t0);
    expect(at0!.conviction).toBeCloseTo(0, 5);

    const half = await ConvictionApi.positionOf(
      HOLDER,
      'consumer',
      TARGET,
      t0 + BUILD_MS / 2
    );
    expect(half!.conviction).toBeCloseTo(0.5, 5);

    const full = await ConvictionApi.positionOf(
      HOLDER,
      'consumer',
      TARGET,
      t0 + BUILD_MS
    );
    expect(full!.conviction).toBeCloseTo(1, 5);

    // Saturates at 1 past the build period.
    const beyond = await ConvictionApi.positionOf(
      HOLDER,
      'consumer',
      TARGET,
      t0 + BUILD_MS * 3
    );
    expect(beyond!.conviction).toBe(1);
  });

  it('flip resets the conviction clock', async () => {
    const t0 = 5_000_000;
    await ConvictionApi.hold(HOLDER, 'consumer', TARGET, { yea: 1, nay: 0 }, t0);
    // Fully built after a period.
    let pos = await ConvictionApi.positionOf(
      HOLDER,
      'consumer',
      TARGET,
      t0 + BUILD_MS
    );
    expect(pos!.conviction).toBe(1);

    // Flip at the fully-built moment → conviction restarts at 0, sides swap.
    await ConvictionApi.flip(HOLDER, 'consumer', TARGET, t0 + BUILD_MS);
    pos = await ConvictionApi.positionOf(
      HOLDER,
      'consumer',
      TARGET,
      t0 + BUILD_MS
    );
    expect(pos!.conviction).toBeCloseTo(0, 5);
    expect(pos!.yea).toBe(0);
    expect(pos!.nay).toBe(1);
  });

  it('drop removes the position', async () => {
    const t0 = 5_000_000;
    await ConvictionApi.hold(HOLDER, 'consumer', TARGET, { yea: 1, nay: 0 }, t0);
    expect(await ConvictionApi.positionOf(HOLDER, 'consumer', TARGET, t0)).not.toBeNull();
    await ConvictionApi.drop(HOLDER, 'consumer', TARGET);
    expect(await ConvictionApi.positionOf(HOLDER, 'consumer', TARGET, t0)).toBeNull();
  });

  it('a same-direction re-hold keeps building (does not reset)', async () => {
    const t0 = 5_000_000;
    await ConvictionApi.hold(HOLDER, 'consumer', TARGET, { yea: 1, nay: 0 }, t0);
    // Re-hold same direction at half-build with a bigger magnitude.
    await ConvictionApi.hold(
      HOLDER,
      'consumer',
      TARGET,
      { yea: 2, nay: 0 },
      t0 + BUILD_MS / 2
    );
    const pos = await ConvictionApi.positionOf(
      HOLDER,
      'consumer',
      TARGET,
      t0 + BUILD_MS
    );
    // realSince unchanged → fully built at t0+period.
    expect(pos!.conviction).toBeCloseTo(1, 5);
    expect(pos!.yea).toBe(2);
  });
});

describe('ConvictionLogic.tally', () => {
  it('full weight, no pool: holding two targets spends full standing on each', async () => {
    stubStanding(10);
    const t0 = 5_000_000;
    await ConvictionApi.hold(HOLDER, 'consumer', 'bill-a', { yea: 1, nay: 0 }, t0);
    await ConvictionApi.hold(HOLDER, 'consumer', 'bill-b', { yea: 1, nay: 0 }, t0);

    const at = t0 + BUILD_MS; // conviction 1
    const a = await ConvictionApi.tally('consumer', 'bill-a', at);
    const b = await ConvictionApi.tally('consumer', 'bill-b', at);
    // 10 × 1 × (1−0) on EACH — not split across the two.
    expect(a.value).toBeCloseTo(10, 5);
    expect(b.value).toBeCloseTo(10, 5);
  });

  it('is non-fungible across stocks: a consumer stake does not feed a producer tally', async () => {
    stubStanding(10);
    const t0 = 5_000_000;
    await ConvictionApi.hold(HOLDER, 'consumer', TARGET, { yea: 1, nay: 0 }, t0);

    const at = t0 + BUILD_MS;
    expect((await ConvictionApi.tally('consumer', TARGET, at)).value).toBeCloseTo(10, 5);
    const producer = await ConvictionApi.tally('producer', TARGET, at);
    expect(producer.value).toBe(0);
    expect(producer.count).toBe(0);
  });

  it('sums signed by net (yea − nay) and weights by conviction', async () => {
    stubStanding(10);
    const t0 = 5_000_000;
    // Supporter (full conviction) vs opposer (half conviction).
    await ConvictionApi.hold('/obj/Avatar/yes', 'consumer', TARGET, { yea: 1, nay: 0 }, t0);
    await ConvictionApi.hold(
      '/obj/Avatar/no',
      'consumer',
      TARGET,
      { yea: 0, nay: 1 },
      t0 + BUILD_MS / 2
    );
    const at = t0 + BUILD_MS; // yes: conviction 1; no: conviction 0.5
    const tally = await ConvictionApi.tally('consumer', TARGET, at);
    // 10×1×(+1) + 10×0.5×(−1) = 10 − 5 = 5
    expect(tally.value).toBeCloseTo(5, 5);
    expect(tally.count).toBe(2);
  });

  it('weights each holder by their own standing scalar', async () => {
    // Whale standing 100, minnow standing 1; both fully built, both yea.
    vi.spyOn(InfluenceApi, 'standingOf').mockImplementation((subject, stock) => {
      const scalar = subject === '/obj/Avatar/whale' ? 100 : 1;
      return new InfluenceStanding(subject, stock, scalar, Band.fromScalar(scalar));
    });
    const t0 = 5_000_000;
    await ConvictionApi.hold('/obj/Avatar/whale', 'consumer', TARGET, { yea: 1, nay: 0 }, t0);
    await ConvictionApi.hold('/obj/Avatar/minnow', 'consumer', TARGET, { yea: 1, nay: 0 }, t0);
    const tally = await ConvictionApi.tally('consumer', TARGET, t0 + BUILD_MS);
    expect(tally.value).toBeCloseTo(101, 5);
  });
});

describe('ConvictionLogic abstain + quorum', () => {
  it('abstain is a present, net-zero position: 0 to the decision, full standing to quorum', async () => {
    stubStanding(10);
    const t0 = 5_000_000;
    await ConvictionApi.abstain(HOLDER, 'consumer', TARGET, t0);

    const pos = await ConvictionApi.positionOf(HOLDER, 'consumer', TARGET, t0 + BUILD_MS);
    expect(pos).not.toBeNull();
    expect(pos!.yea).toBe(0);
    expect(pos!.nay).toBe(0);
    // Decision: net-zero → contributes nothing even at full conviction.
    expect((await ConvictionApi.tally('consumer', TARGET, t0 + BUILD_MS)).value).toBe(0);
    // Quorum: present at the holder's full standing.
    expect(await ConvictionApi.quorumWeight('consumer', TARGET)).toBeCloseTo(10, 5);
  });

  it('quorum counts present positions (abstain + directional), never non-voters', async () => {
    stubStanding(10);
    const t0 = 5_000_000;
    await ConvictionApi.abstain('/obj/Avatar/abstainer', 'consumer', TARGET, t0);
    await ConvictionApi.hold('/obj/Avatar/voter', 'consumer', TARGET, { yea: 1, nay: 0 }, t0);
    // A third member never holds a position → no row → not counted.
    expect(await ConvictionApi.quorumWeight('consumer', TARGET)).toBeCloseTo(20, 5);
  });

  it('quorum weight is conviction-independent (full standing even at conviction 0)', async () => {
    stubStanding(10);
    const t0 = 5_000_000;
    await ConvictionApi.hold(HOLDER, 'consumer', TARGET, { yea: 1, nay: 0 }, t0);
    // At t0 conviction is 0 → the decision tally is ~0…
    expect((await ConvictionApi.tally('consumer', TARGET, t0)).value).toBeCloseTo(0, 5);
    // …but the holder is present, so quorum counts full standing.
    expect(await ConvictionApi.quorumWeight('consumer', TARGET)).toBeCloseTo(10, 5);
  });

  it('abstain is distinct from drop (present vs absent)', async () => {
    const t0 = 5_000_000;
    await ConvictionApi.abstain(HOLDER, 'consumer', TARGET, t0);
    expect(await ConvictionApi.positionOf(HOLDER, 'consumer', TARGET, t0)).not.toBeNull();
    await ConvictionApi.drop(HOLDER, 'consumer', TARGET);
    expect(await ConvictionApi.positionOf(HOLDER, 'consumer', TARGET, t0)).toBeNull();
  });

  it('is non-fungible: an abstain in one stock does not feed another stock quorum', async () => {
    stubStanding(10);
    const t0 = 5_000_000;
    await ConvictionApi.abstain(HOLDER, 'consumer', TARGET, t0);
    expect(await ConvictionApi.quorumWeight('consumer', TARGET)).toBeCloseTo(10, 5);
    expect(await ConvictionApi.quorumWeight('producer', TARGET)).toBe(0);
  });
});
