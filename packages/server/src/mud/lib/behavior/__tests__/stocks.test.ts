/**
 * The `stocks` beat (economic bootstrap D14) — the keeper who STOCKS the
 * counter. Each beat, every supplied line short of par sends the keeper
 * to the supplier's counter to buy the shortfall as the house, borrowing
 * at the house's bank first when the till is short — rung 1, the
 * real-bills rung — and home to shelve what was bought.
 *
 * ⭐ Controller-free, the `restocks` shape: `forceCommand` is a stub
 * dispatcher whose physical verbs (`buy` / `put`) are their containment
 * effect and whose money verbs (`bank borrow`) move a number. What the
 * beat TYPES is the thing under test — an NPC following a rule is still
 * a party posting a price, and every step is the literal verb a player
 * would type.
 *
 * ⭐ The WALK is not stubbed away: the fixture is a real three-room
 * neighbourhood with real doors, and the keeper finds her way by the
 * authored directions on her row. Only `traverseWithDefault` is mocked
 * (it writes through the persistence layer), so a wrong direction fails
 * here exactly as it would fail the shop.
 *
 * ⚠ SYNTHETIC fixtures under `/test/**`, never the general store's rows.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { brain as stocks } from '../stocks';
import type { BrainContext } from '../brain';
import Extra from '../../../platform/agent/Extra';
import Stock from '../../../platform/thing/Stock';
import Thing from '../../../platform/thing/Thing';
import BankCounter from '../../../platform/thing/BankCounter';
import BusinessEntity from '../../../platform/idea/Business';
import Location from '../../stuff/Location';
import CartesianLocation from '../../../platform/location/CartesianLocation';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import { StuffApi } from '../../../api/stuff';
import { BankingApi } from '../../../api/banking';
import { EmploymentApi } from '../../../api/employment';
import { AppApi } from '../../../api/app';
import { ContainmentApi } from '../../../api/containment';
import { LocomotionApi } from '../../../api/locomotion';
import { MixinApi } from '../../../api/mixin';
import { Money } from '../../banking/Money';
import { EmploymentLogic } from '../../../platform/idea/api/EmploymentLogic';
import type { Stuff } from '../../stuff/Stuff';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const SHOP = '/test/stocks/location/shop';
const MARKET = '/test/stocks/location/market';
const HALL = '/test/stocks/location/hall';
const COUNTER = '/test/stocks/thing/counter';
const SUPPLIER_COUNTER = '/test/stocks/thing/cash-and-carry';
const BANK = '/test/stocks/thing/bank-counter';
const HOUSE = '/test/stocks/idea/house';
const SUPPLIER = '/test/stocks/idea/distributor';
const LIMES = '/test/stocks/thing/crate-of-limes';
const COFFEE = '/test/stocks/thing/coffee-sack';

class Crate extends Thing {}

/** The rooms she walked into, in order — the authored way, observed. */
let walked: string[] = [];

/** One door, taken: the containment half of a traverse, without Mongo. */
async function step(
  mover: unknown,
  exit: { getDestinationTemplatePath: () => string },
): Promise<void> {
  const path = exit.getDestinationTemplatePath();
  const dest = StuffApi.findByTemplatePath(path);
  if (!dest) throw new Error(`no room at ${path}`);
  ContainmentApi.move(mover as never, dest as never);
  walked.push(path);
}
let shop: CartesianLocation;
let market: CartesianLocation;
let hall: CartesianLocation;
let counter: Stock;
let supplierCounter: Stock;
let keeper: Extra;
let house: BusinessEntity;
let balance = 0;
let typed: string[] = [];

/** The ways the keeper's row authors: to the window, and to the wholesaler. */
const WAYS = [
  { to: HALL, go: ['west'], back: ['east'] },
  { to: MARKET, go: ['south'], back: ['north'] },
];

function ctxFor(config: Record<string, unknown> = {}): BrainContext {
  return {
    host: keeper as never,
    config: { counter: COUNTER, ways: WAYS, ...config },
    state: {},
    trigger: { source: 'cadence', raw: 'cadence:90s' },
    say: () => {},
    emote: async () => {},
    emoteFree: () => {},
  };
}

function good(path: string, kw: string, into: Stuff): Crate {
  const c = makeStuffAtPath(() => {
    const t = new Crate();
    t.setKeywords([kw]);
    t.setPrimaryKeyword(kw);
    return t;
  }, path);
  ContainmentApi.move(c as never, into as never);
  return c;
}

function business(path: string, locations: string[]): BusinessEntity {
  return makeStuffAtPath(() => {
    const b = new BusinessEntity();
    b.proprietorPath = '';
    b.positions = [];
    b.operatingLocations = locations;
    b.banksAt = 'goodkin';
    return b;
  }, path);
}

/** The literal verbs, as their effect. */
async function dispatch(text: string): Promise<void> {
  typed.push(text);
  const [verb, ...rest] = text.split(' ');
  const kw = rest[0] ?? '';
  const room = keeper.getContainer() as Location;
  if (verb === 'wallet') return;
  if (verb === 'bank') {
    // `bank borrow <n> --for stock` — the window lends what was asked.
    balance += Number(rest[1]);
    return;
  }
  if (verb === 'buy') {
    const shelf = room.getContents().find((c): c is Stock => c instanceof Stock);
    const item = shelf?.resolveBuy(kw) ?? null;
    if (!shelf || !item) return;
    const price = shelf.priceFor(item.getTemplatePath() ?? '') ?? 0;
    if (balance < price) return; // a refused buy leaves the good where it is
    balance -= price;
    ContainmentApi.move(item as never, keeper as never);
    return;
  }
  if (verb === 'put') {
    // `put <kw> in <counterKw>`
    const item = keeper
      .getContents()
      .find((c) => MixinApi.isPerceptible(c) && c.hasKeyword(kw));
    const target = room
      .getContents()
      .find((c) => MixinApi.isPerceptible(c) && c.hasKeyword(rest[2] ?? ''));
    if (item && target) ContainmentApi.move(item as never, target as never);
  }
}

beforeEach(async () => {
  installV1QuantityMarshallers();
  StuffApi.clearAll();
  balance = 0;
  typed = [];
  vi.spyOn(AppApi, 'setting').mockImplementation(((key: string) =>
    key === 'retail.stockingElasticity' ? '0.5' : key === 'retail.termsMargin' ? '0.25' : '') as never);

  // ⭐ A real little neighbourhood, because the keeper now walks AUTHORED
  // directions through real doors — the walk is not mocked away, so a
  // wrong direction on her row fails the test the way it fails the shop.
  const zone = makeStuff(() => new CartesianZone());
  zone.setCellSize(1);
  shop = makeStuffAtPath(() => new CartesianLocation(), SHOP);
  market = makeStuffAtPath(() => new CartesianLocation(), MARKET);
  hall = makeStuffAtPath(() => new CartesianLocation(), HALL);
  zone.addLocation(shop, 0, 0, 0);
  zone.addLocation(hall, -1, 0, 0); // the window, one west
  zone.addLocation(market, 0, -1, 0); // the wholesaler, one south
  await shop.addBidirectionalExit(hall, 'west');
  await shop.addBidirectionalExit(market, 'south');

  counter = makeStuffAtPath(() => {
    const s = new Stock();
    s.stockLines = [
      { itemTemplatePath: LIMES, par: 3, supplier: SUPPLIER, pricing: 'stocking' },
      { itemTemplatePath: COFFEE, par: 1, supplier: SUPPLIER, pricing: 'stocking' },
    ];
    s.prices = { [LIMES]: 10, [COFFEE]: 30 };
    s.setKeywords(['counter']);
    s.setPrimaryKeyword('counter');
    return s;
  }, COUNTER);
  ContainmentApi.move(counter as never, shop as never);

  supplierCounter = makeStuffAtPath(() => {
    const s = new Stock();
    s.stockLines = [];
    s.prices = { [LIMES]: 8, [COFFEE]: 22 };
    s.setKeywords(['till']);
    return s;
  }, SUPPLIER_COUNTER);
  ContainmentApi.move(supplierCounter as never, market as never);

  const bank = makeStuffAtPath(() => {
    const b = new BankCounter();
    b.setCorpoKey('goodkin');
    return b;
  }, BANK);
  ContainmentApi.move(bank as never, hall as never);

  house = business(HOUSE, [COUNTER]);
  business(SUPPLIER, [SUPPLIER_COUNTER]);

  keeper = makeStuff(() => new Extra());
  ContainmentApi.move(keeper as never, shop as never);
  vi.spyOn(keeper, 'forceCommand').mockImplementation(dispatch as never);
  // ⚠ The traverse writes through the persistence layer, so it is mocked
  // HERE and not one layer up: the brain still has to find the authored
  // direction, and the exit it hands over is the real one.
  walked = [];
  vi.spyOn(LocomotionApi, 'traverseWithDefault').mockImplementation(step as never);
  vi.spyOn(EmploymentLogic.prototype, 'buysFor').mockResolvedValue([house as never]);
  vi.spyOn(EmploymentApi, 'operatingAccountOf').mockResolvedValue('acct-house');
  vi.spyOn(BankingApi, 'balanceOf').mockImplementation(() => Money.of(balance, 'zorkmid' as never));
  vi.spyOn(BankingApi, 'branchOf').mockReturnValue(bank as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('⭐ the keeper stocks the counter — buys the shortfall as the house, and shelves it', () => {
  it('a flush till buys every short line at the supplier and puts it on the counter, borrowing nothing', async () => {
    for (let i = 0; i < 4; i += 1) good(`${LIMES}`, 'limes', supplierCounter);
    good(COFFEE, 'coffee', supplierCounter);
    balance = 100; // 3 × 8 + 22 = 46
    await stocks.act(ctxFor());
    expect(typed.filter((t) => t === 'buy limes')).toHaveLength(3);
    expect(typed.filter((t) => t === 'buy coffee')).toHaveLength(1);
    expect(typed.filter((t) => t.startsWith('bank borrow'))).toHaveLength(0);
    expect(typed.filter((t) => t === 'put limes in counter')).toHaveLength(3);
    expect(typed.filter((t) => t === 'put coffee in counter')).toHaveLength(1);
    expect(counter.onHand(LIMES)).toBe(3);
    expect(counter.onHand(COFFEE)).toBe(1);
    expect(supplierCounter.onHand(LIMES)).toBe(1);
    expect(balance).toBe(54);
    // Home again, on its own feet.
    expect(keeper.getContainer()).toBe(shop);
    // Every step a literal verb, and the house's money.
    expect(typed[0]).toBe('wallet use house');
  });

  it('⭐ a thin till BORROWS the difference at the window first — rung 1, the real-bills rung', async () => {
    for (let i = 0; i < 3; i += 1) good(LIMES, 'limes', supplierCounter);
    balance = 10; // needs 24
    await stocks.act(ctxFor());
    expect(typed).toContain('bank borrow 14 --for stock');
    expect(typed.indexOf('bank borrow 14 --for stock')).toBeLessThan(typed.indexOf('buy limes'));
    expect(counter.onHand(LIMES)).toBe(3);
    expect(balance).toBe(0);
  });

  it('a refused loan buys what it can afford and stops, leaving the rest for the next beat', async () => {
    for (let i = 0; i < 3; i += 1) good(LIMES, 'limes', supplierCounter);
    balance = 17; // two crates' worth; the window refuses (the dispatcher is told to)
    const lend = vi.fn();
    vi.spyOn(keeper, 'forceCommand').mockImplementation((async (text: string) => {
      if (text.startsWith('bank borrow')) {
        lend(text);
        typed.push(text);
        return; // refused: nothing lands
      }
      return dispatch(text);
    }) as never);
    await stocks.act(ctxFor());
    expect(lend).toHaveBeenCalledWith('bank borrow 7 --for stock');
    expect(counter.onHand(LIMES)).toBe(2);
    expect(supplierCounter.onHand(LIMES)).toBe(1);
    expect(balance).toBe(1);
    expect(keeper.getContainer()).toBe(shop);
  });

  it('⭐⭐ she walks the AUTHORED way and comes back — out one door, in the next, no search', async () => {
    for (let i = 0; i < 3; i += 1) good(LIMES, 'limes', supplierCounter);
    balance = 4; // short: the window first, then the wholesaler
    await stocks.act(ctxFor());
    // Home → the window → home → the wholesaler → home. Each leg is one
    // authored direction through a real door; nothing planned a route.
    expect(walked).toEqual([HALL, SHOP, MARKET, SHOP]);
    expect(keeper.getContainer()).toBe(shop);
  });

  it('⚠ a room no `ways` row names is a room she does not go to — the shop simply never restocks', async () => {
    for (let i = 0; i < 3; i += 1) good(LIMES, 'limes', supplierCounter);
    balance = 100;
    // The wholesaler's way unauthored (an author added a supplier and
    // not the way there): she stays in, and the till is untouched.
    await stocks.act(ctxFor({ ways: [{ to: HALL, go: ['west'], back: ['east'] }] }));
    expect(walked).toEqual([]);
    expect(typed).toEqual([]);
    expect(counter.onHand(LIMES)).toBe(0);
    expect(keeper.getContainer()).toBe(shop);
  });

  it("⚠ and she does not BORROW for a trip she can't make", async () => {
    for (let i = 0; i < 3; i += 1) good(LIMES, 'limes', supplierCounter);
    balance = 0; // she would have to borrow to buy
    // The window is reachable; the wholesaler is not. Nothing is owed
    // for goods she was never going to be able to fetch.
    await stocks.act(ctxFor({ ways: [{ to: HALL, go: ['west'], back: ['east'] }] }));
    expect(typed.filter((t) => t.startsWith('bank borrow'))).toEqual([]);
    expect(walked).toEqual([]);
  });

  it('⚠ a door that refuses leaves her where she stands, and the NEXT beat walks her home', async () => {
    for (let i = 0; i < 3; i += 1) good(LIMES, 'limes', supplierCounter);
    balance = 100;
    // The way back from the wholesaler is shut on the first beat.
    let shut = true;
    vi.spyOn(LocomotionApi, 'traverseWithDefault').mockImplementation((async (
      mover: unknown,
      exit: { getDestinationTemplatePath: () => string },
    ) => {
      if (shut && exit.getDestinationTemplatePath() === SHOP && walked.includes(MARKET)) {
        throw new Error('the door is shut');
      }
      await step(mover, exit);
    }) as never);
    await stocks.act(ctxFor());
    expect(keeper.getContainer()).toBe(market); // stranded, holding the goods
    expect(counter.onHand(LIMES)).toBe(0); // nothing shelved from a foreign floor
    // Next beat: the door opens, and the first thing she does is come home.
    shut = false;
    walked = [];
    await stocks.act(ctxFor());
    expect(walked[0]).toBe(SHOP);
    expect(keeper.getContainer()).toBe(shop);
    expect(counter.onHand(LIMES)).toBe(3);
  });

  it('a counter at par sends nobody anywhere', async () => {
    for (let i = 0; i < 3; i += 1) good(LIMES, 'limes', counter);
    good(COFFEE, 'coffee', counter);
    good(LIMES, 'limes', supplierCounter);
    balance = 100;
    await stocks.act(ctxFor());
    expect(typed).toEqual([]);
    expect(keeper.getContainer()).toBe(shop);
  });

  it('a supplier with nothing on the shelf is walked to for nothing — the beat buys only what is there', async () => {
    good(LIMES, 'limes', supplierCounter);
    balance = 100;
    await stocks.act(ctxFor());
    expect(typed.filter((t) => t === 'buy limes')).toHaveLength(1);
    expect(counter.onHand(LIMES)).toBe(1);
  });

  it('⚠ buys by a keyword that names the GOOD, not the first crate on the shelf', async () => {
    // Every crate answers to `crate`, and it is every crate's primary
    // keyword; the grapes stand first. The keeper sent for limes must
    // come home with limes.
    const GRAPES = '/test/stocks/thing/crate-of-grapes';
    for (let i = 0; i < 3; i += 1) {
      const g = good(GRAPES, 'crate', supplierCounter);
      g.setKeywords(['crate', 'grapes']);
    }
    supplierCounter.prices[GRAPES] = 8;
    for (let i = 0; i < 3; i += 1) {
      const l = good(LIMES, 'crate', supplierCounter);
      l.setKeywords(['crate', 'limes']);
    }
    balance = 100;
    await stocks.act(ctxFor());
    expect(typed.filter((t) => t === 'buy limes')).toHaveLength(3);
    expect(typed.filter((t) => t === 'buy crate')).toHaveLength(0);
    expect(counter.onHand(LIMES)).toBe(3);
    expect(supplierCounter.onHand(GRAPES)).toBe(3);
  });

  it('the beat is bounded by `batch`', async () => {
    for (let i = 0; i < 3; i += 1) good(LIMES, 'limes', supplierCounter);
    good(COFFEE, 'coffee', supplierCounter);
    balance = 100;
    await stocks.act(ctxFor({ batch: 2 }));
    expect(typed.filter((t) => t.startsWith('buy'))).toHaveLength(2);
  });
});
