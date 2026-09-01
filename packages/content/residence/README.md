# residence

The **capability pack** for title becoming a place (residences D18).
Package `@saxonberg/content-residence`; namespace root `/residence`
(held by the PM-owned `residence` group).

The membership test is arcana's: a capability pack holds what other
packs' content names. Nothing here is one locality's — Hinkley Hills,
the Terminus apartments and Duncan Hall all cite these classes from
their own packs.

## `src/` — the classes (`/residence/<branch>/…`)

| class | backs |
|---|---|
| `idea/PlatBook` | what a subdivision has for sale, and on what terms |
| `idea/PlatWarren` | how titled ground becomes a place (the provisioning `@hook` seam) |
| `idea/LotGateExit` | the deferred gate off the street into one lot |

Moved from `mud/platform/idea/` in the residences build (wave 0), class
paths repointed `/platform/idea/…` → `/residence/idea/…`; every citing
row moved in the same cut (DB drop, no migration).

See `docs/subsystems/content-packs.md` § The capability rung,
`docs/subsystems/smallholding.md`, and `docs/subsystems/residence.md`.
