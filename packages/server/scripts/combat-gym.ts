/**
 * combat-gym — a headless balance harness for the combat engine.
 *
 * Because a `CombatSession` is a **deterministic** single-thread coroutine
 * (no `Math.random` anywhere in the exchange path), a whole fight runs
 * in-process, to resolution, with **no scheduler and no wall-clock** — you
 * just loop `CombatApi.advance(session)` (exactly what the unit tests do).
 * That makes automated balance-testing possible: instantiate two fighters
 * under a loadout + policy, run to resolution, and read the winner; do it
 * across a matrix of skill × policy × loadout matchups and read the outcome
 * distribution. Degeneracies (a policy that always wins, a turtle that can't
 * be cracked) surface *before players find them* — the determinism we chose
 * for honesty is the same property that lets a machine find the numbers.
 *
 * This is a **dev tool**, not a game surface: no Api, no verb, no world
 * state, registers nothing. It lives in `scripts/` with the other dev
 * tooling (`project-author-surface`, `check-gate-strings`) and is exercised
 * by `scripts/__tests__/combat-gym.test.ts`, which supplies the headless
 * fighter factory (so this module imports nothing from `__tests__`). All
 * variation across a run comes from the **matchup matrix** (competence /
 * policy / loadout permutations), never from RNG — a single matchup is
 * bit-for-bit reproducible.
 */

import type { Stuff } from "../src/mud/lib/stuff/Stuff";
import type { Engaged } from "../src/mud/lib/activity/Engaged";
import { CombatApi } from "../src/mud/api/combat";
import {
  CombatTerms,
  type TermsProposal,
} from "../src/mud/lib/combat/CombatTerms";
import type {
  CombatSession,
  CombatantState,
} from "../src/mud/lib/combat/CombatSession";
import type { CompetenceBandName } from "../src/mud/lib/advancement/CompetenceBand";

/**
 * A fighting policy: given the live session and the acting combatant, the
 * gambit key to queue this beat (or `null` to defer to the engine's brain —
 * used for the NPC≈PC parity check). Deterministic by construction.
 */
export type GymPolicy = (
  session: CombatSession,
  self: Stuff & Engaged,
) => string | null;

/** One corner of a matchup: how to build the fighter and how it fights. */
export interface GymSide {
  label: string;
  make: () => Stuff & Engaged;
  policy: GymPolicy;
  /** Snapshotted competence band (drives sharpness → fog + recovery). */
  band?: CompetenceBandName;
}

export interface MatchupResult {
  winner: "A" | "B" | "draw";
  beats: number;
}

/** The canonical policies the balance matrix is built from. */
export const Policies: Record<string, GymPolicy> = {
  /** The patient defender — always cover up and recover (the turtle). */
  turtle: () => "defend",
  /** Blind aggression — always strike (walks into a steady guard). */
  aggressor: () => "strike",
  /**
   * Aggression that answers a turtle: feint a steady, armed foe (on even
   * beats, so a reader can't trap it in a wasted-feint loop) to crack the
   * guard, then strike the opening. Mirrors the `combatant` brain.
   */
  feinter: (session, self) => {
    const foe = firstFoe(session, self);
    const foeSteady = (foe && session.getState(foe)?.poise.band()) === "steady";
    const foeArmed = CombatApi.eligibilityFor(self, "disarm").ok;
    if (
      foeSteady &&
      foeArmed &&
      session.getBeat() % 2 === 0 &&
      CombatApi.eligibilityFor(self, "feint").ok
    ) {
      return "feint";
    }
    return "strike";
  },
  /** Defer to the engine's own combat brain (the NPC path). */
  brain: () => null,
};

/** A live foe of `self` in the session (not self, not down). */
function firstFoe(
  session: CombatSession,
  self: Stuff & Engaged,
): (Stuff & Engaged) | null {
  for (const s of session.getStates()) {
    if ((s.combatant as Stuff) !== (self as Stuff) && !s.down) {
      return s.combatant;
    }
  }
  return null;
}

/**
 * Run one matchup to resolution and report the winner. Uses **non-lethal**
 * terms (incapacitation is the terminus — no death/coup), and reads the
 * loser off the `down` flag: the `CombatantState` objects are captured at
 * open, so their `down` is readable even after the resolving beat clears the
 * session's participant map.
 */
export function runMatchup(
  a: GymSide,
  b: GymSide,
  maxBeats = 400,
  /**
   * A per-matchup state reset, called BEFORE the fighters are built. A
   * `CombatSession` is deterministic in a *clean* world, so a matrix that
   * runs several matchups back-to-back must reset between them (else each
   * fight runs in a registry littered with the previous fight's objects — a
   * different world, a different result). The gym is a dev tool and imports
   * nothing from the test harness, so the reset is supplied by the caller.
   */
  reset?: () => void,
  /**
   * Post-build wiring seam (the formations matrix): the caller assembles
   * any party/formation state around the two built fighters before the
   * session opens (raw test-seam writes are synchronous). The gym module
   * itself stays party-agnostic.
   */
  setup?: (fa: Stuff & Engaged, fb: Stuff & Engaged) => void,
): MatchupResult {
  reset?.();
  const fa = a.make();
  const fb = b.make();
  setup?.(fa, fb);
  const competenceBands = new Map<string, CompetenceBandName>();
  const ka = fa.getTemplatePath();
  const kb = fb.getTemplatePath();
  if (a.band && ka) competenceBands.set(ka, a.band);
  if (b.band && kb) competenceBands.set(kb, b.band);

  const proposal: TermsProposal = {
    lethality: "non-lethal",
    stopCondition: "yield",
    stakes: "",
  };
  const terms = CombatTerms.agreed(ka ?? "a", proposal, true);
  const opened = CombatApi.openSession(fa, fb, terms, { competenceBands });
  if (!opened.ok) throw new Error(`gym: openSession failed (${opened.reason})`);
  const session = opened.session;

  // Hold the state objects — they are mutated in place, so `down` survives
  // the session clearing its map at resolution.
  const aState = session.getState(fa) as CombatantState;
  const bState = session.getState(fb) as CombatantState;

  let beats = 0;
  while (session.isActive() && beats < maxBeats) {
    for (const [f, side] of [
      [fa, a],
      [fb, b],
    ] as const) {
      const st = session.getState(f);
      if (!st || st.down) continue;
      const gambit = side.policy(session, f);
      if (gambit) CombatApi.queueGambit(f, gambit);
    }
    CombatApi.advance(session);
    beats++;
  }
  session.dissolve();

  const winner: MatchupResult["winner"] = aState.down
    ? "B"
    : bState.down
      ? "A"
      : "draw";
  return { winner, beats };
}

/** One fighter of a party-matchup side (the formations matrix). */
export interface GymPartyFighter {
  label: string;
  make: () => Stuff & Engaged;
  policy: GymPolicy;
  /** Snapshotted competence band (drives sharpness → fog + recovery). */
  band?: CompetenceBandName;
  /**
   * Which OPPOSING fighter (by index) this one enters the fight against
   * (default 0). Shapes the initial engagement topology — the sustained
   * edges a formation's allocation policy is measured against.
   */
  joinOnto?: number;
}

/** A party-matchup side: N fighters fighting as one side. */
export interface GymPartySide {
  fighters: GymPartyFighter[];
}

export interface PartyMatchupResult {
  winner: "A" | "B" | "draw";
  beats: number;
  /** Which fighters (by label) ended the run downed. */
  downs: Record<string, boolean>;
}

/**
 * Run an N-vs-M matchup to resolution (the formations matrix). Same
 * shape as {@link runMatchup} scaled out: A's first fighter opens on B's
 * first, everyone else joins (A-siders onto B's first, B-siders onto A's
 * first), and the loop queues each standing fighter's policy each beat.
 * Party/formation wiring is the caller's `setup` (run after every
 * fighter is built, before the session opens) — the gym module itself
 * knows nothing about parties. Non-lethal terms: the engine resolves at
 * the FIRST down, so `winner` = the side with nobody down, and `downs`
 * names the fallen (the MA sustain claims read it). Deterministic per
 * cell, like everything here.
 */
export function runPartyMatchup(
  a: GymPartySide,
  b: GymPartySide,
  maxBeats = 400,
  reset?: () => void,
  setup?: (aF: (Stuff & Engaged)[], bF: (Stuff & Engaged)[]) => void,
): PartyMatchupResult {
  reset?.();
  const aF = a.fighters.map((f) => f.make());
  const bF = b.fighters.map((f) => f.make());
  setup?.(aF, bF);

  const competenceBands = new Map<string, CompetenceBandName>();
  for (const [specs, built] of [
    [a.fighters, aF],
    [b.fighters, bF],
  ] as const) {
    specs.forEach((spec, i) => {
      const key = built[i]!.getTemplatePath();
      if (spec.band && key) competenceBands.set(key, spec.band);
    });
  }

  const proposal: TermsProposal = {
    lethality: "non-lethal",
    stopCondition: "yield",
    stakes: "",
  };
  const terms = CombatTerms.agreed(
    aF[0]!.getTemplatePath() ?? "a",
    proposal,
    true,
  );
  const opened = CombatApi.openSession(aF[0]!, bF[0]!, terms, {
    competenceBands,
  });
  if (!opened.ok) throw new Error(`gym: openSession failed (${opened.reason})`);
  const session = opened.session;
  // B-siders enter first (their only in-session counterpart is a0), then
  // A-siders — whose `joinOnto` may target any B fighter, all of whom are
  // now in the fight. The entry topology is the sustained-edge baseline a
  // formation's allocation is measured against.
  for (let i = 1; i < bF.length; i++) {
    const onto = aF[Math.min(b.fighters[i]!.joinOnto ?? 0, aF.length - 1)]!;
    const joined = CombatApi.join(bF[i]!, onto, terms, { competenceBands });
    if (!joined.ok) throw new Error(`gym: join failed (${joined.reason})`);
  }
  for (let i = 1; i < aF.length; i++) {
    const onto = bF[Math.min(a.fighters[i]!.joinOnto ?? 0, bF.length - 1)]!;
    const joined = CombatApi.join(aF[i]!, onto, terms, { competenceBands });
    if (!joined.ok) throw new Error(`gym: join failed (${joined.reason})`);
  }

  // Hold every state — mutated in place, readable after resolution.
  const states = [...aF, ...bF].map(
    (f) => session.getState(f) as CombatantState,
  );

  let beats = 0;
  while (session.isActive() && beats < maxBeats) {
    for (const [specs, built] of [
      [a.fighters, aF],
      [b.fighters, bF],
    ] as const) {
      specs.forEach((spec, i) => {
        const f = built[i]!;
        const st = session.getState(f);
        if (!st || st.down) return;
        const gambit = spec.policy(session, f);
        if (gambit) CombatApi.queueGambit(f, gambit);
      });
    }
    CombatApi.advance(session);
    beats++;
  }
  session.dissolve();

  const downs: Record<string, boolean> = {};
  [...a.fighters, ...b.fighters].forEach((spec, i) => {
    downs[spec.label] = states[i]!.down;
  });
  const aDown = a.fighters.some((s) => downs[s.label]);
  const bDown = b.fighters.some((s) => downs[s.label]);
  const winner: PartyMatchupResult["winner"] =
    aDown === bDown ? "draw" : aDown ? "B" : "A";
  return { winner, beats, downs };
}

export interface MatchupSpec extends MatchupResult {
  label: string;
}

/**
 * Run a matrix of matchups and tally the outcome distribution. Each spec is
 * a distinct matchup (the variation is the matrix, not repetition — a single
 * matchup is deterministic). Returns per-matchup results plus an A-side
 * win-rate the bench asserts bands on.
 */
export function runMatrix(
  specs: Array<{ label: string; a: GymSide; b: GymSide }>,
  /** Per-matchup state reset (see {@link runMatchup}) — each matrix cell is
   * an independent clean-world experiment. */
  reset?: () => void,
): {
  results: MatchupSpec[];
  aWinRate: number;
  aWins: number;
  bWins: number;
  draws: number;
} {
  const results: MatchupSpec[] = specs.map(({ label, a, b }) => ({
    label,
    ...runMatchup(a, b, 400, reset),
  }));
  const aWins = results.filter((r) => r.winner === "A").length;
  const bWins = results.filter((r) => r.winner === "B").length;
  const draws = results.filter((r) => r.winner === "draw").length;
  const decided = aWins + bWins;
  return {
    results,
    aWins,
    bWins,
    draws,
    aWinRate: decided > 0 ? aWins / decided : 0,
  };
}
