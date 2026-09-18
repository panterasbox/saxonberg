# trade-forestry

The forestry trade: the wood, the stand, the axe and the coppice.

- **A wood is a place that is ground.** `/trade/forestry/location/Wood`
  is a persistable singleton location composing soil and a `StandMixin`
  — the standing timber as a cover over the room, read by `look`,
  drunk from the room's own soil, felled with `fell`. A locality authors
  clearings on it with a `mix:` block each; the pack ships no venue.
- **`fell`** — the trade's one act: a standard comes down as a bole on
  the floor (too much for any one back), four logs and a seed; `fell
  bole` cross-cuts a length of timber off it at a time.
- **The coppice** — `/trade/forestry/thing/Panel`, a persistable bed of
  hazel stools cut with the billhook through the kernel `harvest`, ready
  again one game year after the cut. Cordwood is hazel.
- **The wood vocabulary** — eight species here, eight materials in the
  commons (`/stuff/idea/material/wood/…`), each naming the other.

Subsystem doc: `docs/subsystems/forestry.md`.
