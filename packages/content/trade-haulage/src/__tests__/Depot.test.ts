/**
 * **The depot** — the interface, where a lane touches the local economy.
 *
 *  - ⭐ **AC10's second half**: after a tender the goods are in the
 *    CARRIER'S hands and the shipper is not — custody moved, ownership
 *    did not, and the bill is what says so. That gap is the whole of
 *    what bailment is.
 *  - ⭐ **AC11's object half**: a **bearer** receipt is minted as a Thing
 *    you can be robbed of; a **registered** one is a record and mints
 *    nothing at all. The asymmetry IS the design.
 *  - and the refusals that keep the desk honest: no carrier, no
 *    destination, nowhere to put it.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { ContainableMixin } from '@saxonberg/server/mud/lib/spatial/Containable';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import DepotCounter from '../thing/DepotCounter';
import Warehouse from '../thing/Warehouse';
import BearerReceipt from '../thing/BearerReceipt';
import WaybillRegistry from '../idea/WaybillRegistry';
import { WAYBILL_REGISTRY_PATH } from '../lib/haulage/ShipmentDesk';
import {
  CARRIER,
  DEPOT,
  business,
  clerk,
  installStore,
} from './haulage-fixtures';

class TestRoom extends ContainerMixin(Idea) {
  static _mixinName = 'HaulageTestRoom';
}
class Crate extends ContainableMixin(Idea) {
  static _mixinName = 'HaulageTestCrate';
}

const QUAY = '/world/terminus/estuary/lower-towpath';
const YARD = '/world/rejection/location/pithead-yard';
const RECEIPT_ROW = '/trade/haulage/thing/bearer-receipt';

/** ⚠ Here rather than in the fixtures — see the note there. */
async function asClerk<T>(fn: () => Promise<T>): Promise<T> {
  return ExecutionContextApi.runRoot(null, 'haulage.test', () => {
    ExecutionContextApi.tagActingAuthor(clerk());
    return fn();
  }) as Promise<T>;
}

let quay: TestRoom;
let registry: WaybillRegistry;

/** Serve the registry singleton and the bearer-receipt row by path. */
function installSingletons(): void {
  registry = makeStuffAtPath(
    () => new WaybillRegistry(),
    WAYBILL_REGISTRY_PATH,
  );
  const real = StuffApi.singleton.bind(StuffApi);
  vi.spyOn(StuffApi, 'singleton').mockImplementation(((path: string) => {
    if (path === WAYBILL_REGISTRY_PATH) {
      return Promise.resolve(registry as unknown as Stuff);
    }
    if (path === CARRIER || path === DEPOT) {
      return Promise.resolve(business(path) as unknown as Stuff);
    }
    return real(path);
  }) as typeof StuffApi.singleton);
  const realClone = StuffApi.clone.bind(StuffApi);
  vi.spyOn(StuffApi, 'clone').mockImplementation(((path: string) =>
    path === RECEIPT_ROW
      ? Promise.resolve(makeStuff(() => new BearerReceipt()) as unknown as Stuff)
      : realClone(path)) as typeof StuffApi.clone);
}

beforeEach(() => {
  installV1QuantityMarshallers();
  StuffApi.clearAll();
  installStore();
  vi.spyOn(WorldClockApi, 'getNow').mockReturnValue(Quantity.of(10_000, 's'));
  quay = makeStuffAtPath(() => new TestRoom(), QUAY);
  installSingletons();
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

function counter(): DepotCounter {
  const c = makeStuff(() => new DepotCounter());
  c.setCarrierPath(CARRIER);
  ContainmentApi.move(c as unknown as Stuff & Containable, quay as unknown as Stuff & Container);
  return c;
}

describe('the shipping desk', () => {
  it('⭐ AC10 — custody moves to the carrier; the shipper is elsewhere', async () => {
    const desk = counter();
    const crate = makeStuff(() => new Crate());
    ContainmentApi.move(crate, quay as unknown as Stuff & Container);

    const out = await asClerk(() =>
      desk.accept({
        goods: crate as unknown as Stuff & Containable,
        destination: YARD,
        shipper: '/platform/agent/Avatar/merchant',
        declaredValueMinor: 120,
      }),
    );
    expect(out.ok).toBe(true);

    // The goods are in the carrier's hands — on the desk, which is the
    // depot's own hold when none is authored…
    expect(crate.getContainer()).toBe(desk);
    // …and the paper is what proves it. Custody moved; OWNERSHIP did
    // not, and nothing here touched a chattel stamp.
    const filed = await registry.freightOf(business(CARRIER));
    expect(filed).toHaveLength(1);
    expect(filed[0]!.from).toBe(QUAY);
    expect(filed[0]!.to).toBe(YARD);
    expect(filed[0]!.shipper).toBe('/platform/agent/Avatar/merchant');
    expect(filed[0]!.via).toBe('ship');
  });

  it('puts goods in the SHED when one is authored', async () => {
    const shed = makeStuffAtPath(
      () => new Warehouse(),
      '/trade/haulage/thing/warehouse',
    );
    ContainmentApi.move(
      shed as unknown as Stuff & Containable,
      quay as unknown as Stuff & Container,
    );
    const desk = counter();
    desk.setHoldPath('/trade/haulage/thing/warehouse');
    const crate = makeStuff(() => new Crate());
    ContainmentApi.move(crate, quay as unknown as Stuff & Container);

    await asClerk(() =>
      desk.accept({
        goods: crate as unknown as Stuff & Containable,
        destination: YARD,
        shipper: '/platform/agent/Avatar/merchant',
        declaredValueMinor: 0,
      }),
    );
    expect(crate.getContainer()).toBe(shed);
  });

  it('refuses when it acts for no carrier, or names no destination', async () => {
    const orphan = makeStuff(() => new DepotCounter());
    ContainmentApi.move(
      orphan as unknown as Stuff & Containable,
      quay as unknown as Stuff & Container,
    );
    const crate = makeStuff(() => new Crate());
    ContainmentApi.move(crate, quay as unknown as Stuff & Container);
    const tender = {
      goods: crate as unknown as Stuff & Containable,
      destination: YARD,
      shipper: '/platform/agent/Avatar/merchant',
      declaredValueMinor: 0,
    };
    const noCarrier = await asClerk(() => orphan.accept(tender));
    expect(noCarrier.ok).toBe(false);
    expect(noCarrier.ok === false && noCarrier.reason).toMatch(/no carrier/);

    const desk = counter();
    const noWhere = await asClerk(() =>
      desk.accept({ ...tender, destination: '  ' }),
    );
    expect(noWhere.ok).toBe(false);
    expect(noWhere.ok === false && noWhere.reason).toMatch(/no destination/);
  });

  it('a depot counter is an attendant queue and a desk at once', () => {
    const desk = counter();
    expect(MixinApi.isAttendant(desk as unknown as Stuff)).toBe(true);
    expect(
      MixinApi.isActive(desk as unknown as Stuff, 'ShipmentDeskMixin'),
    ).toBe(true);
  });
});

describe('the warehouse', () => {
  it('⭐ AC11 — a BEARER receipt is a Thing; a REGISTERED one is not', async () => {
    const shed = makeStuff(() => new Warehouse());
    shed.setBaileePath(DEPOT);
    ContainmentApi.move(
      shed as unknown as Stuff & Containable,
      quay as unknown as Stuff & Container,
    );

    const bearerGoods = makeStuff(() => new Crate());
    ContainmentApi.move(bearerGoods, quay as unknown as Stuff & Container);
    const bearer = await asClerk(() =>
      shed.deposit(
        bearerGoods as unknown as Stuff & Containable,
        '/platform/agent/Avatar/merchant',
        { bearer: true },
      ),
    );
    // A slip of paper you are holding — and therefore one you can be
    // robbed of, because it is an object like any other.
    expect(bearer.token).toBeInstanceOf(BearerReceipt);
    expect(bearer.token!.getReceiptPath()).toBe(bearer.receiptPath);
    expect(MixinApi.isContainable(bearer.token as unknown as Stuff)).toBe(true);

    const registeredGoods = makeStuff(() => new Crate());
    ContainmentApi.move(registeredGoods, quay as unknown as Stuff & Container);
    const registered = await asClerk(() =>
      shed.deposit(
        registeredGoods as unknown as Stuff & Containable,
        '/platform/agent/Avatar/merchant',
      ),
    );
    // ⭐ Nothing to mint, nothing to take. The record IS the receipt,
    // and that asymmetry is the reason a merchant would want one form
    // over the other.
    expect(registered.token).toBeNull();
    expect(registered.receiptPath).toMatch(/warehouse-receipts/);
  });

  it('takes the goods into store and names who they belong to', async () => {
    const shed = makeStuff(() => new Warehouse());
    shed.setBaileePath(DEPOT);
    ContainmentApi.move(
      shed as unknown as Stuff & Containable,
      quay as unknown as Stuff & Container,
    );
    const goods = makeStuff(() => new Crate());
    ContainmentApi.move(goods, quay as unknown as Stuff & Container);

    await asClerk(() =>
      shed.deposit(
        goods as unknown as Stuff & Containable,
        '/platform/agent/Avatar/brewer',
      ),
    );
    expect(goods.getContainer()).toBe(shed);
    const held = await registry.receiptsOf(business(DEPOT));
    expect(held).toHaveLength(1);
    expect(held[0]!.depositor).toBe('/platform/agent/Avatar/brewer');
  });

  it('⚠ a shed that names no bailee refuses — nobody would owe the duty', async () => {
    const orphan = makeStuff(() => new Warehouse());
    ContainmentApi.move(
      orphan as unknown as Stuff & Containable,
      quay as unknown as Stuff & Container,
    );
    const goods = makeStuff(() => new Crate());
    ContainmentApi.move(goods, quay as unknown as Stuff & Container);
    await expect(
      asClerk(() =>
        orphan.deposit(
          goods as unknown as Stuff & Containable,
          '/platform/agent/Avatar/brewer',
        ),
      ),
    ).rejects.toThrow(/duty of care/);
  });
});
