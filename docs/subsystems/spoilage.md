# Spoilage

Food goes off, and the reason it goes off is a **population**, not a
timer.

Every `Thing` carries a `microbial load` in `[0, 1]` — the fraction of
its spoilage flora's carrying capacity that has actually grown. The band
a player reads (`fresh` / `tainted` / `spoiled` / `rotten`), the smell on
a `look`, and the ptomaine dose an ingest folds in are all **derived**
from that one number. Nobody anywhere authors "this stew is off".

Source: `lib/material/Freshness.ts` (the mixin + the shared arithmetic),
`lib/material/Material.ts` (the two tabulated constants), the
`freshness.*` dials in `lib/config/AppSettings.ts` and their seeds in the
platform pack's `content/settings/freshness.yaml`. Read alongside
[thermal.md](./thermal.md) (the gauge asks its host what temperature it
is), [metabolism.md](./metabolism.md) (where the dose lands) and
[bulk.md](./bulk.md) (the blend half of the gauge).

## The rate law

```
μ = μ_max · f_T(T) · f_aw(a_w)          growth, logistic toward capacity
```

Two terms, and each is the honest one:

- **`f_T`** is **Arrhenius** over the food's own tabulated activation
  energy (`Material.spoilActivationEnergy`, J/mol; real foods sit around
  50–130 kJ/mol). Warm food spoils faster, and *how much* faster is a
  property of that food rather than a global multiplier.
- **`f_aw`** is the **water-activity** term. `Material.waterActivity` is
  how much of the material's water a microbe can actually use — fresh
  meat ≈ 0.99, a hard ration ≈ 0.64, honey ≈ 0.60, dried salt ≈ 0.15.
  Below the floor (`freshness.awFloor`, 0.60) nothing grows at all.

⭐ **That floor is the whole preservation curriculum in one number.**
Salt, sugar, drying and candying are not four mechanisms; they are one —
take the water away and the population cannot start. Nothing in the
library carries a `shelfStable: true`, and the reason a sack of salt
keeps forever is legible from its own row.

Three regimes fall out of the same law, with no branches beyond the two
temperature bounds:

| regime | what happens | why |
|---|---|---|
| below `freshness.freezingK` (273 K) | growth **pauses** | the water is ice; a thawed thing resumes where it left off — freezing is not a reset |
| between | logistic growth at `μ` | the ordinary case |
| at/above `freshness.killK` (333 K) | the population **dies** exponentially | 60 °C is the pasteurization floor: this is what cooking does |

Growth is closed-form logistic from an inoculum
(`L(t) = L₀e^{μt} / (1 − L₀ + L₀e^{μt})`) and death closed-form
exponential, so a week-long gap costs exactly what a minute does.

## The gauge

`FreshnessMixin` composes onto exactly **two** classes: `Prop` and
`Provision` — the two that carry discrete perishable matter. Bulk holders
(`Bottle`, `Receptacle`, `UnboundedReceptacle`) do **not** compose it;
their gauge is the payload field, read through `Freshness.loadOf(slot)`.

⚠ **It was on `ThingBase` — all 152 `Thing` classes — for one review
round**, which put five spoilage methods on the documented author surface
of a rock, a lantern and a pair of socks to serve those two. That is the
`callable == visible == cared-about` invariant, and it lost.

⭐⭐ **What makes the narrowing safe is a GATE, not a judgement.**
Perishability is a property of the **Material**, not the class — a `Prop`
is an anvil, a toilet or a cut of stew meat depending on its
`_materialPath`, and only 30 of the library's 107 materials tabulate an
activation energy. There is no food class to compose onto (the codebase's
own *"the distinction is the material, not a flag"* rule,
`isEdibleMatter`). So narrowing by hand risks the worst failure this
codebase knows: food authored onto an inert class would **silently never
rot**, exactly as `eat` shipped with no affordance and `feel`/`taste`
never ran.

`pnpm lint:perishable` closes that: every shipped row whose
`_materialPath` names a material that rots must resolve to a class
composing `FreshnessMixin`. CI-gating, no exemption list — a row that
legitimately holds perishable matter on an inert class is a design
conversation, not a list edit.

⚠ **What the gate cannot see, stated rather than implied:** a RUNTIME
`setMaterial(perishable)` onto a non-`Fresh` host. A gate reads authored
rows; it cannot read a craft's output assignment. The gap is narrow — the
craft paths flow material onto outputs of known classes — and it is the
price of the narrowing.

**Inert by default**, therefore, is what carries the design: a Material
tabulating no activation energy never advances past zero. An anvil does
not rot, and no flag says so.

⚠⚠ **The sparse-storage guarantee is an ORDERING, and it is easy to lose.**
`reconcileFreshness` checks perishability **before** it reads the clock,
so inert matter reads and writes nothing at all. Get that order wrong —
stamp first, ask later — and the first `look` at an anvil writes a
non-default `freshnessClockStamp` into its snapshot forever, for matter
that can never rot. It shipped that way for one review round: "two scalar
fields at their `0` defaults" was true only until somebody looked at the
thing. Two tests now pin it.

Reconcile-on-read over game-time, with **two deliberate divergences from
`WetMixin`**:

1. ⚠ **No far-past guard.** Wetness drops a long gap because real absence
   never dries you. Food rots over the *whole* absence — coming back to a
   week-old stew is the point, and it is the difference between a
   spoilage gauge and a wetness one.
2. ⚠ **No linkdead freeze.** An item has no `Interactive`, and a carried
   ration does not stop rotting because its owner dropped link.

The temperature the gauge reads is the host's own (`Thermal`), which is
why `Prop` and `Provision` — the classes every food row is over — compose
`ThermalMixin`. A cold larder and a warm windowsill are then different
answers to the same question, for free.

## The blend half

Bulk matter carries the same gauge on `BulkPayload.freshness`
(`{ load, stamp }`), reconciled through its **holder** — the vessel is the
Thermal host. Both halves call the same `Freshness` statics, so a bowl of
stew and the roast it was made from can never age by different rules.

The gauge is **seeded lazily**: a slot holding perishable matter gets one
the first time anybody asks, and nothing else does. The shadow payload
written at that moment mirrors the Material field for field
(`Freshness.materialShadow`), so every `payload ?? material` reader is
unaffected by its arrival.

⭐ **Transfers blend loads by mass on every pour** — unlike the payload's
identity, which rides into an empty vessel only. That asymmetry is
load-bearing: it is what closes the pour-to-reset exploit. Decanting a
spoiled pot into a clean bowl moves the spoilage with the matter, and
tipping half of it into a fresh pot raises the fresh one rather than
laundering the spoiled one.

## The ingest reach

`Freshness.doseFor(load)` maps a load to a `ptomaine` dose — a **curve,
not a step**: nothing at all below `freshness.dose.onsetLoad` (0.3), then
rising superlinearly, so a barely-turned ration is a bad afternoon and a
rotten one is a real poisoning.

⭐ **The dose is folded at the READ and never stored.** The food does not
*contain* ptomaine the way a nightshade contains its alkaloid; it
contains a population, and the dose is what that population has produced
by the moment you swallow it. Storing it would let a refrigerated pot
keep a dose it no longer deserves.

Two folds, one function (`Freshness.withDose`):

- **bulk** — `Freshness.ingestPayloadOf(slot)`, read by `drink`, `sip`
  and `eat`'s dish arm.
- **discrete** — `EatController` builds a transient payload from the
  target's own mixin gauge.

Downstream is the shipped metabolism path, untouched: the dose lands in
the digestion pool, absorbs into the `ptomaine` burden, bands into the
`food-poisoning` Condition, and `vomit` inside the window dumps what has
not absorbed yet.

⚠ When there is no payload, the fold **synthesizes the whole material
shadow**, because metabolism reads `payload?.nutrients ?? material…`: a
payload carrying only the ptomaine would silently drop the food's real
nutrition.

## What cooking does to it

Two different facts, and keeping them apart is the design:

- **The load** is reset to nothing when the working reached
  `freshness.killK`; below it, the inputs' loads blend through by mass.
  A lazy warm-through launders nothing.
- ⭐⭐ **…and the dose that load had already earned is deposited into the
  dish as a real, FORMED toxin** — authoring no `labileAtK`, so nothing
  later destroys it either. Heat kills the population; it does not
  destroy what the population made. Cook rotten meat and you get a
  sterile dish that will keep, and poison yourself with it.
- **The rate afterward** comes from the OUTPUT material's own constants.
  `/platform/idea/material/cooked` tabulates the fastest rate in the
  library — warm, wet, nutrient-rich, with nothing left to compete — so a
  cooked dish goes off *faster* than the raw stock it was made from.
  ⚠ That is what leftovers do, and it is the hazard the whole gauge
  exists to make real.

⚠⚠ **Cooking spoiled food does not un-poison it**, and that is true of
both halves: an *authored* dose survives unless it declares
`labileAtK` (see [metabolism.md](./metabolism.md) — a raw bean's lectin
does, ptomaine does not), and a *derived* one is deposited as formed
toxin by the kill itself.

⚠ **The second half was missing until a live drive found it.** The reset
took the derived dose with it, so cooking rotten meat produced a clean
dinner — a free lunch the design explicitly denies, invisible to a suite
that only ever cooked sound stock. Standing the kitchen up is what caught
it.

⭐ **The working heat is not the room's heat.** The craft's heat *gate*
asks whether the setup can supply the recipe's demand; what the food was
held at is the recipe's own demand. A stew simmered beside a roaring
forge was simmered, not forged, and conflating the two would have every
dish in a kitchen cooked at the hottest thing in the room.

## What a player sees

A band phrase on `look` and `smell`, never a number — the
banding-is-presentation rule. A fresh (or inert) thing says nothing at
all. The augmenter is channel-filtered: you *see* that something has
turned and you *smell* it, so a `taste` gets the palate line
([crafting.md](./crafting.md)) rather than a duplicate of the smell.

## Dials

All in `AppSettingKeys` with seeded-literal fallbacks, seeded by the
platform pack. ⚠ The per-material half of the law (activation energy,
water activity) is tabulated on the `Material` and is deliberately NOT
dialled here — a global "meat spoils faster" knob would erase the point.

| key | default | what it is |
|---|---|---|
| `freshness.muMaxPerHour` | 0.35 | max specific growth rate at the reference temperature |
| `freshness.referenceK` | 303 | the Arrhenius reference, where `f_T = 1` |
| `freshness.freezingK` | 273 | at/below, growth pauses |
| `freshness.killK` | 333 | at/above, the flora dies |
| `freshness.killRatePerHour` | 6 | the death rate above the kill temperature |
| `freshness.awFloor` | 0.60 | the water-activity growth floor |
| `freshness.awDefault` | 0.97 | assumed a_w for a perishable that tabulates none |
| `freshness.inoculum` | 0.002 | the seed population growth starts from |
| `freshness.ambientK` | 293 | what a gauge on a non-Thermal host reads |
| `freshness.band.{tainted,spoiled,rotten}At` | 0.25 / 0.6 / 0.85 | the band thresholds |
| `freshness.dose.onsetLoad` | 0.3 | below this an ingest carries no dose at all |
| `freshness.dose.scaleMg` | 900 | the dose a fully rotten serving carries |

## Calibration (what a player actually feels)

The dose curve was fitted against the **shipped** `ptomaine` seed's bands
(2 / 6 / 12) and its `clearanceRate: 0.02` per game-minute — the seed was
not moved to suit the curve. Burden ≈ `dose × potency / bodyMass`, at the
70 kg reference body:

| load | band | dose (mg) | peak burden | severity | clears in |
|---|---|---|---|---|---|
| 0.30 | tainted | 0 | — | none | — |
| 0.50 | tainted | 73 | 1.0 | none | ~1 h |
| 0.60 | spoiled | 165 | 2.4 | 1 | ~2 h |
| 0.80 | spoiled | 459 | 6.6 | 2 | ~5.5 h |
| 0.90 | rotten | 661 | 9.5 | 2 | ~8 h |
| 1.00 | rotten | 900 | 12.9 | 3 | ~11 h |

Which reads: **tainted food is unpleasant and harmless**, spoiled food
costs you an afternoon, and rotten food is a real poisoning that takes
most of a day to clear. The onset sits *inside* the tainted band on
purpose — you get a smell warning before you get a dose, so the gauge
teaches before it punishes.

⭐ The authored `spoiled-ration` (700 mg) lands at severity 2 and ~8 h,
which is a load of ≈0.92 — "rotten", exactly what that row's name and
appearance already claimed. The hand-authored row and the derived curve
agree without either being tuned to the other, which is the check worth
having.

## ⚠⚠ Fermentation is the one collision to watch

`Vat` composes **both** `FermentingMixin` and `BulkableMixin`, so a
fermenting vessel's slot is also a spoilage-gauge slot. Fermentation *is*
deliberate microbial growth; spoilage is the undeliberate kind. Two
microbial models, one slot.

**Nothing collides today**, and only because of a data fact: every
fermenting material — `wort`, `lager-wort`, `distillers-wort`,
`red-must`, `white-must`, `wash`, `ale` — tabulates **no**
`spoilActivationEnergy`, so `Freshness.loadOf` returns 0 and never seeds.

⚠ That is luck resting on a decision, not a guard. Wort is a sugary
liquid that genuinely spoils, so the day somebody tabulates an `Ea` on it
(entirely reasonable — a ruined batch is real, and the fermentation build
already models cultures and viability) a vat will accrue a *spoilage*
load while deliberately fermenting, and the ferment's own product will
read as rotten.

**Before adding a spoilage constant to any fermentable, decide which
model owns the vessel.** The likely answer is that `FermentingMixin`
suppresses the gauge for as long as a ferment is live — a working culture
IS the flora, and it out-competes what would otherwise grow — and hands
back over when the ferment completes, which is exactly when a finished
ale starts to be spoilable. That is a fermentation build's decision, not
this one's, and it is written down here so it is a decision rather than a
surprise.

## Deliberate deferrals

- **Wetness does not feed water activity.** A rain-soaked biscuit really
  does spoil faster, and the conversion from `WetMixin` saturation to an
  effective a_w is a follow-on. v1 reads the authored value only.
- **Alcohol and acidity are not modelled as preservatives.** Spirits,
  vinegar and bitters are inert by authoring no activation energy, with
  the reason recorded here rather than pretended at in the rate law.
  Staling by oxidation (coffee, oil going rancid) is not a microbial
  story and the gauge says nothing about it.
- **Dish-as-ingredient** ("stock into soup") is out of scope: the cooked
  blend base is excluded from the craft gather's intermediate test, and
  there is a negative test that says so.
