/**
 * CombatApi — the gated, typed forwarding shell for the combat subsystem.
 *
 * The sole entry to fight lifecycle, gambit resolution, poise mutation,
 * per-beat advance, and (Build 2) blame reads. The orchestration lives in
 * the hot-reloadable {@link CombatLogic} singleton at `/obj/api/combat`,
 * reached synchronously via `StuffApi.singletonSync`; the `FooApi`
 * statics forward there. Mirrors the `ConditionApi ↔ ConditionLogic`
 * shape exactly.
 *
 * Combat computes no damage and stores nothing lasting on the
 * `Creature`: consequence rides `ConditionApi.inflict`, witnessed acts
 * ride `noteReactableAct`, and the session state is transient. The
 * genuinely-new piece the Logic owns is poise + the exchange engine.
 */

import type { Stuff } from "../lib/stuff/Stuff";
import type { Engaged } from "../lib/activity/Engaged";
import type { CombatSession } from "../lib/combat/CombatSession";
import type { CombatTerms } from "../lib/combat/CombatTerms";
import { SecurityApi } from "./security";
import { StuffApi } from "./stuff";
import { HotReloadApi } from "./hot-reload";
import { CombatLogic } from "../obj/api/CombatLogic";
import { fileURLToPath } from "url";

/** Result of opening a session. */
export type OpenSessionResult =
  | { ok: true; session: CombatSession }
  | { ok: false; reason: "busy" | "not-engageable" | "start-rejected" };

/** Attempt-time eligibility verdict for a gambit. */
export interface GambitEligibility {
  ok: boolean;
  reason?:
    | "not-in-combat"
    | "unknown-gambit"
    | "downed"
    | "no-instrument"
    | "target-unarmed"
    | "wrong-band";
}

const LOGIC_PATH = "/obj/api/combat";
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL("../obj/api/CombatLogic", import.meta.url),
);

/** Resolve the HMR-able CombatLogic singleton (sync). */
function logic(): CombatLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        "CombatLogic",
      ) as typeof CombatLogic | null) ?? CombatLogic)(),
  );
}

export class CombatApi {
  private constructor() {}

  /** Open a fight between two combatants under agreed terms. */
  public static openSession(
    initiator: Stuff & Engaged,
    defender: Stuff & Engaged,
    terms: CombatTerms,
  ): OpenSessionResult {
    return logic().openSession(initiator, defender, terms);
  }

  /** Advance one narration beat. Called by `CombatSession.tick()`. */
  public static advance(session: CombatSession): void {
    logic().advance(session);
  }

  /** Set the actor's intent for the next exchange (non-blocking). */
  public static queueGambit(actor: Stuff, gambitKey: string): GambitEligibility {
    return logic().queueGambit(actor, gambitKey);
  }

  /** Attempt-time eligibility for a gambit (capability + band + parts). */
  public static eligibilityFor(
    actor: Stuff,
    gambitKey: string,
  ): GambitEligibility {
    return logic().eligibilityFor(actor, gambitKey);
  }

  /** The actor's active combat session, or undefined. */
  public static sessionFor(combatant: Stuff): CombatSession | undefined {
    return logic().sessionFor(combatant);
  }

  /** The actor yields — resolves the fight in the opponent's favour. */
  public static yieldFight(actor: Stuff): boolean {
    return logic().yieldFight(actor);
  }
}

SecurityApi.decorateApiClass(CombatApi);
