# Forestry — requirements

**Kind:** feature
**Leads from:** content — a new trade pack and a wood on Rejection's
hill; the one piece of substrate (the stand record) has its first
consumers already shipped and already starving: the fuel yard's collier
and the mine's timber sets.

Wood has more consumers than any other material in the game and no
producer. The metal chain closed its loop on four authored charcoal
baskets that nothing restocks, a coppice that could not be cut until
yesterday, and a hazel rotation of 208 real days — so one player can
end iron-making for a world in ten minutes, and nobody can grow it
back. This build ships the producer: **a wood above Rejection that a
player can walk into, read, cut, run out of, and plant** — the first
column of the `forestry → sawing → carpentry` chain, and the venue
every later forest is a second instance of. Seeded by
[forestry-slate](../slates/builds/forestry-slate.md) after its lens
pass of 2026-09-17; the industry sits beside the venue, and the venue
came first.

⭐ The standing constraint, from the user, that shapes everything
below: **an authored wood is always a wood.** Nothing here turns a
forest into a field, simulates a tree, or generates a room. The one
thing that moves is the stand.

---

## What already exists

At the level a player would recognize:

- **The whole downstream chain works.** `char` runs a burn over game
  time and eats cordwood from the clamp; the smelt wants charcoal; the
  mine's timber set is a recipe taking two lengths of any wood with a
  cutting tool, and `shore` consumes the set. The felling axe and the
  billhook ship (in the *mining* pack, oddly) and are propped in the
  fuel yard. **No verb uses either.**
- **There is no felling act anywhere.** `harvest`/`pick` takes a crop
  off a bed; `hew` wins ore. Nothing takes wood out of a standing tree.
- **The coppice exists as a bed.** The fuel yard's coppice panel holds
  six hazel stools; `harvest` now works on it (fixed 2026-09-16) and
  yields eight lengths of cordwood per cycle — on a rotation of
  **2,500 game days**, which is the whole problem.
- **Plants can be authored grown**, in fact — a row that states its
  growth stage hydrates like any other — but nothing ships one and the
  smallholding doc says it is unsupported. The hazel stool claims to be
  "authored already grown" and is not.
- **One wood material — oak.** Thirty rows are made of it, including
  hazel cordwood. One row is made of a *pine* that does not exist. No
  oak species; hazel's species row is in the fuel pack.
- **A record that is not an object** is a shipped shape: the herdbook
  — *these head, this age structure, on this ground*, filed on a branch
  titled to the trade, from which an individual materializes when you
  engage one. Hive and wild population were designed on it; a stand is
  the fourth.
- **The light model has no canopy and no time of day**; outdoor rooms
  author their own daylight — and **none of Rejection's twelve rooms
  do**, which is very likely why the metallurgy drive saw every object
  read *"something"* at the smelter. A wood must not repeat that.
- **The place is authored up to the treeline.** `hillside` climbs out
  of the yard along the seam's strike to the northeast; nothing lies
  north or west of it. Rejection is a resource town with a co-op, a
  claims office and four businesses, and no woodward.
- **Disciplines:** colliery, mining, agriculture, horticulture,
  soil-science, geology, awareness exist. No silviculture; the roster
  slate reserves ISCED `0821 Forestry` for it.
- **Overlapping slates**, none duplicating this: metal-chain (the
  coppice as the fuel trade's capital — *decided*, and now superseded by
  forestry owning it), venue-and-supply (the coppice as the exemplar of
  cut-and-regrow), hunting (*vert and venison*), discovery /
  authored-vs-procedural (foraging — explicitly not here), fire-
  combustion (wet firewood), and the new
  [land-use covenant](../slates/builds/land-use-covenant-slate.md)
  (forest law).

**Therefore what is genuinely new here is:** a felling act that takes
wood out of a standing tree; the stand as a filed record over a wood;
the wood itself as a lit, walkable place above Rejection; wood species
as materials; the coppice rotation reset to a crop a player can
complete; and a producer pack that the fuel and mining trades become
customers of. Everything that *consumes* wood already ships.

---

## Goals

- **A wood exists above Rejection** — the *Hanging Wood* — that a
  player can walk into from the hillside, that is legibly a wood (dim
  under the canopy at noon, dark at night, birdsong and leaf-litter,
  the collier's smoke visible from its edge), with a handful of
  authored clearings and rides and nothing generated.
- **Each clearing of the wood is ground, and its standing timber is a
  stand on it** — readable by anyone standing there: which species
  stand here, how much timber, how old the standards are, and — after
  somebody plants one — who planted it and when. The wood is the sum
  of its clearings (revised 2026-09-17: roots go *into* the ground, so
  the ground carries the stand — the field's shape, not a filed
  record; nothing reports the wood's total in this build). The wood is
  common land of the settlement, so what is taken from any clearing is
  taken from everybody.
- **A player can fell a standard** with an axe, over game time,
  exercising a Discipline, and walk away with timber the mine can shore
  with and logs a hearth can burn — and the stand is smaller for it.
- **A player can cut coppice** with a billhook in any panel — the
  yard's, or the ones up in the wood — and get cordwood the collier can
  char and the mine can set; and the stool regrows on a rotation a
  player can see through: **one game year**.
- **A player can plant a standard**, and it will be mature in fifteen
  game years, and the stand's record says whose it was. The chronicle
  carries the deed.
- **The wood can be cut to nothing.** A stand felled past its
  increment declines and eventually reports empty; the panels cut
  before they are ready yield less; the collier's supply dries up; and
  nothing quietly refills it faster than a wood grows. *Running out is
  correct.* The realm's charcoal rate — panels × lengths × rotation —
  is set end to end in this build and is deliberately smaller than
  what one working smelter would like.
- **Wood is not one material — and this build mints the vocabulary.**
  Oak is the only wood in the game today; every wooden thing is oak
  because oak was the only word. The build ships the closed set of
  woods the realm speaks — each a species and a material, each
  distinguished by a number a substrate actually reads — so that
  cordwood is finally hazel, a haft is ash, a board is pine, and a
  thing made of the wrong wood behaves differently. The
  materials-response, fire and thermal substrates already know how;
  they had one row.
- **A second wood costs no code.** Newbie-wilds' dark wood, a lord's
  chase, a farm's woodlot: a locality writes its clearings and one
  stand row and has a working forest.
- **The tools carry their epoch**, so the land-use covenant has
  something to read when it lands.

## Non-goals

Every one names where it goes.

- **Sawing, cleaving, boards, seasoning, the pit saw, the water-powered
  sawmill** → `trade-sawing`, the next build; column two of the chain,
  the grain chain's water-mill shape with a saw for a head. This build
  yields *timber* (round, green, mine-grade) and *logs*, not lumber.
- **Estovers, forest law, the woodward, the close season** → the
  [land-use covenant slate](../slates/builds/land-use-covenant-slate.md);
  this build ships only the `epoch` stamp on its tools.
- **Foraging, the wild `gather` act, the procedural layer** →
  [discovery](../slates/builds/discovery-slate.md) and
  [authored-vs-procedural](../slates/builds/authored-vs-procedural-slate.md).
- **Deer, boar, the hunt** → [hunting](../slates/builds/hunting-slate.md).
- **Canopy as a light *model*, time-of-day daylight** → the light
  tail; here the wood's rooms author their own ambient the way every
  outdoor room does.
- **The collier as a producer** (a brain that cuts and chars on its
  own) → stays the fuel trade's deferred seam; demand in this build is
  players smelting.
- **Getting lost, the witch, the grove, the outlaw camp** → the
  newbie-wilds wood, which is this build's second instance and needs
  none of its code.
- **Oak bark, pannage, hurdles, withies, potash** → the farmstead
  tails that named them; the species rows here are what make them
  possible.
- **Carpentry — the maker trade that turns boards into chairs, carts,
  casks, looms and hafts, and the cooper / wheelwright / shipwright it
  fragments into** → a `trade-carpentry` build after `trade-sawing`;
  column three of the chain. The vocations register does not list it
  and should; noted for the sweep.
- **A wayfinding Discipline** → nowhere yet; recorded as a gap in the
  slate's lens pass.
- **Runtime land-use conversion — a wood becoming a field, a field
  becoming a farm** → nowhere, deliberately. If authors ever want it, a
  system is built then, on request.

---

## Placement

**A capability pack, `trade-forestry`, at `/trade/forestry/`**, owning
the producer's side of wood: the stand, felling, the coppice panel and
its stool, the hazel species, cordwood and timber, the felling axe and
the billhook, the silviculture Discipline. `trade-fuel` and
`trade-mining` become its customers — the collier buys cordwood rather
than growing it, which is what makes the contest real — and each gives
up the rows it was holding for want of an owner.

**The wood materials are commons** — they go where oak already is,
under `/stuff/idea/material/wood/`, because a cask, a loom and a shield
are made of wood without being forestry's business.

**The Hanging Wood is Rejection's content**, under its world tree, and
the Rejection pack keeps its property of having no code at all. That is
the second-instance test passing on the *first* instance: the wood is
rows.

Host placement — what carries the stand, how felling draws it down —
is the plan's.

---

## Collisions

- **The fuel yard.** Its prose already says *"the coppice standing
  behind it"*; its panel, its two tools and its four charcoal props are
  there; the collier is cast there with an idling brain. **The panel
  stays** as the yard's own cant (user, 2026-09-17), the tools stay
  propped where they are but change owner, the charcoal props stay as
  what they were declared to be — a prop, never restocked — and the
  prose gains a line about the wood above.
- **The hillside** is the only way up, and it currently runs *along the
  seam* to the northeast (old workings, the fringe, the far fringe, the
  claims). **The wood lies off the strike — north and west of the
  hillside** — so no claim block can be under it, and a wood is not
  stakeable. The hillside gains one exit uphill.
- **The claims register and the parcel title.** The wood is titled to
  the settlement as common land so that felling is taking from
  everybody; the mine's claims are a different register and do not
  overlap it. Nothing about the *business cannot hold title* defect
  (mining slate) is made worse or fixed here.
- **The mine's demand** — the timber-set recipe and `shore` — is
  untouched; it simply gains a supply. The provisioning room's tool
  wall still says *"shoring timber"* and is still right.
- **Hearthworks' woodshed and the generic dry/wet logs** are the
  firewood consumers; a felled standard yields logs of that kind, and
  they stay oak because they are.
- **The garden bed that is made of pine** gets its material.
- **Species rows** — hazel moves packs; the other woods are new; the
  cherry, olive, citrus and juniper *trees* the farming pack already
  ships are fruit, not timber, and are not touched. Oak's material row
  has said *"biologicalSource null until an oak species is authored"*
  since it was written; that sentence ends here.
- **Newbie-wilds' treeline** (*"a treeline that has gone quiet"*) is
  not this build's; it is the proof that the next wood costs nothing.

---

## Surface decisions

### Coppice is a bed; timber is a record

The slate's sentence — *coppice is a crop you can complete, timber is a
crop you inherit* — made literal, one mechanism each:

- **Coppice panels are beds** of real hazel stools on the growth model:
  tended, visible, cut with a billhook, regrowing by the same rules as
  a garden. The yard has one; the wood has more, in its clearings.
- **Standards are never instanced.** The stand record says what is
  standing over the whole wood; felling materializes one tree's worth
  of timber and draws the record down; the increment restores it by
  the game year; planting writes an age class with the planter's name.

Chosen because it spends expression exactly once per crop and needs no
engine over beds, no tree objects, and no second route to cordwood.

### The rotations — one game year, and fifteen

Real hazel is cut on seven years; real oak stands eighty to a hundred
and twenty. *Preserve the ratio* (farmstead D23): **a coppice panel is
ready one game year after it was cut** — thirty real days, a crop a
player can complete — and **a planted standard is mature after fifteen
game years**, which is inherited in every sense that matters and still
reachable by a realm that lasts. The shipped stool's numbers are
replaced, not tuned.

### The charcoal arithmetic is set here, end to end, and it is mean

A smelt wants two baskets; a length of cordwood chars to a fraction of
a basket at the clamp's draught; a stool gives eight lengths a year;
a panel has six stools. The build states the resulting number of
smelts per panel per year in the panel's own row and **does not raise
it when somebody runs out** — fuel bounded pre-industrial iron, and a
coppice that comfortably fed everybody would teach the opposite of the
true thing. More panels are an author's or a forester's decision; a
bigger number is not.

### The stand is common land

The Hanging Wood is titled to the settlement, not to the co-op and not
to a person, so every length taken is taken from everybody and the
wood running out is a commons problem — which is the only version of
the deforestation lesson worth teaching. The woodward who would police
it is the covenant build's; until then the wood polices itself by
running out.

### Felling is an engaged act, and it is honest about the tree

`fell` takes an axe (declared, not hunted for), runs over game time,
exercises silviculture, and yields what the stand says was standing —
oak from an oak stand, ash from ash. It does not fell a tree that is
not there: an empty stand answers that there is nothing left to cut,
in words about the wood, not about a failed command.

### Planting a standard is a deed, not a mechanism

`plant` an acorn (or ash key) in the wood writes a sapling age class
to the stand with the planter's identity and the game day. Fifteen
game years later it is timber. There is no reward for having done it
beyond the record saying so, and the chronicle carrying it: a gauge
here would be a gauge on faith. **In scope** (user, 2026-09-17).

### The wood is lit, and the light is authored

The wood's rooms author their daylight like every outdoor room, at a
level dimmer than the open hill, and the clearings brighter than the
rides. No canopy model. ⚠ And the build fixes what the metallurgy
drive found on the way in: **Rejection's existing rooms get their
daylight authored too**, because a wood that is legible next to a yard
where every object reads *"something"* is worse than either alone.

### Grown plants are authored, and the doc says so

The panels' stools are authored mature — the mechanism already
hydrates — and the smallholding doc stops saying it cannot be done.
The hazel stool's own comment finally becomes true.

### The wood vocabulary — closed, and minted here

The material library is a curated closed vocabulary: two rows only
where a substrate reads a different number. Applied to wood that gives
a short list, and this build ships all of it rather than the four
things already claim to be made of, because a forestry trade with one
timber is a contradiction and the next consumer (sawing, carpentry,
the cooper, the bowyer) should find its word waiting:

| wood | what it is for | the number that makes it so |
|---|---|---|
| **oak** | structure, casks, tannin, the mine's sets | dense and hard *(ships; gains its species)* |
| **ash** | anything that takes shock — hafts, wheels, oars | the toughest common timber |
| **hazel** | coppice: hurdles, wattle, cordwood, charcoal | light, fast, chars well |
| **beech** | tool bodies, planes, the best firewood | dense, hard, splits clean |
| **elm** | water pipes, wheel hubs, anything wet | does not rot wet; will not split |
| **willow** | baskets, withies, the light bat | very light, very tough |
| **pine** | cheap boards, resin, pitch, kindling | light, soft, hot-burning |
| **yew** | bows | extreme toughness for its weight |

Eight. Each is a species row and a material row that point at each
other, so a stand can say *oak stands here*, a felled tree yields oak,
and a bow made of it is a yew bow. A wood not on this list is a
vocabulary decision for a later build, not a content row. The pack
places only what the Hanging Wood's stand and the yard's panels
actually grow; the rest are words the realm now has.

⚠ Grain — seasoned vs green, cleft vs sawn — is a fact about a *piece*
and stamps the instance in `trade-sawing`, the way fit stamps a garment
rather than being a cloth. It is not a material.

### One Discipline: silviculture

Managing a stand is the skill; felling, coppicing and planting all
exercise it, the way `hew` exercises geology. ISCED `0821`. A
conversion craft is `trade-sawing`'s to name.

### The tools declare their epoch, and are arguments

The axe and the billhook carry `epoch: medieval`; `fell` and the
coppice cut declare the tool they act with rather than hunting for it.
That is the cheap half of the covenant, and it is also just the house
style.

---

## Lens pass

Run at the slate (2026-09-17) and re-run over this scope; unchanged
where the slate already said it.

1. **Pedagogy** — silviculture (rotation, the increment, species by
   site, *why coal*), wood as materials (why a haft is ash and a cask is
   oak), and the commons. Derivable: a player who reads the stand can
   predict the year the wood fails, and be right. *Gap unchanged:*
   wayfinding has no Discipline.
2. **Expression** — a wood is clearings plus one stand row plus a
   biome, no code; a second wood is a second locality. The bespoke case
   (a grove, a talking oak, a wood you cannot leave) is an author's
   room in that wood, and the stand does not care.
3. **Immersion** — the wood is dim, the yard's smoke is visible from
   its edge, the collier is in it for the days a burn takes, and the
   stand runs out because people cut it. Nothing scripted. *The light
   fix is a precondition, not a polish item.*
4. **Values** — the choices: cut past the increment or not; take the
   last panel; plant for somebody unborn. Standing: the settlement that
   holds the common, and the chronicle. *Gap unchanged:* no woodward
   until the covenant lands; the wood polices itself by running out.
5. **Epochs** — the mechanism is light, increment vs cut and title,
   and holds everywhere; only the axe changes, and it carries its
   epoch so the covenant can say so.

---

## The drive

Run against the live game at the end of the build, as one player,
starting in the fuel yard. Expect it to find things.

1. **`look`** in the fuel yard by day. Every object has a name — the
   clamp, the panel, the axe, the billhook, the collier — none reads
   *"something."* The prose mentions the wood above.
2. **`look panel`** — six hazel stools, *mature*, ready to cut. Not
   seedlings.
3. **Cut coppice.** Take the billhook; `harvest panel` (or the coppice
   cut's own verb, whichever the plan settles) — eight lengths of
   cordwood, **described as hazel**, made of hazel. `look panel` — the
   stools are cut to the stool and regrowing; the panel says when it
   will be ready again, and it is about a game year.
4. **Char it.** Put the lengths in the clamp, `char`, wait it out (or
   the test clock does). Baskets come out. The chain the metallurgy
   drive walked still walks.
5. **Go up.** `northeast` to the hillside; a new exit leads up into
   the wood. Take it. **`look`** — you are in the Hanging Wood: dimmer
   than the hill, trees named, leaf-litter, birdsong; every object
   still has a name. The yard's smoke is visible below.
6. **Read the stand.** Whatever the reading act is (`look` at the wood,
   `survey`, `analyze` — the plan decides), the answer names the
   species standing, how much timber is standing, and that the
   standards are old — planted by nobody alive.
7. **Fell.** With the axe, `fell oak` (or `fell` and let the stand
   answer). An engaged act over game time. It ends with **the trunk on
   the ground** — a bole, made of oak, far too heavy to lift — logs
   from the crown beside it, and an acorn in hand. Read the stand
   again — it is smaller by one tree's worth. Then **cross-cut**: `fell
   bole`, again over game time, and a length of green timber is in
   your hands; the bole says how many lengths are left in it.
8. **Shore with it.** Carry the timber down to the mine, `make timber
   set` (the shipped recipe), `shore`. The set is made of oak. The
   mine is a customer.
9. **Burn it.** A log from the same tree lights in a hearth.
10. **Find a panel in the wood.** A clearing with its own coppice cant;
    cut it too. More cordwood; the arithmetic in the panel's row is
    what you got.
11. **Plant.** With an acorn from the felled oak (or the seed the plan
    picks), `plant` it in the wood. The stand's record now shows a
    sapling class, your name, today's game day; the chronicle shows
    the deed. Fifteen game years is stated, not promised.
12. **Run it out.** Fell until the stand refuses: *"nothing left here
    that is worth the axe"* — in words about the wood. Read it: empty
    of standards, saplings only. The wood is still the wood: the rooms,
    the prose, the exits, all the same. Only the record changed.
13. **Reboot.** Log out, restart the server, log in. The wood is a
    wood; the stand is still empty; the sapling is still yours; the
    panel is still regrowing. Nothing reset, nothing converted.
14. **Second instance, dry.** Author a second stand row for a second
    locality in a scratch pack and boot it: it installs with no code.
    (The plan may make this a wire test rather than a hand step.)

Findings become waves, not a stop.

---

## Acceptance criteria

Observable from outside the code, by a player or an author.

1. From the fuel yard a player can walk into the Hanging Wood and
   back, and at every hour of the game day every object in the yard,
   the hillside and the wood has a name.
2. A player can read the stand and be told what species stand there,
   how much timber, how old, and — after a planting — who planted
   what and when.
3. A player with the axe can fell a standard, and what comes down is
   too big to carry: a trunk on the ground, logs, a seed. Cross-cutting
   the trunk, length by length, yields timber made of the wood the
   stand said was standing; the stand reads smaller afterward.
4. A player with the billhook can cut the yard's panel and any panel
   in the wood and end with cordwood made of hazel; the panel is
   ready again one game year after it was cut, and yields less if cut
   sooner.
5. The mine's timber set can be made from that timber and set in a
   working; the clamp can char that cordwood; a hearth can burn that
   log.
6. A player can plant a standard; the record carries their name; it is
   mature fifteen game years later.
7. A stand can be felled to empty, says so in words about the wood,
   and is refilled only by the increment and by planting; the wood's
   rooms and prose do not change.
8. All of the above survives a server restart.
9. A second locality with its own stand row and clearings is a working
   wood with no code.
10. The realm's charcoal rate is a stated number in the panel's row,
    and it is smaller than one working smelter wants.
11. The eight woods are distinct materials with distinct species, each
    naming the other; cordwood is hazel; a haft is ash; a bow can be
    yew; and nothing in the tree references a wood that does not
    exist.
12. Silviculture appears in a player's transcript after they fell or
    cut or plant.

---

## Cross-references

- Seeding slate: [forestry-slate](../slates/builds/forestry-slate.md)
  (lens pass and decisions, 2026-09-17).
- Siblings: [land-use-covenant](../slates/builds/land-use-covenant-slate.md)
  (forest law, the `epoch` stamp) · [hunting](../slates/builds/hunting-slate.md)
  · [discovery](../slates/builds/discovery-slate.md) ·
  [authored-vs-procedural](../slates/builds/authored-vs-procedural-slate.md)
  · [metal-chain](../slates/builds/metal-chain-slate.md) (the coppice
  decision this supersedes) · [mining](../slates/builds/mining-slate.md).
- Subsystems: [husbandry](../subsystems/husbandry.md) ·
  [smallholding](../subsystems/smallholding.md) ·
  [ranching](../subsystems/ranching.md) (the record shape) ·
  [fire](../subsystems/fire.md) · [mining](../subsystems/mining.md) ·
  [light](../subsystems/light.md) · [biome](../subsystems/biome.md) ·
  [parcel](../subsystems/parcel.md) · [chronicle](../subsystems/chronicle.md)
  · [materials-response](../subsystems/materials-response.md) ·
  [content-packs](../subsystems/content-packs.md).
- In flight: the grain chain (`design/grain-chain`) — the conversion
  trade shape `trade-sawing` will mirror; not a dependency of this
  build.
