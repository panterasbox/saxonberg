/**
 * The keeper's back loop — libations D7 decision (h), **rewritten by
 * logistics D11**. Proves the `restocks` brain over the lounge's own
 * shape: a short rail against a par sheet, a funded house account, a
 * works board and a receiving bench.
 *
 * ⭐⭐ She does not shop any more. A beat now (1) reads the sheet, (2)
 * `wallet use house`, (3) `job post`s a carriage bounty per short line
 * — funded by the house, escrowed at post, collected FROM the
 * supplier's counter and delivered TO the bench — and (4) empties the
 * bench onto the rail. Somebody else carries the goods; that is the
 * whole of the logistics build's forcing function.
 *
 * The brain drives literal verbs through `forceCommand` (the giver's own
 * method since the OO sweep); here that seam is a dispatcher onto the
 * REAL `wallet` and `job` controllers over the real ContractApi/
 * BankingApi, with the physical verbs (`get` / `put` / `wash`) as their
 * containment effect. `shiftStateOf` is stubbed on-shift the way the
 * offstage suite does.
 *
 * ⚠⚠ Three defects this file found the moment the post path got its
 * first test, none of which a one-beat drive could see:
 *
 *   1. the exemplar scan read `getCategory()` — a bottle's VESSEL KIND —
 *      so no bulk par line ever matched and the flagship gin line
 *      ordered nothing, silently;
 *   2. every bottle on the rail is chattel-marked (the bar bought it), so
 *      the gig bound to THAT bottle: "deliver the bottle you are pointing
 *      at", which is nobody's work. Hence `job post --kind`;
 *   3. a bounty has no expiry and the line stays short until it is
 *      carried, so the keeper re-posted and re-escrowed every beat until
 *      the house was broke. Hence the pending-kinds guard.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { brain as restocks } from '../../../lib/behavior/restocks';
import type { BrainContext } from '../../../lib/behavior/brain';
import JobController from '../../../platform/idea/cmd/work/JobController';
import JobBoard from '../../../platform/thing/JobBoard';
import ConsignController from '../../../platform/idea/cmd/retail/ConsignController';
import WalletController from '../../../platform/idea/cmd/banking/WalletController';
import Stock from '../../../platform/thing/Stock';
import Bottle from '../../../platform/thing/Bottle';
import CraftVessel from '../../../platform/thing/CraftVessel';
import Coin from '../../../platform/thing/Coin';
import BankCounter from '../../../platform/thing/BankCounter';
import PaymentCard from '../../../platform/thing/PaymentCard';
import ChattelRegistry from '../../../platform/idea/ChattelRegistry';
import BusinessEntity from '../../../platform/idea/Business';
import Material from '../../../lib/material/Material';
import { EmploymentApi } from '../../../api/employment';
import { Currency, BankingApi, Money } from '../../../api/banking';
import { ContractApi } from '../../../api/contract';
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
import { EmploymentLogic } from '../../../platform/idea/api/EmploymentLogic';
import {
  installBankingHarness,
  teardownBankingHarness,
} from '../../../lib/banking/__tests__/banking-test-harness';

const BANK = '/stuff/test/lounge/bank-counter';
const BAR = '/world/lounge/location/bar';
const BAR_BIZ = '/world/lounge/idea/business';
const SHELF = '/trade/hospitality/thing/back-bar';
const RACK = '/trade/hospitality/thing/glass-rack';
// ⭐ The ROOM is the locality's and the MECHANISM is distribution's —
// fermentation's D10 decoupling kept whole, with the showroom where its
// door is (a roller door on the Counting-Houses avenue).
const CASH_AND_CARRY = '/world/terminus/counting-houses/cash-and-carry';
const COUNTER = '/trade/distribution/thing/counter';
const DISTRIBUTION = '/trade/distribution/idea/business';
const OUTFIT = '/trade/distilling/location/veshko-yard/idea/outfit';
const FLOOR = '/trade/distilling/location/veshko-yard/location/distillery';
const GIN = '/trade/distilling/idea/material/gin';
const CARD = '/stuff/thing/PaymentCard';
// The two logistics fixtures the D11 keeper works off, at the paths the
// shipped lounge row names.
const BOARD = '/trade/haulage/thing/works-board';
const BENCH = '/trade/haulage/thing/receiving-bench';
const REWARD = 30;

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

describe("the keeper's back loop — Mara orders Dave's Bar's rail in, and receives it", () => {
  let bar: Location;
  let floor: Location;
  let cashAndCarry: Location;
  let counter: Stock;
  let floorStock: Stock;
  let shelf: TestRack;
  let rack: TestRack;
  let board: JobBoard;
  let bench: TestRack;
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
    vi.spyOn(EmploymentLogic.prototype, 'shiftStateOf').mockReturnValue('on-shift');
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
    // The two D11 fixtures: the board she posts to and the bench a
    // hauler drops onto. The bench is a plain open container here for
    // the same reason the shelf is — its class ships in another pack.
    board = makeStuffAtPath(() => new JobBoard(), BOARD);
    ContainmentApi.move(board as never, bar as never);
    bench = makeStuffAtPath(() => new TestRack(), BENCH);
    bench.setKeywords(['bench', 'receiving']);
    bench.setPrimaryKeyword('bench');
    ContainmentApi.move(bench as never, bar as never);
    counter = stock(COUNTER, 'counter');
    ContainmentApi.move(counter as never, cashAndCarry as never);
    floorStock = stock('/trade/distilling/location/veshko-yard/thing/stock', 'stock');
    ContainmentApi.move(floorStock as never, floor as never);

    business(DISTRIBUTION, [{ key: 'clerk', label: 'clerking', wageRate: 5, confers: [] }], [CASH_AND_CARRY, COUNTER]);
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
    barBiz.setParLine({ category: 'gin', level: 1.5, unit: 'L', supplier: DISTRIBUTION });
    barBiz.setParLine({ category: 'coupe', level: 2, unit: 'count' });
    barAccount = await EmploymentApi.operatingAccountOf(barBiz);

    mara = makeStuffAtPath(() => new Hand(), `/world/lounge/agent/mara-${seq++}`);
    mara.setName('Mara');
    ContainmentApi.move(mara as never, bar as never);
    await barBiz.appoint(mara, 'keeper');
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
    await outfit.appoint(hand, 'hand');
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

  /** Rejection reasons the dispatcher's own `job post` collected. */
  let posted: string[] = [];

  /** The literal verbs, dispatched onto the real controllers as the keeper. */
  function installDispatcher(): string[] {
    const lines: string[] = [];
    posted = [];
    vi.spyOn(
      mara as unknown as { forceCommand(text: string): Promise<void> },
      'forceCommand',
    ).mockImplementation(async (text: string) => {
      const giver = mara;
      void giver;
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
      if (verb === 'job') {
        // `job post <kw> to <dest> for <n> --kind --bounty --business --from <origin>`
        // — parsed the way the binder would, then straight onto the real
        // controller with the BOARD as the command source (it affords the
        // verb to its peers, so that is exactly how a typed line arrives).
        const m = /^job post (\S+) to (\S+) for (\d+)(.*)$/.exec(text);
        expect(m, `unparsed: ${text}`).not.toBeNull();
        const [, named, destination, reward, flags] = m!;
        const c = ctx(who, here, board, text);
        await asPrincipal(who, () =>
          makeStuff(() => new JobController()).execute(
            {
              subcommand: 'post',
              item: named,
              destination,
              reward,
              kind: flags!.includes('--kind'),
              bounty: flags!.includes('--bounty'),
              business: flags!.includes('--business'),
              ...(/--from (\S+)/.exec(flags!)
                ? { from: /--from (\S+)/.exec(flags!)![1] }
                : {}),
            } as never,
            c,
          ),
        );
        posted.push(...rejections(c));
        return; // a refusal is the brain's own business — it reads the board
      }
      if (verb === 'put') {
        const item = find(rest[0]!, who.getContents() as Stuff[]);
        const target = find(rest[2]!, here.getContents() as Stuff[]);
        if (item && target && MixinApi.isContainer(target)) ContainmentApi.move(item as never, target as never);
        return;
      }
      if (verb === 'get') {
        // ⚠ `get 1 <kw>` — the count is the first token, and it is there
        // because `get` binds greedily (see the brain). One at a time.
        const kw = /^\d+$/.test(rest[0] ?? '') ? rest[1]! : rest[0]!;
        const item = find(kw, [
          ...(here.getContents() as Stuff[]),
          ...(here.getContents() as Stuff[]).flatMap((c) =>
            MixinApi.isContainer(c) ? (c.getContents() as Stuff[]) : [],
          ),
        ]);
        if (item) ContainmentApi.move(item as never, who as never);
        return;
      }
      if (verb === 'wash') {
        const item = find(rest[0]!, who.getContents() as Stuff[]) as CraftVessel | undefined;
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
      config: { shelf: SHELF, rack: RACK, board: BOARD, bench: BENCH, reward: REWARD },
      state: {},
      trigger: { source: 'cadence', raw: 'cadence:10m' },
      say: () => undefined,
      emote: async () => undefined,
      emoteFree: () => undefined,
    } as unknown as BrainContext;
  }

  /** The one gig the keeper posted this beat. */
  async function gigs() {
    return ContractApi.openGigsOn(BOARD);
  }

  it('⭐⭐ one beat with a funded house: the short line is POSTED as a kind-bound carriage bounty, collected at the supplier and dropped on the bench; the house escrows it', async () => {
    await BankingApi.float(barAccount, Money.of(200, Currency.compact()));
    // One bottle on the rail against a 1.5 L par: short, and with an
    // exemplar to point at. ⚠ It is CHATTEL-MARKED, like every bottle a
    // bar actually owns — which is the whole reason `--kind` exists.
    const onRail = ginBottle();
    ContainmentApi.move(onRail as never, shelf as never);
    await asPrincipal(mara, () => onRail.stampChattel(barBiz as never));
    const lines = installDispatcher();

    await restocks.act(brainCtx());

    expect(lines).toEqual([
      'wallet use house',
      `job post gin to ${BENCH} for ${REWARD} --kind --bounty --business --from ${CASH_AND_CARRY}`,
    ]);
    expect(posted).toEqual([]);
    expect(mara.getContainer()).toBe(bar);

    const open = await gigs();
    expect(open).toHaveLength(1);
    const condition = open[0]!.clause?.condition;
    // ⭐ KIND-bound, not instance-bound — any bottle of gin will do.
    expect(condition?.item).toEqual({ kind: 'template', path: '/trade/distilling/thing/gin' });
    expect(condition?.destinationPath).toBe(BENCH);
    // ⭐ Collected at the DISTRIBUTOR's counter room, which is what makes
    // the leg a real corridor rather than an errand from nowhere.
    expect(open[0]!.origin).toBe(CASH_AND_CARRY);
    // A bounty escrows at post, out of the HOUSE's account.
    expect(BankingApi.escrowBalanceOf(open[0]!.contractId).minor).toBe(REWARD);
    expect(BankingApi.balanceOf(barAccount).minor).toBe(200 - REWARD);
    expect(BankingApi.reconcile(Currency.compact()).balanced).toBe(true);

    // ⚠⚠ The second beat posts NOTHING. The line is still short (nobody
    // has carried anything yet) and the bounty never expires, so without
    // the pending-kinds guard she escrows another reward every beat until
    // the house is broke. This assertion is the guard.
    lines.length = 0;
    await restocks.act(brainCtx());
    expect(lines).toEqual([]);
    expect(await gigs()).toHaveLength(1);
    expect(BankingApi.balanceOf(barAccount).minor).toBe(200 - REWARD);
  });

  it('⭐⭐⭐ A COLD RAIL still orders — the bar can OPEN', async () => {
    /*
     * ⚠⚠⚠ The state a fresh realm boots into, and the one this build
     * shipped broken until the drive's own informational line gave it
     * away: the bar row carries NO bottles on purpose, so every supplied
     * line is at literal zero — and an order names an item the poster
     * can reach. With nothing on the rail to point at, the keeper
     * ordered nothing, forever. **Dave's Bar could not open.**
     *
     * The par line names what the house stocks, and the order names the
     * KIND (`--of`). Which gin this bar buys is the proprietor's
     * decision anyway, so it is authored where the level is.
     */
    await BankingApi.float(barAccount, Money.of(200, Currency.compact()));
    barBiz.setParLine({
      category: 'gin',
      level: 1.5,
      unit: 'L',
      supplier: DISTRIBUTION,
      exemplar: '/trade/distilling/thing/gin',
    });
    // The kind has to BE something — a live one at that path is proof.
    ginBottle();
    const lines = installDispatcher();

    await restocks.act(brainCtx());

    expect(lines).toEqual([
      'wallet use house',
      `job post /trade/distilling/thing/gin to ${BENCH} for ${REWARD} ` +
        `--bounty --business --from ${CASH_AND_CARRY}`,
    ]);
    expect(posted).toEqual([]);
    const open = await gigs();
    expect(open).toHaveLength(1);
    expect(open[0]!.clause?.condition.item).toEqual({
      kind: 'template',
      path: '/trade/distilling/thing/gin',
    });
    expect(BankingApi.escrowBalanceOf(open[0]!.contractId).minor).toBe(REWARD);
  });

  it('⚠ a kind that is NOTHING is refused — the escrow would sit forever', async () => {
    await BankingApi.float(barAccount, Money.of(200, Currency.compact()));
    barBiz.setParLine({
      category: 'gin',
      level: 1.5,
      unit: 'L',
      supplier: DISTRIBUTION,
      exemplar: '/trade/distilling/thing/no-such-spirit',
    });
    const lines = installDispatcher();
    await restocks.act(brainCtx());
    expect(lines).toHaveLength(2);
    expect(posted).toEqual(['contract-refused']);
    expect(await gigs()).toHaveLength(0);
    expect(BankingApi.balanceOf(barAccount).minor).toBe(200);
  });

  it('⭐ the receiving beat: what a hauler left on the bench is taken and shelved', async () => {
    await BankingApi.float(barAccount, Money.of(200, Currency.compact()));
    // The par line is met by what is already on the bench + rail, so
    // this beat is purely the receiving half.
    const delivered = await consignGin(0, 0).then(() => [ginBottle(), ginBottle()]);
    for (const b of delivered) ContainmentApi.move(b as never, bench as never);
    const lines = installDispatcher();

    await restocks.act(brainCtx());

    expect(lines).toEqual([
      'get 1 gin',
      'get 1 gin',
      'put gin on back-bar',
      'put gin on back-bar',
    ]);
    for (const b of delivered) expect(b.getContainer()).toBe(shelf);
    expect(bench.getContents()).toHaveLength(0);
    // 1.5 L on the rail meets the par exactly — nothing left to order.
    expect(barBiz.stockSheetFor(mara).find((l) => l.line.category === 'gin')?.shortfall).toBe(0);
    expect(await gigs()).toHaveLength(0);
  });

  it('a house that cannot pay posts nothing — the escrow refuses and the sheet keeps saying so', async () => {
    await BankingApi.float(barAccount, Money.of(10, Currency.compact()));
    const onRail = ginBottle();
    ContainmentApi.move(onRail as never, shelf as never);
    const lines = installDispatcher();

    await restocks.act(brainCtx());

    // She tries — the refusal is the BANK's, at the board, and it is
    // visible rather than swallowed.
    expect(lines).toEqual([
      'wallet use house',
      `job post gin to ${BENCH} for ${REWARD} --kind --bounty --business --from ${CASH_AND_CARRY}`,
    ]);
    expect(posted).toEqual(['contract-refused']);
    expect(await gigs()).toHaveLength(0);
    expect(BankingApi.balanceOf(barAccount).minor).toBe(10);
    expect(barBiz.stockSheetFor(mara).find((l) => l.line.category === 'gin')?.shortfall).toBe(0.75);
  });

  it('the bussing beat: a soiled, empty glass loose in the bar is collected, washed and racked', async () => {
    barBiz.removeParLine('gin'); // nothing to order this beat — only the glass line
    const dirty = makeStuffAtPath(() => new CraftVessel(), '/trade/hospitality/thing/coupe');
    dirty.interiorBulk = true;
    dirty.setKeywords(['coupe', 'glass']);
    dirty.setPrimaryKeyword('coupe');
    dirty.setCategory('coupe');
    (dirty as unknown as { soiled: boolean }).soiled = true;
    ContainmentApi.move(dirty as never, bar as never);
    const clean = makeStuffAtPath(() => new CraftVessel(), '/trade/hospitality/thing/coupe');
    clean.interiorBulk = true;
    clean.setKeywords(['coupe', 'glass']);
    clean.setCategory('coupe');
    ContainmentApi.move(clean as never, rack as never);
    const lines = installDispatcher();
    await restocks.act(brainCtx());
    // Nothing to order (no supplier on the glass line); the dirty glass
    // cycles. ⚠⚠ `get 1 coupe`, never a bare `get coupe` — `get` binds
    // greedily and a bar with six dirty coupes would put all six in her
    // hands on the first pass.
    expect(lines).toEqual(['get 1 coupe', 'wash coupe', 'put coupe in rack']);
    expect(dirty.getContainer()).toBe(rack);
    expect(dirty.isSoiled()).toBe(false);
    expect(clean.getContainer()).toBe(rack);
  });
});
