/**
 * The cold shop — scribe, snap, groze, glaze. State effects through the
 * real controllers (execute bypasses the binder, as controller tests do).
 * The glaze test is the headline: a GREEN pane's own derived colour
 * becomes the window's glazing, so the window colours the room green —
 * the W0 Light seam meeting the W4 Tinted seam. `flatten` (a furnace step)
 * and bench `salvage` are the W8 drive's / W1's.
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { ContainmentApi } from "@saxonberg/server/mud/api/containment";
import Tool from "@saxonberg/server/mud/platform/thing/Tool";
import Window from "@saxonberg/server/mud/platform/thing/Window";
import { Quantity } from "@saxonberg/server/mud/lib/quantity";
import { installV1QuantityMarshallers } from "@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers";
import {
  TestActor,
  makeContext,
} from "@saxonberg/server/mud/platform/idea/cmd/crafting/__tests__/branch-fixtures";
import { makeStuff } from "@saxonberg/server/mud/lib/security/__tests__/test-setup";
import type { CommandContext } from "@saxonberg/server/mud/api/command";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import Sheet from "../thing/Sheet";
import ScribeController from "../idea/cmd/glass/ScribeController";
import SnapController from "../idea/cmd/glass/SnapController";
import GrozeController from "../idea/cmd/glass/GrozeController";
import GlazeController from "../idea/cmd/glass/GlazeController";

const IRON = "/stuff/idea/material/element/iron";
const PANE_ROW = "/trade/glass/thing/pane";

let actor: TestActor;
let room: TestActor;

function tool(cap: string): { raw: string; stuff: Stuff } {
  const t = makeStuff(() => {
    const item = new Tool();
    item.capabilities = [cap];
    return item;
  }) as unknown as Stuff;
  return { raw: cap, stuff: t };
}

function sheet(form: "cylinder" | "pane", ironFrac = 0.004): Sheet {
  const s = makeStuff(() => new Sheet());
  s.setForm(form);
  s.setMass(Quantity.of(0.4, "kg"));
  s.setAlloying([{ materialPath: IRON, fraction: ironFrac }]);
  ContainmentApi.move(s as unknown as never, room as unknown as never);
  return s;
}

type Runnable = Stuff & { execute(m: never, c: CommandContext): unknown };

async function run(
  Controller: new () => Runnable,
  model: Record<string, unknown>,
): Promise<CommandContext> {
  const ctx = makeContext(actor as unknown as Stuff, room as unknown as Stuff, "glass");
  await makeStuff<Runnable>(() => new Controller()).execute(model as never, ctx);
  return ctx;
}

function declined(ctx: CommandContext): string | undefined {
  return ctx.getNotes().find((n) => n.kind === "controller-rejected")?.reason;
}

describe("the cold shop", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    vi.spyOn(StuffApi, "clone").mockImplementation((async (path: string) => {
      if (path === PANE_ROW) return makeStuff(() => new Sheet());
      throw new Error(`unexpected clone ${path}`);
    }) as never);
    room = makeStuff(() => new TestActor());
    actor = makeStuff(() => new TestActor());
    ContainmentApi.move(actor as unknown as never, room as unknown as never);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it("scribe scores the sheet", async () => {
    const s = sheet("pane");
    await run(ScribeController, { sheet: { stuff: s }, wheel: { stuff: [tool("scribing").stuff] } });
    expect(s.isScribed()).toBe(true);
  });

  it("snap refuses an unscribed sheet, and parts a scribed one into two half-mass panes", async () => {
    const unscribed = sheet("pane");
    expect(declined(await run(SnapController, { sheet: { stuff: unscribed } }))).toBe("unscribed");

    const s = sheet("pane");
    s.setScribed(true);
    await run(SnapController, { sheet: { stuff: s } });
    expect(s.isDestroyed()).toBe(true);
    // The two new panes are half-mass (the earlier unscribed 0.4 kg sheet
    // is still in the room — count only the halves).
    const panes = (room as unknown as { getContents(): Stuff[] })
      .getContents()
      .filter((c) => c instanceof Sheet && Math.abs((c as Sheet).getMass().rawValue() - 0.2) < 0.01) as Sheet[];
    expect(panes).toHaveLength(2);
    for (const p of panes) {
      expect(p.fractionOf(IRON)).toBeCloseTo(0.004, 6); // colour carried
    }
  });

  it("groze nibbles mass off and marks the sheet grozed", async () => {
    const s = sheet("pane");
    const before = s.getMass().rawValue();
    await run(GrozeController, { sheet: { stuff: s }, pliers: { stuff: [tool("grozing").stuff] } });
    expect(s.getMass().rawValue()).toBeLessThan(before);
    expect(s.isGrozed()).toBe(true);
  });

  it("⭐ glaze sets a GREEN pane's colour on a window — the room goes green", async () => {
    const pane = sheet("pane", 0.004); // green glass
    const window = makeStuff(() => new Window());
    window.open();
    await run(GlazeController, { pane: { stuff: pane }, window: { stuff: window } });

    expect(pane.isDestroyed()).toBe(true);
    const glazing = window.getGlazing();
    expect(glazing).not.toBeNull();
    // Green passes more than red or blue — the window colours the room green.
    expect(glazing!.g).toBeGreaterThan(glazing!.r);
    expect(glazing!.g).toBeGreaterThan(glazing!.b);
    expect(window.lightTransmittance().g).toBeGreaterThan(window.lightTransmittance().r);
  });
});
