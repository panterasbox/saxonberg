# Paper — implementation plan

Executes [paper-requirements](../requirements/paper-requirements.md)
(kind: **feature**; lead end: **kernel** — paper as a medium is platform
substrate; its first consumers ship in this build: the Gazette's print run,
the bearer warehouse receipt, the notebook, the carton; `trade-papermaking`
and `trade-printing` follow and are content-led). Seeding slate and reuse
ledger: [paper-and-printing-slate § 11](../slates/builds/paper-and-printing-slate.md).

The one sentence the whole plan serves: **the Document is the source of
truth; paper is one way of showing it** — the frozen, unpowered, uncopyable,
irrevocable rung beside the screen. Everything below is either that rung,
the mill that makes the sheet it lands on, or the press that puts the
document onto the sheet.

Branch `reqs/paper` off master `5cfd1a5db` (paint !513 merged). Two
siblings are in flight and **neither is waited on**: harbors
(`origin/reqs/harbors`, 107 commits ahead) and water supply
(`origin/reqs/water-supply`, 36 ahead). § Reconciliation says exactly what
the second merger does.

---

## Grounding

Every fact below was verified by opening the file this cycle (2026-11-03).
`S` = `packages/server/src/mud`, `C` = `packages/content`.

### Marks, reading, writing

- **`MarkedMixin`** — `S/lib/description/Marked.ts` (416 lines). Fields
  `markText`, `markForm` (`inked`·`embossed`·`both`), `markScript`,
  `writingRoom`, `markDevice` (the only `stackIdentity: true` field).
  Affords `read` + `write` via `static commandContributions` (`peers` +
  `environment`). `getMarkText()` returns *"The ink has run; nothing of it
  can be read."* when `markForm === 'inked'`, the host is `Wet` at
  `>= INK_RUNS_AT (0.5)` and not fixed in place; it also folds in painted
  coats' `.marks`. `writeOn(by, words, medium?)` refuses in words
  (`nothing-to-write` · `no-room` · `not-holding` · `full` · `not-faced` ·
  `not-paint` · `source-too-low`), appends with `" / "` and decrements
  `writingRoom`. **No `refreshMarks` on master**, no per-mark list, no
  author stamp. ⚠ `markText` is **not** stack identity: two sheets with
  different words would merge today.
- Composers (16): `Signpost`, `Chart`, `Ingot`, `MetalCasting` (kernel);
  `Scroll`, `Spellbook` (arcana); `Slate`, `TideAlmanac` (diving);
  `SignBoard` (painting); `RateBoard` (haulage); `Die` (smelting); `Stamp`,
  `Brick`, `ClayPart`, `ClayVessel`, `FlowerPot` (ceramics).
- **`ReadController`** — `S/platform/idea/cmd/perception/ReadController.ts`:
  refuses non-Marked (`not-marked`), `PerceptionApi.canMakeOutMarks` (light
  gates only the vision branch; `visionAdequateForMarks` asks the `'fine'`
  detail band), script gate (`script-unknown`, withheld never mangled),
  then `getMarkText()` **sync**, then `fireAnyWorking` (Arcane) and
  `takeAnyChart` (`MixinApi.isCharted(target)` →
  `target.writeClaimsFor(giver)`). View `C/platform/content/platform/cmd/perception/read.yaml`:
  `target requires: [VisibleMixin, MarkedMixin]`, scope `$focus, reachable`.
- **`WriteOnController`** — `S/platform/idea/cmd/inventory/WriteOnController.ts`
  (40 lines, dumb: `surface.writeOn(...)`, refusals rendered). View
  `cmd/inventory/write.yaml`: `words` greedy string; `surface` greedy
  object `requires: [MarkedMixin]`, preps `on/onto/in`; `medium` optional
  `requires: [BulkableMixin]` (paint).
- **Display** — `S/lib/display/Display.ts` (`DisplayMixin`): `pairing`
  (`remote`·`held`·`staff`·`open`), `shows: DisplayKind[]`, `principal`,
  `remote`; runtime `_showing: DisplaySource | null` (**dark on boot**).
  `DisplaySource` is a total union `video | card | prose`; `project()`
  switches exhaustively. `readScreen(viewer): Promise<Mml | null>` is the
  prose arm; **`LookController.ts:665`** calls it (`look <screen>` reads
  the board). `ReadController` does **not** handle displays. The implicit
  ladder is `CommandController.resolveScreen(actor)` (`S/lib/command/CommandController.ts:90`):
  held → paired-in-sight → paired-anywhere-by-mind (`MixinApi.isActive(actor,'AetherMixin')`).
  Composers: `Tablet` (`DisplayMixin(Good)`, rows `trade-hospitality/.../house-tablet.yaml`,
  `saxonberg-lounge/.../house-tablet.yaml`) and `TpaTerminal`. `display.md`'s
  `resolveFor`/`refreshViewer` names do not exist; the real names are
  `resolveScreen` / `refreshFor`.
- **Phone / coverage — ABSENT.** No `Phone` class, row or mixin anywhere
  in `S` or `C`. `AetherMixin` (`S/lib/message/Aether.ts`) is
  `_augmentGated`, conferred by `AetherImplant`
  (`S/platform/thing/AetherImplant.ts`, row `generic-objects/.../AetherImplant.yaml`)
  and works everywhere; "off-grid" exists only as a `PowerBand` value
  (`S/lib/parcel/PowerBand.ts`). The phone, the carrier ladder and coverage
  are the **unbuilt** [off-grid-slate](../slates/builds/off-grid-slate.md)
  (*"The phone is the default; the implant is elective"* — decided, not
  shipped).
- **Epoch** — `S/lib/craft/Epoch.ts` (`EPOCHS = [prehistory, medieval,
  industrial, modern, future]`, ordinal by index), stamped on `ToolMixin`
  (`S/lib/craft/Tooled.ts`: `epoch` persistent+authorable, `setEpoch`
  throws on an unknown word). 19 rows stamp it (18 `medieval`, the seed
  drill `industrial`). **Nothing reads `getEpoch()`**: the covenant reader
  the requirements' *What already exists* describes is a doc comment
  (*"its reader is the land-use covenant's predicate"*) and no code.
  `covenant` does not occur in `S` outside those two comments.

### Documents, press, registers

- **`DocumentKinds`** — `S/lib/document/DocumentKinds.ts`: 18 kinds, closed
  (*"editing this file is a platform act"*). Runtime-written path-keyed
  `keep` kinds are the pattern (`water-right`, `map`, `herd`, `fishery`,
  `body`, `bore`, `bill-of-lading`, `warehouse-receipt`, `instrument`,
  `rate-card`). ⚠ `instrument` (`/home/<key>/papers/…`) says *"never a
  Thing carried in inventory"* — unchanged by this build; paper's bearer
  receipt is a different kind. No lint checks the table; `scripts/pack-roots.ts`
  regex-reads `contentDir`, `gen-schema` folds every kind into
  `ResetPolicy`, `check-untitled-paths.ts` carries a stale hand copy.
- **`DocumentApi`** — `S/api/document.ts` → `S/platform/idea/api/DocumentLogic.ts`:
  `read`, `list(prefix)`, `listOfKind`, `save` (parcel-title gate),
  `delete`, and four named ownership transports: `saveRelease`
  (`FromModule` PressLogic), `saveToRegister` (`FromMixin(Registrar,
  caller === register)`), `saveAsBusiness` (no caller allowlist; closed
  `BUSINESS_DOCUMENT_KINDS` = bill-of-lading · warehouse-receipt ·
  rate-card), `saveInstrument`, `saveMap`/`readMaps`. The acting owner is
  always derived from `ExecutionContextApi`.
- **`StoredDocument`** — `S/lib/document/StoredDocument.ts`: `{path, owner,
  kind, data}`, `findByPath/findByKind/findByPrefix`.
- **`RegistrarMixin`** — `S/lib/document/Register.ts`: `registerPrefix`,
  `registerOwner`, `registerKind` (persistent+authorable); the owner must
  prefix the register's own template path. Composers: `HerdRegistry`,
  `FisheryRegistry`, `BodyRegister`, `BoreRegistry` (all `Registrar(Idea)`
  in packs).
- **Press** — `S/lib/press/{Publisher,Release}.ts`, `S/platform/idea/api/PressLogic.ts`,
  `S/platform/idea/cmd/system/PressController.ts`. `ReleaseData`:
  `releaseId, kind, headline, body, author, publishedAt, expiresAt, pinned,
  retracted, visibility, source` — **no `editedAt`, no history**;
  `editImpl` is `withPatch`, `retractImpl` is `withPatch({retracted:true})`,
  both re-save in place through `saveRelease`, re-`upsert` the board and
  fan `publication.press` frames. The Gazette: `C/terminus/content/world/terminus/gazette.yaml`
  (Organization, `feedPath: /world/terminus/gazette/feed`,
  `publishingPositions: [editor]`); Hesper Quill
  `gazette/agent/editor.yaml`, class `C/terminus/src/gazette/agent/Editor.ts`
  (affords `press` on self); beat `S/lib/behavior/prints.ts` posts
  `press post "Prices: …" --as /world/terminus/gazette --kind notice` every
  `press.indexEditionGameHours` (6) via `executeCommand` (non-forced).
  ⚠ The Gazette has **no premises** (`terminus/content/world/terminus/`
  holds `gazette.yaml` and `gazette/` with the agent only).
- **Harbors' `RegisterBook`** (branch only, verified with `git show
  origin/reqs/harbors:…`): `S/platform/thing/RegisterBook.ts` =
  `MarkedMixin(Good)`, field `government`, `fixedInPlace = true`,
  `refreshMarks(viewer)` → `setMarkText(pageOf(...))` reading
  `GovernmentApi.getGovernment(g).shipRegister` → a `ShipRegister`
  (`Registrar(Idea)`) via `DocumentApi.list`. The hook it adds to
  `Marked.ts` is exactly:
  ```ts
  refreshMarks(viewer: Stuff): Promise<void>;          // interface
  public async refreshMarks(_viewer: Stuff): Promise<void> {}   // default
  ```
  and `ReadController` gains one line before the Perceive block:
  `await target.refreshMarks(giver);`. Rows: `terminus/harbor/thing/register.yaml`,
  `platform/idea/ShipRegister/terminus-city.yaml`.

### Storage, tickets, credentials

- **Receipts** — `S/lib/storage/Receipt.ts`: `StoreReceipt {receiptId,
  bailee, store, depositor, good, poolKey, unit, amountKg, originalAmountKg,
  unitMassKg, terms, what, filedAtS, settledAtS?, shortfallPct?,
  withinAllowance?}`; `ReceiptTerms {allowancePct, feeMinorPerKg}`. Filed
  as `warehouse-receipt` under `<business>/warehouse-receipts/<id>` by
  `Store.fileReceipt` → `DocumentApi.saveAsBusiness`.
- **Withdraw** — `S/lib/storage/Store.ts:886`: `const depositor = staff ?
  this.businessPath : actor.getIdentityPath()`; claims filtered by
  `r.depositor === depositor`; matched by **word** (`matchesGood`), never by
  a held object; settles by `amountKg = 0; settledAtS = nowS()`. Refusals
  returned in words (`no-keeper`, `no-claim`, `empty`, `short`, `no-goods`).
  The verb is one noun `store` (`cmd/custody/store.yaml`, `requires:
  [StoreBookMixin]`), controller `S/platform/idea/cmd/custody/StoreController.ts`
  (dumb). The depot: `C/trade-haulage/src/thing/Warehouse.ts`
  (`StoreMixin(Holder)`, `acceptsLiveGoods = true`), book row
  `trade-haulage/.../thing/depot-book.yaml` (`/platform/thing/StoreBook`,
  `storePath: /trade/haulage/thing/warehouse`, linen). The cut bearer slip:
  `C/trade-haulage/src/idea/WaybillRegistry.ts:120` (*"NO `bearer` flag …
  a `BearerReceipt` Thing that nothing anywhere read back"*).
- **Tickets** — `S/platform/thing/Ticket.ts` = `VisibleMixin(Good)`,
  fields `pointPath`, `number`; row `C/platform/content/platform/thing/Ticket.yaml`
  has **no `_materialPath`**. Minted only by `CheckController.ts:113`
  (coat-check); the rack's reclaim reads the chattel owner stamp, never the
  ticket (`ReclaimController.ts:66`). Take-a-number is a discipline word on
  `AttendantMixin` (`"take-a-number"`) that **nothing mints a ticket for**.
- **Credentials** — `S/lib/credential/{Credential,CredentialWallet}.ts`:
  kinds `payment|travel|key`, records are presentations; the holder is found
  by the MQL `person` pool (bearer semantics, `Lock.opensFor`). No issuer
  callback except banking's account checks.

### Materials, goods, assembly, glue

- **`Good`** = `FacedMixin(IntegrityMixin(ChattelMixin(ConcealableMixin(Thing))))`
  (`S/lib/stuff/Good.ts:74`); **`Thing`** = `WetMixin(Visible(Detailed(Perceptible(Tangible(Containable(Stuff))))))`
  — every Thing is `Wet`. `Holder` = `ContainerMixin(Thing)`.
- **`WetMixin`** — `S/lib/wetness/Wet.ts`: `_saturation` [0,1],
  reconcile-on-read drain, pushed `wet(delta)`; bands `damp ≥ .15`,
  `wet ≥ .45`, `soaked ≥ .8`; **no band-crossing hook**.
- **`MoistureMixin`** — `S/lib/material/Moisture.ts` (`Moist`,
  `getMoisture()`): the matter's own water (a sheet off the mould is water).
- **`CombustibleMixin`** — `S/lib/fire/Combustible.ts`: needs `Reserved`
  (`fuel`) + `Thermal`; `burnOut()` swaps the material to `charMaterialPath`
  (non-structural) or latches `burnedThrough` (structural → `FireLogic`
  destructs on tick). **Nothing clears Marked text when a thing burns.**
  Composers: `Firewood`, painting's `Rag`.
- **`Rag`** — `C/trade-painting/src/thing/Rag.ts` =
  `SelfHeating(Combustible(Thermal(Reserved(Wet(Stackable(Good))))))`
  (oily self-heating), row `trade-painting/.../thing/rag.yaml` (linen,
  `quantity: 6`). The only rag in the tree.
- **`Garment`** — kernel, `S/platform/thing/equipment/Garment.ts`
  (`Labelled(Soilable(Wearable(Slottable(Assembled(…)))))`).
- **`StackableMixin`** — `S/lib/stuff/Stackable.ts`: `canMergeWith`
  requires same template, no shadows/adornments, untitled, same material,
  same fired/coat/flaw/green signatures, every `stackIdentity` field
  equal, neither labelled, same rendered appearance. Mutation never
  splits; callers `split(1)` first (`SampleController:188`,
  `ConsignController:233`, `BuyController:183`).
- **`FoldableMixin`** — `S/lib/slot/Foldable.ts` over `Bistate`
  (`folded`), affords `fold`/`unfold` (`cmd/device/{fold,unfold}.yaml`,
  `requires: FoldableMixin`); composer: `FoldingChair` only.
  `FoldController` is dumb apart from the occupied-slot refusal.
- **`SealableMixin`** — `S/lib/spatial/Sealable.ts` (78 lines) over
  `Bistate` (`open`); `isOpen/setOpen/open/close`; **no record that it
  was ever opened**; no `commandContributions` (`open`/`close` live on
  `cmd/boundary/`). Composers: Bottle, Chest, Flask, Icebox, Vat, Window,
  Barrel, Door (kernel); Coach, Watch, ColdStore, Hive (packs).
- **`FacedMixin`** — `S/lib/material/Faced.ts` (913 lines): faces
  `outside` (+ `inside` when the good holds interior bulk); `CoatLayer
  {material, thicknessM, state, dirtyAtLay?, progress?, paint?, marks?,
  faded?}`; `layCoat(face, materialPath, thicknessM, dirtyAtLay?, paint?)`;
  `airCoats(segments)` sets by the binder (rain RUNS a wet coat);
  `reconcileWeather()`; composed on `Good`, `Building`
  (`S/lib/structure/Building.ts:25`), `Ship`. ⚠ **A room's walls are not
  Faced** — construction's `enclosure:` layers are authored; `paint`
  (`cmd/crafting/paint.yaml` → `PaintController` → `target.coatPlanFor`)
  lays on a Faced good's or a Building's **outside** only. `hang`
  (`cmd/inventory/hang.yaml`, `requires: AdornmentMixin`) mounts a fixture
  (`room.addFixture(item, 'mounted:<chattelId>')`), title untouched.
- **Assembly + glue** — `S/lib/craft/Assembled.ts`; `Joint` rows at
  `C/platform/content/platform/idea/Joint/` (`glued.yaml`: `reversible:
  never, strength 0.7, needsFlat: true, takes: glue`). `fit`
  (`cmd/crafting/fit.yaml` → `FitController` → `CraftingLogic.fitImpl:4783`):
  the **raise arm** draws `crafting.glueLitresPerJoint` from an open
  vessel in reach whose interior material has `getAdhesive()`
  (`glueInReach:4747`); `JointState {glue?, setProgress?, glueStampS?}`;
  `reconcileGlue` advances by the glue's `airSet`, slackens by
  `1 − resistsDamp` in the damp, drops to 0 past `softensAtK`;
  `seatFlatJoints` seats a `needsFlat` joint short on a `cupped` line.
  `Material.adhesive: AdhesiveSpec {strength, reversible: 'never' |
  {heatK?, steam?}, resistsDamp, softensAtK?}` (`Material.ts:223`). ⚠ Only
  the raise arm takes glue; a bill-less join (a label on a bottle) refuses
  `not-raised-from-parts`.
- **Breakage** — `S/lib/material/Integrity.ts`: `impactVerdict` is
  `'none'` unless the material is `brittle`; on `'break'` the broken
  template is cloned and the thing destructed;
  `Container.cleanupOnDestruct` (`S/lib/spatial/Container.ts:276`) moves a
  destroyed container's contents to its outer container — **that is the
  spill**. A jute sack or a crate never breaks. `Sack`
  (`S/platform/thing/Sack.ts`, `VesselKindMixin(GradedReceptacle)`),
  `Crate` (`S/platform/thing/Crate.ts`, `Circulating(Staged(Container(Good)))`).
- **Mould** — `S/lib/mould/Mould.ts` (`MouldMixin`, class
  `S/platform/thing/Mould.ts`); the drain set is `Material.drainSetting
  {days, moisture, loadRef, becomes, becomesAs?, drains?}` integrated by
  `reconcileSetting`, cast by `castInto(pool)` into `castTemplate ||
  material.getCastTemplate()`; `drainsInto()` = the vessel it stands on;
  `loadN()` sums what is `on` it + `host.bearingLoadN(self)`. Dairying's
  `Hoop` is the drain consumer. ⚠ No row forms a sheet today.
- **`dip`** — platform (`cmd/crafting/dip.yaml`, verbs `[dip, melt, gob]`
  → `DipController`), protocol `S/lib/craft/DipBath.ts`
  (`dipPlanFor(req: DipRequest{actor,target,faces,raw})` → `ActPlan |
  ActRefusal | null`); composers `DipPot` (chandlery), `GlazeTub`
  (`DipBathMixin(CompoundingVessel)`, requires `Faced` target, lays a coat
  of the bath's material), glass's `Melt`/`Blowpipe`. **The BATH affords
  `dip`.**
- **`dry`** — platform (`cmd/crafting/dry.yaml` → `DryController`): target
  `Moist` or `Wet`; optional rack `PlacingMixin` (default class
  `DryingRack`); speed from `Placing.airExposure` + the room's air. The
  carpentry loft is a `Chamber` row inside `LoftedSawmill`, **not a room
  a person enters**.
- **`strain`** — `C/trade-hospitality/.../cmd/crafting/strain.yaml` →
  `StrainController`: the bartender's terminal mint
  (`requires: ManualBuildMixin`, `CraftingApi.mintFromBuild`). ⚠ **It has
  no filter and no fineness.** The only filtering in the tree is
  `Material.filteredTo` on a porous vessel seeping into the vessel below
  (`Bulkable.ts ~1190`, `arrivesAs: through`).
- **`carve`** — platform (`cmd/crafting/carve.yaml` → `CarveController`),
  protocol `S/lib/craft/Carvable.ts` (`carvePlanFor`); `Mould` is Carvable.
- **The screw press** — `S/platform/thing/ScrewPress.ts`
  (`TurnableMixin(PlacingMixin(Good))`): `turn <press>` (`cmd/device/turn.yaml`);
  `pressForceN = turns × newtonsPerTurn`; `bearingLoadN(item)` for items
  `on` the bed; `turnBy` reconciles **Moulds** on the bed only. `press` the
  verb is the ticker's (`cmd/system/press.yaml`).
- **Recipe ladder** — `S/lib/script/RecipeKnowledge.ts` (`knownKey` =
  `recipe-known:<id>`, `madeKey` = `recipe-made:<id>`);
  `MenuController.ts:78` mints known-of via `giver.recordChronicleOnce`
  (`PersonaMixin`, `S/lib/character/Persona.ts`); `CraftController.requireDeed`
  refuses `make` with *"You've heard of X, but you haven't learned to make
  it — work it by hand first."* (`not-learned`). `ReadController` mints
  nothing.
- **`ChartedMixin`** — `S/lib/expanse/Charted.ts`: `of`, `entries[]`,
  `writeClaimsFor(reader, told?)` → `NavigationApi.recordPlace` (channel
  `charted`/`told`); composers `Chart` (`ChartedMixin(MarkedMixin(Good))`),
  water's `Pilot`.
- **Spellbook** — `C/arcana/src/thing/Spellbook.ts` =
  `Circulating(Graded(Identifiable(Labelled(Marked(Good)))))`, fields
  `teachesSpellPath`, `comprehensionBand`; affords `study`
  (`StudyController` → `StudyActivity`, claim `spell-known:<path>`); rows
  `arcane-library/.../magic/{primer-of-glowlight,manual-of-transfer}.yaml`
  (`materialTags: [paper, board]`, **no `_materialPath`**). `read` shows the
  marks only; the working is `study`'s.
- **Tide almanac** — `C/trade-diving/src/thing/TideAlmanac.ts` =
  `MarkedMixin(Good)`, field `of`; `getMarkText()` computes 12 turns from
  `WaterExpanse.tideAt(now)` **live at read time**; row canvas.
- **Founding, moulds, pour** — Discipline
  `C/trade-smelting/.../idea/Discipline/founding.yaml`; moulds
  `ingot-mould`, `chill-mould`, `flask`, `bell-pit` (all
  `/platform/thing/Mould`); `crucible.yaml` (Receptacle); `pour X into
  mould` (`PourController:167`) credits the mould's discipline; the freeze
  is `Thermal.reconcileBulkPhase` → `mould.castInto`. Lead and pewter
  materials exist; **no antimony, type metal or hand mould**.
- **Paint's materials** — `trade-painting/.../idea/material/`: lampblack,
  linseed-oil, hide/bone/fish/casein glue, starch-paste, rosin,
  rubber-cement, gesso …; pots `glue-pot`, `paste-pot`, `casein-pot`,
  `paint-pot`. Dyer's `tannin.yaml` (gallnut) and `iron.yaml` (copperas) at
  `trade-dyeing/.../idea/material/`. **No gum arabic, no size, no
  iron-gall ink, no galls as a thing.**
- **Disciplines** — a row `class: /platform/idea/Discipline` anywhere in a
  pack (found by class, no roster): `C/<pack>/content/<root>/idea/Discipline/<key>.yaml`.
- **Water at the flats** — locality `world-seed/.../Locality/hearts-delight.yaml`
  (`_reach: delight:flats`); rooms `hearts-delight/.../location/{millsite,
  mill-house, sawmill}.yaml`; races `thing/millrace.yaml` (`ControlStructure`,
  `reachRef: delight:flats`, `headM: 6`, `generates: true`) and
  `thing/sawmill-race.yaml`; the grist mill reads power by `powerFrom`
  (`C/trade-milling/src/thing/GristMill.ts:111`, cached 6 game-hours,
  `ControlStructure.generationW`). Contamination:
  `C/water/src/idea/WatercourseCatalogue.ts` `ContaminantKind =
  organic|persistent|sediment|nutrient`, `contaminationAt(reach)`; the only
  authored discharge is `terminus/.../wharfside/thing/city-outfall.yaml`;
  **Rejection's mine water fouls the headwaters in prose only**. On the
  water-supply branch: `Gate`/`PersistentGate`, the ditch rows, `Aquifer`,
  `WaterChemistry`, `SupplyShares` — and **no water-right rows and nothing
  tying a works to a right** (`WaterRightRegistry.allocate` has no caller
  on either branch; the plan's D14 says *"return flow needs no code"*).
- **Pack layout exemplar** — `trade-painting`: `pack.yaml` (`root:
  /trade/painting`, `requires.title` held by `/compact/trade`),
  `content/trade/painting/{idea,thing}`, `content/recipes`, `src/thing/`,
  `src/behavior/`, `src/__tests__/`, `package.json` listing every pack it
  names a row from (`lint:pack-extends`/`requires-kernel` refuse a
  cross-pack reference without the dependency line).
- **Drive precedent** — `packages/wire/tests/paint.dirty.wire.test.ts`
  (+ `paint.soak.dirty.wire.test.ts`): `declareFile({file, packs,
  dirtyReason})`, staged twins by wizard `eval` as the founder, the span
  steps in the soak file.
- **fieldMeta merge** — `MixinApi.getAllFieldMeta` (`S/api/mixin.ts:846`)
  walks the prototype chain nearest-first and *fills only what no nearer
  layer said*, so a subclass's `markText: { persistent: false }` overrides
  the mixin's.

### The siblings, second read (2026-11-03, after `git fetch`)

- **Harbors** (`origin/reqs/harbors` at `8125deeed`, merge-base = master
  `5cfd1a5db`, so it **contains paint**). Beyond the register book:
  - ⭐ **Records are documents** — `docs/antipatterns.md § A Stuff whose
    only job is to hold a record` (commit `02de8944d`) + the scan in
    `docs/slates/tails/records-as-documents-slate.md`. The four-question
    test (targetable · behavior beyond add/remove/list · a runtime
    participant · invariants on the object; none → a document), the two
    document shapes (system-written behind a narrow named transport gated
    like `saveToRegister`/`saveBerth`; owner-scoped content under the
    parcel-title gate), and the one exception (a fixture players use that
    keeps its own book — `HullBook`, `HireBook`, `Stock`, `CheckRack`,
    `Stockpile`; the tell that it is stretched: a fixture named for the
    book holds nothing and forwards to a placeless Idea). Worked example:
    `BerthRoll` (`PersistableMixin(Idea)` per landing) → the `berth-roll`
    kind. § Records audit below applies it to every record this plan makes.
  - `DocumentKinds.ts` gains `ship` and `berth-roll` (both `naturalKey:
    null`, `onVanish: 'keep'`); `document.ts`/`DocumentLogic.ts` gain
    `saveBerth(ship, landingPath)` gated `FromMixin(Mixins.Voyaging, caller
    === args[0])` (the subject writes its own line; the truth — does she
    lie here — is READ off the ship, never passed in) and `berthRollOf`.
  - ⭐ **`buy` is one protocol**: `lib/retail/ForSale.ts` (`ForSaleMixin`:
    `offers(word)`, `sellerFor(word)`, `sell(sale) → SaleOutcome`,
    `purchaserOf`); `BuyController` shrinks to a narrowing on it (−401
    lines); implementers `Stock`, `ConsignmentShelfMixin`, `HullBook`;
    `Hirable.ts` + `rent` beside it. `Stock.buys` (the house buys) is
    untouched (12 mentions on the branch, as on master).
  - **A holding's buildings are authored, and plans live on their owners**
    (`8125deeed`, then `a20704a98`): no blueprint rows. A
    `FloorplanWarren` authors `extent`, `entrance` and its `buildings`
    itself (the programme rows carry their plans); each named building is a
    `HoldingBuilding` row with its own extent and entrance.
    `lib/location/Blueprint.ts` → `Floorplan.ts`; `Structure.buildings` and
    `footprintM2` are **deleted**; `Structure.memberExtent()` is a new hook
    (a ship kind's membership is her warren's, read through
    `FloorplanWarren.planOf`). The location graph skips a Structure row a
    warren mints and every building a programme names. ⚠ So the grounding
    line above (*"a holding's buildings come from its floorplan … grouped by
    the room's `building:` key"*) describes **master's** paint merge.
    `Place.structureNow` (which building am I in) survives on both.
  - `Integrity.ts` gains the `holed` flaw; `WatercourseCatalogue.ts` gains
    `barWaterAt` and a `'site'` kind — neither touches paper.
- **Water supply** (`origin/reqs/water-supply` at `b2523236f`, merge-base
  `060704faa` — ⚠ it does **not** contain paint; it will merge master's
  glue into its own `Assembled.ts` edits before it lands). Read
  `docs/subsystems/water-supply.md` and the plan on that branch:
  - **The premises citation**: `ParcelRecord.waterSource` (`''` inherit ·
    `none` · a supply path; `setWaterSource` throws otherwise) and
    `TitleClaim.waterSource?`; `ParcelApi.waterOf(path)`; `lint:water-posture`
    (`scripts/check-water-posture.ts`, ceiling 0): every
    residential/commercial/industrial/civic claim declares or inherits;
    `agricultural`/`wild` exempt; the realm root declares nothing. Terminus's
    premises cite `/world/terminus/wharfside/thing/city-intake`; Heart's
    Delight's creamery, brickfield and potter's shop declare `none`.
  - **A natural source**: `natural: true` on a `/platform/thing/WaterFixture`
    row (the tannery leat `wharfside/tannery/thing/leat.yaml`, the
    brickfield pond) — *"it runs on its own water, never a premises'
    citation"*. `WaterFixture.ts` exists on master; the `natural` field is
    the branch's.
  - **The supply contract**: `WaterSupply` (`lib/supply/SupplyState.ts`):
    `shareFor(landUse)`, `serves(path)`, `supplyStateNow`; `Conduit.shares:
    'priority' | 'proportion'` — priority serves civic, then trades, then
    houses. **This is the city main's rule, not the river's.** A river
    works still draws through `Withdrawing.withdrawalM3S` as on master;
    `WaterRightRegistry.allocate` still has no caller.
  - **An artificial channel carries only what it is given**: the catalogue
    credits a control's diversion into the course it names
    (`divertsTo`), less seepage by `lining`; its works draw on what it
    carries. The headgate (`hearts-delight/ditch/thing/headgate.yaml`,
    `PersistentGate`, `reachRef: delight:flats`, `at: delight:flats+0.2,left`,
    `divertsTo: delight-ditch:head`, `capacityM3S: 0.6`) sits **upstream**
    of the millrace (`at: delight:flats+0.3,right`, unchanged on the
    branch) and the sawmill race (`+0.9`). `delight.yaml`'s flats node adds
    the headgate and weir to `works:` (one line). ⭐ So the ditch's draw
    comes off the river *before* the mill's race sees it — the river's own
    accounting shorts the mill in a dry spell, with no right in play.
  - **Water carries its chemistry**: `WatercourseChemistry {pH, hardnessDgh,
    nitrateMgL}` seeded by the Watercourse row's `water:` block
    (`kestrel.yaml:30 water: { pH: 7.8, hardnessDgh: 12, nitrateMgL: 2 }`),
    mixed downstream by `WatercourseCatalogue.chemistryAt` (private, by
    flow weight) into `WaterState.pH`; `lib/supply/WaterChemistry.ts`
    (pH, hardness, salinity) rides `BulkPayload` (`pH`, `salinityPpt` by
    declaration merge). **No iron anywhere.** Contamination by kind
    (organic · persistent · sediment · nutrient) is a separate axis for
    fouling.
  - `lib/spatial/Sealable.ts` (+117): `canOpen(by): VetoResult` on
    `Sealable` and a new `ThrottleableMixin` (`opening`, `workLog`,
    `openingCurve`) in the same file; `lib/craft/Assembled.ts` (+19):
    `canTakeMembers` / `afterMembersFitted` hooks; `ParcelRecord.ts` (+39);
    `CraftingLogic.ts` (+5). All additive against what paper writes.

---

## ⭐⭐ New substrate

The short list. Everything else in this build is a row, a controller over
an existing protocol, or a method on a class that already exists.

| new | kind | ledger row / search |
|---|---|---|
| `Marked.refreshMarks(viewer)` `@hook` | hook | **row 1** (harbors' hook, taken verbatim; implementers here: `Sheet`, `Book`, `RegisterBook`) |
| `Marked.teach(reader)` `@hook` | hook | **row 3** (the reading-writes-claims protocol; implementers: `Chart` (moves `takeAnyChart`'s body), `Sheet`/`Book` (an edition's `teaches`), `RegisterBook` (nothing)) — three implementers, so a hook |
| `DocumentKinds.edition` | document kind | ⭐ **genuinely new** (ledger: *frozen editions — copy-on-write over a document*); searched the 18 kinds: nothing frozen, nothing with pages |
| `DocumentKinds.book` | document kind | ⭐ **genuinely new**; searched: `instrument` is machine-written terms, `msh` is source; nothing page-shaped a person writes in |
| `DocumentApi.freezeEdition` / `.pagesOf` | two methods on an existing Api | row 2 + genuinely new; the fifth named write transport, on `saveAsBusiness`'s posture (structural checks, no caller allowlist) |
| `Sheet` (`platform/thing/Sheet.ts`) | class | rows 4, 5, 6, 9, 13 composed; **access by possession** is the class's own rule (⭐ genuinely new per the ledger: the sheet reads its edition with no title check) |
| `Book` (`platform/thing/Book.ts`) | class | rows 1, 9 (an `Assembled` whose bill is leaves + boards + a glued spine) |
| `TearableMixin` (`lib/material/Tearable.ts`) | protocol mixin | genuinely new; searched `tear|rip|shred` — no verb, no protocol. Earned by one verb on three hosts (`Sheet`, `Book`, `Garment`) — the model-side protocol rule |
| `Sealable.seal` + `.sealBroken` | two fields on an existing mixin | **row 4** (*the broken seal is the genuinely new state*) |
| `DisplaySource` arm `document` | one union arm | row 11 (the live rung on the display substrate) |
| `Tool.admittedAt(place)` + zone field `admitsEpochThrough` | one method + one zone field | **row 16** — the covenant's first reader; the stamp exists, the reader does not (grounding) |
| `ReceiptTerms.bearer` + `StoreReceipt.presentedBy?` | two fields | **row 7** (bearer paper as a paper presentation of a credential-style record) |
| `RegisterBook` (`platform/thing/RegisterBook.ts`) | class | **row 1** — the same file harbors ships; § Reconciliation |
| `Rag` → kernel (`platform/thing/Rag.ts`) | class move | row 12's rule (*substrate goes to the kernel when its composers have no common pack ancestor*): painting wipes, papermaking buys, a kernel garment tears into one |
| Disciplines `papermaking`, `printing` | two rows | requirements |
| verbs `tear`, `seal`, `couch`, `copy`, `compose`, `proof`, `print`, `distribute`, `show … on` | views + controllers | requirements § Verbs; `show` is the one not named there (D5). ⚠ `beat` and `bind` are **not** new verbs — both collide with shipped views and the ladder resolves each with a shipped verb (D26) |

**Not used, with why (the ledger's remaining rows):** row 8 (`Ticket` gains
a material and extends `Sheet`; no class of its own — used); row 10
(`ManualBuildMixin` for the forme) — **declined**: the build buffer banks
input *Stuff* toward a recipe output, and a forme's inputs are glyph
*counts* debited from a case plus the text as set; the forme keeps a plain
record (`{source, setText, debits, locked}`), no step machine; row 14
(water supply's rights) — **nothing to draw under on either branch**; the
stamper reads power exactly as the grist mill does (row 15), and its fouling
is a `Discharging` works row (the city outfall's shape) — see D9; row 2's
`saveToRegister` is the ledger book's read side only (a ledger is a
`list(prefix)` of a business's own papers).

---

## Plan-level decisions

**D1. The static rung is `Marked` with derived marks, not `DisplayMixin`.**
A sheet does not compose `DisplayMixin`: every one of its claims —
`pairing`, `mayDrive`, `show()` projecting to a room, dark on boot — answers
*no* on paper (P2's honest-default test). What a screen and a sheet share
is *showing a document*, and the two faces of that are already in the tree:
`Display.readScreen(viewer)` and `Marked.getMarkText()`. This build joins
them under one `read` (D5) and gives `Marked` the derived-marks hook the
ledger names (harbors' `refreshMarks`, verbatim). The requirements'
*"the static rung on the display substrate"* is honored as a product
statement — `read` answers the same on a sheet and a screen — not as a
mixin composition. ⚠ Flagged for the owner: this is the engineering form
the slate's § 1 took on contact with the code.

**D2. A frozen edition is minted at print, by content hash, idempotently.**
`DocumentApi.freezeEdition({source, pages, teaches?, validUntilS?})` writes
`kind: 'edition'` at `<source>/editions/<sha1 of pages>` with the source
document's owner; a second print of the same text finds the same edition.
A sheet binds `{boundTo: editionPath, page}`; five hundred copies are one
record. Edits and retractions never need to know paper exists (the
requirements' copy-on-write *at edit time* would need the editor to find
every sheet — a reverse search). Deviation recorded: an edition is kept
whether or not paper still holds it; garbage collection is a deferred seam.

**D3. The edition body is the text AS SET, not the document's text.** The
press freezes the forme's set text (misprints included); the printer
freezes the document's current render; the pen copies the words of a sheet
into an **unbound** sheet (`markText`), errors by competence. So a hand
copy is not bound to anything, which is what makes forgery decidable by the
issuer (D8).

**D4. Rendering a kind to pages is the kernel's, exhaustive, in
`DocumentLogic.pagesOf`.** `DocumentKinds` is closed and kernel-owned, so a
`switch` over `DeclaredDocumentKind` is a total match (a new kind is a
compile error here, the `DisplaySource` rule), not a central list a pack
must edit. Arms: `release` (masthead · headline · body · dateline; a
retracted release still renders — the edition is what paper keeps),
`warehouse-receipt` (the terms in words), `recipe` (name + steps;
`teaches: [recipe-known:<id>]`), `book` (its pages), `edition` (its pages),
`instrument` (`data.text`), `rate-card`, `bill-of-lading`, `water-right`,
`herd`/`fishery`/`body`/`bore` (one summary line each — a register's
entries read through the book, D7); `msh`, `emote`, `name-bank`,
`blueprint`, `command-view`, `archetype`, `map` → `null` (*"that is not
something that reads as a page"*, refused in words by the verb).

**D5. One `read`, two faces; `show <document> on <screen>` is the live
rung's verb.** `read.yaml`'s target becomes `requires: [VisibleMixin,
MarkedMixin|DisplayMixin]` (the `ignite` alternation precedent);
`ReadController` dispatches: Display → `readScreen(viewer)`; Marked →
`refreshMarks` → perceive → decode → text → `teach`. A `DisplaySource`
gains the arm `{kind:'document', path}`; `readScreen`'s default renders it
through `pagesOf` **live** — an edit shows, a retraction reads *"withdrawn
by its publisher"*. The verb that puts a document on a screen is
**`show <what> on <screen>`** (requirements: *"call up a Gazette release on
the phone"* names no verb; `show` was grepped against every shipped view at
plan time and is free — D26). What may be shown:
a release the reader may see (`Release.getVisibility()` + `publishedByOwner`),
anything under the reader's own `/home`, anything under a business the
reader holds a position at — the **network's permission**; a sheet needs
none (D6). The device's reach is one seam, `Display.canFetchAt(place)`,
`true` today — see § Risks R1.

**D6. Access by possession is the sheet's rule, and the sheet checks
nothing.** `Sheet.refreshMarks` reads its edition by path with no title
gate — `DocumentApi.read` is ungated already. The only gate on a sheet is
perception (light, reach). That IS the requirement, and the reason a
printed private record is a risk the player takes.

**D7. A ledger is the live book of a business's own papers; the book is
harbors'.** `RegisterBook` gets a second way to name what it reads:
`registerPrefix` (a document prefix — a business's branch, a register's
prefix) beside harbors' `government`. `refreshMarks` renders
`DocumentApi.list(prefix)` through `pagesOf`, one line per paper. The print
shop's ledger is a `RegisterBook` row with `registerPrefix:
/world/terminus/gazette/print-shop` (its business branch). Burning the book
destroys the book; the documents stand. An extract is `print <book>`: the
page frozen as an edition (D2) whose `source` is the prefix.

**D8. Bearer paper is a sheet bound to a receipt's edition, presented from
the person pool.** `ReceiptTerms.bearer` (authored on the store row; the
depot authors `true`; the ice houses stay registered — their drive is not
this build's). `Store.deposit` on a bearer store mints a `Sheet` from the
book's blank stock, freezes the receipt as an edition and binds the sheet
(`StoreReceipt.editionPath`); `Store.withdraw` on a bearer store ignores
the actor's identity and looks for a **bound receipt sheet** in the actor's
`person` pool (credential's scan shape) whose `boundTo` is an edition under
**this** bailee's `warehouse-receipts` and whose receipt is unsettled; a
settled one answers *"already settled"* and stays in hand; none answers
*"You present no receipt for that here."*; the depositor without the paper
is refused the same way. A hand copy (D3) is unbound → refused: the issuer
checked its record. Forgery "works where the issuer cannot check" has no
presenter in this build (banknotes are the money slate's).

**D9. The mill's water is a works on the flats, like the two races.** The
stamper is a `Discharging` works row at `delight:flats` (the city outfall's
shape, `dischargeKind: organic`, load scaled by the beating hours — a mill
working fouls; an idle one does not) and reads power by `powerFrom` as the
grist mill does. The sheet's **color** is read off the vat's water:
`contaminationAt(delight:flats).byKind.persistent` above a dial →
*brown*; below → *white*. Authored nowhere; a staged mill on
`kestrel:headwaters` with a staged persistent discharge makes brown. ⚠ The
grist mill reaches its race by a structural cast (`typeof duck.generationW`);
the stamper imports water's `ControlStructure` type and does not (P4).
⭐ **Designed for the chemistry home** (the owner's preferred one, water
supply's `WaterChemistry` — § Reconciliation): the color has ONE reader,
`Sheet.colorFrom(water)`, fed by `PulpVat.waterCharacter()` at the dip.
On master `waterCharacter()` asks the catalogue's contamination; after
water supply merges it reads the vat's own payload (`BulkPayload.ironMgL`,
which water supply does not have yet — reconciliation adds `ironMgL` to
`WatercourseChemistry`/`WaterChemistry`, authored on the Kestrel's
`water:` seed where the ore is). The sheet never learns which; the AC
(*brown, authored nowhere*) holds in both — only the water's iron is
authored, on the river row.

**D10. Folding is `Foldable` with a count.** `Sheet` composes
`FoldableMixin` and overrides `fold()`/`unfold()` to step `folds` 0→3
(`sheet · folio · quarto · octavo`; a fourth fold refuses *"it will not
fold again"*); `isFolded()` is `folds > 0`. One verb, the shipped views,
`FoldController` unchanged. The format is `Sheet.format()` read off
`folds`; a `Book`'s page size is its leaves' format at binding.

**D11. The broken seal lives on `Sealable`.** Two fields: `seal: '' | 'gum'
| 'wax'` and `sealBroken: boolean`. `open()` on a sealed, closed host sets
`sealBroken = true` and keeps `seal`; `close()` never re-seals; `seal <thing>
[with <wax|gum>]` sets `seal` and clears `sealBroken` only if the host was
never opened since the last seal (re-sealing a broken letter is the forger's
act and is refused in words — *"the seal is broken; you would need a new
one"* — a fresh wax seal replaces, a gum flap does not). Every other
composer answers `seal: ''` and reads nothing new; the honest-default test
is met because a bottle's capsule, a barrel's bung and a strongbox are real
second composers the same fields serve. Presence line: *"its seal is
broken"* (`markupAugmenter`, the device augmenter's shape).

**D12. Paper fails by pulping, and pulping is a latch.** `Sheet`, `Bag`,
`Carton` read `Wet` on their own reads; past `paper.pulpsAt` (0.8, the
`soaked` band) the host latches `pulped` (persistent) and schedules its own
destruction (`ScheduleApi.schedule(0, …)` → `StuffApi.destruct`) — the
Combustible latch-then-tick shape, because destructing from a reconcile-on-
read is unsafe. A destructed container spills by the shipped
`cleanupOnDestruct`; a pulped sheet leaves a lump of `/stuff/thing/pulp`
(one row). Burning: `charMaterialPath: ash`; `Marked.getMarkText()` learns
one more read beside the ink rule — a host that `isCombustible` with fuel
spent reads *"nothing but ash"* (the same shape as the wet rule, in the same
method).

**D13. Tearing is a protocol on the thing torn.** `TearableMixin.tear(by):
TearOutcome` — `Sheet`: two half sheets, each unbound, each with the half
of `markText` it held (a bound sheet's torn half carries the half of its
edition's rendered text as `markText` and loses the binding — a torn page
is little paper); `Book`: `tear page <n> from <book>` removes leaf *n* into
a `Sheet` (frozen text or the notebook's page text) and records the gap;
`Garment`: rags of its cloth (`/stuff/thing/rag`, mass conserved), refused
while worn.

**D14. The book is one class, filled three ways by what it is bound to.**
`Book` fields: `pageCount`, `roomPerPage`, `missing: number[]`, and ONE
binding of `{document: path}` (notebook — pages are the `book` document's
`pages[]`) · `{edition: path}` (printed — frozen) · `{register: prefix}`
(ledger — live; this is `RegisterBook`'s job, so a `Book` bound to a
register is not built: the ledger book is `RegisterBook`, which is a `Book`
with that binding in spirit and a `Marked(Good)` in code — one fixed-in-
place class harbors already named). A blank bound book has no document
until first written: `write <words> on page <n> of <book>` mints
`/home/<writer key>/books/<chattelId>` (kind `book`) and binds it; the
writer owns it under the ordinary self-home gate, so a borrower reads and
cannot write (refused in words, `AccessApi.canAtPath` asked first — P3).
`read <book>` reads the current page; `read page <n> of <book>`; `turn to
<n>`? — no: `read page <n>` is enough and adds no verb.

**D15. Spellbooks become paper by composing `Book`'s material, not its
pages.** `Spellbook`'s base gains `CombustibleMixin(ThermalMixin(ReservedMixin(…)))`
and its rows gain `_materialPath: /stuff/idea/material/paper` and
`charMaterialPath`; `study` and the comprehension floor are untouched.
Making it a `Book` would put its working text in an edition nobody
authored; the requirement is *keeps its reading behavior and burns*.

**D16. The almanac is printed for a year by a stamp, not an edition.**
`TideAlmanac` gains `printedAtS` (set at clone from the counter, or by the
press when a diving almanac is run off) and renders the tides for the year
from that date; past it, `refreshMarks` sets *"This almanac is out of date;
its year ended on …"*. No edition document: its source is the sea, not a
document.

**D17. The forme is a record, misprints are seeded, proofing finds by
competence.** `Forme {source, setText, debits: Record<glyph, n>, locked}`.
`compose <document> in <forme>` renders the document through `pagesOf`,
debits the case's font by glyph count (refused naming the first glyph the
case runs short of — *"the case has no more lowercase e"*), and seeds
misprints: `n = ceil(len × rate(band))` substitutions at positions from a
seeded hash of `(text, compositor identity, case path)` — seeded, never
drawn (uncertainty.md; the error is the actor's competence, not a roll).
`proof` finds a share by the proofreader's band, seeded on a different
salt, and corrects what it finds. `print <forme> [<n>]` freezes `setText`
as the edition and mints *n* sheets, consuming *n* blanks from the press's
paper stock and ink by area from an open ink pot in reach (the glue draw's
shape); `distribute <forme>` credits the font back. Type is capital: the
case's `font` is persistent state on the case.

**D18. Printing ink is a paint; iron-gall ink is a liquid made in a pot.**
Lampblack ground into boiled linseed oil is the paint pot's shipped path
(`put lampblack in pot`, `pour linseed`, `stir` — `PaintPot.payloadFor`);
the press draws any pot whose paint's binder is a drying oil and pigment is
black. Iron-gall: a recipe `iron-gall-ink` (galls → tannin, copperas, gum
arabic, water) stirred in a pot; the material row `laysCoat: false`,
`tags: [ink]`; `write` on paper draws from an ink pot or an inked pen
(`Pen` holds a small charge; `dip pen in ink`). Writing with no ink in
reach is refused in words on paper (a slate scratches; paper needs ink).

**D19. Glue is paint's; paper adds `size` and `gum arabic` as materials.**
`size` (hide glue thinned: `laysCoat: true`, sets by `drying`, `coatWord:
sized`, `adhesive` null) is laid by `dip` in a `GlazeTub` row named the
size tub; a sheet with a set `sized` coat takes ink, an unsized one
*bleeds* (`Sheet.writeOn` refuses `bleeds`). Pasteboard, a carton's seams
and a book's spine are `glued` joints on bills (`fit` raise arm, D20).
**A label is pasted, not fitted into a bill:** `fit <label> to <good> with
<pot>` — `FitController` gains the one arm: thing is a `Sheet`, whole is
`Faced` and not raised from parts → `whole.pasteOn(sheet, glueVessel)`:
lays a coat of the glue material carrying the sheet's text as `marks`
(`letterInPaint`'s shape) and consumes the sheet; the glue's
`AdhesiveSpec.resistsDamp` decides in `airCoats` whether a wet surface
(the ice bucket, a damp room) lets the coat go. Starch paste lets go;
casein holds. Wallpaper is the same act on a building's **inside** face
(D21).

**D20. Board, cartons and bags are bills.** `pasteboard`: recipe with a
bill `{parts: [{part: ply, template: /trade/papermaking/thing/sheet,
count: 4, role: structural}], joints: [{key: laminate, method: glued,
members: [ply]}]}` — `fit`'s raise arm, glue drawn, `needsFlat` seats a
cockled ply short (the `cupped` line: a sheet dried unpressed records
`cockled`, which the bill reads as `cupped`). `carton`: a `Crate` row of
board with a `seam` glued joint; `bag`: a `Sack` row of paper, no joint
(folded and pasted at the bottom: one `glued` joint). Both compose
`Tearable` and pulp by D12; a torn or pulped one destructs and spills.

**D21. Wallpaper is a coat on a building's inside face.** `Building.faces()`
→ `['outside', 'inside']`; the inside face is bound from any enclosed
member room (the landing rule's indoor twin: `Place.structureNow` already
answers which building you are in); `paint inside of <building> with
<paste pot>` lays paste; `hang <wallpaper> on <inside>` pastes the sheet
(D19's `pasteOn`, the same arm `hang` takes when its target is a Faced
face rather than a wall hook — one more arm in `HangController`, the
poster path untouched); `airCoats` for the inside face walks the member
rooms' **air** (humidity), not the weather — a damp room lets paste go.
`look` in a member room adds *"The walls are papered."* ⚠ Which building
a room belongs to is `Place.structureNow` on both master (paint's
topology-derived `HoldingBuilding`) and harbors (authored `HoldingBuilding`
rows named by the warren's own plan) — D21 calls only that and never groups rooms itself, so
harbors' change costs paper nothing; the drive's cottage is Wharfside's
towpath cottage (a `Building` row, not a holding), untouched by either.

**D22. The epoch covenant is a zone field read by the instrument.** Zone
field `admitsEpochThrough: Epoch` (inherited by `lookupField`, default
unset = everything admitted); `ToolMixin.admittedAt(place): string | null`
returns the refusal line (*"the covenant here admits nothing later than
medieval; the printer stays in its crate"*) or null. Readers: `print`
(the press `industrial`, the printer `modern`), `copy` (the pen `medieval`).
⚠ Cross-cutting (R3) and tiny; shipped here because the requirements'
drive needs it and nothing else reads the stamp. Flagged in § Risks.

**D23. `Rag` moves to the kernel; the commons gets a rag row.**
`S/platform/thing/Rag.ts` (unchanged behavior), painting's row keeps its
path and names the kernel class; `base-library` adds `/stuff/thing/rag`
(plain linen rags) that `tear` yields and the mill buys; painting's paint
rags stay a separate row (they do not stack with clean ones — the mill
refuses an oily one with the reason: `Rag.oilCoats().length > 0`).

**D24. The mill's counter refuses oily rags in the house's words.** The
mill's rag counter is a store-fed buying line (`buys: true`); the house's
`sell` veto gains one hook on the GOOD — `Good.acceptableToBuyer?` no: the
line's refusal is the store's `canAddContainable` (storage's shipped veto),
and `Rag.poolKey()` answers `rag|oily` for an oiled one, which the mill's
stack (`acceptsPoolKeys: ['rag|clean']`) refuses with *"That does not go in
a stack like this."* — then the counter says why: *"the mill wants clean
rags"* (the line's authored `refusalLine`). No new mechanism.

**D26. Two verb collisions found at plan time, resolved on the ladder's
first rung.** The requirements' `beat` collides with cleanliness's
`cmd/inventory/brush.yaml` (`verbs: [brush, beat]` — beat the dirt out of
a rug, target `SoilableMixin`), and `bind` with medicine's
`cmd/medical/treat.yaml` (`verbs: [treat, bind, dress]` — bind a wound). A
second view claiming a verb shadows the first silently, and the common
word (a rug, a wound) wins. Both acts already have a shipped verb that IS
the act: the stamper is a water-powered **machine** you engage, not a
thing you beat by hand — it composes `SwitchableMixin`
(`lib/boundary/Switchable.ts`) and `switch on stamper` beats whatever is in
its trough on the race's power (the grist mill's shape); and a book is an
**assembly raised from its parts** — `fit notebook` (the shipped raise arm,
`fit cask`'s precedent: leaves + boards + a glued spine on the row's bill,
glue drawn from the pot). No `beat`, no `bind`; nine new verbs, not
eleven. `show` was checked against every view and is free; `tear`, `seal`,
`couch`, `copy`, `compose`, `proof`, `print`, `distribute` likewise.

**D25. Persistence.** Sheets, books, cartons are ordinary goods: owned
ones ride their owner's snapshot; staged ones restage. `Sheet.markText` is
`persistent: false` on a **bound** sheet (overridden in the class's
`fieldMeta`; the binding persists, the text is read); an unbound sheet's
`markText` persists as any Marked thing's does. Editions, books and
receipts are `documents`. The case's `font`, the forme's record, the
stamper's hours are `persistent, runtimeState` on fixtures that persist by
their rows' choice (the print shop's and the mill's rows author
persistence — a named purpose: type is capital, a run in progress is work).
No new collection.

---

## ⭐⭐ Host placement

| new thing | host | what composing it claims about everything else on that host |
|---|---|---|
| `refreshMarks`, `teach` hooks | `MarkedMixin` | every marked thing may derive its marks and may teach; the default does nothing, and a signpost, a brick and a die answer the default — a hook with a no-op default claims nothing (the harbors precedent) |
| `markText` as stack identity | `MarkedMixin` fieldMeta | two written things with different words are different goods; a stamped brick and a plain one already split on `markDevice`, so the claim is already made for the device and is simply completed for the words |
| the ash read in `getMarkText` | `MarkedMixin` | only a host that is also `Combustible` with spent fuel answers it; every other host skips the branch (the `isWet` shape) |
| `seal`, `sealBroken` | `SealableMixin` | a door, chest, window, vat answer `seal: ''` and read nothing new; a bottle, barrel, strongbox are real second composers — **not** a separate mixin, argued in D11 |
| `edition` arm | `DisplaySource` | a screen may show a document live; the terminal's computed board and the house tablet's card are untouched |
| `canFetchAt(place)` | `DisplayMixin` | true for every screen today; the off-grid build gives the handset its coverage answer — a seam, not a claim |
| `Sheet` | new class `platform/thing/Sheet.ts` = `Tearable(Foldable(Stackable(Combustible(Thermal(Reserved(Moisture(Marked(Good))))))))` | a sheet is paper: wet, burnable, foldable, tearable, written, stackable blank; `Ticket extends Sheet`; `Wallpaper`, `FilterPaper`, `Label` are **rows** of it |
| `Book` | new class `platform/thing/Book.ts` = `Tearable(Combustible(Thermal(Reserved(Assembled(Marked(Good))))))` | a book is leaves and boards joined; `Spellbook` does **not** extend it (D15) |
| `RegisterBook` | `platform/thing/RegisterBook.ts` = `Marked(Good)`, fixed | harbors' class; one more field |
| `TearableMixin` | `Sheet`, `Book`, `Garment` | each answers yes; **not** on `Good` (a hammer does not tear) and not on `Thing` |
| `pulped` latch | `Sheet`, `Bag`, `Carton` (each reads it) | not on `Marked`, not on `Wet`: a slate is wet and never pulps |
| `pasteOn(sheet, glue)` | `FacedMixin` | any good with an outside may take a pasted sheet — true (a crate, a jar, a signboard); a building's inside too (D21) |
| `inside` face | `Building` only | a ship's hull and a bare `Structure` keep one face; a `Good`'s `inside` stays bulk's |
| `admittedAt(place)` | `ToolMixin` | every tool may be asked; a tool with `epoch: null` is admitted everywhere |
| `admitsEpochThrough` | zone field | read by the walk; unset = admit all |
| `bearer`, `editionPath` | `ReceiptTerms` / `StoreReceipt` | the ice houses author nothing and withdraw as today |
| `presentedBy` scan | `StoreMixin.withdraw` (bearer branch only) | a registered store never scans the pool |
| `printedAtS` | `TideAlmanac` (diving) | the almanac alone |
| `Combustible` + paper material | `Spellbook` (arcana) | both arcana rows |
| `Stamper`, `PulpVat`, `SizeTub` row, `Felt`, `Loft` rack row, `Pulp`, `Paper`/`Board`/`Size`/`FilterPaper` materials | `trade-papermaking` `src/thing/`, `idea/material/` | the mill's own |
| `TypeCase`, `TypeSort`, `Forme`, `Press`, `Printer`, `Pen`, `Woodblock`, `HandMould` row, `type-metal`/`antimony`/`iron-gall-ink`/`gum-arabic` materials | `trade-printing` | the shop's own; `antimony` + `gum-arabic` material rows in **base-library** (imported commodities the general store's distributor line sells — materials are a closed commons vocabulary) |

⭐ The guard test, applied: nothing above adds `if (!(this instanceof
Sheet))` anywhere. The two places a narrowing was tempting — a `Book` bound
to a register (D14, resolved by using `RegisterBook`) and `TamperSeal` as
its own mixin (D11, resolved by two fields on `Sealable` with real second
composers) — are decided in the text.

---

## Records audit — records are documents (harbors' rule, applied)

Every record this plan creates, against the four-question test
(targetable · behavior · runtime participant · invariants on the object;
none → a document). Verdicts; nothing failed, two were sharpened.

| record | where it lives | 1 targeted? | 2 behavior? | 3 participant? | 4 invariants? | verdict |
|---|---|---|---|---|---|---|
| the **edition** (`{source, pages, teaches?, validUntilS?, hash}`) | `edition` document at `<source>/editions/<hash>` | no — a sheet names it by path, no verb does | none | no | no | **document** ✓ (D2); written by the printing act through `freezeEdition`, the system-written shape; the pages are the truth passed in because the pages ARE what was set |
| the **notebook's pages** (`{pageCount, pages[]}`) | `book` document at `/home/<writer>/books/<id>` | no | none | no | no | **document** ✓ (D14); owner-scoped content under the parcel-title gate — the second shape, exactly |
| the **bearer receipt**'s `bearer`, `editionPath` | fields on the existing `warehouse-receipt` document | — | — | — | — | **document** ✓ (already was) |
| the **forme** (`{source, setText, debits, locked}`) | `Forme` (Stuff, `trade-printing`) | yes — `compose`/`proof`/`print`/`distribute` name it; `look` reads it | yes — seeds misprints by band; proof corrects | no | yes — refuses a glyph the case lacks; refuses `print` unlocked | **Stuff** — the fixture exception (tests 1, 2, 4) |
| the **case's font** (`Record<glyph, n>`) | `TypeCase` (Stuff) | yes — `put sorts in case`, `distribute … to case`, `look case` | the store's absorb | holds the sorts' matter (a `Holder`) | refuses a debit it cannot cover | **Stuff** — `Stockpile`'s shape (a count the fixture keeps of what it physically holds) |
| the **stamper's hours** + trough | `Stamper` (Stuff) | yes — `switch on`, `put rags in` | the beat over game-hours | a `Discharging` works the catalogue reads | — | **Stuff** — physical state of a machine, not a list about other things |
| `Book.missing[]` | field on `Book` | — | — | — | — | not a record: the gap IS the thing's state (a torn book), like `MineWarren.carved` |
| `Sheet.boundTo`, `.page`, `.folds`, `.cockled`, `.pulped` | fields on `Sheet` | — | — | — | — | not a record: one ref + physical state |
| `TideAlmanac.printedAtS` | field on the almanac | — | — | — | — | not a record: a stamp on a good |
| the **press's paper and ink** | `props:` contents of `Press` | — | — | — | — | not a record: contents |
| the **shop's copies** | `Stockpile` (shipped) + its counter line | yes (`buy`) | — | — | full / empty | **Stuff** — listed FINE in the scan already |
| the **ledger book** | `RegisterBook` — holds **nothing**; reads `list(prefix)` | yes (`read`, `print`) | derives a page | — | — | **Stuff with no record** ✓ — the tell (*a fixture named for the book holds nothing and forwards to an Idea that holds the record*) does **not** apply: there is no Idea; the records are the business's own documents and the book is a view |
| the mill's **rag stack** + receipts | `Stockpile` + `warehouse-receipt` documents (shipped) | yes | — | — | — | shipped shapes, unchanged |

⚠ Two sharpenings from the audit: (i) `TypeCase.font` must be a count of
sorts the case **physically holds** — the sorts are absorbed into it like
a store's face, never a parallel list beside loose sorts lying in it (*two
records of one fact*); (ii) `Forme.debits` is the case's own `font`
debit, not a second ledger — the forme records what it took and the case
is the one truth of what is left.

---

## Convention conformance

- `props:` / `cast:` designation — every new place row seats its fixtures
  with `props:`; the print shop's staff with `cast:`; no `container:`
  (refused by `lint:instanceable`).
- Locations, not rooms — new places are `Location`/`PersistentLocale` rows
  under the locality's pack (`hearts-delight/.../paper-mill/location/…`,
  `terminus/.../gazette/location/…`).
- Path pattern — kernel classes at `/platform/thing/<Name>`; pack classes
  at `/trade/papermaking/thing/<Name>`, `/trade/printing/thing/<Name>`;
  materials at `<root>/idea/material/<key>`; Disciplines at
  `<root>/idea/Discipline/<key>`; Joint rows at `<root>/idea/Joint/<key>`;
  views at `<root>/cmd/<category>/<verb>.yaml` with controllers at
  `<root>/idea/cmd/<category>/<Name>Controller`.
- Module scope declares; lifecycles initialize — no module-scope
  statements; `JointCatalogue`-style reads are on first use.
- Import boundary — packs import the kernel by `@saxonberg/server/mud/…`
  only; `trade-papermaking` imports water's `ControlStructure` by package
  specifier and declares `@saxonberg/content-water`; `trade-printing`
  declares `trade-smelting`, `trade-painting`, `trade-papermaking`.
- Verbs on objects — `sheet.tear(by)`, `forme.compose(doc, case, by)`,
  `press.pull(forme, n, by)`, `store.withdraw(...)`, `building.pasteOn(...)`;
  no `XApi.verb(host, …)`; `lint:object-verbs` stays at 0.
- Persistence per content (P6) — the mill's and shop's fixtures author
  `persistent` rows with the purpose in the row comment; a sheet is a
  good; editions/books/receipts are documents; the almanac's stamp rides
  the good.
- **P3 refuse/skip/throw** — every verb returns its refusal in words
  (`controller-rejected` + reason): `bleeds`, `no-ink`, `no-room`,
  `case-short:<glyph>`, `covenant-refuses`, `not-bound`, `already-settled`,
  `no-receipt`, `seal-broken`, `will-not-fold-again`, `not-a-page`,
  `not-yours-to-write-in`; `pagesOf` answering `null` is a **skip** the verb
  words (*"that is not something that reads as a page"*); an unknown kind
  reaching the switch is a compile error; `freezeEdition` on a missing
  source **throws** (`TypeError`, checked by the caller first).
- **P4 no duck typing** — the stamper imports `ControlStructure`; the
  register book imports `DocumentApi`; nothing `?.()`s a name it does not
  import. ⚠ `GristMill.powerTake`'s `typeof duck.generationW` is existing
  debt, not copied.
- **P5 mixin decides** — `Sheet.writeOn` decides ink/size/room;
  `Forme.compose` decides the case shortfall and the misprints;
  `Store.withdraw` decides the bearer presentation; controllers bind args
  and render.
- **P7 load on use** — editions are read by path from the sheet's binding;
  the case's font is on the case; the Joint rows load on first use as
  today; **no boot entry** of any kind; the `print-shop` business and the
  mill business are stood up by their packs' `requires` as every business
  is.
- **P8 names** — `Sheet`, `Book`, `Stamper`, `PulpVat`, `TypeCase`,
  `TypeSort`, `Forme`, `Press`, `Printer`, `Pen`, `Woodblock`: nouns for
  what they are; `TearableMixin` is the one adjective and it is a mixin;
  `print` not `press`, `copy` not `cp`, `show` not `display`; `fit` not
  `bind`, `switch on` not `beat` (D26).
- American English throughout (`color`, `mold` in prose; the shipped
  `MouldMixin` identifier is referenced as is).
- Lint gates this build must pass (all of `lint:family`; the ones it will
  exercise): `lint:instanceable` (two new kernel classes, two pack `src/`
  trees), `lint:mixin-names` (`Tearable` added to `Mixins`),
  `lint:pack-extends` (every cross-pack row reference has its dependency
  line), `lint:verb-collisions` (nine new verbs, all grepped free at plan
  time; `beat` and `bind` were taken and are not added — D26),
  `lint:reachability` (every
  object arg's `requires`, the article shape on `page 3 of notebook` → the
  `page` arg is a number, the book is the greedy object), `lint:arg-kinds`,
  `lint:controller-rows` (an Idea stub per controller),
  `lint:closed-vocabularies` (`EPOCHS`, `SEALS`), `lint:schema` (no
  collection change — must stay green), `lint:untitled` (the two trade
  roots claimed by `/compact/trade`), `lint:counters` (the mill's and
  shop's counters), `lint:bills` (the pasteboard, carton, bag and book
  bills name real parts and joints), `lint:object-verbs`, `lint:lib-statics`
  (no new value statics in `lib/`), `lint:imports`, `lint:module-scope`,
  `lint:test-bootstrap`, `lint:drive-scripts`, `lint:perishable` (paper is
  not a Provision — must not trip), `lint:water-citations` (the stamper's
  discharge row cites its reach).

---

## Waves

Every wave lands at a commit, with `pnpm test:near` + the touched packs'
vitest + `lint:family` green. `pnpm test` runs once at code-complete and
once at `/finalize`.

### W0 — the medium (kernel): marks derive, documents freeze, paper exists
*Decisions D1–D4, D6, D10–D13, D22, D25.*

- `Marked.ts`: `refreshMarks` + `teach` hooks (D1; harbors' text verbatim
  for the first); `markText: stackIdentity: true`; the ash read (D12).
- `ReadController.ts`: `await target.refreshMarks(giver)` before Perceive
  (harbors' line, same place); `takeAnyChart` → `await target.teach(giver)`
  after the working; `Chart.ts` overrides `teach` with the moved body.
- `DocumentKinds.ts`: `edition`, `book` (both `naturalKey: null`,
  `onVanish: 'keep'`, `contentDir: editions` / `books`); fix the stale hand
  copy in `scripts/check-untitled-paths.ts` while there.
- `DocumentLogic.ts` / `document.ts`: `pagesOf(path): Promise<DocumentPages
  | null>` (D4, exhaustive), `freezeEdition(req)` (D2; path pinned, kind
  pinned, owner derived, idempotent by hash; throws on a missing source).
- `lib/material/Tearable.ts` (`TearableMixin`, `Mixins.Tearable`,
  `MixinApi.isTearable`), `tear.yaml` (inventory; `thing` greedy object
  `requires: TearableMixin`, optional `page` number with prep `page`… —
  shape: `tear [page <n> from] <thing>`), `TearController` (dumb).
- `Sealable.ts`: `seal`, `sealBroken`, `SEALS` vocabulary, the presence
  augmenter (D11); `seal.yaml` (inventory; `thing requires: SealableMixin`,
  optional `with <wax|gum>` object `requires: TangibleMixin`),
  `SealController`; `OpenController` unchanged (the mixin's `open()`
  breaks the seal).
- `platform/thing/Sheet.ts` (D10, D12, D13; `format()`, `writeOn` override:
  ink + size + bleeds; `refreshMarks` reads the edition; `teach` mints the
  edition's `teaches` claims through `PersonaMixin.recordChronicleOnce`);
  `platform/thing/Book.ts` (D14; the `book` document; `write … on page <n>
  of <book>` — `write.yaml` gains an optional `page` number arg before the
  surface, `WriteOnController` passes it; `read.yaml` gains the same);
  rows `/platform/thing/{sheet,book}` in the platform pack (material
  `/stuff/idea/material/paper`, which this wave adds to **base-library**
  with `board`, `pulp`, `ash` cross-checked present).
- `Tooled.ts`: `admittedAt(place)`; `Zone` field `admitsEpochThrough`
  (D22).
- `Ticket.ts` → `extends Sheet`; row gains paper.
- Tests: `Marked.refresh.test.ts`, `Sheet.test.ts` (fold ladder, tear
  halves, pulp latch, burn → ash read, stack split on write, bleeds vs
  sized), `Book.test.ts` (write page, read page, tear page, borrower
  refused), `DocumentLogic.edition.test.ts` (idempotent hash; every kind's
  arm), `Sealable.seal.test.ts`, `Tooled.covenant.test.ts`.
- Commit: `build(paper W0): the medium — derived marks, frozen editions,
  the sheet, the book, the seal, tearing`.

✅ **W0 done — `59ad19fc8`.** Notes for the reader who has forgotten:
- **D27 (build):** the page rides as a trailing `page <n>` on `read`,
  `write` and `tear` (`read notebook page 3`, `write … on notebook page 3`,
  `tear notebook page 3`) — the binder's prepositional-arg shape; the
  plan's `page 3 of notebook` needs a grammar the binder does not have.
  ⚠ Cost: `page` now stops `write`'s greedy words, so the word *page* in
  a sentence wants quoting.
- **D28 (build):** a notebook's page is written by `Book.writePage`
  (async — the document save), called by `WriteOnController` when the
  surface is a `Book`; `Marked.writeOn` stays sync for every other host.
  The book's document key is a minted `bookKey` (a chattel id is empty on
  an unowned good).
- **D29 (build):** `Envelope` is a **kernel** class (`platform/thing/Envelope.ts`),
  not W3's pack class — `seal` needed a conferrer to pass `lint:reachability`
  in this wave, and a letter in an envelope is the medium, not the mill's
  trade. Shut, it vetoes in and out (`canAdd/RemoveContainable`).
- **D30 (build):** `Display.canFetchAt` was **not** shipped — a hook nobody
  overrides tripped `lint:unconsumed-seams`; the coverage seam is a
  comment at the document arm for the off-grid build (R1).
- The ink/known-of helpers are **protected methods on `MarkedMixin`**
  (`inkInHand`, `spendInk`, `teachRecipes`), not statics on `Sheet` —
  `lint:lib-statics` holds at 341.
- A lit screen is read with **no light gate** (it is its own light).
- `pulpTemplate` (authored on the sheet rows) names the lump a soaked
  sheet leaves; classified a faucet in `check-reachability`/`check-template-census`.
- Stationery (sheet, ream, envelope, notebook) is on the **general
  store**'s counter so the rows are reachable before the print shop
  exists; the print shop sells its own in W5.
- ⚠ `lint:water-citations` failed inside one `lint:family` run and passed
  alone — not paper's (flaky under the family's concurrency).
- ⚠ `NODE_OPTIONS` carries a VS Code debugger bootloader in this shell;
  run gates with `NODE_OPTIONS=` or they hang at *"Debugger listening"*.

**D42 (owner, 2026-11-04) — nothing in paper contradicts the recipes
design** ([recipes-slate](../slates/builds/recipes-slate.md), MR !522). The
notebook's keyword scan (a handwritten page that mentioned a recipe's keyword
taught *known-of*) is **removed** — a guess with false positives that
pre-empted the slate's "your own recipe in your book". A **printed** recipe
still gives *known-of*, which the slate keeps as recognition. The known-of line
no longer says "work it by hand to learn it" (the old ladder the slate
replaces): it says *you know of X now*. The requirements' AC "the borrower
reads → known-of" and drive step 17's matching clause are retired with this.

**D43 (owner, 2026-11-04) — paper fails in water by its MATERIAL, not by
product class.** The build had shipped the pulp latch twice (`Sheet`,
`Packet`) and not at all on `Book`, `Envelope`, `Spellbook` — a soaked
notebook survived. Moved onto `Integrity`, the shipped home of "the material
decides how a good fails" (the impact rule's wet twin): `Material.wetStrength`
(share of dry strength kept wet; `null` = water does not break it) and
`Material.soddenTemplate` (the residue); paper and board author 0.1 and
`/stuff/thing/pulp`. `Integrity.afterWetted` latches `sodden` past the
`soaked` band and destroys on the next tick; a container spills by the
shipped rule. `Wet` gained the `afterWetted` hook. ⭐ **No `PaperGoodsMixin`**:
"made of paper" is a material; tearing stays a protocol each thing
implements. Sheet's `pulped`/`pulpTemplate` and Packet's latch retired.

**D44 (owner, 2026-11-04) — a book is its leaves; borrowers can write.**
The notebook's pages had been a `book` document under the first writer's
home, which made a lent notebook read-only to the borrower and put the words
somewhere other than the paper. Replaced: `Book` keeps `leaves` — one record
per leaf (`passages[]` each with the writer's `hand`, or `boundTo` + `page`
for a printed leaf, and `torn`); the assembly record carries the physical
set. **Anyone holding the book writes**; each passage records whose hand,
and `read` renders hands as the viewer knows the writer (the device-mark
rule: *your hand* · *X's hand* · *a hand you do not know*). Tearing a page
out moves the leaf's state into the loose `Sheet` (its words, or its edition
page via `bindTo`). ⛔ The **`book` document kind is retired** (no data to
migrate — dev only), and `pagesOf` no longer reads it. `missing`,
`document`, `edition`, `bookKey` fields are gone; `sizedLeaves` is new.
Drive step 17 now has the borrower write (in their own hand); step 21 prints
the Gazette instead of the notebook (a notebook has no document to print).
Binding (`fit`) stays deferred.

**D45 (owner, 2026-11-05) — an institution's records are documents; the
book on the desk is their page. Cleanup after harbors merged (harbors
shipped, so reconciliation is this build's).** Two places harbors and paper
disagreed:
1. **`RegisterBook` is one view class.** The merge had left it branching on
   `government:` (harbors' ship register) vs `registerPrefix:` (paper's
   ledger). Now it reads only a prefix (`/platform/ships/terminus-city` for
   the register of ships), and **what a line says is the record's kind**: a
   `ship` entry is read through its flag's register (`entryNamed`, followed
   forward) and rendered as harbors' full line; anything else as kind, leaf
   and title. `government` is gone; `registerTitle` heads the page (*The
   register of ships of the City of Terminus.* / *The book of the Terminus
   Gazette.*). A third register is rows only.
2. **The berth book's record is filed.** Harbors kept berths, debts and
   hails as fields on a persistable `HarborBook`, so burning the book would
   have forgiven every debt, and the record could never move to a screen
   (lens 5) or be `read` (lens 3a). Now `Harbor` is a `Registrar` of its own
   branch and files one `berth-book` document (new kind) at
   `<prefix>/record` through `saveToRegister`, gated to its own book; the
   book is `Marked(Payable(Good))`, loads the record on use and writes
   through. Harbors' review-2 rule ("the harbor keeps only its rules")
   holds — the harbor still holds no state. Both harbor rows author the
   three registrar fields.
The berth book's keywords stay (`book` is what a harbormaster's book is
called; resolution prefers what is in reach).

**D46 (owner, 2026-11-05) — a sheet is a leaf; a torn page is the leaf
whole, still its owner's.** From the phone-book scene (slate § 12). Four
pieces, the rest slated:
1. **Title (a bug):** `Book.tear`, `Sheet.tear`'s second half and
   `Garment`'s rags cloned with no `madeFrom`, so the chattel rule fell to
   the next rung and the TEARER got title — tearing laundered ownership.
   All three now pass `madeFrom`: a page torn from the diner's book is the
   diner's, in your pocket.
2. **A sheet is a leaf:** `Sheet.passages` (each with its hand), the same
   record a book's leaf keeps. `Marked` gained the `Passage` type,
   `handFor` and `passagesFor` (moved from `Book`), and the `readFor(viewer)`
   hook — the marks as THIS reader reads them; `read` uses it. The stored
   text stays the words alone (stack identity); `Sheet.canMergeWith` keeps
   the same words in different hands apart (stack identity compares
   scalars). Tearing a handwritten leaf out moves its passages whole; a
   sheet torn in two splits between passages, each half keeping its hands.
3. **A torn-out page says what it is:** `Sheet.tornFrom` — *It is a page
   torn from the city directory; one edge is ragged* — and answers to
   `page`; it lands in the hand that tore it (a chained book included). A
   look at the book names the stubs.
4. **A row authors a printed book:** `Book.edition` (`seed: true` →
   `seedEdition`, mint only) binds the leaves to an edition document a pack
   ships (`content/editions/`). The Gazette's counter has the Terminus
   Directory, chained (`world/terminus/gazette/thing/directory.yaml`,
   edition `/world/terminus/editions/terminus-directory`). Drive step 35
   is the scene. `lint:census` ignores `edition` (a document path).

**D47 (owner, 2026-11-05) — printing is a placeholder; it gets its own
slate and build.** The owner had no design discussion on printing, and the
build's printing (`trade-printing`, W4–W5) is instant end to end. Framing
from the owner: text is the platform's primitive, so "printing makes
copies of text" is worth nothing — what is special is what PAPER adds to
text (a thing · frozen · marked by its making · reaching past the network;
now the head of `paper.md`) and what copying a thing costs (the
fixed-vs-marginal curve). The placeholder stays in this MR, labelled; the
new [printing-slate](../slates/builds/printing-slate.md) records the forks
the lenses decided (labor takes time — lens 1; misprints stay, the document
never altered — lens 1, lens 2 satisfied; images are half of printing —
lens 2; continuity of `print` across press, printer, screen — lens 5) and
the open one (what a printed page LOOKS like in a game of text — lens 3a;
where an image comes from — lens 4).

### W1 — the live rung, bearer paper, the register book
*Decisions D5, D7, D8.*

- `Display.ts`: `document` source arm; `readScreen` default renders it via
  `pagesOf` live; `canFetchAt(place)` (true). `read.yaml` + `ReadController`
  take a Display target (D5). `show.yaml` (`show <what> on <screen>`,
  category perception; `what` is a **string** resolved by the controller
  against the reader's visible releases (headline word match, the
  `store withdraw` matching shape), their own `/home` papers and their
  house's papers; `screen requires: DisplayMixin` or implicit via
  `resolveScreen`), `ShowController`. A handset row in **generic-objects**
  `/stuff/thing/handset` (`/platform/thing/Tablet`, `pairing: held`,
  `shows: [prose]`) so the drive has a phone-shaped screen; nothing gives
  it to players — that is the off-grid build's (R1).
- `Receipt.ts`: `ReceiptTerms.bearer`, `StoreReceipt.editionPath`;
  `Store.ts`: bearer deposit mints + binds a sheet from the book's blank
  stock (refused in words when the book has no paper: *"the keeper has no
  paper left for a receipt"*), bearer withdraw presents from the pool
  (D8); `StoreBook.ts`: `paperStock` (a `props:` ream on the book row —
  the depot's book row gains `props: [/platform/thing/ream]`; `ream` is a
  `sheet` row with `quantity: 480`). `trade-haulage`'s warehouse row
  authors `bearer: true`; `depot-book.yaml` gets its ream.
- `platform/thing/RegisterBook.ts` with `registerPrefix` (D7); `print
  <book>` is W5's (the press); W1 proves `read` of the live page.
- Tests: `Display.document.test.ts`, `Store.bearer.test.ts` (hand-over,
  depositor refused, spent refused and kept, unbound copy refused),
  `RegisterBook.test.ts`.
- Commit: `build(paper W1): one read on sheet and screen; the bearer
  receipt; the register book`.

✅ **W1 done — `034efcf66`.**
- **D31 (build):** the receipt's paper is minted from the store's authored
  `receiptPaper` row (the depot's: `/platform/thing/sheet`), not drawn off
  a ream on the book — `StoreBook` holds nothing and gaining a container
  would have made it a second record of paper. The *"no paper left"*
  refusal is therefore not shipped.
- **D32 (build):** **no handset row.** A phone-shaped screen nobody can get
  is a dead row (`lint:reachability`); the live rung is driven on the
  Gazette's open **reading screen** (W5). The handset is the off-grid
  build's (R1).
- A bearer depositor is `bearer:<id>` (each receipt its own claim — the
  paper conveys it, so deposits never merge); the presenter's sheets are
  scanned in hand and one wrapper down, never through a seal.
- A settled receipt is read off the book directly (`allClaims` drops
  settled ones), so *"already settled"* and *"no receipt"* are told apart.
- `show`'s document rule became **`DocumentApi.callUp(reader, word)`** in
  W5 so `compose` and `print` share it.
- ⚠ The W1 commit also carried the staged `Rag` rename (a `git mv` index
  entry); W1 alone has the rag half-moved — W2–W3 completes it.

### W2 — the mill (`trade-papermaking` + Heart's Delight)
*Decisions D9, D19 (size), D23, D24.*

- Pack skeleton (`pack.yaml` root `/trade/papermaking`, title held by
  `/compact/trade`; `package.json` deps: platform, base-library,
  generic-objects, water, trade-painting, trade-milling, trade-tailoring?
  (only if a row is named — check), trade-shopkeeping).
- `src/thing/Stamper.ts` (`SwitchableMixin` — D26; `powerFrom` like
  `GristMill`; `switch on stamper` beats the retted rags in its trough into
  `pulp` bulk in the vat it feeds over game-hours at a rate set by the
  race's power; hours of beating as state; a works row at the flats,
  `Discharging` — D9);
  `src/thing/PulpVat.ts` (`DipBathMixin(CraftVessel)`: `dipPlanFor` charges
  a `paper-mould` with `paperMould.sheetLitres` of pulp; refuses a
  non-mould target in words); the **paper mould** is a `/platform/thing/Mould`
  row (`castTemplate: /trade/papermaking/thing/sheet`,
  `interiorCapacity`); the `pulp` material's `drainSetting {days: 0.002,
  becomes: paper, …}` so the mould sets a wet `Sheet` by the shipped drain
  set, draining into the vat it stands over; `couch.yaml` + `CouchController`
  (`couch <mould> on <felt>`): the mould's `pressRelease()` lands the
  sheet `on` the felt (a `/platform/thing/Felt` PlacingMixin row — the
  post is the stack of sheets on the felt); `ScrewPress.turnBy` gains one
  arm: `Moist` items on the bed reconcile under load (the sheet's
  `reconcileMoisture` reads `bearingLoadN`; pressed → no `cockled`); the
  loft is a **room** (`paper-mill/location/loft.yaml`, high airflow) with a
  `DryingRack` row (`dry sheet on lines`); a sheet dried unpressed records
  `cockled: true`; the size tub is a `GlazeTub` row with the `size`
  material (`laysCoat`, `sets: drying`, `coatWord: sized`).
- `Rag` to the kernel + `/stuff/thing/rag` (D23); `Garment` composes
  `Tearable`; the mill's rag counter (`buys: true` line, store-fed stack
  with `acceptsPoolKeys: ['rag|clean']`; `Rag.poolKey()` by oil — D24;
  `Rag` composes `PoolableMixin`); the retting vat is a `MaturingMixin`
  vessel row with a `retting` `MaturationProfile` (rags → retted rags over
  days — the span; the staged twin sets the profile's progress by wizard
  `eval`).
- Color and grade: `Sheet.gradeWords()` — weight (mass/area band),
  evenness (vatman's `papermaking` band at the dip, stamped on the sheet
  by `dipPlanFor`), color (D9: the vat's water read at the charge),
  sizing (the coat). `look` prints them (a `markupAugmenter` on `Sheet`).
- Discipline `papermaking.yaml`; the mill rooms at Heart's Delight
  (`hearts-delight/.../paper-mill/location/{door,vat-house,loft}.yaml`,
  `paper-mill/idea/business.yaml`, the vatman `cast:`), the millsite exit;
  the mill's **leat** (`paper-mill/thing/leat.yaml`, a
  `/platform/thing/WaterFixture` row cut off the flats — the tannery
  leat's shape; the vat is filled from it, and it is the row water supply's
  `natural: true` lands on); the pack's title claim for
  `/world/terminus/hearts-delight/paper-mill` (`landUse: industrial`,
  `powerBand: off-grid`); wiki guide `paper.md`. The rag counter's buying
  line rides master's shipped `Stock.buys` (`lib/retail/Stock.ts:104`,
  `SellController.ts`) — on harbors `buy`'s side becomes `ForSale`, the
  house-buys side is unchanged.
- Tests: `Stamper.test.ts` (power from the race; short share → slower;
  fouling load with hours), `PulpVat.test.ts` (dip → mould charged → sheet
  set; brown on persistent contamination), `Sheet.grade.test.ts`,
  `Rag.pool.test.ts`.
- Commit: `build(paper W2): the mill at Heart's Delight — rags to sized
  sheets, white or brown by the water`.

✅ **W2 done (with W3) — `536b74dfa`.** Re-planned in place, the simplest
true forms, each recorded:
- **D33:** the dip **forms the sheet directly** on the mould's wire
  (`PulpVat.dipPlanFor` → `Sheet.formAt`), not through `Mould`'s drain
  set — the drain set casts from a pool on a load, which a sheet lifted
  in a second does not have.
- **D34:** **the post is the press bed** — `couch mould` lands the sheet ON
  the press (the view's default binds the turnable in reach); the felt is
  prose on the press row, not a separate `Placing` row. The press's new
  arm squeezes `Sheet`s on its bed (`pressOut`): pressed → dries flat;
  formed and dried unpressed → `isCockled()` (derived, no hook).
- **D35:** the stamper is **not** a `Discharging` works yet — the fouling
  (soak 4) is deferred with retting; the color reads the reach's
  persistent load through `WatercourseCatalogue.contaminationAt`
  (imported, the water pack declared). **Retting** (drive 3, soak 1) is
  deferred: the stamper beats clean rags as bought.
- The mill buys rags through the shipped `buys: true` line; a paint rag is
  a different row (D24, no pool key needed).
- ⚠ The dip does not credit `papermaking` (no act-plan discipline seam).

### W3 — paper goods, glue, wallpaper (`trade-papermaking` + kernel seams)
*Decisions D19 (paste), D20, D21.*

- `Faced.pasteOn(sheet, glueVessel)` (kernel); `FitController`'s paste arm;
  `HangController`'s inside-face arm; `Building.faces()` inside + the room-
  air walk for inside coats (`airCoats` with the member rooms' humidity).
- Rows: `pasteboard` recipe + `/trade/papermaking/thing/pasteboard`
  (bill); `carton` (`/platform/thing/Crate`, board, seam joint, Tearable
  via a thin pack class `Carton extends Tearable(Crate)` — the one pack
  class the goods need, since `Crate` is kernel and composes no `Tearable`;
  same for `Bag extends Tearable(Sack)`); `envelope` (`Holder` + `Sealable`,
  paper: pack class `Envelope`); `filter-paper` (a `sheet` row whose
  material `filteredTo` is finer than cloth; a `funnel` row of
  generic-objects' porous-vessel shape so `pour X into funnel` seeps
  through — see § Risks R3); `wallpaper` (a `sheet` row, large, `hang`able
  by D21); `label` (a small `sheet` row); `bag`/`carton` pulp + tear →
  destruct → spill (`cleanupOnDestruct`).
- Tests: `Faced.paste.test.ts` (paste lets go wet, casein holds),
  `Building.inside.test.ts` (papered, peels in a damp room),
  `Carton.test.ts` (soaked → spills; torn → spills).
- Commit: `build(paper W3): board, cartons and bags; the pasted label; the
  papered wall`.

✅ **W3 done (with W2) — `536b74dfa`.**
- **D36:** a **label is pasted with `fit`** — but `fit.yaml`'s `whole`
  required `AssembledMixin` and `tool` `ToolMixin`, so the plan's arm
  would have died at the binder; both gates widened
  (`AssembledMixin|FacedMixin`, `ToolMixin|BulkableMixin`).
- **D37:** the damp is read on a **wet host** (`releaseDampGlue`, the `wet`
  band) for any glue whose `resistsDamp` < 0.5; a pasted label reads on
  `look` of any good.
- **D38:** one class `Packet` for the bag and the carton (identical
  behavior; `Carton`/`Bag` would be two names for one thing).
- **Deferred:** wallpaper and `Building`'s inside face (R4 — the owner's
  call on walls); pasteboard from glued plies and bag/carton **bills**
  (they are sold made, at the mill); filter paper (R3).

### W4 — inks, parchment, type (`trade-printing` + tanning + base-library)
*Decisions D17 (type), D18.*

- `trade-printing` skeleton (root `/trade/printing`); materials
  `iron-gall-ink`, `printing-ink` (a paint row: lampblack in boiled
  linseed), `type-metal` (alloy lead/tin/antimony), `antimony` and
  `gum-arabic` in base-library (imports: the general store's distributor
  line sells both); recipes `iron-gall-ink` (galls steeped → tannin — the
  span; staged twin), `type-metal` (the crucible, the shipped `cast-bar`
  shape, `discipline: founding`); `hand-mould` (`/platform/thing/Mould`
  row, `castTemplate: /trade/printing/thing/sort`, `discipline: founding`);
  `src/thing/TypeSort.ts` (`Stackable`, `glyph` stackIdentity),
  `src/thing/TypeCase.ts` (`Holder`; `font: Record<glyph, n>` persistent;
  absorbs sorts put in it — the store's face shape, light), `Pen`
  (`Tool`, `epoch: medieval`, holds a charge of ink from `dip pen in ink`),
  `Woodblock` (`Carvable` plan: `carve <image> on block` → a relief block
  whose `markText` is the image's caption and whose `markForm` is
  `embossed`).
- Parchment on tanning: `lime-pit` maturation row (`liming` profile — the
  span; staged twin), `parchment` material + recipe through tanning's
  shipped scraping act (⚠ build verifies `trade-tanning`'s verbs; if there
  is no scrape, the parchment is the by-hand build `stretch`-less: a recipe
  over `tan`'s inputs with `discipline: tanning` and no new verb — recorded
  on the MR); `parchment-parings` → the glue pot (size).
- Tests: `TypeCase.test.ts` (absorb, debit, short glyph named),
  `Pen.test.ts`, the alloy row via the smelting suite's pattern.
- Commit: `build(paper W4): inks, parchment, type metal and the case`.

✅ **W4 done (with W5) — `cc3a3720e`.**
- Inks are rows (ink pots sold at the general store and stocked at the
  Gazette). **Deferred:** the iron-gall recipe and its steeping span
  (soak 2), type metal, the hand mould and casting sorts (drive 22),
  parchment (R6, drive 12), the woodblock (drive 29).

### W5 — the press, the printer, the copy ladder, the print shop
*Decisions D3, D16, D17, D22.*

- `src/thing/Forme.ts` (D17), `src/thing/Press.ts` (`Tool`-stamped
  `industrial`; `paperStock` as `props:` ream; `pull(forme, n, by)`
  consumes sheets + ink; mints `Sheet`s bound to the frozen edition;
  credits `printing`), `src/thing/Printer.ts` (`modern`; `print <document>
  on printer` freezes the document's current render — the forme-less arm),
  verbs `compose`, `proof`, `print`, `distribute`, `copy` under
  `/trade/printing/cmd/printing/` + controllers; `copy <sheet> onto <blank>
  with <pen>`: the pen's covenant check, the copyist's `printing` band →
  seeded substitutions (grain: the copyist reads `printing` — flagged);
  `print` on a `RegisterBook` → the extract (D7).
- The print shop at Terminus: `terminus/.../gazette/location/{shop,
  counter}.yaml` (the Gazette's house: `props:` press, case, hand mould,
  forme, ink pot, ream, the ledger `RegisterBook`, a `Stockpile` of copies
  + the counter's store-fed line selling `/trade/printing/thing/gazette`… —
  the copies are `Sheet`s pooled by `poolKey = edition|<hash>` (`Sheet`
  composes `PoolableMixin`: a bound sheet pools by its edition, a blank by
  `sheet|blank`, a written one never); Hesper's row gains the shop as her
  home; the shop's `print-shop` business (`cast:` a pressman) with
  `printing` in its positions; the counter sells copies at a price the row
  authors. The counter is a shipped `Stock` row with a store-fed line
  (`from: { store }`): on master it sells through `BuyController`'s
  shipped path, on harbors through `ForSaleMixin` (which `Stock`
  implements) — paper writes **no retail code**, so it rides whichever is
  on master. The shop's title claim (`/world/terminus/gazette`, `landUse:
  commercial`) goes in the terminus pack's `pack.yaml`; when water supply
  lands it cites the city intake as every Terminus premises does
  (§ Reconciliation).
- `TideAlmanac.printedAtS` (D16); the diving counter's almanac row.
- Discipline `printing.yaml`; wiki guide `print.md`.
- Tests: `Forme.test.ts` (compose debits; short glyph refused; seeded
  misprints are deterministic; proof finds a share and corrects it; after
  distribute the case is whole), `Press.test.ts` (n copies consume n
  sheets + ink; the edition is the set text; a second print of the same
  forme reuses the edition), `Printer.test.ts` (covenant refusal names the
  covenant; the printed sheet reads the live text frozen), `Copy.test.ts`,
  `TideAlmanac.year.test.ts`.
- Commit: `build(paper W5): the press, the printer and the pen; the Gazette
  has a house`.

✅ **W5 done (with W4) — `cc3a3720e`.**
- **D39:** the forme names its case by path (`casePath`) and follows it on
  use — no hunting a room for type.
- **D40:** `print <what> [n] [on <tool>]` binds the instrument by the
  view's default (`ToolMixin`); a forme goes to the press, a ledger's page
  or a document to the printer.
- **D41:** the copyist reads `printing` (the plan's grain; a `scribing`
  Discipline is a row away).
- The Gazette's shop is a `Locale` off Mayfield Row (the land agents'
  shape), titled to the city like realty; its ledger reads the Gazette's
  **feed** (`registerPrefix: …/gazette/feed`).
- **Deferred:** the shop's counter selling copies (drive 28 — a printed
  copy can be consigned on any shelf), the tide almanac's year (D16, soak
  5), Hesper's home.

### W6 — binding, the notebook, spellbooks
*Decisions D14, D15.*

- **No `bind` verb** (D26): the book is raised by the shipped `fit
  notebook` / `fit book` — a recipe whose output row carries the bill
  (leaves: folded sheets of one format, count = their number; boards: 2
  pasteboard; joints: `spine` `glued` → hide glue drawn from the pot by the
  raise arm, so `salvage`/steam reads the glue), the `notebook` and
  `printed-book` rows (a printed book's edition is the leaves' bound
  edition; a notebook is blank leaves). The recipes live in
  `trade-printing/content/recipes/`; the gather must accept bound sheets as
  the `leaf` part (the pick's *"a thing that IS that part"* rule — a sheet
  row is the part).
- `Spellbook` composes `Combustible(Thermal(Reserved(…)))`; the two
  arcane-library rows gain paper and `charMaterialPath` (D15).
- Tests: `Bind.test.ts`, `Book.notebook.test.ts` (end to end over the wire
  harness is W7's), arcana's `Spellbook.test.ts` gains *burns*.
- Commit: `build(paper W6): binding; the notebook; spellbooks burn`.

✅ **W6 done — `f714ae962`.** Spellbooks are paper and burn. **Deferred:**
`fit notebook` from folded sheets and boards (the notebook is sold made;
its bill needs the pasteboard bill W3 deferred).

### W7 — the drive, the walk, docs
- `packages/wire/tests/paper.dirty.wire.test.ts` (blocking, 39 steps
  below) + `paper.soak.dirty.wire.test.ts` (5 span steps);
  `e2e/tests/paper-walk.spec.ts` (B3).
- `docs/subsystems/paper.md` (new; the medium + the mill + the press),
  one-paragraph updates to `display.md` (one `read`), `document-store.md`
  (`edition`, `book`, the fifth transport), `storage.md` (bearer),
  `press.md` (the print run), `faces.md` (`pasteOn`, the inside face),
  `assembly.md` (the book's bill), `spatial.md` (the seal), `crafting.md`
  (the epoch covenant reader) — the sweep adds the CLAUDE.md map line.
- Commit: `drive(paper): what the blocking drive found` + `docs(paper): …`.

---

## Reachability wiring

Each new capability, the five links. A link not listed is one the build
owes before the drive can pass.

| capability | verb (view) | affordance (a static on a class) | data (row) | load (followed from) | arg gate (`requires`) |
|---|---|---|---|---|---|
| read a sheet | `read` (shipped) | `Marked.commandContributions` | `/platform/thing/sheet` | the sheet's `boundTo` → `DocumentApi.read` | `[VisibleMixin, MarkedMixin\|DisplayMixin]` |
| read a screen | `read` | `Tablet`/`TpaTerminal` gain `peers/environment: read.yaml` (⚠ today a display affords only `look`) | handset row | `_showing.document` → `pagesOf` | as above |
| show a document on a screen | `show` (new, perception) | `DisplayMixin.commandContributions` (`peers`, `environment`, `inventory`) | handset, house tablet | the release feed by `Release.publishedByOwner`; `/home/<key>` by prefix | `screen requires: DisplayMixin` |
| write on paper / a page | `write` (shipped, + `page`) | `Marked` | sheet, book | — | `surface requires: [MarkedMixin]` |
| tear | `tear` (new, inventory) | `TearableMixin.commandContributions` (`inventory`, `environment`) | sheet, book, garment | — | `thing requires: TearableMixin` |
| fold | `fold`/`unfold` (shipped) | `FoldableMixin` | sheet | — | `FoldableMixin` |
| seal / open | `seal` (new, inventory); `open` (shipped) | `Envelope` statics name `seal.yaml`; `open.yaml` is afforded as today | envelope | — | `thing requires: SealableMixin` |
| bearer receipt | `store deposit/withdraw` (shipped) | `StoreBook` | depot book + its ream; warehouse row `bearer: true` | the receipt's `editionPath` from the sheet in the pool | `[StoreBookMixin]` |
| ledger book | `read` | `Marked` | `RegisterBook` row at the shop | `registerPrefix` → `list` | as read |
| sell rags | `sell` (shipped) | the counter | the mill counter's buying line + stack | — | shipped |
| beat the rags | `switch on` (shipped, device) | `SwitchableMixin` (shipped) | stamper row, works at the flats | `powerFrom` → the race | `SwitchableMixin` (shipped) |
| dip the mould / size a sheet | `dip` (shipped) | the BATH: `PulpVat` and the size `GlazeTub` row | vat, tub, mould, size material | `drainSetting` on `pulp` | `DipBathMixin` on the bath |
| couch | `couch` (new) | `PulpVat`? no — the **mould** affords it (`environment`); the paper mould row names a thin class `PaperMould extends Mould` so the static has a home | mould, felt | — | `mould requires: MouldMixin`, `felt requires: PlacingMixin` |
| press the post | `turn` (shipped) | `ScrewPress` | the mill's press row | — | shipped |
| dry | `dry` (shipped) | shipped (`Moist`/`Wet` target) | loft room + rack row | — | shipped |
| pasteboard / carton / bag / book | `fit <recipe>` (shipped raise arm; D26) | shipped | bills on the rows + recipes; Joint `glued` | `JointCatalogue` on use | shipped |
| paste a label | `fit <label> to <good> with <pot>` | shipped | label row, paste pot | — | `thing` is a Sheet (controller narrows by `isTearable && isMarked` → `pasteOn`) |
| paper the wall | `paint inside …`, `hang <wallpaper> on inside` | shipped `paint` (brush) / `hang` (`Wallpaper` is `Adornment`? no — the wallpaper row composes nothing new; `hang.yaml`'s `requires: AdornmentMixin` must widen to `AdornmentMixin\|MarkedMixin` — ⚠ the arg gate that would fail silently) | wallpaper row, paste pot | the building from the room (`structureNow`) | widened as noted |
| compose / proof / print / distribute | new, `/trade/printing/cmd/printing/` | `Forme` (`environment`) for compose/proof/distribute; `Press` + `Printer` + `RegisterBook`? no — `print` is afforded by `Press` and `Printer` (`environment`); the extract is `print <book> on <press>` | shop rows | the document by name through the reader's visible set (as `show`) | `forme requires: class.Forme`; `document` is a string |
| copy by pen | `copy` (new) | `Pen` (`inventory`) | pen row | — | `from requires: MarkedMixin`, `onto requires: MarkedMixin`, `with requires: ToolMixin` |
| cast type | `pour` (shipped) | shipped | hand mould row | — | shipped |
| carve a block | `carve` (shipped) | shipped (`Carvable` plan on `Woodblock`) | block row | — | shipped |
| buy a copy | `buy` (shipped) | the counter | the shop's counter line + stack | — | shipped |
| almanac | `read` | `Marked` | diving's row | `of` → the sea | shipped |
| covenant | — | — | a zone row with `admitsEpochThrough: medieval` (the drive stages one: Heart's Delight's locality row, grain) | `lookupField` | — |

⚠ Three arg gates in that table fail closed and silent if forgotten:
`read.yaml`'s widened `requires`, `hang.yaml`'s widened `requires`, and the
display classes' new `commandContributions` for `read`. Each is a line in
W1/W3 and a drive step (20, 37, 13).

---

## Acceptance-criteria coverage

| acceptance criterion | waves | drive steps |
|---|---|---|
| white sized paper from rags by player verbs; `look` names color, weight, evenness, sizing; bleeds vs holds | W2 | 1–8 |
| brown on iron-bearing water, authored nowhere | W2 (D9) | 9 (staged) |
| iron-gall ink, printing ink, pasteboard, carton, bag, parchment from inputs | W3, W4 | 10, 11, 12 |
| read on the phone where there is coverage; printed where a printer is admitted; covenant refuses the printer, allows the pen | W1, W5 | 20, 21 — ⚠ the *"off grid, the phone cannot fetch"* half is R1 |
| after edit/retract every printed copy reads as it did; the ticker reads the change | W0, W5 | 27 |
| whoever holds a sheet reads it | W0 | 15 |
| reading a recipe on paper gives known-of and never `make` | W0 | 17 — ⚠ **changed by the owner 2026-11-04 (D42):** a PRINTED recipe gives known-of; a handwritten notebook page gives nothing on read |
| notebook written, read, lent, torn; spellbooks work and burn | W0, W6 | 16–19 |
| misprints nobody announces; proof finds some; a short case refuses naming the glyph | W5 | 23–26 |
| the shop sells copies; a handbill with a woodcut | W5 | 28, 29 |
| bearer receipt handed over withdraws; depositor refused; spent and forged refused | W1 | 31, 32 |
| tears (losing the torn text), burns, runs then pulps; a wet or torn carton/bag spills | W0, W3 | 14, 35, 36 |
| everything glued stands the damp as its glue does | W3 | 10, 37, 39 |
| a sealed letter that has been opened shows it | W0 | 13 |
| copies, notebooks, posters read the same after a restart | W0, W5, W7 | 30 |
| the blocking drive green in under half an hour | W7 | — |

Unmapped by the criteria but in the drive: 33 (ticket pulps — W0/W1),
34 (ledger book — W1/W5), 38 (filter paper — R3).

---

## Test & gate strategy

**Unit tests** prove arithmetic and refusals: the fold ladder, the tear
split, the pulp latch, the ash read, the stack split on write, the
edition hash's idempotence and every `pagesOf` arm, bearer withdraw's four
refusals, the case debit and the named short glyph, seeded misprints being
deterministic across runs, proof's share, the stamper's power and fouling
load, brown-by-contamination, paste letting go vs casein holding, the
inside face peeling at humidity, the covenant line. **Only the drive can
prove** the five reachability links per verb and the restart (step 30).

**The blocking drive** — `packages/wire/tests/paper.dirty.wire.test.ts`,
`.dirty.` because it buys rags, beats the mill's trough, prints the Gazette
and empties the depot's crate. Packs: `hearts-delight, terminus, rejection,
residence, trade-papermaking, trade-printing, trade-painting, trade-milling,
trade-haulage, trade-shopkeeping, trade-tanning, trade-smelting, trade-diving,
trade-dyeing, arcana, arcane-library, water, world-seed, generic-objects,
base-library, distribution`. Every step's pace, assertion and (for staged
twins) the wizard tool that stages it:

| # | pace · assertion | staged by (if staged) | notes |
|---|---|---|---|
| 1 | instant · player | — | `sell rags` at the mill door; an oily rag refused with the line |
| 2 | instant · player | — | `tear shirt` → rags |
| 3 | staged · staged | `eval` sets the retting vat's maturation progress to 1 (twin of soak 1) | |
| 4 | short · player | `eval` pins the flats' flow low for the second run (the dry spell; water's `pinFlow` test seam if present, else `eval` on the race's `passFraction`). **After water supply merges:** pin the natural flow low and `open headgate` to its full 0.6 m³/s — the ditch takes its water above the race and the catalogue's accounting shorts the mill (§ Reconciliation) | `put rags in stamper`, `switch on stamper`, jump; pulp; slower under the short share (D26) |
| 5 | instant · player | — | `dip mould in vat`, `couch mould on felt`, ×3 |
| 6 | short · player | — | `turn press`, `dry sheets on lines`, clock jump 6 h |
| 7 | instant · player | — | `look sheet`; `write … on sheet` → bleeds |
| 8 | short · player | — | `dip sheet in size tub`, `dry`, jump; `write` holds |
| 9 | instant · staged | `eval` clones a stamper + vat at `kestrel:headwaters` and a persistent discharge works row; one dip. **After water supply merges:** no discharge row — `eval` sets the staged vat's water payload `ironMgL` (or the Kestrel seed authors it) | brown |
| 10 | short · player | — | `fit pasteboard` (paste), carton, bag; a cockled sheet seats short until pressed |
| 11 | staged · staged | `eval` sets the gall jar's progress (twin of soak 2) | iron-gall; printing ink in the paint pot |
| 12 | staged · staged | `eval` sets the lime pit's progress (twin of soak 3) | parchment |
| 13 | instant · player | — | letter, fold, envelope, `seal`, `give`; open, `read`; `look` shows the broken seal; in the dark `read` refuses `too-dark-to-read` |
| 14 | instant · player | — | `tear letter` (half text each); `pour water on sheet` → runs; `ignite sheet` → ash read |
| 15 | instant · player | — | second player `get`s a printed private page from the first's room and reads it |
| 16 | short · player | — | `fold` ×2 on the sheets, `fit notebook` with boards and the paste pot in reach → notebook of N pages (D26) |
| 17 | instant · player | — | `write <recipe> on page 3 of notebook`; `read page 3`; lend; borrower reads → known-of; `make` refuses `not-learned` |
| 18 | instant · player | — | `tear page 3 from notebook`; the book has a gap; the page reads alone |
| 19 | instant · player | — | `study primer` (shipped behavior); `ignite primer` → gone; `read almanac` matches `look shore`'s tide |
| 20 | instant · player | — | `show gazette on handset`; `read handset`. ⚠ the off-grid half is R1: driven as *"a printed copy still reads"* only |
| 21 | instant · player | `eval` sets the locality's `admitsEpochThrough: medieval` for the second half | `print gazette on printer` → sheet; in the medieval place → refused naming the covenant; `copy sheet onto blank with pen` → errors |
| 22 | instant · player | — | `buy antimony`, type metal in the crucible, `pour … into hand mould` → a sort |
| 23 | instant · player | `eval` shrinks the case's `e` count for the refusal half | Hesper posts (`press post` as her, or the drive logs in as the editor seat); `compose` → `case-short:e`; shorten or cast; set |
| 24 | instant · player | — | `proof forme` → found + corrected |
| 25 | short · player | — | `print forme 3` → paper and ink debited |
| 26 | instant · player | — | `read copy` → as set, a missed misprint present |
| 27 | instant · player | — | `press edit`, `press retract`; ticker frame changes; copy unchanged; a second copy equals the first |
| 28 | instant · player | — | `buy gazette` at the counter; `distribute forme` → the case whole |
| 29 | instant · player | — | `carve … on block`, lock it in a forme, `print`; `hang handbill`; a passerby `read`s it |
| 30 | instant · player | — | restart the world; read copy, notebook page, poster |
| 31 | instant · player | — | `store deposit crate` → paper receipt; `give`; `store withdraw crate` by the holder; depositor refused; spent presented → *already settled*, still in hand |
| 32 | instant · player | — | `copy receipt onto blank with pen`; present → refused |
| 33 | instant · player | — | `check coat` → paper ticket; `pour water on ticket` → pulps; `reclaim` still works (the owner stamp) |
| 34 | instant · player | — | `read ledger`; `ignite ledger`; `show …` on the handset still lists the papers; `print ledger on press` → frozen extract |
| 35 | instant · player | — | pack a carton; carry (lighter than the crate — `look`'s weight line); soak → spills |
| 36 | instant · player | — | the grocer's bag; `tear bag` → spills |
| 37 | short · player | `eval` raises the room's humidity for the peel | `paint inside of cottage with paste pot`, `hang wallpaper on inside`; `look`; damp → peels |
| 39 | instant · player | — | `fit label to jar with paste pot` / `with casein pot`; `put jars in ice bucket`; paste slides, casein holds |
| 38 | instant · player | — | filter paper in a funnel; `pour` through; finer than the cloth — ⚠ R3 |

(37/39/38 keep the requirements' numbering.)

**The soak drive** — `paper.soak.dirty.wire.test.ts`: 1 retting over
days, 2 galls steeping, 3 the lime pit, 4 a season's fouling at the lower
farms and Terminus, 5 the almanac's year ending. Never run before merge;
the MR names the lane.

**Gates:** the full `lint:family` at every wave; `pnpm test` at
code-complete and at `/finalize`; the touched packs' own vitest at every
wave (`trade-papermaking`, `trade-printing`, `trade-painting`, `trade-haulage`,
`trade-diving`, `arcana`, `hearts-delight`, `terminus`).

---

## Risks & opens

### Requirements disagreements (not absorbed; the owner's call)

- **R1. The phone and coverage do not exist.** Requirements § *What
  already exists*: *"Players carry a phone; the implant is elective; some
  places are off grid"* — none of that is on master (grounding). The phone,
  the carrier ladder and coverage are the unbuilt off-grid build. **The
  plan does not build them** (R3: never solve a cross-cutting capability in
  a trade build). It ships the document source on the display substrate
  (the live rung, D5), a `handset` row for the drive, and one seam
  (`Display.canFetchAt(place)`, true). Drive 20's *"off grid, the phone
  cannot fetch it"* and drive 21's *"in a place that admits a printer"*
  half-depend on off-grid; the plan drives the halves that stand. The
  requirements sentence should move to *Non-goals → the off-grid build*.
- **R2. The epoch covenant reader does not exist.** Same section: *"a
  parcel's covenant may refuse later instruments"* — the stamp exists, the
  reader is a comment. D22 ships the smallest reader (one zone field, one
  method on `ToolMixin`) because drive 21 and the copy ladder's whole
  point need it. It is cross-cutting substrate shipped in a kernel-led
  build with a named first consumer, which is the rule — but the owner
  should know the requirements claimed it as shipped.
- **R3. `strain` is not a filter.** It is the bartender's terminal mint
  with no mesh and no fineness (grounding). *"Filter paper is a finer filter
  for the shipped `strain`"* cannot be built as written. The honest form in
  the tree is the porous vessel seeping into the vessel below with
  `Material.filteredTo` — so filter paper is a sheet row whose material
  filters finer than cloth, laid in a funnel, and the act is `pour`. Drive
  38 is written that way; if the owner wants `strain` to become a filtering
  verb, that is the command-taxonomy slate's.
- **R4. A room's walls have no face.** *"Wallpaper is a coat on a wall's
  face … `paint` lays the coat of paste on a wall"* — walls are
  construction's authored layers; only a building's **outside** is `Faced`.
  D21 gives `Building` an inside face (one face for the whole building's
  rooms, read from any member room) — the smallest true form. A per-room
  wall face is construction's later work.
- **R5. The icehouses.** *"The warehouse receipt becomes bearer paper"* is
  read as the depot's; the two Hollow Mere ice houses keep registered
  receipts (no paper) so the storage drive stands. If every store should go
  bearer, it is one row key each and a storage drive re-run.
- **R6. Parchment's verbs.** *"Stretch and scrape"* names no verb in the
  requirements' new-verb list; the plan reuses tanning's shipped acts and
  records what it found. If tanning has no scraping act, parchment is a
  recipe with no new verb.

### Risks to price

- **The harbors collision is a real file collision** (`RegisterBook.ts`,
  `Marked.ts`, `ReadController.ts`). § Reconciliation makes it mechanical;
  it is still a merge somebody does by hand.
- **`Sheet`'s composition is deep** (eight mixins). `Combustible` needs
  `Reserved` + `Thermal`, which drag the thermal reconcile onto every sheet;
  paint's `Rag` already pays this and is the precedent. If a ream of 480
  reads slow, the stack is one object.
- **`pagesOf`'s release arm** renders through `Release` (kernel value
  object) — fine; the `recipe` arm needs the recipe document's shape
  (`RecipeCatalogue`'s rows) and should render name + steps only.
- **The copyist's competence** reads `printing` (grain). A `scribing`
  Discipline is a row away if the owner wants it.
- **`show`'s document resolution by headline word** is the `store withdraw`
  shape; ambiguous matches prompt (`PromptApi.choice`), never pick.
- **Hesper has no shop today**; W5 gives the Gazette rooms under
  `terminus`'s pack and moves her `home`. Her `prints` beat is untouched;
  the print run is the pressman's (or a player's) act, as the requirements
  say.
- **Seeded misprints and `uncertainty.md`**: the substitution positions are
  a hash of (text, compositor, case) — epistemic/competence provenance, no
  draw. The build should cite the doc's provenance table in the method's
  comment.

### Opens the build decides (and records in the plan)

- whether `show`'s verb survives the collision grep (D5 names the fallback);
- the exact `ActPlan` the `PulpVat` returns for `dip` (the `GlazeTub`
  plan's shape with the mould as the target);
- whether `ScrewPress.turnBy`'s new arm needs the felt to be a `Placing`
  host (`on`) — the mould precedent says yes.

---

## § Reconciliation with the siblings

The owner's choice (2026-11-03): **paper builds against master as
planned; this section records exactly what reconciles when each sibling
merges. Never gate on either.** Water supply is in its browser walk and
will likely land first.

### Harbors (`origin/reqs/harbors`, contains paint)

| file | paper writes | harbors writes | the merge |
|---|---|---|---|
| `lib/description/Marked.ts` | `refreshMarks` (copied from harbors, byte-identical) + `teach` + `markText` stackIdentity + the ash read | `refreshMarks` | keep one `refreshMarks`; the rest is paper's |
| `platform/idea/cmd/perception/ReadController.ts` | the same `await target.refreshMarks(giver)` line, the Display branch, `teach` replacing `takeAnyChart` | the `await` line | keep one line; paper's branches stand |
| `platform/thing/RegisterBook.ts` | `registerPrefix` + a `pagesOf` listing | `government` + the ship register page | keep both fields; `refreshMarks` branches on which is set |
| `lib/document/DocumentKinds.ts` | `edition`, `book` | `ship`, `berth-roll` | additive — four new entries, all `naturalKey: null`, `onVanish: 'keep'` |
| `api/document.ts` + `platform/idea/api/DocumentLogic.ts` | `freezeEdition`, `pagesOf` | `saveBerth` (gated `FromMixin(Voyaging, caller === args[0])`), `berthRollOf` | additive. ⭐ Same shape, checked: a per-purpose transport that pins kind and path, derives the owner and reads the truth off the subject (`saveBerth` reads *does she lie here* off the ship; `freezeEdition` reads the source document's owner off the document and takes only the pages, which are the truth being frozen). `freezeEdition`'s callers span the kernel (`Store`, `RegisterBook`) and a pack (`Press`, `Printer`), so its gate is structural (`saveAsBusiness`'s posture) rather than one `FromMixin`; `pagesOf` is a read, ungated like `berthRollOf` |
| `lib/mixin.ts`, `api/mixin.ts` | `Tearable` | `ForSale`, `Hirable`, `Voyaging`… | additive entries |
| `lib/structure/Structure.ts` / `Building.ts` | `Building.faces()` inside + the room-air walk (`Building.ts`) | `Structure.memberExtent()` hook; `buildings`/`footprintM2` deleted (`Structure.ts`); `Blueprint.ts` → `Floorplan.ts` | no overlap; D21 binds through `Place.structureNow`, which both keep. Paper adds no blueprint or plan rows; its mill, print shop and Gazette rooms are places plus plain `Building` rows (extent + entrance), the towpath cottage's shape |
| `lib/retail/*`, `cmd/retail/buy.yaml`, `BuyController.ts` | **nothing** | `ForSale`, `Hirable`, `rent` | paper's two counters are `Stock` rows; they ride `ForSale` the day it lands with no paper change |
| `hearts-delight/.../farmstead*` | nothing (paper adds `paper-mill/**`, `thing/leat.yaml`, one `exits:` entry on `millsite.yaml`) | the authored house/barn rows | no overlap |
| `lib/material/Integrity.ts` | nothing | `holed` | — |

### Water supply (`origin/reqs/water-supply`, branched before paint)

⚠ Water supply must take master's paint merge into its own `Assembled.ts`
(it adds `canTakeMembers`/`afterMembersFitted` beside paint's glue, which
its two-dot diff shows as "removed" only because the branch predates it).
That is water supply's merge, not paper's — but paper's `Sealable.ts` edit
lands on the same file water supply grew by 117 lines:

| file | paper writes | water supply writes | the merge |
|---|---|---|---|
| `lib/spatial/Sealable.ts` | `seal`, `sealBroken`, the augmenter, `open()` breaking the seal (D11) | `canOpen(by): VetoResult` on `Sealable`; `ThrottleableMixin` in the same file | additive on the mixin; `ThrottleableMixin.open()` → `setOpening(1)` must still break a seal if a throttled gate is ever sealed — it is not, so the second merger only checks `open()` is called through `super` |
| `lib/craft/Assembled.ts` | nothing (the book's spine is a `glued` joint on a bill — rows) | the two hooks | — |
| `world-seed/.../Watercourse/delight.yaml` | one `works:` entry (the stamper) | two `works:` entries (headgate, weir) | one-line list merge |
| `hearts-delight/pack.yaml` | the mill's claim: `{ extent: /world/terminus/hearts-delight/paper-mill, landUse: industrial, powerBand: off-grid }` | `waterSource:` on every premises claim; the ditch's claims | **after the merge the mill's claim gains `waterSource: /world/terminus/hearts-delight/paper-mill/thing/leat`** — its own leat (a `WaterFixture` row paper ships now; water supply's `natural: true` is added to it then, the tannery leat's shape); `lint:water-posture` (ceiling 0) refuses the claim without it |
| `terminus/pack.yaml` | the print shop's claim: `{ extent: /world/terminus/gazette, landUse: commercial, feeder: terminus-main:avenue }` | `waterSource:` on every Terminus claim | **after the merge: `waterSource: /world/terminus/wharfside/thing/city-intake`**, as `realty`, `mayfield-row` and the wharfside cite |
| `lib/parcel/ParcelRecord.ts`, `lib/supply/*`, `content/water/src/**` | nothing | `waterSource`, `WaterSupply`, `WaterChemistry`, `Gate`, the ditch | — |

**The mill's water, after the merge — three statements, precisely:**

1. **What the stamper draws on.** The millrace (`thing/millrace.yaml`,
   a `ControlStructure` at `delight:flats+0.3`, `generates: true`), by
   `powerFrom` — a works on the **river**, exactly as the grist mill. It is
   **not** a `Conduit` and never asks `shareFor('industrial')`: rank-shared
   shortage (`Conduit.shares`, civic → trades → houses) is the city main's
   contract and no main reaches the flats. The mill's **taps** (the vat
   filled from its leat) read a `natural` source, which "runs on its own
   water, never a premises' citation" — so the mill as a *trade drawing on
   the system* is a trade drawing on the river at the flats, and the system
   that shorts it is the river's own accounting.
2. **How a dry spell shorts it.** The headgate (`delight:flats+0.2`) is
   **upstream** of the race (`+0.3`): `flowAt(delight:flats)` subtracts the
   ditch's diversion (`capacityM3S: 0.6`, credited to `delight-ditch:head`)
   before the race's take. So after the merge drive 4 is staged as: pin the
   natural flow low (water's test seam) **and `open headgate`** (full) — the
   ditch takes first, the race's `generationW` falls, the beat is slower.
   The staged twin on master (a pinned flow or `passFraction`) is replaced
   by a player act plus the pin. No rights are in play on either branch;
   when `WaterRightRegistry.allocate` gets a caller the race is the works
   it allocates to.
3. **The stamper's waste** stays a `Discharging` works row (`dischargeKind:
   organic`, the city outfall's shape) — contamination by kind is fouling,
   which the mill does; it reaches the ditch's return and Terminus as the
   catalogue already carries it.

**The sheet's color, after the merge — the chemistry home.** Water supply
ships `WatercourseChemistry {pH, hardnessDgh, nitrateMgL}` seeded by a
Watercourse row's `water:` block and mixed downstream by `chemistryAt`,
and `WaterChemistry` (lib/supply) carrying it onto `BulkPayload`. **No
iron yet.** Reconciliation adds one field end to end — `ironMgL` on
`WatercourseChemistry` (`seedOf`/`add`/`scale` in `WatercourseCatalogue.ts`),
on `WaterChemistry` and its `toPayload` (`BulkPayload.ironMgL`) — and
**authors it once**: `kestrel.yaml`'s `water:` seed gains `ironMgL` (the
row's own comment puts the ore at the headwaters); the Delight's seed
authors none. The ONE reader that changes is `PulpVat.waterCharacter()`
(D9): from `contaminationAt(reach).byKind.persistent` to the vat's own
payload's `ironMgL` (the leat's draw carries the reach's chemistry).
`Sheet.colorFrom(water)` is untouched; drive 9's stage becomes a payload
`eval` or a staged Kestrel seed instead of a discharge row. The AC holds
unchanged: the color is derived; only the river's iron is authored, on
the river row, the way its pH is.

**Gates that start firing on paper's rows when water supply lands:**
`lint:water-posture` (the two claims above), `lint:water-plumbed` (the
vat reads a `natural` fixture standing in its room — exempt). Nothing
else.

---

## Deferred seams

- **Edition garbage collection** (an edition nobody holds) → the paper
  slate: needs a holder count or a sweep that is a reverse search; the
  seam is `DocumentApi.listOfKind('edition')`.
- **Coverage / the phone in every pocket / off grid** → off-grid-slate;
  the seam is `Display.canFetchAt(place)` and the `handset` row.
- **Forgery that works where the issuer cannot check; banknotes; the
  watermark** → the money-warehouse / currency slate and the cannery's
  metal-forming rung; the seam is `Sheet.boundTo` + `ReceiptTerms.bearer`.
- **Licensing the press** → the paper slate (lens 7 gap recorded).
- **Rejection's print shop; moving the assay slip and icehouse book to
  paper** → a content pass; rows.
- **Wood pulp, typewriter, copier; engraving; etching** → the paper slate.
- **A per-room wall face** → construction; the seam is `Building`'s
  inside face.
- **`strain` as a filtering verb** → command-taxonomy slate (R3).
- **A `scribing` Discipline** → the paper slate (the copyist reads
  `printing` today).
- **The ice houses' receipts as bearer paper** → storage-slate (R5).
- **A real `Discharging` row for Rejection's mine water** → the water
  pack's content (the drive stages one).

---

## Critical files

Read first, in this order:

1. `docs/requirements/paper-requirements.md`, `docs/slates/builds/paper-and-printing-slate.md` § 11
2. `packages/server/src/mud/lib/description/Marked.ts`,
   `packages/server/src/mud/platform/idea/cmd/perception/ReadController.ts`,
   `packages/content/platform/content/platform/cmd/perception/read.yaml`,
   `…/cmd/inventory/write.yaml`
3. `git show origin/reqs/harbors:packages/server/src/mud/platform/thing/RegisterBook.ts`
   and the `Marked.ts` diff on that branch (the hook to copy)
4. `packages/server/src/mud/lib/document/DocumentKinds.ts`,
   `packages/server/src/mud/api/document.ts`,
   `packages/server/src/mud/platform/idea/api/DocumentLogic.ts`,
   `packages/server/src/mud/lib/press/Release.ts`
5. `packages/server/src/mud/lib/display/Display.ts`,
   `packages/server/src/mud/lib/command/CommandController.ts` (`resolveScreen`),
   `packages/server/src/mud/platform/idea/cmd/perception/LookController.ts:665`
6. `packages/server/src/mud/lib/storage/{Store,Receipt,StoreBook}.ts`,
   `packages/content/trade-haulage/src/thing/Warehouse.ts`,
   `…/trade/haulage/thing/depot-book.yaml`
7. `packages/server/src/mud/lib/stuff/Stackable.ts` (`canMergeWith`),
   `lib/slot/Foldable.ts`, `lib/spatial/Sealable.ts`, `lib/fire/Combustible.ts`,
   `lib/wetness/Wet.ts`, `lib/material/Moisture.ts`
8. `packages/server/src/mud/lib/material/Faced.ts` (`layCoat`, `airCoats`),
   `lib/craft/Assembled.ts` (glue), `platform/idea/api/CraftingLogic.ts`
   (`fitImpl:4783`, `glueInReach:4747`), `platform/idea/cmd/crafting/FitController.ts`,
   `platform/idea/cmd/inventory/HangController.ts`, `lib/structure/Building.ts`
9. `packages/server/src/mud/lib/mould/Mould.ts`, `lib/material/DrainSetting.ts`,
   `lib/craft/DipBath.ts`, `platform/thing/GlazeTub.ts`, `platform/thing/ScrewPress.ts`,
   `platform/idea/cmd/crafting/DryController.ts`
10. `packages/content/trade-painting/` (the pack exemplar: `pack.yaml`,
    `package.json`, `src/thing/Rag.ts`, `content/trade/painting/idea/material/hide-glue.yaml`)
11. `packages/content/trade-milling/src/thing/GristMill.ts`,
    `packages/content/water/src/thing/ControlStructure.ts`,
    `packages/content/water/src/idea/WatercourseCatalogue.ts` (`Discharging`, `contaminationAt`),
    `packages/content/hearts-delight/content/world/terminus/hearts-delight/{location,thing}/`
12. `packages/server/src/mud/lib/craft/{Epoch,Tooled}.ts`
13. `packages/server/src/mud/platform/idea/cmd/retail/MenuController.ts:78`,
    `lib/script/RecipeKnowledge.ts`, `lib/expanse/Charted.ts`,
    `packages/content/arcana/src/thing/Spellbook.ts`,
    `packages/content/trade-diving/src/thing/TideAlmanac.ts`
14. `packages/content/terminus/content/world/terminus/gazette.yaml`,
    `gazette/agent/editor.yaml`, `packages/server/src/mud/lib/behavior/prints.ts`
15. `packages/wire/tests/paint.dirty.wire.test.ts` (the drive's shape),
    `docs/testing.md` § The soak lane
16. On the siblings, by `git show origin/<branch>:<path>` (never checked
    out): harbors' `docs/antipatterns.md § A Stuff whose only job is to
    hold a record`, `lib/retail/ForSale.ts`, `lib/document/DocumentKinds.ts`
    + `platform/idea/api/DocumentLogic.ts` (`saveBerth`); water supply's
    `docs/subsystems/water-supply.md`, `docs/plans/water-supply-plan.md`
    (D14), `lib/supply/WaterChemistry.ts`, `content/water/src/idea/WatercourseCatalogue.ts`
    (`chemistryAt`, `seedOf`), `lib/spatial/Sealable.ts`,
    `hearts-delight/.../ditch/thing/headgate.yaml`,
    `terminus/.../wharfside/tannery/thing/leat.yaml`

---

## Drive record

`packages/wire/tests/paper.dirty.wire.test.ts` (blocking; owned world on
`WIRE_PORT=2013`, `WIRE_BOOT=1`). Seven runs, 2026-11-03/04. ⛔ **No soak
drive was written**: every span step (retting, galls, the lime pit, a
season's fouling, the almanac's year) belongs to a part this build deferred.

| run | ✓ / steps | what it found |
|---|---|---|
| 0 | — | ⭐ **The world did not know the two new packs**: a pack is discovered through the root `package.json`; Terminus and Heart's Delight failed `requires-kernel` on the new classes (`e39878bf2`). |
| 1 | 13/24 | night (the mill and the shops are window-lit); "You tear **undefined**" (named after destruct — garment, envelope); a torn blank sheet named after its halves stacked; **the owner of a notebook refused their own first page**; a ream picked up as "480 reams"; a printed copy answered to nothing but "sheet"; a bought paste pot is empty. ⚠ **Step 5 PASSED while every dip was refused** — its regex matched "mould" inside the refusal; every act's assertion now fails on a refusal (B2). |
| 2 | — | the drive's own clock durations (`'9h'` is not a duration) — everything cascaded from the dark. |
| 3 | 14/22 | ⭐ a dried sheet read "thoroughly dried" AND "still wet from the mould" — waterleaf/cockle now read **dryness against the air**, not raw moisture; the mill's clock jumps ran into the evening. The printed copy carried the compositor's seeded misprints past the proof: *"the basket **sfands** at one **hunbred** and two against a **bose** of one hundred"* — AC met. |
| 4 | 16/23 | ⭐ **a size coat never set**: a thermal body sets its wet coats on its own reconcile from its last read, so a coat laid and left counted no time — the sheet now starts the clock at the lay and reconciles before saying it is sized; a bearer receipt did not answer to `receipt`; `give` finds no player by handle (drop and pick-up instead). Bearer paper ran live at the depot. |
| 5 | 20/23 | size dried at a day's rate in the damp mill — rates raised to an hour or two; `put … in` finds a container in the room, not the hand (shipped). |
| 6 | 21/23 | one `look` got no reply in 30 s after a six-hour jump (no server error; the world's own snapshot dup-key on the market stalls is pre-existing). |
| 7 | 21/22 | the same: the first command after the jump carries the world's settle. Everything else green — bearer paper end to end (depositor refused, holder paid, "already settled"), the copy with fresh misprints ("hnndred", "o base"), *known-of* from a notebook page, the label let go in the wet. ⚠ Step 17's borrower answered "no ink", not "somebody else's" — that refusal is unit-proved only. |
| 8 | ⭐ **22/22** | green — the blocking drive passes end to end. |
| 9 | ⭐ **22/22** | green again after the suite's fixes moved the stationery to the mill's counter. |

**Browser walk** (`e2e/tests/paper-walk.spec.ts`, server on 2013 with `AUTH_MODE=test`, `CLIENT_URL=http://localhost:5183`, vite on 5183): ⭐ **passed** (1.3 min) on a fresh world. The forms parse at the real binder and act — a notebook written on page 3, read, torn and read again ("torn out"); a letter written, set in a set-down envelope, closed, sealed, opened, and the broken seal on the inspection card; the Gazette shop seen, a release shown on the reading screen, the ledger read, `compose` answered. What getting there found: the walk's own staging (the shops are window-lit — daylight; `look` renders to the CARD; a loose regex matched a refusal, the drive's step-5 trap again; the server's `CLIENT_URL` for a non-default client port).

**Full suite** (`tools/suite`, 22 min): 54/56 packages green; `server` (the wiki-fields snapshot — Garment's `tear` sat above its `fieldMeta` and hid two fields; the pack count) and `terminus` (the general store's tests hold every stocked good discrete — stationery moved to the mill) fixed in `5f235c28d` and re-run green in isolation.

Not driven (each in the file header): 3, 9, 10–12, 16, 19, 22, 27, 29, 30,
33, 35, 37, 38 — the deferrals in the wave notes. Step 31's bearer flow ran
live in runs 4–6 (the warehouseman on shift).

*(appended at build time, not at plan time)*
