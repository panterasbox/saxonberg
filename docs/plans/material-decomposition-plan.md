# Material decomposition — implementation plan

Executes [material-decomposition-requirements](../requirements/material-decomposition-requirements.md)
(**kind:** refactor/sweep · **leads from:** kernel). One `Material` class carrying ~80 authored
properties becomes a slim base + **21 capability mixins** named for the substance's physics, arranged
under a shallow **tree of kinds** (the decided tree, slate § 7¾), with every one of the 386 rows
re-homed onto its kind and every sentinel field removed. Consumers narrow by capability predicate, never
by kind — enforced by a new gate. No new behavior except the listed defects.

⚠ **Baseline is build-4's tree** (`origin/reqs/vocabularies-to-rows`, smell and taste). This build
starts after it merges; every path below was read from that branch (`git show origin/reqs/vocabularies-to-rows:<path>`).

## Grounding

Verified 2026-11-07 against build-4's tree unless marked *(master)*.

- `packages/server/src/mud/lib/material/Material.ts` — 2,387 lines; `class Material extends SingletonMixin(PerceptibleMixin(Idea))`,
  `static boundaryRole = 'commons'`, `canEvict`; **75 public getters, 65 `fieldMeta` entries**, every
  capability's setter/derived method on the one class (`chilledIn`, `castShrinkage`, `acidAttack`,
  `corrodeOnContact`, `solidsMassFraction`, `boilingPointAt`, `solubilityAt`, `permeability`,
  `wetProperty`, `elementalComposition`, `containsElement`, `waterShare`). Field defaults are
  sentinels (`Quantity.of(0,'K')`, `false`, `[]`, `null`).
- Instanceable twin `platform/idea/material/Material.ts` (`class Material extends MaterialBase {}`,
  76 rows); `ConsumableMaterial.ts` (no fields, 6 rows); build-4's `OdorousMaterial.ts` (182) and
  `OdorousConsumableMaterial.ts` (107); `RadioactiveMaterial.ts` (1); `Muscle.ts` =
  `OdorousMixin(MuscleMixin(Material))` (11). Arcana's `packages/content/arcana/src/idea/material/PotionMaterial.ts`
  = `PotableMixin(IdentifiableMixin(ArcaneMixin(ConsumableMaterial)))` (3 rows).
- Capability mixins already pulled out, the pattern this build generalizes: `lib/material/Odorous.ts`
  (build-4: `smells`, `burning`, `_mixinName = 'OdorousMixin'`, `Mixins.Odorous`, `MixinApi.isOdorous`),
  `lib/material/Radioactive.ts` (`halfLife`, `decayMode`, `_decayProductPath` with
  `ref: 'identity:constituent'`; `MixinApi.isRadioactive` at `api/mixin.ts:1884`), `lib/butchery/Muscle.ts`
  (`work`; `MixinApi.isMuscle`). Each is ~40 lines: interface + factory + `fieldMeta` + get/set.
- `lib/mixin.ts` — `Mixins` const (line 277) → `MixinName` type (854); `MixinRefusals` partial table
  (902). **Thing-side names that a material mixin must not reuse:** `Combustible`, `Seasoning`,
  `Compounding`, `Soilable`, `Thermal`, `Contaminable`, `Maturing`, `Fractionating`, `Faced`. No
  `Combustion`/`Fusion`/`Volatility`/`Toxicity`/`Perishability`/`Porosity`/`Acidity`/`Solution`/
  `Solidity`/`Edibility`/`Shrinkage`/`Detergency`/`Coating`/`Optics`/`Tissue`/`Element`/`Compound`/
  `Mixture` exists. `lib/material/Kinetics.ts` exports value classes `Kinetics` and `KineticChange`, so
  the kinetics capability cannot take that noun.
- `platform/idea/MaterialCatalogue.ts:92` warms by template-path infix `/idea/material/` and
  `cls.prototype instanceof Material` (the lib base) — **unaffected by new kinds**, and the one
  legitimate `instanceof Material` (the base is not a kind).
- `platform/idea/api/MaterialLogic.ts:912` `isMaterial()` duck-checks `getDensity`/`getTags` — both
  stay on the base, so it keeps working; it is also a P4 defect to replace with `instanceof` the base.
- `platform/idea/TemplateApplier.ts:150-200` iterates the HOST's `fieldMeta` persistent fields and
  `continue`s when a field is not in `data` — a data key the class does not declare is **silently
  ignored at runtime**; only `lint:instanceable` invariant 12 sees it (`ORPHAN_DATA_KEY_CEILING = 306`,
  `scripts/check-instanceable-placement.ts:323`, with ~161 known false positives from catalogue-parsed rows).
- Consumers *(master; production files, tests excluded; `getName`/`hasTag`/`getTags`/`getDensity`/
  `getAppearance` stay on the base and are untouched)* — per capability, files reading it:
  fusion 15 · solidity 19 · edibility 13 · porosity 12 · solution 12 · coat 10 · acidity 9 ·
  mixture 9 · volatility 7 · combustion 7 · kinetics 7 · toxicity 6 · cleansing 3 · seasoning 2 ·
  nutrients 2 · tissue 1 · optics 1 · perishability 1. Full file list: Appendix C. **Zero production
  callers** of `getSymbol`/`getAtomicNumber`/`getFormula`/`getMolarMass`/`getSolubility`.
- Sentinel reads today (the migration's shape, D3): `Tangible.ts:328 getEdibility() === true`,
  `Bonded.ts:679`, `Metabolic.ts:605`, `CraftingLogic.ts:2109`; `Seasoning.ts:115 getSeasoningDays() ?? 0`;
  `Faced.ts:414 !material.getLaysCoat()`; `Copper.ts:98 getSolidsKgPerL() <= 0`; `Freshness.ts:600
  getSpoilActivationEnergy().rawValue() > 0` ("can rot"); `Thermal.ts:1370 getKinetics() ?? null`.
- Material rows: 386 across 37 packs (`base-library` 149, `trade-distilling` 27, `trade-painting` 23,
  `trade-farming` 23 …), **18 `extends:` children** (a child inherits its parent's `class:`;
  `docs/subsystems/templates.md § Inheritance`). Folders under `base-library/content/stuff/idea/material/`:
  `alloy bulk caustic ceramic earth element food gas glass glaze mineral organic rock textile tissue wood` + 199 at top level (folders deferred, requirements § Non-goals).
- Lints that read material rows: `check-perishable.ts:259` keys on `data.spoilActivationEnergy > 0`
  (field name unchanged → unaffected); `check-acidity.ts:40` selects by `/idea/material/` path;
  `check-field-meta.ts --lint` validates every class's `fieldMeta` shape; `check-mixin-names.ts`
  refuses a kernel `_mixinName` missing from `Mixins`; `check-lib-statics.ts` ceilings public statics
  on `lib/` classes (`_mixinName`/`fieldMeta` are the existing mixins' shape, so no rise).
- Wiki: pages are Markdown with front matter under a pack's `content/wiki/guide/<name>.md`
  (`trade-painting/content/wiki/guide/paint.md`); components live at `lib/wiki/components/<name>.ts`,
  sole export `component` — four exist (`composition`, `help`, `image`, `infobox`);
  `<composition kind="mixin" of="X"/>` renders a mixin's architecture, **not the rows that compose it**.
- Drive precedent: `packages/wire/tests/<feature>.dirty.wire.test.ts` (`check-drive-scripts.ts`: a
  drive is BORN a wire file); browser walk `e2e/tests/<feature>-walk.spec.ts` (cordage, energy, ground, harbors).
- Pack import profile: `packages/server/package.json` exports `./mud/lib/*` and `./mud/platform/idea/*`,
  so a pack may extend a kernel `lib/material/` node or a `platform/idea/material/` kind by specifier.

## ⭐⭐ New substrate

| new | ledger row (slate § 7⅞) |
|---|---|
| 17 capability mixins in `lib/material/` — `Combustion` `Fusion` `Volatility` `Solidity` `Porosity` `Edibility` `Toxicity` `Perishability` `Acidity` `Solution` `Kinetic` `Shrinkage` `Detergency` `Coating` `Optics` `Tissue` (+ `Odor`, `Radioactivity`, `Muscle` kept) | *a capability pulled off Material* — the `Odorous`/`Radioactive`/`Muscle` pattern, applied to every remaining group |
| 3 identity mixins `Element` `Compound` `Mixture` (`lib/material/`) | *chemical identity* — `symbol`/`formula`/`composition` off the base |
| 4 abstract nodes `lib/material/Mineral` `Organic` `Plant` `Animal` | *a family class* — never instanced, so `lib/` (CLAUDE.md § Instanceable lives in platform) |
| ~28 kind classes `platform/idea/material/<Kind>.ts` (Appendix B) | *a family class* — `Muscle`/`ConsumableMaterial`; the four combination classes are replaced |
| 21 predicates `MixinApi.has<Capability>` | *a capability predicate* — `isRadioactive`/`isMuscle`/`isOdorous` generalized |
| gate `lint:material-kinds` (`scripts/check-material-kinds.ts`) | **genuinely new** — searched `scripts/check-*.ts`: `check-instanceable-placement` inv. 12 counts orphan keys with false positives, `check-capabilities` gates capability *kinds* minted by consumers; nothing refuses narrowing on a class or counts data gaps |
| wiki component `lib/wiki/components/materials.ts` | **genuinely new** — the four components checked; `composition` shows architecture, none lists a mixin's or class's member rows |
| ~52 wiki pages (platform pack + arcana) | *the wiki* — pages per capability, chemical kind and kind |

No new Api, logic singleton, hook, registry, document kind or collection. `MaterialApi` is untouched.

## Plan-level decisions

- **D1 Names.** A material capability is named for the **property, as a noun** (`CombustionMixin`,
  interface `Combustion`, file `Combustion.ts`, `Mixins.Combustion`), so it cannot collide with the
  thing-side adjectives (`CombustibleMixin`) and reads as *what the substance has*, not what a thing
  does. Predicates are `MixinApi.has<Noun>(m): m is Stuff & <Noun>`. Build-4's `Odorous` → `Odor`
  and `Radioactive` → `Radioactivity` are renamed in this build (both files are already being edited;
  one build old; `isOdorous`→`hasOdor`, `isRadioactive`→`hasRadioactivity`); `Muscle` is already a
  noun and keeps `isMuscle`. Two forced exceptions, recorded: **`KineticMixin`/`Kinetic`** (the noun
  is the value class in `Kinetics.ts`) and the identity interfaces **`ElementIdentity`/
  `CompoundIdentity`/`MixtureIdentity`** (`Element` is a DOM global type). `Fusion` and `Acidity` are
  documented as reading both ways (melting = freezing point; pH is one axis).
- **D2 Where classes live.** Leaf kinds are instanceable → `platform/idea/material/<Kind>.ts`, flat
  in the existing `material/` cluster. `Mineral`/`Organic`/`Plant`/`Animal` have no rows → abstract in
  `lib/material/`, extended by kinds and by a pack through `@saxonberg/server/mud/lib/material/<Node>`
  (exports map verified). `Chemical` is a node only if no row lands on it after the split; the codemod
  decides (expected: all 20 land on `Salt`/`Lye`/`Soap`/children). The instanceable twin
  `platform/idea/material/Material.ts` is **deleted** — nothing may be "just a material"; `Residue`
  is the kind that adds nothing. `platform/idea/material/Muscle.ts` stays as `Flesh`'s one-mixin child.
- **D3 Absence is structural; zero is a gap.** A getter exists only on its mixin, so a consumer
  reads it after `MixinApi.has<X>(m)`; TypeScript refuses an un-narrowed read once the base is cut
  (W2b). *Does not melt* is `!hasFusion(m)`, never `getMeltingPoint() === 0`. A **composed but
  unauthored** field keeps its zero default — that is a data gap, counted by the gate's ratchet, not
  a sentinel the row authored — so consumers that already handle zero still do, and no new throw is
  introduced. A setter on a capability mixin **refuses** its sentinel (0 K, `false`, `[]`): a row may
  not author "not applicable". Cross-capability derived reads (`castShrinkage` needs `thermalExpansion`;
  `boilingPointAt` needs `boilingPoint`) check the sibling predicate and return the documented
  degenerate value (`0`) or throw a typed `MaterialCapabilityError` where the doc says the read is
  impossible — one place each, on the mixin.
- **D4 The row rewrite** is a one-shot `tsx` script in the scratchpad (reusing
  `scripts/pack-roots.ts` `templateRows`/`effectiveRow`), **not committed**; Appendix A–B let it be
  regenerated. It (1) sets `class:` on every row that declares one, from the placement rules; (2)
  deletes every sentinel-valued key (Appendix A's definition) whose field is not on the new class;
  (3) moves non-food `nutrients` entries into `composition` on rows that become `Mixture`, else
  deletes them (constituents of a non-mixture are a data gap); (4) **reports** every row that authors
  a real value for a field its new class lacks — the build resolves each by a one-mixin child class
  or, at a majority on the node, by composing it on the kind (robustness rule 4), and records the
  outcome in the wave commit. `extends:` children inherit their parent's class; the script checks the
  EFFECTIVE row and reports a child whose own data needs a different kind.
- **D5 The gate** `lint:material-kinds`, four arms over kernel + every pack `src/` and every pack's
  material rows: **(a) kind narrowing = 0** — an import of a kind module (`platform/idea/material/*`,
  `lib/material/{Mineral,Organic,Plant,Animal}`) whose identifier appears anywhere other than an
  `extends` clause, or a string literal naming a `/idea/material/<folder>/` prefix in production code;
  allowlist: `MaterialCatalogue` (the base), `lib/wiki/components/materials.ts` (the wiki is exempt by
  requirement), tests; **(b) orphan key = 0** for material rows — a key the effective class declares
  no field for (precise here, unlike invariant 12, because the applier is the only reader);
  **(c) sentinel = 0** — a capability field authored at its sentinel; **(d) data gaps = ceiling** —
  composed-but-unauthored capability fields, printed per pack, measured at W2b, may fall never rise.
  Census-then-ratchet per `docs/lint-family.md`.
- **D6 Gate ordering.** Each new kernel mixin lands with its `Mixins` entry in the same commit
  (`lint:mixin-names`); every class file carries a well-formed `fieldMeta` (`lint:field-meta`);
  `lint:instanceable` inv. 1/3 (no row names `/lib/`, every class resolves) and inv. 12's ceiling is
  **lowered** to the new count at W2b; `lint:lib-statics` must not rise (mixins carry only
  `_mixinName` + `fieldMeta`, the existing shape); `lint:imports` for the arcana specifier;
  `lint:perishable`/`lint:acidity`/`lint:closed-vocabularies` keep their field names. No schema,
  topic or collection change.
- **D7 The drive** is `packages/wire/tests/material-decomposition.dirty.wire.test.ts`, the 11
  requirements steps, packs `platform base-library trade-forestry trade-fuel trade-mining
  trade-smelting trade-ceramics trade-baking trade-distilling trade-chandlery rejection` + the
  world packs those places live in; the browser walk is `e2e/tests/material-decomposition-walk.spec.ts`.
- **D8 `burning` moves from `Odor` to `Combustion`.** Census: all 69 rows authoring it are
  combustible, and 229 odorous rows never burn — the smell of a thing burning is a fact of its
  combustion. Build-4's `getBurning` readers (fire side) already narrow on combustion.
- **D9 `edibility: true` is retired.** Composing `Edibility` *is* the fact; `getEdibility()` goes,
  its 8 readers become `hasEdibility(m)`.
- **D10 Identity composes on a kind only at 100%**; otherwise a one-mixin child named for the real
  concept: `ElementalMetal`, `Alloy` (Metal), `Ore` (Stone + Mixture); `Water` and `Salt` compose
  `Compound`. `molarMass` and `chemistry` live on both `Element` and `Compound` (exclusive, never two
  copies); `elementalComposition`/`containsElement`/`waterShare` on `Mixture`.
- **D11 Drink composes nothing of its own** (decided). If the codemod's report shows a majority of
  `Drink` rows authoring `Solution`/`Volatility` fields, that is a rule-4 move-up the build records in
  the W2a commit — not a reopening.

## ⭐⭐ Host placement

Test applied to every row of this table: *how many composers will ever answer yes?* A host under
80% is a data gap only where every member **physically** has the property.

| mixin / class | host | what composing it claims |
|---|---|---|
| `Combustion` | `Wood`, `Fiber`, `Spirit`, `FatOilWax`, `SolidFuel`, `Oil`, `Polymer` | every wood, fiber, spirit, fat, fuel burns — true physically (fats 41% authored = gap) |
| `Fusion` (melting/freezing point) | `Metal`, `Glass`, `Water`, `FatOilWax`, `Oil`, `Glue`, `Alloy`… | every member has a phase point; water 44% authored = gap |
| `Volatility` | `Metal` (35% — physical, gap), `Water`, `Gas` (100%), `Oil` | a boiling point exists for all |
| `Solidity` | `Metal`, `Stone`(+children), `Wood`, `Fiber`, `Flesh`, `HideHorn`, `Polymer` | a mechanical response; never on a liquid kind |
| `Porosity` | `Stone` (93%), `Wood`, `Fiber`, `HideHorn` | **not** `Metal` (the metals-author-absorption defect dies here) |
| `Edibility` | `Food`(+`Drink`,`Spirit`), `Flesh`, `Water` (7/9), `EdibleSalt` (halite, salt) | lye/saltpeter/glycerin leave it by kind; `Salt` does not compose it |
| `Toxicity` | `Spirit` (100%), `Lye`, `ToxicMetal` (lead…), `ToxicFood`/per-row children as measured | a third of toxic rows are not food — never on `Food` |
| `Perishability` | `Flesh`, `Herb`, `FreshFood` child (or `Food` if the measure is a majority — D4 step 4) | blood and rawhide → `HideHorn` children as the report shows |
| `Acidity` | `Salt`, `Lye`, `Water`? (pH authored 31 rows — the report decides) | pH is one axis, read both ways |
| `Solution` | `Salt`, `Lye`, `Water`, `Drink` only by D11's measure | dissolved-solids physics; sugar/paint liquors author it |
| `Kinetic` | `Clay` (not `Ceramic`/`Stone`), `Wood`, `Glue`, `Soap` (its cure — the seasoning defect), `Polymer` | change at a temperature-set rate; the kiln reads the clay |
| `Shrinkage` | `Wood` only (18/18) | green shrinkage and seasoning days; soap no longer borrows it |
| `Detergency` | `Soap`, `Lye` | a cleanser (17 rows) |
| `Coating` | `PigmentPaint`, `Glue` | lays a coat / pigment / adhesive (28 rows) |
| `Optics` | `Glass` | light absorption (Beer–Lambert) |
| `Tissue` | `Plant`, `Animal` (abstract nodes) | biological source — physically universal under both (56%/48% authored = gap) |
| `Odor` (renamed) | `Organic` | 92% yes; the odorless organics (silk) are a gap |
| `Radioactivity` | `RadioactiveMetal extends RadioactivityMixin(ElementalMetal)` | one row, uranium |
| `Muscle` | `Muscle extends MuscleMixin(Flesh)` | the 11 worked muscles; offal/gut stay `Flesh` |
| `Element`/`Compound`/`Mixture` | D10 | mutually exclusive by construction (no kind composes two) |
| base `Material` | everything | name · appearance · tags · density · thermal k · specific heat · electrical σ (+ `getEffusivity`, `canEvict`, `boundaryRole`) — every material has a real value |

Guard test: no kind class and no consumer gains an `if (!(m instanceof X))` re-narrowing; the build
treats a wanted guard as a finding (a missing child class) and records it.

## Convention conformance

- Module categories: mixins in `lib/material/` (no `Mixin` suffix on files); kinds in
  `platform/idea/material/`; one lint script in `packages/server/scripts/`; one wiki component; no
  free helper, no new Api, no new module category.
- Pack side: arcana's `PotionMaterial` re-bases onto `Drink` by `@saxonberg/server/mud/platform/idea/material/Drink`;
  no pack ships a mixin here.
- Module scope declares, lifecycles initialize; no `.js` imports; American English in every new name
  (`Odor`, not `Odour`) and page.
- **P3** refuse/skip/throw: setters refuse sentinels; cross-capability reads throw a typed error
  where impossible (D3); the codemod *reports*, never silently drops a real value. **P4** no duck
  typing: `MaterialLogic.isMaterial` becomes `instanceof` the base. **P5** the mixin decides: every
  gate on a capability is the predicate on the model; no controller tests a kind. **P6** persistence:
  materials are singletons with no instance state; nothing new persists; no row changes staging.
  **P7** load on use: `MaterialCatalogue` unchanged; the wiki component reads the warmed catalogue,
  adds no boot entry. **P8** names: D1; classes named for what they are (`Alloy`, `Ore`, `Clay`),
  never a mixin's word.
- Lint gates to pass: `lint:family` in full; specifically `lint:mixin-names`, `lint:field-meta`,
  `lint:instanceable`, `lint:lib-statics`, `lint:imports`, `lint:module-scope`, `lint:object-verbs`,
  `lint:perishable`, `lint:acidity`, `lint:closed-vocabularies`, `lint:drive-scripts`, and the new
  `lint:material-kinds`.

## Waves

Each ends at one commit, compiles, and passes `test:near` + `lint:family`.

### W0 — extract the capabilities (no behavior change)
- Create the 17 mixins + 3 identity mixins in `lib/material/` by **moving** each field, its
  `fieldMeta` entry, accessor pair, setter and derived methods out of `Material.ts` verbatim
  (Appendix A is the map). Rename `Odorous.ts`→`Odor.ts`, `Radioactive.ts`→`Radioactivity.ts`;
  move `burning` to `Combustion` (D8). Sentinel-refusing setters (D3).
- `lib/material/Material.ts` becomes `class Material extends <all 21 mixins>(SingletonMixin(PerceptibleMixin(Idea)))`
  with only the base fields in its own body — so **every existing row and consumer still compiles
  and behaves identically**.
- `Mixins` + `MixinRefusals` entries; `MixinApi.has<X>` predicates beside `isMuscle` (`api/mixin.ts`
  ~1884); `isOdorous`/`isRadioactive` renamed with their callers.
- Tests: one `lib/material/__tests__/<Capability>.test.ts` per mixin for the sentinel refusal and
  the cross-read; existing material tests green unchanged.
- Commit: `refactor(material): twenty-one capability mixins, the base still composes them all`.

### W1 — consumers narrow by capability
- Every production call site in Appendix C adds `MixinApi.has<X>(m)` before the read and replaces the
  sentinel idiom with the predicate (`getEdibility() === true` → `hasEdibility(m)`;
  `getSeasoningDays() ?? 0` → `hasShrinkage(m) ? … : 0`; `getKinetics() ?? null` → predicate).
  Compiles because W0's `Material` still carries everything; this wave is therefore reviewable as
  pure narrowing. `MaterialLogic.isMaterial` → `instanceof Material` (P4).
- Land `scripts/check-material-kinds.ts` arm (a) now, at 0 (kinds do not exist yet, so the census
  is the import rule itself); add `"lint:material-kinds"` to `package.json`.
- Commit: `refactor(material): every consumer narrows by capability predicate`.

### W2a — the kinds and the rows (behavior identical)
- `lib/material/{Mineral,Organic,Plant,Animal}.ts` and the kind classes of Appendix B as
  **placeholders extending the still-full `Material`** (`class Metal extends Mineral {}`), so no
  mixin is composed twice. `Muscle.ts` → `extends Flesh`; arcana `PotionMaterial` → `extends Drink`;
  delete `ConsumableMaterial`, `OdorousMaterial`, `OdorousConsumableMaterial`, `RadioactiveMaterial`
  (uranium → `RadioactiveMetal`) and the twin `platform/idea/material/Material.ts`
  (re-point `lib/husbandry/Producing.ts:85` to the base).
- Run the codemod (D4) over all 37 packs; commit its report into the wave's commit message body;
  resolve each reported row by a child class or a recorded move-up. Fix the content defects here:
  delete trade-dyeing's duplicate `iron` (its mordant `chemistry` moves to `element/iron`), strip
  metals' `waterAbsorptionCapacity`, `edibility` off lye/saltpeter/glycerin (now by kind), halite +
  salt → `EdibleSalt`, hard soap's `seasoningDays` → a `kinetics` cure on `Soap`.
- Gate arms (b) orphan = 0 and (c) sentinel = 0 land green here. B4: grep every retired class path
  across `packages/content` — zero hits.
- Commit: `refactor(material): the tree of kinds; every row names its kind and authors only what it has`.

### W2b — the cut
- Each kind composes exactly its mixins (Appendix B); the base `Material` composes **none**. Compile
  errors are the consumers W1 missed — fix each by narrowing, never by widening a host.
- Gate arm (d) measured and its ceiling written; `ORPHAN_DATA_KEY_CEILING` lowered to the new count.
  `pnpm -C packages/server lint:family` green; `test:near` + every touched pack's vitest green.
- Commit: `refactor(material): the base keeps only what every material has`.

### W3 — the wiki and the docs
- `lib/wiki/components/materials.ts`: `<materials capability="Combustion"/>` and
  `<materials kind="Metal"/>` list the catalogue's rows (name, pack, the capability's headline value)
  — the gate's one allowlisted kind reader.
- Pages in `packages/content/platform/content/wiki/guide/material/`: one per capability (what the
  property means, its real-world anchor, the fields, the listing), one per chemical kind, one per
  kind; arcana's `Potion` page in its own pack's wiki. Existing per-material pages (rubber, lye,
  glass) keep and link up.
- Docs: `docs/subsystems/race.md § Material substrate` rewritten for the tree (the 0-until-authored
  sentence at line ~120 is now false), `mixins.md` (the noun convention), `lint-family.md` (the new
  gate), `fire.md`/`spoilage.md`/`ceramics.md`/`forestry.md` one-line pointers where they name a
  getter; CLAUDE.md map line left to the sweep.
- Commit: `docs(material): a page per capability, chemical kind and kind`.

### W4 — the drive and the walk
- The wire drive (D7) and the browser walk; make every checkpoint fail once (B2); run the drive
  against a world built fresh from the packs; append the drive record to this plan.
- Commit: `test(material): the decomposition drive`. Then `pnpm test` once, MR opens READY.

## Reachability wiring

No new verb, affordance or arg gate — the build adds no capability a player reaches. The five links
for what it does add: **data** — every row names a kind that resolves (inv. 3) and authors only
declared fields (gate b); **load** — `MaterialCatalogue` warms by infix, unchanged, and the wiki
component reads it on use; **affordance of the wiki** — each page is linked from the material
guide index (`main.yaml`/`guide.yaml` in the platform pack) so it is reachable, not orphaned.

## Acceptance-criteria coverage

| AC | waves |
|---|---|
| reads/smells/tastes/burns/melts/spoils as before, except defects | W0–W2b (behavior-identical ladder), proved by drive steps 1–6, 11 |
| no row says "not applicable"; a lacking capability is absent | W2a + gate arms (b)(c) |
| lye not food; salt is; one iron | W2a defects; drive step 7 |
| a new material of an existing kind = one row, no code | W2a (kinds) + drive step 10 |
| wiki: one page per capability, chemical kind, kind, each listing | W3; drive step 9 |
| fresh world runs the drive, and after restart | W4 steps 1–11 |

## Test & gate strategy

- Unit: per-mixin tests (W0); kind composition snapshot test (`platform/idea/material/__tests__/kinds.test.ts`:
  each kind's mixin set equals Appendix B); gate self-tests (fixtures for each arm); the component's
  render test; arcana's `PotionMaterial` test on the new base.
- Drive pace (requirements): steps 1, 2, 7, 8, 9 `instant`; 3, 4, 6 `short`; **5 `staged`** — the
  kiln at firing temperature by the wizard `eval` jurisdiction (precedent: ceramics drive); **10 `staged`**
  — a new row installed at runtime through the CMS template save → go-live seam
  (`docs/subsystems/cms.md § the save go-live split`), then `smell`/`eat`; **11 `staged`** — the
  world restart via the wire harness's restart seam. All eleven are the **blocking drive**; no soak
  (nothing clock-dependent). `pnpm test` at code-complete and at `/finalize` only.

## Risks & opens

- **W2b compile fan-out** (~100 sites) is the main risk; W1 absorbs it in advance and W2b should be
  a short list. A site that cannot narrow (reads a capability on an arbitrary `Material`) is a design
  finding — stop and record, do not widen a kind.
- **Build-4 drift**: if build-4 merges with more `getBurning`/`Odorous` readers than its W5 state,
  W0 picks them up; re-run Appendix C's grep on the merged tree first.
- **The codemod's report size** is unknown until run (expected tens of rows: perishable foods,
  toxic non-spirits, acid waters). Each is a cheap leaf; none reopens the tree.
- **`ORPHAN_DATA_KEY_CEILING`** may *rise* if a non-material row somewhere is counted differently
  after the twin's deletion — it must not; investigate before touching the constant.
- **Wiki volume** (~52 pages): prose stays short; the listing does the work.
- Owner's eye: D1's renames of build-4's two names; D8 (`burning` to Combustion); D9 (retiring
  `edibility`); deleting the `Material` twin (D2).

## Deferred seams

- Folder sweep (199 top-level rows into kind folders) → `place-taxonomy-slate` § The material folders.
- Species / maturation-by-mechanism / `MATURATION_MECHANISMS` / dead fields → `material-decomposition-slate` § 7.
- Data-gap burn-down, printed per pack by gate arm (d) → slate § 8.6 (each trade owns its rows).
- Biome tree → `biome-normalization-slate`.

## Critical files

`lib/material/Material.ts` (build-4) · `lib/material/Odorous.ts` · `lib/material/Radioactive.ts` ·
`lib/butchery/Muscle.ts` · `platform/idea/material/*.ts` · `packages/content/arcana/src/idea/material/PotionMaterial.ts` ·
`lib/mixin.ts` (277, 854, 902) · `api/mixin.ts` (~1884) · `platform/idea/MaterialCatalogue.ts` ·
`platform/idea/api/MaterialLogic.ts` (912) · `platform/idea/TemplateApplier.ts` ·
`scripts/pack-roots.ts` · `scripts/check-instanceable-placement.ts` (inv. 12) ·
`lib/wiki/components/composition.ts` · `docs/subsystems/race.md` § Material substrate ·
`docs/lint-family.md` § census, then ratchet · `docs/subsystems/templates.md` § Inheritance.

## Appendix A — field → capability (the census's map, regenerable)

A value is a **sentinel** iff `0` · `false` · `null` · `''` · `[]` · `{}` · a toxicity entry with
zero `amount`/`dose`. Prose fields (`name shortDescription longDescription keywords register
appearance tags primaryKeyword description details illustration plural`) are never capability fields.

| capability | fields (methods) |
|---|---|
| **base** | density · thermalConductivity · specificHeat · electricalConductivity (getEffusivity) |
| Combustion | heatOfCombustion · autoignitionTemperature · flammableLimit · combustionImparts · combustionProducts · ashFraction · alkaliShare · smokePoint · **burning** (D8) |
| Fusion | meltingPoint · latentHeatOfFusion · castTemplate · drainSetting · chillsTo · ruinedByFreezing (chilledIn, castShrinkage) |
| Volatility | boilingPoint · latentHeatOfVaporization · vapourLPerLPerHour · vapourMaterial · vaporizesAboveK |
| Solidity | hardness · toughness · elasticity · cleavability · thermalExpansion · brokenTemplate |
| Porosity | waterAbsorptionCapacity · wetStrength · soddenTemplate (permeability, wetProperty) |
| Edibility | tastes · nutrients (dietary) · nutrientAmounts · servingKg — `edibility` retired (D9) |
| Toxicity | toxicity |
| Perishability | spoilActivationEnergy · waterActivity |
| Acidity | ph · leaches · corrosiveTo (acidAttack, corrodeOnContact) |
| Solution | solubility · crystallizesTo · filteredTo · solidsKgPerL · boilingPointElevation · concentratesTo · purifiedByBoiling (solubilityAt, solidsMassFraction, boilingPointAt) |
| Kinetic | kinetics · formTemplates |
| Shrinkage | seasoningDays · greenShrinkage |
| Detergency | cleanser (getCleanserPath) |
| Coating | laysCoat · coatWord · weatheringMPerGameYear · pigment · adhesive |
| Optics | lightAbsorption |
| Tissue | biologicalSource |
| Odor | smells |
| Radioactivity | halfLife · decayMode · _decayProductPath |
| Muscle | work |
| Element | symbol · atomicNumber · molarMass · chemistry |
| Compound | formula · molarMass · chemistry |
| Mixture | composition (+ folded constituents) (elementalComposition, containsElement, waterShare) |

## Appendix B — the kinds, their composition and the placement rules

Composition is the decided tree (slate § 7¾) + the host table; `(+…)` marks a one-mixin child.
Counts are the census's leaf assignment (386 rows).

```
Material                      base only                              lib/material (abstract)
├ Mineral                     —                                      lib
│ ├ Metal (17)                Solidity Fusion Volatility
│ │   ElementalMetal (+Element) · Alloy (+Mixture) · RadioactiveMetal (+Radioactivity, 1) · ToxicMetal (+Toxicity)
│ ├ Stone (29)                Solidity Porosity
│ │   Ore (+Mixture) · Clay (+Kinetic) · Ceramic (16, nothing added) · Glass (1: Fusion Optics)
│ ├ Salt                      Compound Solution Acidity        EdibleSalt (+Edibility: halite, salt)
│ ├ Lye                       Acidity Solution Detergency Toxicity
│ ├ Soap                      Detergency Kinetic
│ ├ Water (9)                 Compound Fusion Volatility Solution Edibility
│ └ Gas (10)                  Volatility
└ Organic                     Odor                                   lib
  ├ Plant                     Tissue                                 lib
  │   Wood (18) Solidity Porosity Combustion Shrinkage Kinetic · Fiber (16) Solidity Porosity Combustion · Herb (14) Perishability
  ├ Animal                    Tissue                                 lib
  │   Flesh (19) Edibility Perishability Solidity → Muscle (+Muscle, 11) · HideHorn (14) Solidity Porosity
  ├ Food (60)                 Edibility          → Drink (56, nothing; D11) → Spirit (13) Combustion Toxicity
  │                                                 arcana: PotionMaterial extends Potable(Identifiable(Arcane(Drink)))
  ├ FatOilWax (12→9)          Combustion Fusion
  ├ Polymer (latex, rubber, compounded-rubber, ebonite, rubber-scorched)  Solidity Kinetic Combustion
  ├ SolidFuel                 Combustion          (coal coke charcoal peat half-burnt-wood sawdust ash spent-ash sulfur)
  ├ Oil                       Combustion Fusion Volatility  (asphalt coal-tar crude-oil gasoline lamp-oil lubricating-oil naphtha pine-gum turpentine turpentine-vapour)
  ├ PigmentPaint              Coating             (glaze/*, iron-gall-ink printing-ink lead-white-flake, paints, pigments)
  ├ Glue                      Coating Fusion Kinetic
  └ Residue (12)              nothing
```

**Placement rules** (the order matters; `p` = path under `/idea/material/`, `n` = leaf name):
`potion/*` → PotionMaterial · `gas/*` → Gas · `element/*`, `alloy/*`, `iron` → Metal children (carbon → Stone) ·
`tissue/muscles/*` → Muscle; `muscle flesh fish-flesh offal stew-meat gut casing vell` → Flesh ·
`wood/*`, `pit-oak` → Wood · `glaze/*`, or authors a Coating field (not chalk / milk-of-lime) → PigmentPaint/Glue by `adhesive` ·
explicit lists: Water `water ice salt-water fouled-water tainted-water bittern saltpeter-liquor alum-liquor soda-water` ·
Salt/Lye/Soap from `lye caustic-lye vitriol washing-soda quicklime alum potash pearl-ash black-salts saltpeter halite salt hard-soap hard-soap-curd hard-soap-paste soap-paste soft-soap glycerin tannin milk-of-lime` (soaps → Soap; alkalis → Lye; the rest → Salt; glycerin/tannin/vitriol → the report) ·
Stone `compost potting-soil drift loam sand clay alluvial-clay fireclay fullers-earth marl ochre-clay clay-mineral plaster cast-plaster plaster-slurry bone-meal batch chalcopyrite goethite malachite siderite quartz granite gypsum limestone slate chalk eggshell` (clays → Clay; ores → Ore) ·
Ceramic `brick ceramic clinker concrete earthenware earthenware-reduced porcelain refractory stoneware stoneware-reduced terracotta terracotta-reduced filter-stoneware grog breeze slip` · Glass `glass` ·
Fiber `flax-straw hemp-straw rotted-flax rotted-hemp bleached-linen linen hemp jute canvas rubberized-cloth paper board pulp cane-fibre rushes brushwood` ·
Herb `madder woad weld kermes greywort-root wardmoss willow-bark oak-bark flax-seed mulberry-leaf hay mint saffron juniper` ·
HideHorn `leather rawhide horn bone hog-bristle hide-scraps fish-skin textile/wool wool raw-silk silk cocoon-shell silkworm-egg down blood` ·
FatOilWax `animal-fat olive-oil tallow beeswax paraffin-wax leaf-fat` · Polymer `latex raw-rubber rubber compounded-rubber ebonite rubber-scorched` ·
SolidFuel / Oil as listed above · Residue `sweepings byre-muck manure frass spent-grain stillage pomace ale-lees lager-lees wine-lees skimmings` ·
then by capabilities: edible + combustible + toxic → Spirit; edible and in the drinks list (`ale cask-ale lager wort lager-wort mead cola tonic ginger-beer grapefruit-soda red white sparkling dry-vermouth sweet-vermouth aperitivo bitters bitter-liqueur orange-liqueur wash grain-wash light-rum-wash dark-rum-wash distillers-wort grain-distillers-wort light-rum-wort dark-rum-wort red-must white-must honey-must willow-tea ward-water grey-draught antivenin coffee`, `*-juice`, `*milk*`, `whey buttermilk cream churned-cream birch-sap maple-sap simple-syrup fermented-honey`) → Drink; edible → Food; anything else → **report**.

## Appendix C — consumer files per capability (master; re-grep after build-4 merges)

- **Fusion**: `lib/bulk/Bulkable` `lib/fire/Burner` `lib/material/Faced` `lib/mould/Mould` `lib/thermal/Meltable` `lib/thermal/Thermal` `lib/retail/Stock` `platform/idea/api/CraftingLogic` `platform/thing/IceBlock` `trade-glass:thing/Gather` `trade-glass:thing/Melt` `trade-smelting:thing/Die` `trade-smelting:idea/cmd/smelting/SmeltController` `trade-carpentry:lib/PatternStock`
- **Volatility**: `lib/fire/Burner` `lib/thermal/Thermal` `lib/cleanliness/CleanserUse` `lib/material/Compounding` `platform/idea/api/BulkableLogic` `platform/idea/api/CraftingLogic` `trade-textiles:thing/Copper`
- **Combustion**: `lib/fire/Burner` `lib/fire/Combustible` `lib/material/Tangible` `platform/idea/api/FireLogic` `platform/idea/api/CraftingLogic` `platform/thing/Oven` `trade-sugar:behavior/refines`
- **Edibility**: `lib/husbandry/Bonded` `lib/material/Tangible` `lib/material/CompositionShare` `lib/maturation/Maturing` `lib/metabolism/BlendLabel` `lib/metabolism/Metabolic` `lib/metabolism/NutritionLabel` `lib/metabolism/Palatable` `lib/mould/Mould` `platform/idea/api/CraftingLogic` `platform/idea/api/SpeciesLogic` `platform/idea/api/MaterialLogic` `platform/idea/cmd/crafting/PourController`
- **Toxicity**: `lib/material/Freshness` `lib/metabolism/BlendLabel` `lib/metabolism/NutritionLabel` `lib/respiration/Respiration` `platform/idea/cmd/medical/DoseController` `water:idea/reading/WaterReading`
- **Perishability**: `lib/material/Freshness`
- **Solidity**: `ground:idea/Deposit` `lib/material/Integrity` `lib/material/Faced` `lib/butchery/Cut` `lib/pump/Pumping` `lib/slot/Wearable` `platform/idea/api/MaterialLogic` `platform/idea/api/BulkableLogic` `platform/idea/api/CraftingLogic` `platform/idea/cmd/combat/ShootController` `platform/idea/cmd/inventory/ThrowController` `platform/thing/equipment/Weapon` `platform/thing/Rope` `trade-quarrying:lib/Working` `trade-quarrying:thing/Block` `trade-smelting:thing/Bell` `trade-smelting:thing/Die` `trade-forestry:idea/cmd/forestry/RiveController`
- **Porosity**: `lib/material/Faced` `lib/material/Tangible` `lib/material/Integrity` `lib/storage/Store` `lib/wetness/Wet` `lib/slot/Attired` `lib/slot/Wearable` `lib/config/AppSettings` `api/material` `platform/idea/api/ElectricityLogic` `platform/idea/api/MaterialLogic`
- **Acidity**: `lib/bulk/Bulkable` `api/condition` `api/material` `platform/thing/equipment/Garment` `platform/idea/api/MagicLogic` `platform/idea/cmd/inventory/ThrowController` `trade-chandlery:thing/Hopper` `trade-chandlery:thing/SoapKettle`
- **Solution**: `lib/material/Faced` `lib/maturation/Maturing` `lib/thermal/Thermal` `lib/bulk/Bulkable` `platform/idea/api/BulkableLogic` `platform/idea/reading/DensityReading` `trade-fuel:thing/Ash` `trade-painting:thing/PaintPot` `trade-potash:thing/IronPot` `trade-sugar:behavior/refines` `trade-sugar:idea/reading/BoilReading` `trade-sugar:thing/Copper`
- **Kinetic**: `lib/craft/Assembled` `lib/craft/Forming` `lib/material/Faced` `lib/material/Kinetics` `lib/mould/Mould` `lib/thermal/Thermal` `platform/thing/GlazeTub` `platform/thing/Rag` `trade-quarrying:thing/Clay`
- **Shrinkage**: `lib/craft/Assembled` `lib/material/Seasoning`
- **Detergency**: `platform/idea/Cleanser` `platform/idea/cmd/crafting/WashController` `platform/thing/Tariff`
- **Coating**: `lib/description/Marked` `lib/material/Faced` `lib/material/Paint` `lib/craft/Assembled` `platform/idea/api/CraftingLogic` `platform/idea/cmd/crafting/PaintController` `platform/idea/cmd/perception/SurveyController` `platform/thing/GlazeTub` `platform/thing/Sheet` `trade-painting:thing/PaintPot`
- **Optics**: `lib/biome/Atmospheric` · **Tissue**: `platform/idea/reading/ChemistryReading`
- **Mixture / identity**: `lib/material/Composition` `lib/material/Compounding` `lib/mould/Mould` `platform/idea/api/MaterialLogic` `platform/idea/api/CraftingLogic` `platform/idea/reading/ChemistryReading` `trade-mining:thing/Ore` `trade-smelting:idea/cmd/smelting/SmeltController` `trade-dyeing:idea/cmd/dyeing/DyeController`

## Drive record

*(appended at build time)*
