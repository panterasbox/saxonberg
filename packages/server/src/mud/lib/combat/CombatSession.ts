/**
 * CombatSession — the live melee, a plain N-participant state container.
 *
 * Cycle 1 modelled a fight as a two-sided `SustainedEngagement`: the
 * session *was* combatant A's `body` engagement and carried the beat on
 * A's game-time `ScheduledEmission`. That shape can't survive a melee —
 * A can die or flee first, orphaning both the tick and the container. So
 * cycle 2 makes the session a plain object:
 *
 *   - a `Map<Stuff, CombatantState>` of every participant's transient
 *     fight state (poise / tempo / flags), keyed by the combatant;
 *   - a {@link CombatGraph} of directed who-attacks-whom edges;
 *   - a per-participant {@link CombatParticipantHold} occupying `body`
 *     (so *every* combatant is genuinely occupied — movement vetoed — and
 *     any one being destroyed/aborted tears its own participation down
 *     through the mutual-idempotent-cancel property, never the whole
 *     fight unless it empties a side);
 *   - its own **real-time** beat via `ScheduleApi.recurring` (the beat no
 *     longer rides any participant's emissions — so a participant leaving
 *     never orphans the tick, and the cadence is pace-independent of
 *     world-clock scale, the coupling the 1v1 live demo exposed). Bleed
 *     stays game-time: harm reconciles on read, untouched here.
 *
 * The session is **never** a scheduler engagement and is **never**
 * `StuffApi.create`d — it is a transient plain class. It owns lifecycle +
 * state and delegates every *rule* (exchange resolution, poise mutation,
 * narration, resolution) to the gated `CombatApi`/`CombatLogic` pair.
 * `tick()` is the only per-beat entry; it forwards to `CombatApi.advance`.
 */

import type { Stuff } from "../stuff/Stuff";
import type { Engaged, EngagementSlot } from "../activity/Engaged";
import type { SustainedEngagement } from "../../api/scheduler";
import { SchedulerApi } from "../../api/scheduler";
import { ScheduleApi, type ScheduleHandle } from "../../api/schedule";
import { SecurityApi } from "../../api/security";
import { CombatApi } from "../../api/combat";
import type { AbortReason } from "@saxonberg/types";
import { CombatGraph } from "./CombatGraph";
import type { CombatTerms } from "./CombatTerms";
import type { Poise } from "./Poise";
import type { Tempo } from "./Tempo";
import type { CombatFlags } from "./CombatFlags";
import type { WeaponSwitch } from "./WeaponSwitch";
import type { CompetenceBandName } from "../advancement/CompetenceBand";

/**
 * Combat's own `AbortReasonRegistry` augmentation — the reasons the
 * combat subsystem fires, colocated here so the declaration merge lands
 * whenever anything in the subsystem imports this module (the
 * `Engaged.ts` framework-reasons precedent; combat augments from its own
 * module rather than inventing a parallel teardown).
 */
declare module "@saxonberg/types" {
  interface AbortReasonRegistry {
    "combat-resolved": true;
  }
}

export const COMBAT_PARTICIPANT_TYPE = "combat-participant";

/** Combat occupies the whole `body` (you can't wander off mid-fight). */
const COMBAT_SLOTS: readonly EngagementSlot[] = ["body"];

/** How a fight ended — extends the resolution vocabulary. */
export type CombatResolution =
  | "first-blood"
  | "yield"
  | "incapacitation"
  | "death"
  | "draw"
  | "disengage";

/**
 * One combatant's transient fight state. Evaporates with the session;
 * nothing here touches the `Creature`.
 */
export interface CombatantState {
  readonly combatant: Stuff & Engaged;
  readonly poise: Poise;
  readonly tempo: Tempo;
  readonly flags: CombatFlags;
  /** The gambit verb the combatant intends next exchange (player intent). */
  queuedGambit: string | null;
  /**
   * The session beat at which this combatant last offered a truce
   * (`fight break`), or null. A standing offer counts toward dissolving a
   * threat edge only while fresh (current + next beat); an opponent's
   * reciprocated fresh offer dissolves the edge between them. Transient,
   * like every other field here. See docs/subsystems/combat.md.
   */
  breakOfferedBeat: number | null;
  /**
   * An in-progress armament change (the hand-slot economy): while set and
   * not ready, the combatant's instrument resolves to nothing (guard down,
   * can't strike). The session advances it each beat and performs the grip
   * swap when it completes. Null when not switching.
   */
  weaponSwitch: WeaponSwitch | null;
  /** Combat-brain module path when brain-driven; null for player-driven. */
  readonly brainPath: string | null;
  /** Brain config blob (from the combatant's combat behavior spec). */
  readonly brainConfig: Record<string, unknown>;
  /** Weapon-balance tempo hook (neutral 1.0); re-read when gear changes. */
  balanceFactor: number;
  /**
   * The combatant's competence band in this fight's discipline, snapshotted
   * synchronously at open/join (the async `AdvancementApi.bandFor` can't be
   * read mid-beat, and reading it once keeps a single session deterministic).
   * Feeds `Sharpness` → the read-fog + poise-recovery. Defaults `untrained`
   * for bare/test/gym/NPC paths that open without a controller.
   */
  competenceBand: CompetenceBandName;
  /** Memoized sharpness (from `competenceBand`); null until first resolved. */
  sharpness: number | null;
  /** Set when the combatant loses the poise contest (incapacitated). */
  down: boolean;
  /**
   * The per-fight alignment key (`PartyApi.sideOf`), frozen at
   * session-open / join. Two participants are allies iff their `side`
   * strings are equal. `''` until sides are wired (cycle-2 Phase 4).
   */
  side: string;
  /**
   * The combatant that last landed a blow on this participant — names the
   * killing edge for an attrition/bleed-out death that has no single
   * striker at the moment of resolution. Null until first struck.
   */
  lastStruckBy: (Stuff & Engaged) | null;
  /**
   * The foe this combatant's participation began against (stamped at
   * open/join): the target they typed `attack` at — or, drawn in, the
   * foe who pulled them into the fight. Inert under most formations;
   * Focus Fire reads the **captain's** entry as the side's called target
   * (the captain leads by attacking — derived, not verb-called; a
   * drawn-in captain's "call" is the foe who came at them). Null only on
   * bare paths that never stamped it.
   */
  deliberateTarget: (Stuff & Engaged) | null;
  /**
   * Who armed the live opening on THIS combatant's poise (the exchange
   * whose crossing set the window), or null. Pure credit bookkeeping —
   * the window itself stays ownerless and ally-exploitable; when an
   * exploit by a *different, allied* attacker cashes it, the armer minted
   * a `command` deed (the master's created-openings). Restamped on each
   * fresh crossing, cleared on consumption.
   */
  openingArmedBy: (Stuff & Engaged) | null;
  /**
   * The poise band as of the last `onPoiseBandChanged` comparison (the
   * cross-beat baseline). Null until the first beat's dispatch stamps
   * it (that beat falls back to its own top-of-beat read — byte-
   * identical to the snapshot-only shape for anything that mutates
   * poise mid-beat). Persisting the baseline across beats is what lets
   * a **between-beat** external mutation (`CombatApi.influence`)
   * surface through the existing per-beat net comparison on the
   * following beat — no new hook.
   */
  bandSeen: string | null;
}

export class CombatSession {
  readonly sessionId: string;

  private readonly states = new Map<Stuff, CombatantState>();
  private readonly holds = new Map<Stuff, CombatParticipantHold>();
  private readonly graph = new CombatGraph();
  private readonly tickMs: number;
  private terms: CombatTerms;
  private tickHandle: ScheduleHandle | null = null;
  private active = true;
  private beat = 0;
  private resolution: CombatResolution | null = null;
  private bloodDrawn = false;

  constructor(terms: CombatTerms, tickMs: number) {
    this.terms = terms;
    this.tickMs = tickMs;
    this.sessionId = SecurityApi.uuid();
  }

  /* ───────────────── membership ───────────────── */

  /** Register a participant + its `body` hold. The hold is started by the
   * caller (`CombatLogic`), which owns the busy/conflict decision. */
  addParticipant(state: CombatantState): CombatParticipantHold {
    this.states.set(state.combatant, state);
    this.graph.addNode(state.combatant);
    const hold = new CombatParticipantHold(state.combatant, this);
    this.holds.set(state.combatant, hold);
    return hold;
  }

  /**
   * Remove a participant (departed / dead / disengaged): drop its state,
   * its graph node (and every edge touching it), and release its hold. If
   * that empties the fight — one or zero combatants left — dissolve it.
   * Idempotent.
   */
  removeParticipant(combatant: Stuff): void {
    const hold = this.holds.get(combatant);
    this.states.delete(combatant);
    this.holds.delete(combatant);
    this.graph.removeNode(combatant);
    if (hold) SchedulerApi.cancel(hold, "combat-resolved");
    if (this.states.size <= 1 && this.active) this.dissolve();
  }

  /** The `body` hold for a participant (so a joiner can be started). */
  getHold(combatant: Stuff): CombatParticipantHold | undefined {
    return this.holds.get(combatant);
  }

  /**
   * Adopt a participant from another session (merge): take over its
   * already-started `body` hold by repointing it at this session. The
   * hold is NOT restarted (it never left `body`); only its owning session
   * changes, so its `onAbort` now removes it from here.
   */
  adoptParticipant(state: CombatantState, hold: CombatParticipantHold): void {
    this.states.set(state.combatant, state);
    this.holds.set(state.combatant, hold);
    this.graph.addNode(state.combatant);
    hold.reparent(this);
  }

  /**
   * Tear down the beat + mark inactive WITHOUT cancelling the participant
   * holds — used by the losing side of a merge, whose holds have already
   * been re-homed onto the surviving session (cancelling them would strip
   * `body` from combatants who are still fighting). Idempotent.
   */
  dissolveKeepingHolds(): void {
    if (!this.active) return;
    this.active = false;
    if (this.tickHandle) {
      ScheduleApi.cancel(this.tickHandle);
      this.tickHandle = null;
    }
    this.holds.clear();
    this.states.clear();
  }

  /* ───────────────── the beat ───────────────── */

  /** Start the real-time beat. Idempotent. */
  startTick(): void {
    if (this.tickHandle) return;
    this.tickHandle = ScheduleApi.recurring(this.tickMs, () => this.tick());
  }

  /** One narration beat. Delegates all rules to the gated logic. */
  tick(): void {
    if (!this.active) return;
    CombatApi.advance(this);
  }

  /* ───────────────── state surface (for CombatLogic) ───────────────── */

  getStates(): readonly CombatantState[] {
    return [...this.states.values()];
  }

  getCombatants(): readonly (Stuff & Engaged)[] {
    return this.getStates().map((s) => s.combatant);
  }

  getState(combatant: Stuff): CombatantState | null {
    return this.states.get(combatant) ?? null;
  }

  /**
   * The other participant in a 1v1 (the degenerate melee). Returns null
   * when the fight is not exactly two-sided — melee code paths (cycle-2
   * Phase 4+) drive off the graph and `areAllied`, not this.
   */
  opponentState(combatant: Stuff): CombatantState | null {
    if (this.states.size !== 2) return null;
    for (const s of this.states.values()) {
      if ((s.combatant as Stuff) !== (combatant as Stuff)) return s;
    }
    return null;
  }

  getGraph(): CombatGraph {
    return this.graph;
  }

  getTerms(): CombatTerms {
    return this.terms;
  }

  getBeat(): number {
    return this.beat;
  }

  /** Whether the first trauma of the fight has landed (the first-blood
   * roar fires once; the beat-intensity arc reads this). */
  hasDrawnBlood(): boolean {
    return this.bloodDrawn;
  }

  /** Mark first-blood drawn. Idempotent; returns true only on the crossing
   * (so the caller can roar exactly once). */
  markBloodDrawn(): boolean {
    if (this.bloodDrawn) return false;
    this.bloodDrawn = true;
    return true;
  }

  advanceBeat(): number {
    return ++this.beat;
  }

  isActive(): boolean {
    return this.active;
  }

  getResolution(): CombatResolution | null {
    return this.resolution;
  }

  /**
   * Record the outcome and end the fight (idempotent). Called by
   * CombatLogic when a stop-condition is met. Dissolving cancels the tick
   * and every remaining participant hold.
   */
  resolve(outcome: CombatResolution): void {
    if (this.resolution) return;
    this.resolution = outcome;
    this.dissolve();
  }

  /**
   * Tear the whole fight down: stop the beat and release every remaining
   * `body` hold. Idempotent — a hold's own `onAbort` calls back into
   * `removeParticipant`, but the emptied-map guard makes re-entry a no-op.
   */
  dissolve(): void {
    if (!this.active) return;
    this.active = false;
    if (this.tickHandle) {
      ScheduleApi.cancel(this.tickHandle);
      this.tickHandle = null;
    }
    for (const hold of [...this.holds.values()]) {
      SchedulerApi.cancel(hold, "combat-resolved");
    }
    this.holds.clear();
  }
}

/**
 * The per-participant companion hold: occupies `body` on one combatant so
 * they are genuinely engaged (movement vetoed) and the fight is
 * observable from their side. Carries no logic — the {@link CombatSession}
 * drives everything; this holds the slot and, if its combatant is
 * destroyed/aborted first, removes just that participant from the fight
 * (which dissolves the whole session only if a side empties).
 */
export class CombatParticipantHold implements SustainedEngagement {
  engagementId = "";
  readonly type = COMBAT_PARTICIPANT_TYPE;
  readonly actor: Stuff & Engaged;
  startedAt = 0;
  readonly slots: ReadonlySet<EngagementSlot> = new Set(COMBAT_SLOTS);
  readonly interruptibleBy: ReadonlySet<AbortReason> = new Set<AbortReason>();
  readonly cancelable = true;
  private session: CombatSession;

  constructor(combatant: Stuff & Engaged, session: CombatSession) {
    this.actor = combatant;
    this.session = session;
  }

  /** Repoint this hold at a new session (merge) — the combatant keeps
   * holding `body`; only which fight owns it changes. */
  reparent(session: CombatSession): void {
    this.session = session;
  }

  onStart(): void {
    this.startedAt = Date.now();
  }

  onAbort(_reason: AbortReason): void {
    // The combatant left the fight (destroyed / disconnected / disengaged
    // / dissolve). Remove just this participant; the session dissolves
    // itself only if a side empties. Guarded idempotent.
    this.session.removeParticipant(this.actor);
  }

  getHost(): Stuff | null {
    return this.actor;
  }

  /** The fight this hold belongs to (so a combatant reaches its session
   * from its own engagement — the uniform `sessionFor` lookup). */
  getSession(): CombatSession {
    return this.session;
  }
}

