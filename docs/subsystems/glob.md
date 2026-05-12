# Glob subsystem — fungible stacks

The glob subsystem models "a quantity of indistinguishable units" as
a single Stuff with an integer `quantity` field. A 30-coin stack is
one Stuff, not 30 sibling Stuffs; the framework treats it as 30
units at the contract surface (`drop 5 coins`, `30 coins are
here`) while persisting one row.

Pieces:

- **`GlobbableMixin`** (`lib/stuff/Globbable.ts`) — the substrate
  declaration. Adds `quantity: number`, the inter-Stuff contract
  methods (`getQuantity` / `setQuantity` / `canMergeWith` /
  `canSplit` / `onSplit` / `onMerged`), and the
  `globIdentityFields` static.
- **`Mixins.Globbable` / `MixinApi.isGlobbable`** — registry constant
  and predicate, same pattern as every other mixin.
- **`GlobbableApi`** (`api/glob.ts`) — `split`, `merge`, `canMerge`,
  `formatName`, and the `applyQuantity` workhorse used by every
  quantity-bearing controller.
- **`ContainmentApi.placeDirect`** — fresh-placement primitive used
  by split. Bypasses arrival/leave witnesses, capacity validators,
  and the merge-on-arrival ripple. Gated `ApiOnly`.
- **Merge-on-arrival ripple** — `ContainmentApi.move` fires a
  late-bound hook after `onContainableAdded`; the hook scans the
  destination for a mergeable sibling and absorbs the arrival.
- **MQL touchpoints** — `MqlOneResult` / `MqlManyResult` carry an
  optional `quantity: MqlQuantity`; formal `:{N}` / `:{*}` parses to
  a `QuantityNode`; natural-language `5 coins` / `all coins` rides
  on desugar's side-channel hint.

The full design (including bulk-form extension and the response-
envelope interaction) lives in
[../slates/globbable-slate.md](../slates/globbable-slate.md);
this file is the operational reference once it's shipped.

---

## The mixin

```ts
export interface Globbable {
  getQuantity(): number;
  setQuantity(n: number): void;          // validates n >= 1, integer
  canMergeWith(other: Stuff): boolean;   // veto seam
  canSplit(n: number): boolean;          // veto seam
  onSplit(splitoff: Stuff): void;        // witness on source
  onMerged(absorbed: Stuff): void;       // witness on survivor
}
```

Persistent field: `quantity: number` (default 1). Cloning a template
with `data.quantity: 50` produces a 50-stack; omitting it defaults
to 1.

`onSplit` and `onMerged` ship as no-op terminals so subclasses can
`super.onSplit(splitoff)` without ceremony — same shape as
`Stuff.onDestruct()`.

### `globIdentityFields ⊂ persistentFields`

A class declares a (possibly empty) subset of its `persistentFields`
that defines glob identity:

```ts
class Coin extends GlobbableMixin(Thing) {
  static persistentFields = ['tarnished', 'denomination', 'lastTouchedAt'];
  static globIdentityFields = ['tarnished', 'denomination'];
  // ...
}
```

Two stacks of `Coin` merge iff:

1. Same template path (`stuff.getTemplatePath()`).
2. Neither side has shadows.
3. Neither side has attached adornments.
4. Equal values for every field in the **union** of both classes'
   `globIdentityFields`.

Subclasses extend the parent's list:
`static globIdentityFields = [...Coin.globIdentityFields, 'mintMark']`.

The framework verifies `globIdentityFields ⊂ persistentFields` at
class-registration time via `MixinApi.assertComposable` —
runtime-only fields can't define glob identity (they wouldn't survive
save/load and the two "matching" stacks would diverge after a
reload).

### Composition constraints

`Globbable ⊥ Container` — a glob is not a container, so composing
both at the class level throws at first registration. The same
`__validateComposition__` hook runs `globIdentityFields ⊂
persistentFields`.

### Defaults

- `globIdentityFields = []` is legal and means *every* instance of
  this glob is mergeable with every other (strict template-fungibility).
- Coin-with-fields above behaves more carefully — only same-denomination
  same-tarnish stacks merge.

---

## `GlobbableApi.split`

```ts
GlobbableApi.split(source, n): Promise<Stuff & Globbable>
```

- Validates `n` is a positive integer ≤ `source.getQuantity()`.
- Calls `source.canSplit(n)` (shadow seam); throws on veto.
- **Whole-stack short circuit**: `n === source.getQuantity()` returns
  `source` itself with no clone (the caller is going to move the
  whole stack).
- Otherwise:
  - `StuffApi.clone(source.getTemplatePath())` → splitoff.
  - Copies every value in `source.constructor.globIdentityFields`
    onto the splitoff via the public method surface (`getX` / `setX`
    if present, falling back to direct property access).
  - Sets `splitoff.setQuantity(n)`; `source.setQuantity(M - n)`.
  - **Places the splitoff via `ContainmentApi.placeDirect`** into
    `source.getContainer()` (codebase method name — the slate calls
    it `getEnvironment` colloquially). No arrival witnesses fire.
  - Fires `source.onSplit(splitoff)`.

Decorated `@CallSecurity(SecurityPolicies.ApiOnly)` because the
placeDirect bypass is too powerful for non-Api callers.

The split is **within-container subdivision, not movement**. The
matter was already in the room before the split; subdividing it
doesn't constitute "arrival." That's what `placeDirect` ensures.

---

## `GlobbableApi.merge`

```ts
GlobbableApi.merge(survivor, absorbed): void
```

- Validates both are Globbable and that `survivor.canMergeWith(absorbed)`
  returns true.
- `survivor.setQuantity(survivor.getQuantity() + absorbed.getQuantity())`.
- `StuffApi.destruct(absorbed)` — fires its `onDestruct` chain,
  including the Containable cleanup that unhooks absorbed from its
  container. Subscribers that want "this Stuff went away" hook here.
- Fires `survivor.onMerged(absorbed)`.

`merge` itself emits no movement events. Two integration sites:

1. **Merge-on-arrival ripple** in `ContainmentApi.move`. After the
   post-move `on*` witnesses, the late-bound hook scans the
   destination for a mergeable sibling and calls `merge`. Ordering:
   merge **after** `onContainableAdded` so subscribers see the
   arrival as a distinct event before the destruct.
2. **Reglob** inside `applyQuantity`. When the action callback
   returns `{ ok: false }` for a candidate that was split, the
   operand is folded back into the source.

Decorated `@CallSecurity(SecurityPolicies.ApiOnly)`.

---

## `ContainmentApi.placeDirect`

```ts
ContainmentApi.placeDirect(item, env): void
```

Sibling to `move` for the "matter was already there" case:

| | `move` | `placeDirect` |
|---|---|---|
| Departure events (`onContainableRemoved`) | Fires | None |
| Arrival events (`onContainableAdded`) | Fires | None |
| `onMoved` on item | Fires | None |
| Capacity validators | Run | Bypassed |
| Mixin compatibility (Containable / Container) | Validated | Validated |
| Merge-on-arrival ripple | Triggers | Bypassed |
| Accepts existing-container item | Yes | **No** — throws |
| Security | (none) | `ApiOnly` |

**Fresh-placement precondition**: `item.getContainer() === null`.
Existing-container Stuffs must go through `move`. This single check
rules out smuggling (moving an item past leave-witnesses) and
teleport-past-guard (relocating without arrival-witnesses).

Use cases:

- Glob split (splitoff is freshly cloned).
- First-placement bootstrap paths after `StuffApi.clone`.
- Hot-reload reattach (post-clone, pre-relink).

---

## `GlobbableApi.applyQuantity`

The workhorse every quantity-bearing controller routes through.

```ts
applyQuantity<R>(
  candidates: Stuff[],
  quantity: MqlQuantity,
  action: (operand: Stuff, applied: number) => Promise<
    | { ok: true; payload: R }
    | { ok: false; reason: string }
  >,
  opts?: { query?: string }
): Promise<{
  ok: boolean;
  applied: number;
  status?: 'partial' | 'declined';
  notes: GlobNote[];
  payloads: R[];
}>
```

Behavior:

- **Empty candidate list** → immediate `{ ok: false, status:
  'declined' }` with an `empty-result` note. No actions run.
- **Strict pre-check** (`mode: 'strict'`, `kind: 'count'`):
  `sum(units across candidates) < n` → immediate decline with
  `quantity-clamped-rejected`. No actions run. Non-globbable
  candidates contribute 1 unit each; globbable candidates contribute
  up to their full quantity.
- **All-kind**: action runs on every candidate at full contribution.
- **Count-kind**: walk in scored order; for each candidate
  `contribution = min(units(c), remaining)`. Split when globbable
  and `contribution < c.getQuantity()`, else operand = c.
- **Action `ok: false`**: emit a `target-declined` note (target =
  the candidate, *not* the post-split operand). If a split occurred,
  reglob (merge operand back into c). Continue the walk; remaining
  is unchanged.
- **Lenient overflow** (`mode: 'lenient'`, count kind, remaining > 0
  after walk): emit `quantity-clamped`; status `'partial'`.
- **Status rule**: `'partial'` when any progress was made and
  something diverged (target-declined or lenient clamp);
  `'declined'` when `applied === 0`; absent on a clean run.

Throw propagation (G5): if `action` throws, the helper propagates.
Throws are programmatic violations; `{ ok: false }` is the
soft-failure signal.

### Note shape

```ts
type GlobNote =
  | { kind: 'quantity-clamped'; requested: number; applied: number }
  | { kind: 'quantity-clamped-rejected'; requested: number; available: number }
  | { kind: 'empty-result'; query: string; reason: 'no-matches' }
  | { kind: 'target-declined'; target: Stuff; reason: string };
```

v1 returns notes as a plain list. When the response-envelope
substrate lands, controllers swap from "fold into summary Mml" to
`ctx.note(n)`; `applyQuantity`'s shape stays.

### Mode is transport-only

`MqlQuantity.mode` carries the syntax-form signal (formal `:{N}` →
strict; natural-language `2 X` → lenient). **Controllers don't read
`mode`** — they pass the whole `MqlQuantity` through to
`applyQuantity` without branching. The helper consumes it (strict
pre-check vs lenient clamp). The one exception is a controller
deliberately overriding policy
(`applyQuantity(stuff, { ...quantity, mode: 'strict' }, action)`),
a loud explicit signal; v1 has no such verbs.

---

## `GlobbableApi.formatName`

```ts
formatName(stuff: Stuff, fallback?: string): string
```

Returns `count + " " + plural` when `stuff` is globbable with
`getQuantity() > 1`; falls through to `DescribeApi.getDisplayName`
otherwise. The naive plural is `name + 's'`; hosts declare a
`getPluralForm()` override for irregulars (`"mouse"` → `"mice"`).

```
1-stack coin   → "coin"
30-stack coin  → "30 coins"
3-stack mouse  → "3 mice"        (Mouse declares getPluralForm)
non-globbable rock → "rock"
```

`DescribeApi v2` (recognition slate) supersedes this — composing the
count into the identity layer with viewer-side perception and
recognition state. v1 ships this thin helper so controllers can
render usable identity now.

---

## MQL touchpoints

Two parallel input paths, one resolved value:

| Form | Audience | Mode | Semantics |
|---|---|---|---|
| `drop 2 roses` (natural language) | Humans | `lenient` | Desugar side-channel hint. Clamp on shortfall. |
| `drop roses:{2}` (formal) | Composers, scripts | `strict` | Parser `QuantityNode`. Pre-check; decline on shortfall. |
| `drop all roses` | Humans | `lenient` | Same as `2 roses` but `kind: 'all'`. |
| `drop roses:{*}` | Composers | `strict` | Same as `:{N}` but `kind: 'all'`. |

Both land on the same `MqlQuantity` slot:

```ts
type MqlQuantity = {
  value: { kind: 'count'; n: number } | { kind: 'all' };
  mode: 'strict' | 'lenient';
};

interface MqlOne {
  stuff: Stuff | null;
  via?: MqlMatchVia;
  quantity?: MqlQuantity;       // ← here
}
```

See [mql-grammar.md](../mql-grammar.md) and [mql.md](./mql.md) for the
grammar / pipeline mechanics.

### Singular field + quantity hint (v1 note)

Controllers that opt in to quantity should declare `type: objects`
on the YAML field. A singular `type: object` field with a quantity
hint will see `MqlOneResult.quantity` set, but the dispatcher
doesn't synthesize a list of one — the controller would have to wrap
it. v1 verbs that take quantity (`drop`, `get`) declare `type:
objects`.

---

## Author guide

To compose Globbable on a host:

```ts
class Coin extends GlobbableMixin(ContainableMixin(NamedMixin(Idea))) {
  static _mixinName = 'Coin';
  static persistentFields = ['quantity', 'name', 'denomination', 'tarnished'];
  static globIdentityFields = ['denomination', 'tarnished'];

  public denomination: 'gold' | 'silver' | 'copper' = 'copper';
  public tarnished: boolean = false;
}
```

Then in the template:

```yaml
# /obj/item/Coin/seed.yaml
path:  /obj/item/Coin
class: /lib/glob/Coin
data:
  keywords: [coin, gold]
  quantity: 1      # default; clone-time override is common
```

Clone-time `data.quantity: 50` produces a 50-stack.

### Verb-side wiring

Controllers that want to participate in quantity-bearing input
follow the two-phase shape:

```ts
async execute(model, context) {
  const { stuff, quantity, raw } = model.targets;
  if (!quantity) {
    return this.executeWholeSet(stuff, raw, context);
  }
  const result = await GlobbableApi.applyQuantity(
    candidates,
    quantity,
    async (operand, applied) => {
      ContainmentApi.move(operand, context.location);
      return { ok: true, payload: { operand, applied } };
    },
    { query: raw }
  );
  return this.renderResult(result, raw, context);
}
```

`DropController` and `GetController` are the canonical examples;
mirror their structure.

In v1, the action callback always returns `ok: true` for `drop` /
`get` because `ContainmentApi.move` throws on programmatic-contract
failure (no soft failure to signal). Capacity-driven `ok: false`
arrives with the collision slate.

---

## Antipatterns

- **Glob inside a glob.** Globs aren't `Container`; the composition
  validator catches it at registration. If you want a containment-
  bearing glob, you want a different abstraction (probably bulk —
  see [bulkable-slate](../slates/bulkable-slate.md)).
- **Instance-unique state on a stack.** Shadows and adornments
  disqualify a stack from merging. If you find yourself wanting
  per-instance details on a glob (a unique scratch on one coin),
  the host class should not be Globbable — or the unique instance
  should be its own non-globbable Stuff.
- **Stuff-count capacity on glob-bearing containers.** A bag rated
  for "5 items" that holds a 30-coin pile shouldn't refuse to let
  you split the pile. Glob-bearing containers should declare
  capacity in units, mass, or volume — see the capacity model in
  the future collision slate.
- **Reaching past `placeDirect` for fresh placement.** Don't write
  `item.setContainer(env)` / `env.addContainable(item)` directly,
  even for fresh-Stuff cases. `placeDirect` packages the right
  invariants; the chokepoint is gated `FromContainmentApi`.
- **Branching on `MqlQuantity.mode` in a controller.** Mode is
  transport-only; pass it through to `applyQuantity`. The strict
  vs lenient policy difference is in the helper, not the verb.

---

## Cross-references

- [../slates/globbable-slate.md](../slates/globbable-slate.md) — the
  original design slate.
- [mql.md](./mql.md) — pipeline (`QuantityNode`, desugar signature,
  resolver passthrough).
- [../mql-grammar.md](../mql-grammar.md) — user-facing grammar:
  natural-language quantity prefix, formal `:{N}` / `:{*}`.
- [collections.md](./collections.md) — collection-shape canon for
  related mixins (Set / Map / list).
- [../slates/bulkable-slate.md](../slates/bulkable-slate.md) — the
  bulk-form sibling (Quantity-valued globs); shares this
  subsystem's substrate.
