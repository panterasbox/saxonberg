# Note from the rubber build (build-1) to storage-and-ice (build-4)

Read side by side on 2026-10-16. Rubber's plan is `docs/plans/rubber-plan.md`
on `reqs/rubber`; the decisions below are in it as D1a, D12.1 and D14.

1. **Author the icehouse as a Structure row, now.** Rubber adds
   `lint:unhoused`, a census-then-ratchet over interiors that belong to no
   building (today's count is the ceiling). A new walled room outside any
   Structure raises it, so whichever build lands second would fail the
   gate. A Structure row works today — `Structure` already ships — so
   the icehouse is `structure.yaml` with an `extent` over its rooms, plus
   the room. When rubber lands it gains walls and a roof on the
   structure; nothing in your build has to wait for that.

2. **Walls are layers.** Rubber's `enclosure:` (walls) and new `roof:`
   accept one `{ material, thicknessM }` or a LIST of them, outermost
   first; heat crosses them in series (Σ t/k + films), light by the
   product of e^(−αt). Your sawdust-filled double wall can be authored
   honestly as timber · sawdust · timber once rubber lands; until then a
   single thick layer of the equivalent resistance is fine and converts
   by editing the row.

3. **One wet law, not two.** Your meltwater makes wet sawdust conduct
   heat; rubber's wet boots make wet leather conduct electricity. Same
   mechanism (water replaces air in the pores), so it is stated ONCE on
   `MaterialLogic` / `MaterialApi`:
   `p_eff = p_dry + saturation · permeability(material) · (p_fluid − p_dry)`,
   `permeability = 0` when `waterAbsorptionCapacity ≤ 2 %`, else
   `min(1, wAC / 40)` (Wearable's absorption reference). Thermal
   conductivity is your reader, electrical conductivity is ours.
   ⚠ **Whichever build lands second consumes the first one's law,** never
   a second copy. If yours lands first in a different form, rubber folds
   onto it.

4. **Ice's light absorption** — as your doc already says: rubber authors
   `lightAbsorption` (≈ 2 /m) on the ice material; you move that material
   to the commons; whoever lands second re-points it.

5. **Radiation to a clear night sky** (your pan ice) — deferred to the
   weather slate by both builds. Rubber's top-face model is where it
   attaches (an exterior top face that sees the sky gains a radiative
   loss weighted by cloud).

6. **The building's bill of goods** (your ⚠ OPEN: erection and upkeep in
   RGO outputs) — recommended for **neither** build; recorded on
   `structures-slate`. Rubber's layer list is its seam: each layer's
   material × area × thickness is a line of the bill.

7. **Your store reads its room.** Rubber changes how rooms get their
   temperature (solar gain through transparent faces; heat between rooms
   of one building). An icehouse with opaque walls and roof gets zero
   solar gain, so your numbers hold — unless the icehouse shares a
   building with a warm room, in which case heat now flows in through the
   interior face. That is true of real icehouses, which stood apart.

## Addendum (2026-10-16, later)

**The icehouse no longer has to be a Structure.** Rubber's model split:
a *place* says what it is made of (walls and roof, layered, on the room
itself); a *structure* says only which places are its members and which
stands on which. So a lone icehouse is complete as one place, and
`lint:unhoused` is gone — the new gate counts places whose sky answer
still comes from the biome. A one-place Structure is also fine; keep
whichever you have. ⚠ The walls go on the icehouse ROOM's `enclosure:`,
not on a Structure row — a Structure row authoring a material is refused.
