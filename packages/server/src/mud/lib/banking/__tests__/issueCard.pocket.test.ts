/**
 * ⭐ A card is kept on you, not held (the size-and-carrying drive's open
 * finding: *"the keepers' hands fill after the flip"*).
 *
 * Since the flip a granted thing takes the `receive` order — and a
 * carrier's default `carry.order` is hands-first — so every card the bank
 * issued landed in a HAND. A purchasing NPC is dealt its house card at
 * hire and never puts it away (its brains skip the card when they shelve
 * or consign: *"the house card is chattel too and is not for sale"*), so
 * one hand was gone for good: a keeper could hold one good at a time, the
 * second `get 1 cola` of every beat refused `nowhere-to-carry` — the log
 * the heap-out-of-memory runs were full of — and a two-handed crate never
 * at all. A card goes in a pocket when one takes it, else a hand.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BankingApi } from '../../../api/banking';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import PaymentCard from '../../../platform/thing/PaymentCard';
import Location from '../../location/Location';
import { makeBody, wornGarment } from '../../slot/__tests__/carrying-fixture';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installForms } from '../../spatial/__tests__/size-fixture';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { installBankingHarness, teardownBankingHarness } from './banking-test-harness';

const POCKET = { member: '/platform/placements/pocket', mouth: { width: 0.12, height: 0.035 }, volumeM3: 0.0006 };

describe('an issued card goes in a pocket, never a hand when a pocket takes it', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installForms();
    installBankingHarness();
    vi.spyOn(StuffApi, 'clone').mockImplementation((async () =>
      makeStuffAtPath(() => new PaymentCard(), '/stuff/thing/PaymentCard')) as unknown as typeof StuffApi.clone);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    teardownBankingHarness();
    StuffApi.clearAll();
  });

  it('⭐ a keeper dealt a card keeps both hands free', async () => {
    const room = makeStuff(() => new Location());
    const { me, plan } = makeBody();
    ContainmentApi.move(me, room);
    await wornGarment(me, plan, 'trousers', 'legs', [{ ...POCKET, name: 'left pocket' }]);
    const card = await BankingApi.issueCard('acct-house', 0, me);
    expect(me.heldThings()).toHaveLength(0);
    expect(me.tierOf(card)).toBe('ready');
    expect(me.freeHands()).toBe(2);
  });

  it('a body with no pocket still takes it — in a hand', async () => {
    const room = makeStuff(() => new Location());
    const { me } = makeBody();
    ContainmentApi.move(me, room);
    const card = await BankingApi.issueCard('acct-house', 0, me);
    expect(me.tierOf(card)).toBe('hand');
  });
});
