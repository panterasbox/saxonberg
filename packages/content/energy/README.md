# energy

The power system, a **capability pack** at `/system/energy`: the grid
mechanism, as distinct from the shipped physics.

The kernel already owns what every pack is subject to — the six-word
`SupplyState` vocabulary, the parcel's `powerBand` + `feeder` citation, the
nightly street-lighting settle, the storm fan-out. This pack owns what other
packs' content *names*:

- **`FuelStore`** — a town's oil store. A `Holder` that keeps casks and, at
  each dusk settle, burns `fuelPerStreetNight` litres per street it can
  cover, in the seniority order handed in, until it runs dry. Implements the
  kernel's `StreetLightingSupply` shape (an oil-lit town's goods leg) and
  `SupplyReporting` (so `analyze` reads its litres and nights of oil).
- **`Feeder`** *(B1)* — the data Idea a locality's grid is authored as: a
  source and a chain of nodes over the street graph.
- **`GridCatalogue`** *(B1)* — compiles the feeders to a reachability set,
  holds the one piece of state (the cuts), and answers whether a node is
  energized, the trace back to the source, and the epoch of a locality.
- **`GridPowered` / `ElectricLight` / `LineAccess`** *(B2)* — the consumer
  contract, a light that emits only while its premises is live, and the pole
  a lineman `sever`s and `splice`s.

⭐ A second town's grid, a second producer, a third oil-lit locality are all
**content** — rows and declarations — needing zero pack code. Instances are
the realm's; the mechanism is the pack's.
