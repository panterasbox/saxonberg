/**
 * Game configuration constants
 *
 * This file contains game-wide constants used throughout the system.
 */

/**
 * Default starting location path in the domain collection.
 * Used as the spawn target for newly-connected avatars.
 *
 * Currently points at the Duncan Hall lobby — the first authored
 * building on Eternal University campus. The void (`/domain/void`)
 * remains as the HasInteractive fallback for containers that
 * destruct without an outer to evacuate to.
 *
 * As real onboarding lands (lounge → student services →
 * orientation → bus stop → dorm assignment), this path moves
 * progressively earlier in the flow. The cockpit slate notes that
 * starting location is purely server-side content; no client
 * changes are needed to evolve it.
 */
// NOTE: this is the *evacuation* fallback consumed by
// `Container.cleanupOnDestruct` — it must resolve to a live Container, so
// it stays the lobby. The *spawn* pointer for fresh avatars is a separate
// concern: `seeds/obj/Avatar/seed.yaml`'s `data.startLocation`
// (`/domain/lounge/warren`), resolved by `Avatar.applyStartLocation`.
export const DEFAULT_STARTING_LOCATION_PATH =
  '/domain/eternal/duncan-hall/lobby';
