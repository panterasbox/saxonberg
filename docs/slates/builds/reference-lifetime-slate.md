# Reference-lifetime slate — declare how long a ref holds

> **Status: design captured 2026-08-01, not built.** Surfaced during the
> mortality build, from one small question — *why does `MortalArc` store a
> stuffId instead of the object?* — which turned out to be about a gap in
> the platform rather than about corpses.
>
> **The one-line thesis:** the four cleanup rules
> ([ref-shapes.md](../../ref-shapes.md) R2.1–R2.4) already say exactly how
> long each kind of reference should hold. Three of the four are enforced
> by **convention** — hand-written boilerplate an author must remember —
> and forgetting them fails **silently**. Declare the rule per field and
> let the framework enforce it.

## Why it matters more than it looks

Today most cross-object references in the world are **path strings**
(Pattern A) because most of the world is still singletons. That is a
property of a young world, not of the design. As content grows, most
objects are **clones, instanced all over the place** — and every one of
those relationships is Pattern B, a live ref, carrying a cleanup
obligation.

So this is not an engine-internals nicety. It is the pattern content
authors will follow thousands of times, and it should be one they cannot
get wrong by forgetting four lines.

## What already exists

`ref-shapes.md` enumerates four sub-flavors, distinguished by what happens
when one side destructs:

| rule | shape | enforcement today |
|---|---|---|
| **R2.1** owning cascade | holder destructs what it owns | **convention** — "failure-mode: owned objects leak" |
| **R2.2** symmetric pair | each side clears the other | **convention** |
| **R2.3** asymmetric self-heal | getter nulls on `isDestroyed` | **in-code**, inline in every getter |
| **R2.4** collection symmetric | Set/Map of live refs | framework-enforced |

R2.4 is already mechanized. The other three are prose plus discipline.

R2.3's shipped exemplars are `Containable.getContainer()` and
`Spawned.getSpawner()` — each carrying its own hand-written copy of:

```ts
if (this._x === null) return null;
if (this._x.isDestroyed()) { this._x = null; return null; }
return this._x;
```

That is the whole mechanism: **lazy, deterministic** (`isDestroyed`, never
GC timing), and it releases retention by nulling the slot on read.

## The shape

Declare the rule beside the field, in the idiom the codebase already uses
for field metadata (`persistentFields`, `instructionFields`,
`fieldMarshallers` — collected up the prototype chain by
`MixinApi.getAll*`):

```ts
static referenceFields = {
  _corpse: 'weak',       // R2.3 — self-heal on read
  _door:   'symmetric',  // R2.2 — clear both sides on destruct
  _exits:  'owned',      // R2.1 — cascade destruct
};
```

The author writes a plain, typed getter and never thinks about lifetime
again. One thing to learn — *say how long your reference holds* — and the
same muscle as declaring a field persistent.

Map-shaped rather than list-shaped is consistent with what is there: the
codebase already picks shape by whether the concern carries a value
(`fieldMarshallers` is a map, `persistentFields` a set).

## Options considered and rejected

**A wrapper type (`StuffRef<T>` with `.get()`).** Adds a competing pattern
beside R2.3 rather than completing it, and puts ceremony at every read
site. The declaration keeps the field naturally typed and the call sites
unchanged.

**Real `WeakRef<>`.** Wrong tool, specifically: `StuffApi` holds strong
refs in its registries while an object is registered, so a `WeakRef` could
essentially never clear while the target is live — and after `unregister`
it clears **nondeterministically**, on GC timing. That imports irreproducible
behavior into a residency story that is otherwise deterministic and tested.
Lifetime here is *managed* (`canEvict` → `unregister` → destruct), not
refcounted; GC-flavored answers are a category mismatch.

**A stuffId handle.** Works — self-invalidating, no obligation — but
stringly-typed, loses narrowing, and is weak only by convention (nothing
stops a caller caching the lookup). It is what you reach for when the
mechanism above is missing.

**Field decorators (`@weak`).** Blocked in practice: **102 mixins return a
class *expression***, and legacy decorators are not valid there (verified —
`VitalsMixin` had to become a class declaration to take `@CallSecurity`).
Converting all 102 is its own build, and it buys ergonomics rather than
capability. There is also a mixin wrinkle: each mixin's decorator writes to
its own class's static, so the union-up-the-chain collection would need a
constructor-keyed registry anyway.

## The follow-on it implies — metadata unification

There are now **six** field-metadata statics, plus a third mechanism
entirely (TSDoc tags: `@authorable`, `@runtimeState`, `@hook`, read by the
studio and the author-surface projection):

| static | files |
|---|---|
| `persistentFields` | 231 |
| `commandContributions` | 61 |
| `fieldMarshallers` | 16 |
| `settings` | 15 |
| `instructionFields` | 10 |
| `globIdentityFields` | 7 |

The natural end state is to **invert**: one field-keyed structure where
each field declares everything about itself.

```ts
static fieldMeta = {
  _corpse: { ref: 'weak' },
  age:     { persistent: true, authorable: true },
  mass:    { persistent: true, marshaller: '/lib/persistence/…/kg' },
};
```

**Deliberately NOT bundled with the mechanization above.** `persistentFields`
alone is 231 files, and persistence is the highest-consequence subsystem in
the tree; landing a metadata migration together with a behavioral change to
reference cleanup means debugging both at once if either misbehaves. Do the
rules first, invert second.

The unification also has to decide whether the **doc tags fold in** —
`@authorable` and `@runtimeState` are field metadata expressed as comments,
and the projection reads them. That is a real design question, not a
mechanical one.

## Rough shape of the work

1. **The collector** — `MixinApi.getAllReferenceFields(ctor)`, mirroring the
   shipped `getAllPersistentFields` prototype walk.
2. **R2.3 first** — mechanize the self-heal, convert
   `Containable.getContainer()` and `Spawned.getSpawner()`. Smallest,
   highest-frequency, and already has exemplars to match byte-for-byte.
3. **R2.2 and R2.1** — the destruct-side rules. These need the
   `onDestruct` chain to consult the declaration; watch the residency
   corollary (an R2.1/R2.2 relationship vetoes `canEvict` while its anchor
   lives), which is the part that must not regress.
4. **Sweep** — find Pattern B fields that are silently missing their rule
   today. The likely finding is that some exist; the failure is quiet, so
   nobody would have noticed.
5. **`ref-shapes.md`** graduates from "here is the boilerplate to write" to
   "here is the rule to declare".

## Open questions

- **Does `weak` need a variant that also drops the strong slot eagerly**
  (on the target's destruct) rather than lazily on next read? Lazy is
  cheaper and needs no reverse index; eager frees sooner. Probably lazy
  everywhere, but worth confirming against a large world.
- **What happens to a declared ref that is also persisted?** Persisted
  live refs do not exist in the substrate — so declaring a persistent field
  `weak` should probably be a build-time error, which the collector could
  enforce.
- **Should R2.4 collections fold into the same declaration**, given they
  are already framework-enforced by a different route?

## Cross-references

- [ref-shapes.md](../../ref-shapes.md) — R2.1–R2.4, the three reference
  shapes, and the residency corollary.
- [residency.md](../../subsystems/residency.md) — `canEvict`, the relational
  veto roster derived from these rules.
- [mortality.md](../../subsystems/mortality.md) — where the question came
  from. `MortalArc` ended up holding **no** object handle at all, which was
  the right local answer and is why this is a slate rather than a patch.
