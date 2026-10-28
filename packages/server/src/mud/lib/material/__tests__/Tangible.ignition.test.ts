/**
 * A body's own ignition point (review R2-B1): the material's autoignition
 * raised by the water the piece holds — the fire system's one wetness
 * formula — so a pour and a firing chamber agree with `ignite` about a
 * soaked board.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import Good from '../../stuff/Good';
import Material from '../Material';
import { ThermalMixin } from '../../thermal/Thermal';
import { WetMixin } from '../../wetness/Wet';
import { ReservedMixin } from '../../reserve';
import { CombustibleMixin } from '../../fire/Combustible';
import { Quantity } from '../../quantity';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

/** A board: wets, holds heat, and is not itself a fuel. */
class Board extends WetMixin(ThermalMixin(Good)) {
  static _mixinName = 'TestIgnitionBoard';
}

/** The same body as a fuel, to prove the two reads are one formula. */
class Log extends CombustibleMixin(WetMixin(ThermalMixin(ReservedMixin(Good)))) {
  static _mixinName = 'TestIgnitionLog';
}

let n = 0;
function wood(): Material {
  n += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`ignition-wood-${n}`);
    m.setAutoignitionTemperature(Quantity.of(570, 'K'));
    m.setHeatOfCombustion(Quantity.of(16, 'MJ/kg'));
    m.setSpecificHeat(Quantity.of(2000, 'J/(kg·K)'));
    m.setWaterAbsorptionCapacity(Quantity.of(28, '%'));
    return m;
  }, `/stuff/idea/material/_test/ignition-wood-${n}`) as unknown as Material;
}

function body<T extends Board | Log>(make: () => T, mat: Material): T {
  return makeStuff(() => {
    const b = make();
    b.setMass(Quantity.of(1, 'kg'));
    b.setMaterial(mat);
    b.setStampedTemperatureK(295);
    b.setLastAmbientK(295);
    return b;
  });
}

describe('a body’s ignition point reads the water it holds (R2-B1)', () => {
  beforeEach(() => installV1QuantityMarshallers());

  it('a dry board burns under a 700 K pour; a soaked one holds', () => {
    const mat = wood();
    const dry = body(() => new Board(), mat);
    const wet = body(() => new Board(), mat);
    wet.wet(1);
    expect(dry.getIgnitionPointK()).toBe(570);
    expect(dry.canReceiveAtK(700)).toBe('burns');
    expect(wet.getIgnitionPointK()).toBeGreaterThan(700);
    expect(wet.canReceiveAtK(700)).toBe('holds');
  });

  it('a fuel’s effective ignition and a body’s ignition point are one number', () => {
    const mat = wood();
    const log = body(() => new Log(), mat);
    log.wet(0.5);
    expect(log.getIgnitionPointK()).toBeCloseTo(log.getEffectiveAutoignitionK(), 6);
  });

  it('a material that never burns has no ignition point, wet or dry', () => {
    const mat = wood();
    mat.setAutoignitionTemperature(Quantity.of(0, 'K'));
    const b = body(() => new Board(), mat);
    b.wet(1);
    expect(b.getIgnitionPointK()).toBe(0);
    expect(b.canReceiveAtK(5000)).toBe('holds');
  });
});
