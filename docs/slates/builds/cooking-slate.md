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
position applies. **The baker gets its own pack, later.** Two notes held
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
| **wet** | water | **hard-capped at 373 K, always** | collagen → gelatin over time; browning *never* |
| **fat** | rendered fat / oil | capped at the fat's **smoke point** (~450–480 K) | Maillard yes, and fast |
| *(combination)* | sequenced | sear-then-stew = braise | not a primitive — a sequence of the three (deferred, § horizons) |

The teachable core — the honest-science reason this cut wins — is that
**water can't brown**. A pot of stew in a 1300 K forge is still a 373 K
pot of stew. That falls straight out of physics the engine already has
(`ThermalApi.reachableHeatFor`, real Kelvin, phase change, Materials with
`boilingPoint`); we don't enforce a method, we let the medium impose its
cap and the recipe declare the chemistry it needs.

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
   players already losing food; the icehouse keeper wakes with customers.
2. **Preservation / the victualler** — the seasons-scale answer arriving
   when the days-scale answer has taught everyone the problem; salt gets
   its demand, the trade geography wakes.
3. **The baker pack** — its own cycle: mill chain upstream, dough-as-
   ferment, staling as the goods clock.
4. **The tending wave** — durative cooking (the `FermentingMixin` shape
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
     green tea is the same field** (§ Part 2 hot drinks): the tending
     wave arrives with a second customer already waiting.
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
5. **The antitoxin** — the ptomaine Condition seed declares
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
6. **Disease** inherits the W0 growth term whenever its build comes,
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

⚠ Build-freeze note: captured during the client-rebuild design-only
phase. This slate is the input to a `/requirements` cycle when the
freeze lifts.
