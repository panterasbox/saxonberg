/**
 * The ash-man's round (potash D17): rake, buy at the counter's bid, take
 * title for the house, lay it on the counter.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { brain } from '../behavior/ashes';
import Location from '@saxonberg/server/mud/lib/location/Location';
import Good from '@saxonberg/server/mud/lib/stuff/Good';
import Stock from '@saxonberg/server/mud/lib/retail/Stock';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { ContainableMixin } from '@saxonberg/server/mud/lib/spatial/Containable';
import { BurnerMixin } from '@saxonberg/server/mud/lib/fire/Burner';
import { ThermalMixin } from '@saxonberg/server/mud/lib/thermal/Thermal';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { BankingApi } from '@saxonberg/server/mud/api/banking';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { BrainContext } from '@saxonberg/server/mud/lib/behavior/brain';

class TestHand extends ContainerMixin(ContainableMixin(Idea)) {
  static _mixinName = 'TestHand';
}
class TestGrate extends BurnerMixin(ThermalMixin(Good)) {
  static _mixinName = 'TestGrate';
}

/** A heap that is the hearth owner's until somebody buys it. */
function heap(owner: { kind: string; templatePath?: string } | null): Good {
  const h = makeStuff(() => new Good());
  vi.spyOn(h, 'chattelOwner').mockResolvedValue(owner as never);
  vi.spyOn(h, 'transferChattel').mockResolvedValue({ ok: true } as never);
  return h;
}

describe('the ash round', () => {
  let stop: Location;
  let hand: TestHand;
  let counter: Stock;
  let pay: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    installV1QuantityMarshallers();
    stop = makeStuff(() => new Location());
    hand = makeStuff(() => new TestHand());
    ContainmentApi.move(hand as never, stop);
    counter = makeStuff(() => new Stock());
    const real = StuffApi.findByTemplatePath.bind(StuffApi);
    vi.spyOn(StuffApi, 'findByTemplatePath').mockImplementation(((p: string) => (p === '/c' ? counter : real(p))) as never);
    vi.spyOn(counter, 'bidFor').mockReturnValue(2);
    vi.spyOn(hand, 'getIdentityPath').mockReturnValue('ash-man');
    vi.spyOn(BankingApi, 'primaryAccountIdOf').mockImplementation(async (k: string) =>
      k === 'owner' ? 'owner-acct' : k === 'ash-man' ? 'his-acct' : null,
    );
    vi.spyOn(BankingApi, 'compactCurrency').mockReturnValue('TST');
    pay = vi.fn(async () => 'tx');
    vi.spyOn(BankingApi, 'payTerms').mockImplementation(pay as never);
    vi.spyOn(MessageApi, 'scene').mockReturnValue({
      topic() { return this; }, toPeers() { return this; }, toSelf() { return this; }, send() {},
    } as never);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  const ctx = (): BrainContext => ({ host: hand, config: { counter: '/c' }, state: {}, trigger: { source: 'candidate', raw: '' } }) as never;

  it('⭐ at a stop: rakes the grate, pays the owner the counter’s bid from his own money, and takes title', async () => {
    const g = makeStuff(() => new TestGrate());
    ContainmentApi.move(g as never, stop);
    g.ashKg = 0.4;
    const paidFor = heap({ kind: 'player', templatePath: 'owner' });
    vi.spyOn(g, 'rakeGrate').mockResolvedValue({ kg: 0.4, ash: [paidFor] });
    expect(brain.urgency(ctx()).band).toBe('wanted');
    await brain.act(ctx());
    expect(pay).toHaveBeenCalledWith('his-acct', 'owner-acct', expect.anything(), expect.stringMatching(/ash round/));
    expect(paidFor.transferChattel).toHaveBeenCalledWith(hand);
  });

  it('⭐ a heap with nobody to pay is taken all the same — and said', async () => {
    const g = makeStuff(() => new TestGrate());
    ContainmentApi.move(g as never, stop);
    g.ashKg = 0.4;
    const nobodys = heap(null);
    vi.spyOn(g, 'rakeGrate').mockResolvedValue({ kg: 0.4, ash: [nobodys] });
    await brain.act(ctx());
    expect(pay).not.toHaveBeenCalled();
    expect(nobodys.transferChattel).toHaveBeenCalledWith(hand);
  });

  it('a stop with a clean grate is nothing to do', () => {
    const g = makeStuff(() => new TestGrate());
    ContainmentApi.move(g as never, stop);
    g.ashKg = 0.01;
    expect(brain.urgency(ctx()).band).toBe('idle');
  });
});
