# Documents — the path is the identity, and metadata is not an Idea

> **Status:** UNBUILT
> **Left:** the Idea-or-Document test, written down · `naturalKey` removed from every kind ·
> one uniform secondary-key shape (`keys`) on every document, with one index ·
> a unique `{path}` index · the vocabulary Ideas → documents ·
> Operation, Topic, Joint → documents · the Ideas that stay Ideas load on use ·
> the maturation / fractionation / fabric / dyestuff / cleanser rows, after material decomposition
> **Size:** a build (refactor/sweep, kernel-led)

Opened 2026-11-08 out of the smell-and-taste review (MR !531) and its
precursor fix (MR !541, merged `a4fe4550a`). Two owner rulings frame it.

**On Ideas** (2026-11-07): *"Ideas are MQL addressable and they carry
mutable state, documents just hold a buncha metadata."* An `aroma` Idea was
metadata pretending to be a thing, and became a document.

**On keys** (2026-11-08), of `DocumentApi.readByKey`: *"documents have keys,
it's the path. whats wrong with not just reading a document by its path. if
you need a scoped namespace for unique identifiers, the pathing how you get
that."* !541 removed `readByKey` and made aromas and name banks name each
other by path; this slate finishes the job for every kind.

**And a requirement nobody uses yet** (2026-11-08): *"one big collection with
a bunch of documents that all need to possibly be indexed but have totally
different shapes. so we need some basic shape imposed on them for the
creation of mongo indexes to make certain kinds of queries performant. that
is a real requirement even if nothing is using it yet. but that's different
than this pack installer mechanism."*

See also: [scan-sweep-slate](./scan-sweep-slate.md) (Part 2's *fourteen
catalogues still booted* and ruling 1 on typed-word dictionaries — this
build takes the ones its families own) ·
[document-store-tiering-slate](../tails/document-store-tiering-slate.md)
(its time-paged press index is the first consumer of § 3) ·
[vocabularies-to-rows-slate](./vocabularies-to-rows-slate.md) (where
DirtKind's move was recorded) ·
[document-store.md](../../subsystems/document-store.md) ·
[content-packs.md](../../subsystems/content-packs.md).

---

## 1. The test: Idea or Document

A row family is an **Idea** when any one of these holds; otherwise it is a
**document kind**:

1. something **writes** it after it loads (it carries mutable state);
2. something **acts on** it — it is shadowable, a command targets it, it has
   behavior that varies by class;
3. ⭐ it could be **a link in a query chain** — an MQL path a person would
   write to reach something else (`here:business:owner`,
   `goodkin:branches:terminus:manager`), whether or not a controller targets
   the Idea itself today.

⭐ Limb 3 is the owner's correction (2026-11-08) to a first pass that asked
only *"does anything write it today"*. The governance and administration
layer has no command palette yet, and its commands will reach **through
institutions and referents** more than through things, agents or places.
For now MQL is assumed to be the targeting mechanism for all of it; whether
administration wants a different kind of expression is open and out of
scope here.

A document may still carry **pure computation over its own data** — a value
class in `lib/` (the `Aroma` precedent) holds `rateAt(tempK)` as happily as a
threshold. Computation is not behavior in the limb-2 sense; behavior that
varies by CLASS is.

## 2. A document is named by its path — `naturalKey` goes

Today a `DocumentKindSpec.naturalKey` makes a kind a **flat namespace across
every pack**: the installer injects the key from the basename, refuses a
second claimant, and Mongo holds a unique index on `{kind, data.<key>}`.
That is a second identity beside the path, and !541 removed it from `aroma`
and `name-bank`. Four kinds still carry one:

| kind | rows | the key | how it is read | how it is cited |
|---|---|---|---|---|
| `emote` | 34 | `verb` | `SoulCatalogue`, all at boot | the verb a player types |
| `recipe` | 195 | `recipeId` | `RecipeCatalogue`, all at boot | the word a player types (`make …`), `findByKeyword` |
| `blueprint` | 9 | `blueprintId` | `BlueprintCatalogue`, all at boot | by id |
| `archetype` | 21 | `archetypeId` | `ArchetypeCatalogue`, all at boot | listed whole (`survey`), by id — no row cites one by path |

⚠ The 109 `archetype:` fields on NPC rows are a **different concept** (a
person's role — `barkeep`, `collier`); none of their values names an
archetype document (`bedroom`, `kitchen`). The build should not touch them,
and the requirements may want to say whether two meanings of one word is
itself a naming defect.

**The shape of the answer** (to be agreed in requirements):

- Every document's identity is its path. `naturalKey` is deleted from
  `DocumentKindSpec`, the installer's flat-key strategy goes, and so do the
  four `{kind, data.<key>}` unique indexes.
- A **typed word** (a verb, a recipe word) is resolved through an index,
  exactly as command views resolve verbs: path-keyed documents plus a word
  index, **built lazily on first use** (scan-sweep ruling 1).
- What the flat key used to guarantee — *a word means one thing* — becomes a
  **collision check on the word**, which is verb-collision-ladder territory
  ([command-spec.md](../../subsystems/command-spec.md)), not a storage key. Where
  that check lives is open (Q3).
- A reference an author writes **names the path** — the !541 rule, now for
  every kind.

⭐ **Also found (2026-11-08):** the `documents` collection's `{path: 1}` index
is **not unique**. If the path is the identity, the store should say so: a
unique index on `path`.

## 3. ⭐ One shape for secondary keys, on every document

**The requirement:** the store is one collection of documents with nothing
in common but `path`, `kind`, `owner` and `data`. Some will need to be found
by something other than their path, fast — *"search `/doc/recipes/*` for the
document with key = 'french'"*. Nothing needs it yet; the press archive
already full-scans and sorts in JS
([document-store-tiering-slate](../tails/document-store-tiering-slate.md)
§ Sequencing 1), so there is a first consumer waiting.

⚠ **This is not the installer's flat-key mechanism** (owner). That one is a
uniqueness claim across packs, and § 2 removes it. This one is a query
index, uniqueness not implied.

**Sketch** (a starting point for requirements, not a decision):

```yaml
# any document
keys:
  cuisine: french
  station: hearth
data: { … }        # whatever shape the kind has
```

- `keys` is a reserved top-level field beside `data`: a small map of scalar
  values (or arrays of scalars, for tags).
- Stored so ONE index serves every key on every kind. Two ways, both open on
  Atlas (**Mongo 8.0.37**, checked 2026-11-08):
  - **attribute pattern** — `keys: [{k, v}, …]` with
    `{ 'keys.k': 1, 'keys.v': 1, path: 1 }`;
  - **compound wildcard** (Mongo 7.0+) — `keys: {…}` as authored, with
    `{ 'keys.$**': 1, path: 1 }`.
- A query is a path prefix plus key equality:
  `DocumentApi.find('/stuff/recipes/', { cuisine: 'french' })`. The path
  stays the identity; `keys` only finds.
- The press archive's time-paged read (`publishedAt`) is the first consumer
  and decides whether range queries on a key are in scope (Q2).

## 4. The Ideas that become documents

Verdicts by § 1, from the 2026-11-08 survey (class headers, row counts, a
search for writers — consumers still to be traced per family in the plan):

| family | rows | today | verdict | note |
|---|---|---|---|---|
| `DirtKind` | 11 | singleton Idea by path, `key` = path leaf | document | ⚠ same bug aroma had: a second pack cannot ship a dirt |
| `Cleanser` | 16 | singleton Idea, cited by a material's `cleanser:` | document | ⏳ after material decomposition, which wraps the citation in a Detergency facet |
| `Form` | 19 | singleton Idea by path | document | a typed word (`shape mug`) → lazy word index |
| `HelpConcept` | 17 | Idea, harvested into help | document | help is already document-shaped |
| `Placement` | 3 | Idea, `PlacementCatalogue` | document | a typed word (`put … on`) → lazy word index |
| `PumpMechanism` | 2 | singleton Idea by path | document | |
| `Operation` | 5 | pure-data leaf, `OperationCatalogue` at boot | document | recipe-shaped (owner, 2026-11-08) |
| `Topic` | 38 | pure-data leaf, `TopicCatalogue` at boot | document | message-filter label text; no query goes through it |
| `Joint` | 21 | pure-data leaf, `JointCatalogue` | document | recipe-shaped |
| `MaturationProfile` | 37 | singleton Idea + catalogue, warm-only | document + value class | ⏳ after material decomposition; `rateAt`/`transformFor` move to the value class |
| `FractionSchedule` | 10 | singleton Idea + catalogue, warm-only | document + value class | ⏳ same |
| `Fabric` | 5 | singleton Idea + catalogue | document | ⏳ material-adjacent |
| `Dyestuff` (trade-dyeing) | 4 | singleton Idea + catalogue | document | ⏳ material-adjacent; a pack's kind needs a platform `DocumentKinds` entry |
| `CombatFormation` | 4 | singleton Idea, policy presets | **open (Q5)** | presets a party adopts; formation changes run through *coup governance* |

Each conversion is the aroma recipe: a document kind; a value class in
`lib/` for the class that held the data; consumers read by path; row
citations become paths; the catalogue becomes load-on-use or a lazy word
index; the Idea class goes.

## 5. The Ideas that stay Ideas — load on use

By limb 3 these are links in query chains for the governance palette, and
stay Ideas (owner, 2026-11-08):

| family | rows | today |
|---|---|---|
| `Discipline` | 99 | pure-data leaf, `DisciplineCatalogue` scans at boot |
| `Spell` | 22 | pure-data leaf, `SpellCatalogue` scans at boot — queryable (owner) |
| `Corpo` / `Brand` | 6 / 11 | pure-data leaves, `CorpoCatalogue` scans at boot |
| `Government` | 5 | pure-data leaf, `GovernmentCatalogue` scans at boot |

They are read today **straight from `template.data`** by a catalogue that
scans at boot and never stands them up as live Stuff — so they are Ideas
in name and documents in behavior. Staying Ideas means the opposite fix:
**they load as live Ideas when something reaches them** (a holder citing
one, MQL resolving one, a typed word through a lazy index), and the boot
scans go (owner: *yes*, 2026-11-08). This is the scan-sweep Part 2 item for
these five catalogues; the other booted catalogues (Material, Biome,
Condition, AddressRegistry) stay the scan-sweep slate's.

## Reuse ledger for the plan

| concept | already does it | reuse / generalize |
|---|---|---|
| a document kind | `DocumentKinds` + the installer's per-kind strategies | reuse — one entry per new kind |
| read by path | `DocumentApi.read` | reuse; `readByKey` is gone (!541) |
| a value class over a document | `lib/perception/Aroma.ts` (cache, `ensure`, `resolve`, `settling`) | generalize the pattern, not the class |
| a word → document index | `CommandLogic`'s command-view verb resolution | generalize for typed-word kinds |
| lazy dictionary | scan-sweep ruling 1; `ReadingCatalogue` (lazy, booted anyway) | reuse |
| document-path citation check | `lint:census` clause (g), `DOCUMENT_PATH_FIELDS` (!541) | extend with each converted field |
| aroma citation check | `lint:aromas` | the precedent for a per-kind citation lint |
| boot-entry ratchet | `lint:boot-entries` | ratchet down as catalogues stop booting |
| index creation | `PersistenceManager` per-kind partial unique indexes from `naturalKey` | replaced by the one `keys` index + unique `path` |

## Collisions and sequencing

- **Build-2 (controllers-are-io)** — merged 2026-11-08. No longer a collision.
- **Material decomposition** (planned, `reqs/material-decomposition`) leaves
  `MaterialCatalogue` unchanged, but wraps the cleanser citation in a
  Detergency facet and defers `MATURATION_MECHANISMS` to its own slate § 7.
  Cleanser, MaturationProfile, FractionSchedule, Fabric and Dyestuff convert
  **after it merges** — or, if this build goes first, the material build
  rebases onto document-path citations. Decide in requirements (Q6).
- **Document-store tiering** — its press-archive index becomes § 3's first
  consumer; its `release` `onVanish` and `descriptor-bank` findings stay
  that slate's.
- **Aroma directories** — the owner's wish from !531 is now a file move
  (directories under `aromas/` are part of the path), but it rewrites every
  citation path. Fold it in here or leave it (Q7).

## Open questions

1. **`keys` authoring.** May a document author any key, or only the keys its
   kind declares (the kind projecting from `data`)? Free keys are the more
   expressive (lens 2); declared keys make the index's contents knowable.
2. **What `keys` must answer.** Equality only, or ranges and sort too (the
   press archive's `publishedAt` wants a time-ordered page)? That decides
   between the attribute pattern and a compound wildcard index.
3. **Where the typed-word collision check lives** once the installer stops
   enforcing a flat key — the installer, a lint, or the word index itself
   refusing at first build.
4. **Does any scope need uniqueness on a key**, beyond the path?
5. **`CombatFormation`** — a preset is data, but a party *adopts* one and a
   change of formation runs through governance (the coup). Is it a link a
   governance query goes through (stay an Idea) or vocabulary (document)?
6. **Order against material decomposition** (above).
7. **Aroma directories** — in this build or not?
</content>
</invoke>
