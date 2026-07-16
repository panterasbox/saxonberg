// AttendantLogic — the storefront-attention orchestration behind AttendantApi.
//
// Owns: granting/releasing service leases (a server's attention, held via an
// AttendanceEngagement — one at a time falls out of the slot), the waiting
// queue (poke-on-your-turn, never a modal lock), and the two anti-grief
// guards' exclusive half — the LEASE: a real-time recency stamp + a lazy
// real-time sweep (the residency pattern) that revokes an idle hold and pulls
// the next customer up, plus instant linkdead release. Default-evict — the
// griefer gets no veto; the venue configures the timeout, never whether.
//
// See docs/subsystems/attendant.md.

import { ApiLogic } from "../../lib/stuff/ApiLogic";
import { StuffApi } from "../../api/stuff";
import { SchedulerApi } from "../../api/scheduler";
import { ScheduleApi, type ScheduleHandle } from "../../api/schedule";
import { AppApi } from "../../api/app";
import { AppSettingKeys } from "../../lib/config/AppSettings";
import { CallSecurity } from "../../lib/security/decorators";
import { SecurityPolicies } from "../../lib/security/SecurityPolicies";
import { MixinApi } from "../../api/mixin";
import { MessageApi } from "../../api/message";
import { Mml } from "../../api/mml";
import { EmploymentApi } from "../../api/employment";
import { EventApi, type Subscription } from "../../api/event";
import { Events } from "../../lib/events";
import { AttendanceEngagement } from "../../lib/attendant/AttendanceEngagement";
import type { Attendant } from "../../lib/attendant/Attendant";
import type { Engaged } from "../../lib/activity/Engaged";
import type { Business } from "../../lib/employment/Business";
import type { Stuff } from "../../lib/stuff/Stuff";

const AttendantApiCallers = SecurityPolicies.FromModule(
  "/api/attendant#AttendantApi",
);

/** The outcome of a request for attention at a point. */
export type AttendResult =
  | { status: "attending"; instant: boolean; selfService?: boolean }
  | { status: "queued"; position: number }
  | { status: "closed" };

const DEFAULT_SWEEP_MS = 15_000;
const DEFAULT_IDLE_MS = 120_000;

function readInt(key: string, fallback: number): number {
  try {
    const raw = Number(AppApi.setting(key));
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : fallback;
  } catch {
    return fallback;
  }
}

/** @internal */
export class AttendantLogic extends ApiLogic {
  private sweepHandle: ScheduleHandle | null = null;
  private disconnectSub: Subscription<{ playerId: string }> | null = null;

  /** Boot seam (idempotent): install the lease sweep + linkdead release. */
  @CallSecurity(AttendantApiCallers)
  public boot(): void {
    this.doInstallLeaseSweep();
    if (!this.disconnectSub) {
      this.disconnectSub = EventApi.on<{ playerId: string }>(
        Events.PlayerDisconnected,
        (p) => this.onPlayerDisconnected(p.playerId),
      );
    }
  }

  /** Install the real-time idle-eviction sweep (mirrors ResidencyLogic). */
  @CallSecurity(AttendantApiCallers)
  public installLeaseSweep(): void {
    this.doInstallLeaseSweep();
  }

  // Private impl — `boot` and the public `installLeaseSweep` both call it; a
  // gated method can't call another gated method via `this` (the self-caller
  // isn't the AttendantApi module).
  private doInstallLeaseSweep(): void {
    if (this.sweepHandle) return;
    this.sweepHandle = ScheduleApi.recurring(
      readInt(AppSettingKeys.attendantLeaseSweepIntervalMs, DEFAULT_SWEEP_MS),
      () => this.runLeaseSweep(),
    );
  }

  /**
   * Request attention at `point` for `customerKey`. Instant venues serve
   * synchronously (no held slot — scrum). Durative venues grant a lease on a
   * free server's attention, else queue the customer (free to mill, poked on
   * their turn). No server + `self-service` → bounded self-service; + `close`
   * → closed (the card still works elsewhere — never a lockout).
   */
  @CallSecurity(AttendantApiCallers)
  public requestAttention(
    point: Stuff & Attendant,
    customerKey: string,
    server?: Stuff & Engaged,
  ): AttendResult {
    // Already attended → refresh recency, stay attended (idempotent re-entry).
    if (point.isAttending(customerKey)) {
      this.doBumpLease(point, customerKey);
      return { status: "attending", instant: false };
    }
    if (point.getAttendDurationMs() <= 0) {
      // Instant service holds no slot; the payload just runs (the bar).
      point._dequeue(customerKey);
      return { status: "attending", instant: true };
    }
    const attendant = server ?? this.resolveServer(point);
    if (!attendant) {
      if (point.getStaffingPolicy() === "self-service") {
        point._dequeue(customerKey);
        return { status: "attending", instant: false, selfService: true };
      }
      return { status: "closed" };
    }
    // One at a time: a server whose attention is already held must finish
    // first — the requester waits.
    if (attendant.getEngagementBySlot("attention")) {
      point._enqueue(customerKey);
      return { status: "queued", position: point.queuePosition(customerKey) };
    }
    const lease = new AttendanceEngagement(
      attendant,
      point,
      customerKey,
      Date.now(),
    );
    const result = SchedulerApi.start(lease);
    if (!result.ok) {
      point._enqueue(customerKey);
      return { status: "queued", position: point.queuePosition(customerKey) };
    }
    point._dequeue(customerKey);
    point._recordLease(lease);
    return { status: "attending", instant: false };
  }

  /** A service act happened — bump the lease recency (the anti-idle signal). */
  @CallSecurity(AttendantApiCallers)
  public bumpLease(point: Stuff & Attendant, customerKey: string): void {
    this.doBumpLease(point, customerKey);
  }

  /** Release a customer's lease (service complete) and pull up the next. */
  @CallSecurity(AttendantApiCallers)
  public release(point: Stuff & Attendant, customerKey: string): void {
    const lease = point
      .getLeases()
      .find((l) => l.customerKey === customerKey);
    if (lease) SchedulerApi.cancel(lease, "service-complete");
    this.doServeNext(point);
  }

  /** Leave the waiting order (a deliberate departure or an idle-drop). */
  @CallSecurity(AttendantApiCallers)
  public leaveQueue(point: Stuff & Attendant, customerKey: string): void {
    point._dequeue(customerKey);
  }

  /** Poke the customer now at the front of the order — it's their turn. */
  @CallSecurity(AttendantApiCallers)
  public serveNext(point: Stuff & Attendant): void {
    this.doServeNext(point);
  }

  // Private impls — internal callers use these to dodge the self-call gate
  // (a gated method calling another gated method fails: `this` isn't the
  // AttendantApi module).
  private doBumpLease(point: Stuff & Attendant, customerKey: string): void {
    const lease = point
      .getLeases()
      .find((l) => l.customerKey === customerKey);
    lease?.touch(Date.now());
  }

  private doServeNext(point: Stuff & Attendant): void {
    const front = point.getQueue()[0];
    if (!front) return;
    this.poke(front, point.getSkin("poke"));
  }

  /** Resolve a present, on-shift, attention-free server for `point`. */
  private resolveServer(point: Stuff & Attendant): (Stuff & Engaged) | null {
    const businessPath = point.getBusinessPath();
    if (!businessPath) return null;
    const business = StuffApi.findByTemplatePath<Stuff & Business>(businessPath);
    if (!business || !MixinApi.isBusiness(business)) return null;
    const room = this.roomOf(point as unknown as Stuff);
    const wantKeys = new Set(point.getServerPositionKeys());
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

  /** The player's leases + queue places drop the instant they go linkdead. */
  private onPlayerDisconnected(playerId: string): void {
    const key = `/obj/Avatar/${playerId}`;
    for (const point of this.allPoints()) {
      const lease = point.getLeases().find((l) => l.customerKey === key);
      if (lease) SchedulerApi.cancel(lease, "service-linkdead");
      if (point.queuePosition(key) > 0) point._dequeue(key);
    }
  }

  /** Test seam — run one lease sweep synchronously (the `evictNow` precedent). */
  @CallSecurity(AttendantApiCallers)
  public sweepNowForTesting(): void {
    this.runLeaseSweep();
  }

  /** Test seam — drive the linkdead-release path without the event/boot timer. */
  @CallSecurity(AttendantApiCallers)
  public disconnectForTesting(playerId: string): void {
    this.onPlayerDisconnected(playerId);
  }

  /** The lazy real-time sweep: revoke idle leases, pull the next up. */
  private runLeaseSweep(): void {
    const idleThreshold = readInt(
      AppSettingKeys.attendantLeaseIdleThresholdMs,
      DEFAULT_IDLE_MS,
    );
    const now = Date.now();
    for (const point of this.allPoints()) {
      for (const lease of point.getLeases()) {
        if (lease.idleMs(now) >= idleThreshold) {
          // Default-evict: the griefer gets no veto. onAbort drops the lease
          // and this same sweep's serveNext pulls the next customer up.
          this.poke(lease.customerKey, point.getSkin("moveOn"));
          SchedulerApi.cancel(lease, "service-idle");
          this.doServeNext(point);
        }
      }
    }
  }

  private allPoints(): (Stuff & Attendant)[] {
    const out: (Stuff & Attendant)[] = [];
    for (const obj of StuffApi.getAllObjects()) {
      if (MixinApi.isAttendant(obj)) out.push(obj as Stuff & Attendant);
    }
    return out;
  }

  private roomOf(stuff: Stuff): Stuff | null {
    const c = (stuff as unknown as { getContainer?(): Stuff | null }).getContainer;
    return typeof c === "function" ? c.call(stuff) : null;
  }

  private poke(customerKey: string, line: string): void {
    if (!line) return;
    const who = StuffApi.findByTemplatePath(customerKey);
    if (!who || !MixinApi.isSensor(who)) return;
    MessageApi.scene(who as unknown as Stuff)
      .topic("world.narration.action")
      .toSelf(Mml.compose`${line}`)
      .send();
  }
}
