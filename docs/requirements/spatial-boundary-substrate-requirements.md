# Spatial + Boundary substrate — Requirements

This document is the **input** to a planning agent. The planner reads this, reads the source slates and subsystem docs cited below, then produces an implementation plan (shaped like `docs/plans/activity-plan.md`) that a build agent can execute.

**Output expected from the planner**: `docs/plans/spatial-boundary-substrate-plan.md` (or similar) — a full implementation plan with file-by-file changes, waves, test specifications, and any answered design questions from this doc's "Open questions for the planner" section.

## Source slates and subsystem docs

The planner MUST read these before drafting:

- [`docs/slates/zone-architecture-slate.md`](../slates/zone-architecture-slate.md) — design authority for FolderZone, cardinal-rule tightening, `ZoneApi.resolveZoneField`, zone-derivation rule.
- [`docs/slates/declarative-content-slate.md`](../slates/declarative-content-slate.md) — design authority for the structural field shapes (`coords`, `exits`, `attachedHosts`) and the "setter with side effects" pattern they share.
- [`docs/subsystems/spatial.md`](../subsystems/spatial.md) — current spatial subsystem doc; this build extends it.
- [`docs/subsystems/boundary.md`](../subsystems/boundary.md) — current boundary subsystem doc; this build extends it.
- [`docs/subsystems/templates.md`](../subsystems/templates.md) — for the Hydrator contract, which the setter pattern relies on.
- [`docs/subsystems/persistence.md`](../subsystems/persistence.md) — for `persistentFields`, `Persistable`.
- [`docs/subsystems/lifecycle.md`](../subsystems/lifecycle.md) — for the construction sentinel and `postRegister` semantics.
- [`docs/subsystems/hot-reload.md`](../subsystems/hot-reload.md) — for HMR composition with the new setters.
- [`docs/ref-shapes.md`](../ref-shapes.md) — Pattern A vs B vs C ref shapes; the new `attachedHosts` is Pattern A.
- [`CLAUDE.md`](../../CLAUDE.md) — project conventions (module categories, file naming, member privacy, inter-stuff contract).

## Scope

This build extends three subsystems — a new **zone** subsystem (carved out of `lib/spatial/`), plus **spatial** and **boundary** — to ship everything both source slates ask for. After this build, all three subsystems walk away **complete** for the slates' needs; no follow-up substrate work in those areas until something genuinely new lands. The remaining slate substrate (`stuff/PopulatesMixin`, `connection/Login.enter` change, `templates/container:` field) is explicitly **out of scope** and ships as separate builds.

**Tangible completion criterion**: a content author can author a CartesianZone with rooms (declaring `coords:` and `exits:` and connected `attachedHosts:` Windows in YAML), have those rooms hydrate lazily via `StuffApi.singleton` on first access, and have the wiring (zone registration, exit graph, window attachment) come out correct end-to-end — without writing any TypeScript, without touching `bootstrap.ts`, and without invoking any new framework helper.

### In scope (~15 deliverables across zone + spatial + boundary)

**Zone subsystem** (new — `packages/server/src/mud/lib/zone/`, carved out of `lib/spatial/`):

1a. **Carve a new `lib/zone/` subsystem** holding the Zone-hierarchy roots. Move `lib/spatial/Zone.ts` → `lib/zone/Zone.ts` and `lib/spatial/SpatialZone.ts` → `lib/zone/SpatialZone.ts`. Update import paths in every file across the codebase that imports either class — mechanical sweep, ~10-30 hits. See plan § 3.2 for the full move plan.

1. **`FolderZone` class** — `lib/zone/FolderZone.ts` (in the new subsystem, alongside `Zone` and `SpatialZone`). Bare `extends Zone {}` body (mirrors `HomeZone` shape). FolderZone is generic — it bridges any type of zones across tree depths, not just spatial zones — so it belongs with the Zone hierarchy roots, not with the spatial-coordinate concrete classes. Per zone-architecture-slate § Folder zones — generic class needed.

**Spatial subsystem** (`packages/server/src/mud/lib/spatial/`, `packages/server/src/mud/api/zone.ts`) — concrete spatial-coordinate zones (`CartesianZone`, `SphericalZone`) and the location primitives stay here:
2. **`CartesianLocation.addExit` cardinal-rule tightening** — relax from "if `isCardinal`, allow; else throw" to "if `isCardinal`, allow; else require destination's templatePath resolves to a different zone than source's." Per zone-architecture-slate § The cardinal-only-intra-zone exit invariant. **Eager check, path-based.** `ZoneApi.resolveZoneForPath` walks template ancestry; no need to load the destination room. `CartesianLocation.addExit` becomes async (awaits zone resolution). Zones lazy-clone via `singleton` when first referenced. No deferred-validation hook needed (the "lazy-resolution wrinkle" mentioned in earlier framing is dissolved by the path-based approach).
3. **`ZoneApi.resolveZoneField<T>(zone, fieldName)`** — new helper in `api/zone.ts`. Generalized template-ancestry inheritance walk, parallel to `ZoneApi.resolveZoneForPath` but reads field values along the way. Per zone-architecture-slate § Inheritance walk for zone-carried fields.
4. **`CartesianLocation.coords`** — new persistent field of shape `{ x: number, y: number, z: number }`. New `setCoords(c)` setter that stores the value AND calls `this.getZone().addLocation(this, c.x, c.y, c.z)`. Idempotency check uses the new `hasRoomAt` helper (below); no-op if room already at requested coords. Per declarative-content-slate § `coords` on `CartesianLocation`.
5. **`CartesianZone.hasRoomAt(x, y, z, room?)`** — new read-only helper. Returns true iff the specified `room` (or any room, if omitted) is currently at the given coordinates in this zone's grid. Used by `setCoords` for idempotency. Per declarative-content-slate.
6. **`SphericalLocation.focus`** — new persistent field of shape `{ rho: number, theta: number, phi: number, radius: number }`. New `setFocus(f)` setter that stores the value AND calls the equivalent registration on `SphericalZone`. Parallel pattern to `coords`. Per declarative-content-slate § `coords` on `CartesianLocation` (Spherical note).
7. **`docs/subsystems/spatial.md` updates** — comprehensive update capturing:
   - Zone-derivation rule formalization (FolderZones skipped during walk; nearest SpatialZone wins) — per zone-architecture-slate § Zone derivation
   - Cardinal-invariant tightening, replacing the current "any non-cardinal direction throws" passage
   - FolderZone / SpatialZone soft-split via subclass
   - Permissions-independence note
   - New `setCoords` / `setFocus` setters + `hasRoomAt` helper
   - The "setter with side effects" pattern documented as a general technique used in this subsystem

**Boundary subsystem** (`packages/server/src/mud/lib/boundary/`):

8. **`ExitableMixin.applyExits(map)`** — new **applier** method (not setter) on `lib/boundary/Exitable.ts`. `exits` is an **instruction field** (declared in `static instructionFields = ['exits']`), not a persistent field. Iterates `map: { [direction: string]: ExitSpec }` and for each entry dispatches:
   - `bidirectional: true` (default for cardinal directions): calls `this.addBidirectionalExit(destination, direction, { door, opposite })`
   - `bidirectional: false`: calls `this.addExit(new Exit({...}))`
   - Per-direction idempotency: setter checks `this.hasExit(direction)` first; matching existing exit → no-op; mismatching exit → throw with diagnostic naming both seed paths.
   - Per declarative-content-slate § `exits` on `ExitableMixin`.
9. **`Window.attachedHosts`** — new **persistent** field on `lib/boundary/Window.ts` of shape `[string, string]` (two template path strings, Pattern A). New `setAttachedHosts([a, b])` setter that:
   - Stores the value as-is on the runtime instance (`_attachedHosts` backing field; option A per slate — store the strings; cost is two strings; persist-back trivial)
   - Resolves both paths via `StuffApi.singleton` (lazy-clones the hosts if needed)
   - Calls `BoundaryApi.attachExistingBoundary({ boundary: this, hostA, hostB })`
   - Idempotency: checks `this.getAnchorA() && this.getAnchorB() && getAdornedTo() matches both`; if so, no-op. If mismatch (half-attached or attached to wrong hosts), throw with diagnostic.
   - Per declarative-content-slate § `attachedHosts` on `Boundary` templates.
10. **Door is NOT extended this way** — explicitly DO NOT add `attachedHosts` to `lib/boundary/Door.ts`. Doors are wired transitively through the `exits` field shape (when an exit declares `door:`, the existing `addBidirectionalExit({ door })` already calls `attachExistingBoundary` for the door's anchor pair as a side effect). The slate makes this distinction explicit and the planner should preserve it. Per declarative-content-slate § `attachedHosts` § "Doors are NOT declared this way."

10a. **`lib/boundary/Sealable.ts` boolean-field naming cleanup** (bundled with this build per § 4.13 of the plan). Rename `_isOpen` → `_open`, `setIsOpen` → `setOpen`, persistent field `isOpen` → `open`, YAML doc key `isOpen:` → `open:`. The `isOpen()` getter stays unchanged (predicate form belongs on the getter only). Grep for and update all callers (`door.setIsOpen(...)` → `door.setOpen(...)`), all YAML seeds with `isOpen:`, all tests. Convention is documented in `feedback_boolean_field_naming` — boolean fields use noun on field/setter/YAML, predicate on getter.
11. **`docs/subsystems/boundary.md` updates** — comprehensive update capturing:
   - New `setAttachedHosts` setter on Window and other non-Door Boundary subclasses
   - The Door-via-exit transitive wiring path made explicit (a note that Door templates don't declare `attachedHosts`)
   - The "setter with side effects" pattern (cross-reference spatial.md's documentation of the same pattern)

**Tests** (planner specifies exact files/locations):

12. **Unit tests per setter** — covering: happy-path side effect fires; idempotency on re-set with same value (no-op); conflict on re-set with different value (throws with both seed paths); async behavior under lazy resolution (deps lazy-clone correctly); construction-sentinel interaction (setter touches other Stuff during hydration without breaking invariants); cycle protection via `#inFlightClonePaths` (a `applyExits` chain that loops back to the source room doesn't infinite-recurse).
13. **Integration tests** —
   - **Cardinal-rule tightening**: intra-zone non-cardinal exit throws; cross-zone non-cardinal exit succeeds when destination resolves to a Location in a different zone; lazy resolution path (destination resolved later) still validates correctly.
   - **FolderZone composability**: a FolderZone child of a SpatialZone parent inherits correctly via `ZoneApi.resolveZoneField`; zone-derivation walk correctly skips FolderZones.
   - **Full structural-field-shape integration**: a small test fixture (one CartesianZone, two rooms with `coords` + `exits`, one Window with `attachedHosts` connecting them) hydrates lazily on first `StuffApi.singleton` access and the wiring comes out correct end-to-end. (This is the substrate-only version of the Duncan Hall demo — no NPCs, no content prose, no PopulatesMixin yet.)

### Out of scope (with reasons)

- **`PopulatesMixin` + `populates:` field shape** — stuff subsystem, separate coherent build (own requirements doc → own plan → own implementation).
- **`Login.enter()` consults `avatar.container`** — connection subsystem, one-line change; can piggyback on a later build.
- **`container:` top-level field on Template** — templates subsystem, ships with the stuff/PopulatesMixin build (closely related to spawn shape).
- **Eternal University content (YAML seeds)** — no content authoring in this build; pure substrate.
- **Demo wiring** — no `DEFAULT_STARTING_LOCATION_PATH` change, no character-creation hooks.
- **Avatar persist-back** — orthogonal subsystem work; not blocked by this build, doesn't block this build.
- **Lounge (Phase 2 of Eternal U)**, reset/respawn substrate, boot-time content validator — all explicitly deferred per slate.

### Deliberately preserved as design reference, not implemented

- **`SphericalZone` resource-boundary / inheritance-walk concerns** beyond what `ZoneApi.resolveZoneField` provides. Future inheritance use cases (celestial profile, gravity, biome family) consume the new helper but aren't designed in this build.

## Open questions for the planner

The planner must resolve these before producing the plan. Some require reading code; some require small design calls. None should reopen the slate's design.

1. **Hydrator setter-calling behavior** — Read `packages/server/src/mud/lib/persistence/PersistentHydrator.ts` (or wherever the Hydrator lives) and document:
   - Naming convention: does Hydrator look for `setX`, `set_x`, or both?
   - Sync vs async: does Hydrator `await` setter return values? The setters in this build (`setCoords`, `applyExits`, `setAttachedHosts`) need to be async because they call `StuffApi.singleton` (which is async per the slate's pseudocode). If Hydrator doesn't currently await setters, that's a prereq fix the planner must include.
   - Failure handling: what happens if a setter throws during hydration? Does the whole clone abort, or does the field silently fail?
2. **Construction sentinel interaction** — Setters in this build touch *other* Stuff via `StuffApi.singleton`. During hydration, the host Stuff is inside the construction sentinel. Is it safe to touch other Stuff (especially other in-flight clones) from inside that window? Read `docs/subsystems/lifecycle.md` and the construction sentinel code; document any constraints the setter must respect (e.g., "must use lazy resolution, must NOT touch peers via direct ref; cycle guard relied upon for safety").
3. **Pattern A vs Pattern B on `Window.attachedHosts`** — The field is declared Pattern A (string paths). The slate explicitly chose Option A (store the string array on the runtime instance, persist-back writes it back). Verify this is consistent with how the Hydrator handles persistent fields and that the runtime Stuff has a backing slot (typically `_attachedHosts`) the setter writes into.
4. **Cardinal-rule tightening — lazy validation seam** — **Resolved at plan time as eager path-based.** Originally framed as needing a deferred-validation hook (in case the destination wasn't yet resolved at `addExit` time). Resolution: zone derivation is path-based — `ZoneApi.resolveZoneForPath` walks template ancestry to compute zones without loading the destination room. The Exit always carries the destination's templatePath, so the check can be eager. `CartesianLocation.addExit` becomes async; no flag on `Exit`, no extension to `verifyOutboundExits`. See plan §4.2 for the concrete shape.
5. **`SphericalZone.addLocation` shape** — Does this method exist today? Read `lib/spatial/SphericalZone.ts`. If not, add it parallel to `CartesianZone.addLocation` so `setFocus` has something to call. If it does exist, use it as-is.
6. **HMR composition** — A class swap (`HotReloadApi.reload(path)`) re-fires `postRegister` on existing instances — does it also re-trigger setters on existing fields? Verify in `docs/subsystems/hot-reload.md` and `lib/stuff/HotReload.ts`. Tests must cover: HMR-reload a Window class; verify `setAttachedHosts` doesn't double-attach (the idempotency check should hold).
7. **`ZoneApi.resolveZoneField<T>` return shape** — When walking template-ancestry, what happens at the universe-root? Return `null`, throw, or fall through to a settings-style default chain? Per zone-architecture-slate § Inheritance walk, the chain ends at "universe default" — define what that means concretely (probably a `resolveSetting`-style fallback under a `world.zone.*` namespace, but the slate isn't prescriptive). Pick a shape; document it.
8. **Generic FolderZone class name** — `FolderZone` is the lean per zone-architecture-slate § Open questions §1. Confirm.
9. **`applyExits` map shape — `Map` or plain object?** — TypeScript map (`Record<string, ExitSpec>`) is cleaner for YAML hydration; `Map<string, ExitSpec>` is more typed but YAML serializes to objects naturally. Pick a shape; document the YAML-to-runtime translation if non-trivial. (Note: `exits` is an instruction field per `feedback_property_vs_instruction_fields`; there's no paired getter on the spec, so the shape question is purely about applier input.)
10. **Test fixture location** — Where do the integration tests for cross-subsystem behavior live? `lib/spatial/__tests__/`, `lib/boundary/__tests__/`, `lib/zone/__tests__/`, or a new shared location? Look at existing test layout precedent. Note that existing `Zone.test.ts` and `SpatialZone.test.ts` move with their source files to `lib/zone/__tests__/`.

## Acceptance criteria

The build is **done** when all of the following hold:

- [ ] All 13 deliverables ship and pass their tests.
- [ ] `pnpm test` passes across the monorepo with no regressions in spatial or boundary tests.
- [ ] `pnpm build` succeeds.
- [ ] `pnpm lint` passes.
- [ ] `docs/subsystems/spatial.md` and `docs/subsystems/boundary.md` are updated; both slates' "Once shaped into formal requirements" sections for their spatial/boundary portions are fully addressed.
- [ ] The integration test (deliverable #13) — a small CartesianZone with two rooms, exits between them, and a connecting Window — passes end-to-end starting from lazy `StuffApi.singleton` access of one room.
- [ ] No content (YAML seeds) is added in this build. No changes to `bootstrap.ts`. No changes to `DEFAULT_STARTING_LOCATION_PATH`. No new helper class, manager, or framework substrate beyond what's listed above.
- [ ] The "Open questions for the planner" section above is answered in the plan doc (or deliberately deferred with a stated reason).

## Architectural constraints (load-bearing — DO NOT compromise)

The planner and the build agent must hold these rules. They are documented in CLAUDE.md and the related feedback memories but worth restating:

- **Content has no Api class.** This build is substrate, not content; there should be no temptation to add `EternalUApi` or anything similar. Just substrate.
- **No new registries.** This build does NOT introduce any registry singletons. `ZoneApi.resolveZoneField` is a stateless helper; `FolderZone` is a class; the cardinal-rule tightening is an in-place modification. No registry.
- **No new substrate beyond what's listed.** No `WiringSynthesizer` class. No dep extractor. No `BootstrapAction` interface. No `seedOnlyFields` flag. No central `collectRefs`. These were all explicitly rejected in the slate; do not re-introduce them.
- **Content is lazy-loaded.** This build does NOT add content templates to the bootstrap manifest. The bootstrap manifest stays content-free; content lazy-loads via existing `StuffApi.singleton`/`clone` with `#inFlightClonePaths` cycle guard.
- **Setter-with-side-effects is the pattern, not a special hydrator/marshaller.** No new Hydrator subclass; no new field-shape marshaller. The setters use the existing Hydrator behavior of "call setter where defined" plus do cross-object work as part of normal Stuff-class methods. If Hydrator currently doesn't await async setters, that's a small prereq fix to support the existing pattern, not new framework substrate.
- **Don't span beyond zone + spatial + boundary.** Stuff, connection, and templates subsystems do NOT get touched in this build — even if the planner sees adjacent work that would be convenient. Those are separate coherent builds. The Zone hierarchy move (per plan §3.2) does touch `lib/home/`, `lib/biome/`, `lib/race/` via mechanical import-path updates, but those edits are not substantive subsystem changes.

## What the planner produces

A plan document at `docs/plans/spatial-boundary-substrate-plan.md` (or planner's choice of filename) containing:

- Resolved answers to each "Open question for the planner" item, with citations to code/docs that informed the answer.
- A file-by-file breakdown of what changes (new files, modified files, lines affected).
- Test specifications (filenames, test names, what each verifies).
- Wave structure if the planner identifies any sequencing — e.g., "Hydrator setter-await fix lands first because everything else depends on it," "FolderZone class lands second because tests for cross-zone exits use it," etc.
- Risks and mitigations specific to this build.
- An explicit re-statement of what's OUT of scope so the build agent doesn't accidentally pull in adjacent work.

## Followup builds enabled by this one

Once this build ships, the remaining substrate from the declarative-content-slate is independently ship-able:

- **Stuff/PopulatesMixin build** — `lib/stuff/Populates.ts`, the singleton-vs-clone dispatch, postRegister cascade, cycle protection, containment.md updates. Plus the `container:` top-level field on Template (small but related — same spawn-shape design).
- **Connection/Login starting-location build** — one-line change to `Login.enter()` to consult `avatar.getContainerPath()`, fall back to `DEFAULT_STARTING_LOCATION_PATH`. Tiny; piggyback on another build.
- **Eternal University Phase 1 content authoring** — YAML seeds for Duncan Hall, demo wiring (`DEFAULT_STARTING_LOCATION_PATH` change), polished prose. Pure content; no substrate.

Each is its own coherent unit; none re-touches spatial or boundary.
