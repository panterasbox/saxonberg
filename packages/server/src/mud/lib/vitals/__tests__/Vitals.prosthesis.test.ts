/**
 * ⭐⭐ The prosthetic (recovery D16) — a worn stand-in for a lost part,
 * whose function is DERIVED (never stored). Wear a peg leg on a severed
 * leg and the part reads its `restores`; take it off and the read drops
 * with no residue. `fitsSlot` refuses a whole body.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import Thing from '../../stuff/Thing';
import { SlottableMixin } from '../../slot/Slottable';
import { WearableMixin } from '../../slot/Wearable';
import { ProstheticMixin } from '../../slot/Prosthetic';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '../../stuff/Stuff';
import type { Slotted } from '../../slot/Slotted';
import type { Slottable } from '../../slot/Slottable';

const PLAN = '/stuff/idea/species/BodyPlan/peg-test';

/** A peg leg: a Wearable that is Prosthetic. */
class Peg extends ProstheticMixin(WearableMixin(SlottableMixin(Thing))) {
  static override _mixinName: string = 'Peg';
}

/** A biped-ish body: two legs (serve locomotion, severable) + a legs slot. */
function biped(): Creature {
  const plan = makeStuff(() => new BodyPlan());
  plan.setName('peg-test');
  plan.setSlots([
    {
      name: 'legs',
      accepts: 'WearableMixin',
      capacity: 4,
      covers: ['body.leg.left', 'body.leg.right'],
    },
  ]);
  plan.setBodyParts([
    { key: 'body.torso', parent: null, tissues: [] },
    {
      key: 'body.leg.left',
      parent: 'body.torso',
      severable: true,
      serves: ['locomotion'],
      tissues: [],
    },
    {
      key: 'body.leg.right',
      parent: 'body.torso',
      severable: true,
      serves: ['locomotion'],
      tissues: [],
    },
  ]);
  stampTemplatePathForTest(plan, PLAN);
  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, '/stuff/idea/species/test/peg');
  const c = makeStuff(() => new Creature());
  c.setSpecies(species);
  return c;
}

function pegLeg(): Peg {
  const p = makeStuff(() => new Peg());
  p.setForParts(['body.leg.left', 'body.leg.right']);
  p.setRestores(0.6);
  p.setSlotClaims({ [PLAN]: ['legs'] });
  return p;
}

const fn = (c: Creature, key: string): number =>
  (c as unknown as { getFunction?: (k: string) => number }).getFunction?.(key) ??
  // functionAt gives a band; use the scalar via capacity where possible.
  0;

beforeEach(() => installV1QuantityMarshallers());
afterEach(() => StuffApi.clearAll());

describe('a peg leg stands in for a lost leg', () => {
  it('⭐⭐ fitsSlot REFUSES a whole body — no loss for it to fill', () => {
    const c = biped();
    const peg = pegLeg();
    expect(peg.fitsSlot(c as unknown as Stuff & Slotted, 'legs')).toBe(false);
  });

  it('⭐ fitsSlot accepts a body missing the part', () => {
    const c = biped();
    c.severPart('body.leg.left');
    const peg = pegLeg();
    expect(peg.fitsSlot(c as unknown as Stuff & Slotted, 'legs')).toBe(true);
  });

  it('⭐⭐ worn on a severed leg it DERIVES function; removed, it drops with no residue', () => {
    const c = biped();
    // Whole: the leg reads full.
    expect(c.functionAt('body.leg.left')).toBe('full');
    // Sever it: gone (function 0 → the 'lost' band).
    c.severPart('body.leg.left');
    expect(c.functionAt('body.leg.left')).toBe('lost');
    // Wear the peg: the part now reads its restores (0.6 → impaired band).
    const peg = pegLeg();
    (c as unknown as Stuff & Slotted).occupyAll(
      peg as unknown as Stuff & Slottable,
      ['legs'],
    );
    expect(c.functionAt('body.leg.left')).toBe('impaired');
    // Take it off: back to gone, no stored residue.
    (c as unknown as Slotted).vacate('legs', peg as unknown as Stuff & Slottable);
    expect(c.functionAt('body.leg.left')).toBe('lost');
    void fn;
  });
});
