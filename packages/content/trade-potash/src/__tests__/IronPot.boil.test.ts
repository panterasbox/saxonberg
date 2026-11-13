/**
 * The iron pot on a REAL fire (potash D8, D11) — the drive found two pots
 * on a lit hearth still full of liquor after a day. This puts an `IronPot`
 * of lye on a lit `Hearth` with the real thermal engine and a controlled
 * clock, reads it the way a player does, and says what happened.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import IronPot from '../thing/IronPot';
import Hearth from '@saxonberg/server/mud/platform/thing/Hearth';
import Place from '@saxonberg/server/mud/lib/stuff/Place';
import Material from '@saxonberg/server/mud/lib/material/Material';
import Lye from '@saxonberg/server/mud/platform/idea/material/Lye';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { chargeWood } from '@saxonberg/server/mud/lib/fire/__tests__/burner-fuel';
import '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Burner } from '@saxonberg/server/mud/lib/fire/Burner';
import { Placements } from '@saxonberg/server/mud/lib/spatial/Placement';

class TestRoom extends Place {}

let seq = 0;
let realMs = 0;
const advanceGameS = (s: number): void => {
  const scale = WorldClockApi.getScale() || 1;
  realMs += (s * 1000) / scale;
};

function lye(): Lye {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Lye();
    m.setName(`test lye ${seq}`);
    m.setTags(['liquid', 'caustic', 'alkali', 'lye']);
    m.setDensity(Quantity.of(1100, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(3800, 'J/(kg·K)'));
    m.setMeltingPoint(Quantity.of(271, 'K'));
    m.setBoilingPoint(Quantity.of(375, 'K'));
    m.setLatentHeatOfVaporization(Quantity.of(2260000, 'J/kg'));
    return m;
  }, `/trade/chandlery/idea/material/_boil-lye-${seq}`);
}

describe('an iron pot of lye on a lit hearth', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    // The cake the boil casts is black salts — a row the act loads (D2 c);
    // stand it, as the shipped pack's row would be. The cast itself is
    // IronPot.test's subject: stubbed here, where only the boil is.
    makeStuffAtPath(() => new Material(), '/trade/potash/idea/material/black-salts');
    vi.spyOn(IronPot.prototype, 'castInto').mockResolvedValue(null as never);
    WorldClockApi._resetForTesting();
    realMs = 1_000_000;
    WorldClockApi._setNowProviderForTesting(() => realMs);
  });
  afterEach(async () => {
    // The boil's salts cast loads its material first (load-on-use D2 c): let
    // it land before the world is cleared under it.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
    StuffApi.clearAll();
  });

  it('⭐ heats on the fire, holds at the boil while the water goes, and keeps its alkali', () => {
    const room = makeStuff(() => new TestRoom());
    const hearth = makeStuff(() => new Hearth());
    ContainmentApi.move(hearth, room);
    hearth.setMaxBurnPowerW(6000);
    const pot = makeStuff(() => new IronPot());
    pot.interiorBulk = true; // as the row authors it
    // ⭐ The row's 40 kg of cast iron. The plateau boils off `overshoot ×
    // capacity`, and the pot's own iron is most of that capacity: without
    // it the last of the liquor boils away ever more slowly, and never.
    pot.setMass(Quantity.of(40, 'kg'));
    pot.setMaterial(makeStuffAtPath(() => {
      const m = new Material();
      m.setName('cast iron');
      m.setDensity(Quantity.of(7200, 'kg/m³'));
      m.setSpecificHeat(Quantity.of(460, 'J/(kg·K)'));
      return m;
    }, `/stuff/idea/material/_boil-iron-${++seq}`));
    pot.setInteriorCapacity(Quantity.of(40, 'L'));
    pot.setBulkMaterial('interior', lye());
    pot.setBulkAmount('interior', Quantity.of(6, 'L'));
    pot.setBulkPayload('interior', { dissolvedSolidsKgPerL: 0.05 });
    ContainmentApi.move(pot, hearth, Placements.ON);
    pot.getContents();
    // ⭐ The world's order: the pot sits on a COLD hearth, then the fire is
    // laid and lit.
    advanceGameS(600);
    pot.getContents();
    chargeWood(hearth as unknown as Stuff & Burner, 20);
    expect(hearth.ignite().lit).toBe(true);
    // A pot of lye on a lit hearth, its flame derived from the fuel.
    let boiled = false;
    for (let h = 1; h <= 6; h++) {
      advanceGameS(3600);
      pot.getContents();
      const litres = pot.getBulkAmount('interior').rawValue();
      if (litres > 0 && litres < 6) {
        boiled = true;
        // ⭐ The plateau: it holds AT the lye's boiling point while it boils.
        expect(pot.getTemperature().rawValue()).toBeCloseTo(375, 0);
      }
    }
    const litres = pot.getBulkAmount('interior').rawValue();
    expect(boiled, 'the lye boiled').toBe(true);
    expect(litres, 'well down').toBeLessThan(3);
    // ⭐ The alkali stays as the water goes: count conserved, strength up.
    if (litres > 0) {
      expect(pot.getAlkaliKg()).toBeCloseTo(0.3, 6);
      expect(pot.getBulkPayload('interior')?.dissolvedSolidsKgPerL ?? 0).toBeCloseTo(0.3 / litres, 4);
    }
  });
});
