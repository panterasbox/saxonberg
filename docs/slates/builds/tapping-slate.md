# Tapping slate — the yield that does not kill the organism

> **Status: UNBUILT** — every piece it needs ships, in three separate
> places that do not know about each other: the tap vocabulary
> (`TapSpec` on `Species.production[]`, **kernel**), the worked-act
> protocol (`lib/ground/Workable.ts`, kernel, extraction MR !291), and
> the evaporative maturation mechanism + its two vessels (`salt-pan` as
> a `Vat` row, `brine-hearth` as an `Oven` row, `trade-quarrying`).
> **Left:** the `Tappable` shape + the `tap` verb · `TapSpec`'s window
> predicate · `ProducingMixin`'s promotion out of `trade-ranching` ·
> a `production:` block on Scots pine (resin, **the species row already
> ships**) · one new species row for the sap tree · the sap → syrup
> maturation profile + the sugarhouse's two rows · the spile and the
> hung vessel · the stand-level tappable-stem read.
> **Size:** a build — it is one verb, one declared shape, two data
> blocks and four rows, but it amends a kernel interface and touches a
> shipped trade, so it wants a cycle rather than a tail.

Opened 2026-09-25, out of a question that started somewhere else: *we
shipped forestry without ever discussing maple syrup or rubber — is that
farming, forestry, or something different entirely?*

The answer is **something different**, it has a name the codebase already
uses, and finding it turned up the shape six shipped systems have each
discovered separately.

---

## ⭐⭐⭐ The finding: every RGO is one thing, and depletion is a special case

The six shipped resource-gathering operations — mining · farming ·
ranching · fishing · forestry · water — were each designed on their own
terms. Read together they are one law:

> **An RGO is a RESERVOIR with a RECHARGE law, drawn by an ACT, crediting
> a DISCIPLINE.**

| RGO | the reservoir | the recharge law |
|---|---|---|
| deposit — mine · quarry · turbary | the band | ⭐ **zero** |
| fishery | `capacity` = Liebig fit × abundance × length | half-life on `drawn` |
| soil | the four reserves | fallow · manure · rain |
| stand | standing volume | growth |
| crop | the polycarp cycle | the cycle |
| **tap** — milk · wool · eggs · **sap · resin · honey** | `standing` | `perGameDay` + behaviour + window |

⭐ **Depletion is not a different mechanism from renewal — it is recharge
= 0.** That single sentence is what was missing, and it is why the
planned "RGO interface unification" reads as debt rather than a feature:
nothing was ever unified because nobody said the law out loud, so six
builds re-derived it and diverged in the details.

⚠ **The standing instruction from this conversation:** *stay ahead of
unification wherever we can.* Every RGO from here lands **on** the shape,
and the debt is paid by construction rather than by a pass. That is the
repo's own **census-then-ratchet** move ([lint-family.md](../../lint-family.md))
applied to a design shape instead of a lint: name the law, record which
shipped systems conform and how far, and require the next one to conform.

---

## Where tapping sits — the axis the taxonomy was missing

The RGO taxonomy sorts by *what ground you are standing on*, which is why
maple felt homeless. The axis it needed is **does the draw kill the
organism**:

| | organism | what you take | ships |
|---|---|---|---|
| **farming** | annual plant | its product, cyclically | ✅ husbandry's polycarp cycle |
| **forestry** | tree | ⭐ **the tree itself**, terminally | ✅ `fell` + the bole |
| **ranching taps** | kept animal | a **flow off a living body** | ✅ `milk` · `shear` · `gather` |
| **tapping** | **standing tree** | a **flow off a living body** | ❌ **the empty cell** |

Tapping is the fourth cell. It is not a new family and it is not a new
trade — it is **ranching's tap mechanism run on a forestry host**, and the
two verbs then divide the wood honestly: `fell` addresses the stand,
`tap` addresses a stem. **The terminal/renewable distinction becomes
spatial** rather than a flag on a row.

---

## ⭐⭐⭐ The tap vocabulary is already kernel, and already species-shaped

The load-bearing discovery, and it means almost none of this is new code.

`TapSpec` does **not** live in the ranching pack. It is at
`packages/server/src/mud/platform/idea/species/Species.ts`, as
`Species.production[]`:

```ts
export interface TapSpec {
  key: string;                                  // what comes out
  yieldRow: string;                             // the row a take mints
  perGameDay: number;                           // at full production
  behaviour: 'accrue' | 'expire' | 'continuous';
  windowDays: number;                           // how long neglect takes
}
```

And **trees are `Species` rows.** `trade-forestry` ships eight, in full
Linnaean paths, in the commons:
`plantae/tracheophyta/magnoliopsida/fagales/fagaceae/quercus/robur`,
`fagus/sylvatica`, `betulaceae/corylus/avellana`,
`pinopsida/pinales/pinaceae/pinus/sylvestris`, and four more.

> ⭐ **The kernel already believes a tap is a SPECIES fact, not a
> livestock fact.** A maple carrying `production: [{key: sap, …}]` is the
> same row shape a cow uses for milk, and it works at the data layer
> today.

Two consequences:

1. ⭐ **Scots pine already ships.** The resin tree is authored. It wants a
   `production:` block and nothing else.
2. The sap tree is **one new species row**.

The only livestock-bound piece is **`ProducingMixin`**, at
`packages/content/trade-ranching/src/lib/Producing.ts` — a pack `lib/`. A
maple cannot compose it without `trade-forestry` depending on the cattle
pack, which is absurd, and that is precisely the promotion trigger
CLAUDE.md states: *substrate goes to the KERNEL when its composers have no
common pack ancestor; a third pack wanting a mixin without depending on
its owner is the signal.*

⚠ **Note which build forces it.** Bees ride *on* ranching
(`ranching.md § Not built: bees`, D34–D39, severable, **AC 14 unmet**), so
they compose it in-pack for free. Dairy is downstream of a shipped tap.
**Tapping is the first foreign composer, so tapping owns the promotion** —
and it should not be done earlier, because a promotion designed against
one consumer gets the interface wrong.

---

## ⭐⭐ The act: `Tappable` beside `Diggable` and `Splittable`

Extraction shipped the right protocol and stated its own doctrine
(`lib/ground/Workable.ts`):

> ⭐⭐ *These are declared SHAPES, not mixins, and nothing in the kernel
> composes them. `dig` and `split` are the platform's verbs; what they
> talk to is a pack's.*

It carries the whole RGO act contract already:

- **two phases** — `planWork` (no side effects, answers a `WorkPlan` or a
  `WorkRefusal`) → `completeWork` (once, at completion, with the plan's
  opaque `token`), because a swing is an engagement and **a barge-in must
  leave the world as it was**;
- ⭐ **the refusal is the host's own sentence**, never the verb's;
- ⭐ **`WorkResult.credit`** — *"what lets a platform verb earn a trade's
  competence without the verb knowing the trade exists."*

So: **declare `Tappable` next to `Diggable` and `Splittable`**, sharing
that spine. `tap` is a platform verb; the host answers. The god-verb test
transfers verbatim:

> **If a new tapping case needs the CONTROLLER to branch on what kind of
> tapping it is, it is not `tap`.**

### ⭐ And this collapses the phase problem

The worked act is **boring the hole and setting the spile** — a swing,
with a tool (an auger), which is `Workable`'s shape exactly.

**The vessel hung on the spile is the reservoir.** It fills over game time
as **bulk**, in a `Bulkable` vessel, standing in the world where a player
can see it.

⭐⭐ **There is no collection verb.** You take the bucket. Shipped
containment does the rest, shipped `pour` moves it, and the bulk/discrete
phase question never arises because nothing is ever minted discrete.

⚠ That is a genuine divergence from ranching, where `standing` lives
*inside* the animal (the udder is the reservoir). Both are "a reservoir
somewhere"; the difference is whether it is internal to the organism or
in a vessel you attached. **That is content, not contradiction** — but it
is the reason `TapSpec` needs a phase concept and the reason the two
should be designed together rather than in sequence.

---

## ⚠ The one real gap in `TapSpec`: there is no WINDOW PREDICATE

`windowDays` says how long neglect takes. **Nothing says when the tap is
open.** And all three converging designs need exactly that, for three
different reasons:

| tap | the window opens on |
|---|---|
| **milk** | calving — an **event** |
| **honey** | the nectar flow — a **biome / floral-season** read |
| **sap** | ⭐ **freeze–thaw** — nights below freezing, days above: a **weather** read |

The idiom is already set, one subsystem over, and it is the right one.
`ranching.md` on breeding: **a photoperiod SEASON, not a date** — *"the
refusal names the daylength, because 'the days are still too long, she
will not take' is something a player can act on. Nobody authors a lambing
date, and that is the whole idea."*

> **`TapSpec` grows a window predicate, the host evaluates it, and the
> refusal names the reason in the host's own words.**

⭐ Sap is the case that most rewards it: the maple run is **genuinely a
weather mechanism**, and the rate is a derived read off the shipped
procedural weather field. Nobody authors a sugaring season; the climate
produces one, and a warm winter is a bad year for a reason the player can
name. ⚠ Not yet confirmed against the code: whether the weather field
exposes a usable diurnal swing at the needed resolution. **Confirm before
committing to freeze–thaw as the literal predicate** — the fallback is a
photoperiod-plus-temperature band, which is the breeding shape verbatim.

---

## ⭐ Sap and resin are two mechanisms, and the shipped vocabulary already separates them

| | what it is | behaviour | product |
|---|---|---|---|
| **sap** | a seasonal **pressure flow** — freeze–thaw drives it | **`expire`** — the run ends when the buds break | → `sugar` |
| **resin** | a ⭐ **wound response** — you cut, and the tree answers | **`accrue`** — it keeps oozing and hardens | → pitch · tar · turpentine · varnish |

Both land inside the existing three-behaviour vocabulary with nothing
added, which is decent evidence the vocabulary was right the first time.

⭐ **Resin-as-wound-response is the conceptual bridge to latex** — same
act, same shape, different consumers and a different epoch. See
*The rubber question* below.

---

## ⭐⭐ Sugar: the last orphan root, and it now has two producers

The extraction census found exactly **two** root categories consumed by
recipes and produced by nothing. `salt` was built in MR !291. **`sugar` is
still open** — no cane, no beet, no honey — and apiculture was slated as
its answer.

**Maple is a second, independent producer of the same root.** So the two
must be decided together, and the good news is that **the shipped
mechanism already differentiates them for free**:

`spoilage.md` computes water activity as
`a_w = base · moisture · (1 − solute)`, and `CuredMixin`'s solute term is
the preservation hurdle. Honey *is* the substance that does not spoil
because of exactly that term; syrup is not.

| | what it is for |
|---|---|
| **honey** | ⭐ a **preservative** — the hurdle, alongside salt, which now has a producer |
| **maple syrup** | a **sweetener** — the `simple-syrup` consumer, flavour, calories |

⭐ Two producers of one root that are **not substitutes**, distinguished
by arithmetic that already runs. ⚠ **Hand this to the apiculture design
before honey is modelled as generic sugar** — it is much harder to
retrofit a distinction than to author one.

---

## ⭐⭐ The boiling is already built — twice

The cheapest finding in the slate. Extraction shipped an `evaporative`
maturation mechanism and both of its vessels, and the sugarhouse is the
saltern with a different liquor in the pan.

| the saltern (ships) | the sugarhouse |
|---|---|
| `salt-pan` — ⚠ **a `Vat` ROW, not a class**: a vessel with a bulk interior standing open to the sky | the same row, different capacity |
| `brine-hearth` — ⚠ **an `Oven` ROW**: `Oven` composes `ContainerMixin`, so the pan goes **in** the hearth, and `ThermalMixin.heatSourceK()` already reads a thing's container for a lit furnace | the evaporator, verbatim |
| `brine.yaml` — `mechanism: evaporative`, `productFraction: 0.1`, `stallBelowK: 273`, `damageAboveK: 400` (*"boiled dry and burnt to a bitter scale"*) | ⭐ `productFraction: 0.025` — **the real 40:1 sap ratio** — and `damageAboveK` is scorched syrup |

The pan row says it itself: *"A second saltern anywhere is this row
again."*

⭐ **Solar versus fired is the same choice salt already makes**, and it
comes out right without being designed: a salt pan concentrates in the
sun over weeks, but 40:1 of sap will ferment long before the sun gets
there — so sugaring is the **fired** branch, and the brine hearth's
`Evaporation` heat term (capped at 373 K, *"a hotter hearth boils faster
and never faster than boiling"*) is exactly the mechanism.

### ⭐⭐ And it makes the wood contest five-way

The brine hearth's own comment already names the tension: *"the fuel
competition was already designed as part of the wood contest."* The
forestry slate counts that contest four-way — charcoal, mine timber,
hearth firewood, construction.

> **Sugaring makes it five, and it is the only one that burns wood from
> the same stand it taps.**

Historically exact — a sugarbush ran on its own woodlot — and it is a real
decision about one piece of ground, made by one player, with no balance
table anywhere.

---

## Decided

1. **Host = the individual standard**, not the stand. `fell` addresses the
   wood; `tap` addresses a stem. Reuses the shipped `plant` →
   `Panel.occupy` → standard pipeline, so **a sugarbush is a planted panel
   on a long rotation** — the coppice shape with different numbers. A
   stand-level "how many tappable stems" read is **derived**, never a
   second mechanism. *(Lenses: pedagogy + creative expression both choose
   this limb — silviculture is stand management, but a spile goes in a
   tree.)*
2. **Over-tapping is REFUSED at a cap, not modelled as injury.** Girth
   decides how many spiles a stem takes; exceeding it refuses and names
   the girth. *Expression is inelastic* — a slow-injury model buys nothing
   a player can act on, and the refusal is the progression UI.
3. **No new pack.** `trade-forestry` owns it. Extraction proved a trade
   can ship no verbs and no controllers at all.
4. **`ProducingMixin` is promoted by THIS build**, not by the bee wave and
   not by the unification pass.
5. **No collection verb.** The vessel is the reservoir; you take the
   bucket.

## Open

1. ⚠ **`Tappable extends Workable`, or a sibling sharing the spine?**
   Setting a spile is genuinely a swing with a tool; a cow is not. Lean:
   **sibling**, so the plan/complete + refusal + credit spine is shared
   without claiming a lactating animal is worked ground. Decide at
   requirements, with the retrofit of `milk`/`shear`/`gather` in view.
2. **Does `tap` subsume `milk`/`shear`/`gather`, or sit beside them?**
   The `dig`/`split` precedent says **two verbs over one protocol is
   fine** — keep the pretty verbs, share the shape. Lean: keep them.
3. **Which trees.** Resin: Scots pine ships. Sap: birch is thoroughly
   Old World (Baltic, Scandinavian, Russian) and therefore the safest
   in-epoch choice; maple is the recognisable one. ⚠ Note this has **no
   epoch problem either way** — a spile and an open pan are medieval or
   earlier. That is the contrast with rubber.
4. **The window predicate's shape** — a declared band the host evaluates,
   versus a host-side hook. Lean: declared, so it is data like the rest of
   `TapSpec`.
5. Whether the stand's vigor (`StandMixin`, derive-on-read from the room's
   own soil moisture) is the `perGameDay` scalar — the `flesh` analog. It
   is the obvious candidate and it is already computed.

## ⛔ Not in scope

- **The dairy vertical.** Milk is ranching's and the dairy is its own
  design, running in parallel. Tapping touches it only through the shared
  `TapSpec` amendment.
- **Apiculture.** The bee wave is `ranching.md`'s (D34–D39, AC 14). This
  slate owes it two things and takes nothing from it: the **honey/syrup
  distinction** above, and *do not fork the tap contract*.
- ⚠⚠ **Minting.** `ranching.md`'s warning governs here and is more
  tempting to break, not less: *a tap fills from the production slice and
  **mints nothing** — never `Stock`'s `par` semantics, which is a faucet
  wearing a hat.* A hive forages for free and a tree just stands there, so
  there is no feed bill to make the accounting honest. **The reservoir
  must be bounded and the recharge must be priced.**

---

## The rubber question — deliberately later, and for a reason worth recording

Carried forward from the extraction slate, which was retired with the
build:

> *Oil, gas, rubber — a later epoch. Nowhere yet, deliberately; `rubber`
> ships as a material with zero consumers and should stay that way until
> something needs it.*

⭐ **Rubber and sap are the same mechanism and opposite design problems.**

- **Sap passes the demand test today**: `sugar` is a live orphan root,
  consumed by a shipped recipe with no producer. `vocations.md` criterion
  1 is satisfied before anything is built.
- **Rubber fails it**: `organic/rubber` has **zero consumers**. It is a
  material waiting on a build, not a root waiting on a producer.

So rubber is a **demand-side vertical**, not an RGO gap. Opening it means
building its consumers first — waterproofing, gaskets, elastic, insulation
for the electricity subsystem, tyres and therefore vehicles — and
pre-vulcanisation latex is a curiosity, which collides with *trades ship
medieval and advance by Discipline*.

⭐ **The payoff of doing tapping properly is that rubber then costs almost
nothing.** Latex is a wound-response exudate — resin's mechanism exactly.
When the epoch and the demand arrive, rubber is a species row, a
`production:` block and a consumer chain. **The act is already built.**

⭐⭐ **Amended 2026-09-25 — rubber got its own slate, and the framing
above is half wrong.** *"Zero consumers, so leave it"* treats demand as
a fact when demand is **authored**: if the world only ships medieval,
criterion 1 refuses every post-medieval material forever. The real
blocker is that the **industrial epoch has no on-ramp** — the doctrine's
delivery mechanism was conferral, and conferral is retired. See
[rubber-slate](./rubber-slate.md) and
[inquiry-slate § From law to technology](./inquiry-slate.md).
**Latex remains tapping's mechanism exactly**, so this slate still
carries rubber's supply side.

---

See also: [forestry.md](../../subsystems/forestry.md) ·
[ranching.md](../../subsystems/ranching.md) ·
[maturation.md](../../subsystems/maturation.md) ·
[spoilage.md](../../subsystems/spoilage.md) ·
[field-substrate-slate](../tails/field-substrate-slate.md) ·
[api-normalization-slate](./api-normalization-slate.md)
