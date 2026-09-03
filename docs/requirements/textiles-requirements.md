# Textiles — requirements

Clothing in Saxonberg is prose. `Garment` composes nothing, all nine
shipped clothing rows author no material, no `clo` and no mass, and
worn clothing therefore contributes exactly zero thermal insulation,
weighs nothing to encumbrance, and cannot get wet, wear out, be graded,
be repaired or be made. The one soft-goods recipe in the tree squats in
`trade-smithing` and consumes a `hide-stock` that nothing produces.
Meanwhile the substrate to fix all of it already ships and is starving:
`WetMixin` soaks off `Material.waterAbsorptionCapacity`,
`ThermalRegulation` sums `getClo()` over worn slots, and every body-plan
slot declares a `covers:` relation that **thermal never reads**.

This build makes clothing a real object, makes it **visible**, and gives
it a supply chain: flax grown and retted, spun and woven into cloth, dyed
with real mordant chemistry, and cut and sewn into garments that fit the
body they were cut for.

Seeded by [textiles-slate](../slates/builds/textiles-slate.md) (twelve
decisions). Consumes the load-bearing finding of
[cosmetics-slate](../slates/builds/cosmetics-slate.md) — *dye is a
textiles input; cosmetics is a second customer* — and discharges the
`textiles` and `barber / tailor` **GAP** rows on the
[trade roster](../slates/builds/trade-roster-slate.md) and in
[vocations.md](../vocations.md).

---

## Goals

**The object**

- A garment is a **real physical object**: it carries a material, a
  construction form, mass, a grade, a wear condition and an authorship
  record — the same way `Armor` already does.
- **`clo` derives and is never authored.** A wool coat is warm because
  wool conducts at 0.04 W/mK, not because someone typed a number.
- Coverings **resolve per body part** through the existing `covers:`
  relation, so bare hands in the cold are cold *hands* and a cloak beats
  a shirt because it covers more.
- A covering stack **orders itself**: form sets the band, wear-order
  breaks ties within a band.
- **Wet cloth is a different object from dry cloth** — it loses most of
  its insulation and gains real mass, and wet linen behaves differently
  from wet wool because their materials differ.
- **Species are mechanically distinct in size.** A halfling and a
  dragonborn stop massing the same.
- A garment **fits a body or it doesn't**, and a bespoke garment cut for
  you beats a stock one cut for a body plan's average.

**The presentation**

- **Worn equipment is visible and distinguishable from carried
  equipment** on the inspection card.
- A person's long description carries an **impression** of how they are
  dressed — a gestalt, never an enumeration of what the card already
  lists.
- **Getting dressed is one command**, not eight.

**The chain**

- Flax is **grown, retted, dressed, spun and woven** into cloth, with
  grade propagating as staple length from the field to the bolt.
- Cloth is **dyed** by `f(dyestuff, mordant, fibre)`, producing a hue
  *and* a fastness that decays with washing.
- Cloth is **cut and sewn** into garments, and the jerkin recipe leaves
  `trade-smithing` for the trade that owns it.
- **Spinning is the felt bottleneck**, and buying the wheel measurably
  moves the constraint downstream to the loom.
- A **maker's authored prose ships with the garment they made** — you buy
  the look by buying the object.

**The seams**

- Worn coverings **contribute to their wearer's concealment**, and a
  conspicuity band exists below `obvious`.
- Garment-soiling acts **emit the room-condition pack's producer event**,
  and the covering stack routes a deposit to the outermost layer covering
  the affected part.

---

## Non-goals

**Deferred to a named successor:**

- **Leatherwork and tanning** — Stage C. Not a scope cut but a
  *dependency*: nothing in the world produces hide (`hide-stock` is a
  `Prop` stocked on the Hearthworks smithy floor), so a tannery now would
  tan imports. Waits on ranching or a hunting/butchery faucet.
- **Wool, and everything on its left edge** (`shear`, scouring, the
  scouring-agent question) — waits on
  [ranching](../slates/builds/ranching-slate.md). The fibre substrate
  must *accept* wool without re-opening.
- **Cotton and silk.** Cotton is a second cellulose fibre: more content,
  no new lesson.
- **Synthetic fibres, mills, and mass-produced lines.** ⭐ The substrate
  must *be able to* carry them — audited in
  [the plan](../plans/textiles-plan.md) § P15, which finds that kevlar
  needs **no new construction form** (material scales the resist
  magnitude), that the tool ladder already starts at rung zero for
  prehistoric hands-only work, and that mass production is a shipped
  pattern (a high capability `rate` + a production brain). **Three seams
  are cut now to keep it true**: the stage is `prepare` not `ret`; the
  chain begins at *fibre-exists-as-a-material*; and the
  spinning-bottleneck assertion is scoped to the shipped tech level. **No
  synthetic, mill or modern line is authored** — trades ship medieval and
  advance by exercised disciplines.
- **`SoilableMixin` itself**, its bands and its attributed event log —
  owned by
  [room-condition-design-pack](../slates/builds/room-condition-design-pack.md).
  This build ships the routing and the pre-registered producer event
  only, because those events are *"required at build time, not
  retrofittable"* and a second gauge would be a third parallel
  representation of one idea.
- **The viewer-side detection equipment term** (lenses, rings, goggles,
  ocular augments), **terrain-matched camouflage**, and **spawn-hidden
  distribution** — [search-slate](../slates/builds/search-slate.md).
- **Hair dye** — [lineage](../slates/builds/lineage-slate.md) phase 1
  must ship appearance substrate first; *"appearance is not modeled
  anywhere."* Dyeing here is cloth only.
- **Individual body variance within a species.** This build ships
  species-level `baseMass` and `stature`; per-character variation is
  lineage phase 2 feeding an existing seam.
- **Player-designable patterns as first-class artifacts** (named, sold,
  licensed). A pattern here is a Recipe.
- **A garment as a magic-item host.** The machinery composes today
  (`Arcane` + charge economy + `Wearable`); this is content, and it
  belongs to magic-items' next wave.
- **Heart's Delight and field-scale flax.** Farming Stage B, blocked on
  the residences-grounded re-plan.

**Deliberately not built at all:**

- **A laundry vocation.** Soiling is thin; the room-condition pack
  already ruled that water is a precondition, not a consumable, *"so the
  care loop is not an errand per wash."*
- **Any engine gauge converting dress into regard or first impression.**
  [measurement.md](../measurement.md)'s split is *engine measures ·
  subject values*. NPC reaction to dress lives in a **brain**, in a pack.
- **A real-money cosmetic layer.** Fortnite's model mints goods from
  nothing; this economy is conserved.

---

## Surface decisions

### 1. The chain walks construction, not material

One material per fibre. Spinning and weaving change the **form**, never
the substance — flax the plant and linen the cloth are the same
cellulose. Textile forms become a third domain in
`lib/material/Construction.ts` beside `armor` and `weapon-delivery`.
Felting is a form that skips the yarn rung, not a special case. Grade is
**staple length**, a physical quantity that propagates like ore grade
propagates to the smelt.

### 2. One covering vocabulary, and a split on who may extend it

A padded gambeson *is* quilted cloth, so textiles **extend** the armor
forms rather than paralleling them. Cloth resists **poorly**, which is
honest rather than absent: a linen shirt is armor that does not work.

⚠ **Consequence — a rename.** `ConstructionDomain` `'armor'` →
`'covering'`; `ARMOR_FORMS` → `COVERING_FORMS`; `ARMOR_PROFILES` →
`COVERING_PROFILES`. A shirt is not armor; it *is* a covering, and
`responseFor()`'s domain guard should say so.

**Who may extend it — the split:**

| | where | may a pack add one? |
|---|---|---|
| **resist-bearing** forms (`plate`, `mail`, `padded`, `hide` — plus `quilted`, ⚠ **which does not exist yet and this build adds**) | closed kernel `as const` | **no** |
| **non-resisting textile** forms (`woven`, `knit`, `felted`, and successors like lace or netting) | template rows at **`/stuff/idea/fabric/`** | **yes** |

⭐ **`fabric` is the term of art** — *"fabric construction"* is the
textile industry's own name for this classification (woven / knit /
nonwoven) — and it is precisely scoped: because resist-bearing forms stay
kernel, that namespace can only ever hold fabrics.

*Reasoning.* A form's resist profile is combat mitigation, and letting
content author that is a real objection. A purely-textile form carries
drape, loft and weave density and contributes no resist, so it carries no
such risk — and leaving it closed would collide with the rule that **a
pack must never need a kernel list edit**. `Construction` gains a second
source; `isForm()` consults both.

### 3. The covering stack resolves per body part

Uses `BodyPlan.getSlotsCovering(part)`. ⚠ **Corrected 2026-09-02:** that
method is *not* callerless — `ConditionLogic`, `CombatLogic` and
`ElectricityLogic` each already walk it, and the `BodyPlan` source comment
saying *"no consumer yet"* is stale. What is missing is the **thermal**
consumer, and the real win is that **three hand-rolled copies of one
outside-in walk collapse into one**. This takes the decision
`Wearable.getClo()` explicitly defers
(*"surface-weighted per-region coverage is a deferred fidelity tier"*),
because a body-wide sum cannot teach that bare extremities cost you.

**Layer order:** form sets the band; **wear-order breaks ties inside a
band**. You cannot put a shirt over plate — the ladder forbids it — but
shirt-then-coat vs coat-then-shirt is the player's call, and getting it
wrong should make you cold rather than be prevented. No authored depth
number.

**What the stack resolves, outermost-in:** `clo` derives from
`f(material.thermalConductivity, form loft, mass/thickness, wetness)`;
windproofing derives from **weave density** (no `shell` role word — the
dense oiled thing simply is one); wetness soaks the outermost layer
first; protection rides the existing resist chain unchanged.

### 4. The chain is a diamond; the packs cut on it

Textiles and leatherwork are **parallel input trades**, not sequential —
tailoring's `cut`/`sew` take either, which is the roster's *"leatherwork
shares the code with textiles"* made literal. Dyeing hangs off the side
as a customer of both. **This cycle ships three of the four**
(textiles · dyeing · tailoring); leatherwork is Stage C.

Flax and the dye crops are **`trade-farming` rows**, not textiles rows —
cultivation is farming's mechanism; textiles' begins at the retting pit.

### 5. A verb per decision, not per motion

| verb | the decision it carries | pack |
|---|---|---|
| `scutch` | how hard to work it — purity vs staple length | textiles |
| `spin` | how fine — speed traded against yarn grade | textiles |
| `weave` | weave density — yield vs windproofing and wear | textiles |
| `full` | the felting / finishing pass | textiles |
| `dye` | `f(dyestuff, mordant, fibre)` | dyeing |
| `cut` | pattern + fit | tailoring |
| `sew` | assembly | tailoring |

Break, scutch and hackle are three motions with one decision; they fold
into `scutch`. **Retting needs no verb** — `FermentingMixin` already runs
that clock; put flax in water, judge the moment, take it out.

**`full` covers felting too.** Fulling woven wool and felting loose fibre
share one mechanism (heat + agitation + moisture) and differ only in the
input. One decision, one verb.

**The tool ladder ships**: drop spindle → spinning wheel, and the loom
ladder. Precedent is the shipped `sewing-kit` / `sewing-machine` pair
(same `mending` capability, `rate: 3, control: fine`). The wheel unlocks
nothing; it goes three times faster.

**`dress` is not taken.** Settled with build-3: `scutch` for flax,
`wear <set>` for the wardrobe (a stanza on the **shipped** `wear`),
`dress` left free for the future butchery pack. **This build adds zero
verbs for the wardrobe affordance.**

### 6. Fit, and the `baseMass` correction

⚠ **No species overrides `BodyPlan.biped.baseMass`** — all seven inherit
70 kg, and combat's mass-scaled fist, encumbrance carry capacity,
metabolism basal drain and thermal mass are all already reading it. Fit
cannot key on a constant, so this build fixes it.

- ⚠ **All TEN playable species** (corrected 2026-09-02 — char-gen ships
  gnome, half-elf and orc besides the seven first counted) gain a real
  `baseMass` **and** a `stature`. The numbers are settled in
  [the plan](../plans/textiles-plan.md) § P8.
- **`stature` is a scalar** (linear scale), not two-axis. Lineage's body
  budget already owns *build* via fat/muscle/bone at one mass; a second
  build axis would duplicate it.
- Measurements **derive** from species stature × species baseMass × the
  individual's mass and composition. No new authored fields on a
  character.
- A garment **stamps the measurements it was cut to** at `cut` time.
- **Fit is the distance between the two.** Loose → air gaps → clo loss.
  Tight → mobility penalty + accelerated seam wear.

Free consequences: a **secondhand market** (a garment cut for someone
else fits you badly), **cross-species failure** (a halfling's coat on a
dragonborn is a non-starter), and **the tailor's economic reason to
exist**.

**The lineage seam.** This build ships the *consumer*; lineage phase 2
supplies the *variance*, feeding an existing seam with **zero textiles
changes**. Textiles must not need re-opening when lineage lands.

### 7. Soiling — consume, don't author

`SoilableMixin` is already designed in the room-condition pack. Textiles
ships **the seam, not the mechanism** — the pattern build-3 established
for cooking's kitchen:

- **In:** the covering stack routes a deposit to the outermost layer
  covering the affected part; garment-soiling acts emit the
  pre-registered producer event.
- **Out:** the gauge, its bands, its attributed event log.

⚠ **Dirt is act-deposited and freezes in absence** — a coat in a wardrobe
does not get dirty. Soiling is **not** time-integrated; do not model it
as exposure or wear.

⭐ **The apron is designed and seamed now and lights up when
room-condition lands**, exactly like cooking's kitchen.

**The wash/fade loop stands regardless:** washing removes soil, and
removes colour if the mordant was poor. The dyer's skill is measured in
**how many washes the colour survives**.

⚠ **`soiled` is two concepts sharing a word.** `CraftVessel.soiled` is
*is this vessel claimable for a fill* — binary by necessity, owned by
crafting and deliberately extended by cooking. `Soilable` is *how
well-kept is this*. **Do not fold the first into the second.**

### 8. A garment's purpose is which exposure channel it intercepts

Nobody authors *"this is a lab coat."* You author white, cheap, woven
cotton, covering torso and arms, sitting outermost, low clo — and
lab-coat-ness **emerges**. The codebase already states the rule in
`lib/vitals/Dressing.ts`: a dressing *"is not a **kind** — it's a role an
item plays."*

An apron is soiling and only soiling: outermost and cheap, it takes the
stain so your shirt does not. A lab coat is two channels at once —
sacrificial soiling **plus** station signal, which is why it is white.

### 9. The social half: legibility, livery, one brain, no gauge

A garment carries five real facts — grade, condition, fit, colour +
fastness, brand — none authored as a "quality" number. A good coat
signals wealth **because it cost wealth**.

⚠ "Outfit" is **taken** (`farm-outfit.yaml` is a `Business`). A uniform
concept is **livery**.

NPC reaction to dress lives in **one demonstrator brain**, in a pack,
under `src/behavior/`. **No kernel gauge.**

### 10. The concealment seam

`getConcealment()` becomes **derive-on-read**: authored base + worn
covering contributions — the same architectural move as `clo`, on a
different channel. A camo cloak contributes negatively; a hi-vis vest
positively.

**Conspicuity: rebase the scale**, adding one band below `obvious`.
Content authors band *words*, not indices, so every authored row is
untouched; only `rankOf` shifts, and the dials are word-keyed.

### 11. Magic — and the negative result that carries it

**Textiles is the trade where magic is least useful, and that is the
point.** The bottleneck is spinning; spinning is fine repetitive motor
work, and there is no grid cell for *"twist fibre consistently all
afternoon."* Magic does not shortcut the bottleneck — **capital does**.

⚠⚠ **A design that lets a mage spin destroys the most valuable thing
this build teaches.**

**Kell's Partition settles "magic clothes":** process magic is an
impulse, and a firebolt's fire is ordinary fire — so a vat heated by
`create·fire` is an ordinary hot vat and **cloth cannot remember how it
was made**. A mage in a mill is **capital**, on the tool ladder beside
the wheel, useful on *once* steps and never *held* ones.

The honest "yes" is **provenance, not physics**: mage-woven is a **mark**
in the authorship ledger — socially real, worth a premium, forgeable.

⭐ **In scope: the hood/veil interlock.** Voss Decay says a veil erodes
fastest under attention, so a **mundane** hood that reduces attention
makes an **arcane** veil binding cheaper to hold — a garment doing real
arcane work carrying no joules. It meets the § 10 concealment seam on one
object.

### 12. Presentation, and the customization market

⭐⭐ **The card enumerates; the prose summarizes.** Two resolutions of one
subject, not two subjects. Prose that enumerates is just a worse card.

- **`worn` is a separate projection field** in `DETAIL_FIELDS`, not a
  flag on `contents` rows — the body-vs-pack **layout** distinction is
  the point, and the client should lay them out as distinct sections.
- **The impression line ships**: a derived gestalt of the five facts in
  aggregate (*"Dressed well, but soaked through"*), as the **fourteenth
  `markupAugmenter`**, tuned to summarize rather than enumerate.
- **The authored half stays authored** — bearing, manner, the scar — on
  `PersonaMixin`'s claimed layer.

⭐⭐ **The UX wave lands before the chain.** `worn`, the card layout and
the impression line are not textiles features: they improve every object
in the game and pay off whether or not the chain ever ships.

**Re-sorted around the buyer.** Expect overwhelmingly buy-not-make, which
is what makes tailoring a livelihood. **Dyeing is the customization core
loop** — you buy rarely and recolour often — not a third-listed customer.

**A pattern is a Recipe**; the customization *product* is the maker's
**authored prose** on the instance, via `DetailedMixin`, riding the
`recordAuthoring` gate. **You buy the look by buying the object.**

### 13. Dyeing's shape

- **Its own `dyeing` Discipline**, not riding `apothecary`. It is the
  customization core loop and deserves its own competence ladder.
- **Three dyestuffs × four mordants** — madder · weld · woad, against
  alum · iron · tannin · none. Twelve outcomes from seven authored rows;
  **the multiplicative shape is the lesson, not the count.**
- `fibre` is the third axis, real once wool lands beside flax.

### 14. Content placement

- **Flax and the dye crops → Hinkley Hills**, the shipped farming
  locality (`CultivableMixin`, beds, soil, harvest, land use all work
  today). Historically right for a dye garden: madder, weld and woad in
  beds is exactly the scale they were grown at.
- **The mill, the dyehouse and the tailor's shop → Terminus**, which has
  a rostered `tailor`, 52 built rooms, and a general store already
  stocking `sewing-kit` and `sewing-machine`.

⚠ **Accepted cost: flax at bed scale never industrialises.** Field-scale
flax wants Heart's Delight, which is farming Stage B and unbuilt. The
throughput shortfall is the **argument for** that build, not a reason to
pull it forward — but see the bottleneck constraint below, which this
puts real pressure on.

---

## Constraints

**Doctrine the planner may not trade away**

- **`clo` derives, never authored.** An authored `clo` on any shipped row
  is a defect.
- **Faculty is capacity, never access.** No garment may gate which spells
  can be cast. Caster efficiency stays capped at 1.
- **No engine gauge from dress to regard.** *Engine measures; subject
  values.*
- **Soiling is act-deposited and freezes in absence.** No clock stamp, no
  time integration.
- **Water is a precondition, not a consumable**, for any washing act.
- **A pack must never need a kernel list edit** — the § 2 form split
  exists to honour this.
- **A capability pack must hold its own namespace root** (`classFileOf`
  resolves by longest prefix), and imports the kernel only by package
  specifier.
- **No new Mongo collections.** Parcel-local persistence is the document
  tree.
- **No migrations, no compat shims, no legacy adapters.** A rename means
  dropping the DB.

**Invariants that will bite**

- ⚠ **The `baseMass` change moves live numbers** in combat's mass-scaled
  fist, encumbrance, metabolism and thermal mass. It wants its own wave,
  its own gym run and its own review attention.
- ⚠ **`Construction`'s rename touches combat.** `COVERING_PROFILES` is
  read by the damage fold.
- ⚠ **`DETAIL_FIELDS` is the client's contract.** Adding `worn` is a wire
  change.
- ⚠ **The conspicuity rebase touches trap and delve content** — verify
  authored band *words* still resolve after the shift.
- **`CraftVessel.soiled` must not be folded into `Soilable`.**
- **`dress` must stay unclaimed.**
- **"Outfit" means a `Business`.** The uniform concept is `livery`.

**Tuning obligations — constraints, not numbers**

- ⭐⭐⭐ **Spinning must be the observable bottleneck**, and buying the
  wheel must measurably move the constraint downstream to the loom. The
  lesson lives entirely in the `spin`:`weave` labour ratio; arbitrary
  durations lose it silently and nothing fails. ⚠ Bed-scale flax (§ 14)
  puts real pressure on this — if the ratio cannot be felt at
  smallholder throughput, say so rather than faking it.
- **A dressing mistake must be survivable, and its cause readable** from
  the impression line. Too harsh is a trap; too soft teaches nothing.
- **The impression line must not repeat a phrasing within a session.**
  Thin and repetitive is its likely failure.

**Process**

- Module categories are fixed; no new ones without sign-off. No
  free-floating helpers.
- Every gating lint must pass. ⚠ **The list is longer than first
  written** — this build trips at least: `lint:does-nothing`,
  `lint:inert-weapon`, `lint:field-meta`, `lint:descriptors`,
  `lint:census`, `lint:untitled`, `lint:schema`, `lint:topics`, plus
  `lint:instanceable`, `lint:imports`, `lint:module-scope`, `lint:gates`,
  `lint:locations`, `lint:test-content`, `lint:test-bootstrap`,
  `lint:boundary`, `lint:object-verbs`, `lint:arg-kinds`,
  `lint:thin-forwarder`.
- Any test touching the wired runtime imports `test-bootstrap`.
- Kernel tests must not name shipped content.
- ⚠ **`pnpm test` runs at exactly two moments**: before the MR opens, and
  at `/finalize`. Everything between is `test:near` + touched packs +
  the lint family.

---

## Acceptance criteria

**The object**

1. `Garment` composes `Constructed`, `Durable`, `Crafted` and `Detailed`;
   all nine shipped clothing rows carry a material, a construction form
   and a mass. **`Armor` is retired** — armor is a `Garment` of the right
   material and form; its six rows and twelve test imports repoint.
2. No shipped row authors `clo`; `getClo()` is derived, and a test
   asserts a wool garment out-insulates a linen one of equal mass from
   material properties alone.
3. A test asserts a soaked garment loses insulation and gains mass, and
   that wet wool retains more than wet linen.
4. The **thermal** path is a consumer of `BodyPlan.getSlotsCovering`, and
   the three pre-existing local walks (`ConditionLogic`, `CombatLogic`,
   `ElectricityLogic`) are replaced by the shared one; a test asserts an
   uncovered body part is colder than a covered one under the same
   ambient, and pins assert the three refactored walks are unchanged.
5. A covering stack orders by form band, with wear-order breaking ties
   inside a band; a test asserts a shirt cannot be worn over plate.
6. Each of the **ten playable** species declares its own `baseMass` and
   `stature`; the gym benches are re-run and any movement is recorded.
7. A garment stamps cut-to measurements; a test asserts bespoke fit
   out-performs stock on the same body, and that a halfling's garment
   fails on a dragonborn.

**The presentation**

8. `worn` is a distinct field in `DETAIL_FIELDS`; the inspection card
   renders worn and carried as separate sections.
9. A `markupAugmenter` emits an impression line summarizing the five
   facts in aggregate, and a test asserts it names no individual garment.
10. `wear <set>` puts on a saved wardrobe in one command; **no new verb
    is registered.**

**The chain**

11. Flax is grown in Hinkley Hills, retted in water over game-time with
    an over-ret failure, scutched, spun, woven and fulled — an end-to-end
    test walks seed to cloth.
12. Staple-length grade propagates from harvest to the finished bolt.
13. A bench demonstrates the spinning bottleneck and that the wheel moves
    it to the loom. **If the ratio is not felt at bed scale, the finding
    is documented rather than the number faked.**
14. `dye` produces a hue and a fastness from `f(dyestuff, mordant)`, over
    three dyestuffs and four mordants; a test asserts washing decays
    fastness and that a poor mordant fades faster.
15. `cut` and `sew` produce a garment from cloth; the jerkin recipe no
    longer lives in `trade-smithing`.
16. A maker's authored prose persists on the instance and renders when
    another player looks at the wearer.
17. Three new packs install and boot from a cold DB: `trade-textiles`,
    `trade-dyeing`, `trade-tailoring`, each holding its own namespace
    root.

**The seams**

18. `getConcealment()` derives from authored base + worn contributions; a
    test asserts a camouflaged covering lowers and a conspicuous one
    raises detectability.
19. A conspicuity band exists below `obvious`, and every authored
    concealment row in shipped content still resolves.
20. Garment-soiling acts emit the room-condition producer event; **no
    `SoilableMixin` ships from this build.**
21. A test asserts a mundane attention-reducing hood lowers the standing
    cost of a veil binding.

**Documentation**

22. A subsystem doc exists at `docs/subsystems/textiles.md` and is linked
    from `CLAUDE.md`'s documentation map.
23. `materials-response.md` reflects the `covering` rename;
    `embodiment.md` / `slot.md` reflect per-part resolution and fit;
    `card-surface.md` reflects `worn`.
24. The slate is retired or reduced to its unbuilt tail (leatherwork,
    wool, patterns-as-artifacts, magic garments) per the sweep rules.
25. Every collection touched has a current schema doc; `lint:schema`
    passes.

---

## Cross-references

**Seeding slates.**
[textiles-slate](../slates/builds/textiles-slate.md) ·
[cosmetics-slate](../slates/builds/cosmetics-slate.md) ·
[trade-roster-slate](../slates/builds/trade-roster-slate.md).

**Coordinated with.**
[room-condition-design-pack](../slates/builds/room-condition-design-pack.md)
(owns `SoilableMixin`; this build pre-registers against it — as does
cooking, which is **two builds now waiting on that pack**) ·
[search-slate](../slates/builds/search-slate.md) (the viewer half of
detection) · [lineage-slate](../slates/builds/lineage-slate.md) (supplies
body variance later) ·
[ranching-slate](../slates/builds/ranching-slate.md) (wool, and
leatherwork's faucet) · [farming-slate](../slates/builds/farming-slate.md)
(Heart's Delight is its Stage B).

**Load-bearing subsystem docs.**
[materials-response.md](../subsystems/materials-response.md) ·
[crafting.md](../subsystems/crafting.md) ·
[embodiment.md](../subsystems/embodiment.md) ·
[slot.md](../subsystems/slot.md) ·
[thermal.md](../subsystems/thermal.md) ·
[weather.md](../subsystems/weather.md) ·
[husbandry.md](../subsystems/husbandry.md) ·
[smallholding.md](../subsystems/smallholding.md) ·
[fermentation.md](../subsystems/fermentation.md) ·
[concealment.md](../subsystems/concealment.md) ·
[perception.md](../subsystems/perception.md) ·
[card-surface.md](../subsystems/card-surface.md) ·
[mql-subscription.md](../subsystems/mql-subscription.md) ·
[content-packs.md](../subsystems/content-packs.md) ·
[race.md](../subsystems/race.md) · [vitals.md](../subsystems/vitals.md) ·
[provenance.md](../subsystems/provenance.md) ·
[measurement.md](../measurement.md) ·
[arcane-science.md](../arcane-science.md) ·
[magic-items.md](../subsystems/magic-items.md) ·
[antipatterns.md](../antipatterns.md).
