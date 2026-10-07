/**
 * A player shop is a rented market stall (economic bootstrap D15).
 *
 * `stall rent` takes the next free **pitch** on the square and mints a
 * counter and a house keyed to it — two renters are two counters, two
 * houses, two accounts (the shared-account regression, the other way
 * round); a second `rent` is idempotent, costs nothing and returns the
 * same pitch; the stall takes goods on supplier terms and its keeper
 * prices them with `house price`; `give-up` hands the goods back, takes
 * the counter down and frees the pitch.
 *
 * ⭐⭐ The key is the PITCH, not the renter — a key is relative to the
 * thing that manages it, and the square's fixture is what manages
 * pitches. Who rents it lives on the house's `appointingAuthority`.
 *
 * The seeds are stubbed at `StuffApi.clone` (the retail suites' shape):
 * a Stock for the counter, a Business with the overlay `rent` supplies.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import StallController, { STALL_SEED, STALL_BUSINESS_SEED, MARKET_BUSINESS } from '../idea/cmd/StallController';
import MarketStalls from '../thing/MarketStalls';
import Stock from '@saxonberg/content-trade-shopkeeping/src/thing/Stock';
import Good from '@saxonberg/server/mud/platform/thing/Good';
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
import { PlayerApi } from '@saxonberg/server/mud/api/player';
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
class Torch extends Good {}

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

/**
 * The key and the two identities of the stall on a pitch (the
 * controller's rule: the fixture's row as the key prefix, and each
 * identity nesting the key, slash-stripped, under its own seed row).
 */
function idsFor(pitch: string | number): { key: string; counter: string; house: string } {
  const key = `${STALLS}/${pitch}`;
  const leaf = key.replace(/^\/+/, '');
  return {
    key,
    counter: `${STALL_SEED}/${leaf}`,
    house: `${STALL_BUSINESS_SEED}/${leaf}`,
  };
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
    // ⚠⚠ Stamp the TWO AXES the way the real pipeline does: the
    // template path is the seed ROW, the minted identity rides the
    // identity slot. Stamping the identity AS the template path (which
    // this stub did until 2026-10-05) makes every counter look like a
    // clone of its own identity, so a read that enumerates the seed
    // row finds nothing — and the uniqueness invariant, whose needle is
    // the row, cannot see the population it is meant to guard. A
    // fixture that models one axis cannot test a two-axis rule.
    const id = opts?.asIdentityPath;
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
      }, path, id);
    }
    if (path === STALL_BUSINESS_SEED) {
      return makeStuffAtPath(() => {
        const b = new BusinessEntity();
        const o = opts?.dataOverlay ?? {};
        b.proprietorPath = '';
        b.positions = [{ key: 'keeper', noun: 'keeper', label: 'keeping a market stall', wageRate: 0, purchases: true } as never];
        b.appointingAuthority = o.appointingAuthority as never;
        b.banksAt = String(o.banksAt ?? '');
        b.operatingLocations = [...((o.operatingLocations as string[]) ?? [])];
        return b;
      }, path, id);
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
    /*
     * ⚠⚠ The givers here are `TestGiver` stand-ins parked at
     * `/platform/agent/Avatar/<name>` — this suite is about market
     * stalls, not bodies. They were read as players for free because
     * `PlayerApi.isAvatarStuff` prefix-tested the template path; it is
     * `instanceof Avatar` now (2026-10-01), so a path alone no longer
     * buys personhood. The stand-ins declare themselves rather than
     * leaning on a hole that also refused every shade.
     */
    vi.spyOn(PlayerApi, 'isAvatarStuff').mockImplementation(
      ((stuff: { getTemplatePath?(): string | null | undefined }) =>
        (stuff?.getTemplatePath?.() ?? '').startsWith(
          '/platform/agent/Avatar/',
        )) as never,
    );
    installBankingHarness();
    installV1QuantityMarshallers();
    Document.setMarshallerResolver(() => undefined, async () => undefined);
    stubSeeds();
    const reg = makeStuffAtPath(() => new ChattelRegistry(), '/platform/idea/ChattelRegistry');
    await reg.onCreate();
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
      s.setPitches(12);
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
    const ids = idsFor(1);
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
    const a = idsFor(1);
    const b = idsFor(2);
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
    expect(StuffApi.findByTemplatePath(idsFor(1).counter)).toBeUndefined();
    // ⚠ And the pitch it took before the refusal is given BACK — a
    // refusal after allocation would otherwise let a square to somebody
    // who holds no stall.
    expect(stalls.pitchOf('/platform/agent/Avatar/thin')).toBeNull();
    expect(stalls.holderOfPitch('1')).toBeNull();
  });

  it('the stall takes goods on supplier terms, and its keeper prices them with `house price`', async () => {
    const alice = await fundedGiver('/platform/agent/Avatar/alice', 20);
    expect(rejections(await stall(alice, 'rent'))).toEqual([]);
    const ids = idsFor(1);
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
    const ids = idsFor(1);
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

  it('⭐⭐ the pitch is the key, and the BOOK is what remembers whose it is', async () => {
    const alice = await fundedGiver('/platform/agent/Avatar/alice', 20);
    const bob = await fundedGiver('/platform/agent/Avatar/bob', 20);
    expect(rejections(await stall(alice, 'rent'))).toEqual([]);
    expect(rejections(await stall(bob, 'rent'))).toEqual([]);

    // Pitches go out lowest-free, and the square knows who is on each.
    expect(stalls.pitchOf('/platform/agent/Avatar/alice')).toBe('1');
    expect(stalls.pitchOf('/platform/agent/Avatar/bob')).toBe('2');
    expect(stalls.holderOfPitch('1')).toBe('/platform/agent/Avatar/alice');

    // ⭐ The counter's name says WHERE it is, not WHO holds it. Who
    // holds it is the house's appointing authority.
    const a = idsFor(1);
    expect(a.counter).toBe(`${STALL_SEED}/${STALLS.replace(/^\//, '')}/1`);
    expect(a.counter).not.toContain('alice');
    const houseA = StuffApi.findByTemplatePath(a.house) as never as {
      getAppointingAuthority(): { kind: string; path: string } | null;
    };
    expect(houseA.getAppointingAuthority()?.path).toBe('/platform/agent/Avatar/alice');
  });

  it('⭐ a second rent returns the SAME pitch — no second stall, no second let', async () => {
    const alice = await fundedGiver('/platform/agent/Avatar/alice', 20);
    expect(rejections(await stall(alice, 'rent'))).toEqual([]);
    expect(rejections(await stall(alice, 'rent'))).toEqual([]);
    expect(stalls.pitchOf('/platform/agent/Avatar/alice')).toBe('1');
    expect(Object.keys(stalls.lets)).toEqual(['1']);
    expect(
      square.getContents().filter((c) => c instanceof Stock && !(c instanceof MarketStalls)),
    ).toHaveLength(1);
  });

  it('⭐ a FULL square refuses, and charges nothing', async () => {
    stalls.setPitches(1);
    const alice = await fundedGiver('/platform/agent/Avatar/alice', 20);
    const bob = await fundedGiver('/platform/agent/Avatar/bob', 20);
    expect(rejections(await stall(alice, 'rent'))).toEqual([]);

    const bobAcct = (await BankingApi.primaryAccountIdOf('/platform/agent/Avatar/bob'))!;
    const before = BankingApi.balanceOf(bobAcct).minor;
    expect(rejections(await stall(bob, 'rent'))).toEqual(['square-full']);
    expect(BankingApi.balanceOf(bobAcct).minor).toBe(before);
    expect(stalls.pitchOf('/platform/agent/Avatar/bob')).toBeNull();
  });

  it('give-up frees the pitch, and the next renter takes it', async () => {
    stalls.setPitches(1);
    const alice = await fundedGiver('/platform/agent/Avatar/alice', 20);
    const bob = await fundedGiver('/platform/agent/Avatar/bob', 20);
    expect(rejections(await stall(alice, 'rent'))).toEqual([]);
    expect(rejections(await stall(bob, 'rent'))).toEqual(['square-full']);

    expect(rejections(await stall(alice, 'give-up'))).toEqual([]);
    expect(stalls.pitchOf('/platform/agent/Avatar/alice')).toBeNull();

    // ⭐ Lowest-free, so the given-up pitch is re-let rather than the
    // square growing a new one.
    expect(rejections(await stall(bob, 'rent'))).toEqual([]);
    expect(stalls.pitchOf('/platform/agent/Avatar/bob')).toBe('1');
  });

  it('⭐⭐ two instances of one row cannot share a pitch — the invariant FIRES now', async () => {
    // The uniqueness scan's needle is the ROW, so a second counter
    // standing up on an occupied pitch throws instead of silently
    // writing into the first keeper's record. Before 2026-10-04 the
    // stall counter was in a population the scan could not see at all.
    const alice = await fundedGiver('/platform/agent/Avatar/alice', 20);
    expect(rejections(await stall(alice, 'rent'))).toEqual([]);
    const ids = idsFor(1);

    const interloper = makeStuffAtPath(
      () => {
        const s = new Stock();
        s.stockLines = [];
        s.prices = {};
        return s;
      },
      STALL_SEED,
      `${STALL_SEED}/an-interloper`,
    );
    await expect(
      asOwner(interloper as never, () =>
        import('@saxonberg/server/mud/api/persistable').then(({ PersistableApi }) =>
          PersistableApi.restoreOrSeed(interloper as never, ids.key),
        ),
      ),
    ).rejects.toThrow(/both keyed/);
  });
});
