/**
 * Coup — the stage-2 killing stroke, a slow, telegraphed, interruptible
 * `DurativeActivity` (the `ManualBuildStep` / `BehaviorBeat` precedent).
 *
 * Build 2 makes death **two-stage**: winning the poise contest only
 * *defeats* a sentient opponent (the fight resolves at `incapacitation`).
 * Killing a downed sentient is a separate, deliberate act — a coup de
 * grâce that takes real game-time to deliver, announces itself, and can
 * be **stopped by any present party** (or the executioner's own second
 * thoughts) before it lands. A beast, by contrast, is finished by the
 * winning blow itself (the cull skips this whole activity).
 *
 * The activity holds the executioner's `body` slot for
 * `combat.coupSeconds` game-time. On completion it fires `onComplete`
 * (the kill + attribution + narration, built by `CombatLogic`); on abort
 * — a cancel from the `intervene` verb, the executioner walking away, the
 * host destroyed — it fires `onAbort` (the victim is spared) and the
 * killing stroke never lands. The victim is carried as a live ref so the
 * completion can re-check they are still present and still alive.
 */

import type { AbortReason } from "@saxonberg/types";
import type { Stuff } from "../stuff/Stuff";
import type { EngagementSlot, Engaged } from "../activity/Engaged";
import type { DurativeActivity } from "../../api/scheduler";
import { SchedulerApi } from "../../api/scheduler";

/**
 * Combat's coup-interruption reason, colocated with the activity that
 * fires it (the `CombatSession` `combat-resolved` precedent — combat
 * augments the reason vocabulary from its own modules).
 */
declare module "@saxonberg/types" {
  interface AbortReasonRegistry {
    "combat-intervened": true;
  }
}

export const COMBAT_COUP_TYPE = "combat-coup" as const;

/** The whole `body` — you can't do anything else while delivering it. */
const COUP_SLOTS: readonly EngagementSlot[] = ["body"];

export interface CoupOptions {
  /** The party delivering the killing stroke (holds the slot). */
  executioner: Stuff & Engaged;
  /** The downed party about to be killed (a live ref, re-checked). */
  victim: Stuff & Engaged;
  /** Game-time window before the stroke lands (ms). */
  durationMs: number;
  /** The kill + attribution + narration, run at completion. */
  onComplete: () => void;
  /** The victim-is-spared path, run on any interruption. */
  onAbort: (reason: AbortReason) => void;
}

export class Coup implements DurativeActivity {
  engagementId = "";
  readonly type = COMBAT_COUP_TYPE;
  readonly actor: Stuff & Engaged;
  startedAt = 0;
  readonly slots: ReadonlySet<EngagementSlot> = new Set(COUP_SLOTS);
  readonly interruptibleBy: ReadonlySet<AbortReason> = new Set<AbortReason>();
  readonly cancelable = true;
  readonly duration: number;
  readonly replaceableBy: readonly string[] = [];

  private readonly victim: Stuff & Engaged;
  private readonly _onComplete: () => void;
  private readonly _onAbort: (reason: AbortReason) => void;

  constructor(opts: CoupOptions) {
    this.actor = opts.executioner;
    this.victim = opts.victim;
    this.duration = opts.durationMs;
    this._onComplete = opts.onComplete;
    this._onAbort = opts.onAbort;
  }

  /** The party about to be killed — the match key the `intervene` verb
   * uses (a coup is interruptible via either the victim or the actor). */
  getVictim(): Stuff {
    return this.victim as unknown as Stuff;
  }

  onStart(): void {
    this.startedAt = Date.now();
  }

  onComplete(): void {
    this._onComplete();
  }

  onAbort(reason: AbortReason): void {
    this._onAbort(reason);
  }

  getHost(): Stuff | null {
    return this.actor as unknown as Stuff;
  }
}

// Register at module load (the HMR seam, mirroring ManualBuildStep).
SchedulerApi.registerActivity(COMBAT_COUP_TYPE, Coup);
