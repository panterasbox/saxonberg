/**
 * The hot-work window — the glow bands a cooling gather reads through, and
 * the loss when it goes cold: converted to cullet (full mass, its iron
 * kept — the glass comes back one step greener, a bad blow costs fuel not
 * material). The dip → shape → crack orchestration and the live window
 * feel are the W8 drive's (the controllers go through the binder + the
 * scheduler + the clock, which a controller unit test cannot).
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Good from "@saxonberg/server/mud/lib/stuff/Good";
import Material from "@saxonberg/server/mud/platform/idea/material/Material";
import Casting from "@saxonberg/server/mud/platform/thing/Casting";
import { ContainerMixin } from "@saxonberg/server/mud/lib/spatial/Container";
import { Idea } from "@saxonberg/server/mud/lib/stuff/Idea";
import { Quantity } from "@saxonberg/server/mud/lib/quantity";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { ContainmentApi } from "@saxonberg/server/mud/api/containment";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import {
  makeStuff,
  makeStuffAtPath,
} from "@saxonberg/server/mud/lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import Gather from "../thing/Gather";

const IRON = "/stuff/idea/material/element/iron";
class TestRoom extends ContainerMixin(Idea) {
  static _mixinName = "HotWorkTestRoom";
}

let seq = 0;
function glassMaterial(): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName("glass");
    m.setTags(["glass"]);
    m.setSpecificHeat(Quantity.of(840, "J/(kg·K)"));
    m.setThermalConductivity(Quantity.of(1.0, "W/(m·K)"));
    m.setMeltingPoint(Quantity.of(1300, "K"));
    return m;
  }, `/stuff/idea/material/_test/hw-glass-${seq}`) as unknown as Material;
}

function gather(tempK: number): Gather {
  const g = makeStuff(() => new Gather());
  g.setMaterial(glassMaterial());
  g.setMass(Quantity.of(0.4, "kg"));
  g.setStampedTemperatureK(tempK);
  g.setLastAmbientK(tempK);
  g.setAlloying([{ materialPath: IRON, fraction: 0.004 }]);
  return g;
}

describe("the hot-work window", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    // Cullet is a kernel Casting; a bare pack test has no content store,
    // so the mint is stubbed to a real Casting instance.
    vi.spyOn(StuffApi, "clone").mockImplementation((async () =>
      makeStuff(() => new Casting())) as never);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it("glowBand reads the gather down through the bands as it cools", () => {
    // floor = 0.75 × 1300 = 975 K.
    expect(gather(1450).glowBand()).toBe("white"); // ≥ floor + 400
    expect(gather(1200).glowBand()).toBe("yellow"); // ≥ floor + 200
    expect(gather(1050).glowBand()).toBe("orange"); // ≥ floor + 50
    expect(gather(980).glowBand()).toBe("going"); // just above the floor
  });

  it("loseGather converts a gather to cullet — full mass, its iron KEPT", async () => {
    const room = makeStuff(() => new TestRoom()) as unknown as Stuff;
    const g = gather(900); // cold
    ContainmentApi.move(g as unknown as never, room as unknown as never);

    await g.loseToCullet(room, "Dawdled.");

    expect(g.isDestroyed()).toBe(true);
    const contents = (room as unknown as { getContents(): Stuff[] }).getContents();
    const cullet = contents.find((c) => c instanceof Casting);
    expect(cullet).toBeDefined();
    // Full mass back — glass pays its entropy in colour, not mass.
    if (MixinApi.isTangible(cullet!)) {
      expect(cullet!.getMass().rawValue()).toBeCloseTo(0.4, 6);
    }
    // And it remembers the iron, so a re-melt cannot launder it clear.
    if (MixinApi.isAlloyed(cullet!)) {
      expect(cullet!.fractionOf(IRON)).toBeCloseTo(0.004, 6);
    }
  });

  it("loseGather is a no-op on an already-destroyed gather", async () => {
    const room = makeStuff(() => new TestRoom()) as unknown as Stuff;
    const g = gather(900);
    await StuffApi.destruct(g);
    await g.loseToCullet(room, "x"); // must not throw
    expect(g.isDestroyed()).toBe(true);
  });
});
