/**
 * AimResolution — AC 8: every matrix cell and every step modifier, with
 * no dice anywhere on the path.
 *
 * The whole table is exercised here even though Wave 1 only wires the
 * `snap` row and three answers, because a pure value-object is the one
 * place the shape can be proven for free — and the shape is what a later
 * wave will build on.
 */

import { describe, it, expect } from "vitest";
import {
  AimResolution,
  AIM_LADDER,
  RANGE_ANSWERS,
  PLACEMENTS,
  DEFAULT_AIM_RESOLUTION_CONFIG,
  type Placement,
} from "../AimResolution";

describe("AimResolution — the vocabularies", () => {
  it("the ladders are ordered and closed", () => {
    expect(AIM_LADDER).toEqual(["snap", "held", "settled"]);
    expect(RANGE_ANSWERS).toEqual([
      "stand",
      "move",
      "cover",
      "drop",
      "counter",
    ]);
    expect(PLACEMENTS).toEqual(["miss", "graze", "hit", "precise"]);
  });

  it("rank and at() are inverses; at() clamps", () => {
    PLACEMENTS.forEach((p, i) => {
      expect(AimResolution.rank(p)).toBe(i);
      expect(AimResolution.at(i)).toBe(p);
    });
    expect(AimResolution.at(-3)).toBe("miss");
    expect(AimResolution.at(99)).toBe("precise");
  });
});

describe("AimResolution — every cell of the base matrix (AC 8)", () => {
  /**
   * The authored table, restated independently of the config object so a
   * silent edit to the defaults fails here rather than passing by
   * reading its own source.
   */
  const EXPECTED: Record<string, Record<string, Placement>> = {
    snap: {
      stand: "hit",
      move: "graze",
      cover: "hit", // reads as `stand` until authored cover exists
      drop: "miss",
      counter: "graze",
    },
    held: {
      stand: "hit",
      move: "hit",
      cover: "hit",
      drop: "graze",
      counter: "hit",
    },
    settled: {
      stand: "precise",
      move: "hit",
      cover: "precise",
      drop: "graze",
      counter: "hit",
    },
  };

  for (const aim of AIM_LADDER) {
    for (const answer of RANGE_ANSWERS) {
      it(`${aim} × ${answer} → ${EXPECTED[aim]![answer]}`, () => {
        expect(AimResolution.resolve(aim, answer)).toBe(
          EXPECTED[aim]![answer],
        );
      });
    }
  }

  it("covers all 15 cells", () => {
    expect(AIM_LADDER.length * RANGE_ANSWERS.length).toBe(15);
  });
});

describe("AimResolution — the placement ladder reads as designed", () => {
  it("patience buys placement: only `settled` reaches vitals", () => {
    expect(AimResolution.resolve("snap", "stand")).toBe("hit");
    expect(AimResolution.resolve("held", "stand")).toBe("hit");
    expect(AimResolution.resolve("settled", "stand")).toBe("precise");
  });

  it("`drop` beats a snap shot and is worst against a settled one", () => {
    // You are on the floor when the next one comes.
    expect(AimResolution.resolve("snap", "drop")).toBe("miss");
    expect(AimResolution.resolve("settled", "drop")).toBe("graze");
  });

  it("`stand` is calling the bluff — it eats the settled shot", () => {
    expect(AimResolution.resolve("settled", "stand")).toBe("precise");
  });
});

describe("AimResolution — the step modifiers (AC 8)", () => {
  it("poor stability drops one rung", () => {
    expect(AimResolution.resolve("held", "stand", { poorStability: true })).toBe(
      "graze",
    );
  });

  it("beyond the effective band drops one rung", () => {
    expect(
      AimResolution.resolve("held", "stand", { beyondEffective: true }),
    ).toBe("graze");
  });

  it("a moving target drops one rung", () => {
    expect(AimResolution.resolve("held", "stand", { targetMoving: true })).toBe(
      "graze",
    );
  });

  it("cover quality drops one rung per level", () => {
    expect(AimResolution.resolve("settled", "stand", { coverQuality: 1 })).toBe(
      "hit",
    );
    expect(AimResolution.resolve("settled", "stand", { coverQuality: 2 })).toBe(
      "graze",
    );
  });

  it("modifiers compose, and the ladder floors at `miss`", () => {
    expect(
      AimResolution.resolve("settled", "stand", {
        poorStability: true,
        beyondEffective: true,
        targetMoving: true,
        coverQuality: 2,
      }),
    ).toBe("miss");
  });

  it("no modifiers is identity", () => {
    for (const aim of AIM_LADDER) {
      for (const answer of RANGE_ANSWERS) {
        expect(AimResolution.resolve(aim, answer, {})).toBe(
          AimResolution.resolve(aim, answer),
        );
      }
    }
  });
});

describe("AimResolution — a target with no answer (the coup case)", () => {
  it("resolves at `precise` from any aim state", () => {
    // Restrained or unconscious: there is no reactive window to spend.
    // Honest and grim, and the reason incapacitation needed its own rung
    // on the consent ladder rather than being a free tactical win.
    for (const aim of AIM_LADDER) {
      expect(AimResolution.resolve(aim, null)).toBe("precise");
    }
  });

  it("is not softened by modifiers — helplessness is not cover", () => {
    expect(
      AimResolution.resolve("snap", null, {
        poorStability: true,
        beyondEffective: true,
        coverQuality: 2,
      }),
    ).toBe("precise");
  });
});

describe("AimResolution — the Wave 1 placeholders, pinned loudly", () => {
  /**
   * ⚠ This test is SUPPOSED to fail when authored cover lands. `cover`
   * currently reads as `stand`, and a silent placeholder would otherwise
   * survive into a wave that believes cover works.
   */
  it("`cover` reads as `stand` until authored cover exists (Wave 2)", () => {
    for (const aim of AIM_LADDER) {
      expect(AimResolution.resolve(aim, "cover")).toBe(
        AimResolution.resolve(aim, "stand"),
      );
    }
  });

  it("a muscle-held launcher decays only at `settled`", () => {
    // Drawing IS aiming for a bow, so it cannot sit at the top of the
    // ladder. `settled` is not forbidden — it is self-defeating.
    expect(AimResolution.decaysWhileHeld(true, "settled")).toBe(true);
    expect(AimResolution.decaysWhileHeld(true, "held")).toBe(false);
    expect(AimResolution.decaysWhileHeld(true, "snap")).toBe(false);
    // A crossbow or gun holds itself ready — no hold window at all.
    for (const aim of AIM_LADDER) {
      expect(AimResolution.decaysWhileHeld(false, aim)).toBe(false);
    }
  });

  it("beyondEnvelope delegates to the band ladder", () => {
    expect(AimResolution.beyondEnvelope("far", "near")).toBe(true);
    expect(AimResolution.beyondEnvelope("close", "near")).toBe(false);
  });
});

describe("AimResolution — competence buys tempo, never steps (AC 9)", () => {
  /**
   * The politically load-bearing rule of the whole design: a novice's
   * shot is exactly as lethal as an expert's. Competence governs how
   * fast you settle and how much of your weapon's state you can read —
   * never where the round lands.
   *
   * At this layer the proof is structural: resolution takes no
   * competence input at all, so there is no channel through which a band
   * could reach a placement. The end-to-end assertion rides the engine.
   */
  it("resolution accepts no competence input — there is no channel", () => {
    // Two required parameters, both public commitments: the shooter's aim
    // and the target's answer. (`Function.length` stops at the first
    // defaulted param, so the optional modifiers and config do not count.)
    expect(AimResolution.resolve.length).toBe(2);
    const src = AimResolution.resolve.toString();
    expect(src).not.toMatch(/competence|skill|sharpness/i);
  });

  it("the modifier vocabulary is about the WORLD, not the shooter", () => {
    // Every step modifier is a fact anyone in the room could observe:
    // flight quality, distance, cover, movement. None is an attribute of
    // how good the shooter is.
    const src = JSON.stringify(DEFAULT_AIM_RESOLUTION_CONFIG);
    expect(src).not.toMatch(/competence|skill|bonus/i);
  });
});

describe("AimResolution — determinism (the rail)", () => {
  it("no Math.random anywhere on the resolution path", () => {
    // Risk must never come from dice. If a shot goes badly it is because
    // of a commitment somebody made and everybody could see.
    const sources = [
      AimResolution.resolve.toString(),
      AimResolution.step.toString(),
      AimResolution.at.toString(),
      AimResolution.rank.toString(),
    ].join("\n");
    expect(sources).not.toContain("Math.random");
  });

  it("is referentially transparent over every cell and modifier set", () => {
    for (const aim of AIM_LADDER) {
      for (const answer of RANGE_ANSWERS) {
        for (const mods of [
          {},
          { poorStability: true },
          { beyondEffective: true, targetMoving: true },
          { coverQuality: 2 as const },
        ]) {
          const a = AimResolution.resolve(aim, answer, mods);
          const b = AimResolution.resolve(aim, answer, mods);
          expect(a).toBe(b);
        }
      }
    }
  });

  it("the seeded config is the documented table", () => {
    expect(DEFAULT_AIM_RESOLUTION_CONFIG.matrix.snap).toEqual([
      "hit",
      "graze",
      "graze",
      "miss",
      "graze",
    ]);
    expect(DEFAULT_AIM_RESOLUTION_CONFIG.poorStabilityStep).toBe(-1);
  });
});
