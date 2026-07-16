/**
 * AttendantMixin — the universal storefront-attention capability, hosted on a
 * service-point `Thing` fixture (the `BankMixin`/`Menu` precedent: a Location's
 * own contributions don't reach its occupants, so the counter is a fixture).
 *
 * The point owns its **queue**, its active **leases**, AND the behavior over
 * them: `requestAttention` / `release` / `serveNext` / `evictIdleLeases` are
 * methods here, not in an Api — a venue attending its customers is the venue's
 * own behavior. A *server* (an on-shift employee, resolved via employment)
 * attends one customer at a time; the rest wait in an order and are *poked*
 * when a server frees — never frozen. Being-attended is an
 * {@link AttendanceEngagement} on the server's attention (durative venues) or a
 * synchronous act (instant venues); either way the exclusive resource is the
 * server, guarded by the lease eviction.
 *
 * The one genuinely Api-shaped piece — the real-time idle-eviction *sweep* +
 * the linkdead subscription — lives in `AttendantLogic` as a background service
 * (the ResidencyLogic shape): the engine drives the cadence and *informs* each
 * point, the point *decides* (`evictIdleLeases` / `dropCustomer`).
 *
 * Config axes (authored on the seed): **discipline** (reception / line /
 * take-a-number / scrum / appointment), **serverPositionKeys** (which
 * employment positions attend), **staffingPolicy** (close / self-service when
 * unstaffed), **attendDurationMs** (0 = instant), and the diegetic **skin**.
 */

import type { MixinConstructor } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import { SchedulerApi } from "../../api/scheduler";
import { MessageApi } from "../../api/message";
import { Mml } from "../../api/mml";
import { MixinApi } from "../../api/mixin";
import { StuffApi } from "../../api/stuff";
import { EmploymentApi } from "../../api/employment";
import { AttendanceEngagement } from "./AttendanceEngagement";
import type { Engaged } from "../activity/Engaged";
import type { Business } from "../employment/Business";

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

/** The outcome of a request for attention at a point. */
export type AttendResult =
  | { status: "attending"; instant: boolean; selfService?: boolean }
  | { status: "queued"; position: number }
  | { status: "closed" };

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

  /**
   * Request attention for `customerKey`. Instant venues serve synchronously
   * (no held slot — scrum). Durative venues grant a lease on a free server's
   * attention, else queue the customer (free to mill, poked on their turn). No
   * server + `self-service` → bounded self-service; + `close` → closed (the
   * card still works elsewhere — never a lockout). A caller with the server in
   * hand (a venue that already resolved it) may pass it.
   */
  requestAttention(customerKey: string, server?: Stuff & Engaged): AttendResult;
  /** A service act happened — refresh the lease recency (the anti-idle signal). */
  bumpLease(customerKey: string): void;
  /** Release a customer's lease (service complete) and pull up the next. */
  release(customerKey: string): void;
  /** Leave the waiting order (a deliberate departure). */
  leaveQueue(customerKey: string): void;
  /** Poke the customer now at the front of the order — it's their turn. */
  serveNext(): void;
  /**
   * The point's own idle-eviction decision — the sweep engine drives cadence
   * and informs; the point evicts (default-evict: the griefer gets no veto).
   */
  evictIdleLeases(nowMs: number, idleThresholdMs: number): void;
  /** Linkdead: drop the customer's lease + queue place instantly. */
  dropCustomer(customerKey: string): void;

  /** Witness from a lease's teardown that it has ended (the engagement calls it). */
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

    /* ─────────────────────── the venue's behavior ─────────────────────── */

    public requestAttention(
      customerKey: string,
      server?: Stuff & Engaged,
    ): AttendResult {
      // Already attended → refresh recency, stay attended (idempotent re-entry).
      if (this._leases.has(customerKey)) {
        this.bumpLease(customerKey);
        return { status: "attending", instant: false };
      }
      if (this.attendDurationMs <= 0) {
        // Instant service holds no slot; the payload just runs (the bar).
        this.dequeue(customerKey);
        return { status: "attending", instant: true };
      }
      const attendant = server ?? this.resolveServer();
      if (!attendant) {
        if (this.staffingPolicy === "self-service") {
          this.dequeue(customerKey);
          return { status: "attending", instant: false, selfService: true };
        }
        return { status: "closed" };
      }
      // One at a time: a server whose attention is already held must finish
      // first — the requester waits.
      if (attendant.getEngagementBySlot("attention")) {
        this.enqueue(customerKey);
        return { status: "queued", position: this.queuePosition(customerKey) };
      }
      const lease = new AttendanceEngagement(
        attendant,
        this as unknown as Stuff & Attendant,
        customerKey,
        Date.now(),
      );
      if (!SchedulerApi.start(lease).ok) {
        this.enqueue(customerKey);
        return { status: "queued", position: this.queuePosition(customerKey) };
      }
      this.dequeue(customerKey);
      this._leases.set(customerKey, lease);
      return { status: "attending", instant: false };
    }

    public bumpLease(customerKey: string): void {
      this._leases.get(customerKey)?.touch(Date.now());
    }

    public release(customerKey: string): void {
      const lease = this._leases.get(customerKey);
      if (lease) SchedulerApi.cancel(lease, "service-complete");
      this.serveNext();
    }

    public leaveQueue(customerKey: string): void {
      this.dequeue(customerKey);
    }

    public serveNext(): void {
      const front = this._queue[0];
      if (front) this.poke(front, this.getSkin("poke"));
    }

    public evictIdleLeases(nowMs: number, idleThresholdMs: number): void {
      for (const lease of [...this._leases.values()]) {
        if (lease.idleMs(nowMs) >= idleThresholdMs) {
          // Default-evict: the griefer gets no veto. onAbort drops the lease;
          // then we pull the next customer up.
          this.poke(lease.customerKey, this.getSkin("moveOn"));
          SchedulerApi.cancel(lease, "service-idle");
          this.serveNext();
        }
      }
    }

    public dropCustomer(customerKey: string): void {
      const lease = this._leases.get(customerKey);
      if (lease) SchedulerApi.cancel(lease, "service-linkdead");
      this.dequeue(customerKey);
    }

    /** Witness from a lease's teardown (the engagement's `onAbort` calls it). */
    public _onLeaseEnded(customerKey: string): void {
      this._leases.delete(customerKey);
    }

    /* ──────────────────────────── internals ──────────────────────────── */

    private enqueue(customerKey: string): void {
      if (!this._queue.includes(customerKey)) this._queue.push(customerKey);
    }

    private dequeue(customerKey: string): void {
      this._queue = this._queue.filter((k) => k !== customerKey);
    }

    /** Resolve a present, on-shift, attention-free server from the roster. */
    private resolveServer(): (Stuff & Engaged) | null {
      const businessPath = this.businessPath;
      if (!businessPath) return null;
      const business = StuffApi.findByTemplatePath<Stuff & Business>(
        businessPath,
      );
      if (!business || !MixinApi.isBusiness(business)) return null;
      const room = this.roomOf(this as unknown as Stuff);
      const wantKeys = new Set(this.serverPositionKeys);
      for (const a of business.getRosterAssignments()) {
        if (wantKeys.size > 0 && !wantKeys.has(a.positionKey)) continue;
        const who = StuffApi.findByTemplatePath(a.assignee);
        if (!who || !MixinApi.isEngaged(who)) continue;
        if (EmploymentApi.shiftStateOf(who) !== "on-shift") continue;
        if (room && this.roomOf(who) !== room) continue;
        if ((who as Stuff & Engaged).getEngagementBySlot("attention")) continue;
        return who as Stuff & Engaged;
      }
      return null;
    }

    private roomOf(stuff: Stuff): Stuff | null {
      return MixinApi.isContainable(stuff) ? stuff.getContainer() : null;
    }

    private poke(customerKey: string, line: string): void {
      if (!line) return;
      const who = StuffApi.findByTemplatePath(customerKey);
      if (!who || !MixinApi.isSensor(who)) return;
      MessageApi.scene(who)
        .topic("world.narration.action")
        .toSelf(Mml.compose`${line}`)
        .send();
    }
  }
  return AttendantMixin;
}
