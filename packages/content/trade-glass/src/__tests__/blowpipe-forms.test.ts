/**
 * ⭐ The blowpipe shapes by FORM ROWS (ceramics review, 2026-10-28): the
 * pipe composes the kernel's `FormingMixin`, so a blown vessel is a `Form`
 * row on its `forms:` list — the potter's law — and the blow records the
 * product it will crack off as and the grade the blower's hand gave it.
 */
import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Material from "@saxonberg/server/mud/platform/idea/material/Material";
import Form from "@saxonberg/server/mud/platform/idea/Form";
import { ContainerMixin } from "@saxonberg/server/mud/lib/spatial/Container";
import { Idea } from "@saxonberg/server/mud/lib/stuff/Idea";
import { SensorMixin } from "@saxonberg/server/mud/lib/message/Sensor";
import { Quantity } from "@saxonberg/server/mud/lib/quantity";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { ContainmentApi } from "@saxonberg/server/mud/api/containment";
import { makeStuff, makeStuffAtPath } from "@saxonberg/server/mud/lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import type { ShapePlan, ShapeRefusal } from "@saxonberg/server/mud/lib/craft/Shapeable";
import Gather from "../thing/Gather";
import Blowpipe from "../thing/Blowpipe";

class TestHand extends SensorMixin(ContainerMixin(Idea)) {
  static _mixinName = "BlowpipeFormsTestHand";
}

const BOTTLE_FORM = "/trade/glass/idea/form/_test/bottle";
const BOTTLE = "/trade/glass/thing/bottle";

let seq = 0;
function hotGather(): Gather {
  seq += 1;
  const glass = makeStuffAtPath(() => {
    const m = new Material();
    m.setName("glass");
    m.setTags(["glass"]);
    m.setSpecificHeat(Quantity.of(840, "J/(kg·K)"));
    m.setThermalConductivity(Quantity.of(1.0, "W/(m·K)"));
    m.setMeltingPoint(Quantity.of(1300, "K"));
    return m;
  }, `/stuff/idea/material/_test/bp-glass-${seq}`) as unknown as Material;
  const g = makeStuff(() => new Gather());
  g.setMaterial(glass);
  g.setMass(Quantity.of(0.4, "kg"));
  g.setStampedTemperatureK(1250);
  g.setLastAmbientK(1250);
  return g;
}

function pipeWithGather(): { pipe: Blowpipe; gather: Gather } {
  const pipe = makeStuff(() => new Blowpipe());
  pipe.forms = [BOTTLE_FORM];
  const gather = hotGather();
  ContainmentApi.move(gather as never, pipe as never);
  return { pipe, gather };
}

describe("⭐ the blowpipe blows the forms its row lists", () => {
  let actor: Stuff;
  beforeEach(() => {
    installV1QuantityMarshallers();
    makeStuffAtPath(() => {
      const f = new Form();
      f.key = "bottle";
      f.setFormClass("closed");
      f.capacityL = 0.75;
      f.product = BOTTLE;
      f.discipline = "glasswork";
      return f;
    }, BOTTLE_FORM);
    actor = makeStuff(() => new TestHand()) as unknown as Stuff;
  });
  afterEach(() => StuffApi.clearAll());

  it("a listed word blows: the gather records the row it cracks off as, and the blow's grade", async () => {
    const { pipe, gather } = pipeWithGather();
    const plan = (await pipe.shapePlanFor({ actor, material: null, formText: "a bottle", commandText: "shape bottle" })) as ShapePlan;
    expect(plan.ok).toBe(true);
    plan.onComplete();
    expect(gather.getForm()).toBe("bottle");
    expect(gather.getFormProduct()).toBe(BOTTLE);
    // An untrained blower's bottle is poor work — the hand grades it.
    expect(gather.getFormGrade()?.getBand()).toBe("poor");
  });

  it("an unlisted word is refused, naming what this pipe blows", async () => {
    const { pipe } = pipeWithGather();
    const out = (await pipe.shapePlanFor({ actor, material: null, formText: "teapot", commandText: "shape teapot" })) as ShapeRefusal;
    expect(out.ok).toBe(false);
  });

  it("a vessel beyond the blower's breath is refused in a glassblower's words", async () => {
    const { pipe } = pipeWithGather();
    const out = (await pipe.shapePlanFor({
      actor,
      material: null,
      formText: "bottle holding 8 liters",
      commandText: "shape bottle holding 8 liters",
    })) as ShapeRefusal;
    expect(out.ok).toBe(false);
    expect(out.reason).toBe("beyond-your-hand");
  });

  it("no gather on the pipe: the shape is not the pipe's business", async () => {
    const pipe = makeStuff(() => new Blowpipe());
    pipe.forms = [BOTTLE_FORM];
    expect(await pipe.shapePlanFor({ actor, material: null, formText: "bottle", commandText: "shape bottle" })).toBeNull();
  });
});
