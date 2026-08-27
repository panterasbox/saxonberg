/**
 * PersistableApi — the capture / materialize surface for the **persistence
 * spine**: the universal substrate by which any persistence *host* (an
 * avatar, an authored room, a unique host chest) serializes its own runtime
 * state so that property, inventory, and room contents survive residency
 * eviction, logout, and reload.
 *
 * Thin, security-gated forwarding shell: the real capture/restore logic
 * lives in the hot-reloadable {@link PersistableLogic} singleton at
 * `/platform/idea/api/persistable`, reached synchronously via `StuffApi.singletonSync`.
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
import { PersistableLogic } from "../platform/idea/api/PersistableLogic";
import { fileURLToPath } from "url";
import { SecurityApi } from './security';
import type {
  MixinSlice,
  EstateEntry,
} from "../lib/persistence/PersistenceSlice";

export type {
  EstateEntry,
  EstateSlice,
} from "../lib/persistence/PersistenceSlice";

const LOGIC_PATH = "/platform/idea/api/persistable";
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL("../platform/idea/api/PersistableLogic", import.meta.url),
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
   * **The keyed-holder ground pattern.** Key `host` to `key`, then either
   * restore its `(scope, key)` record or lay down its born-with fixtures
   * and capture them. The scope is the host's own `templatePath`, derived
   * exactly as {@link PersistableApi.capture} derives it.
   *
   * This is the decision every multi-instance holder makes — a
   * `DormWarren` per leased unit, a smallholding per titled lot. It lives
   * here because the alternative is each holder hand-rolling the same six
   * lines and getting the branch subtly wrong: capturing on the restore
   * path, re-seeding a room that already had contents, or forgetting to
   * stash the key so the next keyless re-capture writes a second record.
   *
   * Returns `true` when an existing record was restored, `false` when the
   * host was seeded fresh — so a caller can tell a first provision from a
   * re-entry and wire exits, announce, or bill accordingly.
   *
   * Throws when `host` does not compose `PersistableMixin`: that is a
   * programming error at the call site, not a user-reachable path.
   */
  static restoreOrSeed(host: Stuff, key: string): Promise<boolean> {
    return logic().restoreOrSeed(host, key);
  }

  /**
   * Capture one **non-host** Stuff's composed state, detached from any
   * record — the shape a {@link ContentEntry} nests and an
   * {@link EstateEntry} carries. Synchronous, because the capture walk is.
   *
   * The seam owner-based persistence needs: a good whose `place` is not its
   * owner's own container is not in anybody's container slice, so its state
   * has to be taken directly at the moment it moves.
   */
  static captureDetached(item: Stuff): Record<string, MixinSlice> {
    return logic().captureDetached(item);
  }

  /**
   * The **room identity** an owned good's `place` names — a host's
   * persistence scope, plus its per-instance key when it has one. Many
   * leased units share one room template, so the scope alone would collapse
   * them into one place.
   */
  static placeIdOf(host: Stuff): string {
    return logic().placeIdOf(host);
  }

  /**
   * Reconstitute a good from an {@link EstateEntry} into `container`, as
   * `principal` — the room-overlay half of owner-based persistence (D4).
   * Returns the live good, or null when its template no longer resolves.
   */
  static restoreDetached(
    entry: EstateEntry,
    container: Stuff,
    principal: Stuff,
  ): Promise<Stuff | null> {
    return logic().restoreDetached(entry, container, principal);
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

  /* ── the fork/merge substrate (ForkableMixin — the spine's runtime
   *    sibling; no new facade per the one-Api-per-subsystem rule) ── */

  /**
   * Carry `source`'s offered runtime slices onto `fork` (permissive —
   * a slice travels if its layer offers one and the fork's layer
   * accepts it). Also runs the shadow follow pass: each shadow on
   * `source` whose `describeFork()` returns a factory is re-created by
   * the framework IN THE CALLER'S CONTEXT and attached to the fork,
   * and only to the fork. Runtime state only — never a persistence
   * route.
   */
  static async forkRuntimeState(
    source: Stuff,
    fork: Stuff
  ): Promise<void> {
    return logic().forkRuntimeState(source, fork);
  }

  /**
   * Merge a fork's offered slices back onto `source`, restricted to
   * `allowlist` (the consumer's policy — for the sandbox, epistemic
   * only). Slices outside the list are dropped; material state has no
   * merge path back.
   */
  static mergeRuntimeState(
    source: Stuff,
    fork: Stuff,
    allowlist: readonly string[]
  ): void {
    return logic().mergeRuntimeState(source, fork, allowlist);
  }
}

SecurityApi.decorateApiClass(PersistableApi);
