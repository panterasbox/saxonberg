# trade-hospitality

The hospitality trade — a **capability pack** (it ships `src/`). Root
`/trade/hospitality`.

- `src/thing/IceBin.ts` — the insulated ice holder (a Thermos whose interior is ice; a recipe's `ice:` draws from it).
- `src/thing/Tap.ts` — the dispensing station: a `Surfaced` fixture that is a `tap` tool; the keg it draws from rests beside it in the room, where the gather walk already sees it.
- `content/trade/hospitality/thing/` — the tools, the stations, the nine glasses (`category:` is the glassware par key), the house tablet.
- `content/trade/hospitality/idea/material/` — the house-made juices the press yields.
- `content/recipes/` — the menu (21 lines here; the pint, the three wines and the soft drink ride their trades) and the four `press-*` recipes.
- `content/trade/hospitality/location/{bar,cellar}.yaml` — the bundles a venue populates by reference.
- `content/archetypes/hospitality.yaml` — the venue archetype (`ArchetypeApi.materialize('hospitality')` builds the test venue).

Tests: `pnpm --filter @saxonberg/content-trade-hospitality test` — `src/__tests__/menu.test.ts` builds the venue from the archetype, stocks it from the trades' own rows and orders every menu line.

Since the review of the libations MR the bar's own steps ship here too: `muddle`, `strain`, `garnish`, `mix`, `serve` under `content/trade/hospitality/cmd/crafting/` with their controllers in `src/idea/cmd/crafting/`; the shaker, mixing-glass and muddler rows author the verbs they confer. `pour`/`stir`/`shake`/`wash` stay platform (a pot pours and stirs too; a basin washes anything); `menu`/`order` are platform `retail`.

`src/` ships the classes only this trade names: `IceBin`, `Tap`, and
`GlassRack` (the glass pool's home — an open container; the kernel knows
no rack class, only that the gather walk descends open containers).

The bar's four workings are authored on the instruments that perform
them — shaker (`shaken`), mixing-glass (`stirred`), muddler (`muddled`),
bar-spoon (`built`). The kernel keeps no technique table: a trade that
presses or churns names its own working on its own tool.
