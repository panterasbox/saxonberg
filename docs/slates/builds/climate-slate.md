# Climate — a realm with a real winter

> **Status: UNBUILT** — and ⚠ this slate's status block was **bare bold
> lines** rather than a blockquote until 2026-10-08, so `tools/slate-index`
> could not read it and the slate was **absent from the index** for its
> whole life.
> **Left:** the **unification** (two climates, nine Kelvin apart) ·
> **latitude as a resolved field** · temperature **derived from
> insolation** with a maritime/continental damping · the lapse term
> generalized off the watershed · **snow depth** · the ground-condition
> locomotion axis · and ⚠ the **hemisphere** question (`seasonFor` takes
> no latitude).
> **Size:** a wave — it is the shared prerequisite for ice, whaling,
> farming, husbandry, forestry and textiles.

⭐⭐ **This realm has no winter, and the taps build is where that
stopped being invisible.** The weather field is a 295 K baseline with
roughly ±10 K annual and ±4 K diurnal deviation, so the temperature
floor anywhere, in any season, is about **276 K**. Nothing in the game
has ever frozen, and nothing ever will until somebody changes those
numbers.

Written 2026-10-01 by the taps build, which needed freeze–thaw and
could not have it. **Amended 2026-10-08** by the ice/whaling design
session, which found that climate has in fact been built *twice*, that
latitude costs far less than this slate assumed, and — the part that
matters — that none of the preceding sentences are a reason to build
anything. The reason is § *What it is FOR*.

---

## ⚠⚠ What found it, and why it is a slate rather than a bug

A real sugar maple runs on **freeze–thaw**: nights below freezing draw
the sap down and build negative pressure, days above freezing push it
back up, and the cycle is literally driven by ice forming and melting in
the xylem. It is why sugaring is a few weeks in late winter rather than
a season.

A `weather` tap window with a diurnal 273 K crossing **would never fire
once.** Authoring one would have shipped a tree that silently never ran
— the failure class the whole reachability discipline exists against —
so `acer/saccharum` ships with the daylength band it CAN have, and its
row says so in full.

⭐ **The fix is a ROW, not code.** When winter is real, maple gets a
`weather` window with a diurnal 273 K crossing and nothing in the kernel
changes. That is the first consumer, and it is the test that
`TapWindowSpec` was declared as data for the right reason.

---

## ⭐⭐⭐ The realm has TWO climates, and they disagree by nine Kelvin

The decisive finding of the 2026-10-08 pass. Climate is not greenfield.
It has been modelled twice, by two builds that never compared numbers.

**Copy one — the biome/weather field.** A 295 K universe baseline plus a
global solar term. Winter night bottoms near 281 K. Nothing freezes.

**Copy two — the watershed's snowpack walk**
(`WatercourseCatalogue.ts`, `airTemperatureK`):

```
seasonMeanK(season)
  + WEATHER_PROFILES[type].deviation.temperature
  − lapseKPerM × elevationM
```

with `water.season.meanK.winter = 272` and
`water.snow.lapseRateKPerKm = 6.5`.

So **the catchment's winter is 272 K at sea level** — below freezing
before altitude takes another 6.5 K per kilometre — while the room you
are standing in beside that river reads 285 K on the same game-day.
The snowpack banks metres of water-equivalent on a mountain whose
occupants are in shirtsleeves.

⚠⚠ **And this is already producing an incoherent world in a shipped
verb.** `Conduit.readingFor` derives the `frozen` supply state **on
read**, at `airK <= water.freezeK` (273.15), from
`catalogue.airTemperatureKAt` — the *watershed's* climate. A water main
in this realm can freeze today while the street above it is at 285 K.
Meanwhile `stallBelowK: 273` on three drying profiles has never fired,
because drying asks the **biome**. Same realm, same clock, two answers.

⭐ **The water build knew it was doing this and said why:** *"a reach
has no room to resolve a biome from — it is a position on a river, not a
place you stand — so the catchment needs a temperature model of its
own."* That reasoning is **correct about the lookup and silent about the
numbers** — and the numbers it then authored are the honest ones.

**Which reframes the build: this is a UNIFICATION, not an invention** —
and the model to unify onto is the watershed's, because the watershed's
has the term the weather field is missing.

| | weather field | watershed |
|---|---|---|
| seasonal | solar cosine, global | authored 4-season table |
| diurnal | ±4 K, 3-hour lag | — |
| weather type | ✅ shared | ✅ shared |
| **spatial** | **nothing** | **lapse rate × elevation** |

Each has exactly what the other lacks.

---

## The two rows that set a temperature

The whole biome-side climate is these, which is the good news:

1. `packages/content/base-library/content/stuff/idea/biome/universe.yaml:10`
   — `_defaultTemperature: { value: 295, unit: K }`.
2. `packages/server/src/mud/platform/idea/api/WeatherLogic.ts`
   `solarTemperatureDeviationK` — ±10 K annual, ±4 K diurnal, a 3-hour
   lag. Read through `deviatedFieldFor`.

⚠ And a third fact that is not a temperature: **snow is gated by the
weather grammar, not by temperature** (`WeatherLogic` adds to
`frozenMm`). So it can already snow at 290 K, which is its own small
dishonesty.

---

## ⭐⭐ Latitude is a hardcoded argument, not an absent model

This slate's first draft called per-place latitude *"celestial's deferred
planetary anchor"* and treated it as expensive. ⚠ **That was quoted from
a doc sentence rather than read out of the code, and it is wrong.**

**Every celestial function is already latitude-parameterized.**
`solarAltitudeDeg(profile, latitudeDegrees, t)`, `isDay(…)`,
`daylightSeconds(…)`, `skyIlluminanceFactor(…)`,
`sunriseHourAngleDeg(…)` — latitude is a **parameter on all of them**.
`CAMPUS_LATITUDE = 42` is a `const` in `CelestialLogic.ts` that roughly
fifteen call sites pass as an argument.

⭐⭐ **And the arctic is already implemented:**

```ts
const cosH0 = -Math.tan(lat) * Math.tan(dec);
if (cosH0 < -1) return 'polar-day';
if (cosH0 > 1) return 'polar-night';
```

with its own comment — *"Polar day answers the whole rotation and polar
night answers zero, which are the honest limits rather than special
cases — at 66.5° and beyond, both genuinely happen."* Somebody wrote
polar night, shipped it, and it has never once been reachable because
nothing in the realm can say it is at 70°.

So the deferral is **a field to pass instead of a constant** —
structurally what `Zone.elevation` already is: a number, inherited
through a chain walk, resolved for a place.

⛔ **And elevation alone cannot be the answer**, which the first draft of
this section missed for a whole pass. **Elevation on an expanse is zero
by definition.** The lapse term contributes *nothing anywhere a ship can
go*, so an altitude-only climate cannot reach whaling — the trade this
whole design programme is ordered toward. Picking altitude because it was
cheap meant picking the one spatial axis that is identically zero over
the target.

⚠ **One genuine gap:** `seasonFor(profile, t)` takes **no latitude**, so
season is day-of-year arithmetic and hemisphere-blind. Two hemispheres
means southern winter in July, and that edit reaches `SEASON_BIAS`, the
husbandry windows, `TapWindowSpec`'s `rising`, and the watershed's
four-row table. ⭐ It is also what would let a whaling fleet **follow the
season** between fisheries, which is the actual historical shape of the
industry.

---

## ⭐⭐ The unified model — temperature from insolation

A **constant** annual amplitude is wrong at every latitude except the one
it was tuned for: the real Arctic has a ~40 K annual range and the
equator has almost none. `solarAnnualSwingK = 10` is not a dial awaiting
a playtest — it is a latitude-shaped function collapsed to a scalar.

⭐ **So derive it.** `daylightSeconds` and `solarAltitudeDeg` at a
latitude on a day of year are exactly the physical inputs that set
temperature, and both are shipped, pure and memoized. Integrated
insolation gives, with no authored table anywhere:

- polar night → no insolation → genuinely deep cold, in the right months
- the midnight sun → an arctic summer that is **not** cold, which is the
  real thing and is what makes a whaling season a *season*
- the ~40 K polar annual range as an **output**
- temperate 42° staying roughly where it is today

That is lens 1 — *is the world derivable* — answered harder than
anywhere else, and it is the same move the watershed already made when
one lapse-rate number replaced a table.

**Two costs, and the first is a feature.**

⭐⭐ **Thermal inertia.** Pure instantaneous insolation makes the poles
far too cold and gives them no lag — real seasonal extremes trail the
solstices by weeks, for the same reason the existing diurnal term lags
three hours. So the model needs a lag-and-damp, and **the damping
constant is the maritime/continental distinction**: water's heat
capacity moderates, land goes extreme. One parameter, and a whaling
ground is mild-for-its-latitude while the interior next door is brutal
— which is true, and is precisely the texture the trade wants.

**The seam exists.** `_pressure` already derives from elevation inside
the biome chain, firing **only when the walk fell through to the root
universe biome** (`sourcePath === /stuff/idea/biome/universe`) — exactly
the case where the number in hand is the sea-level *reference* rather
than anything an author said about this place. Temperature becomes the
second field under that same rule, so Rejection's `upper-workings`
285 K still wins: it is rock, an author said so, and the sky's
correction must not touch it.

**The target expression, with each term's owner:**

```
T = T_insolation(latitude, dayOfYear)   // derived, celestial, lagged + damped
  − lapseRate × elevation               // the watershed's term, generalized
  + typeDeviation                       // already shared by both models
  − diurnal(secOfDay − lag)             // already shipped
```

⭐ **Season and place stop competing** — this slate's old open question 2
("is winter a season or a PLACE?") was a false fork. They are
**different terms in one sum**: season is time, place is space, and they
add. You do not need latitude bands to make the north cold *and* you
cannot make an ocean cold without them.

---

## ⭐ What moves when winter does

A dozen shipped systems read ambient temperature, and most have never
seen a number below 276.

| system | what a real winter does to it |
|---|---|
| **thermal** | ⭐⭐ the Newton-cooling couple starts mattering: an unheated interior goes cold, a thermos earns its keep, `reconcilePhase` finally has a reason to freeze something. ⚠ `Coolbox` exists and has never been needed |
| **spoilage** | `f_T` collapses — ⭐ **winter IS the preservation technology**, and a cellar becomes a thing you want rather than a flavour |
| **freshness / water activity** | drying stalls (`stallBelowK: 273` is already authored on three profiles and has never fired) |
| **soil** | moisture stops moving; the `Winter` reconcile exists and is under-exercised |
| **husbandry** | `cold` becomes a real limiting factor rather than a theoretical one |
| **metabolism** | ⚠⚠ the naked-Cast-starves finding gets worse: an unfed body in a 265 K night is a dead body, and the dials are already ~10× off |
| **exertion** | wind chill, and a reason to own a coat |
| **textiles** | ⭐ the `clo` ladder and the covering model finally have a load case. Wool's `insulating` tag starts paying |
| **watershed** | snowpack and the melt freshet are modelled and have never run |
| **taps** | maple's freeze–thaw opener — this slate's first consumer |

---

## ⭐⭐⭐ Shipped, and never once fired

The table above is what *changes*. This one is the **argument**, and it
is the same argument that made the ice trade worth doing — except it is
not one orphan, it is a backlog. ⭐ **Lens 6 asks whether the demand was
there first. It was there eleven times, by accident**, and nobody noticed
because each orphan looked like one build's loose end.

| shipped | has never fired because |
|---|---|
| `Coolbox` | nothing is cold |
| `stallBelowK: 273` on three drying profiles | nothing is cold |
| `reconcilePhase` freeze | no ambient driver |
| snowpack + the melt freshet | modelled, never run |
| husbandry's `cold` limiting factor | theoretical |
| textiles' `clo` ladder, wool's `insulating` | no load case |
| **`vitamin-c`** (a metabolism slow stock that *empties on a dial*) | nothing makes citrus scarce |
| lamp-oil street lighting + the civic bill | no night worth paying for |
| elevation→pressure **and** respiration | both halves ship, never meet |
| polar day / polar night | unreachable behind one `const` |
| LULU as a settlement type | no exemplar |
| `frozen` supply state | fires — but only on the *river's* climate |

---

## ⭐⭐⭐ What it is FOR — the content

> ⚠⚠ **This section is the point of the slate and was missing from its
> first draft.** Three design turns went into picking terms for an
> equation before anybody asked what any of it was for. **The lenses are
> the instrument for finding content, not for rating it** — the author's
> correction, 2026-10-08, and the reason this section is organized by the
> lens that found each item rather than by subsystem.
>
> ⭐ Scope note: the platform ships **latitude as a resolved field**,
> insolation-derived temperature, snow depth, and a ground-condition
> locomotion axis. *Everything below is then content* — rows, places and
> people. A polar station, an ice fishery and a mountain pass are three
> **authors' answers**, not three features. ⛔ "One hemisphere or two" is
> not a platform question; it is whatever the content author wants.

### Lens 4 — no right answer, and somebody must decide anyway

⭐⭐ **The fuel ration.** A polar town in January is a fixed pile against
a known draw. Tonnes ÷ days ÷ households is **exact** — the engine can
say with certainty whether the coal lasts, and cannot say whose house
goes cold. The purest instance of lens 4's shape anywhere in this design,
and the cold is what makes it exact enough to hurt.

⚠ **The trap is the content.** A town will *want* a **need index** —
rank households by occupancy, by age, by whether there is a baby —
because it converts an unbearable choice into arithmetic. Lens 4 says
that is exactly what a gauge does, and this is the one place a polity
should be **able** to build the gauge and then live with having built it.
The artifact is a ledger nailed outside the fuel office, in somebody's
handwriting, with names and allocations on it — and the fact that a
person wrote the formula and signed it. Lens 7: whose house went cold,
who they complain to, and whether the author of the formula is still in
the room.

**Who owns the ice on a lake.** Ice forms on water; water rights are
prior-appropriation records. But ice is not water — it is a solid on a
surface, and the surface is a passage. Is cutting ice a **withdrawal**
(physically, yes) or a **harvest from a commons** (it reads like one)? A
town that rules it a withdrawal has handed the whole ice harvest to the
senior water-right holder, which is **not what we wanted and is right** —
lens 3b, from a two-sentence legal question.

### Lens 6 — the hole in the shape of a middleman

**Somebody has to sell sawdust.** Ice houses insulate with sawdust,
which is a sawmill's waste; sawmills are where the trees are, which is
not where the ice is. So the ice trade depends on a business whose entire
product is **other people's garbage, moved a long way** — a vocation not
in the register, existing because of a geographic mismatch rather than
because anyone wanted the job. A bad year in forestry raises the price of
ice, which is a second-order link nobody can author directly.

**The winter wage.** Cold-season labor runs **counter-seasonal to
agriculture** — the ice harvest is the dead season's work. A realm with
both has a workforce that *moves*, and nothing in employment models who
is in town this month. The content is a boarding house in a place whose
population triples in January, and a publican who knows which week the
money arrives.

**Blubber's two markets are one decision.** Oil for lamps, or fuel for
the station's own fires — the whaling station is the one place where its
product and its heating bill are the same substance. Burning the cargo
through a cold snap is rational and will feel like failure.

### Lens 5 — does the capability survive the epoch

⭐⭐ **The ice trade is designed to die, and the slate should say so.**
Natural ice was an enormous industry that refrigeration killed inside a
generation, and `ClimateControl` already ships as the successor. So this
is the first trade authored **knowing its obsolescence date**, and the
content is the ice house afterward: an enormous insulated building with
nothing to keep — a mushroom farm, a records vault, a dance hall. Guild
doctrine is **ship ruins, not institutions**; this is the ruin a player
watches happen **to their own asset**, on a schedule nobody concealed.

⭐ **And the whaler's version is already in a row.** Whale oil was killed
by kerosene, and `lamp-oil.yaml` ships
`keywords: [lamp-oil, oil, lamp, kerosene, paraffin]` — **the successor
and the thing it replaces are the same noun in the same row**, by
accident. Make it deliberate.

### Lens 3a — the cold concentrates the cast

**The warming house.** Not a tavern — a civic room the town heats so
forty households need not each heat their own, because heating one room
is cheaper and **the thermal system already does that arithmetic**. A
polar town's social centre exists for a thermodynamic reason, and the
room has a demographic: who is in it at three in the morning is the
people who cannot afford their own fire.

⭐⭐ **Which is the real insight: winter is a CO-PRESENCE ENGINE.** Five
months with the whole cast forced into one heated room is the best
setting this game could have for gossip, the press, the forums, a feud, a
conspiracy. Everything social improves because nobody can be alone. The
design has treated co-presence as a cost; cold makes it a **gift**.

⭐⭐ **The thaw.** Everything buried in November returns in April.
Spoilage's `f_T` collapses under snow, so a body does not decay — the
**evidence is preserved perfectly and arrives five months late**, to a
town that has already decided what happened. The corpse is a forensic
body on the Thing branch. An entire mystery structure the physics
generates for free, and it asks something of a player who was there in
November.

**The sun's return has a name and we never explain it.** A town that
counts the days to first light, has a word for the morning it comes, and
does something — and the text never once says what the word means. You
learn it by being there in February. *Cultural content is what players
know that the text never said*; this is the cleanest instance available.

### Lens 1 — is the world derivable

**Reading ice.** Thickness is accumulated latent removal, so it is a
function of **cold-hours, not of today's temperature** — genuinely
useful, and completely counterintuitive to anyone who checks the
thermometer and walks out. Competence resolves detail and never access:
a novice gets *"the ice looks solid"*, an expert gets the number and the
reason (black ice vs white, the thin place over the current, the pressure
ridge). Fishing's banded `Shore` read is the shipped shape, and the
uncertainty is honestly **epistemic**.

**You cannot tell time by the sun here.** Under `polar-day` or
`polar-night` the sky stops being a clock. A place where you must *own* a
timepiece and a stopped clock is a real problem. The Timekeeping seam
exists and nothing has ever needed it.

**Nothing dries.** `stallBelowK: 273` stalls drying and curing, so the
cold half of the realm **cannot preserve by drying** and must preserve by
freezing, while the warm half does the opposite. Two technologies for one
need, **split by geography rather than by tech level**, with a trade route
between them. Preservation stops being a ladder and becomes a *place*.

### Lens 2 — the ordinary case with no code

⭐ **The test:** an author authors **one number** — a latitude — and gets
snow, frozen mains, a short season, a dark winter and husbandry limits
for free.

**The bespoke case** is a place cold for a reason that is *not* latitude:
a cursed valley, an unseasonable winter, a mountain with no business
being frozen. **Weather pins already do this** — an authored pin outranks
procgen and `frozen` mode is static — and the weather doc reserved the
field saying *"Narnia is polar."* So an author can have an **unexplained**
winter without touching the climate model, which is the pin tier earning
its existence.

### Snowmelt — the one piece already built

⭐ `watershed.md` has already said the best thing about it: *"power rises
and falls with the river. A mill that grinds ten sacks in spring grinds
fewer in"* August. What is left is content on top.

⭐⭐ **The river is an integral, and that is the whole lesson.** Flow is
`precipitationBetween` over a 180-day window with a pack that banks below
freezing and releases on degree-days — so **the water in the river fell
six months ago and fifteen hundred metres up, and nothing about today
tells you anything.** It rained yesterday and the river is low; it is
clear and warm and the river is in flood. The correct instrument is a
*season* and an *altitude*. The teachable fact is not "rivers rise in
spring" but that a watershed is **storage with a lag**, and the lag is
what every downstream decision is about.

⭐⭐⭐ **The mild winter catastrophe — the centrepiece.** A warm winter
means precipitation falls as **rain instead of snow**, so it arrives
*now* instead of in May. The pack never builds. **January floods, and
then August has nothing coming off the mountain.** A pleasant winter ruins
the farmer twice and he cannot blame weather he enjoyed — nobody in the
valley experienced a drought, they experienced a nice year followed by an
empty river. Counterintuitive, true, derivable, and it exists **only if
snow-versus-rain is decided by a temperature the realm actually
reaches**. The strongest single argument for the unification.

⭐⭐ **The mine is where the snow is and the right belongs to the city.**
`watershed.md` says both halves and connects neither: the headwaters bank
the snow, and *"the headwaters are where the ore is."* Rights are prior
appropriation — dated, transferable, first in time first in right — and
the city downstream was founded first. **So the mountain town stands in
the snow, watches the river leave, and holds a junior right to water it
is physically touching.** Mining needs water at exactly the season the
senior right binds. No villain, no scheme: two towns, two dates on two
pieces of paper, one dry August. ⭐ And the polity's escape hatch is
real — switch doctrine to **riparian**, where every right is priority
date `0` and everyone goes short *equally*.

**The reservoir is a time machine for water.** Crops want water in July;
the river delivers in May. Storage is the only way to move snowmelt
**forward three months**, which is why `StorageNode` being the build's
one piece of real state is exactly right: **a dam is where the realm
stores time.** It converts a flood nobody can use into a dry-season
supply somebody owns, and whoever built it captured the difference —
which makes it the most political object in the game. Content: the
subscription list, the year built, the families who paid and the farms
that did not and are downstream anyway.

**Peak flow arrives while the pipes are still frozen.** The freshet comes
off in early spring and `frozen` is still true: a window where the river
is at its annual maximum and the town carries water in buckets. The thaw
crew's season is that gap, and the gap is two numbers — the melt
threshold and `water.freezeK` — nobody has had reason to compare.

**The glacier.** A pack that never fully melts is a reservoir with
multi-year memory, and therefore **drought insurance** for everything
below it — which makes a glacial valley the most valuable farmland in the
realm for a reason nobody authored. ⭐ It is also the ice core's sibling:
because weather is a pure function of time, a glacier's extent is
**computable backwards**, so it can be *visibly smaller than the old
survey says* and the discrepancy is honest rather than fabricated. A
climate record a player reads with their eyes.

**Glacier milk.** Rock ground to flour makes a river permanently cloudy
— turbidity, which fishing already reads, so a glacier-fed water is a
**different fishery**. And it is a supply problem: cloudy water is not
contaminated but does not look clean, which is a distinction
contamination-by-kind can make and most games cannot. A town that filters
for appearance rather than safety is being sensible and slightly absurd.

**Breakup, and the ice jam.** Pack ice piles at a bend, dams the river,
and releases at once: **a flood with no rain, in sunshine, caused by the
river itself.** `HazardMixin` is self-resolving and `snowpackMm` already
exists, so the trigger is in hand. It is also the event that takes out
bridges — pricing the crossing by something that happens *to* the route
rather than a toll somebody invented.

**The forecast is a commodity.** Weather is deterministic and the pack is
computable, so **next summer's water is knowable in March** — and
somebody can measure it and sell the number. Pedagogically honest (the
information really is there and really is derivable), and it makes the
instrument ladder commercial instead of decorative.

⚠ **One honest gap: rain-on-snow.** Degree-day melt is temperature-driven
only, so warm rain on a deep pack releases nothing — and that is the
worst real flood mechanism there is. The precipitation integral is in the
same walk. Decide whether it is a term we add or a simplification we
state; the mild-winter story is strongest if its catastrophic version
also exists.

### ⭐⭐ The August crisis — an emergency on the calendar

What makes it unusual is that it is **scheduled**: everyone knows the
fight is in six weeks, the arithmetic is public, nobody is surprised.
Most events are ambushes; this one is an appointment, which buys
anticipation, manoeuvring and ritual that a surprise cannot have.

**Somebody turns your water off, in person.** Curtailment is not a system
message, it is a **ditch rider** — a job with a route, who closes
headgates in priority order. Employment models a position with a round;
logistics models a route. So the person who ends your season is someone
you know, who must look at you, and who will be back next year. Lens 7's
three questions answer themselves: the criterion is a flow figure at a
gauge, the appeal is to whoever seated the rider, and whether a town may
**re-date a right** is the entrenchment tier.

⭐⭐⭐ **The public gauge — a mechanism this design has underused.**
Instrumentation's doctrine is that an **instrument sets a ceiling** while
competence resolves detail. So a painted staff gauge at the diversion is
a way a **polity raises everyone's competence ceiling at once** — the
town that builds one has made the water argument *factual for every
farmer in the valley*, including those who cannot read a river. That
generalizes far past water: **a public instrument is a political act that
redistributes knowledge.** Before the gauge the argument is about whose
eyes are better; after it, the argument must be about rights — the better
argument, which the town chose to have.

**The pre-season market.** Knowable in March means rights trade in April:
a junior sells out cheap, a senior leases what she will not need,
somebody borrows against a right that may not deliver (credit already
models terms and the Arrival Note). Financial content that is not about
coins, and the instrument being traded is **a date**.

**Water theft is the game's most sympathetic crime** — you open your
headgate at night because your crop is dying. Concealment handles the
act; the **detection is arithmetic**: the gauge upstream says the water
left and the gauge downstream says it never arrived. Forensics by
subtraction through the accountability ledger, and **everybody in the
valley can do the sum**, so the accusation is public before any authority
acts.

**Use beats date, sometimes.** Nobody cuts drinking water before alfalfa.
So the polity owns a **hierarchy of use** on top of the hierarchy of
dates, and getting the ordering wrong ends a career. Two independent
priority systems reconciled annually is a great deal of governance out of
one dry river.

**And the wet year.** Occasionally the crisis does not happen: the rider
has nothing to do, the gauge reads high all August, and the coalition
that formed around scarcity has no reason to exist — until it does again.
Institutions needed only *sometimes* are much harder to sustain than
institutions needed always.

### ⭐⭐ Winter defers, spring collects

The organizing idea of the whole cold design, arrived at four separate
times before it was named.

**Winter defers everything.** Nothing rots (`f_T` collapses). Nothing
drains (the mains are `frozen`). Nothing can be buried — the ground is
iron. Nothing can be built. Waste freezes and goes inert, so sanitation
is *easy* in January. Water is locked in the pack. Grievances have
nowhere to go, because everyone is in the one heated room.

**Spring collects all of it at once.** The body comes out of the snow.
The sewer thaws into a public-health event. The foundations have heaved.
The pack comes off as a flood. The ice house's inventory starts its
clock. The ice road stops existing and nobody owns the hole where it was.
Five months of deferral arrives inside three weeks.

⭐ A seasonal dramatic structure generated **entirely by physics** — a
long held breath and a reckoning — where the author's only job is to
decide *who owes what*. Write the realm's calendar around it: **winter is
where things are decided, spring is where they are paid for.**

### ⭐⭐⭐ The glacier and the ice core — a world with a history nobody wrote

Both say one thing: **because weather is a pure deterministic function of
time, the past is computable, so this world has a real history that no
author wrote.** The authors wrote a function; the history is a
consequence. There is no other place in this design where that is true.

And the pair maps onto the instrumentation ladder exactly. The
**glacier** is the crude public read — anyone sees the ice is a hundred
metres back from the old survey marker, no instrument, no competence. The
**core** is the precise instrumented read — a station, a bench, a
chemistry discipline, a number per year. One truth, two rungs, novice and
expert looking at the same fact.

**Two records that disagree.** The monastery kept a written chronicle;
the ice keeps its own. Where they diverge one is wrong, and **the game
knows which** — one of them is the function, the other is a document
somebody wrote. Chronicle already distinguishes a **deed** from a
**claim**; this is that distinction with a physical arbiter, so a player
can *audit history*. The monks were lying, or mistaken, or recording
something other than what they thought. All three are good, and only the
first needs a villain.

⭐⭐⭐ **And the climate function can tell an author where to put ruins.**
Evaluate it backwards and it names a decade that was brutal at 1500 m. So
that is where the abandoned village goes — abandoned for a reason that is
**true of the model**, discoverable with a core and a map, in a world
where nobody wrote the famine down. **The physics generates its own
archaeology**, and the author's contribution is a doorway and a name.

### The station — a vocation whose product is information

Run against the register's five criteria.

⭐⭐ **Criterion 2 (a gated capability) is the surprising one: the gate is
CONTINUITY.** A farmer could walk up the mountain in March and look at
the snow. What he cannot do is produce a **twenty-year series** — and
this March's figure is worth almost nothing until you know the mean. So
the asset is not the instrument or the altitude, it is the **record**,
and a record cannot be bought, rushed or reproduced by a competitor at
any price. It can only be *kept*. **Capital made of having not stopped**,
destructible in a way nothing else in the game is: a year you did not
fund is a hole in the series forever, and the hole devalues everything on
both sides of it.

⭐⭐⭐ **Which is the exact mirror of the fuel ration.** There, the cost
is unmeasurable and the arithmetic exact. Here, **the cost of running the
station is exact and the value of the record is uncomputable** — so
defunding it in a lean year looks obviously correct on any ledger a
polity can keep, and is irreversible. Nobody is wrong, and something is
lost. Annually.

**Criterion 4 (paid, not minted)** is where a research station usually
fails, and the honest answer is historically exact: **nobody funds the
science.** The station is the only thing at that latitude, so it is also
the lighthouse, the rescue post, the mail relay, the shipping report and
the garrison. Its budget comes from six parties who each want one of
those, and **the cores get drilled on the back of the mail contract.**

**Criterion 1 (unmet demand)** has four specific buyers: the farmer
choosing what to plant in April · whoever is buying a junior water right
cheap · the miller deciding whether to sign for ten sacks a week in
August, when his power *is* the river · and the whaling company deciding
where the ice edge will be in June. ⭐ That last is a coupling nobody
designed: **a knowledge trade and an extraction trade sharing a season
and a window.**

**Criterion 5 (a failure mode)** is the best part, and it is not fraud —
it is an **instrument that drifted and nobody noticed for three years.**
*Error as the signature of authorship.* And it is detectable, because the
core is a physical proxy that can audit the station's own written record:
the monastery problem with the scientist as the unreliable narrator, who
is unreliable **by accident**.

**The quiet power.** A station at a known altitude with good instruments
becomes where other instruments are checked — so it holds **the
standard**. Measurement's three layers say the engine measures, the
subject values, the polity imposes; whoever holds the standard does
layer-3 work while appearing to do layer-1. Political power wearing
neutrality as a costume.

**Who is there.** A tiny crew, no exit, five months — and by our craft
rule they are **genuine**, which means they volunteered, which is
stranger and better than being trapped. The person signing on for a
second winter is the character to write first. The station's year has one
beat: **the relief ship** — resupply, crew change, mail, and the year's
data going out in a box. Miss the window and you do it again.

### The rest of the content register

Smaller, and each one a row or a place rather than a system.

- **Snow as terrain, not weather.** Snow depth is a named Wave-2
  deferral; `Enablement.ts` already ships `Climbable` / `Flyable` /
  `Swimmable` — three exemplars of a mode gated by what is in front of
  you. Ski and sled are the fourth, with a **new enablement axis: a mode
  enabled by GROUND CONDITION** rather than by body or augment. ⭐ And
  sledding is **haulage** — logistics' cost surface with the sign flipped,
  where runners beat wheels. The arctic gets its own logistics economy
  instead of being a dead end, and the vehicle that works five months a
  year is the first **seasonal capital good**.
- **Mountaineering is two shipped halves meeting.** Pressure already
  derives from elevation; respiration already models asphyxiation and
  `breathableMedia`. Altitude sickness is the product and needs nothing
  new. Avalanche rides `HazardMixin` off the `snowpackMm` the watershed
  **already computes**; whiteout is concealment's honest fog. ⭐ The pass
  that opens in July prices horizontal passage *naturally* — the
  Deliverance gap answered by a season instead of an invented toll.
- **A settlement that cannot feed itself.** Short season + husbandry's
  `cold` makes the polar town the first that **structurally must import
  food**, so the sixteen needs become a supply line and the supply line is
  seasonal. ⭐ Then **`vitamin-c`** finishes it: the historical polar
  catastrophe is not cold, it is **scurvy**, and the stock already drains
  on a dial. A cache of preserved citrus becomes the most valuable thing
  in a warehouse, and *why* is derivable from a player's own body readout.
- **Fire stops being a tool and becomes life support.** Forestry does not
  reach a treeless arctic, so fuel is imported coal, peat, or blubber —
  and blubber closes the whaling loop exactly: **the whale heats the house
  that renders the whale.**
- **Water staying liquid is the hardest civic problem in the realm.**
  `frozen` already exists and `Conduit`'s own doc says a sewer is the same
  object reversed, so **a frozen sewer is a public-health event** with
  contamination waiting underneath. The heated main, the **water carrier**
  as a real trade because the pipes are dead five months a year, the thaw
  crew as a seasonal posting on the labor board. Lens 7: who pays to keep
  the pipes warm, and what happens the year they do not.
- **Polar night reorganizes a town's day.** Shifts park off-shift cast
  offstage; unlit interiors are pitch black. Three months of darkness
  means the town runs on **clock-time rather than daylight**, and the
  lamp-oil civic bill becomes a budget line rather than flavour. The
  lights going out is a **governance failure**.
- **Latitude as strategic geography.** Extreme latitude is where you put
  what you want far from everyone — a prison, a quarantine, a test range,
  a monastery: the **LULU**, a shipped settlement type with no exemplar.
  ⭐ The second-order fact is better: the route *past* the pole is short,
  so a place nobody wants to live is a place everybody needs to transit —
  a chokepoint with a garrison and a toll.
- **Ice as a building material.** Structure's doctrine is
  maintenance-before-construction, and an ice building is the limit case:
  **its decay rate IS the ambient temperature.** A settlement whose
  buildings are seasonal and rebuilt each winter, where spring is
  architectural rather than agricultural. Materials are a closed
  vocabulary, so this is a row and a thermal coupling, not a system.
- **The people who already solved it.** By our own craft rules: an arctic
  people whose technology is **better than the station's** at the thing
  that matters, because they have had ten generations on the problem and
  the station has had instruments. ⭐ The conflict is **already located** —
  the station needs what they know and cannot buy it with zorkmids — so
  nothing has to be invented to make it dramatic. *Specific about things
  we own*: their material culture derives from what **this** realm's
  arctic supplies, which the mechanism now tells us, rather than being a
  real people with the serial numbers filed off.
- **Frost heave.** Freeze–thaw destroys foundations, roads and buried
  pipe. Ground ships a floor per location; structure is maintenance-first.
  So a northern building needs more upkeep for a reason that is physics,
  and a fifty-year-old house is **visibly wrong** — out of plumb, doors
  that will not shut, a floor that slopes. An author writes that once and
  the system justifies it forever.
- **The cold forge.** Quenching is faster in a cold shop, which moves the
  grade, and metallurgy carries grade end-to-end. A northern smith's work
  is measurably different and **nobody authored a regional reputation** —
  it emerged from the ambient. ⚠ Weakest item here; may be a detail
  pretending to be a system.
- **Hot springs.** One warm place in a frozen realm: liquid water, a
  bath, the only greenhouse, the only ground that grows in February. A
  resource that **is a location** — the reach/`Shore` shape — and the most
  contested square metre in the region.
- **For whaling specifically:** the ice edge is where the whales are, and
  **the ice edge moves**. A seasonal passage that opens and closes is an
  `Expanse` whose traversability is a function of climate — and being
  **frozen in** is a vessel-as-room-that-moves with its exits closed until
  spring. The historical whaler's catastrophe is **a location becoming a
  prison**, which the model can already express.

---

## Open questions

1. ✅ **RESOLVED — how cold, and where?** Not a realm-wide deviation and
   not latitude bands: **latitude as a resolved field**, temperature
   **derived from insolation**, the watershed's lapse rate generalized on
   top. See § *The unified model*.
2. ✅ **RESOLVED — is winter a season or a PLACE?** A false fork. They
   are **different terms in one sum** — season is time, place is space,
   and they add.
3. ⭐ **Does the metabolic rebalance come first?** Still open, and now
   sharper. The naked-Cast finding says an unfed body dies by game-hour 7
   at 295 K; at 265 K it dies faster, and every drive longer than four
   game-hours would have to feed its actor. ⚠ Note the **ordering relief**
   insolation buys: a cold *place* at high latitude can ship while sea
   level stays mild, so the metabolism dials gate the **amplitude at 42°**
   rather than the build.
4. ✅ **ANSWERED — what does a player DO about it?** § *What it is FOR*.
   Fuel, cloth, a cellar and stored food were the old answer; the real
   one is the fuel ration, the warming house, the August crisis, the
   station's record, and the thaw.
5. **Hemisphere.** `seasonFor` takes no latitude. Is the two-hemisphere
   edit in this build (it reaches `SEASON_BIAS`, husbandry windows,
   `TapWindowSpec.rising` and the watershed table) or the one after? ⭐ It
   is what lets a fleet **follow the season**.
6. **Rain-on-snow.** A term, or a stated simplification? (§ Snowmelt.)
7. **Snow depth.** A named Wave-2 deferral, and the input the
   ground-condition locomotion axis needs. In this build or beside it?
8. **Does the unification delete the watershed's four-row table**, or
   does the table stay as the reach's fallback where no biome resolves?
   ⚠ Two sources of truth is what caused this slate; one of them has to
   become derived.

---

## Cross-references

- [taps.md](../../subsystems/taps.md) — the window kinds, and the maple
  row that is waiting for this
- [ice-trade-slate](./ice-trade-slate.md) — blocked on this slate;
  ⚠ its **altitude gift** is corrected here (altitude is zero on an
  expanse, so it cannot be the only spatial axis)
- [navigable-water-slate](./navigable-water-slate.md) — the `Expanse`,
  and whaling's parked findings
- [weather.md](../../subsystems/weather.md) ·
  [thermal.md](../../subsystems/thermal.md) ·
  [spoilage.md](../../subsystems/spoilage.md) ·
  [soil.md](../../subsystems/soil.md) ·
  [watershed.md](../../subsystems/watershed.md) ·
  [textiles.md](../../subsystems/textiles.md) ·
  [instrumentation.md](../../subsystems/instrumentation.md) ·
  [locomotion.md](../../subsystems/locomotion.md)
- [content-craft.md](../../content-craft.md) — the craft rules § *What it
  is FOR* leans on: three voices, homage in the details, *locate conflict
  don't invent it*, cultural content, error as the signature of
  authorship
- [design-lenses.md](../../design-lenses.md) — ⭐ the lenses are the
  instrument that **found** this content, not a scorecard applied after
