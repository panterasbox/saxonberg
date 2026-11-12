/**
 * ⭐ A keeper's goods are what she CARRIES, never what she wears (the
 * size-and-carrying drive's open findings: the keepers' hands filling,
 * Wen Hartley's `shelf consign` refused). Since the flip a body's clothes
 * are in its contents with everything else, and both brains read the whole
 * contents as merchandise: `stocks` shelved the apron (`put apron in
 * counter`) and `consigns` put the hand's shirt up for sale — and neither
 * ever went idle, because a dressed keeper always "held" goods.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { brain as stocks } from '../stocks';
import { brain as consigns } from '../consigns';
import type { BrainContext } from '@saxonberg/server/mud/lib/behavior/brain';
import StockBase from '@saxonberg/server/mud/lib/retail/Stock';
import Good from '@saxonberg/server/mud/platform/thing/Good';
import Holder from '@saxonberg/server/mud/lib/stuff/Holder';
import Location from '@saxonberg/server/mud/platform/location/Location';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { makeBody, wornGarment } from '@saxonberg/server/mud/lib/slot/__tests__/carrying-fixture';
import { installForms } from '@saxonberg/server/mud/lib/spatial/__tests__/size-fixture';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';

class Stock extends StockBase {}

const COUNTER = '/test/goods/thing/counter';
const FLOOR = '/test/goods/thing/floor-stock';

function ctx(host: unknown, config: Record<string, unknown>): BrainContext {
  return { host, config, state: {} } as unknown as BrainContext;
}

describe("a keeper's goods are what she carries, never what she wears", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installForms();
  });
  afterEach(() => StuffApi.clearAll());

  async function dressed() {
    const room = makeStuff(() => new Location());
    const { me, plan } = makeBody();
    ContainmentApi.move(me, room);
    await wornGarment(me, plan, 'apron', 'torso');
    return { room, me };
  }
  function crate(room: Location): Good {
    const g = makeStuff(() => new Good());
    g.setShortDescription('crate');
    g.setKeywords(['crate']);
    g.setMass(Quantity.of(3, 'kg'));
    g.setDimensions({ width: 0.4, depth: 0.3, height: 0.25 });
    ContainmentApi.move(g, room);
    return g;
  }

  it('⭐ `stocks`: a counter at par and a dressed keeper with empty hands is idle', async () => {
    const { room, me } = await dressed();
    const counter = makeStuffAtPath(() => {
      const s = new Stock();
      s.stockLines = [];
      return s;
    }, COUNTER);
    ContainmentApi.move(counter as never, room as never);
    expect(stocks.urgency(ctx(me, { counter: COUNTER })).band).toBe('idle');
    // …and a crate in her hand is work.
    ContainmentApi.move(crate(room), me);
    expect(stocks.urgency(ctx(me, { counter: COUNTER })).band).not.toBe('idle');
  });

  it('⭐ `consigns`: an empty floor and a dressed hand with nothing in hand is idle', async () => {
    const { room, me } = await dressed();
    const floor = makeStuffAtPath(() => new Holder(), FLOOR);
    ContainmentApi.move(floor as never, room as never);
    expect(consigns.urgency(ctx(me, { stock: FLOOR })).band).toBe('idle');
    ContainmentApi.move(crate(room), me);
    expect(consigns.urgency(ctx(me, { stock: FLOOR })).band).not.toBe('idle');
  });
});
