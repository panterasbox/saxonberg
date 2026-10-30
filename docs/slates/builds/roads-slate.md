# Roads slate — circulation the author draws, and the surface that costs

> **Status: UNBUILT** — designed at high level 2026-10-20 with the owner, out of
> the gap walk. Lanes are induced from exits that admit a mode, and one
> `wheelPassable: false` on the pass breaks bulk at the crossroads
> ([logistics.md](../../subsystems/logistics.md)); every place's floor knows its
> material and derives its kind, `mire` from standing water
> ([ground.md](../../subsystems/ground.md)); a lane already has an `operator`. But
> **nothing about travel reads the surface** — haulage's `draftFactor` is a
> constant on the cart (a wheeled cart ~0.03, a dragged sledge ~0.35,
> [encumbrance.md](../../subsystems/encumbrance.md)) — and ground.md lists
> *"consequences of the read — traction"* as an open seam. Crude's `asphalt` cut
> ships with no consumer.
> **Left:** the circulation library (way kinds and the road exit kind as parent
> rows in the commons) · draft as running gear × surface · the season deciding the
> road (mud, frost, the sledge) · building a road as changing its surface (the
> ladder to asphalt) · McAdam's drainage · wear by tonnage · who pays (the
> turnpike, statute labor, public works) · the valley road as the first venue
> **Size:** a build (content library + a kernel read)

## 0. ⭐⭐⭐ Roads are not opt-in **[DECIDED — the owner]**

*"Roads in this game aren't just content for content's sake. If you're going to
build any kind of area here where you're crafting Locations, you're going to need
some kind of road or path to get to those locations. A coffee shop and a bakery
across the street from each other need the road in the middle … when someone sets
out to write content, many times what they start with is a location map. And that
location map almost always needs some kind of connective whatever … they're sort
of non-negotiable content."*

The word is **circulation** — the architects' term for corridors, stairs and
streets taken together, already the kernel's (`CirculationWarren`,
[holding.md](../../subsystems/holding.md)).

## 1. ⭐⭐⭐ The author draws the map; inheritance writes the boilerplate **[DECIDED — the owner]**

A first draft proposed deriving an authored street's reaches from its frontages.
The owner rejected it: *"most authors want to hand draw their maps. Crafting the
map is often the most expressive part of the content development process — why
outsource it to procgen code that won't do as good a job? That said, hand writing
every little Place on the street's nodegraph is probably a job that no one wants to
do … but that's what template inheritance is supposed to solve, so the only part
you need to do is giving everything an identity by choosing template paths."*

So a reach is a few lines — **its identity, its parent, its name, its exits** —
and a row's `extends:` one parent, resolved at read
([templates.md](../../subsystems/templates.md)), brings everything a way of that
kind has. The settlement model's sizing rule (*"as many street rooms as you have
things worth standing in front of, plus the minimum to connect them"*;
*"prose is bulk, Stuff is few"*) stays the author's judgment, not code.

### The circulation library — parent rows in the commons

| kind | surface | comes with |
|---|---|---|
| city street | setts | lamps, a drain, wheels |
| high street | setts | lamps, a drain, wheels; frontage both sides |
| alley | setts or earth | narrow (the [size slate](./size-slate.md)'s clearance); no wheels |
| village lane | earth | wheels |
| country road | gravel or earth | wheels |
| track | earth | wheels when dry |
| trail | earth | foot only |
| towpath | gravel | beside the water |
| corridor, stair | boards, stone | indoors |

The same for **exit kinds** ([boundary.md](../../subsystems/boundary.md) already
has exit-kind templates): a **`road` exit** carries `media: [ground]` and admits
wheels — removing the trap logistics warns of, where a corridor authored the
ordinary way gets a wheeled lane that compiles empty because nobody declared the
media. Every default is overridable; the pass is narrow because its author said so.
This is starter-pack content of exactly the kind a new team should inherit.

## 2. ⭐⭐⭐ The surface sets the cost **[DECIDED — lens 1]**

The force to pull a wheeled load is **rolling resistance × weight**, plus the
grade, and the coefficient depends hugely on the surface:

| surface | rolling resistance, roughly |
|---|---|
| rail | ~0.001 |
| asphalt | ~0.01 |
| macadam, setts | ~0.02–0.03 |
| packed earth | ~0.05 |
| mud, sand | 0.1–0.3 |

⭐ **Draft becomes running gear × surface.** Today `draftFactor` is a constant on
the cart; it becomes the coupling of what the vehicle runs on (wheels, runners,
feet, hooves) with the floor under it. The same horse moves several times the load
on a good road as on mud — why turnpikes, canals and railways each remade an
economy. The freight cost surface and the route planner's cost per axis
([location-graph.md](../../subsystems/location-graph.md)) derive from the road
rather than from authored numbers. Walkers care much less than wheels.

## 3. ⭐⭐⭐ The season decides the road **[DECIDED]**

Nothing new — shipped weather meeting shipped ground:

- **Rain turns an earth road to mire** (the kind is already derived from standing
  water) and its cost spikes. ⭐ **Mud season** — Russia's *rasputitsa*, New
  England's "mud time" — closes dirt roads every year; a wet spring on the valley
  road strands the cannery's freight.
- **Frost hardens it**, and ⭐ the **sledge on snow** has a low draft where it has a
  high one on dirt: the winter road and the ice road from the same coupling — the
  ice trade's sledges gain a real season.
- The route planner's plan already *"states its assumptions"* — a route reads
  *"assuming dry roads."*

## 4. ⭐⭐ Building a road — changing its surface **[DECIDED]**

Improvement changes the floor's material, through the kernel's ground improvement
(ground.md) and construction's sites ([construction-slate](./construction-slate.md)):

| surface | needs |
|---|---|
| earth track | nothing |
| corduroy | logs laid across mud (forestry) |
| gravel | quarrying |
| setts, cobbles | quarrying's shipped `split` |
| ⭐ paving brick | the ceramics build's **clinker**: the clamp's over-burnt grade, hard and nearly impervious, and the Dutch *klinker* road. It is the buyer for the clamp's worst bricks. |
| ⭐ macadam | broken stone in graded layers, compacted, **cambered and drained** |
| tarmac | tar-bound macadam (tar ships) |
| ⭐ asphalt | **crude's `asphalt` cut — its first consumer** |
| concrete | cement (a gap) |

⭐ **McAdam's insight was drainage, not stone.** A road fails from water beneath it,
not from traffic on it; the road is a drainage structure. Water is already a field
on the ground, so an undrained road that ruins in a wet year is derivable. The
ceramics build's **drain tiles** are one way a road is drained.

## 5. Wear, and who pays **[DECIDED — lenses 6 and 7]**

- **A road wears by tonnage** — ruts, potholes — and by water (frost heave): the
  *goods wear by use* clock applied to a surface everyone uses.
- **A road is the classic public good**, and history's three answers are all
  choices a polity makes, with the engine supplying each:
  - ⭐ **statute labor** — English parishes owed each household a set number of
    days' road work a year: a labor levy, with a criterion;
  - ⭐ **the turnpike trust** — investors pave the road and recover it through
    tolls at a gate: the lane's `operator` plus a toll on its exits;
  - **public works** — the treasury pays: the
    [markets slate](./markets-slate.md)'s public spending as the faucet; road
    building is its natural first project.

## 6. The first venue — the valley road

Between Terminus and Heart's Delight. Its mud season cuts the
[cannery](./cannery-and-bottling-slate.md) off from its market, so improving it is
a real investment with a visible return — and a natural first turnpike.

**The drive, in one line:** in a wet spring your wagon of canned apricots bogs on
the valley road and the route planner reads *"impassable while wet"*; the
turnpike trust has macadamized the lower mile, and you pay the toll at the gate to
reach the depot in a day instead of three.

## 7. Lens pass

1. **Pedagogy** — rolling resistance; the season and the road; drainage over
   stone; the public good. Decided §§ 2–5.
2. **Expression** — ⭐ the map stays the author's; the library removes the
   boilerplate. Decided § 1.
3. **Immersion** — the street between the bakery and the coffee shop; the mud.
   **Participation** — the turnpike's investors, the road gang, the toll-keeper.
4. **Values** — who should pay for a road everybody uses.
5. **Continuity** — earth → macadam → asphalt; the same draft coupling across
   wheels, runners and, later, rubber tires.
6. **Economy** — freight cost derived from surface; the toll; tonnage wear as
   upkeep income. The demand (every haul) was there first.
7. **Governance** — statute labor as a levy; the turnpike's charter; public works.

## 8. Open

1. **Where the library lives** — base-library, or a circulation pack.
2. **The draft coupling's table** — running gear × surface class, and where it
   lives (on the gear, on the material, or both).
3. **Wear's clock** — tonnage counted per reach, reconciled on read.
4. **Grade** — whether a reach's slope is authored or derived from zone elevation.
