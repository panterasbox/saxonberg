# Globbable slate (working doc)

> **Implemented.** Operational reference: see
> [docs/subsystems/glob.md](../subsystems/glob.md). This slate is
> kept for the design rationale and the bulk-form extension story
> (the carry-forward record for the next slate); the runtime is
> shipped.

Working slate for fungible item stacks — the `5 coins` / `drop 2 roses`
shape MQL has anticipated since the cardinality contract landed. v1
ships the stack form (discrete, integer-counted, N-of-1 storage); the
bulk form (`pour 2 cups water`, `Quantity<U>`-valued) is structurally
compatible but deferred. This slate spells out the v1 mechanics so
bulk plugs in later without churning the contract.

The pieces here are small in surface but cross several subsystems
(mixin, MQL, containment, dispatch, display). The slate is for
reviewing the integration as a unit.

See also:

- [docs/mql-grammar.md](../mql-grammar.md) — current MQL grammar; the
  limitation at the bottom (`drop 2 roses`) is exactly the entry
  this slate closes.
- [docs/subsystems/mql.md](../subsystems/mql.md) — MQL internals; the
  desugar / resolver / `MqlResult` shape we extend.
- [docs/slates/response-envelope-slate.md](./response-envelope-slate.md)
  — the structured side-channel for "quantity ignored" / "quantity
  clamped" notes consumed here.
- [docs/subsystems/quantities.md](../subsystems/quantities.md) —
  `Quantity<U>` substrate; the future bulk pass uses this, v1 stack
  does not.
- [docs/subsystems/collections.md](../subsystems/collections.md) —
  containment-collection surfaces the merge ripple threads through.
- [docs/slates/mixin-slate.md](./mixin-slate.md) — `Stackable` /
  `Globbable` originally lived here as one of the affordance
  mixins.

---

## Principle

A **glob** is a Stuff that represents a quantity of indistinguishable
units. The host carries an integer `quantity`; the framework treats
the Stuff as if it were `quantity` separate instances at the
contract surface (`drop 5 coins`, "30 coins are here"), but stores
one row.

Three guarantees the design preserves:

1. **One Stuff, N units.** Globs are N-of-1: a stack of 30 coins is
   one Stuff with `quantity: 30`, not 30 sibling Stuffs. Split on
   transfer when the player takes fewer than the whole; merge on
   arrival when a mergeable sibling already lives in the destination.
2. **Quantity is part of identity.** Globs render with their count
   (`30 coins`, `1 arrow`); ordinal-style MQL (`coin:[2]`) does NOT
   index into a glob's units (a stack is a Stuff, not a list).
3. **Non-globs are unaffected.** A non-Globbable rose still resolves
   exactly as it does today; the count, when present, just treats
   each non-globbable match as one unit. `drop 2 roses` against
   three non-globbable roses drops the first two; against zero
   roses, declines as an empty result. Authors opt into glob
   *storage* (one Stuff with `quantity: N`) by composing the mixin;
   they don't opt into "responds to count syntax" — every plural
   target does.

The future bulk form (`Bulkable` or similar) is the same shape with
`Quantity<U>` in place of `number`. The contract is designed so the
desugar pass, the `MqlResult.quantity` slot, and the merge ripple
extend without breaking stack callers.

---

## The mixin: `Globbable`

New substrate additions:

- **`Globbable` mixin** — `packages/server/src/mud/lib/glob/Globbable.ts`.
  A new subsystem folder; "glob" is the natural concern name and
  isn't served by an existing folder.
- **`GlobbableApi`** — `packages/server/src/mud/api/glob.ts`.
  Hosts `split`, `merge`, `applyQuantity`, `canMerge`. Decorated
  with `SecurityApi.decorateApiClass(GlobbableApi)` per the standard.
- **`Mixins.Globbable` constant** — added to `lib/mixin.ts`'s
  `Mixins` registry as the single source of truth for the mixin
  name. Used by `MixinApi.hasMixin(ctor, Mixins.Globbable)`.
- **`MixinApi.isGlobbable(obj)` predicate** — added alongside the
  existing `isContainer` / etc. predicates for control-flow
  narrowing. Used pervasively by the helper, the renderer, and
  controllers that special-case glob inputs.

The mixin's public surface:

```ts
// Persistent field (in addition to persistentFields-declared host fields)
quantity: number;        // positive integer; minimum 1

// Public method surface (inter-stuff contract — methods, not fields,
// because shadows can only intercept methods)
getQuantity(): number;
setQuantity(n: number): void;          // validates n >= 1, integer
canMergeWith(other: Stuff): boolean;   // veto seam; defaults to field-set comparison
canSplit(n: number): boolean;          // veto seam; defaults to "no shadows/adornments"
onSplit(splitoff: Stuff): void;        // witness on source after split (no-op terminal)
onMerged(absorbed: Stuff): void;       // witness on surviving stack after merge (no-op terminal)
```

All five methods are method-shaped (not field/accessor pairs) so the
shadow framework can intercept them — shadow dispatch is methods-only.
`onSplit` and `onMerged` ship as no-op terminals on the mixin so
subclasses can `super.onSplit()` without ceremony, same pattern as
`Stuff.onDestruct()`.

Internal helpers (not on the inter-stuff surface) live on the host
class — `_split` / `_merge` are called by `ContainmentApi`, not by
other Stuff directly.

### Shadow seam — what each method does

- **`canSplit(n)`** is the veto. Default returns false if `n < 1`,
  `n > getQuantity()`, source has any active shadows, or source has
  any attached adornments. Returns true otherwise. A future shadow
  that knows it splits cleanly (e.g., a "blessed pile" shadow)
  overrides this method on its shadow layer to return true under
  its own conditions.
- **`canMergeWith(other)`** is the existing veto, now backed by the
  field-set comparison described below. Subclasses or shadows can
  override to add custom rules. Shadows that should block merging
  override to return false unconditionally.
- **`onSplit(splitoff)`** fires on `source` after `GlobbableApi.split`
  produces the new Stuff. The default does nothing. Future shadows
  override to propagate themselves onto the split-off, apply side
  effects, or tag the new stack.
- **`onMerged(absorbed)`** fires on the surviving stack after
  `GlobbableApi.merge` absorbs another. Default does nothing.

The shadow framework dispatches these through the same proxy chain
as every other method call — see
[docs/subsystems/call-security.md](../subsystems/call-security.md).
Shadows that want to participate just override the method on their
own layer.

In v1, no shadows ship that override these. The methods exist so
that when a shadow does want to participate in glob mechanics, the
seam is already in place.

### Invariants

- `quantity` is a positive integer at rest. `setQuantity(0)` is
  illegal; "the last one was taken" destroys the Stuff via
  `StuffApi.destruct`. (No zombie zero-quantity globs.)
- A glob never carries instance-unique state that breaks
  fungibility. Shadows and attached adornments disqualify a stack
  from merging (conservative default). Per-instance details on
  globs are unusual and currently treated as disqualifying.
- Field-level glob identity is **declared on the host class** via
  `static globIdentityFields` — see below. Two stacks merge only
  if every glob-identity field has equal values.
- Merge is symmetric: `a.canMergeWith(b)` ⇔ `b.canMergeWith(a)`.
  Falls out of comparing the field set rather than per-direction
  predicate logic.

### Glob identity via `globIdentityFields`

A glob is "the same kind" as another stack iff:

1. Same template path (`stuff.getTemplatePath()`).
2. Both have no shadows, no adornments. (Conservative; revisited
   when shadows ship.)
3. Equal values for every field listed in
   `Class.globIdentityFields`.

`globIdentityFields` piggybacks on the existing persistence
declaration. The class already declares `static persistentFields`
naming which fields round-trip through hydration; `globIdentityFields`
is a *subset* of that — the fields that define glob identity.

```ts
class Coin extends GlobbableThing {
  static _mixinName = 'Coin';
  static persistentFields = [
    'tarnished',            // glob identity
    'denomination',         // glob identity
    'lastTouchedAt',        // persistent but not identity-bearing
  ];
  static globIdentityFields = ['tarnished', 'denomination'];

  tarnished: boolean = false;
  denomination: 'gold' | 'silver' | 'copper' = 'copper';
  lastTouchedAt: number = 0;
}
```

The framework verifies `globIdentityFields ⊂ persistentFields` at
class-registration time — runtime-only fields can't define glob
identity (they wouldn't survive save/load anyway, so two "matching"
stacks would diverge after a reload).

**Defaults:**

- `globIdentityFields = []` is legal and means *every* instance of
  this glob is mergeable with every other. Behaves like the strict-
  fungibility philosophy (template + quantity only).
- Subclasses inherit and extend the parent's list. `Coin`'s subclass
  `MintedCoin` declares `static globIdentityFields = [...Coin.globIdentityFields, 'mintMark']`.

**`GlobbableApi.canMerge(a, b)`** iterates the union of both classes'
`globIdentityFields` and compares values. Reads them through the
public getter for each field (per the inter-stuff contract — methods,
not direct field access).

**`GlobbableApi.split(source, n)`** iterates `source.constructor.globIdentityFields`
and copies each value to the new Stuff before setting `quantity = n`.
The split-off is guaranteed merge-compatible with source (it carries
the same glob-identity state).

Persistent fields *not* listed in `globIdentityFields` are left at
template-default on the split-off. A coin's `lastTouchedAt` resets
on split; if you needed it preserved, you'd add it to
`globIdentityFields` (and accept that touching one stack now
segregates it from siblings).

### Constructor / template authoring

Authors set the initial quantity in the template `data:`:

```yaml
# /obj/item/Coin/seed.yaml
path:  /obj/item/Coin
class: /lib/glob/Coin            # extends Thing, composes GlobbableMixin
data:
  keywords: [coin, gold]
  quantity: 1                    # default; clone-time override common
```

Cloning a template with `data.quantity: 50` produces a 50-stack.
Authors can omit `quantity:` from data — the mixin defaults to 1.

---

## Containment ripple — split, merge, destruct-on-zero

Three concerns shape how globs interact with containment. The first
extends `ContainmentApi.move`; the second introduces a new
`ContainmentApi.placeDirect` primitive plus the `GlobbableApi.split`
/ `merge` pair; the third leans on existing `StuffApi.destruct`
lifecycle.

### Merge-on-arrival

When a Globbable arrives in a container that already holds a
mergeable sibling, fold the arriving quantity into the sibling and
destruct the arriving Stuff. The destination's resident absorbs.

```
container before:  [10-coin-stack-A]
move:               5-coin-stack-B → container
container after:   [15-coin-stack-A]      (B is destructed)
```

The contract: callers of `ContainmentApi.move` receive a void;
internally the call records the surviving Stuff so subsequent moves
(by the same chain) can refer to it. (TBD: do we need a return-value
form? Most controllers don't care which one survives.)

### Split

When a controller wants to move N out of a stack of M (N < M), it
calls the split form first, then moves the result:

```ts
const taken = await GlobbableApi.split(stack, n);  // new Stuff, qty=n,
                                                   // already in stack's env
ContainmentApi.move(taken, destination);           // may merge there
// `stack`'s quantity is now M - n
```

`split` lives on `GlobbableApi` since it spans two Stuffs (the
original and the new one).

**Split is within-container subdivision, not movement.** The matter
was already in the room before the split; subdividing it doesn't
constitute "arrival." The split-off lands in `source.getEnvironment()`
via *direct placement* — bypassing `ContainmentApi.move` and all
arrival/leave witnesses. The contents collection is updated
explicitly; no events fire.

```
5 apples on a table → split 2 off → 2 apples + 3 apples on the
                                     table. No witnesses see "an
                                     apple entered the room"; the
                                     apples were already there.
```

`GlobbableApi.split(source, n)` semantics in detail:

- Validates `n` is a positive integer ≤ `source.getQuantity()`.
- Calls `source.canSplit(n)` (shadow seam); throws on veto.
- Creates a new Stuff via the template-clone path (`StuffApi.clone`).
- Copies the value of every field in
  `source.constructor.globIdentityFields` from source to the new
  Stuff (via getter/setter; goes through the normal accessor path).
- Sets new Stuff's `quantity = n`; decrements source by `n`.
- **Places the new Stuff directly in `source.getEnvironment()`** via
  `ContainmentApi.placeDirect(splitoff, source.getEnvironment())` —
  a primitive sibling to `move` that places without firing
  arrival/leave witnesses, running validators, or triggering the
  merge-on-arrival ripple. (See below for the rationale and
  expected uses of `placeDirect`.)
- Fires `source.onSplit(splitoff)` (witness on the source — the
  one place subscribers can observe that a split happened).
- Returns the new Stuff.

#### `ContainmentApi.placeDirect` — the no-ripple sibling to `move`

This slate introduces a new ContainmentApi primitive:

```ts
class ContainmentApi {
  /**
   * Place `stuff` in `env` without firing movement witnesses,
   * running capacity validators, or triggering merge-on-arrival.
   * The matter is treated as if it were already in env; this
   * call just records the topological fact.
   *
   * Precondition: stuff.getEnvironment() === null. This is NOT a
   * relocation primitive — existing Stuffs go through `move`.
   * Throws if stuff already has an environment.
   *
   * Use when the placement is semantically NOT an arrival:
   *   - Glob split (splitoff is freshly cloned, has no env)
   *   - First placement after StuffApi.clone in some bootstrap paths
   *   - Hot-reload re-attachment (post-clone, pre-relink)
   *
   * Use ContainmentApi.move when the placement IS a movement
   * event (Stuff genuinely entered env from elsewhere).
   */
  @CallSecurity(SecurityPolicies.ApiOnly)
  static placeDirect(stuff: Stuff & Containable, env: Stuff & Container): void;
}
```

The method-level surface — `stuff.setEnvironment` + `env.addContainable`
— is what `placeDirect` calls internally. Callers don't reach for
those methods directly (the documented antipattern); they reach for
the `placeDirect` primitive that encapsulates the sequence.

The contrast with `move`:

| | `ContainmentApi.move` | `ContainmentApi.placeDirect` |
|---|---|---|
| Departure events | Fires `onLeave` on old env | No leave events |
| Arrival events | Fires `onEnter` on new env | No arrival events |
| Capacity validators | Runs | Bypassed |
| Mixin compatibility | Validated | Validated (always) |
| Merge-on-arrival ripple (globs) | Triggers | Bypassed |
| Accepts existing-env Stuff | Yes (it's a relocation) | **No** (fresh-placement only) |
| Security policy | (existing) | ApiOnly |
| Semantic meaning | Movement | Topological placement |

#### Security and preserved invariants

`placeDirect` is more powerful than `move` (it skips checks), so it
carries tighter security and a load-bearing precondition.

**What `placeDirect` preserves (always):**

- **Containment graph integrity** — sets `stuff`'s environment and
  adds to `env`'s contents in one atomic sequence. The invariant
  "every Containable has at most one env; every Container's contents
  matches" is upheld.
- **Mixin compatibility** — `stuff` must be `Containable`; `env`
  must be `Container`. Structural type check; throws on violation.
  This is too important to bypass — putting a non-Containable
  somewhere or accepting contents into a non-Container would corrupt
  the graph regardless of who's observing.
- **Fresh-placement precondition** — `stuff.getEnvironment() === null`
  is required. `placeDirect` is *not* a relocation primitive. This
  single check rules out an entire class of abuse: you cannot use
  `placeDirect` to teleport an actor past a guard, smuggle an item
  out of an inventory, or relocate a Stuff while avoiding witnesses.
  Existing Stuffs go through `move`, period.
- **`@CallSecurity(SecurityPolicies.ApiOnly)`** — only framework Apis
  can call `placeDirect`. Player-tier and author-tier code can't
  reach it directly; this matches the policy on other low-level
  primitives.

**What `placeDirect` deliberately bypasses:**

- Capacity validators (matter-was-already-there assumption).
- Arrival/leave witnesses (placement is not movement).
- Glob merge-on-arrival ripple (not an arrival).

**Why this is safe in practice:**

The fresh-placement precondition is load-bearing. With it:

- Glob split: splitoff is just-cloned, has no env. ✓
- Bootstrap clone placement: same shape. ✓
- Hot-reload reattach: same shape (post-clone, pre-relink). ✓
- Smuggling an existing item: existing item has an env. **✗ throws.**
- Teleporting a player: player has an env. **✗ throws.**
- Player-tier exploit: blocked by `@CallSecurity`. **✗.**

The only call sites that pass the precondition are first-placement
cases, which are exactly the cases where no-witnesses semantics is
correct.

### Reglob — undoing a split

Reglob calls the merge primitive. Symmetric with split — it's
*un-subdivision*, not departure. Splitoff isn't "leaving" anywhere;
it's being folded back into source.

```ts
class GlobbableApi {
  /**
   * Fold `absorbed` into `survivor`. Both must compose Globbable
   * and pass canMergeWith. Increments survivor's quantity by
   * absorbed's; destructs absorbed. Fires survivor.onMerged.
   *
   * Used by:
   *   - Merge-on-arrival ripple (the moved glob is absorbed)
   *   - applyQuantity reglob (on action failure, the split-off is
   *     absorbed back into the source)
   */
  @CallSecurity(SecurityPolicies.ApiOnly)
  static merge(survivor: Stuff & Globbable, absorbed: Stuff & Globbable): void;
}
```

Behavior:

- Validates `survivor.canMergeWith(absorbed)` (and the symmetric check).
- Increments `survivor.quantity` by `absorbed.quantity`.
- Destructs absorbed via `StuffApi.destruct`. The destruct lifecycle
  handles containment cleanup; absorbed's `onDestruct` fires (that's
  where "this Stuff is going away" subscribers belong). The merge
  call itself doesn't emit any movement events — there's no `move`
  involved.
- Fires `survivor.onMerged(absorbed)` (witness on the surviving stack).

(If `destruct`'s containment cleanup fires `onLeave`-style events as
part of its lifecycle, that's a `destruct` semantics question rather
than a glob one. From the glob's perspective the only deliberate
events are `onSplit` and `onMerged`; everything else is normal Stuff
lifecycle.)

This is the same primitive that the merge-on-arrival ripple uses
internally (for the case where a *moved* glob arrives in a
container with a mergeable sibling — that's real movement and DOES
fire arrival/leave events, then folds into the sibling via this
same merge call).

The split-off's environment doesn't matter for reglob — merge
handles removal regardless. Same-env (the typical case), different-
env, no-env: all work.

### Capacity is bypassed on split

Split assumes glob-bearing containers use mass-or-unit-count
capacity, not Stuff-count capacity. The matter was already in the
container before the split; subdividing it doesn't add mass or
units. Stuff-count *does* technically change (one Stuff becomes
two), but that capacity dimension isn't appropriate for glob
containers — a bag rated for "5 items" that holds a 30-coin pile
shouldn't refuse to let you split the pile.

**The author contract**: containers that hold globs should declare
capacity in units, mass, or volume — not Stuff-count. The collision
slate ([collision-slate.md](./collision-slate.md)) is the formal
home for capacity; this is one driver for its default model.

If a glob-bearing container *does* have a Stuff-count cap (an
unusual choice), splits silently bypass it. Documented; not
considered a bug.

### Destruct-on-zero

If split is called with `n === stack.quantity`, the result is the
original Stuff itself (no split, no new instance). If the caller
wants to "move all of them," it's a plain `ContainmentApi.move` —
the merge-on-arrival path handles the destination side.

### Edge cases

- **Split with `n > quantity`** — programmatic contract violation,
  throws. (User-input "drop 99 coins" of a 10-stack is validator
  territory, not a runtime error.)
- **Merge across persistence** — when a glob is loaded from storage,
  it's not yet in any container. Merge runs on the first containment
  transition into a holder that has a sibling. (Initial placement at
  bootstrap may need a sweep pass; deferred.)
- **Glob inside a glob** — can't happen. Globs aren't `Container`. If
  someone tries to compose both, the mixin composition validator
  catches it.

---

## MQL — two paths to quantity

Two parallel input forms, two audiences:

| Form | Audience | Semantics |
|---|---|---|
| `drop 2 roses` (natural language) | Humans typing | Lenient: target need not be globbable; fallback degrades gracefully and emits a structured note. |
| `drop roses:{2}` (formal) | Composers, scripts, rich clients | Strict: asserts "exactly 2 units." Pre-checks total available across matches (each non-globbable counts as 1, each globbable counts as its quantity); declines if short. |

The natural-language form goes through desugar. The formal form
contains `{` / `}` and is short-circuited by `looksFormal`, taking
the same path that `rose:[2]` or `coin:[mixin.X]` takes today.

The MQL surface gets three additions: a desugar rule, a formal
bracket-form, and a slot on `MqlResult`. All are additive; bulk
extends them later without breaking.

### Desugar rule: leading quantity prefix

A third rewrite in `desugar.ts`, alongside article-stripping and
ordinal-prefix. The regex captures a leading positive integer (or
the literal `all`) followed by at least one keyword token:

```
^(?:(\d+)|(all))\s+(\S.*)$
```

When matched, the pass:

1. Records the quantity hint (number or the sentinel `'all'`) on
   the lexer's emitted output for the resolver to pick up.
2. Strips the prefix and re-runs the rest through the rest of
   desugar (article strip, ordinal).

Implementation note: desugar is a pure-string pass today. The
quantity hint has to ride somewhere — either as a side-channel
returned alongside the rewritten string, or encoded in the string
itself for the lexer to extract. The latter keeps `desugar()`'s
return type a `string`; a `{quantity: '#5' marker}` prefix the
lexer recognizes is one possible shape. Decision deferred to
implementation — both work.

### Formal syntax: `:{N}` / `:{*}`

A new chain-operator form using curly braces:

```
coin:{5}              5 of the coin (strict — composer-grade)
coin:{*}              all of the coin (strict)
coin:[5]              ordinal — the 5th coin (existing, unchanged)
coin                  every coin match (existing, unchanged)
```

Why curly:

- `{` / `}` are currently unclaimed in MQL.
- Visually distinct from ordinal `[N]` → semantically different
  operation. Composers don't have to remember which-bracket-does-
  what; the shape signals the intent.
- Curly suggests cardinality / "this many" (set notation).
- ASCII; composer-friendly across languages and keyboards.

Why `{*}` instead of `{all}`:

- `*` already means "any/everything" in MQL (path globs) — internal
  consistency.
- One char vs three; no reserved-word collision with a future English
  keyword `all`.

Strict semantics on the formal form:

- **The assertion is "N units total."** Non-globbable matches
  contribute 1 unit each; globbable matches contribute up to their
  full quantity. `swords:{3}` is a legal assertion against three
  separate non-globbable swords *or* a 3-stack of globbable swords.
- **`{N}` against insufficient supply → declined.** The dispatcher
  pre-checks `sum(units across candidates) >= N` before any action
  runs. Shortfall → `status: declined` + `quantity-clamped-rejected`
  note. No partial fulfillment under strict. (Friendly clamp is
  reserved for the natural-language form.)
- The natural-language form's hint and the formal form's `:{N}` land
  the same `MqlQuantity` value at the resolver — controllers don't
  branch on which input shape produced it. The strict/lenient
  difference is consumed by the helper (`GlobbableApi.applyQuantity`),
  which switches between pre-check-then-decline (strict) and
  clamp-and-note (lenient).

Body grammar is `{N}` and `{*}` only in v1. Real estate is
intentionally reserved — `{1..3}` (range), `{half}` / fractional
quantities, and similar future shapes have a place to land without
re-litigating the bracket choice.

Implementation note: `looksFormal` gains `{` to its signal set.
Existing keys: `:`, `[`, `,`, `'`. Adding `{` makes the formal
quantity path bypass desugar, same as today's other formal forms.

### Conflict resolution

**Natural-language form:** the count is distributed across matches
in scored order (each non-globbable contributes 1, each globbable
contributes up to its full quantity). Lenient: clamp if the total
falls short and emit `quantity-clamped`. Edge cases:

- **Empty result + count** — MQL produced zero matches.
  `drop 2 turnips` with no turnips in inventory → status `declined`
  + `empty-result` note. Same as `drop turnips` with no turnips
  (existing behavior); the quantity hint doesn't change the
  outcome.
- **Singular field + count > 1** — `examine 2 rose` (a singular
  `type: object` field, one rose match). The dispatcher wraps the
  match into a list of one before calling the helper; the helper
  walks the list, takes 1 unit, remaining = 1, emits
  `quantity-clamped { requested: 2, applied: 1 }`. Status `partial`.
  No special-case path needed — the distribution algorithm handles
  singular fields by uniform treatment.

The existing ordinal rule is unaffected — `first rose` → `rose:[1]`,
`2nd rose` → `rose:[2]`. A bare `2 rose` is not a recognized ordinal
(no word suffix); the quantity rule claims it cleanly.

**Formal form:** strict. The pre-check decides upfront:

- **Pre-check passes** → distribution runs as normal. No notes; status `ok`.
- **Pre-check fails** (`sum(units) < N`) → status `declined` +
  `quantity-clamped-rejected`. No actions execute.
- **Empty result + `:{N}`** → pre-check sees zero available; declines
  with `quantity-clamped-rejected` (requested N, available 0).
- **Singular field + non-globbable target + `:{N}`** — pre-check
  sees 1 unit available; if N=1 the action proceeds, if N>1 the
  pre-check rejects.

Authors who want strict ordinal pick `rose:[N]` (existing);
composers who want strict quantity pick `rose:{N}` (new). Both
bypass desugar.

### `MqlResult.quantity` slot

Both `MqlOneResult` and `MqlManyResult` gain an optional `quantity`
slot:

```ts
export type MqlQuantity = {
  value: { kind: 'count'; n: number } | { kind: 'all' };
  // Future: | { kind: 'measure'; q: Quantity<U> }
  mode: 'strict' | 'lenient';      // formal `:{N}` vs natural-language
};

export interface MqlOneResult extends MqlOne {
  raw: string;
  prep?: string;
  quantity?: MqlQuantity;          // new
}
```

Two discriminators ride on the slot:

- **`value.kind`** — what the quantity *is* (count today, measure
  later). Controllers branch on this to decide arithmetic.
- **`mode`** — how strictly the dispatcher enforces the requested
  count. `strict` (formal `:{N}`) → decline if total available
  units < N; `lenient` (natural-language `2 X`) → clamp and emit
  a note. Controllers themselves don't branch on mode; the helper
  Api consumes it.

### Resolver behavior

The resolver carries the quantity hint through to the result
verbatim. It does NOT itself apply the quantity (e.g., it doesn't
slice the match list to N items). The dispatch+controller path is
where quantity becomes action.

**No auto-restrict to globbables.** Earlier reads of this design
considered filtering plural-cardinality results to Globbable members
when a count was present. That's wrong: non-globbable matches are
units of 1, and the distribution algorithm (see Controller
integration) handles them naturally. Auto-restrict would silently
ignore non-globbable matches the player likely meant ("why didn't
my mundane stone count for `drop 2 stones`?") and doesn't simplify
the genuinely complex cases (multiple globbables in the result).
The resolver returns everything; the helper distributes.

---

## Dispatcher / controller integration

### Field shape

YAML fields don't gain a new annotation. The `MqlResult.quantity`
slot threads through the existing `MqlManyResult` / `MqlOneResult`
shape; controllers read it from `model.target.quantity`.

```yaml
# drop.yaml
target:
  type: objects
  scope: inventory
```

### The common pattern (five phases)

Every quantity-bearing verb (`drop`, `get`, `give`, `put`, …) walks
the same shape:

1. **Triage**. No quantity → existing whole-set path (helper not
   needed). Quantity present → defer to the helper.
2. **Pre-check** (strict only). Sum total available units across
   candidates; if `total < requested`, decline immediately without
   acting.
3. **Walk candidates** in MQL-scored order. For each match, the
   contribution is `min(match.quantity if Globbable else 1, remaining)`.
4. **Per operand**: deglob (split if globbable + partial; reuse if
   globbable + whole or if non-globbable), invoke the action,
   reglob if the action returned `{ ok: false }`.
5. **Note emission**. If `remaining > 0` after the walk, emit
   `quantity-clamped` (lenient) — strict's pre-check ensures this
   case never occurs.

Phases 1, 2, 4 (mechanics), and 5 are pure boilerplate. The action
callback (phase 4 inner) is what makes the verb the verb. The
helper owns everything else.

### `GlobbableApi.applyQuantity` — the helper

```ts
class GlobbableApi {
  /**
   * Walk a candidate list distributing a quantity across matches in
   * scored order. Non-globbable matches contribute 1 unit each;
   * globbable matches contribute up to their full quantity. The
   * action callback runs per-operand with the contribution applied.
   * Returning { ok: false } from the action reverts that operand's
   * deglob (other operands are unaffected).
   *
   * Caller owns prose and the no-quantity fast path.
   */
  static async applyQuantity<R>(
    candidates: Stuff[],                        // resolver result, scored order
    quantity: MqlQuantity,
    action: (operand: Stuff, applied: number)
      => Promise<{ ok: boolean; payload?: R }>,
  ): Promise<{
    ok: boolean;
    applied: number;                            // total units actioned successfully
    status?: DispatchStatus;                    // 'partial' | 'declined' if diverged
    notes: Note[];
    payloads: R[];                              // one per successful action call
  }>;
}
```

Behavior the helper owns:

- **Empty candidate list** — if `candidates.length === 0`, return
  immediately with `{ ok: false, status: 'declined', notes: [empty-result
  { reason: 'no-matches' }] }`. No actions run. The controller
  decides the user-facing prose.
- **Pre-check under strict** — compute
  `total = sum(c.quantity if Globbable(c) else 1 for c in candidates)`.
  If `quantity.value.kind === 'count'` and `total < quantity.value.n`,
  return immediately with
  `{ ok: false, status: 'declined', notes: [quantity-clamped-rejected
  { requested, available: total }] }`. No actions run.
- **Resolve target N**: `value.kind === 'all'` → run action on every
  candidate at its full contribution; no clamp. `value.kind === 'count'`
  → walk until `remaining` reaches 0.
- **Per-candidate iteration** (in MQL-scored order):
  - `contribution = min(isGlobbable(c) ? c.quantity : 1, remaining)`.
  - If `isGlobbable(c)` and `contribution < c.quantity` →
    `operand = GlobbableApi.split(c, contribution)`. Else operand = c.
  - `result = await action(operand, contribution)`.
  - If `result.ok === false` AND we split → merge operand back into c.
    Continue to the next candidate (don't abort the walk).
  - On success: `applied += contribution`, `remaining -= contribution`.
- **Lenient clamp note** — if `remaining > 0` after the walk
  (only possible under lenient + count), emit
  `quantity-clamped { requested: quantity.value.n, applied }` and
  set status to `'partial'`.
- **Return** `ok: true` if any action call succeeded, with the
  accumulated `applied` count and `payloads` from each successful call.

### Worked example: `DropController`

```ts
async execute(model: DropModel, ctx: DispatchContext) {
  const { stuff, quantity } = model.target;       // stuff: Stuff[]
  const dest = ctx.giver.getEnvironment();

  // No quantity → existing whole-set path.
  if (!quantity) {
    for (const s of stuff) ContainmentApi.move(s, dest);
    return ctx.scene(prose.dropSet(ctx.giver, stuff));
  }

  // Quantity present → defer the distribution to the helper.
  const result = await GlobbableApi.applyQuantity(stuff, quantity,
    async (operand, n) => {
      ContainmentApi.move(operand, dest);
      return { ok: true, payload: { stuff: operand, n } };
    });

  result.notes.forEach(n => ctx.note(n));
  if (result.status) ctx.setStatus(result.status);
  if (!result.ok) return ctx.scene(prose.cantDrop(stuff));
  return ctx.scene(prose.droppedDistribution(ctx.giver, result.payloads));
}
```

The action callback doesn't know whether it's being called once or
many times; it just acts on one operand. The helper handles the
iteration, the split/reglob ripple per match, and the note
accumulation.

### Reglob rule

Three design decisions worth nailing:

1. **Reglob is keyed off the action's explicit return**, not world-
   state inspection. `ContainmentApi.move` may legitimately
   *destruct* the operand on a merge-into-destination, so "is operand
   still alive?" isn't a reliable signal. The action callback knows
   whether it succeeded; the helper trusts it.
2. **Reglob only when we actually split.** If contribution equals the
   candidate's full size (or the candidate is non-globbable, treated
   as 1 unit), operand *is* the candidate and there's nothing to
   un-split.
3. **Per-action, not transactional.** If the action fails for
   candidate B after succeeding for candidate A, A's success stays
   in place. The walk continues to the next candidate. This keeps
   the helper simple and matches the verb's natural semantics
   ("drop what I can, report what I couldn't"). Verbs that need
   all-or-nothing strict semantics use the formal `:{N}` form,
   which the pre-check converts into an early decline before any
   action runs.

**Where the split-off lives**: `GlobbableApi.split(c, n)` places the
new Stuff in `c.getEnvironment()` via direct placement — no arrival
witnesses fire. See [Containment ripple § Split](#split).
This sidesteps the "freshly split sibling immediately re-absorbs"
problem at the source (the split path never goes through arrival
logic at all).

Two consequences for the helper:

- The action callback receives an operand that already has a sane
  environment. It doesn't need to place the split-off before
  acting — though most verbs (`drop`, `get`, `give`) immediately
  call `ContainmentApi.move` to send it elsewhere. That move *is*
  real movement (the operand is genuinely leaving the source's
  environment) and fires the normal arrival/leave events.
- Reglob is `GlobbableApi.merge(source, operand)`. Merge is the
  un-subdivision symmetric to split: also silent on env events.
  Operand's `onDestruct` runs naturally as it's destructed;
  subscribers that care about "this Stuff went away" hook there.

### Why not a higher-level wrap?

A `QuantityApi.dispatch(model, { onAct, prose })` that swallows the
entire controller body is tempting but too rigid. Verbs that want
to do something *between* deglob and the act (a validator that runs
only on the operand quantity, a precondition that consults the
operand before acting) need the seam. The mid-level helper is the
honest level.

Complex verbs that need finer control skip `applyQuantity` and reach
for `GlobbableApi.split` / `merge` directly.

### Validators — ordering with `applyQuantity`

Validators slot into the existing validation chain — no new mechanism.
Ordering matters:

1. **Field-level validators** run first (on the resolved candidate
   list as a whole, before any glob math). Same shape as today.
2. **`applyQuantity` runs after validation passes.** The helper
   operates on a pre-validated candidate list.

A verb that wants strict "all-or-nothing" semantics can declare a
validator that rejects when `mode === 'strict'` and the supply is
short — but that's redundant with the helper's pre-check (which
declines on shortfall under strict). Validators are the right
place for verb-specific business rules ("you can't drop a cursed
item," "the destination must be a Vessel") that need to run
regardless of quantity.

The helper doesn't *re-validate* after splitting. The split-off is
a sibling of the source, with the same glob-identity state; if the
source passed validation, the split-off does too.

### Verb roster touched in v1

- `drop` — split + move out of inventory
- `get` — split + move into inventory (the source-side stack splits)
- `give` — split + move from inventory to recipient
- (Later, when posture/conveyance verbs use them: none — globs are
  items, not actors.)

Posture, locomotion, embodiment verbs are untouched in v1 —
quantity-aware combat / consumption verbs land with their owning
slates.

### Out of scope: peer-reaction hooks

Adjacent design concern, briefly noted to avoid losing the thread:
there's no general-purpose hook today for *peers* (other Stuff in
the same environment) to react when a sibling's state changes.

Globbable doesn't require one. The hooks it needs live on the glob
itself — when a stack's quantity changes (split, merge, drain), a
witness on the glob suffices. Subscribers that want to track a
specific pile (the table, the treasury NPC) register on that pile.

The related-but-separate concern is **verb-registry reconciliation
on peer arrival/departure** — a `Climbable` peer entering the room
should add `climb` to my registry; leaving should remove it. That
needs a per-environment membership hook on `Mobile.traverse` /
`ContainmentApi.move`, and it's load-bearing for the ambient path
in [verb-provisioning-slate.md](./verb-provisioning-slate.md). Not
blocking globbable; tracked as future substrate work.

---

## Display rendering — Globbable provides data, renderer consumes

This slate doesn't ship glob rendering. The actual composition lives
in `DescribeApi v2` (see
[recognition-slate.md](./recognition-slate.md)). What this slate
locks down is the **contract surface** Globbable exposes so the
renderer can consume it.

### Why rendering doesn't live on Globbable

Display has viewer-side concerns Globbable shouldn't know about:

- **Recognition state** — does the viewer recognize this kind of
  thing? ("a pile of coins" vs "30 gold coins" once identified)
- **Perception filters** — low light, distance, smoke ("a pile of
  something" instead of "30 coins")
- **Formality / language** — pedagogical mode showing units, terse
  vs verbose, future locale support

Putting `getDisplayString` on Globbable would couple a data mixin to
all those viewer concerns. The right factoring: rendering layer
(DescribeApi v2) owns the composition; mixins like Globbable
contribute data to the pipeline.

### The contract Globbable exposes

```ts
// Methods on the Globbable mixin
getQuantity(): number;             // already in the slate
```

Plus what the host class is expected to provide (not enforced by
Globbable, but expected by the renderer):

```ts
getDisplayName(): string;          // singular base noun: "coin", "arrow"
getPluralForm?(): string;          // optional override for irregulars
                                   // ("mouse" → "mice"); default falls
                                   // back to GrammarApi.pluralize(name, n)
```

The base singular name + optional plural-form override is enough for
the renderer to assemble any quantity form. Pluralization rules live
in `GrammarApi`, not on Globbable (English-level grammar belongs in
the grammar Api, not on every host that wants a plural).

### What the renderer does with it

When DescribeApi v2 composes the identity for a Globbable target,
the count enters the noun phrase rather than appearing as a
decoration:

```
n === 1 → "a coin"             (existing article-prefix logic)
n  > 1 → "30 coins"            (count + pluralForm)
```

This is identity-side rendering, not decoration. State tags
(wielded, on fire, sleeping) are decorations and compose on top
of the count-bearing identity:

```
"30 burning coins"             (decoration wraps identity)
not
"burning 30 coins"
```

DescribeApi v2's composition order — see the pipeline in
[recognition-slate.md](./recognition-slate.md#the-describeapi-v2-pipeline)
— handles this naturally: identity is resolved before decoration is
appended.

### What's out of scope here

- The composition pipeline itself (recognition slate).
- Bucket-keyed verbosity for globs ("count-only" vs "full name" rendering — recognition + social-graph slates).
- Perception-filtered partial renderings ("a pile of something" in low light — light + recognition slates).
- Markup tags for `<quantity>` semantic markup (MML semantic-tags punch list item).

All of these consume Globbable's contract; none of them shape it.

---

## Persistence

`quantity` is a public integer field. Hydrator reflects into it
by name. No custom marshaller — `number` is a default-serialized
type.

Saved as part of the Stuff's persistent state; no separate store.
Merges destruct the absorbed Stuff via `StuffApi.destruct`, which
already handles persistence cleanup.

---

## Extension to bulk — what's locked in vs deferred

V1 ships only the stack form (integer count). The bulk form
(`Quantity<U>`-valued — flour, water, sand, bread mass) is structurally
compatible; this slate's contract was designed so bulk plugs in via
the same substrate. Full design lives in
[bulkable-slate.md](./bulkable-slate.md). This section documents what
the current slate has *already locked in* for bulk's benefit and what
remains for the bulk slate to decide.

### Already aligned with bulk

These design choices generalize without rework:

- **`ContainmentApi.placeDirect`** — unit-agnostic. Bulk splits land
  in source's environment via the same primitive.
- **`MqlResult.quantity` discriminated union** — `value.kind: 'measure'`
  slot already reserved. The `mode: 'strict' | 'lenient'` discriminator
  applies identically.
- **`:{N}` formal syntax** — body grammar extends to `:{N unit}`.
  Real estate reserved.
- **Distribution algorithm shape** — walk in scored order, take
  `min(contribution, remaining)` per candidate. Substitutes Quantity
  arithmetic for integer arithmetic.
- **Response envelope notes** — `quantity-clamped`,
  `quantity-clamped-rejected`, `empty-result` all carry over with
  measure-typed payloads.
- **Display rendering contract** — same `getQuantity` shape;
  DescribeApi v2 picks the unit-formatting path.
- **Per-host identity declaration via persistence piggyback** —
  `globIdentityFields` parallels a `bulkIdentityFields` (or the
  abstraction might be unified — see bulk slate's open questions).

### Where bulk diverges

Four concrete differences the bulk slate handles:

1. **`quantity` type**: `Quantity<U>` (host-fixed unit, Tangible-style)
   rather than `number`. Persists via `QuantityMarshaller`.
2. **Arithmetic**: Quantity add/subtract with unit propagation.
3. **"Zero" threshold**: floating-point math leaves residues; bulks
   need a `static destructThreshold` declaration ("below 1g of flour,
   destruct").
4. **Divisibility default**: bulk is *not* trivially splittable. The
   `canSplit` veto defaults to false (or a per-host opt-in), and
   splittability may decompose into a separate mixin from measurement.
   See bulk slate's "Conditional divisibility" treatment.

### Conditional-divisibility insight (drives the bulk slate's structure)

Stacks bundle measurement and splittability because integer-counting
trivially admits any split. Bulk doesn't have that property: most
bulk needs a tool (knife), vessel (cup), or environment (a place to
pour into) to subdivide. The slate's `canSplit` seam already exists
for per-source veto, but bulk uses it heavily and may need richer
context.

The bulk slate considers two factorings:

- **Single mixin (parallel to Globbable):** `Bulkable` bundles
  measurement and splittability; `canSplit` defaults restrictive;
  authors opt into divisibility by override.
- **Two mixins:** `Bulkable` (has measure) + `Subdivisible` (can be
  split). Hosts compose both for the splittable-bulk case. Cleaner
  separation but more substrate.

The current `canSplit(n: number)` signature on Globbable is enough
for stacks (the n-bound suffices). Bulk might want richer context —
actor, environment, target vessel. **The deliberate non-decision**:
don't broaden Globbable's `canSplit` signature speculatively. When
bulk has real callers, the right shape will be obvious. Until then,
breaking-change later is cheaper than wrong-abstraction now.

---

## Open questions

- **Merge cost** — every `ContainmentApi.move` into a container with
  Globbable contents has to scan siblings for a merge. For
  containers with many globs (a treasury), this is O(siblings).
  Likely fine at v1 scale; if it becomes a problem, a per-container
  index keyed by `templatePath` (cheap to maintain) takes it to
  O(1).
- **MQL `coin:[5]`** — under v1, this indexes into the *result set*
  of coin-matches, not the 5th coin in a stack. (Stacks are single
  Stuffs.) If a player types `coin:[5]` against a single 30-stack,
  they get nothing. Acceptable — players don't have an ordinal
  intuition for "the 5th coin in a pile," and the syntax `5 coins`
  is the supported shape.
- **Initial-state merge sweep** — when bootstrap loads a world
  whose YAML places multiple mergeable globs in one container, do
  they merge on load? Probably yes (idempotent state is good), but
  the trigger point isn't `ContainmentApi.move`. Likely a
  `PostRegistration` sweep keyed by container.
- **Sibling visibility during the split-active transient.** Between
  `split` and the action's `move`, the source's environment
  contains two mergeable siblings. Event-driven subscribers don't
  observe this — split bypasses arrival witnesses. *Static*
  observers (anyone querying the env's contents collection directly
  during the window) will see both stacks. Probably fine — counts
  add up correctly. Subscribers that want to react specifically to
  splits hook `onSplit` on the source.
- **Notes naming** — the response-envelope slate flags `notes` vs
  `diagnostics` as a name bikeshed. Mentioned here so the choice
  lands consistently across both slates.

---

## v1 acceptance roster

### Natural-language path (humans)

Single-target stack:

```
> get 5 coins                # one pile of 30 on the table
You take 5 coins from the table.                  (outcome.status = ok)

> drop 2 coins
You drop 2 coins.                                  (outcome.status = ok)

> get all arrows
You take 12 arrows.                                (outcome.status = ok)

> give 10 coins to bob
You give 10 coins to bob.                          (outcome.status = ok)
```

Multi-match distribution (the algorithm's payoff):

```
> drop 3 fruit               # inventory: apples qty=2, oranges qty=2
You drop 2 apples and an orange.                  (outcome.status = ok,
                                                    payloads: [apples×2,
                                                    oranges×1])

> drop 7 fruit               # same inventory (4 total)
You drop 2 apples and 2 oranges.                  (outcome.status = partial,
                                                    notes: [quantity-clamped:
                                                    requested=7, applied=4])

> drop 3 stones              # mundane stone + magic pile qty=10
You drop a mundane stone and 2 magic stones.      (outcome.status = ok)
```

Clamps and lenient ignoring:

```
> drop 99 coins              # only 10 in inventory
You drop 10 coins.                                 (outcome.status = partial,
                                                    notes: [quantity-clamped:
                                                    requested=99, applied=10])

> drop 2 swords              # 5 swords, none globbable
You drop 2 swords.                                 (outcome.status = ok,
                                                    payloads: [sword1×1,
                                                    sword2×1])

> drop 99 swords             # 5 swords, none globbable
You drop 5 swords.                                 (outcome.status = partial,
                                                    notes: [quantity-clamped:
                                                    requested=99, applied=5])
```

### Formal path (composers)

```
> drop coins:{5}             # one pile of 10
You drop 5 coins.                                  (outcome.status = ok)

> drop coins:{*}             # one pile of 10
You drop 10 coins.                                 (outcome.status = ok)

> drop coins:{99}            # only 10 available total
(no action)                                        (outcome.status = declined,
                                                    notes: [quantity-clamped-
                                                    rejected: requested=99,
                                                    available=10])

> drop fruit:{3}             # apples qty=2, oranges qty=2 — 4 available
You drop 2 apples and an orange.                  (outcome.status = ok)

> drop swords:{3}            # 5 non-globbable swords — 5 units available
You drop 3 swords.                                 (outcome.status = ok)

> drop swords:{99}           # 5 non-globbable swords — pre-check rejects
(no action)                                        (outcome.status = declined,
                                                    notes: [quantity-clamped-
                                                    rejected: requested=99,
                                                    available=5])
```

The formal form treats non-globbables as 1-unit contributions —
`swords:{3}` is a legal assertion against three non-globbable
swords, just as it is against a 3-stack.

### Untouched (existing behavior)

```
> drop rose                  # bareword, no quantity
You drop a red rose.                              (singular field — one match)

> drop roses                 # plural, no quantity
You drop a red rose and a white rose.            (every match — existing
                                                   plural drop behavior)

> drop second rose           # ordinal path
You drop the white rose.

> drop rose:[2]              # formal ordinal
You drop the white rose.
```

---

## Cross-references

- [docs/mql-grammar.md § Limitations](../mql-grammar.md#limitations)
  — entry retired by this slate.
- [docs/subsystems/mql.md § Limitations](../subsystems/mql.md#limitations--non-goals)
  — entry retired by this slate.
- [docs/slates/response-envelope-slate.md](./response-envelope-slate.md)
  — required substrate; carries `quantity-clamped` (lenient overflow),
  `quantity-clamped-rejected` (strict pre-check decline), and
  `empty-result` (no matches) notes.
- [docs/slates/mixin-slate.md § Affordance / use](./mixin-slate.md#affordance--use)
  — the `Stackable` / `Globbable` line consolidates into this slate.
- [docs/slates/collision-slate.md](./collision-slate.md) — formal
  home for container capacity; glob-bearing containers should
  declare capacity in units/mass/volume, not Stuff-count.
- [docs/slates/recognition-slate.md § DescribeApi v2 pipeline](./recognition-slate.md#the-describeapi-v2-pipeline)
  — where glob count-rendering composes; Globbable contributes
  identity-side data.
- [docs/slates/bulkable-slate.md](./bulkable-slate.md) — bulk-form
  sibling; shares this slate's substrate (placeDirect, MqlQuantity
  union, distribution algorithm, response envelope notes).
- [docs/subsystems/quantities.md](../subsystems/quantities.md) —
  consumed by the future bulk-form extension; not v1.
