# Named on the identity rung — requirements

**Kind:** refactor/sweep
**Leads from:** kernel
**First consumer:** the **Cast roster** (30 shipped rows that actually carry a
proper name) and pets' new kept-animal class, which is the archetypal
*thing that gets named* and should compose this explicitly from its first
commit rather than inherit it and be corrected later.

A proper name is for things people address by name. The engine currently
hands one — plus a **surname, an honorific, a post-nominal suffix and a
list of alternate names** — to every living thing in the realm, including
every hen, every wolf, and every corpse.

This build moves the capability to the rung that already claims it, and
in doing so **turns a convention into a structure**.

---

## What already exists

**The rule is written down, and it is already obeyed everywhere but one
line.** `Thing`'s own class comment states it:

> *"`NamedMixin` is deliberately NOT defaulted here — names are for
> **proper names** (Excalibur the sword, Bob the shopkeeper), not generic
> descriptions. A 'brass thermometer' is just a Thing with a short
> description, no name."*

**There is exactly ONE production composition in the entire tree**, on the
`Creature` base. Not `Thing`, not `Location`, not `Idea`, not `Stuff`.

⭐ **And where people have thought about it, they already do the right
thing.** Roughly 200 test fixtures compose the mixin explicitly onto
whatever they are building. Two production classes that genuinely have
names — a locality and an ore deposit — **declared their own accessor
rather than reach for the mixin at all.** Composing-on-purpose is the
established habit; inheriting-by-default is the outlier.

**The identity rungs already say what the composition should.** The realm
distinguishes a character who is **somebody** from a role-filler who is
**a role, not a person**, and the latter's class comment says outright
that it *"carries no proper name."* That sentence is true by convention
and false by composition: every role-filler in the game currently has a
surname field.

> **Therefore what is genuinely new here is:** nothing. This build deletes
> a line, adds three, and makes an existing rule enforceable rather than
> remembered.

## Goals

- **Only things that can have a proper name carry proper-name surface.**
- **The somebody / role-filler distinction becomes structural**, so a
  role-filler cannot be given a surname by an author who did not read the
  comment.
- **Every shipped row that carries a name keeps it**, with no content
  edits and no migration.
- **A creature with no name is still fully referable** — you can look at,
  target and talk about an animal that has no proper name, exactly as
  today.

## Non-goals

- **Deciding which *things* may be named** (Excalibur yes, a pebble no) →
  **nowhere, deliberately.** `Thing` already excludes the mixin, so
  nothing changes on that branch; a named object composes it, which is
  already how it works.
- **A general audit of other over-wide mixins** → the
  [mixin slate](../slates/tails/mixin-slate.md). This build fixes the one
  case it can name, and leaves a census pattern behind.
- **Locations with proper names** → untouched. Places already compose what
  they need.
- **Reconciling the two `getName()` shapes** — the mixin's, and the
  bespoke accessors on a locality and a deposit → nowhere in this build.
  It is worth someone's attention that a naming mixin was passed over
  twice, but nothing is broken.
- **Renaming, name collisions, impersonation** → the
  [naming slate](../slates/tails/naming-slate.md), which owns the real
  defence.

## Placement

Kernel throughout. The capability moves **off the creature base** and onto:

| host | why |
|---|---|
| the **somebody** identity rung | it is the definition of the rung — a character who can be addressed by name |
| the **player body** | players have names; it must not arrive by inheritance from a base that no longer carries it |
| the **kept-animal** class (pets) | a companion is named, and naming it is that build's central act |

> **The test — does a second instance need code?** No. Anything that needs
> a proper name composes the mixin, which is what ~200 test fixtures and
> `Thing`'s own comment already say to do.

## Collisions

- ⚠⚠ **Keyword resolution.** Perceptible derives a thing's addressable
  keywords partly from its proper name. A creature that no longer has one
  must still be referable by its description — otherwise **you cannot
  refer to the wolf**, and it fails silently, which is this repo's
  signature failure mode. This is the single thing most likely to break.
- **The presentation chain** — the shared display string prefers a proper
  name and falls back to the short description. It lives on the root Stuff
  class and already guards for the mixin's absence, so an un-named
  creature degrades correctly. Verify, do not assume.
- **The nine narrowing call sites** all already test for the capability
  before reading it, and three of them narrow on a *location*, which has
  never had the mixin. The absent case is the shipped path.
- **The pets build** is mid-plan and mints a kept-animal class. Ordering
  matters: this lands first, so that class composes the mixin explicitly
  rather than inheriting it.
- **Character generation and the name banks** write a player's name at
  intake; the player body must keep the surface.

## Surface decisions

### It moves to the rung, not to a new class

**Q:** Where does the capability go?

**A:** **Onto the identity rung that already means "is somebody."** Not a
new class, not a marker, not a flag — the distinction the realm already
draws between a person and a role-filler *is* the line, and this build
simply makes the composition agree with it.

⭐ That is why this is worth doing at all. A rule kept by comment gets
broken by the next author who does not read the comment. A rule kept by
composition cannot be.

### An unnamed creature loses nothing it was using

**Q:** What breaks for the ~17 shipped rows that will lose the capability?

**A:** **Nothing, and this is measured rather than hoped.** Every shipped
row that authors a proper name — thirty of them — is on the somebody rung
already. Not one role-filler, animal, or corpse authors one. The
capability is being removed from things that have never used it.

### Nobody's name changes

**Q:** Is this a migration?

**A:** **No.** No stored data changes shape, no row is edited, and no
name moves. The rows that carry names are on classes that keep the
capability. This is a composition edit and a set of tests.

---

## Lens pass

**1 · Pedagogy.** Nothing player-facing; the world is unchanged. What
improves is the *author's* model: the class you compose tells you what
the thing is, instead of a comment telling you what not to set.

**2 · Creative expression.** ⭐ This is the lens that motivates the build.
An author reading the composition currently learns that a hen may have an
honorific. After it, the composition is honest, and an author who wants a
named animal composes the mixin — which is already the documented habit
and what every test fixture does.

**3 · Immersion & roleplay.** Unchanged, and that is the acceptance bar:
if a player can tell this happened, something broke.

**4 · Values.** No player-facing choice. ⚠ Recorded as a gap rather than
invented — a refactor is allowed to score nothing here.

**5 · Epochs.** Untouched.

---

## The drive

Short, because the acceptance bar is *nothing changed*.

1. Look at a role-filler with no proper name — a sentry, a wolf, the
   canary. **It reads exactly as it did**, by its description.
2. **Refer to it, target it, and act on it by its keywords.** ⭐ Attack the
   wolf, look at the canary, handle the collie. *This is the step that
   catches the real risk: a creature whose keywords silently stopped
   resolving.*
3. Talk to a named NPC — a barkeep, a registrar. **They are still called
   what they were called**, in speech, in emotes, and in the room's
   roll-call.
4. Introduce yourself to someone and be introduced. **Names still pass
   between people.**
5. Create a character. **Your own name works** — in speech, on your
   profile, and to everyone who meets you.
6. Look at a corpse. It reads as it did, and asking the world for its
   surname is no longer a thing anyone can do.

## Acceptance criteria

Observable from outside the code, by a person playing.

1. A player cannot tell, from anything in the game, that this build
   happened.
2. A player can refer to, target and act on every animal in the realm by
   the words that worked before.
3. A player still sees every named NPC by its proper name, everywhere a
   name is rendered.
4. A player's own name still works at character creation, in speech, and
   in how others see them.
5. A content author writing a new animal that should have a name composes
   the capability and it works; one who does not, gets an animal with no
   name and no name-shaped surface.
6. An author cannot give a role-filler a surname, because the field is not
   there to give.

## Cross-references

- **Subsystems:** [identity](../subsystems/identity.md) (the rungs this
  aligns to) · [race](../subsystems/race.md) (the creature base) ·
  [perception](../subsystems/perception.md) +
  [message-rendering](../subsystems/message-rendering.md) (where names are
  rendered) · [char-gen](../subsystems/char-gen.md) (who writes a player's
  name) · [mixins](../subsystems/mixins.md)
- **Slates:** [naming](../slates/tails/naming-slate.md) (renaming and
  impersonation — not this) · [mixin](../slates/tails/mixin-slate.md)
  (where the wider over-wide-mixin census belongs)
- **Sequencing:** lands **before**
  [pets](./pets-requirements.md), whose kept-animal class is this build's
  named first consumer.
