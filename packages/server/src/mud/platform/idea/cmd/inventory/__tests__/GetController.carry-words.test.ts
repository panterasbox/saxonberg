/**
 * ⭐ The carrying words leave the model (size and carrying W8): the body
 * reports facts — a refusal from `directMove`/`ready`, an outcome from
 * `bringToHand` — and the verb's controller words them
 * (`CommandController.carryRefusalWords`; `get`'s private `drawWords` —
 * D-W10-3: a draw into a free hand, nothing put away).
 */
import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import { installV1QuantityMarshallers } from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { installForms } from '../../../../../lib/spatial/__tests__/size-fixture';
import { makeBody, tool, hold, wornBag, carryWords } from '../../../../../lib/slot/__tests__/carrying-fixture';
import GetController from '../GetController';
import { makeStuff } from '../../../../../lib/security/__tests__/test-setup';
import Holder from '../../../../../lib/stuff/Holder';

describe('the carrying words are the controller\'s', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installForms();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('a refusal is facts; the words name the hands and the way out', () => {
    const { me, plan } = makeBody();
    hold(me, plan, tool('knife', 0.2), 'hand:right');
    hold(me, plan, tool('torch', 0.5), 'hand:left');
    const cup = tool('cup', 0.2);
    const r = me.directMove(cup);
    expect(r?.reason).toBe('nowhere-to-carry');
    expect(carryWords(me, r)).toMatch(/^Your hands are full — .* — and the cup has nowhere to go\. Set something down/);
  });

  it('a draw reports where the thing came from; `get`\'s words say only the draw', () => {
    const { me } = makeBody();
    const pouch = makeStuff(() => new Holder());
    pouch.setShortDescription('pouch');
    const compass = tool('compass', 0.2);
    ContainmentApi.move(compass, pouch);
    // The pouch is on the body: a container it carries.
    vi.spyOn(me, 'isAdmitting').mockReturnValue(true);
    ContainmentApi.move(pouch, me);
    const out = me.bringToHand(compass);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.from.container).toBe(pouch);
    const get = makeStuff(() => new GetController()) as unknown as {
      drawWords(o: typeof out): { self: string; peer: string } | null;
    };
    expect(get.drawWords(out)?.self).toBe('You pull out your compass from your pouch.');
  });

  it('hands in the way: the `hands-needed` sentence names what they hold, `drop`, `unwield` and the `put`', () => {
    const { me, plan } = makeBody();
    hold(me, plan, tool('mug', 0.3), 'hand:right');
    hold(me, plan, tool('lantern', 1), 'hand:left');
    const satchel = wornBag(me, plan, 'satchel', 'torso');
    const compass = tool('compass', 0.2);
    ContainmentApi.move(compass, satchel);
    const r = me.ready(compass);
    expect(r !== null && !r.ok ? r.reason : null).toBe('hands-needed');
    const said = carryWords(me, r);
    expect(said).toMatch(/^That takes a free hand — you're holding the (mug|lantern) and the (mug|lantern)\. `drop (mug|lantern)` \(free in a fight\), or put one away first \(`unwield (mug|lantern)`, `put (mug|lantern) in satchel`\)\.$/);
  });
});
