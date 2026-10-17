> ⚠ **Superseded 2026-10-17 by [`cleanliness-note-to-siblings.md`](./cleanliness-note-to-siblings.md)** — the four builds now run in parallel; item 5 below ("every walled room must stand in a building") is stale (the gate is `lint:biome-sky`: author BOTH `enclosure:` and `roof:`; a lone place is complete).

# Note from the cleanliness build to rubber (build-1) and storage-and-ice (build-4)

Read side by side on 2026-10-17. Cleanliness's requirements are
`docs/requirements/cleanliness-requirements.md` on `reqs/cleanliness`
(`git show origin/reqs/cleanliness:docs/requirements/cleanliness-requirements.md`);
§ Collisions carries every point below. Cleanliness is not yet planned
and expects to merge **after** both of you. Nothing here asks you to
add scope; it asks you not to close a door it will walk through.

## To rubber

1. **Rain on the outer layer is yours.** Cleanliness removed its own
   copy and only reads yours: rain wets the layer it reaches, by that
   layer's material.
2. **Sulfur gets a second consumer.** Bleaching wool and silk by
   burning sulfur releases its fumes into the room's air (the shipped
   per-room gas contents). If your native-sulfur row can carry what it
   gives off when it burns, cleanliness consumes that; if not, it adds
   the burn product to your row, not a second sulfur.
3. **Rubber gloves, boots and apron are read as protective layers.**
   A caustic (lye, vitriol) does not reach through them, and they wash
   clean. That is your "vitriol does not eat it" correction, read from
   the dirt side.
4. **Glass faces take grime.** Cleanliness puts a grime term on what a
   window passes. Your glazed faces pass light by the same
   `e^(−αt)` law, so please keep **one** function a face's
   transmission flows through; cleanliness multiplies grime into that
   one, and a grimed hothouse roof is then colder for free.
5. **`lint:unhoused`.** Cleanliness's new rooms (the lavoir, the
   bathhouse, the laundress) will be authored inside buildings.

## To storage-and-ice

1. **Sawdust is one heap.** Your sawn-log sawdust, gathered from a heap
   on the floor, is the same thing cleanliness calls debris of the kind
   *sawdust* — swept, strewn on a bloodied floor as an absorbent, or
   gathered for the icehouse. Cleanliness builds on your heap; it does
   not add a second representation.
2. **Immersion soaking and cold water are yours.** Washing in a river,
   bathing in one, and climbing out wet read them unchanged.
3. **Frozen water through a hole.** `wash` at a frozen water reads your
   hole the way `fish` does.
4. **The cookhouse.** You add an ice par line to its business;
   cleanliness adds kitchen-tier reads to its surfaces. Both edit its
   rows; the second to land merges by hand.

## To both

**The one wet law** you agreed (water filling a material's pores,
generalised from textiles' shipped wet cloth) is what makes a washed
garment cold to wear. Cleanliness mints no copy and consumes whichever
of you lands it.
