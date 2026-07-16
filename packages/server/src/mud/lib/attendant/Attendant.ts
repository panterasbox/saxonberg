/**
 * AttendantMixin — the universal storefront-attention capability, hosted on a
 * service-point `Thing` fixture (the `BankMixin`/`Menu` precedent: a Location's
 * own contributions don't reach its occupants, so the counter is a fixture).
 *
 * The point owns the **queue** and the active **leases**; a *server* (an
 * on-shift employee, resolved via employment) attends one customer at a time,
 * the rest wait in an order and are *poked* when a server frees — never frozen
 * (the §2 keystone). Being-attended is an {@link AttendanceEngagement} on the
 * server's attention (durative venues) or a synchronous act (instant venues);
 * either way the exclusive resource is the server, guarded by the lease
 * eviction in {@link AttendantLogic}.
 *
 * Config axes (authored on the seed) let venues differ on the one substrate:
 * **discipline** (reception / line / take-a-number / scrum / appointment),
 * **serverPositionKeys** (which employment positions attend), **staffingPolicy**
 * (close / self-service when unstaffed), **attendDurationMs** (0 = instant),
 * and the diegetic **skin** strings. The orchestration lives in AttendantLogic;
 * this mixin is the state + the "am I attended here?" gate.
 */

import type { MixinConstructor } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import type { AttendanceEngagement } from "./AttendanceEngagement";

/** The queue disciplines — how the order is decided + what forfeits a place. */
export type ServiceDiscipline =
  | "reception" // recognized/newcomers received (priority skip); the bank
  | "line" // FIFO; presence holds your place
  | "take-a-number" // a Ticket holds your place; wander off, come back
  | "scrum" // no real order; the server gets to you (the bar)
  | "appointment"; // by scheduled slot

export const SERVICE_DISCIPLINES: readonly ServiceDiscipline[] = [
  "reception",
  "line",
  "take-a-number",
  "scrum",
  "appointment",
];

/** What the point does when no server is on shift. */
export type StaffingPolicy = "close" | "self-service";

/** The public shape added by AttendantMixin. */
export interface Attendant {
  getDiscipline(): ServiceDiscipline;
  getStaffingPolicy(): StaffingPolicy;
  getAttendDurationMs(): number;
  getServerPositionKeys(): readonly string[];
  getBusinessPath(): string;
  /** A diegetic skin string (e.g. `nudge`, `moveOn`, `poke`), or a default. */
  getSkin(key: string): string;
  /** Whether `customerKey` currently holds a service lease here. */
  isAttending(customerKey: string): boolean;
  /** The ordered waiting keys (not counting who's being attended). */
  getQueue(): readonly string[];
  /** 1-based position in the queue, or 0 if not queued. */
  queuePosition(customerKey: string): number;
  /** The active durative leases (server-attention holds). */
  getLeases(): readonly AttendanceEngagement[];

  // Privileged bookkeeping — the substrate only.
  _enqueue(customerKey: string): void;
  _dequeue(customerKey: string): void;
  _recordLease(lease: AttendanceEngagement): void;
  _onLeaseEnded(customerKey: string): void;
}

const DEFAULT_SKINS: Readonly<Record<string, string>> = {
  poke: "It's your turn — step up.",
  nudge: "Anything else for you?",
  moveOn: "I'll have to help the next person now.",
  queued: "There's a wait — you're in line. You'll be called.",
  closed: "The counter is closed just now. Come back during hours.",
};

export function AttendantMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  class AttendantMixin extends Base implements Attendant {
    static _mixinName = "AttendantMixin";

    static persistentFields = [
      "discipline",
      "serverPositionKeys",
      "staffingPolicy",
      "attendDurationMs",
      "skin",
      "businessPath",
    ];

    /** @authorable */
    public discipline: ServiceDiscipline = "line";
    /** @authorable */
    public serverPositionKeys: string[] = [];
    /** @authorable */
    public staffingPolicy: StaffingPolicy = "close";
    /** @authorable */
    public attendDurationMs = 0;
    /** @authorable */
    public skin: Record<string, string> = {};
    /** @authorable ref:Business */
    public businessPath = "";

    /**
     * Waiting customer keys, ordered. Runtime-only — a queue is a live,
     * in-session thing (the residency `_engagements` precedent).
     * @runtimeState
     */
    private _queue: string[] = [];
    /**
     * Active durative leases (server-attention holds), keyed by customer.
     * @runtimeState
     */
    private _leases = new Map<string, AttendanceEngagement>();

    public getDiscipline(): ServiceDiscipline {
      return this.discipline;
    }
    public getStaffingPolicy(): StaffingPolicy {
      return this.staffingPolicy;
    }
    public getAttendDurationMs(): number {
      return this.attendDurationMs;
    }
    public getServerPositionKeys(): readonly string[] {
      return this.serverPositionKeys;
    }
    public getBusinessPath(): string {
      return this.businessPath;
    }
    public getSkin(key: string): string {
      return this.skin[key] ?? DEFAULT_SKINS[key] ?? "";
    }

    public isAttending(customerKey: string): boolean {
      return this._leases.has(customerKey);
    }

    public getQueue(): readonly string[] {
      return [...this._queue];
    }

    public queuePosition(customerKey: string): number {
      const i = this._queue.indexOf(customerKey);
      return i < 0 ? 0 : i + 1;
    }

    public getLeases(): readonly AttendanceEngagement[] {
      return [...this._leases.values()];
    }

    // The queue/lease bookkeeping — internal to the substrate (the `_` prefix,
    // called by AttendantLogic and the engagement's abort callback). Ungated:
    // the effective caller through the scheduler's abort dispatch isn't a
    // recognized module, and the state is transient in-memory queue order, not
    // persisted or economic — the real anti-grief guards (idle eviction,
    // linkdead release, till/quota) are enforced elsewhere.

    public _enqueue(customerKey: string): void {
      if (!this._queue.includes(customerKey)) this._queue.push(customerKey);
    }

    public _dequeue(customerKey: string): void {
      this._queue = this._queue.filter((k) => k !== customerKey);
    }

    public _recordLease(lease: AttendanceEngagement): void {
      this._leases.set(lease.customerKey, lease);
    }

    public _onLeaseEnded(customerKey: string): void {
      this._leases.delete(customerKey);
    }
  }
  return AttendantMixin;
}
