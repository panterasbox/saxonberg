# Cooking slate — the trade, the method vocabulary, and the clock it answers

> **Status: design, captured 2026-09-02.** The forks below were settled in
> conversation; this slate records the decisions and their rationale. The
> spoilage core is **not re-designed here** — the
> [spoilage design pack](./spoilage-design-pack.md) is planner-ready and this
> build **absorbs it as wave 0** (§ build shape).

See also: [spoilage-design-pack](./spoilage-design-pack.md) (⭐ **wave 0 of
this build** — the mixin, the honest microbiology, the interop, all settled
there) · [preservation-slate](./preservation-slate.md) (⚠ **the victualler's
territory — this build does not annex it**; § boundaries) ·
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
- **Medium** — the vessel's bulk contents, which the bulk substrate
  already tracks. Water in the pot = wet; rendered fat = fat method; a
  bare spit or rack = dry. No new state, no new mixin.
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
   doneness — did *you* scorch it?) or without one (free cooking).
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
  `applyEdibleOutput`.
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
5. **Disease** inherits the W0 growth term whenever its build comes,
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

⚠ Build-freeze note: captured during the client-rebuild design-only
phase. This slate is the input to a `/requirements` cycle when the
freeze lifts.
