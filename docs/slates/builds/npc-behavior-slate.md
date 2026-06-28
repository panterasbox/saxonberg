# NPC behavior / automation slate (working doc)

> **Status: model set — declarative behavior over path-resolved brains.**
> Almost everything an NPC does — what it says, how it moves, how it reacts,
> how it defends — is **automation**, and it all reduces to one shape:
> **uniform emission + a swappable "brain," composed as data, riding
> substrate we already have.** Generalizes npc-dialogue's "one output,
> swappable brains" from speech to *all* behavior. Scripting and LLM aren't
> a separate paradigm — they're brain-types the same model accommodates.

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

2. **Behaviors are declarative data-specs, not composed mixins.** A host
   carries a **branch-agnostic `Behaved`** mixin that runs a **`behaviors:`
   data list**; each entry is `{ brain, trigger, config }`. Content authors
   compose behavior as **data** (add specs, pick brains, fill config) — no
   code. `Character` is the rich consumer (NPCs); a `Thing`/`Location` is the
   thin consumer (**reactive scenery** — same loop, simpler brains), so
   "reactive content" is not a separate subsystem. (Same shape the codebase
   uses for vitals' trauma strategy-table and locomotion modes.)

3. **Brains are path-resolved, lazy-loaded code modules — NOT a registry.**
   A brain is a code module at a path (in a scope/sandbox); a spec
   references it **by path**; `Behaved` **re-resolves + lazy-loads** it. Add
   your own = drop a marked module at a path in your scope — **no central
   list to edit.** (See [access-slate.md] / the registry-aversion principle:
   path-resolution + lazy-load, not central registration.)

4. **Path-resolution gives extensibility *and* HMR together.** Because
   brains are **re-resolved by path per invocation** (the controller
   `clone-per-execution` pattern), editing a brain hot-reloads and the live
   NPC's *next action* runs it — no re-spawn. The same mechanism that lets
   you drop in your own brain makes it hot-reloadable. So `Behaved` must
   **wire by path-reference + re-resolve, never capture the brain at spawn.**

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
- [docs/subsystems/hot-reload.md](../../subsystems/hot-reload.md) — the
  `clone-per-execution` / re-resolve pattern that makes path-resolved brains
  hot-reloadable; the proxy as the method-dispatch re-resolution seam.
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
- [docs/slates/collision-slate.md](../deferred-rpg/collision-slate.md) — **absorbs that
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

- **The NPC** is an `Agent → Character` **instance**, cloned from a
  **template** that names a `class` and holds fields incl. a **`behaviors:`
  list**. Normal Stuff — no new branch.
- **`Behaved`** is a **branch-agnostic mixin** — composed wherever authored
  behavior lives, not Character-bound. `Character` is its **rich consumer**
  (NPCs); a **Thing or Location** is its **thin consumer** (reactive scenery —
  "the door murmurs when opened," "the fountain bubbles every 5s," "the room
  dims at night"). The loop is identical on every host — read `behaviors:`,
  wire triggers, re-resolve brains, emit — so "reactive content" is **not a
  separate subsystem**, it's `Behaved` on a non-Character host running simpler
  brains. This stays a **focused mixin** (composed only where behavior exists,
  never a flag on every Stuff). At spawn it reads the `behaviors:` data and
  **wires each spec to its substrate** (re-resolving brains by path). The one
  Character-specific concern — **engagement-slot contention** — is a
  coordination layer the substrate defers to *only when the host has it* (a
  door runs one trivial brain with no contention).
- **A behavior-spec is DATA** — `{ brain, trigger, config }` in the
  template's `behaviors:` field. **Not an Idea, not its own template.**
- **A brain (behavior-type) is a path-resolved code module** — a strategy
  that, given trigger + config, decides + emits (npc-dialogue's "responder
  strategy class," generalized). **Code, at a path, lazy-loaded,
  marker-discovered — not a registry entry, not an Idea-per-brain.**
- **Config is data**, and it has **four homes**, picked by what the artifact
  *is*: **(1) inline** inside the owning template (the default — a dialogue
  tree *unique* to one NPC is just nested data in that NPC's template);
  **(2) its own `Document` + own collection** (e.g. `DialogueTree`,
  `collectionName='dialogue_trees'`), CRUD'd directly and **loaded on
  demand**, for an independent/*shared* `tree:` — this is the "your own
  collection for your own document needs" track (`User` lives here too); **(3)
  a `domain` Template**, *only* if the artifact is a game-world object that
  gets **cloned into the world** (a dialogue tree isn't — it's read, not
  cloned, so it's #2, not #3); **(4) the filesystem**, only if it's *code* (a
  brain). `domain` is **Template documents that clone into Stuff** —
  independent documents go in their *own* collection, never domain. (A
  `Document` is plain persisted JSON with no Stuff overhead — see the
  [persistence-architecture rethink](../tails/persistence-architecture-slate.md);
  it supersedes `Persistable`. So a `tree:` reference is to a `Document` in
  its own collection.) The graduate-or-inline axis is **artifact identity,
  not size**: a field
  becomes a path-reference when it's an *independent content artifact* —
  signalled by **reuse across hosts**, **needs its own editor**, **deserves
  its own lifecycle/audit**, or **is itself world content other systems
  consume**. A dialogue tree hits all four; chatter lines hit none.
  Mechanically this is **nothing new** — it's the template system's existing
  **Pattern A path-ref vs inline-field** choice, and **the brain's descriptor
  declares per-field** which is which (a ref field resolves via the same lazy
  path-resolution as everything). Trap: *"contains refs" ≠ "is a ref"* — a
  patrol `route` is inline data whose *elements* are room path-refs; the
  route's own identity is still inline. **Default inline; graduate to a
  referenced template when a signal fires** (cheap — same mechanism; the
  no-premature-artifacts instinct).

Example Guard template:

```yaml
class: Character          # or a thin "Guard" archetype class (a combo)
species: /lib/species/human
behaviors:
  - { brain: /lib/behavior/patrols,      trigger: cadence:10s, config: { route: [...] } }
  - { brain: /lib/behavior/tree-dialogue, trigger: addressed,  config: { tree: /content/dialogue/guard-challenge } }
  - { brain: /lib/behavior/greets,        trigger: arrival,    config: { lines: [...] } }
```

**Spawn flow:** clone `Character` (composes `Behaved` + species/body/senses)
→ Hydrator fills fields incl. `behaviors` → `Behaved` reads each spec,
**path-resolves + lazy-loads the brain**, and wires it: patrols → a
scheduled activity; tree-dialogue → a dialogue responder loaded with the
referenced tree; greets → an arrival-event subscription. **Brains (code)
decide + emit; specs (data) configure them.**

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
- **Emission (what channel):** speak → dialogue/Scene; move → locomotion;
  act → activity. Uniform.
- **Coordination of concurrent behaviors:** the **engagement slots**
  (`body`/`hands`/`attention`/`voice`) the activity framework ships — and
  they're an **agent concept** (`EngagedMixin` is on `Character`), so the
  reactive-scenery hosts (a door, a fountain) have *no* slots and run their
  one brain with zero contention. For agents the four slots are **abstract
  capacity axes, not anatomy** — same four for every agent: "hands" =
  manipulation capacity (a telekinetic engages it handless), "voice" =
  communicative output (an intercom engages it mouthless), "body" =
  locomotion/posture, "attention" = cognitive focus. An agent that *lacks* an
  affordance still has the slot — it's just **permanently unfillable, hence
  trivially free** (a wall-turret's `body` slot is never claimable), so
  contention logic stays uniform and variation lives in *which brains a host
  can run*, not in the slot set. (Anatomical variety lives in the **physical**
  slot subsystem — body-plan-derived wield/wear/posture sockets — a different
  system entirely.) **v1 limit:** a single coarse `hands` slot can't model a
  four-armed creature doing two manipulations at once; per-slot capacity is a
  future refinement.
- **Per-brain slot declaration (claims + requiresFree).** Each brain declares
  **two** sets in its descriptor: the slots it **claims** and the slots it
  **requires free**. Direct contention is on `claims` (two `body`-claimers
  can't coexist); cross-slot dependencies ride **`requiresFree`** + the
  framework's `preconditions-changed` abort. This is what makes "stop
  wandering when addressed" honest: `patrols` claims `body`, **requires
  `attention` free**; `tree-dialogue` claims `attention` + `voice`. Being
  addressed grabs `attention` → patrol's precondition breaks → it pauses
  ("my attention is engaged" — *not* pretending talking claims your legs) →
  resumes when `attention` frees. **Default contention policy, no priority
  numbers in v1: event-triggered behaviors preempt cadence-triggered ones**
  (addressed beats patrolling). Explicit priorities only when something real
  needs them. Crucially, `claims`/`requiresFree` are **brain-declared
  defaults** (in the descriptor object), *not* author-set — the author just
  picks a brain and the contention wiring comes along, so the spec stays
  `{ brain, trigger, config }`.

### HMR (falls out of path-resolution)

Re-resolving by path each use picks up **both** newly-dropped modules
(extensibility) **and** reloaded code (HMR). So edit a brain in your sandbox
→ it hot-reloads → the live NPC's **next action** runs it → no re-spawn.
**Constraint:** `Behaved` wires by **path-reference + re-resolve**, never a
captured brain reference (else HMR can't propagate). Behavior-spec *data*
reloads via template re-read / `reload` verb (new clones reflect it; existing
NPCs re-hydrate). The same grain gives distributed extensibility + HMR + the
tight edit→holodeck→live dev loop.

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

CK3-style **personality traits** — opposed-pair dispositions — are the
**personality input the brains read** and a **baseline input to `regard`.**
Decided: **adopt CK3's *personality* traits (universal human dispositions); use
Saxonberg's own systems for everything CK3 handled via its *other* trait
categories** (education → the advancement Catalog; congenital → race/body; health
→ vitals; faith/court/government → not our environment / deferred; childhood → no
dynasty arc). Importing those would duplicate or fight systems we already have.

**The roster (opposed pairs):**

- **Direct keepers:** Calm/Wrathful · Content/Ambitious · Diligent/Lazy ·
  Generous/Greedy · Gregarious/Shy · Honest/Deceitful · Humble/Arrogant ·
  Patient/Impatient · Temperate/Gluttonous · Trusting/Paranoid ·
  Compassionate/Callous · Forgiving/Vengeful · Fickle/Stubborn.
- **Reframed for our world:** **Brave/Craven** → *risk-taking* (social/economic
  nerve, not the battlefield); **Just/Arbitrary** → *fairness in dealings* (not a
  ruler's justice); **Cynical/Zealous** → *worldview* (cynical/idealistic, no
  faith hook).
- **Dropped:** Chaste/Lustful (load-bearing in CK3 only via marriage/dynasty;
  low fit).
- **Native addition:** **Curious/Incurious** (love of learning) — central in a
  *learning* game (only a throwaway childhood trait in CK3); shapes
  propensity-to-practice → feeds the advancement loop.

~15 pairs — CK3's personality core, three reframed, one dropped, one added; a
tight characterful roster, not a reinvention.

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

The model is the **same as the advancement Transcript**, applied to dispositions
instead of skills. A skill is a derived aggregate over a ledger of *deeds*; a
**trait is a derived aggregate over a ledger of *disposition-valenced acts.***
Each act carries a **disposition-valence** (a lie is +Deceitful/−Honest; a
generous tip +Generous/−Greedy; overdrinking +Gluttonous/−Temperate) — riding
the **same act-signature** that carries the skill-Subjects, so you **instrument
once** and both fall out (and only the *dispositionally significant* acts need a
valence — the neutral majority carries none). So **traits are derive-don't-track,
never assigned** — the project's derive-from-behavior thesis applied to
*character itself*. Consequences:

- **A position on every axis, not 3 slots.** You sit *somewhere* on each
  opposed-pair (Generous↔Greedy: a signed **magnitude**, not a binary) — most
  near neutral, a few pronounced. Your **pronounced axes are your *defining*
  traits** (the labels people call you by). No cap.
- **Form-then-entrench lifecycle** (and this is why no-death is *fine*, not a
  problem). A new character starts near-neutral (unformed); behavior accumulates
  → pronounced axes emerge (**defined**); the aggregate gets **heavy** → it
  **resists drift** (**entrenched** — old characters are literally "set in their
  ways," young ones change easily). Character crystallizes over a lifetime, and
  CK's "rare trait change" falls out free (a strong event can *shock* an
  entrenched trait; inertia holds it otherwise). **Drift + inertia replaces CK's
  lock-at-maturity** — better for long-lived characters.

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

1. **The trigger vocabulary** — *resolved: two sources (cadence | event); no
   condition DSL.* State is a guard, not a source; guards live in brain code
   parameterized by config. Triggers are a thin selector over the event bus
   (`cadence:Ns` | event-kind, with friendly aliases), not their own
   registry. Remaining sub-question: the exact v1 alias set + their event-kind
   mappings (`arrival` → which containment event, etc.).
2. **Brain self-marking convention** — *resolved: an exported descriptor
   object* (`export const brain = { name, configSchema, claimsSlots, … }`)
   — it both marks the module as a brain *and* carries the metadata the CMS
   palette + intelligence layer need (display name, config-form schema, which
   engagement slots it claims), so the marker pays for itself rather than
   being a dead flag. **The framework boundary is the load-bearing half:** the
   game runtime does *one* thing — **path-resolution** (follow a spec's brain
   path, lazy-load, re-resolve). It never *enumerates* and never consults a
   catalog/index — only follows references it was handed. References are
   validated at **resolution time** (the path loads or errors) and at the
   **save-gate**, never via a global walk. **Enumeration is exclusively a
   CMS/authoring concern** — the brain catalog (its tree-walk / lazy index /
   maintenance) lives in
   [authoring-intelligence-slate.md](../builds/authoring-intelligence-slate.md) and
   the runtime has zero dependency on it; a stale catalog is at worst a
   palette omission, never a broken NPC.
3. **Config-inline vs content-template-reference** — *resolved.* Axis is
   **artifact identity, not size**: a field is a path-ref when it's an
   independent content artifact (reuse / own-editor / own-lifecycle /
   is-world-content), else inline. It's the template system's existing
   **Pattern A ref vs inline-field** choice, declared **per-field in the
   brain descriptor**; *"contains refs" ≠ "is a ref"*; default inline,
   graduate on signal. (CMS: ref → reference-picker + open-in-editor; inline
   → config-form input.) Four homes: **inline-in-owner / own-`Document`-
   collection (CRUD, load-on-demand) / domain-Template-if-cloned-into-world /
   filesystem-if-code**. A shared `tree:` is home #2 (its own collection like
   `User` — *not* `domain`). `Document` = plain persisted JSON, no Stuff
   overhead (see the
   [persistence-architecture rethink](../tails/persistence-architecture-slate.md),
   which supersedes `Persistable`). *Build-time Q:* does the CMS
   authoring/audit/drafts pipeline serve any `Document` collection or only the
   domain/Template track?
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

## Once shaped into formal requirements

This slate boils down to:

- **Uniform emission + swappable brain** on the canned→tree→intent→scripted
  →LLM ladder (npc-dialogue generalized to all behavior).
- **Branch-agnostic `Behaved` mixin** running a **`behaviors:` data-spec
  list** (`{brain, trigger, config}`); behavior composed as **data**, not
  mixins. Character = rich consumer (NPCs); Thing/Location = thin consumer
  (reactive scenery) — one substrate, not two subsystems.
- **Triggers = two sources** (cadence | event), no condition DSL — state is a
  guard living in brain code parameterized by config; triggers are a thin
  selector over the event bus (the real extensibility surface), not a
  registry.
- **Brains = path-resolved, lazy-loaded, marker-discovered code modules**
  (no registry); **re-resolved per invocation** → HMR; referenced by path;
  the ladder maps to data-config vs script tiers.
- **Riding existing substrate** — triggers (cadence / events), emission
  (dialogue / locomotion / activity), coordination (engagement slots as
  **abstract capacity axes**, agent-only; brains declare `claims` +
  `requiresFree`; cross-slot yielding via `preconditions-changed`;
  event-triggered preempts cadence-triggered by default).
- **Subclassing only for code** (new brain module, scripted brain, custom
  class); ordinary NPCs = `Character`/archetype + behavior data.
- **Tooling** — the spec-list editor + brain path-picker + dialogue-tree
  widget, reusing the content-editor framework; archetypes (combos)
  pre-spec behaviors.
- Tests: a content author builds a guard from data (no code); editing a
  brain hot-reloads into a live NPC without re-spawn; concurrent behaviors
  contend via engagement slots (wander stops when addressed); a new brain
  dropped at a path is usable + discoverable with no central edit; a
  scripted brain is gated to the trusted/isolation tier.

The scripting tail, the LLM brain, combat/defend, and state-triggers wait
for their own waves.
