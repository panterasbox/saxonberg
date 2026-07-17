// AttendantApi — the thin, gated forwarding shell over AttendantLogic, the
// **background service** of the storefront-attention substrate: the real-time
// lease idle-eviction sweep + the linkdead release. The venue's own behavior
// (requestAttention / release / serveNext / the queue + leases) lives on
// AttendantMixin, called directly — it's the venue's behavior, not an Api's.
// See docs/subsystems/attendant.md.

import { StuffApi } from "./stuff";
import { HotReloadApi } from "./hot-reload";
import { SecurityApi } from "./security";
import { AttendantLogic } from "../obj/api/AttendantLogic";
import { fileURLToPath } from "url";

export type { AttendResult } from "../lib/attendant/Attendant";

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
