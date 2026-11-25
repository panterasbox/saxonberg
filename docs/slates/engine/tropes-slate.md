# Tropes slate — the primitives of plot, and how content changes who you are

> **Status: DESIGNED IN CONVERSATION, UNBUILT** (2026-11-24; rewritten the same day around the
> narrative frame, § 1). The owner: *"I actually really like where all this is going let's start
> writing it up."*
> **Ruled (§ 3):** one mechanism · credit named by the act's definition · the act is an incident ·
> tropes look back by asking the ledgers · care is durable · regard is derived · no work starts
> anonymous.
> **Left:** the beat vocabulary, re-derived from the census (§ 4) · the trope definition's final
> shape · the roster against the census (§ 6) · the author surfaces (§ 5) · the build path (§ 9) ·
> regard's derivation cost (§ 3.6).
> **Requirements:** [tropes-requirements](../../requirements/tropes-requirements.md) — ⚠ a first
> draft, written before this rewrite; NOT agreed, to be redrafted from this slate.
> **Size:** a build, probably two.

## 0. The ask

**2026-11-24, the owner**, from the lineage demo, which needs a trait lean per workplace and has no
way to measure one: *"right now my solution to 'what do I do if I want to change a trait or
discipline on a player' is 'you get a wizard to write some code that does it' but that's not gonna
scale and it doesn't lead to good design anyway we need to actually figure out how this is
expressed in content so we dont need to write new code for every 'situation'."*

And the scope for a first build: *"the entire tropes and traits and discipline and advancement shit
wont be solved in this build but I wanna stop the bleeding with respect to us minting this stuff
arbitrarily in the code with some kinda framework we can start using as more and more trades and
jobs and stuff get designed and built."*

This slate is the instrumentation question [trait-slate](./trait-slate.md) § *How content expresses
change* parked, and its § *The gap* problem 4 (*wiring is deferred and unbounded*).

## 1. ⭐⭐⭐ The frame — narrative, at every scale **[DECIDED — the owner, 2026-11-24]**

> The owner: *"you need to think of this in terms of trying to capture what it is to be a narrative.
> that's the broader project behind all of this is to tell a story. well actually many stories, at
> different breadths and depth."* … *"what you're trying to describe with 'what is the act?' is 'how
> do we model primitives for plot'."* And: *"that should have actually been in the slate instead of
> me having to frame it that way."*

### The scales

| scale | what it is | in this game |
|---|---|---|
| **a life** | a character from first session to last — a beginning, a middle, an end | the game lives in the **middle**: the beginning should be over as fast as possible, and we do not design for the end |
| **a quest** | the traditional game story — plot, characters, setting, combined with an author's style into a dramatic experience (Aristotle) | [quest-modeling-slate](../world/quest-modeling-slate.md) |
| **a trope** | the more primitive piece — still a narrative, with plot, character, setting and a beginning, middle and end; it may lack an author's style, and can supply it in prose | **this slate** |

There may be other manifestations of narrative still to explore; this is not the last word.

### Setting, character, plot — who supplies each

- **Setting** comes from places — locations, zones, localities, structures, expanses.
- **Character** comes from agents.
- Both are **content**: an author stages and restages them, or they endure by persisting themselves.
- ⭐ **Plot happens once.** It survives only as a **record** and a **telling**, so plot is the one
  element the engine itself must remember. **The platform supplies the primitives of plot; it never
  decides story — content does.** (Content is optional packs; only the lounge and Dave's Bar are
  worked on now.)

### What Aristotle gives the design

- **Plot is the arrangement of incidents; an incident is an action — an agent choosing.**
  **Character is what is revealed in choice.** That is what traits are: never what happened near
  you, only what you chose.
- **Incidents connect by *because*, not *after*.** Grouping is not causality.
- **Beginning, middle, end at every scale**; judgment comes at the **end**. A trope writes when its
  arc closes.
- **Reversal and recognition** are changes of **knowledge**, not of the world.

### ⭐⭐ The test for plot substrate — N1–N7

Not a new lens (*"every one of them can function narratively"* — the seven already read as
narrative). It is the set of questions put to anything that **records what happened**: acts,
ledgers, the chronicle, tropes, quests, narration. The headline: **does this primitive let content
tell a story without the platform telling it?** (A choice's cost recorded: yes. *Generous*
hard-coded: no — that is the blood gift's constant.)

| | question |
|---|---|
| **N1** | **Incident or machinery?** A character's choice or a blow of fortune — or stage machinery (moving a crate, a timer)? Only incidents are plot. |
| **N2** | **Because of what?** Which incident caused it; what can it cause. |
| **N3** | **What did it cost the chooser, and was it free?** Character shows only where there was a cost and an alternative; compulsion and consent are part of the incident. |
| **N4** | **Who knows?** Witnesses are the audience; learning later is its own incident. |
| **N5** | **Where in an arc, and at what scale?** Beginning, complication, ending; is the ending told? |
| **N6** | **Must it survive?** Record what a later arc may need — nothing more. |
| **N7** | **Who supplies the telling?** The author's style when there is one; the trope's default prose when not. |

## 2. What the game does — the census (2026-11-24)

Four surveys over the kernel and every pack. Grouped by the kind of interaction, not by any beat
list:

| kind | examples | touches | durable record today | written about the actor today |
|---|---|---|---|---|
| **A. working matter alone** | smelt, forge, fell, hew, sink, bore, sew, tan, spin, cook, brew, glaze, print, plough, dig, the readings | nobody (sometimes a place) | almost nothing — the object's state | Discipline credit: ~half from rows, ~100 sites hard-coded; success only, nearly everywhere |
| **B. taking from living things** | rob a hive, milk, shear, tap, fish, release, slaughter, butcher, harvest | an animal, a colony, a stand, a water | the herd book, the waters registry; a chronicle deed for releasing an apex fish | Discipline only; robbing a colony to starvation leaves no trace |
| **C. caring for a body** | suture, set, operate, transfuse, tend, treat, dose, feed, water, pet; nurse NPCs | another person or animal | the patient's body state only | the carer's Discipline; nothing about care |
| **D. harm** | attack, shoot, throw at, a trap, poisoned food, a spell, severing a line, a fox's raid | person, animal, a line's customers | the accountability ledger (7 producers): consent and blame, no witnesses | combat's −20/+2 regard; nothing about the actor's character |
| **E. exchange** | buy, sell, rent, pay, tip, borrow, consign, serve (no charge yet), an assay fee | a person, a shop, a bank | the bank ledger (accounts, not people), chattel events | finance credit, hard-coded; the blood gift — the only trait write in the game |
| **F. promises and institutions** | job claim/fulfil/abandon, leases, hire/dismiss, a claim staked, title transfer, berths, office, a TPA card, dorm provisioning | a person or institution | a dozen separate books | breach −15 regard; nothing else |
| **G. speech and social** | say, dm, react, introduce, dialogue choices, forum vote | other people | chat history, forum votes | 23 hand-authored regard numbers in the lounge's dialogue |
| **H. moving, perceiving, posture** | walk, sneak, flee, search, hide, look, sit | mostly nobody | nothing | nothing |

What it taught:

1. ⚠ **The first draft's roster lived in D, E and F — the smallest part of the game.** The bulk is A;
   C is a whole trade with NPCs doing it all day.
2. **Nothing ties one act's records together** — no ledger stores an act id; the causing-command id
   exists at runtime and is never written. Each harm producer invents its own session id.
3. **NPCs perform a large share of acts** (nurses, herders, reelers, consigners, the fox).
4. **Only success earns anything** — failure, persistence and abandonment, the raw material of
   diligence and patience, are almost never recorded.
5. **Most physical acts run through three shapes** — a timed build, an engaged act, a worked or
   tapped host — and every act already loads some definition (§ 3.2).
6. **`ActSignature` was built as "one signature, two outputs"** — Disciplines and a trait valence —
   and only the blood gift ever used the second half.

The hand-written characterization writers: the blood gift (`Blood.ts`, `DonationBank.ts`; trait +
renown), combat's unlawful kill and duel win (`CombatLogic`), the contract breach (`ContractLogic`),
the bad hand-feeding and petting (`Bonded.ts`, `PetController`), introductions
(`IntroduceController`), and the lounge's 23 dialogue `regard` effects.

## 3. ⭐⭐⭐ Rulings **[DECIDED — the owner, 2026-11-24]**

### 3.1 One mechanism: tropes characterize, nothing else does

- **What an act IS** — its Disciplines, difficulty, outcome — is activity credit, recorded as a fact.
- **What kind of person did it** — traits, and the regard and renown of those who saw it — comes
  **only from tropes**. ⛔ No trait value on an act's row: that is the per-site label the owner
  rejected (*"instrumenting one trait per site is a waste"*; *"this court tests composure"* means
  nothing), moved from code into data.
- **A solitary act is a trope with one role.** *Seeing It Through* — a worker fails at hard work and
  later succeeds at the same kind — is written once and fires at the forge, the glass bench, the
  mine and the operating table. Single-act, one-role tropes are the **bulk** of the roster, not the
  edge case.
- `ActSignature`'s trait-valence slot is **retired**; the blood gift moves onto a trope.
- Lens 2 chose it (one trope, every trade gains it, no row touched); lens 1 agrees (*finishing hard
  work after failing makes you patient* is a rule a player can learn).

### 3.2 The act's definition names its credit

**The definition the act already loads to know how to proceed names its Discipline — never code.**

| definition | acts | today |
|---|---|---|
| a recipe | every craft | ✅ data (185 rows) |
| a joint, knots included | tie, splice, rivet, peen | 4 of 14 rows; rope hard-codes `ropework` |
| a reading | measure, analyze, assay, survey, postmortem | 27 rows carry it; most code ignores the row |
| the host's kind — species, plant, deposit, stand, working, trap, vessel, dirt | milk, shear, tap, harvest, fell, hew, rob a hive, disarm, fill, brush, wash | partly (livestock, cocoons, plants); the rest hard-coded |
| an operation | suture, set, operate, transfuse, prescribe | hard-coded; the operation catalogue exists (organism-biology moves difficulty onto it) |
| a way of moving | swim, climb, ride, sail, navigate | hard-coded |
| a model that derives it | combat moves, spells | ✅ derived |
| an institution's service | an account's use, an assay | hard-coded |

- **Per act, not per host** — a hive's row says robbing is apiculture; a ship's, that handling is
  seamanship and setting a course navigation (taps already work so).
- **Difficulty: authored default on the definition, a model overrides when it can measure** (ore
  grade, a wound's severity). advancement.md's *"difficulty is a world-measurement"* stays the
  ideal; the default keeps the ordinary case code-free (lens 2).
- **Failure is recorded AND credited, with its outcome** — the competence bands weigh it (lens 1:
  you learn from a burnt batch). Abandonment is recorded too.
- ⭐ **The ratchet is mechanical:** the credit call takes the definition, not a Discipline name, so
  a new trade cannot hard-code one. The ~100 sites become a sweep with a known shape.

### 3.3 The act is an incident

- **An act is one character's choice, or one happening of fortune** (spoilage, a storm, a fox's raid
  no one chose for you). It carries: **who chose · what changed, and for whom · what it cost the
  chooser · whether the choice was free · what it follows from · who saw or learned of it.**
- ⭐ **Because, not after.** The causing-command id the engine already replants on deferred work is
  persisted as the act's **cause**: the forge finishing three hours later is not a new act — it is
  the **end** of the act begun at the choice, and the outcome lands there.
- **Machinery is not recorded** (moved, crossed, picked up) unless an act's meaning needs it — a
  taking, a flight, an arrival.
- ⭐ **Knowing is a kind of act** — discovering, recognizing, being told. Belief's discovery is where
  recognition starts. *Light-Fingered* fires when the owner finds out.
- **Durable on the ledgers that already exist** — bank ledger, chattel, contracts, accountability,
  and the transcript as the record of work. Each row gains the act id, its cause, and the people
  involved as **people, not accounts**; the work record gains its definition and finished/abandoned.
  ⛔ No new collection.

### 3.4 Tropes look back by asking the ledgers; every write cites its act; endings are told

- A trope reaching back in time **queries the ledgers by person** (derive-on-read, like traits) —
  no in-memory partial matches a restart loses, no cursors. Multi-act tropes stop being a
  second-build problem for anything a ledger records. (A quest may still keep a durable cursor.)
- **Every trope write cites its trope and its act** — any trait change traces to what happened: the
  first step of the appeal lens 7 found missing.
- **A closing trope writes its telling to the chronicle** (N7) — the life-scale record already
  exists: deeds and claims, with *who* and *where*. A content author's prose overrides the trope's
  default.

### 3.5 Care is durable

Care is plot — a choice, at a cost, for another's sake. The work record carries its **counterparty**,
so the patient is on it, care tropes can look back, and *the Good Samaritan* comes into reach.

### 3.6 Regard is derived from remembered incidents **[DECIDED in direction; cost open]**

Regard is how one character remembers another's story, so it derives from the incidents they
**witnessed or learned of**, not an overwritten number. This is a real build cost on belief —
possibly its own build (trait-slate's open question, now ruled in direction).

### 3.7 Who is acting — no work starts anonymous

- **The in-fiction actor is `ExecutionContextApi.getActor()`.** ⛔ **Authorship
  (`getActingAuthor`, provenance) is the out-of-fiction labor plane only** — the owner: *"who
  authored a thing has nothing to do with anything except shit on the labor plane outside of the
  fiction."* Harm, death and chattel resolving their actor by authorship is a **defect**.
- **The rule, made structural:** no work starts without an actor or a named system — `runRoot`
  refuses otherwise. AsyncLocalStorage already carries the context across `await`; the places that
  start work fresh (`ScheduleApi`, the engagement scheduler, the world clock, the sandbox) capture and
  restore the actor; brains act inside `runAsSelf`.
- **To verify:** prompt resume, a reaction triggered by a message, the REST/CMS boundary.

## 4. Beats — the plot vocabulary **[OPEN — re-derive]**

A trope's plot is written in **beats** with roles, never in ledger rows. The first draft's twelve
(*give · exchange · take · return · harm · kill · yield · spare · promise · keep · break · confess*)
came from the hand-written writers and Propp, and cover only census groups D–G. To re-derive against
§ 2 and § 3.3: **work** (finished, failed, abandoned — group A); **taking from the living** (B);
**care** (C); **knowing** (discover, recognize, be told); **fortune** (a happening with no chooser).

Settled about beats:

- **Content asserts beats, never tropes.** A dialogue choice says *this is a confession, by the
  player, to the speaker* (replacing today's raw `regard:` effect); a charity box, *money given to me
  is a give*; a temple, *a death here is a desecration*. The matcher matches beats detected or
  asserted alike, so a confession asserted today can complete a redemption over a break the world
  detected last week.
- **Acts fire only at the engine's chokepoints**, gated by call security (`FromModule` of the
  chokepoint modules); feature code never fires one, so no review inventories acts. An act records
  what changed, never what it meant, so the list is stable while every reading above it changes.
- ⛔ No `EventApi` bus for this (a bus with one listener is pointless).

Open: who holds the pen on beats (a closed kernel list, or a gated set of template authors).

## 4a. What a trope declares **[LEAN]**

```yaml
trope: seeing-it-through
cast:
  worker: { can: act }
plot:
  - work: { by: worker, difficulty: hard+, outcome: failure }
  - work: { by: worker, same-kind, outcome: success }
writes: worker (patience, diligence)
telling: "{worker} failed at {kind}, and went back to it until it came right."
reference: …
```

**Cast** (roles, each narrowed by what it must be able to do) · **plot** (beats over the roles,
including *never* beats — no payment) · **writes** (traits, regard, renown) · **telling** (default
prose) · **reference** (where the idea came from, § 7). Magnitudes are dials; how much one act may
write is trait-slate's denominator.

## 5. ⭐⭐ Legible to authors **[LEAN]**

The owner: *"both in terms of 'I wrote this content what trope(s) should I reach for?' and 'I want
this trope(s) to run what content do I need to write to get there'."*

1. **Content → tropes.** *Could fire here* from the content's composition — which roles its things
   can fill, which beats its acts can make; *has fired here* as a projection over trope writes by
   place. The gap between them is the author's best signal.
2. **Trope → content.** A **gap report** against a place: per role, who here can fill it; per beat,
   can anything here make it happen. The author writes the missing **stage**, never the plot.
3. **Tropes sharing a cast are a quest, and the tool says so** — one catalog at two sizes.
4. Surfaces: the catalog as pages; per content (could · has · gap) in the CMS and an author command
   beside `which`.

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


### Added by the census and the rulings (2026-11-24)

| trope | roles | fires on | writes | status |
|---|---|---|---|---|
| **Seeing It Through** | worker | hard work failed, then the same kind succeeded | patience, diligence up | needs failure recorded (§ 3.2) |
| **Walking Off the Job** | worker | work begun and abandoned | patience, diligence down | needs abandonment recorded (§ 3.2) |
| **Tending the Stranger** (the Good Samaritan) | carer, patient | care given to someone the carer has no tie to | compassion up; the patient's regard up | needs the counterparty on the work record (§ 3.5) |
| **Robbing the Hive Bare** | keeper, colony | taking a colony's stores past what it can winter on | a care/greed reading — ⚠ intent: the keeper may not know | needs the colony's state at the take |

⚠ The tables above are the first draft's and still lean on groups D–G; the roster is re-derived
against § 2 with the beat vocabulary (§ 4).

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

- The beat vocabulary and its pen (§ 4).
- Regard's derivation — its cost and whether it is its own build (§ 3.6).
- Witnesses: who could perceive the place, captured at the act — perception, light and concealment
  decide it; the shape of the capture.
- Intent: whether consent and cost are enough to tell a gift from extortion; a fact with no known
  intent fires no trope on the actor's character.
- Where tropes live — a `/system/narrative` pack **[LEAN]**, quest templates beside them later.
- How a player learns a trope fired — [narration-slate](./narration-slate.md); the chronicle telling
  (§ 3.4) is the first surface.
- Fortune: which happenings with no chooser are plot (a storm that sinks a ship is; a loaf going
  stale is machinery).

## 9. The path to a first build **[OPEN — to re-derive from § 3]**

The owner's scope (§ 0): stop the bleeding with a framework trades and jobs adopt as they are
designed. The shape the rulings point at — to be agreed, not ruled:

1. **The actor and the cause** — no work starts anonymous; authorship out of in-fiction attribution;
   the causing-command id persisted as an act's cause on every ledger row.
2. **The work record** — credit named by the definition (§ 3.2), failure and abandonment recorded,
   the counterparty carried; the API takes a definition, never a name, and a ratchet holds the
   hand-written sites at their count, falling.
3. **Tropes** — rows, the matcher, look-back by ledger query, writes citing trope and act, tellings
   to the chronicle; the hand-written writers moved onto tropes and deleted; dialogue `regard:` →
   asserted beats.
4. **Deferred:** the author surfaces, regard's derivation (§ 3.6), the remaining credit sweep.

## 10. Reuse ledger for the plan (survey 2026-11-24)

| concept | already does it | this build |
|---|---|---|
| trait ledger + write | `Dispositioned.imprintSignature/imprintDeed` → `disposition_events`; `Advancement.creditSignature` grafts `dispositionValence` | **reuse** — tropes write through it |
| regard write | `BeliefStore.adjustRegard/setRegard` | **reuse** |
| renown write | `RenownApi.append` | **reuse** |
| Discipline credit as data | recipes `discipline:`/`difficulty:` (`recordCraftEvidence`); joint rows `competence.discipline` (4 of 14 set); 27 reading rows | **reuse**; knot rows get `competence.discipline: ropework`, Rope.ts:783/:1111 + RopeJack.ts:349 read it |
| act signature shape | `lib/advancement/ActSignature.ts` — a type only, built in code; `dispositionValence` used once (blood) | **retire the valence slot** (§ 3.1); the Discipline half stays, its definition named by the act (§ 3.2) |
| the work record | transcripts: owner, discipline, difficulty, outcome, when (`creditSignatureImpl`, Advancement.ts:123) | **generalize** — gains act id, cause, definition, counterparty, finished/abandoned |
| the cause | `causingCommandId`, replanted on deferred roots by `ScheduleApi`; never persisted | **persist** on every ledger row as the act's cause (§ 3.3) |
| the telling | chronicles: deed/claim, template/text, `who[]`, `where` | **reuse** — a closing trope writes its telling (§ 3.4) |
| a pub/sub bus | `api/event.ts` (`EventApi`, in-memory listeners) | ⛔ not for acts (§ 4) |
| actor resolution | `ExecutionContextApi.getActor` (execution-context.ts:738); `captureActor`/`runAsCaptured`; `runRoot` (:1186) allows a null caller, 52 sites, 2 `runRoot(null…)` | **generalize** — `runRoot` refuses with no actor or named system; siblings add sites (organism-biology 5, stream-arrival 1) |
| chokepoints | `postTransaction` (BankingLogic:2245, knows actor); `transferChattel` (Chattel.ts:105, no actor); `inflict`/`die` (ConditionLogic:232/:361, `getActingAuthor` not `getActor`); scheduler end (SchedulerRegistry `endedBy`, no actor); contract `breachClaim`/`fulfillImpl` (ContractLogic:446/:782, no actor) | **instrument** — each fires its act and learns its actor |
| witnesses | combat computes them in the moment (CombatLogic ~5549), discards them | **generalize** — captured once per root's act bundle |
| dialogue effects | `DialogueConversation` `regard` effect (:385); 23 effects in 8 lounge agent rows | **replace** with a `beat` effect |
| hand-written writers to delete | Blood.ts:101/113 + DonationBank.ts:403/413; ContractLogic:472 (dial 15); CombatLogic:5549 (dials −20/+2); Bonded.ts:848; PetController:83 | **move onto tropes**; IntroduceController:138 — plan decides (meeting mechanics vs characterization) |
| ratchet gate pattern | `const CEILING` in script (`check-create-sites.ts:44`, `check-counters.ts:55`, ceiling-0 `check-contribution-keys.ts:38`) | **reuse** — census of `creditDeed`/`creditSignature` with a literal Discipline (~100 today, ceiling = count) and of trait/regard/renown writes outside the trope matcher (ceiling 0) |
| trope / beat / event bus | none | **genuinely new**: beat detectors, trope rows + matcher, `/system/narrative` pack — the act is the existing ledgers plus an id and a cause (§ 3.3), not a new record |
| player reads | `traits`, `chronicle`, `competence`, `standing`, `profile` | **reuse** — show the trope tag |


## Cross-references

[quest-modeling-slate](../world/quest-modeling-slate.md) and [narration-slate](./narration-slate.md) read their plot work through § 1.

[trait-slate](./trait-slate.md) · [quest-modeling-slate](../world/quest-modeling-slate.md) ·
[narration-slate](./narration-slate.md) · [lineage-slate](../society/lineage-slate.md) § *What the
workplace stands for* · [measurement.md](../../measurement.md) · [advancement.md](../../subsystems/advancement.md)
(the act-signature) · [trait.md](../../subsystems/trait.md) · [accountability.md](../../subsystems/accountability.md)
