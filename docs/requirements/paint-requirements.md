# Paint and adhesives — requirements

**Kind:** feature
**Leads from:** kernel. The substrate is a building's outside: where you stand to reach it, the coat
that weathers on it, and the shell that reads it. Its first consumer is the paint content shipped in
the same build: the colorman at Wharfside, the paints, the cottage that peels.

A building in this realm says *"the paint has gone; rain has gotten into the sills"*, and there is no
paint. Behind the line is one number per home that falls in a straight line. This build makes the
line true. A building's outside is a stack of coats that weathers where the building meets the
weather. Paint is a pigment in a binder, made from things the world already produces, and putting
it on is how a building is kept. ⭐ **A binder is an adhesive** — it glues pigment to a surface — so
the build takes adhesives whole: glues made from what ships, one setting model for a coat and a
glue line, and the glued joint made real. Seeded by the [paint slate](../slates/builds/paint-slate.md);
designed with the owner on 2026-10-31.

## What already exists

- **Coats on goods** (ceramics): every good carries per-face coat stacks, outermost first, each coat
  wet or set. A glaze sets by heat; pitch on a tarred rope sets as it cools. `dip` lays a coat from
  a tub ([faces.md](../subsystems/faces.md)). No coat ever wears.
- **A building** is a `Structure`: which rooms belong to it, which storey stands on which, its
  entrance and how it looks from outside. It is seen on horizons but has no state and cannot be
  touched. Each room authors its own walls and roof as layers, and the engine works out which
  faces are exterior, whether the room holds its own air, and whether rain reaches it
  ([construction.md](../subsystems/construction.md)).
- **A ship** is a Structure with a position; she lies alongside a room and wires an exit named for
  her ([expanse.md](../subsystems/expanse.md)).
- **The shell** — `survey`, `maintain`, the condition bands, who owes the upkeep — belongs to
  player homes alone (`residence`), and `maintain` uses up nothing but the kit.
- **Color** is a model for cloth only: dyes, alum and the subtractive stack
  ([textiles.md](../subsystems/textiles.md)).
- **Upstream that ships:** the limekiln, quicklime and milk of lime (the chandlery already calls it
  *limewash*); flax seed and the `press` verb; milk, curd and eggs; rawhide and the knackers;
  clay carrying goethite; chalk; soot in flues; malachite; copper; lead; wine vinegar; madder and
  alum; Scots pine, standing in Hanging Wood; the tappable tree and the `tap` verb (maple, birch);
  the still and its cut schedules; `mill`, `pour`, `stir`; `write` on a surface that bears marks.
- **Glue** exists only as a kind of joint (`glued`): *"anybody can smear it on"* — it uses up
  nothing, no glue material exists, and no content uses it. The rendering slate holds glue and
  gelatin with *"nothing demands them"*. A cask's joints already slacken as it dries out, read
  on look ([assembly.md](../subsystems/assembly.md)).
- **Hazards that ship:** the hay fire (a heap that warms itself until it catches); an acute lead
  condition (the chronic kind was deferred).
- **Restaging:** every reboot re-applies staged content from its rows.
- **No paint verb, no paint, no colorman, no painter, no resin.**

Therefore what is genuinely new here is: **a building's outside as something you can stand beside
and act on; a coat that weathers and is replaced; the shell for every building, not just homes;
paint as pigment in a binder; resin and turpentine; the slow lead poison and the smoldering rag;
adhesives — glues made, a glue line that sets and fails by its surroundings; and the colorman's
trade at Wharfside.**

## Goals

- Every building and ship has an outside a person can reach from where it meets the weather, and
  `look`, `survey`, `paint` and `maintain` work on it from there.
- A building's outside is a stack of coats that thins under the weather; once the coat is gone the
  fabric beneath starts to wear, much faster. Keeping a building is repainting on schedule.
- The shell is every building's: a shop, a barn, a ship and a home weather by one rule, and a home
  reads its building's condition.
- Paint is made, not bought ready-made only: pigment ground and stirred into a binder, its
  properties coming from what went in.
- Each binder sets by its own chemistry, read from the air around the coat.
- The paint and the job are counted: survey tells the area and how much paint it takes.
- A coat shows its color; a pigment that fades in light fades the coat.
- Resin is tapped from pine, distilled into turpentine and rosin, and made into varnish.
- Glue is made from what ships, sets by the same rules as paint, and a glued joint uses it up,
  holds by it, and fails by it — in the damp, in the heat, or because it was disturbed before it set.
- Painting can hurt you, in three derivable ways: lead white poisons slowly, oily rags in a heap
  catch fire, turpentine fumes in a closed room make you ill.
- A colorman sells paint at Wharfside, a house painter keeps the town's buildings, and a
  signwriter can letter a board in paint.
- Staged buildings weather and come back fresh when restaged; owned buildings keep their paint.

## Non-goals

- **The artwork as a piece** — exhibition, the artist's uploaded image, audience capture, metadata
  → [visual-arts slate](../slates/builds/visual-arts-slate.md). This build makes the painted panel
  as an object only.
- **Painting interior walls** (distemper, murals, wallpaper) → [decor slate](../slates/builds/decor-slate.md).
- **Raising a building from nothing** (the erection bill, the building site) →
  [construction slate](../slates/builds/construction-slate.md).
- **Runtime, localized restaging** →
  [stage-and-simulation slate](../slates/builds/stage-and-simulation-slate.md). This build only
  keeps a staged outside out of the captured state, so a restage resets it.
- **Moving Structure's and Ship's existing subclass state into mixins** → the owner's own pass;
  this build adds its capabilities as mixins and moves nothing that ships.
- **Paper sizing and bookbinding** → [paper and printing slate](../slates/builds/paper-and-printing-slate.md),
  which gets its glue from this build.
- **Lime mortar as an adhesive** → [masonry and concrete slate](../slates/builds/masonry-and-concrete-slate.md).
- **Veneer, marquetry and glued furniture** → [carpentry slate](../slates/builds/carpentry-slate.md).
- **Galvanizing** → [metal-chain slate](../slates/builds/metal-chain-slate.md) (zinc).
- **Resin as light** (the dipped brand, the light ladder) →
  [tapping slate](../slates/tails/tapping-slate.md). This build taps resin for paint.
- **The epoch ladder past lime and oil** (alkyds, latex) → the paint slate, kept.
- **Tapping a pine stand as a whole** — tapping stays on named stems, as the tapping slate ruled →
  that slate's stand-level read.

## Placement

- **Kernel:** one setting model a coat and a glue line share; the glued joint taking a glue and
  judging its surroundings; the landing (core to Structure); the coat stack and weathering on a Structure as
  capabilities a structure composes, sharing the coat model goods already use; the shell moved
  from residence to Structure as a capability; the `paint` verb, afforded by a brush; the chronic
  lead condition; turpentine vapor as a breathable hazard.
- **`trade-painting`** (`/trade/painting`), a new capability pack: binder, pigment, paint and
  varnish rows; glue rows and how they are made; the brush; the colorman's and house painter's
  working behavior; the turpentine cut.
- **`trade-forestry`:** pine's resin yield and the tappable pine.
- **The terminus pack:** the colorman's shop and yard at Wharfside, tappable pines in Hanging Wood.
- ⭐ **A second paint, a second colorman and a second painted building are rows.** Any liquid
  that can form a coat is paint, so the chandlery's milk of lime paints with no pack change.

## Collisions

- **Every authored building** starts to weather the day this ships: the Hearthworks, the
  university, the ropewalk, the *Hesper*. Staged ones reset on restage (today, every reboot).
- **Residence:** `survey` and the condition bands now read the home's building; the *"paint has
  gone"* line describes a real coat. `maintain` stops resetting everything: it mends the fabric
  (sills, putty), and the coat is `paint`'s.
- **The chandlery's milk of lime** already answers to *limewash* — it is the lime paint.
- **The word *painter*** already means the diving pack's bow line. The house painter must not be
  addressable by a word a rope answers to.
- **`write`** gains paint as a medium.
- **Wharfside's neighbors** become the colorman's suppliers: chandlery, dyehouse, knackers,
  tannery, mill.
- **Hanging Wood** gains tappable pines among its standards.
- **The glued joint** changes meaning: it costs glue, its strength and reversibility come from the
  glue, and it can fail. No content uses it today (one test does).
- **The knackers and tannery** gain a customer for bone and hide scraps.

## Surface decisions

### A building is reached at its landings
A **landing** is a place that doesn't hold its own air, with an exit into an enclosed member of the
structure. It is derived, never authored. The street outside the front door is a landing; so is a
back garden, an internal courtyard open to the sky, an arcade, and the quay a ship lies alongside.
A closet and the neighbor's parlor are not. ⭐ **A landing is where the structure meets the
weather**, which is why a shed inside a warehouse has none and needs no coat. Lens 1 and the
shipped envelope rule decided it.

### The coat belongs to the building, not to a room or a wall
There is no wall object and no compass on a face, so a per-wall coat would leave the back wall
unpaintable and still weathering. One coat per structure, painted from any landing ("you walk
round it"). Lens 2: an author writes nothing new.

### Capabilities are mixins; the landing is core
The landing is how anything reaches a structure at all, so every structure has one. The coat, the
weathering and the shell are capabilities a structure composes; the default building and the ship
compose all three, so everything weathers, and a ruin or a monument that should never change
composes none. (The owner's standing direction: complexity is mixed in so an author opts out by not
composing it.)

### Everything weathers; staged things restage
One rule, no opt-in. A staged building's authored outside (*limewashed, fresh*) is where it starts,
and a restage returns it there; an owned building's outside is kept. Painting a staged building is
real until it is restaged.

### Paint is pigment in a binder, and the binder decides how it sets
Binders: **lime** (sets by taking CO₂ back from the air), **linseed oil** (by taking up oxygen,
giving off heat as it does), **casein** from curd and lime, **egg**, **hide glue** (all three dry),
and **resin** varnish (its solvent evaporates). Pigments: **yellow ochre** (goethite-rich clay),
**red ochre** (yellow burnt), **chalk white**, **lampblack** (flue soot), **malachite green**,
**verdigris** (copper and vinegar), **a madder lake** (dye fixed on alum — where a dye becomes a
pigment), and **lead white** (lead and vinegar). Lens 1 chose each: every one is made from
something the world already produces, by a process a person can learn.

### How long a coat lasts is derived
Nothing is authored per paint. A coat's thickness comes from the paint's solids, so two coats last
longer than one. Its wear comes from its binder and pigment: limewash wants renewing yearly-ish,
oil lasts years. A coat laid in rain or frost sets badly. Paced on the shell's existing dial.

### Adhesives: glues from what ships, and one setting model
A glue is a material with a setting rule — drying, cooling (it gels), or its solvent leaving — the
same rules the binders use, read from the same air. Each glue also says what it resists: hide,
bone, fish glue and starch paste let go in the damp; casein holds; resin and rubber cement do not
care; hide glue softens in heat and pitch melts. The glues: **hide** and **bone glue** (the
knackers' and tannery's scraps, boiled long — collagen turns to gelatin only under long moist heat,
as butchery already says), **fish glue**, **casein glue** (curd and lime), **starch paste** (flour
cooked in water), **rosin cement**, and **rubber cement** (rubber dissolved in turpentine, the next
epoch's glue). Lens 1 chose them: water resistance, reversibility and open time are what a
woodworker learns.

### The glued joint takes a real glue
It uses up glue to make; its strength and its reversibility come from the glue (hide glue comes
apart with heat and steam, which is how furniture is repaired; casein and resin never do); it is
weak until it sets; and it judges its surroundings on read, as a cask's hoops already do — a
hide-glued chair in a wet cellar fails at the glue line. Inside this build the brush (bristles set
in glue or pitch on a handle) and the gessoed panel (chalk in glue size) are glue's first
customers.

### Lead white is in, with the slow poison
The brightest white there was, and it poisons through the dust and the skin of every job. Lens 1:
the dose accumulates and is derivable. Lens 7: a polity can ban it.

### One verb to put it on; no verb to make it
`paint <building | good | canvas> [with <paint>]`, with a brush in hand. Making paint is the
shipped `mill`, `pour` and `stir`; `dip` stays dip-coating. Lettering a sign is the shipped
`write … on <board>` with paint as the medium; painted letters weather with their coat. (One verb
per act.)

### The painted panel is an object
`paint canvas` (or a gessoed panel) makes a good whose physical life is paint's. What the picture
*is* belongs to the artist and to the visual-arts build.

## Lens pass

1. **Pedagogy** — the sacrificial layer (repaint cheaply or replace the sills); carbonation,
   oxidation and drying; a dye against a pigment; coverage in square meters per gallon;
   lightfastness; spontaneous combustion; chronic poisoning; distillation of turpentine; a binder
   as an adhesive; why a boat is not hide-glued; why old furniture can be taken apart.
2. **Expression** — a coat's color is the painter's choice; a sign's words are the player's; a
   second paint, colorman or building is rows; the picture belongs to the artist.
3. **Immersion** — the survey line made true; the south-street shopfront that peels; the rags
   that smolder in the shed. **Participation** — the house painter's round, the neighbor who paints
   your frames, the colorman between the press and the painter, the polity that bans lead.
4. **Values** — lead white's brilliance against its poison, decided in by lenses 1 and 7; who owes
   a building's upkeep is the shipped title rule.
5. **Continuity** — the same `paint` from limewash to oil, and later alkyd and latex; tar on a
   hull is the same coat.
6. **Economy** — every building's weathering is the demand, and it was there first; paint consumes
   lime, linseed, curd, eggs, hides, bone, fish skins, flour, soot, copper, lead and resin; the
   colorman and painter are paid by owners; the glued joint stops being free.
7. **Governance** — a ban on lead paint; who owes upkeep (title); a building code that requires a
   coat is a polity's to write.

## The drive

1. At Wharfside, `look` shows the colorman's shop beside the chandlery. The colorman sells
   linseed oil, ochre, chalk, lampblack, lead white, brushes and ready paint.
2. In the colorman's yard, flax seed `press`ed gives linseed oil.
3. Ochre clay `mill`ed gives yellow ochre. Some of it, burnt, comes out red.
4. Linseed `pour`ed into a pot, ochre added, `stir` — a pot of yellow-ochre oil paint. `look`
   names its binder, its pigment and its color.
5. Standing in the lane outside a cottage, `look cottage` shows its outside. `survey cottage` says
   how its coat stands, how much wall there is, and how much paint the job takes.
6. Inside the cottage, `survey` reads the same building.
7. Weather a staged cottage until its coat is gone: the survey says *"the paint has gone; rain has
   gotten into the sills"*, and the fabric is now wearing.
8. From the lane, `paint cottage with paint` — the brush lays a coat; the pot empties by the area
   painted. The survey shows a wet coat, then (in dry air) a set one, then a sound building.
9. Paint in the rain: the coat sets badly and the survey says so.
10. Limewash: the chandlery's milk of lime on a brick building's outside sets over days by taking
    CO₂ back from the air.
11. `maintain` from inside mends the fabric and leaves the coat to `paint`.
12. Restage (reboot): a staged building painted blue comes back as its row describes it; a building
    the player owns keeps its new coat.
13. On the quay where the *Hesper* lies alongside, `paint hesper` paints her hull. Out at sea she
    has no landing and cannot be painted.
14. A heap of linseed-soaked rags left in a shed grows warm and catches fire; the same rags spread
    out, or soaked in water, do not.
15. Grinding lead white raises a slow dose; over repeated jobs the painter's colic appears, and
    `analyze` (or the infirmary) can name it.
16. In Hanging Wood, `tap pine` cuts a face and sets a cup; in warm weather resin gathers.
17. At a still, the gum distills: turpentine as the cut, rosin left in the pot. Rosin `stir`red into
    turpentine is varnish.
18. Thinning paint with turpentine in a closed room makes you dizzy; open the door and it clears.
19. `write ROPEWALK on board with paint` — the board carries painted words that `read` shows and
    weather with their coat.
20. A gessoed panel (chalk in hide glue), `paint`ed with egg tempera, is a painted panel good; a
    madder lake on it fades in a sunny window.
21. A house painter on their round paints a weathered staged building in town.
22. Hide scraps from the knackers, held hot in water and reduced, give a glue liquor that gels into
    cakes as it cools; warmed again it is ready to use.
23. A joint glued with hide glue holds once set; one disturbed before it set is weak. Left in a wet
    cellar it lets go at the glue line, and `look` says so; the same joint in casein glue holds.
24. A hide-glued joint comes apart with heat and steam; a casein-glued one does not.
25. The colorman's brush is an assembly: bristles set in glue on a handle.

## Acceptance criteria

- From a landing, a player can `look`, `survey` and `paint` a building; from a place that is not a
  landing (a closet, a neighbor's parlor, a ship at sea), they cannot reach its outside, and the
  refusal says why.
- An internal courtyard open to the sky is a landing; a shed inside a warehouse has none.
- A building left alone loses its coat over time and then starts to wear; one repainted on schedule
  stays sound. The survey's words match what is on the building.
- A shop, a barn, a ship and a home all weather by the same rule, and a home's survey reads its
  building.
- A player can make paint from its ingredients with `mill`, `pour` and `stir`, and its binder,
  pigment and color show when they `look` at it.
- Painting uses up paint in proportion to the area painted, and the survey says how much a job
  takes before it starts.
- Lime, oil and the drying binders each set by their own condition: a lime coat needs air and time,
  an oil coat warms as it sets, any coat laid in rain or frost sets badly.
- A coat's color shows on the building; a fugitive pigment fades in sunlight.
- After a restage, a staged building's outside matches its row; an owned building's outside is
  unchanged.
- Resin can be tapped from a named pine, distilled into turpentine and rosin, and made into varnish.
- A heap of oily rags catches fire by itself; spread out or wet, it does not.
- Repeated work with lead white produces a slow poisoning a player can see named.
- Turpentine vapor in a closed room harms a player until the room is aired.
- A player can letter a board in paint, and anyone who can see it can read it.
- A gessoed panel painted with tempera exists as a good.
- A player can make hide, bone, fish and casein glue, starch paste, rosin cement and rubber cement
  from things the world produces.
- A glued joint uses up glue; it is weak until set; a hide-glued joint fails in the damp and
  comes apart with heat and steam; a casein-glued joint holds in the damp and cannot be taken apart.
- A colorman at Wharfside sells paint and its ingredients; a house painter paints a town building
  on their round; nobody can address the house painter as a boat's bow line.
- The chandlery's milk of lime works as limewash with no change to the chandlery.

## Cross-references

- Seeding slate: [paint-slate](../slates/builds/paint-slate.md)
- Siblings: [visual-arts slate](../slates/builds/visual-arts-slate.md) ·
  [tapping slate](../slates/tails/tapping-slate.md) ·
  [repair slate](../slates/builds/repair-slate.md) (W7, upkeep) ·
  [construction slate](../slates/builds/construction-slate.md) ·
  [decomposition slate](../slates/builds/decomposition-slate.md) ·
  [decor slate](../slates/builds/decor-slate.md) ·
  [stage-and-simulation slate](../slates/builds/stage-and-simulation-slate.md)
- Subsystems: [faces.md](../subsystems/faces.md) · [construction.md](../subsystems/construction.md) ·
  [expanse.md](../subsystems/expanse.md) · [holding.md](../subsystems/holding.md) ·
  [textiles.md](../subsystems/textiles.md) · [taps.md](../subsystems/taps.md) ·
  [fractionation.md](../subsystems/fractionation.md) · [fire.md](../subsystems/fire.md) ·
  [metabolism.md](../subsystems/metabolism.md) · [respiration.md](../subsystems/respiration.md) ·
  [cleanliness.md](../subsystems/cleanliness.md) · [assembly.md](../subsystems/assembly.md) ·
  [butchery.md](../subsystems/butchery.md)
- Also: [rendering slate](../slates/tails/rendering-slate.md) (glue and gelatin) ·
  [carpentry slate](../slates/builds/carpentry-slate.md) ·
  [paper and printing slate](../slates/builds/paper-and-printing-slate.md)
