# Renown — requirements

**Renown is the measured aggregate of social standing — the "quality"
half of the consumer-influence thesis (`engagement × renown`).** It is an
*output you observe*, never an *input you assign*: a signed scalar
(esteem ↔ notoriety) computed from how others actually react to you,
computed for any scope — a Group, a locality, or the whole polity — that
is asked about. This build delivers the
*substrate* — a dedicated event store, the per-scope aggregation, and a
read-only API — and **emits no consumers**: governance influence, NPC
behaviour, and the disguise/notoriety system all read renown later. It is
to the reaction signal what aggregation is to telemetry.

This is the next brick on the **reputation / cooperative** track, and the
direct successor to reactions. The
[regard belief facet](../subsystems/belief.md) shipped the *private,
per-viewer attitude* leg; [reactions](../subsystems/reactions.md) shipped
the *public, momentary signal* leg and left a renown-ready
`ReactionFiredEvent` "awaiting its aggregator." **This build is that
aggregator.** Seeded by
[reputation-slate.md](../slates/builds/reputation-slate.md); the
governance semantics are fixed by
[cooperative-slate.md](../slates/builds/cooperative-slate.md).

> **What this build is *not* about: morality.** The engine holds exactly
> one value — a thriving participatory community — and measures
> contribution against it: your *marginal effect on others' engagement*
> (v1: via the reaction proxy — see non-goals). Mind the two senses of
> "engagement": **quantity** is *your own* participation; **quality**
> (renown) is your *effect on others'* participation. Every *object-value*
> (is PKilling good? is this conduct rewarded?) is **content a polity
> legislates**, never engine-shipped. Renown aggregates revealed +
> declared preference; it never adjudicates ethics.

## Where renown sits — the reputation family

Pinning the spine means pinning the relationships. The family is two
**axes** (esteem / orientation) over two **layers** (subjective /
aggregate), fed by two **substrates**:

| System | Axis · Layer | What it is | Fed by | Status |
|---|---|---|---|---|
| **Contacts** (`ContactsMixin`) | — · subjective | my private *filing* of others | me only (declared) | shipped |
| **Regard** (belief realm) | esteem · subjective | my signed *attitude* toward you | reaction events → belief store | shipped |
| **Renown** | esteem · aggregate | your *standing* per scope (signed) | the **renown event log** | **this build** |
| **Susceptibility** | esteem · authored | how easily *this NPC* is swayed | authored NPC knob | deferred |
| **Alignment** | orientation · aggregate | your *stance* (Law axis) | the **chronicle** (deeds) | deferred |

There is no **reputation** row on purpose: *reputation* is the family name
for the esteem axis (regard + renown + notoriety + susceptibility), not a
separate quantity.

Two dumb stores, smart consumers — the same pattern twice:

- **chronicle** = narrative deeds → identity readouts (alignment,
  achievements, traits, bio). Curated, permanent.
- **renown event log** = ambient signal → standing readouts (renown,
  notoriety). Bulk, decayable.

The data-flow is **acyclic in the dangerous direction** — that
acyclicity *is* the anti-capture guarantee:

- **Contacts feed nothing.** Pure subjective lens; they *consume*
  notoriety/recognition for display, never produce standing. (The
  severed arrow — contacts are unilateral self-declaration, zero
  objective signal.)
- **Reaction → regard *and* renown (siblings)** — the same event feeds
  both independently; **renown → influence**, but only ever *multiplies a
  bounded* influence (conduct → weight, never → authority).
- **Alignment → coalition/parties, never vote-weight.**
- **Renown reads only its own log** — never the belief store (see "sibling
  to regard").

## Goals

- **A dedicated, two-layer store — not chronicle.** Chronicle is a
  narrative timeline; renown is a system of record. (1) An append-only,
  **scope-tagged event log** (`renown_events`) — the source of truth. (2)
  A **materialized per-`{subject, scope}` aggregate** — a rebuildable
  cache reads hit. Layer 2 is always derivable from Layer 1.
- **Store the raw signal, score at aggregation time.** A `RenownEvent`
  records the *pre-valence* signal, not a scored value — so re-legislating
  the value-function **re-scores history** without rewriting the log.
- **Renown is a sibling of regard, not its child.** The same reaction
  event fans out to two independent consumers: the belief store (updates
  the reactor's per-pair, scope-less *regard*) and the renown log (appends
  a *scope-tagged* event). The renown recompute never reads the belief
  store.
- **Per-scope quality is *derived*, not tracked.** One polity-level
  value-function; "your quality in this guild / locality" is the same
  function aggregated over a scope-filtered slice. Scope is an *index on
  the data*, never a per-place parameter.
- **Two projections of one quantity.** Governance reads the single
  **cooperative-wide roll-up** (`engagement × renown` — the cooperative
  slate writes this `engagement × regard`/`× reputation`, using those
  terms colloquially for the renown aggregate); NPC/social/disguise read
  the **per-`Group` / per-locality vector**. Same machine, two views.
- **Read-only this build; consumers deferred.** Ship `RenownApi` reads
  and the recompute; wire no consumer.

## Non-goals

- **The consumer side** — governance-influence wiring, NPC-behaviour
  reads, disguise/notoriety, the guard-persuasion resolution (where
  susceptibility + renown + regard meet). Deferred to those builds.
- **Per-institution value overrides** — a guild authoring its *own*
  multipliers. The derive-don't-track model means we never need this to
  get per-locality *data*; the override feature stays explicitly out.
- **Alignment** — a parallel orientation axis fed by the *chronicle*, not
  this log. Separate build.
- **True engagement-effect measurement** — the Facebook metric (your
  marginal effect on others' activity) needs a sampler/sessionizer.
  Deferred; **reactions are the v1 quality proxy**, and the log's `kind`
  field lets engagement-samples slot in later with no schema change.
- **The eigenvector recursion** — v1 is flat-weighted (`source` weight =
  1). The log retains `source`, so the recursion is a pure recompute-time
  upgrade, no migration.
- **Contacts as a renown input** — severed by design.

## Surface decisions

### The two-layer model — log + aggregate

`renown_events` is append-only and bulk; the aggregate is a view. Reads
go to the aggregate; the aggregate is rebuilt by a periodic **batch**
recompute (the eigenvector pass and decay both want a sweep, not an
incremental update). Losing the aggregate is never data loss — it
replays from the log.

### The `RenownEvent` shape — raw, scope-tagged

```
RenownEvent {
  subject     // who it's about (indexed)
  source      // who emitted it (retained for eigenvector weighting)
  kind        // reaction | engagement-sample | recognition-spread | …
  signal      // the raw reaction-type / magnitude (PRE-valence)
  scope: {
    locality  // where it happened (Location/Locality)
    groups[]  // objective Groups shared by source & subject (GroupApi)
  }
  at          // game-clock timestamp (for decay)
}
```

The value-function is applied **at read/recompute**, never at write.

### Sibling to regard — the authoring contract

> Anything meant to move *standing* emits a `RenownEvent`. Anything that's
> just a private *attitude* moves `regard`. A public act does both; a
> private poke does one.

A 👍 in a room → both. An NPC quietly warming to you → regard only. A
notable deed the world should weigh → a renown event (and possibly a
chronicle entry — see open questions). No accidental coupling between the
belief store and the renown substrate.

### The value-function — entrenchment tiers

The polity sets **declarative parameters in a fixed engine algorithm**
(the constitution-parameters shape), partitioned by entrenchment — and
the tiering *is* the anti-capture mechanism:

- **Entrenched (fixed in code / amendment-tier — not ordinary knobs):**
  notoriety contributes **zero** governance influence; the
  `engagement × renown` *form* + the eigenvector principle;
  `renown × no-participation = nothing`.
- **Legislated knobs (ordinary law — the declared values):** the
  reaction **valence map** `{reaction-type → weight}`; **decay
  half-lives** (esteem fast/fragile, notoriety slow/sticky); a small
  **context/act multiplier table** `{act-or-zone-tag → ×}`, default 1
  (where "PKilling in town ×−2" lives); the **quality weight**
  (amendment-tier — it reshapes the whole franchise).

Values become an **auditable config diff**, version-controlled by the
legislative ledger. Storage is the **AppSettings shape**
([app-settings.md](../subsystems/app-settings.md)) — open values bag, key
vocabulary, no code defaults — but governance-owned rather than
deployment-owned.

### Derive-don't-track — per-scope as a partition

`RenownApi.renownOf(subject, scope)` filters the log to events whose
scope contains the queried scope, aggregates through the one
value-function. Scope is multi-axis (locality **and** Group), so "quality
by area" and "quality by guild" are two projections of one tagged stream —
every slice free, even retroactive ones.

### Ingestion — tap `ReactionFiredEvent`

`RenownLogic` subscribes to `ReactionFiredEvent` and writes a scope-tagged
`RenownEvent`. **`ReactionRegistry` stays ephemeral** (5-min TTL, live UI
chips) — unchanged. One event, two consumers: one ephemeral, one durable.
Scope tags are resolved at ingestion from the act's location +
`GroupApi`.

### Decay — a recompute weighting, not a mutation

Events fade by age **when summed**; the log is untouched, so decay is
deterministic and re-runnable. **Log compaction** (dropping fully-decayed
events) is a later space optimization that can never corrupt standing —
it only ever removes rows that already contribute ~0.

### Module shape

- `RenownEvent` — a `Document` subclass; collections `renown_events` (log)
  + the materialized aggregate (own collection, warmed at boot).
- `RenownApi` (gated facade) + `RenownLogic` (logic singleton) — owns
  ingestion, the batch recompute, gated reads. Standard Api ↔ logic split.
- The recompute is a `ScheduleApi` job
  ([time.md](../subsystems/time.md)). Activation = `RenownLogic`
  singleton presence.

## Open questions

- **Eigenvector now or later?** Flat v1 vs build the recursion in. (Leaning
  flat; `source` retained makes it a free upgrade.)
- **Engagement-effect sampler** — the design of the richer `kind` (causal
  attribution of others' activity; Goodhart guards against drama-farming).
- **Notoriety ↔ chronicle reconciliation** — a notable bad deed is a
  renown event (ambient) and *maybe* a chronicle entry (narrative). Lean:
  nothing automatic — chronicle stays curated, renown stays bulk.
- **Which scopes get materialized caches** — cooperative-wide + registered
  Groups + localities, with arbitrary slices computed on demand from the
  retained log.

## Constraints

- **The firewall is entrenched, not configurable.** No ordinary knob may
  let notoriety mint governance weight, or zero out the participation
  requirement. These live above the legislature's reach.
- **No value content in code.** The engine ships the algorithm + parameter
  *schema*; all weights are seeded/legislated data (AppSettings shape).
- **Soft-coupling to belief/reactions.** Renown depends on the reaction
  event and `GroupApi`/`Location`; it must introduce no static import
  cycle (mirror the biome/weather soft-import discipline).
- **Renown is viewer-agnostic at the aggregate** — it is the *social fact*,
  distinct from per-viewer regard. Per-viewer presentation (e.g. a
  notoriety marker in a description) is a consumer concern, deferred.

## Acceptance criteria

- A reaction produces, independently: a regard update in the belief store
  **and** a scope-tagged `RenownEvent` in `renown_events`.
- The batch recompute materializes a signed per-`{subject, scope}`
  aggregate that `RenownApi.renownOf(subject, scope)` returns.
- The same subject reads different standings in different scopes
  (cooperative-wide vs a Group vs a locality) from one event stream.
- Re-legislating the valence map re-scores standing on the next recompute
  **without** rewriting the log (raw signal retained).
- Dropping the aggregate and replaying the log reproduces identical
  standings (Layer 2 derivable from Layer 1).
- No code path reads the belief store during the renown recompute.

## Cross-references

- **Seed / semantics:**
  [reputation-slate](../slates/builds/reputation-slate.md),
  [cooperative-slate](../slates/builds/cooperative-slate.md) (the
  `engagement × renown` franchise + entrenchment tiers)
- **Sibling / inputs:** [belief.md](../subsystems/belief.md) (regard
  realm), [reactions.md](../subsystems/reactions.md)
  (`ReactionFiredEvent`)
- **Scope substrate:** [grouping.md](../subsystems/grouping.md)
  (`GroupApi`), [location.md](../subsystems/location.md)
  (Locality), [social-graph-slate](../slates/builds/social-graph-slate.md)
  (contacts = lens, not input)
- **Adjacent axes / stores:** [chronicle.md](../subsystems/chronicle.md)
  (narrative store),
  [alignment-religion-slate](../slates/deferred-rpg/alignment-religion-slate.md)
  (orientation axis)
- **Mechanism:** [app-settings.md](../subsystems/app-settings.md) (value
  parameter storage), [time.md](../subsystems/time.md) (recompute
  schedule)
