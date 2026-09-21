# Slate-compaction pass — wiki batch ledger

Three slates. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `wiki.md` only.
Line numbers below are the ORIGINAL file's. Originals saved under the
scratch dir `wiki/orig/` for diffing. Code was verified in
`packages/server/src/mud/{lib/wiki,platform/idea}/**`,
`packages/content/platform/**`, `packages/client/src/**` and the schema
yaml; every class below names the file that decided it.

Batch-wide findings first:

1. **One `Left` item was false on arrival.** wiki-slate's *search
   integration* shipped as `recall --scope wiki` (`RecordLogic.ts:396,441`,
   `CardBodies.tsx:1638` sends it from the card, `wikiSearch.test.tsx`
   pins it) — `record-layer.md § recall --scope is wired to the wiki card`
   says so, but **`wiki.md § The Wave 6 pass` still said "Search is
   hatched"**. Fixed by insert (a ⚠ *since superseded* note), not by
   editing the paragraph.
2. ⚠ **Flag for the coordinator, not my remit:** `RecordLogic.recallWiki`
   excerpts the stored **source** body (`excerpt(String(r.body))`) with no
   `redactSource` pass, so an over-ceiling `<spoiler level="3">` fragment
   can surface in a search excerpt. `wiki.md § What this build does NOT do`
   states the constraint (*the index must be over source with levels
   intact*) — the levels are intact in the index; the excerpt does not gate
   on them. A code question for the next wiki tail, recorded here so it is
   not lost.
3. **Page standing (the `OFFICIAL` badge)** is named by
   `wiki.md § The Wave 6 pass` as *belonging to the wiki tail as a
   governance question*, but no slate section carries it, so it is not in
   `Left` (the body wins). Coordinator's call whether the tail should grow
   a section for it.

---

## docs/slates/tails/wiki-slate.md — 465 → 260 · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- second + third status blockquotes *"⭐ SHIPPED 2026-08-04"* / *"Status: shape proposed"* (10–32, 23) — history; the canonical block kept and re-stamped
- `## Principle` → items 1, 3, 4 (104–108, 113–120, 13) — code: `lib/wiki/WikiPage.ts` (typed `subject`, no marker mixin), `platform/idea/WikiRegistry.ts`, `WikiRenderer.ts`; doc: `wiki.md § The page model`, `§ Why the wiki is out-of-fiction, and why it is ours`, `§ Where the code lives`. Item 2 KEPT (doctrine). Pointer left
- `## Frontmatter` body (151–159, 9) — code: `WikiPage.ts:98-134` fieldMeta (`aliases`, `tags`, `related`, `spoilerLevel`), `subject`; doc: `wiki.md § The installer as a writer` (the file shape), `§ The typed subject`. `embeds` did not ship (components are inline tags) — noted in the pointer
- `### Content: MML-as-MDX` → *"The embeds are transclusions…"* + the `{{help:…}}` bullet (172–180, 9) — code: `lib/wiki/components/help.ts`; doc: `wiki.md § Components and snippets` (*only components reach live state*), the shipped list
- `### Content: MML-as-MDX` → *Internal links* para (204–206, 3) — code: `WikiRenderer` stage 3 `resolveLinks`, `WikiPage.linkRefs`, `wiki wanted`; doc: `wiki.md § The render pipeline`, `§ Maintenance`
- `### Content: MML-as-MDX` → the long-form open question (208–210, 3) — answered Q2 → `wiki.md § Markup additions`
- `## The spoiler model — two axes` → intro + the appetite-dial bullet (216–238, 23) — code: `WikiRenderer.ts` gate, `lib/wiki/render.ts` `SpoilerLevels`, the `wiki.spoilerAppetite` setting + `wiki … --spoiler` (`wiki.yaml:332`); doc: `wiki.md § The reveal model — two axes, one gate`, `§ Why an ordinary player sits at 1`
- `## The spoiler model` → *"The capability axis is reader identity… not in-game progress"* (254–257, 4) — doc: `wiki.md § What reveal does NOT answer — appetite is not epistemics`. The *"progress-earned reveals later"* clause is Q6, KEPT
- `## Client surface` body + its editing-transport open question (304–313, 10) — code: `client/components/WikiCard.tsx` (per `wiki.md`; the card body now lives in `CardBodies.tsx`), `WikiController.ts` `compose` path; doc: `wiki.md § The client — one card, everything a command`, `§ The editor opens on what is there`. Q3 answered
- `## Cold-start` body (319–324, 6) — code: `packages/content/wiki-starter/content/wiki/{guide,lore,main,snippet}/`, the guest read path (`WikiRegistry.ts:757`); doc: `wiki.md § Where the code lives`, `§ The guest floor` (*reading is untouched*). The *why accepted* clause graduated with the rejections (below); the pre-login web read is Q5, KEPT
- `## Open questions` → intro + Q1–Q4 (330–347, 18) — answered: Q1 `wiki.md § Permissions` + `§ The guest floor` (`WikiRegistry.ts:105-110`, `protection` field); Q2 `§ Markup additions`; Q3 `§ The client`; Q4 `§ The page model` + the `tags` index (`§ Collections`). One pointer line left
- `## Build order / waves` → **Wave 1** (372–382, 11) — every bullet shipped (see the rows above); the `accessGroups` shape is the superseded part, noted in the Permissions pointer
- `## Build order / waves` → Wave 2 *"Community moderation tooling"* (390, 1) — code: `wiki.yaml` `rollback`/`delete`/`undelete`/`purge`/`protect`; doc: `wiki.md § Deletion`, `§ Permissions`
- `## Once shaped into formal requirements` (441–465, 25) — the requirements précis; the requirements + plan docs were written and retired at the sweep (`wiki.md` l.8-11). Its closing *"edit-floor, long-form, transport wait for later"* line is Q1–Q3, all answered

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `## What this slate does NOT cover` → the **generated gazetteer — REJECTED** and **personal codex — REJECTED** bullets (402–416, 15), plus the *why accepted* clause of `## Cold-start` — code: no generator exists anywhere (`grep gazetteer|codex` → nothing under `packages/server/src/mud` beyond the `FieldMetaEntry.spoiler` docstring); every page is authored or pack-submitted (`PackLogic` → `createPage`/`editPage` `asInstaller`); `composition.ts` is the read-not-copy transclusion → inserted at `wiki.md § What this build does NOT do` as a new `### Rejected, not deferred` (22 lines: the two rejections, the surviving distinction — `composition` is transclusion, not projection — and the accepted cold-start cost). Pointer bullet left in the slate
- **A stale statement fixed by insert**, not from the slate: `wiki.md § The Wave 6 pass` *"Search is hatched"* → a 7-line ⚠ *since superseded* note after that paragraph pointing at `record-layer.md § recall --scope is wired to the wiki card`. The original paragraph is untouched (it records why a disabled input was refused)

### Superseded — cut
- `## The data model — WikiPage Document` (126–146, 21) — by the code: two collections `wiki` + `wiki_revisions` (`schema/wiki*.yaml`), snapshots not an embedded `revisions[]`, `_id` identity with ever-growing `aliases`, typed `subject` → `wiki.md § The page model`, `§ Revisions`, `§ Collections`. Heading + note left
- `### Content: MML-as-MDX` → the intro *"The body is authored in MML…"* (165–170, 6) — by the **markdown article dialect converted at read time** (`Mml.markdownToMml(body, …, { longForm: true })`) → `wiki.md § Stage 1 is a conversion, and it lives at READ time`
- `### Content: MML-as-MDX` → the `{{entity:…}}`/`{{template:…}}` bullet (181–185, 5) — by `composition kind="template"` (`lib/wiki/components/composition.ts`), gated by the field's own `spoiler` level rather than a blurb/stats/raw ladder → `wiki.md § composition kind="template" reports VALUES, not schema`, `§ spoiler on a field`
- `### Content: MML-as-MDX` → the `<mql>` bullet (186–188, 3) — by decision: no `<mql>` component, because `resolveMany` needs an actor-bearing context that C1 forbids handing a component → `wiki.md § What this build does NOT do`. (`mql` is also not in `KNOWN_TAGS`)
- `### Content: MML-as-MDX` → *"Two tiers fall out… dev/author pages get the richer embed set"* (193–195, 3) — by the one-gate design: every wiki page renders under the `all` tag policy and a component never learns the reader, so no author-tier palette split exists → `wiki.md § Components` (*do not add a reader field*), `§ The tag policy`
- `## The spoiler model` → the capability-ceiling bullet (240–245, 6) — by the ladder wizard · owner-role · editor-or-player · guest; no `teacher` group, and `AccessApi.can` ignores its `action` → `wiki.md § The capability ladder`. The **level-3 = the actual source** paragraph is KEPT (unbuilt)
- `## Permissions — controller-enforced AccessApi` (263–298, 36) — by the code: `protection` field on `WikiNamespaceZone` (`anyone`/`editors`/`moderators`, stricter-of-two), **one** group `wiki-editors` (`WikiRegistry.ts:36,102`, `platform/pack.yaml:22,39`) with moderators as its `'owner'`-role members — no `wiki-moderators`, no `resolveWikiNamespaceZone`, no `accessGroups` (removed from `Zone` in property phase 0a); the render gate is `AnyOf(FromModule(WikiController), FromTemplate(WikiRegistry))` and the mutators additionally admit `PackLogic` → `wiki.md § Permissions`, `§ The guest floor`. Heading + note left
- `## Build order / waves` → Wave 2 *"Search integration polish (grouped Docs · Wiki results)"* (389, 1) — by `recall --scope wiki` (`RecordLogic.ts:396`; the card's box, `CardBodies.tsx:1638`); no grouped Docs·Wiki listing → `record-layer.md § recall --scope is wired to the wiki card`. Folded into the section pointer
- `## Build order / waves` → *Later* → *"External-editor/git authoring path"* (396, 1) — by the `wiki` content kind: a pack ships `content/wiki/<ns>/<slug>.md` and the installer submits as the pack with a compare-and-swap `rev` → `wiki.md § The installer as a writer`

### Kept (UNBUILT)
- the status block (re-stamped) · the framing paragraph · *See also* (all links kept — none points only at a cut thing; the spoiler-slate bullet's *delta to flag* is stale, see Uncertain)
- `### Content: MML-as-MDX` → the **source viewer** bullet (the level-3 embed: no `source` component under `lib/wiki/components/`, no `SourceTreeApi` import in the wiki tree) · the *image / page-card / cross-link* bullet (mixed: `image` + `[[link]]` shipped, page-card did not — kept whole)
- `## The spoiler model` → *"Level 3 surfaces the actual source"* paragraph (the same unbuilt embed, from the reveal side)
- `## Open questions` → Q5 anonymous pre-auth read (no web view; `WikiRegistry` serves in-world guests only) · Q6 progress-gated reveals · Q7 moderation review/flagging
- `## Build order / waves` → the Wave 2 palette bullet (mixed — the level-3 source embed and page-card are the live remainder) · *Later* → the diegetic front · progress-gated reveals
- `## What this slate does NOT cover` → diegetic expression · the shared viewer/search substrate pointer · the spoiler-substrate pointer · help-system internals · assessment integrity (resolved by the college slate, which is unbuilt — the resolution has no doc home yet, so the non-goal stays)

### Doctrine — kept, labelled
- `## Principle` → item 2 *Function over form* (a reference surface, not diegetic content; a narrative front is a later consumer)
- `### Content: MML-as-MDX` → *"Transclude, don't copy — and a page exists only if it's editorial"* (the editorial test for whether something is a wiki page at all; `wiki.md` carries the capability line — *only components reach live state* — but not the editorial test)

### Uncertain — kept
- *See also* → the spoiler-slate bullet's *"Delta to flag: spoiler-slate should adopt the graduated scalar"* — the 0–3 dial shipped (`SpoilerLevels`, `wiki.spoilerAppetite`), so the delta is stale as a to-do; kept because *See also* is spine and the spoiler slate's own compaction (below) records the resolution
- `## What this slate does NOT cover` → *The shared viewer / search / embed-palette substrate — owned by client-shell-slate* — search shipped as `recall`, the embed palette shipped as wiki components, and there is no shared "viewer": the ownership claim is stale but the client-shell slate is outside this batch. The card-surface ledger compacted it; coordinator may reconcile

### Handoff (belongs in a doc outside my list)
- → `record-layer.md § recall --scope is wired to the wiki card` (or `§ recall`): the excerpt/ceiling question from batch finding 2, verbatim: *`recallWiki` excerpts the stored source body with no `redactSource` pass, so an over-ceiling `<spoiler>` fragment can surface in a search excerpt; the index is over source with levels intact, the excerpt does not gate on them.* A code item, not a doc paragraph — recorded so the coordinator can route it.

### Status block
- Left: *search integration · the level-3 source embed · the rest of the transclusion palette · open questions 5–7* → *the level-3 source embed · the rest of the transclusion palette (page-card) · the diegetic narrative front · anonymous pre-auth read (Q5) · progress-gated reveals (Q6) · moderation review/flagging (Q7)* (search was false on arrival; the diegetic front was in the body and unrepresented)
- Size: a tail → a tail

---

## docs/slates/builds/notification-slate.md — 262 → 265 · Status UNBUILT → UNBUILT

Entirely UNBUILT, and the grep confirms the status block's own claim: no
`notification*`/`subscription*`/`watch*`/`inbox*` schema file under
`packages/server/src/schema/`; no `NotificationEvent`, `notification_events`
or `watchlist` anywhere in `packages/{server,client,types}/src`; the
client's notification bell is *not built, not hatched, not placeholdered*
and asserted absent (`client-shell.md` l.105, l.289 — `Frame.test.tsx`);
`wiki.md § What this build does NOT do` still names the gap and points
here. **No cuts.** The second status blockquote (12–16) is kept: it is
the slate's only framing paragraph and describes a state that still holds
(the calibration cuts *stale* narrative blocks, not live ones).

### Kept (UNBUILT)
- everything: `## The gap` · `## Principles` · `## ⭐ Not a second message bus` · `## The event` · `## The subscription` (`PathTrie` exists — `lib/collections/PathTrie.ts` — the subscription does not) · `## Delivery: derive on read` · `## Coalescing and digest` · `## ⚠ Notification is a spoiler surface at BOTH ends` · `## Relationship to NotifyPolicy` + its open question · `## Producers` · `## Open questions` 1–6 · `## What this slate does NOT cover` · `## Cross-references`

### Doctrine — kept, labelled
- `## Principles` (the five) and `## ⭐ Not a second message bus` — the thesis of the substrate (absent-tense; substrate-owned prose; no free-text channel). Kept in the slate; not added to `Left` as doctrine, but the *templates* consequence is a build item and is in `Left`

### Uncertain — kept (kept-but-contradicted)
- `## The gap` → the table row *forum subscriptions | same shape, same teardown* — **contradicted by the shipped forums**: `SubjectSubscriberMixin` (`lib/forum/SubjectSubscriber.ts`) persists `followed` + `mutedSurfaces` per subject **on the Avatar**, durable across sessions (`forums.md § Subscription storage`), and forums.md says the surface is *expected to grow (notification prefs, digests)*. The row is still right that nothing delivers absent-tense, but the "same teardown" clause is false; requirements should decide whether the durable subscription here *absorbs* `SubjectSubscription` or sits beside it
- `## The gap` + `## What this slate does NOT cover` → `Bulletin` *stays what it is* — **`Bulletin` is deleted** (`press.md` l.414: a release is a `StoredDocument`; `lib/press/Release.ts`); broadcast is the press/ticker. The slate's own cross-reference already notes `bulletin.md → press.md`. The row's *point* (broadcast is not a subscription) holds; the noun does not
- `## Producers` → *"The Api layer is being reorganised before go-live, so this slate deliberately does not name a `NotifyApi`"* — the Api OO sweep shipped (MR!228) and the namespace pass is in flight; the deferral still stands but its reason has aged. Requirements name the home
- `## Cross-references` → `docs/requirements/wiki-requirements.md` — **retired** at the wiki sweep (`wiki.md` l.8–11); the link is dead. Left in place (not a link to something I cut); the coordinator's sweep may drop it

### Handoff (belongs in a doc outside my list)
- none — `social-graph.md` already carries the *who*-axis side (`§ Notification policy — the presence fan-out`, `§ The MQL display-vs-notification split`) and `client-shell.md` the bell decision; nothing shipped here to graduate

### Status block
- Left: *the subject-keyed event · the durable subscription · derive-on-read delivery · coalescing + digest · the both-ends spoiler gate · the first producers (wiki watchlists, forums)* → *the subject-keyed event · the substrate-owned prose templates (not a second bus) · the durable subscription (`PathTrie` routing) · derive-on-read delivery + the cursor/dismissal read state · coalescing + digest · the both-ends spoiler gate · the `NotifyPolicy` boundary (shared preference vocabulary, separate stores) · the first producers (wiki watchlists, forums) · open questions 1–6* (two body sections were unrepresented; the body wins)
- Size: a build → a build

---

## docs/slates/tails/spoiler-slate.md — 226 → 230 · Status PARTIAL → PARTIAL

This slate is about the **percept side** — secrets on world facts, gated
in the Scene / inspection-card / `look` / `analyze` projection by
progress, role and a player guard. What shipped is the **wiki's** reveal
model, and the status block already says so. Grep: `spoiler` reaches
`lib/mixin.ts` (`FieldMetaEntry.spoiler`/`spoilerName`), the tagged data
Ideas (`Material`, `Species`, `Condition`, `Recipe`, `Biome`, `Spell`,
`Arcane`, `Conduit`, `Alloyed`), `HelpCatalogue` (`spoiler: false` on
topics), `SpeciesLogic` (the char-gen dossier carries the level) and the
wiki tree — and **nothing under `lib/perception`, `lib/message`,
`api/perception.ts`, `api/message.ts` or `PerceptionLogic`**. Perception
gates on senses, light, concealment and belief, never on a reveal
condition. There is no quest/progress system to supply an *earned*
condition. So the body is UNBUILT with one answered question.

### Cut (SHIPPED · DOCUMENTED)
- `## Open questions / forks` → **Q3 choice-guard granularity** (165–167, 3) — *"start global, add categories"* was answered by the build with neither: a **graduated 0–3 scalar**, `wiki.spoilerAppetite` (`platform/agent/Avatar.ts:491`, a setting; `wiki … --spoiler` per reading, `wiki.yaml:332`) → `wiki.md § The reveal model — two axes, one gate`, `§ Why an ordinary player sits at 1`. This is the *delta* the wiki slate's *See also* flagged back here. Pointer left; per-category guards stay in Wave 2

### Kept (UNBUILT)
- the status block (re-stamped) · the second blockquote *"deliberately light — best-effort"* (12–19; kept as the slate's framing paragraph — it describes a stance that still holds, not a stale state) · the framing + *The load-bearing decisions* 1–4 (mixed: 4 *imposition and choice* is exactly the shipped wiki pair, capability × appetite — but stated for percepts) · *See also*
- `## The model` → all four subsections (see Uncertain for what the wiki half already answers)
- `## Assessment integrity — flagged, not solved here` · `## What this reveals / needs` · Q1 (self-confirmed doctrine), Q2, Q4, Q5 · `## Build order` (Wave 1's third clause, *the per-player choice-guard setting*, shipped for the wiki as a setting — the paragraph is mixed and kept whole) · `## What this slate does NOT cover` · `## Once shaped into formal requirements` (the build surface for an unbuilt build — unlike the wiki slate's, no requirements doc was ever written from it)

### Doctrine — kept, labelled
- *The load-bearing decisions* 1 + `## Principle` 1 — *best-effort, not security; open source is the limit* — and Q1's confirmation of it. `wiki.md` does not state this (its capability axis is a hard server-side delete, which is *stronger* than best-effort for the wiki); `design-philosophy.md` is the likelier home
- `## Principle` (the four-line restatement of the decisions above)

### Uncertain — kept
- **Kept-but-contradicted:** *load-bearing decision 2* + `### Content marks secrets + their reveal condition` + `### Role-conditioned reveals` — the *earned* (progress/quest) reveal condition on a percept collides with two shipped statements: `wiki.md § What reveal does NOT answer — appetite is not epistemics` (*anything earned is a different mechanism from anything preferred; the epistemic half is the identification slate*), and the perception substrate itself (`perception.md`, `concealment.md`, `belief.md`: what a viewer perceives is gated by senses, light, concealment bands and per-viewer belief — an honest sim, never a progress flag). *Role* also collides in the small: the shipped ladder is authoring authority (wizard · owner · editor-or-player · guest), and there is no teacher/student role anywhere (`grep -ri "teacher" packages/server/src/mud` → nothing). Requirements should decide whether a percept-side *secret* is a reveal-level (the wiki's model, extended to `look`), a concealment band (already shipped), or a genuinely new condition — and whether *earned* belongs here at all or to identification
- `### Server-side fact-gating (the enforcement)` — the *principle* shipped for the wiki (capability **deletes** server-side; `redactSource` for history/diff; *absent, never "1 hidden update"*) and is documented there; the section's subject (the percept / inspection-card / `look` / `analyze` projection) is unbuilt. Kept whole because the paragraph is one claim about a different surface
- `### The player choice-guard (opt-in)` + the *What this reveals* bullet *"a setting (EnvironmentMixin keyspace)"* — shipped **for the wiki exactly as described** (`wiki.spoilerAppetite`, a per-player setting, usable by wizards to read fresh; `Avatar.ts:470-478` even records that a reader-preferences mixin should eventually own it). Outside the wiki nothing reads it. `Left` says *outside the wiki*; the paragraphs are kept because they do not say "wiki"
- Q4 *Admin/author handling* — half answered by the ladder: a wizard's ceiling is 3 (imposed gates do not bind them) and appetite applies to everyone (they can opt into the guard). The *teacher/student* half is unbuilt. Kept
- **Two slates say the same open thing:** `## Assessment integrity` here and wiki-slate's *Assessment integrity* non-goal bullet. The wiki slate carries the college slate's resolution (procedural items are wiki-proof by construction); this one predates it and still says *flagged, not solved*. Kept in both; cluster pass merges
- *See also* → `senses-slate.md` *"the percept revelation-condition model"* — the senses build shipped `SenseChannel`/Modality/`PerceptionApi` (`senses.md`); whether a *revelation condition* exists as a named extensible family there, or only as the concrete sense/light/concealment checks, I could not confirm — `grep -rn "revelation" packages/server/src/mud` → nothing. If it does not exist, decision 2's "just adds new kinds of" has no substrate to add to

### Handoff (belongs in a doc outside my list)
- none. Nothing shipped here that the wiki doc does not already carry; the contradictions above are for requirements, not a doc insert

### Status block
- Left: *progress / integrity reveal conditions on percepts · server-side fact-gating in the Scene/percept projection · role-conditioned reveals · the player opt-in choice-guard outside the wiki · assessment integrity (flagged, owned elsewhere)* → *the secret tag + reveal-condition content model (Q2) · progress / integrity reveal conditions on percepts · server-side fact-gating in the Scene/percept projection · role-conditioned reveals (Q4) · the player opt-in choice-guard outside the wiki + per-category guards · assessment integrity (flagged, owned elsewhere)* (the content model and the Wave 2 per-category guard were in the body and unrepresented)
- Size: a wave → a wave (it rides whatever build gives percepts a reveal condition — or the identification build, if requirements send *earned* there)

---

## Totals

| slate | before → after | Status | Left items |
|---|---|---|---|
| `tails/wiki-slate.md` | 465 → 260 | PARTIAL → PARTIAL | 4 → 6 |
| `builds/notification-slate.md` | 262 → 265 | UNBUILT → UNBUILT | 6 → 9 |
| `tails/spoiler-slate.md` | 226 → 230 | PARTIAL → PARTIAL | 5 → 6 |

Cuts: 14 SHIPPED·DOCUMENTED blocks + 8 SUPERSEDED blocks + 1 graduated
pair (wiki-slate), 1 answered question (spoiler-slate), 0 (notification).
Inserts into `wiki.md`: 2 (+29 lines) — `### Rejected, not deferred` and
the *since superseded* search note. No slate deleted; nothing ABSORBED.
