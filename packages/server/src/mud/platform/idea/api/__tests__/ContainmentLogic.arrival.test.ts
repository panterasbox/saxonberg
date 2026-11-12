/**
 * `Carrying.receive` at W0 — **it behaves exactly as the move it replaces.**
 *
 * size-and-carrying W0: `receive(item)` is `carry(body, item)`
 * and `receive(item, { slot })` is `seatInSlot(item, slot)`. Every port in
 * W4/W5 swaps one for the other and must change nothing until the flip, so
 * each case here runs the old call on one body and `receive` on a twin and
 * compares what the world looks like afterwards.
 */

import '../../../../test-bootstrap';
import { carry } from './carrying-fixture';
import { describe, it, expect, afterEach } from 'vitest';
import { SlottableMixin } from '../Slottable';
import { SlottedMixin } from '../Slotted';
import { ContainableMixin } from '../../spatial/Containable';
import { ContainerMixin } from '../../spatial/Container';
import Good from '../../stuff/Good';
import { Creature } from '../../creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { ContainmentApi } from '../../../api/containment';
import type { Stuff } from '../../stuff/Stuff';
import type { Containable } from '../../spatial/Containable';
import { makeStuff, stampTemplatePathForTest } from '../../security/__tests__/test-setup';

/** A thing a hand can hold. */
class TestCup extends SlottableMixin(ContainableMixin(Good)) {}

/** A plain box on the floor — somewhere a thing comes FROM. */
class TestBox extends ContainerMixin(ContainableMixin(Good)) {}

/** Slotted, not a body — it carries nothing. */
class Rack extends SlottedMixin(Good) {}

let uniq = 0;

function body(): Creature {
  const suffix = `-${uniq++}`;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName(`carrying-test-biped${suffix}`);
  plan.setSlots([
    { name: 'hand:right', accepts: 'SlottableMixin', bodyPart: 'body.hand.right' },
    { name: 'hand:left', accepts: 'SlottableMixin', bodyPart: 'body.hand.left' },
  ]);
  plan.setBodyParts([
    { key: 'body', parent: null, tissues: [] },
    { key: 'body.hand.right', parent: 'body', tissues: [], serves: ['manipulation'] },
    { key: 'body.hand.left', parent: 'body', tissues: [], serves: ['manipulation'] },
  ]);
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/carrying-test${suffix}`);
  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/carrying${suffix}`);
  const creature = makeStuff(() => new Creature());
  creature.setSpecies(species);
  return creature;
}

function cup(): TestCup {
  const c = makeStuff(() => new TestCup());
  c.setShortDescription('a tin cup');
  c.setPrimaryKeyword('cup');
  return c;
}

/** What the world says about one item after it moved. */
function snapshot(item: Stuff & Containable, holder: Creature, from: TestBox | null) {
  return {
    inHolder: item.getContainer() === holder,
    placement: item.getPlacement(),
    holderHasIt: holder.getContents().includes(item),
    fromStillHasIt: from ? from.getContents().includes(item) : null,
    rightHand: (holder.getOccupant('hand:right') as Stuff | null) === (item as Stuff),
  };
}

describe('Carrying — composed on every body', () => {
  afterEach(() => StuffApi.clearAll());

  it('a Creature is Carrying; a slotted rack is not', () => {
    expect(MixinApi.isCarrying(body())).toBe(true);
    expect(MixinApi.isCarrying(makeStuff(() => new Rack()))).toBe(false);
  });

  it('declares carry.order, hands-first by default', () => {
    const entry = MixinApi.collectSettingsSchema(Creature).find((e) => e.entry.key === 'carry.order');
    expect(entry?.sourceMixin).toBe('CarryingMixin');
    expect(entry?.entry.default).toBe('hands-first');
    expect(entry?.entry.enumValues).toEqual(['hands-first', 'pockets-first']);
  });
});

describe('receive — the receiving act after the flip (W0 → W7)', () => {
  afterEach(() => StuffApi.clearAll());

  it('from nowhere: a direct move onto a body is refused loose-on-body; receive puts it in a hand', () => {
    const [a, b] = [body(), body()];
    const [ca, cb] = [cup(), cup()];
    expect(() => ContainmentApi.move(ca, a)).toThrow(/loose-on-body/);
    expect(ca.getContainer()).toBeNull();
    expect(b.receive(cb)).toBeNull();
    expect(b.tierOf(cb)).toBe('hand');
  });

  it('out of a box: leaves the box, lands in a hand', () => {
    const b = body();
    const boxB = makeStuff(() => new TestBox());
    const cb = cup();
    ContainmentApi.move(cb, boxB);
    expect(b.receive(cb)).toBeNull();
    expect(snapshot(cb, b, boxB).fromStillHasIt).toBe(false);
    expect(b.tierOf(cb)).toBe('hand');
  });

  it('`prefer: pockets` with nothing worn still takes a free hand', () => {
    const b = body();
    const c = cup();
    expect(b.receive(c, { prefer: 'pockets' })).toBeNull();
    expect(b.tierOf(c)).toBe('hand');
  });

  it('with a slot: seated there, exactly as seatInSlot did', () => {
    const [a, b] = [body(), body()];
    const [ca, cb] = [cup(), cup()];
    a.seatInSlot(ca, 'hand:right');
    expect(b.receive(cb, { slot: 'hand:right' })).toBeNull();
    expect(snapshot(cb, b, null)).toEqual(snapshot(ca, a, null));
    expect(snapshot(cb, b, null)).toMatchObject({ inHolder: true, rightHand: true });
  });
});
