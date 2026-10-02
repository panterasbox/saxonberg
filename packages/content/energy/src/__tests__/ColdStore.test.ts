/**
 * ColdStore + ColdRoom (cold-storage W4) — ⭐ the powered appliance over the
 * grid: it cools its interior while its meter is live and warms when cut, and
 * the Thing and the Location run the same mixin.
 *
 * The parcel meter is forced through the GridPowered private seam (the
 * ElectricLight test precedent), and the supply trajectory the envelope reads
 * is forced on the same fake catalogue.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import ColdStore from '../thing/ColdStore';
import ColdRoom from '../location/ColdRoom';
import { Piecewise } from '@saxonberg/server/mud/lib/Trajectory';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import WorldClockRegistry from '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import Material from '@saxonberg/server/mud/lib/material/Material';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';

/** Force the resolved meter + a supply trajectory (powered, or cut at `cutAtS`). */
function meter(store: ColdStore, powered: boolean, cutAtS: number | null = null): void {
  const p = store as unknown as {
    _resolved: boolean;
    _powerBand: string;
    _powerNodeRef: string | null;
    _gridCatalogue: unknown;
  };
  p._resolved = true;
  p._powerBand = powered ? 'commercial' : 'off-grid';
  p._powerNodeRef = powered ? 'terminus-main:avenue' : null;
  p._gridCatalogue = {
    energizedAtSync: () => powered && cutAtS === null,
    // ⚠ Matches GridCatalogue's (nodeRef, fromS, toS) — GridPowered passes
    // the node first.
    poweredTrajectory: (_node: string, fromS: number, toS: number): Piecewise => {
      if (cutAtS === null || cutAtS >= toS) {
        return new Piecewise([{ fromS, toS, startValue: 1, target: 1, tau: 0 }]);
      }
      if (cutAtS <= fromS) {
        return new Piecewise([{ fromS, toS, startValue: 0, target: 0, tau: 0 }]);
      }
      return new Piecewise([
        { fromS, toS: cutAtS, startValue: 1, target: 1, tau: 0 },
        { fromS: cutAtS, toS, startValue: 0, target: 0, tau: 0 },
      ]);
    },
  };
}

let nowS = 1000;
const advance = (g: number): void => {
  nowS += (g / WorldClockApi.getScale()) * 1000;
};

function makeFridge(): ColdStore {
  const f = makeStuff(() => new ColdStore());
  f.interiorVolumeM3 = 0.3;
  (f as unknown as { setEnclosure(x: unknown): void }).setEnclosure({
    material: '/stuff/idea/material/wood/pine',
    thicknessM: 0.08,
  });
  f.setSetpointK(277);
  f.setCoolingCapacityW(300);
  (f as unknown as { envelopeOutsideK: number }).envelopeOutsideK = 293;
  (f as unknown as { envelopeTemperatureK: number }).envelopeTemperatureK = 293;
  return f;
}

describe('ColdStore / ColdRoom over the grid', () => {
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
    // The enclosure material the fixtures cite — a missing one makes the
    // envelope coefficient fall back and can zero the drive.
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName('pine');
      m.setThermalConductivity(Quantity.of(0.12, 'W/(m·K)'));
      m.setDensity(Quantity.of(500, 'kg/m³'));
      m.setSpecificHeat(Quantity.of(1700, 'J/(kg·K)'));
      return m;
    }, '/stuff/idea/material/wood/pine');
  });
  afterEach(() => StuffApi.clearAll());

  it('both ColdStore and ColdRoom compose ClimateControl + Powered', () => {
    const fridge = makeStuff(() => new ColdStore());
    const room = makeStuff(() => new ColdRoom());
    expect(MixinApi.isClimateControl(fridge)).toBe(true);
    expect(MixinApi.isClimateControl(room)).toBe(true);
    // Powered is composed on both (the plug).
    expect(typeof (fridge as unknown as { poweredTrajectory?: unknown }).poweredTrajectory).toBe('function');
    expect(typeof (room as unknown as { poweredTrajectory?: unknown }).poweredTrajectory).toBe('function');
  });

  it('powered: the interior pulls down toward the setpoint', () => {
    const f = makeFridge();
    meter(f, true);
    f.envelopeTemperatureSync();
    advance(12 * 3600);
    expect(f.envelopeTemperatureSync()!).toBeLessThan(283);
  });

  it('off-grid: the interior does not cool — it sits at the outside', () => {
    const f = makeFridge();
    meter(f, false);
    f.envelopeTemperatureSync();
    advance(12 * 3600);
    // No supply → no drive → the air holds near the outside (290s), not 277.
    expect(f.envelopeTemperatureSync()!).toBeGreaterThan(288);
  });

  it('a cut mid-gap warms it back toward the outside', () => {
    const f = makeFridge();
    meter(f, true);
    f.envelopeTemperatureSync();
    advance(12 * 3600);
    const cold = f.envelopeTemperatureSync()!;
    expect(cold).toBeLessThan(283);
    // Cut now (in GAME-seconds, which is what poweredTrajectory speaks); run on
    // — the segmented envelope warms over the cut stretch.
    meter(f, true, WorldClockApi.getNow().rawValue());
    advance(24 * 3600);
    expect(f.envelopeTemperatureSync()!).toBeGreaterThan(cold + 3);
  });
});
