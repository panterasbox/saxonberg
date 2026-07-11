# CMS / content-authoring-tools slate (working doc)

> **Status: architecture set; start with the code editor.** The
> content-authoring application — a **client-heavy** authoring surface over
> the **same backend the game uses** (the access layer's lease-scoped
> content + source trees + the validation gate). One SPA, one session, two
> tabs (game + CMS) with cross-tab state awareness. Two modes — a **code
> editor** (the TS+YAML catchall) and **schema-driven content editors** (the
> friendly, type-specific bulk). Plus a first-class **external-editor path**
> (author in your own VS Code via git) that's *more* important than
> perfecting the web editor.

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

1. **Same app, one session — not a separate React build.** The game and the
   CMS are surfaces of one SPA, sharing a session; either can live in its
   own browser tab with **cross-tab state awareness** (the CMS tab sees live
   game state; the game tab sees authoring state). That's what makes the
   author↔test loop tight.

2. **Client-heavy, thin validating server.** All authoring UX on the client;
   the server validates + persists + serves the **lease-scoped** trees and
   is the source of truth. It reuses the **access layer** wholesale — the
   CMS is a richer client over the same content/source trees + the same
   lease gate; an edit is a gated `write` op like any other.

3. **One canonical artifact, two modes.** Everything is **TS + YAML**, so the
   **code editor edits the canonical artifact** and the **content editors
   are friendly projections that emit the same artifact** (the exact
   parallel to the cockpit's "web forms generate commands"). The file/record
   is the unit; the code editor edits it raw; rich editors are sugar over it.

4. **Two modes map to two trust tiers (data-not-code).** The **code editor**
   produces *code* → **trusted-tier** (until host isolation). The **content
   editors** produce *data* → **everyone** (safe by construction). "Most
   users aren't coders" lands straight on the safety model: coders use the
   code editor; everyone else uses content editors.

5. **Start with the code editor — it's the substrate.** It's the catchall
   the content editors sugar over, so it comes first; the per-type content
   editors are the larger ongoing build, layered on after.

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
- [docs/slates/scoped-authoring-slate.md](../builds/scoped-authoring-slate.md) — the
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

One SPA shared with the game; one session. Open the CMS in its own tab and
it stays the *same* session, with **cross-tab state sync** so the CMS tab
sees your live game state and vice versa (mechanism — a SharedWorker /
BroadcastChannel-backed connection — is implementation; the requirement is
one-session-two-aware-surfaces). That tight coupling is what powers the
author↔test loop: edit in the CMS tab, watch it land in the game tab, test
in the holodeck.

### Client ↔ server transport

The game and the CMS have different transport needs, so they split (one
session — express-session — across all three):

- **Game** — WebSocket + the command bus + the event/scene stream.
  Real-time, bidirectional, event-driven. (Exists; unchanged.)
- **CMS data** (read-heavy: tree / template / references / schemas / types /
  history, + gated writes) — **REST over HTTP**, reusing express-session.
  HTTP caching / statelessness / tooling suit the read-heavy *static-ish*
  content.
- **CMS live** (cross-tab state, holodeck status, live diagnostics on shared
  scopes) — **WebSocket subscriptions**, same session.

**The principle that keeps it safe: any transport is just another *entry
path* to the same gated core ops.** The access gate runs at the core method
(`can(subject, op, resource)`) regardless of whether the call arrived as a
command, an eval, a WS message, or an HTTP request (the "eval is just
another caller" property). So a REST surface **adds no new authz surface** —
it's another front door to ops already gated.

**Why not GraphQL.** Its value is open, client-shaped queries — which forces
authorization at every field/resolver plus depth/cost limits: *re-gating the
whole graph*, the burden a lease-centric system feels. Discrete, named
REST/RPC endpoints map **1:1 to gated core ops** — coarse named operations
fit a lease model; an open query graph fights it. GraphQL's one real win
(relational fetch) we get by shaping endpoints to the CMS's actual queries
(we control both ends) + the [authoring-intelligence](../builds/authoring-intelligence-slate.md)
doing cross-reference resolution. So: **no GraphQL.**

**The attribution bridge (a required seam).** A REST request arrives
*outside* the command pipeline, so it lacks the execution context the WS
command path establishes (`ExecutionContextApi.runRoot`, `causingCommandId`,
the frame stack the access gate walks for the acting avatar). Before a REST
handler touches game state it must **establish a server-side execution root
attributed to the session's player** — seed the session user as subject, run
inside `runRoot` — so `can()` resolves, events fire with provenance, and the
change is attributable. This is the **same pattern `ScheduleApi` uses** for
timer callbacks (also outside a command); build **one** "run-as-session-
player" wrapper and reuse it. Forgetting it → unattributed mutations /
unresolvable access-subject / events without provenance. **Crucially, this
cost is the price of *bypassing the command bus*, not of REST** — a WS
data-channel pays it identically — so it doesn't decide REST-vs-WS.

**The honest costs of the REST surface:** a **second surface** (two
transports to secure/maintain; mitigated by shared session); **dual-channel
coherence** (REST snapshots + WS live → cache invalidation/staleness);
**stateless HTTP fronting a stateful process** (caching wins apply to
*static-ish* content — templates / schemas / types / history — not live
state); **CSRF** on HTTP writes; **divergence risk** (REST + command as two
entry points to one op must both bind the core op, never reimplement). REST
earns its keep for the cacheable content reads + gated writes; the WS handles
live state.

**Fallback:** *WebSocket-for-everything* — a data channel over the WS,
separate from the command bus (the established `mql-subscribe` / `prompt`
pattern): one surface, no per-message CSRF, but you reinvent request/response
+ caching over the socket, lose HTTP's free caching/tooling for the static
reads, and **still pay the attribution bridge**.

### Two modes over one canonical artifact

Everything authored is **TS + YAML**. So:

- **The code editor** edits the canonical artifact directly (TS files; YAML
  templates). It's the **catchall** — anything can be made via code — and
  the **substrate the content editors sugar over**. **Trusted-tier** (code →
  data-not-code → trusted authors only until host isolation).
- **The content editors** are **schema-driven React forms**, rich and
  type-specific (a "room editor," a "quest editor") — *not* a code-editor
  widget. They **emit the same TS/YAML** a coder would write by hand.
  **For everyone** (data → safe). These are the **bulk of the ongoing
  build**, added per content-type, layered on the same schema.

The unifying parallel: just as the cockpit's web forms generate *commands*,
the content editors generate *TS/YAML*. The artifact is the unit; both
modes produce it.

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
- **Validation: client-instant + server-authoritative** (mirrors the access
  layer). The client TS-service is advisory UX; the **server re-validates on
  save** — recompile + lint + the lease gate + content invariants — and that
  is the truth.
- **Save → live.** Save → lease-gated `write` → server validate → persist →
  HMR `reload` into the game, or into a **holodeck** to test. The author→test
  loop, reusing the access layer's `reload` op + holodeck.
- **Lease-scoped tree** — you see/edit only the scopes your leases grant; the
  access model *is* the file-browser's permission model.

### The external-editor path (the priority)

Coders should author in their **own** environment, and this matters more
than polishing the web editor. The keystone is **git**: the **`GitApi`
source-tree harness** makes the source tree a repo, which is simultaneously
**(1)** version control, **(2)** the external-editor seam (clone → edit in
your VS Code → push), and **(3)** the validation hook (the server
validates + lease-gates on push). One mechanism, three wins; the coder
workflow *is* the git workflow.

What lets the *intelligence* travel to external editors is that it's
**LSP-shaped** — see
[authoring-intelligence-slate.md](../builds/authoring-intelligence-slate.md). The
same language server feeds the webapp editor (via `monaco-languageclient`)
**and** a coder's real VS Code (a small extension + the LSP + the git sync),
so they get engine-aware completions in their native editor — and it makes
the Monaco-vs-CM6 choice nearly irrelevant (both just consume the LSP).

### Content editors — the room & zone (the first worked ones)

The content editors are the **everyone-tier, data-side** surface (vs the
trusted code editor). They're **schema-driven** with **custom widgets**
registered for fields a flat form can't express, built on three reusable
framework pieces:

- **The widget registry.** A field renders with its default (form) widget
  unless a richer one is registered for its type/name. "An editor" = the
  generated form + a few registered widgets, sharing all the plumbing (save,
  validation, lease-scoping, drafts). *(The NOC-app precedent: generic
  editors for coverage, custom widgets for UX.)*
- **The defaults-aware field surface.** A room/zone template is **flat**
  (local field data + a `class`) — **there is no template inheritance**. But
  some fields resolve their *effective* value from existing engine sources —
  **backing-class defaults, zone-carried defaults (`Zone.lookupField`), the
  biome chain (atmosphere)** — so the form shows **effective value + source +
  local set/clear**, *displaying the engine's own resolution* (never
  reimplemented). Editing = writing the template's local field.
- **The reference-picker.** A reusable widget: find an in-scope template of
  type X (intelligence-backed, validated). Exits use it (→ rooms); contents
  use it (→ items/NPCs).

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
selected rooms; this is the no-template-inheritance "change the default
everywhere"); **graph-level validation** (unreachable rooms, dangling exits,
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

The content editors above are *instances* of a deeper model — **the Standard
Model made editable** — which splits cleanly by tier:

- **Code editor (code-tier): compose + write logic.** Defining a *kind* is
  writing a class that **composes mixins** — `class Weapon extends
  Weaponable(Tangible(Thing)) {}` — plus any custom behavior (a custom
  attack). The editor offers the **mixin palette** and **scaffolds the
  composition boilerplate**; you hand-write the logic. (*This* is "editors
  generate code" — the composition scaffold; behavior is yours.) Mixins are
  composed **statically in the class** — nothing dynamic, no class-less
  templates.
- **Content editor (data-tier): instantiate + fill.** Making a *thing* is
  picking a class (`class: Weapon`) and filling its template fields. The
  composition is **fixed by the chosen class**; the editor *reads* its
  **effective mixin set** (from the catalog) to render the right fields — so
  a `Weapon` and a hand-composed `Weaponable(Thing)` surface the **same**
  fields, regardless of whether the mixins arrived via a named subclass or
  directly.

**The combo catalog (named compounds).** A named combo (`Weapon`) is a thin
composition-class — mixins are the particles, a combo is a **named
molecule**, the catalog is the accreting periodic table (the Standard
Model's chemistry metaphor as a feature). It **grows from authoring**: when
you compose in the code tooling, the editor checks the catalog and either —

- **matches an existing combo** → *"this is a `Weapon` — use it?"* (reuse /
  dedup — "someone may have already solved this"), or
- **is new** → *"name it?"* → scaffolded into the catalog.

Combos organize into a **hierarchy** by composition (one that adds mixins to
another nests beneath it — `RangedWeapon` under `Weapon`); behavior stays in
the mixins, so it's thin composition, not a brittle behavior-tower. The
catalog **is the archetype roster** the content editor's picker browses —
now grown organically (promotion) rather than only hand-curated — and it
does three things at once: **discovery** (browse what exists),
**anti-proliferation** (the dedup prompt), **familiarization** (learn solved
patterns). A content author who hits a missing combo signals/requests one
(or composes it in the code editor, if trusted).

So the editors' vocabulary is the authoring-intelligence's **two catalogs**:
the **mixin catalog** (particles — each mixin's fields/config/rules) and the
**combo catalog** (named compounds, hierarchical). Particles to compose
(code); compounds to reuse (both).

### Storage & versioning (consumed from access)

The two trees have different backing, and that's fine:

- **Source tree (TS code):** filesystem, **git-backed** (`GitApi`) —
  external-editor-native, git-versioned. Git is a **thin VC overlay on one
  repo** (no per-scope branching); the draft/staging *workflow* on top is
  **ours** (see *Drafts, staging & publish* below).
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

- **Signal source:** the **authoring op-log (`domain_history`)** *is* the
  engagement-event stream (made-a-room, published-a-zone, content-got-played)
  a future gamification layer consumes — the meaning-free events of
  `standard-model.md` Part II (authoring reports "this happened"; the game
  assigns the reward). It's literally Part II's *codebase-as-sensor* example,
  made concrete. **No new substrate.**
- **Cost gate:** a future "pay to create" rides the **same op-gate** as the
  access lease-check — another condition on the authoring op, no new
  chokepoint.

So authoring is **signal-emitting + gate-able** already; the gamification and
economy that *interpret* those wait for the game-design phase.

### Author → test handoff

The loop: build in the CMS (or your editor) → **test in the game's
holodeck** (the CMS launches/embeds a holodeck session against the game —
park-real-avatar, fresh test body, reaped wholesale) → back to authoring.
Detail in the access slate's *Testing & the sandbox*.

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

1. **Editor core** — Monaco (lean) vs CodeMirror 6, given external editors
   are the priority and the intelligence is editor-agnostic. *Lean: Monaco,
   lazy-loaded, as the web fallback.*
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
7. **Transport** — REST-for-content + WS-for-live (*lean*) vs
   WS-for-everything; and confirm the **session → `runRoot` attribution
   bridge** as the shared seam (one "run-as-session-player" wrapper, reused).
8. **Drafts/publish** — changeset granularity; atomic-promotion mechanics
   (multi-doc txn / swap); conflict-resolution UX; how external editors push
   into *our* draft workflow; cross-tree "release" coordination (template
   drafts + the one code repo together). *(Gamified authoring + cost-to-create
   are game-phase — deferred, seams only.)*

---

## Build order

**Wave 1 — the shell + the code editor + git.** The shared-SPA / one-session
/ cross-tab shell; the **REST data API** (content/schema/history reads +
gated writes) + the **session → `runRoot` attribution bridge** + the WS live
channel; the **`GitApi` source-tree harness** (clone / push /
validate-on-push); the **code editor** (Monaco, lazy-loaded, over the
lease-scoped trees) with the **engine-typed TS service**; client-instant +
server-authoritative validation; the save → `reload` / holodeck loop. Build
the platform intelligence **LSP-shaped** from the start.

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
  [scoped-authoring-slate.md](../builds/scoped-authoring-slate.md). A sibling
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

- **One SPA, one session, two aware surfaces** (game + CMS, cross-tab sync);
  **thick client, thin validating server**; the CMS as a **client over the
  access layer** (lease-scoped trees + the gate).
- **Transport**: game = WS + command bus; **CMS data = REST** (cacheable
  content/schema/history reads + gated writes); CMS live = WS subscriptions;
  one session. **No GraphQL** (open-query surface fights lease-gating; REST
  ops map 1:1 to gated core ops). Any transport is just another **entry path
  to the same gated core op** — but a non-command channel must pay the
  **session → `runRoot` attribution bridge** (build once, reuse) to stay
  attributable, plus the costs of a second surface + dual-channel coherence +
  CSRF-on-writes.
- **One canonical artifact (TS + YAML), two modes** — the **code editor**
  (catchall, trusted-tier) and **schema-driven content editors** (everyone,
  data-tier), the latter emitting the same artifact (forms-generate-the-unit).
- **The code editor**: Monaco (lazy-loaded) + the **engine-typed,
  editor-agnostic (LSP-shaped) intelligence stack** (TS `.d.ts` + YAML
  schemas + the custom platform-semantic service); client-instant +
  server-authoritative validation; the save → `reload` / holodeck loop;
  lease-scoped tree.
- **Content editors (room & zone, first worked)** on three reusable pieces —
  the **widget registry**, the **defaults-aware field surface** (flat
  templates, *no inheritance*; effective + source + local-override over
  class/zone/biome resolution), and the **reference-picker**. **Room editor**
  = defaults-aware form + detail-tree + exits + contents widgets. **Zone
  editor** = the map (layout / room-birth / zone-carried-defaults + bulk /
  graph-validation / the draft-changeset unit); its map is **2D**
  (per-floor grid + node-graph, the shared mini-map), shipped v1 on a
  **list/connectivity fallback** — not a v1 blocker. Room ↔ zone = node vs
  map, one dataset.
- **Composition & the combo catalog** — content editors are the Standard
  Model made editable, split by tier: **code editor composes mixins into a
  class (+ writes logic), scaffolding the boilerplate** (the real "editors
  generate code"; static composition, no class-less templates); **content
  editor instantiates a class + fills fields**, reading the class's effective
  mixin set to render fields (Weapon ≡ Weaponable(Thing) to the editor). A
  **combo catalog** of named compounds (`Weapon` = a thin composition-class)
  grows from authoring via **name-it / use-existing prompts** (capture +
  dedup), organized in a **hierarchy** — the archetype roster, grown
  organically; behavior stays in mixins. Backed by the
  authoring-intelligence's **two catalogs** (mixin particles + named
  compounds).
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
