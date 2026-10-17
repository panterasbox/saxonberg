/**
 * ⭐ A place is kept as well as it is used (cleanliness W4, D15–D19, D30):
 * a floor is cleaned by its kind's method (and an earth floor refuses the
 * scrub), strewing is taken up by the broom, the broom on a scrubbed floor
 * takes the debris and leaves the films, pests spoil open food faster, a
 * sooted flue catches only when roaring, a grimed pane darkens the room
 * its daylight comes in by, and a `clean` contract reads all of it.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Floor from '../../../platform/thing/Floor';
import Window from '../../../platform/thing/Window';
import Provision from '../../../platform/thing/Provision';
import Hearth from '../../../platform/thing/Hearth';
import Chair from '../../../platform/thing/Chair';
import { StuffApi } from '../../../api/stuff';
import Material from '../../material/Material';
import CartesianLocation from '../../location/CartesianLocation';
import { GROUND_KINDS } from '../../ground/GroundKind';
import { Condition } from '../../employment/Condition';
import { ContainmentApi } from '../../../api/containment';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../quantity';
import '../../../platform/idea/WorldClockRegistry';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const HOUR = 3600;
const BASE = 1_000_000;
let now = BASE;
const setNow = (s: number): void => {
  now = BASE + s;
};

beforeEach(() => {
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  setNow(0);
  WorldClockApi._setNowProviderForTesting(() => now);
  WorldClockApi.setScale(1000);
});
afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

function floorOf(kind: (typeof GROUND_KINDS)[number]): Floor {
  const f = makeStuff(() => new Floor());
  vi.spyOn(f, 'getGroundKind').mockReturnValue(kind);
  return f;
}

describe('a floor is cleaned by its kind (D15)', () => {
  it('every ground kind names a method', () => {
    const methods = new Set(['strew and sweep', 'scrub', 'scrub or sand', 'scrape']);
    for (const kind of GROUND_KINDS) {
      expect(methods.has(floorOf(kind).cleaningMethod())).toBe(true);
    }
  });

  it('an earth floor refuses the wash in words; boards take it', () => {
    expect(floorOf('earth').cleaningMethod()).toBe('strew and sweep');
    expect(floorOf('earth').washRefusal()).toMatch(/mud/);
    expect(floorOf('boards').washRefusal()).toBeNull();
  });

  it('a floor that takes no soil refuses the deposit and the wash', () => {
    const f = floorOf('boards');
    vi.spyOn(f, 'takesSoil').mockReturnValue(false);
    f.soil('mud', 1);
    expect(f.soilAt()).toBe(0);
    expect(f.washRefusal()).not.toBeNull();
  });
});

describe('strewing and sweeping (D15)', () => {
  it('strewing accumulates and is taken up whole', () => {
    const f = floorOf('earth');
    expect(f.strew('/stuff/idea/material/bulk/rushes', 2)).toBe(true);
    f.strew('/stuff/idea/material/bulk/rushes', 1);
    expect(f.getStrewn()?.kg).toBe(3);
    expect(f.takeStrewn()?.kg).toBe(3);
    expect(f.getStrewn()).toBeNull();
  });

  it('a broom on a scrubbed floor takes the crumbs and leaves the blood', () => {
    const f = floorOf('boards');
    f.soil('crumbs', 0.5);
    f.soil('blood', 0.5);
    const { kinds } = f.sweepUp();
    expect(kinds.crumbs).toBeGreaterThan(0);
    expect(kinds.blood).toBeUndefined();
    expect(f.soilLoad('blood', '')).toBeGreaterThan(0);
  });

  it('strewn on boards, the blood goes up with the sawdust', () => {
    const f = floorOf('boards');
    f.soil('blood', 0.5);
    f.strew('/stuff/idea/material/bulk/sawdust', 1);
    const { kinds } = f.sweepUp();
    expect(kinds.blood).toBeGreaterThan(0);
  });

  it('on an earth floor the broom takes everything', () => {
    const f = floorOf('earth');
    f.soil('mud', 0.5);
    f.soil('crumbs', 0.5);
    f.sweepUp();
    expect(f.soilAt()).toBe(0);
  });
});

function mat(): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('pest-test-bread');
    m.setSpecificHeat(Quantity.of(3200, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.5, 'W/(m·K)'));
    m.setSpoilActivationEnergy(Quantity.of(80_000, 'J/mol'));
    m.setWaterActivity(0.98);
    return m;
  }, '/stuff/idea/material/_test/pest-bread') as unknown as Material;
}

function loafIn(room: CartesianLocation, m: Material): Provision {
  const p = makeStuff(() => {
    const x = new Provision();
    x.setMass(Quantity.of(1, 'kg'));
    x.setMaterial(m);
    x.setStampedTemperatureK(293);
    x.setLastAmbientK(293);
    return x;
  });
  ContainmentApi.move(p, room);
  // The move restamps a Thermal item off the room; a bare test room has
  // no biome, so hold it warm again.
  p.setStampedTemperatureK(293);
  p.setLastAmbientK(293);
  return p;
}

describe('pests (D17)', () => {
  it('⭐ an open loaf spoils faster in a room whose floor has pests', () => {
    const m = mat();
    const clean = makeStuff(() => new CartesianLocation());
    const dirty = makeStuff(() => new CartesianLocation());
    const cleanFloor = floorOf('boards');
    const dirtyFloor = floorOf('boards');
    vi.spyOn(cleanFloor, 'hasPests').mockReturnValue(false);
    vi.spyOn(dirtyFloor, 'hasPests').mockReturnValue(true);
    vi.spyOn(clean, 'getFloor').mockReturnValue(cleanFloor as never);
    vi.spyOn(dirty, 'getFloor').mockReturnValue(dirtyFloor as never);
    const a = loafIn(clean, m);
    const b = loafIn(dirty, m);
    a.getMicrobialLoad();
    b.getMicrobialLoad();
    setNow(48 * HOUR);
    expect(b.getMicrobialLoad()).toBeGreaterThan(a.getMicrobialLoad());
  });

  it('crumbs alone, with no food about, bring none', () => {
    const f = floorOf('boards');
    f.soil('crumbs', 1);
    expect(f.hasPests()).toBe(false);
  });
});

describe('the window a room is lit by (D19, B18)', () => {
  it('a grimed pane passes less, and washed it passes all again', () => {
    const w = makeStuff(() => new Window());
    w.setOpen(true);
    const clean = w.transmissivity('A', 'A');
    w.soil('soot', 3);
    expect(w.transmissivity('A', 'A')).toBeLessThan(clean * 0.7);
  });

  it("⭐ a sky room's daylight comes through the pane its opening names", () => {
    const room = makeStuff(() => new CartesianLocation());
    (room as unknown as { ambientSource: string; ambientOpening: string }).ambientSource = 'sky';
    (room as unknown as { ambientOpening: string }).ambientOpening = 'window';
    expect(room.openingTransmissivity()).toBe(1);
    const w = makeStuff(() => new Window());
    w.setKeywords(['window']);
    w.setOpen(true);
    ContainmentApi.move(w, room);
    const bright = room.openingTransmissivity();
    w.soil('soot', 3);
    expect(room.openingTransmissivity()).toBeLessThan(bright);
    w.setOpen(false);
    expect(room.openingTransmissivity()).toBe(0);
  });
});

describe('a `clean` contract (D30)', () => {
  const clause = new Condition({
    template: 'clean',
    item: { kind: 'template', path: '/test/room' },
    destinationPath: '/test/room',
  });

  it('validates as an engine-verifiable clause', () => {
    expect(
      Condition.validate({
        template: 'clean',
        item: { kind: 'template', path: '/test/room' },
        destinationPath: '/test/room',
      }),
    ).toBeNull();
  });

  it('holds on a swept floor and not on a soiled one', () => {
    const room = makeStuff(() => new CartesianLocation());
    const f = floorOf('boards');
    vi.spyOn(room, 'getFloor').mockReturnValue(f as never);
    f.soil('crumbs', 1);
    expect(clause.cleanHolds(room)).toBe(false);
    f.sweepUp();
    expect(clause.cleanHolds(room)).toBe(true);
  });
});

describe('the flue (D18)', () => {
  function hearth(power: number, completeness = 0.5): Hearth {
    const h = makeStuff(() => new Hearth());
    vi.spyOn(h, 'completeness').mockReturnValue(completeness);
    vi.spyOn(h, 'burnPowerW').mockReturnValue(power);
    return h;
  }

  it('soots by the kilo burnt and by how badly it burns', () => {
    const smoky = hearth(0, 0.5);
    const clean = hearth(0, 0.95);
    smoky.consumeFuel(10);
    clean.consumeFuel(10);
    expect(smoky.getFlueSoot()).toBeGreaterThan(clean.getFlueSoot());
    expect(smoky.getFlueSoot()).toBeCloseTo(10 * 0.5 * 0.02, 5);
  });

  it('⭐ a foul flue catches under a roaring fire, and a swept one does not', () => {
    const roaring = (h: Hearth): number =>
      (h as unknown as { maxBurnPowerW: number }).maxBurnPowerW;
    const foul = hearth(0);
    foul.consumeFuel(60); // 0.6 kg of soot — over the 0.5 kg it catches at
    expect(foul.isFlueFoul()).toBe(true);
    vi.spyOn(foul, 'burnPowerW').mockReturnValue(roaring(foul));
    foul.consumeFuel(0.1);
    expect(foul.getFlueSoot()).toBeLessThan(0.01); // it burnt out at once

    const swept = hearth(0);
    swept.consumeFuel(60);
    expect(swept.sweepFlue()).toBeGreaterThan(0.5);
    vi.spyOn(swept, 'burnPowerW').mockReturnValue(roaring(swept));
    swept.consumeFuel(0.1);
    expect(swept.isFlueFoul()).toBe(false);
    expect(swept.getFlueSoot()).toBeGreaterThan(0); // soots, does not catch
  });
});

describe('the stalls (D20)', () => {
  it('⭐ a byre floor fouls by the head-day while the herd is kept', () => {
    const f = floorOf('earth');
    (f as unknown as { stalls: { herdbook: string } }).stalls = {
      herdbook: '/test/herdbook',
    };
    const book = { getTally: () => 6 };
    const real = StuffApi.findByTemplatePath.bind(StuffApi);
    vi.spyOn(StuffApi, 'findByTemplatePath').mockImplementation(((p: string) =>
      p === '/test/herdbook' ? book : real(p)) as never);
    f.reconcileStalls(); // stamps
    setNow(2 * 24 * HOUR);
    f.reconcileStalls();
    expect(f.soilLoad('manure', '')).toBeCloseTo(6 * 2 * 0.15, 5);
  });
});

describe('rest as kept (D16)', () => {
  it('a filthy bed in a filthy room rests worse, and never to nothing', () => {
    const bed = makeStuff(() => new Chair());
    bed.setRestQuality(2);
    const kept = bed.restQualityAsKept();
    bed.soil('mud', 5);
    const room = makeStuff(() => new CartesianLocation());
    const f = floorOf('boards');
    f.soil('mud', 5);
    vi.spyOn(room, 'getFloor').mockReturnValue(f as never);
    ContainmentApi.move(bed, room);
    const filthy = bed.restQualityAsKept();
    expect(filthy).toBeLessThan(kept);
    expect(filthy).toBeGreaterThan(0);
  });
});
