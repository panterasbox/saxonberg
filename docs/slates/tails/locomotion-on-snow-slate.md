# Locomotion on snow — what deep snow costs a body that crosses it

> **Status: UNBUILT** — the climate build (MR !360) shipped the SEAM: snow
> lying on every sky-exposed floor (`Floor.getSnowDepthM()`, banded
> dusting → deep), and routes that close under it (`SnowboundExit`) →
> [ground.md](../../subsystems/ground.md) ·
> [logistics.md](../../subsystems/logistics.md)
> **Left:** the movement economy on snow · snowshoes and skis ·
> trail-breaking · trodden and shovelled snow · wind-drift · the avalanche
> **Size:** a wave

The climate build's requirements put this out of scope by name: *"No
locomotion economy on snow — no snowshoes, trail-breaking, exhaustion, or
wind-drift; no avalanche → downstream (locomotion-on-snow). The
traversability SEAM is IN; the economy that rides it is not."* This slate
is where that sentence lands.

## What exists to build on

- **The depth.** `Floor.getSnowDepthM()` — derived on read from the
  weather the place has had (the same integral the river's snowpack
  banks), memoised per weather segment. Bands are dials
  (`climate.snow.bandM.*`).
- **The exertion seam.** `Exerting.exertTraverse(mode)` already scales the
  walk's power by the mode's `costMultiplier` and the load; deep snow is a
  multiplier on the PLACE, not a mode.
- **The closed route.** `SnowboundExit._closesAboveM` shuts a way above a
  depth; trail-breaking is the case where it should open for whoever has
  paid to break it.

## Open design

- **Trodden and shovelled snow.** The plan's shape: `getSnowDepthM()`
  minus a persisted `snowRemovedMm` with a stamp (the snow keeps falling
  on top). A trail is a place's state, so it wants the document tree, not
  a collection.
- **Snowshoes / skis** as worn gear that changes the snow cost — a
  `Wearable` the exertion read consults, not a mode.
- **Wind-drift** — the weather's wind moving snow from exposed to
  sheltered places; the bare shore (`circle/bare`) is the authored
  extreme today.
- **The avalanche** — a slope, a load and a trigger; ⚠ the uncertainty
  doctrine applies (seeded, never a roll on the act).
