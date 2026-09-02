/**
 * CombatApi — the gated, typed forwarding shell for the combat subsystem.
 *
 * The sole entry to fight lifecycle, gambit resolution, poise mutation,
 * per-beat advance, and (Build 2) blame reads. The orchestration lives in
 * the hot-reloadable {@link CombatLogic} singleton at `/platform/idea/api/combat`,
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
import type AccountabilityEvent from "../lib/accountability/AccountabilityEvent";
import type { BlameVerdict } from "../lib/accountability/AccountabilityEvent";
import type { CompetenceBandName } from "../lib/advancement/CompetenceBand";
import type { WeaponProfile } from "../lib/combat/WeaponProfile";
import type { RangeState } from "../lib/combat/CombatGraph";
import type { TermsProposal } from "../lib/combat/CombatTerms";
import type {
  InitiateResult,
  ThrownDelivery,
} from "../platform/idea/api/CombatLogic";
import type {
  CombatInfluence,
  InfluenceResult,
} from "../lib/combat/CombatInfluence";

export type { BlameVerdict } from "../lib/accountability/AccountabilityEvent";
export type {
  InitiateResult,
  ThrownDelivery,
} from "../platform/idea/api/CombatLogic";
export type {
  CombatInfluence,
  InfluenceResult,
} from "../lib/combat/CombatInfluence";
import { StuffApi } from "./stuff";
import { HotReloadApi } from "./hot-reload";
import { CombatLogic } from "../platform/idea/api/CombatLogic";
import { fileURLToPath } from "url";
import { SecurityApi } from './security';

/** Result of opening a session. */
export type OpenSessionResult =
  | { ok: true; session: CombatSession }
  | {
      ok: false;
      reason: "busy" | "not-engageable" | "sanctuary";
      /** Player-readable prose when a sanctuary refused the fight. */
      refusal?: string;
    };

/**
 * Optional inputs the caller snapshots at open/join. `competenceBands` maps
 * a combatant's durable `templatePath` → its competence band in this fight's
 * discipline, resolved *synchronously* by the controller (the async
 * `AdvancementApi.bandFor` awaited before open, never mid-beat) so a single
 * session stays deterministic. Absent entries default to `untrained`.
 */
export interface CombatOpenOptions {
  competenceBands?: Map<string, CompetenceBandName>;
  /**
   * The opening was an **ambush** — struck from concealment the defender
   * did not perceive. Surprise **denies the opening poise contest**: the
   * defender starts broken/open (a `combat.ambush.poisePenalty` drop that
   * arms the aggressor's free first exchange). Resolved by the attacker's
   * controller (`hiding && !perceives(defender, attacker)`); consumed only
   * when a *fresh* session opens (a target already fighting isn't
   * ambushed). Not a damage multiplier — the exchange still routes through
   * `ConditionApi.inflict`; the "crit" is the earned open window.
   */
  ambush?: boolean;
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

/**
 * The actor's own formation standing (total — a solo actor reads the
 * default formation, no role): the preset name, the actor's assigned
 * role, and whether that role is a protector (interceptor) role. Powers
 * the `fight` status lines and the combatant brain's protector bias.
 * Deliberately says nothing about the ENEMY's formation (the fog
 * non-goal — reading the opposing preset is a deferred `assess` face).
 */
export interface FormationStanding {
  formation: string;
  role: string;
  protector: boolean;
}

/**
 * The actor's engagement range against its current primary foe + its reach
 * delta (positive = the actor out-reaches the foe). Drives the brain's
 * close-the-gap policy and the `fight` status read.
 */
export interface RangeStanding {
  range: RangeState;
  /** `reachRank(actor) - reachRank(foe)`: >0 longer, <0 shorter, 0 equal. */
  reachDelta: number;
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
    | "wrong-band"
    | "wrong-weapon"
    | "no-shield"
    | "tetanized";
}

const LOGIC_PATH = "/platform/idea/api/combat";
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL("../platform/idea/api/CombatLogic", import.meta.url),
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

  /** The actor's active combat session, or undefined. */
  public static sessionFor(combatant: Stuff): CombatSession | undefined {
    return logic().sessionFor(combatant);
  }

  /**
   * `fight break` — offer a mutual stand-down. Resolves the actor's beat
   * as a cover-up and posts an offer; a reciprocated fresh offer dissolves
   * the threat edge, and a fully edgeless session ends as a draw (no
   * victor, no defeat — unlike `yieldFight`, which concedes and records a
   * loss). `broke` is true when this call dissolved at least one edge.
   */
  /**
   * The blame verdict for a victim's death, derived on read by replaying
   * the append-only attribution ledger. `null` if the victim has no
   * attributed combat death. `victimId` is the durable `templatePath`.
   */
  public static blameFor(victimId: string): Promise<BlameVerdict | null> {
    return logic().blameFor(victimId);
  }

  /**
   * The range band between `a` and `b` (null = not co-present) — the
   * subject-NEUTRAL geometry read: either side may be an item (a wand
   * origin measures reach from itself — the EffectContext split), so
   * this stays a two-object static; a combatant's own read is
   * `combatant.bandTo(other)`.
   */
  public static bandBetween(a: Stuff, b: Stuff): RangeState | null {
    return logic().bandBetween(a, b);
  }

  /** Every attribution row for a fight (read/analytics; ordered by realAt). */
  public static attributionFor(
    sessionId: string,
  ): Promise<AccountabilityEvent[]> {
    return logic().attributionFor(sessionId);
  }

  /**
   * A combatant's standing combat terms — the player-side `combat.*`
   * settings and the authored `CombatantMixin` posture, folded. Either
   * surface declaring `lethal` brings lethal terms.
   */
  public static standingTermsOf(
    combatant: Stuff,
    lethal?: boolean,
    to?: string,
  ): TermsProposal {
    return logic().standingTermsOf(combatant, lethal, to);
  }

  /**
   * The widest band this combatant's arena affords, derived from the
   * room's real linear extent — a 3 m cell caps at `reach`, an authored
   * 20 m outdoor cell reaches `far`. Nobody authors a band.
   */
  public static arenaMaxBandFor(who: Stuff): RangeState {
    return logic().arenaMaxBandFor(who);
  }

}

SecurityApi.decorateApiClass(CombatApi);
