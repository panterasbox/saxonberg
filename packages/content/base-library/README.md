# @saxonberg/content-base-library

The **base-library** content pack — foundational substrate content for
Saxonberg, distributed as pure data (zero TypeScript).

Contents:

- `content/lib/material/**` — the `Material` catalog (`/lib/material/...`).
- `content/lib/biome/**` + `content/lib/biome.yaml` — the `Biome` catalog
  (`/lib/biome/...`).
- `content/quantity/quantity-tags.yaml` — the quantity unit tag tables.

Files under `content/` mirror the template-path namespace
(`content/stuff/idea/material/bulk/water.yaml` → `/stuff/idea/material/bulk/water`).

The pack is installed into the running game by the kernel's `PackApi`
installer (boot-time reconcile + the `pack sync` dev verb). The pack files
are the **source of truth**; the database is a derived install. See
`pack.yaml` for the manifest and `docs/slates/builds/content-packs-slate.md`
in the server repo for the design.
