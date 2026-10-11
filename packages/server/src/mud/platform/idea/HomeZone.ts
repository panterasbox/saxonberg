/**
 * HomeZone — per-player namespace root in the template tree.
 *
 * The `/home/` Zone holds player-scoped content: per-player draft
 * templates, named eval scripts (`--save` future landing), home-tier
 * preferences, the like. Each player gets a `/home/<playerId>/`
 * sub-folder lazily on first use; descendants live under that.
 *
 * v1 footprint is intentionally empty — the class exists so the
 * `/home/` branch is established as a real Zone (folder/leaf
 * invariant requires it for any descendant template), and so
 * future home-tier behaviour has a class to layer onto without a
 * second taxonomy decision later.
 *
 * A `WireZone` — `/home` is a wire namespace root (`wire: true` on its
 * row), the per-player sibling of `/studio`. A non-spatial Zone
 * subclass, like `Clade`. `Stuff.zone` (the nearest spatial zone) doesn't stamp
 * onto Stuff cloned under `/home/...` — `ZoneApi.isSpatialZoneClass`
 * returns false for HomeZone, same shape as Clade.
 *
 * Future shape (deliberately not implemented):
 *   - per-player permission gating (only `playerId` writes under
 *     `/home/<playerId>/...`); waits on the permission framework.
 *   - lazy creation of per-player sub-folders on first save.
 *   - eviction / archival of stale per-player content.
 */

import WireZone from './WireZone';

export default class HomeZone extends WireZone {
  // No fields, no methods v1. Future home-tier state lands here.
}
