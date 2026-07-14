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
 * `CombatApi.queueGambit` — it never mutates session state itself. Build 1
 * ships a lean tactician: press with `strike`, and exploit an obvious
 * opening (the engine turns a strike into the exploit when the opponent
 * is open). Richer enemy tactics ride the deferred combat cycles.
 */

import type { EngagementSlot } from "../activity/Engaged";
import type { BrainContext, BrainStatics } from "./brain";
import { CombatApi } from "../../api/combat";

export const brain = class {
  static label = "combatant";
  static claims: readonly EngagementSlot[] = ["body"];

  static act(ctx: BrainContext): void {
    const host = ctx.host;
    const session = CombatApi.sessionFor(host);
    if (!session) return;
    const state = session.getState(host);
    if (!state || state.down) return;

    // When overextended (broken/open), don't queue — let the engine's
    // state-aware default cover up and recover. A fresh fighter presses
    // with a strike; a disarm is a situational choice when the opponent
    // is armed and we've been pressed. Eligibility is enforced by
    // queueGambit, so an ineligible pick is simply refused.
    const band = state.poise.band();
    if (band === "broken" || band === "open") return;

    if (
      band === "reeling" &&
      session.opponentState(host) &&
      CombatApi.eligibilityFor(host, "disarm").ok
    ) {
      CombatApi.queueGambit(host, "disarm");
      return;
    }
    CombatApi.queueGambit(host, "strike");
  }
} satisfies BrainStatics;
