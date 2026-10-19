/**
 * ⭐⭐ **The rooms of one building share heat through their interior
 * faces** (rubber build).
 *
 * A stove lit in the lower room warms the room above it through the
 * stair — within the hour when the way is open (the inside air moving),
 * more slowly through a shut door (conduction through the party wall).
 * An interior partition is not an exterior face, so it loses nothing to
 * the weather. And a ring of three rooms reconciles with no recursion:
 * each neighbour is read at its LAST value, never integrated from here.
 *
 * Exits are stubbed at `getObviousNeighbours`, the read the face rule
 * makes (the envelope tests' precedent).
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Stuff } from '../../stuff/Stuff';
import CartesianLocation from '../../location/CartesianLocation';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import Material from '../../material/Material';
import Biome from '../Biome';
import Structure from '../../../platform/idea/Structure';
import Hearth from '../../../platform/thing/Hearth';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import { ContainmentApi } from '../../../api/containment';
import WorldClockRegistry from '../../../platform/idea/WorldClockRegistry';
import { TemplatePaths } from '../../paths';
import { Quantity } from '../../quantity';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { attachGraph } from '../../location/__tests__/attachments-fixture';
import { chargeWood } from '../../fire/__tests__/burner-fuel';
import type { Burner } from '../../fire/Burner';
import type { RoofSpec, EnclosurePartSpec } from '../../spatial/Enclosed';
import type { Exposure } from '../../spatial/Exposure';

const SCALE = 12;
const BRICK = '/stuff/idea/material/_cpl/brick';
const SLATE = '/stuff/idea/material/_cpl/slate';
const INDOOR = '/stuff/idea/biome/_cpl/indoor';
const HOUSE = '/world/_cpl/house';

let real = 0;
const advance = (gameSec: number): void => {
  real += (gameSec / SCALE) * 1000;
};

function material(path: string, k: number): void {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!);
    m.setThermalConductivity(Quantity.of(k, 'W/(m·K)'));
    m.setDensity(Quantity.of(1800, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(840, 'J/(kg·K)'));
    return m;
  }, path);
}

type Room = CartesianLocation & {
  setEnclosure(v: EnclosurePartSpec | null): void;
  setRoof(v: RoofSpec | null): void;
  getRoof(): RoofSpec | null;
  exposure(): Exposure;
  reconcileEnvelope(): void;
  envelopeCoefficients(): { uWperK: number } | null;
  envelopeTemperatureK: number | null;
  envelopeOutsideK: number | null;
};

let zone: CartesianZone;
let n = 0;

function room(path: string, outsideK = 275): Room {
  const r = makeStuffAtPath(() => new CartesianLocation(), path) as Room;
  zone.addLocation(r, n++, 0, 0);
  (r as unknown as Record<string, unknown>)._biomePath = INDOOR;
  r.setEnclosure({ material: BRICK, thicknessM: 0.23 });
  r.setRoof({ material: SLATE, thicknessM: 0.01 });
  r.envelopeOutsideK = outsideK;
  r.envelopeTemperatureK = outsideK;
  link(r, []);
  return r;
}

/** Stub the exits: `[direction, dest, door?]`, door `'open' | 'shut'`. */
function link(r: Room, exits: Array<[string, Stuff, ('open' | 'shut')?]>): void {
  (r as unknown as { getObviousNeighbours: () => unknown[] }).getObviousNeighbours =
    () =>
      exits.map(([dir, dest, door]) => ({
        exit: {
          getDirection: () => dir,
          getDoor: () => (door ? { isOpen: () => door === 'open' } : null),
        },
        dest,
      }));
  // The exposure re-checks its neighbours at most once a second; a test
  // that rewires a room's exits says so (an authored change does too).
  r.setRoof(r.getRoof());
}

function house(): void {
  const s = makeStuffAtPath(() => new Structure(), `${HOUSE}/structure`);
  s.setExtent(HOUSE);
  s.setStoreys([
    { key: 'ground', extent: `${HOUSE}/ground` },
    { key: 'loft', extent: `${HOUSE}/loft`, on: 'ground' },
  ]);
  attachGraph({ [HOUSE]: [[`${HOUSE}/structure`, 'structure']] });
}

function stoveIn(r: Room): void {
  const h = makeStuff(() => new Hearth()) as Hearth;
  chargeWood(h as unknown as Stuff & Burner, 40);
  ContainmentApi.move(h as never, r as never);
  h.ignite();
}

/** Reconcile every room, in order, `steps` times `stepS` apart. */
function run(rooms: Room[], steps: number, stepS: number): void {
  for (const r of rooms) r.reconcileEnvelope();
  for (let i = 0; i < steps; i++) {
    advance(stepS);
    for (const r of rooms) r.reconcileEnvelope();
  }
}

beforeEach(() => {
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  real = 100_000;
  WorldClockApi._setNowProviderForTesting(() => real);
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
    makeStuffAtPath(() => new WorldClockRegistry(), TemplatePaths.worldClockRegistry);
  }
  makeStuffAtPath(() => new Biome(), INDOOR);
  material(BRICK, 0.7);
  material(SLATE, 2);
  zone = makeStuff(() => new CartesianZone());
  zone.setCellSize(3);
  n = 0;
});
afterEach(() => {
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

describe('⭐⭐ a warm kitchen warms the loft above it', () => {
  it('through an open stair, within a game hour, above an unheated control', () => {
    house();
    const kitchen = room(`${HOUSE}/ground/kitchen`);
    const loft = room(`${HOUSE}/loft/loft`);
    link(kitchen, [['up', loft]]);
    link(loft, [['down', kitchen]]);
    const control = room('/world/_cpl/shed'); // a lone room, nothing below
    stoveIn(kitchen);
    run([kitchen, loft, control], 6, 600);
    expect(kitchen.envelopeTemperatureK!).toBeGreaterThan(276);
    expect(loft.envelopeTemperatureK!).toBeGreaterThan(control.envelopeTemperatureK! + 0.5);
  });

  it('shut ⇒ conduction, open ⇒ flow: through a shut trapdoor the loft warms slower', () => {
    house();
    const k1 = room(`${HOUSE}/ground/kitchen`);
    const l1 = room(`${HOUSE}/loft/loft`);
    link(k1, [['up', l1, 'open']]);
    link(l1, [['down', k1, 'open']]);
    stoveIn(k1);
    run([k1, l1], 6, 600);
    const openRise = l1.envelopeTemperatureK! - 275;

    StuffApi.clearAll();
    installV1QuantityMarshallers();
    makeStuffAtPath(() => new WorldClockRegistry(), TemplatePaths.worldClockRegistry);
    makeStuffAtPath(() => new Biome(), INDOOR);
    material(BRICK, 0.7);
    material(SLATE, 2);
    zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(3);
    house();
    const k2 = room(`${HOUSE}/ground/kitchen`);
    const l2 = room(`${HOUSE}/loft/loft`);
    link(k2, [['up', l2, 'shut']]);
    link(l2, [['down', k2, 'shut']]);
    stoveIn(k2);
    run([k2, l2], 6, 600);
    const shutRise = l2.envelopeTemperatureK! - 275;

    expect(shutRise).toBeGreaterThan(0);
    expect(shutRise).toBeLessThan(openRise);
  });
});

describe('an interior partition loses nothing to the weather', () => {
  it('a wall shared with a member is not in the room\'s heat-loss coefficient', () => {
    house();
    const a = room(`${HOUSE}/ground/a`);
    const b = room(`${HOUSE}/ground/b`);
    const before = a.envelopeCoefficients()!.uWperK;
    link(a, [['east', b, 'shut']]);
    link(b, [['west', a, 'shut']]);
    const after = a.envelopeCoefficients()!.uWperK;
    expect(after).toBeLessThan(before);
    expect(a.exposure().interiorFaces()).toHaveLength(1);
  });

  it('⭐ subdividing no longer makes a building colder: two halves expose less than two lone rooms', () => {
    house();
    const a = room(`${HOUSE}/ground/a`);
    const b = room(`${HOUSE}/ground/b`);
    link(a, [['east', b, 'shut']]);
    link(b, [['west', a, 'shut']]);
    const lone = room('/world/_cpl/lone');
    expect(a.exposure().exteriorAreaM2()).toBeLessThan(lone.exposure().exteriorAreaM2());
  });
});

describe('bounded and recursion-free', () => {
  it('a ring of three rooms reconciles, each reading its neighbours at their last value', () => {
    house();
    const a = room(`${HOUSE}/ground/a`);
    const b = room(`${HOUSE}/ground/b`);
    const c = room(`${HOUSE}/ground/c`);
    link(a, [['east', b], ['south', c]]);
    link(b, [['west', a], ['north', c]]);
    link(c, [['north', a], ['south', b]]);
    stoveIn(a);
    run([a, b, c], 12, 600);
    for (const r of [a, b, c]) {
      expect(Number.isFinite(r.envelopeTemperatureK!)).toBe(true);
    }
    expect(b.envelopeTemperatureK!).toBeGreaterThan(275);
    expect(c.envelopeTemperatureK!).toBeGreaterThan(275);
  });
});
