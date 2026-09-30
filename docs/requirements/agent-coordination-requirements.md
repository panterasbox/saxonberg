# Agent coordination — requirements

**Kind:** feature
**Leads from:** kernel — first consumers are **Dave's Bar** and **the
Hearthworks**, in this build, with the market bakery and a goods-yard outfit
walked as the world-didn't-break check. The build roster the content that
exercises it, because nothing in the realm exercises it today.

Ask the game *who serves this drink* and it answers by sorting identity-path
strings. Ask an NPC *what are you doing and why* and there is nowhere for the
answer to live: 38 brains fire on independent timers, 17 of them claiming no
engagement slot at all, none of them able to be interrupted by anything more
important. And ask a bartender *can you make this* and nobody asks — `order`
is the one craft verb in the game exempt from the knowledge gate, and it is
exempt because **not one of the realm's 70 authored people holds a can-make
deed for anything.**

> **Who acts for us, and can they actually do it.**

Those are one question and this is one build. It makes an NPC decide rather
than tick, lets a house say how it chooses among the people who could, and
requires that whoever is chosen actually knows how.

⭐ **The thing an author cannot do today and can afterwards:** put **two
people in one workplace.** All 34 employers in the realm are one-person
businesses — including six goods-yard outfits that are six copies of the same
hand — not by choice but because nothing supports a second. This is what lets
a **firm** exist instead of a sole trader, and it is what makes a job a
player takes a job they hold *alongside people*.

⭐⭐⭐ **And the deck already named why that matters**
([#86](../lenses/86-character-function.md), belonging to lenses 3b and 6):

> **Every NPC doing two jobs is a vacancy we deleted.** When one NPC holds
> more than one seat: does the economy justify one person doing both, or was
> it cheaper to author?

Three people in this realm hold two seats each and thirty-four employers hold
one person. ⚠ **Those are not efficient NPCs; they are deleted jobs** — and
lens 3b's whole mechanism is *NPC/player interchangeability at the position
level*, where **every NPC-held seat is a standing vacancy, visible and
takeable, and replacement is legible**. Today that is claimed and broken: a
player who takes a seat takes **every** order by path-sort, so replacement is
not legible, it is total. **This build is what makes the claim true.**

Seeds: [agent-coordination-slate](../slates/builds/agent-coordination-slate.md)
(the arbiter) · [call-slate](../slates/builds/call-slate.md) (the call) ·
[daves-bar-slate](../slates/builds/daves-bar-slate.md) and
[livelihood-slate](../slates/builds/livelihood-slate.md) §5.4 (what stays
behind) · [balance-slate](../slates/builds/balance-slate.md) §the NPC
declaration (the measurement and the stage vocabulary) ·
[quest-modeling-slate](../slates/builds/quest-modeling-slate.md) §casting
happens three times (the frame). Absorbs
`maker-knowledge-requirements.md`, retired into this doc.

---

## What already exists

### The verbs are all there

`order` · `menu` · `mix` · `serve` · `apply` · `appoint` · `clock on`/`off` ·
`quit` · `house roster` · `house stock` · `job post`/`claim`/`complete` ·
`tip` · `collect`. **This build adds no verb.** It changes what shipped verbs
consult, what NPCs decide, and what authors may declare.

### What a seat can already say, and what nothing reads

A position carries `fulfills` (which disciplines an order routed here is
served in), `headcount`, `purchases`, `requires` (a **closed**
`{gigs, discipline, band}` criterion) and `reportsTo` (an organization's
chain, walked nearest-superior-first). `isFulfilling(discipline)` is three
conditions, all of them: on shift · the seat lists the discipline · standing
somewhere the house operates.

⚠ **`fulfills` says who MAY, never who DOES when several qualify** — the
subsystem doc's own words.

### A brain declares six things, and one of them is a filename

`label`, `claims`, `requiresFree`, `presenceGated`, `ambient`, `act()` — plus
`open?()` on dialogue brains. Measured over all 38:

- **All 38 labels are the filename repeated.** `farms` → `label = 'farms'`.
  That field is the CMS palette's only description.
- ⚠⚠ **17 declare no engagement slot** — `farms`, `delves`, `weaves`,
  `restocks`, `cellars`, `maintains` among them. **A farmer working a field
  claims nothing**, so an NPC mid-harvest reads as **idle**.
- **One brain reads personality** (`converses`, one axis). 47 rows author
  `dispositions:` and nothing else consumes them.
- ⭐ **Priority has been invented once, privately** — `nurses` carries *"a
  triage rank (higher = more urgent)"* because it could not work without one.
- **Two "brains" are cron jobs** — `shifts` and `covers` ride the brain rail
  because a cadence was the only scheduler available.

### The interruption axis is typed, declared twenty times, and read by nobody

⚠ **Corrected at plan grounding.** An earlier draft of this doc said the
`AbortReasonRegistry` vocabulary was empty. It is not — it is augmented in
**eight modules**, five framework reasons in `lib/activity/Engaged.ts` alone;
the empty declaration in `@saxonberg/types` is the declaration-merging seam,
not the vocabulary.

**What is actually inert is `interruptibleBy`.** About twenty activities
declare it — `BehaviorBeat`, `ManualBuildStep`, `CastActivity`,
`DialogueConversation`, `CombatSession`, `RespirationDrain` and more — and
**every one declares it as an empty `Set`**, while nothing outside tests ever
reads it (`SchedulerRegistry` consults `replaceableBy`; its `cancel()` is
unconditional).

> ⭐⭐ **So nothing in this game is interruptible by anything**, engine-wide.
> The seam is shipped and typed; this build owns its first reader.

### What it costs to tick

**65 authored rows, nobody logged in: 257.2 brain invocations per minute —
370,401 per day.** `sellsword` alone is 91,482; the top three rows are 43% of
idle load; **60 of 65 tick on a clock.** ⭐ *"A cadence trigger costs
`1/period`, always. A witness trigger costs nothing until somebody looks."*
And `presenceGated` is the shipped form of that axis — *on nightly versus
called* — never read as a budget.

### The knowledge ladder, and the three verbs outside it

- **Claim (known-of)** — reading a source, or watching a maker perform.
- **Deed (can-make)** — *"only your own first faithful by-hand performance…
  The book isn't enough — **the hands learn**."*
- **Wiki-parity:** *"information buys optimization, never competence."*

Five one-shots decline without the deed — `make`, `cook`, `forge`, `bake`,
`preserve`. **Three do not: `order`, `mix`, `serve`.** The by-hand steps
`muddle`/`strain`/`garnish` correctly do not gate; performing by hand is how
the deed is *earned*.

> ⭐⭐ **So the shorthand is earned everywhere in the game except at a rail,
> where it is free.**

⚠⚠ And the dossier **cannot** close it: its entries expand into *"the same
rows a lived history would have written, **marked `claim`**"* — a claim is
known-of. **No authored person has ever held a can-make deed.** That is why
`order` is ungated: gating it today closes every venue in the realm.

### Nothing coordinates, and nothing has needed to

Across **34 employers**, the count with two simultaneously-on-shift holders
of same-discipline seats is **zero**. Dave's four bartenders are staggered
with no overlap; the Hearthworks' `kitchen-hand` — `fulfills: [cooking]`,
`requires: {gigs: 2}` — is **unrostered**. ⚠ The tie-break's own comment
describes two people who have never stood in a room together. **Every seat
was authored as a singleton because nothing supported anything else** — and
the demand is on record in the four places `headcount` is authored.

⭐⭐ **The one live consequence is the player's.** The tie-break sorts
ascending on identity path; a player's begins `/platform/`, every NPC's
begins `/world/`. **The first player to join any workplace takes every
order, forever, and the staff beside them go silent.**

### And membership, sides and formations are not this

The grouping facade answers *who belongs* (members plus a coarse
owner/admin/member role, no room for behaviour). A party answers *whose side
am I on*. A formation answers *given we are already fighting as one side, who
does what* — it never decides whether a set turns hostile. ⭐ The **job
board** answers *who claims this*, for players only: `job post` / `job claim`
/ escrow, and haulage's dispatcher and carter already coordinate by claiming
off it.

> ⭐ **The engine has the worker-chooses answer and no boss-chooses answer.**

### Therefore what is genuinely new here is

An agent that **chooses** what to do next instead of running timers; a
declared vocabulary for **what a task is, what it needs and how much it
matters**; a house-authored rule for **who among the able is called**; a
**capability gate** so that being called means being able; and enough
authored overlap that any of it happens with no player in the room.

## Goals

**The agent decides.**

- **An NPC has one deliberation beat** and chooses among candidate tasks,
  rather than N timers firing independently.
- **An NPC can be interrupted by something more important**, and *"more
  important"* is a real comparison rather than a free engagement slot.
- **An NPC's choice is explainable in a sentence**, and the world shows it as
  behaviour when the choice changes.
- **An author can read a brain palette and know what each brain is for**,
  which host it suits, and what it produces or consumes.
- **A task declares what it exercises**, so what a person does all day and
  what they get credit for are the same fact.
- **Idle cost falls and is measured**, not asserted.

**The house calls.**

- **A house authors how it chooses** among the people who could serve, from a
  closed vocabulary — no tie is ever broken by insertion order, authored
  order or identity path.
- ⭐ **Your regular serves you** — the relational leg sits above capability.
- **A player who joins a workplace neither starves nor monopolizes**, and
  accumulates regulars by working.
- **Two or more people work one shift somewhere**, with no player present.
- **A house that declares no rule cannot boot.**

**And whoever is called can do it.**

- **`order`, `mix` and `serve` consult the maker's can-make deed**, as the
  other five one-shots already do.
- **An authored person can hold a can-make deed**, derived from who they are
  and **marked as seeded**.
- **The gate is symmetric** — a hired player is refused a drink they have not
  learned, on the same terms an NPC is.
- **A refusal names somebody who could.**
- **The world provably still serves** — an authoring-time check, not a
  discovery at a rail.

## Non-goals

- **`actsAsOne` — a set that turns as one.** ⚠ No pack exists in the realm:
  the one wolf stands alone, the sentry is a singleton. A consumer-less half
  pays the full verification bill for nothing. →
  [call-slate](../slates/builds/call-slate.md).
- ⛔ **The board unification — an assignment posted to a named agent.** ⚠
  **Cut at plan grounding, 2026-09-30.** `GigSpec` has no assignee field and
  `ContractRecord.claimant` fills only on `claim()`, because *every actor is
  context-derived, never caller-supplied* — an attribution invariant, not an
  omission. Nothing in this build consumes an assignment (the call resolves
  `order` synchronously), so it would ship exercised only by a unit test,
  over money-adjacent code carrying escrow and an append-only event chain.
  ⭐⭐ **Lens 7 decided it:** an addressed assignment decides *you
  specifically must do this*, and there is no concept anywhere of refusing
  one — a criterion with no appeal, which is the failure that lens was carved
  out to catch. ⭐ Kept as **the grain** rather than the code: the substrate
  *is* for boss-chooses assignment, the attach point is recorded
  (`claimMode` gains an addressed member; the resolver already takes a
  handed-in candidate set), and no field ships. → call-slate.
- **Dispatch, the turnout, the hue and cry.** The substrate stops blocking
  them (the resolver is handed its candidates, so out-of-reach is the
  caller's question) but **no caller is built** — there is no constable brain
  and no watch department. → call-slate + the policing build.
- **The LLM arbiter.** The seam ships (the arbiter is swappable, the
  candidate list is the prompt shape); no model is wired. →
  [llm-content-slate](../slates/builds/llm-content-slate.md).
- **The senior seat, its reporting chain and the inventory duty.** Its value
  is the succession story and the stock count, which belong with the
  clipboard and the till. → daves-bar-slate + call-slate.
- **The register, the safe, the shift hand-off, dismissal.** →
  daves-bar-slate §the ritual; livelihood-slate §5.4 for firing.
- **Archetype and temperament rows.** ⚠ **A correction to an earlier note in
  call-slate:** the archetype is a *generator* of a person's `behaviors:`
  list, and the list already exists on every row — so pass 2 is already
  supplied and the archetype half is **not** on the critical path. →
  [cast-archetype-slate](../slates/builds/cast-archetype-slate.md).
- **Making the maker's competence affect the output grade.** This build gates
  *whether* they can. → [crafting.md](../subsystems/crafting.md)'s deferred
  skill seam.
- **A pipeline** — one order, several actors in sequence (prep → cook →
  plate). A different primitive that no selector produces. → call-slate.
- **Cohesion — a set that moves together.** Nothing in the game has it;
  building it would be invention. → call-slate.
- **Triage** — a request whose priority reorders the queue. Demand-side, and
  `AttendantMixin` already has a `reception` discipline. → attendant.md.
- **Any change to the by-hand steps.** `muddle`/`strain`/`garnish` are the
  earning path and are correct. Nowhere, deliberately.

## Placement

- **Kernel** for the deliberation beat, the urgency vocabulary, the brain
  declarations, the call-policy vocabulary and resolver, the seeded-deed
  derivation, and the gate on `order`. Every trade asks these and none owns
  them.
- **`trade-hospitality`** for the gate on `mix`/`serve` and the `mixology`
  re-declaration of its 25 rows.
- **The seeded-deed derivation is the dossier's**, beside the band→claims
  expansion it extends. ⭐ One mechanism for players and NPCs: a player earns
  deeds; an authored person is seeded with the deeds their career left.
- **A house's call rule is content** — one authored word on the business row.
  ⭐ A second bar gets a different service character with zero code.
- **Each of the nine packs that ships brains re-declares its own**, by
  package specifier, with no kernel list edit.
- **Two lint gates**, so both run derived: the idle-cadence census, and the
  menu-versus-staff check.

## Collisions

- ⚠⚠ **Every NPC in the realm — 70 rows, 63 with `behaviors:`.** The
  deliberation beat changes how all of them act. **The bar's five, the
  Hearthworks' three, the eight yard hands, the infirmary's two, the mine's
  cast, the newbie wilds' four.**
- ⚠⚠ **Every venue that sells something made, simultaneously.** Gating
  touches the bar, the Hearthworks, the bakery, both Hearts-Delight houses
  and three goods-yard outfits at once. **If the derivation under-seeds, the
  world stops serving.**
- **All 97 recipes in thirteen packs.** ⚠ `difficulty` was authored when it
  only affected *credit* and now decides **who can make the thing** — a
  re-reading of 97 rows, and the build's real authoring cost.
- **The 25 hospitality recipes**, whose discipline changes; ⚠ so does the
  *credit*, from `bartending` to `mixology`.
- **Nine packs that ship brains** — residence, farming, fishing, haulage,
  medicine, mining, ranching, shopkeeping, textiles/tailoring. Each owes its
  brains the new declarations.
- **Dave's `covers` brain**, which fills a gap by taking *the first
  fulfilling seat in authored order* — the second placeholder retired here.
  ⚠ And it covers the bar's weekend 00–10, which is on nobody's roster: the
  owner works the Saturday small hours unpaid.
- **Residency.** ⚠ **Corrected at plan grounding — this collision cannot
  occur.** `BehavedMixin.canEvict()` vetoes eviction of any host carrying a
  `behaviors:` spec, so a behaved NPC never leaves memory while the world is
  up. Nothing new needs to persist; only a reboot loses a part-finished
  task, which is acceptable.
- **A player's first shift.** Gating `mix` means meeting the deed gate at a
  rail rather than a forge. ⚠ The earning path must be reachable *from behind
  the bar* — the well and its six tools are already propped there, which is
  what makes it survivable.
- **The three double-hatted people** — Mara (bartender + keeper), the
  smelter's buyer (buyer + assayer), Odile (registrar + magistrate). One
  person, two seats, and now two sources of tasks-owed.
- **The lounge next door** — combat-free, where new players arrive. A refusal
  or a scene at the bar must not leak into the sanctuary.

## Surface decisions

### A brain is a TASK; the seat and the archetype bundle them

**Q.** Does a brain declare its vocation?

**A.** No — a brain is a **task**. The **seat** says which tasks the job
wants done; the **archetype** says which tasks the person tends toward; a
person runs the **union**.

**Why.** *"I dunno if I'd want to marry a brain to a vocation… businesses
have different needs even among common vocations."* And the roster agrees on
reading: `restocks`, `maintains`, `cellars`, `prints`, `reads-water` are
tasks, not jobs — **a brain is finer-grained than a vocation.** Two bars both
employ a bartender and one wants theirs to work the cellar; that is the
seat's business. ⭐ So `discipline` on a brain means *doing this exercises
X* — the relation all 97 recipes already have — not *this brain is the
vocation of X*.

### Two layers: reflexes stay, deliberation is new

**Q.** Is a brain a reflex or a candidate?

**A.** Both, as two layers. **Witness-triggered brains stay reflexes** —
`greets`, `introduces`, `reacts`, `backs-up`, `crossing-ritual`. Everything
else becomes a **candidate** in one deliberation beat per agent.

**Why.** You do not deliberate about greeting somebody who walked in, and
those brains are correct as they stand. ⭐ And the split is the cost axis
from the other side: the reflex layer *is* the witness layer, which costs
nothing when nobody is watching. Collapsing N cadences into one beat per
agent is where the measured 370,401/day goes.

### ⭐⭐⭐ Urgency is a BAND, not a score

**Q.** How do candidates compare?

**A.** Each derives a **band** from its own real quantity in its own real
unit, and returns the band **with a reason**. No cross-unit comparison ever
happens.

**Why.** Textbook utility AI normalizes onto `0..1` through authored response
curves — which is lens 1's named failure (*a number that goes up with no
referent*) and invents a false exchange rate between *three litres below par*
and *waited forty seconds*. Bands are this engine's whole idiom already:
competence, light, grade, spoilage. ⭐ And *band + reason* is what makes every
NPC decision explainable in one sentence, which is what carries immersion and
hands the call its refusal text for nothing.

### Ties break by kind, and the band is what stops that being brittle

**Q.** Candidates in different kinds, same band?

**A.** **threat > body > work > social > filler**, read off the existing
roster.

**Why.** The roster already sorts into those five and they already imply the
order. ⚠ Strict lexicographic priority is normally brittle — a trivially
hungry bartender would never serve anybody — and **the band fixes it**:
slightly hungry is *wanted*, a waiting patron is *pressing*, so work wins.
Only a *critical* body need beats pressing work.

### Importance rides the seam that already exists — and this build owns its reader

**Q.** Where does interruption live?

**A.** On `interruptibleBy`, which is already declared and typed on every
activity. This build fills it where it matters **and supplies the first thing
that reads it.**

**Why.** ⭐ **No new concept is needed** — the activity framework has the
seam, the `AbortReason` vocabulary is populated and pack-extensible, and a
pack adding its own reason is already the federation-correct shape. ⚠ But
populating a set nothing consults buys nothing, so the reader is in scope and
is not a one-line change.

### The reason renders as behaviour, on a switch

**Q.** Is the arbiter's reason visible?

**A.** Yes — as an **act**, when the choice *changes*. Never as a readout.

**Why.** *"whatever is most immersive."* A readout (*"Mara: restocking
(pressing)"*) is a UI wearing a person's face and the no-gauge rule refuses
it; *"Mara glances at the near-empty gin bottle and heads for the cellar"* is
the same information as a person. It costs nothing — the arbiter already
computed the reason. ⚠ **On a switch, not a beat**: a transition is
interesting, a continuation is noise, and the ambient budget exists because a
little goes a long way. A player who **asks** gets a direct sentence; a
**list** of an NPC's candidates with bands stays refused.

### The deliberation beat is presence-gated by default

**Why.** *"The primary axis is ON NIGHTLY versus CALLED — does this thing act
when nobody is in the room?"* That is `presenceGated`, shipped and never read
as a budget. An agent with no audience deliberates rarely or not at all, and
the flag stops being a pacing nicety and becomes the declaration.

### `shifts` and `covers` leave the brain rail

**Why.** They are employment machinery, not behaviour — on the brain rail
only because a cadence was the sole available scheduler. The roster tick
already runs hourly and is where they belong. ⭐ Under a deliberative model,
a cron job masquerading as a decision is a category error with a real cost.

### The house authors its call, from a closed vocabulary

**Q.** One rule in the engine, or a per-house setting?

**A.** A **closed vocabulary**, authored per house.

**Why.** The demand side settled this and settled it this way — a service
point picks `line` / `scrum` / `reception` / `take-a-number` / `appointment`.
An engine-wide law fails lens 2 the moment a second venue wants a different
one: a kitchen brigade is not a rail. ⭐ And the rule must be **declared** —
a house with staff and no rule is a **build-time failure**, never a silent
fall back to whoever is first, because the silent fallback is the defect
being retired.

### ⭐⭐⭐ The relational leg sits ABOVE capability

**Q.** Who serves you when two people can?

**A.** **Your regular** — even when they are worse at it.

**Why.** *"above capability, your regular serves you for sure."* And the
casting frame names why the alternative is wrong: selecting for competence
*"produces the obvious pairing every time — allocation wearing casting's
clothes."* If the rail always routes the cocktail to the best mixologist, the
bar is a vending machine with a skill table. Relationship is per-viewer,
derived from history nobody authored, and **computable with shipped calls**
(`recognizes()`, regard). ⭐⭐ And it gives a player bartender something
nothing else here does: **you accumulate regulars** — a reason to keep a job,
wholly emergent.

⭐ **Competence becomes the fallback**, and **`junior-first` is deleted**: the
senior's *serve-this-order* candidate simply reports a lower band because
they are mid-count, so the junior serves as a **consequence, not a rule**.
The three-legged chain becomes one derived comparison.

### The resolver is handed its candidates

**Q.** Should reach be a parameter?

**A.** No parameter. The resolver **stops computing the set**.

**Why.** Today it reaches into the room's contents, which silently made *one
room* the law — and the police case shows that is not the rule but a
hardcoded acoustic reach. ⚠ But shipping a `reach` enum with one live value
is the vacuous-gate failure this project keeps paying for. Handing in the set
invents nothing and lets a station or a whistle supply a different one later.

### The bar's three one-shots come under the ladder

**Why.** The ladder's rule is that the *shorthand* is earned and the
*information* is free; five verbs enforce it and three do not, and all three
are at a counter. ⭐ Gating `mix` is also what finally gives
`muddle`/`strain`/`garnish` a job — they are the earning path, and until now
nothing required anyone to walk it.

### A dossier may seed a can-make DEED, marked as seeded

**Q.** The ladder says a deed comes only from your own first by-hand
performance. So how does Mara know a Negroni?

**A.** The dossier seeds it, **marked**, exactly as its claims already are.

**Why.** ⭐⭐ The ladder's rule governs **acquisition during play** — it
exists so reading a wiki cannot buy competence. The dossier is not
information; it is *"the same rows a lived history would have written"*, and a
bartender's lived history includes having made the drink by hand. ⚠ **The
marker is not optional:** seeded and lived must stay distinguishable, and it
keeps wiki-parity true by construction, because a player has no dossier.

### Knowledge derives from the band against the recipe's difficulty

**Why.** Authoring 70 people × 97 recipes is the enumerated-content failure,
and it would rot the first time a pack adds a recipe. Deriving makes
*proficient* versus *competent* mean **what you can make**. ⚠ It is also the
whole realm's supply of competence in one expression, which is why it needs a
gate rather than a drive alone.

### Cocktails move to `mixology`

**Why.** ⭐ Load-bearing for the **derivation**, not for routing: with one
word over the whole rail, a derivation keyed on the recipe's discipline reads
Remy's *bartending* band for a Negroni and his authored mixology proficiency
does nothing. ⚠ **And "seat eligibility is untouched" was
wrong:** `EmployedMixin.isFulfilling` does an **exact `includes`** on the
seat's `fulfills`, with no `specializes` walk — so moving a recipe to
`mixology` would make a `fulfills: [bartending]` seat stop serving it. The
walk is therefore **in scope**, and it is the thing that makes the claim
true. And it is the shipped test applied — *specialize
when the sim already tells the two practices apart*: a cocktail has its own
verbs and a pour does not.

### The gate is symmetric for players

**Why.** Otherwise the player is the one actor who can make anything, which
inverts the fiction the moment they take a job and makes every NPC's limit
look like a bug. ⭐ A first shift you are not yet good at is a progression
path; a first shift where you outperform the expert is not. Lens 6's symmetry
test: a criterion that applies to the staff and not to you is not a
criterion.

### Two gates, because both failures are silent

**Q.** What stops a mis-set threshold closing every venue, and what proves
the idle-cost win?

**A.** Two lint gates, on the repo's *census-then-ratchet* pattern.

1. **Menu versus staff** — every rostered maker can make everything their
   house offers; today's shortfall count is the ceiling. ⭐ A shortfall is
   also a real authoring signal: a bad menu, or a missing hire.
2. **Idle cadence** — sum `60/period` over every cadence trigger in every
   row; today's 257.2/min is the ceiling and may only fall. ⚠ Without it the
   redesign's central claim is asserted rather than measured.

### The build rosters its own consumers

**Q.** Nothing in the world has two able people on shift. Ship anyway?

**A.** No — **overlap two of the bar's shifts, roster the Hearthworks'
`kitchen-hand`, and staff the bar's weekend 00–10.**

**Why.** ⚠⚠ Without it the call runs only under the drive, which is the
vacuous-gate hazard at the scale of a whole build. Every seat was authored as
a singleton *because nothing supported anything else*; four authored
`headcount` seats are the demand in writing. And cover exists for a gap, not
a permanent hole — a proprietor drawing no wage on a recurring shift makes
the labour line lie.

---

## Lens pass

⚠ Run against the **seven** lenses (lens 7 Governance was carved out of 6 on
2026-09-28; lens 3 split into 3a/3b; lens 5 became Continuity and inherits
lens 2's veto). ⭐ Each entry names its **altitude** — *invariant* (binds
every game built here) · *the grain* (binds nothing, but the substrate is for
it) · *this title* — because *"a pass that omits the grain is worse than one
that mis-levels."*

**1 · Pedagogy.** Exercises `mixology` / `bartending` (whose split this
earns), `recipe-knowledge`, and `appraisal`. What it teaches is **how a
workplace decides**, and that **skill is what you can do rather than a number
beside your name** — both derivable: knowing the staff tells you who can
serve you what, and knowing what each is doing tells you who will come over.
⭐ Sharpened by **#33 Rules** (*rules are discoverable, never memorized — we
derive the explanation from the rule*): the refusal **is** the rule stated —
*"Sloane doesn't know that one; Remy does."* And by **#28 The State Machine**
(*the machine is a teaching surface, not an audit trail*): the switch-prose
exposes the arbiter's state **as an act**, which is the teaching surface
without the readout. Nothing rolls, anywhere. **Altitude: invariant** —
derivability and no-resolution-rolls are doctrine.

**2 · Creative expression.** The ordinary case is one authored word (a
house's rule) over a readable palette, with **zero authored knowledge
tables**. ⭐⭐⭐ Sharpened by **#30 Emergence**'s prohibition — *objects per
verb, never more verbs; the ban on enumeration* — and that is precisely this
build's core move: **behaviour stops being enumerated (stack N timers) and
becomes composed (declare tasks; the arbiter picks).** ⭐⭐ And by **#28**'s
provenance rule — *an attribute has a provenance: authored · stamped ·
derived* — which the **seeded-vs-lived deed marker** is exactly, and which
the urgency band obeys by being derived and never authorable. ⚠ **#93** (*does
the substrate impose properties nobody asked for*) is what cut the board
addressee. **Two honest gaps:** 98 `difficulty` values must be re-read (18
already carry a word the engine silently ignores), and **38 brains each owe a
switch-sentence** — where this design most easily becomes repetitive.
**Altitude: the call vocabulary and the house's choice are the grain; the
no-authored-tables rule is invariant.**

**3a · Immersion — the fiction cannot betray itself.** Today it does, three
times: the tip jar sits *"by the register"* and there is no register; the
office wall says *"whoever picks up the next one earns the next nail"* and
there is no seat; and a bartender silently makes a perfect drink they never
learned. ⭐ Sharpened by **#93**'s *not-separateness*: an NPC that can be
interrupted, that says why it changed what it was doing, and that admits it
does not know your drink, is not separate from the world it stands in. No
gauge is added — **every output is a sentence.** **Altitude: invariant** (the
no-gauge rule).

**3b · Participation — ⭐⭐⭐ the lens this build IS.**

> *"The mechanism is **NPC/player interchangeability at the position
> level**… every NPC-held seat is a **standing vacancy**, visible and
> takeable; and replacement is **legible** — somebody took that job, and the
> town notices."*

⚠ **Today that is claimed and broken.** A player who takes a seat takes
*every* order, so replacement is not legible, it is total — and thirty-four
one-person employers plus three double-hatted people are vacancies the
content deleted because the substrate could not hold two. ⭐ And the build
answers **#86**'s two explicitly-open tensions: *"an NPC seat-holder's
competence is an **unset dial** — good enough that the world works, not so
good that displacing them is theoretical"* (the band-versus-difficulty
derivation **is** that dial) and *"**displacement has no stated answer**"* (a
player joining a crew and sharing the work is the answer). ⚠ **The gap this
lens still leaves open:** its failure list includes *a seat with no
consequence for leaving it unfilled*, and after this build an unfilled seat
is visible to an **author** (the menu-versus-staff lint) but still has no
in-world consequence. Named, not closed. **Altitude: invariant** —
interchangeability is the platform's claim, not a preference.

**4 · Values.** The choice forced is **learn the thing, or hand it to
somebody who has** — and, for a house, *who do we call and why*. ⭐ Sharpened
by **#55 Visible Progress**'s *ambient versus visible*: **regulars are
ambient progress** — nothing announces it, no counter moves, you simply
notice that Remy is the one who comes over. That is the anti-gauge form of
"you are getting somewhere." **#46 Reward**: no reward schedule is introduced
at all. ⚠ Honest cost: a new hire is **worse** than the NPC beside them and
the game will say so. **Altitude: the grain** — the platform is for worlds
where competence is earned rather than granted.

**5 · Continuity.** ⭐ *"If I have already learned how to build Excalibur, I
do not have to learn a new thing to build a lightsaber."* Applied: an author
who has learned to author a rail's call has learned to author a watch's,
because **the reach axis is deliberately not parameterized** — the medieval
and radio-era forms are one object handed a different candidate set. And the
urgency band is **unit-free by construction**, so an epoch changes the
quantities and never the comparison. Since this is lens 2's time axis, its
verdict is lens 2's: the promise compounds rather than resets.

**6 · Economy.** **Produces** honest labour allocation, a reason for training
to exist, and — via `produces`/`consumes` on tasks — the **first computable
answer to *who makes what in this town***. ⭐⭐⭐ Sharpened by **#30**'s
generator — *the chain walk: add a consumer, derive the producers* — which is
**impossible today** because supply is buried in 38 imperative functions;
these declarations are what make the walk possible at all, and they are why
`vocations.md` stops being maintained by hand. **#27 Time**: the currency
every other is priced in — the senior's count, the newcomer's refusals.
**Consumes** the time of whoever is not yet good enough. **Who pays:** the
house, in a slower rail; the newcomer, in refusals. **Was the demand there
first:** four times over — a documented exemption (*never knowledge-gated*),
a documented defect (*credited with a trade they do not practise*), four
authored `headcount` seats, and 47 competence dossiers nothing reads. ⭐ **#7
Endogenous Value**'s roulette test passes: the deed gates a service, it is
never a currency the game needs you to want.

**7 · Governance.** Three decisions judge a person, each with its criterion,
its refusal and its appeal named:

| decides | criterion | refusal says | appeal | tier |
|---|---|---|---|---|
| **can you make this** | your band in the recipe's discipline vs its `difficulty` | what you have not learned | ⭐ build it by hand once | **B** |
| **who gets called** | the house's authored rule, then urgency | who could instead | do the thing that raises your band; be free when asked | **B** (the vocabulary) · the author (the choice) |
| **who is your regular** | your own history with that person | nothing — nothing is withheld | n/a | derived, unamendable by design |

⭐⭐ **The capability gate is symmetric between players and NPCs**, which is
what makes it a criterion rather than a handicap. ⚠ And the checked failure:
*a bare count used as a permanent gate over an append-only record, which can
only ever rise.* The Transcript **is** append-only and the band derives from
it — but the gate opens as the count rises and never closes, so it runs the
benign direction. ⚠⚠ **The one real exposure:** if an author *raises* a
recipe's `difficulty`, somebody who could make it silently cannot any more,
with no notice and no appeal but re-earning. That is a capability removal by
content edit, and the menu-versus-staff lint is what must catch it.

---

## The drive

⚠ **Four venues.** Gating and deliberation touch every venue at once, so a
single-venue drive cannot see the risk.

1. Weekday morning, at the bar. `order` a straight pour. **Expect it
   served** — the floor: the ordinary case still works.
2. Stand at the rail and watch for a few minutes. **Expect** the bartender to
   change what they are doing at least once, and **expect the change to be
   narrated as an act** — a reason in words, not a status line. ⚠ Expect it
   **on the switch only**, not every beat.
3. Order a drink while the bartender is mid-task. **Expect them to break off
   and serve you**, and the task to resume or be dropped visibly. (Today
   nothing interrupts anything.)
4. `order` the hardest cocktail on the menu. **Expect** the drink, or a
   refusal that **names somebody who can** — or says plainly nobody here can.
5. The Hearthworks: `order` a dish from Odo. **Expect it served** — second
   venue, different discipline, and proof the derivation is not bar-shaped.
6. The bakery and one goods-yard outfit: order or buy what each sells.
   **Expect both to still work.** ⚠ The world-didn't-break check; never skip.
7. Back at the bar with **two bartenders on** (the new overlap). Have a
   patron order repeatedly. **Expect the work to be shared**, and **expect it
   not to be the same person every time.**
8. `apply for bartender`; `clock on`. Have a patron order. **Expect the
   player to get some orders and not all of them.** ⚠ Never chosen means the
   seat is decorative; always chosen means the staff went silent — both are
   defects.
9. Order from the same bartender several times across a session, then order
   again. ⭐ **Expect that bartender to be the one who comes over** — your
   regular, above capability.
10. As the player-bartender, `mix` a drink you have not learned. **Expect a
    refusal naming what you lack** — the symmetric gate, met at a rail.
11. Read the menu. **Expect** the known-of claim and **still** a refusal —
    *information buys optimization, never competence*.
12. Build that drink **by hand** at the well — muddle, strain, garnish, stir.
    **Expect it to work**, and the deed to be earned.
13. `mix` it again. **Expect it to work now.** ⭐ The ladder running at a rail
    for the first time.
14. Clock off and empty the rail of able staff. `order` anything. **Expect a
    refusal that says nobody here can, and who could** — not silence, and not
    a drink from nowhere.
15. Walk to the goods yards at 03:00 and to the bar at 03:00 on a Saturday.
    **Expect somebody rostered** who is not the owner working unpaid.

**Not reachable by this drive; assert directly:** the derivation's coverage
over all 97 recipes · a house authored with staff and no rule, which must
fail at build time · the idle-cadence ceiling falling · and the mob seam,
which must refuse to be used without a rule rather than silently picking the
first member.

## Acceptance criteria

- **Two or more people work one shift** at a workplace in the realm, with no
  player present, and the work is shared.
- A patron **can predict who will come over** by knowing the staff — and if
  they are a regular, it is their regular.
- A **newly hired player gets some orders and not all of them**, standing
  beside NPCs of equal or greater competence.
- An NPC **visibly changes task when something more important happens**, and
  the change reads as a person's act with a stated cause.
- An NPC **does not do two things at once**, and one that is working reads as
  working rather than as idle.
- An author opening the brain palette **can tell what each brain is for**
  and which hosts it suits, without reading its source.
- A patron asking for a drink the bartender does not know is **told**, and
  told **who does** when somebody present does.
- A player who has read the menu but never made a drink **cannot `mix` it**;
  after building it once by hand, **can**.
- The same gate refuses a player and an NPC on the same terms.
- Remy and Sloane **differ in what they can make**, off bands already
  authored, with no new content.
- Nobody is credited with practising a trade they were wrongly routed into.
- Somebody other than the owner is on the bar at 03:00 on a Saturday.
- ⭐ **Every house can still make everything it offers** — and if one cannot,
  the build says which and why before a player finds out.
- ⭐ **Idle cost is lower than it was, and a gate holds it there.**
- ⭐ **A house with staff and no call rule cannot boot.**

## Cross-references

- [agent-coordination-slate](../slates/builds/agent-coordination-slate.md) — the arbiter's design, the measurement, the prior-art survey, what is left
- [call-slate](../slates/builds/call-slate.md) — the call, the matrix, the quest relation, everything deferred
- [behavior.md](../subsystems/behavior.md) — the model this replaces
- [activity.md](../subsystems/activity.md) — engagement slots and `AbortReason`, the seam importance rides
- [crafting.md](../subsystems/crafting.md) — the ladder, the five gated verbs, the three ungated ones, the deferred skill seam
- [advancement.md](../subsystems/advancement.md) — bands, the Transcript, the specialization test, NPC/player symmetry
- [identity.md](../subsystems/identity.md) — the dossier as seeded evidence, marked
- [employment.md](../subsystems/employment.md) — seats, `fulfills`, the roster tick, `covers`
- [attendant.md](../subsystems/attendant.md) — the demand-side policy vocabulary this copies
- [balance-slate](../slates/builds/balance-slate.md) — the idle-cost measurement and the stage vocabulary
- [quest-modeling-slate](../slates/builds/quest-modeling-slate.md) — the three passes; allocation versus casting
- [design-lenses.md](../design-lenses.md) — the pass above
