# Placement — requirements

**Kind:** feature
**Leads from:** kernel — first consumers are **an icebox** (which fills
a capability the kitchen archetype has declared, in writing, since it
shipped, and which nothing has ever been able to satisfy) and **a meat
hook** in `trade-cooking`, both in this build.

A container's contents are partitioned by *where inside it* a thing
sits. One instance of that ships — a mug rests **on** a desk — and the
model has no word for the concept, so the second instance (something
sitting **in** a compartment with its own air) cannot be expressed at
all. This build names the concept, makes the relation a vocabulary an
author can extend with a row, and cashes it for the two objects that
have been waiting on it. Executes
[containment-partition-slate](../slates/builds/containment-partition-slate.md),
whose design is agreed.

## What already exists

- **Surfaces ship and work.** A mug on a desk is *in the room* with a
  back-reference to the desk; the desk holds no list of its own. Eight
  of Dave's Bar's twenty-five props never clutter the room listing
  because they rest on the well and the back-bar, and you find them by
  examining those.
- **`put` already takes two prepositions** — `in` and `on` — and the
  target is named directly. Naming a sub-region as a target is the
  shipped gesture, not a new one.
- **Spoilage is already temperature-driven.** Freshness carries an
  Arrhenius term, so a colder place genuinely preserves food. Nothing
  in the kitchen is colder than anything else.
- **The ice economy ships**: an ice material, bagged ice, and an
  insulated bin behind Dave's rail.
- **`cure`, `dry` and `smoke` all ship as verbs**, and the drying model
  is already surface-limited — how much of a thing the air can reach is
  a number on the support. The engine's own note says *"a drying rack,
  a meat hook, a cheese shelf, a turf stack, a wire line and a bad
  drying shed all come out of rows"* — and the meat hook is the one
  that cannot, because you do not put a ham *on* a hook.
- **The kitchen archetype already declares a `cold` capability** —
  `{ key: cold, needs: { coldStorage: true } }` — with no default and a
  note saying cold is a property of a space or of *"an insulated,
  closable holder"*, that the shipped larder *"is neither — it is a
  cupboard"*, and that this is *"the reason to want a cold box later"*.
- ⚠⚠ **And the check that answers it is wrong in both directions.**
  (Corrected 2026-09-28: an earlier draft of this doc said nothing
  could satisfy `coldStorage` at all. That was wrong — the satisfier is
  the unlabelled fall-through at the end of the matcher, which a search
  for the other needs' shape misses. The real defect is worse than the
  one claimed.)
  - **False positives.** The holder rung asks only *insulated and
    closable* with **no temperature check** — so any such container
    qualifies however warm it is. Dave's Bar reports cold **met**
    today, on the strength of an empty ice bin at room temperature.
  - **False negatives.** The space rung asks whether the room is
    *thermal*, and **no room in the game is** — rooms carry an
    atmosphere, not a thermal body. So a 279 K stone cellar authored
    for exactly this satisfies nothing, and its own row says
    *"`coldStorage` reads the SPACE"*.

**Therefore what is genuinely new here is three sentences the world
cannot say today:** *this sits **in** that, which has its own air* ·
*this **hangs from** that* · and *an author may add a way of sitting
without asking an engineer* — plus **one sentence it has been trying to
say since the archetype shipped**: *this kitchen has somewhere cold.*

## Goals

- A thing can sit **in** a region of a container that has its own air,
  and its contents are preserved by that air rather than the room's.
- A thing can **hang from** a support, and the drying model treats it
  as hung rather than as laid down.
- **An author adds a new way of sitting with a row** — no kernel
  change, no engineer, and a player who already knows `on` needs no
  explanation for `from`.
- **A kitchen's declared cold capability becomes satisfiable at all**,
  and an icebox satisfies it — food kept in one is measurably better
  kept than the same food left out.
- A player can always **name** a region and is told *why* when an act
  on it is refused, rather than finding the region unaddressable.
- Reading is unchanged: finding a thing inside a container still finds
  it wherever in the container it sits.

## Non-goals

- ⭐ **Touching the larder.** Nowhere, deliberately — and this is a
  correction. A slatted larder is *ventilated*: cool because the room
  is cool and the air moves, not because it holds cold. Its prose is
  honest and the archetype's author already reasoned this through. It
  stays exactly as it is.
- **The fridge, the freezer, and anything powered.** →
  [fridge-design-pack](../slates/builds/fridge-design-pack.md), behind
  the appliance/power tier. This build ships the passive rung only —
  cold you carry in and that melts.
- **Widening `coldStorage` beyond the shape the doc already names.**
  The satisfier is `Thermal` + `Sealable`, as `Archetype.ts` already
  specifies; a cellar or walk-in satisfying it as a *space* is the same
  slate's later rung.
- **Removing the inert atmosphere from every container-like object.** →
  [base-class-narrowing-slate](../slates/builds/base-class-narrowing-slate.md)
  finding #1. This build makes the fix expressible; it does not do it.
- **The frozen-ambient defect** (a loaf in a backpack never warms). →
  the same slate, finding #2. Its repair depends on #1.
- **Grouping identical items in a room listing.** →
  [legibility-slate](../slates/builds/legibility-slate.md) Part C.
- **A second "resting on" on the posture axis.** → recorded on the
  partition slate; a rename for somebody, not a merge.
- **Regions inside things you can walk into** — no luggage on a coach
  roof. Nowhere, deliberately: an exotic combination costs a class, and
  if one is ever popular enough it will have earned it.

## Placement

The **mechanism is the kernel's** — a way of sitting is not a trade's
property, and surfaces are already kernel substrate. The vocabulary
ships as rows in the platform pack so a capability pack can add a
member without kernel code.

The **content is its owner's**: the icebox is `generic-objects`' (it is
the object any kitchen names, and it sits beside the larder and the
range already there), and the meat hook is `trade-cooking`'s, because
it serves that trade's drying loop and sits beside the drying rack it
already ships. The **`coldStorage` satisfier is the kernel's**, with
the other eight.

⭐ **A second instance needs no code.** A second cool container is a row
naming the same class with its own temperature; a second hook is a row.
A *new way of sitting* is also a row — which is the sharper version of
the test, and the one the build is judged on.

## Collisions

- **The kitchen archetype** is the thing this build satisfies, and the
  survey report it feeds will change: kitchens that reported a missing
  cold capability will stop, wherever an icebox is placed. That is the
  intended outcome and the observable one.
- ⚠ **Every other archetype that declares `coldStorage`** starts being
  evaluated the moment the satisfier exists. Today they all report
  unmet regardless of contents; afterwards they report the truth, which
  may be a different answer than anyone has seen. The build must look
  at the whole set, not just the kitchen.
- **The larder shares the kitchens the icebox goes into** —
  `hinkley-hills` lot kitchens and `trade-cooking`'s kitchen. Both keep
  their larder unchanged; the icebox is a second object beside it, and
  the two should read as different things (a ventilated cupboard and a
  cold box).
- ⚠ **The larder is seeded OPEN deliberately** — the craft gather walk
  descends one level into open room containers, so `cook` works at
  home. An icebox that must be shut to hold its cold must not break
  that: ingredients kept in the icebox are *meant* to be out of reach
  until you open it, which is the opposite requirement and needs
  stating plainly rather than discovering.
- **Dave's Bar is the surface exemplar** — the back-bar, the well, and
  eight props that must stay out of the room listing. Any regression in
  the rename shows there first.
- **The ice bin behind Dave's rail** is an insulated container that is
  *not* becoming an icebox in this build. It keeps working as it does.
- **Nobody sells bagged ice today** — no retail row references it. An
  icebox whose ice cannot be replenished is a one-shot object, so the
  build must either place ice where a player can get it or accept that
  the drive seeds it.
- **The Hearthworks cookhouse** already places the drying rack and
  already depends on `trade-cooking`; the meat hook belongs there
  rather than in a new room. ⚠ There is no smokehouse.

## Surface decisions

### A region is named by the preposition, not by a new noun

A player learns *hanging from* the moment the verb accepts `from`,
because that is exactly how they learned `on`. Making the relation and
the preposition the same thing is what buys the uniformity; anything
else needs teaching.

### Reading collapses; placing does not

Finding a thing inside a container finds it wherever in the container
it sits — the chain does not grow a level, and existing queries keep
working unchanged. Placing names the region explicitly. These are
different acts and the world already treats them differently: you find
a mug in a room without mentioning the desk, and you put it *on the
desk* on purpose.

### One region and many regions are the same thing

A container with a single region behaves exactly as it does today. Two
shapes for one concept is the outcome that confuses people, so there is
only one.

### Address freely, refuse with a reason

A region stays nameable even when acting on it is impossible. A shut
compartment says it is shut. A target that vanishes from the parser
teaches nothing and reads as a bug.

### The icebox is cold because there is ice in it

Not because it is authored cold, and not because it is powered. The
cold is a thing a player carries in, and it runs out — which is what
makes it an object somebody has to keep rather than a property of the
room. Cold that is *produced* (a setpoint, a heat pump, a bill) is the
next rung and a different build.

### A capability that answers wrongly is worse than one that is missing

The kitchen's `cold` need reads as a content gap — *"expected to go
unmet in most homes"* — while the check behind it says *met* for a warm
empty box and *unmet* for a cold cellar. A missing check is silent; a
wrong one is confidently misleading, and every survey report that has
ever named cold storage has been reporting on insulation rather than
on cold. Repairing it is in scope because an icebox dropped in front of
an unrepaired check would satisfy it while still warm, which is the
opposite of the thing this build is for.

### Adding a way of sitting costs a row and a word PER SUPPORTING VERB

⚠ A correction to the design's own acceptance test, found while
planning. A relation is one vocabulary row, but every verb that accepts
a *support* must also accept the preposition — today `put` and `dry`,
and no others: of 108 preposition-bearing views the rest use `in`/`on`/
`with` as instrument or medium words (`pour into`, `wash in`, `dose
with`), which are a different thing. The cost is small and bounded; the
requirement is that an author can **find** the set, because a verb that
should accept a relation and silently does not is the arg-gate failure
class.

## Lens pass

1. **Pedagogy** — modest and real: cold slows spoilage, and the
   icebox makes the Arrhenius term the kitchen already runs *visible*
   by giving a player two identical foods in two places — and the
   melting ice teaches latent heat without saying the words. Discipline:
   `cooking` / `recipe-knowledge`, both shipped.
2. ⭐ **Creative expression** — the strongest entry, and the one the
   build is judged on. The ordinary case needs no code: a new way of
   sitting is a row, and a bespoke one is a pack's own verb over the
   same call. This is the lens that chose the vocabulary over a
   hard-coded second relation.
3. **Immersion** — an object stops lying. The larder's prose has
   promised cool and dark since it shipped; this is the mechanism
   catching up to the fiction rather than fiction dressing a mechanism.
4. ⭐ **Values** — stewardship, and it is real here because the cold
   runs out. An icebox is a thing you have to *keep*: fetch the ice,
   notice it melting, shut the lid. Forget and the food is on you. A
   cold that never lapses would have made this entry thin; one that
   does is a standing small choice.
5. ⭐ **Epochs** — strong and free. A cool larder is ancient, an
   icebox is nineteenth-century, a fridge is modern; the mechanism is
   identical and only the cold source changes. This build ships the
   first rung and the ladder is already designed.
6. **Economy** — the first rung only. An icebox *consumes ice*, which
   makes ice a good somebody must supply, and ⚠ nobody sells bagged ice
   today. This build creates the demand and does not staff the supply;
   the icehouse-keeper vocation and the agricultural year (cold free in
   winter, dear in summer) are real and remain
   [preservation-slate](../slates/tails/preservation-slate.md)'s.
   Recorded as a deliberate half.

## The drive

A character in a kitchen, and a second in the cookhouse.

**A — nothing that worked has stopped working.**

1. Stand in Dave's Bar and `look`. The room lists the bar, the stools
   and the people — **not** the shaker, the muddler, the strainer or
   the other back-bar tools.
2. `look back-bar`. The tools are there, listed under a heading that
   says they are on it.
3. Put something down on the bar and pick it up again. The prose reads
   exactly as it did before.

**B — a kitchen gets somewhere cold, for the first time.**

4. Survey the kitchen for what it can do. ⭐ It reports its **cold
   capability as unmet** — as every kitchen in the game always has.
5. Bring an icebox into the kitchen and put ice in it. Survey again:
   **the cold capability is now met**, and names the icebox.
6. Take two identical perishable items. Put one **in** the icebox —
   `put <food> in icebox` — and leave the other on a counter. The
   response reads *in*, not *on*.
7. `look icebox`. The food is listed as being in it; the room listing
   does not show it. Searching for the food by name still finds it —
   reading did not get harder.
8. Come back later. `look` at each of the two foods. ⭐⭐ **The one in
   the icebox is in a better condition band than the one left out.**
   That is the build, visible in two lines of prose.
9. Leave it much longer. The ice has melted, and the food inside is no
   longer being kept — the cold was a thing somebody had to maintain.
10. `cook` at the kitchen. It still works: the larder beside the icebox
    is untouched, still open, still ingredients in reach.

**C — a new way of sitting, added by an author.**

11. In the cookhouse, `put ham on hook`. The response reads **"You hang
    the ham from the hook,"** not "you put the ham on the hook."
12. `look hook`. The ham is listed under a heading that says it is
    hanging from it.
13. `look`. The hook is in the room listing; the ham is not.
14. Leave the ham hanging and come back. It has dried — the hook is
    airy, and the drying loop treats a hung ham as fully exposed.

**D — refusals explain themselves.**

15. Shut a container and try to put something in it. The container is
    still nameable and the refusal **says it is shut** — it does not
    silently fail and the target does not disappear from the parser.

**E — the author's turn (done on the running game, not in a build).**

16. Add one row for a new way of sitting, and the preposition to each
    verb that accepts a support (today `put` and `dry`). Reload. A
    player can immediately use it on a row that offers it, with no
    server code changed. ⭐ If this step needs a single line of
    TypeScript, the build has failed its central claim — and if the
    author cannot discover *which* verbs need the word, it has failed
    half of it.

## Acceptance criteria

Observable from outside the code.

1. **Food kept in the icebox is measurably better kept** than the same
   food left in the room, after the same elapsed time, read off each
   item's own description — and stops being kept once the ice melts.
2. ⭐ **A kitchen with a WARM icebox reports cold as unmet; put ice in
   it and the same kitchen reports MET.** Today the box alone would
   satisfy the check while empty and warm. This is the criterion that
   proves the *cold* is what is being reported, not the insulation.
3. **A ham hangs from a hook**, is described as hanging, is found by
   examining the hook, does not clutter the room listing, and dries as
   a fully exposed thing.
4. **A new way of sitting is added with a row and a word per
   supporting verb**, by someone who cannot write TypeScript, and a
   player uses it without being taught — and that author can find
   which verbs need the word without grepping the tree.
5. **Nothing that worked stopped working**: Dave's Bar's eight
   back-bar props stay out of the room listing, `cook` still works at a
   kitchen whose larder is untouched and open, and every existing way
   of finding a thing inside a container still finds it.
6. **A region can always be named**, and an act on it that cannot
   happen is refused with a reason a player can act on.
7. **Putting something into a shut container is refused and says why**
   — today it is not refused at all.

## Cross-references

- [containment-partition-slate](../slates/builds/containment-partition-slate.md)
  — the agreed design, the two composition refusals, and the rejected
  `Vessel`/`Chamber` split.
- [base-class-narrowing-slate](../slates/builds/base-class-narrowing-slate.md)
  — what this unblocks and deliberately does not do.
- [fridge-design-pack](../slates/builds/fridge-design-pack.md) — the
  icebox and everything above it.
- [spatial.md](../subsystems/spatial.md) ·
  [spoilage.md](../subsystems/spoilage.md) ·
  [legibility-slate](../slates/builds/legibility-slate.md) Part C.
