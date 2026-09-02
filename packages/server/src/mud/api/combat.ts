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
  ): Promise<AccountabilityEvent[]> {
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
   * The captain's execution directive (`fight finish`): release a coup
   * **held** under a `coupCall: 'captain'` formation in the captain's
   * room. The directive is recorded on the death row (`directedBy`) — a
   * directed formation implies command responsibility. A held coup the
   * captain never orders expires spared (mercy by default).
   */
  public static orderCoup(captain: Stuff): { ok: boolean; reason?: string } {
    return logic().orderCoup(captain);
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

  /**
   * The **free** fogged read of the actor's opponent — the competence-hedged
   * band + feint `tell`, with no cost and no side-effects. Powers the
   * always-available `fight` status line; `assess` is the costed wrapper.
   */
  public static perceive(actor: Stuff): CombatAssessResult {
    return logic().perceive(actor);
  }

  /**
   * The derived {@link WeaponProfile} for a weapon (config-injected from the
   * `combat.weapon.*` dials) — the authoritative live playstyle read the
   * `analyze weapon` preview and the combat couplings consult. `null` when
   * the target isn't a `Weapon`.
   */
  public static weaponProfileOf(weapon: Stuff): WeaponProfile | null {
    return logic().weaponProfileOf(weapon);
  }

  /**
   * The actor's engagement range against its current primary foe + its reach
   * delta (the reach tier read the `combatant` brain uses to decide whether
   * to close the gap, and the `fight` status read surfaces). `null` when the
   * actor isn't fighting or has no live foe.
   */
  public static rangeStanding(actor: Stuff): RangeStanding | null {
    return logic().rangeStanding(actor);
  }

  /**
   * **Start a fight** — the one initiation handshake, wherever the act
   * comes from.
   *
   * Reconciles both sides' standing terms, prompts on a conflict (via the
   * caller's `onConflict`, because asking is a UI act), snapshots melee
   * competence, warms the formation Ideas, reads the ambush *before*
   * revealing the attacker, and then opens / joins / merges as the
   * situation requires.
   *
   * Every initiating verb must go through this rather than reproducing
   * the sequence. `attack` and `throw ... at` routing "identically" is a
   * fact only while there is one copy of it.
   */
  public static initiate(
    initiator: Stuff,
    target: Stuff,
    overrides?: { lethal?: boolean; to?: string },
    onConflict?: (
      target: Stuff,
      mine: TermsProposal,
    ) => Promise<boolean | null | "cancelled">,
  ): Promise<InitiateResult> {
    return logic().initiate(initiator, target, overrides, onConflict);
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
   * The engagement band between two combatants — the location-aware read.
   *
   * Prefer this to `CombatGraph.rangeBetween`, which is a pure
   * value-object and answers `close` for a pair it has never seen. `null`
   * means the two are not co-present at all.
   */
  public static bandBetween(a: Stuff, b: Stuff): RangeState | null {
    return logic().bandBetween(a, b);
  }

  /**
   * The widest band this combatant's arena affords, derived from the
   * room's real linear extent — a 3 m cell caps at `reach`, an authored
   * 20 m outdoor cell reaches `far`. Nobody authors a band.
   */
  public static arenaMaxBandFor(who: Stuff): RangeState {
    return logic().arenaMaxBandFor(who);
  }

  /**
   * Resolve a thrown carrier's arrival: where it landed, whether the
   * vessel broke, and how its real volume divides between the target,
   * whoever is clinched with them, and the floor.
   *
   * Returns a PLAN rather than applying one — discharging into each
   * victim and pooling the remainder are world mutations with their own
   * gates, and they belong to the caller.
   */
  public static resolveThrown(
    thrower: Stuff,
    target: Stuff,
    contents: {
      litres: number;
      toughness?: number;
      hardness?: number;
      massKg?: number;
    },
    splash: readonly Stuff[],
  ): ThrownDelivery {
    return logic().resolveThrown(thrower, target, contents, splash);
  }

  /**
   * Everyone an area delivery aimed at `target` would catch: the target
   * plus whoever is clinched (`close`) with them. Bands are relationships
   * rather than positions, so this is the honest reading of "splash" —
   * no radius, no geometry.
   */
  public static splashSetFor(target: Stuff): Stuff[] {
    return logic().splashSetFor(target);
  }

  /**
   * The commit-time consent gate for an area delivery. The primary target
   * runs the ordinary terms handshake (attacking the unwilling is a crime,
   * not an impossibility); every OTHER sentient caught in the splash must
   * already stand under consented terms with the thrower, or the whole act
   * is refused before it commits.
   *
   * Area delivery must not be a cheaper route to a person than aiming at
   * them.
   */
  public static mayDeliverTo(
    thrower: Stuff,
    primary: Stuff,
    splash: readonly Stuff[],
  ): { ok: true } | { ok: false; refusedBy: Stuff } {
    return logic().mayDeliverTo(thrower, primary, splash);
  }

  /**
   * The actor's own formation standing (preset + role + protector flag) —
   * total, never null; a partyless actor reads the default formation.
   * The `fight` status lines and the combatant brain's protector bias
   * consume this; the enemy's formation is deliberately not readable.
   */
  public static formationStandingOf(actor: Stuff): FormationStanding {
    return logic().formationStandingOf(actor);
  }

  /**
   * Begin a **deliberate weapon switch** to `target` (a carried weapon) — a
   * vulnerable durative beat: while it runs the combatant can't strike and
   * their guard is down, and when it completes the grip is swapped. Fails if
   * not in combat, downed, or already switching.
   */
  public static beginSwitch(
    actor: Stuff,
    target: Stuff,
  ): { ok: boolean; reason?: string } {
    return logic().beginSwitch(actor, target);
  }

  /**
   * **Draw a sidearm** — a fast switch to a sheathed/carried backup weapon,
   * the answer to being disarmed (a tempo setback, not a fight-ender). Fails
   * with `no-sidearm` when nothing is available to draw.
   */
  public static drawSidearm(actor: Stuff): { ok: boolean; reason?: string } {
    return logic().drawSidearm(actor);
  }

  /**
   * The external state-instruction bridge — "Effect iff gated Api" made
   * real for combat state. An external system (magic, the script
   * interpreter) issues one {@link CombatInfluence} instruction into the
   * combatant's live session: `stagger` (banded, focus-fire-scaled poise
   * erosion — a crossing arms the normal ownerless opening, and influence
   * never sets `down`), `expose` (arm the opening window without moving
   * the gauge — any attacker cashes it, no command deed), or `steady`
   * (endurance-capped recovery, suppressed under the focus-fire pin like
   * the defend beat). Deterministic; magnitudes from the
   * `combat.influence.*` dials. Callers route through their **own** gated
   * logic — no spell ships here (the magic build's job).
   */
  public static influence(
    combatant: Stuff,
    instruction: CombatInfluence,
  ): InfluenceResult {
    return logic().influence(combatant, instruction);
  }
}

SecurityApi.decorateApiClass(CombatApi);
