# Metallurgy — requirements

**Kind:** feature
**Leads from:** content — the iron rung of the metal chain, expressed at
Rejection, with a small and load-bearing kernel footprint (the combat
delivery fold, and a per-instance carbon fraction on metal stock).

Stage A of the [metal chain](../slates/builds/metal-chain-slate.md)
closed the **copper** faucet and left every other one open. The general
store still sells iron ingots from nowhere; the game's eleven arms and
six armor templates are made of steel and bronze, neither of which
anybody can produce; and the chain that ships is rigorous for four hops
and then throws its own result away.

This build is the **iron and steel rung**: ore out of the deposit's
distal fringe, reduced in a bloomery, consolidated at the anvil, and
carried through to a blade whose metal is the metal you made. It ends
the metal-import era outright.

⭐⭐ **The thesis, stated once:** the chain today is **connected as mass
and disconnected as kind.** `Deposit.sampleAt` → `hew` → `Ore.grade` →
`metalFractionOf` → the smelt's yield is four hops of honest arithmetic
with no authored constant anywhere in it — and then the pour clones a
flat ingot row and stamps nothing but weight. A lean charge and a rich
charge make *the same kind of bar*, differing only in how many kilograms
of it there are.

Iron and steel are the pair that force the issue, because **they differ
only by a fraction**. A chain that cannot carry a fraction past the
furnace cannot express them at all. "Add iron" is the surface; making
the metal you made be the metal you get is the substance.

---

## What already exists

Surveyed 2026-09-15 against merged master, because the seeding slate was
written before Stage A shipped and several of its assumptions have since
become either true or false.

### The chain, as built

**Rigorous, and genuinely good, up to the furnace tap.**
`Deposit.sampleAt(at, seed)` is one resolved read folding authored pin
over authored lean over procedural value, and returns a shape in which
an authored pocket and a computed cell are indistinguishable.
`HewController` stamps `lump.setGrade(grade)` at the face. `Ore` is
`Stackable` with a `grade` fraction that pools mass-weighted on merge
and carries onto a split sample. The smelt's yield is
`Σ (lot mass × lot grade × the mineral's metal fraction)` — nobody
authors kilograms-out.

**Then it stops.** The pour clones the hardcoded
`/trade/smelting/thing/copper-ingot` and calls `setMass`. No grade, no
composition, no purity — and `Ingot` has no field to receive one.
`SmeltController` is copper-hardcoded three ways (metal path, ingot row,
and the melting-point gate) and cannot express another metal as written.

### The geology

The **only** `Deposit` row in the repo is Rejection's `ferrow.yaml`:
slate to −60 m over granite, `waterTable: -45`, one lode (strike 41°,
dip 62°, thickness 12 m, extents 180 × 90), two depth bands — malachite
to −45 at mean grade 0.07, chalcopyrite below it — one depletion box at
scale 0.55 covering ±60 m and z 0→−30 (*"the old men had this ground
first, and they were not stupid"*), and one feature pin.

⚠ **There is no lateral term in the model.** `bandAt(z)` takes only
depth; lateral distance appears solely as an extent cutoff in
`isInLode`. A cell is either in the lode with the depth band's mineral,
or **barren**. The distal fringe cannot be expressed today.

⚠ **There is no iron ore in the game.** Hematite, magnetite, siderite,
goethite and bog iron appear only in slate documents, never in a content
row. The repo's entire mineral roster is malachite, chalcopyrite, quartz
and farming's marl. Iron and steel exist as *materials* with no path
from the ground.

### The mine's room

The authored workings are a **30-metre stub** at z = −1 (−10 m) on one
line, against a lode 360 m along strike and 180 m down dip, and sit
**35 m clear of the water table**. Lateral ground at adit level is
barren, unbuilt and unclaimed in every direction, and the depletion box
stops at ±60 m.

### The crafting surface

The by-hand ladder is `heat` → `hammer` → `quench`, where `heat` is a
platform verb conferred by `FurnaceMixin` and the other three are
smithing's. `hammer` banks the workpiece into a build buffer,
idempotently, and wears the striking tool. **`quench` is the terminal
mint**, not a heat treatment: it reverse-matches the buffer against the
whole catalogue and mints.

⭐⭐ **The selection rule is already a judgment mechanic** — *"the work
determines the form: the most heat-demanding satisfied recipe wins."*
One ferrous item worked at 700 K draws a fire poker; the same item at
1400 K with the bellows draws a belt knife. Heat already decides what
you get, with a shipped test pinning it.

`forge` is the earned one-shot behind the deed gate: a claim comes from
reading or watching, the deed only from your own first faithful by-hand
build. Off-spec builds still mint matter — a re-meltable `Casting` with
no maker's mark — conserving material and mass.

Grade is the **weakest link** across inputs, raised by a tool's control
floor. Maker competence is **inert by design**: `deriveAtFixedControl`'s
`_control` parameter is the declared deferred skill seam.

### The demand side

**17 arms and armor templates ship; three are makeable.** The nine
`steel-*` rows and the plate and mail armor have no recipe, no price and
no shop — they exist only as props in the newbie wilds. Every mechanical
figure on them derives (*"byte-identical to the steel arming sword's,
because those derive from mass × length × form, never from what it's
made of"*) — but each hardcodes `_materialPath: alloy/steel`, while the
two forgeable rows carry no material at all and explain why.

### The economy

**The Terminus general store's iron ingot at price 5 is the only metal
item sold anywhere in the game.** Rejection's four businesses carry
positions and wages and no prices; its assay counter is a consignment
shelf where the seller sets the ask; charcoal has no price anywhere and
is made, never bought. Hearthworks sells *work* — a menu of five recipes
and a repair tariff — and buys nothing.

### Where material bites, and where it does not

`materialHeight(material, channel)` normalizes hardness and toughness
against steel (600 / 200) and is read for real by armor's `attenuate`,
folded outside-in through the covering stack. On the weapon side it is
**deliberately excluded** — delivery folds grade band × condition only,
documented in two places as a balance decision. So material currently
matters for **defence and not offence**.

⚠ And `copper.yaml` and `carbon.yaml` author **no hardness or toughness
at all**, so the copper the entire shipped chain produces is
mechanically unmodelled.

### Therefore what is genuinely new here is

1. **Lateral zonation** — the deposit learning that *where* you are in
   the body decides what mineral you find, not just how deep.
2. **A carbon fraction that survives the furnace** — the fix for the
   chain flattening at the ingot, and the only way iron and steel can be
   different things.
3. **A reduction that does not melt** — the bloomery, and therefore a
   bloom that must be worked before it is anything.
4. **Material mattering in a blow** — retiring the documented
   offence/defence asymmetry.

Everything else this build ships is content riding shipped machinery:
ore rows, recipes, prose, and the removal of one shelf line.

---

## Goals

- **Iron comes out of the ground.** A player can find, stake, hew, haul
  and sell iron ore at Rejection without the co-op's leave.
- **The deposit answers laterally.** Mineralization varies with position
  in the body, not only with depth — copper at the heart of the lode,
  iron out at its lean edges, and ground outside the lode is no longer
  uniformly barren.
- **The smelt derives what it made, not only how much.** The charge
  decides the product: the ore's mineral, the fuel ratio and the heat
  together determine whether you tap a bloom, a steel, or a cast.
- **Carbon is carried on the metal.** A bar knows what it is, the way a
  lump of ore knows its grade, and every downstream reader can ask.
- **A bloom is not a bar.** Solid-state reduction yields a spongy mass
  that must be worked hot before it is anything — and working it loses
  mass, because what is being squeezed out is slag.
- **Steel is a band you hit, and cast iron is what you get when you
  miss** — hard, brittle, unforgeable, and useful for something else.
- **The blade is made of the metal you made.** An arms or armor recipe's
  output takes its material from the stock it was forged from, and the
  row does not lie about it.
- **Material matters in a blow.** The offence/defence asymmetry is
  retired: what a weapon is made of changes what it delivers.
- **The metal-import era ends.** No shelf anywhere sells metal that came
  from nowhere.
- **Supply does not depend on who is logged in.** The fringe has a
  producer that works on a quiet night.

## Non-goals

- **Sulfide copper and roasting** → metal-chain **Stage B**. Chalcopyrite
  is authored, below the water table, and stays unreachable.
- **Tin, bronze production, and a `bronze-breastplate` recipe** →
  metal-chain **Stage C**. The row stays authored, correct and
  unmakeable, on the `leather-jerkin` precedent: *"a better state than
  being makeable in the wrong shop."*
- **Shaft, hoist, pump, drainage commons, the toll, the district** →
  **Stage B**. This build stays entirely above the water table.
- **Maker competence affecting grade** → the **crafting skill wave**,
  which `crafting.md` already declares as its next. Grade stays
  weakest-link; `_control` stays inert.
- **Stock forms** — bar, rod, sheet, wire, nails → **deferred**, per the
  metal-chain slate's own ruling: they multiply recipe count without
  adding rungs. Revisit when something needs sheet specifically.
- **Domestic and building metal** — locks, lamps, pots, hinges →
  **demand class C**, riding residences.
- **Non-ferrous arms and armor** — padded gambeson, hide jerkin, leather
  boots, leather whip, oak waster → **trade-tailoring's own wave**. The
  gambeson is a tailoring recipe, not a smithing one, and hide still has
  no producer.
- **A separate blast-furnace structure** → **nowhere, deliberately.**
  Cast iron is the existing furnace over-charged and over-blown, which is
  what makes it a mistake you can make rather than a building you must
  own.
- **Alloy steels** — stainless, tool steel → **nowhere, deliberately.**
  `steel.yaml`'s own comment already calls them content extensions.
- **High-grading as an offence** → **Stage B**; it needs an adjudicator.
- **Pricing discovery and a real market** → **parked**, the
  platform-economy thread. Seeded prices only.

---

## Placement

| what | pack | root |
|---|---|---|
| iron minerals | `base-library` | `/stuff/idea/material/mineral/` — beside malachite and chalcopyrite |
| copper + carbon mechanical numbers | `base-library` | the existing element rows |
| lateral zonation | `trade-mining` | the `Deposit` model |
| the fringe's own zonation data | `rejection` | the venue's `ferrow.yaml` — **this deposit's** facts |
| the bloomery, carbon, carburizing | `trade-smelting` | the line between the trades **is the furnace** |
| consolidation and the arms recipes | `trade-smithing` | anvil work |
| arms and armor templates | `generic-objects` | already there; edited in place |
| the delivery fold | **kernel** | combat's own |
| a per-instance carbon fraction on metal stock | **kernel** | `Ingot` is a platform class |

⭐ **The second-instance test passes.** A second iron district is a second
locality pack over the same three trades: it authors a `Deposit` row with
its own zonation and needs **zero** pack code. The fringe's numbers are
Rejection's; the *idea* that a body zones laterally is mining's.

---

## Collisions

**Terminus general store** — the `iron-ingot` shelf line is the faucet
this build closes. Its own header says *"the store sells inputs; the
Hearthworks is a teaching venue"*, which stops being true.

**Hearthworks** — props two free iron ingots on the smithy floor. These
**stay**: it is a teaching venue, the props are bounded to one room, and
a tutorial handing you your first bar is not the metal-import era. Its
menu (poker 4 · cook-pot 8 · hammer 12 · belt-knife 15 · jerkin 18) and
its repair tariff are untouched, but its *inputs* now have a real
provenance for the first time.

**Newbie wilds** — `crossroads/hollow.yaml` and `treeline.yaml` place
loose weapons as props by path. Renaming the arms rows moves these
references.

**`generic-objects` arms and armor** — nine rows edited (material
dropped, row renamed). Shared content; no other pack's code reads the
paths, but the two newbie-wilds rooms do.

**Rejection's depletion box** — covers ±60 m at scale 0.55. The fringe
must sit **outside** it, which is both mechanically necessary and
narratively right: you walk further than the old men bothered to.

**Rejection's claim block** — `from: [-4,-4,-3] to: [0,0,-1]`. The fringe
is well outside it and stays outside it.

**The `delves` brain and the hewer NPC** (`ask: 9` per lot) — the fringe
needs its own producer, and it must be an **independent on open ground**,
not a co-op position, or the fiction and the title disagree.

**`SmeltController`** — copper-hardcoded three ways; every iron path goes
through it.

**Every existing fight** — retiring the delivery asymmetry moves numbers
that no metallurgy content touches. This is the build's largest
non-obvious blast radius and is called out again under Acceptance.

---

## Surface decisions

### Iron lives at the distal fringe **[user's call]**

Lean ground at the lateral edges of the body — which is the slate's own
parked answer, and which explains why independents scratch at the claim
field while the co-op does not.

The reasoning that makes it more than placement: **the ore is lean but
the mineral is rich, and the ground is vast.** An iron mineral is most
of the way to iron by mass where a copper carbonate is barely half; what
makes iron *cheap* is not that any particular rock is good but that
acceptable rock is **everywhere and unclaimed**. That is the historical
fact the slate already names — *"iron ore genuinely is everywhere, which
is why iron ended the palace economies and armed everyone"* — and the
economy now embodies it rather than asserting it.

### The fringe is open ground **[user's call]**

No authored parcel over it. An independent may stake and work iron owing
the co-op nothing, exactly as an adit-level claim-holder already owes
them nothing.

⭐ **This is the build's pedagogical spine, and it is economic, not
narrative.** The co-op holds the rich, scarce, deep metal. Iron is the
one you can get without them. The lesson that the abundant metal breaks
the scarce metal's grip is not told to anybody — it is what the map does.

### Cast iron ships **[user's call — pedagogy chose it]**

Lens 1 picks it: a band cannot be taught with one pole. Over-charge the
furnace with fuel and blow it hard, the iron takes up carbon, its melting
point **drops**, and it runs liquid. What you own is hard, brittle and
**unforgeable** — not an error message, a different substance with a
different use.

And it rides the rule that already ships. *"The work determines the
form"* already means heat decides what you get; carbon is a second axis
on a live dial, not a new mechanism.

### Carbon is a number on the object **[user's call]**

`Material` is singleton-by-templatePath — its own docstring says
*"per-object variation lives elsewhere."* So carbon carries exactly the
way ore already solved the identical problem: **the row says what kind of
metal, the object says how yours came out.**

The alternative — three material rows — can express the rungs but has
nowhere to put *how well you hit the band*, which is the only thing that
makes the smelt a judgment instead of a recipe.

### The charge decides the product, and nobody names a recipe

`smelt` already derives its yield from the charge rather than from an
authored constant; the `smelt-copper` row exists *"so it sits on the
ladder where a learner can find it"*, not to select anything. That
extends: the **ore's mineral, the ore-to-fuel ratio, and the heat**
together decide whether you tap a bloom, a steel or a cast.

⭐ Steel being the hardest of the three to hit on purpose is not a
difficulty dial. It is what the chemistry says, and it is why history
took three thousand years to do it reliably.

### Material matters in a blow **[user's call]**

The documented offence/defence asymmetry is retired. What a weapon is
made of changes what it delivers, as it already changes what armor turns.

⚠ **Scoped honestly:** this moves numbers in every existing fight, in
content this build never touches. It also **promotes a cosmetic gap to a
blocking one** — copper and carbon author no hardness or toughness, and
once height folds into delivery a copper weapon falls to the structural
floor. Those rows must be completed here.

### The arms rows are de-materialized and renamed **[user's call]**

Nine rows drop their hardcoded `_materialPath` so material flows from the
stock at forge time, and `steel-sword` becomes `sword`.

**A sword is a sword; what it is made of is a fact about the instance.**
Identical in shape to the ruling ore already carries — grade lives on the
lump, not on the material — and to the `Stackable` rename's lesson that a
row named after one of its cases misleads every author who reads it.

### The iron shelf is deleted **[user's call]**

Not converted, not supplied over a logistics leg. The shelf **was** the
metal-import era and the era ends. Metal now exists where it is made, and
somebody carrying it is a real player need rather than a convenience —
which is the haulage demand the logistics build is waiting for.

### No `metallurgy` Discipline

`smelting` already sits at ISCED-F 0715 and its editorial line —
*"it never changes what the rock held, only whether you get it all
out"* — extends to carbon without strain. A fourth discipline in the gap
between two that already touch is register bloat, and the register's own
rule (*a Discipline is a field of study, not a job title*) does not
require one.

Consolidation credits `smithing`; the furnace acts credit `smelting`;
finding the fringe credits `geology`. All three ship.

### Maker competence stays out

`deriveAtFixedControl`'s `_control` is the declared deferred skill seam.
Lighting it up here would ship the crafting skill wave as a side effect
of a metallurgy build. Carbon is a fact about the metal, not about the
smith's hands.

### Hearthworks keeps its free ingots

Bounded to one room, in a venue whose stated purpose is teaching. A
tutorial is not a faucet.

---

## Lens pass

1. **Pedagogy** — `geology` (reading a body that zones in three
   dimensions), `smelting` (reduction, the carbon band, why steel is
   hard), `smithing` (why a bloom must be consolidated). Derivable end to
   end: melting points, carbon's effect on them, and mass balance are the
   materials' own numbers, and a player who understands them can predict
   every outcome without looking anything up. ⭐ The strongest single
   beat: **carbon lowers iron's melting point**, so the ruined batch is
   the one that ran *easier*.

2. **Expression** — an author adds a metal by authoring a **mineral row
   and a composition**, and a new ore body by authoring a `Deposit` row
   with its own zonation. No class per metal, no code. The bespoke case:
   a venue with a different zonation teaches a different economy using
   the same three trades — which is the second-instance test passing.

3. **Immersion** — thinner than 1 and 2, and recorded as thin. What the
   sim affords without scripting: the fringe is far, unclaimed and
   unremarkable, so finding it is a walk and a reading rather than a
   quest; the smelt's failures are legible and yours; a blade carries its
   maker's mark and its metal, so a weapon has a history somebody can
   read off it. ⚠ **The gap:** nothing yet makes the *social* fact of
   iron visible — that everyone can have it. That wants population, and
   it is the same gap Stage B's commons has.

4. **Values** — the choice forced is **join or go it alone**: the co-op's
   rich copper on wages, or lean iron on your own claim. A second choice
   inside the furnace: care, or speed. Standing is conferred by the
   maker's mark on a made thing and by the honest assay — both shipped.

5. **Epochs** — holds cleanly across all five, which is the sharpest
   argument the design has. Bloomery, blast furnace, Bessemer, basic
   oxygen and electric arc are **the same mechanism at different
   temperatures and blast rates**; only the dynamics change. Carbon
   content is the axis in every era. Magic and future tech attach as
   another way to supply heat or reduce an oxide, never as a different
   model of what metal is.

---

## The drive

Run against a live server before the MR opens.

1. **Arrive at Rejection.** Walk out from the pithead yard. `measure
   strike` at the outcrop — a reading, as today.
2. **Walk out along strike, further than the workings go** — past the old
   men's ground. The rock changes: rust, not green.
3. **`analyze ground`.** The survey card names a different mineral than
   the one at the outcrop, and the reading is honest about being lean.
4. **`stake`** a claim on open ground. It succeeds, and it names nobody
   else's title.
5. **`hew`.** Iron ore in your hands, with a grade stamped from the
   ground. Hew twice more; the lumps pool and the grade mass-weights.
6. **Haul the ore to the smelter.** Charge the furnace with ore and
   charcoal at a modest fuel ratio, work the bellows, and `smelt`.
7. **You tap a bloom** — and the scene says plainly it is spongy and full
   of slag, not a bar. `analyze` it: it reports its carbon, low.
8. **Now get it wrong on purpose.** Charge a second heat heavy on
   charcoal and blow it hard. **You tap a cast** — brittle, high carbon,
   and it tells you it cannot be forged.
9. **Take the bloom to an anvil.** `heat`, `hammer` — the slag comes out
   and the mass **drops**, visibly. `quench` mints a wrought bar.
10. **Forge a blade the long way.** `heat` → `hammer` → `quench` on the
    bar yields a sword, and the deed is minted. `forge sword` now works
    where it declined before.
11. **`analyze weapon` and `analyze response` on the sword.** It is
    **iron**, not steel — and the delivered bands are lower than a steel
    blade's, which they were not before this build.
12. **Make steel.** Carburize wrought iron in the furnace, forge a second
    blade, and `analyze response` it. It reads better than the iron one,
    and the difference is the carbon number.
13. **Quench all three.** Wrought: nothing happens. Steel: it hardens.
    Cast: it cracks.
14. **Go to the Terminus general store and try to buy an ingot.** There
    is none, and there is no metal on any shelf in the game that did not
    come out of ground somebody dug.
15. **Log out for a day of game time, come back.** The fringe's producer
    has worked; there is iron ore on the consignment shelf that no player
    hewed.

---

## Acceptance criteria

Observable from outside the code.

- **A player who has never spoken to the co-op can hold an iron bar they
  made**, having staked, hewed, hauled and smelted it themselves.
- **The ground tells the truth about itself.** Standing at the outcrop
  and standing at the fringe give different minerals from the same
  survey verbs, and neither reading is a roll — two players at one cell
  read the same rock.
- **The same ore charged two ways gives two different metals**, and a
  player can say why before they tap.
- **A bloom cannot be used as a bar.** Some act must consolidate it
  first, and doing so visibly costs mass.
- **Cast iron cannot be forged**, and the refusal says what it is rather
  than that something failed.
- **Two blades forged from different metal perform differently in a
  fight** — not only in `analyze`.
- **No shelf anywhere sells metal with no provenance.** A player who
  walks every shop in the game finds no ingot for sale that did not come
  from an orebody.
- **A player can make a sword** — and eight more arms and armor items
  whose templates have shipped unmakeable since before Stage A.
- **A blade names its own metal honestly.** Forging from iron gives an
  iron weapon, not a steel one wearing an iron name.
- **The realm still produces iron when nobody is logged in.**
- ⚠ **The balance benches are run and the shift is accounted for.**
  Retiring the delivery asymmetry moves every existing weapon's numbers;
  `pnpm test:gym` is the instrument, and its results are reported with
  the MR rather than discovered later.

---

## Cross-references

**Seeding slates**
- [metal-chain-slate.md](../slates/builds/metal-chain-slate.md) — the
  ladder, the carbon table, the Wave A/B recipe scope, the demand-side
  audit
- [mining-slate.md](../slates/builds/mining-slate.md) — the geology
  field, the surveying tiers, the deposit's shape
- [rejection-slate.md](../slates/builds/rejection-slate.md) — the venue

**Subsystem docs**
- [mining.md](../subsystems/mining.md) · [crafting.md](../subsystems/crafting.md)
  · [materials-response.md](../subsystems/materials-response.md)
  · [combat.md](../subsystems/combat.md) · [fire.md](../subsystems/fire.md)
  · [thermal.md](../subsystems/thermal.md)
  · [advancement.md](../subsystems/advancement.md)
  · [retail.md](../subsystems/retail.md)

**Related**
- Stage B and Stage C of the metal chain are named throughout the
  Non-goals and are not otherwise specified here.
