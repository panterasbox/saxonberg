/**
 * ⭐⭐ One water for porous bodies (matter-model-overlaps D19).
 *
 * One rain, one exposure, one face — two records:
 *
 *   - **the film** (`Wet`) — rain lands by where a thing stands
 *     (`weatherReach()`), and a sealed outside (a glaze) sheds four fifths of
 *     it (`wetness.shedShare`);
 *   - **the soak** (`Moist`) — off the RAIN RECORD (`BiomeApi.airSegmentsFor`),
 *     what lands soaks into a porous body at its own rate × `cure.soakFactor`
 *     up to full, and nothing through a sealed outside. It never debits the
 *     film: the two are fed by the same rain and no water moves between them.
 *
 * The fire still adds the two waters (`getWetIgnitionPenaltyK`), unchanged.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Good from '../../stuff/Good';
import Place from '../../stuff/Place';
import Ceramic from '../../../platform/idea/material/Ceramic';
import { MoistureMixin, Moisture } from '../../material/Moisture';
import { PlacingMixin } from '../../spatial/Placing';
import { ContainerMixin } from '../../spatial/Container';
import { Evaporation } from '../../material/Evaporation';
import { Quantity } from '../../quantity';
import { BiomeApi } from '../../../api/biome';
import { ContainmentApi } from '../../../api/containment';
import { WorldClockApi } from '../../../api/worldclock';
import { Placements } from '../../spatial/Placement';
import type { Stuff } from '../../stuff/Stuff';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import '../../../platform/idea/WorldClockRegistry';

/** A fired pot, a brick: a porous Good (so Faced and Wet) that holds water. */
class Pot extends MoistureMixin(Good) {
  static _mixinName = 'WetRainTestPot';
}
class Rack extends PlacingMixin(Good) {
  static _mixinName = 'WetRainTestRack';
}
class Sack extends ContainerMixin(Good) {
  static _mixinName = 'WetRainTestSack';
}
class Yard extends Place {}
class Shed extends Place {}

let real = 0;
const SCALE = 12;
const advance = (gameS: number): void => {
  real += (gameS / SCALE) * 1000;
};

let seq = 0;
function ceramic(name: string, absorbsPct: number): Ceramic {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Ceramic();
    m.setName(name);
    m.setDensity(Quantity.of(1900, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(840, 'J/(kg·K)'));
    m.setWaterAbsorptionCapacity(Quantity.of(absorbsPct, '%'));
    return m;
  }, `/stuff/idea/material/_wet-rain/${name}-${seq}`) as unknown as Ceramic;
}

let terracotta: Ceramic;
let glaze: Ceramic;

const AIR = new Evaporation(60, 1, 290);
const EQ = Moisture.equilibriumMoisture(60);

function pot(moisture: number, glazed = false): Pot {
  const p = makeStuff(() => {
    const x = new Pot();
    x.setMass(Quantity.of(2, 'kg'));
    x.setMaterial(terracotta);
    return x;
  });
  if (glazed) {
    void p.setCoats({ outside: [{ material: glaze.getTemplatePath()!, thicknessM: 0.0003, state: 'set' }] });
  }
  p.setWaterState({ moisture, solute: 0 });
  return p;
}

/** The rain record: `mmPerH` on `wet` scopes for each `[fromS, toS)` window in `rainy`, none elsewhere. */
function weather(wet: Set<Stuff>, mmPerH: number, rainy: (s: number) => boolean = () => true): void {
  vi.spyOn(BiomeApi, 'airFor').mockReturnValue(AIR as never);
  vi.spyOn(BiomeApi, 'airSegmentsFor').mockImplementation(((scope: Stuff, t0: number, t1: number) => {
    const out: { air: Evaporation; durationS: number; rainMmPerH: number }[] = [];
    // Six-hour segments on the weather's own grid, cut at the window.
    for (let a = t0; a < t1; ) {
      const b = Math.min(t1, (Math.floor(a / 21_600) + 1) * 21_600);
      out.push({ air: AIR, durationS: b - a, rainMmPerH: wet.has(scope) && rainy(a) ? mmPerH : 0 });
      a = b;
    }
    return out;
  }) as never);
}

beforeEach(() => {
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  real = 1_000_000;
  WorldClockApi._setNowProviderForTesting(() => real);
  terracotta = ceramic('terracotta', 15);
  glaze = ceramic('glaze', 0);
});
afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe('the reach — one exposure for rain and for drying', () => {
  it('on a rack all of it; on bare ground a third; shut in a sack none', async () => {
    const yard = makeStuff(() => new Yard());
    const rack = makeStuff(() => new Rack());
    await ContainmentApi.move(rack as never, yard as never);
    const racked = pot(0.7);
    const grounded = pot(0.7);
    const sacked = pot(0.7);
    const sack = makeStuff(() => new Sack());
    await ContainmentApi.move(sack as never, yard as never);
    await ContainmentApi.move(racked as never, rack as never, Placements.ON);
    await ContainmentApi.move(grounded as never, yard as never);
    await ContainmentApi.move(sacked as never, sack as never);
    expect(racked.weatherReach()).toBe(1);
    expect(grounded.weatherReach()).toBeCloseTo(0.35, 9);
    expect(sacked.weatherReach()).toBe(0);
  });
});

describe('⭐ the film — rain lands by reach, and a sealed face sheds it', () => {
  it('a glazed pot\'s film takes a fifth of what the terracotta beside it takes', async () => {
    const yard = makeStuff(() => new Yard());
    const glazed = pot(0.7, true);
    const bare = pot(0.7);
    for (const p of [glazed, bare]) await ContainmentApi.move(p as never, yard as never);
    expect(glazed.isSealed('outside')).toBe(true);
    expect(bare.isSealed('outside')).toBe(false);
    glazed.takeRain(0.2);
    bare.takeRain(0.2);
    expect(bare.getWetness()).toBeCloseTo(0.2 * 0.35, 9);
    expect(glazed.getWetness()).toBeCloseTo(0.2 * 0.35 * 0.2, 9);
  });

  it('a pot shut in a sack takes no rain on its film', async () => {
    const yard = makeStuff(() => new Yard());
    const sack = makeStuff(() => new Sack());
    await ContainmentApi.move(sack as never, yard as never);
    const p = pot(0.7);
    await ContainmentApi.move(p as never, sack as never);
    p.takeRain(0.5);
    expect(p.getWetness()).toBe(0);
  });
});

describe('⭐⭐ the soak — off the rain record, into a porous body', () => {
  it('in rain the terracotta\'s held water rises; the glazed pot beside it takes none into its body', async () => {
    const yard = makeStuff(() => new Yard());
    weather(new Set([yard]), 5);
    const glazed = pot(EQ + 0.01, true);
    const bare = pot(EQ + 0.01);
    for (const p of [glazed, bare]) {
      await ContainmentApi.move(p as never, yard as never);
      p.getMoisture(); // the clock starts
    }
    advance(24 * 3600);
    expect(bare.getMoisture()).toBeGreaterThan(EQ + 0.01);
    expect(glazed.getMoisture()).toBeLessThanOrEqual(EQ + 0.01);
  });

  it('⭐ glazed inside AND out, a dry pot takes nothing from a wet hour — neither the rain nor the humid air; the bare one beside it does (found by the drive)', async () => {
    const yard = makeStuff(() => new Yard());
    weather(new Set([yard]), 5);
    const sealed = pot(0.05, true);
    void sealed.setCoats({
      outside: [{ material: glaze.getTemplatePath()!, thicknessM: 0.0003, state: 'set' }],
      inside: [{ material: glaze.getTemplatePath()!, thicknessM: 0.0003, state: 'set' }],
    });
    const bare = pot(0.05);
    for (const p of [sealed, bare]) {
      await ContainmentApi.move(p as never, yard as never);
      p.getMoisture(); // the clock starts
    }
    expect(sealed.isSealed('inside')).toBe(true);
    advance(3600);
    expect(bare.getMoisture()).toBeGreaterThan(0.05);
    expect(sealed.getMoisture()).toBeCloseTo(0.05, 9);
  });

  it('a brick under the cover takes none — the rain record is the scope\'s, and the shed\'s has no rain', async () => {
    const yard = makeStuff(() => new Yard());
    const shed = makeStuff(() => new Shed());
    weather(new Set([yard]), 5);
    const out = pot(EQ + 0.01);
    const under = pot(EQ + 0.01);
    await ContainmentApi.move(out as never, yard as never);
    await ContainmentApi.move(under as never, shed as never);
    out.getMoisture();
    under.getMoisture();
    advance(24 * 3600);
    expect(out.getMoisture()).toBeGreaterThan(EQ + 0.01);
    expect(under.getMoisture()).toBeLessThan(EQ + 0.01); // it dried
  });

  it('the soak stops at what the body can hold: ten times the rain soaks no more', async () => {
    const yard = makeStuff(() => new Yard());
    const rack = makeStuff(() => new Rack());
    await ContainmentApi.move(rack as never, yard as never);
    const results: number[] = [];
    for (const mm of [50, 500]) {
      vi.restoreAllMocks();
      weather(new Set([yard]), mm);
      const p = pot(0.9);
      await ContainmentApi.move(p as never, rack as never, Placements.ON);
      p.getMoisture();
      advance(6 * 3600);
      results.push(p.getMoisture());
      real -= ((6 * 3600) / SCALE) * 1000;
    }
    expect(results[0]).toBeLessThan(1);
    expect(results[0]).toBeGreaterThan(0.9);
    expect(results[1]).toBeCloseTo(results[0]!, 9);
  });

  it('⭐ the soak never moves the film', async () => {
    const yard = makeStuff(() => new Yard());
    weather(new Set([yard]), 10);
    const p = pot(EQ + 0.01);
    await ContainmentApi.move(p as never, yard as never);
    p.getMoisture();
    p.takeRain(1); // the film, soaked as far as its reach allows
    advance(12 * 3600);
    const film = p.getWetness(); // the film's own drain, read first
    const before = EQ + 0.01;
    const held = p.getMoisture(); // the soak integrates now
    expect(held).toBeGreaterThan(before);
    expect(p.getWetness()).toBe(film);
  });

  it('⭐ a wet week unattended: the exposed brick follows the rain, the covered one dries, and nobody had to look', async () => {
    const yard = makeStuff(() => new Yard());
    const shed = makeStuff(() => new Shed());
    // Twelve hours of steady rain, twelve dry, for a week.
    const rainy = (s: number): boolean => Math.floor(s / 43_200) % 2 === 0;
    weather(new Set([yard]), 4, rainy);
    const start = EQ + 0.2; // leather-hard, still drying
    const exposed = pot(start);
    const watched = pot(start);
    const covered = pot(start);
    await ContainmentApi.move(exposed as never, yard as never);
    await ContainmentApi.move(watched as never, yard as never);
    await ContainmentApi.move(covered as never, shed as never);
    for (const p of [exposed, watched, covered]) p.getMoisture();
    // One is read every six hours; the others nobody looks at all week.
    for (let h = 0; h < 7 * 24; h += 6) {
      advance(6 * 3600);
      watched.getMoisture();
    }
    const out = exposed.getMoisture();
    const under = covered.getMoisture();
    // The walk is the rain record's: attended and unattended agree (to the
    // order of drying and soaking inside a segment a look happens to cut).
    expect(Math.abs(out - watched.getMoisture())).toBeLessThan(0.005);
    // The rain held the exposed brick back; the covered one dried past it.
    expect(under).toBeLessThan(out);
    expect(out).toBeLessThan(1);
    // The season's arithmetic: half the week rained 4 mm/h on a third of the
    // brick — 336 mm offered × 0.002 × 0.35 = 0.235 — and the exposed brick
    // ends wetter than the covered one by less than that (it dried between).
    const offered = 4 * 12 * 7 * 0.002 * 0.35;
    expect(out - under).toBeGreaterThan(0);
    expect(out - under).toBeLessThan(offered);
  });
});

describe('the fire still adds the two waters', () => {
  it('the ignition penalty is the film plus the held water above dried, as before', async () => {
    const yard = makeStuff(() => new Yard());
    weather(new Set([yard]), 5);
    const p = pot(0.9);
    await ContainmentApi.move(p as never, yard as never);
    p.getMoisture();
    p.takeRain(1);
    advance(6 * 3600);
    const film = p.getWetness();
    const own = Math.min(1, Math.max(0, (p.getMoisture() - 0.5) / 0.5));
    const expected = ((film + own) * 0.15 * 2_260_000) / 840;
    expect(p.getWetIgnitionPenaltyK()).toBeCloseTo(expected, 6);
  });
});
