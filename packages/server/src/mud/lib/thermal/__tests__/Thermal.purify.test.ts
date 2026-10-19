/**
 * ⭐ Boiling is a TEMPERATURE, not a verb — purification lives in the
 * phase engine (2026-10-19, the `boil` verb's retirement).
 *
 * A material that names a `purifiedByBoiling` arrow (fouled water →
 * water, tar → pitch) becomes what it names once its contents have been
 * HELD at their boiling point for `PURIFY_HOLD_S` — timed off the
 * vessel's own temperature trajectory, so it does not matter what held
 * it there (a fire, a stove, a hot room) or whether anyone was watching.
 *
 * ⚠ And boiling still does not fix everything: a material with no arrow
 * just gets hot.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Place from '../../stuff/Place';
import Material from '../../material/Material';
import Flask from '../../../platform/thing/Flask';
import { THERMAL_DEFAULTS } from '../Thermal';
import { ContainmentApi } from '../../../api/containment';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../quantity';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import '../../../platform/idea/WorldClockRegistry';

class TestRoom extends Place {}

// Fresh paths per test: the world clock's registry must outlive each test
// (no `clearAll`), so the materials cannot reuse a path.
let seq = 0;
let CLEAN = '';
let FOULED = '';
let LEADED = '';

function water(path: string, purifiedInto: string): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!);
    m.setDensity(Quantity.of(1000, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(4186, 'J/(kg·K)'));
    m.setMeltingPoint(Quantity.of(273, 'K'));
    m.setBoilingPoint(Quantity.of(373, 'K'));
    m.setLatentHeatOfVaporization(Quantity.of(2260000, 'J/kg'));
    m.setPurifiedByBoiling(purifiedInto);
    return m;
  }, path) as unknown as Material;
}

let realMs = 0;
const advanceGameS = (s: number): void => {
  const before = WorldClockApi.getNow().rawValue();
  // Step the real clock until the game clock has moved `s` — scale-agnostic.
  const scale = WorldClockApi.getScale() || 1;
  realMs += (s * 1000) / scale;
  expect(WorldClockApi.getNow().rawValue()).toBeGreaterThan(before);
};

/** A litre of `mat` in a flask, `startK` hot, in a room held at `roomK`. */
function flaskOf(mat: Material, startK: number, roomK: number): Flask {
  const room = makeStuff(() => new TestRoom());
  const flask = makeStuff(() => new Flask());
  flask.interiorBulk = true;
  flask.setInteriorCapacity(Quantity.of(2, 'L'));
  flask.setBulkMaterial('interior', mat);
  flask.setBulkAmount('interior', Quantity.of(1, 'L'));
  ContainmentApi.move(flask, room);
  flask.setStampedTemperatureK(startK);
  flask.setLastAmbientK(roomK);
  flask.reconcileThermal(); // first touch — seeds the trajectory
  return flask;
}

describe('purification is the phase engine’s — held at the boil', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    realMs = 1_000_000;
    WorldClockApi._setNowProviderForTesting(() => realMs);
    seq += 1;
    CLEAN = `/stuff/idea/material/_test/purify-clean-${seq}`;
    FOULED = `/stuff/idea/material/_test/purify-fouled-${seq}`;
    LEADED = `/stuff/idea/material/_test/purify-leaded-${seq}`;
    water(CLEAN, '');
    water(FOULED, CLEAN);
    water(LEADED, '');
  });
  afterEach(() => WorldClockApi._resetForTesting());

  it('⭐ a pot held at a rolling boil comes off as what its material names', () => {
    const flask = flaskOf(StuffApi.findByTemplatePath<Material>(FOULED)!, 373, 400);
    advanceGameS(THERMAL_DEFAULTS.PURIFY_HOLD_S * 3);
    flask.reconcileThermal();
    expect(flask.getBulkMaterialPath('interior')).toBe(CLEAN);
    // Still a pot of water — the plateau boiled a little off, not all of it.
    expect(flask.getBulkAmount('interior').rawValue()).toBeGreaterThan(0.5);
    // The clock is cleared with the swap.
    expect(flask.getBulkPayload('interior')?.boilHeldS).toBeUndefined();
  });

  it('brought just to the boil is not enough — it must be HELD there', () => {
    const flask = flaskOf(StuffApi.findByTemplatePath<Material>(FOULED)!, 373, 400);
    advanceGameS(THERMAL_DEFAULTS.PURIFY_HOLD_S / 6);
    flask.reconcileThermal();
    expect(flask.getBulkMaterialPath('interior')).toBe(FOULED);
    expect(flask.getBulkPayload('interior')?.boilHeldS ?? 0).toBeGreaterThan(0);
  });

  it('warm is not boiling — a pot that never reaches the boil keeps no clock', () => {
    const flask = flaskOf(StuffApi.findByTemplatePath<Material>(FOULED)!, 330, 340);
    advanceGameS(THERMAL_DEFAULTS.PURIFY_HOLD_S * 10);
    flask.reconcileThermal();
    expect(flask.getBulkMaterialPath('interior')).toBe(FOULED);
    expect(flask.getBulkPayload('interior')?.boilHeldS).toBeUndefined();
  });

  it('⚠ boiling does not fix everything — no arrow, just hotter', () => {
    const flask = flaskOf(StuffApi.findByTemplatePath<Material>(LEADED)!, 373, 400);
    advanceGameS(THERMAL_DEFAULTS.PURIFY_HOLD_S * 3);
    flask.reconcileThermal();
    expect(flask.getBulkMaterialPath('interior')).toBe(LEADED);
  });
});
