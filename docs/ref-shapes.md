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

---

## Pattern B — live Stuff reference

**Stores**: a direct reference to the live target Stuff object.

**Use when**:

- The target is a **specific instance** (a chair, an NPC, an item)
  whose identity-as-instance matters.
- The consumer reads target properties **frequently** in hot paths
  (containment walks, slot occupancy checks, perception scans).
- The field's persistence (if any) is handled by a marshaller that
  writes templatePath+stamp and resolves on hydrate.

**Why this shape**: direct property access without Api lookup;
TypeScript types catch mistakes; persistence-via-marshaller is the
established carve-out for live refs.

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

### Persistence

Live refs that need to survive across saves go through the marshaller
framework (see [docs/subsystems/persistence.md](./subsystems/persistence.md)).
The marshaller writes the target's templatePath + a stamp; on hydrate,
it resolves back to a live ref via `StuffApi.findByTemplatePath`.

Runtime-only live refs (slot occupancy, transient event subscriptions)
have no persistence story — they reset on clone/hydrate, same as
runtime-only Pattern A fields.

### Existing exemplars

| Site | Field | Notes |
|---|---|---|
| `Container` | `contents` | Live refs; persisted via marshaller |
| `Containable` | `_container` | Single live ref; persisted via marshaller |
| `Slotted` | `slots: Map<string, Set<Stuff & Slottable>>` | Runtime-only; resets on hydrate |
| `Exit` | `_door` | Optional live ref |
| `Clade` | `species: Set<Species>` | Runtime-only registration (the species themselves are persisted; this is the inverse-index) |

---

## Pattern C — lazy ref (templatePath persisted, materialized on read)

**Stores**: templatePath string AS the persistent field; a private
`_resolved` slot holds the materialized live ref after first access.

**Use when**:

- The target is a singleton OR instance, but the live ref may not
  exist at construction time (cyclic dependencies, lazy template
  load).
- After resolution, consumers want **live-ref ergonomics** (frequent
  property access).
- Persistence shape should stay as a simple string (no marshaller
  ceremony for the persistent path).

### Field shape

```ts
protected _xxxPath: string | null = null;
private _xxxResolved: (Stuff & XxxType) | null = null;
```

- Persistent: just the path.
- Runtime-only resolve cache.

### Method surface

```ts
interface LazyXxxed {
  async resolveXxx(): Promise<Stuff & XxxType>;  // explicit resolve (async, may fault in template)
  getXxx(): Stuff & XxxType;                      // throws if not yet resolved
  getXxxPath(): string | null;                    // raw path (verifier-friendly)
  setXxx(value: Stuff & XxxType): void;           // sets both path and resolve cache
  setXxxPath(path: string | null): void;          // sets just the path; clears resolve cache
}
```

The `resolveXxx()` is async because resolution may need to clone
from template (via `StuffApi.singleton(path)` → `clone(path)`). The
sync `getXxx()` returns the cached live ref or throws — callers
must `await resolveXxx()` first if the ref isn't warm.

### Existing exemplars

| Site | Field | Notes |
|---|---|---|
| `Exit` | `_destinationPath` + lazy `_destination` | Lazy because authored exits may reference destinations not yet loaded |

---

## Decision matrix

| Question | Pattern A | Pattern B | Pattern C |
|---|---|---|---|
| Target is a singleton (one per path)? | Best fit | OK | OK |
| Target is a specific instance? | Wrong shape | Best fit | OK if lazy needed |
| Field is runtime-only? | Cheap (no marshaller) | Cheap | Cheap |
| Field is persisted? | Trivial (string) | Marshaller required | Trivial (string) |
| Frequent property access? | One Api call per read | Direct | Direct after warm |
| Hot-reload stability of target? | Best (path stable) | Risk of stale | Stable (re-resolves) |
| Construction-time cyclic deps? | No issue | Issue (may not have ref yet) | Handles |

**Default to Pattern A for singletons.** Promote to Pattern C only
when a real consumer needs sync property access AND construction-time
acquisition is a real problem.

**Default to Pattern B for instances.** Patterns A and C are wrong
for non-singleton instances because "the templatePath of this chair"
isn't a meaningful identifier — chairs are clones, each with its own
runtime identity.

## Antipatterns

Things to avoid when working with singleton refs:

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

### B.1 — Persisting a live ref without a marshaller

```ts
// WRONG: live ref in persistentFields, no marshaller
public persistentFields = ['_container'];  // _container is Stuff & Container
```

Persistence layer doesn't know how to write a live Stuff ref by
default — it'd write the whole object graph (cycles) or fail. Either
register a marshaller or convert to Pattern A.

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
2. If the field is persisted, register a marshaller (see
   [docs/subsystems/persistence.md](./subsystems/persistence.md)).
3. Implement `getXxx(): Xxx` and `setXxx(value: Xxx)`.
4. For collections, follow the patterns in
   [docs/subsystems/collections.md](./subsystems/collections.md).

When in doubt: Pattern A for singleton Ideas (Material / Species /
BodyPlan / Clade / LocomotionMode), Pattern B for everything else
unless you specifically need lazy materialization.
