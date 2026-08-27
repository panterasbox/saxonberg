# @saxonberg/content-newbie-wilds

The **newbie-wilds** content pack — the frontier onboarding zone, the
first *locality* shipped as a pack (base-library, species-and-names and
arcane-descriptors ship substrate; this ships a place).

Contents (`content/world/newbie-wilds/**`, template paths
`/world/newbie-wilds/...` — unchanged from their former home under
`server/src/mud/seeds/`):

- `crossroads.yaml` + `crossroads/**` — the crossroads: hub, watchpost,
  treeline, hollow, longmeadow, and the TPA terminal.
- `delve.yaml` + `delve/**` — the Sunken Delve: vestibule, three trapped
  corridors, the pit, the hidden cache, the vault and its reward.
- `npc/**` — the cast: sentry, sellsword, duelist, wolf.
- `budget.yaml` — the zone's Business account (unauthored: no positions).

The pack is installed by the kernel's `PackApi` installer: a boot-time
three-way reconcile against the deployment's `pack_installs` record,
plus the `pack` operator verb (`status` / `install --dry-run` / `sync` /
`diff` / `resolve` / `pin`). The pack files are the **source of truth**;
the database is a cache of them. See `docs/subsystems/content-packs.md`
in the server repo.
