import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MaterialApi } from '../material';
import { MaterialLogic } from '../../obj/api/MaterialLogic';
import { SecurityError } from '../../lib/security/errors';
import { StuffApi } from '../stuff';
import Material from '../../lib/material/Material';
import { Construction } from '../../lib/material/Construction';
import { Grade } from '../../lib/craft/Grade';
import { Quantity } from '../../lib/quantity';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

/** A Material with just the mechanical props the response function reads. */
function mkMat(hardness: number, toughness: number): Material {
  const m = makeStuff(() => new Material());
  m.setHardness(Quantity.of(hardness, 'MPa'));
  m.setToughness(Quantity.of(toughness, 'MJ/m³'));
  return m;
}

// Seeded demo magnitudes (see the base-library material content).
const steel = () => mkMat(600, 200);
const bronze = () => mkMat(250, 90);
const flesh = () => mkMat(1, 1);
const fair = Grade.of('fair');

describe('materials-response — the response function', () => {
  beforeEach(() => StuffApi.clearAll());
  afterEach(() => StuffApi.clearAll());

  it('edge vs a steel plate layer is deflected (no wound reaches tissue)', () => {
    const plate = Construction.of('plate');
    const { residualEnergy } = MaterialApi.attenuate(
      'edge',
      2,
      steel(),
      plate,
      fair,
      1,
    );
    // Near-total attenuation → residual under the no-wound threshold.
    const trauma = MaterialApi.resolveTrauma('edge', residualEnergy, null, false);
    expect(trauma).toBeNull();
  });

  it('edge vs bare flesh lacerates', () => {
    const trauma = MaterialApi.resolveTrauma('edge', 2, flesh(), false);
    expect(trauma).not.toBeNull();
    expect(trauma!.type).toBe('laceration');
    expect(trauma!.severity).toBeGreaterThan(0);
  });

  it('blunt transmits through plate and fractures a boned part', () => {
    const plate = Construction.of('plate');
    const { residualEnergy } = MaterialApi.attenuate(
      'blunt',
      2,
      steel(),
      plate,
      fair,
      1,
    );
    // Plate barely attenuates blunt (transmit) → high residual.
    expect(residualEnergy).toBeGreaterThan(1.5);
    const boned = MaterialApi.resolveTrauma('blunt', residualEnergy, null, true);
    expect(boned!.type).toBe('fracture');
    // Same residual on a boneless part contuses instead.
    const soft = MaterialApi.resolveTrauma('blunt', residualEnergy, null, false);
    expect(soft!.type).toBe('contusion');
  });

  it('point defeats mail (fail) and punctures', () => {
    const mail = Construction.of('mail');
    const { residualEnergy } = MaterialApi.attenuate(
      'point',
      2,
      steel(),
      mail,
      fair,
      1,
    );
    expect(residualEnergy).toBeCloseTo(2, 5); // fail → no attenuation
    const trauma = MaterialApi.resolveTrauma('point', residualEnergy, null, false);
    expect(trauma!.type).toBe('puncture');
  });

  it('edge vs mail is resisted (attenuated, not defeated)', () => {
    const mail = Construction.of('mail');
    const { residualEnergy } = MaterialApi.attenuate(
      'edge',
      2,
      steel(),
      mail,
      fair,
      1,
    );
    expect(residualEnergy).toBeGreaterThan(0);
    expect(residualEnergy).toBeLessThan(2); // resisted vs the bare 2
  });

  it('material scales height — steel plate attenuates edge more than bronze', () => {
    const plate = Construction.of('plate');
    const steelResidual = MaterialApi.attenuate(
      'edge',
      2,
      steel(),
      plate,
      fair,
      1,
    ).residualEnergy;
    const bronzeResidual = MaterialApi.attenuate(
      'edge',
      2,
      bronze(),
      plate,
      fair,
      1,
    ).residualEnergy;
    expect(steelResidual).toBeLessThan(bronzeResidual);
  });

  it('grade scales height — masterful attenuates more than poor (same inputs)', () => {
    const mail = Construction.of('mail');
    const masterful = MaterialApi.attenuate(
      'edge',
      2,
      steel(),
      mail,
      Grade.of('masterful'),
      1,
    ).residualEnergy;
    const poor = MaterialApi.attenuate(
      'edge',
      2,
      steel(),
      mail,
      Grade.of('poor'),
      1,
    ).residualEnergy;
    expect(masterful).toBeLessThan(poor);
  });

  it('condition scales height — a worn piece attenuates less', () => {
    const mail = Construction.of('mail');
    const pristine = MaterialApi.attenuate('edge', 2, steel(), mail, fair, 1)
      .residualEnergy;
    const worn = MaterialApi.attenuate('edge', 2, steel(), mail, fair, 0.3)
      .residualEnergy;
    expect(worn).toBeGreaterThan(pristine);
  });

  it('masterwork-at-50% lands in the same band as common-at-100%', () => {
    // The AC: quality×condition scale height so a masterwork half-worn is
    // ~a common piece pristine. Compare the preview band (single chokepoint).
    const mail = Construction.of('mail');
    const masterHalf = MaterialApi.previewBand(
      'edge',
      steel(),
      mail,
      Grade.of('masterful'),
      0.5,
    );
    const commonFull = MaterialApi.previewBand('edge', steel(), mail, fair, 1);
    expect(masterHalf).toBe(commonFull);
  });

  it('derives a weapon-delivery form channels', () => {
    expect(Construction.of('bladed').deliveredChannels()).toEqual([
      'edge',
      'point',
    ]);
    expect(Construction.of('hafted').deliveredChannels()).toEqual(['blunt']);
    expect(Construction.of('hafted').primaryChannel()).toBe('blunt');
  });

  it('a worn dagger delivers a weaker blow than a pristine one', () => {
    const bladed = Construction.of('bladed');
    const pristine = MaterialApi.previewBand('edge', steel(), bladed, fair, 1);
    const worn = MaterialApi.previewBand('edge', steel(), bladed, fair, 0.3);
    // Coarse bands, ascending harm: pristine should be at least as harsh.
    const order = ['turned', 'grazes', 'bites', 'bites-deep'];
    expect(order.indexOf(pristine)).toBeGreaterThanOrEqual(order.indexOf(worn));
    expect(pristine).not.toBe('turned');
  });

  it('previewBand returns turned for a channel a weapon cannot deliver', () => {
    // A hafted mace delivers no edge.
    expect(
      MaterialApi.previewBand('edge', steel(), Construction.of('hafted')),
    ).toBe('turned');
  });

  it('gates the logic methods against a non-MaterialApi caller', () => {
    // Any Api call lazily materializes the logic singleton.
    MaterialApi.previewBand('edge', steel(), Construction.of('plate'), fair, 1);
    const logic = StuffApi.findByTemplatePath<MaterialLogic>(
      '/obj/api/material',
    );
    expect(logic).toBeDefined();
    expect(() =>
      logic!.attenuate('edge', 2, steel(), Construction.of('plate'), fair, 1),
    ).toThrow(SecurityError);
  });
});

/** A Material carrying just the thermal conductivity the heat fold reads. */
function mkThermalMat(conductivityWmK: number): Material {
  const m = makeStuff(() => new Material());
  m.setThermalConductivity(Quantity.of(conductivityWmK, 'W/(m·K)'));
  return m;
}

describe('materials-response — the heat channel (insulation fold)', () => {
  beforeEach(() => StuffApi.clearAll());
  afterEach(() => StuffApi.clearAll());

  // Real conductivities: leather ≈ 0.14 (insulator), iron ≈ 80 (conductor).
  const leather = () => mkThermalMat(0.14);
  const iron = () => mkThermalMat(80);

  it('an insulating layer (leather/hide) turns a modest burn', () => {
    // Heat folds through the covering stack by INSULATION, not hardness.
    const { residualEnergy } = MaterialApi.attenuate(
      'heat',
      1,
      leather(),
      Construction.of('hide'),
      fair,
      1,
    );
    // Most of the heat is blocked → residual below the no-wound floor.
    expect(residualEnergy).toBeLessThan(0.25);
    const trauma = MaterialApi.resolveTrauma('heat', residualEnergy, null, false);
    expect(trauma).toBeNull();
  });

  it('a conductive layer (iron/plate) passes the heat → a burn lands', () => {
    const { residualEnergy } = MaterialApi.attenuate(
      'heat',
      1,
      iron(),
      Construction.of('plate'),
      fair,
      1,
    );
    // A conductor barely insulates → nearly all the heat reaches tissue.
    expect(residualEnergy).toBeGreaterThan(0.9);
    const trauma = MaterialApi.resolveTrauma('heat', residualEnergy, null, false);
    expect(trauma).not.toBeNull();
    expect(trauma!.type).toBe('burn');
    expect(trauma!.severity).toBeGreaterThan(0);
  });

  it('a weapon (non-armor) construction attenuates no heat', () => {
    const { residualEnergy } = MaterialApi.attenuate(
      'heat',
      1,
      leather(),
      Construction.of('bladed'),
    );
    expect(residualEnergy).toBe(1);
  });

  it('resolveTrauma maps surviving heat straight to a burn', () => {
    const trauma = MaterialApi.resolveTrauma('heat', 0.8, null, false);
    expect(trauma).not.toBeNull();
    expect(trauma!.type).toBe('burn');
  });

  it('previewBand for heat over plate armor bands the residual burn', () => {
    // The SAME chokepoint the analyze preview reads — heat over a conductor
    // reads as a real burn band, not `turned`.
    const band = MaterialApi.previewBand('heat', iron(), Construction.of('plate'));
    expect(band).not.toBe('turned');
  });
});
