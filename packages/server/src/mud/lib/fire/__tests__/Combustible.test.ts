/**
 * The combustion driver — ignition as a derivable energy balance, the Burning
 * lifecycle, and the extinguishers. Driven through `FireApi` (the gated
 * facade) against real `Thermal` / `Wet` / `Material` numbers. The threshold /
 * douse / verb-outcome tests run idle (no world clock — `_igniteState` stamps
 * game-time 0, the fuel drain freezes); the fuel-drain-to-char test drives the
 * real `WorldClockApi` seam (the Thermal.test harness).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Thing from '../../stuff/Thing';
import Material from '../../material/Material';
import { ThermalMixin } from '../../thermal/Thermal';
import { WetMixin } from '../../wetness/Wet';
import { ReservedMixin, Reserve } from '../../reserve';
import { CombustibleMixin } from '../Combustible';
import { FireApi } from '../../../api/fire';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { Quantity } from '../../quantity';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry'; // register the registry class
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

// A fully-composed flammable object: Combustible over Wet over Thermal over
// Reserved (fuel) over Thing — the demonstrator shape.
class Firewood extends CombustibleMixin(
  WetMixin(ThermalMixin(ReservedMixin(Thing))),
) {
  static _mixinName = 'Firewood';
}

let matCounter = 0;
/** A wood-like fuel material (oak's real figures). */
function woodMaterial(): Material {
  matCounter += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`test-wood-${matCounter}`);
    m.setAutoignitionTemperature(Quantity.of(570, 'K'));
    m.setHeatOfCombustion(Quantity.of(16, 'MJ/kg'));
    m.setSpecificHeat(Quantity.of(2000, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.17, 'W/(m·K)'));
    m.setWaterAbsorptionCapacity(Quantity.of(28, '%'));
    return m;
  }, `/stuff/idea/material/_test/wood-${matCounter}`) as unknown as Material;
}

function firewood(opts: {
  massKg: number;
  stampedK?: number;
  fuelPct?: number;
  material?: Material;
}): Firewood {
  const mat = opts.material ?? woodMaterial();
  return makeStuff(() => {
    const w = new Firewood();
    w.setMass(Quantity.of(opts.massKg, 'kg'));
    w.setMaterial(mat);
    w.setStampedTemperatureK(opts.stampedK ?? 295);
    w.setLastAmbientK(295);
    w.setReserve(
      new Reserve(
        'fuel',
        Quantity.of(100, '%'),
        Quantity.of(opts.fuelPct ?? 100, '%'),
        'combustion',
        null,
      ),
    );
    return w;
  });
}

describe('the combustion driver — ignition energy balance', () => {
  beforeEach(() => installV1QuantityMarshallers());

  it('a dry object heated past its autoignition point ignites', () => {
    const log = firewood({ massKg: 1, stampedK: 600 }); // > 570 K autoignition
    expect(FireApi.tryAutoignite(log)).toBe(true);
    expect(log.isBurning()).toBe(true);
  });

  it('an object below its autoignition point does not ignite', () => {
    const log = firewood({ massKg: 1, stampedK: 500 }); // < 570 K
    expect(FireApi.tryAutoignite(log)).toBe(false);
    expect(log.isBurning()).toBe(false);
  });

  it('a wet object will not catch until it has dried', () => {
    const log = firewood({ massKg: 1, stampedK: 600 });
    log.wet(1); // soak it — raises the effective ignition threshold well past 600
    expect(log.getEffectiveAutoignitionK()).toBeGreaterThan(600);
    expect(FireApi.tryAutoignite(log)).toBe(false);

    // Dry it back out — now the same 600 K catches.
    log.wet(-1);
    expect(log.getEffectiveAutoignitionK()).toBeCloseTo(570, 0);
    expect(FireApi.tryAutoignite(log)).toBe(true);
  });

  it('a small flame cannot out-heat a high-thermal-inertia object', () => {
    // A big log at ambient. A tiny heat deposit barely moves it.
    const beam = firewood({ massKg: 50, stampedK: 295 });
    beam.depositHeat(1000); // C = 50×2000 = 1e5 J/K → ΔT = 0.01 K
    expect(FireApi.tryAutoignite(beam)).toBe(false);

    // A large enough deposit crosses the threshold → it catches.
    beam.depositHeat(50_000_000); // ΔT = 500 K → ~795 K > 570
    expect(FireApi.tryAutoignite(beam)).toBe(true);
  });
});

describe('the combustion driver — deliberate ignite + extinguishers', () => {
  beforeEach(() => installV1QuantityMarshallers());

  it('the ignite verb lights a dry flammable object', () => {
    const log = firewood({ massKg: 1 });
    const out = FireApi.ignite(log);
    expect(out.lit).toBe(true);
    expect(log.isBurning()).toBe(true);
    // A burning object reads at the flame temperature.
    expect(log.getTemperature().rawValue()).toBe(1000);
  });

  it('the ignite verb refuses a soaked object (too wet to catch)', () => {
    const log = firewood({ massKg: 1 });
    log.wet(1);
    const out = FireApi.ignite(log);
    expect(out.lit).toBe(false);
    expect(out.reason).toBe('too-wet');
    expect(log.isBurning()).toBe(false);
  });

  it('the ignite verb refuses a non-flammable object', () => {
    const rock = makeStuff(() => new Thing());
    const out = FireApi.ignite(rock);
    expect(out.lit).toBe(false);
    expect(out.reason).toBe('not-flammable');
  });

  it('a spent (no-fuel) object will not ignite', () => {
    const log = firewood({ massKg: 1, fuelPct: 0 });
    expect(FireApi.ignite(log).lit).toBe(false);
    expect(FireApi.tryAutoignite(firewood({ massKg: 1, stampedK: 600, fuelPct: 0 }))).toBe(
      false,
    );
  });

  it('douse extinguishes a fire and wets it against re-ignition', () => {
    const log = firewood({ massKg: 1 });
    FireApi.ignite(log);
    expect(log.isBurning()).toBe(true);
    expect(FireApi.douse(log)).toBe(true);
    expect(log.isBurning()).toBe(false);
    // Wet now → re-lighting is refused.
    expect(log.getWetness()).toBeGreaterThan(0);
    expect(FireApi.ignite(log).reason).toBe('too-wet');
  });

  it('narrows Combustible via MixinApi', () => {
    expect(MixinApi.isCombustible(firewood({ massKg: 1 }))).toBe(true);
    expect(MixinApi.isCombustible(makeStuff(() => new Thing()))).toBe(false);
  });
});

// The fuel-drain lifecycle needs the world clock (the fuel reconcile is
// game-time driven). Harness mirrors Thermal.test — no clearAll in afterEach.
describe('the combustion driver — burns down to char', () => {
  let real = 0;
  const SCALE = 12; // default game-seconds per real-second

  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => WorldClockApi._resetForTesting());

  /** Advance game-time, forcing the lazy reconcile via a read. */
  function advance(w: Firewood, gameSec: number): void {
    real += (gameSec / SCALE) * 1000;
    w.reconcileBurning();
  }

  it('consumes its fuel over game-time and goes out (→ embers) at empty', () => {
    // A char material the wood becomes when it burns out.
    const ash = makeStuffAtPath(() => {
      const m = new Material();
      m.setName('test-ash');
      m.setSpecificHeat(Quantity.of(840, 'J/(kg·K)'));
      return m;
    }, '/stuff/idea/material/_test/ash') as unknown as Material;

    const log = firewood({ massKg: 1, fuelPct: 100 });
    log.setCharMaterialPath('/stuff/idea/material/_test/ash');
    FireApi.ignite(log);
    log.reconcileBurning(); // seed the burn clock stamp
    expect(log.isBurning()).toBe(true);

    // At 0.5 %/game-min it takes 200 game-min to burn 100 %. Advance past that.
    advance(log, 13_000); // > 200 game-min
    expect(log.getFuelRemaining()).toBe(0);
    expect(log.isBurning()).toBe(false); // self-extinguished at fuel exhaustion
    // The material charred → ash.
    const mat = StuffApi.findByTemplatePath<Material>('/stuff/idea/material/_test/ash');
    expect(log.getMaterial()).toBe(mat);
    void ash;
  });
});
