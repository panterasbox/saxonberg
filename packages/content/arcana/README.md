# arcana

Magic's substrate pack, and the first **capability pack** — a pack that
ships classes (`src/`) alongside its content (`content/`). Package
`@saxonberg/content-arcana`; namespace root `/arcana` (the tenth title
root, held by the PM-owned `arcana` group).

The membership test: **nothing in arcana is specific to one effect** — it
is the building blocks effects are made from. A class or row that exists
for one spell is the arcane library's.

## `src/` — the classes (`/arcana/<branch>/…`)

| class | backs |
|---|---|
| `thing/Wand` | the charged item: a battery + a bound working, fired with `zap` |
| `thing/Scroll` | the consumable: one reading, spent |
| `thing/Spellbook` | the teaching book — `study` |
| `thing/Conduit` | the transfer item between shells |
| `thing/Ring`, `thing/Amulet` | the **worn** charged hosts: `alwaysOn` sustains the bound working on the wearer |
| `thing/Potion` | a preset `Receptacle` — glass, 0.25 L, the potion keywords — so a catalog potion is three lines |
| `idea/material/PotionMaterial` | the potion LIQUID: `Potable` + `Arcane` + `Identifiable` over `ConsumableMaterial` |
| `idea/cmd/magic/{Cast,Spells,Study,Zap,Recharge}Controller` | the five casting verbs' controllers |

Source mirrors path: `src/thing/Wand.ts` backs `/system/arcana/thing/Wand`. The
pack imports the kernel **only by package specifier**
(`@saxonberg/server/mud/lib/…`) through the server's `exports` map —
never by a relative path into the monorepo — so it is repo-portable.
Pack code writes **absolute** `FromModule` gates.

## `content/`

| kind | rows |
|---|---|
| domain | the 18 `arcana/idea/Discipline/magic-*` rows (the keys the pack's own `Grid` derives), the 5 controller templates at `arcana/idea/cmd/magic/` |
| command-view | `arcana/cmd/magic/{cast,spells,study,zap,recharge}` |
| settings | `magic.yaml` — the casting dials (merge-missing) |
| descriptor-banks | `amulet`, `potion`, `ring`, `scroll`, `spellbook`, `wand` — the pools an unidentified item draws its appearance from |

## Tests

`src/**/__tests__/` — run by `pnpm -r test` (this package's `vitest run`)
and routed by `pnpm test:near` when a pack file changes. A pack test
imports `@saxonberg/server/test-bootstrap` like every runtime test.

See `docs/subsystems/content-packs.md` § The capability rung and
`docs/subsystems/magic-items.md`.
