# Whiskey — implementation plan

Executes [whiskey-requirements.md](../requirements/whiskey-requirements.md)
(**kind: feature · leads from: kernel**; first consumer `trade-distilling`,
driven at Crowsfoot's distillery floor in `terminus`) — **widened by the
user to the whole whiskey vertical**: a player malts barley they grew,
mashes it, ferments the wort, charges the still and makes the cut, casks
the hearts, waits, bottles whiskey and supplies it to a bar that already
wants it; if they cut badly the drinkers fall ill and the ledger names
them. The ordered **fraction schedule** is built once and general (a
second feedstock is rows and more boundaries), but it is a consequence
of making whiskey, not the goal.

Branch `design/2026-10-03-cuts`, freshly merged with master (2026-10-04).

⚠⚠ **The requirements doc is one edit narrower than this build and must
be amended before `/build` runs** — see § *Requirements amendment* below.
Nothing in this plan silently exceeds it; the gap is named.

---

## Grounding

Verified by opening files this cycle (2026-10-04). Where a fact corrects
the requirements doc or the task brief, it says so. A 51 KB subagent
survey preceded this; every fact below that a decision rests on was
re-opened.

### The front half — what ships, and the one rung that does not

- **Barley ships.** `packages/content/trade-farming/content/trade/farming/thing/crop/barley.yaml`
  (`/platform/thing/Crop`, `_materialPath …/food/barley-grain`, `mass: 25`)
  and `…/plant/barley.yaml`; `Crop` is a `Provision` (Crafted, Tangible,
  **not** Bulkable — `platform/thing/Crop.ts:4`).
- ⛔ **Malting does NOT ship.** The task brief said *"barley → malt →
  grist ships"*; the middle arrow is missing. `malt.yaml`
  (`packages/content/base-library/content/stuff/idea/material/food/malt.yaml`)
  says it in its own header: *"a SHARED input whose owning trade does not
  exist yet"*; `malt-sack.yaml` (distribution) says *"nobody in the world
  malts barley yet, so the sacks simply arrive"*. No recipe, profile or
  verb anywhere turns `barley-grain` into `malt`
  (`grep -rl malt packages/content/*/content/recipes` → only the three
  mash recipes, which CONSUME grist). **The feature sentence "malts barley
  they grew" therefore needs a malting rung** (W5).
- **Milling ships.** `trade-milling`'s `mill` verb grinds a malt sack to
  grist (`…/cmd/milling/mill.yaml`: *"Malt grinds too, and what comes off
  is grist"*).
- **The wash ships.** `wash-mash.yaml` (grist 4 L + water 16 L, tool
  `mash-tun`, → `distillers-wort` in a `wash-bucket`, residue
  `spent-grain`) and the `wash` MaturationProfile
  (`…/idea/maturation/wash.yaml`: `inputCategory: distillers-wort`,
  `productMaterial …/material/wash`, `foreshotCharacter` authored and read
  by one test, `world/__tests__/fermentation-distilling.test.ts:85`).

### ⛔ The still has never run on the shipped floor

- `packages/content/trade-distilling/src/thing/Still.ts:21-23` —
  `BurnerMixin(LightSourceMixin(ReservedMixin(ThermalMixin(ToolMixin(Good)))))`.
  No `BulkableMixin`, no `CraftedMixin`.
- `still.yaml` / `small-still.yaml` author **no `reserves.fuel`** (their own
  comment says so) and no `burnTemperatureK` (default **800 K**,
  `lib/fire/Burner.ts:164`). `FireLogic` refuses to ignite a burner with
  `fuelRemaining() <= 0` (`platform/idea/api/FireLogic.ts:148`, reason
  `not-flammable`). `reachableHeatForImpl` (`lib/thermal/Thermal.ts:1139-1152`)
  counts only burners that are **lit and fuelled**. So `ignite still`
  refuses, 351 K is never reachable, and `order distil` has declined
  `insufficient-heat` for the whole life of the pack. ⭐ **Retiring the
  `distil`/`brandy`/`grappa` recipes changes no live behaviour**, and the
  Crowsfoot hand's `distills` leg (`lib/behavior/cellars.ts:305-325`) is
  dead code in production; the counter's gin/spirit come from the faucet
  floor rows (`thing/gin.yaml` etc.), not from a run.
- The sugaring arch (`trade-forestry/…/thing/evaporator.yaml:39-50`) is the
  exemplar of a correctly authored burner: `burnTemperatureK`,
  `fuelBurnRatePerMin`, `lit: false`, `reserves.fuel 100 %`.
- ⚠ **No refuel verb exists for any burner** (grep `'fuel'` across
  `platform/idea/cmd/**` → tests only; the drain is `Burner.ts:276`). A
  furnace burns its authored reserve down once. Pre-existing gap, not this
  build's.

### The bulk substrate (`lib/bulk/Bulkable.ts`, `platform/idea/api/BulkableLogic.ts`)

- Policy seams a capability mixin may override: `getBulkAvailable`,
  `isBulkEmpty`, `debitBulk` (`Bulkable.ts:387-394`); base impls
  `:757-770`. `debitBulk` nulls the material at 0 (`:768`).
  `setBulkMaterial` **keeps the payload** when the new path is non-null
  (`:689-700`) — a product swap carries its toxins across. ✓
- `transfer` (`BulkableLogic.ts:218-432`): step 2 declines a cross-material
  pour unless `tryInoculate` accepts (`:237-248`); step 5 reads
  `from.getPayload()` **before** `from.debit(applied)` (`:322-324`),
  copies the payload whole into an **empty** destination only
  (`:326-331`), `carryBatchIdentity` (grade + maker, empty destination
  only, `:538-550`), then four mass-blends that run on EVERY pour:
  freshness `:344-348`, water activity `:349-353`, pathogens `:371-390`,
  blood (identity) `:398-406`; thermal volume-average `:415-422`.
  **No toxin blend exists.** ⚠ `maturation.md § Two coarsenesses` already
  warned: *"if a FOURTH domain wants in (… poisons), that is the moment
  to generalize to a host-side participant hook rather than a fourth
  branch."* Transfer now carries **seven** domain insertions; toxins would
  be the eighth. Recorded as a finding (D5), not silently added.
- MQL resolves a holder by its contents' keywords (`api/mql/scope-walk.ts:306-335`
  `pushBulkMaterials`, `via.bulk`) — a bottle of whiskey answers to
  `whiskey` without authoring the keyword. ✓
- `pour.yaml` / `fill.yaml`: both args `requires: VisibleMixin` +
  `mustHaveBulkSlot`; `PourController` renders declines from `result.notes`
  (`:143-158`) and credits `fermenting` on a draw from a finished Maturing
  source (`:93-110`).

### The maturation substrate (`lib/maturation/`)

- `MaturingMixin.__validateComposition__` requires only Bulkable
  (`Maturing.ts:420-429`). Batch detection by interior path
  (`:495-498`); the lees swap is the amount-triggered precedent
  (`:500-528`) and the rack floor shadow is `getBulkAvailable`
  (`:871-891`). `startBatch` (`:725-787`) wipes `leesVolumeL` and keys the
  profile by **material tag** (`MaturationProfile.forMaterial`,
  `MaturationProfile.ts:571-584`, double match = warning, lowest key).
  `applyBatchGrade` (`:829-833`) writes `bandFor(_worstStretch)` to the
  host's Graded face **every reconcile, ignoring whatever grade the fill
  carried in** — the must's grade never reaches the wine. `stampBatchMark`
  (`:810-826`) takes the carried-in maker else `ExecutionContextApi.getActingAuthor()`.
- `MaturationMechanism` is a closed union of four
  (`MaturationProfile.ts:47-58`) with `MATURATION_LINES` prose per member
  (`:98-130`, `:187-240`); `chemical` ships generic cellar-neutral lines.
- `MaturationProfileCatalogue` (`platform/idea/MaturationProfileCatalogue.ts`)
  is the self-warming roster pattern; its row `…/platform/idea/MaturationProfileCatalogue.yaml`
  and boot entry `packages/content/platform/pack.yaml:69` (`role: sync-read`).
- A cask already exists as a ROW: `trade-brewing/…/thing/cask.yaml`
  (`/platform/thing/Vat`, `category: cask`, oak, 50 L, `liquidTight`,
  `open: true`) with `cask-conditioning.yaml` (`sealedOnly: true`). ⭐ The
  whiskey cask is the same shape with a `chemical` profile.
- `Vat` = `VesselKindMixin(MaturingMixin(CraftedMixin(SealableMixin(ThermalMixin(BulkableMixin(Good))))))`
  (`platform/thing/Vat.ts:37-41`); `GradedMixin.gradeBand` defaults
  `'fair'` (`lib/craft/Graded.ts:42`) — ⚠ a naive "cap by the host's grade
  at fill" would cap every ferment at `fair`; D11 captures the grade via a
  `setGrade` witness instead.

### The toxin substrate (`lib/metabolism/`)

- `ToxinTag {type, amount, labileAtK?}` (`Metabolic.ts:71-95`); `amount` is
  **per serving**; `routeIntake` (`:1466-1491`) adds `tox.amount` once per
  ingest regardless of litres. `formedToxins` is declared onto
  `BulkPayload` from `BlendLabel.ts:48-57` (per-serving, never blends).
  `toxicityOf` (`BlendLabel.ts:176-217`) derives from `composition` or the
  Material row, plus `formedToxins`.
- `Material.setToxicity` rebuilds per-field (`Material.ts:940-944`) — a
  new `ToxinTag` field must be added there or is silently dropped.
- `toxinBurdens` / `digestionPools` are persistent runtime state
  (`:521-533`); `reconcileToxinConditions` (`:1310-1360`) afflicts the one
  banded condition at the first crossing of the lowest band and clears
  below it; `clearBurdens` deletes an entry at 0 (`:1051-1057`).
- `noteMealAccountability` (`:1562-1590`) — one call site, inside the
  pathogen loop (`:1545`); returns at once without `payload.maker`;
  skips the self-victim. Session `meal:${stuffId}:${maker}`. The ledger
  does not dedupe (`accountability.md:228`: one row per attribution act);
  the pathogen arm dedupes by `existing`.
- Condition rows: `packages/content/platform/content/platform/idea/Condition/metabolism/`
  (15 rows; `ptomaine.yaml` is the pure-poison exemplar — no pleasant
  rung; `alcohol.yaml` the `storeRaw` BAC exemplar). **No methanol row.**
- `DrinkController.ts:115` / `SipController.ts:76` pass the payload to
  `ingest`. ✓

### Grade, mark, crafting

- `Grade.deriveAtFixedControl` is weakest-link `min` (`lib/craft/Grade.ts:115-121`);
  bands `poor · fair · fine · exceptional · masterful`.
  `CraftedMixin extends GradedMixin(Base)` (`lib/craft/Crafted.ts:110`).
- `craftImpl` heat gate = `maker.reachableHeatK()` (`CraftingLogic.ts:2361-2380`);
  `applyBulkOutput` stamps `maker` on an authored-substance payload since
  !325 (`:1380-1391`+).
- `order` resolves `fulfilling-bartender` → the venue's on-shift
  fulfiller, **self-last** (`CraftingLogic.ts:276-335`). ⭐ So a player who
  `order`s `wash-mash` at Crowsfoot gets a wash **made by Wren Ashby**;
  the player is the maker only by holding the fulfilling seat (`apply`,
  `clock on`) and ordering alone, or by the still run itself (D4 stamps
  the DISTILLER on the draw). The drive uses the seat.
- The by-hand ladder (`crafting.md § The manual build`) is a build buffer
  + engaged steps + a terminal reverse-matching mint. The still run is the
  distilling branch's by-hand path; it does **not** use `ManualBuildMixin`
  (nothing to reverse-match — the schedule is the recipe).

### The sensory read

- `TasteController` / `SmellController` (targeted form) call
  `target.getMarkupLong(actor, {filter: [channel]})`; the ONLY way a mixin
  speaks on `smell`/`taste` is a `markupAugmenters` entry gated on
  `opts.filter` — `PalatableMixin.palateAugmenter`
  (`lib/metabolism/Palatable.ts:175-197`) is the template, with
  `bandFor(viewer, discipline)` off `competenceDigestCached()` (`:160-166`).
  ⚠ **No shipped augmenter speaks on `smell`**; this build's is the first.
  ⚠ `maturationAugmenter` (`Maturing.ts:348`) takes no `opts` and lands on
  every channel — do not copy it.

### The sale — a bar that already wants it

- The Saxonberg Lounge bar authors `parLines` with
  `{category: whiskey, unit: L, level: 6, supplier: <distributor business>, exemplar: /trade/distilling/thing/whiskey}`
  (`saxonberg-lounge/…/idea/business.yaml:172`); Mara runs `restocks`
  (`lounge/agent/mara.yaml:64`), which posts **one gig per short line in
  the line's own words** — `job post supply 6 litres of whiskey to <bench> … --bounty --business --from <counter>`
  (`lib/behavior/restocks.ts:355-410`). A par category is a **material
  tag** (`EmploymentLogic.goodsForImpl`, `:741-751`). So a player bottle
  whose interior material carries tag `whiskey` satisfies the line.
  ⭐ **Zero new code closes the sale**: `job claim`, carry the bottle to
  the bench, `job complete` — escrow pays the player.
- ⚠ Finding: the carter fallback cannot fulfil a category gig —
  `hauls.ts buyAtOrigin` (`trade-haulage/src/behavior/hauls.ts:255-258`)
  returns null unless `condition.item.kind === 'template'`, and every
  Lounge spirit line is `unit: L` ⇒ `cat:`. Every spirit line of the bar
  depends on a player hauler today. Not this build's; recorded.
- The well pour `thing/whiskey.yaml` (SpiritBottle, `fair`, no mark,
  `container: /world/terminus/goods-yards/veshko/thing/stock`,
  `regionTarget 12`) is Veshko's faucet and competes at the counter; its
  switchover is the libations slate's. Untouched. ⚠ `idea/material/whiskey.yaml`
  authors `toxicity: alcohol 19` against `neutral-spirit` 45 and `wash` 8
  — a 40 % spirit at half a wash's dose; fixed in W4 as a row.

### The floor

`packages/content/terminus/content/world/terminus/goods-yards/crowsfoot/location/floor.yaml`
— `_temperature: 289`, `props:` works-board · racking · stock · still ·
mash-tun · standpipe · still-book · vat · vat; `cast:` the hand
(`agent/hand.yaml`: `cellars` brain with `distills: {recipe: distil, runs: 3, igniteKeyword: still, compounds: [compound-gin, grappa]}`,
dossier asserting `distilling: proficient` *because the still book's
recipes are STANDARD*). `lint:census` clause (b) requires every `props:`
entry to resolve to a row.

### Gates that touch this build (headers read)

`lint:unconsumed-seams` (counts `foreshotCharacter` today; a new authored
field with no reader trips it) · `lint:conditions` (the methanol row) ·
`lint:condition-arms` (ratchet — no new arm; D8 adds no arm) ·
`lint:field-meta` · `lint:mixin-names` (kernel mixin ⇒ `Mixins` const) ·
`lint:instanceable` (nothing instances `/lib/`; the schedule class gets a
`platform/` twin) · `lint:whole-table` (schedule lookups as statics on
the owning class, no public `all()`) · `lint:imports` (`lib/bulk` imports
no subsystem — the toxin field arrives by `declare module`) ·
`lint:census` · `lint:authored-prose` (fraction characters) ·
`lint:reconcile-chains` (no new time integral — the schedule is
amount-triggered; the aging profile rides the existing trajectory fold)
· `lint:mass` (every new Thing row authors `mass`) · `lint:light-sources`
(the still rows stay `lit: false`) · `lint:dossiers` rule 6 (the hand's
bands vs the still-book) · `lint:drive-scripts` (the drive is born at
`packages/wire/tests/whiskey.dirty.wire.test.ts`, never `scripts/drive-*.ts`)
· `lint:module-scope` · `lint:object-verbs` · `lint:arg-kinds`.

---

## ✅ Requirements amendment — DONE 2026-10-04

⭐ All six edits are landed and the doc is renamed
`docs/requirements/whiskey-requirements.md`. What follows is the record
of what was changed, kept so a reviewer can check the amendment against
the plan that asked for it.

The requirements doc scopes "the cut" and lists **a whiskey recipe** as a
non-goal. The user has decided the build is the whiskey vertical. Add to
`whiskey-requirements.md` (renamed from `cuts-requirements.md`; keep
the name and retitle — the sweep retires it either way):

1. **Goals** — add: *a player can turn barley into malt*; *the hearts can
   be casked and, after game-time, bottled as whiskey carrying the cut's
   grade and the cut's harm*; *a bar that already wants whiskey can be
   supplied with it by the player*.
2. **Non-goals** — strike *"A whiskey recipe"*; keep the rest; add
   *refuelling a burner* and *the carter fulfilling category gigs*
   (findings above, with their file lines).
3. **Surface decisions** — add three: *Does aging change the harm?* (**no**
   — methanol does not age out; the cask changes grade and material,
   never the dose); *Who is the maker on a bottle filled by two people?*
   (the first pour's mark; a top-up blends the dose and worsens the
   grade, never re-signs); *A cold charged still* (it pours its charge
   back out as what it is; the run starts at heat and nothing refuses the
   charge — correcting drive step 3's wording).
4. **The drive** — prepend steps 0a–0d (a sack of barley → steep → floor
   → kiln → mill → mash → ferment) and append steps 14–18 (cask the
   hearts · wait · bottle · claim the Lounge's whiskey gig · deliver ·
   Mara pours a whiskey-sour from your bottle).
5. **Acceptance criteria** — add 13–16: malting is rows plus one
   mechanism word; a casked spirit becomes whiskey after the profile's
   time at a grade no better than the cut's; a bottled whiskey carries
   the still's dose unchanged; the Lounge's whiskey par line is satisfied
   by a player's bottle with no new code.
6. **§ What the substrate cannot do yet** — add blocker 5: *the shipped
   still cannot be LIT* (no fuel reserve) and blocker 6: *malting does not
   exist*.

---

## Plan-level decisions

**D1 — Scope is the vertical; the schedule is general by construction.**
Every kernel piece is written for "a batch that yields in ordered
fractions as it is drawn", with distilling as the first schedule rows.
The crude test is a second row with more boundaries (§ Deferred seams
shows the sketch); no distilling word appears in `lib/`.

**D2 — The fraction schedule is a NEW kernel subsystem, `lib/fractionation/`,
not a maturation mechanism and not a bulk policy.** Not maturation: the
lees pattern is three couplings (phase gate · profile-by-tag · a scalar
set at a time-integral crossing) of which only the amount comparison
generalises, and a still has no clock. Not `lib/bulk`: the schedule speaks
toxins and grade, and `lib/bulk` imports no subsystem (`Bulkable.ts:127-132`).
A new subsystem folder is the sanctioned answer to "a mixin that fits no
existing subsystem" (`CLAUDE.md § File Naming`). It gets its own doc,
`docs/subsystems/fractionation.md`. ⚠ A new *subsystem folder*, not a new
*module category*: the files are a mixin, an abstract row class, its
platform twin and a catalogue — four categories that already exist.

**D3 — One material per schedule, fractions differ by PAYLOAD.** Already
resolved by the brief: cross-material pours decline, so fractions that
differed by Material could never be recombined. The schedule names one
`productMaterial` (what comes off) and one `residueMaterial` (what stays
in the pot once the last fraction is drawn — the lees-style swap). Each
fraction authors `character`, `gradeBand`, `toxins` (per litre).

**D4 — The still IS the host (Q2): `Still` composes `BulkableMixin` and
`FractionatingMixin`; there is no separate receiver.** A pot still is a
pot with a fire under it, and the draw order *is* the boiling order, so
"pour from the still" is the draw and cumulative volume is the clock —
exactly the requirements' amount-triggered reading. A receiver would need
a time clock (distillate accumulating) that the requirements rejected. The
still is the first furnace to hold bulk; the composition is honest and
`CraftVessel` proves Thermal + Bulkable legal. The still also composes
`CraftedMixin` for the same reason `Vat` does: the W0 seam carries the
charge's grade and maker onto it and the draw's identity off it.

**D5 — The transfer seam grows one policy seam and one blend (Q3), and
the generalisation is recorded, not done.** (a) A new Bulkable policy
seam `getBulkPayloadForDraw(affordance, litres)` (base: returns
`getBulkPayload`); `BulkSlot.payloadForDraw(litres)`; transfer step 5
reads it after `applied` is known. Without it a single pour that straddles
a boundary would be stamped as its first fraction — a 0.75 L pour from
the first drop would carry a 0.75 L foreshot dose instead of the honest
30 mL. (b) `DissolvedToxins.blend` beside the other four, every pour.
(c) `carryBatchIdentity` keeps the maker empty-only but applies
**weakest-link** to the grade on a top-up (`min(dest, source)`): drive
step 7 ("keep pouring past the hearts → the grade in the bottle falls")
and AC5 require it, and anti-laundering is the house rule (a `poor` top-up
cannot be rinsed by a `fine` one). ⚠ This changes every top-up pour in
the game; it is doctrinal (weakest link) and flagged for the user.
⚠ **Finding for the user:** transfer is at eight domain insertions and
`maturation.md` named poisons as the moment to generalise. Recommendation:
ship the eighth in the shipped shape (four identical precedents, each
five lines) and leave the participant hook as a slate entry with the
count — a kernel refactor of four shipped blends is not this feature's
work. The user may overrule; W0 is the wave it lands in either way.

**D6 — A NEW payload field, `dissolvedToxins`, not `formedToxins` (Q3).**
`formedToxins` is per-serving and never blends; a carried dose must be a
**concentration (mg/L)** that blends by volume and scales with litres
drunk. Declared from `lib/metabolism/DissolvedToxins.ts` by
`declare module '../bulk/Bulkable'` (the `BlendLabel.ts:48-57` move).
`routeIntake` gains a second loop: `pools[type] += amount × litres` for
dissolved toxins (honouring `labileAtK` vs `cookedAtK` as `formedToxins`
does). `toxicityOf` is untouched — it remains the per-serving derivation.
⚠ `Material.setToxicity`'s per-field rebuild is irrelevant here (the field
is on the payload, not the Material), noted so nobody adds one.

**D7 — Methanol is a content row.** `…/Condition/metabolism/methanol.yaml`:
`toxinType: methanol`, slow `absorptionRate` (the illness arrives after
the drunkenness — drive step 11), no pleasant rung, `resolution.by: time`,
`observableSigns: [nauseous, dizzy, blurred]`, bands whose lowest
threshold a well-cut bottle cannot reach (W3 derives the hearts
concentration from it: `hearts mg/L × 0.75 L × potency / 70 kg < lowest`).
`lint:conditions` gates it. No new arm (`lint:condition-arms`).

**D8 — Harm attribution: ONE function, called at the moment harm begins,
by both arms (Q4 — product question, recommendation below).**
`noteMealAccountability(payload)` → `noteConsumptionHarm(maker, sessionId)`
(protected, same body). The pathogen arm calls it as today at infection.
The toxin arm: at `routeIntake`, every dose that came from the MAKING
(`dissolvedToxins`, `formedToxins`) with a `payload.maker` records the
maker in a new persistent runtime field `toxinMakers: Record<type, string[]>`;
at `reconcileToxinConditions`' first crossing (`!existing && level >= lowest`)
it calls `noteConsumptionHarm(maker, 'toxin:${stuffId}:${type}:${maker}')`
per recorded maker; `clearBurdens` drops the makers with the burden.
A Material's own authored toxicity (the alcohol in whiskey) records
nobody: **the ledger names the maker for what the making put in it, never
for what the thing is** — so a bartender is not a poisoner for every
drunk patron. ⭐ This also attributes the shipped `intoxicate` arm
(staph/botulinum formed toxins), which writes no row today.
*The alternative* — a second call at ingest whenever a dose is non-zero —
violates AC8 (trace congeners would write rows for every well-cut bottle)
and cannot see accumulation. ⚠ **Flagged for the user as the requirements
left it:** the recommendation keeps "the dose makes the poison" as one
doctrine with one function; it does move the chemical row to the band
crossing rather than the meal, which is where the pathogen row
effectively sits too (incubation is the harm beginning).

**D9 — The read is banded by LAG, and nothing is gated (Q5).** The
schedule authors `readBlur` (fraction of charge, e.g. `0.02`); kernel
constants `BLUR_BY_BAND = {untrained: 1, novice: 0.75, competent: 0.5, proficient: 0.25, expert: 0}`
(in the mixin file, the Palatable shape). `readFraction(viewer)` returns
the fraction at `drawnL − readBlur × chargeL × BLUR_BY_BAND[band]`: the
untrained nose notices a boundary **late**, so it keeps some heads (a
dose) and some tails (a worse grade); the expert notices at once and
wastes less. The augmenter renders that fraction's `character` on
`smell`/`taste` only; `look` renders state (cold/charged/running/spent)
and never the fraction. No notice is ever pushed. Characters are authored
prose with no digit (AC2).

**D10 — The boundaries move with the wash.** The run captures the charge's
grade band (on the still's Graded face via the W0 seam from the vat) and
stretches the toxic head of the schedule: each fraction's `upTo` below
the hearts' start grows by `(masterfulIndex − gradeIndex) × gradeStretch`
(schedule-authored, e.g. `0.02`), and the hearts' end shifts by the same
absolute amount so hearts shrink. Seeded from the charge, never drawn
(`uncertainty.md`). A `poor` wash has roughly twice the heads of a
`masterful` one; no fixed litre count to memorise.

**D11 — Aging is a profile; the cut's grade reaches the whiskey (Q6).**
`MaturingMixin` records the grade the fill carried in — via a `setGrade`
witness while the batch is idle (so the `'fair'` default never caps
anything; `null` = no cap) — and `applyBatchGrade` writes
`min(inputBand, bandFor(worstStretch))`. ⚠ Changes every ferment: a
`poor` must no longer makes `fine` wine. Doctrinal (weakest link), flagged.
The payload (and so `dissolvedToxins`) survives the product swap
(`setBulkMaterial` keeps it) — methanol does not age out.

**D12 — The three recipes retire; four schedules replace them.**
`distil`, `brandy`, `grappa` are removed from `recipes/` and the still-book
(they never ran, see Grounding). Schedules in
`trade-distilling/content/trade/distilling/idea/fractionation/`: `wash`
(→ `new-make`; residue `stillage`), `rectify` (`new-make` → `neutral-spirit`,
tighter — the gin base, honestly made), `wine` (→ `brandy`), `pomace`
(→ `grappa`; `pomace.yaml` is a Receptacle, so it pours). AC12 is these
rows differing only in numbers.

**D13 — Malting is a rows-only pack plus one mechanism word (W5).** New
pack `trade-malting` (`/trade/malting`, no `src/`): `steep-barley`
recipe (item slot `barley` + water → `steeped-barley` bulk in a
`malting-floor` Vat-family row), a `malting` MaturationProfile with a
**fifth mechanism `enzymatic`** (the grain's own amylase; `microbial`
and `chemical` are both false and the platform teaches), `kiln-malt`
recipe (`green-malt` + heat 330–360 K → `malt` into an empty
`malt-sack`), a `malting` Discipline, a `malt-kiln` Oven row. The `malt`
material stays in the commons this build (two consumers reference its
path; moving it is the malting trade's own later sweep). The player
then `mill`s as today.

**D14 — The sale is the shipped market.** No code. The drive claims
Mara's `supply … whiskey` gig and delivers. Veshko's faucet stands.

**D15 — The hand learns the run (W6, severable).** `cellars`' `distills`
leg becomes literal verbs: charge from the finished back, `ignite`, pour
in small `--amount` steps switching vessel when `readFraction(hand)`
changes (the same banded read a player gets — a brain may not read the
true boundary), rectify, `order compound-gin`, consign. The leg is dead
today, so this wave can ship separately without changing live behaviour;
it is in scope because the hand's dossier claims the trade.

**D16 — The draw's temperature is the pot's (known approximation).** Still
rows author `burnTemperatureK: 358` (the pot's working heat; the default
800 K would land every bottle at 800 K — above spirit's 636 K
autoignition — and scorch the recipe path if it ever ran). A draw lands
warm (~358 K) and cools; the condenser is not modelled. A
`drawTemperatureK` on the schedule is the obvious later seam (§ Deferred).

---

## ⭐⭐ Host placement

| new thing | host | what composing it claims | why not elsewhere |
|---|---|---|---|
| `FractionatingMixin` (kernel, `lib/fractionation/Fractionating.ts`) | `trade-distilling/src/thing/Still.ts` only, outermost: `FractionatingMixin(BurnerMixin(LightSourceMixin(ReservedMixin(ThermalMixin(CraftedMixin(BulkableMixin(ToolMixin(Good))))))))` | *this host's interior yields in ordered fractions as it is drawn, under a schedule matched to its charge.* `__validateComposition__` requires Bulkable (the Maturing shape); Thermal is probed, and a schedule with `requiresHeatK > 0` on a non-Thermal host raises a `Diagnostic` at charge, never a silent never-runs. | Not on `Vat` (a vat does not fractionate — the lees are one boundary and a material swap), not on `GradedReceptacle`/`Bottle` (a bottle pours what it holds), not on `Burner` (a forge holds no bulk). ⭐ No guard re-narrows the host set: the second consumer (a refinery column) composes it itself. |
| `BulkableMixin` on `Still` | `Still` | *a still holds a charge* — `interiorBulk: true`, capacity per row. First furnace to hold bulk; `CraftVessel` is the Thermal+Bulkable precedent. | A separate receiver would need a clock (rejected by the requirements). |
| `CraftedMixin` on `Still` | `Still` | *the still carries the identity of what is in it* (the Vat's reason: grade + maker in via the W0 seam, out to the bottle). Crafted ⇒ Graded, so the still's Graded face is the charge's band (D10 reads it). | — |
| `FractionSchedule` (abstract, `lib/fractionation/FractionSchedule.ts`; concrete twin `platform/idea/fractionation/FractionSchedule.ts`) | an `Idea` + `SingletonMixin` row (the `MaturationProfile` shape); rows at `<root>/idea/fractionation/<key>` | *a schedule is content any pack ships*; matched by the charge material's tag (`inputCategory`), lowest key on a double match with a warning. Statics `byKey`/`forMaterial`; `all()` private (`lint:whole-table`). | Not on `MaturationProfile` (no clock, and a profile matching the `wash` tag would re-key every vessel that receives wash). |
| `FractionScheduleCatalogue` (`platform/idea/FractionScheduleCatalogue.ts` + platform-pack row + `boot:` entry, `sync-read`) | platform pack singleton | *the roster is warm before the first draw* — the reference-Ideas-inert-at-boot rule. | The `MaturationProfileCatalogue` shape, verbatim. |
| `BulkPayload.dissolvedToxins?: ToxinTag[]` | the payload value object, declared from `lib/metabolism/DissolvedToxins.ts` | *this matter carries these doses per litre; they blend by volume on every pour.* Claims nothing of any class — a payload with no such field is exactly as before. | Not `formedToxins` (per-serving, never blends); not on `Material` (per-instance). |
| `DissolvedToxins` (value class, `lib/metabolism/DissolvedToxins.ts`) | — (the `Freshness`/`WaterActivity` shape: wraps a `BulkSlot`, `static blend`) | — | A free helper is banned; a value object beside its three precedents is the named category. |
| `Bulkable.getBulkPayloadForDraw(affordance, litres)` + `BulkSlot.payloadForDraw(litres)` | every Bulkable host (base impl returns `getBulkPayload`) | *a policy seam, like `getBulkAvailable`* — overriding it is what a fractionating host does. Nothing else changes for any composer. | — |
| `Metabolic.toxinMakers: Record<string, string[]>` (persistent runtime state) | `MetabolicMixin` | *who made the doses this body is still carrying* — nothing new is claimed of a body; it is the payload's maker remembered until the burden clears. | Not on the condition record (the row already exists before the condition does). |
| `MaturingMixin.batchInputBand: GradeBand \| null` | `MaturingMixin` | *what grade the fill carried in* — recorded by a `setGrade` witness while idle. | — |
| `MaturationMechanism` gains `enzymatic` | the closed union + `MATURATION_LINES` | *a seed does it to itself* — prose only; nothing in the clock branches on it. | `microbial`/`chemical` assert a false mechanism for malting. |
| `methanol.yaml` | `Condition/metabolism/` (platform pack) | a toxin type IS its condition row. | — |
| Still rows (`still.yaml`, `small-still.yaml`) | `/trade/distilling/thing/Still` | `burnTemperatureK: 358`, `fuelBurnRatePerMin`, `reserves.fuel 100 %`, `interiorBulk: true`, `interiorCapacity: 60` / `12`, `mass`. | — |
| `cask.yaml`, `slop-bucket.yaml` (`CraftVessel` 25 L, or reuse `wash-bucket`), `new-make.yaml`, `stillage.yaml` materials, four schedule rows, `whiskey-aging.yaml` profile | `trade-distilling` | rows over shipped classes. | — |
| `trade-malting` pack rows (D13) | new rows-only pack | rows over shipped classes (`Vat`, `Oven`, `Receptacle`, `MaturationProfile`, `Discipline`, two recipes, two materials). | — |

Retired: `MaturationProfile.foreshotCharacter` (field, fieldMeta,
accessors, the `wash.yaml` line, the test at
`fermentation-distilling.test.ts:85`) — the character lives per fraction
on the schedule. `lint:unconsumed-seams`' count falls by one.

---

## ⭐ Reconciled against master, 2026-10-04

Master moved after this plan was drafted: four new design docs
(`wizardry-curriculum-slate`, `wizardry-slate`, `college-slate`,
`object-taxonomy-slate`), **no code**. Checked for overlap and there is
none — not one of this build's nouns (distilling, spirit, toxin,
fraction, cask, malt, payload) appears in any of them.

⭐ One structural interaction, and it is favourable.
`object-taxonomy-slate` is about **blueprint signatures collapsing**:
*"six genuinely different kinds share one signature… the dedup is
currently lying."* W3 makes `Still` the **first
`BurnerMixin + BulkableMixin` composition in the tree**, so its
signature becomes more distinct, not less, and no collapse is possible.
⚠ Worth knowing anyway: this build adds **no verb**, so `Still` gains
mixins without gaining affordances — which is exactly the shape that
*would* collide if a second Bulkable furnace ever shipped. Noted here so
the next person does not have to re-derive it.

## Convention conformance (checked this cycle)

- `props:` / `cast:` on `floor.yaml` ✓ (`populates` is retired; the floor
  already uses the new keys). New floor fixtures go under `props:`.
- Locations: nothing new; the floor is a `SingletonCartesianLocation`.
- `<root>/<branch>/`: kernel mixin at `lib/fractionation/`, concrete row
  class at `platform/idea/fractionation/FractionSchedule`, catalogue at
  `platform/idea/FractionScheduleCatalogue`; trade rows at
  `/trade/distilling/idea/fractionation/<key>`, `/trade/distilling/thing/<row>`;
  malting rows at `/trade/malting/<branch>/…`. No class in the malting
  pack, so no `src/`.
- Module scope declares: the catalogue warms in `onCreate`; `BLUR_BY_BAND`
  is a `const` table; no module-scope statements.
- Import boundary: `lib/bulk` imports nothing new (`declare module` from
  `lib/metabolism`); `BulkableLogic` (platform/idea/api) imports
  `lib/metabolism/DissolvedToxins` as it imports `lib/material/Freshness`.
  The pack imports the kernel only by `@saxonberg/server/mud/lib/…`.
- Verbs on objects: `still.readFraction(viewer)`, `still.isRunning()`,
  `slot.payloadForDraw(l)`; no `FractionationApi` and no `XApi.verb(host)`.
  No new Api at all.
- No new module category, no free helper, no new `eslint-disable`.
- Kernel mixin name `FractionatingMixin` added to `Mixins` +
  `MixinRefusals` (`"{} doesn't come off in fractions"`) +
  `MixinApi.isFractionating`.
- Gates this build must pass: the list in Grounding § *Gates*; run
  `pnpm -C packages/server lint:family` at every wave end.

---

## Waves

Every wave lands at a commit `build(whiskey W<n>): …`, passes
`pnpm test:near` + each touched pack's vitest + `lint:family`. The full
suite runs exactly twice (pre-MR, `/finalize`).

### W0 — the bulk and toxin substrate (kernel)

Implements D5, D6. Files: `lib/bulk/Bulkable.ts` (interface +
`BulkSlot.payloadForDraw` + base `getBulkPayloadForDraw`),
`platform/idea/api/BulkableLogic.ts` (step 5 reads `payloadForDraw(applied)`;
the `DissolvedToxins.blend` block after the water block; `carryBatchIdentity`
grade-min on top-up), `lib/metabolism/DissolvedToxins.ts` (new; field
declaration, `loads(slot)`, `stamp(slot, tags)`, `static blend(from, appliedL, to, toBeforeL)`
volume-weighted per type, `labileAtK` kept), `lib/metabolism/Metabolic.ts`
(`routeIntake` second loop, `× litres`). Tests: `lib/bulk/__tests__/DissolvedToxins.test.ts`
(blend arithmetic computed in the test, the laundering case, labile
filter), `GradeCarry.test.ts` extended (top-up min), a `payloadForDraw`
seam test with a stub host. Acceptance: a 30 mL pour at 1000 mg/L into
720 mL at 0 reads 40 mg/L; `pnpm test:near` green.
Commit: `build(whiskey W0): dissolved toxins blend on every pour; payloadForDraw seam; top-up grade is weakest-link`.

### W1 — the harm row for chemical harm (kernel + one row)

Implements D7, D8. Files: `Metabolic.ts` (`noteConsumptionHarm`,
`toxinMakers` field + fieldMeta + accessor pair, the ingest record, the
band-crossing call, the clear), `Condition/metabolism/methanol.yaml`.
Tests: a metabolic host fixture ingests a payload with `maker` and a
methanol concentration — exactly one `harm` row at the crossing, none
for self, none below the lowest band, none for the material's own
alcohol; the staph `intoxicate` arm now attributed. `lint:conditions`,
`lint:condition-arms` (count unchanged). Acceptance: AC9, AC10.
Commit: `build(whiskey W1): one harm function, two moments — the toxin arm names the maker at the band crossing; methanol row`.

### W2 — the fraction schedule (kernel)

Implements D2, D3, D9, D10. Files: `lib/fractionation/FractionSchedule.ts`
(fields: `key, discipline, inputCategory, requiresHeatK, productMaterial,
residueMaterial, readBlur, gradeStretch, fractions: FractionSpec[]` where
`FractionSpec = {key, upTo, character, gradeBand, toxins?: ToxinTag[], requiresHeatK?}`;
setter validation: `upTo` strictly ascending in `(0, 1]`, residue
= `1 − last.upTo > 0`, band words valid, prose non-empty; statics
`byKey`, `forMaterial` (private `all()`)), `platform/idea/fractionation/FractionSchedule.ts`
(twin), `platform/idea/FractionScheduleCatalogue.ts` + its platform-pack
row + `pack.yaml` `boot:` entry, `lib/fractionation/Fractionating.ts`
(`FractionatingMixin`: persistent `chargeL, drawnL, runPhase: idle|charged|running|spent, runScheduleKey, runMaker, runChargeBand`;
`reconcileRun()` on every read — charge detection by interior path change
from empty, schedule match, heat gate → `running` + product swap +
`startRun`; overrides `getBulkAvailable` (cold charge: all; running:
`amount − residueL`, clamped at the first fraction whose own
`requiresHeatK` is unmet), `debitBulk` (advances `drawnL`; swaps to
residue at the floor; re-keys), `getBulkPayloadForDraw` (span blend of
fraction toxins over `[drawnL, drawnL + l]`, `maker = runMaker ??= acting
author`, restamps the host's Graded face to `min(chargeBand, worst band
in span)` so `carryBatchIdentity`/top-up min see it); `readFraction(viewer)`;
`isRunning()`; `fractionAugmenter` (look → state line; smell/taste →
lagged character); `__validateComposition__`), `lib/mixin.ts`
(`Mixins.Fractionating`, refusal), `api/mixin.ts` (`isFractionating`),
`platform/idea/cmd/bulk/PourController.ts` (credit the schedule's
discipline on a running draw — the rack-credit shape), retire
`foreshotCharacter` (Maturing/MaturationProfile/wash.yaml/test).
Tests: `lib/fractionation/__tests__/` with a test host
`Fractionating(Thermal(Crafted(Bulkable(Good))))` and an inline schedule:
cold charge pours back out; heat starts the run and swaps the material;
the span blend across a boundary; the residue swap; `readFraction` lags
per band and never refuses; no message is emitted at a boundary (assert
the pour's scene text is identical either side of it); the grade on the
host falls through the tails; a second schedule with six fractions and
per-fraction heat works with no code change (the AC12 reviewer test).
Commit: `build(whiskey W2): lib/fractionation — a batch that yields in ordered fractions as it is drawn`.

### W3 — the still runs (pack + world)

Implements D4, D12, D16. Files: `trade-distilling/src/thing/Still.ts`
(composition per Host placement; `interiorBulk = true` in the
constructor), `still.yaml` + `small-still.yaml` (fuel, burn temp, bulk,
mass), new materials `new-make.yaml` (tags `liquid beverage drinkable alcoholic spirit new-make`; `toxicity: alcohol 45`),
`stillage.yaml` (`compost`/`feed`-tagged, the spent-grain shape), four
schedule rows (`wash` — foreshots `upTo 0.005` methanol-heavy /
heads `0.03` / hearts `0.18` `fine` / tails `0.23` `poor`, trace methanol
in hearts below the lowest band at a bottle; `rectify`; `wine`; `pomace`),
`slop-bucket.yaml` (or reuse `wash-bucket`) + `cask.yaml` placed in
`floor.yaml props:`, retire `distil.yaml`/`brandy.yaml`/`grappa.yaml`,
`still-book.yaml` `offeredRecipes: [wash-mash, compound-gin]`,
`hand.yaml` dossier comment + the `distills` leg config (W6 rewrites it;
here it is removed so the beat does not force dead verbs), tests:
`fermentation-distilling.test.ts` (the 351 K assertions move to the
schedules), `trade-distilling/src/__tests__/distilling.test.ts` (Still
composition), a world test that runs the shipped rows end to end: charge
from a finished `wash` vat, ignite, draw foreshots to the bucket, hearts
to a bottle, tails over, `look bottle` prints maker + band and nothing
else, a second character drinks the bad bottle → methanol condition → one
row. `lint:census`, `lint:mass`, `lint:light-sources`, `lint:dossiers`,
`lint:authored-prose`. Acceptance: AC1–AC8, AC11 (wash profile, mash,
compound-gin, cocktails untouched — assert the recipe set and the wash
row byte-identical but for the retired line).
Commit: `build(whiskey W3): the still holds a charge and the cut is made at Crowsfoot; distil/brandy/grappa retire for four schedules`.

### W4 — the cask (kernel + rows)

Implements D11. Files: `lib/maturation/Maturing.ts` (`batchInputBand` via
the `setGrade` witness; `applyBatchGrade` min; fieldMeta), `trade-distilling`
`thing/cask.yaml` (Vat, `category: cask`, oak, 25 L, `liquidTight`,
`open: true`, mass), `idea/maturation/whiskey-aging.yaml` (`mechanism: chemical`,
`inputCategory: new-make`, `sealedOnly: true`, `productMaterial …/whiskey`,
`ratePerDay` ≈ `0.022` (45 game-days; flagged for tuning), `stallBelowK 275`,
`happyK 290`, `damageAboveK 305`, no strain), `idea/material/whiskey.yaml`
`toxicity: alcohol 40`. Tests: `lib/maturation/__tests__/` input-band cap
(existing tests that asserted `worstStretch` alone set the fill's band to
`masterful` or leave the witness unfired); a world test: new-make with a
methanol concentration → cask → clock forward → `whiskey` at
`min(cut band, cellar band)` with the concentration unchanged → `fill
bottle from cask` → the bottle carries both. Acceptance: amended AC14–15.
Commit: `build(whiskey W4): the cask — new-make ages to whiskey at the cut's grade, the dose unchanged`.

### W5 — malting (one mechanism word + a rows-only pack)

> ⚠⚠ **AMENDED by the lens re-run, 2026-10-04.** W5 must also ship a
> **`malting` Discipline row**. Lens 1 decided it: a craft rung no
> Discipline names is *"a fact sheet, not a curriculum"*, and both
> alternatives assert something false — `fermenting` claims a microbial
> mechanism (the reason this wave picks `enzymatic` in the first place)
> and `brewing` makes the maltster a brewer. It is one row in the new
> pack, `channel: skill`, and the steep/floor/kiln acts credit it.
> ⚠ Without it this wave adds labour that exercises nothing.

Implements D13. Files: `MaturationProfile.ts` (`enzymatic` in the union,
`MATURATION_MECHANISMS`, `MATURATION_LINES.enzymatic` — six lines, no
bubbles, no yeast), `packages/content/trade-malting/` (`package.json`,
`pack.yaml` with `requires` on platform/base-library/distribution,
`content/trade/malting.yaml`, `idea/Discipline/malting.yaml`,
`idea/material/steeped-barley.yaml` + `green-malt.yaml`,
`idea/maturation/malting.yaml` (`enzymatic`, `inputCategory: steeped-barley`,
`productMaterial green-malt`, `ratePerDay 0.2`, `happyK 288`,
`damageAboveK 298`, `killK 308`), `thing/malting-floor.yaml` (Vat,
`category: malting-floor`, 60 L, open), `thing/malt-kiln.yaml` (Oven,
`burnTemperatureK 340`, fuel), `thing/malt-sack.yaml` (empty Receptacle
25 L), `recipes/steep-barley.yaml` (item slot `barley` ×1 + water 20 L →
bulk `steeped-barley`, `outputPortionL 40`, `outputTemplate …/malting-floor`),
`recipes/kiln-malt.yaml` (`green-malt` 20 L, `requiresHeatK 330`,
`maxHeatK 360`, no tool capability — the heat gate is the kiln, verify
`Oven` offers none, → `malt` into `…/malt-sack`)), the malting floor +
kiln + an empty sack placed on Crowsfoot's floor `props:`, a pack test
(rows load; the chain mashes). `pnpm install` after adding the pack
(memory: a pack rename/addition needs it). Acceptance: amended AC13.
Commit: `build(whiskey W5): trade-malting — barley to malt is rows and one honest mechanism word`.

### W6 — the hand runs the still (severable)

Implements D15. Files: `lib/behavior/cellars.ts` (`distills: {schedule,
slopKeyword, igniteKeyword, rectify?, compounds}`; the literal-verb run
loop over `readFraction(hand)`; bounded by `batch`), `hand.yaml` config,
`lib/behavior/__tests__/cellars*.test.ts`. Acceptance: the bounded test
drives one run; gin reappears at the counter from a run, not a faucet.
Commit: `build(whiskey W6): the hand makes the cut with the read it has`.

### W7 — docs, drive, sweep prep

`docs/subsystems/fractionation.md` (new: the schedule, the host, the
read, the harm, the crude sketch), one-line map entry left for the sweep
(`CLAUDE.md` rule 5), `maturation.md` (foreshot seam retired → points at
fractionation; `enzymatic`; the input-band cap), `metabolism.md`
(`dissolvedToxins`, `toxinMakers`), `accountability.md` (the toxin arm),
`bulk.md` (`payloadForDraw`, the eighth insertion and the slate),
`crafting.md` (the still run as distilling's by-hand path), the drive at
`packages/wire/tests/whiskey.dirty.wire.test.ts` (the amended
requirements' 0a–18; `lint:drive-scripts`), the drive record appended
here. Then `pnpm test` once, open the MR.

---

## Reachability wiring

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| charge the still | `pour <vat> into still` (shipped) | `Still` composes Bulkable, `interiorBulk: true` on both rows | the finished wash vat | — | `pour` args `VisibleMixin` + `mustHaveBulkSlot` — satisfied once the still has a slot (today it fails closed: *"You can't pour anything into the still"*) |
| light it | `ignite still` (shipped; `requires: CombustibleMixin\|BurnerMixin`) | Burner ✓ | `reserves.fuel 100 %` on the rows — **without it `ignite` refuses `not-flammable`, silently for the drive** | — | needs a flame to hand (the shipped rule) |
| the run starts | none (a read) | `FractionatingMixin` on `Still` | a `FractionSchedule` row whose `inputCategory` matches the charge's tag (`wash`) | `FractionScheduleCatalogue` row + `boot:` entry `sync-read` — **a row nothing warms matches nothing** | — |
| draw a fraction | `pour still into <bucket\|bottle> [--amount]` | the overridden policy seams | the schedule | — | as above |
| read the run | `smell still` / `taste still` / `look still` | `fractionAugmenter` registered on the mixin's `markupAugmenters`, filter-gated | fraction `character` rows | — | — |
| the dose | `drink`/`sip` (shipped, payload passed) | `dissolvedToxins` on the bottle's payload | the schedule's `toxins`; `methanol.yaml` | — | — |
| the row | none | `toxinMakers` + the band crossing | `payload.maker` stamped by the draw | — | — |
| cask it | `pour bottle into cask` / `close cask` | `Vat` row | `whiskey-aging.yaml` (`inputCategory: new-make` — the new-make material must carry the tag) | `MaturationProfileCatalogue` (shipped) | — |
| bottle it | `fill bottle from cask` (`open cask` first) | shipped | — | — | — |
| sell it | `job claim` / `put bottle on <bench>` / `job complete` | shipped | Mara's `parLines` whiskey line (tag `whiskey` on the aged material) | — | — |
| malt | `order steep-barley` / wait / `order kiln-malt` / `mill sack` | the still-book? **No** — a malting board (Menu row) on the floor, or the two recipes added to the still-book's `offeredRecipes` (decide in W5; the still-book is simpler and `lint:menu-staff` must be checked) | the pack's rows | `RecipeCatalogue`/`MaturationProfileCatalogue` (shipped) | `order` resolves a fulfiller — the seat again |

---

## Acceptance-criteria coverage

| AC (requirements) | wave | how proven |
|---|---|---|
| 1 different parts in different vessels, no new verb | W2, W3 | world test; drive 5–7 |
| 2 character changes, words, no number | W2, W3 | augmenter test asserts no digit; drive 4–5 |
| 3 nothing announces the boundary | W2 | identical scene text either side of a boundary |
| 4 competence sharpens, never gates | W2 | `readFraction` per band; an untrained host can draw everything |
| 5 tight = less at better grade; wide = more at worse | W0 (top-up min), W2 (span grade), W3 | world test with two cuts |
| 6 a bad bottle is indistinguishable by sense; both name the maker | W2 (character never on the payload), W3 | `look`/`smell`/`taste` bottle golden: maker + band only |
| 7 ill after drinking, by the cut | W0, W1, W3 | delayed methanol band; dose ∝ heads kept |
| 8 a good bottle makes nobody ill | W3 (numbers), W1 | a whole bottle of hearts stays under the lowest band (the "however much" limit is a whole bottle — note it in the amended doc) |
| 9 exactly one row, none for self | W1 | unit + world |
| 10 nothing acts on it | W1 | no notify, no condition on the maker |
| 11 ferment, mash, gin, cocktails unchanged | W3 | recipe-set and row-byte tests |
| 12 a different product is rows | W2 (six-fraction test), W3 (four rows) | — |
| 13–16 (amended) malting · cask grade · dose survives · the bar's line | W5, W4, W4, W7 drive | — |

Unmapped today: the amended criteria exist only once the requirements are
edited — do that first.

---

## Test & gate strategy

- **Unit**: W0 blend arithmetic (compute the expected numbers in the test,
  the subtractive-colour lesson), the seam, the grade min; W1 the four
  attribution cases; W2 the run machine and the read ladder with a test
  host and an inline schedule; W4 the input-band cap.
- **World tests (real rows)**: W3 the shipped run; W4 the cask; W5 the
  malting chain; W6 the bounded brain.
- **Only the drive can prove**: the floor is lit by spill and the still is
  reachable; `ignite` finds a flame; the gig closes at the Lounge bench;
  the bottle's `look` on the card; `smell` on a Still through the real
  controller filter. The drive is `packages/wire/tests/whiskey.dirty.wire.test.ts`
  (`FOUNDER_*` env — memory: the wire suite needs it; `WIRE_PORT` 2013
  for build-2).
- **Gates**: `lint:family` at every wave; the full suite twice.

---

## ✅ The three product calls — ANSWERED 2026-10-04

The user was asked and said **yes to all three**. They are decided; the
build does not re-open them.

1. ✅ **D8 — one harm function, two moments.** Chemical attribution fires
   at the **band crossing**, not at ingest, because attributing at ingest
   would violate AC8 (a good cut must harm nobody however much they
   drink). Pathogen attribution is unchanged. ⭐ Side benefit accepted
   with it: the shipped staph/botulinum `intoxicate` arm becomes
   attributed too, which it never was.
2. ✅ **D5(c) + D11 — both ship, and both change shipped numbers.**
   Top-up grade becomes weakest-link for **every pour in the game**, and
   every ferment is capped by its fill's grade. ⚠ D11 is a straight bug
   fix: today a `poor` must makes `fine` wine, because
   `applyBatchGrade` writes `bandFor(_worstStretch)` and ignores the
   fill. ⚠ Expect shipped test numbers to move in brewing/winemaking;
   that is the fix landing, not a regression — but say so at each site.
3. ✅ **The eighth transfer insertion ships**, and the refactor is filed
   rather than done. `maturation.md` says *"generalise at the fourth"*
   and transfer is at seven; this makes eight. The participant-hook
   refactor goes to a slate with the count, per *census then ratchet* —
   stopping the growth is not this build's job, and doing the refactor
   inside it would hide the whiskey.

## Risks & opens
4. The hand is the maker of an `order`ed wash. The drive takes the seat
   (`apply`, `clock on`) so the player makes everything; if the user
   wants a seatless path, that is the manual-build ladder for mash and is
   not in this plan.
5. `ratePerDay` for aging (45 game-days) and the methanol bands are
   tuning numbers; the build picks them against the rule *a whole bottle
   of hearts is under the lowest band*, and records them.
6. The warm draw (D16). Autoignition is far away at 358 K; a bottle of
   hot spirit next to a hearth is the only odd case.
7. Fuel: a still burns its authored reserve once (0.5 %/min = ~3 game
   hours at the default; author `fuelBurnRatePerMin: 0.1`). No refuel
   verb exists for any burner — recorded, not fixed.
8. `order` for `steep-barley` with an item slot: `isItemCandidate`
   excludes a Crafted non-food; barley is food (`edibility: true`) so a
   `Crop` sack qualifies — verify at W5; if it refuses, the sack's
   `Provision` lineage is the reason and the recipe takes bulk grain from
   a `Receptacle` instead.
9. The `wash` material tag is also the schedule's `inputCategory`; no
   MaturationProfile may ever author `inputCategory: wash` (it would
   re-key every vessel receiving wash) — say so in `wash.yaml`'s comment.
10. W6's brain uses `readFraction(hand)` — the hand's `distilling:
    proficient` dossier band is what makes its cut decent; a `novice`
    hand poisons the counter, which is the design.

Stop and ask only for 1–3 if the user has not answered them by `/build`;
everything else is decided here.

---

## Deferred seams (leave as slates, not plan text)

- **Transfer participant hook** — `bulk.md`/`maturation.md` finding;
  eight domain insertions. → a slate entry under the bulk/maturation
  tails with the count.
- **`drawTemperatureK` on a schedule** (the condenser). → the same slate.
- **Veshko's whiskey faucet switchover** (the hand casks new-make; the
  well pour becomes a brain-made bottle). → `libations-slate.md`, already
  there.
- **Burner refuelling** (`put <log> in <firebox>` on Container fireboxes;
  nothing for a Still). → fire/energy slate.
- **Carter fulfilling category gigs** (`hauls.ts buyAtOrigin` template-only).
  → logistics slate.
- **Malt material moves to `trade-malting`**; a `turnedMaterial` for
  over-grown malt. → the new pack's README.
- **Crude as rows** — the sketch belongs in `fractionation.md`:
  `inputCategory: crude`, `requiresHeatK` per fraction (naphtha 350,
  kerosene 450, gas oil 550), residue `bitumen`, no toxins, characters by
  smell; needs the drilling slate's feedstock and nothing in `lib/`.
- **A lab assay naming the dose** → sampling-and-labs slate (unchanged).

---

## Critical files

Read first, in this order:

- `docs/requirements/whiskey-requirements.md` (amended), this plan,
  `CLAUDE.md`.
- `packages/server/src/mud/lib/bulk/Bulkable.ts` (`BulkSlot`, the policy
  seams, `BulkPayload`), `packages/server/src/mud/platform/idea/api/BulkableLogic.ts`
  (`transfer`, `carryBatchIdentity`, `tryInoculate`).
- `packages/server/src/mud/lib/maturation/Maturing.ts` (the batch
  detection, the lees swap, `getBulkAvailable`, `startBatch`,
  `stampBatchMark`, `applyBatchGrade`, the augmenter — the shape to
  mirror and the counter-example to avoid),
  `packages/server/src/mud/lib/maturation/MaturationProfile.ts`,
  `packages/server/src/mud/platform/idea/MaturationProfileCatalogue.ts`,
  `packages/content/platform/pack.yaml:69`.
- `packages/server/src/mud/lib/metabolism/Metabolic.ts` (`routeIntake`,
  `exposeToPathogens`, `noteMealAccountability`, `reconcileToxinConditions`,
  `clearBurdens`), `packages/server/src/mud/lib/metabolism/BlendLabel.ts`,
  `packages/server/src/mud/lib/metabolism/Palatable.ts` (the augmenter
  template), `packages/server/src/mud/lib/material/Freshness.ts` (the
  value-class-over-a-slot shape).
- `packages/content/trade-distilling/src/thing/Still.ts`,
  `packages/server/src/mud/lib/fire/Burner.ts`, `packages/server/src/mud/platform/thing/Vat.ts`,
  `packages/server/src/mud/platform/thing/CraftVessel.ts`.
- `packages/content/trade-distilling/content/**` (all rows),
  `packages/content/trade-brewing/content/trade/brewing/thing/cask.yaml`,
  `packages/content/trade-forestry/content/trade/forestry/thing/evaporator.yaml`,
  `packages/content/terminus/content/world/terminus/goods-yards/crowsfoot/**`.
- `packages/server/src/mud/platform/idea/cmd/bulk/PourController.ts`,
  `packages/server/src/mud/platform/idea/cmd/perception/SmellController.ts`,
  `packages/server/src/mud/platform/idea/cmd/perception/SingleSenseControllerBase.ts`.
- `packages/server/src/mud/lib/behavior/cellars.ts`,
  `packages/server/src/mud/lib/behavior/restocks.ts`,
  `packages/content/saxonberg-lounge/content/world/lounge/idea/business.yaml`.
- `packages/content/platform/content/platform/idea/Condition/metabolism/ptomaine.yaml`,
  `alcohol.yaml`.
- `packages/server/scripts/check-unconsumed-seams.ts`,
  `check-condition-arms.ts`, `check-drive-scripts.ts`.

---

## Drive record

*(appended at build time — the output of
`packages/wire/tests/whiskey.dirty.wire.test.ts` against the running
game, and what it found.)*

---

# ⭐ Build record — what actually happened

Appended during the build, wave by wave. Written for the reviewer who
has forgotten this session, because MR review outlives the context
window.

## W0 + W1 — landed together, commit `e77ce93e6`

⚠ **One commit, not two.** W0's `routeIntake` change and W1's attribution
change are both in `Metabolic.ts` and cannot be staged apart without
`git add -p`, which this environment does not offer. The commit body
separates them.

**What shipped as planned:** `DissolvedToxins` and its payload field, the
`getBulkPayloadForDraw` seam, the blend in `transfer`, the ×litres route
at ingest, `noteConsumptionHarm` as one function with two moments,
`toxinMakers`, the methanol row.

**Decided here, beyond the plan:**

- **B1 — the maker is `getIdentityPath()`, never `getTemplatePath()`.**
  The plan did not say; `CraftingLogic` already uses identity and the
  harm ledger compares `payload.maker` against the drinker's own identity
  path, so a lineage key would make every bottle name the same person and
  the self-victim guard would never fire.
  ⭐ **Finding for review, not fixed:** `MaturingMixin.stampBatchMark`
  (`Maturing.ts:815-822`) takes `getTemplatePath()`. It is the same defect
  one subsystem over — every player's ferment stamps the shared Avatar
  lineage — and it is out of this build's scope. Marked at the site.
- **B2 — `DissolvedToxins.surviving` is a pure static**, so `routeIntake`
  calls it directly rather than constructing a fake `BulkSlot`. The first
  draft cast an object literal to `BulkSlot`; a cast in new code is the
  smell `/finalize` greps for.

**What surprised:** ⚠ the body's metabolic clock reads `null` — *idle* —
unless the `WorldClockRegistry` **Stuff** is registered, and
`StuffApi.clearAll()` removes it. Every toxin burden in the new tests
stayed at 0, and "no harm row" passed for the wrong reason. Each toxin
test file now mints the registry per test, and every negative case in
those files sits beside a positive one that proves the premise.

## W2 — the fraction schedule, kernel

`lib/fractionation/{FractionSchedule,Fractionating}.ts`, the platform
twin, `FractionScheduleCatalogue` + its row + the `boot:` entry
(`sync-read`), `Mixins.Fractionating` + its refusal +
`MixinApi.isFractionating`, the pour's discipline credit,
`foreshotCharacter` retired.

**Decided here, beyond the plan:**

- ⛔⛔ **B3 — D9 WAS WRONG, and the world test is what caught it.** The
  plan had the read **lag**: *"the untrained nose notices a boundary late,
  so it keeps some heads and some tails."* The first half is impossible.
  You start collecting when you believe the hearts have begun, so a nose
  that notices boundaries late starts collecting **late** — it throws good
  spirit away and makes a *cleaner* bottle. The lag taught the opposite of
  the lesson, and the two world-test distillers (an "expert" and an
  "untrained") made the identical cut.
  ⭐ **The fix is one sentence instead of two rules:** `readFraction`
  reports the **best-graded fraction within ±blur** of where the run
  actually is — *the nose hears what it wants to hear*. At `expert` the
  window is zero. Both of an optimistic window's errors enlarge the cut
  and make it worse (hearts called early ⇒ the heads go in the bottle;
  hearts called late ⇒ the tails do), which is also the true pressure on a
  real novice: yield feels like money.
- **B4 — the run ends on `drawnL`, not on the interior amount.** The floor
  and the remainder are two float paths to one number (`charge × residue`
  vs `charge − drawn`) and they do not always land on the same side of it:
  a pour of exactly `available()` left the still one part in 10⁻¹⁰ above
  its own floor and the run never ended.
- **B5 — two ratchet ceilings rose, each by exactly what this build
  adds**, with the reason recorded in the gate file:
  - `lint:lib-statics` 337 → **342**. Five statics, each the twin of one
    already counted: `DissolvedToxins.blend`/`.isClean`/`.surviving` (the
    fourth member of a family of four beside `Freshness.blendLoads`,
    `WaterActivity.blend`, `Contamination.blend`) and
    `FractionSchedule.byKey`/`.forMaterial` (verbatim the
    `MaturationProfile` pair, with `all()` private).
  - `lint:on-create` 81 → **82** and 34 → **35**, for ONE roster warm.
    ⭐ The gate's own docstring is the justification — *"a warming
    catalogue trips it (that is limb 2, and it is fine)"* — and there is
    no other seam: `postRegister` was retired 2026-10-01, `onCreate` is
    the only hook a Stuff has at birth, and all thirteen catalogues in the
    tree warm there.
  ⚠ **Both are the shape memory warns about** (*a ratchet over a figure
  that scales with content refuses an author for doing it right*). Neither
  is limb 3 or 4; the number worth watching is still the one the
  hydration build drives down.

## W3 — the still runs, pack + world

`Still` composes `BulkableMixin + CraftedMixin + FractionatingMixin`;
both still rows author `reserves.fuel`, `burnTemperatureK: 358`,
`interiorBulk` and a capacity; `new-make` and `stillage` materials; three
schedule rows; `cask` + `slop-bucket` + `whiskey-aging`; the three
retired recipes gone from `recipes/` and the still-book; the whiskey
material's alcohol dose fixed; three vessels onto Crowsfoot's floor.

**Decided here, beyond the plan:**

- ⛔ **B6 — the `pomace` schedule is CUT, and the plan's premise for it
  was wrong.** It said *"`pomace.yaml` is a Receptacle, so it pours."*
  The `pomace` **material** is tagged `solid`/`compost`, and bulk is
  liquid in v1 — a solid in a bulk slot has no honest closure. Grappa
  therefore needs pomace to become a pourable material first, which is
  the winemaking trade's call, not this build's. ⭐ Nothing is lost: the
  `grappa` recipe had never run either (same unlightable still), and the
  grappa material and its stock rows are untouched. **→ a finding for
  `libations-slate.md`.**
- **B7 — `gradeStretch` recalibrated 0.02 → 0.0075**, caught by the world
  test. The shift is ABSOLUTE and the foreshots are five thousandths of
  the charge, so 0.02 per band made a merely-`fine` wash nine-tenths
  foreshots and the grade swamped the schedule entirely. ⭐ *A dial whose
  smallest step is larger than the thing it adjusts is not a dial.*
  0.0075 × 4 bands = 0.03, which is exactly the authored head, so a `poor`
  wash has twice the head of a `masterful` one — D10's own sentence, as
  arithmetic.
- **B8 — `lint:unconsumed-seams` falls by one** with
  `foreshotCharacter`'s retirement, as planned.

**What surprised:**

- ⚠⚠ **A `Creature` composes no `AdvancementMixin`**, so `bandFor` returns
  `untrained` whatever a stubbed digest says. The world test's "expert"
  and "untrained" distillers made the same cut and *both cases passed*.
  The nose is a `Distiller extends AdvancementMixin(Creature)` now, and
  the trap is recorded at both sites.
- ⚠ **Methanol arrives late, and a test has to wait for it.** Absorption
  is 1.5 dose-units a game-minute against 0.01 clearance, so the burden
  climbs ~0.011/min and does not reach the lowest rung for nearly three
  game-hours. A two-game-hour settle read as *nobody was harmed* — a
  timing miss dressed as a design claim. The helper waits six.

## W5 — malting, a rows-only pack

`enzymatic` as a fifth `MaturationMechanism` with its own six lines;
`packages/content/trade-malting/` (a Discipline, two materials, a
profile, a Vat, an Oven, a Receptacle, two recipes — **no `src/`**); the
kit on Crowsfoot's floor and the two steps on the still-book;
`world/__tests__/malting-chain.test.ts`.

**Decided here, beyond the plan:**

- **B9 — the malting floor is a VAT, not a Location.** A real floor *is* a
  room, and modelling it as one would mean `MaturingMixin` on a Location,
  a bed that is "in" the floor rather than in a vessel, and a second
  answer to *where does bulk live*. The bed is what matures and the bed
  is measured in litres. (`expression-is-inelastic`: abstract to what a
  player can act on, which is the bed and not the flagstones.)
- **B10 — `barley` added to `barley-grain`'s tags**, and the sibling row
  is the whole argument: `wheat-grain` carries `"wheat"` — its own name —
  while this one carried only `"brewing"`, a PURPOSE. A recipe slot
  matches a material tag, so the steep would otherwise have had to ask
  for `category: brewing`, which reads as *steep one brewing* and would
  match any future grain somebody tagged for the brewhouse.
- **B11 — the malting floor authors no `_materialPath`.** The first draft
  named a limestone row that resolves to nothing; `lint:census` clause
  (b) caught it. The row states a mass instead — inventing a material row
  to satisfy a field would be worse than omitting it.
- **B12 — the `malt` material STAYS in the commons** this build, as
  planned: two consumers reference its path and moving it is the new
  pack's own later sweep.

**What surprised:** nothing in the chain had an identity tag for barley,
and the `lint:census` catch is the second time in this build that a gate
found a dead reference I had written confidently.

## W6 — the hand runs the still — ⛔ NOT DONE

⚠⚠ **Deferred, and said plainly rather than quietly dropped.** The plan
marks it severable and it changes no live behaviour — `cellars`' `distills`
leg is dead code in production today, and this build removed its config
from `hand.yaml` so the beat does not force retired verbs. But it is
scope the plan named and this build did not deliver.

What it would be: the leg becomes literal verbs (charge from the finished
back, `ignite`, pour in small `--amount` steps switching vessel when
`readFraction(hand)` changes, rectify, `order compound-gin`, consign),
bounded by `batch`. ⭐ The hand must use the SAME banded read a player
gets — a brain may not read the true boundary — and its dossier's
`distilling: proficient` is what makes its cut decent, so a `novice` hand
would poison the counter. That is the design, and it is why the wave is
worth doing rather than cutting.

## W7 — docs + the drive

`docs/subsystems/fractionation.md` (new), history notes appended to
`maturation.md` / `bulk.md` / `metabolism.md` / `accountability.md`, and
the drive at `packages/wire/tests/whiskey.dirty.wire.test.ts`. ⚠ The
one-line `CLAUDE.md` map entry is left to the sweep (worktree rule 5).

**B13 — a process failure of mine, recorded because the rule exists for
it.** The drive commit's message was passed with `git commit -m` and it
contained backticks, so the shell ran them as command substitutions and
silently deleted five phrases from the body. Amended from a file and
force-pushed with lease. *Commit messages always come from a file.*

---

# ⭐⭐⭐ Drive record

## Run 1 — ⛔⛔ THE SERVER DIED DURING BOOT

```
StagedMixin.applyProps: no template at '/trade/malting/thing/malting-floor'
FATAL ERROR: Server failed to start
Error: BootstrapManager: failed to clone
  '/world/terminus/.../location/floor': …no template at…
```

**The `trade-malting` pack ships and does not install.** Its rows are on
disk and all of them are correct; nothing stands them up, so the three
`props:` entries that place the maltings on Crowsfoot's floor named
templates that do not exist, and `BootstrapManager` died cloning the
floor.

⭐⭐⭐ **And this is the whole argument for drives, made again.** Count what
could not see it:

- **the suite** — `world/__tests__/malting-chain.test.ts` reads the pack's
  rows from DISK and passes, nine cases, because every row IS right;
- **`lint:census`** — clause (b) checks that a `props:` entry resolves to
  a ROW, and the row is there;
- **`lint:family`** — all 64 gates green;
- **`tsc`** — nothing to say about YAML.

**A pack that ships and does not install is invisible to every check this
repo has except a boot.** That is a new entry in the reachability table's
`boot` column and it is worth adding to `docs/workflow.md` at the sweep:
the five links are verb · affordance · data · boot · arg gate, and *the
pack installed* is a precondition of the fourth that nothing was asserting.

### What was done about it, and what is left

The three `props:` entries and the two still-book recipes are **commented
out with the reason at the site**, so the boot survives and the gap is
legible. ⚠ **The rows stay** — they are right, and the unfinished thing is
the pack's INSTALLATION.

Two candidates, neither confirmed (Bash search was unavailable for the
last stretch of this session, so this is honest uncertainty rather than a
conclusion):

1. **the workspace link** — `pnpm install` reported *"Already up to
   date"* for a package that had just been created, while also modifying
   `pnpm-lock.yaml`;
2. **the `requires.title` grant** — the pack declares `{ extent:
   /trade/malting, holder: { organization: /compact/trade } }`, exactly as
   `trade-milling` does, and something must actually grant that title
   before `PackApi.reconcile` will install the pack. If so, the fix is a
   title row rather than anything in this build's code.

⚠⚠ **This is the one piece of W5 that is not delivered**, and it is said
here rather than left for review to discover: the malting chain is
*authored, tested and unreachable in a running world.*

## Run 2 — appended below

*(the re-run with the boot made safe)*
