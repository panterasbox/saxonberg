# Wiki — requirements

> **Status: COMPLETE DESIGN, 2026-08-02.** This is deliberately **not**
> scoped to a build. Every surface the wiki needs is designed here,
> including the ones that are expensive; a build scope gets carved out of
> it when we are ready to build, in whatever state the design is in then.
>
> Nothing below is deferred *because it is hard*. The only things absent
> are the ones permanently rejected (see *Out of scope*) and the ones
> another slate owns. The implementation shape — file layout, per-wave
> contents, test inventory — belongs to `docs/plans/wiki-plan.md` and is
> deliberately not settled here. Code blocks below are **illustrative of
> a decision**, never a prescribed signature.

A **community-maintained encyclopedia of the world's nouns.** Materials,
biomes, species, places — the things a player consumes and works with —
plus lore, guides, and system pages written on demand.

What separates it from the help system is not subject matter but
**substance**: in this engine a thing's behaviour *is* its mixin
composition, so an article can carry a **live architecture panel**
alongside its authored prose. Help tells you what a verb does; the wiki
tells you what oak *is*, and therefore what you can do with it as a
consumer and how you work it as labour. That panel is derived at read
time and can never go stale.

Seeding slate: [wiki-slate.md](../slates/builds/wiki-slate.md). The
education consumer and its source ladder:
[college-slate.md](../slates/builds/college-slate.md) § *The wiki — the
commons the courses read from*.

**Scope posture:** server and data model are the deliverable. The client
gets exactly enough to read a page, follow a link, and submit an edit —
rudimentary by decision, not omission.

---

## Goals

- **One page model**, whether or not a page documents something in the
  world. Subject binding is a property of a page, not a second kind — and
  the subject is **any template path**, so anything in the game can have
  an article.
- Articles are **rich and composable**: the body is a component tree, not
  a string, and joins against live sources are expressed *in the article*
  and resolved at render.
- **Authors can extend the wiki without a developer** — parameterised
  templates, no code.
- A **stable citation target**: rename freely, never break a link or a
  course citation.
- **Revision history** in an append-only log; any edit recoverable.
- **Permissions through the shipped `AccessApi`**, one controller
  chokepoint, namespaces anchored to `FolderZone`s.
- **Internal links resolve**, including to pages that don't exist yet.
- **MML carries long-form prose** — headings, nested lists, tables.
- The **spoiler read path** holds: over-capability content never crosses
  the wire; over-appetite content arrives tagged.
- **No new `*Api`**, and **no change to any game class**. The Api layer
  is being reorganised before go-live; this build adds nothing to it, and
  documentability is a property of a template path rather than something
  a class opts into.

## Out of scope

- **A rich client.** The shared viewer/search substrate belongs to
  [client-shell-slate.md](../slates/tails/client-shell-slate.md).
- **Author-authored code.** Templates compose and parameterise; only
  registered components reach live sources. No executable JS from a page.
- **Generated pages / a gazetteer projected from gamestate** — rejected
  by the slate. Every page is authored; only *panels within* a page are
  derived.
- **A personal codex** from per-player knowledge — rejected.
- **A diegetic front** (librarian, journal) — a later consumer.
- **Progress-gated reveals.** Capability is reader identity, never
  in-game progress.
- **Primary sources.** Papers live in the library; the wiki cites them.
  Merging the tiers collapses the source ladder.
- **Api reference pages.** Forums and chat already carry that
  conversation.
- **Assessment integrity measures** — closed by the college slate.
- **Anonymous/public read** — designed in *Reading without a session*
  below; it needs REST rather than the command bus, which is a cost, not
  a rejection.

---

## Surface decisions

### D1 — Revisions live in their own append-only collection

`wiki` holds current state; **`wiki_revisions`** holds the log — one row
per edit with the full prior body, author, timestamp, optional comment.

The shipped house pattern (`parcel_events`→`parcels`,
`chattel_events`→`chattel`, `bank_ledger`→`bank_accounts`), chosen over
the slate's embedded `revisions[]` because a heavily-edited page would
eventually hit **Mongo's 16MB document cap**, and every page *read* would
otherwise drag the whole history.

Snapshots, not diffs: rollback is a copy, not a computation.

### D2 — Immutable id is the identity; the slug is a label

The durable `_id` is what links and citations resolve to. `slug` is
renameable; the previous slug appends to `aliases`, so old references
keep working. Course lessons **cite and never restate**, which makes a
broken citation a broken lesson.

### D3 — MML gains headings, nested lists and tables

Today MML is `strong · em · code · pre · blockquote · strike · list · li
· link · mention` — a chat markup that cannot express an article.

| Added | Notes |
|---|---|
| `<h1>`–`<h3>` | slugged anchors, so `[[Page#section]]` lands |
| `<list>` nesting | one level today; arbitrary depth after |
| `<table>` `<tr>` `<th>` `<td>` | no spans, no alignment in v1 |

Each needs a markdown source form, a `flatten` entry (every MML tag must
define its plain-text fallback), and a rudimentary client renderer.

### D4 — ⭐ The body is a component tree, and MML already is one

```ts
export type MmlNode =
  | { kind: 'text'; text: string }
  | { kind: 'tag'; tag: string; attrs: Record<string,string>; children: MmlNode[] };
```

That is JSX's data model — element, props, children, nesting. MML is not
a string format to be replaced; it supplies the syntax and the tree. What
is missing is a **runtime**, and that is what this build adds:

1. **A resolver pass** between parse and render — server-side, per
   reader, async (it reaches live sources).
2. **A component registry** — which tags resolve rather than render.
3. **Structured props** — JSON-in-attribute, no parser change.

The existing `<mql>` sleeper tag is the precedent; this generalises it.

**This supersedes the slate's wave-2 "embed palette".** There is no
separate embed mechanism — there are components, and the architecture
panel is one of them:

```
<composition of="/lib/material/oak" />   live architecture of any template
<help verb="plant" />                    transclude a command spec
<mql query="…" />                        live world query
<infobox>…</infobox>                     pure presentation
```

MML's hot path is untouched: scenes and speech never run the resolver.

### D5 — Components are path-resolved modules, not an Api

A component is a module at `lib/wiki/components/<name>.ts` with a sole
export — the **brain pattern** (`lib/behavior/`), which is an existing
sanctioned module category:

```ts
export const component = class WikiComposition {
  static label = 'composition';
  static props = { of: 'string' };
  static async render(props, ctx): Promise<MmlNode[]> { … }
};
```

Re-resolved per invocation via the shipped `StuffApi.resolveExport`, so
components hot-reload and adding one is dropping in a file. **No
registry object, no new Api** — the same reasoning that makes brains
path-resolved.

### D6 — Author templates, expanded before components resolve

A page in the **`Template:` namespace** is a reusable fragment taking
parameters, expanded at render:

```
{{Infobox|title=Oak|class=hardwood}}
```

This is where most of a wiki's real richness lives — infoboxes, citation
formats, navboxes — and it is the half authors can extend **without a
developer**. No code: markup plus substitution.

**The capability line:** templates compose and parameterise; only
registered components reach live sources. An author can build any
presentation they like and cannot reach game state except through a
component a developer wrote.

Expansion runs **before** component resolution and needs a depth cap and
cycle detection (a template including itself, or a pair including each
other). Both are hard failures that render an inline error, never a hang.

### D7 — ⭐ The subject is a TEMPLATE PATH; anything in the game can be documented

A page's optional `subject` is a **path in the `domain` collection** —
nothing more:

```
subject: "/lib/material/oak"      a material
subject: "/obj/npc/odile"         somebody's favourite NPC
subject: "/obj/light/torch"       a generic torch
subject: "/domain/terminus/registry/office"   a place
```

Resolution is `path → Template.findByPath → template.class → the backing
class → its composition`. Which means the architecture panel works for
**any authored template**, including one with no live instance anywhere
in the world.

> **⚠ This withdraws `DocumentedMixin`, proposed earlier in this
> conversation.** Hooking articles to a mixin on `Material` / `Biome` /
> `Species` / `Location` was strictly worse: it required a live Stuff (so
> a torch nobody has lit could not be documented), it touched hundreds of
> game classes, it enumerated in advance which *kinds* of thing deserve
> articles, and it put a wiki-shaped marker on game models. A template
> path needs none of that, and it makes the slate's "no wiki fields on
> game models" literally rather than nearly true. The mixin *composition
> panel* is unaffected — that was always about article content, and it
> now reads the class behind the path.

**At most one canonical article per subject**, so the reverse lookup
("is this template documented?") is total. A second take on the same
thing is an ordinary page that links.

### D8 — Filing is the author's; seeding is ours

The subject does **not** determine where a page lives. Namespaces remain
the access and organisation axis; tags are free-form; a player writing
about their favourite NPC files it wherever they like. We do not impose a
taxonomy on community contribution, and the wiki must not require one
before a page can exist.

**Where the taxonomy IS the thing's identity — materials, biomes — we
seed deliberately**, because there the structure is not an editorial
choice, it is the subject matter. Everything else grows organically and
is reorganised later if it ever needs to be. Over-organising an empty
wiki is how wikis die.

### D8a — The CMS authors the template; the wiki documents it

Both key on the same `domain` path, which makes the relationship free:
from a template in the CMS to its article, and from an article to the
template it documents. The **seam is the shared path** and nothing more —
no integration work in v1, no coupling in either direction, and neither
side needs to know the other exists for both to function.

### D9 — ⭐ Derived fields carry their own spoiler level

A composition panel emits **live field values**, and some of those are
spoilers — a species' resistances, a hazard's trigger, a creature's
weakness. Authored prose carries page-default and inline tags; derived
fields carry nothing, so without this the panel is a hole straight
through the reveal model.

The level belongs **on the field, at its declaration** — as one more
property on `FieldMetaEntry`:

```ts
/** Reveal level of this field's VALUE wherever it surfaces. */
spoiler?: 0 | 1 | 2 | 3;
```

⚠ **This depends on the `reference-lifetime` refactor in build-1**, which
replaces four statics with one `static fieldMeta` and moves the Studio
off its TSDoc source scan onto declarations. That work has already
absorbed `@authorable` → `authorable?: true` and `@runtimeState` →
`runtimeState?: true`, so `spoiler` is the same shape as its neighbours
and needs no new mechanism: `MixinApi.getAllFieldMeta` already collects
and merges it property-level up the composition chain.

**Sequencing:** waves 1 and 2 touch no field metadata and can proceed
against master today. Only wave 3 needs this, so the dependency is
isolated by the wave order rather than managed. If wave 3 is reached
first, one seam — `spoilerLevelOf(ctor, field)` — is the whole
adaptation.

At the field rather than in the component, because the same field is a
spoiler *wherever* it surfaces — wiki panel, Studio, help, a future
codex. A policy table owned by the wiki would be wrong the moment
anything else renders the same value.

Both axes then apply to derived content exactly as to prose:
**capability omits the field server-side** (it never serialises), and
**appetite tags it** for the client to collapse.

> **⚠ DECIDED: an untagged field defaults to level 0 — open.**
>
> This is a reveal system defaulting to reveal, so it is worth stating
> plainly why. Default-spoiler would empty every panel until several
> hundred mundane fields were tagged, and would train authors to tag
> reflexively rather than thoughtfully; density and hardness are not
> spoilers, a species' resistances are. The rejected alternative was
> per-mixin opt-in (fields withheld unless a mixin lists them
> panel-visible).
>
> **The cost is real and is not being papered over:** a newly-added
> spoilery field is visible until somebody tags it. It is covered the way
> the sandbox boundary exemptions are — **by enumeration, not
> inference**. A test snapshots every field the panel can surface
> together with its level, so introducing a spoiler without a tag shows
> up as a diff in review rather than as a leak in production. That test
> is acceptance criterion 28 and is not optional.

### D10 — Namespaces anchor to `FolderZone`s, mirroring the source tree

`AccessApi.can` is zone-anchored and page data is deliberately not a
Stuff, so there is nothing on the page to walk from. The **namespace
tree** gets `FolderZone` stamps under `/wiki/<namespace>`, and
`resolveWikiNamespaceZone` mirrors the shipped
`AccessRegistry.resolveSourceFolderZone` walk. `accessGroups` then
propagate down the tree with filesystem-ACL semantics.

Only the namespace is anchored, and only for access.

### D11 — Open at the root, moderated by rollback

The edit floor is a broad all-signed-in-players group on `/wiki`.
Community maintenance is the point; the revision log plus owner-role
rollback and delete is the net. A curated group per namespace is just a
different `accessGroups` value — no code.

Bootstrap mints `wiki-editors` + `wiki-moderators` and stamps `/wiki`,
mirroring the shipped lounge bootstrap.

### D12 — Namespaces *and* tags

Namespaces are the access and organisation axis (they carry the zone
anchor). Tags are cross-cutting and carry no permission meaning.

---

## The authoring loop

The data model was designed before the loop, which is backwards, and it
left four gaps. Here is the whole path.

### A1 — Edit transport: a structured submission, never a typed command

Typing an MML article into the command bar is absurd, so the **verb
carries the intent and the body rides the structured channel** — the
same prompt/structured-arg path a long-form submission already uses.
`wiki edit <page>` opens; the payload returns; the controller gates it
exactly as it gates everything else. The command bus stays primary (the
act is a `wiki edit`), and the body never has to survive tokenisation.

### A2 — Section editing, because it is also the conflict answer

`wiki edit <page> --section <anchor>` edits one heading's span. This is
Wikipedia's oldest usability feature and its most effective concurrency
control at once: two people working on different sections of a long
article never collide, which removes most conflicts rather than
resolving them.

### A3 — ⚠ Concurrent edits: compare-and-swap on `rev`

**This is a data-model gap, not a client concern.** The page carries a
monotonically increasing `rev`; an edit submits the `rev` it was based
on; the server rejects a mismatch.

Without it, last-write-wins **silently destroys** work, and revision
history does not save you — it faithfully records that B overwrote A,
and A's edit is still gone. A history that documents the loss is not a
safety net.

On rejection the server returns the base body, the current body, and the
submitted body, so the client can show a three-way. **No auto-merge** —
a wiki edit is prose, and a machine-merged paragraph is worse than an
honest conflict.

### A4 — Preview is free if the pipeline takes a body

**The render pipeline keys on a body, not a page id.** Then preview is
the same path over unsaved text — templates expanded, components
resolved, spoilers applied — and costs nothing.

If it keys on page id instead, preview becomes a second rendering path,
and second paths drift until preview lies about what saving will do.
This is the cheapest architectural decision in the document and the one
most easily got wrong by accident.

### A5 — Drafts and edit summaries

An edit carries an optional **summary** (recorded on the revision — it
is what makes history readable, and it is one field). A **draft** is a
revision with `published: false`: the page keeps serving its last
published body while a long edit is in progress. Same log, one flag, no
second store.

---

## Media

The pipeline that exists: `MediaAsset` rows in `media_assets` carrying
generation provenance, `Visible.illustration` holding a
**bucket-relative key**, and the *client* prepending its configured media
base URL. Assets are produced offline by `src/tools/illustrate.ts`, which
renders **from the internal model** and uploads to S3.

### M1 — Referencing an existing asset is free

`<image key="…">` emits a key the client already resolves. And a
subject-bound article gets its subject's illustration for nothing,
because the template already carries `illustration` — an article on
Odile shows Odile without anybody uploading anything.

### M2 — Requesting a generated illustration

An article about a template can ask for one, and `illustrate.ts` already
renders from the internal model — the same source the composition panel
reads. The request is editorial metadata; the generation stays offline
and deliberate, because it costs money and style consistency is
curated.

### M3 — ⚠ Community upload, and why it is a build of its own

There is **no runtime write path to S3**, and the import boundary means
mudlib code cannot have one — this is a backend concern by construction.
A community wiki whose authors cannot add a screenshot is a real
limitation, so the design carries it rather than pretending otherwise:

- **Route + credentials** in the backend tier, never the mudlib.
- **Type allowlist** (png/jpeg/webp), **byte cap**, **dimension cap**,
  all rejected server-side; never trust a declared content-type.
- **Provenance is a discriminator on `MediaAsset`.** The existing fields
  (`prompt`, `model`, `styleVersion`, `sourceContentHash`) describe a
  *generated* asset. A human upload needs `uploader`, `uploadedAt`,
  `originalFilename` and a declared source/licence. Additive, and the
  two kinds must stay distinguishable — an uploaded image must never be
  mistaken for a curated render.
- **Moderation is nearly free**: `MediaAsset.status` already exists, so an
  upload lands `pending` and a moderator promotes it. Nothing unreviewed
  is ever served.
- **Rate-limited per uploader**, and gated on the editor group, so the
  abuse surface is bounded by an existing membership decision.

---

## Search, and why the index is over SOURCE

Indexing rendered output is a **spoiler leak by construction**: a render
is per-reader, so the index either has to exist per-reader (impossible)
or hold the maximal render and leak everything above the searcher's
ceiling.

So **the index covers the authored source, with its spoiler tags intact
and a level per fragment**; the query filters fragments above the
reader's capability before ranking. Component output is **never
indexed** — derived content is searched at its source, which is where it
is authoritative anyway. A material property is found by searching
materials; the oak article is found by its prose.

That also makes indexing cheap: no resolver runs, and an edit reindexes
one document.

---

## Citations and stable anchors

The college slate's rule is that **a course cites and never restates**,
so that a wiki improvement never staleness a lesson. That forces two
things:

- **A citation names the page, not a revision.** Pinning a revision
  would freeze the lesson against exactly the improvement the
  arrangement exists to inherit.
- **Section anchors must be durable**, because a citation worth making
  is usually finer than a whole page. Deriving an anchor from heading
  text is fragile — an editorial rewording silently breaks every
  citation. So a heading's anchor is **assigned once and sticky**: set
  explicitly by the author, or minted from the first heading text and
  then held, surviving later rewording.

`pageId#anchor` is therefore the citable unit, and both halves are
stable under ordinary editing.

---

## Untrusted input: the render budget

A page is community-authored input that runs a resolver, so the render
path needs hard bounds, all of which fail with an inline error rather
than a hang:

| Bound | Why |
|---|---|
| template expansion depth | a template including itself |
| template cycle detection | a pair including each other |
| components per render | a page with ten thousand of them |
| per-component timeout | one slow source stalls the page |
| total output size | expansion bombs |

**No component may trigger a page render**, which keeps recursion
impossible rather than merely bounded.

---

## Moderation and protection

- **Rollback and delete** by the namespace's owner role — the v1 net,
  already designed.
- **Per-page protection** overriding the namespace default (anyone /
  editors / moderators), for the handful of pages that attract
  vandalism.
- **Blocking an editor is a group removal** — free, and it uses the
  membership machinery that already exists rather than inventing a ban
  list.
- **A review queue is deliberately absent.** Open editing plus fast
  rollback is the wiki-classic bargain, and a queue converts a commons
  into a submission process. Revisit only if abuse actually appears.

---

## Maintenance surfaces

The reports that keep a wiki from rotting, all derivable from the link
graph and the subject field:

- **What links here** — backlinks for a page.
- **Wanted pages** — redlinks ranked by how many pages want them, which
  is the best authoring to-do list a wiki has.
- **Orphans** — pages nothing links to.
- **⚠ Dangling subjects** — articles whose `subject` names a template
  that no longer exists. The CMS deletes and renames templates, and the
  wiki points at paths, so this *will* happen. It is the wiki's own
  version of the shipped gate lint, and without it a stale article
  quietly documents nothing.

---

## Reading without a session

Public read of level-0 pages is the newcomer and SEO path. It needs a
**REST surface** rather than the command bus, because there is no
session to carry a command. The capability ceiling for an anonymous
reader is the floor — level 0, no components that read live state, no
subject panels beyond what a logged-out visitor could see anyway.

The data model does not preclude it: a level-0 render needs no session
state.

---

## Constraints

- **No new `*Api`.** New surface rides mixins, path-resolved component
  modules, or Document methods.
- **No new module categories.** Page/revision are `Document`s
  (`lib/wiki/`), `DocumentedMixin` is a mixin, components follow the
  brain pattern, the verb is a YAML view + controller. Anything fitting
  none of these is a STOP.
- **`Collections` is the name vocabulary** — `Wiki` / `WikiRevisions` go
  there, never string literals.
- **`Mixins` registry** gains `Documented`.
- **The acting principal comes from execution context**, never a
  parameter — revision authorship included.
- **Mutations are `FromController`-gated** so the controller is a real
  chokepoint.
- **One dispatch verb with subcommand fallthrough** (the `chat` shape).
- **Over-ceiling content is omitted server-side** — never sent and
  hidden.
- **Component and template expansion are bounded** — depth caps, cycle
  detection, and a per-render component budget. A page is
  community-authored input; it must not be able to hang a render.
- **Every new MML tag defines `flatten`.**
- **The import boundary holds.**
- **Mixed quotes by area; never `prettier --write`.**

---

## Acceptance criteria

**Page model**

1. `WikiPage` persists id, slug, namespace, title, frontmatter, body,
   aliases, tags, spoiler level, and an optional subject.
2. Reachable by id, slug, and any alias.
3. Rename changes the slug, appends the old one to `aliases`, and leaves
   every link and citation resolving.
4. A subject-bound and a free-standing page differ only in `subject`.

**Subject binding**

5. A page's `subject` may be **any path in `domain`** — a material, an
   NPC, a torch, a place — and a template with no live instance is
   documentable.
6. The reverse lookup (template path → its article, or null) is total,
   and a subject carries at most one canonical article.
7. **No wiki field is stored on any game model, and no game class is
   modified to make it documentable** — asserted.

**Revisions**

8. Every edit appends a `wiki_revisions` row with the full prior body and
   the context-derived author.
9. `wiki history` lists revisions newest-first.
10. `wiki rollback` restores a revision's body **and appends a new
    revision** — the log stays append-only.
11. Reading a page does not load its history.

**Components**

12. `<composition of="…">` renders a subject's live mixin architecture,
    and changes when the subject's composition changes — with no edit to
    the page.
13. An unknown component renders an inline error, not a broken page.
14. A component exceeding the per-render budget is cut off with a
    diagnostic.
15. Adding a component is adding a file — no registration edit.

**Templates**

16. `{{Template|param=value}}` expands with substitution.
17. A self-including template, and a mutually-including pair, both fail
    with an inline error rather than hanging.
18. A template cannot reach live game state except via a component.

**Permissions**

19. Edit, delete and rollback are refused outside the namespace's groups,
    naming the reason.
20. The same operations are unreachable except through the controller.
21. A namespace with narrower `accessGroups` is editable only by that
    group, with no code change.

**Links + markup**

22. `[[Page]]` resolves, renders a redlink when absent, and follows
    aliases.
23. Headings, nested lists and tables round-trip and each defines
    `flatten`.

**Spoilers**

24. Over-capability content is absent from the payload — asserted on the
    wire, not the render.
25. Over-appetite content is present but tagged.
26. Frontmatter default applies where no inline tag overrides.
27. ⭐ **A `spoiler`-declared field is gated in a derived panel exactly
    as tagged prose is** — omitted server-side above the reader's
    capability, tagged above their appetite. Asserted on a real
    composition render, not on the tag scan.
28. A snapshot test enumerates every field the composition panel can
    surface with its level, so an untagged spoiler surfaces as a review
    diff.

**Content + docs**

29. Seed pages exist and render, including at least one subject-bound
    page with a live composition panel.
30. `docs/subsystems/wiki.md` owns the model, the component/template
    contract, the permission anchoring and the markup additions.
31. `CLAUDE.md` gains a map entry and two collection lines;
    `architecture.md` gains `DocumentedMixin` and the component category.

**Authoring loop**

34. An edit submits the `rev` it was based on; a mismatch is **rejected**,
    and the response carries base / current / submitted bodies.
35. Two edits to *different sections* of one page both succeed.
36. Preview renders an unsaved body through the **same** pipeline as a
    saved one — asserted by rendering identical text both ways and
    comparing.
37. A draft revision does not change what the page serves.
38. An edit summary appears in history.

**Media**

39. `<image key="…">` resolves an existing asset; a subject-bound page
    surfaces its subject's `illustration` with no authoring.
40. An upload is rejected for disallowed type, oversize bytes, or
    oversize dimensions — decided server-side, never from a declared
    content-type.
41. An uploaded asset lands `status: pending` and is **not served** until
    promoted.
42. Uploaded and generated provenance are distinguishable on the row.

**Search**

43. The index is built from source; a component's output is absent from
    it.
44. A fragment above the searcher's capability is not returned, and does
    not influence ranking.

**Citations**

45. `pageId#anchor` survives a heading rewording.
46. A citation resolves to the page's current content, not a pinned
    revision.

**Budget**

47. Self-including and mutually-including templates both fail inline.
48. A page exceeding the component count, per-component timeout, or
    output-size bound fails inline rather than hanging.
49. No component can trigger a page render.

**Maintenance**

50. Backlinks, wanted pages and orphans are derivable.
51. An article whose subject template no longer exists is reported.

**Gates**

52. `pnpm test`, `pnpm lint`, the ten script lints, type-clean.
53. Tests cover every criterion above that is not a doc claim.

---

## Ordering, for whenever we build

Not a scope — the design is complete above. These are the dependencies a
build order has to respect:

- **`rev` and the body-not-id render path are foundational.** Retrofitting
  either means rewriting every client written against their absence.
- **Anything reading field metadata follows build-1's
  `reference-lifetime` refactor** (D9).
- **Template expansion precedes component resolution** (D6) — a template
  can emit a component.
- **Anchors must be sticky before anything cites them**, or the first
  citations are the ones that break.
- **Upload is separable**: reference-only media (M1, M2) has no
  dependency on the upload path (M3), so the wall can be hit later
  without redesign.

## Cross-references

- [wiki-slate.md](../slates/builds/wiki-slate.md) — the seeding slate
- [college-slate.md](../slates/builds/college-slate.md) — source ladder,
  cite-never-restate, contribution-as-coursework
- [mixins.md](../subsystems/mixins.md) — the composition substrate the
  architecture panel reads
- [studio.md](../subsystems/studio.md) — `describeClass`/`describeMixin`,
  the shipped mixin-description surface
- [access.md](../subsystems/access.md) — the zone-anchored walk D9 mirrors
- [message-rendering.md](../subsystems/message-rendering.md) +
  [messaging.md](../subsystems/messaging.md) — MML and its renderer
- [behavior.md](../subsystems/behavior.md) — the path-resolved module
  pattern D5 reuses
- [document-store.md](../subsystems/document-store.md),
  [persistence.md](../subsystems/persistence.md) — Document vs Stuff
- [command-spec.md](../subsystems/command-spec.md) — the verb shape
- [grouping.md](../subsystems/grouping.md), [zone.md](../subsystems/zone.md)
  — groups and the `FolderZone` bootstrap
