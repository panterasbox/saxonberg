# Cooking slate — the trade, the method vocabulary, and the clock it answers

> **Status: PARTIAL** — W0-W3 shipped (spoilage core, `/trade/cooking`,
> the recipe roster, the drive) →
> [crafting.md](../../subsystems/crafting.md)
> **Left:** the tending wave (the durative cook · braise as a
> recipe-script · free cooking · the skill seam — S1 + S2 shipped with
> doneness; what remains is the durative verb, sequencing and the window
> skill widens) · cold storage/icebox + the cold-set desserts · compost
> (the spoiled-food sink) · preservation + the victualler · **slices —
> a tangible food that yields N portions** (a loaf is one portion today,
> all-or-nothing) · **staling promoted to the kernel** on the third-pack
> signal (cooked rice, potatoes — the same retrogradation; it is the
> baking pack's `lib/` until a pack with no common ancestor wants it) ·
> the antitoxin + the ptomaine band calibration · hot drinks (brewing,
> caffeine routing, tea) · the kitchen hazards (the grease fire and
> `flashPoint`, smoke/CO) · food & medicine (healing spends protein;
> deficiency) · cookware physics through the vessel's own material + the
> toxin convergences · the kitchen as place (the fuel ladder, utilities,
> the archetype palette — galley / mess / commissary / pushcart — front
> of house, takeout + delivery, real estate) · food culture, observance
> and magic (settled doctrine awaiting content) · the tolerance band on
> `RecipeInputSlot` · the pre-registered seams for sibling builds (the
> fish freshness gate · eggs & dairy · the grain crop + porridge ·
> hunting & foraging · confectionery)
> **Shipped since:** doneness (`ThermalDoseMixin`) and the baker pack
> (`trade-milling` + `trade-baking`, the grain chain, 2026-09) →
> [spoilage.md § doneness / § staling](../../subsystems/spoilage.md)
> **Size:** a build

See also: [spoilage.md](../../subsystems/spoilage.md) (⭐ **wave 0 of
this build** — the mixin, the honest microbiology, the interop, all settled
there; the design pack was absorbed into that doc) · [preservation-slate](../tails/preservation-slate.md) (⚠ **the victualler's
territory — this build does not annex it**; its § *terms, not methods*
is the completeness doctrine for the whole family: preservation methods
DERIVE from the growth law's terms, the same move as Part 2 here) ·
[hearth-and-larder-design-pack](../tails/hearth-and-larder-design-pack.md) (the
domestic room; the "one build, not three" principle this slate reuses) ·
[fridge-design-pack](./fridge-design-pack.md) (the cold-storage follow-on;
lands *after* this build, against live demand) ·
[trade-roster-slate](../tails/trade-roster-slate.md) (the Discipline vocabulary —
`baking` `specializes: cooking` was decided there) ·
[vocations.md](../../vocations.md) (cook is a shipped vocation; baker a
designed one) · substrates:
[crafting](../../subsystems/crafting.md) (craft-resolve, Recipe Document,
the heat gate, `BulkPayload`) · [thermal](../../subsystems/thermal.md) ·
[fire](../../subsystems/fire.md) ·
[metabolism](../../subsystems/metabolism.md) (the ingest rung, meal
chemistry) · [fermentation](../../subsystems/maturation.md) (dough is a
ferment — the baker's future substrate) ·
[uncertainty.md](../../uncertainty.md) (the abstraction law, applied twice
below).

---

## Part 1 — The taxonomy (settled)

> Shipped: the pack is `/trade/cooking`; the baker pack (`trade-milling` + `trade-baking`, `baking` `specializes: cooking`, staling in the baker's own `lib/`) → [spoilage.md § Staling](../../subsystems/spoilage.md). ⚠ **Butchery shipped in a different shape** — `butcher`/`dress` live in `trade-cooking`, not a trade of their own, afforded by a `ButcherBlock` that is `peers`-only and fixed, so *you cannot field-dress a boar in the woods* (the slate's "domestic rule" is contradicted); the corpse-is-not-a-recipe finding, the cuts inheriting the carcass's age and the `render-tallow` bootstrap all landed → [crafting.md § Verbs — `butcher`/`dress`](../../subsystems/crafting.md), [spoilage.md](../../subsystems/spoilage.md).

**Fish and seafood: already spoken for — and our W0 is *their*
dependency.** The [fishing slate](../tails/fishing-slate.md) is a thorough
third extraction vertical (upstream acquisition, like butchery:
cooking consumes the catch via a category tag), and the
[preservation slate](../tails/preservation-slate.md)'s v1 scope is literally
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
  aging: `MaturingMixin`, the third time this design reaches for
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

**Hunting & foraging: the wild upstream — both cheaper than they
look.** Neither is cooking's to build; both feed it by category tag
like every other acquisition trade.

- ⭐ **Foraging is fishing on land.** The
  [fishing slate](../tails/fishing-slate.md)'s one genuinely-new primitive is
  a **catch-distribution model read through the weather/time fog** —
  which is exactly what foraging wants (what is available *here, now*
  as a function of place × season × weather). Build it once and
  foraging is its second consumer, not a second build. It is **the
  field pattern** (mining's `Deposit` precedent): **seeded, never
  drawn** — what grows in this thicket is a *fact about the thicket*,
  discoverable, not a roll on `search` (the uncertainty doctrine's
  environmental-legal / resolutional-banned line).
- **The gap is already predicted**: `foraging` is a ⭐gap Discipline
  in the [trade roster](../tails/trade-roster-slate.md) (`awareness` ships,
  `foraging` does not) and **no `forage`/`gather` verb exists** — the
  [authored-vs-procedural slate](./authored-vs-procedural-slate.md)
  names both, and reframes the real question as *authoring*, not
  foraging. It owns that fork.
- ⭐⭐ **Foraging's skill is NEGATIVE knowledge — knowing what NOT to
  eat — and the whole substrate ships.** Toxins are real
  (`ToxinBehavior`, banded Conditions), and identification carries
  **partial identification and misidentification** (the
  identification-slate tail). A misjudged mushroom is a real dose, and
  telling the death cap from the field mushroom is *knowledge, never a
  roll* — the vocations register's epistemic gate in its purest form,
  and exactly what real foraging is.
- **Hunting is combat + butchery, and both are covered**: the hunt is
  **track** (the same field/distribution read) → **stalk** (stealth
  ships: `HidingMixin`, ambush, the wary brain) → **shoot** (ranged
  ships: bands, aim, the delivery profile) → **dress** (butchery's
  act, § above). A remarkably cheap vertical — and honest, because
  the animal is a real creature with vitals that dies by the same
  rules as anything else, not a loot piñata.
- **Cooking's stake, and the economy's**: wild ingredients are
  *seasonal and place-bound*, feeding Part 8's regional cuisine; and
  foraging is the **income floor with no capital** (the roster's
  forager holds Means: *nothing*) — the fallback trade. ⚠ It must stay
  a **source node, never a faucet** (the economy slate's conservation
  spine): limited by time, place, season, and the plain fact that a
  town cannot be fed by foraging.

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
rides `MaturingMixin` (cultures, strains — all shipped, a reuse not a
mechanism); and an oven is just the dry method with low variance, so the
method vocabulary below carries baking without extension.


---

## Part 2 — The method vocabulary (settled): derive, don't declare

> Shipped: `Recipe.medium` (`water` | `fat` | absent) — the medium must be a real input and its phase ceiling caps the effective heat, so *water cannot brown* with no method table anywhere; `Material.smokePoint`; `tallow` + `olive-oil` as the fat Materials; the sugar-work ladder rides `boilingPoint` → [crafting.md § The MEDIUM](../../subsystems/crafting.md).

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

### Food & medicine: nourishment, not potions (settled)

This is the question the no-buff rule (§ Part 8) exists to answer, and
the honest distinction is sharp:

- ⭐⭐ **Food doesn't heal — food FEEDS, and feeding is what healing
  REQUIRES.** A buff is a stat granted by eating; nutrition is a
  **precondition**. And the scaffolding already ships inert:
  metabolism's *"Protein → healing: routed into an inert pool that
  drains nowhere."* The honest model is therefore already framed —
  wounds close over time, that healing **spends** protein and energy,
  and a starving body doesn't mend. Not a potion; physiology.
  ❌ *eat stew → +20 HP*; ✅ *you heal at all because there is
  material to rebuild with.*
- **The invalid's broth earns its reputation honestly**: `absorbPerMin`
  is **per nutrient**, so liquid nutrition genuinely absorbs faster
  than a roast — the broth's advantage is a digestion-pool rate, not a
  bonus. (Historically, nursing and feeding the sick were one job;
  here the cook feeds the convalescent for real reasons.) A natural
  future act: feeding someone who cannot feed themselves.
- **The remedy boundary**: the **apothecary owns remedies, the cook
  owns nourishment**. The honest line for what a remedy may do —
  **resolve a named `Condition`** (`resolution: { by: … }`, how the
  substrate already works), never grant a bonus: ✅ an antitoxin
  clears ptomaine; ❌ a tonic gives +2 strength. The **antitoxin gap**
  (§ Part 4, item 6) is exactly where remedies land,
  and herbal knowledge is the `apothecary` Discipline's, even when the
  *method* (a tisane) is cooking's — the same trade/method split as
  everywhere else.
- **Magic stays magic**: enchanted food is
  [magic-items](../../subsystems/magic-items.md)' business (BUC, the
  charge economy, the `canAfflict` veto) — never a cooking backdoor to
  effects.
- ⭐⭐ **The flip side is where food really touches health:
  DEFICIENCY, not buffs.** Metabolism carries scurvy wired-but-inert
  — *"a deficiency IS just a `Reserve`… wire one when a real consumer
  appears"* — and **this build is that consumer appearing** (the same
  pattern as compost's missing producer). Bad diet *causes* conditions:
  honest, and the best pedagogy in the whole design.
- ⭐⭐⭐ **The ship's galley is where the entire design converges.**
  Part 7's `galley` archetype + the victualler's preserved stores + no
  cold storage + no fresh produce = **scurvy**, with citrus the honest
  cure that **farming already grows** (lemon, lime and orange rows
  ship today). Real history, real science, every piece already
  existing or slated — the set-piece this family has been building
  toward without anyone planning it.

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
  [Hearth-and-larder](../tails/hearth-and-larder-design-pack.md) Part 3:
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

> W0–W3 shipped as designed (the spoilage core, the trade, the roster, the drive); the baker pack shipped as its own cycle (2026-09).

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
5. **The tending wave** — durative cooking (the `MaturingMixin` shape
   applied to the pot), `maxHeatK` scorching, doneness, combination
   methods (braise), the skill seam crafting.md already declares next,
   and free cooking. The abstraction law licenses one-shot `cook` until
   then: it still costs the fire, the pot, the inputs, and the
   knowledge. When tending lands, braising becomes the thing that costs
   you the afternoon — that's when it differentiates.

   **The tending wave's kernel seam bill** *(audited 2026-09-02 — two
   real seams, one decision, one dependency; everything else is
   consumers of proven patterns)*:

   - ✅ **S1 + S2 shipped with doneness (2026-09)** — a `Thermal` body IN or ON a lit furnace takes the furnace's held temperature as its ambient (`Thermal.ts` § held temperature; `FurnaceMixin.restampHeated`), and `ThermalDoseMixin` is the ∫f(T)dt gauge with browning and scorch as separate integrals → [crafting.md § The doneness seam](../../subsystems/crafting.md), [spoilage.md § Doneness](../../subsystems/spoilage.md). ⚠ The kill is still `Freshness`'s own Arrhenius curve, deliberately not re-based onto the dose.
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

> Shipped — nineteen recipes in `trade-cooking/content/recipes/`, including every rung sketched here (`boiled-roots` · `stewed-orchard-fruit` · `clear-broth` · `roasted-roots` · `hearth-roast` · `render-tallow` · `press-olive-oil` · `pan-fried-roots` · `crisp-fried-cutlet`), the two fat Materials, the tallow crock and oil bottle → [crafting.md § The roster](../../subsystems/crafting.md). The formidable row stays empty for the tending wave; dish-as-ingredient stays out of scope.

---

## Part 6 — Dinnerware: one vessel abstraction, one reuse loop (settled)

> Shipped: `Dish extends CraftVessel`, dinnerware kinds in the vessel vocabulary, the `edible` branch claims from the pool, the pot as the dish of last resort (the bar's `no-glass` stays hard), cutlery as serviceware without contents that `eat` reads and never gates → [crafting.md § Dinnerware is a POOL](../../subsystems/crafting.md), [§ Cutlery](../../subsystems/crafting.md), [§ The serviceware tier](../../subsystems/crafting.md).

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
  reads only `reachableHeatK()`, so v1 cookware variety is texture,
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
  [patina design pack](../tails/patina-design-pack.md); a pointer, not a
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
  payment is the [credit slate](../tails/credit-slate.md)'s), reservations
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

---

## Part 8 — Food culture, regional cuisine & observance (settled in principle)

**None of this is v1** — it is content plus one open fork. But the
governing rules are worth fixing now, because they decide what later
content is *allowed* to be.

**The doctrine settles the shape**: trade is **mechanism**, locality is
**expression** — the methods, the grades, the physics are shared code;
a region's cuisine is **copied content**, and the test is that a second
venue in a second town needs *zero pack code*.

- ⭐⭐ **Cuisine spreads the way skills spread — by teaching — and it
  already ships.** The knowledge ladder mints the **known-of claim by
  WATCHING a maker perform**, while the can-make deed comes only from
  your own first faithful hand build (*"the book isn't enough — the
  hands learn"*). So a dish genuinely propagates person to person and
  town to town: invented at one venue, watched by an apprentice,
  carried down the road. **Culture as a shipped mechanic, not a
  content tag** — and the [provenance](../../subsystems/provenance.md)
  ledger means dishes have *inventors*, so named dishes ("Katie's
  stew") are a ledger fact, not flavor text.
- ⭐⭐ **Cuisine is a fact about PLACE and PRACTICE, never about
  LINEAGE — terroir, not blood.** What you cook comes from what your
  basin grows and what your trade taught you; a species' *physiology*
  may differ (obligate diets are metabolism's business), but that is
  never culture. This is both the honest design and the one that keeps
  fantasy food out of essentialist territory.
- **What regional difference EMERGES from** — all shipped or slated
  substrate, no new mechanism:
  - **Ingredients**: what the basin grows and the climate allows
    (biome · farming · the watershed's three basins), with von
    Thünen sorting the rest — perishables stay local, spices travel
    (§ Part 3 seasoning).
  - ⭐ **Fuel cost drives METHOD**, which is real culinary history: a
    wood-scarce region cooks **fast and hot** (the wok), a wood-rich
    one **braises for hours**. The fuel trade ships (charcoal), so
    method distribution can follow fuel economics rather than an
    author's whim.
  - **The preservation regime**: hard winters build a
    salting/fermenting culture (the victualler's terms — § the
    preservation slate).
  - *(Water chemistry — Burton vs Dublin — is brewing's classic; a
    pointer, not a claim.)*
- **The open fork is not ours**: how much of this is hand-placed
  versus derived is exactly the
  [authored-vs-procedural slate](./authored-vs-procedural-slate.md)'s
  question. Point at it; do not resolve it here.
- **The pedagogy comes free**: *why cuisines differ* is real
  curriculum — geography, economics, migration, preservation — and it
  is teachable here only because the chain underneath is honest.

### Feasts, fasting & the sacred meal

The [faith slate](./faith-slate.md) already settled the doctrine, and
it is the right one: **"religion that FORBIDS beats religion that
GRANTS"**, *"meet a need, don't grant a power — no powers, ever"*,
with NetHack's *"you farm the god"* as the named failure. Applied to
food:

- ⚠ **The actionable constraint for THIS build: ship no consumable
  buffs.** Stat-food is the door through which both god-farming and
  min-maxed cuisine enter. The codebase already decided this — the
  `Dish` verdict is *"a felt, diegetic difference, never a stat
  buff"* — and the cooking build must not reopen it. Blessed food
  grants nothing; that is what keeps the altar from becoming a
  vending machine.
- **The costs are real; the returns are social.** A fast is genuinely
  not eating (metabolism's satiation and its consequences ship); a
  feast is genuinely provisioning many (real economy). Observance
  therefore costs real resources and returns **regard and renown** —
  the faith slate's *"a standard you are held to, people who hold you
  to it."* Cost mechanical, reward social: the honest asymmetry.
- ⭐ **Vesta is already the cook's god, and pre-authored for exactly
  this**: the story bible has her as *"patron of the hearth — home,
  welcome, the gathered fire. The host"* under MITRA (*the bond,
  presence, serving-experience*), and the trade roster already leans
  cook, baker, potter and groundskeeper to her. **Feeding people IS
  her practice** — the trade needs no devotional mechanic bolted on,
  because it already is one.
- **The feast is the calendar meeting the economy**: a feast day is a
  calendar fact (the time subsystem ships one), and a feast is the
  **demand spike** that makes the cook's year seasonal — pairing with
  the preservation slate's *agricultural year falls out*: the harvest
  festival is when the larder is fullest and the cook works hardest.
  A date plus a lot of orders; zero mechanism.
- ⭐ **Commensality is the platform's thesis in miniature.** The
  shared meal is the oldest social technology, and a feast is simply
  a gathering — the Party Idea, groups, the scene composer,
  reactions. The meal is the natural occasion for every social
  system, and eating together is the anti-isolation act the
  never-cut-players-off doctrine wants.
- **Dietary proscription: the engine never blocks the mouth.** What
  may not be eaten, and when, is content; enforcement is **social,
  not mechanical** — eating is an observable act in a room, so a
  proscription broken in public is witnessed and one broken alone is
  not. That is an honest model of conscience versus enforcement, and
  it is FORBIDS-not-GRANTS applied to food. (A polity may impose
  beyond conscience — civics' layer, never cooking's.)
- **Offerings are an honest sink** (food given at an altar leaves the
  economy — temple economies were real), and the no-powers rule
  immunizes it: with nothing granted, there is nothing to farm.

---

## Part 9 — Magic & the kitchen (settled)

The arcane system legislates this for us: it has **one postulate** and
a **price list**, and every answer below is read off them rather than
invented.

### Magic cannot MAKE food — the headline

*"Magic never creates matter… every conjuration in the roster is
therefore a **collection**."* So the genre's create-food-and-water is
**out**, and what replaces it is better: **conjuring dinner means the
dinner came from somewhere** — somebody's larder is emptier, and that
is theft with an accountability trail. The most-abused fantasy trope
is banned by the fiction's own physics, not by a designer's ruling.

### Magic CAN move energy — so it is a rung on the heat ladder

- ⚠ **CORRECTED 2026-09-03 (caught by build-1's textiles session):
  magic LIGHTS the fire; it does not BE the fire.** The first cut of
  this bullet read η = 0.85 (*"thermalisation is the cheapest thing
  energy can do"*) as making the mage-heated pan an arcane rung of
  Part 7's fuel ladder. That confuses the efficiency of **one delivery**
  with the economics of **sustained** delivery. Kell's economic
  corollary is explicit — *"magic is excellent at what happens ONCE and
  poor at what must be HELD"* — and it names this exact case:
  **"furnace over firebolt for sustained heat."** Cooking needs *held*
  heat for minutes to hours, so a magically-run range is uneconomic by
  the fiction's own rules.
  ⭐ What magic IS good for here is the **impulse**: ignition. Lighting
  a fire with no tinder, in the rain, instantly — a real convenience
  that still leaves you needing fuel to cook. Magic is not a rung on
  the fuel ladder; it is a **firelighter**.
- ⭐ **The price list already wrote the joke**: losses dissipate *in
  the caster*, so casting warms you — *"novices run hot and masters
  stay cool… a novice at 0.35 dissipates six times what a master at
  0.85 does, and **cooks accordingly**."* The apprentice heating the
  pan is himself the thing getting hot.
- ⭐⭐ **Magical refrigeration is Carnot-priced, and the pumped heat
  goes INTO THE CASTER** (`W ≥ Q · (T_hot − T_cold) / T_cold`) — *the
  mage who chills the larder cooks himself.* Which is precisely why
  magic does **not** kill the icehouse trade or trivialize the cold
  chain: **the price list is the balance mechanism**, and nobody has
  to nerf anything.

### Magic food that heals is a magic ITEM shaped like a pie

- **The food is the carrier, not the cause** — it would work
  identically as a ring. So there is no "magic cooking" trade: the
  cook makes the pie, the enchanter enchants it
  ([magic-items](../../subsystems/magic-items.md)' three item classes,
  the `S* = inflow/d` charge economy, BUC, `canAfflict`, and
  **census-gated distribution** — so magic food is **rare by
  construction**, never a staple). Part 3's rule holds: cooking is
  not a backdoor to effects. The honest answer to *"but magic food
  heals, right?"* is **yes — because it is magic, not because it is
  food.**
- ⭐ **Eating is a uniquely interesting delivery**: the one act that
  puts an object *inside* you and consumes it — a natural single-use
  item class, and **the cleanest consent seam in the game** (you
  chose to eat it; `canAfflict` gets its clearest case).
- **The dark side ships already**: poisoned or cursed food (toxins +
  BUC + the accountability ledger) — the banquet betrayal is
  mechanically real, which is exactly the drama worth having.

### The pedagogy: magic doesn't escape the physics, it relocates

The arcane system is *built on* thermodynamics (one impossible
postulate, everything else real) and so is this design — so a
mage-cook is **the same energy accounting either way**. Exergy, the
second law, and Carnot taught through dinner.

---

## Part 10 — Failure, measurement & taste (through the four lenses)

Read against the project's four lenses — **pedagogy · creative
expression · immersion and roleplay · gamification and
self-improvement**.

### Can you burn things? No — and that is a real gap, not a tidy deferral

**v1 has exactly two failure modes, and both ship**: **refusal** (the
diegetic declines — `no-recipe`, `insufficient-input`, `missing-tool`,
`insufficient-heat`; costs only time) and the **off-spec mint** (the
pot-luck fill, the generic worked lump — *you made something, just not
the thing*). What v1 **cannot** do is **degrade** (scorch),
**destroy** (burnt to carbon) or **escape** (the grease fire) — all
three need an unattended pan whose temperature evolves, i.e. **S1 +
S2**.

⚠ Stated bluntly, because it matters: **v1 cooking cannot fail
*interestingly*; it can only refuse.** Burning is the most universal
cooking failure there is, so this is an experiential hole rather than a
neat scoping line — and the strongest argument that the tending wave is
*near*, not "someday."

- ⭐ **When it lands, the smell is the warning.** `smell` is a shipped
  sense channel, so a scorching pot emits an olfactory signal *to the
  room* — socially readable, and someone else can shout. Failure
  becomes multiplayer.
- Failure must stay **informative and survivable**; the BKT difficulty
  coupling already refuses to reward grinding.

### Measurement: explicitly NOT enforced

- ⭐⭐ **Precision is a property of the INSTRUMENT, never of the
  player's typing.** Making someone declare grams is data entry, not
  skill. The shipped pattern already fits: `control` on capital floors
  the outcome, so a graduated measure or scale is *capital*.
- ⭐ **Eyeballing cannot be a dice roll** (the uncertainty doctrine).
  So eyeballing is **coarser units, deterministic**: a pinch, a splash,
  a handful are real quantities the measure grammar already carries.
  With no scale the handful **is** what you added — the outcome
  differs because the *input* differed, not because a die fell.
- ⭐⭐ **The cook/baker split is ALSO a precision split**: baking is
  chemistry that punishes imprecision (which is *why* bakers own
  scales); a stew tolerates a handful. The baker pack authors **tight**
  tolerance, cooking loose — the taxonomy paying out again.
- **Pre-registered additive field**: a **tolerance band** on
  `RecipeInputSlot` (v1 matches exactly; bands are baker/tending-era).

> Shipped as the palate: `taste` renders composition through the taster's competence in the discipline that made the thing, derived from `BulkPayload.parts`/`tastes` and the closed five-taste `Material.tastes`, never a gate → [crafting.md § The palate](../../subsystems/crafting.md). Tasting for doneness waits on the tending wave.

### The four lenses, tabulated

| | burning / failure | measurement | taste |
|---|---|---|---|
| **pedagogy** | heat × time is the variable | precision matters *where it matters* — the most useful lesson a cooking course teaches | expertise IS discrimination |
| **creative expression** | the off-spec mint is where improvisation lands | loose tolerance is what *permits* improvising | add → taste → adjust; without tasting, improvisation is blind |
| **immersion / RP** | the burnt smell reaches the room | "a handful of salt" reads better than 47.3 g | the spoon; and tasting another's food is trust |
| **gamification / self-improvement** | failure informative, never punishing | the scale is capital that measurably improves outcomes — progression with no stat | **you advance by perceiving more** |
