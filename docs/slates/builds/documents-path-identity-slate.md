# Documents — the path is the identity, and metadata is not an Idea

> **Status:** PARTIAL
> **Left:** ~~the five material-adjacent families → documents~~ (done — load-on-use round two, MR !575) · a shared Idea-catalogue base at the third consumer · materials with no roster warm at all (§ Recorded, not decided)
> **Size:** tails

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

⭐ **Shipped by MR !560 (2026-11-10)** — the Idea-or-document test, `naturalKey`
gone, the `keys` catalogue card + unique path, ten families → documents,
the Ideas that stay Ideas loading on reach, and the aroma directories. See
[document-store.md](../../subsystems/document-store.md) § *Idea or document —
the test*, § *The catalogue card* and § *Resident by construction —
`DocumentCatalogue`*.

## ~~What is left — the material-adjacent families~~ ✅ done

✅ **Shipped by load-on-use round two (MR !575, 2026-11-11):** all five
are document kinds (`cleanser`, `maturation-profile`, `fraction-schedule`,
`fabric`, `dyestuff` — the last keyed by its `material` card) with their
Idea classes, statics and boot lines gone; a garment cites its fabric by
path, a vessel holds its profile's path behind a restore door. See
[document-store.md](../../subsystems/document-store.md)'s kinds table and
§ Resident by construction. The table below is the plan-time record.

These waited for material decomposition (now merged). Each is the same
recipe the shipped ten followed: a document kind in `DocumentKinds` with a
`catalogue:`; a value class in `lib/` for the data; a per-family
`DocumentCatalogue` singleton reached through its domain Api; row citations
become paths; the Idea class goes.

| family | rows | today | note |
|---|---|---|---|
| `Cleanser` | 16 | singleton Idea, cited by a material's `cleanser:` | the citation sits in the Detergency facet now |
| `MaturationProfile` | 37 | singleton Idea + catalogue, warm-only | document + value class; `rateAt`/`transformFor` move to the value class |
| `FractionSchedule` | 10 | singleton Idea + catalogue, warm-only | same |
| `Fabric` | 5 | singleton Idea + catalogue | material-adjacent |
| `Dyestuff` (trade-dyeing) | 4 | singleton Idea + catalogue | a pack's kind needs a platform `DocumentKinds` entry |

## Recorded, not decided

- An NPC's `archetype:` (a role) and an archetype document (a room) are two
  meanings of one word.
- Discipline keys are a flat namespace across five roots — accepted (D11);
  namespace them when a custom discipline needs it.
- **A shared Idea-catalogue base** (load-on-use round two) —
  `MaterialCatalogue` and `ConditionCatalogue` carry the same
  `ensure`/`need`/`peek`/`ensureRoster` doors by hand; promote them to a
  base at the third consumer, not before.
- **Materials as a per-row-only family with no roster warm at all** —
  retire `MaterialCatalogue.warm()` once the wiki's `<materials>` listing
  and the pattern's metal match read the document store's cards (or some
  other index) instead of standing every material row up.
