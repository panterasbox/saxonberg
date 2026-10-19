# Sericulture — silk is a raw-goods chain, not a row

> **Status: UNBUILT · RAISED 2026-10-17** (cleanliness planning).
> **Left:** all of it: the mulberry, the worm, the rearing, the stifling
> decision, reeling, throwing, degumming, wild silk, the disease, the
> venue and its climate.
> **Size:** a build (a new trade pack over the taps, apiculture and
> textiles substrates).

> **User (2026-10-17), on cleanliness's drive needing a silk garment the
> laundress could ruin:** *"silk sounds like another RGO we didn't think
> about."*

## ⚠ The line this slate corrects

[textiles.md](../../subsystems/textiles.md) § *What is not here yet* and
[textiles-slate](textiles-slate.md) both file silk beside cotton as *"a
second cellulose fibre — more content, no new lesson."* That is wrong on
both counts:

- **Silk is not cellulose.** It is a **protein** fibre (fibroin, gummed
  with sericin), so it dyes, bleaches and is ruined like wool, not linen:
  - it takes a metal mordant directly;
  - lye destroys it;
  - sun yellows it;
  - sulfur fumes whiten it.

  The shipped `cellulose` / `protein` tag split already decides all four.
  Cleanliness ships the last two.
- **Silk is not grown, it is raised.** Its reservoir is an **animal fed on
  a leaf crop**, so the chain begins at husbandry, not at a fibre row.
  Textiles' seam 2 (*the chain begins at fibre-exists-as-a-material*) still
  holds: everything upstream of the cocoon is a new trade, and everything
  downstream rides textiles' `prepare` stage (*silk reels*, textiles.md
  § the two stage names) unchanged.

## The chain

1. **The mulberry.** A leaf crop, cut over and over: a pollard or a coppice
   stool on a rotation. The nearest shipped shape is forestry's `Panel`
   (a stool that remembers being cut), or a husbandry `Field` of
   slot-plants. The leaf is a perishable Provision; worms eat it fresh.
2. **The graine (eggs).** It overwinters, and hatches when it is brought
   into warmth, which the keeper times to the **leaf flush**. That is a
   taps window (`photoperiod` + `rising`, the spring-from-autumn split), or
   the keeper's own act. The keeper's judgement is in picking the day.
3. **The rearing.** About a month and five instars, eating enormously and
   more each instar. The rearing house is kept warm and dry and is fed
   several times a day.
   - ⭐ The individual worm is below the resolution anything acts at. So
     **the tray is the organism**, as apiculture's colony is: one body
     with a strength, an instar and a hunger, and the arithmetic is its
     metabolism.
   - The labour is real and heavy, which makes it a household's or a
     hired hand's work.
4. **Mounting and spinning.** Given straw or brush, the worms spin. A tray
   yields cocoons by weight and grade.
5. **⭐ The decision at the act: stifle or let them emerge.**
   - **Stifle** (heat — an oven, the sun, steam): you kill the pupa and
     keep the **continuous filament**, close to a kilometre per cocoon.
   - **Let the moth emerge:** you get next year's graine and a **pierced
     cocoon** that can only be carded and spun as staple (*spun silk*,
     the cheaper cloth).

   This is the [taps](../../subsystems/taps.md) feedback law with a death
   in it. The same cocoon is either cloth or the next generation, and
   every keeper must keep some moths.
6. **Reeling.** Cocoons soaked in hot water so the sericin softens; the
   ends of several are found and reeled together onto one thread. The
   reeler's band sets the evenness. Waste and pierced cocoons go to spun
   silk. This is textiles' `prepare` stage, a profile over a new material.
7. **Throwing.** Twisting reeled silk into yarn (organzine, tram); a
   throwster's mill is the medieval exception to "trades ship medieval
   at hand scale".
8. **Degumming.** Boiling the thread in **soap** strips the sericin and
   gives the lustre: *boiled-off* silk.
   - ⭐ This is cleanliness's soap with a second consumer, and the
     first that is a trade rather than a wash.
   - Soap too harsh, or lye, rots it. That is the cleanser `damages`
     rule cleanliness ships, with `protein` as the fibre tag.
9. **Weaving and dyeing** ride textiles unchanged; the protein fibre takes
   the saturated colours wool does.

## Lens hooks

- **1 pedagogy.** Protein vs cellulose, read through every downstream
  act. Filament vs staple, and why it prices the cloth. Insect husbandry.
  ⭐ **Pébrine**: the silkworm disease Pasteur worked on from 1865, which
  he beat by microscopy, by examining the moths and destroying the graine
  of infected ones. It is germ theory again (cleanliness's tiers are the
  first lesson) and an epoch hook for the microscope: an infection carried
  in the egg, which you can only screen out by looking.
- **2 creative expression.** A second silk venue is rows. Wild silks
  (tussah — tan, coarse, from a different worm on a different tree) are a
  varietal row: a second species, the same chain.
- **3a immersion.** The luxury cloth now has a cost a player can see:
  a month of feeding, and the moths you let live. **3b participation.**
  It opens jobs for a rearer, a reeler, a throwster and a silk mercer,
  and gives the doorman's dress code its most legible garment.
- **5 continuity.** Artificial silk (rayon, 1890s) and nylon (1930s) are
  the later epochs, entering through textiles' seam 2 (the material),
  exactly as Perkin's dyes do.
- **6 economy.** It produces cloth that is worth far more per kilogram
  than linen or wool, so it travels. It consumes leaf, labour, fuel
  (stifling, reeling water) and soap. The demand is there first: cloth
  people dress in to be seen, which the doorman reads.

## What it rides (so the build is small where it can be)

| need | shipped substrate |
|---|---|
| the tray as one living body | apiculture's colony-as-organism (`ColonyMixin`'s shape) |
| the leaf crop on a rotation | forestry's coppice `Panel` / husbandry's growth model |
| the hatch timed to the season | taps' `TapWindowSpec` (`photoperiod`, `rising`) |
| stifling by heat | the oven/burner heat hold (`fire … for`, rubber's build) |
| reeling as a stage | textiles' `prepare` stage — a `MaturationProfile` over a new material |
| degumming | cleanliness's soap and its `damages` rule |
| the disease | `ContaminableMixin`'s event-seeded population (a pathogen row) |
| colour | textiles' dye chemistry on the `protein` tag |

## Open

1. **The tray, or the worm?** The colony precedent says the tray. Check
   whether anything ever needs one worm (the pébrine screen examines
   individual moths).
2. **Where the mulberry stands, and the climate.** The white mulberry is
   warm-temperate. Which locality has the season for it? Hollow Mere
   (58° S) does not. It may want a new venue, in which case the realm's
   geography decides.
3. **Spun silk:** in this build or later. It is the use for every pierced
   cocoon, so without it the emerge choice has a cost and no product.
4. **The throwster's mill:** hand throwing first, the mill as an epoch
   step?
5. **Who sells it:** a silk mercer, or the tailor's counter.
6. **Cleanliness's dropped case.** The laundress who ruins a silk blouse
   (cleanliness drive step 18) was moved onto wool for lack of silk. When
   silk ships, add the silk case back as a drive line.
