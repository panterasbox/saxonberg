/**
 * SconceLamp — the one class the furnishings line needed: a light that
 * goes on a WALL.
 *
 * Two facts, and they are the whole class. It is an `Adornment` (so it
 * lives in a room's fixture map, and the not-portable invariant refuses
 * to have it in a container's contents while it hangs there), and its
 * flux is coupled to its switch (dark off the shelf, lit when switched
 * on) — the `PortableLight` coupling, which is copied rather than
 * inherited because the two compositions diverge at `Adornment`.
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach } from "vitest";
import SconceLamp from "../thing/SconceLamp";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { ContainmentApi } from "@saxonberg/server/mud/api/containment";
import { Quantity } from "@saxonberg/server/mud/lib/quantity";
import Location from "@saxonberg/server/mud/lib/stuff/Location";
import { makeStuff } from "@saxonberg/server/mud/lib/security/__tests__/test-setup";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import type { Adornable } from "@saxonberg/server/mud/lib/boundary/Adornable";
import type { Adornment } from "@saxonberg/server/mud/lib/boundary/Adornment";
import type { Containable } from "@saxonberg/server/mud/lib/spatial/Containable";

function lamp(): SconceLamp {
  const s = makeStuff(() => new SconceLamp());
  s.setEmittedFlux(Quantity.of(160, "lumen"));
  return s;
}

describe("SconceLamp", () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  it("is dark off the shelf and lights when switched on", () => {
    const s = lamp();
    expect(s.isOn()).toBe(false);
    expect(s.getEmittedFlux().rawValue()).toBe(0);
    s.switchOn();
    expect(s.getEmittedFlux().rawValue()).toBeGreaterThan(0);
    s.switchOff();
    expect(s.getEmittedFlux().rawValue()).toBe(0);
  });

  it("hangs on a room's fixture map, and refuses to be in its contents while it does", () => {
    const s = lamp();
    const room = makeStuff(() => new Location());
    const host = room as unknown as Stuff & Adornable;

    expect(MixinApi.isAdornment(s as unknown as Stuff)).toBe(true);
    host.addFixture(s as unknown as Stuff & Adornment, "mounted:test");
    expect(host.getFixtures()).toHaveLength(1);
    expect(host.slotOfFixture(s as unknown as Stuff & Adornment)).toBe(
      "mounted:test",
    );
    expect(s.getMountSlot()).toBe("mounted:test");

    // The not-portable invariant: attached means attached.
    expect(() =>
      ContainmentApi.move(
        s as unknown as Stuff & Containable,
        room as unknown as never,
      ),
    ).toThrow();

    // Detached, it is ordinary carried inventory again.
    host.removeFixture(s as unknown as Stuff & Adornment);
    expect(s.getMountSlot()).toBeNull();
    ContainmentApi.move(
      s as unknown as Stuff & Containable,
      room as unknown as never,
    );
    expect(s.getContainer()).toBe(room);
  });
});
