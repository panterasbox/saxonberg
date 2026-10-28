# Flight slate — the third medium, on the exit graph

> **Status: UNBUILT** — designed at high level 2026-10-20 with the owner (*"I'll let you
> drive this one … that could touch many many different systems so let's talk about it in
> the abstract"*). An **umbrella**: the substrate every flyer inherits, and the flyers in
> brief; each flyer becomes its own slate when it is built, as maritime fanned out. What
> ships: the `fly` and `aerial` locomotion modes and `FlyableMixin`, and **exits that
> declare their media** — `media: ['air']` admits fly and aerial
> ([locomotion.md](../../subsystems/locomotion.md)); construction's `Exposure` (whether a
> place has sky); weather's wind, clouds and storm lightning; insolation; pressure and
> temperature by elevation; the expanse's spherical chart and *sight by curvature*.
> **Left:** the sky column · flight by exits that admit air · the craft size rule ·
> falling, and staying up gated on lift and power · air as a medium row · seeing and being
> seen · airspace · weather · magic's price · the flyers (balloons, airships, creatures and
> pigeons, gliders and planes, magical flight)
> **Size:** a build program — several builds; this slate is their common ground

## 0. The shape maritime already gave us

| need | water | air |
|---|---|---|
| **local vertical** | the water column — depth bands below a surface ([underwater-slate](./underwater-slate.md) § 3) | ⭐ **the sky column** — altitude bands above a place (§ 1) |
| **long distance** | the expanse — a course across open sea | the expanse over land (§ 2) |
| **arrival** | *alongside* a room; harbors | landing where an air exit allows; the mooring mast; the landing field |

## 1. ⭐⭐⭐ The sky column **[DECIDED]**

> **Any outdoor place with open sky has a column above it**, budded by a sky Warren keyed
> to that ground place, **only while something is up there** — an empty sky costs nothing.

- **Open sky is already computed** — construction's `Exposure`
  ([construction.md](../../subsystems/construction.md)); a covered market has no column, a
  street does.
- **Bands come from the air, never from feet** — **the rooftops** (just clear of obstacles;
  seen and heard by the street) · **the low air** (you hear the town, the town sees you,
  arrows reach you) · ⭐ **the cloud** (weather's cloud forms ship: inside is fog, above is
  sun over a sea of white) · **the thin air** (breath and warmth fail — pressure and
  temperature by elevation ship).
- **A band has no floor** (water's `noDefaultFloor`); the ground place's floor is the only
  standable surface.
- **A party is together by sharing a band**, as underwater.

## 2. ⭐⭐⭐ Flight travels by exits that admit air **[DECIDED — the owner]**

The first draft let flight move by geometry and bypass the exit graph. The owner corrected
it: *"flight can't take you just anywhere. It can only take you somewhere connected by
location exits. There are some places that can only be reached by riding the TPA network,
you shouldn't be able to just fly to those places — they exist either in another
dimensional plane or outside the atmosphere and only reachable by rocketry."*

- **A flyer crosses only exits whose media include air** — the same exit graph everyone
  walks, with air edges where an author put them (the shipped `media` field).
- ⭐ **The bypass is an author's decision, edge by edge** — an exit over the cliff, across
  the gorge, onto a rooftop, over the town wall exists only if its author made it admit
  air. A walled city with no air exit over its walls stops flyers as it stops walkers.
- **The sky column** (§ 1) is vertical movement at one place, not a way round the graph.
- **Long crossings use the expanse**, entered through an exit (taking off from a place that
  admits it), landing at nodes an author connected — as the sea does.
- **Out of reach by flight** — **another plane** (only the TPA,
  [fasttravel.md](../../subsystems/fasttravel.md)) and **beyond the atmosphere** (only
  rocketry — the [orbit slate](./orbit-slate.md)'s launch from the pad).

## 3. The craft size rule **[DECIDED]**

Underwater's rule carries over unchanged: *"a small craft is a Thing inside the water's
room; a big one is its own Location, positioned … touching the water's rooms only through
crossings resolved at the moment you cross."*

- **Small** — a bird, a person flying by magic, a kite, a balloon basket: a Thing in the
  band.
- **Big** — an airship: ⭐ the [ships model](./ships-and-harbors-slate.md), a structure whose
  position is a variable, moored **alongside a mooring mast** (the Empire State Building's
  spire was designed as one).

## 4. ⭐⭐ Falling, and staying up **[DECIDED]**

Mirroring underwater's *"ascent is never gated on skill — only on breath and ballast"*:
**staying up is never gated on skill — only on lift and power.**

- **Falling is the default** — in a band nothing holds you but lift; lose it (the burner
  out, the spell lapsed, the bird tired) and you **fall** through the bands to the ground
  place, with harm **derived from the height** (fall energy) — the rule the
  [construction slate](./construction-slate.md)'s scaffold falls share.
- ⭐ **Skill lives in efficiency, navigation and the landing**, never in a random fall: a
  hard landing comes from descent speed against the pilot's competence, deterministically.

## 5. Air is a medium row **[DECIDED]**

Underwater's rule: a medium row carries **physical properties**, and **a refusal belongs to
the mechanism a verb uses**. Air's row: **density** (buoyancy and lift, thinning with
altitude) · **temperature** (falling with height) · ⭐ **wind by band** (weather's field read
at altitude — the shear balloonists navigate by) · **visibility** (cloud, fog, night) ·
**sound** (carries up — you hear the town) · **breathability** by altitude
([respiration](../../subsystems/respiration.md)).

## 6. ⭐⭐ Seeing and being seen **[DECIDED]**

- **Height extends sight** — the expanse's *sight by curvature* gives the horizon from any
  band.
- ⭐ **Flight explores** — what you see from above becomes **"seen" claims on your own map**
  ([location-graph.md](../../subsystems/location-graph.md)); the firewall holds (the true
  index never reaches the client), and **sight is not travel**: you may see a valley you
  cannot fly into. The first military use of balloons was observation; aerial survey
  remade mapmaking.
- **The sky has no cover** but cloud and night — a flyer is visible for miles.

## 7. ⭐⭐ Airspace — scaled to where air exits exist **[DECIDED — lens 7]**

- **Who owns the air** — *whoever owns the soil owns it up to the heavens* (*ad coelum*)
  until aviation; **United States v. Causby (1946)** held a landowner owns the airspace they
  can reasonably use near the ground, and above that is a public highway. ⭐ **Parcel title
  reaches the rooftop band** — trespass there is trespass — and above is public air the
  polity governs.
- **Borders by air** — an air crossing at a border exists only where an author made one;
  customs' ports of entry ([ships-and-harbors-slate](./ships-and-harbors-slate.md) § 19)
  cover it. The **exclusion sanction** covers its extent's rooftop band.
- **National airspace** (the Chicago Convention, 1944) — the multilateral version the
  [diplomacy slate](./diplomacy-slate.md)'s body of realms would inherit.

## 8. Weather is flight's master **[DECIDED]**

Weather ships ([weather.md](../../subsystems/weather.md)): **wind drift**, **storms** (storm
lightning ships), **icing**, **fog that grounds you** — *whether you fly today* is a weather
reading. ⭐ **Thermals** — rising air over sun-warmed ground — derive from insolation (which
ships): what gliders and soaring birds ride.

## 9. Magic pays for flight **[DECIDED]**

[arcane-science.md](../../arcane-science.md)'s price list: holding a body still in the air
costs a great deal of energy per second, so **true magical flight is expensive and short**,
and **levitation** (rising and sinking, buoyancy-like) is cheaper. A flying carpet is a
small craft with its own mana bill (`ManaPowered`). Magic is bound by air exits like
everything else — it does not open the graph.

## 10. The flyers

### Balloons — the honest first rung

- **Buoyancy, derived** — hot air (a burner: fuel), or ⭐ **coal gas from the gasworks**
  (really used — the gasometer ships); hydrogen later, from the
  [chemical works](./chemical-works-slate.md). The Montgolfiers, 1783.
- ⭐ **You cannot steer — you go where the wind goes**, and navigate by **changing
  altitude** to find another wind layer: band-by-band wind, the purest navigation lesson in
  flight.
- **Landing** wherever the wind and an air exit allow, dragging the basket through a field.
- **Uses** — observation, the [festival](./festival-slate.md)'s balloon ride, surveying.

### Airships

- A ship — steerable, engines from the [machines slate](./machines-slate.md), moored
  alongside a mast, crossing the air expanse.
- ⚠ **Hydrogen burns** — the *Hindenburg* (1937) ended the airship era in an evening; helium
  is safe and scarce: a values-and-epoch lesson derived from fire's ignition.

### Creatures

- **Birds** have the fly mode already; the bands give them somewhere to be.
- ⭐ **The carrier pigeon** homes to its loft, so it carries a message one way — home: the
  post's first air mail, and the animals cluster's best case.
- **Ridden flyers** (griffin, dragon) wait on the bestiary, and inherit
  [horsemanship](./horsemanship-slate.md)'s *two minds*.

### Gliders and planes

- **Lift needs airspeed** — gliders ride thermals; planes add power (the machines slate's
  movers). Lilienthal in the 1890s; the Wrights in 1903.
- ⭐ **The landing field** — open sky and a long clear run: the [size slate](./size-slate.md)'s
  clearance laid flat; a plane lands only where an author built one.

### Magical flight

Priced (§ 9); a carpet as a craft; bound by air exits.

## 11. The lens pass

1. **Pedagogy** — buoyancy; lift and the stall; wind shear and balloon navigation;
   thermals; the lapse rate and thin air; the horizon from height; fall energy.
2. **Expression** — ⭐ air exits are the author's: where flight is possible is a design
   choice; a realm's flyers, landing fields and mooring masts.
3. **Immersion** — above the cloud; the town heard from the low air; the basket dragging
   through a field. **Participation** — the aeronaut, the pigeon fancier, the observer, the
   airfield; the festival balloon.
4. **Values** — hydrogen's danger; the view from above (privacy, surveillance); the wall
   that no longer protects where an author lets flyers over.
5. **Continuity** — kite → balloon → airship → glider → plane; creature and magic beside
   them: the same `fly`, ascend, descend and land.
6. **Economy** — coal gas and burner fuel; air mail and pigeons; observation and survey; the
   speed premium for light, urgent freight (value density).
7. **Governance** — airspace and *Causby*; ports of entry by air; national airspace.

## 12. Open

1. **The band list** — which bands, and how cloud height and the thin air derive.
2. **Air exits** — authoring defaults (does an outdoor exit admit air unless told not to?),
   and how the expanse is entered and left by air.
3. **The sky Warren** — budding and reaping, keyed to the ground place.
4. **Fall harm** — the shared rule with construction's scaffold.
5. **Each flyer's own slate** — balloons first.
