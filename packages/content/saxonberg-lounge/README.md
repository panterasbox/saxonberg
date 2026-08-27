# saxonberg-lounge

The lounge (Dave's Bar and its warren) as a content pack. **This wave
ships only its three authored world scripts** — the `msh` document kind
under `content/msh/`:

| file | row | what |
|---|---|---|
| `msh/martini.msh` | `/world/lounge/msh/martini` | the bartender's martini recipe-script |
| `msh/daiquiri.msh` | `/world/lounge/msh/daiquiri` | the daiquiri recipe-script |
| `msh/last-call.msh` | `/world/lounge/msh/last-call` | the closing-time coroutine beat |

Each file's source lands verbatim in `data.source` (re-parsed on
resolution, never compiled); the row is owned by the pack `root`
(`/world/lounge`) and stamped `sourcePack: saxonberg-lounge`. Run one
with `run /world/lounge/msh/last-call`.

## Deferred (wave 4)

The lounge's rooms, NPCs, fixtures, brands and the `/world/lounge/**`
template tree stay under `packages/server/src/mud/seeds/world/lounge/`
and `mud/world/lounge/` until the path surgery of wave 4 moves the
locality here whole.
