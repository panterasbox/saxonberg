# Wiki — the community encyclopedia of the world's nouns

The source of truth for the page model, the render pipeline, the
component/snippet contract, the permission anchoring, and the markup
additions. Read this before editing under `lib/wiki/`, `obj/Wiki*`, or
`cmd/system/wiki.yaml`.

Design lineage: [wiki-requirements.md](../requirements/wiki-requirements.md)
(the complete design) and [wiki-plan.md](../plans/wiki-plan.md) (the
build carve). This doc supersedes both for *what shipped*.

---

## What it is, and what separates it from `help`

A **community-maintained encyclopedia of the world's nouns** — materials,
biomes, species, places — plus lore, guides and system pages.

The difference from the help system is not subject matter but
**substance**: in this engine a thing's behaviour *is* its mixin
composition, so an article can carry a **live architecture panel**
beside its authored prose. Help tells you what `plant` does; the wiki
tells you what oak *is*, and therefore what you can do with it as a
consumer and how you work it as labour. The panel is derived at read
time and cannot go stale.

---

## Where the code lives

| Concern | Home |
|---|---|
| Page + revision rows | `lib/wiki/WikiPage.ts`, `lib/wiki/WikiRevision.ts` (Documents) |
| Namespace zone | `obj/WikiNamespaceZone.ts` — **instanceable, so `obj/`** |
| Render contract + level vocabulary | `lib/wiki/render.ts` (`SpoilerLevels`) |
| Budget | `lib/wiki/RenderBudget.ts` |
| Snippet syntax | `lib/wiki/Snippet.ts` |
| Sections + sticky anchors | `lib/wiki/Section.ts` |
| Word diff | `lib/wiki/SourceDiff.ts` |
| Components | `lib/wiki/components/<name>.ts`, sole export `component` |
| Page state + mutations | `obj/WikiRegistry.ts` (`extends Idea`) |
| Render pipeline | `obj/WikiRenderer.ts` (`extends Idea`) |
| Verb | `cmd/system/wiki.yaml` + `obj/command/system/WikiController.ts` |
| Starter articles | `config/wiki-pages.yaml` + `backend/WikiSeeder.ts` |

**No `*Api` was added**, by constraint. `obj/<Name>Registry.ts` is the
shipped shape for a gated, state-owning singleton with no Api face
(`AccessRegistry` is the precedent).

> ⚠ **`@CallSecurity` is INERT on a `Document`.** `ProxyApi.wrap` is
> called only from `StuffApi.create`/`clone`/`createSync`; a Document is
> constructed with `new`, never wrapped, and instance-method gating is
> enforced *by that proxy*. This is why behaviour lives on two `Idea`
> singletons rather than on `WikiPage` — a gate there would silently do
> nothing.

`WikiNamespaceZone` is in `obj/` because a template's `class:` names it
(`seeds/wiki/*.yaml`), and **nothing instances `lib/`** — enforced on
both axes by `pnpm lint:instanceable`. The Documents stay in `lib/`
because nothing instances *them* (`lib/parcel/ParcelRecord.ts` is the
precedent).

---

## The page model

`_id` is identity; `slug` is a label. A rename appends the old slug to
`aliases`, so **the set of names a page answers to only ever grows** —
which is what makes `pageId#anchor` a durable citation, and a broken
citation a broken lesson (the college slate's cite-never-restate rule).

Slugs and aliases share **one name space per namespace**: a name
resolves to at most one page, and claiming a held name is refused
*naming the holder* — "taken" tells an author nothing they can act on.

A subject-bound page and a free-standing one differ in exactly one
field, `subject`. There is no second kind and no marker mixin:
documentability is a property of a **template path**, not something a
game class opts into.

### The typed subject

```yaml
subject: { kind: template, ref: /obj/material/oak }
subject: { kind: mixin,    ref: CombustibleMixin }
subject: { kind: command,  ref: inventory/plant.yaml }
subject: null
```

Typed rather than a bare `domain` path because **not everything is
Stuff**. A Template describes Stuff; the things that are not are other
Documents and *compilation units* — YAML files, modules, and interfaces,
which is what a mixin is. The case this design started from (a player
understanding a thing's architecture as consumer and as labour) is a
**mixin**, which has no `domain` row at all. The kind set is open: a new
kind adds a resolver rather than reinterpreting a string.

### Revisions

`wiki` holds current state; **`wiki_revisions`** holds an append-only
log — the shipped `parcel_events`→`parcels` pattern. A separate
collection rather than an embedded array for two reasons, both about
scale: a heavily-edited page would eventually hit **Mongo's 16MB
document cap**, and every page *read* would otherwise drag its history.

Snapshots, not diffs: rollback is a copy, not a replay.

> ⚠ **A revision stores the RESULTING body**, not the "prior" body the
> requirements phrase. A draft is "a revision with `published: false`",
> and its point is holding the *proposed* text while the page serves its
> last published one — under a prior-body model a draft has nowhere to
> put what the author wrote. What the requirement is *for* is intact:
> every state the page has ever had is a row.

`rev` is a **compare-and-swap token**. An edit submits the rev it was
based on; a mismatch is rejected with all three bodies and **no
auto-merge**, because a machine-merged paragraph reads as somebody's
writing and is nobody's. Without it, last-write-wins silently destroys
work — and history does not save you: it faithfully records that B
overwrote A, and A's edit is still gone.

---

## ⭐ The reveal model — two axes, one gate

Every fragment carries an **effective spoiler level**, checked against
two different numbers:

| axis | what it is | what happens above it |
|---|---|---|
| **capability** | the reader's *ceiling*, derived from identity | **DELETED server-side** — never serialised, never on the wire |
| **appetite** | the reader's declared *preference* | **KEPT and TAGGED** `<spoiler level="n">` for the client to collapse |

Conflating them leaks. `level > ceiling` deletes; `ceiling >= level >
appetite` keeps and wraps. **Every test asserts on the emitted string** —
a tree can carry the right levels and still serialise the wrong bytes.

### The MAXIMUM rule

Four things can assign a level: the page's frontmatter default, an
inline tag, a component's declared floor, and a derived field's
`spoiler`. **The effective level is the MAXIMUM of all of them** — never
the nearest, never the innermost.

A level-0 fact inside a level-2 section is level 2, because knowing a
fact appears *under that heading* is itself the reveal. Max is also the
only rule that composes: under nearest-wins, wrapping content in a
lower-level container reveals it.

### The capability ladder

Derived from identity, never stored:

| level | who |
|---|---|
| 3 | a wizard |
| 2 | may mutate the namespace zone (its `'owner'` role) |
| 1 | may edit in the namespace |
| 0 | everyone else, and an unresolved principal |

> ⚠ `AccessApi.can` **ignores its `action` argument** (the parameter is
> discarded). The ladder differentiates by *which predicate it calls*,
> not by the action string. Do not write a test expecting
> `can(a,'read',z)` and `can(a,'edit',z)` to differ.

### The reader is derived, never passed

`WikiRenderer.render` takes `(body, opts)` and `opts` has **no reader
field**. Both faces resolve the acting principal from
`ExecutionContextApi.getActingAuthor()` internally. With a parameter,
"over-capability content never crosses the wire" is a convention any
caller can break; derived, it is a property of the code path.

### `spoiler` on a field

`FieldMetaEntry.spoiler?: 0|1|2|3` — the reveal level of a field's
*value* wherever it surfaces. Declared on the **field**, because the
same field is a spoiler in a wiki panel, the Studio, help, and a future
codex alike; a policy table owned by the wiki would be wrong the moment
anything else rendered the same value.

`SpoilerLevels.ofField(ctor, field)` is the **one seam**, and the single
place the fail-open default lives.

> ⚠ **Untagged means level 0 — open.** Default-spoiler would empty every
> panel until several hundred mundane fields were tagged and would train
> authors to tag reflexively. Density and hardness are not spoilers; a
> species' resistances are.
>
> The cost is real: a newly-added spoilery field is visible until
> somebody tags it. It is covered **by enumeration, not inference** —
> `mud/__tests__/wiki-spoiler-fields.snapshot.test.ts` lists every
> surfaceable field with its level, so an untagged spoiler is a review
> diff rather than a production leak. **A diff there is a review item,
> not a breakage.** Blessing it without reading it is the one way that
> file stops working.

Today's tagged set: a trap's `trigger` / `delivery` /
`traverseConsequence` / `groundTriggered` / `dropDestination`, at level
2 — what the trap does and how to avoid it.

---

## The render pipeline

```
render(body):
  1. parse              Mml.parseTree(body)
  2. expandSnippets     fixpoint, depth cap, cycle detect
  3. resolveLinks       [[Page]] → <link> / redlink
  4. resolveComponents  path-resolved, budgeted
  5. gate               MAXIMUM levels → omit / tag
  6. emit               serialise back to MML
```

**The stage list is frozen.** Four things each want to be outermost and
the wrong order is a silent correctness bug rather than a crash, so the
order is asserted **by observation**: a snippet emitting a component
emitting a `[[link]]` leaves the link unresolved, proving 3 ran between
2 and 4.

> ⚠ **Documented limitation:** a component's *output* misses stage 3, so
> a `[[link]]` a component emits stays literal. The fix, if it becomes
> unacceptable, is re-running stage 3 — a stage *body* change, not a new
> stage.

### ⭐ Body, never a page id

`render` takes a **body**; `pageId` rides `opts` for self-reference
only. That is what makes `wiki preview` the same code path as a saved
read, for free. Keyed on a page id, preview becomes a second rendering
path — and second paths drift until preview lies about what saving will
do.

### `redactSource`

The same walk, ceiling only, no tagging: source with over-ceiling
fragments deleted. It feeds `history`, `diff` and the conflict payload,
so a reader cannot read past their ceiling by asking for a diff instead
of a page.

Above the ceiling a fragment is **absent** — not redacted, not counted,
no "1 change hidden". A redaction marker is the leak in miniature.

It returns its input **byte-identical when nothing was removed**: parse
/serialise normalise entities, so re-emitting would rewrite bodies it
was only meant to filter.

---

## Components and snippets — the capability line

**Snippets compose and parameterise; only components reach live state.**
An author can build any presentation they like and cannot reach game
state except through a component a developer wrote.

### Components

A module at `lib/wiki/components/<name>.ts` with a sole `component`
export — the **brain pattern**, applied to markup. Re-resolved per
invocation via `StuffApi.resolveExport`, so adding a component is
dropping in a file. No registry.

```ts
export const component = class WikiInfobox {
  static label = 'infobox';
  static spoilerFloor?: 0 | 1 | 2 | 3;   // for a component whose PRESENCE reveals
  static render(props, children, ctx): MmlNode[] | Promise<MmlNode[]>;
};
```

> ⭐ **A component receives no reader identity and no capability
> ceiling.** `ComponentContext` carries `budget` and an optional
> `pageId` and nothing else. If components gated, the reveal model would
> be enforced in N places written by N people and one buggy component
> would leak. With annotation-only there is exactly one gate, and a
> component *cannot* leak because it never learns what the reader may
> see. **Do not add a reader field.**

Returns **nodes, never a string** — a string would bypass sanitisation.
A throwing component yields an inline error naming it and the rest of
the page renders.

> ⭐ **No component can trigger a page render**, and it is a GATE, not a
> depth counter: `render`/`redactSource` are
> `AnyOf(FromModule(WikiController), FromTemplate('/obj/WikiRegistry'))`,
> and `/lib/wiki/components/*` is in neither. There is no depth at which
> recursion becomes allowed.

A component's tag name becomes a **module basename**, so the charset
rule (`[a-z][a-z0-9-]*`, in `api/mml/tags.ts`) is load-bearing: `../`,
slashes and dots are unrepresentable before any resolver sees the
string.

Shipped: `infobox` (pure presentation), `image` (a key; **no upload
path**), `help` (transclude a verb's topic), `composition` (the live
architecture panel).

### Snippets

A page in the `snippet` namespace, invoked `{{Name|pos|key=value}}`,
with `{{{key|default}}}` in the body. A snippet **is** a page, so it
inherits revisions, history, rollback and protection with no new code.

A missing parameter with no default renders `{{{name}}}` — **never
empty**. Silently-empty parameters are how wiki snippets rot: the page
looks fine and the data is gone.

Two cycle guards, because they catch different things: a **name stack**
catches self-inclusion *and* the mutually-including pair (which
alternates and never gets deep), while the budget's `snippetDepth` and
`maxSnippets` bound everything else. The error prints the whole chain.

---

## Permissions

`AccessApi.can` is zone-anchored and page data is deliberately not a
Stuff, so the **namespace tree** supplies the anchor: a
`WikiNamespaceZone` at `/wiki/<namespace>` under a `/wiki` root.

> ⚠ The requirements' `accessGroups` propagation describes machinery
> **removed in property phase 0a**. `ownerGroup`/`accessGroups` are gone
> from `Zone`; title lives in the gated `parcels` collection. There is
> also no "all signed-in players" group, and a parcel has exactly one
> owner — so the open edit floor **cannot be a group**.

The replacement is a `protection` field on the namespace zone, resolved
by the shipped `Zone.lookupField` inheritance walk:

| protection | check |
|---|---|
| `anyone` | any signed-in Avatar |
| `editors` | `AccessApi.can(actor, 'edit', nsZone)` |
| `moderators` | `AccessApi.canMutateZone(actor, nsZone)` |

`anyone` at `/wiki`; a per-page value takes the **stricter** of the two,
so a page tightens and never loosens. Narrowing a namespace is **one
seed field**, no code.

Ownership is a `parcels` row over `/wiki`, held by **one** managed
group, `wiki-editors`; moderators are its `'owner'`-role members. A
second group would need `GroupApi.isMember` in a controller (which the
antipatterns table forbids) and would invent a distinction the substrate
already draws.

`snippet` is the one namespace that tightens to `editors`, and the
reason is **blast radius**: an article is read by whoever opens it, but
a snippet is *transcluded*, so vandalising one vandalises every page
using it.

**A review queue is deliberately absent.** Open editing plus fast
rollback is the wiki-classic bargain; a queue converts a commons into a
submission process. Revisit only if abuse actually appears.

---

## Deletion

`delete` sets `deletedAt`/`deletedBy`. The page stops resolving for
readers, stays visible to moderators, and undelete clears a field.
Revisions are untouched. A wiki whose delete is destructive has a
revision log that lies.

**`purge` is the one hard exception** — page *and* revisions, moderator
-only, irreversible. It exists because pretending otherwise does not
protect the log; it means the only remedy for illegal material is
somebody with database access doing it by hand, unlogged. It writes a
**tombstone revision** naming who purged what, with no body, which is
what keeps it accountable.

---

## Markup additions

`api/mml/` gained an **article dialect**, selected by
`MarkdownOptions.longForm`. An options bag, not a fork: `parseMarkdown`
runs on every utterance, and a forked long-form parser would drift from
the chat one silently.

Added: `<h1>`–`<h3>` with **sticky `{#anchor}` suffixes**, indent-nested
lists, pipe tables, `<spoiler level="n">`. Every tag defines `flatten`.

> ⚠ **`api/__tests__/mml.corpus.test.ts` pins the chat path byte-for
> -byte**, including its defects (a `[label](mudcmd:…)` link after a
> space stays literal — the sentinel passthrough copies whole
> space-delimited words). A diff there means chat output changed, which
> is a failure regardless of whether the new output reads better. The
> article dialect narrows the passthrough; the chat dialect does not.

`<spoiler>` **flattens to its content**, not to a `[spoiler]` marker:
flatten is a failsafe projection of an already-gated body, so what
survives is content the reader may see. Hiding it would blank text on
exactly the surfaces with no client to un-hide it.

### Sticky anchors

An anchor is **minted once and held**, not derived from heading text: a
derived anchor changes when the words do, silently breaking every
citation. `Sections.reconcile(prior, next)` carries anchors forward
positionally and mints from text for new headings.

> ⚠ When the heading **count** changes, anchors are re-minted rather
> than matched positionally — a mis-aimed citation is worse than a
> broken one, because it is silent.
>
> ⚠ Rolling back restores that revision's anchors, which may be fewer. A
> citation to a newer section then dangles. Correct, but it reads as a
> bug.

---

## Maintenance

Four reports, all derived on read from the link graph rather than
maintained as an index — a **stale** backlink index is worse than a slow
one, because it reports links that are not there.

- `wiki links <page>` — backlinks. Follows aliases.
- `wiki wanted` — redlinks ranked by demand. The best authoring to-do
  list a wiki has, and it is written by its readers.
- `wiki orphans` — pages nothing links to.
- `wiki dangling` — articles whose subject template is gone. The CMS
  renames and deletes templates and the wiki points at paths, so this
  *will* happen; without the report a stale article quietly documents
  nothing.

`[[refs]]` inside `<code>`/`<pre>` are excluded, or an author writing
*about* the syntax would create phantom demand for a page called `Page`.

---

## Collections

| collection | holds | sandbox policy |
|---|---|---|
| `wiki` | current page state | `pass` (unmarked) |
| `wiki_revisions` | the append-only edit log | `pass` (unmarked) |

**PASS, beside `domain`** — the wiki is authored truth and a
**communications surface**. An article cannot affect advancement, cannot
mint anything, and cannot be spent; it is people writing to each other,
so there is nothing for the sandbox to contain. It is also strictly less
powerful than `domain`, which passes: a circle that may edit a room
template should not be refused an encyclopedia edit about one.

⚠ **Not STAMP**, which would be actively harmful: a scoped page
reverting on circle exit is a page an author watched themselves write
and then lose, and its scoped revision rows would collide with the
unique `{pageId, rev}` index. **Not the epistemic mark**, which is for
"what happened to *you*" — an article is not a personal record.

Authorization is unaffected: the protection ladder resolves through
`AccessApi`, which is circle-independent, so a circle confers no editing
right its occupant did not already hold.

Indexes: `{namespace, slug}` and `{namespace, aliases}` (the one name
space), `subject.ref` (the total reverse lookup), `tags`, and a **unique**
`{pageId, rev}` — two rows at one rev would mean a lost edit that
history records as having happened.

> The name index is deliberately **not** unique: `aliases` is an array,
> so a unique index would be multikey-unique across the collection and
> would reject two namespaces legitimately holding the same name.
> Uniqueness is enforced at the `WikiRegistry` write chokepoint, which
> is also where the refusal can name the holder.

---

## What this build does NOT do

Three shared substrates the wiki depends on and does not own:

- **Media ingest** — `<image key>` references an existing asset; there
  is no upload path. Three producers want one bucket (wiki, CMS,
  `illustrate.ts`), the route and S3 credentials belong in the backend
  tier, and building ingest here would make the wiki the second of three
  and the one recording provenance differently. Criteria 41/42 belong
  with it.
- **The search port** — the index must be over **source** with levels
  intact, because indexing renders is a spoiler leak by construction (a
  render is per-reader). Criteria 43/44/44a.
- **Durable notification** — nothing in the engine answers *"what
  happened to the things I care about while I was away."* The wiki emits
  nothing yet and **grows no inbox** (criterion 70, asserted); watching
  is the substrate's job. See
  [notification-slate.md](../slates/builds/notification-slate.md).

Also absent by decision: `wiki search` (a subcommand answering "not
available" would put a lie in `help wiki`), an `<mql>` component
(`resolveMany` needs a context carrying an actor, which C1 forbids
handing a component), and `recordAuthoring` wiring (`wiki_revisions`
*is* the wiki's authorship ledger, with the same context-derived author
rule).

---

## Cross-references

- [messaging.md](./messaging.md) — MML and the composer stack
- [message-rendering.md](./message-rendering.md) — the client renderer
- [mixins.md](./mixins.md) — the composition substrate the panel reads
- [studio.md](./studio.md) — `describeClass`/`describeMixin` (⚠ author
  -gated, which is why the panel does not use them)
- [access.md](./access.md), [parcel.md](./parcel.md) — the zone-anchored
  walk and the title registry
- [behavior.md](./behavior.md) — the path-resolved module pattern
  components reuse
- [document-store.md](./document-store.md),
  [persistence.md](./persistence.md) — Document vs Stuff
- [command-spec.md](./command-spec.md) — the verb shape
- [sandbox.md](./sandbox.md) — the collection policy table
