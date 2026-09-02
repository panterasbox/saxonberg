/**
 * The distilling pack's own suite (libations 3a + 3d): the two classes
 * compose and resolve into the pack `src/`; every shipped floor row is a
 * drawable floor product (census key, target, a home `container:` that
 * is a shipped Stock, a material the pack ships); the spawn sweep stands
 * the floor at target from the REAL rows; a `purchases` NPC is dealt the
 * house card at hire (idempotent); and one `consigns` beat carries the
 * floor stock to the cash-and-carry and lists it AS the outfit — a buyer
 * at the counter then splits to the outfit's operating account.
 *
 * The brain drives the literal verbs through `forceCommand` (the giver's own method since the OO sweep);
 * here that seam is a dispatcher onto the REAL controllers (`wallet use
 * house` → WalletController, `consign … --ask` → ConsignController, `get`
 * → the containment move the verb performs), the `HouseAccount` harness
 * shape — the parser/binder is not in the loop (controller tests skip the
 * binder); the live drive is where the typed line is proven.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join } from 'path';
import YAML from 'yaml';
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest, withRootContext } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { installBankingHarness, teardownBankingHarness } from '@saxonberg/server/mud/lib/banking/__tests__/banking-test-harness';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ModuleApi } from '@saxonberg/server/mud/api/module';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ShadowApi } from '@saxonberg/server/mud/api/shadow';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { ZoneApi } from '@saxonberg/server/mud/api/zone';
import { ResidencyApi } from '@saxonberg/server/mud/api/residency';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { CommandApi, type CommandContext } from '@saxonberg/server/mud/api/command';
import { EmploymentApi } from '@saxonberg/server/mud/api/employment';
import { ChattelApi } from '@saxonberg/server/mud/api/chattel';
import { BankingApi, Currency, Money } from '@saxonberg/server/mud/api/banking';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';
import { AppSettingKeys } from '@saxonberg/server/mud/lib/config/AppSettings';
import { Template } from '@saxonberg/server/mud/lib/stuff/Template';
import { Document } from '@saxonberg/server/mud/lib/persistence/Document';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';

let fillSeq = 0;

/**
 * Fill a bottle the way a REAL clone arrives filled — the row's
 * `interiorMaterial` + `interiorAmount` go through the hydrator, so a
 * spawned floor bottle holds its product.
 *
 * ⚠ Load-bearing, not decoration: the census counts PRODUCT, and an
 * empty vessel reports `vessel:<keyword>` however its row is authored
 * (`Bottle.getCensusKey`). A mock that hands back an empty bottle is a
 * mock of something that never happens, and it hid exactly the bug the
 * derive was added to catch — a floor that reads at target while bare.
 */
function fillLikeAClone(bottle: { setBulkMaterial: (a: string, m: never) => void; setBulkAmount: (a: string, q: Quantity<'L'>) => void; setInteriorCapacity: (q: Quantity<'L'>) => void; interiorBulk: boolean }, name: string, litres = 0.75): void {
  const material = makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setKeywords([name]);
    m.setTags(['liquid']);
    return m;
  }, `/stuff/idea/material/bulk/${name}-fill-${fillSeq++}`) as unknown as never;
  bottle.interiorBulk = true;
  bottle.setInteriorCapacity(Quantity.of(litres, 'L'));
  bottle.setBulkMaterial('interior', material);
  bottle.setBulkAmount('interior', Quantity.of(litres, 'L'));
}
import { CommandDefinition } from '@saxonberg/server/mud/lib/command/CommandDefinition';
import { CommandGiverMixin } from '@saxonberg/server/mud/lib/command/CommandGiver';
import { EmployedMixin } from '@saxonberg/server/mud/lib/employment/Employed';
import { SensorMixin } from '@saxonberg/server/mud/lib/message/Sensor';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { ContainableMixin } from '@saxonberg/server/mud/lib/spatial/Containable';
import { MobileMixin } from '@saxonberg/server/mud/lib/spatial/Mobile';
import { NamedMixin } from '@saxonberg/server/mud/lib/description/Named';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import Location from '@saxonberg/server/mud/lib/stuff/Location';
import { brain as consigns } from '@saxonberg/server/mud/lib/behavior/consigns';
import type { BrainContext } from '@saxonberg/server/mud/lib/behavior/brain';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import Stock from '@saxonberg/server/mud/platform/thing/Stock';
import BankCounter from '@saxonberg/server/mud/platform/thing/BankCounter';
import PaymentCard from '@saxonberg/server/mud/platform/thing/PaymentCard';
import Coin from '@saxonberg/server/mud/platform/thing/Coin';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import ChattelRegistry from '@saxonberg/server/mud/platform/idea/ChattelRegistry';
import BusinessEntity from '@saxonberg/server/mud/platform/idea/Business';
import WalletController from '@saxonberg/server/mud/platform/idea/cmd/banking/WalletController';
import ConsignController from '@saxonberg/server/mud/platform/idea/cmd/retail/ConsignController';
import BuyController from '@saxonberg/server/mud/platform/idea/cmd/retail/BuyController';
import SpiritBottle from '../thing/SpiritBottle';
import Still from '../thing/Still';

const ROOT = '/trade/distilling';
const CONTENT = fileURLToPath(new URL('../../content/trade/distilling/', import.meta.url));

const BANK = '/stuff/test/distilling/bank-counter';
const COUNTER = '/stuff/test/distilling/counter';
const HOST_BIZ = '/stuff/test/distilling/host-business';
const OUTFIT = '/stuff/test/distilling/outfit';
const FLOOR_STOCK = '/stuff/test/distilling/floor-stock';
const CARD = '/stuff/thing/PaymentCard';

class TestHand extends EmployedMixin(
  MobileMixin(
    SensorMixin(CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea))))),
  ),
) {
  static _mixinName = 'TestHand';
}

let seq = 0;

interface Row {
  file: string;
  path: string;
  class: string;
  data: Record<string, unknown>;
}

function rows(dir: string): Row[] {
  const out: Row[] = [];
  for (const f of readdirSync(join(CONTENT, dir)).sort()) {
    if (!f.endsWith('.yaml')) continue;
    const raw = YAML.parse(readFileSync(join(CONTENT, dir, f), 'utf8')) as {
      class: string;
      data: Record<string, unknown>;
    };
    out.push({ file: f, path: `${ROOT}/${dir}/${f.replace(/\.yaml$/, '')}`, class: raw.class, data: raw.data });
  }
  return out;
}

/** The trade's floor rows, the corpo-owned yards' included (Veshko's is a locality under `location/`; Hollis's rows are flat). */
const THING_DIRS = ['thing', 'location/veshko-yard/thing'];
// A `vessel:` census key is the VESSEL faucet (empty glass at target —
// an empty is never product); the floor-product assertions skip it.
const floorRows = (): Row[] =>
  THING_DIRS.flatMap(rows).filter(
    (r) =>
      r.class === `${ROOT}/thing/SpiritBottle` &&
      !String(r.data.censusKey ?? '').startsWith('vessel:'),
  );

function asPrincipal<T>(who: Stuff, fn: () => Promise<T>): Promise<T> {
  return withRootContext(null, 'distilling.test', () => {
    ExecutionContextApi.tagActingAuthor(who);
    return fn();
  });
}

function ctx(giver: Stuff, loc: Stuff, source: Stuff | null, text: string): CommandContext {
  const verb = text.split(' ')[0] ?? text;
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: loc as never,
    commandSource: (source ?? undefined) as never,
    commandText: text,
    executionId: 't',
    commandId: 't',
    verb,
    command: CommandDefinition.fromYaml(`verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`, '<test>'),
  });
}

function rejections(c: CommandContext): string[] {
  return c
    .getNotes()
    .filter((n) => n.kind === 'controller-rejected')
    .map((n) => (n as { reason: string }).reason);
}

describe('trade-distilling — the classes', () => {
  beforeEach(() => installV1QuantityMarshallers());

  it('SpiritBottle is a Bottle with the spirits preset; Still is a furnace that is also a tool', () => {
    const b = makeStuff(() => new SpiritBottle());
    stampTemplatePathForTest(b, `/obj/test/spirit-${seq++}`);
    expect(MixinApi.isChattel(b)).toBe(true);
    expect(MixinApi.isCirculating(b)).toBe(true);
    expect(MixinApi.isSealable(b)).toBe(true);
    expect(b.getClosure()).toBe('sealed');
    expect(b.getInteriorCapacity()?.value).toBe(0.75);
    expect(b.getKeywords()).toEqual(expect.arrayContaining(['bottle', 'spirit']));

    const s = makeStuff(() => new Still());
    stampTemplatePathForTest(s, `/obj/test/still-${seq++}`);
    expect(MixinApi.isTool(s)).toBe(true);
    expect(MixinApi.isThermal(s)).toBe(true);
    expect(s.getCapabilities()).toEqual(expect.arrayContaining(['still']));
  });

  it('the classes are stamped with their /trade/distilling module ids (the loader reaches the pack src/)', () => {
    expect(ModuleApi.lookup(SpiritBottle)).toBe(`${ROOT}/thing/SpiritBottle`);
    expect(ModuleApi.lookup(Still)).toBe(`${ROOT}/thing/Still`);
    expect(StuffApi.resolveClassFile(`${ROOT}/thing/SpiritBottle`).origin).toMatchObject({ root: ROOT });
  });
});

describe('trade-distilling — the floor rows', () => {
  it('every floor bottle is a drawable floor product homed in a shipped Stock, over a shipped material', () => {
    const stocks = new Set(THING_DIRS.flatMap(rows).filter((r) => r.class === '/platform/thing/Stock').map((r) => r.path));
    const materials = new Set(rows('idea/material').map((r) => r.path));
    const floor = floorRows();
    // ⭐ The roster, by producer: Veshko makes the six unbranded rail
    // pours AND Volk (same still, same liquid, one carries a mark);
    // Hollis puts its own mark on Veshko's whiskey and rum and distils
    // nothing; Crowsfoot is the small house — its gin plus the four
    // botanical specialties the menu cannot do without.
    expect(floor.length).toBe(7 + 2 + 5);
    for (const r of floor) {
      expect(typeof r.data.censusKey, r.file).toBe('string');
      expect(typeof r.data.regionTarget, r.file).toBe('number');
      expect(stocks.has(r.data.container as string), `${r.file} container`).toBe(true);
      expect(materials.has(r.data.interiorMaterial as string), `${r.file} material`).toBe(true);
    }
    // (The counter itself moved to the `distribution` pack —
    // fermentation D10; its brokerage shape is asserted there-adjacent
    // in the kernel's restocks/annex suites.)
  });

  it('every hand names the COUNTER as its host shelf and its own stock (the annex names the host)', () => {
    for (const hand of rows('agent').filter((r) => r.file.endsWith('-hand.yaml'))) {
      const spec = (hand.data.behaviors as Array<{ brain: string; config: Record<string, unknown> }>).find(
        (b) => b.brain === '/lib/behavior/consigns',
      );
      expect(spec, hand.file).toBeDefined();
      expect(spec!.config.shelf).toBe('/trade/distribution/thing/counter');
      expect(String(spec!.config.stock).startsWith(`${ROOT}/thing/`)).toBe(true);
      // Every floor row homed in this hand's stock has an ask.
      const asks = spec!.config.ask as Record<string, number>;
      for (const r of floorRows().filter((r) => r.data.container === spec!.config.stock)) {
        expect(asks[r.data.censusKey as string], `${hand.file} asks ${r.file}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('trade-distilling — the sweep stands the floor at target from the shipped rows', () => {
  let stock: Stock;
  beforeEach(() => {
    installV1QuantityMarshallers();
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
    const settings: Record<string, string> = {
      [AppSettingKeys.residencySpawnMode]: 'enforce',
      [AppSettingKeys.residencySpawnPerRegionCap]: '256',
    };
    vi.spyOn(AppApi, 'setting').mockImplementation((key: string) => settings[key] ?? '');
    // The floor outfit's Stock — a Vessel, not a room: the rows' home.
    stock = makeStuff(() => {
      const st = new Stock();
      st.stockLines = [];
      return st;
    });
    stampTemplatePathForTest(stock, `${ROOT}/thing/floor-stock`);
    vi.spyOn(ZoneApi, 'resolveZoneForPath').mockResolvedValue({
      getTemplatePath: () => `${ROOT}/location/floor`,
      lookupField: async () => undefined,
    } as never);
    vi.spyOn(StuffApi, 'loadClassByPath').mockResolvedValue(SpiritBottle);
    // The shipped rows, targets scaled to 2 each: the arithmetic of the
    // loop is `SpawnBatch`'s; here the point is that THESE rows draw. (A
    // containment move is O(room contents) in the kernel today, so the
    // authored 12-per-key floor would cost this suite ~30 s.)
    const floor = floorRows()
      .filter((r) => r.data.container === `${ROOT}/thing/floor-stock`)
      .map((r) => ({ ...r, data: { ...r.data, regionTarget: 2 } as Record<string, unknown> }));
    vi.spyOn(Template, 'findWhereDataHas').mockResolvedValue(
      floor.map((r) => ({ path: r.path, class: r.class, data: r.data })) as never,
    );
    vi.spyOn(StuffApi, 'clone').mockImplementation(async (path: string) => {
      const row = floor.find((r) => r.path === path)!;
      const b = makeStuff(() => new SpiritBottle());
      stampTemplatePathForTest(b, path);
      b.setCensusKey(row.data.censusKey as string);
      b.regionTarget = row.data.regionTarget as number;
      // A real clone arrives FILLED (the row authors interiorMaterial +
      // interiorAmount); an empty one is not product and would not count.
      fillLikeAClone(b as never, String(row.data.primaryKeyword ?? 'spirit'));
      ContainmentApi.move(b as never, stock as never);
      return b as unknown as Stuff;
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('one sweep places regionTarget of every generic; the next places nothing', async () => {
    const floor = floorRows().filter((r) => r.data.container === `${ROOT}/thing/floor-stock`);
    const want = floor.length * 2;
    const first = await ResidencyApi.spawnNow();
    expect(first.placed).toBe(want);
    expect(stock.getContents().length).toBe(want);
    const second = await ResidencyApi.spawnNow();
    expect(second.placed).toBe(0);
  });
});

describe('trade-distilling — the outfit consigns as itself, and the house card at hire', () => {
  let floorRoom: Location;
  let counterRoom: Location;
  let counter: Stock;
  let floorStock: Stock;
  let outfit: BusinessEntity;
  let outfitAccount: string;
  let hostAccount: string;

  function bottle(key: string, kw: string): SpiritBottle {
    const b = makeStuffAtPath(() => new SpiritBottle(), `${ROOT}/thing/${kw}`);
    b.setKeywords([kw, 'bottle', 'spirit']);
    b.setPrimaryKeyword(kw);
    b.setCensusKey(key);
    fillLikeAClone(b as never, kw);
    return b;
  }

  beforeEach(async () => {
    installBankingHarness();
    installV1QuantityMarshallers();
    Document.setMarshallerResolver(
      () => undefined,
      async () => undefined,
    );
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      if (path === CARD) return makeStuffAtPath(() => new PaymentCard(), path);
      // `issueCash` mints coin for the buyer's float.
      const c = makeStuffAtPath(() => {
        const coin = new Coin();
        coin.currency = 'zorkmid';
        coin.denomination = 1;
        return coin;
      }, path);
      c.setMass(Quantity.of(0.008, 'kg'));
      return c;
    }) as unknown as typeof StuffApi.clone);
    const reg = makeStuffAtPath(() => new ChattelRegistry(), '/platform/idea/ChattelRegistry');
    await reg.postRegister();
    makeStuffAtPath(() => {
      const b = new BankCounter();
      b.setCorpoKey('goodkin');
      return b;
    }, BANK);

    floorRoom = makeStuffAtPath(() => new Location(), '/stuff/test/distilling/floor');
    counterRoom = makeStuffAtPath(() => new Location(), '/stuff/test/distilling/cash-and-carry');
    counter = makeStuffAtPath(() => {
      const s = new Stock();
      s.stockLines = [];
      s.discipline = 'scrum';
      s.attendDurationMs = 0;
      s.staffingPolicy = 'self-service';
      s.serverPositionKeys = [];
      s.setKeywords(['counter']);
      return s;
    }, COUNTER);
    ContainmentApi.move(counter as never, counterRoom as never);
    floorStock = makeStuffAtPath(() => {
      const s = new Stock();
      s.stockLines = [];
      s.setKeywords(['stock']);
      return s;
    }, FLOOR_STOCK);
    ContainmentApi.move(floorStock as never, floorRoom as never);

    const host = makeStuffAtPath(() => new BusinessEntity(), HOST_BIZ);
    host.proprietorPath = '';
    host.positions = [{ key: 'clerk', label: 'clerking', wageRate: 5, confers: [] }];
    host.operatingLocations = [COUNTER, '/stuff/test/distilling/cash-and-carry'];
    host.banksAt = BankingApi.defaultCustodianBank();
    hostAccount = await EmploymentApi.operatingAccountOf(host);

    outfit = makeStuffAtPath(() => new BusinessEntity(), OUTFIT);
    outfit.proprietorPath = '';
    outfit.positions = [{ key: 'hand', label: 'running the floor', wageRate: 3, confers: [], purchases: true }];
    outfit.operatingLocations = ['/stuff/test/distilling/floor', FLOOR_STOCK];
    outfit.banksAt = BankingApi.defaultCustodianBank();
    outfitAccount = await EmploymentApi.operatingAccountOf(outfit);
  });
  afterEach(() => {
    teardownBankingHarness();
    vi.restoreAllMocks();
  });

  function makeHand(): TestHand {
    const hand = makeStuffAtPath(() => new TestHand(), `/stuff/test/distilling/hand-${seq++}`);
    hand.setName('Orrin');
    ContainmentApi.move(hand as never, floorRoom as never);
    return hand;
  }

  /** The literal verbs, dispatched onto the real controllers as the hand. */
  function installDispatcher(hand: TestHand): string[] {
    const lines: string[] = [];
    // Dispatch is `hand.forceCommand(text)` since the OO sweep, so the
    // hand is the interception seam.
    vi.spyOn(
      hand as unknown as { forceCommand(text: string): Promise<void> },
      'forceCommand',
    ).mockImplementation(async (text: string) => {
      const giver = hand;
      // A teleport auto-senses on arrival (Mobile's own forced `sense`) —
      // not the brain's line; dropped from the record.
      if (text === 'sense') return;
      lines.push(text);
      const here = (giver as unknown as TestHand).getContainer() as Location;
      const [verb, ...rest] = text.split(' ');
      if (verb === 'get') {
        // `get 1 <kw>` — the quantity form the beat uses so a lift takes
        // ONE of a keyword rather than every match on the floor (see
        // `lib/behavior/consigns.ts`). The real verb takes a leading
        // count; the stub has to as well, or the lift silently matches
        // nothing and the beat stops at the first good.
        const rst = /^\d+$/.test(rest[0] ?? '') ? rest.slice(1) : rest;
        const kw = rst[0]!;
        const stock = here.getContents().find((c): c is Stock => c instanceof Stock);
        const item = stock?.getContents().find((c) => MixinApi.isPerceptible(c) && c.hasKeyword(kw));
        if (item) ContainmentApi.move(item as never, giver as never);
        return;
      }
      if (verb === 'wallet') {
        const c = ctx(giver, here, null, text);
        await asPrincipal(giver, () =>
          makeStuff(() => new WalletController()).execute({ subcommand: 'use', corpo: 'house' } as never, c),
        );
        expect(rejections(c)).toEqual([]);
        return;
      }
      if (verb === 'consign') {
        const thing = rest[0]!;
        const ask = rest[rest.indexOf('--ask') + 1]!;
        const c = ctx(giver, here, counter, text);
        await asPrincipal(giver, () => makeStuff(() => new ConsignController()).execute({ thing, ask }, c));
        expect(rejections(c)).toEqual([]);
        return;
      }
      throw new Error(`unexpected verb ${text}`);
    });
    void hand;
    return lines;
  }

  it('hire into a purchases position deals the house card, once', async () => {
    const hand = makeHand();
    await EmploymentApi.hire(outfit, hand, 'hand');
    const cards = () => hand.getContents().filter((c) => MixinApi.isCredentialWallet(c));
    expect(cards().length).toBe(1);
    const pay = (cards()[0] as unknown as PaymentCard).getCredential('payment');
    expect(pay?.hasAccount(outfitAccount)).toBe(true);
    expect(pay?.getActiveAccount()).toBe(outfitAccount);
    // Idempotent: a second hire (or the roster re-materializing) deals nothing.
    await EmploymentApi.hire(outfit, hand, 'hand');
    expect(cards().length).toBe(1);
  });

  it('a hand that has lost its card (it persists with the hand; this is the one-off) is dealt one on the next roster tick', async () => {
    const hand = makeHand();
    await EmploymentApi.hire(outfit, hand, 'hand');
    const cards = () => hand.getContents().filter((c) => MixinApi.isCredentialWallet(c));
    expect(cards().length).toBe(1);
    // The card left the hand somehow (a theft, a drop) — the roster deals another.
    ContainmentApi.move(cards()[0] as never, floorRoom as never);
    expect(cards().length).toBe(0);
    outfit.rosterSlots = [
      { positionKey: 'hand', assignee: hand.getTemplatePath()!, schedule: [{ days: [0, 1, 2, 3, 4, 5, 6], hours: [0, 24] }] },
    ] as never;
    EmploymentApi.tickRoster();
    await new Promise((r) => setTimeout(r, 50));
    expect(cards().length).toBe(1);
  });

  it('a lift that declines (too heavy) stops the beat — the rest of the floor waits for the next one', async () => {
    const hand = makeHand();
    await EmploymentApi.hire(outfit, hand, 'hand');
    const gin = bottle('spirit:gin', 'gin');
    const vodka = bottle('spirit:vodka', 'vodka');
    ContainmentApi.move(gin as never, floorStock as never);
    ContainmentApi.move(vodka as never, floorStock as never);
    const lines: string[] = [];
    // `get gin` declines (too-heavy-to-lift): the bottle stays on the floor.
    vi.spyOn(
      hand as unknown as { forceCommand(text: string): Promise<void> },
      'forceCommand',
    ).mockImplementation(async (text: string) => {
      if (text === 'sense') return;
      lines.push(text);
      if (text === 'get vodka') ContainmentApi.move(vodka as never, hand as never);
    });
    const brainCtx = {
      host: hand,
      config: { stock: FLOOR_STOCK, shelf: COUNTER, defaultAsk: 10, batch: 6 },
      state: {},
      trigger: { source: 'cadence', raw: 'cadence:90s' },
      say: () => undefined,
      emote: async () => undefined,
      emoteFree: () => undefined,
    } as unknown as BrainContext;
    await consigns.act(brainCtx);
    const gets = lines.filter((l) => l.startsWith('get '));
    expect(gets.length).toBe(1); // stopped at the first decline, whichever bottle came first
    expect(gin.getContainer()).toBe(floorStock);
    if (gets[0] === 'get vodka') expect(lines).toContain('consign vodka --ask 10');
  });

  it('the hand consigns only up to its outfit\'s headroom under the listing cap — never at an over-cap decline', async () => {
    const settings: Record<string, string> = { 'retail.consignment.listingCap': '1' };
    vi.spyOn(AppApi, 'setting').mockImplementation((key: string) => settings[key] ?? '');
    const hand = makeHand();
    await EmploymentApi.hire(outfit, hand, 'hand');
    const gin = bottle('spirit:gin', 'gin');
    const vodka = bottle('spirit:vodka', 'vodka');
    ContainmentApi.move(gin as never, floorStock as never);
    ContainmentApi.move(vodka as never, floorStock as never);
    const lines = installDispatcher(hand);
    const brainCtx = {
      host: hand,
      config: { stock: FLOOR_STOCK, shelf: COUNTER, defaultAsk: 10, batch: 6 },
      state: {},
      trigger: { source: 'cadence', raw: 'cadence:90s' },
      say: () => undefined,
      emote: async () => undefined,
      emoteFree: () => undefined,
    } as unknown as BrainContext;
    await consigns.act(brainCtx);
    // One lifted, one listed; the second bottle never left the floor.
    expect(lines).toEqual(['get 1 gin', 'wallet use house', 'consign gin --ask 10']);
    expect(vodka.getContainer()).toBe(floorStock);
    expect(counter.activeListingCount(OUTFIT)).toBe(1);
    // The cap is full: the next beat lifts nothing and issues no verb.
    lines.length = 0;
    await consigns.act(brainCtx);
    expect(lines).toEqual([]);
    expect(vodka.getContainer()).toBe(floorStock);
  });

  it('one beat: the floor stock is carried to the counter and listed AS the outfit; a buy splits to its account', async () => {
    const hand = makeHand();
    await EmploymentApi.hire(outfit, hand, 'hand');
    const gin = bottle('spirit:gin', 'gin');
    const vodka = bottle('spirit:vodka', 'vodka');
    ContainmentApi.move(gin as never, floorStock as never);
    ContainmentApi.move(vodka as never, floorStock as never);
    const lines = installDispatcher(hand);

    const brainCtx = {
      host: hand,
      config: { stock: FLOOR_STOCK, shelf: COUNTER, ask: { 'spirit:gin': 14 }, defaultAsk: 10, batch: 6 },
      state: {},
      trigger: { source: 'cadence', raw: 'cadence:90s' },
      say: () => undefined,
      emote: async () => undefined,
      emoteFree: () => undefined,
    } as unknown as BrainContext;
    await consigns.act(brainCtx);

    // The verbs, in order: two gets, the wallet once, two consigns at the asks.
    expect(lines).toEqual(['get 1 gin', 'get 1 vodka', 'wallet use house', 'consign gin --ask 14', 'consign vodka --ask 10']);
    // Custody moved to the counter; the listing names the OUTFIT as consignor;
    // the good is stamped to the outfit (an organization, never the hand).
    expect(gin.getContainer()).toBe(counter);
    expect(counter.listingFor(gin.getChattelId())?.consignorKey).toBe(OUTFIT);
    expect(counter.listingFor(vodka.getChattelId())?.askMinor).toBe(10);
    expect(await gin.chattelOwner()).toEqual({ kind: 'organization', templatePath: OUTFIT });
    // The hand went home.
    expect(hand.getContainer()).toBe(floorRoom);
    // A second beat with the floor empty does nothing.
    lines.length = 0;
    await consigns.act(brainCtx);
    expect(lines).toEqual([]);

    // A funded buyer at the counter: the ask splits to the outfit's account.
    const buyer = makeStuffAtPath(() => new TestHand(), '/platform/agent/Avatar/pat');
    buyer.setName('Pat');
    ContainmentApi.move(buyer as never, counterRoom as never);
    const card = makeStuff(() => new PaymentCard());
    ContainmentApi.move(card as never, buyer as never);
    await asPrincipal(buyer, () => BankingApi.openAccount('goodkin', 'goodkin', Currency.compact()));
    const bank = StuffApi.findByTemplatePath<BankCounter>(BANK)!;
    const cash = await asPrincipal(buyer, () => BankingApi.issueCash(buyer as never, Money.of(50, Currency.compact())));
    await asPrincipal(buyer, () => BankingApi.deposit(bank, cash as never));

    const before = BankingApi.balanceOf(outfitAccount).minor;
    const c = ctx(buyer, counterRoom, counter, 'buy gin');
    await asPrincipal(buyer, () => makeStuff(() => new BuyController()).execute({ thing: 'gin' }, c));
    expect(rejections(c)).toEqual([]);
    expect(gin.getContainer()).toBe(buyer);
    expect(await gin.chattelOwner()).toEqual({ kind: 'player', templatePath: '/platform/agent/Avatar/pat' });
    const commission = Math.round(14 * 0.15);
    expect(BankingApi.balanceOf(outfitAccount).minor - before).toBe(14 - commission);
    expect(BankingApi.balanceOf(hostAccount).minor).toBeGreaterThan(0);
    expect(BankingApi.reconcile(Currency.compact()).balanced).toBe(true);
  });
});
