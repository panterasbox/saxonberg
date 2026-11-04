/**
 * ⭐⭐ A coat sets by its binder's chemistry, read off the AIR (paint D4).
 *
 * A limewash carbonates (it wants air and time — a sealed room is slow),
 * an oil oxidizes (and warms as it does), a size dries (it wants dry
 * air). Rain on a wet coat runs it; frost crazes it. A glaze that sets by
 * heat is untouched by any of it.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import Good from '../../stuff/Good';
import Material from '../Material';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import type { CoatAir } from '../Faced';
import type { KineticSpec } from '../Kinetics';

let seq = 0;
function mat(kinetics: KineticSpec[] | null, extra: (m: Material) => void = () => undefined): string {
  seq += 1;
  const path = `/stuff/idea/material/_air/m${seq}`;
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`coat ${seq}`);
    m.setDensity(Quantity.of(930, 'kg/m³'));
    if (kinetics) m.setKinetics(kinetics);
    extra(m);
    return m;
  }, path);
  return path;
}

/** A curve that sets fully in about `hours` of free air at room temperature. */
function airSet(sets: KineticSpec['sets'], hours: number, exo = 0): KineticSpec {
  return { key: 'set', sets, order: 0, rate: [[250, 0], [293, 1 / hours], [330, 2 / hours]], ...(exo ? { exothermicJPerKg: exo } : {}) };
}

function good(): Good {
  return makeStuff(() => {
    const g = new Good();
    g.setMass(Quantity.of(2, 'kg'));
    return g;
  });
}

const day = (h: number, over: Partial<CoatAir> = {}): CoatAir => ({
  seconds: h * 3600, kelvin: 293, rh: 0.5, rain: false, airChange: 1, ...over,
});

afterEach(() => StuffApi.clearAll());

describe('the air sets the coat', () => {
  it('an oil oxidizes in free air over its hours and gives off heat as it does', () => {
    const oil = mat([airSet('oxidation', 12, 4e6)]);
    const g = good();
    g.layCoat('outside', oil, 0.00005);
    const half = g.airCoats([day(6)]);
    expect(g.getCoats('outside')[0]!.state).toBe('wet');
    expect(half.heatJPerM2).toBeGreaterThan(0);
    g.airCoats([day(8)]);
    expect(g.getCoats('outside')[0]!.state).toBe('set');
  });

  it('a limewash carbonates slowly where the air barely changes', () => {
    const lime = mat([airSet('carbonation', 48)]);
    const open = good();
    const shut = good();
    open.layCoat('outside', lime, 0.00002);
    shut.layCoat('outside', lime, 0.00002);
    open.airCoats([day(50)]);
    shut.airCoats([day(50, { airChange: 0.1 })]);
    expect(open.getCoats('outside')[0]!.state).toBe('set');
    expect(shut.getCoats('outside')[0]!.state).toBe('wet');
  });

  it('a size dries in dry air and hardly at all in saturated air', () => {
    const size = mat([airSet('drying', 4)]);
    const dry = good();
    const damp = good();
    dry.layCoat('outside', size, 0.00003);
    damp.layCoat('outside', size, 0.00003);
    dry.airCoats([day(10, { rh: 0.4 })]);
    damp.airCoats([day(10, { rh: 0.98 })]);
    expect(dry.getCoats('outside')[0]!.state).toBe('set');
    expect(damp.getCoats('outside')[0]!.state).toBe('wet');
  });

  it('rain on a wet coat runs it; frost crazes it', () => {
    const oil = mat([airSet('oxidation', 12)]);
    const rained = good();
    const frozen = good();
    rained.layCoat('outside', oil, 0.00005);
    frozen.layCoat('outside', oil, 0.00005);
    rained.airCoats([day(2, { rain: true })]);
    frozen.airCoats([day(2, { kelvin: 268 })]);
    expect(rained.getCoats('outside')[0]!.state).toBe('run');
    expect(frozen.getCoats('outside')[0]!.state).toBe('crazed');
  });

  it('a coat that sets by heat is not touched by the air', () => {
    const glaze = mat([{ key: 'fuse', rate: { referenceK: 1500, zK: 40, fullDoseS: 600 } }]);
    const g = good();
    g.layCoat('outside', glaze, 0.0003);
    g.airCoats([day(1000)]);
    expect(g.getCoats('outside')[0]!.state).toBe('wet');
  });

  it('and the fire does not set an oil: an air-set coat is the air’s', () => {
    const oil = mat([airSet('oxidation', 12)]);
    const g = good();
    g.layCoat('outside', oil, 0.00005);
    expect(g.heatCoats(() => 1e9, 900)).toBe(0);
    expect(g.getCoats('outside')[0]!.state).toBe('wet');
  });
});
