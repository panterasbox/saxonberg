# Glass — requirements

**Kind:** feature
**Leads from:** content (content-led, with a few thin kernel seams)

Glass is the trade that turns three other trades' leftovers into the one
material a pre-plastic world cannot do without — see-through containment,
chemical inertness, and (later) optical transmission. The whole supply
chain is already on the ground: the materials ship, the furnace ships, the
melt is a recipe row the lime-burner's own comment invites, and the colour
machinery exists in two halves that have never met. This build makes glass
*makeable* and, for the first time, lets a coloured window actually colour
the light in a room. Executes `docs/slates/builds/glass-slate.md`; the lens
half is deliberately split out to `docs/slates/builds/optics-slate.md`.

## What already exists

The product surface, verified against current master:

- **Every batch material ships** as a good: sand (`earth/sand`), limestone,
  quicklime (carries `alkali`), and **wood ash** — the charcoal-burner's
  ruined week, already a won object. The glassmaker's flux is the collier's
  catastrophe.
- **The furnace ships** — the `Kiln` row holds its heat over the base oven
  with a bellows multiplier and a fuel reserve; hot enough for a soda-lime
  melt.
- **The melt is invited** — the lime-burning recipe's own comment says a
  pack that ships *a glass batch* ships a row beside it and touches no
  code. Multi-slot recipes with a bulk output into a vessel and a residue
  already work.
- **The deposit machinery ships** with full grade-band support — a sand pit
  is the new case the quarry declined: the one where *the host's own
  purity is the whole economics*.
- **Colour ships twice, unmet**: a window already has a `colorTint` nothing
  reads, and the textiles build shipped a transmittance-based `Colour`
  (filters multiply) that is exactly what a stained panel is. A dye and a
  stained-glass pane are the same arithmetic.
- **Brittleness ships** as numbers (hard as steel, ~400× less tough) and is
  already consumed when a thrown flask shatters where a steel one dents.
- **The demand ships with no supplier** — the thermometer, hydrometer,
  gas-analyzer, carboy, culture-jar, the thermos the glass row literally
  names, every vial and wand: all authored, none makeable.

**Therefore what is genuinely new here is:** a sand pit whose grade *is its
purity* (and its colour); glass finally able to melt; the batch recipe; the
one new mechanism (the *hot-work window* — a gather workable only for
seconds); coloured light actually propagating through a pane into a room;
cullet that recovers its mass but only ever goes greener; and the game's
first authored window.

## Goals

- A person can turn **sand + ash + lime** into glass at a furnace, and
  re-melt broken glass (cullet) at a discount.
- A sand pit's **iron grade is visible in the finished object** — dirty
  sand makes green bottles, pure sand makes clear — and it is never a
  decorative choice.
- Glass is **worked hot** through a closing window (a gather cools; you
  return to the glory hole or lose the piece) and **worked cold** by
  score-and-snap and grozing — two shops, two tools.
- One blowpipe yields **both a bottle and a window pane** (the medieval
  cylinder-cut-flat), under one `glasswork` Discipline.
- **A stained pane colours the light in the room it is set in** — the
  game's first window that does something, and the first a row has ever
  authored.
- **Cullet recovers full mass but moves one way toward green**; mixed
  cullet cannot make clear glass. Recycling that is physically truthful and
  teaches the opposite lesson from the aluminium can.
- A bottle's colour is a **term in the spoilage of what it holds** — clear
  beer goes light-struck in the sun in minutes; brown protects it.
- A glasshouse sites **in the woods** (fuel-bound, a resource town that can
  outrun its timber) and the cold bench **in town** — two sitings the
  settlement model already distinguishes.

## Non-goals

- **Lenses / optics** (focal length, magnification, microscopes,
  telescopes, visual acuity, corrective eyewear) → **`optics-slate`**.
  Glass ships *no* optics — it only leaves the room (an extensible glass
  material row, the cold bench) and the feedstock. No dead `refractiveIndex`
  field, no consumer-less lens-blank.
- **Molds** (one recipe → N products via a shaping tool) → the **dairy
  build** (the cheese hoop is the first consumer); glass's first rung is
  blown, not molded.
- **A buy-side "sell" counter** (the general `sell` the game lacks) →
  **retail**; it is worth far more than a deposit and must not be invented
  inside a bottling build.
- **The light/sight clarity split** (frosted glass passes light but no
  image) → **`senses-slate`**, which already specs it with numbers. Glass
  takes only the *colour* seam, which is unambiguously its own.
- **The deposit / returns "empties" loop** (a returns market, the par
  sheet's surplus, empties piling up in the way) → a **glass follow-on**;
  it needs retail's buy-side counter first.
- **The industrial primary/converter split and the tube/lampwork instrument
  bench** → a **glass epoch follow-on** (the converter sector is itself an
  epoch transition). This build is the medieval glasshouse making finished
  ware.
- **A `sandstone` crush path** → deferred within the trade; ship the dug
  pit, defer the quarried-and-crushed route.
- **Coupling the glasshouse's fuel appetite to forestry depletion** →
  noted against `forestry.md`; defer the depletion/relocation loop.

## Placement

A new capability pack, **`trade-glass`**, under the `/trade/glass`
namespace — the trade is a process (batch → melt → blow → cold-work), which
is what a pack owns. A **glasshouse** and a **cold bench** are two
archetypes (different capital and siting), and a specific glasshouse is
content: a `Deposit` row (the sand pit), a `Business`, and a location.
⭐ The second-instance test passes — a second glasshouse is rows, zero pack
code. The thin kernel seams (glass melting, colour-through-light, the
hot-work window, the cullet melt path, light-strike) are the plan's to
place; this doc names them only as capabilities.

## Collisions

- ⚠ **`trade-roster-slate` already plans a `glazier` trade and a
  `glasswork` skill (id 0722).** Reconciled: **adopt the rostered
  `glasswork` name** for this build's Discipline rather than invent
  `glassblowing`; the *glazier* (the converter who cuts and fits panes) is
  the deferred converter/epoch rung, not this build.
- ⚠ **`senses-slate` already owns the light/sight clarity split** (open
  glass 0.95/0.95, closed 0.95/0.3). Reconciled: glass takes only the
  colour propagation; the clarity split stays senses-slate's.
- **Two `ash` material rows exist** (`trade-fuel`'s `organic/ash`, a
  `base-library` `wood/ash`). The batch must name the intended one — the
  collier's `organic/ash` is the won object with the flux story.
- **The empties already sit in the bar** (`GlassRack`, `claimGlass`, the
  vessel-category census all ship) but there is nowhere for a surplus to
  go — which is exactly why the returns loop is deferred, not forgotten.
- **The crate defect** (an emptied crate derives `vessel:<primaryKeyword>`
  instead of converging) comes due only when a returns market counts
  `vessel:*` — deferred with the returns loop.
- **Siting** touches the settlement model: a glasshouse is a resource town
  *and* plausibly a LULU (fire, smoke, an appetite for every nearby tree),
  which a town may push outside the walls.

## Surface decisions

- **Does colour propagate into the room, or stay on the glass?**
  **Propagate.** The arithmetic is already written and tested
  (transmittance multiplies), lens 1 says the right answer is derivable,
  and it is the entire reason the first window is worth authoring. This is
  the one real kernel change: light carries a *colour*, not only a colour
  *temperature* — and two emitters still add (a red and a blue window give
  magenta on the floor); only the pass *through* the glass multiplies.
- **The `glasswork` Discipline** (not `glassblowing`) — one Discipline
  covering hot-blowing and cold-working for this rung, per the roster
  reconcile.
- **Iron grade is the colour, and it is one-way.** A pit's purity sets what
  you can make (clear needs genuinely pure sand); mixed cullet also makes
  only green/amber. Both arrows point at green and neither comes back —
  "glass moves toward green" is derived from the batch and the bin alike,
  no new ledger.
- **Light-strike is a modifier on the existing spoilage rate, not a new
  clock** — it fits spoilage's clock/event split, and the bottle's colour
  is the term. (Photochemical, not microbial; honest about what it is.)
- **The hot-work window is the one new mechanism** — an engagement with a
  *decaying precondition* (workable while hot, lost when it cools). The
  plan decides its shape; the product fact is "you have seconds."
- **Cullet widens the existing melt-down path** to accept meltable
  non-metals (today only metal re-melts; everything else becomes scrap) —
  glass pays its entropy in colour, not mass, which preserves the one-way
  sink the teardown doctrine protects while being physically truthful.
- **Ship the dug sand pit, defer the crushed-sandstone path.**
- **The first `Window` row ships with this build** — stained glass is the
  reason to author one.

## Lens pass

1. **Pedagogy.** A `glasswork` Discipline. Four things glass teaches that
   nothing else does: iron→colour as a grade *you can see in the object*;
   brittleness as one hardness/toughness ratio read two ways (score vs
   shatter); the cullet entropy arrow; and (next build) primary-vs-converter
   as an epoch reorganization. Derivable throughout.
2. **Creative expression.** Ordinary case: a bottle row with a tint.
   Bespoke: a composed stained panel with authored prose — the art in the
   description, the mechanism one area-weighted filter. No tile editor to
   get a nave at noon.
3a. **Immersion.** ⚠ The firewall: a bottle is green *because of* its sand
    or its cullet, never decoratively — or the convergence is a lie the
    player can catch.
3b. **Participation.** A deposit level (deferred) is a polity choice; the
    glasshouse as a LULU makes siting a zoning fight. Both unscripted.
4. **Values.** No derivable answer: whether clear glass should be rare, who
    pays the haul. Decided by play, not computed.
5. **Continuity.** A float pane and a crown disc both answer `look`, score
    and snap. The epoch moves the *organization* of the trade, not its verbs.
6. **Economy.** Produces stock, gall (a saleable residue), the moil.
    Consumes sand, ash, lime, fuel, cullet. ⭐⭐ Uniquely, **the demand was
    there first** — the thermometer/hydrometer/carboy/thermos all ship with
    no supplier, so criterion 1 is non-circular here where it usually isn't.
7. **Governance.** Judges no person.

## The drive

Run against the live game at the end of the build, before the MR:

1. Travel to the **glasshouse in the woods**; `look` — the furnace and the
   bench are there, and you can see it is sited for fuel.
2. **Win sand** from the sand pit; `analyze` it — its iron grade is
   legible, and it tells you what you can make.
3. Gather the **batch** (sand + the collier's ash + lime) and run the melt
   at the furnace → molten glass.
4. **Gather on the blowpipe and blow a bottle.** Dawdle once and watch the
   gather cool past working — you lose it (the hot-work window). Do it in
   time and the bottle forms.
5. **Blow a cylinder, score it, open it flat** into a **window pane** — the
   same blowpipe, the second product.
6. At the **cold bench**, score-and-snap a pane and **groze** a curved
   edge; throw a flask and watch it **shatter** where a steel one would dent.
7. Make a bottle from **dirty (high-iron) sand → it is green**; from pure
   sand → clear. The colour is in the object, and `analyze` ties it to the
   sand.
8. **Break a piece, re-melt the cullet** → you get all your glass back, and
   it has gone **greener**; try to make clear from mixed cullet → you can't.
9. Set a **stained pane in a window** and `look` at the room — the light
   through it **colours the floor**. Put a second colour of window on the
   same room → the colours **add** (magenta), not multiply.
10. Put beer in a **clear bottle in the sun** → it goes light-struck fast;
    the **brown bottle** protects it.
11. Blow a few pieces and watch the **`glasswork` Discipline** advance — a
    bad blow costs fuel, not material (the cullet comes back).

## Acceptance criteria

Observable from outside the code:

- A player can make glass from sand, ash and lime at a furnace, and
  re-melt broken glass more cheaply than raw batch.
- A bottle's/pane's colour is determined by its sand's iron grade and its
  cullet content, visibly — and cannot be set decoratively against them.
- A hot gather is workable only briefly; dawdling loses the piece.
- Flat glass scores-and-snaps and grozes; a thrown glass vessel shatters,
  a steel one does not.
- Re-melting cullet returns the full mass but moves the colour one way
  toward green; mixed cullet cannot produce clear glass.
- A stained window colours the light in its room, and two windows' colours
  add; the game has its **first authored window**, lit through.
- Beer in clear glass in sunlight spoils faster than in brown glass.
- A `glasswork` Discipline exists and advances with practice.
- A second glasshouse can be stood up from rows alone (a deposit, a
  business, a location) with no new pack code.

## Cross-references

- **Seeding slate:** `docs/slates/builds/glass-slate.md`
- **Split out:** `docs/slates/builds/optics-slate.md` (lenses, acuity,
  corrective eyewear)
- **Subsystems:** `light.md` (the colour-through-light seam, the first
  window), `spoilage.md` (light-strike as a rate modifier), `crafting.md`
  (the cullet/salvage doctrine), `instrumentation.md` (the orphaned
  instrument demand), `settlement-model.md` (the two sitings), `bulk.md`
  (the vessel census and the crate defect)
- **Reconciled against:** `trade-roster-slate` (the `glasswork` name,
  the glazier converter), `senses-slate` (the clarity split)
- **Deferred to:** retail (the buy-side counter), the dairy build (molds),
  a glass epoch follow-on (the converter sector + the instrument bench)
