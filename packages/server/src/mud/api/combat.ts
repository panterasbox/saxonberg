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
import type CombatAttributionEvent from "../lib/combat/CombatAttributionEvent";
import type { BlameVerdict } from "../lib/combat/CombatAttributionEvent";
import type { CompetenceBandName } from "../lib/advancement/CompetenceBand";

export type { BlameVerdict } from "../lib/combat/CombatAttributionEvent";
import { SecurityApi } from "./security";
import { StuffApi } from "./stuff";
import { HotReloadApi } from "./hot-reload";
import { CombatLogic } from "../obj/api/CombatLogic";
import { fileURLToPath } from "url";

/** Result of opening a session. */
export type OpenSessionResult =
  | { ok: true; session: CombatSession }
  | { ok: false; reason: "busy" | "not-engageable" };

/**
 * Optional inputs the caller snapshots at open/join. `competenceBands` maps
 * a combatant's durable `templatePath` → its competence band in this fight's
 * discipline, resolved *synchronously* by the controller (the async
 * `AdvancementApi.bandFor` awaited before open, never mid-beat) so a single
 * session stays deterministic. Absent entries default to `untrained`.
 */
export interface CombatOpenOptions {
  competenceBands?: Map<string, CompetenceBandName>;
}

/** The tactical read `assess` returns while a fight is live. */
export interface CombatAssessResult {
  ok: boolean;
  reason?: "not-in-combat" | "no-target";
  /** The opponent's poise band (bands, never numbers) — fogged by the
   * reader's own sharpness (a dull reader under-reads, and a feint shows as
   * `open`). */
  poiseBand?: string;
  /** Present when the reader saw through a feint (`"feint"`) — the tell only
   * a sharp enough reader perceives. */
  read?: "feint";
  /** The opponent's active combat flags (disarmed/prone/…). */
  flags?: string[];
  /** Whether the opponent is presently armed. */
  armed?: boolean;
  /** The opponent's condition band, competence-gated. */
  conditionBand?: string;
}

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
    opts?: CombatOpenOptions,
  ): OpenSessionResult {
    return logic().openSession(initiator, defender, terms, opts);
  }

  /** Advance one narration beat. Called by `CombatSession.tick()`. */
  public static advance(session: CombatSession): void {
    logic().advance(session);
  }

  /**
   * A new combatant joins an existing fight (a gang-up / a bystander drawn
   * in): a participant + `body` hold + a mutual threat edge under `terms`,
   * side frozen from the party seam.
   */
  public static join(
    joiner: Stuff & Engaged,
    target: Stuff & Engaged,
    terms: CombatTerms,
    opts?: CombatOpenOptions,
  ): { ok: boolean; reason?: string } {
    return logic().join(joiner, target, terms, opts);
  }

  /** Fold two colliding fights into one (participants + edges move onto
   * the survivor; the other's beat is torn down). */
  public static merge(a: CombatSession, b: CombatSession): void {
    logic().merge(a, b);
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

  /**
   * The blame verdict for a victim's death, derived on read by replaying
   * the append-only attribution ledger. `null` if the victim has no
   * attributed combat death. `victimId` is the durable `templatePath`.
   */
  public static blameFor(victimId: string): Promise<BlameVerdict | null> {
    return logic().blameFor(victimId);
  }

  /** Every attribution row for a fight (read/analytics; ordered by realAt). */
  public static attributionFor(
    sessionId: string,
  ): Promise<CombatAttributionEvent[]> {
    return logic().attributionFor(sessionId);
  }

  /**
   * Stay a coup in progress — any present party (or the executioner's own
   * hand) stops the killing stroke on `target` (the victim or the
   * executioner of a live coup). Returns true if a coup was interrupted.
   */
  public static intervene(actor: Stuff, target: Stuff): boolean {
    return logic().intervene(actor, target);
  }

  /**
   * `defend <ally>` — interpose: pull a foe's pressure off a pressed ally
   * onto yourself (join the fight if needed, then redirect the foe's
   * threat edge from the ally onto you).
   */
  public static defendAlly(
    interposer: Stuff,
    ally: Stuff,
  ): { ok: boolean; reason?: string } {
    return logic().defendAlly(interposer, ally);
  }

  /**
   * Break off from a fight to leave (fleeing = a locomotion attempt made
   * while engaged). A no-op when the actor isn't fighting; otherwise an
   * opposed-lite disengage — a focus-fire pin blocks it (`ok:false`), and
   * every foe still locked on gets a parting shot. The movement controller
   * calls this before a traverse.
   */
  public static disengage(actor: Stuff): { ok: boolean; message?: string } {
    return logic().disengage(actor);
  }

  /**
   * The costed, competence-graded tactical read of an opponent mid-fight
   * — spends the actor's next exchange and mints a combat `ActSignature`.
   */
  public static assess(actor: Stuff, target: Stuff): CombatAssessResult {
    return logic().assess(actor, target);
  }
}

SecurityApi.decorateApiClass(CombatApi);
