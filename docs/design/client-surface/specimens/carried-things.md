# Carried things — what the server actually says (static trace)

Repo: `/home/claude/panterasbox/saxonberg` (read-only; nothing run). All paths below are relative to
`packages/` unless absolute. "S" = `server/src/mud`.

---

## 0. Shared machinery (read this once; every specimen leans on it)

### 0.1 `look <thing>` (S/platform/idea/cmd/perception/LookController.ts)
- `execute` (68–104): a `Soilable` target first runs `reconcileAiring()` (100–101), then `lookAtTarget`.
- `lookAtTarget` (547–692):
  - body = `` `\n${Mml.actor(target)}\n\n${target.getMarkupLong(actor)}\n` `` (584). **No `opts` is passed**, so
    `senseStripAugmenter` falls back to the viewer's full physical sensorium and every filter-aware augmenter
    sees "no filter" = gestalt read. (Visible.ts's docstring says `look` passes `['vision']` — it does not.)
  - Header `Mml.actor(target)` renders at wire time as `<{kindFor(viewer)} stuff-id="…">{describeFor(viewer,'concise')}</…>`
    (S/api/mml.ts 1030–1067). `kindFor` = `thing` for non-Organisms, **`npc` for any Organism without an Interactive —
    including a Corpse** (RecognitionLogic.ts 521–528).
  - `── {heading}: …` per Placing member (only Placing hosts).
  - `── Owned by {holder}.` if Chattel with a minted `_chattelId` and owner is an org/player (607–617).
  - `── {screen}` for Display hosts.
  - Container hosts: `── Wearing: …` / `── Holding: …` / `── In it: …` from `PerceptionApi.visibleContentsOf`
    (636–650); >4 items → `…, and N more things — \`inventory {keyword}\`.`
  - Container hosts with contents: glance → `\nLooking closely, you notice …` / `\nSomething here almost catches your eye.` (655–680).
  - Opens a `subject` card with the same prose (683–690).

### 0.2 Augmenter fold (S/api/mml.ts 193–210; S/api/mixin.ts 2373–2405)
`getAllMarkupAugmenters` walks the prototype chain and folds **root → leaf** (innermost mixin first). The
Thing base is `Wet(Visible(Detailed(Perceptible(Tangible(Containable(Stuff))))))` (S/lib/stuff/Thing.ts 12–14) and
`Good = Chattel(Concealable(Thing))` (S/lib/stuff/Good.ts). So every specimen starts:

1. `wrapDetailKeysAugmenter` (Detailed.ts 945) — wraps authored detail keys in `<detail>`. None of the 5 rows author `details` → no-op.
2. `senseStripAugmenter` (Visible.ts 397–420) — drops `<sense channel>` regions not in `filter ∩ sensorium`. **Untagged prose is always kept.** (Note: runs *after* Detailed, the reverse of what Visible.ts's comment claims; and it runs *before* every other augmenter, so nothing an augmenter appends is ever sense-stripped — each augmenter must gate itself on `opts.filter` or it leaks into every channel.)
3. `wetnessAugmenter` (Wet.ts 132–138): band ≠ dry → `\n\nIt is damp.` / `It is wet.` / `It is soaked through.` (thresholds 0.15 / 0.45 / 0.8, Wet.ts 213–215). No filter gate.
4. (Good only) `titleLineAugmenter` (Chattel.ts 133–138): only when the item's container implements `termsLineFor` (a shop `Stock`, S/lib/retail/Stock.ts 607–624) → appended **with a single space, same paragraph**: `The shop asks {money}.` / `Held on {who}'s terms until sold; the shop asks {money}.` / `On consignment for {who} at {money}.` No filter gate.

### 0.3 Single-sense verbs (SingleSenseControllerBase.ts 175–222)
`smell|listen|taste|feel <thing>` (non-thermal) → header + `getMarkupLong(actor, {filter:[channel]})`.
Because untagged prose survives the strip and most augmenters ignore `opts.filter`, **these verbs replay the whole
`look` long, minus only the few filter-aware lines** (Freshness/WaterActivity/ThermalDose: vision|smell only;
Kinetic: per-change `senses`; Soilable: marks→vision, odour→smell). Empty result → `You don't perceive anything notable about {name}.`
- `SmellController`/`ListenController` override only the *location* branch (room odour / sound modality).
- **`FeelController` (78–123): any `Thermal` target short-circuits to ONE line**: `{Shown} feels {band}.` with band from
  surface K: cold <273, cool <290, comfortable <305, warm <320, hot <345, else scalding (Touch.ts) — the long is never read.
  Scalding also inflicts a hand burn.
- `TasteController` is bare (channel `taste`).
- `sense <thing>` (SenseController.ts 247–285): header + `getMarkupLong(actor,{filter: full physical sensorium})` + Placing lines. No Owned-by, no container lines, no card. Effectively `look` minus the `──` lines.

### 0.4 Inspection card wire record (S/api/mql-subscription.ts 106–138, 314–341)
`DETAIL_FIELDS = displayName, quantity, primaryKeyword, shortDescription, longDescription, illustration, details,
bulkMaterial, mass, contents, worn, exits, placed, placement, holds`. Projected only if some mixin declares the
descriptor; `undefined` omitted, **`null` kept**. `displayName` is overridden to `describeFor(viewer)` (335).
Descriptor sources: displayName (Stuff.ts 212), primaryKeyword (Perceptible.ts 108), short/long/illustration/register
(Visible.ts 177–218; long = `getMarkupLong(viewer)` with no opts), details (Detailed.ts 319, viewer-aware), bulkMaterial
= **the Tangible material** `{materialId, templatePath, name}` (Tangible.ts 176, not the bulk payload), mass `{value, unit:'kg'}`
(Tangible.ts 184), placement (Containable.ts 230), contents/holds (Container.ts 358/402), worn (Attired.ts 552).
`bulkAmount` (Bulkable.ts 624) **is not in DETAIL_FIELDS** → never on the card. No Freshness/Durable/Keen/Soil/Dye/Grade/
Maker field is subscribable anywhere.

Client (client/src/components/cards/CardBodies.tsx 1441–1500, sections 380–720): title = `records[0].displayName`
(Card.tsx 232); trail root = primaryKeyword; `PlaceIllustration` (illustration); `RoomDescription` renders
`longDescription` MML clamped to 2 lines + "more"; `Measured` prints **every field not in DESCRIPTION_FIELDS** (383–397):
in practice `mass` (hidden when 0 — "zero is not declared"), `placement`, `holds` ("yes"). **`bulkMaterial` is in
DESCRIPTION_FIELDS, so the material name is never shown.** Then Worn / Here (contents; not for agents) / Placed lists,
`ActionRow` (subject-sourced, non-disabled verbs; label "What it affords"), `Composition` ("Interfaces" chips, collapsed).

### 0.5 Affordances (S/platform/idea/api/CommandLogic.ts 2037–2097)
Perception gate → `identified = !Identifiable || viewer.knowsTrueTypeOf(target)` (2051). Composition = active mixin names
**only if identified**, else `[]`. A verb whose `affordance.source === target` is dropped when unidentified (2080–2081)
and otherwise tagged `source:'subject'`. Buckets (S/api/command.ts 300–333): `environment` → whoever holds it (any depth),
`peers` → room-mates, `inventory` → things inside it, `self` → itself only.
Relevant contributors found: Tangible `throw` (env+peers); Bulkable `fill pour spill drink sip` (env+peers); Assembled
`fit repair salvage name` (env+peers); Wearable `wear remove equip unequip` (env + inventory, **not peers**); Wieldable
`wield unwield equip unequip` (env + inventory); Labelled `label` (env+peers); Vitals `treat undress dose tend` (**self
only**); Container `inventory get drop put give` (**self only**). No other mixin on these five classes declares
`commandContributions`. `analyze`/`measure` are Avatar self verbs (Avatar.ts 314–315); `butcher` comes from a ButcherBlock's
peers bucket (trade-cooking ButcherBlock.ts 52) → `actor`-sourced.

### 0.6 Instrumentation
`analyze <channel> <thing>` / `measure` read Reading rows (`content/*/idea/reading/*.yaml`). Relevant here: `condition`
(subjectRequires Durable; appraisal), `cleanliness` (Soilable), `weapon` (preview), `response` (preview; prints keenness),
`chemistry` (Tangible material + bench assay that can report freshness at competent+), `temperature` (Thermal; thermometer),
`postmortem` (trade-medicine; forensics). **No reading, sense or augmenter reports contamination** (Contaminable.ts header:
"There is no reading, no smell, no taste and no tell"; grep of readings/cmds finds no pathogen-load consumer besides PourController/ButcherBlock/Wheel transfer logic).

---

## 1. The vial — `blue-vial.yaml` (identifiable) vs `grey-draught-vial.yaml` (not) vs `potion-of-mana.yaml`

### 1a. Chain & mixins
| row | class | effective mixins (verified) |
|---|---|---|
| `content/generic-objects/content/stuff/thing/items/blue-vial.yaml` (`unreachable: awaiting:magic-items-slate`) | `/platform/thing/IdentifiableThing` = `IdentifiableMixin(Good)` (S/platform/thing/IdentifiableThing.ts) | Containable, Tangible, Perceptible†, **Detailed**\*†, **Visible**\*†, **Wet**\*, Concealable, **Chattel**\*, Identifiable |
| `content/trade-medicine/.../thing/grey-draught-vial.yaml` | `/platform/thing/Receptacle` = `Assembled(Durable(Thermal(Bulkable(Good))))` | Thing+Good set, **Bulkable**\*†, Thermal, **Durable**\*, **Assembled**\* |
| `content/arcane-library/.../thing/magic/potion-of-mana.yaml` (also `unreachable`) | `/system/arcana/thing/Potion` extends Receptacle (content/arcana/src/thing/Potion.ts: glass, interior 0.25 L, keywords reset to `[flask, vial, potion, draught]`, primary `potion`) | same as Receptacle; **its interior material** `mana-draught` is `PotionMaterial = Potable(Identifiable(Arcane(ConsumableMaterial)))` |

(\* = has `markupAugmenters`; † = declares `subscribableFields`; Containable/Tangible/Stuff also declare subscribable fields.)
Census helper agreed with all three sets.

**Only blue-vial is itself Identifiable.** grey-draught is plain. potion-of-mana is identifiable *through its contents*
(the flask isn't; the material is) — the richer case, because its material has `descriptorClass: potion`.

### 1b. Authored data
- blue-vial: `shortDescription: blue potion`, `register: indefinite`, `keywords: [potion, blue]`,
  long *"A small stoppered vial of faintly luminous blue liquid. Whatever it is, it doesn't say."*,
  `identifiedName: a potion of healing`. **No `descriptorClass`**, no material, no mass, no illustration.
- grey-draught: short `stoppered vial of grey-draught`, long *"A small stoppered vial of cloudy grey infusion, labelled GREY-DRAUGHT."*,
  interior 0.25 L of `/trade/medicine/idea/material/grey-draught` (material `appearance: a cloudy grey infusion`, toxicity anaesthesia 4). No vessel material/mass.
- potion-of-mana: short `stoppered glass flask`, long *"A squat glass flask with a waxed stopper. Whatever is in it is thick, and clings to the glass when tilted."*,
  interior 0.25 L `mana-draught` (`descriptorClass: potion`, `identifiedName: a mana draught`, `selfIdentifying: false`).
  Bank `content/arcana/content/descriptor-banks/potion.yaml`: colour × clarity (azure, crimson, viridian… × limpid, turbid, effervescent…),
  `unidentifiedLong` + `unidentifiedDetails.surface`.

### 1c. `look`
**blue-vial, unidentified** (no type record in the viewer's BeliefStore):
- Header: `describeFor` → not a persona → no label → `typeName` null → `unidentifiedLook` returns null (no descriptorClass,
  RecognitionLogic.ts 213–217) → baseline `getPresentation()` = **`<thing>a blue potion</thing>`**.
- Long: `IdentifiableMixin.getLongFor` (Identifiable.ts) → unidentified → `renderUnidentifiedLong` returns `''` (no
  descriptorClass) → falls back to authored long. Augmenters: Detailed no-op, senseStrip no-op, Wet (silent if dry), Chattel (silent off a counter).
```
<thing>a blue potion</thing>

A small stoppered vial of faintly luminous blue liquid. Whatever it is, it doesn't say.
```
  `── Owned by …` only if chattel-stamped. Not a Container/Placing/Display → no other `──` lines.
- **Identified** (after `identify` → `MagicLogic.learnClassOf` writes `{typeKnown:true, learnedGeneration}` keyed by the
  class's identityPath, MagicLogic.ts ~2030): header **`a potion of healing`** (the `identifiedName` verbatim — it carries
  its own article); **long unchanged** (identical either way). Misidentified (cursed scroll, `execMisidentify`): header shows
  the believed decoy name (first other Identifiable's `identifiedName`), long stays the authored one.
- If the item carried a player `label` — n/a: IdentifiableThing does not compose Labelled.

**potion-of-mana** (flask not identifiable; contents are):
```
<thing>a stoppered glass flask</thing>

A squat glass flask with a waxed stopper. Whatever is in it is thick, and clings to the glass when tilted.

It holds {X}.

It is one piece.
```
- `bulkContentsAugmenter` (Bulkable.ts 1012–1058): `getContentsDescriptionFor` (835–860) → material is Identifiable →
  `material.describeFor(viewer)` → unidentified: `{a|an} {descriptor} potion` where descriptor is the generation's draw from
  the colour×clarity bank (exact word order from `Appearance.renderFor` not verified); prior-generation record →
  `… — you once knew {old descriptor} to mean a mana draught`; identified → **`It holds a mana draught.`**
  Empty slot: says nothing unless `isVesselKind` with a category (`The {kind} is empty.`) — neither vial row has one,
  so **a drained flask still reads "Whatever is in it is thick…"**.
- Durable silent while sound (`It is worn.` / `It is badly worn.` / `It is broken.` + `It has been mended by {name}.`, Durable.ts 106–143 region).
- `assemblyAugmenter`: no bill and no parts → **`It is one piece.`** (Assembled.ts 443–446) on every vial.
- The potion bank's `unidentifiedLong` ("{A} {descriptor} draught, filling its vessel to about the shoulder…") is **never
  shown** for a flask: `getLongFor` only overrides on an Identifiable *host*, and the host is the flask.

**grey-draught**: same shape → `…labelled GREY-DRAUGHT.` + `It holds a cloudy grey infusion.` + `It is one piece.`

### 1d. Other senses
- blue-vial (not Thermal): `smell/listen/taste/feel blue` all print header + the full authored long (nothing is sense-tagged).
  `listen potion` → "A small stoppered vial of faintly luminous blue liquid…" — noise.
- Receptacle vials are Thermal → `feel vial` → `A stoppered vial of grey-draught feels comfortable.` (room temp) — the only
  sense that isn't a replay. `smell/listen/taste` → full long incl. `It holds …` and `It is one piece.`
- `sense` = look long without `──` lines.

### 1e. Card record
| field | blue-vial (unid.) | potion-of-mana |
|---|---|---|
| displayName | `a blue potion` → `a potion of healing` once identified | `a stoppered glass flask` |
| primaryKeyword | first keyword (`potion`, presumably) | `potion` (set in ctor) |
| shortDescription | `blue potion` | `stoppered glass flask` |
| longDescription | authored long | long + `It holds …` + `It is one piece.` |
| details | from Detailed (none authored) | same |
| bulkMaterial | `null` (no material) | glass summary (not rendered) |
| mass | `{0,'kg'}` → hidden | `{0,'kg'}` → hidden (bulk payload mass not counted here) |
| bulkAmount | — | **projected by Bulkable but not requested** |
Client: title + 2-line prose; no Measured rows; no ActionRow for an unidentified blue-vial; Composition hidden (empty).

### 1f. Affordances
- blue-vial unidentified: composition `[]`; its only subject verb, Tangible `throw`, is **dropped** (source===target) → card ActionRow empty; radial shows only actor verbs. Identified: `throw`. **Nothing to `drink`** — IdentifiableThing has no Bulkable, so a "potion of healing" can't be drunk.
- Receptacle/Potion: `throw`, `fill pour spill drink sip`, `fit repair salvage name` — all subject-sourced, all offered even while the potion is unidentified (Identifiable gate checks the host, not its contents). `name` and `fit` on a glass vial are noise.

### 1g. Runtime state & how it surfaces
| state | surfaces as |
|---|---|
| identified? | header name only (blue-vial); `It holds …` line (potion) |
| amount left | nowhere in words (only `It holds X` vs silence when empty); not on card |
| temperature | `feel` band (Receptacle only); `measure temperature` with a thermometer |
| wear/mends | Durable line; `analyze condition` for history |
| wet | Wet line |

### 1h. Gaps & noise
- blue-vial: identification changes only the name; the bank-driven unidentified prose path is dead for it (no descriptorClass); it is unreachable content and undrinkable.
- Potion flasks: the bank's unidentified long/details never render; drained vessels keep authored "full" prose; amount never surfaces; `It is one piece.` on every vial.
- Single-sense verbs replay the vision paragraph.

---

## 2. White loaf — `content/trade-baking/content/trade/baking/thing/white-loaf.yaml`

### 2a. Chain & mixins
`class: /trade/baking/thing/Loaf` → `content/trade-baking/src/thing/Loaf.ts`: `Loaf extends NutritionLabelMixin(Provision)`,
own `markupAugmenters = [crumbAugmenter]`. `Provision = Sampled(Crafted(Composed(Contaminable(WaterActivity(ThermalDose(Kinetic(Freshness(Thermal(Good)))))))))`
(S/platform/thing/Provision.ts); Crafted extends `GradedMixin` (Crafted.ts 113).

Fold order (root→leaf), augmenters marked \*: Detailed\* → Visible\* → Wet\* → Concealable → Chattel\* → Thermal → **Freshness\*** →
**Kinetic\*** → **ThermalDose\*** → **WaterActivity\*** → Contaminable → Composed → Graded/Crafted → Sampled → **NutritionLabel\*** → **Loaf crumb\***.
Subscribable: Stuff, Containable, Tangible, Perceptible, Detailed, Visible only. Census agrees.

### 2b. Authored
short `white loaf`, `indefinite`, keywords `[loaf, bread, white, manchet]`, long *"A high pale loaf, the crust thin and even,
cut square across the top. It is the sort of bread people who can afford it buy."*, `_materialPath: /stuff/idea/material/food/bread`
(trade-baking; `waterActivity 0.94`, `spoilActivationEnergy 50000`, `kinetics: staling` with words, `senses: [vision, touch]`),
`mass: 0.8`, `composition: wheat-flour 7.8 servings, bran 0.2`. No grade authored (Graded default `fair`), no illustration.

### 2c. `look loaf` — default (fresh, dry, untreated, never heated, off a counter)
```
<thing>a white loaf</thing>

A high pale loaf, the crust thin and even, cut square across the top. It is the sort of bread people who can afford it buy.
Nutrition: carb 6360000mg, protein 748600mg, fibre 86000mg

The crumb is fine and very white.
```
Per augmenter:
- Freshness (Freshness.ts 166–190): band from microbial load (tainted ≥0.25, spoiled ≥0.6, rotten ≥0.85). `fresh` → silent.
  `tainted` → `It smells faintly off.`; `spoiled` → `It has gone bad — the smell is unmistakable.`; `rotten` → `It is rotten, crawling and foul.`
  Gated to vision|smell.
- Kinetic staling (Kinetic.ts 51–66; words from bread.yaml): extent 0 → `""`; ≥0.25 `The crumb has tightened a little.`;
  ≥0.5 `It has gone dry and close-grained; the crust is leathery.`; ≥0.8 `It is hard all the way through. You could knock on it.`
  Rate per hour by K peaks just above freezing (0.02/h at 277 K vs 0.00338/h at 293 K); reheating ≥330 K reverses to floor 0.2. Senses `[vision, touch]`.
- ThermalDose (ThermalDose.ts 166–190): never dosed → silent (raw with 0 dose says nothing). Otherwise `It is raw.` /
  `It is not cooked through.` / `It has caught a little too much heat.` / `It is burnt through, black and bitter.` + `The outside is scorched black.` vision|smell.
- WaterActivity (WaterActivity.ts 161–175, 426–464): default moisture 1/solute 0 → silent. Dries only when air reaches it
  (on a shelf/rack/ground, not in a pack): `It has been partly dried.` (<0.85) / `It has been thoroughly dried.` (≤0.5); salting adds `lightly|heavily salted`. vision|smell.
- NutritionLabel (NutritionLabel.ts 35–75, 90–124): composition non-empty → `BlendLabel.amountsOf` sums `material.nutrientAmounts × servings`
  (flour carb 810000/protein 92000; bran carb 210000/protein 155000/fibre 430000) → values above (computed; exact in IEEE).
  Appended with **a single `\n`** (not a paragraph), **no filter gate**, no unit/"per" context: a 0.8 kg loaf claims 6.36 million mg of carbohydrate.
- Loaf crumb (Loaf.ts): bran share 0.2/8.0 = 0.025 < 0.06 → `The crumb is fine and very white.` (other bands: `pale, with a faint fleck` <0.15, `brown and speckled through` <0.24, `dark and coarse, the bran plain in it`). No filter gate.
- Chattel on a baker's counter: `…buy. The shop asks {price}.` glued onto the first paragraph (it runs *before* the label lines).
- `──` lines: only `── Owned by …` when stamped.

Interesting states:
- **Stale (3+ days at room temp, or ~12 h in an icebox)**: `…\n\nThe crumb has tightened a little.` inserted after the long (before Nutrition), then `…gone dry and close-grained…`.
- **Spoiling**: `It smells faintly off.` → … → `It is rotten, crawling and foul.` (also before Nutrition). A rotten loaf still prints its full Nutrition label and "fine and very white" crumb.
- **Left on a rack**: `It has been partly dried.` — a second, separate "dryness" line beside staling's "gone dry".

### 2d. Other senses
- `feel loaf` → Thermal short-circuit: **`A white loaf feels comfortable.`** (293 K) / `warm` / `hot` from the oven. The
  staling words declared `senses: [vision, touch]` are therefore **unreachable by touch** — `feel` never reads the long.
- `smell loaf` → long + Freshness line + WaterActivity line + doneness, **minus staling** (vision/touch), plus Nutrition + crumb (ungated).
- `taste loaf` → long + Nutrition + crumb only — **spoilage is not tasteable**, nor is staling or dryness.
- `listen loaf` → long + Nutrition + crumb.
- `sense loaf` ≈ look long.

### 2e. Card
displayName `a white loaf`; primaryKeyword (first keyword, `loaf`); short; long (as look, incl. Nutrition + crumb); details;
bulkMaterial `{name:'bread',…}` (not rendered); mass `{0.8,'kg'}` → **Measured row "Mass 0.8 kg"**; placement if racked
("Placement on"). Nothing about freshness/staling/composition except inside the clamped prose (the first two lines
of which are the authored paragraph — the state lines sit below the fold).

### 2f. Affordances
Subject: `throw` only (Tangible). `eat`, `assay`, `bake` etc. are actor/station verbs. ActionRow: "throw".

### 2g. Runtime state
| state | plain senses | instrumentation |
|---|---|---|
| freshness (microbial load) | look/smell band lines | `analyze chemistry` bench assay reports non-fresh band at competent+ (ChemistryReading.ts ~185–190) |
| staling extent | look only | — |
| water state | look/smell | — |
| doneness | look/smell | — |
| temperature | `feel` band | `measure temperature` (thermometer) |
| composition (bran share) | crumb line; Nutrition numbers | `analyze chemistry` reads the **material's** composition (`[]` for bread), not the loaf's `Composed` parts — so it says "bread", never flour/bran |
| grade | nowhere | — |
| contamination | **nothing** | **nothing** |

### 2h. Gaps & noise
Raw-mg nutrition dump with no basis; touch-sensed staling unreachable; taste blind to spoilage; nutrition/crumb/price lines leak into every channel; two "dry" vocabularies; grade invisible; the price line is glued into the authored paragraph.

---

## 3. Plain linen shirt — `content/trade-tailoring/content/trade/tailoring/thing/shirt.yaml`

### 3a. Chain & mixins
`/platform/thing/equipment/Garment` = `Labelled(Soilable(Wearable(Slottable(Assembled(Crafted(Durable(Constructed(Dyed(Good)))))))))`
(S/platform/thing/equipment/Garment.ts). Fold order: Detailed\* → Visible\* → Wet\* → Chattel\* → **Dyed\*** → **Constructed\*** → **Durable\*** → Graded/Crafted →
**Assembled\*** → Slottable → Wearable → **Soilable\*** (Garment overrides `soilLookLine`, 326–331) → Labelled. Census agrees.
Subscribable: base set only.

### 3b. Authored
short `plain linen shirt`, long *"A shirt made the way shirts are made: four panels, two sleeves, and a collar that took as long as the rest of it put together."*,
keywords `[shirt, linen, plain]`, `slotClaims biped: [torso]`, material `textile/linen`, `constructionForm: woven`, `gradeBand: fair`, `mass: 0.25`. No clo (derived), no bill.

### 3c. `look shirt` — default (stock, undyed, sound, clean, dry)
```
<thing>a plain linen shirt</thing>

A shirt made the way shirts are made: … put together.

Protection — edge ●○○○ · point ●○○○ · blunt ●○○○ · heat ●○○○ · cold ●○○○ · corrosion ●○○○ · shock ●●●●

It is one piece.
```
(pip counts illustrative; the real cells come from `MaterialApi.previewBand(channel, linen, woven, grade, condition, clo)` — not statically computable here.)
- Dyed (Dyed.ts 358–389): `getColorMix()` null → silent. Dyed → `<color …>Dyed {nearestTag}.</color>`; faded below 2×legible → `Dyed {tag}, and washing out.`; too dark to make out marks → `Too dim to tell what colour it is.` No filter gate.
- Constructed (Constructed.ts 108–170): woven is a covering → `Protection — {channel} {pips}` over edge, point, blunt, heat, cold, corrosion + `shock {pips}` from conductivity. No filter gate.
- Durable: `It is worn.` (condition <0.8) / `It is badly worn.` / `It is broken.` + `It has been mended by {name}.`
- Assembled: `It is one piece.` (no bill; `sew` doesn't record parts unless inputs were assembled, CraftingLogic.ts 2460–2480).
- Soilable (Soilable.ts 797–821; Garment 326–331): marks → `It is {band}, {adjectives}.` (`a little {adj}` when merely marked; bands marked/soiled/filthy; adjectives from DirtKind rows: sweat-stained, muddy, bloodied, greasy, floury, sooty…), odour ≥10 ppm → `It smells of {identity}.` / `It reeks of …` (≥100 ppm; e.g. *stale sweat*, *old blood*, *dung*), sun-bleach ≥0.25 → `The sun has yellowed it.` Marks gated to vision, odour to smell.
- Wet: damp/wet/soaked line. A Garment's `look` first runs `reconcileAiring` (line drying, sun yellowing, fume).

States:
- **Worn vs carried**: the shirt's own `look` is **identical**. Fit is said once, at wear time: `You put on a plain linen shirt. It is tight on you.` / `It hangs loose on you.` (EquipController.ts 259, 276–283). On the *wearer*: `── Wearing: a plain linen shirt` in `look <person>` and the Attired impression line; card `worn` list.
- **Dirty + dyed + used**: `…\n\nDyed madder.\n\nProtection — …\n\nIt is worn. It has been mended by Ada.\n\nIt is one piece.\n\nIt is soiled, sweat-stained and dusty. It smells of stale sweat. The sun has yellowed it.`
  ⚠ "It is worn." (wear-condition) reads as "being worn" on a garment.

### 3d. Other senses
Not Thermal → `feel shirt` falls through to the base → full long **including Dyed colour, Protection pips, condition, "one piece"**, minus soil marks and odour (touch ≠ vision/smell). `smell shirt` → everything except marks, plus `It smells of stale sweat.` `taste/listen` similar to feel. No sense reports fit, warmth (clo) or texture.

### 3e. Card
displayName `a plain linen shirt`; long as look; bulkMaterial linen (not rendered); **"Mass 0.25 kg"**; no clo/fit/dye/soil fields. Not a Container → no Here list.

### 3f. Affordances
Carried (env bucket): `throw`, `fit`, `repair`, `salvage`, `name`, `wear`, `remove`, `equip`, `unequip`, `label`. On the floor (peers): `throw fit repair salvage name label` — no `wear` until picked up. `fit`/`repair` likely surface as pending-operand or disabled with validator text. Wash/launder are actor/station verbs.

### 3g. Runtime state
| state | words | instrumentation |
|---|---|---|
| fit | only the moment you put it on | `analyze figure` reads the *person*, not the shirt |
| clo / warmth | **never** (docstring says the card needs it; no descriptor) | — |
| dye depth/fade | look (vision-agnostic in code) | — |
| soil kinds/odour/set stains | look + smell; room smell modality emits soil odour | `analyze cleanliness` (sites, set stains, last wash, fit-for-wound) |
| condition/mends | look line | `analyze condition` (mend count, roughest hand, grade "X work") |
| sun yellowing | look | — |
| grade (`fair`) | only in `analyze condition` | — |
| maker | **nowhere** for a one-piece garment | — |
| label | replaces name: `{label} (…)` | — |

### 3h. Gaps & noise
Protection pip line on a shirt; "It is one piece." on every garment; "It is worn." ambiguity; colour/pips leak into feel/smell/taste; fit and warmth never inspectable; maker invisible.

---

## 4. Belt knife — `content/generic-objects/content/stuff/thing/arms/belt-knife.yaml`

### 4a. Chain & mixins
`/platform/thing/equipment/Weapon` = `Wieldable(Slottable(Keen(Assembled(Named(Crafted(Durable(Constructed(Good))))))))` + own `markupAugmenters = [playstylePipsAugmenter]` (Weapon.ts 250).
Fold: Detailed\* → Visible\* → Wet\* → Chattel\* → **Constructed\*** → **Durable\*** → Graded/Crafted → Named → **Assembled\*** → Keen → Slottable → Wieldable → **Weapon\***. Subscribable: base set (+Named? Named.ts declares subscribableFields — name-driven displayName). Keen has **no** augmenter.

### 4b. Authored
short `belt knife`, long *"A plain single-edged working knife, full-tang, its grip wrapped in cord. The sort of blade a smith makes early and a traveller carries forever."*,
keywords `[knife, belt-knife, blade, belt]`, `constructionForm: bladed`, `gradeBand: fair`, `mass: 0.2`, `length: 0.2`, `slotClaims biped: [hand:right]`, `exercises: [blades]`. **No material** — the forge flows the ingot's material and *consumed mass* onto the clone (`CraftingLogic.applyTangibleOutput`, 1833+).

### 4c. `look knife`
```
<thing>a belt knife</thing>

A plain single-edged working knife, … carries forever.

Delivery — edge ●●○○ · point ●○○○ · blunt ○○○○ · heat ○○○○ · cold ○○○○ · corrosion ○○○○

It is one piece.

Playstyle — reach short ○○○○ · guard good ●●●○ · balance light · one-handed
```
- Delivery (Constructed.ts 132–170): bladed = edge primary, point secondary, blunt none (Construction.ts 288); thermal/corrosion always `○○○○` for a weapon; edge/point intensity = previewBand index+1 (depends on material, grade, condition — exact pips not computable statically). **Keenness is not an input.**
- Playstyle (Weapon.ts 264–277; WeaponProfile.ts): authored mass 0.2 → tempo (0.9/0.2)^0.35 = 1.69 → clamped 1.6 > 1.08 → **light**; length 0.2 < 0.5 → **short** (`pipBar(0,2)` = ○○○○); bladed → **good** (●●●○), nudged ±1 by hardness vs 300 MPa (iron 350 / steel 600 stay good; a <150 MPa material drops to fair); one hand slot → **one-handed**. A forged knife whose mass came from a heavy ingot can read `balance heavy`.
- Durable/condition line as §3; Assembled `It is one piece.` (unless forged from an assembled input).
- **Dull vs keen: identical look.** Keen bands keen ≥0.85 / serviceable ≥0.55 / dulled ≥0.25 / blunted (Keen.ts) appear only in `analyze weapon` (`  edge {band}`, WeaponReading.ts 102) and `analyze response` (`  edge: {band}`, ResponseReading.ts 138–139).
- Wieldable/held: no change to the knife's own look; holder's look shows `── Holding: a belt knife`.

### 4d. Other senses
Not Thermal → `feel knife` prints the long + Delivery + condition + one-piece + Playstyle (no edge sense). Same for smell/taste/listen. You cannot feel whether an edge is keen.

### 4e. Card
displayName `a belt knife` (or its Name if named); long as look (pip glyph lines included); bulkMaterial (iron/steel once forged; null on the raw row) not rendered; "Mass 0.2 kg" (or the consumed mass).

### 4f. Affordances
Carried: `throw`, `fit repair salvage name`, `wield unwield equip unequip`. Floor: `throw fit repair salvage name`. Hone/whet comes from a whetstone/actor.

### 4g. Runtime state
| state | words |
|---|---|
| keenness | `analyze weapon` / `analyze response` only |
| condition, mends | look + `analyze condition` |
| grade `fair` | `analyze condition` ("As it stands, it is fair work."); otherwise only folded into pips |
| maker | nowhere for one-piece (Assembled's "It is the work of…" is skipped when one piece); `── Owned by` shows owner, not maker |
| material | `analyze chemistry` (material, density, temper) — not on card, not in look |
| name (Named) | header replaces stem |

### 4h. Gaps & noise
Two glyph-pip lines in prose; keen invisible to senses; maker/material/grade invisible in plain view; "It is one piece."

---

## 5. Corpse — `content/generic-objects/content/stuff/thing/Corpse.yaml`

### 5a. Chain & mixins
`/platform/thing/Corpse` = `Postmortem(Concealable(Contaminable(Container(Thermal(Vitals(Reserved(Attired(BodyPlanSlots(Slotted(Organism(Propertied(Thing))))))))))))` (S/platform/thing/Corpse.ts). **Not a Good: no Chattel.**
Fold: Detailed\* → Visible\* → Wet\* → Propertied → **Organism\*** (age) → Slotted → BodyPlanSlots → **Attired\*** (impression) → Reserved → **Vitals\*** (missing parts, scars) → Thermal → Container → Contaminable → Concealable → Postmortem (**no augmenter**).
Subscribable: base + Container (`contents`, `holds`) + Attired (`worn`). Census agrees.

### 5b. Authored / stamped
Row: `_materialPath: tissue/flesh`, short `body`, keywords `[body, corpse, carcass]`, long *"A body, gone still. Whatever happened to it is still written on it, for as long as anyone cares to look."*, `lifecycleState: dead`.
Mint overlay (ConditionLogic.ts 772–916, `mintCorpseFrom`): **`shortDescription: body of ${body.getPresentation()}`, `register: definite`**, species, `causeOfDeath`, `diedAtGameSec`, `conditionAtDeath`, keywords ∪ the dead thing's, stamped `mass`, `bornAt`; wound map via `adoptMaterialState`; the whole loadout `ContainmentApi.move`d in; contamination transferred.

### 5c. `look body`
```
<npc stuff-id="…">the body of a ewe</npc>

A body, gone still. Whatever happened to it is still written on it, for as long as anyone cares to look.

Missing the left hand.

A pale scar marks the left forearm.
── In it: a plain linen shirt, a belt knife, a purse and a white loaf, and 3 more things — `inventory body`.
```
- Header tag is **`npc`** (Organism, no Interactive). Label = `getPresentation()` of the body *at death*, viewer-blind — for a named persona this is very likely their **name** ("the body of Ada"), shown to every viewer regardless of recognition (the corpse itself is not a Persona, so describeCore never consults recognition).
- Organism age (Organism.ts 132–144): aged/senescent animal → `It is grey about the muzzle and slow to rise.` / `It is very old.` (age frozen at `diedAt`, set when `lifecycleState` becomes dead).
- Vitals (Vitals.ts 697–728): `Missing {the left hand, …}.`; worst scar `A pale scar marks the {site}.` **Open wounds/trauma, cause and wound map have no look line.**
- Attired impression: `wornStack()` — the loadout was *moved* into the corpse, not slotted, so nothing is worn → silent.
- Postmortem decay stage (fresh <1 h, stale, decomposed, spent ≥3 h game time; DECAY_STAGE_SEC 3600, MortalArc.ts 64): **no look line.** It appears only in the `distinguishing` form — disambiguation prompts and targeting keywords: `the body of a ewe, stale` (RecognitionLogic.ts 296–350), so `butcher decomposed` works but `look body` never says it.
- Container `──` lines: corpse is not an Agent → `visibleContentsOf` puts **every** item (former clothes, purse, pockets) under **`── In it:`** (PerceptionLogic.ts 571–595). Glance may add `Looking closely, you notice …`.

### 5d. Other senses
- `feel body` → Thermal: **`The body of a ewe feels warm.`** fresh (≈310 K) drifting to `comfortable` / `cool` (algor mortis, passive drift) — the one plain-sense clock.
- `smell body` → the full long (+ missing parts, scars). **Decay has no smell**: no Freshness on Corpse, Postmortem has no augmenter, and the room smell modality only emits Soilable odours and SmellSources (SmellModality.ts 150–176); a Corpse is neither. A week-dead body smells of nothing.
- `taste/listen body` → full long.

### 5e. Card
displayName `the body of …`; primaryKeyword `body`; long as look (no `──` lines); bulkMaterial flesh (not rendered); mass stamped → "Mass 62 kg" (e.g.); `contents` → REF records of the whole loadout (Here list; card kind `thing`, so contents render); `worn` `[]`; `holds: true` → **Measured row "Holds yes"**; placement if on a slab/hook. Composition chips: full list (Postmortem, Vitals, …).

### 5f. Affordances
Subject verbs: **`throw` only** (Tangible). Vitals' `treat/undress/dose/tend` and Container's `get/put/…` are `self`-bucket (the corpse's own). `butcher` (ButcherBlock peers), `analyze postmortem`, `get x from body` are actor/station-sourced. ActionRow on a corpse card: "throw".

### 5g. Runtime state
| state | plain senses | instrumentation |
|---|---|---|
| decay stage | disambiguation word only | `analyze postmortem`: `They have been dead a {stage} while.` (expert), readability-limited wound list, inferred cause (PostmortemReading.ts ~141) |
| time since death | `feel` temperature band | `measure temperature`; postmortem |
| wounds / cause | missing parts + worst scar only | `analyze postmortem` |
| butchered parts (`takenTissues/Lines`) | **nothing** in look | butcher flow |
| conditionAtDeath | nothing | butcher reads it |
| contamination (transferred) | **nothing** | **nothing** |
| loadout | `── In it:` / card Here list | `inventory body` |

### 5h. Gaps & noise
Long promises "whatever happened is written on it" but wounds/decay aren't; decay unsmellable; `npc` tag on a thing; probable name leak in the minted short; clothes listed as "In it"; "Holds yes" row; `throw` as the body's only affordance; the "grey about the muzzle and slow to rise" line can attach to a dead animal.

---

## Cross-cutting findings (design-relevant)
1. **State lives in appended paragraphs**, folded in mixin-composition order, each `\n\n`-separated (except Chattel price: space; Nutrition: single `\n`). The card shows them only inside a 2-line-clamped prose box — every state line is below the fold.
2. **Single-sense verbs are not channels.** Only Freshness/WaterActivity/ThermalDose/Kinetic/Soilable consult `opts.filter`; everything else (dye, pips, condition, one-piece, nutrition, crumb, price, missing parts) replays under smell/taste/listen/feel. `feel` on any Thermal thing is *only* a temperature band, which silently kills touch-tagged content (staling).
3. **The card carries almost no state**: of DETAIL_FIELDS only `mass`, `placement`, `holds` reach the Measured block; material is projected then hidden; bulk amount isn't projected; no freshness/condition/keen/soil/dye/grade/maker/clo field exists.
4. **Analyze-only facts**: keenness, grade word, mend history, set stains/wash fitness, decay stage sentence, cause of death, material/temper. **Unreported by anything**: contamination, clo/fit (post-wear), maker of one-piece goods, butchered state, liquid remaining.
5. **Identification** affects only name + affordances for an Identifiable *host*; potions are identified through their contents, so the bank's unidentified prose never shows on a flask and the flask's verbs are never hidden.
