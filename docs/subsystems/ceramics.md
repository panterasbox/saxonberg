# Ceramics — clay, the brickmaker and the potter

> Built by the ceramics & moulding build (2026-10, `reqs/ceramics`). The
> mechanism a firing runs on is the kernel's and is documented where it
> lives — [thermal.md](./thermal.md) § heat-work (firing is ONE rule),
> [faces.md](./faces.md) (coats and glazes), [materials-response.md](./materials-response.md)
> (brittle bodies, flaws, `ring`). This doc is the TRADE: what clay is, how
> it is won, weathered, tempered, shaped and fired, and who does it.

Owners: `trade-ceramics` (root `/trade/ceramics`) — the trade's instruments,
readings, Disciplines and dials; `trade-quarrying` owns the `Clay` CLASS
(`dig` mints it); base-library owns the commons a clay is made of and fired
into (`mineral/clay-mineral`, `earth/clay`, `ceramic/*`, `glaze/*` — R4,
commons name only commons). Venues are rows in their realm packs.

## ⭐⭐ Clay is a composition (M3)

A clay MATERIAL row tabulates what a kind of clay is made of — the common
subsoil clay (`earth/clay`) is clay mineral 0.55, sand 0.30, iron (goethite)
0.06, lime (limestone) 0.03, organic (peat) 0.06; the Delight's alluvial clay
is fatter (0.72 clay mineral, 0.12 sand); Rejection's fireclay, the coal's
seat-earth, is nearly all clay mineral with almost no iron. A lump's own
`alloying` (`CompositionMixin`) records what was kneaded in after.

`/trade/quarrying/thing/Clay` = `CompositionMixin(WaterActivityMixin(Lump))`
reads everything off the effective composition, sorting constituents by
their materials' TAGS (`clay-mineral`, `silica`/`grog`/`breeze` = openers,
`iron`, `carbonate`, `organic`) — so a second clay of any realm reads with
no code:

| read | from |
|---|---|
| `plasticity()` | the clay-mineral share, raised up to a third by weathering |
| `crackRisk()` | `plasticity × 1.6 − openers × 1.2`, clamped — fat clay cracks drying; sand opens it |
| `firedColor()` | iron ≥ 4 % red · ≥ 1.5 % buff · else white |
| `refractoriness()` | iron + lime + organic < 5 % and clay mineral ≥ 60 % → a fireclay |

The fired body itself is NOT read here: firing is the material's heat
transitions (`earth/clay` → terracotta, earthenware, stoneware; fireclay →
refractory), the one rule.

## ⭐ Clay has a year — weathering by the freeze-thaw count (S2)

Dug in autumn and left in a heap OUTSIDE, a winter breaks a clay up: every
day its place's air crosses freezing, the water in it freezes and thaws and
opens the plates. `Clay.weatheredDays` (persistent) is advanced on read by
the heap's place's `freezeThawDaysSince(stamp)` — whole days only, the stamp
day-aligned — up to `ceramics.weathering.ceilingDays` (40); a place that
holds its own air counts 0, so a heap kept in a shed stays raw. Weathering
raises plasticity. `look` says *fresh-dug and raw, unweathered* · *crumbling
at the edges* · *frost-broken and mellow*. Two heaps pooled mass-weight
their weathering and their temper (`onMerged`, the `Ore` rule); a lump cut
off a heap is the heap's clay.

## ⭐ Tempering is mixing — the temper pit (S3, R1)

`/trade/ceramics/thing/TemperPit` is a kernel `MixingVessel` dug into the
yard (`Thing`, fixed): put clay and sand (grog, breeze) in, `knead pit`, and
the kernel's blend folds them into ONE clay by mass — the pit's row names the
clay's own row and material as the blend, so tempered clay is still `Clay`,
leaner by exactly the sand that went in, its weathering carried by mass. No
recipe and no ratio. What the pit adds is the WATER: it must hold some (a dry
pit refuses *it wants water*), the tread takes up
`ceramics.temper.waterLPerKg` per kilogram, the clay comes out plastic, and
the pit's water is never a constituent. `ceramics.temper.minutes` of both
hands; credits the pit row's `discipline` (brickmaking).

## `analyze clay` (the reading)

`/trade/ceramics/idea/reading/clay` (`ClayReading`) — no instrument: roll a
worm of it (fat / workable / lean, for anybody), how it will dry (novice), the
colour it will fire (competent), lime, fireclay or common, and whether a
winter has been at it (proficient). Words, never a figure.

## ⭐⭐ Green ware — the water decides (M4, R2)

A shaped piece of clay is GREEN until it is fired: the kernel's
`GreenwareMixin` (`lib/material/Greenware.ts`, composed by the pack's ware,
bricks, flower pots and cones, and by dairying's setting pan — two packs with
no common ancestor, which is the kernel test). Each composer composes
`WaterActivityMixin` itself: green ware re-wets the way turf does.

- **State is DRYNESS against the air**: `d = (1 − moisture) ÷ (1 − the air's
  equilibrium)` — `plastic` below `green.leatherAt` (0.3), `leather-hard` to
  `green.boneDryAt` (0.85), `bone-dry` past it. *Bone-dry* is as dry as that
  air lets it get, damp shed or dry loft.
- **Leather-hard** trims, joins and stamps (`canTrim`/`canJoin`/`canStamp`);
  **bone-dry** is fireable (`isFireable`).
- **The weather**, read off the piece's own record on every read:
  - its wetness rising past `green.slumpWetting` (rain on an open yard)
    SLUMPS it — the hack cover is what stops it;
  - its temperature below freezing (frost) or above boiling (a wet piece in a
    kiln — the steam burst) while it still holds water SHATTERS it;
  - drying faster than its clay stands — dryness per hour × crack risk (fat
    clay high; sand, grog, breeze low, read off its composition) past
    `green.crackRate` — CHECKS it (a drying crack).
- ⭐⭐ **Green ends at firing (R2).** Every read answers only while the body
  is its plastic clay and its heat history has converted nothing. The first
  rung ends it: a fired pot's relation to water is its porosity, weep and
  seep ([faces.md](./faces.md)). The heat-work reconcile asks green ware to
  read its weather FIRST, so a wet piece's burst is seen before a rung swaps
  it to terracotta.

## Forms and the potter's hand

*(W4.)*

## The clamp, the kiln, linings and crucibles

*(W5.)*

## The works and their people

*(W6.)*

## Settings (`settings/ceramics.yaml`)

| key | default | meaning |
|---|---|---|
| `ceramics.weathering.ceilingDays` | 40 | freeze-thaw days past which a heap gets no better |
| `ceramics.temper.minutes` | 20 | game-minutes of treading a pit |
| `ceramics.temper.waterLPerKg` | 0.05 | the pit's water a kilogram of clay takes up |

⚠ Pack dials are read by string key (`AppApi.setting('ceramics.…')`) with a
literal fallback — no kernel `AppSettingKeys` entry.

## Cross-references

[thermal.md](./thermal.md) · [faces.md](./faces.md) ·
[materials-response.md](./materials-response.md) · [weather.md](./weather.md)
(the freeze-thaw count) · [content-packs.md](./content-packs.md)
