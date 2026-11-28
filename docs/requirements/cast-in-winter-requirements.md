# Cast in winter — requirements

**Kind:** feature
**Leads from:** kernel (the heat budget, bodies reconciled when watched, the
needs deliberation). The first consumer is the shipped cast: the Hearts Delight
dairy (Hesper Vane in the byre), the outdoor posts (quays, towpaths, the Hollow
Mere shore, the brickfield), and the market's standpipe and bread counter
acting as the commons. It ships in this build.

The world's cast was dying of the cold, and of thirst on a slower clock. The
soak lane found the Delight's dairywoman dead in her byre within a game day.
Every Cast is authored the same way, so all of them were on the same path. A
rule now spares them (backstops-owed-slate § 1) and it is silent when it
fires. This build makes the cast live honestly, then removes the rule.

The survey found the failure in three layers, and this build fixes all three:

1. **The physics.** A body's core is a comfort band, not a heat budget. Work
   heat doesn't count while you're losing, and bodies don't warm rooms. A byre
   holding six cows has the same air temperature as the yard outside it.
2. **What the world supplies.** Thin clothes (the arms can't be covered), two
   lit fires among about 36 outdoor posts, nobody drinking, and no warm place to
   go.
3. **The cast's acts.** Nothing dresses for the weather, drinks, goes to the
   fire or goes home.

The other lever is where fidelity is spent. Compute, memory and author effort
are all scarce, and a body nobody is watching doesn't need to be simulated
minute by minute. It needs to come out right when somebody looks.

**Seeding slate:** [backstops-owed-slate](../slates/engine/backstops-owed-slate.md)
§ 1 (the cast dying), § 2 (the clothing insulation number), § 4 (a newcomer's
first winter). The reuse ledger is at the end of that slate.

## What already exists

- **Heat and clothing.** The thermal subsystem (Newton cooling for things, a
  comfort band for bodies), clothing insulation derived from fiber, mass and
  loft, wind chill, the wet body and wet cloth, and the room envelope (walls,
  openings, sun, neighbors, fires, stores). Shipped garments run from linen
  student clothes (0.41 clo for the outfit) to a wool greatcoat. The jumper,
  hood and work gloves exist, and no Cast wears them. There's no scarf, socks
  or cap. The arms have no covering at all.
- **Heaters and fire.** The hearth, stove, brazier and campfire. The `stokes`
  behavior keeps a fire lit, and two Cast use it (the smith, the potter). The
  shop hearths ship unlit.
- **Food and water.** The market's **standpipe** (a tap on the city main),
  its **bread counter** and **fountain**, and the bar's free water and the
  lounge's free pizza (the backstop for players). The `eats` behavior has two
  users. No NPC drinks.
- **The cast's day.** The employment roster puts hands on shift at their
  station and takes them off. In 79 of 89 houses an off-shift hand stays put;
  in 10 it leaves the world. No Cast has a home or a bed.
- **Deliberation.** Every NPC has one deliberation beat that picks among
  candidate tasks by urgency (behavior.md).
- **Reconcile on read** is the platform's normal shape for slow change:
  growth, wounds, spoilage, soil. Bodies are the exception. They integrate
  continuously, and a body nobody owns simply skips a gap longer than four
  hours.
- **The player's side.** Players can save and wear named outfits. A new player
  starts in the student outfit in the lounge, and a greatcoat waits in the
  Duncan Hall dorm footlocker.
- **Overlapping slates:** sleep-slate (rest, beds, logout as sleep),
  household-lifecycle-slate (households and homes), unobserved-economy-slate
  (NPC trade while nobody watches), climate-slate (the warming house, winter
  as co-presence), thermal-slate (insulation; its "dress the cast" note is
  stale), textiles-slate (wool and knitting), absent-body-slate (a logged-out
  body).
- **In flight:** build-1's tropes build gives every behavior turn an act
  identity. The needs deliberation has to speak it. build-4's `house-needs` is
  market demand only, and doesn't overlap.

**Therefore what is genuinely new here is:**
- a body that keeps an honest heat budget;
- a body that is simulated while watched and reconciled with the same physics
  when it isn't;
- needs (cold, thirst, hunger) as candidates in the deliberation that already
  exists, answered by going where the thing is supplied;
- supply declared by places and houses, with the town's commons as the fallback;
- a presence choice per NPC (live, watched, out of the story off shift, or a
  role whose body is fresh each shift), defaulted by the NPC's rung;
- the missing garments and coverage.

## Goals

- A Cast posted anywhere in the shipped world lives through a winter week with
  nobody watching, because the world supplies what it needs and it acts to use
  it, not because a rule spares it.
- A body's warmth is an honest heat budget. Working warms you, resting doesn't,
  clothes and shelter decide the rest, and people and animals warm the room they
  share. The cold bench reproduces published figures for how much clothing a
  person needs at a given temperature and activity.
- Fidelity follows attention. A body in a room nobody is in costs nothing, and
  when someone arrives it is exactly where honest physics puts it: fed or
  hungry, warm or cold, alive or dead.
- An author's ordinary case is a Cast with a post. What it wears comes from its
  role; where it warms itself, drinks and eats comes from its house, its kind of
  place, or the town's commons. No behavior is written per Cast.
- Clothing covers the whole body. A sleeved garment covers the arms, and the
  catalogue has the winter pieces a 1900 town would have.
- A newcomer's first winter teaches layering. The cold is honest, a coat is on
  offer where they wake, and the cast are the example.
- The rule that spares the world's cast is gone. A Cast that dies of neglect
  dies where someone can find it, and the death is reported somewhere a person
  reads.

## Non-goals

- **Homes and beds for every Cast, and sleep** → sleep-slate and
  household-lifecycle-slate. This build gives a home only to a Cast whose author
  writes one. The default off shift is out of the story.
- **Retiring the student costume parent and building the agent taxonomy** →
  the agents pass of the template taxonomy refactor, which follows this build
  and uses its outfit needs as evidence.
- **NPC trade and production while nobody watches** → unobserved-economy-slate.
  Reconcile debits what a body consumed. It doesn't run the body's work.
- **A logged-out player's body** → absent-body-slate. Players are unchanged,
  and they are never in null. A signed-out body is saved and destructed, then
  materialized at login, and its away-time guard stays. A dropped connection
  leaves the body standing linkdead where it was. The timeless rule touches
  neither.
- **Unowned animals' needs** (a stray that forages and drinks) → the
  husbandry and vocations slates. Removing the rule un-spares them too, and
  the owner decided (2026-11-28) to let them die: honestly, where they stand,
  reported like a Cast.
- **The harm energy scale, the quern share, the condenser, restamp failure, and
  room-versus-thing name ties** → stay in backstops-owed-slate §§ 3, 5–8.
- **Seasonal routines beyond clothing** (holidays, a winter trade calendar) →
  nowhere, deliberately.

## Placement

- **Kernel:** the heat budget, bodies watched or reconciled, needs in the
  deliberation, presence choices, and how supply is declared and found. They're
  cross-cutting: they'd make sense if no trade existed.
- **The platform pack:** the commons role (a town's public water, food and
  warmth), plus the defaults and the cold bench's calibration settings.
- **Generic objects:** the new garments and sleeved coverage.
- **Venue packs** (Hearts Delight, Terminus, Hollow Mere, Rejection,
  Hearthworks…): supply declared on their houses and places, and the warming
  places their outdoor posts need.
- ⭐ **A second instance needs no code.** A second dairy declares its fire,
  trough and coat pegs, or inherits them from the dairy's kind of place.

## Collisions

- **The lounge and Dave's Bar.** The backstop for players stays as it is. Dave
  "never goes home": the lounge cast are authored live and always present, and
  their author's choice stands. The bar's free water also counts as a commons
  supply for anyone there.
- **The Hearts Delight dairy.** The byre warms with its cattle, Hesper Vane and
  the dairy lad dress from the dairy's pegs, and the creamery hearth is their
  fire.
- **Every outdoor post** (quays, towpaths, the cane-piece, the Hollow Mere
  shore at −12 K, the brickfield, the necropolis, the market square) needs a
  warming place within reach. Some exist (the cookhouse, the bathhouse, the
  infirmary brazier), and the rest are authored in this build.
- **The market square.** The standpipe and bread counter become the commons
  for water and food, so the cast and players meet there. Bread costs money,
  and Cast are paid wages.
- **Employment.** The 79 houses whose off-shift hands stay put take the new
  default, which is to leave the story off shift. A house that wants its hands
  present at night says so.
- **The shop hearths.** A hand on shift lights and feeds the fire where the
  post has one. Fuel comes from the house's stock, and when it runs out the room
  goes cold and the hand goes to the commons.
- **The tropes build.** Its act identity rides every behavior turn, including
  the needs turns.
- **The soak drives.** Their characters still `dress()` before outdoor work, as
  a sensible person does. They also get a check that the cast survive.
- **The dorm footlocker's greatcoat** stays, as the newcomer's offer.

## Surface decisions

### The heat budget is honest physics (owner, 2026-11-28)
A body produces heat by what it's doing (resting, walking, hauling), loses it
through its clothes, wind and wetness, and shivers to make more at a real cost.
People and animals add their heat to the room they're in, so a byre of cattle,
a crowded bar or a full dormitory is warmer than an empty one. **The test is
published figures:** the clothing a resting and a working person needs to hold
their core at a given air temperature. The 0.5 trapped-air number gets the same
test, and it stays only if it's what reproduces them.

### Four presence routes, defaulted by rung (owner, 2026-11-28)
An author picks, per NPC or by kind:
- **Live:** always simulated.
- **Watched:** simulated while anyone is in the room, reconciled with the same
  physics when someone arrives.
- **Out of the story off shift:** gone, and frozen, while not working.
- **A role:** a fresh body each shift; the role continues, the body doesn't.

Defaults: **a Cast is watched on shift and out of the story off shift** (unless
its author gives it a home, and then it walks there); **an Extra is a role**.
Fidelity, and its compute cost, then grows with the players actually in the
world, not with the content. A world with no players mostly idles and is still
honest the moment anyone looks.

### Out of the story is out of time (owner, 2026-11-28)
Null, the environment of anything that has left the fiction, is **timeless**.
A thing in null, and everything it holds, has no clock while it's there:
- it doesn't get cold or hungry;
- it doesn't heal, age, grow, mature or spoil.

When it comes back it resumes exactly as it left. This is one rule for the
whole held subtree, not a choice each subsystem makes. It follows the 11-23
ruling: *"outside the narrative is just null, you're nowhere"*, and nowhere
has no weather, no night and no hunger.

Today it holds only by accident. A body in null reads the air as body
temperature, and an unowned body skips long gaps, a skip this build removes.
Meanwhile a carried pail of milk sours in null because spoilage runs on the
clock wherever the thing is. Without this rule, a Cast coming back on shift
would be billed for a night it spent nowhere.

What it does and doesn't cover:
- **A room nobody is in is not null.** An unwatched body is in the story:
  time passes there and is reconciled when someone looks. Only out of the
  story stops time. The two must never be treated as the same.
- **Records keep running.** Wages, contracts, deadlines, hires and reputation
  are not things in null, so they run on social time. A deadline that lapses
  while a hand is off shift lapsed honestly.
- **Places keep running.** A business's production, a maturing cask and a
  field are in places, so time passes for them. So does anything unloaded
  from memory: it is still in its place, and it catches up when loaded.
- **Leaving the story ends what you were doing.** An act in progress ends
  with a reason when the actor leaves. It isn't carried frozen into null.
- **The house's kit goes back on the peg first.** Dressing from supply runs
  both ways, so the next shift, or a fresh-bodied Extra, finds the pegs full.
- **Goods carried out of the story wait with their carrier.** A haulier who
  goes off shift mid-round resumes the round, cargo unchanged.

### Reconcile tells the truth, including death
A watched body coming back into view is exactly where the physics puts it. It
has consumed what it would have consumed: the fuel is lower, the water drawn,
the bread bought. If its post couldn't keep it alive, it's found dead there,
and the world reports the death somewhere a person reads. Reconcile never
rounds an outcome toward survival.

### Needs are one deliberation, not a behavior each (owner, 2026-11-28)
Cold, thirst and hunger are candidates in the deliberation every NPC already
has, weighed by urgency against its work. One act answers each: go where it's
supplied, use it, come back. There's no per-need behavior and no per-Cast
agenda.

### Supply is declared by places, with the commons as fallback
A house or a place says what it supplies: a fire, water, a meal, a warming
room, a peg of outdoor clothes. A kind of place carries it for every instance.
A Cast whose house declares nothing uses the town's commons: the standpipe for
water, the market for food, a public warm room. That's true to the period, and
it puts the cast where players are.

### Dressing for the weather is dressing from a supply
A Cast's base clothes come from its role. Weather layers (the coat, hood,
gloves, oilskins) hang where its post supplies them, and the Cast puts them on
when the weather calls for them and takes them off when it doesn't. That also
answers summer: nobody spends July in a greatcoat. The kit belongs to the house.

### Clothing covers the arms, and the catalogue grows
A sleeved garment covers the arms (they're 15% of the skin). New garments: a
wool cap, a scarf, wool socks, mittens, an oilskin, and a sleeved shirt and
jacket for the trades. Each is an honest material row.

### A newcomer's winter is a lesson, not a protection (lens 1, soft limits)
The cold is the same physics for everyone. The new player starts as they do
now, a coat is on offer where they wake, the shiver cue says what is happening,
and the cast are visibly dressed for it. Nothing exempts a newcomer.

### The backstop comes out in this build
It goes once the blocking drive shows a staged winter night with every outdoor
Cast holding its core. After that, a Cast that dies of neglect stays dead and
is reported, and that is how the next gap in supply gets found.

## Lens pass

1. **Pedagogy.** Thermoregulation, layering, wind and wet, and why a byre is
   warm are all derivable from the world, and the cast model them. The
   disciplines touched are survival and textiles' fit and fiber.
2. **Creative expression.** The ordinary case is a Cast with a post and no code.
   The bespoke case (a home, a routine, a live-always character) is an author's
   choice with nothing broken.
3. **Immersion and participation.** A cast that dies silently and a cast that
   can't die were both broken fictions. Now a death is found and reported.
   Reconcile must never contradict what a player saw; that is the review test.
   The polity can make the commons warmer, or let it go cold.
4. **Values.** Who gets a warm room is a house's choice, and a cold house is
   visible. The engine holds no opinion, and the soft limit is the cast going
   to the commons.
5. **Continuity.** Supply by place survives the epoch: the pump becomes a tap,
   the hearth a radiator, the oilskin a parka, and the declaration doesn't
   change.
6. **Economy.** The cast's coats, fuel, water and bread are demand that exists
   before a trade ships to meet it. The house pays for kit and fuel, and wages
   pay for bread. ⚠ Gap: a body out of the story consumes nothing off shift.
   That's accepted, and it's the unobserved economy slate's question.
7. **Governance.** Nothing here judges a person.

## The drive

Each step's tags give its pace (`instant`, `short`, `staged`, `span`) and how
its assertion is made (`player`: player verbs only; `staged`: wizard setup is
fine). "Winter night" means a staged January night with the realm's weather
pinned at its coldest clear dawn (about 268 K at Terminus).

### Blocking drive

1. **A byre is warm** `staged` · `staged`. Pin a winter night. Read the air in
   the Hearts Delight dairy yard, then in the byre with the cattle in it. The
   byre is measurably warmer. Move the cattle out, and the byre falls toward
   the yard.
2. **Work warms, rest doesn't** `short` · `staged`. In the cold yard in the
   student outfit, a body hauling holds its core longer than the same body
   standing idle.
3. **The cast dress for it** `short` · `player`. On a winter morning the
   dairywoman comes on shift and takes the dairy's outdoor layers before
   working the yard. `look` at her shows them.
4. **Too cold, she goes to the fire** `short` · `player`. Through the night
   shift, the outdoor hand at a quay leaves for its warming place when chilled,
   and returns to work. A player watching sees both moves.
5. **The cast drink and eat** `short` · `player`. Within a game day, a Cast
   whose house declares water drinks there. A Cast whose house declares nothing
   is seen at the market standpipe and the bread counter.
6. **A fire is kept** `short` · `player`. A shop's hand lights and feeds the
   post's hearth on shift, and the room warms. Empty the house's fuel, and the
   room cools and the hand goes to the commons.
7. **Off shift, out of the story** `short` · `player`. At shift end the hand
   leaves, with a line a watching player sees, and comes back at shift start in
   the state honest physics gives a frozen body.
7a. **Nowhere is timeless** `short` · `player`. A hand goes off shift at dusk
    carrying fresh milk, its kit back on the peg. At dawn it returns no
    hungrier, colder or more tired than it left, and the milk is exactly as
    fresh. A hand mid-act at shift end stops with a line saying why.
8. **Nobody watching** `short` · `staged`. A player leaves the Delight for six
   game hours of winter and comes back. Every Cast there is alive and where its
   work and needs put it. The house's fuel is lower and its water drawn, by
   amounts consistent with the hours.
9. **A post that can't keep you** `staged` · `staged`. A test Cast posted
   outdoors with no supply and no warm place, unwatched through a winter night.
   On return it's dead there, and the death is reported. No rule spares it.
10. **Sleeves count** `instant` · `player`. Put on a sleeved wool jumper. The
    body's insulation reading rises by the arms' share, which it didn't before.
11. **Summer sheds** `staged` · `staged`. Pin a hot summer noon. The cast take
    off their weather layers and nobody overheats.
12. **A newcomer's first winter** `short` · `player`. Make a new character,
    walk from the lounge to the dorm on a winter night, and see the shiver cue.
    Take the footlocker greatcoat, and outdoors the core holds.
13. **The calibration** `instant` · `staged`. The cold bench's table (clothing
    needed against temperature, resting and working) matches the published
    figures within the stated tolerance.
14. **Restart** `short` · `staged`. Restart the world during a winter shift.
    Worn layers, the pegs' remaining kit, the room temperatures and each Cast's
    body state read back: nothing doubled, nothing lost, nobody woken in the
    lounge.
15. **Light** `instant` · `player`. Every warming place authored in this build
    is visited at night and can be seen in.

### Soak drive

16. **A winter week, no players** `span`. Run the realm through seven game days
    of winter with nobody logged in. Every shipped Cast is alive at the end, and
    the houses' fuel and water show plausible use.
17. **Winter into spring** `span`. Over the turn of the season, the cast's
    weather layers come off day by day as it warms, with no hyperthermia.
18. **A month of neglect is visible** `span`. A fixture house that never
    restocks fuel: its hands move to the commons when the fire dies, and none of
    them dies unreported.

## Acceptance criteria

- A winter week with no players ends with every shipped Cast alive. The rule
  that spared them no longer exists.
- In a cold room with animals or people in it, the air is measurably warmer
  than the same room empty.
- Clothing needs at a given temperature and activity match published figures,
  for both a resting and a working person.
- A sleeved garment changes a body's insulation reading; before this build it
  couldn't.
- A player watching an outdoor post on a winter night sees the hand go to warm
  itself and come back, and sees a Cast drink and eat within a game day.
- A player who comes back to a place after hours away finds its cast exactly
  where honest physics puts them, and the house's supplies used to match.
- A Cast posted where nothing can keep it alive is found dead there, and the
  death appears somewhere a person reads.
- On a hot day no Cast wears its winter layers.
- A Cast coming back from off shift is no hungrier, colder or older than when
  it left, and nothing it carried has aged. The house's pegs are full for the
  next shift.
- A Cast in an empty room is in the story: time passes for it. A Cast out of
  the story has no time pass. A player can tell the two apart, because only
  the first can be found.
- A new character can walk out into the first winter, feel it, and fix it with
  the coat offered where they wake.
- An author can add a second dairy, quay or shop whose cast survive winter
  without writing a behavior or any code: by declaring supply, or by inheriting
  it from the kind of place.

## Cross-references

- Seeding: [backstops-owed-slate](../slates/engine/backstops-owed-slate.md)
  §§ 1, 2, 4 (and its reuse ledger).
- Subsystems: [thermal.md](../subsystems/thermal.md),
  [textiles.md](../subsystems/textiles.md),
  [vitals.md](../subsystems/vitals.md),
  [metabolism.md](../subsystems/metabolism.md),
  [behavior.md](../subsystems/behavior.md),
  [employment.md](../subsystems/employment.md),
  [exertion.md](../subsystems/exertion.md),
  [construction.md](../subsystems/construction.md),
  [weather.md](../subsystems/weather.md),
  [mortality.md](../subsystems/mortality.md),
  [identity.md](../subsystems/identity.md) (Cast and Extra),
  [residency.md](../subsystems/residency.md).
- Related slates: sleep-slate, household-lifecycle-slate,
  unobserved-economy-slate, climate-slate, thermal-slate, textiles-slate,
  absent-body-slate, row-composition-slate (the agents pass).
- In flight: tropes (build-1), whose act identity rides the needs turns.
