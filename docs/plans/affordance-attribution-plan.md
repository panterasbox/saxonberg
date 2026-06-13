# Implementation Plan — affordance-attribution

Worktree: `/home/bobalu/play/saxonberg/build-2`, branch
`feature/affordance-attribution`. All paths relative to that root.
Seeded by `docs/requirements/affordance-attribution-requirements.md`
(authoritative, closed scope) and
`docs/subsystems/command-routing.md` § "Affordance attribution".

## Verified code facts

- `getAvailableCommands()` — `CommandGiver.ts:252`; seeds the self entry,
  walks `_commandStack` newest-first, pushes `entry.commands`, drops
  `source`/`bucket`.
- `RecencyBucket` (124), `RecencySource` (127, `Stuff | 'self'`),
  `RecencyEntry` (130) exported from `CommandGiver.ts`.
- `matchVerbContextual(verb, available: CommandDefinition[])`
  (`command.ts:1419`) = `available.filter(cmd => cmd.hasVerb(verb))`.
  **Only production caller: `_runChain` at `CommandGiver.ts:709`** — the
  single dispatch site to change.
- Context construction seam: `CommandContext` (`command.ts:103`),
  `CreateCommandContextArgs` (155), `CommandContextImpl` (211),
  `createCommandContext` factory (1304). Never `new CommandContext`.
- Bound short-circuit (`CommandGiver.ts:508-547`) and programmatic
  dispatch run `_executeOne(..., outer)` — `outer` is the giver-fallback
  context built once in `executeCommand` (line 437-446).
- System verbs reach an actor via `Avatar.commandContributions.self`
  (`Avatar.ts:84-91`). Seeds directory-walked by `SeederManager` (no
  manifest); a seed YAML under `seeds/obj/command/system/` registers.
  Controllers cloned by path `/obj/command/<controllerName>`.
- Controller idiom: `CommandController` subclass, `execute(model, ctx)`,
  private `tell(ctx, body: Mml)` over
  `MessageApi.scene(ctx.commandGiver).topic(...).toSelf(body).send()`
  (mirror `HelpController.ts:173`). `DescribeApi.getDisplayName(obj)`
  (`describe.ts:115`) → `string`.
- Item-afforded fixture already exists: `InvProvider` with
  `commandContributions.inventory = ['system/ping.yaml']`
  (`command-recency.test.ts:51-59`). No `Scryable` needed.

## Design decision — how `source` reaches the context

`getAffordances()` is the source of truth; `getAvailableCommands()`
becomes a projection. `_runChain` matches against **affordances** (not
bare defs) so each matched `CommandDefinition` arrives paired with its
resolved `source`; the claiming attempt passes that `source` into
`createCommandContext`. `matchVerbContextual` is left as-is (pure
helper, still used by tests); `_runChain` filters the affordance list
inline. No `CommandDefinition` change, no parallel lookup.

---

## Files & changes, in order

### Step 1 — `lib/command/CommandGiver.ts` (accessor + type)

1a. Add `Affordance` interface beside `RecencyEntry` (~line 137),
exported (colocated, no `types.ts`):

```ts
/** A command paired with the resolved Stuff that affords it and its bucket. */
export interface Affordance {
  command: CommandDefinition;
  source: Stuff;            // resolved: the giver itself when entry.source === 'self'
  bucket: RecencyBucket;
}
```

1b. Add to the `CommandGiver` interface (141-154): `getAffordances(): Affordance[];`

1c. Implement `getAffordances()` just before `getAvailableCommands()`,
resolving `'self'` → giver:

```ts
getAffordances(): Affordance[] {
  this._ensureSelfEntry();
  const giver = this as unknown as Stuff;
  const out: Affordance[] = [];
  for (let i = this._commandStack.length - 1; i >= 0; i--) {
    const entry = this._commandStack[i]!;
    const source = entry.source === 'self' ? giver : entry.source;
    for (const command of entry.commands) {
      out.push({ command, source, bucket: entry.bucket });
    }
  }
  return out;
}
```

1d. Reimplement `getAvailableCommands()` as a projection (order
preserved — both walk high-index-first, emit `entry.commands` in order):

```ts
getAvailableCommands(): CommandDefinition[] {
  return this.getAffordances().map((a) => a.command);
}
```

### Step 2 — `api/command.ts` (context field + factory)

2a. `CommandContext` (103): add after `command`:

```ts
/**
 * The Stuff that afforded the executing command — the giver itself for
 * an innate ('self') verb, or the granting item/peer otherwise.
 * Populated by the dispatcher from the claiming match's affordance
 * record (resolved 'self' → giver). Falls back to the giver on the
 * bound / programmatic dispatch paths. Always a concrete Stuff.
 */
commandSource: Stuff;
```

2b. `CreateCommandContextArgs` (155): add `commandSource: Stuff;`
2c. `CommandContextImpl` (211): add `public commandSource: Stuff;` +
constructor assign `this.commandSource = args.commandSource;`

### Step 3 — `lib/command/CommandGiver.ts` (dispatch threading)

3a. `_runChain` claiming-match path:
- Replace (709-712):
  `const matches = CommandApi.matchVerbContextual(parsed.verb, this.getAvailableCommands());`
  with
  ```ts
  const affordances = this.getAffordances();
  const matches = affordances.filter((a) => a.command.hasVerb(parsed.verb));
  ```
- `for (const command of matches)` (771) → `for (const affordance of matches)`;
  add `const command = affordance.command;` at top of loop body (all
  downstream `command` refs unchanged).
- In the per-attempt `createCommandContext({ ... })` (803-812) add
  `commandSource: affordance.source,`.
- Bind-error early-return on `outer` (781-797): no change (giver fallback).

3b. Empty-match note path (763-768): returns `outer` — giver fallback, fine.

3c. `executeCommand` `outer` context (437-446): add `commandSource: giver,`.
This one line covers all fallback paths (bound short-circuit,
programmatic/cascaded, pre-match failures), since they all ride `outer`.

### Step 4 — consumer verb (mirror `ping`)

4a. `cmd/system/affordances.yaml`:
```yaml
verbs: [affordances]
controller: system/AffordancesController
description: "List your available commands and what affords each."
```

4b. `obj/command/system/AffordancesController.ts` — `CommandController`,
`execute(model, context)`:
- `context.commandGiver.getAffordances()`; per affordance render a line:
  `a.command.getPrimaryVerb()` annotated with
  `DescribeApi.getDisplayName(a.source)`. Distinguish innate vs item by
  **identity compare `a.source` to `context.commandGiver`** (no `kind`,
  no `bucket`-branching; bucket may be shown as a descriptive hint only).
- Read `context.commandSource`; emit a self-demonstrating line ("this
  command was afforded by `DescribeApi.getDisplayName(context.commandSource)`").
- Emit via private `tell` over
  `MessageApi.scene(context.commandGiver).topic('system.affordances').toSelf(body).send()`;
  `Mml.fromMarkup(lines.join('\n'))`. Imports: `CommandController`
  (`../../../lib/command/CommandController`), `CommandContext`/
  `CommandModel` types (`../../../api/command`), `MessageApi`
  (`../../../api/message`), `Mml` (`../../../api/mml`), `DescribeApi`
  (`../../../api/describe`). Source read only through method surface.

4c. `seeds/obj/command/system/AffordancesController.yaml`:
```yaml
class: /obj/command/system/AffordancesController
data: {}
```

4d. `obj/Avatar.ts:85-91`: add `"system/affordances.yaml"` to
`commandContributions.self`. Ungated, server-only.

### Step 5 — tests (Vitest, colocated)

5a. `lib/command/__tests__/CommandGiver.affordances.test.ts` — reuse
`TestGiver`/`InvProvider`/`EnvProvider` + PM mock from
`command-recency.test.ts`:
- accessor shape `{ command, source, bucket }`; buckets match stack.
- `'self'` → giver: self-entry `affordance.source === giver`, never `'self'`.
- item-afforded: move an `InvProvider` into inventory
  (`ContainmentApi.move`); its `ping` affordance `source === item`,
  `bucket === 'inventory'`.
- equivalence: `getAvailableCommands()` `toEqual`
  `getAffordances().map(a => a.command)` (order + identity).

5b. `lib/command/__tests__/CommandGiver.commandSource.test.ts` — drive
`executeCommand`, capture `context.commandSource` via a test-local
recording controller:
- normal innate: `commandSource === giver`.
- normal item-afforded: item contributing the dispatched verb via
  inventory bucket → `commandSource === item`.
- bound/programmatic: parser returning `{ bound }` (or programmatic
  dispatch) → `commandSource === giver`, not `undefined`.

5c. `obj/command/system/__tests__/AffordancesController.test.ts` —
mirror `ClearController.test.ts`; mint ctx via
`CommandApi.createCommandContext({ ..., commandSource })`:
- lists commands with per-command source attribution (innate→actor,
  item→item) — assert on composed scene MML.
- emits self-demonstration line from `ctx.commandSource`.
- innate vs item distinguished by source identity, not a tag (feed both
  kinds, assert distinct render).

Existing `command-recency.test.ts`, `command.test.ts`,
`CommandGiver.test.ts`, `command-schema-delivery.test.ts` must pass
unchanged (`getAvailableCommands` output byte-identical). Run
`pnpm --filter @saxonberg/server test`.

### Step 6 — doc graduation: `docs/subsystems/command-routing.md`

6a. § "Affordance attribution" (347) planned → shipped: drop
"(planned — source, not category)" from the heading; convert the two
bullets to present tense (the `getAffordances(): Affordance[]` accessor,
the `Affordance` record, `'self'`→giver resolution, the
`commandSource: Stuff` context field + giver fallback); mention the
`affordances` system verb; drop the "supersedes the slate / planned"
blockquote but **retain** the "no `via.kind`, nothing on
`CommandDefinition` (flyweight)" rationale.

6b. § `CommandContext` (132-158): add `commandSource: Stuff;` to the
documented interface block with a one-line gloss.

---

## Risks / resolutions

1. **Bound-path fallback** — not awkward: setting `commandSource: giver`
   on the single `outer` `createCommandContext` in `executeCommand`
   covers every fallback path; no special-casing in the bound branch.
2. **Order-equivalence** of the `getAvailableCommands` projection —
   guaranteed by construction; locked by the explicit `toEqual` test +
   existing recency/schema tests.
3. **`commandSource` required (non-optional)** — compiler enforces all
   `createCommandContext` call sites supply it; three production sites
   updated; stray test call sites get `commandSource: <giver>`
   (mechanical).
4. **Dispatch-test capture (5b)** — add a test-local recording
   controller / spy in the test file; no production fixture, no seed.

Scope unchanged: no new source kinds, no `via.kind`, no
`CommandDefinition` change, no new Api, no wire/schema change,
single-token verb, factory-constructed context.

### Critical files
- `packages/server/src/mud/lib/command/CommandGiver.ts`
- `packages/server/src/mud/api/command.ts`
- `packages/server/src/mud/obj/command/system/AffordancesController.ts`
- `packages/server/src/mud/obj/Avatar.ts`
- `docs/subsystems/command-routing.md`
