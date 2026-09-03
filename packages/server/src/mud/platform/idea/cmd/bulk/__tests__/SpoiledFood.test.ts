/**
 * ⭐ The spoilage → poisoning drive-through, end to end and through the
 * real verbs: a ration left out grows a microbial load, `eat` folds the
 * dose its load has earned into the digestion pools, the pool absorbs into
 * the ptomaine burden, the burden bands into `food-poisoning`, and `vomit`
 * inside the absorption window dumps what has not absorbed yet.
 *
 * Nothing here authors a poison. The only inputs are a real spoilage
 * activation energy on the material and the passage of game-time.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import EatController from "../EatController";
import VomitController from "../VomitController";
import { Creature } from "../../../../../lib/creature/Creature";
import { SensorMixin } from "../../../../../lib/message/Sensor";
import { CommandGiverMixin } from "../../../../../lib/command/CommandGiver";
import Condition from "../../../Condition";
import Provision from "../../../../thing/Provision";
import Location from "../../../../../lib/stuff/Location";
import Material from "../../../../../lib/material/Material";
import { Stuff } from "../../../../../lib/stuff/Stuff";
import { Quantity } from "../../../../../lib/quantity";
import { StuffApi } from "../../../../../api/stuff";
import { ContainmentApi } from "../../../../../api/containment";
import { WorldClockApi } from "../../../../../api/worldclock";
import "../../../WorldClockRegistry";
import { CommandApi, type CommandContext } from "../../../../../api/command";
import { CommandDefinition } from "../../../../../lib/command/CommandDefinition";
import type { MqlOneResult } from "../../../../../api/mql";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../../../../lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers";

class TestEater extends SensorMixin(CommandGiverMixin(Creature)) {
  static _mixinName = "TestEaterSpoiled";
}

const PTOMAINE_PATH = "/platform/idea/Condition/metabolism/ptomaine";
const RATION = "/stuff/idea/material/_test/spoil-ration";

const HOUR = 3600;
const DAY = 24 * HOUR;
const BASE = 1_000_000;

// Game-time is driven directly; `advance` walks the metabolic reconcile.
let now = BASE;
const setNow = (s: number): void => {
  now = BASE + s;
};
function advance(c: Creature, gameSec: number, chunkSec = 3000): void {
  let remaining = gameSec;
  while (remaining > 0) {
    const s = Math.min(chunkSec, remaining);
    now += s;
    c.getReserve("endurance");
    remaining -= s;
  }
}

/**
 * ⚠ The `ptomaine` behavior fixture MIRRORS the shipped seed
 * (`platform/content/platform/idea/Condition/metabolism/ptomaine.yaml`).
 * A kernel test never names shipped content, so the numbers are restated
 * here; `ConditionCatalogue.test.ts` is what pins the real roster.
 */
function ensurePtomaine(): void {
  if (StuffApi.findByTemplatePath(PTOMAINE_PATH)) return;
  makeStuffAtPath(() => {
    const c = new Condition();
    c.setName("food-poisoning");
    c.setToxinBehavior({
      toxinType: "ptomaine",
      absorptionRate: 4,
      clearanceRate: 0.02,
      potency: 1,
      bands: [
        { threshold: 2, severity: 1 },
        { threshold: 6, severity: 2 },
        { threshold: 12, severity: 3 },
      ],
    });
    return c;
  }, PTOMAINE_PATH);
}

function rationMaterial(): Material {
  const found = StuffApi.findByTemplatePath<Material>(RATION);
  if (found) return found;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName("ration");
    m.setKeywords(["ration"]);
    m.setAppearance("a dry ration");
    m.setEdibility(true);
    m.setNutrients(["carb"]);
    m.setNutrientAmounts({ carb: 18000 });
    m.setSpecificHeat(Quantity.of(2000, "J/(kg·K)"));
    // Real perishable constants — nothing else makes this food poisonous.
    m.setSpoilActivationEnergy(Quantity.of(80_000, "J/mol"));
    m.setWaterActivity(0.97);
    return m;
  }, RATION) as unknown as Material;
}

function ration(tempK: number): Provision {
  return makeStuff(() => {
    const p = new Provision();
    p.setShortDescription("a ration");
    p.setMass(Quantity.of(0.3, "kg"));
    p.setMaterial(rationMaterial());
    p.setStampedTemperatureK(tempK);
    p.setLastAmbientK(tempK);
    return p;
  });
}

function ctxFor(actor: Stuff, loc: Stuff, verb: string): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: actor as never,
    location: loc as never,
    commandText: verb,
    executionId: "test",
    commandId: "test",
    verb,
    command: CommandDefinition.fromYaml(
      `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
      "<test>",
    ),
  });
}

const one = (stuff: Stuff | null, raw: string): MqlOneResult =>
  ({ stuff, raw }) as MqlOneResult;

function severity(c: Creature): number {
  const rec = c
    .getConditions()
    .find((x) => x.kind === "affliction" && x.templatePath === PTOMAINE_PATH);
  return rec && rec.kind === "affliction" ? rec.stage : -1;
}

describe("spoiled food poisons — the whole reach", () => {
  let eater: TestEater;
  let loc: Stuff;

  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    now = BASE;
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
    ensurePtomaine();
    loc = makeStuff(() => new Location()) as unknown as Stuff;
    eater = makeStuff(() => new TestEater());
    (eater as unknown as { setName(n: string): void }).setName("bob");
    ContainmentApi.move(eater as never, loc as never);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it("a FRESH ration poisons nobody", async () => {
    const item = ration(293);
    ContainmentApi.move(item as never, loc as never);
    await makeStuff(() => new EatController()).execute(
      { target: one(item as unknown as Stuff, "ration") } as never,
      ctxFor(eater, loc, "eat"),
    );
    expect(eater.digestionPools.ptomaine ?? 0).toBe(0);
    expect(eater.digestionPools.carb ?? 0).toBeGreaterThan(0);
  });

  it("⭐ left out for days, the same ration poisons — and the band fires", async () => {
    const item = ration(298); // a warm room
    ContainmentApi.move(item as never, loc as never);
    item.getMicrobialLoad(); // seed the gauge

    setNow(4 * DAY); // ⚠ far past any absence guard: it rots the whole time
    expect(item.getFreshnessBand()).toBe("rotten");

    await makeStuff(() => new EatController()).execute(
      { target: one(item as unknown as Stuff, "ration") } as never,
      ctxFor(eater, loc, "eat"),
    );

    // The dose is in the un-absorbed pool, not yet in the burden.
    expect(eater.digestionPools.ptomaine ?? 0).toBeGreaterThan(0);
    expect(eater.toxinBurdens.ptomaine ?? 0).toBe(0);
    // The real nutrition came along with the poison.
    expect(eater.digestionPools.carb ?? 0).toBeGreaterThan(0);

    // Absorption drives the burden past a band, and the condition lands.
    advance(eater, 3 * HOUR);
    expect(eater.toxinBurdens.ptomaine ?? 0).toBeGreaterThan(2);
    expect(severity(eater)).toBeGreaterThanOrEqual(1);
  });

  it("vomiting inside the window dumps what has not absorbed yet", async () => {
    const item = ration(298);
    ContainmentApi.move(item as never, loc as never);
    item.getMicrobialLoad();
    setNow(4 * DAY);

    await makeStuff(() => new EatController()).execute(
      { target: one(item as unknown as Stuff, "ration") } as never,
      ctxFor(eater, loc, "eat"),
    );
    const dosed = eater.digestionPools.ptomaine ?? 0;
    expect(dosed).toBeGreaterThan(0);

    await makeStuff(() => new VomitController()).execute(
      {} as never,
      ctxFor(eater, loc, "vomit"),
    );
    expect(eater.digestionPools.ptomaine ?? 0).toBe(0);

    // …and with the pool gone, the burden never builds.
    advance(eater, 3 * HOUR);
    expect(eater.toxinBurdens.ptomaine ?? 0).toBe(0);
  });

  it("a ration kept COLD is still good after the same four days", async () => {
    const item = ration(275); // a cold larder
    ContainmentApi.move(item as never, loc as never);
    item.getMicrobialLoad();
    setNow(4 * DAY);
    expect(item.getFreshnessBand()).toBe("fresh");

    await makeStuff(() => new EatController()).execute(
      { target: one(item as unknown as Stuff, "ration") } as never,
      ctxFor(eater, loc, "eat"),
    );
    expect(eater.digestionPools.ptomaine ?? 0).toBe(0);
  });
});
