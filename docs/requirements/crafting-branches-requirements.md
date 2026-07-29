# Crafting branches & the repair economy — requirements

The transform stage of the goods economy, grown from one branch (the
bar's bulk cocktails) to three: **smithing**, **cooking**, and the
**repair / salvage lifecycle** — the launch-worklist's #1-leverage item.
The shipped crafting substrate ([crafting.md](../subsystems/crafting.md))
deliberately isolated its two domain-specific steps behind named seams
(`applyBulkOutput` / `consumeBulkInputs`) so "other domains arrive as
new branches, not a rewrite"; the fire build shipped the furnace family
+ phase change and left **`ThermalApi.reachableHeatFor` as a built,
tested, consumed-by-no-recipe seam** (D9) for exactly this build; the
materials-response slate carries the lifecycle arc (*crafted → used →
maintained → broken → scrap → reforged*). This build lights all three.

**The framing update that changes scope:** the crafting slate deferred
"gear" as *gated on Part II* (what a weapon means). Part II has since
shipped — the response function, `WeaponProfile`, combat, and
condition-scaling-mitigation are live. A crafted blade's **material,
grade, and condition are all read by shipped systems today**, so gear
crafting is no longer speculative object-minting: it closes a loop
(craft → wield → fight → wear → repair → smith-as-career) end to end.

Seeded by [crafting-slate](../slates/builds/crafting-slate.md) (+ the
fire deferral in [fire.md](../subsystems/fire.md) § Deferred and
[materials-response-slate § Lifecycle](../slates/deferred-rpg/materials-response-slate.md)).

## Goals

- **The smithing branch.** Transform recipes over discrete inputs +
  heat: ingot → formed metal good at a forge, with the input metal's
  `Material` flowing through to the output (an iron ingot makes an iron
  knife), grade weakest-link as today, provenance stamped. The **heat
  gate** is `ThermalApi.reachableHeatFor(maker) ≥ recipe.requiresHeatK`
  — the D9 seam consumed at last, so a cold forge or no forge is a
  diegetic decline, not a flag.
- **The physics/recipe split honored.** State changes stay physics:
  smelting is the shipped melt→pool→cast path (Forge + `MeltableMixin` +
  `Casting`), not a recipe. Recipes own **forming** — the
  ingot-to-blade step physics cannot express. No recipe duplicates what
  the phase engine already does.
- **Crafted gear is real gear.** At least one bladed weapon
  (`Weapon` + delivery form), one tool (a `ToolItem` — closing the
  tools-are-craftables loop: smithing makes the hammer smithing needs),
  and one worn armor piece (a `Constructed` hide/padded form) are
  craftable, and their crafted material/grade/condition are visibly
  consumed by the shipped readers (`analyze weapon`, `analyze
  response`, combat mitigation, `renderVerdict`).
- **The cooking branch.** Recipes over discrete/glob food inputs +
  low heat (oven / hearth / campfire via the same `requiresHeatK`
  gate) + tools → a stamped, graded, **edible** output whose authored
  food `Material` routes macros through the shipped metabolism Wave-2
  chemistry (`NutritionLabelMixin` renders it). Eating a fine meal vs
  a poor one is a felt, diegetic difference (prose verdict + honest
  macros), never a stat buff.
- **The repair loop.** `DurableMixin` grows its deferred service side:
  a `repair` act (reverse-craft — maker + tool capability + a material
  cost proportional to the condition deficit) restores `condition`;
  the restored condition is immediately reflected by the shipped
  readers (response height, tool function). Wear stays use-driven
  (Law 2); repair is opt-in, never scheduled upkeep.
- **Sharpening — the working-surface tier of maintenance.** Edged and
  pointed goods carry a second, fast-cycling **`keenness`** axis
  (banded `keen / serviceable / dulled / blunted`), distinct from
  structural `condition`: keenness degrades quickly with use and
  modestly scales edge/point *delivery*; it is fully restorable by the
  owner, anywhere, via `sharpen` — a durative engaged activity on the
  hands slot (interruptible, campfire-compatible, its rasp emitted as
  an `Audible` so the room hears the ritual) using a carried whetstone
  that itself wears. Cheap, frequent, personal — deliberately unable
  to touch structure, so the ritual and the smith's trade coexist
  instead of cannibalizing.
- **Broken is a real state.** At a floor condition a durable good is
  **broken**: a broken tool no longer offers its capabilities, a
  broken weapon/armor piece reads (and performs) as ruined. Broken
  gear is repairable at a steeper cost or salvaged.
- **Salvage — the generic lossy melt-down.** `salvage <item>` breaks
  any `Tangible` into a **lossy fraction** of its constituent
  materials (raw stacks / ingots), destroying provenance, grade, and
  form — the slate's entropy-sink rule verbatim (lossless would break
  conservation; losing the value-add makes it self-limiting). One
  generic operation over composition; no reverse-recipes.
- **The by-hand path in every branch — the learning route.** Each new
  branch gets a minimal manual path on the shipped
  `ManualBuildMixin`/reverse-match substrate: cooking banks
  contributions into the cook-pot (reusing `add`/`stir`, plus a heat
  step gated on reachable heat, minting at plating); smithing banks
  onto the workpiece (`heat` in the forge / `hammer` at the anvil /
  `quench` to mint — each a durative engaged step). An off-spec build
  still yields *a* thing (the generic mint, `recipeId: ''`), exactly
  the bar's discriminator.
- **The knowledge ladder, generalized (open canon, earned
  shorthand).** Recipes are open information — readable in-world,
  wiki-equivalent by design. What is *earned* is the shorthand: the
  one-shot verbs (`forge`/`cook`/`make`) are gated on the
  `RecipeKnowledge` **deed** (you have performed the by-hand path once
  and the reverse-match verified it — show-your-work *is* the learning
  mechanism, the trusted-recording shape). Reading a recipe or
  watching a maker demonstrate grants the **claim**; your own first
  execution is always the deed. `order` (buying it made) is never
  gated. A spoiler wiki therefore yields exactly what an in-world
  recipe card yields: the steps — information buys optimization,
  never competence.
- **Advancement evidence at resolve.** Every craft-resolve (one-shot
  and by-hand mint alike) records an `ActSignature` deed against
  seeded `smithing` / `cooking` Discipline leaves (the every-build-
  seeds-its-leaves pattern; `mixology` already exists). Control stays
  fixed this build — the evidence simply accrues honestly, and the
  BKT difficulty coupling already makes trivial-recipe grinding
  worthless.
- **Gathering reaches open containers.** The craft gather walk
  (room + surfaces + maker inventory) extends to the contents of
  **open** containers in the room — the honest form of the
  survival-game chest-pull: stock the smithy chest, flip the lid,
  forge. A closed or locked container never feeds a craft; open-ness
  is the switch, composing with honest-fog and container security
  unchanged.
- **The venues, as content.** The Hearthworks smithy grows into a
  working venue (its forge finally forms things, a small offered
  roster via the shipped `Menu`/`PricedOfferMixin` + a maker NPC — the
  Dave's-Bar served-path pattern verbatim), and one cooking hearth
  venue ships likewise. Both paths at each: order it (served) or make
  it yourself with their tools (the DIY floor).
- **The recipe schema grows without forking.** `Recipe` stays one
  Document shape: discrete-item input slots alongside bulk slots, the
  optional heat requirement, and an output-application kind — with the
  bar's existing recipes untouched and byte-identically resolved.

## Non-goals

- **Skill scatter / defects / mastery.** Resolution stays at fixed
  control (`Grade.deriveAtFixedControl`'s `_control` stays ignored).
  The advancement wiring of crafting is its own later build; this one
  must not leak into the seam beyond passing through what exists.
- **Assembly recipes** (blade + hilt + guard → sword; properties
  emerging from components). Still a genuinely different model —
  still deferred, not faked with a transform recipe.
- **The tailoring/textiles branch** (loom, cloth chain, clothing
  line). The one armor recipe proves `Constructed` outputs flow; the
  full branch waits for a fiber source (farming/ranching).
- **Recipe-spread vectors beyond watching.** Taught-by-instruction
  curricula, experimentation-discovery of *unknown* recipes, and
  tradeable recipe-items stay deferred (advancement/inquiry-adjacent).
  This build ships the ladder's rungs that exist today — read/watch =
  claim, perform = deed — across all branches, nothing further.
- **Workshop lockers.** Personal stowage at venues (the
  `UseGrant`-lease + persistable-container pattern the consignment
  shelf proved) is the named next rung of carry-vs-stow; v1 storage is
  the dorm + carried kit + venue stock.
- **Batching** (`forge nails --count 5`) — the classic staple QoL;
  fast-follow when staple demand is real, not v1.
- **DIY stock-pricing.** Using venue stock in your own by-hand craft
  stays unpriced (already the shipped deferral); the Hearthworks is a
  teaching venue and the general store sells ingots for own-stock
  work.
- **Extraction inputs.** Ore, produce, and fiber faucets are the
  mining/farming/fishing builds. Inputs here are authored stock
  ("imported" — the roster's lore) seeded at the venues and sold at
  the general store.
- **Environmental decay** (rust/rot at rest). Solid-state at rest is
  a shipped discipline; the opt-in `material × medium` decay channel
  stays deferred (metabolism's spoilage tail / fishing's driver).
- **Glassmaking, brewing, alchemy** — later branch consumers of the
  same seams.
- **Economy macro-tuning** (price levels, sink/faucet balance) —
  observed, not tuned, this build.

## Surface decisions

### Physics forms state, recipes form shape

Smelting/casting stays the shipped phase engine; recipes never restate
physics. A smithing recipe's inputs are formed matter (ingots,
castings), its gate is reachable heat + tools, its output is a formed
good. This keeps the substrate honest (the north star: recipes are
substrate-constrained, not author-fiat) and means the Forge already
shipped half the branch.

### Three new domain seams, same skeleton

`applyTangibleOutput` (flow the chosen input's `Material` + mass onto
the cloned output), `consumeItemInputs` (discrete/glob consumption with
conservation asserts, sibling of `consumeBulkInputs`), and
`applyEdibleOutput` (stamp the authored food `Material` + portion onto
the output's bulk/edible surface). The `craftImpl` skeleton
(slot-matching, tool-matching, weakest-link grade, stamp, wear) is
untouched; branches dispatch on the recipe's output-application kind.

### Recipe schema: one Document, three growths

`inputSlots` entries gain a discrete form (`{slot, category, count,
minGrade}` — category matched against `Material` tags exactly as bulk
slots do today); a recipe may carry `requiresHeatK?`; a recipe carries
an output-application kind (`bulk` — the bar's, default — | `tangible`
| `edible`). Existing YAML rows parse unchanged.

### There is no workbench concept — capabilities are the model

"Do you need a workbench?" resolves to the shipped model, kept on
purpose: feasibility is **emergent reachability of capabilities +
heat**, and "workbench" is just the word for capabilities too heavy to
carry. The pot and whetstone are portable capital; the anvil and forge
are fixtures — so camp-stew is possible in the wilds and a blade is
venue-bound, with a diegetic decline (not a UI mode) explaining why.
Carry-vs-stow falls out of encumbrance: stow the stock, carry the kit.
No `CraftingVenueMixin`, still, ever.

### The learning route is the by-hand path (uniform ladder)

The bar's shipped ladder becomes the universal shape. Per branch: a
build-vessel/workpiece buffer, 3–4 step verbs (each a `ManualBuildStep`
engaged activity — interruptible, effect-at-completion), a terminal
mint that reverse-matches to a recipe. The one-shot verb is the earned
shorthand over the same resolve — never a different outcome, only a
different amount of typing. Watching a maker perform grants the claim
(chronicle row); performing grants the deed. Exact step-verb spellings
(e.g. whether cooking's heat step is `simmer` or rides pot-on-fire
physics) are the planner's call within this shape.

### Sharpening is not repair (two axes, two cadences)

Collapsing keenness into `condition` would force one cadence onto two
different fictions (the nightly whetstone vs the smith visit) and
erase the ritual. So: **`keenness`** lives on edged/pointed durables
(the `bladed`/`pointed` delivery forms), decays fast on use, scales
delivery; **`condition`** stays structural, decays slowly, scales the
response height as shipped. `sharpen` restores keenness only; `repair`
restores condition only. Working-surface maintenance beyond edges
(seasoning, tuning) is a named seam, not built — blades only this
build. Dials: `crafting.keenness.*` (wear-per-use, sharpen duration,
delivery scaling).

### Verbs: five diegetic acts — with the subcommand sieve applied

The house rule (one dispatch verb per feature; standalone only for
diegetic acts / affordance boundaries) was applied explicitly:
`forge <item> [with <metal>]`, `cook <item>`, and `sharpen <blade>`
are diegetic acts with **distinct affordance sources** (venue Menu ×2,
carried whetstone) — standalone on both grounds (the `mix` precedent).
`order` already generalizes (present `Menu` + present maker — a smithy
with a menu just works). `repair <item>` and `salvage <item>` are kept
standalone as distinct diegetic service acts — the closest call, with
the growth path declared: **if the maintenance surface grows**
(inspect / estimate / quote), it grows as **subcommands under one
verb**, not verb sprawl; and any introspective surface (recipe listing
beyond `menu`) is subcommand-dispatched from day one. The manual-path
step verbs (`heat`/`hammer`/`quench`; cooking's `add`/`stir`/heat/
plate set) are diegetic acts like the bar's `pour`/`shake` — same
category, afforded the same way. No `craft` umbrella verb — the
per-domain verb *is* the discoverability surface, afforded by venue
Menu contributions exactly as the bar's are.

### Repair mechanics: deficit-priced, ceiling-free, tool-gated

Repair cost = material (same category as the item's composition) ×
(1 − condition) × a dial, plus a required tool capability per domain
(forge heat for metal restoration, `mending` for soft goods — the
whetstone belongs to *sharpening*, not repair). Restores toward full — **no permanent-degradation
ceiling** (the maintenance-relationship thesis: gear never obsoletes,
it asks for care; scarcity comes from the material cost, not decay
ratchets). Broken (condition ≤ `crafting.brokenThreshold`) doubles the
material term and requires the venue-grade tool (no field-fixing a
snapped blade).

### Broken gating is capability loss, not a new state machine

`DurableMixin` exposes `isBroken()`; `ToolMixin.hasCapability` returns
false when broken; weapons/armor need no new gate — condition already
scales the response profile to near-uselessness, and the wield/analyze
surfaces render the state. One threshold dial, no parallel status
system.

### Salvage yield: one global lossy rate, matter-typed outputs

`crafting.salvageRate` (a fraction) of each constituent `Material`'s
mass returns as the material's natural raw form (metal → ingot mass,
organics → scrap glob); the rest is dross (destroyed — the entropy
sink). Provenance/grade/chattel stamp destroyed with the form (chattel
id released via the shipped destruct path). Skill-scaled yield is
deferred with the skill seam.

### Venues ride existing patterns wholesale

The smithy = the Hearthworks smithy + a `Menu` + a static maker NPC
(the Dave v1 pattern — no `Behaved` requirement) + authored stock
placed via `populates:`; likewise one hearth/kitchen venue. No new
venue concept, no `CraftingVenueMixin` (still the named antipattern);
feasibility stays emergent reachability + the heat gate. Wiring them
as `Business`es with rostered positions is welcome if free (the
employment substrate is shipped) but is not a gate for this build.

### Seed roster (content floor, all real)

Smithing: a clasp-knife-class blade, a hammer (`ToolItem` granting
`striking`), a **whetstone** (`ToolItem`, `whetstone` capability, wears
with use — sold at the general store too; the personal-capital
exemplar), a cook-pot (`Receptacle`), a leather jerkin (`Constructed`
hide form), plus ingot stock. Cooking: 3–5 dishes over
existing/authored food materials (incl. one using the store's ration
tier and one "fine meal" showing the grade spread). Every output
backed by shipped readers — the retail rule: never decorative props.

## Constraints

- **Conservation asserted at every seam** — `consumeItemInputs`
  mirrors `consumeBulkInputs`' strict-apply asserts; salvage asserts
  output mass ≤ input mass × rate; declines are data, breaches throw.
- **Law 1 / Law 2** — worth lives on the offer (`PricedOfferMixin`),
  never the good; wear on use, never the clock.
- **The Api/logic split + module taxonomy** — new logic in
  `CraftingLogic` as module-private functions; no free-floating
  helpers; no new module categories; mixin changes stay in their
  subsystem homes (`DurableMixin` is `lib/material/`, not crafting).
- **Bands, never numbers** — condition, grade, heat all surface as
  prose/bands; raw values on `analyze` only.
- **Presence-freeze discipline** — nothing here ticks; repair and
  salvage are acts, wear stays event-driven.
- **The bar is a regression surface** — existing recipes, verbs, and
  the manual build must resolve byte-identically (bar parity was the
  retail build's hard constraint; it is this build's too).
- **Chattel/retail interop** — crafted discrete goods carry
  `_chattelId` per the shipped Thing tier and are consignable at the
  general store unchanged.

## Acceptance criteria

- A player at the Hearthworks can: light the forge, `forge knife`
  (declined cold, succeeds hot), `analyze weapon` the result and see
  the profile derived from the *chosen ingot's* material; wear it down
  in combat; `repair` it and see mitigation/verdict recover; `salvage`
  it into less metal than it took.
- A cold-forge decline, a missing-tool decline, and an
  insufficient-input decline all render as diegetic declines (data,
  not throws).
- A cooked meal's macros route through metabolism and its
  `NutritionLabel`/verdict render grade-appropriately.
- `ThermalApi.reachableHeatFor` is grep-verifiably consumed by recipe
  resolution (D9 closed).
- A broken tool fails capability matching; a broken blade's response
  contribution reflects its condition; repair reverses both.
- A blade dulled by combat use fights measurably worse on the edge
  channel; `sharpen` (an interruptible engaged activity whose rasp is
  audible in the room) restores it to keen; the whetstone's own
  condition drops; a dulled-but-sound blade needs no smith, and a
  nicked blade cannot be fixed by sharpening — the two axes are
  independently observable via `analyze`.
- **The wiki-parity test**: a character with no deeds can complete
  either branch's by-hand path start to finish (the long way is open);
  their one-shot verb declines until the deed exists; after one
  verified by-hand performance the shorthand works. Watching a
  demonstration grants the claim but not the shorthand. `order` works
  for everyone throughout.
- Craft-resolve appends Transcript deeds against the seeded
  `smithing`/`cooking` leaves; `competence` shows the bands moving
  with real practice.
- A craft draws inputs from an open chest in the room and refuses the
  same chest closed.
- All bar-branch tests pass unmodified; new branch tests cover the
  three seams, the heat gate, repair math, salvage conservation, the
  two manual paths + their reverse-matches, the ladder gates, and the
  schema round-trip (old YAML unchanged, new fields parsed).
- `docs/subsystems/crafting.md` grows the branches/lifecycle sections;
  `fire.md` D9 and the launch-worklist item are marked consumed;
  `crafting.brokenThreshold` / `salvageRate` / repair dials seeded in
  `app-settings.yaml`.

## Cross-references

- Seeding: [crafting-slate](../slates/builds/crafting-slate.md),
  [materials-response-slate § Lifecycle](../slates/deferred-rpg/materials-response-slate.md),
  [fire.md § Deferred + D9](../subsystems/fire.md),
  [launch-worklist §1.1](../launch-worklist.md).
- Substrate consumed: [crafting.md](../subsystems/crafting.md),
  [thermal.md](../subsystems/thermal.md) (phase change,
  `reachableHeatFor`), [materials-response.md](../subsystems/materials-response.md)
  (condition scaling, `Constructed`), [combat.md](../subsystems/combat.md)
  (`WeaponProfile`, `analyze weapon`), [metabolism.md](../subsystems/metabolism.md)
  (macros, `NutritionLabel`), [retail.md](../subsystems/retail.md) /
  [chattel.md](../subsystems/chattel.md), [employment.md](../subsystems/employment.md)
  (optional Business wiring), [scripting.md](../subsystems/scripting.md)
  (demonstration capture + the shipped knowledge ladder),
  [chronicle.md](../subsystems/chronicle.md) (claims/deeds),
  [advancement.md](../subsystems/advancement.md) (Discipline leaves,
  `ActSignature`, the difficulty coupling),
  [activity.md](../subsystems/activity.md) (`ManualBuildStep` engaged
  steps), [app-settings.md](../subsystems/app-settings.md).
