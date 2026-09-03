# Textiles — implementation plan

**Input:** [textiles-requirements.md](../requirements/textiles-requirements.md)
(closed scope, 25 acceptance criteria — this plan is the HOW). Reasoning
lives in [textiles-slate.md](../slates/builds/textiles-slate.md) (12
decisions); read it for *why*, never for *what*.

**Build discipline:** one MR spanning both stages, with the **kernel/pack
seam at the end of Stage A** (§ P0). `pnpm test:near` + every touched
pack's vitest + the full lint family per wave. `pnpm test` at exactly two
moments — before the MR opens, and at `/finalize`. `pnpm test:gym` once,
in Wave A4, and again at finalize. No migrations: a rename means dropping
the DB. Stage by name; push every turn.

**The two stages:**

- **Stage A (A1–A10) — the kernel half.** Touches nine subsystems and
  moves live balance numbers. Independent of every pack in Stage B;
  buildable start to finish today.
- **Stage B (B1–B5) — the pack half.** Purely additive: three new packs,
  rows in two existing ones, one recipe relocation. **Nothing in Stage B
  edits kernel source.**

⭐⭐ **A1 lands first and is not negotiable** (requirements § 12): `worn`,
the card layout and the impression line are not textiles features. They
improve every object in the game and pay off whether or not the chain
ever ships.

---

## Grounding (facts verified this cycle — file refs current at plan time)

### Confirmed

- **`platform/thing/equipment/Garment.ts`** = `WearableMixin(SlottableMixin(Thing))`
  — composes nothing else. **`Armor.ts`** =
  `WearableMixin(SlottableMixin(CraftedMixin(DurableMixin(ConstructedMixin(DetailedMixin(Thing))))))`.
  `DisguiseGarment.ts` = `DisguiseBearingMixin(Garment)`, so it inherits
  whatever A3 does to `Garment`.
- **Nine clothing rows** in `generic-objects/content/stuff/thing/clothes/`
  author only `shortDescription` / `primaryKeyword` / `longDescription` /
  `slotClaims`. Six **armor** rows in the sibling dir carry
  `_materialPath` / `constructionForm` / `gradeBand` / `mass` — the exact
  shape A3 gives the clothes.
- **`lib/material/Construction.ts`** imports nothing but `./Channel` — it
  is pure and fixture-testable, which is what the two does-nothing lints
  depend on.
- **`lib/slot/Wearable.ts`** — `clo` persistent + `authorable`, default 0.
  Its doc defers per-region coverage verbatim as *"a deferred fidelity
  tier — v1 is a simple additive sum."*
- **`ThermalRegulation.wornInsulationKelvin()`** sums `getClo()` over
  `getAllOccupants()` × `CLO_TO_KELVIN`. Body-wide, unweighted, no part
  awareness.
- **`WearController`** calls only `giver.occupyAll(...)` — never touches
  containment. A worn item is still in `getContents()`, which is why
  `contents` and `worn` must be **two projections over one set**.
- **`api/mql-subscription.ts:112`** — `DETAIL_FIELDS` has no `worn`.
  `StuffDetailRecord` (`packages/types/src/index.ts:1536`) mirrors it.
- **`lib/spatial/Container.ts:318`** — the `contents` descriptor filters
  `stuffId !== viewer` + `!isAdornment` + `isVisible` +
  `PerceptionApi.perceives`, then `looseContents`, projecting
  `REF_FIELDS`. `addContainable`/`removeContainable` fire
  `fireFieldChange` inline.
- **13 shipped `static markupAugmenters`**; none renders worn equipment.
- **`ConcealmentLevel.ts`** — `obvious` hard-coded 0 in `requirementFor`;
  fallbacks 0/2/4/7/11; `isConcealed(l) = l !== 'obvious'`; `rankOf` =
  `indexOf`.
- **`CraftVessel.soiled`** behind a bespoke `SoiledWriters` policy;
  **`WashController.ts:36` hard-checks `instanceof CraftVessel`**.
- **`leather-jerkin.yaml`** — `discipline: smithing`, input
  `{category: hide, minGrade: fair}`, tool `mending`.
- **`sewing-kit`** (`{kind: mending}`) / **`sewing-machine`**
  (`{kind: mending, rate: 3, control: fine}`) — the tool-ladder precedent.
- **`textile/{wool,jute,down}` + `organic/leather`** all author
  `composition: []`, `chemistry: null`. `wool.yaml` authors
  `appearance: thick woven wool` — a material asserting a construction.

### ⚠ Corrections found by the planner (verified 2026-09-02)

- ⚠⚠ **`BodyPlan.getSlotsCovering` is NOT callerless.** Three production
  callers: `ConditionLogic.ts:121` (the trauma covering walk),
  `CombatLogic.ts:2757` (the struck-site armor stack),
  `ElectricityLogic.ts:247` (the conduction walk). **The `BodyPlan`
  source comment saying "no consumer yet" is stale**, and the slate and
  requirements repeated it. What has no caller is the **thermal**
  consumer. **A5's real win is that three hand-rolled copies of one
  outside-in walk collapse into one.**
- ⚠ **`quilted` does not exist.** `ARMOR_FORMS` has four members. A2 adds
  the fifth with its own profile row and depth slot, widening the ladder
  from 0–3 to 0–4.
- ⚠ **`getLayerDepth()` is called unconditionally** in three hot paths —
  `MaterialLogic.heatAttenuationFraction` (~346), `CombatLogic`
  2763/2774, `ConditionLogic` 149. **The depth table must stay total
  across both form sources** or the heat fold throws.
- ⚠ **Two build-time lints walk the form vocabulary** —
  `scripts/check-does-nothing.ts` and `check-inert-weapon.ts`. They run
  **outside the runtime** and cannot read a template-backed registry.
- **`CapabilitySpec = { kind, rate?, control?, technique? }`** and
  `ManualBuildController.paceMs(baseMs, instrument, kinds)` divides a
  step's duration by the best rate offered. **`rate: 3` on a spinning
  wheel is shipped, tested machinery.**
- **`FermentProfile`** rows carry `turnDays` + `turnedMaterial` — **that
  is the over-ret failure**, zero kernel change, zero new verb.
- **`Events`** is an open registry — but ⚠ **`EventApi` is for
  subjectless cross-cutting dispatch only** (session lifecycle, the
  mud→backend boundary, framework plumbing). It is *not* the ledger
  mechanism, and this build emits nothing (P9).
- ⚠⚠ **A pack `src/` may hold only branches, controllers and tests** —
  *"no `lib/`, no Api, no helpers."* **Therefore every mixin, value
  object, Api and logic singleton this build needs is kernel, by
  construction.** This is the sharpest determinant of the kernel/pack
  split.
- **Command categories are free-form directory names**, not a kernel enum.
- **A platform view may name a pack controller by absolute path** —
  `measure.yaml`'s `strike`/`dip` stanzas. **This is the precedent that
  makes `wear set` legal.** Views support `args` and `subcommands`
  together (11 shipped examples).
- **`platform/pack.yaml` claims `/stuff`**, so `/stuff/idea/fabric/**`
  is titled without a claim edit.
- **`CardBodies.tsx` ~1276** suppresses `HereList` for `agent` — *"a
  person's contents are their pockets."* **That is precisely the hole
  `worn` fills**: worn is public, carried is not.
- **`Species` has no mass or size field at all**; `baseMass` lives on
  `BodyPlan` only. 19 `homo/*` rows ship.
- **`PerceptionLogic.hideLevelForImpl` (~794)** bands a weighted sum and
  returns `'obvious'` as its floor. **This — not `perceives` — is where a
  conspicuity band becomes load-bearing.**
- **`Charged.ts:296`** adds standby draw from a **global** dial with no
  per-wearer term — the hook the hood/veil interlock needs.
- ⚠ **`hood.yaml`'s `covers: [face]` is `DisguiseBearingMixin.covers`**,
  not `SlotSpec.covers`. `face` is not a body-plan part key.
- **Four more gating lints** than requirements listed: `lint:does-nothing`,
  `lint:inert-weapon`, `lint:field-meta`, `lint:descriptors` (plus
  `lint:boundary`, `lint:object-verbs`, `lint:arg-kinds`,
  `lint:thin-forwarder`). **This build trips eight.**
- **`descriptor-banks` is a shipped document kind**, gated by
  `check-descriptor-banks.ts` for disjointness against material
  vocabulary — the home for the impression phrasings.
- **The gym** drives **synthetic** body plans with explicit `baseMass`, so
  it will not move under A4 unless a shipped species row leaks into it —
  which is what the A4 run proves.

---

## Plan-level decisions

### P0 — The seam is at the end of Stage A; the MR is reviewed in two passes

**Stage A ends at a commit that is green, self-contained and shippable
with no Stage-B pack present.** Stage B adds packs and never edits kernel
source.

The practical rule: **after Wave A10, `git diff --stat` on
`packages/server/src` and `packages/client/src` is frozen.** Any Stage-B
wave that thinks it needs a kernel edit has found a design error — stop
and surface it, because a pack may not need a kernel list edit and a pack
`src/` may not hold a mixin or an Api.

| pass | scope | what to look for |
|---|---|---|
| **kernel** (A1–A10) | `packages/server/src/mud/{lib,platform,api}`, `packages/types`, `packages/client/src/components/cards`, `content/{platform,generic-objects,base-library,species-and-names}` | live-number movement, the `Construction` two-source totality, the `DETAIL_FIELDS` wire change, the `baseMass` blast radius |
| **pack** (B1–B5) | `content/{trade-textiles,trade-dyeing,trade-tailoring,trade-farming,hinkley-hills,terminus,trade-smithing}` | namespace roots, title claims, cold-boot install, the recipe relocation, prose |

### P1 — `worn` is a `Slotted` subscribable field, and a *partition* of `contents`

`SlottedMixin` gains `static subscribableFields = [{ name: 'worn', read }]`,
mirroring `Container.contents`:

- walk `getAllOccupants()`, keep occupants that are `MixinApi.isWearable`
  (a sheathed sidearm and a cranial implant are *slotted*, not *worn*),
  apply the same `isVisible` + `PerceptionApi.perceives` filters, sort
  **outermost-first** by the covering stack (P6), project `REF_FIELDS`.
- `occupy` and both release sites (`Slotted.ts` ~412 and ~609) fire
  `MqlSubscriptionApi.fireFieldChange(this, 'worn', …)` inline.

⚠ **A worn item stays in `getContents()`**, so it would appear in *both*
projections. **`contents`'s filter gains a fourth clause: skip a child
currently occupying a slot on the host.** This makes the two fields a
partition of one set — which is what "worn vs carried" means.

`packages/types` gains `worn?: StuffRefRecord[]`; `DETAIL_FIELDS` gains
`'worn'`. ⚠ Wire change: the client must tolerate its absence and the
server a client that ignores it.

Client: a `WornList` section in `CardBodies.tsx`, rendered **for every
kind including `agent`** (where `HereList` is deliberately suppressed),
above `HereList`.

### P2 — The impression augmenter is total over absent facts, and lands on `Slotted`

At A1 only grade, condition and brand exist; fit arrives in A6 and colour
in B3. The augmenter is written from the start as a **fold over whatever
facts resolve** — each contributes a clause or nothing. That is what makes
A1 shippable before the chain.

- **Home:** `lib/slot/Slotted.ts`, the fourteenth `markupAugmenters`
  entry, guarded to hosts that resolve a body plan (a weapon rack is
  `Slotted` and has no impression).
- **Shape:** four aggregate bands — *quality* (grade across the stack),
  *upkeep* (min condition + wetness + later soil), *fit* (max distance,
  A6), *colour* (dominant hue + min fastness, B3) — plus a brand mention
  when one mark dominates. **One sentence, at most two clauses.**
- ⚠ **It must name no individual garment.** It never calls
  `getPresentation()` on an occupant; the test asserts the line shares no
  token with any worn item's `primaryKeyword`.
- **Non-repetition:** phrasings ship as
  `content/platform/content/descriptor-banks/impression.yaml`, keyed
  `(facet, band)`, ≥ 5 each — and `lint:descriptors` keeps them disjoint
  from material vocabulary for free.

  ⚠⚠ **CORRECTED 2026-09-02 — the returned plan held a "recent set" in
  `Property.of<string[]>('impression.recent')` on the viewer. That
  violates the prop rule, and it is unnecessary.** CLAUDE.md: *"a prop is
  for a slot whose **key is computed at runtime**… anything authored in
  YAML or narrowed on is a mixin field."* `'impression.recent'` is a
  **literal constant**, so it is not the sanctioned case.

  ⭐ **And no state is needed at all.** Selection is **seeded, not
  drawn** (`uncertainty.md`): a pure hash of
  `(host.stuffId, factsDigest, viewerId)`. **The same outfit therefore
  always reads the same way to the same viewer — which is correct and
  desirable**, not a defect: an unchanged person should not re-describe
  themselves differently every glance. Variety across *people* comes from
  different hosts hashing differently, and a changed outfit changes
  `factsDigest` and re-rolls honestly. **No prop, no FIFO cap, no session
  state.**

  ⚠ **The returned plan's test was testing the wrong thing** — 20 looks
  at one host in one outfit *should* read identically. The tests that
  matter: **N distinct hosts in distinct outfits yield ≥ K distinct
  phrasings**, and **a re-read of one host is stable until its facts
  change.**
- **The authored half stays authored.** `PersonaMixin` is untouched.

### P3 — `Construction` gains a second source: closed resist kernel, open textile registry, one total depth ladder

Four constraints hold simultaneously: `getLayerDepth()` stays **total**;
`Construction.ts` stays **import-pure**; a pack adds a form with **no
kernel edit**; content **never** authors a resist profile.

1. **Resist-bearing forms stay a closed kernel `as const`:**
   `COVERING_FORMS = ['plate','mail','padded','quilted','hide']`,
   `COVERING_PROFILES`, `LAYER_DEPTH` (padded 0 · quilted 1 · hide 2 ·
   mail 3 · plate 4). `quilted` is new:
   `{ edge: 'poor', point: 'poor', blunt: 'absorb' }` — a gambeson, one
   band outside `padded`.
2. **Non-resisting textile forms are template rows**, backed by
   `platform/idea/material/Fabric.ts` (`SingletonMixin(Idea)`, the
   `FermentProfile` shape), rows at **`/stuff/idea/fabric/<key>`**:

   ⭐ **`fabric` is the term of art, and it is precisely scoped.**
   *"Fabric construction"* is the textile industry's own name for exactly
   this classification (woven / knit / nonwoven), and — because
   resist-bearing forms stay kernel — **this namespace can only ever hold
   fabrics**. Plate is never a row, so the cloth connotation is correct
   rather than sloppy. The kernel *type* stays `CoveringForm`, which
   genuinely spans both domains; the registration method is
   `Construction.registerFabric(spec)`.

   Row fields:
   `key`, `layerBand` (0..4), `loft` (0..1), `weaveDensity` (0..1),
   `drape` (reserved). ⚠ `layerBand` is **required and range-validated on
   set** — that is what keeps `getLayerDepth()` total. An out-of-range row
   throws at hydration, loudly.
3. **The bridge is a registry on the pure value object.**
   `Construction.registerFabric(spec)` / `clearFabrics()` (HMR-safe)
   writing a module-private `Map`. `Construction.ts` still imports only
   `./Channel`.

   ⚠⚠ **CORRECTED 2026-09-02 — the returned plan hung this on
   `MaterialLogic.boot`, WHICH DOES NOT EXIST.** There is no such method;
   the only `startsWith('/platform/idea/material/')` in the tree is an
   assertion inside `libations-annexes.test.ts`. ✅ **CLAUDE.md carried
   that stale claim and has been corrected** (2026-09-02) — it was wrong
   three ways: the class (`MaterialCatalogue`, not `MaterialLogic`), the
   filter (a **template-path infix** plus a *class-extends-`Material`*
   check, not a `startsWith`), and the conclusion — *"the directory IS
   the filter"* is **backwards**, since the catalogue is explicitly
   *"never an allowlist of roots"* and that is precisely how a pack's
   `/system/arcana/idea/material/PotionMaterial` qualifies.

   ⭐ **The correct mechanism is the precedent the plan already named.**
   `FermentProfileCatalogue` is *"the **self-warming** home"* of its
   roster, so `FabricCatalogue` (`platform/idea/FabricCatalogue.ts`)
   copies it:

   - `public override async postRegister()` → `await this.warm()` —
     **self-warming, never an operator `boot()`**. ⚠ This is the
     *reference-Ideas-inert-at-boot* rule, which has bitten three times:
     nothing warms the roster and every read returns null forever.
   - `warm()` harvests by **template-path infix** (`/idea/fabric/`,
     every root's subtree) and keeps a row whose class extends `Fabric`
     — **never an allowlist of roots**, the `MaterialCatalogue.warm()`
     shape verbatim, so a pack's own fabric class qualifies without a
     kernel list edit.
   - a **residency veto** (`canEvict` → false): a culled catalogue
     re-warms nothing.
   - eager loading rides the **platform pack's `boot:` manifest**, and
     `warm()` is idempotent so a pack go-live can re-warm.
4. ⭐ **`responseFor()` on a textile form does not throw and is not
   authored.** One kernel constant answers for all of them:
   `TEXTILE_RESIST_PROFILE = { edge: 'poor', point: 'poor', blunt: 'poor' }`.
   *This is the split made literal:* content chooses drape, loft and
   weave; **the kernel decides that cloth resists poorly.** It is the
   requirements' *"a linen shirt is armor that does not work"* as one line
   of kernel data, and a pack adding `lace` changes nothing about combat.
   `poor` is not in `INERT_RESIST_TOKENS`, so `doesNothing()` stays false.
5. **Surface renames** (~15 sites, mechanical):

   | was | becomes | call sites |
   |---|---|---|
   | `ARMOR_FORMS` | `COVERING_FORMS` | `check-does-nothing.ts:22,31,46` |
   | `ARMOR_PROFILES` | `COVERING_PROFILES` | module-private |
   | `ArmorForm` | `CoveringForm` | `Construction.ts` |
   | `isArmorForm` | `isCoveringForm` | `Construction.ts`, tests |
   | `isArmor()` | `isCovering()` | `Constructed.ts:113`, `CombatLogic.ts:631,2762,2773`, `ConditionLogic.ts:126,141`, `MaterialLogic.ts:362,446`, `AnalyzeResponseController.ts:101` |
   | domain `'armor'` | `'covering'` | `getDomain()`, `Construction.test.ts:30` |

   ⭐ **Unchanged: `responseFor`, `deliveryFor`, `getLayerDepth`,
   `doesNothing`, the whole weapon half** — their call sites are the hot
   paths, and it was their *domain guard message* that needed fixing, not
   their name. **Every `Construction.of('plate'|'hide'|'bladed'|…)` in
   ~40 test lines is untouched** — `of()` takes a word, and no word
   changes. That is why this is a 15-site diff, not a 149-site one.
6. ⚠ **`Constructed.setConstructionForm` validation ordering is
   unverified.** It throws on `!Construction.isForm(value)` at hydration;
   if `FabricCatalogue.postRegister` has not warmed when a garment row
   hydrates, `constructionForm: woven` throws. **A2 verifies
   this first.** Named contingency: accept any well-formed kebab token at
   set-time, return `null` + a `DiagnosticApi` record for an unresolved
   form, and add a **boot-time totality assertion** in the catalogue —
   the shape `lint:topics` already uses.
7. **The two lint scripts.** `check-does-nothing.ts` keeps iterating the
   kernel forms (renamed import) and gains **one** assertion —
   `resistProfileHasEffect(Object.values(TEXTILE_RESIST_PROFILE))` —
   which covers every present and future textile form, because they share
   the profile. **Neither script has to read a template row**, which is
   the whole reason the shared profile is a kernel constant.

### P4 — `Armor` is RETIRED; armor is a `Garment` of the right material and form

*(User decision, 2026-09-02 — the plan's default was `extends Garment`.)*

After AC 1 the two stacks are byte-identical, and **armor-ness is not a
class — it is material + construction form**. A steel breastplate is a
`Garment` whose material is steel and whose form is `plate`. Keeping a
subclass that adds nothing would be the same duplication that produced
the current mess.

**Blast radius, enumerated:**

- **6 content rows** — `generic-objects/content/stuff/thing/armor/*.yaml`
  (bronze-breastplate, hide-jerkin, leather-boots, mail-hauberk,
  padded-gambeson, steel-breastplate) repoint `class:` to
  `/platform/thing/equipment/Garment`. ⚠ **The directory name stays
  `armor/`** — it is a content namespace, not a class, and renaming it
  would churn `lint:census` for nothing.
- **12 test imports** — `AnalyzeResponseController.test.ts`,
  `CombatLogic.test.ts`, `CombatLogic.gearwear.test.ts`,
  `CombatLogic.hooks.test.ts`, `ConditionLogic.shock.test.ts`,
  `ElectricityLogic.test.ts`, `CraftingLogic.repair.test.ts`,
  `material-response.inflict.test.ts`, `electricity-pips.test.ts`,
  `ArmsAndArmor.test.ts`, `FloodedCell.integration.test.ts`, and
  `terminus/src/__tests__/sewing-machine.acceptance.test.ts` — all swap
  `import Armor` for `import Garment`. Mechanical; the constructions and
  materials they set are unchanged.
- **Delete** `platform/thing/equipment/Armor.ts`.

⚠ TypeScript drops an inner mixin's surface through nested generic mixins
(the farming plan's `Provision` finding). **A3 checks the compile before
assuming this is free**, and applies the class/interface merge
(`interface Garment extends Crafted, Durable, Constructed, Detailed {}`)
if the static surface narrows.

⭐ **This is the same move the slate makes about garments generally** —
*a garment's purpose is which channel it intercepts, not what class it
is* — applied to the one class that was already an exception.

### P5 — `clo` derives from physics, on `Wearable`, per garment

The persistent `clo` field is **deleted** from `fieldMeta` (a rename →
drop the DB). `getClo()` stays as the inter-Stuff contract and becomes
derive-on-read.

```
clo(garment) = (t / k_eff) / R_CLO          R_CLO = 0.155 m²·K/W

t     = mass / (density × A_covered)         effective thickness (m)
k_eff = k_fibre·(1 − loft) + k_air·loft      still air k_air ≈ 0.026 W/(m·K)
```

- `mass` — `Tangible.getMass()`; `density`, `k_fibre` — the `Material`.
  Wool 1310 kg/m³ @ 0.04 W/mK; linen ≈ 1500 @ 0.05. **This is what makes
  AC 2 pass from material properties alone at equal mass.**
- `loft` — the covering form's row. `felted`/`knit` loft high, `woven`
  low, `plate`/`mail` zero. **This is why "form sets the band" is not
  merely an ordering rule** — the form is a real thermal parameter.
- `A_covered` — from `slotClaims` × per-part surface fractions × the
  plan's reference surface, so a garment states its clo with no wearer,
  which the inspection card needs.

**Wet** (AC 3):

```
s_eff   = wetness × min(1, waterAbsorptionCapacity / ABS_REF)
k_wet   = k_eff·(1 − loft·s_eff) + k_water·(loft·s_eff)     k_water = 0.6
massWet = massDry × (1 + wetness × waterAbsorptionCapacity/100)
```

Water floods the loft, and the loft is where the insulation lived — so a
lofty garment loses proportionally more. **Wet wool retains more than wet
linen because `waterAbsorptionCapacity` differs (wool 33%), not because
anything is special-cased.** `getMass()` on a `Wet` host returns wet mass,
so encumbrance feels a soaked cloak from one override.

**Windproofing** derives from `weaveDensity × (1 − wetness)` folded into
the outermost layer's contribution to the convective coefficient. **No
`shell` role word** — the dense oiled thing simply is one.

Per-garment arithmetic is `WearableMixin.getClo()` (one object's own read
— no thin Api wrapper). **Stack** arithmetic is `SlottedMixin` (P6),
because that is cross-object orchestration.

⚠ `Quantity<'clo'>` and its marshaller stay; only the *field* goes.
`lint:field-meta` will flag the removal — that is the intended tripwire.

### P6 — The covering stack lives ON the wearer. ⚠⚠ NO new Api.

*(Corrected 2026-09-02 by the user. The plan as returned proposed a
the covering-stack methods pair whose every method took `wearer` as
its first parameter. **That is the exact shape the Api OO sweep
eliminated**, and it would have failed CI on the first run.)*

⚠⚠ **`check-object-verbs` is CI-gating and its census must stay zero.**
It counts every public static method on an exported `*Api` under
`src/mud/api/` whose **first parameter is typed as a world object**, and
the four mandates it still allows are: subjectless services · framework
lifecycle around a least-trusted host · the import/exterior boundary ·
subjectless cross-cutting dispatch. A covering-stack read is **none of
them** — it is one host answering about its own slots. Eight such methods
would have taken the census 0 → 8.

**The surface, on the two objects that own it:**

*On `SlottedMixin`* (the wearer — guarded to hosts that resolve a body
plan, the same guard the impression augmenter uses; a weapon rack answers
empty/zero):

```
wearer.coveringAt(partKey): CoveringLayer[]      // outermost-first
wearer.outermostAt(partKey): Stuff | null
wearer.insulationAt(partKey): Quantity<'clo'>
wearer.bodyInsulation(): Quantity<'clo'>         // surface-weighted
wearer.attentionFactor(): number                 // P11
wearer.concealmentOffset(): number               // P10
wearer.wouldLayerViolate(candidate): boolean
```

*On `WearableMixin`* (the garment):

```
garment.getClo(): Quantity<'clo'>                // P5, derived
garment.fitOn(wearer): FitReading                // P7
```

⭐ **`fitOn` sits on the garment, not the wearer** — the garment carries
`cutTo` and is the thing that fits or does not. The wearer is the
argument.

⭐⭐ **The dedup survives intact, and improves.** The three hand-rolled
walks in `ConditionLogic:109–150`, `CombatLogic:2746–2780` and
`ElectricityLogic:247` still collapse into one implementation — they call
`host.coveringAt(part)`. **Better than the Api version**, because each of
those logic singletons already holds the host, so the call *drops* a
parameter instead of adding an Api hop.

**The ordering rule** (AC 5), one comparator, in one place —
`SlottedMixin`'s private sort:

> **form sets the band; wear-order breaks ties inside a band.**

`compare(a,b) = layerDepth(b) − layerDepth(a)`, tie-broken by
**later-worn = outer**. Wear order is slot insertion order — `Set`
preserves it and `PersistableMixin`'s slot slice restores it
(`Slotted.ts:648` re-wears via `occupyAll`), **so the order is durable
with no new field.**

**The ladder refusal:** `WearController` asks
`giver.wouldLayerViolate(target)` before `occupyAll` — true iff the
candidate's band is strictly below something already occupying a claimed
slot. A `controller-rejected` note, reason `layer-order`, with a diegetic
line. ⚠ **Shirt-vs-coat is NOT refused** — that is the player's call and
its consequence is cold.

**Per-part surface weighting** (AC 4). `BodyPlan` gains derived
`getPartSurfaceFraction(partKey)` — **Meeh's law over the shipped tissue
masses**, `m_part^(2/3) / Σ m^(2/3)`. No new authored field; `biped.yaml`
already carries every tissue mass. Then
`bodyInsulation() = Σ_parts surfaceFraction(part) × insulationAt(part)`,
and `ThermalRegulation.wornInsulationKelvin()` calls
`self.bodyInsulation()` instead of its flat sum. **A bare hand costs
exactly its surface share; a cloak beats a shirt because it covers more
parts.**

⚠ **`ElectricityLogic`, `ConditionLogic` and `CombatLogic` are re-pointed
at `host.coveringAt(...)` in A5 and their local walks deleted.** This is
the riskiest refactor in the build.

⚠ **If some later wave believes it needs an Api here, that is a design
error, not a shortfall.** Read `docs/antipatterns.md` § *Thin Api
Wrappers over Object Methods* and the four mandates in
`check-object-verbs` before reaching for one.

### P7 — Fit is two derived numbers and one stamp

- **`BodyPlan` gains `baseStature` (m)** beside `baseMass`; `biped.yaml`
  authors `1.75`.
- **`Species` gains `baseMass` + `stature` overrides** (P8), and all
  resolution goes **through `Species`**, so lineage later overrides on the
  individual without touching either.
- **The measurement pair derives** — deliberately two numbers, not a
  tailor's chart:
  ```
  statureM   = species.getStature()
  girthIndex = sqrt(massKg / statureM)     // a ponderal index
  ```
  `massKg` is `Creature.getMass()`, which already reflects composition and
  will reflect lineage variance. **That is the seam, and it is one line.**
- **The stamp.** ⚠⚠ **CORRECTED 2026-09-02 — the returned plan made this
  `cutTo?: { bodyPlanPath, statureM, girthIndex }`, "a plain object (no
  marshaller)". That is the BAD example** in `antipatterns.md` §
  *Persistent Fields Default to Scalars*: a **fixed-key** composite of
  three scalars is precisely the case the doctrine says **decomposes**
  (*"mixins that carry richer runtime types decompose them into named
  scalar fields and reconstruct on read"*). So `WearableMixin` gains
  **three scalar fields**:

  ```
  cutToBodyPlan: string    // '' = stock
  cutToStature:  number
  cutToGirth:    number
  ```

  each persistent + `authorable`, each with its own validating setter,
  reconstructed into a `FitReading` on read. ⭐ Contrast
  `WardrobeMixin.wardrobes` (P12), which is a **variable-key map** — the
  doctrine's named escape-hatch case, and the exact shape
  `Wearable.slotClaims` already ships raw. The distinction is fixed keys
  vs. variable keys, not "object vs scalar" by eye.

  `cut` (B4) stamps them. ⭐ **An absent stamp
  means "stock"** and resolves to the plan average — so all fifteen
  shipped rows read as ill-fitting hand-me-downs **with no content edit**.
- **Fit is the distance:**
  ```
  fitDistance = hypot((statureM − cut.statureM)/cut.statureM,
                      (girthIndex − cut.girthIndex)/cut.girthIndex)
  ```
- **Consequences**, each on a shipped mechanism: *loose* → air gaps →
  `cloAt × (1 − k·looseness)`; *tight* → a `LoadBearing` burden term + a
  multiplier on the **existing** `DurableMixin` condition decrement (⚠ not
  a clock — wear stays act-driven); *impossible* → `WearController`
  refuses above `textiles.fit.refuseAbove`. ⭐ **A halfling's coat on a
  dragonborn fails on a NUMBER, not a species check** — so a heavy human
  and a light dragonborn shade into each other correctly.
- ⚠ **`cutTo.bodyPlanPath` mismatch is a hard refusal** independent of
  distance, and it is not redundant with `slotClaims`: both species are
  `biped`, so slot matching alone would let the coat on.

### P8 — Species mass and stature move in one isolated wave, through one accessor

- `Species` gains `baseMass` + `stature`, persistent + authorable, both
  defaulting to `0` = *inherit the plan*; `getBaseMass()`/`getStature()`
  resolve `own > plan > 0`.
- ⭐ **Three production reads change, and only three:** `Creature.ts:229`,
  `CombatLogic.ts:2143` (the mass-scaled fist), and
  `NaturalAttack.deriveProfile`'s largeBody threshold. Everything else —
  encumbrance, metabolism, thermal mass, `Thermal.getTau` — reads
  `Creature.getMass()` and inherits the change for free. **That is the
  point.**
- ⚠ **TEN playable species, not seven** (corrected 2026-09-02 — char-gen
  ships gnome, half-elf and orc as well). The nine non-playable `homo/*`
  rows are left inheriting.

⭐ **The numbers** (decided 2026-09-02). `girth = √(mass/stature)`; human
is the 6.32 baseline. **Every mass is under `largeBodyMassKg` (150), so
nobody silently gains ogre-reach** — dragonborn is the closest at 25 kg
under.

| species | fiction | `stature` (m) | `baseMass` (kg) | girth |
|---|---|---|---|---|
| gnome | *small, wiry* | 1.00 | 30 | **5.48** |
| halfling | *small… fond of a good meal* | 1.05 | 38 | 6.02 |
| dwarf | *stone-sturdy and stout* | 1.35 | 68 | **7.10** |
| elf | *measured, watchful grace* | 1.80 | 64 | 5.96 |
| half-elf | *elven poise and human drive* | 1.78 | 67 | 6.13 |
| human | *adaptable and ambitious* | 1.75 | 70 | 6.32 |
| tiefling | *horned and ember-eyed* | 1.78 | 73 | 6.40 |
| half-orc | *broad and powerful* | 1.88 | 92 | 6.99 |
| orc | *broad and fierce, short-lived* | 1.92 | 100 | 7.22 |
| dragonborn | *the bearing of an elder wyrm* | 2.00 | 125 | **7.91** |

⭐ **The fiction falls out of the arithmetic rather than being asserted.**
The gnome is *wiry* — the lowest girth of anyone. The halfling eats well,
so it carries near-human girth at 60% of the height, which is exactly what
separates it from the gnome. **The dwarf is third-shortest and
fifth-heaviest**, so *"stone-sturdy and stout"* is a number rather than a
adjective. The half-elf sits between elf and human on both axes, at home
in neither.

⚠ **And the size is paid for.** A dragonborn carries and eats ~1.8× a
human, and cools more slowly — a real cost for a real benefit, which is
the incomparability [lineage-slate](../slates/builds/lineage-slate.md)
wants. Do not "balance" it away.

- Both fields stay `0` = *inherit the plan* for every non-playable row, so
  the diff is ten rows plus `biped.yaml`.
- ⚠ **The gym-bench plan.** The gym drives **synthetic** plans, so a green
  run proves the *engine* did not move. The run that matters is the
  shipped-species diff: A4 adds
  `scripts/__tests__/species-mass.bench.test.ts` to `GYM_TESTS` — per
  species, `(baseMass, stature, carryCapacityKg, basalDrainPerDay, tau,
  fistEnergy)` through the real readers, printed and snapshotted. **AC 6's
  "any movement is recorded" IS that snapshot**, committed and quoted in
  the MR description.

### P9 — Soiling: routing + one pre-registered event, and nothing resembling a gauge

- **The routing** — genuinely textiles' business, because it is the
  layering model: `outermostAt` answers *which layer takes the
  stain*. One method already needed by P6, with a second consumer.
- ⚠⚠ **NO EVENT. Corrected 2026-09-02.** The returned plan added
  `Events.SoilDeposited = 'soil.deposited'` via `EventApi`. That is wrong
  three times over:

  1. **It conflates two meanings of "event".** Room-condition's own open
     question 6 asks *"where the attributed deposit/clear events **land**
     — candidates: … `participation_events`, or a producer-local log."*
     Those are **ledger records** (the `accountability_events` family).
     `EventApi` is a broadcast bus. An emit would not feed that log at all.
  2. **It would have zero emitters.** ⭐ **Nothing in this build soils
     anything** — wetness is its own gauge, combat wears via `Durable`,
     and the apron is explicitly inert until room-condition lands. There
     is no soiling act here to instrument. Cooking's pre-registration
     works because cooking genuinely *has* acts that mess up a kitchen
     today; textiles has no analogue.
  3. **And zero listeners**, by design.

  ⚠ `EventApi` is for **subjectless cross-cutting dispatch** — session
  lifecycle, the mud→backend boundary, framework plumbing. A soiling
  deposit has an actor, a target garment and a body part. It is a local
  interaction, and **a local interaction is a call, not a broadcast**.

⭐ **The seam is a METHOD the future build calls, not a signal it listens
for.** Textiles ships `wearer.outermostAt(partKey)` — which P6 needs
anyway — and `textiles.md` documents the contract: *when room-condition's
deposit driver lands, it asks the wearer which layer takes the stain.*
Nothing to pre-register, nothing inert, nothing to retrofit.
- ⚠ **`CraftVessel.soiled` is not touched.** Different concept, same word.
- **The apron** is content only (B4): cheap, outermost band, wide
  `slotClaims`. It routes deposits away from the shirt the moment
  room-condition lands, and until then it is an honest, cheap, ugly
  garment.
- ⚠ **No clock, no exposure integral, no time term anywhere.**

**The wash/fade loop is the visible half.** `DyedMixin` — kernel,
`lib/material/Dyed.ts`, **because a pack cannot ship a mixin** — carries
`hue` + `fastness (0..1)`, with `launder()` decaying fastness by
`f(1 − fastness)` and degrading `hue` below a threshold. `WashController`
gains a branch: the `instanceof CraftVessel` path untouched; otherwise, if
`MixinApi.isDyed`, launder (water a **precondition**, never consumed).
`wash.yaml` needs no arg change — its target already requires
`CraftedMixin`, which a `Garment` now composes.

### P10 — Conspicuity extends the scale downward; its real consumer is `hideLevelFor`

```
CONCEALMENT_LEVELS = ['conspicuous','obvious','subtle','hidden','deep','buried']
REQUIREMENT_FALLBACK.conspicuous = -2      // a dial like every other band
REQUIREMENT_FALLBACK.obvious     = 0       // unchanged, still hard-coded
isConcealed(l) = rankOf(l) > rankOf('obvious')     // was `l !== 'obvious'`
```

- **Every authored row still resolves** (AC 19) because content authors
  *words*, and the only words in shipped content are `subtle` and
  `hidden`. Nothing reads a raw index; `degradeHide` now floors at
  `conspicuous` — **the intended behaviour change, not a regression**.
- ⚠ **`perceives` saturates below `obvious` and always will** — an obvious
  thing already always resolves. **This is the honest finding and it goes
  into `concealment.md` rather than being papered over.**
- **`hideLevelForImpl` gains one term:**
  `+ actor.concealmentOffset() × dial(stealthHideCoveringWeight)`,
  and its terminal `return 'obvious'` becomes a conspicuous floor below a
  threshold. ⭐ **A person in a hi-vis vest who hides gets a worse floor
  than a person in grey** — that is AC 18, mechanically.
- **`ConcealableMixin.getConcealment()` becomes derive-on-read**: the
  persisted field is the *authored base*; the read adds the covering
  offset when the host is `Slotted`. `HidingMixin`'s override composes
  cleanly — verify with the stealth suite.
- **`concealmentOffset`** derives its sign from **content, not a flag**:
  the garment's `hue` (P9) against a neutral, plus the form's
  `weaveDensity`. A pack authoring a new dye gets concealment behaviour
  for free. ⚠ Terrain-matched camo is out of scope (search-slate) — the
  offset is absolute, and the code says so.

### P11 — The hood/veil interlock is `attentionFactor`, the same number `concealmentOffset` reads

`Charged.ts:296` computes standby loss from a **global** dial with no
per-wearer term. One multiplication:

```
standbyWatts_effective = dial(magicChargeStandbyWatts) × wearer.attentionFactor()
```

`attentionFactor ∈ [floor, 1]` derives from the same worn read — a deep
hood masking the face reduces observers' accumulating evidence, which is
**exactly Voss Decay's stated leak mechanism**. One derived quantity, two
consumers, one object.

⚠ **Faculty is capacity, never access.** The hood makes a binding
*cheaper to hold*; it gates no spell, changes no efficiency cap, confers
no capability. The floor dial is bounded well above zero so no garment
makes a binding free. ⚠ The shipped `hood.yaml` needs **no new field** —
`attentionFactor` reads `masksIdentity` plus the head-covering stack, and
AC 21's test wears the shipped hood.

### P12 — `wear set` is a stanza; the wardrobe is a `Record<string,string[]>` on the wearer

Zero new verbs. `dress` stays unclaimed.

- `content/platform/content/platform/cmd/inventory/wear.yaml` gains a
  `subcommands:` block alongside its existing `args:` (11 shipped views do
  both): `set <name>` (with `--save`) and `sets`. Bare `wear <item>`
  unchanged.
- **Where the set lives.** Not a collection (forbidden), not a `Property`
  (authored/narrowed state is a mixin field), not an `EnvironmentMixin`
  setting (fixed keys; wardrobes are user-named). **A new kernel mixin
  `lib/slot/Wardrobe.ts`** — `wardrobes: Record<string, string[]>`,
  persistent, name → ordered **keyword** list. Byte-identical in shape to
  `Wearable.slotClaims`, and it rides the Avatar's existing
  `holder_snapshots` capture. `Avatar` composes it.
- ⭐ **Keywords, not instance refs.** A saved set survives buying a
  replacement shirt, and a keyword resolving to nothing is skipped with a
  readable line rather than dangling. `--save` captures the worn stack's
  `primaryKeyword`s **in wear order**.
- **Dressing order is the covering ladder, innermost-first**, so a saved
  set never trips P6's refusal. Failures are per-item and non-fatal.
  **A dressing mistake must be survivable and readable — that starts
  here.**

### P13 — The material boundary is retting; everything after it is form

```
flax-straw ──ret──▶ flax  ──scutch──▶ flax  ──spin──▶ flax  ──weave──▶ flax
(material A)        (mat. B)          form:tow       form:yarn      form:woven
                       ↘ over-ret ▶ rotted-flax (material C, turnedMaterial)
```

**Two materials, one fibre.** `flax-straw` and `rotted-flax` exist only at
the pit; from the moment the fibre is clean, everything downstream is one
`flax` material wearing different **construction forms** — which is what
Decision 1 asserts. This keeps `f(dyestuff, mordant, fibre)` keyed on one
row and makes wool's later arrival a pure addition.

**The transfer uses shipped `pour`.** The harvest mints a **sheaf** — a
`GradedReceptacle`-shaped row (`Branded(Crafted(Bulkable(Thing)))`)
holding bulk `flax-straw`, graded by farming's weakest-link band. Grade
rides `CraftedMixin` through `FermentingMixin`'s documented transfer seam.
⚠ **B2 verifies this leg first**; named fallback is a `retting`
`inputCategory` on a plain `Bulkable` pit charged by `fill` (the brewing
wort path).

⚠ **The entry point is the fibre material, not the pit** (P15 seam 2).
`spin` takes a fibre material; where that material came from is upstream.
This is what lets wool and, later, a synthetic plug into the same chain
without touching `trade-textiles`.

**Staple length is the Grade band's meaning, not a new field** (AC 12).
`scutch`'s decision is a grade *choice*: work it harder for a cleaner line
at a lower band, or accept tow. Propagation is the shipped weakest-link,
harvest → sheaf → line → yarn → bolt.

### P14 — The three packs, their roots, and which verb ships where

All three ship `src/`, so each holds its own namespace root
(`classFileOf` resolves by longest prefix).

| pack | root | `src/` | verbs (category) | Discipline |
|---|---|---|---|---|
| `trade-textiles` | `/trade/textiles` | `src/idea/cmd/textiles/{Scutch,Spin,Weave,Full}Controller.ts`, `src/thing/{DropSpindle,SpinningWheel,Loom,RettingPit}.ts` | `scutch` `spin` `weave` `full` (`textiles`) | `/trade/textiles/idea/Discipline/textiles` |
| `trade-dyeing` | `/trade/dyeing` | `src/idea/cmd/dyeing/DyeController.ts`, `src/thing/DyeVat.ts` | `dye` (`dyeing`) | `/trade/dyeing/idea/Discipline/dyeing` |
| `trade-tailoring` | `/trade/tailoring` | `src/idea/cmd/tailoring/{Cut,Sew}Controller.ts`, `src/thing/CuttingTable.ts`, `src/behavior/tailors.ts` | `cut` `sew` (`tailoring`) | `/trade/tailoring/idea/Discipline/tailoring` |

Layout mirrors `trade-smelting` exactly. Root additions: `package.json`'s
dependency block, `pnpm-workspace.yaml` if it does not glob, the
deployment manifest. Each imports the kernel **only by package specifier**
and writes absolute `FromModule` gates.

⚠ **A pack ships no mixin, no Api, no `lib/`.** `DyedMixin`,
`CoveringForm`, the covering-stack methods and `WardrobeMixin` are all
**kernel**, all in Stage A; Stage B consumes them.

### P15 — The chain must span the tech ladder, and three seams decide whether it can

*(Added 2026-09-02 at the user's question: does the pack support the trade
from prehistoric garments to kevlar and mass-produced lines?)*

⭐ **Most of it already does**, and the audit is worth recording because
the parts that work are non-obvious:

| capability | why it already works |
|---|---|
| **Kevlar / aramid / ballistic nylon** | ⭐⭐ **needs NO new construction form.** `MaterialLogic` scales the resist *magnitude* by the material — `edge` is hardness-driven, `blunt` toughness-driven, both against AppSettings refs — while `responseFor()` supplies only the *shape*. A `woven` fabric of aramid gets the `poor` shape scaled by aramid's enormous toughness and comes out genuinely protective. That is `response = f(mechanism, material, construction)` doing its job. ⚠ **The wrong move is adding a `kevlar` form; do not.** |
| **Prehistoric, tool-less work** | `paceMs` returns `baseMs` when no instrument resolves, so hands-only spinning already works at the slow rate with no special case. **The tool ladder starts at rung zero** — prehistoric is the bottom of the same ladder, not a different one. Felting and twining need no spinning at all, and both are fabric rows. |
| **Mass production** | a high `rate` on a `CapabilitySpec` plus a **production brain** — both shipped patterns (`farms.ts`, `delves.ts` ride in their packs). A mill is content, not mechanism. |
| **The verbs at every level** | ⭐ **they do not change.** A modern mill operator still chooses yarn count and weave density. `spin` and `weave` carry the same decisions at every tech level; the ladder moves the *rate* and the *scale*, never the decision. |

**Three seams must be cut correctly now** — each is nearly free at plan
time and a rewrite once three packs have assumed otherwise:

**Seam 1 — the stage is `prepare`, not `ret`.** Retting is *flax's*
instance of fibre preparation. Wool **scours**, cotton **gins**, silk
**reels**, synthetics **extrude**. The chain's shape is:

```
prepare → spin → fabricate → finish
   ▲
   retting is flax's instance of this stage, never the stage's name
```

⚠ **No controller, recipe id, category, Discipline description, doc
heading or test name in `trade-textiles` may treat "retting" as the name
of the stage.** `scutch` stays `scutch` — it is a real act, not a stage
label — but the *stage* it belongs to is preparation.

**Seam 2 — the chain begins at *fibre-exists-as-a-material*.** Flax
arrives from farming, wool from ranching, aramid from a chemical-industry
pack nobody has built. ⭐ **If the chain's entry point is the fibre row,
all three plug in identically.** If retting is the entry point, only flax
ever works. Concretely: `spin` takes a **fibre material**, and how that
material came to exist is upstream and none of textiles' business.

**Seam 3 — the bottleneck assertion is historically scoped.** *"Spinning
is the maximum attended step"* is true before 1764 and false after — that
**is** the lesson. ⚠ The B2 bench must assert it **at the shipped tech
level**, named in the test, not as an eternal property. Otherwise a future
mill wave breaks a test that was never meant to hold, and someone
"fixes" it by slowing the loom.

**Out of scope, deliberately.** Per *trades ship medieval and advance by
exercised disciplines; never author tech ahead of demand* — no aramid, no
nylon, no mill in this build. The question P15 answers is whether the
substrate **can** carry them, not whether it does.

⚠ **One honest limit: the prehistoric end is partly blocked on Stage C.**
Pre-textile clothing is largely hide, and leatherwork is deferred because
nothing produces hide. Felting and twining are reachable now; hide
clothing is not.

### P16 — What competence buys in each trade (the Discipline design)

*(Added 2026-09-02. Stage B named three `Discipline` rows and set nothing
on them. `Discipline` has **eight** authored fields — `key · channel ·
label · description · iscedf · requires[] · specializes[] · synergizes[]
· conferrals[]` — and **conferrals are the tech ladder**: crossing a
competence band confers verb yaml-paths.)*

⭐⭐ **Every shipped trade Discipline answers one question in its doc
comment, and Stage B never asked it:** *what does competence buy, given
it must not buy yield?* `smelting` — *"it changes nothing about the
YIELD… competence buys knowing, never getting."* `geology` — *"a better
prospector does not get more ore from the same rock; he knows where to
point."*

**The three answers, each on a mechanism this build already has** (which
is the test that they are real, not decoration):

| Discipline | competence buys | why it is not "getting" |
|---|---|---|
| **`textiles`** | **how fine you can go before it breaks** — a master spins a finer, evener yarn from the same fibre; a novice reaching for a fine count **wastes stock** | the flax is unchanged. Competence buys the *top of the decision range*, never more yarn from the same sheaf |
| **`dyeing`** | **fastness and repeatability** — how many washes the colour survives, and whether you can match last month's lot | hue comes from the dyestuff; **durability comes from the craft**. Competence never brightens a colour. ⭐ This is also why `dyeing` earns its own row rather than riding `apothecary`: extraction is apothecary's, but **fastness is nobody else's** |
| **`tailoring`** | **fit precision** — how tightly `cutTo` matches the measured body | it consumes P7 on day one, and it is *why* a master tailor beats a novice one rather than merely being faster |

**The relational fields, set rather than defaulted:**

```
textiles   requires: [recipe-knowledge]   synergizes: [appraisal]
dyeing     requires: [recipe-knowledge]   synergizes: [apothecary, appraisal]
tailoring  requires: [recipe-knowledge]   synergizes: [textiles, appraisal]
```

⚠ `specializes` stays empty for all three — none is a narrowing of a
parent (the cooking slate's butchery ruling: a sibling trade is a
sibling, not a specialization). ⚠ **`conferrals` stay empty this build**
— no verb is band-gated, because *competence grades, it does not gate*
(the `awareness` precedent). The field is the tech ladder's seam, and
authoring it ahead of demand is the thing the trades doctrine forbids.

**Existing Disciplines the chain exercises**, named so they are not
silently re-invented: `horticulture` / `agriculture` (the crops, in
farming's B1), `appraisal` (judging a bolt or a garment before buying),
`recipe-knowledge` (the shared prerequisite).

⚠ **ISCED-F codes are required** and must be real: `0723` textiles
(clothes and footwear) for `textiles` and `tailoring`; `0711` chemical
engineering *or* `0723` for `dyeing` — the build agent picks and cites
the 2013 table, as every shipped row does.

### P17 — The Stage-B lens findings (pedagogy · expression · RP · gamification)

*(Added 2026-09-02. The four lenses were run on the kernel design but
never on the trades. Findings that change the build, not just its
documentation.)*

**⭐⭐ Cross-cutting 1 — nothing produces byproducts, and the engine
already models them** (`spent-grain`, `pomace`, `lees`, `ash`). Four
leaks, each both a conservation hole and a lost lesson, because
**byproducts are what make a trade economic**:

| act | byproduct | what it is good for |
|---|---|---|
| `scutch` | **tow** (short fibre) + **shive** (woody boon) | coarse yarn, rope, stuffing · fuel, litter |
| `dye` | an **exhausted bath** | a second, paler dip — see below |
| `cut` | **offcuts** | patchwork, **quilting** (a covering form this build adds), rag stock |

**⭐⭐ Cross-cutting 2 — the textile chain IS the nuisance-trade chain.**
Retting ponds stank badly enough to be banned upstream of towns;
dyehouses stank (urine was the classic woad vat); the tannery is Stage
C's and stank worst. That is a coherent identity rather than three
coincidences, and **siting becomes a real decision** — it connects to
[zoning-slate](../slates/builds/zoning-slate.md) and to the water pack's
shipped **contamination-by-kind**. It is also what makes these read as
*industry* rather than as crafting stations.

**⚠ Cross-cutting 3 — failure modes exist in exactly one place**
(over-retting). Spinning too fine must waste stock; weaving badly must
yield a flawed bolt; a mordant on woad must be refused. **Without failure
competence is invisible**, and every P16 answer above depends on there
being something to be bad at.

**⚠ Cross-cutting 4 — alteration and repair are unmodelled**, though
`mending` already ships. See the tailoring finding below.

#### Per trade

**Textiles.** ⭐⭐ **Spinning holds `hands` and leaves `voice` free** —
the `search` precedent exactly. Spinning is the bottleneck, so players
will do it *a lot*, and a verb repeated thirty times is tedium; but
**spinning was historically the social act**, done in company while
talking. This turns the build's largest tedium risk into its best social
surface, and costs one slot decision. ⚠ Also: `spin`'s decision needs its
real unit — **yarn count** — or "how fine" stays a vibe. And **one fibre
makes the `f(…, fibre)` axis degenerate**; a wild bast fibre (nettle or
hemp), gatherable and needing no ranching, would make it real on day one.
Flagged as an open, not decided.

**Dyeing.** ⚠⚠ **The uniform 3 × 4 grid was wrong chemistry and is
corrected** (requirements § 13): madder and weld are **mordant dyes**;
**woad is a vat dye** — insoluble, reduced in an alkaline vat, oxidised
in air to blue, taking **no mordant at all**. Ships as **2 × 4 plus woad
as the deliberate exception**, which teaches that *dyeing is two
chemistries, not one*. Plus **exhaust dyeing** (first dip deep, second
paler) and **overdyeing** (blue over yellow is how green was made — a
free compositional axis). ⚠ And **there is no colour vocabulary yet**: an
author writing "madder + alum" needs a hue namespace, and a dyed garment
needs to describe itself.

**Tailoring.** ⭐ **The missing lesson: a pattern is a 2D solution to a 3D
problem, and cloth is expensive.** Cutting is **optimisation under
waste**, which makes `cut`'s decision concrete — cut tight (less waste,
no room to alter) vs cut generous (more waste, seam allowance for later).
That is also where offcuts come from.

⭐⭐ **And the best gamification finding in the pass: `getMass()` moves
with metabolism, so YOUR CLOTHES STOP FITTING WHEN YOUR BODY CHANGES.**
It falls out of P7 with **zero new mechanism**, and it converts tailoring
from a one-time purchase into a **recurring service** — alteration,
letting out, taking in — which is what a real tailor's repeat business
actually is. It is the retention loop for tailoring the way recolouring
is for dyeing.

⭐ **RP: the fitting is the beat.** Being measured is an interaction with
another character, and it is *mechanically necessary* because `cutTo`
needs a subject. Neither of the other two trades has a scene like it.

---

## Stage A — the kernel half

### Wave A1 — the UX wave: `worn`, the card layout, the impression line

⭐⭐ **Lands first.** Nothing in it depends on anything else in this build.
Per P1 + P2.

- **Server:** `lib/slot/Slotted.ts` (the `worn` subscribable field, two
  `fireFieldChange` sites, the impression augmenter);
  `lib/spatial/Container.ts` (the fourth filter clause);
  `api/mql-subscription.ts` (`'worn'` in `DETAIL_FIELDS`).
- **Types:** `worn?: StuffRefRecord[]` on `StuffDetailRecord`, documented
  as the *body* half against `contents`' *pack* half.
- **Content:** `content/platform/content/descriptor-banks/impression.yaml`.
- **Client:** a `WornList` section in `CardBodies.tsx`, rendered for every
  kind **including `agent`**, above `HereList`.
- **Tests:** the `worn` projection (worn projects, carried does not, the
  two are **disjoint** over one host); the concealment filter (an
  unperceived worn item never enters the projection); the augmenter trio —
  *names no individual garment*, *no phrasing repeats in 20 reads*,
  *renders nothing on a `Slotted` host with no body plan*;
  `CardBodies.test.tsx`. Pins: `card-birth-path.test.ts`,
  `CardFeed.test.tsx`.
- **Docs:** `card-surface.md` § worn vs carried; `mql-subscription.md`.
- **Proves it:** `look` at a dressed NPC shows a worn section and a
  gestalt line; their pockets stay private.

### Wave A2 — `Construction`: the covering rename, `quilted`, the second source

Per P3. ⚠⚠ **Verify the `FabricCatalogue.postRegister` warm ↔ garment-row
hydration ordering before writing anything else in this wave** — if a
garment row hydrates before the roster warms, `setConstructionForm`
throws. The boot-time totality assertion is the named contingency (P3.6).

- **Kernel:** `Construction.ts` (rename, `quilted`,
  `TEXTILE_RESIST_PROFILE`, the registry, the widened ladder); new
  `platform/idea/material/Fabric.ts`;
  `platform/idea/FabricCatalogue.ts` (self-warming via `postRegister`,
  `canEvict` veto, listed in the platform pack's `boot:`).
- **Rename sweep:** the seven production files in P3.5 plus
  `check-does-nothing.ts`, `Construction.test.ts`,
  `material-response.test.ts:30`.
- **Content:** `base-library` — `/stuff/idea/fabric/{woven,knit,felted}`.
- **Tests:** the depth ladder is **total** over kernel ∪ registered forms;
  an out-of-range `layerBand` throws at registration; `responseFor` on a
  textile form returns `poor` on all three mechanical channels and still
  throws on `shock`; `getDomain()` returns `'covering'`; a registered fabric
  survives `clearFabrics` + re-register (HMR); `doesNothing()` false
  for every form.
- **Lints:** `does-nothing`, `inert-weapon`, `census`, `untitled`,
  `instanceable`.
- **Proves it:** `analyze response` on a linen shirt reads *poor · poor ·
  poor* — armor that does not work, legibly.

### Wave A3 — `Garment` composes like `Armor`; fifteen rows become real objects

Per P4.

- **Kernel:** `Garment.ts` gains the four mixins; `Armor.ts` →
  `extends Garment`. Apply the class/interface merge if the surface
  narrows.
- **Content:** all nine `clothes/*.yaml` gain `_materialPath`,
  `constructionForm`, `gradeBand`, `mass`. `wool.yaml`'s
  `appearance: thick woven wool` → `appearance: wool` (a material must not
  assert a construction); `composition`/`chemistry` populated on the fibre
  rows (cellulose for plant fibres, keratin for wool).
- ⚠ **A linen material row does not exist yet.**
  `/stuff/idea/material/textile/linen` is authored **here**, in
  `base-library`, so Stage A stands alone; B1 points the flax plant at it.
- **Tests:** every shipped `clothes/` and `armor/` row resolves material +
  form + mass (a **content** test beside the pack, not a kernel test —
  `lint:test-content`); **no row authors `clo`**; a `Garment` is
  `isCrafted`/`isDurable`/`isConstructed`/`isDetailed`.
- **Proves it:** the shipped hoodie has a weight, a material, a grade and
  a wear condition, and `repair` works on it.

### Wave A4 — species `baseMass` + `stature` (isolated; own gym run; own review paragraph)

Per P8. ⚠ **Moves live numbers. Its own commit, its own message.**

- **Kernel:** `BodyPlan.ts` (`baseStature`), `Species.ts` (both fields +
  resolving getters), `Creature.ts:229`, `CombatLogic.ts:2143`,
  `NaturalAttack.deriveProfile`.
- **Content:** `biped.yaml` `baseStature: 1.75`; **ten** playable `homo/*`
  rows gain `baseMass` + `stature` (the P8 table).
- **Bench:** `scripts/__tests__/species-mass.bench.test.ts` added to
  `GYM_TESTS` — the per-species table, snapshotted.
- **Tests:** `Creature.mass.test.ts` extended (species override wins over
  plan; absent override inherits; an authored instance mass still wins
  over both). Pins: encumbrance, metabolism, thermal, `CombatLogic`.
- **Run:** `pnpm test:gym` **once**, at the end of this wave. Quote the
  numbers in the MR description.
- **Docs:** `race.md` § size; `encumbrance.md` § body mass (it currently
  names `BodyPlan.baseMass` as the resolution, now one layer down);
  `combat.md` § the mass-scaled fist.
- **Proves it:** a halfling and a dragonborn no longer carry the same
  weight, punch with the same energy, or cool at the same rate.

### Wave A5 — the covering stack: the covering-stack methods, derived `clo`, per-part thermal

Per P5 + P6. **The largest and riskiest kernel wave.**

- **Kernel:** the covering-stack methods on `Slotted.ts`;
  `Wearable.ts` (delete the `clo` field, derive `getClo()`); `BodyPlan.ts`
  (`getPartSurfaceFraction`); `ThermalRegulation.ts` (the surface-weighted
  per-part sum + the windproofing term); `Tangible`/`Wet` (wet mass);
  `WearController.ts` (the ladder refusal).
- **Refactor:** `ConditionLogic:109–150`, `CombatLogic:2746–2780`,
  `ElectricityLogic:247` re-pointed at `host.coveringAt(part)`; the three
  local walks deleted.
- **Settings:** the clo dials (`ABS_REF`, the looseness coefficient, the
  windproofing weight).
- **Tests:** wool out-insulates linen at equal mass from material
  properties alone (AC 2); a soaked garment loses insulation and gains
  mass, wet wool > wet linen (AC 3); an uncovered part is colder (AC 4);
  the stack orders by band with wear-order tie-break and a shirt cannot go
  over plate (AC 5); ⚠ **the three refactored walks produce identical
  results to their pre-refactor selves — write these pins BEFORE deleting
  the local walks.**
- **Docs:** `thermal.md`, `slot.md`, `embodiment.md`,
  `materials-response.md`; `docs/subsystems/textiles.md` is started here.
- **Proves it:** stand in the cold with bare hands and your hands get
  cold; put on the wool coat and they do not, but the rest of you warms
  first.

### Wave A6 — fit: derived measurements, the cut-to stamp, the lineage seam

Per P7. Depends on A4 (stature) and A5 (clo).

- **Kernel:** `Wearable.ts` (`cutTo`, the stock fallback);
  `WearableMixin.fitOn` + the clo/burden/wear consequences;
  `WearController` (the impossible-fit refusal); `LoadBearing.ts` (the
  tightness burden term).
- **Tests:** bespoke out-performs stock on the same body (AC 7); a
  halfling's garment fails on a dragonborn with a `fit-impossible` note
  (AC 7); an unstamped row reads as stock against the plan average; ⭐
  **the lineage seam test — changing only `Creature.getMass()` changes
  `fitOf` with no textiles code touched.** That is the test that proves
  textiles will not need re-opening when lineage lands.
- **Docs:** `embodiment.md` § fit; `race.md` § the lineage seam.

### Wave A7 — the wardrobe: `wear set` as a stanza, zero new verbs

Per P12.

- **Kernel:** new `lib/slot/Wardrobe.ts`; `Avatar` composes it;
  `WearController` gains `set` / `sets` handling (or a sibling controller
  in the same category — the build agent's call, but `dress` stays
  unclaimed either way).
- **Content:** `wear.yaml` gains `subcommands:` with help text.
- **Tests:** `--save` captures wear order; replay dresses innermost-first
  and never trips the ladder; a missing keyword is skipped readably and
  the rest still land; the wardrobe survives a capture/materialize
  round-trip; ⚠ **a source-shape test asserting `wear.yaml` registers
  exactly `[wear]` and that no view anywhere claims `dress`.**
- **Docs:** `slot.md`; `command-spec.md` (the stanza-not-a-verb precedent,
  second instance after `measure strike`).

### Wave A8 — soiling routing, the pre-registered event, the wash/fade loop

Per P9.

- **Kernel:** new `lib/material/Dyed.ts`; `Garment` composes it;
  `WashController` gains the launder branch; `outermostAt` gets its
  second consumer. ⚠ **No `lib/events.ts` edit** — P9.
- **Tests:** `outermostAt` answers the outermost layer over an affected
  part, and the *shirt* when no outer layer covers it; washing decays
  fastness and a poor mordant fades faster; ⚠ **a negative test asserting
  no `SoilableMixin` exists, `CraftVessel.soiled` is untouched, and this
  build registers no `soil.*` event.** Pins: the bar and Hearthworks
  vessel-wash suites.
- **Docs:** `crafting.md` § the wash branch; `textiles.md` § the soiling
  seam — what is in, what is out, and who owns the gauge.

### Wave A9 — concealment derive-on-read, the conspicuity rebase, the hood/veil interlock

Per P10 + P11.

- **Kernel:** `ConcealmentLevel.ts` (the band, `isConcealed`, the dial);
  `Concealable.ts` (derive-on-read); `PerceptionLogic.hideLevelForImpl`
  (the covering term + the conspicuous floor); `lib/magic/Charged.ts` (the
  attention factor); `SlottedMixin` (`concealmentOffset`,
  `attentionFactor`).
- **Settings:** `concealment.level.conspicuous`,
  `stealth.hide.coveringWeight`, the attention floor.
- **Tests:** camo lowers and conspicuous raises detectability (AC 18);
  ⚠ **every authored `concealment:` row in shipped content still
  resolves** (AC 19) — a content test walking the rows; `degradeHide`
  floors at `conspicuous`; the **shipped** hood lowers a veil's standing
  cost (AC 21); ⚠ **a doctrine test asserting no garment changes what can
  be cast and that caster efficiency stays capped at 1.**
- **Docs:** `concealment.md` (**including the honest note that `perceives`
  saturates below `obvious`**), `perception.md`, `stealth.md`,
  `magic-items.md` § the attention term.

### Wave A10 — Stage-A docs, schema, lint sweep; the seam commit

- `docs/subsystems/textiles.md` finished for the kernel half. ⚠
  **`CLAUDE.md` is an index file — leave its line to the sweep** per the
  worktree rules; note it in the finalize list rather than racing for it.
- `materials-response.md`, `embodiment.md`, `slot.md`, `card-surface.md`,
  `thermal.md`, `concealment.md`, `crafting.md`, `race.md` all current.
- `pnpm gen:schema`; the full lint family green (**all eight this build
  trips**).
- **The seam commit.** After this, `packages/server/src` and
  `packages/client/src` are frozen for the rest of the MR.

---

## Stage B — the pack half

### Wave B1 — `trade-farming` rows + Hinkley Hills placement

Content only, existing packs.

- **Species rows** on the commons taxonomy — *Linum usitatissimum*,
  *Rubia tinctorum* (madder), *Reseda luteola* (weld), *Isatis tinctoria*
  (woad) — following the shipped row shape and `_parentCladePath`.
- **`trade-farming`:** per-species plant/seed rows; the harvest outputs —
  a **flax sheaf** (`GradedReceptacle`-shaped, holding bulk `flax-straw`)
  and three dyestuff crops; the `flax-straw` material row.
- **`terminus`:** four seed packets on the general store's gardening
  lines. ⚠ Coordinate on `counter.yaml` (shared file).
- **`hinkley-hills`:** nothing structural — the shipped yard bed grows
  flax today. Prose only, if anything.
- **Proves it:** plant flax in the Hinkley yard bed, water it, harvest a
  graded sheaf.

### Wave B2 — the `trade-textiles` pack ⭐⭐⭐ (carries the bottleneck obligation)

- **Pack scaffold** per P14: root, title claim, group, `package.json`,
  workspace + deployment registration.
- **Preparation — retting, with no verb.** ⚠ **The stage is `prepare`;
  retting is flax's instance of it** (P15 seam 1). Nothing here may name
  the stage "retting". A `RettingPit` (`Bulkable` + `Fermenting`) and a
  `FermentProfile` row — `inputCategory: flax-straw`,
  `productMaterial: …/flax`, `ratePerDay`, `stallBelowK`/`damageAboveK`
  (cold water rets slower — real, and it makes season matter), **`turnDays`
  + `turnedMaterial: …/rotted-flax` as the over-ret failure.**
- **Four verbs, four decisions:** `scutch` (purity vs staple length —
  ⭐ **yielding tow and shive**, P17), `spin` (**yarn count** — fine vs
  fast; ⚠ overreaching **wastes stock**), `weave` (density → yield vs
  windproofing and wear; a bad run yields a **flawed bolt**), `full` (the
  felting/finishing pass — one mechanism, two inputs).
- ⭐⭐ **`spin` holds `hands` and leaves `voice` free** (the `search`
  precedent). The bottleneck is the verb players repeat most, and
  spinning was historically the *social* act — this is what stops the
  build's best lesson being its worst chore (P17).
- **The `textiles` Discipline** (P16): competence buys **how fine you can
  go before it breaks**, never more yarn from the same sheaf.
- ⚠ **Siting matters** — a retting pond fouls water and stank enough to
  be banned upstream of towns. Contamination-by-kind already ships.
- **The tool ladder:** drop spindle → spinning wheel
  (`{kind: spinning, rate: 3}` — the `sewing-kit`/`sewing-machine` shape
  verbatim); hand loom → broad loom. **The wheel unlocks nothing.**
- ⭐ **Durations are dials, not constants** (`textiles.spin.baseMs`, …),
  read the `sharpenDurationMs()` way rather than the `HAMMER_MS` way —
  **so the bottleneck is tunable in settings and assertable by a bench
  without recompiling.**
- **Venue:** the mill in Terminus (see Opens).

⭐⭐⭐ **The bottleneck bench** —
`packages/content/trade-textiles/src/idea/cmd/textiles/__tests__/mill-throughput.bench.test.ts`,
run by the pack's own vitest (fast: it counts durations, it does not
fight):

1. Fix the unit of account at **one bolt of linen**.
2. Walk the real controllers at a fixed clock, accumulating **attended
   game-seconds per step** (retting is elapsed-but-unattended and is
   reported separately — **a wait is not labour**).
3. **Assert (a):** `spin` is the maximum attended step by a margin dial.
   *Spinning is the observable bottleneck.* ⚠ **Scope the assertion to the
   shipped tech level in the test's own name and comment** (P15 seam 3) —
   this is true before the wheel-and-loom era ends and false after, which
   is the lesson. A later mill wave must be able to change it without
   "fixing" a test that was never eternal.
4. **Assert (b):** with a `spinning` instrument at `rate: 3` in reach,
   `spin` drops ≈ 3× and **`weave` becomes the maximum.** *The wheel
   measurably moves the constraint to the loom.*
5. ⚠ **Assert (c) — the honest-finding leg.** The bench also computes
   bed-scale supply: one Hinkley bed's flax yield per season → sheaves →
   kg of line → bolts. It **prints** the number and asserts only that it
   is computed. **If one bed's annual yield is under one bolt, the ratio
   is arithmetically true and experientially unfeelable**, and the
   deliverable is a documented finding in `textiles.md` § *Throughput at
   bed scale* — naming field-scale flax (farming Stage B, Heart's Delight)
   as the fix — **not a fudged duration.** That is AC 13's escape clause,
   discharged by measurement rather than assertion.

- **Docs:** `textiles.md` § the chain, the tool ladder, the throughput
  finding; `fermentation.md` § retting as a third customer.
- **Proves it:** seed → sheaf → pit → line → yarn → cloth (AC 11), with a
  graded bolt at the end (AC 12).

### Wave B3 — the `trade-dyeing` pack ⭐⭐ (the customization core loop)

- **Pack scaffold**; the `dyeing` Discipline.
- ⚠⚠ **Two chemistries, not one** (P17, requirements § 13). **Madder and
  weld are mordant dyes** — `f(dyestuff, mordant, fibre)` → `(hue,
  fastness)`, derived, never a lookup table: 2 × 4 = eight outcomes from
  six rows. **Woad is a VAT dye** — insoluble, reduced in an alkaline vat,
  **oxidised in air to blue**, taking **no mordant**; a mordant applied to
  woad is **refused**, not silently ignored. The reduction vat is
  fermentation-shaped.
- **The bath exhausts** — first dip deep, second paler, third paler still.
  A real resource decision, and the dye pack's byproduct.
- **Overdyeing composes** — blue over yellow is how green was made.
- ⚠ **A colour vocabulary is needed**: a hue namespace an author can write
  against, and a way for a dyed garment to describe itself.
- **The `dyeing` Discipline** (P16): competence buys **fastness and
  repeatability** — matching last month's lot — never a brighter hue.
- The dyehouse in Terminus; the vat as a class in `src/thing/`.
- **Tests:** twelve pairs each produce a hue and a fastness (AC 14); iron
  saddens and alum brightens the same dyestuff; **washing decays fastness
  and a poor mordant fades faster** — closing the loop A8 opened; a dyed
  garment's `concealmentOffset` moves with its hue (the P10 tie-in).
- **Proves it:** buy a plain shirt, dye it, wash it four times, and see
  the difference between a good mordant and none.

### Wave B4 — the `trade-tailoring` pack; the jerkin leaves smithing

- **Pack scaffold**; the `tailoring` Discipline.
- **`cut`** — consumes cloth (or hide, when leatherwork lands — the
  diamond's other input, seamed now and unused), takes a **subject**
  (yourself, a customer, or nobody = stock), and **stamps `cutTo`** (P7).
  **A pattern is a Recipe.**
  ⭐ **Its decision is optimisation under waste** (P17): cut tight (less
  cloth, no seam allowance to alter later) vs cut generous (more cloth,
  room to let out). **Offcuts are the byproduct** — patchwork, quilting,
  rag stock.
  ⭐ **The fitting is a scene.** Taking a subject's measurements is an
  interaction with another character, and it is mechanically necessary
  because `cutTo` needs one.
- ⭐⭐ **`alter`** — the retention loop, and it costs almost nothing:
  `getMass()` moves with metabolism, so **a garment cut for you last
  season stops fitting**. Letting out and taking in re-stamps `cutTo`
  toward the current body, spending seam allowance the original `cut`
  decided to leave. This is what makes tailoring a **recurring service**
  rather than a one-time purchase (P17).
- **The `tailoring` Discipline** (P16): competence buys **fit
  precision** — how tightly `cutTo` matches the measured body.
- **`sew`** — assembly. Output is a `Garment` with a real material, form,
  mass, grade and maker's mark.
- **The jerkin moves:** `trade-smithing/content/recipes/leather-jerkin.yaml`
  → `trade-tailoring/`, `discipline: smithing` → `tailoring`. ⚠ Its
  `{category: hide}` input still has no producer — **that is leatherwork's
  Stage-C gap and not this build's to close. Do not invent a hide
  faucet.** `trade-smithing`'s `pack.yaml` description drops the jerkin.
- **The maker's prose:** `cut`/`sew` route the maker's authored
  `DetailedMixin` prose onto the instance through the `recordAuthoring`
  gate — **you buy the look by buying the object** (AC 16).
- **Livery** — a named set a business issues. ⚠ "Outfit" is a `Business`;
  the word here is **livery**, everywhere, including identifiers.
- ⭐ **The shop is an `AttendantMixin` service point** (user, 2026-09-02),
  `discipline: appointment` — you go to the shop, you are served, you are
  measured, you come back. Chosen over the gig board for v1 because
  **the fitting scene is tailoring's best RP beat and a job board has
  none**; the contract half is the player-tailor's, deferred.
- ⭐ **Measurements are remembered** (user, 2026-09-02), so a tailor can
  cut for an absent subject. See P18.
- **The tailor's shop + the tailor NPC** in Terminus, discharging the
  `barber / tailor` GAP row.
- **One demonstrator brain** — `src/behavior/tailors.ts`, addressed
  `/trade/tailoring/behavior/tailors` (⚠ a pack brain lives in the pack,
  never `/lib/behavior`). NPC reaction to dress lives **here**. ⭐ **No
  kernel gauge from dress to regard** — engine measures, subject values.
- **Tests:** `cut` + `sew` produce a garment (AC 15); the stamp is right
  and bespoke beats stock through it; the maker's prose persists and
  renders on the wearer (AC 16); the jerkin resolves under `tailoring` and
  **not** under `smithing`. Pin: the smithing suites.

### Wave B5 — cold boot, drives, docs, finalize runway

- **AC 17:** all three packs install and boot **from a cold DB**, each
  holding its own root. A `PackLogic.discover` test asserts install order
  and root ownership; a real cold-boot drive confirms it.
- **The drives:**
  1. *The chain* — plant flax, ret it, **over-ret a second batch and see
     it rot**, scutch, spin (feel it), buy the wheel, spin again (feel the
     difference), weave, cut, sew, wear.
  2. *The buyer* — buy a stock shirt and note it fits badly; commission a
     bespoke one; dye it; wash it; wear the set with one command.
  3. ⭐ *The dressing-mistake drive.* Walk into cold weather underdressed
     and soaked. **The bench that proves this** is a kernel test in
     `lib/thermal/__tests__/` (written in A5, run again here) asserting
     three things: the affliction ladder stages in order;
     **time-to-first-cue is earlier than time-to-danger by a dial-backed
     margin**; and the impression line names the *cause* — *"soaked
     through"*, *"nothing on your hands"* — never a number.
- **Docs:** `textiles.md` complete; `content-packs.md` gains the three
  packs and the count; `vocations.md` and the trade roster discharge the
  `textiles` and `barber / tailor` GAP rows; `crafting.md` gains the three
  trades.
- **The slate** is reduced to its unbuilt tail — leatherwork, wool and its
  left edge, cotton/silk, patterns-as-artifacts, magic garments, hair dye,
  individual body variance (AC 24).
- **Finalize runway:** source-change check, **one** full `pnpm test`,
  `pnpm test:gym`, the lint family, `pnpm gen:schema`, push — then stop
  for the user's MR review.

---

## Acceptance-criteria coverage

| # | criterion | wave(s) |
|---|---|---|
| 1 | `Garment` composes Constructed/Durable/Crafted/Detailed; nine rows carry material, form, mass | **A3** (A2 supplies the forms) |
| 2 | No authored `clo`; derived; wool out-insulates linen at equal mass | **A5** (P5) |
| 3 | Soaked garment loses insulation, gains mass; wet wool > wet linen | **A5** (P5) |
| 4 | The **thermal** consumer of `getSlotsCovering` exists; an uncovered part is colder | **A5** (P6) |
| 5 | Stack orders by band, wear-order breaks ties; shirt not over plate | **A5** (P6), ladder from **A2** |
| 6 | **Ten** playable species declare `baseMass` + `stature`; gym re-run, movement recorded | **A4** (the species-mass bench snapshot) |
| 7 | Garment stamps cut-to measurements; bespoke beats stock; cross-species fails | **A6** (P7), stature from **A4** |
| 8 | `worn` in `DETAIL_FIELDS`; card renders worn and carried separately | **A1** (P1) |
| 9 | Impression augmenter summarizes in aggregate, names no garment | **A1** (P2) |
| 10 | `wear <set>` in one command; **no new verb** | **A7** (P12) |
| 11 | Flax grown, retted (with over-ret failure), scutched, spun, woven, fulled — end to end | **B1** + **B2** (P13) |
| 12 | Staple-length grade propagates harvest → bolt | **B1** + **B2** (the shipped weakest-link) |
| 13 | Bench shows the spinning bottleneck and the wheel moving it; **or the finding is documented** | **B2** (the three-legged bench; leg (c) is the escape clause) |
| 14 | `dye` produces hue + fastness over 3 × 4; washing decays; poor mordant fades faster | **B3** (the fade half seams in **A8**) |
| 15 | `cut` + `sew` produce a garment; the jerkin leaves `trade-smithing` | **B4** |
| 16 | Maker's authored prose persists and renders on the wearer | **B4** (the `recordAuthoring` gate) |
| 17 | Three packs install and boot from a cold DB, each holding its own root | **B5** (scaffolds in B2/B3/B4) |
| 18 | `getConcealment()` derives; camo lowers, conspicuous raises | **A9** (P10) |
| 19 | A band below `obvious`; every authored concealment row still resolves | **A9** (the content-walk test) |
| 20 | `outermostAt` answers which layer takes a deposit; **no `SoilableMixin` and no `EventApi` event ship** | **A8** (including the negative test) |
| 21 | A mundane attention-reducing hood lowers a veil's standing cost | **A9** (P11) |
| 22 | `docs/subsystems/textiles.md` exists, linked from `CLAUDE.md` | **A10** + **B5**; the `CLAUDE.md` line lands at the sweep |
| 23 | `materials-response.md` / `embodiment.md` / `slot.md` / `card-surface.md` updated | **A1, A2, A5, A6, A10** |
| 24 | Slate retired or reduced to its unbuilt tail | **B5** / `/finalize` |
| 25 | Every touched collection has a current schema doc; `lint:schema` passes | **A10** + **B5** |

⭐ **No new Mongo collection is introduced by any wave.** The wardrobe
rides `holder_snapshots` via `PersistableMixin`; the soiling event is
transient; `cutTo`, `hue`, `fastness` and the species fields are
template/instance fields. **AC 25 is therefore "the docs still agree",
not "write a new one."**

---

## Risks, traps and opens

**Traps carried in, restated so they cannot be rediscovered:**

- `wear <set>` is a **stanza**; `dress` stays unclaimed (A7 ships a
  source-shape test that asserts it).
- **No `SoilableMixin`, and no `EventApi` event either** (P9) — just the
  routing method. A local interaction is a call, not a broadcast.
- **No authored `clo`** on any row, shipped or fixture.
- A pack never needs a kernel list edit; a capability pack holds its own
  root.
- No new collections; no migrations, compat shims or legacy adapters — a
  rename means dropping the DB.
- "Outfit" is a `Business`. The word is **livery**.
- ⚠⚠ **A pack `src/` cannot hold a mixin, an Api or a `lib/`** — which is
  why `DyedMixin`, `CoveringForm`, `WardrobeMixin` and
  the covering-stack methods are all kernel and all in Stage A.
- ⚠ `hood.yaml`'s `covers: [face]` is `DisguiseBearingMixin`'s field, not
  `SlotSpec.covers`. `face` is not a body-plan part key.
- ⚠ `Construction.ts` must stay import-pure — two build-time lint scripts
  instantiate it outside the runtime.
- ⚠⚠ **Do not add a `kevlar` construction form** (P15). Material scales
  the resist magnitude; a high-performance textile is a `woven` fabric of
  a tough material, not a new form.
- ⚠ **The stage is `prepare`; retting is flax's instance of it.** No
  controller, recipe id, category, doc heading or test name may treat
  "retting" as the stage's name.
- ⚠ **`spin` takes a fibre MATERIAL** — the chain's entry point is the
  fibre row, never the pit, or only flax will ever work.

**Managed risks:**

1. **A5's three-walk refactor** is the highest-risk change in the build.
   Mitigation: write the equivalence pins *before* deleting the local
   walks, and keep combat, condition, electricity and hazard in the wave's
   `test:near` set.
2. **`setConstructionForm` validation ordering** (P3.6) is unverified. A2
   verifies it first; the boot-time totality assertion is the contingency.
3. **The `DETAIL_FIELDS` wire change** (A1) touches the client contract.
   Both sides must tolerate absence.
4. **A4 moves live numbers** in four subsystems — its own wave, commit,
   gym run and review paragraph.
5. ⚠ **Bed-scale flax may make AC 13 unfeelable.** Anticipated, not a
   surprise: leg (c) measures it and the finding is documented. **Do not
   fake the durations.**
6. **The jerkin still consumes a `hide-stock` nothing produces.** Moving
   it is the requirement; producing hide is Stage C's.
7. `counter.yaml` (B1) is a shared file — mechanical rebase if another
   branch touches it.

**Opens for the user** (defaults stated; say the word to change one):

1. ✅ **RESOLVED — `Armor` is retired** (user, 2026-09-02). Six rows and
   twelve test imports repoint at `Garment`; the `armor/` content
   directory name stays.
2. ✅ **RESOLVED — the proposed venues stand** (user, 2026-09-02): the
   mill and dyehouse at Wharfside (near the water retting wants, downwind
   for a nuisance trade), the tailor's shop off University Avenue or on
   Mayfield Row. Names and prose are the build agent's pen.
3. ✅ **RESOLVED — the ten-species table is in P8** (2026-09-02).
4. ⚠ **Does a second fibre ship?** One fibre makes `f(…, fibre)`
   degenerate at launch (P17). A wild bast fibre — **nettle or hemp**,
   gathered rather than farmed — needs no ranching and barely any new
   crop work, and would make the dye axis real on day one. Against it:
   more content, and the doctrine of not authoring ahead of demand.
5. ⚠ **What is a hue?** Dyeing needs a colour vocabulary an author can
   write against, and a way for a dyed garment to describe itself
   (P17). The `DescriptorBank` shape is the likely precedent.
6. ✅ **RESOLVED — `/stuff/idea/fabric/`** (user, 2026-09-02). Neither
   `covering` nor `construction` read well; `fabric` is the trade's own
   term for this exact classification and the namespace can only ever
   hold fabrics.
