# Ceramics & moulding — requirements

**Kind:** feature
**Leads from:** kernel. This build adds new engine facts:

- firing as a heat history on the piece;
- clay as a composition;
- a good's faces and the coats on them;
- the mould as an envelope;
- breakage and thermal shock as one brittle-body rule;
- evaporative cooling;
- the freeze-thaw count.

The first consumers ship in this same build:

- the Delight valley brickfield and pottery (the `/trade/ceramics` pack);
- the Rejection foundry;
- the Terminus potter's stall.

Three slates, one build. Today nothing in the world makes brick, tile,
firebrick or pottery:

- **The ceramic goods are conjured.** Twenty-two shipped goods are made of one
  generic `ceramic` material and are conjured by counters and props.
- **Brick is prose only.** Every hot furnace is "lined with brick" in its
  description, and nothing more.
- **Moulds had no design conversation.** The mould system shipped with dairy
  without a design conversation of its own, and the moulding slate then took
  it apart (§ 0a).

This build ships clay's whole year:

- winning, weathering, kneading;
- shaping, drying, firing, and grading what came out;
- the potter's wheel, glaze and breakage;
- the mould as an envelope, which gives the game its foundry and its bells.

Seeds:

- [brickmaking-slate](../slates/builds/brickmaking-slate.md)
- [pottery-slate](../slates/builds/pottery-slate.md)
- [moulding-slate](../slates/builds/moulding-slate.md) (§ 0 rulings, § 0a the
  mechanism)

**Scope and order — the owner's rulings, 2026-10-20:**

- **Repair's W7 (building upkeep) stays its own build.** This build supplies
  the brick and its grade, and W7 opts brick in.
- **The whole moulding slate rides here.**
- **Order: ceramics → W7 → paint.** This build ships *coats on a good's
  faces*. Paint's coat on goods rides that model, and paint's coat on a
  building face rides construction's layers through W7. Paint waits on
  nothing it needs from us.
- **Sequencing against sugar and potash** (both in flight, both touching
  moulds, materials and firing) is decided after the plan.

A condensed design conversation on 2026-10-20 audited the shipped models this
build leans on, then ran the lenses *generatively* for what the slates left
out. Its outcomes are the M- and S-decisions below.

---

## What already exists

**Clay, and one fired product.**

- Rejection's quarry hill has a winnable clay band, which `dig` works with a
  spade (`trade-quarrying`; *the ground answers*).
- The sand pit wins glass sand, and the limekiln burns quicklime.
- Quarrying's `fire-pot` recipe fires one lump of clay at 1100 K into an
  unglazed plant pot, credited to quarrying.
- **The Delight valley has no clay deposit.**

**The verbs this build's acts land on, all shipped:**

| verb | owner | what it does today |
|---|---|---|
| `shape` | glass | durative; its forms (bottle, cylinder) are fixed in code |
| `carve` | carpentry | cuts a part out of a stock |
| `fit` | assembly | replaces a part, or raises a whole |
| `dip` | chandlery | dips a solid in a pot; paint-slate reserves it as *the* primitive for laying a coat from a bath |
| `knead` | baking | works a plastic mass by hand |
| `dry` | platform | puts a thing where the air reaches it |
| `fire` | platform | runs a lit chamber against recipe rows; see below |
| `listen` | platform | perception |
| `name` | platform | naming |

`fire` takes `for <hold>`, and a charge loaded in a mould comes out in the
mould's shape. Also shipped: `pour`, `put`, `get`, `salvage`, `repair`,
`hammer`, `stir`, `grind`, `measure`, `analyze`, `look`.

**The clamp.** The charcoal clamp's `char <draught>` is a three-day sealed burn,
read from the draught when it ends. Every unit comes out alike: there is no
position and no atmosphere.

**`fire` is a recipe matcher.** It finds the recipe the chamber's charge
satisfies, applies a yes/no heat gate, destroys the inputs and mints the
outputs.

**The mould.** The container decides the shape. Freezing and draining ship, a
weight `put` on a mould presses it, and a mould is reusable or consumed (no row
is consumed). Its consumers are the hoop, the ingot mould, the ice pan and
rubber's oven moulds. ⚠ It records its own gap: *nothing refuses molten metal
into a vessel that cannot take it.*

**Water.** There are two water models:

- food's internal water activity;
- surface wetness from rain.

Turf is the precedent for a thing that dries, gets wetter in rain, and will not
burn wet.

**Maturation's `imparts`.** A vessel gives aroma to its contents on the clock.
A charred cask does this through its own char fields.

**Locks.** A key opens a lock by its **keyway**, an opaque token the key
carries.

**Weather.** The day's low and high can be read anywhere, and only the maple tap
reads them. **Nothing counts freeze-thaw cycles**, and **evaporation carries no
heat away**.

**The 22 ceramic goods.** None has a grade. They are:

| trade | goods |
|---|---|
| dairy | setting pan, starter crock, rennet jar, butter crock, jug |
| smelting | crucible, ingot mould |
| fuel | the retort |
| mining | the porcelain streak plate |
| farming | three plant pots |
| apiculture | the honey jar |
| chandlery | soft-soap jar, lye flask |
| cooking | tallow crock, smoke chimney |
| generic | bowl, dish, platter |
| *described, no material* | the bakery's stoneware starter crock, the infirmary's earthenware steeping pot |

**Brick.** A `brick` material exists, and 16 rooms author brick walls. There is
no fireclay, earthenware, stoneware, kaolin, gypsum or plaster, and no portable
brick or tile.

**Breakage.** `brittle` is a tag that nothing reads. The only breakage in the
game is a thrown thing shattering on its toughness. Every location's floor has a
material.

**The trades around this build.**

- **No discipline exists** for pottery, brickmaking, masonry or founding.
- **Nothing wins lead or tin**, though both exist as materials.
- **Salt** comes from the salt pan.
- **Vinegar and wine** are the shipped acids.
- **The Delight reaches Terminus by road only**: the gorge has never had a
  boat.

**In flight:**

- **Sugar** stages its boil by concentration and keeps the drain set's run-off.
  Its sugar cone is a stocked earthenware mould: *"sugar is pottery's first
  customer."*
- **Potash** makes ash a good, adds an ashery kiln, changes how firing carries
  fractions, and takes `flux`. It names *"ash glazes → the pottery build."*
  ⚠ Its pearl-ash calcining is a new firing *recipe*. Under M1 it becomes a
  heat transition on black salts, which adds a third item to the sequencing
  talk.
- **Paint** (slate, 2026-10-19) puts a coat on construction's layers. It wants
  coats on goods and leaves them unmodeled.

⭐ **Therefore what is genuinely new here is:**

- the six engine facts in the header;
- the clamp's grading and the kiln's atmosphere;
- `shape` over parametric forms;
- green ware's ruins;
- furnace linings and crucibles that wear;
- glazes, with lead leaching from the vessel's inside face;
- impressions, cast keys and the pour's physics;
- pressing and crystallizing;
- the bell, and the ring test;
- the ceramic water filter;
- four disciplines;
- two venues and a stall.

---

## Goals

- **Clay has a year, and physics enforces it.**
  - Clay is won in autumn and weathered by the winter's frost: more
    freeze-thaw days make better clay, up to a ceiling.
  - It is kneaded with sand and breeze in spring, then shaped and dried in
    summer and burnt in autumn.
  - Wet green brick that freezes shatters, so moulding stops before the first
    frost. No calendar rule says so.
- **The clay you build is the brick you get.**
  - Clay is a composition: clay mineral (plasticity), iron, lime, sand or grog,
    breeze, fireclay.
  - Kneading changes its fractions.
  - Plasticity, drying shrinkage, cracking, fired color and refractoriness all
    derive from the composition.
- **A piece is fired, not replaced.**
  - Firing ware is a change of **state** on the same piece: my jug, with my
    handle, my wall and my mark, comes out of the kiln as itself.
  - Its body derives from the **heat-work it actually received**, read off the
    thermal model: the peak heat, the time held there, the atmosphere.
  - The bodies run terracotta → earthenware → stoneware → refractory, and
    porosity, strength and color follow.
  - **One rule fires everything.** Limestone becomes quicklime, gypsum
    becomes plaster, and a glaze fuses under the same rule as clay
    vitrifying. `fire` has no recipe path.
- **A clamp's bricks are graded by where they sat**, and each carries the water
  absorption its firing gave it. W7 reads that absorption next.
- **Hot furnaces wear, and their keepers mend them.**
  - Every hot furnace's lining wears per firing and is relined with firebrick.
  - Crucibles wear per melt and are replaced.
  - A lining wears only where firebrick is sold.
  - Every NPC-run furnace is relined by its keeper.
- **A potter's hand shows in the pot, and the pot is theirs.**
  - Competence decides wall thickness, the largest form you can raise, and the
    grade. It decides deterministically, never by roll.
  - Forms are parametric, not a list. The potter names what they made and
    stamps it with their own mark.
  - A shelf of a player's pots is a visible record of their improvement.
- **A good has faces, and a face carries coats.**
  - A glaze is a coat laid by `dip` and fused by firing.
  - **The inside coat meets the contents**, so a lead glaze leaches into
    acidic contents silently.
  - **A sound coat holds water against a porous body**, so an unglazed jar
    weeps, its wet outside cools it by evaporation, and its water stays cool.
  - Coats decide color, gloss and how a surface cleans. Crazing cracks a coat.
- **Brittle bodies obey one rule.** A brittle body breaks when an impact beats
  its strength, which depends on the body, the wall and grog, against the floor
  it lands on. It cracks under **thermal shock** wherever that happens: a flame,
  a kiln opened hot, boiling water into cold ware, a quench.
  - **Hidden cracks are heard, not seen.** `ring` a pot, a brick or a bell, and
    a flaw sounds dull.
- **The mould is an envelope.** The matter decides what setting is. The mould
  decides the shape and the conditions, through its conductivity, permeability,
  absorbency, wetness and melting point. The cavity is shared: a plaster mould
  takes poured slip or pressed clay alike.
- **Anyone can take an impression of anything and cast it.**
  - The shape copies and the identity never does.
  - A thing whose function **is** its shape keeps that function in the cast:
    a cast key opens its lock, and a cast seal makes its seal.
  - A cast of a face is a likeness, never a disguise.
- **Pours fail by physics:**
  - misrun;
  - shrinkage without a riser;
  - a damp mould that blows;
  - chill against sand;
  - a receiver that melts or burns, for **every** vessel.
- **Pressing is one load from three sources** (a weight, a screw press, a blow
  on a die). A self-supporting charge releases at once.
- **Crystallizing is a set process**, and the drained run-off is a product.
- **The foundry casts bells.** A bell's pitch derives from its size and alloy,
  and a large bell is cast in a pit dug in the ground.
- **Porous stoneware filters water** by its pores. This is cleanliness's and
  watershed's new instrument against contamination.
- **Four disciplines are learnable and credited:**
  - brickmaking and pottery at the Delight;
  - founding at Rejection;
  - masonry, which relines here and is W7's next.

## Non-goals

Every item names its destination.

**W7, paint and maturation:**

- **Building upkeep → repair W7** (`repair-plan.md` § W7). That covers wall
  weathering, `maintain`, lime mortar, repointing, the hard-mortar spall and
  the bricklayer laying walls. W7 opts brick in. Lime mortar's only buyer is
  W7, so it ships there (lens 6).
- **Coats beyond ceramics → [paint-slate](../slates/builds/paint-slate.md).**
  That covers binders that set by oxidation or carbonation, an outside coat
  weathering sacrificially on the exposure clock, coats on building faces, and
  the authored **image** (a scene painted on a vase is paint's picture on a
  ceramic face). Paint's slate gets a note that its coat on goods rides this
  build's faces.
- **Moving casks onto faces → maturation.md**, recorded as the target. A
  charred cask is a char layer on its inside face. So are pitch-lined amphorae
  and tin-lined copper. Not migrated here.

**Freight, tax and rows that other subsystems own:**

- **Bricks by barge → [river-slate](../slates/builds/river-slate.md)**, plus
  **[freight-slate](../slates/builds/freight-slate.md)**. Bricks and wares go to
  Terminus by road here.
- **Breakage in transit, and packing in straw → freight-slate.**
- **The per-brick tax → brickmaking-slate § 3** (kept), for when the polity has
  a levy design.
- **Drain pipes, brick sewers, flue liners, clay lamps → their owners**, as
  rows on this build's bodies:
  - watershed's conduit ladder;
  - cleanliness's flue;
  - fire's lamp.

**Out for want of an input or an owner:**

- **Kintsugi → [taps.md](../subsystems/taps.md)'s deferred list.** It needs
  lacquer from a tapped tree, and none exists. The tinker's rivets ship here.
- **Porcelain and kaolin → pottery-slate § 9.** The streak plate stays an
  import.
- **Salt-glaze fumes as harm → the potash slate's smoke ordinance.** Here they
  are smelled, not dosed.
- **A fire code mandating brick, and zoning the brickfield → the
  [construction-slate](../slates/builds/construction-slate.md) and civics.**
  Recorded under lens 7. This build gives a polity the brick to mandate.
- **Ringing the curfew bell on a schedule → civics** (the curfew ordinance).
  Here the bell can be cast, hung and rung by hand.
- **Coin striking and minting authority → banking.md's coinage and the
  [attestation-slate](../slates/builds/attestation-slate.md).** This build
  ships the die and the struck blank, with provenance recorded.

**Later rungs and elsewhere:**

- **The Scotch and Hoffmann kilns, the pugmill, the jigger, extrusion →
  brickmaking-slate § 5 and pottery-slate § 4**, as later rungs of the same
  acts.
- **Printing type → nowhere, deliberately** (printing is not modelled).
- **Forming over a form (lasts, hat blocks, steam-bent wood) → each trade's own
  act**, per moulding-slate § 2.

---

## Placement

- **`/trade/ceramics`** is a new capability pack: brick, tile, firebrick,
  pottery and the filter. It ships the brickmaking, pottery and **masonry**
  disciplines; form names, glazes, the clamp and kiln rows, and the venue
  classes. Masonry lives here until W7 gathers the building trades.
- **Founding is `trade-smelting`'s.** The founder pours the smelter's melt.
  Its rows are the discipline, flasks, moulding sand, the bell, and the
  foundry. This closes moulding-slate question 4.
- **The kernel carries the engine facts:**
  - heat-work and the fired body;
  - clay composition;
  - faces and coats;
  - the inside face leaching into contents, by toxin and acidity;
  - brittle breakage and thermal shock;
  - evaporative cooling;
  - the freeze-thaw count;
  - the mould envelope, impressions, pour failure and survival;
  - pressing and release;
  - crystallizing and cure;
  - lining and crucible wear;
  - the `ring` verb.
- **Venues are locality rows.** The brickfield and pottery are in
  `hearts-delight`. The foundry and the fireclay and gypsum bands are in
  `rejection`. The stall is in `terminus`. ⭐ The test: **a second brickfield,
  pottery or foundry is rows only.**
- **The clay pit is quarrying's working.** The clay deposit is the locality's.
  Quarrying's `fire-pot` and `burn-lime` firing recipes retire into the
  materials' own heat transitions (M1), and pottery credits pottery. This closes moulding-slate question 9.

## Collisions

**Places.**

- **Heart's Delight.** The brickfield is new ground on the valley's alluvium,
  beside the farm, mill, sawmill, dairy, creamery, silk house and the
  public-works yard. It takes no ploughed field.
- **Rejection.**
  - The fireclay band goes **under the coal seam** at the quarry hill, with a
    gypsum band added there too.
  - The foundry sits beside the smelter and shares its furnace and crucible.
  - The glasshouse kiln, the limekiln, the retort and the smelting furnace all
    gain a wearing lining. ⚠ Their NPC keepers must reline them, or the
    furnaces become a time bomb.
- **Terminus market.** The potter's stall is new. ⚠ The general store's plant
  pots, the honey jars, and the chandlery's soap jars and lye flasks are
  re-pointed: **bought from the pottery first, with imports as a dearer
  backstop**. A sick potter must not empty the realm's shelves.
- **Terminus's curfew bell.** It is a hung bell in the market that anyone can
  `ring`.

**The 22 rows and the dorm pot.**

- Each row is re-pointed to its true body (S1), and every prop keeps its
  fixture.
- ⚠ A setting pan that can now break needs replacing, and the potter is where
  you buy one.
- **The dorm's starter pot** becomes terracotta. ⚠ It must never break from
  being set down or picked up.

**The shipped verbs.**

| verb | how it changes |
|---|---|
| `shape` | goes parametric; ⚠ glass's `shape bottle` keeps working word for word |
| `knead` | gains clay (potters knead; brickmakers tread) |
| `dip` | lays a glaze coat |
| `carve` | gains trimming at leather-hard, and the pattern |
| `fit` | gains a slip-joined handle and a furnace's lining |
| `fire` | lights and holds a chamber, and one rule fires what is in it (M1). There is no recipe path, and the draught is a setting of every firing. |
| `hammer` | gains a blank on a die |
| `char` | stays charcoal's: charring wood is a different act |

New verbs:

- **`press` is the news ticker's**, so the screw press is worked with **`turn`**.
- **`impress <pattern|stamp> in/on <medium>`** (alias `mold`) is the one act of
  pressing a hard shape into a soft medium. It covers a sword into sand, a
  maker's stamp into a leather-hard jug, and a seal into wax.
- **`ring <thing>`** strikes a body and hears it. It covers a bell, a pot and a
  brick. `tap` is forestry's sap verb.

**Other subsystems.**

- **Fire.** `fire`'s recipe path now carries both a state change and
  transformations. ⚠ Potash is changing the same path.
- **Maturation's `imparts`** is the special case of a face giving to its
  contents. It is unchanged here, and it moves onto faces later (Non-goals).
- **Cleanliness** learns clay as a dirt kind: the brickfield is mud, and potters
  are muddy. It also learns that a crazed coat or bare porous body holds dirt
  and a sound glaze wipes clean.
- **Locks and keys.** A cast key carries its pattern's keyway.
- **Belief and disguise.** A face cast confers nothing.
- **The repair tinker** gains riveting a broken pot.
- **Forestry's coppice** gains a buyer: clamps and kilns eat wood.

---

## Surface decisions

The **M-** decisions are the model audit's: where a shipped model was not sound
for this build, and what replaces it. The **S-** decisions are surface
answers.

### M1. One rule fires everything: materials change under heat, pieces keep their identity

The owner's ruling (2026-10-20): *one rule or set of physics that satisfies
both outputs* — never "do x if it's a recipe, y if it's pottery."

**Heat-work.** A hot place delivers heat-work to everything in it. Each piece
keeps a record from its own thermal state, the same model that warms a loaf in
an oven:

- the peak heat it reached;
- the time it held there;
- the atmosphere.

**Materials declare how they change under heat.** Each transition has a
threshold, and conversion is **partial with heat-work**, so a firing can stop
part-way:

| material | transition | under-done |
|---|---|---|
| **clay** | vitrifies continuously; body, porosity, strength and color are a function of how far it got | a soft, porous body |
| **limestone** | becomes quicklime above ~1170 K, losing its CO₂, so the same lump comes out at about 56% of its weight. The old "2:1 ratio" was that mass loss. | ⭐ a lump with an unburnt core, as lime-burners really got |
| **gypsum** | becomes plaster at ~420 K | — |
| **a glaze** | fuses at its maturing heat (M6) | — |
| **rubber** | its shipped cure is already data on the feedstock | — |
| **a mixed glass batch** | turns to glass; the batch is mixed into one blend first, as glassmakers do | — |

**The piece keeps its identity**: maker, form, wall, mark and joints. Its
material and mass change. A charge in a mould takes the cavity's shape when it
sets (M2).

**Nothing here is special to `fire`.** Heat-work accrues wherever a thing is
hot, so a pot caught in a house fire is fired. `fire` lights and holds a
chamber. The clamp needs no special case either: each brick integrates the heat
at its own position. Discipline credit comes from the transition or the form's
trade, never a recipe row. Crafting recipes outside firing are unchanged.

**Heat-work is read the potter's way.** A kiln shows no number. You read:

- **pyrometric cones** slumping through the spyhole;
- **the glow's color** (incandescence).

Competence resolves the detail of those readings and never their access.

### M2. The shared thing is the cavity

The two kinds of moulding are one shape and different matter:

- **Casting:** a fluid sets in a container.
- **Pressing:** a plastic solid is pushed in and released.

A mould's shape is an authored cast row or an impression. How matter gets in
(pour, press, blow) and how it sets (freeze, drain, dry, cure, release at once)
are the matter's. A plaster mould casts slip and press-moulds clay with the same
cavity.

### M3. Clay is a composition

Clay's fractions are:

- clay mineral (plasticity);
- iron oxide (red);
- lime (yellow, and lime-blowing if it is in nodules);
- sand or grog (tames cracking, makes a flameproof body);
- organic breeze (fires the brick from within);
- the fireclay character (refractory, low iron and flux).

Deposits seed the fractions. Kneading blends them. Every derived property reads
them.

### M4. Green ware's water re-wets, as turf's does

Moisture decides the state:

1. plastic;
2. leather-hard (the window to trim, join and stamp);
3. bone-dry (the only state that fires).

That moisture **dries in air and rises in rain**:

- **Rain** on uncovered green ware slumps it.
- **Frost** on wet green ware shatters it.
- **Drying too fast** cracks it. That is derived from the drying rate against
  plasticity, against sand and grog, and against the evenness of the wall.

Green ware shrinks drying, so the brick mould is authored oversize. The hacks
are a roofed open place, so where you put the bricks is the shelter. There is no
cap verb.

### M5. Brittle is a property, and thermal shock is one rule

- **Breakage.** A brittle body breaks when an impact's energy beats its
  strength. Strength derives from its body, wall thickness and grog, and the
  impact from the fall and **the floor's material**.
  - A rush-strewn earth floor forgives a dropped mug. A flagstone floor does
    not.
  - A thick beginner's mug survives what a master's thin bowl does not.
  - Breaks come only from dropping, throwing, knocking and heat. **Never from
    being set down, put away or carried.**
- **Thermal shock.** A temperature change faster than the body's expansion
  allows cracks it. The same rule covers:
  - a dense body on a flame;
  - a kiln opened hot (dunting);
  - boiling water poured into cold ware;
  - a quench.
- **Hidden cracks.** Dunts, hairlines and casting flaws do not always show.
  `ring` reveals them: a sound body rings and a flawed one sounds dull. A buyer
  at the stall can check a pot. Railway wheel-tappers did exactly this.

### M6. A good has faces, and a face carries coats

Every good has an **outside**, and a vessel also has an **inside**. Each face
carries a layer list, outermost first, of materials and thicknesses. That is
construction's shape for walls and roofs, so a building face and a pot face are
one idea.

What a face's outermost layer decides:

| what | how |
|---|---|
| **What meets the contents** | The inside coat imparts into what the vessel holds (M7). |
| **Whether it holds water** | A porous body **weeps** through any face without a sound coat. An unglazed jar's outside stays wet and **evaporation cools it** (M8). A glazed jar holds and stays warm. |
| **Color, gloss, soundness** | Glaze colors come from metal oxides, using glass's color from iron, copper and cobalt. |
| **Cleaning** | A crazed coat or bare porous body holds dirt. A sound glaze wipes clean. |

A coat is laid wet by **`dip`** and **fused by firing**. That is M1's state
change: *a wet glaze*, then *a fused glaze*. Crazing happens when a coat shrinks
more than its body on cooling. The coat cracks, the vessel weeps a little, and
dirt lodges.

### M7. Lead leaches from the inside face into the contents

A vessel's inside face gives to what the vessel holds. A lead coat gives a
**toxin**, at a rate that scales with **the contents' acidity**, a new material
fact:

- vinegar, wine, fruit juice, whey and pickling brine are acidic;
- water is not.

Acidic contents held against a lead-glazed inside take up lead with time, and
eating or drinking them doses the eater through the toxin route.

**No look, smell or taste reveals it.** You learn it from knowledge, an assay,
or the sickness.

### M8. Evaporation carries heat away

Water leaving a wet surface takes its latent heat with it. This is a kernel
fact, and its first readers are:

- the weeping jar, cooler than the room;
- wet clothes and sweat, recorded for exertion and textiles.

### M9. Shape and identity

An impression holds:

- **the pattern's kind** (seats and minted singletons step up to what they
  extend);
- **its volume**;
- **its form and parts**, as description;
- **whose object it was taken from**.

A cast from it is that kind in the poured material:

- mass from the poured density;
- function from materials-response;
- one piece, seams showing.

The look says *"a pewter cast of a sword"*. Name, mark, grade, seat and history
never copy.

⭐ **Where a thing's function IS its shape, the cast performs it.**

- A key's keyway is part of its shape, so a wax impression of a key cast in
  brass **opens the lock**.
- A cast seal makes the seal's impression.
- A cast die strikes.

The engine records provenance and judges nothing. ⚠ **A cast of a face is a
likeness, never a disguise.** It confers nothing to belief.

### S1. The fired bodies, and the 22 rows

The bodies are derived (M1, M3), not authored. The 22 rows are re-pointed to the
clay and firing they were made of:

| body | rows |
|---|---|
| terracotta | three plant pots, the dorm starter pot, the setting pan, the clay pot |
| glazed earthenware | butter crock, tallow crock, honey jar, rennet jar, soft-soap jar, jug, lye flask, bowl, dish, platter, steeping pot |
| stoneware | the dairy's and the bakery's starter crocks |
| refractory (fireclay) | crucible, ingot mould, retort, smoke chimney |
| porcelain (import) | the streak plate |

### S2. The freeze-thaw count is a weather fact

A place can say how many days since a given moment crossed freezing both ways.

- **The clay heap reads it.** A mild winter weathers worse, and a heap indoors
  stops counting.
- **Frost tilth and frost damage to brick are its next readers.**

### S3. Kneading clay is `knead`

Work the clay in the temper pit with water, sand (for fat clay) and breeze (town
ash) to the moisture window:

- too wet slumps;
- too dry cracks.

The pit needs water.

### S4. `shape <material> into <form>`, with forms that are parametric and named

A form is:

- a **class**: open vessel, closed or necked vessel, flatware, solid block, or
  cone;
- a **capacity**;
- a **proportion**: tall, squat, wide or narrow.

Familiar words are rows that map onto those parameters. *Mug* is an open vessel
of about a pint with a handle seat. *Brick* is the statute block. An author adds
a word with a row.

A player can state any capacity and proportion the instrument allows, and then
`name` what they made. The instrument and the material bound the possible:

- the brick mould makes its brick;
- the tile mould makes its tile;
- the wheel throws round forms;
- hands coil anything;
- the blowpipe makes bottles and cylinders, as shipped.

At the brick table, `shape` is **a game-day's durative work** at a rate
competence sets. A master's gang makes thousands, onto a pallet. On the wheel,
one `shape` makes one pot.

**Competence decides the pot, deterministically:**

- wall thickness, and so weight;
- the largest form you can raise;
- the grade.

Below your band a pot comes out heavier, never failed. Above it the form is
refused, and the refusal names the band.

### S5. The maker's mark

A potter owns a **stamp**, a die they cut. `impress stamp on jug` at
leather-hard marks the base, and firing records the date. A pot's base reads its
maker and when it was fired.

⭐ **A player's shelf of their own pots is their improvement, visible**: the
heavy first mug and the light later one, with no number anywhere.

### S6. `fire` and the draught

`fire <kiln|clamp> [draught]`. The draught can be reset during the burn, as
`char` re-sets charcoal's. It decides the atmosphere:

- **oxidizing** for red and warm colors;
- **reducing** for blue brick and celadon.

It also shifts the heat reached.

| furnace | how it fires |
|---|---|
| **The clamp** | A sealed burn of days, read at the end. Rain and wind matter. Each brick's heat-work follows **its position**: over-burnt clinker by the fire channels, hard well-burnt in the middle, soft place brick at the skin. The gradient derives from the clamp's size and draught, and a **better setter** (competence) sets fuel channels that narrow it: fewer bad bricks, deterministically. |
| **The pit firing** | The clamp's open cousin. |
| **The updraft kiln** | The potter's, for bisque and glost. |

Burning clamps and kilns **glow at night** and **smell** across the valley.

### S7. Wasters, sherds and grog

Cracked, slumped or broken pieces `grind` back to **grog**. Kneaded in, grog
strengthens a clay and makes a flameproof cooking body.

### S8. Glazes

A glaze is a slip of its batch (silica sand, a flux, clay) `stir`red into a
bucket, laid by `dip`, and fused in a glost firing (M6).

| glaze | flux | in this build |
|---|---|---|
| **ash** | wood ash | hearth ash; potash makes it a good when it lands |
| **lead** | lead | an **import line** at Rejection's store; no ore wins it |
| **salt** | salt thrown in at peak heat | the salt pan |
| **tin** (opaque white) | tin | an **import line** |

Faults:

- **crazing** (M6);
- **running** (over-fired);
- **crawling** (over dust or grease, which cleanliness reads).

### S9. Uses that follow from the body

- **Earthenware with grog survives the cooking fire. Stoneware cracks on it**
  (M5).
- **Porous ware absorbs** fat and flavor. **Glazed ware and stoneware are
  hygienic.**
- **The weeping jar cools its water** (M6, M8).
- **The ceramic water filter.** A porous stoneware cylinder that water seeps
  through strains out contamination **by pore size against the contaminant's
  size**: particles and bacteria, never dissolved salts or poisons. This is
  Doulton's filter of the cholera years, and an instrument against watershed's
  contamination by kind.

### S10. Linings and crucibles wear

**Linings.** Every furnace above a ceramic threshold has a lining that wears per
firing:

- the smelting furnace;
- the glasshouse kiln;
- the limekiln;
- the retort;
- the brickfield's and the potter's kilns.

A thinning lining reads in `look` and lowers the reachable heat. Burnt through,
it refuses to light. `fit lining to <furnace>` with firebricks relines it and
credits masonry.

**Crucibles** wear per melt and crack, and the refractory potter makes new ones.

⚠ **Supply rules:**

- Wear runs only where firebrick and crucibles are sold in the realm.
- Every NPC keeper buys and relines.

### S11. Standards

The polity's standards declare a **statute brick**. Terminus declares
9 × 4½ × 2¼ in. Anyone can `measure size` a brick against it, and the gauger's
word is of record. The gauger's capacity reading reads any vessel, so a polity
may also declare a standard measure jar, as amphorae once were. The engine
records and never forbids.

### S12. The mould as an envelope

| property | effect |
|---|---|
| **conductivity and mass** | Chill casting: iron in iron sets white and hard; in sand, grey and soft. |
| **absorbency** | A plaster mould drinks a slip's water. |
| **permeability or openings** | Drain sets (shipped). |
| **wetness** | A damp sand mould **blows**: the cast is ruined and the pourer burned. |
| **melting or ignition point** | Survival (S13). |

### S13. Every pour obeys its receiver

A receiver whose melting or ignition point is below the pour's temperature
melts or burns: a wooden mould under bronze, a tin cup under molten lead. This
applies to **every** vessel and closes mould.md's gap.

### S14. The pour fails by Chvorinov's rule

Freezing time grows with **(volume ÷ surface)²**, scaled by the mould.

- **Misrun.** Poured too near the melting point, a thin shape freezes short.
  Superheat buys time.
- **Shrinkage.** The last part to freeze goes porous. A **riser** feeds it.

A competent founder reads the melt's color and the sand's dryness in advance.
Nothing is rolled.

### S15. Impressions and patterns

`impress <pattern> in <flask>` rams moulding sand (quarry sand with a little
clay) round a pattern, or lays plaster over it (M9).

- **A sand mould is consumed.** It is broken to release the cast, and its sand
  is re-tempered.
- **Lost wax** consumes the wax pattern too, and the wax returns as wax or
  tallow.
- **A pattern carved oversize** (carpentry's `carve`) by the metal's shrinkage
  casts true.
- **Draft.** A shape that cannot slide out of a one-piece permanent mould needs
  a **two-piece mould**, which is an assembly. It wears at its joint and is
  repaired like one.

### S16. Pressing

| load | how |
|---|---|
| **a weight** | `put` (shipped) |
| **a screw press** | **`turn press`**, more pressure per turn. Used for the creamery's heavier cheese press and pressed roof tiles. |
| **a blow** | **`hammer <blank> on <die>`**: struck tokens carrying the die's provenance |

A press works when its pressure beats the charge's resistance, which for clay is
its moisture.

**Shape-and-release.** A charge with green strength (tempered clay, butter, a
pressed tile) leaves the mould at once and sets outside it.

### S17. Crystallizing and cure

- **Crystallizing.** A solution sets crystals when it holds more than its
  material dissolves at its temperature, whether by cooling or by water
  leaving. The run-off goes as bulk into the vessel beneath.
  - The consumer here is the salt pan: salt crystals, with bittern below.
  - Alum and saltpetre are rows.
  - ⚠ Convergence with sugar's staged boil and potash's pot cake is a
    sequencing item.
- **Cure.** Plaster (gypsum burnt in the limekiln, then mixed with water) sets
  by **cure**, a chemical set with no act. It gives the slip mould and the
  plaster impression. Lime mortar's carbonation is the same set, and it ships
  with W7.

### S18. Recast and interchangeable

- **Recast.** A cast in a material that melts salvages back to a pool. Fired
  clay salvages to sherds.
- **Interchangeable.** Casts from one impression fit any whole built to it
  **without re-making the joint**.

### S19. Bells

A bell is cast bronze, and **its pitch derives from its size and alloy**, given
in words and named notes.

- **Rung, it carries** (a sound across places). A cracked bell sounds dull (M5).
- **A small bell** casts in a flask.
- **A large bell** is cast in the **bell pit**, a loam mould fixed in the
  foundry yard. The pour is the founder's day. A pit you climb into, a mould
  that is a place, is a later build.
- **Terminus's curfew bell** hangs in the market, and anyone can `ring` it.

### S20. The works and their people

**The Delight brickfield-and-pottery** is one works with two trades. Its places:

- the clay pit;
- the weathering ground;
- the temper pit, with water;
- the moulding shed, with the brick and tile moulds and the screw press;
- the hacks;
- the clamp ground;
- the potter's shop, with the wheel and the updraft kiln.

The ground is wet clay and soils you.

**Who works it:**

- **The brickmaster** is a business. It employs a moulder's gang and a
  **setter** (rostered seats) and buys breeze and sand.
- **The potter** keeps the Terminus stall and the re-pointed lines.
- **The businesses' NPCs produce through the same chain**: shifts that consume
  clay and fuel.
- **A player sells into the same lines** by consignment.

**The Rejection foundry** sits beside the smelter. It has the founder's floor,
flasks, moulding sand, a pattern rack, the bell pit, and **the founder** as a
seat.

**Haulage** to Terminus is by road. A worked-out clay pit floods to the water
table and stands as a pond.

---

## Lens pass

The pass was run twice: once to confirm the slates, and once **generatively**
for what they left out. Most of the second pass is now in M1–M9 and S1–S20.
What stays out is in the Non-goals with its destination.

1. **Pedagogy.**
   - **Concepts this teaches:**
     - frost weathering;
     - the temper window;
     - composition → plasticity, color and refractoriness;
     - drying shrinkage;
     - heat-work → vitrification → porosity;
     - the cone and the glow as instruments;
     - oxidizing against reducing;
     - leather-hard as a window;
     - a glaze is a glass on a face;
     - expansion mismatch (crazing);
     - thermal shock;
     - acidity × lead × time;
     - evaporative cooling;
     - filtration by pore size;
     - Chvorinov;
     - chill against sand;
     - solubility;
     - shape against identity;
     - pitch from size;
     - recastability as a melting point.
   - **Dominant Discipline.** Each trade's dominant skill is a judgment that
     decides the outcome, never recall:
     - **brickmaking:** clay and season;
     - **pottery:** the wall and the firing;
     - **founding:** the heat and the mould;
     - **masonry:** the reline.
2. **Creative expression.**
   - The floor is rows: a deposit, a form word, a glaze, a second works or
     foundry.
   - ⭐ The bespoke case has three answers:
     - **parametric named forms with the potter's own mark**;
     - **the impression**: any shape, cast in anything that takes it;
     - **a clay you composed**: a realm's brick has its own clay's color.
   - Constant: the physics and the standards. Variable: every form, mark,
     composition, cast, place and bell.
   - **Named-work test:**

     | work | verdict |
     |---|---|
     | *Andrei Rublev*'s bell | passes (S19) |
     | the Terracotta Army | passes: press-moulded bodies, `carve`d faces |
     | the Greek amphora | passes: standard jar, stamped handle |
     | any wax-key heist | passes (M9) |
     | Grayson Perry's pots | **routed to paint** (the image) |
     | *Ghost* | half: the wheel and the mud pass; two hands on one wheel is not modelled |

3. **Immersion and participation.**
   - **3a, immersion:**
     - the glowing clamp at night and its smell;
     - the muddy brickfield;
     - a beginner's heavy mug and a dull-ringing cracked pot;
     - a sweating jar;
     - seams on a cast copy;
     - a wooden mould that burns;
     - the curfew bell carrying across the market.
   - **3b, participation.** Every role is a vacancy an NPC holds and a player
     can take:
     - the brickmaster, moulder, gang and setter;
     - the clamp burner;
     - the potter;
     - the founder and the pattern-maker;
     - the furnace keeper who relines;
     - the tinker who rivets;
     - the stallholder;
     - the ash-man.
   - **The polity can do things we did not want.** It can:
     - ban lead glaze, or fail to;
     - declare a statute brick or measure;
     - police dies and keys;
     - build a **public kiln** (rows only);
     - mandate brick after a fire (W7 and construction);
     - zone the brickfield out of town (civics).
4. **Values.** None of these has an answer the engine supplies:
   - lead glaze: cheap now, poison later, silently;
   - soft brick, which charges the wall's next owner;
   - mend an heirloom crock or replace it;
   - reclaimed brick against new;
   - the handmade pot against the slip-cast copy;
   - the cast key, and the uses copying is put to.

   The **visible-progress** shelf (S5) is this lens's reward, and it is
   evidence, never praise.
5. **Continuity.**
   - **The same commands across epochs.** Clamp → kiln. Coil → wheel → slip
     cast → printer. Sand → die → injection. Weight → screw → power press. The
     same `shape`, `fire`, `pour`, `impress`, `turn`, `fit`, `repair` and
     `ring` answer each rung.
   - **Who holds the obsolete half:** the hand-moulder displaced by the brick
     machine. The wheel survives as studio craft, and the handmade becomes
     luxury (silk's lesson, embodied hours).
6. **Economy.**
   - **Produces:** brick by grade, tile, firebrick, crucibles, ware by body
     and grade, filters, casts, bells, sherds, grog.
   - **Consumes:**
     - clay and fireclay;
     - sand and gypsum;
     - breeze and ash;
     - salt;
     - wood, which gives the coppice a buyer;
     - straw;
     - water;
     - imported lead and tin.
   - **Demand was there first:**
     - the 22 goods, re-pointed, with breakage making it recur;
     - furnace linings and crucibles, recurring;
     - the filter against contamination;
     - W7's brick, next.
   - **Imports** stay the dearer backstop on every re-pointed line.
   - ⚠ **A gap, recorded:** building brick sells mostly to W7, so until then
     the brickfield's main buyer is firebrick.
7. **Governance.**

   | measure | criterion | appeal | tier |
   |---|---|---|---|
   | the statute brick and measure | the standard | the gauger's measure | C |
   | a lead ban | — | — | C, the polity's to pass |
   | dies and cast keys | who holds the die | — | C; provenance is recorded and the engine judges nothing |
   | a public kiln | — | — | civic infrastructure that **makes firing common** |

   ⭐ The public kiln is the one civic case here: the brickmaster loses an
   advantage.

**Altitude.**

- **Invariant:**
  - a fired piece's properties derive from its composition and its
    heat-work;
  - shape copies, and identity never does;
  - every pour obeys its receiver's melting point;
  - a brittle body breaks only by a cause.
- **Grain:**
  - moulding rates;
  - the weathering ceiling;
  - the clamp's gradient;
  - wall bands;
  - the lead leach rate;
  - lining wear;
  - the filter's pore size.
- **Title:** the Delight works, the Rejection foundry, the Terminus stall, the
  statute brick, the curfew bell.

---

## The drive

Run on a test world with founder clock jumps. Each step is a checkpoint that can
fail.

### A. The brickmaker's year

1. **Win the clay.** In autumn, at the Delight clay pit, run `dig clay with
   spade` to win clay lumps. Then:
   - `look clay` → *fresh, unweathered*.
   - `analyze clay` → its composition in words (fat, iron-rich).
2. **Weather it.** Leave the heap on the weathering ground and jump through
   winter. `look clay` → *frost-broken*. A heap kept indoors still reads
   *unweathered*.
3. **Knead it.** In spring, at the temper pit, run `knead clay` with sand and
   breeze → tempered clay at the window. Knead a second batch of fat clay with
   no sand.
4. **Shape it.** In the moulding shed, run `shape clay into brick` → a
   durative day and a pallet of green bricks. A low-band moulder makes fewer.
   The player is muddy.
5. **Rain and frost.**
   - One green brick left in the open yard through rain → slumped.
   - One left wet across a frost → shattered.
6. **Dry them.** Put the rest in the hacks and jump weeks → leather-hard, then
   bone-dry. The no-sand batch has cracked.
7. **Fire the clamp.** Set the bricks and fuel, run `fire clamp`, and jump the
   burn.
   - At night the clamp glows from the next place, and its smell carries.
   - `get bricks` → three grades by position.
   - `ring` a well-burnt brick → it rings. A place brick sounds dead.
   - `analyze` → the well-burnt brick absorbs little, the place brick much.
8. **Reduce the draught.** A second clamp fired at a reducing draught → blue
   bricks.
9. **Measure.** `measure size brick` against Terminus's statute brick. A brick
   from an oversize mould reads *off standard*.

### B. Firebrick, linings and crucibles

10. **Make firebrick.** Win fireclay at Rejection's quarry hill, under the coal,
    and make firebricks.
11. **Wear a lining.** Fire the smelting furnace repeatedly → `look furnace`
    reads the lining thinning and the heat dropping. Burnt through, it refuses
    to light.
12. **Reline it.** `fit lining to furnace` with firebricks → relined, masonry
    credited, and the smelt runs.
13. **Wear a crucible.** Melt repeatedly in one crucible → it reads worn, then
    cracks. A new refractory crucible from the potter serves.
14. **The keeper does it.** Jump time with no player present → the glasshouse
    kiln's NPC keeper has bought firebrick and relined.

### C. The potter

15. **Throw at your band.**
    - A novice runs `shape clay into mug` → a heavy, thick-walled mug.
    - `shape clay into jar holding 2 gallons` → refused, and the refusal names
      the band.
    - A practiced character's mug is light.
    - A practiced character runs `shape clay into tall jug holding 3 pints` →
      that jug. `name jug Mother's jug` names it.
16. **Trim, join, mark.** At leather-hard:
    - `carve foot on mug` → trimmed.
    - `fit handle to jug` → joined. A handle much wetter than the body cracks
      on drying.
    - `impress stamp on jug` → the potter's mark.
    - Bone-dry ware will not trim.
17. **Bisque fire.** Fire in the kiln → porous bisque. Through the spyhole the
    cones read the heat, and a practiced character reads more detail.
18. **Glaze.** `stir` an ash glaze and a lead glaze, `dip` two bisque crocks
    *inside*, and glost-fire them → glazed crocks. Their bases read maker and
    date.
    - Open the kiln hot on a third firing → dunted pots, some cracked visibly
      and one only audibly. `ring` finds it.
19. **Lead leaches.** Fill the lead-glazed crock with vinegar and jump a week.
    - `look`, `smell` and `taste` say nothing.
    - Drinking it doses lead.
    - The ash-glazed crock's vinegar is clean.
20. **Flame and body.** Set a stoneware crock on a cook fire → it cracks. A
    grogged earthenware pot on the same fire survives. Boiling water poured
    into a cold glazed mug → it cracks (thermal shock).
21. **The weeping jar.** Fill an unglazed jar with water in a warm room → it
    weeps, its outside stays wet, and its water reads cooler than the air. A
    glazed jar beside it reads at room heat.
22. **The filter.** Pour contaminated river water through a ceramic filter →
    the bacterial contamination is gone, and a dissolved contaminant passes.
23. **Breakage and mending.**
    - The practiced character's thin bowl dropped on the stone floor → sherds.
    - The novice's thick mug → survives.
    - The thin bowl dropped on an earth floor → survives.
    - `grind` the sherds → grog.
    - The tinker rivets a broken bowl → mended, and the mend shows.
24. **The shelf.** `look` at the novice's first mug and the practiced
    character's latest → the difference reads in words (heft, wall, finish).
25. **The stall.** At the Terminus potter's stall, `buy` a plant pot → it is
    the pottery's, with maker and body. The general store's plant-pot line draws
    from the pottery.

### D. Moulding, founding and bells

26. **Slip cast.** `stir` slip, fire gypsum to plaster, and let a plaster mould
    cure. `pour` slip in → the mould drinks it and a cup releases.
27. **Impression.** At the foundry, `impress sword in flask` → a sand mould.
    Pour the smelter's molten pewter → *"a pewter cast of a sword"*, with
    seams, derived mass and no name. `look` names whose sword it was.
28. **Cast a key.** `impress key in wax`, cast it in brass → the cast key
    opens the key's lock.
29. **Make the pour fail.**
    - Too cool into a thin pattern → misrun.
    - A damp flask → it blows and burns the pourer.
    - No riser → porous; a riser → sound.
30. **Survival and chill.**
    - Bronze into a wooden mould → it burns.
    - Lead into a tin cup → the cup melts.
    - Iron into an iron mould → white and hard; into sand → grey and soft.
31. **Pressing.**
    - `turn press` on a cheese → firmer than the stone made it.
    - `turn press` on a tile charge → a pressed tile releases.
    - `hammer blank on die` → a struck token carrying the die's provenance.
32. **Crystallize.** Brine in the salt pan → salt crystals, with bittern
    beneath.
33. **Recast and fit.**
    - `salvage` the pewter cast → a pool, which recasts.
    - Salvage a pot → sherds.
    - A part cast from one impression `fit`s a whole without a new joint.
34. **Patterns and bells.**
    - `carve pattern` → an oversize pattern that casts true.
    - Cast a hand bell → `ring bell` sounds its note.
    - Cast a larger bell in the foundry's pit → a lower note.
    - `ring` the Terminus curfew bell → it is heard in the next places.
35. **Restart the server.** All of these survive:
    - green bricks;
    - a curing plaster mould;
    - a lining's wear;
    - a lead dose in progress;
    - an impression;
    - a potter's mark;
    - a named jug.

## Acceptance criteria

All observable from outside the code.

**The brickmaker's year**

1. A player wins clay at the Delight. Its composition and its weathering read
   in words, and a mild winter weathers it worse.
2. Green ware is ruined by rain, by frost when wet, and by fat clay drying too
   fast, each observed on a real piece. Only bone-dry ware fires.
3. A clamp yields grades by position, each with a readable absorption. A better
   setter yields fewer bad bricks. A reducing draught yields blue brick.

**Fired bodies, furnaces and the potter**

4. A fired piece keeps its identity through the kiln. Its body follows from its
   composition and heat-work, and the 22 goods read as S1 gives them.
5. Linings and crucibles wear, read, lower heat or crack, and are replaced. An
   NPC-run furnace is relined by its keeper without a player.
6. Competence decides a pot's wall, its largest form and its grade, without a
   roll. Forms accept any capacity and proportion in the instrument's range,
   the potter can name the result, and a mark and a firing date read on the
   base.

**Glazes and coats**

7. Trimming, joining and stamping work only at leather-hard, and a moisture
   mismatch cracks a joint.
8. A glaze is a coat laid by `dip` and fused by firing. Crazing, running,
   crawling and dunting can each be produced and seen or heard.
9. Acidic contents against a lead-glazed inside dose lead with time, and no
   sense reveals it. An ash glaze does not.
10. An unglazed jar weeps and cools its water below room heat. A glazed one
    holds.

**Breakage, use and sale**

11. Breakage follows the impact against the body's strength and the floor's
    material. Thermal shock follows from a fast temperature change. Nothing
    breaks from ordinary handling, and `ring` reveals hidden cracks.
12. A ceramic filter removes particulate and bacterial contamination, and not
    dissolved contamination.
13. The Terminus stall sells the pottery's wares. Re-pointed lines draw from
    the pottery first and from imports as a dearer backstop.

**Moulding and founding**

14. Anyone can take an impression of anything and cast it. The cast carries
    the kind, the derived mass, the material's behavior, the seams and the
    provenance, never the identity. A cast key opens its lock, and a face cast
    disguises no one.
15. Every pour into any vessel obeys the receiver's melting or ignition point.
16. Misrun, shrinkage, a blown damp mould, and chill against sand each follow
    from the pour's physics, and a competent founder can read the signs in
    advance.
17. A screw press and a die each load a mould, and a self-supporting charge
    releases at once.
18. Brine crystallizes with its bittern drained below, and plaster sets by cure
    and casts slip.
19. Metal casts salvage to a pool and fired clay to sherds. Casts from one
    impression fit without a new joint.

**Bells, disciplines, persistence**

20. A bell's note follows its size and alloy, and it carries when rung. A large
    bell casts in the pit, and the curfew bell can be rung.
21. Brickmaking, pottery, founding and masonry are learnable and credited by
    their acts. The statute brick measures against Terminus's standard.
22. Every piece of state above survives a server restart.

## Cross-references

**Seeds:**

- [brickmaking-slate](../slates/builds/brickmaking-slate.md)
- [pottery-slate](../slates/builds/pottery-slate.md)
- [moulding-slate](../slates/builds/moulding-slate.md)

**Shaped by:** [paint-slate](../slates/builds/paint-slate.md) (coats; order:
ceramics → W7 → paint).

**Subsystems:**

| subsystem | what this build draws on |
|---|---|
| [mould.md](../subsystems/mould.md) | the shipped mould |
| [fire.md](../subsystems/fire.md) | the `fire` verb |
| [glass.md](../subsystems/glass.md) | `shape`, color from metal oxides |
| [rubber.md](../subsystems/rubber.md) | firing in a mould |
| [assembly.md](../subsystems/assembly.md) | `fit`, parts, the gauger |
| [construction.md](../subsystems/construction.md) | layers |
| [maturation.md](../subsystems/maturation.md) | `imparts`, `chemical` |
| [credential.md](../subsystems/credential.md) | keyways |
| [belief.md](../subsystems/belief.md) | disguise |
| [ground.md](../subsystems/ground.md) | floors |
| `trade-quarrying` | `dig` |
| [weather.md](../subsystems/weather.md) | the day's low and high |
| [spoilage.md](../subsystems/spoilage.md) | water state |
| [metabolism.md](../subsystems/metabolism.md) | toxins |
| [materials-response.md](../subsystems/materials-response.md) | how a material responds |
| [thermal.md](../subsystems/thermal.md) | heat |
| [watershed.md](../subsystems/watershed.md) | contamination |
| [cleanliness.md](../subsystems/cleanliness.md) | dirt kinds, cleaning |
| [instrumentation.md](../subsystems/instrumentation.md) | readings |
| [civics.md](../subsystems/civics.md) | standards, the curfew |
| [employment.md](../subsystems/employment.md) | seats, rosters |
| [retail.md](../subsystems/retail.md) | stalls, stock lines |
| [forestry.md](../subsystems/forestry.md) | the coppice |

**In flight:**

- `reqs/sugar`: the cone, the staged boil, the drain's run-off.
- `reqs/potash`: ash, `fire`'s fractions, `flux`, slaking.
- repair W7, the next consumer of brick.
