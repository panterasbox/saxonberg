# Wiki slate (working doc)

> **Status: shape proposed.** A **community-maintained wiki, built into
> the client** — its own beast. **Every page is authored** (by the
> community + the dev); there is **no** generation from gamestate and
> **no** wiki-only fields bolted onto game models. Content is plain
> `WikiPage` **Documents** in their own collection, fully decoupled from
> the Stuff/Template/`domain` machinery. Pages are authored in the
> project markup (MML) with **YAML frontmatter** and a **closed embed
> palette** (the safe stand-in for the "import components into markdown"
> trick). A **two-axis spoiler model** governs reveals: a player-set
> **appetite dial (levels 0–3)** — client blur-with-reveal — crossed
> with a **capability ceiling** (reader role/group, server-enforced);
> **level 3 surfaces the actual source.** Permissions **reuse
> `AccessApi` + groups**, enforced in a single `wiki` verb's
> **controller** per invocation. Function over form — a diegetic
> narrative front can ride later as a *consumer* of this data; we don't
> build one now.

This slate is the **content** half of a systems↔content pair with the
help system. The split is by *center of gravity*, not a wall: **help
leans systems** (commands, taxonomies, mechanics — the engine surface,
generated from code + data), **the wiki leans content** (specific NPCs,
areas/maps, lore, quests, guides — human prose). That matches every game
wiki out there: content-heavy, systems-thin — the inverse of help. The
two **overlap heavily and cross-transclude**, and they ride **one shared
reading substrate** — viewer, search, the **spoiler system**, and the
**transclusion/embed palette** — all owned by the shell slate; wiki and
help are both *consumers*. The wiki is deliberately a *normal wiki* —
pages, revisions, edit permissions, internal links — not a projection of
the world. Its whole value is being **community-maintained and deeply
in-client** (live transclusions, spoiler tiers, source-at-L3) in ways an
external Fandom-style wiki structurally cannot be.

See also:

- [client-shell-slate.md](../tails/client-shell-slate.md) — owns the **shared
  reading substrate**: viewer + search + **spoiler gating** + the
  transclusion/embed palette. Wiki (content) and help (systems) are both
  consumers; spoiler is applied per-reader-session across both, not a
  wiki feature. Search shows grouped results (Docs · Wiki).
- [spoiler-slate.md](../deferred-rpg/spoiler-slate.md) — the **reveal model** this
  reuses (best-effort, server-side fact-gating, percept
  revelation-conditions). **Delta to flag:** the 0–3 graduated appetite
  dial is a sharper answer to that slate's open question #3 (it currently
  leans "start global") — spoiler-slate should adopt the graduated
  scalar.
- [docs/subsystems/access.md](../../subsystems/access.md) +
  [access-slate.md](../tails/access-slate.md) — `AccessApi.can` /
  `canMutateZone` / `isWizard`, the zone-anchored slice walk over
  `ownerGroup`/`accessGroups`, and `resolveSourceFolderZone` (the
  namespace-anchoring pattern the wiki mirrors). Reused wholesale.
- [cms-slate.md](./cms-slate.md) — the **level-3 source** embed is the
  CMS code-editor's *read* side (`SourceTreeApi`); "view the source
  behind this" (wiki) hands off to "edit it" (CMS) → "test it" (game).
- [docs/subsystems/command-spec.md](../../subsystems/command-spec.md) +
  [command-routing.md](../../subsystems/command-routing.md) — the `wiki`
  verb + `WikiController` follow the standard MVC verb pattern; the
  `FromController` narrow-entry gates the mutations.
- [docs/subsystems/messaging.md](../../subsystems/messaging.md) +
  [message-rendering.md](../../subsystems/message-rendering.md) — the MML
  the page body is authored in; the renderer + click model the viewer
  reuses; the `<mql>` sleeper tag the embed palette extends.
- [persistence-architecture-slate.md](../tails/persistence-architecture-slate.md)
  — `WikiPage` is a plain `Document` (no Stuff overhead).
- [docs/subsystems/grouping.md](../../subsystems/grouping.md) +
  [zone.md](../../subsystems/zone.md) — Groups + `FolderZone` stamps the
  bootstrap mints (mirrors the shipped lounge group + `/lib/lounge` /
  `/domain/lounge` stamps).

---

## Principle

1. **Its own beast.** Standalone, community-maintained, **decoupled from
   game models.** Every page is authored. No generation from gamestate;
   no wiki-only fields on Stuff/Templates. The wiki never reads game
   models *as a storage source* — only at render time, via opt-in
   embeds.
2. **Function over form.** A reference surface, not diegetic content. The
   knowledge lives in the exposed data layer, so a narrative front (a
   librarian NPC, a journal item) can be a *later consumer* — not built
   here.
3. **Own, not external.** The value is the integration — MML embeds,
   spoiler tiers, in-client reading, source at level 3 — none of which
   survive on Fandom. (SEO/cold-start is covered by public read of
   level-0 pages, not by an external host.)
4. **Reuse, don't reinvent.** Storage is a `Document` collection;
   permissions are `AccessApi` + groups via a controller; rendering and
   search are the shell's shared viewer/search/embed palette. The only
   genuinely new thing is the page model + the `wiki` verb.

---

## The data model — `WikiPage` Document

Plain `Document`s in their own **`wiki` collection**, outside the
Stuff/Template/`domain` machinery entirely.

```
WikiPage {
  slug:        string         // stable id within a namespace
  namespace:   string         // e.g. "lore" | "guides" | "mechanics"
  title:       string
  frontmatter: { … }          // YAML (below)
  body:        MmlString      // the prose + inline embeds
  revisions:   Revision[]     // { author, at, snapshot } — append-only
  aliases:     string[]       // redirects / alternate titles
}
```

- **Revision history is the safety net.** Every edit appends a revision;
  rollback restores one. This is what makes open editing tolerable.
- **Fully decoupled.** A page never persists data onto a game model, and
  game models never carry wiki data. Embeds (below) *reference* game or
  source data at render time only.

---

## Frontmatter

YAML at the page head — at home in this codebase (command views are
YAML, template data is declarative). Holds:

- `title`, `namespace`, `aliases`/redirects
- `spoilerLevel` — the **page default** (0–3); inline tags override per
  section
- `related` — links to sibling pages
- `embeds` — declared widgets (next section)
- `tags`/`categories` — cross-cutting grouping

---

## Content: MML-as-MDX

The body is authored in the **project markup (MML)** so the shared
renderer, click model, and theming all apply for free. The cool part of
the old hand-rolled wiki — *import components into the markdown and
interpolate them* — is preserved as a **closed, parameterized embed
palette** instead of arbitrary code (community pages can't ship
executable JS, and bus-primacy forbids a parallel channel):

The embeds are **transclusions** — they reference a single canonical
source at render time and **never copy it into wiki content** (no
duplication, no drift):

- `{{help:…}}` — transclude a help view (a command spec, a taxonomy
  page) live from the help system. A content page weaves canonical
  system data into prose **without owning a copy** — better than a bare
  link (in-context) and better than scraping (help stays the single
  source).
- `{{entity:…}}` / `{{template:…}}` — transclude a specific entity's /
  template's data (an NPC, an area), **spoiler-gated**: blurb at low →
  stats at medium → raw template + source at high/developer. This is how
  a content page goes *deeper than help*. It is **not** the rejected
  gazetteer (see below).
- `<mql>` / taxonomy view — a **live** query over the world / a
  taxonomy, the cockpit slate's sleeper tag. Render-time consumer;
  stores nothing.
- **source viewer** — the level-3 embed; reads via `SourceTreeApi`,
  developer-gated.
- image / page-card / cross-link, etc.

Two tiers fall out of the spoiler/permission model: **dev/author pages**
may use the richer embed set (incl. internal/level-3 widgets);
**community pages** get the safe subset.

**Transclude, don't copy — and a page exists only if it's editorial.**
Wiki *content* is purely editorial prose; structured data appears only as
a live transclusion from its canonical home (help for systems, the game
model for entity data, MQL for taxonomies). If a topic is *purely* the
structured view with nothing editorial to add, it isn't a wiki page at
all — it lives at its source and the wiki just links.

**Internal links** are the wiki's spine — a `[[Page]]`-style construct
(an MML tag) with redlink-to-create behavior. Authored links between
pages, plus `related` frontmatter.

> Open question: whether MML already covers long-form doc constructs
> (headings, lists, tables) or needs extensions. The wiki is the
> forcing function if it doesn't.

---

## The spoiler model — two axes

Both ride the spoiler slate's reveal substrate (best-effort, server-side
fact-gating), which is a **shell-level concern** — the shared viewer
applies the reader's dial + capability to *any* content it renders (wiki,
help, or a transclusion), so spoiler is not a wiki feature. A fact shows
iff **capability allows** *and* **its level ≤ your appetite** (or you
click to peek).

- **Appetite dial (player setting, 0–3) — client-side blur-with-reveal.**
  Among what you're allowed to see, how much you want shown. Content is
  tagged with a level (page default + inline); content above your dial
  is collapsed behind a "reveal (level N)" affordance you can peek past.

  ```
  0  none      nothing flagged as a spoiler shows
  1  low
  2  medium
  3  high      everything you have the capability to see
  ```

  What content lands at each level is an **emergent authoring
  convention**, not a fixed taxonomy — that's what makes the dial
  accommodating. Source is the natural "high" exemplar, and it's
  *additionally* capability-gated to developers (see below).

- **Capability ceiling (reader role/group) — server-enforced.** What
  you're *allowed* to see at all. This is just **`AccessApi` group
  membership**: a `teacher` group for answer-key/teacher tiers,
  `AccessApi.isWizard` for **level 3 = the actual source**. Above
  your ceiling, the server **omits** the content — it never crosses the
  wire (so you can't dial yourself into source).

**Level 3 surfaces the actual source** of whatever the page is about,
via the `SourceTreeApi` read path (the CMS code-editor's read side),
developer-gated. This makes the wiki the **read-entry of the author↔test
loop**: a single page can run from its plainest summary up to the real
Template/controller/brain at the top of the dial → *[edit in CMS]*. One
surface, dialed to who you are.

The capability axis is **reader identity** (anon/player/teacher/
developer), *not* in-game progress — that keeps the wiki decoupled.
(Progress-earned reveals are possible later as an opt-in consumer of
progress state; out of scope here.)

---

## Permissions — controller-enforced `AccessApi`

No new permission machinery. The wiki is one **`wiki` verb** (YAML view
+ `WikiController`); the controller is the **enforcement chokepoint**
(narrow-entry, `FromController`-gated mutations underneath — no back
door), branching on **invocation shape** (subcommand-fallthrough, the
`chat` pattern — not two-word verbs), each branch calling the right
predicate:

| Invocation | Controller enforces |
|---|---|
| `wiki <page>` (read) | spoiler-gate the rendered output to the reader's capability + dial |
| `wiki edit <page>` / `wiki create <page>` | `AccessApi.can(actor, "edit", namespaceZone)` |
| `wiki delete` / `wiki rollback` | `AccessApi.canMutateZone(actor, namespaceZone)` (owner role) |
| `wiki history <page>` | read |
| level-3 source embed | `AccessApi.isWizard(actor)` |

**Namespace → `FolderZone` anchor.** `AccessApi.can` is zone-anchored
(walks `resource.getZone()`). `WikiPage` data is its own beast, so we
don't gate the document — we mirror the **source tree**: anchor the wiki
**namespace tree** to `FolderZone` stamps (a `/wiki/<namespace>` tree)
and gate against the resolved namespace zone (the
`resolveSourceFolderZone` pattern as `resolveWikiNamespaceZone`). The
**page data stays decoupled**; only the namespace gets a zone anchor,
purely for access. `accessGroups` propagate down the namespace tree
(filesystem-ACL semantics) → per-namespace permissions for free.

**The open-vs-gated floor** is just which group sits on the namespace
zone's `accessGroups`: a broad all-signed-in-players group (open
wiki-classic, revisions as the net) vs a curated `wiki-contributors`
group (gated). Lean: **open at the root**, since community-maintenance is
the point, with moderation (owner-role rollback/delete) as the safety
net — confirm at requirements.

**Bootstrap** (mirrors the shipped lounge bootstrap): mint
`wiki-editors` + `wiki-moderators` groups and stamp a `/wiki`
`FolderZone` root with `ownerGroup`/`accessGroups`. The `developers`
group already exists for level 3.

---

## Client surface

Reading, browsing, and editing are **GUI affordances that emit `wiki`
commands** (command-bus primacy, per the cockpit slate). The reader uses
the shell's shared viewer + search; the editor composes a page and
submits it.

> Open question: editing transport. Typing a long MML body into the
> command bar is absurd, so the edit *body payload* rides a **structured
> submission** (the prompt/structured-arg channel) rather than a literal
> typed command — still controller-gated as `wiki edit`. Exact shape is
> a requirements detail.

---

## Cold-start

Dropping generation brings the classic wiki cold-start back: the wiki
**starts empty** and grows as people write it; the dev seeds the first
pages. This is **accepted** — community-maintenance *is* the point, and
the gazetteer that would have papered over it is exactly the model-
coupling we rejected. Public read of level-0 pages (pre-login) covers
the newcomer/SEO angle without a populated wiki.

---

## Open questions

1. **Edit floor** — open to all signed-in players (lean) vs a curated
   `wiki-contributors` group. A namespace-zone `accessGroups` decision.
2. **MML long-form** — does the markup cover headings/lists/tables/
   internal-links, or need extensions? The wiki forces the answer.
3. **Edit-submission transport** — structured payload vs command; how
   the body reaches `wiki edit`.
4. **Categorization** — namespaces only, or namespaces + cross-cutting
   tags/categories.
5. **Anonymous read** — confirm public (no-login) read of level-0 pages
   for newcomer/SEO; everything above baseline needs a session.
6. **Progress-gated reveals** — deferred opt-in (couples to game
   progress); explicitly out of v1 to keep the wiki decoupled.
7. **Moderation tooling depth** — rollback + delete via owner role is
   the v1 net; richer review/flagging is later.

---

## Build order / waves

**Wave 1 — the wiki, end to end.**
- `WikiPage` Document + `wiki` collection + revision history/rollback.
- `wiki` verb + `WikiController` with `AccessApi` gating per invocation;
  `FromController`-gated mutations.
- Namespace `FolderZone` anchor (`resolveWikiNamespaceZone`) + groups
  bootstrap (`wiki-editors` / `wiki-moderators` + `/wiki` stamp).
- MML body rendering in the shared viewer; `[[Page]]` internal links +
  redlinks.
- Spoiler read path: page-default level + appetite dial + capability
  gate (server omits over-ceiling content).
- Seed initial pages.

**Wave 2 — richness.**
- Transclusion embed palette (`{{help:…}}` specs/taxonomies,
  `{{entity:…}}` spoiler-gated template data, `<mql>`/taxonomy, image,
  page-card); inline spoiler tags; **level-3 source embed**
  (`isWizard` + `SourceTreeApi`).
- Search integration polish (grouped Docs · Wiki results).
- Community moderation tooling.

**Later (separate consumers — not this build).**
- Diegetic narrative front (librarian NPC / journal item) over the
  exposed data.
- Progress-gated reveals.
- External-editor/git authoring path (if useful alongside browser edit).

---

## What this slate does NOT cover (and explicitly rejected)

- **Generated gazetteer / auto-pages projected from gamestate —
  REJECTED.** Auto-generating a page per entity would force wiki-only
  fields onto game models and couple the wiki to live world state. All
  pages are authored. Do not re-propose. **Distinct from this:** an
  *authored* content page may **transclude** an entity's template data
  via `{{entity:…}}`, spoiler-gated — that's fine, because the page is
  authored, the data is read-not-copied, the spoiler tags are owned by
  the spoiler system (the game needs them anyway → no wiki-only model
  fields), and it's static (not the per-player codex). Transclusion ≠
  gazetteer.
- **Personal codex projected from recognition/identification — REJECTED
  for the wiki.** The wiki does not read per-player game stores; it's
  not a knowledge-projection surface. (If a "what does my character
  know" feature is ever wanted, it's a *separate* game concern, not
  this.)
- **Diegetic expression** (librarian/journal) — deferred; function over
  form; a later consumer of the exposed data.
- **The shared viewer / search / embed-palette substrate** — owned by
  [client-shell-slate.md](../tails/client-shell-slate.md).
- **The spoiler reveal substrate** — owned by
  [spoiler-slate.md](../deferred-rpg/spoiler-slate.md); reused here, with the
  graduated-dial delta flagged back to it.
- **Help-system internals** — the systems-leaning co-consumer (commands,
  taxonomies, mechanics; generated from code + data; gets its *own*
  spoiler controls). Owned by [help-slate.md](./help-slate.md), not this
  slate.
- **Assessment integrity** — flagged by the spoiler slate as a separate
  assessment-system problem; not here.

---

## Once shaped into formal requirements

This boils down to:

- A `WikiPage` **Document** collection with **revision history**, fully
  decoupled from game models.
- A `wiki` **verb + controller** that enforces **`AccessApi`** per
  invocation (read/edit/delete/rollback/source), with wiki **namespaces
  anchored to `FolderZone`s** for the zone-walk and a groups bootstrap.
- **MML body + YAML frontmatter**, internal links, and a **closed,
  transclusion-based embed palette** (`{{help:…}}` specs/taxonomies,
  `{{entity:…}}` spoiler-gated template data, live `<mql>`, source-at-L3,
  image) — no arbitrary code, nothing copied (single-source).
- The **two-axis spoiler model**: server-enforced capability ceiling
  (role/group; L3 = developer) × client appetite dial (0–3,
  blur-with-reveal), tagged in content.
- Shared **viewer + search** with help (shell slate); editing via a
  structured submission.
- Tests: edit/delete/rollback gated by group membership through the
  controller (and unreachable otherwise); over-ceiling content never
  sent; appetite dial blurs-but-peeks within ceiling; level-3 source
  only for developers; a rollback restores a prior revision.

Edit-floor choice, markup long-form gaps, edit transport, and any
progress-gated or diegetic layer wait for later.
