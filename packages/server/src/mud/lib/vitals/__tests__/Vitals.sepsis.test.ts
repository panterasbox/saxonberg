/**
 * ⭐⭐ Wound sepsis (recovery D11) — a wound treated with DIRTY hands goes
 * bad; a wound treated CLEAN does not. The infection is the shipped
 * in-host arm with a new source, seeded by `Vitals.applyTreatment`.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import type { Trauma } from '../../../platform/idea/Condition';

const atGameSeconds = (g: number): void => {
  const scale = WorldClockApi.getScale();
  WorldClockApi._setNowProviderForTesting(() => (g * 1000) / scale);
};

/** Whether the body is carrying a wound-sepsis infection. */
const isSeptic = (c: Creature): boolean =>
  c
    .getConditions()
    .some(
      (x) => x.kind === 'affliction' && x.templatePath.endsWith('/wound-sepsis'),
    );

function cut(): Trauma {
  return {
    kind: 'trauma',
    type: 'laceration',
    site: 'body.arm.left',
    severity: 2,
    bleeding: true,
  };
}

/** A treater with clean hands (scrubbed just now). */
function cleanTreater(): Creature {
  const t = makeStuff(() => new Creature());
  t.scrub();
  return t;
}

/** A treater with dirty hands (never washed → cleanliness 0). */
function dirtyTreater(): Creature {
  return makeStuff(() => new Creature());
}

beforeEach(() => {
  installV1QuantityMarshallers();
  atGameSeconds(10_000);
});
afterEach(() => {
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

describe('a wound goes bad on a clock — if the hands were dirty', () => {
  it('⭐⭐ DIRTY hands dressing a bleed seed sepsis', () => {
    const patient = makeStuff(() => new Creature());
    const wound = cut();
    patient.afflict(wound);
    const result = patient.applyTreatment(wound, {
      by: 'dressing',
      efficacy: 1,
      treater: dirtyTreater(),
    });
    expect(result.seededInfection).toBe(true);
    expect(isSeptic(patient)).toBe(true);
  });

  it('⭐⭐ CLEAN hands and a good dressing do NOT', () => {
    const patient = makeStuff(() => new Creature());
    const wound = cut();
    patient.afflict(wound);
    const result = patient.applyTreatment(wound, {
      by: 'dressing',
      efficacy: 1,
      treater: cleanTreater(),
    });
    expect(result.seededInfection).toBe(false);
    expect(isSeptic(patient)).toBe(false);
  });

  it('⚠ a burn is not a bleed — dirty hands do not infect it', () => {
    const patient = makeStuff(() => new Creature());
    const burn: Trauma = {
      kind: 'trauma',
      type: 'burn',
      site: 'body.arm.left',
      severity: 2,
    };
    patient.afflict(burn);
    const result = patient.applyTreatment(burn, {
      by: 'cooling',
      efficacy: 1,
      treater: dirtyTreater(),
    });
    expect(result.seededInfection).toBe(false);
    expect(isSeptic(patient)).toBe(false);
  });

  it('⭐ a second dirty treatment makes the same infection worse, not a new one', () => {
    const patient = makeStuff(() => new Creature());
    const wound = cut();
    patient.afflict(wound);
    patient.applyTreatment(wound, { by: 'dressing', efficacy: 1, treater: dirtyTreater() });
    const first = patient
      .getConditions()
      .find((x) => x.kind === 'affliction' && x.templatePath.endsWith('/wound-sepsis'));
    const loadBefore =
      first && first.kind === 'affliction' ? (first.pathogenLoad ?? 0) : 0;

    // A second cut, dressed dirty again.
    const wound2 = cut();
    wound2.site = 'body.arm.right';
    patient.afflict(wound2);
    patient.applyTreatment(wound2, { by: 'dressing', efficacy: 1, treater: dirtyTreater() });

    const septicRecords = patient
      .getConditions()
      .filter((x) => x.kind === 'affliction' && x.templatePath.endsWith('/wound-sepsis'));
    expect(septicRecords.length).toBe(1); // one infection, not two
    const after =
      septicRecords[0] && septicRecords[0].kind === 'affliction'
        ? (septicRecords[0].pathogenLoad ?? 0)
        : 0;
    expect(after).toBeGreaterThan(loadBefore);
  });

  it('⭐ treating soils the treater — a careful medic must scrub between patients', () => {
    const patient = makeStuff(() => new Creature());
    const wound = cut();
    patient.afflict(wound);
    const treater = cleanTreater();
    expect(treater.handsCleanliness()).toBeCloseTo(1, 5);
    patient.applyTreatment(wound, { by: 'dressing', efficacy: 1, treater });
    expect(treater.getWashedAt()).toBeNull(); // soiled by handling the wound
  });
});
