/**
 * The cellars beat in a fixture world (fermentation W4) — the bottling
 * leg proven over the real seams: a FINISHED vat (a real ferment run to
 * completion on the pinned clock) is drawn down to its lees floor into
 * real Bottles through `BulkableApi.transfer` (the W0 seam carries the
 * batch's band AND maker's mark), the bottles are corked, carried to
 * the counter, and consigned AS THE OUTFIT through the real
 * Wallet/Consign controllers — with the hand back home at the end.
 *
 * The farms.test shape: `forceCommand` is mocked into a dispatch table;
 * the wire-critical verbs run the real machinery (transfer, consign,
 * wallet), the trivial ones (get/close) act through the same state
 * seams their controllers drive. The binder is not under test.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { brain as cellars } from '../cellars';
import type { BrainContext } from '../brain';
import ConsignController from '../../../platform/idea/cmd/retail/ConsignController';
import WalletController from '../../../platform/idea/cmd/banking/WalletController';
import Stock from '../../../platform/thing/Stock';
import Vat from '../../../platform/thing/Vat';
import Bottle from '../../../platform/thing/Bottle';
import BankCounter from '../../../platform/thing/BankCounter';
import PaymentCard from '../../../platform/thing/PaymentCard';
import ChattelRegistry from '../../../platform/idea/ChattelRegistry';
import BusinessEntity from '../../../platform/idea/Business';
import FermentProfile from '../../../platform/idea/ferment/FermentProfile';
import Material from '../../material/Material';
import type { Crafted } from '../../craft/Crafted';
import { EmploymentApi } from '../../../api/employment';
import { BankingApi } from '../../../api/banking';
import { ContainmentApi } from '../../../api/containment';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { BulkableApi } from '../../../api/bulk';
import { ExecutionContextApi } from '../../../api/execution-context';
import { WorldClockApi } from '../../../api/worldclock';
import { CommandApi, type CommandContext } from '../../../api/command';
import { Quantity } from '../../quantity';
import { Document } from '../../persistence/Document';
import { CommandDefinition } from '../../command/CommandDefinition';
import { CommandGiverMixin } from '../../command/CommandGiver';
import { EmployedMixin } from '../../employment/Employed';
import { SensorMixin } from '../../message/Sensor';
import { ContainerMixin } from '../../spatial/Container';
import { ContainableMixin } from '../../spatial/Containable';
import { MobileMixin } from '../../spatial/Mobile';
import { NamedMixin } from '../../description/Named';
import { Idea } from '../../stuff/Idea';
import Location from '../../stuff/Location';
import type { Stuff } from '../../stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import {
  installBankingHarness,
  teardownBankingHarness,
} from '../../banking/__tests__/banking-test-harness';
import WorldClockRegistry from '../../../platform/idea/WorldClockRegistry';
import { TemplatePaths } from '../../paths';

const FLOOR = '/trade/winemaking/location/_cellars-test-floor';
const COUNTER_ROOM = '/trade/distribution/location/_cellars-test-counter';
const SHELF = '/trade/distribution/thing/_cellars-test-shelf';
const OUTFIT = '/trade/winemaking/idea/_cellars-test-outfit';
const BANK = '/stuff/test/cellars/bank-counter';
const CARD = '/stuff/thing/PaymentCard';
let MUST = '';
let RED = '';
let PROFILE = '';
const VINTNER = '/trade/winemaking/agent/_cellars-vintner';

const DAY = 86_400;
const BASE = 30_000_000;
let now = BASE;

class Hand extends EmployedMixin(
  MobileMixin(
    SensorMixin(
      CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))),
    ),
  ),
) {
  static _mixinName = 'TestCellarsHand';
}

let seq = 0;

function asPrincipal<T>(who: Stuff, fn: () => Promise<T>): Promise<T> {
  return withRootContext(null, 'cellars.test', () => {
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

describe('the cellars beat — rack, cork, consign, home', () => {
  let floor: Location;
  let counterRoom: Location;
  let shelf: Stock;
  let vat: Vat;
  let hand: Hand;
  let outfit: BusinessEntity;
  let lines: string[];

  beforeEach(async () => {
    installBankingHarness();
    installV1QuantityMarshallers();
    Document.setMarshallerResolver(
      () => undefined,
      async () => undefined,
    );
    now = BASE;
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
    if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
      makeStuffAtPath(
        () => new WorldClockRegistry(),
        TemplatePaths.worldClockRegistry,
      );
    }
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      if (path === CARD) return makeStuffAtPath(() => new PaymentCard(), path);
      throw new Error(`unexpected clone: ${path}`);
    }) as unknown as typeof StuffApi.clone);
    vi.spyOn(EmploymentApi, 'shiftStateOf').mockReturnValue('on-shift');
    const reg = makeStuffAtPath(
      () => new ChattelRegistry(),
      '/platform/idea/ChattelRegistry',
    );
    await reg.postRegister();
    makeStuffAtPath(() => {
      const b = new BankCounter();
      b.setCorpoKey('goodkin');
      return b;
    }, BANK);

    const root = `/stuff/idea/cellars-test-${seq}/idea`;
    MUST = `${root}/material/must`;
    RED = `${root}/material/red`;
    PROFILE = `${root}/ferment/red`;
    {
      makeStuffAtPath(() => {
        const m = new Material();
        m.setName('test must');
        m.setTags(['liquid', 'cellars-must']);
        m.setNutrients(['water', 'sugar']);
        m.setNutrientAmounts({ sugar: 200 });
        return m;
      }, MUST);
      makeStuffAtPath(() => {
        const m = new Material();
        m.setName('red wine');
        m.setPrimaryKeyword('red');
        m.setKeywords(['red', 'wine']);
        m.setTags(['liquid', 'wine', 'red']);
        return m;
      }, RED);
      makeStuffAtPath(() => {
        const p = new FermentProfile();
        p.setKey('cellars-red');
        p.setInputCategory('cellars-must');
        p.setStallBelowK(283);
        p.setHappyK(291);
        p.setDamageAboveK(303);
        p.setRatePerDay(0.2);
        p.setProductMaterial(RED);
        p.setLeesFraction(0.04);
        return p;
      }, PROFILE);
    }

    floor = makeStuffAtPath(() => new Location(), FLOOR);
    counterRoom = makeStuffAtPath(() => new Location(), COUNTER_ROOM);
    shelf = makeStuffAtPath(() => {
      const s = new Stock();
      s.stockLines = [];
      s.discipline = 'scrum';
      s.attendDurationMs = 0;
      s.staffingPolicy = 'self-service';
      s.serverPositionKeys = [];
      s.setKeywords(['counter', 'shelf']);
      s.setListingCapOverride(200);
      return s;
    }, SHELF);
    ContainmentApi.move(shelf as never, counterRoom as never);

    // The vat: a real ferment, run to FINISHED on the pinned clock.
    vat = makeStuff(() => new Vat());
    vat.setKeywords(['vat']);
    vat.lastAmbientK = 291;
    vat.stampedTemperatureK = 291;
    ContainmentApi.move(vat as never, floor as never);
    const must = StuffApi.findByTemplatePath<Material>(MUST)!;
    vat.setBulkMaterial('interior', must);
    vat.setBulkAmount('interior', Quantity.of(4, 'L'));
    (vat as unknown as Crafted).setMaker(VINTNER); // the founder's mark
    vat.getFermentPhase(); // key the batch
    now = BASE + 8 * DAY; // 0.2/day → finished, swapped to red
    expect(vat.getFermentPhase()).toBe('finished');
    expect(vat.getBulkMaterialPath('interior')).toBe(RED);

    // Three empty bottles standing by (the vessel faucet's).
    for (let i = 0; i < 3; i++) {
      const b = makeStuff(() => new Bottle());
      b.setKeywords(['bottle', 'wine bottle']);
      (b as unknown as { category: string }).category = 'wine-bottle';
      ContainmentApi.move(b as never, floor as never);
    }

    outfit = makeStuffAtPath(() => new BusinessEntity(), OUTFIT);
    outfit.proprietorPath = '';
    outfit.positions = [
      { key: 'hand', label: 'the cellar hand', wageRate: 3, confers: [], purchases: true },
    ];
    outfit.operatingLocations = [FLOOR];
    outfit.banksAt = BankingApi.defaultCustodianBank();
    await EmploymentApi.operatingAccountOf(outfit);

    hand = makeStuffAtPath(() => new Hand(), `/trade/winemaking/agent/_hand-${seq++}`);
    hand.setName('Ilse');
    ContainmentApi.move(hand as never, floor as never);
    await EmploymentApi.hire(outfit, hand, 'hand');

    // The literal verbs → the real seams.
    lines = [];
    vi.spyOn(CommandApi, 'forceCommand').mockImplementation(
      async (giver: unknown, text: string) => {
        lines.push(text);
        const who = giver as unknown as Hand;
        const here = who.getContainer() as Location;
        if (text === 'get bottle') {
          const empty = (here.getContents() as Stuff[]).find(
            (c) =>
              MixinApi.isBulkable(c) &&
              c.getCategory() === 'wine-bottle' &&
              c.isBulkEmpty('interior'),
          );
          if (empty && MixinApi.isContainable(empty)) {
            ContainmentApi.move(empty, who as never);
          }
          return;
        }
        if (text === 'fill bottle from vat') {
          const held = (who.getContents() as Stuff[]).find(
            (c) => MixinApi.isBulkable(c) && c.isBulkEmpty('interior'),
          );
          const source = (here.getContents() as Stuff[]).find(
            (c) => MixinApi.isFermenting(c),
          );
          if (!held || !source) return;
          const from = BulkableApi.slotFor(source as never, undefined)!;
          const to = BulkableApi.slotFor(held as never, undefined)!;
          await asPrincipal(who, async () => {
            BulkableApi.transfer(from, to, { kind: 'all' });
          });
          return;
        }
        if (text === 'close bottle') {
          const held = (who.getContents() as Stuff[]).find(
            (c) => MixinApi.isSealable(c) && c.isOpen(),
          );
          if (held && MixinApi.isSealable(held)) held.close();
          return;
        }
        if (text === 'wallet use house') {
          await asPrincipal(who, () =>
            makeStuff(() => new WalletController()).execute(
              { subcommand: 'use', corpo: 'house' } as never,
              ctx(who, here, null, text),
            ),
          );
          return;
        }
        if (text.startsWith('consign ')) {
          const rest = text.split(' ').slice(1);
          const kw = rest[0]!;
          const ask = rest[rest.length - 1]!;
          await asPrincipal(who, () =>
            makeStuff(() => new ConsignController()).execute(
              { thing: kw, ask },
              ctx(who, here, shelf, text),
            ),
          );
          return;
        }
        // order / pour / buy / get grapes / drop: recorded, not needed
        // by the bottling leg this fixture proves.
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
      host: hand as unknown as Stuff,
      config: {
        home: FLOOR,
        counterRoom: COUNTER_ROOM,
        asks: { red: 11 },
        batch: 3,
      },
      state: {},
      trigger: { source: 'cadence', raw: 'cadence:120s' },
      say: vi.fn(),
      emote: vi.fn(async () => undefined),
      emoteFree: vi.fn(),
    } as unknown as BrainContext;
  }

  it('⭐ one beat: the finished vat is racked into corked, marked bottles and consigned as the outfit', async () => {
    await cellars.act(beatCtx());

    expect(lines.filter((l) => l === 'fill bottle from vat').length).toBe(3);
    expect(lines).toContain('wallet use house');
    expect(lines.filter((l) => l.startsWith('consign bottle --ask 11')).length).toBe(3);

    // The listings ride the shelf AS the outfit.
    expect(shelf.activeListingCount(OUTFIT)).toBe(3);
    const listed = (shelf.getContents() as Stuff[]).filter((c) =>
      MixinApi.isBulkable(c),
    );
    expect(listed).toHaveLength(3);
    for (const bottle of listed) {
      // The wine, at the batch's band, under the founder's mark (W0).
      expect(bottle.getBulkMaterialPath('interior')).toBe(RED);
      expect((bottle as unknown as Crafted).getGradeBand()).toBe('masterful');
      expect((bottle as unknown as Crafted).getMaker()).toBe(VINTNER);
      expect(MixinApi.isSealable(bottle) && bottle.isOpen()).toBe(false);
    }

    // The vat kept its lees floor (nothing raided the culture).
    expect(vat.getBulkAmount('interior').rawValue()).toBeGreaterThan(0.15);
    // And the hand ended the beat back home on the floor.
    expect(hand.getContainer()).toBe(floor);
  });

  it('a beat with no ready vat and no grapes does nothing but look', async () => {
    vat.setBulkAmount('interior', Quantity.of(0, 'L'));
    vat.setBulkMaterial('interior', null);
    expect(vat.getFermentPhase()).toBe('idle');
    await cellars.act(beatCtx());
    expect(lines.filter((l) => l.startsWith('fill')).length).toBe(0);
    expect(lines.filter((l) => l.startsWith('consign')).length).toBe(0);
    expect(lines.filter((l) => l.startsWith('order')).length).toBe(0);
    expect(hand.getContainer()).toBe(floor);
  });
});
