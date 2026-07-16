// AttendantLogic — the storefront-attention **background service** behind
// AttendantApi. NOT the venue's behavior (that lives on AttendantMixin, where
// the queue + leases are); this is the one genuinely Api-shaped piece: a
// process-level scheduled service with a retained timer + a boot seam.
//
// It runs the exclusive-resource anti-grief guard — the LEASE eviction — as
// the ResidencyLogic shape: a lazy real-time sweep that *informs* each point,
// and the point *decides* (`evictIdleLeases`), plus an instant linkdead release
// (`dropCustomer`). The engine drives cadence; the object owns the decision.
//
// See docs/subsystems/attendant.md.

import { ApiLogic } from "../../lib/stuff/ApiLogic";
import { StuffApi } from "../../api/stuff";
import { ScheduleApi, type ScheduleHandle } from "../../api/schedule";
import { AppApi } from "../../api/app";
import { AppSettingKeys } from "../../lib/config/AppSettings";
import { CallSecurity } from "../../lib/security/decorators";
import { SecurityPolicies } from "../../lib/security/SecurityPolicies";
import { MixinApi } from "../../api/mixin";
import { EventApi, type Subscription } from "../../api/event";
import { Events } from "../../lib/events";
import type { Attendant } from "../../lib/attendant/Attendant";
import type { Stuff } from "../../lib/stuff/Stuff";

const AttendantApiCallers = SecurityPolicies.FromModule(
  "/api/attendant#AttendantApi",
);

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
    if (!this.sweepHandle) {
      this.sweepHandle = ScheduleApi.recurring(
        readInt(AppSettingKeys.attendantLeaseSweepIntervalMs, DEFAULT_SWEEP_MS),
        () => this.runLeaseSweep(),
      );
    }
    if (!this.disconnectSub) {
      this.disconnectSub = EventApi.on<{ playerId: string }>(
        Events.PlayerDisconnected,
        (p) => this.onPlayerDisconnected(p.playerId),
      );
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

  /** The lazy real-time sweep: inform each point of the idle threshold; it evicts. */
  private runLeaseSweep(): void {
    const threshold = readInt(
      AppSettingKeys.attendantLeaseIdleThresholdMs,
      DEFAULT_IDLE_MS,
    );
    const now = Date.now();
    for (const point of this.allPoints()) point.evictIdleLeases(now, threshold);
  }

  /** A player's leases + queue places drop the instant they go linkdead. */
  private onPlayerDisconnected(playerId: string): void {
    const key = `/obj/Avatar/${playerId}`;
    for (const point of this.allPoints()) point.dropCustomer(key);
  }

  private allPoints(): (Stuff & Attendant)[] {
    const out: (Stuff & Attendant)[] = [];
    for (const obj of StuffApi.getAllObjects()) {
      if (MixinApi.isAttendant(obj)) out.push(obj as Stuff & Attendant);
    }
    return out;
  }
}
