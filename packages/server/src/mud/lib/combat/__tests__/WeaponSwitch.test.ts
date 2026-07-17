/**
 * WeaponSwitch — the mid-fight armament-change countdown (value-object).
 * A deterministic beat counter: it advances, reports readiness, and carries
 * the target weapon + fast/slow flag; the session performs the actual swap.
 */

import { describe, it, expect } from "vitest";
import { WeaponSwitch } from "../WeaponSwitch";
import type { Stuff } from "../../stuff/Stuff";

const weapon = (label: string): Stuff => ({ label }) as unknown as Stuff;

describe("WeaponSwitch", () => {
  it("counts down over its window before it is ready", () => {
    const sw = new WeaponSwitch(weapon("dagger"), 2);
    expect(sw.isReady()).toBe(false);
    expect(sw.getRemaining()).toBe(2);
    sw.advance();
    expect(sw.isReady()).toBe(false);
    expect(sw.getRemaining()).toBe(1);
    sw.advance();
    expect(sw.isReady()).toBe(true);
    expect(sw.getRemaining()).toBe(0);
  });

  it("never under-runs and stays ready once done", () => {
    const sw = new WeaponSwitch(weapon("mace"), 1);
    sw.advance();
    sw.advance();
    sw.advance();
    expect(sw.isReady()).toBe(true);
    expect(sw.getRemaining()).toBe(0);
  });

  it("clamps a zero/negative window to at least one beat (never instant)", () => {
    expect(new WeaponSwitch(null, 0).getRemaining()).toBe(1);
    expect(new WeaponSwitch(null, -5).getRemaining()).toBe(1);
  });

  it("carries the target weapon and the fast/slow flag", () => {
    const dagger = weapon("dagger");
    const draw = new WeaponSwitch(dagger, 1, true);
    expect(draw.getTarget()).toBe(dagger);
    expect(draw.isFast()).toBe(true);
    const sheathe = new WeaponSwitch(null, 2);
    expect(sheathe.getTarget()).toBeNull();
    expect(sheathe.isFast()).toBe(false);
  });
});
