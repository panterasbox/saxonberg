# Glass slate — the trade that eats everyone's leftovers

> **Status: BUILT** — the trade ships as `trade-glass` at `/trade/glass`
> (the four kernel seams: `Colour` on `Light`, the firing carries its
> charge, the meltable-non-metal salvage, light-strike). Live reference
> → [glass.md](../../subsystems/glass.md). Requirements + plan retired
> (MR !338, 2026-10-08). Shipped: the sand deposit (clean/dirty faces) +
> the `silica`/`glass` tags, glass's `meltingPoint` (1300 K), the
> batch/amber/remelt recipes, the hot-work window
> (`gob`/`shape`/`reheat`/`crack`), the cold bench
> (`scribe`/`snap`/`groze`/`flatten`), cullet via the widened `salvage`
> branch, the glasshouse + bench archetypes, the first two authored
> `Window` rows (`glaze`).
> **Left:** optics (`optics-slate`) · molds (the dairy build) · the
> buy-side `sell` counter + the returns loop (retail, then the glass
> follow-on) · the converter/tube/instrument bench · the light/sight
> clarity split (`senses-slate`) · the composed stained panel ·
> decolorisers · the glasshouse outrunning its wood (`forestry.md`) · the
> crushed-sandstone route · a priced snap-failure rung — see § Tail.
> **Size:** a tail.

*Opened 2026-10-05, from "I don't really know the glass supply chain."
The conversation ran supply → optics → brittleness → cullet → the
deposit → industrial structure, and every leg found machinery already
shipped. This slate is mostly a map of hooks somebody else left.*

---

## 0. ⭐⭐⭐ The question that opened it, and the answer

> *Does glass need an RGO we haven't designed, or does it ride on
> systems we already have?*

**No new RGO.** And the extraction build already decided this and left
the hook, in `burn-lime.yaml`'s own comment:

> `fire` reads the charge, finds the recipe whose inputs match it, and
> runs THIS. So a pack that ships **a glass batch** or a brick clamp
> ships a row beside this one and touches no code.

## 1. The batch, fully costed

Medieval glass is silica + an alkali flux + lime. Every material row
exists (`glass/glass`, `earth/sand`, `rock/limestone`, `organic/ash`,
`caustic/quicklime`).

⭐ **The flux is free, and it is somebody's catastrophe.** Forest glass
is sand + beechwood ash — and wood ash already exists as a *won object*:
`trade-fuel`'s `thing/ash.yaml`, the collier's total-failure product
(*"A week's cutting and three days' watching, gone up the chimney of a
hole in the ground."*). The glassmaker's flux is the charcoal-burner's
ruined week. `rgo-unification-slate` already clocked the shape —
⭐ *"Potash is wood ash — a forestry byproduct that is simultaneously
glass flux, soap lye and fertilizer. One byproduct, three industries."*

**Lime ships end to end:** the limestone band at −6…−9 on quarry-hill,
`thing/limekiln.yaml`, the `burn-lime` recipe, `thing/quicklime.yaml`.

**The furnace ships:** the `Kiln` row holds 1200 K with a 1.25 bellows
multiplier over `platform/thing/Oven`, with a fuel reserve and a burn
rate. 1500 K is enough for a soda-lime melt.

| what | cost |
|---|---|
| a sand pit | **one `Deposit` row** — a band + a `wins:` thing |
| sand answers the batch | **one tag** (it has `granular, solid, earth`) |
| ash answers the batch | **one tag** (it has `organic, mineral, residue`; quicklime already carries `alkali`) |
| the batch melts | **one recipe row** beside `burn-lime` — three slots, `requiresHeatK ≈ 1400`, `outputApplication: bulk` |
| glass behaves as a solid | **two fields** on the glass row |

`lager-mash.yaml` proves the recipe system already does multi-slot,
mixed item+bulk inputs, a bulk output into a vessel template, and a
residue. **Zero pack code. Zero kernel code.**

## 2. Where the sand comes from — ⚠ not beaches, not deserts

Both intuitive answers are wrong, and the real one is a better mechanic.

**Beach sand is bad glass sand**: shell carbonate, feldspar, heavy
minerals, salt. It is a construction aggregate.

**Desert dune sand is close to industrially useless** — the famous fact
is that Dubai imports sand. Wind-rounded, too fine for concrete, and
the grains carry **iron-oxide coatings**, which is why Sahara sand is
orange and why it cannot be glass.

The purifier is **multicycle sedimentary maturity**: quartz is the only
common mineral that survives repeated weathering, so a third-cycle sand
is nearly pure and a first-cycle sand off a granite is full of junk.
Two deposit types, two acts:

1. **Unconsolidated ancient sand — a dug pit.** Fontainebleau,
   Leighton Buzzard, Lochaline. A spade and a face, no blasting.
2. **Friable sandstone — quarried and crushed.** St. Peter Sandstone
   (~99.5% quartz). ⚠ **No `sandstone` material row exists**, and the
   only size reduction in the tree is `split` for blocks and the mill
   for grist — so this path costs a row plus a crushing act.
3. High-purity: **crushed river quartz pebbles** — Venetian `cristallo`
   used `cogoli` from the Ticino and Adige, with imported Levantine
   plant-ash soda. The Venetians imported both their silica *and* their
   flux, which is a trade-route fact and a nice late-epoch hook.

### ⭐⭐ Iron is the grade, and the grade is visible

| Fe₂O₃ | what you can make |
|---|---|
| < ~0.03% | clear flint, tableware, optical |
| ~0.1% | clear container glass |
| ~0.3%+ | **green bottle glass** |

⭐ **This is why green bottles exist and why medieval forest glass is
green.** Clear glass needs a genuinely pure deposit — worth hauling a
long way — or a decolorizer (manganese dioxide, the trade's
*glassmaker's soap*). **The grade is the colour, and the colour is
visible in the finished object**: a player can see, in the bottle, where
the sand came from.

### ⭐ The third extraction case

`ground/src/idea/Deposit.ts` has full `GradeBand` support —
`meanGrade`, `spread`, depletion scaling, authored pins. Quarry-hill
declined it: *"No lode and no grade bands: a quarry wins the HOST, not
the lode."*

**A sand pit is the case that sentence does not cover** — the one where
the host *itself* has a grade. A mine wins the lode; a quarry wins the
host; **a sand pit wins the host and the host's purity is the whole
economics.** New shape, existing fields.

## 3. The melt — authored, never derived

Steel's row settles the mixture question, and says why:

> ⚠ 1723 K is the real figure for a low-carbon steel: **BELOW pure
> iron's 1811 K**, because that is what carbon does to iron.

`composition[]` exists for the reads that walk it (`analyze chemistry`,
`containsElementOf`); nothing computes a melt from its parts, and
bronze's comment closes it — ⭐ *"Alloying is not averaging."*

So glass takes a `meltingPoint` near 1400 K and a composition of
silica/soda/lime, and **the entire reason glass exists as a technology —
that the mix melts far below any of its parts — is a number with a
comment.** `quartz` already says the other half out loud: *"Melts far
above anything a charcoal furnace reaches."*

⚠⚠ **`glass` has no `meltingPoint` at all today**, which is the exact
defect steel's comment was written about: `getMeltingPointK()` reads 0,
so glass cannot melt, re-melt, or be honestly described as solid.

## 4. ⭐⭐⭐ Colour — two halves, already built, never met

`platform/thing/Window.ts`, since the light build:

```
 *   - `colorTint` (optional ColorTag) — stained glass. Atmospheric
 *     only; does not propagate elsewhere.
```

The comment says *stained glass*. ⚠ **Nothing reads it** — grep finds
`getColorTint()` only in its own test. `Light.ts:34`: *"Today's only
user is `Window.colorTint`."*

Meanwhile the textiles build shipped `lib/perception/Colour.ts`:

> ⭐⭐ **Stored as TRANSMITTANCE, not as RGB, and that is the whole
> point.** … Transmittance multiplies — because that is what layered
> filters do.

**A dye and a stained-glass panel are the same object.** One is a filter
you see light reflected off, the other one you see it through; the
arithmetic is identical, written, and tested (`stack()`, `over()`). And
`Window.baseTransmissivity` — a scalar in [0,1] the light walk already
multiplies — is the **one-channel greyscale version of `Colour`**.

⚠ `Window` has never been authored by any row (`light.md` § 632: *"The
class is authorable and nothing authors it."*) — because **the game has
no way to make glass.** Glass is the missing supply side of a demand
that shipped two builds ago.

### The one kernel change: `Light` carries a temperature, not a colour

`Light` is `{intensity: Quantity<'lux'>, colorTemperature: Quantity<'K'>
| null, sources}`. `Colour.ts` refuses to conflate them, correctly:

> a blackbody's colour and a dye's colour are different physics and the
> two must not be made to share a type.

A 2200 K lamp is *warm*; a ruby window is *red*. So propagating stained
glass means **`Light` gains a `Colour`**, and `attenuate(factor)` gains
a per-channel sibling.

⭐ Get this right: `Colour`'s "filters multiply" warning is about
**filters**. Two *emitters* combine additively — a red window and a blue
window on one room genuinely give magenta on the floor — so `Light.add()`
stays as it is. The multiplication belongs on the way *through* the
glass, never on the way into the eye.

### ⚠⚠ The defect glass exposes: sight and light are one number

`canSeeThrough(from, to)` is defined as `transmissivity(from, to) > 0`.
One scalar governs both the photons and the image.

**Frosted glass is the counterexample, and so is a brown bottle.**
Obscure glazing passes nearly all the light and no image — that is the
entire point of it. A brown bottle glows against a lamp and you still
cannot read the level.

So `LightConduit` and `LineOfSight` want splitting into **transmission**
(how much) and **clarity** (whether it carries an image). Two numbers.
This is independent of glass as a trade — a latent gap in the boundary
model that glass is merely the thing which finds.

### The art, and two techniques worth the design

Medieval colour is metal oxides **in the melt** — pot-metal glass.
Cobalt blue, copper green, manganese purple, iron amber-green,
lead-antimony yellow.

- ⭐ **Thickness is exponential, which is why flashed glass exists.**
  Copper ruby at full thickness reads black, so glaziers blew a thin
  ruby layer onto clear and **abraded through it** for two colours in
  one piece. Beer–Lambert, and `Colour` stores linear transmittance, so
  `pow(t, thickness)` is honest. A real decision: thin flash or thick
  pour.
- **Silver stain is the only actual stain in "stained glass"** — a 14c
  surface application fired to yellow in a kiln, and `burn-lime` already
  proves a firing act is a recipe row.

⭐ **A panel is an assembly, and the honest model is an area-weighted
average.** One `Colour` the light walk can multiply, with the art in the
prose. That is lens 2's answer: ordinary case one `colorTint` on a row,
bespoke case a composed piece with authored description, both resolving
to one filter. **No tile editor is needed to get a nave at noon.**

## 5. ⭐⭐ Why bottles are coloured — not decoration

**Beer is the headline.** Light + riboflavin + hop iso-alpha-acids →
3-methyl-2-butene-1-thiol, almost the molecule a skunk sprays, which is
why the trade's own word is *light-struck*. Clear glass goes off in
**minutes** of sun, green in **hours**, amber in **days**. It is the
reason most beer is brown, and brands that ship clear bottles must use
pre-isomerized hop extract to dodge the reaction.

Same mechanism: **wine** (dark green, and it hides sediment) ·
**apothecary amber** (`trade-medicine`'s draughts exactly) · **olive
oil** (`trade-cooking` ships it).

⭐⭐ **So the bottle's colour is a term in the spoilage clock, and it is
the vessel's own property.** `spoilage.md` runs `μ = μ_max · f_T · f_aw`
— temperature and water activity, both facts about *where* you put the
thing. Light is the first driver governed by **what you put it in**,
which is what gives packaging a reason to matter.

⚠ **Honest caveat**: light-strike is photochemical, not microbial, and
the tree already has the discipline for this — the coffee row declines
to model staleness because *"it goes stale, which is an oxidation story,
not a microbial one, and the gauge is honest to say nothing about it."*
⭐ Lean: a **modifier on the existing rate**, not a new clock and not a
new ledger. `spoilage.md`'s clock/event split already houses it.

## 6. ⭐⭐ Brittleness — the cut and the shatter are one number

Already numbers, with the reasoning on the row:

> **BRITTLE, stated as numbers rather than only as a tag**: glass is
> nearly as hard as steel (600/200) and has almost none of its
> toughness. That **RATIO** is what brittleness is.

`hardness: 550, toughness: 0.5` — comparable hardness, **400× less
toughness**. Consumed by `ThrowController`, `ShootController` and
`MaterialLogic`'s response fold (⭐ *"edge → hardness (a cut), blunt →
toughness (energy absorbed before failure), point → both"*). **A thrown
flask already breaks where a steel one dents.**

⭐⭐ **And you do not cut glass — you score it and snap it.** High
hardness means a hard point marks it; near-zero toughness means the
crack *runs*. The two halves of "shatters when it breaks, but it can be
cut" are **one number read two ways**, which needs no new field.

Two consequences for content:

- **You cannot score a curve.** Shapes are made by **grozing** —
  nibbling the edge with pliers — which is exactly how every piece in a
  stained-glass panel gets its outline. The cold-working act and the
  panel assembly are the same bench.
- **Glass is cut cold and worked hot.** Two shops, two tools. Nothing
  else in the game has that split.

## 7. Working glass, and ⚠ a correction about the epoch

⚠ *"Most glass is molded"* is true of **modern** container glass (a
blow-mold on an IS machine) and false for the epoch trades ship in.
Medieval and early-modern glass is almost all **blown**:

| form | how | epoch |
|---|---|---|
| **free-blown** | gather, inflate, chair, jacks, shears, punty | baseline |
| **mold-blown** | blow *into* a mold for a repeatable body | Roman on |
| **crown glass** | spin a gather into a disc — ⭐ the bullseye pane *is* the punty scar | medieval–18c |
| **cylinder / broad sheet** | blow a cylinder, score it, open it flat in a kiln | the medieval window method |
| **pressed** | plunger into a mold | industrial |
| **cold work** | score-and-snap, groze, grind, engrave, abrade a flash | all |
| **kiln work** | slump, fuse, silver-stain | 14c on |

⭐ **The window and the bottle come off the same blowpipe.** Medieval
window glass is a blown cylinder cut flat, so one act supplies both the
stained panel and the beer bottle — a well-shaped trade (two products,
one skill, one furnace) rather than two trades sharing a material.

### ⭐⭐ The one genuinely new mechanism: the window

Every heat in the game is a **gate** — `requiresHeatK` / `maxHeatK`,
pass or fail. Glass's defining fact is that the heat is a **closing
clock**: a gather is workable for seconds, and you return to the glory
hole or you lose it. Nothing models *"hot enough, for now."*

That is an engagement with a **decaying precondition**, and it is the
only thing in this slate the platform does not already have.

## 8. ⛔ Molds are not glass's — extracted

⭐⭐⭐ **The hook exists and reads the wrong host.**
`Material.castTemplate` (`lib/material/Material.ts:468`, authorable,
persistent, default `/stuff/thing/Casting`) is consumed at the solidify
edge (`lib/thermal/Thermal.ts:1299`), so **today the MATERIAL decides
the shape**. A mold is exactly the claim that the **container** decides
it and the material gets no vote.

⭐⭐ The bigger half: today the **recipe** owns shape via
`outputTemplate`, one output per recipe. A mold moves shape to a TOOL —
**one recipe + N molds = N products** — the same move as `Reading` rows
for instruments and `Placement` rows for containment.

Consumers already past the promote-at-the-third threshold: **the cheese
hoop (dairy, shipping next)** · brick (`burn-lime` names "a brick
clamp") · metal casting (`Casting` + `world-seed`'s `casting-yard` both
exist) · baking tins · ceramic press-molding · candles · soap · rubber
vulcanizing.

⚠ **Decide early, awkward to retrofit: reusable vs consumed.** A cheese
hoop amortizes and wears; a sand-cast or lost-wax mold is **destroyed
every pour** and is a per-unit cost. Real foundries run both.

⭐ **Glass does not need this for its first rung** — medieval glass is
blown. Press- and blow-molding are its industrial rung.

## 9. Cullet, byproducts, and remainders

### ⭐ "Bottle glass" windows are not made from bottles

The 60s–70s pattern in doors and sidelights is **machine-rolled
patterned glass**, pressed between rollers with an engraved pattern —
and one of its standard US trade-catalogue patterns is literally called
*Bottle Bottom*. **The name describes the look, not the feedstock**, and
the look it imitates is the **crown-glass bullseye**, i.e. a punty scar.
Two steps removed from a bottle.

Three real neighbours: **genuine bottle-bottom walls** (Rhyolite NV
1906; a counterculture revival in exactly that window) · **dalle de
verre** (thick *cast* slabs in concrete — the midcentury church window,
and a mold product) · **rondels** (real spun discs, blown).

### Cullet, and why it converges with § 2

**Cullet** = broken glass returned to the furnace. Internal (your own
moil, offcuts, rejects) vs external (post-consumer).

⭐ **Cullet melts cheaper than raw batch** — no calcination, no
dissociation. Every ~10% cullet saves ~2.5–3% furnace energy, and real
container furnaces run **50–90%** cullet.

⭐⭐ **Glass is the only common packaging material that recycles with no
downgrade.** Aluminium drifts alloy (`aluminium-can-slate`'s own
3004-body/5182-lid point); paper loses fibre length; plastic loses chain
length. Glass does not degrade.

⚠⚠ **Except in colour, which is the binding constraint.** Mixed cullet
makes only green or amber — **you cannot make clear glass from mixed
cullet.** Plus CSP contamination (ceramics, stones, porcelain, a metal
lid) makes inclusions that reject a batch.

⭐⭐⭐ **So colour is the grade arriving from the other direction, and it
runs one way.** Dirty sand → green. Mixed cullet → green. **Glass moves
toward green and amber and never back.** An entropy arrow with no new
ledger, and it explains green bottles twice over — from the mine and
from the bin.

### ⚠⚠ The collision with `salvage`'s doctrine, and the resolution

`salvage` is *"the one generic lossy melt-down, the entropy sink,"* and
`crafting.md` is emphatic:

> **And the loss is the point.** Teardown must return *less* than went
> in. … **the loss is what keeps mining and farming necessary.**

Glass is the honest counterexample: cullet is not lossy, it is *better*
than raw batch.

⭐⭐⭐ **Resolution: glass pays its entropy in COLOUR, not in mass.** You
get all your glass back and it goes greener. That preserves exactly what
the doctrine protects — a one-way sink, and standing demand for fresh
extraction, because **clear glass still needs low-iron sand no amount of
recycling can produce** — while being physically truthful. The loss is
real; it is denominated in something you can see.

⚠ Wiring: `salvage` routes `metal → re-meltable /stuff/thing/Casting`,
**everything else → `/stuff/thing/Scrap`**. The branch is on `metal`,
not on *meltable*, so glass falls to scrap today. Widening that
condition is the whole of it.

### ⭐ Glass is a sink, not a source

Almost every trade in the tree produces a residue — spent grain, lees,
pomace, spoil, slag, bran, ash. **Glassmaking produces essentially
nothing and consumes everyone else's leftovers**: wood ash from the
collier and the forester, broken glass from the whole world. An unusual
economic shape, worth keeping deliberately. Two exceptions:

- **The moil** — the overblow cracked off the blowpipe on every piece. A
  byproduct that is immediately its own feedstock.
- **Glass gall / sandiver** — the salty scum skimmed off the melt
  (sulfates, chlorides), historically sold as a flux, a polish and a
  medicine. A genuine `outputResidue` with a market, which is a nicer
  object than another waste pile.

### ⭐⭐⭐ The failure economics are unlike anything shipped

Because cullet is recoverable, **a failed blow costs fuel and time and
nothing else.** Every other ruined process in the tree destroys its
input. So glass is the **forgiving-material, unforgiving-skill** trade:
grade is nearly pure skill, because the stock always comes back.

⭐ Which makes it the natural **teaching trade** — a student's hundred
bad attempts cost the institution fuel rather than material. Lands
directly on `wizardry-curriculum-slate` and the practicum.

## 10. The deposit and the returnable loop

> *"Right now the bar has nothing to do with all the empties it holds."*

### What already ships, and what it was built for

`bulk.md` § 81, on `VesselKindMixin.category`:

> **The census** — an emptied vessel counts under `vessel:<category>`,
> so a drained can of cola joins the factory-fresh empties instead of
> hiding under `vessel:cola`. ⭐ **That is the count a deposit or returns
> market reads**, and it is why draining the world's gin makes the floor
> genuinely short.

And the consumption side is live: `claimGlass` *"takes any clean empty
of the right kind. A washed-out vessel and a new one are the same input
to a fill, which is what a real line does."* `GlassRack`'s glasses are
already a maintained pool with `wash`, not minted per drink.

### ⭐⭐ The gap is that the par sheet can only be SHORT

`stockSheetFor(viewer)` returns `{ line, onHand, shortfall }`. The
`restocks` brain buys the shortfall. **There is no surplus.** The bar can
notice it needs six bottles; it cannot notice it has two hundred it does
not want. That single missing sign is why the empties sit there.

The mirror already exists and is generic: **`consigns`** — *"a
producer's floor hand carries stock to a distributor's counter and
consigns it as the business,"* driving `get` and `consign --ask` through
`forceCommand`. **A `returns` brain is that brain pointed back up the
lane the full bottles came down**, which is what a returnable is.

### ⚠ Why there is no refund path: conservation

**There is no `sell`.** `reclaim` only retrieves your own unsold
consignment, and consignment's design says why:

> **A sale** splits the ask… The store **fronts no coin** (a real
> buyer's coin funds both legs); conservation holds.

⭐ **A deposit refund is the one transaction where somebody pays out
before a sale exists** — the bar hands you coin for an empty before the
bottler has paid for it — and `banking.md`'s chokepoint forbids minting
the difference. Not an oversight; the reason the shape is absent.

### The money, without a new mechanism

**The faithful model**: the deposit is collected *ahead* of the glass and
refunded *behind* it. Bottler charges the bar; bar charges the drinker;
drinker returns and gets the bar's money; bar returns the crate and gets
the bottler's. ⭐ **Nobody ever fronts anything.** Conservation-clean,
but it wants a refundable-charge concept, which is a liability, which
wants a ledger.

⭐⭐ **The Saxonberg model — derive, don't track: don't record the
deposit, price the empty.** An empty has a standing price at a bottler's
counter and no receipt is checked. The "deposit" out is just the bottle
being part of the full bottle's price; the refund in is a **standing
offer to buy empties**, paid from the business's operating account, which
holds real coin. Conservation untouched. The only new constraint is that
a bottler with an empty till stops taking empties — honest, and good
drama.

### ⛔ The buy-side counter is cross-cutting — extracted

⭐⭐⭐ **A counter that buys is worth far more than the deposit.** It is
the general `sell` the game lacks, and `retail.md:21` names the shape it
only implements one way: *"the `Stock` counter prices **items** (sell me
that)."* Scrap, cullet, surplus harvest, a salvaged blade and the
forager's basket all want it. **Do not invent it inside a bottling
build** — same rule as molds.

### ⭐ The missing half: the empties should be IN THE WAY

The problem is not that there is no reward for returning them — it is
that **there is no cost to not returning them.** A deposit is only a
decision if the alternative hurts.

`furnishing.md` has acreage (ground and floors) and the room overlay;
`look` renders from it. ⭐ A bar with two hundred empties behind the
counter should *read* like one, and should be running out of room for
the crates it actually needs. No new ledger, uses the shipped estate
slice, and turns the pile from scenery into pressure.

### ⚠ The crate defect comes due

`bulk.md`: an emptied crate derives `vessel:<primaryKeyword>`
(`vessel:grapefruits`) instead of converging — *"this wants fixing
before anything counts or trades `vessel:*`. **Nothing does today**,
which is why it is deferred rather than urgent."* A returns market is
what makes it count. ⭐ And the crate is the better teacher: the can
slate's own term for it is the **returnable transport item**, the whole
category.

### ⭐⭐ The economics are already computable

Glass cullet is cheap and **heavy**, so collection frequently costs more
than the material is worth — the exact inverse of the can, where
*"scrap carries enough market value to pay for its own collection."*
`logistics.md` already models a cost surface and induced lanes, so *"is
the haul worth it?"* falls out of shipped machinery.

⭐⭐⭐ Same verb, same loop, **opposite answer** — and a player who
learns "recycling good" from the can and applies it to glass gets it
wrong, which is the lesson `aluminium-can-slate` was already worried
about and could not demonstrate with only one material.

## 11. Two places, not one — and ⭐⭐ two settlement types

> *Is there any difference between a place that makes panes and tubes
> and a place that makes specific applications?*

### The split, and what forces it

The industry's own division is **primary glass** (melts batch, makes
stock) versus the **converter** (buys stock, makes products) — the same
split as paper's mill-and-converter, steel's mill-and-fabricator,
plastics' resin-and-molder.

⭐⭐ **The furnace forces it.** An industrial continuous tank runs 10–20
years without going out, because cooling cracks the refractories and
freezes the tank. It must therefore run at capacity forever, which means
selling **commodity stock in standard sizes** — no single customer wants
a furnace's worth of one product.

⚠ **The hard version is industrial.** A medieval glasshouse worked from
**pots** over a campaign of days, and made **finished ware**: the blower
blew the bottle, the glazier bought crown discs.

⭐⭐⭐ **So the primary/converter split is itself an epoch transition** —
one glasshouse making things becomes a stock producer plus a converter
sector that did not previously exist. A clean on-ramp for
`epoch-onramp-knowledge-gated`: the same trade, reorganized by a
furnace.

### The stock, and what each form gates

| stock | process | unlocks |
|---|---|---|
| **flat / sheet** | crown & cylinder → rolled → float | windows, mirrors, glazing, blanks |
| **container** | blown → mold-blown → IS machine | bottles, jars, vials |
| **tube & rod** | hand-drawn → Danner / Vello | ⭐ instruments, lamps, ampoules, neon, sight glasses |
| **fibre** | drawn / spun | insulation, composite reinforcement |
| **pressed ware** | plunger | insulators, blocks, lenses, cheap tableware |

### ⭐⭐ The tube already has customers, with no supplier

Content already ships: **`thermometer` · `hydrometer` · `gas-analyzer`**
· `carboy` · `culture-jar` · `bowl` · `sconce-lamp` · `mana-cell` ·
`mana-lamp` · every potion and wand in the arcane library.

**The first three are the instrument ladder** — every one a lampworked
tube product in life. So the game's *measurement layer* rests physically
on glass tubing and nothing makes any.

⭐ That answers the rung question directly: **the tube shop's customer
list is already written and it is not the bottle shop's.** Containers
serve drink and medicine; tubing serves instruments — a different buyer,
a different demand, **a bench instead of a furnace.**

### The converter's capabilities — each a shop, not a step

- **cut & edge** — score-and-snap, groze, grind, polish (cold)
- **temper** — surface quench for a compression skin. ⚠ Shatters into
  dice and **cannot be cut afterward**: an irreversible terminal step
  and a real ordering constraint
- **laminate** — two sheets plus an interlayer
- **coat / silver** — mirrors need the metal chain (`lead`, `tin` ship)
- **slump / fuse / stain-fire** — the kiln, already shipped
- **lampwork** — ⭐ a bench torch and tube stock. Every instrument, and
  **no furnace at all**: the cheapest shop and the highest-skill one
- **seal & evacuate** — ⭐⭐ the vacuum. Bulbs, vacuum tubes, and the
  **thermos**, which the glass row already names (*"the inner vessel
  wall of a vacuum flask… the thermos wall term"*). The game ships that
  product and not its chain. Glass-to-metal sealing needs matched
  expansion coefficients — a real, teachable constraint

### ⭐⭐⭐ Glass is the enabling component, never the valuable one

The glass in a light bulb costs pennies and the bulb is impossible
without it. Glass supplies five capabilities nothing else in a
pre-plastic material set does: **see-through containment · electrical
insulation · chemical inertness · vacuum tightness · optical
transmission.**

Which lands on the role `rgo-unification-slate` went shopping for:

> a *strategic resource* is a small-volume input that gates **what you
> can make** rather than **how much**. We have no instance of that
> economic role, and **tungsten is the historical version of exactly
> it**.

⭐ **Glass tubing is a better instance, and it is upstream of tungsten's
own use** — a bulb needs both the filament and the envelope, but the
envelope also gates thermometers, vials, retorts and lamps.

**Assemblies whose other half already ships:** mirror (+ tin/lead) ·
lantern (+ metal frame + `lamp-oil`) · stained window (+ lead cames + a
wood frame) · spectacles (+ `horn`; `horn-spoon` ships) · wet cell
(+ lead + `vitriol`, which exists) · thermos (+ a shell) · greenhouse
glazing (→ husbandry).

### ⭐⭐ And they are two different settlement types

`settlement-model.md` sorts towns by *why the place is there*:

- **The glasshouse is a resource town.** Glasshouses sat **in the
  woods** because fuel dominated the cost and wood is bulky — the Weald,
  Lorraine, Bohemia, Jamestown — and they **moved when the wood ran
  out**, which is why "Glasshouse" litters English placenames. That is
  the resource town with its documented failure mode: ⚠ *"They die when
  the seam runs out"* — Rejection's story with timber as the seam.
- **The glazier and the lampworker are in the city**, next to the
  customer: the general store fragmenting, the specialization gradient.

⭐ A von Thünen result, which the millsite's comments already teach: the
heavy fuel-hungry low-value-density operation goes to the fuel; the
light high-skill high-value-density one goes to the buyer. **One
material, two sitings, and the taxonomy already distinguishes them with
no new type.**

⚠ A glasshouse is plausibly also a **LULU** — fire risk, smoke, and an
appetite for every tree within carting distance. A town may push it
outside the walls, which is the exit-driven arm of the same taxonomy.

**So: one trade, two rungs, and the rung is a property of the PREMISES,
not the person.** Two archetypes with different capital and siting.

## 12. Lens pass

1. **Pedagogy.** A `glassblowing` Discipline row, as every trade ships
   one. ⭐ Four things glass teaches that nothing else does: iron→colour
   as a grade *you can see*; brittleness as one ratio read two ways;
   the cullet entropy arrow; primary-versus-converter as an epoch
   reorganization. Derivable throughout — nothing authored that physics
   can state.
2. **Creative expression.** Ordinary case: a bottle row. Bespoke: a
   composed stained panel with authored prose. ⭐ The area-weighted
   filter keeps the mechanism one number while the art lives in the
   description.
3a. **Immersion.** ⚠ **The firewall**: a bottle must be green *because
   of* its sand or its cullet, never decoratively. If authors may set
   colour free, the whole § 2/§ 9 convergence becomes a lie the player
   can catch.
3b. **Participation.** A deposit level is a polity choice; the
   glasshouse as a LULU makes siting a zoning fight. Both are things the
   polity can do that we did not script.
4. **Values.** No derivable answer: the deposit level · whether clear
   glass should be rare · who pays the haul. All decided, none computed.
5. **Continuity.** The test — does the new object answer the same
   commands: a float pane and a crown disc must both answer `look`,
   score and snap. They do. ⭐ The epoch moves the *organization* of the
   trade, not its verbs.
6. **Economy.** Produces: stock, gall, the moil. Consumes: sand, ash,
   lime, fuel, **cullet**. Who pays: bottler, glazier, instrument maker.
   ⭐⭐ **Was the demand there first — uniquely, YES**: thermometer,
   hydrometer, gas-analyzer, carboy, culture-jar and the thermos all
   ship with no supplier. `rubber-slate` says criterion 1 is normally
   circular because demand is authored; here it is not.
7. **Governance.** It judges no person. The deposit level is **Tier C**
   (polity-amendable); the siting is zoning's.

## 13. Open questions

1. ⚑ **Does colour propagate into the room, or stay on the glass?**
   Staying is cheap (the bottle's spoilage term only). Propagating costs
   `Colour` on `Light` and buys the actual experience. ⭐ Lean:
   propagate — the arithmetic is written and tested, and lens 1 says the
   right answer is derivable.
2. ⚑ **Is the light/sight split this build's or the boundary model's?**
   It is a latent defect glass merely finds. Lean: fix it here, because
   nothing else has a reason to.
3. **Light-strike: a modifier or a new driver?** Lean: a modifier on the
   existing rate. ⚠ Needs `spoilage.md`'s owner to agree.
4. **Does the sandstone path ship?** It needs a `sandstone` row and a
   crushing act. Lean: no — ship the pit, defer the crush.
5. **How does the glasshouse's fuel appetite couple to forestry?** The
   historical answer is depletion and relocation. ⚠ `forestry.md` ships
   a coppice `Panel` on a one-game-year rotation; a glasshouse may be
   the first consumer that can genuinely outrun it.
6. **Where does the Discipline's difficulty come from?** ⭐ The failure
   economics (§ 9) mean a bad blow costs fuel, which makes glass the
   cheapest place in the game to *measure* skill. Worth checking against
   `wizardry-rubric.md` § 3 before inventing anything.
7. **Does the first `Window` row ship with this build?** It would be the
   game's first ever, and stained glass is the reason to bother.

---

## Tail — deferred seams (salvaged from the retired plan, 2026-10-08)

The build shipped the trade; these are the clean attach points it left,
each with the slate/doc it lives on. ⭐ Most of § 13's open questions are
now **answered by the build** (colour propagates · the first `Window`
ships · light-strike is an additive driver · the sandstone crush is
deferred); what stays open is this table.

| seam | the attach point the build left | lives on |
|---|---|---|
| optics (`refractiveIndex`, the grind, lens blanks, acuity) | the glass material row (a field beside `meltingPoint`); the cold bench (a `grind` sibling of `scribe` on the same `Sheet`); a disc is an ordinary `Sheet` | `optics-slate` |
| molds (one recipe → N products by a tool) | `ShapeController`'s `form` vocabulary is where a mold substitutes for the jacks; `Gather.form` → product-row map is one table | the dairy build (the cheese hoop first) |
| the buy-side `sell` counter (cullet as a commodity) | a `Casting` of glass is already the commodity; `GlassBottle.category = bottle` keeps the `vessel:*` census honest | retail |
| the returns/empties loop + the crate defect | same | the glass follow-on, after retail |
| the converter / tube / instrument bench | `Gather.form` gains `tube`; a `lampwork` archetype with a bench torch; the thermometer/hydrometer/gas-analyzer rows are the customers | the glass follow-on |
| the light/sight clarity split | `Window.canSeeThrough` untouched; `LineOfSight` is the interface that grows a clarity | `senses-slate` |
| the composed stained panel (area-weighted filter) | `Window.setGlazing` takes one `Colour`; a panel act folds N grozed pieces by area and calls it once | the glass follow-on |
| decolorisers (manganese, the arrow's twin) | a third `Tinted` term with a negative sign; a batch row with `pyrolusite` | the glass follow-on |
| the glasshouse outrunning its wood | `forestry.md`'s coppice `Panel`; the kiln's fuel reserve is the coupling point | `forestry.md` note / rgo-unification |
| the crushed-sandstone route | a `sandstone` material row + a crushing act; the sand pit's `wins:` is the same field | the trade |
| a failed snap / the breakage rate at the bench | `glass.cold.snapLossChance` is `0` and not a roll — a competence-priced failure rung needs the uncertainty doc's provenance answer first | the glass follow-on |

---

**See also:** [aluminium-can-slate](../tails/aluminium-can-slate.md)
(the returnable/one-way axis; the inverted recycling lesson) ·
[rgo-unification-slate](./rgo-unification-slate.md) (potash; the
strategic-resource role) · [thermal-slate](../tails/thermal-slate.md)
(boil as a plateau) · [settlement-model](../../settlement-model.md)
(the two sitings) · [instrumentation](../../subsystems/instrumentation.md)
(the tube's customers) · [bulk.md § `category`](../../subsystems/bulk.md)
(the empty↔product tie, and the crate defect).
