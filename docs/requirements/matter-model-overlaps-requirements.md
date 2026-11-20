# Matter-model overlaps — requirements

**Kind:** refactor/sweep, with behavior changes players will see
**Leads from:** the kernel. The first consumers are all shipped content: the
sugar house and the maple sugarbush, the estuary salt pan, the Crowsfoot
casks, the Hearts Delight creamery and potter's shop, the Wharfside
chandlery hopper, and the boats and ships.

The engine answers seven questions about matter twice or more. In each
case, two models that are both partly right disagree about what players
can see. A cask with a sprung stave keeps what it already holds. Molasses with nothing under the loaf
vanishes. A glazed pot gets as wet in the rain as terracotta. Whiskey is
credited to the cooper who made the cask. Maple sugar never sets. Nothing
in the game ever stoves a hole in a boat. This build picks the model that
holds the truth for each question and moves the other behaviors onto it,
so that each question has one answer.

The questions fall into three families:
- **a vessel and its liquid:** does it hold (#2), where does what escapes go
  (#3), what does the wall give (#4), whose grade is it (#7);
- **what leaves a solution:** as a crystal (#1) or as a vapor (#5);
- **water in a body:** on the surface and held inside (#6).

Seeding slate: [matter-model-overlaps-slate](../slates/tech-debt/matter-model-overlaps-slate.md).
Its *Reuse ledger for the plan* names the code for every row below.

## What already exists

The survey on 2026-11-20 checked every overlap against master.

- **Holding liquid.** There are seven ways today to answer whether
  something holds a liquid:
  - a porous wall weeps (a crock, the water filter, the weeping jar that
    cools);
  - a cask leaks at a slack joint, as a yes or no, and a dried-out cask
    leaks a refill onto the floor;
  - a pipe run bursts when frost gets into it;
  - a plain container counts as open if its material absorbs water;
  - a boat leaks by holes plus a seep;
  - a ship leaks by worn seams plus a "holed" flag;
  - a vessel that breaks spills everything.

  Players `bail` and `pump`, read `measure bilge`, rivet a crack, and
  `repair` or caulk a hull.
- **Drips.** A filter, a curing cone, a cheese hoop, a potash hopper and a
  salt-pan mould each find their own receiver. They search in three
  different orders and have four different fallbacks: the item's own wet
  surface, nothing, the drip runs away, or the liquor stays. None of them
  falls back to the floor.
- **What a wall gives its contents.**
  - An unglazed crock remembers what it held and gives it back. It never
    forgets and washing doesn't clear it. Oak can't remember at all.
  - A new oak cask gives vanilla and oak, and gives a third less at each
    fill. A charred cask gives more, and re-firing restores it. `look`
    describes this.
  - Lead glaze leaches into acid contents without any sense noticing.
- **Grade and maker.** Pouring a batch into an empty vessel writes the
  batch's grade and maker onto the vessel. Topping up takes the lower
  grade. This causes several problems:
  - a cask's whiskey is credited to the cooper;
  - the potter loses the right to name their own jug;
  - `analyze condition` reports the batch's grade as if it were the
    vessel's workmanship;
  - the sugar copper's temper and skim grade the pan, not the liquor;
  - a poor mould can't lower a cast.
- **Crystallizing.** Salt in a pan grows crystals as the air dries the
  brine, rain sets it back, and bittern is what's left. Alum and saltpeter
  liquors crystallize on cooling, but no shipped producer makes those
  liquors.
- **Sugar.** Sugar boils through named stages: syrup, then strike, then
  caramel, then burnt. The boiling point rises as it goes, which the thread
  test and the thermometer show. The strike sets in a cone over four days
  and drains molasses one grade band down. Re-boiled molasses strikes again,
  darker each time, until it is blackstrap. Claying whitens the head of a
  loaf. A maple strike never sets. Nothing seeds a crystal or stirs it.
- **Vapor.**
  - A retort with no condenser fouls the room's air, and `analyze
    atmosphere` shows it; with a condenser, the condenser catches the tar.
  - Naphtha or turpentine poured into an open vessel fouls the air.
  - The steam from any boil goes nowhere.
  - Salt thrown into a hot kiln vaporizes into the chamber, the vapor
    vanishes when the fire goes out, and no pottery row uses salt glazing.
  - Smell never reads what is in the air.
- **Water in a body.** Rain wets everything in a room equally, glazed or
  not, at any exposure. Separately, rain raises the held moisture of a
  brick, a board or a ham by exposure. Nothing moves surface water into a
  body. A fire treats a soaked board as hard to light because it adds the
  two waters together.
- **Builds in flight** (test-world lifecycle, tooltips, listing
  resolution, soak repair) don't touch any of this.
- **Related slates:**
  - sugar §§ strike, cone and percolation;
  - assembly § 13 coopering;
  - ships-and-harbors § caulking;
  - libations (stale: says imparts don't deplete);
  - navigable-water § the cooper's attributable failure;
  - vocabularies-to-rows (smell);
  - pottery (salt-glaze fumes).

**Therefore what is genuinely new here is:**
- holding contents leak away over time, not only when poured in;
- a puddle where a drip has nowhere to go;
- crystals that wait for a seed, a stir or a deep enough chill;
- a vapor's route from the vessel's head out through the flue;
- smell reading the air;
- a wall that can be washed clean of what it remembers.

Every other change is one model taking over a behavior another model
already produces.

## Goals

- **One leak.** Whether a vessel holds liquid, and how fast it loses it,
  comes from one read that adds three paths: its pores (body and coat), its
  flaws (cracks, holes) and its joints (staves, seams). A cask with a
  sprung stave leaks what it holds, and `fit` mends it one stave at a
  time, as the assembly model already says. A crack in glazed stoneware leaks through the crack, not at the
  rate of its pores. A leaking vessel loses what it already holds, not only
  what is poured into it.
- **A hole is a flaw.** A boat or ship that strikes a snag is holed by a
  flaw, `repair` patches it, and the refusal that says "until she is
  patched" becomes true.
- **One drip.** Anything that drips or drains runs into what it sits
  **in**, else what it sits **on**, else the **floor**, where it pools.
  Nothing a player made vanishes.
- **One exchange through the wall.** What a vessel gives its contents comes
  from two sources through one exchange:
  - **the wall's own material:** authored, and spent a share at each fill;
  - **what the wall has absorbed:** learned from past contents, and given
    back until it's gone.

  An oak cask remembers, so a cask that held whiskey and is then filled
  with something else carries the whiskey into it. Washing reduces what a
  wall remembers. A pitched ale cask gives nothing because its coat seals
  it. Lead's leach travels the same way.
- **The batch's identity is the contents'.** A batch's grade, maker and
  recipe travel with the liquid. A vessel keeps its own grade and maker,
  which are its workmanship. A vessel's grade affects the product only when
  the vessel gives it its shape, so a poor mould lowers a cast and a poor
  bottle does not spoil the wine. Temper and skim grade the liquor.
- **Graining is crystallization.** Sugar has a solubility. A strike sets
  as crystal plus mother liquor, and molasses is the liquor left over. Maple
  sugar sets.
- **Supersaturation waits.** A solution past its saturation line can hold
  until a seed crystal is dropped in, it is stirred, or it is cooled far
  enough. This applies to salt, alum, saltpeter and sugar alike, and it
  uses the existing verbs.
- **One vaporization.** A boiling liquid and a vaporizing solid are the
  same phase change, with a rate and a vapor. Every vapor takes the same
  route: the vessel's head (a condenser), then the chamber (a kiln), then
  the room's air, then out the flue. Boiling steam goes into the air.
  Salt glazing is salt vapor laid onto a pot's face from the chamber's air.
- **Smell reads the air.** Anything in a room's air is a source a nose can
  read: a fouled retort, a vat of naphtha, the steam off a copper, a kiln
  being salted.
- **One water for porous bodies.** Rain lands in proportion to exposure. A
  face that holds water sheds most of it. A porous body soaks surface water
  into held moisture at its own rate, up to what it can absorb, and the
  rest stays on the surface or runs off.
- **The docs say what is true.** The maturation doc's "imparts don't
  deplete" and the libations slate's copy of it are corrected. Each
  subsystem these questions touch states the one model.

## Non-goals

- **Retail pricing by grade.** Once the grade travels with the contents, a
  fine batch and a poor one still sell for the same price. That goes to
  [retail-slate](../slates/trades/retail-slate.md) as a one-line finding, for its next
  build.
- **New trades, places or verbs.** Seeding is `put`, stirring is `stir`,
  patching is `repair`. A dedicated verb for one of these goes nowhere,
  deliberately; the command definition already predicts the act.
- **Salt-glaze fumes as a harm** (the pottery slate's chlorine). The vapor
  reaches the air and the nose in this build. Whether it injures a body
  is the pottery slate's.
- **Construction's wall layers holding water.** No code for it exists yet.
  This build gives construction the one porous-body flow to build on, and
  the question stays on the construction slate.
- **The sugar slate's cane inversion beyond its grade loss.** It stays on
  the sugar slate.
- **Soil water.** Soil keeps its own ledger in litres. Stays as is,
  deliberately: soil is not a vessel or a body.

## Placement

- **Kernel.** All seven questions are physics that every pack's content
  sits on. None makes sense as belonging to one trade, and each has
  consumers in three or more packs. That passes review question R3: this
  is a cross-cutting build, which is why it is its own build.
- **The packs change only rows.**
  - Sugar and maple get solubility curves, and the strike's drain row
    retires.
  - Oak gets absorbency.
  - The pottery gets one salt-glazed stoneware row and the potter's
    knowledge of it.
  - The transport pack's snag writes a flaw.
- **The test.** A second sugar, a second salt or a second cask needs no
  pack code, only a solubility curve or a material tag on a row.

## Collisions

- **Terminus goods yards, the sugar house's boiling floor.** The coppers,
  the curing pots and the boiler NPC all live here. The NPC's boiling brain
  must still finish a strike; under the new model, seeding is part of its
  job.
- **Rejection, the Hanging Wood sugarbush.** Maple's strike finally sets
  here.
- **The estuary mouth's salt pan, and the circle's brine pan.** Salt
  crystallizes as it does today, plus the nucleation hold. A pan exposed to
  air nucleates on its own as its edges dry, so salt makers notice no
  change while working. A pan's spent bittern with nothing under it runs
  onto the ground, where it used to stay in the pan.
- **Crowsfoot's casks.** Plain and charred. The distiller's cellar work is
  unchanged. A refilled cask now carries the last spirit's memory.
- **Hearts Delight.**
  - In the creamery, the butter crock (earthenware) remembers and can be
    washed. The cheese hoops drain whey to the floor when nothing is under
    them.
  - In the brickfield, the potter's shop is where salt glazing becomes
    real. The potter, who fires the updraft kiln, learns to salt it.
  - The weathering ground and its green bricks: green ware soaks rain in by
    exposure.
- **Wharfside chandlery, and the Rejection lean-to.** The ash lies in the
  hopper and its lye runs into the hopper itself, which players draw off
  with `pour`; that is unchanged. A wet heap of ash on bare floor pools
  its lye there instead of keeping it.
- **Ships and boats.**
  - The Rejection put-in's rowboat, the *Ostrander*'s boat and the
    *Hesper*'s dinghy are all holed by flaws now, as is the *Hesper*
    herself.
  - The harbors drive stages a hole directly; that staging now matches
    production.
- **Every crock, jug, bottle and cask a player made.** Its maker stops
  changing when it's filled.

## Surface decisions

### 1. Graining is crystallization (lens 1 decided)

Sugar crystallizes because it is past its solubility, the same as salt.
The boil concentrates the liquor, and on cooling below saturation the
excess sets as crystal while the rest remains as mother liquor. Molasses
is that liquor, not a separate swap. The stage names a player reads, syrup
and strike, stay as what the boil reaches, so the thread test still reads
them. Caramel and burnt sugar are chemistry, not solubility, and stay
transformations. Molasses re-strikes darker, and the grade loss of each
pass falls out of what is left, not out of a rule about bands.

### 2. Crystals wait to be started (lens 1 decided)

A supersaturated liquor holds until something nucleates it:
- a crystal of its own product put into it;
- stirring;
- cooling past a deeper line;
- in an open pan, its own drying edge.

The sugar boiler's skill is to strike at the right moment and seed. A
neglected strike sets as a coarse mass and grades lower. The verbs are
`put` and `stir`; no new verb is added.

### 3. One leak read: pores, flaws, joints (lens 1 decided)

The rate is a sum of the three paths.
- A hole is a flaw like a crack, with a larger rate. `repair` mends a hole
  and rivets mend a crack.
- A ship's seams are her joints. The caulking in them is what `maintain`
  restores, and the tarred coat outside protects them, as the ship model
  already has it.
- "Holds water" means the rate is under a line.
- Whether a pour into the vessel spills is decided by the same rate.
- A holding vessel loses its contents over time to wherever its drip goes
  (decision 4). A boat's or ship's leak runs the other way, into her bilge
  from outside, by the same read.

### 4. One drip: in, then on, then the floor (lens 1 decided)

Water runs down. A thing inside a vessel drips into that vessel. A thing
standing on a vessel drips into it. Otherwise it drips onto the floor,
where it pools as the floor's puddle (the same puddle a spilled pour
already makes). Mould drainings keep their one-band grade loss, because
that is the drainings' own chemistry.

### 5. One wall exchange, two sources (lens 1 decided)

- **The wall's own material.** Oak gives vanilla and oak tannin. Char
  gives more. Each fill spends a share, and re-firing restores it.
- **What the wall has absorbed.** A porous wall (earthenware, unglazed
  oak) learns a share of what it holds and gives it back until that is
  gone.
- **Washing** spends what the wall has absorbed. It does not touch the
  wall's own material.
- **A sealing coat** (glaze, pitch) stops both sources and the lead leach
  is the coat's own.

The cask choice players make today is unchanged: plain or charred, the
same oak, two different whiskies.

### 6. One vaporization, one route (lens 1 decided)

A substance has a point at which it vaporizes, a rate and the vapor it
becomes. A boiling liquid and a vaporizing solid follow the same rule. The
vapor goes to the first receiver on its route:
1. the vessel's head, if it has a condenser;
2. the chamber, if it is in a fire's chamber;
3. the room's air;
4. out the flue, if the room has one.

A salt-glazed pot takes its coat from the chamber's air while the vapor is
there. When the fire goes out, the chamber's air goes up the flue, not
nowhere.

### 7. Smell reads the air (owner ruling, *one smell: source → air → nose*)

What is in a room's air is a smell source, at its strength. A nose reads it
the way it reads any other source. Pinned smell values re-baseline where
air contents now add to them.

### 8. One water flow for porous bodies (lens 1 decided)

Rain reaches a body in proportion to its exposure. A sheltered pot takes
none and a pot in the open takes all of it. A face that holds water sheds
most of what lands on it. A porous body takes surface water into held
moisture at its own rate, up to its capacity. Held moisture dries out
through the surface. Non-porous bodies keep surface water only. The fire's
"two waters" sum is unchanged.

### 9. The batch's identity travels with the contents (lens 1 decided)

The grade, maker and recipe of a batch live on the contents.
- Pouring them carries them, and a top-up takes the lower grade, as
  today.
- The vessel keeps its own making.
- A vessel that shapes what sets in it (a mould, a cone, a hoop) passes
  on the lower of its own grade and the batch's.
- Every other vessel passes nothing of itself.

Effects players will see:
- `analyze condition` on a filled cask reads the cask.
- Tasting the whiskey reads the distiller.
- `name` stays with the potter.
- Temper and skim grade the liquor in the copper.

### 10. Pricing by grade stays out (owner)

Recorded as a finding on the retail slate.

## Lens pass

- **1, pedagogy.** This is the build's reason to exist. Each merge makes
  the world teachable as the real science: saturation and
  supersaturation, nucleation, leakage as the sum of its paths, vapor
  routes, capillary absorption, and the difference between a batch and its
  container. The Disciplines exercised are the existing ones:
  sugar-boiling, salt-making, coopering, ceramics, distilling, seamanship,
  and the chemistry the readings report. Every new behavior can be worked
  out from the physics. Nothing is authored as an exception.
- **2, creative expression.**
  - The ordinary case needs no code: a new solution is a solubility curve,
    a new absorbent wall is a material tag, a new vapor is a row.
  - The bespoke case keeps its hooks: a vessel may still name what it
    absorbs.
  - Authors gain expressive range, because anything they author now
    inherits leaking, dripping, remembering and vaporizing, where before it
    inherited the one model it happened to sit on.
- **3a, immersion.** Several things today betray the fiction: a cracked
  cask that holds, molasses that vanishes, a glazed pot that soaks, a
  cooper credited with whiskey, a "patched" refusal that can never be
  patched. The build removes each one.
- **3b, participation.** Players gain things they can do: seed and strike,
  sell a spent bourbon cask as a flavor, salt-glaze, caulk a seam, bail a
  holed boat. The polity can do things we did not plan, such as a trade in
  used casks, which is the ex-bourbon market. No gap found.
- **4, values.** There are no choices here without a right answer, with
  one exception: whether a vessel's maker should share credit for a fine
  batch. Answered no. The vessel's grade enters only where it shapes the
  product (decision 9). That is a grain default, and an author can change
  it per vessel.
- **5, continuity.** Every capability survives the epoch, because a steel
  tank, a glass carboy and a ceramic crock answer the same leak, wall and
  grade reads. The test passes: the new object answers the same commands.
  Nobody is left holding an obsolete half.
- **6, economy.**
  - The build produces molasses that now exists when nothing catches it
    (it pools, and a player can recover it), used casks with value, and
    salt-glazed stoneware.
  - It consumes salt as a glaze, and a cask's character over refills.
  - The demand was there first: distillers already choose casks, and the
    potter already glazes.
  - Gap noted: grade does not set price (non-goal, retail slate).
- **7, governance.** Judges no person. Not applicable.

## The drive

Every step is in shipped places. `player` means asserted through player
verbs and tools only. `staged` means wizard setup is fine.

### Blocking drive

1. **Sugar strikes and seeds** (Terminus goods yards, the sugar house's
   boiling floor) · `short` · `player`.
   - A player boils raw liquor in a copper. `measure boil` climbs through
     syrup to strike. The player strikes off into a cone on a curing pot
     and lets it cool.
   - Unseeded, `analyze` reports it supersaturated and not setting. The
     player puts in a pinch of sugar, and it begins to set.
2. **The strike drains to molasses** (same place) · `staged` · `staged`.
   - Stage the cone four days on. Its crystal is a loaf. The curing pot
     holds molasses, which is the liquor left over, one band down.
   - Lift the cone off the pot onto the floor, and the next drainings pool
     on the floor; they don't vanish.
3. **Maple sugar sets** (Rejection, the Hanging Wood sugarbush) ·
   `staged` · `staged`. A maple strike, staged and seeded, sets as maple
   sugar.
4. **Salt waits for its edge** (the estuary mouth's salt pan) · `short` ·
   `player`. The open pan dries and its salt grows as today. Brine taken
   off and cooled in a covered crock holds past saturation until stirred.
5. **A cask remembers** (Crowsfoot) · `staged` · `player`.
   - Stage a plain cask that has held whiskey. A player empties it and
     fills it with water.
   - `smell` and `analyze aroma` on the water find the whiskey. A player
     washes a second such cask, and its water carries less.
   - A pitched ale cask (staged) gives nothing.
6. **The whiskey is the distiller's** (Crowsfoot) · `instant` · `player`.
   On a filled cask, `analyze condition` reads the cooper's workmanship and
   tasting the spirit reads the distiller's. `look` on the cask names its
   maker as the cooper.
7. **A poor mould lowers a cast, and a bottle does not**
   (staged anywhere) · `staged` · `staged`. A fine pour into a poor mould
   casts poor. A fine wine in a poor bottle stays fine.
8. **A sprung stave leaks** (Crowsfoot) · `short` · `staged`. Stage one
   sprung stave in a full cask. Over an hour its contents fall and the
   floor pools. A player fits a new stave and the fall stops.
9. **A crack in glazed stoneware leaks through the crack** (Hearts
   Delight potter's shop) · `short` · `staged`. A cracked glazed crock
   loses water at the crack's rate, not at zero.
10. **The crock remembers and washes** (Hearts Delight creamery) ·
    `short` · `player`. The butter crock, emptied, gives its old cream to
    fresh milk. Washed, it gives less.
11. **A snag holes her and `repair` patches her** (Rejection put-in, the
    rowboat; then the *Hesper*) · `short` · `staged`.
    - Run the rowboat onto a snag, so the hole is written by play, not
      staged. Her bilge fills and `bail` races it. `repair` patches the
      hole and the leak falls to her seep.
    - The *Hesper*, holed the same way, is refused a course "until she is
      patched". Patched, she sails.
12. **Salt glazing** (Hearts Delight potter's shop) · `staged` · `player`.
    - With the kiln at heat (staged), a player throws salt into the
      chamber, and the stoneware comes out salt-glazed.
    - Standing in the shop while it is salted, `smell` finds the fumes and
      `analyze atmosphere` reads them.
    - When the fire goes out, the chamber's air goes up the flue.
13. **Steam and fouled air reach the nose** (the sugar house; a staged
    retort) · `short` · `player`. A boiling copper raises the room's
    `measure humidity` and its steam is smelled. A retort with no condenser
    fouls the air, and `smell` finds it.
14. **Rain and glaze** (Hearts Delight weathering ground) · `short` ·
    `staged`. In rain, a glazed pot and a terracotta pot stand side by
    side. The glazed one sheds the rain. The terracotta takes it in, and its
    held water rises (a staged read: no player reading reports a body's
    held moisture today, and none is added). Green ware under the
    hack cover takes none.
15. **Lye goes where the ash lies** (Wharfside chandlery) · `short` ·
    `player`. Ash in the hopper, watered, gives lye in the hopper, and
    `pour hopper into pail` draws it as today. Ash heaped on the floor
    and watered pools its lye on the floor.
16. **Restart** · `instant` · `staged`. Restart the world and read back
    each of these:
    - the cask's memory;
    - the crock's memory after its wash;
    - the leaking cask's level and the puddle;
    - the *Hesper*'s patched state;
    - the contents' grade and maker against the cask's own;
    - the salt-glazed pot's coat;
    - the terracotta's held moisture.

No new places are added, so there is no light step. Every step is in a
shipped, lit place.

### Soak drive

- **S1, a cask over three fills** · `span` · `staged`. Fill, mature, empty
  and refill a new oak cask across seasons. What it gives falls each fill,
  what it remembers rises, and re-firing restores its own share. (Staged
  twin: step 5.)
- **S2, a curing house's season** · `span` · `player`. The boiler NPC
  strikes, seeds and cures a season's loaves, and molasses re-strikes until
  blackstrap. (Staged twins: steps 1–2.)
- **S3, green bricks through a wet week** · `span` · `staged`. Held
  moisture follows exposure, the bricks under cover dry, and the rain
  checks the exposed ones. (Staged twin: step 14.)

## Acceptance criteria

- A cask with a sprung stave, a cracked glazed crock and a holed boat each
  lose their
  contents (or take on water) at a rate a player can watch fall. A sound
  one doesn't.
- Nothing that drips or drains disappears. It is in the vessel under it or
  on the floor.
- A cask that held whiskey makes water taste and smell of whiskey. Washing
  reduces that. A pitched cask gives nothing.
- A filled vessel's condition reads its maker's workmanship. Its contents
  read their maker. Filling a vessel never changes its maker.
- A poor mould casts poor. A poor bottle leaves its wine as it was.
- Cane and maple strikes both set as crystal and mother liquor. A strike
  that nobody seeds or stirs holds past saturation.
- A kiln that is salted makes salt-glazed stoneware, and the shop smells of
  it.
- Steam from a copper and fumes from a retort can be smelled and measured
  in the room.
- In rain, a glazed pot and a sheltered pot stay drier than an exposed
  terracotta pot, whose held moisture rises.
- A holed ship is refused a course until `repair` patches her, and then
  she sails.
- After a restart, every state above reads back unchanged.
- The maturation, faces, bulk, mould, thermal, fire, ship, smell and
  weather docs each state the one model. No doc says imparts don't deplete.

## Cross-references

- Seeding slate: [matter-model-overlaps-slate](../slates/tech-debt/matter-model-overlaps-slate.md) (reuse ledger)
- Subsystems: [faces](../subsystems/faces.md) · [bulk](../subsystems/bulk.md) ·
  [assembly](../subsystems/assembly.md) · [mould](../subsystems/mould.md) ·
  [maturation](../subsystems/maturation.md) · [thermal](../subsystems/thermal.md) ·
  [fire](../subsystems/fire.md) · [ceramics](../subsystems/ceramics.md) ·
  [ship](../subsystems/ship.md) · [harbor](../subsystems/harbor.md) ·
  [weather](../subsystems/weather.md) · [spoilage](../subsystems/spoilage.md) ·
  [potash](../subsystems/potash.md) · [dairying](../subsystems/dairying.md)
- Related slates: sugar · assembly § 13 · ships-and-harbors · libations ·
  navigable-water (the cooper's attributable failure) · vocabularies-to-rows
  (smell) · pottery · construction
