# @saxonberg/content-species-and-names

The **species-and-names** content pack — the species roster and the
char-gen name banks, distributed as pure data (zero TypeScript).

Contents:

- `content/lib/species/**` — the `Species` + `Clade` taxonomy tree
  (`/lib/species/...`). Kingdom `Clade` folders (`animalia`, `plantae`,
  `fungi`, `constructa`) and the `Species` leaves under them. Installed
  as ordinary `domain` rows (the `domain` content kind).
- `content/name-banks/**` — one file per `NameBank` (`common.yaml`,
  `dwarvish.yaml`, …), each a per-flavor given/surname pool the char-gen
  name suggester unions by key. Installed into the `name_banks`
  collection (the `name-banks` content kind). The **file name is the bank
  key** (`common.yaml` → key `common`), the identity a `Species`
  references via `nameBankKeys`.

Files under `content/lib/` mirror the template-path namespace
(`content/lib/species/.../sapiens.yaml` → `/lib/species/.../sapiens`).

Species reference `BodyPlan` (`/lib/body-plans/...`) and `Material`
(`/lib/material/...`) singletons by path; those resolve on read and live
in the kernel seed tree / the `base-library` pack respectively, so they
are intentionally **not** bundled here.

The pack is installed into the running game by the kernel's `PackApi`
installer (boot-time reconcile + the `pack sync` dev verb). The pack files
are the **source of truth**; the database is a derived install. See
`pack.yaml` for the manifest and `docs/subsystems/content-packs.md` in the
server repo for the design.
