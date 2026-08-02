# Wiki — requirements

> **Status: AGREED 2026-08-02.** Scope closed; no open questions remain
> for the planner. The implementation shape — file layout, per-wave
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
  world. Subject binding is a property of a page, not a second kind.
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
- **No new `*Api`.** The Api layer is being reorganised before go-live;
  this build adds nothing to it.

## Non-goals

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
- **Anonymous/public read** — deferred; needs REST, not the command bus.

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
<composition of="/lib/material/oak" />   live mixin architecture
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

### D7 — ⚠ No `WikiApi`. The article is reached through its subject

`DocumentedMixin` composes onto the documentable Stuff kinds —
**`Material`, `Biome`, `Species`, `Location`** — and gives:

```
subject.getArticle()            the page documenting this, or null
MixinApi.isDocumented(x)        narrowing
```

The mixin holds **no data**. The *page* points at its subject; the mixin
resolves by query. So a game model carries zero wiki fields (the slate's
decoupling rule survives intact) while the wiki is still reached the
mixin-native way.

`Location` is the hook for places. `ParcelRecord` is a `Document`, not a
Stuff, so titled extents cannot carry the mixin — places are documented
as Locations, which is the better subject anyway.

Rendering lives on `WikiPage` itself (`page.render(reader)` → parse →
expand → resolve → gate → emit). The controller calls the page or the
subject directly. Nothing is added to the Api layer.

### D8 — One page model; the subject is optional

A page has an optional `subject` (a templatePath). Bound pages can use
`<composition>`; free-standing pages — lore, guides, system pages — are
identical in every other respect. **System pages are written on demand
and need no separate mechanism**: a page about a command is a page.

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

5. `DocumentedMixin` composes onto `Material`, `Biome`, `Species` and
   `Location`; `MixinApi.isDocumented` narrows.
6. `subject.getArticle()` returns the page documenting it, or null.
7. **No wiki field is stored on any game model** — asserted.

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

**Gates**

32. `pnpm test`, `pnpm lint`, the ten script lints, type-clean.
33. Tests cover every criterion above that is not a doc claim.

---

## Sequencing constraints

The plan owns the wave breakdown. Two ordering facts bind it:

- **Waves touching field metadata must follow build-1's
  `reference-lifetime` refactor** (D9). The page model, the permission
  anchoring, the link graph and the MML long-form tags do not, and can
  proceed against master today.
- **Template expansion must precede component resolution** (D6), because
  a template can emit a component.

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
