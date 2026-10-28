/**
 * ⭐ A gather is a DIP (ceramics review, 2026-10-28): the melt is a dip bath
 * (`DipBathMixin`) and plans the gather onto the named pipe, or the empty
 * blowpipe in hand when nothing is named (`gob`, an alias of `dip`).
 */
import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, afterEach } from "vitest";
import Material from "@saxonberg/server/mud/platform/idea/material/Material";
import Good from "@saxonberg/server/mud/lib/stuff/Good";
import { Idea } from "@saxonberg/server/mud/lib/stuff/Idea";
import { ContainerMixin } from "@saxonberg/server/mud/lib/spatial/Container";
import { SensorMixin } from "@saxonberg/server/mud/lib/message/Sensor";
import { EngagedMixin } from "@saxonberg/server/mud/lib/activity/Engaged";
import { Quantity } from "@saxonberg/server/mud/lib/quantity";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { ContainmentApi } from "@saxonberg/server/mud/api/containment";
import { makeStuff, makeStuffAtPath } from "@saxonberg/server/mud/lib/security/__tests__/test-setup";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import type { ActPlan, ActRefusal } from "@saxonberg/server/mud/lib/craft/ActPlan";
import Melt from "../thing/Melt";
import Blowpipe from "../thing/Blowpipe";
import Gather from "../thing/Gather";

class Blower extends EngagedMixin(SensorMixin(ContainerMixin(Idea))) {
  static _mixinName = "MeltDipTestBlower";
}

let seq = 0;
function melt(tempK: number): Melt {
  seq += 1;
  const glass = makeStuffAtPath(() => {
    const m = new Material();
    m.setName("glass");
    m.setTags(["glass"]);
    m.setSpecificHeat(Quantity.of(840, "J/(kg·K)"));
    m.setThermalConductivity(Quantity.of(1.0, "W/(m·K)"));
    m.setMeltingPoint(Quantity.of(1300, "K"));
    return m;
  }, `/stuff/idea/material/_test/melt-dip-${seq}`) as unknown as Material;
  const m = makeStuff(() => new Melt());
  m.setMaterial(glass);
  m.setMass(Quantity.of(10, "kg"));
  m.setStampedTemperatureK(tempK);
  m.setLastAmbientK(tempK);
  return m;
}

function blower(withPipe: boolean): { actor: Stuff; pipe: Blowpipe | null } {
  const actor = makeStuff(() => new Blower()) as unknown as Stuff;
  if (!withPipe) return { actor, pipe: null };
  const pipe = makeStuff(() => new Blowpipe());
  ContainmentApi.move(pipe as never, actor as never);
  return { actor, pipe };
}

afterEach(() => StuffApi.clearAll());

describe("⭐ the melt is a dip bath — a gather", () => {
  it("is a dip bath by what it is", () => {
    expect(MixinApi.isDipBath(melt(1300) as unknown as Stuff)).toBe(true);
  });

  it("a bare dip finds the empty pipe in hand and plans the gather", async () => {
    const { actor } = blower(true);
    const plan = (await melt(1300).dipPlanFor({ actor, target: null, faces: null, raw: null })) as ActPlan;
    expect(plan.ok).toBe(true);
    expect(plan.durationMs).toBe(0);
  });

  it("a stiff melt refuses the pipe", async () => {
    const { actor, pipe } = blower(true);
    const out = (await melt(800).dipPlanFor({ actor, target: pipe, faces: null, raw: "pipe" })) as ActRefusal;
    expect(out.reason).toBe("melt-cold");
  });

  it("no empty pipe in hand — or one already carrying a gather — is refused", async () => {
    const { actor } = blower(false);
    const none = (await melt(1300).dipPlanFor({ actor, target: null, faces: null, raw: null })) as ActRefusal;
    expect(none.reason).toBe("no-pipe");
    const loaded = blower(true);
    ContainmentApi.move(makeStuff(() => new Gather()) as never, loaded.pipe as never);
    const full = (await melt(1300).dipPlanFor({ actor: loaded.actor, target: null, faces: null, raw: null })) as ActRefusal;
    expect(full.reason).toBe("no-pipe");
  });

  it("something that is not a pipe is not gathered on", async () => {
    const { actor } = blower(true);
    const stick = makeStuff(() => new Good()) as unknown as Stuff;
    const out = (await melt(1300).dipPlanFor({ actor, target: stick, faces: null, raw: "stick" })) as ActRefusal;
    expect(out.reason).toBe("not-a-pipe");
  });
});
