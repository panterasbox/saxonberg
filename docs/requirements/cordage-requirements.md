# Cordage — requirements

**Kind:** feature
**Leads from:** content. `trade-cordage` and the Wharfside ropewalk lead. The
kernel's part is rope as a thing with two ends, and a rope at an exit.

Rope is nearly absent from the world. Diving's lifeline and the quay's heaving
line are the only working lines; the bailer's rope, the pot's rope and the hitch
are prose. Nothing makes any of them. This build adds the ropewalk: hemp (and
the flax the world already grows) spun, twisted and laid into rope that is sold
and cut by the meter, tied with knots that cost it strength, tarred against rot,
and tied off at a drop so that someone can climb it, with a partner holding the
other end. Seeded by [cordage-slate](../slates/builds/cordage-slate.md),
decided with the owner 2026-10-22.

## What already exists

- **A line with two ends.** Diving's lifeline (`trade-diving`) has a length, a
  fixed end and a free end, and the verbs `throw line to`, `pull line`, `tug`
  and `lash … to`. The quay's heaving line is one, and so is the diver's air
  hose. ⭐ **The river (merged 2026-10-23) made the boat's painter a third**
  (15 m, "an eye spliced in one end"), sold at Rejection's put-in counter
  three at a time. It is thrown ashore to line a boat up quick water, and a
  line thrown from the bank pulls a swimmer out. The water and the boat
  reach a line's end through one shared protocol, and the river's own doc
  says *"in cordage's world the line is the rope"* and *"a horse wants a
  rope"* (pulling a horse from the water). A cable ferry runs on a fixed
  cable.
- **Flax to yarn.** Farming grows flax; the retting pit rets it; `scutch` gives
  line and tow; `spin` gives yarn. Tow's own description says it "twists into
  rope", and nothing does.
- **Tar and pitch** from the retort (`trade-fuel`). **`dip`** (chandlery) puts
  a thing into a pot of something.
- **Climbing.** An exit can be climbed when a climbable thing stands in the
  room (the Rejection winze's ladder); the body is the gate (exertion's climb
  rest). **Falls.** The hazard `drop` drops you to where down is and wounds
  you.
- **Joints.** Assembly's joint rows carry a strength, a reversibility and a
  failure mode; twelve ship (glued, pegged, stitched, …), and no knot.
- **Verbs nearby:** platform `cut` (the thing decides what cutting means);
  diving `lash`; energy `splice` (a cut feeder line); fishing `lay` (a pot or a
  net); textiles `spin`, `scutch`.
- **Wharfside** has a candle chandlery, the dive shop, the tannery, the
  dyehouse and an unbuilt west bank ("left to later builds").
- **No** hemp, sisal, coir or horsehair rows; no good sold by length; no
  ropework Discipline; no rope seller.

Therefore what is genuinely new here is: **rope as a made thing with a length
and a strength**, the act that lays it, knots, the rope tied off at a drop and
the belay, hemp as a crop, rot and tar on rope, the ropework Discipline, and the
ropewalk.

## Goals

- A person can make rope from fiber at a ropewalk, and the rope they make has
  a length (no longer than the walk) and a strength that follows from its fiber
  and its thickness.
- **There is one rope, and what it is for is where its ends are tied.** The
  same rope serves at a drop, down a shaft, as a handline, as a diver's
  lifeline, as a boat's painter or on a bucket. No use needs a different kind of
  rope.
- A rope is bought and cut by the meter.
- A knot costs the rope strength, each knot in its own way, and the wrong knot
  fails in an honest, predictable way. A splice keeps nearly all of it.
- A rope tied off at the top of a drop makes the drop climbable both ways. It
  holds or parts by derivation, wears at the lip with use, and frays visibly
  before it parts.
- A partner can belay a climber and catch a fall that would otherwise drop
  them.
- Untarred rope that stays wet loses strength over time; tarred rope does not.
- Hemp grows on a farm and becomes rope fiber the way flax becomes linen.
- Rope-making and knot-craft are learned (the ropework Discipline), and
  competence changes the outcome deterministically.
- The lifelines, heaving line and painter in the world are rope that someone
  made.
- A rope can carry its maker's mark (the rogue's yarn) inside it, and every
  length cut from it carries the same mark.

## Non-goals

- **A hose is not a rope.** It may share a "line with two ends" ancestor with
  rope; it stays its own thing → nowhere, deliberately.
- **Wire rope** → [cannery-and-bottling-slate](../slates/builds/cannery-and-bottling-slate.md)
  (metal forming).
- **Nylon** → [plastics-slate](../slates/builds/plastics-slate.md).
- **The block and tackle, the capstan, the windlass, a mine's winding rope** →
  [machines-slate](../slates/builds/machines-slate.md).
- **Binding a person; picking oakum** → [prison-slate](../slates/builds/prison-slate.md).
- **The lasso, halter and lead** → ranching (its slate).
- **Running rigging replaced on a schedule; a ship chandler's bulk trade** →
  the ships build ([ships-and-harbors-slate](../slates/builds/ships-and-harbors-slate.md)).
- **Hemp's drug variety (cannabis)** → [smoking-slate](../slates/builds/smoking-slate.md),
  which calls it *"one field, two varieties."* Only the fiber variety ships,
  and hemp is authored as one plant so that the smoking build adds its second
  variety as rows, not a new crop.
- **Sisal, manila, coir** → cordage slate (tropical gaps); **jute** stays bought
  stock.
- **Rated, certified rope and liability for a failed rope** → cordage slate §7.

## Placement

- **`trade-cordage`**, at `/trade/cordage`: the ropewalk, rope, knots, the
  twisting act and the belay.
- **Hemp** is farming's (`trade-farming`), a crop beside flax.
- **Rope as a line with two ends, and a rope at an exit,** are substrate that
  diving, the river and any later trade compose, so they belong where the
  shipped lifeline's substrate can be shared, not in `trade-cordage` alone.
- **The venue:** the Wharfside ropewalk on the west bank, in `terminus`.
- ⭐ **The test:** a second ropewalk, a second drop, or a rope used somewhere
  new needs **zero pack code**, only rows.

## Collisions

- **Diving's lifeline and air hose.** The lifeline becomes rope; the hose
  stays a hose. Its verbs (`throw line to`, `pull line`, `tug`, `lash`) keep
  working, now on any rope.
- **The quay's heaving line** (Wharfside) becomes rope.
- **The river's painter** (merged) becomes rope, so this build reconciles it.
  Its spliced eye is a splice. Rejection's put-in counter keeps selling
  painters, and the ropewalk's rope is what they are.
- **Lining and the rescue line** (river) keep working, on any rope.
- **The cable ferry's cable** stays the ferry's fixed cable, like the Hesper's
  rigging. It is not loose rope. Recorded, not changed.
- **The Hesper's rigging, the bowstring, the clothes-line**: authored lines that
  stay as they are this build (fixed rigging and a bow's worn part are not
  loose rope). Recorded, not changed.
- **`lash`** (diving): `tie` is the same act and becomes its alias.
- **`splice`** (energy): joining two ropes and repairing a cut feeder are one
  act; the thing decides.
- **`cut`** (platform): cutting a length from a coil rides it.
- **`lay`** (fishing) is left alone; the ropewalk's act is `twist`.
- **Flax tow's description** ("twists into rope") becomes true.
- **The Wharfside west bank**: the ropewalk is the first thing built there.
- **The Sunken Delve's pit** is the drive's drop.

## Surface decisions

### Rope is one thing; its use is where its ends are tied
The owner's correction: the lifeline is one *use* of rope, not rope's only
application. A rope has a length and two ends; tied to a diver it is a lifeline,
to a boat's bow a painter, to a post at a lip a climbing rope. A hose shares the
two-ended shape and is a different thing.

### Length, in meters
Rope is sold by the meter and cut with `cut <rope> <n> m`. A coil splits into
two ropes whose lengths sum to the original. ⭐ **A rope cannot be longer than
the walk it was laid on.** The walk's length is the ropewalk's capability.

### The act is `twist`
Twisting yarns into a strand and strands into rope is one act at two scales, so
it is one verb; what is twisted decides the stage. **The decision is how many
yarns**: more yarns, a thicker rope, and strength grows with the square of the
thickness. The alternating twist is why laid rope holds together and is told in
the look, not chosen. `lay` belongs to fishing.

### Verbs
`twist` (new) · `tie <rope> to <thing> [with <knot>]` (alias of `lash`) ·
`untie` (new) · `coil` (new) · `splice` (shared with energy) · `cut` (platform)
· `belay <person>` (new) · `dip` (chandlery) for tarring.

### Knots are a closed list of five
| knot | keeps | use | failure |
|---|---|---|---|
| bowline | ~60% | a loop that does not slip | — |
| clove hitch | ~60% | to a post | slips under a jerking load |
| sheet bend | ~50% | joins two ropes | — |
| reef knot | ~45% | binding | ⭐ spills under uneven load (the classic mistake) |
| splice | ~90% | joins or loops, permanently | — |

A knot is assembly's joint, with a strength, a reversibility (`untie`; a splice
is cut out) and a failure. A practised hand dresses a knot to its rating; a
green hand's holds less. No roll.

### The rope at a drop
Tie a rope to a fixture at the top (a post, a bollard, a ring) and its free end
hangs down the drop: the climb is passable from both ends while it is there.
**Whether it holds is derived**: the rope's strength, less its knot's cost,
against the climber's weight and load. Every use chafes it at the lip; a look
shows it fraying before it parts. A rope that parts, or a knot that spills, is
a fall: the shipped `drop`.

### The belay
`belay <person>` holds a partner's rope with turns round a post or your own
body. While held, a fall on that rope is caught: the climber hangs and is not
dropped. Holding enough turns is what makes one person able to hold another
(the capstan effect), and is told in words. The belayer is engaged for the
climb and cannot do anything else.

### Rot and tar
Untarred natural-fiber rope that stays wet loses strength over days. A rope
dipped in pitch is tarred: it does not rot, and it is heavier and darker. Sea
rope is tarred and dry rope is not.

### Hemp
A farm crop, sown, retted and scutched exactly like flax, giving hemp line and
tow. Hemp is the strong rope fiber; flax makes a weaker, finer cord. ⭐ It is
one plant with a fiber variety, so that the smoking build's cannabis is its
second variety (lens 2).

### The rogue's yarn
Whoever twists a rope may lay a colored yarn into its heart: a mark chosen by
the ropewalk or by whoever ordered the rope. It is inside, so an ordinary look
does not show it; cutting the rope or looking closely does. ⭐ It survives
cutting and splicing: every length cut from a marked coil carries the mark, and
a splice shows both. It is provenance carried by the thing itself, beside the
hallmark and the mason's mark. What anyone does with it (proving a theft) is
the polity's, not this build's.

### Ropework
A new Discipline for laying rope and tying knots. Ships' seamanship builds on it
later.

### The ropewalk
A long, narrow building on Wharfside's west bank, about 300 m, with its keeper.
It stocks hemp line and spun yarn; it sells rope by the meter and buys back sound
rope. The dive shop's lifelines and the quay's heaving line are its rope.

## Lens pass

1. **Pedagogy (ropework):** strength goes with the square of the thickness; a
   knot costs half and a splice a tenth; the alternating twist; friction round
   a post multiplies your hold (the belay); wet fiber rots and tar stops it. All
   derivable and all readable from the rope.
2. **Creative expression:** an author draws a drop and puts a post at its lip,
   and the rope does the rest. A new use of rope is where an author ties it.
3. **Immersion and participation:** the long walk, the fraying lip; ⭐ the
   belay, your life in a partner's hands, cooperation nothing else in the game
   has. The ropemaker is a hole in the economy shaped like a person.
4. **Values:** none forced in this build. Binding a person, the gallows and
   hemp's drug variety are routed out (see Non-goals).
5. **Continuity:** fiber → wire → nylon answer the same commands; the limits
   move. Only the fiber rung ships.
6. **Economy:** the ropewalk is capital measured in length; rope is consumed
   by chafe and rot, so it is bought again; hemp gives farming a new crop with
   a buyer. Demand was there first (the diver, the quay, the river, the shaft).
7. **Governance:** the rogue's yarn makes a stolen rope provable from the rope
   itself; who acts on that is the polity's. Rated rope and liability are
   routed out.
   ⚠ Gap: a rope that parts under someone has no one to answer for it yet.

## The drive

A fresh character, plus a second character for steps 15–16.

1. Walk to the Wharfside west bank. `look`: a long, narrow ropewalk, its
   length in words; the ropekeeper.
2. Buy hemp line from the ropekeeper. `spin` it into yarn, several yarns.
3. `twist` a few yarns: they become a strand. `look strand`.
4. `twist` the strands: they become rope. `look rope`: its fiber, its length,
   how thick it is, and its strength in words.
5. `twist` a rope from more yarns: it reads as thicker and stronger.
6. Try to lay a rope longer than the walk: refused, and the refusal says why
   (the walk's length).
7. `cut rope 10 m`: two ropes, 10 m and the rest. `coil` one.
   7a. `twist` a rope with a red rogue's yarn. An ordinary `look` does not show
   it; a close look does. Cut a length from it: the cut length shows the red
   yarn too.
8. Tar one: `dip rope in pitch` at a pitch pot. It reads as tarred.
9. Go to the Sunken Delve's pit. `tie rope to <post> with bowline`. `look`:
   the rope hangs down the drop.
10. `climb` down and `climb` back up on the rope. `look rope`: chafed at the
    lip.
11. Climb it repeatedly until it frays visibly; it frays before it parts.
12. `untie` and retie it with a reef knot. Climb loaded: the knot spills and you
    fall (the drop's wound).
13. `splice` two lengths together: one longer rope, nearly as strong.
14. Leave an untarred rope and a tarred rope wet for several days (the clock):
    the untarred one reads weaker, the tarred one not.
15. Second character ties a bowline, first character `belay`s them, and the
    rope is set to part (a worn rope). The climber falls and is caught, not
    dropped.
16. The same fall with no belay: dropped.
17. Sell sound rope back to the ropekeeper. At the dive shop, its lifeline
    reads as rope (its fiber, its length). On the quay, so does the heaving
    line, and at Rejection's put-in so does a painter. Line a boat along the
    bank with that painter: it still works.
18. On a farm, sow hemp; jump the season; harvest, ret and `scutch` it: hemp
    line, which spins and twists like the bought line.
19. Check the ropework Discipline (`transcript` or the competence read): it
    has moved; a practised knot reads tighter than the first one tied.

## Acceptance criteria

1. A person can make rope at the ropewalk from bought hemp line, and from hemp
   they grew.
2. A rope reads its fiber, length and strength in words, and a thicker rope
   reads stronger.
3. No rope is longer than the walk it was laid on, and trying says why.
4. A rope can be cut to a length, coiled, spliced, tied and untied.
5. Each of the five knots behaves as its row says; the reef knot spills under
   uneven load.
6. A rope tied at the top of a drop makes it climbable both ways; it chafes
   with use and frays visibly before it parts; a parted rope or spilled knot
   drops the climber.
7. A belayed climber whose rope fails is caught; an unbelayed one falls.
8. Wet untarred rope weakens over days; tarred rope does not.
9. The diving lifeline, the quay's heaving line and the river's painter are
   rope, and their shipped acts still work (throwing, pulling, tugging,
   lashing, lining a boat, a rescue from the bank); the air hose is still a
   hose.
10. A rope twisted with a rogue's yarn shows it to a close look or a cut and
    not to an ordinary look, and every length cut or spliced from it still
    carries it.
11. Ropework competence moves with the work, and a practised hand's knots hold
    more than a green hand's, every time.

## Cross-references

- [cordage-slate](../slates/builds/cordage-slate.md) (seed)
- [textiles.md](../subsystems/textiles.md) (flax, `spin`, `scutch`) ·
  [assembly.md](../subsystems/assembly.md) (joints) ·
  [underwater.md](../subsystems/underwater.md) (the lifeline) ·
  [hazard.md](../subsystems/hazard.md) (`drop`) ·
  [exertion.md](../subsystems/exertion.md) and
  [locomotion.md](../subsystems/locomotion.md) (the climb) ·
  [boundary.md](../subsystems/boundary.md) (fixtures) ·
  [smallholding.md](../subsystems/smallholding.md) (crops)
- [river.md](../subsystems/river.md) (the painter, lining, the rescue line,
  the cable ferry) · [smoking-slate](../slates/builds/smoking-slate.md)
  (cannabis, hemp's second variety)
