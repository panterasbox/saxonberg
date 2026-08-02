# Handoff → the residence build, from Hinkley Hills (build-2)

Living-world **phase 2** (Hinkley Hills — ground you own) is planned and runs
concurrently with your build. Five things from that design session bear on
yours. **Two change decisions you have already recorded**, one is a standard
that is really yours to own, and one is a merge collision we should defuse now.

Source of truth: `docs/plans/hinkley-hills-plan.md` on `feature/hinkley-hills`
(Decisions A, A2, A3, B, and § Parallel build).

---

## 1. Land use will EXIST — you can stop deferring it

Your furnishing requirements currently defer it:

> *"stewardship owns condition, land use, and the residence ladder's gate; this
> build does not"*

Hinkley implements it now:

- **`ParcelRecord.landUse`** — stewardship's closed six (`residential ·
  agricultural · commercial · industrial · civic · wild`)
- **`ParcelApi.landUseOf(path)`** — longest-prefix through the existing
  coverage trie; a child with no explicit use inherits its covering parcel's
- **It gates.** Cultivation is refused where the use forbids it, and the
  refusal names the reason.

Your **D15** independently reached the same tier — *"the premises (unit /
sub-parcel): title, **land use**, the lease, the address — this is where it is
decided, and it is the shipped parcel layer."* Two builds converging on the
same tier separately is a good sign it is the right tier. **Consume it rather
than re-defer it.**

---

## 2. ⚠ Land use must NOT live on the zone — the project already retired that

If putting it on the zone template has come up (it is tempting, since
`cellSize` lives there), it is closed. From `config/parcels.yaml`'s header:

> *"ownership is declared HERE (a gated platform seed channel), **never on the
> editable `domain` zone template**… **access-check data lives only in this
> collection.** This replaces the **retired** `data.ownerGroupName` stamps on
> the lounge / Terminus zone seeds."*

Land use **gates behaviour**, which makes it access-check data. On an editable
zone template **a content author could rezone their own land** — the exact
forgery those stamps were removed to close.

**Resolution:** land use and area live on the **parcel row**; the parcel points
at the zone via `zonePath`. One place to look, and no access-check data in
editable content.

---

## 3. The zone standard — adopted, and really yours to honour

**A building interior is always at least its own zone**, and may hold
sub-zones.

Why it is worth standardizing:

- `CartesianLocation.getSizeScale()` is literally `zone.getCellSize()²`, so a
  **zone is already the unit at which interior scale is declared**. A house at
  4 m cells and a warehouse at 10 m stop needing per-room fiddling.
- It gives **`ParcelRecord.zonePath` a real referent** — today it is always
  `== extent`, the 0a simplification.
- One parcel → one backing zone → sub-zones is a shape the coverage trie
  already handles by prefix.

**Apartments are the build with actual interiors, so this lands with you.**
Hinkley shows none of it — its house is `details:` prose precisely so you can
furnish it later rather than have it rebuilt.

---

## 4. Area: declared at provision, never derived — and the seam you own

**`ParcelRecord.area: Quantity<'m²'>`** lands alongside `landUse`. Declared
when the parcel is provisioned, and **bounded by zoning at `subdivide`** (each
use declares a permissible area band; a lot outside it is refused).

**Deliberately not derived from room geometry.** `getSizeScale()` has exactly
one consumer — the vision walk, dividing flux to get lux. It is a
**photometric denominator, not a spatial model**. Deriving parcel area from it
would make placeholder rooms load-bearing *and* promote a lighting constant
into a land-tenure fact, so every future lighting tweak becomes a title
migration.

**The seam you own:** `workable = gross − footprint`, where a structure
declares an **authored blueprint footprint** — never a sum over its rooms.

> ⚠ With `cellSize` on the zone and `area` on the parcel, *"just multiply the
> rooms"* will look tempting again. It is the same lighting constant wearing a
> different hat.

*(Open, and yours: whether `workable` is stored or derived. Lean is derive —
single source of truth — but the footprint side is yours.)*

---

## 5. ⚠ The one real collision — keyed rooms

You stand rooms up *"host-keyed, via the shipped seed-then-persist"* — the
`DormWarren.admit` shape. **Hinkley's Wave 2 refactors that**: it extracts
`PersistableApi.restoreOrSeed(host, key)` and moves `DormWarren` onto it. Both
builds would then touch `api/persistable.ts`, `obj/api/PersistableLogic.ts` and
the dorm.

**Proposal: land that one change on master first, before either branch goes
further.** It is one Api static, one refactor and its tests — self-contained,
needing nothing from Hinkley or from apartments. Both builds then branch off a
master that already has it.

Deferring means two hand-rolled copies of the same six lines and a three-way
merge in the persistence spine, which is the worst place to have one.

---

## Not colliding (checked)

- **Real property vs chattel.** Hinkley moves *title to ground*
  (`ParcelApi.transfer`); you land *owner-stamped movables*. Different
  registries by design (`parcel.md` vs `chattel.md`).
- **The ladder.** Both builds decline it. Hinkley's requirements say
  explicitly that it is **not a rung** and mint no ascent gate, leaving the
  ladder free to claim Hinkley later.
- **Leases.** Hinkley uses `transfer` (ownership); you use the shipped
  `grantUse`. Hinkley adds **no second lease mechanism**.

## For the unify pass

- Hinkley adds a **`title`** dispatch verb (civics) for owned ground. If you add
  a lease-shaped verb, whether they merge is a unify-pass call — **not** a
  reason to pre-emptively merge them now.
- A harvested crop carries a **maker** (`CraftedMixin`) but no **owner**. Once
  chattel-title lands it may want both.
- Hinkley's house is prose, waiting for your interior.
