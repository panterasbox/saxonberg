// CombatLogic — the hot-reloadable logic singleton behind CombatApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from "../../lib/stuff/ApiLogic";
import { CallSecurity, Unshadowable } from "../../lib/security/decorators";
import { SecurityPolicies } from "../../lib/security/SecurityPolicies";
import type { Stuff } from "../../lib/stuff/Stuff";
import type { Engaged } from "../../lib/activity/Engaged";
import { MixinApi } from "../../api/mixin";
import { MaterialApi } from "../../api/material";
import { ConditionApi } from "../../api/condition";
import { SchedulerApi } from "../../api/scheduler";
import { StuffApi } from "../../api/stuff";
import { AppApi } from "../../api/app";
import { AppSettingKeys } from "../../lib/config/AppSettings";
import type { Channel } from "../../lib/material/Channel";
import type { OutcomeBand } from "../../api/material";
import type { BrainContext, BrainStatics } from "../../lib/behavior/brain";
import {
  CombatSession,
  CombatPartnerHold,
  COMBAT_SESSION_TYPE,
  COMBAT_PARTNER_TYPE,
  type CombatantState,
  type CombatResolution,
} from "../../lib/combat/CombatSession";
import type { CombatTerms } from "../../lib/combat/CombatTerms";
import { Poise, type PoiseConfig } from "../../lib/combat/Poise";
import { Tempo, type TempoConfig } from "../../lib/combat/Tempo";
import { CombatFlags } from "../../lib/combat/CombatFlags";
import { Gambit, type GambitSpec } from "../../lib/combat/Gambit";
import {
  CombatNarration,
  type ExchangeOutcome,
} from "../../lib/combat/CombatNarration";
import type {
  OpenSessionResult,
  GambitEligibility,
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
  ): OpenSessionResult {
    return openSessionImpl(initiator, defender, terms);
  }

  @CallSecurity(CombatApiCallers)
  public advance(session: CombatSession): void {
    advanceImpl(session);
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
  public yieldFight(actor: Stuff): boolean {
    const session = sessionForImpl(actor);
    if (!session) return false;
    // The yielding actor loses; the fight ends on the yield terminus.
    const opp = session.opponentState(actor)?.combatant;
    endWith(session, "yield", actor, opp);
    return true;
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
): OpenSessionResult {
  if (!MixinApi.isEngaged(initiator) || !MixinApi.isEngaged(defender)) {
    return { ok: false, reason: "not-engageable" };
  }
  // 1:1 — a combatant already in a fight can't open a second.
  if (
    initiator.getEngagementByType(COMBAT_SESSION_TYPE) ||
    defender.getEngagementByType(COMBAT_SESSION_TYPE)
  ) {
    return { ok: false, reason: "busy" };
  }

  const tickMs = Math.round(dial(AppSettingKeys.combatTickSeconds, 3) * 1000);
  const a = deriveState(initiator);
  const b = deriveState(defender);
  const session = new CombatSession(a, b, terms, tickMs);

  const started = SchedulerApi.start(session);
  if (!started.ok) return { ok: false, reason: "busy" };

  const partner = new CombatPartnerHold(defender, session);
  session.setPartner(partner);
  const partnerStarted = SchedulerApi.start(partner);
  if (!partnerStarted.ok) {
    SchedulerApi.cancel(session, "cancelled");
    return { ok: false, reason: "busy" };
  }
  return { ok: true, session };
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
    brainPath: brainPathFor(combatant),
    brainConfig: {},
    balanceFactor: inputs.balanceFactor,
    down: false,
  };
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
  if (!MixinApi.isReserved(combatant)) return 1;
  const r = combatant.getReserve("endurance");
  if (!r) return 1;
  const cap = r.capacity.rawValue();
  return cap > 0 ? clamp01(r.current.rawValue() / cap) : 1;
}

function balanceFactorOf(combatant: Stuff): number {
  const weapon = wieldedWeapon(combatant);
  const w = weapon as unknown as Partial<WeaponLike> | null;
  if (w && typeof w.getBalanceFactor === "function") {
    const bf = w.getBalanceFactor();
    return Number.isFinite(bf) && bf > 0 ? bf : 1;
  }
  return 1;
}

/* ───────────────────────── the beat ───────────────────────── */

function advanceImpl(session: CombatSession): void {
  if (!session.isActive()) return;
  const beat = session.advanceBeat();
  const [sa, sb] = session.getStates();

  const maxBeats = Math.round(dial(AppSettingKeys.combatMaxBeats, 200));
  if (beat > maxBeats) {
    endWith(session, "draw");
    return;
  }

  // Let brain-driven combatants choose (queue) their intent this beat.
  for (const s of [sa, sb]) {
    if (s.brainPath && !s.queuedGambit && !s.down) invokeBrain(s);
  }

  // Emergent tempo: each combatant acts as often as their accrued tempo
  // allows (fractional carry). Bounded per beat by the tempo ceiling.
  for (const s of [sa, sb]) {
    if (!session.isActive()) break;
    const opp = session.opponentState(s.combatant);
    if (!opp || s.down || opp.down) continue;
    let n = s.tempo.advance();
    while (n-- > 0 && session.isActive() && !s.down && !opp.down) {
      resolveExchange(session, s, opp, beat);
    }
  }

  sa.poise.tick(beat);
  sb.poise.tick(beat);

  if (session.isActive()) checkVitalsResolution(session);
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
    // Defensive/reactive play restores poise, capped by endurance.
    const restore = dial(AppSettingKeys.combatPoiseRestorePerDefense, 0.15);
    actorState.poise.restore(restore, enduranceRatio(actorState.combatant));
    return;
  }

  // An actual exchange trades blows — base autocombat erodes both sides.
  const erode = dial(AppSettingKeys.combatPoiseErodePerExchange, 0.12);
  actorState.poise.erode(erode, beat);
  targetState.poise.erode(erode, beat);

  const spec = Gambit.forVerb(key) ?? Gambit.get("strike")!;

  // Attempt-time gate: an ineligible gambit is a wasted press (erosion
  // only, no narration) — the injury-edits-the-menu reject.
  if (!eligibilityImpl(actorState.combatant, spec.key).ok) return;

  const overextend = dial(AppSettingKeys.combatPoiseOverextendCost, 0.2);
  const whiffPenalty = dial(AppSettingKeys.combatPoiseWhiffPenalty, 0.25);
  const targetCanParry = resolveInstrument(targetState) !== null;
  const outcome = decideOutcome(actorState, targetState, spec, targetCanParry);

  switch (outcome) {
    case "whiff": {
      actorState.poise.spend(whiffPenalty, beat); // self-open
      narrate(actorState, targetState, spec, "whiff", null, false);
      reactiveDispatch(session, targetState, actorState, "whiff", beat);
      return;
    }
    case "parried": {
      actorState.poise.spend(overextend, beat);
      narrate(actorState, targetState, spec, "parried", null, false);
      // The reactive-affordance dispatch (X): a parry arms the defender's
      // riposte against the attacker.
      reactiveDispatch(session, targetState, actorState, "parried", beat);
      return;
    }
    case "control-resisted": {
      actorState.poise.spend(overextend, beat);
      narrate(actorState, targetState, spec, "parried", null, false);
      return;
    }
    case "control-land": {
      actorState.poise.spend(overextend, beat);
      if (spec.flagOnLand) targetState.flags.add(spec.flagOnLand);
      narrate(actorState, targetState, spec, "control", null, true);
      return;
    }
    case "exploit": {
      targetState.poise.consumeOpening();
      actorState.poise.spend(overextend, beat);
      const report = commitInflict(actorState, targetState, "open");
      narrate(actorState, targetState, spec, "land", report, true);
      // Winning the poise contest downs the target (the incapacitation
      // waypoint; a lethal finish follows under lethal terms).
      handleDown(session, actorState, targetState, beat);
      return;
    }
    case "land": {
      actorState.poise.spend(overextend, beat);
      const band = targetState.poise.band();
      const report = commitInflict(actorState, targetState, band);
      narrate(actorState, targetState, spec, report.deflected ? "deflected" : "land", report, !report.deflected);
      if (!report.deflected) checkFirstBlood(session, report);
      return;
    }
  }
}

type OutcomeKind =
  | "whiff"
  | "parried"
  | "control-resisted"
  | "control-land"
  | "exploit"
  | "land";

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
    // The riposte is an offensive counter against the attacker.
    const overextend = dial(AppSettingKeys.combatPoiseOverextendCost, 0.2);
    defenderState.poise.spend(overextend, beat);
    const band = attackerState.poise.band();
    const report = commitInflict(defenderState, attackerState, band);
    narrate(defenderState, attackerState, g, report.deflected ? "deflected" : "land", report, !report.deflected);
    if (!report.deflected) checkFirstBlood(session, report);
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
}

/**
 * Route a landed offensive gambit through the materials-response covering
 * stack. Combat picks the channel (instrument) + site + energy (from the
 * target's poise band); `ConditionApi.inflict` returns trauma type +
 * severity.
 */
function commitInflict(
  actorState: CombatantState,
  targetState: CombatantState,
  bandForEnergy: string,
): InflictReport {
  const attacker = actorState.combatant;
  const target = targetState.combatant;
  const instrument = resolveInstrument(actorState);
  const channel: Channel = instrument?.channel ?? "blunt";
  const site = siteFor(target, bandForEnergy === "open");
  const energy = energyFor(bandForEnergy);

  const outcome = ConditionApi.inflict(target, {
    mechanism: channel,
    site,
    energy,
  });
  const band = outcome.afflicted
    ? MaterialApi.severityToBand(outcome.trauma.severity)
    : ("turned" as OutcomeBand);
  return {
    attacker,
    target,
    channel,
    site,
    band,
    deflected: !outcome.afflicted,
    materialKey: instrument?.materialKey,
    attackerSpeciesKey: speciesKeyOf(attacker),
  };
}

/** The struck site — torso by default, a called shot to the head when the
 * target is open (and has a head part). */
function siteFor(target: Stuff, open: boolean): string {
  if (open && MixinApi.isVitals(target) && target.getPart("body.head")) {
    return "body.head";
  }
  if (MixinApi.isVitals(target) && target.getPart("body.torso")) {
    return "body.torso";
  }
  return "body.torso";
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
  const [a, b] = session.getStates();
  CombatNarration.narrateResolution({
    combatants: [a.combatant, b.combatant],
    outcome,
    victim,
    killer,
  });
  session.resolve(outcome);
}

function checkFirstBlood(session: CombatSession, report: InflictReport): void {
  if (session.getTerms().stopCondition === "first-blood") {
    endWith(session, "first-blood", report.target, report.attacker);
  }
}

/**
 * A downed combatant lost the poise contest. Under lethal-authorized
 * terms a Build-1 cull (non-sentient target) finishes here — the winning
 * blow kills, since a non-sentient target skips the two-stage coup. Under
 * non-lethal terms the fight ends at incapacitation. (Build 2 adds
 * `isSentient` + the separate interruptible coup for sentient duels.)
 */
function handleDown(
  session: CombatSession,
  attackerState: CombatantState,
  targetState: CombatantState,
  beat: number,
): void {
  void beat;
  targetState.down = true;
  const attacker = attackerState.combatant;
  const victim = targetState.combatant;
  if (session.getTerms().isLethalAuthorized()) {
    kill(victim);
    endWith(session, "death", victim, attacker);
  } else {
    endWith(session, "incapacitation", victim, attacker);
  }
}

/** Pull the death seam (the harm-owned lifecycle flip). */
function kill(target: Stuff): void {
  if (MixinApi.isOrganism(target)) target.setLifecycleState("dead");
}

/** End the fight if trauma has driven a combatant unconscious or dead
 * (the bleed-out / knockout path — now narrated, not silent). */
function checkVitalsResolution(session: CombatSession): void {
  for (const s of session.getStates()) {
    if (!MixinApi.isVitals(s.combatant)) continue;
    const opp = session.opponentState(s.combatant)?.combatant;
    const c = s.combatant.getConsciousness();
    if (c === "dead") {
      endWith(session, "death", s.combatant, opp);
      return;
    }
    if (c === "unconscious" && !s.down) {
      s.down = true;
      endWith(session, "incapacitation", s.combatant, opp);
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
): void {
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
    void brain.act(ctx);
  } catch {
    // A throwing brain skips its turn; the fight continues.
  }
}

/* ───────────────────────── eligibility + instruments ───────────────────────── */

function sessionForImpl(combatant: Stuff): CombatSession | undefined {
  if (!MixinApi.isEngaged(combatant)) return undefined;
  // Combatant A holds the session directly; combatant B holds the partner
  // hold, which references the session.
  const direct = combatant.getEngagementByType(COMBAT_SESSION_TYPE);
  if (direct instanceof CombatSession) return direct;
  const partner = combatant.getEngagementByType(COMBAT_PARTNER_TYPE);
  if (partner instanceof CombatPartnerHold) return partner.getSession();
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
  return { ok: true };
}

interface ResolvedInstrument {
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
  if (MixinApi.isCombatant(actor)) {
    const ch = actor.getNaturalAttackChannel();
    if (ch) return { channel: ch };
  }
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

/* ───────────────────────── small reads ───────────────────────── */

function materialKeyOf(stuff: Stuff): string | undefined {
  const m = MaterialApi.materialOf(stuff);
  return m ? m.getName().toLowerCase() : undefined;
}

function speciesKeyOf(stuff: Stuff): string | undefined {
  if (!MixinApi.isOrganism(stuff)) return undefined;
  const sp = stuff.getSpecies();
  if (!sp) return undefined;
  // Species has no display name; the durable templatePath basename is a
  // stable flavor key (e.g. `/lib/species/wolf` → `wolf`).
  const path = sp.getTemplatePath();
  return path ? path.split("/").pop()?.toLowerCase() : undefined;
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

interface WeaponLike {
  getBalanceFactor(): number;
}
