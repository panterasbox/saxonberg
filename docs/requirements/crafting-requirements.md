# Crafting v1 (served path) — requirements

Crafting is the **transformation** stage of the economy — where raw inputs
become valued goods, the point at which value is actually minted. This build
ships the first concrete slice: the **served path** at **Dave's Bar** — a
bartender (NPC or player) turns the bar's spirits + tools + a known recipe
into a real, stamped cocktail, hands it to a patron, who drinks it and feels
it (metabolism is already shipped). It is the first end-to-end economic loop
(matter in → transformed → consumed) that runs with **zero RPG**.

The build delivers the **general, reusable crafting substrate** (the force
that mints particles) and authors **Dave's Bar content** over it — never a
bar-specific class. It is **Lane 2** of the parallel Dave's Bar wave;
independent of Lane 1 (npc-behavior) and Lane 3 (advancement), it shares no
files with them.

Seeded by [crafting-slate](../slates/builds/crafting-slate.md) (§ *Buildable
now — the Dave's Bar slice (v1)*, § *The venue model*, § *Recipes*, §
*Tools*, § *Quality — the verdict, rendered*) with the integrating exemplar
[daves-bar-slate](../slates/builds/daves-bar-slate.md) (§ *Near-term scope*,
§ *Ingredients & the back-bar*, § *Verbs & the recipe-learning loop*, § *How
it's modeled*).

## Goals

- **Craft-resolve is a general force.** A gated `CraftingApi` transforms
  input `Tangible` matter (consumed) + venue tools into a new `Tangible`
  output `Thing`, cloned from an output template via the existing
  template/clone pipeline, stamped with material grade + maker provenance.
  Conservation holds: inputs are debited; the output is a new stamped thing;
  nothing is minted from nothing.
- **Recipes are authored knowledge.** A recipe is authored reference data —
  a `Document` (the `Emote` precedent), **not** a Stuff and **not** a
  template — naming input slots **by constraint** (category + min grade),
  required tools **by capability**, an output `Template` (the form to
  clone), and property-derivation rules (output material/grade from the
  chosen inputs). A `RecipeCatalogue` singleton manages the `recipes`
  collection (the `SoulCatalogue`↔`Emote` relationship). Recipes are
  **venue-known** in v1 (the venue carries its recipe book).
- **A crafting venue aggregates the four-tuple.** A `CraftingVenueMixin` on a
  `Location` carries the **known-recipe book**; the venue's **tools** and
  **input stock** are the `Tangible` matter physically present in the room
  (working bottles on the back-bar, the shaker, glassware). Crafting is
  feasible *there* and infeasible at home because the venue aggregates what
  you can't replicate.
- **Provenance is stamped per instance.** A new reusable instance-level
  `CraftedMixin` carries `{maker, grade, recipe, craftedAt}`, stamped at
  craft-resolve, un-spoofable (maker derived from world state / execution
  context, never user-supplied). This is the maker's-mark layer the future
  corpos(marks) build will extend.
- **Quality is a verdict, rendered.** A crafted thing carries an ordinal
  material **grade** (the first quality band); the output description renders
  **DF-style** — an ordinal band-word headline (*poor / fair / fine /
  exceptional / masterful*) over descriptive prose derived from the property
  bundle (grade, ABV, freshness) — **never a number**. v1 renders uniform
  prose at a fixed control level.
- **Tools are the durable-good substrate.** Recipes require tools **by
  capability** (a "shaker" capability, satisfied by any present tool that
  offers it); tools carry a `condition` that **wears on use, not the clock**.
  Establishes the first durable-good sink shape (repair deferred).
- **The served path works end to end.** A patron `order`s a cocktail from
  the `menu`; the on-duty bartender NPC crafts and hands it over (the
  vending-machine floor, no behavior brain); a player-bartender can `serve`
  a patron or `mix` one solo. The drink carries honest ABV, so `drink`/`sip`
  feed metabolism → `getBAC`.
- **Dave's Bar is stocked and staffed at genesis.** The existing bare `Bar`
  room is filled with authored content: a bartender NPC, working spirit
  bottles, the shaker + glassware, a small cocktail recipe book, and a menu —
  all authored templates over general substrate.

## Non-goals

- **The skill / advancement system.** Crafting consumes a control level
  through one seam; v1 resolves at a **fixed** control level (no
  scatter/mastery/defects/extremes). The skill system is
  [advancement](../slates/builds/advancement-slate.md) / the gamification
  layer (Lane 3 and beyond) and must not leak in.
- **Recipe knowledge, spread & the make-to-know learning loop.** v1 is
  venue-known only. Crafter-known recipes, recipe-items, the
  taught/earned/discovered spread vectors, and the make-it-once-to-bank-it
  loop are deferred (advancement-adjacent;
  [daves-bar-slate](../slates/builds/daves-bar-slate.md) § *recipe-learning
  loop*). v1's served verbs are nonetheless built **script-shaped** (a linear
  recipe + one input-selection parameter) so the later loop rebuilds nothing.
- **Corpos / brands / maker's marks at corporate scale.** Drinks are authored
  with **unbranded** provenance (maker = the crafting character only).
  `with <brand>` selects among the bar's present spirits by category; the
  corpo-mark layer grafts onto `CraftedMixin` later
  ([corpos-slate](../slates/builds/corpos-slate.md), marks deferred). **Do
  not pull marks in early.**
- **The DIY / rent-the-means path.** v1 ships the **maker verbs**
  (`serve`/`mix`, used by staff or a player-bartender) and the customer
  `order`. The customer-DIY economic gating (access control to venue stock,
  paying for access) is deferred to the economy lane.
- **Deconstruction / melt-down.** The reverse operation (and its entropy
  sink) is not part of the served path; deferred.
- **Payments, tabs, wages, the P&L ledger.** The demo drink is "on the
  house." All money/employment flows are the economy lane.
- **The glassware cycling pool, NPC task repertoire & shift-change ritual.**
  Glasses are authored as ordinary durables (claimed from the bar's present
  stock); the bounded cycling pool, bussing, and the shift choreography ride
  npc-behavior + scripting, deferred.
- **Viewer-relative appraisal & congener→hangover tuning.** v1 renders
  uniform quality prose and carries only alcohol (for BAC). The connoisseur's
  richer read and congener-by-grade hangover are deferred with appraisal-as-
  skill.
- **Assembly recipes.** v1 ships **transform** recipes only (inputs → one
  fixed output template, material/ABV flows through). Component-assembly
  (output properties emerge from parts) is deferred.

## Surface decisions

### Maker's mark = a new reusable `CraftedMixin`

The question: how to stamp per-instance provenance (maker + grade + recipe),
given the existing provenance ledger is **template-authorship only** (keyed
on template path) and all martinis share one output template.

**Decision:** a new instance-level `CraftedMixin` (in `lib/craft/`) carrying
persistent `{maker: string (templatePath), grade: Grade, recipe: string,
craftedAt: number}`, stamped once at craft-resolve. The quality-verdict
renderer reads it; the future corpos(marks) layer extends it. Chosen over a
`PropertiedMixin` bag (unstructured, hard to build on) and a single bare
field (no general substrate). The crafted instance's `templatePath` continues
to point at the shared **output template**; the maker's mark is the
per-instance overlay.

### Maker attribution is un-spoofable

Per the gated-API rule (actor from context, never a passed argument), the
maker is **never user-supplied**. For `serve`/`mix` the maker is the command
giver (the bartender, resolved from the execution context). For `order` the
maker is the **on-duty bartender NPC** the controller resolves from world
state (the patron is the giver, not the maker). The planner picks the
mechanism — running the craft frame in the bartender's execution context
(`ExecutionContextApi.runRoot`-style, mirroring `CmsSession.runAsSessionPlayer`)
is preferred over a trusted-controller parameter — but the **constraint is
fixed**: the maker is either the frame giver or a world-resolved staff member,
never a value off the wire.

### The served path needs no behavior brain (Lane 1 decoupling)

`order <cocktail>` resolves the present on-duty bartender NPC and the **order
controller** runs craft-resolve, attributing the maker to that NPC and handing
the drink to the patron. This is the "vending-machine floor" the slate
explicitly accepts for v1 — the bartender NPC is a **static authored
Character** with no `Behaved` mixin, no scheduled repertoire. Lane 1's full
NPC behavior wraps this later; the single serve-on-order reflex is a **verb**,
not NPC behavior, so there is zero file collision with Lane 1.

### Recipe = a `Document`, managed by `RecipeCatalogue` (the `Emote` pattern)

A recipe is **data** — no mutable state, no lifecycle, no per-instance
identity, no behavior beyond answering questions about its own fields (the
derivation math lives on `Grade`). So it is **not** a Stuff/`Idea`: that
machinery (the clone pipeline, the call-security proxy wrap, singleton
registration) would buy nothing.

It is also **not** a `domain` template. A template's one job is to hydrate a
real Stuff class; a template that is never cloned (the way `Topic` reads its
template docs as data) makes templates serve double duty and is a wart not to
copy.

The right home is the codebase's existing pattern for **authored reference
data that isn't Stuff**: a **`Document`** in its own collection, managed by a
catalogue singleton — exactly the `Emote`↔`SoulCatalogue` relationship.

- `Recipe extends Document` in a `recipes` collection, with typed accessors
  over: `name`, `keywords`, input slots `{category, minGrade, measureL}`,
  required tool capabilities `string[]`, `outputTemplate` (the form to
  clone), `outputMaterial` (the cocktail Material the glass holds), and an
  optional `baseGrade` floor.
- `RecipeCatalogue` (a singleton `Idea` in `obj/`) reads/caches the
  collection and resolves recipes by path + keyword (so `order martini`
  resolves one) — the `SoulCatalogue` shape. A `RecipeSeeder` (backend)
  seeds the genesis recipes at boot, mirroring `EmoteSeeder`.
- **The boundary stays honest:** `outputTemplate` points at a *real*
  Template (the drink glass), which **is** a Stuff cloned by the pipeline;
  only the recipe-as-knowledge is a Document. **Recipe ≠ template** is
  preserved (a form can have several recipes); v1 authors one recipe per
  drink.

Derivation (v1, fixed control): output material = the recipe's authored
cocktail Material; output grade = weakest-link across the chosen inputs'
grades. (Per-instance ABV-from-spirit-choice is deferred — the cocktail
Material carries authored alcohol so `drink`→metabolism is honest.)

### Grade = an ordinal value-object

Material grade does not exist today. A small ordinal `Grade` value-object
(`lib/craft/Grade.ts`) with bands *poor / fair / fine / exceptional /
masterful* is the first quality band. Input spirit bottles carry a grade;
the output grade derives from input grade at fixed control. The quality
verdict's band-word headline is the grade rendered; the prose is the bundle
(grade + ABV + freshness). Chosen as a plain value-object over reusing the
`Quantity` tag-table machinery (grade is ordinal-categorical, not a measured
scalar).

### Tools = capability requirement + wear-on-use

A `ToolCapability` vocabulary (`lib/craft/`) lets recipes require a tool **by
kind** ("shaker", "strainer") satisfied by any present `Tangible` offering
that capability (a thin tool mixin/marker carrying `capabilities: string[]` +
a `condition: number`). Using a tool decrements its `condition` (wear on use,
not the clock). The **repair** verb/service is deferred — the wear field
establishes the durable-good substrate without pulling in economy/service
mechanics.

### New `crafting` command category

The verbs (`menu`, `order`, `serve`, `mix`) form a new command domain:
`mud/cmd/crafting/*.yaml` views + `mud/obj/command/crafting/*Controller.ts`.
(Command categories are verb-domain folders, distinct from the guarded TS
module taxonomy; a new one for a new subsystem is expected.)

### Drink → metabolism via honest alcohol

The output drink is a glass (`Bulkable`) holding the mixed liquid; the
liquid's `Material` is the recipe's authored **cocktail Material**, carrying
`edibility: true` + `toxicity: [{type: 'alcohol', amount}]`. The existing
`drink`/`sip` verbs route through `BulkableApi.ingest` →
`MetabolicMixin.ingest` → `getBAC` unchanged, so the drinker's BAC rises by
how much they drink. Per-instance ABV-from-spirit-choice (a vodka vs gin
martini differing in strength) is **deferred** — v1's cocktail Material is
fixed per recipe; the instance variable is the *volume*. Quality stays a
verdict (a `Grade`), never a number.

## Constraints

- **No bar-specific classes.** Dave's Bar is authored *content* (templates
  composing general mixins). Genuinely-new substrate (`CraftingApi`,
  `Recipe`, `CraftedMixin`, `Grade`, tool capabilities, the venue mixin) is
  built general and reusable; the bar is the first consumer. (CLAUDE.md
  "fold into substrate, don't invent special cases.")
- **Module taxonomy.** New substrate lives in a new `lib/craft/` subsystem
  folder (the mixins, value-objects, vocabularies, and the `Recipe`
  `Document`) + `api/crafting.ts` (the thin gated forwarding shell, ending in
  `SecurityApi.decorateApiClass`) + `obj/api/CraftingLogic.ts` (the
  `@internal` logic singleton holding the protected logic, gated
  `FromModule('mud/api/crafting#CraftingApi')`). `RecipeCatalogue` is an
  `obj/` singleton `Idea`; a backend `RecipeSeeder` seeds the `recipes`
  collection at boot (the `EmoteSeeder` precedent). **No free-floating helper
  modules**; no new `eslint-disable no-restricted-syntax` without sign-off.
- **Go through the Api layer.** Cloning via `StuffApi.clone`; matter consumed
  via `BulkableApi.transfer` / `GlobbableApi`; placement via
  `ContainmentApi.placeOn`; destruction via `StuffApi.destruct`. No raw
  mechanism calls.
- **Inter-Stuff contract: methods only.** New mixins expose method surfaces
  (`getGrade()`/`getMaker()`/`getCondition()`…), never field reads from other
  Stuff. Boolean fields use noun-setter/predicate-getter.
- **Maker derived, never passed.** See the surface decision; mirrors the
  provenance substrate's `getActingAuthor` discipline.
- **Conservation is exact.** Every craft debits its inputs by the consumed
  measure; programmatic violations throw (typed params, void returns).
  User-input failures (out of gin, no shaker) are YAML validator / controller
  rejections via `ctx.note` + a `MessageApi.scene`, never thrown.
- **Output controllers return `void`.** Outcome rides the dispatch-response
  envelope (`ctx.note` + scene), not a `{success}` shape.
- **Schedule through `ScheduleApi`** if any timed step is needed (none
  expected in v1 — craft-resolve is synchronous).
- **Persistence tracks honored.** Authored *things* (room, NPC, bottles,
  tools, the cocktail/spirit Materials) are **templates** (cloned, not saved
  back). Authored *recipe knowledge* is `Document` data in a new `recipes`
  collection (the `emotes` precedent — not a template, never cloned). Crafted
  drinks are transient runtime matter (persisted nowhere; reset on restart).

## Acceptance criteria

- A `CraftingApi.craft(...)` (gated, forwarding to `CraftingLogic`) resolves
  recipe + venue inputs + tool capabilities + fixed control into a cloned,
  stamped output `Thing`, consuming the inputs. Unit tests cover: happy
  path, missing-tool rejection, insufficient-input rejection, grade
  derivation, ABV derivation, conservation (inputs debited exactly).
- `CraftedMixin` stamps `{maker, grade, recipe, craftedAt}` at resolve; tests
  confirm the maker matches the resolving character (giver for `serve`/`mix`;
  the bartender NPC for `order`) and is not settable off the wire.
- `Recipe` Documents load from the `recipes` collection via
  `RecipeCatalogue`; `CraftingVenueMixin.getKnownRecipes()` returns the
  venue's book; tests cover catalogue load + venue lookup.
- The `Grade` value-object orders the five bands and renders a band-word;
  tests cover ordering and band-word output.
- Tool capability matching + wear-on-use: a recipe requiring "shaker" rejects
  when none is present, succeeds when one is, and decrements that tool's
  `condition`. Tests cover all three.
- Verbs work in an integration test against authored Dave's Bar content:
  `menu` lists the bar's cocktails; `order <cocktail>` yields a held drink
  attributed to the bartender; `serve <patron> a <cocktail>` and
  `mix <cocktail>` work for a player-bartender; the resulting drink, when
  `drink`-en, raises the drinker's BAC (metabolism integration).
- The drink's `look`/description renders a DF-style band-word + prose verdict,
  never a numeric quality.
- Dave's Bar is stocked and staffed from seeds at genesis: the `Bar` room
  contains a bartender NPC, working spirit bottles (bulk), a shaker +
  glassware (tools), and exposes a menu; an avatar can walk in and complete
  the order→drink→feel loop.
- `pnpm build`, `pnpm lint` (incl. `lint:gates`), and `pnpm test` pass. No new
  lint exceptions added without sign-off.
- A subsystem doc `docs/subsystems/crafting.md` exists (written at finalize)
  capturing the shipped substrate; the CLAUDE.md documentation map gains its
  entry; the crafting slate is updated/retained per the sweep rules.

## Cross-references

- **Seeding slates:** [crafting-slate](../slates/builds/crafting-slate.md),
  [daves-bar-slate](../slates/builds/daves-bar-slate.md);
  parent [economy-slate](../slates/builds/economy-slate.md).
- **Substrate consumed:** [templates](../subsystems/templates.md),
  [persistence](../subsystems/persistence.md), [race](../subsystems/race.md)
  (Material), [bulk](../subsystems/bulk.md), [glob](../subsystems/glob.md),
  [quantities](../subsystems/quantities.md),
  [metabolism](../subsystems/metabolism.md),
  [provenance](../subsystems/provenance.md) (the authorship ledger this
  build's instance-mark sits beside), [location](../subsystems/location.md),
  [spatial](../subsystems/spatial.md) / [slot](../subsystems/slot.md) /
  [posture](../subsystems/posture.md) (the room fixtures),
  [command-routing](../subsystems/command-routing.md) /
  [command-spec](../subsystems/command-spec.md) (the verbs),
  [mixins](../subsystems/mixins.md), [call-security](../subsystems/call-security.md).
- **Related in-flight (parallel lanes):** npc-behavior (Lane 1) — the
  bartender's brain wraps this build's serve-on-order reflex later;
  advancement (Lane 3) — supplies the deferred skill-control seam.
- **Future builds grafting onto this:** corpos(marks) extends `CraftedMixin`;
  deconstruction reverses craft-resolve; the recipe-learning loop builds on
  the script-shaped verbs.
