# #33 · The Lens of Rules

> One of the [Schell deck](./README.md). Lens named from *A Book of
> Lenses*; questions paraphrased, analysis our own.[^aogd-ru]

## The lens

To see a game's most basic structure: **what are its foundational rules,
and how do they differ from its operational ones? Are "laws" or house
rules forming as the game develops, and should they be incorporated
directly? Are there modes, and would the game be better with fewer? Who
enforces the rules? And are they easy to understand — if not, do you fix
the rules or the explanation?**

> **From the book.** Schell's framing claim is maximal, and he means it:
>
> *"Rules are the most fundamental of all game mechanics. A game is not
> just defined by its rules; **a game is its rules**."*
>
> They *"define the space, the timing, the objects, the actions, **the
> consequences of the actions**, the constraints on the actions, and the
> goals."*
>
> He then reproduces **David Parlett's rule analysis**, which is the most
> useful taxonomy in the chapter:
>
> | kind | what it is |
> |---|---|
> | **operational** | *"what the players do to play the game."* Understand these and you can play |
> | **foundational** | the underlying formal structure. *Operational:* "roll a d6 and collect that many power chips." *Foundational:* "the player's power value is increased by a random number from 1 to 6" |
> | **behavioral** | good sportsmanship — don't tickle your opponent while they think. *"A game is a kind of social contract between players"* |
> | **written** | the rules that ship with the game, which *"only a small number of people read"* |
> | **laws** | tournament rules. Formed **only** where stakes are high enough to need clarification |
> | **official** | written rules merged with the laws. *"Over time, these official rules later become the written rules"* |
> | **advisory** | rules of strategy — *"not really 'rules' at all from a game mechanics standpoint"* |
> | **house rules** | not Parlett's own category, but **the feedback arrow on his diagram**: players tune the operational rules after a few rounds, in response to a deficiency they perceived |
>
> On the foundational layer specifically: *"There is not yet any standard
> notation for representing these rules, and there is some question about
> whether a complete notation is even possible… seldom do they have any
> need to formally document the entire set."*
>
> And the **Enforcer** passage, which is the one to carry:
>
> *"In a sense, what used to be a 'rule' now becomes a physical
> constraint of the game world. If a piece isn't allowed to move a
> certain way, it simply doesn't move that way… By offloading the dull
> work of rules enforcement onto the computer, games can reach depths of
> complexity, subtlety, and richness that are not possible any other way.
> But proceed with caution… **You must make the rules of a complex
> videogame something that players can discover and understand naturally
> — not something they have to memorize.**"*

## Which of our seven it sharpens

**[Lens 7 · Governance](../design-lenses.md)** — its third instrument,
and the first to treat the **entrenchment tiers as a design object**
rather than as a governance artifact. Secondarily **lens 1** (the fifth
question is *how will anyone learn this*) and **lens 2** (the
foundational/operational line is the pack boundary).

## At what altitude

| answer | altitude |
|---|---|
| what can be enforced by code shall be — *and some of what can, must not be* | **invariant** |
| rules are discoverable, never memorized | **invariant** |
| the operational surface is exactly the foundational projection | **invariant** |
| a rule with no stated damage is advisory | **invariant** |
| don't promote a house rule — ship a default and leave it amendable | ⭐⭐ **the grain**; an author may entrench more inside their own content |
| one main mode, or several | **this title's** |

## Why our design prompts it

Because *"a game is its rules"* is the one sentence in the deck that
describes this project literally rather than by analogy. Most of what has
been built here is not content — it is a rule system with an unusually
formal expression and an unusually explicit account of **who may change
each rule.** This lens is the only one in 116 that asks about that
directly, and it arrives with a vocabulary we did not have.

## ⭐⭐⭐ Parlett's feedback arrow is the thing we built

Look again at the pipeline Schell describes: **house rule → law →
official rule → becomes the written rule.** Players tune the operational
rules; practice hardens into tournament law; law is merged into the
official text; the official text is what newcomers are taught.

He describes this as something that **happens to** games out in the
world — slowly, informally, by consensus among tournament organizers,
and entirely **outside the artifact.** No game he cites contains it.

> ⭐⭐⭐ **The Compact is Parlett's feedback arrow, promoted to a
> mechanic** — made explicit, made fast, and made auditable. Three
> chambers, two of three to carry, and an append-only record of what the
> rule was before somebody changed it.

That is a better account of lens 7 than either
[#25](./25-judgment.md) or [#37](./37-fairness.md) produced. Governance
is not a subject the deck omitted from lack of interest. **It is the one
arrow on Parlett's own diagram that every other game leaves outside the
box**, and the reason it can come inside is that the rules here are code
and the amendment can therefore be executed rather than agreed.

## ⭐⭐⭐ Two axes, and conflating them is the failure

Schell asks *who enforces the rules.* `measurement.md` answers *who may
change them.* Those are different questions and the docs have never said
so:

| axis | asks | values |
|---|---|---|
| **amendment** | who may change this rule | Tier **A** (nobody) · **B** (whoever ships the code, checked by the AGPL fork right) · **C** (the polity) |
| **enforcement** | who executes it | **wall · camera · witness · norm** ([enforcement-slate](../slates/builds/enforcement-slate.md)) |

They are orthogonal. A **Tier C** rule can be perfectly **wall**-enforced
— the polity sets a rate and the engine collects it — and that combination
is common and correct. And the frontier moves only on the second axis:
enforcement migrates toward code as engineering capacity allows, which is
an **economic** boundary and not a principled one.

Which makes the failure mode nameable, and it is not obvious:

> ⭐⭐⭐ **Implementing a law must not entrench it.** The engine gains the
> ability to enforce; the polity keeps the ability to repeal. A
> code-enforced Tier C rule stays **parameterized by the law** and is
> never compiled into the substrate — otherwise automation promotes C to
> B and nobody voted for it.

That is *"can it be added by amendment? ⇒ ship a default"* arriving from a
third direction, and it is the specific mechanism by which a well-meant
convenience becomes a substrate opinion — the altitude failure the rubric
now names.

## ⚠⚠ And the frontier has a deliberate stop

The natural reading of *what can be enforced by code shall be* is that
the boundary advances until only judgment is left. **Three separate
pieces of existing doctrine say it must not**, and together they are the
answer to Schell's enforcer question:

1. **A15, the evidence firewall** — *kernel omniscience never becomes
   diegetic evidence.* The engine sees every act; in-fiction justice
   gathers evidence in-fiction. *"A crime genuinely unseen is genuinely
   unproven, and that is a feature — a world where guilt is always
   provable needs no courts, values no reputation, and has no game in
   it."*
2. **The speed-camera doctrine** — *"the radar signs could ticket you and
   don't, because perfect automated enforcement is hated even when the
   rule is agreed. Prevention reads as physics; automated punishment
   reads as tyranny; witnessed process reads as law."*
3. **The mode is the politics** — a committee does not only write a rule,
   it picks how the rule is enforced, and *"a campus can wall its gates,
   camera its quad, or trust its people — three different societies, one
   statute."*

So the honest statement, and it should replace the partition reading
wherever the allocation is cited:

> ⭐⭐ **Two kinds of rule, and only one of them wants a moving frontier.**
> Rules about **whether the world is honest** — conservation, append-only,
> title, provenance — must be code-enforced, and the frontier advances
> toward code as fast as we can afford it. Rules about **how people behave
> in the world** must not be over-enforced, because there the
> *imperfection* of enforcement is the content.
>
> The test that separates them: **does the rule protect a claim the
> platform makes, or a norm the polity holds?**

⭐ And note what Schell got right and stopped short of. `wall` mode *is*
his *"what used to be a rule now becomes a physical constraint"*, and he
is correct that it buys complexity headroom nobody else can have. What he
does not see is that **the same move applied to a social rule produces
`camera`, which is the mode everyone hates.** One enforcer question, a
four-valued answer, and the value is a political choice rather than an
engineering default.

## Q1 · foundational vs operational — we are required to have the notation

Schell says there is no standard notation for foundational rules and
doubts a complete one is possible; designers see them as needed and
seldom write the set down. **We cannot work that way.** The foundational
rules are the TypeScript — mixins, `fieldMeta`, the Api surface, the
derive-on-read formulas. The operational rules are the command palette:
`hew`, `pour`, `apply`, `clock on`.

⭐ And the governing invariant is a statement *about the relationship
between the two layers*: `callable == visible == cared-about` says the
operational surface is exactly the projection of the foundational one,
with nothing hidden and nothing phantom, and `lint:family` is the gate
against drift. Parlett's two layers, wired together and tested.

⭐⭐ **The pack boundary is this line, enforced by lint** — though not
quite where I first placed it. A pack may ship branch classes,
controllers, brains and a `lib/` of inherited substrate; it may not ship
an Api or a logic singleton. So the rule is not *content may not touch
foundations*. It is sharper: **you may add rules; you may not add
enforcement.** The gate is the kernel's.

⚠ **The cost, which is worth stating once and has not been:** our
foundational rules are complete **as code** and are *not* complete **as a
statement of the game**, because Tier C law is content and the polity
writes it at runtime. So **`help` can never be complete the way a
rulebook is.** That is not a defect — it is what the platform is for —
but it means no artifact ever contains all the rules, and a newcomer's
question *"what are the rules here"* has a jurisdiction-dependent answer.

## Q2 · should house rules be incorporated directly — we answer *no*

Parlett's arrow runs toward entrenchment. Our standing doctrine runs the
other way: *"can it be added by amendment?" ⇒ ship a default.*

> ⭐⭐ **For us, promotion is the failure mode rather than the goal.**
> Tier A is the set that was never a house rule to begin with, and the
> right response to a good house rule is usually to leave it in Tier C
> and make it cheap to keep.

⭐ **With one place we run Parlett's arrow deliberately, and it is not in
the game.** `census-then-ratchet` is house-rule → law → official rule
applied to the codebase: an antipattern's count starts as a habit
("stop adding these"), becomes a **ceiling** that may fall and never
rise, then goes to zero and freezes. Same arrow, same direction, and the
only place here where entrenchment is the intended end state — because
the subject is us, not the polity.

## ⭐⭐ Q3 · modes — the sandbox is the one that matters, and Tier A is why it works

Our real mode switch is the **sandbox versus the published world**, and
A14's symmetric boundary is the strongest available form of Schell's
*let players know which mode they are in*: the boundary is a **place you
walk through**, with a wardrobe door.

And the rule set the sandbox suspends is not arbitrary:

> ⭐⭐ **The sandbox suspends every rule except the ones that make
> suspension affordable — and those are Tier A.** Not an analogy: **A9**
> (*content-write never grants code execution*) and **A14** (*nothing
> crosses into or out of a circle*) are literally Tier A rows. The same
> construct at two scales — Tier A is amendable by nobody *because it is
> what makes amendment safe.*

⚠⚠ **But the drafting story only holds for content.** The intuition that
a player drafts a new rule in the circle and petitions to have it
published into the game is how **content** works and is **not** how
**code** works: [sandbox.md](../subsystems/sandbox.md) is explicit that
the circle contains *new content at new paths* and does not contain edits
to published source — *"the holodeck lets you exercise the edit safely,
but the edit itself is a field act on the governed channel, contained by
receipts and review, not by the circle."*

> ⭐⭐⭐ **So the foundational rules have no legislature.** The Compact
> builds a full amendment machinery for operational rules and there is no
> counterpart for foundational ones: Tier B is amendable by *whoever ships
> the code*, the check is B7's fork right, and the ratifying act is a
> merge request. **A merge request is not a governance act**, and the
> asymmetry is currently invisible because nobody has asked for the other
> path.

Other modes are thinner than they look: the cockpit's mode × arrangement
axes are presentation, `enroll` is a bounded funnel, a combat session is
a scoped engagement, and **linkdead is the pause** ([#27](./27-time.md)).
None of them changes the rules the way *Pitstop* changed them.

⚠ **Sid Meier's rule has one place to bite: the legislature is a subgame
with no timer.** Committee work, forum argument and drafting law is where
a player can spend unbounded time and lose the thread of everything else.
There is a candidate reading — that we deliberately have **three main
modes rather than one main mode with submodes**, because the Producer,
Capital and Consumer chambers are meant to be different games — and I am
flagging it as **unresolved** rather than asserting it, since "mode" in
Schell's sense means the rules change completely and it is arguable
whether producer-versus-capital clears that bar. Either way the rule gives
us a **testable failure**: if consumer-house players routinely forget what
they were doing, the design is wrong.

## ⭐⭐⭐ Q4 · who enforces — and a rule with no stated damage is advisory

Schell's list of what rules define includes **the consequences of the
actions** — and then not one of his five questions asks about
consequence. Across 116 lenses the deck has #99 Griefing (untaken) and
**nothing at all on remedy or proportionality.** That is a hole in the
lens, not only in us, and it yields a test:

> ⭐⭐⭐ **A rule with no stated damage is an advisory rule** — Parlett's
> own last category, *"not really 'rules' at all from a game mechanics
> standpoint."* If nothing follows from breaking it, it is a suggestion
> with a stern tone.

We are better placed here than the docs make obvious. The
[courts slate](../slates/builds/courts-slate.md) holds a remedy menu over
a **conserved remedy**; [prison-slate](../slates/builds/prison-slate.md)
holds confinement, the three enforcement tiers, and the guardrail that
**real-conduct offences never get a diegetic costume**;
[enforcement-slate](../slates/builds/enforcement-slate.md) holds the mode
vocabulary; `accountability.md` holds the ledger all of it rides. What is
missing is not the machinery. It is **the ceiling**:

> ⭐⭐ **A punishment ceiling is Tier A or it is nothing.** If the polity
> can raise its own maximum penalty, there is no maximum. The
> [amendment-library slate](../slates/builds/amendment-library-slate.md)
> already carries the ceiling as its question 8 — perma-death, total
> forfeiture, indefinite confinement — so the home exists; **what is
> missing is the tier**, and putting it anywhere but A makes it
> decorative.

That is [#110](./110-transformation.md)'s hedge applied to remedy: the cap
is what you write *in case you are wrong* about people being basically
good. And it is the fifth independent arrival at **friction and daylight**.

⭐ **Three enforcers, where Schell's question assumes one.** The code
enforces A and B; the polity enforces C; and **the record enforces against
the operator** — append-only ledgers, `chronicle`, `provenance`, and B7.
Every mechanism Schell describes protects players from each other. Ours
must also protect players from *us*, because here the house is a party.

## Q5 · confusion — derive the explanation from the rule

Schell's dichotomy is *fix the rules or fix the explanation*, and he notes
that written rules go unread and that modern games teach through play:
*"Every game designer must have a ready answer to the question: 'How will
players learn to play my game?' Because if someone can't figure out your
game, they will not play it."*

⭐ **There is a third option he does not list, and it is ours:** derive the
explanation from the rule. `help.md` harvests its index rather than
registering it — *"the field list is harvested, never restated"* — topics
come off `fieldMeta` and `Collections`, the help-wanted sign is derived,
`errors` reports itself, and `lint:schema` gates that the docs, the
generated tables, the record classes and the subsystem docs all agree.
**His dichotomy only exists because the rules and the document are
separate artifacts.** When the document is generated, a wrong explanation
is a bug in the rule's own declaration.

⭐⭐⭐ **And his caution is our refusal doctrine arriving from the other
side.** *Discoverable, not memorized* is exactly *the refusal is the
progression UI — if something lifts a bar, the verb must exist so you can
be told.* The retirement of verb conferral is the cleanest case:
**conferral makes a rule invisible** (no verb, so nothing to discover);
**refusal makes it discoverable** (the verb is there and says why not). We
retired conferral for architectural reasons and it turns out to have been
the pedagogically correct answer as well.

## The verdict

**An alternative, on the two questions that matter, and adopt on the
rest.**

⭐ **Adopt** the vocabulary wholesale. *Foundational · operational ·
behavioral · written · law · official · advisory · house* is the missing
vocabulary for a project whose central artifact is a rule system, and it
gives us the *advisory* test above for free.

⭐⭐ **An alternative on Q2.** Parlett's arrow runs toward entrenchment;
we run it backwards on purpose, and the one place we run it forwards is
the codebase rather than the game.

⭐⭐⭐ **An alternative on Q4, and it is the entry's payload.** Schell has
one enforcer and treats code enforcement as an unalloyed win bounded only
by comprehensibility. We have **four modes and a deliberate stop**: where
the rule protects a claim the platform makes, the frontier advances as
fast as capital allows; where it protects a norm the polity holds,
advancing it produces `camera`, and A15 forbids handing the engine's
omniscience to in-fiction justice at all.

## Tensions & risks

⚠⚠ **The foundational rules have no amendment path, and that is a real
asymmetry**, not merely an unbuilt feature. The polity may rewrite its
law and may not propose a mechanism. B7's fork right is a genuine check
and a very blunt one — *leave and take a copy* is not participation.

⚠⚠ **Nothing checks that a Tier C rule stayed parameterized.** The
*implementing a law must not entrench it* rule above has no gate, no
lint and no review question. It is the exact shape that
`census-then-ratchet` is good at and nobody has written the census.

⚠ **A polity can pass an incomprehensible law.** Schell's Q5 assumes the
designer can fix the confusion. Law==code rides forums, so a law has a
diff and a discussion — but nobody is obliged to read it, and *"I did not
know the law"* is a defence the game has no position on. That is lens 7's
hole, not lens 1's.

⚠ **`advisory` is probably where several of our own rules sit.** The test
is cheap to apply and has never been applied: a doctrine everyone
endorses with no stated consequence for breaking it is advisory, however
many stars it carries.

## Implications

1. ⭐⭐⭐ **Record the two axes in `measurement.md`.** The tiers answer
   *who may amend*; the enforcement modes answer *who executes*; and
   **implementing a law must not entrench it** is the rule that keeps
   them from collapsing into each other. Today a reader can reasonably
   conclude the tiers are the whole story.
2. ⭐⭐⭐ **Amend the allocation's framing wherever it is cited.** *What
   can be enforced by code shall be* is a **ratchet with an economic
   frontier and a principled stop**, not a static partition — see
   [#25](./25-judgment.md), which states the partition reading.
3. ⭐⭐ **Tier the punishment ceiling.** Answer
   [amendment-library](../slates/builds/amendment-library-slate.md) Q8
   with a tier before answering it with a number.
4. ⭐⭐ **Apply the advisory test to our own doctrine.** For each starred
   rule in the docs: what is the damage, and who collects it? Census
   first.
5. ⭐ **Decide whether foundational rules get a petition path.** Today the
   ratifying act for a mechanism is a merge request. That may be correct
   — it is Tier B, and Tier B is the founder's — but it should be a
   decision rather than an omission.
6. ⭐ **Write the Q5 answer down as a claim.** *We derive explanations
   from rules* is a real and unusual property, currently visible only as
   four separate harvesting mechanisms that nobody has connected.
7. **Pair with [#95½ Cheatability](./README.md)**, which sits in this
   same section and carries the other half of the enforcement argument —
   *the belief that a game is cheatable destroys endogenous value even
   when the belief is false*, which is the general form of the
   wizard-asymmetry problem [#37](./37-fairness.md) answered
   constitutionally.

[^aogd-ru]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #33, the Lens of Rules**
    (≈ pp. 189–190), closing *Mechanic 5: Rules* in the game-mechanics
    chapter (≈ pp. 184–188, Figure 12.14 being Parlett's diagram). The
    five questions, Parlett's taxonomy, the *"a game is its rules"*,
    Enforcer and *"discover and understand naturally"* passages, and Sid
    Meier's subgame rule of thumb are Schell's; all analysis ours. Read
    from the author's Google Play edition, 2026-09. Lens numbers are
    stable across editions.
