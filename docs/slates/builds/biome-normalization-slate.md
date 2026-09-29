# Biome normalization slate — what a biome is a claim ABOUT, and how narrow one may get

> **Status: PARTIAL** — the substrate ships and works: the `Biome` Idea,
> the outward-walking chain resolver (containment → zone → universe), the
> `SkyExposedBiome` subclass that gates weather, rain, soil and (with the
> envelope build) the sun, per-Detail overrides, and `_extendsBiomePath`
> chaining biome row to biome row →
> [biome.md](../../subsystems/biome.md). What has **not** happened is a
> pass over the catalogue itself: it is **twelve rows**, it is doing
> **three different jobs**, and the drift toward *room classes by another
> name* has already started.
> **Left:** the granularity doctrine (what a biome is a claim about, and
> the test that decides it) · splitting the three jobs — atmospheric
> field · sky exposure · sensory dressing · the catalogue pass itself
> (which biomes a realm actually needs, and what the shipped world is
> missing) · whether `_extendsBiomePath` is blessed or generalized into
> the platform's absent template inheritance · one latitude, one climate
> (the per-zone `celestialProfile` hook is shipped and unexercised)
> **Size:** a build

Captured 2026-09-24, out of the envelope build's design conversation.
The user's framing: *"we haven't even had a conversation about
granularity or how narrow biomes get vs just being room classes by
another name."*

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
