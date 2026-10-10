/**
 * The pump substrate (pump build W0) — the law, the effort, the seal, the
 * mover, and the two vetoes.
 *
 * ⭐⭐ The claims, in the order the requirements make them:
 *
 *  1. **The ceiling is arithmetic over the place** — `P / (ρ·g)` — so a
 *     hill lifts less and brine lifts less, with nobody authoring either.
 *  2. **It belongs to the MECHANISM.** A suction pump is refused at 14 m
 *     and told the depth, never the ceiling; a force pump on the same well
 *     lifts. A third mechanism row that pulls inherits the wall with no code.
 *  3. **The seal is capability, not state.** No packing, or a broken one,
 *     refuses; every spell wears it; it reads in five words.
 *  4. **A powered pump is power-limited, and its wear is INTEGRATED** over
 *     the supply's trajectory — a mid-gap cut wears for the powered hours.
 *  5. **A well holds a pump and nothing else; a pump holds a packing and
 *     nothing else.**
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { BiomeApi } from '../../../api/biome';
import { ContainmentApi } from '../../../api/containment';
import { AppApi } from '../../../api/app';
import {
  PersistenceManager,
  Collections,
} from '../../../../backend/PersistenceManager';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import CartesianLocation from '../../location/CartesianLocation';
import Biome from '../../biome/Biome';
import Material from '../../material/Material';
import Well from '../../../platform/thing/Well';
import Pump from '../../../platform/thing/Pump';
import Tool from '../../../platform/thing/Tool';
import Good from '../../stuff/Good';
import { Zone } from '../../zone/Zone';
import { Stuff } from '../../stuff/Stuff';
import { Quantity } from '../../quantity';
import { Piecewise } from '../../Trajectory';
import {
  makeStuff,
  makeStuffAtPath,
  EXIT_KIND_TEST_ROWS,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

type Doc = Record<string, unknown> & {
  _id?: string;
  path: string;
  class: string;
  data: Record<string, unknown>;
};

const SEA_LEVEL_PA = 101_325;
const G = 9.81;
const SUCTION = '/platform/idea/PumpMechanism/suction';
const FORCE = '/platform/idea/PumpMechanism/force';
const DRAWS = '/platform/idea/PumpMechanism/diaphragm';
const WATER = '/stuff/idea/material/bulk/water';

const MECHANISM_ROWS: Doc[] = [
  { path: SUCTION, class: '/platform/idea/PumpMechanism', data: { name: 'suction', pulls: true } },
  { path: FORCE, class: '/platform/idea/PumpMechanism', data: { name: 'force', pulls: false } },
  // ⭐ A third mechanism nobody wrote code for — it pulls, so it meets the wall.
  { path: DRAWS, class: '/platform/idea/PumpMechanism', data: { name: 'diaphragm', pulls: true } },
];

function installInMemoryStore(initial: Doc[] = []): void {
  const store: Doc[] = [
    ...(EXIT_KIND_TEST_ROWS as unknown as Doc[]),
    ...MECHANISM_ROWS,
    ...initial,
  ].map((d, i) => ({ ...d, _id: String(i + 1) }));
  const save = vi.fn(async (_c: string, doc: Doc) => doc._id ?? '1');
  const find = vi.fn(async (collection: string, query: Record<string, unknown>) => {
    if (collection !== Collections.Content) return [];
    if (typeof query.path === 'string') return store.filter((d) => d.path === query.path);
    return store.slice();
  });
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({ save, find } as unknown as PersistenceManager);
}

function installRootBiome(): void {
  makeStuffAtPath(() => {
    const b = new Biome();
    b.setDefaultTemperature(Quantity.of(288, 'K'));
    b.setDefaultPressure(Quantity.of(SEA_LEVEL_PA, 'Pa'));
    b.setDefaultHumidity(Quantity.of(50, '%'));
    b.setDefaultGravity(Quantity.of(G, 'm/s²'));
    b.setDefaultWind(Quantity.of(0, 'm/s'));
    b.setDefaultAtmosphere('air');
    return b;
  }, '/stuff/idea/biome/universe');
}

function material(path: string, name: string, densityKgM3: number): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setKeywords([name]);
    m.setDensity(Quantity.of(densityKgM3, 'kg/m³'));
    return m;
  }, path) as unknown as Material;
}

/** A room at `elevationM` (or at sea level with none). */
async function room(elevationM: number | null = null): Promise<CartesianLocation> {
  const r = makeStuff(() => new CartesianLocation());
  if (elevationM !== null) {
    const zone = await StuffApi.singleton<Zone>('/hill');
    zone.setElevation(elevationM);
    Stuff._stampZone(r, zone as never);
  }
  r.setBiome(BiomeApi.getRootBiome());
  return r;
}

function well(at: CartesianLocation, depthM: number, troughL = 20): Well {
  const w = makeStuff(() => new Well());
  w.setShortDescription('well');
  w.setDepthM(depthM);
  w.interiorBulk = true;
  w.setInteriorCapacity(Quantity.of(troughL, 'L'));
  ContainmentApi.move(w, at);
  return w;
}

function packing(): Tool {
  const t = makeStuff(() => new Tool());
  t.setShortDescription('packing');
  t.setCapabilities(['packing']);
  return t;
}

function pump(mechanism: string, liftM: number, withPacking = true): Pump {
  const p = makeStuff(() => new Pump());
  p.setShortDescription(mechanism === FORCE ? 'force pump' : 'hand pump');
  p.mechanism = mechanism;
  p.setLiftM(liftM);
  p.setThroughputLps(0.5);
  p.setStrokeS(20);
  if (withPacking) ContainmentApi.move(packing(), p);
  return p;
}

const someone = (): Stuff => makeStuff(() => new Good());

beforeEach(() => {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  // Every dial falls back to its literal: the test pins the physics, not a
  // seeded settings row.
  vi.spyOn(AppApi, 'setting').mockReturnValue('');
  installInMemoryStore([{ path: '/hill', class: '/platform/idea/location/CartesianZone', data: {} }]);
  installRootBiome();
  material(WATER, 'water', 1000);
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('⭐⭐ the ceiling is arithmetic over the place', () => {
  it('columnHeightOf is ΔP over ρ·g, and a zero density is 0 m', () => {
    const h = BiomeApi.columnHeightOf(
      Quantity.of(SEA_LEVEL_PA, 'Pa'),
      Quantity.of(1000, 'kg/m³'),
      Quantity.of(G, 'm/s²'),
    );
    expect(h.rawValue()).toBeCloseTo(10.33, 2);
    expect(
      BiomeApi.columnHeightOf(Quantity.of(1, 'Pa'), Quantity.of(0, 'kg/m³'), Quantity.of(G, 'm/s²')).rawValue(),
    ).toBe(0);
  });

  it('water at sea level stands ≈ 10.33 m; a hill lifts strictly less', async () => {
    const shore = await BiomeApi.suctionHeadFor(await room());
    expect(shore.rawValue()).toBeCloseTo(10.33, 2);
    const hill = await BiomeApi.suctionHeadFor(await room(130));
    expect(hill.rawValue()).toBeLessThan(shore.rawValue());
    expect(hill.rawValue()).toBeGreaterThan(10);
  });

  it('brine, being denser, stands strictly lower than water', async () => {
    const here = await room();
    const water = await BiomeApi.suctionHeadFor(here);
    const brine = await BiomeApi.suctionHeadFor(here, Quantity.of(1200, 'kg/m³'));
    expect(brine.rawValue()).toBeLessThan(water.rawValue());
  });

  it('a vacuum lifts nothing', async () => {
    const here = await room();
    here.setPressure(Quantity.of(0, 'Pa'));
    expect((await BiomeApi.suctionHeadFor(here)).rawValue()).toBe(0);
  });
});

describe('⭐⭐ the wall belongs to the MECHANISM', () => {
  it('a suction pump on a 6 m well plans a spell with real watts', async () => {
    const w = well(await room(), 6);
    const p = pump(SUCTION, 8);
    ContainmentApi.move(p, w);
    const plan = await p.planPump(someone());
    expect(plan.kind).toBe('plan');
    if (plan.kind !== 'plan') return;
    expect(plan.durationMs).toBe(20_000);
    expect(plan.effortW).toBeGreaterThanOrEqual(200);
  });

  it('at 14 m it refuses — and the refusal carries the DEPTH, never the ceiling', async () => {
    const w = well(await room(), 14);
    const p = pump(SUCTION, 30);
    ContainmentApi.move(p, w);
    const plan = await p.planPump(someone());
    expect(plan.kind).toBe('refusal');
    if (plan.kind !== 'refusal') return;
    expect(plan.reason).toBe('beyond-suction');
    const prose = plan.prose.toString();
    expect(prose).toContain('14 metres');
    expect(prose).not.toMatch(/\b10\b/);
    expect(prose).not.toMatch(/air|atmospher|pressure|vacuum/i);
  });

  it('a force pump on the same 14 m well lifts — nothing explains why', async () => {
    const w = well(await room(), 14);
    const p = pump(FORCE, 30);
    ContainmentApi.move(p, w);
    expect((await p.planPump(someone())).kind).toBe('plan');
  });

  it('a force pump past its own lift refuses beyond-lift', async () => {
    const w = well(await room(), 40);
    const p = pump(FORCE, 30);
    ContainmentApi.move(p, w);
    const plan = await p.planPump(someone());
    expect(plan.kind === 'refusal' && plan.reason).toBe('beyond-lift');
  });

  it('⭐ a third mechanism row that pulls inherits the wall with no code', async () => {
    const w = well(await room(), 14);
    const p = pump(DRAWS, 30);
    ContainmentApi.move(p, w);
    const plan = await p.planPump(someone());
    expect(plan.kind === 'refusal' && plan.reason).toBe('beyond-suction');
  });

  it('at elevation the same pump is refused at a depth it drew at the shore', async () => {
    const depth = 10.2;
    const shoreWell = well(await room(), depth);
    const a = pump(SUCTION, 30);
    ContainmentApi.move(a, shoreWell);
    expect((await a.planPump(someone())).kind).toBe('plan');
    const hillWell = well(await room(130), depth);
    const b = pump(SUCTION, 30);
    ContainmentApi.move(b, hillWell);
    const plan = await b.planPump(someone());
    expect(plan.kind === 'refusal' && plan.reason).toBe('beyond-suction');
  });

  it('a loose pump is not set in anything', async () => {
    const r = await room();
    const p = pump(SUCTION, 8);
    ContainmentApi.move(p, r);
    const plan = await p.planPump(someone());
    expect(plan.kind === 'refusal' && plan.reason).toBe('not-set');
  });
});

describe('⭐ the seal is capability, not state', () => {
  it('no packing refuses no-packing', async () => {
    const w = well(await room(), 6);
    const p = pump(SUCTION, 8, false);
    ContainmentApi.move(p, w);
    const plan = await p.planPump(someone());
    expect(plan.kind === 'refusal' && plan.reason).toBe('no-packing');
  });

  it('a broken packing refuses the same way, and reads gone', async () => {
    const w = well(await room(), 6);
    const p = pump(SUCTION, 8);
    ContainmentApi.move(p, w);
    p.packingPart()!.setCondition(0.05);
    expect(p.packingCondition()).toBe('gone');
    const plan = await p.planPump(someone());
    expect(plan.kind === 'refusal' && plan.reason).toBe('no-packing');
  });

  it('a spell moves throughput × stroke into the trough, and wears the leather', async () => {
    const w = well(await room(), 6);
    const p = pump(SUCTION, 8);
    ContainmentApi.move(p, w);
    const plan = await p.planPump(someone());
    if (plan.kind !== 'plan') throw new Error('expected a plan');
    const result = await p.completePump(someone(), plan.token);
    expect(result.litres).toBe(10);
    expect(w.getBulk('interior').getAmount().rawValue()).toBe(10);
    expect(p.packingPart()!.getCondition()).toBeCloseTo(0.94, 5);
  });

  it('the trough bounds what comes up, and a full one refuses', async () => {
    const w = well(await room(), 6, 15);
    const p = pump(SUCTION, 8);
    ContainmentApi.move(p, w);
    for (let i = 0; i < 2; i++) {
      const plan = await p.planPump(someone());
      if (plan.kind !== 'plan') throw new Error('expected a plan');
      await p.completePump(someone(), plan.token);
    }
    expect(w.getBulk('interior').getAmount().rawValue()).toBe(15);
    const plan = await p.planPump(someone());
    expect(plan.kind === 'refusal' && plan.reason).toBe('trough-full');
  });

  it('the condition reads in five words and no digit', async () => {
    const p = pump(SUCTION, 8);
    const words: string[] = [];
    for (const c of [1, 0.7, 0.4, 0.2, 0.05]) {
      p.packingPart()!.setCondition(c);
      words.push(p.packingCondition());
    }
    expect(words).toEqual(['sound', 'worn', 'leaking', 'perished', 'gone']);
  });
});

describe('the two vetoes narrow CONTENTS', () => {
  it('a well refuses a coin and takes one pump, and only one', async () => {
    const w = well(await room(), 6);
    const coin = makeStuff(() => new Good());
    expect(w.canAddContainable(coin as never).ok).toBe(false);
    const a = pump(SUCTION, 8);
    expect(w.canAddContainable(a as never).ok).toBe(true);
    ContainmentApi.move(a, w);
    expect(w.pumpFitted()).toBe(a);
    const b = pump(FORCE, 30);
    expect(w.canAddContainable(b as never)).toEqual({ ok: false, reason: 'There is a pump in it already.' });
  });

  it('a pump refuses anything but a packing', async () => {
    const p = pump(SUCTION, 8, false);
    expect(p.canAddContainable(makeStuff(() => new Good()) as never).ok).toBe(false);
    expect(p.canAddContainable(packing() as never).ok).toBe(true);
  });

  it('an unpumped well has nothing in its trough', async () => {
    const w = well(await room(), 6);
    expect(w.getBulk('interior').getAmount().rawValue()).toBe(0);
  });
});

describe('⭐ the machine rung — power-limited, and wear INTEGRATED', () => {
  /** A pump with a fake supply: on, powered at `watts`, cut over a window. */
  function poweredPump(watts: number, cut: [number, number] | null = null): Pump {
    const p = pump(FORCE, 30);
    p.setThroughputLps(1200);
    const host = p as unknown as Record<string, unknown>;
    host.availablePowerW = () => watts;
    host.isOn = () => true;
    host.poweredTrajectory = (from: number, to: number) => {
      const flat = (a: number, b: number, v: number) => ({ fromS: a, toS: b, startValue: v, target: v, tau: 0 });
      if (!cut) return new Piecewise([flat(from, to, 1)]);
      return new Piecewise([flat(from, cut[0], 1), flat(cut[0], cut[1], 0), flat(cut[1], to, 1)]);
    };
    return p;
  }

  it('delivers what its power will lift when its duty exceeds its supply', () => {
    // The city intake's numbers: 5 m of head, 1.2 m³/s asked, 60 kW given.
    const p = poweredPump(60_000);
    const q = p.deliverableM3S(5, 1.2);
    const wanted = p.powerForDuty(5, 1.2);
    expect(wanted).toBeCloseTo(98_100, -2);
    expect(q).toBeLessThan(1.2);
    expect(q).toBeCloseTo((60_000 * 0.6) / (1000 * G * 5), 4);
  });

  it('a hand pump never runs on its own', () => {
    expect(pump(SUCTION, 8).isRunning()).toBe(false);
    expect(pump(SUCTION, 8).deliverableM3S(5, 1)).toBe(0);
  });

  it('a ten-hour gap with a six-hour cut wears for four hours, not ten', () => {
    const p = poweredPump(60_000, [3_600 * 2, 3_600 * 8]);
    p.reconcileRunning(1); // the first reconcile only stamps
    const before = p.packingPart()!.getCondition();
    p.reconcileRunning(1 + 3_600 * 10);
    const worn = before - p.packingPart()!.getCondition();
    expect(worn).toBeCloseTo(4 * 0.002, 3);
  });
});
