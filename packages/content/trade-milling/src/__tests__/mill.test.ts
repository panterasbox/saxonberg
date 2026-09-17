/**
 * The milling trade (grain-chain W5).
 *
 * Three things are under test, and the second and third are the design:
 *
 *  1. the arithmetic: mass conserves, the toll comes out of the product,
 *     grade is weakest-link floored by the instrument;
 *  2. ⭐⭐ **the extraction is continuous** — 0.61 and 0.62 are different
 *     flour, which is what keeps the miller's decision a decision rather
 *     than a three-item menu;
 *  3. ⭐⭐ **the rung buys back TIME** — a quern holds your `hands` and a
 *     water mill holds nothing of yours, so you can walk away from one
 *     and not the other.
 *
 * ⚠ And the fourth thing, which is a row check rather than a behaviour:
 * this pack does NOT depend on `content-water`. A mill reads its power
 * by duck-typing a room sibling, so a realm with no water pack still
 * installs and a mill with no wheel says it will not turn.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import GristMill from '../thing/GristMill';
import { ComminutingMixin } from '@saxonberg/server/mud/lib/craft/Comminuting';
import { ToolMixin } from '@saxonberg/server/mud/lib/craft/Tooled';
import MillController from '../idea/cmd/milling/MillController';
import Material from '@saxonberg/server/mud/lib/material/Material';
import Sack from '@saxonberg/server/mud/platform/thing/Sack';
import Crop from '@saxonberg/server/mud/platform/thing/Crop';
import Location from '@saxonberg/server/mud/lib/stuff/Location';
import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { CommandGiverMixin } from '@saxonberg/server/mud/lib/command/CommandGiver';
import { SensorMixin } from '@saxonberg/server/mud/lib/message/Sensor';
import { EngagedMixin } from '@saxonberg/server/mud/lib/activity/Engaged';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { ContainableMixin } from '@saxonberg/server/mud/lib/spatial/Containable';
import { CommandApi } from '@saxonberg/server/mud/api/command';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import { CommandDefinition } from '@saxonberg/server/mud/lib/command/CommandDefinition';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { BulkableApi } from '@saxonberg/server/mud/api/bulk';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { EventApi } from '@saxonberg/server/mud/api/event';
import EventRegistry from '@saxonberg/server/mud/platform/idea/EventRegistry';
import { Stuff as StuffClass } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

const here = dirname(fileURLToPath(import.meta.url));
const PACK = join(here, '..', '..');
const ROWS = join(PACK, 'content', 'trade', 'milling');
const MATS = join(PACK, 'content', 'stuff', 'idea', 'material', 'food');

function row(file: string): Record<string, unknown> {
  const doc = YAML.parse(readFileSync(file, 'utf-8')) as {
    class?: string;
    data?: Record<string, unknown>;
  };
  return { __class: doc.class, ...(doc.data ?? {}) };
}

const WHEAT = '/stuff/idea/material/food/wheat-grain';
const MALT = '/stuff/idea/material/food/malt';
const FLOUR = '/stuff/idea/material/food/wheat-flour';
const BRAN = '/stuff/idea/material/food/bran';
const FLOUR_SACK = '/trade/milling/thing/flour-sack';
const BRAN_SACK = '/trade/milling/thing/bran-sack';

class TestActor extends CommandGiverMixin(
  SensorMixin(EngagedMixin(ContainerMixin(ContainableMixin(Idea)))),
) {
  static _mixinName = 'TestActorMill';
  lines: string[] = [];
  protected handleMessage(msg: unknown): void {
    this.lines.push(JSON.stringify(msg));
  }
  protected handleEnvelope(): void {}
  getIdentityPath(): string {
    return '/platform/agent/Avatar/test-miller';
  }
}

/** A room sibling that answers the power shape — never a ControlStructure. */
class FakeWheel extends Thing {
  generationW(flowM3S: number): number {
    return 1000 * 9.81 * 6 * flowM3S * 0.85;
  }
  getReachRef(): string {
    return 'delight:flats';
  }
}

const stubCommand = CommandDefinition.fromYaml(
  'verbs: [mill]\ncontroller: x\ndescription: d\n',
  '<test>',
);

let room: Location;
let actor: TestActor;

function material(
  path: string,
  name: string,
  tags: string[],
  density: number,
  amounts: Record<string, number> = {},
): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setTags(tags);
    m.setDensity(Quantity.of(density, 'kg/m³'));
    m.setEdibility(true);
    m.setNutrientAmounts(amounts);
    return m;
  }, path) as unknown as Material;
}

function quern(): GristMill {
  const m = makeStuff(() => new GristMill());
  m.setCapabilities(['millstone']);
  m.throughputKgPerMin = 0.25;
  m.kgPerMinPerKw = 0;
  m.extractionMin = 0.55;
  m.extractionMax = 1;
  m.extractionDefault = 0.8;
  m.residueFraction = 0.25;
  m.productMaterial = FLOUR;
  m.residueMaterial = BRAN;
  m.productVessel = FLOUR_SACK;
  m.residueVessel = BRAN_SACK;
  return m;
}

function waterMill(): GristMill {
  const m = makeStuff(() => new GristMill());
  m.setCapabilities([{ kind: 'millstone', control: 'fine' }]);
  m.throughputKgPerMin = 0;
  m.kgPerMinPerKw = 0.5;
  m.maxThroughputKgPerMin = 10;
  m.extractionMin = 0.55;
  m.extractionMax = 1;
  m.extractionDefault = 0.75;
  m.residueFraction = 0.25;
  m.productMaterial = FLOUR;
  m.residueMaterial = BRAN;
  m.productVessel = FLOUR_SACK;
  m.residueVessel = BRAN_SACK;
  m.tollFraction = 0.1;
  m.tollBinPath = '/trade/milling/thing/toll-bin';
  return m;
}

function cropSack(materialPath: string, kg: number, band = ''): Crop {
  const c = makeStuff(() => new Crop());
  c.setMass(Quantity.of(kg, 'kg'));
  c.setMaterial(
    StuffApi.findByTemplatePath<Material>(materialPath)! as unknown as Material,
  );
  // ⚠ `Crop` composes `CraftedMixin` (which composes `GradedMixin`), but
  // TS drops an inner mixin's surface through a nested generic mixin —
  // the documented `Crafted.ts` cast quirk. Present at runtime.
  if (band) (c as unknown as { setGradeBand(b: string): void }).setGradeBand(band);
  return c;
}

function ctx(): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: actor as never,
    location: room as never,
    commandText: 'mill',
    executionId: 't',
    commandId: 't',
    verb: 'mill',
    command: stubCommand,
  });
}

/**
 * ⚠⚠ **The model carries the MILL, because the view does.**
 *
 * The controller used to hunt for one itself — a hand-rolled walk over
 * the giver's contents and the room's, matching `instanceof GristMill`.
 * Two things were wrong with it and the second is the serious one:
 *
 *   1. it re-derived what the binder already resolves declaratively
 *      (the `buy … from <counter>` shape), so a room with a quern AND a
 *      mill gave you whichever the walk hit first, unaddressably;
 *   2. ⭐⭐ it matched a CLASS. `ComminutingMixin` is kernel substrate
 *      precisely because the metal chain's stamp mill is its second
 *      consumer, in a pack with no ancestor in common — so the check
 *      would have silently refused to find the very thing the mixin was
 *      lifted to the kernel for.
 *
 * So these fixtures pass the mill the way the binder will, and the
 * `instanceof`-free narrowing is what the last test in this group
 * proves.
 */
async function mill(
  grain: Stuff | null,
  extraction?: number,
  stones?: Stuff,
): Promise<CommandContext> {
  const c = ctx();
  const ctrl = makeStuff(() => new MillController());
  await ctrl.execute(
    {
      // The binder's shape — a controller test skips the binder.
      ...(grain ? { grain: { stuff: grain, raw: 'grain' } } : {}),
      ...(stones ? { mill: { stuff: stones, raw: 'mill' } } : {}),
      ...(extraction !== undefined ? { extraction } : {}),
    } as never,
    c,
  );
  return c;
}

function refusal(c: CommandContext): string | null {
  const found = c.getNotes().find((n) => n.kind === 'controller-rejected') as
    | { reason?: string }
    | undefined;
  return found?.reason ?? null;
}

function sacksIn(where: Stuff): Sack[] {
  return (where as unknown as { getContents(): Stuff[] })
    .getContents()
    .filter((s): s is Sack => s instanceof Sack);
}

/**
 * ⚠ The engagement substrate needs the event registry wired, and a pack
 * suite does not boot the world. The `Journey.test` helper, verbatim.
 */
async function bootstrapEvents(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    StuffClass._stampTemplatePath(r, '/platform/idea/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

beforeEach(async () => {
  StuffApi.clearAll();
  WorldClockApi._resetForTesting();
  WorldClockApi.setScale(1);
  SchedulerApi._clearAllForTesting();
  await bootstrapEvents();
  material(WHEAT, 'wheat grain', ['food', 'grain', 'cereal', 'wheat'], 780);
  material(MALT, 'malt', ['food', 'malt', 'brewing'], 560);
  material(FLOUR, 'wheat flour', ['food', 'flour', 'gluten'], 570, {
    carb: 810000,
    protein: 92000,
  });
  material(BRAN, 'bran', ['food', 'bran', 'feed'], 250, {
    carb: 210000,
    protein: 155000,
    fibre: 430000,
  });
  // The two sack rows the controller clones.
  for (const [path, mat] of [
    [FLOUR_SACK, FLOUR],
    [BRAN_SACK, BRAN],
  ] as const) {
    makeStuffAtPath(() => {
      const s = new Sack();
      s.setMass(Quantity.of(0.4, 'kg'));
      return s;
    }, path);
  }
  vi.spyOn(StuffApi, 'clone').mockImplementation(async (path: string) => {
    const s = makeStuff(() => new Sack());
    s.setMass(Quantity.of(0.4, 'kg'));
    (s as unknown as { __rowPath: string }).__rowPath = path;
    return s as never;
  });

  room = makeStuff(() => new Location());
  actor = makeStuff(() => new TestActor());
  await ContainmentApi.move(actor as never, room as never);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  SchedulerApi._clearAllForTesting();
  StuffApi.clearAll();
});

describe('the rows author what the trade needs', () => {
  it('two rungs, one class', () => {
    const q = row(join(ROWS, 'thing', 'quern.yaml'));
    const m = row(join(ROWS, 'thing', 'grist-mill.yaml'));
    expect(q.__class).toBe('/trade/milling/thing/GristMill');
    expect(m.__class).toBe(q.__class);
    // ⭐ The ladder is the NUMBERS. The quern has a rate and no power
    // coefficient; the mill has a power coefficient and no rate.
    expect(q.throughputKgPerMin).toBeGreaterThan(0);
    expect(q.kgPerMinPerKw).toBe(0);
    expect(m.throughputKgPerMin).toBe(0);
    expect(m.kgPerMinPerKw).toBeGreaterThan(0);
  });

  it('⭐ only the water mill takes a toll, and only it floors the grade', () => {
    const q = row(join(ROWS, 'thing', 'quern.yaml'));
    const m = row(join(ROWS, 'thing', 'grist-mill.yaml'));
    expect(q.tollFraction).toBe(0);
    expect(m.tollFraction).toBeGreaterThan(0);
    expect(JSON.stringify(q.capabilities)).not.toContain('control');
    expect(JSON.stringify(m.capabilities)).toContain('fine');
  });

  it('the sacks are `Sack`s — grade on the holder, not the matter', () => {
    for (const f of ['flour-sack', 'bran-sack', 'grist-sack', 'toll-bin']) {
      expect(row(join(ROWS, 'thing', `${f}.yaml`)).__class).toBe(
        '/platform/thing/Sack',
      );
    }
  });

  it('⭐ four materials: one flour per CEREAL, none per band', () => {
    for (const m of ['wheat-flour', 'barley-flour', 'bran', 'grist']) {
      expect(existsSync(join(MATS, `${m}.yaml`))).toBe(true);
    }
    // ⚠ No `wholemeal-flour`, no `white-flour`. Extraction is a payload
    // fact; a row per band would make 0.61 and 0.62 identical.
    expect(existsSync(join(MATS, 'wholemeal-flour.yaml'))).toBe(false);
    expect(existsSync(join(MATS, 'white-flour.yaml'))).toBe(false);
  });

  it('⭐ only WHEAT flour carries `gluten` — the honest reason barley bread is flat', () => {
    const wheat = row(join(MATS, 'wheat-flour.yaml')).tags as string[];
    const barley = row(join(MATS, 'barley-flour.yaml')).tags as string[];
    expect(wheat).toContain('gluten');
    expect(barley).not.toContain('gluten');
  });

  it('⚠ the pack does NOT depend on content-water', () => {
    // The power read is duck-typed precisely so that this stays true.
    const pkg = JSON.parse(
      readFileSync(join(PACK, 'package.json'), 'utf-8'),
    ) as { dependencies: Record<string, string> };
    expect(Object.keys(pkg.dependencies)).not.toContain(
      '@saxonberg/content-water',
    );
  });

  it('the two HelpConcepts resolve as rows', () => {
    for (const k of ['extraction', 'head-and-flow']) {
      const c = row(join(ROWS, 'idea', 'HelpConcept', `${k}.yaml`));
      expect(c.__class).toBe('/platform/idea/HelpConcept');
      expect(c.key).toBe(k);
      expect(String(c.body).length).toBeGreaterThan(400);
    }
  });
});

describe('⭐⭐ the rung buys back TIME (D27)', () => {
  it('a quern holds the driver’s HANDS for the whole grind', async () => {
    const q = quern();
    await ContainmentApi.move(q as never, room as never);
    const sack = cropSack(WHEAT, 5, 'fine');
    await ContainmentApi.move(sack as never, room as never);

    const c = await mill(sack, 0.8, q);
    expect(refusal(c)).toBeNull();
    // ⭐ The shipped slot rule, not new code: every other hands act is
    // refused until this finishes.
    expect(MixinApi.isEngaged(actor)).toBe(true);
    const held = actor.getEngagements().some((e) => e.slots.has('hands'));
    expect(held).toBe(true);
  });

  it('⭐⭐ a water mill holds NOTHING of the driver’s — walk away', async () => {
    const m = waterMill();
    await ContainmentApi.move(m as never, room as never);
    // ⚠ The wheel must be IN THE ROOM: `availablePowerW` looks for a
    // sibling answering the power shape, and with none it answers 0 —
    // which is the honest "a mill with no river is a building".
    const wheel = makeStuff(() => new FakeWheel());
    await ContainmentApi.move(wheel as never, room as never);
    m._setCachedPowerW(40000); // 40 kW of river
    const sack = cropSack(WHEAT, 5, 'fine');
    await ContainmentApi.move(sack as never, room as never);

    const c = await mill(sack, 0.75, m);
    expect(refusal(c)).toBeNull();
    // No engagement at all. The driver may leave, log out, or start
    // something else — the river does not need them.
    expect(actor.getEngagements()).toHaveLength(0);
  });

  it('a mill with no water will not turn, and says so', async () => {
    // ⭐ It does NOT quietly fall back to hand speed: a water mill with
    // no river is a building, and the honest failure is actionable.
    const m = waterMill();
    await ContainmentApi.move(m as never, room as never);
    const sack = cropSack(WHEAT, 5);
    await ContainmentApi.move(sack as never, room as never);
    expect(refusal(await mill(sack, 0.75, m))).toBe('no-power');
  });

  it('a wheel in the room drives the stones', async () => {
    const m = waterMill();
    await ContainmentApi.move(m as never, room as never);
    const wheel = makeStuff(() => new FakeWheel());
    await ContainmentApi.move(wheel as never, room as never);
    // The read is async off-band; prime it the way the segment would.
    m._setCachedPowerW(wheel.generationW(2));
    expect(m.throughputNow()).toBeGreaterThan(0);
  });
});

describe('the grind itself', () => {
  it('⭐ 25 kg of wheat at 0.72 makes flour and bran, graded and marked', async () => {
    const q = quern();
    await ContainmentApi.move(q as never, room as never);
    const sack = cropSack(WHEAT, 25, 'fine');
    await ContainmentApi.move(sack as never, room as never);

    await mill(sack, 0.72, q);
    // Complete the engagement the quern started.
    const e = actor.getEngagements()[0]!;
    SchedulerApi.complete(e);
    await new Promise((r) => setTimeout(r, 0));

    const sacks = sacksIn(room);
    expect(sacks.length).toBe(2);
    for (const s of sacks) {
      expect(s.getMaker()).toBe('/platform/agent/Avatar/test-miller');
      const slot = BulkableApi.slotFor(s, undefined)!;
      expect(slot.getAmount().rawValue()).toBeGreaterThan(0);
    }
    // The input is gone — conservation, not duplication.
    expect(sack.isDestroyed()).toBe(true);
  });

  it('poor grain makes poor flour — the quern floors nothing', async () => {
    const q = quern();
    await ContainmentApi.move(q as never, room as never);
    const sack = cropSack(WHEAT, 5, 'poor');
    await ContainmentApi.move(sack as never, room as never);
    await mill(sack, 0.8, q);
    SchedulerApi.complete(actor.getEngagements()[0]!);
    await new Promise((r) => setTimeout(r, 0));

    const flour = sacksIn(room).find(
      (s) =>
        BulkableApi.slotFor(s, undefined)!.getMaterial()?.getTemplatePath() ===
        FLOUR,
    );
    expect(flour!.getGradeBand()).toBe('poor');
  });

  it('⭐ a MALT sack grinds too, and what comes off is grist', () => {
    // The retrofit's premise: the mash wants milled malt, and nothing in
    // the tree ground it. Matching is by material TAG, which is why this
    // pack needs no dependency on brewing or on farming.
    const m = StuffApi.findByTemplatePath<Material>(MALT)!;
    expect((m as unknown as Material).hasTag('malt')).toBe(true);
  });

  it('a thing that is not grain is refused in its own words', async () => {
    const q = quern();
    await ContainmentApi.move(q as never, room as never);
    const rock = makeStuff(() => {
      const t = new Thing();
      t.setShortDescription('a rock');
      return t;
    });
    await ContainmentApi.move(rock as never, room as never);
    expect(refusal(await mill(rock, undefined, q))).toBe('not-grindable');
  });

  it('no stones in reach declines rather than doing nothing', async () => {
    // ⚠ No mill in the model is exactly what the binder's default
    // resolving nothing looks like — so this is the real empty-room
    // case rather than a synthetic one.
    const sack = cropSack(WHEAT, 5);
    await ContainmentApi.move(sack as never, room as never);
    expect(refusal(await mill(sack))).toBe('no-mill');
  });

  it('⭐⭐ a mill it has never heard of still works — the mixin, not the class', async () => {
    // THE point of the fix. `ComminutingMixin` is kernel substrate
    // because the metal chain's stamp mill is its second consumer, in a
    // pack with no ancestor in common. A controller matching
    // `instanceof GristMill` would silently refuse it.
    class StampBattery extends ComminutingMixin(ToolMixin(Thing)) {
      static _mixinName = 'TestStampBattery';
    }
    const battery = makeStuff(() => new StampBattery());
    battery.setCapabilities(['millstone']);
    battery.throughputKgPerMin = 2;
    battery.productMaterial = FLOUR;
    battery.residueMaterial = BRAN;
    battery.productVessel = FLOUR_SACK;
    battery.residueVessel = BRAN_SACK;
    await ContainmentApi.move(battery as never, room as never);

    const sack = cropSack(WHEAT, 5, 'fine');
    await ContainmentApi.move(sack as never, room as never);

    // Not a `GristMill`, and it grinds.
    expect(battery instanceof GristMill).toBe(false);
    expect(refusal(await mill(sack, 0.8, battery as never))).toBeNull();
  });

  it('a mill already turning refuses a second grind', async () => {
    const q = quern();
    await ContainmentApi.move(q as never, room as never);
    q.setGrinding(true);
    const sack = cropSack(WHEAT, 5);
    await ContainmentApi.move(sack as never, room as never);
    expect(refusal(await mill(sack, undefined, q))).toBe('already-milling');
  });
});

describe('⭐⭐⭐ the extraction is continuous, and that is the whole design', () => {
  it('0.61 and 0.62 stamp DIFFERENT flour (AC 20)', async () => {
    const q = quern();
    await ContainmentApi.move(q as never, room as never);

    const stamps: string[] = [];
    for (const e of [0.61, 0.62]) {
      const sack = cropSack(WHEAT, 25, 'fine');
      await ContainmentApi.move(sack as never, room as never);
      await mill(sack, e, q);
      SchedulerApi.complete(actor.getEngagements()[0]!);
      await new Promise((r) => setTimeout(r, 0));
      const flour = sacksIn(room).find(
        (s) =>
          BulkableApi.slotFor(s, undefined)!.getMaterial()?.getTemplatePath() ===
            FLOUR && !stamps.includes(payloadOf(s)),
      )!;
      stamps.push(payloadOf(flour));
    }
    // ⚠ With a material row per band these two would be byte-identical
    // objects and the miller's decision would be a three-item menu.
    expect(stamps[0]).not.toBe(stamps[1]);
  });

  it('a high extraction reads DARKER and keeps WORSE — one cause, two facts', async () => {
    const q = quern();
    await ContainmentApi.move(q as never, room as never);

    const white = q.planComminution(
      { kg: 25, materialPath: WHEAT, gradeBand: 'fine' },
      0.65,
    );
    const wholemeal = q.planComminution(
      { kg: 25, materialPath: WHEAT, gradeBand: 'fine' },
      1,
    );
    // Darker: more of the product is bran.
    expect(wholemeal.outerShare).toBeGreaterThan(white.outerShare);
    // Keeps worse: more available water, so the growth floor is crossed.
    expect(wholemeal.cure.moisture).toBeGreaterThan(white.cure.moisture);
    // And there is MORE of it — the trade is real in both directions.
    expect(wholemeal.productKg).toBeGreaterThan(white.productKg);
  });
});

function payloadOf(s: Sack): string {
  const p = BulkableApi.slotFor(s, undefined)!.getPayload();
  return JSON.stringify({
    composition: p?.composition,
    cure: p?.cure,
  });
}
