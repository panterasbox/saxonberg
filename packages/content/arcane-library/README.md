# arcane-library

Magic's **catalog**, and a capability pack: package
`@saxonberg/content-arcane-library`, commons namespace (`/stuff`, the
platform's claim), depends on `arcana` (whose classes its rows name).

## `src/` — the two loci (`/arcane-library/thing/…`)

| class | backs |
|---|---|
| `thing/GlowlightMote` | the glowlight spell's bound emitter — `LightSourceMixin(Thing)`, held up by a sustained effect on the caster |
| `thing/SparkLocus` | the spark spell's transient energized locus — `EnergizedMixin(Thing)`, the real conduction walk runs from it, then it destructs |

They are this pack's, not arcana's, because only its spell rows name
them (`locus:` on `glowlight` / `spark`); the executor clones whatever
the row says — a pack ships a new emitter kind with no kernel edit.

## `content/stuff/` — thirty rows

| where | rows |
|---|---|
| `idea/magic/Spell/` | the twelve spells (`arcane-sight`, `conjure-water`, `dispel`, `dread`, `firebolt`, `glowlight`, `identify`, `remove-curse`, `shove`, `spark`, `transfer`, `veil`); `veil` and `glowlight` author their bands |
| `thing/magic/` | `glowlight-mote`, `spark-locus` (the loci); `wand-of-firebolt`, `wand-of-firebolt-cursed`, `scroll-of-identify`, `scroll-of-remove-curse`, `primer-of-glowlight`, `manual-of-transfer`, `brass-conduit`, `charging-bench`; `potion-of-blistering`, `potion-of-veiling`, `potion-of-mana` (three lines each on arcana's `Potion`); **`ring-of-veil`** and **`amulet-of-glowlight`** — the worn exemplars |
| `idea/material/potion/` | `blistering-draught`, `veiling-draught`, `mana-draught` (spell-less: a meal chemistry the coupled recovery feeds on) |

The `SpellCatalogue` warms by class (`/platform/idea/magic/Spell`), so
these rows are found wherever they sit. Tests: `src/__tests__/library.test.ts`
proves every row's class resolves — the loci into this pack's `src/`,
the item classes into arcana's — and every spell's effects validate.

See `docs/subsystems/magic-items.md` and `docs/subsystems/content-packs.md`.
