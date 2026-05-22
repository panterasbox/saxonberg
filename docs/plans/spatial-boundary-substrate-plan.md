# Spatial + Boundary substrate — Implementation Plan

---

## 0. Reading guide for the build agent

This plan drives a build agent who has read the requirements doc at `docs/requirements/spatial-boundary-substrate-requirements.md` and the two source slates (`zone-architecture-slate.md`, `declarative-content-slate.md`) but not the conversation in which this plan was written.

Required reading before starting:
- `docs/requirements/spatial-boundary-substrate-requirements.md` (input contract)
- `docs/slates/zone-architecture-slate.md`, `docs/slates/declarative-content-slate.md`
- `docs/subsystems/spatial.md`, `docs/subsystems/boundary.md`, `docs/subsystems/templates.md`, `docs/subsystems/persistence.md`, `docs/subsystems/lifecycle.md`, `docs/subsystems/hot-reload.md`
- `docs/ref-shapes.md`
- `CLAUDE.md`

When this plan and the requirements doc disagree, the requirements doc wins. When the requirements doc and the slates disagree, the slates win.

---

## 1. Overview

This build extends three subsystems — **spatial**, **boundary**, and a new **zone** subsystem (carved out of `lib/spatial/`) — to ship the structural-field-shape side of the declarative-content slate and the cardinal-rule/FolderZone/`resolveZoneField` side of the zone-architecture slate. After this build, all three subsystems are complete for both slates' needs; the remaining slate substrate (`PopulatesMixin`, `container:` template field, `Login.enter` change) ships in separate builds.

The new `lib/zone/` subsystem holds the Zone-hierarchy roots (`Zone`, `SpatialZone`, the new `FolderZone`) that previously lived under `lib/spatial/`. Concrete spatial-coordinate zones (`CartesianZone`, `SphericalZone`) stay in `lib/spatial/` — they ARE spatial. The split makes the semantic boundary honest: zone-hierarchy concerns live in `lib/zone/`; coordinate-bearing zone concerns live in `lib/spatial/`. See § 3.2 for the move plan.

Tangible completion criterion (from requirements): a content author can author a CartesianZone with rooms (`coords:` + `exits:`) plus a Window connecting two rooms via `attachedHosts:`, hydrate lazily via `StuffApi.singleton`, and the whole graph wires itself with no TypeScript glue.

### Wave structure

Two waves. The sequencing dependency is real: **Wave 1's Hydrator prereq fix is what makes Wave 2's async setters with side effects work at all.** Without it, `target[field] = data[field]` (`PersistentHydrator.ts:77`) discards Promise return values from async work, and the new setters' `await StuffApi.singleton(...)` calls would fire-and-forget.

- **Wave 1 — Hydrator two-phase dispatch fix + `ZoneApi.resolveZoneField` + Zone-subsystem carve-out (Zone, SpatialZone, FolderZone in `lib/zone/`).** Pure prereqs. Lands first because the setters in Wave 2 depend on the Hydrator's awaiting behavior; also because the cardinal-rule check in Wave 2 uses `ZoneApi.resolveZoneForPath` against zones that may have moved. Tests in this wave are pure unit tests of the Hydrator, the new helper, and the moved zone classes.
- **Wave 2 — Spatial setters + Boundary setters + cardinal-rule tightening + tests.** Everything in the requirements doc's deliverable list other than the Wave 1 prereqs.

Doc updates (`spatial.md`, `boundary.md`) land at the end of Wave 2.

---

## 2. Open-question resolutions (from requirements § Open questions for the planner)

Each resolution cites code (`file:line`) that grounded the decision.

### Q1 — Hydrator setter-calling behavior

**Q.** Naming convention; sync vs async; failure handling.

**Resolution.**

- **Today's behavior** (`PersistentHydrator.ts:49-80`): `hydrate()` is async; per field it does `target[field] = data[field]` (`PersistentHydrator.ts:77`) for ordinary fields, OR `target[field] = marshaller.fromStored(raw)` for marshalled fields (`PersistentHydrator.ts:73`). Bracket-assignment invokes the `set field` accessor when one is defined on the prototype (this is JS-spec). The contract is documented in `lib/stuff/Hydrator.ts` (the interface file) and re-stated in `docs/subsystems/templates.md` "Hydrator contract."
- **Naming convention today.** Hydrator looks for `field` (the persistent-field name) as a property — that resolves to either a public data field or an accessor pair. Existing accessor pairs are typically named with the same name as the persistent field (e.g., `Window.baseTransmissivity` accessor at `Window.ts:73-89`, persistent-field name `baseTransmissivity` at `Window.ts:59`). Public methods like `setBaseTransmissivity` (`Window.ts:95`) exist as the inter-Stuff contract surface but the Hydrator does NOT call them today.
- **Sync vs async.** Hydrator's loop does NOT await the assignment expression. Bracket-assignment's value is the right-hand value (JS-spec), not the setter's return. A JS `set` accessor cannot be `async`. So any async side effect the setter wants to perform is fire-and-forget today, which would break new-setter correctness.
- **Failure handling.** A setter that throws synchronously during hydrate propagates up: `StuffApi.#registerAndInit` (`api/stuff.ts:520-524`) catches in its own try/catch, unregisters the in-flight proxy, and re-throws. So a throwing setter aborts the whole clone cleanly. Half-initialized Stuff never lingers (`docs/subsystems/templates.md` "Failure rollback").

**Prereq fix (in Wave 1):** Change `PersistentHydrator.hydrate` to a **two-phase dispatch** (per § 5.7 Property vs instruction fields):

**Phase 1 — property fields.** For each entry in `MixinApi.getAllPersistentFields(backing.constructor)`, look for a method named `set<PascalCase(field)>` on the target (e.g., `setCoords` for `coords`, `setAttachedHosts` for `attachedHosts`, `setBaseTransmissivity` for `baseTransmissivity`). If found, call `await target[methodName](value)`; otherwise fall back to `target[field] = value` bracket-assign.

**Phase 2 — instruction fields.** For each entry in `MixinApi.getAllInstructionFields(backing.constructor)` (a new helper paralleling `getAllPersistentFields`), look for a method named `apply<PascalCase(field)>` on the target (e.g., `applyExits` for `exits`, `applyPopulates` for `populates`). The applier is **required** — no bracket-assign fallback for instruction fields (absent `applyX` is a bug). Call `await target[methodName](value)`.

Phase 1 runs first so all property fields are settled before any instruction is applied. Both phases complete before `postRegister` fires.

This preserves backwards compatibility:
- Existing public setter methods (e.g., `setBaseTransmissivity` at `Window.ts:95`) just synchronously delegate to the accessor pair. They return `undefined`. `await undefined` resolves immediately; behavior is identical to the previous `target[field] = value` path.
- For mixins that have a persistent field but no `setX` method (`CartesianZone.persistentFields = ['name', 'cellSize']` at `CartesianZone.ts:69` — `Zone.setName` at `Zone.ts:41` and `CartesianZone.setCellSize` at `CartesianZone.ts:50` both exist as methods, so this works), the method-dispatch covers them; for any persistent field without a `setX`, bracket-assign continues to work.
- Marshalled fields keep their existing path: marshaller produces the runtime value, then dispatch through the same method-first / bracket-fallback logic.

This is "the existing pattern made async-safe" — NOT a new framework substrate. Per requirements § Architectural constraints: "If Hydrator currently doesn't await async setters, that's a prereq fix the planner must include."

### Q2 — Construction sentinel interaction

**Q.** During hydration, the host is past construction but inside the hydrate/postRegister phase. Is it safe for a setter to touch other Stuff via `StuffApi.singleton`?

**Resolution: yes, with two caveats.**

- The construction sentinel (`Stuff.#expectingConstruction` at `Stuff.ts:383`) is flipped TRUE by `_beginConstruction()` (`Stuff.ts:403-408`), consumed (flipped FALSE) inside the base constructor at `Stuff.ts:501`, and the surrounding `try/finally` in `StuffApi.clone` restores the prior value via `_endConstruction(prev)` (`Stuff.ts:418-421`). By the time hydrate runs (`api/stuff.ts:515`), the sentinel is FALSE for the host. Nested `StuffApi.clone` for OTHER paths from within a setter flips the sentinel for THAT clone independently; the `prev` return value of `_beginConstruction` supports nesting cleanly.
- **The in-flight clone guard (`StuffApi.#inFlightClonePaths` at `api/stuff.ts:80`, used at `api/stuff.ts:216-230`) is the protection mechanism.** If setter on host A calls `singleton(B)` and B's setter (during its own hydrate) calls `singleton(A)`, the cycle guard catches the re-entry and throws "circular template dependency" (the chain is reported in the error message at `api/stuff.ts:217-223`). This is the right behavior — content cycles are bugs.
- **Caveat 1 — host is registered but not "complete."** `StuffApi.register` (`api/stuff.ts:501`) runs BEFORE hydrate (`api/stuff.ts:515`), so the host is in the `byId` and `byTemplatePath` indexes during hydrate. Other code paths can resolve the in-flight host via `StuffApi.singleton` — this is the load-bearing ordering documented in `docs/subsystems/lifecycle.md` "What Registration Actually Does." For our setters, this means: if A's `setAttachedHosts` resolves B via `singleton(B)` and B's setter then resolves A via `singleton(A)`, A is already in the index (the bucket lookup at `api/stuff.ts:382` returns the proxy). No infinite recursion; the cycle guard fires only when the same templatePath is in-flight in `clone` itself, not in `singleton`. So a bidirectional reference where both sides are already registered (one is in-flight) resolves correctly: B's call to `singleton(A)` returns the already-registered A, no nested clone, no cycle.
- **Caveat 2 — partial state.** The host is registered but its own hydrate hasn't finished. Setters in this build only READ other Stuff's identity (via `singleton`) — they don't read the partially-hydrated host's state from outside. So this is fine. The setter that fires from outside (B's setter calls A's methods? — no, our setters only call `BoundaryApi.attachExistingBoundary` and `CartesianZone.addLocation`; neither reads host state in a way that would surface partial-hydrate state).

**Practical guidance for the build agent.** The new setters MUST:
- Use `await StuffApi.singleton(path)` to resolve referenced templates (lazy clone if not loaded). Never store live refs to peers in persistent fields (per `docs/ref-shapes.md` Pattern A).
- Be idempotent: if the side-effect is already applied (room already at coords; window already attached to these hosts), no-op. This is what makes re-hydrate / HMR / cycle-loop-self-call safe.
- Throw on conflict (mismatch with already-applied state) per slate § "drift policy" decision.

### Q3 — Pattern A vs B on `Window.attachedHosts`

**Q.** Pattern A (string paths stored on instance, persist-back trivially writes them) is what the slate chose. Verify Hydrator handles it; verify a backing slot.

**Resolution: Pattern A confirmed; backing slot is `_attachedHosts: [string, string] | null`.**

- The slate decision (`declarative-content-slate.md:222-223`): "stored on the runtime instance as the original string array (cost: two strings per boundary). Persist-back writes it back unchanged. The alternative — runtime-only `anchorA`/`anchorB`, with persist-back deriving paths via `anchorA.getAdornedTo().getTemplatePath()` — would require a one-off custom marshaller for this field. Not worth the complexity for two strings of memory."
- The Hydrator's existing path handles this natively: a `[string, string]` is just JSON; it round-trips through Mongo via the standard scalar-default rule (`docs/subsystems/persistence.md` "Scalar-Default Rule" — "arrays of scalars" are covered). No marshaller needed.
- Per `ref-shapes.md` Pattern A § "Field naming": the backing slot is `protected _attachedHosts: [string, string] | null = null;` (Path suffix; null default). External access goes through `getAttachedHosts()` / `setAttachedHosts()`.
- The setter has side effects (attach the Boundary), so it follows the setter-with-side-effects pattern (not just a strict path-store-and-resolve Pattern A like `_materialPath`).

### Q4 — Cardinal-rule tightening — non-cardinal cross-zone exits

**Q.** When `addExit` is called with a non-cardinal direction, how do we determine if the destination is in another zone (and thus allowed)? The requirements doc framed this as needing a "deferred validation hook" for cases where the destination wasn't yet loaded.

**Resolution: eager path-based check via `ZoneApi.resolveZoneForPath`. No deferred mechanism needed.**

Today's `CartesianLocation.addExit` (`CartesianLocation.ts:35-44`) checks `NavigationApi.isCardinalDirection(direction)` only — if not cardinal, throw unconditionally. New behavior: for a non-cardinal direction, resolve the source's and destination's zones from their templatePaths and require them to differ.

Key insight: **zone derivation is path-based** (per zone-architecture-slate § "Zone derivation"; existing `ZoneApi.resolveZoneForPath` walks template ancestry to find the nearest `SpatialZone`). The destination room doesn't need to be loaded as a Stuff to know its zone — its templatePath alone suffices. Lazy refs aren't a problem because the Exit always carries the destination's templatePath (either directly via `_destinationPath` or via `destination.getTemplatePath()` when a live ref exists).

Concrete shape in § 4.2. Summary of the impact:

- `addExit` becomes **async** on `CartesianLocation` (overrides the sync parent). `ZoneApi.resolveZoneForPath` may call `StuffApi.singleton` internally to materialize zones; we await it for correctness. Eager Zone instantiation gives the check a real Zone object that other code can ride on (per user direction).
- No new field on `Exit`. No new state.
- No verifier extension. `Exitable.verifyOutboundExits` is untouched.
- No new helpers (other than the existing `ZoneApi.resolveZoneForPath`).

Note: this override fires only on `CartesianLocation`. `SphericalLocation` doesn't override `addExit` (per `SphericalLocation.ts` — no override exists), so semantic labels remain unrestricted on Spherical locations.

### Q5 — `SphericalZone.addLocation` shape

**Q.** Does it exist? If not, add it.

**Resolution: exists, with the right shape.**

`SphericalZone.addLocation(location: Location): void` at `SphericalZone.ts:39-47` requires `MixinApi.isSphericalCoordinates(location)` and stamps the focus index. There's no `(x, y, z)` parameter — Spherical doesn't take separate args because the coordinate tuple is already on the location's `SphericalCoordinatesMixin` (`SphericalCoordinates.ts:34`).

For `setFocus({rho, theta, phi, radius})`, the setter needs to:
1. Stamp `this.coordinates = [rho, theta, phi]` via `setCoordinates` and `this.radius = radius` via `setRadius` (both at `SphericalCoordinates.ts:40-41, 65-67`).
2. Call `this.getZone()?.addLocation(this)` to register with the zone.

The existing `SphericalZone.addLocation` is called WITHOUT coordinate args — the location already has its focus set. So `setFocus` writes the coords first, then registers.

For idempotency, add a tiny helper on `SphericalZone`: `hasLocationAtFocus(focusTuple: [number, number, number], location?: SphericalLocation): boolean` that returns true iff the location's focus matches the supplied tuple AND (if `location` arg supplied) the same instance is at that key. Parallel to the new `CartesianZone.hasRoomAt`. (The slate doesn't strictly require this for Spherical, but the parallel structure is what makes the test/idempotency story uniform.)

### Q6 — HMR composition

**Q.** A class swap re-fires `postRegister` on existing instances — does it also re-trigger setters?

**Resolution.** The premise in the requirements doc is INCORRECT. Per `docs/subsystems/hot-reload.md` "What's intentionally out of scope" — "Existing instances keep their old prototype chain. No state migration to a new blueprint" — and the surrounding state-machine section: a class swap re-evaluates the module under a new cache-busted URL, producing a fresh class identity. Existing instances retain their old prototype chain; their setters and `postRegister` do NOT re-fire. New clones (via `StuffApi.clone` after the swap) pick up the new class.

So HMR-correctness for the new setters is just: **a new clone after destruct of the prior instance correctly re-runs the setter, and the setter sees a clean slate on the new instance.** Idempotency matters when:
- Hot-reload of a hydrator class (rare), per `docs/subsystems/hot-reload.md` "Hydrators" — destruct the cached hydrator singleton, next clone of a backing re-creates it.
- A user re-clones an existing singleton template (after explicit destruct): the new instance's `setAttachedHosts` resolves the same hostA/hostB (still loaded), attaches anchors; the hosts had old anchors from the prior boundary BUT those were cleared by the prior boundary's `onDestruct` (`Boundary.ts:223-231`). So fresh attach works.

Test coverage (in Wave 2): one test that explicitly destructs a Window, re-clones it via singleton, and verifies the boundary attaches cleanly to the same hosts. No "double-attach" failure mode arises in practice; the idempotency in `setAttachedHosts` exists for the in-flight cycle-loop case (`#inFlightClonePaths` allows other resolution paths to re-call the setter mid-clone).

### Q7 — `ZoneApi.resolveZoneField<T>` return shape

**Q.** What happens at the universe-root? Return null, throw, fall through to a settings-style default chain?

**Resolution: return `null`. No throw. No settings-namespace coupling.**

- The slate (`zone-architecture-slate.md:240-247`) defines: `static resolveZoneField<T>(zone: Zone, fieldName: string): T | null`.
- The existing parallel `ZoneApi.resolveZoneForPath` returns `null` at universe-root (`api/zone.ts:147`) — return-null is the established convention.
- Settings-style fallback (`resolveSetting` at `Environment.ts:416-421`) IS the right mechanism for cross-host setting resolution but is consumer-side concern: a caller wanting "celestial profile, fall back to universe default" calls `ZoneApi.resolveZoneField(zone, 'celestialProfile') ?? resolveSetting(host, 'world.zone.celestialProfile.default')` — composing the two helpers. `resolveZoneField` itself stays pure: walk template-ancestry, read field on each ancestor's singleton zone instance, return first non-null/non-undefined value, return null at root.
- Field-read mechanism: use reflective property access on the resolved zone instance. `(zone as any)[fieldName]` is the simplest shape. Per inter-Stuff contract (`CLAUDE.md` "Inter-Stuff Contract: Methods Only"), the right surface is to look for `get<PascalCase(fieldName)>()` first and fall back to direct property access. We'll use a tiny local helper.

Concrete signature & body sketch:

```ts
// api/zone.ts
/**
 * Walk template-tree ancestry from `zone` upward, reading `fieldName`
 * on each ancestor SpatialZone (FolderZones are walked too — they
 * carry zone-flavor defaults even without a coordinate frame).
 * Returns the nearest non-null value, or null at universe-root.
 */
public static async resolveZoneField<T>(
  zone: Zone,
  fieldName: string
): Promise<T | null> {
  const ownPath = (zone as unknown as Stuff).getTemplatePath();
  if (!ownPath) return readField<T>(zone, fieldName) ?? null;

  // Read on the zone itself first.
  const own = readField<T>(zone, fieldName);
  if (own != null) return own;

  // Walk ancestor paths; each ancestor may resolve to a Zone singleton.
  for (const ancestor of Template.ancestorPaths(ownPath)) {
    const ancestorTpl = await Template.findByPath(ancestor);
    if (!ancestorTpl) continue;
    if (!(await ZoneApi.isFolderClass(ancestorTpl.class))) continue;
    const ancestorZone = await StuffApi.singleton<Zone>(ancestor);
    const v = readField<T>(ancestorZone, fieldName);
    if (v != null) return v;
  }
  return null;
}
```

`readField` is a local helper that tries `obj['get' + capitalize(fieldName)]?.()` first; if no such method, accesses `obj[fieldName]` directly. Defensive: a non-existent property returns `undefined`, which we treat as "not defined here, walk further."

Note: `isFolderClass` (`api/zone.ts:67`) is used, not `isSpatialZoneClass`. Per the slate (`zone-architecture-slate.md:228-237`), FolderZones DO participate as inheritance nodes for zone-carried defaults, even though they don't anchor a spatial grid. The narrower `isSpatialZoneClass` is for `Stuff.zone` stamping.

### Q8 — Generic FolderZone class name

**Q.** Confirm `FolderZone`.

**Resolution: `FolderZone`.** Confirmed per slate § Open questions §1 (`zone-architecture-slate.md:527-529`: "Settle at implementation. Lean `FolderZone`."). File: **`lib/zone/FolderZone.ts`** (in the new `lib/zone/` subsystem — see § 3.2 — not under `lib/spatial/`, because FolderZone is a generic Zone-hierarchy class, not a spatial-coordinate concept). Bare `extends Zone {}` body, mirroring `HomeZone.ts:29-31` shape (`lib/home/HomeZone.ts`).

### Q9 — `applyExits` map shape — Map or plain object?

**Q.** TypeScript `Record<string, ExitSpec>` or `Map<string, ExitSpec>`?

**Resolution: plain object — `Record<string, ExitSpec>`.**

- YAML serializes naturally to plain objects (`exits: { south: { ... } }`). The Hydrator passes `data.exits` through as a plain object.
- The runtime storage on `ExitableMixin` is already a `Map<string, Exit>` for live Exit instances (`Exitable.ts:130`). The persistent field shape and the runtime storage are deliberately different things; the setter translates.
- TypeScript shape:

```ts
export interface ExitSpec {
  destination: string;       // templatePath of destination Location
  door?: string;             // templatePath of Door (optional)
  bidirectional?: boolean;   // default: true for cardinals, false otherwise
  opposite?: string;         // required when bidirectional && non-cardinal
  hidden?: boolean;
  blocked?: boolean;
  muffled?: boolean;
  noFollow?: boolean;
  oneWay?: boolean;
  messageIn?: string;
  messageOut?: string;
  media?: string[];
}

applyExits(map: Record<string, ExitSpec>): Promise<void>;
```

`bidirectional` defaults per slate § Open questions §1 (`declarative-content-slate.md:509-510`): true for cardinals (`opposite:` inferred via `NavigationApi.invertDirection`), false-or-explicit-opposite for non-cardinal labels.

### Q10 — Test fixture location

**Q.** Where do integration tests live?

**Resolution.**

- Unit tests for spatial setters: `packages/server/src/mud/lib/spatial/__tests__/CartesianLocation.coords.test.ts`, `SphericalLocation.focus.test.ts`, `CartesianZone.hasRoomAt.test.ts`, `FolderZone.test.ts`, `CartesianLocation.cardinalRule.test.ts`.
- Unit tests for boundary setters: `packages/server/src/mud/lib/boundary/__tests__/Exitable.applyExits.test.ts`, `Window.setAttachedHosts.test.ts`.
- Unit tests for ZoneApi.resolveZoneField: `packages/server/src/mud/api/__tests__/zone.resolveZoneField.test.ts` (existing folder per repo convention; `api/__tests__/` is where API tests live).
- Hydrator prereq fix tests: `packages/server/src/mud/lib/persistence/__tests__/PersistentHydrator.test.ts` (new file; existing test pattern lives alongside the existing `Marshaller.test.ts` at `lib/persistence/__tests__/`).
- Integration test for deliverable #13 (full lazy hydrate of two-rooms + Window): `packages/server/src/mud/lib/spatial/__tests__/declarativeContent.integration.test.ts`. Spatial-side because the lazy zone+rooms walk dominates the test fixture; the boundary side is a peripheral participant. Existing precedent for cross-subsystem integration tests living in the consumer subsystem: `boundary/__tests__/Window.integration.test.ts` is multi-subsystem (uses LightApi from perception, ContainmentApi from spatial, plus the boundary substrate) and lives in boundary because that's the new thing under test. Same logic: this build's "new thing" is declarative content lazy-hydrate, but the consumer fixture is a CartesianZone — spatial-side. Either folder is defensible; pick spatial for the integration test, boundary for the Window-specific tests.

---

## 3. Wave 1 — Prereqs (Hydrator two-phase fix, `ZoneApi.resolveZoneField`, Zone-subsystem carve-out)

These deliverables have no dependencies on each other and can land in any order, but they all must land before Wave 2 begins.

### 3.1 `lib/persistence/PersistentHydrator.ts` — method-dispatch + await fix

**Change.** Rewrite the per-field loop body to prefer `await target.set<PascalCase(field)>(value)` when that method exists, otherwise fall back to bracket-assign.

**Signature unchanged** — `hydrate(backing, data)` stays `async`.

**Implementation sketch:**

```ts
// inside hydrate() per-field loop (PersistentHydrator.ts:57-79):
const setterName = 'set' + field[0].toUpperCase() + field.slice(1);
const setter = (target as unknown as Record<string, unknown>)[setterName];
if (typeof setter === 'function') {
  // Async-safe: await even if the method is sync (await of non-Promise resolves to the value).
  await (setter as (v: unknown) => unknown | Promise<unknown>).call(target, value);
} else {
  target[field] = value;
}
```

`value` is either the raw `data[field]` (no marshaller) or `marshaller.fromStored(raw)` (marshalled). The dispatch branch is the same after the value is computed.

**Why this is a small, additive change, not new substrate.** It's a single change inside the existing Hydrator's existing loop. No new class, no new interface, no new mixin. It preserves the existing contract for every existing field: a `setX` method that just delegates to an accessor (the common shape) still fires the accessor (the existing validation site). The only difference is the Hydrator's loop becomes await-honoring.

**Backwards compatibility audit.** For every existing persistent field across the codebase, the field's "name" maps to a `set<PascalCase>` method as follows (build agent: do a search for `static persistentFields` and verify before committing):

| Field | Has `setX` method? | Source |
|---|---|---|
| `coordinates` (Cartesian/Spherical) | Yes — `setCoordinates` | `CartesianCoordinates.ts:36`, `SphericalCoordinates.ts:40` |
| `radius` (Spherical) | Yes — `setRadius` | `SphericalCoordinates.ts:65` |
| `open` (Sealable, after rename — was `isOpen`) | Yes — `setOpen` (renamed from `setIsOpen` in this build, per § 4.13) | `Sealable.ts:62` |
| `name` (Zone) | Yes — `setName` | `Zone.ts:41` |
| `cellSize` (CartesianZone) | Yes — `setCellSize` | `CartesianZone.ts:50` |
| `baseTransmissivity`, `aToBOverride`, `bToAOverride`, `colorTint` (Window) | Yes — all four | `Window.ts:95, 143, 182` (overrides via `setDirectionalOverrides`) |
| `shortDescription`, `longDescription` (Visible) | Verify — likely yes | `description/Visible.ts:74` |
| Material / Tangible / Property / Globbable etc. | Verify | various |

The fallback path (`target[field] = value`) handles any field without a `setX` method, so nothing breaks even if a few fields lack the method.

**Edge cases.**
- Setter throws synchronously: caught by the existing rollback in `api/stuff.ts:520-524`. No change.
- Setter throws asynchronously (rejected Promise): the `await` rethrows; same rollback fires. Cleaner behavior than today (today, an async failure inside a setter would be uncaught).
- Setter that returns a non-Promise: `await x` for non-Promise `x` resolves to `x` immediately — no-op behavior identical to non-await.

### 3.2 New `lib/zone/` subsystem — Zone hierarchy roots move out of `lib/spatial/`

**Rationale.** `Zone` is the common parent of both spatial-coordinate zones (CartesianZone, SphericalZone) AND non-spatial folder zones (HomeZone, Biorealm, Clade, the new FolderZone). It's not a spatial concept; it's a hierarchy root. Same with `SpatialZone` — the abstract base for spatial-coordinate zones, but its identity isn't a coordinate frame itself. Both live in `lib/spatial/` today as an early-codebase happenstance.

Moving them to a new `lib/zone/` subsystem signals the right semantic boundary: zone-hierarchy concerns live in `lib/zone/`; only the spatial-coordinate-bearing subclasses (`CartesianZone`, `SphericalZone`) stay in `lib/spatial/`. The new `FolderZone` lands in `lib/zone/` alongside its hierarchy peers.

**Files moved (from `lib/spatial/` to `lib/zone/`):**

- `lib/spatial/Zone.ts` → `lib/zone/Zone.ts`
- `lib/spatial/SpatialZone.ts` → `lib/zone/SpatialZone.ts`

**Files added in `lib/zone/`:**

- `lib/zone/FolderZone.ts` (new, sketched below)

**Files that stay in `lib/spatial/`:**

- `CartesianZone.ts`, `SphericalZone.ts` (concrete spatial-coordinate zones)
- `CartesianLocation.ts`, `SphericalLocation.ts`, `CartesianCoordinates.ts`, `SphericalCoordinates.ts` (spatial primitives)
- `Containable.ts`, `Container.ts`, `Mobile.ts` (containment / locomotion — separate concerns that happen to live in this folder today; out of scope to move now)

**Files that stay in their existing domain folders** (already correct, no change):

- `lib/home/HomeZone.ts`
- `lib/biome/Biorealm.ts`
- `lib/race/Clade.ts` (or wherever it actually lives — build agent verifies)

**Import-path updates required across the codebase.** Every file that imports `Zone` or `SpatialZone` from `lib/spatial/` updates the path to `lib/zone/`. Build agent must:

1. `grep -r "from.*lib/spatial/Zone\|from.*lib/spatial/SpatialZone" packages/server/src/` and update each. Likely 10-30 hits across:
   - `lib/spatial/CartesianZone.ts`, `lib/spatial/SphericalZone.ts` (subclass imports)
   - `lib/home/HomeZone.ts`, `lib/biome/Biorealm.ts`, `lib/race/Clade.ts` (sibling folder-zone subclasses)
   - `api/zone.ts` (`ZoneApi` imports)
   - Various tests under `lib/spatial/__tests__/`, `api/__tests__/`
   - Any code resolving zones via `MixinApi.isZone`, `MixinApi.isSpatialZone`, etc.
2. Class-path validation: any seed YAML or code that references `/lib/spatial/Zone` as a string template path → `/lib/zone/Zone`. Same for `/lib/spatial/SpatialZone`. Grep for the literal strings.
3. Mock / stub references in tests.

The work is mechanical (find-and-replace plus a verify-tests-pass loop). Estimate: 30-60 minutes of build-agent work.

**FolderZone class** (new file at `lib/zone/FolderZone.ts`):

```ts
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
 */

import { Zone } from './Zone';

export class FolderZone extends Zone {
  // No fields, no methods v1.
}
```

**Mirrors `HomeZone.ts` shape exactly.** No `_mixinName`, no methods. The class extends `Zone` (not `SpatialZone`), so `ZoneApi.isSpatialZoneClass` returns false for it (the walk skips it for `Stuff.zone` stamping, per slate § Zone derivation) but `ZoneApi.isFolderClass` returns true (so it satisfies folder/leaf invariant per `templates.md`).

**No `static persistentFields` declaration.** Inherits `Zone`'s `name` via the parent class (verify). `CartesianZone` and `SphericalZone` declare `persistentFields` independently in their subclasses. FolderZone won't need to; if a future content author wants a named FolderZone they can add it then.

**Seed file:** `packages/server/src/mud/seeds/lib/zone/FolderZone.yaml`:

```yaml
class: /lib/zone/FolderZone
data: {}
```

The seed is only needed if content authors point at `/lib/zone/FolderZone` from their own templates (which they will, for organizational folders under `/domain/<team>/`). Build agent: ship the seed file. Note that the class-path string in the seed is `/lib/zone/FolderZone` — the new home, not the old `/lib/spatial/FolderZone`.

### 3.3 `api/zone.ts` — add `resolveZoneField<T>`

**Change.** Add new static method to `ZoneApi`. Body per Q7 resolution above.

Imports already in the file: `StuffApi`, `Template`, `Zone`, `SpatialZone`. Add nothing new at import-level.

**No changes to `isFolderClass` or `isSpatialZoneClass`** — those are reused.

**Test stamp:** `SecurityApi.decorateApiClass(ZoneApi)` already runs at line 151. No change needed; the new method is decorated by the existing call (decoration sweeps all static methods).

### 3.4 Wave 1 tests

**`packages/server/src/mud/lib/persistence/__tests__/PersistentHydrator.test.ts`** (new):

- `it('prefers a set<Field> method over bracket-assign when present')` — define a backing with a method `setFoo(v)` that records the call; hydrate; verify the method was called once with the right value and that bracket-assign did NOT fire.
- `it('falls back to bracket-assign when no set<Field> method exists')` — backing has a plain field and no method; hydrate; verify the field was bracket-assigned.
- `it('awaits async setX methods so side effects complete before hydrate resolves')` — backing has an async `setBar(v)` that completes after a `await Promise.resolve()`; hydrate; assert the side effect observable post-`await hydrate(...)`.
- `it('propagates async setter throws and aborts hydrate cleanly')` — async setter rejects; assert `hydrate()` rejects with the same error.
- `it('marshalled fields still flow through the method-first dispatch')` — backing with a marshalled field whose `setX` method records what the marshaller produced; assert the method received the unmarshalled value.
- `it('skips fields absent from data even when setX is defined')` — existing behavior preservation.

**`packages/server/src/mud/api/__tests__/zone.resolveZoneField.test.ts`** (new):

- Setup: seed-like fixtures using `makeStuffAtPath` to plant zone singletons at `/test/region`, `/test/region/sub`, and various paths.
- `it('returns the value defined on the zone itself when present')` — zone has `getCelestialProfile()` returning a value; resolve; expect same value.
- `it('walks ancestors and returns the nearest non-null value')` — descendant zone has no value; parent folder zone does; expect parent's value.
- `it('returns null when no ancestor defines the field')` — chain has nothing; expect null.
- `it('walks through FolderZones (non-SpatialZone folders are inheritance nodes)')` — chain is `/a (FolderZone, has value) / b (CartesianZone, no value) / c (leaf)`; resolve from `b`; expect `a`'s value.
- `it('handles a Zone without a templatePath gracefully')` — orphan zone (just `makeStuff`, no `_stampTemplatePath`); reads own field; returns null if absent.

**`packages/server/src/mud/lib/zone/__tests__/FolderZone.test.ts`** (new):

- `it('is constructible as a Zone subclass')` — `makeStuff(() => new FolderZone())`; expect instanceof Zone.
- `it('is NOT a SpatialZone')` — `expect(z instanceof SpatialZone).toBe(false)`.
- `it('does not expose location-aware methods (no addLocation, etc.)')` — mirrors `Zone.test.ts:21-30`.
- `it('participates in ZoneApi.isFolderClass()')` — `expect(await ZoneApi.isFolderClass('/lib/zone/FolderZone')).toBe(true)`.
- `it('does not participate in ZoneApi.isSpatialZoneClass()')` — `expect(await ZoneApi.isSpatialZoneClass('/lib/zone/FolderZone')).toBe(false)`.

**Existing `Zone.test.ts` and `SpatialZone.test.ts`** move from `lib/spatial/__tests__/` to `lib/zone/__tests__/` alongside their source files. Test bodies unchanged; only import paths update to reflect the new source location.

---

## 4. Wave 2 — Spatial setters, Boundary setters, cardinal rule, tests

All Wave 2 deliverables depend on Wave 1. The Wave 2 files can be implemented in any order within the wave, but the agent will likely find it cleaner to land in this order: cardinal-rule + Exit additions → spatial setters → boundary setters → integration tests.

### 4.1 (removed) — no Exit field needed

An earlier draft of this plan added an `Exit.pendingCardinalZoneCheck` boolean for deferred cardinal-rule validation when the destination wasn't yet loaded at `addExit` time. **Removed during plan review.** Zone derivation is path-based (`ZoneApi.resolveZoneForPath` walks template ancestry in MongoDB), so the destination room doesn't need to be loaded to know its zone — only its templatePath. The eager check in § 4.2 suffices; no flag, no verifier extension, no deferred validation seam.

See § 8 plan-time scope adjustments for the rationale.

### 4.2 `lib/spatial/CartesianLocation.ts` — relax `addExit` (eager path-based check)

**Change.** Replace `addExit` body. Today's behavior: throw on any non-cardinal direction. New behavior: allow non-cardinal when the destination's templatePath resolves to a *different* zone than the source's.

```ts
public override addExit(exit: Exit): boolean {
  const direction = exit.getDirection();
  if (NavigationApi.isCardinalDirection(direction)) {
    return super.addExit(exit);
  }
  // Non-cardinal — must be cross-zone. The check is path-based:
  // ZoneApi.resolveZoneForPath walks template ancestry to find the
  // nearest SpatialZone, no need to load the destination room.
  const destPath = exit.getDestinationTemplatePath();
  if (!destPath) {
    // Exotic: exit has no destination path (orphan ref). Permissive — allow.
    return super.addExit(exit);
  }
  const sourcePath = (this as unknown as Stuff).getTemplatePath();
  if (!sourcePath) {
    // Source isn't template-shaped (orphan host). Permissive — allow.
    return super.addExit(exit);
  }
  const sourceZone = await ZoneApi.resolveZoneForPath(sourcePath);
  const destZone   = await ZoneApi.resolveZoneForPath(destPath);
  if (sourceZone && destZone && sourceZone === destZone) {
    throw new Error(
      `CartesianLocation.addExit: non-cardinal direction '${direction}' ` +
        `requires the destination to be in a different zone; both source ` +
        `'${sourcePath}' and destination '${destPath}' resolve to zone '${sourceZone.getTemplatePath()}'.`
    );
  }
  return super.addExit(exit);
}
```

**Sync vs async.** `addExit` is synchronous in today's `ExitableMixin` (returns `boolean`). `ZoneApi.resolveZoneForPath` may be async (it calls `StuffApi.singleton` internally to materialize zones). Two paths the build agent picks between:

1. **Make `addExit` async on `CartesianLocation`.** Override the synchronous parent with an async version. Existing callers that `await` it work. Callers that don't (none should exist in production paths since they need the boolean return) need updates.
2. **Add a synchronous path-only sibling** like `ZoneApi.zonePathForLocationPath(locPath: string): string | null` that returns the zone's templatePath without instantiation. Compare strings in `addExit`; sync remains sync.

**Lean: option 1** per user direction ("worth loading the cloning the Zone stuff in case there's any state or later hooks it might need to supply for the consumer"). Eager zone instantiation is cheap (one Stuff per zone), gives the path-derived check a real Zone object that other code can ride on. Build agent: make `addExit` async; verify callers handle the change.

**Zone instantiation cost.** `ZoneApi.resolveZoneForPath` lazy-clones the zone the first time it's resolved for a given path. Subsequent calls hit the singleton cache. For Duncan Hall's first freshman login, the source's zone and destination's zone clone once each; thereafter the check is free. Acceptable.

**No verifier extension.** `Exitable.verifyOutboundExits` stays exactly as it is today. No `pendingCardinalZoneCheck` block at the top of the per-exit loop. No `needsVerification` early-true branch.

**No changes to `Exit.ts`.** No new flag, no new getter/setter for a pending state.

### 4.3 `lib/spatial/CartesianZone.ts` — `hasRoomAt` helper

**Add public method:**

```ts
/**
 * True iff the supplied coordinates currently host a room in this
 * zone. When `room` is provided, the check tightens to "is THIS
 * specific room at those coordinates?" — used by `setCoords` for
 * idempotency (a re-set with the same coords is a no-op).
 *
 * Per declarative-content-slate § coords on CartesianLocation.
 */
public hasRoomAt(x: number, y: number, z: number, room?: Location): boolean {
  const here = this.grid.get(gridKey(x, y, z));
  if (!here) return false;
  return room ? here === room : true;
}
```

`gridKey` is the existing local function at the top of `CartesianZone.ts:30-32`.

### 4.4 `lib/spatial/SphericalZone.ts` — `hasLocationAtFocus` helper

**Add public method:**

```ts
/**
 * Parallel of `CartesianZone.hasRoomAt` — true iff the location at
 * the focus key matches (and, when supplied, is the specific
 * SphericalLocation reference). Used by `setFocus` for idempotency.
 *
 * NOTE: the `focusIndex` is intentionally lossy (rounded keys); this
 * predicate suffices for setter idempotency but is not a substitute
 * for exact focus-membership queries elsewhere.
 */
public hasLocationAtFocus(
  focus: [number, number, number],
  location?: SphericalLocation
): boolean {
  const here = this.focusIndex.get(focusKey(focus));
  if (!here) return false;
  return location ? here === location : true;
}
```

`focusKey` is the existing local function at `SphericalZone.ts:22-24`.

### 4.5 `lib/spatial/CartesianLocation.ts` — `coords` persistent field + `setCoords` setter

**Adds.** Inside the class body (after the existing `addExit` override):

```ts
/**
 * Persistent field carrying integer grid coordinates `{x, y, z}`. The
 * setter writes the runtime `coordinates` tuple AND registers this
 * location with its derived zone via `addLocation(this, x, y, z)`.
 *
 * Per declarative-content-slate § coords on CartesianLocation.
 *
 * Idempotency: re-setting with coordinates that already point at this
 * room is a no-op (the zone's `hasRoomAt(x, y, z, this)` returns true).
 * Mismatch (different coords or wrong room at coords) throws with the
 * conflict diagnostic.
 */
static persistentFields = ['coords'];

protected _coords: { x: number; y: number; z: number } | null = null;

// Accessor pair — shape invariant. Fires on every write to `this.coords`,
// including any internal-class write that bypasses the public method.
// Per CLAUDE.md "Member Privacy" / feedback_template_path_field_naming /
// ref-shapes.md "Field naming". See § 5.6 for the convention.
protected get coords(): { x: number; y: number; z: number } | null {
  return this._coords;
}
protected set coords(value: { x: number; y: number; z: number } | null) {
  if (value !== null && (
    typeof value.x !== 'number' ||
    typeof value.y !== 'number' ||
    typeof value.z !== 'number'
  )) {
    throw new TypeError(
      `CartesianLocation.coords: expected { x, y, z } with numeric fields, got ${JSON.stringify(value)}`
    );
  }
  this._coords = value;
}

// Method pair — public surface. Method handles protocol (zone resolution,
// idempotency, conflict-throw, side effects) and delegates to the accessor
// for storage so the shape invariant fires.
public getCoords(): { x: number; y: number; z: number } | null {
  return this.coords;
}
public async setCoords(value: { x: number; y: number; z: number }): Promise<void> {
  // Fail-fast shape check in the public method (defensive — the accessor
  // also checks, but failing here avoids running protocol with bad input).
  if (!value || typeof value.x !== 'number' || typeof value.y !== 'number' || typeof value.z !== 'number') {
    throw new TypeError(
      `CartesianLocation.setCoords: expected { x, y, z } with numeric fields, got ${JSON.stringify(value)}`
    );
  }
  const zone = this.getZone();
  if (!zone) {
    throw new Error(
      `CartesianLocation.setCoords: no zone resolved for ${this.getTemplatePath() ?? this.stuffId}; ` +
        `template-path ancestry must include a CartesianZone.`
    );
  }
  if (zone.hasRoomAt(value.x, value.y, value.z, this)) {
    // Already registered at exactly these coords — no-op.
    this.coords = { ...value };  // accessor fires shape invariant
    return;
  }
  if (this._coords && (this._coords.x !== value.x || this._coords.y !== value.y || this._coords.z !== value.z)) {
    throw new Error(
      `CartesianLocation.setCoords: ${this.getTemplatePath() ?? this.stuffId} already at ` +
        `(${this._coords.x},${this._coords.y},${this._coords.z}); refusing to re-set to ` +
        `(${value.x},${value.y},${value.z}).`
    );
  }
  // Fresh registration (or re-registration after a clear).
  zone.addLocation(this, value.x, value.y, value.z);
  this.coords = { ...value };  // accessor fires shape invariant
}
```

**Caveats on the persistentFields list.** `CartesianLocation` doesn't currently declare its own `static persistentFields` (it inherits via mixins). Adding the static here will add `coords` to the union assembled by `MixinApi.getAllPersistentFields`. The existing `coordinates` field from `CartesianCoordinatesMixin` (`CartesianCoordinates.ts:29`) stays separate — it's the [x,y,z] tuple actually consumed by the zone. The new `coords` field is the YAML-shape declarative input. The setter bridges them (`zone.addLocation(this, x, y, z)` calls `location.setCoordinates([x,y,z])` internally per `CartesianZone.ts:89`).

Question for review: should `coords` and `coordinates` be unified? The slate says `coords: { x, y, z }` is the YAML shape. The existing runtime is `coordinates: [x, y, z]`. Unifying would mean changing the runtime tuple to `{x,y,z}` (touching `CartesianCoordinatesMixin`, `CartesianZone.addLocation`, every consumer of `getCoordinates()`). That's out of scope for this build. Leave them separate; `setCoords` is the YAML/setter shape, `coordinates` stays the runtime tuple — they round-trip via `setCoordinates([x,y,z])` inside `addLocation`. The persistent-back direction (out of scope) would write both `coords` (the object) and `coordinates` (the tuple) — but again, persist-back isn't in scope, so we don't need to design that.

### 4.6 `lib/spatial/SphericalLocation.ts` — `focus` persistent field + `setFocus` setter

**Adds.** Parallel structure to `CartesianLocation.setCoords`:

```ts
static persistentFields = ['focus'];

protected _focus: { rho: number; theta: number; phi: number; radius: number } | null = null;

// Accessor pair — shape invariant. Per § 5.6 convention.
protected get focus(): { rho: number; theta: number; phi: number; radius: number } | null {
  return this._focus;
}
protected set focus(value: { rho: number; theta: number; phi: number; radius: number } | null) {
  if (value !== null && (
    typeof value.rho !== 'number' ||
    typeof value.theta !== 'number' ||
    typeof value.phi !== 'number' ||
    typeof value.radius !== 'number'
  )) {
    throw new TypeError(
      `SphericalLocation.focus: expected { rho, theta, phi, radius } with numeric fields, got ${JSON.stringify(value)}`
    );
  }
  this._focus = value;
}

// Method pair — public surface; protocol + delegates to accessor.
public getFocus(): { rho: number; theta: number; phi: number; radius: number } | null {
  return this.focus;
}
public async setFocus(value: {
  rho: number; theta: number; phi: number; radius: number;
}): Promise<void> {
  // Fail-fast shape check (defensive — accessor also checks).
  if (
    !value ||
    typeof value.rho !== 'number' ||
    typeof value.theta !== 'number' ||
    typeof value.phi !== 'number' ||
    typeof value.radius !== 'number'
  ) {
    throw new TypeError(
      `SphericalLocation.setFocus: expected { rho, theta, phi, radius } with numeric fields, got ${JSON.stringify(value)}`
    );
  }
  const zone = this.getZone();
  if (!zone) {
    throw new Error(
      `SphericalLocation.setFocus: no zone resolved for ${this.getTemplatePath() ?? this.stuffId}; ` +
        `template-path ancestry must include a SphericalZone.`
    );
  }
  this.setCoordinates([value.rho, value.theta, value.phi]);
  this.setRadius(value.radius);
  const focusTuple: [number, number, number] = [value.rho, value.theta, value.phi];
  if (zone.hasLocationAtFocus(focusTuple, this)) {
    this.focus = { ...value };  // accessor fires shape invariant
    return;
  }
  if (this._focus) {
    // Re-set with new focus — accept (mutates coords + re-registers).
  }
  zone.addLocation(this);
  this.focus = { ...value };  // accessor fires shape invariant
}
```

The slate is less prescriptive on Spherical's drift policy than on Cartesian; the mirror pattern keeps the two parallel.

### 4.7 `lib/boundary/Exitable.ts` — `applyExits` method

**`exits` is an instruction field** (per § 5.7 Property vs instruction fields). The YAML data is a declaration consumed to produce/modify the runtime `exits: Map<string, Exit>` (existing field at `Exitable.ts:130`). No paired getter for the spec — the runtime API (`getExit`, `getExits`, `addExit`, etc.) is the only public surface for reading exits. No backing `_exits` field for the spec — the spec is consumed by `applyExits` and discarded.

**Adds.** Declare `exits` as an instruction field on the mixin. Add `applyExits` to the interface and class:

```ts
// On the mixin's static (added to the mixin):
static instructionFields = ['exits'];

// In the Exitable interface (existing file, lines 44-94):
applyExits(map: Record<string, ExitSpec>): Promise<void>;
```

In the mixin class body:

```ts
async applyExits(map: Record<string, ExitSpec>): Promise<void> {
  for (const [direction, spec] of Object.entries(map)) {
    await this._applyExitSpec(direction, spec);
  }
}

private async _applyExitSpec(direction: string, spec: ExitSpec): Promise<void> {
  const existing = this.exits.get(direction);
  // Resolve destination lazily — singleton triggers clone if absent.
  const destStuff = await StuffApi.singleton<Stuff & Container & Exitable>(spec.destination);
  // Resolve door if declared.
  let doorStuff: Door | undefined;
  if (spec.door) {
    doorStuff = await StuffApi.singleton<Door>(spec.door);
  }
  // Idempotency: matching existing exit → no-op.
  if (existing) {
    const sameDest = existing.getDestination() === destStuff;
    const sameDoor = (existing.getDoor() ?? null) === (doorStuff ?? null);
    if (sameDest && sameDoor) return;
    throw new Error(
      `Exitable.applyExits: direction '${direction}' on ` +
        `${(this as unknown as Stuff).getTemplatePath() ?? (this as unknown as Stuff).stuffId} ` +
        `already wired to a different exit; refusing to overwrite. ` +
        `(existing destination: ${existing.getDestination().getTemplatePath()}, ` +
        `incoming destination: ${spec.destination})`
    );
  }
  const isCardinal = NavigationApi.isCardinalDirection(direction);
  const bidirectional = spec.bidirectional ?? isCardinal;
  if (bidirectional) {
    const opts: BidirectionalExitOptions = {
      door: doorStuff,
      opposite: spec.opposite,
      hidden: spec.hidden,
      blocked: spec.blocked,
      muffled: spec.muffled,
      noFollow: spec.noFollow,
      messageInForward: spec.messageIn ?? null,
      messageOutForward: spec.messageOut ?? null,
    };
    this.addBidirectionalExit(destStuff, direction, opts);
    return;
  }
  // One-way exit.
  const exit = StuffApi.createSync(() => new Exit({
    direction,
    source: this as unknown as Stuff & Container,
    destination: destStuff,
    door: doorStuff ?? null,
    hidden: spec.hidden,
    blocked: spec.blocked,
    muffled: spec.muffled,
    noFollow: spec.noFollow,
    oneWay: true,
    messageIn: spec.messageIn,
    messageOut: spec.messageOut,
    media: spec.media,
  }));
  this.addExit(exit);
}
```

**`ExitSpec` interface** — declare at the top of `Exitable.ts`, exported alongside `BidirectionalExitOptions`:

```ts
export interface ExitSpec {
  destination: string;
  door?: string;
  bidirectional?: boolean;
  opposite?: string;
  hidden?: boolean;
  blocked?: boolean;
  muffled?: boolean;
  noFollow?: boolean;
  oneWay?: boolean;
  messageIn?: string;
  messageOut?: string;
  media?: string[];
}
```

**Why instruction field, not persistent.** This was a design call. An earlier draft modeled `exits` as a persistent field with a `setX`-style setter. Rejected: the setter would take a YAML-shape spec (`Record<string, ExitSpec>`) but a paired getter would return the runtime `Map<string, Exit>` — asymmetric on shape. That's "marshaller work in the wrong place" (per `feedback_property_vs_instruction_fields`). The fix is to recognize `exits` as an instruction (a declaration applied to produce derived runtime state), use the `applyX` verb, drop the paired getter for the spec. The runtime `exits: Map<string, Exit>` collection has its own established API (`getExit`, `addExit`, etc.) that stays unchanged.

**No name collision concern.** Because `exits` is an instruction field (not a persistent field), there's no bracket-assign path that could clobber the runtime `exits: Map<string, Exit>`. The hydrator's Phase 2 (instruction-field dispatch) only calls `applyExits` — it never bracket-assigns for instruction fields (absent `applyX` is an error, not a fallback).

**Cycle protection.** `StuffApi.singleton(spec.destination)` may trigger a clone of the destination. That clone's own `applyExits` may resolve back to this host's path. The in-flight `clone` guard catches the cycle (`api/stuff.ts:216-223`) ONLY when the path is currently being cloned — but the singleton check at `api/stuff.ts:381-392` short-circuits when the target is already registered. The host (this) registered BEFORE hydrate started (`api/stuff.ts:501`), so when the destination's applier calls `singleton(thisPath)`, the bucket lookup returns the already-registered proxy — no nested clone, no cycle. The cycle guard fires only if the destination's applier calls `clone(thisPath)` (not `singleton`) which our appliers don't do.

**Verifier extension** — none needed. The cardinal-rule check in `CartesianLocation.addExit` is eager (path-based, via `ZoneApi.resolveZoneForPath`); no deferred state, no verifier hook. See § 4.2 for the eager check.

### 4.8 `lib/boundary/Window.ts` — `attachedHosts` persistent field + `setAttachedHosts` setter

**Adds.** Append to `static persistentFields` (`Window.ts:58-63`): `'attachedHosts'`.

Add fields and methods to the class body:

```ts
/**
 * Persistent field carrying the templatePaths of the two hosts this
 * Window connects, Pattern A per ref-shapes.md. The setter resolves
 * both paths via `StuffApi.singleton` (lazy-clones absent hosts) and
 * calls `BoundaryApi.attachExistingBoundary` to install the per-side
 * anchors.
 *
 * Idempotency: if the Window's anchors are already installed AND
 * their hosts match the declared paths, no-op. If anchors are
 * present but the wrong hosts, throw with diagnostics.
 *
 * Per declarative-content-slate § attachedHosts.
 */
protected _attachedHosts: [string, string] | null = null;

// Accessor pair — shape invariant. Per § 5.6 convention.
protected get attachedHosts(): [string, string] | null {
  return this._attachedHosts === null ? null : [this._attachedHosts[0], this._attachedHosts[1]];
}
protected set attachedHosts(value: [string, string] | null) {
  if (value !== null) {
    if (
      !Array.isArray(value) ||
      value.length !== 2 ||
      typeof value[0] !== 'string' ||
      typeof value[1] !== 'string'
    ) {
      throw new TypeError(
        `Window.attachedHosts: expected [string, string], got ${JSON.stringify(value)}`
      );
    }
    if (value[0] === value[1]) {
      throw new Error(
        `Window.attachedHosts: hostA path and hostB path must differ ('${value[0]}').`
      );
    }
  }
  this._attachedHosts = value === null ? null : [value[0], value[1]];
}

// Method pair — public surface; protocol + delegates to accessor for storage.
public getAttachedHosts(): [string, string] | null {
  return this.attachedHosts;
}
public async setAttachedHosts(value: [string, string]): Promise<void> {
  // Fail-fast shape check (defensive — accessor also checks).
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    typeof value[0] !== 'string' ||
    typeof value[1] !== 'string'
  ) {
    throw new TypeError(
      `Window.setAttachedHosts: expected [string, string], got ${JSON.stringify(value)}`
    );
  }
  if (value[0] === value[1]) {
    throw new Error(
      `Window.setAttachedHosts: hostA path and hostB path must differ ('${value[0]}').`
    );
  }
  // Idempotency check via existing anchors.
  const a = this.getAnchorA();
  const b = this.getAnchorB();
  if (a && b) {
    const hostA = a.getAdornedTo();
    const hostB = b.getAdornedTo();
    const pathA = hostA?.getTemplatePath() ?? null;
    const pathB = hostB?.getTemplatePath() ?? null;
    const matchesForward = pathA === value[0] && pathB === value[1];
    const matchesReverse = pathA === value[1] && pathB === value[0];
    if (matchesForward || matchesReverse) {
      this.attachedHosts = [value[0], value[1]];  // accessor fires shape invariant
      return;
    }
    throw new Error(
      `Window.setAttachedHosts: ${this.getTemplatePath() ?? this.stuffId} ` +
        `already attached to ('${pathA}', '${pathB}'); refusing to re-attach to ` +
        `('${value[0]}', '${value[1]}'). Destruct first via BoundaryApi.destruct.`
    );
  }
  // Partial-attach is a corruption — surface it loudly.
  if (a || b) {
    throw new Error(
      `Window.setAttachedHosts: ${this.getTemplatePath() ?? this.stuffId} ` +
        `is half-attached (anchorA=${a ? 'set' : 'null'}, anchorB=${b ? 'set' : 'null'}). ` +
        `This is a corruption; fix by destructing the boundary and re-cloning.`
    );
  }
  // Fresh attach. Resolve both hosts lazily — singleton triggers clone if absent.
  const hostA = await StuffApi.singleton<Stuff & Adornable>(value[0]);
  const hostB = await StuffApi.singleton<Stuff & Adornable>(value[1]);
  if (!MixinApi.isAdornable(hostA as Stuff) || !MixinApi.isAdornable(hostB as Stuff)) {
    throw new TypeError(
      `Window.setAttachedHosts: both hosts must compose AdornableMixin ` +
        `(hostA=${value[0]}, hostB=${value[1]}).`
    );
  }
  BoundaryApi.attachExistingBoundary({ boundary: this, hostA, hostB });
  this.attachedHosts = [value[0], value[1]];  // accessor fires shape invariant
}
```

Imports to add at top of `Window.ts`: `StuffApi` (`'../../api/stuff'`), `BoundaryApi` (`'../../api/boundary'`), `MixinApi` (`'../../api/mixin'`), type `Adornable` (`'./Adornable'`), type `Stuff` (`'../stuff/Stuff'`).

### 4.9 `lib/boundary/Door.ts` — explicitly NOT extended

**No change.** Per requirements deliverable #10: "Door is NOT extended this way — explicitly DO NOT add `attachedHosts` to `lib/boundary/Door.ts`."

Add a docblock note at the top of the Door persistent-fields comment block (or near the existing comment about wiring transitively) clarifying that Doors are wired by `applyExits` via `door:` and never declare `attachedHosts`. This is doc-only; no code change.

### 4.10 Wave 2 unit tests

**`packages/server/src/mud/lib/spatial/__tests__/CartesianLocation.coords.test.ts`** (new):

- `it('setCoords stores the value and registers with the zone via addLocation')` — zone + makeStuffAtPath room with templatePath; stamp zone via `setZone` or arrange singleton; `await room.setCoords({x:1,y:2,z:0})`; expect `room.getCoords()` and `zone.contains(room)` and grid coords.
- `it('re-setting with the same coords is a no-op (idempotent)')` — happy path; second call doesn't throw and doesn't register twice.
- `it('re-setting with different coords throws with conflict diagnostic')` — first call OK; second with different coords throws; assert error message names both seed paths.
- `it('throws when no zone resolves from template-path ancestry')` — orphan room (no template-path → no zone); assert clear error.
- `it('hydrates via PersistentHydrator method-dispatch')` — set up real hydrator + Window-style test (mirror `Window.test.ts:80-107`); call `hydrate(room, {coords: {x:1,y:2,z:0}})`; expect `room.getCoords()` reflects.
- `it('async behavior: setCoords during in-flight clone (via applyExits cascade) still awaits')` — exercise the cycle case where setCoords is called from a setter chain that hits a cycle; assert no infinite recursion and correct final state.

**`packages/server/src/mud/lib/spatial/__tests__/SphericalLocation.focus.test.ts`** (new): parallel structure to coords tests, with `focus: {rho, theta, phi, radius}`.

**`packages/server/src/mud/lib/spatial/__tests__/CartesianZone.hasRoomAt.test.ts`** (new):

- `it('returns true when a room is at the given coords (no room arg)')` — add room, assert `hasRoomAt(0,0,0) === true`.
- `it('returns false when no room is at the given coords')` — `hasRoomAt(99,99,99) === false`.
- `it('with room arg: returns true only when the specific room matches')` — add two rooms at different coords; `hasRoomAt(0,0,0, otherRoom) === false` (other is elsewhere).

**`packages/server/src/mud/lib/spatial/__tests__/CartesianLocation.cardinalRule.test.ts`** (new) — covers the cardinal-rule tightening (eager path-based check per § 4.2):

- `it('intra-zone non-cardinal exit throws at addExit time')` — two rooms in same zone; add a `portal` exit pointing at the other; expect throw with same-zone diagnostic (mentions both templatePaths and the shared zone).
- `it('cross-zone non-cardinal exit succeeds')` — two rooms in different zones; add `portal` exit; expect success (`addExit` resolves true).
- `it('cardinal direction always succeeds (intra-zone or cross-zone)')` — `north` exit; both intra and cross expected to succeed.
- `it('check is path-based: destination room is never loaded')` — set up two templates with paths under different zones; add the cross-zone non-cardinal exit; assert `addExit` succeeds AND the destination Stuff was never instantiated (`StuffApi.findByTemplatePath(destPath)` returns null after `addExit` returns). The eager check goes through `ZoneApi.resolveZoneForPath` which materializes the *zones* but not the destination room.
- `it('exit with no destinationPath is permissive (orphan ref)')` — construct an Exit with no `_destinationPath` (synthetic); `addExit` returns true (no throw — the check is skipped for path-less exits).

**`packages/server/src/mud/lib/boundary/__tests__/Exitable.applyExits.test.ts`** (new):

- `it('applyExits installs a cardinal bidirectional pair when bidirectional default')` — two rooms; `await loc.applyExits({north: {destination: '/path/of/other'}})`; expect both sides wired.
- `it('applyExits with door: also installs the door-Boundary anchor pair')` — verify `getFixtureBoundaries()` on both rooms includes the door.
- `it('applyExits with bidirectional:false creates a one-way exit')` — single direction; no inverse; `exit.isOneWay() === true`.
- `it('applyExits for non-cardinal bidirectional requires explicit opposite')` — spherical setup; without opposite throws; with opposite works.
- `it('applyExits is per-direction idempotent: matching existing exit is no-op')` — call twice with identical map; assert no error and exit count unchanged.
- `it('applyExits with conflicting destination throws with both paths in diagnostic')` — first call wires `north → /a`; second call same direction `north → /b` throws.
- `it('applyExits handles cycle: A.exits[south] → B and B.exits[north] → A via singleton, terminates without infinite recursion')` — set up two singleton-templated rooms; await applyExits on A while B's hydrate already in flight; assert no cycle-guard throw (because in-flight singleton resolves the already-registered host instead of cloning).
- `it('hydrate via PersistentHydrator: exits map is consumed by applyExits, not bracket-assigned')` — set up a backing with method-dispatched hydration; assert the runtime `exits: Map<string, Exit>` is populated correctly and not clobbered.

**`packages/server/src/mud/lib/boundary/__tests__/Window.setAttachedHosts.test.ts`** (new):

- `it('setAttachedHosts resolves both hosts via singleton and attaches anchors')` — two CartesianLocations as singletons at known templatePaths; `await window.setAttachedHosts([pathA, pathB])`; expect anchors on both hosts.
- `it('setAttachedHosts is idempotent: re-set with same pair is no-op')` — set, then re-set; no error, no duplicate anchors.
- `it('setAttachedHosts accepts hosts in reverse order (matchesReverse)')` — set with [A, B]; re-set with [B, A]; no-op (matchesReverse path).
- `it('setAttachedHosts throws on conflict: different pair after attach')` — set with [A, B]; re-set with [A, C] throws with diagnostic naming all three paths.
- `it('setAttachedHosts throws on half-attached corruption')` — manually clear one anchor (via _clearAnchor); re-set throws with the half-attached diagnostic.
- `it('setAttachedHosts throws if a host is not Adornable')` — manufacture a Thing that isn't a Location (no Adornable); attempt → throws.
- `it('setAttachedHosts refuses hostA === hostB')` — set with [pathA, pathA] throws before resolving.
- `it('lazy-cloning: hosts not yet registered, setAttachedHosts triggers their clone via singleton')` — seed two templates in a mock TemplateApi; set; expect both hosts cloned.
- `it('hydrate via PersistentHydrator: setAttachedHosts is invoked via method-dispatch')` — full hydrate; assert anchors wired and `getAttachedHosts()` reflects.
- `it('HMR-style: destruct + re-singleton attaches cleanly to same hosts')` — full attach; destruct via BoundaryApi.destruct (clears anchors via `Boundary.onDestruct`); re-create Window with same paths; second `setAttachedHosts` succeeds.
- `it('Door does NOT have a setAttachedHosts method')` — sanity: `expect((makeStuff(() => new Door()) as any).setAttachedHosts).toBeUndefined()`.

### 4.11 Integration test — deliverable #13

**`packages/server/src/mud/lib/spatial/__tests__/declarativeContent.integration.test.ts`** (new).

This is the load-bearing test for the whole build. It exercises the lazy-cascade through templates and verifies the wiring comes out correct.

**Fixture shape** (programmatic, not YAML — tests don't have a real Mongo). Use `Template` doc seeding via test helpers; we'll use `TemplateApi.saveTemplate` with a mocked PersistenceManager, OR directly inject Templates into a test-local registry. The build agent must pick the simplest path; the existing `Persistable.test.ts` and tests under `lib/persistence/__tests__/` show the patterns.

Concretely, the test:

1. Seeds 5 Templates via `TemplateApi.saveTemplate` (or equivalent direct insertion):
   - `/test/declarative/zone` — class `/lib/spatial/CartesianZone`, data `{name: 'test zone'}`, no hydratorClass (zone fields use `setName`; hydrator can omit).
   - `/test/declarative/roomA` — class `/lib/spatial/CartesianLocation`, hydratorClass `/lib/persistence/PersistentHydrator`, data:
     ```
     coords: { x: 0, y: 0, z: 0 }
     exits:
       north:
         destination: /test/declarative/roomB
     ```
   - `/test/declarative/roomB` — same class, hydratorClass, data:
     ```
     coords: { x: 0, y: 1, z: 0 }
     ```
   - `/test/declarative/window` — class `/lib/boundary/Window`, hydratorClass, data:
     ```
     baseTransmissivity: 0.9
     attachedHosts:
       - /test/declarative/roomA
       - /test/declarative/roomB
     ```

2. Boot the test (no content in bootstrap manifest; just engine services).

3. Trigger the lazy cascade by calling `await StuffApi.singleton<CartesianLocation>('/test/declarative/roomA')`.

4. Assertions:
   - `roomA` is registered.
   - Zone `/test/declarative/zone` is registered (lazy-cloned via `ZoneApi.resolveZoneForPath` during roomA's clone).
   - `roomA.getCoords()` is `{x:0,y:0,z:0}`.
   - `roomA.getZone() === zone`.
   - `zone.contains(roomA) === true`.
   - `roomA.getExit('north')` is defined and points at roomB.
   - **roomB** is registered (lazy-cloned via roomA's `applyExits` → `singleton('/test/declarative/roomB')`).
   - `roomB.getCoords()` is `{x:0,y:1,z:0}`.
   - `roomB.getExit('south')` is defined (bidirectional back-edge wired) and points at roomA.
   - **Window** is NOT yet registered (no setter has resolved its path — it's not referenced by either room's data).
   - Now explicitly `await StuffApi.singleton<Window>('/test/declarative/window')`.
   - Window is registered.
   - `window.getAttachedHosts()` returns `['/test/declarative/roomA', '/test/declarative/roomB']`.
   - `window.getAnchorA()` and `getAnchorB()` are non-null.
   - `roomA.getFixtureBoundaries()` includes the window.
   - `roomB.getFixtureBoundaries()` includes the window.
   - The zone's grid has both rooms at correct keys.
   - `LightApi.lightAt(roomB)` returns the right answer for a candle in roomA when the window is open (verifies the boundary attachment actually works downstream — this is the substrate-only Duncan Hall demo).

5. Cleanup: clear StuffApi state after the test.

6. (Optional but recommended) Re-trigger: a second `await StuffApi.singleton('/test/declarative/roomA')` returns the same instance without re-cloning (sanity for the singleton cache).

7. (Optional) Cycle test: set up a scenario where roomB.exits also names roomA (mirroring "north" + "south") — the bidirectional setter already wires both, so this case is the back-edge idempotency: `applyExits` on roomB sees that `south` already exists with matching destination and no-ops.

This test is the substrate-only version of the Duncan Hall demo (per requirements §13: "no NPCs, no content prose, no PopulatesMixin yet"). It proves the lazy cascade works end-to-end through coords + exits + attachedHosts.

### 4.12 Documentation updates

**`docs/subsystems/spatial.md`** — update the following sections:

- **Reflect the Zone hierarchy moving out to `lib/zone/`.** `Zone.ts` and `SpatialZone.ts` no longer live in `lib/spatial/`; update any code citations in the doc that point at `lib/spatial/Zone.ts` to `lib/zone/Zone.ts`. Add a leading note that spatial.md still covers `CartesianZone` / `SphericalZone` (the spatial-coordinate concrete zones) but the hierarchy roots (`Zone`, `SpatialZone`, `FolderZone`) are now documented under the `lib/zone/` subsystem.
- "The Cast" table: keep `CartesianZone` / `SphericalZone` entries; remove `Zone` / `SpatialZone` entries (they're now zone-subsystem). Add a cross-reference row pointing at the zone subsystem for the hierarchy roots and `FolderZone`.
- "Class Hierarchy" diagram (`spatial.md:53-72`): trim to the spatial-only portion; cross-reference the full hierarchy diagram in the zone-subsystem docs (or here, with a note that the roots live elsewhere).
- "Locations" section: replace the paragraph at `spatial.md:215-218` (the "any non-cardinal direction throws" passage) with the cardinal-rule tightening — "intra-zone non-cardinal exits throw; cross-zone non-cardinal exits succeed when the destination's templatePath resolves to a different zone than the source's. The check is eager and path-based: `ZoneApi.resolveZoneForPath` walks template ancestry to compute each side's zone without loading the destination room. `CartesianLocation.addExit` is async (awaits zone resolution)."
- New subsection "Zone derivation rule" before "Zone resolution: ZoneApi": formalize "nearest SpatialZone ancestor wins; FolderZones are skipped during the walk; FolderZones DO participate as inheritance nodes for `ZoneApi.resolveZoneField`." Cite slate § Zone derivation.
- "Zone resolution: ZoneApi" section: add subsection "Field inheritance via ZoneApi.resolveZoneField" — document the new helper, its return-null contract, the FolderZone-participation note, and the consumer's settings-style fallback pattern.
- New subsection "The setter-with-side-effects pattern" (probably under "Coordinates" or as a standalone subsection): document that `CartesianLocation.setCoords` and `SphericalLocation.setFocus` follow a shared pattern — store + side-effect + idempotency + conflict-throw. Cross-reference boundary.md's parallel documentation of the same pattern.
- "Coordinates" section: add a paragraph on the relationship between `coords` (persistent declarative field) and `coordinates` (runtime tuple) — the setter bridges them.
- Add `hasRoomAt` to the CartesianZone subsection.
- Add `hasLocationAtFocus` to the SphericalZone subsection.

**`docs/subsystems/boundary.md`** — update:

- "The Cast" table: clarify Window's role to mention `attachedHosts`.
- "Window" section (`boundary.md:391-422`): add subsection "Declarative wiring via `attachedHosts`" — document the new persistent field, the setter's lazy host resolution via `StuffApi.singleton`, the idempotency check, and the half-attached error case. Note that Doors are NOT extended this way.
- New subsection "Doors are wired transitively, not via `attachedHosts`" — explicit note (per slate); cross-reference the `applyExits` instruction field on `Exitable`.
- "Exits" section (`boundary.md:44-145`): document the new `applyExits(map)` instruction method on `ExitableMixin`; cross-reference declarative-content-slate.
- New subsection "The setter-with-side-effects pattern" — short cross-reference to spatial.md's documentation.
- "Sealable" section: update to reflect the field/setter rename (`open` + `setOpen`); `isOpen()` getter unchanged. Add a small note about the noun-on-field, predicate-on-getter convention per `feedback_boolean_field_naming`.

**`docs/subsystems/zone.md`** — new subsystem doc (small, just enough to document the new subsystem):

- Why `lib/zone/` exists (carved out of `lib/spatial/` to reflect that the Zone hierarchy is broader than spatial-coordinate concerns).
- The class hierarchy diagram: `Zone` → {`SpatialZone` → {`CartesianZone`, `SphericalZone`}, `FolderZone`, `HomeZone`, `Biorealm`, `Clade`, ...}. With pointers to where each concrete subclass lives.
- The folder-vs-spatial soft split (cross-reference zone-architecture-slate).
- The `FolderZone` generic class — purpose, when to use it, when to use a domain-specific folder zone (HomeZone, Biorealm, etc.) instead.
- `ZoneApi.resolveZoneField` documentation (cross-references the spatial.md inheritance walk section).
- Cardinal-rule note (cross-references spatial.md for the full cardinal-only-intra-zone invariant).

Keep this doc focused. It's the README for `lib/zone/`; the heavy spatial-coordinate detail stays in `spatial.md`.

**`docs/subsystems/templates.md`** — update:

- "The Hydrator Contract" section (`templates.md:142-185`): document the two-phase dispatch (Phase 1 — property fields via `setX` or bracket-assign; Phase 2 — instruction fields via `applyX`, no fallback). The previous bracket-assign-only contract is preserved as Phase 1's behavior when no `setX` method exists.
- New subsection "Property fields vs instruction fields" (under or after "The Hydrator Contract"): document the two patterns per `feedback_property_vs_instruction_fields` — when to use each, the `static persistentFields` vs `static instructionFields` declarations, the symmetric set/get pair for properties vs the `applyX` verb for instructions. Cross-reference `feedback_property_vs_instruction_fields`.

### 4.13 `lib/boundary/Sealable.ts` — boolean field naming cleanup

**Rename for codebase convention.** Per `feedback_boolean_field_naming`: boolean fields use the noun form on the field/setter/YAML key; the predicate form (`isX()`) appears only on the getter. The existing Sealable uses the predicate form throughout (`_isOpen` field, `setIsOpen` setter, `isOpen:` YAML key), which is the less common convention and reads awkwardly at the setter ("set is open"). Cleanup is bundled into this build because we're already touching boundary subsystem code and Sealable is a small file.

Changes to `lib/boundary/Sealable.ts`:

- `_isOpen` → `_open` (backing field)
- `static persistentFields = ['isOpen']` → `static persistentFields = ['open']`
- `setIsOpen(value): void` → `setOpen(value): void` (setter — name change only; same body)
- `isOpen(): boolean` getter — **unchanged**. The predicate form stays where it belongs.
- Add accessor pair `protected get open() / set open()` per § 5.6 convention if the existing setter has any invariant logic worth gating (likely just a typecheck for boolean — minimal but applies the convention uniformly across the build).
- Update class-level docstring to mention the convention (predicate on getter only).

Changes elsewhere — the build agent must grep and rename mechanically:

- **Callers of `setIsOpen`**: any code calling `door.setIsOpen(true)` / `window.setIsOpen(false)` → `door.setOpen(true)` / `window.setOpen(false)`. Search across `packages/server/src/mud/`, controllers under `obj/command/`, tests under `__tests__/`. Door open/close verbs are likely call sites.
- **YAML seeds** with `data: { isOpen: ... }` → `data: { open: ... }`. Search across `packages/server/src/mud/seeds/`. Door templates and Window templates probably the only hits.
- **Tests** asserting against `isOpen` field name (less likely — should use `isOpen()` getter) → grep for `_isOpen` access in tests and rename to `_open`. The `isOpen()` getter callsites stay unchanged.
- **Docs** in `docs/subsystems/boundary.md` that mention `setIsOpen` or describe Sealable's persistent field as `isOpen` → update to `setOpen` / `open`.

Tests added:
- A regression test in `Sealable.test.ts` (or wherever Sealable tests live) verifying:
  - `static persistentFields` is `['open']`
  - `setOpen(true)` causes `isOpen()` to return `true`
  - `setOpen(false)` causes `isOpen()` to return `false`
  - Hydrator method-dispatch finds `setOpen` (via the Wave 1 fix, since hydrator uses `set + PascalCase(fieldName)`)
- A doc-key test: hydrating from `{ open: true }` correctly sets the state; hydrating from `{ isOpen: true }` does NOT (the old key name doesn't dispatch anything).

**Migration notes for existing data**: any existing MongoDB docs with `data.isOpen: true` would NOT migrate to `data.open` automatically. If the deployed DB has Sealable instances persisted with the old key, those entries wouldn't hydrate correctly after the rename. Build agent: check whether a one-time migration script is needed (probably yes for any deployed environment; probably no for a dev environment that re-seeds from YAML each restart). Add a note in the PR description either way.

**boundary.md doc update** — adjust the Sealable section to use the new names; add a small note that the convention (noun on field, predicate on getter) is documented in `feedback_boolean_field_naming`.

---

## 5. Cross-cutting integration notes

### 5.1 Order-of-operations during clone

Per `docs/subsystems/templates.md` "Clone Pipeline":
1. Construct (sentinel flipped).
2. Stamp templatePath (via `_stampTemplatePath`).
3. Wrap in proxy.
4. Register (object becomes resolvable by singleton/findByTemplatePath).
5. Stamp zone via `ZoneApi.resolveZoneForPath`.
6. Hydrate (where setters fire).
7. postRegister.

Critical for new setters: zone stamp (step 5) happens BEFORE hydrate (step 6). So `setCoords` and `setFocus` find a valid `getZone()` result. Build agent: verify this ordering hasn't drifted before relying on it (search for `ZoneApi.resolveZoneForPath` in `api/stuff.ts`).

### 5.2 Construction-sentinel + nested clone-from-setter

Already covered in Q2. Build agent: NO special handling needed; the existing `_beginConstruction`'s `prev`-return + `_endConstruction(prev)` pattern handles nested calls correctly.

### 5.3 No changes to bootstrap manifest

Per requirements constraints. Build agent: do NOT add the new FolderZone seed to bootstrap.ts. The seed YAML at `seeds/lib/zone/FolderZone.yaml` is picked up by the existing seeder loop (verify this). If not picked up automatically, prefer fixing the seeder's path-walk to fixing this build to do something special.

### 5.4 No changes to `Stuff.persistentFields` contract; new `instructionFields` sibling

`coords` on `CartesianLocation`, `focus` on `SphericalLocation`, `attachedHosts` on `Window` are normal `static persistentFields = [...]` declarations picked up by `MixinApi.getAllPersistentFields`. No framework change for those.

`exits` on `ExitableMixin` is declared in `static instructionFields = ['exits']` instead (per § 5.7). A new `MixinApi.getAllInstructionFields(ctor)` helper mirrors `getAllPersistentFields`. The framework gains exactly one new mixin-walking helper; the per-class declaration shape is parallel and self-explanatory.

### 5.5 Boundary Door fields stay as-is

Door has `Sealable.open` (renamed from `isOpen` in this build per § 4.13) as its only persistent field. Do not add `attachedHosts`. Door's anchors are wired transitively when an `exits` map declares `door:`.

### 5.6 Accessor pair convention for property fields

The three **property fields** in this build (`CartesianLocation.coords`, `SphericalLocation.focus`, `Window.attachedHosts`) follow the codebase's accessor-pair + method-pair convention (CLAUDE.md "Member Privacy" §"Inter-Stuff Contract: Methods Only"; ref-shapes.md "Field naming" §"Public-surface naming"; `feedback_template_path_field_naming`). The shape is:

- **Backing field** `_xxx` (protected): the storage slot. Hydrator's method-dispatch (Wave 1 Phase 1) never reaches the backing directly; it goes through the method.
- **Accessor pair** `protected get xxx() / set xxx()`: enforces shape invariants on every write to `this.xxx`. Fires for any internal-class write that bypasses the public method. Today nothing else writes the backing field, but the accessor is belt-and-suspenders for future internal writes.
- **Method pair** `public getXxx() / setXxx()`: the public surface. The method handles protocol (resolve zone via `getZone()`, idempotency check via `hasRoomAt` / `getAnchorA`, conflict-throw, cross-object side effects like `addLocation` / `attachExistingBoundary`). After protocol, the method writes via `this.xxx = ...` so the accessor fires the shape invariant.

The shape check is duplicated: fail-fast in the method (so protocol doesn't run with bad input and partially apply side effects before the accessor throws) AND in the accessor (so internal-class writes are also gated). The duplication is intentional; it's small.

The accessor pair is the *primary* invariant enforcement; the method's fail-fast check is for ergonomics. If a build agent ever simplifies one of these setters, the accessor pair MUST stay.

The accessor convention does NOT apply to `ExitableMixin.applyExits` (an instruction field per § 5.7) — instruction fields have no setter/getter pair on the spec at all. The runtime collection (`exits: Map<string, Exit>`) has its own established mutation API (`addExit`, `removeExit`, etc.) which is the only contract surface for changing exits at runtime; no accessor needed.

### 5.7 Property vs instruction fields

This build introduces two distinct field-shape patterns (per `feedback_property_vs_instruction_fields`). Build agent must understand the distinction before implementing.

**Property fields** — data that IS the field's value.
- The shape goes in, the same shape comes out; storage IS the value.
- `setX(v); assert(getX() === v)`. Symmetric on shape.
- Side effects on the setter (e.g., `setCoords` registers with the zone) don't change the field's identity.
- This build's property fields: `coords`, `focus`, `attachedHosts`.
- Declared in `static persistentFields = [...]`.
- Shape: backing `_x` + accessor pair `get x / set x` for invariant + method pair `getX() / setX()` for public surface (per § 5.6).
- Hydrator dispatch: Phase 1 — `setX` method if defined, else bracket-assign.

**Instruction fields** — declarations APPLIED to produce/modify runtime state.
- The data is a recipe for producing or modifying separately-named runtime state.
- No "value" to set/get on the spec — the field is a verb's argument, not the verb's outcome.
- Re-applicable: calling apply again with different data is meaningful (resynthesize).
- This build's instruction fields: `exits` (applied → runtime `exits: Map<string, Exit>` populated).
- Future instruction fields outside this build: `populates` (applied → child Stuff spawned into the container's contents) — Stuff subsystem, separate build.
- Declared in `static instructionFields = [...]` (new sibling to `persistentFields`).
- Shape: public method `applyX(spec): Promise<void>` only. No paired getter for the spec. No backing field for the spec. The runtime state lives in a **separately-named** field/collection with its own API.
- Hydrator dispatch: Phase 2 — `applyX` method **required**; no bracket-assign fallback.

**Why two patterns.** Property fields are storage. Instruction fields are commands. Trying to use `set/get` for instructions produces shape asymmetry — e.g., `setExits(spec)` taking specs but `getExits()` returning a runtime Map. That's "marshaller work in the wrong place" (and not real marshaller work either, since the spec and the runtime collection are different conceptual values, not different representations of the same value). The right answer is to recognize them as separate concepts.

**Naming.** Verb `apply*` is stable. The category noun "instruction field" is provisional (may rename to directive / applied / etc. if a better word emerges); the pattern itself is stable. Build agent: use "instruction field" in code comments / docs for now; expect rename in a future pass.

---

## 6. Risks and mitigations

### Risk 1: Wave 1's two-phase Hydrator dispatch must land before any Wave 2 work that uses `instructionFields`.

**Why it matters.** Wave 2's `applyExits` relies on Phase 2 (instruction-field dispatch) being wired into the Hydrator. Without it, declaring `static instructionFields = ['exits']` on `ExitableMixin` has no effect — the hydrator never reads `data.exits`. Result: rooms hydrate without exits installed; looks like a content bug rather than a substrate bug.

**Mitigation.** Wave 1 (two-phase dispatch fix) MUST land as its own commit with passing tests before any commit that adds `instructionFields` to a class. Wave separation enforced by code review. A Wave 1 test must cover the "declared instruction field with missing applyX method" failure case (asserts the hydrator throws with a clear diagnostic) so silent-skip-when-misconfigured can't sneak through.

### Risk 2: The cardinal-rule throw could interact with `addBidirectionalExit`'s door-attachment side effect.

**Why.** `addBidirectionalExit` calls `BoundaryApi.attachExistingBoundary` for the door when `opts.door` is non-null (`Exitable.ts:310-329`). If the destination is in the same zone and the direction is non-cardinal, the cardinal-rule throws — but the door's anchor pair might have been installed already by the time we throw. Then we'd have a "half-attached door" on hostA without hostB.

**Mitigation.** `addBidirectionalExit` does forward `addExit` BEFORE the door attachment (`Exitable.ts:299-301, then 310-329`). And `addExit` is where the cardinal check fires (eagerly, path-based, per § 4.2). So the order is: forward `addExit` → throws if same-zone-non-cardinal → door attachment never reached. Safe by ordering. Build agent: add a regression test for this case (`applyExits` with same-zone non-cardinal AND `door:` declared → throws cleanly, no half-attached door).

### Risk 3: `applyExits` resolves destination via `singleton`, which may trigger a cascading clone that re-enters `applyExits` on the destination.

**Why this is fine.** The destination's `applyExits` may resolve back to the source; the source is already registered (per template clone pipeline step 4, register-before-hydrate). The `singleton` lookup hits the bucket and returns the registered proxy — no nested clone, no in-flight-clone cycle. The forward exit was already added on the source before its `applyExits` returned the destination resolution path; when the destination's setter calls `singleton(source)`, it finds the source registered and proceeds. Then destination's `applyExits` for the `south` direction (bidirectional back-edge) tries to install — sees the source already has a `north` exit pointing here (the back-edge was wired by `addBidirectionalExit` from the forward call), so per-direction idempotency kicks in: matching destination, matching door → no-op. ✓.

**Mitigation.** Cover this case explicitly in the integration test (deliverable #13's optional bidirectional-back-edge sub-case).

### Risk 4: The Hydrator method-dispatch fix might break a field whose `set<Field>` method has a different signature.

**Why.** If a class has `setX(a, b)` (multi-arg) but the field is `x`, dispatch via `setX(data.x)` only passes one arg.

**Mitigation.** Search for `static persistentFields` across the codebase and audit each field's `setX` method (Q1 resolution above has a table). For any field whose `setX` method has multi-arg or otherwise incompatible signature, the safe path is for the build agent to leave the field's method out of the dispatch (or rename the method). At time of writing, no such case exists across spatial/boundary; build agent must re-verify before merging.

### Risk 5: `getTemplatePath()` returns null for makeStuff-only test objects, breaking `Window.setAttachedHosts` idempotency checks.

**Why.** The idempotency check compares `hostA?.getTemplatePath()` against the declared path. For test objects without a templatePath, this returns null and never matches, so re-set always falls into the "fresh attach" path. That path then tries `BoundaryApi.attachExistingBoundary`, which throws because anchors are already wired.

**Mitigation.** Tests must use `makeStuffAtPath` (`test-setup.ts:104`) to give hosts known templatePaths. The setter's behavior assumes template-shaped hosts — that's the production case. Document this constraint clearly in the setter docblock.

### Risk 6: `coords` vs `coordinates` field-name confusion.

**Why.** Two different fields exist for closely related state. Future maintainers might assume they're the same and write code that clobbers one when meaning to update the other.

**Mitigation.** Document the relationship clearly in spatial.md's Coordinates section (per §4.12). Add a comment in `CartesianLocation.ts` near `_coords` explaining that it's the YAML-shape declarative input; the runtime tuple lives on `CartesianCoordinatesMixin.coordinates`. The setter is the bridge.

### Risk 7 (removed): deferred cardinal-zone check fires on wrong verifier.

This risk applied to the earlier deferred-check design. Removed during plan review along with the deferred mechanism itself — the eager path-based check in § 4.2 doesn't have this failure mode.

### Risk 8: HMR of `Window` class doesn't re-run `setAttachedHosts` on existing instances.

**Why.** Per Q6 resolution, HMR doesn't re-fire hydrate/postRegister on existing instances. So existing Windows keep their existing boundary attachment, even if the YAML's `attachedHosts` changed.

**Mitigation.** This is by-design (matches the slate's HMR notes). Document it: the only way to pick up a changed `attachedHosts` on an existing instance is to destruct + re-singleton. The build agent should NOT add a workaround for this; it's a known limitation per `hot-reload.md`.

---

## 7. What's explicitly OUT of scope

The build agent must NOT pull these in, even if they look adjacent:

- **No `PopulatesMixin` and no `populates:` field shape.** Stuff subsystem. Separate build with its own requirements doc.
- **No `container:` top-level field on `Template`.** Templates subsystem. Separate build (paired with PopulatesMixin).
- **No `Login.enter()` change to consult avatar's container.** Connection subsystem. Separate one-line change in a later build.
- **No content YAML seeds.** Pure substrate. No Duncan Hall content, no Eternal University content, no demo rooms.
- **No changes to `bootstrap.ts`.** Manifest stays engine-services-only.
- **No changes to `DEFAULT_STARTING_LOCATION_PATH`.**
- **No new helper class, manager, or framework substrate** beyond the listed deliverables. No `WiringSynthesizer`, no dep extractor, no `BootstrapAction`, no `seedOnlyFields` flag, no `collectRefs`.
- **No new registry singletons.** `FolderZone` is a class; `ZoneApi.resolveZoneField` is a stateless helper; the cardinal-rule change is in-place; setters are setters.
- **No new Hydrator subclass.** The prereq fix is to the existing `PersistentHydrator`, not a new variant.
- **No new field-shape marshaller.** `attachedHosts` round-trips as a plain string array (Pattern A); no marshaller needed.
- **No persist-back implementation.** Setters work for the hydrate direction only; `toDocument` round-tripping of `coords`, `exits`, `attachedHosts` is not designed in this build and the persist-back direction is explicitly Not Yet Implemented across the wider Stuff persist-back story.
- **No avatar starting-location work.** Separate concern.
- **No Lounge, no reset/respawn, no boot-time content validator.**
- **No changes outside `lib/spatial/`, `lib/boundary/`, `lib/zone/` (new), `lib/persistence/`, and `api/zone.ts`** (plus the doc updates, seed YAML, and the import-path sweep needed by the Zone hierarchy move per § 3.2). The Hydrator change is the one boundary-crossing into `lib/persistence/`, justified as a Wave 1 prereq. The import-path sweep touches files in many subsystems (`lib/home/HomeZone.ts`, `lib/biome/Biorealm.ts`, `lib/race/Clade.ts`, etc.) — those touches are mechanical (`import { Zone } from '../spatial/Zone'` → `import { Zone } from '../zone/Zone'`) and not substantive subsystem changes.

---

## 8. Plan-time scope adjustments

The plan adds one piece beyond the strict requirements-doc deliverable list, plus one simplification of an originally-larger piece:

1. **`SphericalZone.hasLocationAtFocus(focus, location?)` helper.** Requirements §5 mentions this implicitly (`setFocus` needs an idempotency check) but doesn't add it to the deliverables list. The plan includes it because the parallel structure to `hasRoomAt` is the cleanest way to satisfy Spherical's setter idempotency; the alternative (no helper, just inline) would be inconsistent with the Cartesian shape.

2. **Cardinal-rule check simplified to eager path-based (no deferred mechanism).** Requirements §4 framed the cardinal-rule tightening as needing a "deferred validation hook" for destinations that aren't yet resolved at `addExit` time. The plan originally proposed an `Exit.pendingCardinalZoneCheck` flag + extension to `verifyOutboundExits` to implement deferral. **Removed during plan review.** Zone derivation is path-based (per zone-architecture-slate § Zone derivation; `ZoneApi.resolveZoneForPath` walks template ancestry), so the destination doesn't need to be loaded — only its templatePath. The check can be done eagerly in `addExit` with no deferred state. Trade-offs:
   - `addExit` becomes async on `CartesianLocation` (because `ZoneApi.resolveZoneForPath` may call `StuffApi.singleton` to materialize zones). Existing callers should already `await` since they need the boolean.
   - Zones are eagerly instantiated when first referenced as exit endpoints (user direction: this is desirable — gives the check a real Zone object that other code can ride on).
   - `Exit` gains nothing; `verifyOutboundExits` is untouched.

Neither adjustment relaxes a stated constraint or expands the surface beyond what the slates intend. Both are accommodation details. The user reviewed both at plan-review time and ratified.

---

## 9. Acceptance checklist (mirrors requirements §Acceptance criteria)

- [ ] Wave 1 ships: Hydrator method-dispatch fix, `FolderZone`, `ZoneApi.resolveZoneField`.
- [ ] Wave 1 tests pass: PersistentHydrator.test.ts, zone.resolveZoneField.test.ts, FolderZone.test.ts.
- [ ] Wave 2 ships: `coords` + `setCoords` + `hasRoomAt`, `focus` + `setFocus` + `hasLocationAtFocus`, `applyExits` + `ExitSpec`, `attachedHosts` + `setAttachedHosts`, cardinal-rule tightening (eager path-based, async `CartesianLocation.addExit`).
- [ ] Wave 2 tests pass: per-setter unit tests, cardinal-rule unit tests, full integration test (declarativeContent.integration.test.ts).
- [ ] `pnpm test` passes across the monorepo with no regressions.
- [ ] `pnpm build` succeeds.
- [ ] `pnpm lint` passes.
- [ ] `docs/subsystems/spatial.md` and `docs/subsystems/boundary.md` updated per §4.12.
- [ ] No content YAML added.
- [ ] No `bootstrap.ts` change.
- [ ] No new registry, no new substrate beyond the listed deliverables.
- [ ] The integration test (deliverable #13) — full CartesianZone + two rooms + Window — passes end-to-end starting from lazy `StuffApi.singleton` access.

---
