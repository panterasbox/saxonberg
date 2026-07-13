/**
 * CombatSession — the live 1v1 fight, a `SustainedEngagement`
 * state-container (the `DialogueConversation` structural twin).
 *
 * Like a dialogue, a fight spans many beats but a command frame dies
 * after one turn, so the fight state lives on an engagement in the
 * `SchedulerRegistry` active set — **not** on the `Creature`, not on a
 * controller. It is a plain class (never `StuffApi.create`d), holds the
 * two combatants + their `CombatTerms` + each side's transient
 * {@link CombatantState} (poise, tempo, flags), and drives itself on a
 * fixed game-time cadence via one recurring `ScheduledEmission` (the
 * `RespirationDrain` precedent).
 *
 * Two-sided, exactly like a conversation: this session holds the `body`
 * slot on combatant A, and a companion {@link CombatPartnerHold} holds
 * `body` on combatant B, so both are genuinely occupied (movement
 * vetoed) and either being destroyed/aborted tears the whole fight down
 * through the mutual-idempotent-cancel property.
 *
 * This class is deliberately **thin**: it owns lifecycle + state, and
 * delegates every *rule* (exchange resolution, poise mutation, narration,
 * resolution) to the gated `CombatApi`/`CombatLogic` pair — the sole
 * entry to gambit-resolution, so the load-bearing curves live in one
 * hot-reloadable place. `tick()` is the only per-beat entry; it forwards
 * to `CombatApi.advance(this)`.
 */

import type { Stuff } from "../stuff/Stuff";
import type { Engaged, EngagementSlot } from "../activity/Engaged";
import type {
  ScheduledEmission,
  SustainedEngagement,
} from "../../api/scheduler";
import { SchedulerApi } from "../../api/scheduler";
import { CombatApi } from "../../api/combat";
import type { AbortReason } from "@saxonberg/types";
import type { CombatTerms } from "./CombatTerms";
import type { Poise } from "./Poise";
import type { Tempo } from "./Tempo";
import type { CombatFlags } from "./CombatFlags";

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

export const COMBAT_SESSION_TYPE = "combat-session";
export const COMBAT_PARTNER_TYPE = "combat-partner";

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
  /** Combat-brain module path when brain-driven; null for player-driven. */
  readonly brainPath: string | null;
  /** Brain config blob (from the combatant's combat behavior spec). */
  readonly brainConfig: Record<string, unknown>;
  /** Weapon-balance tempo hook (neutral 1.0); re-read when gear changes. */
  balanceFactor: number;
  /** Set when the combatant loses the poise contest (incapacitated). */
  down: boolean;
}

export class CombatSession implements SustainedEngagement {
  engagementId = "";
  readonly type = COMBAT_SESSION_TYPE;
  readonly actor: Stuff & Engaged;
  startedAt = 0;
  readonly slots: ReadonlySet<EngagementSlot> = new Set(COMBAT_SLOTS);
  readonly interruptibleBy: ReadonlySet<AbortReason> = new Set<AbortReason>();
  readonly cancelable = true;
  readonly emissions: readonly ScheduledEmission[];

  private readonly a: CombatantState;
  private readonly b: CombatantState;
  private readonly terms: CombatTerms;
  private partner: SustainedEngagement | null = null;
  private active = true;
  private beat = 0;
  private resolution: CombatResolution | null = null;

  constructor(
    a: CombatantState,
    b: CombatantState,
    terms: CombatTerms,
    tickMs: number,
  ) {
    this.a = a;
    this.b = b;
    this.terms = terms;
    this.actor = a.combatant;
    // One recurring beat. The closure is pinned at construction (the
    // activity.md caveat); it stays a thin delegate so the rules in
    // CombatLogic remain hot-reloadable.
    this.emissions = [{ intervalMs: tickMs, event: () => this.tick() }];
  }

  /* ───────────────── Engagement contract ───────────────── */

  onStart(): void {
    this.startedAt = Date.now();
  }

  /**
   * The single teardown path — any cancel/terminate (graceful resolve,
   * disconnect, host-destroyed, presence loss). Releases the partner
   * hold and stops the loop. Idempotent.
   */
  onAbort(_reason: AbortReason): void {
    this.active = false;
    if (this.partner) SchedulerApi.cancel(this.partner, "cancelled");
  }

  getHost(): Stuff | null {
    return this.actor;
  }

  /* ───────────────── wiring ───────────────── */

  setPartner(partner: SustainedEngagement): void {
    this.partner = partner;
  }

  /** Launch is implicit — the recurring emission starts on registration. */

  /* ───────────────── the beat ───────────────── */

  /** One narration beat. Delegates all rules to the gated logic. */
  tick(): void {
    if (!this.active) return;
    CombatApi.advance(this);
  }

  /* ───────────────── state surface (for CombatLogic) ───────────────── */

  getStates(): readonly [CombatantState, CombatantState] {
    return [this.a, this.b];
  }

  getState(combatant: Stuff): CombatantState | null {
    if ((combatant as Stuff) === (this.a.combatant as Stuff)) return this.a;
    if ((combatant as Stuff) === (this.b.combatant as Stuff)) return this.b;
    return null;
  }

  opponentState(combatant: Stuff): CombatantState | null {
    if ((combatant as Stuff) === (this.a.combatant as Stuff)) return this.b;
    if ((combatant as Stuff) === (this.b.combatant as Stuff)) return this.a;
    return null;
  }

  getTerms(): CombatTerms {
    return this.terms;
  }

  getBeat(): number {
    return this.beat;
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
   * CombatLogic when a stop-condition is met.
   */
  resolve(outcome: CombatResolution): void {
    if (this.resolution) return;
    this.resolution = outcome;
    this.end("combat-resolved");
  }

  /** End from an external trigger (partner side); idempotent. */
  endExternally(): void {
    this.end("cancelled");
  }

  private end(reason: AbortReason): void {
    if (!this.active) return;
    SchedulerApi.cancel(this, reason);
  }
}

/**
 * The combatant-B side companion hold: occupies `body` on the other
 * combatant so the fight is observable from their side and they are
 * genuinely occupied. Carries no logic — the {@link CombatSession}
 * drives everything; this just holds the slot and tears the fight down
 * if its combatant is destroyed first (idempotent).
 */
export class CombatPartnerHold implements SustainedEngagement {
  engagementId = "";
  readonly type = COMBAT_PARTNER_TYPE;
  readonly actor: Stuff & Engaged;
  startedAt = 0;
  readonly slots: ReadonlySet<EngagementSlot> = new Set(COMBAT_SLOTS);
  readonly interruptibleBy: ReadonlySet<AbortReason> = new Set<AbortReason>();
  readonly cancelable = true;
  private readonly session: CombatSession;

  constructor(combatant: Stuff & Engaged, session: CombatSession) {
    this.actor = combatant;
    this.session = session;
  }

  onStart(): void {
    this.startedAt = Date.now();
  }

  onAbort(_reason: AbortReason): void {
    this.session.endExternally();
  }

  getHost(): Stuff | null {
    return this.actor;
  }

  /** The fight this hold belongs to (so the B-side combatant can reach
   * its session from its own engagement). */
  getSession(): CombatSession {
    return this.session;
  }
}

// Register both lifecycle classes at module load (the HMR seam, mirroring
// RespirationDrain / DialogueConversation — a reload re-runs this and
// overwrites the entries).
SchedulerApi.registerActivity(COMBAT_SESSION_TYPE, CombatSession);
SchedulerApi.registerActivity(COMBAT_PARTNER_TYPE, CombatPartnerHold);
