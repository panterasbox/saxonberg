# The place taxonomy — Place, Locale, Location

> **Status: DECIDED (user, 2026-10-18, the cleanliness MR review), RENAME UNBUILT.**
> **Left:** the rename — `Location` → `Place` (the root), the Locale and
> Location pairs (cartesian and spherical), `FurnishableRoom` →
> `PersistentLocation` · the `/platform/location/` path segment.
> **Size:** a build (the user: to be done right after the context compaction).

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
| one particular place (one row = one place) | **`Locale`** | **`PersistentLocale`** ✅ shipped (cleanliness, `platform/location/PersistentLocale.ts`) |
| one of many, laid out to a plan | **`Location`** | **`PersistentLocation`** |
| spherical, one place | **`SphericalLocale`** | `PersistentSphericalLocale` (when needed) |
| spherical, one of many | **`SphericalLocation`** | `PersistentSphericalLocation` (when needed) |

⭐ Mnemonic (the user: *"I'll never remember which is which"*): you
**visit** a locale; you **fill** a location. Each class header's first
line says it.

## The rename map (measured 2026-10-18)

| today | becomes | reach |
|---|---|---|
| `lib/stuff/Location` (the root) | `Place`; `isLocation()` → `isPlace()` | 21 importers, 5 predicate calls; the four branch predicates read person · place · thing · idea |
| `platform/location/SingletonCartesianLocation` | `Locale` | ~196 files |
| the instanceable `platform/location/CartesianLocation` (its lib base too) | `Location` | rows naming it; the lib geometry root's name to settle (`CartesianPlace`?) |
| `platform/location/FurnishableRoom` | `PersistentLocation` | 48 files |
| `platform/location/SingletonSphericalLocation` | `SphericalLocale` | 1 row |
| `platform/location/SphericalLocation` | unchanged | — |
| `PersistentCartesianLocation` | `PersistentLocale` | ✅ done (14 rows) |
| `Field`, `MineRoom` (minted, kept, keyed) | keep their names, the `PersistentLocation` shape | — |
| `Wood`, `OpenWorking`, `Turbary` (authored, kept) | keep their names, the `PersistentLocale` shape | — |
| path segment `/platform/location/` | `/platform/place/`? | 175 rows name a class there; 101 content rows live under a `location/` path — whether the CONTENT segment renames too is the sweep's call |

- A DB drop, no migration (no users, no data).
- ⚠ The sibling builds (rubber, storage-and-ice) name these classes: the
  rename lands in cleanliness's MR (user, 2026-10-18 — after the
  compaction), so whoever merges after re-applies it to their rows by hand
  (`docs/plans/cleanliness-note-to-siblings.md` should say so).
- ⚠ The spatial vocabulary keeps `placement` (`on`·`in`·`from`), the
  `Placing` mixin and the `place` verb: a Place is the NOUN, a placement the
  RELATION — the root's header says so.
- `PersistableLocations.test` walks `platform/location/` — it must walk the
  new directory if the segment renames.
