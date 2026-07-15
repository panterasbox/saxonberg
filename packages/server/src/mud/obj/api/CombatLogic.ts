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
import { ScheduleApi } from "../../api/schedule";
import { StuffApi } from "../../api/stuff";
import { AppApi } from "../../api/app";
import { SpeciesApi } from "../../api/species";
import { PartyApi } from "../../api/party";
import { ChronicleApi } from "../../api/chronicle";
import { RegardApi } from "../../api/regard";
import { AdvancementApi } from "../../api/advancement";
import { WorldClockApi } from "../../api/worldclock";
import { AppSettingKeys } from "../../lib/config/AppSettings";
import CombatAttributionEvent, {
  type CombatAttributionFields,
} from "../../lib/combat/CombatAttributionEvent";
import { Coup, COMBAT_COUP_TYPE } from "../../lib/combat/Coup";
import type { Sensor } from "../../lib/message/Sensor";
import type {
  Subcheck,
  Difficulty,
  Outcome,
} from "../../lib/advancement/ActSignature";
import type { Channel } from "../../lib/material/Channel";
import Weapon from "../../lib/equipment/Weapon";
import type { OutcomeBand } from "../../api/material";
import type { BrainContext, BrainStatics } from "../../lib/behavior/brain";
import {
  CombatSession,
  CombatParticipantHold,
  COMBAT_PARTICIPANT_TYPE,
  type CombatantState,
  type CombatResolution,
} from "../../lib/combat/CombatSession";
import type { CombatTerms } from "../../lib/combat/CombatTerms";
import { Poise, type PoiseConfig } from "../../lib/combat/Poise";
import { Tempo, type TempoConfig } from "../../lib/combat/Tempo";
import { CombatFlags } from "../../lib/combat/CombatFlags";
import { Gambit, type GambitSpec } from "../../lib/combat/Gambit";
import { Sharpness, type SharpnessConfig } from "../../lib/combat/Sharpness";
import { CombatFog, type FogConfig } from "../../lib/combat/CombatFog";
import type { CompetenceBandName } from "../../lib/advancement/CompetenceBand";
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
  ): Promise<CombatAttributionEvent[]> {
    const rows = await CombatAttributionEvent.find<CombatAttributionEvent>({
      sessionId,
    });
    return rows.sort((a, b) => a.realAt - b.realAt);
  }

  @CallSecurity(CombatApiCallers)
  public intervene(actor: Stuff, target: Stuff): boolean {
    return interveneImpl(actor, target);
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
  const bState = deriveState(defender);
  bState.side = safeSideOf(defender);
  bState.competenceBand = bandFromOpts(defender, opts);
  const holdA = session.addParticipant(aState);
  const holdB = session.addParticipant(bState);

  // Seed the threat graph with the mutual 1v1 edges (both directions),
  // each carrying the session terms (the per-edge-terms seam — cycle-2
  // Phase 3 moves the terms authority fully onto the edges).
  const graph = session.getGraph();
  graph.addEdge(initiator, defender, terms);
  graph.addEdge(defender, initiator, terms);

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
  const hold = session.addParticipant(state);
  if (!SchedulerApi.start(hold).ok) {
    session.removeParticipant(joiner);
    return { ok: false, reason: "busy" };
  }
  const graph = session.getGraph();
  graph.addEdge(joiner, target, terms);
  graph.addEdge(target, joiner, terms);
  // Blame ledger: a fresh engagement opened inside the melee (a lethal,
  // non-consented join onto a sentient is the interloper crime path).
  recordOpening(session, joiner, target, terms);
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
    brainPath: brainPathFor(combatant),
    brainConfig: {},
    balanceFactor: inputs.balanceFactor,
    competenceBand: "untrained",
    sharpness: null,
    down: false,
    side: "",
    lastStruckBy: null,
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

/**
 * The foe this actor presses this exchange: prefer a still-live foe the
 * actor already has an edge onto (sustained focus), else any live foe
 * (someone not on the actor's frozen side), opening an edge onto them.
 * Null when no foe remains (the fight is won / all allies).
 */
function pickTarget(
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
    graph.addEdge(actor, s.combatant, session.getTerms());
    return s;
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
  if (!MixinApi.isReserved(combatant)) return 1;
  const r = combatant.getReserve("endurance");
  if (!r) return 1;
  const cap = r.capacity.rawValue();
  return cap > 0 ? clamp01(r.current.rawValue() / cap) : 1;
}

function balanceFactorOf(combatant: Stuff): number {
  const weapon = wieldedWeapon(combatant);
  if (weapon instanceof Weapon) {
    const bf = weapon.getBalanceFactor();
    return Number.isFinite(bf) && bf > 0 ? bf : 1;
  }
  return 1;
}

/* ───────────────────────── the beat ───────────────────────── */

function advanceImpl(session: CombatSession): void {
  if (!session.isActive()) return;
  const beat = session.advanceBeat();
  const states = session.getStates();

  const maxBeats = Math.round(dial(AppSettingKeys.combatMaxBeats, 200));
  if (beat > maxBeats) {
    endWith(session, "draw");
    return;
  }

  // Let brain-driven combatants choose (queue) their intent this beat.
  for (const s of states) {
    if (s.brainPath && !s.queuedGambit && !s.down) invokeBrain(s);
  }

  // Emergent tempo: each combatant acts as often as their accrued tempo
  // allows (fractional carry). Bounded per beat by the tempo ceiling.
  // Targeting is side-driven (the threat graph + frozen sides): a foe is
  // anyone not on the actor's side. A 1v1 is the degenerate case.
  for (const s of states) {
    if (!session.isActive()) break;
    if (s.down) continue;
    let n = s.tempo.advance();
    while (n-- > 0 && session.isActive() && !s.down) {
      const target = pickTarget(session, s);
      if (!target || target.down) break;
      resolveExchange(session, s, target, beat);
    }
  }

  for (const s of states) s.poise.tick(beat);

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
    // Focus-fire pin: a defender pressed by enough attackers can't spend a
    // beat recovering (the turtle who beats one but loses to two). The
    // beat is still forgone — they're too busy covering to counter.
    const incoming = session.getGraph().edgeCount(actorState.combatant);
    const suppressAt = Math.round(
      dial(AppSettingKeys.combatFocusFireSuppressRecoveryAt, 2),
    );
    if (incoming >= suppressAt) return;
    // Defensive/reactive play restores poise, capped by endurance and
    // scaled by sharpness — a sharper fighter recovers footing better per
    // defensive beat (the composure seam rides this scalar too, later).
    const restore =
      dial(AppSettingKeys.combatPoiseRestorePerDefense, 0.15) *
      sharpnessFor(actorState);
    actorState.poise.restore(restore, enduranceRatio(actorState.combatant));
    return;
  }

  if (key === "assess") {
    // The actor spent the beat reading the opponent (the costed `assess`):
    // no offense, no poise restore — the read already went out at command
    // time. The opportunity cost is the forgone exchange.
    return;
  }

  // An actual exchange trades blows — base autocombat erodes both sides.
  // Focus-fire: the target's erosion scales with how many attackers are
  // pressing them (each extra attacker beyond the first adds
  // `erosionPerEdge`), so ganging up wears a defender down faster.
  const erode = dial(AppSettingKeys.combatPoiseErodePerExchange, 0.12);
  const attackers = session.getGraph().edgeCount(targetState.combatant);
  const focusMult =
    1 +
    Math.max(0, attackers - 1) *
      dial(AppSettingKeys.combatFocusFireErosionPerEdge, 0.5);
  actorState.poise.erode(erode, beat);
  targetState.poise.erode(erode * focusMult, beat);

  const spec = Gambit.forVerb(key) ?? Gambit.get("strike")!;

  // Attempt-time gate: an ineligible gambit is a wasted press (erosion
  // only, no narration) — the injury-edits-the-menu reject.
  if (!eligibilityImpl(actorState.combatant, spec.key).ok) return;

  const overextend = dial(AppSettingKeys.combatPoiseOverextendCost, 0.2);
  const whiffPenalty = dial(AppSettingKeys.combatPoiseWhiffPenalty, 0.25);
  const targetCanParry = resolveInstrument(targetState) !== null;
  const outcome = decideOutcome(actorState, targetState, spec, targetCanParry);

  // Advancement: the actor earns credit for the exchange (self-credit
  // only). Minted for the player-driven side; a brain-driven beast needs
  // no transcript. Fire-and-forget — never blocks the beat.
  mintExchangeSignature(actorState, targetState, outcome);

  switch (outcome) {
    case "whiff": {
      actorState.poise.spend(whiffPenalty, beat); // self-open
      narrate(actorState, targetState, spec, "whiff", null, false, beat);
      reactiveDispatch(session, targetState, actorState, "whiff", beat);
      return;
    }
    case "parried": {
      actorState.poise.spend(overextend, beat);
      narrate(actorState, targetState, spec, "parried", null, false, beat);
      // The reactive-affordance dispatch (X): a parry arms the defender's
      // riposte against the attacker.
      reactiveDispatch(session, targetState, actorState, "parried", beat);
      return;
    }
    case "control-resisted": {
      actorState.poise.spend(overextend, beat);
      narrate(actorState, targetState, spec, "parried", null, false, beat);
      return;
    }
    case "control-land": {
      actorState.poise.spend(overextend, beat);
      if (spec.flagOnLand) targetState.flags.add(spec.flagOnLand);
      narrate(actorState, targetState, spec, "control", null, true, beat);
      return;
    }
    case "exploit": {
      targetState.poise.consumeOpening();
      actorState.poise.spend(overextend, beat);
      const report = commitInflict(actorState, targetState, "open");
      const firstBlood = !report.deflected && session.markBloodDrawn();
      narrate(actorState, targetState, spec, "land", report, true, beat, true, firstBlood);
      // Winning the poise contest downs the target (the incapacitation
      // waypoint; a lethal finish follows under lethal terms).
      handleDown(session, actorState, targetState);
      return;
    }
    case "land": {
      actorState.poise.spend(overextend, beat);
      const targetBand = targetState.poise.band();
      const report = commitInflict(actorState, targetState, targetBand);
      const landed = !report.deflected;
      const firstBlood = landed && session.markBloodDrawn();
      narrate(actorState, targetState, spec, report.deflected ? "deflected" : "land", report, landed, beat, false, firstBlood);
      if (landed) checkFirstBlood(session, report);
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
      return;
    }
    case "feint-read": {
      // Seen through (or wasted on a non-turtle): the bait fizzles and the
      // feinter eats the small cost for nothing — which is why blind
      // patience against a reader, and pure aggression, both beat a feinter.
      const feintCost = dial(AppSettingKeys.combatPoiseFeintCost, 0.08);
      actorState.poise.spend(feintCost, beat);
      narrate(actorState, targetState, spec, "feint-read", null, false, beat);
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
  | "land"
  | "feint-bit"
  | "feint-read";

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
    // The riposte is an offensive counter against the attacker.
    const overextend = dial(AppSettingKeys.combatPoiseOverextendCost, 0.2);
    defenderState.poise.spend(overextend, beat);
    const band = attackerState.poise.band();
    const report = commitInflict(defenderState, attackerState, band);
    const landed = !report.deflected;
    const firstBlood = landed && session.markBloodDrawn();
    narrate(defenderState, attackerState, g, report.deflected ? "deflected" : "land", report, landed, beat, false, firstBlood);
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
  // Name the killing edge for an attrition/bleed-out death that has no
  // single striker at resolution time (the per-edge blame foundation).
  if (outcome.afflicted) {
    targetState.lastStruckBy = actorState.combatant;
  }
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
    traumaType: outcome.afflicted ? outcome.trauma.type : undefined,
  };
}

/** The struck site — torso by default, a called shot to the head when the
 * target is open (and has a head part). */
function siteFor(target: Stuff, open: boolean): string {
  if (open && MixinApi.isVitals(target) && target.getPart("body.head")) {
    return "body.head";
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
  const combatants = session.getStates().map((s) => s.combatant);
  CombatNarration.narrateResolution({
    combatants,
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
  targetState.down = true;
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
    killImpl(victim, "slain");
    recordDeath(session, attacker, victim);
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

/** Pull the death seam (the harm-owned lifecycle flip), naming the cause
 * so a `getCauseOfDeath` read is honest for a combat kill. */
function killImpl(target: Stuff, cause: string): void {
  if (MixinApi.isVitals(target) && !target.getCauseOfDeath()) {
    target.setCauseOfDeath(cause);
  }
  if (MixinApi.isOrganism(target)) target.setLifecycleState("dead");
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
      if (killer) recordDeath(session, killer, s.combatant);
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

/* ═══════════════════ Build 2 — consequence & progression ═══════════════════ */

/** The combat Disciplines credit accrues to (seeded as data). */
const MELEE_DISCIPLINE = "melee-combat";
const BLADES_DISCIPLINE = "blades";

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

/** Game-time seconds witness, tolerant of a disconnected clock. */
function gameNow(): number {
  try {
    return WorldClockApi.getNow().rawValue();
  } catch {
    return 0;
  }
}

/** Fire-and-forget append to the blame ledger — never blocks the beat. */
function noteAttribution(fields: CombatAttributionFields): void {
  void recordAttributionImpl(fields).catch(() => {
    /* the ledger is best-effort; a write failure never breaks a fight */
  });
}

async function recordAttributionImpl(
  fields: CombatAttributionFields,
): Promise<void> {
  const ev = new CombatAttributionEvent();
  ev.kind = fields.kind;
  ev.sessionId = fields.sessionId;
  ev.initiator = fields.initiator;
  ev.opponent = fields.opponent;
  ev.victim = fields.victim ?? "";
  ev.killer = fields.killer ?? "";
  ev.lethality = fields.lethality;
  ev.stopCondition = fields.stopCondition;
  ev.consented = fields.consented;
  ev.sentient = fields.sentient;
  ev.locality = fields.locality ?? null;
  ev.at = fields.at ?? gameNow();
  ev.realAt = fields.realAt ?? Date.now();
  await ev.save();
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
 * lawful-vs-crime without a second lookup. */
function recordDeath(
  session: CombatSession,
  killer: Stuff,
  victim: Stuff,
): void {
  const terms = termsFor(session, killer, victim);
  noteAttribution({
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
  });
}

async function blameForImpl(victimId: string): Promise<BlameVerdict | null> {
  const rows = await CombatAttributionEvent.find<CombatAttributionEvent>({
    victim: victimId,
  });
  return CombatAttributionEvent.deriveBlame(rows);
}

/* ───────────────────────── two-stage death (coup) ───────────────────────── */

/**
 * Begin the stage-2 coup. Deferred one tick (`schedule(0)`) so the
 * just-resolved session finishes tearing down — freeing the executioner's
 * `body` slot — before the coup claims it.
 */
function beginCoup(
  session: CombatSession,
  executioner: Stuff,
  victim: Stuff,
): void {
  ScheduleApi.schedule(0, () => startCoup(session, executioner, victim));
}

function startCoup(
  session: CombatSession,
  executioner: Stuff,
  victim: Stuff,
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
    onComplete: () => completeCoup(session, executioner, victim),
    onAbort: () => abortCoup(session, executioner, victim),
  });
  const started = SchedulerApi.start(coup);
  if (!started.ok) return;
  CombatNarration.narrateCoupTelegraph(executioner, victim);
}

function completeCoup(
  session: CombatSession,
  executioner: Stuff,
  victim: Stuff,
): void {
  // Re-check: the victim may have been dragged clear or already died.
  if (!coupEligible(executioner, victim)) return;
  killImpl(victim, "put to death");
  recordDeath(session, executioner, victim);
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
  if (
    MixinApi.isOrganism(executioner) &&
    executioner.getLifecycleState() === "dead"
  ) {
    return false;
  }
  if (MixinApi.isOrganism(victim) && victim.getLifecycleState() === "dead") {
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

  const suppressAt = Math.round(
    dial(AppSettingKeys.combatFocusFireSuppressRecoveryAt, 2),
  );
  if (incoming.length >= suppressAt) {
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
function mintAssessSignature(actor: Stuff): void {
  void AdvancementApi.recordDeed(actor, {
    discipline: MELEE_DISCIPLINE,
    difficulty: "standard",
    outcome: "success",
  }).catch(() => {});
}

function assessImpl(actor: Stuff, _target: Stuff): CombatAssessResult {
  const session = sessionForImpl(actor);
  if (!session) return { ok: false, reason: "not-in-combat" };
  const oppState = session.opponentState(actor);
  if (!oppState) return { ok: false, reason: "no-target" };
  // Costs the actor their next exchange (the real opportunity cost).
  const st = session.getState(actor);
  if (st) st.queuedGambit = "assess";
  mintAssessSignature(actor);
  const opp = oppState.combatant;
  // The read is fogged by the actor's own sharpness (poker, not slots): a
  // dull reader under-reads the opponent's poise and mistakes a feint for a
  // real opening; a sharp reader sees the true band and the feint's tell.
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

