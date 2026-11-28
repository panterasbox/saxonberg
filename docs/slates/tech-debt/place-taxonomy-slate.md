# The place taxonomy — Place, Locale, Location

> **Status: CLASSES RENAMED (cleanliness MR !380, 2026-10-18) · PATH
> SEGMENT RENAMED (`refactor/place-path`, 2026-11-28).**
> **Left:** the material folder sweep, now carried by the IDEAS pass of the
> template taxonomy refactor (§ The material folders) · the `*Location*`
> identifiers that mean the root rather than the plan-laid kind, and the
> `location` StuffKind value (§ What the path rename left) · ✅
> `VoidLocation` → `Void` (B53).
> **Size:** a tail — a decided list.

## The decision (user, 2026-10-18)

> *"I think of the stuff taxonomy in the 'person place or thing' terms you
> learn as a child."* A noun is a person, place, thing or idea; the
> branches are `Agent` (person — and wolves; agent-first is how the
> predicates already work), **`Place`**, `Thing` (kept — *"it fits
> Stuff"*), `Idea`.

Rules the user set on the way:

1. **One descriptor at most** — `Foo` / `PersistentFoo` (or `SingletonBar`):
   no stacked prefixes (`PersistentSingletonCartesianLocation` was refused:
   it doesn't scale — every new axis would lengthen every name) and no
   wholesale coined jargon (Stead / Demesne / Tenement was "too far").
2. **The descriptor is `Persistent`**; the identity axis (one place vs one
   of many) lives in the NOUN — the precedent is `Cast` / `Extra` for agents
   instead of a `Singleton` adjective.
3. **Words must fit interior and exterior alike** (Landmark / Tract were
   refused: outdoor words).
4. **Spherical places must not say `Location` alone** if it implies
   cartesian: cartesian is the unprefixed default, spherical says so.

| | transient | kept |
|---|---|---|
| one particular place (one row = one place) | **`Locale`** | **`PersistentLocale`** ✅ shipped (cleanliness, `platform/place/PersistentLocale.ts`) |
| one of many, laid out to a plan | **`Location`** | **`PersistentLocation`** |
| spherical, one place | **`SphericalLocale`** | `PersistentSphericalLocale` (when needed) |
| spherical, one of many | **`SphericalLocation`** | `PersistentSphericalLocation` (when needed) |

⭐ Mnemonic (the user: *"I'll never remember which is which"*): you
**visit** a locale; you **fill** a location. Each class header's first
line says it.

## The rename map (measured 2026-10-18; the class rows ✅ done in !380)

| today | becomes | reach |
|---|---|---|
| `lib/stuff/Location` (the root) | `Place`; `isLocation()` → `isPlace()` | 21 importers, 5 predicate calls; the four branch predicates read person · place · thing · idea |
| `platform/place/SingletonCartesianLocation` | `Locale` | ~196 files |
| the instanceable `platform/place/CartesianLocation` (its lib base too) | `Location` | rows naming it; the lib geometry root's name to settle (`CartesianPlace`?) |
| `platform/place/FurnishableRoom` | `PersistentLocation` | 48 files |
| `platform/place/SingletonSphericalLocation` | `SphericalLocale` | 1 row |
| `platform/place/SphericalLocation` | unchanged | — |
| `platform/place/VoidLocation` | `Void` ✅ — the one place with no coordinates, on bare `Place` (B53) | 14 files |
| `PersistentCartesianLocation` | `PersistentLocale` | ✅ done (14 rows) |
| `Field`, `MineRoom` (minted, kept, keyed) | keep their names, the `PersistentLocation` shape | — |
| `Wood`, `OpenWorking`, `Turbary` (authored, kept) | keep their names, the `PersistentLocale` shape | — |
| path segment `/platform/place/` | `/platform/place/`? | 175 rows name a class there; 101 content rows live under a `location/` path — whether the CONTENT segment renames too is the sweep's call |

- A DB drop, no migration (no users, no data).
- ⚠ The sibling builds (rubber, storage-and-ice) name these classes: the
  rename lands in cleanliness's MR (user, 2026-10-18 — after the
  compaction), so whoever merges after re-applies it to their rows by hand
  (`docs/plans/cleanliness-note-to-siblings.md` should say so).
- ⚠ The spatial vocabulary keeps `placement` (`on`·`in`·`from`), the
  `Placing` mixin and the `place` verb: a Place is the NOUN, a placement the
  RELATION — the root's header says so.
- `PersistableLocations.test` walks `platform/place/` — it must walk the
  new directory if the segment renames.

## Done in !380 — and what was left

✅ `lib/stuff/Location` → `Place` (`isPlace()`), `CartesianLocation` →
`Location` (lib geometry + platform twin, one shared name),
`SingletonCartesianLocation` → `Locale` (both tiers), `FurnishableRoom` →
`PersistentLocation`, `SingletonSphericalLocation` → `SphericalLocale`;
rows, tests, gates, docs. A scripted rename over ~690 files; the runtime
branch-file allowlist (`Stuff._registerTopLevelBranch`) and four gates
(`lint:module-scope`, `lint:ground`'s root-class probe, the field-meta
golden, Studio's base list) named the root by string and were fixed by hand.

✅ **The path segment** — `/location/` → `/place/`, every directory and every
reference (2026-11-28, `refactor/place-path`, while all four builds were
idle; the owner: *"do the room rename now while things are quiet"*). 81
directories moved — the branch folders (`platform/place/`, every
`<root>/place/` content tree, every pack's `src/place/`), the
`lib/place/` subsystem folder, `platform/idea/place/` (the zone classes) —
plus the two folder-zone rows named for their folder
(`…/seznick-house/place.yaml`, `…/rejection/place.yaml`). A script did it
and a second script proved the branch equals master plus that transform,
file by file, listing the hand edits (path joins and bare `place/`
prefixes in tests, the gates' branch list). A DB drop, no migration.

### What the path rename left — deliberately

The MR was kept to paths so it could be reviewed as a transform. Not
renamed, and each is a decision rather than a substitution:

- **`Location` the class** — it is the plan-laid kind (*you fill a
  location*), so it keeps its name by this slate's own table.
- **Identifiers that mean the ROOT** — `startLocation`,
  `operatingLocations`, `addLocation`, `mustBeInLocation`,
  `LocationGraphRegistry` / `location_graph`, `LocationZone`, the
  `check-location-*` gates, `location.md` / `location-graph.md`. Each needs
  a read: some mean any place (→ `Place`), some mean the plan-laid kind.
- **The `location` StuffKind value** (`Stuff.stuffKind()`, the card's
  `subjectKind`, the client's layout switch) — it reads in MQL and on the
  wire, so it is vocabulary, not a path.
- **The MML `<location>` tag and the prose `location` filter** — authored
  vocabulary.
- **Media keys** (`illustration: location/bar.png`) — keys in the media
  bucket, not template paths.

## ⭐ The material folders — the same sweep (owner, 2026-11-07)

The material decomposition build
(shipped in MR !555 — [race.md § Material substrate](../../subsystems/race.md);
[slate](./material-decomposition-slate.md) § 7¾) gives every material a KIND — organic or mineral,
then metal, stone, wood, food and the rest — and **defers moving the rows into folders that match
their kind** to this sweep. The owner: *"we'll do em together so it's less expensive"* — both are
path renames whose cost is the same thing, rewriting every reference in every pack, so one pass with
one rewrite tool and one drop-the-database is cheaper than two.

- **What moves:** the material rows under `/stuff/idea/material/` (199 sit at its top, unfoldered) and
  the packs' own `<root>/idea/material/` rows, each into its kind's folder (`…/material/mineral/metal/
  iron`, `…/material/organic/plant/wood/oak` — the folder tree mirrors the class tree).
- **What references them:** every `_materialPath`, `interiorMaterial`, `extends:`, recipe input,
  composition entry and test that names a material path. `MaterialCatalogue` selects by the
  `/idea/material/` infix and the class, so the warm itself is unaffected.
- **Order:** ⚠ moved (2026-11-28): no longer with the path segment, which shipped alone so it could be
  reviewed as a mechanical transform. Sorting 199 materials into kind folders is classification, which
  is taxonomy work, so it rides with the **ideas pass** of the template taxonomy refactor and reuses the
  path-rename script.

