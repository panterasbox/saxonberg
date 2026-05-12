# Globbable — implementation plan

Companion to [globbable-slate.md](./globbable-slate.md). This plan is
the carry-forward artifact for the build session: a fresh context
should be able to pick this up alongside the slate and proceed.

## Resolved decisions (from the gap-scan pass)

| ID | Decision |
|---|---|
| G1 | Response-envelope is being designed in a parallel session. v1 globbable **does not** ship the envelope substrate. Notes flow as return values from `GlobbableApi.applyQuantity`; controllers inspect them and craft `summary` Mml inline. When the real envelope lands, threading notes through `CommandContext.note(...)` is purely additive — controller call sites change but `applyQuantity`'s shape stays. |
| G2 | Display rendering goes through a slate-local helper: `GlobbableApi.formatName(stack)` returns the count-prefixed display string (`"30 coins"`); falls through to `DescribeApi.getDisplayName` for non-globbable Stuff. DescribeApi v2 (recognition slate) supersedes this later. |
| G3 | (i) `desugar()` signature changes from `string → string` to `string → { rewritten: string; quantityHint?: MqlQuantityHint }`. Quantity hint piggybacks on the return, not the rewritten string. Formal `:{N}` / `:{*}` parses to a new `QuantityNode` chain element kind — not an extension of `BracketNode`. |
| G4 | PostRegistration initial-state merge sweep is **deferred**. Authors are responsible for not seeding two mergeable stacks in the same container; the content-authoring tools will warn (separate work, not in this plan). |
| G5 | If an `applyQuantity` action callback throws, the helper propagates. Throws are programmatic violations; `{ ok: false }` is the soft-failure signal. |
| G6 | `Mixins.Globbable` ⊥ `Mixins.Container` enforced by a runtime assertion in the `Globbable` mixin body at class-registration time (the existing pattern from other mixins with composition constraints). No general "X ⊥ Y" registry is built. |
| G7 | `all` becomes a quantity hint when followed by at least one token. Added to MQL grammar reserved-keywords list during the docs sweep. |
| G8 | `EmptyResultNote.query` carries post-desugar text (the form the resolver actually saw). Matches `MqlResult.raw` semantics. |
| G9 | No `forceMove`-style variant of `placeDirect`. The ApiOnly gate + fresh-placement precondition are sufficient. |

## Scope summary

What ships:

- `Globbable` mixin in `lib/stuff/` (it's a property of Stuff,
  not its own subsystem — slate's `lib/glob/` proposal supersedes).
- A new `api/glob.ts` with `GlobbableApi` (split, merge, canMerge,
  formatName, applyQuantity).
- `Mixins.Globbable` constant and `MixinApi.isGlobbable` predicate.
- `ContainmentApi.placeDirect(stuff, env)` primitive.
- Merge-on-arrival ripple wired into `ContainmentApi.move`.
- MQL extensions: leading-quantity desugar, formal `:{N}` / `:{*}`
  syntax, `MqlQuantity` slot on `MqlOneResult` / `MqlManyResult`,
  parser/lexer support for `{` `}`.
- `DropController` and `GetController` upgraded to use
  `applyQuantity` when `model.targets.quantity` is present.
- Tests across mixin / Api / containment / MQL / controller layers.
- Docs sweep retiring the "globbable not yet" entries in
  `mql-grammar.md` and `mql.md`, and a new
  `docs/subsystems/glob.md`.

What's out of scope (per slate or per resolved gap):

- `GiveController` (see Scope decision below).
- Bulkable (`Quantity<U>`-valued globs) — separate slate.
- Response-envelope substrate (separate slate, parallel session).
- DescribeApi v2 composition pipeline (recognition slate).
- PostRegistration initial-state merge sweep.
- Bucket-keyed verbosity, perception-filtered partial rendering.
- Capacity model for glob-bearing containers (collision slate).
- `placeDirect` callers other than `GlobbableApi.split` (the
  bootstrap and hot-reload-reattach call sites the slate
  anticipates can adopt it later; not load-bearing for v1).

### Scope decision: `GiveController`

The slate's v1 verb roster names `drop`, `get`, **`give`**.
`GetController` and `DropController` exist today; no `GiveController`
or `give.yaml` exists. Creating `give` from scratch requires
designing recipient targeting (NPC-as-Container assumption, prep
shape `give X to Y`, whether the recipient can refuse, etc.) which is
its own design pass.

**This plan descopes `give` to a follow-up.** Drop + Get are
sufficient to prove the helper, demonstrate both directional shapes
(inventory→env and env→inventory), and validate the merge-on-arrival
ripple. Give can land as a small additional PR once recipient
targeting is settled.

If you'd rather keep give in scope, flag it during plan review and
I'll fold it in.

## File-by-file work

New files:

| Path | Purpose |
|---|---|
| `packages/server/src/mud/lib/stuff/Globbable.ts` | The mixin. |
| `packages/server/src/mud/lib/stuff/__tests__/Globbable.test.ts` | Mixin unit tests. |
| `packages/server/src/mud/api/glob.ts` | `GlobbableApi` (split, merge, canMerge, formatName, applyQuantity). |
| `packages/server/src/mud/api/__tests__/glob.test.ts` | Api unit + integration tests. |
| `docs/subsystems/glob.md` | Subsystem reference. |

Modified files:

| Path | Why |
|---|---|
| `packages/server/src/mud/lib/mixin.ts` | Add `Mixins.Globbable` constant. |
| `packages/server/src/mud/api/mixin.ts` | Add `MixinApi.isGlobbable` predicate. |
| `packages/server/src/mud/api/containment.ts` | Add `placeDirect`; wire merge-on-arrival into `move`. |
| `packages/server/src/mud/api/mql/desugar.ts` | Add quantity prefix rewrite; signature change to return `{ rewritten, quantityHint? }`; add `{` to `looksFormal` signal set. |
| `packages/server/src/mud/api/mql/lexer.ts` | Recognize `{` `}` tokens. |
| `packages/server/src/mud/api/mql/parser.ts` | Parse `:{N}` / `:{*}` into `QuantityNode`. |
| `packages/server/src/mud/api/mql/types.ts` | Add `MqlQuantity` type, `QuantityNode` chain element, extend `MqlOneResult` / `MqlManyResult` with `quantity?: MqlQuantity`. |
| `packages/server/src/mud/api/mql/resolver.ts` | Pass quantity hints through to results; merge formal + natural-language hints. |
| `packages/server/src/mud/api/mql.ts` | Thread quantity into `MqlResult` wrappers. |
| `packages/server/src/mud/api/command.ts` | Update callers of `desugar()` for the new signature; thread quantity hint into the dispatch path landing on `MqlResult`. |
| `packages/server/src/mud/obj/command/DropController.ts` | Quantity-aware via `applyQuantity`. |
| `packages/server/src/mud/cmd/drop.yaml` | (Likely unchanged — quantity rides on the existing field's `MqlResult`.) |
| `packages/server/src/mud/obj/command/GetController.ts` | Quantity-aware via `applyQuantity`. |
| `packages/server/src/mud/cmd/get.yaml` | (Likely unchanged.) |
| `docs/mql-grammar.md` | Retire "no globbable" limitation; add `all` to reserved keywords; `{` `}` token row finalized. |
| `docs/subsystems/mql.md` | Retire "no globbable" limitation; document the desugar signature change; describe `QuantityNode`. |
| `docs/slates/globbable-slate.md` | Mark as "implemented; see subsystems/glob.md" header note. |
| `CLAUDE.md` documentation map | Add line for `subsystems/glob.md`. |

## Build order

Six waves. Each wave's tests pass before the next begins.

### Wave 1 — Mixin substrate

Goal: `Globbable` mixin compiles, has unit tests, is discoverable
through `MixinApi.isGlobbable` and `Mixins.Globbable`.

1. **`Mixins.Globbable`** — append constant in
   `lib/mixin.ts` `Mixins` object. String value `'GlobbableMixin'`
   per convention.
2. **`MixinApi.isGlobbable`** — append predicate in `api/mixin.ts`
   alongside `isContainer`, etc. Same control-flow-narrowing shape.
3. **`Globbable` mixin** at `lib/stuff/Globbable.ts`. Surface:
   ```ts
   export interface Globbable {
     getQuantity(): number;
     setQuantity(n: number): void;
     canMergeWith(other: Stuff): boolean;
     canSplit(n: number): boolean;
     onSplit(splitoff: Stuff): void;
     onMerged(absorbed: Stuff): void;
   }
   export function GlobbableMixin<T extends Constructor<Stuff>>(Base: T): T & Constructor<Globbable> { ... }
   ```
   Implementation notes:
   - Persistent field: `quantity: number` (default 1). Declared in
     `static persistentFields = ['quantity']` on the mixin's class
     output; subclasses extend per existing pattern.
   - **`static globIdentityFields: string[] = []`** declared on the
     mixin class. Subclasses override. Persistence-layer check at
     registration verifies `globIdentityFields ⊂ persistentFields`
     (helper utility, possibly added to `api/mixin.ts`).
   - `setQuantity` validates `n >= 1` and `Number.isInteger(n)`;
     throws on violation.
   - `canMergeWith(other)` default implementation: returns
     `MixinApi.isGlobbable(other) && other.getTemplatePath() === this.getTemplatePath()` and runs the
     `globIdentityFields` value-comparison via getter access. Walks
     the union of both classes' fields (slate § "Glob identity").
     Returns false if either side has shadows or adornments (default
     conservative posture; future shadow overrides loosen).
   - `canSplit(n)` default: returns false if `n < 1`, `n > getQuantity()`,
     this has shadows, this has adornments. True otherwise.
   - `onSplit`, `onMerged` ship as no-op terminals so subclasses can
     `super.onSplit()` without ceremony (same pattern as
     `Stuff.onDestruct()`).
   - **Composition constraint** (G6): at class registration, assert
     `!hasMixin(this, Mixins.Container)`. A glob isn't a Container.
     Mechanism: a `static __validateComposition__` method, called by
     `MixinApi.register` or equivalent, throws on violation. (Verify
     the existing registration call site during build — there may
     already be a hook; if not, add a minimal one.)
4. **Unit tests** at `lib/stuff/__tests__/Globbable.test.ts`:
   - Default quantity is 1.
   - `setQuantity` validates positive integer.
   - `canSplit` veto rules (n out of range, shadows, adornments).
   - `canMergeWith` against same-template + matching identity fields → true.
   - `canMergeWith` against different template → false.
   - `canMergeWith` against differing identity field → false.
   - `canMergeWith` with shadow on either side → false.
   - `globIdentityFields ⊂ persistentFields` validation at
     registration.
   - Composition with `Container` throws at registration.

### Wave 2 — Containment primitive (`placeDirect`)

Goal: `placeDirect` exists and is tested. Merge-on-arrival lands in
Wave 4 once `GlobbableApi.merge` exists (avoids the cyclic
dependency).

5. **`ContainmentApi.placeDirect(stuff, env)`** in
   `api/containment.ts`. ApiOnly security. Fresh-placement
   precondition. Throws if `stuff.getEnvironment() !== null`. Mixin
   compatibility check (Containable / Container). Calls into the
   internal `setEnvironment` + `addContainable` sequence directly
   (the same sequence `move` uses, minus witnesses + validators +
   capacity).
6. **Tests** in `api/__tests__/containment.test.ts` (or sibling):
   - `placeDirect` happy path: fresh stuff lands in env without
     firing leave/arrival witnesses.
   - `placeDirect` rejects when stuff has an environment.
   - `placeDirect` rejects when stuff isn't Containable.
   - `placeDirect` rejects when env isn't Container.

### Wave 3 — MQL surface

Goal: `MqlOneResult` / `MqlManyResult` carry `quantity?: MqlQuantity`;
both natural-language and formal forms produce it.

8. **`MqlQuantity` type** in `api/mql/types.ts`:
   ```ts
   export type MqlQuantity = {
     value: { kind: 'count'; n: number } | { kind: 'all' };
     mode: 'strict' | 'lenient';
   };
   export type MqlQuantityHint = MqlQuantity;  // alias used by desugar
   ```

   **Controllers don't read `mode`.** It's transport-only — it carries
   the syntax-form signal (formal `:{N}` → strict; natural-language
   `2 X` → lenient) from the resolver to the helper, and
   `GlobbableApi.applyQuantity` is its only legitimate consumer.
   Controllers pass the whole `MqlQuantity` through to the helper
   without branching on `mode`. The only reason a controller would
   ever touch it is to deliberately override policy (`applyQuantity(
   stuff, { ...quantity, mode: 'strict' }, action)`) — and that's a
   loud, explicit signal that the controller is doing something
   unusual. v1 has no such verbs. Document this convention in
   `subsystems/glob.md` and in the JSDoc on `MqlQuantity` so the
   question doesn't recur.
9. **`QuantityNode` chain element** in `types.ts`:
   ```ts
   export interface QuantityNode {
     kind: 'quantity';
     value: { kind: 'count'; n: number } | { kind: 'all' };
   }
   ```
   Add to `ChainElement` union.
10. **`MqlOneResult` / `MqlManyResult`** extend with
    `quantity?: MqlQuantity` (already-existing optional fields shape).
11. **`looksFormal` adjustment** in `desugar.ts`: add `{` to the
    signal-character set. Documented inline.
12. **Desugar signature change** in `desugar.ts`:
    - New return type `{ rewritten: string; quantityHint?: MqlQuantityHint; error?: string }`.
    - Quantity prefix rewrite: matches `^(?:(\d+)|(all))\s+(\S.*)$`
      against the post-article-stripped form. Captures the count
      (or `'all'` sentinel) into `quantityHint`. Re-runs article
      strip + ordinal rewrite on the residual.
    - `quantityHint.mode = 'lenient'` for natural-language path.
    - Article-strip-only and ordinal-rewrite paths return
      `quantityHint: undefined`.
    - Empty-string input or no-rewrite path: `rewritten: input,
      quantityHint: undefined`.
    - **Quantity + ordinal collision** (`drop 2nd 3 roses`,
      `drop 3 2nd roses`) — desugar detects and refuses with an
      `error` string carrying the friendly rephrase guidance. Two
      detection points:
      - After quantity-prefix capture succeeds, if the residual's
        leading token would trigger ordinal rewrite (matches
        `ORDINAL_WORDS` or `ORDINAL_NUMERIC`), set `error`.
      - After ordinal capture succeeds, if the residual's leading
        token is a pure-digit count or the literal `all` followed
        by another token, set `error`.
      - Error message: `"'<input>' is ambiguous: combines a count
        with an ordinal. Use a range (e.g. 'roses:[4..6]' for the
        2nd group of three), a single ordinal (e.g. '2nd rose'),
        or a plain count (e.g. '3 roses')."`
      - The dispatcher surfaces `desugar()`'s `error` as the
        command's "couldn't resolve" failure prose. No quantity
        hint or rewrite is returned when `error` is set;
        `rewritten` is the original input.
13. **Desugar callers updated** — primarily the resolver. The
    `desugar.ts`'s call site changes from `const q = desugar(input)`
    to `const { rewritten, quantityHint } = desugar(input)`.
    Resolver stores `quantityHint` to merge with any parser-produced
    `QuantityNode` (one or the other will be present, never both —
    natural-language input is `looksFormal`-rejected if it contains
    `{`).
14. **Lexer** in `lexer.ts`: emit `{` and `}` as their own tokens
    (call them `qopen` / `qclose` or similar; pick a name consistent
    with the existing `lbracket`/`rbracket` style). `*` inside `{ }`
    already lexes as `star`; the parser disambiguates by position.
15. **Parser** in `parser.ts`:
    - After a chain-position `:`, if the next token is `qopen`,
      consume `qopen`, then either:
      - An int → `QuantityNode { value: { kind: 'count', n } }`
      - A `star` → `QuantityNode { value: { kind: 'all' } }`
      - Anything else → syntax error
    - Expect `qclose`; error otherwise.
    - `QuantityNode` can only appear mid-chain (not at chain head);
      same rule as bracket nodes today.
16. **Resolver** in `resolver.ts`:
    - When a `QuantityNode` is encountered, do **not** modify the
      candidate set. Carry the quantity hint forward to be attached
      to the final result. Strict mode (`mode: 'strict'`) because
      formal syntax was used.
    - At result finalization, attach `quantity` to the `MqlOne` /
      `MqlMany` returned wrapper:
      - Strict (from `QuantityNode`) wins if both are present (the
        natural-language hint is invalidated whenever `looksFormal`
        fires, so in practice you'll never see both).
      - Otherwise lenient (from desugar hint).
17. **`MqlApi`** in `mql.ts` and the dispatcher wrapper in
    `command.ts`: thread quantity from `MqlOne` / `MqlMany` onto
    `MqlOneResult` / `MqlManyResult`.
18. **Tests**:
    - `desugar.test.ts`: leading integer captured; `all` captured;
      non-quantity input returns hint `undefined`; quantity + ordinal
      collision returns `error` with friendly rephrase guidance
      (`2nd 3 roses`, `3 2nd roses`, `all 2nd roses`); plain ordinal
      and plain count still work in isolation.
    - `mql.lexer.test.ts`: `{` and `}` tokenize as expected; inside
      `{ }`, `*` and integers lex as star/int.
    - `mql.parser.test.ts`: `coin:{5}` parses to a chain with a
      `QuantityNode`; `coin:{*}` parses to all-kind; `coin:{[5]}`,
      `coin:{}`, `coin:{abc}` reject.
    - `mql.test.ts` (resolver end-to-end): `drop 2 coins` produces
      `MqlManyResult.quantity = { value: { kind: 'count', n: 2 },
      mode: 'lenient' }`; `drop coins:{5}` produces strict-mode hint.

### Wave 4 — `GlobbableApi`

Goal: `split`, `merge`, `canMerge`, `formatName`, `applyQuantity`
work end-to-end; tested.

19. **`GlobbableApi.canMerge(a, b)`** in `api/glob.ts`. Symmetric
    field-set comparison; backed by `canMergeWith`. Used by the
    merge-on-arrival sibling scan in `ContainmentApi.move`.
20. **`GlobbableApi.split(source, n)`** — async (uses
    `StuffApi.clone`):
    - Validates `n` is positive integer, `n <= source.getQuantity()`.
    - Calls `source.canSplit(n)`; throws on veto.
    - **Short circuit**: when `n === source.getQuantity()`, returns
      `source` itself (no clone, no split). The slate's
      "destruct-on-zero" rule: caller will move the whole stack;
      no new Stuff needed.
    - Else: `StuffApi.clone(source.getTemplatePath())` → splitoff.
    - Walk `source.constructor.globIdentityFields`. For each field,
      copy via the public getter/setter pair (per the inter-stuff
      contract). Slot-write via `setX` is the canonical route.
    - `splitoff.setQuantity(n)`, then `source.setQuantity(source.getQuantity() - n)`.
    - `ContainmentApi.placeDirect(splitoff, source.getEnvironment())`.
    - `source.onSplit(splitoff)`.
    - Returns splitoff.
    - Decorated `@CallSecurity(SecurityPolicies.ApiOnly)`.
21. **`GlobbableApi.merge(survivor, absorbed)`** — sync:
    - Validates both are Globbable.
    - Validates `survivor.canMergeWith(absorbed)`.
    - `survivor.setQuantity(survivor.getQuantity() + absorbed.getQuantity())`.
    - `StuffApi.destruct(absorbed)`.
    - `survivor.onMerged(absorbed)`.
    - ApiOnly.

    **Same step also wires merge-on-arrival into
    `ContainmentApi.move`** (deferred from Wave 2 to here because it
    needs `merge` to exist):
    - After the new env is committed and post-move `on*` hooks fire,
      if the moved Stuff is Globbable, scan the destination's
      contents for a mergeable sibling. If found, call
      `GlobbableApi.merge` to fold the arrival into the resident.
    - Ordering: merge **after** `onContainableAdded` so subscribers
      see the arrival, then see the destruct. (Merging before would
      hide the arrival from witnesses; not what the slate intends.)
    - `ContainmentApi.move`'s signature stays `void`. Callers that
      care which Stuff survives query the destination afterwards.
    - Skip path: `!MixinApi.isGlobbable(moved)` short-circuits before
      the sibling scan.
    - Tests (added to `api/__tests__/containment.test.ts`):
      - `move` triggers merge when arriving glob has a mergeable
        sibling in destination; resident absorbs; arrival destructed.
      - `move` triggers no merge when no mergeable sibling exists.
      - `move` of a non-globbable Stuff doesn't scan for merge.
      - Existing non-globbable `move` regression: no behavior change.
22. **`GlobbableApi.formatName(stuff)`** — for any Stuff, returns
    `count + " " + pluralize(name)` when globbable with `n > 1`;
    falls through to `DescribeApi.getDisplayName(stuff, fallback)`
    otherwise. Uses `GrammarApi.pluralize(name, n)` if available;
    fallback to naive `name + 's'` if `GrammarApi.pluralize` doesn't
    exist (note: verify during build).
    - Host may declare an optional `getPluralForm(): string`; if
      present and `n !== 1`, that's used. (Slate § "The contract
      Globbable exposes.")
    - Quirk: this doesn't go on `Globbable` itself because it
      mediates between Globbable and DescribeApi/GrammarApi.
      `GlobbableApi.formatName` is the right level.
23. **`GlobbableApi.applyQuantity`** — the workhorse helper. Signature
    per slate § "GlobbableApi.applyQuantity — the helper". Behavior
    notes:
    - **Action callback contract**:
      ```ts
      type ActionResult<T> =
        | { ok: true; payload: T }
        | { ok: false; reason: string };  // controller's reason vocab
      ```
      The `reason` is an open-enumeration string declared by the
      calling controller (`'cursed'`, `'too-heavy'`, `'not-yours'`).
      Helper threads it into a `targetDeclined` note. The forward-
      facing envelope channel (when it lands) renders this as
      `target-declined { target: StuffRef, reason: string }`. v1
      drop/get callers always return `ok: true` (move-failures
      throw); the contract is forward-looking for collision-slate
      capacity declines and content-side veto cases.
    - Empty candidate list → `{ ok: false, status: 'declined',
      applied: 0, notes: [emptyResult], payloads: [] }`.
    - Strict pre-check on count mode: compute total available
      (Globbable contributes `getQuantity()`, others 1); if total <
      requested, return decline with `quantityClampedRejected` note.
    - All-kind: action on every candidate at full contribution.
    - Count-kind iteration in scored order:
      - `contribution = min(isGlobbable(c) ? c.getQuantity() : 1, remaining)`
      - If `isGlobbable(c) && contribution < c.getQuantity()` →
        `operand = await split(c, contribution)`. Else operand = c.
      - `result = await action(operand, contribution)`.
      - If `result.ok === false`:
        - Emit a `targetDeclined` note carrying `target: StuffRef`
          (the candidate `c`, not the operand) and `reason:
          result.reason`. The candidate is the user-visible target;
          the operand is an internal split artifact.
        - If we split → `merge(c, operand)` to restore the source.
        - Continue walk (do not advance `applied`; `remaining`
          unchanged).
      - On success: accumulate.
    - Lenient + remaining > 0 after walk → `quantityClamped` note;
      status `'partial'`.
    - `target-declined` notes co-emit with `quantity-clamped` when
      both apply (some targets refused AND total fell short). Status
      is `'partial'` when any progress was made, `'declined'` when
      `applied === 0`.
    - Return shape per slate.
    - **Throw propagation (G5)**: if `action` throws, the helper
      lets it propagate. (Split partially completed → operand is
      orphaned in source.getEnvironment() with no merge-back; the
      controller's outer error handler is responsible. The slate's
      `ok: false` is the only soft-failure protocol.)
    - **Note shape** (G1 stub): notes are returned as a plain list
      of typed objects. Discriminated union local to this slate's
      v1: `QuantityClampedNote | QuantityClampedRejectedNote |
      EmptyResultNote | TargetDeclinedNote`. Concrete shapes match
      the response-envelope slate's roster (`field` on field-scoped
      notes; `target: StuffRef` + `reason: string` on
      `TargetDeclinedNote`). Defined in `api/glob.ts` (or a sibling
      `api/notes.ts` if it gets reused — judgment call during build;
      if response-envelope lands during build, fold into its shape
      instead).
24. **Tests** in `api/__tests__/glob.test.ts`:
    - `split` happy path: 10-stack → split 3 → source has 7,
      splitoff has 3, both in same env, identity fields copied.
    - `split` whole-stack short circuit returns source.
    - `split` over-quantity rejects.
    - `split` veto rejects.
    - `split` placed via `placeDirect` (no arrival witness fires).
    - `merge` happy path: 5+10 → survivor=15, absorbed destructed.
    - `merge` non-mergeable rejects.
    - `canMerge` symmetric.
    - `formatName` for n=1 (singular), n>1 (plural).
    - `formatName` falls through for non-globbable.
    - `applyQuantity`:
      - Empty list → declined + emptyResult note.
      - Strict pre-check decline → declined + clampedRejected.
      - Strict pre-check passes → ok.
      - Lenient overflow → partial + clamped.
      - Multi-match distribution (apples + oranges).
      - Mixed glob + non-glob.
      - All-kind.
      - Action returns `ok: false` → reglob; emit
        `targetDeclined { target, reason }`; walk continues;
        `applied` unchanged for that target.
      - Action returns `ok: false` on some targets + supply falls
        short → partial status, `targetDeclined` notes co-emit
        with `quantityClamped`.
      - Action returns `ok: false` on every target → declined
        status, `applied: 0`, only `targetDeclined` notes
        (no `quantityClamped` since requested was nominally
        satisfiable from supply).
      - Action throws → propagates.

### Wave 5 — Controller integration

Goal: `drop` and `get` handle quantity-bearing inputs end-to-end.

25. **`DropController` rewrite** to the slate's two-phase shape:
    - Existing model field is `model.targets: MqlManyResult`.
      Destructure: `const { stuff, quantity } = model.targets;`
    - No quantity → existing whole-set path (preserved).
    - Quantity present → `await GlobbableApi.applyQuantity(stuff,
      quantity, async (operand) => { ContainmentApi.move(operand,
      ctx.location); return { ok: true, payload: operand }; })`.
    - The action callback returns `ok: true` unconditionally for
      v1; `ContainmentApi.move` throws on programmatic violations
      (per G5), which propagates out of the helper. Capacity-driven
      `ok: false` returns (with `reason: 'no-space'` or similar)
      come with the collision slate; for v1, the wiring supports
      it but no path produces it.
    - Read `result.status`, `result.notes`, `result.payloads`.
    - Stub the envelope (G1): fold notes into the `summary` Mml:
      - `quantityClamped` → suffix `" (only N available)"`.
      - `quantityClampedRejected` → return `{ success: false,
        summary: "you only have N of those" }`.
      - `emptyResult` → existing "you don't have any '<raw>'" form.
      - `targetDeclined` → unreachable in v1 (action always
        returns `ok: true`). The rendering branch is a no-op
        guard so the kind-switch is exhaustive; when collision
        slate enables real `ok: false` returns, the branch will
        compose a per-target refusal clause into `summary`.
    - `success`: `true` if `applied > 0`, else `false`.
    - Becomes `async`.
26. **`GetController` rewrite** — mirror shape, source = environment,
    dest = giver's inventory. Same quantity branch + stub envelope
    rendering.
27. **Controller tests**:
    - `DropController.test.ts`: bareword path unchanged; `drop 5 coins`
      against 30-stack drops 5 (split); `drop 99 coins` against 10
      clamps; `drop coins:{99}` against 10 rejects with no action;
      `drop all coins` drops everything; `drop 2 fruit` against
      apples+oranges distributes; `drop 3 stones` against
      mixed-globbable distributes.
    - `GetController.test.ts`: mirror suite, focusing on the
      environment-to-inventory direction. Coverage parity is the goal;
      not every case needs both verbs.

### Wave 6 — Docs

28. **`docs/subsystems/glob.md`** — new subsystem reference.
    Structure:
    - Overview (one paragraph: Globbable, GlobbableApi, when to
      reach for stacks).
    - Mixin surface (methods, persistent field, identity declaration).
    - `globIdentityFields ⊂ persistentFields` rule + worked example.
    - `GlobbableApi.split` semantics + `placeDirect` integration.
    - `GlobbableApi.merge` semantics + `move` integration.
    - `GlobbableApi.applyQuantity` helper contract.
    - `GlobbableApi.formatName` quirks.
    - MQL touchpoints (quantity hint, `:{N}`, `:{*}`,
      `MqlResult.quantity`).
    - Author guide: composing Globbable, declaring identity, defaults.
    - Antipatterns: glob-inside-container, instance-unique state on
      stacks, Stuff-count capacity on glob containers.
29. **`docs/mql-grammar.md`** updates:
    - Token table: confirm `{` `}` row is finalized as quantity
      syntax (currently flagged "reserved").
    - Reserved keywords: add `all` to the list.
    - Limitations: retire the "no globbable / fungible quantities"
      entry.
    - Cookbook: add `drop 5 coins`, `coin:{5}`, `coin:{*}` examples.
    - Chain operators: add `:{N}` / `:{*}` row.
    - Natural-language layer § quantity prefix: document the
      `<count> X` and `all X` forms; document the quantity + ordinal
      collision rejection with the canonical error message and the
      three rephrase escape hatches (range `:[N..M]`, single ordinal
      `:[N]`, plain count `<N> X`).
30. **`docs/subsystems/mql.md`** updates:
    - Pipeline § Desugar: document the signature change to return
      `{ rewritten, quantityHint? }`.
    - Pipeline § Parse: document the `QuantityNode` chain element.
    - Pipeline § Resolve: document quantity passthrough.
    - Limitations: retire the "no globbable" entry.
    - `MqlOneResult` / `MqlManyResult` doc: document the new
      `quantity?` slot.
31. **`docs/slates/globbable-slate.md`** — add an "Implemented" note
    at the top pointing to `subsystems/glob.md`. Per the precedent
    of `dbae064 docs(ref-shapes): retire the build plan`, possibly
    retire the slate altogether if it's fully realized — leave that
    call for the user during review.
32. **`CLAUDE.md`** documentation map — add the `glob.md` line.

## Stubbing strategy for the envelope (G1)

Per the resolved decision, the v1 globbable PR does NOT introduce
`CommandContext.note(...)` or `CommandResult.outcome`. Instead:

- `GlobbableApi.applyQuantity` returns notes in its result shape
  (`{ ok, applied, status?, notes, payloads }`). This shape will
  stay stable when the envelope lands; only the consumer side
  changes.
- Controllers inspect `result.notes` and craft `summary` Mml that
  carries the user-facing equivalent inline ("you only have 10", "you
  don't have any 'turnips'").
- When the response-envelope work lands later, the controller
  changes from "fold into summary" to `result.notes.forEach(n => ctx.note(n))`. The `applyQuantity` helper itself doesn't change.

This keeps the helper aligned with the envelope's future shape
without depending on a parallel-session build.

## Open implementation questions

Small judgment calls that the build session will resolve:

- **Helper module location for the note types.** The plan puts them
  in `api/glob.ts` to start; if response-envelope lands during the
  build, fold them into its shape instead.
- **`GrammarApi.pluralize`** — verify existence during build. If
  absent, naive `name + 's'` is the default; host-side
  `getPluralForm` override remains the irregular escape hatch.
- **`MixinApi.register` hook for composition constraints (G6)** —
  the existing surface may already support this. Verify; build the
  minimal addition only if needed.
- **`MqlOneResult.quantity`** (singular field + quantity hint):
  slate § "Singular field + count > 1" describes the case for
  natural-language. For v1, dropping the hint on singular fields is
  acceptable; controllers that opt in to quantity should declare
  `type: objects`. Verify no v1 verb exercises this path; document
  in glob.md.
- **`ContainmentApi.placeDirect` mixin compatibility on env** — the
  slate says env must be `Container`. Verify the existing
  Containable / Container interfaces are the right names (the grep
  showed both); use whatever `move` uses today.

## Test gating (must-pass before doc sweep)

- All Wave 1 mixin tests pass.
- All Wave 2 containment tests pass (`placeDirect` only).
- All Wave 3 MQL tests pass; existing MQL test suite unaffected
  by the desugar signature change.
- All Wave 4 GlobbableApi tests pass; existing `ContainmentApi.move`
  tests unaffected by the merge-on-arrival addition (regression
  check is part of this gate).
- All Wave 5 controller tests pass; existing drop/get tests
  (bareword/non-quantity paths) unaffected.
- `pnpm lint` clean.
- `pnpm build` clean (TypeScript strict).
- `pnpm test` end-to-end clean.

## Risk register

- **Desugar signature change is wider than this slate** — every
  call site needs updating. `desugar.ts` is called from `resolver.ts`
  and maybe directly from test scaffolding. The change is
  mechanical but big-blast-radius. Worth being deliberate during
  Wave 3.
- **Merge-on-arrival in `move`** — wiring this into the existing
  `move` machinery without breaking the well-trodden post-move
  hook order is the load-bearing risk. Carefully read the existing
  `#moveCore` sequence before editing.
- **`StuffApi.clone` for split** — clone is async, runs hooks,
  fires lifecycle. Verify that clone of a glob template doesn't do
  anything unexpected (e.g., place the new Stuff somewhere — slate
  assumes clone produces a Stuff with `getEnvironment() === null`).
  If clone DOES auto-place, the split path needs a different
  primitive (or `placeDirect` after an extract; not ideal). Verify
  during Wave 4.
- **Composition constraint enforcement (G6)** — verify the
  registration hook exists. If not, building the minimal one is in
  scope; building a general "X ⊥ Y" registry is not.

## Out of band

If anything in the slate's content turns out to be wrong during
the build (a contradiction with current code, an assumption that
doesn't hold), the build session should stop and surface it
rather than improvising. The slate is the contract this plan
implements.
