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

## Forms and the potter's hand (S4, D16)

`shape [<material>] [with|on|at <instrument>] [into <form…>]` is the
platform's (promoted from glass — `command-spec.md`). The INSTRUMENT plans
(`ShapePlanner`), else the MATERIAL plans by hand (`Shapeable`); the clay
YIELDS the piece (`Clay.yieldPieces`).

- **A form** (`lib/craft/FormSpec.ts`) is a class (open · closed · flat ·
  block · cone) × a capacity × a proportion (tall · squat · wide · narrow).
  Words are `/platform/idea/Form` rows (`<root>/idea/form/<word>`: `key`,
  `formClass`, `capacityL`, `proportion`, `product`, `seats`, `greenScale`,
  `discipline`), loaded by path from the instrument's `forms:` list — nothing
  scans. `tall jug holding 3 pints`, `open vessel holding 2 litres`; an
  unknown word is refused naming the five classes.
- **The product row**: the word's `product`, else the instrument's
  `formTemplates[class]`, else the clay material's `formTemplates[class]`.
- **The hand decides, deterministically** (`Clay.potterHand`): wall mass =
  the form's nominal (`0.75·V^⅔` kg for an open vessel, more for closed and
  tall) × `ceramics.wall.factor.<band>` (untrained 1.8 … expert 0.85);
  the largest vessel = `ceramics.wall.maxL.<band>` — asked for more, the
  refusal names the band; grade = the band less one. Below your band a pot
  is heavier, never failed. A moulded block, a tile or a handle is its row's
  own mass × `greenScale` — the hand does not change a brick.
- **The piece** is green clay of the clay's material and composition, at its
  water, made by the actor, described by its form, its vessel capacity the
  form's; a form with `seats:` (a jug's `handle`) is born with that bill line
  EMPTY, so `fit handle to jug` fills it. It lands in the actor's hands (a
  day's bricks in the room) and its host is captured (the `fell` precedent —
  the craft-mint defect does not reach green ware). The clay is consumed by
  mass; a heap worked out is gone.
- **The wheel** (`Wheel`, capability `wheel`) throws open, closed, flat and
  cone forms, one pot to a `shape`. **The brick table** (`BrickTable`,
  capability `brick-table`) moulds blocks and tiles: a game-day
  (`ceramics.brickTable.hours`, 8) at `ceramics.brickTable.rate.<band>` an
  hour, ONE stack, as far as the clay goes; the moulder ends up muddy.
  **Hands** coil any class, slowly (`ceramics.hand.minutes`), into the clay
  material's `formTemplates`.
- The goods: `Ware` (`Greenware(WaterActivity(Assembled(Named(Durable(
  Composition(CraftVessel))))))` — mugs, jugs, jars, crocks, bowls, flasks,
  crucibles, handles), `Brick` (a green stack), `FlowerPot` (the kernel
  `PlantPot`, potter-made), `Cone` (a kernel `Mould` thrown green — the
  sugar cone). Dairying's `SettingPan` composes green ware too, and ships its
  own `setting-pan` form under its own root.

## ⭐ Trimming and the maker's mark (S5, W4)

At LEATHER-HARD a green piece is worked on, and the piece answers the verb
(`GreenwareMixin` implements `Carvable` and `Impressible`):

- **`carve foot on mug`** / `carve trim on jug` / `carve pattern on bowl` —
  the green piece's `carvePlan`: a few minutes with any edge, a little mass
  pared off, the work recorded in words (`a turned foot`), pottery credited.
  Plastic refuses (`too-soft` — it would smear), bone-dry refuses (`too-dry`
  — it would crack), a fired or ruined piece refuses.
- **`impress stamp on jug`** — `takeImpression`: the base takes WHOSE MARK the
  stamp carries (`Crafted.mark`, an identity path: the stamp's
  `markIdentity()`, else its maker). The potter's `Stamp` (`/trade/ceramics/
  thing/Stamp`, a `Crafted` good with an authorable `markOf`) affords
  `impress`. The same leather-hard refusals.
- **The base**: once fired, a piece's look reads *its base bears X's mark,
  and it was fired <date>* — the date is its heat history's
  `lastTransitionAtS`. ⭐ A shelf of a player's own pots is their improvement,
  visible: the heavy first mug and the light later one, marked and dated.

## The clamp, the kiln, linings and crucibles

### ⭐⭐ The clamp grades by position (S6, D15)

`BrickClamp` (`/trade/ceramics/thing/BrickClamp`) = `ContainerMixin(Firebox)`
— the charcoal clamp's chain, but its own class (a `CharcoalPit` would afford
`char`). A clamp is not a chamber at one heat: the bricks by the fire
channels get far more than the casing does, and **each brick's own
heat-work decides what it comes out as, by the clay's three transitions**
(B1) — there is no grade table here.

- **Setting** (`onFireStart(by)`, the `Burner` hook `fire` calls before the
  hold): every brick stack in the clamp is split three ways with
  `Stackable.split` — a channel share, a skin share
  (`ceramics.clamp.skinShare` 0.25) and the middle — and each part is
  stamped with its position **on the brick** (`Brick.clampPosition`, a
  persistent field: a stuff id would not survive a restart mid-burn). The
  channel share is the setter's `brickmaking` band:
  `ceramics.clamp.channelShare.<band>` untrained 0.35 · novice 0.3 ·
  competent 0.22 · proficient 0.16 · expert 0.12 — ⭐ a better setter makes
  fewer over-burnt bricks, deterministically. A stack under three, or a
  piece that is not a stack (a pot in a pit firing), sits in the middle. The
  setter is recorded (`setBy`) and the wind over the clamp at lighting is
  read once (`skinWindMs`).
- **The fire answers each brick by its place** (`heldTemperatureKFor`):
  channel × `channelFactor` 1.25 · middle × 1 · skin × `skinFactor` 0.9,
  less `rainK` 100 K × the clamp's own wetness and `windKPerMs` 6 K per m/s.
- **The numbers** (clamp row 1474 K, draught 0.6 → completeness ≈ 0.71,
  held ≈ 1366 K; a three-day burn; clay's transitions at 1200/1330/1480 K,
  zK 30, 7200 s — over three days a rung completes ≈ 47 K under its
  reference): the middle ≈ 1366 K → **earthenware** (the sound brick); the
  channels ≈ 1707 K, past the stoneware rung's 1560 K scorch → **clinker**
  (over-burnt); the skin ≈ 1229 K → **terracotta** (the soft place brick).
  A soaked skin (≈ 1129 K) does not complete terracotta at all — under-burnt.
  ⭐ Fired `--draught half` the burn is starved (completeness ≈ 0.59, under
  the kernel's 0.6) and **reducing**: the middle ≈ 1322 K comes out the
  earthenware's reducing twin — the blue brick — and the skin grey.
- It glows (a `Firebox` is a `LightSource`) and smells of its fuel's
  combustion products (the fire build's).
- ⭐ **A split brick is the stack's brick.** `Brick.onSplit` carries the
  material, the composition, the water state, the temperature, the heat-work
  record, the maker, the mark and the grade onto the split-off — a fresh
  clone of the row otherwise came back green (the `Clay`/`Ore` precedent).
- The rows — `clamp`, `pit-firing` (same class: 1250 K, oak, draught 0.45 —
  smoky and reducing), `updraft-kiln` (an `Oven` with a 30-firebrick lining)
  — are W6's: nothing props them until the brickfield and the pottery exist
  (`lint:reachability`).

### Linings and crucibles (D19, D20)

The lining is a part line on a chamber furnace, worn per firing and relined
with `fit lining to <furnace>` — see [fire.md § Linings](./fire.md). The
keeper's brain `relines` lives in this pack (`src/behavior/relines.ts`). The
Rejection store sells firebrick (an import until the brickfield supplies it),
the smelting pack's fired crucible (the potter's `/trade/ceramics/thing/
crucible` row is GREEN ware — a crucible for sale is fired), a pig of lead
and a bar of tin (the glaze fluxes, commons rows).

### `measure size` — the statute brick (S11, D30)

`/trade/ceramics/idea/reading/size` (`SizeReading`, instrument `gauging`,
discipline `brickmaking`): a brick's length is read off its VOLUME (mass ÷
its material's density) in the statute's proportion, so a brick from an
oversize mould — or a clay that shrank less — reads **off standard** past
5 %. The statute is the innermost polity's `standards` keys `brick-length` /
`brick-width` / `brick-depth` (Terminus: 9 × 4½ × 2¼ in; the realm default
the same). The figure is blurred by the reader's band like any reading
(competence resolves detail, never access) — ⚠ an untrained reader's ±8 %
can blur a 6 % oversize brick back to *true*. A seated gauger's measure is
*of record*; nothing is written on the brick.

## The works and their people

*(W6.)*

## Settings (`settings/ceramics.yaml`)

| key | default | meaning |
|---|---|---|
| `ceramics.weathering.ceilingDays` | 40 | freeze-thaw days past which a heap gets no better |
| `ceramics.temper.minutes` | 20 | game-minutes of treading a pit |
| `ceramics.temper.waterLPerKg` | 0.05 | the pit's water a kilogram of clay takes up |
| `ceramics.clamp.channelFactor` / `skinFactor` | 1.25 / 0.9 | the clamp's heat by position, × the held heat |
| `ceramics.clamp.skinShare` | 0.25 | the casing's share of the charge |
| `ceramics.clamp.channelShare.<band>` | 0.35 … 0.12 | the setter's channel share, untrained … expert |
| `ceramics.clamp.rainK` / `windKPerMs` | 100 / 6 | K off the skin for a soaked clamp / per m/s of wind |
| `ceramics.lining.relineBelow` | 0.4 | lining health under which a keeper relines |
| `ceramics.crucible.wearPerMelt` | 0.12 | a crucible's wear per melt (read by smelting) |

⚠ Pack dials are read by string key (`AppApi.setting('ceramics.…')`) with a
literal fallback — no kernel `AppSettingKeys` entry.

## Cross-references

[thermal.md](./thermal.md) · [faces.md](./faces.md) ·
[materials-response.md](./materials-response.md) · [weather.md](./weather.md)
(the freeze-thaw count) · [content-packs.md](./content-packs.md)
