# Identity & its ledgers — requirements

**Kind:** refactor/sweep + infra
**Leads from:** kernel — first consumer is the **existing cast of 42
characters**, who are already written, already standing in shipped rooms,
and already reading as nobody.

Everything this world knows about a person, it derives from what that
person did. That is honest for a player, who accumulates a real history by
playing. It is a lie about everyone else: **an authored character has done
nothing, so the world reads them as having done nothing.** Dave, who runs
a bar, is a novice bartender. The registrar who is the city's entire civil
service has no record of it. Every venue this project has shipped is
staffed by people who read as having never done the job.

This build lets an author say what a character has been through, and has
the world believe it exactly as if it had happened — and settles the
question that keeps falling out of it: *when somebody who is only a role
does something, or has something done to them, who answers?*

Seeded by [dossier-slate](../slates/builds/dossier-slate.md) and
[cast-archetype-slate](../slates/builds/cast-archetype-slate.md).

---

## What already exists

**People can be read.** You can look at someone and take in their state.
A trained eye names a condition where an untrained one sees only a sign —
competence already buys information. Characters carry a personality that
was seeded from an authored history rather than set as a slider, and a
record of who they are that distinguishes *a deed they did* from *a claim
about their past*.

**The world already keeps books.** Blame, personality, credentials,
competence and reputation are each derived from an append-only record
rather than stored as a number. Two of those records already accept
authored history; the rest do not. ⚠ **Reputation is deliberately not one
of them** — see the non-goal.

**People already belong to things.** Businesses have rosters and
positions. Offices have seats. Ground has title, and the owner of a piece
of ground can be a person, a group or an organization. A fight already
records who opened it, on what terms, whether the loser consented, whether
they were a person — and, when a captain gave the order, that the captain
answers too.

**Characters are already told apart in the prose, consistently and
without being asked to be.** Of the 42 written characters, 25 carry a
proper name. The rest split on the article: *a* sentry, *a* sellsword, *a*
hewer on tutwork — against *the* collier, *the* smelterman, *the*
storekeeper. Authors have been marking who is a person and who is a role
all along.

⭐ **Therefore what is genuinely new here is:** the ability to *state* a
history rather than only accumulate one; a visible line between a person
and a role; and an answer to who is accountable when the actor was only a
role. ⚠ **And a way to ask** — see the collision below, because two of
those readings currently have no way to be requested.

---

## Goals

- **An author can state what a character has been through**, and every
  reading the world offers derives from that statement exactly as it would
  from a lived history — never overriding it, never a number set by hand.
- **A character who does a job reads as being good at it**, to anyone who
  asks. Today nobody can be described as good at anything they were not
  played doing.
- **The world tells a person from a role, and says which out loud.** A
  named character is somebody; a role-filler is not, and nothing pretends
  otherwise.
- **Every harm names everyone who answers for it** — the person who did
  it, and whoever fielded them. Where the actor was only a role, the party
  that fielded them is the answer.
- **An institution accumulates what its people do and what is done to
  them**, so a body of guards can be seen to have lost guards.
- ⭐ **A player can ask these questions about somebody else.** Not only
  about themselves.
- **Nothing an author writes is silently ignored.** Where a written
  personality, history or affiliation cannot be honoured, the world says
  so at build time rather than dropping it.

---

## Non-goals

- **Writing histories for the existing 41 characters.** The substrate
  here; the authoring is a content pass. → a follow-on content pass.
- **A character sheet an author fills in with numbers.** If any part of a
  written history is read directly rather than believed-as-events, the
  design has failed. → nowhere, deliberately.
- **Authoring histories for players.** Character creation already seeds a
  player's opening claims and keeps that path. → char-gen.
- **Making the three cached figures (reputation, participation, influence)
  derive on read like the rest.** A real inconsistency, and ⭐ **out of
  scope for a reason better than cost: none of the three is a thing an
  author should be writing for an NPC anyway** (see below). → their own
  subsystem work; dossier-slate Q2.
- **An illness a character is written as already having.** It is a third
  shape — an asserted event with an asserted *time* — and belongs to the
  build that needs it. → the clinic (`medic-judgment-slate`).
- ⭐⭐ **Reputation for characters nobody has played.** A written history
  says what somebody *can do* and *where they came from* — never what they
  are *thought of*. Reputation's own governing stance is **measure, don't
  assign: an output you observe, never an input you set**, and it wires no
  behavioural consumer at all today; its one mechanical reader is the
  political-influence stock, which is a players-and-the-Compact concern.
  Writing a reputation for an NPC would therefore be both unnecessary and
  a doctrine violation. → nowhere, deliberately.
- **Histories for businesses and organizations.** → dossier-slate Q4.
- **Backstory written by a language model.** This build makes the artifact
  such a thing would write. → `llm-npc-design`.
- **Person-to-person contagion**, and any other consumer of the growth
  term. → `disease-slate`.

---

## Placement

The mechanism is the **engine's**: what a ledger attributes to is not a
trade's business, and every pack's characters need it equally.

The *content* stays where it already lives — each character's history is
written beside that character, in whichever pack owns them.

⭐ **The test passes:** a second character with a written history needs
**zero new code**. A second *institution* needs zero new code. The only
thing that needs code is the first one.

---

## Collisions

**⚠⚠ Two readings have no way to be asked for.** The verbs that show what
someone is good at, and what they have done, are **self-only and take no
target**. The permission model already says an NPC's competence is a fact
about the world that any viewer may learn — the *gate* is open and there
is no door. So the headline goal ("Dave reads as good at bartending") is
unreachable without a way to ask about somebody else. This is the
`feel`/`taste` shape: a capability that ships and has never run.

**⚠ The record of who answers for a harm has no reader at all.** Blame is
derived and nothing player-facing shows it. Without a reader, "an
institution accumulates its losses" is a claim nobody in the game can
check — so the casualty list would ship invisible.

**The watchpost sentry.** A role-filler whose own authored note says that
ambushing it under lethal terms produces a crime marker. It answers to
nobody — no name, no employer, standing on untitled ground. It works today
only because there is exactly one of it. ⭐ **The right fix is content, not
a weakened rule: the watch should exist.**

**The Terminus registry.** The registrar holds two seats at once and is
domiciled at her own office — the richest existing example of a person who
*is* an institution's face, and the natural first character to be written
up.

**The lounge cast** carries the most-written personalities in the game and
is where "good at the job" will be most obviously wrong today.

**Rejection's cast** are the unnamed-individual case — *the* collier, *the*
smelterman — and are the ones a naive "does it have a name?" rule would
misfile.

**The wilds animals** are the control: a wolf answers to nobody and should
continue to, forever.

**The necropolis** cannot be built until bodies are told apart (#40), and
**private circles** must never become a way to pin a real crime on
somebody (#42).

---

## Surface decisions

**Is the difference between a person and a role visible to a player?**
**Yes**, and it already is — a proper name, or *the* rather than *a*. The
build makes the world agree with the prose rather than introducing a new
signal.

**Does a role-filler have a personality?** Yes, and it reads the same as
anyone's. It simply never changes: a role is a mask, not a life.

**What happens when a role-filler is killed?** Whoever fielded them counts
the loss — whether or not the killing was a crime. ⭐ **Blame and loss are
different questions**: a lawful duel that kills a guard is nobody's crime
and still costs the watch a guard. A body of people that could only count
its murdered and never its fallen would be the wrong instrument.

**And when a role-filler answers to nobody?** That is an authoring
mistake, and the world refuses it at build time — but only when the
role-filler is a *person*. An animal answers to nobody forever.

**Can a private circle be used to frame someone?** No, and this build must
not accidentally make it possible.

**Does a written history ever override a lived one?** Never. It is added
as evidence and read alongside everything else. A character who is written
as skilled and then plays badly reads as somebody whose reputation exceeds
them, which is a true thing about people.

---

## Lens pass

**Pedagogy** — ⚠ **the honest gap.** This build teaches nothing directly;
it makes *other* people's competence legible, which is the appraisal read.
Its pedagogic value is indirect and real — a world where expertise is
visible is a world where seeking out an expert is a decision — but no new
Discipline falls out, and a heading that will not fill is the finding.

**Creative expression** — strong. The ordinary case needs no code: write a
few lines of history beside a character and they become someone. The
bespoke case survives untouched: a hand-carved character keeps working,
because a written history is added evidence, not a replacement.

**Immersion & roleplay** — ⭐ the best lens here. *"The watch has lost four
guards this season"* is fiction falling out of bookkeeping, not narration.
And an NPC who is *actually* good at their job — rather than described as
good at it — is the property this project keeps chasing.

**Values** — the question a written history forces on an author is **"is
this one somebody?"**, and it has a cost either way: a person can be
wronged and must be answered for; a role cannot and need not. ⭐ And the
answer to *who answers for you* is the institution that fields you, which
is what an institution is for.

**Epochs** — holds without modification. A legion answers for its
legionaries exactly as a modern force answers for its officers; only the
paperwork changes.

---

## The drive

Run against a **freshly reset world** — written history is laid down once
per character at birth, so a stale world keeps whatever it was born with
and every checkpoint below lies.

1. Go to the Terminus registry. `look` — the registrar is at her counter.
2. **Ask what she is good at.** She reads as *competent* at the city's
   clerical work. ⚠ Today there is no way to ask, and if there were, the
   answer would be *novice*.
3. **Ask what she has done.** Her opening history reads back, presented as
   background rather than as something you watched happen.
4. Go to the lounge. **Ask what Dave is good at** — he tends a bar well.
5. **Ask the same about another player.** The world refuses. ⭐ A person's
   own competence is theirs; an NPC's is a fact about the world. The
   refusal is the checkpoint, not a limitation.
6. Go to the watchpost. `look` — *a watchful sentry*, no name.
7. **Ask what the sentry is good at.** The world declines to treat it as
   somebody. ⭐ The control for the whole build: a role is not a person,
   visibly.
8. **Ambush the sentry under lethal terms.** The crime marker still fires
   — this ships today and must not regress.
9. **Read the watch's record.** The loss is counted, and it names the post
   the sentry answered to rather than an individual.
10. **Let a wolf maul you.** Nobody is blamed and no institution is named.
    The control for the non-sentient case.
11. **Kill a second sentry.** The two bodies are told apart. (⚠ Not
    player-visible on its own — see acceptance.)
12. **Add a line of history to a character, reset, and boot again.** The
    reading changes to match. **Boot once more without editing:** it does
    *not* double.

---

## Acceptance criteria

Observable from outside the code, by a person playing.

- A player can **ask what another character is good at** and get an answer
  that is not "nothing".
- The registrar reads as **competent** at her clerical work; Dave reads as
  good at **tending a bar**. Neither has been played doing anything.
- A player asking about **another player** is refused.
- A character's written history reads back as **background**, visibly
  distinct from something that happened during play.
- **A role-filler has no name and no history**, and asking for one says so
  plainly rather than returning an empty answer.
- **Ambushing a person who fills a role is still a crime**, and the party
  that fielded them can be seen to have counted the loss.
- **A lawful killing of a role-filler is not a crime and is still counted
  as a loss** by whoever fielded them.
- **A wolf killing someone blames nobody** and names no institution.
- A written history **applied twice does not count twice**.
- ⚠ **Two of these are not player-observable and are accepted as such**:
  that two bodies are told apart (its acceptance is that the necropolis
  becomes buildable), and that a private circle cannot pin a crime on a
  real person (its acceptance is a staged attempt that fails).
- ⭐ **Nothing an author wrote is being dropped**: a written personality
  trait, affiliation or history that the world cannot honour fails the
  build rather than disappearing.

---

## Cross-references

- **Slates:** [dossier-slate](../slates/builds/dossier-slate.md) ·
  [cast-archetype-slate](../slates/builds/cast-archetype-slate.md)
- **Plan:** [identity-ledgers-plan](../plans/identity-ledgers-plan.md)
- **Subsystems:** `advancement.md` · `trait.md` · `chronicle.md` ·
  `accountability.md` · `renown.md` · `participation.md` · `influence.md` ·
  `behavior.md` · `employment.md` · `governance.md` · `parcel.md` ·
  `sandbox.md` · `mortality.md`
- **Issues:** #40 (the necropolis, blocked) · #42 (blame keyed on the
  wrong thing)
- **Waiting on this:** the clinic (`medic-judgment-slate`), which needs a
  patient with a history
