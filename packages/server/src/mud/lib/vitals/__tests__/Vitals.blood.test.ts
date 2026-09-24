/**
 * The blood face of VitalsMixin (blood build D2/D3/D11): typing, draw
 * (volume + marrow), receive (compatible/saline/incompatible + the graded
 * reaction), the seeded roll, the default-O species, and the corpse fork.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import { Quantity } from '../../quantity';
import { METABOLIC_DEFAULTS } from '../../metabolism/Metabolic';
import { BLOOD_DEFAULTS } from '../Blood';
import { TemplatePaths } from '../../paths';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

let seq = 0;

/** A fresh species singleton with an optional ABO allele table. */
function makeSpecies(alleles?: Record<string, number> | null): Species {
  const id = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName('blood-plan');
  plan.setBodyParts([{ key: 'body.torso', parent: null, tissues: [] }]);
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/blood-${id}`);
  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  if (alleles) species.setBloodGroups({ alleles });
  stampTemplatePathForTest(species, `/stuff/idea/species/test/blood-${id}`);
  return species;
}

/** A creature of a species with an optional pinned genotype and identity.
 * Pass an existing `species` to share one across creatures (the twin
 * case); otherwise a fresh unique species is minted. */
function body(opts: {
  alleles?: Record<string, number> | null;
  genotype?: string | null;
  species?: Species;
  identity?: string;
} = {}): Creature {
  const id = seq++;
  const species = opts.species ?? makeSpecies(opts.alleles ?? null);
  const c = makeStuff(() => new Creature());
  c.setSpecies(species);
  if (opts.genotype) c.bloodGenotype = opts.genotype;
  stampTemplatePathForTest(
    c,
    opts.identity ?? `/platform/agent/Avatar/blood-${id}`,
  );
  return c;
}

/** The species path a body's donor unit would carry. */
const speciesPathOf = (c: Creature): string =>
  c.getSpecies()!.getTemplatePath()!;

const bv = (c: Creature): number =>
  c.getVitalSign('bloodVolume').rawValue();

beforeEach(() => {
  installV1QuantityMarshallers();
});

describe('VitalsMixin — blood typing', () => {
  it('dominance: genotype → ABO phenotype', () => {
    expect(body({ genotype: 'AA' }).bloodType()).toBe('A');
    expect(body({ genotype: 'AO' }).bloodType()).toBe('A');
    expect(body({ genotype: 'BB' }).bloodType()).toBe('B');
    expect(body({ genotype: 'BO' }).bloodType()).toBe('B');
    expect(body({ genotype: 'AB' }).bloodType()).toBe('AB');
    expect(body({ genotype: 'OO' }).bloodType()).toBe('O');
  });

  it('an unauthored species is one-allele O', () => {
    expect(body({ alleles: null }).bloodType()).toBe('O');
  });

  it('the roll is seeded on identity — same species + path, same type', () => {
    const species = makeSpecies({ A: 0.5, B: 0.3, O: 0.2 });
    const a = body({ species, identity: '/platform/agent/Avatar/twin' });
    const b = body({ species, identity: '/platform/agent/Avatar/twin' });
    expect(a.bloodType()).toBe(b.bloodType());
  });

  it('markBloodTyped flips the label', () => {
    const c = body({ genotype: 'OO' });
    expect(c.isBloodTyped()).toBe(false);
    c.markBloodTyped();
    expect(c.isBloodTyped()).toBe(true);
  });
});

describe('VitalsMixin — draw', () => {
  it('spends volume and marrow, and stamps the unit', () => {
    const c = body({ genotype: 'AO' });
    c.markBloodTyped();
    const marrowBefore = c.getMarrow().current.rawValue();
    const before = bv(c);
    const unit = c.drawBlood(BLOOD_DEFAULTS.UNIT_LITRES);
    expect(bv(c)).toBeCloseTo(before - BLOOD_DEFAULTS.UNIT_LITRES, 5);
    expect(c.getMarrow().current.rawValue()).toBeCloseTo(
      marrowBefore -
        BLOOD_DEFAULTS.MARROW_COST_PCT_PER_L * BLOOD_DEFAULTS.UNIT_LITRES,
      3,
    );
    expect(unit.type).toBe('A');
    expect(unit.labelled).toBe(true);
    expect(unit.donorIdentityPath).toBe(c.getIdentityPath());
  });

  it('an untested donor stamps an unlabelled (but true-typed) unit', () => {
    const c = body({ genotype: 'BO' });
    const unit = c.drawBlood(BLOOD_DEFAULTS.UNIT_LITRES);
    expect(unit.type).toBe('B'); // the TRUE type is always stored
    expect(unit.labelled).toBe(false); // nobody tested it
  });
});

describe('VitalsMixin — receive', () => {
  it('a compatible unit closes the gap to baseline', () => {
    const c = body({ genotype: 'OO' });
    const baseline = c.getVitalBand('bloodVolume').baseline;
    c.setVitalSign('bloodVolume', Quantity.of(baseline * 0.6, 'L'));
    const r = c.receiveBlood({
      litres: baseline, // more than enough to close the gap
      blood: { speciesPath: speciesPathOf(c), type: 'O' },
    });
    expect(r.reaction).toBe(0);
    expect(bv(c)).toBeCloseTo(baseline, 5); // all the way, not the 0.85 cap
  });

  it('saline caps at the plasma ceiling, never the last 15%', () => {
    const c = body({ genotype: 'OO' });
    const baseline = c.getVitalBand('bloodVolume').baseline;
    c.setVitalSign('bloodVolume', Quantity.of(baseline * 0.5, 'L'));
    const r = c.receiveBlood({ litres: 10, blood: null, expander: true });
    expect(r.reaction).toBe(0);
    expect(bv(c)).toBeCloseTo(
      baseline * METABOLIC_DEFAULTS.PLASMA_RESTORE_CEILING_FRAC,
      5,
    );
  });

  it('an incompatible ABO unit reacts, and only plasma lands', () => {
    const c = body({ genotype: 'OO' }); // recipient O
    const baseline = c.getVitalBand('bloodVolume').baseline;
    c.setVitalSign('bloodVolume', Quantity.of(baseline * 0.6, 'L'));
    const before = bv(c);
    const r = c.receiveBlood({
      litres: BLOOD_DEFAULTS.UNIT_LITRES,
      blood: { speciesPath: speciesPathOf(c), type: 'A' }, // A into O: mismatch 1
    });
    expect(r.reaction).toBe(1);
    // Only the plasma fraction of the unit landed.
    expect(bv(c) - before).toBeCloseTo(
      BLOOD_DEFAULTS.UNIT_LITRES * BLOOD_DEFAULTS.PLASMA_FRACTION,
      5,
    );
    const rec = c
      .getConditions()
      .find(
        (x) =>
          x.kind === 'affliction' &&
          x.templatePath === TemplatePaths.circulationTransfusionReaction,
      );
    expect(rec).toBeTruthy();
    // stage = ceil(litres * 6 * 1)
    expect((rec as { stage: number }).stage).toBe(
      Math.ceil(BLOOD_DEFAULTS.UNIT_LITRES * BLOOD_DEFAULTS.REACTION_STAGE_PER_L),
    );
  });

  it('a cross-species unit doubles the reaction', () => {
    const c = body({ genotype: 'OO' });
    const baseline = c.getVitalBand('bloodVolume').baseline;
    c.setVitalSign('bloodVolume', Quantity.of(baseline * 0.6, 'L'));
    const r = c.receiveBlood({
      litres: BLOOD_DEFAULTS.UNIT_LITRES,
      blood: { speciesPath: '/stuff/idea/species/test/wolf', type: 'O' },
    });
    expect(r.reaction).toBe(2);
    const rec = c
      .getConditions()
      .find(
        (x) =>
          x.kind === 'affliction' &&
          x.templatePath === TemplatePaths.circulationTransfusionReaction,
      ) as { stage: number };
    expect(rec.stage).toBe(
      Math.ceil(
        BLOOD_DEFAULTS.UNIT_LITRES *
          BLOOD_DEFAULTS.REACTION_STAGE_PER_L *
          BLOOD_DEFAULTS.SPECIES_MISMATCH_SCALE,
      ),
    );
  });

  it('a second incompatible unit adds to the existing reaction stage', () => {
    const c = body({ genotype: 'OO' });
    const baseline = c.getVitalBand('bloodVolume').baseline;
    c.setVitalSign('bloodVolume', Quantity.of(baseline * 0.6, 'L'));
    const spec = {
      litres: BLOOD_DEFAULTS.UNIT_LITRES,
      blood: { speciesPath: speciesPathOf(c), type: 'A' },
    };
    c.receiveBlood(spec);
    c.receiveBlood(spec);
    const rec = c
      .getConditions()
      .find(
        (x) =>
          x.kind === 'affliction' &&
          x.templatePath === TemplatePaths.circulationTransfusionReaction,
      ) as { stage: number };
    expect(rec.stage).toBe(
      2 *
        Math.ceil(
          BLOOD_DEFAULTS.UNIT_LITRES * BLOOD_DEFAULTS.REACTION_STAGE_PER_L,
        ),
    );
  });
});

describe('VitalsMixin — the corpse fork carries the type', () => {
  it('forkSlice_Vitals carries the resolved genotype and the label', () => {
    // ⭐ The producer half: what the material fork copies to a corpse. The
    // apply side (`adoptMaterialState`) is gated to the death choreography
    // (`ByConditionLogic`) and is exercised there, not from a unit test.
    const donor = body({ genotype: 'AB' });
    donor.markBloodTyped();
    const slice = donor.forkSlice_Vitals() as {
      bloodGenotype: string;
      bloodTyped: boolean;
    };
    expect(slice.bloodGenotype).toBe('AB');
    expect(slice.bloodTyped).toBe(true);

    // An UNROLLED donor still forks a CONCRETE genotype (drawn from its
    // species' A/B alleles), so a corpse can never disagree with the
    // living body over a re-roll.
    const unrolled = body({ alleles: { A: 0.5, B: 0.5 } });
    const s2 = unrolled.forkSlice_Vitals() as { bloodGenotype: string };
    expect(['AA', 'AB', 'BA', 'BB']).toContain(s2.bloodGenotype);
  });
});
