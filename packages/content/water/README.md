# water

The watershed pack — a **capability pack** (it ships classes in `src/`
alongside content in `content/`). Package `@saxonberg/content-water`;
namespace root `/water`.

The membership test, from `docs/plans/water-plan.md` § P1: **the kernel
takes the physics, this pack takes the works.** Zone elevation, the
precipitation integral, the pressure fallback and the rain→soil edge are
kernel, because every pack's content is already subject to them and they
edit shipped subsystems. Everything a *content author names* is here.

## `src/` — the classes (`/water/<branch>/…`)

| class | backs |
|---|---|
| `idea/Watercourse` | the river as an authored data `Idea`: nodes, connections, control-point elevations, catchment. Direction is derived from elevation; an author never writes an arrow. |
| `idea/WatercourseCatalogue` | resolve-on-read registry over the authored rows; `reachOf`, `compare`, flow |
| `thing/Conduit` | intake reach → delivery extent, capacity, owner, state. A sewer is the same object reversed. |
| `thing/ControlStructure` | dam · headgate · weir — a setting that redistributes flow in time or in space |
| `thing/StorageNode` | reservoir · tower · cistern — the build's one genuinely stateful thing |

Source mirrors path: `src/idea/Watercourse.ts` backs
`/water/idea/Watercourse`. The pack imports the kernel **only by package
specifier** (`@saxonberg/server/mud/lib/…`) through the server's
`exports` map, and writes **absolute** `FromModule` gates.

## What is deliberately NOT here

- **The `water-right` document kind itself.** A pack cannot declare a
  `DocumentKind` — *"editing this file is a platform act"*. The kind is
  kernel; its validated save is this pack's.
- **Any particular river.** The Kestrel, the Confluence, the aqueduct and
  Wharfside are Terminus's and world-seed's content. A second realm needs
  zero code from here.

See [docs/subsystems/watershed.md](../../../docs/subsystems/watershed.md).
