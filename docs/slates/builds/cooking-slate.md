# Cooking slate — the trade, the method vocabulary, and the clock it answers

> **Status: design, captured 2026-09-02.** The forks below were settled in
> conversation; this slate records the decisions and their rationale. The
> spoilage core is **not re-designed here** — the
> [spoilage design pack](./spoilage-design-pack.md) is planner-ready and this
> build **absorbs it as wave 0** (§ build shape).

See also: [spoilage-design-pack](./spoilage-design-pack.md) (⭐ **wave 0 of
this build** — the mixin, the honest microbiology, the interop, all settled
there) · [preservation-slate](./preservation-slate.md) (⚠ **the victualler's
territory — this build does not annex it**; its § *terms, not methods*
is the completeness doctrine for the whole family: preservation methods
DERIVE from the growth law's terms, the same move as Part 2 here) ·
[hearth-and-larder-design-pack](./hearth-and-larder-design-pack.md) (the
domestic room; the "one build, not three" principle this slate reuses) ·
[fridge-design-pack](./fridge-design-pack.md) (the cold-storage follow-on;
lands *after* this build, against live demand) ·
[trade-roster-slate](./trade-roster-slate.md) (the Discipline vocabulary —
`baking` `specializes: cooking` was decided there) ·
[vocations.md](../../vocations.md) (cook is a shipped vocation; baker a
designed one) · substrates:
[crafting](../../subsystems/crafting.md) (craft-resolve, Recipe Document,
the heat gate, `BulkPayload`) · [thermal](../../subsystems/thermal.md) ·
[fire](../../subsystems/fire.md) ·
[metabolism](../../subsystems/metabolism.md) (the ingest rung, meal
chemistry) · [fermentation](../../subsystems/fermentation.md) (dough is a
ferment — the baker's future substrate) ·
[uncertainty.md](../../uncertainty.md) (the abstraction law, applied twice
below).

---

## Part 1 — The taxonomy (settled)

### The trade is `cooking`; "hearth" was era-marking, and it comes off

`trade-hearth-cooking` is the only pack named for its *starting tech tier*
— it's `trade-smithing`, not `trade-bloomery`. Per the
trades-ship-medieval doctrine the trade shipped at its open-fire rung, but
the trade itself is **cooking**; the hearth is the instrument tier you
start at, and the tech ladder (exercised disciplines, known-of→can-make)
is what carries a kitchen from hearth → range → oven. **Rename the pack
root to `/trade/cooking`** whenever the build touches the pack anyway — no
users, no data, a mechanical rename plus a DB drop.

### Cooking vs. baking: one Discipline family, trades cut by what they sell

The [trade-roster-slate](./trade-roster-slate.md) already decided the
Discipline shape — `baking` is a skill that `specializes: cooking` (the
midwifery→medicine pattern), with `brewing` and `butchery` as siblings
under ISCED-F 0721 — and the roster's economics already encode the real
distinction between the two vocations:

- **Cook** — Means: *a name*. Sells **service**: a plated dish, made now,
  eaten here. Venue-bound, provenance-stamped, doesn't travel.
- **Baker** — Means: *stock*. Sells **goods**: bread travels, sits on a
  shelf, and *stales* — inventory on the spoilage clock in a way a plated
  dish never is.

Different process (dough chemistry: gluten, leavening, enclosed even
heat), different upstream (grain → mill → flour, which farming Stage B
wants to feed) — the metal-chain precedent of cutting packs by chain
position applies. **The baker gets its own pack, later.**

**Butchery is its own trade, upstream — and its transform is an act,
not a recipe.** The roster already decided the shape: `butchery` is a
sibling Discipline (0721, beside `baking`/`brewing` — *not*
`specializes: cooking`), the butcher its own vocation selling stock.
Chain position mirrors the mill: husbandry → butchery → cooking, cut
by the metal-chain precedent. Cooking's only stake is the boundary,
which **already works** — cooking consumes cuts via the `meat`
category tag (`stew-meat` ships). Findings stashed for the butchery
pack's designer:

- **The input precedes livestock**: combat produces corpses today
  (`Corpse`, the forensic Creature), so a hunt-driven butchery trade
  needs no ⭐animal-husbandry. Yield knowledge lives on **species
  rows** (meat Materials already carry `biologicalSource`); authored
  yield fractions per species is the honest model.
- ⭐ **Corpse → goods cannot be a recipe**, structurally:
  `gatherMatter` matches Material-bearing *Tangibles* only (an
  agent-branch corpse is never a candidate), and a recipe mints ONE
  output while a carcass is inherently **multi-output** (cuts + hide
  + bone + trimmings). So the pack ships a `butcher`/`dress` verb —
  instrument-afforded (block, hook, knife) — transforming a corpse
  into its species-authored yield set, mass-conserving. The rejected
  shortcut: corpses as ordinary craft inputs (a stew recipe eating a
  whole squirrel) — skips the trade, breaks multi-output.
- **W0 makes the meat chain a relay race**: the corpse's freshness
  clock starts *at death* — kill → butcher fast → cuts inherit the
  clock → the cook's kill step resets it. "Butcher-fresh" becomes a
  real quality claim; grade-from-freshness falls out.
- **The outputs fan into three trades**: hide → leatherwork, bone,
  and fat trimmings → **the `render tallow` bootstrap** (§ Part 5) —
  the butcher is the fat method's upstream supplier.
- **The domestic rule holds**: field dressing small game at a
  campfire is the same verbs, knowledge-gated — the hunter's trivial
  rung of the butcher's discipline. No venue axis.

**Fish and seafood: already spoken for — and our W0 is *their*
dependency.** The [fishing slate](./fishing-slate.md) is a thorough
third extraction vertical (upstream acquisition, like butchery:
cooking consumes the catch via a category tag), and the
[preservation slate](./preservation-slate.md)'s v1 scope is literally
"one perishable class (**fish** — fishing is the stated driver)" — so
this build's W0 *generalizes and unblocks* the fishing slate's own
perishability driver. The relay race runs fastest here ("fish fast,
grain slow, salt never"); "boat-fresh" outranks even "butcher-fresh."
Cooking's stake:

- **No fish in the W2 roster** — no fish Material ships; chowder and
  fried fish are *fishing-build content* against our shipped method
  vocabulary (the enabling-data rule applied honestly).
- **Fish is the tending wave's third customer**: delicate protein
  denatures ~320–330 K and overcooks in minutes — a narrower window
  than anything in the meat roster, joining scorch and scalded tea in
  the `maxHeatK`/dose-integral field.
- ⭐ **Pre-registered additive mechanism: a freshness gate on recipe
  inputs.** Raw-fish dishes invert the kill step — no heat, so the
  *input's* freshness is the whole safety story: an optional
  freshness-band requirement on `RecipeInputSlot` ("only ultra-fresh
  passes"), the first place a recipe reads the W0 gauge as a *gate*.
  Fishing-era work, noted now for the slot schema's designer.
- **Convergences**: shellfish × watershed **contamination by kind**
  (filter-feeders concentrate what's in the water — oysters
  downstream of a sewer are honestly dangerous, zero new mechanism);
  **salt cod stays the victualler + freight showpiece** (named by
  three slates) — cooking touches it only as an ingredient that needs
  soaking, which is just a recipe.

**Eggs & dairy: the ranching standing tap upstream; the technique tier
gated behind it.** The [ranching slate](./ranching-slate.md) already
models milk/eggs/wool as the **standing tap** — renewable products
from kept animals, with honest energy partitioning (a cold snap raises
maintenance so milk drops; a pregnant animal partitions to the fetus)
— the *recurring-yield* counterpart to butchery's terminal act. Not
cooking's to build. Cooking's stake once the tap flows:

- **Eggs are the technique workhorse** — emulsions (mayonnaise,
  lecithin), foams (meringue), custards (already gated in the
  cold-desserts line), enriched doughs. All recipes against the
  shipped vocabulary, none authorable until the Materials exist — **no
  eggs in W2** (the enabling-data rule).
- **Milk is the second-fastest clock and the literal home of S2's
  name**: *pasteurization units* were invented for it. Ranching
  landing against our shipped W0 makes raw-vs-pasteurized an honest
  day-one distinction.
- **Butter is the third fat** — churning is over-stirring cream until
  the emulsion inverts (plausibly a `stir` technique, not a new kind;
  the unitasker test decides in the dairy era), with *clarified*
  butter/ghee as the honest science of raising the smoke point by
  removing the milk solids that burn.
- **Cheese and yogurt are ferments** — cultures, strains, cellar
  aging: `FermentingMixin`, the third time this design reaches for
  it. Cheese IS preservation (milk you can keep — acidity + a_w +
  cultures, hurdle stacking), so cheesemaking sits at the
  **fermentation/victualler junction**; cooking consumes it as an
  ingredient, full stop.
- ⭐ **The baker decouples from ranching**: lean bread (flour, water,
  salt, leaven) needs no dairy — honest medieval baking — so the
  baker pack can ship before the standing tap exists, with enriched
  doughs and pastry as its dairy-era second wave.

**Grains & bread: a four-way split, not all the baker's.**

- **The grain crop is farming's — and three trades already wait on
  it.** No cereal ships; the tell is that **`malt` exists as a
  material with no barley above it** (brewing smuggled in a grain
  *product* without the grain). Farming's cereal (Stage B territory)
  feeds the brewer's malt, the baker's flour, and cooking's pot at
  once — the highest-leverage single crop in the backlog.
- **Milling folds into the baker pack initially** (the `trade-fuel`
  thin-node precedent), splitting out only on demand. Pointer for
  that designer: the historical water mill is **the classic
  watercourse power consumer** — the watershed ships flow, and a mill
  would be its first mechanical-power read (the metal-chain
  "toll the hoist" infrastructure-economics shape, waiting).
- **Cooking keeps the unleavened hearth staples.** The defensible
  line, historical and chemical: **the baker's frontier is dough work
  — gluten development + leavening — plus the oven.** Short of that
  is hearth cooking: **porridge** (boiled cracked grain, wet-trivial,
  the medieval staple — needs no mill) and **griddle flatbread**
  (dry-easy, no proof, no oven — chapatis are *domestic* acts).
  Roster rows gated on the grain crop (enabling-data rule), but
  *cooking's* rows; `specializes: cooking` keeps the boundary soft
  the right way — the specialization *deepens* into doughs rather
  than fencing them off.
- ⭐⭐ **Pre-registered for the baker pack: staling is NOT spoilage,
  and the freshness gauge models it backwards.** Bread's clock is
  starch **retrogradation**, not microbial growth, and its
  temperature curve is famously inverted: staling is *fastest* at
  fridge temperatures (~4 °C is retrogradation's peak), paused
  frozen, slower at room temp. The W0 freshness gauge does the
  opposite — reuse it for staleness and the icebox *preserves* bread
  that should stale fastest there. Bread needs its own small staling
  axis (same reconcile-on-read pattern, inverted temperature term) —
  a trap invisible until someone drives it and wonders why the
  icebox makes perfect toast.

**Confectionery clusters with the baker, by the same test.** Candy
sells **stock** — it travels, shelves, and keeps, and it keeps for the
terms-not-methods reason: high sugar is low water activity, so sweets
are self-preserving goods. That's the baker's economics (matching the
historical confectioner/patissier shared shop), so `confectionery`
lands as a sibling specialization beside `baking`
(`specializes: cooking`) **in the baker's pack when it comes**. The
sugar-work rungs meanwhile grow in cooking's roster where
`simple-syrup` already lives (§ Part 2 — the candy ladder derives from
boiling-point elevation) and migrate title with the pack. Boundary
check: **jam stays the victualler's** — sugar as *preservation intent*
(the a_w lever applied to fruit); candy is sugar as *the product* —
same physics term, different trade purpose, no new rule. Two notes held
for that pack: leavening is literally a ferment, so a proofing dough
rides `FermentingMixin` (cultures, strains — all shipped, a reuse not a
mechanism); and an oven is just the dry method with low variance, so the
method vocabulary below carries baking without extension.

### Domestic vs. professional is NOT a taxonomy axis

Same verbs, same Discipline, same recipes. The differences are entirely
machinery that already ships: **professional** = employment (shifts,
wages, on-shift `MakerMixin` conferral for house provenance) + retail
(`menu`/`order`) + a venue archetype declaring what the kitchen needs;
**domestic** = the same pot on your own hearth, gated only by knowledge
(the cooking-manual path, already tested). Exactly the bartending shape —
Dave's Bar vs. muddling at home — and it passes the second-venue test: a
restaurant is content, zero pack code.

---

## Part 2 — The method vocabulary (settled): derive, don't declare

The shipped recipes already encode this by accident: `hearty-stew`
declares `requiresHeatK: 373` — the boiling point of water — and
`fine-roast` declares `500`. The design names what the physics already
says.

**Method is not an enum on the recipe — it derives from medium ×
temperature.** What makes a stew a stew is the medium carrying the heat
and the hard temperature cap that medium imposes:

| method | medium | temp reality | chemistry unlocked |
|---|---|---|---|
| **dry** | air / radiant | whatever the fire gives | Maillard ≥ ~415 K, caramelization ~430 K |
| **wet** | water | **hard-capped at the medium's `boilingPoint`** (373 K for water) | collagen → gelatin over time; browning *never* |
| **fat** | rendered fat / oil | capped at the fat's **smoke point** (~450–480 K) | Maillard yes, and fast |
| *(combination)* | sequenced | sear-then-stew = braise | not a primitive — a sequence of the three (deferred, § horizons) |

The teachable core — the honest-science reason this cut wins — is that
**water can't brown**. A pot of stew in a 1300 K forge is still a 373 K
pot of stew. That falls straight out of physics the engine already has
(`ThermalApi.reachableHeatFor`, real Kelvin, phase change, Materials with
`boilingPoint`); we don't enforce a method, we let the medium impose its
cap and the recipe declare the chemistry it needs.

⭐ *Amended 2026-09-02 (the sweets question)*: the cap was never "373" —
it was always **the medium's `boilingPoint`**, and water just happens to
be the common medium. The payoff is **sugar work**: boiling-point
elevation means concentrated syrup boils higher the more sugar it
carries, which is *why a candy thermometer reads concentration* — the
candy ladder (soft-ball ~385 K · hard-crack ~423 K · caramel ~430 K)
**derives** from a per-Material field that already exists. `simple-syrup`
(340 K, easy) is the trivial rung of that ladder; caramel and toffee are
its continuations whenever the roster wants them, zero new physics.

**Where each word lives** (mostly: places that already exist):

- **Temperature** — shipped (`ThermalApi`, the fire build).
- **Medium** — what's actually carrying the heat, read per path. ⚠
  *Corrected 2026-09-02 (the prior-art audit)*: `CookPot` is **not
  `Bulkable`** — a build vessel banks transient `BuildContribution`s,
  not a bulk slot — so "the vessel's bulk contents" was imprecise. The
  honest read: **by-hand**, the water/fat among the build's banked
  contributions; **craft-resolve**, a matched input slot — a wet
  recipe requires water as an input like any other, a fat recipe
  requires tallow/oil. Cleaner anyway (the stew honestly *contains*
  its water), but note stew recipes gain a water slot they don't have
  today. Still no new state, no new mixin.
- **Chemistry thresholds** — Maillard / caramelization as platform
  constants; **smoke point as a `Material` field** beside
  `boilingPoint`/`meltingPoint`.
- **The Recipe** — `requiresHeatK` grows one optional sibling in v1:
  `medium?: water | fat | none` (a vessel-contents gate, same decline
  shape as the heat gate). `maxHeatK?` (the scorch ceiling) is named but
  deferred to the tending wave. Additive fields on the existing Document,
  the way the schema has grown every time.
- **Verbs** — **none.** Sear, simmer, braise, fry are not physical acts;
  they're names for states you arrange with the verbs that exist
  (`heat`, `boil`, `pour`, `stir`, `cook`). The instrumentation doctrine
  applied: "frying" is a *reading* of the pot's state, not a command.

⚠ **Named enabling-data gap: no fat/oil `Material` exists.** The fat
method fails closed and silent without a rendered-fat/oil row carrying a
smoke point (the libations lesson — `feel`/`taste` never ran because no
body plan granted touch). A fat Material is a deliverable, not an
assumption.

### Hot drinks: the wet method at authored temperatures (settled)

Tea, coffee, and tisanes are **cooking's method territory — no new
trade, no new machinery.** Infusion/decoction is water-medium
extraction, and the temperatures are the pedagogy: coffee ~365 K,
green tea ~350 K, full boil genuinely ruins delicate leaves. A brew
recipe is `medium: water` + a sub-boil `requiresHeatK` + a `mug`
vessel kind — every piece already designed.

- **The shipped state is a bar SKU, not a brewed thing**: hospitality's
  coffee recipe is "from the urn into a mug" (`discipline:
  bartending`, no heat gate) because the `coffee` Material IS
  pre-brewed liquid, stocked like a syrup. Nothing anywhere brews; tea
  doesn't exist.
- **The trade split holds without new rules**: the *making* is
  cooking-method (a kettle is a pot row; domestic-same-verbs at your
  own hearth); the *serving* stays hospitality's — the café sells
  service, and the urn path is honest bar fulfillment.
- **Chain depth is an authoring choice** behind the unitasker-style
  restraint: green beans → roast (a *dry*-method recipe — real
  Maillard on the bean) → grind → brew whenever content wants it; v1
  starts at grounds → brew.
- **Spoilage retro-fixes the urn**: pre-brewed coffee sitting all day
  goes on the freshness clock — stale-urn vs fresh-brewed becomes a
  real quality distinction for free.
- ⚠ **Caffeine is present-but-inert** — the coffee Material declares
  `nutrients: ["caffeine", "water"]` but `NUTRIENT_ROUTING` has no
  `caffeine` entry: tagged, routed nowhere, silently (the
  fails-closed-and-silent shape, named). The honest model when
  metabolism wants it: **the second alcohol, not the second ptomaine**
  — a stimulant with a pleasant low band (alertness) and an unpleasant
  high one (jitters), riding the shipped `ToxinBehavior` + banded
  Condition substrate alcohol already exercises. A seed row + a
  routing entry, not a build. Deferred.
- Content: no tea plant ships (farming's `sinensis` is *Citrus* — the
  orange), but **mint does** — a mint tisane is brewable day-one
  content; proper tea is a one-species farming add later.

### Alcohol in the kitchen: works now, honest at tending (settled)

- **Wine as an ingredient works today — and the rail rule creates the
  vin de cuisine market for free.** Wine/beer/spirits are shipped bulk
  liquids with honest alcohol macros; a wine-reduction dish is just a
  recipe (a `wine` bulk slot + heat). The shipped **rail rule** sends
  the cheapest bottle clearing `minGrade` to any unnamed slot — which
  is exactly what cooking wine IS: the pot becomes the wine market's
  bottom-shelf sink, real economics falling out of a rule the bar
  built for well drinks.
- **Reduction is distillation with the outputs swapped** — fractional
  evaporation (alcohol off at 351 K, water at 373), literally the
  distilling trade's physics keeping the pot instead of the vapor. In
  v1 a reduction is an ordinary recipe; the kinship means the honest
  evaporation model already ships when tending wants it.
- **"Alcohol burns off" is the dose integral's FOURTH customer.** Real
  retention is time × temperature (flambé ~75% retained, a 2.5-hour
  simmer ~5% — the USDA tables): ∫f(T)dt again. v1's
  macros-in = macros-out carries ALL the wine's alcohol — a known
  overstatement, roughly honest for quick cooks, fixed by S2.
  Meanwhile the metabolism honesty is a feature *now*: boozy dishes
  carry real BAC — **the rum cake genuinely gets you tipsy**.
- ⭐ **Deglazing is meaningless before tending — the process-memory
  argument confirmed from a new direction.** Deglazing needs a
  **fond**: the browned residue a sear leaves in the pan. One-shot v1
  has no residue — nothing to deglaze. The fond is per-attempt
  *vessel* state (process memory on the PAN, carried by the
  build/technique record), so `deglaze` arrives as a tending-era act:
  fond as the dry/fat methods' residue, deglaze converting it + a
  splash of wine into the pan-sauce base — the frugal loop of the
  sauté, pre-registered. (Flambé — burning the vapor for show — is
  fire-substrate texture for the same era.)

### Prior art: technique is the act layer; method composes with it

*(From the 2026-09-02 prior-art audit — the design rejects nothing
shipped.)* The crafting branch already carries an open **technique**
vocabulary (`shaken` · `stirred` · `muddled` · `boiled` —
instrument-owned kebab words recorded on the manual build;
`BuildMethod = Technique`). It is not a competing method model — the
two are layers:

- **Technique records what you DID** — the act log on the by-hand
  build, owned by the instrument that performed it.
- **Method is what the physics WAS** — medium × temperature, the
  derived reading above.

`boiled` the act and wet-method the state are different facts, and a
future braise legitimately involves both. Requirements must keep the
vocabularies from blurring: `BoilController`'s comment sketches a
recipe-side `method: boiled` field (not yet in `Recipe.ts`) — when it
lands it is a **technique requirement**, distinct from the `medium`
physics gate.

⭐ `boil` itself is the exemplar to follow, not merely tolerate: its
first cut was a hardcoded water-purifier, **rejected in review**
because a `CookPot` couldn't use it and a second consequence meant a
kernel edit per trade. It re-shipped as an *act, not an outcome* —
latches the heat reached, records `boiled`, purification demoted to
Material data (`purifiedByBoiling`). Derive-don't-declare, built one
build before this slate named it. And the technique record is the
natural **carrier for Part 3's deferred process memory** when tending
and free cooking arrive — that seam already ships.

### Recipe-gate v1; the free-cooking horizon (settled fork)

Derive-don't-declare means a player could in principle discover methods
the roster never authored — drop meat in hot fat with no recipe matched
and the honest answer is "something fries." **v1 stays recipe-gated**:
craft-resolve only mints through recipes. The free-cooking horizon is
recorded here so the vocabulary is already shaped for it; it arrives with
the tending wave, not before.

---

## Part 3 — What a foodstuff carries (settled): condition fully, process not yet

Five candidate axes, and the interesting decision is the one we *refuse*:

1. **Composition — shipped.** `BulkPayload`, macros summed from consumed
   inputs (macros-in = macros-out). Cooking's job is conservation.
2. **Grade — shipped.** Weakest-link across inputs, floored by instrument
   `control`. The only per-attempt variance in v1.
3. **Provenance — shipped.** Maker, recipe, `craftedAt`.
4. **Freshness/condition — wave 0 of this build.** The
   [spoilage pack](./spoilage-design-pack.md) as designed: microbial load
   by real predictive microbiology (Arrhenius temperature term × water
   activity), `ptomaine` past threshold, **cooking above ~60 °C is the
   kill step — the reset**. The clock stamp is `craftedAt`, already
   there.
5. **Process memory — deliberately absent in v1.** The redundancy
   argument, recorded so future waves know when this changes: **under
   recipe-gate v1 the recipe stamp IS the process record.** Every
   fine-roast was made the same way — dry, ≥ 500 K, browned. Storing
   `browned: true` on the payload is a second copy of a fact the recipe
   id carries (the two-copies failure). Process memory becomes *real
   information* exactly when outcomes vary within a recipe (tending /
   doneness — did *you* scorch it?) or without one (free cooking) —
   and when it does, the shipped **technique record** (§ Part 2 prior
   art) is its natural carrier.
   Sensory rendering meanwhile derives from recipe + grade, which is
   what `outputAppearance` already does.

**The one exception, taken now: the toxin kill.** The ingest path already
reads `payload?.toxicity ?? material.getToxicity()` — a per-instance
override shadowing the Material. `applyEdibleOutput` writing payload
toxicity makes raw-vs-cooked real (the kidney-bean fact, cooking as
detoxification). One field write against an existing seam, honest
chemistry, no new substrate.

### How the trade feeds the clock

The condition axis is where cooking stops being "a crafting branch that
outputs edibles" and becomes a trade with stakes:

- **Raw inputs are countdowns.** The cook's product is *time*:
  perishable inputs in, a dish with a fresh clock out.
- **The kill step is food safety, taught as physics.** The danger zone
  (4–60 °C) is real; `requiresHeatK` already guarantees every cooked
  dish passed through the kill.
- **Leftovers spoil again.** Cooked food restarts the clock; it doesn't
  escape it — which gives the domestic cook the same stakes as the
  professional, for free.
- **The victualler boundary holds cleanly**: the cook buys *days* (the
  kill step, the temperature term); the victualler buys *seasons* (water
  activity — salt, drying). Different physics term, different trade.

### Hazards: deterministic consequences, never slip rolls (settled)

**The governing rule comes from the uncertainty doctrine**: resolutional
randomness is banned — no "5% chance the mandolin takes your finger."
Every kitchen hazard models as **a state you created plus a
deterministic consequence** — which is what makes danger legible,
mitigable, and *teachable*. The mandolin's risk is texture; its guard
is a prop.

- ⭐ **The grease fire is a tending-era hazard by construction.** The
  chain: oil heats → smokes (`smokePoint` — *the smoke IS the
  warning*) → ignites at **`flashPoint`** (pre-registered sibling
  field, read by the fire build's shipped ignition balance). This
  requires a pan whose temperature evolves unattended — S1 — so **v1
  one-shot cooking cannot start a fire, and the unattended pan is
  tending's negative space**: the tending wave introduces attention as
  the skill and inattention as the hazard, one mechanism, both sides.
  **Never water on a grease fire** (steam explosion) is the punishing
  deterministic consequence; the right answer is the **lid**, and the
  smother mechanism ships (the candle self-smothers under a sealed
  air-limited jar — same physics, bigger flame). Sand/salt are the
  floor alternatives; the extinguisher is up the tech ladder — the
  medieval kit is lid, sand, wet cloth, and respect.
- **Burns and scalds — mostly shipped**: `burn` is a shipped trauma;
  `getSurfaceTemperature` already splits scalding contents from
  touchable wall. Barehanded hot iron → deterministic burn. ⭐ **The
  oven mitt is armor**: materials-response models layered attenuation
  against the heat channel — a pot holder is a resist layer on the
  same grid as a gambeson (the smith's tongs are the precedent).
- **Smoke/CO — the silent one, precedent shipped**: fermentation's
  cellar CO₂; a charcoal brazier in an unventilated kitchen is the
  same shape and a real historical killer (respiration's
  `breathableMedia` + crisis engagement carry it). Belongs to the
  hearth/room family, not this build — the cook is its most exposed
  customer.
- **Food safety is Part 3 renamed**: the kill step, the danger zone,
  the raw-fish gate, ptomaine — hazard management already designed.
- **Pressure-cooker overpressure** — up the ladder with the vessel;
  another state-consequence, materials-response's construction axis
  waiting.

**The pedagogy**: every mitigation is *knowledge, not gear* — know the
flash sequence, keep the lid in reach, ventilate the brazier, mitt the
handle, respect the danger zone. **Competence is the safety
equipment** — and the professional kitchen's dignity is trained habits
around hazards the domestic cook meets alone.

### Leftovers & storage containers (settled)

Zero new mechanism — but one load-bearing decision about where the
clock lives:

- **Leftovers are Part 6's payoff**: a persistent vessel holding a
  residue (the half-eaten dish, the stew still in the pot). Moving
  them is the bulk substrate as-is: `pour` pot → crock, lid it, carry
  it to the cellar. Storage containers (crock · jar · tin) are vessel
  rows — more potter/smith content on the household par.
- **What storage DOES stays other packs' substrate**: temperature
  mediation is the thermal chain (the crock reads the cellar's
  ambient; the icebox is the [fridge pack](./fridge-design-pack.md)'s
  whole point); air is `Sealable` — **binary**, per terms-not-methods,
  until a consumer demands a hurdle multiplier. Cooking adds rows.
- ⭐⭐ **Freshness rides the PAYLOAD, not the vessel** — settling the
  [spoilage pack](./spoilage-design-pack.md)'s open question ("does
  `BulkPayload` gain a freshness field?"): **yes** — for bulk
  contents the microbial load lives on the `BulkPayload` and
  **transfers carry it**. Vessel-borne freshness is the
  **pour-to-reset exploit** (decant spoiling stew into a fresh crock
  → free clock). Payload-borne, the clock travels with the stew.
  Mixing blends loads **mass-weighted** — and dilution genuinely is
  how concentration works, so the edge case answers itself.
- **Reheating is the kill step again, free**: past the kill
  threshold, the clock resets like any cooking — including the honest
  failure mode: a lazy warm-through that never reaches kill
  temperature resets *nothing* (the v1 threshold, later the S2 dose,
  captures it with no leftover-specific rule).
- **Deliberately not here**: vermin, flies, the open crock — the
  sanitation slate's territory ("abandonment is an act"); compost is
  hearth-and-larder Part 3.

### Scraps, waste & cleanup (settled)

No new mechanism — one abstention, one pre-registration, one
completed sentence:

- **Scraps as objects: only where a consumer exists — v1 has none to
  make.** The abstraction-law rule: a scrap is worth modeling exactly
  when it's an *input* (trimmings → tallow, bones → stock — both
  **butchery's outputs**, already in its stashed findings); peels are
  clutter, not content. One-shot craft-resolve deliberately abstracts
  prep — the mess is *inside* the abstraction. **Scrap objects arrive
  with prep acts** (peeling as an act yields peels), the tending
  era's territory; bones→stock then lands as clear broth's frugal
  upstream, and compost-or-stock becomes a real household fork.
- ⭐ **Spoiled-food disposal completes the compost pack's sentence.**
  [Hearth-and-larder](./hearth-and-larder-design-pack.md) Part 3:
  compost's "*consumer already ships and its producer does not*" —
  **spoilage + cooking IS the missing producer.** Once W0 runs,
  players hold crocks that turned; the bin/midden (a vessel row
  feeding smallholding's nitrogen reserve) is the answer that isn't
  `destruct`. Until it lands, pouring out spoiled bulk is the honest
  minimum (the bulk substrate empties vessels today).
- **Cleanup splits cleanly**: dishes are v1's cleanup **and they
  ship** (Part 6's soil/wash/bus cycle — the basin, the rack, the
  par). The *kitchen* getting messy is the
  [room-condition pack](./room-condition-design-pack.md)'s model
  (producers + causal clears, the steward's gate); cooking's
  obligation is one pre-registered line — **when that pack lands,
  cooking acts emit the producer event**. v1 kitchens stay magically
  tidy, stated honestly.
- **Greywater is the conduit ladder's** (watershed: "a sewer is the
  same object reversed", contamination by kind ships) — dishwater is
  a pointer, not cooking mechanism; the rural kitchen tosses the
  basin out the door, which is just pouring.

### Seasoning & spices (settled)

Four different things wearing one word:

1. **As an ingredient — works today.** Salt, sugar, mint, juniper all
   ship; a recipe that wants seasoning names a slot, weakest-link
   grade applies (stale herbs drag the stew). Better: **the by-hand
   path can already season freely** — the discrete-ingredient branch
   banks anything you `add` to the build; a pinch of salt in the pot
   is a shipped act. Only craft-resolve can't vary, which is
   recipe-gate v1 being itself.
2. ⭐ **As flavor — prose and reputation, never a stat.** The no-gauge
   doctrine bans a flavor gauge, and none is needed: *"delicious"
   already has a mechanical carrier, and it's social* — the dish
   carries the grade verdict and honest macros, the diner reacts
   (shipped), reception signals feed **renown** — and the cook's trade
   identity is *sells a name*. Taste lives where it lives in life: in
   what eaters say and whether they come back. Sensory texture rides
   the descriptor-bank pattern (magic-items' derived appearance)
   whenever content wants richer plates.
3. **"Season to taste" — per-attempt variance, so the tending
   horizon.** Under recipe-gate v1 every hearty-stew is seasoned
   identically by construction — the process-memory redundancy
   argument again. Your salt judgment is the skill seam + tending
   wave's territory, the technique record its carrier. Nothing new;
   it joins the same horizon everything per-attempt lives on.
4. **As economy — the biggest role, pure content.**
   - **Salt's dual life needs no rule**: cooking's demand is
     small-dose and steady (a slot in half the roster), the
     victualler's is bulk (the a_w lever), and the
     [mining slate](./mining-slate.md) already crowned salt the
     keystone commodity. One material, two trades' demand curves —
     the design working, not a conflict.
   - **Spices are the classic freight good, and terms-not-methods
     explains why**: dried spices are low water activity, so they
     keep essentially forever — *the historical reason* they could
     cross continents carrying value dense in weight. High value, low
     mass, no clock: the von Thünen long-haul good the
     [freight slate](./freight-slate.md) wants. Pepper and cinnamon
     are farming-or-import content rows plus commodity pricing, zero
     mechanism. (Spices-as-antimicrobial-hurdle is a lovely wiki
     fact, deliberately **not** mechanized — the hurdle term is the
     victualler's and the effect is marginal.)

---

## Part 4 — Build shape & sequencing (settled)

**One build, not two — and not three.** A clock with no counter isn't
drivable ("watch the meat rot"); a counter with no clock is inert ("a
crafting branch grew a rename"). The spoilage core is wave-sized (~120-
line mixin off `Wet.ts`'s skeleton, `ThermalMixin` composed onto
perishables, tabulated Material constants, a one-line ingest reach, zero
verbs), so absorbing it doesn't bloat the cycle — the
hearth-and-larder principle: *they are the same room; each makes the
others matter.*

**Waves, in order:**

- **W0 — the spoilage core**, built exactly as the
  [spoilage design pack](./spoilage-design-pack.md) specifies (cite it,
  don't re-design it): `FreshnessMixin`, `ThermalMixin` on perishables (a
  sack of grain has no temperature today), the Material spoilage
  constants, the ingest toxicity rung.
- **W1 — the trade**: the `/trade/cooking` rename; the `medium` recipe
  gate; the platform chemistry constants + `smokePoint` Material field;
  the fat/oil Material row (the named gap); the toxin-kill write in
  `applyEdibleOutput`; **the dinnerware unification** (Part 6 —
  `Dish extends CraftVessel`, the edible branch claims from the dish
  pool instead of cloning).
- **W2 — content**: the recipe roster widened across all three methods
  (the ZPD ladder obligation — trivial → hard rungs per method), pantry
  stock to match, the kitchen bundle refreshed.
- **W3 — the drive**: buy meat → it's on the clock → cook the stew (kill
  step, clock resets) → leave the leftovers out → `ptomaine`. Both
  halves proven end to end in one story.

**Deliberately out, and why the order maximizes yield** (each later build
lands against demand this one creates — seed backwards from shipped
sinks):

1. **Cold storage** (fridge pack, icebox tier first) — lands against
   players already losing food; the icehouse keeper wakes with
   customers. **Cold-set desserts ride behind it** (custards, jellies,
   ice cream — *make hot, set cold*): the making is ordinary wet
   method, the setting is the thermal substrate running the direction
   it already runs, and ice cream wants the cold chain plus the
   ice-and-salt endothermy rung (freezing-point depression) for the
   pre-icebox era. Deferred by dependency, not taxonomy.
2. **Compost** (hearth-and-larder Part 3) — its consumer always
   shipped (smallholding's nitrogen reserve); **this build finally
   creates its producer** (routine spoiled food needing a sink that
   isn't `destruct`). The cheapest member of the family, now unblocked
   — see § Part 3 scraps.
3. **Preservation / the victualler** — the seasons-scale answer arriving
   when the days-scale answer has taught everyone the problem; salt gets
   its demand, the trade geography wakes.
4. **The baker pack** — its own cycle: mill chain upstream, dough-as-
   ferment, staling as the goods clock.
5. **The tending wave** — durative cooking (the `FermentingMixin` shape
   applied to the pot), `maxHeatK` scorching, doneness, combination
   methods (braise), the skill seam crafting.md already declares next,
   and free cooking. The abstraction law licenses one-shot `cook` until
   then: it still costs the fire, the pot, the inputs, and the
   knowledge. When tending lands, braising becomes the thing that costs
   you the afternoon — that's when it differentiates.

   **The tending wave's kernel seam bill** *(audited 2026-09-02 — two
   real seams, one decision, one dependency; everything else is
   consumers of proven patterns)*:

   - **S1 — the pot-on-the-fire thermal couple** (real, small).
     `ThermalMixin` Newton-cools toward a cached ambient re-anchored on
     every discontinuity; `FurnaceMixin` holds `burnTemperatureK ×
     bellows` while lit — but `heatContents` targets **Meltables**
     (the smelting path), so nothing today makes a `Thermal` pot on a
     lit range drift toward 500 K instead of room temperature. Either
     generalize scope-heating to any `Thermal` occupant, or stamp a
     vessel's cached ambient on placement on/in a lit furnace (the
     existing re-anchor, one more trigger). The hard parts — τ = R·C,
     the held furnace temp, the re-anchor discipline — all ship.
   - **S2 — the thermal-dose integral: one gauge, three consumers**
     (real, and the elegant one). Doneness, scorch, and the microbial
     kill are one mathematical object — **∫f(T)dt**, food science's
     D/F-values. W0's `FreshnessMixin` builds the pattern (a
     reconcile-on-read accumulator rate-gated on temperature); tending
     adds the same-shaped cook-progress accumulator on the build's
     contents. Bonus: the kill step stops being a crude ">60 °C once"
     threshold and becomes honest **pasteurization units** — the same
     integral as freshness, opposite sign — so S2 partially
     *retro-feeds W0* rather than being pure new cost. And the scorch
     ceiling (`maxHeatK`) was never just about scorching — **scalded
     green tea is the same field** (§ Part 2 hot drinks), fish's
     narrow window the third customer (§ Part 1 seafood), and
     **alcohol retention the fourth** (§ Part 2 alcohol): the tending
     wave arrives with four customers already waiting.
   - **S4 — where sequencing lives** (a decision, not a build). Braise
     is ordered stages; `Recipe` is one-shot slots-and-gates and should
     stay so. The sequencing engine exists: the demonstration capture
     records ordered command sources and transcribes **personal
     recipe-scripts**, and scripting has game-time Coroutines. Lean:
     *the script IS the sequence* — a staged dish is a recipe-script
     over one-shot stanzas, no `Recipe` schema fork. Settle at that
     wave's requirements.
   - **S5 — the skill seam** (declared elsewhere, consumed here).
     Crafting-wide "control unfixed" is already the declared next
     crafting wave. Tending is its natural first customer — tending
     *creates the window skill lives in* (the gap between done and
     scorched). Sequencing awareness only: tending without the skill
     seam is windows nobody's skill widens.
   - **Explicitly not seams** — consumed as-is: scorched = another
     off-spec terminal beside the shipped pot-luck mint; free cooking
     = the off-spec path + blend derivation + the technique record;
     engagement/interruption = `EngagedMixin` + `AbortReason`;
     stir-resets-the-clock = a timestamp the reconcile reads; process
     memory = additive `BulkPayload` fields carried by the technique
     record.
6. **The antitoxin** — the ptomaine Condition seed declares
   `resolution: { by: antitoxin }`, and `ResolutionSpec` is explicitly
   shape-only v1: **a declared mechanism token with no consumer — no
   antitoxin item exists anywhere.** Today the only plays are `vomit`
   inside the absorption window or ride out the slow clearance. That is
   exactly the unmet-demand shape the vocations register wants, and
   this build is what wakes it: routine ptomaine exposure (every larder
   can now produce a dose) creates the customers the
   apothecary / medic vertical then serves. The antitoxin ships with
   that build, against live demand — not here.

   ⚠ The same wake obliges a **calibration pass on the ptomaine bands**
   (2/6/12, `clearanceRate: 0.02`): thresholds tuned for one authored
   trap ration may be too punishing or too soft once spoilage makes
   exposure common. A W3 drive item, and a named check for the
   requirements cycle.
7. **Disease** inherits the W0 growth term whenever its build comes,
   already proven in production.

---

## Part 5 — The W2 recipe roster (sketch)

The shipped five already fill five cells of the method × difficulty grid
once their media are named — wet is well covered, dry has its ends, fat
has nothing (consistent with the missing fat Material). The roster fills
the rest. Difficulty rungs are the advancement vocabulary
(`trivial → easy → standard → hard → formidable`).

**The spine is one ingredient, four outcomes.** The root vegetable
appears boiled, mashed, roasted, and fried — the method vocabulary made
playable: same input, different medium, visibly different dish. The
boiled/roasted pair *is* the Maillard lesson.

| | **wet** (373 K cap) | **dry** (fire-limited) | **fat** (smoke-point cap) |
|---|---|---|---|
| **trivial** | ⭐ boiled roots — 373 K | ✅ toasted-ration — 450 K | ⭐ **render tallow** — 373 K (§ the bootstrap) |
| **easy** | ✅ root-mash · ✅ simple-syrup (340 K) · ⭐ stewed orchard fruit — 373 K | ⭐ roasted roots — 430 K | ⭐ press olive oil — **no heat**, `juicer` kind |
| **standard** | ✅ hearty-stew — 373 K | ⭐ hearth roast — 450 K, fair meat | ⭐ pan-fried roots — ~440 K |
| **hard** | ⭐ clear broth — 373 K + `strainer` | ✅ fine-roast — 500 K, fine meat | ⭐ crisp-fried cutlet — ~455 K |
| **formidable** | — reserved: braise | — reserved: doneness | — reserved: confit |

**What each new rung teaches** (the ZPD obligation — every recipe earns
its cell with one lesson):

- **boiled roots** — the floor: you cannot ruin it, and it never browns.
- **stewed orchard fruit** — farming's produce (cherry, orange, grape —
  all shipped Materials) enters the kitchen; and eaten-now vs. preserved
  is the victualler boundary *in play* (jam is sugar as water-activity —
  theirs; compote eaten warm — ours).
- **clear broth** — grade made visible: clarity is the skill read, and it
  consumes the shipped `strainer` bare kind.
- **roasted roots** — ⭐ the Maillard pair with boiled roots: same
  input, 430 K > the 415 K threshold, browner and better.
- **hearth roast** — the everyman's roast (fair meat, 450 K) under the
  shipped fine-roast, closing the dry ladder's gap.
- **render tallow** — ⭐ **the bootstrap**: the fat method's enabling
  material is itself a trivial recipe (stew meat in, tallow out). The
  trade unlocks its own third method by cooking.
- **press olive oil** — fat without fire (the olive is a shipped farming
  Material; the `juicer` kind is the shipped press). Plant fat vs.
  animal fat = two smoke points, which is the fat method's whole cap
  mechanic taught by comparison.
- **pan-fried roots** — fat carries heat past water's 373 K cap: the
  third rendering of the same root.
- **crisp-fried cutlet** — the margin narrows: ~455 K against olive
  oil's ~464 K smoke point vs. tallow's ~477 K — your fat choice is the
  difficulty.

**The formidable row is deliberately empty** — those are the dishes that
cost you the afternoon (braise, doneness, confit), and they arrive with
the tending wave, where the abstraction law says they belong.

**Bills and limits:**

- **New Materials: two** — `tallow` and `olive-oil`, each with
  `smokePoint` + `fat` nutrient amounts (the `fat` routing already
  ships in `Metabolic.ts`). ⚠ Verify real smoke points before seeding
  (the ISCED-code precedent — the values above are from knowledge, not
  a source).
- **New instruments: zero.** The pot carries all three media — its
  *contents* are the method (a dry pot is a roasting vessel); oil rides
  the shipped `juicer`. Spit/griddle/skillet are texture for later.
- **New output templates: small** — a tallow crock and an oil bottle
  (the `juice-bottle` shape); everything else plates onto the shipped
  `plated-dish`.
- **No dish-as-ingredient in v1.** Craft-resolve's gather step matches
  raw-matter candidates only, so fritters-of-mash and stock-into-soup
  chains are out of scope until that seam is designed — noted, not
  smuggled in.

---

## Part 6 — Dinnerware: one vessel abstraction, one reuse loop (settled)

**The requirement**: one abstraction for *food/drink goes on/in a
container, gets consumed, container gets reused for future meals* —
glassware and dinnerware as the same relationship.

**It already exists — the bar built it**, and
[crafting.md](../../subsystems/crafting.md) § the glass pool names
cooking's plate as its declared next customer (*"`tangible`/`edible`
outputs keep cloning — smithing's transform and **cooking's plate are
the next pools**"*). The finished loop, as shipped for glassware:
claim the first reachable **clean, empty vessel of the output's kind**
(`category`-matched, never path-matched — a washed-out vessel and a
factory-fresh one are the same input to a fill, the returns-loop
lesson) → diegetic decline `no-glass` when none → `soiled` at fill →
`wash` at a `WaterFixture` (`vessel.wash()`) → back in the pool.
Bussing is `get`/`put in rack` (any open container — the pool scan
descends them); breakage is `throw`/destruct + the par-sheet
shortfall.

**Cooking's two paths against that loop today:**

- by-hand `plate <pot> into <dish>` fills a *supplied* dish — reuse
  implicit, but `Dish` can't cycle: no `soiled`, no `category`, no
  wash affordance, no `Thermal`, no `Container`.
- craft-resolve `cook` **clones a fresh plated-dish per meal** —
  crockery ex nihilo: ~0.5 kg of ceramic minted from nothing every
  dinner. A Law-2 conservation leak and a garbage problem.

`Dish`'s own doc comment is the tell — *"the `CraftVessel` shape
generalized to food"* — a parallel implementation of the thing
`CraftVessel` was deliberately named to cover (*"named for the vessel
rather than the glass, because a syrup bottle and a juice bottle are
`CraftVessel`s too"*).

**The unification (W1 work):**

1. **`Dish extends CraftVessel`**, keeping only the food face
   (`NutritionLabelMixin` + the quality-verdict `getLong`). Inherited
   for free: `soiled` + `wash` (a kitchen basin is a `WaterFixture` —
   the affordance ships), `Thermal` (soup goes cold on the table),
   `Container` (the garnish sprig leaves with the plate, exactly why
   the olive leaves with the martini). **Subclass, don't dissolve** —
   the food face is real, so retiring `Dish` for bare `CraftVessel`
   rows was considered and rejected.
2. **Dinnerware joins the vessel-kind vocabulary** — `plate` · `bowl`
   · `mug` · `platter` beside `coupe` and `rocks`. The recipe's output
   row declares its category: stew → bowl, roast → plate.
3. **The `edible` branch stops cloning and claims**, exactly like the
   bulk branch — first reachable clean empty vessel of the output's
   kind. By-hand `plate` keeps explicit vessel choice — the `strain`
   vs `order` relationship. ⭐ **But `no-dish` never blocks dinner —
   the pot is the dish of last resort** *(amended 2026-09-02: the
   field-cooking audit)*: no clean dish in reach → the meal stays in
   the cook vessel and you eat from the pot (spoon optional, hands
   observable — the cutlery rule). Plating is *service* —
   presentation the professional sells — never the license to eat. The
   bar's hard `no-glass` decline stays hard (a drink needs a glass);
   the kitchen's soft fallback is the deliberate asymmetry, and it is
   what keeps camp cooking working.
4. **Zero new code downstream**: cupboards and dish racks are open
   containers; dinnerware categories ride `house par`/`house stock`;
   breakage already works.

**Two payoffs beyond tidiness:**

- **Leftovers become possible at all.** The W3 drive's half-eaten dish
  sitting out overnight can only exist as a persistent, reusable
  vessel holding a residue — the clone-per-meal dish could never be
  that object. Part 3's spoilage story quietly depends on this part.
- **Dinnerware becomes an economy.** Once dishes stop being minted per
  meal they have to come from somewhere — the ⭐potter and the
  ⭐ceramics gap in the [trade-roster](./trade-roster-slate.md) are
  the vocation this wakes, and par shortfalls at every kitchen and
  tavern are its unmet demand.

### Cutlery & utensils (settled)

Two things wearing one word, split along the existing seams:

- **Kitchen utensils (the making side) — no new abstraction.** A whisk,
  ladle, or kitchen knife is the tool-capability model as shipped: a
  recipe names a bare kind in `toolCapabilities` (the `strainer` /
  `juicer` pattern), `rate`/`control` as row data where it matters.
  The only discipline is **restraint in the roster** — every kind
  named is a thing every kitchen must stock, so W2 introduces them
  sparingly (clear broth already wants `strainer`; the cutlet
  plausibly wants `knife` — and the belt-knife is a shipped smithing
  recipe, so that demand line exists the moment a recipe names it).
- **Table cutlery (the eating side) — ⭐ never a gate, always a
  read.** Requiring a spoon to eat stew is universal-demand-meets-
  universal-self-service — hands work, so a hard gate is a chore.
  Instead, the derive-don't-gate move again:
  - Cutlery joins this part's loop as **serviceware without
    contents**: utensil categories (`spoon` · `fork` · `table-knife`)
    in the vessel-kind vocabulary, `soiled` on use, washed at the
    basin, bussed, counted on the par sheet.
  - **`eat` auto-uses from reach** — a clean reachable utensil is
    claimed, soiled, and narrated ("with a horn spoon"); none → you
    eat with your hands, which *works fine* and *is observable*. The
    act always succeeds; what changes is how it reads.
  - The read is the eventual payoff: hands-eating is a visible sign
    like `nauseous` — material for the social/etiquette layer
    whenever it arrives, never touching the success path. Fine dining
    is a *presentation* fact, squarely the cook's sells-a-name
    identity.
- **Deliberately not designed**: dish-category → utensil pairing rules
  (bowl implies spoon) — an authored mapping the loop doesn't need;
  any clean reachable utensil suffices, pairing can arrive as texture
  later. And no grade/`control` effects on eating — control floors
  are for making, not consuming.
- **The demand line widens**: one dinner table wakes three making
  trades — the ⭐potter (dishes), the **smith** (table knives, forks —
  real demand for a shipped trade), and a carver (spoons — wood/horn,
  a roster gap in the ⭐ceramics family).

### Gadgetry: the unitasker test (settled)

The gadget question — how baroque does kitchen outfitting get — splits
on the engine's existing function/stuff axes, and the doctrine is
literally Alton Brown canon (the only unitasker allowed in his kitchen
was the fire extinguisher):

- **The KIND axis grows reluctantly — a new kind must pass the
  unitasker test**: *does some recipe genuinely need a gate no
  existing kind provides?* Every `toolCapabilities` kind a recipe
  names is a thing every kitchen on the server must stock — that is a
  kind's real cost. The strainer passed (broth cannot clarify without
  it); a garlic press does not (it is a `knife` application).
- **The ROW axis is unbounded and cheap** — capability entries are
  parameterized (`{kind, rate, control, technique}`), so ten knives
  are one kind: carbon-steel chef's knife (high `control`), rusty
  paring knife (low), mezzaluna (a `knife` with a `technique` stamp).
  Content authors go as crazy as they like here; no kernel or recipe
  ever notices.
- ⭐ **"One good chef's knife is all you need" is mechanically true**:
  `control` lives in the capital and floors the outcome grade, so one
  fine knife carries ~90% of the roster and the gadget drawer adds
  nothing to any resolve. The engine models the claim.
- **Pure-roleplay gadgets are props and furnishing** (the
  FurnishableRoom kitchen, the estate slice) — and the gadget drawer
  is honest **vanity demand** for the smith/potter/carver: a real
  market for functionally redundant goods. Allowed, sold, displayed;
  never required.

### Cookware: rows over two spatial relations, materials do the physics (settled)

**Mechanically, cookware variety is rows, not classes** — a copper pan
and an iron pot are `CookPot`/`CraftVessel` rows with different
`_materialPath`, and the physics fields already live on every Material
(`thermalConductivity` · `specificHeat` · `density`):

| cookware | the real property | the engine term |
|---|---|---|
| copper | fast, even response | high conductivity → small τ |
| cast iron | thermal **mass** — holds sear temp when cold food lands | high `specificHeat × density` → big C |
| stainless | poor conductor (hence cladding exists) | low conductivity |
| clad/core | a conductivity layer under a durable face | **layered construction — materials-response models exactly this for armor**; the same pattern pointed at heat |
| glass/ceramic | slow, gentle, even retention | low conductivity, decent C — the bean pot |

- ⭐ **Pre-registration for the tending seam bill (S1)**: the
  pot-on-the-fire couple must flow through the **vessel's own material
  properties** (τ from conductivity, C from mass × specific heat) —
  then every cookware row differentiates **for free** when tending
  lands: cast iron genuinely holds its sear, the thin cheap pan
  genuinely scorches (low conductivity → a narrower scorch window).
  Zero cookware-specific code, ever. Until tending, one-shot resolve
  reads only `reachableHeatFor`, so v1 cookware variety is texture,
  economy (smith/potter products, `control` bands), and roleplay —
  honestly stated.
- **The medieval roster** (trades-ship-medieval): **copper** (the
  metal chain ships `smelt-copper` + `cast-bar` — a copper pan is
  authorable today), **iron**, **earthenware** (the ⭐potter's entry
  into cookware). Stainless, aluminum cores, borosilicate are
  19th–20th-century — up the known-of→can-make ladder, never authored
  ahead of demand; the clad pan is that ladder's craft summit.
- **Two toxin-substrate convergences**: unlined **copper + acidic
  food leaches** — *why tinned copper exists*; the tin lining is the
  smith's craft rung, and copper toxicity is the shape of **lead,
  which already ships as a toxin**. Better: **lead-glazed
  earthenware is THE historical kitchen poison** — the cheap pot
  that poisons the household through every acidic stew: authored
  content against a shipped toxin, a price-vs-safety decision with
  real stakes. (Cast-iron *seasoning* is a patina — see the
  [patina design pack](./patina-design-pack.md); a pointer, not a
  mechanism.)

**Shapes: IN vs ON is `Bulkable`-interior vs `Surfaced`, and the
craft substrate abstracts over both.** Wet and fat methods need
**bulk-holding** (the medium sits *in* something: pots, kettles, woks,
the skillet holding its fat); dry needs only **bearing** (griddle,
sheet, rack, spit — or a dry pot). But `ManualBuildMixin` banks
*contributions*, not spatial containment — a griddle hosts a flatbread
build exactly as a pot hosts a stew — so in/on is per-row spatial
texture, invisible to the crafting machinery. **The oven is not
cookware**: the vessel holds the food, the furnace (`FurnaceMixin`)
holds the heat; what goes in an oven is the sheet or dish.

- **Edge cases that fit by construction**: the **bain-marie** — a
  vessel in a vessel of water, the inner ambient IS the outer's
  373 K-capped water, so gentle custard heat *derives from nesting
  two shipped objects*; the **pressure cooker** — sealing raises the
  medium's `boilingPoint` (the cap model, correct in advance; far up
  the ladder); **ember cooking** — no cookware at all, an item in the
  campfire's scope: the dry method's floor and the free-cooking
  horizon's.
- ⭐ **The one accepted limit: a pan has no hot side.** Lumped
  capacitance = one temperature per object — no intra-pan gradient,
  no two-zone grill. Accepted **permanently** rather than modeling
  spatial gradients: the tending wave gets the felt consequence by
  reading conductivity into the scorch window (the honest result of
  hot spots without simulating them). The two-zone technique is the
  one loss, and it is a fair price.

### The field: no travel category (settled)

- **Camp cooking already works by doctrine** — crafting.md: *"camp
  cooking works because reachable heat + a pot IS a kitchen."*
  Campfire (pins 800 K) + carried pot + packed inputs resolves
  `hearty-stew` in the wilderness; `toasted-ration` was authored as
  field food from day one.
- **"Travel versions" are rows, not a category.** Carried-vs-reachable
  ships (the whetstone precedent) and encumbrance ships, so the
  tradeoff is *emergent*: the copper pot is heavy with a high control
  floor, the tin camp pot light with a low one — the burden ladder
  prices the choice. A mess kit is a content bundle. No parallel tool
  tree.
- **The convergence demo**: river water (watershed) + `boil`
  (`purifiedByBoiling` — built for the *move your intake · boil ·
  treat* ladder) + campfire + pot = field cooking as four shipped
  systems meeting. A W3 drive candidate.
- **Travel FOOD is the victualler's product line**, not cooking's —
  the field is where the spoilage clock bites hardest (no cold
  store), so jerky/hardtack/salt pork are their trade's answer.
  Another clean boundary.
- The pot-as-dish-of-last-resort rule (step 3 above) is what keeps all
  of this gate-free at the campfire.

---

## Part 7 — The kitchen as place & technology (settled)

**None of this changes W0–W3.** It records why the design spans
prehistory to modern gastronomy, what it asks of the utilities build,
and the archetype palette the venue system already supports.

### Fuel technology is invisible to the design — by a shipped decision

The `kitchen` archetype already states **needs, not things** — its own
comment: *"the volcano-vent rule, domestic: nothing here knows what a
range is."* It asks `heatK: 373` + a surface + water, so a hearth, a
wood range, a gas hob, an induction hob and a volcano vent satisfy it
identically. The ladder is **row data on the heat source**:

| tech | the real difference | engine term |
|---|---|---|
| wood/charcoal | fuel-tending, slow, smoke | `Combustible` + `FurnaceMixin` (ships) |
| gas | instant, precise | high `rate`, no fuel step |
| electric coil | the pan lags the dial | large thermal lag in the S1 couple |
| induction | fast, and **heats the vessel not the air** | S1 couples to the pot directly — a kitchen that stays cool |

⭐ Induction's real signature falls out of *where the S1 couple
attaches*, with no induction-specific code; gas-vs-coil response is
the source's τ, one number. Two ladder notes: gas needs a fuel
*supply* (§ utilities), and **smoke/CO is a property of combustion
tech only** — modernizing genuinely retires a hazard, honest history
rather than a balance dial. The counterweight is real too: **the gas
kitchen is helpless in an outage; the hearth needs no
infrastructure.**

### Utilities: cooking is the residential demand case that slate lacks

The [power-utility slate](./power-utility-slate.md) is all *industrial*
(substations, Foundry Row, the electrician's round, storm contracts);
its middle tier is a **supply reference** — an `Energized` fixture
declares its source, the source's state gates dependents. Cooking
supplies what's missing:

- **The domestic meter**: an electric range is the household's first
  utility dependency that *hurts* when it fails. An outage darkening a
  lamp is atmosphere; an outage meaning no dinner is a consequence.
- **Gas is a second utility of the same shape** — the supply-reference
  tier is fuel-agnostic, and the watershed's `Conduit` ladder ("a
  sewer is the same object reversed") **is literally the pipe**: a gas
  main is a conduit carrying a combustible, for free.
- **Water is already the third** — the archetype asks `bulkSource:
  water`; the watershed's `SupplyState` ships. A dry tap is a kitchen
  that stops working.
- ⭐ **The ask for that build's requirements**: treat **the kitchen as
  the canonical residential consumer**, and make the supply-reference
  tier **commodity-generic** (power · gas · water) rather than
  electricity-shaped.

### Prehistory → modern gastronomy: the model spans it because it is physics

- **Prehistoric** — ember cooking (an item in the campfire's scope),
  hot-stone boiling (thermal transfer between objects — works today),
  the earth oven.
- **Medieval** — the shipped rung.
- **Industrial** — range, icebox, canning (kill + seal, both levers
  exist).
- ⭐ **Modern gastronomy** — **sous-vide is precise temperature over
  long time: literally the S2 dose integral with a tight `maxHeatK`**,
  the model's purest expression. Pressure cooking is the
  `boilingPoint` cap under pressure. Spherification and foams are
  hydrocolloid Material rows. Modern cuisine needs no new mechanism —
  it is the same four variables controlled harder, so it needs the
  *tending wave* plus authored materials.
- The one span-limit is the **no-hot-side** rule (Part 6, accepted
  permanently) — and it costs the same wok technique in 2020 as in
  1200.

### The archetype palette: `kitchen` is too few, and the grammar already stretches

The capability grammar (`needs`: tool · heatK · bulkSource · surface ·
seating · coldStorage) describes far more than the one domestic row.
What's missing is **scale and constraint**:

- **`galley`** (ship, narrow-boat) — a kitchen that must *secure*
  things: heat surviving motion, no open flame in a swell.
- **`mess` / `field-kitchen`** — *scale without permanence*: feeding
  many from portable capital; where the field rules and the
  professional rules meet (reachable heat + a pot, but with a roster
  and shifts).
- **`commissary`** — the production kitchen with no diners, cooking
  for a venue elsewhere; what makes food *travel*, and distribution's
  hook.
- **`pushcart`** — ⭐ **the minimum viable kitchen** (one heat source,
  one surface, no water, no cold), and the row that proves the grammar
  honest: the archetype should **report unmet needs, not pretend**.
- **Food trucks** are the pushcart up the ladder: same archetype, a
  `Drivable` host, plus utilities-in-a-box (a gas bottle, a generator
  — the supply-reference tier, self-contained).

⭐ **The claim that makes all of these cheap: an archetype is a set of
NEEDS; a venue is where those needs are MET — so mobility, scale and
permanence are properties of the HOST, not the archetype.** A pushcart
needs a new archetype row and a mobile host (the conveyance substrate
ships: hitch/unhitch, haulage), never new mechanism. The
trade-is-mechanism / locality-is-expression rule, one level down.

### Front of house: the restaurant is the first TWO-TRADE venue

**The floor is hospitality's, the kitchen is cooking's** — and that is
the whole boundary. Dave's Bar is *one* trade (the barkeep makes and
serves); a restaurant is the first venue needing both, which makes it
a genuinely interdependent **two-role player business**: the cook
makes, the server delivers. Nothing else in the shipped economy
requires two people to run one room.

- **The attendant substrate already carries table service** — its
  keystone insight is that *the exclusive resource is the SERVER'S
  attention slot*. Table service merely **inverts who travels** (the
  server comes to you); the slot model is untouched, a waiter with N
  tables is one attention slot and the tables are the queue. And the
  `line`-vs-`Ticket` axis asks exactly the right question — *must you
  stay present to hold your place?* — so ⭐ **a seat is a ticket you
  sit on**. The `seating` need already exists in the archetype
  grammar; `Postured`/`Posed` ships.
- ⭐⭐ **Part 6 accidentally built the mechanic that makes service
  matter.** `Dish extends CraftVessel` inherits `Thermal` — so **food
  cools between the pass and the table.** Slow service means cold
  food, with a real consequence and *no stat anywhere*: service speed
  is mechanically load-bearing for free, and the cook's plated work
  can be ruined by the floor, which is exactly the interdependence
  the two-role business needs.
- **The wait is the point, and the doctrine already protects it**:
  attendant's never-frozen rule (you mill about; you are poked when
  it is your turn) means between-courses time is **social time** —
  what a tavern is actually for, and the
  never-cut-players-off-from-peers doctrine in its happiest form.
- **The waiter's skill is the READ, never a charisma stat**:
  `hospitality-catering` ships as a Discipline, tips route to the
  present agent, and reception feeds renown. Reading the table and
  recommending is the epistemic gate the vocations register wants; no
  new measurement.
- **Deferred, cleanly**: the tab/check (pay-at-order ships; deferred
  payment is the [credit slate](./credit-slate.md)'s), reservations
  and the host stand (content, whenever a venue wants them).

### Takeout & delivery: the vessel pool's stress test, and a gig

- ⭐ **Takeout is where Part 6's pool gets interesting**, because the
  customer walks off with your bowl and your par sheet shortfalls.
  History's three answers are all already expressible, and each is a
  different subsystem: **bring your own** (the tiffin/growler — the
  claim takes the *customer's* vessel instead of the house's, and the
  kind-match rule already makes a washed-out vessel and a fresh one
  the same input); **a deposit** (price the vessel, refund on return
  — the returns loop the bar built); **disposable wrap** (up the tech
  ladder, and it *creates waste* — feeding the compost/sanitation
  producers from § Part 3). No new mechanism; a real economic
  decision per venue.
- **Delivery is a gig, and the substrate is exact**: the
  [contract](../../subsystems/contract.md) clause primitive over an
  **engine-verifiable condition** — and "this dish is in that room"
  is as verifiable as conditions get — with escrow, the board, and
  the **custodian rule**. The courier holds someone else's property,
  which is `HeldGoodsMixin` (the coat-check custody base); walking
  off with the dinner is a real defection with an accountability
  trail.
- ⭐⭐ **The thermal clock IS the delivery timer — no arbitrary
  countdown.** Food cools toward ambient by shipped Newton cooling,
  and the ambient is **the weather**, so a winter delivery is
  genuinely harder. The mitigation is honest capital: an insulated
  container (the shipped `Flask`/thermos + `IceBin` pattern — the
  pizza bag is a thermos with a different label). And the best
  consequence: **hot food has a RADIUS, and it emerges from the
  cooling curve × travel time** rather than a configured limit —
  von Thünen for dinner, which is why real delivery is local.
- **The courier passes the vocation test**: the cook cannot leave the
  kitchen (absent / lacks capacity), so somebody carries — the
  register's exact shape, and it lands beside the roster's ⭐haulage
  carter.
- **Remote ordering is comms, not machinery**: the aether is the
  internet, `dm`/`tell` and displays ship — a remote order is a
  message plus a gig. ⚠ Heed display.md's rule: *a display confers no
  money authority*.
- **Deferred, noted**: the aggregator platform (the rent-extracting
  intermediary between cook and eater) is a **corpo** and a genuinely
  rich political-economy subject — platform labor, the take rate —
  but it is a later build's, not this one's.

### Real estate: a kitchen sells property here too

- **Improvements transfer with title**: furnishing is owner-based and
  persistent (the estate slice, the room overlay); parcels carry
  chain-of-title. A fitted kitchen is an improvement attached to the
  parcel — already how the system works.
- **Value is legible without a valuation model**: the archetype's own
  `describe()` reports which capabilities are met and by what. A
  parcel meeting heat+surface+water+cold is objectively better-equipped
  than one meeting two — a listing, not a hidden stat (the no-gauge
  doctrine satisfied).
- **The market forces ship**: the residence ladder (dorm → holding),
  tenure terms, the D/P decision index. "Rent the room with the range
  or the cheaper one without" is a real decision the moment cooking
  has stakes.
- ⭐ **The punchline: a commercial kitchen is CAPITAL, not decor.** A
  venue with a fitted kitchen can employ a cook; one without cannot —
  the economy slate's productive-capital thesis rendered in a room.

⚠ Build-freeze note: captured during the client-rebuild design-only
phase. This slate is the input to a `/requirements` cycle when the
freeze lifts.
