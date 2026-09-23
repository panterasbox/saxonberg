# Wiki slate (working doc)

> **Status: PARTIAL** — Wave 1 shipped 2026-08-04 end to end, plus the
> article dialect, the reader rung, the client card and the per-surface tag
> policy → [wiki.md](../../subsystems/wiki.md)
> **Left:** the level-3 source embed · the rest of the transclusion
> palette (page-card) · the diegetic narrative front · anonymous pre-auth
> read (Q5) · progress-gated reveals (Q6) · moderation review/flagging (Q7)
> **Size:** a tail

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
- [spoiler-slate.md](./spoiler-slate.md) — the **reveal model** this
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
- [cms-slate.md](../builds/cms-slate.md) — the **level-3 source** embed is the
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
- [college-slate.md](../builds/college-slate.md) § *The wiki — the commons the
  courses read from* — **the education-vertical consumer.**
  *study.com : Wikipedia :: our courses : our wiki.* It adds the
  **source ladder** (papers = primary and re-runnable · wiki =
  tertiary synthesis · course = pedagogical path), the rule that **a
  course cites and never restates** (so a wiki edit never staleness a
  lesson; the syllabus is the adaptation surface), and
  contribution-as-coursework. **Three deltas to this slate:** (1) keep
  primary sources OUT of the wiki — the library holds papers with
  provenance and replication, the wiki cites them, and merging the
  tiers collapses the ladder; (2) **the "assessment integrity" open
  item can close** — procedurally generated items are wiki-proof by
  construction (per-student seeds, computed keys), so no spoiler
  gating is needed for the machine-graded half; (3) if lessons cite
  pages, **slug stability and redirects become load-bearing.**
- [persistence-architecture-slate.md](../builds/persistence-architecture-slate.md)
  — `WikiPage` is a plain `Document` (no Stuff overhead).
- [docs/subsystems/grouping.md](../../subsystems/grouping.md) +
  [zone.md](../../subsystems/zone.md) — Groups + `FolderZone` stamps the
  bootstrap mints (mirrors the shipped lounge group + `/stuff/idea/lounge` /
  `/world/lounge` stamps).

---

## Principle

*Principles 1, 3 and 4 shipped → [wiki.md](../../subsystems/wiki.md) § The
page model (the typed `subject`; no marker mixin, no wiki field on any game
class), § Why the wiki is out-of-fiction, and why it is ours, § Where the
code lives. Principle 2 stays as doctrine.*

2. *Function over form — duplicate of [wiki.md § Why the wiki is
   out-of-fiction, and why it is ours](../../subsystems/wiki.md) (a
   reference reading surface, deliberately out-of-fiction); cut
   2026-09-21. A narrative front (a librarian NPC, a journal item) would
   be a later consumer of the same data layer — not built.*

---

## The data model — `WikiPage` Document

*Superseded by the code — `wiki` + `wiki_revisions` as two collections
(snapshots, `rev` as a compare-and-swap token), `_id` as identity with
`aliases` that only grow, a typed `subject` in place of a bare namespace
string → [wiki.md](../../subsystems/wiki.md) § The page model, § Revisions,
§ Collections.*

---

## Frontmatter

*Shipped as `title` · `subject` · `tags` · `related` · `spoilerLevel` over a
markdown body (`WikiPage.ts` fieldMeta; the pack file shape in
[wiki.md](../../subsystems/wiki.md) § The installer as a writer). `embeds`
did not ship — components are inline tags; `aliases` accrue through
`wiki move`.*

---

## Content: MML-as-MDX

*Shipped in a different shape: the body is **markdown** (the article
dialect) converted to MML at read time → [wiki.md](../../subsystems/wiki.md)
§ Stage 1 is a conversion; the palette is path-resolved **components** —
`help`, `composition kind="template"` (the `{{entity:…}}` idea, gated by
the field's own `spoiler` level), `image`, `infobox` — plus `[[Page]]` links
and redlinks → § Components and snippets, § The render pipeline. `<mql>` is
absent **by decision** (§ What this build does NOT do). The author-tier
split of the palette was made unnecessary by the one-gate design (§
Components: a component never learns the reader). Q2 (long-form MML)
resolved: § Markup additions. Still open:*

- **source viewer** — the level-3 embed; reads via `SourceTreeApi`,
  developer-gated.
- image / page-card / cross-link, etc.

*The editorial test — transclude, don't copy; a page exists only if it
is editorial — graduated 2026-09-21 → [wiki.md § Rejected, not
deferred](../../subsystems/wiki.md).*

---

## The spoiler model — two axes

*Shipped → [wiki.md](../../subsystems/wiki.md) § The reveal model — two
axes, one gate (capability DELETES, appetite TAGS; `wiki.spoilerAppetite`),
§ The capability ladder (wizard · owner · editor-or-player · guest — no
`teacher` group), § What reveal does NOT answer (reader identity, never
progress). Still open:*

**Level 3 surfaces the actual source** of whatever the page is about,
via the `SourceTreeApi` read path (the CMS code-editor's read side),
developer-gated. This makes the wiki the **read-entry of the author↔test
loop**: a single page can run from its plainest summary up to the real
Template/controller/brain at the top of the dial → *[edit in CMS]*. One
surface, dialed to who you are.

---

## Permissions — controller-enforced `AccessApi`

*Superseded by the code → [wiki.md](../../subsystems/wiki.md) § Permissions
(a `protection` field on `WikiNamespaceZone`, not `accessGroups` — those
left `Zone` in property phase 0a; **one** managed group, `wiki-editors`,
moderators its `'owner'`-role members; `snippet` tightens to `editors`),
§ The guest floor. Q1 (the edit floor) resolved there.*

---

## Client surface

*Shipped → [wiki.md](../../subsystems/wiki.md) § The client — one card,
everything a command (`WikiCard` over `publication.wiki`, the rendered
body on the wire, every affordance a command). Q3 (edit transport)
resolved: the shared `compose` prompt, § The editor opens on what is there.*

---

## Cold-start

*Shipped: the `wiki-starter` pack seeds the first pages and guests read
in-world → [wiki.md](../../subsystems/wiki.md) § Where the code lives, § The
guest floor, § What this build does NOT do (the rejections). The pre-login
**web** read is Q5 below.*

---

## Open questions

*Q1–Q4 resolved by the build → [wiki.md](../../subsystems/wiki.md): Q1
edit floor → § Permissions + § The guest floor · Q2 long-form → § Markup
additions · Q3 transport → § The client · Q4 categorization → § The page
model + the `tags` index (§ Collections).*

**Still open.**

5. **Anonymous read** — public (no-login) read of level-0 pages for
   newcomer/SEO. In-world guests read today; a pre-auth *web* view is
   not built, and it shares a home with the docs mirror and the
   TypeDoc HTML site rather than with the wiki verb.
6. **Progress-gated reveals** — and the build sharpened the question
   rather than answering it. ⚠ The capability ceiling is **not a
   knowledge model**: it cannot express "this character has worked oak
   and therefore knows its density". That is the
   Transcript/Competence axis, which the panel does not consult.
   Anything *earned* is a different mechanism from anything
   *preferred*, and the reveal ladder only does the second.
7. **Moderation tooling depth** — rollback, delete/undelete and purge
   shipped, with a tombstone revision naming who purged what. Richer
   review/flagging is later; the deliberate absence of a review queue
   (open editing + fast rollback is the bargain) is the thing to
   revisit only if abuse actually appears.

---

## Build order / waves

*Wave 1 shipped end to end → [wiki.md](../../subsystems/wiki.md). Of Wave
2: search shipped as `recall --scope wiki` from the card
([record-layer.md](../../subsystems/record-layer.md) § `recall --scope` is
wired to the wiki card) and moderation as `rollback` / `delete` /
`undelete` / `purge` / `protect` (§ Deletion). Of *Later*: the
external-editor path shipped as the `wiki` content kind (§ The installer as
a writer).*

**Wave 2 — richness.**
- Transclusion embed palette (`{{help:…}}` specs/taxonomies,
  `{{entity:…}}` spoiler-gated template data, `<mql>`/taxonomy, image,
  page-card); inline spoiler tags; **level-3 source embed**
  (`isWizard` + `SourceTreeApi`).

**Later (separate consumers — not this build).**
- Diegetic narrative front (librarian NPC / journal item) over the
  exposed data.
- Progress-gated reveals.

---

## What this slate does NOT cover (and explicitly rejected)

- *The generated gazetteer and the per-player codex — both REJECTED;
  graduated to [wiki.md](../../subsystems/wiki.md) § What this build does
  NOT do → Rejected, not deferred.*
- **Diegetic expression** (librarian/journal) — deferred; function over
  form; a later consumer of the exposed data.
- **The shared viewer / search / embed-palette substrate** — owned by
  [client-shell-slate.md](../tails/client-shell-slate.md).
- **The spoiler reveal substrate** — owned by
  [spoiler-slate.md](./spoiler-slate.md); reused here, with the
  graduated-dial delta flagged back to it.
- **Help-system internals** — the systems-leaning co-consumer (commands,
  taxonomies, mechanics; generated from code + data; gets its *own*
  spoiler controls). Owned by [help-slate.md](../builds/help-slate.md), not this
  slate.
- **Assessment integrity** — flagged by the spoiler slate as a separate
  assessment-system problem; not here. **Now resolved by
  [college-slate.md](../builds/college-slate.md):** procedurally generated exam
  items are wiki-proof *by construction* (per-student seeds, keys
  computed by running the subsystem), so a complete wiki cannot devalue
  the machine-graded credential and **no spoiler gating is required for
  integrity.** The human-graded half (essay, viva) relies on the
  ordinary defences instead. The two concerns are orthogonal — spoiler
  tiers stay a *play-experience* feature, which is what they were
  always for.
