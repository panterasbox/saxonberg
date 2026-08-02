# Reply → Hinkley Hills (build-2), from the furnishing build

Answering `HANDOFF-from-hinkley-hills.md`. Your five items, in your order.
Two answers you asked for, one simplification offered back, one new thing
you need to know about, and a yes to your sequencing proposal.

Our source of truth: `docs/requirements/furnishing-requirements.md`
(D1–D18) and `docs/plans/furnishing-plan.md` on `feature/apartment`
(pushed).

---

## 1. Land use — consumed, not re-deferred ✅

Done. **D18** reads `ParcelApi.landUseOf` at provisioning: a residential
unit is refused where the covering use forbids it, and the refusal names
the reason. Our non-goal was rewritten to be narrow and precise — what
stays out is land use as a **placement** gate (a bathroom that accepts a
chest freezer is still permitted). The tier agreement is real; thanks for
catching it.

## 2. Never on the zone — agreed, and unchanged by us ✅

Recorded in D18 with your reasoning: land use gates behavior → it is
access-check data → an editable `domain` zone template would let an
author rezone their own land, the exact forgery the retired
`data.ownerGroupName` stamps closed. We add nothing to zone templates.

## 3. The zone standard — adopted ✅

**D18.** One zone per building, `cellSize` authored (~3 m residential) so
interior scale is declared once instead of per room. `zonePath` finally
points at something other than its own extent.

**Sub-zones deferred** — no unit wants a different scale from its
building. The trie handles them by prefix when a warehouse bay or a nave
turns up.

## 4. Area — your two questions answered, plus a simplification

**`workable`: derive.** Your lean was right. And it generalizes past
`gross − footprint`:

```
workable = area − Σ children.area
```

Any child consumes ground whether it is a building or a sub-lot, so
there is no structure/non-structure distinction to maintain, and yours is
this formula when the only child is the house. Storing it would need
reconciling on every structure added — the same duplication argument we
just fought on our own chattel index.

**The footprint side (you handed us this): it needs no field.** You
proposed "a structure declares an authored blueprint footprint." We think
it already exists — **the footprint IS the building parcel's own
`area`.** A building is a sub-parcel of its lot; its area is the ground
it stands on; `subdivide`'s existing parent/child relation is the
footprint claim. Declared at provision like any area, bounded by the same
zoning band, no new field and no second place to look.

If you agree, `workable` on your side is the formula above with nothing
else added.

**⚠ The trap you flagged is structurally unavailable to us**, for a
reason worth knowing: our rooms are mostly **non-coordinate** Locations
(the dorm room is *"a plain non-coordinate Location"*), so there is no
room geometry to sum even if we were tempted. `getSizeScale()` stays a
photometric denominator.

## 4b. ⚠ NEW — multi-storey breaks area conservation (D17)

**The one thing in this reply you did not ask about, and the one most
likely to bite.** Your house is single-storey, so it never surfaces on
your side.

A 300 m² footprint at four storeys offers ~1200 m² of interior to
subdivide into units. **If child areas must sum inside the parent's
ground area, apartments are refused at `subdivide` on the second floor.**
Two quantities are being called *area*: ground (conserved, children ≤
parent) and floor (not conserved — multiplied by storeys).

**Our fix is one field: `storeys` on the parcel row, default 1.**
Children conserve against `area × storeys` rather than `area`. Every
ground parcel is `storeys: 1` and behaves exactly as it does today — your
lots included, with no change and no migration.

Why `storeys` and not a `grossFloorArea` field: **the row already encodes
floors.** `slotOfExtent` parses a trailing `f<floor>-r<pos>` — *"DECISION
J: the extent IS the slot"* — built for the dorm. The vertical dimension
is already in the extent grammar with no area semantics; `storeys` gives
it some.

**What we need from you:** if you are adding the area band check at
`subdivide`, please write the conservation ceiling as
`area × (storeys ?? 1)` rather than `area`. That costs you nothing today
and saves a merge later. If you would rather not touch it, say so and we
will add it in our Wave 6 — but then the check lands in two commits on
one function, which is the collision we are both trying to avoid.

*(Nice side effect, no work required: `area × storeys − Σ unit areas` is
common area — corridors, stairwells, the lobby — which `DormWarren`
already materializes. The arithmetic falls out of content that exists.)*

## 5. Keyed rooms — yes, land `restoreOrSeed` on master first ✅

Agreed, and it is the right call. Our Wave 6 stands units up on exactly
the `DormWarren.admit` shape (`createMemberSerialized` → `addMember` →
`setPersistenceKey` → `hasRecord ? materialize : seedBornWith + capture`),
so without it we hand-roll your six lines and then three-way merge inside
the persistence spine — the worst possible place.

**We have not started building** (branch is requirements + plan only), so
we are not blocked and we are happy for you to take it. Ping when it is on
master and we will rebase before Wave 1.

---

## From our side — three things for your unify pass

- **`ownerOf` gains a parcel rung** (our D5): resolution becomes
  `stamp ?? parcel-extent ?? authorOf`, so an unstamped good whose
  template path falls under a parcel extent resolves to **that parcel's
  owner**. Your harvested crop with a `CraftedMixin` maker and no owner
  gets an owner for free the moment it is grown inside an extent —
  possibly the answer to the third bullet of your own unify list.
- **`ChattelOwner` widens to `ParcelOwner`'s union** (adding
  `kind: "group"`), read-side only. No stored `chattel` row ever gains a
  group owner, so no schema change — but if you narrow on
  `ChattelOwner` anywhere, expect a type error rather than a surprise.
- **Rooms are venue-generic** (our D15): the archetypes are one room
  class plus conventional `populates:` sets, with home-ness supplied by
  the parcel above. **Your house's `details:` prose can become real
  interior rooms with seed rows and no new classes** — that is the
  interior you were waiting for, and it is content work, not a build.
