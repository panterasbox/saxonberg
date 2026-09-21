# Crafting slate (working doc)

> **Status: PARTIAL** — the venue model, recipes-as-Documents, tools,
> grade/quality bands, the knowledge ladder, and the repair/salvage
> lifecycle all shipped across three branches
> → [crafting.md](../../subsystems/crafting.md)
> **Left:** skill-as-control (the declared next crafting wave — the seam's
> three levers; tool `control` shipped only as a grade FLOOR) · defects
> & failure as diegetic events · recipe-spread beyond watching
> (taught / discovered / tradeable recipe-items; authoring as the fourth
> vector) · assembly recipes + disassembly · the per-domain
> quality property bundles · the tool tech-tree · supply-chain depth
> tuning · the authoring-credits economy
> **Size:** a build

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
- [docs/subsystems/stacks.md](../../subsystems/stacks.md) — fungible stacks:
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

> Shipped: crafting is a force that mints particles — `craftImpl` flows the inputs' Material + mass onto a cloned output template and stamps grade + provenance; combat, `analyze` and the covering stack read the result → [crafting.md § Craft-resolve](../../subsystems/crafting.md), [§ The lifecycle](../../subsystems/crafting.md). One paragraph survives because it is the skill seam's:

**Procedural vs CMS.** Both feed the *template* the clone pipeline
instantiates. CMS authors **output templates** (handcrafted forms).
Procedural gen is (a) **archetypes** — generate template *families*, a
content tool — and (b) **instance variation**, which falls out of the
**skill seam for free**: a novice's scatter *is* randomized variance
within a template's envelope; a master lands on spec. "Procedural gear"
isn't bolted onto crafting — it's skill-scatter over templates.

---

## The venue model (settled — the buildable spine)

> *Superseded by the code:* there is no venue concept — `CraftingApi` resolves on **reachable** tools, inputs and heat, so "Dave's Bar" is emergent from a `Menu`, an on-shift maker and the matter in one room, and camp-stew works at any campfire. The served / DIY split and the NPC floor shipped as content → [crafting.md § The model: crafting is location-agnostic](../../subsystems/crafting.md), [§ The venues](../../subsystems/crafting.md).

---

## Recipes

"Recipes" is four questions wearing one word; separating them shows most is
buildable now, with only the advancement-flavored parts deferred.

> Shipped, as a `Document` rather than an `Idea`: constrained input slots (bulk + `kind: item`), tools by capability, an output template, `Recipe ≠ template`; the flow-through of the chosen input's Material → [crafting.md § Recipe = a `Document`](../../subsystems/crafting.md). **Assembly** recipes (properties emerging from components) stay deferred → [§ Deferred](../../subsystems/crafting.md).

> *Superseded by the knowledge ladder:* recipes are open canon (readable anywhere, `order` never gated); what is earned is the **deed** — your own first faithful hand build — so "venue-known" and "crafter-known" both shipped in a different shape → [crafting.md § The knowledge ladder](../../subsystems/crafting.md). Recipe-items remain (§ 3).

### 3. Spread — how it propagates

Existing recipes spread by three vectors — **taught** (a master/NPC teaches;
ties to mentorship + employment — Dave teaches his bartender),
**earned-by-doing** (use-based unlock / experimentation), **discovered**
(experiment with inputs, find what forms). All advancement-adjacent,
**deferred** with the skill system. (The **earned-by-doing** vector has a
concrete realization: **make-it-once-to-bank-it** — reading a recipe is a
`claim`, *making* it the `deed` that banks it (knowing→doing), and the banked
recipe **is a command-script** — the gentlest first consumer of the
[scripting language](../tails/scripting-slate.md). See
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

> Shipped: `DurableMixin.condition` wears on use, `repair` is deficit-priced and ceiling-free, `salvage` is the lossy sink, serviceware is a claimed pool → [crafting.md § The lifecycle](../../subsystems/crafting.md), [§ The glass pool](../../subsystems/crafting.md).

### Tools are craftables → a parallel tech tree

Tools are `Tangible` outputs too — smithing makes hammers — so there's a
**tool-making supply chain**, and better tools enable better crafts (stone
→ bronze → iron, each tier unlocking the next). **NPC venues bootstrap the
first tools** (the floor); players craft better ones and trade them. Tools
gate and improve *all other* crafting, and are a market in their own right.


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

- **Effects are diegetic events, not stat math.** A bad drink is *"you grimace
  as the rough spirit burns"* + a worse hangover (the congener consumer), never
  "−5 quality."

---

## Deconstruction

> Shipped as **`salvage`** — the generic lossy melt-down over `Tangible` composition, provenance/grade/form destroyed, conservation asserted → [crafting.md § The lifecycle](../../subsystems/crafting.md). What remains:

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
bounties. (Authoring economy: [scoped-authoring](../tails/scoped-authoring-slate.md);
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
- **Defects & failure.** Novice scatter and brittle outputs as **diegetic
  events** (chip, shatter, curdle), not durability subtraction. The honest
  rendering of "skill = control."
- **Tools — model settled (see *Tools* above).** Buildable: recipes require
  tools by capability; tools carry material/grade + `condition`; wear-on-use
  + opt-in repair (the first *durable* sink). Deferred: tool-quality
  *scaling* the control lookup (with the skill system), and the rich tool
  tech-tree.

---

## Buildable now — the Dave's Bar slice (v1)

> Shipped, and grown to three branches → [crafting.md](../../subsystems/crafting.md).

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
  piece spanning this slate, [scoped-authoring](../tails/scoped-authoring-slate.md),
  and the cooperative slate's reserve/governance. Distinct from crafting's
  material cost.
