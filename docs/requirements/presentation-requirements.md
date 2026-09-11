# Presentation — requirements

**Kind:** refactor/sweep
**Leads from:** kernel
**First consumer:** ⭐ **every line of prose the game emits.** Concretely:
the thirty shipped rows that carry a proper name, the chat channels that
gain an anonymity setting, and the kept-animal class the pets build is
about to mint.

The realm says what a thing is in a dozen different places — a room
survey, an act line, an emote, a channel, a targeting prompt, a card, a
profile, a log. It currently decides **which of those gets which form by
accident**, and the accident has a shape: *a surface gets the rich form
only if it could afford to give up per-recipient naming.*

This build makes that a decision instead. It adds no player-visible
behaviour except one setting nobody has turned on yet.

**⚠ Supersedes `named-rung-requirements.md`** (retired in this commit),
which described the last piece of this rather than the whole of it.

---

## What already exists

**⭐⭐ The hard part is already built and universal.** A reference to a
person or thing inside a composed line is resolved **per recipient, at
render time** — so one broadcast sentence already reaches a room naming
the same target three different ways: by name to a friend, as a hooded
figure to the person he is hiding from, as a stranger to everyone else.
Every prose emitter in the game rides that seam without knowing it.

**⚠ What the seam does not carry is which *form* the sentence needs.** It
resolves one — the concise identity — always. So a surface that wants
more has to resolve **eagerly, for a single known viewer**, and give up
per-recipient naming to get it.

> **The rich form and the multi-recipient broadcast are mutually
> exclusive today.** You can have status, distinguishing features and
> per-viewer emphasis (one viewer, resolved early), or per-recipient
> naming (concise only). Never both.

The room survey is the proof: it renders its occupant list **two
different ways**, and which one you get depends on a capability composed
on *the viewer*.

**Four forms exist; two are nearly unreached.** The concise identity is
used by everything. The richer ones — *with what they are doing* and
*with what they are wearing* — have **one caller each**, both on the same
surface. The viewer-blind form serves logs.

**⭐⭐⭐ The register already exists, in the content, with nowhere to
live.** Every authored description was counted:

| leading word | rows |
|---|---|
| **a / an** | **476** |
| **the** | **135** |
| neither (a proper name) | ~23 |

**611 of 634 descriptions begin with an article authors have been typing
by hand for the life of the project**, and nothing in the engine knows
which is which. That is not a concept to introduce; it is a concept that
has been in the data since the beginning.

And the three buckets are exactly what the identity rungs already claim:
the *somebody* rung's own description leads with *"**The** collier, who
has no name and is unmistakably one person"*, and the *role* rung's leads
with *"**A** sentry. **A** sellsword."* **Both rungs are defined by their
article, and the article is stored as prose.**

**Length is not the problem it looks like.** 559 of 634 descriptions are
25 characters or under. Only **nine** exceed forty, and they are one
cluster — the textile trade's NPCs, written as portraits (*"a weaver with
a shuttle in one hand and a tally in the other"*).

**And the short handle is already authored** — 584 of 634 rows carry one
(`weaver`, `dyer`, `guard`, `collie`), described in its own field's
documentation as *the guaranteed-resolvable handle*.

**Only one proper-name composition exists in the whole tree**, on the
creature base — and the object branch's own comment already states the
rule it breaks: *"names are for proper names, not generic descriptions."*

> **Therefore what is genuinely new here is:** the register as a field
> rather than a typed-in article, the **form** as something a sentence
> asks for rather than something the delivery shape decides, and the
> separation of *being disguised* from *being anonymous*.

## Goals

- **A thing presents a noun phrase, not a sentence fragment** — so the
  realm can say *the* collie, *a* collie, *two* collies and *the
  collie's* paw without any of them being guessed at from a string.
- **What a thing is called and what form the sentence needs are two
  independent questions**, both answered at the moment of rendering, for
  the recipient reading it.
- **A rich form survives a broadcast.** Status and distinguishing
  features stop being purchasable only by giving up per-recipient
  naming.
- **Each surface states which form it wants**, so what a player sees in a
  room survey, an act line, a channel and a card is authored rather than
  inherited from how the message happened to be delivered.
- **A channel can permit or forbid anonymity**, and forbidding it shows
  names.
- **Being disguised and being anonymous are different things** and stop
  sharing one mechanism.
- **Only things that can have a proper name carry proper-name surface.**

## Non-goals

- **Minimal-distinguishing rendering** — *Mitch* until there are two,
  then *Mitch H.* → the [naming slate](../slates/tails/naming-slate.md),
  which now owns it. ⚠ It is **claimed to exist today and does not**;
  this build leaves the seam it needs and adds nothing visible.
- **Renaming, name collisions, impersonation defence** → the same slate.
- **Rewriting the nine long portraits.** ⭐ **Nowhere, deliberately** —
  they are good writing and the fix is that chat stops reaching for
  them, not that they get shortened.
- **A general over-wide-mixin audit** → the
  [mixin slate](../slates/tails/mixin-slate.md). This build fixes the
  case it can name and leaves the census pattern behind.
- **Deciding which *objects* may hold a proper name** → nowhere,
  deliberately. The object branch already excludes it; a named artefact
  composes it, which is already how it works.
- **A sense/modality model for what reaches a channel** → the senses
  tail. This build needs only *"a channel is not looking at you"*.
- **New authored description text.** No row gains prose; rows lose a
  leading article and gain a register.

## Placement

Kernel throughout — this is the substrate every pack's prose already
rides, and no pack can own it.

Proper-name identity moves **off the creature base** and onto the
**somebody** identity rung, the **player body**, and the kept-animal
class the pets build mints. The register belongs to the **identity
rungs**, because it is what those rungs already mean.

> **The test — does a second instance need code?** No. A new species, a
> new named artefact, a new channel: rows and a setting. The one thing an
> author writes that they did not before is *which article this takes*,
> and for 611 rows it is read off the article they already typed.

## Collisions

- ⚠⚠ **Every line of prose in the game.** This is the widest-blast-radius
  change in the repo's recent history, which is why the acceptance bar is
  *nothing observable changes*. Verification is mechanical: re-render
  every shipped row and compare against today's string. It should be
  identical, and where it is not, that is the finding.
- **The room survey renders occupants two ways today.** Unifying them is
  the point, but one of the two carries per-viewer emphasis that must
  survive.
- **Targeting.** A thing's addressable words derive partly from its
  proper name. Anything that loses one must still be referable by
  description — ⭐ otherwise **you cannot refer to the wolf**, and it
  fails silently.
- **Disguise** currently rides the same path as everything else, and is
  the reason the viewer-blind form is not simply "the truth". Splitting
  anonymity out must not weaken it.
- **The card surface** lays out an inspection panel by kind, and reads
  the same identity the prose does.
- **Chat** gains a setting; existing channels must behave exactly as they
  do now under its default.
- **The pets build** is mid-plan and mints a kept-animal class.
  Ordering: this lands first.

## Surface decisions

### A thing presents a noun phrase, not a string

**Q:** What is the unit of identity?

**A:** **A stem, a register and a number** — never a pre-assembled
string with an article typed into the front of it.

From those three, everything the prose layer needs is derived rather than
guessed: the article, the definite form, the possessive, the plural, the
capital letter at the start of a sentence. Today the article is inside
the authored text, so *"the collie"* cannot be said without editing a
string, and the helper that adds articles is a vowel check that does not
know whether the text already has one.

### The register is a fact about identity, not about description

**Q:** What decides whether a thing is *a* something, *the* something, or
just *something*?

**A:** ⭐⭐ **The identity rung it already sits on.**

| register | reads as | who |
|---|---|---|
| **proper** | `Odile` | somebody, with a name |
| **definite** | `the collier` | somebody, without one |
| **indefinite** | `a sentry` | a role, one of many |

This is not a new taxonomy. Both rungs' own descriptions lead with the
article, and the content has been encoding it by hand 611 times. The
build gives it a field and stops it being prose.

⭐ **And this is what "a proper name belongs to somebody" actually
meant.** The original framing — move the name off every creature — was
right about the conclusion and wrong about the reason. The question was
never *does it have a name*; it was *what article does it take*.

### The form is chosen by the sentence, never by the delivery

**Q:** Why does a room survey show more than an emote?

**A:** **Today, because a room survey is addressed to one person and an
emote is not.** That is an implementation consequence wearing the costume
of a design decision, and this build ends it.

A reference states the form it needs, and the form is resolved late,
beside the viewer:

| form | shows | wanted by |
|---|---|---|
| **bare** | the name alone | chat, when anonymity is off |
| **handle** | article + the short handle | chat, when anonymity is on |
| **concise** | the ordinary identity | act lines, emotes — most prose |
| **presence** | + what they are doing | the room survey |
| **distinguishing** | + what they are wearing | targeting, disambiguation |
| **formal** | the full name, with honorific and suffix | profiles, documents |

⭐ The richer forms already exist and are nearly unreachable. This makes
them ordinary.

### Chat anonymity is a channel setting, and the anonymous form is the handle

**Q:** What does a channel show?

**A:** **Whatever the channel is set to permit.**

- **Anonymity forbidden** → the **name**. Always, for everyone.
- **Anonymity permitted** → the **handle** — *"a weaver"*, built from the
  authored short handle, **not** from the description.

⚠ **The description is the wrong thing to put in a chat line**, and the
nine long portraits are why: *"a weaver with a shuttle in one hand and a
tally in the other says…"* is unreadable. The handle is authored on 92%
of rows precisely because it is the short one; the remaining rows fall
back to the description, which is 25 characters or fewer in 88% of cases.

⭐ Anonymity therefore costs one word at the call site rather than a
parallel code path.

### Disguise is perceptual; anonymity is declarative

**Q:** Is a hooded man anonymous on a channel?

**A:** **No.** A disguise works because somebody is *looking at you*, and
a channel is not. A hooded man on a named channel is himself.

The two are currently one mechanism, which is why the question has no
answer today rather than a wrong one:

- **Disguise** — a visual fact about what is being worn, defeated by
  perception, already built and not weakened here.
- **Anonymity** — a declared stance about a *message*, independent of
  what anyone can see, and the thing a channel setting governs.

### Nothing a player can see may change

**Q:** What is the acceptance bar?

**A:** ⭐⭐ **That a player cannot tell this happened.** Every shipped row
must render the identical string it renders today, and the way to know is
to render them all and diff — not to reason about it.

The one exception is the chat setting, which is new and ships with the
default that reproduces today's behaviour.

---

## Lens pass

**1 · Pedagogy.** Nothing player-facing. What improves is the *author's*
model: you declare what kind of noun a thing is and the world does the
grammar, instead of typing an article into a description and hoping the
renderer does not add another.

**2 · Creative expression.** ⭐ This is the motivating lens. The ordinary
case gets cheaper — an author writes a stem and a register, and *a*, *the*
and *two* all work. The bespoke case opens: a surface that wants a
different form asks for one, where today it must give up per-recipient
naming to get it. And a thing that should have no proper name no longer
carries name-shaped surface an author can fill in by accident.

**3 · Immersion & roleplay.** ⭐⭐ The strongest gain, and it is about
honesty. What a player is told about somebody becomes a deliberate answer
to *what does this person know, and what does this sentence need* — rather
than a side effect of how the message was delivered. The hooded figure
stays hooded because he is wearing a hood, and the anonymous poster stays
anonymous because he chose to be, and those stop being the same sentence.

**4 · Values.** ⚠ No player-facing choice, except the one a channel's
owner makes about whether their space permits anonymity — which is a real
values question about a community, and is now expressible.

**5 · Epochs.** Untouched. Grammar is older than every epoch the realm
spans.

---

## The drive

The bar is *nothing changed*, so most of the drive is looking hard at
things that should be identical.

1. Walk into a busy room. **Everyone and everything reads exactly as it
   did** — the same names, the same descriptions, the same articles.
2. Look at a role-filler with no proper name — a sentry, a wolf, the
   canary. **It reads by its description**, as before.
3. **Refer to it, target it, act on it by its keywords.** ⭐ *This is the
   step that catches the real risk: a thing whose addressable words
   silently stopped resolving.*
4. Talk to a named NPC. **They are still called what they were called** —
   in speech, in emotes, and in the room's roll-call.
5. Meet a stranger, be introduced, and look again. **The name appears
   where it did before**, and not before.
6. Watch somebody hooded walk in. **They are still a hooded figure** —
   and still a hooded figure to you specifically, while somebody who has
   never met them sees a stranger.
7. Emote at somebody in a room with three other people in it. **Each of
   them is named to you as they were.**
8. Create a character. **Your own name works**, everywhere it worked.
9. ⭐ **Now the new part.** On a channel that forbids anonymity, speak.
   **Your name appears.**
10. On a channel that permits it, speak anonymously. **A short handle
    appears — "a weaver" — never a sentence-long portrait.**
11. Speak on a named channel while hooded. ⭐⭐ **You are named**, because
    the hood is something people *see* and the channel is not looking.

## Acceptance criteria

Observable from outside the code, by a person playing.

1. A player cannot tell, from anything in the world, that this build
   happened — except on a channel whose anonymity setting has been
   changed.
2. A player can refer to, target and act on everything they could
   before, by the words that worked before.
3. A player still sees every named NPC by its proper name, everywhere a
   name was rendered before.
4. A player sees a disguised person as disguised, and a stranger as a
   stranger, exactly as they did.
5. A player in a room survey sees what the occupants are doing, and
   **sees the same thing whether or not they are the only recipient of
   the message.**
6. A player speaking on a no-anonymity channel is named.
7. A player speaking anonymously is shown by a short handle, never by a
   description longer than a few words.
8. A player speaking on a named channel while disguised **is still
   named**.
9. A content author writes a description without an article and a
   register, and the world produces *a*, *the*, the possessive and the
   plural correctly.
10. A content author cannot give a role-filler a surname, because the
    field is not there to give.

## Cross-references

- **Subsystems:** [messaging](../subsystems/messaging.md) +
  [message-rendering](../subsystems/message-rendering.md) (where prose is
  composed and rendered) · [belief](../subsystems/belief.md) (recognition
  and regard) · [identity](../subsystems/identity.md) (the rungs this
  aligns to) · [perception](../subsystems/perception.md) (disguise, the
  visibility gate) · [chat](../subsystems/chat.md) (the channel setting) ·
  [card-surface](../subsystems/card-surface.md) (the inspection panel) ·
  [race](../subsystems/race.md) (the creature base) ·
  [char-gen](../subsystems/char-gen.md) (who writes a player's name) ·
  [mixins](../subsystems/mixins.md)
- **Slates:** [naming](../slates/tails/naming-slate.md) — owns
  minimal-distinguishing rendering, which this build leaves the seam for ·
  [mixin](../slates/tails/mixin-slate.md)
- **Sequencing:** lands **before** [pets](./pets-requirements.md), whose
  kept-animal class composes proper-name identity explicitly from its
  first commit.
- **Supersedes:** `named-rung-requirements.md` (retired), and
  `docs/plans/named-rung-plan.md` needs re-planning against this doc —
  ⭐ but its grounding is still good and should carry: the mixin-reach
  resolver's blindness to const-stack bases, the corpse overlay never
  having carried a name, and the ~35–40 test fixtures that set a name on
  a creature-derived fixture and will not be selected by a near-run.
