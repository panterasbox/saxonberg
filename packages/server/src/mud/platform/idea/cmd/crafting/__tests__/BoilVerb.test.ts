/**
 * `boil` — **an act, not an outcome.**
 *
 * What boiling does is decided by what you boiled, never by the
 * controller. That is the difference between a verb one trade can use
 * and a verb every trade can, and this file is written around the two
 * consequences rather than around either one:
 *
 *  - a **build** (a cook pot) latches the heat it reached and records
 *    the method `boiled`, which a recipe's reverse-match reads;
 *  - a **vessel** whose contents declare `purifiedByBoiling` comes off
 *    fit to drink;
 *  - a target that is **both** gets both.
 *
 * ⚠ The first cut of this verb was a purifier: its arg required
 * `BulkableMixin`, it recorded nothing, and its single consequence was
 * hardcoded. A `CookPot` is `ManualBuild + Tool + Durable` and NOT
 * `Bulkable`, so `boil pot` refused outright — the cooking trade locked
 * out of its own verb. The first test below is the one that would have
 * caught that.
 *
 * ⭐ And boiling still does not fix everything. A material that declares
 * no counterpart just gets hot, and the command is NOT refused, because
 * you really did boil it.
 *
 * See docs/subsystems/watershed.md.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import BoilController from '../BoilController';
import Material from '../../../../../lib/material/Material';
import Receptacle from '../../../../thing/Receptacle';
import Thing from '../../../../../lib/stuff/Thing';
import { Quantity } from '../../../../../lib/quantity';
import { Reserve } from '../../../../../lib/reserve';
import { StuffApi } from '../../../../../api/stuff';
import { WorldClockApi } from '../../../../../api/worldclock';
import { SchedulerApi } from '../../../../../api/scheduler';
import { EventApi } from '../../../../../api/event';
import EventRegistry from '../../../EventRegistry';
import Forge from '../../../../thing/Forge';
import { Idea } from '../../../../../lib/stuff/Idea';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { EngagedMixin } from '../../../../../lib/activity/Engaged';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { ManualBuildMixin } from '../../../../../lib/craft/ManualBuild';
import { ToolMixin } from '../../../../../lib/craft/Tooled';
import { BulkableMixin } from '../../../../../lib/bulk/Bulkable';
import Location from '../../../../../lib/stuff/Location';
import { ContainmentApi } from '../../../../../api/containment';
import { MixinApi } from '../../../../../api/mixin';
import { CommandApi } from '../../../../../api/command';
import type { CommandContext } from '../../../../../api/command';
import type { MqlOneResult } from '../../../../../api/mql';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '../../../../../lib/security/__tests__/test-setup';
import {
  installV1QuantityMarshallers,
  installV1QuantityTagTables,
} from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

class TestActor extends CommandGiverMixin(
  SensorMixin(EngagedMixin(ContainerMixin(ContainableMixin(Idea)))),
) {
  protected handleMessage(): void {}
  protected handleEnvelope(): void {}
}

/** A cook pot's shape: a build host + a tool, and NOT bulkable. */
class TestPot extends ManualBuildMixin(ToolMixin(Thing)) {}

/** A cauldron: a build host that also holds bulk — the "both" case. */
class TestCauldron extends ManualBuildMixin(BulkableMixin(Thing)) {}

const FOUL = '/stuff/idea/material/_test/foul-water';
const CLEAN = '/stuff/idea/material/_test/clean-water';
const LEADED = '/stuff/idea/material/_test/leaded-water';

const stubCommand = CommandDefinition.fromYaml(
  'verbs: [boil]\ncontroller: x\ndescription: d\n',
  '<test>',
);

const ref = (stuff: Stuff | null): MqlOneResult =>
  ({ stuff, raw: 'pot' }) as unknown as MqlOneResult;

/** A water-like material, optionally declaring what boiling makes it. */
function water(path: string, purifiedInto: string, toxin: number): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!);
    m.setBoilingPoint(Quantity.of(373, 'K'));
    m.setPurifiedByBoiling(purifiedInto);
    if (toxin > 0) m.setToxicity([{ type: 'dysentery', amount: toxin }]);
    return m;
  }, path) as unknown as Material;
}

let seq = 0;

function makeReceptacle(material: Material | null, litres = 2): Receptacle {
  seq += 1;
  const pot = makeStuffAtPath(() => {
    const v = new Receptacle();
    v.setShortDescription('a battered pot');
    v.setKeywords(['pot']);
    v.setMass(Quantity.of(1, 'kg'));
    (v as unknown as { interiorBulk: boolean }).interiorBulk = true;
    v.setInteriorCapacity(Quantity.of(5, 'L'));
    return v;
  }, `/stuff/thing/vessel/_boiltest-${seq}`) as Receptacle;
  if (material !== null) {
    const slot = pot.getBulk();
    slot.setMaterial(material);
    slot.setAmount(Quantity.of(litres, 'L'));
  }
  return pot;
}

function makePot(): TestPot {
  seq += 1;
  return makeStuffAtPath(() => {
    const p = new TestPot();
    p.setShortDescription('a cook pot');
    p.setKeywords(['pot']);
    p.setCapabilities(['pot']);
    return p;
  }, `/stuff/thing/vessel/_cookpot-${seq}`) as TestPot;
}

function makeCauldron(material: Material): TestCauldron {
  seq += 1;
  const c = makeStuffAtPath(() => {
    const v = new TestCauldron();
    v.setShortDescription('a cauldron');
    v.setKeywords(['cauldron']);
    (v as unknown as { interiorBulk: boolean }).interiorBulk = true;
    v.setInteriorCapacity(Quantity.of(20, 'L'));
    return v;
  }, `/stuff/thing/vessel/_cauldron-${seq}`) as TestCauldron;
  const slot = c.getBulk();
  slot.setMaterial(material);
  slot.setAmount(Quantity.of(10, 'L'));
  return c;
}

function fire(fuelPct: number): Forge {
  return makeStuff(() => {
    const f = new Forge();
    f.setBurnTemperatureK(900);
    f.setReserve(
      new Reserve(
        'fuel',
        Quantity.of(100, '%'),
        Quantity.of(fuelPct, '%'),
        'combustion',
        null,
      ),
    );
    return f;
  });
}

let actor: TestActor;
let room: Location;
let now = 0;

async function stand(lit: boolean): Promise<void> {
  room = makeStuff(() => new Location());
  actor = makeStuff(() => new TestActor());
  await ContainmentApi.move(actor as never, room as never);
  await ContainmentApi.move(fire(lit ? 100 : 0) as never, room as never);
}

/** Run `boil`, then let the engaged step complete. */
async function boil(target: Stuff | null): Promise<CommandContext> {
  const ctx = CommandApi.createCommandContext({
    commandGiver: actor as never,
    location: room as never,
    commandText: 'boil pot',
    executionId: 't',
    commandId: 't',
    verb: 'boil',
    command: stubCommand,
  });
  const ctrl = makeStuff(() => new BoilController());
  await ctrl.execute(target === null ? ({} as never) : ({ target: ref(target) } as never), ctx);
  now += 60_000;
  WorldClockApi._advanceForTesting(60_000);
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  return ctx;
}

function refusal(ctx: CommandContext): string | null {
  const found = ctx.getNotes().find((n) => n.kind === 'controller-rejected') as
    | { reason?: string }
    | undefined;
  return found?.reason ?? null;
}

const contents = (pot: Receptacle | TestCauldron): string | null =>
  pot.getBulk().getMaterialPath();

beforeEach(async () => {
  installV1QuantityMarshallers();
  installV1QuantityTagTables();
  // `boil` is an ENGAGED step, so the scheduler and the event registry
  // have to be standing — the branch-fixtures harness's own setup.
  SchedulerApi._clearAllForTesting();
  const reg = await StuffApi.create(() => new EventRegistry());
  stampTemplatePathForTest(reg, '/platform/idea/EventRegistry');
  EventApi._setRegistryForTesting(reg);
  WorldClockApi._resetForTesting();
  now = 0;
  WorldClockApi._setNowProviderForTesting(() => now);
  WorldClockApi.setScale(1000);
  water(CLEAN, '', 0);
  water(FOUL, CLEAN, 12);
  water(LEADED, '', 40);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

describe('⭐ the COOKING case — a build remembers that it was boiled', () => {
  it('a cook pot latches the heat it reached and the method `boiled`', async () => {
    await stand(true);
    const pot = makePot();
    await ContainmentApi.move(pot as never, room as never);

    const ctx = await boil(pot);

    expect(refusal(ctx)).toBeNull();
    // ⭐ The two things a recipe's reverse-match reads. Without them no
    // recipe could ever require boiling, which is what made the first
    // cut of this verb useless to the cooking trade.
    expect(pot.getBuildMethod()).toBe('boiled');
    expect(pot.getHeatedToK()).toBeGreaterThan(0);
  });

  it('⚠ a cook pot is NOT Bulkable — the arg must not require it', async () => {
    await stand(true);
    const pot = makePot();
    // The regression the restructure exists to prevent: an arg gated on
    // BulkableMixin locks the cooking trade out of its own verb. A cook
    // pot is ManualBuild + Tool + Durable and holds no bulk at all.
    expect(MixinApi.isBulkable(pot)).toBe(false);
    expect(MixinApi.isBuildVessel(pot)).toBe(true);
    await ContainmentApi.move(pot as never, room as never);
    expect(refusal(await boil(pot))).toBeNull();
  });

  it('bare `boil` falls back to the build you are working, like `heat`', async () => {
    await stand(true);
    const pot = makePot();
    await ContainmentApi.move(pot as never, actor as never);
    const ctx = await boil(null);
    expect(refusal(ctx)).toBeNull();
    expect(pot.getBuildMethod()).toBe('boiled');
  });
});

describe('⭐ the WATER case — the material decides, not the verb', () => {
  it('a vessel of fouled water comes off clean', async () => {
    await stand(true);
    const pot = makeReceptacle(StuffApi.findByTemplatePath<Material>(FOUL)!);
    await ContainmentApi.move(pot as never, room as never);

    expect(contents(pot)).toBe(FOUL);
    await boil(pot);
    expect(contents(pot)).toBe(CLEAN);
  });

  it('⭐⭐ the shared MATERIAL row is untouched — every other river is unaffected', async () => {
    await stand(true);
    const a = makeReceptacle(StuffApi.findByTemplatePath<Material>(FOUL)!);
    const b = makeReceptacle(StuffApi.findByTemplatePath<Material>(FOUL)!);
    await ContainmentApi.move(a as never, room as never);
    await ContainmentApi.move(b as never, room as never);

    await boil(a);

    expect(contents(a)).toBe(CLEAN);
    expect(contents(b)).toBe(FOUL);
    expect(
      StuffApi.findByTemplatePath<Material>(FOUL)!.getToxicity(),
    ).toHaveLength(1);
  });

  it('the water it becomes carries NO toxin — the metabolism path sees nothing to dose', async () => {
    await stand(true);
    const pot = makeReceptacle(StuffApi.findByTemplatePath<Material>(FOUL)!);
    await ContainmentApi.move(pot as never, room as never);
    await boil(pot);
    expect(pot.getBulk().getMaterial()!.getToxicity()).toHaveLength(0);
  });

  it('⭐ a persistent contaminant boils to exactly itself, hotter — and is NOT refused', async () => {
    await stand(true);
    const pot = makeReceptacle(StuffApi.findByTemplatePath<Material>(LEADED)!);
    await ContainmentApi.move(pot as never, room as never);

    const ctx = await boil(pot);
    expect(refusal(ctx)).toBeNull(); // you really did boil it
    expect(contents(pot)).toBe(LEADED);
    expect(pot.getBulk().getMaterial()!.getToxicity()).toHaveLength(1);
  });
});

describe('⭐ a target that is BOTH gets both', () => {
  it('a cauldron of fouled water is purified AND records the step', async () => {
    await stand(true);
    const cauldron = makeCauldron(StuffApi.findByTemplatePath<Material>(FOUL)!);
    await ContainmentApi.move(cauldron as never, room as never);

    await boil(cauldron);

    expect(contents(cauldron)).toBe(CLEAN);
    expect(cauldron.getBuildMethod()).toBe('boiled');
    expect(cauldron.getHeatedToK()).toBeGreaterThan(0);
  });
});

describe('boiling needs something to boil, and a hot enough fire', () => {
  it('nothing to boil', async () => {
    await stand(true);
    expect(refusal(await boil(null))).toBe('no-vessel');
  });

  it('an empty vessel that is not a build', async () => {
    await stand(true);
    const pot = makeReceptacle(null);
    await ContainmentApi.move(pot as never, room as never);
    expect(refusal(await boil(pot))).toBe('empty-vessel');
  });

  it('a fire that is out', async () => {
    await stand(false);
    const pot = makeReceptacle(StuffApi.findByTemplatePath<Material>(FOUL)!);
    await ContainmentApi.move(pot as never, room as never);
    expect(refusal(await boil(pot))).toBe('no-heat');
    expect(contents(pot)).toBe(FOUL);
  });

  it('⚠ the threshold is the CONTENTS’ own boiling point, not a dial', async () => {
    await stand(true);
    const tar = makeStuffAtPath(() => {
      const m = new Material();
      m.setName('tar');
      m.setBoilingPoint(Quantity.of(5000, 'K'));
      m.setPurifiedByBoiling(CLEAN);
      return m;
    }, '/stuff/idea/material/_test/tar') as unknown as Material;
    const pot = makeReceptacle(tar);
    await ContainmentApi.move(pot as never, room as never);
    expect(refusal(await boil(pot))).toBe('insufficient-heat');
  });
});
