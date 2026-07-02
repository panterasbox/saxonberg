# Advancement slate (working doc) — learning as a science

> **Layer: the game.** This is the *game-system* half of "learning as
> adventure" — how a character grows. The platform's job is to *measure*
> real engagement (the [standard-model](../../standard-model.md) sensor +
> four primitives); this slate is the **game** that advancement is, the
> thing that has to feel like learning even when nobody's plugged a
> classroom into it yet. Premise: [vision.md](../../vision.md). Motivation
> science: [lenses/motivation.md](../../lenses/motivation.md) (SDT). The
> in-world ability channels it leans on are
> [capability-magic-slate](../deferred-rpg/capability-magic-slate.md)
> (conditioning / skill / knowledge); the social-structure side is
> [affiliation-slate](../deferred-rpg/affiliation-slate.md) (guilds /
> houses). This slate synthesizes those into one buildable build and adds
> the model that ties them to learning science.

This build exists because the codebase has the **philosophy** of
advancement ratified (the motivation lens, "depth is earned not chosen")
and the **substrate** ~40% shipped (Reserve, Activity, affordance
attribution, Persona, templatePath-durable keying, zones/access), but the
*mechanism* — skills, guilds, the growth loop — is a named gap. The hard
requirement that shapes everything: **a player must be able to advance a
character without ever entering a classroom.** This is a real RPG first;
the academic vertical is optional fuel, never the only road. The first
pilot audience will likely have *zero* academic intent (an existing
community — plausibly around a politics livestreamer), so the game has to
stand entirely on its own.

## Scope — the physics, not the content

This build is the **substrate** — the engine-level "physics" of
advancement — not the content or play-loops that ride on it. The
requirements pass should target the physics; everything else here is
illustration. The test for "is this physics": **does it know what a sword
is?** If yes, it's content; if no, it's what this build owns.

**In scope (the physics):**
- The **Catalog / Transcript / Competence** substrate — the typed
  content-graph, the append-only evidence ledger, the derive-on-read
  estimator (family/tuning deferred).
- The **loadout** mechanism — capacity-not-decay, the savings-effect
  warm-up, the readiness cap.
- **Credit assignment as an authoring discipline** — Subject-tagged
  sub-checks (skill-signatures), world-grounded difficulty, graph-propagated
  evidence, information-weighting.
- The **Reserve-shaped stakes engine** — transient-deficit + played-recovery,
  opt-in risk, the two-ledger split (skill permanent, world-state recoverable).
- The **play-loop-neutral seam** — consumer loops write `deed`s and read θ
  to `confer` verbs; guild membership / credential as affordance sources.
- The **world-distro hooks** — permanence/mortality as a per-instance
  setting; the tenure layer the guild zones sit under
  ([cooperative-slate](./cooperative-slate.md) § *How territory is held*).

**Out of scope (content / game-loops — separate builds that *consume* this):**
- The actual Subjects and skill-trees (a Botany graph, a Combat graph) —
  authored content.
- The specific professions and their ladders (merchant, scholar) —
  illustrations here, not spec.
- The play loops themselves (a combat system, a trade UI).
- The worked examples (Wren) — pedagogy, not requirements.
- All numeric tuning (estimator calibration, NPC-floor mediocrity,
  time-compression) — deferred to a running game.

## The thesis — gamify the *metacognition* of learning, not the content

The character does the rote hours (the sparring, the foraging, the
experimenting). But every decision *good learning actually requires*, the
**player** makes: **what** to develop and in what order; **when** to
consolidate vs. push on; **how** to spend limited practice energy
(the shipped [Reserve](../../subsystems/reserve.md) substrate gates it —
you can't practice infinitely); **which** difficulty to seek; **when**
something is learned enough. That executive layer — the *coaching* of a
learner — is the gameplay, and it's the part that genuinely transfers:
**learning-how-to-learn.** Play it well and you've internalized spacing,
desirable difficulty, prerequisite structure, and consolidation without
noticing.

This is why the no-academic-intent pilot is fine, not a compromise. The
game teaches *method*; real coursework, if it ever arrives, is fuel poured
into a machine the play already runs. The classroom plugs in; it is never
required. (It also defuses the headline edtech risk the motivation lens
names — **overjustification** — because the reward is *capability you
chose to build*, not a carrot dangled for studying.)

## Why "spend EXP on stats" is the anti-pattern

The classic MUD/D&D model (earn fungible XP, spend it bumping numbers)
feels nothing like learning, and the failures are specific — each one a
lever we flip:

| XP-model failure | Reality | The lever it becomes |
|---|---|---|
| **Fungible** — one currency, spend anywhere | competence is domain-locked | non-fungible skill → real specialization |
| **Monotonic** — only goes up, forever | skill plateaus and needs upkeep | (see "capacity, not decay" — we take the *build-crafting* of this without the time-tax) |
| **No topology** — buy rank 5 raw | knowledge is a dependency graph | the **skill tree** falls out for free |
| **Instant** — click, number up | learning resists cramming | time-distributed practice (rides [Activity](../../subsystems/activity.md)) |
| **Frictionless** — always succeeds | learning lives at the edge of failure | difficulty-matched practice (Flow / ZPD) |
| **Decontextualized** — abstract number | skill is situated | learn botany in the garden, not on a sheet |

Honesty and fun point the *same* way here: every realism-fix is also a
better mechanic.

## The build-crafting guarantee

Non-negotiable design constraint: **do not kill build-crafting.** MUDs and
D&D are fun because they give interesting, committal choices about how to
grow — and that fun comes from **opportunity cost + synergy + a legible
plan + identity**, *not* from the numbers being fungible/instant/permanent
(those are incidental, even harmful). The learning model *feeds* all four:

- **Non-fungible domain skill** → specialization with teeth; a botanist
  and a swordsman are different *beings*, not two stat spreads.
- **The dependency graph IS the skill tree** — the beloved build-craft
  object (PoE passive web, FFX sphere grid). Realism hands it to us.
- **Cross-domain synergy** → meaningful combos (botany picks the reagent,
  chemistry the reaction; together a potion neither makes alone) — richer
  than "+10% to two stats." This is the capability slate's *horizontal
  scaling* (power from breadth/combination, never magnitude).

Two disciplines keep the guarantee:

1. **Legible plan, felt proficiency.** The *planning surface* — the tree,
   prerequisites, costs, synergies, tradeoffs — is fully visible and
   theorycraftable (that's the playground). What stays hidden is the
   moment-to-moment proficiency *readout*: no "Botany 47/100." **Competence
   is revealed through performance** — you learn you've improved because the
   lock that beat you last week now clicks open. (The project's
   *no-number-as-authority* / derive-don't-track discipline, as a feel
   principle.)
2. **The real threat is automation, not realism.** What would kill build
   fun is one *correct* way to learn that the game just does for you. So
   every learning-science constraint must surface as a **player choice,
   never an autopilot.** Spacing isn't "the game nags you to review"
   (chore); it's "you allocate a scarce consolidation budget across a
   sprawling build" (puzzle). Same mechanic, reframed from obligation to
   agency.

## Capacity, not decay — the loadout (and never taxing inactivity)

The forgetting curve is the obvious source of upkeep-as-opportunity-cost —
and it's **the wrong lever**, because time-decay punishes people for living
their lives, violating the ratified *never tax absence* rule
([economy-slate](./economy-slate.md) Law 2). So: **no skill ever rots from
the clock.** Log off for a month, return exactly as capable.

The opportunity cost moves to **capacity**, drawn straight from the
science (Ebbinghaus's *other* result, the **savings effect**: relearning a
lapsed skill is far faster than first learning it):

- **What you learn is permanent** — knowledge is yours forever.
- **What's budgeted is *active readiness*** — a finite **loadout** of
  honed skills. Opportunity cost lives in the cap, not the clock.
- **Switching focus has a small, recoverable warm-up** — a dormant skill
  feels rusty for its first few uses, then snaps back. Costs *minutes of
  play*, never *weeks of absence*.

This keeps the entire build-crafting engine (specialization via the cap,
live curation of what's honed) while dropping the time-tax — and the cap
can itself be a long-term progression axis. **The loadout is the new mana
pool; the knowledge graph is the skill tree.** (Loadout-swapping is a
beloved mechanic in its own right — GW skill bar, Elden Ring memory slots.)

## Skills as a content-graph — extensibility is the architecture

Skills are **content, not code.** The engine knows the *primitives* (a
skill, a prerequisite edge, a guild); the *content* (which skills, which
tree) is authored data, hot-loaded — the whole point of the
templates/Hydrator/clone pipeline. Concretely a **typed graph of template
documents**, the shape the argument-map organizer already ships
([forums.md](../../subsystems/forums.md)):

- **Nodes** = skills / disciplines / guilds — authored templates (like
  Topics, Channels, Species), not a TS class per skill. Ship two seed
  guilds; everything else is data added at runtime.
- **Edges** = typed relations: `requires` (prerequisite), `specializes`
  (discipline under a school), `synergizes-with` (the combo links).

The extensibility properties the build *must* have, and how they fall out:

- **Grows without disturbing a running world.** Player competence is keyed
  on the durable `templatePath` (the same Phase-0 discipline renown /
  participation / producer all use), *not* on tree position. So **additive
  evolution is free** — new branches, new specializations, re-parenting —
  and existing learned skills stay valid. Only *destructive* edits (delete
  a learned skill, change a prerequisite under someone) need migration,
  same as every template.
- **Fork.** Clone a template subtree into your own `/home/` scope (full
  write access — see [scoped-authoring-slate](./scoped-authoring-slate.md))
  with [provenance](../../subsystems/provenance.md) tracking who forked
  what. CC by default: anyone may make generics/variants.
- **Canonize.** Promoting a fork into shared play is a **governed merge**
  (the law==code review surface), *not* an engine change. The framework
  stays open; canonization is what's gated.
- **"Brands"** = a node that `derives-from` a parent, inheriting graph
  position + adding a few unique edges and its own identity (provenance
  gives the lineage its founder). Brands fork the *institution*, not the
  *knowledge* (see guilds, below).

## The measurement substrate — Catalog, Transcript, Competence

The content-graph above has a name and a measurement model behind it,
worked out in an earlier pass and folded in here. Three pieces, governed by
the same **derive-don't-track** discipline as renown / participation /
producer:

- **Catalog** — the content-graph *is* the **Catalog**: a faceted,
  reality-seeded field-of-study taxonomy (an ISCED-F spine), each node a
  **Subject**; the finest-grained Subject is a *knowledge component* — a
  **referent, never a quantity.** (A `Catalogue`-of-`Idea`, like
  TopicCatalogue / SoulCatalogue; "Topic" is taken by messaging, hence
  "Subject.") The impersonal, shared-canon map guilds project over.
- **Transcript** — the per-character **evidence ledger**: append-only
  learning-events, a **chronicle realm** (or sibling —
  [chronicle.md](../../subsystems/chronicle.md)), reusing the provenance
  split wholesale: a **`deed`** is a world demonstration (you *did* the
  thing), a **`claim`** is a classroom/LMS attestation (you *studied* it).
  The Transcript is *what happened* — never the score.
- **Competence** — **derived on read** over (Subject × Transcript), never
  stored: a BKT/IRT-style estimator turns the evidence into a current
  estimate. This is the mechanism *behind* "felt proficiency, no stat
  readout" — the scalar exists internally (with a referent: competence *in
  a Subject*) but never surfaces as an authoritative number. The honesty
  firewall is **"no quantity without a referent,"** not "no numbers":
  instruments and institutions may read honest scalars; the *player* sees
  capability, bands, and revealed performance.

Three properties make this the right substrate for *this* build:

- **Two faucets, one estimator.** Competence is fed by **passive
  world-use** (you got better by *doing* — the no-classroom path) ⊕
  **active deliberate study** (the academy / LMS — the optional fuel),
  routed into **one source-agnostic estimator.** The faucets map the
  procedural-by-doing vs. conceptual-by-study split (Bloom / Kolb); the
  academy faucet *is* the learning-platform sensor bridge (below).
- **One honesty rule, three transfer profiles.** What a learning-event
  *transfers to* depends on its kind: **facts** (knowledge — broadly
  transferable), **invented-structure** (a game's own lawful systems —
  transferable within the fiction), **motor-shell** (the physical skin —
  least transferable). One rule (honest evidence → honest estimate), three
  shapes of generalization.
- **The physical axis is `performance = technique × body`.** For embodied
  skill the Competence estimate (technique) multiplies the shipped body
  model — Fitts's-law execution × the
  [encumbrance](../../subsystems/encumbrance.md) / vitals body state — which
  is the capability slate's **conditioning** channel as the `body` term and
  **skill** as the `technique` term. **Knowing → doing** then rides the
  existing `confers()` + affordance-attribution seam: crossing a competence
  threshold **confers the verbs** (the way membership and augments do) —
  exactly *advancement as the visible shadow of measured competence.* The
  player never sees the estimate; they see the door open.

So the loadout and the felt-proficiency discipline aren't free-floating:
they read off this substrate. The **loadout** is *which Subjects' competence
you're currently expressing*; the **savings effect** is *relearning
re-derives fast because the Transcript evidence never left.*

### Credit assignment — decomposing a composite act

The load-bearing input-integrity question: one messy in-world act (a deal,
a fight, a synthesis) exercises *several* Subjects at once, at *different*
difficulties, with **localized outcomes** — Wren's failed deal *succeeded*
at Appraisal, *failed* at Logistics and Market-reading; a single global
"failure" would wrongly tank the Appraisal she nailed. So the act must
decompose into per-Subject `{subject, difficulty, outcome}` triples. (This
is the **Q-matrix** problem from cognitive diagnostic models crossed with
RL credit-assignment — known prior art, not novel.)

The move that dissolves it: **the decomposition isn't inferred after the
fact — it's how the action was built.** Model each action as a composition
of Subject-tagged **sub-checks** — a "skill signature" authored onto the
verb / recipe / deal-structure (an authored Q-matrix). The engine *already*
runs those sub-checks to resolve the action; the Transcript just records
each as its own per-Subject row. Credit assignment becomes an **authoring
discipline** (model the action as its component competence-checks), nearly
free because you already had to author the outcome. **The same signature also
carries a *disposition-valence*** (a lie is +Deceitful/−Honest, a generous tip
+Generous/−Greedy) — because **traits are competence-for-dispositions**: the
identical derive-from-a-behavior-ledger architecture, applied to character
instead of skill. One signature, two outputs (skill-Subjects + dispositions).
See [npc-behavior-slate](./npc-behavior-slate.md) § *Traits*.

Two properties make it anti-gameable:

- **Difficulty is a world-measurement, not a tag.** The logistics
  difficulty *is* the actual route (length, hazard, perishability clock);
  the appraisal difficulty *is* the lot's ambiguity; the market difficulty
  *is* the live competition. You can't farm a hard attempt by relabeling —
  to get hard evidence you must do a hard thing in a hard world (the same
  **endogenous difficulty** that gives non-combat professions their ladder).
- **The graph propagates evidence, and information-weighting kills grind
  for free.** Evidence flows along `requires` / `synergizes` (a Bayesian
  net over the KC graph — knowledge-space theory): a composite act credits
  the leaves, the integrative Subject, and weakly the prerequisites. And
  because only **near-edge** evidence moves θ (a trivial success or a
  hopeless flop is unsurprising → ~zero update), grinding easy checks and
  no-effort flopping both do nothing — desirable difficulty enforced by the
  math, not a rule.

Residual hard parts: the **authoring burden** (every action needs a
signature — marginal, but community-authored actions need a review gate, or
someone tags a trivial action as Subject-heavy to build a leveling-mill);
**learned signatures** (data-driven Q-matrix refinement — deferred);
cross-Subject difficulty **calibration**; and **novel acts** (untagged
creative play degrades *gracefully* — uncredited, never miscredited).

### θ is readable — treat it as a spoiler, not a secret

Something must read θ (verbs gate on it, the guild exam reads it,
instruments read it), and once readable it is effectively public short of
crypto-grade measures that would also violate the project's
*transparent-by-default* pillar. So don't hide it — **gate it like a
spoiler.** Default presentation is capability and bands; a player may opt
into a raw analysis view. Crucially, **reading θ confers no shortcut** — θ
still only moves on real informative practice, so knowing it buys only
*optimization efficiency* (target your edge, theorycraft the build), which
in this system means *practicing smarter* — the behavior we want. The cost
of living in the numbers is therefore purely **reputational / cultural**
(the spreadsheet-open vibe), priced by the **social substrate**
(regard / renown), never by the engine — *conduct → reputation*. Keep the
diegetic layer straight: legitimate in-world reads (a guild rank exam, an
instrument self-assessment) are **earned, not spoilers**; the spoiler is
pulling your own raw latent θ into a spreadsheet outside the fiction. This
dissolves the opacity dial — bands by default for everyone, raw θ for
whoever breaks the fiction, priced by the room.

## Guilds — institutions *over* the taxonomy, not the taxonomy itself

The old MUD fused two things; split them and the guild snaps into focus in
a model where you learn by doing:

- **The skill taxonomy is the map** — impersonal, the "physics," the
  shared canon of what swordsmanship or botany *is*.
- **A guild is an institution that claims a region of it** — providing
  **access, sequencing, instruction, and a credential**. Its relationship
  to the taxonomy: a guild is a **curated projection over a subgraph**.

So a guild's identity (beyond membership) is the bundle: the **venue**
(dojo/lab/range — a place in the world where practice is safe, sequenced,
accelerated), the **mentors** (NPCs + seniors who keep you at the right
difficulty — ZPD institutionalized), the **credential** (rank others
recognize — ties to [belief](../../subsystems/belief.md) /
[renown](../../subsystems/renown.md)), and the **culture / special member
mechanics** (perks, obligations, politics). You *do* "train at a guild" —
"train" just means *afforded, instructed practice in its venue*, not
buying ranks from an NPC. Mechanically, **guild membership is an affordance
source** (like an augment — see
[augmentation](../../subsystems/augmentation.md) /
[command-routing § affordances](../../subsystems/command-routing.md)): it
grants *access* and *unlocks verbs*, never bumps a number.

- **Brands / branches.** Two branches of a fighters' guild teach the same
  canonical subgraph but differ in venue, pedagogy, prestige, culture,
  perks. Knowledge stays unified; *institutions compete*.
- **Corporate-sponsored branches.** The under-used corp notion gets a job:
  a corporation **charters/funds** an institution ("the Acme Combat
  Academy").
- **Open fork (decide before building):** is all skill-knowledge **open
  canon** (guilds compete only on *how well* they teach), or can
  institutions own **proprietary/secret** techniques (membership gates
  *what you can learn at all*)? Open is cleaner "physics"; proprietary
  gives guilds + corps real IP to hoard and ties into the
  [spoiler](../deferred-rpg/spoiler-slate.md) thread, at the cost of
  fragmenting the shared map. *Open.*

## Declared focus — deliberate practice, the honest heir to the guild-unlock

The classic MUD guild *gated* which skills you could train (a hard
can/can't). This model keeps "your guild means something" and drops the
gate: **joining a guild that claims a region of the map declares that region
your *focus*, and focus makes those disciplines learn *faster* — a gradient,
not a gate.** You can learn anything; focus just bends the curve toward your
craft. It's the positive expression of the *Open* resolution above — guilds
don't hoard knowledge, they *accelerate* their region.

**What "learn faster" honestly means.** Not XP (there is none), not a
competence bump (derived-on-read, never stored). Declaring a focus turns
those disciplines into **deliberate practice** — a higher learning-rate —
while everything else stays *incidental practice*. Real pedagogy, not a
fudge: **ZPD (difficulty-gated learning, already in the estimator) + focused
attention = the textbook definition of deliberate practice.** The two pieces
we already have compose into the actual phenomenon that builds expertise.

**The honest engine — the focus-tagged Transcript.** Each `TranscriptEntry`
carries a **frozen focus-context** stamped at append: which focus you held,
at what commitment-depth, *when you did the act*. Competence-on-read applies
a **tunable deliberate-practice modulation** to it (a focused-at-ZPD entry
moves the Bayesian estimate more than an incidental one). Three properties
keep it honest:

- **Immutable & prospective** — the tag reflects the focus held *at the
  moment of the act*, frozen forever. Drop the guild later and past
  deliberate reps stay deliberate; join later and only *future* acts tag.
  **You can never retroactively re-focus your history** — the anti-gaming
  spine.
- **Frozen facts, tunable formula** — the entry stores the *facts* (focus +
  commitment) frozen; how much deliberate practice *helps* is a tunable
  read-time parameter (like the other BKT dials). Never fabricates a fact.
- **Never a number** — the modulation happens *inside* the derive, before
  banding. Focus surfaces only as reaching the next band sooner — felt as
  faster band-progress + the
  [odometer](../deferred-rpg/odometer-slate.md) concentrating in your focus
  area, never as "1.7×."

**Why it doesn't break the firewall.** Competence stays a pure function of
the Transcript — just a *richer* Transcript recording a true property of
each act. Two players with "the same acts" don't have identical Transcripts
(their focus-tags differ), and that difference reflects a real difference in
*how they practiced*. No injected evidence, no stored bump; every competence
point still traces to a real graded act.

**The one slippery point — and its defense.** "Deliberateness" is
operationalized as "held a declared focus" — a *proxy* for cognitive
engagement (unmeasurable directly). Defended by: the declaration has real
costs (admission / dues / opportunity-cost); the bonus **ramps with
sustained commitment** (a momentary flag gains almost nothing); and it only
ever *weights real evidence* (focus can't manufacture a Transcript entry).
The worst you can do is slightly accelerate learning you're genuinely doing
— the intended effect.

**Specialization via depth-scarcity (no artificial budget).** The bonus
**ramps with commitment/rank** — declaring is modest, deepening
(apprentice→master) is more — and depth requires real accumulated evidence
(**time**). So you dabble in many guilds (shallow foci) but master few (deep
foci): specialization emerges from the *time-cost of depth*, not a slot
count. And **focus is a bonus, never a penalty** — un-focused disciplines
learn at the honest incidental baseline, never slowed (capacity-not-decay).
The ramp does **double duty**: it makes depth scarce *and* it defeats
focus-swapping (switching resets the ramp, so per-act swaps gain nothing).

**Deliberate context stacks (the venue/mentors get a mechanical job).**
Declared focus alone is the floor (learn your focus faster *anywhere*).
Practicing in a genuinely deliberate context — the guild's **venue**, a
**mentor** holding you at your ZPD, sanctioned challenges — deepens the
deliberateness and stacks more. So the guild's access-affordances aren't
separate flavor: **using them is how you cash a declared focus into faster
learning.** The focus declaration and the venue/mentors are one loop.

**Per-discipline clamp** — deliberateness is capped per discipline, so two
guilds whose regions overlap on a discipline don't multiply the bonus; you
get that discipline's focus once, capped.

## Three orthogonal social axes — the wall that keeps guild ≠ party

A guild must **not** become a stand-in for a party. Keeping three axes
orthogonal is the mechanism:

- **Guild** — *vertical*, disciplinary, durable. Aligns on **what you can
  do**.
- **Party** — *horizontal*, ephemeral, goal-bound. Its value is
  **complementarity** (fighter + botanist + face). Aligns on a **venture**.
- **Corp / faction / house** — *cross-cutting* loyalty or sponsorship,
  spanning disciplines.

In one word each: you **form** a party, **join** a guild, and **earn**
standing with a corp — corp being a conduct-driven multipolar *standing*,
**not** a membership (see [corpos-slate](./corpos-slate.md)). Form / join /
earn — three different *kinds* of relationship, which is why they can't
collapse into each other.

If guilds are disciplinary verticals and parties *demand* complementarity,
a party **structurally cannot** collapse into a guild. "A party aligned on
some other axis (corpo)" — an all-Acme team drawn from three guilds —
falls right out.

## Every profession is a first-class path

Combat must **not** be the only game in town: a merchant, scholar, or
diplomat must "level up" as fully as a fighter. The model delivers this
**by construction**, because competence is **play-loop-neutral** — one
substrate (Catalog / Transcript / Competence), many *consumer loops*
(combat, trade, research, diplomacy) that each write `deed`s and read θ to
gate their verbs. Nothing in the estimator knows what a sword is; appraisal
and riposte are the same shape.

The deeper point inverts the usual RPG hierarchy. Combat is "the only game"
in most RPGs because its difficulty ladder is *easy to author* (spawn a
tougher monster) — but that's its **weakness**: every tier is hand-built
(the ZPD content-supply problem). The non-combat professions get their
ladder **endogenously**:

- **Merchant** — the market *is* the dungeon (a harder deal, a sharper
  rival, a riskier venture); difficulty scales with the playerbase, free.
- **Scholar** — the unknown is the ladder (identify, analyze, synthesize —
  real Material chemistry).
- **Crafter** — quality and recipe depth (the economy's "quality is a
  verdict").
- **Diplomat** — other minds (persuasion, faction-navigation, coalitions).

So in *this* platform the social / economic / intellectual spines are the
**natural** ones (self-supplying difficulty) and **combat is the neediest**
profession, not the privileged one. And **the guild is each profession's
campaign structure** — what a combat game gets free from a scripted
campaign, a merchant gets from the Merchant's Guild (its venue, mentors,
credential, and ladder of escalating commissions).

## Interlock — professions need each other

The failure mode of profession-neutrality is self-sufficient professions
that share a market but never *need* each other — a lonely crowd, parallel
single-player games on one server. The fix is mostly *already built*:
**specialization-with-teeth IS the interlock engine.** Non-fungible skill +
the bounded loadout + one-character-at-a-time make self-sufficiency
**structurally impossible** — you can't master every profession, and you
can't field a party of your own alts — so interdependence is *forced*, not
exhorted. What remains is content with real cross-profession dependencies
for specialization to bite against: **value chains** (the economy's
gather → craft → trade → use loop), **venture composition** (a party needs a
spread no loadout holds), and **service provision** (recovery often needs
another profession — the wounded fighter's healer, the insolvent merchant's
lender; *your deficit is someone else's livelihood*).

The load-bearing architectural constraint: **interlock is an incentive
gradient, not a hard gate.** Graceful-degradation (the NPC floor — solo and
off-peak play must always work) *forbids* hard interdependence. So the
mechanism is the economy slate's **deliberately-mediocre NPC floor**: you
*always can* fall back to a slow, costly NPC service, but a human is
*strictly better*. Interlock = preference, not prison; population-elastic
(NPCs carry the cold-start, recede as players fill in). The glue that makes
it a society rather than a supply chain: the bounded competence ceiling
makes specialists *worth seeking*, reputation makes interlock *sticky and
personal* (you want *your* trusted healer — the relatedness payoff), and
guilds **broker** it (matchmaking / market-making). The content and tuning —
the specific chains, the NPC-floor mediocrity knob, the anti-clustering
balance — defer to a running game.

## Stakes — time is the only currency

Once you remove every permanent loss (no skill decay, no pay-to-win, no
confiscation, respect-the-player's-time), **time is the only currency
left** to negotiate with — the whole consequence model is "how do you make
a player spend time recovering, fairly, without taxing absence or
learning." The inviolable line: **consequence degrades transient state —
body, capital, standing, position — never learned competence.** You don't
get *worse at your craft* because you lost; you get set back in the
*world* and climb out.

It is one engine with two halves, both **profession-neutral, themed per
profession** (the same **[Reserve](../../subsystems/reserve.md)**-shaped
axis, differently skinned):

- **The deficit** — a setback drops a reserve below full: a fighter's
  wound, a merchant's insolvency, a scholar's discredited claim. (Death
  itself becomes "revive to a *degraded* reserve you climb back," not
  revive-to-100% — which is what made combat death stakeless.)
- **The recovery cost** — closing the deficit takes in-world time, made a
  **decision, not a wait**: grind safe, take a guild wage-job, or *lean on
  your honed Subjects* (Wren appraises others' goods for a fee while she
  rebuilds). Recovery is *played*, and competence pays even while digging
  out. Coupling it to a strategic spend (the way metabolism burns reserves
  to rebuild others) is the anti-chore guard against survival-MMO downtime.

Two guards keep it honest: **opt-in risk, never ambient** (the time-sink
fires because you *reached for something* and it went bad — never because
the clock ran; no time is taken from someone who didn't take a risk), and
**the loss is the teacher** — Wren's failed deal wrote `deed`s in Logistics
and Market-reading; she ended **poorer and better** (the two ledgers live:
solvency down, competence up — leveling *from* the failure, zero combat).

## Permanence, mortality, and multiplay

The flagship is an **endless** game, so it carries **no permanent scars** —
the legacy-game-sticker problem is permanence on an *immortal* vessel
(legacy board games work because they *end*; an endless one you'd still be
playing on a cluttered board). Everything is eventually recoverable; the
only cost is time.

But permanence and mortality are a **matched pair**: a vessel that can carry
permanent marks is one you'll *discard*. So permanence is **not** a
per-character toggle (two value systems competing in one shared world is
incoherent — mismatched stakes, no straight answer to "does losing
matter"); it is a **world-level distro**, uniform within an instance, set
like the tenure / centralization modules:

- **Flagship (default)** — persistent, fully recoverable, no scars, no end.
- **Roguelike world** — permadeath + permanent modifiers, uniform for
  everyone *there*; a different distro a community adopts. The roguelike
  player gets a different *world*, not a different character-class in
  yours. (Also the proper home for the "just start over when it goes wrong"
  / ascension experience — opt-in via the vessel, never forced on everyone.)

Two multiplay guards, both load-bearing (not taste):

- **One character at a time.** Keeps parties genuinely *social* — you can't
  field a party of your own alts, so cooperation always needs other humans
  (the cross-discipline-party principle). Also clean Sybil-wise: embodied
  as one person at a time.
- **No character-sharing.** A character's reputation / recognition /
  standing must equal *one consistent person's* behavior — the belief /
  renown model and enfranchisement-per-human depend on it.

Consistent with the influence model ([cooperative-slate](./cooperative-slate.md)):
measurement is per-character (multiplaying *dilutes* your standing across
them, your choice), enfranchisement is per-human.

## The endgame — a cap on *expression*, not *accumulation*

There is no "maxed character" in the stat sense, and that's the design
working:

- **Knowledge is permanent and uncapped; the loadout is bounded.** The
  veteran is a **polymath in potential, a specialist in the moment** —
  could do almost anything, re-tools fast (savings effect), fields a slice.
  Accumulation never stops (the long collection game); it never makes you a
  god, because godhood needs everything fielded at once and you can't.
- **The single-skill ceiling is qualitative and bounded — a *constitutional*
  requirement.** "Competence, not power": a master beats a novice reliably
  but not trivially; two masters are peers. This isn't just balance — **the
  polity thesis dies if skill equals unbounded power** (year-5 demigods
  swamp influence-by-contribution and the cooperative becomes a
  gerontocracy-by-force). The ceiling tops out at "excellent and
  recognizable," never "rules everyone by force."

## The lifecycle — learn → master → make/teach/govern (no ascension mechanic)

The native endgame of *this* game isn't "kill the bigger dragon"; it's
**becoming part of the world's institutional fabric** — found a guild,
author a discipline, charter a corp, take a seat, mentor, write the content
newer players train inside. Student → faculty. The metacognition thesis
cashed out at the top: you learned how to learn, so now you *build the
structures*. "Doing everything on offer" turns out to mean *producing the
offerings* — and because the content-graph is player-extensible, the
collection target **never closes** (the community authors faster than any
one player consumes).

This needs **no ascension/NG+ mechanic** — the arc is *emergent* from the
influence model (the three chambers are *dimensions of every member*, so a
character's play/make/fund composition **drifts** over its life):

- A young character is consumer-heavy (actively learning/playing); as it
  stops chasing new content, consumer influence plateaus while **producer**
  influence climbs (producer taps *others* engaging its authored work).
  **Retirement isn't an event; it's the center of gravity shifting from
  play to make.** You lose nothing; it's organic.
- **Two ledgers, two rules.** *Skill is permanent* (respect the time,
  respect the human — never tax absence). *Influence is current* (decays;
  reflects what you contribute now). A returning veteran is exactly as
  capable as the day they left but can't rule on ancient glory — they
  re-earn their voice by showing up. That split prevents gerontocracy
  without punishing learning.
- **Elders stay honest, and contestable.** Producer influence decays in
  real-time and tracks *current* engagement with your work — so an absent
  creator holds influence only as long as their school stays trained-at
  (the still-loved dead rule; the forgotten fade), and a sharper fork can
  *take* the engagement by being better. That's the anti-evergreening
  property: in a CC world you dethrone a master by **making something
  people would rather use**, never by gatekeeping (see the publishing-gate
  thread, [cooperative-slate](./cooperative-slate.md)).
- **Multi-character & NG+.** Per-character influence (consistent with
  renown/consumer) means a *new* character starts fresh — spinning one up
  to earn new consumer influence is a real, dilutive choice, yours to make.
  The honest "NG+" is that **the player** is the carry-forward vehicle
  (your metacognition transfers; character competence doesn't), and
  graduation-as-ascension promotes a character *into* the world's structure
  (guildmaster, officeholder) while you pick up a new protagonist — the
  one-human anchor biting only at the enfranchisement gate, never blocking
  alts for play.

## A worked Catalog slice — Dave's Bar

The first concrete **Catalog** content, and a *better* test of the content-graph
than an abstract "Botany tree" because the Subjects are **heterogeneous** (five
facets, all three channels) and the **roles overlap.** Channels tagged: **skill**
(technique) · **knowledge** (know-what) · **conditioning** (the body adapts).
(Full venue context: [daves-bar-slate](./daves-bar-slate.md).)

- **Bartending (the craft):** *Mixology* (skill — control: technique, balance,
  speed) · *Recipe knowledge* (knowledge — which cocktails, banked via the
  make-it-once-to-learn-it loop) · *Spirits & ingredient lore* (knowledge —
  brands, grades, pairings).
- **Running the bar (commerce/management):** *Inventory management* (skill —
  reading par, anticipating run-outs; ties to leadership) · *Bookkeeping /
  reconciliation* (skill — the till, over/short) · *Appraisal* (skill — judging
  quality/value) · *Salesmanship / upsell* (skill).
- **The social floor (interpersonal):** *Reading people* (skill — mood, trouble)
  · *Persuasion / rapport* (skill — defuse, build regard).
- **Games & recreation:** *Darts* (skill) · *Pool* (skill) · *Cards / dice*
  (skill + knowledge).
- **Physical (conditioning):** *Alcohol tolerance* — **conditioning, not skill**
  (bounded, bidirectional; the body adapts, lay off and it fades) — the cleanest
  example at the bar of why the channels are distinct.

Edges: *Mixology* `requires` basic *Recipe knowledge*; *Appraisal* `synergizes`
*Spirits lore*; *Darts* is a standalone leaf. Out of scope: bouncing (combat),
performance.

**The role-spread is the point** — the same room exercises different professions:
a **bartender** (NPC or hired player) runs mixology + recipe-knowledge +
spirits-lore + inventory + bookkeeping + upsell + reading-people; a **patron**
levels darts / pool / cards / tolerance / persuasion *just by hanging out*
(combat-free leveling — profession-neutrality); a **manager** (Mara) adds
inventory + bookkeeping + leadership; a **merchant** passing through practices
appraisal + negotiation — a *different profession in the same space* (the
interlock). The bar is the whole model in one room. (Subjects sit at different
scopes — mixology/inventory core to the bar, darts/tolerance ancillary flavor
that can follow.)

## Sensing the social Subjects — `regard` is the (inert) primitive

The social Subjects (reading-people, persuasion, salesmanship) raise a real
"what's the *deed*?" question — and the answer is that they ride substrate
that's **already shipped, just dark.** A social act is the same loop as a craft
act (attempt → world-grounded difficulty → resolved outcome → deed), but the
"world" being measured is a **mind**:

- **Reading-people** = an **assessment** — difficulty = how subtle the tell;
  outcome = were you *right* (vs. ground truth).
- **Persuasion / rapport** = an **influence attempt** — difficulty = the target's
  *resistance* (their regard, stubbornness); outcome = did their regard/behavior
  *shift*.
- **Salesmanship** = the same, validated by the sale.

What senses/measures it: **`regard`** — belief.md's per-viewer **signed scalar**
(`RegardApi`, gated arithmetic) — is the measured social-state primitive, **built
but inert** ("consumers deferred"). **The social skills are its first consumer:**
*reading* **perceives** regard (+ the target's behavior-state + recent events)
through the shipped **viewer-aware perception** layer (`PerceptionApi` + the
`Shadow` seam — skill gates how much you see); *persuasion* **writes** regard
(success = the shift). The *check* (competence vs. resistance) reuses the crafting
**skill-seam**; the *skill measurement* is this build's Transcript/Competence.

Status: social *state* (regard), *perception*, *effect* (regard write) are
**shipped**; the *check* + *skill measurement* are **designed** (crafting seam +
this build); the **social verbs** (`read` / `persuade`) are thin new content
riding all of it. A richer **transient mood** model is *enrichment, not
prerequisite* (reading works on regard + behavior + events without it).

**Targets who are players:** against an **NPC** the game has ground truth → a
social act resolves cleanly → a deed. Against a **player** you can't force an
outcome (their free choice), so it's **enhanced perception** + **better
affordances** + a *softer/opt-in* deed (credited when their later behavior
validates the read, or they actually do the pitched thing) — never compulsion.

## Buildable now — a first vertical slice

The substrate is largely shipped: [Reserve](../../subsystems/reserve.md)
(practice energy), [Activity](../../subsystems/activity.md) (a practice
session = sustained engagement), affordance attribution (a skill grants
verbs), [Persona](../../subsystems/belief.md) (identity), templatePath
keying (durable progress), zones/access (the authoring/ownership stack).

A first slice that proves the feel before the content sprawls:

- **A small Catalog**: a handful of Subjects from the **Dave's Bar slice**
  above (e.g. Mixology, Recipe-knowledge, Darts, Alcohol-tolerance — a
  heterogeneous mix across facets/channels), authored as graph nodes with
  `requires` / `specializes` / `synergizes` edges.
- **Situated practice → Transcript**: competence grows as a side effect of
  *doing the thing* in context (mixing a drink, throwing darts) — each
  demonstration a `deed` on the per-character Transcript — gated by the
  Reserve and run through Activity.
- **A Competence estimator**: derive-on-read over (Subject × Transcript),
  a simple BKT to start; surfaced only as capability and bands.
- **The loadout**: a small active-readiness cap over the estimated
  Subjects; the rusty-then-snaps-back warm-up on dormant skills (the
  Transcript evidence never leaves, so re-derivation is fast).
- **Competence revealed through performance** — no stat readout; the
  legible planning tree + felt proficiency.
- A seed guild (a Bartenders' Guild over the craft Subjects: venue + mentor +
  credential + membership-as-affordance), to exercise the institution model.

## Open problems

- **The time-compression dial** — how much faster than life; wrong in
  either direction breaks the feel. (Deferred to a running game, like
  economy macro-balance.)
- **ZPD difficulty supply** — difficulty-matched practice needs the world
  to *supply* appropriately-hard challenges on demand: a content/encounter
  load.
- **Open-canon vs. proprietary knowledge** — the guild-identity fork above.
- **Merge & balance of player-authored trees** — forking is cheap;
  reconciling divergent schools and keeping sprawling community trees from
  trivially-broken combos are hard (the argument-map claim-dedup / economy
  macro-balance class), deferred to a running game + a governing body.
- **The learning-platform sensor bridge** — when a student masters a
  chapter, *what exactly* happens to the character? Which engagement
  primitive feeds which channel (conditioning / skill / knowledge), and is
  that mapping authored per-subject or derived? The seam to the education
  vertical; the bridge currently lives only as prose in vision.md.
- **The competence estimator — choice + tuning.** The substrate and the
  credit-assignment model (skill-signatures + world-grounded difficulty +
  graph-propagation) are settled above; the estimator *internals* are open:
  BKT vs. IRT vs. DKT, cold-start, cross-Subject difficulty calibration,
  and enforcing the "no quantity without a referent" firewall. Plus the
  credit-assignment residuals: the **skill-signature review gate**
  (anti-leveling-mill curation of community-authored actions) and
  **learned signatures** (data-driven Q-matrix refinement). Deferred to a
  running game (numbers want real evidence to tune against).
- **Overjustification guard** — keep verifying the reward is *chosen
  capability*, not a carrot, especially once real coursework is the signal
  (the motivation lens's standing warning).
