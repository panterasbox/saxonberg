# NPC behavior / automation slate (working doc)

> **Status: PARTIAL** — the model shipped: `BehavedMixin`'s data-spec
> list, path-resolved re-resolve-per-invocation brains (24 in the kernel
> tree today), cadence + witness triggers, engagement contention, the thin
> `NPC` class → [behavior.md](../../subsystems/behavior.md); the tree
> responder → [npc-dialogue.md](../../subsystems/npc-dialogue.md); the
> personality layer → [trait.md](../../subsystems/trait.md).
> **Left:** the upper rungs of the ladder — intent-match, the code-tier
> `scripted-behavior` brain, the LLM brain · the `addressed` and `given`
> triggers · the `guards` brain + the block-substrate seam · reactive
> scenery (`Behaved` on a `Thing`/`Location` host) · archetype behavior
> presets (the combo catalog) · per-slot capacity for multi-limbed bodies ·
> stress as the divergence signal (the `traits-stress` follow-on) · the
> schedule model (derive the crowd, simulate the cast — schedule as
> preference, diegetic failure, the observability boundary, the night
> pulse + staggered hours) · the ambient crowd as prose, not objects · the
> CMS behavior-composition tooling (the spec-list editor, the brain
> palette by tree-walk, the dialogue-tree widget) + its drafts→publish gate
> **Size:** a build

Working slate for **NPC behavior** — the automation layer behind
non-player (and AI-driven) `Character`s. It's the activity framework's first
real consumer, the npc-dialogue responder pattern generalized, and the place
the CMS's composition + the access model's path-resolution all pay off.

The load-bearing decisions:

1. **Uniform emission + swappable brain, on an automation ladder.** An NPC
   *emits* through the normal channels (speak via the dialogue/Scene path,
   move via locomotion, act via the activity framework) — uniform. What
   varies is the **brain** deciding *what* to emit, along a ladder:
   **canned → tree → intent-match → scripted → LLM.** (npc-dialogue's
   swappable-responder pattern, generalized to speak/move/react/defend.)

*(Decisions 2–4 — the `behaviors:` data-spec list on a branch-agnostic
`Behaved`, path-resolved brains with no registry, re-resolve-per-invocation
HMR — shipped → [behavior.md](../../subsystems/behavior.md) § The model,
§ Brains are a module category, § Path resolution + HMR.)*

5. **The ladder = the data/code tiers.** canned/tree/intent brains are
   **data-config** (content-tier, safe); the **scripted** brain's config
   *is* a script (**code-tier**, isolation-gated — the deferred scripting
   tail); the **LLM** brain is generative (special). One model spans all of
   it; the brain-type is the rung, its config-vs-script the tier.

See also:

- [docs/slates/npc-dialogue-slate.md](../tails/npc-dialogue-slate.md) — the
  **speech brains** (tree / intent / LLM responders) this generalizes; the
  "one output, swappable brains" pattern is its core, now applied to all
  behavior. Dialogue content (trees, rules) = data on the NPC; responders =
  the brains.
- [docs/subsystems/activity.md](../../subsystems/activity.md) — the
  **substrate**: `ScheduledEmission` (cadence triggers), `DurativeActivity`,
  `SustainedEngagement` + the **engagement slots** (`body`/`hands`/
  `attention`/`voice`) that **arbitrate concurrent-behavior contention**.
  NPC behavior is its first real consumer (shipped inert in Wave 1).
- [docs/slates/access-slate.md](../tails/access-slate.md) — brains live in
  lease-scoped sandboxes; a scripted brain is untrusted code (the isolation
  concern); path-resolution (not a central registry) is the access-aligned
  grain.
- [docs/slates/cms-slate.md](../builds/cms-slate.md) /
  [authoring-intelligence-slate.md](../builds/authoring-intelligence-slate.md) — the
  behavior editor reuses the content-editor framework (spec-list, the brain
  **reference-picker**, the **dialogue-tree** widget); brains are discovered
  by tree-walk (no registry).
- [docs/standard-model.md](../../standard-model.md) — NPC = `Agent → Character`
  (branch × mixins); an NPC archetype (`Guard`) is a **combo** pre-specced
  with behaviors.
- [docs/slates/collision-slate.md](../tails/collision-slate.md) — **absorbs that
  slate's intentional-blocking concern.** "The guard refuses to let you
  pass" is a **`guards` brain** here (data-configured decision), *not* the
  collision slate's `BlockerBehavior` composed-mixin. The brain emits its
  veto through a small **block-substrate seam** in the locomotion cascade —
  the already-present-but-hollow `'blocked'` gate in
  `LocomotionControllerBase.composeRejection` (the engine already renders a
  source-attributed diegetic refusal; the brain just decides *whether* and
  supplies the *reason*). Defines/consumes that seam when `guards` is built.

---

## Principle

1. **It's all automation** — speak/move/react/defend reduce to one shape.
2. **Uniform emission, swappable brain**, on the canned→…→LLM ladder.
3. **Behavior is data** (a `behaviors:` spec list); **brains are code**
   (path-resolved modules).
4. **Path-resolution, not registries** — drop your own in your sandbox;
   re-resolve per use → HMR for free.
5. **One model spans the ladder** — scripting/LLM are brain-types, not a
   separate system.

---

## The model

### How it maps to the hierarchy (the concrete plumbing)

*Shipped → [behavior.md](../../subsystems/behavior.md) § The model
(`BehaviorSpec`, `BehavedMixin` wiring at `postRegister`, brains as
path-resolved modules). The config "four homes" paragraph is superseded by
the code: a dialogue tree is the `tree-dialogue` spec's inline `config`
blob — no `DialogueTree` Document, no `dialogue_trees` collection →
[npc-dialogue.md](../../subsystems/npc-dialogue.md) § The tree format.*

### The automation ladder (brains by rung and tier)

| Brain (examples) | Rung | Tier |
|---|---|---|
| `idles`, `random-chatter`, `wanders`, `patrols`, `greets`, `reacts` | canned | **data** (config) |
| `tree-dialogue` | tree | **data** (the tree is data/content) |
| `intent-dialogue` | intent-match | **data** (rules/synonyms) |
| `scripted-behavior` | scripted | **code** (config *is* a script — isolation-gated) |
| `llm-brain` | generative | special (deferred) |

The brain-type is the rung; whether its config is data or a script is the
tier. So **scripting is just the `scripted-behavior` brain** (the code-tier
tail), and **LLM is the `llm-brain`** — the same data-spec model
accommodates both. Nothing about NPC behavior is a separate paradigm.

### Brains: path-resolved, lazy-loaded, marker-discovered (no registry)

A brain lives at a path in a scope/sandbox, is **referenced by path** in a
spec, and **re-resolved + lazy-loaded per invocation** (the controller
`clone-per-execution` pattern). Adding one = **drop a marked module at a
path** — no central file. **Discovery without registration:** the editor
palette is a **derived tree-walk** over modules that **self-mark as a brain**
(a base class / exported descriptor / location convention, like `_mixinName`
for mixins), not a registration gate. A brain is usable (path-reference) and
discoverable (tree-walk) the moment it's at a path. Trust is orthogonal —
*who* may write/run a brain is the access/scope/isolation question;
path-resolution governs only *how it's found.*

### It rides substrate we already have

`Behaved` is thin — it wires, it doesn't run:

- **Triggers (when): two sources, not three.** A trigger is **cadence**
  (time → `ScheduledEmission`; default *jittered*, "every 8–12s," so a room
  of NPCs doesn't tick in lockstep) **or event** (something happened → the
  existing class-based `EventApi.on` bus). **State is not a third source —
  it's a guard.** You never poll "is hp low"; you react to the hp-*changed*
  event and check the threshold. "At night" = on cadence, if hour == night.
  And **the guard lives in the brain's code, parameterized by the brain's
  config** — no condition DSL in v1 (the moment a trigger carries
  `when: hp < 0.2 && !inCombat` we've signed up for an expression language).
  A `patrols` brain with an `activeHours` config no-ops outside those hours;
  a `defends` brain reads its hp threshold from config. Conditions are data
  (config) interpreted by code (the brain) — the data-configures-vetted-code
  line again. **Triggers aren't their own extensible vocabulary** — they're a
  thin selector over the event bus: `cadence:Ns` or an event-kind name, with
  friendly aliases (`arrival` / `departure` / `addressed` / `given`) for the
  common ones. The extensibility surface is the **event system** (fire a new
  event class → a brain subscribes to its kind), not a trigger registry.

*(Emission channels, slots as abstract capacity axes, brain-declared
`claims`/`requiresFree`, witness-preempts-cadence — shipped →
[behavior.md](../../subsystems/behavior.md) § Slot contention.)*

### HMR (falls out of path-resolution)

*Shipped → [behavior.md](../../subsystems/behavior.md) § Path resolution + HMR,
§ Dev workflow & isolation.*

### Subclassing happens only for code

- **A new brain** → a new path-resolved **strategy module** (code-tier, one
  module, dropped in a scope).
- **The `scripted-behavior` brain** → custom logic as a script (code-tier,
  isolation).
- **A custom NPC class** with bespoke methods → a `Character` subclass
  (rare; behavior should live in brains/mixins, not subclass methods).
- **A thin archetype/combo class** (`Guard`, `Shopkeeper`) → composes the
  right mixins + ships a default **behavior-spec preset** (the combo
  catalog).

**Never for ordinary NPCs** — a guard, shopkeeper, wandering peasant =
`Character` (or a thin archetype) + **behavior-spec data**. Data =
configure vetted pieces (content-tier); subclass/new-module = need new code
(code-tier). The data-not-code line, again.

### Tooling (reuses the content-editor framework)

The NPC behavior editor = a **spec-list**: each row a **brain path-picker**
(reference-picker + tree-discovery, intelligence-validated) + a **trigger**
selector + a **config form** (schema-driven per brain-type). The one notable
brain-specific widget is the **dialogue-tree editor** (for `tree-dialogue`)
— a graph/tree editor, the NPC analogue of the room's exit-picker.
Everything else is config-forms + the reusable pieces (defaults-aware,
reference-picker). NPC **archetypes** (combos) pre-populate the spec-list.

---

## Worked scenario — building a Guard (content-tier, no code)

Pick the `Guard` archetype (a combo, pre-specced with patrol + challenge
behaviors). Tweak: set the patrol `route` (a reference-picker over rooms),
point `tree-dialogue` at a challenge tree (authored in the tree widget — a
*shared* tree is its own **`Document` in a `dialogue_trees` collection**,
loaded on demand; a tree unique to this one guard would instead stay
**inline**), edit the greet lines. Save → the guard is a domain Template that
references the shared challenge-tree document. Test in the **holodeck**; edit the `patrols` brain's code in your
sandbox → it **hot-reloads** → the holodeck guard's next patrol step uses it,
no re-spawn. Publish the zone (drafts/staging). No class was written —
`Guard` is `Character` + behavior data. Later, a `haggle` behavior nobody's
built → drop a marked brain module **in your source-tree sandbox** (it's
*code*, so it lives on the filesystem, not under `/content/`; lease/isolation
governs running it) → it's instantly path-referenceable and
palette-discoverable.

---

## Traits — the personality layer (the roster)

> **STATUS:** the trait **substrate + jobs 1 & 2** (the roster, the
> derive-on-read ledger/estimator, the demonstrator brain, compatibility →
> regard baseline) **shipped** — see [trait.md](../../subsystems/trait.md).
> This section is retained for the **deferred stress / composure work**
> (job 3, the `traits-stress` follow-on); its open questions below are that
> build's surface.

*The roster shipped — as **19** axes, not ~15 (`candor` and `warmth` added
2026-09-04) → [trait.md](../../subsystems/trait.md) § The roster.*

**What traits do — three jobs:**

1. **Drive behavior** — the brains read traits → behavior (a Gregarious NPC runs
   more chatter; a Brooding one broods).
2. **Set the `regard` baseline** — **trait compatibility** sets the *starting*
   regard between two characters (compatible → high, opposed → low); interaction
   moves it from there. The innate input to the (shipped) regard substrate
   ([belief](../../subsystems/belief.md)) — *why Mara likes Sloane* = compatible
   Reserved/Temperate. Traits → regard → social skills
   ([advancement-slate](./advancement-slate.md) § *Sensing the social Subjects*).
3. **Cost divergence as stress** — acting against your nature hurts (below).

### Traits are *competence for dispositions* (the architecture)

*Shipped → [trait.md](../../subsystems/trait.md) § The model — derive-don't-track,
§ The estimator (position on every axis, `TraitBand` unformed → defined →
entrenched, the clamp as inertia).*

### Stress — the divergence signal (one mechanism, two thresholds)

Stress and trait-drift **read the same signal** (an act's disposition-valence vs.
your *current* disposition) at two timescales: **instant divergence → stress**
(you acted against your nature); **accumulated → trait drift** (you become what
you repeatedly do). One instrumented signal, not two mechanisms.

Stress rides shipped substrate: a **composure / equanimity reserve** (the
[Reserve](../../subsystems/reserve.md) substrate) that **drains** on
trait-divergent acts and **refills** by acting *in* character + **coping** — and
the prime coping venue is **the bar** (drink + socialize + the third place;
belonging refills composure — the SDT relatedness payoff; *this is the bar's
social function*). Floored composure → a **break condition** via the conditions
cascade — *the same pattern metabolism uses* (floored endurance → collapse). The
break is **transient on the flagship** (a *frazzled* deficit you climb out of —
no permanent scar, respect-time), **permanent on a roguelike distro** (a vice
trait). Cope-drinking carries an honest, un-preachy tradeoff: relief now, but
BAC/hangover + habitual reliance builds **tolerance** → the *Gluttonous* spiral.
For **players** it's **opt-in pressure, never a wall** — you can always act
against type (transient stress), and acting *in* type *relieves* it: a soft
incentive to roleplay, never a punishment.

**Open:** the break's exact consequence (a *frazzled* condition vs. a forced
coping-*behavior*); how deep to run the cope-drinking → tolerance spiral; the
**mechanism** (where the disposition-ledger + derived trait live — a mixin? the
same store as competence? — and the compatibility → regard computation); the
numbers. (The *chosen-vs-earned* fork is **resolved: earned/derived**, not
chosen.) **Prototyped on the bar cast** (Mara/Remy/Sloane/Augie/Dave —
[daves-bar-slate](./daves-bar-slate.md)).

---

## Open questions

*(Q1–Q3 resolved and shipped: the trigger alias table →
[behavior.md](../../subsystems/behavior.md) § Triggers; the brain marker
shipped as a named class-expression with statics, not a descriptor object →
§ Brains are a module category; Q3's shared-tree `Document` collection was
superseded by the inline `config` blob →
[npc-dialogue.md](../../subsystems/npc-dialogue.md) § The tree format.)*

4. **The `scripted-behavior` brain** — its shape + the isolation dependency
   (the scripting tail; deferred with host isolation).
5. **Engagement-slot mapping per brain** — *resolved.* Slots are **abstract
   capacity axes** (`body`/`hands`/`attention`/`voice`), same four for every
   agent, decoupled from anatomy (absent affordance → trivially-free slot);
   non-agent hosts have none. Each brain **declares `claims` + `requiresFree`**
   in its descriptor (not author-set); cross-slot yielding rides
   `requiresFree` + `preconditions-changed`. **Default policy:
   event-triggered preempts cadence-triggered**; explicit priorities only if
   needed. Remaining sub-questions: per-slot **capacity** for multi-limbed
   bodies (deferred); the exact `claims`/`requiresFree` table for the v1 brain
   set.
6. **Host scope** — *resolved: `Behaved` is branch-agnostic* (Character =
   rich consumer; Thing/Location = thin "reactive scenery" consumer). Open
   sub-question: do automated behaviors ever apply to **Avatars**
   (auto-actions)? *Lean: no — Avatars are player-driven; `Behaved` is for
   authored/automated hosts.*
7. **LLM brain** — when it lands + its contract (npc-dialogue's deferred
   front-end, generalized).

---

## Build order

**Wave 1 — `Behaved` + the canned brains + wiring.** The `Behaved` mixin
(reads `behaviors:`, path-resolves + re-resolves brains, wires to substrate);
the canned brains (`idles` — a cadence sampler over a *mixed* emission pool
(emotes + verbs + sequences), surfaced by Gus's idle business;
`random-chatter`, `wanders`, `patrols`, `greets`, `reacts`) as path-resolved
modules; cadence + event triggers; engagement-slot contention. The behavior spec-list editor + brain path-picker.

**Wave 2 — dialogue brains + the tree widget.** `tree-dialogue` /
`intent-dialogue` brains (consuming npc-dialogue's responders); the
**dialogue-tree editor** widget; trees as referenced content templates.

**Wave 3+ — the tail.** The `scripted-behavior` brain (the scripting tier —
gated on host isolation); the `llm-brain`; state-triggers; richer
coordination; the `guards` brain (absorbs collision-slate's intentional
blocking; defines the block-substrate seam in the locomotion cascade — the
hollow `'blocked'` gate); combat/defend brains (RPG-deferred).

---

## What this slate does NOT cover

- **The dialogue *responders* internals** → [npc-dialogue-slate.md](../tails/npc-dialogue-slate.md);
  consumed as the speech brains.
- **The activity/engagement substrate** → [activity.md](../../subsystems/activity.md);
  consumed for triggers + coordination.
- **Scripting itself** (the general code-tier behavior + the sandbox/
  isolation) → the deferred scripting work + [access-slate.md](../tails/access-slate.md);
  here it's just the `scripted-behavior` brain-type the model accommodates.
- **Combat / defend mechanics** — RPG / game-phase; a `defends` brain is a
  placeholder until those mechanics exist.
- **The CMS framework + composition** → [cms-slate.md](../builds/cms-slate.md); the
  behavior editor is an instance of it.
- **NPC species/body/appearance** — the "basic half" (race subsystem +
  the Thing-editor pattern); this slate is the *behavior* half.

---

## NPC schedules — derive the crowd, simulate the cast (2026-07-31)

**Captured out of the innkeeper pass**
([insurance-slate § the innkeeper](./insurance-slate.md)), which came
out **conditional on this**: *the inn is a real vocation iff the world
has a rhythm.* This is the rhythm — and it is far cheaper than it
sounds, because most of it already ships.

### ⭐⭐⭐ A schedule is a claim about POPULATION, not about individuals

The naive build gives every NPC a timetable and walks them around:
expensive, fragile, and exactly how Radiant-AI-style schedules break.

But look at what is actually wanted — **shops shut, streets empty, the
watch out, the inn busy.** *None of that requires Gus to walk home.* It
requires **the aggregate to change.**

> **Derive the crowd; simulate the cast.**

Which is the standing rule that **NPCs are expensive carves** — you
cannot afford everyone and you do not need to.

### ⭐⭐⭐⭐ And the schedule already exists: it is the SHIFT ROSTER

*Shipped → [behavior.md](../../subsystems/behavior.md) § The canned brains
(`shifts`: presence is a consequence of roster state, not a clock read;
opening hours are a rostering choice).*

### ⭐⭐⭐ The ambient crowd is PROSE, not objects

The shipped room-spec doctrine already says it: **prose for bulk, Stuff
for few, NPCs for a full session.** A busy common room is **described**
as busy; the people you can talk to are the carved handful.

**And ProseApi can read the clock**, so **a room's description varying
by hour is nearly free** — a very cheap way to make the world feel like
it has a rhythm, with no simulation behind it.

### The cast, and why it will not break

Named NPCs get real schedules and *are* seen in transit. Three rules:

- ⭐ **The schedule is a PREFERENCE, not a command.** Brains are
  strategies, not scripts — an NPC *wants* to be home by dark and
  **copes** if it cannot.
- ⭐ **Failure is diegetic.** One who cannot get home **sleeps in the
  stable.** Content, not an error.
- ⭐⭐⭐ **OBSERVABILITY IS THE OPTIMIZATION BOUNDARY** — if nobody can
  perceive a transition, do not simulate it; move them.

> **Third instance of that principle today**, after the **governance
> sweep** (a backstop for what nobody watched) and the **emission
> model** (compute at the query point). Worth holding as a general rule:
> **simulate what someone can see; derive the rest.**

⚠ Note the boundary: this is **not** a licence to fork the movement
path. The freight rule — *the journey issues the same `traverse` a
player would* — governs **observed** motion. Snapping an **unobserved**
NPC is an observability optimization, and the two must not be confused.

### ⭐⭐⭐ Night's gameplay is three shipped systems intersecting

**Nobody has to design "night gameplay."** It falls out of:

| System | Contribution |
|---|---|
| **light** | genuinely darker, per-viewer, via `signalAt` |
| **concealment** | viewer-aware, so stealth genuinely works better |
| **schedules** | **fewer witnesses on the street** |

**Darker, harder to see, and nobody watching** — a crime window nobody
authored, and it makes concealment matter at a specific **time** rather
than only in specific **places**.

### ⚠ The 12× clock changes the framing — and adds a tuning risk

At 12× a game day is **~2 real hours**, so night comes round roughly
hourly.

> **Night is a PULSE, not a demographic.** Everyone experiences it,
> every session.

That is **stronger** demand for the inn than *"people who play at odd
hours"* — but it introduces a real risk: **if everything shuts for an
hour of real time every two hours, that is simply annoying.**

Three mitigations, and the third closes the loop:

1. **stagger the hours** — not everything closes at once;
2. **essential services stay open** — the ones a player cannot route
   around;
3. ⭐ **the inn is the always-open fallback** — so **the innkeeper is
   justified from the TUNING side as well as the fiction side.** It
   exists because the world needs somewhere that never closes.
