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

## Open questions — the conversation to have

1. ⭐⭐⭐ **Is a brain a REFLEX or a CANDIDATE?** The structural fork
   everything hangs off. Today a trigger fires and the brain acts. The
   alternative: the agent has one beat and *chooses* among candidates that
   score themselves. The lean recorded in conversation: **both, as two
   layers** — a reactive layer (witness triggers; you do not deliberate
   about greeting someone who walked in) over a deliberative layer (what
   am I working on). Needs deciding before anything else.
2. **Does a brain declare its vocation, or does the SEAT?** A crew could
   read `fulfills` off the position instead. ⚠ But an agent with no job — a
   wolf, a pet, a wanderer — has no seat, so the brain must be able to say
   it independently.
3. **Is "what it produces / consumes" declarable at all?** Production is
   dynamic (a farm yields what the soil gives). Possibly only the **kind**
   of flow is declarable, not the quantity — which may be enough for the
   vocations register and the demand test.
4. **Where does priority live** — on the brain (static), on the spec
   (authored), or derived from the need it serves (utility)? The five-kind
   ordering above is the cheap answer; utility is the honest one.
5. **What persists?** Today nothing. An assignment, a queue position and a
   part-finished task all need to, and residency evicts the host.
6. **Do the two cron-jobs-in-brain-clothing (`shifts`, `covers`) leave?**
   If a brain becomes a deliberative candidate, employment machinery on the
   brain rail is a category error with a real cost.
7. **What does the CMS palette show?** Today: 38 identical filename
   labels. This is the authoring surface lens 2 fails on.

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
