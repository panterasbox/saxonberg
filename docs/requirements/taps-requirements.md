# Taps — requirements

**Kind:** feature
**Leads from:** kernel — the `TapSpec` window predicate, `ProducingMixin`'s
promotion and the take-as-an-act are kernel substrate. ⚠ **First
consumer, in this build:** the sugarbush at Rejection's Hanging Wood
(birch and maple standards, the sugarhouse, and syrup onto four shipped
cocktails). The three shipped ranching taps are brought onto the same
act in the same build, so nothing here lands unexercised.

The game has five renewable yields taken off a living organism — milk ·
wool · eggs · honey · sap (unbuilt) — and a mechanism that fills them
honestly. What it does not have is an **act**. Four of the five are a
getter with a cooldown: one command, no duration, no vessel, no
judgment, and a clock that charges the player's real evening and pays
nothing for attendance. The hive is the exception, and the reason it
feels designed is not the sting — it is that *"nothing warns you when to
stop."* You take a box, the colony needs stores to winter, and the
choice is yours and unscored.

> ⭐⭐⭐ **The thesis: a tap is a choice between what you take now and
> what the organism can give later.** Every tap has that choice in it.
> Only the hive currently makes you make it. This build makes the other
> four do what the hive already does, and adds the one tap that has a
> season which *ends*.

Seeded by [tapping-slate](../slates/builds/tapping-slate.md), with the
tap audit and the unification frame agreed in conversation 2026-09-30.
⚠ The slate is a *tapping* slate; this is a *taps* build — the scope
grew deliberately, because adding a fifth source to a family whose
demand side has been built once would have made the problem worse.

---

## What already exists

### The mechanism — and it is the part that had the conversation

`ProducingMixin` (trade-ranching's pack `lib/`) is good design and this
build keeps its core untouched:

- the fill is scaled by **condition**, off the `flesh` reserve, so an
  animal in poor flesh gives less;
- production sits at priority 4 in the energy cascade, so **production
  dies before condition does**, with no special case;
- it reconciles on read, with a stamp, and nothing ticks;
- and it states its own conservation rule: *"⚠⚠ Nothing here mints from
  nothing… the shipped `Stock` counter's reset sweep is the right shape
  to copy and its `par` semantics is emphatically not — a counter topped
  up to par is a faucet wearing a hat."*

⭐ **The three behaviours are also already right**, and they encode
exactly the axis that genuinely differs between taps — what neglect
costs:

| behaviour | neglect costs | shipped on |
|---|---|---|
| `expire` | **the season** — she dries off for that lactation | milk |
| `accrue` | **the surplus** — past a clutch, they spoil in the nest | eggs, honey |
| `continuous` | **the quality** — a matted fleece and a hot sheep | wool |

### The vocabulary, which is already kernel and already species-shaped

`TapSpec` lives on `Species.production[]` in the kernel, not in the
ranching pack — so the engine already believes a tap is a **species
fact**, not a livestock fact. Six blocks ship:

| tap | `perGameDay` | `behaviour` | `windowDays` |
|---|---|---|---|
| milk | 22 | `expire` | 0.6 |
| honey | 0.5 | `accrue` | 400 |
| eggs | 0.05 | `accrue` | 12 |
| wool | 0.008 | `continuous` | 0 |
| (pig, dog) | — | — | `production: []` |

And **trees are already `Species` rows** — `trade-forestry` ships eight
in full Linnaean paths in the commons. A tree carrying a `production:`
block is the same row shape a cow uses, and it works at the data layer
today. ⚠ **None of the eight carries one.**

### What a tree IS, and the one that can be targeted

`forestry.md` documents four representations, deliberately. A **stand**
is a cover on a `Wood` room — `look` renders *"Oak stands here — about
twenty-four trees' worth"* — and `fell oak` works because the species
word **binds nothing**; the controller reads the raw string against the
room. A **prop** is a `details:` entry: the big oak in the oak clearing
is scenery, explicitly *"never fellable."*

> ⚠⚠ **The only individually-targetable tree in the game is a `Plant`
> standard occupying a `Panel` slot.** `fell sapling` is the one act
> that addresses one. This is not a limitation to work around — it is
> the host, and it is the limb the slate had already chosen.

⭐ And mature trees without waiting a decade are already precedented:
Heart's Delight's close ships three individually-identified cherry
trees (`as: cherry-north / cherry-middle / cherry-south`).

### The boil, which is built

The saltern is the sugarhouse with a different liquor in the pan.
`brine.yaml` is the **only** evaporative `MaturationProfile` in the game
(`mechanism: evaporative`, `productFraction: 0.1`, `ratePerDay: 0.25`,
`happyK: 283`, `damageAboveK: 400`); the `salt-pan` is a **`Vat` row**
and the `brine-hearth` an **`Oven` row**, and the pan goes *in* the
hearth because `Oven` composes `ContainerMixin` and `ThermalMixin`
already reads a thing's container. The pan's own header: *"A second
saltern anywhere is this row again."*

### The demand, which for sap is free

Recipe input slots match on a **material classification tag**, not a
thing category. So a material tagged `syrup` satisfies **gimlet · tom
collins · whiskey sour · daiquiri** with **zero recipe edits**.

⚠ Three corrections to the slate, all measured:

1. **The `sugar` root is still orphaned and this build will not close
   it.** There is no `sugar` material row anywhere; `category: sugar`
   has four consumers and no producer. **Honey did not close it,
   deliberately** — honey ships tagged `honey` + `sweetener` and *not*
   `sugar`, because *"giving it `sugar` would make every recipe that
   wants sugar accept honey silently."* Cane and beet close `sugar`, and
   `farming-slate` owns them.
2. **`sweetener` already exists as a tag** on sugar, simple-syrup and
   honey, pinned by an apiculture test — **and no recipe matches on
   it.** It is a label that gates nothing.
3. **The wood contest is two-way in shipped content, not four.** Only
   charcoal (8× `category: wood` per burn) and `timber-set` (2×)
   actually consume wood; construction has *no implementing content* —
   no sawing, no boards, no carpentry pack. Sugaring makes it **three**.
   The slate and `forestry.md` both say five; both are wrong.

### The Disciplines — no new one is needed

`silviculture`'s row already claims *"the forestry trade's three acts."*
`stockmanship` holds the ranching taps. And `TapController` already
exposes `discipline()` as a **hook**, documented as such precisely
because *"a fourth product may belong to a different trade entirely."*
There is no `confectionery` Discipline and `cooking-slate` owns the
sugar-work ladder, so syrup grading stays out of here.

### ⚠⚠ And three things that are broken or absent, found on the way

1. **Wool does not reach textiles.** `fleece.yaml`'s header says it is
   *"⭐⭐ what closes textiles' sourceless wool."* It does not: `spin`'s
   `stock` arg is `requires: StackableMixin`, and a `Provision` composes
   `Sampled ⊕ Crafted ⊕ Composed ⊕ Contaminable ⊕ WaterActivity ⊕
   ThermalDose ⊕ Freshness ⊕ Thermal ⊕ Good` — no `StackableMixin`. So
   **`spin fleece` dies at the binder** before any controller runs. Two
   shipped trades each believe the other wired it. This is the fifth
   reachability link, the silent one.
2. **Nothing consumes eggs.** No recipe slot in any pack asks for an
   egg. (Nor milk — see non-goals.)
3. ⚠⚠ **Nothing in the game can advance the clock.** No clock verb in
   any category, and the `eval` sandbox allowlist is `StuffApi · MqlApi
   · ContainmentApi · MixinApi · console · self · target`. Only
   `_advanceForTesting` reaches game time and it is `assertTestOnly`.
   **A build about seasons that open and close cannot be driven.**

### Therefore what is genuinely new here is

1. **a window predicate** — when a tap is *open*, as declared data, with
   five different openers, because today `windowDays` is a neglect clock
   and nothing anywhere says when a flow starts;
2. **the take as an act** — a duration, a vessel where one is genuinely
   needed, and a judgment that trades now against later;
3. **a relief** — standing instructions, so an appointment you cannot
   keep is discharged rather than lost;
4. **a tappable tree** — a pack-owned standard class, because the
   affordance cannot come from a row (below);
5. **one new sweetener**, with the vocabulary settled once; and
6. **a way to move the clock**, so (1) is observable at all.

Everything else is a row, a tag or a deletion.

---

## Goals

- **A tap declares when it is open**, as data on `TapSpec`, evaluated by
  the host, and the refusal names the reason in the host's own words —
  the breeding idiom (*"the days are still too long, she will not
  take"*). Five openers: an **event** (calving) · **photoperiod**
  (hens) · a **biome/floral** read (bees) · **weather** (sap) · and
  **always**, which is a legal opener and not a missing one.
- **Taking from a tap is an activity, not a getter** — it runs on the
  shipped engagement framework with a real duration, it requires a
  vessel where the yield genuinely needs one, and it is interruptible
  without the world changing (the `planWork`/`completeWork` discipline
  extraction already shipped).
- **Every tap presents a now-versus-later choice**, in its own currency,
  and the game does not score it:

  | tap | what you trade |
  |---|---|
  | milk | today's litres ↔ the length of the lactation |
  | wool | shear early — less, clean, a cool sheep ↔ late — more, matted, second cuts, a sheep that overheats |
  | honey | ⭐ ships — a box now ↔ the colony's winter stores |
  | sap | another spile now ↔ the stem's girth and next year's run |
  | eggs | ⭐ deliberately the lightest — see Surface decisions |

- **An obligation you cannot meet is discharged, not lost.** A player
  sets standing instructions and their character keeps the round. ⚠ It
  may **preserve** and never **earn**: the take happens, the yield is
  kept, and nothing is sold or banked on the player's behalf.
- **A sugar season exists, and it ends.** The run opens on the weather,
  closes at bud break, and the player is then *done* for the year.
- **Syrup is a sweetener four shipped cocktails accept**, with the
  sweetener vocabulary settled once across sugar · honey · syrup.
- **A sugarbush is a planted panel**, so a second one anywhere is rows.
- **Wool reaches a spinner** — the binder gate is closed and the fleece
  row's claim becomes true.
- **Eggs have one consumer**, so no tap in the family is a source with
  no sink except the one deliberately deferred.
- **A seasonal mechanism can be observed from inside the game**, so this
  build and every future seasonal build can be driven.

---

## Non-goals

- ⛔ **The dairy vertical** — cheese, butter, pasteurization, the dairy
  as a business, the per-species varietal, fluid milk and the cold
  chain. → **`dairy-slate`**, which this build strengthens: it ships the
  relief that *"the first business you cannot run alone"* depends on.
  ⚠ Stated plainly: **this build redesigns the milking act for a product
  nothing yet consumes.** That is accepted because the act is shared
  with four taps that do have sinks.
- ⛔ **Resin, pitch, turpentine and latex.** → **`tapping-slate`**, with
  the demand case now written into it: resin's real customer is
  **light**, and light here is not cosmetic (unlit interiors are pitch
  black; the torch already burns down; beeswax candles shipped last
  week). That makes resin the bottom rung of a light ladder, which is
  its own build. ⭐ And the epoch answer is recorded there: **tapping is
  the medieval supply of pitch, the retort the industrial one** — so
  `destructive-distillation-slate` is not a collision but lens 5
  working.
- ⛔ **Vulcanization and rubber.** → **`rubber-slate`**, blocked on
  **`inquiry-slate`**'s epoch on-ramp. A law you must not already know
  is not this build's shape.
- ⛔ **Closing the `sugar` root.** → **`farming-slate`** (cane, beet).
  This build produces `syrup`, not `sugar`, and says so.
- ⛔ **Incubation, setting and hatching.** → the breeding follow-on
  named in `ranching.md`. It is why eggs keep the lightest judgment
  rather than the most honest one.
- ⛔ **A sugar-work / candy ladder, and syrup grading.** →
  **`cooking-slate`**, which owns it explicitly.
- ⛔ **Tapping a wild tree in a stand.** Nowhere, deliberately: a stand
  is a number by design (`forestry.md`'s four representations), and
  promoting a stand member to an object is a different build with a
  different argument. **The refusal is in scope** — a player who tries
  must be told why.
- ⛔ **A real winter.** The outdoor temperature floor is **276 K**
  (295 K biome baseline, ±10 K annual, ±4 K diurnal, −5 K in a storm);
  nothing in the realm ever freezes. → a **new weather/climate slate**
  this build files, because the fix moves every shipped thermal,
  spoilage, freshness and soil-moisture dial at once. ⚠ It is why maple
  cannot run on literal freeze–thaw here (see Surface decisions).
- ⛔ **Races.** `#27-time.md` records that we have never shipped one and
  never rejected one. → stays its own open question; a sugar season is a
  clock, not a race.
- ⛔ **Retuning the world clock scale.** → `time.md`, which notes
  retuning requires re-deriving `METABOLIC_DEFAULTS` in the same change.

---

## Placement

| piece | where | why |
|---|---|---|
| the window predicate on `TapSpec` | **kernel** | `Species.production[]` is already kernel; the engine already holds a tap as a species fact |
| the tap substrate (`ProducingMixin`) | **kernel**, promoted out of `trade-ranching` | ⚠ **The promotion trigger already fired.** `trade-apiculture` imports it from `@saxonberg/content-trade-ranching/src/lib/Producing` and carries the cattle pack as a dependency *for that mixin alone*. Tapping is the third consumer in the third pack. CLAUDE.md: *substrate goes to the kernel when its composers have no common pack ancestor* |
| the take-as-an-act substrate | **kernel** | shared by three packs' verbs |
| the standing-instruction relief | **kernel** | it is the general shape of `#27`'s third relief, not a trade's |
| the clock-advance seam | **kernel** | operator/code-trust surface, not content |
| `milk` · `shear` · `gather` | **`trade-ranching`**, unchanged ownership | its verbs stay its verbs; the act beneath them moves |
| `rob` and the hive | **`trade-apiculture`**, untouched | ⚠ it is the exemplar; the contract must not fork |
| `tap`, the sugarbush, the sugarhouse | **`trade-forestry`** | no new pack. Extraction proved a trade can ship with no verbs at all; forestry already owns the wood |
| the sap tree species rows | **the commons**, `/stuff/idea/species/…` | sap is a fact about trees, not about a trade — the same reasoning that put milk in the commons (*"a cow gives it whether or not anybody is ranching"*). Forestry's eight already live there |
| sap as a material | **the commons** | same |
| syrup as a material, the pan and the evaporator rows | **`trade-forestry`** | syrup is a thing you *make*; the saltern's precedent is that the vessels are rows |
| the sweetener vocabulary | **the commons** | it spans three trades and belongs to none. ⭐ Taking it from `rgo-unification-slate` §3, which claims it today and loses the item |

⭐ **The second-instance test:** a second sugarbush anywhere is a panel
row, a species row already in the commons, and two vessel rows. No pack
code. A second *venue* for the whole trade is zero pack code, as with
every trade since the libations build.

⚠⚠ **The affordance cannot come from a row.** `Producing.ts`'s own
header records this *addressed to the tapping slate*: the ranching tap
verbs' affordance had to move back onto `Livestock` because
`collectContributions` walks **class statics only**, so there is no
instance-level *"this host has a `sap` tap → offer `tap`"* seam. The
tappable tree is therefore a **pack-owned class**, not a row on an
existing one. (Host placement proper is the plan's.)

---

## Collisions

**Rejection's Hanging Wood** is the venue, and it is already busy — which
is the point.

- ⭐⭐ **The wood contest is live there and nowhere else.** The fuel yard
  (the collier) and the Ferrow mine (timber sets) already compete for
  one supply, and `cordwood.yaml` calls that contest *"the whole reason
  the fuel yard is a business rather than a prop."* A sugarhouse burning
  wood from the stand it taps makes it three-way, **and it is the only
  claimant that burns wood off its own ground.** Felt immediately,
  priced by nobody.
- The wood has **three rooms with stands** (the ride, the oak clearing,
  the hazel cant — oak and ash only) and **three existing `Panel`s**
  (`panel-north`, `panel-west`, the fuel-yard twin). The sugarbush is a
  fourth panel; it must not disturb the three.
- ⚠ **`treeline.yaml` is deliberately not a `Wood`** — *"Nothing stands
  here worth the axe… a player standing here has no `fell`."* It must
  also have no `tap`, and for the same authored reason.
- **The provisioning store** (`provisioning.yaml`, a storekeeper, a
  store counter, the co-op business) is the supplier. The auger, the
  spiles and a pail go on its price list — ⚠ **priced on the store's
  list, never on the row** (Law 1).
- ⚠ **Scots pine stands nowhere.** Its own row says *"no venue stands it
  yet."* Out of scope here, but it is why resin has no host either.

**The word `tap`.** No verb is named `tap` and `lint:verb-collisions`
only gates verb-vs-verb, so nothing shipped breaks. But the noun is
bound as a keyword on at least nine fixtures across six packs — the beer
tap holds it as its **primary** keyword, and the lounge bar carries an
authored warning about an already-fixed disambiguation bug on this exact
word. `tap` is also an existing **tool capability** string, and *"you tap
the furnace"* is already live smelting prose. ⚠ The verb is safe; the
plan should decide knowingly that the word will mean three things in
three namespaces, and the sugaring refusals should not read as though
they are about a beer tap.

**Heart's Delight**, the apiculture locality, is **not** the venue — but
it is the second-instance proof. Its close already ships three
individually-identified cherry standards titled to Quist's business, and
its upper bench is deliberately treeless. ⚠ Do not annex it; a second
sugarbush there later must need no pack code.

**The three shipped taps.** `TapController` is the shared base for
`milk`/`shear`/`gather` and `RobController` subclasses it. Changing the
act changes all four verbs at once, which is the intent — and ⚠ the hive
is the exemplar, so the contract it already satisfies is the one the
others move onto, not a new one.

**`trade-textiles`** gains a working input it has believed in since it
shipped. **`trade-baking`** gains one egg recipe.

---

## Surface decisions

### Both birch and maple ship

Nothing exists today — no maple, no birch species row, no birch wood
material; the wood vocabulary is exactly oak · ash · beech · elm · hazel
· pine · willow · yew.

**Birch carries the honest mechanism.** Its run is driven by root
pressure at bud-swell — rising warmth and lengthening days — which the
shipped climate *can* express. **Maple ships beside it** for the
recognizable noun, on a band that reads as late winter.

⚠ **And the doc must say why maple's season is a compromise**, because
maple sap is really driven by freeze–thaw and **nothing in this realm
ever freezes.** Outdoor temperature is a 295 K biome baseline (exactly
two rows in the whole content tree set one), ±10 K annual, ±4 K diurnal,
−5 K in a storm: a floor of **276 K**, and the code's own docstring says
*"a winter night near 281 K."* The slate asked for this to be confirmed
before committing to freeze–thaw. It is confirmed, negatively.

⭐ So maple is authored on a daylength-and-temperature band now, and the
**freeze–thaw band is the row it should get** when the climate build
gives winter a real floor — at which point maple becomes the first
consumer proving that build worked. The climate finding is filed as its
own slate.

*(Lens 1 chose birch's mechanism; the user chose maple's presence. Both
limbs are recorded because they disagree and the disagreement is the
interesting part.)*

### Eggs deliberately keep the lightest judgment

The honest currency for a hen is *take the clutch ↔ leave eggs to set*,
and **setting is not built** — no incubation anywhere, and gestation is
explicitly the breeding follow-on's.

Rather than pull breeding in, eggs stay the forgiving tap **on purpose**,
and the design says so: `ranching.md` already calls hens *"the on-ramp —
laying stops in short days, photoperiod teaches itself on day one."* An
on-ramp should be the tap with the least to weigh. The accrue ceiling
already supplies a mild version (take them or lose the surplus), and the
photoperiod window is the lesson.

⭐ Recorded as a **decision, not a gap** — and the clutch choice is named
in the breeding follow-on so it is not lost.

### Resin waits, and its demand case is written down now

Out of scope, with the argument preserved while it is fresh: resin's
customer is **light**, light here is load-bearing (pitch-black interiors,
a torch that burns down, candles one week old), and the ladder — brand →
tallow → candle → lamp → gas → electric — is lens 5's spine running
through the one consumable every player needs every session. That is a
build, not a freebie. **Tapping is the medieval supply of pitch and the
retort the industrial one**, so the two slates are an epoch pair.

### The three behaviours are kept exactly as they are

`expire` · `accrue` · `continuous` already encode the axis that genuinely
differs — what neglect costs. ⭐ The one part of the taps that had a
design conversation is the one part this build does not touch.

⚠ One narrow correction inside `continuous`: unbounded *growth* is
deliberate (*"what neglect costs is QUALITY"*), but unbounded **mass** is
not honest — a real fleece caps around 2–5 kg and then breaks and sheds.
Past the cap the wool is **lost**, not banked, which fits the behaviour's
own stated intent better than accumulating does.

### Eggs become countable

A hen's yield currently reads *"you come away with 0.05 kilos of eggs."*
Eggs are the one countable tap in the family and should be counted. Milk,
honey and sap are bulk; a fleece is one object. ⭐ **The yield's shape is
per-tap data, not a universal** — and so is whether a vessel is required.

### The clock gets a code-trust seam, not a verb

A build about seasons must be observable. ⛔ **Not a new verb and not a
new wizard check** — any argument ending in a wizard check is wrong by
shape. Instead: the world clock joins the **`eval` sandbox allowlist**,
which already runs on the existing and explicitly-sanctioned
**code-trust axis** (CLAUDE.md names `eval`, reload and source-tree
writes as exactly what `isWizard` is for). No new check, no new verb, no
in-world instrument — and every future seasonal build can be driven.

---

## Lens pass

Run against [design-lenses.md](../design-lenses.md). ⭐ For comparison,
the *current* taps score two passes, one half-pass and four empties —
which is what motivated the build.

**1 · Pedagogy.** Disciplines: `silviculture` (the tap, the boil's
tending) and `stockmanship` (the animal taps), both shipped, neither
new. ⭐ The derivable lesson is the one the taps have never taught: **a
renewable yield is a rate, and drawing it faster than it recharges costs
you the rate.** That is the RGO law made personal, and it is the first
time a player meets it in a body rather than in a ledger. Sugaring adds
a real second lesson — **a season is a budget you cannot roll over.**

**2 · Creative expression.** Already the taps' strongest lens and it
stays: a sixth product is a `production:` row on a species plus a short
subclass. ⭐ The window predicate *widens* this — an author can declare a
tap that opens on weather without touching code. The ordinary case is
rows; the bespoke case is a subclass that overrides one hook.

**3a · Immersion.** The existing prose is excellent (*"half of that is
second cuts and dung. It should have come off a year ago"*) and the
mechanism betrays it: 22 litres arrive instantaneously, into your
pockets, with no pail. Giving the act a duration and a vessel is the
fiction catching up to its own writing. ⚠ **The maple season is a known
small betrayal** and it is recorded above rather than hidden.

**3b · Participation.** Currently **empty** — the strongest gap this
build closes. The measure is *can the polity do something we did not want*,
and the sugar season supplies it: a bush, a shared woodlot, a fuel
contest with three claimants and a run that is over in weeks. ⭐ Two
keepers on one wood now find each other out with no ledger telling them,
exactly as two beekeepers in one valley do. The standing-instruction
relief is what makes *hiring somebody for the round* possible at all.

**4 · Values.** Currently **empty**: you press the button or you do not.
The now-versus-later choice is the lens-4 content — an undecidable
tradeoff the player must decide anyway, in five different currencies,
⭐ with no gauge converting it into a calculable one. The hive already
refuses to score it (*"nothing warns you when to stop"*) and that
refusal is the model.

**5 · Continuity.** ✅ A tap is a tap: machine milking, a vacuum pump on
a sugarbush and a reverse-osmosis evaporator all answer the same
commands, and only the dynamics change. ⭐ The window predicate survives
the epoch too — a heated greenhouse changes what opens a window without
changing that one exists.

**6 · Economy.** Produces: syrup (four shipped consumers, free), wool
(reachable for the first time), eggs (one new consumer), honey
(unchanged), milk (⛔ still nothing — deferred and named). Consumes:
**wood**, which is the interesting half — sugaring is the third real
claimant on a two-way contest and the only one burning its own stand.
Who pays: whoever wants a sweetener a bartender will take. ⭐ Was the
demand there first? **Yes, and measurably** — four cocktails ask for
`category: syrup` today and one producer exists.

**7 · Governance.** Light. The sugarbush sits on titled ground, so the
existing parcel title answers *whose bush* and *whose wood* — and the
Hanging Wood's three-way fuel contest is the kind of thing a polity
eventually legislates. Nothing in this build judges a **person**, so no
criterion, appeal or entrenchment tier is owed. ⚠ Recorded as a thin
entry rather than a forced one.

### Schell — #27, the Lens of Time

The instrument the user asked for, and it diagnoses the current taps
without having been pointed at them.

- ⭐⭐ **Nesting is the fix.** `#27` says the structure should be *"a
  command · inside an engagement · inside a shift or a contract · inside
  a quest's horizon."* Milking today is a command inside **nothing**.
  Sugaring supplies the whole ladder: **a tree · inside a daily round of
  the bush · inside the run · inside the year.**
- ⭐⭐⭐ **The relief principle is already written and unbuilt.** The
  entry gives three reliefs — remove the property, remove the
  obligation, or **automate the discharge** — and calls the third *"the
  interesting one and it is not built."* This build builds it, with the
  entry's own bound: ⚠ *"Automation may **preserve** you. It may never
  **earn** for you."*
- **The clock is the bad kind.** The entry separates *world* clocks (the
  crop grows whether you watch — irritates nobody) from *input-holding*
  clocks. Milking is neither: it is a clock on the player's real life
  that pays nothing for attendance. The window predicate turns it back
  into a world clock, and the relief removes the attendance bill.
- ⭐ **"Leave 'em wanting more" becomes available.** The entry notes the
  adage *"has no mechanism in a persistent world… the only curtain-caller
  is fatigue."* A sugar season **ends**. It is the first designed curtain
  in the game, and a cow's lactation structurally cannot be one.
- ⚠ **Its unanswered Q1 is still unanswered, and now deliberately.**
  *What determines the length of my gameplay activities?* This build sets
  durations by the fiction's physics, which is honest and **is not the
  same as chosen**. The entry's implication 1 asks for one chain to be
  answered on purpose; ⭐ this build declines, and names the pacing-gym
  ask it declines in favour of — the relative measurement, not the
  absolute.
- ⚠ **The now-versus-later choice is Schell's meaningful-choice
  territory and the deck has no entry for it.** Recorded as an ask: the
  deck wants one.

---

## The drive

Run against the live game before the MR opens. ⚠ **Checkpoint 0 exists
because without it the rest cannot run.**

**0. Move the clock.** As a wizard, through `eval`, advance game time.
→ Game time moves, the move is visible in the game's own date read, and
nothing else in the world has silently jumped a year. ⭐ *This is the
checkpoint that makes every later seasonal step possible; if it fails,
the build has no exit criterion.*

**1. Buy the kit.** From Terminus, travel the authored road to Rejection
and into `provisioning`. `buy auger`, `buy spile`, `buy pail`.
→ Each is on the storekeeper's price list with a price, and each arrives
carried. ⚠ The nucleus lesson from apiculture: confirm the store
actually *stocks* them, not merely that the verb accepts them.

**2. Walk to the wood.** North and up from `hillside` into the Hanging
Wood. `look`.
→ The stand ledger reads as it does today (*"Oak stands here — about
twenty-four trees' worth"*), unchanged. The sugarbush panel is visible as
a prop in its room.

**3. Try to tap the stand, and be told why not.** `tap oak`.
→ Refused, and the refusal says a stand is not a stem — in the wood's
own words, not the verb's. ⭐ A player who tries the obvious wrong thing
must learn the design from the refusal.

**4. Try to tap at the treeline.** Go to `treeline`, `tap birch`.
→ Refused the same way, for the same authored reason `fell` is refused
there.

**5. Read the bush.** `look` at the sugarbush panel.
→ Each standard is individually named and described, the way the close
names its three cherries. Each says what it is and, in words, roughly
how big it is — the girth that decides how many spiles it takes.

**6. Tap out of season.** `tap birch-north`.
→ Refused, naming the **season** in the tree's own words — *"the sap is
not up; nothing will run until the days lengthen"* — and never a number
and never a date.

**7. Open the season.** Advance the clock to the run (checkpoint 0).
`tap birch-north`.
→ The act takes **real elapsed time** as an engagement, with the auger,
and can be seen running. It completes; a spile is set.

**8. Interrupt one.** Begin `tap maple-middle` and walk away mid-act.
→ The act aborts, names why, and **the tree is as it was** — no spile,
no half-state. The `planWork`/`completeWork` contract, observed.

**9. Over-tap, and be refused at the cap.** Set spiles until the stem
refuses.
→ Refused, naming the **girth** — not an injury, not a hidden penalty.

**10. Come back and take the run.** After game time, `tap birch-north`
again.
→ A pail of sap, its quantity decided by the tree and the elapsed days,
⚠ **requiring the pail** — attempt it once without a vessel and be told.

**11. Boil it.** Put the pan in the evaporator, light it, and let it run.
→ The sap concentrates on the shipped evaporative mechanism. The yield is
a fraction of what went in, and the read says so in words. ⚠ Boil it too
hard and it scorches — `damageAboveK` is observable.

**12. Burn your own wood doing it.** Note where the fuel came from.
→ The evaporator consumes `category: wood`, and the stand you tapped is
the nearest source. ⭐ Observe the contest: the collier and the mine want
the same cordwood.

**13. Sell it to somebody who wants it.** Take the syrup to a bar and
`order` or craft a cocktail that asks for `category: syrup`.
→ **The syrup is accepted with no recipe edit.** This is the single
checkpoint that proves the demand side was real.

**14. The season closes.** Advance past bud break. `tap birch-north`.
→ Refused, naming the end of the run, and the player is **done for the
year**. ⭐ The curtain.

**15. Milk a cow, as an act.** At a byre: `milk cow` without a vessel,
then with one.
→ Without: refused, naming the pail. With: the act **takes time**, and
the scene says what you chose — stripped out, or left in milk.

**16. Make the now-versus-later choice visible.** Milk her out hard, then
again next round.
→ The second take is smaller in a way the first act's wording predicted.
⚠ No number anywhere; a read in words.

**17. See the slope before the cliff.** Leave her unmilked toward the
window's end and `look` at her.
→ She reads as going off **before** she is dried off. ⭐ Today this is
silent until it is too late.

**18. Set standing instructions and go away.** Instruct the character to
keep the round, then disconnect for longer than the window.
→ On return the round was kept, the yield is **there and unsold**, and
she is still in milk. ⚠ Confirm nothing was earned on your behalf.

**19. Shear a sheep early, and shear one late.**
→ Two different fleeces, two different readings, and the late one says
what it cost. ⚠ And a sheep left far too long has **lost** wool, not
banked 29 kilos of it.

**20. Spin the fleece.** `spin fleece` at a wheel.
→ ⭐⭐ **It binds.** This is today's silent arg-gate failure, observed
fixed — the one checkpoint that proves a shipped claim became true.

**21. Gather eggs, and bake with them.** `gather hen`, then use them in
the new recipe.
→ Eggs arrive **counted**, not weighed, and a baker takes them.

**22. Rob a hive, and confirm nothing changed.** `rob hive`.
→ Apiculture behaves exactly as it shipped. ⚠ The exemplar must not have
been broken by the act it was the model for.

---

## Acceptance criteria

Observable from outside the code. No criterion below names a test.

1. A player can set a spile in a named tree, come back, and carry away
   what ran — and the amount was decided by the tree and the weather,
   not by a number anyone typed.
2. Out of season, every tap refuses and the refusal names **the reason**
   in the host's own voice. A player who reads it knows what to wait for
   and never sees a date or a digit.
3. A tap's season **ends**, and a player is told they are finished for
   the year.
4. Taking from any tap takes observable time, can be interrupted, and an
   interrupted take leaves the world exactly as it was.
5. A tap that needs a vessel refuses without one and says so. A tap that
   does not need one never asks.
6. For four of the five taps, taking more now visibly costs the player
   later, and **nothing in the interface tells them the right answer.**
7. A player can instruct their character to keep a round in their
   absence, return to find it kept, and find that nothing was sold,
   banked or earned for them.
8. An animal approaching the end of its window can be **seen** to be
   going off before anything is lost.
9. Syrup made by a player is accepted by a bartender's recipe that
   existed before this build, with no content edited to let it in.
10. A fleece a player shears can be spun. (Today it cannot.)
11. Eggs arrive as a count, and something in the world eats them.
12. A player who tries to tap a stand, or a tree at the treeline, is told
    why those are not stems — and learns the design from the refusal.
13. Over-tapping a stem is refused at a girth the tree names; nothing is
    secretly damaged.
14. Boiling sap too hard spoils it, visibly, and the evaporator consumes
    wood a player could have sold to the collier instead.
15. Everything a player could do with a hive before this build, they can
    still do, identically.
16. A wizard can move game time from inside the game, and a seasonal
    mechanism can therefore be watched rather than inferred.

---

## Cross-references

**Seeding slates:** [tapping-slate](../slates/builds/tapping-slate.md) ·
[dairy-slate](../slates/builds/dairy-slate.md) (the act's other half) ·
[rgo-unification-slate](../slates/builds/rgo-unification-slate.md) (loses
the sweetener vocabulary to this build; keeps the derived-field
interface) · [ranching-slate](../slates/builds/ranching-slate.md) ·
[forestry-slate](../slates/tails/forestry-slate.md) ·
[apiculture-slate](../slates/tails/apiculture-slate.md) (the exemplar).

**Deferred to, by name:** [rubber-slate](../slates/builds/rubber-slate.md)
· [destructive-distillation-slate](../slates/builds/destructive-distillation-slate.md)
· [inquiry-slate](../slates/builds/inquiry-slate.md) ·
[farming-slate](../slates/builds/farming-slate.md) ·
[cooking-slate](../slates/builds/cooking-slate.md) · a **new climate
slate** this build files.

**Subsystem docs:** [ranching.md](../subsystems/ranching.md) ·
[forestry.md](../subsystems/forestry.md) ·
[apiculture.md](../subsystems/apiculture.md) ·
[maturation.md](../subsystems/maturation.md) ·
[activity.md](../subsystems/activity.md) ·
[time.md](../subsystems/time.md) ·
[weather.md](../subsystems/weather.md) ·
[husbandry.md](../subsystems/husbandry.md) ·
[textiles.md](../subsystems/textiles.md) ·
[behavior.md](../subsystems/behavior.md) (standing instructions are a
brain) · [race.md](../subsystems/race.md) (`Species.production[]`).

**Lenses:** [design-lenses.md](../design-lenses.md) ·
[lenses/27-time.md](../lenses/27-time.md).
