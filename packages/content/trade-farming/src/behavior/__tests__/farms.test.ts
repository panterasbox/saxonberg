/**
 * The `farms` beat in a fixture world (farming A7) — the producer's loop
 * proven over real controllers: a thirsty bed gets WATERED (the bed's
 * own reserve rises), a ripe tree gets PICKED (the take lands in the
 * farmer's hands off the real HarvestController), and the take goes up
 * on the market stall AS THE OUTFIT (listings appear under the farm
 * business, through the real Wallet/Consign controllers) — with the
 * farmer back home at the end of the beat.
 *
 * The restocks.test.ts shape: `forceCommand` is dispatched onto the real
 * controllers with hand-built models (the binder is not under test —
 * controller-tests-skip-the-binder), and banking rides the harness.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { brain as farms } from '../farms';
import type { BrainContext } from '@saxonberg/server/mud/lib/behavior/brain';
import WaterController from '@saxonberg/server/mud/platform/idea/cmd/bulk/WaterController';
import HarvestController from '@saxonberg/server/mud/platform/idea/cmd/inventory/HarvestController';
import ConsignController from '@saxonberg/server/mud/platform/idea/cmd/retail/ConsignController';
import WalletController from '@saxonberg/server/mud/platform/idea/cmd/banking/WalletController';
import StockBase from '@saxonberg/server/mud/lib/retail/Stock';

class Stock extends StockBase {}
import Plant from '@saxonberg/server/mud/platform/thing/Plant';
import Provision from '@saxonberg/server/mud/platform/thing/Provision';
import GardenBed from '@saxonberg/server/mud/platform/thing/GardenBed';
import Bottle from '@saxonberg/server/mud/platform/thing/Bottle';
import Coin from '@saxonberg/server/mud/platform/thing/Coin';
import BankCounter from '@saxonberg/server/mud/platform/thing/BankCounter';
import PaymentCard from '@saxonberg/server/mud/platform/thing/PaymentCard';
import ChattelRegistry from '@saxonberg/server/mud/platform/idea/ChattelRegistry';
import BusinessEntity from '@saxonberg/server/mud/platform/idea/Business';
import Material from '@saxonberg/server/mud/lib/material/Material';
import { Reserve, ReservedMixin } from '@saxonberg/server/mud/lib/reserve';
import { SoilMixin } from '@saxonberg/server/mud/lib/husbandry/Soil';
import { AdvancementMixin } from '@saxonberg/server/mud/lib/advancement/Advancement';
import {
  PLANT_SLOT,
  SOIL_MOISTURE_RESERVE_KEY,
  SOIL_NITROGEN_RESERVE_KEY,
} from '@saxonberg/server/mud/lib/husbandry/Cultivable';
import type { GrowthProfileData } from '@saxonberg/server/mud/lib/husbandry/Growing';
import { EmploymentApi } from '@saxonberg/server/mud/api/employment';
import { BankingApi } from '@saxonberg/server/mud/api/banking';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { CommandApi, type CommandContext } from '@saxonberg/server/mud/api/command';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { Document } from '@saxonberg/server/mud/lib/persistence/Document';
import { CommandDefinition } from '@saxonberg/server/mud/lib/command/CommandDefinition';
import { CommandGiverMixin } from '@saxonberg/server/mud/lib/command/CommandGiver';
import { EmployedMixin } from '@saxonberg/server/mud/lib/employment/Employed';
import { SensorMixin } from '@saxonberg/server/mud/lib/message/Sensor';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { ContainableMixin } from '@saxonberg/server/mud/lib/spatial/Containable';
import { MobileMixin } from '@saxonberg/server/mud/lib/spatial/Mobile';
import { NamedMixin } from '@saxonberg/server/mud/lib/description/Named';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import Place from '@saxonberg/server/mud/lib/stuff/Place';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';

/**
 * ⚠ **Stand in for the BINDER.** `consign`'s `thing` is a declared
 * `type: object` arg with `scope: [inventory]` — the binder resolves the
 * keyword against what you are carrying, and the controller just reads
 * it. A hand-built model skips the binder, so this harness has to do the
 * one thing the binder would have done.
 */
function bindHeld(giver: unknown, kw: string): { stuff: never; raw: string } {
  const held = (giver as { getContents?(): unknown[] }).getContents?.() ?? [];
  const found = held.find((i) => {
    const p = i as { hasKeyword?(k: string): boolean };
    return typeof p.hasKeyword === 'function' && p.hasKeyword(kw);
  });
  return { stuff: (found ?? null) as never, raw: kw };
}

import {
  installBankingHarness,
  teardownBankingHarness,
} from '@saxonberg/server/mud/lib/banking/__tests__/banking-test-harness';

const GROVE = '/trade/farming/location/test-grove';
const STALL = '/test/farm/market/stalls';
const MARKET = '/test/farm/market/square';
const FARM_BIZ = '/trade/farming/idea/test-farm-biz';
const BANK = '/stuff/test/farm/bank-counter';
const CARD = '/stuff/thing/PaymentCard';
const CROP = '/trade/farming/thing/cherry';
const WATER_MAT = '/stuff/idea/material/bulk/water';

class Farmer extends EmployedMixin(
  MobileMixin(
    SensorMixin(
      CommandGiverMixin(
        ContainerMixin(ContainableMixin(NamedMixin(Idea))),
      ),
    ),
  ),
) {
  static _mixinName = 'TestFarmer';
}

let seq = 0;

function asPrincipal<T>(who: Stuff, fn: () => Promise<T>): Promise<T> {
  return withRootContext(null, 'farms.test', () => {
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
    command: CommandDefinition.fromYaml(
      `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
      '<test>',
    ),
  });
}

function polyProfile(): GrowthProfileData {
  return {
    moistureHappyAt: 0.3,
    moistureWiltAt: 0.05,
    litresPerGameDay: 0,
    luxHappyAt: 0,
    luxDarkAt: 0,
    rootDemand: { seedling: 0.2, young: 1, established: 2, mature: 3 },
    daysToStage: { young: 14, established: 42, mature: 84 },
    fruitSetCount: 3,
    fruitFillDays: 20,
  };
}

describe('the farms beat — tend, pick, sell, home', () => {
  let grove: Place;
  let market: Place;
  let bed: GardenBed;
  let tree: Plant;
  let stall: Stock;
  let farmer: Farmer;
  let farmBiz: BusinessEntity;
  let lines: string[];

  beforeEach(async () => {
    installBankingHarness();
    installV1QuantityMarshallers();
    Document.setMarshallerResolver(
      () => undefined,
      async () => undefined,
    );
    WorldClockApi._setNowProviderForTesting(() => 1_000_000);
    vi.spyOn(PersistableApi, 'captureHostOf').mockImplementation(
      (async () => {}) as unknown as typeof PersistableApi.captureHostOf,
    );
    let cropSeq = 0;
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      if (path === CARD) return makeStuffAtPath(() => new PaymentCard(), path);
      if (path === CROP) {
        cropSeq += 1;
        return makeStuffAtPath(() => {
          const p = new Provision();
          p.setShortDescription('a cherry');
          p.setKeywords(['cherry', 'cherries', 'produce']);
          p.setPrimaryKeyword('cherry');
          return p;
        }, `/trade/farming/thing/_minted-cherry-${cropSeq}`);
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
    vi.spyOn(Farmer.prototype, 'shiftState').mockReturnValue('on-shift');
    const reg = makeStuffAtPath(
      () => new ChattelRegistry(),
      '/platform/idea/ChattelRegistry',
    );
    await reg.onCreate();
    makeStuffAtPath(() => {
      const b = new BankCounter();
      b.setCorpoKey('goodkin');
      return b;
    }, BANK);

    grove = makeStuffAtPath(() => new Place(), GROVE);
    market = makeStuffAtPath(() => new Place(), MARKET);

    // The bed: THIRSTY (1 of 6 L) and holding a ripe polycarp tree.
    bed = makeStuffAtPath(() => {
      const b = new GardenBed();
      b.setShortDescription('a raised garden bed');
      b.setKeywords(['bed', 'garden bed']);
      b.setPrimaryKeyword('bed');
      b.setMass(Quantity.of(340, 'kg'));
      b.interiorBulk = true;
      b.setInteriorCapacity(Quantity.of(12, 'L'));
      b.setInteriorAmount(Quantity.of(12, 'L'));
      b.setStaticSlots([
        { name: PLANT_SLOT, accepts: 'SlottableMixin', capacity: 4 },
      ]);
      b.setReserve(
        new Reserve(
          SOIL_MOISTURE_RESERVE_KEY,
          Quantity.of(6, 'L'),
          Quantity.of(1, 'L'),
          'cultivation',
          'wilting',
        ),
      );
      b.setReserve(
        new Reserve(
          SOIL_NITROGEN_RESERVE_KEY,
          Quantity.of(100, '%'),
          Quantity.of(100, '%'),
          'cultivation',
          'spent',
        ),
      );
      return b;
    }, '/trade/farming/thing/bed/_farms-test');
    ContainmentApi.move(bed as never, grove as never);

    tree = makeStuffAtPath(() => {
      const t = new Plant();
      t.setShortDescription('a cherry tree');
      t.setKeywords(['cherry tree', 'tree', 'cherry']);
      t.setPrimaryKeyword('cherry tree');
      t.setLifecycleState('alive');
      t.setProfile(polyProfile());
      t.setHarvestTemplatePath(CROP);
      t.setNutrientDraw(10);
      return t;
    }, '/trade/farming/thing/plant/_farms-tree');
    ContainmentApi.move(tree as never, bed as never);
    bed.occupy(tree, PLANT_SLOT);
    (tree as unknown as { growthStage: string }).growthStage = 'mature';
    (tree as unknown as { _flowering: boolean })._flowering = true;
    (tree as unknown as { _seedSet: boolean })._seedSet = true;
    (tree as unknown as { _fruitFill: number })._fruitFill = 1;

    // The market stall (the A6 fixture shape: consignment-only Stock).
    stall = makeStuffAtPath(() => {
      const s = new Stock();
      s.stockLines = [];
      s.discipline = 'scrum';
      s.attendDurationMs = 0;
      s.staffingPolicy = 'self-service';
      s.serverPositionKeys = [];
      s.setKeywords(['stall', 'stalls']);
      s.setListingCapOverride(200);
      return s;
    }, STALL);
    ContainmentApi.move(stall as never, market as never);

    // The farm business: the farmer holds a `purchases` position (the
    // house card is dealt at hire — the shipped seam, zero kernel change).
    farmBiz = makeStuffAtPath(() => new BusinessEntity(), FARM_BIZ);
    farmBiz.proprietorPath = '';
    farmBiz.positions = [
      { key: 'hand', label: 'working the grove', wageRate: 3, purchases: true },
    ];
    farmBiz.operatingLocations = [GROVE];
    farmBiz.banksAt = BankingApi.defaultCustodianBank();
    await EmploymentApi.operatingAccountOf(farmBiz);

    farmer = makeStuffAtPath(() => new Farmer(), `/trade/farming/agent/_farmer-${seq++}`);
    farmer.setName('Old Pol');
    ContainmentApi.move(farmer as never, grove as never);
    await farmBiz.appoint(farmer, 'hand');

    // A vessel of water in hand — `water` pours from what you carry.
    const water = makeStuffAtPath(() => {
      const m = new Material();
      m.setName('water');
      m.setKeywords(['water']);
      m.setTags(['liquid', 'water']); // the tag carriedWaterSource reads
      m.setDensity(Quantity.of(1000, 'kg/m³'));
      return m;
    }, WATER_MAT) as unknown as Material;
    const can = makeStuff(() => new Bottle());
    can.setKeywords(['can', 'watering can']);
    can.setPrimaryKeyword('can');
    can.setBulkMaterial('interior', water);
    can.setBulkAmount('interior', Quantity.of(5, 'L'));
    ContainmentApi.move(can as never, farmer as never);

    // The literal verbs, dispatched onto the real controllers.
    lines = [];
    vi.spyOn(
      farmer as unknown as { forceCommand(text: string): Promise<void> },
      'forceCommand',
    ).mockImplementation(async (text: string) => {
        const giver = farmer;
        void giver;
        if (text === 'sense') return;
        lines.push(text);
        const who = giver as unknown as Farmer;
        const here = who.getContainer() as Place;
        const [verb, ...rest] = text.split(' ');
        const reach = (kw: string): Stuff | null =>
          ((here.getContents() as Stuff[]).find(
            (c) => MixinApi.isPerceptible(c) && c.hasKeyword(kw),
          ) ?? null);
        if (verb === 'fill') return; // no standpipe here — the can is full
        if (verb === 'water') {
          const target = reach(rest.join(' '));
          await asPrincipal(who, () =>
            makeStuff(() => new WaterController()).execute(
              // ⚠ `source` is BOUND BY THE VIEW (`water.yaml`, defaulting
              // through `me:i:[mixin.BulkableMixin]`) — the same standing
              // warning `consign`'s shelf carries below.
              {
                target: { stuff: target, raw: rest.join(' ') },
                source: { stuff: [can], raw: '' },
              } as never,
              ctx(who, here, null, text),
            ),
          );
          return;
        }
        if (verb === 'pick') {
          const target = reach(rest.join(' '));
          await asPrincipal(who, () =>
            makeStuff(() => new HarvestController()).execute(
              { target: { stuff: target, raw: rest.join(' ') } } as never,
              ctx(who, here, null, text),
            ),
          );
          return;
        }
        if (verb === 'wallet') {
          await asPrincipal(who, () =>
            makeStuff(() => new WalletController()).execute(
              { subcommand: 'use', corpo: 'house' } as never,
              ctx(who, here, null, text),
            ),
          );
          return;
        }
        if (verb === 'consign') {
          const kw = rest[0]!;
          const ask = rest[rest.length - 1]!;
          await asPrincipal(who, () =>
            makeStuff(() => new ConsignController()).execute(
              // ⚠ `shelf` is BOUND BY THE VIEW since `consign` declared it
              // (`retail/consign.yaml` § shelf, defaulting through MQL).
              // A hand-built model skips the binder, so the test has to
              // carry what the view would have put there — the standing
              // warning in the lib-statics slate, hit by a BRAIN suite
              // this time rather than a controller one.
              { thing: bindHeld(who, kw), ask, shelf: { stuff: stall, raw: 'stall' } },
              ctx(who, here, stall, text),
            ),
          );
          return;
        }
        // feed / draw: recorded, not dispatched (their controllers have
        // their own suites; nothing here asserts on their effect).
      },
    );
  });

  afterEach(() => {
    teardownBankingHarness();
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
  });

  function beatCtx(): BrainContext {
    return {
      host: farmer as unknown as Stuff,
      config: {
        home: GROVE,
        shelf: STALL,
        ask: { cherry: 5 },
        batch: 6,
      },
      state: {},
      trigger: { source: 'cadence', raw: 'cadence:90s' },
      say: vi.fn(),
      emote: vi.fn(async () => undefined),
      emoteFree: vi.fn(),
    } as unknown as BrainContext;
  }

  it('⭐ one beat: waters the thirsty bed, picks the ripe tree, lists the take, walks home', async () => {
    await farms.act(beatCtx());

    // The bed was watered — its own reserve rose past the thirsty mark.
    expect(lines).toContain('water bed');
    expect(bed.soilMoistureFraction()!).toBeGreaterThan(0.3);

    // The ripe tree was picked THROUGH THE GROUND (one pick, the whole
    // set) and survives with its window closed.
    expect(lines.filter((l) => l === 'pick bed').length).toBeGreaterThan(0);
    expect(tree.isDestroyed()).toBe(false);
    expect(tree.isHarvestable()).toBe(false);

    // The take went up AS THE OUTFIT: listings under the farm business.
    expect(lines).toContain('wallet use house');
    expect(stall.activeListingCount(FARM_BIZ)).toBe(3);
    expect(
      (stall.getContents() as Stuff[]).filter((c) => c instanceof Provision),
    ).toHaveLength(3);

    // And the farmer ended the beat back home on the grove.
    expect(farmer.getContainer()).toBe(grove);
  });

  it('a beat with nothing ripe and wet ground does nothing but look', async () => {
    (tree as unknown as { _fruitFill: number })._fruitFill = 0.2;
    bed.setReserve(
      new Reserve(
        SOIL_MOISTURE_RESERVE_KEY,
        Quantity.of(6, 'L'),
        Quantity.of(6, 'L'),
        'cultivation',
        'wilting',
      ),
    );
    await farms.act(beatCtx());
    expect(lines.filter((l) => l.startsWith('water')).length).toBe(0);
    expect(lines.filter((l) => l.startsWith('pick')).length).toBe(0);
    expect(lines.filter((l) => l.startsWith('consign')).length).toBe(0);
    expect(farmer.getContainer()).toBe(grove);
  });
});

// ── ⭐ field population W5: the hand reads a FIELD with its own eyes ──

/** A named part of a divided field — the `Patch` shape, in the kernel. */
class TestPart extends SoilMixin(ReservedMixin(NamedMixin(Idea))) {
  key = '';
  public override soilPartKey(): string {
    return this.key;
  }
  public override soilCatchmentAreaM2(): number {
    return 100;
  }
}

/** Soil-bearing ground holding no slot: a field of parts. */
class TestField extends SoilMixin(ReservedMixin(Place)) {
  parts: TestPart[] = [];
  public override soilParts(): readonly TestPart[] {
    return this.parts;
  }
}

/** A hand with eyes of its own — competence is what it reads with. */
class FieldHand extends AdvancementMixin(
  MobileMixin(
    SensorMixin(CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea))))),
  ),
) {
  static _mixinName = 'TestFieldHand';
}

let FIELD = '';
let YARD = '';
let w5Scene = 0;

describe('the farms beat on a FIELD — patches read at the hand\'s band', () => {
  let field: TestField;
  let yard: Place;
  let fseq = 0;

  function moistureReserve(current: number): Reserve {
    return new Reserve(
      SOIL_MOISTURE_RESERVE_KEY,
      Quantity.of(100, 'L'),
      Quantity.of(current, 'L'),
      'cultivation',
      'wilting',
    );
  }

  function part(key: string, litres: number): TestPart {
    return makeStuffAtPath(() => {
      const p = new TestPart();
      p.key = key;
      p.setName(key.replace('-', ' '));
      p.setReserve(moistureReserve(litres));
      return p;
    }, `/trade/farming/thing/_w5-part-${key}-${fseq++}`);
  }

  function wheatAt(p: TestPart): Plant {
    const w = makeStuffAtPath(() => {
      const c = new Plant();
      c.setShortDescription('a stand of wheat');
      c.setKeywords(['wheat', 'crop']);
      c.setPrimaryKeyword('wheat');
      c.setLifecycleState('alive');
      c.setLastAmbientK(290);
      c.setProfile({ ...polyProfile(), seedRateKgPerM2: 0.015 });
      c.setSownAreaM2(100);
      c.setGroundPart(p.key);
      return c;
    }, `/trade/farming/thing/plant/_w5-wheat-${fseq++}`);
    ContainmentApi.move(w as never, field as never);
    return w;
  }

  function hand(band: string, n = fseq++): { hand: FieldHand; lines: string[] } {
    const h = makeStuffAtPath(() => new FieldHand(), `/trade/farming/agent/_w5-hand-${n}`);
    h.setName(`Hand ${n}`);
    ContainmentApi.move(h as never, field as never);
    vi.spyOn(h, 'competenceBandFor').mockResolvedValue(band as never);
    const lines: string[] = [];
    vi.spyOn(
      h as unknown as { forceCommand(text: string): Promise<void> },
      'forceCommand',
    ).mockImplementation(async (text: string) => {
      if (text === 'sense') return; // the look a teleport takes
      lines.push(text);
      // Where the can is filled is where the hand stands to fill it.
      if (text.startsWith('fill')) lines.push(`@${(h.getContainer() as Stuff).getTemplatePath()}`);
    });
    return { hand: h, lines };
  }

  function beat(h: FieldHand): BrainContext {
    return {
      host: h as unknown as Stuff,
      config: { home: FIELD, shelf: '', water: { room: YARD, from: 'trough' }, drawEvery: 0 },
      state: {},
      trigger: { source: 'cadence', raw: 'cadence:90s' },
      say: vi.fn(),
      emote: vi.fn(async () => undefined),
      emoteFree: vi.fn(),
    } as unknown as BrainContext;
  }

  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._setNowProviderForTesting(() => 1_000_000);
    vi.spyOn(PersistableApi, 'captureHostOf').mockImplementation(
      (async () => {}) as unknown as typeof PersistableApi.captureHostOf,
    );
    w5Scene += 1;
    FIELD = `/trade/farming/location/_w5-field-${w5Scene}`;
    YARD = `/trade/farming/location/_w5-yard-${w5Scene}`;
    field = makeStuffAtPath(() => new TestField(), FIELD);
    yard = makeStuffAtPath(() => new Place(), YARD);
  });

  afterEach(() => {
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
  });

  it('⭐ an expert fills at the yard trough and waters the THIRSTY patch, by name, and comes home', async () => {
    const top = part('top-end', 20);
    const lane = part('lane-end', 45);
    field.parts = [top, lane];
    wheatAt(top);
    wheatAt(lane);
    const { hand: h, lines } = hand('expert');

    await farms.act(beat(h));

    expect(lines).toEqual([
      'fill can from trough',
      `@${YARD}`,
      `water wheat at ${top.presentationPhrase().definite()}`,
    ]);
    expect(lines[2]).toMatch(/at (the )?top end$/);
    expect(h.getContainer()).toBe(field);
  });

  it('wet patches are left alone — nothing is filled or watered', async () => {
    const top = part('top-end', 80);
    field.parts = [top, part('lane-end', 90)];
    wheatAt(top);
    const { hand: h, lines } = hand('expert');
    await farms.act(beat(h));
    expect(lines).toEqual([]);
  });

  it('⭐ an expert never misranks two patches 0.02 apart; a novice can — and waters where ITS read points', async () => {
    const top = part('top-end', 30);
    const lane = part('lane-end', 32);
    field.parts = [top, lane];
    const topCrop = wheatAt(top);
    const laneCrop = wheatAt(lane);
    const topName = top.presentationPhrase().definite();
    const laneName = lane.presentationPhrase().definite();

    let noviceWrong = 0;
    for (let i = 0; i < 40; i++) {
      const expert = hand('expert', 1000 + i);
      await farms.act(beat(expert.hand));
      expect(expert.lines.at(-1)).toBe(`water wheat at ${topName}`);

      const novice = hand('novice', 2000 + i);
      await farms.act(beat(novice.hand));
      // What THIS hand reads, with the same seed the brain used.
      const seen = (c: Plant): number =>
        c.readFor('novice', c.readSeedFor(novice.hand as unknown as Stuff)).moisture!;
      const expected = seen(topCrop) <= seen(laneCrop) ? topName : laneName;
      expect(novice.lines.at(-1)).toBe(`water wheat at ${expected}`);
      if (expected === laneName) noviceWrong += 1;
    }
    expect(noviceWrong).toBeGreaterThan(0);
  });

  it('off shift, a hired hand does nothing', async () => {
    const top = part('top-end', 10);
    field.parts = [top];
    wheatAt(top);
    const { lines } = hand('expert');
    vi.spyOn(Farmer.prototype, 'shiftState').mockReturnValue('off-shift');
    vi.spyOn(Farmer.prototype, 'getActiveEmployment').mockReturnValue({} as never);
    const off = makeStuffAtPath(() => new Farmer(), `/trade/farming/agent/_w5-off-${fseq++}`);
    ContainmentApi.move(off as never, field as never);
    const offLines: string[] = [];
    vi.spyOn(
      off as unknown as { forceCommand(text: string): Promise<void> },
      'forceCommand',
    ).mockImplementation(async (t: string) => {
      if (t !== 'sense') offLines.push(t);
    });
    await farms.act(beat(off as unknown as FieldHand));
    expect(offLines).toEqual([]);
    expect(lines).toEqual([]);
  });
});
