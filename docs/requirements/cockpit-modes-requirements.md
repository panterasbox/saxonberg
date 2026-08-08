# S3 — the last server surface before the client overhaul

The third and final server build of the client rebuild. S1 put *figures*
on the wire, S2 put *verbs* on the wire; S3 puts **the cockpit's own
shape** on the wire and closes the last read-surface gaps, so the client
overhaul can begin against a server that can already answer everything
it will ask.

Seeded by [client-slate § 4.3–4.4](../slates/builds/client-slate.md)
(Tracks C and D). Reads on
[cockpit-layouts](../subsystems/cockpit-layouts.md),
[inspection-pane](../subsystems/inspection-pane.md),
[mql-subscription](../subsystems/mql-subscription.md),
[connection](../subsystems/connection.md),
[advancement](../subsystems/advancement.md),
[wiki](../subsystems/wiki.md), [forums](../subsystems/forums.md),
[social-graph](../subsystems/social-graph.md).

> **The scope is smaller than the slate's table implies, and that is a
> finding, not a shortcut.** Three of its "not wired" rows are not gaps:
> S1 shipped standing (`playStanding` / `makeStanding` / `renown` /
> `practisingCompetence` are live `subscribableFields` on `Avatar`),
> traits are **deliberately** absent from the dashboard (the psychology
> decision — you cannot read yourself), and "fund" standing is the
> reserved-but-unbuilt `capital` stock, which is a subsystem, not a read
> surface. Verified against the code, not the table.

## Goals

- **The cockpit's arrangement gains a second axis**, server-authoritative
  and command-driven, so `one frame → modes → layouts → panes` becomes a
  real contract rather than a client convention.
- **A mode switch is a real command on the wire** — replayable,
  scriptable, attributable, visible to a stream overlay — preserving the
  shipped axiom that *the client owns zero command semantics*.
- **Panes are held by a condition, not by recency**, and the conditions
  are server-side facts.
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
  read yourself. `TraitLogic` already records the absence of a live
  consumer as deliberate.
- **The `capital` / "fund" stock.** Reserved in `InfluenceApi`, unbuilt.
  A standing subsystem of its own, not a projection.
- **Any change to how commands dispatch.** The mode axis rides the
  existing write → save → push triple.

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
client's own **"Views" menu already means layouts**
(`ViewsMenu.tsx` previews `layout <name>`).

**Decision: the verb is `cockpit <name>`, and the state key is
`cockpit.mode`.**

- It matches the keyspace it writes (`cockpit.layout`,
  `cockpit.inputModes`, `cockpit.watch` are all already `cockpit.*`).
- It is honestly **meta**, and the cockpit *is* meta — the interface,
  not the fiction. The jargon rule puts meta words on meta things; a
  diegetic-sounding name for a UI axis would be the actual mistake.
- `cockpit` with no argument reports the current mode + arrangement,
  matching how `mode` bare means "off" and `layout` bare reports.

⚠ **Runner-up, recorded because it may age better:** rename the
existing per-bar verb to `bar` (`bar chat gossip`, `bar off`) and free
`mode` for the cockpit axis. Rejected **for this build only** — it is a
rename of a shipped player-facing verb plus its `applyInputMode`
exemption, which is a migration, not a decision, and it does not need to
happen at the same time as the axis it would serve.

### 2. No per-player frame store

The client buffer remains the only copy of your own world frames.
Clearing site data destroys your history; a second device starts empty.

This is a **product decision, taken deliberately**: the things most
worth keeping already keep themselves. Chat channels, the press archive,
forums and the wiki all hold durable history of their own, so search has
real sources without inventing a personal one — and a personal frame
store brings a retention policy, a size cap, and a privacy surface
(*what is kept about you, for how long, who may read it*) that deserve
their own build rather than riding in on a search feature.

⚠ **The search surface must be shaped so this can change its mind.**
`SearchApi` takes a scope, and adding a `'mine'` scope later must not
reshape the call. See § 5.

### 3. Modes, and what a mode actually owns

Four modes ship: `world` · `study` · `classroom` · `tutor`.
Exported from `@saxonberg/types` as `CockpitMode` / `COCKPIT_MODES`,
following the `LAYOUT_NAMES` precedent **for the reason that precedent
exists**: the verb's validator and the client registry read one list, so
they cannot drift.

A mode owns:

| It owns | It does not own |
|---|---|
| Which arrangements are offered | What a pane renders |
| The default arrangement on entry | Any command's semantics |
| Which pane kinds may be summoned | Permission to run anything |

⚠ **A mode is a view, never a gate.** It must not become a place to hide
capability: everything runnable in `world` is runnable in `study`, and a
mode that forbade a verb would be a permission system wearing a UI
costume — with the permission checks in the wrong layer entirely. The
existing chain still decides.

**`LAYOUT_NAMES` becomes per-mode arrangements.** The five current
layouts are `world`'s arrangements; the other three modes ship one
arrangement each in this build. `layout <name>` stays the arrangement
verb and validates against *the active mode's* set.

⚠ Switching modes must **not** silently discard an arrangement choice.
A mode remembers the arrangement you last used in it, so
`cockpit study` → `cockpit world` returns you to the world arrangement
you left, not to a default.

### 4. Panes held by a condition

`InspectionPane`'s single slot becomes an N-pane set, and each pane's
lifetime is governed by a **hold condition** — *are they still here*,
*is it still in reach* — which are **server-side facts**, evaluated
server-side. A client guessing at them would be the same category error
as a client guessing at affordances.

Three conditions ship: `while-present` (the subject is in scope),
`while-reachable` (the subject is reachable), `pinned` (until dismissed).
A pane whose condition fails is **released, and the client is told why**
— a pane that vanishes without a reason reads as a bug.

⚠ Reuse the S1 subscription substrate; do not build a second one. The
per-`Interactive` registry, dep index and batched re-resolve already
exist ([mql-subscription.md](../subsystems/mql-subscription.md)); an
N-pane set is N subscriptions with a lifetime rule, not a new mechanism.

### 5. One search surface, scoped

`SearchApi.query({ scope, terms, limit })` over the durable sources:
`wiki` · `forum` · `chat` · `press` · `help`, plus `all`.

- **Reads existing storage.** The wiki keeps `wiki` + `wiki_revisions`;
  forums keep their tree and `forum_events`; chat and press keep their
  own history. No new collection, no index rebuild — this is projection
  work, which is the only reason it fits in a client cycle.
- **Results are viewer-filtered**, and filtering **deletes**: a wiki
  page or forum surface the viewer may not read is absent, not
  present-and-redacted. Same honest-fog rule the affordance resolver
  follows.
- Adding a `'mine'` scope later must not change the call shape (§ 2).

### 6. The competence digest

`practisingCompetence` ships one discipline — what you are working on
now. The digest is the whole projection: every discipline with a
`Competence` band, derived on read from `transcripts`, as a subscribable
field so the dashboard updates when a conferral lands.

⚠ **Derive-on-read, no stored total.** The band is already a derivation;
caching one here would be a second source of truth for a number the
ledger owns — the mistake the renown cache exists to *avoid* by being
explicitly rebuildable.

### 7. Notification policy read surface

`NotifyPolicy` / `NotifyRule` decide what reaches a player. The tray the
client will paint must show **what the receiver said they wanted**, not
everything that happened — so the read surface is the *policy*, not a
feed. Ships as a read on the existing rules plus the ping variants they
produce.

## Constraints

- **The write → save → push triple** is how `cockpit.layout` already
  commits; `cockpit.mode` follows it exactly. No new persistence path.
- **`clientState` keys are server-authoritative.** The client never
  writes one directly; it sends a command.
- Vocabulary arrays live in `@saxonberg/types` beside `LAYOUT_NAMES`, so
  validator and registry share one source.
- Apis are **per-subsystem**: search is a new subsystem face
  (`SearchApi`); the competence digest rides `AdvancementApi`; the mode
  axis rides the existing cockpit/shell surface. **Do not mint a
  per-feature Api.**
- Every new Api ends with `SecurityApi.decorateApiClass`.
- ⚠ **A "reference Idea" that nothing warms at boot reads null forever**
  — the recurring failure (Material, Condition, and CombatFormation,
  which is *still* broken). If modes or hold-conditions become catalogue
  rows, something must warm them at boot and a test must assert a cold
  read fails loudly rather than silently defaulting.

## Acceptance criteria

1. `cockpit <name>` sets `cockpit.mode`; bare `cockpit` reports mode +
   arrangement. Invalid name is refused by a validator reading
   `COCKPIT_MODES`.
2. `mode` (per-bar input scoping) is untouched — asserted by a test that
   both verbs coexist and that `applyInputMode`'s exemption still names
   the input-mode verb only.
3. `COCKPIT_MODES` / `CockpitMode` exported from `@saxonberg/types`; a
   test asserts the validator and the client registry read the same list.
4. `layout` validates against the **active mode's** arrangements; a
   layout valid in one mode and not another is refused with a reason.
5. Switching modes and switching back restores the arrangement last used
   in that mode. Tested.
6. A mode change round-trips as a command: it appears in the dispatch
   envelope and is attributable. **No client-side mode state exists** —
   asserted by a source scan of `packages/client` for local mode state.
7. ⚠ A mode gates nothing: a test asserts a verb runnable in `world` is
   runnable in every mode.
8. The pane set holds N panes, each with a hold condition; a pane whose
   condition fails is released **with a reason on the wire**. All three
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
    loudly — test asserts the failure, not a silent default.
15. Docs: `cockpit-layouts.md` rewritten for the two axes;
    `inspection-pane.md` for the pane set; a new `search.md`;
    `advancement.md` for the digest. `CLAUDE.md` gains one line for
    `search.md`.
16. Full suite green, both packages type-clean, the lint family green.
17. **Driven live**, not just tested: mode switch, arrangement recall,
    a pane released by its condition, and a search with a
    permission-filtered result.

## Cross-references

- Seeding slate: [client-slate § 4.3–4.4](../slates/builds/client-slate.md)
- Prior builds: **S1** (`0ed75f72`) — the facet + subscription substrate
  this build's panes and digest ride. **S2 MR A** (`403c2aa0`) — the
  topic taxonomy. **S2 MR B** (`c4ba12ba`) — the affordance resolver,
  whose honest-fog filtering rule § 5 follows.
- [cockpit-layouts](../subsystems/cockpit-layouts.md) ·
  [inspection-pane](../subsystems/inspection-pane.md) ·
  [mql-subscription](../subsystems/mql-subscription.md) ·
  [advancement](../subsystems/advancement.md) ·
  [social-graph](../subsystems/social-graph.md) ·
  [wiki](../subsystems/wiki.md) · [forums](../subsystems/forums.md)
