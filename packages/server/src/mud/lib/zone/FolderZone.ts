/**
 * FolderZone — generic organizational Zone subclass with no spatial topology.
 *
 * Use this for templatePath folders like `/domain/narnia/` or
 * `/narnia/woods/clearings/` that organize a content team's tree
 * without anchoring a coordinate grid. Sub-folders that DO need a
 * coordinate frame extend `CartesianZone` or `SphericalZone` instead.
 *
 * Per zone-architecture-slate § Folder zones — generic class needed.
 *
 * Like `HomeZone`, the body is intentionally empty — the class
 * exists so the folder/leaf invariant is satisfied for paths beneath
 * it, and so the inheritance walk (`ZoneApi.resolveZoneField`)
 * sees the folder as an ancestry node. Future folder-tier behavior
 * (per-folder defaults, permission gates) lands on this class
 * without churning callers.
 *
 * FolderZone is NOT a spatial concept — it can bridge any type of
 * zones across tree depths, not just spatial zones. Lives in
 * `lib/zone/` (the Zone-hierarchy subsystem), not `lib/spatial/`.
 *
 * `ZoneApi.isFolderClass('/lib/zone/FolderZone')` returns true, so
 * `resolveZoneField`'s ancestry walk treats it as an inheritance
 * node. `ZoneApi.isSpatialZoneClass(...)` returns false, so
 * `Stuff.zone` stamping skips it during the spatial-zone resolution
 * walk (see `ZoneApi.resolveZoneForPath`).
 */

import { Zone } from './Zone';

export default class FolderZone extends Zone {
  // No fields, no methods v1.
}
