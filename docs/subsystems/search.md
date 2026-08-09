# Search

One surface over everything the world has written down — the wiki, the
forums, the chat archive, the press releases and the rulebook — reached
by the `recall` verb and by `SearchApi.query`.

## ⚠ The verb is `recall`, not `search`

`search` is already the **in-world perception verb**: going over a room
with your hands for something concealed in it. That is an *act in the
world*, with a duration, a skill and a chance of failure. Looking
something up is not that, and overloading the word would have made one
of the two meanings unsayable.

So the two coexist and never collide:

| Verb | Means | Lives in |
|---|---|---|
| `search` | go over this place for what is hidden | [concealment.md](./concealment.md) |
| `recall` | look this up | here |

A test asserts `search` still resolves to `perception/search.yaml`,
unshadowed — the collision is checked, not merely avoided once.

## ⚠ Why the verb exists at all

The Api could have shipped alone and let the client's search panel call
it. That would have broken the axiom the whole client contract rests on:
**every click sends a command.** A search panel with no command behind
it is the one panel in the cockpit that cannot show you what it just
ran — and it is, of all panels, the one most likely to make a player ask
*how did it decide that?*

So the typed verb and the panel dispatch the same thing.

## The shape

```ts
SearchApi.query({ scope, terms, limit? }): Promise<SearchHit[]>
```

| Scope | Source |
|---|---|
| `wiki` | `wiki` — the encyclopedia's current page state |
| `forum` | Board → Thread → Post entries |
| `chat` | the channel archive |
| `press` | published releases |
| `help` | the harvested rulebook |
| `all` | fans out across the five |

⚠ **`scope` is a value on the request, not a method name.** The decision
not to keep a per-player frame store is deliberate but explicitly
reversible ([the requirements' § 2](../requirements/client-server-surface-requirements.md)),
and adding a `'mine'` scope must not reshape the call. A `recallMine()`
would have made that reversal a rewrite.

⚠ **`limit` caps the whole result set, not each source.** A per-source
cap lets one chatty source crowd the others out of a short list, so
`all` interleaves and stops at the total.

## ⚠ Viewer-filtering DELETES

A source the reader may not read is **absent** from the results — never
present-and-redacted.

This is not a style preference. A redaction placeholder discloses the
existence of the thing being withheld, which is frequently the fact that
mattered: *there is a page about me that I cannot read* is the answer
the placeholder gives. It is the same honest-fog rule the affordance
resolver follows for concealed things, applied to writing.

The reader comes from the **execution context**, never a parameter. A
caller that could name the viewer could read as somebody else.

## Reads existing storage

No new collection. No index build. Every source keeps durable history
already — that is what made a search surface fit inside a client cycle
at all, and it is why the decision not to build a personal frame store
did not leave search with nothing to read.

Each branch delegates to the source's **own Api**, which is what makes
viewer-filtering correct without `SearchLogic` knowing any source's
access rules: it asks the owner and keeps what comes back.

⚠ Matching is a case-insensitive substring scan over already-loaded
rows. That is the honest v1 — the sources are small and there is no
index to keep warm. When a source outgrows it, that source's Api grows a
real query; the shape here does not have to change.

## ⚠ `forum` and `chat` return nothing yet

Their Apis expose **per-board** and **per-channel** reads, so a correct
search over them needs an enumeration that does not exist. They return
empty rather than scanning whichever boards happened to be warm — a
partial result set whose gaps nobody can see is worse than an empty one,
because the reader has no way to know they were only shown part of the
answer.

Recorded in the code at the branch, not hidden. Closing it means giving
those two Apis an enumeration face, not changing anything here.

## File layout

| File | Role |
|---|---|
| `mud/api/search.ts` | `SearchApi.query`, `SearchScope`, `SEARCH_SCOPES`, `SearchHit` |
| `mud/obj/api/SearchLogic.ts` | the per-source fan-out + interleave; `@internal` |
| `mud/cmd/system/recall.yaml` | the verb |
| `mud/obj/command/system/RecallController.ts` | scope detection + rendering |

`recall` is contributed by `Avatar.commandContributions` beside `help`
and `wiki` — reference surfaces a player *carries* rather than reaches
for. It is not gated behind a hosted aether update the way `forum` and
`chat` are, because reading is open by design and the filter deletes, so
an open verb cannot leak.

## A result is a pointer, not a copy

`SearchHit` carries a title, a short excerpt and **the command that
opens it**. Following that command re-checks the reader's access at that
moment — so a hit that goes stale between the search and the read fails
at the read, where the source's own rules are.

That also keeps a result row obeying the same rule every other clickable
does: it previews exactly what it sends.

## Cross-references

- [wiki.md](./wiki.md) · [forums.md](./forums.md) · [chat.md](./chat.md)
  · [press.md](./press.md) · [help.md](./help.md) — the five sources
- [concealment.md](./concealment.md) — the *other* `search`
- [command-routing.md](./command-routing.md) — why every panel needs a verb
