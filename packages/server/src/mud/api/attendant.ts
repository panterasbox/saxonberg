// AttendantApi — the thin, gated forwarding shell over AttendantLogic, the
// home of the universal storefront-attention substrate (the queue, the
// being-attended lease, and its anti-grief eviction). Every venue runs it,
// configured differently. See docs/subsystems/attendant.md.

import { StuffApi } from "./stuff";
import { HotReloadApi } from "./hot-reload";
import { SecurityApi } from "./security";
import { AttendantLogic } from "../obj/api/AttendantLogic";
import type { AttendResult } from "../obj/api/AttendantLogic";
import type { Attendant } from "../lib/attendant/Attendant";
import type { Engaged } from "../lib/activity/Engaged";
import type { Stuff } from "../lib/stuff/Stuff";
import { fileURLToPath } from "url";

export type { AttendResult } from "../obj/api/AttendantLogic";

const LOGIC_PATH = "/obj/api/attendant";
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL("../obj/api/AttendantLogic", import.meta.url),
);

/** Resolve the HMR-able AttendantLogic singleton (sync). */
function logic(): AttendantLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        "AttendantLogic",
      ) as typeof AttendantLogic | null) ?? AttendantLogic)(),
  );
}

export class AttendantApi {
  /** Boot seam (idempotent): install the lease sweep + linkdead release. */
  public static boot(): void {
    logic().boot();
  }

  /**
   * Request attention at `point` for `customerKey`. The venue may pass the
   * server it already resolved (the bar's on-shift bartender); otherwise the
   * point resolves one from its roster. Returns whether the customer is being
   * attended (instant or leased), queued (with position), or the point is
   * closed.
   */
  public static requestAttention(
    point: Stuff & Attendant,
    customerKey: string,
    server?: Stuff & Engaged,
  ): AttendResult {
    return logic().requestAttention(point, customerKey, server);
  }

  /** A service act happened — refresh the lease recency (anti-idle signal). */
  public static bumpLease(
    point: Stuff & Attendant,
    customerKey: string,
  ): void {
    logic().bumpLease(point, customerKey);
  }

  /** Release a customer's lease (service complete) and pull up the next. */
  public static release(point: Stuff & Attendant, customerKey: string): void {
    logic().release(point, customerKey);
  }

  /** Leave the waiting order. */
  public static leaveQueue(
    point: Stuff & Attendant,
    customerKey: string,
  ): void {
    logic().leaveQueue(point, customerKey);
  }

  /** Poke the customer now at the front of the order — it's their turn. */
  public static serveNext(point: Stuff & Attendant): void {
    logic().serveNext(point);
  }

  /** Test seam — run one lease idle-eviction sweep synchronously. */
  public static sweepNowForTesting(): void {
    logic().sweepNowForTesting();
  }

  /** Test seam — drive the linkdead-release path directly. */
  public static disconnectForTesting(playerId: string): void {
    logic().disconnectForTesting(playerId);
  }
}

SecurityApi.decorateApiClass(AttendantApi);
