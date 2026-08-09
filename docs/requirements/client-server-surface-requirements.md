# The client-server surface — requirements

The last server build before the client overhaul. S1 put **figures** on
the wire, S2 put **verbs** on the wire; this build puts **the cockpit's
own shape** on the wire, closes the last read-surface gaps, and makes
the verb menu **honest** — so the client overhaul begins against a
server that can already answer everything it will ask, correctly.

Seeded by [client-slate § 4.2–4.4](../slates/builds/client-slate.md)
(Tracks B–D). Reads on
[cockpit-layouts](../subsystems/cockpit-layouts.md),
[inspection-pane](../subsystems/inspection-pane.md),
[mql-subscription](../subsystems/mql-subscription.md),
[command-routing](../subsystems/command-routing.md),
[command-spec](../subsystems/command-spec.md),
[advancement](../subsystems/advancement.md),
[wiki](../subsystems/wiki.md), [forums](../subsystems/forums.md),
[social-graph](../subsystems/social-graph.md).

> **The slate's Track C table is stale in our favour, and that is a
> finding, not a shortcut.** Verified against the code: S1 shipped
> standing (`playStanding` / `makeStanding` / `renown` /
> `practisingCompetence` are live `subscribableFields` on `Avatar`);
> S2 MR A shipped the five topic **facets** (`address` · `actor` ·
> `weight` · `audience` · `durable`, plus `affordance`) the table still
> lists as missing; traits are **deliberately** absent from the
> dashboard (the psychology decision — you cannot read yourself); and
> "fund" standing is the reserved-but-unbuilt `capital` stock, a
> subsystem rather than a read surface.

## Goals

- **The cockpit's arrangement gains a second axis**, server-authoritative
  and command-driven, so `one frame → modes → layouts → panes` becomes a
  real contract rather than a client convention.
- **A mode switch is a real command on the wire** — replayable,
  scriptable, attributable, visible to a stream overlay — preserving the
  shipped axiom that *the client owns zero command semantics*.
- **Panes are held by a condition, not by recency**, and the conditions
  are server-side facts.
- **The verb menu stops lying.** A verb offered against a target it
  cannot act on is the server sending a figure that is not true.
- **The competence digest is readable** — the whole transcript
  projection, not just the one discipline being practised.
- **Wiki and forum content are searchable** through one surface.
- **A viewer can read their own notification policy** and the ping
  variants it produces.

## Non-goals

- **The client overhaul itself.** Every wave of it. This build ends when
  the server can answer; painting is a separate cycle.
- **A per-player frame store.** Decided against for now (§ 2). The
  client buffer stays the only copy of your own world frames.
- **Durable clips + attestation.** Deferred by the handoff and it should
  stay deferred — see [attestation-slate](../slates/builds/attestation-slate.md).
- **Traits on the standing dashboard.** Decided against, and the
  decision is load-bearing: *disclosure is discovery*, and you cannot
  read yourself.
- **The `capital` / "fund" stock.** Reserved in `InfluenceApi`, unbuilt.
- **Any change to how commands dispatch.** The mode axis rides the
  existing write → save → push triple, and § 8 adds validators to
  specs — neither touches the dispatch chain.
- **Rewriting controllers.** § 8 *extracts* a controller's existing
  refusal into a validator; it does not invent new refusals or change
  what any verb does when it runs.

## Surface decisions

### 1. ⚠⚠ The verb cannot be called `mode`

**`mode` is already taken**, and not incidentally: it is the per-bar
input-scoping verb (`mode chat gossip`, `mode off`, `--bar <id>`), and
it is **hardcoded as an exemption inside `CommandApi.applyInputMode`**
so that mode management always reaches the interpreter un-prefixed.
Overloading it would put the one verb that escapes input-moding in
charge of a second, unrelated axis.

Adjacent names are also taken: `layout` is the arrangement verb,
`focus` is the focus chain, `workspace` is the shell cwd, and the
client's own **"Views" menu already means layouts**.

**Decision: the verb is `cockpit <name>`, and the state key is
`cockpit.mode`.** It matches the keyspace it writes (`cockpit.layout`,
`cockpit.inputModes`, `cockpit.watch`), and it is honestly **meta** —
the cockpit *is* the interface, not the fiction. `cockpit` bare reports
the current mode + arrangement.

⚠ **Runner-up, recorded because it may age better:** rename the
per-bar verb to `bar` and free `mode`. Rejected **for this build only**
— a rename of a shipped player-facing verb plus its `applyInputMode`
exemption is a migration, not a decision.

### 2. No per-player frame store

The client buffer remains the only copy of your own world frames.

Taken deliberately: the things most worth keeping already keep
themselves — chat channels, the press archive, forums and the wiki all
hold durable history, so search has real sources without inventing a
personal one. A personal frame store brings a retention policy, a size
cap, and a privacy surface that deserve their own build.

⚠ **The search surface must be shaped so this can change its mind.**
`SearchApi` takes a scope, and adding a `'mine'` scope later must not
reshape the call.

### 3. Modes, and what a mode actually owns

Four modes ship: `world` · `study` · `classroom` · `tutor`.
Exported from `@saxonberg/types` as `CockpitMode` / `COCKPIT_MODES`,
following the `LAYOUT_NAMES` precedent **for the reason that precedent
exists**: the verb's validator and the client registry read one list.

| A mode owns | A mode does not own |
|---|---|
| Which arrangements are offered | What a pane renders |
| The default arrangement on entry | Any command's semantics |
| Which pane kinds may be summoned | Permission to run anything |

⚠ **A mode is a view, never a gate.** Everything runnable in `world` is
runnable in `study`. A mode that forbade a verb would be a permission
system wearing a UI costume, with the checks in the wrong layer.

**`LAYOUT_NAMES` becomes per-mode arrangements.** The five current
layouts are `world`'s; the other three modes ship one each. `layout`
stays the arrangement verb and validates against the *active mode's*
set. Switching modes must **not** discard an arrangement choice: a mode
remembers the arrangement last used in it.

### 4. Panes held by a condition

`InspectionPane`'s single slot becomes an N-pane set, each pane's
lifetime governed by a **hold condition** — *are they still here*, *is
it still in reach* — evaluated **server-side**, because they are facts
about the world. A client guessing at them is the same category error
as a client guessing at affordances.

Three conditions ship: `while-present`, `while-reachable`, `pinned`.
A pane whose condition fails is **released, and the client is told why**
— a pane that vanishes without a reason reads as a bug.

⚠ Reuse the S1 subscription substrate. An N-pane set is N subscriptions
with a lifetime rule, not a new mechanism.

### 5. One search surface, scoped

`SearchApi.query({ scope, terms, limit })` over the durable sources:
`wiki` · `forum` · `chat` · `press` · `help`, plus `all`.

- **Reads existing storage.** No new collection, no index rebuild —
  projection work, which is the only reason it fits in a client cycle.
- **Results are viewer-filtered, and filtering DELETES**: an unreadable
  source is absent, not present-and-redacted. The honest-fog rule S2's
  resolver established.
- Adding `'mine'` later must not change the call shape (§ 2).

### 6. The competence digest

`practisingCompetence` ships one discipline. The digest is the whole
projection: every discipline with a `Competence` band, derived on read
from `transcripts`, as a subscribable field.

⚠ **Derive-on-read, no stored total.** The band is already a
derivation; caching one here would be a second source of truth for a
number the ledger owns.

### 7. Notification policy read surface

The tray the client paints must show **what the receiver said they
wanted**, not everything that happened — so the read surface is the
*policy* (`NotifyPolicy` / `NotifyRule`) plus the ping variants it
produces, not a feed.

### 8. ⭐⭐ Affordance honesty — the verb menu stops lying

S2's resolver is **syntactic by design**: a verb is `enabled` when its
operand binds and its field validators pass. A verb whose real refusal
lives in its **controller** therefore reports `enabled` against targets
it cannot act on — live today: `attack`, `drink`, `talk`, `cast` all
offered on a room.

Measured, not estimated: **112 object-typed args across the command
tree; 24 carry a semantic kind validator; 88 do not** — 16 in crafting,
12 perception, 11 bulk, 10 movement, 8 device, 8 inventory, and the
rest scattered across nine more categories.

This is the most visible surface in the redesign. The slate's governing
rule is *never render a figure the server did not send*; a menu
asserting `attack` on a chair is precisely a wrong figure, and the
client cannot filter it without re-deriving semantics it is forbidden
to own.

**The fix is a field validator per arg** — and
[command-routing.md](../subsystems/command-routing.md) says explicitly
**not** to fix it with a verb-suits-target table in the resolver. A
table would be a second description of what the specs already know: the
same mistake § 6.3 of the handoff makes and this project has now
refused twice.

⚠⚠ **The governing constraint: the validator and the controller must
share ONE predicate.** A validator that re-states a controller's guard
in different words is a second source of truth that will drift, and
drift here is invisible — the menu says yes, the verb says no. Each
validator is **extracted from the controller's actual refusal**, and
the controller then uses that same predicate (or drops its now-dead
check). Nothing is invented.

⚠ **A wrong validator is worse than a missing one.** Over-reporting
offers a verb that then refuses with a reason; under-reporting hides a
verb that would have worked, and the player has no way to discover it.
So the sweep is conservative: where a controller's refusal cannot be
expressed as a property of the target alone, the arg stays unvalidated
and **says so**.

**Genuinely unconstrained args are declared, not omitted.** A wizard's
`destruct <anything>` has no kind constraint by design. Those declare
it at the site (`targetKind: any` in the spec) rather than sitting in a
central exemption list — the marker is the record, the way `@hook` is.
A gate can then tell *declared universal* from *forgotten*.

## Constraints

- **The write → save → push triple** is how `cockpit.layout` already
  commits; `cockpit.mode` follows it exactly.
- **`clientState` keys are server-authoritative.** The client never
  writes one; it sends a command.
- Vocabulary arrays live in `@saxonberg/types` beside `LAYOUT_NAMES`.
- Apis are **per-subsystem**: search is a new subsystem face
  (`SearchApi`); the digest rides `AdvancementApi`; the mode axis rides
  the cockpit/shell surface. **Do not mint a per-feature Api.**
- Field validators live in `lib/command/validators/` and are **shared**
  — a new validator that duplicates an existing one is a defect.
- Every new Api ends with `SecurityApi.decorateApiClass`.
- ⚠ **A "reference Idea" that nothing warms at boot reads null forever**
  — the recurring failure (Material, Condition, and CombatFormation,
  which is *still* broken). Anything catalogue-shaped must be warmed at
  boot, with a test asserting a cold read fails **loudly**.

## Acceptance criteria

1. `cockpit <name>` sets `cockpit.mode`; bare `cockpit` reports mode +
   arrangement. An invalid name is refused by a validator reading
   `COCKPIT_MODES`.
2. `mode` (per-bar input scoping) is untouched — asserted by a test that
   both verbs coexist and that `applyInputMode`'s exemption still names
   the input-mode verb only.
3. `COCKPIT_MODES` / `CockpitMode` exported from `@saxonberg/types`; a
   test asserts validator and client registry read the same list.
4. `layout` validates against the **active mode's** arrangements; a
   layout valid in one mode and not another is refused with a reason.
5. Switching modes and back restores the arrangement last used in that
   mode. Tested.
6. A mode change round-trips as a command and is attributable. **No
   client-side mode state exists** — asserted by a source scan.
7. ⚠ A mode gates nothing: a test asserts a verb runnable in `world` is
   runnable in every mode.
8. The pane set holds N panes, each with a hold condition; a failing
   condition **releases the pane with a reason on the wire**. All three
   conditions tested, including the release path.
9. Pane subscriptions reuse the S1 substrate — asserted by the absence
   of a second registry.
10. `SearchApi.query` returns results across all five scopes and `all`.
11. A source the viewer may not read is **absent** from results, both
    directions tested.
12. The competence digest is a subscribable field, derives on read, and
    updates when a conferral lands. No stored total.
13. The notification-policy read returns the receiver's rules and their
    ping variants.
14. Anything catalogue-shaped is warmed at boot, and a cold read fails
    loudly — the test asserts the failure, not a silent default.
15. **Every object-typed arg either carries a semantic validator or
    declares `targetKind: any`.** A repeatable script reports the set
    and gates in CI, the way `lint:test-bootstrap` does.
16. **No validator invents a refusal.** For each new validator, a test
    asserts the *controller* refuses exactly the cases the validator
    excludes — the shared-predicate constraint of § 8, tested rather
    than asserted in a comment.
17. ⚠ **No verb loses availability it had.** A before/after comparison
    of the resolved candidate set over a representative world shows
    verbs only ever moving `enabled → disabled-with-reason` for targets
    the controller would have refused anyway. Under-reporting is a
    build failure.
18. `attack` / `drink` / `talk` / `cast` are no longer offered on a
    room — the four cases S2 recorded as open, closed by name.
19. Docs: `cockpit-layouts.md` rewritten for the two axes;
    `inspection-pane.md` for the pane set; a new `search.md`;
    `advancement.md` for the digest; `command-routing.md` +
    `command-spec.md` for the validator rule and `targetKind: any`.
    `CLAUDE.md` gains **one line** for `search.md`.
20. Full suite green, both packages type-clean, the lint family green.
21. **Driven live**, not just tested: a mode switch, arrangement recall,
    a pane released by its condition, a permission-filtered search, and
    a verb menu on a room that no longer offers `attack`.

## Resolved while scoping

Two of the slate's § 8 open questions are answered here from the code,
rather than left for the client cycle to trip over:

- **Should `communicative` join the facets and go on the wire? No.** It
  is a **renown reception gate** consulted on the message hot path by
  `SensorMixin.onMessage` — it decides whether hearing something earns
  renown, not how anything renders. Putting it on the wire would invite
  a client to branch on it and turn a scoring rule into a display rule.
- **Does the measurement channel list duplicate the topic tree? No,
  not any more.** S2's collapse made the tree *subject matter* and the
  facets *everything else*, so `MEASURE_CHANNELS` (an instrument
  vocabulary) and the topic roots are deliberately different lists.
  ⚠ One stale reference survives: `QuantityMarkupOptions.channel` still
  documents itself as sharing a vocabulary with the `world.measure.*`
  topic family, which S2 retired. Fixed in passing.

## Cross-references

- Seeding slate: [client-slate § 4.2–4.4](../slates/builds/client-slate.md)
- Prior builds: **S1** (`0ed75f72`) — the facet + subscription substrate
  the panes and digest ride. **S2 MR A** (`403c2aa0`) — the topic
  corpus + facets. **S2 MR B** (`c4ba12ba`) — the affordance resolver,
  whose syntactic candidate set § 8 completes and whose honest-fog rule
  § 5 follows.
- [command-routing](../subsystems/command-routing.md) ·
  [command-spec](../subsystems/command-spec.md) ·
  [cockpit-layouts](../subsystems/cockpit-layouts.md) ·
  [inspection-pane](../subsystems/inspection-pane.md) ·
  [mql-subscription](../subsystems/mql-subscription.md) ·
  [advancement](../subsystems/advancement.md) ·
  [social-graph](../subsystems/social-graph.md) ·
  [wiki](../subsystems/wiki.md) · [forums](../subsystems/forums.md)
