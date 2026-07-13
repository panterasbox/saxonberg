/**
 * Coup — the stage-2 killing stroke as a `DurativeActivity`. The class
 * carries no rules of its own (CombatLogic builds the effect closures); it
 * holds the executioner's `body` for a game-time window and fires
 * `onComplete` (the kill lands) or `onAbort` (the victim is spared). These
 * tests pin that wiring: the closures fire, the victim is reachable for
 * the `intervene` match, and it declares itself a body-occupying,
 * interruptible durative activity.
 */

import { describe, it, expect, vi } from "vitest";
import { Coup, COMBAT_COUP_TYPE } from "../Coup";
import type { Stuff } from "../../stuff/Stuff";
import type { Engaged } from "../../activity/Engaged";

function fakeCombatant(): Stuff & Engaged {
  return {} as unknown as Stuff & Engaged;
}

describe("Coup", () => {
  it("fires onComplete (the kill lands) when the stroke completes", () => {
    const onComplete = vi.fn();
    const onAbort = vi.fn();
    const coup = new Coup({
      executioner: fakeCombatant(),
      victim: fakeCombatant(),
      durationMs: 6000,
      onComplete,
      onAbort,
    });
    coup.onStart();
    coup.onComplete();
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onAbort).not.toHaveBeenCalled();
  });

  it("fires onAbort (the victim is spared) when interrupted", () => {
    const onComplete = vi.fn();
    const onAbort = vi.fn();
    const coup = new Coup({
      executioner: fakeCombatant(),
      victim: fakeCombatant(),
      durationMs: 6000,
      onComplete,
      onAbort,
    });
    coup.onAbort("combat-intervened");
    expect(onAbort).toHaveBeenCalledWith("combat-intervened");
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("exposes the victim as the intervene match key, and the executioner as host", () => {
    const executioner = fakeCombatant();
    const victim = fakeCombatant();
    const coup = new Coup({
      executioner,
      victim,
      durationMs: 6000,
      onComplete: () => {},
      onAbort: () => {},
    });
    expect(coup.getVictim()).toBe(victim as unknown as Stuff);
    expect(coup.getHost()).toBe(executioner as unknown as Stuff);
  });

  it("is a body-occupying, cancelable durative activity", () => {
    const coup = new Coup({
      executioner: fakeCombatant(),
      victim: fakeCombatant(),
      durationMs: 6000,
      onComplete: () => {},
      onAbort: () => {},
    });
    expect(coup.type).toBe(COMBAT_COUP_TYPE);
    expect(coup.slots.has("body")).toBe(true);
    expect(coup.cancelable).toBe(true);
    expect(coup.duration).toBe(6000);
  });
});
