# Ref shapes — how Stuff references other Stuff

Saxonberg has multiple ways a `Stuff` field can reference another
`Stuff`. This doc names the patterns, says when to use each, and
spells out the method-surface conventions so call sites stay
predictable across the codebase.

Three reference shapes. Choose based on three axes:

- **Singleton or instance?** Is the target one canonical Idea per
  templatePath (Material, Species, BodyPlan, LocomotionMode), or a
  specific runtime instance (this chair, that NPC)?
- **Runtime or persisted?** Does the field reset on clone/hydrate,
  or does it survive across saves?
- **Frequent or rare access?** Does code read the target's
  properties in hot paths, or occasionally through an Api?

Foundational constraint: **`stuffId` (the per-instance stamp) does
not persist across reboots.** Persistent cross-reboot refs must key
off `templatePath` (singletons) or template authoring, not instance
identity. Live Stuff refs are therefore **transient by definition**
— either runtime-only or, when they need cross-save survival, owned
by a higher-layer mixin that rebuilds the relationship at hydrate.

---

## Pattern A — string-stored singleton ref

**Stores**: a `string` (templatePath or short name) identifying a
singleton Idea.

**Use when**:

- The target is a **singleton** (one canonical instance per
  templatePath: `Material`, `Species`, `BodyPlan`, `LocomotionMode`,
  `Clade`, etc.).
- Comparison is by template identity, not instance identity ("is this
  actor's species `Homo sapiens`?", not "is this *the same instance*
  of the Homo sapiens singleton?").
- The field is runtime-only OR persisted (Pattern A handles both
  cleanly).

**Why this shape**: tiny memory; trivial JSON/Mongo round-trip; the
identifier survives hot-reload of the singleton (path stays valid
even as the live singleton churns); no marshaller ceremony for
runtime fields.

### Field naming

```ts
protected _xxxPath: string | null = null;
```

- **Private** with `_` prefix — the field is host-internal; external
  reads/writes go through methods.
- **`Path` suffix** on the field name — honest about what's stored
  (an identifier, not a singleton).
- **`null`-default** when the reference is optional.

The `_` prefix + private modifier is consistent with the project's
"inter-Stuff contract: methods only" rule (CLAUDE.md). Hydrator
bracket-assigns onto the private field by name; external code never
touches the underscore.

#### Public-surface naming uses the bare conceptual name

The `Path` suffix discussed above is for the **backing field only**.
The **public surface** — the entry in `persistentFields`, the YAML
key authors write, the `getXxx` / `setXxx` method names — uses the
**bare conceptual name** without a `Path` / `TemplatePath` suffix.

Examples in current substrate: `container`, `populates`, `destination`,
`door`, `attachedHosts`. Not `containerPath`, not `attachedHostPaths`.

Reasoning: the Pattern A type signature (`string`) plus the field's
documentation as a singleton ref already convey "stored as a path";
the `Path` suffix on the public surface asks readers to re-confirm
what the type already shows. The bare conceptual name reads more
naturally in YAML and matches the established convention across the
substrate.

The backing field MAY drop the `Path` suffix for parallel uniformity
(`protected _attachedHosts: [string, string] | null`) — internal
choice, since callers never see backing-field names.

### Method surface

```ts
interface Xxxed {
  /** Convenience getter — resolves to the singleton (null if not loaded). */
  getXxx(): Xxx | null;

  /** Setter — accepts the singleton (or null); stores its path internally. */
  setXxx(value: Xxx | null): void;

  /** Optional predicate — accepts either form for ergonomics. */
  isXxx(value: Xxx | string): boolean;
}
```

**Add a raw-path getter only when a real consumer needs it.** The
default surface is singleton-form only — callers who want the live
singleton get it; nobody else has to think about the path. Add
`getXxxPath(): string | null` only when some consumer genuinely needs
to key off the path without resolving (e.g.,
`Species.getBodyPlanPath()` exists because `Wearable.slotClaims`
keys off the body-plan path string for per-body-plan vocabulary).

**No raw-form setter** in the default surface. The singleton-form
setter is the public write path; tests / hydration / framework code
that genuinely need to write a string without a singleton handle
go through bracket-assign on the private field directly (Hydrator
already does this).

### Setter behavior

```ts
public setXxx(value: Xxx | null): void {
  this._xxxPath = value === null ? null : value.getTemplatePath();
}
```

Singleton-in → path-out; null is always allowed. No further
validation — the substrate doesn't gate against unloaded singletons
because:

- The singleton may not exist yet at construction time.
- Hot-reload may temporarily disrupt the lookup.
- The Api-side resolver returns `null` for unknown paths; that's the
  graceful failure path.

### Getter behavior

```ts
public getXxx(): Xxx | null {
  if (this._xxxPath === null) return null;
  return XxxApi.findByPath(this._xxxPath) ?? null;
}
```

`null` field → `null` return. Non-null field + unresolvable singleton
→ also `null` (Api-side lookup returns null for unloaded). Same
semantics across all singleton refs.

### Existing exemplars

| Site | Field | Methods |
|---|---|---|
| `Tangible` | `_materialPath` (+ per-Detail `_detailMaterialPaths` map) | `getMaterial(detailKey?)` / `setMaterial(value, detailKey?)` |
| `Organism` | `_speciesPath` | `getSpecies()` / `setSpecies(value)` |
| `Species` | `_bodyPlanPath` | `getBodyPlan()` / `setBodyPlan(value)` / `getBodyPlanPath()` (raw — consumed by slot claims) |
| `Species` | `_parentCladePath` | `getParentClade()` / `setParentClade(value)` |
| `Species` | `_defaultMaterialPath` | `getDefaultMaterial()` / `setDefaultMaterial(value)` |
| `Mobile` | `_engagedModePath` (runtime-only) | `getEngagedMode()` / `setEngagedMode(value)` / `isEngagedIn(value)` |
| `Drivable` | `_vehicularModePath` | `getVehicularMode()` / `setVehicularMode(value)` |
| `BodyPlan` | `defaultLocomotionMode` (short-name variant; no `_xxxPath`, no leading slash) | `getDefaultLocomotionMode()` / `setDefaultLocomotionMode(value)` |
| `Atmospheric` | `_biomePath` | `getBiome()` / `setBiome(value)` ([biome.md](./subsystems/biome.md)) |
| `Biome` | `_extendsBiomePath` | `getExtendsBiome()` / `setExtendsBiome(value)` / `getExtendsBiomePath()` (raw — consumed by `BiomeApi`'s ancestry walker) |

---

## Pattern B — live Stuff reference

**Stores**: a direct reference to the live target Stuff object.

**Use when**:

- The target is a **specific instance** (a chair, an NPC, an item)
  whose identity-as-instance matters.
- The consumer reads target properties **frequently** in hot paths
  (containment walks, slot occupancy checks, perception scans).
- The field is **runtime-only**. Live refs are transient by
  definition — see the foundational constraint at the top of this
  doc; persisted "live ref" fields don't exist in the substrate.

**Why this shape**: direct property access without Api lookup;
TypeScript types catch mistakes; substrate invariants enforce
cleanup through the dispatcher.

### Field naming

```ts
protected _xxx: Stuff & XxxType;
// or for collections
protected _xxxs: Set<Stuff & XxxType>;
protected _xxxByKey: Map<string, Stuff & XxxType>;
```

- **Private** with `_` prefix.
- **No suffix** — the field stores the live ref, no need to disambiguate.

### Method surface

```ts
interface XxxOwner {
  getXxx(): Stuff & XxxType;     // or | null if optional
  setXxx(value: Stuff & XxxType): void;
}

// For collections (per docs/subsystems/collections.md):
interface XxxsOwner {
  getXxxs(): ReadonlySet<Stuff & XxxType>;
  addXxx(value: Stuff & XxxType): void;
  removeXxx(value: Stuff & XxxType): void;
  hasXxx(value: Stuff & XxxType): boolean;
}
```

Same getter/setter naming as Pattern A — the difference is the
RETURN type, not the method names. A caller writing `obj.getMaterial()`
doesn't know (or care) whether it's resolved from a stored path or
returned from a live ref; the contract is the same.

### Persistence (or lack thereof)

Live refs are **transient by definition**. They reset on clone /
hydrate to whatever default the field declares (null for a single
ref; empty collection for Set/Map). The substrate doesn't ship a
marshaller-for-live-refs path because no field in `lib/` needs one
— every container-shaped relationship rebuilds at hydrate via
template seeding (and per-character session state, for inventory).

If a relationship genuinely needs to survive saves, it lives one
layer up: either (a) the field stores a path string (Pattern A or
C), or (b) a higher-layer mixin owns the persistent shape and
hydrates the live refs from that.

### Pattern B sub-flavors (cleanup story)

Within Pattern B there are four structural sub-flavors,
distinguished by the cleanup rule that applies when one of the two
sides destructs. These are the **R2.1–R2.4 cleanup rules**:

#### R2.1 — Owning cascade

When the held side's lifetime is bounded by the holder's (the
held thing has no independent existence outside the holder), the
holder's `onDestruct` destructs each owned thing before chaining
`super.onDestruct()`.

- **Mechanism**: eager, convention-based.
- **Enforcement**: convention. Failure-mode is "owned objects
  leak" — caught later by GC; doesn't corrupt invariants.
- **Exemplars**: `Exitable.onDestruct` (outbound Exits),
  `Adornable.onDestruct` (fixtures). `AetherMixin.cleanupOnDestruct`
  destructs every hosted update (`AetherHosted` Ideas) — the
  must-be-hosted invariant gives updates no independent existence, so
  this owning cascade is framework-enforced (`cleanupOnDestruct`)
  rather than convention.

#### R2.2 — Symmetric two-way pair

For paired bidirectional refs (both sides hold each other), each
side's setter atomically updates both sides; each side's
`onDestruct` clears the back-ref on the other.

- **Mechanism**: eager via setter; eager on destruct.
- **Enforcement**: convention. Failure on one side is recoverable
  from the other side's surviving reference.
- **Exemplars**: `Boundary` ↔ `BoundaryAnchor`, `Exit` ↔ `Door`,
  `Adornment` ↔ `Adornable`.

#### R2.3 — Asymmetric single self-heal

For a single live ref where the target doesn't track the holder
back, the public getter MUST self-heal on `isDestroyed`:

```ts
public getX(): (Stuff & XxxType) | null {
  if (this._x === null) return null;
  if (this._x.isDestroyed()) {
    this._x = null;
    return null;
  }
  return this._x;
}
```

- **Mechanism**: lazy self-heal.
- **Enforcement**: in-code; the getter does it inline.
- **Exemplars**: `Containable.getContainer()` (when the Container
  destructs without first evacuating — backstop for S1/S2),
  `Spawned.getSpawner()`.

#### R2.4 — Collection symmetric cleanup (framework-enforced)

For any Pattern B collection of live refs (Set/Map of `Stuff & X`),
the held side MUST register a framework `static cleanupOnDestruct`
on its mixin that unhooks itself from every collection it's a
member of, via the canonical mutation chokepoint
(`ContainmentApi.move`, `Slotted.vacate`, `Spawner.untrackSpawn`,
etc.).

- **Mechanism**: eager, framework-enforced.
- **Enforcement**: framework. `StuffApi.destruct` dispatches via
  the mixin chain; subclass `onDestruct` overrides cannot bypass.
- **Walk order**: most-derived first / base last. For a host
  composing `ContainerMixin(ContainableMixin(Stuff))`, Container
  fires first (evacuates contents while `_container` is still
  set), then Containable (unhooks the destructed item from any
  outer container).
- **Exemplars**:
  - `Containable.cleanupOnDestruct` → `Container.contents`
  - `Container.cleanupOnDestruct` → evacuate contents to outer
  - `Slottable.cleanupOnDestruct` → `Slotted.slots` on every host
  - `Slotted.cleanupOnDestruct` → active vacate of every occupant
  - `Spawned.cleanupOnDestruct` → `Spawner._spawned`
  - `AetherHosted.cleanupOnDestruct` → host's `_hostedUpdates` (via
    the `_dropHostedUpdate` chokepoint, when destructed standalone
    while still hosted)
  - `Species.onDestruct` (concrete-class form) → `Clade.species`

R2.4 is the load-bearing rule of the cleanup story — it's the
reason `StuffApi.destruct` grows the mixin-registry dispatch step,
and it's the only one of the four where the framework actively
enforces correctness rather than trusting authoring discipline.

See [`docs/subsystems/mixins.md` § `cleanupOnDestruct`](./subsystems/mixins.md)
for the static-shape convention.

### Existing exemplars

| Site | Field | Cleanup rule | Notes |
|---|---|---|---|
| `Container` | `contents` | R2.4 (Container side) | Runtime-only; evacuates on destruct |
| `Containable` | `_container` (`environment`) | R2.3 + R2.4 (held side) | Runtime-only; self-heal getter + framework cleanup |
| `Slotted` | `slots` | R2.4 (holder side) | Runtime-only; active vacate fires `onSlotReleased` |
| `Slottable` | (none — held side) | R2.4 | Static cleanup walks every host |
| `Adornable` | `fixtureSlots` | R2.1 (owning cascade) | Holder destructs each fixture |
| `Exitable` | `exits` | R2.1 (owning cascade) | Holder destructs each outbound Exit |
| `Boundary` ↔ `BoundaryAnchor` | both sides | R2.2 (symmetric) | Convention-based reciprocal clear |
| `Exit` ↔ `Door` | both sides | R2.2 (symmetric) | Convention-based reciprocal clear |
| `Spawner` | `_spawned` | R2.4 (held side via `Spawned`) | Runtime-only; transient |
| `Spawned` | `_spawner` | R2.3 + R2.4 | Self-heal getter + static unhook |
| `Clade` | `species` | R2.4 (held side via `Species`) | `Species.onDestruct` chains the unhook |

---

## Pattern C — path-resolved cross-scope ref (singleton-only)

**Stores**: a templatePath string. The getter resolves on every
read via `StuffApi.findByTemplatePath`. **No runtime cache slot.**

**Use when**:

- The target is a **singleton-by-convention** Stuff (one instance
  per templatePath) that may live in a different load scope
  (different zone, hot-reload churn).
- The holder shouldn't hold a live ref because cross-scope identity
  is unstable: hot-reload churns the singleton; zone loading is
  lazy.
- Construction-time cyclic resolution is a concern.

Pattern C stays **singleton-only**. The "Pattern C generalized to
instances" idea is dropped under the foundational stuffId
constraint — a cross-scope ref to a multi-clone instance can't be
keyed by stuffId (doesn't persist), and a live ref doesn't survive
target unload. Within-session live refs to non-templated targets
are Pattern B; cross-reboot is unsupported until full game-state
dump exists.

### Field shape

```ts
protected _xxxPath: string | null = null;
```

That's it. No `_resolved` cache slot. The resolved-cache pattern
was dropped: the `byTemplatePath` index is O(1), the cache added a
self-heal complication for no measurable gain, and a stale cache
slot was a real hot-reload hazard.

### Method surface

```ts
interface PathRefXxxed {
  getXxx(): (Stuff & XxxType) | null;   // resolves on every call
  setXxx(value: Stuff & XxxType): void;  // stamps the path
  // Optional, only when zone-faulting is needed:
  async resolveXxx(): Promise<Stuff & XxxType>;  // async load on miss
  // Optional, only when a real caller needs the raw form:
  getXxxPath(): string | null;
}
```

The async `resolveXxx()` is an **Exit-specific affordance**, not a
Pattern C requirement. It exists because Exit destinations may
trigger zone-load faults during `Mobile.traverse`. Pattern C fields
that target already-loaded singletons should skip it.

### Existing exemplars

| Site | Field | Notes |
|---|---|---|
| `Exit` | `_destinationPath` | Cross-zone exits; resolves via `findByTemplatePath` every read; `resolveDestination()` for the zone-fault async path. No runtime cache. |

---

## Decision matrix

| Question | Pattern A | Pattern B | Pattern C |
|---|---|---|---|
| Target is a singleton (one per path)? | Best fit | OK | Best fit when cross-scope |
| Target is a specific instance? | Wrong shape | Best fit (within-scope) | Wrong shape (singleton-only) |
| Field is runtime-only? | Cheap (no marshaller) | Required (live refs are transient) | Cheap |
| Field is persisted? | Trivial (string) | Not supported — use Pattern A/C or move up a layer | Trivial (string) |
| Frequent property access? | One Api call per read | Direct | One Api call per read |
| Hot-reload stability of target? | Best (path stable) | Risk of stale (R2.3 self-heal compensates) | Best (re-resolves) |
| Construction-time cyclic deps? | No issue | Issue (may not have ref yet) | Handles |

**Default to Pattern A for singletons.** Promote to Pattern C only
when the target lives across load scopes AND the field's holder
shouldn't hold a live ref.

**Default to Pattern B for instances.** Patterns A and C are wrong
for non-singleton instances because "the templatePath of this chair"
isn't a meaningful identifier — chairs are clones, each with its own
runtime identity.

## Antipatterns

Things to avoid when working with refs to other Stuff.

### A.1 — Naming a string-storing field after the singleton type

```ts
// WRONG: misleading name
protected material: string | null;
public getMaterial(): string | null { return this.material; }

// RIGHT: name reflects storage
protected _materialPath: string | null;
public getMaterial(): Material | null { ... }  // resolves
```

The convenience getter `getMaterial()` should return a Material,
not a string. Callers who think "I'm asking for the material" should
get the material, not have to do a second lookup.

### A.2 — Exposing only the raw form when the singleton is what callers want

```ts
// WRONG: every caller has to do the lookup themselves
public getMaterialPath(): string | null;
// (no getMaterial() convenience)
```

Hot-path consumers (perception, render, validation) end up duplicating
the lookup across the codebase. Expose the convenience getter as the
default; expose the raw getter only when a real consumer needs it.

### A.3 — Adding a raw setter "for symmetry" without a real consumer

```ts
// WRONG without a real caller
public setMaterialPath(path: string | null): void { ... }
```

The singleton-form setter is the public write path. Tests and
framework code that need to write a string without a singleton in
hand go through bracket-assign on the private field directly (per
the Hydrator pattern).

Add a raw setter only when a real caller is forced to a string
write (e.g., a YAML loader that wants to defer singleton resolution
until later in bootstrap).

### A.4 — Storing live refs to singletons

```ts
// WRONG: live ref to a singleton
protected _material: Material | null;  // direct ref
```

Singletons should be referenced by path, not by live ref. Reasons:

- Hot-reload churns the live singleton; live refs go stale.
- Persistence needs a marshaller even though the target has a stable
  path.
- Path comparison (`a._materialPath === b._materialPath`) is honest;
  live-ref comparison may surprise after reload.

Use Pattern A.

### B.1 — Persisting a live ref

```ts
// WRONG: live refs are transient by definition
public persistentFields = ['_container'];  // _container is Stuff & Container
```

Live refs are runtime-only. Persistence needs either Pattern A/C
(store a path) or a higher-layer mixin that owns the persistent
shape (e.g., a templated `populates` manifest that re-creates the
relationship at hydrate).

### B.2 — Using a live ref for a cross-scope singleton

```ts
// WRONG: live ref to something that lives in another load scope
protected _destination: Stuff & Container;
```

If the holder and target may load separately (different zones,
hot-reload), a live ref goes stale or holds a destroyed instance.
Use Pattern C — store the path, resolve on read.

### B.3 — Holding an asymmetric single without R2.3 self-heal

```ts
// WRONG: getter returns potentially-destroyed ref
public getCage(): (Stuff & Cage) | null {
  return this._cage;
}
```

When the holder doesn't get framework cleanup notification (the
target doesn't track who points at it), the holder must self-heal
on read:

```ts
public getCage(): (Stuff & Cage) | null {
  if (this._cage === null) return null;
  if (this._cage.isDestroyed()) {
    this._cage = null;
    return null;
  }
  return this._cage;
}
```

### B.4 — Holding a collection of live refs without R2.4 symmetric cleanup

```ts
// WRONG: collection accumulates destroyed entries; iteration walks
// destroyed objects; substrate invariants drift.
class FactionMembership extends ... {
  private members: Set<Character> = new Set();
  // (no static cleanupOnDestruct — collection leaks dead refs)
}
```

Mixins that hold a collection of live Stuff refs (or that are the
held side of one) MUST register a `static cleanupOnDestruct(stuff)`
that unhooks via the canonical mutation chokepoint. The dispatcher
walks the mixin chain on every destruct; subclass overrides cannot
bypass it.

---

## Where to put new singleton refs

When introducing a new singleton-ref field:

1. Pick the field name: `_xxxPath` (private, `Path` suffix).
2. Add to `persistentFields` if the ref should survive saves.
3. Implement `getXxx(): Xxx | null` using the relevant Api's
   findByPath / findByTemplatePath / etc.
4. Implement `setXxx(value: Xxx | null)` extracting
   `value.getTemplatePath()`.
5. Add a `getXxxPath(): string | null` raw getter ONLY if a
   specific consumer needs it (and document the consumer in a
   comment).
6. Add an `isXxx(value: Xxx | string)` predicate ONLY if callers
   genuinely want the polymorphic form (most don't).
7. Hydrator handles persistence automatically — it bracket-assigns
   the path string onto `_xxxPath` directly.

When introducing a new live-ref field:

1. Pick the field name: `_xxx` (private, no suffix).
2. The field is runtime-only — do NOT add to `persistentFields`.
3. Implement `getXxx(): Xxx` and `setXxx(value: Xxx)`. For
   asymmetric singles, fold R2.3 self-heal into the getter.
4. For collections, follow the patterns in
   [docs/subsystems/collections.md](./subsystems/collections.md)
   AND register `static cleanupOnDestruct` per R2.4.

When in doubt: Pattern A for singleton Ideas (Material / Species /
BodyPlan / Clade / LocomotionMode), Pattern B for everything else
unless you specifically need cross-scope addressability for a
singleton — in which case Pattern C.
