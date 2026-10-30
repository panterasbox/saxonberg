# Ceramics drives — split into blocking and soak

> **Status: UNBUILT · opened 2026-10-30 (owner, ceramics finalize !437).**
> **Left:** tag the 69 checkpoints · move the span steps to `ceramics-{a,b,c}.soak.dirty` · write a staged twin for each.
> **Size:** a tail. The owner handed it to **build-4 (`build/soak-harness`)**: its refusal is what makes the split necessary, and its staging tools (an `eval` that can clone a `/trade` kind, `testharness clock|weather`) are what make the twins writable.

## Where this came from

The ceramics finalize spent most of a day on drive wall-clock. Clay's year, the clamp and the bisque firing jump the clock through weeks and seasons; run 3 of the four files took about five hours. Master's `workflow.md` § *No merge waits on the clock* now says only `instant`, `short` and `staged` steps may block a merge. Build-4's refusal will fail every ceramics file the moment it merges master, because each one jumps past a game day outside soak mode.

The soak-harness requirements left this to "those builds, when they merge master". The ceramics MR merged first, and the owner moved the split to build-4, which already did the same for dairy, sugar and potash.

## The tags

Pace is read off each checkpoint's clock moves (the drive files, 2026-10-30). A `toHour(..)` is at most a day, so it counts as short.

- **Assertion** is `player` where the step tests what a player can do with what a player has, and `staged` where it only checks that nothing else broke.
- **Twin** is the state a staged twin must set directly, so the blocking drive can check everything around the clock.

### ceramics-a — the brickfield (clay's year)

| checkpoint | clock | pace | assertion | staged twin (for a span) |
|---|---|---|---|---|
| `dig clay` wins lumps | 2 min | short | player | |
| `look clay` fresh | — | instant | player | |
| `analyze clay` in words | — | instant | player | |
| river sand from the same wall | 2 min | short | player | |
| a heap out on the yard, another in the shed | — | instant | player | |
| two test bricks, yard and hack | 17 h | short | player | |
| 5a the yard brick slumps in rain | 2 h | short | player | (rain: `testharness weather`) |
| 5b the hack brick bursts in the frost | months | **span** | player | a wet green brick under the hack cover with the frost's burst already on it; `look`/`ring` read it |
| winter: the yard heap mellows, the shed heap stays raw | 30 d | **span** | staged | two heaps: one with a winter's weathering on its record, one with none; `analyze`/`knead` read the difference |
| the weathered heap trodden with sand and breeze — one leaner clay | warm season | **span** | player | a weathered heap and 200 L of water in a thawed pit, set directly; the knead itself is short |
| a fat batch kept back with no sand | — | short | player | |
| `shape clay into brick` — a day's pallet | 9 h | short | player | |
| the fat batch moulded too | 9 h | short | player | |
| into the hacks; leather-hard, bone-dry, the fat batch cracked | 12 d | **span** | staged | green bricks with the drying already on them (bone-dry; the fat batch with its cracks) |
| set, light, burn the clamp; the glow and the smoke | 3 d | **span** | player | a lit clamp mid-burn (the glow at night and the smoke are reads of a burning clamp) |
| drawn cold: three grades by position | 1 d | short (after the span) | player | a burnt-out clamp with its charge already graded |
| `ring` a well-burnt brick and a place brick | — | instant | player | |
| a starved clamp comes out blue | 11 d | **span** | staged | a clamp burnt in reduction (blue bricks on its record) |
| a sound brick measures to the statute brick | — | instant | player | |
| a brick off the oversize mould measures off standard | 8 d | **span** | staged | a fired brick from the oversize mould |

### ceramics-b — refractories and linings

| checkpoint | clock | pace | assertion | staged twin |
|---|---|---|---|---|
| fireclay won at Hill Quarry | — | instant | player | |
| firebricks moulded, dried and burnt in the pottery kiln | 7.5 d | **span** | staged | fired firebricks handed (the moulding is short; the drying is the span) |
| fired again and again: the lining thins, the heat drops, it will not light | firings | short (per `fire`) | player | |
| `fit lining to furnace` — relined, it lights | — | short | player | |
| melt after melt: the crucible wears, then cracks | — | short | player | |
| the keeper relines the glasshouse kiln with nobody present | 2 d | **span** | staged | a worn kiln and its keeper on shift; one keeper beat |

### ceramics-c — the pottery

| checkpoint | clock | pace | assertion | staged twin |
|---|---|---|---|---|
| a novice throws a heavy mug | 1 h | short | player | |
| `shape … 2 gallons` refused, naming the band | — | instant | player | |
| a practiced potter throws light | 2 h | short | player | |
| leather-hard: foot, handle, stamp | 30 min | short | player | |
| a wet handle cracks the joint | 1 h | short | player | |
| bone-dry ware will not trim | — | instant | player | |
| the cones read the heat; practice reads more | 1 d | short | player | |
| the firing leaves porous bisque | 1 d 10 h | short | player | |
| glaze: stir, dip, glost-fire | 1 d | short | player | |
| a kiln opened hot dunts its ware; `ring` finds one | 2 h | short | player | |
| vinegar a week in the lead crock carries lead | 7 d | **span** | staged | the crock's vinegar with a week's leach already in its payload; `analyze chemistry` reads it |
| an unglazed jar weeps and cools; a glazed one holds | warm season | **span** | player | a warm day (`testharness clock` to the season, or weather); the weep itself is 6 h |
| the filter: fouled → water, tainted → tainted | 3 h | short | player | |
| a thin bowl breaks on stone; a thick mug survives | — | short | player | |
| `grind` the sherds — grog | 30 min | short | player | |
| the tinker rivets a crack | — | short | player | |
| stoneware on a cook fire cracks; grogged earthenware survives | ~1 d 7 h | **span** (just over a day) | player | trim to within a day: the shock is in the first hours |
| boiling water into a cold glazed mug cracks it | — | instant | player | |
| the shelf: the novice's mug and the potter's read differently | 1 h | short | player | |
| the stall sells a plant pot with its maker | — | short | player | |
| the store's plant-pot line buys local first | — | short | player | |

### ceramics-d — moulding and founding

All checkpoints are **instant or short** (the longest single wait is 12 h, the salt pan). Nothing moves to soak. ⚠ The founder's `eval` staging needs build-4's eval reach; the current file stages melts and evals under Rejection's title.

## Findings for build-4 (the finalize run)

- **Sibling drives that fail on a fresh world, not from ceramics:**
  - **cooking:** the drive never stokes the cookhouse oven, red on master since the fire build (2026-10-07).
  - **glass:** time of day; the glasshouse is a clearing lit only by a cold kiln.
  - **dairy scald:** a 3 L vat on a 4 kW hearth crosses the band inside one 5-minute step.
  - **rubber 15:** two kneads back to back with no rest; kneading is 380 W for a quarter hour (B101).
- **A timed-out wire test keeps looping:** sugar step 18 held run 3 for an hour.

## Cross-references

- [workflow.md § No merge waits on the clock](../../workflow.md)
- [soak-lane-slate](../builds/soak-lane-slate.md)
- [ceramics.md](../../subsystems/ceramics.md)
