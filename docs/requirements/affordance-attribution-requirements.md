# Affordance attribution — requirements

The per-giver recency stack already records, for every command an actor
can run, the **source** that afforded it (`RecencyEntry.source` — the
giver itself for innate verbs, or a Stuff in inventory / environment /
peers). But that attribution is thrown away before anything can read
it: `getAvailableCommands()` flattens the stack to a bare
`CommandDefinition[]`, and the dispatch match carries only the matched
definition onto `CommandContext`, not the entry it came from. This
build exposes the attribution that already exists — as standing,
queryable state on the giver and as a field on the dispatch context —
so a consumer can answer "what can I do, and what grants me each
ability" and a controller can read the object that afforded the verb it
is executing.

This is the realization of
[command-routing.md § Affordance attribution](../subsystems/command-routing.md)
(the design note that superseded the retired verb-provisioning slate).
The load-bearing claim from that note holds: **the source object is the
discriminator** — there is no provisioning-category enum (`via.kind`),
and nothing is added to `CommandDefinition` (a load-once shared
flyweight). New kinds of source (a future skill, implant, or potion)
are pure additions that land through the existing `pushCommandSource`
seam and inspect their own object state; this build adds none of them.

## Goals

- The affording source of every available command is **readable as
  standing state** on a `CommandGiver` — queryable with no command in
  flight (the basis for a "what can I do / why can I do this"
  inspector, a capability panel, or an NPC reasoning about its own kit).
- Each affordance record pairs a command with the **resolved source
  object** (a `Stuff`) and its `bucket`. When the source is the giver
  itself (innate, `RecencyEntry.source === 'self'`), the record's
  source is the giver instance — every record's source is a concrete
  `Stuff`, never the `'self'` sentinel.
- The **affording source of the executing command** is readable from
  `CommandContext` during controller execution, so a controller can
  inspect the object that granted its verb (the seam a future
  source-aware controller renders through).
- A **live consumer** exercises both seams end-to-end: a server-only,
  single-token introspection verb that lists the actor's available
  commands annotated by affording source and, in its own controller,
  reads its `CommandContext` source to self-demonstrate the threading.
- `getAvailableCommands()` and the existing dispatch behaviour are
  **unchanged** from the outside; the new surfaces are additive.

## Non-goals

- **No new source kinds.** No skill, implant, consumable-buff, or
  ambient-effect provisioning paths. Those are future builds (skills /
  cybernetics / potions) that each add a source object inspecting its
  own state; they land through the existing `pushCommandSource` seam.
  This build only surfaces attribution for the source kinds that
  already exist (innate `self`; items via inventory / environment /
  peers, e.g. the `Scryable` instrument seam).
- **No `via.kind` / provisioning-category taxonomy.** The source
  object's type is the discriminator. No enum, no registry of kinds.
- **No change to `CommandDefinition`.** It is a load-once shared
  flyweight; per-source state cannot and does not live on it.
- **No per-source prose variation in existing controllers.** No
  shipped controller changes its output based on the affording source
  in this build (none has a second source to distinguish yet). The
  seam exists; the first real consumer of *source-varied rendering*
  rides the first second-path build.
- **No client / wire change.** The `system.commands.{added,removed,
  reset}` schema payloads are untouched; no source attribution on the
  wire, no client capability view. (The wire-payload option was
  explicitly not chosen.)
- **No `CapabilitiesChangedEvent` / MQL `capabilities` projector.**
  Deferred to the mql-subscription tail
  ([mql-subscription-slate.md](../slates/tails/mql-subscription-slate.md)).
- **No new conflict-resolution for multi-source same-verb.** When two
  sources afford the same verb, the existing newest-first recency walk
  and chain-of-responsibility ordering stand; the claiming match's own
  source is the one threaded. No chooser, no `via meter` disambiguation
  syntax.

## Surface decisions

### The affordance record

A small value pairing a command with its resolved source and bucket —
working shape:

```ts
interface Affordance {
  command: CommandDefinition;
  source: Stuff;            // resolved: the giver itself for innate ('self')
  bucket: RecencyBucket;    // 'self' | 'inventory' | 'environment' | 'peers'
}
```

`source` is always a concrete `Stuff`. The accessor resolves the
`'self'` sentinel to the giver instance so every consumer sees "an
object that afforded this," uniformly. `bucket` rides along as a
descriptive hint (where the source flowed from); nothing is required to
branch on it.

### The introspection accessor

A method on `CommandGiverMixin`, sibling to `getAvailableCommands()`,
returning the same newest-first recency walk **with** each command's
`(source, bucket)` preserved instead of discarded (working name
`getAffordances(): Affordance[]`). It is standing state: it depends
only on the current stack, not on any command being in flight.

`getAvailableCommands()` keeps its exact current signature and
observable behaviour. It may be reimplemented as a projection of the
new accessor (`getAffordances().map((a) => a.command)`) — the planner's
call — but nothing about its output changes.

### Source on `CommandContext`

`CommandContext` gains a field carrying the affording source of the
executing command (working name `commandSource: Stuff`), populated by
the dispatcher from the claiming match's affordance record, resolved to
the giver for innate verbs (same `'self'` → giver resolution as the
accessor).

On dispatch paths where the contextual match step does not run — the
LLM-parser `bound` short-circuit and programmatic/cascaded dispatch —
`commandSource` falls back to the giver. This is correct for innate
verbs and acceptable as a default for the others, since no current
consumer reads `commandSource` on the bound path; precise item
attribution there is out of scope.

### The consumer — an introspection verb

A single-token, server-only verb — `affordances` — in the `system`
command category, available to every actor (ungated — it is the "what
can I do / why can I do this" inspector). Its controller:

1. reads `commandGiver.getAffordances()` and lists each available
   command annotated with its affording source's display name — innate
   commands attributed to the actor itself, item-afforded commands to
   the granting item; and
2. reads its own `ctx.commandSource` to print a self-demonstrating line
   (this very command was afforded by the actor, innate), proving the
   threading is wired.

Output renders source identity through the host's current display
surface (`DescribeApi.getDisplayName` today; migrates with recognition
wave-0 — do not extend `DescribeApi`). Exact output formatting is a
build detail.

### Source-type is the discriminator (no enum)

Reaffirmed as a constraint on the consumer and any future reader: vary
behaviour by inspecting the source object (its type / mixins / state),
never a category tag. The consumer distinguishes "innate vs item" by
comparing the source to the giver, not by a `kind` field.

## Constraints

- **Inter-Stuff contract.** The accessor and `commandSource` hand back
  `Stuff` references; consumers read identity/state through the source's
  method surface (`getDisplayName` / future `getPresentation`), never
  field access. (CLAUDE.md § Inter-Stuff Contract.)
- **No new Api.** The accessor is a `CommandGiverMixin` method; the
  consumer is a controller + YAML view. No `XApi` is introduced.
  (memory: no-new-apis-default, no-premature-registries.)
- **`CommandContext` is constructed via
  `CommandApi.createCommandContext`.** The new field is set through the
  factory, not a direct constructor call. (CLAUDE.md § Go Through the
  API Layer.)
- **Single-token verb.** The consumer verb is one token; no two-word
  verbs. (memory: no-two-word-verbs.)
- **Substrate categorization.** The accessor lives with the command
  subsystem (`lib/command/`); the verb's controller in
  `obj/command/system/`, its view in `mud/cmd/system/`.
- **Performance.** The accessor is O(stack depth), identical to
  `getAvailableCommands()`; no added cost on the hot dispatch path
  beyond carrying one already-known reference onto the context.

## Acceptance criteria

- A `CommandGiver` exposes a source-preserving accessor returning each
  available command with a resolved `Stuff` source and its bucket;
  innate (`'self'`) records resolve to the giver instance.
- `getAvailableCommands()` returns exactly what it did before (covered
  by existing tests still passing, plus an explicit equivalence check
  against the new accessor's projection).
- After a normal dispatch, the executing controller's
  `CommandContext` exposes the affording source: the giver for an
  innate verb, the granting item for an item-afforded verb (tested via
  an item that contributes a verb through `pushCommandSource`, e.g. a
  `Scryable`-style instrument fixture).
- On the bound / programmatic dispatch path, `commandSource` is the
  giver (documented fallback), not undefined.
- The introspection verb is dispatchable by an ordinary actor, lists
  available commands with per-command source attribution, and emits the
  self-demonstrating line sourced from `ctx.commandSource`.
- Tests cover: accessor source/bucket shape, `'self'` → giver
  resolution, item-afforded attribution, `getAvailableCommands`
  equivalence, `commandSource` on the normal and bound paths, and the
  verb's listing + self-demonstration.
- [command-routing.md § Affordance attribution](../subsystems/command-routing.md)
  is graduated from "planned" to shipped: it documents the accessor,
  the `Affordance` record, the `CommandContext` field, the `'self'` →
  giver resolution, and the introspection verb — and drops the
  "supersedes the slate / planned" framing in favour of present-tense
  behaviour (retaining the "no `via.kind`, no `CommandDefinition`
  change" rationale).

## Cross-references

- **Design note (seeding):**
  [command-routing.md § Affordance attribution](../subsystems/command-routing.md)
  — supersedes the retired verb-provisioning slate.
- **Subsystem docs:**
  [command-routing.md](../subsystems/command-routing.md) (recency
  stack, `CommandContext`, dispatch chain),
  [command-spec.md](../subsystems/command-spec.md) (adding the
  consumer verb),
  [perceiver.md](../subsystems/perceiver.md) (innate path; `Scryable`
  instrument seam used as the item-afforded test fixture shape).
- **Future consumers (non-goals here):**
  [mql-subscription-slate.md](../slates/tails/mql-subscription-slate.md)
  (`CapabilitiesChangedEvent` + capabilities projector),
  [recognition-slate.md](../slates/builds/recognition-slate.md) /
  [identification-slate.md](../slates/builds/identification-slate.md)
  (source-varied rendering of inspection verbs),
  [augmentation-slate.md](../slates/tails/augmentation-slate.md),
  [senses-slate.md](../slates/tails/senses-slate.md) (skills/augments
  as future affordance sources).
