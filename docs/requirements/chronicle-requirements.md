# Chronicle — requirements

The **chronicle** is a character's accumulating record of identity-shaping
narrative events — the substrate from which every identity readout
(recognition, reputation, alignment, traits, and a future achievements
system) is projected. This build delivers the **dumb append-only ledger**
plus a real way to read it; it deliberately builds **none** of the
readouts. It follows the belief-store pattern exactly: a dumb store with
all intelligence in its consumers.

Seeding slate: [chronicle-slate](../slates/builds/chronicle-slate.md)
(unblocked 2026-06-14; graduating to `builds/` as part of this cycle).
The architectural precedent is [belief.md](../subsystems/belief.md) — its
lazily-persisted `beliefs` collection (one Document per record,
owner-indexed) is the model for `chronicles`.

## Goals

- A character's identity-shaping events are **recorded** as durable,
  structured **entries** — `deed` (witnessed, dated) and `claim`
  (claimed, undated) — distinguished only by provenance.
- Entries **persist** as individual append-only Documents in a dedicated
  `chronicles` collection, owner-indexed (the belief-store shape; **not**
  one big array on the character — the `ContactsMixin` 16 MB anti-precedent).
- Content **mints** deeds through a single, security-gated entry point at
  the identity-shaping moments it chooses; a deed's prose line is
  generated via `ProseApi`.
- Deed **singularity comes from where it's triggered**, not a universal
  dedup: *event-singular* deeds (met Gus, graduated) ride a once-firing
  trigger; *category-firsts* ("your first conversation") use an optional
  `recordOnce(key)` helper; *repeatable* deeds just record each time.
- A fresh character has a non-empty chronicle: char-gen **seeds claim
  entries** from the chosen origin/aspiration (the prologue), distinct
  from the already-seeded prose `bio`.
- A player can **read their own chronicle** through a `chronicle` verb: a
  partitioned view — prologue (claims, authored order) then timeline
  (deeds, dated) — over the prose bio.
- The entry shape **carries the hooks** (`tags`, `who`) that future
  readouts (reputation/alignment/traits/achievements) will query, without
  building any of them.

## Non-goals

Every readout is out of scope — the chronicle is the root they read; they
land in their own builds:

- **Reputation / alignment / traits** — [reputation-slate](../slates/builds/reputation-slate.md),
  [alignment-religion-slate](../slates/deferred-rpg/alignment-religion-slate.md).
  This build ships the ledger they will project; it computes nothing.
- **Achievements system** — a *deferred readout*, not built here. The
  criterion that distinguishes it from the chronicle is a **surface
  decision** below; an achievement-worthy deed is simply a deed an
  achievements readout will later query by `tag`. (Traits and achievements
  are the same mechanism — named badges from chronicle-pattern thresholds
  — differing only on diegetic-vs-meta register; both deferred.) **When
  built, it should inherit the chronicle's gate** — skew to identity /
  narrative / choice achievements, avoid the completion / grind / time
  types that invite b-lining.
- **Full MQL-queryability** of entries — v1's only reader is the owner's
  own `chronicle` view (an owner-scoped fetch). `tags`/`who` are *designed
  in* so a later readout adds an MQL provider without reshaping the record.
- **Bio editing** — the prose `bio` already exists as a char-gen-seeded
  field; the `chronicle` verb renders it read-only. The deferred
  `records`-verb editing role (char-gen subsystem) is not built here.
- **Per-viewer / others' chronicles** — v1 is self-view only. Viewing
  another character's chronicle (and any disclosure gating) is deferred.
- **Curation / highlight-reel / featured selection** — v1 shows the full
  trail; selection is deferred.
- **Rich content minters** — the lounge firsts (Dave's job, the pizza
  shop), the Gus crossing landmark, etc. land their own `record(...)` calls
  **when that content is built**. This build ships the seam + a few demo
  minters on moments that already fire.
- **NPC chronicles** — v1 is keyed to Avatars (players). The shape stays
  NPC-capable (durable owner key) but no NPC mints in v1.
- **Reaping / permanence policy** — v1 keeps the full trail; trimming is
  deferred.

## Surface decisions

### The identity-impact gate — what earns an entry

**Decision:** an event earns a chronicle entry iff it shapes *who the
character is* — recognized, regarded, aligned, trait-relevant, affiliated,
or part of the story worth telling — **not** iff it is a "feat." This is
an **authoring principle** (documented guidance), **not** an
engine-enforced rule; no automatic event-bus minting.

**Reasoning — chronicle vs. achievements.** Achievements answer *"what
have you done"* (a checklist of feats); the chronicle answers *"who are
you / your story"* (a narrative of identity). They overlap but aren't
equal:
- **Both:** identity-shaping feats — graduated, made guildmaster, met Gus,
  your first real conversation.
- **Achievement-only** (NOT chronicle): completion/grind/skill-flex —
  "100% the map," "100 h played," "no-damage boss."
- **Chronicle-only** (no trophy): quiet identity beats — "Dave gave you a
  job," "you made your first friend," "you took the dark god's bargain."

So the engine never decides what's identity-impactful; **content mints
deliberately at the moments that are.** Achievements, when built, is a
readout over the achievement-tagged subset.

**The gate doubles as the anti-gaming property.** Everything downstream is
*measured from reality* (the chronicle is what you did; reputation is how
others actually reacted), so the metric **is** the reality — "gaming" it
collapses into doing the real thing (Goodhart only bites a *proxy*). And
identity events are intrinsically scarce/organic (you graduate once, meet
Gus once), so they resist farming by nature; the *farmable* categories
(grind, completion %, time-played, kill-counts) are exactly what this gate
**excludes** (they're achievement-only). Recording identity-not-
accomplishment is therefore structurally hard to farm. (The residual
Sybil/collusion attack on *reputation* is real and unsolvable in general —
mitigated, not eliminated, by the eigenvector weighting + prosocial/real-
name posture; that's reputation's problem to bound, not the chronicle's.)

### Atoms by provenance — `deed` and `claim`

**Decision:** two entry kinds, named for provenance. A **deed** is
witnessed (minted by a real event in play, **dated** in game-time — *the
timestamp is the witness*). A **claim** is claimed (a char-gen seed,
**undated**, carrying an authored `order` for prologue sequencing). Do not
fabricate dates for claims; their fuzzy age lives in the prose.

### Entry shape

**Decision:** `ChronicleEntry extends Document`, collection `chronicles`,
indexed on `owner`. Fields:

| Field | Presence | Meaning |
|---|---|---|
| `owner` | always (indexed) | whose chronicle (playerId) |
| `kind` | always | `'claim'` \| `'deed'` |
| `when` | **deeds only** | game-time timestamp (the witness) |
| `order` | **claims only** | authored prologue order |
| `where` | optional | place ref \| null |
| `who` | optional | entity refs — for future readouts (reaction, reputation who-links) |
| `text` | always | rendered line (deed: `ProseApi`; claim: authored) |
| `tags` | optional | **open vocabulary** — query / reaction / achievement hooks |
| `key` | optional | category-first dedup key for `recordOnce` (mint iff no owner entry shares it) |

`tags`/`who` are stored and owner-fetchable but otherwise inert in v1
(designed in for readouts). The record is **dumb** — no per-tag meaning
lives in the substrate.

### Minting — author-driven, single gated entry point; singularity by trigger

**Decision:** content records a deed through one security-gated entry
point (precedent: `RecognitionApi.learnIdentity` as the single sink). No
engine auto-subscription to the event bus. **Whether a deed is once-only
is determined by the trigger, not a universal dedup** — three patterns:

- **Event-singular** (met Gus, graduated): the *trigger* is naturally once.
  "Met X" rides **recognition's first-encounter** (the belief store already
  detects first-sighting) — *no chronicle key needed*.
- **Category-first** ("your first conversation"): an optional
  `recordOnce(key, …)` helper records iff the owner has no existing entry
  with that key (a cheap owner-scoped read on the write path — fine, like
  the belief upsert's find-then-save).
- **Repeatable** ("slew a dragon"): plain `record(…)`, each time.

Append-only on the success path.

### Claim-seed at char-gen — minimal

**Decision:** the chosen origin/aspiration carries a small authored set of
**claim seeds** (`{ text, order }`), minted as `claim` entries at enroll.
Minimal (1–3 per aspiration is enough to prove the prologue). Distinct
from the existing prose `bio` (the voice over the facts) — the bio stays a
separate seeded field, rendered atop the chronicle.

### The reader — the `chronicle` verb

**Decision:** a single-token `chronicle` verb renders the owner's own
chronicle: the prose `bio`, then a **prologue** (claims, by `order`), then
a **timeline** (deeds, by `when`). Read-only, self-only, v1. It subsumes
the *view* role the char-gen subsystem sketched as the deferred `records`
verb; `records`-style bio *editing* stays deferred.

### v1 demo minters — moments that already fire

**Decision:** wire three minters on existing controllers, to prove the
seam and guarantee every character has a timeline:
- **enroll completion** (`EnrollController`) → a founding deed ("Enrolled
  as …").
- **first arrival** into the world → a deed ("Arrived at …"), a
  category-first via `recordOnce`.
- **first `introduce`** (`IntroduceController`) → a deed ("Made your first
  introduction" / "Introduced yourself to …"), a category-first via
  `recordOnce`. (A future "met <specific NPC>" deed would instead be
  *event-singular* off recognition's first-encounter — no key.)

Richer minters (lounge, Dave's job, Gus) are content that lands its own
`record(...)` later — not this build.

### Graduate the slate

**Decision:** move `chronicle-slate.md` from `deferred-rpg/` to `builds/`
— it is re-categorized as platform identity-substrate, not RPG game-design.

## Constraints

- **Document substrate** (persistence rethink Waves 1–2, shipped):
  `ChronicleEntry extends Document` with `collectionName = 'chronicles'`;
  CRUD via the `Document` wrapper (`find`/`save`/`findById`), not raw
  Mongo. Index declared centrally in `PersistenceManager.createIndexes`.
- **One Document per entry, owner-indexed** — never a single growing array
  on the character (the `ContactsMixin` 16 MB / whole-array-rewrite
  anti-precedent; the belief-store made exactly this choice).
- **No Mongo read on any hot path** — v1 has none (mint is a
  low-frequency identity moment; render is on-demand). The first-time check
  is a write-path read only, which is fine.
- **Module placement** — `lib/chronicle/` for the entry class / any mixin;
  `api/` for the gated Api (`SecurityApi.decorateApiClass`). Do not dump at
  `lib/` root. The mixin-vs-Api split for owner state is a planning call;
  default to the thinnest surface that matches the belief-store precedent.
- **No new content hooks in substrate** — the identity-impact gate is an
  authoring doc principle; the engine offers only the `record(...)` seam.
- **Naming** — `chronicle` verb is a single token (no two-word verbs).
  Field naming follows the property/instruction + boolean conventions;
  the entry is plain data (Hydrator-reflectable, like `ContactEntry`).
- **Prose** — deed `text` is generated through `ProseApi`; claim `text` is
  authored.
- **Keep "Saxonberg" out** of any engine identifiers.

## Acceptance criteria

- A `chronicles` Mongo collection exists; `ChronicleEntry extends Document`
  persists one document per entry, indexed on `owner`; entries round-trip
  through the `Document` wrapper.
- A single gated mint entry point records a `deed` (ProseApi-rendered)
  for an owner; plain `record` always appends, while the `recordOnce(key)`
  helper is **idempotent** (a second call with the same owner+key does not
  create a second entry).
- Char-gen seeds `claim` entries from the chosen aspiration/origin; a
  freshly enrolled character has ≥1 claim (prologue) **and** ≥1 founding
  deed (from the enroll minter).
- The three demo minters (enroll, first arrival, first introduce) produce
  deeds; first-arrival and first-introduce do not duplicate on repeat.
- The `chronicle` verb renders self-view: the prose bio, then claims by
  `order`, then deeds by `when`, partitioned (never interleaved).
- `tags` and `who` are persisted and retrievable via an owner-scoped
  fetch (no MQL provider required).
- A subsystem doc `docs/subsystems/chronicle.md` documents the ledger, the
  deed/claim shape, the mint seam + first-time keying, the claim-seed path,
  the `chronicle` verb, and the identity-impact authoring gate (with the
  chronicle-vs-achievements criterion).
- `chronicle-slate.md` is moved to `docs/slates/builds/` and the slate
  index + cross-references are updated.
- Tests cover: entry persistence + owner indexing; mint + first-time
  idempotency; claim-seed at enroll; the `chronicle` render partition;
  deed prose generation.

## Cross-references

- **Seeding slate:** [chronicle-slate](../slates/builds/chronicle-slate.md)
  (→ `builds/` on completion).
- **Architectural precedent:** [belief.md](../subsystems/belief.md) — the
  lazily-persisted owner-indexed `beliefs` collection (dumb store, smart
  consumers); the `learnIdentity` single-sink pattern for the mint seam.
- **Future readouts (deferred consumers):**
  [reputation-slate](../slates/builds/reputation-slate.md) (the chronicle
  root; deeds → esteem/notoriety/traits),
  [alignment-religion-slate](../slates/deferred-rpg/alignment-religion-slate.md)
  (deeds → witnessed Law-axis stance; the deity reads the chronicle);
  achievements (the deferred meta-readout).
- **Integration points:** [char-gen.md](../subsystems/char-gen.md) (claim
  seeds from aspiration; the `bio` field; the deferred `records` verb),
  `EnrollController` / `IntroduceController` (demo minters), `ProseApi`
  (deed text), the `Document` persistence track.
