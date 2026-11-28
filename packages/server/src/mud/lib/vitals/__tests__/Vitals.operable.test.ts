/**
 * ⭐⭐ `VitalsMixin.operable` — the one place `operate` is decided
 * (organism-biology D8, W7), and castration as an operation.
 *
 * The body says which operation it will take and refuses in reasons the
 * rows word: the named one, else the most urgent its wounds call for. An
 * operation that takes a healthy PART (`addresses.part`) is matched ⛔ only
 * when named — a bare `operate` on a bleeding bull stops the bleed and
 * never castrates. A cow named for castration is refused by the body
 * (`no-such-part`); nothing checks a class. A male whose gonads came off
 * before he was mature is `neutered` — derived, read by the variant.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import { BodyModule } from '../../species/BodyModule';
import { SpeciesApi } from '../../../api/species';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import { Postures } from '../../slot/Postured';
import type { OperationDescriptor } from '../Operation';
import type { OperatingHand } from '../Vitals';
import type { Trauma } from '../../../platform/idea/Condition';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { setFlatParts } from '../../species/__tests__/flat-body';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const FLESH = '/stuff/idea/material/tissue/flesh';

const CASTRATION: OperationDescriptor = {
  key: 'castration',
  label: 'castration',
  addresses: { part: 'gonads' },
  instrument: 'cutting',
  competence: { discipline: 'medicine', band: 'novice' },
  bloodCostL: 0.05,
  baseDurationS: 60,
  anaesthesia: 'none',
  posture: 'any',
  resolution: 'severance',
  difficulty: 'standard',
};
const BLEED_CONTROL: OperationDescriptor = {
  key: 'bleed-control',
  label: 'bleed control',
  addresses: { bleeding: true },
  instrument: 'cutting',
  competence: { discipline: 'medicine', band: 'novice' },
  bloodCostL: 0.1,
  baseDurationS: 120,
  anaesthesia: 'none',
  posture: 'any',
  resolution: 'surgery',
  difficulty: 'standard',
};
const OPS = [CASTRATION, BLEED_CONTROL];
const HAND: OperatingHand = { band: 'competent', capabilities: ['cutting'], self: false };

let seq = 0;
function cattle(): Species {
  const id = seq++;
  const plan = makeStuffAtPath(() => new BodyPlan(), `/stuff/idea/species/BodyPlan/_test-op-${id}`);
  setFlatParts(plan, [
    { key: 'body.torso', parent: null, tissues: [{ tissuePath: FLESH, share: 0.8 }] },
    { key: 'body.leg.left', parent: 'body.torso', severable: true, tissues: [{ tissuePath: FLESH, share: 0.2 }] },
  ]);
  const gonads = `/test/body-modules/gonads-${id}`;
  SpeciesApi.modules().remember(
    gonads,
    new BodyModule(gonads, { parts: [{ key: '', severable: true, tissues: [{ tissue: FLESH, weight: 0.002 }] }] }),
  );
  return makeStuffAtPath(() => {
    const s = new Species();
    s.setBodyPlan(plan);
    s.setSexDeterminationSystem('xy');
    s.setAgeCurve({ weanedAt: 60, matureAt: 400, agedAt: 4000, senescentAt: 6000 });
    s.setCommonNames(['cattle']);
    s.setAdultMass(550);
    s.applyVariants({
      sex: {
        female: { commonNames: ['cow'] },
        male: { commonNames: ['bull'], body: { add: [{ module: gonads, as: ['body.torso.gonads'], at: 'body.torso' }] } },
      },
      neutered: { commonNames: ['steer'], massFactor: 1.15, stage: { adult: { commonNames: ['ox'] } } },
    });
    return s;
  }, `/stuff/idea/species/_test/op-cattle-${id}`);
}

function beast(species: Species, sex: 'male' | 'female', ageDays: number): Creature {
  const c = makeStuff(() => new Creature());
  c.setSpecies(species);
  c.setSex(sex);
  c.setAge(ageDays);
  return c;
}

describe('operable — the body decides the operation', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => 10_000_000_000);
  });
  // ⚠ No `StuffApi.clearAll()` here: it takes the clock registry with it,
  // and a body with no clock has no age (a newborn whose loss reads at 0).
  afterEach(() => WorldClockApi._resetForTesting());

  it('⭐⭐ castration named on a bull calf takes the gonads', () => {
    const calf = beast(cattle(), 'male', 60);
    const answer = calf.operable('castration', OPS, HAND);
    expect(answer).toMatchObject({ ok: true, partKey: 'body.torso.gonads' });
    expect(answer.ok && answer.op.key).toBe('castration');
  });

  it('⭐ on a cow it is refused by the BODY — no-such-part, no class check', () => {
    const cow = beast(cattle(), 'female', 900);
    expect(cow.operable('castration', OPS, HAND)).toMatchObject({ ok: false, reason: 'no-such-part' });
  });

  it('⛔ a bare operate on an entire, BLEEDING bull addresses the bleed and never castrates', () => {
    const bull = beast(cattle(), 'male', 900);
    bull.afflict({ kind: 'trauma', type: 'laceration', site: 'body.leg.left', severity: 2, bleeding: true } as Trauma);
    const answer = bull.operable(null, OPS, HAND);
    expect(answer.ok && answer.op.key).toBe('bleed-control');
  });

  it('a bare operate on a healthy bull finds nothing — castration is never a default', () => {
    const bull = beast(cattle(), 'male', 900);
    expect(bull.operable(null, OPS, HAND)).toMatchObject({ ok: false, reason: 'nothing-to-operate' });
  });

  it('the gates, in order: posture, the band, the kit, the anaesthesia', () => {
    const bull = beast(cattle(), 'male', 900);
    bull.setPosture(Postures.Stand);
    const lying = { ...CASTRATION, posture: 'lying' as const };
    expect(bull.operable('castration', [lying], HAND)).toMatchObject({ reason: 'not-lying' });
    const skilled = { ...CASTRATION, competence: { discipline: 'medicine', band: 'expert' as const } };
    expect(bull.operable('castration', [skilled], HAND)).toMatchObject({ reason: 'unskilled' });
    expect(bull.operable('castration', OPS, { ...HAND, capabilities: [] })).toMatchObject({ reason: 'wrong-kit' });
    const under = { ...CASTRATION, anaesthesia: 'required' as const };
    expect(bull.operable('castration', [under], HAND)).toMatchObject({ reason: 'needs-anaesthesia' });
    expect(bull.operable('trepanning', OPS, HAND)).toMatchObject({ reason: 'no-such-op', facts: { word: 'trepanning' } });
  });
});

describe('neutered — derived from the part, never authored', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => 10_000_000_000);
  });
  // ⚠ No `StuffApi.clearAll()` here: it takes the clock registry with it,
  // and a body with no clock has no age (a newborn whose loss reads at 0).
  afterEach(() => WorldClockApi._resetForTesting());

  it('⭐⭐ a calf cut young is a steer; grown, an ox — and heavier than a bull his age', () => {
    const species = cattle();
    const calf = beast(species, 'male', 60);
    expect(calf.getCommonNames()[0]).toBe('bull');
    calf.severPart('body.torso.gonads');
    expect(calf.getVariant()).toMatchObject({ sex: 'male', neutered: true });
    expect(calf.getCommonNames()[0]).toBe('steer');
    expect(calf.getCommonNames()).not.toContain('bull'); // an ox is not a bull

    const ox = beast(species, 'male', 900);
    ox.seedLostParts([{ part: 'body.torso.gonads', atAgeDays: 60 }]);
    expect(ox.getCommonNames()[0]).toBe('ox');
    expect(species.massAt(900, ox.getVariant())).toBeGreaterThan(species.massAt(900, { sex: 'male', stage: 'adult' }));
    expect(ox.operable('castration', OPS, HAND)).toMatchObject({ ok: false, reason: 'no-such-part' }); // already done
  });

  it('a bull cut after he was mature stays a bull in his form', () => {
    const bull = beast(cattle(), 'male', 900);
    bull.severPart('body.torso.gonads'); // lost at 900 days, past matureAt 400
    expect(bull.getVariant().neutered).toBeUndefined();
  });
});
