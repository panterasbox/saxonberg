# Hydration framework — requirements

**Kind:** refactor/sweep (with one shipped-defect repair that is feature-shaped)
**Leads from:** kernel — first consumers are an NPC's memory of you, a kept
animal's own species dials, and the authored-history seeding that two
mixins already duplicate. All three ship in this build; none is new content.

**Filling a thing with its state is one job done by three frameworks that
do not know about each other**, and the seam between them is a field only
a wizard may set. The consequence is not abstract: the Studio — the
authoring surface built *for* non-wizards — creates rows that discard
every byte of data the author just typed, reports success, and tells
nobody. This build makes hydration one declared, composable, inspectable
act, says plainly which kinds of state-loading belong to it, and stops the
rest from pretending to be hydration.

Seeded by [hydration-framework-slate.md](../slates/builds/hydration-framework-slate.md),
whose provenance is the user's own question in the pets review: *"the idea
was that you could have a `BeliefHydrator`… the point was to use a common
framework for all that 'hydration step' logic and keep post-registration
for actual post-hydration stuff, not just 'finish hydrating'."*

---

## What already exists

**Three frameworks.** A row's `hydratorClass` names one strategy that
receives the row's `data:` block during the clone. The persistence spine
restores a host's snapshot through a set of per-concern layers each mixin
declares for itself. And anything either of those cannot express has been
finishing the job by hand in the registration hook.

**The census, re-measured, and the slate's number was wrong.** The slate's
script matched *docstring mentions* of the hook and then scanned to the
next closing brace, so Api facades that merely document it counted as
implementations:

| | slate claimed | actual |
|---|---|---|
| implementations of the registration hook | 109 → 123 → 149 | **82** |
| …whose body loads state | 63 → 67 → 78 | **40** |
| …that are the defect | — | **7** |

**Thirty-three of the forty legitimately stay.** Catalogues, registries,
standings and the four wardens are singletons reading a collection that is
nobody's per-instance state. That is not finishing hydration; it needs the
registry populated first, which is what the hook is for.

**1,528 of 1,970 authored rows name `hydratorClass`, and all 1,528 name
the same value.** It is the single most repeated line in the content tree
by a factor of three — which the shipped `extends:` mechanism
([legibility-slate](../slates/builds/legibility-slate.md) Parts A+B) was
partly built to work around. Zero rows declare a custom one. The extension
point has existed for the project's whole life and has never been used
once.

**Nothing an author can see says what fills a row in.** `cat` prints the
hydrator line only when the row has one, so *"this row has no hydrator"*
and *"that field isn't shown"* look identical. The CMS ships the value to
the client and nothing renders it. The Studio never asks. No diagnostics
channel mentions hydration; a discarded data key produces no warning, no
log line and no error row.

**And the one place a human can set it refuses the people who need it.**
The field is wizard-gated as executable-code-naming, correctly — it
resolves to code at clone time. But the gate's delta rule rejects a write
that *introduces* the field, and a create has nothing to compare against,
so **a protowizard cannot create a row that names even the standard
hydrator.** The Studio's create path therefore omits it, which is the only
thing that passes — and the row it mints applies none of the data the form
collected. `write --hydrator ''` is documented as the way to omit it, which
is the same hole from the other side.

⭐ **Therefore what is genuinely new here is**: one framework, composed of
declared layers, each naming its own source, driven on every path that
fills an object in — plus the ruling that says which of the forty
state-loading hooks were hydration all along. And one correction that is
really a bug fix: **whether your data is applied at all must stop being a
code-trust decision.**

---

## Goals

- **Filling an object in is one act, however many sources it draws on.** A
  host's state can arrive from its authored row, from its snapshot record,
  from a collection keyed on its identity, or from a reference row it
  depends on — through one framework, in a declared order.
- **A layer names its own source.** The framework runs it whether or not
  the host has a snapshot record. This is what lets an NPC's memory of you
  stop being hand-loaded.
- **Hydration is declared per row, and the declaration may be plural.** A
  row states which layers fill its instances. A row family states it once,
  through the parent it already extends.
- **Having your data applied is not a code-trust decision.** The default
  layer stops being author-named: a row with a data block gets its data
  applied. `hydratorClass` keeps exactly the job a code-naming field should
  have — naming *additional or custom* code — and stays wizard-gated for
  that.
- **An author can see what will fill their row in**, including when the
  answer is "nothing", and finds out when something was discarded.
- **A content edit cannot destroy live state.** Going live with a row edit
  is a different kind of hydration from minting a new instance, and the
  framework distinguishes them. Today it does not, which is why editing
  the coin row resets every live stack in the world.
- **Four kinds of post-registration work are named, and three of them stay
  where they are.** The hook's own purpose is stated positively so that
  honest uses stop reading as census entries, and the count is gated where
  it lands so it can fall and never rise.

## Non-goals

- **Re-homing the hydration strategy objects into path-resolved lazy
  modules.** → [persistence-architecture-slate](../slates/builds/persistence-architecture-slate.md)
  Wave 3, confirmed unstarted since 2026-08-08. This build changes how
  layers are *declared and driven*, not what kind of object a layer is.
- **The 33 roster-warming hooks.** → nowhere, deliberately. The ruling
  names them as legitimate; no code moves.
- **How a child row unsets a key it inherits.** → [legibility-slate](../slates/builds/legibility-slate.md)
  Part A's open questions. This build consumes `extends:` as shipped.
- **What a captured slice may legally contain**, and the document-size
  ceiling it is heading for. → [estate-nesting-slate](../slates/builds/estate-nesting-slate.md).
- **Driver state off the avatar body**, and the rest of the body-shape
  work. → [avatar-family-slate](../slates/builds/avatar-family-slate.md),
  whose class layering shipped yesterday.
- **Forbidding the hook from reading other objects' state.** →
  [eager-residency-slate](../slates/builds/eager-residency-slate.md)'s
  never-fault rule. A narrower ratchet over the same hook with a different
  predicate; the two must agree on their counters but neither subsumes the
  other.
- **A general diagnostics channel for the template tree.** → nowhere yet.
  In scope only for the narrow case this build is about: a data block that
  no layer applied must be reportable, not silent.
- **Re-tracing hot-reload safety.** → already traced and cleared
  (2026-09-24): reload never touches a live instance, so the hook never
  re-runs on a populated host. Do not re-derive it.

## Placement

**Kernel**, under the engine's own namespace root. Hydration is the clone
pipeline and the persistence spine; it is substrate every pack sits on and
no pack may own.

⭐ **The test — does a second instance need code?** A pack that ships a
mixin with state of its own must be able to declare that mixin's hydration
layer, name it from its own rows, and name its own source, **with no kernel
edit**. Two pack mixins already finish hydrating by hand in the
registration hook (one in a trade pack, one in a system pack), so this is
not hypothetical: if the framework cannot absorb them from inside their own
packs, it has failed its placement test. That is also the pack-boundary
rule in its usual form — a pack may add rules, never enforcement.

Which host carries which declaration is the plan's.

## Collisions

- ⚠⚠ **Everyone's money.** The coin row is edited through the CMS like any
  other, and going live re-applies its data to every live stack. This build
  must land the distinction between *minting* and *going live* or it makes
  that reachable from one more path.
- **The Studio's template form**, which collects a data map and currently
  mints a row that throws it away. The repair is visible to whoever uses
  it next.
- **`write --hydrator ''`**, documented as the way to omit hydration, and
  the 8 shipped rows that deliberately carry no hydrator with a comment
  saying why. Those comments become wrong.
- **`cat`'s output**, which is the only in-world read of a row's hydration
  and currently cannot say "none".
- **1,528 rows lose a line.** Content edits in every pack, including the
  68 `extends:` children that inherit the value today and the three avatar
  rows that shipped yesterday.
- **`pack sync`**, which reports how many live instances it re-hydrated —
  the count's meaning changes when hydration becomes plural.
- **The code-trust gate**, whose baseline is a row's *own* fields. The
  protowizard authoring door that was opened on 2026-09-25 by letting a
  child inherit its class and hydrator must stay open.
- **The NPCs who already remember you** — the lounge cast and the dressed
  costume children — plus the kept animals whose dials read absent until a
  self-warming hook was added. Both are consumers, so both are drive
  subjects.
- **The entire location family**, which since 2026-09-24 depends on a
  base-level registration hook. Nothing in this build should change how
  that hook is composed, and the biggest class family in the game is why.

## Surface decisions

### Who declares a host's hydration layers

**The row does, and the declaration is plural.** `hydratorClass` accepts
more than one layer; a family declares it once on the parent it already
extends.

Chain-composition was the alternative — a mixin declaring its own layer the
way it already declares its snapshot slice — and it was rejected because
author control is the point. A row should be readable as the full statement
of what fills its instances, and an author who wants a layer no mixin
thought of should be able to add one. The cost of row-declaration is the
silent-omission class: a row that composes a remembering mixin and forgets
to name the layer gets no memory, with no error. That cost is paid by the
two decisions below, not by hoping nobody forgets.

### The default layer is not author-named at all

**A row with a data block gets its data applied.** The standard layer stops
being something an author opts into by naming code.

This is the fix for the Studio defect and it is also the only honest
reading of the field: *"apply the data I wrote"* is not a code-trust
decision and never was, while *"run this code to fill me in"* genuinely is.
Conflating them put the first behind a wizard gate, which is why the
authoring surface for non-wizards cannot use it and loses their work
instead. After this, `hydratorClass` names only additional or custom layers
— a strictly code-naming field, properly gated, on the small number of rows
that actually want one, instead of one value repeated 1,528 times.

### A layer declares its source, and whether that source is required

**Each layer states where its state comes from and what happens when that
place is unreachable.** An optional layer whose source is closed — which is
every test run and all of early boot — no-ops. A required layer fails the
clone, loudly, naming itself.

Today each hand-written loader decides this for itself with an early
return, which is how an NPC's memory could sit unread in the database for
months while every assertion passed. Unreachability becomes a declared
property of the layer, so the framework can say which layers were skipped
rather than each layer deciding to be quiet.

### A layer declares eager or lazy, and that answers the cost question

**Eager means a round-trip at every clone; lazy means the first read
faults.** The layer says which, because the right answer differs per layer
and per host: a rare singleton can afford eagerness, and a layer on
something cloned by the thousand cannot.

The two live examples point opposite ways and both are right. An NPC's
memory is eager because it must be visible to the history seeding that runs
immediately after. A kept animal's species warm was made eager precisely
*because* lazy had failed — eight separate read sites each faulted
independently, and in the live game every dial read as absent while every
refusal-shaped assertion passed. Neither is the default; both are
declarations.

### The snapshot spine is a layer like any other

**Restoring from a snapshot record stops being hand-driven and becomes the
framework's first-class layer.** It is the largest instance of the pattern
in the tree — the body of record's registration hook is thirty lines of
ordering the born-with loadout against the restore — and leaving it out
would mean shipping a framework that does not cover its own deepest case.

The ordering problem it currently solves by hand is exactly what a declared
layer order expresses: a born-with default must not install before a
restore that will re-occupy the same slots, which is the collision that
bricks every relog after a restart. Risk is real and acknowledged — this is
the login path, a week after the body classes were refactored — and it is
the reason the drive ends with a relog rather than a test.

### Four kinds of post-registration work

The slate named three; reading the seven candidate hooks found a fourth.

| | what it is | where it goes |
|---|---|---|
| **finishing hydration** | the host filling in its own state, from any source | **the framework** |
| **seeding** | an authored field written once into an append-only ledger, idempotent across re-clone and reboot | **the framework**, as a layer kind |
| **warming a roster** | a singleton reading a collection that is nobody's per-instance state | stays — it needs the registry first |
| **structural completion** | constructing a companion the world requires, loading no state | **stays, and this is what the hook is FOR** |

Seeding earned its own limb because two mixins already do it with nearly
identical guard logic — *skip if any claim row already exists* — over two
different authored fields. It reads from the row's own data block, so it is
hydration by source; it writes somewhere else and must never write twice,
so it is not the default layer. Naming it is what lets both stop being
hand-written.

Naming structural completion positively matters as much as the other three.
It is the residue the user's instruction protects, and without a name for
it every honest use of the hook reads as an entry on a defect census.

### The count is gated where it lands

**Today's number becomes the ceiling and may only fall.** The pattern the
lint family documents: the census stops the growth before anyone has time
to finish the fix, and a later pass flips it to zero. The slate's number
was wrong in the direction of alarm; the gate uses the measured one, and
measures the method declaration rather than the word.

⚠ A neighbouring slate proposes a different ratchet over the same hook —
forbidding it from faulting on other objects' state. Different predicate,
same counter. Whichever lands second must read the first's, not invent its
own.

## Lens pass

**1 Pedagogy.** Thin, and honestly so — this is substrate with no
Discipline. The one real entry is derivability for *authors*: the reason
hydration is invisible today is that nothing reports it, and an author who
cannot see what fills their object in cannot derive why it came out empty.
The inspection read is the teaching surface. ⭐ **Gap recorded:** nothing
here teaches a player anything, and the build should not pretend otherwise.

**2 Expression.** The deciding lens, and it decides for the repair rather
than the refactor. An authoring surface that silently discards the author's
work is the worst available answer on this axis, and it is shipped. Beyond
that: the ordinary case must need no code — a row with data gets its data —
and the bespoke case must not break, which is what plural declaration buys.
1,528 copies of one value is transparency spent on nothing.

**3a Immersion.** One entry, and it is sharp: money disappearing because
somebody edited a content row is the fiction betraying itself about the
thing players trust least. **3b Participation** — nothing.

**4 Values.** ⭐ The real values question is *who decides what fills an
object in*, and the build splits an authority that had been conflated:
**everyone** may have their own authored data applied, **wizards** decide
which code runs. Pitched at the **grain** — a deployment could gate the
default layer too, at the cost of the authoring door — but the recommended
answer is that data application is not a privilege, because treating it as
one is what broke the Studio.

**5 Continuity.** The test is whether a source kind we have not thought of
needs a kernel edit. A collection, a snapshot record, a document in the
path-addressed tree and a reference row are four shapes already in play; a
fifth must be a declaration. If it is not, the framework has only renamed
today's special cases.

**6 Economy.** Produces nothing, consumes one round-trip per eager layer
per clone. That is the whole of it, and it is why eager/lazy is a
declaration rather than a default.

**7 Governance.** The code-trust gate must come out no weaker. Its baseline
stays the row's own fields, naming-and-redirecting-code stays refused, and
the protowizard authoring door stays open — the build *widens* it by
removing a code-naming requirement from the ordinary case, which is the
right direction. ⚠ Nothing here may become a new reason to check whether
someone is a wizard.

## The drive

Run against the live game, in order, before the MR opens.

1. **As a protowizard, create a template through the Studio** with a form
   full of data, then clone it. *The clone carries the data.* Today it is
   empty, the create reported success, and nothing anywhere said why.
2. **`cat` that row.** *It states every layer that will fill its instances,
   in order, and says so explicitly when there are none* — "no hydrator"
   and "not shown" must stop looking the same.
3. **`write` a row with a data block and no hydration at all.** *You are
   told the data will be discarded, at write time.*
4. **Meet an NPC who forms opinions, do something they'd remember, restart
   the server, and come back.** *They still hold it* — unchanged behaviour,
   now arriving through the framework.
5. **Do the same with a kept animal — a cat you have handled.** *It still
   knows you across the restart.* ⭐ This is the step that proves the
   capability generalized rather than moved: a remembering NPC and a
   remembering animal reach their memory by two different routes today
   (one reads the collection, the other carries it inside its own
   snapshot), and the same observable must hold through one framework.
6. **Offer that animal food the moment it is born.** *The right feeding
   rung is offered* — the dials read from its own species, which was found
   live reading absent on every one of them, with every refusal-shaped
   assertion passing anyway.
7. **Clone an NPC with authored history twice, and reboot between.** *The
   history is there once.* Seeding is idempotent or it is a duplication
   bug.
8. ⚠⚠ **Hold coins. Edit the coin row in the CMS and take it live.**
   *Your coins are still there, in the amount you had.* Today they become
   one.
9. **Log out, restart the server, log back in.** *Your gear is on you and
   nothing collided.* The relog-after-restart path is the spine layer's
   only honest exit criterion.

## Acceptance criteria

Observable from outside the code, by someone using the game.

- An author who types data into the Studio and saves finds that data on the
  thing they cloned.
- An author can read, in-world, what will fill a row's instances — and reads
  "nothing" as "nothing".
- An author who writes a row whose data nobody will apply is told so when
  they write it, not never.
- Editing a value-bearing row and taking it live leaves live instances'
  values alone. Nobody's money changes.
- An NPC's memory of a player survives a restart, and so does a kept
  animal's — the two reach it by different routes today and must not after.
- A newly born kept animal answers correctly about its own feeding, handling
  and biddability.
- Authored history on an NPC appears exactly once, across any number of
  re-clones and reboots.
- A player logs out, the server restarts, the player logs in, and their worn
  and carried things are as they left them.
- A pack author can give their own mixin a hydration layer, from their own
  pack, naming their own source, without a kernel change.
- 1,528 rows stop naming a hydrator and every one of them behaves exactly as
  before.

## Cross-references

**Seeding slate:** [hydration-framework-slate](../slates/builds/hydration-framework-slate.md)
— subsumed entirely by this build; its Q1 dissolved (hydration already runs
after registry insertion, so the phase obstacle it feared is not there),
its Q2 and Q3 are answered above as declarations, and its Q4 is answered by
keeping the row as the declaring party.

**Adjacent owners, not to be re-derived:**
[persistence-architecture-slate](../slates/builds/persistence-architecture-slate.md)
Wave 3 (un-homing the strategy objects) ·
[legibility-slate](../slates/builds/legibility-slate.md) (`extends:`, shipped)
· [estate-nesting-slate](../slates/builds/estate-nesting-slate.md) (what a
slice may carry) · [money-integrity-slate](../slates/builds/money-integrity-slate.md)
(the go-live invariant: a value-bearing field must not be hydrated by going
live) · [eager-residency-slate](../slates/builds/eager-residency-slate.md)
(the competing ratchet).

**Subsystem docs:** [templates.md](../subsystems/templates.md) (the hydrator
contract, the two-phase dispatch, `extends:`) ·
[persistence.md](../subsystems/persistence.md) (the spine and its layers) ·
[lifecycle.md](../subsystems/lifecycle.md) (where registration sits) ·
[access.md](../subsystems/access.md) (the code-naming gate) ·
[studio.md](../subsystems/studio.md) + [cms.md](../subsystems/cms.md) (the
authoring surfaces) · [content-packs.md](../subsystems/content-packs.md)
(install-time class resolution) ·
[lint-family.md](../lint-family.md) (census, then ratchet).
