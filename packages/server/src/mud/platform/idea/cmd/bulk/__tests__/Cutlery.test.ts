/**
 * ⭐ **Cutlery reads; it never gates** (AC11a).
 *
 * `eat` claims the first clean utensil in reach, dirties it — so a spoon
 * goes round the same claim/soil/wash loop as a bowl — and says so. With
 * nothing to hand you eat with your fingers: same act, same nutrition,
 * different sentence.
 *
 * ⚠ The failure mode this suite exists to prevent is a utensil becoming a
 * requirement. Food you can only eat with the right implement is a lock
 * dressed up as flavour, and both readings are asserted to SUCCEED.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import EatController from "../EatController";
import { Creature } from "../../../../../lib/creature/Creature";
import { SensorMixin } from "../../../../../lib/message/Sensor";
import { CommandGiverMixin } from "../../../../../lib/command/CommandGiver";
import Thing from "../../../../../lib/stuff/Thing";
import Location from "../../../../../lib/stuff/Location";
import Material from "../../../../../lib/material/Material";
import CraftVessel from "../../../../thing/CraftVessel";
import { Stuff } from "../../../../../lib/stuff/Stuff";
import { Quantity } from "../../../../../lib/quantity";
import { StuffApi } from "../../../../../api/stuff";
import { ContainmentApi } from "../../../../../api/containment";
import { MessageApi } from "../../../../../api/message";
import { Mml } from "../../../../../api/mml";
import { CommandApi, type CommandContext } from "../../../../../api/command";
import { CommandDefinition } from "../../../../../lib/command/CommandDefinition";
import type { MqlOneResult } from "../../../../../api/mql";
import { METABOLIC_DEFAULTS } from "../../../../../lib/metabolism/Metabolic";
import { UTENSIL_KINDS } from "../../../../../lib/bulk/Utensil";
import { MetabolicMixin } from "../../../../../lib/metabolism/Metabolic";
import { Idea } from "../../../../../lib/stuff/Idea";
import { existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../../../../lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers";

class TestEater extends SensorMixin(CommandGiverMixin(Creature)) {
  static _mixinName = "TestEaterCutlery";
}

const APPLE = "/stuff/idea/material/_test/cutlery-apple";

let self: string | null;
let peers: string | null;

/**
 * ⚠ Render at CAPTURE time, which is what `Scene.send` does. `eat`
 * destructs the food right after the scene, and a lazily-composed
 * `Mml.thing(target)` stringified afterwards is naming a destroyed Stuff.
 */
function captureScene(): void {
  self = null;
  peers = null;
  vi.spyOn(MessageApi, "scene").mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (body: Mml) => {
      self = body.toString();
      return b;
    };
    b.toPeers = (body: Mml) => {
      peers = body.toString();
      return b;
    };
    b.send = () => {};
    return b as never;
  });
}

function apple(loc: Stuff): Stuff {
  const t = makeStuff(() => new Thing());
  t.setShortDescription("an apple");
  t.setMaterial(
    StuffApi.findByTemplatePath<Material>(APPLE) as unknown as Material,
  );
  ContainmentApi.move(t as never, loc as never);
  return t as unknown as Stuff;
}

/** A utensil: a `CraftVessel` whose `category` is a utensil kind. */
function utensil(kind: string, where: Stuff): CraftVessel {
  const u = makeStuff(() => new CraftVessel());
  u.setCategory(kind);
  u.setShortDescription(`a ${kind}`);
  ContainmentApi.move(u as never, where as never);
  return u;
}

function ctxFor(actor: Stuff, loc: Stuff): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: actor as never,
    location: loc as never,
    commandText: "eat",
    executionId: "test",
    commandId: "test",
    verb: "eat",
    command: CommandDefinition.fromYaml(
      "verbs: [eat]\ncontroller: NoopController\ndescription: stub\n",
      "<test>",
    ),
  });
}

const one = (stuff: Stuff | null, raw: string): MqlOneResult =>
  ({ stuff, raw }) as MqlOneResult;

describe("eating with cutlery (AC11a)", () => {
  let eater: TestEater;
  let loc: Stuff;

  beforeEach(() => {
    installV1QuantityMarshallers();
    StuffApi.clearAll();
    captureScene();
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName("apple");
      m.setAppearance("an apple");
      m.setEdibility(true);
      m.setNutrients(["sugar"]);
      return m;
    }, APPLE);
    loc = makeStuff(() => new Location()) as unknown as Stuff;
    eater = makeStuff(() => new TestEater());
    (eater as unknown as { setName(n: string): void }).setName("bob");
    ContainmentApi.move(eater as never, loc as never);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  async function eat(target: Stuff): Promise<void> {
    await makeStuff(() => new EatController()).execute(
      { target: one(target, "apple") } as never,
      ctxFor(eater as unknown as Stuff, loc),
    );
  }

  it("⭐ with a spoon on the table: the act succeeds and the scene says so", async () => {
    const spoon = utensil("spoon", loc);
    await eat(apple(loc));
    expect(eater.solidVolume).toBeCloseTo(METABOLIC_DEFAULTS.EAT_PORTION_LITRES);
    expect(self!).toContain("with a spoon");
    expect(peers!).toContain("with a spoon");
    // …and the spoon is dirty, which is what puts it in the wash loop.
    expect(spoon.isSoiled()).toBe(true);
    expect(spoon.isClaimable()).toBe(false);
  });

  it("⭐ with NOTHING to hand: the same act succeeds, said differently", async () => {
    await eat(apple(loc));
    expect(eater.solidVolume).toBeCloseTo(METABOLIC_DEFAULTS.EAT_PORTION_LITRES);
    expect(self!).toContain("with your fingers");
    expect(peers!).toContain("with their fingers");
  });

  it("a carried utensil counts — held kit is reach", async () => {
    utensil("spoon", eater as unknown as Stuff);
    await eat(apple(loc));
    expect(self!).toContain("with a spoon");
  });

  it("a SOILED utensil is passed over — you do not eat off a dirty spoon", async () => {
    const dirty = utensil("spoon", loc);
    dirty.soil();
    await eat(apple(loc));
    expect(self!).toContain("with your fingers");

    // Wash it and it is back in the pool.
    dirty.wash();
    await eat(apple(loc));
    expect(self!).toContain("with a spoon");
  });

  it("the preference order is the vocabulary's order", async () => {
    expect([...UTENSIL_KINDS]).toEqual(["spoon", "fork", "table-knife"]);
    utensil("table-knife", loc);
    utensil("fork", loc);
    await eat(apple(loc));
    // A fork beats a table knife; a spoon would have beaten both.
    expect(self!).toContain("with a fork");
  });

  it("⚠ a bowl is not cutlery — the vessel kinds do not leak into the utensils", async () => {
    utensil("bowl", loc);
    await eat(apple(loc));
    expect(self!).toContain("with your fingers");
  });
});

describe('⚠⚠ the verbs are actually AFFORDED (the binder, not the controller)', () => {
  it('a body with a digestion buffer offers `eat` and `vomit`', () => {
    // ⭐ This is the assertion whose absence let both verbs ship
    // unreachable: every other test in the suite instantiates
    // `EatController` directly, which skips the binder entirely. A live
    // drive typed `eat stew` at a bowl of stew and the world answered
    // "I don't understand 'eat'".
    const contributed = (
      MetabolicMixin(Idea) as unknown as {
        commandContributions?: { self?: string[] };
      }
    ).commandContributions?.self;
    expect(contributed).toContain('platform/cmd/bulk/eat.yaml');
    expect(contributed).toContain('platform/cmd/bulk/vomit.yaml');
  });

  it('…and the shipped views those names point at exist', () => {
    const views = join(
      fileURLToPath(new URL('../../../../../../../../', import.meta.url)),
      'content/platform/content/platform/cmd/bulk',
    );
    expect(existsSync(join(views, 'eat.yaml'))).toBe(true);
    expect(existsSync(join(views, 'vomit.yaml'))).toBe(true);
  });
});

describe('⭐ eating a MEAL out of the dish it came in', () => {
  /** A served dish: a bulk vessel holding an edible blend. */
  function servedDish(loc: Stuff): CraftVessel {
    const d = makeStuff(() => new CraftVessel());
    (d as unknown as { interiorBulk: boolean }).interiorBulk = true;
    d.setInteriorCapacity(Quantity.of(1, 'L'));
    d.setCategory('bowl');
    d.setShortDescription('a bowl');
    // The slot's material by PATH — the shape every bulk fixture in the
    // suite uses; `setMaterial` needs a live singleton to read a path off.
    (d as unknown as { interiorMaterial: string }).interiorMaterial = APPLE;
    const slot = d.getBulk('interior');
    slot.setAmount(Quantity.of(0.4, 'L'));
    slot.setPayload({
      name: 'hearty stew',
      appearance: 'a thick brown stew',
      nutrients: ['carb'],
      nutrientAmounts: { carb: 34000 },
      toxicity: [],
      edible: true,
    });
    ContainmentApi.move(d as never, loc as never);
    return d;
  }

  let eater2: TestEater;
  let loc2: Stuff;

  // ⚠ Its OWN setup: this describe sits outside the first one, so the
  // material registration and the scene capture up there never ran for
  // it — which read as "the feature is broken" when the fixture simply
  // had no world.
  beforeEach(() => {
    installV1QuantityMarshallers();
    StuffApi.clearAll();
    captureScene();
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName('apple');
      m.setAppearance('an apple');
      m.setEdibility(true);
      m.setNutrients(['carb']);
      return m;
    }, APPLE);
    loc2 = makeStuff(() => new Location()) as unknown as Stuff;
    eater2 = makeStuff(() => new TestEater());
    (eater2 as unknown as { setName(n: string): void }).setName('ann');
    ContainmentApi.move(eater2 as never, loc2 as never);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⚠ the meal is eaten and the DISH survives — a bowl to wash, not a bowl destroyed', async () => {
    // The live drive typed `eat stew` at a bowl of stew and heard "you
    // can't eat a bowl". A cooked meal is a blend inside a claimed dish,
    // so the vessel IS what `eat` resolves to.
    const dish = servedDish(loc2);
    await makeStuff(() => new EatController()).execute(
      { target: one(dish as unknown as Stuff, 'stew') } as never,
      ctxFor(eater2 as unknown as Stuff, loc2),
    );
    expect(eater2.solidVolume).toBeGreaterThan(0);
    expect((eater2.digestionPools.carb ?? 0)).toBeGreaterThan(0);
    expect(dish.isDestroyed()).toBe(false);
    expect(dish.getBulk('interior').getAmount().rawValue()).toBeCloseTo(0, 6);
  });

  it('and cutlery narrates on this arm too', async () => {
    utensil('spoon', loc2);
    await makeStuff(() => new EatController()).execute(
      { target: one(servedDish(loc2) as unknown as Stuff, 'stew') } as never,
      ctxFor(eater2 as unknown as Stuff, loc2),
    );
    expect(self!).toContain('with a spoon');
  });
});
