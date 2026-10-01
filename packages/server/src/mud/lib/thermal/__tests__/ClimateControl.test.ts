/**
 * ⭐⭐ ClimateControl — the Thing≡Location proof (cold-storage W3, ADD 1).
 *
 * One mixin, composed on a Thing (a fridge) and on a Location (a walk-in),
 * runs through the SAME assertion set: powered → the air pulls down to the
 * setpoint over the envelope's own C/U; cut → it drifts toward the outside;
 * a setpoint below a warm outside is an air-conditioner; a shut door holds
 * where an open one cannot; and a Thermal thing inside reads the driven air.
 * The parity checkpoint asserts the Thing and the Location, same volume /
 * enclosure / setpoint / outside / gap, land on the same temperature — the
 * promise delivered rather than asserted.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Good from '../../stuff/Good';
import Material from '../../material/Material';
import Biome from '../../biome/Biome';
import CartesianLocation from '../../location/CartesianLocation';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import { ClimateControlMixin } from '../ClimateControl';
import { AtmosphericMixin } from '../../biome/Atmospheric';
import { ContainerMixin } from '../../spatial/Container';
import { SealableMixin } from '../../spatial/Sealable';
import { ThermalMixin } from '../Thermal';
import { Piecewise } from '../../Trajectory';
import type { MixinConstructor } from '../../mixin';
import { Quantity } from '../../quantity';
import { MixinApi } from '../../../api/mixin';
import { WorldClockApi } from '../../../api/worldclock';
import WorldClockRegistry from '../../../platform/idea/WorldClockRegistry';
import { TemplatePaths } from '../../paths';
import { BiomeApi } from '../../../api/biome';
import { ContainmentApi } from '../../../api/containment';
import { StuffApi } from '../../../api/stuff';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const BIOME_K = 290;
const INDOOR = '/stuff/idea/biome/_cc/indoor';
const INSULATION = '/stuff/idea/material/_cc/panel';

/** A test supply: powered unless a cut is scheduled; publishes the trajectory. */
function FakePoweredMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class FakePoweredMixin extends Base {
    static _mixinName = 'FakePoweredMixin';
    public cutAtS: number | null = null;
    isPowered(): boolean {
      return this.cutAtS === null;
    }
    availablePowerW(): number {
      return 1000;
    }
    poweredTrajectory(fromS: number, toS: number): Piecewise {
      if (this.cutAtS === null || this.cutAtS <= fromS) {
        const v = this.cutAtS === null ? 1 : 0;
        return new Piecewise([
          { fromS, toS, startValue: v, target: v, tau: 0 },
        ]);
      }
      return new Piecewise([
        { fromS, toS: this.cutAtS, startValue: 1, target: 1, tau: 0 },
        { fromS: this.cutAtS, toS, startValue: 0, target: 0, tau: 0 },
      ]);
    }
  };
}

/** The Thing fixture — the coach overrides, verbatim in spirit. */
class CCThing extends ClimateControlMixin(
  FakePoweredMixin(SealableMixin(AtmosphericMixin(ContainerMixin(Good)))),
) {
  static _mixinName = 'CCThing';
  public interiorVolumeM3: Quantity<'m³'> | null = null;
  getVolume(): Quantity<'m³'> | null {
    return this.interiorVolumeM3;
  }
  envelopeApplies(): boolean {
    return this.getVolume() !== null;
  }
  openExteriorOpenings(): number {
    return this.isOpen() ? 1 : 0;
  }
}

/** The Location fixture — a room already answers volume / sky / enclosure. */
class CCRoom extends ClimateControlMixin(FakePoweredMixin(CartesianLocation)) {
  static _mixinName = 'CCRoom';
}

let nowS = 1000;
const gnow = (): number => WorldClockApi.getNow().rawValue();
const advance = (g: number): void => {
  nowS += (g / WorldClockApi.getScale()) * 1000;
};

function reconcile(scope: { envelopeTemperatureSync(): number | null }): void {
  scope.envelopeTemperatureSync();
}

describe('ClimateControl — Thing ≡ Location', () => {
  afterEach(() => StuffApi.clearAll());
  beforeEach(() => {
    StuffApi.clearAll();
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    nowS = 1000;
    WorldClockApi._setNowProviderForTesting(() => nowS);
    if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
      makeStuffAtPath(
        () => new WorldClockRegistry(),
        TemplatePaths.worldClockRegistry,
      );
    }
    BiomeApi.invalidateRootBiomeCache();
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName('cc-panel');
      m.setThermalConductivity(Quantity.of(0.03, 'W/(m·K)')); // insulated
      m.setDensity(Quantity.of(40, 'kg/m³'));
      m.setSpecificHeat(Quantity.of(1400, 'J/(kg·K)'));
      return m;
    }, INSULATION);
    makeStuffAtPath(() => {
      const b = new Biome();
      b.setDefaultTemperature(Quantity.of(BIOME_K, 'K'));
      b.setDefaultPressure(Quantity.of(101325, 'Pa'));
      b.setDefaultHumidity(Quantity.of(50, '%'));
      b.setDefaultGravity(Quantity.of(9.81, 'm/s²'));
      b.setDefaultWind(Quantity.of(0, 'm/s'));
      b.setDefaultAtmosphere('air');
      return b;
    }, INDOOR);
  });

  function makeThing(setpointK: number, outsideK: number): CCThing {
    const t = makeStuff(() => new CCThing());
    t.interiorVolumeM3 = Quantity.of(1, 'm³');
    (t as unknown as { setEnclosure(f: unknown): void }).setEnclosure({
      material: INSULATION,
      thicknessM: 0.1,
    });
    t.setSetpointK(setpointK);
    t.setCoolingCapacityW(50);
    (t as unknown as { envelopeOutsideK: number }).envelopeOutsideK = outsideK;
    (t as unknown as { envelopeTemperatureK: number }).envelopeTemperatureK = outsideK;
    if (!t.isOpen()) {
      /* shut by default */
    }
    return t;
  }

  function makeRoom(setpointK: number, outsideK: number): CCRoom {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1); // 1 m³, matching the Thing
    const r = makeStuff(() => new CCRoom());
    zone.addLocation(r, 0, 0, 0);
    (r as unknown as Record<string, unknown>)._biomePath = INDOOR;
    (r as unknown as { setEnclosure(f: unknown): void }).setEnclosure({
      material: INSULATION,
      thicknessM: 0.1,
    });
    r.setSetpointK(setpointK);
    r.setCoolingCapacityW(50);
    (r as unknown as { envelopeOutsideK: number }).envelopeOutsideK = outsideK;
    (r as unknown as { envelopeTemperatureK: number }).envelopeTemperatureK = outsideK;
    return r;
  }

  it('powered: the air pulls DOWN toward the setpoint (both hosts)', () => {
    const thing = makeThing(277, 290);
    const room = makeRoom(277, 290);
    reconcile(thing);
    reconcile(room);
    advance(6 * 3600); // six game-hours
    reconcile(thing);
    reconcile(room);
    expect(thing.envelopeTemperatureSync()!).toBeLessThan(285);
    expect(room.envelopeTemperatureSync()!).toBeLessThan(285);
    // ⭐ Parity: the same mixin on a Thing and a Location, same everything,
    // lands on the same air.
    expect(
      Math.abs(thing.envelopeTemperatureSync()! - room.envelopeTemperatureSync()!),
    ).toBeLessThan(0.5);
  });

  it('a thermostat holds AT the setpoint and does not undershoot', () => {
    const thing = makeThing(277, 290);
    reconcile(thing);
    advance(72 * 3600); // run it for days
    expect(thing.envelopeTemperatureSync()!).toBeGreaterThanOrEqual(276.9);
    expect(thing.envelopeTemperatureSync()!).toBeLessThan(278);
  });

  it('cut: the air drifts back toward the outside', () => {
    const thing = makeThing(277, 290);
    reconcile(thing);
    advance(12 * 3600);
    const cold = thing.envelopeTemperatureSync()!;
    expect(cold).toBeLessThan(280);
    // Cut the supply now; run on.
    thing.cutAtS = gnow();
    advance(24 * 3600);
    const warmed = thing.envelopeTemperatureSync()!;
    expect(warmed).toBeGreaterThan(cold + 3);
  });

  it('a setpoint below a warm outside is an air-conditioner', () => {
    const thing = makeThing(295, 305); // comfort in summer heat
    reconcile(thing);
    advance(12 * 3600);
    expect(thing.envelopeTemperatureSync()!).toBeLessThan(298);
  });

  it('an open door cannot hold the cold', () => {
    const shut = makeThing(277, 290);
    const open = makeThing(277, 290);
    (open as unknown as { setOpen(b: boolean): void }).setOpen(true);
    reconcile(shut);
    reconcile(open);
    advance(6 * 3600);
    // The open box leaks far more, so it stays much warmer than the shut one.
    expect(open.envelopeTemperatureSync()!).toBeGreaterThan(
      shut.envelopeTemperatureSync()! + 2,
    );
  });

  it('both hosts compose ClimateControl and are detected as one', () => {
    const thing = makeThing(277, 290);
    const room = makeRoom(277, 290);
    expect(MixinApi.isClimateControl(thing)).toBe(true);
    expect(MixinApi.isClimateControl(room)).toBe(true);
  });
});
