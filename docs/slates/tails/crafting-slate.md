# Crafting slate (working doc)

> **Status: the *venue model* is settled enough to seed a slice; the core
> mechanics (recipes, skill, quality) are open design space, much of it
> advancement-adjacent and deferred.** Crafting is the **transformation**
> stage of the economy — where raw inputs become valued goods, i.e. where
> value is actually minted. The economy slate worked out the *physics and
> the philosophy* (value lives in transformation; quality is a verdict;
> skill = control; provenance carries worth) and explicitly deferred the
> *mechanics*. This slate is the home for those mechanics. The
> crystallizing exemplar — **Dave's Bar** — is concrete enough to build a
> first slice against; the recipe/skill/quality systems behind it are not.

Working slate for **crafting** — how raw inputs become finished goods, at
venues, by labor and skill. The governing claim, inherited from the
economy slate: **an economy's value is minted in transformation, not in
raw extraction** — so crafting is where the interesting economic and
gameplay surface lives, and it's the thing player labor, player
businesses, and the skill system all point at.

See also:

- [docs/slates/builds/economy-slate.md](../builds/economy-slate.md) — **the
  parent.** Crafting is its transformation stage. That doc owns the
  load-bearing philosophy this slate inherits and must not contradict:
  *value lives in transformation*; *quality is a verdict, not a property*
  (ordinal grades, props-real-or-cut, effects-as-diegetic-events not stat
  math); *the skill seam* (skill = control, one lookup, the economy
  doesn't define the skill system); *recipes are knowledge*; *provenance
  carries worth* (maker's marks, reputation attaches to the maker).
- [docs/slates/builds/economy-slate.md](../builds/economy-slate.md) §
  *Employment & economic engagement* — the **venue + employment**
  crystallization: the crafting-venue four-tuple, place-based crafting,
  buy-vs-DIY, NPC-floor/player-apex, and Dave's Bar as the unit cell.
  This slate generalizes that hook into the actual crafting subsystem.
- [docs/slates/builds/daves-bar-slate.md](../builds/daves-bar-slate.md) — **the
  integrating exemplar.** Dave's Bar as the end-to-end vertical where
  crafting meets skills, employment, the economy, engaged activity, and the
  social/trait layer — the experience design this slate's mechanics serve.
- [docs/subsystems/bulk.md](../../subsystems/bulk.md) — continuous matter:
  the bar's spirits and mixers, measured pours (`fill`/`pour`/`drink`),
  the material-keyword + measure grammar. The liquid half of inputs.
- [docs/subsystems/glob.md](../../subsystems/glob.md) — fungible stacks:
  ingredient piles, the discrete half of inputs.
- [docs/subsystems/quantities.md](../../subsystems/quantities.md) —
  `Quantity<U>` for measures.
- [docs/subsystems/location.md](../../subsystems/location.md) — venues are
  **localities**; place-based crafting makes the world the substrate.
- [docs/subsystems/race.md](../../subsystems/race.md) — the **Material**
  substrate + clade scope; material grade is the first quality band.
- The **skill / advancement** system — *deferred to gamification.*
  Crafting consumes it through one seam (below) and must not define it.

---

## The spine (inherited, non-negotiable)

These come from the economy slate and bound every decision here:

1. **Value is minted in transformation.** Raw inputs are abundant-but-not-
   free; worth accrues when they're *made into something.* Crafting is the
   value-add.
2. **Quality is a verdict, not a property.** No 0–100 quality slider. What's
   real is the measurable property bundle (mass, edge geometry, freshness —
   some in real units, some as ordinal grades, the way the real world
   actually grades materials). "Quality" is the *fit* of that bundle to a
   purpose, rendered by an observer. Effects are **diegetic events** (a
   brittle blade *chips on a hard parry*), never damage-spreadsheet math.
3. **Skill = control, through one seam.** At the moment a craft resolves it
   asks the skill system *"how good is this maker at this craft?"* and turns
   the answer into *how tightly the result lands on the intended bundle* — a
   novice scatters and defects, a master hits spec and can target the
   material's extremes. Crafting **consumes** skill; it does not **design**
   it. Whatever skill becomes (number, band, anchored or not) feeds that one
   lookup and stays on its own side of the membrane.
4. **Provenance carries worth.** Because you can't read quality off an
   object, *who made it* is the signal — maker's marks, hallmarks,
   reputation on the maker. Provenance is stamped at craft-resolve and can't
   be farmed or printed.
5. **Conservation.** Inputs are consumed; the output is a new stamped thing.
   Nothing is minted from nothing.

---

## Inputs, outputs & the standard-model situation

Crafting situates cleanly on the [standard model](../../standard-model.md),
and the situation answers "can we solve this abstractly?" — **yes, because
the standard model is already theme-agnostic.** The spine is sorted by
*containment*, not theme: "weapon," "armor," "furniture" are **not kinds.**
A sword is a `Thing` + `Tangible` (made of `Material`) + `Wieldable` +
`Visible`; what makes it a *weapon* — combat performance — is **Part II**
(the gamification/meaning layer), deferred. There is nothing
weapon-specific for crafting to know.

So the Part-I / Part-II split runs right through crafting:

- **Part I (shippable): crafting is a *force* that mints *particles*.** An
  Api transforms input `Tangible` Things into an output `Tangible` Thing
  via the **template/clone pipeline** ([templates.md](../../subsystems/templates.md)),
  stamping material composition (from the inputs), a quality **grade**, and
  **provenance** (the maker). Honest `Quantity` substrate throughout (mass =
  density × volume; `Material` singletons; ordinal grades). **Solvable now,
  no RPG.**
- **Part II (deferred): what a crafted thing *means*.** Weapon
  performance, the skill system, combat — the chemistry that *reads* the
  particle's properties. Slots in later as readers; mints no new crafting
  machinery.

**Inputs / outputs.**

- **In** — `Tangible` Things made of `Material`: raws (ore, wood,
  water-via-`bulk`) + intermediates (ingots, planks), *consumed*
  (conservation); the venue's **tools** (`Tangible`, wear-with-use, not
  consumed); a **recipe** (knowledge → an output template); the maker's
  **skill** (the seam).
- **Out** — a new `Tangible` Thing, cloned from its output template,
  stamped with material composition + grade + provenance.

**The range, sorted by Part-II dependence** — which *is* the buildability
order:

- **Buildable now (Part I only):**
  - **Consumables** (cocktails, food, drink) — *the best first slice*,
    because the consumer partly **ships**: drinking → `metabolism`, alcohol
    → `getBAC`. Gather → craft at Dave's Bar → drink → metabolism reads it:
    **a complete economic loop with zero RPG.**
  - **Materials / intermediates** (graded `Tangible` Things) — fully
    generic.
  - **Decor / authored objects** (dorm furniture — `Visible` + `Tangible`,
    pure-play value).
  - **Tools** (`Tangible` + the tool-quality → control seam).
- **Gated on Part II (the RPG): gear.** You can craft the *sword* now
  (`Thing` + `Tangible` steel-grade-B + `Wieldable`, real mass +
  provenance, wieldable); what waits is what it *does* in combat. **Make
  the object now; its meaning arrives later** — no re-tooling.

**Procedural vs CMS.** Both feed the *template* the clone pipeline
instantiates. CMS authors **output templates** (handcrafted forms).
Procedural gen is (a) **archetypes** — generate template *families*, a
content tool — and (b) **instance variation**, which falls out of the
**skill seam for free**: a novice's scatter *is* randomized variance
within a template's envelope; a master lands on spec. "Procedural gear"
isn't bolted onto crafting — it's skill-scatter over templates.

**The payoff for the economy.** Solving crafting abstractly makes the
**transformation stage concrete and *partially shippable*** — the
consumables loop is a closed cycle (extraction → transformation →
circulation → entropy) that runs without the RPG. The economy can be
proven end-to-end on cocktails before a weapon exists; the RPG doesn't
*complete* the economy, it enriches the transformation once Part II ships.

---

## The venue model (settled — the buildable spine)

The one part worked out far enough to build against, from the cooperative
slate's Dave's Bar.

**A crafting venue aggregates the four things a substantial craft needs —
inputs, tools, recipes, and (optional) skilled labor — so the output is
feasible *there* and infeasible *at home*.** Dave's Bar = spirits + mixers
(**inputs**) · shaker + glassware (**tools**) · cocktail recipes
(**knowledge**) · bartenders (**labor**). Generalize the four-tuple per
domain — smithy, kitchen, alchemy lab, loom — and it's the spine of the
whole subsystem.

- **Crafting is place-based, scaled by complexity.** Trivial crafts happen
  anywhere; substantial crafts need the venue's aggregated inputs/tools.
  The venue requirement *is* the complexity gate — which makes the **world**
  the economy's substrate (venues are destinations, content, employment
  hubs), not a backpack menu.
- **The venue is the employer's value-add.** "Why buy a cocktail instead of
  making one at home" and "why does Dave employing a bartender beat
  self-employment" have the *same* answer: the venue aggregates
  inputs/tools/skill you can't economically replicate at home. (See
  cooperative-slate § employment-viability.)
- **Two paths at every venue: buy the output, or rent the means and DIY.**
  Order the cocktail (the bartender makes it — pay for product + service) or
  mix it yourself from the bar's stock (pay for access + ingredients). The
  employ-vs-self-employ sort, made concrete.
- **NPC floor, player apex.** NPC Dave is the bootstrap floor (the bar
  exists, stocked and staffed, at genesis); player-owned venues are the
  apex that grows on top.
- **Inputs** are stocked by the venue (`bulk` liquids + `glob` stacks +
  `Material`-bearing items), consumed on craft (conservation). **Tools** are
  venue-provided and **wear with use, not the clock** (economy slate Law 2).

---

## Recipes

"Recipes" is four questions wearing one word; separating them shows most is
buildable now, with only the advancement-flavored parts deferred.

### 1. Representation (buildable)

A recipe is an authored **`Idea`** (knowledge — incorporeal, a reference
singleton like `Material` / `Species`) specifying a transformation:

- **input slots by *constraint*, not by item** — "a metal ingot, grade ≥
  C," "2 measures of any spirit," "a fruit." Each slot accepts a *range*,
  and *the choice flows through to the output* (steel vs iron blade; gin vs
  vodka martini) — where substitution and optimization live (the SWG move).
- **required tools** (venue-provided);
- **an output `Template`** (the form to clone);
- **property-derivation rules** — how the chosen inputs' material/grade map
  onto the output bundle (output material = the input metal; grade =
  f(input grade, skill); mass = density × volume).

Two decisions:

- **Recipe ≠ template.** A *form* (longsword) can have *several* recipes
  (forged, cast, an alternate path); a recipe produces *one* form. Keep them
  decoupled — multiple paths to the same thing (the EVE / real-life
  pattern).
- **Two shapes, by tier.** *Transform* recipes (ore → ingot): fixed output
  template, material flows through. *Assembly* recipes (blade + hilt + guard
  → sword): the output's properties **emerge from its components** — the
  standard model's composition-over-inheritance applied to objects. Lower
  tiers transform; upper tiers assemble.

### 2. Knowledge — who *knows* it (layered)

- **v1: venue-known.** The venue carries its recipe book — Dave's Bar knows
  cocktails, the smithy knows blades. You craft what's supported *where you
  are*; NPC venues ship with their recipes (bootstrap). All the buildable
  slice needs.
- **later: crafter-known** — personal recipe knowledge (you *know* how to
  make X), the start of a real knowledge economy. Deferred.
- **the trade vector: recipe-items** — knowledge embodied as a tradeable
  scroll/book. Deferred.

### 3. Spread — how it propagates

Existing recipes spread by three vectors — **taught** (a master/NPC teaches;
ties to mentorship + employment — Dave teaches his bartender),
**earned-by-doing** (use-based unlock / experimentation), **discovered**
(experiment with inputs, find what forms). All advancement-adjacent,
**deferred** with the skill system. (The **earned-by-doing** vector has a
concrete realization: **make-it-once-to-bank-it** — reading a recipe is a
`claim`, *making* it the `deed` that banks it (knowing→doing), and the banked
recipe **is a command-script** — the gentlest first consumer of the
[scripting language](./scripting-slate.md). See
[daves-bar-slate](../builds/daves-bar-slate.md) § *Verbs & the recipe-learning loop*.) But a fourth vector *isn't* deferred:
**authoring.** New recipes enter the world by being **authored** (CMS) —
recipe-creation is the author tier of the making-spectrum, credits-gated to
instantiate. So **authoring creates recipes; teach/do/discover spread
them** — "where recipes come from" (authored) split from "how they
propagate" (the vectors).

### 4. Resolution — recipe + inputs + skill → output (the skill seam)

The recipe names the *target* bundle; **skill sets how tightly the result
lands on it** (the one seam — novice scatters/defects, master hits spec and
reaches the material's extremes); inputs supply material + grade; the output
is stamped with the bundle + **provenance**. v1 resolves at a *fixed*
control level (flat, known recipes); the skill system later adds
scatter/mastery. *(Mostly deferred — the skill seam, spine item 3.)*

### The north star — recipes are substrate-constrained, not author-fiat

The honest model: recipes aren't arbitrary — they're **bounded by the real
substrate.** You can't make a steel blade from water; the valid-transform
space is set by material properties, and authoring/discovery *finds* the
valid transforms within it rather than inventing them. The substrate
defines what's *possible*; a recipe names what's *known.* We can't fully
realize "recipes derived from material physics" soon, but it's the north
star that keeps crafting from drifting into stat-fiat.

---

## Tools

The fourth of the venue four-tuple, and the one with a clean identity once
you see what it *is*: **the capital side of control.**

### Tools are the capital side of control

**control = f(skill, tools).** Skill is the *labor* side of how tightly a
craft lands on its target bundle; a tool's quality + condition is the
*capital* side (a master with a poor hammer and a novice with a masterwork
hammer both pull toward the middle). That's why tools slot into everything:
the venue's good tools are its **value-add** (you craft better at Dave's
than in your kitchen), a good personal tool is **personal capital** (better
control across venues), and tools share the **skill = control seam** — two
inputs, capital and labor, to one lookup.

### Standard-model situation — a role + a capability, not a kind

Like "weapon," **"tool" is not a kind** — it's a *role an object plays in a
transformation.* A hammer is a `Thing` that is `Tangible`; it's a "tool"
only because a recipe asks for it. So:

- **recipes require tools by *capability*, not by item** — "a heat source ≥
  X," "a striking surface," "a cutting edge" — the same constrained-slot
  idea as inputs (a forge *or* a campfire satisfies "heat source").
- a tool carries **quality** (`Material` + grade → its control contribution)
  and **condition** (the `condition` entropy field → wear). "Tool" is a
  composition — `Tangible` + a tool-capability + `condition` — not a new
  branch. The only real addition is **tool-capabilities** so recipes can
  require by kind.

### The economic identity — the durable-good sink

The part that makes tools matter economically: **consumables are a one-shot
sink; tools are a recurring one.** They wear with **use, not the clock**
(Law 2 — you dull the knife by cutting, never by time on the wall),
driving:

- **repair** — an opt-in service/consumable sink (a whetstone, a smith) once
  worn enough. Never scheduled, never an upkeep treadmill: *use consumes,
  neglect costs nothing.*
- **replacement** — eventually it wears out and you craft/buy a new one
  (recurring craft demand).

That wear→repair→replace loop is what keeps an economy *circulating* over
the long run — durable goods with honest wear are the steady demand
one-shot consumables can't provide. Tools may be the most important *sink*
in the whole model.

The same durable-good shape covers **venue service-ware** — glasses, plates,
fixtures: a **fixed cycling pool** (serve → use → **bus** → wash → reuse, the
object count bounded by the pool, not the use-count), with a small
**breakage/walk-off leak** the venue **restocks** (the recurring sink), and the
live count **transient** (persisted nowhere). See
[daves-bar-slate](../builds/daves-bar-slate.md) § *Glassware & venue durables*.

### Tools are craftables → a parallel tech tree

Tools are `Tangible` outputs too — smithing makes hammers — so there's a
**tool-making supply chain**, and better tools enable better crafts (stone
→ bronze → iron, each tier unlocking the next). **NPC venues bootstrap the
first tools** (the floor); players craft better ones and trade them. Tools
gate and improve *all other* crafting, and are a market in their own right.

### Fixed vs portable

- **Venue fixtures** (forge, anvil, the bar's tap) — large, immobile, the
  venue's **means of production** (used by being *there* — the employment
  value-add).
- **Personal / portable** (hammer, knife, whetstone) — carried
  (`Wieldable`), yours, tradeable; **personal capital** you bring to the
  venue or use anywhere for simple crafts.

A real craft often needs both — the venue's forge *and* your hammer.

---

## Skill — the seam, not the system

> **Scope guard.** This slate owns only the *seam* — what crafting consumes
> from skill. It deliberately **does not design the skill system** (how
> skill is gained or lost, what it is, how it progresses, how it anchors to
> learning). That is Part II / the future **gamification slate's** job, and
> nothing here should be read as deciding it. The purpose is to pin the seam
> tightly enough that the future system can't drift *incompatible with
> crafting* — and to assert nothing further.

### The contract crafting consumes

At craft-resolve, crafting asks one question — *"how good is this maker at
this craft?"* — and reads back a **per-craft control level.** Control drives
three levers, combined with tools (`control = f(skill, tools)` — labor +
capital):

- **tightness** — high control → results land tightly on the target bundle;
  low → scatter;
- **reachable envelope** — high control → the material's *extremes* are
  reachable (keenest edge, finest temper); low → only the safe middle;
- **defect rate** — low control → diegetic failures (chips, cracks); high →
  clean.

That is the **entire** crafting-side contract. Crafting reads a control
level; it does not read — or care — how the level was produced.

### What crafting requires of the future system (constraints, not design)

Three constraints fall out — and they are the *only* claims this slate makes
about skill:

1. **Answerability.** The system must supply a per-craft control level at
   resolve time. That's the whole interface.
2. **Source-agnostic.** Crafting must stay indifferent to *where* the level
   comes from — so the future system is free to source it from in-game
   practice, a teacher, a real-learning anchor, or any mix, **without
   crafting changing.** This is a *don't-foreclose* requirement (it keeps the
   standalone-vs-education-vertical fork open for later — the
   [endogenous-value](../../lenses/endogenous-value.md) Goodhart seam), not a
   choice made here.
3. **Verdict, not score, at the seam.** However skill is represented
   internally, at the crafting *output* it surfaces as a verdict on the work
   (consistent results, reachable extremes, no defects — carried by
   provenance), never a displayed "Smithing 73." A crafting-side rendering
   rule (the quality-is-a-verdict membrane), not a claim about the system's
   internals.

Everything else — gain, loss, representation, progression, the education
anchor, the gamification primitives it's built from — is **deliberately left
open.** Crafting emits meaning-free events ("crafted X, difficulty D,
quality Q"); the skill system will be *one interpreter* of them, designed in
the gamification slate, later.

---

## Quality — the verdict, rendered (DF, not Diablo)

Quality-as-a-verdict (spine #2) resolved into a **rendering model**. A crafted
thing carries a measurable **property bundle** (per domain — for a drink:
execution/balance · ingredient grade/congeners · strength/ABV ·
temperature/freshness); **quality is the *fit* of that bundle to the thing's
purpose**, rendered as a verdict by an observer.

- **Render Dwarf-Fortress style: an ordinal band-word + descriptive prose,
  never a number.** A band-word headline (*poor / fair / fine / exceptional /
  masterful*) over the descriptive *why* (*"crisp, ice-cold, perfectly
  balanced"* vs *"cloudy, lukewarm, harsh"*). The Visible/Mml/Recognition stack
  already turns property bundles into prose; this points it at the output. The
  band-word is the legible headline (and the seam for any at-a-glance treatment
  — a masterwork reads boldly); the prose is the justification.
- **Effects are diegetic events, not stat math.** A bad drink is *"you grimace
  as the rough spirit burns"* + a worse hangover (the congener consumer), never
  "−5 quality."
- **Anticipate via provenance, experience via the verdict — and they diverge.**
  You *expect* quality from the **brand / maker's-mark** (the social signal);
  you *learn* it from the **description** on use. The gap is the **price≠quality**
  honesty (the overpriced-premium, the value-gem).
- **Quality is the *whole*, not the cost.** Execution × appropriate-ingredients
  × proportions × freshness — a cheap-but-well-made thing reads decent, an
  expensive-but-botched one reads bad. (A vodka martini isn't *low quality* —
  it's a *different drink*; low quality is poor *fit*, never a different purpose.)
- **Viewer-relative richness is the appraisal skill — deferred.** A connoisseur
  tastes nuance a novice misses; v1 renders uniform prose.

**No Diablo-style rarity tiers — and rejecting them is load-bearing.** Diablo
"rarity" (common/rare/epic/legendary) **fuses** three things this model keeps
**separate**, generated by the **loot-faucet + random magical affixes** — the
exact stat-inflation treadmill the economy + advancement slates ban. We
**decompose** it honestly: **quality** = the DF verdict (earned); **uniqueness /
legend** = **provenance** (a named, attributed masterwork — *"☼…☼, by [maker]"* —
*is* the "legendary item," earned not dropped); **power** = horizontal + diegetic
(better, never bigger); **scarcity / value** = emergent economics (few exist /
hard to make / famous maker — never a stamped tier). Every good thing rarity
gives — legible specialness, the chase, named items — falls out of DF-quality +
provenance + the economy, without the treadmill. For **consumables** (a drink)
rarity is a non-concept: it's drunk and gone — only its **quality** and **who
made it** matter.

---

## Deconstruction

The reverse of crafting — recovering lower-order materials from
higher-order craftables. Buildable and economically load-bearing, under one
sharp rule: **deconstruction is lossy, and the loss *is* the entropy
sink.**

- **Lossless would break the economy.** Craft F from A+B+C and recover *all*
  of A+B+C from F, and matter never leaves the world — it cycles (craft →
  deconstruct → craft) while the extraction faucet keeps adding, and
  materials inflate. Real recycling loses to slag/process; that loss is the
  honest *and* necessary sink (an opted-into entropy event — Law 2-clean,
  since you *chose* to break it).
- **You recover raw material, stepped down — never the value-add.** Melt a
  masterwork sword → *some steel scrap*, not a masterwork's worth of
  anything: **provenance, the quality verdict, and the crafted form are
  destroyed** (you can't un-bake the cake). This makes deconstruction
  **self-limiting** — losing the value-add, you'd only break down things
  worth *less as an object than as their recoverable material* (junk, failed
  crafts, surplus). Nobody melts a masterwork. So it sorts itself to junk
  *and can't be a money pump* — both failure modes killed by the same
  lossiness.

**Standard-model-native — no reverse-recipe needed.** `Tangible` already
means "made of material(s)," so a thing knows what it's made of;
deconstruction is a **generic operation on that composition** — return a
lossy fraction of the constituent `Material`s as raw stacks, strip
provenance/quality. *Anything* `Tangible` can be salvaged. That yields a
two-tier model mirroring the recipe split:

- **Melt-down (generic, buildable now)** — a lossy fraction of raw
  materials, stepped all the way to low tier; reads composition, no recipe.
- **Disassembly (authored, deferred)** — the reverse of *assembly* recipes:
  carefully take a composed thing apart to recover its **components intact**
  (gears, a blade-blank) rather than raw material. Less lossy; needs an
  authored recipe + skill. "Melt it for scrap" vs "disassemble it for parts."

**Rides existing seams:** the **skill = control** seam gates yield (a
skilled salvager loses less / recovers more-intact — deferred, v1 a fixed
rate); it's a **sink with a floor** (junk gets two deliberately-mediocre
exits — sell to the NPC counterparty-of-last-resort for coin, or deconstruct
for lossy material — so neither is an exploit); and a **salvager is a
profession/venue** (a scrapyard is a venue — the four-tuple applies — and a
coin sink).

---

## Supply chains & tiers

Crafting forms **tiers** — raw → intermediate → finished (ore → ingot →
blade → assembled sword) — and **chain depth is the primary lever on
whether an economy exists at all.** Shallow chains → everyone
self-sufficient → no trade; deep chains → nobody owns the whole chain →
**specialization → a real economy.** Depth is how you dial interdependence
(the EVE/SWG/Eco lesson: the supply chain is what makes players need each
other). Two topologies, both worth having:

- **Convergent** (A+B+C → D, D+E → F): value concentrates at the **top** —
  F is a prestige good embodying a deep tree of labor + provenance
  (masterworks).
- **Divergent** (A → B, C, D…): value concentrates at the **bottleneck** —
  A is a keystone commodity everyone needs, so *producing A is a reliable
  business* (the trade-hub anchor).

Caution (the anti-treadmill rule): each tier must carry a real
decision/value-add, not click-busywork. The repetitive **bottom tier** (raw
gathering) is absorbed by the **idle / employment** automation layer (see
[cooperative-slate](../builds/cooperative-slate.md) § Employment) — an idle trickle
solo, hired NPC labor at scale — so depth doesn't become grind.

## The making spectrum — utility vs personalization, two costs

"Making" is a **spectrum**, and the two payoffs sit at different points on
it — they are the [endogenous-value](../../lenses/endogenous-value.md)
lens's two value types:

- **Utility** → *effort-anchored* value (a tool's worth traces to
  function); economy-bound, min/max-friendly, mostly **Part-II-dependent.**
- **Personalization** → *pure-play* value (your dorm is worth what it means
  to you — arbitrary, and fine); identity/pride, **Part-I-sufficient.**

The **cost changes kind** as you climb the spectrum:

| Act | Bounds | Cost | Payoff |
|---|---|---|---|
| **Buy** | off the shelf | coin | utility |
| **Craft** | transform in-system (material + grade variation) | **materials + labor** (conservation) | utility + modest personalization |
| **Author (CMS)** | write new code / kinds, unbounded | **credits to instantiate** | maximal personalization |

Crafting is *primarily utility + modest personalization*; deep
personalization graduates to **CMS authoring** (new source, new kinds).
The cost structures meter **different scarce things**: crafting consumes
**matter** (conservation); authoring consumes **shared-world space**. Hence
**authoring is free; instantiation costs** — writing in a sandbox is free
(effort only), but *cloning your creation into the shared world* costs
**credits**, which act at once as a **spam gate**, an economic **sink**,
and a **commons-meter.** Credits are **in-world, never real-money-
purchasable** (the no-pay-to-win membrane — you can't buy your way to
flooding the commons with content), best framed as a **governed
commons-expansion budget** the polity can meter and grant as content
bounties. (Authoring economy: [scoped-authoring](../builds/scoped-authoring-slate.md);
credits-as-governed-sink: [cooperative-slate](../builds/cooperative-slate.md).)

---

## Prior art — where we draw from

Crafting systems cluster into a handful of archetypes by their core
mechanic. Filtered through this slate's philosophy (honest substrate,
quality-as-verdict, skill-as-control, provenance, place-based, text-first),
here's the landscape and where we sit:

| Archetype | Examples | Verdict |
|---|---|---|
| **Recipe / vending-machine** | WoW, most MMOs | use the *structure* (recipe→template→clone), reject the *resolution* (deterministic, fixed quality — the "quality slider") |
| **Skill treadmill** | classic WoW professions, Wurm grind | avoid the grind (Law 2); keep only *use-based* mastery (RuneScape/UO) for the deferred skill system |
| **Mini-game / twitch** | FFXIV rotation, blacksmith timing | avoid — wrong for text-first; we want *character* skill-as-control, not reflexes |
| **Process / physics sim** | Dwarf Fortress, Vintage Story | **our camp** |
| **Modular / component** | Bannerlord smithing, EVE components, GW2 | **architecturally ours** — composition-over-inheritance applied to objects |
| **Experimentation / discovery** | SWG experimentation, alchemy games, early Minecraft | relevant to the deferred *recipe-spread* question |
| **Player-economy / specialization** | EVE, SWG, Albion, Eco | **our economic lineage** |

### The four to study

- **Dwarf Fortress** — the **quality model, almost verbatim**: ordinal
  quality *bands* (not 0–100), real material physics, effects *emerging* from
  properties, and masterworks **named and attributed to their maker**
  ("☼steel longsword☼, masterfully crafted by Urist"). "Quality is a verdict
  + props real + provenance carries worth," already shipped in a game.
- **Star Wars Galaxies** — the **crafter-identity model**: resources with
  *varying stats* (the best ore is somewhere, and it shifts over time),
  experimentation to push the result, the crafter's name on every item,
  crafting as a full profession with famous masters. "Material grade +
  skill-as-control + provenance" is essentially modern SWG.
- **EVE Online** — the **manufacturing economy at scale** (already cited in
  the economy slate): blueprints (templates), player-mined inputs, supply
  chains, a real market. Proof a fully player-made economy holds.
- **Eco** — **study hardest.** The closest existing thing to the *whole*
  vision: a player economy on skill specialization + real material/ecological
  constraints, governed by a **player government with laws, votes, and
  taxes.** Almost nobody has fused economy + governance + crafting this way —
  Eco is the one real prior art for *the combination*, not just the crafting.

### What to avoid

The vending-machine's **determinism** (keep the recipe→template *structure*,
not the fixed output); the **0–100 quality slider** (Wurm) — *quality is a
verdict, ordinal*; **twitch mini-games** (player dexterity, not character
skill; and wrong for text); and **grind-for-grind treadmills** (Law 2).

### Two things that are ours

- **The venue model is a distinctive synthesis.** Most of these are
  *inventory* crafting (click "craft" in your bag); the nearest precedent is
  the crafting-*station* requirement (WoW's forge, FFXIV's stations, Eco's
  placed workbenches). **Dave's Bar fuses the station + the player business +
  the social place** — MMO stations × the player-economy games × the RP-MUD
  tavern tradition.
- **Text-first reinforces the honest-properties camp.** A DF-style
  *described* object ("a keen steel longsword bearing Dave's mark") is what
  prose renders well, where a stat-block isn't. The Visible/Recognition/Mml
  stack already turns property bundles into description — a crafted output is
  a *described thing*, not a sheet.

> In one line: **DF's quality model + SWG's crafter-identity + EVE's
> manufacturing economy + Eco's economy-under-governance — composed modularly
> (the standard-model way), rendered in prose, resolved by character-skill-as-
> control — and deliberately *not* the vending machine, the slider, or the
> twitch mini-game.**

---

## The open design space (what this slate is *for*)

The mechanics behind the venue are the real work, and most are barely
sketched:

- **The recipe system — model settled (see *Recipes* above).** Buildable
  now: the representation (constrained input slots + tools + output template
  + derivation rules; recipe ≠ template; transform vs assembly) and
  venue-known knowledge. Deferred (advancement-adjacent): crafter-known
  personal knowledge + recipe-items, the teach/do/discover spread vectors,
  and skill-scatter resolution.
- **The skill system's far side — deliberately out of scope (see *Skill —
  the seam, not the system*).** Crafting pins only the seam (a per-craft
  control level) + three constraints (answerable · source-agnostic ·
  verdict-not-score). Gain/loss/representation/progression/the education
  anchor are the **gamification slate's** to design — and must not leak in
  here (the explicit don't-poison-the-well guard).
- **The quality mechanics — rendering settled (see *Quality — the verdict,
  rendered* above; DF band-word + prose, effects-as-events, no Diablo rarity).**
  Still open: how the per-domain property bundle is *modeled* and how the skill
  lookup scatters/tightens it (with the skill system).
- **Crafting actions / verbs — first surface settled at Dave's Bar** (see
  [daves-bar-slate](../builds/daves-bar-slate.md) § *Verbs & the recipe-learning loop*:
  the recipe shorthand over the manual build; served vs DIY; recipes as
  command-scripts). The general per-domain verb vocabulary remains.
- **Defects & failure.** Novice scatter and brittle outputs as **diegetic
  events** (chip, shatter, curdle), not durability subtraction. The honest
  rendering of "skill = control."
- **Tools — model settled (see *Tools* above).** Buildable: recipes require
  tools by capability; tools carry material/grade + `condition`; wear-on-use
  + opt-in repair (the first *durable* sink). Deferred: tool-quality
  *scaling* the control lookup (with the skill system), and the rich tool
  tech-tree.
- **Materials & grades.** Lean on the `Material` substrate (race.md); material
  grade is the first quality band (carries provenance + sets the achievable
  envelope). Richer properties (edge, freshness) accrete only as the systems
  that *read* them ship — *props real or cut.*

---

## Buildable now — the Dave's Bar slice (v1)

Enough is settled to ship a first venue without the deferred systems:

- **A venue** (a locality) holding a **stock of inputs** (bulk + globs +
  material items) and **tools**.
- **Flat, known recipes** — a fixed map of inputs (+ tools) → a stamped
  output. No skill system yet (recipes resolve at a fixed control level;
  defects/extremes wait for skill).
- **Both paths** — *served* (an NPC or player worker makes it) and, if it
  earns its keep, *DIY* (the crafter uses the venue's stock + tools).
- **Output stamped** with **provenance** (the maker) + **material grade**
  (the first quality band). Inputs consumed (conservation).
- **Generic melt-down deconstruction** — break any `Tangible` into a lossy
  fraction of its constituent materials (the first real entropy *sink*),
  provenance/quality stripped, at a fixed recovery rate.
- **Tools required by capability + wear-on-use + opt-in repair** — the first
  *durable* sink (wear→repair→replace); tools contribute control at a fixed
  level for now.

What v1 deliberately does **not** ship: the skill system, recipe
knowledge/spread, rich quality mechanics beyond material grade, and
defects/extremes (all of which wait on the skill seam's far side and the
advancement layer).

---

## Open problems — deferred with the advancement layer

- **The whole skill / advancement system.** Tied to gamification, undesigned;
  crafting only consumes it through the one seam.
- **Recipe knowledge & spread.** Taught / earned / discovered — advancement-
  adjacent.
- **The quality verdict, rendered — model now settled** (see *Quality — the
  verdict, rendered*: DF band-word + prose, never a number; effects as diegetic
  events; anticipate-via-provenance vs experience-via-verdict; no Diablo rarity).
  What remains: the per-domain property bundles themselves, minted as their
  consumers (drinks, cooking, combat) land.
- **Supply-chain depth & topology tuning.** How deep/branchy the recipe
  graph is (the interdependence dial), where the keystone bottlenecks sit —
  macro tuning, deferred to a running economy.
- **The credits / authoring economy.** How instantiation credits are
  priced, earned, and governed (the commons-expansion budget): a real design
  piece spanning this slate, [scoped-authoring](../builds/scoped-authoring-slate.md),
  and the cooperative slate's reserve/governance. Distinct from crafting's
  material cost.
- **A full crafting design doc.** This slate is the design surface; once a
  slice ships, the surviving design graduates to a `docs/subsystems/`
  crafting doc.
