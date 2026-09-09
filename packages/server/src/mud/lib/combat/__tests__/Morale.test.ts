/**
 * Morale — the derived read that finally makes `stopCondition: "yield"`
 * mean something.
 *
 * ⚠ The pins that matter are the ones that separate morale from poise. If
 * morale were just a rename of the poise band it would need no file, and
 * `assess` would be reading the same number twice.
 */

import { describe, it, expect } from "vitest";
import { Morale, DEFAULT_MORALE_CONFIG, type MoraleInputs } from "../Morale";
import { Poise } from "../Poise";
import type { CombatSession, CombatantState } from "../CombatSession";

/** A state stub carrying only what `Morale` reads. */
function state(over: Partial<CombatantState> = {}): CombatantState {
  return {
    poise: new Poise(),
    bandSeen: null,
    woundsTaken: [],
    side: "a",
    down: false,
    ...over,
  } as unknown as CombatantState;
}

const session = {} as unknown as CombatSession;

const inputs = (over: Partial<MoraleInputs> = {}): MoraleInputs => ({
  lethal: false,
  sentient: true,
  foes: 1,
  alliesDown: 0,
  foeBand: null,
  ...over,
});

describe("Morale — a fair fight going fine", () => {
  it("an untouched fighter in an even fight is resolute", () => {
    expect(Morale.bandFor(state(), session, inputs())).toBe("resolute");
  });
});

describe("Morale — what it reads that poise cannot", () => {
  it("⭐ wounds already taken move it while the footing is fine", () => {
    // The distinction the whole class exists for: poise says how the
    // MOMENT is going, morale says how the FIGHT has gone. A fighter cut
    // three times over with briefly-steady footing is in trouble, and no
    // poise read can say so.
    const composed = state();
    const cutUp = state({ woundsTaken: ["bites-deep", "bites-deep", "bites"] });
    expect(composed.poise.band()).toBe(cutUp.poise.band()); // identical footing
    expect(Morale.rank(Morale.bandFor(cutUp, session, inputs()))).toBeGreaterThan(
      Morale.rank(Morale.bandFor(composed, session, inputs())),
    );
  });

  it("⭐ the TREND matters — climbing out reads better than falling in", () => {
    const p1 = new Poise();
    p1.erode(0.6, 0); // reeling
    const p2 = new Poise();
    p2.erode(0.6, 0); // reeling, same band
    const falling = state({ poise: p1, bandSeen: "pressed" }); // was better
    const climbing = state({ poise: p2, bandSeen: "broken" }); // was worse
    expect(falling.poise.band()).toBe(climbing.poise.band());
    expect(
      Morale.pressure(falling, session, inputs()),
    ).toBeGreaterThan(Morale.pressure(climbing, session, inputs()));
  });

  it("being outnumbered and watching your side fall both count", () => {
    const base = Morale.pressure(state(), session, inputs());
    expect(
      Morale.pressure(state(), session, inputs({ foes: 3 })),
    ).toBeGreaterThan(base);
    expect(
      Morale.pressure(state(), session, inputs({ alliesDown: 2 })),
    ).toBeGreaterThan(base);
  });

  it("a foe who is themselves in trouble is less frightening", () => {
    const vsFresh = Morale.pressure(
      state({ woundsTaken: ["bites"] }),
      session,
      inputs({ foeBand: "steady" }),
    );
    const vsReeling = Morale.pressure(
      state({ woundsTaken: ["bites"] }),
      session,
      inputs({ foeBand: "broken" }),
    );
    expect(vsReeling).toBeLessThan(vsFresh);
  });
});

describe("Morale — the terms", () => {
  it("⭐ lethal terms lower a PERSON's break point", () => {
    // Dying is worse than losing, and a person knows it.
    const s = state({ woundsTaken: ["bites", "bites"] });
    expect(
      Morale.pressure(s, session, inputs({ lethal: true })),
    ).toBeGreaterThan(Morale.pressure(s, session, inputs({ lethal: false })));
  });

  it("⚠ a BEAST does not read terms at all", () => {
    const s = state({ woundsTaken: ["bites", "bites"] });
    expect(
      Morale.pressure(s, session, inputs({ lethal: true, sentient: false })),
    ).toBe(
      Morale.pressure(s, session, inputs({ lethal: false, sentient: false })),
    );
  });
});

describe("Morale — the bands", () => {
  it("a fighter losing badly, outnumbered and cut, is breaking", () => {
    const p = new Poise();
    p.erode(0.8, 0);
    const s = state({
      poise: p,
      bandSeen: "steady",
      woundsTaken: ["bites-deep", "bites"],
    });
    expect(
      Morale.bandFor(s, session, inputs({ foes: 2, lethal: true })),
    ).toBe("breaking");
  });

  it("the three bands are ordered and pressure never goes negative", () => {
    expect(Morale.forPressure(0)).toBe("resolute");
    expect(Morale.forPressure(DEFAULT_MORALE_CONFIG.shakenAt)).toBe("shaken");
    expect(Morale.forPressure(DEFAULT_MORALE_CONFIG.breakingAt)).toBe(
      "breaking",
    );
    // A steady fighter against a broken foe should not underflow.
    expect(
      Morale.pressure(state(), session, inputs({ foeBand: "open" })),
    ).toBeGreaterThanOrEqual(0);
  });

  it("⚠ it is NOT a rename of the poise band", () => {
    // Same band, three different morales — from wounds, from the trend,
    // and from the crowd. If this ever collapses, the read is redundant.
    const mk = (over: Partial<CombatantState>, i: Partial<MoraleInputs>) => {
      const p = new Poise();
      p.erode(0.6, 0);
      return Morale.pressure(state({ poise: p, ...over }), session, inputs(i));
    };
    const values = new Set([
      mk({}, {}),
      mk({ woundsTaken: ["bites-deep", "bites-deep"] }, {}),
      mk({}, { foes: 3, alliesDown: 2, lethal: true }),
    ]);
    expect(values.size).toBe(3);
  });
});
