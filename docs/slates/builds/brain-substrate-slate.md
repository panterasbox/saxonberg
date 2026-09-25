# Brain substrate slate — what a brain IS

> **Status: IN CONVERSATION, opened 2026-09-25.** A design cycle, docs
> only. It exists because the [crew](crew-slate.md) build turned out to be
> a layer of dynamism balanced on an undesigned one:
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
> **Size:** a design cycle, then a build.

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
   wiping the bar, and nothing preempts `idles`. Suspected mechanism behind
   the [naked-cast starvation](../../subsystems/vitals.md) problem — `eats`
   is a timer, not a drive that escalates.
4. **Composition — they do not.** A flat list of independently-firing
   specs that coexist and contend for slots. No wrapping, no
   policy-over-candidates, no hierarchy. ⚠ Fails lens 2 on the project's
   own words — *variety comes from combination and permutation, not from
   enumeration* — because 38 brains stacked but never combined **is**
   enumeration.
5. **Memory.** Brain state is a per-(host, spec) scratch bag, explicitly
   not persisted, and residency evicts cold NPCs. So *"I was told to go to
   the alley"* and *"I am halfway through the count"* cannot survive a
   reboot or an eviction.

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
  person** fact, not a brain fact. It is independent and fixable now. See
  [crew-requirements](../../requirements/crew-requirements.md).

## ⭐⭐ Two things already in the code that this design lands on

**1 · The importance vocabulary exists and is EMPTY.**

```ts
// packages/types/src/index.ts
export interface AbortReasonRegistry {}          // declaration-merging
export type AbortReason = keyof AbortReasonRegistry;   // therefore: never
```

The comment beside it reads *"so `AbortReason = never` in v1. Harmless
because no v1 producer."* It is a **closed-but-pack-extensible registry
with zero entries** — exactly the federation shape a vocabulary is
supposed to have here, and nothing has ever filled it.

**2 · And brains opt out of it explicitly.** `BehaviorBeat` — the
slot-holder that makes an instant brain's `claims` real for a contention
window — declares:

```ts
readonly interruptibleBy: ReadonlySet<AbortReason> = new Set<AbortReason>();
```

⚠ **Empty. An NPC greeting you cannot be interrupted by anything the
framework is able to express.** So importance is not wholly absent: the
activity framework has the seam, the vocabulary has a home, and the brains
decline to participate. **This design needs no new interruption concept** —
it needs the registry populated and that set to stop being empty.

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

## Open questions — what is still open

**Closed by the 2026-09-25 pass:** (1) reflex vs candidate → **both, two
layers** · (4) where priority lives → **a derived band per candidate, with
cross-class order read off the roster** · (6) `shifts`/`covers` → **they
leave**.

1. **The band vocabulary itself.** `idle · wanted · pressing · critical` is
   a proposal. Four rungs is the guess; the light bands use six and
   competence uses five.
2. **Does a brain declare its vocation, or does the SEAT?** ⚠ An agent with
   no job — a wolf, a pet, a wanderer — has no seat, so the brain must be
   able to say it independently. But an employed agent then has two
   sources, and they can disagree.
3. **Is `produces` / `consumes` declarable at all?** Production is dynamic
   (a farm yields what the soil gives). The lean: only the **kind** of flow
   is declarable, which is enough for the register and the demand test, and
   nothing pretends to know the quantity.
4. **What persists?** The lean: the **current intention** (what I am doing
   and why) persists on the host, and the scratch bag stays transient.
   Residency evicts the host, so it must ride the host's own snapshot.
5. **How often does an agent deliberate**, and what wakes it early? A
   posted job and a `critical` band both want to preempt the next beat
   rather than wait for it.
6. **Does the arbiter's reason become player-visible?** It is the crew's
   refusal text and an NPC's legibility, but ⚠ measurement.md's no-gauge
   rule means it must read as a sentence about a person, never a readout.
7. **What fills `AbortReasonRegistry`**, and who may add to it? A pack
   shipping its own reason is the federation-correct answer; the kernel
   owning the closed set is the legible one.

## Cross-references

- [behavior.md](../../subsystems/behavior.md) — the shipped model this interrogates
- [npc-behavior-slate](npc-behavior-slate.md) — the feature backlog; ⚠ asks none of the above
- [crew-slate](crew-slate.md) — the consumer that exposed the gap; the routing matrix
- [crew-requirements](../../requirements/crew-requirements.md) — the capability half, independent of brains
- [llm-content-slate](llm-content-slate.md) — the LLM brain ambition, the other consumer
- [advancement.md](../../subsystems/advancement.md) — 77 Disciplines, bands, and NPC/player symmetry
- [vocations.md](../../vocations.md) — the register that is maintained by hand because (1) is missing
- [activity.md](../../subsystems/activity.md) — engagement slots, the only arbitration that exists today
- [design-lenses.md](../../design-lenses.md) — the pass above
