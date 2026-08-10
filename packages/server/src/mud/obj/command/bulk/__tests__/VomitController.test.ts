/**
 * VomitController + the involuntary purge. `vomit` flushes the
 * un-absorbed digestion pools + sub-volumes while absorbed state
 * (reserves, burdens) persists; inducing it EARLY (pool un-absorbed)
 * caps further absorption (caps drunkenness), LATE does not; the
 * involuntary path fires from the reconcile on crossing an acute toxin
 * band — no verb, so it works on an incapacitated body.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import VomitController from "../VomitController";
import { Creature } from "../../../../lib/creature/Creature";
import { SensorMixin } from "../../../../lib/message/Sensor";
import { CommandGiverMixin } from "../../../../lib/command/CommandGiver";
import Condition from "../../../Condition";
import Material from "../../../../lib/material/Material";
import type { ToxinBehavior } from "../../../../lib/metabolism/Metabolic";
import Location from "../../../../lib/stuff/Location";
import { Stuff } from "../../../../lib/stuff/Stuff";
import { Quantity } from "../../../../lib/quantity";
import { StuffApi } from "../../../../api/stuff";
import { ContainmentApi } from "../../../../api/containment";
import { WorldClockApi } from "../../../../api/worldclock";
import "../../../WorldClockRegistry";
import { CommandApi, type CommandContext } from "../../../../api/command";
import { CommandDefinition } from "../../../../lib/command/CommandDefinition";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../../../lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers";

class TestEater extends SensorMixin(CommandGiverMixin(Creature)) {
  static _mixinName = "TestEater";
}

const SCALE = 12;
let real = 0;
function advance(c: Creature, gameSec: number, chunkSec = 3000): void {
  let remaining = gameSec;
  while (remaining > 0) {
    const s = Math.min(chunkSec, remaining);
    real += (s / SCALE) * 1000;
    c.getReserve("endurance");
    remaining -= s;
  }
}

const ALCOHOL: ToxinBehavior = {
  toxinType: "alcohol",
  storeRaw: true,
  absorptionRate: 0.5,
  clearanceRate: 0.12,
  potency: 1,
  bands: [{ threshold: 0.03, severity: 1 }],
};
const ACUTE: ToxinBehavior = {
  toxinType: "gut",
  absorptionRate: 4,
  clearanceRate: 0.01,
  potency: 1,
  bands: [
    { threshold: 1, severity: 1 },
    { threshold: 8, severity: 2 }, // top (acute) band
  ],
};

function ensure(behavior: ToxinBehavior): void {
  const path = "/obj/Condition/metabolism/" + behavior.toxinType;
  if (StuffApi.findByTemplatePath(path)) return;
  makeStuffAtPath(() => {
    const c = new Condition();
    c.setName(behavior.toxinType);
    c.setToxinBehavior(behavior);
    return c;
  }, path);
}

function ale(): Material {
  return makeStuff(() => {
    const m = new Material();
    m.setName("ale");
    m.setEdibility(true);
    m.setNutrients(["water"]);
    m.setToxicity([{ type: "alcohol", amount: 14 }]);
    return m;
  }) as unknown as Material;
}

function ctxFor(actor: Stuff, loc: Stuff): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: actor as never,
    location: loc as never,
    commandText: "vomit",
    executionId: "t",
    commandId: "t",
    verb: "vomit",
    command: CommandDefinition.fromYaml(
      "verbs: [vomit]\ncontroller: NoopController\ndescription: stub\n",
      "<test>",
    ),
  });
}
const runVomit = (actor: TestEater, loc: Stuff) =>
  makeStuff(() => new VomitController()).execute({} as never, ctxFor(actor, loc));

describe("VomitController", () => {
  let loc: Stuff;
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
    ensure(ALCOHOL);
    ensure(ACUTE);
    loc = makeStuff(() => new Location()) as unknown as Stuff;
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  function eater(): TestEater {
    const e = makeStuff(() => new TestEater());
    (e as unknown as { setName(n: string): void }).setName("bob");
    ContainmentApi.move(e as never, loc as never);
    return e;
  }

  it("flushes un-absorbed pools + sub-volumes but preserves reserves + burdens", () => {
    const c = eater();
    c.setDigestionPools({ carb: 40 });
    c.setSolidVolume(0.4);
    c.setLiquidVolume(0.3);
    c.setToxinBurdens({ alcohol: 30 });
    c.adjustReserve("satiation", Quantity.of(-20, "%")); // 80

    runVomit(c, loc);

    expect(c.digestionPools).toEqual({});
    expect(c.solidVolume).toBe(0);
    expect(c.liquidVolume).toBe(0);
    // Absorbed state survives.
    expect(c.toxinBurdens.alcohol).toBe(30);
    expect(c.getReserve("satiation")!.current.rawValue()).toBeCloseTo(80, 1);
  });

  it("early purge caps absorption; late does not", () => {
    const early = eater();
    early.ingest(ale(), Quantity.of(0.4, "L"), "liquid"); // alcohol pool 14
    runVomit(early, loc); // dump it before it absorbs
    advance(early, 1200);
    const earlyBurden = early.toxinBurdens.alcohol ?? 0;

    const late = eater();
    late.ingest(ale(), Quantity.of(0.4, "L"), "liquid");
    advance(late, 1200); // let it absorb first
    const lateBurden = late.toxinBurdens.alcohol ?? 0;
    runVomit(late, loc); // too late — already in the burden

    expect(earlyBurden).toBeLessThan(lateBurden);
    expect(lateBurden).toBeGreaterThan(0);
  });

  it("involuntary vomit fires on crossing an acute toxin band", () => {
    const c = eater();
    c.setToxinBurdens({ gut: 20 }); // already in the top (acute) band
    c.setDigestionPools({ gut: 100, carb: 30 }); // un-absorbed dose present
    c.getReserve("endurance"); // seed
    advance(c, 60); // a reconcile — should trigger the involuntary purge
    expect(c.digestionPools).toEqual({}); // pools dumped
  });
});
