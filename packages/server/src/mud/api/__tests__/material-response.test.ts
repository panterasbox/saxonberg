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
    expect(
      MaterialApi.deliverableChannels(Construction.of('bladed')),
    ).toEqual(['edge', 'point']);
    expect(
      MaterialApi.deliverableChannels(Construction.of('hafted')),
    ).toEqual(['blunt']);
    expect(MaterialApi.primaryChannel(Construction.of('hafted'))).toBe('blunt');
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
    MaterialApi.deliverableChannels(Construction.of('bladed'));
    const logic = StuffApi.findByTemplatePath<MaterialLogic>(
      '/obj/api/material',
    );
    expect(logic).toBeDefined();
    expect(() =>
      logic!.attenuate('edge', 2, steel(), Construction.of('plate'), fair, 1),
    ).toThrow(SecurityError);
  });
});
