# Materials response — implementation plan

**Feature:** materials-response · **Branch slug:** `materials-response` (or `matresp`)
**Seeds from:** `docs/requirements/materials-response-requirements.md` (closed spec), `docs/slates/deferred-rpg/materials-response-slate.md` (Settled 1–11, taxonomy grid, tests-gating list).
**First consumer wired:** the harm driver (`docs/subsystems/harm.md`).
**Artifact lifetime:** ephemeral; retired at pre-merge sweep.

This plan is self-contained: a fresh build agent who has read the requirements doc + `harm.md` + `vitals.md` + `crafting.md` + `slot.md`/`embodiment.md` + `quantities.md` + `app-settings.md` can execute it without the originating conversation.

---

## 0. Orientation — what already exists (verified)

- **`Material`** (`lib/material/Material.ts`) carries grounded `Quantity` props (`density` kg/m³, `specificHeat` J/(kg·K), `thermalConductivity` W/(m·K)) with the getter/setter + strict-unit-throw + `persistentFields` + `fieldMarshallers: QuantityMarshaller.pathFor(unit)` discipline. It has an explicit tombstone comment (lines 422–424): *"Damage-resistance accessors removed … deferred until that system lands."* This build lands it — as `hardness`/`toughness`, NOT resurrected 0–1 scalars.
- **Value-object precedents.** `Grade` (`lib/craft/Grade.ts`, ordinal band + `GRADE_BANDS` vocab + `of()`), `ToolCapability` (`lib/craft/ToolCapability.ts`, closed vocab tuple + type + static holder + `isCapability`), `WeatherType` (`lib/weather/WeatherType.ts`, vocab + `WEATHER_PROFILES` **data table** + dials, consts-and-types-only, behavior on the logic singleton). These three are the exact shapes `Construction` copies.
- **Carrier pattern.** `TangibleMixin` (`lib/material/Tangible.ts`) stores `_materialPath` string + resolve-on-read `getMaterial()` via `findByTemplatePath` + `fieldMarshallers`. `ConstructedMixin` mirrors this.
- **Reuse mixins.** `WearableMixin` (`lib/slot/Wearable.ts`, already carries `clo`), `GradedMixin` (`lib/craft/Graded.ts`, band-word persist + `getGrade(): Grade` contract), `ToolMixin` (`lib/craft/Tooled.ts`, **0..1 `condition` + `wear(amount)` wear-on-use** — this IS the condition seam).
- **Coverage seam.** `SlotSpec.covers?: string[]` (`lib/slot/Slotted.ts`) + `BodyPlan.getSlotsCovering(partKey)` (`lib/species/BodyPlan.ts:405`, filters slots whose `covers` includes the part). `BodyPart.tissues: {tissuePath, mass}[]` is where the residual meets tissue (`tissuePath` → a `Material` via `findByTemplatePath`).
- **Harm.** `ConditionApi.inflict(target,{mechanism,site,energy})` → `ConditionLogic.inflict` builds a `Trauma`, `severityFromEnergy(energy)` magnitude-only, `mechanismToType()` bijective switch (sharp→laceration, blunt→contusion, crushing→fracture, thermal→burn, tearing→avulsion), `isSiteCoveredImpl` binary presence. `Mechanism`/`MECHANISMS` + `TraumaType` + `TRAUMA_BEHAVIOR` live in `lib/vitals/Condition.ts`. `severityFromEnergy` is the named deferred seam.
- **Api/logic split.** Every Api is `api/<feature>.ts` (thin static forwarding shell, ends `SecurityApi.decorateApiClass`) → `obj/api/<Feature>Logic.ts` (`extends ApiLogic`, `@internal`, methods `@CallSecurity(FromModule('/api/<feature>#<Feature>Api'))`, HMR-able at `/obj/api/<feature>`). `MaterialApi`/`MaterialLogic` is the closest precedent (a static Api reading `Material`) and even reserves `damageResistance(...)` as a named future combat surface.
- **`analyze` verb** (`cmd/perception/analyze.yaml`) already exists with channel subcommands (`light`, `chemistry`, `sky`, `weather`, `address`) — the home for the "what would this do?" preview.
- **Lint precedent.** `scripts/check-gate-strings.ts` (standalone WARN/CI script, `EXIT_ON_FINDINGS`) — the shape the does-nothing lint copies.
- **AppSettings.** `AppSettingKeys` (`lib/config/AppSettings.ts:30`) is a flat const map of dotted keys (`reactions.threshold`, …); values seeded from `mud/config/app-settings.yaml`; read via `AppApi` sync-cached. No code defaults.

---

## 1. Collisions, tensions, and resolved-not-silently decisions (surfaced upfront)

1. **`condition` "primary new field" vs "the existing ToolMixin wear seam."** These conflict on their face — `ToolMixin` *already* owns a 0..1 `condition` + `wear()`. **Resolution (recommend):** reuse `ToolMixin` for condition + wear; `condition` is "new" only in that it becomes a *consumer of the response function* (it now scales height), not a new field. Weapons are legitimately tool-like; **armor composing `ToolMixin` inherits an inert `capabilities: []`** — a minor smell, called out, alternative = lift `condition`/`wear` into a leaner shared base later (deferred cleanup, not this build). Do **not** invent a parallel condition field.
2. **"Unify the mechanism vocab into the channel vocab" vs "burn stays a passthrough."** The channel set (`edge/point/blunt`) is the single source of truth for the **response-transacting** path. But harm ships `thermal`→burn and `tearing`→avulsion, and their channels (`heat`, a tearing channel) are explicit non-goals. **Resolution:** `InflictSpec.mechanism` becomes an `InsultKind = Channel | 'thermal' | 'tearing'`. A `Channel` value runs the full stack→tissue response resolution; `'thermal'`/`'tearing'` take the **legacy magnitude-only passthrough** (direct → burn / avulsion), documented as the seam that folds into `heat`/tearing channels when those land. This honors *both* the unification goal (channels are the SSOT for response) and the burn-passthrough non-goal, and keeps harm's shipped burn/avulsion tests green. Flag for user confirmation; it is a resolution, not a contradiction.
3. **Construction home — RESOLVED (user): the `material` namespace, nothing new minted.** `Channel`, `Construction`, and `ConstructedMixin` all live in the existing `lib/material/` alongside `Material.ts`/`Tangible.ts` — no new `lib/response/` directory. (They join the material cluster; the channel vocab, though cross-cutting, is content to sit under `material`.)
4. **Response Api — RESOLVED (user): extend the existing `MaterialApi`, no new Api.** The response function (`attenuate`/`resolveTrauma`/`previewBand`/`deliverableChannels`) is added to the existing `MaterialApi` (`api/material.ts`) + `MaterialLogic` (`obj/api/MaterialLogic.ts`, gate `/api/material#MaterialApi`, singleton `/obj/api/material`), filling the `damageResistance(...)` surface `MaterialLogic` already reserves. No `ResponseApi`, no `material-response.ts`.
5. **Shape vs magnitude split (constraint: "no magic balance numbers as invariants").** `Construction` ships the **qualitative** per-channel grid (the taxonomy words: deflect/resist/transmit/absorb/fail/moderate/poor — *the shape of the curve*, in code). `AppSettings` ships the **coefficients** each qualitative token resolves to (*the magnitudes*). This is the clean seam that satisfies both "construction owns shape" and "constants → AppSettings." No numeric profile literal ships in `lib/material/`.
6. **`TraumaType` closed-union growth.** `puncture` is added to the union in `lib/vitals/Condition.ts` **and** given a `TRAUMA_BEHAVIOR[puncture]` entry (or an explicit delegate). A closed `Record<TraumaType, …>` won't compile without it — flag: adding the union member without the behavior entry is a type error, so the two land together.
7. **Outside-in stack ordering.** A part can be covered by several worn items (gambeson + mail + plate). Nothing in the substrate today orders them. **Resolution:** derive depth from the construction (a per-armor-form canonical `layerDepth`: padded innermost … plate outermost) so authors never author a number — the form implies depth (Settled 11 "authors author concepts"). Optional explicit override reserved but unused v1. Resolution sorts covering occupants outer→inner by construction depth.

---

## 2. Architecture — the resolution model (the spine every phase serves)

```
inflict(target, { mechanism: Channel, site, energy })
  │
  ├─ resolve covering stack at `site`  (getSlotsCovering → occupants that are Constructed+Wearable)
  │     sort outer→inner by construction layerDepth
  │
  ├─ for each layer (outer → inner):
  │     MaterialApi.attenuate(channel, energy_residual, material, construction, grade, condition)
  │        token   = construction.responseFor(channel)         // deflect/resist/transmit/absorb/fail/…  (SHAPE, code)
  │        base    = AppSettings[ response.attenuation.<token> ] // MAGNITUDE (AppSettings)
  │        height  = materialScale(material.hardness, material.toughness, channel)  // steel > bronze
  │        atten   = clamp01(base × height × gradeScale × conditionScale)
  │        energy_residual ×= (1 − atten)                        // residual passes inward
  │     (channel may also mutate: point defeating mail still arrives as point; edge fully deflected → residual≈0)
  │
  └─ residual meets tissue material of the part:
        MaterialApi.resolveTrauma(channel, energy_residual, tissueMaterial, partHasBone)
           edge  → laceration     (residual<noWound ⇒ no trauma: "deflected")
           point → puncture
           blunt → residual ≥ fractureThreshold && partHasBone ? fracture : contusion  ("transmits through plate → fracture")
        → { type: TraumaType, severity }   → build Trauma → afflict (unchanged downstream)
```

The **same** `MaterialApi` is read from both sides of a blow (armor mitigation = the per-layer attenuation loop; trauma generation = the tail meeting tissue) — the Settled-6 "one function, two consumers." Weapon delivery is the *symmetric dual*: an implement's construction `deliveryFor(channel)` → primary/secondary/none decides which channels it *can* present; v1 the channel driving a given `inflict` is **explicit** at the call site (Settled: no auto-pick, no playstyle).

---

## 3. Phases

Each phase is independently testable (Vitest, colocated `__tests__/`). Ordering dependencies noted per phase; the dependency graph is `P0 → P1 → P2`, `P1 → P3`, `{P2,P3} → P4`, `{P2,P3} → P5`, `P4/P5 → P6`.

---

### Phase 0 — Channel vocabulary + Material mechanical properties
*Foundational, no dependencies. Two independent, small, safe pieces.*

**Add**
- `packages/server/src/mud/lib/material/Channel.ts` — the shared mechanism-channel vocabulary. `export const CHANNELS = ['edge','point','blunt'] as const;` `export type Channel = (typeof CHANNELS)[number];` + a `Channels` static holder with `ALL` + `isChannel(s): s is Channel` (the `ToolCapabilities` shape). Header documents "additively growable — crush/heat/cold/corrosion are new columns defaulting sensibly," and that it is the one vocabulary weapon-delivery, armor-resist, and tissue-failure all transact.
- `packages/server/src/mud/lib/material/__tests__/Channel.test.ts`.

**Edit**
- `lib/material/Material.ts` — add grounded `hardness` and `toughness` as strict `Quantity`s **exactly** copying the `density`/`specificHeat` pattern: private backing field with `Quantity.of(0, <unit>)` default, `protected get/set` with the `instanceof Quantity && unit ===` throw, public `getHardness`/`setHardness` + `getToughness`/`setToughness`, entries in `persistentFields`, and `fieldMarshallers: QuantityMarshaller.pathFor(<unit>)`. **Decision the implementer makes:** the units. Recommend `hardness: Quantity<'MPa'>` (indentation hardness / pressure-shaped) and `toughness: Quantity<'MJ/m³'>` or `'kJ/m²'` (fracture toughness / energy-absorption-shaped) — both real, tabulated, physically honest, and Quantity-catalog-checked. Confirm the units exist in `mud/config/quantity-tags.yaml`; if not, add the tag rows (a `quantity-tags.yaml` edit is content, not a code default). Remove the lines-422–424 tombstone comment.
- `mud/config/quantity-tags.yaml` — add `MPa` / `MJ/m³` tag tables if absent.
- Seed hardness/toughness onto the handful of demo materials (steel, bronze, iron, leather/hide, padding/cloth, and the tissue Materials the demo exercises — flesh/muscle/bone) in their existing `content/`/seed files. **Materials stay content**; this authors only the roster the demo needs.

**Tests (→ AC "Material mechanical properties are grounded Quantities")**
- `Material.test.ts` additions: hardness/toughness round-trip through the marshaller (numeric / `{value,unit}` / string authoring shapes → strict Quantity at the accessor); wrong-unit throws.
- Channel vocab: `isChannel` narrowing, `ALL` completeness.

**Risks:** low. Only real risk is picking a Quantity unit the catalog lacks — mitigated by the config edit. No behavior change to existing consumers (new fields default to zero-Quantity, read by nobody until P2).

---

### Phase 1 — The `Construction` value-object + the two v1 vocabularies + profiles
*Depends on P0 (Channel).*

**Add** (all in `lib/material/`)
- `Construction.ts` — the per-domain value-object (the `Grade` + `WeatherType`-data-table hybrid). Contents:
  - `ARMOR_FORMS = ['plate','mail','padded','hide'] as const` + `WEAPON_DELIVERY_FORMS = ['bladed','pointed','hafted'] as const`, their union type `ConstructionForm`, and a `CONSTRUCTION_FORMS` validation array.
  - A `domain` discriminator per form (`'armor' | 'weapon-delivery'`).
  - The **qualitative** profile tables (shape, in code — NO magnitudes):
    - `ARMOR_PROFILES: Record<ArmorForm, Record<Channel, ResistToken>>` where `ResistToken = 'deflect'|'resist'|'transmit'|'absorb'|'moderate'|'poor'|'fail'` — transcribing the slate's taxonomy grid verbatim (plate: edge=deflect, point=resist, blunt=transmit; mail: edge=resist, point=fail, blunt=transmit; padded: edge=poor, point=poor, blunt=absorb; hide: edge=moderate, point=poor, blunt=moderate).
    - `DELIVERY_PROFILES: Record<DeliveryForm, Record<Channel, DeliveryToken>>` where `DeliveryToken = 'primary'|'secondary'|'none'` (bladed: edge=primary, point=secondary, blunt=none; pointed: point=primary, edge=secondary, blunt=none; hafted: blunt=primary, edge=none, point=none).
    - `LAYER_DEPTH: Record<ArmorForm, number>` (padded=0 … plate=3) — canonical outside-in depth (§1.7).
  - The `Construction` class: `private constructor(form)`, `static of(form): Construction` (throws on unknown), `isForm(s)`, `getForm()`, `getDomain()`, `responseFor(channel): ResistToken` (armor only), `deliveryFor(channel): DeliveryToken` (weapon only), `deliversPrimary()`/`deliversAny()` derived readers, `getLayerDepth()`. Immutable; persisted by hosts as the form word (the `Grade` pattern).
- `ResponseProfile.ts` *(optional split; may live in `Construction.ts`)* — the `ResistToken`/`DeliveryToken` types + the `ChannelResponse` output shape (`{ token, attenuation }`), if the type surface grows enough to want its own file. Keep in `Construction.ts` unless it earns splitting.
- `__tests__/Construction.test.ts`.

**Tests (→ AC "channel × construction × material resolves believably" foundations)**
- Every form resolves; `of()` throws on junk; `isForm` narrows.
- The grid is complete (every `ArmorForm × Channel` has a token; every `DeliveryForm × Channel` has a delivery token) — a table-completeness test (the "does-nothing" lint's compile-time cousin).
- `responseFor`/`deliveryFor` domain-guard (calling `deliveryFor` on an armor form throws or returns none, per chosen contract).
- Layer depths strictly ordered.

**Risks:** low–medium. The one design commitment is the token vocabulary and the grid transcription; getting a cell wrong surfaces loudly in P4's acceptance tests. No integration yet.

---

### Phase 2 — The response function, homed as a static Api (single-layer)
*Depends on P0, P1. The physics core, tested in isolation with no armor objects, no harm.*

**Extend the existing `MaterialApi` / `MaterialLogic`** (no new Api — the response function lands on the material namespace, filling `MaterialLogic`'s reserved `damageResistance(...)` surface).
- `packages/server/src/mud/api/material.ts` — add to the existing `MaterialApi` static surface (already ends `SecurityApi.decorateApiClass(MaterialApi)`; keep its `logic()` forwarder to `/obj/api/material`):
  - `attenuate(channel, energy, material, construction, grade, condition): { residualEnergy, channel }` — one layer.
  - `resolveTrauma(channel, energy, tissueMaterial, partHasBone): { type: TraumaType, severity } | null` — the tissue meeting (null = no meaningful wound / deflected).
  - `previewBand(channel, material, construction, grade?, condition?): OutcomeBand` — the legibility preview primitive (P5 consumes it; landing the pure function here keeps it a single chokepoint).
  - `deliverableChannels(construction): Channel[]` and `primaryChannel(construction)` — the weapon-delivery derivation (P3 consumes).
  - Export the `OutcomeBand` / call-shape types from `api/material.ts`.
- `packages/server/src/mud/obj/api/MaterialLogic.ts` — add the corresponding methods to the existing logic singleton, each `@CallSecurity(FromModule('/api/material#MaterialApi'))`. Internal sub-logic (the `materialScale`, `gradeScale`, `conditionScale`, band-mapping) as **module-private free functions** (the `ConditionLogic`/`WeatherLogic` shape — no intra-singleton `this.x()` to trip the gate). Reads coefficients from `AppApi`.
- Extend the existing material Api/logic test suites (e.g. `api/__tests__/material.test.ts` / the `MaterialLogic` suite) with the response-function cases *(or a colocated `material-response` suite)*.

**Edit**
- `lib/config/AppSettings.ts` (`AppSettingKeys`) + `mud/config/app-settings.yaml` — add the tuning keys under a `response.*` namespace: `response.attenuation.deflect|resist|transmit|absorb|moderate|poor|fail` (token → 0..1 base fraction), `response.material.hardnessRef`/`toughnessRef` (the reference magnitudes height scales against, so steel>bronze falls out of the Quantity ratio), `response.blunt.fractureThreshold`, `response.noWoundThreshold`, `response.severityPerResidual` (replaces the harm `SEVERITY_PER_ENERGY` role at the tissue tail), `response.grade.*` / `response.condition.*` height-scale bounds. All seeded in yaml; **no code defaults** (the `AppSettingsSeeder` discipline).

**Key decisions the implementer makes**
- The exact `materialScale` form (recommend a normalized ratio vs the reference magnitudes, clamped, per-channel weighting — hardness dominates `edge`/`point` deflection, toughness dominates `blunt`/`point` penetration resistance). Keep it a small, documented, pure function; magnitudes in AppSettings.
- `gradeScale`/`conditionScale`: height-only (Settled-4). A masterwork-at-100% and common-at-100% differ; masterwork-at-50% ≈ common-at-100% (AC). Recommend `scale = lerp(min, max, gradeOrdinal/4) × condition` with bounds in AppSettings.
- The `OutcomeBand` vocabulary for the preview (turned / grazes / bites / bites-deep — a small ordinal band, the "bands make the target forgiving" Settled-11 point).

**Tests (→ ACs "channel × construction × material," "grade/condition scale height," "material props read")**
- edge × steel plate (one layer) → near-total attenuation → `resolveTrauma` null (deflect). edge × flesh (no layer) → laceration. blunt × plate → low attenuation → residual high → `resolveTrauma(blunt, high, bone-part)` = fracture. point × mail → `fail` token → residual passes → puncture. edge × mail → `resist` → attenuated.
- Height: steel plate attenuates edge more than bronze plate (same construction, different material) — the AC's "steel plate > bronze plate."
- Grade/condition: same inputs at masterful/100% vs poor/100% vs masterful/50% land in the expected bands; masterwork-at-50% ≈ common-at-100%.
- `deliverableChannels(bladed)` = [edge(+point)], `(hafted)` = [blunt].
- Gate: `MaterialLogic` methods reject a non-`MaterialApi` caller (the `FromModule` gate holds).

**Risks:** medium. This is where the math lives, but it is *pure and isolated* — no persistence, no world clock, fully unit-testable. The risk is choosing scale forms that make the acceptance bands come out right; mitigated by driving the tests directly from the taxonomy grid + AC examples.

---

### Phase 3 — The `Constructed` carrier + emergent armor + weapon-delivery implement
*Depends on P1 (Construction). Can proceed alongside P2.*

**Add**
- `lib/material/Constructed.ts` — `ConstructedMixin` (module category: Mixin). Mirrors `TangibleMixin`'s carrier shape: `constructionForm: string` persisted field (default `''`), `getConstructionForm`/`setConstructionForm` (validates via `Construction.isForm`), and the inter-Stuff contract `getConstruction(): Construction | null` / `setConstruction(Construction)`. `_mixinName='ConstructedMixin'`, `persistentFields=['constructionForm']`. Header: "the form axis — a material worked into a form; the sibling of `TangibleMixin`'s material axis; composed by armor AND weapons (and later structures)."
- Register in `lib/mixin.ts` (`Mixins.Constructed = 'ConstructedMixin'`) + `api/mixin.ts` (`MixinApi.isConstructed`).
- `obj/Armor.ts` *(or a demo-scoped `domain/…`)* — **there is no `ArmorMixin`** (Settled-4). Armor is an *emergent composition*: `WearableMixin(GradedMixin(ToolMixin(ConstructedMixin(TangibleMixin(DetailedMixin(Thing))))))`. Recommend a **thin concrete `Armor` class** = that stack with no new behavior (the `ToolItem`/`Bandage`/`BrandedBottle` "compose-and-name" precedent), so seeds can author breastplate/helm/gambeson/mail-hauberk/vambraces/greaves as `data:` (material path + constructionForm + grade + slotClaims + covers). Its "armor-ness" is purely the composition; nothing narrows on an `isArmor`.
- `obj/Weapon.ts` (or `MeleeImplement`) — `ConstructedMixin(GradedMixin(ToolMixin(TangibleMixin(DetailedMixin(Thing)))))` (no `Wearable`; wielded, not worn — v1 does not model the hand-slot combat loadout, that's combat-slate). Derives delivered channels from `MaterialApi.deliverableChannels(getConstruction())`. Seeds: dagger (bladed), mace (hafted), spear/sword as the demo needs.
- Seeds under `content/`/`seeds/` for the demo pieces (steel breastplate, mail hauberk, padded gambeson, hide jerkin, steel dagger, steel mace) with `covers` on their slot specs mapping worn slot → `body.*` parts (helm→body.head, breastplate→body.torso, etc.).
- `__tests__/Constructed.test.ts`, `__tests__/Armor.test.ts`, `__tests__/Weapon.test.ts`.

**Edit**
- Body-plan slot specs (the demo species' `BodyPlan` seed) — ensure the wearable coverage slots carry `covers: ['body.torso']` etc. (the seam exists; author the data the demo needs). No code change to `BodyPlan`.

**Key decisions**
- Composition order (mixin outermost/innermost) — follow the established convention (Wearable/Graded outer, carriers inner); verify against an existing multi-mixin `Thing` for the `_mixinName`/`persistentFields` merge behavior.
- Whether `Weapon`/`Armor` are `obj/` engine classes or `domain/` content. Recommend `obj/` for the reusable composition + `domain`/seed data for the specific pieces (mirrors `ToolItem` in `lib/craft/` + bar seeds).

**Tests (→ ACs "weapon delivery," and the object substrate for P4)**
- A dagger `getConstruction()` → bladed → `deliverableChannels` = edge(/point); a mace → blunt. (AC "a dagger delivers edge/point, a mace blunt.")
- `wear()` drops `condition`; `getGrade()` reads the band; `getMaterial()` + `getConstruction()` both resolve on a seeded armor piece.
- Coverage: a worn breastplate's covering slot resolves via `getSlotsCovering('body.torso')`.

**Risks:** low–medium. Mixin composition order is the only fiddly part (persistentFields/`_mixinName` merge) — mitigated by copying an existing deep composition.

---

### Phase 4 — Covering-stack resolution + `ConditionApi.inflict` upgrade (THE KEYSTONE — riskiest)
*Depends on P2 (MaterialApi) + P3 (carriers/coverage). This is the integration phase where the substrate becomes the first consumer's engine, the closed unions grow, and the shipped harm surface is superseded.*

**Edit `lib/vitals/Condition.ts`**
- Add `puncture` to the `TraumaType` union **and** a `PUNCTURE_BEHAVIOR` + `TRAUMA_BEHAVIOR.puncture` entry (a bleeding-capable wound — recommend it shares the laceration clot-gate family but with its own describe; decision: puncture = deep-narrow bleed, delegate to a laceration-shaped behavior). The closed `Record<TraumaType,…>` forces this to land together (§1.6).
- Replace the harm `Mechanism`/`MECHANISMS` vocabulary with the unified model: re-export `Channel`/`CHANNELS` from `lib/material/Channel.ts` as the response-transacting vocab, and define `InsultKind = Channel | 'thermal' | 'tearing'` for `inflict`'s parameter (§1.2). Update the `Trauma.mechanism` field type accordingly (keep recording it raw). Retire the old `sharp/blunt/crushing/thermal/tearing` union.

**Edit `obj/api/ConditionLogic.ts`**
- Rewrite `inflict`: branch on `Channels.isChannel(spec.mechanism)`.
  - **Channel path:** resolve the covering stack at `spec.site` (new module-private `resolveCoveringStack(host, partKey)` → outer→inner list of `{material, construction, grade, condition}` from `getSlotsCovering` → occupants that are `isConstructed && isWearable`, sorted by construction `layerDepth`), fold `MaterialApi.attenuate` through it, then `MaterialApi.resolveTrauma(channel, residual, tissueMaterial, partHasBone)` where `tissueMaterial`/`partHasBone` come from the `BodyPart.tissues` of the site. Build the `Trauma` from the returned `{type, severity}`; a null result = deflected → `afflicted:false` (no wound landed) but a truthful outcome. **Severity AND type now both derive from the response function through the stack.**
  - **Passthrough path** (`'thermal'`/`'tearing'`): the legacy magnitude-only `severityFromEnergy` + direct map to burn/avulsion (documented seam).
- **Delete `isSiteCoveredImpl` + `ConditionLogic.isSiteCovered`** — superseded by the degree resolution (the stack returning residual→tissue IS the coverage-degree read). Retire `mechanismToType` (folded into `resolveTrauma` for channels; the passthrough branch keeps a 2-entry map).

**Edit `api/condition.ts`**
- `InflictSpec.mechanism: InsultKind` (re-export the type). **Remove `ConditionApi.isSiteCovered`** + its `export`/doc. Update the `inflict` doc: severity + type from the response function through the covering stack.

**Edit consumers of the retired surface**
- `domain/lounge/GlassAlley.ts` — the one shipped `isSiteCovered` caller. Rewrite: `inflict` with channel `'edge'` (glass cuts) at the foot site; the barefoot-vs-booted distinction now falls out of the covering stack automatically (a boot = a `Constructed` `Wearable` covering `body.*.foot`), so the explicit `isSiteCovered` gate is deleted — a booted foot's stack attenuates to no-wound, a bare foot lacerates. This is a live acceptance vehicle for "coverage degree, not presence."
- Grep for any other `isSiteCovered` / `Mechanism` / `MECHANISMS` import (`api/condition.ts` re-exports them) and migrate: `sharp→edge`, `blunt→blunt`, `crushing→blunt` (fracture now emerges from blunt-vs-bone), `thermal→'thermal'` passthrough, `tearing→'tearing'` passthrough. Update the harm tests' mechanism strings accordingly.

**Tests (→ the tests-gating list + inflict ACs)** — the acceptance battery, all via `inflict` with no combat loop:
- edge vs flesh → laceration; edge vs a plate-covered site → deflected/no meaningful wound.
- blunt vs flesh → contusion; blunt vs plate-covered → transmits → fracture.
- point vs mail-covered → puncture; edge vs mail → resisted.
- a **mace** (blunt) wounds a plated body an **edge** weapon can't (same target, opposite outcome) — drives both weapon-delivery and armor from real objects.
- **Layering:** padded-under-mail resolves blunt measurably better than mail alone (≥2-layer stack, outside-in).
- **Coverage degree:** a called/aimed hit to an uncovered gap reaches tissue while the covered site turns it; `isSiteCovered` is gone.
- **Regression:** harm's shipped wound/bleed/medic + `GlassAlley.integration.test.ts` still pass (retarget mechanism strings; the reconcile-on-read, clot gate, limp, `assess`/`treat` loops are untouched).
- `puncture` behavior: onset/tick/describe + clot-gate parity.

**Risks: HIGHEST of the build.** This phase (a) mutates two closed engine unions (`TraumaType`, the mechanism vocab), (b) rewrites the single gated harm producer, (c) retires a shipped public Api method (`isSiteCovered`) with a live caller, (d) must keep every shipped harm/medic test green while changing what `inflict` computes, and (e) is where the stack-attenuation algorithm meets real persisted bodies (game-clock, presence-freeze, the `tickedAt` stamp — all must stay untouched). It concentrates every cross-subsystem seam. Mitigations: land P2/P3 fully green first; do the vocab migration as a mechanical grep-and-replace commit *before* the algorithmic rewrite; keep the passthrough branch byte-preserving the old burn/avulsion math so those tests don't move; drive the new tests directly off the tests-gating list.

---

### Phase 5 — The legibility surface (MANDATORY — Settled 11; gates acceptance)
*Depends on P2 (previewBand) + P3 (objects to inspect). Server-authoritative derived projection; the client only renders.*

**The honest client boundary (call it out in the plan + the doc):** the pips and the preview are a **server-computed derived projection** — pure reads over `MaterialApi.previewBand` + `Construction`/`Material`. The server emits them as MML/markup (the `markupAugmenters` pipeline the inspection pane already walks — `getMarkupLong(viewer)`); the **client renders MML it is given and holds zero response semantics** (mirrors the cockpit "client owns zero command semantics" discipline). No new client physics, no client-side profile math.

**Add**
- **Preview** — an `analyze` subcommand: `mud/cmd/perception/analyze.yaml` gains a `response` (or `harm`) subcommand + `obj/command/perception/AnalyzeController.ts` branch → "point a mechanism/implement at a material/construction → the outcome band," rendered from `MaterialApi.previewBand`. The band it prints **must match** the `inflict` outcome for the same inputs (shared `MaterialApi` chokepoint guarantees this — a test asserts equality).
- **Per-item pips** — a `markupAugmenters` contribution on `ConstructedMixin` (the `BrandedMixin` "a product of X" line precedent): renders the derived per-channel profile as pips (`edge ●●●○ · point ●●○○ · blunt ●○○○`) on an item's long description, for author *and* player. Pip fill derives from `previewBand`/profile ordinal. Pure server projection.
- **Does-nothing lint** — `packages/server/scripts/check-does-nothing.ts` (copy `check-gate-strings.ts`'s standalone-WARN/`EXIT_ON_FINDINGS` shape): scans every `Construction` form's profile and flags any construction/implement that produces **no effect against any material/channel** (an armor form that attenuates nothing on every channel, or a delivery form that delivers `none` on every channel). Wire into the lint family / CI (`pnpm lint:*`). Header cross-refs the `check-gate-strings` precedent.
- Tests: `AnalyzeController` preview correctness; pip rendering (MML snapshot); the lint flags a deliberately-inert fixture construction and passes the real roster.

**Tests (→ AC "the legibility surface exists and is correct")**
- Preview band == resolved `inflict` band for identical inputs (the shared-chokepoint invariant).
- Pips render for a seeded armor + weapon, for both an author viewer and a plain viewer.
- The lint catches an inert construction, passes plate/mail/padded/hide/bladed/pointed/hafted.

**Risks:** low–medium. Main risk is the preview/inflict *divergence* if any code path recomputes response outside `MaterialApi` — mitigated structurally by the "go through the Api layer" constraint (single chokepoint) and the equality test. Client work is render-only.

---

### Phase 6 — Subsystem doc + cross-links (finalize-time deliverable; note now)
- **New** `docs/subsystems/materials-response.md`: the three axes (channel / material / construction), the `f(mechanism, material, construction) × grade × condition` response function + its Api home, the outside-in armor stack resolution, the legibility surface, and the named deferred seams (combat playstyle → combat-slate; repair/scrap/reforge economy → crafting; other channels crush/heat/cold/corrosion; tissue-as-construction; ranged/thrown). Document the shape-vs-magnitude split (Construction owns shape, AppSettings owns coefficients) and the `thermal`/`tearing` passthrough seam.
- **Cross-link** from `harm.md` (replace the "Deferred seam — materials-response severity function" note at `severityFromEnergy` with the live pointer; update the coverage section — binary `isSiteCovered` retired) and `vitals.md` (the parked "`Material` mechanism-response … with combat" seam now lands here).
- Per `docs/workflow.md`: the plan + requirements docs retire at the sweep; this subsystem doc is the permanent record. (Written at `/finalize`, noted here so the build agent leaves the doc-sweep hook.)

---

## 4. Ordering dependencies & the riskiest phase

**Dependency graph:** `P0 → P1 → P2`; `P1 → P3`; `{P2, P3} → P4`; `{P2, P3} → P5`; `{P4, P5} → P6`. P2 and P3 can be built in parallel once P1 lands. P4 must not start until P2 and P3 are green.

**Riskiest phase: Phase 4** — the `inflict` upgrade + covering-stack resolution. It is the single point where the build (a) grows two closed engine unions, (b) rewrites the one gated harm producer, (c) retires a shipped public Api method with a live in-world caller (`GlassAlley`), (d) has to keep every shipped harm/medic/`GlassAlley` test green while *changing what `inflict` computes*, and (e) marries the pure attenuation math to real persisted bodies under the game-clock/presence-freeze/`tickedAt` discipline. Every earlier phase is isolated and unit-testable; P4 is where they collide with the live subsystem. Sequence its own work as: mechanical vocab migration commit → `puncture` union+behavior commit → stack+`resolveTrauma` rewrite commit → `GlassAlley`/`isSiteCovered` retirement commit, keeping the passthrough branch bit-preserving so the burn/avulsion tests never move.

---

## 5. Commit shape (per workflow conventions)

`feat(material): channel vocab + Material hardness/toughness` (P0) · `feat(material): Construction value-object + profiles` (P1) · `feat(material): the response function Api` (P2) · `feat(material): Constructed carrier + emergent armor + weapon delivery` (P3) · `feat(harm): inflict through the covering stack; puncture; retire isSiteCovered` (P4) · `feat(material): legibility preview + pips + does-nothing lint` (P5) · docs at `/finalize`.

---

## 6. Open decision points (for the iteration pass — none re-open a closed requirement)

1. **`condition` reuses `ToolMixin`** (not a parallel field); armor inherits an inert `capabilities: []` (minor smell, deferred cleanup). *Recommend accept.*
2. **Mechanism-vocab unification** via `InsultKind = Channel | 'thermal' | 'tearing'` — channels are the SSOT for response; `thermal`/`tearing` are documented magnitude-only passthroughs (burn/avulsion) until `heat`/tearing channels land. *Recommend accept.*
3. **`Construction`/`Channel`/`ConstructedMixin` home = `lib/material/` — RESOLVED (user):** the existing material namespace; no new `lib/response/` dir minted.
4. **Response function = extend the existing `MaterialApi`/`MaterialLogic` — RESOLVED (user):** no new `ResponseApi`; fills `MaterialLogic`'s reserved `damageResistance(...)` surface.
5. **Shape-vs-magnitude split** — `Construction` ships the qualitative grid (code), `AppSettings` ships coefficients. *Recommend accept.*
6. **`puncture`** joins the closed `TraumaType` union with its behavior entry (they land together). *Recommend accept.*
7. **Outside-in ordering** derived from a per-armor-form canonical `layerDepth` (authors author the form, not a number). *Recommend accept.*
