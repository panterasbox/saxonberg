/**
 * TintedMixin — the colour is DERIVED from the iron (and carbon) in the
 * piece, never stored. These tests pin the arithmetic: clean sand → clear
 * glass, dirty sand → green, carbon → amber, and a thin sheet reads paler
 * than a thick bottle of the same glass.
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, afterEach } from "vitest";
import Good from "@saxonberg/server/mud/lib/stuff/Good";
import { AlloyedMixin } from "@saxonberg/server/mud/lib/material/Alloyed";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { makeStuff } from "@saxonberg/server/mud/lib/security/__tests__/test-setup";
import { TintedMixin } from "../lib/Tinted";

const IRON = "/stuff/idea/material/element/iron";
const CARBON = "/stuff/idea/material/element/carbon";

/** A glass good: Tinted over Alloyed. Full wall thickness (1.0). */
class Glass extends TintedMixin(AlloyedMixin(Good)) {}
/** A thin sheet: overrides thicknessFactor to 0.5. */
class ThinGlass extends TintedMixin(AlloyedMixin(Good)) {
  protected override thicknessFactor(): number {
    return 0.5;
  }
}

function glass(ironFrac: number, carbonFrac = 0): Glass {
  const g = makeStuff(() => new Glass());
  const entries = [{ materialPath: IRON, fraction: ironFrac }];
  if (carbonFrac > 0) entries.push({ materialPath: CARBON, fraction: carbonFrac });
  g.setAlloying(entries);
  return g;
}

describe("TintedMixin — iron is the colour", () => {
  afterEach(() => StuffApi.clearAll());

  it("clean sand (0.01% iron) reads clear — near-white, no band", () => {
    const g = glass(0.0001);
    const c = g.getColour();
    // Every channel high, none crushed — clear glass.
    expect(c.r).toBeGreaterThan(0.95);
    expect(c.g).toBeGreaterThan(0.99);
    expect(c.b).toBeGreaterThan(0.95);
    expect(g.colourBand()).toBe("clear");
  });

  it("dirty sand (0.4% iron) is green — green the highest channel", () => {
    const g = glass(0.004);
    const c = g.getColour();
    // Green passes more than red or blue — that is what iron glass is.
    expect(c.g).toBeGreaterThan(c.r);
    expect(c.g).toBeGreaterThan(c.b);
    expect(c.nearestTag()).toMatch(/green|sage|teal|olive/);
    expect(["green", "bottle-green"]).toContain(g.colourBand());
  });

  it("more iron is greener and darker — monotone", () => {
    const pale = glass(0.001).getColour();
    const deep = glass(0.008).getColour();
    expect(deep.lightness()).toBeLessThan(pale.lightness());
    expect(deep.depth()).toBeGreaterThan(pale.depth());
  });

  it("carbon makes it amber — blue the LOWEST channel, amber band", () => {
    const g = glass(0.0005, 0.003);
    const c = g.getColour();
    expect(c.b).toBeLessThan(c.r);
    expect(c.b).toBeLessThan(c.g);
    expect(g.colourBand()).toBe("amber");
  });

  it("a thin sheet reads PALER than a thick bottle of the same glass", () => {
    const bottle = makeStuff(() => new Glass());
    bottle.setAlloying([{ materialPath: IRON, fraction: 0.004 }]);
    const sheet = makeStuff(() => new ThinGlass());
    sheet.setAlloying([{ materialPath: IRON, fraction: 0.004 }]);
    // Same glass, half the optical path ⇒ more light through.
    expect(sheet.getColour().lightness()).toBeGreaterThan(
      bottle.getColour().lightness(),
    );
  });
});
