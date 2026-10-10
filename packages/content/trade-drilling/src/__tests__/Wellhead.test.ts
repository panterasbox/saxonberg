/**
 * ⭐⭐ **The hole**, and the four claims it was written to make.
 *
 *  1. ⚠⚠ **Depth is BANKED, never engaged.** Engagements do not survive
 *     a server restart, so a bore — which is weeks of work — may not be
 *     one. `swingBank` is persistent and a restart costs at most one
 *     swing. Asserted by banking a partial metre and reading it back.
 *  2. ⭐ **The bill is a host hook and `null` is NOT free.** A hole over
 *     no column answers `null` and the acts refuse in words; silence
 *     treated as *nothing owed* is the failure mode this repo keeps
 *     paying for.
 *  3. ⭐⭐⭐ **The bottom of the hole and the wellhead are different
 *     places.** A dead body seeps into the sump and only a bailer gets
 *     it up; a body with head drives its own fluid to the surface. That
 *     is why the bailer exists and why the pump is a build of its own.
 *  4. ⭐⭐ **The head is derived from the BODY's withdrawal, not this
 *     hole's.** Two straws, one falling gauge.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { DocumentApi } from '@saxonberg/server/mud/api/document';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import CartesianLocation from '@saxonberg/server/mud/lib/location/CartesianLocation';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import Deposit, { type FluidBody } from '@saxonberg/content-ground/src/idea/Deposit';
import BodyRegister, {
  BODY_KIND,
  BODY_REGISTER_PATH,
} from '@saxonberg/content-ground/src/idea/BodyRegister';
import Wellhead from '../thing/Wellhead';
import Pump from '@saxonberg/server/mud/platform/thing/Pump';
import Tool from '@saxonberg/server/mud/platform/thing/Tool';
import Good from '@saxonberg/server/mud/platform/thing/Good';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { BORE_KIND, BORE_REGISTRY_PATH, BoreRegistry } from '../idea/BoreRegistry';

const DEPOSIT_PATH = '/test/idea/deposit/fixture';
const SLATE = '/stuff/idea/material/rock/slate';
const GRANITE = '/stuff/idea/material/rock/granite';
const BRINE = '/stuff/idea/material/bulk/salt-water';

/** A trap directly under the origin, with forty metres of closure. */
const SALT: FluidBody = {
  key: 'salt-leg',
  fluid: BRINE,
  trap: {
    crest: [0, 0, -110],
    strike: 41,
    alongExtent: 140,
    acrossExtent: 50,
    closureM: 40,
  },
  charge: true,
  capacityL: 240_000,
  headAtm0: 0,
};

/** The same leg with drive behind it — Stage B/C's shape. */
const GASSY: FluidBody = {
  ...SALT,
  key: 'gas-cap',
  headAtm0: 4,
  capacityL: 10_000,
};

let docs: Map<string, { kind: string; data: Record<string, unknown> }>;
function installDocuments(): void {
  docs = new Map();
  vi.spyOn(DocumentApi, 'saveToRegister').mockImplementation((async (
    _register: unknown,
    path: string,
    data: Record<string, unknown>,
  ) => {
    const kind = path.startsWith('/trade/drilling/bores') ? BORE_KIND : BODY_KIND;
    docs.set(path, { kind, data: JSON.parse(JSON.stringify(data)) });
  }) as never);
  vi.spyOn(DocumentApi, 'read').mockImplementation(async (path: string) => {
    const doc = docs.get(path);
    return doc === undefined
      ? null
      : ({
          getPath: () => path,
          getKind: () => doc.kind,
          getData: () => doc.data,
        } as never);
  });
  vi.spyOn(DocumentApi, 'list').mockImplementation(async (prefix: string) => {
    const out: unknown[] = [];
    for (const [path, doc] of docs) {
      if (!path.startsWith(prefix)) continue;
      out.push({
        getPath: () => path,
        getKind: () => doc.kind,
        getData: () => doc.data,
      });
    }
    return out as never;
  });
}

function stubZone(cellSize: number, deposit: string | null) {
  return {
    getCellSize: () => cellSize,
    lookupField: async <T,>(f: string): Promise<T | null> =>
      f === 'deposit' ? (deposit as unknown as T) : null,
  };
}

function installDeposit(fluids: FluidBody[]): Deposit {
  const d = makeStuffAtPath(() => new Deposit(), DEPOSIT_PATH) as Deposit;
  d.setName('fixture');
  d.setStratigraphy([
    { toZ: -60, host: SLATE },
    { toZ: -400, host: GRANITE },
  ]);
  d.setWaterTable(-45);
  d.setLode(null);
  d.setFluids(fluids);
  return d;
}

/** A hole standing in a room over the fixture column. */
function hole(
  fluids: FluidBody[] = [SALT],
  depositPath: string | null = DEPOSIT_PATH,
): Wellhead {
  if (depositPath !== null) installDeposit(fluids);
  const room = makeStuff(() => new CartesianLocation());
  room.setCoordinates([0, 0, 0]);
  (room as unknown as { getZone(): unknown }).getZone = () =>
    stubZone(10, depositPath);
  const w = makeStuff(() => new Wellhead());
  (w as unknown as { getContainer(): unknown }).getContainer = () => room;
  w.setClaimPath('/world/terminus/test/location/flat');
  // The trough at the wellhead — authored on the SEED ROW in the shipped
  // world (`interiorBulk: true`, `interiorCapacity: 60`), and a bare
  // `makeStuff` applies no row, so it is set here. ⚠ `interiorBulk` is a
  // BOOLEAN presence flag and the litres are a separate field; getting
  // that wrong is how this fixture first failed with *host has no
  // 'interior' bulk slot*.
  (w as unknown as { interiorBulk: boolean }).interiorBulk = true;
  (w as unknown as { interiorCapacity: Quantity<'L'> | null }).interiorCapacity =
    Quantity.of(60, 'L');
  // ⚠ No Locality resolves over a bare fixture room, so the ground
  // address would be `''` — and an empty address files nothing, which is
  // correct behaviour and useless for a test of the books.
  (w as unknown as { getGroundAddress(): Promise<string> }).getGroundAddress =
    async () => 'terminus/test';
  return w;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  StuffApi.clearAll();
  installDocuments();
  // Resident host rocks, so hardness resolves off the material rather
  // than off the documented fallback.
  for (const [path, mpa] of [[SLATE, 90], [GRANITE, 200]] as const) {
    const m = makeStuffAtPath(() => new Material(), path);
    (m as unknown as { hardness: Quantity<'MPa'> }).hardness = Quantity.of(mpa, 'MPa');
  }
  makeStuffAtPath(() => new Material(), BRINE);
  makeStuffAtPath(() => new BodyRegister(), BODY_REGISTER_PATH);
  makeStuffAtPath(() => new BoreRegistry(), BORE_REGISTRY_PATH);
});
afterEach(() => vi.restoreAllMocks());

describe('⭐ the bill, and why null is not free', () => {
  it('prices the next metre on the HOST ROCK, so granite costs more than slate', async () => {
    const w = hole();
    w.setDepthM(10); // in slate
    const soft = await w.cutBill();
    w.setDepthM(100); // in granite
    const hard = await w.cutBill();
    expect(soft).not.toBeNull();
    expect(hard!.swingsPerMetre).toBeGreaterThan(soft!.swingsPerMetre);
    expect(hard!.hostPath).toBe(GRANITE);
    expect(soft!.hostPath).toBe(SLATE);
  });

  it('⚠ a hole over NO column answers null — the acts must refuse in words', async () => {
    const w = hole([], null);
    expect(await w.cutBill()).toBeNull();
  });

  it('a harder metre is slower per swing as well as more swings', async () => {
    const w = hole();
    w.setDepthM(10);
    const soft = await w.swingMs();
    w.setDepthM(100);
    expect(await w.swingMs()).toBeGreaterThan(soft);
  });
});

describe('⚠⚠ depth is BANKED, not engaged', () => {
  it('banks part of a metre and does not deepen until the bank pays', async () => {
    const w = hole();
    const bill = (await w.cutBill())!;
    const first = await w.bankSwing(1);
    expect(first.deepened).toBe(false);
    expect(first.depthM).toBe(0);
    expect(first.bank).toBe(1);
    expect(first.needed).toBe(bill.swingsPerMetre);
    // ⭐ The banked part survives — which is the whole reason it is a
    // field and not an engagement. A restart costs ONE swing.
    expect(w.getSwingBank()).toBe(1);
  });

  it('deepens exactly when the bank pays for a metre, and keeps the change', async () => {
    const w = hole();
    const needed = (await w.cutBill())!.swingsPerMetre;
    const result = await w.bankSwing(needed + 2);
    expect(result.deepened).toBe(true);
    expect(w.getDepthM()).toBe(1);
    expect(w.getSwingBank()).toBe(2);
  });

  it('a bank of many metres\' worth drops many metres in one reconcile', async () => {
    // The crew working while the owner is logged out: a month of banked
    // presence is a month of depth, not one metre.
    const w = hole();
    const needed = (await w.cutBill())!.swingsPerMetre;
    await w.bankSwing(needed * 12);
    expect(w.getDepthM()).toBeGreaterThanOrEqual(10);
  });

  it('a non-positive swing banks nothing', async () => {
    const w = hole();
    await w.bankSwing(0);
    await w.bankSwing(-5);
    expect(w.getSwingBank()).toBe(0);
    expect(w.getDepthM()).toBe(0);
  });
});

describe('⭐ the liner, and the threshold that is not a roll', () => {
  it('wants lining where soft rock meets standing water, and says so BEFORE the swing', async () => {
    const w = hole();
    // Slate is 90 MPa — under the lining threshold — and the table is
    // at −45, so past 45 m the hole will not stand open.
    w.setDepthM(50);
    expect(await w.wantsLining()).toBe(true);
    const bill = (await w.cutBill())!;
    expect(bill.wantsLinerBeyondM).toBe(45);
  });

  it('lining it lifts the refusal', async () => {
    const w = hole();
    w.setDepthM(50);
    w.setLinedToM(50);
    expect(await w.wantsLining()).toBe(false);
  });

  it('⚠ hard rock stands open on its own — nothing to line', async () => {
    const w = hole();
    w.setDepthM(100); // granite, 200 MPa
    expect((await w.cutBill())!.wantsLinerBeyondM).toBeNull();
    expect(await w.wantsLining()).toBe(false);
  });
});

describe('⭐⭐⭐ the bottom of the hole is not the wellhead', () => {
  it('a DEAD body seeps into the sump, and the slot at the top stays empty', async () => {
    const w = hole([SALT]);
    w.setDepthM(120);
    await w.bankSwing(0); // learn the body
    await w.reconcileRig(); // the first reconcile only stamps
    await w.reconcileRig();
    // Nothing is at the top until something lifts it.
    expect(w.getBulk('interior').getAmount().rawValue()).toBe(0);
  });

  it('⭐⭐ `lift` is the ONLY way up for a dead well, and it is small', async () => {
    const w = hole([SALT]);
    w.setDepthM(120);
    // Seed the sump the way a reconcile would.
    (w as unknown as { sumpL: number }).sumpL = 100;
    (w as unknown as { bodyKey: string }).bodyKey = 'salt-leg';
    const raised = await w.lift();
    expect(raised).toBe(w.liftL());
    expect(raised).toBeLessThan(100);
    expect(w.getBulk('interior').getAmount().rawValue()).toBeCloseTo(raised, 6);
    expect(w.getBulk('interior').getMaterialPath()).toBe(BRINE);
  });

  it('lifting an empty hole raises nothing, rather than nothing-shaped brine', async () => {
    const w = hole([SALT]);
    w.setDepthM(120);
    expect(await w.lift()).toBe(0);
    expect(w.getBulk('interior').getMaterialPath()).toBeNull();
  });
});

describe('⭐⭐ the head falls with the BODY\'s withdrawal', () => {
  it('a dead body has no head at all, however little has been taken', async () => {
    const w = hole([SALT]);
    (w as unknown as { bodyKey: string }).bodyKey = 'salt-leg';
    expect(await w.headAtm()).toBe(0);
  });

  it('a charged body\'s head falls as the body is drawn down', async () => {
    const w = hole([GASSY]);
    (w as unknown as { bodyKey: string }).bodyKey = 'gas-cap';
    const full = await w.headAtm();
    expect(full).toBeCloseTo(4, 6);

    const register = (await StuffApi.singleton<BodyRegister>(
      BODY_REGISTER_PATH,
    )) as BodyRegister;
    const ref = await w.bodyRef();
    await register.recordDraw(ref, 'straw-a', 5_000, 100);
    expect(await w.headAtm()).toBeCloseTo(2, 6);
  });

  it('⭐⭐⭐ a SECOND straw\'s draw moves THIS hole\'s gauge', async () => {
    // The fact the polity gets to argue about, and it has to be true in
    // the model before anybody can argue about it.
    const w = hole([GASSY]);
    (w as unknown as { bodyKey: string }).bodyKey = 'gas-cap';
    const register = (await StuffApi.singleton<BodyRegister>(
      BODY_REGISTER_PATH,
    )) as BodyRegister;
    const ref = await w.bodyRef();
    // Somebody else's hole, on the same body, takes nearly all of it.
    await register.recordDraw(ref, 'somebody-elses-hole', 9_000, 100);
    expect(w.getDrawnL()).toBe(0); // this straw has taken nothing
    expect(await w.headAtm()).toBeCloseTo(0.4, 6); // and the gauge is on the floor
  });
});

describe('the log — append-only, and `nothing` is a finding', () => {
  it('files a line per metre, in order, and never rewrites one', async () => {
    const w = hole();
    const needed = (await w.cutBill())!.swingsPerMetre;
    await w.bankSwing(needed * 3);
    const registry = (await StuffApi.singleton<BoreRegistry>(
      BORE_REGISTRY_PATH,
    )) as BoreRegistry;
    const record = await registry.read(await w.getGroundAddress(), 'flat');
    expect(record).not.toBeNull();
    expect(record!.lines.map((l) => l.depthM)).toEqual([1, 2, 3]);
    // ⚠ `null` fluid is a FINDING — *nothing at three metres* is the
    // sentence a payroll bought.
    expect(record!.lines[0]!.fluid).toBeNull();
    expect(record!.lines[0]!.host).toBe(SLATE);
  });

  it('⚠ a re-run reconcile does not file the same metre twice', async () => {
    const w = hole();
    const registry = (await StuffApi.singleton<BoreRegistry>(
      BORE_REGISTRY_PATH,
    )) as BoreRegistry;
    const needed = (await w.cutBill())!.swingsPerMetre;
    await w.bankSwing(needed);
    const address = await w.getGroundAddress();
    const first = (await registry.read(address, 'flat'))!.lines.length;
    // Force the same depth through again, the way a double reconcile
    // would, and the append must be idempotent on the depth.
    await (
      w as unknown as { logMetre(h: string): Promise<void> }
    ).logMetre(SLATE);
    expect((await registry.read(address, 'flat'))!.lines.length).toBe(first);
  });

  it('the log is filed under the TRADE, not under the owner', async () => {
    const w = hole();
    await w.bankSwing((await w.cutBill())!.swingsPerMetre);
    const paths = [...docs.keys()].filter((p) => docs.get(p)!.kind === BORE_KIND);
    expect(paths).toHaveLength(1);
    expect(paths[0]!.startsWith('/trade/drilling/bores/')).toBe(true);
    // ⛔ Never the owner's home branch, and never the parcel.
    expect(paths[0]!.startsWith('/home/')).toBe(false);
  });
});

describe('⭐⭐ the pump\'s attach point — a hole answers LiftSource (pump build)', () => {
  /** A pump with no law of its own (no mechanism row) and a sound packing. */
  function pump(liftM = 200, throughputLps = 0.5): Pump {
    const p = makeStuff(() => new Pump());
    p.setLiftM(liftM);
    p.setThroughputLps(throughputLps);
    p.setStrokeS(20);
    const leather = makeStuff(() => new Tool());
    leather.setCapabilities(['packing']);
    ContainmentApi.move(leather, p);
    return p;
  }

  function seeded(sumpL: number): Wellhead {
    const w = hole([SALT]);
    w.setDepthM(25);
    (w as unknown as { sumpL: number }).sumpL = sumpL;
    (w as unknown as { bodyKey: string }).bodyKey = 'salt-leg';
    return w;
  }

  it('answers the depth of the hole and what stands in it', async () => {
    const w = seeded(30);
    expect(w.standingDepthM()).toBe(25);
    expect(await w.standingMaterial()).toBe(BRINE);
  });

  it('a pump stroke raises into the trough, capped by what stands below', async () => {
    const w = seeded(7);
    expect(await w.liftInto(10)).toBe(7);
    expect(w.getSumpL()).toBe(0);
    expect(w.getBulk('interior').getAmount().rawValue()).toBe(7);
  });

  it('…and capped by the trough, so a stroke never overfills the head', async () => {
    const w = seeded(100);
    expect(await w.liftInto(80)).toBe(60);
    expect(w.receivableL()).toBe(0);
    expect(await w.liftInto(10)).toBe(0);
  });

  it('⭐⭐ the bailer is untouched: twelve litres a trip, and no pressure asked (AC 11)', async () => {
    const w = seeded(100);
    expect(await w.lift()).toBe(12);
  });

  it('only a pump goes down a hole, and only one', () => {
    const w = seeded(0);
    expect(w.canAddContainable(makeStuff(() => new Good()) as never).ok).toBe(false);
    const a = pump();
    expect(w.canAddContainable(a as never).ok).toBe(true);
    ContainmentApi.move(a, w);
    expect(w.pumpFitted()).toBe(a);
    expect(w.canAddContainable(pump() as never).ok).toBe(false);
  });

  it('⭐⭐ a crew at a fitted pump earns a CONTINUOUS rate — more than a bailer over the same hour', async () => {
    vi.spyOn(AppApi, 'setting').mockReturnValue('');
    const w = seeded(400);
    ContainmentApi.move(pump(), w);
    const hand = makeStuff(() => new Good());
    vi.spyOn(w, 'crewOnShift').mockReturnValue([hand]);
    const now = WorldClockApi.getNow().rawValue();
    (w as unknown as { rigStamp: number }).rigStamp = now - 120;
    await w.reconcileRig();
    // 0.5 L/s × 120 s × one hand × half the shift at the handle = 30 L,
    // where a bailer's best is 12 L per 30 s trip — 48 L in two minutes of
    // nothing but bailing, by a player at the keyboard, and 0 L asleep.
    expect(w.getBulk('interior').getAmount().rawValue()).toBeCloseTo(30, 6);
  });

  it('a crew cannot out-pump the pump\'s own law', async () => {
    vi.spyOn(AppApi, 'setting').mockReturnValue('');
    const w = seeded(400);
    ContainmentApi.move(pump(10), w); // a pump that will not push 25 m
    vi.spyOn(w, 'crewOnShift').mockReturnValue([makeStuff(() => new Good())]);
    (w as unknown as { rigStamp: number }).rigStamp = WorldClockApi.getNow().rawValue() - 120;
    await w.reconcileRig();
    expect(w.getBulk('interior').getAmount().rawValue()).toBe(0);
  });
});
