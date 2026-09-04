# transport

The ways pack — a **capability pack** (it ships classes in `src/`
alongside content in `content/`). Package
`@saxonberg/content-transport`; namespace root **`/system/transport`** —
the *how the world works* axis, beside `/system/water`, `/system/arcana`,
`/system/residence` and `/system/tpa`.

**The membership test:** *a system is true whether or not anyone is
participating in it.* A road and a river exist with nobody employed by
them. Who carries what across them for money is a **trade**, and lives
in `trade-haulage`.

## What is here

| | |
|---|---|
| `Lane` | a mode's **edge set** over the shared node graph. You do not draw a road: you author which exits admit `wheeled`, and the road is the induced subgraph. `edges[]` is the escape hatch for a lane with no exits to induce from — rail, and the TPA. |
| `LaneCatalogue` | the compiled realm graph, lazy and self-loading. Owns `planRoute` (breadth-first over the compiled edges) and `routeByKey`. **The verbs live here**, which is why the pack needs no Api. |
| `Route` | nodes plus a **stop set**, as a value object. Express versus local is one lane with two stop sets. ⚠ Authored and computed routes are the same shape, and the Journey cannot tell which factory made one. |
| `Journey` | a sustained engagement whose **beat is one leg**. Every beat issues the same `traverse` a player's `go` does, so there is no second movement implementation. Holds the driver's **hands** only. |
| `HaulageRig` · `Barge` · `Coach` | the three vehicle shapes. The rig is **towed** (not `Mobile`); the other two steer. |

## What is deliberately NOT here

- **The carrier, the paper, the depot, the rate card, the `hauls`
  brain** — those are practised by somebody and quittable, so they are
  `trade-haulage`'s.
- **The realm's own lanes and routes.** `/stuff/idea/Lane/<key>` and
  `/stuff/idea/Route/<key>` live in the **commons**, exactly where the
  `Watercourse` rows do and for the same reason: a road up somebody's
  valley is a fact about their world, and the realm's own pack has to be
  able to edit it. A row under `/system/transport` would be titled to the
  transport group and world-seed could not touch the road it authored.
- **Rail, timetables, tolls, congestion, road wear.** The lane substrate
  is general enough that rail is a **data addition** — an authored-edge
  lane, proved by a test — and none of the rest ships.

See [docs/subsystems/logistics.md](../../../docs/subsystems/logistics.md).
