# Quest-modeling slate (working doc)

> **Status:** foundational design (first pass, 2026-06-29). A *model*,
> not a build. Captures how we model narrative — the abstraction a
> content author casts, the runtime that drives it, and the library of
> genres. Validated by hand against the **Eternal University** arc
> (onboarding + "An Honest Count"); deliberately **not** scheduled.
> **Kind:** the eventual generalization of the objective/trace system
> the [onboarding slate](./onboarding-slate.md) defers as "instance #1."
> Its own caution governs here: **resist building the framework off
> N=1.** This slate earns a build by surviving contact with *several*
> real authored instances — which is what §12 is for.
> **Retire when:** promoted to formal requirements (the template
> primitive + the detection seam + one cast genre), or folded into the
> advancement/objective build that consumes it.

This slate owns the **narrative model**: what a quest *is*, why it takes
the shape it does, and what an author actually builds. It is engine-
and content-spanning — the template primitive is engine; the genre
library and the cast bindings are content.

## Load-bearing decisions (the spine)

1. **The engine serves narrative, not the reverse.** Quests are an
   abstraction of *narrative* — not of advancement, combat, or any one
   consumer. The novel problem Aristotle never faced is that ours are
   **plural, interactive, and shared.**

2. **The world must not *fork* — not "must not change."** Setting is
   shared and stable by construction. Two escape valves are legitimate:
   the per-viewer *projection* changes constantly (that's the point),
   and the world may change *for everyone at once* (collective/seasonal —
   deferred to the legislature, §"NOT covered"). What's forbidden is the
   per-player irreversible mutation of shared geometry. Instancing is
   ruled out **on values** (it breaks co-presence), not just cost.

3. **Change lives on the player-side ledgers.** The hero changes; the
   change is recorded *on the hero*. We already built the change-
   substrate — [chronicle](../../subsystems/chronicle.md),
   [belief](../../subsystems/belief.md) (regard/recognition),
   [renown](../../subsystems/renown.md),
   [transcript](../../subsystems/advancement.md),
   [traits](../../subsystems/trait.md). A quest **choreographs writes to
   these.** It needs no new state of its own beyond a progress cursor.

4. **Plot is the only troubled building block.** Of setting / character
   / plot / style, three come through the plural-shared constraint
   nearly free: **setting shares**, **character splits** (the PC
   privatizes; the NPC is the membrane — shared in substance, personal
   in relationship), **style distributes** (authored ⊕ systematized ⊕
   per-viewer). Only **plot privatizes**, because Aristotle's single
   closed causal arc cannot survive many heroes over one frozen world.
   Our whole problem is *how to privatize plot without privatizing
   setting.*

5. **A quest is a lens that assigns causality to ambient change.**
   Forster: the world only ever emits *story* ("the king died and the
   queen died") — the same sequence for everyone, no causal memory. The
   *plot* — the "of grief" — lives in the quest, privately. Two players
   witness the same event; one's lens makes it a beat, the other's
   doesn't see it. Meaning is per-viewer, one level up from belief.

6. **Plot derives on read over the chronicle.** A *simulated* story
   inverts Aristotle (who ranked plot above character): the model
   generates the incidents, so plot is read off the trail, not arranged
   in advance. Same house style as competence-over-transcript. The
   progress-doc is the transient cursor; the **chronicle is the durable
   record** of having lived the arc.

7. **Goal-set, not graph — the medium decides.** Our prose *expresses a
   high-fidelity model*, so the sim is the pathfinder; a graph would lay
   authored topology over a simulation already generating its own. The
   higher the fidelity, the less topology you author — the author
   declares **targets, not paths.** The graph survives only where the
   model is *silent* (micro-dialogue with no physical pathway —
   [npc-dialogue](../../subsystems/npc-dialogue.md)).

8. **Templates are the authoring surface; the goal-set is the IR.** A
   fixed library of narrative genres, each a *parametric goal-set*. The
   author **casts** typed slots; the template carries the structure and
   the conditions. Compiles down to the goal-set primitive — nothing in
   §5–§7 is wasted.

See also:

- [onboarding-slate.md](./onboarding-slate.md) — the objective/trace
  system this generalizes ("not a quest engine, instance #1"); Dr. Limen
  as the diegetic director; the station-keeper flags as beats.
- [eternal-university-narrative-slate.md](./eternal-university-narrative-slate.md)
  — "An Honest Count," the validation corpus (§12); §17.G immsim access,
  §17.F no-consumption, "understanding is the lock."
- [advancement-slate.md](./advancement-slate.md) /
  [advancement.md](../../subsystems/advancement.md) — Discipline /
  Transcript / `bandFor`; the forensic win mints credit at the milestone.
- [behavior.md](../../subsystems/behavior.md) /
  [activity.md](../../subsystems/activity.md) — brains as policy modules,
  `EngagedMixin` slots; the substrate the multi-party hold (§9) extends.
- [forums.md](../../subsystems/forums.md) — the argument-map "neutral
  store + interpretive lens" precedent the quest-as-lens (§5) mirrors;
  the party deduction board's likely home.
- [mql.md](../../subsystems/mql.md) /
  [mql-subscription.md](../../subsystems/mql-subscription.md) — the
  detection seam (§6): result-set tests, subscribed.

---

## 1. The locus of change (the resolution to the paradox)

Every narratable delta maps to a ledger we already keep. "Quest type" is
a misnomer — there are **delta dimensions**, one per ledger:

| Dimension | Ledger | Genres that live there |
|---|---|---|
| Epistemic | belief | mystery, investigation, lore, scouting |
| Relational | regard / recognition / contacts | favor, courtship, reconciliation, vendetta |
| Material | inventory / economy / crafting | fetch, delivery, heist, provision |
| Competence | transcript | apprenticeship, training, mastery trial |
| Standing | renown / influence | reputation, fame, rank, infamy |
| Dispositional | traits | dilemma, corruption, redemption |
| Access | location / access | unlock, initiation, entry |
| Embodied | vitals / body | affliction, cure, survival, transformation |
| *World* | *(collective channel)* | *deferred — the legislature authors these* |

**A quest is a vector across these; the "type" is its dominant
component.** Boundaries are fuzzy because vectors blend ("rescue the
merchant" = access ⊕ material ⊕ relational ⊕ standing). This is the
truth, not a leak in the taxonomy.

**Completeness argument.** If the ledger set is complete, "predicate
over the ledgers" can express any achievable delta; so a goal-set of
such predicates can express any narrative. The universality of the
authoring primitive is *inherited* from the completeness of the change-
substrate. A pure Mystery (belief only, world untouched) is the cleanest
case; a Dilemma is the **gardener** case (you can't force a trait — you
stage the choice and the ledger records it).

## 2. The beat — and how a condition is detected

A quest is a **partially-ordered set of beats**. Each beat is a triple:

- **target-delta** — a *condition* (below), satisfied when the beat lands.
- **gate** — the precondition that makes the beat live.
- **frame** — the prose + dramatic intent; the part the roleplayer
  experiences.

The author writes **conditions and prose**, never the pathway — the sim
supplies pathways. A beat names a **target, reached by any route the
systems afford** (the §17.G many-pathways discipline).

**A condition is not an MQL query.** MQL returns a *result set*, not a
boolean. A condition is built from two honest detection modes:

- **Standing state** — a *test over* an MQL result set (empty / count ≥ N
  / aggregate past a threshold), using the emptiness-as-falsiness
  convention, registered as a **live subscription** so it fires
  reactively. ("Regard with X ≥ 50"; "belief holds the killer's
  identity.")
- **A happening** — a *pattern match on an event stream* (the `*_events`
  collections via `EventApi`, persist-then-fire). ("Struck the first
  blow"; "a deed of category C recorded.")

MQL is an *ingredient* of the first mode, not the predicate itself. Both
modes live **inside the template**, written by template-authors; the
content author never touches them.

**Beat granularity is the milestone, not the footstep** (the onboarding
slate's rule: Limen knows your milestones, not your position). Conditions
read **records of your dealings, never surveillance of your person** —
the privacy line is a real constraint on what a beat may sense.

## 3. Serving all three player modes (MDA)

The three engagement modes — minmaxer (mechanics), roleplayer
(aesthetics), the middle (dynamics) — are not three populations.
**Everyone optimizes; the modes are different objective functions over
one sim.** The goal-set serves all three *because it fixes the WHAT and
delegates the HOW:*

- the **minmaxer optimizes** the pathway (a solution space to solve),
- the **roleplayer performs** it (a deliberately in-character route),
- the **dynamics player responds** to it (the emergent runtime).

A graph closes the pathway and serves none of them. The minmaxer who
b-lines still **deposits a chronicle trail** — narrative is *derived,
never demanded.*

**Legibility is a per-layer tuning knob.** How sharp you make a layer's
gradient decides which mode it courts; the competence **bands-not-
numbers** firewall is, among other things, a deliberate anti-minmax fuzz.
Set the gradient per subsystem. And put **optimization texture at every
scale, none mandatory** — high-fidelity sim gives this for free; the
goal-set lets the player pick their grain.

**The per-viewer plot-lens is also the mode-coexistence mechanism:**
privatized meaning is privatized tempo, so two players at different
tempos share a room over the same ambient events without trampling each
other. The residue is **direct shared scenes** (§9).

## 4. The diegetic director + the multi-party hold *(designed; deferred)*

> None of the three EU validation cases (§12) needs this — onboarding is
> a 1:1 guide, the mystery and sealed room are solo/party. The multi-
> party hold is the **runtime for *hosted* scenes** (an NPC brokering
> several players), forward-looking, and a candidate to spin into its own
> *mediated-scene* slate. Captured here because it's where the model and
> the NPC stack meet.

**Make the director diegetic.** The drama-manager (the thing that paces a
goal-set toward beats over a sim) should, wherever the fiction affords a
character, **speak through that character** rather than from nowhere. A
hand with a face dissolves the railroading problem: pacing pressure
that's *in-world* is accepted as character, not felt as a system tax.
Dr. Limen is the shipped precedent (§12).

**The hold is asymmetric.** The NPC **commits** an `EngagedMixin` slot
(this is what it's doing); participants **attach loosely** (a tracked
thread, not a lock) and remain free agents. The governing rule: **we
schedule the NPC's attention, never the players' freedom.**

**An attention economy** drives it. Each thread carries a **demand**
score — rising from direct address, escalation, and neglect; falling when
attended; **log-saturated per source** (the renown-reception curve) so no
one monopolizes by spamming. The arbiter picks the max-demand thread each
tick, with an **anti-starvation floor** (fairness *is* characterful — a
good bartender checks on the quiet patron).

**No locks — ever.** A lock is a player-held denial-of-service primitive.
Protection of a deep beat is a **director judgment** (defer-in-character),
bounded by the starvation floor — a graded do-not-disturb, never a door.
The stable equilibrium is **two-sided non-monopoly**: players demand but
never own; the NPC allocates but never abandons.

**Three address modes:** `addressOne` (per-viewer projection),
`addressRoom` (shared frame), and **`broker`** (binds two threads — the
**climax operator** of a mediated scene). Split **mechanism from policy**:
the `MediatedScene` hold lives in `lib/npc/` (substrate, beside
`DialogueConversation`); the **mediation brain** lives in
`lib/behavior/` (hot-swappable policy). The engineering frontier is a
**multi-party `SustainedEngagement`** — today's dialogue hold is 1:1.

## 5. The choice function — utility, not a tree

The director's per-tick decision is a **utility scorer over candidate
moves, not a decision tree.** "Pursue a beat / broker / defer / tend bar"
are not branches — they are **candidates in one comparison.** A tree
hardcodes situation→action (the authored-topology trap again); a scorer
lets a taciturn NPC score "keep wiping the bar" over "broker" and be
*correct* — personality for free.

Score = weighted sum of legible terms: **demand** (reactive),
**beat-pursuit** (proactive — the dramaturgy), **tempo**, **character-
fit**, **fairness**, minus **interruption-cost**. Two terms carry the
weight:

- **The brain is a gardener, not a driver.** It cannot *make* a delta
  happen — beat-pursuit scores a move by whether it *raises the
  probability* of the delta. Non-coercive; agency stays with players;
  robust to unmet beats (they expire, the scene degrades to tending — a
  goal-set shrugs where a graph stalls).
- **Pacing is one `tension` scalar + a refractory period.** It rises
  toward beats/conflict, falls after a broker climax; the tempo term
  reads it (build when low, breathe after a peak) → an emergent sawtooth
  arc, per-scene, with no authored act-structure. This is the anti-
  shapelessness keystone.

**The weights come from the NPC's [trait](../../subsystems/trait.md)
bands.** One function; every NPC behaves distinctly because gregarious
lifts `broker`, patient lifts `interruption-cost`, regard tilts
`addressOne`. **You author a character; the behavior derives** — exactly
parallel to plot-over-chronicle. One scorer, three modes served.

## 6. Templates — what the content author builds

A **template is a parametric goal-set** with four parts:

1. **A fixed beat-structure** — the genre skeleton, engine-authored,
   guaranteed coherent.
2. **Typed slots (roles)** — the variables: «captive»:Character,
   «prison»:Location, «secret»:Fact, «reward»:Quantity, with constraints.
3. **Conditions parametric over the slots** — each beat's detection (§2),
   written blind to the eventual content. *Where the MQL/event machinery
   lives.*
4. **A frame** — genre, tone, default prose, the `tension` shape.

This is the object-`Template` pattern lifted to narrative; **casting =
binding typed slots to authored Stuff**, the Hydrator's job applied to
roles. The CMS save-gate **type-checks the cast** (as it already
validates brain-paths and dialogue trees). Casting a Rescue:

> «captive»=Mrs. Hale · «captor»=Veshko enforcers · «prison»=the Goodkin
> warehouse basement · «informant»=Dave · «reward»=50cr + Hale regard.

**Two authoring tiers.** *Template-authors* (few, expert, gated) write
structures + conditions — MQL and event-patterns. *Content-authors* (the
bulk) **cast** — typed, validated binding, no queries. Remixability
survives as binding flexibility, **template composition** (nest one in a
beat), and expert template-forking down to the raw goal-set.

## 7. The library — the genre set

The set is **finite (bounded by the ledgers) but large.** Five families
(the delta-clusters); each template = *dominant delta + obstacle-type +
resolution-shape* (the academic ancestor is **Propp**: fixed functions,
castable roles; the spiritual cousin is Levine's "narrative Lego" —
recombinant units, here grounded in the ledgers). ~19 primitives:

- **Knowledge** *(belief)* — Mystery · Lesson · Exploration
- **Bond** *(regard)* — Favor · Courtship · Reconciliation · Vendetta
- **Property** *(inventory)* — Fetch · Delivery · Heist · Provision
- **Conflict** *(vitals/renown)* — Hunt · Defense · Duel · Endurance
- **Self** *(traits/access/body)* — Dilemma · Initiation · Cure ·
  Transformation

**Compounds** nest primitives — the breadth without new engine shapes:
**Rescue** = Hunt ⊕ Delivery ⊕ Favor · **Gauntlet** = escalating
sub-quest sequence · **Bargain** = Courtship→Delivery terms · **Escape**
= Rescue inverted. The **primitive/compound line is itself fuzzy** (Heist
is arguably Exploration ⊕ Defense-beaten ⊕ Delivery) — the vector-not-
type truth one level up. Curation picks the ~15–20 that earn a first-
class browser slot; composition covers the tail.

**A quest is a sandbox with intentions.** Beat-density is a continuous
dial: zero beats = a standing systemic scene (a tended bar — *not a
quest*, and the model correctly declines to call it one); a few = a
framed encounter; many tight = an authored mystery. The model's ability
to say "this isn't a quest, here's a standing scene + negative space
instead" is a feature — a taxonomy that classifies everything means
nothing.

## 8. Validation against the Eternal University arc

Three independently-authored experiences, mapped to the model:

**Onboarding = Initiation** (delta: access/membership). The teaching is
*not* the beats — *"gate on tasks, never lessons"*; lessons (signs,
Limen, learn-by-doing) are the **ambient layer**. The **beats are the
station-keeper flags** (`enrolled` / `implantDemo` / `keyed` →
`onboarded`), *written by the services, read by the director via
`EventApi` subscription* — beat-as-subscribed-state-test, in the slate's
own words. **Dr. Limen is the diegetic director** (§4), model-backed with
"load-bearing facts injected from real state, never hallucinated" (the
frame-prose / real-condition split). Climax: **author your room.**

**"An Honest Count" / first forensic win = Mystery** (delta: epistemic;
world never forks). Beats: *something's wrong → reach the body → read it
→ learn-then-apply the rule → commit the finding.* The milestone gate is
**conclusion-committed** — fires on *stating* the connection ("not 6 a.m.,
not here"), not on holding evidence = the deduce-beat as an event-match on
a committed hypothesis, **checked against real computed state** (the
engine actually runs algor mortis via `Thermal` on `Creature`). Credit is
**content-authored at the milestone** (`ActSignature{forensics}` →
`TranscriptEntry`); *"no engine watches your math"* = the gardener
principle, stated better than we had it.

**The sealed room = Access + comprehension** — the case that bends the
model productively. **Two gates:** a physical tutorial-lock (*"author the
properties, the routes fall out"* — sim-as-pathfinder confirmed) and the
real **comprehension gate** (*"understanding is the lock, not the door"* —
**knowledge-gated, not visit-gated**). It forces three refinements (§9).
It also nails the shared-world rule: an **authored-once setpiece** under
§17.F no-consumption — the room is shared and immutable, the
*comprehension* is per-player.

**#3 reconcile (uncarved).** No sheet exists; the phrase is only a
forward-reference. Yet the **composition contract pins its function
before its content**: it is *whatever deposits the demography-context
belief that the sealed room reads.* The model tells you what the missing
piece must *do* before anyone draws what it *is* — the goal-set substrate
doing real work. (Likely a Bond/Reconciliation instance, the social-layer
mirror of the forensic win — read a person where #1 read a body — and the
first real consumer of the §4 hold.)

## 9. Refinements the real content forced

The model survives contact; where it bent is the durable learning:

1. **Lessons are ambient unless load-bearing.** Onboarding's lessons are
   ungated nudges; the forensic win's cooling-rule lesson *is* a gated
   beat — because fair-play demands the rule taught before applied. A
   Lesson is a beat iff the teaching gates a delta.
2. **Beats are milestone-grain, written-by-services, read-by-the-
   director.** Coarse flags, not footsteps; the subscription is the seam.
3. **Epistemic scope is three-tier:** personal belief · **party
   deduction board** (a new scope — collaborative, party-scoped, blank
   per party) · shared-immutable scene.
4. **Composition is via the shared ledger, never scripting.** One
   experience writes belief; another reads it; they interlock with zero
   direct coupling. A quest's *function* is determined by its ledger
   contract even when uncarved.
5. **"Understanding is the lock" is the through-line.** Across all three:
   gate on tasks not lessons, on the stated finding not the held
   evidence, on comprehension not entry. The framework's whole job is to
   let an author say *"the gate is knowing X"* and have it mean a belief
   predicate.

---

## Open questions / forks

1. **Scope of the first build.** The model is large; the buildable kernel
   is small: the **template primitive** (parametric goal-set + typed
   slots), the **detection seam** (subscribed result-set test + event-
   match), and **one cast genre** (Mystery — the purest, and the forensic
   win is content-ready). *Lean: kernel first, off ≥2 real instances.*
2. **Progress-doc home.** The transient cursor as a
   [document-store](../../subsystems/document-store.md) `kind:'quest'` vs.
   PropertiedMixin flags (onboarding's N=1). *Lean: generalize to the doc
   store once a second instance exists — heed "resist building off N=1."*
3. **The party deduction board** — its own slate (referenced by the
   sealed room); scope, the forums/argument-map as its home, the
   party-scope semantics.
4. **Multi-party hold (§4–§5)** — spin into a *mediated-scene* slate, or
   keep parked until a hosted scene actually needs it? *Lean: park; no EU
   case needs it yet.*
5. **World-changing events** — confirm they ride this substrate but are
   *authored by the legislature*, not by content. Their lifecycle is out
   of scope here.
6. **Director embodiment when no NPC is present** — the invisible-
   director fallback for solo/ambient quests (the mystery has no host).
   What carries "what now" when there's no Limen?

## What this slate does NOT cover

- **World-changing / collective events** — authored by the polity; same
  mechanics, different lifecycle. See
  [cooperative-slate.md](./cooperative-slate.md).
- **The objective/trace *implementation*** — onboarding's flags are
  instance #1; this is the generalization, not its build.
- **Advancement / skill credit** — the forensic win *consumes*
  `AdvancementApi`; the discipline model is
  [advancement.md](../../subsystems/advancement.md).
- **The Eternal University *content*** — the bible owns the story; this
  owns the *form*.
- **Combat / RPG onboarding** — a later, separate tutorial (per the
  onboarding slate); this models the narrative layer only.

## Once shaped into formal requirements

The buildable kernel:

- The **template primitive** — a parametric goal-set: fixed beat-
  structure, typed slots, slot-parametric conditions, frame. Compiles to
  the goal-set IR.
- The **detection seam** — a beat condition as a subscribed result-set
  test (standing state) or an event-stream pattern-match (a happening);
  milestone-grain; records-not-surveillance.
- The **cast surface** — typed slot binding, save-gate validated; the
  two-tier template-author / content-author split.
- **One genre, cast end-to-end** — Mystery, against the forensic-win
  content: the corpse object, the rule prop, the commit-gate minting the
  `ActSignature`.
- Tests: a beat fires on its condition (both modes); a miscast slot is
  rejected at save; the commit-gate fires on the stated finding, not the
  held evidence; an unmet beat expires without stalling the arc; one
  experience's belief-write satisfies another's beat condition (the
  composition contract).

Everything above the kernel — the full library, the multi-party hold, the
director, the party board — waits for the kernel to prove out against the
arc.
