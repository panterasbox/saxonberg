# Smell and taste, and the word lists behind them — requirements

**Kind:** refactor/sweep, and larger than that word suggests. The owner, on
the one decision that set its size: *"I don't want you cutting scope to make
it more like a refactor. If we do nothing else we're going to do this and get
it right."*
**Leads from:** kernel. **First consumers, in this build:** every material in
the game (the full pass), the whiskey chain's peat, cask and kiln rows, the
dirt rows, spoilage, the corpse, and the cooking pack's eight recipes that
name a medium.

Smell in this game is four systems that give different answers to the same
questions. Taste is a union of labels with no amounts, reachable only on a
serving vessel. Neither one tells a person anything about whether they like
what they're eating. This build makes smell one thing that travels from a
source through the air to a nose, makes taste the same shape at zero distance,
and adds what both were missing: the person doing the smelling and tasting.

It began as a sweep of the kernel's closed word lists, which is where its name
comes from. Two of the five lists are settled here. Smell is the reason for
the build.

Seeding slate: [vocabularies-to-rows](../slates/builds/vocabularies-to-rows-slate.md)
(which absorbed non-visual-senses, and holds the reuse ledger for the plan).
Designs this leaves ready for: [wellbeing](../slates/builds/wellbeing-slate.md),
[mind](../slates/builds/mind-slate.md),
[recipes](../slates/builds/recipes-slate.md),
[flowers](../slates/builds/flowers-slate.md).

## What it is

A **smell** is something coming off a thing and reaching you. A glass under
your nose and a room are the same event at different distances. It tells you
about things you can't see: what's in the next room, what's gone off, who has
been where. So it gives you an advantage, and sometimes it is also a pleasure.

A **taste** is a substance on your tongue. It is the last check before you
swallow and the maker's instrument at the pot. Past that it is mostly pleasure,
and pleasure belongs to the person more than the food.

Both are true in every epoch. The quantity underneath stays the same and only
the reader changes: a nose gives a word, and an instrument gives a figure.

## What already exists

**Verbs:** `smell`, `taste`, `feel`, `listen`, `sense`, `analyze`, `measure`,
`readings`, `eat`, `drink`.

**Smell today:**

| | How it's held | What names it | How it's read |
|---|---|---|---|
| in a drink | an amount dissolved in the liquid | 11 closed words | through a glass only; strength and detail by competence |
| in the air | an amount that walks through doors and exits | free text | flat threshold by species; no competence; names its source through walls |
| on dirty things | an amount per unit of dirt | free text on 5 dirt rows | the same as air |
| on spoiled food | fixed sentences per spoilage band | none | only when you smell that one thing |

Only candles, brick clamps and dirty things emit into the air. A candle's smell
is its material's name, a clamp's is its fuel's name plus "smoke", and the fire
build's air reading also goes by material name. Those are the places asking for
substances that smell.

**Taste today:** five closed words, which stay closed because they are a fact of
physiology. A dish's taste is the union of its ingredients' words, with no
amounts. Roughly 72 of about 163 edible materials author any. `taste apple` falls
through to the apple's ordinary description. `taste` costs nothing and needs no
target.

**Hunger today** imposes nothing until the reserve reaches zero.

**Also shipped:** competence bands, a reading ladder any pack can add a channel
to, a gas analyzer that already reads the atmosphere, row inheritance, seeded
identity fields such as blood type, and a mixin pattern for materials that opt
into a capability.

**In flight:**
- controllers-are-io (MR !527) touches perception verbs and splits eating from
  digesting;
- water-supply touches crafting and adds reading rows;
- client-surface is rewriting `look`.

**Therefore what is genuinely new here is:**
- one model of smell over sources that already mostly exist;
- a material's own smell, and its taste strengths;
- adaptation;
- the person: a taste profile and a liking read.

Everything else is moving existing behavior into one place, plus the content
pass that makes it true of the whole world.

## Goals

### One smell

- **Every smell is one event: source, air, nose.** A person standing beside a
  thing and a person two rooms away are reading the same smell at different
  strengths.
- **Sources are ordinary things in the world:**
  - a substance, because of what it is;
  - a made thing, from its ingredients, the way taste already works;
  - a dissolved aroma, by how much is in the liquid;
  - a fire, as its fuel's smoke;
  - dirt;
  - rot, from the spoilage bands;
  - a corpse, from its decay;
  - a living animal, from its species;
  - the ground and water, through their material.
- **Four rules govern every source:** amount matters (a barrel outweighs a
  spoonful, on a compressive scale); a closed container holds a smell in and an
  open one leaks, including what you carry; heat drives it (warm smells more,
  frozen barely at all, for anything that has a temperature); distance reduces
  it at every hop.
- **One nose reads everything.** Whether you detect a smell depends on that
  aroma's own threshold, moved by your species. The smell furthest past its
  threshold dominates, so a whiff of sulfur beats a roomful of grain.
- **Anyone can read strength.** Competence decides how far down the aroma tree
  you can name and how many smells you can pull apart. A smell below threshold
  is invisible to everyone, and no digit ever renders from a nose.
- **The nose tells you what, not where.**
  - In another room you get the word and the strength. You find the source by
    walking and noticing it change.
  - In the same room the source is named only if you can see it and it is the
    only visible thing carrying that smell.
  - `smell <thing>` always knows, because you've put your nose to it.
- **You stop noticing.** A steady smell falls a few steps over minutes of game
  time, per word and per person, and returns when you've been away. Your own
  smell starts out adapted, so you can't tell how much you reek.
- **Aroma words are open, and arranged in a tree.** Any pack can add a word, at
  the top or under someone else's, with no kernel edit. An untrained nose reads
  `smoke` where a practiced one reads `peat smoke`. You name as deep as the
  better of two disciplines lets you: the source's maker's, and the one the
  aroma itself declares.
- **The deliberate reads are on the ladder:**
  - `analyze aroma [thing]` gives everything you can separate;
  - `measure aroma [thing] with <instrument>` gives a figure with an honest
    bracket, from the gas analyzer that already exists;
  - `readings aroma` shows the ladder.
- **The whole world smells honestly.** Every material is judged by the nose in a
  full pass. Those with a real smell get one, plain ones carry nothing at all,
  and every fuel gets its smoke. Every authored claim is true.

### One taste

- **Taste has strengths.** A material carries each of the five with a strength,
  each taste has its own threshold, and a blend works it out from what actually
  went in. A pinch of salt in a pot is faint and brine is overwhelming, and a
  little bitterness cuts through a lot of sugar.
- **Flavor is the tongue and then the nose at zero distance.** Your species and
  adaptation apply. You still can't smell salt.
- **Anything edible can be tasted.** A floor and a table knife cannot.
- **Tasting is contact and has a cost.** It needs a thing in reach of your hand.
  A small sip or bite really comes out of the thing, and a small dose of whatever
  it holds reaches you on the same path as eating. Lye burns and a toxin doses
  you. There is one verb: `taste` is the small mouthful and `eat` is the meal. A
  bare `taste` with no target goes away.
- **Every edible material is in a full pass**, so tastes have strengths
  throughout.

### The person

- **Every body has a taste profile.** It is minted at character creation from the
  species' spread, drawn from the character's parents where the character has
  them, and it covers both tastes and aromas. It changes over time: repeated
  exposure raises liking, and food poisoning leaves a lasting aversion to that
  food.
- **Liking is one read for all three kinds of bad.**
  - Universally gross comes from the species' built-in curve: strong bitter and
    rot repel everyone.
  - Personally gross comes from your own curve: a born bitter sensitivity, an
    aroma you were born disliking, what you've grown used to.
  - Badly made is the same curve past its peak: too salty is unpleasant to nearly
    everyone, and a burnt dish carries a burnt aroma.

  The food stores no quality score, and the machine never judges the dish.
- **Liking is what you read.** Two people honestly disagree about the same soup.
  `eat` says how it went down for you. Smell uses the same curves, so a bakery can
  delight you and leave your friend indifferent.
- **Hunger scales liking**, now, in the words: starving, you'd eat anything.

### The word lists

- **Aroma words become rows.** The eleven existing words, the five dirt words and
  the words the full pass needs. `sulphur` becomes `sulfur`, and `odour` becomes
  `odor`.
- **A recipe's cooking medium is any material tag.** The heat ceiling comes from
  the material that carries it: its boiling point or smoke point, whichever it
  has, the lower if both, and no ceiling if neither. So poaching in wine or milk,
  a salt bake and a sand roast all become rows.
- **Authoring mistakes fail loudly.** A misspelled aroma word, a misspelled medium
  no material carries, or a smell authored on a material that can't hold one is
  refused where the content is checked. It is never silently dropped.

## Non-goals

- **Stress, the equanimity meter and what hunger does to it** → the
  [mind slate](../slates/builds/mind-slate.md), with the interlock recorded there
  and in [wellbeing](../slates/builds/wellbeing-slate.md). This build stops at the
  liking read. Good and bad impose no penalty yet beyond what you read.
- **What you get on arrival, and how `sense` works** →
  [senses slate](../slates/builds/senses-slate.md). It depends on where the UX
  lands.
- **NPCs reacting to smell, scent trails and tracking** → senses slate. NPCs have
  profiles and noses after this build, and nothing yet reads them.
- **Touch and hearing** → senses slate. They get nothing yet, deliberately: an
  unused sense stays unused until a trade needs it. Mouthfeel, astringency and
  chili heat wait there as touch.
- **Aging tastes, sensory-specific satiety as a mechanic, wanting vs liking** →
  wellbeing. Exposure is recorded here, so satiety finds what it needs.
- **Flowers, perfumers and scent breeding** → [flowers slate](../slates/builds/flowers-slate.md).
  A flower needs only a smell entry when it arrives.
- **`MATURATION_MECHANISMS`, and rows overriding a mechanism's lines** →
  [material decomposition](../slates/builds/material-decomposition-slate.md), where
  a mechanism becomes a class.
- **`DISPLAY_KINDS` and `DISPLAY_PAIRINGS`** →
  [display manifestation](../slates/tails/display-manifestation-slate.md). Screens
  are getting their own design conversation.
- **A `SmellProfile` or `TasteProfile` process row** → nowhere, deliberately. A
  person's taste profile is a fact about a body. It isn't a process row.
- **A chemistry model of vapor** → nowhere, deliberately. A source's strength is a
  multiple of its aroma's threshold, and distance reduces it.

## Placement

The nose, the tongue, the liking read and the reading ladder's new channel belong
to the kernel and the platform pack: they are true of every realm.

The common aroma words live in the commons, so any pack can reach them. A pack
that owns a material authors that material's smell and taste, and a pack that
wants a word nobody ships adds it. **A second aroma needs no code**, and neither
does a second smelly material or a new cooking medium.

## Collisions

- **Every shipped place's smell read changes.** A room that read nothing now reads
  what's in it. The world's smell is re-baselined, and that is the point.
- **The tannery, the byre, the knacker's, the distillery, the chandlery, the
  smokehouse floor:** these are where the world will first feel different. Check
  each for a smell that's now overwhelming where it shouldn't be, or one that
  drowns out everything around it.
- **Authored room prose** that mentions a smell stays. It is the bespoke case. A
  room whose prose says one thing and whose air says another is a defect to fix in
  the pass.
- **The cask rule reverses.** `metabolism.md` says the only way to nose a cask is
  to pour a dram. An open cask now smells, and so does the room it's in. Taste
  still needs contact.
- **A shipped rule reverses.** A novice now reads strength on a drink, where they
  used to "know it is smoky, not how smoky". Picking out grade and age stays with
  the proficient.
- **Candles and clamps** stop naming their smell after a material or fuel name.
- **Food tasters and bare `taste`:** scripts or help that use `taste` with no
  target stop working. Breaking is accepted.
- **Duncan Hall's lobby** keeps its gas analyzer, which gains a new reading.
- **Siblings:** controllers-are-io owns the perception views' shape and the
  eating/digesting split that taste's dose goes through. Whichever merges second
  reconciles.

## Surface decisions

### One smell or two

One. Sharing a word list across separate systems would have left every mismatch
in place. **Owner's decision.** Lens 1 supports it: a player can work out why they
smell something.

### A flat list or a tree

A tree, read by competence, using the better of the source's maker's discipline
and the aroma's own. Lens 1 decides: telling peat from coal becomes something you
get better at. Lens 2 agrees: an author writes the most exact word they mean, and
each reader gets as much as they can name.

### Adaptation runs on the game clock

Everything does. Nothing in this game runs on real time.

### Materials opt in

A material with no smell holds no smell data at all. This gets ahead of the owner's
planned material decomposition. Materials are building blocks authors consume, so
lens 2 doesn't reach this decision.

### Tasting is a real act

A check with no risk teaches nothing (lens 1). It stops being a free look, which is
the intended cost.

### Liking stops at reading, for now

Learning what you like, why a dish failed and that your friend tastes it differently
all work with no meter behind them. Stress deserves its own design and shouldn't be
shaped around one of its inputs. **Owner's decision.**

### The closed-vocabularies check ends at 3

It starts at 5. `AROMAS` and `RECIPE_MEDIA` go. The three that remain each name where
they're going. None is recorded as closed by nature, because that would be false.

## Lens pass

**1 pedagogy.** Why you smell what you smell, why sulfur beats grain, why a dog
notices first, why you can't smell yourself, why a pinch and a handful differ, why
preserved food is monotonous: all derivable, none told. Disciplines are the trades
that already exist. Learning a nose comes from working the trade.

**2 creative expression.** The ordinary case authors one line on a material or
nothing at all, and a dish needs no authoring. The bespoke case keeps room prose and
adds aroma words with no kernel work.

**3a immersion.** A tannery that reeks and a fishmonger that doesn't would be worse
than nothing smelling, which is why the pass is full. **3b participation.** A cook,
a taster, a curer and a perfumer all have something to trade on, and players will
disagree about the soup in ways we did not script.

**4 values.** A threshold is a gauge, and now an author sets it for their word. What
counts as universally gross is a species curve, which is ours by default and is the
grain, not the law: a realm can author a different species.

**5 continuity.** Passes. The quantity survives the epoch, and the gas analyzer proves
it today by answering the same command with a figure.

**6 economy.** Produces reasons to pay: for curing that keeps and still tastes good,
for a cook, for fresh food in town. Consumes nothing new. The demand arrives fully
when stress does. ⚠ **The gap:** until then, liking changes what you read and not yet
what it costs you.

**7 governance.** Does not bite. Nothing here judges a person. It will when NPCs react
to smell, which is why that's a separate build.

## The drive

Places named are shipped. "Practiced" and "untrained" are staged competence.

### Blocking drive

**Smell: the world**

1. `instant · player` An untrained character stands in the Wharfside tannery yard and
   types `smell`. They read a word in the tree's top rows and a strength, with no digit.
2. `instant · staged` A practiced tanner in the same yard reads the deeper word, and
   more than one smell.
3. `short · player` The untrained character stays some minutes of game time and smells
   again: the same word, a few steps fainter. They leave, wait, come back: strong again.
4. `instant · player` They step out to the neighboring place and `smell`: a fainter
   read, the same word, and no source named. They walk back and it strengthens.
5. `instant · staged` A character of a keen-nosed species at a distance where a person
   detects nothing does detect it.
6. `instant · staged` A low-threshold smell (sulfur) and a large quantity of a
   high-threshold one (grain) share a room: sulfur leads.

**Smell: sources**

7. `instant · staged` A tar pot sits in a room. Close its lid: the room's smell goes.
   Open it: it returns. A character carrying tallow in an open pouch smells of it, and
   in a sealed box does not.
8. `instant · staged` A warm loaf fills a room more than a cold one, and a frozen carcass
   barely registers.
9. `instant · staged` A lit hearth smells of its fuel's smoke, named by the fuel, and
   reaches the next room. Put it out: gone.
10. `staged · player` A rotten side of beef is staged: the next room smells of it. Pathogens
    are planted on a fresh cut: nothing reports them, at any band.
11. `staged · player` A corpse staged at each decay stage reads differently through a door.
12. `instant · player` A stew smells of its ingredients with nobody having authored that.
13. `instant · player` The Hearts Delight byre smells of animals as well as dung. Walking
    onto a peat cutting or a salt shore, the ground and water read through their material.

**Smell: who and what**

14. `instant · staged` Three farmhands stand in a room with dung on them. `smell`: the word,
    no name. `smell <one>`: it names them. Leave one: it names them on the bare read. Turn
    out the light: the word only.
15. `instant · player` A filthy character types `smell me`: it reads low. Another character
    `smell`s them: it reads high.
16. `instant · player` `analyze aroma` in the distillery and on a glass; `readings aroma`.
17. `instant · player` In Duncan Hall's lobby: `measure aroma with gas analyzer` gives a figure
    with a bracket, and the same subject by nose gives a word.

**Taste**

18. `instant · player` `taste` with no target is refused in words naming what it needs. `taste`
    on a floor and on a knife are refused.
19. `instant · player` `taste apple` reads the apple and takes a small bite that shows on it.
    Cheese and a loaf the same.
20. `instant · staged` A stew with a pinch of salt and one with a handful read differently.
    Brine reads overwhelming.
21. `instant · staged` A sweet dish with a little bitter in it reads the bitter.
22. `instant · player` A peated whisky: `taste` gives the tongue and the nose together. `smell`
    on salt water gives no salt.
23. `staged · player` A taste of lye burns, and a taste of the distiller's foreshots gives a
    small dose that shows on the body, smaller than a drink of it.
24. `instant · staged` A brine boil, a poach in wine and a sand roast all work from rows, and
    their heat ceilings differ as their materials say.

**The person**

25. `instant · staged` Two characters with staged profiles taste one soup and read differently.
    An oversalted soup reads badly to both. Rot reads badly to both.
26. `instant · player` `eat` says how it went down, and the character is fed either way.
27. `staged · player` The same plain meal reads better to a starving character than a full one.
28. `staged · player` Food poisoning from a dish leaves that dish reading worse the next time.
29. `instant · player` A new character from enrollment has a profile, and two new characters do
    not all read alike.

**Authoring**

30. `instant · staged` A test pack adds `pine tar` under `tar`: a player smells it, and no kernel
    file changed. The same pack adds a recipe medium no kernel source names.
31. `instant · staged` A misspelled aroma word, a misspelled medium and a smell authored on a
    material that can't hold one are each refused loudly.

**Persistence and light**

32. `short · player` Restart the world. Profiles, exposure, aversions and the state of a
    half-tasted apple read back unchanged.
33. `instant · player` Walk the tannery, the byre, the chandlery and the distillery at night.
    Smell still works in the dark and the source is not named. No new place ships, so there's
    no new premises to check for light.

### Soak drive

34. `span` Repeated eating of a bitter food over game weeks raises its liking for that character.
35. `span` Food left out over game days moves through the smell of going off, with no staging,
    and reaches the next room when it should.
36. `span` A corpse left over game weeks moves through its decay smell unstaged.
37. `span` An aversion from food poisoning is still there after a long game time.

## Acceptance criteria

- Standing in any shipped trade venue, a person smells what is actually there, in words,
  with no authored room text needed.
- A person can find a rotten thing or a fire in another room by following the strength with
  their nose, and is never told the direction or who.
- A person who stays in a reeking place stops noticing it, and notices again after being away.
- A filthy person can't tell by smelling themselves, and someone else can.
- A novice and a practiced nose read the same smell at the same strength, and the practiced
  one names it more exactly and separates more of it.
- A dog-nosed character notices what a person can't. Below threshold, nobody notices.
- No nose or tongue read ever shows a digit, and the gas analyzer's reading does.
- A cook can tell a pinch of salt from a handful by tasting.
- Anything edible can be tasted, doing so visibly uses some of it, and tasting something
  dangerous has a real effect.
- Two people can honestly disagree about one soup, and everyone agrees about a rotten one.
- A person starving likes the same food more than a person who is full.
- Food poisoning changes how that food reads afterward.
- All of this survives a restart.
- A pack can add an aroma word, a smelly material and a cooking medium with no kernel change.
- Mistyped aroma words and media fail loudly, and a smell is never silently dropped.
- Iron, glass and clean water smell of nothing.
- The closed-vocabularies check reads 3, and each remaining list names its destination.

## Cross-references

- Slates: [vocabularies-to-rows](../slates/builds/vocabularies-to-rows-slate.md) ·
  [senses](../slates/builds/senses-slate.md) · [wellbeing](../slates/builds/wellbeing-slate.md) ·
  [mind](../slates/builds/mind-slate.md) · [recipes](../slates/builds/recipes-slate.md) ·
  [flowers](../slates/builds/flowers-slate.md) ·
  [material decomposition](../slates/builds/material-decomposition-slate.md) ·
  [display manifestation](../slates/tails/display-manifestation-slate.md)
- Subsystems: [senses](../subsystems/senses.md) · [metabolism](../subsystems/metabolism.md) ·
  [instrumentation](../subsystems/instrumentation.md) · [spoilage](../subsystems/spoilage.md) ·
  [cleanliness](../subsystems/cleanliness.md) · [crafting](../subsystems/crafting.md) ·
  [mortality](../subsystems/mortality.md) · [exertion](../subsystems/exertion.md)
- In flight: `controllers-are-io` (MR !527) · `water-supply` · `client-surface`
