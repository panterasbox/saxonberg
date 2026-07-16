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
): MatchupResult {
  const fa = a.make();
  const fb = b.make();
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
): {
  results: MatchupSpec[];
  aWinRate: number;
  aWins: number;
  bWins: number;
  draws: number;
} {
  const results: MatchupSpec[] = specs.map(({ label, a, b }) => ({
    label,
    ...runMatchup(a, b),
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
