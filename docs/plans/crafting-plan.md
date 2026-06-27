# Crafting v1 (served path) — implementation plan

Implementation spec for the requirements at
[docs/requirements/crafting-requirements.md](../requirements/crafting-requirements.md).
Lane 2 of the Dave's Bar parallel wave; branch `feature/crafting-build` off
`origin/master`.

**The model (non-negotiable, from requirements):** crafting is
**location-agnostic**. The primitive is `recipe + maker + reachable
tools/inputs → stamped output`; `CraftingApi` has no "venue" concept.
Feasibility is emergent (reachable matter). The offer is a `Menu` object;
the maker is an agent; "Dave's Bar" is emergent content. **No
`CraftingVenueMixin`.**

**Generality scope (v1 = transform + bulk):** the recipe *skeleton* is
domain-neutral (slots-by-constraint, tools-by-capability, output template,
weakest-link grade, provenance, the fixed-control skill seam) and carries
every domain. v1 implements only the **transform** recipe shape (inputs →
one output, properties derived) over **bulk** inputs (the cocktail case);
**assembly** recipes (output properties *emerge from components* — a
genuinely different model the slate separates out) are deferred, not faked.
The two domain-specific steps — *consume inputs* and *apply output
properties* — are isolated behind named seams in `CraftingLogic` (Phase 3),
so cooking/smithing (glob/discrete/mass inputs, Tangible-material/component
outputs) arrive as **new branches**, never a rewrite. Recipe data is dev-tier
re-seedable, so the data shape (e.g. `measureL`) isn't locked in.

Two decisions taken with the user during planning:

- **serve/mix are general agent verbs** (any agent; maker = the giver). Only
  the *economic* gating (charging for access to stock) is deferred, not the
  verbs. `MakerMixin` is therefore used **only** to identify the `order`
  fulfiller (the bartender), never to gate serve/mix.
- **`obj/Npc.ts` (concrete `Character`) is created here, minimal.** Another
  worktree is also minting an NPC class; the merge conflict is reconciled
  later. Keep this one tiny (no behavior) to ease that.

All paths under `packages/server/src/` unless noted. Category tags reference
the CLAUDE.md module taxonomy.

---

## Phase 0 — Vocabularies & value-objects

### NEW `mud/lib/craft/Grade.ts` — named value-object
Ordinal quality band; **not** a `Quantity`.
- `export type GradeBand = 'poor'|'fair'|'fine'|'exceptional'|'masterful';`
- `export const GRADE_BANDS: readonly GradeBand[]` (low→high; doubles as the validation array).
- `export class Grade`: private `band`, private ctor.
  - `static of(band: GradeBand): Grade` (validates), `static fromOrdinal(n): Grade`.
  - `static isBand(s: string): s is GradeBand` (fold the predicate here — no free function).
  - `getBand()`, `getOrdinal()`, `renderBandWord(): string`, `compareTo(other): number`, `equals(other)`, `min(other)`, `max(other)`.
  - `static deriveAtFixedControl(inputs: readonly Grade[], _control?: number): Grade` — weakest-link `min`; empty → `Grade.of('fair')` fallback (so an un-graded craft still gets a verdict). `_control` is the deferred skill seam (ignored v1).

### NEW `mud/lib/craft/ToolCapability.ts` — named vocabulary
- `export type ToolCapability = 'shaker'|'strainer'|'muddler'|'mixing-glass';`
- `export const TOOL_CAPABILITIES: readonly ToolCapability[]`.
- `export class ToolCapabilities { static readonly ALL; static isCapability(s): s is ToolCapability }` (predicate folded into a class, not a free function).

**Test:** `lib/craft/__tests__/Grade.test.ts` — band ordering, `renderBandWord`, `deriveAtFixedControl` = min.

---

## Phase 1 — Mixins

Each new mixin: registered in `lib/mixin.ts` `Mixins` + a `MixinApi.isX`
predicate in `api/mixin.ts` (type-only interface import). **No `#`-private
instance state** (proxy trap) — TS `private`/public only. Persisted fields
public for the Hydrator. Internal mutation invariants on accessor pairs.

### NEW `mud/lib/craft/Graded.ts` — `GradedMixin`
The shared grade carrier (input bottles **and** `CraftedMixin`). The
persist-string / value-object-contract split: the Hydrator dispatches
`set<Field>(rawStoredValue)`, so the persisted field is the band **word**,
and the `Grade` value-object rides separate contract methods.
- `export interface Graded { getGrade(): Grade; setGrade(g: Grade): void; getGradeBand(): string; setGradeBand(b: string): void; }`
- `public gradeBand: string = 'fair';` · `static persistentFields = ['gradeBand'];`
- `setGradeBand(b)` validates via `Grade.isBand`; `getGrade()` = `Grade.of(this.gradeBand)`; `setGrade(g)` sets `gradeBand = g.getBand()`.
- Register `Graded: 'GradedMixin'`; add `MixinApi.isGraded`.

### NEW `mud/lib/craft/Tooled.ts` — `ToolMixin`
Capability + wear-on-use condition.
- `export interface Tooled { getCapabilities(): readonly string[]; setCapabilities(c: string[]): void; hasCapability(c: string): boolean; getCondition(): number; setCondition(n: number): void; wear(amount?: number): void; }`
- `public capabilities: string[] = [];` · `condition` via `private _condition = 1` + accessor pair clamping 0..1 · `static persistentFields = ['capabilities','condition'];`
- `setCapabilities` validates each against `ToolCapabilities.isCapability`. `wear(amount = WEAR_PER_USE)` decrements condition (floor 0). Repair deferred.
- Register `Tool: 'ToolMixin'`; add `MixinApi.isTool`.

### NEW `mud/lib/craft/Crafted.ts` — `CraftedMixin` (composes `GradedMixin`)
Per-instance maker's mark + the quality verdict.
- `export function CraftedMixin(Base) { return class extends GradedMixin(Base) {...} }`
- `export interface Crafted extends Graded { getMaker(): string; setMaker(p): void; getRecipe(): string; setRecipe(r): void; getCraftedAt(): number; setCraftedAt(n): void; stamp(spec): void; renderVerdict(): string; }`
- Own persistent fields `['maker','recipe','craftedAt']` (`maker` = templatePath, `recipe` = recipeId, `craftedAt` = seconds). Inherited `gradeBand` unions via the prototype walk.
- `stamp({maker, grade, recipe, craftedAt})` sets all four (one mutator CraftingLogic calls).
- `renderVerdict(): string` — DF band-word headline + grade-keyed prose (a `VERDICT_PROSE: Record<string,string>` const) + maker name resolved via a **module-private** `resolveMakerName(path)` (`StuffApi.findByTemplatePath` → `getPresentation()`; never a `#` method). **Never a number.**
- Register `Crafted: 'CraftedMixin'`; add `MixinApi.isCrafted`.

### NEW `mud/lib/craft/Maker.ts` — `MakerMixin`
Minimal role marker: "this agent can fulfill orders." Used **only** by the
`order` fulfiller resolution (not for serve/mix gating).
- `export interface Maker { isMaker(): boolean; }` — `isMaker()` returns true.
- No persistent state. Register `Maker: 'MakerMixin'`; add `MixinApi.isMaker`.

**Tests:** `Graded.test.ts` (band round-trip), `Tooled.test.ts` (capability match + wear decrements), `Crafted.test.ts` (stamp + `renderVerdict` band-word/prose/maker, no number).

---

## Phase 2 — Recipe Document + Catalogue + Seeder (the Emote trio)

Mirror `lib/social/Emote.ts` ↔ `obj/SoulCatalogue.ts` ↔
`backend/EmoteSeeder.ts`. Verify those three first.

### NEW `mud/lib/craft/Recipe.ts` — `Document` (`recipes` collection)
- `static collectionName = 'recipes';` · unique index on `recipeId`.
- Fields → `static persistentFields`: `recipeId`, `name`, `keywords:string[]`, `inputSlots: RecipeInputSlot[]`, `toolCapabilities: string[]`, `outputTemplate:string` (a real cloneable glass template path), `outputMaterial:string` (the cocktail Material path), `baseGradeBand?:string`.
- `export interface RecipeInputSlot { slot:string; category:string; minGrade:string; measureL:number; }` — flat objects → default-Hydrator round-trip (the `composition` precedent). (`measureL` is the v1 bulk-only amount; mass/count amounts arrive with cooking/smithing — re-seedable, not locked in.)
- `outputMaterial` is **one output-derivation strategy** — the *mixture* case, where no single input material flows through so the resulting substance is authored on the recipe. It is **not** the universal output rule (a transform like ore→ingot instead flows the input's material onto the output Tangible; assembly composes components). Documented as such so the field reads as a strategy, not "the way."
- Method surface: `getRecipeId/getName/getKeywords/getInputSlots/getToolCapabilities/getOutputTemplate/getOutputMaterial/getBaseGrade(): Grade|null/matchesKeyword(kw)`.

### NEW `mud/obj/RecipeCatalogue.ts` — singleton Idea (`/obj/RecipeCatalogue`)
`PostRegistrationMixin(Idea)`, mirror `SoulCatalogue`.
- Transient cache `Map<recipeId, Recipe>` + keyword index.
- `getRecipe(id)`, `findByKeyword(kw)`, `allRecipes()`, `warm()`, `postRegister()→warm()`, `canDestruct()` singleton refusal.
- **Gating:** the catalogue's read methods are reached only by `CraftingLogic`. Gate to `AnyOf(FromTemplate('/obj/api/crafting'), SelfOnly)`. **Do not** write a `FromModule('mud/api/recipe#RecipeApi')` gate — no `RecipeApi` exists (v1 has no minting verb), and `lint:gates` would dangle.

### NEW `backend/RecipeSeeder.ts` + `mud/config/recipes.yaml`
Mirror `EmoteSeeder`. Reads `mud/config/recipes.yaml` (NOT under `seeds/` — recipes are Documents, not templates; keep the seed walker from inserting them as templates). Idempotent by `recipeId`. Validates `recipeId`/`outputTemplate`/`outputMaterial`/non-empty `inputSlots`. `static async run(opts?)`.
- **EDIT** the boot sequence (where `EmoteSeeder.run()` is invoked — verify `backend/`) to call `RecipeSeeder.run()` in the same slot (before catalogue `postRegister` warms).
- **EDIT** the Mongo collection registration (where `emotes` index is declared) to add `recipes` + the `recipeId` unique index.

**Tests:** `Recipe.test.ts` (field round-trip), `obj/__tests__/RecipeCatalogue.test.ts` (load + resolve by id/keyword).

---

## Phase 3 — CraftingApi + CraftingLogic (gated forwarding pair)

Mirror `api/provenance.ts` ↔ `obj/api/ProvenanceLogic.ts`. Internal
sub-logic as **module-private functions** (no intra-singleton `this.x()`).

### NEW `mud/api/crafting.ts` — Api
- Call-shape types (their home): `MakerMode = 'self'|'fulfilling-bartender'`; `CraftRequest { recipeRef:string; makerMode:MakerMode; inputSelections?: Record<string,string> }` (**no principal**); `CraftOutcome = {ok:true; output:Stuff; grade:Grade} | {ok:false; reason:CraftDeclineReason; detail:string}`; `CraftDeclineReason = 'no-recipe'|'no-maker'|'missing-tool'|'insufficient-input'|'no-output'`; `RecipeView = {recipeId; name; keywords}`.
- `logic()` via `StuffApi.singletonSync('/obj/api/crafting', factory w/ HotReloadApi.getCurrentExport)`. Ends `SecurityApi.decorateApiClass(CraftingApi)`.
- Statics: `craft(req): Promise<CraftOutcome>`; `lookupRecipe(ref): Promise<RecipeView|null>`; `offeredRecipes(menu: Stuff): Promise<RecipeView[]>`.

### NEW `mud/obj/api/CraftingLogic.ts` — `@internal @Unshadowable` logic singleton (`/obj/api/crafting`)
Methods gated `@CallSecurity(FromModule('mud/api/crafting#CraftingApi'))` (the string must resolve — it does).

**`craftImpl(req)` algorithm** (module-private helpers; declines return
`{ok:false}`, programmatic/conservation breaches **throw**):

1. **Resolve recipe** — `RecipeCatalogue.resolve(req.recipeRef)` (by id or keyword). null → decline `no-recipe`.
2. **Resolve maker by `makerMode`** (un-spoofable; wire carries only the mode):
   - `'self'` → `ExecutionContextApi.getActingAuthor()` (the giver, for serve/mix). null → decline `no-maker`.
   - `'fulfilling-bartender'` → the giver is the *patron*; take the patron's location and find the present `MixinApi.isMaker(...)` agent (deterministic pick; none → decline `no-maker`). The maker is **never** off the wire.
3. **Gather reachable matter** from the maker's location: room contents + back-bar surface contents + maker inventory. `presentTools = isTool(...)`; `presentBottles = isBulkable & isGraded(...)`.
4. **Match input slots** — per slot: candidate bottles whose `Material.hasTag(slot.category)` ∧ `grade ≥ minGrade` ∧ reachable available ≥ `measureL`. Honor `inputSelections[slot.slot]` (`with <brand>`), else auto-pick (highest grade meeting floor). **Track per-bottle claimed litres** so two slots don't double-claim. None → decline `insufficient-input` (detail = category).
5. **Match tools** — per required capability, find a present tool with `hasCapability`. None → decline `missing-tool` (detail = cap).
6. **Derive grade** — `Grade.deriveAtFixedControl(matchedGrades)`; floor at `recipe.getBaseGrade()` if set.
7. **Clone output** — `StuffApi.clone(recipe.getOutputTemplate())`. Missing template → decline `no-output`.
8. **Apply output properties** — `applyBulkOutput(output, recipe, matchedSlots)` **(domain seam #1)**: `slot = BulkableApi.slotFor(output)`; `slot.setMaterial(StuffApi.singleton<Material>(recipe.getOutputMaterial()))`; `slot.setAmount(Quantity.of(Σ measureL, 'L'))` (BulkSlot mutators ungated). This is the **only** bulk/cocktail-specific output step; smithing adds a sibling `applyTangibleOutput` (flow material onto the Tangible), assembly an `applyComposedOutput`. The skeleton calls one named apply-fn — adding a domain is a new branch, not an edit here.
9. **Stamp** — assert `MixinApi.isCrafted(output)` (else throw — output template misauthored); `output.stamp({maker: maker.getTemplatePath()??'' , grade, recipe: recipe.getRecipeId(), craftedAt: WorldClockApi.getNow().rawValue()})`. (Domain-neutral.)
10. **Consume inputs (conservation)** — `consumeBulkInputs(matchedSlots)` **(domain seam #2)**: per matched slot `BulkableApi.transfer(bottleSlot, null, {kind:'measure', litres:measureL, mode:'strict'})`; **assert `applied === measureL`** else throw (conservation breach). The **only** bulk-specific consume step; globs/items add sibling `consumeGlobInputs`/`consumeItemInputs`. New branch, not an edit here.
11. **Wear tools** — each matched tool `.wear()`.
12. Return `{ok:true, output, grade}`. (Placement is the verb's job, not craft's.)

**Tests:** `obj/api/__tests__/CraftingLogic.test.ts` — happy path; missing-tool decline; insufficient/out-of-reach decline; grade=min; conservation (exact debit, output volume = Σ); maker un-spoofability (no wire field sets maker; `'self'` = giver, `'fulfilling-bartender'` = present MakerMixin agent); two-slots-same-category no double-claim.

---

## Phase 4 — Menu (the offer object)

### NEW `mud/obj/Menu.ts` — Stuff class (a standalone object, **not** a mixin)
`DetailedMixin(VisibleMixin(Thing))` (Thing → Tangible+Perceptible+Containable, so it sits in the room and resolves via `read menu`).
- `public offeredRecipes: string[] = [];` (recipeIds — references recipe documents, decoupled from craftability/maker/room) · `static persistentFields = ['offeredRecipes'];`
- `getOfferedRecipeIds()`, `addOfferedRecipe(id)`, `hasOfferedRecipe(id)`, `resolveOrder(keyword): Promise<string|null>` (maps an order keyword → an offered recipeId via `CraftingApi.lookupRecipe`, confirming it's in `offeredRecipes`).
- `getLong()` override appends the offered list (via `CraftingApi.offeredRecipes(this)`), so `read/look menu` renders the cocktails (the `getLong()` description override point).
- **Affordance:** `static commandContributions` contributes **all four verbs** (`menu`/`order`/`serve`/`mix`) to the **environment** bucket — so the whole crafting surface lights up for any agent in a room that holds a Menu (emergent; "any agent can mix" where a bar is). Verify the contribution-bucket mechanism against an existing environment-afforded verb.

**Test:** `obj/__tests__/Menu.test.ts` — `resolveOrder` offered vs un-offered.

---

## Phase 5 — Verbs (new `crafting` command category)

YAML in `mud/cmd/crafting/`, controllers in `mud/obj/command/crafting/`.
Controllers return `void`; outcome via `ctx.note({kind,...})` +
`MessageApi.scene(actor).topic('world.narration.action').toSelf/toPeers/toTarget(Mml).send()`.
Recipe/menu keyword args are `type: text` (recipes aren't room Stuff),
resolved by the controller via `CraftingApi`. Exemplars:
`obj/command/bulk/DrinkController.ts`, `social/SayController.ts`.

- **`menu`** (`MenuController`) — resolve the present `Menu` (named target or scan room); `CraftingApi.offeredRecipes(menu)` → render the list. No menu → `empty-result` note.
- **`order <item> [with <brand>]`** (`OrderController`, maker = fulfilling bartender) — resolve the `Menu`; `menu.resolveOrder(item)` → recipeId (null → decline "not on the menu"). `craft({recipeRef:recipeId, makerMode:'fulfilling-bartender', inputSelections})`. On `ok:false` → diegetic scene + `controller-rejected` note. On ok → `ContainmentApi.move(output, giver)` (patron holds it); scene toSelf/toPeers (the bartender hands it over).
- **`serve <patron> a <item> [with <brand>]`** (`ServeController`, maker = giver/`'self'`) — `craft({recipeRef:item, makerMode:'self', inputSelections})`; on ok `ContainmentApi.move(output, patron)`; scene toSelf/toTarget/toPeers.
- **`mix <item> [with <brand>]`** (`MixController`, maker = giver/`'self'`) — `craft(...)`; on ok `ContainmentApi.move(output, giver)`; scene toSelf/toPeers.

All four are afforded via the Menu's presence (Phase 4), so they're available
to any agent at the bar. serve/mix maker = giver (any agent); order routes to
the bartender.

---

## Phase 6 — Dave's Bar content (classes + seeds)

Authored as **templates** (cloned, not saved back) except recipe knowledge
(Documents). No bar-specific classes; compose general mixins. **No venue
mixin on `Bar`.** Mixin-composition-via-class is why each composition needs a
thin class to point a seed's `class:` at (the `Receptacle` precedent).

### Content classes (general, reusable)
- **NEW `mud/obj/Npc.ts`** — `export default class Npc extends Character {}` (concrete, minimal, **no Behaved**). Cross-lane: another worktree also mints an NPC class; keep this tiny; reconcile merge later.
- **NEW `mud/obj/Crafter.ts`** — `export default class Crafter extends MakerMixin(Npc) {}` (general maker-NPC; the bartender's class). Carries `isMaker()`.
- **NEW `mud/obj/GradedReceptacle.ts`** — `GradedMixin(BulkableMixin(Thing))` (the working spirit bottle; grade authored in `data.gradeBand`).
- **NEW `mud/obj/CraftedDrink.ts`** — `CraftedMixin(BulkableMixin(DetailedMixin(VisibleMixin(Thing))))` (the output glass; `getLong()` appends `renderVerdict()`).
- **NEW `mud/obj/ToolItem.ts`** — `ToolMixin(DetailedMixin(VisibleMixin(Thing)))` (the shaker; capabilities/condition in `data`).

### Materials (Idea singletons via `seeds/lib/material/...`, class `/lib/material/Material`)
One cocktail Material per recipe (per-instance ABV deferred; volume is the instance variable → BAC scales with how much is drunk through the existing ingest pipeline).
- Spirits (real category, fictional/unbranded): `seeds/lib/material/spirit/gin.yaml`, `vermouth.yaml`, `rum.yaml`, `lime.yaml` (lime = non-alcoholic). `data:{ name, appearance, edibility:true, toxicity:[{type:alcohol, amount}], tags:[<category>] }` — the category tag (e.g. `tags:[gin]`) is what input-slot matching keys on.
- Cocktails (one per recipe): `seeds/lib/material/cocktail/martini.yaml`, `daiquiri.yaml`. `data:{ name, appearance, edibility:true, toxicity:[{type:alcohol, amount}], tags:[cocktail] }`.

### Recipe documents — `mud/config/recipes.yaml`
- `martini` (stirred): inputs gin 0.06L ≥fair + vermouth 0.01L ≥fair; tools `[mixing-glass]`; output → cocktail-glass template + cocktail/martini material.
- `daiquiri` (**shaken** — exercises missing-shaker rejection): inputs rum 0.06L + lime 0.02L; tools `[shaker]`; output → cocktail-glass + cocktail/daiquiri.

### Item / NPC / menu seeds
- `seeds/obj/vessel/cocktail-glass.yaml` — class `/obj/CraftedDrink`, `data:{ shortDescription:'a cocktail glass', keywords:[glass], interiorBulk:true, interiorCapacity:0.2 }` (starts empty; filled on clone).
- `seeds/obj/vessel/gin-bottle.yaml` (+ vermouth/rum/lime) — class `/obj/GradedReceptacle`, `data:{ ..., interiorBulk:true, interiorCapacity:0.75, interiorMaterial:/lib/material/spirit/gin, interiorAmount:0.7, gradeBand:fine }`.
- `seeds/obj/tool/shaker.yaml` (+ optional mixing-glass) — class `/obj/ToolItem`, `data:{ keywords:[shaker], capabilities:[shaker], condition:1 }`.
- `seeds/obj/Menu/bar-menu.yaml` — class `/obj/Menu`, `data:{ shortDescription:"Dave's chalkboard menu", keywords:[menu,chalkboard], offeredRecipes:[martini, daiquiri] }`.
- `seeds/obj/Npc/dave.yaml` — class `/obj/Crafter`, `data:{ name:Dave, pronouns:he, _speciesPath:/lib/species/animalia/chordata/mammalia/primates/hominidae/homo/sapiens, lifecycleState:alive, shortDescription:'a weathered bartender', longDescription:... }`. **Validate this clones** (no NPC seeds exist today — see risk 5); check the minimal Character data shape against `seeds/obj/Avatar/seed.yaml`.

### EDIT `mud/domain/lounge/Bar.ts` + `seeds/domain/lounge/bar.yaml`
- **No venue mixin.** Place content in `Bar.postRegister` (after `verifyOutboundExits`): clone the bartender (`Crafter`), bottles, shaker, the Menu, and a back-bar `Surfaced` shelf (or place items directly — reachability covers both), via `StuffApi.clone` + `ContainmentApi.move`/`placeOn`. Verify the lounge fixture-placement pattern; if seeds support `data.contents`, prefer that. Bar stays `Exitable(Detailed(Visible(Location)))` — emergent, no flag.

---

## Phase 7 — Tests & registration

### Registration / wiring edits
- `lib/mixin.ts`: add `Graded`, `Tool`, `Crafted`, `Maker`.
- `api/mixin.ts`: add `isGraded`, `isTool`, `isCrafted`, `isMaker` (type-only imports).
- `lib/paths.ts`: add `recipeCatalogue` path + any recipe prefix needed.
- Boot sequence: `RecipeSeeder.run()`; Mongo `recipes` collection + index.

### Test plan (Vitest, `__tests__/` siblings) → acceptance criteria
| AC | File | Assertion |
|---|---|---|
| Grade bands + word | `lib/craft/__tests__/Grade.test.ts` | ordering, band-word, derive=min |
| Graded persist/contract | `lib/craft/__tests__/Graded.test.ts` | band round-trip |
| Crafted verdict | `lib/craft/__tests__/Crafted.test.ts` | stamp + verdict (no number) |
| Tool wear | `lib/craft/__tests__/Tooled.test.ts` | capability match + wear |
| Catalogue load | `obj/__tests__/RecipeCatalogue.test.ts` | resolve by id/keyword |
| Menu lookup | `obj/__tests__/Menu.test.ts` | offered vs not |
| craft-resolve | `obj/api/__tests__/CraftingLogic.test.ts` | happy/decline/grade/conservation/un-spoofable/no-double-claim |
| Served path + BAC | `obj/command/crafting/__tests__/served-path.integration.test.ts` | menu → order daiquiri → held drink attributed to Dave → drink → BAC rises; plus a player `mix` |

### Gates / discipline
- `pnpm build`, `pnpm lint` (incl. `lint:gates`), `pnpm test` green.
- `lint:gates`: `FromModule('mud/api/crafting#CraftingApi')` resolves; **no** dangling `RecipeApi` gate string.
- Export discipline: no free exported functions in `lib/craft/*` or `api/crafting.ts` — predicates folded into class statics; craft sub-logic is module-private inside `CraftingLogic.ts`; only classes/types/const-vocabs exported.
- No `#`-private on the new mixins (proxy trap). No new module categories. No new `eslint-disable` without sign-off.
- `docs/subsystems/crafting.md` + the CLAUDE.md doc-map entry + the `recipes` collection line are written at **finalize**, not now.

---

## Risk register (resolved recommendations)

1. **Fulfilling-maker identity** — `MakerMixin` role marker on the maker NPC (`Crafter`); `order` resolves the present `isMaker()` agent in the patron's location. Wire carries only `makerMode`.
2. **Menu = class** (standalone object), not a mixin.
3. **Bottle grade = `GradedMixin`** (Grade value-object contract), not a Property bag.
4. **One cocktail Material per recipe** — confirmed; per-instance ABV deferred; volume → BAC via the existing toxicity pipeline.
5. **NPC clone-from-seed unproven** — no NPC seeds today; validate `dave.yaml` clone early against the Avatar seed shape; the bartender is a full concrete Character (scene/getActingAuthor/getPresentation expect it).
6. **`Npc` cross-lane** — minimal here; another worktree also mints one; reconcile merge later (user-confirmed).
7. **No `RecipeApi`** — out of scope (no minting verb); gate the catalogue to `FromTemplate('/obj/api/crafting')` + `SelfOnly` so `lint:gates` stays clean.
8. **serve/mix affordance** — contributed via the Menu's presence (environment bucket) so any agent at the bar can use them; verify the contribution mechanism against an existing environment-afforded verb.
9. **Conservation** — assert strict `transfer` `applied === measureL`; throw on breach.
