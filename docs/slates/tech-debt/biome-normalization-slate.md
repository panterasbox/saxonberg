# Biome normalization slate — what a biome is a claim ABOUT, and how narrow one may get

> ⭐⭐ **Job 2 is ANSWERED by the rubber build (2026-10-16)** →
> [construction.md](../../subsystems/construction.md) · [rubber.md](../../subsystems/rubber.md) (shipped, MR !379): sky
> exposure leaves the biome. A place's construction is **walls + roof**
> (material + thickness, layered, or none), owned by **the place
> itself** — a `Structure` owns only membership and storeys (a tree,
> `on:`; no `open:`, no materials); one rule — *a face is exterior unless
> the space across it is an enclosed place of the same structure* — answers rain · light (Beer–Lambert) · sky
> view · wind · heat for every face, and `onGrade` stops borrowing the
> sky bit. `SkyExposedBiome` retires. The rest of this slate (dressing,
> air, granularity) is untouched.

> **Status: DESIGNED** — the design conversation was held 2026-11-28 with the owner (§ *The design*
> below). What a biome IS is decided: a kind of country or kind of water, never a room; indoors is
> construction; mountains are Landforms; the old air tree becomes `CelestialBody`; anthromes sit
> beside biomes; danger is the mana field. ⚠ Everything from § *The catalogue, as it stands* down
> predates that conversation and is **superseded where it disagrees** (the test *"a biome is a claim
> about the AIR"* above all — the air is no longer a biome).
> **Left:** the build — the biome and anthrome rows and their pack · the old air tree re-cut as
> `CelestialBody` (medium and free fall as place states, temperature derived underground) · the
> Landform sibling and `Structure` made abstract (with [mountain-slate](../world/mountain-slate.md)) ·
> the slope sequence and band derivation · the drainage-basin list · the dressing moved to country
> scale. ⚠ How a species list becomes animals and plants you can find is **NOT this design's** — § D12.
> **Size:** a build

Captured 2026-09-24, out of the envelope build's design conversation.
The user's framing: *"we haven't even had a conversation about
granularity or how narrow biomes get vs just being room classes by
another name."*

## ⭐⭐⭐ The design (owner, 2026-11-28) **[DECIDED]**

Held with the master agent, as the owner asked (*"if it's not gonna end in a build we should slate the
conversation for elsewhere"*). The owner's method, and the order it was argued in: *"start with what we
even mean by 'biome' and relate that to other game systems … then we can talk about what's unique
about Saxonberg … what I don't want to do is start with whatever is in the /biome/ tree right now and
try to work backwards."*

⚠ **Corrects the note this section replaced:** `_extendsBiomePath` was retired on 2026-09-25 — biome
rows already use the ordinary `extends:` ([biome.md](../../subsystems/biome.md) § *The parent link is
the TEMPLATE's*). Only the per-read resolve stays biome's (it names the ancestor that supplied each
value). There was no inheritance choice left to make.

### What players already expect (the survey)

Every game teaches the word, and players arrive knowing it:

| game | what a biome is there |
|---|---|
| Minecraft | a region set by temperature and rainfall — terrain, plants, spawns, rain or snow, colors, music; **cave biomes** and Nether biomes since the cave update |
| Terraria | derived from the blocks around you, so players create and spread them; the dungeon counts (built, but about what it is made of) |
| Valheim | large regions in a progression order, each a danger tier; Mountain needs frost protection |
| RimWorld | the world tile's climate, plants, animals, diseases — and ⭐ **indoors is a different concept**: a room has computed stats and a role from its furniture |
| Dwarf Fortress | derived from elevation, rainfall, temperature, drainage, savagery and alignment; three cavern layers underground |
| No Man's Sky, Breath of the Wild | a hazard (cold, heat, toxic air) met by gear — and **interiors shelter you from it** |
| Stardew, Pokémon | a list of what is found here, by season or time or method |
| 4X games | muddled with terrain types and their yields |
| Diku MUDs (our lineage) | room **sector types** — `inside` and `city` beside `forest` and `underwater`: room classes by another name |

**The expectations distilled:** a biome is a recognizable kind of country, large and shared; it decides
what lives and grows there; it sets the environmental challenge; climate drives it; caves and
underwater count; **built interiors never do** — no game has an office biome. Plain English agrees: a
large community of living things shaped by a common climate.

### D1 · A biome is a kind of country or a kind of water

Shaped by climate; a reusable type, **never a specific place**. Temperate oak wood, moor, salt marsh,
alpine meadow, temperate coastal sea, estuary.

### D2 · The nesting — biome ⊃ Locality ⊃ Structures ⊃ place

- **A Locality says which biome it lies in** — the Weeping Moor is *a* moor. A Locality is a specific
  instance; the biome is the type.
- ⭐ **Indoors is never a biome.** Indoors or outdoors is each place's own walls and roof
  ([construction.md](../../subsystems/construction.md)); a building moderates the country outside it,
  which the envelope already computes. What a room is *for* (a granary, a kitchen) is a separate idea
  again — closer to RimWorld's room role.
- **Who cites a biome:** a Locality, and a Landform's slope sequence (D5). A place only as an exception
  (a walled garden).

### D3 · Caves, the water's depth bands and the tide line are habitats within a biome

Ecology's answer, not games': a cave is a place in the moor or the mountain whose conditions (dark,
damp, steady temperature) do the work. A cellar is a Structure's place with cave-like conditions. Deep
sea is the dark bands of a marine biome.

### D4 · Big water is a biome; rivers are within the land

- **The sea, an estuary, a large lake** are biomes — classed by salinity, then temperature, then depth
  and light.
- **A river, a stream, a pond** runs through many land biomes and is a habitat within the land's.
- ⭐ **Freshwater species follow the drainage basin.** By real biogeography, freshwater life (fish,
  mussels, crayfish, many water plants) cannot cross a watershed divide, so which of them can be in a
  river comes down its **basin**, not the land around it. The basins already ship
  ([watershed.md](../../subsystems/watershed.md)).
- Where land meets water (shore, mudflat, marsh edge) a place sits in both lists.

### D5 · A mountain is a Landform; its places climb through a stack of biomes

- **Altitudinal zonation** — foothill wood → conifer → treeline → alpine meadow → rock → snow; about
  6.5 K colder per kilometer.
- **Each biome row states its climate range.** The mountain's Locality **names the sequence** of biomes
  on its slopes, bottom to top — **one per side** where there is a rain shadow. **Which band a place is
  in is derived** from its temperature (latitude, weather and — with the lapse rate — height).
  *Names authored, placement derived*: warm the climate and the treeline climbs by itself.
- **Aspect** (a south face sits higher), **the body at height** (thin air, cold) and **danger** are
  conditions, never a label.

### D6 · Structure becomes abstract; Building, Ship and **Landform** are siblings

- A `Structure` is *a set of places that together are one thing seen from outside* — what the sea
  sights. Since the paint build `Building` is the subtype with an outside; a mountain is not one.
- **Landform** — mountain, volcano, sea stack, headland, cliff, island, a cave system: members, an
  appearance from afar, no outside to paint, no storeys.
- ⭐ **A place belongs to at most one built structure and at most one Landform; nothing nests.**
  Innermost wins within a family; across families they are two different questions — the boiling
  house kitchen is in the boiling house *and* on Waponi Woo. The owner: buildings and ships never nest,
  and nesting is refused without real use cases.
- ⭐ **One owner per fact:** elevation is the ground's; a Landform's landmark height is **derived** from
  its highest member place, never authored (today's peak authors `heightM: 1100`).
- **Drops [mountain-slate](../world/mountain-slate.md) § 1's horizon-feature split.** Waponi Woo's peak
  becomes the first Landform; Gannet Rock is probably a Landform with a Building (the light) on it.

### D7 · What a biome row carries

- **its climate range** — land: mean temperature and rainfall (the biome chart); water: temperature
  and salinity;
- **its names** — the species that belong there, plants, animals and fungi;
- **what it is like at the scale of a country** — birdsong, wind and curlews, heather smell. ⚠ Room
  scale stays in the room's prose: the cafeteria-gravy failure was the *scale*, not the idea.
- **Nothing else** — no temperature (derived), no danger (mana), nothing about buildings.
- Inheritance is the ordinary `extends:` (temperate oak wood extends temperate broadleaf forest). How
  lists merge under `extends:` is the build's.
- ⭐ **An author's mistake shows instead of being refused** (soft limits): an oak wood at a tundra
  latitude stands, its climate range disagreeing with the derived climate where an author can see it.

### D8 · The old air tree becomes **CelestialBody**

The owner: *"what about zero-g content or space content? … Atmosphere might not always be the best
word."* Applying the rest of the design to today's `Biome` rows:

| job | where it goes |
|---|---|
| temperature | **derived** everywhere — climate under the sky, walls and roof indoors, and ⭐ **underground from the ground's annual mean** (a cave or mine authors none) |
| sky exposure | construction (shipped) |
| water as the medium | a state of a place (the water pack's water places) |
| free fall | a state of a place ([worlds-slate](../world/worlds-slate.md) § 8: orbit is free fall, not zero gravity) |
| **what remains** | **the celestial body** — radius and mass (gravity derived), day, year, suns and moons, and **its atmosphere** (the gas and its sea-level pressure); the root is interplanetary space |

So `atmosphere` becomes a property of a body, the way astronomers use it. A station is a Structure
whose spin gravity is a local override with a cause; a sealed habitat gets its air from its walls and
life support. Worlds-slate § 2's *"a body is a biome"* becomes *a body is a CelestialBody*. ⚠ Not
`Environment` or `Setting` (the shell owns both words) and not `Body` (a creature's).

### D9 · Towns are Localities in a biome — and anthromes sit beside biomes

- **A town is not a biome.** What makes it different is physical facts its places report — paved and
  built ground, shelter, stores, refuse, warmth, light at night — **never zoning**: land use is a legal
  permission on a parcel, and a lot zoned residential that is still forest is forest.
- ⭐ **Anthromes** (anthropogenic biomes — Ellis and Ramankutty's map of the land by what *people* made
  of it: dense settlements, villages, croplands, rangelands, wildlands) are a **second axis beside the
  biome, not a combined tree**. A place has both: a farm in two biomes shares one anthrome.
- An anthrome row carries **names** like a biome's: settlement (rats, mice, pigeons, sparrows, pavement
  weeds), farmland (field weeds, rooks, hares), pasture. A place's possible species are its biome's
  plus its anthrome's.
- ⭐ **Authored, not derived** (the owner: *"you can't really express it without authoring all the
  supporting machinery … no one's actually doing any real work"*). A Locality states its anthrome beside
  its biome; a place may override (a city park); nothing derives it and nothing checks it. If the
  economy ever runs for real, an author's drift report is the most it earns — not a rule.

### D10 · Danger is the mana field, never a biome's label

The owner: danger *"mostly is going to come from mana nodes which is something a biome needs to express
but it's not specific to any one biome."* The field is the mana design pack's
([mana-economy-design-pack](../engine/mana-economy-design-pack.md) § 13c–13f): a painted grade on a
zone or Locality, seeded nodes, bound beasts drawn to strong ground.

### D11 · No magic biomes; the field shows through what lives there

- **Enchanted or blighted land is an ordinary biome where the field runs high or low.** Mana-dependent
  species (the bestiary, glowing fungi, whatever the arcana packs add) are listed in biomes like any
  species; where they are met depends on the field.
- ⭐ **A player tells the field by indicator species and instruments** — a dowser's survey, an
  `analyze` reading — **never a UI label**. The knowledge can be taught and sold.
- How the field changes weather, crops or people is the mana pack's, not this design's.

### D12 · ⚠ What this design deliberately does NOT decide — hunting and foraging's

The owner: *"we're making assumptions here I don't know if we want to be making and I don't want to
poison the well for when we actually do get to hunting and foraging."* **A biome names species; how
names become the plants and animals you can find is theirs**, open, with no lean attached:

- how a list of names becomes a count, and what a species declares about what it needs;
- how a stock is kept and recovers;
- what size of area a population is counted over;
- which pack owns the population record;
- whether an individual is made when you meet it.

⛔ **The shipped fishing trade is not a precedent for any of it.** The owner: *"I'm willing to throw the
entire fishing trade in the garbage if any of it doesn't hold up for the general hunting and foraging
architecture."* Fishing is rebuilt to match whatever hunting and foraging decide.

### D13 · Sequencing

Biome before hunting and foraging (the owner). They need the names and the places; biome needs nothing
from them. If their design wants something different, a second pass on biome is cheap — these
decisions are about what things are, not how they are counted.

---

## The catalogue, as it stands

Twelve rows — four `FolderZone` (admin scope), four `Biome`, four
`SkyExposedBiome`:

```
universe
indoor/       { baseline · cafeteria · cafeteria-atrium }
outdoor/      { baseline · meadow · woodland }
underground/  { upper-workings }
```

A realm with five settlements, a river system, a wood, a mine, a moor, an
estuary, a valley road and a working farm resolves all of it through
those twelve.

## ⭐⭐ The finding: one mechanism, three jobs

And the class already knows. `Biome`'s own `static fieldMeta` splits its
fields with a comment:

```ts
// ── Identity, and what arriving there is like ──
name, _extendsBiomePath, _ambientSoundMml, _ambientSmellMml, _defaultAtmosphere

// ── Readings an instrument takes ──
_defaultTemperature, _defaultPressure, _defaultHumidity,
_defaultWind, _defaultGravity, _defaultAmbientSoundLevel
```

That comment is the split, drawn by hand, in the one place the type
system could have carried it. Three jobs, in fact:

| job | what it is | how it resolves | shape |
|---|---|---|---|
| **1 · the atmospheric field** | temperature, humidity, pressure, wind, gravity, sound level | the outward walk — a room inherits from *where it is* | a genuine field over space |
| **2 · sky exposure** | outdoor / indoor / subterranean | a **subclass** (`SkyExposedBiome`) | a boolean about **construction**, not about air |
| **3 · sensory dressing** | `_ambientSoundMml`, `_ambientSmellMml` | inherited like a field | authorial **flavour**, attached to a kind of place |

⚠ `_defaultAtmosphere` sits in the *"what arriving there is like"* group
and is arguably an instrument reading — what medium you are breathing is
the most consequential number in the table. A small inconsistency, and a
tell that the line was drawn by feel.

## ⚠ The drift has already started

Read the indoor rows:

- **`indoor/baseline`** — temperature 294 K, humidity 45 %, gravity,
  atmosphere `air`, an HVAC hum. A real biome.
- **`indoor/cafeteria`** — extends baseline and overrides **only ambient
  sound and smell**. Not one atmospheric field. It exists because
  somebody wanted a room to smell of gravy.
- **`indoor/cafeteria-atrium`** — extends cafeteria and overrides
  **nothing at all.** An empty row.

⭐ **Job 3 is what drags granularity down.** A climate is shared by a
whole region; a smell is shared by one room. Once a biome carries the
smell, you need one per room-type, then one per room — and you have
rebuilt room classes in the content tree, which is precisely the failure
this slate exists to name. Twelve rows in, two of them are already there.

## The test to argue with

> ⭐⭐ **A biome is a claim about the AIR, not about the ROOM.** If two
> rooms would read the same on every instrument — thermometer,
> hygrometer, barometer, anemometer — they are the same biome, however
> differently they look, sound or smell.

By that test `cafeteria` and `cafeteria-atrium` are not biomes: one is a
room description and one is nothing. Dressing belongs to the room's own
prose; sky exposure belongs to the room's construction.

⚠ **And the line the envelope build drew, which this pass must keep:**
*a biome may say what the outside air is doing; it may never say how well
a structure holds heat.* Construction is a fact about the room. If it
ever migrates onto a biome you get `biome: warm-tavern` warming rooms
with no fire in them, cascading to everything that references it — the
dishonest-physics failure in its purest form.

## What the pass would actually do

1. **Decide the doctrine** — the test above, or a better one, written
   into [biome.md](../../subsystems/biome.md) so the next author has a
   rule instead of an instinct.
2. **Evict job 3.** Sensory dressing moves to the room (or to a
   `dressing`-shaped thing of its own that a room references) and biomes
   stop being the reason a new row exists. ⚠ Not free: the ambient
   sound/smell of *a kind of place* is genuinely reusable, and moving it
   to the room means repeating it. That tension is the real design work
   here, and it is the same question template inheritance answers.
3. **Decide job 2's shape.** Sky exposure is a subclass today. It is
   consumed as a **predicate** (`BiomeApi.isSkyExposed`) by weather,
   rain-to-soil, maturation, the watershed and now light and the
   envelope. Subclass or field is a real fork: a field is authorable per
   row and a subclass is not, and *underground* vs *indoor* may want to
   stop being a tier and start being two values.
4. **The catalogue pass proper** — which biomes a realm needs. The
   shipped world has places its catalogue cannot describe: a river reach,
   an estuary, a moor, a working, a cellar, a glasshouse, a high pass.
   Cross-check against [settlement-model.md](../../settlement-model.md)'s
   type taxonomy and the RGO families rather than inventing a list.
5. **One latitude, one climate.** `CAMPUS_LATITUDE` is a module constant
   and every celestial read passes it, so Terminus and Rejection get the
   same winter on the same day. The per-zone `celestialProfile` override
   is shipped and unexercised
   ([time.md](../../subsystems/time.md)); this is where it would first
   be exercised, and it is the only route to a realm with more than one
   climate.

## ⭐ `_extendsBiomePath` and the inheritance question

[ref-shapes.md](../../ref-shapes.md) is explicit:

> **Template inheritance does not exist.** … A child template does NOT
> inherit a parent template's fields — don't author as if it does, and
> **don't fake it locally**; if real template-data inheritance is ever
> wanted, it's a deliberate platform feature, not a per-subsystem hack.

It names two near-precedents (species clades reading path ancestry;
`Zone.lookupField`). ⚠ **It misses a third, and the third is a literal
local fake: `_extendsBiomePath`.** Biome rows inherit fields from parent
biome rows, today, in production.

That is not an argument for deleting it — it is the strongest available
argument that **the platform feature is wanted**, because a subsystem
built it rather than live without it. This pass is where it gets
resolved: bless the local mechanism with a stated reason, or generalize
it and let the biome tier be its first consumer. ⭐ And note that job 3's
tension (§2 above) is the same question wearing different clothes: *a
kind of place shares properties with other places of that kind* is what
inheritance is for.

## Open questions

1. **Where does dressing go** if it leaves the biome — the room, a
   reusable `dressing` document, or an archetype-shaped stamp? The
   `archetype` kind already ships and already describes *a kind of
   venue*, which is suspiciously close.
2. **Is a biome authored or derived?** Today a room names one. A realm
   with real geography might derive it from elevation, latitude and
   distance from water — which is the field pattern this project already
   uses elsewhere, and would end granularity arguments by construction.
   ⚠ Against: [design-philosophy.md](../../design-philosophy.md)
   § *expression is an inelastic resource* — an authored wood should
   always be a wood.
3. **Does `underground` want to be a tier at all**, or is it indoor with
   a different sky answer and a temperature that tracks the annual mean
   rather than the day?
4. **What warms the catalogue?** Biome needs no boot hook (`BiomeApi`
   re-resolves per read with no index), which is why it has never hit the
   reference-Idea trap. Any normalization must keep that property.

## Cross-references

- [biome.md](../../subsystems/biome.md) — the chain resolver, the tiers, the six instruments
- [weather.md](../../subsystems/weather.md) — the deviation that rides on sky-exposed scopes
- [address.md](../../subsystems/address.md) — the Locality tier, and ⭐ the fact that *a node is any kind of place at any depth, never a street-address model* (the same granularity question, already answered once, differently)
- [ref-shapes.md](../../ref-shapes.md) — the template-inheritance doctrine `_extendsBiomePath` predates
- [time.md](../../subsystems/time.md) — `CAMPUS_LATITUDE`, and the unexercised per-zone profile
- [settlement-model.md](../../settlement-model.md) — the type taxonomy a catalogue pass should answer to
- [soil.md](../../subsystems/soil.md) · [watershed.md](../../subsystems/watershed.md) — two consumers of sky exposure that would feel a job-2 change
- `docs/requirements/envelope-requirements.md` — the build that made this urgent, and the line it drew

## From the climate build (2026-10-11)

- **A Locality that knows its zone** would retire `Watercourse.site`
  (each river authors its own latitude today because a reach has no zone
  to resolve one from) — § one latitude, one climate.
- Shipped by that build, for this slate's record: `lint:biome` (a biome
  that does not resolve fails loud) and the open-water biome stub.
