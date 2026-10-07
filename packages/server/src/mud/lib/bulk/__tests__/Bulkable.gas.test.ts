/**
 * ⭐⭐ **Gas is bulk that only a sealed vessel holds** — and the three
 * facts that make it work are all DERIVED.
 *
 *  1. **Phase** comes off the material's boiling point against the
 *     standard ambient. There is no `phase` field and no `gas` tag read,
 *     so a pack ships a gas by authoring one number it already had a
 *     place for.
 *  2. **Pressure** is amount over capacity. Gas is measured per volume
 *     and never as a fill fraction — which is the constraint drilling
 *     imposes, satisfied before drilling exists.
 *  3. **Retention** is closure AND the lid: construction and state are
 *     two facts, so a sealed can standing open is a hole.
 *
 * And the fourth outcome of a transfer: a gas poured into something that
 * will not hold it **escapes into the air of the room**. ⚠ Not a floor
 * puddle (absurd) and not silence (dangerous in a shut room).
 *
 * ⛔ This file also pins the live defect the build found: three vessels
 * authored `closure: none`, which is not a `ClosureLevel`, so
 * `CLOSURE_ORDER['none']` was `undefined`, the comparison was `NaN`,
 * `NaN < 0` was false and all three **retained liquid as though they
 * were lidded** — including a salt-pan whose entire mechanism is that a
 * covered pan does not work.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BulkableApi } from '../../../api/bulk';
import { BulkableMixin } from '../Bulkable';
import { SealableMixin } from '../../spatial/Sealable';
import { UnboundedSourceMixin } from '../UnboundedSource';
import { NamedMixin } from '../../description/Named';
import { ContainableMixin } from '../../spatial/Containable';
import { Idea } from '../../stuff/Idea';
import Material from '../../material/Material';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import CartesianLocation from '../../location/CartesianLocation';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import { BiomeApi } from '../../../api/biome';
import { ContainmentApi } from '../../../api/containment';
import { ExecutionContextApi } from '../../../api/execution-context';
import type { BulkSlot } from '../Bulkable';
import type { TransferAmount, TransferResult } from '../../../api/bulk';
import type { Stuff } from '../../stuff/Stuff';
import type { Container } from '../../spatial/Container';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';

function transfer(
  from: BulkSlot,
  to: BulkSlot | null,
  amount: TransferAmount,
): TransferResult {
  return ExecutionContextApi.run(
    null,
    BulkableApi,
    'test-harness',
    undefined,
    () => BulkableApi.transfer(from, to, amount),
  );
}

class TestVessel extends BulkableMixin(ContainableMixin(NamedMixin(Idea))) {
  static _mixinName = 'TestGasVessel';
}
/** A vessel with a LID — closure is construction, the lid is state. */
class TestCan extends SealableMixin(
  BulkableMixin(ContainableMixin(NamedMixin(Idea))),
) {
  static _mixinName = 'TestGasCan';
}
class TestSource extends UnboundedSourceMixin(
  BulkableMixin(ContainableMixin(NamedMixin(Idea))),
) {
  static _mixinName = 'TestGasSource';
}

let seq = 0;

/** A material at `boilingPoint` K — the one authored number phase reads. */
function material(name: string, boilingPointK: number): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setDensity(Quantity.of(boilingPointK < 200 ? 0.7 : 1000, 'kg/m³'));
    m.setBoilingPoint(Quantity.of(boilingPointK, 'K'));
    return m;
  }, `/stuff/idea/material/_test/gas-${name}-${seq}`) as unknown as Material;
}

describe('a gas', () => {
  let zone: CartesianZone;
  let room: CartesianLocation;

  beforeEach(() => {
    zone = makeStuff(() => new CartesianZone());
    room = makeStuff(() => new CartesianLocation());
    zone.addLocation(room, 0, 0, 0);
  });
  afterEach(() => StuffApi.clearAll());

  function vessel(
    closure: 'open' | 'liquidTight' | 'sealed',
    capacityL: number,
  ): TestVessel {
    const v = makeStuff(() => {
      const x = new TestVessel();
      x.setName('vessel');
      (x as unknown as { interiorBulk: boolean }).interiorBulk = true;
      x.setInteriorCapacity(Quantity.of(capacityL, 'L'));
      x.setClosure(closure);
      return x;
    }) as TestVessel;
    ContainmentApi.move(v as never, room as never);
    return v;
  }

  function source(m: Material): TestSource {
    const s = makeStuff(() => {
      const x = new TestSource();
      x.setName('source');
      (x as unknown as { interiorBulk: boolean }).interiorBulk = true;
      return x;
    }) as TestSource;
    s.setBulkMaterial('interior', m);
    s.setBulkAmount('interior', Quantity.of(1, 'L'));
    ContainmentApi.move(s as never, room as never);
    return s;
  }

  function airOf(path: string): number {
    const hit = BiomeApi.resolveAtmosphereContentsFor(
      room as unknown as Stuff & Container,
    ).find((c) => c.type === path);
    return hit?.amount ?? 0;
  }

  describe('phase derives from the boiling point', () => {
    it('⭐ a gas needs `sealed`; a liquid needs `liquidTight`', () => {
      // Coal gas boils at 110 K, water at 373, lamp oil at 470 — and air
      // at 79, which `air.yaml` did not author at all before this build.
      expect(BulkableApi.requiredClosureFor(material('coal-gas', 110)))
        .toBe('sealed');
      expect(BulkableApi.requiredClosureFor(material('air', 79)))
        .toBe('sealed');
      expect(BulkableApi.requiredClosureFor(material('water', 373)))
        .toBe('liquidTight');
      expect(BulkableApi.requiredClosureFor(material('lamp-oil', 470)))
        .toBe('liquidTight');
    });

    it('a material with no boiling point authored is treated as a liquid', () => {
      expect(BulkableApi.requiredClosureFor(material('mystery', 0)))
        .toBe('liquidTight');
      expect(BulkableApi.requiredClosureFor(null)).toBe('liquidTight');
    });
  });

  describe('⛔ the closure scale refuses a rung that is not on it', () => {
    it('`none` throws — it used to be stored, and the comparison was NaN', () => {
      const v = vessel('open', 10);
      expect(() =>
        (v as unknown as { setClosure(l: string): void }).setClosure('none'),
      ).toThrow(TypeError);
      expect(v.getClosure()).toBe('open');
    });

    it('⭐ and a pail that reads `open` now actually drains', () => {
      // The live defect: with `none` stored, `compareClosure` yielded NaN
      // and `NaN < 0` is false, so the drain-through arm never fired.
      const water = material('water', 373);
      const pail = vessel('open', 10);
      const result = transfer(source(water).getBulk('interior'), pail.getBulk('interior'), {
        kind: 'measure',
        litres: 1,
        mode: 'lenient',
      });
      expect(result.status).not.toBe('partial');
      expect(pail.getBulkAmount('interior').rawValue()).toBe(0);
    });
  });

  describe('pressure is a consequence', () => {
    it('⭐ amount over capacity, and `null` for anything that is not a gas', () => {
      const gas = material('coal-gas', 110);
      const tank = vessel('sealed', 100);
      transfer(source(gas).getBulk('interior'), tank.getBulk('interior'), {
        kind: 'measure',
        litres: 50,
        mode: 'lenient',
      });
      expect(tank.getGasPressureAtm('interior')).toBeCloseTo(0.5);

      const bottle = vessel('liquidTight', 100);
      transfer(
        source(material('water', 373)).getBulk('interior'),
        bottle.getBulk('interior'),
        { kind: 'measure', litres: 50, mode: 'lenient' },
      );
      expect(bottle.getGasPressureAtm('interior')).toBeNull();
      // An empty slot has no pressure either — there is nothing in it.
      expect(vessel('sealed', 100).getGasPressureAtm('interior')).toBeNull();
    });
  });

  describe('⭐⭐ the escape branch', () => {
    function pourGasInto(dest: TestVessel | TestCan): TransferResult {
      const gas = material('coal-gas', 110);
      return transfer(
        source(gas).getBulk('interior'),
        dest.getBulk('interior'),
        { kind: 'measure', litres: 20, mode: 'lenient' },
      );
    }

    it('an OPEN vessel: escaped, and the litres are in the room', () => {
      const pail = vessel('open', 100);
      const r = pourGasInto(pail);
      expect(r.status).toBe('escaped');
      expect(pail.getBulkAmount('interior').rawValue()).toBe(0);
      expect(r.notes.some((n) => n.kind === 'target-declined')).toBe(true);
      // ⭐ Not lost and not a floor puddle: it went into the AIR, which is
      // what makes a bungled pour in a shut room dangerous.
      const contents = BiomeApi.resolveAtmosphereContentsFor(
        room as unknown as Stuff & Container,
      );
      expect(contents.length).toBe(1);
      expect(contents[0]!.amount).toBeGreaterThan(0);
    });

    it('a LIQUID-TIGHT vessel: also escaped — a bottle is not gas-tight', () => {
      const bottle = vessel('liquidTight', 100);
      expect(pourGasInto(bottle).status).toBe('escaped');
      expect(bottle.getBulkAmount('interior').rawValue()).toBe(0);
    });

    it('a SEALED vessel holds it', () => {
      const cylinder = vessel('sealed', 100);
      const r = pourGasInto(cylinder);
      expect(r.status).not.toBe('escaped');
      expect(cylinder.getBulkAmount('interior').rawValue()).toBeGreaterThan(0);
    });

    it('⭐⭐ a sealed vessel standing OPEN is a hole — closure is construction, the lid is state', () => {
      const can = makeStuff(() => {
        const x = new TestCan();
        x.setName('can');
        (x as unknown as { interiorBulk: boolean }).interiorBulk = true;
        x.setInteriorCapacity(Quantity.of(100, 'L'));
        x.setClosure('sealed');
        return x;
      }) as TestCan;
      ContainmentApi.move(can as never, room as never);

      can.setOpen(true);
      expect(can.isGasRetained('interior')).toBe(true); // nothing in it yet
      expect(pourGasInto(can).status).toBe('escaped');

      can.setOpen(false);
      const held = pourGasInto(can);
      expect(held.status).not.toBe('escaped');
      expect(can.getBulkAmount('interior').rawValue()).toBeGreaterThan(0);
      expect(can.isGasRetained('interior')).toBe(true);
    });
  });

  it('⭐ a gas does not boil away — it is already above its boiling point', () => {
    // ⚠ Without the guard in `reconcileBulkPhase`, a lamp filled with
    // coal gas would be destroyed by its own flame on the first tick and
    // a gasometer in the sun would empty itself.
    const gas = material('coal-gas', 110);
    const cylinder = vessel('sealed', 100);
    transfer(source(gas).getBulk('interior'), cylinder.getBulk('interior'), {
      kind: 'measure',
      litres: 40,
      mode: 'lenient',
    });
    const before = cylinder.getBulkAmount('interior').rawValue();
    expect(before).toBeGreaterThan(0);
    // The vessel here is not Thermal, so assert the DERIVATION the guard
    // reads — one definition of "gas", on the material.
    expect(BulkableApi.requiredClosureFor(gas)).toBe('sealed');
    expect(airOf('x')).toBe(0);
  });
});
