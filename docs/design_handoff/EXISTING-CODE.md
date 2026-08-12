# What is already in `packages/client/` — and what it means for this work

Read before starting. Nothing here blocks the session's designs, but four things
in the current client are directly superseded and one is a real architectural
change rather than a restyle.

## Nothing in the server blocks this

Every screen was designed by reading the real server source. The command grammar,
MML, topics, mixins, prompts, reactions, forums, streaming, git and help surfaces
all exist and the designs read them as they are. **The gap is entirely client-side
plus a handful of unbuilt endpoints** — those are listed in `Unbuilt States.dc.html`
and are one-line changes once they land, not redesigns.

## Superseded — replace, do not extend

| Existing | Status |
|---|---|
| `styles/faces.ts` — Source Serif / Sans / Code Pro | Faces change to Spectral / Public Sans / Newsreader / Plex Mono. The three-voice model is **kept** and extended to four. |
| The VS Code dark palette (`#1e1e1e`, `#4ec9b0`, `#007acc`) | Replaced wholesale by the civic tokens. Mechanical, but it touches everything, which is why it is step 1. |
| `GhostCommandLine.tsx` | The hover preview **moves out of the command bar into a global status bar**, browser-style. The command bar then shows only what you are composing. |
| `InspectionPane.tsx` — a single focus slot | Becomes a **pane feed**: panes are frames with structured payloads, they accrete, age out, and can be pinned. A single slot could only ever show one thing while the room, the drilled object and an open form all competed for it. |

## The one architectural change

**Layouts stop being the top-level concept.** Today `WorldLayout`,
`LivestreamViewerLayout`, `StreamerLayout`, Forum and Builder are peers. The new
hierarchy is:

```
one frame  →  modes  →  layouts  →  panes
```

- **Modes** are the front doors — Chat, Play, Watch, and the Build / Govern
  ascent. They answer "what am I here to do".
- **Layouts** demote to *savable pane arrangements inside a mode*.
- **Panes** are the shared bricks.

What makes it one client rather than five apps: the persistent shell, and the
**command bar present in every mode**, since every pane speaks the same bus.

Existing layout components map onto modes rather than being deleted — `WorldLayout`
becomes Play's default layout, the livestream layouts become Watch's.

## Worth verifying before you start

Things I could not confirm from source and would check first:

1. **Whether `TabStrip` filter tabs already read topic facets or hardcode topic
   strings.** The new filter model runs on facets (`address` / `actor` / `weight`
   / `audience`), which the MML spec proposes adding. Until those land, filters
   fall back to topic-prefix matching.
2. **Whether the client has any existing notion of "account" separate from
   "character".** Character select assumes one account owns many characters.
3. **Whether `prompt.format` is already rendered client-side.** The prompt design
   treats it as a Liquid template the player owns.
