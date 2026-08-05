// CombatLogic — the hot-reloadable logic singleton behind CombatApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from "../../lib/stuff/ApiLogic";
import { CallSecurity, Unshadowable } from "../../lib/security/decorators";
import { SecurityPolicies } from "../../lib/security/SecurityPolicies";
import type { Stuff } from "../../lib/stuff/Stuff";
import { Creature } from "../../lib/creature/Creature";
import type { Engaged } from "../../lib/activity/Engaged";
import { MixinApi } from "../../api/mixin";
import { MaterialApi } from "../../api/material";
import { ConditionApi } from "../../api/condition";
import { ElectricityApi } from "../../api/electricity";
import { SchedulerApi } from "../../api/scheduler";
import { ScheduleApi } from "../../api/schedule";
import { StuffApi } from "../../api/stuff";
import { AppApi } from "../../api/app";
import { SpeciesApi } from "../../api/species";
import { PartyApi } from "../../api/party";
import { ChronicleApi } from "../../api/chronicle";
import { RegardApi } from "../../api/regard";
import { AdvancementApi } from "../../api/advancement";
import { AppSettingKeys } from "../../lib/config/AppSettings";
import { AccountabilityApi } from "../../api/accountability";
import type { AccountabilityFields } from "../../api/accountability";
import type AccountabilityEvent from "../../lib/accountability/AccountabilityEvent";
import { Coup, COMBAT_COUP_TYPE } from "../../lib/combat/Coup";
import type { Sensor } from "../../lib/message/Sensor";
import type {
  Subcheck,
  Difficulty,
  Outcome,
} from "../../lib/advancement/ActSignature";
import type { Channel } from "../../lib/material/Channel";
import { CHANNELS } from "../../lib/material/Channel";
import type { EnergyInflictSpec, ShockInflictSpec } from "../../api/condition";
import type { ConductionOutcome } from "../../api/electricity";
import { Quantity } from "../../lib/quantity";
import Weapon from "../equipment/Weapon";
import type { OutcomeBand } from "../../api/material";
import type { BrainContext, BrainStatics } from "../../lib/behavior/brain";
import {
  CombatSession,
  CombatParticipantHold,
  COMBAT_PARTICIPANT_TYPE,
  type CombatantState,
  type CombatResolution,
} from "../../lib/combat/CombatSession";
import {
  CombatFormation,
  type FormationPolicy,
} from "../CombatFormation";
import {
  CombatHookContext,
  type CombatConsequence,
  type CombatVenue,
  type ExchangeOutcomeKind,
} from "../../lib/combat/CombatHookContext";
import type { CombatReactive } from "../../lib/combat/CombatReactive";
import type {
  CombatInfluence,
  InfluenceResult,
} from "../../lib/combat/CombatInfluence";
import type { CombatTerms } from "../../lib/combat/CombatTerms";
import { Poise, type PoiseConfig } from "../../lib/combat/Poise";
import { Tempo, type TempoConfig } from "../../lib/combat/Tempo";
import { CombatFlags } from "../../lib/combat/CombatFlags";
import type { RangeState } from "../../lib/combat/CombatGraph";
import type { CombatGraph } from "../../lib/combat/CombatGraph";
import { RangeBand } from "../../lib/combat/RangeBand";
import type { RangeBandConfig } from "../../lib/combat/RangeBand";
import Location from "../../lib/stuff/Location";
import { Gambit, type GambitSpec } from "../../lib/combat/Gambit";
import { Sharpness, type SharpnessConfig } from "../../lib/combat/Sharpness";
import {
  WeaponProfile,
  type WeaponProfileConfig,
} from "../../lib/combat/WeaponProfile";
import {
  NaturalAttack,
  NEUTRAL_NATURAL_PROFILE,
  type NaturalAttackSpec,
  type NaturalProfile,
  type NaturalProfileConfig,
} from "../../lib/combat/NaturalAttack";
import { WeaponSwitch } from "../../lib/combat/WeaponSwitch";
import { CombatFog, type FogConfig } from "../../lib/combat/CombatFog";
import {
  CompetenceBand,
  type CompetenceBandName,
} from "../../lib/advancement/CompetenceBand";
import {
  CombatNarration,
  type ExchangeOutcome,
  type BeatIntensity,
} from "../../lib/combat/CombatNarration";
import type {
  OpenSessionResult,
  GambitEligibility,
  BlameVerdict,
  CombatAssessResult,
  CombatOpenOptions,
  RangeStanding,
  FormationStanding,
} from "../../api/combat";

const CombatApiCallers = SecurityPolicies.FromModule("/api/combat#CombatApi");

/** Default combat brain for a non-player combatant. */
const DEFAULT_COMBAT_BRAIN = "/lib/behavior/combatant";
const BRAIN_EXPORT = "brain";

/**
 * CombatLogic — the combat rules engine behind {@link CombatApi}.
 *
 * Lives at `/obj/api/combat`; the `CombatApi` statics forward here. Owns
 * the genuinely-new machinery — poise mutation, the deterministic
 * exchange outcome, the emergent-tempo beat loop, the inflict routing,
 * the narration trigger, the brain-decision invocation, and the
 * resolution check. Computes no damage of its own: severity comes back
 * from `ConditionApi.inflict` through the materials-response covering
 * stack. Combat picks only the **channel** (instrument) + **site** and an
 * **energy** derived from the target's poise state.
 *
 * The class methods are thin gated entry points; the heavy logic lives in
 * module-private functions (the `ConditionLogic` precedent) so nothing
 * routes through the instance proxy mid-algorithm.
 *
 * @internal
 */
@Unshadowable
export class CombatLogic extends ApiLogic {
  @CallSecurity(CombatApiCallers)
  public openSession(
    initiator: Stuff & Engaged,
    defender: Stuff & Engaged,
    terms: CombatTerms,
    opts?: CombatOpenOptions,
  ): OpenSessionResult {
    return openSessionImpl(initiator, defender, terms, opts);
  }

  @CallSecurity(CombatApiCallers)
  public advance(session: CombatSession): void {
    advanceImpl(session);
  }

  @CallSecurity(CombatApiCallers)
  public join(
    joiner: Stuff & Engaged,
    target: Stuff & Engaged,
    terms: CombatTerms,
    opts?: CombatOpenOptions,
  ): { ok: boolean; reason?: string } {
    return joinImpl(joiner, target, terms, opts);
  }

  @CallSecurity(CombatApiCallers)
  public merge(a: CombatSession, b: CombatSession): void {
    mergeImpl(a, b);
  }

  @CallSecurity(CombatApiCallers)
  public queueGambit(actor: Stuff, gambitKey: string): GambitEligibility {
    const session = sessionForImpl(actor);
    if (!session) return { ok: false, reason: "not-in-combat" };
    const elig = eligibilityImpl(actor, gambitKey);
    if (!elig.ok) return elig;
    const state = session.getState(actor);
    if (state) state.queuedGambit = gambitKey;
    return { ok: true };
  }

  @CallSecurity(CombatApiCallers)
  public eligibilityFor(actor: Stuff, gambitKey: string): GambitEligibility {
    return eligibilityImpl(actor, gambitKey);
  }

  @CallSecurity(CombatApiCallers)
  public sessionFor(combatant: Stuff): CombatSession | undefined {
    return sessionForImpl(combatant);
  }

  @CallSecurity(CombatApiCallers)
  public splashSetFor(target: Stuff): Stuff[] {
    return splashSetForImpl(target);
  }

  @CallSecurity(CombatApiCallers)
  public mayDeliverTo(
    thrower: Stuff,
    primary: Stuff,
    splash: readonly Stuff[],
  ): { ok: true } | { ok: false; refusedBy: Stuff } {
    return mayDeliverToImpl(thrower, primary, splash);
  }

  @CallSecurity(CombatApiCallers)
  public arenaMaxBandFor(who: Stuff): RangeState {
    return arenaMaxBandFor(who);
  }

  @CallSecurity(CombatApiCallers)
  public bandBetween(a: Stuff, b: Stuff): RangeState | null {
    return bandBetweenImpl(a, b);
  }

  @CallSecurity(CombatApiCallers)
  public yieldFight(actor: Stuff): boolean {
    const session = sessionForImpl(actor);
    if (!session) return false;
    // The yielding actor loses; the fight ends on the yield terminus.
    const opp = session.opponentState(actor)?.combatant;
    endWith(session, "yield", actor, opp);
    if (opp) runResolutionConsumers(session, opp, actor, false, false);
    return true;
  }

  @CallSecurity(CombatApiCallers)
  public async blameFor(victimId: string): Promise<BlameVerdict | null> {
    return blameForImpl(victimId);
  }

  @CallSecurity(CombatApiCallers)
  public async attributionFor(
    sessionId: string,
  ): Promise<AccountabilityEvent[]> {
    return AccountabilityApi.eventsForSession(sessionId);
  }

  @CallSecurity(CombatApiCallers)
  public intervene(actor: Stuff, target: Stuff): boolean {
    return interveneImpl(actor, target);
  }

  @CallSecurity(CombatApiCallers)
  public orderCoup(captain: Stuff): { ok: boolean; reason?: string } {
    return orderCoupImpl(captain);
  }

  @CallSecurity(CombatApiCallers)
  public defendAlly(
    interposer: Stuff,
    ally: Stuff,
  ): { ok: boolean; reason?: string } {
    return defendAllyImpl(interposer, ally);
  }

  @CallSecurity(CombatApiCallers)
  public disengage(actor: Stuff): { ok: boolean; message?: string } {
    return disengageImpl(actor);
  }

  @CallSecurity(CombatApiCallers)
  public assess(actor: Stuff, target: Stuff): CombatAssessResult {
    return assessImpl(actor, target);
  }

  @CallSecurity(CombatApiCallers)
  public weaponProfileOf(weapon: Stuff): WeaponProfile | null {
    return weaponProfileOfImpl(weapon);
  }

  @CallSecurity(CombatApiCallers)
  public perceive(actor: Stuff): CombatAssessResult {
    return perceiveImpl(actor);
  }

  @CallSecurity(CombatApiCallers)
  public rangeStanding(actor: Stuff): RangeStanding | null {
    return rangeStandingImpl(actor);
  }

  @CallSecurity(CombatApiCallers)
  public formationStandingOf(actor: Stuff): FormationStanding {
    return formationStandingOfImpl(actor);
  }

  @CallSecurity(CombatApiCallers)
  public beginSwitch(
    actor: Stuff,
    target: Stuff,
  ): { ok: boolean; reason?: string } {
    return beginSwitchImpl(actor, target, false);
  }

  @CallSecurity(CombatApiCallers)
  public drawSidearm(actor: Stuff): { ok: boolean; reason?: string } {
    return drawSidearmImpl(actor);
  }

  @CallSecurity(CombatApiCallers)
  public influence(
    combatant: Stuff,
    instruction: CombatInfluence,
  ): InfluenceResult {
    return influenceImpl(combatant, instruction);
  }
}

/* ───────────────────────── config dials ───────────────────────── */

/** Numeric AppSetting read, falling back to the seeded literal. */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === "" || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function poiseConfig(): PoiseConfig {
  const K = AppSettingKeys;
  return {
    pressedBelow: dial(K.combatPoisePressedBelow, 0.75),
    reelingBelow: dial(K.combatPoiseReelingBelow, 0.5),
    brokenAt: dial(K.combatPoiseBrokenAt, 0.25),
    openingTicks: Math.round(dial(K.combatPoiseOpeningTicks, 2)),
  };
}

function tempoConfig(): TempoConfig {
  const K = AppSettingKeys;
  return {
    base: dial(K.combatTempoBase, 1),
    encumbrancePenalty: dial(K.combatTempoEncumbrancePenalty, 0.5),
    enduranceFloor: dial(K.combatTempoEnduranceFloor, 0.4),
    minRate: dial(K.combatTempoMinRate, 0.1),
    maxRate: dial(K.combatTempoMaxRate, 3),
  };
}

function sharpnessConfig(): SharpnessConfig {
  const K = AppSettingKeys;
  return {
    min: dial(K.combatSharpnessMin, 0.35),
    max: dial(K.combatSharpnessMax, 1),
  };
}

function fogConfig(): FogConfig {
  const K = AppSettingKeys;
  return {
    clearSharpness: dial(K.combatFogClearSharpness, 0.7),
    readSharpness: dial(K.combatFogReadSharpness, 0.7),
  };
}

function weaponProfileConfig(): WeaponProfileConfig {
  const K = AppSettingKeys;
  return {
    balanceRefMass: dial(K.combatWeaponBalanceRefMass, 0.9),
    tempoExponent: dial(K.combatWeaponTempoExponent, 0.35),
    tempoMin: dial(K.combatWeaponTempoMin, 0.5),
    tempoMax: dial(K.combatWeaponTempoMax, 1.6),
    poiseDamageExponent: dial(K.combatWeaponPoiseDamageExponent, 0.4),
    poiseDamageMin: dial(K.combatWeaponPoiseDamageMin, 0.6),
    poiseDamageMax: dial(K.combatWeaponPoiseDamageMax, 1.5),
    overextendExponent: dial(K.combatWeaponOverextendExponent, 0.35),
    overextendMin: dial(K.combatWeaponOverextendMin, 0.6),
    overextendMax: dial(K.combatWeaponOverextendMax, 1.5),
    balanceHeavyBelow: dial(K.combatWeaponBalanceHeavyBelow, 0.92),
    balanceLightAbove: dial(K.combatWeaponBalanceLightAbove, 1.08),
    reachShortBelow: dial(K.combatWeaponReachShortBelow, 0.5),
    reachLongAbove: dial(K.combatWeaponReachLongAbove, 1.5),
    guardHardnessRef: dial(K.combatWeaponGuardHardnessRef, 300),
  };
}

/** The derived {@link WeaponProfile} for a weapon Stuff (config-injected),
 * or null when it isn't a `Weapon`. The live playstyle read behind
 * `CombatApi.weaponProfileOf` and the couplings below. */
function weaponProfileOfImpl(weapon: Stuff): WeaponProfile | null {
  if (!(weapon instanceof Weapon)) return null;
  return WeaponProfile.derive(weapon.getProfileInputs(), weaponProfileConfig());
}

/** The profile of the weapon an actor is wielding right now (impairment-
 * aware via `state`), or null when unarmed / bare-handed. */
function actorWeaponProfile(
  actor: Stuff,
  state?: CombatantState,
): WeaponProfile | null {
  const weapon = wieldedWeapon(actor, state);
  return weapon ? weaponProfileOfImpl(weapon) : null;
}

function naturalProfileConfig(): NaturalProfileConfig {
  return {
    weapon: weaponProfileConfig(),
    largeBodyMassKg: dial(AppSettingKeys.combatNaturalLargeBodyMassKg, 150),
  };
}

/**
 * The actor's natural-attack list (DECISION L): the species'
 * `naturalAttacks` when non-empty, else the legacy
 * `CombatantMixin.naturalAttackChannel` synthesized as a one-entry
 * `{key: 'natural'}` list (the byte-preserving fallback), else empty.
 */
function naturalAttacksFor(actor: Stuff): readonly NaturalAttackSpec[] {
  if (MixinApi.isOrganism(actor)) {
    const attacks = actor.getSpecies()?.getNaturalAttacks();
    if (attacks && attacks.length > 0) return attacks;
  }
  if (MixinApi.isCombatant(actor)) {
    const ch = actor.getNaturalAttackChannel();
    if (ch) return [{ key: "natural", channel: ch }];
  }
  return [];
}

/**
 * The beat-keyed natural-attack rotation index (DECISION L): the index
 * reads the SESSION BEAT, nowhere else — a per-state counter would drift
 * under tempo variance and break two-run transcript equality. Two strikes
 * in one beat (tempo carry) use the same attack; a single-entry list (and
 * the legacy fallback) reduce to entry 0 on every beat.
 */
function rotationIndex(session: CombatSession, count: number): number {
  if (count <= 1) return 0;
  return (Math.max(1, session.getBeat()) - 1) % count;
}

/**
 * The actor's **strike profile** — the four numbers the poise/tempo/reach
 * seams multiply in: the wielded weapon's {@link WeaponProfile} getters
 * when armed (identical values to the pre-vocabulary reads), else the
 * body-derived natural profile of the *current* natural attack
 * ({@link NaturalAttack.deriveProfile} — exactly the old `?? 1` / `: 0`
 * literals for every hint-less sub-threshold body), else neutral. The
 * `session` selects the beat-rotated attack (a beat-anchored strike
 * read); without one — the un-beat-anchored presence reads (reach sort,
 * tempo, eligibility) — entry 0 is used.
 */
function actorStrikeProfile(
  actor: Stuff,
  state?: CombatantState,
  session?: CombatSession,
): NaturalProfile {
  const wp = actorWeaponProfile(actor, state);
  if (wp) {
    return {
      tempoFactor: wp.tempoFactor(),
      poiseDamageFactor: wp.poiseDamageFactor(),
      overextendFactor: wp.overextendFactor(),
      reachRank: wp.reachRank(),
    };
  }
  const attacks = naturalAttacksFor(actor);
  const spec = attacks[session ? rotationIndex(session, attacks.length) : 0];
  if (!spec) return { ...NEUTRAL_NATURAL_PROFILE };
  const bodyPlan = MixinApi.isOrganism(actor)
    ? (actor.getSpecies()?.getBodyPlan() ?? null)
    : null;
  return NaturalAttack.deriveProfile(spec, bodyPlan, naturalProfileConfig());
}

/**
 * Whether the actor's SPECIES affords a gambit bodily (a tailed species
 * sweeps without a hafted weapon) — the Organism-contract species read
 * (the `speciesKeyOf` precedent). Short-circuits ONLY the two equipment
 * gates in `eligibilityImpl` (`affordedByForm` / `affordedByShield`);
 * the instrument gate still stands (satisfied by a natural attack), and
 * an unknown key is inert (no gambit ever asks for it).
 */
function speciesAffords(actor: Stuff, gambitKey: string): boolean {
  if (!MixinApi.isOrganism(actor)) return false;
  return (
    actor.getSpecies()?.getAffordedGambits().includes(gambitKey) ?? false
  );
}

/** A natural-attack defender (a beast's claws — no weapon profile) keeps the
 * build-1 nominal guard, so a wolf still parries as it always did. */
const NOMINAL_NATURAL_GUARD = 1;

/**
 * A defender's effective **guard factor** — how well they can bring a
 * parry: their wielded weapon's `guardFactor` plus any off-hand / shield
 * assist ({@link offhandGuardBonus}). A truly unarmed defender can't parry
 * (0); a guardless weapon (a flail) returns 0 *for the weapon* but still
 * picks up an off-hand bonus if one covers it; a natural-attack beast keeps
 * a nominal guard.
 */
function defenderGuardFactor(state: CombatantState): number {
  const bonus = offhandGuardBonus(state);
  if (resolveInstrument(state) === null) {
    // No main instrument at all — only an off-hand assist (a lone shield)
    // can guard, and only barely.
    return bonus;
  }
  const profile = actorWeaponProfile(state.combatant, state);
  const base = profile ? profile.guardFactor() : NOMINAL_NATURAL_GUARD;
  return base + bonus;
}

/** Whether a defender can bring their guard to a parry at all — the seam a
 * guardless weapon (flail) fails so a guard-breaker bypasses it. */
function canGuard(state: CombatantState): boolean {
  return defenderGuardFactor(state) > 0;
}

/** The wielded **shield** on an actor — a `Wieldable` item carrying an
 * armor construction (armor you hold, not wear) — or null. */
function wieldedShield(actor: Stuff): Stuff | null {
  if (!MixinApi.isSlotted(actor)) return null;
  for (const [, occupants] of actor.getAllOccupants()) {
    for (const occ of occupants) {
      if (
        MixinApi.isWieldable(occ) &&
        MixinApi.isConstructed(occ) &&
        occ.getConstruction()?.isArmor()
      ) {
        return occ as Stuff;
      }
    }
  }
  return null;
}

/**
 * The guard bonus a defender's **off-hand** contributes — a wielded shield
 * (a raised shield parries well) or a dual-wield off-hand weapon (Phase 6:
 * a sword-and-dagger's off-hand parries like a tiny shield). Read by
 * {@link defenderGuardFactor}.
 */
function offhandGuardBonus(state: CombatantState): number {
  if (wieldedShield(state.combatant)) {
    return dial(AppSettingKeys.combatOffhandGuardBonus, 0.6);
  }
  return offhandWeaponGuardBonus(state);
}

/** Every weapon-construction Wieldable an actor is holding (both grips). */
function allWieldedWeapons(actor: Stuff): Stuff[] {
  const out: Stuff[] = [];
  if (!MixinApi.isSlotted(actor)) return out;
  for (const [, occupants] of actor.getAllOccupants()) {
    for (const occ of occupants) {
      if (!MixinApi.isConstructed(occ)) continue;
      if (occ.getConstruction()?.isWeapon()) out.push(occ as Stuff);
    }
  }
  return out;
}

/**
 * The guard bonus a **dual-wield off-hand weapon** contributes (a
 * sword-and-dagger's off-hand parries like a tiny shield) — **band-gated**
 * on the wielder's competence: a novice (below the mastery rank) fumbles the
 * off-hand and takes a *net penalty*; a proficient wielder gains. You grow
 * into dual-wielding (the experience-pass competence seam).
 */
function offhandWeaponGuardBonus(state: CombatantState): number {
  if (allWieldedWeapons(state.combatant).length < 2) return 0;
  const rank = CompetenceBand.rank(state.competenceBand);
  const mastery = Math.round(dial(AppSettingKeys.combatDualWieldMasteryRank, 2));
  return rank >= mastery
    ? dial(AppSettingKeys.combatOffhandGuardBonus, 0.6)
    : dial(AppSettingKeys.combatDualWieldNoviceGuardBonus, -0.3);
}

/** Whether a shield held by `defender` faces `attacker` — always in a 1v1,
 * but under focus-fire the shield fronts only the primary (first) incoming
 * edge; other attackers flank past it (directional coverage). */
function shieldFacesAttacker(
  session: CombatSession,
  defender: Stuff,
  attacker: Stuff,
): boolean {
  const incoming = session.getGraph().incomingEdges(defender);
  if (incoming.length <= 1) return true;
  return incoming[0]?.attacker === attacker;
}

/* ───────────────────────── reach range tier ───────────────────────── */

/**
 * The reach-rank gap (in the 3-class short/medium/long scale) at which an
 * attacker is genuinely **out of range** — a long weapon (rank 2) against a
 * short one (rank 0). A 1-rank gap (sword-vs-dagger, weapon-vs-natural) is a
 * mild disadvantage (an energy nudge), not out of range — so the ordinary
 * armed-vs-beast fight is unperturbed. A structural rank threshold (derived
 * from the class count), not a tunable magnitude.
 */
const REACH_OUT_OF_RANGE_GAP = 2;

/** A combatant's reach rank (short 0 … long 2) — their wielded weapon's
 * reach, else the natural profile's (entry 0 — an un-beat-anchored
 * presence read; 0 for every sub-threshold body, 1 for a large-body
 * innate: an ogre punches at ogre reach). */
function reachRankOf(combatant: Stuff): number {
  return actorStrikeProfile(combatant).reachRank;
}

/**
 * The engagement range a fresh pair opens at: **the arena's maximum
 * band** — you notice someone across the room before you are on top of
 * them, so a fight starts at whatever distance the room actually affords.
 *
 * ⚠ **This changed shipped melee.** The old rule read the two fighters'
 * reach ranks (`reach` when they differed, `close` when equal), so
 * dagger-vs-dagger began in the clinch. Now a 3 m cell opens every pair
 * at `reach` and a 12 m yard opens them at `near`, and closing the gap
 * is a beat somebody has to spend. That approach beat is the point: it
 * is what gives the archer something to defend and the closer something
 * to buy.
 *
 * **An ambush opens at `close`.** A concealed approach is exactly what
 * buys the opening band — the shipped concealment substrate doing the
 * work — which is why a knife-fighter can reach a bowman at all, and why
 * stealth pays out in position rather than in a damage multiplier.
 */
function openingRangeFor(a: Stuff, b: Stuff, ambush = false): RangeState {
  if (ambush) return "close";
  return arenaMaxBandFor(a);
}

/** Seed the opening range on the pair's edges (called right after the pair's
 * threat edges are created). */
function seedRange(
  session: CombatSession,
  a: Stuff,
  b: Stuff,
  ambush = false,
): void {
  session.getGraph().setRange(a, b, openingRangeFor(a, b, ambush));
}

/**
 * Does this pair already carry a range — in EITHER direction?
 *
 * The honest "have these two met yet" question, and it must be asked
 * **before** `addEdge`. `rangeBetween` cannot answer it: it falls back to
 * `close` when no edge exists, so `=== "close"` was standing in for "no
 * range yet" and could not tell a genuinely-clinched pair from a fresh one.
 * A pair that had fought its way to `close` was therefore re-seeded back to
 * the opening range every time the engine re-picked the target — silently,
 * because the wrong answer was also a legal band.
 */
function pairHasRange(graph: CombatGraph, a: Stuff, b: Stuff): boolean {
  return (
    graph.edgeBetween(a, b) !== undefined ||
    graph.edgeBetween(b, a) !== undefined
  );
}

/**
 * The reach advantage the actor's strike carries against `target` right now:
 * at `reach` a longer weapon is advantaged (positive), the shorter penalised
 * (negative); at `close` it **reverses** (the dagger/unarmed owns the
 * clinch). Zero for equal reach. A deterministic function of reach ranks ×
 * the current range — no RNG.
 *
 * **Zero outside the melee bands.** Reach is a term about weapon *length*
 * against a foe you can touch; at `near`/`far` it has nothing to say. That a
 * melee strike cannot connect from there is a separate fact, carried by
 * {@link inMeleeBand} at the strike and counter sites — not smuggled in as a
 * large negative number here, which would make the reach term lie.
 */
function reachAdvantage(
  session: CombatSession,
  actor: Stuff,
  target: Stuff,
): number {
  const range = session.getGraph().rangeBetween(actor, target);
  if (!RangeBand.isMelee(range)) return 0;
  const diff = reachRankOf(actor) - reachRankOf(target);
  return range === "reach" ? diff : -diff;
}

/**
 * Is this pair inside the melee bands (`close`/`reach`)? A hand weapon can
 * only act across those two; at `near`/`far` a melee strike whiffs — not
 * because it is out-reached, but because the fighters are not in melee at
 * all. The gate that keeps the shipped reach dance from silently applying
 * across a ranged gap.
 */
function inMeleeBand(session: CombatSession, a: Stuff, b: Stuff): boolean {
  return RangeBand.isMelee(session.getGraph().rangeBetween(a, b));
}

/** The band-ladder thresholds, read from settings with seeded fallbacks. */
function rangeBandConfig(): RangeBandConfig {
  return {
    nearMetres: dial(AppSettingKeys.combatRangeNearMetres, 6),
    farMetres: dial(AppSettingKeys.combatRangeFarMetres, 20),
  };
}

/**
 * The widest band this arena affords — derived from the room's real linear
 * extent, never authored. A 3 m cell affords only the melee tiers; an
 * authored 20 m outdoor cell affords `far`.
 *
 * Reads the combatant's environment rather than taking a Location, because
 * the callers all have a fighter in hand and a fighter is always somewhere.
 * A combatant in no location, or in one that reports no extent, gets the
 * conservative melee cap.
 */
function arenaMaxBandFor(who: Stuff): RangeState {
  const env = MixinApi.isContainable(who) ? who.getContainer() : null;
  // `instanceof Location` is the shipped narrowing for the sibling
  // geometry accessors (VisionModality does exactly this for
  // `getSizeScale`) — Location is a class, not a mixin, so there is no
  // MixinApi predicate to reach for.
  const extent =
    env !== null && env instanceof Location ? env.getLinearExtent() : null;
  return RangeBand.maxForExtent(extent, rangeBandConfig());
}

/** A small clamp helper (bands the reach scale). */
function clampNum(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}

/** A combatant's best reach advantage across its live `reach`-range edges
 * (floored at 0) — the sort key that lets a reach-advantaged actor resolve
 * before a shorter foe can answer (deterministic, stable-sorted). */
function reachOrderScore(
  session: CombatSession,
  state: CombatantState,
): number {
  const graph = session.getGraph();
  const actor = state.combatant;
  const myReach = reachRankOf(actor);
  let best = 0;
  for (const edge of graph.targetsOf(actor)) {
    if (edge.range !== "reach") continue;
    const d = myReach - reachRankOf(edge.defender);
    if (d > best) best = d;
  }
  return best;
}

/**
 * The band-step maneuver — one rung along the ladder, in either
 * direction. The generalization of the shipped `close`, which was this
 * function with the destination hard-coded to `close`.
 *
 * A tempo-costed opposed beat: the mover always pays the poise cost; the
 * holder KEEPS them out only while composed (steady/pressed) and
 * genuinely longer (a gap ≥ `contestStrength`). A reeling/broken holder,
 * or an equal/shorter one, cannot stop it. Deterministic — no RNG.
 *
 * Two rules the four-band ladder adds:
 *
 *  - **The arena caps a withdrawal.** You cannot back further away than
 *    the room is big; a 3 m cell has nowhere to go past `reach`.
 *  - **Only an advance is contested.** Reach is a tool for keeping
 *    someone *out*; a spear-holder has no special power to stop you
 *    leaving. Withdrawal's cost is the beat and the poise, not a contest.
 */
function resolveBandStep(
  session: CombatSession,
  actorState: CombatantState,
  targetState: CombatantState,
  beat: number,
  direction: -1 | 1,
): void {
  const graph = session.getGraph();
  const actor = actorState.combatant;
  const target = targetState.combatant;
  const inward = direction < 0;
  const spec = Gambit.get(inward ? "advance" : "withdraw")!;
  actorState.poise.spend(
    dial(
      inward
        ? AppSettingKeys.combatReachCloseCost
        : AppSettingKeys.combatRangeWithdrawCost,
      inward ? 0.18 : 0.22,
    ),
    beat,
  );

  const current = graph.rangeBetween(actor, target);
  const wanted = RangeBand.step(current, direction);
  if (wanted === current) {
    // Already at the end of the ladder in this direction — the wasted
    // beat is the only effect (the shipped already-inside behaviour).
    return;
  }
  if (!inward && RangeBand.beyond(wanted, arenaMaxBandFor(actor))) {
    // The room runs out before you do.
    narrate(actorState, targetState, spec, "control", null, false, beat);
    return;
  }
  if (inward) {
    const gap = reachRankOf(target) - reachRankOf(actor);
    const holderBand = targetState.poise.band();
    const holderComposed = holderBand === "steady" || holderBand === "pressed";
    const contest = dial(AppSettingKeys.combatReachContestStrength, 0.5);
    // The reach contest is a MELEE fact: a long weapon keeps you at the
    // end of it. It has nothing to say about crossing a bowshot, so it
    // only guards the last rung inward.
    if (
      RangeBand.isMelee(current) &&
      gap >= contest &&
      holderComposed
    ) {
      narrate(actorState, targetState, spec, "control", null, false, beat);
      return;
    }
  }
  graph.setRange(actor, target, wanted);
  narrate(actorState, targetState, spec, "control", null, true, beat);
}

/** A live foe of the actor (read-only — no edge side-effect, unlike
 * `pickTarget`): a still-standing combatant not on the actor's side,
 * preferring one the actor already has an edge onto. */
function currentFoeState(
  session: CombatSession,
  st: CombatantState,
): CombatantState | null {
  const graph = session.getGraph();
  for (const edge of graph.targetsOf(st.combatant)) {
    const ts = session.getState(edge.defender);
    if (ts && !ts.down && ts.side !== st.side) return ts;
  }
  for (const s of session.getStates()) {
    if (s === st || s.down || s.side === st.side) continue;
    return s;
  }
  return null;
}

/** The actor's range + reach delta vs its current primary foe (read-only). */
function rangeStandingImpl(actor: Stuff): RangeStanding | null {
  const session = sessionForImpl(actor);
  if (!session || !session.isActive()) return null;
  const st = session.getState(actor);
  if (!st) return null;
  const foe = currentFoeState(session, st);
  if (!foe) return null;
  return {
    range: session.getGraph().rangeBetween(actor, foe.combatant),
    reachDelta: reachRankOf(actor) - reachRankOf(foe.combatant),
  };
}

/** A reach-holder who spends a beat on defence also re-opens distance: any
 * foe who had closed on them, and whom they out-reach, is pushed back to
 * `reach` (the reversal half of the reach dance). */
function resetReachOnDefend(
  session: CombatSession,
  defenderState: CombatantState,
): void {
  const graph = session.getGraph();
  const me = defenderState.combatant;
  const myReach = reachRankOf(me);
  for (const edge of graph.incomingEdges(me)) {
    if (edge.range !== "close") continue;
    if (myReach > reachRankOf(edge.attacker)) {
      graph.setRange(me, edge.attacker, "reach");
    }
  }
}

/**
 * The combatant's sharpness this fight — competence today (composure joins
 * later via `Sharpness`), memoized on the state so it's resolved once and a
 * single session stays deterministic.
 */
function sharpnessFor(state: CombatantState): number {
  if (state.sharpness !== null) return state.sharpness;
  const s = Sharpness.resolve(
    { competenceBand: state.competenceBand },
    sharpnessConfig(),
  );
  state.sharpness = s;
  return s;
}

/** Inflict energy for the target's poise band at the moment of the blow. */
function energyFor(band: string): number {
  const K = AppSettingKeys;
  switch (band) {
    case "open":
      return dial(K.combatEnergyOpen, 4.5);
    case "broken":
      return dial(K.combatEnergyBroken, 3);
    case "reeling":
      return dial(K.combatEnergyReeling, 2.2);
    case "pressed":
      return dial(K.combatEnergyPressed, 1.6);
    default:
      return dial(K.combatEnergySteady, 1.2);
  }
}

/* ───────────────────────── lifecycle ───────────────────────── */

function openSessionImpl(
  initiator: Stuff & Engaged,
  defender: Stuff & Engaged,
  terms: CombatTerms,
  opts?: CombatOpenOptions,
): OpenSessionResult {
  if (!MixinApi.isEngaged(initiator) || !MixinApi.isEngaged(defender)) {
    return { ok: false, reason: "not-engageable" };
  }
  // A combatant already engaged in a fight can't open a fresh session
  // (a second attacker joins the existing one — cycle-2 Phase 4).
  if (
    initiator.getEngagementByType(COMBAT_PARTICIPANT_TYPE) ||
    defender.getEngagementByType(COMBAT_PARTICIPANT_TYPE)
  ) {
    return { ok: false, reason: "busy" };
  }

  const tickMs = Math.round(dial(AppSettingKeys.combatTickSeconds, 3) * 1000);
  const session = new CombatSession(terms, tickMs);
  const aState = deriveState(initiator);
  aState.side = safeSideOf(initiator);
  aState.competenceBand = bandFromOpts(initiator, opts);
  aState.deliberateTarget = defender;
  const bState = deriveState(defender);
  bState.side = safeSideOf(defender);
  bState.competenceBand = bandFromOpts(defender, opts);
  // Ambush — surprise DENIES the opening poise contest: an unaware defender
  // (struck from concealment they didn't perceive) starts broken/open,
  // arming the aggressor's free first exchange. Erode from full poise at
  // tick 0 so the crossing into `broken` arms a live opening window. Not a
  // damage multiplier — the exchange still routes through inflict.
  if (opts?.ambush) {
    bState.poise.erode(dial(AppSettingKeys.combatAmbushPoisePenalty, 0.85), 0);
  }
  const holdA = session.addParticipant(aState);
  const holdB = session.addParticipant(bState);

  // Seed the threat graph with the mutual 1v1 edges (both directions),
  // each carrying the session terms (the per-edge-terms seam — cycle-2
  // Phase 3 moves the terms authority fully onto the edges).
  const graph = session.getGraph();
  graph.addEdge(initiator, defender, terms);
  graph.addEdge(defender, initiator, terms);
  // The pair opens at the arena's maximum band — you notice someone across
  // the room before you are on top of them — unless this was an ambush from
  // concealment, which is exactly what buys the clinch.
  seedRange(session, initiator, defender, opts?.ambush === true);

  // Each participant occupies `body` via its own hold; the session owns
  // the beat (a real-time recurring tick, not a participant's emission).
  if (!SchedulerApi.start(holdA).ok) {
    session.dissolve();
    return { ok: false, reason: "busy" };
  }
  if (!SchedulerApi.start(holdB).ok) {
    session.dissolve();
    return { ok: false, reason: "busy" };
  }
  session.startTick();

  // Blame ledger: record the opening. A sentient defender who did NOT
  // consent to lethal terms is the imposed-terms crime path — write the
  // standalone `violated` marker at initiation (the append-only ledger is
  // the system of record; culpability is derived on read).
  recordOpening(session, initiator, defender, terms);
  // Hook grammar (DECISIONS F/G): each participant hears its own entry
  // (initiator then defender), then the venue hears the open — once;
  // `join` never re-fires it.
  dispatchSessionEntered(session, aState, bState);
  dispatchSessionEntered(session, bState, aState);
  const room = venueOf(initiator);
  if (room) {
    const ctx = new CombatHookContext({
      session,
      beat: session.getBeat(),
      actor: initiator,
      target: defender,
      actorState: aState,
      targetState: bState,
      venue: room,
    });
    callVenueHook(room, "onCombatOpened", ctx);
    applyConsequences(ctx);
  }
  flushFlavor();
  return { ok: true, session };
}

/**
 * A new combatant joins an existing fight (a gang-up / a bystander drawn
 * in). Adds a participant + `body` hold + a mutual threat edge under the
 * given terms, side frozen from the party seam. The joiner must be free
 * (not already fighting).
 */
function joinImpl(
  joiner: Stuff & Engaged,
  target: Stuff & Engaged,
  terms: CombatTerms,
  opts?: CombatOpenOptions,
): { ok: boolean; reason?: string } {
  if (!MixinApi.isEngaged(joiner)) return { ok: false, reason: "not-engageable" };
  if (joiner.getEngagementByType(COMBAT_PARTICIPANT_TYPE)) {
    return { ok: false, reason: "busy" };
  }
  const session = sessionForImpl(target);
  if (!session || !session.isActive()) return { ok: false, reason: "no-session" };

  const state = deriveState(joiner);
  state.side = safeSideOf(joiner);
  state.competenceBand = bandFromOpts(joiner, opts);
  state.deliberateTarget = target;
  const hold = session.addParticipant(state);
  if (!SchedulerApi.start(hold).ok) {
    session.removeParticipant(joiner);
    return { ok: false, reason: "busy" };
  }
  const graph = session.getGraph();
  graph.addEdge(joiner, target, terms);
  graph.addEdge(target, joiner, terms);
  seedRange(session, joiner, target);
  // Blame ledger: a fresh engagement opened inside the melee (a lethal,
  // non-consented join onto a sentient is the interloper crime path).
  recordOpening(session, joiner, target, terms);
  // Hook grammar (DECISION F): the joiner hears its own entry; the venue
  // open never re-fires (DECISION G).
  dispatchSessionEntered(session, state, session.getState(target));
  flushFlavor();
  return { ok: true };
}

/**
 * Fold session `b` into session `a` (two separate fights collide): move
 * every `b` participant (with its already-started `body` hold) and every
 * `b` edge onto `a`, then tear down `b`'s beat WITHOUT cancelling the
 * moved holds. Merges happen at a beat boundary, never mid-exchange.
 */
function mergeImpl(a: CombatSession, b: CombatSession): void {
  if (a === b || !a.isActive() || !b.isActive()) return;
  for (const st of b.getStates()) {
    const hold = b.getHold(st.combatant);
    if (hold) a.adoptParticipant(st, hold);
  }
  for (const e of b.getGraph().allEdges()) {
    a.getGraph().addEdge(e.attacker, e.defender, e.terms, e.instrument);
  }
  b.dissolveKeepingHolds();
}

/** Build a combatant's transient fight state from its body + gear. */
function deriveState(combatant: Stuff & Engaged): CombatantState {
  const inputs = {
    encumbrance: MixinApi.isLoadBearing(combatant)
      ? combatant.getLoadRatio()
      : 0,
    endurance: enduranceRatio(combatant),
    // Competence stays neutral in Build 1 (combat Disciplines land in
    // Build 2); the seam is live — Tempo already consumes it.
    competence: 1,
    balanceFactor: balanceFactorOf(combatant),
  };
  const tempo = new Tempo(Tempo.rateFor(inputs, tempoConfig()));
  return {
    combatant,
    poise: new Poise(poiseConfig()),
    tempo,
    flags: new CombatFlags(),
    queuedGambit: null,
    weaponSwitch: null,
    brainPath: brainPathFor(combatant),
    brainConfig: {},
    balanceFactor: inputs.balanceFactor,
    competenceBand: "untrained",
    sharpness: null,
    down: false,
    side: "",
    lastStruckBy: null,
    deliberateTarget: null,
    openingArmedBy: null,
    bandSeen: null,
  };
}

/**
 * The competence band the caller snapshotted for this combatant (keyed by
 * durable `templatePath`), or `untrained` when no controller resolved it
 * (bare/test/gym/NPC-vs-NPC paths). Synchronous by construction — the async
 * `AdvancementApi.bandFor` is awaited by the controller *before* open, never
 * mid-beat, so a single session stays deterministic.
 */
function bandFromOpts(
  combatant: Stuff,
  opts?: CombatOpenOptions,
): CompetenceBandName {
  const key = combatant.getTemplatePath();
  if (opts?.competenceBands && key) {
    const band = opts.competenceBands.get(key);
    if (band) return band;
  }
  return "untrained";
}

/** The combatant's per-fight alignment key, frozen on the node at
 * open/join. Tolerant of an unbooted party subsystem (tests / bare
 * combat) — a combatant with no active party is its own solo side. */
function safeSideOf(combatant: Stuff): string {
  try {
    return PartyApi.sideOf(combatant);
  } catch {
    return `solo:${combatant.getTemplatePath() ?? ""}`;
  }
}

/* ─────────────── the formation (party-strategy policy) ─────────────── */

/**
 * The **total** per-beat formation consult: the combatant's resolved
 * formation policy, never null. Chain: `PartyApi.formationPathOf` (active
 * party's formation → the default preset path) → the resident Idea's
 * frozen `policy()`. When the party subsystem is unbooted or the Idea is
 * not resident (bare unit tests, cold boot), falls back to the built-in
 * `CombatFormation.DEFAULT_POLICY` — value-equal to the seeded default,
 * so the degenerate paths byte-preserve pre-formation combat (the
 * `safeSideOf` tolerance precedent). Deliberately NOT frozen at open
 * (unlike `side`): the per-beat re-read is what makes a mid-fight
 * `party adopt` land on the very next beat with no pending-state
 * machinery.
 */
function resolveFormationFor(state: CombatantState): FormationPolicy {
  return resolvePolicyFor(state.combatant);
}

/** The combatant-keyed half of the total consult (also serves the
 * out-of-session `formationStandingOf` read). */
function resolvePolicyFor(combatant: Stuff): FormationPolicy {
  let path: string;
  try {
    path = PartyApi.formationPathOf(combatant);
  } catch {
    return CombatFormation.DEFAULT_POLICY;
  }
  const idea = StuffApi.findByTemplatePath(path);
  return idea instanceof CombatFormation
    ? idea.policy()
    : CombatFormation.DEFAULT_POLICY;
}

/**
 * The actor's own formation standing — preset name, assigned role, and
 * whether that role is one of the formation's interceptor (protector)
 * roles. Total (never null): a solo actor reads the default formation
 * with no role. Powers the `fight` status lines and the combatant
 * brain's protector bias; the ENEMY's formation stays unread (the fog
 * non-goal).
 */
function formationStandingOfImpl(actor: Stuff): FormationStanding {
  const policy = resolvePolicyFor(actor);
  const role = safeRoleOf(actor);
  return {
    formation: policy.name || "default",
    role,
    protector: role !== "" && policy.interceptorRoles.includes(role),
  };
}

/** The combatant's assigned role, `''` when unassigned / unbooted. */
function safeRoleOf(combatant: Stuff): string {
  try {
    return PartyApi.roleOf(combatant);
  } catch {
    return "";
  }
}

/** Whether the combatant captains their active party (tolerant read). */
function safeIsCaptain(combatant: Stuff): boolean {
  try {
    return PartyApi.isCaptain(combatant);
  } catch {
    return false;
  }
}

/**
 * The combatant's index on its active party's roster (the deterministic
 * plural-role tiebreak — roles are sets, not seats; wherever a policy
 * clause needs exactly one referent, holders resolve in roster order).
 * Non-members sort last (stable sort then keeps session join order).
 */
function rosterIndexOf(combatant: Stuff): number {
  try {
    const party = PartyApi.activePartyOf(combatant);
    if (!party || !MixinApi.isPartyMember(combatant)) {
      return Number.MAX_SAFE_INTEGER;
    }
    const idx = party.getMemberIds().indexOf(combatant.partyMemberId());
    return idx < 0 ? Number.MAX_SAFE_INTEGER : idx;
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

/** The anchor's side-mates in this session (anchor included), in party-
 * roster order (stable — ties keep session join order). */
function alliesInRosterOrder(
  session: CombatSession,
  anchor: CombatantState,
): CombatantState[] {
  return session
    .getStates()
    .filter((s) => s.side === anchor.side)
    .sort(
      (a, b) => rosterIndexOf(a.combatant) - rosterIndexOf(b.combatant),
    );
}

/** The first **standing** holder of `role` on the anchor's side, in
 * roster order (the plural-role one-referent rule), or null (vacant). */
function firstStandingHolder(
  session: CombatSession,
  anchor: CombatantState,
  role: string,
): CombatantState | null {
  if (!role) return null;
  for (const s of alliesInRosterOrder(session, anchor)) {
    if (!s.down && safeRoleOf(s.combatant) === role) return s;
  }
  return null;
}

/**
 * The foe this actor presses this exchange, per its formation's
 * allocation policy. `'sustain'` (the default preset — the verbatim
 * pre-formation body): prefer a still-live foe the actor already has an
 * edge onto, else any live foe. `'called'` (Focus Fire): the captain's
 * called target while one lives. `'primary'` (Master-Apprentice): the
 * primary role-holder's own sustained target. Every branch degrades to
 * `'sustain'` when its premise is vacant (captain down, no primary
 * standing) — vacant roles are inert, never an error. Null when no foe
 * remains (the fight is won / all allies).
 */
function pickTarget(
  session: CombatSession,
  actorState: CombatantState,
): CombatantState | null {
  const policy = resolveFormationFor(actorState);
  switch (policy.allocation) {
    case "called": {
      const called = calledTargetFor(session, actorState);
      if (called) return engageToward(session, actorState, called);
      return pickSustained(session, actorState);
    }
    case "primary": {
      const primary = primaryTargetFor(session, actorState, policy);
      if (primary) return engageToward(session, actorState, primary);
      return pickSustained(session, actorState);
    }
    case "sustain":
    default:
      return pickSustained(session, actorState);
  }
}

/** The pre-formation targeting body, extracted verbatim (the byte-parity
 * branch — the default preset and every degrade rung land here). */
function pickSustained(
  session: CombatSession,
  actorState: CombatantState,
): CombatantState | null {
  const graph = session.getGraph();
  const actor = actorState.combatant;
  for (const edge of graph.targetsOf(actor)) {
    const ts = session.getState(edge.defender);
    if (ts && !ts.down && ts.side !== actorState.side) return ts;
  }
  for (const s of session.getStates()) {
    if (s === actorState || s.down || s.side === actorState.side) continue;
    // A freshly-picked foe opens at the reach-derived range — but a pair
    // that already has a range keeps it. Asked BEFORE `addEdge`, because
    // `addEdge` mints the edge at the `close` default and would make every
    // pair look freshly-seeded.
    const known = pairHasRange(graph, actor, s.combatant);
    graph.addEdge(actor, s.combatant, session.getTerms());
    if (!known) seedRange(session, actor, s.combatant);
    return s;
  }
  return null;
}

/** Press a specific live foe: ensure the actor's edge onto them exists
 * (opening at the reach-derived range when fresh) and return their state. */
function engageToward(
  session: CombatSession,
  actorState: CombatantState,
  target: CombatantState,
): CombatantState {
  const graph = session.getGraph();
  const actor = actorState.combatant;
  if (!graph.edgeBetween(actor, target.combatant)) {
    // Same rule as `pickSustained`: the reverse edge may already carry a
    // range this pair fought to, and minting the forward edge must not
    // reset it.
    const known = pairHasRange(graph, actor, target.combatant);
    graph.addEdge(actor, target.combatant, session.getTerms());
    if (!known) seedRange(session, actor, target.combatant);
  }
  return target;
}

/**
 * Focus Fire's **called target** — derived, not verb-called: the side's
 * captain leads by attacking. The call is the captain's `deliberateTarget`
 * (stamped at their own open/join) while it lives in this session as a
 * standing foe; else the captain's first sustained edge. Null when no
 * captain stands (the degrade rung) — and a party of one is its own
 * captain, so solo Focus Fire is target discipline for free.
 */
function calledTargetFor(
  session: CombatSession,
  actorState: CombatantState,
): CombatantState | null {
  const captain = captainOf(session, actorState);
  if (!captain) return null;
  const liveFoe = (target: Stuff | null): CombatantState | null => {
    if (!target) return null;
    const ts = session.getState(target);
    return ts && !ts.down && ts.side !== actorState.side ? ts : null;
  };
  const deliberate = liveFoe(captain.deliberateTarget);
  if (deliberate) return deliberate;
  for (const edge of session.getGraph().targetsOf(captain.combatant)) {
    const ts = liveFoe(edge.defender);
    if (ts) return ts;
  }
  return null;
}

/** The first standing captain on the anchor's side in this session (the
 * call authority), or null (the degrade rung). */
function captainOf(
  session: CombatSession,
  anchor: CombatantState,
): CombatantState | null {
  for (const s of alliesInRosterOrder(session, anchor)) {
    if (!s.down && safeIsCaptain(s.combatant)) return s;
  }
  return null;
}

/**
 * Master-Apprentice's **primary engagement**: the first standing holder
 * of the formation's `primaryRole` (the apprentice) anchors the side's
 * shared target — everyone else presses the apprentice's foe so the
 * apprentice's openings and credit stay theirs. The primary itself (and
 * a vacant primary) degrades to `'sustain'`.
 */
function primaryTargetFor(
  session: CombatSession,
  actorState: CombatantState,
  policy: FormationPolicy,
): CombatantState | null {
  const primary = firstStandingHolder(session, actorState, policy.primaryRole);
  if (!primary || primary === actorState) return null;
  for (const edge of session.getGraph().targetsOf(primary.combatant)) {
    const ts = session.getState(edge.defender);
    if (ts && !ts.down && ts.side !== actorState.side) return ts;
  }
  return null;
}

/**
 * The per-beat **interception pass** (the policy-triggered `defend`):
 * walk a snapshot of the threat edges; where a defender's formation
 * protects their role and the trigger fires (`'any'`, or `'high-threat'`
 * at `combat.formation.ma.highThreatEdges` incoming), redirect the edge
 * to the first eligible interceptor — walking the formation's
 * `interceptorRoles` in priority order, holders within a role in party-
 * roster order — standing, not the defender, and pressed by fewer than
 * `combat.formation.intercept.maxIncoming` incoming edges. Runs at the
 * top of the beat, so an edge opened on beat N is intercepted at the top
 * of beat N+1 ("lands next beat" by construction). Deterministic —
 * snapshot order, roster order, no dice. Inert under the default preset
 * (`trigger: 'none'`).
 */
function runInterceptionPass(session: CombatSession): void {
  const graph = session.getGraph();
  for (const edge of [...graph.allEdges()]) {
    const defState = session.getState(edge.defender);
    if (!defState || defState.down) continue;
    const attState = session.getState(edge.attacker);
    if (!attState || attState.down) continue;
    if (attState.side === defState.side) continue;
    const policy = resolveFormationFor(defState);
    if (policy.interceptTrigger === "none") continue;
    const defRole = safeRoleOf(edge.defender);
    if (!defRole || !policy.protectsRoles.includes(defRole)) continue;
    if (
      policy.interceptTrigger === "high-threat" &&
      graph.edgeCount(edge.defender) <
        Math.round(dial(AppSettingKeys.combatFormationHighThreatEdges, 2))
    ) {
      continue;
    }
    const interceptor = pickInterceptor(session, policy, defState);
    if (!interceptor) continue;
    graph.redirect(edge.attacker, edge.defender, interceptor.combatant);
    CombatNarration.narrateInterception(
      interceptor.combatant,
      edge.defender,
      edge.attacker,
    );
    mintCommandDeed(interceptor, "standard");
  }
}

/** The first eligible interceptor for a protected defender: the
 * formation's `interceptorRoles` in priority order, holders within a
 * role in roster order; standing, not the defender, and under the
 * pressure ceiling. Null when nobody can step in (the clause goes
 * inert). */
function pickInterceptor(
  session: CombatSession,
  policy: FormationPolicy,
  defState: CombatantState,
): CombatantState | null {
  const maxIncoming = Math.round(
    dial(AppSettingKeys.combatFormationInterceptMaxIncoming, 2),
  );
  const graph = session.getGraph();
  const allies = alliesInRosterOrder(session, defState);
  for (const role of policy.interceptorRoles) {
    for (const st of allies) {
      if (st === defState || st.down) continue;
      if (safeRoleOf(st.combatant) !== role) continue;
      if (graph.edgeCount(st.combatant) >= maxIncoming) continue;
      return st;
    }
  }
  return null;
}

/** A combatant with no live player Interactive is brain-driven. */
function brainPathFor(combatant: Stuff): string | null {
  if (
    MixinApi.isHasInteractive(combatant) &&
    combatant.getInteractives().size > 0
  ) {
    return null; // player-driven (directed autocombat)
  }
  return DEFAULT_COMBAT_BRAIN;
}

function enduranceRatio(combatant: Stuff): number {
  // The Creature contract reader (reserve landscape, lib/reserve.ts) —
  // the keyed reserve surface is the body's internal plumbing.
  if (!(combatant instanceof Creature)) return 1;
  const r = combatant.getEndurance();
  const cap = r.capacity.rawValue();
  return cap > 0 ? clamp01(r.current.rawValue() / cap) : 1;
}

/**
 * The tempo hook the emergent-cadence function consumes — now **derived**
 * from the wielded weapon's {@link WeaponProfile} (`tempoFactor`: light →
 * fast, heavy → slow), not the inert stored `balanceFactor`. `Tempo.rateFor`
 * is untouched; only what feeds its `balanceFactor` input changed. Unarmed →
 * the natural profile's tempo (entry 0 — an un-beat-anchored read; exactly
 * 1.0 for every sub-threshold body, slower for a large-body innate).
 */
function balanceFactorOf(combatant: Stuff): number {
  return actorStrikeProfile(combatant).tempoFactor;
}

/* ───────────────────────── the beat ───────────────────────── */

function advanceImpl(session: CombatSession): void {
  if (!session.isActive()) return;
  const beat = session.advanceBeat();
  const states = session.getStates();
  // Hook grammar (DECISION F): the per-beat net transition baseline —
  // the band as of the LAST dispatch (stamped by `dispatchBandChanges`,
  // i.e. the end of the previous beat), falling back to a top-of-beat
  // read on a state's first beat. Carrying the baseline across beats is
  // what lets a **between-beat** external mutation (`CombatApi.
  // influence`) surface on the following beat; for everything that
  // mutates poise mid-beat it is byte-identical to a beat-top snapshot
  // (nothing else moves poise between beats). Compared after the tick
  // loop, in roster order.
  const bandsAtTop = states.map((s) => s.bandSeen ?? s.poise.band());

  const maxBeats = Math.round(dial(AppSettingKeys.combatMaxBeats, 200));
  if (beat > maxBeats) {
    endWith(session, "draw");
    return;
  }

  // Formation interception (the policy-triggered `defend`) — at beat-top,
  // so an edge opened on beat N is intercepted at the top of beat N+1 and
  // a player's own mid-beat interpose is never un-done within its beat.
  // Inert under the default preset (`trigger: 'none'`).
  runInterceptionPass(session);

  // Hand-slot economy: advance any in-progress weapon switch, completing the
  // grip swap when its vulnerable window elapses (the guard was down the
  // whole time — resolveInstrument returned null).
  for (const s of states) {
    if (!s.weaponSwitch || s.down) continue;
    s.weaponSwitch.advance();
    if (s.weaponSwitch.isReady()) completeSwitch(s);
  }

  // Let brain-driven combatants choose (queue) their intent this beat.
  for (const s of states) {
    if (s.brainPath && !s.queuedGambit && !s.down) invokeBrain(s);
  }

  // Emergent tempo: each combatant acts as often as their accrued tempo
  // allows (fractional carry). Bounded per beat by the tempo ceiling.
  // Targeting is side-driven (the threat graph + frozen sides): a foe is
  // anyone not on the actor's side. A 1v1 is the degenerate case.
  //
  // Reach tier: resolve reach-advantaged actors FIRST (a stable sort by
  // reach-order score — deterministic, no wall-clock), so a longer weapon
  // strikes while the foe is still out at `reach` and can't answer in kind.
  const ordered = [...states].sort(
    (a, b) => reachOrderScore(session, b) - reachOrderScore(session, a),
  );
  for (const s of ordered) {
    if (!session.isActive()) break;
    if (s.down) continue;
    // Mid-switch: hands full, guard down — the combatant forgoes this beat's
    // actions (but still accrues tempo carry for when the swap completes).
    if (s.weaponSwitch && !s.weaponSwitch.isReady()) {
      s.tempo.advance();
      continue;
    }
    let n = s.tempo.advance();
    while (n-- > 0 && session.isActive() && !s.down) {
      const target = pickTarget(session, s);
      if (!target || target.down) break;
      // Opening-credit bookkeeping: whoever's exchange crosses the target
      // into an open window is its armer (the window itself stays
      // ownerless — any ally cashes it; the armer banks the command deed).
      const wasOpen = target.poise.isOpen();
      resolveExchange(session, s, target, beat);
      if (!wasOpen && target.poise.isOpen()) {
        target.openingArmedBy = s.combatant;
      }
    }
  }

  for (const s of states) s.poise.tick(beat);

  // The per-beat net band transitions — fired in roster (`getStates()`)
  // order, NOT the reach sort (DECISION F).
  dispatchBandChanges(session, states, bandsAtTop, beat);

  if (session.isActive()) checkVitalsResolution(session);
}

/**
 * The shared focus-fire erosion multiplier — `1 + max(0, edges − 1) ×
 * erosionPerEdge` over the combatant's incoming edge count. ONE math at
 * all three consumers (the exchange's target erosion, the influence
 * bridge's stagger); the gym pins are the byte-parity proof.
 */
function focusMultiplierFor(session: CombatSession, combatant: Stuff): number {
  const attackers = session.getGraph().edgeCount(combatant);
  return (
    1 +
    Math.max(0, attackers - 1) *
      dial(AppSettingKeys.combatFocusFireErosionPerEdge, 0.5)
  );
}

/**
 * The shared focus-fire recovery pin — an incoming attacker count
 * at/above the suppress threshold blocks a recovery beat. ONE threshold
 * read at all three consumers (the defend beat, the influence bridge's
 * `steady`, the flee gate).
 */
function recoverySuppressed(incoming: number): boolean {
  const suppressAt = Math.round(
    dial(AppSettingKeys.combatFocusFireSuppressRecoveryAt, 2),
  );
  return incoming >= suppressAt;
}

/**
 * One exchange: base erosion on both sides, then the actor's gambit
 * resolved deterministically against the tactical state (poker, not
 * slots — the outcome is a function of poise + instruments, never a die
 * roll). Consequence routes through `ConditionApi.inflict`.
 */
function resolveExchange(
  session: CombatSession,
  actorState: CombatantState,
  targetState: CombatantState,
  beat: number,
): void {
  const band = actorState.poise.band();
  const overextended = band === "broken" || band === "open";

  // Intent: a deliberate queued gambit, else state-aware autocombat — an
  // overextended fighter covers up and catches their breath (defend)
  // rather than flailing, which is what keeps a fight from stalemating.
  const key =
    actorState.queuedGambit ?? (overextended ? "defend" : "strike");
  actorState.queuedGambit = null;

  if (key === "defend") {
    // Focus-fire pin: a defender pressed by enough attackers can't spend a
    // beat recovering (the turtle who beats one but loses to two). The
    // beat is still forgone — they're too busy covering to counter.
    const incoming = session.getGraph().edgeCount(actorState.combatant);
    if (recoverySuppressed(incoming)) return;
    // Defensive/reactive play restores poise, capped by endurance and
    // scaled by sharpness — a sharper fighter recovers footing better per
    // defensive beat (the composure seam rides this scalar too, later).
    const restore =
      dial(AppSettingKeys.combatPoiseRestorePerDefense, 0.15) *
      sharpnessFor(actorState);
    actorState.poise.restore(restore, enduranceRatio(actorState.combatant));
    // Reach reset: a reach-holder who spends a beat covering also uses the
    // breathing room to push a foe who had closed back out to `reach`.
    resetReachOnDefend(session, actorState);
    return;
  }

  if (key === "assess") {
    // The actor spent the beat reading the opponent (the costed `assess`):
    // no offense, no poise restore — the read already went out at command
    // time. The opportunity cost is the forgone exchange.
    return;
  }

  // `close` is kept as an alias onto `advance` — the shipped brain, the
  // `fight close` verb and the Gambit narration lookups all still name it.
  if (key === "close" || key === "advance") {
    resolveBandStep(session, actorState, targetState, beat, -1);
    return;
  }
  if (key === "withdraw") {
    resolveBandStep(session, actorState, targetState, beat, 1);
    return;
  }

  // The actor's strike playstyle scales the poise economy (balance → the
  // guard-breaker↔exploiter axis): a heavy guard-breaker erodes the target's
  // poise faster and lands harder (`poiseDamageFactor`) but pays more to
  // commit (`overextendFactor`); a light exploiter is the mirror. Unarmed →
  // the current natural attack's body-derived profile (neutral 1.0 for
  // every sub-threshold hint-less body). Complementary — the gym proves
  // neither sweeps.
  const strike = actorStrikeProfile(actorState.combatant, actorState, session);
  const poiseDamage = strike.poiseDamageFactor;
  const overextendScale = strike.overextendFactor;
  // Reach term (the signature): the reach advantage the actor's strike
  // carries right now — at `reach` a longer weapon is advantaged, at `close`
  // it reverses (the dagger owns the clinch). A too-short attacker is simply
  // **out of range** (reachAdv ≤ −1): it can't connect at all — it whiffs and
  // self-opens, pressuring nobody. That's what makes a long weapon *control
  // until closed* (and forces the shorter fighter to `close` the gap).
  const reachAdv = reachAdvantage(
    session,
    actorState.combatant,
    targetState.combatant,
  );
  const reachCoef = dial(AppSettingKeys.combatReachAdvantageEnergy, 0.2);
  const reachScale = clampNum(1 + reachAdv * reachCoef, 0.3, 2);
  const effectiveDamage = poiseDamage * reachScale;
  // Out of range two ways: out-reached inside melee (the shipped reach
  // dance), or not in melee at all (`near`/`far` — a hand weapon cannot
  // cross a ranged band).
  const outOfRange =
    reachAdv <= -REACH_OUT_OF_RANGE_GAP ||
    !inMeleeBand(session, actorState.combatant, targetState.combatant);
  // The target's shield fronts this attacker only if it faces them (bypassed
  // by a flanking blow under focus-fire).
  const shieldFacing = shieldFacesAttacker(
    session,
    targetState.combatant,
    actorState.combatant,
  );

  // An actual exchange trades blows — base autocombat erodes both sides.
  // Focus-fire: the target's erosion scales with how many attackers are
  // pressing them (each extra attacker beyond the first adds
  // `erosionPerEdge`), so ganging up wears a defender down faster; the
  // guard-breaker's `poiseDamage` + the reach advantage scale it further. An
  // out-of-range actor pressures nobody (only self-erodes on the whiff).
  const erode = dial(AppSettingKeys.combatPoiseErodePerExchange, 0.12);
  const focusMult = focusMultiplierFor(session, targetState.combatant);
  actorState.poise.erode(erode, beat);
  if (!outOfRange) {
    targetState.poise.erode(erode * focusMult * effectiveDamage, beat);
  }

  const spec = Gambit.forVerb(key) ?? Gambit.get("strike")!;

  // Attempt-time gate: an ineligible gambit is a wasted press (erosion
  // only, no narration) — the injury-edits-the-menu reject.
  if (!eligibilityImpl(actorState.combatant, spec.key).ok) return;

  // Overextend scales with the weapon's commitment (guard-breaker dear,
  // exploiter cheap — the exploiter *cashes* openings without self-opening).
  const overextend =
    dial(AppSettingKeys.combatPoiseOverextendCost, 0.2) * overextendScale;
  const whiffPenalty = dial(AppSettingKeys.combatPoiseWhiffPenalty, 0.25);
  // Guard-graded: the defender parries only if their weapon (or off-hand)
  // can bring a guard — a guardless flail is "armed" but can't self-guard,
  // so a guard-breaker bypasses its steady defence (the offense↔defense
  // axis, §4). Rides the existing steady-guard → parry → riposte seam.
  const targetCanParry = canGuard(targetState);
  // Out of range → the blow finds only air (a whiff that self-opens); the
  // reach-holder is untouched. Otherwise resolve the tactical outcome.
  const outcome = outOfRange
    ? "whiff"
    : decideOutcome(actorState, targetState, spec, targetCanParry);

  // Hook grammar (DECISION E): the defender-instrument outcome witnesses
  // fire here, never inside the pure decideOutcome.
  dispatchGuardWitness(
    session,
    actorState,
    targetState,
    spec,
    outcome,
    targetCanParry,
    beat,
  );

  // Advancement: the actor earns credit for the exchange (self-credit
  // only). Minted for the player-driven side; a brain-driven beast needs
  // no transcript. Fire-and-forget — never blocks the beat.
  mintExchangeSignature(actorState, targetState, outcome);

  switch (outcome) {
    case "whiff": {
      actorState.poise.spend(whiffPenalty, beat); // self-open
      narrate(actorState, targetState, spec, "whiff", null, false, beat);
      reactiveDispatch(session, targetState, actorState, "whiff", beat);
      witnessExchange(session, actorState, targetState, spec, outcome, beat);
      return;
    }
    case "parried": {
      actorState.poise.spend(overextend, beat);
      narrate(actorState, targetState, spec, "parried", null, false, beat);
      // The reactive-affordance dispatch (X): a parry arms the defender's
      // riposte against the attacker.
      reactiveDispatch(session, targetState, actorState, "parried", beat);
      witnessExchange(session, actorState, targetState, spec, outcome, beat);
      return;
    }
    case "control-resisted": {
      actorState.poise.spend(overextend, beat);
      narrate(actorState, targetState, spec, "parried", null, false, beat);
      witnessExchange(session, actorState, targetState, spec, outcome, beat);
      return;
    }
    case "control-land": {
      actorState.poise.spend(overextend, beat);
      if (spec.flagOnLand) targetState.flags.add(spec.flagOnLand);
      narrate(actorState, targetState, spec, "control", null, true, beat);
      witnessExchange(session, actorState, targetState, spec, outcome, beat);
      return;
    }
    case "exploit": {
      // The created-opening credit: an armed window cashed by a DIFFERENT,
      // allied attacker mints the armer's `command` deed (the master's
      // openings, exploited by the apprentice — teaching pays).
      const armer = targetState.openingArmedBy;
      if (
        armer &&
        (armer as Stuff) !== (actorState.combatant as Stuff) &&
        safeAllied(armer, actorState.combatant)
      ) {
        const armerState = session.getState(armer);
        if (armerState) mintCommandDeed(armerState, "standard");
      }
      targetState.openingArmedBy = null;
      targetState.poise.consumeOpening();
      actorState.poise.spend(overextend, beat);
      const report = commitInflict(
        session,
        actorState,
        targetState,
        "open",
        effectiveDamage,
        shieldFacing,
      );
      const firstBlood = !report.deflected && session.markBloodDrawn();
      narrate(actorState, targetState, spec, "land", report, true, beat, true, firstBlood);
      if (firstBlood) dispatchBloodDrawn(session, actorState, targetState, beat);
      // Winning the poise contest downs the target (the incapacitation
      // waypoint; a lethal finish follows under lethal terms).
      handleDown(session, actorState, targetState);
      witnessExchange(session, actorState, targetState, spec, outcome, beat);
      return;
    }
    case "land": {
      actorState.poise.spend(overextend, beat);
      const targetBand = targetState.poise.band();
      const report = commitInflict(
        session,
        actorState,
        targetState,
        targetBand,
        effectiveDamage,
        shieldFacing,
      );
      const landed = !report.deflected;
      const firstBlood = landed && session.markBloodDrawn();
      narrate(actorState, targetState, spec, report.deflected ? "deflected" : "land", report, landed, beat, false, firstBlood);
      if (firstBlood) dispatchBloodDrawn(session, actorState, targetState, beat);
      if (landed) checkFirstBlood(session, report);
      witnessExchange(session, actorState, targetState, spec, outcome, beat);
      return;
    }
    case "feint-bit": {
      // The defender bit the bait — over-committed to a parry that wasn't
      // there and cracked their own guard open. The feinter pays only the
      // small bait cost; the opening it armed is cashed on the next strike
      // (the two-beat feint → exploit, reusing the earned-opening path).
      const feintCost = dial(AppSettingKeys.combatPoiseFeintCost, 0.08);
      const bitPenalty = dial(AppSettingKeys.combatPoiseFeintBitPenalty, 0.8);
      actorState.poise.spend(feintCost, beat);
      targetState.poise.spend(bitPenalty, beat); // arms the opening on crossing
      narrate(actorState, targetState, spec, "feinted", null, true, beat);
      witnessExchange(session, actorState, targetState, spec, outcome, beat);
      return;
    }
    case "feint-read": {
      // Seen through (or wasted on a non-turtle): the bait fizzles and the
      // feinter eats the small cost for nothing — which is why blind
      // patience against a reader, and pure aggression, both beat a feinter.
      const feintCost = dial(AppSettingKeys.combatPoiseFeintCost, 0.08);
      actorState.poise.spend(feintCost, beat);
      narrate(actorState, targetState, spec, "feint-read", null, false, beat);
      witnessExchange(session, actorState, targetState, spec, outcome, beat);
      return;
    }
  }
}

/** The local alias over the canonical vocabulary (the union moved to
 * `CombatHookContext` — the ctx read surface speaks it). */
type OutcomeKind = ExchangeOutcomeKind;

/** Deterministic outcome from the tactical state. */
function decideOutcome(
  actorState: CombatantState,
  targetState: CombatantState,
  spec: GambitSpec,
  targetCanParry: boolean,
): OutcomeKind {
  const actorBand = actorState.poise.band();
  const overextended = actorBand === "broken" || actorBand === "open";
  const control = spec.kind === "control";

  // The feint reads the *defender's* commitment (poker, not slots). A
  // committed defender — a steady, armed turtle poised to parry, the
  // patient defender the feint exists to punish — who fails to *read* the
  // bait over-commits and cracks their own guard (`feint-bit`). A defender
  // who reads it (competence-gated, the shared `CombatFog` gate) or isn't
  // committed (an aggressor, not turtling) isn't fooled (`feint-read`).
  if (spec.kind === "feint") {
    const committed = targetState.poise.band() === "steady" && targetCanParry;
    const reads = CombatFog.reads(sharpnessFor(targetState), fogConfig());
    return committed && !reads ? "feint-bit" : "feint-read";
  }

  if (overextended && spec.offensive) return "whiff";
  if (targetState.poise.isOpen()) return control ? "control-land" : "exploit";
  const steadyGuard = targetState.poise.band() === "steady" && targetCanParry;
  if (control) return steadyGuard ? "control-resisted" : "control-land";
  return steadyGuard ? "parried" : "land";
}

/** The reactive-affordance dispatch point (X): fire a defender's reactive
 * gambit (e.g. riposte) armed by a `parried`/`whiff`/`grab` outcome. */
function reactiveDispatch(
  session: CombatSession,
  defenderState: CombatantState,
  attackerState: CombatantState,
  trigger: "parried" | "whiff" | "grab",
  beat: number,
): void {
  const reactives = Gambit.reactiveFor(trigger);
  for (const g of reactives) {
    if (defenderState.down || attackerState.down) return;
    // Eligibility filter over the reactive affordance — a disarmed
    // defender can't riposte (no instrument).
    if (g.needsInstrument && resolveInstrument(defenderState) === null) continue;
    // Range filter: a counter can't land from out of range either — a
    // dagger-wielder held at a spear's `reach` can't riposte the spear (this
    // is what makes reach control decisive, not just a poise nudge).
    if (
      !inMeleeBand(session, defenderState.combatant, attackerState.combatant) ||
      reachAdvantage(
        session,
        defenderState.combatant,
        attackerState.combatant,
      ) <= -REACH_OUT_OF_RANGE_GAP
    ) {
      continue;
    }
    // The riposte is an offensive counter against the attacker, scaled by
    // the defender's own strike playstyle (a heavy riposte lands harder;
    // unarmed → the current natural attack's body-derived profile).
    const dStrike = actorStrikeProfile(
      defenderState.combatant,
      defenderState,
      session,
    );
    const overextend =
      dial(AppSettingKeys.combatPoiseOverextendCost, 0.2) *
      dStrike.overextendFactor;
    defenderState.poise.spend(overextend, beat);
    const band = attackerState.poise.band();
    const report = commitInflict(
      session,
      defenderState,
      attackerState,
      band,
      dStrike.poiseDamageFactor,
      shieldFacesAttacker(session, attackerState.combatant, defenderState.combatant),
    );
    const landed = !report.deflected;
    const firstBlood = landed && session.markBloodDrawn();
    narrate(defenderState, attackerState, g, report.deflected ? "deflected" : "land", report, landed, beat, false, firstBlood);
    if (firstBlood) dispatchBloodDrawn(session, defenderState, attackerState, beat);
    if (landed) checkFirstBlood(session, report);
    return; // one reactive per trigger
  }
}

/* ───────────────────────── inflict routing ───────────────────────── */

interface InflictReport {
  attacker: Stuff;
  target: Stuff;
  channel: Channel;
  site: string;
  band: OutcomeBand;
  deflected: boolean;
  materialKey?: string;
  attackerSpeciesKey?: string;
  traumaType?: string;
}

/**
 * Route a landed offensive gambit through the materials-response covering
 * stack. Combat picks the channel (instrument) + site + energy (from the
 * target's poise band); `ConditionApi.inflict` returns trauma type +
 * severity. The **instrument hook seam** wraps the funnel (DECISION D):
 * carrier `augmentInflict` (validated, fallback-on-malformed) → inflict +
 * the `lastStruckBy` stamp (byte-identical) → the consequence drain → the
 * `onStruck` walk over the CombatReactive covering gear at the struck
 * site.
 *
 * **The delivery split** (DECISION K): a mechanical or heat innate rides
 * the energy path (`inflict`'s mechanical fold / insulation fold); a
 * **shock** primary skips it entirely — `commitShockInflict` fires the
 * carrier's `augmentInflict` and lets the drain deliver the one shock.
 */
/**
 * The bounded instrument-delivery scale (crafting-branches DECISION F): a
 * weapon's `grade × condition` scalar (the ONE `MaterialApi` formula the
 * covering stack already uses — quality scales height, never shape),
 * clamped down to the broken floor when the weapon is broken. The keenness
 * factor joins on edge/point channels for `Keen` hosts. Neutral (1) for
 * unarmed/innate strikes. Material *height* stays analyze-only — a
 * deliberate asymmetry (combat balance), documented in combat.md.
 */
function instrumentDeliveryScale(
  weapon: Stuff | null,
  channel: Channel,
): number {
  if (!weapon) return 1;
  const grade = MixinApi.isGraded(weapon) ? weapon.getGrade() : undefined;
  const condition = MixinApi.isDurable(weapon)
    ? weapon.getCondition()
    : undefined;
  let scale = MaterialApi.gradeConditionScale(grade, condition);
  // The working-surface factor — the edge only matters on the edge.
  if (
    (channel === "edge" || channel === "point") &&
    MixinApi.isKeen(weapon)
  ) {
    scale *= weapon.keennessDeliveryFactor();
  }
  if (MixinApi.isDurable(weapon) && weapon.isBroken()) {
    scale = Math.min(
      scale,
      dial(AppSettingKeys.craftingBrokenDeliveryFloor, 0.35),
    );
  }
  return scale;
}

/**
 * Wear-on-use for a landed weapon strike (Law 2: use, never the clock):
 * the weapon's structural condition wears per strike, and an edge/point
 * delivery also dulls the working surface (the fast-cycling keenness
 * axis `sharpen` restores).
 */
function wearWeaponOnStrike(weapon: Stuff | null, channel: Channel): void {
  if (!weapon) return;
  if (MixinApi.isDurable(weapon)) {
    weapon.wear(dial(AppSettingKeys.craftingWearWeaponPerStrike, 0.004));
  }
  if (
    (channel === "edge" || channel === "point") &&
    MixinApi.isKeen(weapon)
  ) {
    weapon.dull(dial(AppSettingKeys.craftingKeennessWearPerUse, 0.08));
  }
}

function commitInflict(
  session: CombatSession,
  actorState: CombatantState,
  targetState: CombatantState,
  bandForEnergy: string,
  energyScale = 1,
  shieldFacing = true,
): InflictReport {
  const attacker = actorState.combatant;
  const target = targetState.combatant;
  const instrument = resolveInstrument(actorState);
  const weapon = instrument?.weapon ?? null;
  let channel: Channel = instrument?.channel ?? "blunt";
  // The species rotation (DECISION L): an innate striker cycles its
  // natural attacks by SESSION BEAT (`rotationIndex` — deterministic;
  // two strikes in one beat use the same attack). A single-entry list
  // and the legacy fallback reduce to entry 0 — byte-identical to the
  // pre-vocabulary channel. Selected BEFORE the shock split so a shock
  // entry in a rotation routes through `commitShockInflict` on its beat.
  if (instrument && !weapon) {
    const attacks = naturalAttacksFor(attacker);
    const rotated = attacks[rotationIndex(session, attacks.length)];
    if (rotated) channel = rotated.channel;
  }
  const site = siteFor(target, bandForEnergy === "open");

  // The augment carrier — exactly one, never both (the double-fire
  // guard): the wielded weapon when armed, else the bare CombatReactive
  // attacker (a venomous bite and a poison blade are one abstraction).
  const carrier = augmentCarrierOf(attacker, weapon);

  // DECISION K — a shock primary builds NO mechanical spec and never
  // reaches `ConditionApi.inflict` here: the instrument seam's drain is
  // the ONE deliverer (calling `shockContact` directly from this split
  // would be the forbidden double-fire).
  if (channel === "shock") {
    return commitShockInflict(
      session,
      actorState,
      targetState,
      site,
      weapon,
      carrier,
      shieldFacing,
    );
  }

  const energy =
    energyFor(bandForEnergy) *
    (energyScale > 0 ? energyScale : 1) *
    instrumentDeliveryScale(weapon, channel);
  let spec: EnergyInflictSpec = {
    mechanism: channel,
    site,
    energy,
    // The target's wielded shield fronts a faced attacker; a flanking blow
    // under focus-fire bypasses it (directional coverage).
    shieldFacing,
  };
  let augmentCtx: CombatHookContext | null = null;
  if (carrier) {
    augmentCtx = new CombatHookContext({
      session,
      beat: session.getBeat(),
      actor: attacker,
      target,
      actorState,
      targetState,
      channel,
      site,
      instrument: weapon,
      venue: venueOf(attacker),
    });
    spec = augmentSpec(carrier, spec, augmentCtx);
  }

  const outcome = ConditionApi.inflict(target, spec);
  // A landed weapon strike wears its instrument (whether or not the blow
  // got through the armor — the steel still met resistance).
  wearWeaponOnStrike(weapon, channel);
  // Name the killing edge for an attrition/bleed-out death that has no
  // single striker at resolution time (the per-edge blame foundation).
  if (outcome.afflicted) {
    targetState.lastStruckBy = actorState.combatant;
  }
  // Drain the augment ctx's queued consequences — the sequence position
  // the old energized stun-baton branch held (Phase 3 folded it onto the
  // instrument seam: `EnergizedMixin.augmentInflict` queues the shock,
  // the drain delivers it via `ElectricityApi.shockContact` — DECISION
  // D-4, order-identical).
  if (augmentCtx) applyConsequences(augmentCtx);
  const band = outcome.afflicted
    ? MaterialApi.severityToBand(outcome.trauma.severity)
    : ("turned" as OutcomeBand);
  const report: InflictReport = {
    attacker,
    target,
    channel,
    site,
    band,
    deflected: !outcome.afflicted,
    materialKey: instrument?.materialKey,
    attackerSpeciesKey: speciesKeyOf(attacker),
    traumaType: outcome.afflicted ? outcome.trauma.type : undefined,
  };
  // The struck side: every CombatReactive item in the covering stack at
  // the struck site hears the blow — landed through or fully attenuated
  // (`ctx.deflected` says which; "the shield took the blow" is the point).
  dispatchOnStruck(
    session,
    actorState,
    targetState,
    spec.site,
    shieldFacing,
    weapon,
    report,
  );
  return report;
}

/**
 * DECISION K — the shock-primary delivery: a shock innate (the electric
 * eel) IS the instrument seam. No mechanical spec is built and the engine
 * never calls `ConditionApi.inflict` for the primary — the carrier's
 * `augmentInflict` fires (an Energized creature's override queues
 * `ctx.deliverShock(this)`) and the **drain** delivers the one shock via
 * `ElectricityApi.shockContact` — single-fire by construction. The report
 * is built from the drained outcome: no conduction outcomes = truthfully
 * `deflected` (an `Energized`-less shock innate is the documented
 * authoring error — a blow that never lands); landed = the band over
 * `MaterialApi.resolveShock`'s contact-burn severity, `lastStruckBy`
 * stamped like any landed blow.
 */
function commitShockInflict(
  session: CombatSession,
  actorState: CombatantState,
  targetState: CombatantState,
  site: string,
  weapon: Stuff | null,
  carrier: (Stuff & CombatReactive) | null,
  shieldFacing: boolean,
): InflictReport {
  const attacker = actorState.combatant;
  const target = targetState.combatant;
  let delivered: ConductionOutcome[] = [];
  if (carrier) {
    const ctx = new CombatHookContext({
      session,
      beat: session.getBeat(),
      actor: attacker,
      target,
      actorState,
      targetState,
      channel: "shock",
      site,
      instrument: weapon,
      venue: venueOf(attacker),
    });
    const fn = hookFn(carrier, "augmentInflict");
    if (fn) {
      // The spec is descriptive only (mechanism + site): the current is
      // unknowable until the drain's `shockContact` resolves the contact,
      // and the hook's return is discarded — there is no primary spec to
      // reshape.
      const spec: ShockInflictSpec = {
        mechanism: "shock",
        site,
        current: Quantity.of(0, "A"),
      };
      try {
        fn.call(carrier, spec, ctx);
      } catch (err) {
        console.warn(
          "CombatLogic: augmentInflict threw on the shock path — skipped",
          err,
        );
      }
    }
    delivered = applyConsequences(ctx).flatMap((r) => r.shock ?? []);
  }
  const landed = delivered.length > 0;
  // Name the killing edge exactly as the energy path does.
  if (landed) targetState.lastStruckBy = actorState.combatant;
  const contact = delivered[0];
  const trauma = contact
    ? MaterialApi.resolveShock(contact.currentThrough)
    : null;
  const band: OutcomeBand = landed
    ? MaterialApi.severityToBand(trauma?.severity ?? null)
    : ("turned" as OutcomeBand);
  const report: InflictReport = {
    attacker,
    target,
    channel: "shock",
    site,
    band,
    deflected: !landed,
    attackerSpeciesKey: speciesKeyOf(attacker),
    traumaType: trauma?.type,
  };
  dispatchOnStruck(
    session,
    actorState,
    targetState,
    site,
    shieldFacing,
    weapon,
    report,
  );
  return report;
}

/** The struck site — torso by default, a called shot to the head when the
 * target is open (and has a head part). */
function siteFor(target: Stuff, open: boolean): string {
  if (open && MixinApi.isVitals(target) && target.getPart("body.head")) {
    return "body.head";
  }
  return "body.torso";
}

/* ────────── the hook grammar (instrument / participant / venue) ────────── */

/**
 * DECISION D-1: the strike's augment carrier — exactly one, never both
 * (the double-fire guard): the wielded weapon when armed, else the bare
 * CombatReactive attacker (the innate path), else none.
 */
function augmentCarrierOf(
  attacker: Stuff,
  weapon: Stuff | null,
): (Stuff & CombatReactive) | null {
  if (weapon) return MixinApi.isCombatReactive(weapon) ? weapon : null;
  return MixinApi.isCombatReactive(attacker) ? attacker : null;
}

/**
 * Resolve a hook method on a CombatReactive carrier for dispatch, or
 * null when absent. `MixinApi.isCombatReactive` walks ATTACHED SHADOWS
 * too (the instance-`hasMixin` Witness pattern), but the proxy
 * dispatches only methods the host itself defines — a shadow RESHAPES
 * an existing hook (the chain replaces the base call; `Shadow.callDown`
 * reaches it) and cannot ADD one to a host that lacks it. A
 * shadow-conferred marker with no host method is skipped silently,
 * never thrown on mid-beat.
 */
function hookFn(
  host: Stuff,
  name: keyof CombatReactive,
): ((...args: unknown[]) => unknown) | null {
  const fn = (host as unknown as Record<string, unknown>)[name];
  return typeof fn === "function"
    ? (fn as (...args: unknown[]) => unknown)
    : null;
}

/**
 * Guarded witness dispatch: a throwing hook body warns and is skipped —
 * an author's broken witness never aborts the beat mid-loop for every
 * other participant (the `augmentSpec` warn posture, generalized). The
 * queued consequences of a hook that threw mid-body still drain — the
 * drain is engine code, not hook code.
 */
function guardedHook(label: string, fn: () => void): void {
  try {
    fn();
  } catch (err) {
    console.warn(`CombatLogic: ${label} threw — skipped`, err);
  }
}

/**
 * Fire the carrier's `augmentInflict` and validate the return: an energy
 * spec — `mechanism` any non-`shock` `InsultKind` (heat/tearing legal — a
 * flaming blade may re-channel its primary), a string `site`, a finite
 * `energy`. A malformed return (or a throwing hook body) falls back to
 * the pre-augment spec with a warn — never a throw mid-beat.
 */
function augmentSpec(
  carrier: Stuff & CombatReactive,
  spec: EnergyInflictSpec,
  ctx: CombatHookContext,
): EnergyInflictSpec {
  const fn = hookFn(carrier, "augmentInflict");
  if (!fn) return spec;
  let augmented: unknown;
  try {
    augmented = fn.call(carrier, spec, ctx);
  } catch (err) {
    console.warn(
      "CombatLogic: augmentInflict threw — using the pre-augment spec",
      err,
    );
    return spec;
  }
  if (isValidEnergySpec(augmented)) return augmented;
  console.warn(
    "CombatLogic: malformed augmentInflict return — using the pre-augment spec",
  );
  return spec;
}

/** The augment-return validator (DECISION D-2). */
function isValidEnergySpec(spec: unknown): spec is EnergyInflictSpec {
  if (spec === null || typeof spec !== "object") return false;
  const s = spec as { mechanism?: unknown; site?: unknown; energy?: unknown };
  const mech = s.mechanism;
  const mechOk =
    typeof mech === "string" &&
    mech !== "shock" &&
    (mech === "tearing" || (CHANNELS as readonly string[]).includes(mech));
  return (
    mechOk &&
    typeof s.site === "string" &&
    typeof s.energy === "number" &&
    Number.isFinite(s.energy)
  );
}

/** The venue (the anchor's room), or null when unplaced. Hook presence
 * decides dispatch — a hook-less gym `ContainerMixin(Idea)` room resolves
 * here but is skipped by `callVenueHook`. */
function venueOf(anchor: Stuff | null | undefined): Stuff | null {
  if (!anchor || !MixinApi.isContainable(anchor)) return null;
  const room = anchor.getContainer();
  return room && MixinApi.isContainer(room) ? (room as Stuff) : null;
}

/**
 * Presence-dispatch an optional venue hook (DECISION G — the
 * `callTraverseHook` shape: present → called, absent → skipped; the base
 * `Location` is untouched; a shadow defining the hook participates).
 */
function callVenueHook(
  room: Stuff,
  name: keyof CombatVenue,
  ctx: CombatHookContext,
): void {
  const fn = (room as unknown as Record<string, unknown>)[name];
  if (typeof fn !== "function") return;
  guardedHook(name, () =>
    (fn as (c: CombatHookContext) => void).apply(room, [ctx]),
  );
}

/** Flavor lines queued by hooks (`ctx.attachFlavor`), buffered so they
 * emit AFTER the exchange's own narration beat, in queue order. */
const pendingFlavor: Array<{ anchor: Stuff; line: string }> = [];

/** The module-private `narrateFlavor` flush — emits the buffered lines
 * through `CombatNarration`'s witness loop, in queue order. */
function flushFlavor(): void {
  for (const f of pendingFlavor.splice(0)) {
    CombatNarration.narrateFlavor(f.anchor, f.line);
  }
}

/**
 * The per-consequence application result the drain reports back to the
 * engine (DECISION K): the `shock` arm carries `shockContact`'s conduction
 * outcomes so a shock-primary strike can build an honest `InflictReport`;
 * every other arm reports only that it ran.
 */
interface ConsequenceResult {
  consequence: CombatConsequence;
  /** `shock` arm only: the outcomes the contact delivered (empty = a
   * dead/switched-off source delivered nothing). */
  shock?: ConductionOutcome[];
}

/**
 * Apply a drained hook context's queued consequences from the ENGINE's
 * frame, in queue order (DECISION B — the uniform drain rule: every
 * dispatched ctx is drained exactly once; the drain seals it). Provenance
 * is identical to the engine's own calls — a hook never reaches a gated
 * Api from its own frame. Returns one {@link ConsequenceResult} per
 * consequence, in queue order.
 */
function applyConsequences(ctx: CombatHookContext): ConsequenceResult[] {
  return ctx._drain().map((c) => applyConsequence(ctx, c));
}

function applyConsequence(
  ctx: CombatHookContext,
  c: CombatConsequence,
): ConsequenceResult {
  switch (c.kind) {
    case "rider": {
      const recipient = recipientOf(ctx, c.on);
      if (!recipient) return { consequence: c };
      const outcome = ConditionApi.inflict(recipient, c.spec);
      // The engine's own stamp: a rider landing on the exchange target
      // names the ctx's actor as the striking edge (a thorn-mail rider on
      // the ATTACKER deliberately does not stamp).
      if (
        outcome.afflicted &&
        ctx.targetState &&
        recipient === ctx.targetState.combatant &&
        ctx.actorState
      ) {
        ctx.targetState.lastStruckBy = ctx.actorState.combatant;
      }
      return { consequence: c };
    }
    case "afflict": {
      const recipient = recipientOf(ctx, c.on);
      if (recipient && MixinApi.isVitals(recipient)) {
        recipient.afflict(c.condition);
      }
      return { consequence: c };
    }
    case "toxin": {
      const recipient = recipientOf(ctx, c.on);
      if (recipient && MixinApi.isMetabolic(recipient)) {
        recipient.introduceToxin(c.type, c.amount);
      }
      return { consequence: c };
    }
    case "reserve": {
      const recipient = recipientOf(ctx, c.on);
      if (recipient && MixinApi.isReserved(recipient)) {
        recipient.adjustReserve(c.key, c.delta);
      }
      return { consequence: c };
    }
    case "wear": {
      const recipient = recipientOf(ctx, c.on);
      if (!recipient) return { consequence: c };
      const state =
        ctx.actorState && recipient === ctx.actorState.combatant
          ? ctx.actorState
          : ctx.targetState && recipient === ctx.targetState.combatant
            ? ctx.targetState
            : null;
      const weapon = state
        ? (resolveInstrument(state, true)?.weapon ?? null)
        : wieldedWeapon(recipient);
      // No wielded instrument → the consequence is inert (bare hands give
      // the rust monster nothing to eat).
      if (weapon && MixinApi.isDurable(weapon)) weapon.wear(c.amount);
      return { consequence: c };
    }
    case "influence": {
      // One economy for hooks and the external bridge (DECISION J): a
      // queued influence drains through the same `influenceImpl` as
      // `CombatApi.influence` — pure state mutation on the recipient's
      // poise, never a re-entry into `resolveExchange`.
      const recipient = recipientOf(ctx, c.on);
      if (recipient) influenceImpl(recipient, c.instruction);
      return { consequence: c };
    }
    case "shock":
      // The stun-baton seam's drain arm: the `effectiveVoltage ≤ 0` guard
      // inside the conduction walk still applies, so a dead/switched-off
      // source truthfully delivers nothing. The outcomes ride the result —
      // a shock-primary strike (DECISION K) reads them for its report.
      return {
        consequence: c,
        shock: ctx.target
          ? ElectricityApi.shockContact(c.source, ctx.target)
          : [],
      };
    case "flavor": {
      // Buffered: flavor emits AFTER the exchange's own narration beat,
      // in queue order (`flushFlavor` at the witness tail).
      const anchor = ctx.actor ?? ctx.target;
      if (anchor) pendingFlavor.push({ anchor, line: c.line });
      return { consequence: c };
    }
  }
}

function recipientOf(
  ctx: CombatHookContext,
  on: "attacker" | "defender",
): Stuff | null {
  return on === "attacker" ? ctx.actor : ctx.target;
}

/**
 * Apply one {@link CombatInfluence} state instruction to a live
 * combatant (DECISION J) — the shared economy behind BOTH influence
 * surfaces (`CombatApi.influence` and the hook-side ctx queue's drain).
 * Pure state mutation over the existing poise/opening machinery: never
 * dispatches an exchange, never sets `down` (only an exchange
 * exploiting the contest does), and every magnitude is a
 * `combat.influence.*` dial. Band changes it causes surface through
 * the existing `onPoiseBandChanged` per-beat net comparison on the
 * following beat — no new hook.
 */
function influenceImpl(
  combatant: Stuff,
  instruction: CombatInfluence,
): InfluenceResult {
  const session = sessionForImpl(combatant);
  if (!session) return { ok: false, reason: "not-in-combat" };
  const state = session.getState(combatant);
  if (!state) return { ok: false, reason: "not-in-combat" };
  if (state.down) return { ok: false, reason: "downed" };
  const beat = session.getBeat();
  switch (instruction.kind) {
    case "stagger": {
      const amount =
        instruction.intensity === "heavy"
          ? dial(AppSettingKeys.combatInfluenceStaggerHeavyErode, 0.3)
          : dial(AppSettingKeys.combatInfluenceStaggerLightErode, 0.12);
      // The SAME focus-fire multiplier `resolveExchange` applies to a
      // pressed target's erosion — an already-ganged-up target staggers
      // harder (the engine's own economy, not a parallel one).
      const focusMult = focusMultiplierFor(session, state.combatant);
      // A crossing into `broken` arms the normal opening via `lower()`;
      // the window stays ownerless (`openingArmedBy` untouched here —
      // an external stagger mints no command deed).
      state.poise.erode(amount * focusMult, beat);
      return { ok: true };
    }
    case "expose": {
      // Arm the window without moving the gauge; ownerless — any
      // attacker cashes it, no command deed (`openingArmedBy` null).
      state.poise.exposeWindow(beat);
      return { ok: true };
    }
    case "steady": {
      // Suppressed under focus-fire exactly like the defend-pin
      // (`resolveExchange`'s recover beat): influence can't out-recover
      // a gang-up the verb can't.
      const incoming = session.getGraph().edgeCount(state.combatant);
      if (recoverySuppressed(incoming)) {
        return { ok: false, reason: "suppressed" };
      }
      state.poise.restore(
        dial(AppSettingKeys.combatInfluenceSteadyRestore, 0.15),
        enduranceRatio(state.combatant),
      );
      return { ok: true };
    }
  }
}

/**
 * The CombatReactive covering gear over a struck site — mirrors
 * `ConditionLogic.resolveCoveringStack`'s ITEM SELECTION only (worn
 * `Constructed`+`Wearable` armor on `getSlotsCovering(site)` slots, plus
 * any wielded armor-construction item when `shieldFacing`), outside-in by
 * layer depth. Never mirrors the attenuation math.
 */
function coveringGearAt(
  target: Stuff,
  site: string,
  shieldFacing: boolean,
): Stuff[] {
  if (!MixinApi.isOrganism(target) || !MixinApi.isSlotted(target)) return [];
  const items: Array<{ item: Stuff; depth: number }> = [];
  const covering = target.getSpecies()?.getBodyPlan()?.getSlotsCovering(site);
  for (const spec of covering ?? []) {
    for (const occ of target.getOccupants(spec.name)) {
      if (!MixinApi.isConstructed(occ) || !MixinApi.isWearable(occ)) continue;
      const construction = occ.getConstruction();
      if (!construction || !construction.isArmor()) continue;
      items.push({ item: occ as Stuff, depth: construction.getLayerDepth() });
    }
  }
  if (shieldFacing) {
    for (const [, occupants] of target.getAllOccupants()) {
      for (const occ of occupants) {
        if (!MixinApi.isWieldable(occ) || !MixinApi.isConstructed(occ)) {
          continue;
        }
        const construction = occ.getConstruction();
        if (!construction || !construction.isArmor()) continue;
        items.push({ item: occ as Stuff, depth: construction.getLayerDepth() });
      }
    }
  }
  items.sort((a, b) => b.depth - a.depth);
  return items.map((i) => i.item);
}

/**
 * The struck-side witness walk (DECISION D-5): every CombatReactive item
 * in the covering stack at the struck site hears the exchange. Each item
 * gets its own context, drained after dispatch.
 */
function dispatchOnStruck(
  session: CombatSession,
  actorState: CombatantState,
  targetState: CombatantState,
  site: string,
  shieldFacing: boolean,
  strikerWeapon: Stuff | null,
  report: InflictReport,
): void {
  const target = targetState.combatant;
  for (const gear of coveringGearAt(target, site, shieldFacing)) {
    if (!MixinApi.isCombatReactive(gear)) continue;
    const fn = hookFn(gear, "onStruck");
    if (!fn) continue;
    const ctx = new CombatHookContext({
      session,
      beat: session.getBeat(),
      actor: actorState.combatant,
      target,
      actorState,
      targetState,
      channel: report.channel,
      site,
      deflected: report.deflected,
      instrument: strikerWeapon,
      venue: venueOf(target),
    });
    guardedHook("onStruck", () => fn.call(gear, ctx));
    applyConsequences(ctx);
  }
}

/**
 * DECISION E: the defender-instrument outcome witnesses — `onParry` on
 * the guarding instrument for a `parried` outcome (`control-resisted` is
 * not a parry: nothing turned a blow); `onBypassed` on the defender's
 * wielded instrument when an offensive outcome landed past a steady but
 * guardless defender (the flail that couldn't guard). Fired from
 * `resolveExchange`, never inside the pure `decideOutcome`.
 */
function dispatchGuardWitness(
  session: CombatSession,
  actorState: CombatantState,
  targetState: CombatantState,
  spec: GambitSpec,
  outcome: OutcomeKind,
  targetCanParry: boolean,
  beat: number,
): void {
  const mk = (guarding: Stuff | null) =>
    new CombatHookContext({
      session,
      beat,
      actor: actorState.combatant,
      target: targetState.combatant,
      actorState,
      targetState,
      gambit: spec,
      outcome,
      instrument: guarding,
      venue: venueOf(targetState.combatant),
    });
  if (outcome === "parried") {
    const guard =
      resolveInstrument(targetState)?.weapon ??
      wieldedShield(targetState.combatant);
    const fn =
      guard && MixinApi.isCombatReactive(guard)
        ? hookFn(guard, "onParry")
        : null;
    if (guard && fn) {
      const ctx = mk(guard);
      guardedHook("onParry", () => fn.call(guard, ctx));
      applyConsequences(ctx);
    }
    return;
  }
  // 'exploit' is deliberately absent: it requires the target's window
  // open (band 'open'), never the 'steady' this condition demands —
  // bypass-at-steady is a land-only phenomenon.
  if (
    outcome === "land" &&
    targetState.poise.band() === "steady" &&
    !targetCanParry
  ) {
    const inst = resolveInstrument(targetState)?.weapon ?? null;
    const fn =
      inst && MixinApi.isCombatReactive(inst)
        ? hookFn(inst, "onBypassed")
        : null;
    if (inst && fn) {
      const ctx = mk(inst);
      guardedHook("onBypassed", () => fn.call(inst, ctx));
      applyConsequences(ctx);
    }
  }
}

/**
 * DECISION E: the once-per-exchange resolution witness — fired at the
 * tail of every outcome case (after `reactiveDispatch` in the
 * whiff/parried cases, so the witness sees the fully-resolved exchange,
 * riposte included; the riposte itself never re-fires it). Dispatch
 * order: participant `onExchangeResolved` actor-first then target, then
 * the instrument `onStrikeResolved` on the actor's augment carrier. Ends
 * by flushing the buffered flavor lines (they emit after the exchange's
 * own narration, in queue order).
 */
function witnessExchange(
  session: CombatSession,
  actorState: CombatantState,
  targetState: CombatantState,
  spec: GambitSpec,
  outcome: OutcomeKind,
  beat: number,
): void {
  const actor = actorState.combatant;
  const target = targetState.combatant;
  const instrument = resolveInstrument(actorState);
  const weapon = instrument?.weapon ?? null;
  const mk = () =>
    new CombatHookContext({
      session,
      beat,
      actor,
      target,
      actorState,
      targetState,
      gambit: spec,
      outcome,
      channel: instrument?.channel ?? null,
      instrument: weapon,
      venue: venueOf(actor),
    });
  if (MixinApi.isCombatant(actor)) {
    const ctx = mk();
    guardedHook("onExchangeResolved", () => actor.onExchangeResolved(ctx));
    applyConsequences(ctx);
  }
  if (MixinApi.isCombatant(target)) {
    const ctx = mk();
    guardedHook("onExchangeResolved", () => target.onExchangeResolved(ctx));
    applyConsequences(ctx);
  }
  const carrier = augmentCarrierOf(actor, weapon);
  const carrierFn = carrier ? hookFn(carrier, "onStrikeResolved") : null;
  if (carrier && carrierFn) {
    const ctx = mk();
    guardedHook("onStrikeResolved", () => carrierFn.call(carrier, ctx));
    applyConsequences(ctx);
  }
  flushFlavor();
}

/**
 * DECISION G: the venue's first-blood witness — fired at the three
 * `markBloodDrawn() === true` sites, after the narrate call (the roar
 * precedes the witness — the documented order).
 */
function dispatchBloodDrawn(
  session: CombatSession,
  actorState: CombatantState,
  targetState: CombatantState,
  beat: number,
): void {
  const room = venueOf(actorState.combatant);
  if (!room) return;
  const ctx = new CombatHookContext({
    session,
    beat,
    actor: actorState.combatant,
    target: targetState.combatant,
    actorState,
    targetState,
    venue: room,
  });
  callVenueHook(room, "onBloodDrawn", ctx);
  applyConsequences(ctx);
}

/**
 * DECISION F: the per-beat net band transition — beat-top snapshot,
 * post-tick compare, fired in roster (`getStates()`) order, NOT the reach
 * sort.
 */
function dispatchBandChanges(
  session: CombatSession,
  states: readonly CombatantState[],
  before: readonly string[],
  beat: number,
): void {
  for (let i = 0; i < states.length; i++) {
    const s = states[i]!;
    // Re-stamp the cross-beat baseline whether or not a transition
    // fired — the next beat compares against this beat's closing band.
    const band = s.poise.band();
    const changed = band !== before[i];
    s.bandSeen = band;
    if (!changed) continue;
    const combatant = s.combatant;
    if (!MixinApi.isCombatant(combatant)) continue;
    const ctx = new CombatHookContext({
      session,
      beat,
      actor: combatant,
      actorState: s,
      venue: venueOf(combatant),
    });
    guardedHook("onPoiseBandChanged", () => combatant.onPoiseBandChanged(ctx));
    applyConsequences(ctx);
  }
  flushFlavor();
}

/**
 * DECISION F: the downed participant hears its own fall — at both
 * `down = true` sites (the poise-contest loss and the attrition
 * unconsciousness), after the stamp.
 */
function dispatchDowned(
  session: CombatSession,
  attackerState: CombatantState | null,
  targetState: CombatantState,
): void {
  const victim = targetState.combatant;
  if (!MixinApi.isCombatant(victim)) return;
  const ctx = new CombatHookContext({
    session,
    beat: session.getBeat(),
    actor: attackerState?.combatant ?? null,
    target: victim,
    actorState: attackerState,
    targetState,
    venue: venueOf(victim),
  });
  guardedHook("onDowned", () => victim.onDowned(ctx));
  applyConsequences(ctx);
  flushFlavor();
}

/**
 * DECISION F: a combatant hears its own session entry — at open
 * (initiator then defender) and at join (the joiner). The ctx pairs the
 * entrant with the foe its participation began against.
 */
function dispatchSessionEntered(
  session: CombatSession,
  state: CombatantState,
  opposing: CombatantState | null,
): void {
  const combatant = state.combatant;
  if (!MixinApi.isCombatant(combatant)) return;
  const ctx = new CombatHookContext({
    session,
    beat: session.getBeat(),
    actor: combatant,
    target: opposing?.combatant ?? null,
    actorState: state,
    targetState: opposing,
    venue: venueOf(combatant),
  });
  guardedHook("onSessionEntered", () => combatant.onSessionEntered(ctx));
  applyConsequences(ctx);
}

/**
 * DECISION F: the coup telegraph moment — fired on the executioner then
 * the victim, only after a successful scheduler start. The resolved
 * session's states have already dissolved, so the ctx tolerates null
 * `actorState`/`targetState` (documented on the @hook).
 */
function dispatchCoupBegun(
  session: CombatSession,
  executioner: Stuff,
  victim: Stuff,
): void {
  const mk = () =>
    new CombatHookContext({
      session,
      beat: session.getBeat(),
      actor: executioner,
      target: victim,
      actorState: session.getState(executioner),
      targetState: session.getState(victim),
      resolution: session.getResolution(),
      venue: venueOf(executioner),
    });
  if (MixinApi.isCombatant(executioner)) {
    const ctx = mk();
    guardedHook("onCoupBegun", () => executioner.onCoupBegun(ctx));
    applyConsequences(ctx);
  }
  if (MixinApi.isCombatant(victim)) {
    const ctx = mk();
    guardedHook("onCoupBegun", () => victim.onCoupBegun(ctx));
    applyConsequences(ctx);
  }
  flushFlavor();
}

/* ───────────────────────── resolution ───────────────────────── */

/**
 * The single resolution chokepoint: **every** fight-ending path narrates
 * its outcome before the session resolves — a fight must never just stop
 * (the silent bleed-out / unconsciousness gap). `victim`/`killer` label
 * the loser/winner when there is one.
 */
function endWith(
  session: CombatSession,
  outcome: CombatResolution,
  victim?: Stuff,
  killer?: Stuff,
): void {
  if (!session.isActive() || session.getResolution()) return;
  const combatants = session.getStates().map((s) => s.combatant);
  CombatNarration.narrateResolution({
    combatants,
    outcome,
    victim,
    killer,
  });
  // Hook grammar (DECISIONS F/G): the defeat witnesses + the venue
  // resolution fire BEFORE `session.resolve` — the states are still live
  // here; after resolve they dissolve (the coup-time null-states case).
  const victimState = victim ? session.getState(victim) : null;
  const killerState = killer ? session.getState(killer) : null;
  const anchor = victim ?? combatants[0] ?? null;
  const mk = () =>
    new CombatHookContext({
      session,
      beat: session.getBeat(),
      actor: killer ?? null,
      target: victim ?? null,
      actorState: killerState,
      targetState: victimState,
      resolution: outcome,
      venue: venueOf(anchor),
    });
  if (victim && MixinApi.isCombatant(victim)) {
    const ctx = mk();
    guardedHook("onDefeated", () => victim.onDefeated(ctx));
    applyConsequences(ctx);
  }
  // The victor-side twin — only when a killer is named (a draw names none).
  if (killer && MixinApi.isCombatant(killer)) {
    const ctx = mk();
    guardedHook("onDefeatedFoe", () => killer.onDefeatedFoe(ctx));
    applyConsequences(ctx);
  }
  const room = venueOf(anchor);
  if (room) {
    const ctx = mk();
    callVenueHook(room, "onCombatResolved", ctx);
    applyConsequences(ctx);
  }
  flushFlavor();
  session.resolve(outcome);
}

function checkFirstBlood(session: CombatSession, report: InflictReport): void {
  if (session.getTerms().stopCondition === "first-blood") {
    endWith(session, "first-blood", report.target, report.attacker);
  }
}

/**
 * A downed combatant lost the poise contest — the **three-case** severity
 * keying (Build 2):
 *
 *  - **non-sentient + lethal** → the cull: the winning blow finishes the
 *    beast (stage 2 skipped), no consent, no blame.
 *  - **sentient + lethal-to-the-death** → the fight resolves at
 *    incapacitation (winning the poise contest only *defeats*); the kill
 *    is the separate, interruptible {@link Coup} (stage 2).
 *  - **sentient + lethal-to-submission, or non-lethal** → incapacitation
 *    is the terminus; nobody dies.
 */
function handleDown(
  session: CombatSession,
  attackerState: CombatantState,
  targetState: CombatantState,
): void {
  // The captain's target call landing: under `called` allocation, the
  // called target going down mints the CAPTAIN's command deed (the call
  // was the leadership act; the strikers banked their own exchanges).
  // Read BEFORE the down is stamped — the call read filters downed foes.
  if (resolveFormationFor(attackerState).allocation === "called") {
    const captain = captainOf(session, attackerState);
    if (captain && calledTargetFor(session, attackerState) === targetState) {
      mintCommandDeed(captain, "standard");
    }
  }

  targetState.down = true;
  // Hook grammar (DECISION F): the downed participant hears it — after
  // the stamp, before the terms branch.
  dispatchDowned(session, attackerState, targetState);
  const attacker = attackerState.combatant;
  const victim = targetState.combatant;
  const terms = termsFor(session, attacker, victim);

  if (!terms.isLethalAuthorized()) {
    endWith(session, "incapacitation", victim, attacker);
    runResolutionConsumers(session, attacker, victim, false, false);
    return;
  }

  if (!safeIsSentient(victim)) {
    // The cull — a beast is finished by the winning blow.
    killImpl(victim, "slain", buildDeathRow(session, attacker, victim));
    endWith(session, "death", victim, attacker);
    runResolutionConsumers(session, attacker, victim, true, false);
    return;
  }

  // Sentient + lethal: the winning blow only *defeats* — the fight ends
  // at incapacitation, and the finish lethality authorizes becomes the
  // separate, deliberate, interruptible coup (the winner may still choose
  // mercy, or a bystander may stay the stroke). This is the two-stage
  // death: `--lethal` finishes a downed opponent, but now it takes a beat
  // and can be stopped.
  endWith(session, "incapacitation", victim, attacker);
  beginCoup(session, attacker, victim);
}

/**
 * A deliberate finishing blow — the cull and the coup. Routes through the
 * single death transition, carrying combat's row so exactly one
 * accountability row is appended and `deriveBlame` sees precisely what it
 * saw before.
 *
 * Note this does NOT enter the dying window: the cull and the coup are
 * decisions someone made, not thresholds someone crossed, and the whole
 * point of the two-stage death is that the second stage is where a person
 * chooses. By the time we are here, they chose.
 */
function killImpl(
  target: Stuff,
  cause: string,
  row: AccountabilityFields,
): void {
  void ConditionApi.die(target, cause, { accountability: row });
}

/** End the fight if trauma has driven a combatant unconscious or dead
 * (the bleed-out / knockout path — now narrated, not silent). */
function checkVitalsResolution(session: CombatSession): void {
  for (const s of session.getStates()) {
    if (!MixinApi.isVitals(s.combatant)) continue;
    // The killer of an attrition death is whoever last landed a blow (the
    // killing edge); fall back to the 1v1 opponent when unstruck.
    const killer =
      s.lastStruckBy ?? session.opponentState(s.combatant)?.combatant ?? null;
    const c = s.combatant.getConsciousness();
    if (c === "dead") {
      // A death from accumulated trauma mid-fight (the bleed-out path).
      // No row is written here: the body went through the dying window,
      // and `ConditionApi.die` already appended the row stamped onto that
      // record below. Writing again would double-count the death.
      endWith(session, "death", s.combatant, killer ?? undefined);
      if (killer) {
        runResolutionConsumers(
          session,
          killer,
          s.combatant,
          true,
          isCrime(termsFor(session, killer, s.combatant), s.combatant),
        );
      }
      return;
    }
    if (c === "unconscious" && !s.down) {
      s.down = true;
      // Stamp combat's attribution onto the dying record, if the body is
      // in the window. A bleed-out can finish long after the fight
      // resolves — by then the session is gone and nobody else knows who
      // struck the killing blow, so the facts have to ride the record.
      // `beginDying` is idempotent and only fills blame when it is absent,
      // so this never rewrites an earlier attribution.
      if (killer && s.combatant.isDying()) {
        s.combatant.beginDying(
          s.combatant.getCauseOfDeath() ?? "wounds",
          undefined,
          buildDeathRow(session, killer, s.combatant),
        );
      }
      // The attrition down (DECISION F) — same witness as the contest loss.
      dispatchDowned(session, killer ? session.getState(killer) : null, s);
      endWith(session, "incapacitation", s.combatant, killer ?? undefined);
      // The two-stage death follows **incapacitation**, however it was
      // reached: under lethal terms a downed sentient can still be
      // finished by the deliberate coup whether they lost the poise
      // contest (`handleDown`) or bled to unconsciousness by attrition.
      if (
        killer &&
        termsFor(session, killer, s.combatant).isLethalAuthorized() &&
        safeIsSentient(s.combatant)
      ) {
        beginCoup(session, killer, s.combatant);
      } else if (killer) {
        runResolutionConsumers(session, killer, s.combatant, false, false);
      }
      return;
    }
  }
}

/* ───────────────────────── narration ───────────────────────── */

function narrate(
  actorState: CombatantState,
  targetState: CombatantState,
  spec: GambitSpec,
  outcome: ExchangeOutcome,
  report: InflictReport | null,
  dramatic: boolean,
  beat: number,
  openingExploited = false,
  firstBlood = false,
): void {
  const openingCracked = !openingExploited && targetState.poise.isOpen();
  // Beat-intensity: the arc's punctuation. A roar at the emergent
  // thresholds (first-blood / the break — cracked or exploited / the down
  // or kill); a murmur for an ordinary notable beat; silence otherwise.
  // Narration swells and the crowd's reaction fan-out both scale to this.
  const intensity: BeatIntensity =
    firstBlood ||
    openingExploited ||
    openingCracked ||
    outcome === "down" ||
    outcome === "killed"
      ? "roar"
      : dramatic
        ? "murmur"
        : "silent";
  CombatNarration.narrate({
    attacker: actorState.combatant,
    defender: targetState.combatant,
    gambitKey: spec.key,
    outcome,
    channel: report?.channel,
    site: report?.site,
    band: report?.band,
    materialKey: report?.materialKey,
    attackerSpeciesKey: report?.attackerSpeciesKey,
    flagSet: spec.flagOnLand,
    dramatic,
    intensity,
    // The arc drivers: the defender's poise after the blow, whether a
    // window was exploited / freshly cracked, the trauma, and the beat
    // (rotates phrasing).
    defenderPoise: targetState.poise.band(),
    openingExploited,
    openingCracked,
    firstBlood,
    traumaType: report?.traumaType,
    beat,
  });
}

/* ───────────────────────── brains ───────────────────────── */

function invokeBrain(state: CombatantState): void {
  if (!state.brainPath) return;
  const brain = StuffApi.resolveExportSync(
    state.brainPath,
    BRAIN_EXPORT,
  ) as BrainStatics | null;
  if (!brain) return;
  const host = state.combatant;
  const ctx: BrainContext = {
    host,
    config: state.brainConfig,
    state: {},
    perceived: undefined,
    trigger: { source: "cadence", raw: "combat" },
    say: (text, target) => {
      if (MixinApi.isVocal(host)) host.say(text, target);
    },
    emote: async () => {},
    emoteFree: () => {},
  };
  try {
    // A brain may be sync or async; swallow either failure mode so a
    // bad turn never leaks (a sync throw here, a rejected promise via
    // .catch) — the fight continues.
    const r = brain.act(ctx);
    if (r) r.catch(() => {});
  } catch {
    // A throwing brain skips its turn; the fight continues.
  }
}

/* ───────────────────────── eligibility + instruments ───────────────────────── */

function sessionForImpl(combatant: Stuff): CombatSession | undefined {
  if (!MixinApi.isEngaged(combatant)) return undefined;
  // Every participant (including the initiator) holds a uniform
  // participant hold that references the session.
  const hold = combatant.getEngagementByType(COMBAT_PARTICIPANT_TYPE);
  if (hold instanceof CombatParticipantHold) return hold.getSession();
  return undefined;
}

function eligibilityImpl(actor: Stuff, gambitKey: string): GambitEligibility {
  const session = sessionForImpl(actor);
  if (!session) return { ok: false, reason: "not-in-combat" };
  const spec = Gambit.get(gambitKey);
  if (!spec) return { ok: false, reason: "unknown-gambit" };
  const state = session.getState(actor);
  if (!state) return { ok: false, reason: "not-in-combat" };
  if (state.down) return { ok: false, reason: "downed" };

  if (spec.needsInstrument && resolveInstrument(state) === null) {
    return { ok: false, reason: "no-instrument" };
  }
  if (spec.needsTargetArmed) {
    const opp = session.opponentState(actor);
    if (!opp || resolveInstrument(opp, true) === null) {
      return { ok: false, reason: "target-unarmed" };
    }
  }
  // "The weapon edits the menu": a form-afforded gambit (a hafted sweep) needs
  // the right weapon; a shield-afforded one (bash) needs a wielded shield.
  // A species-afforded gambit (DECISION L — a tailed species sweeps
  // bodily) short-circuits ONLY these two equipment gates; the
  // instrument gate above still stands (satisfied by a natural attack).
  if (spec.affordedByForm && spec.affordedByForm.length > 0) {
    if (!speciesAffords(actor, spec.key)) {
      const weapon = wieldedWeapon(actor, state);
      const form =
        weapon && MixinApi.isConstructed(weapon)
          ? weapon.getConstruction()?.getForm()
          : undefined;
      if (!form || !spec.affordedByForm.includes(form as never)) {
        return { ok: false, reason: "wrong-weapon" };
      }
    }
  }
  if (
    spec.affordedByShield &&
    !speciesAffords(actor, spec.key) &&
    !wieldedShield(actor)
  ) {
    return { ok: false, reason: "no-shield" };
  }
  return { ok: true };
}

interface ResolvedInstrument {
  // A wielded weapon delivers a mechanical channel (the Construction
  // delivery grids are mechanical); a species INNATE may carry any
  // channel — `commitInflict`'s delivery split (DECISION K) routes heat
  // through the insulation fold and a shock primary through the
  // instrument seam's drain (`shockContact`), never the covering fold.
  channel: Channel;
  materialKey?: string;
  weapon?: Stuff;
}

/**
 * The melee instrument a strike would use *right now*: a wielded weapon
 * (functional, non-disarmed grip) preferred, else a species-declared
 * innate attack, else null. This is the seam that makes injury edit the
 * menu — a disarmed flag or a fractured grip drops the weapon; with no
 * innate attack the gambit becomes ineligible.
 *
 * `weaponOnly` skips the innate fallback (used to ask "is this combatant
 * *armed*?" for the disarm precondition).
 */
function resolveInstrument(
  state: CombatantState,
  weaponOnly = false,
): ResolvedInstrument | null {
  const actor = state.combatant;
  // Mid-switch: the guard is down and there is nothing to strike with (the
  // vulnerable window). Both offence and parry read this as unarmed.
  if (state.weaponSwitch && !state.weaponSwitch.isReady()) return null;
  if (!state.flags.has("disarmed")) {
    const weapon = wieldedWeapon(actor, state);
    if (weapon) {
      const construction = MixinApi.isConstructed(weapon)
        ? weapon.getConstruction()
        : null;
      const channel = construction?.isWeapon()
        ? construction.primaryChannel()
        : null;
      if (channel) {
        return {
          channel,
          materialKey: materialKeyOf(weapon),
          weapon,
        };
      }
    }
  }
  if (weaponOnly) return null;
  // Any authored innate arms this path (DECISION K): a mechanical bite
  // rides the energy fold as ever, a heat innate builds a
  // `{mechanism:'heat'}` spec, and the electric-eel jolt is armed too —
  // `commitInflict` skips the primary and the instrument seam's drain
  // delivers the shock (`EnergizedMixin.augmentInflict` → `shockContact`).
  // The list is the species vocabulary (DECISION L) — species
  // `naturalAttacks` first, the legacy channel as its one-entry fallback.
  // This is a PRESENCE-ONLY read (attempt-time eligibility, guard): it
  // reports entry 0; the beat-keyed rotation is applied in
  // `commitInflict`, the only beat-anchored consumer.
  const first = naturalAttacksFor(actor)[0];
  if (first) return { channel: first.channel };
  return null;
}

/** The first wielded weapon on the actor whose grip slot is not impaired. */
function wieldedWeapon(
  actor: Stuff,
  state?: CombatantState,
): Stuff | null {
  if (!MixinApi.isSlotted(actor)) return null;
  for (const [slot, occupants] of actor.getAllOccupants()) {
    for (const occ of occupants) {
      if (!MixinApi.isConstructed(occ)) continue;
      if (!occ.getConstruction()?.isWeapon()) continue;
      // A fractured grip slot drops the weapon (injury edits the menu).
      if (
        state &&
        MixinApi.isVitals(actor) &&
        actor.isSlotImpairedByTrauma(slot)
      ) {
        continue;
      }
      return occ as Stuff;
    }
  }
  return null;
}

/* ───────────────────────── hand-slot economy ───────────────────────── */

/** Beats a game-time-seconds window maps to at the current tick length. */
function beatsForSeconds(seconds: number): number {
  const tick = dial(AppSettingKeys.combatTickSeconds, 3);
  return Math.max(1, Math.round(seconds / Math.max(0.1, tick)));
}

/** Is `occ` a wieldable weapon item (a candidate to switch/draw to)? */
function isWeaponItem(occ: Stuff): boolean {
  return (
    MixinApi.isWieldable(occ) &&
    MixinApi.isConstructed(occ) &&
    !!occ.getConstruction()?.isWeapon()
  );
}

/** The grip slot a weapon claims on the actor's body plan (its first hand). */
function gripSlotFor(actor: Stuff, target: Stuff): string | null {
  if (!MixinApi.isWieldable(target)) return null;
  const planPath = SpeciesApi.tryGetBodyPlanPath(actor);
  if (!planPath) return null;
  return target.getSlotClaim(planPath)[0] ?? null;
}

/**
 * Perform the actual grip swap at switch completion: clear the target's
 * current grip, pull it out of whatever slot it sits in (a sidearm sheath),
 * and occupy it in the grip. Defensive — a swap that can't complete (target
 * gone, no grip) just leaves the combatant as they were.
 */
function performSwap(actor: Stuff, target: Stuff | null): void {
  if (!MixinApi.isSlotted(actor) || !target) return;
  const grip = gripSlotFor(actor, target);
  if (!grip) return;
  for (const occ of [...actor.getOccupants(grip)]) {
    if (MixinApi.isSlottable(occ)) actor.vacate(grip, occ);
  }
  for (const [slot, occs] of actor.getAllOccupants()) {
    if (MixinApi.isSlottable(target) && occs.has(target)) {
      actor.vacate(slot, target);
    }
  }
  try {
    if (MixinApi.isSlottable(target)) actor.occupy(target, grip);
  } catch {
    /* a swap that violates slot rules just no-ops; the state is consistent */
  }
}

/** Re-derive a combatant's tempo after a gear change (a lighter/heavier
 * weapon changes the cadence). */
function reDeriveTempo(state: CombatantState): void {
  const combatant = state.combatant;
  const balanceFactor = balanceFactorOf(combatant);
  state.tempo.setRate(
    Tempo.rateFor(
      {
        encumbrance: MixinApi.isLoadBearing(combatant)
          ? combatant.getLoadRatio()
          : 0,
        endurance: enduranceRatio(combatant),
        competence: 1,
        balanceFactor,
      },
      tempoConfig(),
    ),
  );
  state.balanceFactor = balanceFactor;
}

/** Complete a switch: swap the grip, re-arm (clear the disarmed flag), and
 * re-derive tempo from the new weapon. */
function completeSwitch(state: CombatantState): void {
  const sw = state.weaponSwitch;
  if (!sw) return;
  performSwap(state.combatant, sw.getTarget());
  state.flags.remove("disarmed");
  state.weaponSwitch = null;
  reDeriveTempo(state);
}

/** A backup weapon the actor can draw — a dedicated `sidearm` sheath slot
 * first, else any carried (inventory) weapon that isn't the wielded one. */
function findBackupWeapon(actor: Stuff): Stuff | null {
  const wielded = wieldedWeapon(actor);
  if (MixinApi.isSlotted(actor)) {
    for (const occ of actor.getOccupants("sidearm")) {
      if (isWeaponItem(occ)) return occ as Stuff;
    }
  }
  if (MixinApi.isContainer(actor)) {
    for (const item of actor.getContents()) {
      if ((item as Stuff) !== wielded && isWeaponItem(item)) return item as Stuff;
    }
  }
  return null;
}

function beginSwitchImpl(
  actor: Stuff,
  target: Stuff,
  fast: boolean,
): { ok: boolean; reason?: string } {
  const session = sessionForImpl(actor);
  const state = session?.getState(actor);
  if (!state) return { ok: false, reason: "not-in-combat" };
  if (state.down) return { ok: false, reason: "downed" };
  if (state.weaponSwitch && !state.weaponSwitch.isReady()) {
    return { ok: false, reason: "already-switching" };
  }
  const seconds = fast
    ? dial(AppSettingKeys.combatDrawSeconds, 1.5)
    : dial(AppSettingKeys.combatSwitchSeconds, 6);
  state.weaponSwitch = new WeaponSwitch(target, beatsForSeconds(seconds), fast);
  return { ok: true };
}

function drawSidearmImpl(actor: Stuff): { ok: boolean; reason?: string } {
  const backup = findBackupWeapon(actor);
  if (!backup) return { ok: false, reason: "no-sidearm" };
  return beginSwitchImpl(actor, backup, true);
}

/* ───────────────────────── small reads ───────────────────────── */

function materialKeyOf(stuff: Stuff): string | undefined {
  const m = MixinApi.isTangible(stuff) ? stuff.getMaterial() : null;
  return m ? m.getName().toLowerCase() : undefined;
}

function speciesKeyOf(stuff: Stuff): string | undefined {
  if (!MixinApi.isOrganism(stuff)) return undefined;
  const sp = stuff.getSpecies();
  if (!sp) return undefined;
  // Species has no display name; the durable templatePath basename is a
  // stable flavor key (e.g. `/obj/species/wolf` → `wolf`).
  const path = sp.getTemplatePath();
  return path ? path.split("/").pop()?.toLowerCase() : undefined;
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/* ═══════════════════ Build 2 — consequence & progression ═══════════════════ */

/** The combat Disciplines credit accrues to (seeded as data). */
const MELEE_DISCIPLINE = "melee-combat";
const BLADES_DISCIPLINE = "blades";
const COMMAND_DISCIPLINE = "command";

/* ───────────────────────── blame ledger ───────────────────────── */

/** A combatant's durable id — the `templatePath` (the renown/provenance key). */
function durableIdOf(s: Stuff): string {
  return s.getTemplatePath() ?? "";
}

/**
 * The terms in force on the `killer → victim` engagement edge (the
 * per-edge blame foundation): a duel and an interloper's unlawful blow in
 * the *same* session carry different terms. Falls back to the session
 * terms when no edge is found (the degenerate 1v1, where they coincide).
 */
function termsFor(
  session: CombatSession,
  killer: Stuff,
  victim: Stuff,
): CombatTerms {
  return session.getGraph().edgeBetween(killer, victim)?.terms ?? session.getTerms();
}

/**
 * The band between two combatants — the location-aware read everything
 * outside the graph asks.
 *
 * `CombatGraph.rangeBetween` is a pure value-object and falls back to
 * `close` for an unknown pair, which is right for the graph and wrong for
 * a caller: two people who have not engaged in a 20 m yard are not in a
 * clinch. So a live edge wins, else the arena's own cap answers, and
 * `null` means they are not even co-present (cross-room fire is out of
 * scope, D26).
 */
function bandBetweenImpl(a: Stuff, b: Stuff): RangeState | null {
  const session = sessionForImpl(a);
  const graph = session?.getGraph();
  if (
    graph &&
    (graph.edgeBetween(a, b) !== undefined ||
      graph.edgeBetween(b, a) !== undefined)
  ) {
    return graph.rangeBetween(a, b);
  }
  const envA = MixinApi.isContainable(a) ? a.getContainer() : null;
  const envB = MixinApi.isContainable(b) ? b.getContainer() : null;
  if (envA === null || envA !== envB) return null;
  return arenaMaxBandFor(a);
}

/**
 * The splash set: the target, plus everyone clinched with them.
 *
 * Bands are RELATIONSHIPS, not positions (D2), so a placed effect cannot
 * sit "at a band" globally — there is no position to place it at. Area
 * arrival therefore resolves relationally: whoever is at `close` to the
 * primary target is on top of them, and catches it.
 *
 * *"You're not shooting a person, you're shooting the floor they need"*
 * becomes *"the splash catches whoever is on top of your target"* — which
 * needs no invented radius and cannot disagree with the band model.
 *
 * ⚠ The edge check is load-bearing. `rangeBetween` falls back to `close`
 * for a pair with no edge at all, so asking it alone would sweep every
 * combatant in the session into the splash. The same trap that produced
 * the re-seed bug at `pickSustained`.
 */
function splashSetForImpl(target: Stuff): Stuff[] {
  const out: Stuff[] = [target];
  const session = sessionForImpl(target);
  if (!session) return out;
  const graph = session.getGraph();
  for (const st of session.getStates()) {
    const other = st.combatant;
    if (other === target) continue;
    const engaged =
      graph.edgeBetween(other, target) !== undefined ||
      graph.edgeBetween(target, other) !== undefined;
    if (!engaged) continue;
    if (graph.rangeBetween(other, target) === "close") out.push(other);
  }
  return out;
}

/**
 * The commit-time consent gate for an area delivery.
 *
 * The shipped model *permits* attacking the unwilling — that is what the
 * `consented: false` crime marker is for — so this gate cannot mean
 * "refuse all non-consented harm" without forbidding crime itself. The
 * honest distinction is **deliberate versus collateral**:
 *
 *  - the **primary** target runs the ordinary terms handshake and is not
 *    gated here; attacking them may be a crime, and the ledger says so;
 *  - every **other** sentient caught in the splash must ALREADY stand
 *    under terms in force with the thrower that permit this harm.
 *    Otherwise the whole act is refused before it commits — nothing
 *    thrown, no poise spent, no session state moved.
 *
 * The rule it enforces: **area delivery must not be a cheaper route to a
 * person than aiming at them.**
 */
function mayDeliverToImpl(
  thrower: Stuff,
  primary: Stuff,
  splash: readonly Stuff[],
): { ok: true } | { ok: false; refusedBy: Stuff } {
  const session = sessionForImpl(thrower);
  const graph = session?.getGraph();
  for (const victim of splash) {
    if (victim === primary || victim === thrower) continue;
    // Non-sentients never gate — a thrown flask may soak the furniture.
    if (!safeIsSentient(victim)) continue;
    const edge =
      graph?.edgeBetween(thrower, victim) ?? graph?.edgeBetween(victim, thrower);
    if (edge?.terms.consented === true) continue;
    return { ok: false, refusedBy: victim };
  }
  return { ok: true };
}

/** Sentience read, tolerant of a species not yet resolved. */
function safeIsSentient(s: Stuff): boolean {
  try {
    return SpeciesApi.isSentient(s);
  } catch {
    return false;
  }
}

/** A death is unlawful — a crime — when a sentient person is killed under
 * lethal terms they did not consent to. */
function isCrime(terms: CombatTerms, victim: Stuff): boolean {
  return (
    terms.lethality === "lethal" && !terms.consented && safeIsSentient(victim)
  );
}

/** Append one combat attribution row to the unified accountability ledger.
 * Fire-and-forget (the Api swallows write failures) — never blocks the
 * beat; the game-time / wall-clock defaulting happens in the Logic. */
function noteAttribution(fields: AccountabilityFields): void {
  AccountabilityApi.record(fields);
}

/** The opening rows: `opened` always; `violated` when lethal terms are
 * imposed on a non-consenting sentient (the standalone crime marker). */
function recordOpening(
  session: CombatSession,
  initiator: Stuff,
  defender: Stuff,
  terms: CombatTerms,
): void {
  const sentient = safeIsSentient(defender);
  const base = {
    sessionId: session.sessionId,
    initiator: durableIdOf(initiator),
    opponent: durableIdOf(defender),
    lethality: terms.lethality,
    stopCondition: terms.stopCondition,
    consented: terms.consented,
    sentient,
  };
  noteAttribution({ ...base, kind: "opened" });
  if (terms.lethality === "lethal" && sentient && !terms.consented) {
    noteAttribution({ ...base, kind: "violated" });
  }
}

/** The `death` row — the terms in force ride along so the reader derives
 * lawful-vs-crime without a second lookup. The formation FACTS ride too
 * (the killer's side's formation + role + any directing captain), so a
 * legitimacy consumer can derive command responsibility — recorded, never
 * consulted by the crime rule. */
/**
 * Build combat's death row — the facts only combat knows: who struck, on
 * what terms, whether the victim consented, and which formation/captain
 * was in force.
 *
 * It RETURNS the row rather than writing it. The write now happens inside
 * `ConditionApi.die`, so exactly one row is appended per death however the
 * death was reached (the winning blow, the coup, or bleeding out after the
 * fight resolved). The row's contents are unchanged, which is what keeps
 * `deriveBlame` byte-identical.
 */
function buildDeathRow(
  session: CombatSession,
  killer: Stuff,
  victim: Stuff,
  directedBy = "",
): AccountabilityFields {
  const terms = termsFor(session, killer, victim);
  let formationPath = "";
  try {
    formationPath = PartyApi.formationPathOf(killer);
  } catch {
    /* unbooted party subsystem — no formation fact to record */
  }
  return {
    kind: "death",
    sessionId: session.sessionId,
    initiator: terms.initiator,
    opponent: durableIdOf(killer),
    victim: durableIdOf(victim),
    killer: durableIdOf(killer),
    lethality: terms.lethality,
    stopCondition: terms.stopCondition,
    consented: terms.consented,
    sentient: safeIsSentient(victim),
    formationPath,
    killerRole: safeRoleOf(killer),
    directedBy,
  };
}

function blameForImpl(victimId: string): Promise<BlameVerdict | null> {
  return AccountabilityApi.blameFor(victimId);
}

/* ───────────────────────── two-stage death (coup) ───────────────────────── */

/**
 * A coup **held** for the captain's directive (`coupCall: 'captain'`):
 * the victor stands over the fallen awaiting the word. Module-level
 * transient (the `partyProvider` precedent), victim-keyed; released by
 * `fight finish` (the directive) or the expiry window (spared — mercy by
 * default).
 */
interface PendingCoup {
  session: CombatSession;
  executioner: Stuff;
  victim: Stuff;
  expiry: ReturnType<typeof ScheduleApi.schedule>;
}
const pendingCoups = new Map<Stuff, PendingCoup>();

/**
 * Begin the stage-2 coup, **governed by the victor side's formation**.
 * Deferred one tick (`schedule(0)`) so the just-resolved session finishes
 * tearing down — freeing the executioner's `body` slot — before the coup
 * claims it. Governance (see docs/subsystems/combat-formations.md § Coup governance):
 *   - the **right** — `coupRight: 'engaged'` keeps the downing attacker;
 *     a role name re-points the stroke to that role's first standing,
 *     co-present holder (MA → the apprentice performs, and therefore
 *     banks the deed; no credit transfer anywhere);
 *   - the **call** — `coupCall: 'captain'` HOLDS the coup awaiting the
 *     captain's `fight finish` directive, expiring spared (mercy by
 *     default). The captain-as-executioner case needs no directive — the
 *     performer holds the call.
 */
function beginCoup(
  session: CombatSession,
  engagedAttacker: Stuff,
  victim: Stuff,
): void {
  ScheduleApi.schedule(0, () => governCoup(session, engagedAttacker, victim));
}

function governCoup(
  session: CombatSession,
  engagedAttacker: Stuff,
  victim: Stuff,
): void {
  const policy = resolvePolicyFor(engagedAttacker);
  const executioner = resolveCoupExecutioner(engagedAttacker, victim, policy);
  if (policy.coupCall === "captain" && !safeIsCaptain(executioner)) {
    // Held for the word. The window is real seconds (the coup is already
    // outside the resolved fight's beat); lapse = spared.
    const windowMs = Math.round(
      dial(AppSettingKeys.combatFormationCoupDirectiveWindowSeconds, 12) *
        1000,
    );
    const expiry = ScheduleApi.schedule(windowMs, () => {
      pendingCoups.delete(victim);
      abortCoup(session, executioner, victim);
    });
    pendingCoups.set(victim, { session, executioner, victim, expiry });
    CombatNarration.narrateCoupHeld(executioner, victim);
    return;
  }
  startCoup(session, executioner, victim);
}

/**
 * The formation's coup **right**: `'engaged'` = the downing attacker
 * (byte-parity default); a role name = its first standing, co-present
 * holder on the victor's side, walked in roster order (roles are sets —
 * the plural rule), falling back to the engaged attacker when the role
 * is vacant here.
 */
function resolveCoupExecutioner(
  engagedAttacker: Stuff,
  victim: Stuff,
  policy: FormationPolicy,
): Stuff {
  if (policy.coupRight === "engaged") return engagedAttacker;
  if (!MixinApi.isContainable(victim)) return engagedAttacker;
  const room = victim.getContainer();
  if (!room || !MixinApi.isContainer(room)) return engagedAttacker;
  const holders = [...room.getContents()]
    .filter((occ) => (occ as Stuff) !== (victim as Stuff))
    .filter((occ) => MixinApi.isEngaged(occ))
    .filter((occ) => safeRoleOf(occ) === policy.coupRight)
    .filter((occ) => safeAllied(occ, engagedAttacker))
    .filter(
      (occ) =>
        !MixinApi.isVitals(occ) || occ.getConsciousness() === "conscious",
    )
    .sort((a, b) => rosterIndexOf(a) - rosterIndexOf(b));
  return holders[0] ?? engagedAttacker;
}

/** Tolerant ally read (the `safeSideOf` precedent). */
function safeAllied(a: Stuff, b: Stuff): boolean {
  if ((a as Stuff) === (b as Stuff)) return true;
  try {
    return PartyApi.areAllied(a, b);
  } catch {
    return false;
  }
}

/**
 * The captain's execution directive (`fight finish`): release a held
 * coup in the captain's room whose executioner is on the captain's side.
 * The directive is a recorded FACT — it rides the death row's
 * `directedBy`, from which a legitimacy consumer derives command
 * responsibility. Deciding the fate of the fallen is leadership: the
 * call mints a `command` deed.
 */
function orderCoupImpl(captain: Stuff): { ok: boolean; reason?: string } {
  for (const [victim, pending] of pendingCoups) {
    if (!sameRoom(captain, victim)) continue;
    if (!safeAllied(captain, pending.executioner)) continue;
    if (!safeIsCaptain(captain)) {
      return { ok: false, reason: "not-the-captain" };
    }
    ScheduleApi.cancel(pending.expiry);
    pendingCoups.delete(victim);
    if (!coupEligible(pending.executioner, victim)) {
      return { ok: false, reason: "moment-passed" };
    }
    void AdvancementApi.recordDeed(captain, {
      discipline: COMMAND_DISCIPLINE,
      difficulty: "standard",
      outcome: "success",
    }).catch(() => {});
    startCoup(
      pending.session,
      pending.executioner,
      victim,
      durableIdOf(captain),
    );
    return { ok: true };
  }
  return { ok: false, reason: "no-held-coup" };
}

function sameRoom(a: Stuff, b: Stuff): boolean {
  if (!MixinApi.isContainable(a) || !MixinApi.isContainable(b)) return false;
  const room = a.getContainer();
  return room != null && b.getContainer() === room;
}

function startCoup(
  session: CombatSession,
  executioner: Stuff,
  victim: Stuff,
  directedBy = "",
): void {
  if (!MixinApi.isEngaged(executioner) || !MixinApi.isEngaged(victim)) return;
  if (!coupEligible(executioner, victim)) return;
  const durationMs = Math.round(
    dial(AppSettingKeys.combatCoupSeconds, 6) * 1000,
  );
  const coup = new Coup({
    executioner: executioner as Stuff & Engaged,
    victim: victim as Stuff & Engaged,
    durationMs,
    onComplete: () => completeCoup(session, executioner, victim, directedBy),
    onAbort: () => abortCoup(session, executioner, victim),
  });
  const started = SchedulerApi.start(coup);
  if (!started.ok) return;
  CombatNarration.narrateCoupTelegraph(executioner, victim);
  // Hook grammar (DECISION F): the telegraph moment — the resolved
  // session's states have already dissolved; the ctx carries null states.
  dispatchCoupBegun(session, executioner, victim);
}

function completeCoup(
  session: CombatSession,
  executioner: Stuff,
  victim: Stuff,
  directedBy = "",
): void {
  // Re-check: the victim may have been dragged clear or already died.
  if (!coupEligible(executioner, victim)) return;
  killImpl(
    victim,
    "put to death",
    buildDeathRow(session, executioner, victim, directedBy),
  );
  CombatNarration.narrateResolution({
    combatants: [executioner, victim] as [Stuff, Stuff],
    outcome: "death",
    victim,
    killer: executioner,
  });
  runResolutionConsumers(
    session,
    executioner,
    victim,
    true,
    isCrime(session.getTerms(), victim),
  );
}

function abortCoup(
  session: CombatSession,
  executioner: Stuff,
  victim: Stuff,
): void {
  // The stroke never fell — the victim is spared, the winner keeps the
  // (clean) duel win, and mercy is the recorded deed.
  CombatNarration.narrateCoupStayed(executioner, victim);
  runResolutionConsumers(session, executioner, victim, false, false);
}

/** Both parties present in the same room, neither already dead. */
function coupEligible(executioner: Stuff, victim: Stuff): boolean {
  // `isLivingBody()`, not `!isDead()`: `undead` is animate without being
  // alive, so a shade would otherwise read as a valid coup target — and a
  // bodiless self is not something you can put to death.
  if (
    MixinApi.isOrganism(executioner) &&
    !executioner.isLivingBody()
  ) {
    return false;
  }
  if (MixinApi.isOrganism(victim) && !victim.isLivingBody()) {
    return false;
  }
  if (!MixinApi.isContainable(executioner) || !MixinApi.isContainable(victim)) {
    return false;
  }
  const room = executioner.getContainer();
  return room != null && victim.getContainer() === room;
}

function interveneImpl(actor: Stuff, target: Stuff): boolean {
  const coup = findCoupInRoom(actor, target);
  if (!coup) return false;
  SchedulerApi.cancel(coup, "combat-intervened");
  return true;
}

/**
 * `defend <ally>` — interpose: take an attacker's pressure off a pressed
 * ally onto yourself. Finds a live foe pressing the ally, joins their
 * fight (if not already in it), and redirects that foe's edge off the ally
 * onto the interposer (`CombatGraph.redirect`) — the ally's incoming
 * pressure drops, the interposer's rises.
 */
function defendAllyImpl(
  interposer: Stuff,
  ally: Stuff,
): { ok: boolean; reason?: string } {
  const session = sessionForImpl(ally);
  if (!session || !session.isActive()) {
    return { ok: false, reason: "ally-not-fighting" };
  }
  const graph = session.getGraph();
  const incoming = graph
    .incomingEdges(ally)
    .filter((e) => !session.getState(e.attacker)?.down);
  if (incoming.length === 0) return { ok: false, reason: "ally-not-pressed" };
  const attacker = incoming[0]!.attacker;

  const interposerSession = sessionForImpl(interposer);
  if (!interposerSession) {
    if (!MixinApi.isEngaged(interposer) || !MixinApi.isEngaged(attacker)) {
      return { ok: false, reason: "not-engageable" };
    }
    const joined = joinImpl(
      interposer as Stuff & Engaged,
      attacker as Stuff & Engaged,
      incoming[0]!.terms,
    );
    if (!joined.ok) return joined;
  } else if (interposerSession !== session) {
    return { ok: false, reason: "busy-elsewhere" };
  }
  // The foe now presses the interposer instead of the ally.
  graph.redirect(attacker, ally, interposer);
  return { ok: true };
}

/** A live coup in the actor's room where `target` is the executioner or
 * the victim (so `intervene <foe>` and `intervene <friend>` both work). */
function findCoupInRoom(actor: Stuff, target: Stuff): Coup | null {
  if (!MixinApi.isContainable(actor)) return null;
  const room = actor.getContainer();
  if (!room || !MixinApi.isContainer(room)) return null;
  for (const occ of room.getContents()) {
    if (!MixinApi.isEngaged(occ)) continue;
    const e = occ.getEngagementByType(COMBAT_COUP_TYPE);
    if (
      e instanceof Coup &&
      ((occ as Stuff) === (target as Stuff) ||
        (e.getVictim() as Stuff) === (target as Stuff))
    ) {
      return e;
    }
  }
  return null;
}

/* ───────────────────────── fleeing (disengage) ───────────────────────── */

/**
 * Fleeing is combat's resolution of a **locomotion attempt made while
 * engaged** — not a verb, not a mode. The movement controller calls this
 * before a traverse: a no-op (free to go) when the actor isn't fighting;
 * an **opposed-lite** break otherwise. A focus-fire pin (incoming attacker
 * count ≥ the recovery-suppress threshold, reusing Phase 5) blocks the
 * break for the beat; every foe still locked on gets one **parting shot**;
 * on success the actor is removed from the fight and the traverse proceeds.
 * Individual only — coordinated party-retreat + pursuit stay deferred.
 */
function disengageImpl(actor: Stuff): { ok: boolean; message?: string } {
  const session = sessionForImpl(actor);
  if (!session || !session.isActive()) return { ok: true };
  const graph = session.getGraph();
  const incoming = graph
    .incomingEdges(actor)
    .filter((e) => !session.getState(e.attacker)?.down);

  if (recoverySuppressed(incoming.length)) {
    return { ok: false, message: "You're too hard-pressed to break away!" };
  }

  // Parting shots from every foe still locked on.
  const energy = dial(AppSettingKeys.combatFleePartingShotEnergy, 1.6);
  const fleerState = session.getState(actor);
  for (const e of incoming) {
    const attackerState = session.getState(e.attacker);
    if (attackerState && fleerState) {
      partingShot(attackerState, fleerState, energy);
    }
  }
  session.removeParticipant(actor);
  return { ok: true };
}

/** One foe's parting shot at a disengaging combatant — routed through the
 * same materials-response inflict as any blow, at the flee energy. */
function partingShot(
  attackerState: CombatantState,
  fleerState: CombatantState,
  energy: number,
): void {
  const instrument = resolveInstrument(attackerState);
  const channel: Channel = instrument?.channel ?? "blunt";
  // A shock innate has no parting jolt — its delivery is the contact
  // drain (DECISION K), not an energy spec, and the fleer is breaking
  // contact. A parting shock is a deferred seam.
  if (channel === "shock") return;
  const site = siteFor(fleerState.combatant, false);
  ConditionApi.inflict(fleerState.combatant, {
    mechanism: channel,
    site,
    energy,
  });
}

/* ───────────────────────── resolution consumers ───────────────────────── */

/**
 * The existing-substrate consumers a resolved fight feeds: a chronicle
 * deed for the victor (deed vs crime), and a regard nudge from every
 * witness (a clean duel win earns a little; an unlawful kill makes the
 * room recoil). Defensive throughout — a consumer failure never breaks a
 * resolution. The global "X killed Y" presence relay is deferred (the
 * room-scoped death narration already announces it).
 */
function runResolutionConsumers(
  session: CombatSession,
  victor: Stuff,
  vanquished: Stuff,
  killed: boolean,
  crime: boolean,
): void {
  void session; // reserved for a future session-scoped consumer
  try {
    const vName = presentationOf(vanquished);
    const text = killed
      ? crime
        ? `Struck down ${vName} — an unlawful killing.`
        : `Killed ${vName} in a sanctioned fight.`
      : `Bested ${vName} in a duel.`;
    const tags = ["combat", killed ? "kill" : "victory"];
    if (crime) tags.push("crime");
    void ChronicleApi.recordDeed(victor, { text, tags }).catch(() => {});
  } catch {
    /* chronicle is best-effort */
  }
  const delta = crime
    ? dial(AppSettingKeys.combatRegardUnlawfulKill, -20)
    : dial(AppSettingKeys.combatRegardDuelWin, 2);
  for (const w of roomBelievers(victor, [victor, vanquished])) {
    try {
      RegardApi.adjustRegard(w, victor, delta);
    } catch {
      /* skip a witness that can't hold regard */
    }
  }
}

/** The room's belief-capable witnesses, minus the named exclusions. */
function roomBelievers(anchor: Stuff, exclude: Stuff[]): (Stuff & Sensor)[] {
  if (!MixinApi.isContainable(anchor)) return [];
  const room = anchor.getContainer();
  if (!room || !MixinApi.isContainer(room)) return [];
  const out: (Stuff & Sensor)[] = [];
  for (const occ of room.getContents()) {
    if (exclude.includes(occ)) continue;
    if (MixinApi.isSensor(occ)) out.push(occ as Stuff & Sensor);
  }
  return out;
}

/** A readable label for a combatant (its presentation), or a fallback.
 * `getPresentation` is on the `Stuff` base, so every combatant has it. */
function presentationOf(s: Stuff): string {
  try {
    return s.getPresentation();
  } catch {
    return "someone";
  }
}

/* ───────────────────────── advancement ───────────────────────── */

/**
 * Mint the actor's per-exchange `ActSignature` (self-credit only). Only
 * the player-driven side accrues a transcript — a brain-driven beast
 * needs none. A bladed instrument additionally credits `blades`. Fire-
 * and-forget: advancement never blocks the beat.
 */
function mintExchangeSignature(
  actorState: CombatantState,
  targetState: CombatantState,
  outcome: OutcomeKind,
): void {
  if (actorState.brainPath) return; // player side only
  const actor = actorState.combatant;
  const difficulty = difficultyFor(targetState);
  const result = outcomeToResult(outcome);
  const subs: Subcheck[] = [
    { discipline: MELEE_DISCIPLINE, difficulty, outcome: result },
  ];
  const instr = resolveInstrument(actorState);
  if (instr && (instr.channel === "edge" || instr.channel === "point")) {
    subs.push({ discipline: BLADES_DISCIPLINE, difficulty, outcome: result });
  }
  void AdvancementApi.recordSignature(actor, { discipline: subs }).catch(
    () => {},
  );
}

/** The exchange difficulty from the target's tactical state — beating a
 * composed, armed guard is `hard`; exploiting an open one is `easy`. */
function difficultyFor(target: CombatantState): Difficulty {
  const band = target.poise.band();
  if (band === "open" || band === "broken") return "easy";
  if (band === "reeling") return "standard";
  return resolveInstrument(target) ? "hard" : "standard";
}

/** Map an exchange outcome to a competence outcome. */
function outcomeToResult(outcome: OutcomeKind): Outcome {
  switch (outcome) {
    case "exploit":
      return "critical";
    case "land":
    case "control-land":
      return "success";
    case "parried":
    case "control-resisted":
      return "partial";
    case "whiff":
      return "failure";
    default:
      return "partial";
  }
}

/** The costed `assess` mints a modest melee-combat read credit. */
/**
 * Mint a `command` deed for formation policy work — an interception
 * performed, a created opening an ally cashed, a captain's call landing.
 * The teaching payoff: the master/captain advances the exact discipline
 * you cannot grind solo. Fire-and-forget; player-driven actors only (the
 * `mintExchangeSignature` parity — brains bank nothing).
 */
function mintCommandDeed(state: CombatantState, difficulty: Difficulty): void {
  if (state.brainPath) return;
  void AdvancementApi.recordDeed(state.combatant, {
    discipline: COMMAND_DISCIPLINE,
    difficulty,
    outcome: "success",
  }).catch(() => {});
}

function mintAssessSignature(actor: Stuff): void {
  void AdvancementApi.recordDeed(actor, {
    discipline: MELEE_DISCIPLINE,
    difficulty: "standard",
    outcome: "success",
  }).catch(() => {});
}

/**
 * The **free** fogged read of the actor's opponent — no cost, no
 * side-effects. The opponent's poise is hedged by the actor's own sharpness
 * (poker, not slots): a dull reader under-reads the band and mistakes a
 * feint for a real opening; a sharp reader sees the true band and the
 * feint's `tell`. Powers the always-available `fight` status line; the
 * costed `assess` verb wraps it.
 */
function perceiveImpl(actor: Stuff): CombatAssessResult {
  const session = sessionForImpl(actor);
  if (!session) return { ok: false, reason: "not-in-combat" };
  const oppState = session.opponentState(actor);
  if (!oppState) return { ok: false, reason: "no-target" };
  const st = session.getState(actor);
  const opp = oppState.combatant;
  const viewerSharpness = st ? sharpnessFor(st) : 0;
  const oppFeinting = oppState.queuedGambit === "feint";
  const reading = CombatFog.perceive(
    oppState.poise.band(),
    viewerSharpness,
    oppFeinting,
    fogConfig(),
  );
  return {
    ok: true,
    poiseBand: reading.band,
    read: reading.tell,
    flags: oppState.flags.list(),
    armed: resolveInstrument(oppState, true) !== null,
    conditionBand: MixinApi.isVitals(opp)
      ? opp.getConditionBand()
      : undefined,
  };
}

function assessImpl(actor: Stuff, _target: Stuff): CombatAssessResult {
  const read = perceiveImpl(actor);
  if (!read.ok) return read;
  // The costed read: spend the actor's next exchange (the opportunity cost)
  // and mint the melee-read credit. The fogged read itself is `perceiveImpl`.
  const session = sessionForImpl(actor);
  const st = session?.getState(actor);
  if (st) st.queuedGambit = "assess";
  mintAssessSignature(actor);
  return read;
}

