# saxonberg-lounge

The lounge — Dave's Bar and its warren — as ONE content pack (content
packs wave 4b). Root `/world/lounge`; the `lounge` group holds title over
`/world/lounge` and `/stuff/idea/lounge`.

| where | what |
|---|---|
| `content/world/lounge.yaml` | the `/world/lounge` FolderZone |
| `content/world/lounge/location/` | `lounge` (the Room every warren instance clones), `bar`, `office`, `offstage`, `wire-alcove` |
| `content/world/lounge/thing/` | `terminal` (the TPA node — the pack's boot entry), `bar-menu`, `back-bar`, `bar-counter`, the four bottles, `cocktail-glass`, `mixing-glass`, `shaker`, `tip-jar`, the two neons, `bandage` |
| `content/world/lounge/idea/` | `warren`, `business` |
| `content/world/lounge/agent/` | the cast: `augie`, `dave`, `mara`, `remy`, `sloane` |
| `content/stuff/idea/lounge.yaml` | the library root |
| `content/msh/` | `martini`, `daiquiri`, `last-call` — the `msh` document kind, run with `run /world/lounge/msh/<name>` |
| `content/settings/lounge.yaml` | `defaultStartLocation: /world/lounge/idea/warren` |

Rows are sorted by their class's Stuff branch (`location`/`thing`/`idea`/
`agent`); the source mirrors it under `packages/server/src/mud/world/lounge/`.
The bar's stations, the cocktail recipes and the tip-jar template are the
hospitality trade's (`/trade/hospitality`); the bar `props:` them by
reference. The bottles are the venue's own stock.
