# Tropes slate — how content changes who you are, without a wizard's code

> **Status: DESIGNED IN CONVERSATION, UNBUILT** (2026-11-24) — the owner: *"I actually really like
> where all this is going let's start writing it up."*
> **Left:** the beat vocabulary and who holds its pen (§ 3a) · each beat's detection over acts · the
> act list fired at its chokepoints behind a call-security gate, and *no work starts anonymous* (§ 3b) · the trope definition (cast ·
> plot of beats · writes) · the detector · the first roster (§ 6) · the author surfaces —
> *could fire here*, *has fired here*, the gap report · the escalation to a quest · moving today's
> hard-coded writers onto tropes · activity credit onto the rows the acts load
> **Left (roster):** § 6 — twelve ready, five waiting on one small fact each, the helping and
> deception families waiting on facts the world does not record.
> **Requirements:** [tropes-requirements](../../requirements/tropes-requirements.md) (drafted 2026-11-24).
> **Size:** a build, probably two (the substrate with a first roster; the author surfaces)

## 0. The ask

**2026-11-24, the owner**, from the lineage demo, which needs a trait lean per workplace and has no
way to measure one: *"right now my solution to 'what do I do if I want to change a trait or
discipline on a player' is 'you get a wizard to write some code that does it' but that's not gonna
scale and it doesn't lead to good design anyway we need to actually figure out how this is
expressed in content so we dont need to write new code for every 'situation'."*

This slate is the instrumentation question [trait-slate](./trait-slate.md) § *How content expresses
change* parked, and its § *The gap* problem 4 (*wiring is deferred and unbounded*).

## 1. What exists today — the census (2026-11-24)

| what | writes | reading |
|---|---|---|
| **Recipes** — 282 rows carry `discipline:` + `difficulty:` | Discipline evidence | ✅ **activity credit as data**: the one content-authored path, and the model to keep |
| Knot tying and splicing (`Rope.ts`, the rope jack) | `ropework`, a string literal | activity credit with its row missing |
| Combat — the Disciplines exercised in a fight | Discipline evidence | activity credit derived by the model; fine |
| Casting a spell | the spell's two grid Disciplines | activity credit from the spell row |
| An NPC's archetype seeding (`Cast.ts`) | claimed Discipline evidence | seeding, not instrumentation |
| **Giving blood** (`Blood.ts`, `DonationBank.ts`) | generosity (+ compassion for a named shortage); an applause → renown | **the only live trait writer** — a constant in code; a trope in disguise |
| A kill in front of witnesses (`CombatLogic`) | every witness's regard for the victor: −20 unlawful, +2 a fair duel | a trope, instrumented halfway: no trait moves |
| Breaking a contract (`ContractLogic`) | the issuer's regard, −15 | a trope, instrumented halfway: the breaker's honesty never moves |
| Dialogue-tree effects (`regard: delta` on a node) | a raw number, authored per node | the per-site authoring smell, in data |
| Petting, bonding, introductions | regard and bond | mostly mechanics; left alone |
| The harm-consent ledger (`accountability_events`, seven producers) | who harmed whom, consented or not | pure fact — the richest input |

⚠ This corrects [trait-slate](./trait-slate.md)'s parked section, which said nothing writes trait
evidence; the blood gift does.

## 2. ⭐⭐⭐ The split — activity credit vs characterization **[DECIDED in shape]**

- **What an act IS** — its Disciplines and difficulty — is **activity credit**, and lives as data on
  the row the act loads: the recipe (already), the knot's joint row, the spell, a priced service, a
  reading, a combat move. Mechanics; no tropes. Rope's literal moves onto the knot rows.
- **What kind of person did it** — traits, and the regard and renown of those who saw it — is
  **characterization**, and every characterization write in the census is a trope. Traits are the
  intrinsic layer ([measurement.md](../../measurement.md): *"kernel — it knows what happened"*, no
  adjudication); regard and renown are the social layer, written through witnesses.

The constraints the conversation ruled on, so nobody re-derives them:

- ⛔ **Not the command layer.** A verb is a handle; a command definition is a view onto a model and a
  controller; the controller is IO. None of them says what an act exercises (MVC).
- ⛔ **Not brains.** A brain is whatever an NPC does after it is cloned; only the acts it performs
  inform anything.
- ⛔ **Not a free label on content.** *"This court tests composure"* means nothing in this
  architecture. What the author can do instead is cast a trope (§ 3).
- **The model records facts; the measuring systems interpret.** A model operation that performs the
  work records what happened — who, to whom, for what, with what consent — and asserts nothing about
  traits. Tropes are the interpretation.

## 3. ⭐⭐⭐ Tropes — the smallest narrative unit **[DECIDED in shape]**

The owner: *"when I see you trying to unify around a nebulous concept like a 'situation' it seems
to me what we're talking about is narrative. a trait unlike a discipline isn't pure mechanics, its
based on a specific setting and characters … not every little interaction on the street is a quest.
instead what I think you're describing are 'narrative tropes'."* And: *"if its the instrumentation
that's the expressive part and the traits themselves are a small contained set, then its whatever
set of narratives revealed by that instrumentation that needs to bind the expression part of the
equation … unlike traits, it's wide and there's a huge catalog to choose from for every situation."*

| layer | what it is | who writes it | what it writes |
|---|---|---|---|
| **facts** | what happened: money moved, a harm condition, work finished or abandoned | the model operation that did it | nothing interpretive |
| **tropes** | a recognizable pattern over facts, with roles — *the gift*, *the good Samaritan*, *the broken promise* | instrumented **once**, by template authors | traits, regard, renown — the whole set at once |
| **quests** | authored compounds of tropes with stakes, a cast and a frame | content authors cast them | their tropes' writes, plus beats |

- **A trope is instrumented once and fires wherever its pattern occurs** — in any place, any realm.
  The owner's cost/benefit: *"instrumentation is the demanding part, so instrumenting one trait per
  site is a waste."* **Sizing: dozens to low hundreds** (the owner: *"dozens to hundreds is exactly
  what I was thinking"*), against thousands of sites.
- **One trope writes every ledger it touches** — the actor's traits (intrinsic) and the witnesses'
  regard and renown (social). Every writer in the census writes half.
- **Context is the trope's job.** Money handed over under threat is *the protection racket*, not
  *the gift*; the interpretation of intent lives in which trope matched, never in the fact.
- **Two ways a trope fires:** **detected** — from facts, anywhere; **cast** — by an author in a scene
  where the world does not model the situation yet (the dialogue node that says *this is a
  confession* instead of `regard: +5`).
- ⭐ **A trope is the quest slate's "happening" beat, standing alone** —
  [quest-modeling-slate](../world/quest-modeling-slate.md) § 2's second detection mode, a pattern
  matched on an event stream, needing no quest around it. So the slate's *"a tended bar … not a
  quest"* still has tropes firing.

## 3a. ⭐⭐⭐ Character and plot — casting and beats **[DECIDED in shape — the owner, 2026-11-24]**

> The owner: *"casting the trope is one axis and we described that fairly okay. it needs more work but
> there's something there we can work with. but all this shit you just describe isn't casting because
> it isn't character, it's plot. and plot needs its own language … these different patterns and
> primitives are plot beats and we need to start thinking of them this way because it's how they
> actually serve the narrative / trope."*

A trope has two halves, and each needs its own language:

- **character — the cast:** the roles, and who or what can fill them;
- **plot — the beats:** what has to happen, in what order, and what must not.

⚠ **This supersedes § 3's *"cast a trope"* and § 4's *facts*.** Content never asserts a trope (below),
and authors never write in facts.

### Four layers, each written by someone different

| layer | the language of | written by | example |
|---|---|---|---|
| **primitives** | what can change in the world | the engine, once each, at its chokepoint | moved · money moved · harmed · engagement ended |
| ⭐ **beats** | plot — a unit of story | the plot vocabulary's authors (a gated pen); each beat's detection is defined once, in primitives | *harm* · *aid* · *give* · *exchange* · *take* · *return* · *promise* · *keep* · *break* · *flee* · *yield* · *spare* · *confess* · *threaten* |
| **tropes** | character + plot — a cast and a short plot of beats | template authors | *the good Samaritan* · *the broken promise* |
| **quests** | several tropes sharing a cast, with stakes and a frame | content authors cast them | *a Vendetta* |

**A beat**, written once **[LEAN — the shape]**:

```yaml
beat: aid
roles: [helper, helped]
means: the helper relieves the helped's harm
# detection, never seen by authors: in one act, the helper ends or eases a
# harm condition on the helped
```

**A trope**, written in beats and roles — never in primitives **[LEAN — the shape]**:

```yaml
trope: good-samaritan
cast:
  victim: { can: be-harmed }
  helper: { can: act }
  rule:   helper and victim are strangers
plot:
  - harm:  { harmed: victim }
  - aid:   { helper: helper, helped: victim, within: an hour }
  - never: exchange { from: victim, to: helper }   # no payment
writes: helper (compassion, generosity); witnesses (regard for the helper)
```

⭐ **Propp's 31 functions are the reference for the beat vocabulary** — literally a closed set of plot
beats with roles. Thompson's motifs and TV Tropes are the reference at the trope level (§ 7).

### Where beats come from — primitives at the chokepoints **[LEAN]**

The owner's challenge: *"at some point something has to say 'this trope happened' for a catalog of
dozens to hundreds of tropes … once the objects are minted they have a life of their own. the content
author can only do so much."* Nobody authors the facts a beat reads. The engine already insists that
state changes go through **one primitive each**, so whatever an object does in its own life, it does
through about a dozen places — each written once, generically:

| primitive | the one chokepoint (to verify each) | carries |
|---|---|---|
| moved | `ContainmentApi.move` | the thing, from, to |
| title changed | the chattel transfer every transfer passes | the thing, from whom, to whom |
| money moved | `postTransaction` | from whom, to whom, how much |
| harmed | `ConditionApi.inflict` | victim, condition, consented |
| died | `ConditionApi.die` | who; the killer when known |
| engagement ended | the scheduler | who, what kind, completed or why abandoned |
| crossed | `traverse` | who, which way |
| spoke / emoted | the message composer | who, to whom, on what channel |
| created / destroyed | `StuffApi.clone` / `destruct` | the thing, by whom |

- **Grouped into acts.** A primitive alone does not say what it meant (money moving is a gift or a
  sale), so every primitive is tagged with its **act** and its **actor** — the execution context
  already has a root and a causing command (`ExecutionContextApi.runRoot`, `causingCommandId`) and
  knows who is acting, for a typed command, a script, a scheduled tick or an NPC's beat alike. At the
  act's end, its **bundle** goes to the beat detectors, with the witnesses captured once from who
  could perceive the place. *Exchange* is money one way and title the other in one act; *give* is
  value one way and nothing back; *take* is a good into hands whose title is someone else's;
  *return* is the same good back to its titled owner.
- **Most of § 6's "small missing facts" dissolve.** The movement primitive sees cash change hands and
  sees the taker; only the engagement end and the message composer need a fact added.
- ⛔ **No `EventApi`** — a bus with one listener is pointless; a chokepoint hands its fact straight
  to the detectors.
- ⛔ **Nothing is persisted for tropes.** A primitive is an in-memory observation handed over at the
  moment; some are stored already for their own reasons (harm, contracts, money), which tropes do not
  need. What persists is only what a trope **writes** — the trait claim, the regard change — tagged
  with the trope. Partial matches for multi-beat tropes stay in memory, with windows on the game
  clock; anything that must survive days is quest-sized, and a quest keeps a durable cursor.
- The owner's reading of this layer: *"some kind of high level scripting language done as a macro
  recorder but with the scripts written in reverse … its weird. its not bad."* — which is why it
  stays BELOW the language authors use.

### ⭐⭐ The two author questions, in these terms **[LEAN]**

1. **"I want this trope to run — what do I write?"** The trope's page shows its **cast** and its
   **plot**, and the gap report reads both against a place — **per role**, who here can fill it
   (*a victim who can be harmed: the patrons ✔*); **per beat**, can anything here make it happen,
   because each beat knows the primitives and capabilities behind its detection (*aid: nothing here
   relieves a harm condition ✘ — a medic, a kit, a priced treatment would*). The author writes the
   missing **stage**, never the plot.
2. **"I wrote this content — what tropes does it play?"** Content has one tool per axis:
   - **casting (character)** — bind a trope's roles to your people and things (*Mara is the captor;
     the warehouse basement is the prison*);
   - ⭐ **beats (plot), wherever the world cannot see them** — **content asserts beats, never
     tropes.** A dialogue node does not say *this is the redemption trope*; it says *this choice is a
     confession beat, by the player, to the speaker* (replacing today's raw `regard:` effect). A
     charity box says *money given to me is a give beat, with me as its cause*; a temple, *a death
     here is a desecration beat*. The matcher only ever matches beats — detected by the world or
     asserted by an author — so a confession asserted in dialogue, after a *break* the world
     detected last week, can complete a redemption that no author named.

### Open

- **Who holds the pen on the beat vocabulary** — the kernel (a closed list), or a gated set of
  template authors who may add beats.
- **The chokepoint table is unverified** — each must be checked to cover every path (consent recorded
  everywhere it is needed?).
- ~~The execution context must attribute the right actor~~ → settled in § 3b (no work starts anonymous).
- **Cost** — build a primitive only for the kinds some beat is listening to; act bundles are small.
- **Lies and intent stay outside detection** — only asserted beats reach them.

## 3b. ⭐⭐⭐ The act — who did it, and what changed **[DECIDED — the owner, 2026-11-24]**

The owner: *"is there a generic way to solve the execution context problem so async doesnt matter it
just works"* — and, of the act: *"I dont see any way to do this that isn't just
'WhateverApi.fireAct('foo')' instrumented whereever it needs to go. the problem is creating an act
vocabulary where that kind of instrumentation is honest and contained so not every code review needs
to take an inventory of acts and it's not constantly changing or being reevaluated."* All four rulings
below: *"yes to all four."*

⚠ This settles § 3a's *primitives* into **acts**: the same records, now fired explicitly and gated.

### Who is acting — no work starts anonymous **[DECIDED]**

- **The resolver is `ExecutionContextApi.getActor()`** — *who is acting* — not `getActingAuthor()`,
  which answers *who authored this* for provenance and fails closed on a forced or cross-actor chain.
  `getActor` holds through a forced chain (an NPC's forced command is the NPC acting).
- **Most of it already works.** Node's AsyncLocalStorage carries the context across every `await`;
  the places that start work fresh already capture the actor and restore it (`captureActor` /
  `runAsCaptured`): `ScheduleApi`, the engagement scheduler, the world clock, the sandbox. NPC brains
  act as themselves (`Behaved` runs a brain's act inside `runAsSelf`).
- ⭐ **The rule, made structural:** *no work starts without an actor or a named system.* `runRoot`
  requires a captured actor or a named system and refuses otherwise — about nine call sites, raw timers
  already banned — so "it just works" is a guarantee, not a convention.
- **To verify first:** prompt resume (a doc comment says the command frame is gone after a resume;
  `getActor` reads a different frame and may survive — unchecked), a reaction triggered by a message,
  and the REST/CMS boundary.

### Acts — fired at the chokepoints, and only there **[DECIDED]**

- **`ActApi.fire(kind, payload)`, called only by the engine's chokepoints** — the single primitive
  each state change already goes through: `ContainmentApi.move`, the chattel transfer, `postTransaction`,
  `ConditionApi.inflict`, `ConditionApi.die`, `traverse`, the engagement end, the message composer,
  `StuffApi.clone` / `destruct`, the contract outcome. New feature code keeps calling `move` as it
  always has, and the act fires — **a code review never inventories acts, because feature code never
  fires them.**
- ⭐ **Contained by call security, not by discipline:** `ActApi.fire` is gated
  `@CallSecurity(FromModule([…the chokepoint modules]))`; a call from anywhere else throws. Adding an
  act means adding a chokepoint — a rare change already scrutinized as architecture.
- ⭐ **An act records what CHANGED, never what it MEANT.** *Money moved from X to Y* is as true next
  year as today, so the list is never re-evaluated when tropes or beats change — every
  reinterpretation happens above it. Closer to physics than to plot; that is what keeps it stable.
- **A closed list, in one kernel file, each kind with a fixed payload** — who acted · the
  counterparty or recipient · the thing · the amount · consent · the place. It grows only with
  chokepoints.

| act | fired by |
|---|---|
| moved | `ContainmentApi.move` |
| title changed | the chattel transfer |
| money moved | `postTransaction` |
| harmed | `ConditionApi.inflict` |
| died | `ConditionApi.die` |
| crossed | `traverse` |
| engagement ended (completed, or why abandoned) | the engagement scheduler |
| spoke / emoted | the message composer |
| created / destroyed | `StuffApi.clone` / `destruct` |
| contract outcome | the contract's settle and breach |

- **One root's acts belong together** — a command, a captured continuation, an NPC's beat. The group
  needs no name of its own: *the acts of one root* (the owner accepted). That grouping is what lets a
  beat read *money one way, title the other, in one go*.
- **Asserted beats are not acts.** A dialogue node's `beat:` arrives through the dialogue's own
  effect applier, a separate content path; acts stay purely the engine's record of what changed.
- In memory only, handed to the beat detectors as the root ends — nothing persisted for them (§ 3a).

## 4. What a trope declares **[LEAN]**

> ⚠ Superseded in part by § 3a: a trope declares a **cast** and a **plot of beats**; *facts* are the
> primitives below the beats, never written by authors.

| part | *the good Samaritan* | for the author |
|---|---|---|
| **roles**, each with what it requires (capabilities, the way a command's `requires:` narrows a slot) | a *victim* who can be hurt; a *helper*; no prior relationship | what must be present |
| **the facts that fire it**, from a closed list | the victim in a harm condition; the helper's act relieves it; no payment | what must be able to happen |
| **what it writes** | helper: compassion and generosity up; witnesses: regard for the helper up | what it is for |
| **reference** | the source it was drawn from (§ 7) | where the idea came from |

- **The fact list is closed, and each fact is declared by the model operation that produces it** —
  the price of the static checks in § 5, and it keeps the MVC line (the model says what happened).
- The magnitudes are dials, and how much one act may write is trait-slate's open denominator
  question.

## 5. ⭐⭐ Legible and discoverable to authors **[LEAN]**

The owner: *"how to make all that legible and discoverable to the content authors so they know what
they're writing against. both in terms of 'I wrote this content what trope(s) should I reach for?'
and 'I want this trope(s) to run what content do I need to write to get there' the latter is
interesting because if you're asking for multiple tropes you're starting to talking about quest level
narratives now."*

1. **Content → tropes.** *Could fire here*: from the content's composition — which facts its model
   operations can produce, which roles its things can fill — every trope it satisfies (`which` for
   tropes, read against declared requirements, never a search of the world). *Has fired here*: a
   projection over trope firings by place (a performance cache, [scan-sweep-slate](../tech-debt/scan-sweep-slate.md)
   § *Content projections*). The gap between the two is the author's best signal.
2. **Trope → content.** A **gap report** against a target place — the trope's own roles and facts read
   against what is there: *"the good Samaritan here: someone who can be hurt ✔; a way to help ✘ —
   nothing here relieves a harm condition."* Not the search `which` refused (*"what would give you
   `fish`"* reaches into every piece of content): the requirements are written on the trope.
3. ⭐ **Several tropes that share a cast are a quest, and the tool says so.** One trope is a property
   of a scene; *the broken promise* then *the vendetta*, the same two people, is a narrative — the
   quest slate's beats with shared roles. Asking for both escalates to the Vendetta template.
   **Tropes and quest templates are one catalog at two sizes**; several of the quest slate's 19
   primitives (Favor, Vendetta, Dilemma, Reconciliation) are tropes already.
4. **Surfaces:** the catalog (each definition rendered as its own page); per content (could · has ·
   gap); per trope (what is missing to stage it here, and where it has fired) — where authors already
   work: the CMS, and an author-side command beside `which`.

## 6. The starting roster **[DRAFT, 2026-11-24]**

Grounded in a survey of what the engine records **today** (each producer confirmed in non-test code).
Names borrow TV Tropes' where players know them (§ 7); every definition is ours. Magnitudes are dials,
not shown.

### Ready — the facts are already recorded

| trope | roles | fires on | writes | replaces |
|---|---|---|---|---|
| **The Gift** (blood) | giver | a blood donation | giver: generosity up | the `Blood.ts` constant |
| **Answering the Call** | giver; the need | a donation while the bank's stock is short | giver: compassion up | the same constant's `named` arm |
| **The Gift** (goods) | giver, receiver | a title transfer, consented, with no sale in the same transaction (`chattel_events`) | giver: generosity up; receiver: regard for the giver up | — |
| **The Gift** (money) | giver, receiver | `pay` to a person — a `transfer` leg, no sale, no contract | giver: generosity up | — ⚠ intent: a `pay` may be settling a debt |
| **Murder in Plain Sight** | killer, victim, witnesses | a death, not consented, the killer named (`accountability_events`) | killer: compassion down; witnesses: regard for the killer down | `CombatLogic`'s −20 |
| **The Fair Fight** | victor, opponent, witnesses | a consented fight won | victor: boldness up; witnesses: regard up | `CombatLogic`'s +2 |
| **Sparing the Yielded** | victor, the yielded | a fight ended by a yield, the yielded left alive | victor: forgiveness and compassion up | — |
| **The Broken Promise** | contractor, issuer | a breach by abandonment or expiry (`contract_events`) | contractor: constancy down (fickle); issuer: regard down | `ContractLogic`'s −15 |
| **The Word Kept** | contractor, issuer | a contract fulfilled | contractor: constancy up; issuer: regard up | — |
| **Abandoning Ship** | master, those left aboard | abandonment at sea (`Ship.ts`) | master: compassion and constancy down | — |
| **Pet the Dog** | carer, animal | petting or hand-feeding a creature | carer: warmth and compassion up — ⚠ diminishing with repetition | — |
| **The Bad Meal** | feeder, animal | hand-feeding that sickens the animal | feeder: regard of the animal down (as today) — no trait: intent unknown | `Bonded.ts`'s penalty |

### Ready once one small fact is recorded

| trope | the missing fact |
|---|---|
| **The Tip** — generosity up | a tip rides a plain transfer with the memo *"a tip"*; it wants its own ledger category |
| **Light-Fingered** — honesty down; the owner's regard down when they learn it | picking up a good you hold no title to is allowed and **names no taker** — the taking wants a record |
| **Returning the Wallet** — honesty up; the owner's regard up | handing a good back to its titled owner (`give` records nothing today) |
| **Run Away** — boldness down; companions left behind: their regard down | fleeing a fight writes nothing |
| **Walking Off the Job** — patience and diligence down | an abandoned engagement is held in memory only, never stored |

### Waiting on facts the world does not record at all

- **The Good Samaritan** — helping a stranger who is hurt: tending, treating, operating and rescue
  (breathing someone back from drowning) leave no record; the transfusion's revival deed is
  unreachable (its only caller never says who gave the blood — a defect worth its own fix).
- **False Friend** and every deception trope — no record of a false claim or a planted belief.
- **Mercy Kill**, **Took a Bullet for Him**, **Heroic Sacrifice** — need a consented-death request and
  an interposition fact.

### What the roster taught

1. ⭐ **A fact without a known intent fires no trope.** Harmful food named to its maker, or a trap that
   catches someone, could be malice or carelessness; the trope may write the victim's regard, never
   the actor's character. Tropes interpret context — they do not invent it.
2. **A trope characterizes the actor of an act, never the receiver of a reaction.** Applause already
   writes renown; it says nothing about the applauded person's character.
3. **Repetition must diminish** (*Pet the Dog* is a farming vector) — trait-slate's denominator,
   arriving at the first roster.
4. **Witnesses must be on the fact.** Today a fight's witnesses are computed in the moment and never
   stored; a trope that writes the social layer needs them recorded with the fact.
5. **The ledgers name accounts, not people** — a trope resolves an account to its owner before it can
   cast a role.
6. ⚠ **Regard is an overwritten number, not an evidence log.** If tropes become the writers of regard,
   it may want to become derived from a ledger the way traits are — an open question, not a ruling.

## 7. Reference material — TV Tropes and the older catalogs

The owner: TV Tropes is reference material for our own catalog *"the way wikipedia is for other game
concepts like materials"* — not a wiki we host, and the online world need not agree with our
definitions: *"it was just a random idea to spice things up."* A research pass (2026-11-24; the site
refused automated fetches, so its pages were not read directly) found:

- **Mostly not about acts.** Roughly 30K tropes (Gala et al. 2020's crawl); by impression well under a
  tenth describe something one person does to or for another. Most are narrative structure, genre,
  presentation and audience reaction, and even the character tropes are mostly TYPES (*the Mentor*)
  rather than ACTS. Its definitions are framed by narrative function (*"to show the audience X is
  evil"*), so every one we borrow is restated as the act itself — actor, target, cost, witness.
- **What it is good for:** the **vocabulary** — names players already know (*Kick the Dog*, *Pet the
  Dog*, *Save the Cat*, *Good Samaritan*, *Honor Among Thieves*, *Even Evil Has Standards*, *Back
  Stab*, *Mercy Kill*, *Shoot the Dog*, *Disproportionate Retribution*, *False Friend*) — and its
  **"playing with a trope"** variations (inverted, subverted, averted …), a ready generator of role
  swaps and near-misses for a trope's edge cases. Its **character-tropes index** and its sub-indexes
  (morality, goodness, evil, bravery, selflessness, loyalty) are where to look.
- ⛔ **The license: CC BY-NC-SA 3.0** (since 2012). The non-commercial clause is incompatible with this
  project, so **no text is copied** — definitions, one-liners or examples. **Names and concepts are
  free** (ideas and short phrases are not copyrightable, and many names predate the site: *Save the
  Cat* is Blake Snyder's, *Good Samaritan* the Bible's). Every definition is our own writing.
  (All The Tropes, a fork under CC BY-SA 4.0, is a commercial-friendly name reference.)
- **Better-structured catalogs, for the act taxonomy:**
  - ⭐ **Thompson's *Motif-Index of Folk-Literature*** — a hierarchical code system whose chapters on
    traits of character (W: kindness, and the unfavorable traits such as greed and cruelty), rewards
    and punishments (Q: kindness rewarded, misdeeds punished), deceptions (K) and society (P) map
    nearly onto the trait axes. *(Chapter codes recalled, not yet checked against the text.)*
  - **Propp's 31 functions** — acts defined by their consequence, with fixed roles; close to our role
    model, narrow to the fairy-tale arc; the quest slate's lineage.
  - **Polti's 36 dramatic situations** — situations with role slots; a coarse source for multi-role
    patterns — the quest-sized end of the catalog.
- **The lean [LEAN]:** take the **act taxonomy from Thompson** (W, Q, K, P), the **multi-role, quest
  end from Propp and Polti**, and **borrow TV Tropes' names** where players already know them, writing
  every definition ourselves.

## 8. Open

- Where tropes live — a `/system/…` pack (characterization is true whether or not anyone is taking
  part), with quest templates beside them later **[LEAN]**.
- The closed fact vocabulary: which facts, and which model operations declare them.
- Intent: whether the consent-to-harm ledger is enough to tell a gift from extortion.
- Whether NPCs' acts write trait evidence too.
- How a player learns a trope fired — [narration-slate](./narration-slate.md) (salience, *acts never
  axes*).

## 9. The path to a first build **[LEAN — proposed 2026-11-24, not ruled]**

The owner: *"I actually wanna build this sooner than later especially if we have things that are
already doing shit 'the wrong way'."* The wrong-way writers are the first consumer — the blood gift's
constant, combat's −20/+2 regard, the contract breach's −15, the bad-feeding penalty, dialogue's raw
`regard:` numbers — so moving them onto tropes proves the design and deletes the wrong way in one
build, with today's behavior as the regression check.

| wave | what | proves |
|---|---|---|
| 1 | *no work starts anonymous*; the act list fired at ~6 chokepoints the first roster needs | acts carry the right actor and group by root |
| 2 | the first dozen beat detectors — **kernel code** for now (*give · exchange · take · return · harm · kill · yield · spare · promise · keep · break · confess*) | beats read correctly from one root's acts |
| 3 | trope rows and the matcher, **one-root tropes only**; writes tagged with their trope; repetition diminishing | tropes write traits, regard and renown |
| 4 | the wrong-way writers moved onto tropes, their hand-written writes deleted; dialogue `regard:` → `beat:` | the fair fight, murder in plain sight, the broken promise, the word kept, the gift, the bad meal, a confession |

**Second build:** the author surfaces (could fire · has fired · the gap report), sequences and
absences across roots on game-clock windows, the helping and deception families, the narration a
player sees. **Neither:** rope's `ropework` literal onto knot rows (a small sweep), the transfusion's
unreachable revival deed (a defect fix).

## 10. Reuse ledger for the plan (survey 2026-11-24)

| concept | already does it | this build |
|---|---|---|
| trait ledger + write | `Dispositioned.imprintSignature/imprintDeed` → `disposition_events`; `Advancement.creditSignature` grafts `dispositionValence` | **reuse** — tropes write through it |
| regard write | `BeliefStore.adjustRegard/setRegard` | **reuse** |
| renown write | `RenownApi.append` | **reuse** |
| Discipline credit as data | recipes `discipline:`/`difficulty:` (`recordCraftEvidence`); joint rows `competence.discipline` (4 of 14 set); 27 reading rows | **reuse**; knot rows get `competence.discipline: ropework`, Rope.ts:783/:1111 + RopeJack.ts:349 read it |
| act signature shape | `lib/advancement/ActSignature.ts` | **check** — may be the act payload's ancestor; check `api/event.ts` too before anything new |
| actor resolution | `ExecutionContextApi.getActor` (execution-context.ts:738); `captureActor`/`runAsCaptured`; `runRoot` (:1186) allows a null caller, 52 sites, 2 `runRoot(null…)` | **generalize** — `runRoot` refuses with no actor or named system; siblings add sites (organism-biology 5, stream-arrival 1) |
| chokepoints | `postTransaction` (BankingLogic:2245, knows actor); `transferChattel` (Chattel.ts:105, no actor); `inflict`/`die` (ConditionLogic:232/:361, `getActingAuthor` not `getActor`); scheduler end (SchedulerRegistry `endedBy`, no actor); contract `breachClaim`/`fulfillImpl` (ContractLogic:446/:782, no actor) | **instrument** — each fires its act and learns its actor |
| witnesses | combat computes them in the moment (CombatLogic ~5549), discards them | **generalize** — captured once per root's act bundle |
| dialogue effects | `DialogueConversation` `regard` effect (:385); 23 effects in 8 lounge agent rows | **replace** with a `beat` effect |
| hand-written writers to delete | Blood.ts:101/113 + DonationBank.ts:403/413; ContractLogic:472 (dial 15); CombatLogic:5549 (dials −20/+2); Bonded.ts:848; PetController:83 | **move onto tropes**; IntroduceController:138 — plan decides (meeting mechanics vs characterization) |
| ratchet gate pattern | `const CEILING` in script (`check-create-sites.ts:44`, `check-counters.ts:55`, ceiling-0 `check-contribution-keys.ts:38`) | **reuse** — census of `creditDeed`/`creditSignature` with a literal Discipline (~100 today, ceiling = count) and of trait/regard/renown writes outside the trope matcher (ceiling 0) |
| trope / beat / event bus | none | **genuinely new**: act record, beat detectors, trope rows + matcher, `/system/narrative` pack |
| player reads | `traits`, `chronicle`, `competence`, `standing`, `profile` | **reuse** — show the trope tag |

## Cross-references

[trait-slate](./trait-slate.md) · [quest-modeling-slate](../world/quest-modeling-slate.md) ·
[narration-slate](./narration-slate.md) · [lineage-slate](../society/lineage-slate.md) § *What the
workplace stands for* · [measurement.md](../../measurement.md) · [advancement.md](../../subsystems/advancement.md)
(the act-signature) · [trait.md](../../subsystems/trait.md) · [accountability.md](../../subsystems/accountability.md)
