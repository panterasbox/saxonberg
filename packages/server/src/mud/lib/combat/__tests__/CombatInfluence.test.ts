/**
 * CombatInfluence — the closed instruction vocabulary (value-object).
 * Application semantics live behind `CombatApi.influence` and are
 * proven in `CombatLogic.hooks.test.ts`; this pins the vocabulary
 * shape both influence surfaces speak.
 */

import { describe, it, expect } from "vitest";
import {
  INFLUENCE_KINDS,
  type CombatInfluence,
  type InfluenceResult,
} from "../CombatInfluence";

describe("CombatInfluence — the closed vocabulary", () => {
  it("is exactly the stagger/expose/steady triple", () => {
    expect(INFLUENCE_KINDS).toEqual(["stagger", "expose", "steady"]);
  });

  it("the union speaks the kinds (compile-time shape, runtime sanity)", () => {
    const instructions: CombatInfluence[] = [
      { kind: "stagger", intensity: "light" },
      { kind: "stagger", intensity: "heavy" },
      { kind: "expose" },
      { kind: "steady" },
    ];
    for (const i of instructions) {
      expect(INFLUENCE_KINDS).toContain(i.kind);
    }
    const ok: InfluenceResult = { ok: true };
    const denied: InfluenceResult = { ok: false, reason: "not-in-combat" };
    expect(ok.ok).toBe(true);
    expect(denied.reason).toBe("not-in-combat");
  });
});
