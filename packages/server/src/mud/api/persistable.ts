/**
 * PersistableApi — the capture / materialize surface for the **persistence
 * spine**: the universal substrate by which any persistence *host* (an
 * avatar, an authored room, a unique host chest) serializes its own runtime
 * state so that property, inventory, and room contents survive residency
 * eviction, logout, and reload.
 *
 * Thin, security-gated forwarding shell: the real capture/restore logic
 * lives in the hot-reloadable {@link PersistableLogic} singleton at
 * `/obj/api/persistable`, reached synchronously via `StuffApi.singletonSync`.
 *
 * The governing constraint is security: hydration bypasses the `setFoo()`
 * call-security gates, so persistence routes capture/restore **through** the
 * gated setter surface and reconstitutes items **through** the gated
 * `StuffApi.clone` path (never raw field injection), executed **as the
 * owning principal** — see [docs/subsystems/persistence.md] and
 * [docs/subsystems/call-security.md]. The record store (`holder_snapshots`)
 * has **no player-facing write path**: it is written only by
 * `PersistableLogic`, reachable only through these gated methods.
 *
 * Distinct from `PersistApi` (`api/persist.ts`, the raw `PersistenceManager`
 * chokepoint) — this Api is the self-serialization substrate, not the
 * low-level data layer.
 */

import type { Stuff } from "../lib/stuff/Stuff";
import { StuffApi } from "./stuff";
import { HotReloadApi } from "./hot-reload";
import { SecurityApi } from "./security";
import { PersistableLogic } from "../obj/api/PersistableLogic";
import { fileURLToPath } from "url";

const LOGIC_PATH = "/obj/api/persistable";
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL("../obj/api/PersistableLogic", import.meta.url),
);

/** Resolve the HMR-able PersistableLogic singleton (sync). */
function logic(): PersistableLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        "PersistableLogic",
      ) as typeof PersistableLogic | null) ?? PersistableLogic)(),
  );
}

export class PersistableApi {
  /**
   * Capture `host`'s current runtime state into its {@link
   * PersistedRecord}. Synchronous read of the live tree before the first
   * `await` (the snapshot-before-yield invariant), then an upsert keyed on
   * `(scope = host.templatePath, owner)`. Idempotent — a later capture
   * overwrites the record with the newer full snapshot.
   */
  static capture(host: Stuff): Promise<void> {
    return logic().capture(host);
  }

  /**
   * Restore every {@link PersistedRecord} scoped to `host` — reconstituting
   * its captured content tree and worn gear onto the already-cloned shell,
   * each record restored **as its owner** (the principal). A no-op when the
   * host has no records. Atomic per record (a mid-tree failure leaves the
   * prior record untouched).
   */
  static materialize(host: Stuff): Promise<void> {
    return logic().materialize(host);
  }

  /** True when at least one record is scoped to `scope` (the host's path). */
  static hasRecord(scope: string): Promise<boolean> {
    return logic().hasRecord(scope);
  }

  /**
   * Account-deletion cascade — remove every record a principal owns
   * (`owner = <principal templatePath>`). Returns the count removed. The
   * containment tree reconstructs by following host references, so a
   * keyed delete over `owner` is the whole cascade.
   */
  static deleteAllFor(owner: string): Promise<number> {
    return logic().deleteAllFor(owner);
  }
}

SecurityApi.decorateApiClass(PersistableApi);
