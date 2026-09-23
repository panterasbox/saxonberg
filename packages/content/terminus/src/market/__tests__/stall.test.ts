/**
 * A player shop is a rented market stall (economic bootstrap D15).
 *
 * `stall rent` mints, for the renter, a counter and a house keyed by
 * their IDENTITY — two renters are two counters, two houses, two
 * accounts (the shared-account regression, the other way round); a
 * second `rent` is idempotent and costs nothing; the stall takes goods
 * on supplier terms and its keeper prices them with `house price`;
 * `give-up` hands the goods back and takes the counter down.
 *
 * The seeds are stubbed at `StuffApi.clone` (the retail suites' shape):
 * a Stock for the counter, a Business with the overlay `rent` supplies.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import StallController, { STALL_SEED, STALL_BUSINESS_SEED, MARKET_BUSINESS } from '../idea/cmd/StallController';
import MarketStalls from '../thing/MarketStalls';
import Stock from '@saxonberg/content-trade-shopkeeping/src/thing/Stock';
import Thing from '@saxonberg/server/mud/platform/thing/Thing';
import BankCounter from '@saxonberg/server/mud/platform/thing/BankCounter';
import PaymentCard from '@saxonberg/server/mud/platform/thing/PaymentCard';
import Coin from '@saxonberg/server/mud/platform/thing/Coin';
import ChattelRegistry from '@saxonberg/server/mud/platform/idea/ChattelRegistry';
import BusinessEntity from '@saxonberg/server/mud/platform/idea/Business';
import ConsignController from '@saxonberg/server/mud/platform/idea/cmd/retail/ConsignController';
import HouseShopController from '@saxonberg/content-trade-shopkeeping/src/idea/cmd/banking/HouseShopController';
import { BankingApi, Money } from '@saxonberg/server/mud/api/banking';
import { EmploymentApi } from '@saxonberg/server/mud/api/employment';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';
import { CommandApi, type CommandContext } from '@saxonberg/server/mud/api/command';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { Document } from '@saxonberg/server/mud/lib/persistence/Document';
import { CommandDefinition } from '@saxonberg/server/mud/lib/command/CommandDefinition';
import { CommandGiverMixin } from '@saxonberg/server/mud/lib/command/CommandGiver';
import { EmployedMixin } from '@saxonberg/server/mud/lib/employment/Employed';
import { SensorMixin } from '@saxonberg/server/mud/lib/message/Sensor';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { ContainableMixin } from '@saxonberg/server/mud/lib/spatial/Containable';
import { NamedMixin } from '@saxonberg/server/mud/lib/description/Named';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import Location from '@saxonberg/server/mud/lib/stuff/Location';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { makeStuff, makeStuffAtPath, withRootContext } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { installBankingHarness, teardownBankingHarness } from '@saxonberg/server/mud/lib/banking/__tests__/banking-test-harness';

const BANK = '/test/stall/thing/bank-counter';
const SQUARE = '/test/stall/location/square';
const STALLS = '/test/stall/thing/stalls';
const TORCH = '/test/stall/thing/torch';

class TestGiver extends EmployedMixin(
  SensorMixin(CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea))))),
) {
  static _mixinName = 'StallTestGiver';
}
class Torch extends Thing {}

function asOwner<T>(owner: Stuff, fn: () => Promise<T>): Promise<T> {
  return withRootContext(null, 'stall.test', () => {
    ExecutionContextApi.tagActingAuthor(owner);
    return fn();
  });
}

function ctx(giver: Stuff, loc: Stuff, source: Stuff | null, text: string, subcommand?: string): CommandContext {
  const verb = text.split(' ')[0] ?? text;
  const c = CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: loc as never,
    commandSource: (source ?? undefined) as never,
    commandText: text,
    executionId: 't',
    commandId: 't',
    verb,
    command: CommandDefinition.fromYaml(`verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`, '<test>'),
  });
  void subcommand;
  return c;
}

/** The two identities a renter's stall carries (the controller's rule: the seed, then the renter's key leaf). */
function identitiesOf(renterKey: string): { counter: string; house: string } {
  const leaf = renterKey.split('/').filter(Boolean).pop() ?? renterKey;
  return { counter: `${STALL_SEED}/${leaf}`, house: `${STALL_BUSINESS_SEED}/${leaf}` };
}

function rejections(c: CommandContext): string[] {
  return c.getNotes().filter((n) => n.kind === 'controller-rejected').map((n) => (n as { reason: string }).reason);
}

let square: Location;
let stalls: MarketStalls;

async function fundedGiver(path: string, minor: number): Promise<TestGiver> {
  const g = makeStuffAtPath(() => new TestGiver(), path);
  g.setName(path.split('/').pop() ?? 'someone');
  const card = makeStuff(() => new PaymentCard());
  ContainmentApi.move(card as never, g as never);
  await asOwner(g, () => BankingApi.openAccount('goodkin', 'goodkin', BankingApi.compactCurrency()));
  if (minor > 0) {
    const bank = StuffApi.findByTemplatePath<BankCounter>(BANK)!;
    const cash = await asOwner(g, () => BankingApi.issueCash(g as never, Money.of(minor, BankingApi.compactCurrency())));
    await asOwner(g, () => bank.deposit(cash as never));
  }
  ContainmentApi.move(g as never, square as never);
  return g;
}

async function stall(giver: TestGiver, subcommand: 'rent' | 'give-up'): Promise<CommandContext> {
  const c = ctx(giver, square, stalls, `stall ${subcommand}`);
  await asOwner(giver, () => makeStuff(() => new StallController()).execute({ subcommand } as never, c));
  return c;
}

function stubSeeds(): void {
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (
    path: string,
    _ctx: unknown,
    opts?: { dataOverlay?: Record<string, unknown>; asIdentityPath?: string },
  ) => {
    const id = opts?.asIdentityPath ?? path;
    if (path === STALL_SEED) {
      return makeStuffAtPath(() => {
        const s = new Stock();
        s.stockLines = [];
        s.prices = {};
        s.discipline = 'scrum';
        s.attendDurationMs = 0;
        s.staffingPolicy = 'self-service';
        s.serverPositionKeys = [];
        s.setKeywords(['stall', 'counter']);
        s.setPurchasing('terms');
        return s;
      }, id);
    }
    if (path === STALL_BUSINESS_SEED) {
      return makeStuffAtPath(() => {
        const b = new BusinessEntity();
        const o = opts?.dataOverlay ?? {};
        b.proprietorPath = '';
        b.positions = [{ key: 'keeper', noun: 'keeper', label: 'keeping a market stall', wageRate: 0, confers: [], purchases: true } as never];
        b.appointingAuthority = o.appointingAuthority as never;
        b.banksAt = String(o.banksAt ?? '');
        b.operatingLocations = [...((o.operatingLocations as string[]) ?? [])];
        return b;
      }, id);
    }
    const c = makeStuffAtPath(() => {
      const coin = new Coin();
      coin.currency = 'zorkmid';
      coin.denomination = 1;
      return coin;
    }, path);
    c.setMass(Quantity.of(0.008, 'kg'));
    return c;
  }) as unknown as typeof StuffApi.clone);
}

describe('a player shop is a rented market stall', () => {
  beforeEach(async () => {
    installBankingHarness();
    installV1QuantityMarshallers();
    Document.setMarshallerResolver(() => undefined, async () => undefined);
    stubSeeds();
    const reg = makeStuffAtPath(() => new ChattelRegistry(), '/platform/idea/ChattelRegistry');
    await reg.postRegister();
    makeStuffAtPath(() => {
      const b = new BankCounter();
      b.setCorpoKey('goodkin');
      return b;
    }, BANK);
    square = makeStuffAtPath(() => new Location(), SQUARE);
    stalls = makeStuffAtPath(() => {
      const s = new MarketStalls();
      s.stockLines = [];
      s.prices = {};
      s.discipline = 'scrum';
      s.attendDurationMs = 0;
      s.staffingPolicy = 'self-service';
      s.serverPositionKeys = [];
      s.setRentMinor(5);
      return s;
    }, STALLS);
    ContainmentApi.move(stalls as never, square as never);
    const market = makeStuffAtPath(() => new BusinessEntity(), MARKET_BUSINESS);
    market.proprietorPath = '';
    market.positions = [];
    market.operatingLocations = [STALLS];
    market.banksAt = 'goodkin';
  });
  afterEach(() => {
    teardownBankingHarness();
    vi.restoreAllMocks();
  });

  it('⭐ rent mints a counter and a house keyed by identity; the rent is paid once; a second rent is idempotent', async () => {
    const alice = await fundedGiver('/platform/agent/Avatar/alice', 20);
    const aliceAcct = (await BankingApi.primaryAccountIdOf('/platform/agent/Avatar/alice'))!;
    const marketAcct = await EmploymentApi.operatingAccountOf(StuffApi.findByTemplatePath(MARKET_BUSINESS) as never);
    const before = BankingApi.balanceOf(marketAcct).minor;

    const c = await stall(alice, 'rent');
    expect(rejections(c)).toEqual([]);
    const ids = identitiesOf('/platform/agent/Avatar/alice');
    const counter = StuffApi.findByTemplatePath<Stock>(ids.counter)!;
    expect(counter).toBeTruthy();
    expect(counter.getContainer()).toBe(square);
    expect(counter.getPurchasing()).toBe('terms');
    const house = StuffApi.findByTemplatePath(ids.house)!;
    expect(house).toBeTruthy();
    expect((house as never as { getOperatingLocations(): string[] }).getOperatingLocations()).toEqual([ids.counter]);
    expect((house as never as { getAccountPath(): string }).getAccountPath()).toBe(ids.house);
    expect(BankingApi.balanceOf(aliceAcct).minor).toBe(15);
    expect(BankingApi.balanceOf(marketAcct).minor).toBe(before + 5);
    // The house is hers: she buys for it, and the operator at her counter is it.
    expect(await alice.buysFor()).toContain(house);
    expect(EmploymentApi.businessAt(ids.counter)).toBe(house);

    const again = await stall(alice, 'rent');
    expect(rejections(again)).toEqual([]);
    expect(StuffApi.findByTemplatePath(ids.counter)).toBe(counter);
    expect(BankingApi.balanceOf(aliceAcct).minor).toBe(15);
    expect(BankingApi.reconcile(BankingApi.compactCurrency()).balanced).toBe(true);
  });

  it('⭐⭐ two renters are two counters, two houses, two ACCOUNTS', async () => {
    const alice = await fundedGiver('/platform/agent/Avatar/alice', 20);
    const bob = await fundedGiver('/platform/agent/Avatar/bob', 20);
    expect(rejections(await stall(alice, 'rent'))).toEqual([]);
    expect(rejections(await stall(bob, 'rent'))).toEqual([]);
    const a = identitiesOf('/platform/agent/Avatar/alice');
    const b = identitiesOf('/platform/agent/Avatar/bob');
    expect(a.counter).not.toBe(b.counter);
    const houseA = StuffApi.findByTemplatePath(a.house) as never as BusinessEntity;
    const houseB = StuffApi.findByTemplatePath(b.house) as never as BusinessEntity;
    expect(houseA).not.toBe(houseB);
    const acctA = await EmploymentApi.operatingAccountOf(houseA as never);
    const acctB = await EmploymentApi.operatingAccountOf(houseB as never);
    expect(acctA).not.toBe(acctB);
    expect(square.getContents().filter((c) => c instanceof Stock && !(c instanceof MarketStalls))).toHaveLength(2);
  });

  it('a renter with no account is refused `no-bank`; one who cannot pay the rent, `cant-afford`', async () => {
    const broke = makeStuffAtPath(() => new TestGiver(), '/platform/agent/Avatar/broke');
    ContainmentApi.move(broke as never, square as never);
    expect(rejections(await stall(broke, 'rent'))).toEqual(['no-bank']);
    const thin = await fundedGiver('/platform/agent/Avatar/thin', 2);
    expect(rejections(await stall(thin, 'rent'))).toEqual(['cant-afford']);
    expect(StuffApi.findByTemplatePath(identitiesOf('/platform/agent/Avatar/thin').counter)).toBeUndefined();
  });

  it('the stall takes goods on supplier terms, and its keeper prices them with `house price`', async () => {
    const alice = await fundedGiver('/platform/agent/Avatar/alice', 20);
    expect(rejections(await stall(alice, 'rent'))).toEqual([]);
    const ids = identitiesOf('/platform/agent/Avatar/alice');
    const counter = StuffApi.findByTemplatePath<Stock>(ids.counter)!;

    // A grower leaves a torch on Alice's terms at 8 — their PRICE.
    const grower = await fundedGiver('/platform/agent/Avatar/grower', 0);
    const torch = makeStuffAtPath(() => {
      const t = new Torch();
      t.setKeywords(['torch']);
      return t;
    }, TORCH);
    ContainmentApi.move(torch as never, grower as never);
    await asOwner(grower, () => torch.stampChattel(grower));
    const consigned = ctx(grower, square, counter, 'consign torch');
    await asOwner(grower, () =>
      makeStuff(() => new ConsignController()).execute(
        { thing: { stuff: torch as never, raw: 'torch' }, ask: '8', shelf: { stuff: counter as never, raw: 'stall' } },
        consigned,
      ),
    );
    expect(rejections(consigned)).toEqual([]);
    expect(counter.listingFor(torch.getChattelId())?.basis).toBe('terms');
    expect(counter.priceFor(TORCH)).toBe(10); // 8 × (1 + the Schedule's margin)

    // Alice, the keeper, sets her own ask.
    const priced = ctx(alice, square, counter, 'house price torch 12');
    await asOwner(alice, () =>
      makeStuff(() => new HouseShopController()).execute(
        { subcommand: 'price', thing: { stuff: torch as never, raw: 'torch' }, ask: '12' } as never,
        priced,
      ),
    );
    expect(rejections(priced)).toEqual([]);
    expect(counter.priceFor(TORCH)).toBe(12);
  });

  it('give-up hands back what is on the counter and takes it down; the house operates nothing', async () => {
    const alice = await fundedGiver('/platform/agent/Avatar/alice', 20);
    expect(rejections(await stall(alice, 'rent'))).toEqual([]);
    const ids = identitiesOf('/platform/agent/Avatar/alice');
    const counter = StuffApi.findByTemplatePath<Stock>(ids.counter)!;
    const torch = makeStuffAtPath(() => {
      const t = new Torch();
      t.setKeywords(['torch']);
      return t;
    }, TORCH);
    ContainmentApi.move(torch as never, counter as never);

    const c = await stall(alice, 'give-up');
    expect(rejections(c)).toEqual([]);
    expect(torch.getContainer()).toBe(alice);
    expect(StuffApi.findByTemplatePath(ids.counter)).toBeUndefined();
    const house = StuffApi.findByTemplatePath(ids.house) as never as { getOperatingLocations(): string[] };
    expect(house.getOperatingLocations()).toEqual([]);
    // Nobody else's stall to give up.
    expect(rejections(await stall(alice, 'give-up'))).toEqual(['no-stall']);
  });
});
