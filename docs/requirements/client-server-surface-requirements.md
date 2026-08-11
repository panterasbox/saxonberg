# The client-server surface — requirements

The last server build before the client overhaul. S1 put **figures** on
the wire, S2 put **verbs** on the wire; this build puts **the cockpit's
own shape** on the wire, closes the last read-surface gaps, and makes
the verb menu **honest** — so the client overhaul begins against a
server that can already answer everything it will ask, correctly.

Seeded by [client-slate](../slates/builds/client-slate.md) — Tracks
B–D (§ 4.2–4.4) for the work, and **§ 3.3, § 3.4 and § 6 for the
vocabulary**, which two earlier drafts of this document invented
instead of reading. Reads on
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
- **Wiki and forum content are searchable** through one surface, with
  a CLI verb — an Api with no verb would break the axiom on the one
  panel that advertises it.
- **Standing splits by level**: what the *person* does is account-level,
  what the *character* does is per-character.
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
  existing write → save → push triple, and § 9 adds validators to
  specs — neither touches the dispatch chain.
- **Rewriting controllers.** § 9 *extracts* a controller's existing
  refusal into a validator; it does not invent new refusals or change
  what any verb does when it runs.

## Surface decisions

### 1. ⭐⭐ One `cockpit` verb, four subcommands

The cockpit's controls had already scattered across **three** top-level
verbs that each grew independently:

- `layout <name>` — the screen's shape
- `style <sub> …` — appearance (and it already has a subcommand tree:
  `style show`, `style theme`, `style channel`)
- `mode <prefix>` — per-bar input scoping, writing `cockpit.inputModes`

Every one of them writes the `cockpit.*` keyspace. Adding a *fourth*
top-level verb for the new axis — the earlier proposal — would have
compounded the scatter rather than noticed it.

**The standing project rule applies and was missed: prefer
subcommands; a standalone verb is for a diegetic act.** A cockpit
control is the least diegetic thing in the game — it is the interface,
not the fiction.

**Decision: `cockpit` is the single host verb.**

```
cockpit mode watch            # the front door: what am I here to do
cockpit layout wide           # recall a saved arrangement in this mode
cockpit layout save wide      # name the current arrangement
cockpit scope chat gossip     # per-bar input scoping (was `mode`)
cockpit scope off
cockpit style theme high-contrast
cockpit                       # report everything
```

- **`layout` and `style` are removed as standalone verbs.** One name
  per thing. They are not kept as default aliases: the client dispatch
  sites that use them are being rewritten this cycle anyway, so this is
  the cheapest this change will ever be, and two names for one thing is
  a cost that never stops being paid.
- **`mode` is absorbed as `cockpit scope`.** It always wrote
  `cockpit.inputModes`; it was a cockpit concern wearing a top-level
  verb.

⭐ **The exemption becomes a rule instead of a special case.**
`CommandApi.applyInputMode` currently hardcodes the string literal
`'mode'` so that mode management always reaches the interpreter
un-prefixed. That literal becomes **`cockpit`**, and the rule it
expresses is finally sayable:

> **Interface control is not world input.** A bar scoped to a chat
> channel still steers its own cockpit.

This widens the exemption from one verb to one verb's subtree, and that
is correct — every subcommand under `cockpit` is interface control by
construction. A narrower exemption would mean a player who scoped a bar
to gossip could not un-scope it without the slash escape.

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

### 3. Modes are front doors; layouts demote beneath them

From [client-slate § 3.3](../slates/builds/client-slate.md), which is
the authority here — two earlier framings of this section were invented
rather than read, and both were wrong.

> **Modes** are the front doors — Chat, Play, Watch, and the Build /
> Govern ascent. They answer *what am I here to do*. **Layouts** demote
> to savable pane arrangements inside a mode. **Panes** are the shared
> bricks.

**Modes ship as `CockpitMode` / `COCKPIT_MODES` in `@saxonberg/types`**:
`chat` · `play` · `watch` · `build` · `govern`.

⚠ The slate writes the last two as *"the Build / Govern ascent"*, which
reads as one progression rather than two peers. They ship as two mode
values because a front door is a front door; if `govern` turns out to be
a tier *within* `build` rather than beside it, that is a vocabulary
edit, not a redesign. Flagged rather than silently resolved.

**Existing layout components map onto modes rather than being deleted**
— the slate is explicit that this is a mapping, not a rename:

| Existing layout | Becomes |
|---|---|
| `world` | `play`'s default layout |
| `livestream-viewer` · `streamer` | `watch`'s layouts |
| `builder` | `build`'s default layout |
| `forum` | `chat`'s default layout |

⚠⚠ **A layout is not a closed vocabulary.** The slate says *savable*
pane arrangements: a player composes and names one. So `cockpit layout`
cannot validate against a `LAYOUT_NAMES`-style frozen list the way the
current verb does — it resolves against **the mode's shipped defaults
plus that player's saved arrangements**. This is the single biggest
shape change in MR A, and the reason `LAYOUT_NAMES` is *replaced* by
per-mode defaults rather than promoted.

| A mode owns | A mode does not own |
|---|---|
| Which arrangements ship as defaults | What a pane renders |
| The default arrangement on entry | Any command's semantics |
| Which pane kinds may be summoned | Permission to run anything |

⚠ **A mode is a view, never a gate.** Everything runnable in `play` is
runnable in `build`. A mode that forbade a verb would be a permission
system wearing a UI costume, with the checks in the wrong layer.

⚠ **Persisted state migrates.** `cockpit.layout` holds one of the five
old values for every player who ever set one, and those values now name
a *mode* (via the table above) plus that mode's default arrangement.
The read path maps them on load. A test covers a real stored legacy
value, not just the fresh default — the fresh path passes either way and
proves nothing.

Switching modes must **not** discard an arrangement choice: a mode
remembers the arrangement last used in it.

### 4. Panes held by a condition

`InspectionPane`'s single slot becomes an N-pane set, each pane's
lifetime governed by a **hold condition** — *are they still here*, *is
it still in reach* — evaluated **server-side**, because they are facts
about the world. A client guessing at them is the same category error
as a client guessing at affordances.

**Five conditions ship**, from
[client-slate § 3.4](../slates/builds/client-slate.md):

| Hold | Held while | Released when |
|---|---|---|
| `unanswered` | it owes a reply | answered |
| `here` | you are here | you left |
| `present` | they are still in the room | they left |
| `inReach` | in reach | out of reach |
| `carried` | on you | not carried |

⭐ **`unanswered` is the one that matters most and the one an earlier
draft of this document omitted.** The slate's claim is *"nothing that
is still actionable ever leaves"* — a prompt or a question that owes a
reply outranks presence entirely, and without it the pane feed is just
a longer version of the race the single slot loses today.

A **manual pin overrides the decision either way** — pin to keep a pane
whose condition has lapsed, dismiss one whose condition still holds.
Pinning is not a sixth condition; it is an override on the other five.

A pane whose condition fails is **released, and the client is told why**
— a pane that vanishes without a reason reads as a bug.

⚠ Reuse the S1 subscription substrate. An N-pane set is N subscriptions
with a lifetime rule, not a new mechanism.

### 5. One search surface, scoped — and its verb is `recall`

⚠ **The earlier draft specified an Api and no verb**, which would have
broken the axiom on the surface that advertises it: every click sends a
command, so a search UI with no command behind it is the one panel that
cannot show you what it just ran.

**`search` is unavailable** — it is the in-world perception verb
(finding a concealed thing in a room). The slate resolves this: *"this
wants its own word. `recall` is free."*

```
recall wiki compact           # one scope
recall "iron price"           # all scopes
```

`RecallController` dispatches to
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

### 8. ⚠ `makeStanding` is per-character and should not be

[client-slate § 6](../slates/builds/client-slate.md) lists this as a
rule worth keeping, and it is not currently true:

> **Standing splits by level, and it is load-bearing.** *Make* (you
> build) and *Fund* (you pay) are things the **person** does →
> account-level. *Play* accrues by living in the world → per-character,
> and the only standing that can diverge across characters of one
> account.

Verified in code: `Avatar.ts` keys **all four** standing figures on
`standingSubject(stuff, viewer)` — the Avatar's `templatePath`. So
`makeStanding` diverges per character today, which the design says is
meaningless: there is no reason to author as one character.

**This build makes `makeStanding` account-level.** `playStanding` and
`renown` stay per-character, which is the whole point of the split.

⚠ **The subject key changes, so the ledger's history is at stake.**
`producer_events` rows were written against a character key. Re-keying
them is a migration with a wrong answer available (silently dropping
the history of anyone whose account has more than one character), so
the read path aggregates across the account's characters rather than
rewriting the ledger. Derive-on-read is what makes that possible — the
same property § 6 relies on.

⚠ "Fund" is the reserved-but-unbuilt `capital` stock and stays out of
scope; only `make` moves here.

### 9. ⭐⭐ Affordance honesty — the verb menu stops lying

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

### 10. ⚠⚠ The character-select roster is starved

Found by walking the handoff's 23 screens rather than trusting its own
16-row audit — which lists only *"the practice record"* here, and
understates the gap by five rows.

`Character Select.dc.html` is client **wave 2**, the launch path and the
first substantive thing a stranger sees. `Login.presentRoster` emits
`CharGenRosterEntry` = `playerId` · `name` · `species` · `description`.
The screen needs:

| The screen shows | Server today |
|---|---|
| play standing per character | shipped in S1 — but on `Avatar`, and **at Login you are not embodied** |
| `lastSeen` | **nothing.** Zero hits for `lastSeen` / `lastPlayed` / `lastLogin` |
| where you left them | Avatar location persists; readable |
| "Since you left" digest | **nothing**, and it depends on `lastSeen` existing first |
| the practice record | data exists (`bandsFor` / `entriesFor`), not on the roster |
| Retired / Restore | **no character retirement exists** — deferred, see below |

⭐ **The structural point: at Login you are not embodied.** Every one of
these is readable *in session* through a surface that already exists,
and none of them is reachable from the character-select screen, because
the reader has no character yet. So this is not "add a field" — it is
the recognition that the roster is the **one payload that must carry
what is elsewhere a subscription**.

**This build ships:**

1. **`lastSeen`** — a timestamp stamped on logout. It is the cheap one
   and the prerequisite for the digest.
2. **An enriched roster** — play standing, where you left them, and the
   practice record, on `CharGenRosterEntry`.
3. **The "Since you left" digest** — derived across the ledgers, scoped
   to one character, since its `lastSeen`. ⚠ Derive-on-read like every
   other projection here; **no away-log collection**. A stored digest
   would be a second source of truth for events the ledgers already own,
   and it would need a retention policy nobody has decided.

⚠ **Character retirement is deferred and is NOT a projection.** Retire /
restore is a lifecycle question — what *is* a retired character: still
in the world, a shade, gone? — and that belongs with
[mortality.md](../subsystems/mortality.md), not in a read-surface
build. The client hatches it, which is precisely what the
unbuilt-state convention exists for.

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

1. `cockpit mode <name>` sets `cockpit.mode`; bare `cockpit` reports
   mode + arrangement + scope + style. An invalid name is refused by a
   validator reading `COCKPIT_MODES`.
2. **`layout` and `style` no longer resolve as standalone verbs**, and
   `mode` no longer resolves at all — asserted by a test, not by
   absence of a file. Their behaviour is reachable as
   `cockpit layout` / `cockpit style` / `cockpit scope`, with the full
   `style` subcommand tree intact.
3. ⭐ **`applyInputMode` exempts `cockpit`, not `mode`.** A test asserts
   a bar scoped to a channel can still run every `cockpit` subcommand
   un-prefixed, *and* that an ordinary verb typed in that bar is still
   prefixed. Both directions — the second is what makes it an exemption
   rather than a hole.
4. `COCKPIT_MODES` / `CockpitMode` exported from `@saxonberg/types`
   with the slate's front doors — `chat` · `play` · `watch` · `build` ·
   `govern`; a test asserts validator and client registry read the same
   list.
5. ⚠ **A legacy `cockpit.layout` value maps to a mode AND an
   arrangement** — tested with real stored values, not a fresh default
   (which passes either way). ⭐ `livestream-viewer` and `streamer` are
   the case that matters: two legacy values collapsing into `watch`
   with *different* arrangements. A test covering only `builder` misses
   it.
6. `cockpit layout <name>` resolves against **the active mode's
   shipped defaults plus this player's saved arrangements** — not a
   frozen list. `cockpit layout save` names the current arrangement; an
   arrangement valid in another mode is refused with a reason naming
   that mode. A player-supplied name never silently shadows a shipped
   default.
7. Switching modes and back restores the arrangement last used in that
   mode. Tested.
8. A mode change round-trips as a command and is attributable. **No
   client-side mode state exists** — asserted by a source scan.
9. ⚠ A mode gates nothing: a test asserts a verb runnable in `play` is
   runnable in every mode.
10. The pane set holds N panes, each with a hold condition; a failing
   condition **releases the pane with a reason on the wire**. **All
   five** tested — `unanswered` · `here` · `present` · `inReach` ·
   `carried` — including the release path, plus a manual pin overriding
   in **both** directions (keeping a lapsed pane, dismissing a held
   one).
11. Pane subscriptions reuse the S1 substrate — asserted by the absence
   of a second registry.
12. The **`recall` verb** dispatches to `SearchApi.query` and returns
   results across all five scopes and `all`. A test asserts `search`
   still resolves to the in-world perception verb, unshadowed.
13. A source the viewer may not read is **absent** from results, both
    directions tested.
14. The competence digest is a subscribable field, derives on read, and
    updates when a conferral lands. No stored total.
15. The notification-policy read returns the receiver's rules and their
    ping variants.
16. ⚠ **`makeStanding` is account-level**, `playStanding` and `renown`
   stay per-character — a test asserts two characters on one account
   report the SAME make standing and DIFFERENT play standing. That
   second half is what proves the split is real rather than a global.
   `producer_events` is **not** re-keyed; the read aggregates.
17. **`lastSeen` is stamped on logout**, and the character-select
   roster carries play standing, last location and the practice record
   — asserted against `CharGenRosterEntry`, not against an in-session
   read, because at Login the reader has no character.
18. **The "Since you left" digest** returns events scoped to one
   character since its `lastSeen`, derived on read. ⚠ A test asserts
   **no away-log collection exists** — the ledgers are the source.
19. Anything catalogue-shaped is warmed at boot, and a cold read fails
    loudly — the test asserts the failure, not a silent default.
20. **Every object-typed arg either carries a semantic validator or
    declares `targetKind: any`.** A repeatable script reports the set
    and gates in CI, the way `lint:test-bootstrap` does.
21. **No validator invents a refusal.** For each new validator, a test
    asserts the *controller* refuses exactly the cases the validator
    excludes — the shared-predicate constraint of § 9, tested rather
    than asserted in a comment.
22. ⚠ **No verb loses availability it had.** A before/after comparison
    of the resolved candidate set over a representative world shows
    verbs only ever moving `enabled → disabled-with-reason` for targets
    the controller would have refused anyway. Under-reporting is a
    build failure.
23. `attack` / `drink` / `talk` / `cast` are no longer offered on a
    room — the four cases S2 recorded as open, closed by name.
24. Docs: `cockpit-layouts.md` rewritten for the two axes;
    `inspection-pane.md` for the pane set; a new `search.md`;
    `advancement.md` for the digest; `command-routing.md` +
    `command-spec.md` for the validator rule and `targetKind: any`.
    `CLAUDE.md` gains **one line** for `search.md`.
25. Full suite green, both packages type-clean, the lint family green.
26. **Driven live**, not just tested: a mode switch, arrangement recall,
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
  whose syntactic candidate set § 9 completes and whose honest-fog rule
  § 5 follows.
- [command-routing](../subsystems/command-routing.md) ·
  [command-spec](../subsystems/command-spec.md) ·
  [cockpit-layouts](../subsystems/cockpit-layouts.md) ·
  [inspection-pane](../subsystems/inspection-pane.md) ·
  [mql-subscription](../subsystems/mql-subscription.md) ·
  [advancement](../subsystems/advancement.md) ·
  [social-graph](../subsystems/social-graph.md) ·
  [wiki](../subsystems/wiki.md) · [forums](../subsystems/forums.md)
