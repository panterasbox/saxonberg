# Regard facet — requirements

**Regard** is a viewer's *attitude* toward a subject — how much one
character likes / trusts / esteems another — stored as a signed scalar
per directed `(viewer, subject)` pair. It is the **per-viewer leg** that
D&D charisma unbundles into (regard + renown + susceptibility; see the
reputation slate), and it is the first foundational brick on the road to
**reputation** and, beyond it, the cooperative **polity**: regard is the
*reciprocation / social-embeddedness* primitive of the Sybil-resistance
keystone the whole governance design rests on.

This build delivers the **dumb attitude store + its gated arithmetic
seam** and **none of the consumers**. It follows the belief-store pattern
exactly: regard is the **third belief realm**, a sibling of recognition
and identification, sharing one store, one persistence collection, one
hydrate/evict lifecycle. All intelligence (aggregation, decay, display,
NPC resolution) lives in deferred consumers.

Seeding slates:
[reputation-slate](../slates/builds/reputation-slate.md) (regard is its
per-viewer leg), [cooperative-slate](../slates/deferred-rpg/cooperative-slate.md)
(the polity north star — regard is the keystone's reciprocation signal;
**lives on `master` only**), and
[social-graph-slate](../slates/builds/social-graph-slate.md). The
architectural precedent is [belief.md](../subsystems/belief.md) — the
realm-namespaced `BeliefStoreMixin` and its lazily-persisted `beliefs`
collection (one Document per `{viewerId, realm, referent}`, viewer-indexed)
is the exact model regard extends.

## Goals

- A viewer's attitude toward a subject is **recorded** as a single signed
  scalar on a per-directed-pair basis: regard is `(viewer → subject)`,
  asymmetric (A's regard for B is independent of B's regard for A).
- Regard is the **third belief realm** (`REGARD`), keyed by the subject's
  `templatePath` per viewer — "sibling of `knownAs`" satisfied at the
  *referent key* (same Bob, same key, three realms), **not** by
  co-locating on the recognition record.
- Regard **persists** through the existing `beliefs` collection with
  **zero schema change** — the scalar rides `BeliefDocument.payload`,
  reusing the belief store's hydrate-on-enter / evict-on-destruct /
  per-record write-through machinery unchanged.
- A **gated `RegardApi`** (forwarding to a hot-reloadable `RegardLogic`
  singleton) is the read/mutate surface: read current regard, adjust by a
  delta, set absolute, clear, and read all regard a viewer holds. The
  belief store stays **dumb CRUD**; all arithmetic lives in the Api.
- The **reverse-direction query** — "all regard held *toward* this
  subject" (renown's data path) — is made tractable now by a
  `{realm, referent}` index on the `beliefs` collection, even though no
  consumer reads it yet.
- A single **demo mutator** rides a moment that already fires, proving the
  seam end-to-end (adjust → coalesce → write-through → reverse query),
  exactly as the chronicle shipped demo minters.
- The store carries the **hooks** later layers need (a directed,
  per-viewer, queryable attitude graph) without building any of them.

## Non-goals

Every *reader* of regard is out of scope — regard is the substrate they
will project from. Each lands in its own build:

- **Renown / reputation aggregation** —
  [reputation-slate](../slates/builds/reputation-slate.md). The signed
  per-circle standing computed *from* regard (and reactions) is not built
  here; this build computes no aggregate.
- **Per-circle vectoring** — renown is a vector over circles; the
  partitioning is the renown consumer's job, computed at aggregation time
  from the pair's shared `GroupApi` memberships. Regard itself is **one
  circle-agnostic scalar** and stores no circle dimension.
- **Trust-weighting / eigenvector / web-of-trust** — the Sybil-resistant
  weighting (a vote from a high-standing node counts more) is the
  reputation/feedback build's work. This build only ensures the directed
  graph it runs over is *storable and reverse-queryable*.
- **The reactions / feedback substrate** —
  [reactions-slate](../slates/tails/reactions-slate.md). Regard is moved
  by deliberate mutators; the "afferent sensor layer" that will feed it at
  scale is a separate build.
- **Social-graph display / density-aware rendering** —
  [social-graph-slate](../slates/builds/social-graph-slate.md) Wave 3.
  Regard may later weight verbosity; no rendering consumer here.
- **NPC behavior / susceptibility resolution** — npc-behavior. The
  authored NPC-side knob and the persuade/gate logic that *reads* regard
  are deferred.
- **Decay** — regard *should* fade ("current stake, not lifetime"), and
  the design keeps it **read-time-ready** off the existing `lastSeen`
  stamp, but no decay curve is computed or tuned in v1.
- **Player-facing verbs** — no `regard`/`like`/`distrust` verb in v1
  (set/read is Api-only). A read-only self-view verb is deferred to the
  social-graph display build.
- **Notoriety / wanted-profile / disguise-piercing** — the signed *renown*
  twin and its recognition-by-description machinery
  (reputation-slate) are downstream of renown, not regard.
- **Contacts (`ContactsMixin`) integration** — buckets and regard stay
  **separate layers** (see surface decision); no auto-seeding of regard
  from `foes`/`friends` membership ships here.
- **Cross-account / cross-character regard** — per-character only, as with
  the rest of the belief store.

## Surface decisions

### `REGARD` as the third belief realm

**Decision:** add `REGARD = 'regard'` as a third realm in the belief
store, parallel to `RECOGNITION` and `IDENTIFICATION`, keyed by the
subject's `templatePath`. Do **not** add regard as a field on the
recognition record.

**Reasoning.** Three forces point to a separate realm despite the
reputation slate calling regard "the next facet of Alice's record for
Bob":

- **Different write lifecycle.** Recognition stamps a null-`knownAs`
  record on *every* sighting (tracked strangers). Regard must exist only
  when there's a real attitude; co-locating would pollute recognition's
  write-through gate or stamp regard noise on every glance.
- **Dumb store, smart consumers.** Recognition feeds the naming step;
  regard feeds reputation + social display. Separate realms give the
  renown consumer a clean `recallRealm(REGARD)` reader with no recognition
  filtering — the belief store's governing split.
- **"Sibling of `knownAs`" is satisfied at the referent key.**
  `recall(RECOGNITION, bob)` and `recall(REGARD, bob)` are two records
  about the *same* Bob (same `templatePath`), exactly as identification
  composes on the same target without sharing recognition's record.
  Regard is the third axis, not a sub-field of the first. (belief.md
  already reserves "a future third realm" as the sanctioned extension
  path.)

### Single signed scalar payload; per-circle not stored

**Decision:** extend `BeliefPayload` with `regard?: number` — one signed
scalar (lean range `-100..+100`; absent or `0` = no opinion). No
facet-decomposition (respect / fear / infamy), no per-circle dimension.

**Reasoning.** The belief payload rule is *flag by default, value only for
planned divergence* — regard is an inherently-valued planned divergence,
so a scalar on the payload is the correct shape (mirrors how `knownAs` is
a value on the spine while `typeKnown` is a flag). Reputation open-Q#1
leans "signed + per-circle now, facet-richness later"; per-circle is a
**consumer** concern (renown partitions one regard stream by shared groups
at aggregation), so the *stored* atom stays a single circle-agnostic
number. This keeps the store dumb and the document marshalling default
(scalar in a free-object payload → no marshaller).

**Clamp is in scope.** The `-100..+100` range is enforced — `RegardLogic`
clamps on every write (it is the named home for range invariants), and a
test asserts it. The range is normative, not advisory.

### `RegardApi` / `RegardLogic` — the gated arithmetic seam

**Decision:** a new `api/regard.ts` (`RegardApi`, ending with
`SecurityApi.decorateApiClass`) forwarding to a `RegardLogic` singleton at
`/obj/api/regard` (`obj/api/RegardLogic.ts`, `@internal`, methods gated
`FromModule('mud/api/regard#RegardApi')`), reached via `StuffApi.singletonSync` —
mirroring `RecognitionApi`/`BeliefStoreLogic`. Surface:

| method | role |
|---|---|
| `getRegard(viewer, subject): number` | point read; `0` when absent (decay applied here when built) |
| `adjustRegard(viewer, subject, delta): void` | the accumulator — read current, compute, `know(REGARD, …, { regard })` |
| `setRegard(viewer, subject, value): void` | absolute set |
| `clearRegard(viewer, subject): void` | `forgetField(REGARD, subject, 'regard')` (see stale-row note) |
| `regardsHeldBy(viewer): ReadonlyMap<string, number>` | `recallRealm(REGARD)` projection, for consumers |

**Stale-row note (accepted).** `clearRegard` clears the payload field via
`forgetField`; if the record carries nothing else learned, the
write-through gate no-ops and a now-neutral row remains on disk. This is
**inherited** `forgetField` behavior (recognition's `forgetField('knownAs')`
does the same) and is left as-is for consistency — purging the row would
be a separate `forget`-vs-`forgetField` decision, out of scope here.

**Reasoning.** The store stays dumb CRUD; `know`'s payload merge is
**overwrite** (the Api owns the delta math — the store never does
arithmetic). Regard is a distinct concern from identity-naming
(`RecognitionApi`), so it earns its own one-concept module rather than a
fold-in. The logic singleton is the home for the eventual decay and any
clamping/range invariants. Like `BeliefStoreLogic`, intra-singleton
helpers are module-private functions, not `this.x()` self-calls (which
would trip the `FromModule` gate).

### Reverse `{realm, referent}` index added now

**Decision:** declare a `{realm, referent}` index on the `beliefs`
collection in `PersistenceManager.createIndexes` as part of this build.

**Reasoning.** The belief store is viewer-local and the collection is
indexed on `viewerId` only — so the `viewer → subject` direction is cheap
but the **`subject → all-viewers`** direction (renown's "what does the
community feel about Bob," and the trust-weighted graph the cooperative
keystone runs on) is a collection scan. The cooperative slate is explicit
that *how load-bearing the Sybil keystone is should inform how this build
is scoped*; one index declaration is the difference between regard being a
dead-end scalar and being the queryable directed graph the polity rests
on. It is additive (no behavior change) and matches the roadmap's flagged
"persistence upgrade for the recognition family."

### Regard and `ContactsMixin` buckets are orthogonal but bridgeable

**Decision:** regard and contacts stay **separate layers**. Contacts is
*categorical* (which named list — `friends`/`foes`); regard is *scalar*
(how much). No auto-derivation in either direction ships in v1; a future
consumer may *bridge* them (e.g. a `foes` membership seeding negative
regard) but they do not merge.

**Reasoning.** They model different things: contacts is the player's
**explicit curation**, regard is the **measured/accumulated** attitude.
The reputation slate calls both "belief-store facets," but conflating them
would couple a player's hand-managed lists to the measured signal that
reputation must keep honest. Keeping them orthogonal preserves both — and
the bridge stays available to the social-graph display build that consumes
both.

### Player/NPC symmetry — kind-agnostic edges, asymmetric persistence

**Decision:** the regard substrate is **kind-agnostic** — it stores a
directed edge between two `Character`s and never branches on, or stores,
whether either end is a player or an NPC. Any player/NPC distinction
(trust-weighting, susceptibility) is applied by **deferred consumers** at
read/aggregation time, never on the stored edge. Both ends may be a
player or an NPC, in any combination.

**Persistence falls out of the belief substrate, asymmetrically, and v1
does not change it:**

- **Subject end (who is regarded): fully symmetric.** Keyed by
  `templatePath`; the forward read and the reverse `{realm, referent}`
  query work identically for a player or NPC subject.
- **Holder end (who holds the regard): inherits the belief store's
  asymmetry.** A **player (Avatar)** holder round-trips fully (hydrate on
  `Avatar.enter`, evict+flush on `onDestruct`, per-record write-through).
  A **named/singleton NPC** holder has a durable key, so its regard
  *write-through* persists — but there is **no NPC hydrate path** (only
  `Avatar.enter` hydrates), so a named NPC's regard is durable-on-disk and
  works in-session, yet is not auto-reloaded on reboot/re-clone. A
  **generic-clone NPC** holder has no durable key, so write-through
  no-ops and its regard is session-ephemeral.

**Reasoning.** This is exactly how recognition behaves today; regard
inherits it for free and must **not** build a general NPC-belief-hydrate
(a belief-substrate gap, deferred). It also aligns with the keystone: the
edges that matter for Sybil-resistant trust-weighting are **player →
player** (the embedded community vouching), which fully persist and
round-trip; NPC-held regard is the low-trust-weight category a renown
consumer discounts anyway, so its weaker persistence is acceptable for v1.
Keeping the edge kind-agnostic preserves the dumb-store / smart-consumer
split and avoids baking Sybil policy into storage.

### Decay deferred, but the shape is decay-ready

**Decision:** v1 stores a raw scalar and applies **no** decay; `getRegard`
returns the stored value. The design keeps decay a pure read-time
computation off the existing `lastSeen` stamp (the metabolism/thermal
lazy-reconcile-on-read precedent), so it can be added in the
`RegardLogic` reader without a stored-state change.

**Reasoning.** "Measure current stake, not lifetime" (cooperative slate)
makes decay eventually load-bearing, but the curve needs a running game to
tune; storing raw + decaying on read avoids a migration when it lands.

### One demo mutator, riding an existing moment

**Decision:** ship exactly one demo mutator that calls `adjustRegard` from
a real in-play moment that already fires, proving the full path (adjust →
coalesce → write-through → reverse query). It is **illustrative and
replaceable**, not the real trigger model. Lean: a small positive bump in
the existing `introduce` recipient loop (each recipient's regard toward
the introducer warms slightly), reusing the path that already writes
recognition; the planner may substitute an equivalent already-firing
moment.

**Reasoning.** The chronicle proved its seam with demo minters on moments
that already fire rather than building the content layer; regard follows
the same discipline. The real "what moves regard" authoring (thanks,
gifts, slights, NPC reactions) lands with reputation/npc-behavior.

## Constraints

- **No Mongo read on any hot path.** Regard reads (`recall`,
  `recallRealm`) are pure in-memory like the rest of the store. The Api's
  read-modify-write `adjustRegard` is *not* a naming/perception hot path,
  so its in-memory `recall` + fire-and-forget write-through is acceptable
  (same posture as recognition's upsert).
- **`templatePath` keying only**, never `stuffId` — durable, reboot-stable,
  matches the realm keying. Subjects without a durable key (generic clones)
  are session-ephemeral by construction.
- **Coalesce semantics differ from `knownAs`.** `know` only ever *raises*
  `knownAs`; for the `regard` payload field the merge is **overwrite**, and
  the *delta* arithmetic happens in `RegardApi` before the call. Do not
  reuse the raise-only rule for regard.
- **Write-through gate (`isLearned`).** A regard record carries no
  `knownAs`. The current gate in `BeliefStoreLogic`,
  `isLearned = knownAs !== null || payload.typeKnown === true`, would
  **reject a bare regard record and never persist it** — it must be
  extended to also treat a present/non-neutral `payload.regard` as
  learned. Verify a bare regard-only record round-trips.
- **Persistence is holder-kind-asymmetric, by inheritance.** `hydrate` is
  wired to `Avatar.enter` only; there is no NPC hydrate path. v1 must not
  add one. Player-held regard round-trips fully; named-NPC-held regard is
  write-through-only (durable but not auto-reloaded); generic-clone-NPC
  regard is session-ephemeral. See the player/NPC surface decision.
- **Proxy / privacy rules.** The store's working set stays TS-`private`
  (not `#`) — host is call-security-proxy-wrapped (CLAUDE.md member-privacy
  rule). `RegardApi` static internals may use `#`.
- **Methods-only inter-stuff contract.** Consumers read regard via
  `RegardApi`, never by reaching into `_beliefs`.
- **Module categories.** No new free-floating helpers: `RegardApi` (Api),
  `RegardLogic` (Api logic singleton). The realm const + payload field live
  on the existing belief `lib` module. New Api ends with
  `SecurityApi.decorateApiClass(RegardApi)`.
- **Belief-store substrate stays dumb.** The only store changes are the
  `REGARD` const, the `regard?: number` payload field, and the one
  payload-merge line in `know`; `forgetField` already handles
  `keyof BeliefPayload`, so `'regard'` clears for free.

## Acceptance criteria

- `REGARD` realm const exported from the belief lib; `BeliefPayload` has
  `regard?: number`; `know` merges it; `forgetField(REGARD, …, 'regard')`
  clears it. Tests cover upsert, overwrite-merge, and clear.
- `RegardApi` + `RegardLogic` exist in the canonical Api ↔ logic-singleton
  shape, gated `FromModule('mud/api/regard#RegardApi')`, reachable via
  `StuffApi.singletonSync`; `RegardApi` self-decorates. Tests cover
  `getRegard` (absent → 0), `adjustRegard` (accumulates across calls),
  `setRegard`, `clearRegard`, `regardsHeldBy`.
- A **player (Avatar)** holder's regard **persists and re-hydrates**
  through the `beliefs` collection with no schema change (carried in
  `payload`); a bare regard-only record (no `knownAs`) survives the
  extended `isLearned` gate. Round-trip test. (NPC hydrate is explicitly
  *not* added; a test need only assert named-NPC write-through reaches the
  collection.)
- Regard edges are **kind-agnostic**: the substrate stores no player/NPC
  marker and the same code path handles player↔player, player↔NPC,
  NPC↔player, and NPC↔NPC. The reverse `{realm, referent}` query resolves
  for both player and NPC subjects.
- The `{realm, referent}` index is declared on `beliefs` in
  `PersistenceManager.createIndexes`; a `find({ realm: REGARD, referent })`
  reverse query returns all viewers' regard toward a subject. Test
  asserts the reverse query resolves (the keystone data path).
- Regard is **directed/asymmetric**: setting A→B leaves B→A untouched.
  Test asserts independence.
- One demo mutator moves regard from a real in-play moment; a test (or the
  existing controller test) observes the resulting non-zero stored value.
- A subsystem doc update lands: regard is documented as the third belief
  realm in [belief.md](../subsystems/belief.md) (or a short `regard.md`
  if the planner judges it warrants its own page), including the
  orthogonal-to-contacts note and the deferred-consumer list.
- Regard's deferred consumers (renown, per-circle, trust-weighting,
  display, susceptibility, decay, verbs) are **absent** — no aggregation,
  no rendering, no verb ships.

## Cross-references

- **Seeding slates:**
  [reputation-slate](../slates/builds/reputation-slate.md),
  [cooperative-slate](../slates/deferred-rpg/cooperative-slate.md) (the
  polity keystone; on `master` only),
  [social-graph-slate](../slates/builds/social-graph-slate.md)
- **Substrate / precedent:** [belief.md](../subsystems/belief.md),
  `lib/belief/BeliefStore.ts`, `lib/belief/BeliefDocument.ts`,
  [contacts.md](../subsystems/contacts.md) (the orthogonal layer),
  [chronicle.md](../subsystems/chronicle.md) (the dumb-store / demo-minter
  precedent this build mirrors)
- **Future consumers:** reputation (renown), npc-behavior
  (susceptibility), social-graph Wave 3 (display),
  [reactions-slate](../slates/tails/reactions-slate.md) (the feedback
  sensor layer)
