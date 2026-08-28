/**
 * Magic vocabulary value-objects — grid keys, the closed effect union
 * (the governing invariant's structural test), the resist fold
 * (immunity-as-limit), faculty band scaling, suppression match logic.
 * Pure units — no world, no dials warmed (seeded-literal fallbacks).
 */

import { describe, it, expect } from "vitest";
import { MAGIC_VERBS, MAGIC_NOUNS, MagicGrid } from "../Grid";
import { MagicEffects, EFFECT_KINDS } from "../Effect";
import { Resists } from "../Resist";
import { Faculty } from "../Faculty";
import { Suppressions } from "../Suppression";

describe("MagicGrid", () => {
  it("has the locked roster — 5 verbs × 13 active nouns", () => {
    expect(MAGIC_VERBS).toHaveLength(5);
    expect(MAGIC_NOUNS).toHaveLength(13);
    // the graduated frontier nouns are active
    expect(MagicGrid.isNoun("lightning")).toBe(true);
    expect(MagicGrid.isNoun("storm")).toBe(true);
    // the remaining frontiers are not
    expect(MagicGrid.isNoun("time")).toBe(false);
    expect(MagicGrid.isNoun("spirit")).toBe(false);
  });

  it("derives Discipline keys and cell addresses", () => {
    expect(MagicGrid.verbDisciplineKey("create")).toBe("magic-create");
    expect(MagicGrid.nounDisciplineKey("fire")).toBe("magic-fire");
    expect(MagicGrid.cellKey("create", "fire")).toBe("create·fire");
  });
});

describe("MagicEffects.validate — the closed union", () => {
  it("parses every catalogued kind", () => {
    const samples: unknown[] = [
      { kind: "inject-channel", channel: "heat", energy: 900 },
      { kind: "inject-channel", channel: "shock", voltage: 240, locus: "/stuff/thing/magic/spark-locus" },
      { kind: "afflict", conditionPath: "/platform/idea/Condition/magic/dread" },
      { kind: "relieve" },
      { kind: "adjust-reserve", reserveKey: "mana", delta: -10 },
      { kind: "adjust-blessing", steps: 1 },
      { kind: "adjust-blessing", steps: -1 },
      { kind: "move", move: "shove" },
      { kind: "conjure", bulkMaterial: "water", litres: 1 },
      { kind: "conjure", templatePath: "/stuff/thing/magic/glowlight-mote" },
      { kind: "sense", sense: "detect-magic" },
      { kind: "cloak", disguise: "a veiled figure" },
      { kind: "emit-field", field: "light", locus: "/stuff/thing/magic/glowlight-mote" },
      { kind: "script", source: "say hello" },
    ];
    for (const s of samples) expect(() => MagicEffects.validate(s)).not.toThrow();
    expect(EFFECT_KINDS).toHaveLength(11);
  });

  it("makes an unbacked effect unrepresentable — the governing invariant", () => {
    expect(() =>
      MagicEffects.validate({ kind: "gain-levels", amount: 5 }),
    ).toThrow(/unknown kind/);
    // transform is deliberately absent (no backing Api — polymorph's build)
    expect(() =>
      MagicEffects.validate({ kind: "transform", into: "/obj/wolf" }),
    ).toThrow(/unknown kind/);
  });

  it("rejects malformed fields", () => {
    expect(() =>
      MagicEffects.validate({ kind: "inject-channel", channel: "psychic" }),
    ).toThrow(/unknown channel/);
    expect(() =>
      MagicEffects.validate({ kind: "afflict", conditionPath: "dread" }),
    ).toThrow(/conditionPath/);
    expect(() => MagicEffects.validate({ kind: "conjure" })).toThrow(
      /templatePath or bulkMaterial/,
    );
    expect(() =>
      MagicEffects.validate({
        kind: "afflict",
        conditionPath: "/x",
        resist: { axis: "psychic", intensity: 1 },
      }),
    ).toThrow(/unknown axis/);
  });

  it("derives the impulse/modifier family from the kind", () => {
    expect(
      MagicEffects.familyOf(
        MagicEffects.validate({ kind: "emit-field", field: "light", locus: "/stuff/thing/magic/glowlight-mote" }),
      ),
    ).toBe("modifier");
    expect(
      MagicEffects.familyOf(
        MagicEffects.validate({ kind: "cloak", disguise: "x" }),
      ),
    ).toBe("modifier");
    expect(
      MagicEffects.familyOf(
        MagicEffects.validate({
          kind: "inject-channel",
          channel: "heat",
          energy: 1,
        }),
      ),
    ).toBe("impulse");
  });
});

describe("Resists — the fold + gate arithmetic", () => {
  it("mitigators subtract multiplicatively, outside-in", () => {
    const m = (f: number) => ({ fraction: () => f });
    expect(Resists.fold(100, [])).toBe(100);
    expect(Resists.fold(100, [m(0.5)])).toBe(50);
    expect(Resists.fold(100, [m(0.5), m(0.5)])).toBe(25);
  });

  it("immunity is the limit of graded resist — a mitigator at 1 zeroes", () => {
    const m = (f: number) => ({ fraction: () => f });
    expect(Resists.fold(1000, [m(0.2), m(1), m(0.1)])).toBe(0);
  });

  it("stages against ascending bands, scaled by the substrate factor", () => {
    const bands = [
      { threshold: 10, stage: 1 },
      { threshold: 30, stage: 2 },
      { threshold: 60, stage: 3 },
    ];
    // neutral factor
    expect(Resists.stageFor(5, bands, 1)).toBeNull();
    expect(Resists.stageFor(15, bands, 1)).toBe(1);
    expect(Resists.stageFor(45, bands, 1)).toBe(2);
    expect(Resists.stageFor(100, bands, 1)).toBe(3);
    // a stronger substrate (factor > 1) resists better: same insult, lower stage
    expect(Resists.stageFor(45, bands, 2)).toBe(1);
    // a frayed substrate (factor < 1) resists worse
    expect(Resists.stageFor(45, bands, 0.5)).toBe(3);
  });
});

describe("Faculty — band scaling (seeded-literal fallbacks)", () => {
  it("depth derives a monotone capacity", () => {
    const low = Faculty.capacityFor("low");
    const mid = Faculty.capacityFor("mid");
    const high = Faculty.capacityFor("high");
    expect(low).toBeLessThan(mid);
    expect(mid).toBeLessThan(high);
  });

  it("serenity derives a monotone recovery rate", () => {
    expect(Faculty.recoveryPerMinFor("low")).toBeLessThan(
      Faculty.recoveryPerMinFor("mid"),
    );
    expect(Faculty.recoveryPerMinFor("mid")).toBeLessThan(
      Faculty.recoveryPerMinFor("high"),
    );
  });

  it("composure reads live state — a drained mage resists worse", () => {
    const rested = Faculty.composureFactor("mid", 1);
    const drained = Faculty.composureFactor("mid", 0);
    expect(drained).toBeLessThan(rested);
    // the floor keeps a drained mage from zeroing out entirely
    expect(drained).toBeGreaterThan(0);
  });

  it("validates profiles; null = non-caster", () => {
    expect(Faculty.validateProfile(null)).toBeNull();
    expect(
      Faculty.validateProfile({ depth: "high", serenity: "low", composure: "mid" }),
    ).toEqual({ depth: "high", serenity: "low", composure: "mid" });
    expect(() =>
      Faculty.validateProfile({ depth: "bottomless", serenity: "low", composure: "mid" }),
    ).toThrow(/bands/);
  });
});

describe("Suppressions — match truth-table", () => {
  it("absent field suppresses nothing", () => {
    expect(Suppressions.suppresses(null, "create", "fire")).toBe(false);
    expect(Suppressions.suppresses(undefined, "destroy", "mind")).toBe(false);
  });

  it("`all` suppresses every cell", () => {
    expect(Suppressions.suppresses({ all: true }, "create", "fire")).toBe(true);
    expect(Suppressions.suppresses({ all: true }, "perceive", "arcana")).toBe(true);
  });

  it("a noun filter blocks only matching casts — 'no ·fire here'", () => {
    const field = Suppressions.validate({ nouns: ["fire"] });
    expect(Suppressions.suppresses(field, "create", "fire")).toBe(true);
    expect(Suppressions.suppresses(field, "destroy", "fire")).toBe(true);
    expect(Suppressions.suppresses(field, "create", "light")).toBe(false);
  });

  it("a verb filter blocks only matching casts", () => {
    const field = Suppressions.validate({ verbs: ["create"] });
    expect(Suppressions.suppresses(field, "create", "water")).toBe(true);
    expect(Suppressions.suppresses(field, "control", "water")).toBe(false);
  });

  it("rejects malformed fields", () => {
    expect(() => Suppressions.validate({})).toThrow(/needs/);
    expect(() => Suppressions.validate({ nouns: ["chaos"] })).toThrow(/nouns/);
  });
});
