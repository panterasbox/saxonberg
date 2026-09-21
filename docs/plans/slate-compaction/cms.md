# Slate-compaction pass — cms batch ledger

Two slates. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `cms.md` only. Line
numbers below are the ORIGINAL file's. Originals saved under the scratch dir
`cms/orig/` for diffing. Code was verified in `packages/server/src/backend/`
(`CmsRoutes.ts`, `CmsSession.ts`, `GitRoutes.ts`, `StudioRoutes.ts`,
`Application.ts`), `packages/server/src/mud/**`, `packages/client/src/**`
(`components/cms/**`, `components/cards/CardBodies.tsx`,
`layouts/BuilderLayout.tsx`, `components/frame/AccountMenu.tsx`),
`packages/server/src/schema/` and `packages/content/platform/**`.

Four things a reviewer should know first:

1. **The CMS is not a second browser tab any more, and `cms.md` said it was
   in three places.** No `surface=cms` exists in the client; `cms` · `git` ·
   `studio` are `client`-source cards in one feed (`CardBodies.tsx:1001-1003`,
   `BuilderLayout.tsx`, `cmd/author/cms.yaml` `opens_card: cms`), and the
   account menu sends `cockpit mode build` (`AccountMenu.tsx:163-166`).
   `cms.md`'s own last section says so; its *Shape at a glance* and *Client
   surface* still described the tab. **Fixed by minimal edit** (recorded
   under *Fixes to cms.md* below). Consequence for the slate: the
   one-SPA-two-tabs / cross-tab-sync model is SUPERSEDED by the card, not
   deferred.
2. **`cms.md § Deferral boundary` said "Git → deferred entirely."** `GitApi`
   / `GitLogic` / `GitRoutes` exist and `git-workflow.md` documents them.
   Fixed by minimal edit. Same bullet list said the holodeck was deferred —
   the CMS toolbar's `go wardrobe` button and `sandbox.md` say otherwise
   (cms.md's own *"Test in holodeck"* section). Fixed.
3. **The route block said "Five routes" and omitted `/api/cms/diagnostics`**
   (`CmsRoutes.ts:153`). One line inserted, "Five" → "Six".
4. **`CmsDiagnosticsPanel.tsx` is an orphan** — the component exists but
   nothing mounts it (`grep CmsDiagnosticsPanel packages/client/src` finds
   only its own file; `CardBodies` registers `cms` / `git` / `studio` and no
   diagnostics card). `diagnostics.md § Reader B` still says it is "a third
   tab in `CmsSurface`". Outside my write list → Handoff. **Not a slate
   matter, but the coordinator should know the diagnostics CMS panel is
   currently unreachable in the client.**

Nothing needed graduating into `cms.md`: every shipped decision the slate
carried is already stated in `cms.md`, `studio.md`, `git-workflow.md` or
`diagnostics.md` — the slate's problem was stale claims, not missing ones.

---

## docs/slates/builds/cms-slate.md — 688 → 465 · Status PARTIAL → PARTIAL

What shipped: the REST surface + attribution bridge, Monaco, the unified
tree, save go-live (`cms.md`); the in-runtime VCS (`git-workflow.md`); the
diagnostics store + route (`diagnostics.md`); the Studio — `@authorable`
schema derivation, the `widgets/` registry, the reference-picker,
`describeClass` effective-value resolution, the blueprint catalogue with
signature dedup + hierarchy + `publishBlueprint`, `scaffoldClass` /
`commitClass` (`studio.md`); the CMS as cards. What did not: any
`domain_history` / changeset / draft / review-gate code (grep of
`packages/server/src/mud` for `changeset|domain_history|codeRef` is empty;
`ForumsLogic.matureArgument` still "binds NOTHING"), `addExtraLib` /
`monaco-languageclient` (`MonacoInner.tsx:8` says the `.d.ts` feed is
deferred), `SharedWorker` / `BroadcastChannel` (none in the client), any
per-type room / zone editor or map, anon read.

### Cut (SHIPPED · DOCUMENTED)
- the second status block *"architecture set; start with the code editor"* (11–19, 9) — history; the canonical block is kept and re-stamped
- *The load-bearing decisions* → 2 *Client-heavy, thin validating server* (39–43, 5) — code: `CmsRoutes.ts` (no authz in routes), `CmsLogic`; doc: `cms.md § REST data API`, `§ Gating`
- → 3 *One canonical artifact, two modes* (45–49, 5) — code: `TemplateForm` Form/YAML toggle over one data object; doc: `studio.md` intro + `§ Client surface` (*byte-identical to the raw editor*)
- → 4 *Two modes map to two trust tiers* (51–55, 5) — code: `StudioLogic.commitClass` `isWizard`, `createTemplate` per-path; doc: `studio.md § The trust model`, `cms.md § Gating`
- → 5 *Start with the code editor* (57–59, 3) — history (done). A one-line pointer replaces 1–5
- `### Client ↔ server transport` (144–202, 59) — code: `CmsRoutes.ts`, `CmsSession.runAsSessionPlayer`; doc: `cms.md § REST data API + the WS split` (no GraphQL, CSRF, the deferred CMS-live channel + the `cms-delta` reservation), `§ The attribution bridge` (the one wrapper; same mechanism as WS + `ScheduleApi`). Heading + pointer left, naming the still-deferred live channel
- `### Two modes over one canonical artifact` (204–220, 17) — doc: `studio.md` (projection over the same `template.data`; three creation acts), `cms.md § The unified-tree projection`. Heading + pointer left
- `### The code editor` → *Validation: client-instant + server-authoritative* + *Save → live* bullets (240–246, 7) — code: `CmsLogic.write` → `HotReloadApi.reload` / `restoreFromTemplate`; doc: `cms.md § Save go-live`, `§ "Test in holodeck"`. Pointer bullet left
- `### Content editors` → intro + *widget registry* + *defaults-aware field surface* + *reference-picker* (270–289, 20) — code: `components/cms/studio/widgets/`, `StudioLogic.describeClass` (`valueSource` = instance / resolution-chain / class-default through `Zone.lookupField`), the reference-picker over `cmsClient.listTree`; doc: `studio.md § Client surface`, `§ StudioApi / StudioLogic`. Pointer left; the room / zone / map / room↔zone paragraphs KEPT
- `### Composition & the combo catalog` (334–378, 45) — code: `BlueprintCatalogue`, `Blueprint` (`signature`, `parent`), `StudioLogic.publishBlueprint` / `scaffoldClass` / `commitClass`, `ComposerView`'s matching-blueprints panel; doc: `studio.md § The blueprint catalogue`, `§ The trust model`, `§ Client surface` (*"⚠ this is already <Name> — use it?"*). "Combo" shipped as **blueprint**; the *request a missing combo* clause is `studio.md § Deferred seams` (`proposed`). Heading + pointer left
- `### Storage & versioning` → *Source tree (TS code): filesystem, git-backed* bullet (384–387, 4) — code: `mud/api/git.ts`, `GitLogic`; doc: `git-workflow.md § The governing constraint` (one repo, one long-lived branch, no per-scope branching). Pointer bullet left; the *Content tree* bullet + the external-editing paragraph KEPT (`domain_history` is unbuilt)
- `## Open questions` → Q1 *Editor core* (542–544, 3) — resolved: Monaco, lazy-loaded, bundled locally → `cms.md § Shape at a glance`, `§ Client surface`, `§ History`. One-line pointer left
- → Q7 *Transport* (564–566, 3) — resolved: REST + the `runRoot` bridge → `cms.md § REST data API`, `§ The attribution bridge`. One-line pointer left
- `## Build order` → *Wave 1* (577–584, 8) — shipped across `cms.md` / `git-workflow.md` / `diagnostics.md` / `studio.md`; the engine-typed TS service + LSP did not → the pointer names `authoring-intelligence-slate.md`
- `## Once shaped into formal requirements` → bullets 1–3 (*One SPA…*, *Transport*, *One canonical artifact*) (621–634, 14) and bullet 6 (*Composition & the combo catalog*) (650–661, 12) — restatements of the cuts above; one pointer line each

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none — every shipped decision was already carried by a subsystem doc

### Superseded — cut
- *The load-bearing decisions* → 1 *Same app, one session — two tabs with cross-tab state awareness* (33–37, 5) — by the code: the CMS is three cards in the play client's one feed, `cockpit mode build`, no second tab → `cms.md § The CMS is a CARD`. Named in the 1–5 pointer
- `### The CMS app shape` (134–142, 9) — by the code, as above; one-session-two-aware-surfaces holds without any cross-tab transport; live tree/file deltas remain deferred (`cms.md § The WS split`). Heading + note left
- `### The code editor` → *Lease-scoped tree* bullet (247–248, 2) — by the code: per-path **parcel-title** gating (`AccessApi.canAtPath`) with the listing pruned to what `canRead` admits, no lease → `cms.md § Gating`, `access.md`. Note left
- `### The external-editor path` → paragraph 1, the git keystone (clone → edit in VS Code → push; validate-on-push) (252–258, 7) — by the code: git shipped as **snapshot-and-push from the box** because the working tree IS the live server (`git-workflow.md § The governing constraint`); there is no receive-push path; the external-editor question moved to `cms-connectors-slate.md` (SSH for source, MCP / WebDAV for content). Note left; the LSP paragraph KEPT (see Uncertain)
- `### Forward hooks` → *Signal source: the authoring op-log (`domain_history`) is the engagement-event stream* bullet (502–507, 6) — by the code: the ledger is `authoring_events` (`lib/standing/AuthoringEvent.ts`, `provenance.md`) and its consumer is the producer influence stock (`influence.md`); no `domain_history` exists. Note left; the *Cost gate* bullet KEPT
- `### Author → test handoff` (515–520, 6) — by the code: no session is launched or embedded — the CMS toolbar sends `go wardrobe` over the game socket and the sandbox door does the rest (`cms.md § "Test in holodeck"`: `POST /api/sandbox/test-session` was deleted before merge; `sandbox.md`). Heading + note left

### Kept (UNBUILT)
- the status block (re-stamped) · the framing paragraph · *The load-bearing decisions* → 6 (see Uncertain) · *See also* (unchanged — every target exists; the shell-author line's *"`GitApi` harness lives in this neighborhood"* is stale wording but a link line, left)
- `### The code editor` → *Editor core: Monaco, lazy-loaded* (mixed: Monaco shipped; the `addExtraLib` `.d.ts` feed did not — one bullet, kept whole) · *The intelligence stack — its own subsystem* (pointer to authoring-intelligence)
- `### The external-editor path` → the LSP paragraph (see Uncertain)
- `### Content editors` → *The room editor* (see Uncertain) · *The zone editor* · *The map is its own component* · *Room ↔ zone*
- `### Storage & versioning` → intro · *Content tree (templates)* bullet (mixed: Mongo `domain` shipped, `domain_history` did not) · the external-editing paragraph
- `### Drafts, staging & publish` — whole (no changeset / draft / overlay code; `studio.md § Deferred seams` reserves `proposed`; `git-workflow.md § Deferrals` defers finer-than-branch review to it)
- `### The review gate — publish as deliberation` — whole (`ForumsLogic.matureArgument` still emits `mature` and binds nothing; no `Entry.codeRef`; `SubjectSurface` exists in `lib/forum/Subject.ts` for the fifth surface)
- `### Forward hooks` → intro · *Cost gate* · closing
- `## Worked scenario` — one paragraph mixing shipped and unshipped beats (IntelliSense, `domain_history`, the VS Code LSP); the lived-experience spec for the remainder, kept
- `## Open questions` → Q2 · Q3 · Q4 (see Uncertain) · Q5 (see Uncertain) · Q6 · Q8
- `## Build order` → *Wave 2* (see Uncertain) · *Wave 3+*
- `## What this slate does NOT cover` — whole
- `## Once shaped into formal requirements` → intro · *The code editor* (mixed) · *Content editors* (mixed) · *The external-editor path* (see Uncertain) · *Storage* (mixed) · *Drafts* · *Forward hooks* (mixed) · *Author → test + three-surfaces* (the framing half) · *Tests* (mixed) · closing

### Doctrine — kept, labelled
- `## Principle` (103–112) — the five one-line theses. ⚠ 1 (*two aware surfaces*) shipped as cards in one feed, not two tabs; 5 (*your editor, not ours*) is contested by `cms-connectors-slate.md`. Kept whole as the slate's compact doctrine; the long-form decisions list beneath the framing was cut instead
- `### Three authoring surfaces, one backend` (118–132) — the three-front-ends framing. *"lease-scoped trees + gate"* reads as parcel title + `canAtPath` now (`access.md`); the in-game light tier is `scoped-authoring-slate`'s; the external tier is `cms-connectors-slate`'s

### Uncertain — kept
- *The load-bearing decisions* → 6 *Let coders use their own environment… via git + LSP* (61–65), `### The external-editor path` → the LSP paragraph (260–266), `## Build order` → *Wave 2* (586–588), and the *external-editor path* bullet of the boil-down (662–665) — all say **VS Code extension + LSP + git sync**. Contradicted twice: `git-workflow.md` shipped git as publish-from-the-box (no sync path in), and `cms-connectors-slate.md § What this slate does NOT cover` sets the bespoke VS Code extension aside (*"WebDAV serves all of them for less"*) with Remote-SSH as the source answer. The LSP half is `authoring-intelligence-slate.md`'s. Kept verbatim; requirements must pick between the two slates' answers rather than inherit both
- `### Content editors` → *The room editor* (291–298) — its *contents* widget is a *"reference-picker over the `populates` spawn list"*; `populates:` is RETIRED (the `props:` / `cast:` designation — no content YAML under `packages/content` carries a `populates:` key, and the only `populates` hits in `packages/server/src/mud` are the English verb in comments; the appliers are `applyProps` / `applyCast`). Kept; the widget's target field is stale
- `## Open questions` → Q4 *Cross-tab transport* (553–554) — its premise (one session, two browser tabs) is gone with the card; what remains open is the CMS-live delta channel (`cms.md § The WS split`, `diagnostics.md § Deferrals` — `cms-delta`). Kept as contradicted, not cut as answered
- `## Open questions` → Q5 *Content-editor framework* (555–560) — the first half (*how schema generates the baseline form*) is answered: the `@authorable` source-scan + TypeDoc type shape + the widget lookup order (`studio.md § Field-schema derivation`); the second half (the zone map) is open. One paragraph, kept whole
- `## Once shaped` → *Forward hooks* bullet (674–678) — the signal half shipped as `authoring_events` → the producer stock; the cost half did not. One bullet, kept
- Overlaps for the cluster pass: external template authoring (Q3) ↔ `cms-connectors-slate` Part 3 (*content over WebDAV, read-only first*) and Q2 there; anon read-only ↔ `cms-connectors-slate` Q7; the review gate ↔ `git-workflow.md § Deferrals` (finer-than-branch review) and `studio.md § Deferred seams` (`proposed`); drafts/changesets ↔ `access-slate.md` *Versioning & audit*; the LSP ↔ `authoring-intelligence-slate.md`; the zone map ↔ `map-slate.md`; the in-game light tier ↔ `scoped-authoring-slate.md`

### Fixes to cms.md (statements the code proves false — minimal edits, no rewrites)
- `§ Shape at a glance` → *Surface* bullet: *"a route of the existing client SPA (`?surface=cms`), opened in its own browser tab … the CMS tab opens no WebSocket"* → three cards in one feed, opened by verb in `build` mode; CMS data REST-only, no CMS WS message. Code: no `surface=cms` anywhere in `packages/client/src`; `CardBodies.tsx:1001-1003`; `BuilderLayout.tsx` header
- `§ REST data API` → *"Five routes"* → *"Six"*, and the missing `GET /api/cms/diagnostics → DiagnosticApi.list` line inserted into the block with a pointer to `diagnostics.md § Reader B`. Code: `CmsRoutes.ts:153`
- `§ Client surface` → first paragraph (*own tab, full-screen takeover, launcher opens it*) → the `cms` card in `build` mode; the account-menu launcher sends `cockpit mode build`. Code: `AccountMenu.tsx:159-166`
- `§ Deferral boundary` → bullet 1: *"the holodeck"* removed from the deferred list, with a clause noting the per-path title gate + pruned listing (`§ Gating`) and the sandbox door (`§ "Test in holodeck"`, `sandbox.md`) since shipped; *"writes HEAD directly — no history"* left as is (still true)
- `§ Deferral boundary` → *Content editors* bullet: a clause added — the generic schema-driven form, the widget registry and the reference-picker shipped as the Studio (`studio.md`); the per-type room / zone editors + the map remain
- `§ Client surface` → *Explorer* bullet: *"two fixed roots"* → *"three"* (one word). Code: `CmsExplorer.tsx:19-23` `ROOTS` = content · source · documents; the doc's own `§ The unified-tree projection` already says three
- `§ Deferral boundary` → *Git* bullet: *"deferred entirely; GitLab becomes a future runtime integration"* → shipped as the in-runtime VCS (`git-workflow.md`), snapshot-and-push, never clone→edit→push. Code: `mud/api/git.ts`, `backend/GitRoutes.ts`

### Handoff (belongs in a doc outside my list)
- → `diagnostics.md § Reader B — the CMS panel`: the statement *"The client `CmsDiagnosticsPanel` is a third tab in `CmsSurface`; since the CMS tab opens no WebSocket it polls the route"* is stale — `CmsSurface` and its four-tab bar are gone (`BuilderLayout.tsx`), and `CmsDiagnosticsPanel.tsx` is **mounted nowhere** in the client (no card registers it in `CardBodies.tsx`). The REST route is live; the panel is unreachable. Either a `diagnostics` card (an `errors` verb `opens_card`) or the doc should say the CMS reader is the `errors` verb only.
- → `studio.md § Client surface`: *"The Studio is the 'Kinds' mode of the CMS surface (`?surface=cms`)"* — stale for the same reason; the doc's own *§ The Studio is a CARD* has the current shape. No slate content rides on it.
- → `git-workflow.md § The two surfaces`: *"The client `CmsGitPanel` is a fourth tab in `CmsSurface`"* — stale; the doc's own *§ The git panel is a CARD* has the current shape.

### Status block
- Status line: *"Wave 1 (the code editor) shipped, and the Studio, git and diagnostics with it"* → names the REST surface + bridge, git, diagnostics, the Studio (generic form + blueprint catalogue) and the CMS-as-cards, with pointers to all four docs
- Left: *lease-scoped trees + `domain_history` versioning · the draft/changeset overlay + atomic publish · the law==code review gate · engine-typed IntelliSense/LSP + the VS Code path · anon read-only · cross-tab sync · the zone map* → *`domain_history` op-log versioning · the draft/changeset overlay + atomic publish · the law==code review gate (the forums `mature` consumer) · the per-type content editors (room · zone) + the zone map · engine-typed IntelliSense/LSP + the external-editor path (the LSP is authoring-intelligence's; the VS Code extension is contested by cms-connectors) · external template authoring (Q3) · inline preview (Q6) · anon read-only · the CMS-live delta channel (`cms-delta`) · the cost-to-create seam (game-phase)*. Dropped: *lease-scoped trees* (shipped as parcel-title per-path gating) and *cross-tab sync* (the two-tab model is gone; the live-delta channel replaces it). Added from the body: the per-type editors, Q3, Q6, the cost seam
- Size: a build → a build (the per-type editors + drafts + the review gate are a cycle of their own)

---

## docs/slates/builds/cms-connectors-slate.md — 244 → 233 · Status PARTIAL → PARTIAL

Entirely UNBUILT, and its one premise is still true. Grep: no `bearer` /
API-key / personal-token path in `packages/server/src/backend/` (the only
`accessToken` hits are OAuth-provider profile storage,
`Application.ts:505,536`); every `/api/cms/*` route is
`AuthMiddleware.requireAuthApi` (`CmsRoutes.ts:88`); no `webdav` /
`PROPFIND` / `MKCOL` / `modelcontextprotocol` anywhere in
`packages/{server,client,types}/src` or any `package.json`. The surface it
adapts is documented in `cms.md` (the route ↔ op table, the gating table,
save go-live) and `diagnostics.md § Reader B` (`GET /api/cms/diagnostics`).
Cuts are two.

### Cut (SHIPPED · DOCUMENTED)
- the second status block *"design conversation, captured. Not requirements — and explicitly NOT a near-term priority"* (18–23, 6) — one-status-block rule. ⚠ It carried a PRIORITY statement, not a state, so the clause was carried into the canonical Status line verbatim (*explicitly NOT a near-term priority (user, 2026-09-01: "though it's not a big priority yet")*) rather than lost
- `## Part 0` → the `CmsApi` method ↔ REST route table (53–59, 7) — code: `CmsRoutes.ts:91-178` (six routes); doc: `cms.md § CmsApi / CmsLogic`, `§ REST data API` (now listing `diagnostics` too — see the fix above). One-line pointer left; the finding's own sentences (*"already a filesystem primitive set"*, *"protocol adaptation over a complete, gated surface"*) and the ⚠⚠ no-token-auth paragraph KEPT — they are the design premise and still true

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none

### Superseded — cut
- none

### Kept (UNBUILT)
- the status block (re-stamped) · *Captured 2026-09-01* · *Provenance* · *Sits on*
- `## Part 0` → the finding sentences + the ⚠⚠ paragraph (the single gate on both asks — still the state of the backend)
- `## Part 1 — scoped personal access tokens` — whole (no token issuance, storage or middleware exists)
- `## Part 2 — MCP` — whole (no MCP dependency or server; the five tools map onto shipped `CmsApi` ops + `/api/cms/diagnostics`, all verified present)
- `## Part 3 — WebDAV` → `### WebDAV is the right protocol for the gap` — whole (the `DELETE`/`MKCOL`/`MOVE` gaps are real: `CmsApi` has `listTree`/`read`/`stat`/`write` and nothing else, `mud/api/cms.ts`; synthesized namespace folders are `cms.md § The unified-tree projection`)
- `## Suggested ordering` · `## Open questions` Q1–Q7 (none answered by code) · `## What this slate does NOT cover`

### Doctrine — kept, labelled
- `## Part 3` → `### ⭐ Source already has a connector, and it is called SSH` — a finding about the deployment (the box runs `tsx` from a writable checkout — `git-workflow.md § The governing constraint`, `deployment.md`), not a build item; it is what removes source from the connector's scope. Not added to `Left`
- `## Part 4 — ⚠⚠ The split that should drive the whole design` — the two-products thesis over the shipped gating table (`cms.md § Gating`: content per-path `canAtPath`, source `isWizard`) and the resilience posture (*TypeScript access IS root*). Doctrine for the token-scope design; not a `Left` item of its own

### Uncertain — kept
- none contradicted. Overlaps for the cluster pass: Q7 *anon / read-only view* ↔ `cms-slate` *anon read-only* (`cms.md § Deferral boundary`: an anon reader has no actor, so it needs its own unauthenticated read path scoped to content only); Part 3 *content over WebDAV, read-only* + Q2 ↔ `cms-slate` Q3 *external template authoring*; Q4 *attribution* is already answered in principle by `cms.md § The attribution bridge` (the stamp is the single channel; a connector must land on `CmsSession.runAsSessionPlayer` or an equivalent backend boundary) but the connector-side decision (in-process vs beside, Q3) is open, so kept; the *VS Code extension set aside* line contradicts `cms-slate`'s Wave 2 — recorded on that slate's entry, not here

### Handoff (belongs in a doc outside my list)
- none

### Status block
- Status line: appended the priority clause from the cut narrative block (see Cut above)
- Left: unchanged — *scoped personal access tokens (content-vs-source scope) · the MCP server (`tree`/`read`/`write`/`diagnostics`/`run`) · WebDAV over `source` + `document` · read-only WebDAV over `content` · the content-backend `MKCOL`/`DELETE`/`MOVE` semantics*. Every item maps to a body section (Parts 1, 2, 3, 3, 3/Q2) and every UNBUILT section is represented
- Size: a build → a build (the token substrate alone is a new auth path through the backend; the slate's own sizing — small + medium — still sums to a cycle)

---

## Batch totals

- Slates: 2 · lines 932 → 698 (−234)
- Sections cut (SHIPPED · DOCUMENTED): 14 (cms-slate 12 · connectors 2) · Superseded: 6 · Graduated: 0 · Kept UNBUILT sections: cms-slate 24 · connectors 11 · Doctrine: 4 · Uncertain: 6 entries (cms-slate 5 + overlaps; connectors 0 + overlaps)
- Subsystem-doc edits: `cms.md` — 7 minimal fixes of code-proven-false statements (+1 route line), no inserts of new sections, no rewrites
- Handoff: 3 stale-shape notes (diagnostics.md · studio.md · git-workflow.md); one live finding — `CmsDiagnosticsPanel` is unmounted
- Hardest calls: (1) treating the two-tab / cross-tab model as SUPERSEDED by the card rather than deferred — the code is unambiguous (`BuilderLayout.tsx` header, no `surface=cms`), but Q4 was kept and flagged rather than cut; (2) the external-editor path — two later sources contradict it in different ways (git shipped as publish-from-the-box; connectors set the VS Code extension aside), so it was kept everywhere it appears and listed once under Uncertain instead of being cut as superseded; (3) carrying the connectors slate's *"not a priority"* into the canonical Status line rather than losing it with the narrative block; (4) editing six sentences of `cms.md` — each is a statement the code proves false, each is recorded, none is a rewrite
