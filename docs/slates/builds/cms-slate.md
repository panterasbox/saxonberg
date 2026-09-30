# CMS / content-authoring-tools slate (working doc)

> **Status: PARTIAL** — the code editor, the REST surface + attribution
> bridge, git, diagnostics and the Studio (the generic schema-driven form +
> the blueprint catalogue) shipped, and the CMS became CARDS in the play
> client's one feed → [cms.md](../../subsystems/cms.md),
> [studio.md](../../subsystems/studio.md),
> [git-workflow.md](../../subsystems/git-workflow.md),
> [diagnostics.md](../../subsystems/diagnostics.md)
> **Left:** `domain_history` op-log versioning · the draft/changeset
> overlay + atomic publish · the law==code review gate (the forums `mature`
> consumer) · the per-type content editors (room · zone) + the zone map ·
> engine-typed IntelliSense/LSP + the external-editor path (the LSP is
> authoring-intelligence's; the VS Code extension is contested by
> cms-connectors) · external template authoring (Q3) · inline preview (Q6)
> · anon read-only · the CMS-live delta channel (`cms-delta`) · the
> cost-to-create seam (game-phase)
> **Size:** a build

Working slate for the **CMS / authoring tools** — how content gets *made*.
It is **not** a separate application in the build sense; it's surfaces of
the same client SPA, sharing one session with the game, talking to the same
server. The server is **thin** (validate, persist, be the source of truth,
serve the lease-scoped trees); the client is **thick** (all authoring UX).
That split follows the project's client/server principle — default to the
server so other game elements can respond, but authoring is the
large-data + responsiveness case where the client does it better, while the
*content itself* stays server-side as truth.

The load-bearing decisions:

*Decisions 1–5 shipped → cms.md (2), studio.md (3, 4), and 1 in a different shape — cards in one feed, not a second tab (cms.md § The CMS is a CARD); 5 is history.*

6. **Let coders use their own environment — it matters *more* than a perfect
   web editor.** The web editor is the no-install *fallback*; the priority is
   a first-class **external-editor path** (author in your own VS Code, with
   your extensions/keybindings/Copilot) via **git + an editor-agnostic
   (LSP-shaped) intelligence**.

See also:

- [docs/slates/access-slate.md](../tails/access-slate.md) — **the backend.** The
  lease-scoped content + source trees, the authoring-op gate, the holodeck
  (author→test), and **versioning/audit** (the `domain_history` change-log)
  all live there; the CMS is a client over it.
- [docs/slates/authoring-intelligence-slate.md](../builds/authoring-intelligence-slate.md)
  — **the brain.** The content-semantics intelligence (completions /
  diagnostics / nav) the code editor surfaces, the LSP that travels to
  external editors, and the model shared with the save-gate. The CMS owns the
  *UI*; that owns the *intelligence*.
- [docs/slates/scoped-authoring-slate.md](../tails/scoped-authoring-slate.md) — the
  **in-game light-authoring tier** (dorm-theming, kiosks, the
  describe/decorate path), the third authoring surface alongside the CMS and
  external editors.
- [docs/subsystems/shell-author.md](../../subsystems/shell-author.md) /
  [shell-workspace.md](../../subsystems/shell-workspace.md) — the in-game
  `write`/`cat` shell + `SourceTreeApi`; the **`GitApi` source-tree harness**
  lives in this neighborhood.
- [docs/slates/client-cockpit-slate.md](../tails/client-cockpit-slate.md) — the play
  client (the shared SPA) and the **forms-generate-commands** precedent the
  content editors mirror.
- [docs/slates/map-slate.md](../builds/map-slate.md) — the **zone editor's canvas**:
  the shared 2D/3D map renderer (the visual mode, deferrable behind the v1
  list/connectivity fallback).
- [docs/subsystems/char-gen.md](../../subsystems/char-gen.md) — the
  **kiosk-over-commands** pattern (a friendly UI that emits the canonical
  command/artifact), the content editors' template.
- [docs/standard-model.md](../../standard-model.md) — the engine content the
  CMS authors (templates, mixins, the kinds/traits); the **schema source**
  the editors are generated from.
- [docs/vision.md](../../vision.md) — the CMS/modding vision ("create or modify
  content *within the game* **or** through a web interface").

---

## Principle

1. **One app, one session, two aware surfaces** (game + CMS).
2. **Thick client, thin validating server** — content stays server-side as
   truth.
3. **One artifact, two modes** — code editor (canonical) + content editors
   (sugar that emits the same artifact).
4. **Two trust tiers** — code = trusted; data = everyone (data-not-code).
5. **Your editor, not ours** — the external-editor path beats web-editor
   polish; the brains are editor-agnostic.

---

## The model

### Three authoring surfaces, one backend

All authoring — however it's done — flows through the **access layer's
lease-scoped trees + gate**. There are three front-ends over that one
backend:

- **In-game light authoring** (scoped-authoring slate): kiosks + the
  `write`/`cat` shell, in-place and diegetic — describe your room, theme a
  side. Light edits while playing.
- **The CMS web app** (this slate): the heavy authoring surface — code
  editor + content editors — for serious content creation.
- **External editors** (VS Code etc.): power coders author in their own
  environment via git + the editor-agnostic intelligence.

One gate, one source of truth, three ways in.

### The CMS app shape

*Superseded by the code: not a second tab — `cms` · `git` · `studio` are three CARDS in the play client's one feed (`cockpit mode build`), so one-session-two-aware-surfaces holds without cross-tab transport → cms.md § The CMS is a CARD; live tree/file deltas remain deferred (cms.md § The WS split).*

### Client ↔ server transport

*Shipped → cms.md § REST data API + the WS split (no GraphQL; CSRF; the CMS-live WS channel is still deferred there — the `cms-delta` reservation), § The attribution bridge (`CmsSession.runAsSessionPlayer`, the one run-as-session-player wrapper).*

### Two modes over one canonical artifact

*Shipped → studio.md (the form is a projection over the same `template.data` the raw editor writes; § The trust model — three creation acts), cms.md § The unified-tree projection.*

### The code editor (build first)

Beyond "it's an editor over the lease-scoped trees":

- **Editor core: Monaco, lazy-loaded.** Monaco's built-in TS language
  service gives **engine-typed IntelliSense** (autocomplete + type-checking
  against the actual standard model) largely for free — feed it the engine's
  `.d.ts` via `addExtraLib`. **Lazy-load it** so only the trusted code-editor
  *mode* pays the bundle weight; content editors are plain React and never
  load it. (CodeMirror 6 is the lighter alternative but has no built-in TS
  service — you'd assemble it; deprioritized given Monaco's head start and
  that external editors are the real coder path.)
- **The intelligence stack — its own subsystem.** The editor is the
  *surface*; the brains (TS via engine `.d.ts` + YAML via JSON schemas + the
  custom platform-semantic layer) live in the **authoring-intelligence**
  slate ([authoring-intelligence-slate.md](../builds/authoring-intelligence-slate.md))
  — editor-agnostic, shared with the save-gate, and the reason the editor
  *widget* choice is low-stakes (the brain is separate).
- *Validation + save → live: shipped → cms.md § Save go-live (template vs source), § "Test in holodeck".*
- *Lease-scoped tree — superseded: shipped as per-path parcel-title gating with the listing pruned to what `canRead` admits → cms.md § Gating, access.md.*

### The external-editor path (the priority)

*Superseded by the code: git shipped as snapshot-and-push FROM the box (the working tree IS the live server; no clone→edit→push, no validate-on-push) → git-workflow.md § The governing constraint; the external-editor question moved to [cms-connectors-slate.md](./cms-connectors-slate.md) (SSH for source; MCP / WebDAV for content).*

What lets the *intelligence* travel to external editors is that it's
**LSP-shaped** — see
[authoring-intelligence-slate.md](../builds/authoring-intelligence-slate.md). The
same language server feeds the webapp editor (via `monaco-languageclient`)
**and** a coder's real VS Code (a small extension + the LSP + the git sync),
so they get engine-aware completions in their native editor — and it makes
the Monaco-vs-CM6 choice nearly irrelevant (both just consume the LSP).

### Content editors — the room & zone (the first worked ones)

*The framework shipped → studio.md § Client surface (the `widgets/` registry + lookup order; the reference-picker over `cmsClient.listTree`), § `StudioApi` (`describeClass`: effective value + `valueSource` through the engine's own `Zone.lookupField`→biome resolution). The per-type editors below did not:*

**The room editor (the node).** The defaults-aware form (identity /
description + live look-preview / atmosphere / light / placement) + three
custom widgets: **detail-tree** (local nested `Detailed` features — no
inheritance), **exits** (the connection-picker — explicit + zone-derived
shown, reference-picker destinations, zone-invariant-aware, bidirectional +
the cross-lease "request the return" handling), **contents**
(reference-picker over the `populates` spawn list). Start = clone-from an
archetype, or blank.

**The zone editor (the map).** The same data one zoom out — rooms as nodes,
exits as edges. Its distinctive jobs: **layout** (place rooms; note exits are
now **explicit-only** — the former grid-adjacency exit derivation was removed in
the Terminus build, so the editor must *write* the reciprocal exit edges when it
lays out or connects rooms rather than inferring them from placement;
`SphericalZone` = a node-graph with semantic edges; `FolderZone` = a tree);
**room birth**
(placing a cell *creates* a room — clone-from-archetype — which the room
editor then fleshes); **zone-scale leverage** (set **zone-carried defaults**
— the authoring side of the room editor's "from zone" — plus bulk ops over
selected rooms; ⚠ this was framed as the *no-template-inheritance*
"change the default everywhere" — **that premise died 2026-09-25**: a
row now `extends:` a parent, so "change the default everywhere" has a
second, better answer, and the editor's job here shrinks to the
genuinely spatial defaults a zone owns); **graph-level validation** (unreachable rooms, dangling exits,
the cardinal-only-intra-zone invariant); and it's the **natural draft
changeset unit** (build + publish a zone atomically; holodeck-test the whole
draft).

**The map is its own component, and not a v1 dependency.** The zone map is
the shared **map renderer** ([map-slate.md](../builds/map-slate.md)) — **2D** (a
per-floor grid for Cartesian; a node-graph for Spherical/semantic) *and*
**3D** (a procedural box-render from `coords × cellSize`, three.js/r3f — no
3D-modeling; geometry generated from data). **2D for editing, 3D for
viewing/demo.** Procedural from the honest spatial model, shared by the game
minimap + editor canvas + demo flythrough. The zone editor ships **v1 on a
list/connectivity fallback** (room list + adjacency + validation); the
visual map is a **later enhancement** riding the map project — *not* a v1
blocker.

**Room ↔ zone** are two zoom levels on one dataset (rooms + exits) —
node-contents vs the-map; open a room from the map, return to it. Both are
cross-cutting-identical: intelligence-backed, lease-scoped, emit canonical
YAML, drafts/staging (zone = changeset), holodeck-testable. And both ride the
two reusable pieces — **the defaults-aware field surface** and the
**reference-picker** — that every later content editor inherits.

### Composition & the combo catalog

*Shipped as the Studio — "combo" became **blueprint** → studio.md § The blueprint catalogue (signature dedup, the "this is already X — use it?" prompt, `parent` hierarchy, `publishBlueprint`), § `StudioApi` (`describeClass` reads the effective mixin set), § The trust model (static composition; `scaffoldClass`/`commitClass`). Requesting a missing combo is the reserved `proposed` disposition — studio.md § Deferred seams.*

### Storage & versioning (consumed from access)

The two trees have different backing, and that's fine:

- *Source tree — shipped as the in-runtime VCS: one repo, one long-lived branch, snapshot-and-push → git-workflow.md.*
- **Content tree (templates):** stays in the **Mongo `domain` collection**
  (current state) — *not* moved to files just to get git. Versioning is the
  access layer's **authoring-op change-log** (`domain_history`): we
  **version the gated operations, not the store**. (Full detail in the
  access slate's *Versioning & audit*.)

So coders work the **git-backed code** in external editors; **templates** are
CMS-authored (web), Mongo-backed, op-log-versioned. (Whether templates can
*also* be edited externally — via a working-copy export/import, distinct
from files-as-canonical-storage — is an open question.)

### Drafts, staging & publish

Content is built in **groups — a zone at a time** — and the WIP is
**interdependent** (a draft room's exit points at another draft room). So
content has a **third state** beyond the access slate's live + history:

- **Live** (`domain`) — what the *game* reads.
- **Draft** — a *pending overlay* (a **changeset**), what the *author/team*
  sees, superseding live.
- **History** (`domain_history`) — the past (access slate).

**The overlay:** the author/team works against **live ∪ their changeset,
drafts winning**, so interdependent drafts resolve to each other; the **live
game always reads live**. (The same effective = base + overrides shape used
throughout — group overrides, biome inheritance, dorm theme/override.)

**Two validation passes:**
1. **Live / incremental while editing** — resolved against the **draft
   overlay** (catches errors within the draft world).
2. **Publish — atomic, whole-set, against current live** — the access
   slate's authoritative validation generalized from per-save to
   per-changeset: catches cross-draft gaps, **races** (live changed
   underneath), invariants, leases. Pass → **atomic promotion**
   (all-or-nothing) → live + logged to history. Fail → rejected, nothing
   goes live, conflicts surfaced.

**Shared + lease-scoped** (a zone *team's* staging area); the **holodeck
composes** — load the draft overlay to test the zone *as it will be*,
pre-publish.

**Tier line:** drafts → publish for **collaborative world content** (the
zone build); **direct-to-live** for **personal / light** authoring (dorm
theming — immediate, no changeset). Same world-vs-personal split as
versioning.

**These workflows are ours, not git's.** Git is a **thin VC overlay on one
published repo** (commits + history of published code) — **no per-scope
branching, no inter-repo hijinks** (mods maybe the lone future exception).
So the draft-overlay + atomic-publish is built by us, uniform across both
trees; git/Mongo are just where *published* state lands. (Open detail: how
external editors push into *our* draft workflow.)

### The review gate — publish as deliberation (law == code)

A founding thesis: **law and code are the same kind of thing — a rule —
differing only in enforcement (human vs machine).** So **code/template
review is not a separate Gerrit-style tool; it is the governance
deliberation surface pointed at machine-enforced rules.** A changeset is a
*proposal to amend the shared ruleset*; reviewing it is deliberation;
convergence is enactment. This makes the CMS and the polity one system, not
two.

**It composes with publish as a second gate.** Publish (above) is the
**machine gate** — recompile + lint + lease + invariants → atomic promote.
The review gate is the **human gate** layered on the same step: a changeset
goes live only when it clears **both** — validation *and*
deliberation-convergence — on the same artifact. That two-gate composition
over one artifact *is* law == code made concrete.

**It rides the forums substrate — genuine reuse, in the grain** (assessed:
~6 files, zero changes to forums core). The seams already exist:

- A review is a **fifth `SubjectSurface`** lit on the existing **Subject
  layer** — identity + audience (the lease-scoped team) for free.
- The **argument organizer's claim-graph maps onto review verbatim**:
  `supports` / `objects-to` / `responds-to` are the edge types; an **open
  objection** (a childless `objects-to`) is already the "unresolved concern
  blocking convergence" signal. Review comments are argument edges; a
  request-for-changes is an open objection.
- The convergence signal is the forums **`mature` event** — which today
  *fires into no consumer* ("the decoupled handoff… the deferred governance
  layer"). It was built waiting for exactly this.
- **Apply-on-mature lives outside forums**: a new consumer
  (`EventApi.on(ForumEventFired)`, filtering `kind === 'mature'`) fires the
  atomic publish — the established deferred-consumer pattern, no coupling
  back into forums.
- The change payload rides a **sibling `Entry.codeRef { backend, path,
  revision }`** field — the prose body stays prose; the diff metadata sits
  beside it (the reviewable unit is the changeset; the storage backend is an
  adapter, per *Storage & versioning* — review is storage-agnostic).

**The two-tier split carries through.** Direct-to-live personal/light
authoring (dorm theming) needs no review. Collaborative world content (the
zone changeset) is what the review gate governs — the same world-vs-personal
line as drafts and versioning. New CLI affordances are a fourth
organizer-scoped verb mode (`--approve` / `--request-changes` vs the
argument organizer's `--pro` / `--con` / `--rebut`).

**Sequencing: this lands *after* changesets exist** — it gates publish, so
the edit loop + draft/changeset model (Wave 1 + the access slate's
draft/publish) come first. Captured here while sharp; it is its own wave,
not a Wave 1 dependency. (Hierarchical sign-off — code-owners, multi-level
approval — is governance-layer work *atop* this gate, deferred.)

### Forward hooks (game-phase, deferred): gamified authoring & cost

Authoring is meant to be **gamified** — reward people for making cool
things, possibly along the same progression path as players — and creation
may eventually carry a **cost** (like non-free cosmetics). That's **game
design** (progression / gamification / economy), the deferred phase — *not
designed here*. But the platform already leaves the seams, so it plugs in
cleanly:

- *Signal source — superseded by the code: the authoring ledger is `authoring_events` (provenance.md), not a `domain_history` op-log, and its consumer is the producer influence stock (influence.md); no `domain_history` exists.*
- **Cost gate:** a future "pay to create" rides the **same op-gate** as the
  access lease-check — another condition on the authoring op, no new
  chokepoint.

So authoring is **signal-emitting + gate-able** already; the gamification and
economy that *interpret* those wait for the game-design phase.

### Author → test handoff

*Superseded by the code: there is no launching or embedding of a session — the CMS toolbar sends `go wardrobe` over the game socket and the sandbox door does the rest → cms.md § "Test in holodeck", sandbox.md.*

---

## Worked scenario

A Narnia dev opens the CMS in a second tab (same session; their game tab is
still logged in). They use the **code editor** to tweak an NPC's behavior
TS — engine-typed IntelliSense flags a type error live; they fix it. Save →
server recompiles + lease-gates + persists; the change is logged to
`domain_history`. They hit **test** → a holodeck spins up, clones the NPC,
they fight it; satisfied, they exit (nothing persists but the edit). Later,
a non-coder teammate adjusts the same NPC's dialogue through a **content
editor** (a form) — which emits the same YAML the code editor would. A third
coder, who hates web editors, `git pull`s the source tree, edits the
behavior in their own VS Code with our LSP extension giving the same
completions, and pushes — the server validates + gates on push.

---

## Open questions

1. *resolved: Monaco, lazy-loaded, bundled locally → cms.md § Shape at a glance, § Client surface, § History.*
2. **LSP investment + timing** — now owned by
   [authoring-intelligence-slate.md](../builds/authoring-intelligence-slate.md)
   (*lean: LSP-shaped from the start, given the external-editor priority*).
3. **External template authoring** — can Mongo-backed templates be edited in
   an external editor (a working-copy export/import), or are templates
   CMS-web-only while code is the git/external path? *(User rejected
   files-as-canonical-storage; an export/import working copy is a distinct,
   open option.)*
4. **Cross-tab transport** — SharedWorker vs BroadcastChannel vs per-tab
   connection + server coordination, for one-session-two-tabs state sync.
5. **Content-editor framework** — the shape is set (widget registry +
   defaults-aware field surface + reference-picker; see *Content editors*).
   Remaining: how schema (TS types + JSON schemas) *generates* the baseline
   form, so each new content type is mostly declarative rather than
   hand-built; and the **zone map** (the shared 2D mini-map component vs the
   v1 list/connectivity fallback).
6. **Preview** — beyond holodeck testing, do content editors want inline
   preview (render-the-room-as-you-edit), and how (a parked live view? a
   server-rendered snapshot?).
7. *resolved: REST + the `runRoot` bridge → cms.md § REST data API + the WS split, § The attribution bridge (`CmsSession.runAsSessionPlayer`).*
8. **Drafts/publish** — changeset granularity; atomic-promotion mechanics
   (multi-doc txn / swap); conflict-resolution UX; how external editors push
   into *our* draft workflow; cross-tree "release" coordination (template
   drafts + the one code repo together). *(Gamified authoring + cost-to-create
   are game-phase — deferred, seams only.)*

---

## Build order

**Wave 1 — shipped** → [cms.md](../../subsystems/cms.md), [git-workflow.md](../../subsystems/git-workflow.md), [diagnostics.md](../../subsystems/diagnostics.md), [studio.md](../../subsystems/studio.md); the engine-typed TS service + the LSP-shaped intelligence did NOT ship → [authoring-intelligence-slate.md](../builds/authoring-intelligence-slate.md).

**Wave 2 — the external-editor path (the priority payoff).** The VS Code
extension consuming the LSP + the git sync, so coders author engine-aware in
their own environment; richer platform-semantic completions/diagnostics.

**Wave 3+ — content editors (the ongoing bulk).** The schema→form generation
framework, then type-specific content editors built incrementally per
content type (room, NPC, quest, …) — the friendly, everyone-tier surface,
each emitting the same canonical TS/YAML.

---

## What this slate does NOT cover

- **The access / lease model, the holodeck, versioning/audit** →
  [access-slate.md](../tails/access-slate.md). The CMS *consumes* all of it.
- **In-world light authoring** (dorm-theming, kiosks, the shell) →
  [scoped-authoring-slate.md](../tails/scoped-authoring-slate.md). A sibling
  surface, not the CMS.
- **The play client / cockpit rendering** →
  [client-cockpit-slate.md](../tails/client-cockpit-slate.md). The CMS shares the
  SPA but isn't the play UI.
- **Host isolation (`isolated-vm`)** — the thing that would let *untrusted*
  users write *code*; deferred (access slate). Until then, the code editor is
  trusted-tier and untrusted authoring is data (content editors).
- **The specific per-type content-editor designs** — the bulk of future
  work; each is its own design as content types mature.
- **The engine's content schema itself** (templates/mixins/the standard
  model) — authored *by* the CMS; defined elsewhere.

---

## Once shaped into formal requirements

This slate boils down to:

- *(three bullets cut — one SPA/two surfaces, transport, one artifact/two modes: shipped → cms.md § The CMS is a CARD, § REST data API + the WS split, § The attribution bridge; studio.md.)*
- **The code editor**: Monaco (lazy-loaded) + the **engine-typed,
  editor-agnostic (LSP-shaped) intelligence stack** (TS `.d.ts` + YAML
  schemas + the custom platform-semantic service); client-instant +
  server-authoritative validation; the save → `reload` / holodeck loop;
  lease-scoped tree.
- **Content editors (room & zone, first worked)** on three reusable pieces —
  the **widget registry**, the **defaults-aware field surface** (⚠
  specified as *flat templates, no inheritance* — **dead premise since
  2026-09-25**; rows have parents, so the surface needs a fourth
  provenance beside class/zone/biome, and it must EDIT `own` while
  SHOWING effective, which is exactly how the engine already splits
  them), and the **reference-picker**. **Room editor**
  = defaults-aware form + detail-tree + exits + contents widgets. **Zone
  editor** = the map (layout / room-birth / zone-carried-defaults + bulk /
  graph-validation / the draft-changeset unit); its map is **2D**
  (per-floor grid + node-graph, the shared mini-map), shipped v1 on a
  **list/connectivity fallback** — not a v1 blocker. Room ↔ zone = node vs
  map, one dataset.
- *(the composition & combo-catalog bullet cut — shipped as the Studio's blueprint catalogue → studio.md § The blueprint catalogue, § The trust model.)*
- **The external-editor path as a priority**: the **`GitApi` source-tree
  harness** (version control + external-editor seam + validation-on-push) +
  the **LSP-shaped intelligence** + a VS Code extension — coders author in
  their own environment.
- **Storage**: code = git-files; templates = Mongo + the access layer's
  op-log versioning (no files-for-git).
- **Drafts, staging & publish** — a third content state (live / **draft
  changeset** / history); the draft overlay (live ∪ changeset, drafts win);
  two passes (live-incremental + **atomic whole-set publish**); shared +
  lease-scoped; holodeck composes; **direct-to-live for personal content**.
  **Workflows are ours** (git = thin VC on one repo, no per-scope branching;
  mods the possible inter-repo exception).
- **Forward hooks (game-phase, deferred)**: authoring is **gamified** (the
  op-log is the future gamification signal source — Part II's
  codebase-as-sensor) and may carry a **cost** (rides the same op-gate as the
  lease check). Seams only; the progression/economy that interpret them are
  not designed here.
- **Author → test** via the holodeck; the **three-surfaces / one-backend**
  framing (in-game light, CMS web, external editors).
- Tests: a CMS edit is gated by the editor's lease and validated
  server-side; the same NPC is authorable via the code editor *and* a content
  editor producing identical YAML; a coder edits via external VS Code (git
  push) with engine-aware completions and the server validates on push; a
  content-editor user (data) needs no trusted tier; the 99% never load Monaco.

The per-type content editors, the LSP depth, host isolation (untrusted
code), and inline preview wait for their own work.
