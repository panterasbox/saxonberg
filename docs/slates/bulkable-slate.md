# Bulkable slate (working doc)

Working slate for the bulk form of quantity-bearing Stuff —
continuous mass-or-volume measured matter (flour, water, sand,
bread, cheese). Sibling to the (now-shipped) globbable substrate;
shares its substrate (placeDirect, MqlQuantity union, distribution
algorithm, response envelope notes) but differs on storage type,
arithmetic, threshold rules, and divisibility default.

This slate is exploratory. Globbable shipped first
([subsystems/glob.md](../subsystems/glob.md)); bulk follows when
content (recipes, beverages, alchemy, food prep) demands it. The
slate's job is to **freeze the contract surface** that globbable
already aligned with, and capture the design forks bulk has to
settle.

See also:

- [docs/subsystems/glob.md](../subsystems/glob.md) — the discrete-
  count sibling, shipped. Many sections of this slate cross-
  reference its mechanics rather than re-document.
- [docs/subsystems/quantities.md](../subsystems/quantities.md) —
  `Quantity<U>` substrate that backs Bulkable's storage. Read this
  first — bulk's design depends on the quantity machinery.
- [docs/subsystems/response-envelope.md](../subsystems/response-envelope.md)
  — same notes carry over with measure-typed payloads.
- [docs/slates/collision-slate.md](./collision-slate.md) — capacity
  in mass/volume terms is where bulk-bearing containers fit naturally.

---

## Principle

A **bulk** is a Stuff that represents a continuous measured quantity
of matter. Where a glob says "30 coins" (integer count), a bulk says
"2.3 kg of flour" (`Quantity<'kg'>`). The framework treats the Stuff
as if it were the measured amount at the contract surface (`drink 2
cups of water`, "1.5 kg of flour is on the counter"), but stores one
row.

Three guarantees parallel to Globbable's:

1. **One Stuff, measured amount.** A pile of 2.3 kg flour is one
   Stuff with `quantity: Quantity.of(2.3, 'kg')`, not 2300 sibling
   Stuffs.
2. **Quantity is part of identity.** Bulks render with their measure
   (`2.3 kg flour`, `half a cup of water`); ordinal-style MQL
   (`flour:[2]`) does NOT index into a bulk's measure.
3. **Not every bulk is divisible on demand.** Stacks are trivially
   splittable; bulks usually aren't (most need a tool, vessel, or
   environment to subdivide). Divisibility is the deliberate design
   axis this slate explores.

---

## What carries over from globbable

The following are *shared substrate*. Bulk reuses, doesn't redefine:

- **`ContainmentApi.placeDirect`** — bulk splits land in source's
  environment via the same primitive. The matter-was-already-there
  reasoning is unit-agnostic.
- **`MqlResult.quantity` slot** with `value.kind: 'measure'`
  discriminator (reserved). The `mode: 'strict' | 'lenient'`
  discriminator applies identically.
- **`:{N}` formal syntax** body grammar extends to `:{N unit}`
  (`flour:{500 g}`, `water:{2 cups}`).
- **Distribution algorithm** in the helper — walk candidates in
  scored order, take `min(contribution, remaining)` per match.
  Substitutes Quantity arithmetic for integer arithmetic.
- **Response envelope notes** — `quantity-clamped`,
  `quantity-clamped-rejected`, `empty-result` all carry over with
  measure-typed payloads.
- **Display rendering** — same `getQuantity()` contract surface;
  DescribeApi v2 picks the unit-formatting path (`2.3 kg flour`).
- **Persistence piggyback for identity-bearing fields** — see open
  question on whether to unify the abstraction or have
  `bulkIdentityFields` parallel to `globIdentityFields`.
- **`@CallSecurity(SecurityPolicies.ApiOnly)`** on the low-level
  primitives.

---

## Where bulk diverges

### Storage type and host-fixed unit

```ts
// Bulkable mixin's persistent field
quantity: Quantity<U>;     // U is host-fixed at class definition
```

Per the Tangible precedent (`mass: Quantity<'kg'>`), bulk hosts fix
the unit at class definition time. A `Flour` class is always
`Quantity<'kg'>`; a `Water` class is always `Quantity<'liter'>`.
Runtime values can't mix units within a stack. The
`QuantityMarshaller` (existing in `lib/persistence/`) handles
round-tripping.

Authoring shape in templates:

```yaml
# /obj/material/Flour/seed.yaml
path:  /obj/material/Flour
class: /lib/bulk/Flour              # composes Bulkable
data:
  keywords: [flour]
  quantity: "1 kg"                  # parsed via QuantityMarshaller
```

### Arithmetic and threshold

- **Math**: `Quantity.add(a, b)` / `Quantity.subtract` with unit
  propagation. Quantities substrate handles the per-unit math op
  table.
- **Threshold**: floating-point residues mean `quantity === 0` is
  unreliable. Hosts declare a `static destructThreshold`:

  ```ts
  class Flour extends BulkableThing {
    static destructThreshold = Quantity.of(1, 'g');   // < 1g, destruct
  }
  ```

  When a setQuantity / split / drain operation would leave the
  source below threshold, the source destructs; the residue is
  rolled into the split-off (or just dropped, if the split-off is
  also below threshold — design decision deferred until a recipe
  surfaces the constraint).

### Divisibility — the structural difference

Stacks are trivially splittable by virtue of integer counting. Bulks
usually aren't. Most bulk needs *something* — a knife, a measuring
cup, a vessel — to subdivide on demand.

This is the slate's central design fork. Two factorings:

#### Option A — single mixin, restrictive default

`Bulkable` bundles measurement and splittability. `canSplit` defaults
to `false`; authors override per-host to opt in. Composition is
simple (one mixin); the default protects against accidental
divisibility.

#### Option B — two mixins, separate concerns

```
Bulkable      — "I have a Quantity<U>" (measurement, display, persist)
Subdivisible  — "I can be subdivided on demand" (canSplit seam,
                onSplit witness, applyMeasure helper integration)
```

A class composing only `Bulkable` is one-Stuff-with-measure — a
sealed bottle whose contents you can describe but not directly
subdivide. A class composing both is the splittable-bulk case (a
sack of flour, an open jug of water).

| | Option A | Option B |
|---|---|---|
| Mixin count | 1 | 2 |
| Composition for "sealed bottle" | Bulkable + override canSplit→false | Just Bulkable |
| Composition for "flour sack" | Bulkable + override canSplit→true | Bulkable + Subdivisible |
| Distinguishability at type-level | runtime check on canSplit | structural via Mixins.Subdivisible |
| Mirror of Globbable | yes (Globbable bundles too) | no (Globbable bundles; Bulkable decomposes) |

I lean **B** — the two-mixin factoring matches the substrate's
empirical reality (most bulk isn't divisible). But it's a real
choice, and either works.

### `canSplit` signature

The Globbable signature is `canSplit(n: number): boolean`. Bulk wants
richer context — divisibility often depends on the actor (do they
have a knife?), the environment (is there a vessel?), or the verb
(`cut` vs `pour`). Three options:

- **Per-host introspection** — host classes pull context from a
  dispatch-context registry. Fragile.
- **Extended signature** — `canSplit(amount, ctx?: SplitContext)`
  where `SplitContext` carries actor, environment, verb intent.
  Cleaner. Means updating Globbable's signature too (or a parallel
  Bulkable signature).
- **Defer to validators** — `canSplit` stays a pure "is this an
  internally valid quantity" check. Tool/vessel/skill checks live
  in verb-level validators that run before the helper. Globbable's
  current contract.

Lean: **defer to validators where possible, extend `canSplit` only
for invariants the source itself owns**. Tools and vessels are the
actor's concern, not the source's. The source can answer "do I have
enough to split N off?" without knowing who's asking.

This lets `canSplit(amount)` stay simple for both stacks and bulks.

### Formal syntax — `:{N unit}`

The `{...}` body grammar extends:

```
flour:{500 g}             500 grams of flour (strict)
water:{2 cups}            2 cups of water (strict)
flour:{*}                 all the flour (strict)
flour:{half}              half the flour (future; deferred)
```

Unit tokens parse via the Quantities tag-table registry — `g`,
`kg`, `cups`, `ml`, etc. are existing unit aliases.

For the natural-language path, the desugar pass needs richer parsing:
`pour 2 cups water` → quantity hint = `Quantity.of(2, 'cups')`.
Probably a multi-token capture rather than just integer-prefix. The
parser may consult `GrammarApi` for unit-token recognition.

This is a real grammar lift. Worth a dedicated parser section when
the slate gets to implementation.

### Distribution algorithm — same shape, Quantity math

The helper (call it `BulkableApi.applyMeasure` to parallel
`GlobbableApi.applyCount`):

```ts
class BulkableApi {
  static async applyMeasure<R>(
    candidates: Stuff[],                  // resolver result, scored order
    quantity: MqlQuantity,                // value.kind === 'measure'
    action: (operand: Stuff, applied: Quantity<U>)
      => Promise<{ ok: boolean; payload?: R }>,
  ): Promise<{
    ok: boolean;
    applied: Quantity<U>;
    status?: DispatchStatus;
    notes: Note[];
    payloads: R[];
  }>;
}
```

Behavior is the structural mirror of `applyCount`:

- Pre-check (strict): `Quantity.sum(c.quantity for c in candidates)
  >= requested`. Decline with `quantity-clamped-rejected` on
  shortfall.
- Walk: per-candidate, `contribution = Quantity.min(c.quantity,
  remaining)`; split if contribution < c.quantity; action(operand,
  contribution); reglob on failure.
- Clamp note on lenient overflow.

Empty candidate list, sibling visibility, witness semantics:
identical to Globbable.

### Unit conversion at merge

Open: two bulk Stuffs, same template, *compatible but different
units* (one in kg, one in lbs, both flour). Auto-convert at merge?

- **Yes**: Quantities substrate handles conversion; merge folds
  cleanly. Authors don't have to think about it.
- **No**: incompatible-unit globs are treated as non-mergeable. Author
  has to convert deliberately.

I lean **yes-auto-convert** — the matter is the same; the unit is a
representation choice. The host's fixed unit (`Quantity<'kg'>` for
Flour) is the canonical form on the merged result.

In practice this collapses to: at merge time, `absorbed.quantity` is
converted to survivor's unit before addition. Throws if units aren't
in the same dimension (e.g., kg + cups for the same Flour template
shouldn't happen — both should be mass — but the safety check is
cheap).

---

## Verb roster — bulk-specific

Stacks ship with `drop`, `get`, `give`. Bulk verbs are different:

- **`pour`** — split fluid into a vessel
- **`fill`** — pour until target is full
- **`drink`** — actor consumes from a fluid (Edible / Drinkable mixin
  combo)
- **`eat`** — actor consumes from a solid bulk (bread, cheese)
- **`cut`** — slice off a portion (requires Subdivisible + a cutting
  tool validator)
- **`scoop`** — take a portion via container (sand, flour)
- **`spill`** — drop bulk into the environment (special case of
  `pour` where the destination is the source's environment)

Many of these are activity-shaped (durative): pouring takes time,
eating is a sustained action. The activity framework
(`subsystems/activity.md`) consumes `applyMeasure` as the discrete
underlying operation.

---

## Open questions

- **Mixin decomposition (Option A vs B above).** The biggest design
  fork. Decision waits for first content driver.
- **Unified `identityFields` abstraction?** Globbable has
  `globIdentityFields`; Bulkable would have `bulkIdentityFields`.
  The mechanism (subset of persistentFields, copied on split,
  compared on merge) is identical. Worth unifying as
  `quantifiedIdentityFields` or just `identityFields`? Mild
  refactor; do at bulk-implementation time.
- **Mixed candidate lists.** Can MQL return a mix of globbables and
  bulkables (`take fluid` against [water (bulk), ice (glob)])?
  Probably resolve at MQL level: a single field is either count-
  typed or measure-typed; mixing requires two fields. Worth thinking
  about more when content surfaces it.
- **Helper unification or split.** Single `applyQuantity` that
  dispatches internally on `value.kind`, or `applyCount` +
  `applyMeasure` as separate Apis? Lean separate — the action
  callback signatures differ (`(operand, number)` vs `(operand,
  Quantity<U>)`), and conflating them obscures the type at the call
  site. But both work.
- **Threshold semantics on partial drain.** When draining `n` from a
  source leaves `source - n < destructThreshold`, what happens?
  Three options: (a) clamp `n` to `source - threshold` and leave a
  stub; (b) round up — drain everything; (c) destruct source and
  add residue to the split-off. Lean (b) for usability. Settle when
  recipe content surfaces it.
- **Concurrent activities on the same bulk.** Two actors drinking
  from the same well at the same time — the activity slate's
  engagement-slot model probably handles this. Worth checking when
  activity ships.
- **Pluralization for bulk display.** "2.3 kg of flour" vs "0.5 kg
  of flour" — the unit word doesn't pluralize the way "coin"/"coins"
  does. DescribeApi v2 handles unit-formatting; bulk's host display
  contract differs from globbable's (no `getPluralForm` needed; the
  unit carries it).

---

## v1 acceptance roster (hypothetical, for shape)

If/when bulk ships, the acceptance set looks like:

```
> pour 2 cups water into mug         # well of water, empty mug
You pour 2 cups of water into the mug.       (status = ok)

> pour 99 cups water into mug         # well has 4 cups left
You pour the last 4 cups of water into       (status = partial,
  the mug.                                    notes: [quantity-clamped:
                                              requested=99 cups,
                                              applied=4 cups])

> water:{2 cups}                       # formal — vessel ambiguous
                                       # (requires target field)
> pour water:{2 cups} into mug
You pour 2 cups of water into the mug.       (status = ok)

> pour water:{99 cups} into mug        # only 4 available
(no action)                                   (status = declined,
                                               notes: [quantity-clamped-
                                               rejected: requested=99 cups,
                                               available=4 cups])

> cut 100g cheese                      # requires knife (validator)
You don't have anything to cut with.          (status = declined,
                                               from validator)

> cut 100g cheese                      # with knife in hand
You cut a 100g piece of cheese.               (status = ok)
```

---

## Cross-references

- [docs/subsystems/glob.md](../subsystems/glob.md) — the discrete-
  count sibling; this slate references its mechanics rather than
  re-documenting them.
- [docs/subsystems/quantities.md](../subsystems/quantities.md) —
  the `Quantity<U>` substrate that backs everything here.
- [docs/subsystems/response-envelope.md](../subsystems/response-envelope.md)
  — note kinds carry over.
- [docs/slates/collision-slate.md](./collision-slate.md) — capacity
  in mass/volume terms fits naturally.
- [docs/subsystems/activity.md](../subsystems/activity.md) — many
  bulk verbs are durative; the activity framework wraps
  `applyMeasure` as the discrete underlying operation.
