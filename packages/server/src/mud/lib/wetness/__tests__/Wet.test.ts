/**
 * WetMixin — the per-object wetness gauge (weather Wave 2). Accrual is
 * pushed (`wet`), drainage is reconcile-on-read over game-time,
 * presence-frozen (far-past guard), warmth-accelerated, banded for the
 * player. See docs/subsystems/weather.md.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Thing from '../../stuff/Thing';
import { Vessel } from '../../stuff/Vessel';
import { Agent } from '../../stuff/Agent';
import Location from '../../stuff/Location';
import { Idea } from '../../stuff/Idea';
import { ThermalMixin } from '../../thermal/Thermal';
import Material from '../../material/Material';
import { MixinApi } from '../../../api/mixin';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../quantity';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import '../../../obj/WorldClockRegistry';

class WetThing extends Thing {}
class WarmWetThing extends ThermalMixin(Thing) {
  static _mixinName = 'WarmWetThing';
}

const HOUR = 3600;
// A realistic game-time base — production clocks never sit at exactly 0, so
// the `stamp === 0` first-touch sentinel is only a fresh-object marker.
const BASE = 1_000_000;

let now = BASE;
function setNow(s: number): void {
  now = BASE + s;
}

let matCounter = 0;
function material(): Material {
  matCounter += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`wet-test-mat-${matCounter}`);
    m.setSpecificHeat(Quantity.of(4186, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.6, 'W/(m·K)'));
    return m;
  }, `/lib/material/_test/wet-mat-${matCounter}`) as unknown as Material;
}

let absSeq = 0;
function absorbentThing(absorbency: number): WetThing {
  absSeq += 1;
  const mat = makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`abs-mat-${absSeq}`);
    m.setAbsorbency(absorbency);
    return m;
  }, `/lib/material/_test/abs-${absSeq}`) as unknown as Material;
  const t = makeStuff(() => new WetThing());
  (t as unknown as { setMaterial(m: Material): void }).setMaterial(mat);
  return t;
}

function warmThing(tempK: number): WarmWetThing {
  return makeStuff(() => {
    const t = new WarmWetThing();
    t.setMass(Quantity.of(1, 'kg'));
    t.setMaterial(material());
    t.setStampedTemperatureK(tempK);
    t.setLastAmbientK(tempK); // equal ambient → holds temperature
    return t;
  });
}

describe('WetMixin — the wetness gauge', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    setNow(0);
    // Drive game-time directly (game-seconds == `now`).
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
  });

  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it('a fresh object is dry and first-touch integrates nothing', () => {
    const t = makeStuff(() => new WetThing());
    expect(t.getWetness()).toBe(0);
    expect(t.getWetnessBand()).toBe('dry');
  });

  it('accrual (wet) raises saturation and the band', () => {
    const t = makeStuff(() => new WetThing());
    t.wet(0.5);
    expect(t.getWetness()).toBeCloseTo(0.5, 5);
    expect(t.getWetnessBand()).toBe('wet');
    t.wet(0.5); // clamps at 1
    expect(t.getWetness()).toBe(1);
    expect(t.getWetnessBand()).toBe('soaked');
  });

  it('dries over game-time on read', () => {
    const t = makeStuff(() => new WetThing());
    t.wet(1); // seeds the stamp at now=BASE
    setNow(HOUR); // one game-hour later
    // 1 - dryRatePerHour(0.25) * 1h == 0.75
    expect(t.getWetness()).toBeCloseTo(0.75, 5);
    setNow(2 * HOUR);
    expect(t.getWetness()).toBeCloseTo(0.5, 5);
  });

  it('never dries below zero', () => {
    const t = makeStuff(() => new WetThing());
    t.wet(0.1); // stamp at 0
    setNow(4 * HOUR); // in-range gap; 0.25*4 = 1.0 of drying >> 0.1
    expect(t.getWetness()).toBe(0);
  });

  it('presence-freeze: a far-past gap integrates nothing (drops it)', () => {
    const t = makeStuff(() => new WetThing());
    t.wet(1); // stamp at 0
    setNow(5 * HOUR); // gap > 4h far-past guard
    expect(t.getWetness()).toBe(1); // no drying across an absence
  });

  it('warmth dries faster than cold', () => {
    const warm = warmThing(330); // ~35 K above the 295 reference
    const cool = warmThing(295);
    warm.wet(1);
    cool.wet(1);
    setNow(HOUR);
    const w = warm.getWetness();
    const c = cool.getWetness();
    expect(c).toBeCloseTo(0.75, 2); // neutral warmth
    expect(w).toBeLessThan(c); // warmth accelerated the drain
  });

  it('a wet object shows a band line in its long description (not a number)', () => {
    const t = makeStuff(() => new WetThing());
    // Dry: no wetness line appended.
    const dryText = (
      t as unknown as {
        constructor: {
          markupAugmenters: Array<(s: string, h: unknown, v: unknown) => string>;
        };
      }
    ).constructor.markupAugmenters[0]!('A plain cloak.', t, t);
    expect(dryText).toBe('A plain cloak.');

    // Soaked: a band phrase, never the raw saturation number.
    t.wet(0.9);
    const wetText = (
      t as unknown as {
        constructor: {
          markupAugmenters: Array<(s: string, h: unknown, v: unknown) => string>;
        };
      }
    ).constructor.markupAugmenters[0]!('A plain cloak.', t, t);
    expect(wetText).toContain('soaked');
    expect(wetText).not.toMatch(/0\.9|0\.[0-9]/); // no raw number
  });

  it('an absorbent material dries slower than a shedding one (material-driven)', () => {
    const wool = absorbentThing(0.9); // holds water
    const steel = absorbentThing(0.05); // beads off
    wool.wet(1);
    steel.wet(1);
    setNow(2 * HOUR);
    // Both start soaked, but the wool stays far wetter than the steel.
    expect(wool.getWetness()).toBeGreaterThan(steel.getWetness());
    // The shedding metal has dried out; the absorbent wool has barely.
    expect(steel.getWetness()).toBeLessThan(0.4);
    expect(wool.getWetness()).toBeGreaterThan(0.6);
  });

  it('bands map by threshold', () => {
    const mk = (s: number): WetThing => {
      const t = makeStuff(() => new WetThing());
      t.wet(s);
      return t;
    };
    expect(mk(0.05).getWetnessBand()).toBe('dry');
    expect(mk(0.2).getWetnessBand()).toBe('damp');
    expect(mk(0.5).getWetnessBand()).toBe('wet');
    expect(mk(0.9).getWetnessBand()).toBe('soaked');
  });
});

describe('WetMixin — the host set is the matter seam', () => {
  afterEach(() => WorldClockApi._resetForTesting());

  it('matter (Thing / Vessel / Agent) is wettable; space + Ideas are not', () => {
    // "Can get wet" ⟺ "is matter" (Tangible). A Location is *space*, not
    // matter, so it is neither Tangible nor Wet; a pure Idea is neither.
    expect(MixinApi.isWet(makeStuff(() => new Thing()))).toBe(true);
    expect(MixinApi.isWet(makeStuff(() => new Vessel()))).toBe(true);
    expect(MixinApi.isWet(makeStuff(() => new Agent()))).toBe(true);
    expect(MixinApi.isWet(makeStuff(() => new Location()))).toBe(false);
    expect(MixinApi.isWet(makeStuff(() => new Idea()))).toBe(false);
  });
});
