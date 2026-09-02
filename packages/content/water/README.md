# water

The watershed pack — a **capability pack** (it ships classes in `src/`
alongside content in `content/`). Package `@saxonberg/content-water`;
namespace root **`/system/water`** — the *how the world works* axis, beside `/system/arcana` and `/system/residence`. A system is true whether or not anyone is participating in it: rivers flow with nobody employed by them.

The membership test, from `docs/plans/water-plan.md` § P1: **the kernel
takes the physics, this pack takes the works.** Zone elevation, the
precipitation integral, the pressure fallback and the rain→soil edge are
kernel, because every pack's content is already subject to them and they
edit shipped subsystems. Everything a *content author names* is here.

## `src/` — the classes (`/system/water/<branch>/…`)

| class | backs |
|---|---|
| `idea/Watercourse` | the river as an authored data `Idea`: nodes, control-point elevations, wild catchment. Direction is derived from elevation; an author never writes an arrow. |
| `idea/WatercourseCatalogue` | the compile: reach ordinals, a reachability **set** (`compare` is one `Set.has`), flow, snowpack, navigability, contamination, and the one world scan |
| `idea/WaterRightRegistry` | filing, transfer, seniority allocation, the per-window quota — and the riparian derivation that needs no record |
| `thing/Conduit` | intake reach → delivery extent, capacity, owner, state. **A sewer is the same object reversed.** |
| `thing/ControlStructure` | dam · headgate · weir — a setting that redistributes flow in **time** or in **space**, plus `ρ·g·Δh·Q·η` |
| `thing/StorageNode` | reservoir · tower · cistern — the build's **one genuinely stateful thing** |

The pack ships **no controllers and no verbs**. Everything a player
types is a kernel verb: `analyze water` reads a supply over a *shape*
(`SupplyReporting`), `switch` opens and closes a conduit's valve, and
`boil` is `crafting`'s, afforded by the fire. That is the split working:
the pack holds what other packs' content *names*, and the kernel holds
what a player *does*.

Source mirrors path: `src/idea/Watercourse.ts` backs
`/system/water/idea/Watercourse`. The pack imports the kernel **only by package
specifier** (`@saxonberg/server/mud/lib/…`) through the server's
`exports` map, and writes **absolute** `FromModule` gates.

## What is deliberately NOT here

- **The `water-right` document kind itself.** A pack cannot declare a
  `DocumentKind` — *"editing this file is a platform act"*. The kind is
  kernel; the validated save that decides what a legitimate right looks
  like is this pack's.
- **A mixin.** A pack's module categories are branches, controllers and
  tests — there is no `lib/`. That is why the catalogue finds
  withdrawals and outfalls by **shape** rather than by an MQL mixin
  selector, and why `check-world-scan` names the one file that does it.
- **Any particular river.** The Kestrel, the Confluence, the aqueduct and
  Wharfside are Terminus's and world-seed's content. A second realm needs
  zero code from here.

See [docs/subsystems/watershed.md](../../../docs/subsystems/watershed.md).
