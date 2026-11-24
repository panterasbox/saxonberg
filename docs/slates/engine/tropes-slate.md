# Tropes slate — how content changes who you are, without a wizard's code

> **Status: DESIGNED IN CONVERSATION, UNBUILT** (2026-11-24) — the owner: *"I actually really like
> where all this is going let's start writing it up."*
> **Left:** the trope definition (roles · facts · writes) · the closed fact vocabulary, declared by the
> model operations that produce facts · the detector · the first roster (§ 6) · the author surfaces —
> *could fire here*, *has fired here*, the gap report · the escalation to a quest · moving today's
> hard-coded writers onto tropes · activity credit onto the rows the acts load
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

## 4. What a trope declares **[LEAN]**

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

## 6. The starting roster

*(To be filled from the fact survey — § 1's sources first: harm with consent, money, contracts, work
finished or abandoned. Drafted 2026-11-24.)*

## 7. Reference material — TV Tropes and the older catalogs

*(To be filled.)* The owner: TV Tropes is reference material for our own catalog *"the way
wikipedia is for other game concepts like materials"* — not a wiki we host, and the online world
need not agree with our definitions: *"it was just a random idea to spice things up."*

## 8. Open

- Where tropes live — a `/system/…` pack (characterization is true whether or not anyone is taking
  part), with quest templates beside them later **[LEAN]**.
- The closed fact vocabulary: which facts, and which model operations declare them.
- Intent: whether the consent-to-harm ledger is enough to tell a gift from extortion.
- Whether NPCs' acts write trait evidence too.
- How a player learns a trope fired — [narration-slate](./narration-slate.md) (salience, *acts never
  axes*).

## Cross-references

[trait-slate](./trait-slate.md) · [quest-modeling-slate](../world/quest-modeling-slate.md) ·
[narration-slate](./narration-slate.md) · [lineage-slate](../society/lineage-slate.md) § *What the
workplace stands for* · [measurement.md](../../measurement.md) · [advancement.md](../../subsystems/advancement.md)
(the act-signature) · [trait.md](../../subsystems/trait.md) · [accountability.md](../../subsystems/accountability.md)
