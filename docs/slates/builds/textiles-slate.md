# Textiles slate — the chain that clothes the world

> **Captured 2026-09-02**, design session in `build-1` while the TPA
> rewrite (`design/tpa-reform`) and cooking (`design/cooking`) were in
> design in the sibling worktrees. **Status: decided design,
> pre-requirements.**
>
> This slate owns **fibre → cloth → garment**, and the four trades that
> make it: textiles, leatherwork, dyeing, tailoring. It also owns the
> kernel wave that makes a garment a real object instead of a
> description.
>
> It does **not** own searching. The design session found that the
> viewer side of detection is missing an equipment term, and that gap is
> big enough to want its own cycle — see
> [search-slate](./search-slate.md), written alongside this one. Textiles
> builds the *target* half of that seam (a camouflaged cloak is clothing);
> the search slate builds the *viewer* half (a lens is not).
>
> Supersedes nothing. Consumes the **cosmetics slate's** load-bearing
> finding (*dye is a textiles input; cosmetics is a second customer*) and
> discharges four **GAP** rows: `textiles` and `leatherwork` on the
> [trade roster](./trade-roster-slate.md), `barber / tailor` and
> `miller / tanner` in [vocations.md](../../vocations.md).

---

## The gap — audited against the shipped tree, 2026-09-02

The headline, and it is worse than it looks from the fiction:

```
Armor   = Wearable(Slottable(Crafted(Durable(Constructed(Detailed(Thing))))))
Garment = Wearable(Slottable(Thing))
```

`Garment` composes **nothing**. And every one of the nine clothing rows
in `generic-objects/content/stuff/thing/clothes/` — blazer, canvas-shoes,
field-jacket, hood, lab-hoodie, student-shirt, student-trousers,
tweed-jacket, white-coat — authors **no material, no `clo`, no mass**.

Concretely, today:

- **Worn clothing contributes exactly 0 clo.** `ThermalRegulation` sums
  `occ.getClo()` over worn slots; `WearableMixin.clo` defaults to
  `Quantity.of(0, 'clo')`; nobody authored one. The thermal layer is
  wired to clothing and reads zero from all of it.
- **Clothing is weightless.** Encumbrance never sees it.
- **Clothing cannot get wet, wear out, be graded, be repaired, or be
  made.** No `Durable`, no `Constructed`, no `Crafted`. Materials author
  `waterAbsorptionCapacity` and no garment has a material to read it
  from.
- A tweed jacket and a field jacket are the same object with different
  `longDescription`.

The one contrast is `leather-boots`, which is classed `Armor` and
therefore carries `_materialPath`, `constructionForm: hide`,
`gradeBand: fair`, `mass: 1.4`. **The substrate works.** The combat build
wired armor to it and nobody ever wired clothes.

### The chain is a stub with both ends missing

- **One** soft-goods recipe exists —
  `trade-smithing/content/recipes/leather-jerkin.yaml`, `discipline:
  smithing`, consuming `category: hide`. A tailoring recipe squatting in
  the smithing pack.
- Its input, `hide-stock`, is **produced by nothing**. It is a `Prop`
  stocked on the Hearthworks smithy floor as authored inventory.
- The `mending` capability ships (`sewing-kit`, `sewing-machine` in the
  Terminus general store) and drives `repair`/`salvage` for soft goods —
  pointing at garments that cannot hold damage.
- Textile materials that ship: **wool, jute, down, leather**. No flax, no
  cotton, no silk, no dyestuffs, no mordants.
- Nothing spins, weaves, fulls, dyes, tans, cuts or sews.

`launch-worklist.md` states the deferral outright: *"the **tailoring
branch stays deferred** per the requirements (the jerkin recipe +
`mending` capability are its attach points; **waits on a fiber
faucet**)."* This slate is that faucet.

### Two hooks already cut and sitting unused

- Every `biped` slot declares `covers: [body.torso]` etc., with the
  comment *"coverage relation, for armor / hit-location — **no consumer
  yet**."* `BodyPlan.slotsCovering(part)` exists and has **zero
  callers**.
- `WetMixin` soaks and dries off `Material.waterAbsorptionCapacity`, and
  its own doc says *"wet wool lingers and a wet blade sheds at once,
  emergent from a tabulated number."* Exactly the model this build wants,
  already built, starving for a garment with a material.

---

## ⭐⭐⭐ Decision 1 — the chain walks CONSTRUCTION, not material

> **One material per fibre. Spinning and weaving change the *form*, never
> the *substance*.**

Flax the plant and linen the cloth are the same cellulose; wool the
fleece and worsted the suiting are the same keratin. So the chain is a
walk up a form ladder on a constant material:

```
MATERIAL (constant)      CONSTRUCTION (the chain)
  flax      ─────────►   fibre → sliver → yarn → woven
  wool      ─────────►                  ↘ knit
  cotton    ─────────►     └──────────────► felted   (no yarn step)
  silk      ─────────►   fibre → ......... → woven
  jute ✅   ─────────►   fibre → yarn → woven (open)
```

This is not a new pattern — it is *the* pattern the engine already runs.
`response = f(mechanism, material, construction)`: material scales the
height of the curve, construction picks its shape. A textile form
vocabulary is a **third domain** in `lib/material/Construction.ts`
alongside `armor` and `weapon-delivery`, with the same shape (a closed
word list, a data table, `Construction.of`).

**What it buys:**

- **Felting branches for free.** Felt is fibre→cloth with no spinning. On
  this model that is a form that skips a rung, not a special case.
- **Grade is staple length** — a real physical quantity, not a band. Long
  line flax spins fine yarn; short tow spins coarse. It propagates to the
  cloth exactly as ore grade propagates to the smelt (⭐⭐ *ore grade is a
  SHIPPED composition fraction*, metal-chain slate).
- **Retting is where you can ruin it.** Under-ret and the fibre will not
  separate; over-ret and it rots. A genuine skill window on a real clock,
  and `FermentingMixin` already models exactly this shape.
- **Dye stays orthogonal** to both axes — see Decision 7.
- **It exposes a live bug.** `wool.yaml` authors `appearance: thick woven
  wool` — a *material* row asserting a *construction*. Raw fleece is not
  woven. This model deletes that string.

## ⭐⭐ Decision 2 — one covering vocabulary, not two

*(Session fork, user call: option (a).)*

`padded` is already an armor form, and a padded gambeson **is** quilted
cloth. Boiled leather, felt and quilting genuinely resist blows. So the
textile and armor vocabularies are not neighbours — they are one
vocabulary, and textiles extends it.

Cloth simply resists **poorly** on every channel, which is honest rather
than absent: **a linen shirt is armor that does not work.** Layering then
uses one machinery instead of two that have to agree.

⚠ **Consequence — a rename.** Once a linen shirt is in that table,
`ConstructionDomain = 'armor' | 'weapon-delivery'` is misnamed and
`responseFor()`'s domain guard reads wrong. A shirt is not armor; it *is*
a covering. `ARMOR_FORMS` → `COVERING_FORMS`, `ARMOR_PROFILES` →
`COVERING_PROFILES`, the domain word `'armor'` → `'covering'`. Cheap,
mechanical, and it makes the guard honest.

## ⭐⭐ Decision 3 — the covering stack resolves PER BODY PART

*(Session fork, user call: per-part, using `covers:`.)*

`Wearable.getClo()`'s doc defers this explicitly: *"Surface-weighted
per-region coverage is a deferred fidelity tier — v1 is a simple additive
sum."* This build takes that decision, because the flat sum cannot teach
the one thing coverage is for: **bare hands in a blizzard cost you
nothing** under a body-wide sum, and a cloak and a shirt are
interchangeable if their clo matches.

Per-part resolution uses `BodyPlan.slotsCovering(part)` — the relation
that has been cut and callerless since the vitals build.

### The layer order — form sets the band, wear-order breaks ties

`LAYER_DEPTH` derives depth from form (padded 0 … plate 3) so a stack
self-sorts with no authored number (Settled 11, *authors author
concepts*). That breaks the moment textiles arrive: a linen shirt and a
wool coat are **both `woven`**.

The rule, which preserves both principles:

> **Form sets the band. Wear-order breaks ties inside a band.**

You cannot put a shirt over your plate — the form ladder forbids it. But
shirt-then-coat versus coat-then-shirt is genuinely *your call*, and
getting it wrong should make you cold rather than be prevented. No new
authored field, and the layering decision survives exactly where it is
real.

### What the stack resolves, outermost-in

```
        wind ──┐   rain ──┐          ← outermost soaks first
   ┌───────────▼──────────▼─────┐
   │ shell   oiled wool  woven  │  dense weave → windproof (multiplies)
   ├────────────────────────────┤
   │ mid     wool        knit   │  loft → adds clo
   ├────────────────────────────┤
   │ skin    linen       woven  │  wet here = heat sink
   └────────────────────────────┘
              body.torso            ← via the slot's `covers:`
```

- **⭐⭐ clo DERIVES, never authored.** `f(material.thermalConductivity,
  form loft, mass/thickness, wetness)`. Wool insulates because it is
  0.04 W/mK, not because an author typed 4. **Windproofing derives from
  weave density** — no `shell` role word is needed; the dense-woven oiled
  thing simply *is* one.
- **Wet is the payoff.** Soaked cloth loses most of its clo and gains
  real mass. Wet linen is a heat sink; wet wool still works. That is the
  single most teachable fact in the chain, it is why oiled wool exists,
  and `WetMixin` already computes it per-object today.
- **Protection** rides the existing resist chain unchanged.

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

- **Flax and the dye plants are `trade-farming` rows.** Cultivation is
  farming's mechanism; textiles' mechanism starts at the retting pit.
  Precedent: farming already grows juniper for gin and grapes for wine,
  so industrial crops are in scope. New files in an existing pack ⇒
  conflict-free against the cooking build's food crops.
- **Tanning lives inside `trade-leatherwork`**, not its own pack — but
  the *tannery* is a zoned nuisance venue, which is the `miller / tanner`
  GAP the vocations register wants.
- **A kernel wave comes first**, then the packs. Same shape as the metal
  chain.

## ⭐ Decision 5 — a verb per DECISION, not per motion

The real process has eleven-ish steps. Eleven verbs would be a mill
simulator. The rule:

> **A verb exists where a decision exists.**

Break, scutch and hackle are three motions with one decision between them
(*remove more woody matter, lose some staple length*) — historically,
collectively, *dressing* the flax. They fold into one act — named
`scutch` rather than `dress`, for the collision reason below. Retting
has a genuine decision (when to pull it) and `FermentingMixin` already
runs that clock, so like the fermentation build it may need **zero
verbs**: put flax in a water tank, judge the moment, take it out.

| verb | the decision it carries | pack |
|---|---|---|
| `scutch` ⚠ | how hard to work it — purity vs staple length | textiles |
| `spin` | how fine — speed traded against yarn grade | textiles |
| `weave` | weave density — yield vs windproofing + wear | textiles |
| `full` | felting / finishing pass (wool) | textiles |
| `tan` | the liquor, and how long | leatherwork |
| `dye` | `f(dyestuff, mordant, fibre)` | dyeing |
| `cut` | pattern + fit — where tailored beats stock | tailoring |
| `sew` | assembly | tailoring |

Eight verbs, four packs. `mending` already ships and finally has
something to repair. `shear` waits on ranching, as does wool's whole left
edge.

### ✅ `dress` — resolved with build-3, and nobody spends a verb

*(Raised 2026-09-02, settled the same day with `build-3-6f`.)* An earlier
draft of this slate reported a three-way collision on `dress` and
proposed keeping `dress as <name>` for the wardrobe set. **Build-3
corrected it on three counts, and they were right on all three:**

1. **Cooking never claimed `dress`.** `dress <carcass>` belongs to
   **butchery** — its own trade, a sibling Discipline, in a pack **nobody
   has scheduled**. The verb is a stashed note for that pack's future
   designer. There was no shipped or in-flight claim to collide with.
2. **The stanza pattern does not fit.** `measure strike` / `measure dip`
   works because both stanzas are *the same act* differing in quantity.
   `dress <carcass>` and `dress as <name>` are unrelated homonyms with
   **different affordance models** — the carcass one is
   instrument-conferred (block, hook, knife), the wardrobe one is innate
   like `wear`. ⭐ And **help is harvested**, so `help dress` — *"prepare
   a carcass, or put on a saved outfit"* — would be a real page a real
   person reads.
3. ⭐⭐ **Their counter-proposal is better: don't mint a verb at all.**

**Settled:**

| act | verb |
|---|---|
| the flax step | **`scutch`** — the specific act, historically the heart of the operation |
| the wardrobe set | **`wear <set>`** — a stanza on the *shipped* `wear`, beside `wear <item>` |
| butchery | **`dress`** — left free for whoever builds that pack |

A saved set **is** a wear: same affordance (innate, embodiment), same
semantics (these things end up on your body), one verb, two arg shapes,
**for the same act** — which is precisely what the stanza pattern is for.
Bare-name ambiguity against an item is settled by a possessive or a
set-namespaced arg (`cockpit shelf first` is the shipped precedent for
sub-command args).

⭐ **Net: this build adds ZERO verbs to the platform** for the wardrobe
affordance — the discipline sandbox-QoL and fermentation both shipped
with. If a dedicated verb is ever wanted, `don` is the honest term of art
and still leaves `dress` alone.

### ⭐ The tool ladder

*(User call: yes.)* The general store already ships the precedent —
`sewing-kit` (`{kind: mending}`) and `sewing-machine` (`{kind: mending,
rate: 3, control: fine}`): the same capability at different rates.

Drop spindle → spinning wheel → mill is that ladder exactly, and it is
the clearest **capital-deepening** story available: the wheel does not
let you do anything new, it lets you do it three times faster. Same for
the loom ladder and the tanning pit ladder.

---

## ⭐⭐ Decision 6 — fit, and the `baseMass` find

### ⚠⚠ The find: every species masses 70 kg

```
halfling    "Small, quick, and comfortable"    →  baseMass 70
dragonborn                                      →  baseMass 70
dwarf       "Stone-sturdy and stout"            →  baseMass 70
half-orc    "Broad and powerful"                →  baseMass 70
```

**No species overrides `BodyPlan.biped.baseMass`.** All seven share the
plan and inherit 70. The fiction says they are different sizes; the
engine says they are identical — and `massScaled: true` on the unarmed
fist means **combat is already reading that uniform mass**, as are
encumbrance carry capacity, metabolism basal drain and thermal mass.

Fit cannot key on a number that is the same for everybody, so this build
walks straight into it. *(User call: fix it in this build.)*

- Species get a real `baseMass` **and** a `stature`. Stature is already a
  designed concept with no field — the lineage slate lists it as
  affecting *"ranged bands, tight spaces, concealment, heat
  dissipation."*
- ⚠ This moves live numbers in combat, encumbrance and metabolism. It is
  a balance change riding a textiles MR and wants its own wave, its own
  gym run, and its own review attention.

### The model — measurements derive

- A body's measurements derive from **species stature × species baseMass
  × that individual's mass and composition**. No new authored fields on
  the character.
- A garment stamps the measurements it was **cut to**, at `cut` time,
  from whoever it was cut for.
- **Fit is the distance between the two.** Loose → air gaps → clo loss.
  Tight → mobility penalty + accelerated seam wear.

**Three things fall out free:**

- ⭐ **The tailor's reason to exist.** Stock is cut to the body plan's
  average; bespoke is cut to *you*. That is the whole economic argument
  for the trade — and it makes the char-gen freebies read correctly as
  ill-fitting hand-me-downs.
- **A secondhand market.** A garment cut for someone else fits you badly.
  No new mechanism.
- **Cross-species clothing fails properly.** A coat cut for a halfling on
  a dragonborn is not a size penalty, it is a non-starter.

### ⭐⭐ The lineage seam — build the consumer, not the variance

*(User: "the measurements will both derive and be char gen… you pick your
parents, your parents have a body build, you inherit some value.")*

[lineage-slate](./lineage-slate.md) is **shell now, generator later** —
its own phasing says the generator is *"probably one of the last things
we build before we go live."* Its body budget is **fat / muscle / bone at
one mass**, incomparable by construction.

So the split is:

> **Textiles ships the consumer and the derivation. Lineage later
> supplies the variance.**

Species-level facts make fit real across seven species *today*, with no
individual variation existing yet. Individual variance is left as a seam;
when lineage phase 2 lands, inherited body build feeds that seam and fit
gains per-character variation **with zero textiles changes**. Textiles
must not need re-opening when lineage lands.

⭐ **It runs both ways.** The lineage slate says fat is *thermal
insulation* and stature affects *heat dissipation*, but little consumes
that today. The per-part covering stack is what makes *"I am built for
the cold"* a real claim — one you cash out as clothing you do not have to
buy. **This build makes lineage phase 2 better.**

---

## ⭐⭐ Decision 7 — soiling CONSUMES `Soilable`; it does not invent one

⚠⚠ **Corrected 2026-09-02 (four-lens pass).** An earlier draft of this
slate designed a garment soiling gauge from scratch. **It is already
designed** — [room-condition-design-pack](./room-condition-design-pack.md)
(2026-08-06, planner-ready) specifies `SoilableMixin` outright, and
textiles is a *consumer*, not an author, of it.

What that pack already decided, and textiles must not contradict:

| the pack's decision | what it means here |
|---|---|
| `Soilable` lives on **items / surfaces / bodies** — banded `clean/soiled/filthy` | a garment is an item; nothing new is needed |
| **Dirt is deposited by ACTS.** *"No act → no new dirt."* It **freezes** in absence | ⚠ a coat in a wardrobe does not get dirty. Soiling is NOT time-integrated — do not model it as exposure or wear |
| Cleared by `wash` / `wipe` / `bathe` — *"acts of care, fought not watched"* | no new verb |
| Water is a **precondition, not a consumable** — where there is a tap it simply works; *"charging the care loop an errand per wash is the friction this pack exists to avoid"* | ⚠ **no soap as a washing tax.** See open question 12 for the one place a scouring agent may still be legitimate |
| Persisted as a band with **no clock stamp** — correct across dormancy *because it froze* | rides the existing persistence spine |
| ⭐ **Actor-attributed deposit/clear events** `(actor, target, extent)`, blame derived on read — *"required at build time, not retrofittable"* | ⚠⚠ **the hard constraint.** Textiles ships garment soiling WITH the event log, or it does not ship garment soiling at all |

⭐ **The apron gets stronger, not weaker, under act-deposition.** An act
deposits soil; the covering stack routes the deposit to the **outermost**
layer covering the affected part. The apron intercepts it. That is
Decision 3 and the room-condition pack meeting exactly, with no new
mechanism on either side.

### ⚠⚠ Corrected again — "soiled" is TWO concepts wearing one word

*(2026-09-02, after reading build-3's `design/cooking` at 92d042816.)*
An earlier draft of this section claimed `CraftVessel.soiled` should
"resolve onto `Soilable`." **That is wrong**, and the cooking slate had
already reasoned it out more carefully:

| | `CraftVessel.soiled` | `SoilableMixin` |
|---|---|---|
| what it asks | *is this vessel claimable for a fill?* | *how well-kept is this thing?* |
| shape | **binary — necessarily**, because a claim is binary | **banded** `clean/soiled/filthy` |
| driver | one use fills it | acts deposit, progressively |
| consumers | the vessel pool / returns loop | `restQuality`, disease risk, how a guest regards you |
| owner | crafting (bar), extended by **cooking** | [room-condition-design-pack](./room-condition-design-pack.md) |

They are **different concepts that share a word**, and cooking is right
to keep and extend the flag — `design/cooking` W1 makes `Dish extends
CraftVessel` precisely to inherit `soiled` + `wash`, which is what makes
leftovers possible and turns dinnerware into an economy.

⭐ **`DressingMixin.dressingQuality` is the one that really is a
condition gauge** (*"0 (filthy) .. 1 (clean/sterile)"*), and it should
land on `Soilable` when that ships — giving the medical vertical
*washing your rags before you use them as bandages* for free.

### ⭐⭐ Ship the SEAM, not the mechanism — cooking's pattern, adopted

The cooking slate solves the not-retrofittable problem elegantly, and
textiles should copy it verbatim:

> *"The kitchen getting messy is the room-condition pack's model;
> cooking's obligation is **one pre-registered line — when that pack
> lands, cooking acts emit the producer event.** v1 kitchens stay
> magically tidy, stated honestly."*

So textiles ships **the routing, not the gauge**:

- **In scope (W3):** the covering stack decides *which layer receives a
  deposit* — outermost over the affected part. That is genuinely
  textiles' business; it is the layering model, not a cleanliness model.
- **In scope (W5):** the pre-registered obligation — garment-soiling acts
  emit the producer event the room-condition pack specifies.
- **Out of scope:** `SoilableMixin` itself, its bands, and its attributed
  event log. Textiles does not ship a gauge ahead of the pack, because
  the events are *not retrofittable* and a second gauge would be the
  third parallel representation of one idea.

⭐ **The apron is therefore designed and seamed now, and lights up when
room-condition lands** — exactly like cooking's kitchen. Its purpose does
not depend on textiles owning the gauge.

⚠ **Coordination note:** the room-condition pack now has **two builds
waiting on it** with pre-registered obligations (cooking and textiles).
That is an argument for its priority that neither slate can make alone.

### ⭐ The wash/fade loop still stands

Independent of the gauge's home, Decision 1's loop closes:

> **Washing removes soil. It also removes colour, if the mordant was
> poor.**

The dyer's skill is measured in **how many washes the colour survives**.
`f(dyestuff, mordant, fibre)` yields a hue **and** a fastness; fastness
decays per wash; a faded coat is legible on sight. That answers the
cosmetics slate's open question 4 as **yes** and gives dyeing a durable
quality axis instead of a palette.

⚠ **Naming.** "Outfit" is **taken** — `farm-outfit.yaml` is a `Business`
(the producer-annex pattern: Business + Stock + a hand with the
`consigns` brain). Only char-gen uses "outfit" in the clothing sense
(`aspirations[].outfit`). A uniform concept must be called **livery**.

---

## ⭐⭐⭐ Decision 8 — a garment's PURPOSE is which channel it intercepts

The session's biggest find, prompted by *"why wear a lab coat beyond
roleplay?"*:

> **A garment's purpose is not a property of the garment. It is which of
> the body's exposure channels the covering intercepts.**

Nobody authors *"this is a lab coat, it reads as professional."* You
author **white, cheap, woven cotton, covers torso+arms, sits outermost,
low clo** — and lab-coat-ness *emerges*.

The codebase already states this rule, in `lib/vitals/Dressing.ts`: a
dressing *"is not a **kind** — it's a role an item plays,"* gated on
capability, never `instanceof Bandage`. Same discipline, applied to the
whole wardrobe.

So the garment taxonomy **is the channel list**:

| exposure channel | the garment that exists for it | engine status |
|---|---|---|
| cold / heat | coat, parka, sun robe | **this build** — per-part clo |
| wet / wind | oilskin, cloak | **this build** — `WetMixin` + weave density |
| mechanical harm | armor, boots, butcher's glove | ✅ ships (`Construction` resist) |
| **soiling** | **apron, lab coat, overalls** | **this build** — outermost takes it |
| light into the eyes | tinted goggles, brimmed hat | ✅ `Light`/perception ships — nothing wearable uses it |
| sound | ear protection | ✅ `SenseChannel` ships — unused |
| air quality | respirator, veil | ✅ `breathableMedia` ships — unused |
| **being seen — less** | **camouflage** | ⚠ concealment reads no terrain or biome |
| **being seen — more** | **hi-vis** | ⚠ no band past `obvious` |
| identity | hood, mask | ✅ `DisguiseGarment` ships |
| carrying | belt, apron pockets, pack | ✅ `Pack` ships |
| social signal | livery, finery, lingerie | **this build** — legibility |

Worked examples:

- **Apron** — soiling, and only soiling. The purest case in the space:
  its entire reason to exist is that it is outermost and cheap. It takes
  the stain so your shirt does not. Falls out of Decision 3 for free.
- **Lab coat** — *two* channels at once, which is what makes it
  interesting: sacrificial soiling **plus** station signal. Also why it
  is white — visible soiling is the point; it advertises that you
  replaced it.
- **Hi-vis** — nowhere to go today (see Decision 10).
- **Camouflage** — the honest version is **terrain-matched**: woodland
  camo in a desert is *worse* than plain cloth. Much better than a flat
  stealth bonus, and it makes dyeing matter to somebody who is not
  shopping for looks.
- **Lingerie** — signal-only, next-to-skin, ~zero on every protective
  channel. A real and distinct point in the space, and the model needs it
  to be complete: **not everything you wear is *for* something
  physical.**

### ⚠ On adults-only content — no seam needed

Lingerie as a garment class is not adult content; it is a garment with
high signal and no protection, and every department store sells it. What
would be adults-only is **depiction**, not the existence of the point in
the space.

The architecture already answers it: a pack is a unit of review, opt-in
via `SAXONBERG_PACKS`, and may ship its own classes and content. An
adults-only pack is not a special case — it is the pack mechanism working
as designed. **So: build the full spectrum of purpose in the base chain,
author nothing that needs gating, and do not add a seam that already
exists.**

---

## Decision 9 — the social half: legibility, one brain, no kernel gauge

Everything the social half needs is already built: `belief` (per-viewer
identity memory, `describeFor`), `DisguiseGarment`
(`appearsAs`/`covers`/`masksIdentity`), `BrandedMixin` resolve-on-read,
`renown`, `regard`. The lineage slate already establishes the principle —
*"the body is public… the allocation is a social fact, not a private
optimization."*

What clothing adds is that it becomes **the highest-bandwidth honest
signal in the game.** Everything else you would read off a stranger —
renown, competence, wealth — is hidden or needs a query. Clothes are on
their body, and after this build they carry five real facts:

```
grade     ← staple length, carried from the field
condition ← Durable, wear-on-use
fit       ← cut for you, or for a body plan's average
colour    ← hue + fastness, fading per wash
brand     ← BrandedMixin, already resolve-on-read
```

None of them authored as a "quality" number. **A good coat signals wealth
because it cost wealth** — costly signalling that emerges from the supply
chain rather than being declared.

⚠ **But "on sight" is a claim this build has to earn** — worn and carried
are one undifferentiated row on the inspection card today, and no
`markupAugmenter` renders worn equipment at all. **Decision 12 is what
makes Decision 9 true**, and it is why the UX wave goes first.

### ⚠ Where the line is drawn

There is a tempting third step: have the engine read your dress into a
regard or first-impression score. **Refused.**
[measurement.md](../../measurement.md)'s split is *engine
measures · subject values*, with the no-gauge reading rules. Converting an
outfit into a number the engine then applies is precisely the engine
valuing. Let people judge; the signal is legible, the verdict is not
ours.

But NPCs need something to react to, and that has a proper home: a
**brain**, in a pack, under `src/behavior/`. A shopkeeper brain deciding
*"this one's dressed like they can pay"* is content making a judgment,
not the kernel scoring you. Per-brain, per-venue, arguable, replaceable.

So the social half is: **legibility, plus `livery`, plus one demonstrator
brain, and no kernel gauge.**

---

## ⭐⭐ Decision 10 — the concealment seam (and where it stops)

Audited 2026-09-02. Concealment is in **much** better shape than the
session expected.

**What ships:** a five-band monotone scale `obvious | subtle | hidden |
deep | buried` with per-band magnitude as AppSettings dials;
`effectivePerception = capacityOf(viewer) + attention + lightConditions`;
`perceives = effectivePerception ≥ requirementFor(concealment)`; the
`awareness` Discipline (no conferrals — universally afforded, competence
only grades); passive `hintsFor` lines rendered by `LookController` on
entry, so attention is directed and you never have to type `search` to
know something is there; sneak/walk/run as a care↔speed attention axis;
`search` as a costed engaged act holding `hands` (abortable ⇒ genuinely
ambushable), broad-shallow vs narrow-deep; and per-viewer `DISCOVERY`
belief, so **once found, always seen**.

**The gap, and it is one gap on two sides:**

```
        VIEWER SIDE                          TARGET SIDE
capacity + attention + light        vs      requirementFor(getConcealment())
         ▲                                            ▲
    no equipment term                    single AUTHORED field — no worn
                                            contribution
```

⚠ Also found: `setConcealment` has **two callers in the whole tree**
(`ArmController` arming a trap, and `Exit`). **Nothing spawns anything
hidden** — concealment is authored on rows by hand, and the census-gated
magic-item distribution does not touch it.

### What textiles takes

> **`getConcealment()` becomes derive-on-read: authored base + worn
> covering contributions.**

That is *the same architectural move as `clo`*, on a different channel.
Once it exists a camo cloak contributes negatively to its wearer's
detectability and a hi-vis vest positively, with no new machinery.

| textiles takes | [search-slate](./search-slate.md) takes |
|---|---|
| target-side derive over the covering stack | viewer-side equipment term (lenses, rings, goggles, augments) |
| the conspicuity band past `obvious` | terrain / biome matching for camo |
| | spawn-hidden distribution |
| | implicit-search cadence beyond what ships |

Textiles builds the *target* half because that is a garment; it leaves
the *viewer* half alone because a magnifying glass is not clothing. The
search pass then lands on a proven, tested
derive-on-read-over-the-covering-stack pattern.

⚠ **The conspicuity band needs care.** `obvious` is a **hardcoded 0** and
the vocabulary is documented as monotone weakest→strongest. Extending
below it means either a negative-index band or rebasing the scale.
Rebasing is cleaner, and the vocabulary is small and well tested — but it
touches trap and delve content, so it is a deliberate wave, not a
footnote.

---

## ⭐⭐ Decision 11 — magic, and the negative result that carries it

*(Added 2026-09-02. Audited against
[arcane-science.md](../../arcane-science.md) and the shipped magic tree.)*

### ⭐⭐⭐ Textiles is the trade where magic is LEAST useful — and that is the point

The chain's bottleneck is **spinning** (see the four-lens pass, Lens 1),
and spinning is neither an energy problem nor a chemistry problem. It is
*fine repetitive motor work over hours*. Magic writes initial and
boundary conditions; **there is no grid cell for "twist fibre
consistently all afternoon."**

So the one step where a mage would be worth the most is the one step
magic cannot touch. **Magic does not shortcut the bottleneck — capital
does.** That is *"why magic never industrialized"* made concrete inside a
single trade, and it **strengthens** the industrial-revolution lesson
rather than competing with it. ⚠ A design that let a mage spin would
destroy the most valuable thing this build teaches.

### Magic in the SUPPLY CHAIN leaves no residue — Kell's Partition

> *Every magical act is either an **impulse** — a delivery of energy,
> after which the world takes over — or a **binding** — a state held away
> from equilibrium, which must be continuously topped up.*
>
> *A firebolt's fire, once lit, is **ordinary fire**. It has no author
> and nothing can un-light it.*

Applied to the chain, this settles the "magic clothes" question outright:

| the act | the product |
|---|---|
| `create·fire` brings a dye vat to temperature | an **ordinary** hot dye vat |
| `control·water` drives a retting tank | **ordinary** retted flax |
| `create·light` lights the weaving floor | **ordinary** cloth |

⚠ **There is no mechanism by which cloth remembers how it was made.**
That is the physics, not a scoping decision, and the slate should not
invent one.

⭐ **What that makes a mage, instead: capital.** The economic corollary —
*"excellent at what happens ONCE and poor at what must be HELD… furnace
over firebolt for sustained heat"* — says a mill would use a mage on the
**once** steps (bring the vat up) and never the **held** ones (keep it
there; a furnace wins). A mage in a mill is the **same category as the
spinning wheel**: a labour-saving device with a running bill, sitting on
the tool ladder beside the wheel and the loom. Which is a far better
place for magic in an economy than a quality modifier.

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

Voss Decay: *"a veil erodes fastest under attention — the thing pushing
back is the observers' own accumulating evidence, and the more of it
there is, the faster you pay."*

So a **mundane** hood that reduces attention makes an **arcane** veil
binding *cheaper to hold*. `DisguiseGarment` and the veil are the same
job attacked from opposite ends, and the cheap mundane half subsidizes
the expensive magical half — a garment doing real arcane work **without
carrying a single joule**. It also composes with Decision 10's
covering-stack concealment contribution, so all three seams meet on one
object.

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

### What the audit actually found

⚠ An earlier reading of this concluded *"nobody can see your clothes,"*
from the prose path alone. **That was wrong** — there are two render
paths and the card one carries clothing today:

- `look <person>` opens a **live, subject-bound inspection card**
  (`CardApi.open(context, 'subject', …)`), projecting `DETAIL_FIELDS`:
  `displayName · quantity · primaryKeyword · shortDescription ·
  longDescription · illustration · details · bulkMaterial · mass ·
  contents · exits`.
- `WearController` calls **only** `giver.occupyAll(target, slots)` — it
  never touches containment. A worn garment stays in inventory *and*
  occupies slots, so **it is in `getContents()` and does reach the
  client.**

⭐ **And the "non-obviously carried" model exists** — three live
mechanisms, better than a prose filter:

| mechanism | what it does |
|---|---|
| `PerceptionApi.perceives` in the `contents` descriptor | ⭐⭐ **honest fog on the wire** — a concealed, undiscovered item never enters the client payload *at all*. Not hidden in the UI; never sent |
| `ContainmentApi.looseContents` | surface-resting items render under their surface, found by `look <surface>` |
| containment nesting | what is inside your pack is the *pack's* contents, not yours |

**The real gap is presentation, not data.** There is no `worn` field and
no slot grouping, so a coat you are wearing and a coat in your pack are
the same row: *"a wool coat, a linen shirt, a loaf of bread, a hammer"*
says nothing about which two are on your body. And on the prose side,
**thirteen shipped `markupAugmenters` and not one renders worn
equipment.**

### ⭐⭐ The card ENUMERATES; the prose SUMMARIZES

The governing rule, and it is the one that keeps them from duplicating:

> **They are two resolutions of the same subject, not two subjects.**

That is how perceiving a person works — you get an impression (*well
dressed, travel-stained, good boots*) and you look closer for the list.
It also kills the restatement problem by construction: **prose that
enumerates is just a worse card.**

| surface | job |
|---|---|
| the **card** | the precise, complete, mechanical list — worn and carried, laid out separately |
| the **prose** | the *gestalt* — never an inventory |

The prose block has two sources:

- **Authored half** — what the card can never tell you: bearing, manner,
  the scar, how you hold yourself. Free text, the player's, on
  `PersonaMixin`'s claimed layer.
- ⭐ **Derived half — the impression line.** The aggregate of the five
  facts Decision 9 puts on a garment (grade, condition, fit, colour +
  fastness, brand), summarized: *"Dressed well, but soaked through."*
  *"Everything he owns has been patched."* **The fourteenth
  `markupAugmenter`** — a shipped pattern with thirteen instances — tuned
  to **summarize rather than enumerate**, which is exactly what makes it
  not a restatement.

### Decided

1. ⭐ **`worn` is a SEPARATE projection field**, not a flag on `contents`
   rows. A flag would be cheaper, but the body-vs-pack **layout**
   distinction is the entire point, and the client should be able to lay
   them out as distinct sections rather than filter one list.
2. **The impression line ships in this build.** It is the part that needs
   real prose craft and is easiest to get thin and repetitive — which is
   an argument for doing it with attention now, not bolting it on later.
3. ⭐⭐ **W1a lands BEFORE the chain.** See below.

### ⭐⭐⭐ Why the UX goes first

> *"If clothes don't look good, then how can we expect anything else to
> look good?"*

The `worn` field, the worn-vs-carried card layout and the impression line
are **not textiles features.** They improve every object in the game;
clothes are only the forcing function that exposes them. Burying them
behind eleven waves of supply chain gets the ordering exactly backwards —
and W1a **pays off across the whole game whether or not the rest of this
chain ever ships**, which is the strongest possible argument for a wave.

### ⚠ The market: Fortnite's model is a MINT, and cannot be imported

A skin in Fortnite is **created from nothing and sold**. This economy is
conserved — every good comes from the chain. Importing that model means
punching a faucet through the middle of the thing.

⭐ **But the appeal transfers, and improves.** What makes a skin
desirable is scarcity plus provenance — *"I paid,"* or *"I was there in
season three."* This world has **real** scarcity (the chain) and **real**
provenance (`authoring_events` ships). So:

> **A garment here can mean more than a skin, because somebody actually
> made it.**

That is Decision 9's costly signalling with the customization market as
its payoff, rather than a cosmetic layer bolted beside the economy.

### ⚠⚠ Re-sort the build around the BUYER

The closest real analogue is FFXIV, where glamour is enormous and a
minority of crafters supply nearly everyone. Expect the same shape here —
**overwhelmingly buy, not make** — and that is *good*: if everyone made
their own clothes there would be no tailor and no livelihood.

⚠ **But every wave in the original plan is producer-side.** The slate
optimized for the person at the loom, which is the wrong majority. A
buyer needs to find clothes they like, know what they are getting,
commission something specific — and above all **change their look without
re-buying.**

⭐⭐ **Which reprioritizes one pack sharply: dyeing is the customization
market's core loop, not tailoring.** You buy a garment rarely and
recolour it often, so dyeing is the **highest-frequency player-facing
surface in the entire chain** — not the third-listed customer of the
other two. It is also where the wash/fade loop (Decision 7) becomes a
retention mechanic rather than an attrition one.

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

⭐⭐⭐ **Spinning is the bottleneck. Name it, and tune for it.**

The textile industry is *where the industrial revolution happened*, for a
specific and teachable reason: it took roughly four to eight spinners to
keep one weaver supplied. Kay's flying shuttle then roughly doubled
weaver output and made the shortage acute — so **spinning mechanized
first, because it was the constraint**, and the power loom followed to
let weaving catch up.

That entire sequence is nearly free here, because it is a **ratio, not a
mechanism**. If `spin` and `weave` carry honest labour times:

- players *discover* the bottleneck instead of being told it
- the pressure to buy the wheel is felt, not authored
- and buying it **moves the constraint downstream to the loom** — so
  *"improving one stage creates a crisis in the next"* is lived

⚠ This is a **tuning obligation on W8**, not a feature. If the two verbs
get arbitrary durations the lesson silently does not happen and nothing
fails.

⭐ **Populate `composition` / `chemistry` on the fibre rows.** Cellulose
vs protein is the master distinction in textiles — it decides what dye
takes, what mordant is needed, what dissolves the fibre, how it burns,
how it answers alkali. Wool dissolves in bleach; linen does not. Wool
takes acid dyes directly; cellulose needs a mordant or a vat. Every
shipped textile material row already carries `composition: []` and
`chemistry: null` — **the field exists and is empty.** It also gives
`f(dyestuff, mordant, fibre)` a real third axis instead of a table.

### Lens 2 · Creative expression — one architectural hole

⚠⚠ **Forms are a kernel enum; materials are template rows.**

```
a pack CAN add a fibre    →  /stuff/idea/material/textile/hemp.yaml     ✅ (trade-fuel ships ash + charcoal this way)
a pack CANNOT add a weave →  ARMOR_FORMS = [...] as const, kernel .ts   ❌ (gated by Construction.isForm)
```

So a pack can invent a new fibre but not lace, netting, brigandine or
scale — which collides with the metal-chain rule that **a pack must never
need a kernel list edit**. Decision 2 asserts one covering vocabulary
without saying who may extend it.

⭐ **The likely answer is a split, and it is principled rather than
convenient:** a form's *resist profile* is combat mitigation, and letting
content author that is a real objection — but a purely-textile form
(drape, loft, weave density, no resist contribution) has no such
objection. So: **resist-bearing forms stay a closed kernel vocabulary;
non-resisting textile forms become template rows.** Left as open question
9 rather than decided, because it changes `Construction`'s shape.

⭐ **Patterns are silent, and shouldn't be.** Tailoring cuts to a
*pattern* and the slate never says what one is. A pattern as authored
content — better, as something a **player** can design, name and sell —
is the largest creative-expression opportunity in the build. Open
question 10.

### Lens 3 · Roleplay & immersion — one practical hole

⚠⚠ **Getting dressed must not be eight commands.**

`wear` takes exactly one target (`type: object, required: true` — no
`all`, no set). A per-part layered stack across head / torso / legs /
feet / hands with skin / mid / shell layers is potentially eight to ten
invocations — every morning, and again after every wash. That is a chore,
and it would sour the build in its first live drive.

The design needs a **saved dressing set**. ⚠ "Outfit" is taken (a
`Business`), so the concept is a **wardrobe** — and it costs **no new
verb**: `wear <set>` is a stanza on the shipped `wear` (settled with
build-3, § Decision 5). The `wardrobe.yaml` fixture already exists as a
furnishing, which is the natural place for one to live. Wave W4a.

*(The soiling half of this lens resolved differently — see Decision 7.
The room-condition pack had already decided that water is a precondition
rather than a consumable, precisely so the care loop is not a chore tax.
The worry was real; the answer was already written.)*

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

Kernel first, then packs — the metal-chain shape.

| wave | what | why here |
|---|---|---|
| **W0** | `Construction`: the covering rename + textile forms + depth | everything reads it |
| **W1** | `Garment` composes like `Armor`; the nine clothing rows gain material + form + mass | the chain needs a real terminus |
| ⭐⭐ **W1a** | **the UX wave** — `worn` as a separate projection field, worn-vs-carried card layout, the impression augmenter | ⭐⭐⭐ **before the chain.** Not textiles features: they improve every object, and pay off whether or not the chain ships |
| **W2** | species `baseMass` + `stature`; the balance pass + gym run | ⚠ moves live combat/encumbrance/metabolism numbers |
| **W3** | per-part covering stack: `covers:` walk, clo derives, wet feeds it | the thermal payoff |
| **W4** | fit: derived measurements, cut-to stamp, the lineage seam | needs W2 |
| **W4a** | the **wardrobe** set as a stanza on shipped `wear` — `wear <set>` | ⚠⚠ eight commands to dress would sour the build; ⭐ **zero new verbs**; rides the existing `wardrobe` fixture |
| **W5** | soiling — the **pre-registered producer-event obligation** + the wash/fade loop. NOT the gauge | ⚠⚠ `SoilableMixin` is room-condition's; its events are not retrofittable, so textiles ships the seam (cooking's pattern) |
| **W6** | `getConcealment()` derive-on-read + the conspicuity band | the camo/hi-vis seam |
| **W7** | `trade-farming` rows: flax, cotton, madder, weld, woad | content only, existing pack |
| **W8** | `trade-textiles` pack: ret · scutch · spin · weave · full + the tool ladder | the faucet. ⭐⭐⭐ **carries the spinning-bottleneck tuning obligation** |
| **W9** | `trade-leatherwork` pack: tan + the tannery as a zoned nuisance venue | parallel input; produces `hide-stock` at last |
| **W10** | `trade-dyeing` pack: dyestuffs, mordants, fastness | ⭐⭐ **the customization core loop** — highest-frequency player surface; buy rarely, recolour often |
| **W11** | `trade-tailoring` pack: cut · sew · livery; the jerkin recipe leaves smithing | closes the loop |
| **W11a** | the **hood/veil interlock** — mundane attention reduction subsidizes an arcane binding | ⭐ Decision 11; meets Decision 10's concealment seam on one object |
| **W12** | content placement + the demonstrator brain | expression |

---

## Open questions

1. **Which locality gets which trade?** Terminus has a rostered `tailor`
   and 52 built rooms; Hinkley Hills is the farming locality and wants
   the dye plants; the tannery is a nuisance trade wanting industrial
   zoning and may not belong in either. This is the cosmetics slate's
   open question 9, still open.
2. **Is `dyeing` its own Discipline, or does it ride `apothecary`?**
   Cosmetics open question 1, unchanged. Extraction overlaps; a dedicated
   `dyeing` is cleaner but adds a roster row.
3. **How many dyestuffs × mordants?** Cosmetics open question 2. Three
   dyestuffs × four mordants is twelve outcomes from seven authored rows;
   the multiplicative shape is the point, the counts are not settled.
4. **Does cotton ship in stage one, or only flax + wool?** Cotton needs a
   warm biome and a gin; flax needs neither. Possibly a later crop.
5. **Does `stature` want to be a scalar or a two-axis (height × build)?**
   Fit reads better with two; every other consumer named in the lineage
   slate reads fine with one.
6. **Does felting need `full`, or is felting its own verb?** Fulling
   woven wool and felting loose fibre are different acts that share a
   mechanism (heat + agitation + moisture). One verb or two.
7. **What produces `hide` before ranching?** Leatherwork's faucet is an
   animal. Hunting? Butchery of an existing Creature? Or does
   leatherwork's left edge wait on ranching the way wool does — in which
   case W9 ships the *tannery* against imported hide.
8. **Does the conspicuity extension rebase the scale or add a negative
   index?** See Decision 10.

### Added 2026-09-02 (the four-lens pass)

9. ⚠⚠ **Who may extend the covering-form vocabulary?** Forms are a kernel
   `as const` enum; materials are template rows a pack can add. The
   proposed split — resist-bearing forms stay closed, purely-textile
   forms become rows — changes `Construction`'s shape and wants deciding
   before W0, not after.
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
13. **What are the honest labour times for `spin` and `weave`?** The
    spinning-bottleneck lesson lives entirely in this ratio (see the
    four-lens pass, Lens 1). Needs real numbers, not placeholders.
14. ✅ **RESOLVED 2026-09-02 — the `dress` collision.** Settled with
    build-3: `scutch` for flax, `wear <set>` for the wardrobe, `dress`
    left free for butchery. Zero new verbs. See Decision 5.
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
[cosmetics-slate](./cosmetics-slate.md) (⭐⭐⭐ *dye is a textiles input*;
open questions 1, 2, 4 and 9 carried forward) ·
[trade-roster-slate](./trade-roster-slate.md) (`textiles` + `leatherwork`
GAP rows; `tailor`/`tanner` rostered) · [vocations.md](../../vocations.md)
(`barber / tailor`, `miller / tanner` GAPs) ·
[launch-worklist.md](../../launch-worklist.md) (the deferred tailoring
branch + its fiber-faucet condition).

**Depends on / seams with:**
[room-condition-design-pack](./room-condition-design-pack.md) (⚠⚠ **owns
`SoilableMixin`** — textiles is a consumer; its attributed events are not
retrofittable) · [lineage-slate](./lineage-slate.md) (the
body-composition budget; textiles ships the consumer, lineage the
variance) · [search-slate](./search-slate.md) (the viewer half of
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
[fermentation.md](../../subsystems/fermentation.md) (retting's clock) ·
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
