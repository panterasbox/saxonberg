/**
 * `combatant` brain — the default enemy fighter (combat cycle 1).
 *
 * Unlike the witness/cadence brains, this one is invoked **directly** by
 * the {@link CombatSession} at its decision points (the session hand-
 * builds a minimal `BrainContext` and calls `act`), not through a global
 * trigger — combat owns its own concurrency and cadence. The asymmetry is
 * deliberate (requirements): the full directed-autocombat loop is
 * player-side; the enemy is brain-driven and simply *picks a gambit*.
 *
 * The brain stays stateless per the category contract: it reads the live
 * fight through `CombatApi` and expresses intent through
 * `CombatApi.queueGambit` — it never mutates session state itself. It ships
 * a lean tactician: press with `strike`, exploit an obvious opening (the
 * engine turns a strike into the exploit when the opponent is open), and
 * — the experience pass — **feint** a patient turtle (a steady, armed foe
 * that would just parry a strike) to crack their guard, then strike the
 * gap it opened. Feint/strike alternate by beat parity, so a foe who
 * *reads* the feint (higher competence) never traps the brain in a wasted
 * feint loop — the reader beating the feinter is the intended outcome.
 * Richer enemy tactics ride the deferred combat cycles.
 */

import type { EngagementSlot } from "../activity/Engaged";
import type { BrainContext, BrainStatics } from "./brain";
import { CombatApi } from "../../api/combat";
import { PartyApi } from "../../api/party";

export const brain = class {
  static label = "combatant";
  static claims: readonly EngagementSlot[] = ["body"];

  static act(ctx: BrainContext): void {
    const host = ctx.host;
    const session = CombatApi.sessionFor(host);
    if (!session) return;
    const state = session.getState(host);
    if (!state || state.down) return;

    // Disarmed? Draw a sidearm — losing your weapon is a tempo setback, not
    // the end of the fight (the fast draw re-arms after a couple of beats).
    if (state.flags.has("disarmed")) {
      if (CombatApi.drawSidearm(host).ok) return;
    }

    // Side-aware: act only while a live foe remains — someone in the fight
    // who is NOT on our side and not already down. Targeting itself is the
    // engine's job (side-driven `pickTarget`); the brain only decides the
    // gambit, and never fights on if only allies are left standing.
    const foes = session
      .getCombatants()
      .filter(
        (c) =>
          (c as unknown) !== (host as unknown) &&
          !session.getState(c)?.down &&
          !PartyApi.areAllied(host, c),
      );
    if (foes.length === 0) return;

    // When overextended (broken/open), don't queue — let the engine's
    // state-aware default cover up and recover. A fresh fighter presses
    // with a strike; a disarm is a situational choice when we've been
    // pressed to reeling. Eligibility is enforced by queueGambit, so an
    // ineligible pick is simply refused.
    const band = state.poise.band();
    if (band === "broken" || band === "open") return;

    // Reach tier: if a longer weapon is holding us at bay (we're at `reach`
    // and out-reached), close the gap first — a shorter weapon owns the
    // clinch, so turning the tables beats trading at a disadvantage.
    const rs = CombatApi.rangeStanding(host);
    if (
      rs &&
      rs.range === "reach" &&
      rs.reachDelta < 0 &&
      CombatApi.eligibilityFor(host, "close").ok
    ) {
      CombatApi.queueGambit(host, "close");
      return;
    }

    if (band === "reeling" && CombatApi.eligibilityFor(host, "disarm").ok) {
      CombatApi.queueGambit(host, "disarm");
      return;
    }

    // Feint a patient turtle: a steady foe who is armed (so they'd parry a
    // strike) is exactly who the feint punishes. Alternate feint/strike by
    // beat parity so a reader can't trap us in a wasted-feint loop, and so
    // the beat after a successful feint we strike the opening it cracked.
    //
    // Formation bias (NPC≈PC — the same chain a player's formation
    // resolves through): a **protector**-role holder (a Vanguard front, an
    // MA master) leans into the opening-CREATION line — it feints a steady
    // armed foe on every beat, not just parity beats, because the window
    // it arms is cashed by the ally it protects (openings live on the
    // defender's poise, ally-exploitable), so a wasted-feint loop costs
    // the protector little and feeds the ward much.
    const foe = foes[0];
    const foeSteady = (foe && session.getState(foe)?.poise.band()) === "steady";
    const foeArmed = CombatApi.eligibilityFor(host, "disarm").ok;
    const protector = CombatApi.formationStandingOf(host).protector;
    if (
      foeSteady &&
      foeArmed &&
      (protector || session.getBeat() % 2 === 0) &&
      CombatApi.eligibilityFor(host, "feint").ok
    ) {
      CombatApi.queueGambit(host, "feint");
      return;
    }
    CombatApi.queueGambit(host, "strike");
  }
} satisfies BrainStatics;
