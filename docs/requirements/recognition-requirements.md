# Recognition & identification substrate — requirements

A per-viewer **memory of identity**: what a given viewer knows about the
things around them, and how the world's display names bend around that
knowledge. The same Bob renders as "Bob" to a friend, "a hooded figure"
to someone he's hiding from, "a tall stranger" to someone who's never
met him; the same vial renders as "a blue potion" until identified, then
"a potion of healing."

Two **composable axes** of per-viewer knowledge, distinct but
co-applying:

- **Recognition** — *instance continuity*: "have I encountered this
  specific individual before, and do I know who they are?" Keyed per
  individual.
- **Identification** — *type knowledge*: "do I know what kind of thing
  this is?" Keyed per class.

They dissociate (recognized-but-unidentified = "the stranger you keep
seeing"; identified-but-not-recognized = "a city guard") and compose
(recognized + identified = "Bob, the baker you met yesterday"). A
target gets, potentially, *both* lookups, woven into one name.

**This build delivers the shared substrate plus recognition end-to-end,
and identification to substrate depth only.** The instance axis ships as
a full vertical; the type axis ships its memory + one thin trigger,
proving the axes compose. Identification's deep verb/content world — the
**pedagogical instrument seam** — is a deliberately separate later build.

Seeding slates: [recognition-slate](../slates/builds/recognition-slate.md),
[identification-slate](../slates/builds/identification-slate.md). Load-bearing
subsystems: [perception](../subsystems/perception.md) (the *separate*
sensory axis this consults for its visibility gate, nothing more),
[embodiment](../subsystems/embodiment.md) (disguise as a Wearable
shadow), [persistence](../subsystems/persistence.md) +
[persistence-architecture-slate](../slates/tails/persistence-architecture-slate.md)
(the keyed-working-set capability this forces),
[messaging](../subsystems/messaging.md) (the scene/earshot routing the
introduction trigger rides).

This build is also the concrete realization of the roadmap's
"Display-name composition" / "DescribeApi v2" entries.

---

## Recognition ≠ perception ≠ identification

Three distinct concerns that meet only at the naming step. Keeping them
separate is load-bearing:

- **Perception** (existing, unchanged) — *can V sense T at all?* Light,
  concealment, reachability, modality. Owns the visibility gate. This
  build *calls into* it for that gate and otherwise leaves it alone.
- **Recognition / identification** (this build) — *given V can sense T,
  what does V know about its identity?* Instance memory + type memory.
- **Self-presentation** (this build, the baseline) — *what does T call
  itself, viewer-blind?* An instance method on `Stuff`.

The viewer-aware naming step is **not** a player verb and **not** part
of perception. It is internal machinery: the routine the engine already
calls whenever it turns an object into a name-string (in `look`,
inventory, every message), upgraded to consult the viewer's identity
memory.

---

## Goals

### The shared baseline — self-naming moves onto `Stuff`

- Every `Stuff` answers `getPresentation()` — its name (`Named`) **or**
  `shortDescription`, plus viewer-independent affixes (`Globbable`
  count, wielded, posture, authored status). Viewer-**blind**.
- The static `DescribeApi.getDisplayName` **retires**; its **86 call
  sites** migrate from `DescribeApi.getDisplayName(obj)` to
  `obj.getPresentation()`. `DescribeApi.formatName`'s count folds in as
  an affix.
- `getPresentation()` is a **shadowable** instance method (not
  `@Final`) — masking overrides it via a method shadow.

### The shared per-viewer identity-memory store

- A new mixin on `Character` (so both `Avatar` and NPCs carry it; they
  already compose `PerceiverMixin`). It holds per-viewer memory records
  keyed by a **signature** — *instance* signatures (recognition) and
  *type* signatures (identification) in the same store, discriminated by
  key.
- One shared record spine (common fields: `knownAs`, `firstSeen`,
  `lastSeen`, signature, provenance) carrying a small axis-specific
  payload — not a god-record.

### The viewer-aware naming step — the compose seam

- A viewer-relative routine `(viewer, target) → name` that: gates on
  perception (delegates "can V see T?" to the perception substrate),
  takes `target.getPresentation()` as baseline, then **composes both
  memory axes** — instance lookup (recognition) and type lookup
  (identification) — into the rendered name, plus decoration. Built so
  the two axes weave: "a guard you met yesterday" = recognized instance
  + identified type.

### Recognition (instance axis) — full vertical

- **Strangers tracked.** First sight of an unknown creates a record
  labelled from salient features; repeat sightings coalesce to the
  *same* record and advance `lastSeen` (not a new record per sighting).
- **Introduction upgrades the label.** A `say`-class utterance "I'm
  Mara" emits an introduction event on the existing dispatch/earshot
  spine; in-earshot listeners' memory upgrades the speaker's record from
  a feature string to the name.
- **Name-collision disambiguation** renders two known same-named actors
  distinguishably.
- **Masking + one disguise.** A worn `Disguise` Wearable shadows the
  presented identity. One content item ships — a **hood** (covers
  `face`): a known wearer reads as "a hooded figure" while worn;
  recognition re-fires on removal.
- **Salient-feature description** for unknowns (species/body unless
  covered, most-notable Wearable, wielded item, authored
  `distinctiveFeatures`).
- **`StatusMixin`** — a settable activity-status feeding the decoration
  slice (`{{name}} {{status}}` → "Gus, the crossing guard, watching the
  empty road"). Settable three ways: a `status` verb, a runtime setter
  NPC behavior can poke, a static authored default.

### Identification (type axis) — substrate depth only

- **Type-keyed memory** with a class signature (`templatePath +
  appearance`) and the type-lookup composing in the naming step.
- **One thin full-ID trigger** — `read scroll of identify`: reading the
  scroll on a target writes the type record; the item thereafter renders
  by its known type ("a potion of healing") to that viewer.
  Identification is **binary** (unidentified ↔ identified) — no partial
  levels in this build.
- The masking mechanism supports type-axis **illusion** by design (same
  shadow), but no illusion content ships here.

### Persistence — lazily-hydrated session working set

- Records live in a **dedicated Mongo collection**, one document per
  `{viewerId, signatureKey}`, indexed on `viewerId`. The store is
  axis-agnostic — instance and type records share the collection,
  discriminated by `signatureKey`.
- A viewer's memory lazy-hydrates into memory on session establish,
  serves the naming step from memory (no Mongo read on that path),
  writes each new/updated record through as a per-record upsert, and
  evicts on logout.

### Doc

- A subsystem doc graduates capturing the substrate and both axes.

---

## Non-goals

- **Identification's pedagogical instrument seam** — `analyze X with Y`
  (spectrometer / pH-meter / hardness-kit), real Material-substrate
  chemistry/biology/physics integration. The genuinely large part;
  identification's own later build.
  ([identification-slate](../slates/builds/identification-slate.md))
- **Partial identification** — `identificationLevel`, `knownAttributes`,
  "probably a healing potion." Defers with the instrument seam (it has
  little to act on without it).
- **Experience-ID and social-ID verbs** — `taste` / `drink` / `wear`-to-
  identify, `learn from teacher`, identification propagation between
  actors. Later.
- **Misidentification** — belief-vs-truth (a blue poison read as
  healing), cursed items, illusion *content*. Later.
- **Social-graph buckets / crowd verbosity** (collapsing strangers into
  counts). Post [social-graph-slate](../slates/builds/social-graph-slate.md).
- **Comms trust-tier moderation.** [comms-slate](../slates/tails/comms-slate.md).
- **NPC behavior that consumes the memory** — greetings, gates, gossip,
  a merchant pricing by what it's identified. The substrate lets NPCs
  *hold* memory; reading it to drive behavior is npc-behavior territory.
- **Language / lore comprehension.** Same family (viewer knowledge gates
  rendering) but a different axis — *legibility*, not *identity*. Out.
- **Place-memory** ("an unfamiliar room" vs "the Duncan Hall lobby"). A
  future third signature kind.
- **MQL compound feature-handles** (`talk to tall-stranger`). Unknowns
  stay referrable via existing descriptor resolution (species + visible
  wearables); the per-viewer-string MQL integration defers.
- **Player-set nicknames** (`name X as Y`), **memory decay**,
  **voice/scent recognition**. v2.
- **Cross-avatar / cross-account memory sharing.** Per-avatar.
- **BI / data-warehouse event firehose.** A different access pattern
  (append-only OLAP, never read at runtime); its own future subsystem
  tapping the dispatch response-envelope event spine. Must not couple to
  runtime state here.
- **Persistence tuning** — mid-session LRU eviction, paged partial
  loads, year-old pruning. Shape is built; these optimizations defer.

---

## Surface decisions

### Two composable axes, not one parameterized lookup

Recognition (instance) and identification (type) are distinct concerns —
different keys, records, triggers — that **compose** at the naming step.
A single target may be recognized, identified, both, or neither, and the
name reflects whichever apply. They share the *store mechanism*, the
*persistence pattern*, the *masking mechanism*, and the *compose seam* —
but they are not one lookup with a granularity dial. Building both axes'
substrate now (with recognition full and identification thin) validates
the shared machinery against two real consumers (N=2), so the later
pedagogical build slots in without reworking the spine.

### Self-presentation re-homes onto `Stuff.getPresentation()`

The viewer-blind "what do I call myself" becomes an instance method on
`Stuff` (the base every NPC, item, room extends — *not* `Avatar`; NPCs
and items self-present too). The static `DescribeApi.getDisplayName`
retires. **It has not happened yet** — verified: still a static, 86
callers, nothing on `Stuff`. This is wave 0 of the build.

### Wave 0 lands as its own MR first

The 86-caller migration is a wide mechanical sweep over the same
controller/validator surface char-gen has unmerged commits on. It lands
as a **standalone, separately-mergeable MR off clean master after lounge
+ char-gen merge** (the viewer-aware layer comes after), de-risking the
char-gen conflict. One requirements doc; the planner sequences the
rename as wave 0.

### The viewer-aware naming step consults perception, isn't perception

The compose routine gates on the perception substrate ("can V see T?")
but is its own concern. It is **not** homed on `PerceptionApi`. Exact
API home/name is the planner's call; requirements fixes only that it (a)
is viewer-relative, (b) calls `target.getPresentation()` for baseline,
(c) composes the instance + type memory lookups, (d) delegates the
visibility gate to perception.

### Stranger-tracking vs. disguise-breaks-recognition

Repeat-sighting coalescing wants stable instance-identity; disguise wants
the signature maskable. Resolution: the recognition record is **keyed by
the target's identity**, but the **lookup is gated by how much signature
the viewer can perceive**. Disguise lowers the perceptible signature
below the match threshold, so a disguised sighting fails to connect to
the stored record and reads as a stranger; removal restores it and
recognition re-fires. The type axis sidesteps this (class-keyed, no
per-instance memory).

### Recognition triggers: introduction + repeat-perception

Both on. Voice/scent triggers defer.

### Identification trigger: `read scroll of identify`, binary

One thin full-ID trigger proves the type axis composes. Binary
(unidentified ↔ identified); no partial levels. The scroll is the
iconic, self-contained trigger; the planner may substitute an
equivalently-thin trigger if scroll content proves heavier than a
notch-on-`examine`.

### Disguise content: hood only

One `Disguise` Wearable covering `face`. The seam supports feature-by-
feature coverage stacking (face/body/voice) for future content; only the
hood ships.

### `StatusMixin` is authored/settable, distinct from derived flags

The settable activity-status (`status` verb / behavior setter / static
default) is a separate concern from derived status-flags (poisoned,
glowing) computed from effects. Both land in decoration; different
sources; don't merge into one field.

### Persistence: own collection, per-record docs, lazy working set

Dedicated collection; one document per `{viewerId, signatureKey}`,
indexed on `viewerId` (not one-big-doc-per-viewer — avoids the 16MB cap
and per-encounter whole-array rewrites). Lazy session-scoped working
set; per-record write-through; evict on logout. This is a generic
"lazily-hydrated per-player keyed working set" capability that belongs in
the persistence layer — this build is its forcing function and converges
with the persistence rethink's two-track model (each document kind its
own collection).

---

## Constraints

- **Mixin/instance state on a Stuff host uses TS modifiers, not `#`.**
  `getPresentation()` and the memory mixin dispatch through the
  call-security proxy (`this` is the proxy); `#` slots throw. Persistent
  record fields must be public for the Hydrator. (CLAUDE.md — member
  privacy.)
- **Methods-only inter-Stuff contract.** Identity is read via
  `target.getPresentation()` / the viewer-aware step, never fields.
  Masking must be a method shadow, never a field override (the shadow
  framework dispatches methods only).
- **Memory records are Documents in their own collection** — not on the
  `Avatar` document (whole-document fsync is the wrong shape; cf.
  `ContactsMixin`'s on-Avatar lists, the cautionary precedent), not in
  `domain`. Per-record write granularity.
- **No Mongo read on the naming path.** It runs for every perceived
  target × viewer on every look/listing; memory lookup must be in-memory
  O(1). Mongo is touched only on hydrate and write-through.
- **No content hook in the speech substrate.** The introduction trigger
  is the `say` controller emitting on the existing event spine, with
  per-entity recording on the listener's mixin — not a registration
  point content wires into.
- **Per-field invariants on setters** — `StatusMixin`'s status, record
  fields.
- **The shared substrate must demonstrably carry both key kinds**
  (instance + type) with no rework needed for the deferred pedagogical
  build — verified by building both axes here.

---

## Acceptance criteria

- **Wave 0 (separately mergeable):** `Stuff.getPresentation()` exists as
  a shadowable instance method; `DescribeApi.getDisplayName` / `formatName`
  retired; all 86 call sites migrated; `Globbable` count renders as a
  `getPresentation()` affix; suite green.
- The viewer-aware naming step gates on perception, composes baseline +
  instance + type lookups; tests cover known / unknown / disguised /
  identified / both-axes cases.
- The memory mixin is on `Character`; both `Avatar` and a seeded NPC
  carry it; the store holds instance and type records together.
- **Recognition:** an in-earshot listener who hears "I'm Mara" has Mara's
  record upgraded and subsequently renders "Mara"; repeat-perception of
  one unknown coalesces to a single record with advancing `lastSeen`;
  wearing the **hood** makes a known wearer read as "a hooded figure" to
  others and removal re-fires recognition (test both transitions);
  unknowns render a generated salient-feature description; `StatusMixin`
  is set by the `status` verb, included in `getPresentation()`, and works
  from a static default.
- **Identification:** `read scroll of identify` on a blue vial writes the
  type record; the vial thereafter renders as its known type ("a potion
  of healing") to that viewer and stays "a blue potion" to others. The
  two axes **compose**: a recognized-and-type-identified actor renders
  with both (e.g. "the guard you met yesterday").
- **Persistence:** records land in the dedicated collection, one doc per
  `{viewerId, signatureKey}`; the viewer's memory lazy-hydrates on
  session establish and evicts on logout; a new encounter/identify is a
  single-record upsert; the naming path performs no Mongo read. Test the
  hydrate → render → write-through → evict → re-hydrate roundtrip.
- Subsystem doc exists (home TBD with the planner) and is referenced
  from CLAUDE.md's documentation map.

---

## Cross-references

- **Seeding slates:** [recognition-slate](../slates/builds/recognition-slate.md),
  [identification-slate](../slates/builds/identification-slate.md)
- **Adjacent slates:** [social-graph](../slates/builds/social-graph-slate.md)
  (bucket verbosity, later), [comms](../slates/tails/comms-slate.md),
  [persistence-architecture](../slates/tails/persistence-architecture-slate.md),
  [command-routing § Affordance attribution](../subsystems/command-routing.md)
  (recognition / identify trigger verbs afforded by different source
  objects)
- **Subsystems:** [perception](../subsystems/perception.md) (separate
  sensory axis — the visibility gate only),
  [embodiment](../subsystems/embodiment.md),
  [persistence](../subsystems/persistence.md),
  [messaging](../subsystems/messaging.md),
  [glob](../subsystems/glob.md) (`Globbable` affix),
  [response-envelope](../subsystems/response-envelope.md) (the event
  spine BI would tap — out of scope),
  [collections](../subsystems/collections.md) (memory mixin surface)
- **Antipatterns / rules:** methods-only inter-Stuff contract; `#` vs TS
  modifiers on proxy hosts; substrate has no content hooks; each
  Document kind its own collection
