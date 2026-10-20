# Ceramics & moulding — requirements

**Kind:** feature
**Leads from:** kernel — the mould as an envelope, fired clay as a
derivation, the freeze-thaw count and breakage are engine facts. The first
consumers ship in this same build: the Delight valley brickfield and pottery
(the `/trade/ceramics` pack), and the Rejection foundry.

Three slates, one build. Nothing in the world makes brick, tile, firebrick or
pottery. Twenty-two shipped goods are made of one generic `ceramic` and are
conjured by counters and props. Every hot furnace in the game is "lined with
brick" in prose only. The mould system shipped with dairy without a design
conversation of its own, and the moulding slate then examined it (§ 0a). This
build ships clay's whole year:

- winning, weathering, tempering;
- shaping, drying, firing, and grading what came out;
- pottery's wheel, glaze and breakage;
- the mould as an envelope, which also gives the game its foundry.

Seeds:

- [brickmaking-slate](../slates/builds/brickmaking-slate.md)
- [pottery-slate](../slates/builds/pottery-slate.md)
- [moulding-slate](../slates/builds/moulding-slate.md) (§ 0 rulings, § 0a the
  mechanism)

**Scope rulings (the owner, 2026-10-20):**

- **Repair's W7 (building upkeep) stays its own build.** This build supplies
  the brick and its grade, and W7 opts brick in.
- **The whole moulding slate rides here.**
- **Sequencing against sugar and potash (both in flight, both touching moulds,
  materials and firing) is decided after the plan.**

---

## What already exists

**Clay, and one fired product.**

- Rejection's quarry hill has a winnable clay band. `dig` works it with a
  spade (`trade-quarrying`; *the ground answers*).
- The sand pit wins glass sand.
- Quicklime is burnt in the limekiln.
- Quarrying ships a `fire-pot` recipe: one lump of clay fired at 1100 K
  makes an unglazed plant pot, credited to quarrying. The quarrying
  discipline's own text says *"the masons, potters and lime burners who
  arrive later"* will read it.
- **The Delight valley has no clay deposit.**

**The verbs this build's acts land on, all shipped:**

- **`shape`** — glass's durative forming step. Its forms (bottle, cylinder)
  are fixed in code.
- **`carve`** — carpentry, cutting a part out of a stock.
- **`fit`** — assembly's one verb, which replaces a part or raises a whole.
- **`dip`** — chandlery, a solid dipped in a pot.
- **`knead`** — baking, working a plastic mass by hand in a trough.
- **`dry`** — puts a thing where the air reaches it. The drying itself is
  the thing's own moisture clock against the place's air.
- **`fire`** — a lit chamber matched against recipe rows. `for <hold>` sets
  the time at heat, and a charge in a mould comes out in the mould's shape.
  Its header names *"a brick clamp ships a recipe row"* as the intended
  extension.
- **`pour`, `put`, `get`, `salvage`, `repair`, `hammer`, `stir`, `measure`,
  `analyze`, `look`.**

**The clamp.** The charcoal clamp's `char <draught>` is a three-day sealed
burn whose outcome is read from the draught when it ends. Every unit comes
out alike: there is no grading by position and no atmosphere.

**The mould** (mould.md). The container decides the shape.

- Two set processes ship, **freezing** and **draining**, and a weight `put`
  on a mould presses it.
- A mould is reusable (it wears per cast) or consumed (supported, but no row
  uses it).
- Four consumers: the cheese hoop, the ingot mould, the ice pan and rubber's
  oven moulds.
- ⚠ Its own recorded gap: *nothing refuses molten metal into a vessel that
  cannot take it.*

**Weather.** The day's low and high can be read for any place, and its only
reader asks whether yesterday crossed freezing (the maple tap). **Nothing
counts freeze-thaw cycles.** Rain wets things outdoors, and sky exposure
decides it.

**The 22 ceramic goods.** Each comes from a `props:` list, a stock line or
a cooking recipe's output, and none has a grade:

- **dairy:** setting pan, starter crock, rennet jar, butter crock, jug;
- **smelting:** crucible, ingot mould;
- **fuel:** the retort (a 2200 kg brick firebox);
- **mining:** a porcelain streak plate;
- **farming:** three plant pots;
- **apiculture:** the honey jar;
- **chandlery:** the soft-soap jar and lye flask;
- **cooking:** the tallow crock and smoke chimney;
- **generic:** bowl, dish and platter;
- two described only as stoneware and earthenware (the bakery's starter
  crock, the infirmary's steeping pot).

**The building materials.** A `brick` material exists, and 16 rooms already
author brick walls. There are **no** fireclay, terracotta, earthenware,
stoneware, kaolin, gypsum, plaster or mortar rows, and no portable brick or
tile.

**Breakage.** Ceramic carries a `brittle` tag that nothing reads. The only
breakage in the game is a thrown thing shattering on its toughness.

**Disciplines.** None for pottery, brickmaking, masonry or founding. The
neighbors are quarrying, smelting, smithing, glasswork, carpentry and
chandlery.

**Supply gaps.** Lead and tin exist as materials, but no ore wins them. Salt
is made at the salt pan. Vinegar and wine are the shipped acids.

**Rivers.** The Delight reaches Terminus by road only. The gorge is authored
*"steep enough that no boat has ever been up it"*, and the barge runs below
Terminus only.

**In flight (sequencing to be decided after the plan):**

- **Sugar** stages the boil by concentration rather than solubility. It
  teaches the drain set to keep its run-off (the cone's molasses), and its
  sugar cone is a stocked earthenware mould. *"Sugar is pottery's first
  customer when it ships."*
- **Potash** makes ash a good and adds an ashery kiln. It changes how a
  firing carries fractions and grade, takes the `flux` role, and slakes lime
  in the soap kettle. It names *"ash glazes → the pottery build."*

⭐ **Therefore what is genuinely new here is:**

- **fired clay as a derivation** (clay × the heat it reached → body,
  porosity, strength, color), and the 22 rows re-pointed to what they really
  are;
- **the freeze-thaw count**;
- **the clamp's grading by position and the kiln's atmosphere**;
- **`shape` generalized**: forms as rows, clay at the brick table and the
  wheel;
- **green ware's three ruins** (rain, frost, too-fast drying);
- **furnace linings that wear**, and the firebrick that relines them;
- **glazes** (a glaze is a glass), **lead leaching**, crazing, thermal shock;
- **breakage** on a brittle body, and pottery's uses (flame, porosity, the
  cooling jar);
- **the mould as an envelope**, with:
  - impressions;
  - pours that fail by physics;
  - survival during the pour;
  - consumed sand moulds;
  - pressing from three sources;
  - shape-and-release;
  - crystallizing;
  - dies that record provenance;
- **three new trades** (brickmaking, pottery, founding) **and masonry**;
- **two new venues** (the Delight brickfield-and-pottery, the Rejection
  foundry) **and a Terminus potter's stall**.

---

## Goals

- **Clay has a year.** It is won in autumn and weathered by the winter's
  frost (more freeze-thaw days give a better clay, up to a ceiling). It is
  kneaded with sand, and with town ash as breeze, in spring. It is shaped and
  dried in summer and burnt in autumn. ⭐ Physics enforces the year: green
  brick that freezes wet shatters, so moulding stops before the first frost.
  No calendar rule does it.
- **What a fired thing IS derives from its clay and the heat it reached.**
  That one derivation gives:
  - terracotta, earthenware, stoneware and refractory body;
  - porosity (water absorption), strength and color (iron, and the
    draught's atmosphere).
  The 22 shipped rows are re-pointed to the body each really is, and none of
  the five bodies is a hand-authored material.
- **A brick clamp burns like a charcoal clamp and is read at the end.** Its
  bricks come out graded by where they sat: over-burnt clinker by the fire
  channels, hard well-burnt in the middle, soft place bricks at the skin.
  Each carries the water absorption its firing gave it. W7 reads that
  absorption next.
- **Every hot furnace has a lining that wears per firing** and is relined
  with firebrick won from Rejection's fireclay. ⚠ A lining wears only where
  firebrick can be bought, and every furnace an NPC runs is relined by its
  keeper.
- **A potter's hand shows in the pot.** Competence decides wall thickness,
  the largest form you can raise and the grade, deterministically and never
  by a roll. A form beyond you is refused, and the refusal says what lifts
  it.
- **Pottery is used, breaks and is mended.**
  - Bodies decide uses: earthenware with grog survives the cooking fire,
    stoneware cracks on it; porous ware sweats and cools its water; glazed
    ware is hygienic.
  - A dropped or thrown pot breaks by its body's strength against the
    impact, so a thick beginner's mug survives what a master's thin bowl
    does not.
  - Sherds grind back to grog, and the tinker rivets a break.
- **A glaze is a glass on a pot**, applied by `dip` and matured in a second
  firing.
  - Kinds: ash, lead, salt and tin.
  - Faults: crazing (expansion mismatch), running (over-fired), thermal
    shock (opening the kiln early).
  - ⚠ **Lead leaches into acidic contents silently.** Vinegar, wine or
    fruit kept in a lead-glazed crock become a toxin dose, and no sense
    reports it.
- **The mould is an envelope.** The matter decides what setting is, and the
  mould decides the shape and the conditions:
  - its conductivity (chill casting);
  - its permeability or openings (draining);
  - its absorbency (slip casting in plaster);
  - its wetness (a damp mould blows);
  - its melting or ignition point (survival).
- **Anyone can take an impression of any object** and cast it in anything
  that will take it. The shape copies and the identity never does: mass from
  the poured material, function from its response, one piece, seams visible,
  provenance recorded.
- **Pours fail by physics.**
  - A misrun if poured too cool for a thin shape.
  - Shrinkage porosity without a riser.
  - A blown cast from a damp mould, which also burns the pourer.
  - A burnt or melted receiver for **any** vessel whose melting or ignition
    point is below the pour.
- **Pressing is one load from three sources:** a weight (shipped), a screw
  press turned by hand, and a hammer blow on a die. A self-supporting charge
  leaves the mould at once (shape-and-release).
- **Crystallizing is a set process.** A solution sets crystals when it holds
  more than its material dissolves at that temperature, and the run-off
  (bittern) drains into the vessel beneath as a product.
- **Three trades and a fourth discipline exist and are learnable:**
  brickmaking and pottery at the Delight, founding at Rejection, and
  masonry, which relines furnaces here and is W7's next.

## Non-goals

Every non-goal below names where it goes.

- **Building upkeep.** That covers walls weathering, `maintain`, lime mortar
  for repointing, the hard-mortar spall, and the bricklayer laying walls. It
  all goes to **repair W7** (`repair-plan.md` § W7), which opts brick in
  once this ships. Lime mortar's only buyer is W7, so it ships there
  (lens 6: *was the demand there first*).
- **Bricks by barge.** The gorge has no navigable water, so barge freight
  goes to **[river-slate](../slates/builds/river-slate.md)** and
  [freight-slate](../slates/builds/freight-slate.md). Bricks and wares go
  to Terminus by road in this build.
- **Breakage in transit, and packing in straw.** These go to
  **freight-slate**, which owns cargo handling.
- **The per-brick tax and its size effect.** These stay in
  **brickmaking-slate § 3**, kept, as the lever for when the polity gets a
  levy design. The statute brick ships here, because the standard needs no
  tax.
- **Kintsugi.** It needs a lacquer from a tapped tree, and none exists. It
  goes to **[taps.md](../subsystems/taps.md)'s deferred list**, as a tap row
  plus a repair-method row. The tinker's rivets ship here.
- **Porcelain and kaolin.** These belong to another realm's geography. The
  streak plate stays a bought import, recorded in **pottery-slate § 9**.
- **Salt-glaze fumes as harm or nuisance.** These go to **the potash slate's
  smoke ordinance**. In this build the fumes are smelled, not dosed.
- **The Scotch kiln and the Hoffmann kiln, the pugmill, the jigger and
  extrusion.** These are later rungs of the same acts, recorded on
  **brickmaking-slate § 5** and **pottery-slate § 4**. This build ships the
  clamp, the pit firing and the updraft kiln.
- **Coin striking and minting authority.** These go to **banking.md's
  coinage** and the **[attestation-slate](../slates/builds/attestation-slate.md)**.
  This build ships the die and the struck blank, with provenance recorded
  and judged by nobody.
- **Printing type.** It goes **nowhere, deliberately.** Printing is not
  modelled.
- **Forming over a form** (lasts, hat blocks, boiled leather, steam-bent
  wood). This stays out of the mould system, per **moulding-slate § 2**,
  and each is its trade's own act.

---

## Placement

- **`/trade/ceramics`**, a new capability pack covering brick, tile,
  firebrick and pottery. They share their whole physics (clay, kneading,
  drying, firing, kilns), so they are one trade (*trade is mechanism,
  locality is expression*). It ships the brickmaking and pottery
  disciplines, the forms, the bodies, the glaze rows, and the clamp and kiln
  rows.
- **Founding is `trade-smelting`'s.** The founder pours the smelter's melt,
  and the furnace, crucible and ingot mould already live there. The
  discipline, the flasks, moulding sand, the patterns' cast rows and the
  foundry rows ship in that pack. ⭐ Founding is smelting's second act, not a
  third metal trade (closes moulding-slate open question 4).
- **Masonry ships in `/trade/ceramics`** until W7 gathers the building
  trades into their own pack, as brickmaking-slate § 8 says. In this build
  it is the discipline for relining a furnace.
- **The kernel** carries the engine facts every trade reads:
  - the mould envelope;
  - impressions, pour failure and survival in transfer;
  - pressing and shape-and-release;
  - crystallizing;
  - the fired-clay derivation;
  - the freeze-thaw count;
  - breakage on a brittle body;
  - lining wear on a furnace;
  - lead leaching into acidic contents.
- **Venues are locality rows.**
  - The Delight brickfield and pottery are in `hearts-delight`.
  - The foundry and the fireclay and gypsum bands are in `rejection`.
  - The potter's stall is in `terminus`.
  ⭐ The test: **a second brickfield, pottery or foundry is rows only, with
  zero pack code.**
- **The clay pit is a quarrying working.** The clay *deposit* is the
  locality's row, and the pit is quarrying's open working. The brickfield
  owns no ground mechanism (closes moulding-slate open question 9).
  Quarrying's `fire-pot` recipe moves to pottery and credits pottery.

## Collisions

Each item says which existing places and objects this touches, and who
already lives there.

- **Heart's Delight** — the farming valley.
  - It already holds the gate, the bench lane, the barn, the farmstead, the
    mill and millsite, the sawmill, the dairy, the creamery, the silk house
    and the public-works yard.
  - The brickfield is new ground beside them on the valley's alluvial clay.
    It must not take a field already ploughed, and the clay deposit is
    authored under new places, never under an existing field.
  - The creamery's hearth and the silk house's oven are untouched.
- **Rejection.**
  - The fireclay band goes **under the coal seam** at the quarry hill, which
    is where fireclay occurs. A gypsum band is added there too.
  - The foundry sits **beside the smelter**, sharing its furnace and
    crucible. ⚠ The smelter's ingot mould and crucible are fixtures
    (props), and they gain a lining and a body without being moved.
  - The glasshouse's kiln, the limekiln, the fuel yard's retort and the
    smelting furnace all gain a lining that wears. ⚠ The NPCs who run them
    must reline them, or they decay with no remedy (a time bomb).
- **Terminus market.**
  - It holds the square, the stalls, the bathhouse and the bakery.
  - The potter's stall is a new stall there.
  - ⚠ The general store's plant pots, the honey jars and the chandlery's
    soft-soap jars and lye flasks are re-pointed to **the pottery's
    production**, and stop conjuring stock.
- **The 22 ceramic rows.**
  - Each is re-pointed to its true body. Every place that props one keeps
    its fixture.
  - What changes is what the thing is made of: its porosity, its fitness for
    flame and food, and whether it can break.
  - ⚠ A creamery setting pan that now *breaks* needs a replacement path,
    which is buying one from the potter.
- **The dorm's starter pot** (Duncan Hall). It stays a prop and becomes
  terracotta. ⚠ A new player's first pot must not be fragile enough to break
  from being set down.
- **The shipped verbs:**
  - **`shape`** generalizes. ⚠ Glass's `shape bottle` must keep working
    word for word.
  - **`knead`** gains clay. It is baking's verb today and becomes shared,
    because potters knead clay: one act, working a plastic mass with water
    by hand.
  - **`dip`** gains glaze.
  - **`carve`** gains leather-hard trimming and the pattern.
  - **`fit`** gains a slip-joined handle and a furnace's lining.
  - **`fire`** gains the clamp, the pit firing and the updraft kiln, and the
    draught becomes a setting of `fire`.
  - **`hammer`** gains a blank on a die.
- **`char` stays charcoal's.** Charring wood is a different act from firing
  a charge.
- **`press` is the news ticker's.** The screw press is worked with
  **`turn`**, a new verb in the device category with no collision.
- **The impression is `mold`.** `mold <pattern> in <flask>` takes a
  pattern's shape in sand or plaster; American spelling, alias `impress`.
- **The repair tinker** gains riveting a broken pot. His rounds are
  unchanged.

---

## Surface decisions

### S1. The body is derived, not authored

The five ceramic bodies are not five materials. A fired thing's body is
computed from **its clay** (ordinary, iron-rich, lime-rich or fireclay)
**and the peak heat it reached**:

- **Porosity** falls as the body vitrifies.
- **Strength** rises.
- **Color** comes from the clay's iron and the draught's atmosphere: red
  when oxidizing, blue-black when reducing, yellow when the clay is lime-rich.
- **Refractoriness** comes only from fireclay.

The 22 rows are re-pointed by **which clay and which firing they were
made of**. The default bodies are:

| body | rows |
|---|---|
| terracotta (unglazed, low) | the three plant pots, the dorm starter pot, the setting pan, the clay pot |
| glazed earthenware | crocks (butter, tallow), jars (honey, rennet, soft-soap), the jug, the lye flask, the bowl, the dish, the platter, the steeping pot |
| stoneware | the two starter crocks (dairy, bakery) |
| refractory (fireclay) | the crucible, the ingot mould, the retort, the smoke chimney |
| porcelain (import) | the streak plate |

Lens 1 chose this: one rule taught everywhere (*the heat decides the
vitrification decides the water*), and the brick obeys the same rule.

### S2. The freeze-thaw count is a weather fact

A place can be asked how many days since a given moment crossed freezing
both ways. The clay heap reads it, and so will:

- frost tilth on ploughed soil;
- frost damage to brick and stone (W7, decomposition).

A mild winter weathers clay worse. A heap brought indoors stops counting.

### S3. Kneading clay is `knead`

Tempering is soaking clay in the temper pit, picking out stones, and working
in sand (for fat clay) and breeze (town ash) to the moisture window. The act
is kneading, and potters call it that. Brickmakers tread, which is kneading
with the feet. One verb serves one act, so baking's `knead` becomes shared.

The moisture window is the product rule:

- too wet slumps;
- too dry cracks;
- fat clay without sand cracks drying.

### S4. Forming is `shape <material> into <form>`, and forms are rows

The instrument and the material decide which forms are possible:

- the brick mould makes its brick (and the tile mould its tile);
- the wheel throws round forms;
- hands coil anything;
- the blowpipe gathers bottles and cylinders, as shipped.

At the brick table, `shape` is a **game-day's durative work** at a rate
competence sets. A master's gang turns out thousands. The output is green
bricks on a pallet. On the wheel, one `shape` is one pot. Glass's
`shape bottle` is unchanged.

**Competence decides the pot.** Wall thickness (and so weight), the largest
form you can raise and the grade all follow from it. A form below your band
comes out heavier, never failed; a form above it is refused, and the refusal
names the band.

### S5. Green ware dries on its own clock, and three things ruin it

`dry` exists, and green ware dries in the air like anything wet. Drying
passes through **leather-hard** (the window to trim and join) to
**bone-dry** (the only state that fires).

- **Rain** on uncovered green ware slumps it.
- **Frost** on wet green ware shatters it.
- **Drying too fast** (sun and wind, fat clay) cracks it.

The hacks are a **roofed open place**, so shelter is where you put the
bricks, not a verb. Green ware shrinks a few percent drying, so the brick
mould is authored oversize.

### S6. Firing is `fire`, and the draught is a setting of every firing

`fire <kiln|clamp> [draught]`. The draught can be reset while the burn
runs, exactly as `char` re-sets the charcoal clamp. It decides the
atmosphere:

- **oxidizing** for red and warm colors;
- **reducing** for blue brick and celadon.

It also shifts the heat the charge reaches.

| furnace | what it does | the rung |
|---|---|---|
| **The clamp** | A sealed burn of days. It is read at the end, so an unwatched clamp does not stall, and its rain and wind matter outdoors. Each brick's grade comes from **its position**. | brickmaking's first rung |
| **The pit firing** | The clamp's open cousin. | hand-building's rung |
| **The updraft kiln** | Fires bisque and glost. | the potter's |

**Opening any kiln before it has cooled** cracks (dunts) ware by the thermal
gradient against the body. Uneven walls suffer most.

### S7. Wasters and sherds become grog

A cracked, slumped or broken piece is a waster or sherds. Ground back
(`grind`, shipped), it becomes **grog**, which kneaded into new clay
strengthens it and makes a flameproof cooking body.

### S8. Glazes

**A glaze is a slip of its batch** (silica sand, a flux, clay) stirred into
a bucket of water with `stir`. It goes on a bisque pot by `dip`, and a glost
firing at the glaze's maturing heat sets it and the body.

| glaze | flux | source in this build |
|---|---|---|
| **ash** | wood ash | the hearth ash that exists (potash makes it a good when it lands) |
| **lead** | lead | an **import line** at Rejection's store (no ore wins lead) |
| **salt** | salt thrown into the kiln at peak heat | the salt pan |
| **tin** (opaque white) | tin | an **import line** |

⭐ Lead leaches. An acidic content (vinegar, wine, fruit, pickles) held in a
lead-glazed vessel takes up lead with time. Drinking or eating it doses the
eater through the shipped toxin route. **No look, smell or taste reveals it**,
and that is deliberate (*silent like contamination*). Knowledge, an
assay, or the sickness are how you learn.

Crazing comes from a glaze shrinking more than its body. Crazed ware holds
dirt, which cleanliness reads.

### S9. Breakage

A brittle body breaks when **the impact's energy beats its strength**. The
strength comes from the body, the wall thickness and grog.

- **Dropped onto a hard floor:** yes, by height and mass against strength.
- **Thrown:** as shipped.
- **Cracked by flame:** a dense body on a direct fire.
- **Dunted:** from the kiln.

A broken thing becomes sherds. **Set down or put in a bag: never.** A thing
breaks only through one of those causes.

The tinker rivets a broken pot whole again (repair's localized damage). The
mend shows.

### S10. Linings wear, and firebrick relines them

Every furnace that runs above a ceramic threshold has a **lining** that
wears per firing:

- the smelting furnace;
- the glasshouse kiln;
- the limekiln;
- the retort;
- the brickfield's and the potter's kilns.

A thin lining reads in `look` and drops the furnace's reachable heat. A
burnt-through lining refuses to light until relined. Relining is
**`fit lining to <furnace>`**: the lining is made of firebricks, and the work
credits masonry.

⚠ **Two supply rules.**

- A furnace's lining wears only where firebrick is sold in its realm.
- Every NPC-run furnace's keeper buys firebrick and relines.

*Never demand an input nobody can deliver.*

### S11. The statute brick is a standard

The polity declares a statute brick in its standards: Terminus declares
9 × 4½ × 2¼ in, as England did in 1571.

- **Anyone** can `measure size` a brick against it. Off-standard reads
  *off standard*.
- A gauger's word is of record.
- The engine records the size and never forbids.

The cask gauger is the precedent.

### S12. The mould is an envelope

What the mould's own material does:

| property | effect | example |
|---|---|---|
| **Conductivity and mass** | decide how fast a melt freezes in it | cast iron chills white and hard in an iron mould, grey and soft in sand |
| **Absorbency** | drinks a slip's water | a plaster mould casts a cup from slip |
| **Permeability or openings** | drain it | the hoop, the cone (shipped) |
| **Wetness** | flashes to steam under a melt | a damp sand mould **blows**: the cast is ruined and the pourer burned |
| **Melting or ignition point** | decide survival | see S13 |

### S13. Survival belongs to every pour

A receiver whose melting point (or ignition point) is below the pour's
temperature melts or burns. This applies to every vessel, not only moulds:

- a wooden mould under bronze;
- a tin cup under molten lead;
- a basket under anything hot.

This closes mould.md's recorded gap.

### S14. Pours fail by Chvorinov's rule, and competence reads, never rolls

How long a cast takes to freeze grows with its **volume over surface,
squared**, scaled by the mould's pull.

- **Misrun.** A thin shape poured too near its melting point freezes before
  it fills, leaving a short, flawed cast. Superheat buys time.
- **Shrinkage.** The last part to freeze goes porous. A **riser**, a mould
  feature with more volume per surface, feeds it.

Competence reads the signs: the melt's color is its heat, and the sand's
dryness and the riser's size can be judged. Competence never decides the
outcome (*detail, never access*).

### S15. Impressions: `mold <pattern> in <flask>`

Ramming moulding sand (quarry sand with a little clay, a green sand) round
a pattern in a flask, or laying plaster over it, takes **an impression**.
The impression holds three things and nothing more:

- **the pattern's kind**: a named sword's kind is *a sword*, and seats and
  minted singletons step up to what they extend;
- **its volume**;
- **its form and parts, as description**.

It also records **whose object it was taken from**. What follows from that:

- **A cast from it** is that kind in the poured material.
  - Mass is volume × the poured density.
  - Function comes from materials-response, so a pewter sword bends at the
    first blow.
  - An assembly casts as **one piece**.
  - The look says *"a pewter cast of a sword"* and shows the seams.
  - Name, maker's mark, grade, seat and history never copy.
- **A sand mould is consumed**: broken to release the cast, its sand
  re-tempered and reused.
- **Lost wax** consumes the wax pattern too, and the wax goes back to the
  chandler as tallow or wax.
- **A pattern made oversize** by the metal's shrinkage casts true. The
  pattern-maker is a carpenter (`carve`).

### S16. Draft and the two-piece mould

A shape that cannot slide out of a one-piece permanent mould needs a
**two-piece** mould (cope and drag). The two-piece mould is an assembly: two
halves under a joint that opens freely. It wears at the joint and is repaired
like any assembly. A sand mould is broken anyway, which is why sand casts
complex shapes.

### S17. Pressing has three sources, and a self-supporting charge releases at once

The load on a mould comes from one of three sources:

| source | how | used here for |
|---|---|---|
| a weight | `put` (shipped) | the cheese press |
| a **screw press** | `turn press`, worked by hand, with more pressure per turn | a heavier cheese press at the creamery, and pressed roof tiles at the brickfield |
| a **blow** | `hammer <blank> on <die>` | struck tokens and medals at the foundry |

A press works when its pressure beats the charge's resistance, and for clay
that resistance is set by moisture.

**Shape-and-release.** A charge with green strength (clay in the temper
window, butter, pressed tile) leaves the mould at once and sets outside it.
One brick mould makes thousands. A melt stays in until it sets, as shipped.

### S18. Crystallizing is a set process

A solution in a mould or pan sets crystals when it holds **more than its
material dissolves at its temperature**. That happens by cooling, or by
concentrating as water leaves. The run-off goes as bulk into the vessel the
mould stands over, or onto the floor.

- **This build's consumer** is the salt pan: salt crystals, with bittern
  drained beneath.
- **Alum and saltpetre** follow as rows.
- ⚠ **Convergence with sugar's staged boil and potash's pot cake is a
  sequencing item for after the plan.** Each of them sets by concentration
  today.

### S19. Recast, interchangeable, dies

- **Recast.** A cast in a material with a melting point (wax, metal) salvages
  back to a pool, and fired clay salvages to sherds. Lens 1: the
  thermoplastic and thermoset distinction falls out of a field the material
  already carries.
- **Interchangeable.** Two casts from one impression share a kind and form,
  so a cast part fits any whole built to it **without re-making the joint**.
  This is assembly's `interchangeable` joint field, the tinker's drawer of
  parts, and the historical origin of interchangeable parts.
- **Dies.** A die is a mould cut in steel that records whose die it is. A
  blank struck on it carries that provenance. Who may hold a die is the
  polity's question (tier C), and the engine records it and judges nothing.

### S20. Cure is a set process

Plaster (from gypsum burnt in the limekiln, then mixed with water) sets by
**cure**, a chemical set with no act. In this build it gives the slip-casting
mould and the plaster impression. Lime mortar's carbonation is the same set,
and it ships with W7.

### S21. The works and their people

**The Delight brickfield-and-pottery** is one works with two trades:

| place | what happens there |
|---|---|
| the clay pit | winning |
| the weathering ground | winter heaps |
| the temper pit | kneading |
| the moulding shed | the brick table, the brick and tile moulds, the screw press |
| the hacks | drying under a light roof |
| the clamp ground | the clamp |
| the potter's shop | the wheel, and the updraft kiln with its ware shelves |

- **The brickmaster** is a business. It employs a moulder's gang (rostered
  seats) and buys breeze (town ash) and sand.
- **The potter** throws the re-pointed stock and keeps the **Terminus
  market stall** supplied.
- Both businesses' NPCs produce through the same chain (shifts that
  consume clay and fuel). A player who makes ware sells into the same lines
  by consignment.

**The Rejection foundry** sits beside the smelter:

- a founder's floor, with flasks, moulding sand and a pattern rack;
- the smelter's furnace and crucible;
- **the founder** as a seat.

**Haulage** of bricks and wares to Terminus is by road.

---

## Lens pass

1. **Pedagogy.**
   - Frost weathering is a count.
   - The temper window, and drying shrinkage with the oversize mould.
   - Why moulding stops before frost.
   - Heat → vitrification → absorption → the next build's upkeep bill.
   - Oxidizing against reducing.
   - Leather-hard as a window; moisture mismatch cracking a joint.
   - A glaze is a glass; expansion mismatch causes crazing.
   - Acidity × lead × time.
   - Evaporative cooling.
   - Chvorinov; chill against sand; the damp mould; survival by melting
     point.
   - Solubility against temperature; the pattern-maker's shrinkage rule.
   - Recastability is a melting point.

   New Disciplines: **brickmaking, pottery, founding, masonry.** Their
   neighbors are quarrying, glasswork, smelting, carpentry and chandlery.
2. **Creative expression.**
   - The ordinary case is rows: a clay deposit, a form, a glaze, a second
     works, a second foundry.
   - ⭐ The bespoke case is the **impression**: any shape a player can make
     once, castable in anything that takes it, with no code and no row.
   - A potter's hand shows in the pot.
   - A realm's bricks have its own clay's color.
3. **Immersion and participation.**
   - **3a (immersion).** The smoking clamp, the capped hacks, a red town or
     a yellow one, a beginner's heavy mug, a sweating water jar, mould seams
     on a cast copy, a wooden mould that burns.
   - **3b (participation).** The economy gains holes shaped like people:
     - the brickmaster, moulder and gang;
     - the clamp burner;
     - the potter;
     - the founder and the pattern-maker;
     - the furnace keeper who relines;
     - the tinker who rivets;
     - the stallholder;
     - the ash-man selling breeze.
   - ⭐ *Can the polity do something we did not want?* It can ban lead glaze
     (or fail to) with a measurable public-health effect, declare a statute
     brick, and license or police dies.
4. **Values.**
   - Lead glaze is cheap now and poison later, silently.
   - Soft brick is cheap now and costs the wall's next owner (W7).
   - The cast copy deskills: a cast is as good as its mould, and the look
     says *cast*.
   - Copying is allowed and identity never copies.
   - None of these has an answer the engine supplies.
5. **Continuity.** The same commands carry each line across epochs:
   - clamp → kiln;
   - coil → wheel → slip cast;
   - sand → die casting;
   - weight → screw press → power press.

   `shape`, `fire`, `pour`, `mold`, `fit`, `repair` and `turn` all answer
   unchanged. A machine supplies the load or the pour.
6. **Economy.**
   - **Produces:** brick by grade, tile, firebrick, ware by body and grade,
     casts, sherds and grog.
   - **Consumes:** clay, fireclay, sand, gypsum, breeze, ash, salt, fuel,
     and imported lead and tin.
   - **Demand was there first:**
     - the 22 shipped goods, re-pointed, with breakage making it recur;
     - every hot furnace's lining, which recurs per firing;
     - W7's brick, next.
   - ⚠ **Gap recorded:** building brick sells mostly on W7, so until W7 the
     brickfield's main buyer is the firebrick line.
7. **Governance.**
   - **The statute brick.** The criterion is the standard, the appeal is
     the gauger's measure, the tier is C.
   - **A lead-glaze ban.** Tier C, and the polity's to pass.
   - **Dies.** The criterion is who holds the die, and the remedy is the
     polity's (tier C).
   - The engine records and judges nothing.

**Altitude.**

- **Invariant:** a fired thing's properties derive from its clay and the
  heat it reached; shape copies and identity never does; every pour obeys
  its receiver's melting point.
- **Grain:** moulding rates, the weathering ceiling, the clamp's gradient,
  wall-thickness bands, the lead leach rate, the lining's wear per firing.
- **Title:** the Delight works, the Rejection foundry, the Terminus stall,
  Terminus's statute brick.

---

## The drive

Run on a test world with founder clock jumps. Each numbered step is a
checkpoint that can fail.

### A. The brickmaker's year

1. **Win the clay.** At the Delight clay pit, in autumn, run
   `dig clay with spade` → you win lumps of clay. Then `look clay` →
   *fresh, unweathered*.
2. **Weather it.** Leave the lumps on the weathering ground and jump the
   clock through winter. `look clay` now says *frost-broken*, its quality
   in words. A second heap kept indoors reads *unweathered*.
3. **Knead it.** In spring, at the temper pit, run `knead clay` with sand
   and breeze → tempered clay at the window. Kneading fat clay with no sand
   is allowed, and its bricks crack drying in step 6.
4. **Shape it.** In the moulding shed, run `shape clay into brick` → a
   durative day's work and a pallet of green bricks. A low-band moulder
   makes fewer.
5. **Rain and frost.**
   - Leave one green brick in the open yard through a rainy day → it has
     slumped.
   - Leave one out wet across a frost → it has shattered.
6. **Dry them.** Put the rest in the hacks and jump a few weeks →
   leather-hard, then bone-dry. The fat-clay bricks have cracked.
7. **Fire the clamp.** At the clamp ground, set the bricks and fuel in the
   clamp, run `fire clamp`, jump the burn, and get the bricks → three grades
   by position (over-burnt clinker, hard well-burnt, soft place).
   `analyze` or `look`:
   - a well-burnt brick *rings* and absorbs little;
   - a place brick is soft and absorbs much.
8. **Reduce the draught.** Fire a second clamp at a reducing draught → blue
   bricks.
9. **Measure.** Run `measure size brick` → its size against Terminus's
   statute brick. An oversize mould's brick reads *off standard*.

### B. Firebrick and the furnace

10. **Make firebrick.** Win fireclay at Rejection's quarry hill (under the
    coal) and make firebricks: knead, shape, dry, fire.
11. **Watch the lining wear.** Fire the smelting furnace repeatedly →
    `look furnace` reads the lining thinning, and the reachable heat drops.
    Burnt through, it refuses to light.
12. **Reline it.** Run `fit lining to furnace` with firebricks → it is
    relined, masonry is credited, and the smelt runs.
13. **Check the keeper.** Jump time with no player → the NPC keeper of the
    glasshouse kiln has bought firebrick and relined it.

### C. The potter

14. **Throw at your band.** At the wheel, with a novice character, run
    `shape clay into mug` → a heavy, thick-walled mug. Then
    `shape clay into large crock` → refused, the refusal naming the band.
    A practised character's mug is light.
15. **Trim and join.** At leather-hard, run `carve foot on mug` → trimmed,
    then `fit handle to jug` → joined.
    - A handle fitted while much wetter than the body cracks at the joint
      on drying.
    - A bone-dry pot will not trim.
16. **Bisque fire.** In the kiln → a porous bisque mug.
17. **Glaze.** Run `stir` an ash glaze and a lead glaze in buckets, `dip`
    two bisque crocks, and fire the glost → glazed earthenware crocks.
    Open the kiln hot on a third firing → dunted (cracked) pots.
18. **Lead leaches.** Fill the lead-glazed crock with vinegar and jump a
    week.
    - `look`, `smell` and `taste` say nothing.
    - Drinking it doses lead (the toxin route reads it).
    - The ash-glazed crock's vinegar is clean.
19. **Stoneware and the flame.** Fire a stoneware crock high → watertight
    unglazed.
    - Set it on a cook fire → it cracks.
    - An earthenware pot with grog on the same fire survives.
20. **The cooling jar.** Fill an unglazed jar with water in a warm room →
    it sweats, and its water reads cooler than the air.
21. **Breakage and mending.**
    - Drop the practised character's thin bowl on the stone floor → sherds.
    - Drop the novice's thick mug → it survives.
    - `grind` the sherds → grog.
    - The tinker rivets a broken bowl → mended, and the mend shows.
22. **The stall.** At the Terminus potter's stall, `buy` a plant pot → it
    is the pottery's (its maker, its body), and the general store's
    plant-pot line is supplied from the pottery.

### D. Moulding and founding

23. **Slip cast.** `stir` clay into water to make slip, burn gypsum to
    plaster, and cure a plaster mould. `pour` slip into the mould → it
    drinks the water and a cast cup releases.
24. **Take an impression.** At the foundry, run `mold sword in flask` →
    a sand mould. Pour the smelter's molten pewter → *"a pewter cast of a
    sword"*:
    - it shows seams;
    - its mass is derived;
    - it carries no name.
    `look` shows whose sword the impression was taken from.
25. **Make it fail.**
    - Pour too cool into a thin pattern → a misrun.
    - Pour into a damp flask → it blows, and the pourer is burned.
    - Pour without a riser → a porous cast; with a riser → a sound one.
26. **Survival.** Pour bronze into a wooden mould → the mould burns.
    `pour` molten lead into a tin cup → the cup melts.
27. **Chill casting.** Cast iron poured into an iron mould → white and hard.
    The same pour into sand → grey and soft.
28. **Pressing.**
    - `turn press` on a cheese → it presses harder than the stone.
    - `turn press` on a tile charge → a pressed tile releases.
    - `hammer blank on die` → a struck token, carrying the die's
      provenance.
29. **Crystallize.** Brine left to concentrate in the salt pan → salt
    crystals, with bittern in the vessel beneath.
30. **Recast and fit.**
    - `salvage` the pewter cast → a pool, recast.
    - Salvage a fired pot → sherds.
    - A cast part from one impression `fit`s a whole built to it without a
      new joint.
31. **The pattern-maker.** `carve pattern` from wood (carpentry) → an
    oversize pattern. Its cast in iron comes out true to size.
32. **The restart.** Restart the server → green bricks, a curing plaster
    mould, a lining's wear, a lead dose in progress and an impression all
    survive.

## Acceptance criteria

Each is observable from outside the code.

1. A player can win clay at the Delight. Its weathering reads in words from
   the winter it spent outdoors, and a mild winter gives worse clay.
2. Green ware is ruined by rain, by frost when wet, and by drying fat clay
   too fast, each observed on a real piece. Bone-dry ware is the only ware
   that fires.
3. A brick clamp yields three grades by position. Each grade's water
   absorption differs and is readable, and a reducing draught yields blue
   brick.
4. A fired thing's body (porosity, strength, color, refractoriness) follows
   from its clay and its firing. All 22 shipped ceramic goods read as the
   body the table in S1 gives them.
5. Furnaces' linings wear per firing, reduce heat, refuse when burnt
   through, and are relined with firebrick by `fit`. An NPC-run furnace is
   relined by its keeper without a player.
6. A potter's wall thickness, largest form and grade follow from
   competence. An over-band form is refused with the band named, and
   nothing is rolled.
7. Leather-hard trimming and slip-joined handles work only in their window.
   A moisture mismatch cracks the joint.
8. Glazes go on by `dip` and mature in a glost firing. Crazing, running and
   dunting can each be produced and seen.
9. Acidic contents in a lead-glazed vessel dose lead with time, with no
   sensory tell. The same contents in an ash-glazed vessel do not.
10. Pottery breaks by impact against strength: dropping on stone, throwing,
    a dense body on a flame. It never breaks from ordinary handling. Sherds
    grind to grog, and the tinker mends a break visibly.
11. An unglazed porous jar of water reads cooler than the room.
12. The Terminus stall sells the pottery's wares, and the re-pointed stock
    lines are supplied from the pottery, not conjured.
13. Anyone can take an impression of any object and cast it. The cast
    carries the kind, the derived mass, the material's behavior, the seams
    and the provenance, and never the identity.
14. Every pour into any vessel obeys the receiver's melting or ignition
    point.
15. Misrun, shrinkage, a blown damp mould, and chill against sand each
    occur from the physics of the pour and can be read in advance by a
    competent founder.
16. A screw press and a die each load a mould. A self-supporting charge
    releases at once.
17. Brine crystallizes salt in the salt pan, with bittern drained to the
    vessel below.
18. A plaster mould casts slip, and plaster sets by cure with no act.
19. A metal cast salvages to a pool, and fired clay to sherds. Casts from one
    impression fit without a new joint.
20. Brickmaking, pottery, founding and masonry are learnable and credited
    by their acts. The statute brick measures against Terminus's standard.
21. Every piece of state above survives a server restart.

## Cross-references

- **Seeds:**
  - [brickmaking-slate](../slates/builds/brickmaking-slate.md)
  - [pottery-slate](../slates/builds/pottery-slate.md)
  - [moulding-slate](../slates/builds/moulding-slate.md)
- **Subsystems:**
  - [mould.md](../subsystems/mould.md)
  - [fire.md](../subsystems/fire.md)
  - [glass.md](../subsystems/glass.md)
  - [rubber.md](../subsystems/rubber.md) (`fire … for`, the mould decides
    the shape)
  - [assembly.md](../subsystems/assembly.md) (`fit`, parts, wear, the
    gauger)
  - [ground.md](../subsystems/ground.md) and `trade-quarrying` (`dig`)
  - [weather.md](../subsystems/weather.md) (the day's range, wetness)
  - [spoilage.md](../subsystems/spoilage.md) (the water state)
  - [metabolism.md](../subsystems/metabolism.md) (the toxin route)
  - [materials-response.md](../subsystems/materials-response.md)
  - [thermal.md](../subsystems/thermal.md)
  - [maturation.md](../subsystems/maturation.md) (`chemical`, `evaporative`)
  - [instrumentation.md](../subsystems/instrumentation.md)
  - [civics.md](../subsystems/civics.md) (standards)
  - [employment.md](../subsystems/employment.md)
  - [retail.md](../subsystems/retail.md)
  - [cleanliness.md](../subsystems/cleanliness.md) (crazed ware)
- **Related, in flight:**
  - `reqs/sugar` (the cone, the staged boil, the drain keeping its run-off)
  - `reqs/potash` (ash as a good, `fire`'s fractions, `flux`, slaking)
  - repair W7 (`repair-plan.md` § W7) — the next consumer of brick
