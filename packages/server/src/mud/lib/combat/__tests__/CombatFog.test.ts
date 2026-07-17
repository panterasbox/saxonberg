import { describe, it, expect } from "vitest";
import { CombatFog } from "../CombatFog";

const CFG = { clearSharpness: 0.7, readSharpness: 0.7 };

describe("CombatFog — band fog", () => {
  it("a sharp observer sees the true band", () => {
    expect(CombatFog.perceive("reeling", 0.9, false, CFG).band).toBe("reeling");
    expect(CombatFog.perceive("broken", 1, false, CFG).band).toBe("broken");
  });

  it("a dull observer under-reads (band shifts one step toward steady)", () => {
    expect(CombatFog.perceive("reeling", 0.3, false, CFG).band).toBe("pressed");
    expect(CombatFog.perceive("broken", 0.3, false, CFG).band).toBe("reeling");
    // steady can't shift lower.
    expect(CombatFog.perceive("steady", 0.1, false, CFG).band).toBe("steady");
  });
});

describe("CombatFog — the feint trap", () => {
  it("a dull observer reads a feint as a real opening (bites)", () => {
    const r = CombatFog.perceive("steady", 0.3, true, CFG);
    expect(r.band).toBe("open");
    expect(r.tell).toBeUndefined();
    expect(CombatFog.reads(0.3, CFG)).toBe(false);
  });

  it("a sharp observer reads the feint (true band + a tell, does not bite)", () => {
    const r = CombatFog.perceive("steady", 0.9, true, CFG);
    expect(r.band).toBe("steady");
    expect(r.tell).toBe("feint");
    expect(CombatFog.reads(0.9, CFG)).toBe(true);
  });

  it("fog-says-open and bite-the-feint never contradict (shared gate)", () => {
    for (const s of [0.1, 0.4, 0.69, 0.7, 0.95]) {
      const perceivedOpen = CombatFog.perceive("steady", s, true, CFG).band === "open";
      const bites = !CombatFog.reads(s, CFG);
      expect(perceivedOpen).toBe(bites);
    }
  });
});
