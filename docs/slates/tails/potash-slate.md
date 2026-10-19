# Potash — big ash and little ash

> **Status: UNBUILT** · opened 2026-10-18 from the cleanliness MR's ash lens
> pass (!380), **designed the same day** with the founder. Little ash ships
> with cleanliness (a grate's `ashKg`, `sweep`, the lye hopper and the glass
> flux competing by tag).
> **Left:** the heap at scale — the burn at the clamp's open draught (`burn`,
> an alias of `char`), yield and strength from the fuel, rain spoiling open
> ash · the leach with derived lye strength, the egg test, caustic lye with
> lime · the boil as the third `evaporative` profile, the pot cake, pearl
> ash · the ash-burner at Hanging Wood and the ashery at Wharfside, the
> ash-man · the kelp burn on the shore · the `flux` / `stabilizer` role
> vocabulary · big ash as a burnt `Wood`'s derived ash layer (designed,
> gathering foraging-shaped)
> **Size:** a tail (of fire + forestry + cleanliness + glass)

**Sits on:** [mining.md](../../subsystems/mining.md) § the clamp (`trade-fuel`) ·
[maturation.md](../../subsystems/maturation.md) § `evaporative` ·
[mould.md](../../subsystems/mould.md) · [glass.md](../../subsystems/glass.md) ·
[forestry.md](../../subsystems/forestry.md) · [fire.md](../../subsystems/fire.md) ·
[soil.md](../../subsystems/soil.md) · [instrumentation.md](../../subsystems/instrumentation.md) ·
cleanliness (this MR).

⚠ **Vocabulary**: *ash* is also a tree (forestry's `ash-standard`). Write
**wood ash** and **the ash tree**, never bare *ash*.

---

## What shipped (cleanliness, !380)

Little ash only. A wood fire accrues `ashKg += kg burnt × ashFraction` in its
grate (`Burner`; oak 0.01, pine 0.005; coal and charcoal leave none).
`sweep <hearth>` without a flue brush rakes it out as
`/trade/fuel/thing/wood-ash`, **made from the hearth** — so it is the
hearth owner's, and raking a stranger's grate is the ordinary taking case. A
deep ash bed **chokes the draught** (`fire.ash.choke*`, as a share of the
burner's own capacity), so a grate nobody rakes burns worse and says so. Two
sinks compete for it by tag `potash`: the chandlery's lye hopper
(0.3 kg/L) and the glass batch's flux — the glass demand was there first.

## ⭐ The requirement (founder, 2026-10-18)

**The potash design must accommodate BIG ash and LITTLE ash both** — one
material, one set of roles, one set of sinks; the sources differ only in
WHERE the ash is and HOW you get it. And then: *"the main application we
want to implement this build is actually the middle one, ash production at
scale with forestry as an input, more like glassmaking and sand
excavation."*

## 1. Three sources **[DECIDED]**

| source | what | mechanism | in this build |
|---|---|---|---|
| **the grate** | little ash, a hearth's by-product | shipped | ✅ shipped |
| **⭐ the heap** | the ash-burner's deliberate burn of bought or felled wood | the clamp at the open draught (§ 2) | ⭐ **the build** |
| **burnt ground** | big ash, the aftermath of a fire that took the stand where it stood | a ground state (§ 7) | designed and recorded |

**Did people set wildfires for ash? No.** Deliberate burning was
controlled — the ash-burner (*Aschenbrenner*) and the clearing settler
burned felled wood **in heaps or pits**, giving concentrated, high-grade ash
(settlers' ash was often their first cash crop). Wildfire ash was never a
potash source at scale: millimetres over the ground, mixed with soil and
char, ruined by the first heavy rains. So **big ash behaves like foraging,
not an RGO** — and foraging is not designed yet.

⭐ **The arithmetic is the lesson**: hardwood leaves ~1 % of its mass as ash
and that ash is ~10–20 % potash, so **a tonne of oak gives ~10 kg of ash and
~1 kg of potash.** That is why forest glasshouses (*Waldglas*) moved through
the woods consuming them, and why clearing the American colonies made them
the world's potash exporter (the first U.S. patent, 1790, was a potash
process). Big ash is the forest converted.

## 2. The burn — the clamp's other end **[DECIDED]**

`trade-fuel` already says it (mining.md § the clamp): *"the judgment is the
draught: **too much air and the charge burns through to ash**, too little
and it never carbonises… it runs for a game-day and is read at the end."*
⭐ **The ash-burner's product is the collier's failure mode.**

- **One craft; the draught decides what stays** — starve it for charcoal,
  open it for white ash, between for brands or grey ash full of char. The
  heap is an open **ash pit** row on the clamp's shape (`CharcoalPit`
  composes `BurnerMixin`). The fire build's complete/incomplete combustion
  (D5) is the physics.
- ⭐ **Read at the end of a game-day**, so fire's *an unwatched fire
  freezes* does not bite: light it and come back; you can still lose a
  whole burn.
- **`burn` is an alias of `char`** (the verb ladder's first rung — *`grind`
  rides `mill`*): one act, a word for each end of the draught.
- **Yield = mass × the fuel's ash fraction, by PART**: ⭐ bark, twigs and
  leaves carry several times heartwood's ash, so forestry's **brash and
  stumps — today's waste — are the richest feed per kilo**. Bracken and
  straw were major potash sources (bracken-burning for glass and soap was an
  upland trade), so the moor's bracken is a feedstock once it is a row.
- **Strength is the fuel's alkali share, carried on the ash** — the
  `wood-ash` good carries its potash strength from what burnt (beech strong,
  pine weak, a mixed heap the mass-weighted mix). *Why the soapmaker wants
  beech ash and not pine* is the lesson.
- ⭐ **Rain spoils open ash** — an open heap burns badly in the rain and its
  ash leaches as it lies (§ 7's rule); burn in dry weather and get it under
  cover. Why an ashery has a roofed ash-house.

## 3. The leach **[DECIDED]**

The chandlery hopper's fixed 0.3 kg/L becomes **derived**:

- **lye strength = ash strength × ash-to-water ratio × passes** — asheries
  concentrated by running lye back through fresh ash;
- ⭐ **water hardness wastes the alkali** — soapmakers leached with
  **rainwater**; the Kestrel row is hard (12 dGH), so lye made from river
  water is weaker and the ashery keeps a rain cistern;
- ⭐ **the egg test** — float a fresh egg; a coin-sized patch showing means
  strong enough for soap — a **`Reading` row** (a hydrometer the later rung;
  competence sharpens it);
- **lye is caustic** — a harm route on the chemical channel (materials-
  response does vitriol and lime); rubber gloves answer it, leather
  corrodes;
- **⭐ caustic lye** — slaked lime + potash lye gives caustic lye strong
  enough for hard soap; lime ships from the quarry, so it is one more
  `chemical` step and the soapmaker's reason to buy lime;
- **spent ash** is a by-product — still carries lime and minerals, spread on
  fields historically; a soil amendment waiting on soil's mineral reserves.

## 4. The boil, and calcining **[DECIDED]**

⚠ Corrected in the session: evaporation is **not** new substrate. Maturation
ships the **`evaporative`** mechanism with two consumers — brine (the
saltern, by sun) and sap (the sugarhouse, by the arch) — and *"before
designing a mechanism, look for the shipped one with a different
feedstock."*

- **Lye is the third `evaporative` profile**, fire-heated like sap, its
  `productFraction` from the lye's strength. ⭐ The energy is the lesson:
  evaporating a kilo of water takes ~2.26 MJ, so **weak lye burns a lot of
  firewood** — the arch's budget, already shipped.
- ⭐ **The pot is a mould** — *"the container decides the shape of what sets
  in it"* — so the black salts set as a cake in the iron pot: literally *pot
  ash*.
- ⭐ **The boiling fires' own little ash goes back into the leach** — a
  closed loop.
- **Calcining** — bake the cake at red heat in the kiln (`fire`, shipped
  with glass): organics burn off, black salts become **pearl ash** — white,
  purer, the premium grade.
- **Grade end to end**: species → burn completeness → leach → raw potash or
  pearl ash. Soap takes either; ⚠ glass preferring pearl ash for a clean
  batch is a **LEAN** until checked against how the glass batch reads purity
  (its colour is iron by Beer–Lambert; do not claim an impurity effect it
  does not model).

## 5. Sinks **[DECIDED]**

| sink | what potash does | |
|---|---|---|
| **glass** | the flux | ✅ shipped; demand first |
| **soap** | lye + fat | ✅ the chandlery and this MR's cleansers |
| **caustic lye** | with slaked lime, for hard soap | ✅ **in this build** |
| bucking | laundry: lye through packed linen | cleanliness's, when it wants it |
| dyeing | the woad and indigo vat needs an alkali | a hook for the dye trade |
| glazes | ash glaze | waits on pottery (the moulding slate puts it after brick) |
| fertilizer | potassium for the field | waits on **soil's potassium reserve** (§ 7) |
| saltpetre | nitre-earth leached through wood ash | a hook for a powder epoch |

**Competition is the markets doctrine**: glass and soap bid on the same line
(*dealing is a bid on a line of any counter*), and **imports set the
ceiling** per commodity per town — a realm with no ash-burners still sees
potash at the import price; colonial potash was an export good for this
reason.

## 6. The venues, and the ash-man **[DECIDED]**

The content picks them: **Rejection's Hanging Wood already has the
glasshouse** (forest glass) beside the fuel yard's clamp, and **Wharfside
has the chandlery**. `/trade/potash`, rows only if the mechanics hold (the
glass precedent).

- **The ash-burner at Hanging Wood** — the clamp at the open draught, fed
  with the wood's brash and stumps and cordwood from the fellers; the
  glasshouse next door is the natural buyer. Burning on someone's wood needs
  their leave (the owner's slash; the smoke a nuisance) — lens 7, a
  criterion, nothing to build.
- **The ashery at Wharfside** — buys ash, leaches, boils, calcines, sells
  potash and pearl ash; an employment venue whose counter **buys `wood-ash`
  by line** (*the house buys*). Its boiling fires feed its leach.
- ⭐ **The ash-man** collects hearth ash door to door — little ash is its
  hearth owner's, so he *buys* it: every city hearth, the bar's grate, the
  bakery's oven. A round for a player or a brain for an NPC, and selling your
  swept ash to him is the first act of the chain any player can take.
  ⚠ **His arithmetic is thin** — a city hearth leaves 0.1–0.2 kg of ash a
  day, a fifty-hearth round 5–10 kg, about a kilo of potash. Ash-men were
  poor; **the drive must show it as a living or name it a supplement.**
- ⭐ **Potash is the Kestrel's first downstream freight** — made at the
  headwaters, wanted at the confluence; downstream is cheap. This answers
  [river-slate](../builds/river-slate.md)'s lens-6 gap (*nothing along the
  Kestrel needs carrying yet*).

## 7. Big ash — burnt ground **[DECIDED]**, designed for later

*"I don't propose we implement wildfires but we can talk about their
aftermath as if they're fully designed, and the burned forest can be
authored content where the ash comes from."* Map-scale wildfire is on
fire.md's deferred list and an unwatched fire freezes, so:

- **"Burnt" is a state of a `Wood`'s ground** — a date and a severity. An
  author writes it now; **wildfire will write the same state** when it ships,
  and the fire tick need know nothing about potash.
- **The ash layer is derived, never authored**: the stand's biomass
  (forestry knows the timber volume) × wood's ash fraction × severity,
  ⭐ **leached by cumulative rain since the burn** — the same precipitation
  integral soil and rivers use; the first heavy rains decide what remains.
- ⭐ **Where the leached potash goes**: into **the soil**, which needs a
  **potassium reserve** it does not have (soil's four are moisture, nitrogen,
  organic matter, structure — *unmodelled is not zero*; a burn really does
  fertilize, which is why swidden works), and into **the water** — a burnt
  catchment's runoff is alkaline and turbid, and post-fire fish kills are
  real.
- **Gathering is the ground protocol** (extraction's `dig`/`split`),
  **foraging-shaped**: what lies on ground, taken until gone; low grade
  (mixed with soil and char), falling with the rain — why the glasshouse pays
  an ash-burner rather than sweeping a burnt hillside.
- **The aftermath as a foraging site**, recorded as hooks: **fire morels**
  (fruiting the spring after), **salvage timber** (fire-killed boles sound
  for a year or two until beetles and stain — possibly a small forestry row,
  since `fell` works on a standing bole), char lying about, **fireweed** and
  its honey.

## 8. Soda — the continuity **[DECIDED]**

| source | what | here |
|---|---|---|
| **kelp and glasswort ash** | seaweed or salt-marsh plants burned on the shore (the Scottish kelp boom, Spanish *barilla*) | ⭐ **in this build** — the same burn with **wrack** as feedstock; [underwater-slate](../builds/underwater-slate.md) § 13's strandline is the kelp-burner's input |
| natron | mineral soda from dried lake beds | a deposit hook for a desert realm |
| Leblanc (1791) | salt + sulphuric acid + limestone + coal | industrial; its acid gas killed the countryside and Britain's **Alkali Act (1863)** made the first pollution inspectorate — lens 4 and 7 for that epoch |
| Solvay (1860s) | the ammonia process | the epoch after |

⭐ **Not interchangeable everywhere, by chemistry**: in glass both are flux
(Venetian *cristallo* used soda ash, forest glass potash); in soap **soda
gives hard soap and potash soft** — sodium soaps set, potassium soaps stay
soft — so the soapmaker's choice of alkali is real.

**Roles are material TAGS — no new mechanism.** A recipe slot's `category:`
matches a tag on the input's material (crafting.md, *match input slots* —
one rule for the bar and the glass batch alike), so a material carrying
several tags IS role membership and a slot asking for a family tag IS "any
member". The shipped sweetener vocabulary is the precedent (crafting.md: the
family tag `sweetener` exists and, by design, *gates nothing*). Here the
family SHOULD be slottable, because glassmakers really did substitute soda
for potash: potash, soda and pearl ash carry **`flux`** and the batch's flux
slot asks for `flux`. ⚠ The batch slots **lime on `alkali`** (`quicklime` is
tagged `alkali`), but in glass lime is the **stabilizer**, not the flux — so
lime's slot moves to **`stabilizer`**: a small row change in this build. In
soap the specific alkali decides the product.

## 9. Shared with sugar

The sugar build (its [requirements](../../requirements/sugar-requirements.md),
a draft to be talked through in its own session) shares: **the boil** (brine,
sap, lye and cane juice — four `evaporative` profiles of one mechanism) ·
**the set** (the pot cake here; the conical sugar-loaf mould that **drains**
its molasses there, the mould subsystem's draining shape) · ⭐ **the fuel
loop** (bagasse fuels the sugar boil, and **its ash is little ash** for the
ashery — cane-mill ash went back on the fields) · **lime** (causticizing
here, tempering the juice there) · **grade by sequence** (raw → pearl here;
first boiling white → later darker there).

## 10. The lens pass (2026-10-18)

1. **Pedagogy** — complete vs incomplete combustion; the tonne-to-kilo
   arithmetic; bark and twigs richer than heartwood; hardness; latent heat;
   causticizing; soda hard vs potash soft; rain leaching. The egg test makes
   strength readable.
2. **Expression** — the ordinary case is rows (an ash pit at any wood, kelp
   burning on any shore, a second ashery); personalization from supply-chain
   depth (soap from your own beech ash).
3. **Immersion** — smoke, white ash, black cakes. **Participation** — the
   ash-burner, the ash-man, the ashery's hands, the kelp-burner, the
   soapmaker; ⭐ *can the polity do something we didn't want?* — **burn a
   forest for its ash and sell the potash**, with forestry's regrowth the only
   recharge.
4. **Values** — ⚠ forest glass consumed Europe's woods; colonial potash came
   from clearing; ⚠ **the kelp boom drove the Highland Clearances** (tenants
   moved to the coast to burn kelp for the landlord); Leblanc poisoned its
   neighbours. *A forest or a glasshouse* has no right answer — lens 4 and
   the accountability ledger, never an engine rule.
5. **Continuity** — ash → soda → Leblanc → Solvay fill the same roles;
   `burn` rides `char`.
6. **Economy** — demand first (glass, soap); consumes wood waste, lime,
   firewood, rainwater; produces potash, pearl ash, spent ash; imports set
   the ceiling. ⚠ The weak point is the ash-man's arithmetic (§ 6).
7. **Governance** — leave to burn on another's wood; **smoke as a nuisance**
   ordinance; later a pollution inspectorate for alkali works.

**Altitude** — *invariant*: one material and one set of roles whatever the
source; the draught decides what stays. *Grain*: ash fractions, the egg
test's threshold, the leach rate. *Title*: Hanging Wood's ash-burner,
Wharfside's ashery.

## 11. Open

1. Where the per-part ash fraction lives — the wood material row, or the
   part (bark, brash) as its own material.
2. Whether the role vocabulary (`flux` / `stabilizer`) is this build's or
   the glass trade's to own, given this build edits the glass batch rows.
3. The ash-man as a player job, an NPC brain, or both from the first build.
