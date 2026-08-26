# saxonberg-lounge

The lounge (Dave's Bar and its warren) as a content pack. **This wave
ships only its three authored world scripts** — the `msh` document kind
under `content/msh/`:

| file | row | what |
|---|---|---|
| `msh/martini.msh` | `/domain/lounge/msh/martini` | the bartender's martini recipe-script |
| `msh/daiquiri.msh` | `/domain/lounge/msh/daiquiri` | the daiquiri recipe-script |
| `msh/last-call.msh` | `/domain/lounge/msh/last-call` | the closing-time coroutine beat |

Each file's source lands verbatim in `data.source` (re-parsed on
resolution, never compiled); the row is owned by the pack `root`
(`/domain/lounge`) and stamped `sourcePack: saxonberg-lounge`. Run one
with `run /domain/lounge/msh/last-call`.

## Deferred (wave 4)

The lounge's rooms, NPCs, fixtures, brands and the `/domain/lounge/**`
template tree stay under `packages/server/src/mud/seeds/domain/lounge/`
and `mud/domain/lounge/` until the path surgery of wave 4 moves the
locality here whole.
