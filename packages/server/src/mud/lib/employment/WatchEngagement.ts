/**
 * ⭐⭐ WatchEngagement — **standing watch**, and the first engagement in
 * the tree that is PURE OCCUPANCY.
 *
 * Every other `SustainedEngagement` is a thing being done that happens to
 * take time — a craft, an attendance, a build step. This one is the time
 * itself: nothing is produced, nothing is transformed, and the whole
 * deliverable is that the actor was here and could not be elsewhere.
 *
 * ⚠⚠ **That is not a cheat, it is what a guard sells.** The engine cannot
 * verify that you *protected* anything — whether a theft was deterred is
 * counterfactual, and "attentive" is not a modelled fact. What it can
 * verify is presence, for a term, with your hands full of nothing else.
 * Somebody standing in the door is the product; quiet is the hoped-for
 * consequence, not the deliverable. A guard who served the full watch and
 * was robbed blind still gets paid, for the same reason a courier is paid
 * on arrival rather than on the client being pleased.
 *
 * ⭐ **The slots ARE the contract.** It claims `body`, `hands` and
 * `attention` and deliberately leaves `voice` free: a guard who cannot
 * talk to anybody is a bollard, and the one thing a guard most obviously
 * does is tell people things. Everything else — hewing, hauling,
 * crafting, fighting a fight you started — is refused by the engagement
 * conflict rather than by a rule somebody had to write, which is the
 * whole point of expressing the job in slots.
 *
 * Accrual is at RELEASE, in game-seconds, onto the contract's own record
 * (`ContractApi.noteWatch`) — the capture-at-start / credit-at-completion
 * shape a repair already uses. A stint abandoned early still banks what
 * it served: leaving your post early is a short watch, not a void one.
 */

import type { SustainedEngagement } from "../../api/scheduler";
import type { EngagementSlot, Engaged } from "../activity/Engaged";
import type { AbortReason } from "@saxonberg/types";
import type { Stuff } from "../stuff/Stuff";
import { ContractApi } from "../../api/contract";
import { WorldClockApi } from "../../api/worldclock";

declare module "@saxonberg/types" {
  interface AbortReasonRegistry {
    /** The watcher stood down (or was moved, or logged out). */
    "watch-ended": true;
  }
}

/** The activity type key registered with the scheduler. */
export const WATCH_TYPE = "employment-watch";

/**
 * ⭐ `body` + `hands` + `attention`, and **not `voice`**. See the class
 * doc: a guard who cannot speak is a bollard.
 */
const WATCH_SLOTS: readonly EngagementSlot[] = ["body", "hands", "attention"];

export class WatchEngagement implements SustainedEngagement {
  engagementId = "";
  readonly type = WATCH_TYPE;
  readonly actor: Stuff & Engaged;
  startedAt = 0;
  readonly slots = new Set<EngagementSlot>(WATCH_SLOTS);
  readonly interruptibleBy = new Set<AbortReason>();
  readonly cancelable = true;

  /** The gig this watch is served against. */
  readonly contractId: string;
  /** The place being watched (a durable `templatePath`). */
  readonly placePath: string;
  /** Game-time seconds at which the stint began. */
  private startedGameSec = 0;
  private ended = false;

  constructor(
    actor: Stuff & Engaged,
    contractId: string,
    placePath: string,
  ) {
    this.actor = actor;
    this.contractId = contractId;
    this.placePath = placePath;
  }

  onStart(): void {
    this.startedAt = Date.now();
    this.startedGameSec = nowGameSec();
  }

  /**
   * The single teardown path — idempotent, and it BANKS. Every way a
   * watch can end (standing down, being moved, going linkdead, the host
   * being destroyed) comes through here, so there is no route that
   * silently loses a served stint.
   */
  onAbort(_reason: AbortReason): void {
    if (this.ended) return;
    this.ended = true;
    const served = Math.max(0, nowGameSec() - this.startedGameSec);
    if (served <= 0) return;
    void ContractApi.noteWatch(this.contractId, this.actor, served).catch(
      () => {},
    );
  }

  /** The watcher holds the slots; their destruction tears the watch down. */
  getHost(): Stuff | null {
    return this.actor as unknown as Stuff;
  }

  /** Game-seconds served so far, for the read-out. */
  servedSec(): number {
    return Math.max(0, nowGameSec() - this.startedGameSec);
  }
}

/** Game-time seconds, or 0 when no world clock is running. */
function nowGameSec(): number {
  try {
    return WorldClockApi.getNow().rawValue();
  } catch {
    return 0;
  }
}
