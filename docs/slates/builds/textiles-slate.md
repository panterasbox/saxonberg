# Textiles slate — REDUCED to its unbuilt tail

> **Status: PARTIAL** — the chain shipped 2026-09-03 (MR !236) →
> [textiles.md](../../subsystems/textiles.md)
> **Left:** leatherwork + tanning (blocked on a hide faucet) · wool and
> its left edge — felting, fulling, knitting, scouring (blocked on
> ranching) · cotton and silk · synthetics, mills, mass production ·
> patterned weaving · piece bleaching · player-designable patterns as
> artifacts · livery · the maker's authored garment prose (the
> customization product) · magic garments (a garment as an item host;
> mage-woven as a mark) · hair dye (cosmetics-slate) · individual body
> variance (lineage phase 2) · the tannery's nuisance siting ·
> `DressingMixin.dressingQuality` onto `Soilable` (room-condition)
> **Size:** a build

> ## ⏳ THE UNBUILT TAIL — what this slate still owns
>
> | | blocked on | note |
> |---|---|---|
> | **leatherwork and tanning** | a hide faucet (ranching, or a butchery) | ⭐ Not a scope cut but a DEPENDENCY. `trade-tailoring` already holds the `leather-jerkin` recipe, correct and unmakeable. `cut`/`sew` take hide the day it exists |
> | **wool, and everything on its left edge** | ranching | ⭐ The launch story is *flax gives you woven cloth; wool gives you everything else* — felt, fulling, knitting, and saturated colour, because wool takes a metal mordant directly where cellulose needs tannin. Wool's arrival is a real event, not a second row |
> | **cotton and silk** | nothing | a second cellulose fibre: more content, no new lesson |
> | **synthetics, mills, mass production** | demand | ⭐ The substrate CAN carry them (audited): kevlar needs no new construction form, the tool ladder already starts at rung zero, and a mill is a high `rate` plus a production brain. ⚠⚠ The jenny is what flips the bottleneck, not the wheel — the bench prints the rate it has to beat |
> | **patterned weaving** (stripes, checks) | the loom holding two yarn colours | the yarn-dye stage's payoff, deferred |
> | **piece bleaching** (laying the woven cloth out) | a durative gauge on a discrete object — a mixin, therefore kernel | ⚠ What ships bleaches the FIBRE, which is historically real and narrower than the picture |
> | **player-designable patterns as artifacts** (named, sold, licensed) | — | a pattern here is a Recipe |
> | **magic garments** | — | the machinery composes today; it is content, and magic-items' next wave's |
> | **hair dye** | lineage phase 1's appearance substrate | dyeing here is cloth only |
> | **individual body variance within a species** | lineage phase 2 | ⭐ It feeds an EXISTING seam: fit reads `Creature.getMass()`, so textiles does not re-open |
> | **the tannery's nuisance siting** | leatherwork | ⚠ The textile chain IS the nuisance-trade chain, and the tannery stank worst |

> This slate owns **fibre → cloth → garment**, and the four trades that
> make it: textiles, leatherwork, dyeing, tailoring. It also owns the
> kernel wave that makes a garment a real object instead of a
> description.
>
> It does **not** own searching. The design session found that the
> viewer side of detection is missing an equipment term, and that gap is
> big enough to want its own cycle — see
> [search-slate](../tails/search-slate.md), written alongside this one. Textiles
> builds the *target* half of that seam (a camouflaged cloak is clothing);
> the search slate builds the *viewer* half (a lens is not).
>
> Supersedes nothing. Consumes the **cosmetics slate's** load-bearing
> finding (*dye is a textiles input; cosmetics is a second customer*) and
> discharges four **GAP** rows: `textiles` and `leatherwork` on the
> [trade roster](../tails/trade-roster-slate.md), `barber / tailor` and
> `miller / tanner` in [vocations.md](../../vocations.md).

---

## ⭐⭐⭐ Decision 1 — the chain walks CONSTRUCTION, not material

*Shipped in a different shape: the textile forms are `Fabric` rows
(`/stuff/idea/fabric/*`), not a third `Construction` domain →
[textiles.md § The covering vocabulary](../../subsystems/textiles.md);
grade-as-staple-length and retting's ruin window → textiles.md § The
chain, as it ships.*

## ⭐⭐ Decision 2 — one covering vocabulary, not two

*Shipped — `armor` → `covering` throughout `Construction`, `quilted`
the fifth resist-bearing form → textiles.md § The covering vocabulary.*

## ⭐⭐ Decision 3 — the covering stack resolves PER BODY PART

*Shipped — `coveringAt` / `insulationAt` on the wearer; form sets the
band, wear-order breaks ties → textiles.md § The covering stack,
[thermal.md § Worn insulation](../../subsystems/thermal.md).*

---

## ⭐⭐ Decision 4 — the chain is a DIAMOND, and the packs cut on it

The trade roster already hinted at this: `leatherwork | skill | 0723 |
shares the code with textiles`. Made literal:

```
  trade-farming (EXISTING pack, content only)
    flax · cotton · madder · weld · woad
              │
              ▼
    ┌─── trade-TEXTILES ────┐        ┌── trade-LEATHERWORK ──┐
    │  ret → dress → spin   │        │  hide → tan → leather │
    │  → weave / felt       │        │       (the tannery)   │
    │        → cloth        │        └───────────┬───────────┘
    └───────────┬───────────┘                    │
                └──────────┬─────────────────────┘
                           ▼
                   trade-TAILORING
                    cut → sew → garment
                           ▲
                           │
                    trade-DYEING  ── colour, a customer of BOTH
                                     (and later, of hair)
```

Textiles and leatherwork are **parallel input trades**, not sequential.
Tailoring's `cut`/`sew` take either — one code path, two materials.
Dyeing hangs off the side as a customer of both, with cosmetics arriving
later as a *third*.

**Placement calls:**

- **Tanning lives inside `trade-leatherwork`**, not its own pack — but
  the *tannery* is a zoned nuisance venue, which is the `miller / tanner`
  GAP the vocations register wants.

## ⭐ Decision 5 — a verb per DECISION, not per motion

*Shipped: eight verbs (`scutch` `spin` `weave` · `mordant` `dye` · `cut`
`sew` `alter`), `full` not among them; the rule and the tool ladder →
textiles.md § The chain, as it ships + § The tooling. The `dress`
question closed as `equip set` → textiles.md § The presentation.*

---

## ⭐⭐ Decision 6 — fit, and the `baseMass` find

*Shipped — every species authors `baseMass` + a scalar `stature`; fit
is two derived numbers and one stamp; the lineage seam is
`Creature.getMass()` → [race.md § Size](../../subsystems/race.md),
[embodiment.md § Fit](../../subsystems/embodiment.md), textiles.md § Fit.*

---

## ⭐⭐ Decision 7 — soiling CONSUMES `Soilable`; it does not invent one

*The consumer contract with room-condition (act-deposited, freezes in
absence, no gauge here) and the apron → textiles.md § The soiling seam;
the pack's own decisions → [room-condition-design-pack](./room-condition-design-pack.md).*

### ⚠⚠ Corrected again — "soiled" is TWO concepts wearing one word

*`CraftVessel.soiled` vs `Soilable` → textiles.md § Dye, wash and fade
(last paragraph). The one open item:*

⭐ **`DressingMixin.dressingQuality` is the one that really is a
condition gauge** (*"0 (filthy) .. 1 (clean/sterile)"*), and it should
land on `Soilable` when that ships — giving the medical vertical
*washing your rags before you use them as bandages* for free.

### ⭐⭐ Ship the SEAM, not the mechanism — cooking's pattern, adopted

*Superseded by the code — the pre-registered producer event was
deleted; the seam is the METHOD `outermostAt` → textiles.md § The
soiling seam.*

⚠ **Coordination note:** the room-condition pack now has **two builds
waiting on it** with pre-registered obligations (cooking and textiles).
That is an argument for its priority that neither slate can make alone.

### ⭐ The wash/fade loop still stands

*Shipped — fastness decays per wash → textiles.md § Dye, wash and fade.*

⚠ **Naming.** "Outfit" is **taken** — `farm-outfit.yaml` is a `Business`
(the producer-annex pattern: Business + Stock + a hand with the
`consigns` brain). Only char-gen uses "outfit" in the clothing sense
(`aspirations[].outfit`). A uniform concept must be called **livery**.

---

## ⭐⭐⭐ Decision 8 — a garment's PURPOSE is which channel it intercepts

*Shipped — the governing idea and the apron / lab-coat examples →
textiles.md § The governing idea; hi-vis → the `conspicuous` band;
terrain-matched camouflage → [search-slate](../tails/search-slate.md);
the no-adults-seam decision → textiles.md § What this build
deliberately does not ship.*

---

## Decision 9 — the social half: legibility, one brain, no kernel gauge

*Shipped — legibility rides the `worn` field + the impression line, no
engine gauge from dress to regard, the demonstrator brain is
`trade-tailoring/src/behavior/tailors.ts` → textiles.md § The
presentation + § The social and arcane seams. `livery` did not ship
(see Decision 7's naming note).*

---

## ⭐⭐ Decision 10 — the concealment seam (and where it stops)

*Shipped — `getConcealment()` derives over the covering stack and the
scale gains `conspicuous` as a negative-requirement dial (no rebase) →
[concealment.md § The scale extends DOWNWARD](../../subsystems/concealment.md),
textiles.md § The social and arcane seams. The viewer half stays the
search slate's.*

---

## ⭐⭐ Decision 11 — magic, and the negative result that carries it

*(Added 2026-09-02. Audited against
[arcane-science.md](../../arcane-science.md) and the shipped magic tree.)*

### ⭐⭐⭐ Textiles is the trade where magic is LEAST useful — and that is the point

*Graduated → textiles.md § Magic: magic does not shortcut the
bottleneck, capital does; Kell's Partition applied makes a mage the
same category as the spinning wheel.*

### ⭐ The honest "yes" is PROVENANCE, not physics

`authoring_events` + the `recordAuthoring` gate + `CreditRouting` all
ship, and Decision 9 already makes a garment's facts legible on sight.
So **mage-woven is a MARK** — a claim in the ledger, socially real, worth
a premium, and **forgeable**. A market for authenticity, at the cost of
zero new mechanism, and it lands squarely on the social half this build
already owns.

### ⚠ The one genuine tension — dyeing is chemistry

*"Chemical transformation is real and affordable in small amounts. A
caster can rearrange bonds."* **A mordant is a metal ion chelating a dye
to a fibre** — bond rearrangement at gram scale. So dyeing is the single
step in this chain where `transform` is *scientifically* within budget.

⚠ But `lib/magic/PriceList.ts` prices `transform` **three orders of
magnitude above every other verb**, deliberately, to keep it out of
circulation by arithmetic rather than by a rule somebody must remember.
Whether that blanket price catches a gram-scale mordant fix, when the
science explicitly permits small chemistry, is **unresolved by either
doc**. Open question 16.

### Casting garments — the machinery is complete; garments are an unused host

`ring-of-veil` is the shipped exemplar and already the whole pattern:
`alwaysOn: true`, a sustained binding, *"keeps paying for it out of its
own shell — the standby draw, ~25 days of a 900 kJ charge at 5 W. Taken
off, or run flat, the veil drops."* Kell and Voss, made mechanical.

Every wearable magic item today is **jewelry** (`Ring`, amulet). A
**garment** host needs no new machinery — `Arcane` + the charge economy +
`Wearable` already compose. But two shipped rules bound what one may do:

- ⚠⚠ **Faculty is capacity, NEVER access.** *"If a configured `depth`
  ever gated which spells you can cast, you would have bought
  progression."* **A garment may never unlock a spell.**
- ⚠ **Efficiency is capped at 1.** A garment cannot make a caster better
  than perfect.

Which leaves a narrow honest space: **composure / serenity** (the Reeve
Line — vestments and ritual dress, and psychologically real), **reserve
capacity** (`ReservedMixin`), and **warding** (`MagicSuppression` matches
on grid footprint, so a warded garment blocks by *cell* — genuinely
defensive, and it is the armor analogue on the arcane axis).

### ⭐⭐ The interlock worth building: the hood subsidizes the veil

*Shipped — `attentionFactor()` multiplies a held binding's standby
draw → [magic-items.md § The attention term](../../subsystems/magic-items.md).*

### Which grid cells the trade actually touches

5 verbs × 13 nouns. Textiles' own cells, in rough order of relevance:

| cell | where | note |
|---|---|---|
| `control·water` | retting | the signature process; a durative water state |
| `transform·…` | dyeing | ⚠ the affordable-chemistry band vs the price list — OQ 16 |
| `create·fire` | dye baths, fulling, scouring | ⚠ **impulse only** — a furnace beats it for held heat |
| `perceive·…` | grading staple, judging fastness | the appraisal face |
| `create·light` | fine work — weaving, sewing | ordinary light; no residue |

`control·plant` belongs to farming and `control·beast` to ranching, even
though both feed this chain. **`create·arcana` — enchanting a garment —
is magic-items' business, not this trade's**: the tailor makes the
garment, the artificer binds the working, and keeping those two acts in
two trades is what stops textiles absorbing the enchanting economy.

---

## ⭐⭐⭐ Decision 12 — presentation, and the customization market

*(Added 2026-09-02. The lens-3 pass treated immersion too lightly; this
is the correction, and it re-orders the build.)*

*Shipped — `worn` as a separate projection, the worn-vs-carried card
layout, the impression augmenter, and the UX wave landed first →
textiles.md § The presentation,
[card-surface.md § `worn` vs `contents`](../../subsystems/card-surface.md).*

### ⚠ The market: Fortnite's model is a MINT, and cannot be imported

*Graduated 2026-09-21 → [textiles.md § Why the shape is buyer-side](../../subsystems/textiles.md) (a conserved economy cannot import a skin mint; scarcity + provenance are real here — a garment can mean more than a skin because somebody made it).*

### ⚠⚠ Re-sort the build around the BUYER

*Graduated 2026-09-21 → [textiles.md § Why the shape is buyer-side](../../subsystems/textiles.md) (overwhelmingly buy, not make; dyeing is the customization market's core loop — the domestic trade, rung zero at home; tailoring the professional one).*

### ⭐⭐ The skin economy, done honestly

`DetailedMixin` already ships keyed sub-descriptions on an object. So let
a **maker write the prose for the garment they made**. A tailor does not
sell a coat — they sell a *described* coat, and wearing it puts that
description on your body.

> **You buy the look by buying the object.**

Customization becomes a **product of the supply chain** rather than a
bypass of it. Bespoke fit (Decision 6), a named pattern (open question
10) and authored garment prose are one product line — and the thing a
tailor actually sells that a factory cannot.

⚠ It is also a user-generated-content surface with a moderation
dimension, and it rides the `recordAuthoring` gate. Open question 18.

---

## The four-lens pass (2026-09-02)

Run against the project's four lenses — **pedagogical richness ·
creative expression for content authors · roleplay & immersion ·
gamification & self-improvement**. Seven changes came out of it; all
seven are folded in above and below. Recorded here because the *reasons*
are the tuning targets, and a requirements pass that loses them will
build the mechanism without the lesson.

### Lens 1 · Pedagogy — strong, but one lesson was being left on the table

*Shipped and measured — spin : weave is 6× by hand, 2× with the wheel,
and the wheel does not flip it → textiles.md § Throughput at bed scale;
the fibre's chemistry is a load-bearing `cellulose` tag → textiles.md
§ Dye, wash and fade.*

### Lens 2 · Creative expression — one architectural hole

*The forms hole closed: resist-bearing forms stay a closed kernel
vocabulary, textile forms are `Fabric` rows a pack can add →
textiles.md § The covering vocabulary. Still open:*

⭐ **Patterns are silent, and shouldn't be.** Tailoring cuts to a
*pattern* and the slate never says what one is. A pattern as authored
content — better, as something a **player** can design, name and sell —
is the largest creative-expression opportunity in the build. Open
question 10.

### Lens 3 · Roleplay & immersion — one practical hole

*Shipped — `equip set <name>`, a stanza, zero new verbs → textiles.md
§ The presentation.*

### Lens 4 · Gamification & self-improvement — the thinnest lens

Two genuinely independent progression axes carry it: **competence**
(Discipline bands, earned from evidence) and **capital** (the tool
ladder, which unlocks nothing and only goes faster). Grade propagation
makes mastery *visible* — a master's cloth looks better to everyone.

⚠ **But that is all producer-side.** Most players will wear clothes, not
make them, and the majority gets no named improvement loop.

⭐ **There is one, and it is the best kind — it just needs stating.**
Knowing that wet linen is a heat sink and oiled wool is not is **player
knowledge, not a character stat.** It cannot be granted, bought, or
power-levelled; you learn it by being cold. The design already supports
it completely. Naming it as a goal is what makes it get *tuned* for —
which means the consequences of dressing wrong must be legible enough to
learn from and forgiving enough to survive.

⚠ **And the solvability risk needs its defence written down.** If clo
derives from physics there is a correct outfit for a given biome, and a
wiki will publish it. [lineage-slate](./lineage-slate.md) already answers
this exact shape — *"a wiki can tell you the best body for a given life;
it cannot tell you what your life will be"* — and it transfers verbatim.
⚠ But it is also a **design constraint, not just a comfort**: it only
holds if garments are specialized enough that no single outfit is
universally right. A parka that is merely worse in heat, rather than
genuinely bad, collapses the whole question back to a solved one.

---

## Proposed wave structure

*Superseded by the build's A1–A10 / B1–B5 waves; the plan retired at
`/finalize`. What did not ship is the tail table above.*

---

## Open questions

1. **Which locality gets which trade?** Terminus has a rostered `tailor`
   and 52 built rooms; Hinkley Hills is the farming locality and wants
   the dye plants; the tannery is a nuisance trade wanting industrial
   zoning and may not belong in either. This is the cosmetics slate's
   open question 9, still open.
2. *Resolved — `dyeing` is its own Discipline
   (`trade-dyeing/content/trade/dyeing/idea/Discipline/dyeing.yaml`).*
3. *Resolved — two chemistries, 2 × 4 plus woad → textiles.md § Dye,
   wash and fade.*
4. *Resolved — flax only → textiles.md § What this build deliberately
   does not ship.*
5. *Resolved — `stature` is a scalar → race.md § Size.*
6. **Does felting need `full`, or is felting its own verb?** Fulling
   woven wool and felting loose fibre are different acts that share a
   mechanism (heat + agitation + moisture). One verb or two.
7. **What produces `hide` before ranching?** Leatherwork's faucet is an
   animal. Hunting? Butchery of an existing Creature? Or does
   leatherwork's left edge wait on ranching the way wool does — in which
   case W9 ships the *tannery* against imported hide.
8. *Resolved — a negative-requirement dial below `obvious`, no rebase →
   concealment.md § The scale extends DOWNWARD.*

### Added 2026-09-02 (the four-lens pass)

9. *Resolved — resist-bearing forms closed, textile forms are `Fabric`
   rows → textiles.md § The covering vocabulary.*
10. ⭐ **What is a pattern?** A recipe, an authored document, or
    player-designable content that can be named, sold and inherited? The
    largest creative-expression surface in the build, currently unmodelled.
11. ⚠ **When does the apron actually light up?** Textiles ships the
    deposit *routing* and the pre-registered event; the gauge is the
    room-condition build's. So the apron is designed, seamed and inert
    until that build lands — which is now blocked-on by **two** slates
    (cooking's kitchen and this one). Is that acceptable, or does one of
    them pull `SoilableMixin` forward?
12. **Is a scouring agent legitimate?** The room-condition pack
    deliberately refuses a washing consumable (water is a precondition;
    *"charging the care loop an errand per wash is the friction this pack
    exists to avoid"*). But **scouring fleece before dyeing is a
    production step, not a care act** — you cannot dye greasy wool — and
    ash already ships from `trade-fuel`, so ash → lye is a real chain
    with its input already in the world. Production input, or the same
    refused tax wearing a different hat?
13. *Resolved by measurement — spin 3 h / weave 0.5 h by hand →
    textiles.md § Throughput at bed scale.*
14. *Resolved — `equip set` → textiles.md § The presentation.*
15. **How legible must a dressing mistake be?** Lens 4's
    player-knowledge loop only teaches if being wrong is survivable and
    the reason is readable. Too harsh and it is a trap; too soft and
    nobody learns.
16. ⚠ **Does the `transform` price list catch a mordant?**
    [arcane-science.md](../../arcane-science.md) permits chemical
    transformation *"in small amounts"*, and a mordant is bond
    rearrangement at gram scale — but `lib/magic/PriceList.ts` prices
    `transform` three orders of magnitude above every other verb to keep
    it out of circulation by arithmetic. Neither doc resolves whether the
    blanket price is meant to catch gram-scale chemistry. **This is a
    magic-subsystem question, not a textiles one** — but dyeing is the
    first trade to actually ask it. See Decision 11.
17. ⚠ **Does player-authored garment prose need moderation, and whose?**
    It is the customization market's actual product (Decision 12), it
    rides the `recordAuthoring` gate, and *everyone is an author* — but
    it is prose one player writes that appears on another player's body,
    which no shipped authoring surface currently does. **Not a textiles
    mechanism; a policy question this build is the first to raise.**
18. **How much prose variety does the impression line need before it
    reads as repetitive?** It aggregates five facts, so the outcome space
    is combinatorially fine but the *phrasings* are authored. The thin,
    repetitive failure is the likely one.
19. **Should a garment ever be a magic-item host?** The machinery
    composes today (`Arcane` + charge economy + `Wearable`), but every
    shipped wearable is jewelry. A magic *garment* is new content, not
    new mechanism — is it this build's, or magic-items' next wave?

---

## Cross-references

**Consumed / discharged:**
[cosmetics-slate](../tails/cosmetics-slate.md) (⭐⭐⭐ *dye is a textiles input*;
open questions 1, 2, 4 and 9 carried forward) ·
[trade-roster-slate](../tails/trade-roster-slate.md) (`textiles` + `leatherwork`
GAP rows; `tailor`/`tanner` rostered) · [vocations.md](../../vocations.md)
(`barber / tailor`, `miller / tanner` GAPs) ·
[launch-worklist.md](../../launch-worklist.md) (the deferred tailoring
branch + its fiber-faucet condition).

**Depends on / seams with:**
[room-condition-design-pack](./room-condition-design-pack.md) (⚠⚠ **owns
`SoilableMixin`** — textiles is a consumer; its attributed events are not
retrofittable) · [lineage-slate](./lineage-slate.md) (the
body-composition budget; textiles ships the consumer, lineage the
variance) · [search-slate](../tails/search-slate.md) (the viewer half of
detection) · [ranching-slate](./ranching-slate.md) (wool's left edge;
possibly hide's) · [zoning-slate](./zoning-slate.md) (the tannery as
industrial nuisance) · [guild-slate](./guild-slate.md).

**Shipped substrate:**
[materials-response.md](../../subsystems/materials-response.md) (`response
= f(mechanism, material, construction)`) ·
[crafting.md](../../subsystems/crafting.md) (recipes, Grade, Tool,
Durable, Crafted; `repair`/`salvage`) ·
[embodiment.md](../../subsystems/embodiment.md) +
[slot.md](../../subsystems/slot.md) (Wearable, slotClaims) ·
[thermal.md](../../subsystems/thermal.md) (clo → effective ambient) ·
[weather.md](../../subsystems/weather.md) (wetness) ·
[husbandry.md](../../subsystems/husbandry.md) +
[smallholding.md](../../subsystems/smallholding.md) (the crop faucet) ·
[maturation.md](../../subsystems/maturation.md) (retting's clock) ·
[concealment.md](../../subsystems/concealment.md) +
[stealth.md](../../subsystems/stealth.md) ·
[perception.md](../../subsystems/perception.md) ·
[belief.md](../../subsystems/belief.md) ·
[measurement.md](../../measurement.md) (the no-gauge rules) ·
[content-packs.md](../../subsystems/content-packs.md) (the capability
rung; `SAXONBERG_PACKS`) · [race.md](../../subsystems/race.md) +
[vitals.md](../../subsystems/vitals.md) (BodyPlan, `covers:`, baseMass) ·
[corpo.md](../../subsystems/corpo.md) (BrandedMixin) ·
[provenance.md](../../subsystems/provenance.md) (the authorship ledger —
*mage-woven is a mark, not a physics*).

**Presentation (Decision 12):**
[card-surface.md](../../subsystems/card-surface.md) (⭐⭐ the ONE
inspection card, laid out by `StuffKind`; liveness is a property of
attention) · [mql-subscription.md](../../subsystems/mql-subscription.md)
(`DETAIL_FIELDS` — where `worn` must be added) ·
[message-rendering.md](../../subsystems/message-rendering.md) +
[messaging.md](../../subsystems/messaging.md) (the `markupAugmenters`
pipeline the impression line rides) ·
[perception.md](../../subsystems/perception.md) (⭐ `perceives` in the
`contents` descriptor — honest fog *on the wire*) ·
[client-shell.md](../../subsystems/client-shell.md).

**Magic (Decision 11):** [arcane-science.md](../../arcane-science.md)
(⭐⭐ **Kell's Partition** — impulse vs binding, and the economic
corollary that makes a mage *capital*; **Voss Decay** — why a veil erodes
under attention; **Transform is not forbidden, it is unaffordable**) ·
[magic.md](../../subsystems/magic.md) (the grid as Disciplines,
`CasterMixin` faculty, suppression) ·
[magic-items.md](../../subsystems/magic-items.md) (the three item
classes, the `S* = inflow/d` charge economy, BUC; `ring-of-veil` is the
worn exemplar) · [concealment.md](../../subsystems/concealment.md) +
[belief.md](../../subsystems/belief.md) (the veil's observer side).

---

## ⭐ Footwear — the one channel a garment does not intercept yet (2026-09-18)

Came out of the nutrition & fitness planning: *"workout clothes, the
wide world of shoes, fitness as fashion."* Run through the governing
idea — a garment's purpose is which channel it intercepts — it splits
cleanly into a part that is already true and a part that is new.

**Athletic wear needs nothing; it emerges, the way the lab coat does.**
Nobody authors "gym clothes." The nutrition build makes exertion heat
(build-4's shedding is damped by worn `clo` — the coat that stops
work-heat getting out), sweat is wetness (`waterAbsorptionCapacity` on
every material already says wicking vs soaking), sweat is soiling (the
sacrificial outer layer — the apron's job is the singlet's job), and
the *signal* channel — the lab coat's second channel — is what
fitness-as-fashion is: athletic wear worn *away* from the gym says
something, and the impression augmenter already reads the worn stack.
Four channels, four existing mechanisms, zero new code. A row that is
light, low-clo, high-absorbency and outermost **is** a workout garment.

**The ground is the channel nothing intercepts.** Locomotion has a
`terrain` gate and it reads nothing from the feet; weather makes
puddles; the winze is rock; a bare foot pays on gravel and nothing
charges it. Footwear is a `Garment` on the two foot slots (embodiment
has them; `leather-boots` ships as a row) with a **ground channel**:
traction on dry vs wet vs rock, wet-through from a puddle, the sole's
wear. A running shoe is light and grips dry ground; a boot survives wet
and rock; the wide world of shoes is **materials × construction × fit**,
exactly as every garment already is — the variety is rows, the channel
is the one kernel addition. Its first consumers: the sustained `run`
(the nutrition build's reach rung), the climb, the haul over wet ground.

**The cordwainer** is leather's biggest customer — the *fourth* trade
downstream of the knacker after tanner, chandler and glue
([rendering-slate](./rendering-slate.md)), and the reason *"leather is a
sink with no source"* matters: shoes are where most of a hide goes.
Same blocker as leatherwork above; same pack question (rendering's
§ 6, one pack or three — now one or four).

⚠ Deliberately not here: a shoe as a *stat* (speed bonus, stealth
bonus). Traction and wet-through are material facts the ground channel
reads; anything a shoe "gives" derives from them or does not exist.
