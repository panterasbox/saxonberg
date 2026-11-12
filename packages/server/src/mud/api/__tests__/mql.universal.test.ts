/**
 * ⭐⭐⭐ **MQL names things the same for everyone; the acts perceive**
 * (size-and-carrying D23 — the owner, 2026-11-11: *MQL stays simple — the
 * things and the interfaces make the determinations*).
 *
 * The resolver's answer to `<bearer>:I:letter` is the SAME list for the
 * bearer, a stranger and system mode. After `PerceptionApi.perceived`, the
 * stranger's answer is identical to the answer about a person who carries
 * no letter at all — nothing leaks the letter's existence. `query`, a
 * script island and the binder all go through that one filter.
 */
import '../../../test-bootstrap';
import Garment from '../../platform/thing/equipment/Garment';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MqlApi } from '../mql';
import { PerceptionApi } from '../perception';
import { ContainmentApi } from '../containment';
import { StuffApi } from '../stuff';
import { Creature } from '../../lib/creature/Creature';
import Species from '../../platform/idea/species/Species';
import BodyPlan from '../../platform/idea/species/BodyPlan';
import Location from '../../lib/location/Location';
import Thing from '../../platform/thing/Good';
import { Expression } from '../../lib/script/Expression';
import { Scope } from '../../lib/script/Scope';
import type { Stuff } from '../../lib/stuff/Stuff';
import { makeStuff, stampTemplatePathForTest } from '../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

const ids = (xs: readonly Stuff[]): string[] => xs.map((x) => x.stuffId).sort();

describe('MQL is universal; perception is the surface’s (D23)', () => {
  let room: Location;
  let bearer: Creature;
  let stranger: Creature;
  let empty: Creature;
  let letter: Thing;

  beforeEach(async () => {
    installV1QuantityMarshallers();
    const plan = makeStuff(() => new BodyPlan());
    plan.setName('universal-biped');
    plan.setBaseMass(70);
    plan.setBaseStature(1.75);
    plan.setSlots([
      { name: 'torso', accepts: 'WearableMixin', capacity: 4, covers: ['body.torso'] },
    // Two hands (size and carrying W7: a carried thing is held, not loose).
    { name: 'hand:left', accepts: 'WieldableMixin', bodyPart: 'body.hand.left' },
    { name: 'hand:right', accepts: 'WieldableMixin', bodyPart: 'body.hand.right' },
    ]);
    plan.setBodyParts([
      { key: 'body.torso', parent: null, tissues: [] },
    { key: 'body.hand.left', parent: 'body.torso', tissues: [], serves: ['manipulation'] },
    { key: 'body.hand.right', parent: 'body.torso', tissues: [], serves: ['manipulation'] },
    ]);
    stampTemplatePathForTest(plan, '/stuff/idea/species/BodyPlan/universal-biped');
    const species = makeStuff(() => new Species());
    species.setBodyPlan(plan);
    stampTemplatePathForTest(species, '/stuff/idea/species/test/universal-human');
    const body = (): Creature => {
      const c = makeStuff(() => new Creature());
      c.setSpecies(species);
      ContainmentApi.move(c, room);
      return c;
    };
    room = makeStuff(() => new Location());
    bearer = body();
    stranger = body();
    empty = body();
    letter = makeStuff(() => new Thing());
    letter.setShortDescription('a letter');
    letter.setKeywords(['letter']);
    // In the bearer's keeping, in no hand and on no outer layer — a coat's
    // inner pocket (covered: size and carrying D26).
    const coat = makeStuff(() => new Garment());
    coat.setShortDescription('a coat');
    await coat.setPlacements([{ member: '/platform/placements/pocket', name: 'inner pocket', covered: true }]);
    coat.setSlotClaims({ '/stuff/idea/species/BodyPlan/universal-biped': ['torso'] });
    bearer.seatInSlot(coat, 'torso');
    ContainmentApi.move(letter, coat, 'inner pocket');
  });
  afterEach(() => StuffApi.clearAll());

  const ask = (asker: Stuff | null, who: Stuff): Stuff[] =>
    MqlApi.resolveMany(`#${who.stuffId}:I:letter`, { commandGiver: asker as never, scope: '' }).stuff;

  it('⭐ the resolver answers the bearer, a stranger and system mode with the same list', () => {
    expect(ids(ask(bearer, bearer))).toEqual([letter.stuffId]);
    expect(ids(ask(stranger, bearer))).toEqual([letter.stuffId]);
    expect(ids(ask(null, bearer))).toEqual([letter.stuffId]);
  });

  it('⭐ after `perceived`, the stranger cannot tell the bearer from a person with no letter', () => {
    const aboutBearer = PerceptionApi.perceived(stranger, ask(stranger, bearer));
    const aboutEmpty = PerceptionApi.perceived(stranger, ask(stranger, empty));
    expect(aboutBearer).toEqual(aboutEmpty);
    expect(aboutBearer).toEqual([]);
    // The bearer perceives their own.
    expect(PerceptionApi.perceived(bearer, ask(bearer, bearer))).toEqual([letter]);
  });

  it('a script island binds what its actor perceives — the same as the prompt would', () => {
    const q = `#${bearer.stuffId}:I:letter`;
    expect(Expression.evaluate(q, new Scope(), stranger as never)).toEqual([]);
    expect(Expression.evaluate(q, new Scope(), bearer as never)).toEqual([letter]);
  });

});
