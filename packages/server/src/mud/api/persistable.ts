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
import { PersistableLogic } from "../obj/api/PersistableLogic";
import { fileURLToPath } from "url";
import { SecurityApi } from './security';

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
   *
   * `key` is the explicit **record owner** (the multi-instance key — a leased
   * dorm room's unit parcel). Supplied by the establishing context; when
   * omitted the owner falls back to the host's stashed key, then to the
   * scope-derived owner (the singleton / self-owned Avatar path — unchanged).
   * A resolved key is stashed on the host so a later keyless re-capture (the
   * residency sweep / autosave) writes back to the same `(scope, key)` record.
   */
  static capture(host: Stuff, key?: string): Promise<void> {
    return logic().capture(host, key);
  }

  /**
   * Restore `host` from its {@link PersistedRecord}(s) — reconstituting the
   * captured content tree and worn gear onto the already-cloned shell, each
   * record restored **as its owner** (the principal). Atomic per record.
   *
   * With `key` (a multi-instance host) restores the single `(scope, key)`
   * record (a clean no-op if none — the first-provision seed drives instead)
   * and stashes the key. Without `key` (a singleton / Avatar) restores every
   * record scoped to the host — the legacy path.
   */
  static materialize(host: Stuff, key?: string): Promise<void> {
    return logic().materialize(host, key);
  }

  /**
   * Capture the persistence host **responsible for** `stuff`, after a
   * mutating act on it: `stuff` itself when it is a host (a watered
   * plant), else the nearest persistable containment ancestor (the dorm
   * room a chest sits in), captured under its own stashed key. A clean
   * no-op when no host is found — the thing lives in transient space —
   * and hop-capped against a containment cycle. The event-driven capture
   * every husbandry-family phase reuses; see
   * [docs/subsystems/persistence.md].
   */
  static captureHostOf(stuff: Stuff): Promise<void> {
    return logic().captureHostOf(stuff);
  }

  /**
   * True when a record exists for `scope`. With `key`, tests the single
   * `(scope, key)` record (a multi-instance host); without, whether any
   * record is scoped to `scope` (the host's path).
   */
  static hasRecord(scope: string, key?: string): Promise<boolean> {
    return logic().hasRecord(scope, key);
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
