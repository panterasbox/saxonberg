# Document store (the owned-JSON tree)

The document store is the **third path-addressed tree** — the slate's
**source / template / document** triad. It is the generic, owner-claimed
tree of arbitrary JSON the runtime hands a user to fill: claim a branch
and put any JSON there, tagged with a `kind` that says what kind of
object lives at that path.

It generalizes the original scripting player-script store. Scripts are now
just **one kind** of stored document; dorm-room customization will be
another (the first non-script consumer — see the Warren/lounge work).

## What a record is

`StoredDocument` (`lib/document/StoredDocument.ts`, collection `documents`):

| field   | meaning |
|---|---|
| `path`  | canonical key; owner/scope encoded in the path (`/home/<self>/…`, `/domain/<world>/…`) |
| `owner` | the owner's durable `templatePath` (set from context, never the caller) |
| `kind`  | **what kind of object lives here** — `'script'`, later `'dorm'`, … |
| `data`  | the arbitrary JSON payload |

The store is **kind-agnostic**: it persists and serves `{path, owner,
kind, data}` and never inspects `data`. Each `kind`'s consumer owns the
*meaning* of `data` and any **go-live** behavior (re-parse, re-hydrate).

`StoredDocument extends Document` only for persistence — distinct from the
persistence `Document` base class it shares a word with: a `Document` is
*how* a row is saved; a `StoredDocument` is the *owned-JSON-in-the-tree*
concept.

## The Api (`api/document.ts` → `obj/api/DocumentLogic.ts`)

A thin gated forwarding shell over a hot-reloadable logic singleton at
`/obj/api/document`, the `ScriptLogic`/`CraftingLogic` precedent:

- `DocumentApi.read(path)` → the `StoredDocument` at `path`, or null.
- `DocumentApi.list(prefix)` → every doc at/under `prefix` (the CMS tree's
  input).
- `DocumentApi.save(path, kind, data)` → find-or-create. **Access-gated**,
  **owner-stamped from context**, **provenance-recorded** (below).

The acting **owner is always derived from `ExecutionContextApi`** (the
in-world command-frame giver, or a transport's `tagActingAuthor` stamp),
**never a parameter** (memory: gated-api-actor-from-context).

### The gate — self-home ownership

`DocumentApi.save` reuses the whole ownership stack, with one base case on
top:

1. **An owner owns their own `/home/<self>/` branch** — keyed on the
   durable-path basename, so a player owns exactly the subtree the runtime
   banks under their name (recorded recipe-scripts today, a dorm's
   customization tomorrow). No broader grant needed. *This is the
   self-owner base case the fuller per-`/home/` access model will build
   on.*
2. else the covering spatial zone gates via `AccessApi.canMutateZone`;
3. else the slice-walk `AccessApi.can(write)`.

### Provenance

Every save appends an `AuthoringEvent` keyed on the path —
`DocumentLogic` (`/obj/api/document`) is a named authoring transport in
the `ProvenanceApi.recordAuthoring` gate (alongside the template
chokepoint). Authorship is *derived*, not a mutable stamp.

## Scripts as a `kind`

`ScriptLogic` keeps the script **semantics** — parse source → AST, the
per-path AST cache, the script-specific go-live — and delegates **storage**
to `DocumentApi`:

- `ScriptApi.saveScript(path, source)` → `DocumentApi.save(path, 'script',
  { source })`, then invalidate the AST cache (the script go-live).
- resolve-by-path → `DocumentApi.read(path)`, take `data.source` when
  `kind === 'script'`, parse + cache.

The generic store deliberately does **not** keep an AST cache (an AST is
script-specific) and runs **no** kind-specific go-live — that all lives
with the kind's consumer.

## CMS — the third tree

The CMS exposes the store as the **`'document'`** backend (`CmsBackend =
'content' | 'source' | 'document'`), the third root in the explorer
alongside content (templates) and source (engine TS). The record's `kind`
drives the editor treatment:

- `kind: 'script'` → the source text (`data.source`) as a plain-text code
  leaf; a write funnels through `ScriptApi.saveScript` (the script
  chokepoint: gate + provenance + AST go-live). Scripts are the one
  runtime-**creatable** kind.
- any other kind → `data` pretty-printed as JSON; a write parses the JSON
  and persists via `DocumentApi.save` under the doc's existing kind (no
  live re-hydration consumer yet — that lands with dorm).

Author-tier read gate (like content). Wired end-to-end: the REST
`parseBackend` admits `'document'`, and the client explorer lists the
`documents` root.

## Deferred

The fuller per-`/home/` access model (sharing, grants beyond the
self-owner), non-script document **creation** via the CMS, and the first
non-script consumer (dorm-room customization data, hydrated onto a Warren
constituent — base-template + customization-document) all land later. The
substrate is built to accommodate them; only scripts ride it today.
