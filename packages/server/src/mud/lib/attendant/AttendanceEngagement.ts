/**
 * AttendanceEngagement — being attended at a service point, modelled as a
 * `SustainedEngagement` occupying the **server's** `attention` slot.
 *
 * "One at a time" *falls out of the slot*: a server has one `attention` slot,
 * so it can hold exactly one attendance — a second customer must wait. The
 * customer side is deliberately NOT slot-locked (the §2 keystone: you're free
 * while you wait and while you're briefly served — this is a MUD, service is
 * async); the exclusive resource is the *server's attention*, and this
 * engagement IS the lease on it.
 *
 * The lease carries a real-time recency stamp (`lastActivityMs`) that the
 * anti-grief sweep reads: an idle hold is aborted with `service-idle` and the
 * next customer pulled up (see {@link AttendantLogic}). `onAbort` is the single
 * teardown path — it tells the point to drop this lease and poke the next in
 * line, whatever the reason (idle sweep, completion, linkdead, host-destroyed).
 *
 * Instant venues (attendDurationMs 0 — the bar) never create one of these: the
 * service act completes synchronously, holding no slot. Only *durative* service
 * (a formal counter, a loan talk) holds the attention.
 */

import type { SustainedEngagement } from "../../api/scheduler";
import type { EngagementSlot } from "../activity/Engaged";
import type { Engaged } from "../activity/Engaged";
import type { AbortReason } from "@saxonberg/types";
import type { Stuff } from "../stuff/Stuff";
import type { Attendant } from "./Attendant";

declare module "@saxonberg/types" {
  interface AbortReasonRegistry {
    /** The lease went idle and the anti-grief sweep revoked it. */
    "service-idle": true;
    /** The service act finished and released the server. */
    "service-complete": true;
    /** The customer went linkdead; the lease drops instantly. */
    "service-linkdead": true;
  }
}

/** The activity type key registered with the scheduler. */
export const ATTENDANCE_TYPE = "attendant-attendance";

const ATTENDANCE_SLOTS: readonly EngagementSlot[] = ["attention"];

export class AttendanceEngagement implements SustainedEngagement {
  engagementId = "";
  readonly type = ATTENDANCE_TYPE;
  readonly actor: Stuff & Engaged;
  startedAt = 0;
  readonly slots = new Set<EngagementSlot>(ATTENDANCE_SLOTS);
  readonly interruptibleBy = new Set<AbortReason>();
  readonly cancelable = true;

  /** The service point that granted this lease. */
  private readonly point: Stuff & Attendant;
  /** The customer being attended (a durable templatePath). */
  readonly customerKey: string;
  /** Real-time recency — bumped by every service act; read by the idle sweep. */
  private lastActivityMs: number;
  private ended = false;

  constructor(
    server: Stuff & Engaged,
    point: Stuff & Attendant,
    customerKey: string,
    nowMs: number,
  ) {
    this.actor = server;
    this.point = point;
    this.customerKey = customerKey;
    this.lastActivityMs = nowMs;
  }

  onStart(): void {
    this.startedAt = Date.now();
  }

  onAbort(_reason: AbortReason): void {
    // The single teardown path — idempotent. Tell the point to drop this lease
    // and pull up the next waiting customer.
    if (this.ended) return;
    this.ended = true;
    this.point._onLeaseEnded(this.customerKey);
  }

  /** The server's attention is held here — its destruction tears the lease down. */
  getHost(): Stuff | null {
    return this.actor as unknown as Stuff;
  }

  /** Bump the recency stamp (a service act happened). */
  touch(nowMs: number): void {
    this.lastActivityMs = nowMs;
  }

  /** Real-time idle since the last service act. */
  idleMs(nowMs: number): number {
    return nowMs - this.lastActivityMs;
  }
}

