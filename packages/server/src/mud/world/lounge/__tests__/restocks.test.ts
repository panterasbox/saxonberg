/**
 * The keeper's back loop — libations D7, decision (h). Proves the
 * `restocks` brain over the lounge's own shape: an empty rail against a
 * par sheet, a funded house account, a distributor's counter stocked by
 * an outfit's consignment. After one beat the rail holds bottles stamped
 * to the BAR (an organization, never Mara), the counter lost them, the
 * house account fell, the outfit's rose, and `house pnl` carries the
 * purchase as `cogs`. A second beat buys nothing (the sheet is met). A
 * house that cannot pay stops at the first decline. The bussing beat
 * collects, washes and racks a soiled glass.
 *
 * The brain drives the literal verbs through `CommandApi.forceCommand`;
 * here that seam is a dispatcher onto the REAL `wallet` / `buy` / `consign`
 * controllers (the distilling pack's harness), with the physical verbs
 * (`get` / `put` / `wash`) as their containment effect. `shiftStateOf` is
 * stubbed on-shift the way the offstage suite does.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { brain as restocks } from '../../../lib/behavior/restocks';
import type { BrainContext } from '../../../lib/behavior/brain';
import BuyController from '../../../platform/idea/cmd/retail/BuyController';
import ConsignController from '../../../platform/idea/cmd/retail/ConsignController';
import WalletController from '../../../platform/idea/cmd/banking/WalletController';
import Stock from '../../../platform/thing/Stock';
import Bottle from '../../../platform/thing/Bottle';
import CraftedDrink from '../../../platform/thing/CraftedDrink';
import Coin from '../../../platform/thing/Coin';
import BankCounter from '../../../platform/thing/BankCounter';
import PaymentCard from '../../../platform/thing/PaymentCard';
import ChattelRegistry from '../../../platform/idea/ChattelRegistry';
import BusinessEntity from '../../../platform/idea/Business';
import Material from '../../../lib/material/Material';
import { EmploymentApi } from '../../../api/employment';
import { ChattelApi } from '../../../api/chattel';
import { Currency, BankingApi, Money } from '../../../api/banking';
import { ContainmentApi } from '../../../api/containment';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { ExecutionContextApi } from '../../../api/execution-context';
import { CommandApi, type CommandContext } from '../../../api/command';
import { Quantity } from '../../../lib/quantity';
import { Document } from '../../../lib/persistence/Document';
import { CommandDefinition } from '../../../lib/command/CommandDefinition';
import { CommandGiverMixin } from '../../../lib/command/CommandGiver';
import { EmployedMixin } from '../../../lib/employment/Employed';
import { SensorMixin } from '../../../lib/message/Sensor';
import { ContainerMixin } from '../../../lib/spatial/Container';
import Thing from '../../../lib/stuff/Thing';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { MobileMixin } from '../../../lib/spatial/Mobile';
import { NamedMixin } from '../../../lib/description/Named';
import { Idea } from '../../../lib/stuff/Idea';
import Location from '../../../lib/stuff/Location';
import type { Stuff } from '../../../lib/stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import {
  installBankingHarness,
  teardownBankingHarness,
} from '../../../lib/banking/__tests__/banking-test-harness';

const BANK = '/stuff/test/lounge/bank-counter';
const BAR = '/world/lounge/location/bar';
const BAR_BIZ = '/world/lounge/idea/business';
const SHELF = '/trade/hospitality/thing/back-bar';
const RACK = '/trade/hospitality/thing/glass-rack';
const CASH_AND_CARRY = '/trade/distilling/location/cash-and-carry';
const COUNTER = '/trade/distilling/thing/counter';
const DISTILLING = '/trade/distilling/idea/business';
const OUTFIT = '/trade/distilling/location/veshko-yard/idea/outfit';
const FLOOR = '/trade/distilling/location/veshko-yard/location/distillery';
const GIN = '/trade/distilling/idea/material/gin';
const CARD = '/stuff/thing/PaymentCard';

class Hand extends EmployedMixin(
  MobileMixin(SensorMixin(CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))))),
) {
  static _mixinName = 'RestockHand';
}

let seq = 0;

function asPrincipal<T>(who: Stuff, fn: () => Promise<T>): Promise<T> {
  return withRootContext(null, 'restocks.test', () => {
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

function business(path: string, positions: BusinessEntity['positions'], locations: string[]): BusinessEntity {
  const b = makeStuffAtPath(() => new BusinessEntity(), path);
  b.proprietorPath = '';
  b.positions = positions;
  b.operatingLocations = locations;
  b.banksAt = BankingApi.defaultCustodianBank();
  return b;
}

function stock(path: string, kw: string): Stock {
  return makeStuffAtPath(() => {
    const s = new Stock();
    s.stockLines = [];
    s.discipline = 'scrum';
    s.attendDurationMs = 0;
    s.staffingPolicy = 'self-service';
    s.serverPositionKeys = [];
    s.setKeywords([kw]);
    return s;
  }, path);
}

/**
 * A synthetic open container — the back-bar shelf and the glass rack.
 * The brain puts things on/in them and the gather walk descends them
 * because they are open `Container`s, not because of any class the
 * kernel knows: hospitality's `GlassRack` ships in its own pack.
 */
class TestRack extends ContainerMixin(Thing) {}

describe("the keeper's back loop — Mara restocks Dave's Bar from the cash-and-carry", () => {
  let bar: Location;
  let floor: Location;
  let cashAndCarry: Location;
  let counter: Stock;
  let floorStock: Stock;
  let shelf: TestRack;
  let rack: TestRack;
  let barBiz: BusinessEntity;
  let outfit: BusinessEntity;
  let gin: Material;
  let barAccount: string;
  let outfitAccount: string;
  let mara: Hand;

  function ginBottle(): Bottle {
    const b = makeStuffAtPath(() => new Bottle(), `/trade/distilling/thing/gin`);
    b.setKeywords(['gin', 'bottle', 'spirit']);
    b.setPrimaryKeyword('gin');
    b.setCensusKey('spirit:gin');
    b.setBulkMaterial('interior', gin);
    b.setBulkAmount('interior', Quantity.of(0.75, 'L'));
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
      const c = makeStuffAtPath(() => {
        const coin = new Coin();
        coin.currency = 'zorkmid';
        coin.denomination = 1;
        return coin;
      }, path);
      c.setMass(Quantity.of(0.008, 'kg'));
      return c;
    }) as unknown as typeof StuffApi.clone);
    vi.spyOn(EmploymentApi, 'shiftStateOf').mockReturnValue('on-shift');
    const reg = makeStuffAtPath(() => new ChattelRegistry(), '/platform/idea/ChattelRegistry');
    await reg.postRegister();
    makeStuffAtPath(() => {
      const b = new BankCounter();
      b.setCorpoKey('goodkin');
      return b;
    }, BANK);

    gin = makeStuffAtPath(() => {
      const m = new Material();
      m.setName('gin');
      m.setKeywords(['gin']);
      m.setTags(['spirit', 'gin']);
      m.setDensity(Quantity.of(940, 'kg/m³'));
      return m;
    }, GIN) as unknown as Material;

    bar = makeStuffAtPath(() => new Location(), BAR);
    floor = makeStuffAtPath(() => new Location(), FLOOR);
    cashAndCarry = makeStuffAtPath(() => new Location(), CASH_AND_CARRY);
    shelf = makeStuffAtPath(() => new TestRack(), SHELF);
    shelf.setKeywords(['back-bar', 'shelf']);
    shelf.setPrimaryKeyword('back-bar');
    ContainmentApi.move(shelf as never, bar as never);
    rack = makeStuffAtPath(() => new TestRack(), RACK);
    rack.setKeywords(['rack', 'glass-rack']);
    rack.setPrimaryKeyword('rack');
    ContainmentApi.move(rack as never, bar as never);
    counter = stock(COUNTER, 'counter');
    ContainmentApi.move(counter as never, cashAndCarry as never);
    floorStock = stock('/trade/distilling/location/veshko-yard/thing/stock', 'stock');
    ContainmentApi.move(floorStock as never, floor as never);

    business(DISTILLING, [{ key: 'clerk', label: 'clerking', wageRate: 5, confers: [] }], [CASH_AND_CARRY, COUNTER]);
    outfit = business(OUTFIT, [{ key: 'hand', label: 'running the floor', wageRate: 3, confers: [], purchases: true }], [FLOOR]);
    outfitAccount = await EmploymentApi.operatingAccountOf(outfit);
    barBiz = business(
      BAR_BIZ,
      [
        { key: 'bartender', label: 'tending bar', wageRate: 4, confers: [] },
        { key: 'keeper', label: 'keeping the bar', wageRate: 0, confers: [], purchases: true },
      ],
      [BAR],
    );
    barBiz.setParLine({ category: 'gin', level: 1.5, unit: 'L', supplier: DISTILLING });
    barBiz.setParLine({ category: 'coupe', level: 2, unit: 'count' });
    barAccount = await EmploymentApi.operatingAccountOf(barBiz);

    mara = makeStuffAtPath(() => new Hand(), `/world/lounge/agent/mara-${seq++}`);
    mara.setName('Mara');
    ContainmentApi.move(mara as never, bar as never);
    await EmploymentApi.hire(barBiz, mara, 'keeper');
  });
  afterEach(() => {
    teardownBankingHarness();
    vi.restoreAllMocks();
  });

  /** An outfit hand consigns `n` gin bottles at the counter, as the outfit. */
  async function consignGin(n: number, ask: number): Promise<Bottle[]> {
    const hand = makeStuffAtPath(() => new Hand(), `/trade/distilling/location/veshko-yard/agent/hand-${seq++}`);
    hand.setName('Orrin');
    ContainmentApi.move(hand as never, cashAndCarry as never);
    await EmploymentApi.hire(outfit, hand, 'hand');
    const c = ctx(hand, cashAndCarry, null, 'wallet use house');
    await asPrincipal(hand, () => makeStuff(() => new WalletController()).execute({ subcommand: 'use', corpo: 'house' } as never, c));
    expect(rejections(c)).toEqual([]);
    const out: Bottle[] = [];
    for (let i = 0; i < n; i++) {
      const b = ginBottle();
      ContainmentApi.move(b as never, hand as never);
      const cc = ctx(hand, cashAndCarry, counter, `consign gin --ask ${ask}`);
      await asPrincipal(hand, () => makeStuff(() => new ConsignController()).execute({ thing: 'gin', ask: String(ask) }, cc));
      expect(rejections(cc)).toEqual([]);
      out.push(b);
    }
    return out;
  }

  /** The literal verbs, dispatched onto the real controllers as the keeper. */
  function installDispatcher(): string[] {
    const lines: string[] = [];
    vi.spyOn(CommandApi, 'forceCommand').mockImplementation(async (giver, text) => {
      if (text === 'sense') return; // the teleport's own arrival sense
      lines.push(text);
      const who = giver as unknown as Hand;
      const here = who.getContainer() as Location;
      const [verb, ...rest] = text.split(' ');
      const find = (kw: string, from: Stuff[]): Stuff | undefined =>
        from.find((c) => MixinApi.isPerceptible(c) && c.hasKeyword(kw));
      if (verb === 'wallet') {
        const c = ctx(who, here, null, text);
        await asPrincipal(who, () => makeStuff(() => new WalletController()).execute({ subcommand: 'use', corpo: 'house' } as never, c));
        expect(rejections(c)).toEqual([]);
        return;
      }
      if (verb === 'buy') {
        const c = ctx(who, here, counter, text);
        await asPrincipal(who, () => makeStuff(() => new BuyController()).execute({ thing: rest[0]! }, c));
        return; // a decline leaves the good on the counter — the brain reads that
      }
      if (verb === 'put') {
        const item = find(rest[0]!, who.getContents() as Stuff[]);
        const target = find(rest[2]!, here.getContents() as Stuff[]);
        if (item && target && MixinApi.isContainer(target)) ContainmentApi.move(item as never, target as never);
        return;
      }
      if (verb === 'get') {
        const item = find(rest[0]!, here.getContents() as Stuff[]);
        if (item) ContainmentApi.move(item as never, who as never);
        return;
      }
      if (verb === 'wash') {
        const item = find(rest[0]!, who.getContents() as Stuff[]) as CraftedDrink | undefined;
        if (item) (item as unknown as { soiled: boolean }).soiled = false;
        return;
      }
      throw new Error(`unexpected verb ${text}`);
    });
    return lines;
  }

  function brainCtx(): BrainContext {
    return {
      host: mara,
      config: { shelf: SHELF, rack: RACK },
      state: {},
      trigger: { source: 'cadence', raw: 'cadence:10m' },
      say: () => undefined,
      emote: async () => undefined,
      emoteFree: () => undefined,
    } as unknown as BrainContext;
  }

  it('one beat with a funded house: the rail fills with bottles owned by the BAR, the money moves, pnl shows cogs; the next beat buys nothing', async () => {
    await BankingApi.float(barAccount, Money.of(200, Currency.compact()));
    const bottles = await consignGin(3, 14);
    const lines = installDispatcher();
    const outfitBefore = BankingApi.balanceOf(outfitAccount).minor;

    const c = brainCtx();
    await restocks.act(c);

    // Two bottles cover 1.5 L; each bought, each shelved. Mara came home.
    expect(lines).toEqual(['wallet use house', 'buy gin', 'buy gin', 'put gin on back-bar', 'put gin on back-bar']);
    expect(mara.getContainer()).toBe(bar);
    const onShelf = shelf.getContents().filter((b) => bottles.includes(b as Bottle));
    expect(onShelf.length).toBe(2);
    for (const b of onShelf) {
      expect(await ChattelApi.ownerOf(b)).toEqual({ kind: 'organization', templatePath: BAR_BIZ });
    }
    expect(counter.getContents().filter((b) => bottles.includes(b as Bottle)).length).toBe(1);
    // The house paid; the outfit was paid (less the distributor's cut).
    expect(BankingApi.balanceOf(barAccount).minor).toBe(200 - 28);
    expect(BankingApi.balanceOf(outfitAccount).minor - outfitBefore).toBe(2 * (14 - Math.round(14 * 0.15)));
    expect(BankingApi.reconcile(Currency.compact()).balanced).toBe(true);
    // `house pnl` at the bar: the purchase reads as cost of goods.
    const pnl = await BankingApi.profitAndLoss(barAccount);
    expect(pnl.lines.cogs).toBe(-28);
    expect(pnl.lines.sales).toBeUndefined();
    // The sheet is met; the second beat buys nothing.
    expect(EmploymentApi.stockSheetFor(mara, barBiz).find((l) => l.line.category === 'gin')?.shortfall).toBe(0);
    lines.length = 0;
    await restocks.act(c);
    expect(lines).toEqual([]);
  });

  it('a house that cannot pay stops at the first decline — the sheet keeps saying so', async () => {
    await BankingApi.float(barAccount, Money.of(10, Currency.compact()));
    await consignGin(2, 14);
    const lines = installDispatcher();
    await restocks.act(brainCtx());
    expect(lines).toEqual(['wallet use house', 'buy gin']);
    expect(shelf.getContents().length).toBe(0);
    expect(BankingApi.balanceOf(barAccount).minor).toBe(10);
    expect(EmploymentApi.stockSheetFor(mara, barBiz).find((l) => l.line.category === 'gin')?.shortfall).toBe(1.5);
  });

  it('the bussing beat: a soiled, empty glass loose in the bar is collected, washed and racked', async () => {
    barBiz.removeParLine('gin'); // nothing to buy this beat — only the glass line
    const dirty = makeStuffAtPath(() => new CraftedDrink(), '/trade/hospitality/thing/coupe');
    dirty.interiorBulk = true;
    dirty.setKeywords(['coupe', 'glass']);
    dirty.setPrimaryKeyword('coupe');
    dirty.setCategory('coupe');
    (dirty as unknown as { soiled: boolean }).soiled = true;
    ContainmentApi.move(dirty as never, bar as never);
    const clean = makeStuffAtPath(() => new CraftedDrink(), '/trade/hospitality/thing/coupe');
    clean.interiorBulk = true;
    clean.setKeywords(['coupe', 'glass']);
    clean.setCategory('coupe');
    ContainmentApi.move(clean as never, rack as never);
    const lines = installDispatcher();
    await restocks.act(brainCtx());
    // Nothing to buy (no supplier on the glass line); the dirty glass cycles.
    expect(lines).toEqual(['get coupe', 'wash coupe', 'put coupe in rack']);
    expect(dirty.getContainer()).toBe(rack);
    expect(dirty.isSoiled()).toBe(false);
    expect(clean.getContainer()).toBe(rack);
  });
});
