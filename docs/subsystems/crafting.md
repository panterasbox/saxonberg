# Crafting (v1 — the served path)

Crafting is the **transformation** stage of the economy: where raw
inputs become valued goods — the point at which value is minted. This
build ships the first concrete slice, the **served path** at Dave's
Bar: a bartender turns the bar's spirits + tools + a known recipe into
a real, stamped cocktail, hands it to a patron, who drinks it and feels
it (metabolism is already shipped). It is the first end-to-end economic
loop (matter in → transformed → consumed) that runs with **zero RPG**.

The substrate (`lib/craft/`, `api/crafting.ts`, `CraftingLogic`,
`RecipeCatalogue`) is **general and reusable**; Dave's Bar is authored
*content* over it (templates + recipe Documents), never a bar-specific
class. Seeded by `docs/slates/builds/crafting-slate.md` with the
integrating exemplar `docs/slates/builds/daves-bar-slate.md`.

## The model: crafting is location-agnostic

The thing crafting represents is **transformation**, which has nothing
to do with place. The primitive is:

```
recipe + maker + reachable tools/inputs + (fixed) control → stamped output
```

`CraftingApi` has **no "venue" concept**. Feasibility is **emergent** —
"can I craft this here?" reduces to "are the required tools + inputs
reachable from the maker?" There is **no `CraftingVenueMixin`** (an
early draft's mistake that fused recipe-knowledge, maker,
means-of-production, and the offer onto one Location flag). Each of
those is its own concept with its own home:

- **Recipe** — the transform spec, a `Document` (see below).
- **Maker** — the agent who performs the craft and is stamped as
  provenance (a present bartender for v1). `MakerMixin` is
  **augment-gated** (`_augmentGated = true`): a bar `Crafter` composes it
  always but is a maker only while its **on-shift** Position confers it, so
  `MixinApi.isMaker` (now routed through `isActive`) and thus
  `resolveMaker` select only the on-shift bartender. See
  [employment.md](./employment.md).
- **Tools + inputs** — ordinary `Tangible` matter, wherever it
  physically sits; reachability is the only feasibility gate.
- **Offer / `Menu`** — a *curated* list of offered recipes, its own
  `Tangible` object you `read`/`order` from, decoupled from
  craftability, from where crafting happens, and from the maker.

"Dave's Bar" is therefore **emergent**: a room that contains a `Menu`,
a maker, and the matter. Remove any and you can't get a drink there —
with a diegetic reason, not a flag flip.

## Value-objects & vocabulary (`lib/craft/`)

- **`Grade`** (`Grade.ts`) — an ordinal quality band, the first quality
  axis. `GRADE_BANDS = ['poor','fair','fine','exceptional','masterful']`
  (low→high, doubles as the validation array). `Grade.of(band)`,
  `getBand`/`getOrdinal`/`renderBandWord`/`compareTo`/`min`/`max`.
  `deriveAtFixedControl(inputs, _control?)` = **weakest-link** (`min`
  across input grades), `fair` fallback for an ungraded craft; `_control`
  is the deferred skill seam (ignored in v1). A plain value-object, **not**
  a `Quantity` (grade is ordinal-categorical, not a measured scalar).
- **`ToolCapability`** (`ToolCapability.ts`) — the capability vocabulary
  (`shaker`/`strainer`/`muddler`/`mixing-glass`) + `ToolCapabilities.isCapability`.

## Mixins (`lib/craft/`)

All five are registered in `lib/mixin.ts` (`Mixins.Graded`/`Tool`/
`Crafted`/`Maker`/`ManualBuild`) with a `MixinApi.isX` predicate. No
`#`-private instance state (proxy trap); persisted fields are public for
the Hydrator; per-field invariants ride accessor pairs.

- **`GradedMixin`** (`Graded.ts`) — the shared grade carrier (input
  bottles **and** `CraftedMixin`). The persist-string / value-object
  split: the persisted field is the band **word** (`gradeBand: string`),
  and the `Grade` value-object rides separate contract methods
  (`getGrade`/`setGrade` ↔ `getGradeBand`/`setGradeBand`). `setGradeBand`
  validates via `Grade.isBand`.
- **`DurableMixin`** (`lib/material/Durable.ts` — the wear-state axis of a
  physical object, sibling of `Tangible`/`Constructed`; **not** a crafting
  mixin) — the durable-good substrate: a `condition` (0..1, private
  `_condition` accessor pair clamping) that `wear()`s on **use, not the
  clock** (economy Law 2). Repair deferred — the wear field establishes the
  sink shape without pulling in service mechanics. Composed by tools,
  **weapons, and armor alike** (durability is not "tool"); narrow via
  `MixinApi.isDurable`.
- **`ToolMixin`** (`Tooled.ts`) — the crafting **capabilities** layer:
  `capabilities: string[]` a recipe requires by kind. A `ToolItem` composes
  `ToolMixin(DurableMixin(…))` — a tool is a durable good that *also* offers
  capabilities; the durability lives on `DurableMixin`, not here.
- **`CraftedMixin`** (`Crafted.ts`, composes `GradedMixin(Base)`) — the
  per-instance **maker's mark**. Own persistent fields `{maker (templatePath),
  recipe (recipeId), craftedAt (game-seconds)}`, set once via `stamp(spec)`
  at craft-resolve. `renderVerdict()` renders the **DF-style** verdict —
  band-word headline + grade-keyed prose + maker name (resolved via a
  module-private `resolveMakerName` → `getPresentation()`) — **never a
  number**. The crafted instance's `templatePath` still points at the
  shared output template; the mark is the per-instance overlay. The future
  corpos(marks) build extends this.
- **`MakerMixin`** (`Maker.ts`) — a minimal role marker (`isMaker()`),
  used **only** to identify the present `order` fulfiller (the bartender).
  **Not** used to gate `serve`/`mix` (those are general agent verbs;
  maker = the giver).
- **`ManualBuildMixin`** (`ManualBuild.ts`, the `Builds` interface,
  `MixinApi.isBuildVessel`) — the **vessel-as-buffer** for a step-by-step
  build (the shaker / mixing glass). A runtime-only buffer of graded
  `BuildContribution`s (`addContribution`/`getContributions`/`clearBuild`)
  the `pour`/`add` verbs bank into and `strain` mints from, plus the
  recorded **command sources** (`recordCommand`/`getCommandSources`) the
  demonstration capture transcribes (see [scripting.md](./scripting.md)).
  No persistent fields — a build is transient.

## Recipe = a `Document` (the Emote pattern)

A recipe is **data** — no mutable state, no lifecycle, no per-instance
identity. So it is **not** a Stuff/`Idea` (the clone pipeline, proxy
wrap, and singleton registration would buy nothing) and **not** a
`domain` template (a template's one job is to hydrate a Stuff; a
never-cloned template is a wart — the rejected `Topic` shape). The home
is the codebase's pattern for authored reference data that isn't Stuff:
a **`Document`** managed by a catalogue singleton — the
`Emote`↔`SoulCatalogue` relationship.

- **`Recipe`** (`lib/craft/Recipe.ts`, `recipes` collection, unique
  index on `recipeId`) — typed accessors over `name`, `keywords`,
  `inputSlots: RecipeInputSlot[]` (`{slot, category, minGrade, measureL}`),
  `toolCapabilities: string[]`, `outputTemplate` (a **real** cloneable
  glass template), `outputMaterial` (the cocktail `Material` the glass
  holds), `baseGradeBand?`. The boundary stays honest — `outputTemplate`
  is a Stuff cloned by the pipeline; only the recipe-as-knowledge is a
  Document. `Recipe ≠ template` (a form can have several recipes).
- **`RecipeCatalogue`** (`obj/RecipeCatalogue.ts`, singleton
  `PostRegistrationMixin(Idea)` at `/obj/RecipeCatalogue`) — caches the
  collection, resolves by id + keyword (`order martini` → one recipe),
  `warm()` on `postRegister`. The `SoulCatalogue` shape. **Read methods
  are ungated** (the `TopicCatalogue` "public knowledge" precedent — a
  catalogued recipe is openly resolvable; v1 has no minting verb, so no
  `RecipeApi` and no dangling gate string).
- **`RecipeSeeder`** (`backend/RecipeSeeder.ts`) + `mud/config/recipes.yaml`
  — the `EmoteSeeder` precedent. Reads `recipes.yaml` (NOT under `seeds/`
  — recipes are Documents, not templates), idempotent by `recipeId`, runs
  in the seeder block before `BootstrapManager`.

## Craft-resolve: `CraftingApi` / `CraftingLogic`

The gated forwarding pair (the `ProvenanceApi`↔`ProvenanceLogic` shape):
`api/crafting.ts` is the thin gated shell (`SecurityApi.decorateApiClass`),
`obj/api/CraftingLogic.ts` is the `@internal` logic singleton at
`/obj/api/crafting`, methods gated
`@CallSecurity(FromModule('/api/crafting#CraftingApi'))`. Sub-logic is
**module-private** functions (no intra-singleton `this.x()`).

**Call shapes** (their home is `api/crafting.ts`):

- `CraftRequest { recipeRef: string; makerMode: 'self' | 'fulfilling-bartender'; brand?: string }`
  — **no principal**. (`brand` is v1's single-`with` selection; the
  per-slot `inputSelections` map is deferred.)
- `CraftOutcome = { ok: true; output: Stuff; grade: Grade } | { ok: false; reason: CraftDeclineReason; detail: string }`
  — a discriminated union; **declines** (out of gin, no shaker) are
  data, **programmatic/conservation breaches throw**.
- Statics: `craft(req)`, `lookupRecipe(ref)`, `offeredRecipes(menu)`.

**`craftImpl` algorithm:**

1. **Resolve recipe** via `RecipeCatalogue` (id or keyword) → decline
   `no-recipe`.
2. **Resolve maker by `makerMode`** (un-spoofable; wire carries only the
   mode): `'self'` → `ExecutionContextApi.getActingAuthor()` (the giver,
   for `serve`/`mix`); `'fulfilling-bartender'` → the giver is the
   *patron*, so find the present `MixinApi.isMaker(...)` agent in the
   patron's location. Never off the wire.
3. **Gather reachable matter** — room contents (incl. back-bar surface
   contents) + maker inventory; partition into present tools / graded
   bulk bottles.
4. **Match input slots** — per slot: a bottle whose `Material` carries
   the slot's `category` tag, `grade ≥ minGrade`, with available litres
   ≥ `measureL`; honor `brand`, else auto-pick highest grade. **Per-bottle
   claimed litres are tracked** so two slots don't double-claim →
   decline `insufficient-input`.
5. **Match tools** — per required capability, a present tool with
   `hasCapability` → decline `missing-tool`.
6. **Derive grade** — `Grade.deriveAtFixedControl(matched)`, floored at
   `baseGrade`.
7. **Clone output** — `StuffApi.clone(outputTemplate)` → decline
   `no-output`.
8. **Apply output properties** — `applyBulkOutput` (**domain seam #1**):
   fill the output's bulk slot with the recipe's `outputMaterial` at
   `Σ measureL`.
9. **Stamp** — assert `isCrafted(output)` (else throw — output template
   misauthored), `output.stamp({maker, grade, recipe, craftedAt})`.
10. **Consume inputs** — `consumeBulkInputs` (**domain seam #2**): per
    matched slot `BulkableApi.transfer(...)` in strict mode; **assert
    `applied === measureL`** else throw (conservation breach).
11. **Wear tools** — each matched tool `.wear()`.

Placement is the verb's job, not craft's (`craft` returns the output).

### The two domain seams

Steps 8 and 10 are the **only** bulk/cocktail-specific steps, isolated
behind named module-private fns so other domains arrive as **new
branches, not a rewrite**: smithing adds `applyTangibleOutput` (flow the
input material onto a Tangible) + `consumeItemInputs`; cooking adds glob
variants. The recipe *skeleton* (slots-by-constraint,
tools-by-capability, weakest-link grade, provenance, the fixed-control
seam) is domain-neutral. v1 ships **transform** recipes only; **assembly**
(output properties emerge from components) is a genuinely different model,
deferred — not faked.

## The offer: `Menu` (`domain/lounge/Menu.ts`)

A standalone `DetailedMixin(Thing)` object (a `Tangible` you `read`/
`order` from), **not** a place capability and **not** a mixin. Holds
`offeredRecipes: string[]` (recipeIds); `resolveOrder(keyword)` maps an
order to an offered recipe (gates on the **offer**, not craftability).
Its `getLong()` appends the offered list. Its presence is what **lights
up the crafting verb surface** — `static commandContributions`
contributes `menu`/`order`/`serve`/`mix` to the `environment` (and
`inventory`) bucket, so the verbs appear because the menu is there, not
because the room is flagged. (It lives in `domain/lounge/` because v1's
only Menu is the bar's; it's content, not substrate.)

## Verbs (the `crafting` command category)

`mud/cmd/crafting/*.yaml` views + `mud/obj/command/crafting/*Controller.ts`.
A `CraftController` base centralizes decline rendering; all controllers
return `void`, emitting via `ctx.note` + `MessageApi.scene`.

- **`menu`** — render the present Menu's offered cocktails.
- **`order <item> [with <brand>]`** — maker = **fulfilling bartender**;
  resolve the Menu, `resolveOrder`, `craft(...,'fulfilling-bartender')`,
  hand the drink to the patron (the giver).
- **`serve <patron> a <item> [with <brand>]`** — maker = **giver**
  (`'self'`); craft and move to the patron.
- **`mix <item> [with <brand>]`** — maker = **giver**; craft and hold.

`serve`/`mix` are general agent verbs (any agent at a bar can use them);
`order` routes to the bartender. This is the slate's "vending-machine
floor" — the bartender NPC is a **static authored Character with no
`Behaved` mixin**; the serve-on-order reflex is a verb, not behavior, so
there is zero file collision with the npc-behavior lane.

## The manual build (the by-hand path)

Alongside the one-shot served path, a drink can be **built by hand**, one
command at a time — the path the scripting build added (its manual-build
verbs are also the substrate the demonstration-capture records). Each step
is an **engaged activity** (`ManualBuildStep`, the `'hands'` slot, the
activity substrate's first durative-verb consumer — see
[activity.md](./activity.md)): the effect lands **at completion**, so a
barge-in `cancel` mid-step leaves partial matter standing.

- **`pour <spirit> into <vessel>`** / **`add <spirit>`** — debit a standard
  measure off the chosen reachable graded bottle (to the discard sink —
  conservation) and bank a graded `BuildContribution` into the vessel's
  buffer. `add` (no vessel) finds the build vessel you're working in.
- **`stir`** / **`shake <vessel>`** — record the mix method on the build.
- **`strain [<vessel>] into <glass>`** — the **terminal mint**.
- **`garnish <glass> with <garnish>`** — the finishing flourish.

The vessel is a `ManualBuildMixin` build vessel (`CocktailShaker` backs
both the shaker and the mixing glass — `capabilities` decide which recipe
tool it satisfies). At `strain`, **`CraftingApi.mintFromBuild`**
reverse-matches the accumulated contributions to a recipe (`matchBuild`:
exact slot set, category + measure-at-or-above + min-grade, **no
leftovers** — a faithful build is exactly the recipe) and mints the
graded, maker's-marked drink into the glass, **reusing the one quality
model** (weakest-link `Grade`, the `applyBulkOutput` fill). An off-spec
build still yields *a* drink — the generic mint — but matches no recipe
(`recipeId === ''`), the discriminator the knowledge ladder rides. The
maker is derived from `getActingAuthor`, never a parameter.

## Drink → metabolism (honest alcohol)

The output glass is `Bulkable`, holding the recipe's authored cocktail
`Material` (`edibility: true` + `toxicity: [{type:'alcohol', amount}]`).
The existing `drink`/`sip` → `BulkableApi` → `MetabolicMixin.ingest` →
`getBAC` path is unchanged, so the drinker's BAC rises by how much they
drink. Per-instance ABV-from-spirit-choice is **deferred** — v1's
cocktail Material is fixed per recipe; the instance variable is the
*volume*. Quality stays a `Grade` verdict, never a number.

## Surface presentation: resting items aren't loose

The back-bar's bottles + tools sit **on** a `Surfaced` fixture (placed
via the bar's `populates: { onto }` — see [spatial.md](./spatial.md)),
so they read "on the back-bar," reachable but **not loose room
clutter**. The shared rule is `ContainmentApi.looseContents(items)`: it
filters out any item whose `getRestingOn()` is itself in the set, and is
applied by `look`/`sense` (room branch) **and** the inspection pane
(`Container.contents`). Examining the surface (`look back-bar` /
`sense back-bar`) reveals what rests on it via an "── On it:" drill-in
(`Surfaced.getResting()`). This is the discovery path that keeps the
stock out of the room view.

## Dave's Bar content (where it lives)

No bar-specific classes — content composes general mixins. Classes are
homed by what they *are*:

- **Building blocks** → `lib/`: `Surface` (`lib/spatial/`, a
  `SurfacedMixin` fixture), `ToolItem` (`lib/craft/`), `Crafter`
  (`lib/character/`, `MakerMixin(NPC)`), `NPC` (`lib/character/`, the
  minimal concrete `Character` — shares its path with the npc-behavior
  lane's richer `NPC`, which the add/add merge resolves to).
- **Bar content** → `domain/lounge/`: `CraftedDrink`
  (`CraftedMixin(BulkableMixin(DetailedMixin(Thing)))`, `getLong()`
  appends the verdict), `Menu`, `GradedReceptacle`
  (`GradedMixin(BulkableMixin(Thing))`, the stock bottle).
- **Singleton** → `obj/`: `RecipeCatalogue`.

**Seeds:** instance seeds in `seeds/domain/lounge/` (back-bar, the four
bottles, shaker + mixing-glass, cocktail-glass, bar-menu, dave); the
`Bar` self-stocks via `populates:` (bottles/tools `onto` the back-bar,
then dave + menu). Cocktail/spirit `Material`s in `seeds/lib/material/`;
recipe knowledge in `config/recipes.yaml`. Crafted drinks are transient
runtime matter (persisted nowhere; reset on restart).

## Persistence story

| Kind | Form | Lifetime |
|---|---|---|
| Room / NPC / bottles / tools / Materials | **templates** (cloned) | re-seeded; cloned fresh |
| Recipe knowledge | **`Document`** (`recipes` collection) | persisted reference data |
| Crafted drinks | transient runtime matter | reset on restart |

## Deferred (non-goals)

Skill/advancement control (v1 resolves at **fixed** control — no
scatter/mastery/defects); recipe knowledge as a learnable/gated thing
(the make-once-to-bank-it loop; v1's verbs are built **script-shaped** so
it rebuilds nothing); corpos/brands/maker's-marks at corporate scale
(drinks are unbranded; `with <brand>` only selects among present
spirits); the DIY / rent-the-means path + payments/tabs/wages;
deconstruction; the glassware cycling pool + shift choreography;
viewer-relative appraisal + congener→hangover; **assembly** recipes.

## Cross-references

- **Substrate consumed:** [templates](./templates.md),
  [persistence](./persistence.md), [race](./race.md) (Material),
  [bulk](./bulk.md), [metabolism](./metabolism.md),
  [spatial](./spatial.md) (Surfaced + `looseContents`),
  [provenance](./provenance.md) (the authorship ledger this instance-mark
  sits beside), [command-routing](./command-routing.md) /
  [command-spec](./command-spec.md), [mixins](./mixins.md),
  [call-security](./call-security.md).
- **Seeding slates:** `docs/slates/builds/crafting-slate.md`,
  `docs/slates/builds/daves-bar-slate.md`; parent
  `docs/slates/builds/economy-slate.md`.
- **Future builds grafting on:** corpos(marks) extends `CraftedMixin`;
  deconstruction reverses craft-resolve; the recipe-learning loop builds
  on the script-shaped verbs; npc-behavior wraps the serve-on-order
  reflex.
