# Whiskey styles — implementation plan

Executes [whiskey-styles-slate.md](../slates/builds/whiskey-styles-slate.md)
(**kind: feature · leads from: content**, with four narrow kernel seams the
rows need; first consumer `trade-distilling` + `trade-malting`, driven at
Crowsfoot's distillery floor in `terminus`). There is **no requirements doc
for this build**: the slate carries the agreed product scope — six items —
and the hard constraints, and the user's instruction was *"build it all… I
wanna know all this works before we move on."* So this plan also carries
the **drive script** (§ Drive script) that a requirements doc would
normally hold.

Branch `design/2026-10-03-cuts`, MR !336 already open; this extends that
branch. The predecessor is [whiskey-plan.md](./whiskey-plan.md), whose
build record is the grounding this plan starts from.

> ⭐⭐ **The one sentence the whole plan hangs on:** *what a thing IS is a
> Material; how much of something it carries is a payload
> concentration.* A cereal is a kind → a material (`grain-whisky`). Peat
> smoke is a quantity that blends when you vat → a per-litre concentration
> on the payload. Cask character is extraction over time → a concentration
> the cask writes. A blend is a kind made by an act → a material via a
> recipe, carrying the concentrations of what went in. Nothing in the plan
> needs a second rule.

---

## Grounding

Verified by opening files, 2026-10-05. The slate's grounding (peat ships;
two cereals; ten woods; the vermouth-shaped blend; `FractionSchedule`
matches by tag) is taken as read. What follows is what the slate did NOT
check and the decisions rest on.

### What a draw, a pour, a recipe and a grind each do to a payload

- **A pour blends, per litre.** `BulkableLogic.transfer` step 5
  (`platform/idea/api/BulkableLogic.ts:318-440`) carries the source
  payload whole into an EMPTY destination and then runs five domain blends
  on every pour: freshness, water activity, pathogens (+ the vessel's
  surface load), `DissolvedToxins.blend` (volume-weighted), and blood
  (identity). `carryBatchIdentity` (`:575-587`) copies grade + maker +
  recipe + `craftedAt` into an empty destination only; `carryTopUpGrade`
  (`:594-599`) is `min` on a top-up. **Eight insertions**, as the
  predecessor recorded.
- ⛔ **A recipe does NOT blend.** `CraftingLogic.applyBulkOutput`
  (`platform/idea/api/CraftingLogic.ts:1360-1440`): the authored-material
  branch sets the output slot's material and amount, then
  `setPayload({...outSlot.getPayload(), maker})` — the OUTPUT vessel's
  prior payload (empty on a fresh clone) plus the maker. **No input
  payload reaches the output.** The derived branch builds a `composition`
  from the inputs' materials and nothing else. So a vatting recipe on the
  vermouth shape would today **launder the methanol dose**: two bad bottles
  blended are a clean one. This is the fact that forces W0.
- **A draw from a running still** (`lib/fractionation/Fractionating.ts:598-657`
  `getBulkPayloadForDraw`) starts from the host slot's payload (`base`),
  blends the span's fraction `toxins` into `dissolvedToxins`, restamps the
  host's Graded face to the span's worst band, and sets `maker`. It does
  **not** transform anything else the charge's payload carried — a
  concentration on the wash passes through at charge strength.
- ⛔ **A grind drops the payload.** `trade-milling/src/idea/cmd/milling/MillController.ts:375-420`
  `fill()` clones a fresh sack and stamps `{composition, water}` from the
  `ComminutionPlan`; the SOURCE sack's payload is never read. A
  concentration on the malt would vanish at the millstones.
- `Maturing.ensureInteriorMaterial` (`lib/maturation/Maturing.ts:889-904`)
  swaps the material via `setBulkMaterial`, which keeps the payload — the
  predecessor's "methanol does not age out" rests on this and it holds.

### ⛔⛔ The mill cannot make grist — the shipped link 5 is a FAUCET

`ComminutingMixin.productMaterial` is ONE path per instrument row
(`lib/craft/Comminuting.ts:200`, `:276-279`, `:329`), and **both shipped
mill rows pin it to wheat flour**:
`trade-milling/content/trade/milling/thing/grist-mill.yaml` and
`quern.yaml` both author `productMaterial: /stuff/idea/material/food/wheat-flour`.
`MillController.chargeFrom` (`:235-270`) accepts anything tagged `grain`
or `malt` (`GRINDABLE`, `:70`) — so **a sack of malt fed to the mill comes
out as wheat flour**, tagged `wheat-flour`, which no mash slot asks for.
Every grist in the world comes from the distributor's faucet
(`terminus/.../distributor/thing/counter.yaml:50` — `grist-sack`, par 6,
price 7; its own comment says *"malt at 5 plus your own time at a quern,
against grist at 7"*, which the quern cannot deliver).

⚠ `world/__tests__/whiskey-vertical.test.ts:245-248` asserts link 5 by
reading `grist.yaml`'s tags against the mash slot — a rows-level tag
check, never a grind. And the predecessor's live drive stopped at *"There
isn't enough grist"* without milling. **The vertical's link 5 has never
run.** Peated malt that cannot become grist cannot reach the still, so this
build fixes it (W1) rather than planning around it.

### The nose

- `PalatableMixin` composes on **`ServingVessel` only**
  (`platform/thing/ServingVessel.ts:37`; the host rationale is written at
  `lib/metabolism/Palatable.ts:25-60` — it was on `Bulkable`, then
  `CraftVessel`, both wrong). `palateAugmenter` is `taste`-channel only
  (`:181`), reads `composition`, derives the five `BASIC_TASTES`
  (`lib/material/Material.ts:88-94`, closed), and bands DETAIL by the
  viewer's competence in the blend's discipline (`renderPalate`, `:136-152`:
  `competent` picks out ingredients, `proficient` reads the grade).
- A bottle (`Bottle` = `VesselKind(Circulating(Sealable(GradedReceptacle)))`,
  `platform/thing/Bottle.ts:38`), a `Vat` and a `Receptacle` compose no
  palate: **`smell cask` and `taste bottle` render nothing of the contents
  today** beyond `bulkContentsAugmenter`'s "It holds …" line, which prefers
  `payload.appearance` over the material's (`lib/bulk/Bulkable.ts:701`).
- The still's `fractionAugmenter` (`Fractionating.ts:140-162`) is the only
  shipped `smell`-channel augmenter; it renders the lagged fraction's
  `character` and nothing from the payload.
- No aroma vocabulary exists anywhere (`grep -rl "imparts\|aroma" lib/` →
  only `combat/DeliveryProfile.ts`). `smoke-cure.yaml` (trade-cooking) is a
  `cure:` + heat band; it carries no smoke onto the cut.

### Fuel is anonymous

`BurnerMixin`'s fuel is a `%` `Reserve` (`lib/fire/Burner.ts:59-60,
184-186`); `Firebox` = `Burner(LightSource(Reserved(Thermal(Thing))))`
(`lib/fire/Firebox.ts:44-46`); `Oven` = `Container(Placing(Firebox))`
(`platform/thing/Oven.ts`) — the container is the CHAMBER you put bread in,
not a fuel box. `reachableHeatForImpl` (`lib/thermal/Thermal.ts:1139-1152`)
returns a temperature, never the source. **Nothing in the engine knows
what a kiln is burning**, so "kiln over turf" has no mechanism; the
predecessor recorded burner refuelling as the fire/energy slate's.

### Rows the decisions touch

- `peat.yaml` (`base-library/.../material/organic/peat.yaml`) tags
  `organic, earth, solid, fibrous, fuel` — ⛔ **no `peat` identity tag**. A
  slot `category: peat` fails closed and silent (the hard constraint).
  `wheat-grain`/`barley-grain` carry their own names; `peat` does not.
- `turf.yaml` → `/trade/quarrying/thing/Turf` = `WaterActivityMixin(Firewood)`,
  `Firewood` = `Combustible(Thermal(Reserved(Good)))`. It passes
  `isItemCandidate` (`CraftingLogic.ts:562-572`: Tangible, has material,
  not Tool/Crafted/Container/Bulkable/Organism) — a turf can be an item
  slot's candidate. ⚠ The slot cannot see moisture: a sodden turf is
  accepted as fuel. Recorded as a limit (§ Risks).
- `whiskey.yaml` tags `liquid beverage drinkable alcoholic spirit whiskey`;
  `new-make.yaml` tags `… spirit new-make`; `wash.yaml` tags `liquid wash`.
  The Lounge par line is `{category: whiskey, unit: L, level: 6}`
  (`saxonberg-lounge/.../business.yaml:172`); `whiskey-sour.yaml` takes
  `category: whiskey, minGrade: fair, 0.06 L`.
- `wheat-flour.yaml` tags `food flour wheat-flour gluten baking`;
  `grist.yaml` tags `food grist brewing feed`; `malt.yaml` tags
  `solid food grain malt`.
- `cask.yaml` (distilling, oak, 25 L, `category: cask`, mass 40) and
  `whiskey-aging.yaml` (`chemical`, `inputCategory: new-make`, `sealedOnly`,
  `ratePerDay 0.022`, 275/290/305 K). The brewing `cask.yaml` is the
  50 L sibling with `cask-conditioning` (`ale` → `cask-ale`).
- `MaturationProfile` fields (`lib/maturation/MaturationProfile.ts:189-300`):
  no vessel field of any kind. `forMaterial` matches the LIQUID's tag;
  double match = warning, lowest key.
- `MaturingMixin` (`Maturing.ts`): `startBatch` (`:745`) keys on the
  interior material; the active branch (`:590-672`) folds the conversion
  integral, `applyBatchGrade()` (`:874-882`) writes
  `min(bandFor(worstStretch), batchInputBand)`, and the product swap
  happens only at `fractionConverted >= 1` (`:667-671`). Nothing is
  drawable as product before full conversion.
- `FractionSpec` (`lib/fractionation/FractionSchedule.ts:59-92`):
  `key · upTo · character · gradeBand · toxins? · requiresHeatK?`.
- Crowsfoot: `outfit.yaml` seat `hand` `fulfills: [distilling, fermenting]`,
  `call: rota`; `hand.yaml` dossier `distilling: proficient`,
  `fermenting: competent`; `still-book.yaml` `offeredRecipes: [wash-mash, compound-gin]`
  with `steep-barley`/`kiln-malt` **off** because `lint:menu-staff`
  (ceiling 3) found nobody seated to `malting`. ⚠ **The shipped drive is
  red here:** `packages/wire/tests/whiskey.dirty.wire.test.ts:285-296`
  asserts the still-book offers `steep` and `kiln`, and `:368-381` orders
  both. Reported in § Risks; W2 resolves it.
- `floor.yaml props:` — works-board · racking · stock · still · mash-tun ·
  standpipe · still-book · vat · vat · slop-bucket · cask · malting-floor ·
  malt-kiln · malt-sack. **No mill of any kind on the floor** (grist is a
  purchase several hops away — the predecessor's drive record).
- Disciplines shipped (`idea/Discipline/*.yaml`, 77 rows): `distilling`,
  `malting`, `milling`, `fermenting`, `brewing`, `mixology`… — **no
  `blending`, no `coopering`**.
- Ratchets today: `LIB_STATICS_CEILING = 342`, `SEAM_CEILING = 19`,
  `MENU_STAFF_SHORTFALL_CEILING = 3`, `MASS_CEILING = 241`,
  `ON_CREATE_CEILING = 82`.

---

## Plan-level decisions

**D1 — Kind is a Material; quantity is a payload concentration.** Stated
above; every decision below is an application. It is also the tree's own
rule already: `wheat-grain.yaml` — *"extraction is continuous and lives on
the flour's payload, not in the vocabulary"*; and *a cereal is a kind*.

**D2 (brief b) — Peat phenols get a SIBLING field, `dissolvedAromatics`,
and the blend ARITHMETIC is promoted, not the toxin field.** Phenols are
not toxins: a toxin routes to a body's burden at ingest; an aromatic routes
to a nose. Generalising `dissolvedToxins` into a typed `dissolved[]` would
rename a shipped field at its second consumer and change `routeIntake`'s
contract for no gain. But the volume-weighted blend is **byte-identical**
for both, and this build gives it a **third call site** (transfer,
`applyBulkOutput`, the mill's `fill` — D4), which is the repo's promotion
test met on the arithmetic rather than on the field. So:
`lib/bulk/Concentration.ts` (value object, no subsystem import) holds
`blend(a, aL, b, bL)` / `isClean` over `{type, amount}[]`;
`DissolvedToxins.blend` becomes a forwarder onto it (its `labileAtK`
handling stays local); `lib/metabolism/DissolvedAromatics.ts` is the new
sibling — `declare module '../bulk/Bulkable'` adds `dissolvedAromatics?: AromaTag[]`
(mg/L), with a **closed aroma vocabulary + odour thresholds** (D3) and the
competence-banded renderer. Lives in `lib/metabolism/` beside `Palatable`
because that is where the tree already derives what a thing tastes like.
⚠ `lint:lib-statics` rises by the statics added (expected 342 → 345:
`Concentration.blend`, `Concentration.isClean`, `DissolvedAromatics.render`);
each is a twin of a counted member and the reason goes in the gate file.
**Flagged for the user** (§ Risks 1).

**D3 — Aromas are a closed kernel vocabulary with odour thresholds, not
authored prose.** `AROMAS` in `DissolvedAromatics.ts`: `smoke · vanilla ·
oak · char · fruit · floral · grain · honey · spice · solvent · sulphur`,
each with a detection threshold in mg/L taken from the literature (cited in
the file) and bands `faint (≥1×) · clear (≥3×) · strong (≥10×)`. The
precedent is `BASIC_TASTES` — *"the physiology's own closed list"* — and an
odour threshold is physiology, not content. A row authors a WORD and a
NUMBER (`{type: smoke, amount: 30}`); the sentence a player reads is
derived. Competence resolves detail: `untrained` smells the dominant aroma
with no intensity word; `competent` every aroma above threshold with its
band; `proficient` adds the grade line Palatable already has. No digit ever
renders. Adding a word is a kernel edit — by design; a pack wanting a
twelfth word is the signal to revisit.

**D4 — One fold, three call sites: `BulkableApi.blendPayloads`.** A new
`BulkableLogic.blendPayloadsImpl(from: BulkPayload|null, fromL, to: BulkPayload|null, toL) → BulkPayload`
folds exactly the per-litre payload domains (`dissolvedToxins`,
`dissolvedAromatics`) and min-folds `maturedDays` (D7) and is called from transfer step 5 (replacing the
inline toxin block), from `CraftingLogic.applyBulkOutput` over the matched
bulk inputs (each at its `measureL`; the authored branch ALSO carries
`recipe.imparts` — D6 — and stamps `payload.appearance` when the recipe
authors an `outputAppearance` that differs from the material's, so a sack
of peated malt reads as what it is), and from the mill's `fill()` carrying
the source sack's payload at the product's litres. Freshness, water,
pathogens and blood stay where they are (they need slot/host context, not
just the payload). ⭐ This is the first step of the participant-hook
refactor the predecessor filed, taken only as far as the facts force it;
the transfer count goes 8 → 8 (one block replaced by one call), not 9.

**D5 (brief a) — Cask character is `imparts` on the VESSEL, applied by the
clock, and it is a kernel field — on `MaturingMixin`, not on the profile.**
Why not the profile: `MaturationProfile` keys on the LIQUID, and two
profiles for `new-make` (oak / charred) are the double-match rule's
warning case; a `vesselCategory` requirement on the profile enumerates
(liquids × vessels) rows. Why not the wood Material: a charred first-fill
cask and a third-fill plain cask are both oak — the difference is the
VESSEL's state and history, not the species. So `MaturingMixin` gains
`imparts: AromaTag[]` (authorable, per litre at full conversion) and
runtime `impartedFraction`; on each active reconcile it adds
`imparts × (f − impartedFraction)` to the interior payload's
`dissolvedAromatics` and advances the marker. Composing claims: *a
maturing vessel may give its contents a character over the course of a
batch* — true of every vat (an oak fermenter does), vacuous when the row
authors none, **no guard re-narrows the host set**. A second wood is a Vat
row with `_materialPath` and its own `imparts` — rows, no profile. The
aging profile itself is unchanged except for D7. ⚠ Known coarseness: the
figure is per litre regardless of fill level (a small fill in a big cask
should extract harder); recorded, not modelled.

**D6 — Peat enters as a recipe INPUT, and the recipe `imparts`.**
Fuel is anonymous (Grounding), so the honest shape the substrate allows is:
`kiln-malt-peated` = `kiln-malt` + an item slot `{peat ×4}` + `imparts: [{smoke, 30}]`.
`Recipe.imparts?: AromaTag[]` is a new kernel field (lib/craft), read by
`applyBulkOutput` (D4) — generic: the smokehouse is its obvious second
consumer. The player derives it from the fuel (the turf is consumed); the
amount is authored. ⚠ The kiln's own `%` reserve still provides the heat
— two fires in the fiction, one in the model; the honest fix (a burner that
knows its fuel) is the fire/energy slate's, and this build does not solve a
cross-cutting capability inside a trade. `peat.yaml` gains the `peat`
identity tag (the barley precedent).

**D7 (brief d) — Age is MATURITY, modelled; the numeric age statement is
not built.** The cask profile runs on a clock but today nothing is
drawable as product before `f = 1`, so "when to bottle" is not a choice.
`MaturationProfile.productAtFraction` (default 1) swaps the interior to the
product at that conversion; `applyBatchGrade` gains a maturity term —
`band = min(damageBand, inputBand, maturityBand)` where `maturityBand`
climbs linearly from `poor` at `productAtFraction` to `masterful` at 1 —
**vacuous for every shipped profile** (at `p = 1` the product exists only
at `f = 1`, where the term is `masterful`). So a cask bottled early yields
young, pale, `poor`/`fair` whiskey the Lounge's sour (`minGrade: fair`)
may refuse, and a cask left to finish yields the cut's grade with full
wood. That is lens 4's cash-flow fork, made real by a consumer that already
exists. ⭐ **And the number is BUILT** — the user's call, 2026-10-05, over the
plan's own recommendation to defer it. `Maturing.getBulkPayloadForDraw`
stamps `maturedDays` (game-days of elapsed conversion for the batch the
draw comes from); `blendPayloads` (D4) takes the **min** across inputs, so
a drop of young spirit in a vat of old tells the truth rather than
averaging it away; `palateAugmenter` renders it at `proficient` as a
clause, **in game-days, named as game-days** — the compressed clock was
the only argument for deferring, and saying "nineteen days in the wood"
is honest about the world it is in. No recipe, par line or price reads it:
it is a **statement**, and the grade remains what gates the sour. ⚠ A
blend of a 90-day malt and a 20-day grain therefore reads *twenty* — which
is exactly what an age statement legally means, and worth checking the
prose says so plainly.

**D8 (brief c) — A blend's grade is weakest-link; its character and dose
are volume-weighted; its maker is the BLENDER.** Grade: the shipped
`Grade.deriveAtFixedControl` (min) — which gives the real economics of
blending for free: a litre of `fine` malt stretched with two of `fair`
grain is three litres the bar will buy at `fair`, not one it would buy at
`fine`. Character and dose: D4's fold (so a bad cut vatted is a bad blend,
diluted and not laundered). Maker: `applyBulkOutput` stamps the acting
maker — a blend is a new product by a new act, so unlike a top-up it
re-signs, and the harm ledger names the blender who put another hand's bad
spirit in front of a drinker. **Flagged** (§ Risks 2): the alternative,
carrying every upstream maker, needs `payload.maker` to become a list.

**D9 — Grain whisky is a second material LINE, rows only, no new
mechanism.** Wheat flour (the mill makes it today) + a little grist for
the enzymes + water → `grain-distillers-wort` → profile `grain-wash` →
`grain-wash` → schedule `grain-wash` (tighter, more neutral, a shorter
head) → `grain-new-make` → profile `grain-whisky-aging` → `grain-whisky`.
Tag hygiene against the double-match rule: `grain-wash` must NOT carry
`wash`; `grain-new-make` must NOT carry `new-make`. `grain-whisky` carries
`whiskey` (it is legally whisky, and the sour's `minGrade: fair` is the
quality gate) and NOT `malt-whisky`.

**D10 — Blending is one recipe, `vat-whisky`, on the vermouth shape.**
Slots `{malt: category malt-whisky, 0.3 L}` + `{grain: category grain-whisky, 0.45 L}`
→ `blended-whisky` (tags `… spirit whiskey blended-whisky`) into a
cloned `empty-spirit-bottle`, discipline `distilling`, difficulty
`standard`. `whiskey.yaml` gains the `malt-whisky` tag (slot constraint).
No `blending` Discipline: a distillery vats its own, and lens 1's
dominance question is answered by the cut and the vatting both being
`distilling` judgment. A `vat-malts` (two malts, peated × unpeated) is the
same shape and is NOT shipped — one recipe proves the mechanism and the
second is a row somebody adds when they want it.

**D11 — The mill makes what it is fed.** `ComminutingMixin` gains
`products: ComminutionProduct[]` — `{inputTag, product, residue?, residueFraction?, vessel, residueVessel?}`
— and the plan picks the first entry whose `inputTag` the charge material
carries, falling back to the scalar fields (so every shipped row behaves
as before until it authors a table). `grist-mill.yaml` and `quern.yaml`
author `products: [{wheat → wheat-flour/bran/flour-sack}, {barley → barley-flour/bran}, {malt → grist, residueFraction 0, grist-sack}]`.
Kernel (`lib/craft`) + pack `src/` + rows; **a fix of a shipped defect
this build's chain cannot do without.** The quern is placed on Crowsfoot's
floor so a maltster mills where they kiln.

**D12 — The `malting` seat goes on the hand, and the maltster is named as
a vacancy.** `outfit.yaml` seat `hand` `fulfills: [distilling, fermenting, malting]`;
`hand.yaml` dossier `malting: proficient` (`kiln-malt` is `standard`, and
only `proficient` licenses standard work — the hand's own comment).
`steep-barley`, `kiln-malt`, `kiln-malt-peated` go on the still-book;
`lint:menu-staff` passes at its ceiling; the shipped drive's red
checkpoint goes green. Lens 3b (#86: *every NPC doing two jobs is a
vacancy we deleted*) is honoured by saying so: a maltster is a real
unfilled seat at Crowsfoot, recorded in `vocations.md` at the sweep.
**Flagged** (§ Risks 4) — the alternative is a second Cast.

**D13 — The nose reads at a GLASS and at the running still; no palate on
bottles or casks.** The cooking build fought this twice; its answer stands
(*what a trade works in stays on `CraftVessel`*). A distiller noses a cask
by pouring a dram into a glass, which is literally how it is done. So:
`palateAugmenter` renders `dissolvedAromatics` on `smell` (and on `taste`,
retronasally) for a `ServingVessel`; `fractionAugmenter` appends the
running draw's aromatics so the smoke is *heard arriving* in the late
hearts; a `nosing-glass` ServingVessel row ships in `trade-distilling` and
stands on the floor. A sack of peated malt reads its recipe's appearance
("dark, smoke-reeking malt") via D4's appearance stamp.

**D14 — Smoke rides the TAILS: `aromaticCarry` per fraction.**
`FractionSpec.aromaticCarry?: number` (default 1 — unchanged
concentration) multiplies the charge's `dissolvedAromatics` into the
span's draw payload, volume-weighted across a straddling pour exactly as
the dose is. The wash schedule authors `foreshots 0 · heads 0.5 · hearts 2.5 · tails 6`
— phenols are high-boiling and come over late, which is the real reason a
heavily peated house cuts lower. ⭐ This is the build's best lens-1 line:
the malting choice changes the right cut. Mass balance at those figures
≈ 70 % of the charge's phenol over, 30 % in the stillage.

**D15 — Bourbon, rye and Canadian are OUT, said plainly.** No corn, rye or
oats exist as crops or materials. They are a farming content lift (a crop
row, a plant row, a material each) plus the rows this build shows the
shape of; a renamed barley would be a lie on a platform that teaches.

---

## ⭐⭐ Host placement

| new thing | host | what composing it claims | why not elsewhere |
|---|---|---|---|
| `BulkPayload.dissolvedAromatics?: AromaTag[]` | the payload value object, declared from `lib/metabolism/DissolvedAromatics.ts` | *this matter carries these flavour compounds per litre; they blend by volume.* Claims nothing of any class; a payload without it is byte-identical to before. | Not a Material (per-instance, continuous); not `dissolvedToxins` (routes to a body, not a nose). |
| `lib/bulk/Concentration` (value object) | — | the volume-weighted blend arithmetic, shared by two concentration kinds. Imports nothing. | A free helper is banned; a value object beside `Quantity` is the named category. |
| `DissolvedAromatics` (value class) | — (the `Freshness`/`DissolvedToxins` shape over a `BulkSlot`) | the closed `AROMAS` vocabulary + thresholds + `render(tags, band)`. | — |
| `BulkableApi.blendPayloads` / `BulkableLogic.blendPayloadsImpl` | the bulk Api + logic singleton | *one place folds the per-litre payload domains.* | Not `lib/bulk` (may not import metabolism); not a free helper. |
| `Recipe.imparts?: AromaTag[]` | `lib/craft/Recipe` (+ `fromData`, `getImparts`) | *a working may put a flavour compound into its output.* Vacuous when unauthored. | Not on the Material (per-recipe fact); not on the kiln (fuel is anonymous — D6). |
| `MaturingMixin.imparts: AromaTag[]` (authorable) + `impartedFraction` (runtime) | `MaturingMixin` — so `Vat` and every Vat-family ROW | *a maturing vessel may give its contents a character over a batch.* True of any vat; a row that authors none is unchanged. No guard. | Not on the profile (keys on the liquid — the double-match trap); not on the wood Material (char and seasoning are vessel state); not on `VesselKind` (it is the clock that applies it). |
| `MaturationProfile.productAtFraction` (default 1) | the profile row | *the product exists from this conversion on; full conversion is still `finished`.* Every shipped row keeps 1 and behaves identically. | — |
| the maturity term in `applyBatchGrade` | `MaturingMixin` | *a drawable product below full conversion is graded by how far along it is* — vacuous at `p = 1`. | — |
| `FractionSpec.aromaticCarry?` | the schedule row | *this fraction carries the charge's aromatics at this multiple.* Default 1. | — |
| `ComminutingMixin.products: ComminutionProduct[]` | `lib/craft/Comminuting` — so `GristMill` rows | *an instrument may make a different product from a different feed.* Scalar fields remain the fallback. | Not on the grain Material (the mill decides what it bolts); not in the pack controller alone (the plan arithmetic is the mixin's). |
| `palateAugmenter` gains the `smell` channel + aromatics | `PalatableMixin` → `ServingVessel` only | unchanged host set. | D13. |
| `fractionAugmenter` appends the draw's aromatics | `FractionatingMixin` → `Still` | unchanged host set. | — |
| `kiln-malt-peated.yaml` recipe | `trade-malting/content/recipes/` | rows. | — |
| `grain-*` materials, `grain-wash-mash` recipe, `grain-wash` profile + schedule, `grain-whisky-aging` profile, `blended-whisky` material, `vat-whisky` recipe, `charred-cask.yaml`, `nosing-glass.yaml` | `trade-distilling` rows | rows over shipped classes. | — |
| `peat` tag on `peat.yaml`; `malt-whisky` tag on `whiskey.yaml`; `products:` on the two mill rows; `imparts:` on `cask.yaml` | tag/field edits on shipped rows | — | ⚠ a row edit never reaches a booted world: **drop the dev DB** before the drive. |
| `malting` seat + dossier claim; quern, charred cask, nosing glass in `floor.yaml props:`; three malting lines on the still-book | `terminus` + `trade-distilling` rows | — | D12. |

Nothing is retired. No new mixin, no new Api, no new module category, no
new free helper, no new collection, no migration.

---

## Convention conformance (checked this cycle)

- `props:` / `cast:` on `floor.yaml` ✓; new fixtures under `props:`.
- Locations: none new. `<root>/<branch>/`: all new rows under
  `/trade/distilling/<branch>/…`, `/trade/malting/…`; kernel value objects
  in `lib/bulk/` and `lib/metabolism/`; no new `platform/` class.
- Module scope declares: `AROMAS` is a `const` table; no module-scope
  statements. Import boundary: `lib/bulk/Concentration` imports nothing;
  `lib/metabolism/DissolvedAromatics` imports `lib/bulk` types (the
  `DissolvedToxins` precedent); `BulkableLogic` and `CraftingLogic`
  (`platform/idea/api`) import both. The milling pack imports the kernel by
  `@saxonberg/server/mud/…` only.
- Verbs on objects: no new verb anywhere; `slot`-bound value objects;
  `BulkableApi.blendPayloads` is pure arithmetic over values, not a verb on
  a host.
- Kernel mixins unchanged → no `Mixins` edit; `lint:mixin-names` untouched.
- Gates this build must pass: `lint:family` at every wave; specifically
  `lint:lib-statics` (ceiling raised with reasons, D2), `lint:unconsumed-seams`
  (every new authored field has a reader in a different file — `imparts`
  ← `CraftingLogic`/`Maturing`, `productAtFraction` ← `Maturing`,
  `aromaticCarry` ← `Fractionating`, `products` ← `Comminuting`/`MillController`),
  `lint:field-meta`, `lint:mass` (charred cask 40 kg, nosing glass 0.2 kg),
  `lint:perishable` (the grain worts copy `distillers-wort`'s spoil fields
  and sit in a `Vat`), `lint:menu-staff` (passes once D12 lands — it
  FAILS if W2's recipes go on the book before the seat), `lint:dossiers`
  rule 6, `lint:census` clause (b), `lint:authored-prose`,
  `lint:drive-scripts` (the drive is a wire file), `lint:reconcile-chains`
  (the imparts write is inside the existing trajectory-folded reconcile —
  no new sampling read), `lint:instanceable` (no `/lib/` row),
  `lint:whole-table`, `lint:imports`, `lint:module-scope`, `lint:object-verbs`.

---

## Waves

Every wave lands at a commit `build(whiskey-styles W<n>): …`, passes
`pnpm test:near` + each touched pack's vitest + `lint:family`. The full
suite runs exactly twice (pre-MR, `/finalize`). Kernel/content split is
stated per wave.

### W0 — concentrations blend everywhere matter moves (kernel)

Implements D2, D3, D4, D6 (the `Recipe` field), D13 (the renderers).
Files: `lib/bulk/Concentration.ts` (new), `lib/metabolism/DissolvedToxins.ts`
(`blend` forwards to `Concentration`; `labileAtK` merge stays),
`lib/metabolism/DissolvedAromatics.ts` (new: field declaration, `AROMAS`
+ thresholds with citations, `loads/stamp`, `render(tags, band)`),
`platform/idea/api/BulkableLogic.ts` (`blendPayloadsImpl`; transfer step 5
calls it in place of the toxin block), `api/bulk.ts` (`blendPayloads`
static), `lib/craft/Recipe.ts` (`imparts`, `fromData` validation: every
word in `AROMAS`, amount > 0), `platform/idea/api/CraftingLogic.ts`
(`applyBulkOutput`: fold matched bulk inputs at `measureL`, add
`recipe.imparts`, stamp `appearance` when authored and different),
`lib/metabolism/Palatable.ts` (`smell` channel; aromatics on both channels,
banded), `lib/fractionation/Fractionating.ts` (`fractionAugmenter` appends
`render(getBulkPayloadForDraw('interior', 0).dissolvedAromatics, band)`).
Tests: `lib/bulk/__tests__/Concentration.test.ts` (numbers computed in
the test), `lib/metabolism/__tests__/DissolvedAromatics.test.ts` (banding
by competence, no digit, dominant-only at untrained),
`lib/bulk/__tests__/DissolvedToxins.test.ts` unchanged and green (the
forwarder), a `CraftingLogic` test: two bulk inputs with doses → the output
carries the volume-weighted dose and a `recipe.imparts` aromatic (**the
laundering case**: two bad bottles blended are NOT clean), `GradeCarry`
unchanged. Acceptance: a 0.3 L @ 435 mg/L + 0.45 L @ 40 mg/L recipe
output reads 198 mg/L; `lint:lib-statics` ceiling edited with the reasons.
Commit: `build(whiskey-styles W0): a concentration blends wherever matter moves — the fold, the aroma vocabulary, and a recipe that imparts`.

### W1 — the mill makes what it is fed (kernel + milling pack + rows)

Implements D11. Files: `lib/craft/Comminuting.ts` (`products`, fieldMeta,
accessor pair, `planFor` selects by the charge material's tags, scalar
fallback), `trade-milling/src/idea/cmd/milling/MillController.ts`
(`finishGrind`/`fill`: product + vessel from the plan; **carry the source
sack's payload** through `BulkableApi.blendPayloads(source, L, null, 0)`),
`grist-mill.yaml` + `quern.yaml` (`products:` — wheat → wheat-flour,
barley → barley-flour, malt → grist with `residueFraction 0` into
`grist-sack`), `terminus/.../crowsfoot/location/floor.yaml` (`props:` +
quern), `trade-milling` tests (a malt sack grinds to GRIST; wheat still
grinds to flour; a payload on the source survives), and
`world/__tests__/whiskey-vertical.test.ts` link 5 **replaced**: grind a real
malt sack on the shipped quern row and feed the result to `wash-mash` — the
assertion that could not fail becomes one that could. Acceptance: the
distributor's grist faucet is no longer the only grist in the world.
Commit: `build(whiskey-styles W1): the mill makes what it is fed — malt grinds to grist, and a grind keeps what the sack carried`.

### W2 — peated malt (rows + one schedule field + the seat)

Implements D6, D12, D14. Files: `peat.yaml` (+ `peat` tag),
`trade-malting/content/recipes/kiln-malt-peated.yaml` (slots `green-malt 20 L`
+ `{kind: item, category: peat, count: 4}`, heat 330–360 K, `imparts: [{type: smoke, amount: 30}]`,
`outputAppearance: dark, smoke-reeking malt`, discipline `malting`,
`standard`), `lib/fractionation/FractionSchedule.ts` (`aromaticCarry?`,
validated ≥ 0) + `Fractionating.ts` (`getBulkPayloadForDraw`: the
charge's aromatics × span-weighted carry), `wash.yaml` schedule
(`aromaticCarry` per fraction, D14 figures; `rectify.yaml` 1/1/0.6/1.5;
`wine.yaml` untouched), `crowsfoot/idea/outfit.yaml` (+ `malting`),
`hand.yaml` (+ `malting: proficient`, comment), `still-book.yaml`
(`offeredRecipes: [steep-barley, kiln-malt, kiln-malt-peated, wash-mash, compound-gin]`,
the ⚠ comment rewritten to record the seat), a turf stack placed in
`floor.yaml props:` (a `trade-quarrying/thing/turf` ×4 — ⚠ `moisture: 1`;
the row placed must be DRY: author a `dry-turf` variant in quarrying
`extends: turf` with `moisture: 0.2`, or accept the wet-turf limit — see
Risks 6). Tests: `lib/fractionation/__tests__/` (carry across a straddling
pour; default 1 when unauthored), `world/__tests__/malting-chain.test.ts`
(+ the peated kiln: the sack's payload carries smoke, `look sack` reads
the recipe's appearance), `whiskey-run.test.ts` (+ a peated charge: smoke
in the hearts' draw ≈ 2.5× the charge, the tails stronger, the foreshots
clean of it), `lint:menu-staff` green. Acceptance: smoke in a dram of
peated new-make nosed in a glass reads *clear*; the untrained nose reads
"smoke" and nothing else.
Commit: `build(whiskey-styles W2): peated malt — the turf goes in the kiln, the smoke comes over in the tails, and the maltings are on the book`.

### W3 — grain whisky (content only)

Implements D9. Files in `trade-distilling/content/trade/distilling/`:
`idea/material/grain-distillers-wort.yaml`, `grain-wash.yaml`,
`grain-new-make.yaml`, `grain-whisky.yaml` (tags per D9; perishability
copied from the malt line's siblings; `toxicity: alcohol` 8/45/40);
`recipes/grain-wash-mash.yaml` (`wheat-flour 3 L` + `grist 1 L` + `water 16 L`,
tool `mash-tun`, → `grain-distillers-wort` in a `wash-bucket`, residue
`spent-grain`, discipline `fermenting`, `easy`);
`idea/maturation/grain-wash.yaml` (`inputCategory: grain-distillers-wort`,
`productMaterial grain-wash`, the wash profile's numbers);
`idea/fractionation/grain-wash.yaml` (`inputCategory: grain-wash`,
`productMaterial grain-new-make`, residue `stillage`, a shorter head
`0.004/0.02`, a longer, more neutral heart to `0.2`, tails to `0.24`,
characters authored "thin", "clean", "cereal", methanol lower than the
malt run); `idea/maturation/grain-whisky-aging.yaml`
(`inputCategory: grain-new-make`, `productMaterial grain-whisky`,
`productAtFraction` per W4 — this row lands with 1 here and W4 edits it);
`still-book.yaml` (+ `grain-wash-mash`). Tests: `whiskey-run.test.ts`
(+ the grain line end to end on real rows; the tag-hygiene assertions:
`grain-wash` ∌ `wash`, `grain-new-make` ∌ `new-make`), a `FractionSchedule`
double-match test over the whole content tree (every material tag matches
at most one schedule and one profile). Acceptance: a wheat wash charged and
run yields `grain-new-make`; the Lounge par line accepts `grain-whisky`.
Commit: `build(whiskey-styles W3): grain whisky — wheat is the second cereal, and malt and grain are different products`.

### W4 — the cask matters (kernel + rows)

Implements D5, D7. Files: `lib/maturation/Maturing.ts` (`imparts` +
fieldMeta + `getImparts/setImparts`; `impartedFraction`; the additive
write in the active branch after the conversion fold; the product swap at
`productAtFraction`; the maturity term in `applyBatchGrade`; reset in
`startBatch`), `lib/maturation/MaturationProfile.ts` (`productAtFraction`
in `(0, 1]`, fieldMeta, accessors), `getBulkPayloadForDraw` stamping
`maturedDays` + `BulkPayload.maturedDays?: number` declared from
`lib/maturation/` + the `proficient` clause in `palateAugmenter` (D7), `cask.yaml` (`imparts: [{oak 6}, {vanilla 0.5}]`),
`charred-cask.yaml` (new Vat row: oak, charred, 25 L, mass 40,
`imparts: [{vanilla 2}, {char 4}, {oak 3}]`, prose that says what it is),
`nosing-glass.yaml` (new ServingVessel row, `category: nosing`, 0.15 L,
mass 0.2), `whiskey-aging.yaml` + `grain-whisky-aging.yaml`
(`productAtFraction: 0.25`, `ratePerDay` 0.011 — whiskey at ~23 game-days,
fully matured at ~90; grain faster), `floor.yaml props:` (+ charred cask,
+ nosing glass). Tests: `lib/maturation/__tests__/InputBandCap.test.ts`
unchanged and green; new `Imparts.test.ts` (aromatics climb with `f`,
idempotent across repeated reads, a top-up dilutes, the swap keeps them),
`ProductAtFraction.test.ts` (interior is the product from `p`; grade
`poor` just past `p`, the cap at 1; a `p = 1` profile is byte-identical to
before — assert on a shipped profile), `MaturedDays.test.ts` (the draw
carries elapsed game-days; a blend of 90 and 20 reads **20**, not 55; an
`untrained` nose reads no age clause at all; a cask never opened stamps
nothing), `whiskey-run.test.ts` (+ the two
casks from one new-make: the charred cask reads vanilla/char where the
plain reads oak; bottled at `p` the whiskey is `poor` and the sour refuses
it; bottled finished it is the cut's grade). `lint:reconcile-chains`
green. Acceptance: *when to bottle* changes what a bar will buy, **and the
bottle says how long it sat** — in words, at `proficient`, in game-days.
Commit: `build(whiskey-styles W4): the cask writes its character and the clock is a choice — maturity, imparts, an age statement, and a charred cask`.

### W5 — blending (content only)

Implements D8, D10. Files: `whiskey.yaml` (+ `malt-whisky` tag),
`idea/material/blended-whisky.yaml` (tags `liquid beverage drinkable alcoholic spirit whiskey blended-whisky`,
`toxicity: alcohol 40`), `recipes/vat-whisky.yaml` (D10),
`still-book.yaml` (+ `vat-whisky`). Tests: `whiskey-run.test.ts` (+ vat a
`fine` peated malt with a `fair` grain: the blend is `fair`, its smoke is
the volume-weighted figure, a bad malt's dose is diluted and NOT gone; the
blend names the blender), `lint:menu-staff` (the hand's `distilling:
proficient` licenses `standard`). Acceptance: three litres of `fair`
blended whisky from one of `fine` malt; the Lounge accepts it.
Commit: `build(whiskey-styles W5): vatting — malt and grain into a blend that carries what went in`.

### W6 — docs, the drive, the record

`docs/subsystems/fractionation.md` (`aromaticCarry`; the smoke-in-the-tails
lesson), `maturation.md` (`imparts`, `productAtFraction`, the maturity
term; the cask as a vessel that writes), `bulk.md` (the payload table gains
`dissolvedAromatics`; `blendPayloads` and the three call sites; the
insertion count), `metabolism.md` (the aroma vocabulary beside the tastes),
`crafting.md` (`Recipe.imparts`; the mill's `products` table and the
grist finding), `vocations.md` (the maltster and the cooper as named
vacancies), `content-packs.md` one line (trade-malting's board). One-line
`CLAUDE.md` map entries left for the sweep (worktree rule 5). The drive at
`packages/wire/tests/whiskey-styles.dirty.wire.test.ts` (§ Drive script;
`packs:` += `trade-quarrying`), run against a FRESH DB, its output
appended here as the drive record. Then `pnpm test` once; push; the MR
description updated.

---

## Reachability wiring

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| kiln over peat | `order kiln-malt-peated` (shipped `order`) / `make` by hand | the still-book `offeredRecipes` + a seat that fulfils `malting` (**D12 — without the seat `order` declines and `lint:menu-staff` fails**) | the recipe row; `peat` TAG on `peat.yaml` (**without it the slot fails closed and silent**); dry turf reachable | `RecipeCatalogue` (shipped) | `order` resolves a fulfiller — the seat again |
| the smoke survives the grind | `mill sack` (shipped) | `GristMill` rows' `products:` (**without the `malt` entry the sack grinds to wheat flour**) | `grist-sack` vessel row | — | `mill` accepts `grain`/`malt` tags (shipped) |
| the smoke comes over | `pour still into glass` (shipped) | `aromaticCarry` on the wash schedule; default 1 if absent | — | `FractionScheduleCatalogue` (shipped) | — |
| nose it | `smell glass` / `taste glass` | `PalatableMixin` on `ServingVessel` — **not** on a bottle or cask (D13) | the `nosing-glass` row on the floor | — | `smell` args as shipped |
| grain wash | `order grain-wash-mash` | still-book + the hand's `fermenting` | `wheat-flour` (the mill, W1) + `grist` + water; `grain-distillers-wort` tag ↔ profile `inputCategory` | `MaturationProfileCatalogue` (shipped) | slot categories ↔ material tags |
| grain run | `pour vat into still`, `ignite still`, `pour still into …` | `Still` (shipped) | `grain-wash` tag ↔ schedule `inputCategory`, and **not** `wash` | catalogue warm | — |
| the cask writes | `pour … into charred cask`, `close cask`, wait | `MaturingMixin.imparts` on the row | `charred-cask.yaml` in `props:`; `grain-new-make` tag ↔ `grain-whisky-aging` | catalogue warm | — |
| bottle young or old | `open cask`, `fill bottle from cask` | `productAtFraction` on the profile | — | — | — |
| vat | `order vat-whisky` | still-book + `distilling` seat | `malt-whisky` tag on `whiskey.yaml`; `grain-whisky` tag; an `empty-spirit-bottle` clone | `RecipeCatalogue` | slot ↔ tag |
| sell | `job claim` / `put bottle on bench` / `job complete` (shipped) | Mara's par line `category: whiskey` | `whiskey` tag on `grain-whisky` and `blended-whisky` | — | — |
| the sour refuses young whisky | `order whiskey-sour` at the Lounge | the recipe's `minGrade: fair` | a `poor` young bottle | — | — |

⚠ **The pack-installed precondition** the predecessor found: every pack
the drive's rows name must be in the repo root `package.json`'s
`@saxonberg/content-*` dependencies. This build adds no pack, so the only
new dependency edge is `terminus` → `trade-quarrying` (the turf) and
`terminus` → `trade-milling` (the quern) in `packages/content/terminus/package.json`
— install ORDER, not shipping; both packs already ship.

---

## Acceptance-criteria coverage

The slate carries scope, not numbered criteria; these are the criteria
this plan commits to, observable from outside the code.

| # | criterion | wave | how proven |
|---|---|---|---|
| 1 | A player can kiln malt over turf, and the smoke is in the spirit a glass of it is nosed from, in words with no digit | W0, W2 | world test + drive 3, 6, 9 |
| 2 | The smoke arrives late in the run — the foreshots are clean of it and the tails are heavy with it — so a peated house's right cut is lower | W2 | schedule test; drive 8 |
| 3 | A malt sack ground on the shipped quern is GRIST and goes into the mash | W1 | milling test; the rewritten vertical link 5; drive 4 |
| 4 | Wheat becomes grain whisky through its own wash, run and cask, and malt and grain are different materials | W3 | world test; drive 10–12 |
| 5 | A plain oak cask and a charred one give the same new-make different characters, readable in the glass | W4 | world test; drive 13–14 |
| 6 | Bottled early the whiskey is young and the Lounge's sour refuses it; bottled finished it carries the cut's grade | W4 | world test; drive 15–16 |
| 7 | Malt and grain vat into a blend whose grade is the weakest component, whose smoke is the volume-weighted figure, and whose dose is diluted and never gone | W0, W5 | the laundering test; drive 17–18 |
| 8 | The Lounge's whiskey par line accepts grain and blended whisky; the sour takes a `fair` blend | W3, W5 | drive 19 |
| 9 | Every shipped ferment, cask-conditioning, cocktail, mash and the existing wash run behave as before (`p = 1`, no `imparts`, no `aromaticCarry` ⇒ byte-identical) | W0–W4 | the shipped suites unchanged; explicit identity tests in W4 |
| 10 | Bourbon/rye/Canadian are stated OUT in the docs with the reason | W6 | `vocations.md` / the slate |

---

## Test & gate strategy

- **Unit**: W0 `Concentration` arithmetic (expected numbers computed in the
  test — the subtractive-colour lesson), the aroma renderer's bands, the
  `applyBulkOutput` fold (the laundering case); W1 the plan's product
  selection; W2 the carry across a boundary; W4 `imparts` accumulation and
  `productAtFraction` with an explicit `p = 1` identity case on a shipped
  profile.
- **World tests (real rows)**: W1 the quern grinds malt; W2 the peated
  chain; W3 the grain line; W4 the two casks; W5 the vat. Each extends the
  predecessor's `whiskey-run.test.ts` / `malting-chain.test.ts` /
  `whiskey-vertical.test.ts` rather than adding parallel files, so the
  chain test stays ONE sequence.
- **Only the drive can prove**: the still-book offers the maltings and
  `order` finds the seat; `smell glass` through the real controller
  filter; the turf on the floor is dry enough to be a candidate; the
  `props:` edits reached the world (**a fresh DB**); the Lounge's sour
  refuses the young bottle at the bar. The drive is
  `packages/wire/tests/whiskey-styles.dirty.wire.test.ts`
  (`WIRE_PORT=2013` for build-2; `FOUNDER_*`; `SAXONBERG_TEST_WORLD=1`
  for the clock). ⚠ *Re-run the drive after every review fix*; a
  checkpoint must be able to fail — every "reads smoke" assertion names
  the band word it expects, not `/smoke/`.
- **Gates**: `lint:family` at every wave end; the two ratchets that move
  (`lib-statics`, possibly `on-create` if a catalogue is touched — it
  should not be) are edited with the reason in the gate file.

---

## ⭐ The seven lenses over whiskey AS A PRODUCT — and the answer to the gap

The recorded gap, verbatim from `whiskey-requirements.md`: *"with six
rungs, which one decides the outcome? If the cut decides everything and
the other five are corridors, then five rungs are ceremony and the build
is a chemistry demo wearing a supply chain."*

**The answer: after this build no single rung decides the product, because
the rungs decide different AXES of it, and two of them interact.**

| rung | what it decides after this build | a corridor? |
|---|---|---|
| malting | the **smoke** axis (fuel), and — through `aromaticCarry` — **where the right cut falls** | no |
| the cereal | the **kind** (malt or grain), which is what makes blending an economic act | no |
| mash + ferment | the grade **cap** (weakest-link in) and the head's width (the wash grade stretches it) | ⚠ **yes, mostly** — their only lever is the temperature band. Said plainly rather than dressed up. |
| the cut | **safety** (the dose), the spirit's grade ceiling, and **how much smoke you keep** | no — and it is the only rung whose failure hurts somebody else, which is why it alone should own safety |
| the cask | the **wood** axis and **maturity**; *when to bottle* is a cash-flow fork with a consumer (`minGrade: fair`) | no |
| the blend | **volume against grade**, and the final smoke/wood intensity | no |

Four of six rungs own an axis a player can read in a glass; the cut owns
the one axis nobody else may own; two (mash, ferment) remain corridors
and the plan does not pretend otherwise. The test the gap set — *is the
cut the only decision* — is answered no, with the strongest evidence being
D14: **a choice at rung one changes the right answer at rung four.**

1. **Pedagogy.** Dominant Discipline: `distilling` (the cut and the
   vatting); `malting` is the new fork rung. Derivable: lower-boiling first
   (shipped); phenols are heavy and come late (D14); extraction is
   monotone in time (D5); a blend cannot be better than its worst part
   (shipped grade law); dilution halves a concentration (D4). Nothing
   rolls. ⚠ The one authored assertion is the peat → smoke amount (fuel is
   anonymous); recorded as a grain, not a law.
2. **Creative expression.** The ordinary case is rows: a second wood is a
   Vat row with `imparts`; a second cereal is the W3 shape; a second smoke
   (beech-smoked malt) is a recipe with an item slot; a twelfth aroma word
   is the one kernel edit and is meant to be. ⭐ Personalisation emitted by
   the chain, not enumerated: peat × cereal × cask × maturity × blend is a
   continuum, not a menu — which is exactly why D1 refused to make styles
   materials.
3a. **Immersion.** The fiction says "charred oak cask" and the glass reads
   vanilla and char; the sack of peated malt reads as what it is; a still
   running peated wash *smells of smoke only once the hearts are well on*.
   ⚠ One betrayal avoided: a bottle you cannot nose — resolved by the
   nosing glass rather than by lying about where a palate lives.
3b. **Participation.** Two named vacancies with real criteria and no
   code: the **maltster** (D12 puts the seat on the hand and says so) and
   the **cooper** (every cask is bought as a row; the `char` verb on a cask
   is theirs). A distiller supplying a bar, a blender buying from two
   distillers — standing trades between players the par line and the
   recipe already support. The polity could licence peat-cutting on the
   turf bank; nothing here stops it.
4. **Values.** Three forced choices now, none dominant: yield against a
   stranger's safety (shipped); **when to bottle** (D7 — money now at
   `poor`, or money later at the cut's grade); **stretch or keep** (D8 —
   three litres of `fair` or one of `fine`). No gauge converts any of them;
   the nose is banded words.
5. **Continuity.** A column still is `aromaticCarry` with more fractions; a
   pneumatic malting is the same profile on a bigger vat; a steel vat
   authors `imparts: []` and whisky stops tasting of wood — the same
   commands, a different epoch, and the object answers the same way.
6. **Economy.** Consumes turf (the turbary now has a second customer
   after the hearth), wheat (a second grain off the field), a second cask,
   time. Produces grain whisky (cheap, thin, legal), peated malt, blends.
   ⭐ *Was the demand there first?* The par line and the sour's `minGrade`
   were written before this build and are what give W4's fork and W5's
   stretch their teeth. ⚠ What has NO consumer: a numeric age statement —
   which is why D7 does not ship one.
7. **Governance.** Unchanged in kind: the ledger names a maker. D8 moves
   the named person on a blend to the blender; criterion (a dose above the
   lowest band in something somebody else drank), appeal (append-only
   ledger) and tier (B for the row, C for what is done) are as the
   predecessor set them. **Grain** answers: the aroma thresholds and the
   peat figure are defaults an author may change; the kind/quantity split
   (D1) is the law.

---

## Risks & opens

Numbered so the user can answer by number. ⭐ **1–4 were answered by the
user on 2026-10-05** and are recorded below as settled; the rest stand as
recorded risks.

1. **D2 — promoting the blend arithmetic now.** `Concentration` in
   `lib/bulk` at the second concentration kind, justified by the third
   call site. `lint:lib-statics` 342 → ~345. The alternative is a copied
   25-line blend in `DissolvedAromatics` (two copies of one sentence).
   Recommendation: promote. ✅ **SETTLED: promote.**
2. **D8 — a blend re-signs to the blender.** The distiller whose bad cut
   went into the vat is no longer the person the ledger names. True to how
   liability works, and the blender cannot smell methanol either; but it is
   a product call. The alternative needs `payload.maker` to become a list
   and every reader to change. Recommendation: the blender.
   ✅ **SETTLED: the blender re-signs.**
3. **D7 — the numeric age statement.** The plan recommended deferring it.
   ⭐ ✅ **SETTLED AGAINST the recommendation: BUILD IT.** `maturedDays` on
   the draw, min-folded by `blendPayloads`, rendered at `proficient` in
   game-days. D7, W0 and W4 are updated; the deferred-seams entry is
   removed. The clock really is compressed — so the prose names the unit
   rather than hiding it.
4. **D12 — the `malting` seat on the hand.** One NPC, three trades. The
   alternative is a second Cast at Crowsfoot (a maltster), which is more
   honest to 3b and more content. Recommendation: the seat now, the
   maltster named in `vocations.md` — and this also turns the shipped
   drive's red checkpoint green. ✅ **SETTLED: the seat now, the maltster
   named as a vacancy.**
5. ⛔ **The shipped mill makes wheat flour from malt** (Grounding). W1 fixes
   it; it is a defect of MR !336's predecessor chain, not of this scope,
   and it is reported here because the vertical test and the drive both
   missed it.
6. **Wet turf is a valid recipe input.** An item slot cannot see
   `moisture`; an as-cut turf that refuses the flame is accepted as kiln
   fuel. Mitigation in W2: place a dry row on the floor and say so in the
   recipe comment. The honest fix (a burner that knows and dries its fuel)
   is the fire/energy slate's.
7. **Two fires in the fiction, one in the model** (D6): the kiln's `%`
   reserve heats, the turf flavours. Recorded; the fire slate's.
8. **Tuning numbers**: `imparts` magnitudes, odour thresholds, the peat
   figure (30 mg/L in malt → ~15 in the hearts), `aromaticCarry`
   (0/0.5/2.5/6), `productAtFraction 0.25`, `ratePerDay 0.011`. Each is
   authored against a cited figure or a stated sentence and recorded in the
   row; none is a decision.
9. **`imparts` is per litre regardless of fill** (D5). A half-filled cask
   should extract harder. Recorded.
10. **Rectifying grain new-make** has no schedule (`rectify` keys
    `new-make`). Not needed by the scope; a `grain-rectify` row if gin
    wants a grain base.
11. **`applyBulkOutput`'s appearance stamp** (D4) changes what `look`
    says of any authored-material recipe output whose `outputAppearance`
    differs from its material's — audit the 22 authored-branch recipes at
    W0 and list any whose prose changes in the commit body.
12. ⚠ **A fresh DB is a precondition of the drive**, not a step in it:
    `peat`'s tag, `whiskey`'s tag, the mill rows' `products:` and the
    floor's `props:` are all row edits.

---

## Deferred seams (leave as slates, not plan text)

- **A burner that knows its fuel** (and therefore smoke derived from the
  fire, refuelling, and a wet turf refusing) → the fire/energy slate, with
  D6/Risks 6–7 as the forcing facts.
- **The transfer participant hook** → the bulk/maturation slate entry,
  count unchanged at eight; `blendPayloads` is the first extracted piece.
- **Coopering** — making, charring and seasoning a cask; `imparts` as a
  depleting reservoir (first-fill / refill — the RGO law) → `vocations-register`
  + the libations tail.
- **A sherry-seasoned cask** — vessel history writing `imparts` → the same.
- **`vat-malts`** (a vatted malt), **cask-strength and dilution** (a water
  pour declines cross-material today) → libations tail.
- **Bourbon / rye / Canadian** → a farming content slate (corn, rye, oats
  as crop + plant + material), after which each is the W3 shape.
- **Whisky colour** from the cask (appearance as a function of `imparts`)
  → libations tail.

---

## Critical files

Read first, in this order:

- `docs/slates/builds/whiskey-styles-slate.md`, this plan,
  `docs/plans/whiskey-plan.md` § *Build record* and § *Drive record*,
  `CLAUDE.md`.
- `docs/subsystems/fractionation.md`, `maturation.md`, `bulk.md`
  (§ `BulkPayload`), `crafting.md`, `metabolism.md`.
- `packages/server/src/mud/platform/idea/api/BulkableLogic.ts` (transfer
  step 5, `carryBatchIdentity`), `platform/idea/api/CraftingLogic.ts`
  (`applyBulkOutput`, `isItemCandidate`, the grade derivation),
  `lib/metabolism/DissolvedToxins.ts`, `lib/metabolism/BlendLabel.ts`,
  `lib/metabolism/Palatable.ts`, `lib/bulk/Bulkable.ts` (`BulkPayload`,
  `bulkContentsAugmenter`).
- `lib/fractionation/Fractionating.ts` (`getBulkPayloadForDraw`,
  `fractionAugmenter`), `lib/fractionation/FractionSchedule.ts`.
- `lib/maturation/Maturing.ts` (the active branch, `applyBatchGrade`,
  `ensureInteriorMaterial`, `startBatch`), `lib/maturation/MaturationProfile.ts`.
- `lib/craft/Comminuting.ts`, `lib/craft/Recipe.ts`,
  `packages/content/trade-milling/src/idea/cmd/milling/MillController.ts`,
  `trade-milling/content/trade/milling/thing/{grist-mill,quern}.yaml`.
- `packages/content/trade-distilling/content/**`,
  `packages/content/trade-malting/content/**`,
  `packages/content/base-library/content/stuff/idea/material/organic/peat.yaml`,
  `packages/content/trade-quarrying/content/trade/quarrying/thing/turf.yaml`,
  `packages/content/terminus/content/world/terminus/goods-yards/crowsfoot/**`,
  `packages/content/saxonberg-lounge/content/world/lounge/idea/business.yaml`,
  `packages/content/trade-hospitality/content/recipes/whiskey-sour.yaml`.
- `packages/wire/tests/whiskey.dirty.wire.test.ts` (the shape to copy),
  `packages/server/scripts/check-menu-staff.ts`, `check-lib-statics.ts`,
  `check-unconsumed-seams.ts`.

---

## Drive script

What a person does in the live game, in order, and what they should see.
Crowsfoot's distillery floor in `terminus`, a fresh DB, a logged-in
founder character, and the test clock (`SAXONBERG_TEST_WORLD=1`). The wire
file is `whiskey-styles.dirty.wire.test.ts`; its record is appended below
when run.

1. **`look`** on the floor. → the still, the still-book, the maltings, the
   quern, two casks (one charred), a nosing glass, a stack of turf.
2. **`look still book`** → steep · kiln · **kiln (peated)** · mash ·
   grain mash · compound gin · vat. ⚠ Nothing says "distil".
3. **`order steep-barley`**, advance five game-days, then
   **`order kiln-malt-peated`**. → *"There is a sack of dark, smoke-reeking
   malt."* The turf stack is four short. `smell sack` says nothing (a sack
   is not a glass — expected).
4. **`mill sack`** at the quern. → a **grist** sack, not flour. `look` on
   it reads grist.
5. **`order wash-mash`**, advance to finished. → a wash with a grade.
6. **`pour vat into still`, `ignite still`.** → *"You set a copper pot
   still alight."*
7. **`smell still`** at the first draw. → the foreshot character, and
   **no smoke** in it.
8. **Pour the foreshots and heads to the slop bucket, a little at a
   time, smelling as you go.** → the character turns; as the hearts run on,
   a second line arrives: *smoke, faint* → *clear*. ⚠ Nothing announces it.
9. **Pour a dram into the nosing glass, `smell glass`.** → *"It smells of
   smoke, clearly…"* in words with no digit; a second, untrained character
   smelling the same glass reads *"smoke"* and nothing else.
10. **Buy or mill wheat flour; `order grain-wash-mash`**; ferment; charge a
    second (small) still run. → the run yields **grain new-make**; `smell`
    reads *thin, clean, cereal*; no smoke.
11. **Cask the peated hearts in the charred cask; cask the grain spirit in
    the plain cask; `close` both.** → each `look` says it is working.
12. Advance ~25 game-days. **`open charred cask`, `fill bottle from charred
    cask`, `look bottle`.** → *whiskey*, your name, a **poor** band (young).
    A dram in the glass, `smell glass` as a **proficient** distiller → the
    age clause, *"a few days in the wood"* in game-days; the same glass to
    an **untrained** nose → no age clause at all.
13. **Carry it to the Lounge; `order whiskey-sour`** with it on the bench.
    → the sour **refuses** it for grade.
14. Advance to ~90 game-days. **Fill a second bottle from the charred
    cask, and one from the plain.** → both whiskey at the cut's grade; a
    dram of each in the glass reads **vanilla and char** against **oak**,
    both with the smoke still there on the peated one — and each now reads
    its age, ~90 game-days.
15. **`order vat-whisky`** with a malt bottle and a grain bottle reachable.
    → a bottle of **blended whisky**, graded at the lower of the two, your
    name on it; the glass reads the smoke **fainter** than the malt alone.
    ⭐ Vat a 90-day malt with a 20-day grain → the blend reads **20 days**,
    not an average. That is what an age statement means.
16. ⛔ **Do it badly on purpose:** charge a wash, bottle from the first drop,
    cask it, age it, vat it 1:2 with clean grain. → the blend is a blend; a
    second character drinks the whole bottle → ill, later; the ledger
    holds **one** row naming **the blender**.
17. **Claim the Lounge's whiskey gig and deliver the blend.** → the par
    line accepts it; Mara pours a sour from it.
18. **`look` the plain cask, empty it, refill it with new-make, wait.** →
    the second batch reads the same oak (⚠ no depletion — recorded).

## Drive record

*(appended at build time — the output of
`packages/wire/tests/whiskey-styles.dirty.wire.test.ts` against a fresh
world, and what it found.)*
