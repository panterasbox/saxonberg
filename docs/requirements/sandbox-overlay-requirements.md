# The sandbox overlay — requirements

**Kind:** feature
**Leads from:** kernel — first consumer is **the circle every player already
has**, and the shipped verbs that throw inside it today: `party`, `forum`,
`subject`, `chat`, `job`, `fulfill`. No new content is authored by this
build; the content that exercises it is standing in the world now.

A circle is an ordinary player's rehearsal room — you walk through the
wardrobe in your bedroom and everything you do is *real while you are
inside and void at the boundary*. **Twenty-seven collections say you may
not write them there**, and the twenty-seven were never triaged as a
group: twelve of them carry no rationale beyond the words *"REFUSE under
the sandbox."* The result is a test bed in which you cannot form a party,
hold a forum thread, open a channel or post a job — and, when you try, the
room answers you in engine prose:

> `Something went wrong in /platform/idea/cmd/social/PartyController:`
> `PersistenceManager: save on 'parties' refused from circle scope`
> `'/home/xyz' — this collection holds field-real state that a sandbox`
> `session may not mutate.`

This build gives the sandbox a **copy-on-write store** so those writes can
land somewhere that is discarded at the door, moves the nine collections
that need nothing harder onto it, puts the player's own body snapshot
behind the same structural guard that one hand-written boolean holds
today — and makes the refusals that *remain* honest.

Seeded by [avatar-family-slate](../slates/builds/avatar-family-slate.md)
§ Sequencing 2–4. ⭐ Step 1 (making the declared-but-unbuilt
`mode: 'overlay'` refuse instead of falling through to a real write)
shipped separately as MR !308 and is not in scope here.

---

## What already exists

**The crossing, whole.** There is no `sandbox` verb and no `circle` verb —
the crossing is a **door**, deliberately (`POST /api/sandbox/test-session`
and `SandboxApi.launchTestSession` were both built and then deleted).
A player types `go wardrobe` in a bedroom and is gone; `out` is the only
way back and is always open. The field body is **parked** where it stood,
a wire vessel is minted, and the shell crosses with you — name, contacts,
species, cockpit layout, theme, settings, aliases.

**It is an ordinary-player feature, not a wizard one.** *"Personal space
is a right (character creation is the grant); group space is a grant."*
A path under `/home/<key>/` is owned by that player with **no `parcels`
row at all**. `clone` carries no wizard validator inside your own circle.
Only `eval` is wizard-gated — *"jurisdiction gates where, never whether."*
The hard exclusions are non-persons and **guests** (no player id).

**The discard, whole.** Circle-born objects die at exit; stamped rows are
deleted by scope; scoped schedules are cancelled; the banking overlay is
dropped; an orphan sweeper cleans scopes with no live session. ⭐ And
there is already **an overlay with its own discard hook wired into the
generic path** — `BankingApi.discardScopeOverlay`, an in-memory per-scope
money overlay that ships.

**The policy table, whole.** Five dispositions over 48 collections, total
by construction: `stamp` (11), `pass` / `pass(mark)` (11+5), `shadow/skip`
(5), `refuse` (27).

**The hook the copy needs, already in place.** At the crossing, the park
capture already writes the real snapshot row *at the moment you leave*,
in field context, outside the scoped guard — which is copy-on-enter's
semantics exactly, one phase short.

**What is genuinely new here is therefore:** (1) a **place for a circle's
writes to land** — a scoped copy, made at the door and dropped at exit;
(2) the **triage** of the twenty-seven, twelve of which have never had
one; (3) a refusal a player can read; and (4) the design — not the code —
of the read-through mode the mutable registries will need.

## Goals

- A player can **form a durable party, hold a forum thread, open a
  channel and post a job inside their circle**, and none of it exists
  in the world when they walk out.
- A circle that a player re-enters is **fresh** — last visit's party,
  forum and channel are gone, exactly as its clutter already is.
- The player's own body record is protected **structurally** rather than
  by a boolean on one subclass: a wire body cannot reach the identity's
  snapshot because its writes land in the circle's store, not because a
  method returns `false`.
- Every refusal that survives is **spoken in fiction**, once, in one
  voice — no controller path leaks `PersistenceManager:` to a player,
  and none fails silently.
- **No refusal costs money.** A command that will be refused refuses
  before it charges.
- The collections that stay refused each **name why**, so the twelve
  blank rationales are gone.
- The read-through mode is **designed and closed** — its identity key and
  its delete representation answered — so the build that implements it
  starts with no open questions.

## Non-goals

- **Building read-through mode** → the next cycle, off this doc's
  § Surface decisions. `parcels`, `chattel`, `groups`, `office_holders`
  stay refused until it lands.
- **Retiring `shouldPersist()` for a per-mixin capture allowlist** →
  [avatar-family-slate](../slates/builds/avatar-family-slate.md)
  § Sequencing 5. ⚠ And it is a bigger claim than the slate states: the
  boolean does **three** unrelated jobs — the wire/shade guard, the
  **guest** gate (`!this.isGuest`), and the **revert** flag
  (`markForRevert`, `OuterWarren`). Only the first is a partition; the
  other two mean *capture nothing at all*, which an allowlist cannot
  say. This build retires `WireBody`'s override only.
- **The phase axis, the death spec, and the class layering** (Sequencing
  6–9) → the same slate; a second requirements doc.
- **Changing what a `holder_snapshots` record CONTAINS** →
  [estate-nesting-slate](../slates/builds/estate-nesting-slate.md), which
  is an unbuilt build about exactly that (reference vs copy vs capped
  copy). ⭐ This build changes **where a record lands, never its shape**;
  that is the non-interference boundary, stated so the two migrations do
  not collide.
- **Letting a `PersistenceContributor` name its own source** →
  [hydration-framework-slate](../slates/builds/hydration-framework-slate.md),
  which owns that knob on the same dispatch point.
- **The in-circle death arc** (minting a real body from inside a circle)
  → [mortal-vessel-slate](../slates/builds/mortal-vessel-slate.md). This
  build unblocks it; it does not design it.
- **Unifying with the CMS draft/changeset overlay** →
  [cms-slate](../slates/builds/cms-slate.md). *"The author works against
  live ∪ their changeset"* is the same read-through shape over templates.
  ⭐ Deliberately left un-unified until `through` exists in one place; a
  shared mechanism decided before either is built would be guesswork.
- **`positions` and `producer_events`** → stay refused, reasons named
  below. Neither is a gap a player can reach today.
- **An in-fiction refusal for the 9 that stand** being *diegetically
  clever* — one honest sentence, not a bespoke line per collection.
  Nowhere else, deliberately.

## Placement

**Kernel, entirely.** The write-path policy seam, the collection
vocabulary and the crossing choreography are all engine. No pack ships
a collection policy, and a pack may not write these collections at all.

⭐ The second-instance test passes by construction: **a second circle
needs zero code** — it is a path under `/home/<playerId>`, minted by
character creation, owned with no registry row. That is already true and
this build must not make it less true, which is the test for any
per-collection wiring the design proposes: if a new player's circle would
need a row somewhere to work, the design is wrong.

## Collisions

- **Every bedroom with a wardrobe** — `seznick-house`, `duncan-hall`'s
  dorm room, and `generic-objects`' bedroom archetype. These are the
  doors; they need no change, but they are where the drive runs.
- **The forum, party, chat and contract verbs** — shipped, exercised,
  and currently throwing inside a circle. They are the consumer, and
  ⚠ several of them **catch and print** rather than throw, so the fix
  has two shapes to find, not one.
- **`buy` / `title buy` / `consign` / `check` / `name`** — the retail and
  title surface. These stay refused (they write `chattel` / `parcels`),
  and **they are where the money-first ordering bites**.
- **`drop` and `put`** — they call `void followCustody()`, fire-and-
  forget. An in-circle refusal there is an unhandled promise rejection
  today. ⚠ Mitigating: circle-born clutter is unstamped and early-returns,
  so this only bites on a real chattel carried in.
- **Dave's Bar, the general store, the campus farm** — untouched. The
  drive must prove the world is untouched *from a second player's seat*,
  which is the only way to see it.
- **The banking money overlay** — already exists, already discards. The
  new store must not duplicate or fight it.

## Surface decisions

### D1 — A copy-on-enter store does not violate A14

**Question.** A14 is an eternity clause: *"The sandbox boundary is
symmetric. Nothing crosses into or out of a circle."* Amendable by
nobody. Does copying rows in at the door break it?

**Answer. No — and the build strengthens A14 rather than spending it.**

What A14 protects is that **gain cannot cross out**. Reading the world in
is not a crossing and never was: a circle is *seeded* from the world by
construction — you can clone the world's rows, and the shipped `stamp`
read is already `global ∪ own-scope`. A copy at the door is that same
read, materialized eagerly instead of lazily. Nothing arrives in a circle
that a player could not already see there.

⭐ The direction that matters goes the other way. **Today the only thing
between a wire body and a player's real record is
`WireBody.shouldPersist() → false`** — one boolean, on one subclass,
guarding a collection explicitly marked `sandbox: pass`. Delete the
override and the wire body writes the identity's snapshot. After this
build the guard is the store itself: the write has nowhere to land but
the circle's copy, which is deleted at exit. **A14 goes from a
convention that one method keeps to a property of where writes go.**

### D2 — Nine collections move; the mutable registries wait

**Copy-mode this cycle** (the nine that have never been triaged, plus the
snapshot): `contracts` · `contract_events` · `parties` · `channels` ·
`forum_boards` · `forum_subjects` · `forum_entries` · `forum_votes` ·
`forum_events` · `holder_snapshots`.

They share one property: **a circle that starts empty is fine, and
arguably better.** You do not need to see the world's forums to rehearse
holding a thread; a rehearsal party with the world's parties in it would
be worse, not better. So the read is a plain scoped read over a copy that
begins empty, and nothing hard is required — no identity key, no
aggregation, no delete representation.

`holder_snapshots` is the exception that proves it: its copy is not empty
but it is **O(1)** — the row set is *your* snapshot, and the park capture
already writes it at the crossing.

**Staying refused** until read-through lands: `parcels` ·
`parcel_events` · `chattel` · `chattel_events` · `groups` ·
`office_holders`. Content calling `ownerOf` must see **the world's**
titles while only your writes stay local, and an empty start would make
the circle a world with no property in it.

### D3 — ⚠ Departure from the slate: the event chains are `stamp`, not overlay

**The slate assigns `parcel_events` and `chattel_events` to overlay
alongside their registries. They should be `stamp`.**

The slate states the discriminator itself: **stamp unions, overlay
overrides.** A mutable registry row wants override — *the scoped row if
one exists, else the global one* — because a union gives two rows for one
key and the caller has to pick. But an **append-only chain of title is
not a mutable row**, and a union is exactly right for it: you want to see
the world's history and append your own. That is what `stamp` already
does, and A2 (*ledgers are append-only*) and A5 (*transfer never
overwrites*) say these two are ledgers.

⭐ The registry and its chain want **different modes**, and that is
coherent rather than odd: the row is current state, so you override it;
the chain is history, so you extend it. Filing them together was habit.

This is not free scope — it means the read-through build inherits two
fewer collections, and it means a circle's chain-of-title shows the
world's past with your rehearsal appended. That is the honest picture of
what a rehearsal is.

### D4 — `through`'s identity key: the collection declares it, in its schema doc

**Question.** Read-through needs to know which rows are *the same thing*,
so a scoped row can shadow a global one. Where does that come from?

**Answer. Each overlaid collection declares, in its own schema doc, the
one field that names the thing it holds a record of** — the same place
its sandbox policy, its indexes and its invariants already live. Nothing
new is invented; the declaration rides the artifact that is already the
per-collection source of truth and is already gated by `lint:schema`.

⭐ The test this passes that a central table would fail: **a second
circle needs zero code**, and so does a second overlaid collection — the
author who adds one writes it where they were already writing everything
else about it, and the gate catches a missing key the day the policy
says `through`.

⚠ And the name collision must be paid before this lands:
`holder_snapshots` declares `{ scope, owner }` unique where **`scope` is
the host scope, not `circleScope`** — the word already means two things
in the one collection we most want to overlay, and the unique index has
to widen. That is this build's, not the next one's, because this build
is the one that puts a second row in there.

### D5 — An in-circle delete is a tombstone, not a refusal

**Question.** You delete a parcel inside your circle. The global row is
still there and still matches. What does the circle show?

**Answer. A tombstone — a scoped row that says "not here" and shadows the
global one.** The alternative the slate floats (refuse delete-in-circle,
*"the cheaper answer may be good enough for a test bed"*) is cheaper and
is wrong.

**Lens 2 chose it.** A rehearsal room you cannot tear anything down in
does not let an author rehearse the thing they most need to: undoing.
And it makes the circle lie in the worse direction — the doctrine is
*real while you are inside*, so a refusal tells you an act failed that
the world would have let you do, which is precisely the betrayal this
build exists to stop. A tombstone is a row, it discards with every other
scoped row at exit, and it costs one more case in the read.

### D6 — The refusal is spoken in fiction, once, in one voice

Every surviving refusal renders as a single in-fiction sentence, from one
place — the error is caught **by type**, which nothing does today. Three
current experiences collapse to one:

| today | after |
|---|---|
| `Something went wrong in …/PartyController: PersistenceManager: save on 'parties' refused…` | one in-fiction line |
| the same engine sentence printed as a plain result line | the same in-fiction line |
| silence (`void followCustody()`, the `producer_events` tap) | the same in-fiction line, or an author diagnostic where no player is present |

⭐ It says *what the circle is*, not what a collection is: the wire cannot
hold real title, and the act would have worked outside. **The refusal is
the progression UI** — a player must be able to learn from it that the
thing exists and where it works, which is the standing rule here and the
reason the verb must remain callable rather than vanish.

### D7 — A refusal never costs money

`buy` hands the item over and moves the money **before** the chattel-title
write refuses; `title buy` pays before the parcel write refuses. The
player ends up charged, holding an item with no title, reading a stack
trace. The scoped ledger rows are discarded at exit, so the money comes
back — **but not until they walk out**, and nothing tells them that.

The ordering inverts: the write that can refuse is attempted before the
irreversible-feeling half. ⚠ This is in scope precisely because these
two are collections that **stay** refused after this build — the defect
outlives the cycle that could have hidden it.

### D8 — `positions` and `producer_events` stay refused, with reasons

Twelve of the twenty-seven carry no rationale. These two get one rather
than a mode:

- **`positions`** — ⚠ **no verb reaches it.** The writers are the
  conviction hold/flip/tally paths, and the conviction surface has
  shipped no verb, so the refusal is unobservable to any player. Re-triage
  when the verb ships; classifying it now would be classifying a guess.
- **`producer_events`** — *may a rehearsal earn credit?* is an economy
  question, not a sandbox one, and it is the same question as *can a coin
  minted in a circle walk out* →
  [money-integrity-slate](../slates/builds/money-integrity-slate.md) § D.
  ⚠ It also fails **silently** today (the engagement tap swallows to the
  server console), which D6 fixes regardless of the disposition.

### D9 — `sandbox-slate`'s two open bullets

Claimed or deferred explicitly, because this build changes whether they
are still the right answers:

- **The scratch subject** — its open question proposes that *"a scratch
  subject may not be persistable."* ⭐ **Superseded.** That refusal existed
  because there was nowhere safe for a scratch subject's writes to land.
  There is now. The scratch subject itself stays that slate's to design.
- **Draft-overlay compose** — **deferred, untouched.** It is the CMS's
  read-through over templates, and D2 keeps this cycle off read-through
  entirely. Revisit when `through` is built, as one mechanism or two.

## Lens pass

1. **Pedagogy** — thin, and that is the honest finding. This exercises no
   Discipline; it is substrate. The one pedagogical claim it can make is
   *the rehearsal is faithful* — a test bed that refuses arbitrarily
   teaches you the tool's limits instead of the world's, and every
   refusal removed here is one less false lesson.
2. **Expression** — ⭐ the strong one, and the limb that decided D5. An
   author's circle is where a thing is tried before it is real; nine
   collections of *"you cannot try that here"* is the ordinary case
   failing, not the bespoke one. The delete-tombstone is the same
   argument at a smaller scale.
3a. **Immersion** — the acute failure today, and D6 is the whole answer.
   `Something went wrong in /platform/idea/cmd/social/PartyController`
   is the fiction betraying itself in the most literal available way:
   the room names a source file.
3b. **Participation** — a group cell (`/studio/<groupId>`) where a polity
   can rehearse a forum, a party and a contract before holding the real
   one is a genuine new affordance. ⚠ Whether a polity should be able to
   *practise* its governance is a question this build answers "yes" to
   by default; recorded as a decision, not an accident.
4. **Values** — the undecidable one is D5's: is a rehearsal room
   permitted to be **destructive**? We say yes, because refusing makes
   the circle a worse lie than permitting. Nobody confers standing here.
5. **Continuity** — unaffected. A circle answers the same commands in
   any epoch; the store is under the fiction, not in it.
6. **Economy** — ⭐ D7 and D8 are both here. This build produces no goods
   and consumes storage that is deleted at exit. The live economic
   question is the one it refuses to answer: *may work done in rehearsal
   earn credit?* — filed, not decided, because deciding it here would
   decide it for money too.
7. **Governance** — it judges nobody. The one adjacent fact worth stating:
   `deriveBlame` already ignores circle-marked accountability rows, so
   nothing here can make a person culpable for a rehearsal.

## The drive

Two players — **Ada** (the driver) and **Bo** (the witness, who proves
the world never saw any of it). Ada starts in a bedroom with a wardrobe.

1. **Ada:** `go wardrobe` → *"you step through and are gone"*; she wakes
   on the circle floor. `look` shows the circle, and *"the way out is
   simply out."*
2. **Ada:** `party form rehearsal --durable` → the party forms. **Today
   this prints `Something went wrong in …/PartyController:
   PersistenceManager: save on 'parties' refused…`**
3. **Ada:** `forum make "Trial by combat"`, then `forum post` a thesis,
   `forum reply` to it, and `forum vote 1 up` → each succeeds. Today the
   first three print the raw `PersistenceManager:` sentence as a game
   line, *after* the compose prompt has taken her whole post.
4. **Ada:** `chat make rehearsal-chan` then `chat rehearsal-chan hello`
   → the channel exists and carries the line.
5. **Ada:** `job post` a small contract → it posts.
6. **Bo** (in the world, never in a circle): `forum list` / `party list` /
   `chat list` → **none of Ada's exist.** This is the A14 check and it is
   only visible from a second seat.
7. **Ada:** `buy` something from a shop fixture cloned into the circle →
   she is **refused in one plain in-fiction sentence**, is **not
   charged**, and does not receive the item. No `PersistenceManager:`,
   no controller path, no stack trace. (`chattel` stays refused.)
8. **Ada:** `drop` a chattel she carried in → refused the same way, or
   silently fine; **never an unhandled rejection in the log.**
9. **Ada:** `out` → she wakes in her bedroom, where her body never moved.
10. **Ada:** `party list`, `forum list`, `chat list` → the rehearsal
    party, forum and channel are **gone**. The world's are intact.
11. **Ada:** `go wardrobe` again → the circle is **fresh**: no party, no
    forum, no channel, no clutter from the last visit.
12. **The record check.** Ada's own `holder_snapshots` row is **untouched
    by anything the wire body did** — her real inventory, her estate and
    her prose are exactly as they were at step 1, and the wire body's
    writes went to a copy that no longer exists.
13. **The remaining-refusal sweep.** For each collection still refused,
    type the verb that reaches it and confirm the same one in-fiction
    sentence — never engine prose, never silence.

## Acceptance criteria

*Observable from outside the code.*

- **A player can hold a rehearsal.** Ada forms a durable party, opens a
  forum thread, replies and votes on it, opens a channel and posts a job
  — all inside her circle, all working.
- **Bo never sees any of it.** From a second player's seat in the world,
  Ada's rehearsal party, forum, thread and channel do not exist, during
  the visit or after.
- **The circle forgets.** Ada walks out and back in; the circle is empty
  of everything she made.
- **Ada's real record survives untouched.** Her inventory, estate and
  prose after the visit are identical to before it, with no step taken
  to preserve them.
- **No player ever reads the word `PersistenceManager`,** or a controller
  path, or the phrase "Something went wrong", inside a circle.
- **No refusal leaves a player poorer.** After a refused `buy`, Ada's
  balance is what it was and she does not hold the item.
- **No refusal is silent.** Every refused act says something to somebody
  — a player if one is present, an author diagnostic otherwise; nothing
  reaches only the server console.
- **Every collection that still refuses says why** — in its own schema
  doc, in a sentence a person can read.

## Cross-references

- [avatar-family-slate](../slates/builds/avatar-family-slate.md) — the
  seeding slate; this doc is its Sequencing 2–4.
- [sandbox.md](../subsystems/sandbox.md) — the policy table, the
  crossing, the Layer-4 boundary.
- [persistence.md](../subsystems/persistence.md) — the spine and
  `holder_snapshots`.
- [measurement.md](../measurement.md) — A2, A5, A14.
- [sandbox-slate](../slates/tails/sandbox-slate.md) — D9.
- [estate-nesting-slate](../slates/builds/estate-nesting-slate.md),
  [hydration-framework-slate](../slates/builds/hydration-framework-slate.md)
  — the two sequencing hazards, bounded in § Non-goals.
- [money-integrity-slate](../slates/builds/money-integrity-slate.md) —
  D8's destination, and the in-memory overlay precedent.
- [cms-slate](../slates/builds/cms-slate.md) — the draft/changeset
  overlay, the same read-through shape over a different substrate.
