# Agent coordination slate — who acts, at every scale

> **Status: STAGE 1 IN BUILD · STAGE 2 IN CONVERSATION.** Opened 2026-09-25
> as *"the brain substrate slate — what a brain IS"* and renamed 2026-09-30,
> because the mechanism was never the subject:
>
> > **User: "the whole thing started out being about agent coordination at
> > different scales and functions."**
>
> ⚠ **It was also nearly split in two on 2026-09-30 and should not have
> been.** Document length is not a design boundary — the faculty vocabulary
> and the arbiter are one subject at two *times*, sequenced by consumer
> availability, not two subjects.
>
> It exists because the [call](call-slate.md) build turned out to be a layer
> of dynamism balanced on an undesigned one:
>
> > **User: "npc brains are the most dynamic to the point where we want to
> > drive them with LLMs someday, and you're talking about another layer of
> > dynamism on top of all the npc brains… we never ran 'npc brain' through
> > all our lenses because we've never thought of it as one thing. but now
> > we're expecting to design crews and have those respect the lenses when
> > we never had the conversation about brains? if I'm so fixated on brains
> > its because I really think this is the engine that drives the crew
> > design and it's underdesigned."**
>
> **Not this slate:** the brain *feature backlog* — intent-match, the
> `scripted-behavior` tier, the LLM brain, the `guards` brain, reactive
> scenery, the schedule model, the CMS composition tooling. That is
> [npc-behavior-slate](npc-behavior-slate.md), and ⚠ **it never asks what a
> brain is either** — every item on its Left list is a brain to write, not
> a statement about brains.
> ⭐⭐ **Grown 2026-09-30** into the question underneath it — § *What we
> mean by INTELLIGENCE* — which replaces the routine-catalogue approach with
> a **declared, reviewable faculty profile**, three axes, and a pass against
> Campbell. ⚠ **None of that part is in the coordination build**; see its
> last heading for the two things the build must not contradict.
> **Size:** a design cycle, then a build.

---

---

# ⭐⭐ Read this first — the scale ladder, and where each rung stands

**One question at eight scales:** *who acts, and can they?* Every part of this
doc serves one rung.

| scale | the question | answered by | stage |
|---|---|---|---|
| **a task** | what is this work; what does doing it claim | the **faculty + function vocabulary** (§ *What we mean by INTELLIGENCE*) | **2** — designed, no consumer yet |
| **one agent** | what do I do next | the **beat** + the **urgency band** | ⭐ **1 — in build** |
| **a shift** | who is on, and where | the **roster tick** (`shifts`/`covers` move into it) | **1 — in build** |
| **a house** | who among us acts for *this* | the **call policy** | **1 — in build** |
| **a chain** | who answers to whom | `reportsTo` — shipped, used **once**, never exercised | deferred → the senior seat ([call-slate](call-slate.md), [daves-bar-slate](daves-bar-slate.md)) |
| **an institution** | who is called, from how far | dispatch · the turnout · the hue and cry | deferred — needs content that does not exist ([call-slate](call-slate.md) § the matrix, [policing-slate](policing-slate.md)) |
| **one mind, many bodies** | do we all turn | `actsAsOne` | deferred — no pack in the world |
| **a locality** | — | ⛔ never asked | out of scope, deliberately |

## How to read the rest of this doc

**Part 1 — §§ *The measurement* → *the casting pass*.** The case that today's
model is broken, and the redesign. ⭐ **This is now
[agent-coordination-requirements](../../requirements/agent-coordination-requirements.md)
and its D1–D13 / W0–W7 plan** — stage 1, agreed and planned. Nothing here is
open; it retires at that build's sweep. Its three pieces that would otherwise
strand are already rehomed: the board unification and the crew consequences
to [call-slate](call-slate.md), the LLM seam to
[llm-content-slate](llm-content-slate.md).

**Part 2 — § *What we mean by INTELLIGENCE* onward.** The vocabulary: three
axes, the Campbell pass, why a declaration beats derivation, what a reviewer
checks, and brains-versus-scripts. ⭐ **This is where every open question
lives.** It is not in stage 1, and § *What of this is in the coordination
build* names the two things stage 1 must not contradict.

⚠ **Why stage 2 waits, and it is not sequencing for its own sake:** the
faculty declaration has **no consumer** — no author is declaring, no body is
reviewing. Shipping it now would be the consumer-less-half failure that cut
`actsAsOne` and the board unification. Same subject, later time.

---

## The measurement — 2026-09-25

38 brains: 24 in the kernel tree, 14 across nine packs.

**The complete metadata vocabulary is six statics** — `label`, `claims`,
`requiresFree`, `presenceGated`, `ambient`, `act()` — plus `open?()` on
dialogue brains only. What that census found:

- ⚠ **All 38 labels are the filename repeated.** `farms` →
  `label = 'farms'`. The one descriptive field carries zero information,
  and it is what the CMS palette is meant to show an author.
- ⚠⚠ **17 of 38 declare no engagement slots at all** — `farms`, `delves`,
  `weaves`, `herds`, `hauls`, `stocks`, `consigns`, `restocks`, `cellars`,
  `maintains`, `prints`, `eats`, `homes`, `shifts`, `covers`, `enforces`,
  `raids`. **A farmer working a field claims nothing.** So two of them can
  fire on one host in one beat with nothing objecting, and an NPC
  mid-harvest reads as **idle** to anything asking whether it is free.
- **Exactly one brain reads personality**: `converses`, on one axis
  (Gregarious ↔ Shy). 47 NPC rows author `dispositions:`, `BehavedMixin`
  seeds them into the trait ledger, and nothing else consumes them.
- ⭐ **Priority has been invented once, privately.** `nurses` carries *"a
  triage rank (higher = more urgent)"*, hand-rolled inside one brain
  because it could not function without it. That is the standard signal
  that a concept belongs in the substrate and got smuggled into a leaf.
- **Two "brains" are not behaviour at all.** `shifts` and `covers` are
  employment machinery riding the brain rail because a cadence timer was
  the only scheduler available. (Both correctly set `ambient: false` to
  escape the chatter budget — the tell.)

**What a brain is today, named honestly: a reflex.** Trigger → decide →
emit, on an independent timer or a perception witness, mutually excluded
only by slot occupancy, first-come. 38 reflexes, not minds, and no agent
anywhere that chooses between them.

**What is good and must survive any redesign:** the spec-is-data /
brain-is-code split (`{brain, trigger, config}` persisted, logic never) ·
re-resolve-per-invocation so a brain edit reaches a live NPC · packs
shipping `src/behavior/` with no kernel list edit · and `presenceGated`
(do not animate an empty room), which is the one place these lenses were
respected on purpose.

## ⭐ The structure is already there, undeclared

Sorted by what they are *about*, the roster sorts itself:

| kind | brains |
|---|---|
| **threat** | `wary` `enforces` `combatant` `backs-up` `arms` |
| **body / need** | `eats` `homes` `feeds` |
| **work / vocation** | `farms` `fishes` `delves` `weaves` `tailors` `herds` `hauls` `stocks` `consigns` `restocks` `cellars` `maintains` `prints` `nurses` `raids` `reads-water` `reads-air` |
| **social** | `greets` `introduces` `converses` `random-chatter` `reacts` `tree-dialogue` `crossing-ritual` |
| **movement / filler** | `wanders` `patrols` `follows` `idles` |

⭐⭐ **And the five kinds already imply their own priority order** —
threat > body > work > social > filler. Nobody has to invent that; it is
readable off the roster. The missing structure is not speculative design,
it is **the thing the existing roster is already organized by and cannot
say**.

## The five missing declarations

1. ⭐⭐ **What it is FOR.** No brain names its discipline or vocation.
   `farms` does not say *agriculture*. The game has 77 Disciplines and a
   **hand-maintained** vocations register, and 38 brains that connect to
   neither. Consequences: a crew cannot route cooking work to a brain that
   cooks; an NPC's competence dossier and its brain list are unrelated
   data; nothing can report what a person does all day.
2. **What it requires** — of the host and of the world. `feeds` needs a
   host that eats, `shifts` needs an employed host, `fishes` needs water
   and a rod. All undeclared, so a brain on the wrong host fails closed
   and silent. ⚠ **Compare a command view**, which declares
   `args[].requires: <Mixin>` and fails at the binder. Same concept — an
   action pointed at an actor — and the sibling got it right.
3. ⭐⭐⭐ **Importance.** Nothing. Slot-free is not the same as
   available-for-something-more-important: serving a customer does not beat
   wiping the bar, and nothing preempts `idles`. ⚠ And see § *two things in
   the code* — the `interruptibleBy` field exists on ~20 activities, always
   empty, **read by nobody**, so this is inert engine-wide and not a brain
   defect. Suspected mechanism behind
   the [naked-cast starvation](../../subsystems/vitals.md) problem — `eats`
   is a timer, not a drive that escalates.
4. **Composition — they do not.** A flat list of independently-firing
   specs that coexist and contend for slots. No wrapping, no
   policy-over-candidates, no hierarchy. ⚠ Fails lens 2 on the project's
   own words — *variety comes from combination and permutation, not from
   enumeration* — because 38 brains stacked but never combined **is**
   enumeration.
5. **Memory.** Brain state is a per-(host, spec) scratch bag, explicitly
   not persisted. ⚠ **CORRECTED 2026-09-30:** the *eviction* half of this was
   wrong — `BehavedMixin.canEvict()` (Behaved.ts:114-119) **vetoes eviction
   of any host carrying a `behaviors:` spec**, so a behaved NPC never leaves
   memory while the world is up. What survives of the finding is only the
   reboot case, and the plan's D8 consequently persists nothing.

## The lens pass — never run before 2026-09-25

**1 · Pedagogy — partial fail.** A brain exercises no Discipline itself,
but its pedagogical job is real and written down: *"almost all are the same
activities a player-bartender performs — so the NPCs are a live tutorial
for the job"* ([daves-bar-slate](daves-bar-slate.md)). That claim requires
a brain to **be a legible vocation**, and it cannot say which one.

**2 · Creative expression — FAIL, and the headline.** The ordinary case is
strong (stack specs from a palette, no code) and the bespoke case is strong
(14 pack brains). **The middle is missing**: the palette is opaque (a label
that repeats a filename; no statement of which hosts a brain suits), and
nothing composes. An author's only expressive move is *which timers they
stack*.

**3 · Immersion — FAIL.** An NPC on an 11-second idle timer that nothing
important can interrupt reads as machinery. The tell the missing-priority
gap produces: somebody wiping the bar while the room is on fire.
`presenceGated` is the one respect paid to this lens.

**4 · Values — half a loop.** A brain confers no standing, but an NPC does
earn Transcript deeds from work, so the measurement half exists and
nothing judges whether an NPC does its job well.

**5 · Epochs — PASS.** A brain is epoch-neutral by construction; `farms`
works in any century.

**6 · Economy — FAIL, and the most consequential.** Brains **are** the
production side of an economic simulation — `farms` grows food, `delves`
cuts ore, `restocks` buys stock — and **not one declares what it produces
or consumes.** So the data cannot answer *who produces bread in this town*;
`vocations.md` is maintained by hand; and ⚠⚠ **the demand test this
project judges every feature by** (*a vocation exists iff there is unmet
demand*) **is uncomputable**, because supply is buried in 38 imperative
functions.

## Prior art — what each canonical answer would demand of us

| model | what it needs from us | verdict |
|---|---|---|
| **FSM** | one state at a time | we have N independent machines and no machine |
| **Behaviour tree** | composition as the primitive (sequence / selector / decorator) | buys (4) and nothing else; needs authoring tooling to be usable by a non-programmer |
| **GOAP** (F.E.A.R.) | declared **preconditions and effects** per action, plus a planner | cannot exist without (1) and (2); real emergence, expensive, hard to keep legible |
| **Utility AI** (The Sims) | needs with current values; candidates that score themselves | ⭐ fits unusually well — we already have honest needs (vitals, metabolism, exertion's five slow stocks) **and** objects that already advertise affordances. Delivers (3) as a side effect: urgency *is* a need's current value |
| **RimWorld / Dwarf Fortress** | the world posts **jobs**; agents claim by **skill + a priority policy** | ⭐⭐⭐ see below |

### ⭐⭐⭐ The RimWorld finding, and why it matters to crew

RimWorld's work-priority grid **is** the crew's arbitration rule, exposed
as player-facing UI: which colonist does which kind of work, in what order
of preference.

> **And we already have that board — NPCs just cannot see it.** `job post`
> / `job claim` / escrow ships, for players. **Haulage's dispatcher and
> carter already coordinate by claiming off the board.**

Two consequences:

- **Push versus pull collapses when the claimer is an AI**, because the
  claim happens in the same tick as the posting. ⭐ **The board is the
  router.**
- It is a real candidate to *replace* the selector the crew requirements
  currently propose — one mechanism, already shipped for players, that
  would serve the rail, the kitchen, the watch and dispatch alike. It needs
  declaration (1) and priority (3) and nothing else.

## ⭐ What this means for the crew design

Recorded as we go, per the user's instruction, because the crew build is
downstream of every decision here.

- **The crew needs:** what work this member does · whether they can do it ·
  whether they are **interruptible** · an assignment that **persists** · a
  way to be **told**.
- **The LLM brain needs:** what this agent is and does · what it can do
  right now · what it wants · what it remembers · a way to be told things.
- ⭐⭐ **Those are the same list.** Brains being underdesigned is not a side
  issue for crews: the crew is one consumer and the LLM is another, and
  both are blocked on the same declarations.
- ⚠ **`first-free` is unanswerable for 17 of 38 brains**, because they
  declare no claim. The crew's simplest possible rule cannot be
  implemented against today's roster.
- ⚠ **Routing work to a member is meaningless without (3)**, because the
  member cannot be interrupted by importance — only by a slot happening to
  be free.
- ⭐ **The brain-fact eligibility the crew deferred** (the push-at-range
  column: dispatch, the turnout) is precedented by `open?()`, the shipped
  responder seam `talk` uses. It is the same shape as an assignment, and it
  is brain-declared rather than author-set — *"so the spec stays
  `{brain, trigger, config}` and the contention wiring comes along with the
  brain."*
- ⭐ **What the crew can ship without any of this:** the capability gate
  (`order` consulting whether the maker knows the recipe) is a **seat and
  person** fact, not a brain fact — so it *could* ship alone. ⚠ It does not:
  it touches the same code path and the same drive venues, so the *no cheap
  paths* rule folded it in. See
  [agent-coordination-requirements](../../requirements/agent-coordination-requirements.md).

## ⭐⭐ Two things already in the code that this design lands on

**1 · ⚠ CORRECTED 2026-09-30 — the vocabulary is NOT empty; the READER is
missing.** An earlier pass of this slate claimed `AbortReasonRegistry` was an
empty registry with zero entries. **Wrong, and the error was reading the
declaration for the vocabulary.** The declaration in `@saxonberg/types` is
empty *because it is a declaration-merging seam*; it is augmented in **eight
modules** — `lib/activity/Engaged.ts:57` alone adds the five framework
reasons, plus `lib/script/AbortReason.ts`, the two vitals engagements,
`CombatSession`, `Coup`, `AttendanceEngagement`, and the transport pack. The
comment *"harmless because no v1 producer"* sits on the seam, not on the
vocabulary.

**2 · ⚠⚠ What is actually inert is `interruptibleBy`, and it is inert
EVERYWHERE.** About twenty activities declare it — `BehaviorBeat`,
`ManualBuildStep`, `CastActivity`, `SearchActivity`, `DialogueConversation`,
`CombatSession`, `RespirationDrain`, `OfferEngagement`, `HazardActivity`,
`DressingStep`… — and **every single one declares it as an empty `Set`**.
Nothing outside tests ever *reads* it: `SchedulerRegistry` consults
`replaceableBy` at `start()` and its `cancel()` is unconditional.

> ⭐⭐⭐ **So the field is declared twenty times, always empty, and read by
> nobody.** Nothing in this game is interruptible by anything, and the axis
> was never wired rather than merely being unused by brains.

**What that changes for this design:** populating the registry buys nothing on
its own, because nothing reads the set. ⭐ **The arbiter and the call are
`interruptibleBy`'s first consumers** — they must both *fill* it and *read*
it (over a cancel-by-predicate seam). The good news survives: **no new
concept is needed**, the seam is shipped and typed, and a pack adding its own
reason is already the federation-correct shape. The bad news is that this
build owns the reader, so "populate the registry" is not a one-line wave.

## The design — two layers

**Layer 1 · reflex.** Witness-triggered, immediate, no deliberation:
`greets` · `introduces` · `reacts` · `backs-up` · `crossing-ritual`. ⭐ You
do not deliberate about greeting somebody who walked in, and these are
**correct as they stand**.

**Layer 2 · deliberation.** One beat per **agent** (not per spec).
Candidates report how much they want to run; an arbiter picks one; the
winner runs as a real activity that declares what may preempt it.

⚠ There is no per-agent beat today — `BehaviorBeat` is a slot-holder, not a
deliberation tick. Every one of the 38 brains has its own cadence. Layer 2
is therefore a genuine rewrite of the dispatch loop, and per-spec cadence
disappears for deliberative brains (pacing becomes the *agent's* beat).

## ⭐⭐⭐ Urgency is a BAND, not a score

The single most important decision here, and it is what keeps this design
inside lens 1 rather than becoming *a lookup table dressed as chemistry*.

Textbook utility AI normalizes every candidate's motivation onto `0..1`
through authored response curves. **That would fail this project's own
rules outright** — *a number that goes up with no referent* is lens 1's
named failure, and authored weights are exactly that. Worse, it forces
incommensurable units into one scale: there is no honest exchange rate
between *three litres below par* and *waited forty seconds*.

So: **a candidate derives a BAND from its own real quantity, in its own
real unit, and no cross-unit comparison ever happens.**

| candidate | its real quantity | becomes |
|---|---|---|
| hunger | reserve depletion | a band |
| a patron waiting | time waited | a band |
| gin below par | the shortfall, in litres | a band |
| a fire in the room | the harm rate | a band |

Bands are this engine's entire idiom already — competence bands, light
bands, grade bands, spoilage bands, the derive-on-read honesty firewall.
Proposed closed vocabulary: **`idle · wanted · pressing · critical`**.

⭐ **And a candidate returns a band WITH a reason**, so every decision an
NPC makes is explainable in one sentence. That is what carries lens 3
(machinery becomes a person) and it hands the crew its refusal text for
free: *"Mara is restocking — Remy is free."*

### Ties break by kind, and the band is what stops that being brittle

Cross-class order is read straight off the roster: **threat > body > work
> social > filler**. Within a band and kind, the candidate's own
comparison decides.

⚠ Strict lexicographic priority is normally brittle — a trivially hungry
bartender would never serve anybody. **The band fixes it:** slightly hungry
is `wanted`, a waiting patron is `pressing`, so work wins; only a
`critical` body need beats pressing work. The band is load-bearing, not
decoration.

## The declarations a brain makes

| static | what it answers | fixes |
|---|---|---|
| `kind` | threat · body · work · social · filler (closed) | the cross-class order |
| `summary` | what this brain is, in a sentence | ⭐ lens 2 — the CMS palette, today 38 identical filename labels |
| `discipline?` | which of the 77 it practises | lens 1 legibility; connects a brain to the dossier and the vocations register |
| `produces?` / `consumes?` | the **kinds** of flow, never quantities | ⭐⭐ lens 6 — makes the demand test computable instead of hand-maintained |
| `requires?` | host mixins + world preconditions, failing **loud** | the silent-wrong-host class; mirrors a command view's `args[].requires` |
| `claims` | **mandatory** for anything durative | the 17 brains that claim nothing and read as idle |
| `urgency(ctx)` | `{ band, because }` — the new core hook | priority, interruption, and the crew's `first-free` |
| `interruptibleBy` | which reasons preempt it — actually populated | the empty set above |
| `presenceGated` · `ambient` | kept unchanged | the one thing today's model got right |

## ⭐ The board unification

Work candidates come from two places: the agent's **standing duties** (a
seat's work) and **posted jobs**. A posted job becomes a candidate for
every eligible agent — which is the first time an NPC can see the board
players have had since the gig kernel shipped.

> **Assignment is a job posted to a named agent.** So a crew is a policy
> over claim order, not a separate mechanism — and push versus pull
> collapses, because an AI claims in the same tick as the posting.

## ⭐ The LLM seam falls out

The arbiter is swappable. Default: band, then kind order. LLM: hand it the
candidate list with each band and reason, and it picks one.

> **The candidate list IS the prompt.**

Bounded (it can only choose what the world affords) · auditable (one of N
named options, with reasons) · cheap (one call per **decision**, not per
tick) · and it degrades to the numeric arbiter when the model is slow,
absent or expensive. Compare *"the LLM drives the NPC"*: unbounded,
unauditable, per-tick, no fallback.

## What leaves

- **`shifts` and `covers` leave the brain rail** for the roster tick, where
  employment machinery belongs and which already runs hourly. They were
  only ever brains because a cadence was the sole available scheduler.
- **Per-spec cadence** for deliberative brains, replaced by the agent's
  beat. ⚠ A content migration across the 63 rows that author `behaviors:`.

## The cost, stated plainly

The dispatch loop rewritten · 38 brains re-declared across the kernel and
nine packs · 63 content rows migrated · `AbortReasonRegistry` populated ·
and three genuinely new pieces of design: the urgency band vocabulary, the
arbiter, and candidate assembly. **Authorized 2026-09-25** — *"redesign
everything if it improves the design."*

## ⭐⭐⭐ A brain is a TASK, not a vocation — and who bundles them

Settled 2026-09-25, against the pass's own earlier proposal that a brain
declare its vocation:

> **User: "I dunno if I'd want to marry a brain to a vocation but I dunno.
> businesses have different needs even among common vocations like
> archetypes tell us maybe more but I dunno."**

⭐ **The roster is not vocational, and reading it says so.** `restocks`,
`maintains`, `cellars`, `prints`, `reads-water`, `reads-air` are **tasks**,
not jobs. A vocation is a *bundle* of tasks. Marrying a brain to a vocation
is a category error in the other direction: **a brain is finer-grained than
a vocation.**

So the bundle lives somewhere else, and there are two somewheres — which is
exactly the distinction the user drew:

| | answers | why it is there |
|---|---|---|
| **the brain** | a **task** | fine-grained, reusable, nobody's job in particular |
| **the seat** | which tasks **this job** wants done | ⭐ *"businesses have different needs even among common vocations"* — two bars both employ a bartender; one wants theirs to work the cellar. This is `fulfills` generalized from *disciplines-served* to **tasks-owed** |
| **the archetype** | which tasks **this person** tends toward | already the designed relation — [cast-archetype-slate](cast-archetype-slate.md) maps temperament to *"the brain path table"* |

**A person runs the union of their seat's duties and their character's
inclinations**, and the arbiter picks among them. Nothing is married.

⭐ **And that shrinks `discipline?` to something defensible.** It is not
*"this brain is the vocation of X"*; it is *"doing this exercises X"* —
which is the relation a **recipe** already has (`discipline:` on all 97) and
exactly what the Transcript needs to credit the act. Same relation, no new
claim. The vocations register stays derivable, because a vocation rolls up
from the tasks some seat names.

## Rendering the reason — immersion decides

> **User: "whatever is most immersive on the other."**

Three candidates; two are wrong.

| | verdict |
|---|---|
| **never visible** | wastes the best thing the arbiter produces |
| **a readout** — *"Mara: restocking (pressing)"* | ⛔ **refused.** [measurement.md](../../measurement.md)'s no-gauge rule; a UI wearing a person's face |
| ⭐ **visible as behaviour** — *"Mara glances at the near-empty gin bottle and heads for the cellar"* | **this.** The reason rendered as an act, never stated as a value |

The machinery is shipped (Scene, emotes, MML) and the cost is nil: **the
arbiter already computed the reason**, so rendering it is one sentence.
Today an NPC wipes the bar on an 11-second timer with no motive; under this
every act has a cause, and the cause is sayable.

⚠ **One guard, or the room becomes noise** — the `ambient` budget exists
because *a little goes a long way*:

> ⭐⭐ **Render the reason on a SWITCH, not on a beat.** A transition is
> interesting; a continuation is not. *"Mara sets down the cloth and reaches
> for the order pad"* is the switch.

Same insight as the shift-change being witnessed rather than a teleport —
it is what makes the roster **felt**.

**Two surfaces, not one.** Ambient rendering is the switch above. A player
**asking** gets a direct sentence (*"Mara is restocking; Remy is free"* —
the crew's refusal text). That is answering a question, not a gauge. What
stays refused either way is a **list of an NPC's candidates with their
bands**.

## ⭐⭐⭐ What the casting pass on master (2026-09-29/30) does to this design

Two design merges landed while this slate was open, and between them they
supply the **measurement** this redesign lacked and the **frame** it was
missing: [balance-slate](balance-slate.md) § *What an NPC declaration is
DENOMINATED in* and [quest-modeling-slate](quest-modeling-slate.md)
§ *casting happens three times*, with
[lenses/86-character-function.md](../../lenses/86-character-function.md)
behind them.

### The measurement — and it is an independent confirmation

Balance measured what this slate had only argued:

> ⭐⭐⭐ **A cadence trigger costs `1/period`, always, whether anybody is
> there or not. A witness trigger costs nothing until somebody looks.**
> That is the dominant cost axis in the entire NPC layer, it is authored
> per-NPC in content today, and **it had never been read as a budget.**

**65 authored rows, nobody logged in: 257.2 brain invocations per minute —
370,401 per day.** `sellsword` alone is 91,482/day; the top three rows are
43% of all idle load; **60 of 65 rows tick on a clock.**

⭐⭐ **That is this redesign's justification restated as a number, arrived
at independently.** One beat per *agent* instead of one timer per *spec*
collapses N cadences into 1 — Remy's 14.8/min across eight brains becomes a
single beat. The two-layer split is the same finding from the other side:
**the reflex layer is the witness layer, which costs nothing when nobody is
watching.**

⚠ **Sequencing consequence.** Balance proposes the census as a
`lint:*` on the repo's *census-then-ratchet* pattern — sum `60/period` over
every `trigger: cadence:<n>` in every row, pin today's total as a ceiling
that may fall and never rise. **That gate should land BEFORE this build**,
so the redesign's win is measured rather than asserted.

### ⭐ `presenceGated` was the Equity axis all along

Balance's conclusion on the primary axis:

> ⭐⭐⭐ **The primary axis is ON NIGHTLY versus CALLED.** Not *does it
> speak*, not *is it named*. **Does this thing act when nobody is in the
> room?**

That is `presenceGated`, which ships, and which this slate already flagged
as *"the one place these lenses were respected on purpose."* Nobody had
read it as a budget. ⭐ **So the deliberation beat must be presence-gated by
default** — an agent with no audience deliberates rarely or not at all —
and the flag stops being a pacing nicety and becomes the declaration.

And the stage vocabulary is the declaration vocabulary this design needs
for its own beats: **principal · ensemble (on nightly) · understudy (covers
in addition to their own track) · swing (covers several, not in the show
nightly) · standby.** ⭐ *"Equity has the concept SAG lacks: a performer
paid while not appearing… availability is the service. That is exactly what
a cadence brain is — an NPC paid to tick."*

### ⭐⭐⭐ The three passes place every piece of this design

Quest's frame — a thing is cast three times: **pass 1 the code** (which
roles can exist at all; the *grammar*), **pass 2 the content** (who is
nominated), **pass 3 runtime state** (who is actually in the chair). And
*"most confusion turns out to be a decision filed under the wrong pass."*

This design sorts cleanly against it, which is the strongest evidence it is
cut in the right places:

| this design's piece | pass |
|---|---|
| a brain's `kind` · `discipline` · `requires` · `produces`/`consumes` | **1** — the grammar of what a task *is* |
| a row's `behaviors:` list; the seat's tasks-owed; the archetype's inclinations | **2** — who is nominated for what |
| the **arbiter's choice this beat**, the urgency band, the switch-prose | **3** — who is actually in the chair |

⭐ **And the band is a pass-3 quantity by construction**, which is why it
could never have been authored: it is made out of the world's current state,
per agent, continuously. *"There is no final cut."*

### ⚠⚠ The diagnosis that lands on the crew's tie-break

Quest names the failure mode precisely:

> **Reaching for pass-1 vocabulary to make a pass-2 decision.** A
> capability predicate (*anyone composing `SmithMixin`*) is a **grammar**
> constraint; used as a casting criterion it selects for competence and
> therefore **produces the obvious pairing every time. That is allocation
> wearing casting's clothes.**

⭐ **For work, allocation is the honest answer** — you *do* want the better
mixologist on the cocktail, and a rail is not a story. But the frame forces
this design to **say so**: the arbiter allocates, and it must never be sold
as characterful casting. Character enters at pass 2 (the archetype's
inclinations) and through the switch-prose, never through the comparison.

⭐⭐⭐ **And it dissolves a rule.** See
[call-slate](call-slate.md) § *Blocked on the brain substrate*:
junior-first was an authored tie-break justified by fiction. Under this
design the senior's *serve-this-order* candidate simply reports a lower band
because they are mid-count — **so junior-first is not a rule, it is a
consequence.** One derived comparison replaces a three-legged authored
chain.

### The understudy is `covers`, generalized

Quest's open n+1 — *"Pass 3 may override pass 2, and that is where n+1
lives. Dave dies; the understudy steps in"* — is the same question as the
shipped `covers` brain (the proprietor filling a gap) and the same question
as a crew whose rostered member is absent. ⭐ **Three slates had it
separately; it is one seam**, and it is a pass-2→3 override.

⚠ And one finding from balance that bears on crews directly: **six
identical goods-yard `hand` rows**, each named, each `Cast`, each
cadence-only with zero witness brains. Six one-person businesses that are
six copies of the same person — the crew that isn't.

# ⭐⭐⭐ What we mean by INTELLIGENCE — the declared profile

*Opened 2026-09-30. It supersedes the five-kind taxonomy above in one
specific way; see § the correction at the end of this part.*

> **User: "what do we mean when we talk about 'intelligence' as applied to
> non-interactive agents in this game? in expressing meaning we find our
> vocabulary. you won't find it just by looking at whatever routines our
> npcs currently run, I can guarantee it is necessarily incomplete."**

And the pattern it has to fit — the one this project already uses wherever a
metric will not derive:

> **The author declares their intent · a body reviews the implementation for
> correctness · the two are published together.** The record of author intent
> expresses ideas in the author's head that never come out in the runtime.
> Precedent: the NPC compute declaration ([balance-slate](balance-slate.md)).

⭐⭐ **That constrains the vocabulary completely.** Whatever we name must be
**a claim an author makes that a reviewer can falsify.** Which rules out a
catalogue of behaviours — and rules out the shape this slate kept reaching
for:

> ⭐⭐⭐ **Intelligence is not a level. It is a PROFILE OF FACULTIES,
> declared and reviewed.**

A scalar would be the same mistake refused three times already — *"nobody can
honestly declare I will use 4.2 compute units"* (the compute declaration),
the authored utility weight (§ *urgency is a BAND*), and a static priority
number. **A more intelligent NPC is not a better one; it is a more expensive
one that makes more promises.**

## ⚠ First — why the taxonomy above was too narrow

The five kinds earlier in this slate (*threat · body · work · social ·
filler*) were read off the shipped roster and checked against
[vocations.md](../../vocations.md)'s gap matrix. **So they are an economic
simulation's kinds, validated against an economic simulation's backlog** —
and a MUD's content space is not that.

Take the space seriously: a Narnia area, Camelot, a Star Trek ship, a
McDonald's, a Monopoly board, an area that is somebody's drug trip. Plus the
MUD canon — the rumour-mongering barkeep, the town crier, the gate guard, the
trainer, the guildmaster, the cryptic oracle, the puzzle NPC that wants a
password, **the ghost repeating its death forever**, the statue that animates
on a condition, the boss with phases, the swarm, the companion who approves
of what you did, the rival racing you for the loot, and **the chorus that is
not in the world at all and comments on it.**

⚠⚠ **What that breaks is the arbiter's premise.** Candidates competing on
urgency is a machine for resolving **interests**, and a large share of the
space has none:

- the **Monopoly banker** wants nothing; it *permits or refuses*. It is a
  **rule wearing a body**.
- a **gate guard** has no urgency.
- a **hallucination** has no wants; it **manifests**.
- a **chorus** has no wants; it **comments**.
- the **Green Knight** is driven by neither his needs nor the world's state,
  but by **a story's clock** — he sets a return date a year hence.

## Axis 1 — the DRIVE-MODE: what wakes it (closed, four)

⭐ **Only one of the four uses the arbiter.** This is the most load-bearing
declaration in the vocabulary, because it decides whether deliberation is
involved at all.

| drive-mode | wakes on | shipped · the wider space |
|---|---|---|
| **reactive** | something happening to it | `greets` `introduces` `reacts` `wary` `backs-up` `tree-dialogue` `reads-water` `crossing-ritual` `combatant` — the gate guard, the banker, the oracle-when-asked, the puzzle NPC |
| ⭐ **deliberative** | its own beat, competing on urgency | `farms` `fishes` `eats` `restocks` `idles` `wanders` — **the only mode the arbiter serves** |
| ⭐⭐ **cued** | a condition in **another's arc** | `prints` (an edition window) — the Herald, the Crossing, the Return, a tournament, a boss's phases, Mordred's betrayal |
| **manifest** | a **perceiver's** frame | ⛔ **nothing ships.** Every vision, dream figure, apparition and drug-trip NPC |

⚠ **Why `cued` and not `scheduled`.** A calendar is the *degenerate* case.
The Herald does not fire on a clock, it fires at **the hero's position in an
arc** — so the mode is a condition in somebody else's story and a date is
merely the simplest such condition. ⭐ That merges with
[quest-modeling-slate](quest-modeling-slate.md)'s beats-fire-on-conditions
rather than sitting beside it, and it is why Campbell's *Rescue from Without*
is not exotic: it is a structural beat that needs **reach** (the matrix in
[call-slate](call-slate.md)).

⚠ **`manifest` has zero consumers today**, which is the argument that cut
`actsAsOne`. The difference: `manifest` is a **declaration**, not a
mechanism. Declaring the mode costs nothing and leaves the door on its
hinges; *implementing* per-viewer behaviour is a later build over
[belief.md](../../subsystems/belief.md)'s per-viewer substrate.

## Axis 2 — the FACULTIES: what the mind does (declared, reviewable)

Ten. Each independently assertable, observable from outside, and — the test
that matters — **each has a legitimate NO that is a design choice rather than
a deficiency.**

| faculty | the claim | a legitimate no |
|---|---|---|
| **notice** | it registers what happens near it | scenery; a statue |
| **recall** | it carries something forward about **you** | the shop that never knows you |
| **want**⟨self · other · office⟩ | it has ends that compete | a rule; a symbol |
| **choose** | it arbitrates among its own options | it does one thing, forever |
| **learn** | doing changes what it can do | ⭐ a god does not improve |
| **plan**⟨self · other · office⟩ | it acts toward something not reachable now | act-by-act |
| **regard** | it acts on what it believes **you** know or feel | treats all comers alike |
| **speak** | it can say something nobody authored | scripted lines; a liturgy |
| **judge** | it decides about a person, on a criterion | permits everyone, or no one |
| ⭐⭐ **mask** | it presents other than it is, **discoverably** | it is what it looks like |

⭐⭐ **`want` and `plan` take an OBJECT, and the object is the whole
difference between a Mentor and a Shadow.** The crone plans toward *your*
end; the Minotaur toward its own; the custom-house officer toward **the
office's**. That third is the Monopoly banker and the meat inspector — where
an office's ends enter a mind without becoming a seat.

## Running it against Campbell

⚠ Attribution: the Herald, supernatural aid, the threshold guardian, the
ogre-father/atonement, the goddess, the temptress and *rescue from without*
are **Campbell's** stages. **Shadow · Shapeshifter · Mentor** as named
archetypes are **Jung's**, popularized by Vogler. The reading is ours.

| figure | profile | defining property |
|---|---|---|
| **The Herald** (the frog at the well; the stag that leads astray) | `notice` + one scripted utterance | ⭐ not a faculty at all — **it appears at the right moment and then stops mattering** |
| **The Threshold Guardian** (the Sphinx; the custom-house; the dragon) | `notice` · **`judge`** | it decides whether you pass, on a criterion, and *nothing else* |
| **Supernatural Aid** (the crone; Athena; the ferryman) | `regard` · `plan`⟨other⟩ · **no `want`** | it plans toward **your** end |
| **The Ogre-Father / Atonement** | `want` · `plan` · `regard` · **`mask`** | ⭐⭐ the terrible and the merciful father are **one figure**, and the hero's task is to see through it |
| **The Goddess / boon-giver** | `regard` + a gift | again, another's ends |
| **The Trickster** (Raven; Maui) | **`mask`**, declaredly unreliable | its behaviour is *not predictable from its declaration* |
| **Rescue from Without** | reactive — to your failure, **elsewhere** | the hero often cannot return alone |
| **The Shadow** *(Jung)* (the Minotaur; Bluebeard) | `want`⟨self⟩ · `plan` · `regard` | its wants are **opposed to yours** |

### What the exercise CONFIRMED

1. ⭐⭐ **`judge` is load-bearing, not marginal.** This slate had it down as
   the faculty most likely to be cut, and as probably belonging to the seat
   rather than the mind. **Wrong twice.** The Threshold Guardian is one of
   the monomyth's structural figures and is *nothing but* `notice` + `judge`
   — and the Sphinx judges **by riddle**, a test of the mind, not an office.
2. **The grain is right.** Almost every archetype uses **two or three**
   faculties. A vocabulary whose canonical cases each use a third of it is
   the right size.
3. ⭐⭐⭐ **Almost no archetype has `learn`.** Campbell's figures **do not
   change — the hero does.** The guardian, the herald, the crone and the ogre
   are fixed; transformation belongs to the protagonist.

> ⭐⭐⭐ **Which means the game currently has it exactly backwards.** Mara
> *learns* — she earns Transcript deeds from work her competence did not even
> affect — and cannot **want** anything. The cast grows and the world does
> not move. The mythic shape is the reverse, and the coordination build adds
> precisely `want` and `choose`.

### What the exercise BROKE

1. ⭐⭐ **`want` / `plan` needed an object** — added above. Without it the
   Mentor and the Shadow are the same declaration.
2. ⭐⭐⭐ **`mask` was missing, and it is a whole class** — the Ogre-Father,
   the Trickster, the disguised king, the wolf in grandmother's clothes. The
   game ships the substrate (per-viewer recognition, disguise) and the
   vocabulary had no word for it.
3. **Opposition is a RELATION, not a faculty** — the Shadow's defining
   property belongs to the *pair*, and sides/parties already ship. Correctly
   **out**.
4. ⚠ **`scheduled` was the wrong fourth mode** → `cued`, above.

## Axis 3 — FUNCTION tags: what it is to the fiction (open)

*worker · threat · body · companion · **rule** · **oracle** · **teacher** ·
**spectacle** · **symbol** · **chorus** · host · rival · herald · guardian ·
penitent…*

⭐ **Open, and the engine must never reason about it.** Closed roots, open
leaves — the [topics.md](../../subsystems/topics.md) shape, its third
application here after `cast-archetype`. A pack adds a function and no kernel
list changes.

⭐⭐ **And the task-not-vocation decision gets STRONGER under the widening.**
Tumnus is `hosts` + `informs` + `betrays` + `repents`. The Borg is a threat
plus a collective decision. Ronald is `spectacle` + `sells`. **Each is one
task; the person is the bundle** — which is how an author builds Tumnus
without the engine ever knowing what Tumnus is.

## What is OUT, and why

| | why |
|---|---|
| **opposition** | a relation between two agents → sides/party, shipped |
| **collectivity** (the Borg, a swarm) | *whose* choice it is → the call ([call-slate](call-slate.md)) |
| **cohesion** (a set that moves together) | nothing in the game has it; building it would be invention |
| **a priority number** | the band is derived; a static weight is the authored-weight failure |
| **a vocation field** | settled — a brain is a **task** |

## ⭐⭐ Why the DECLARATION earns its keep — three reasons, one of them new

**1. A declared limit is a promise the world keeps.** The classic MUD failure
is an NPC that *looks* like a person until you probe it and find the edge,
and the world goes thin. If the author declared **no `recall`**, the player
who is not remembered has not been cheated — the fiction said so.
⭐ **Declared edges are honest; discovered edges are disappointing.** That is
[uncertainty.md](../../uncertainty.md)'s abstraction law in another voice.

**2. The faculties ARE the cost drivers**, so the compute declaration derives
from the mind rather than sitting beside it:

| faculty | what it costs |
|---|---|
| `notice` | witness triggers — free until somebody looks |
| `want` + `choose` | the beat — the whole 370,401/day axis |
| `recall` · `regard` | ledger reads per decision |
| `plan` | the expensive one |
| `speak` (generative) | a model call |

⭐⭐⭐ **An author declares a MIND; the budget falls out** — which is
[balance-slate](balance-slate.md)'s own rule (*the scalar should be DERIVED
from a cast list, never authored directly*) taken one level up.

**3. ⭐⭐⭐ And `mask` is why the pattern cannot be replaced by derivation.**
An author declaring *"this agent presents other than it is"* is declaring
that **the rest of the profile is what it SEEMS to have.** So the record
holds **two profiles — the seeming and the true** — and no static analysis
can ever derive the first, because it is a fact about intended deception.
**That is the first place the intent record does something a lint could not.**

## What a reviewer checks — and how much is mechanical

Two falsifiable directions:

- **Over-claim** — the declaration says `recall` and nothing on this host
  ever writes a belief row. **A dead promise.**
- **Under-claim** — a task reads regard and the declaration never said
  `regard`. A surprise, and an **uncosted** one.

⭐ Most of that is **mechanically checkable**: does any task on this host
declare `urgency` (→ `want`/`choose`)? read belief (→ `recall`/`regard`)?
append a Transcript row (→ `learn`)? call a model (→ `speak`)? **So the
declaration becomes a GATE**, and the body's review is needed only for what a
lint cannot see — whether the fiction's promise matches the mind's shape, and
the two profiles `mask` implies.

## ⚠⚠ What of this is in the coordination build, and what is not

**In** ([agent-coordination](../../requirements/agent-coordination-requirements.md)):
the five economic kinds as `TASK_KINDS` with their order, the urgency band,
and the reflex/candidate split. **Not in:** the faculty declaration, the
four-mode axis, the open function tags, `mask`, `manifest`, `cued`.

⭐ **So this part of the slate is the shape the vocabulary must GROW INTO,
and the build's job is only to not contradict it.** Two concrete obligations
on the build:

1. the five kinds must be **reachable from** the open function vocabulary
   rather than replaced by it — they are *functions*, not modes;
2. `TASK_KINDS` must not be named or documented as though it were the whole
   axis. **The modes are the closed thing; the functions are not.**


## Open questions — what is still open

**Closed by the 2026-09-25 pass:** reflex vs candidate → **both, two
layers** · where priority lives → **a derived band per candidate** ·
`shifts`/`covers` → **they leave**.
**Closed by the 2026-09-30 pass:** what "intelligence" means → **a declared
faculty profile, not a level** · the vocabulary's axes → **three: closed
drive-modes × declared faculties × open function tags** · does a brain
declare its vocation → **no, a brain is a task** · is `judge` a faculty or a
seat's business → **a faculty, and load-bearing (the Threshold Guardian)** ·
is the reason player-visible → **yes, as behaviour on a switch**.

**Still open:**

1. **The urgency band vocabulary.** `idle · wanted · pressing · critical`
   ships in the coordination build with each rung a distinct arbiter
   behaviour. Whether four survives contact is a drive question.
2. ~~**Brains versus player SCRIPTS — one vocabulary or two?**~~ ⭐⭐⭐
   **SETTLED 2026-09-30 — see § Brains and scripts, below.** One task
   vocabulary, one contention mechanism, **two arbiters**, and a presence
   rule. The deciding fact was a live defect: nothing cancels a player's
   coroutines on linkdead.
3. **Does `spectacle` fold into `presenceGated`?** Behaviour that exists *to
   be watched* — the tournament, the busker, Ronald — is what the flag half
   encodes. ⚠ But *cheap when unwatched* and *pointless when unwatched* are
   different: a farmer unwatched should still farm; a busker should stop.
4. **Is `manifest` declared now or later?** Zero consumers, but declaring a
   mode costs nothing (§ the drive-modes).
5. **Where the faculty declaration LIVES.** A row field beside `behaviors:`?
   A parcel-level publication artifact, like the compute declaration? ⭐ The
   compute precedent says the declaration is made **at publication**, which
   suggests the latter — and then a row's tasks are checked against the
   parcel's claim.
6. **Who is "a body"?** The review half of declare-and-review needs a
   reviewer. The Compact's committees, a maintainers list, or the pack
   `maintainers:` field that already exists.
7. **What persists** for a `plan`-bearing agent. Nothing persists in the
   coordination build (`canEvict` makes that safe), but a multi-step plan
   across a reboot is the first thing that needs more.
8. **`speak` and the LLM.** The arbiter is swappable and the candidate list
   is the prompt shape; the faculty is declarable now, the wiring is
   [llm-content-slate](llm-content-slate.md)'s.

## ⭐⭐⭐ Brains and scripts — settled 2026-09-30

Half of this was already answered and the slate had missed it.
[npc-behavior-slate](npc-behavior-slate.md) carries the automation ladder —
*canned · tree · intent-match · scripted · generative* — and states:

> **The brain-type is the rung; whether its config is data or a script is
> the TIER. So scripting is just the `scripted-behavior` brain** (the
> code-tier tail), and LLM is the `llm-brain`. **Nothing about NPC behavior
> is a separate paradigm.**

That settles *a script serving as a brain*. What it does not settle is **a
player's own script**, and grounding that turned up a live defect.

### ⚠⚠ The live defect that decided it

`ScriptLogic` keeps `RUNNING = new Map<string, Set<Coroutine>>()` — a
per-actor registry of running coroutines keyed on `stuffId` — and
`cancelAllImpl` reads `currentActor()`, so it is the player's own
`stop`/`cancel` barge-in. **Nothing cancels on linkdead:**
`Avatar.onLinkdead` fires events and touches the estate, coroutines are not
in it, and the registry key survives the drop. Coroutines ride
`WorldClockApi.after`, so they are game-time and server-side.

> **A player can `clock on`, start an `every 5m` script, disconnect, and the
> script keeps acting through their body on the game clock — earning wages.**

⚠ That walks straight through the gate [employment.md](../../subsystems/employment.md)
says `clock on` exists to be: *"writing the applicant a slot with the seat's
hours pays them present or not, which is the AFK wage lens 6 names a
failure."* **The gate is on ROSTERING; nothing gates ACTING.** Offered to
[livelihood-slate](livelihood-slate.md) §5.4, which already holds the AFK
wage gate, as its concrete instance.

### The settlement, in four parts

**1 · One task vocabulary.** A script declares the same things any task does
— `kind`, `discipline`, `produces`/`consumes`, `requires`, `claims`,
`judges`. No second vocabulary, per the tier rule above.

**2 · One contention mechanism.** A brain and a script act through **one
body**, so `claims` / `requiresFree` / `interruptibleBy` are shared. ⚠ Today
they are not: a script declares no slots, so a player's script and their own
typed command can collide in ways an NPC's brains cannot.

**3 · ⭐⭐⭐ But TWO arbiters, and this is the crux:**

> **`urgency` exists because an NPC has nobody to ask. A player has
> themselves.**

An NPC's arbiter is the engine's band comparison; **a player IS their own
arbiter**, supplying priority by typing. So a player's script needs no
urgency at all, and merging the deliberation layers would be the engine
deciding what a player wants — a category error that fails lens 3b.

**4 · ⭐ And the presence rule is the teeth:**

> **A script is a tool you operate, not a deputy that replaces you.**

A player's coroutines **suspend when presence drops** and resume on
reconnect, cancelling at the short clock that already vacates seats.
Rationale: [uncertainty.md](../../uncertainty.md)'s abstraction law — *an
abstraction is legitimate while it still costs somebody the activity* — and
the absent-body doctrine's own line, that **the pause is on AGENCY, not the
world.** A script is agency.

### ⭐⭐ The consequence that makes it elegant

> **The same script text is a TOOL or a MIND depending on whose body it
> drives.**

Driving *your* body it suspends when you leave. Installed as a cast
member's brain it runs on the world's clock, because the NPC is its own
principal. The engine already tells these apart (`currentActor()` versus the
host), and their budgets are already correctly separate:
`ScriptLogic.resolveLimits(authorPath)` tiers by **authorship**, so a
player's script draws on the player's ceiling and a released brain on the
platform's.

⚠ **What this does NOT license:** a player's script holding a shift, and a
player's body carrying an urgency band. Both are refused above.

## Cross-references

- [behavior.md](../../subsystems/behavior.md) — the shipped model this interrogates
- [npc-behavior-slate](npc-behavior-slate.md) — the feature backlog; ⚠ asks none of the above
- [call-slate](call-slate.md) — the consumer that exposed the gap; the routing matrix
- [agent-coordination-requirements](../../requirements/agent-coordination-requirements.md) — ⭐ the build: the arbiter, the call and the capability gate as one
- [llm-content-slate](llm-content-slate.md) — the LLM brain ambition, the other consumer
- [advancement.md](../../subsystems/advancement.md) — 77 Disciplines, bands, and NPC/player symmetry
- [vocations.md](../../vocations.md) — the register that is maintained by hand because (1) is missing
- [activity.md](../../subsystems/activity.md) — engagement slots, the only arbitration that exists today
- [design-lenses.md](../../design-lenses.md) — the pass above
