import { describe, it, expect } from "vitest";
import { Poise, DEFAULT_POISE_CONFIG } from "../Poise";

describe("Poise — banded gauge", () => {
  it("starts steady and reads bands, never numbers", () => {
    const p = new Poise();
    expect(p.band()).toBe("steady");
    expect(p.isOpen()).toBe(false);
  });

  it("erodes through pressed → reeling → broken", () => {
    const p = new Poise();
    p.erode(0.3, 0); // 0.7 → pressed
    expect(p.band()).toBe("pressed");
    p.erode(0.25, 0); // 0.45 → reeling
    expect(p.band()).toBe("reeling");
    p.erode(0.25, 0); // 0.20 → broken (crosses floor) → arms opening → open
    expect(p.isOpen()).toBe(true);
    expect(p.band()).toBe("open");
  });

  it("a break arms a binary timed opening that expires unexploited", () => {
    const p = new Poise();
    p.erode(0.8, 0); // cross the floor at tick 0
    expect(p.isOpen()).toBe(true);
    // window is openingTicks long (default 2)
    p.tick(1);
    expect(p.isOpen()).toBe(true);
    p.tick(DEFAULT_POISE_CONFIG.openingTicks); // reach the deadline
    expect(p.isOpen()).toBe(false);
    // still broken (gauge low), just no live window
    expect(p.band()).toBe("broken");
  });

  it("consumeOpening cashes the window exactly once", () => {
    const p = new Poise();
    p.erode(0.8, 0);
    expect(p.consumeOpening()).toBe(true);
    expect(p.consumeOpening()).toBe(false);
    expect(p.isOpen()).toBe(false);
  });

  it("spend (overextend) can break the actor's own poise", () => {
    const p = new Poise();
    p.spend(0.8, 3);
    expect(p.isOpen()).toBe(true);
    expect(p.band()).toBe("open");
  });

  it("restore is capped by endurance ratio", () => {
    const p = new Poise();
    p.erode(0.9, 0); // ~0.1, broken
    p.restore(1, 0); // gassed: ceiling 0 → nothing back
    expect(p.isBroken()).toBe(true);
    p.restore(1, 0.5); // ceiling 0.5 → climbs to 0.5, disarms opening
    expect(p.isOpen()).toBe(false);
    // 0.5 sits at the reeling/pressed boundary (not < reelingBelow=0.5)
    expect(p.band()).toBe("pressed");
  });

  it("does not re-arm a new opening while already broken", () => {
    const p = new Poise();
    p.erode(0.8, 0); // break at tick 0
    p.consumeOpening();
    p.erode(0.05, 1); // still broken, no crossing → no new window
    expect(p.isOpen()).toBe(false);
  });
});
