# Persistence architecture rethink slate (working doc)

> **Status: Waves 1-2 shipped, audit-grounded.** Persistence is split into two
> honest concepts — **`Document`** (persisted JSON: CRUD, no Stuff overhead)
> and **`Stuff`** (a live world entity, *hydrated from* a Document) — with the
> shared persistence machinery extracted to a **neutral core**. As built:
> **`Persistable` is deleted, not refactored** (no inhabitants remain);
> `lib/persistence/Document.ts` is the new base; `User` / `GoogleProfile` /
> `Template` are now `Document`s; and the subsystem doc
> [persistence.md](../../subsystems/persistence.md) has been rewritten to the
> two-track model. Full suite green.
>
> **Remaining: Wave 3 only** — un-Stuffing the marshallers + around-hooks +
> Hydrator into **path-resolved, lazy, re-resolved code modules** (the
> npc-behavior "brain" pattern, decision 5 below). Highest-effort piece;
> scoped separately. Everything above it is done.

> **Audit 2026-08-08 — Wave 3 verified untouched, and its pattern is now
> proven.** Checked against the tree when GitLab #14 was closed here.
>
> - **Still Stuff:** `PersistentHydrator` still `extends Idea`, and
>   `obj/hooks/` still holds `DomainHook.ts` + `hooks.yaml`. Wave 3 has
>   not been started.
> - **The brain pattern it wants to copy is now real and load-bearing** —
>   `lib/behavior/`, lowercase per-verb modules whose sole export is
>   `export const brain = class {…}` (a *named class-expression* so the HMR
>   registry retains it), no class name, no registry, re-resolved per
>   invocation for HMR ([behavior.md](../../subsystems/behavior.md)). So
>   decision 5's "same pattern as npc-behavior" is no longer a proposal to
>   invent in parallel — it is a shipped convention with its own entry in
>   `CLAUDE.md`'s module-category table. **Copy it; don't re-derive it.**
> - **Context that post-dates this slate:** the self-persistence spine
>   (`PersistableMixin` → `holder_snapshots`,
>   [persistence.md](../../subsystems/persistence.md)) landed on top of
>   the two-track model. Wave 3 has to keep it working; check `capture` /
>   `materialize` before touching the Hydrator.

Working slate for the **persistence architecture** — a deliberate rethink
prompted by realizing that *most* of what a platform persists (auth records,
dialogue trees, loot tables, quest defs, lesson content, analytics/event logs,
leaderboards, chat history, audit trails, mail, achievements) is **plain
document data with no game-entity behavior**, while the genuine game-world
entities (rooms, items, NPCs, avatars) are the minority. Today's architecture
has that backwards. Three `Persistable` inhabitants is the cheap moment to fix
it — before dozens of document collections accrue.

The load-bearing decisions:

1. **Two persistence relationships, made into two types.** A **`Document`
   *is* persisted state** — the row *is* the thing. A **`Stuff` is a live
   entity whose persisted form is a `Document`** — snapshot out, hydrate in;
   the Stuff is *never itself a row*. `Persistable` was the hybrid ("a Stuff
   that is also a row") that conflated these; separating them leaves it with
   no inhabitants.

2. **`Document` carries none of the Stuff overhead.** No call-security proxy,
   no instance registry, no lifecycle choreography, no mixin composition. Just
   CRUD (`save`/`find`/`delete`) + the shared field-mapping machinery. A loaded
   `Document` is a plain object you read and drop.

3. **Value-like vs identity-like — the structural reason, not just perf.**
   Documents are **value-like**: two `findById` copies of the same row are
   fine (read, use, drop). Stuff is **identity-like**: a live entity needs one
   canonical instance, which the registry guarantees. `Persistable` forced
   value-shaped data (`User`) into an identity-shaped object it never needed.
   Splitting aligns each type with its actual semantics.

4. **Extract the machinery to a neutral core; don't duplicate it.** The
   original "fold it in" call (see [persistence.md]) conflated *two object
   models* (legitimate) with *two persistence stories* (the real thing to
   avoid). Avoid the second by extraction, not by collapsing the first: one
   persistence-machinery core, consumed by both `Document` directly and the
   Stuff `Hydrator` path.

5. **The one real Stuff-coupling (marshallers + hooks + Hydrator) is for HMR
   — and converges with the path-resolved "brain" model.** These are
   *stateless strategy objects* made Stuff only to ride the clone/HMR
   machinery. They want to become **path-resolved, lazy, re-resolved code
   modules** — the same pattern as NPC brains. Highest-effort piece; defer and
   scope separately; it pulls the same direction as the discovery thread.

See also:

- [docs/subsystems/persistence.md](../../subsystems/persistence.md) — the
  **current** design being revised: `Persistable extends Idea`, the two
  tracks, `PersistenceManager`, around-hooks, the marshaller framework, the
  scalar-default rule. This slate proposes superseding the `Persistable`-as-
  Stuff decision documented there.
- [docs/subsystems/templates.md](../../subsystems/templates.md) — the clone /
  hydrate pipeline; `Template` becomes a `Document` (it's data that clones
  into Stuff). `snapshotToTemplate` / `restoreFromTemplate` persist-back.
- [docs/subsystems/state-model.md](../../subsystems/state-model.md) — Avatar
  self-contained persist-back; Avatar = Stuff whose `Document` is its
  per-entity Template.
- [docs/slates/npc-behavior-slate.md](../builds/npc-behavior-slate.md) — a consumer:
  shared dialogue trees are `Document`s in their own collection (not `domain`,
  not inline). The marshaller/hook → path-resolved-module convergence is the
  same model as this slate's brains.
- [docs/slates/access-slate.md](../tails/access-slate.md) — document access control
  binds at the **Api / collection / lease layer** (the access slate's
  "bind at the core, not per-object"), so `Document` losing the per-object
  shadow gate loses nothing — it moves to where it belonged.

---

## Principle

1. **`Document` = persisted state; `Stuff` = live world participant.** If it
   only needs to *persist*, it's a Document. If it needs to *participate* in
   the world's method/event/shadow/perception machinery, it's a Stuff
   (hydrated from a Document).
2. **`Persistable` is deleted** — the hybrid dissolves into Document + Stuff.
3. **One machinery core, two consumers** (Document directly; Stuff via the
   Hydrator). Extract, don't duplicate.
4. **Documents are value-like; Stuff is identity-like.**
5. **`domain` is for Template documents that clone into Stuff**; every other
   document kind gets its own collection.

---

## The model

### The two relationships

| | `Document` | `Stuff` |
|---|---|---|
| What it is | persisted state — the row *is* the thing | a live world entity |
| Persisted form | itself | a `Document` (a Template, or a per-entity snapshot) |
| Runtime cost | plain object — no proxy/registry/lifecycle | proxied, registered, lifecycle-managed |
| Identity | value-like (copies fine) | identity-like (registry = one canonical instance) |
| Access control | Api / collection / lease layer | per-object security gate + shadows |
| Examples | `User`, `GoogleProfile`, `Template`, dialogue trees, loot tables | rooms, items, NPCs, avatars |

A `Stuff` is **hydrated from** a `Document` (data in, entity out); it persists
by **snapshotting to** a `Document` and saving that. The Stuff is never a row.
(This is *already* how `Avatar.save()` works — `snapshotToTemplate` →
`Template.save()`.)

### Reassignments

- `User` / `GoogleProfile` → **`Document`** (read, used, dropped — never live
  participants; `GoogleProfile` already bypasses its class via raw
  `PersistenceManager` calls).
- `Template` (+ `LeafTemplate` / `ZoneTemplate`) → **`Document`** (a pure data
  carrier the clone pipeline reads; un-Stuffing also removes the never-looked-
  up registry-accumulation leak).
- game-world objects (`Avatar`, rooms, NPCs, …) → **`Stuff`**, hydrated from
  their Template Documents.
- `domain` collection → restated as **Template `Document`s that clone into
  Stuff**; other documents (users, dialogue trees, …) live in their own
  collections.

### What the audit found (grounds the blast radius)

A read-only audit of the current code confirmed:

- **Nothing in production depends on the three `Persistable`s being Stuff** —
  no events, security shadows, registry lookups, mixins, HMR-as-Stuff, or
  `stuffId` reads. `User` is a plain DTO at every call site.
- **The machinery is loosely coupled.** `getAllPersistentFields` /
  `getAllInstructionFields` / `getAllFieldMarshallers` are constructor-static
  prototype walks (zero instance/Stuff coupling — lift as-is).
  `toDocument`/`fromDocument` are plain-object serialization. There is no
  persistence-layer "default" machinery (defaults are class field
  initializers). **Zero production marshalled fields** exist on Persistables.
- **The clone pipeline treats `Template` as pure data** (`.class` /
  `.hydratorClass` / `.data` only) — wouldn't break as a plain Document;
  `_materialize` *simplifies* (drops the `StuffApi.create` ceremony).
- **The only load-bearing Stuff-coupling is marshallers + hooks + the
  Hydrator — purely for HMR**, not game semantics. Stateless strategy objects.

### Blast radius

| Change | Effort | Note |
|---|---|---|
| Delete `Persistable` | **low–medium** | 3 subclasses, none Stuff-reliant; CRUD surface lifts onto `Document` almost verbatim. Touch points: `Application.ts` (`StuffApi.create(() => new User())` → `new User()`), drop the `delete`→`StuffApi.destruct` cascade, `Template._materialize`'s `StuffApi.create` → `new`. Update substrate-flavored tests. |
| Extract the neutral core | **low–medium** | The static prototype-walks move as-is; the one seam to thread is marshaller resolution (`StuffApi.findByTemplatePath`/`singleton`), injected since marshallers stay Stuff (until un-Stuffed). |
| Convert `Template` → `Document` | **low** | Pure data carrier; removes the registry-accumulation leak. The clone *target* stays Stuff. |
| Un-Stuff marshallers / hooks | **medium–high** | The only place Stuff-ness is load-bearing (HMR, not game semantics). Becomes the path-resolved-module pattern. **Defer / scope separately** — the other three proceed without touching it. |

---

## Open questions

1. **The marshaller-resolution seam.** When the machinery moves to a non-Stuff
   core, it still needs to resolve marshaller instances (which remain Stuff
   until un-Stuffed). Injected resolver vs other shape. (Low stakes today —
   zero production marshalled fields.)
2. **Does the CMS authoring + audit/drafts-staging pipeline serve any
   `Document` collection, or only the `domain`/Template track?** Content like
   dialogue trees wants that tooling. (Raised by the npc-behavior config
   thread.)
3. **Marshaller/hook un-Stuffing — defer or bundle?** Lean: defer to its own
   wave; design it as the path-resolved-module pattern (shared with brains).
4. **Naming.** `Document` (vs `Record`, `Doc`, `StoredDoc`) — any collision
   with existing identifiers; how it reads next to `Stuff` / `Idea` / `Template`.
5. **`Document` access control surface.** Confirm the Api/collection/lease
   layer is the right and sufficient home (it should be, per the access slate)
   — and that no current per-object security on `User`/`Template` is silently
   relied upon (audit says none).
6. **Does `Document` get a `stuffId`-equivalent universal id?** Lean: per-
   collection `_id` only; no global registry id (nothing uses it today).

---

## Build order

**Wave 1 — the neutral core + `Document`.** Extract field-aggregation /
marshaller-map / instruction-field walks + `toDocument`/`fromDocument` +
the around-hook registry into a Stuff-independent core. Introduce the
`Document` base (CRUD + the core; no proxy/registry/lifecycle). Marshaller
resolution stays injected.

**Wave 2 — reassign + delete `Persistable`.** Move `User` / `GoogleProfile`
to `Document`; convert `Template` (+ leaf/zone) to `Document`; simplify
`_materialize`; drop the delete→destruct cascade; **delete `Persistable`.**
Update tests. The Stuff `Hydrator` path now consumes the same core.

**Wave 3 (separate, deferred) — un-Stuff marshallers / hooks / Hydrator.**
Re-home them as **path-resolved, lazy, re-resolved code modules** (the brain
pattern), replacing the clone-from-template + `singleton`/`findByTemplatePath`
HMR scheme. Scope and justify on its own; not a prerequisite for Waves 1–2.

---

## What this slate does NOT cover

- **The clone/hydrate pipeline internals** → [templates.md](../../subsystems/templates.md);
  the *target* of a clone stays Stuff and is unaffected. Only the Template
  *descriptor* un-Stuffs.
- **The path-resolved-module mechanism** (marker/discovery/HMR) →
  [npc-behavior-slate.md](../builds/npc-behavior-slate.md) + the registry-aversion
  principle; Wave 3 reuses it, doesn't redefine it.
- **Document access control / leases** → [access-slate.md](../tails/access-slate.md);
  consumed (bind at the Api/collection layer), not redefined.
- **MongoDB schema / indexing** — `createIndexes` is orthogonal to Stuff-ness;
  no change needed beyond per-collection indexes for new Document kinds.

---

## Once shaped into formal requirements

This slate boils down to:

- **`Document` (persisted JSON, CRUD, no Stuff overhead) vs `Stuff` (live
  entity, hydrated from a Document)**; `Persistable` **deleted**, not
  refactored.
- **A neutral persistence-machinery core** consumed by both `Document` and the
  Stuff `Hydrator` — extract, don't duplicate.
- **Reassignments**: `User`/`GoogleProfile`/`Template` → `Document`;
  game-world objects → `Stuff` via Template-Document snapshot; `domain` =
  Template documents only.
- **Audit-grounded blast radius**: delete Persistable / extract core / convert
  Template are low–medium; **un-Stuff marshallers/hooks is the deferred
  higher-effort tail** (HMR-only coupling → the path-resolved-module pattern).
- Tests: a `Document` round-trips with no proxy/registry footprint; `User` and
  `Template` behave identically as plain Documents; the clone pipeline hydrates
  Stuff from a Template-Document unchanged; no registry accumulation from
  materialized Templates; Wave-3 marshallers hot-swap as path-resolved modules.

The marshaller/hook un-Stuffing waits for its own wave and shares the
path-resolved-module design with NPC brains.

---

## Wave 4 (proposed 2026-08-31) — the schema as loaded content

> ## ✅ **BUILT — the schema-docs build, 2026-08-31.**
> Graduated to
> [persistence.md § Collections](../../subsystems/persistence.md) and
> [help.md § Collections projector](../../subsystems/help.md). The
> section below is kept as the *record of what was asked for*; the
> shipped answer differs on one point, recorded at the end.
>
> **Status when raised: captured, not designed.** Raised during the
> boot-time build. It supersedes the "MongoDB schema / indexing — no
> change needed" line in *What this slate does NOT cover* above, which
> was written before anyone wanted the schema to be data.

**The want, in the raiser's words:** *externalize all the DB schema into
YAML docs with their own version histories, and PM just loads whatever
docs are present, like a seeder would.*

### What is a hard-coded table today

Four of them, all in TypeScript, all read by `PersistenceManager`:

| Table | Where | What it decides |
|---|---|---|
| The collection vocabulary | `lib/persistence/Collections.ts` | what names exist |
| Indexes | `PersistenceManager.createIndexes()` | unique/TTL/text, per collection |
| The sandbox policy | `COLLECTION_POLICIES` in `PersistenceManager` | stamp / shadow / pass / refuse |
| The reset policy | `lib/persistence/ResetPolicy.ts` | what a nightly reset does |

A new collection means editing four places in three files, and only the
first is anywhere a reviewer looks.

### What it buys

- **The tables become reviewable.** A diff that says a collection went
  from `pass` to `stamp` is a sentence, not a constant buried in a
  1 600-line file.
- ~~**A pack could declare its own storage.**~~ ⚠ **Struck 2026-08-31 —
  this was wrong.** A content pack cannot create a Mongo collection at
  all, so there was never a rule being violated here. The schema docs
  are **repo files, not pack content**: they seed nothing, they describe
  what the code already writes. Removing this also removes the pressure
  toward runtime extensibility — the set of collections is closed and
  repo-owned, which is what makes generating the vocabulary viable.
- **It closes the resilience slate's commonest failure** — a control
  "designed, documented, given a default, and never connected." A table
  that is loaded is a table you can assert over at boot.

### The two things to settle before building it

- ⚠ **`Collections` is a TYPE, not only data.** The enum is used in type
  position across the tree, and `DocumentKinds` is a closed vocabulary
  the compiler checks. Parsing it from YAML at runtime moves a whole
  class of error from build time to boot time — the opposite of every
  other gate here. The likely honest shape is **YAML as the source and a
  generated TS vocabulary** (the lint-family pattern: the data is
  authored, a build step derives the checkable form, and a gate proves
  they agree) rather than PM parsing YAML with no compile-time trace.
- ⚠ **What does a version history mean under "no migrations ever"?** The
  standing rule is that a rename is a DB drop, so a schema version that
  no migration reads is documentation, not machinery. That may be
  exactly what is wanted — a legible record of what the shape was and
  when it changed — but it should be *said*, so nobody later builds a
  migration runner to consume it.

### Where it would sit

After Wave 3 (marshallers/hooks/Hydrator as path-resolved modules) and
independent of it: both waves are the same move — **stop expressing
persistence policy as TypeScript the framework happens to read.**

---

### ⭐ Decided 2026-08-31 — and the real motivation

**The driver is pedagogy, not tidiness.** The point is to link a
collection to the `Document` class that writes it and to the subsystem
doc that owns it, and then **project the whole thing into the help
system** so a player can read how the persistence layer works. Every
decision below follows from that being the goal.

**The mechanism needs no invention.** PM already reads an in-repo YAML
manifest at a default path at boot — `loadHooks` over
`mud/platform/idea/hooks/hooks.yaml`, `readFileSync` + `YAML.parse`, not
a pack, not a seed, no `content` collection involved. Schema docs read
the same way sit next to that precedent.

| Decision | Ruling |
|---|---|
| **The `Collections` vocabulary** | **Generated from the YAML and committed**, with a lint proving the tree matches. It is the one piece used in *type* position across ~50 files, so parsing it at runtime alone would trade a compile-time error class for a boot-time one. Authored once, checkable at build time — the lint-family pattern applied to data. PM still *loads* the YAML at boot for indexes, policy and metadata. |
| **The field list** | **Not in the doc.** `fieldMeta` is what the Hydrator reflects on; a YAML that restated it would be two copies of one sentence, and the copy that drifts is the one nobody executes. The help projector **harvests** fields from the owner class's `fieldMeta`. ⚠ Consequence accepted: per-FIELD prose then has no home until `fieldMeta` grows one. |
| **Scope** | **The full refactor in one build** — docs, the help projector, the binding gate, indexes, and both policy tables. |

**What the inventory found** (2026-08-31, against the live tree):

- 48 collections. `COLLECTION_POLICIES` and `RESET_DISPOSITIONS` are
  both **complete** and already machine-readable — they are simply
  written in TypeScript. `createIndexes()` is **89 `createIndex` calls
  in one method** (18 unique, 2 TTL, 2 partial, plus text indexes),
  and is the table that is genuinely awkward in code.
- ⭐ **The description is what is missing, not the policy.** Only **4 of
  48** collections carry any prose in `Collections.ts`, and CLAUDE.md's
  orientation list covers **28 of 48**.
- ⭐ `RESET_DISPOSITIONS` already carries a `because:` string on every
  `keep`. Per-collection reasoning partly EXISTS — it just lives where
  only a developer sees it. It migrates rather than being invented.
- ⚠ **The link this build wants to make is currently broken and
  unchecked.** Eleven production `Document` classes name their
  collection with a bare string literal rather than `Collections.X` —
  `User`, `Group`, `Channel`, `Blueprint`, `StoredDocument`,
  `PersistedRecord`, `ParcelEvent`, `DescriptorBank` and the three OAuth
  profiles. CLAUDE.md calls `Collections.ts` the single source of truth;
  nothing enforces it.
- The help side is a clean fit: `HelpCatalogue` already **harvests
  rather than registers**, with two projectors over a uniform
  `HelpTopic`. This is a third. ⚠ It does mean touching
  `@saxonberg/types`: `HelpKind` and `HelpSource.subdivision` are both
  closed unions needing a new member.

**Still open, for the requirements pass:** what "version history" should
mean. These are repo files, so git already gives developers one; the
question is whether a *player* reading the help entry should see a
readable "this changed, and why" — i.e. an authored `history:` block —
or whether git is enough and the help entry carries only current truth.

### ✅ What shipped, and the one place it differs

Built 2026-08-31 (`design/schema-docs`). One authored YAML per
collection at `packages/server/src/schema/`, the three tables generated
and committed, `pnpm lint:schema` binding collection ↔ doc ↔ class ↔
subsystem doc, and a third help projector — `help bank_ledger` reads the
whole thing over a socket.

Two rulings the requirements pass settled:

- **`history:` was declined** (the "still open" question above). These
  are repo files, so git already gives a history, and a fifth authored
  block to keep in sync serves a reader worse than a good `purpose`
  does.
- **PM loads the docs; it does not load them "like a seeder would".**
  The vocabulary is used in TYPE position across ~50 files, so it is
  GENERATED from the docs and committed rather than parsed at boot —
  which keeps the compile-time error a typo produces today. The
  indexes, which have no type surface, genuinely are loaded.

⚠ One count in the survey above was off: `createIndexes()` held **84**
authored index specs, not 89, plus the two derived loops. The shipped
docs carry all 84.

Wave 3 (marshallers / hooks / Hydrator as path-resolved modules) is
untouched and independent.
