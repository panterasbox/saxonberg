# Painting — a building's outside, the coat that weathers, paint and glue

What a building's outside is and how it wears; how a coat sets and how it
goes; what paint is; what glue is; and the three hazards the trade carries.
The kernel holds the mechanism; `trade-painting` (`/trade/painting`) holds
the colorman's trade, and Wharfside holds the colorman and the house painter.

Built by the paint build (2026-10-31). Sibling docs:
[construction.md](./construction.md) (places, structures, the landing),
[faces.md](./faces.md) (faces and coats), [assembly.md](./assembly.md)
(joints), [holding.md](./holding.md) (the term), [taps.md](./taps.md),
[fire.md](./fire.md), [metabolism.md](./metabolism.md).

## 1. The landing — where a structure meets the weather

A structure is an Idea, so a player engages it from a place that touches
it: *a place that does not hold its own air, with an exit into a member
that is enclosed or is the entrance — or with the structure lying alongside*
(construction.md § the landing). Landed structures join the room's `here`
pool: `look`, `survey`, `paint` and `maintain` bind a building from its
landing and nowhere else, and refuse elsewhere in words (*"You cannot reach
the outside of the cottage from here."*).

## 2. The outside: three capabilities, opted into

The platform `Structure` twin composes all three; a content author opts out
by naming a class over the base that does not (a ruin, a monument). A
holding's house (`HoldingStructure`) composes the same three.

| mixin | what it claims |
|---|---|
| `FacedMixin` | one outside a coat can be laid on (`coatAreaM2` = the exterior walls and roof of its members) |
| `WeatheringMixin` | the coats thin where the weather reaches them, set by the air, fade in the sun |
| `ShellMixin` | a fabric that holds while a coat does, wears once it is gone, and can be mended |

`WeatheringMixin` also composes on goods that live out in it — the sign board
and the gessoed panel (`trade-painting`) — and NOT on every `Good`: a cart's
coat wearing in the yard waits for decomposition's exposure clock.

### Setting — the binder's chemistry, read off the air

`KineticSpec.sets` says what drives a material's first change: `heat` (the
default — every glaze, cure, firing), or the air: **carbonation** (a
limewash; it wants air and time, slow where the air does not change),
**oxidation** (an oil; it wants air and warms as it does —
`exothermicJPerKg`), **drying** (a size, a tempera; it wants dry air),
**solvent** (a varnish, a rubber cement). `Faced.airCoats(segments)` walks
the air: rain on a wet coat RUNS it, frost CRAZES it (the shipped fault
states). `heatCoats` never touches an air-set coat. A thermal good sets
its coats over its room's air (`Thermal.reconcileCoats`), and an oil warms
it.

### Weathering — thickness is the arithmetic

`Material.weatheringMPerGameYear` is the rate a SET coat of it thins where
the weather reaches it (an oil two seasons a coat, a limewash one or two, a
glaze or tar never). Outermost first; when a coat is gone the next meets the
world; two coats last twice as long; a crazed or run coat goes twice as
fast. The walk is `BiomeApi.airSegmentsFor` at a standing landing, so a wet
day and a dry one do different things; a long absence integrates the tail
the weather walk keeps.

### The fabric

`ShellMixin.fabric` wears at `0.5 / structure.weather.daysToWorn` per game
day — **only while the coat is gone**. Five bands, no gauge (`sound` ·
`weathered` · `worn` · `shabby` · `dilapidated`); the cause line is read off
the coat (*"the paint is going"*, *"the paint has gone; rain has gotten into
the sills"*, *"the new oil is still curing"*). `maintain` mends the fabric
and nothing else (*"a coat is a brush's work"*).

### Staged and owned

A building persists only once it is **sold** — a PERSON holds the covering
parcel (`isTitleSold`). A staged building writes no record and comes back as
its row authored it whenever the world restages (today: every boot). A ship
keeps her voyage always and her hull's coats only once sold
(`Faced.persistsCoats` gates the coat slices). A holding's house persists
always (a holding exists because somebody holds it).

## 3. Paint is a mixture

`lib/material/Paint`: a binder (any coat-laying material that sets) with
pigments by mass, perhaps a thinner. Its color is the pigments' colors
weighted by share × hiding power; its lightfastness its least fast pigment;
its coat word the binder's. The makeup rides the liquid's payload
(`BulkPayload.paint`) and is kept on the coat (`CoatLayer.paint`); a paint
coat's MATERIAL is its binder, so the binder sets and weathers it. There is
no paint table: a second paint is a pigment row.

**Pigments are items** (a paper of yellow ochre), because a pot's liquid is
one slot: the binder is poured, the pigment put in, the pot stirred
(`PaintPot.payloadFor`). An egg in the pot binds as tempera.

## 4. `paint` — one verb, the target plans it

`paint <thing> [with <pot>] [using <brush>]` — a brush in hand affords it
(`platform/thing/Brush`, a static on a class). The TARGET plans the coat
(`Faced.coatPlanFor`): a wet film `structure.paint.coatThicknessM` over its
area, exactly that many litres from the pot (a pot with less coats
nothing), the weather walked to now first. `write <words> on <board> with
<pot>` letters the words as a coat (`CoatLayer.marks`): anyone reads them,
until the weather takes the coat and the words with it.

## 5. Glue — the glued joint takes a real glue

A `Joint` row may `takes: glue` (`glued`). `fit`'s raise arm draws glue from
an open vessel in reach (`crafting.glueLitresPerJoint`) and marks it on the
joints; the GLUE decides (`Material.adhesive`): the line sets by the glue's
air rule and is weak until it has; a knock before it sets costs more; the
damp slackens it by what the glue does not resist (a hide line lets go in a
wet cellar, a casein one holds); past `softensAtK` it lets go; salvage reads
the glue (an animal glue comes apart hot and wet, casein never). Glue is
made from what the world throws away (the `GluePot`: hide scraps, bone, fish
skins), from curd and lime (casein), flour (paste), rosin (cement), rubber
and turpentine (cement).

## 6. The hazards

- **Lead.** Every lead row doses the toxin type `lead` (the shipped rows
  named the condition and every dose was dropped). The colic band comes at a
  burden of two; grinding a lead stock and brushing lead paint dose the body
  (`metabolism.leadDustDose`, `leadSkinDosePerL`; a glove halves the skin).
- **Oily rags.** `SelfHeatingMixin` (kernel, promoted from hay): a heap
  heats from its host's hook and sheds by its own; a combustible heap whose
  core passes its autoignition point catches. A rag dipped in the pot heats
  from its oil coat — a heap catches, one spread rag does not, a wet one
  does not heat.
- **Turpentine.** A volatile: an open pour or a stir puts its vapor in the
  room, toxic per breath; the room's air changes clear it.

## 7. Resin

A tap names its tool (`TapSpec.instrument`, default `boring`): a Scots pine
is cut with a blade and bleeds gum through warm weather (Hanging Wood's
sugarbush pines). The still cuts the gum to turpentine and leaves rosin;
rosin and turpentine stir to varnish.

## 8. Wharfside

The colorman's (Ira Pell) off the towpath: a shop with its counter and
hearth, a yard with the quern, a shed for the rags. The towpath cottage is
the town's limewashed building, its own parcel so it can be sold. Tam Rook,
the house painter (he answers to *painter*; a boat's line is a *bow
line*), works a rota of the towpath and Mayfield Row and paints the landed
building whose coat is gone (the `paints` brain, through the literal verb).
A swept flue gives lampblack where the realm names it
(`cleanliness.sootTemplate`).

## Open

- The corrosion jar (vinegar on lead or copper → white lead, verdigris) and
  the madder-lake strike are not built: the colorman stocks them.
- A pour joins only like with like, so turpentine cannot thin a pot of oil
  paint from the verbs.
- Only `fit`'s raise arm consumes glue; re-making a glued joint by the
  replace arm does not.
- The house painter does not restock his own pot.
