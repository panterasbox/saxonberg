# Document-store tiering slate — the store holds two things, and indexes for one

> **Status: PARTIAL** — the store ships whole: the path-addressed tree,
> the closed `DocumentKinds` vocabulary (15 kinds), `DocumentApi`, the
> parcel-title gate (`canAtPath`), the command-view code gate, the pack
> installer's per-kind strategies, and the per-kind partial unique
> indexes for natural-keyed kinds →
> [document-store.md](../../subsystems/document-store.md),
> [content-packs.md](../../subsystems/content-packs.md)
> **Left:** a compound index for time-paged reads by kind (the press
> archive full-scans and sorts in JS today) · `release`'s
> `onVanish: 'delete'`, which its own neighbours' comments argue against ·
> `descriptor-bank`, the one unit the collapse programme skipped · the
> **counter-test** — the written rule says what belongs in the store and
> never what has outgrown it
> **Size:** a tail

**Captured 2026-09-23**, out of the streamer-registry scoping
([streamer-registry-slate](../builds/streamer-registry-slate.md)), where
the question *"should this be a document kind or a collection?"* sent
the conversation through the store's own rule and turned up three loose
ends on the way back.

Related: [persistence.md](../../subsystems/persistence.md) (§ Collections
— where the counter-test should land),
[content-pack-units.md](./content-pack-units.md) (⭐ **the unit registry
that owns the collapse programme** — its `descriptor-bank` row is the
one this slate is about), [press.md](../../subsystems/press.md) (the
archive read that exposed the index gap).

## The argument

The store's rule is written down, in `documents.yaml`, justifying the
release move:

> Releases live here rather than in a collection of their own: they are
> **owner-scoped content with a place**, and **nobody queries them across
> jurisdictions**.

That rule is sound and the tree is correctly populated. But the store
has since grown a second population the rule never contemplated, and
**`onVanish` is already the taxonomy that separates them:**

| | kinds | shape |
|---|---|---|
| `delete` (8) | `msh` `emote` `recipe` `name-bank` `blueprint` `command-view` `archetype` — **and `release`** | **bounded authored vocabularies** — pack-shipped, warmed once at boot into a catalogue, read from memory after |
| `keep` (7) | `water-right` `herd` `fishery` `bill-of-lading` `warehouse-receipt` `instrument` `rate-card` | **unbounded filed records** — runtime-written, grow with play, never warmed, read by prefix |

Seven of the eight `listOfKind` call sites are boot warms of the top
row, and a full-kind scan once per boot is exactly right for a bounded
vocabulary. **The store carries both populations under one pair of
indexes (`{path:1}`, `{kind:1}`), and only the top row is served by
that.**

## ⭐ Finding 1 — `release` is on the wrong side of the line, twice

It is runtime-filed and unbounded like the bottom row, but sits in the
top row, and **the archive read already does what the rule forbids.**
`PressLogic.archiveImpl` loads every release in the world via
`listOfKind`, then filters by realm and kind, sorts by `publishedAt` and
slices a cursor page — in JavaScript. Its own comment is candid:

> Filtering moved from a Mongo query to a JS filter over the tree read —
> the same `documents` full-scan `findByPrefix` already does **for a
> store this size**.

⚠ *"For a store this size"* is a dated claim by construction. The
`{kind:1}` index exists to make that survivable, and the schema doc says
it "replaced the retired `bulletins` scan" — so this kind had a
collection once already.

**And `onVanish: 'delete'` contradicts its own reset policy** (`keep`:
*"the front door reads them without an account"*). The `water-right`
comment makes the argument and then does not apply it back:

> `release`'s `delete` is safe only because nothing files a release from
> a pack either.

That is a guarantee about today's packs, not a property of the kind. A
published press release should be `keep` for the same reason a water
right is.

## ⭐ Finding 2 — `descriptor-bank` is the unit the collapse skipped

[content-pack-units.md](./content-pack-units.md)'s unit registry marks a
**collapse programme**: `recipe`, `emote`, `name-bank`, `blueprint`,
`command-view` and `archetype` all moved out of their own collections
into `documents`. `name-bank`'s row reads `name_banks` → documents,
`✅ → 🔨 collapse`.

**`descriptor-bank` sits in the same table marked `✅`, with no collapse
and no stated reason** — and it is field-for-field `name-bank`:

| | `name-bank` | `descriptor_banks` |
|---|---|---|
| source | pack-installed (`name-banks/*.yaml`) | pack-installed (`descriptors/*.yaml`, the `arcana` pack) |
| key | flat natural key (`key`) | flat natural key (`key`), unique |
| read | one `listOfKind` fills the cache | by-key warm at boot |
| written from play | never | never |
| reset | — | `keep` |

⚠ **This is an inconsistency, not a bug.** Nothing is broken and the
collection works. The cost is two mechanisms for one shape — a pack unit
whose apply strategy is hand-written in `PackLogic` where its twin gets
the declared-kind path for free. Folding it deletes a collection, a
schema doc and a `Document` subclass in exchange for one
`DocumentKinds` entry.

⚠ **`lint:descriptors`** (disjointness against the materials vocabulary,
both directions) runs over authored files at build time and is
indifferent to where the rows land — **confirm that before moving
anything**, because it is the one gate that would notice.

## Finding 3 — the written rule has no counter-test

`documents.yaml` says what belongs in the store. **Nothing anywhere says
what has outgrown it**, which is why the press archive drifted into a
JS full-scan without anyone crossing a stated line. The missing half,
to land in [persistence.md](../../subsystems/persistence.md) § Collections:

> …and it stays there while every read is `get(path)` or `list(prefix)`.
> **A kind that must be queried by a data field across jurisdictions has
> outgrown the store — and the answer is an INDEX before it is a
> collection.**

## ⚠ What this slate explicitly does NOT propose

**Moving the filed records out.** The prefix structure is doing real
security and semantic work, and the kind comments argue it well: a
`herd` lives under the ranching trade's branch rather than the owner's
*specifically so the subject cannot rewrite its own pedigree* (*"you
file, you do not hold the pen"*, with the Coates's Herd Book precedent);
a `bill-of-lading` lives under the filing carrier's branch so a depot's
records structurally cover exactly what it handled. A collection would
buy a secondary index and throw both away.

⭐ **A secondary index is all a collection would buy here — so add the
index.** The machinery exists: `PersistenceManager` already builds
per-kind partial unique indexes from `DocumentKindSpec.naturalKey`.

## ⚠ The one to watch

**`bill-of-lading`.** Its own comment names **market share** as the datum
it exists for, and `rate-card`'s names **antitrust evidence** — both
cross-carrier aggregations over every carrier's prefix, not a
`list(prefix)`. Neither is written yet, so nothing is broken; but when
logistics D12 is built that read arrives, and it is the press archive's
shape exactly. ⭐ **Decide the indexing answer then, rather than
discovering it in a JS filter a second time.**

`warehouse-receipt` carries a quieter version: it is a document of
**title**, transferable by endorsement, so *"which receipts do I hold"*
is a by-holder query across every bailee's branch.

## Sequencing

Three independent pieces; any order, none blocking.

1. **The index + the press archive.** `{kind: 1, 'data.publishedAt': -1}`
   partial on kind, and `archiveImpl` querying it instead of filtering
   a full read. The only one with a measurable payoff today.
2. **`release` → `onVanish: 'keep'`.** A one-line table edit, and the
   argument is already written in its neighbours.
3. **`descriptor-bank` folded into a declared kind** — ⚠ verify
   `lint:descriptors` first. ⭐ Its next sweep should also add a pointer
   to this slate from the `descriptor-bank` row in
   [content-pack-units.md](./content-pack-units.md); that row is left
   untouched here rather than raced.

Plus the counter-test sentence into `persistence.md`, which can ride any
of the three.

## Open question

**Is the two-population split worth naming in the store's own doc**, or
is `onVanish` enough of a tell on its own? A reader today has to infer
the tiering from a policy field whose stated purpose is *what happens
when a pack file vanishes*. Naming it would make the counter-test
obvious rather than remembered.
