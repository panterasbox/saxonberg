# Placement — requirements

**Kind:** feature
**Leads from:** kernel — first consumers are **the larder** (shipped,
placed in two kitchens, and currently claiming to be cool without being
cool) and **a meat hook** in `trade-cooking`, both in this build.

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
- **The larder is already in the game**, in two kitchens, and its prose
  already says *"cool and dark inside"*.

**Therefore what is genuinely new here is three sentences the world
cannot say today:** *this sits **in** that, which has its own air* ·
*this **hangs from** that* · and *an author may add a way of sitting
without asking an engineer.*

## Goals

- A thing can sit **in** a region of a container that has its own air,
  and its contents are preserved by that air rather than the room's.
- A thing can **hang from** a support, and the drying model treats it
  as hung rather than as laid down.
- **An author adds a new way of sitting with a row** — no kernel
  change, no engineer, and a player who already knows `on` needs no
  explanation for `from`.
- **The larder stops lying**: prose and mechanism agree, and food kept
  in it is measurably better kept.
- A player can always **name** a region and is told *why* when an act
  on it is refused, rather than finding the region unaddressable.
- Reading is unchanged: finding a thing inside a container still finds
  it wherever in the container it sits.

## Non-goals

- **The icebox, and cold that is produced rather than authored.** →
  [fridge-design-pack](../slates/builds/fridge-design-pack.md); it needs
  a new physics mixin (interior tracking the coldest contained mass)
  and that pack owns the design. The larder is authored-cold and needs
  none of it.
- **The fridge, the freezer, and anything powered.** → the same pack,
  behind the appliance/power tier.
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

The **content is its owner's**: the larder is `generic-objects`' (it is
the object every kitchen names), and the meat hook is
`trade-cooking`'s, because it serves that trade's drying loop and sits
beside the drying rack it already ships.

⭐ **A second instance needs no code.** A second cool container is a row
naming the same class with its own temperature; a second hook is a row.
A *new way of sitting* is also a row — which is the sharper version of
the test, and the one the build is judged on.

## Collisions

- **Two kitchens already hold a larder** — `hinkley-hills` lot kitchens
  and `trade-cooking`'s kitchen. Both change behaviour when the larder
  becomes genuinely cool: food kept there now lasts. That is the
  intended outcome and it is also the thing to watch, because a recipe
  or a beat that assumed the larder was ordinary storage will now see
  fresher ingredients.
- **The larder is seeded OPEN**, deliberately — the craft gather walk
  descends one level into open room containers, so an open larder is
  ingredients in reach. ⚠ A cool larder that must be shut to stay cool
  would break `cook` at home. The build must not make coldness depend
  on the lid.
- **Dave's Bar is the surface exemplar** — the back-bar, the well, and
  eight props that must stay out of the room listing. Any regression
  shows up there first.
- **The Hearthworks cookhouse and pantry chest** are the neighbouring
  storage objects; the hook belongs in the cookhouse's world, not a
  new room.
- **The ice bin behind Dave's rail** is an insulated container that is
  *not* getting a region in this build. It keeps working as it does.
- **Nobody sells bagged ice today** — no retail row references it.
  Noted because it is the icebox's problem when that build comes, not
  this one's.

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

### The larder is cold because it is authored cold

Not because of ice, a lid, a season or a power supply. The world
already has an exception mechanism for a place that is simply the same
temperature all year — a cellar, a cave — and a slatted larder in a
cool corner is that. Cold that must be *produced* is a different build.

## Lens pass

1. **Pedagogy** — modest and real: cold slows spoilage, and the
   larder makes the Arrhenius term the kitchen already runs *visible*
   by giving a player two identical foods in two places. Discipline:
   `cooking` / `recipe-knowledge`, both shipped.
2. ⭐ **Creative expression** — the strongest entry, and the one the
   build is judged on. The ordinary case needs no code: a new way of
   sitting is a row, and a bespoke one is a pack's own verb over the
   same call. This is the lens that chose the vocabulary over a
   hard-coded second relation.
3. **Immersion** — an object stops lying. The larder's prose has
   promised cool and dark since it shipped; this is the mechanism
   catching up to the fiction rather than fiction dressing a mechanism.
4. **Values** — thin, honestly. Stewardship: keep your food properly
   or do not. It gets much stronger with the icebox, where the cold is
   something you have to maintain — which is an argument for that
   build, not this one.
5. ⭐ **Epochs** — strong and free. A cool larder is ancient, an
   icebox is nineteenth-century, a fridge is modern; the mechanism is
   identical and only the cold source changes. This build ships the
   first rung and the ladder is already designed.
6. **Economy** — thin here, deliberately. The ice trade, the
   icehouse-keeper and the agricultural year (cold is free in winter
   and dear in summer) all hang off *produced* cold, which is deferred.
   Recorded as a gap rather than stretched.

## The drive

A character in a kitchen that has a larder, and a second in the
cookhouse.

**A — nothing that worked has stopped working.**

1. Stand in Dave's Bar and `look`. The room lists the bar, the stools
   and the people — **not** the shaker, the muddler, the strainer or
   the other back-bar tools.
2. `look back-bar`. The tools are there, listed under a heading that
   says they are on it.
3. Put something down on the bar and pick it up again. The prose reads
   exactly as it did before.

**B — the larder stops lying.**

4. `look larder` in the kitchen. It still reads *cool and dark
   inside*.
5. Take two identical perishable items. Put one **in** the larder —
   `put <food> in larder` — and leave the other on a counter or the
   floor. The larder line reads *in*, not *on*.
6. `look larder`. The food you put in is listed as being in it; the
   room listing does not show it.
7. `me:i:larder` and a search for the food by name both still find it —
   reading did not get harder.
8. Come back later. `look` at each of the two foods. ⭐ **The one in
   the larder is in a better condition band than the one left out.**
   That is the whole build, visible in two lines of prose.
9. `cook` something at the kitchen without opening or closing anything.
   It still works — the larder is seeded open and ingredients are still
   in reach.

**C — a new way of sitting, added by an author.**

10. In the cookhouse, `put ham on hook`. The response reads **"You hang
    the ham from the hook,"** not "you put the ham on the hook."
11. `look hook`. The ham is listed under a heading that says it is
    hanging from it.
12. `look`. The hook is in the room listing; the ham is not.
13. Leave the ham hanging and come back. It has dried — the hook is
    airy, and the drying loop treats a hung ham as fully exposed.

**D — refusals explain themselves.**

14. Shut a container and try to put something in it. The container is
    still nameable and the refusal **says it is shut** — it does not
    silently fail and the target does not disappear from the parser.

**E — the author's turn (done on the running game, not in a build).**

15. Add one row for a new way of sitting and one word to the `put`
    verb's prepositions. Reload. A player can immediately use it on a
    row that offers it, with no server code changed. ⭐ If this step
    needs a single line of TypeScript, the build has failed its
    central claim.

## Acceptance criteria

Observable from outside the code.

1. **Food kept in the larder is measurably better kept** than the same
   food left in the room, after the same elapsed time, read off each
   item's own description.
2. **The larder's prose and its behaviour agree** — a player who
   believes *cool and dark inside* is not misled.
3. **A ham hangs from a hook**, is described as hanging, is found by
   examining the hook, does not clutter the room listing, and dries as
   a fully exposed thing.
4. **A new way of sitting is added with a row and a word**, by someone
   who cannot write TypeScript, and a player uses it without being
   taught.
5. **Nothing that worked stopped working**: Dave's Bar's eight
   back-bar props stay out of the room listing, `cook` still works at a
   kitchen with an open larder, and every existing way of finding a
   thing inside a container still finds it.
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
