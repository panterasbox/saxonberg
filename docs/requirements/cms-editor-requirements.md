# CMS shell & code editor — requirements

The first build of the **CMS / content-authoring tools**: a working
**author → save → live** loop over the content the game already runs on.
It delivers the CMS as a surface of the existing client SPA — a unified
**explorer** over the two trees (Mongo-backed templates + the source
filesystem), a lazy-loaded **Monaco** code editor, and a **save** that
validates server-side, persists to the right backend, and **hot-reloads**
into the live world. It is the "start with the code editor" front half of
[`cms-slate.md`](../slates/builds/cms-slate.md), cut down to what builds
cleanly against the **backend that already exists** (`SourceTreeApi`,
`TemplateApi`, `HotReloadApi`, `AccessApi`) — deferring the lease model,
holodeck, versioning, git, the LSP, content editors, and the law==code
review gate to the builds that own them.

The transport, by contrast, is built **forward-looking** (not a throwaway):
a real REST data API + a WS live channel + the session→`runRoot`
attribution bridge, per the slate. The principle that keeps the new surface
safe: **any transport is just another entry path to the same gated core
op** — a REST endpoint adds no new authorization surface; it binds the same
`can()`-gated operation the command path does.

## Goals

- **The CMS is a surface of the same SPA, one session.** A developer opens
  the CMS in its own browser tab; it shares the express session with the
  game tab (no second login). Basic surface-sharing only — true cross-tab
  *live state sync* is a non-goal (below).
- **One explorer over both trees.** A single browsable tree presents the
  **content** tree (templates, via `TemplateApi`) and the **source** tree
  (files, via `SourceTreeApi`) under one navigation model, mirroring the
  existing dual-tree workspace.
- **Open and edit in Monaco.** Selecting a leaf loads its content into a
  **lazy-loaded** Monaco editor — a template's `data` (JSON/YAML) or a
  source file's raw bytes — with stock TS/JSON/YAML language support.
- **Save is authoritative and goes live.** A save round-trips through the
  server: **re-validate → persist** (to `TemplateApi` for a template,
  `SourceTreeApi` for a file) **→ `HotReloadApi.reload`** so the change is
  observable in the running world (the game tab) without a restart.
- **A structured `CmsApi` surface.** A thin, gated `CmsApi` (forwarding to
  the existing Apis) exposes the GUI-shaped operations the explorer/editor
  need — `listTree` / `read` / `write` / `stat` returning structured data,
  distinct from the human-text `ls`/`cat` shell verbs.
- **Forward-looking transport.** CMS data rides a **REST** API (reads +
  gated writes) reusing the express session; live bits ride **WS**; every
  non-command entry pays the **session→`runRoot` attribution bridge** so
  mutations are attributable, `can()` resolves, and events fire with
  provenance.
- **Writes are gated by the existing access model.** Source writes require
  `AccessApi.isDeveloper`; template writes honor `AccessApi.can(giver,
  'write', resource)` / `canMutateZone`. The CMS is **developer-tier** in
  this build.

## Non-goals

Each lands in the build that owns it; none is in scope here.

- **The full lease model + group-managed content.** Lease-scoped trees
  (you see/edit only your scopes) and a worked **group-managed** content
  example (the **lounge** or **EU** as the eventual exemplar) → the
  **access slate** ([`access-slate.md`](../slates/tails/access-slate.md)).
  Deferred deliberately: the world is effectively single-user (self) today,
  and the dev-tier gate suffices until there are authors to scope.
- **The holodeck (author → test sandbox).** → access slate. The
  save→`reload` loop is the author→test feedback for now.
- **Versioning / history.** No op-log (`domain_history`), no revision log,
  no history UI, no diff view. **This build writes HEAD directly** (as the
  `write` verb does today). → access slate (template op-log) and the later
  revision/changeset model.
- **Git.** No `status`/`diff`/`commit`, no `GitApi` harness, no
  external-editor push/validate-on-push. The source-agnostic review spine
  (below) supersedes git as the *workflow*; **GitLab integration becomes a
  future runtime integration**, not part of authoring. → later.
- **The law==code / forums-review publish gate.** The change-centric review
  surface riding the forums argument-map (see the slate's *The review gate*
  section) → later wave; it gates *publish*, which presupposes the
  changeset model not built here.
- **Drafts / staging / changeset overlay + atomic whole-set publish.** →
  later (depends on the versioning/changeset model).
- **Engine-typed IntelliSense, the LSP, the VS Code extension.** Monaco
  ships with **stock** language support only; the engine `.d.ts` feed and
  the editor-agnostic intelligence →
  [`authoring-intelligence-slate.md`](../slates/builds/authoring-intelligence-slate.md).
- **Content editors (room/zone, schema-driven forms).** The everyone-tier
  data surface → Wave 3 of the slate.
- **Cross-tab *live state* sync** (SharedWorker / BroadcastChannel). The
  tabs share a session but do not yet push live state to each other.

## Surface decisions

### Transport — REST data + WS live + the attribution bridge

CMS data (tree / template / file reads, gated writes) is served over
**REST** reusing express-session; live concerns ride **WS**. **No GraphQL**
(an open-query graph fights the lease-gated, coarse-named-op model; REST
endpoints map 1:1 to gated core ops). Chosen forward-looking rather than
riding the existing WS command bus as a throwaway, on the user's call to
build the real architecture now. **Cost accepted:** a second surface, CSRF
on HTTP writes, dual-channel coherence — all worth it to avoid transport
rework.

**The attribution bridge is mandatory.** A REST (or WS-data) request
arrives outside the command pipeline, so it lacks the execution root the
command path establishes. Before any handler touches game state it must run
inside a **single reusable "run-as-session-player" wrapper** that seeds the
session user as subject and runs in `ExecutionContextApi.runRoot` — the
same pattern `ScheduleApi` uses for timer callbacks. Built once, reused by
every CMS endpoint.

### Editor — Monaco, lazy-loaded

Monaco, **lazy-loaded** so only the code-editor surface pays the bundle.
Stock TS / JSON / YAML language support in this build; the engine-typed
`.d.ts` IntelliSense is a fast-follow once the intelligence layer exists.
Themed via the client's existing `tokens`.

### Surface — a route of the same SPA

The CMS is a route/surface of the existing client SPA sharing one session,
openable in its own tab. Basic surface-sharing only; live cross-tab sync
deferred.

### The `CmsApi` — structured surface over the existing Apis

A new **`CmsApi`** (`mud/api/cms.ts`) → **`CmsLogic`**
(`mud/obj/api/CmsLogic.ts`) holds the unified-tree projection and the
read/write dispatch across the two backends, **forwarding** to
`SourceTreeApi` / `TemplateApi` / `AccessApi` / `HotReloadApi`. It does not
reimplement them. The REST handlers (backend transport layer) call `CmsApi`
methods 1:1; `CmsApi` is the gated core-op surface.

### Gating — current `AccessApi`, developer-tier

Source ops gated by `isDeveloper`; template ops by `can()` /
`canMutateZone`. No lease model. The CMS is developer-only until the access
slate lands scoping.

### Storage model — storage-agnostic (decision A), no versioning yet

The forward review/versioning model is **storage-agnostic** (git = code
backend, Mongo + op-log = template backend, one uniform workflow over both
— decision **A**, not single-storage). **This build builds none of that
versioning** — it writes HEAD directly. The decision is recorded as a
forward constraint so later work doesn't entangle the review model with a
specific store.

## Constraints

- **Module taxonomy holds.** `CmsApi` (thin gated forwarding shell, ends
  with `SecurityApi.decorateApiClass`) + `CmsLogic` (`@internal` logic
  singleton at `/obj/api/cms`, methods gated `FromModule('mud/api/cms#CmsApi')`).
  No free-floating helpers; the cross-backend dispatch is `CmsLogic`'s, not
  scattered into backend handlers. REST routes live in `backend/`, like the
  existing inbound handlers.
- **Same-gated-op invariant.** The REST surface must **bind the same gated
  core ops** as any other entry path — never a parallel reimplementation.
  Adding REST adds no new authorization surface.
- **Server is authoritative on save.** Client-side editor validation is
  advisory UX; the server re-validates (the existing `TemplateApi` /
  `DomainHook` folder-leaf + reserved-path checks; `SourceTreeApi` sandbox)
  and that is the truth.
- **Reuse, don't duplicate.** `SourceTreeApi`, `TemplateApi`,
  `HotReloadApi`, `AccessApi` exist and are complete for this scope; the
  build composes them.
- **Privacy conventions** per `CLAUDE.md`: `backend/` + `mud/api/` default
  to `#`; the `CmsLogic` singleton follows the logic-singleton conventions.
- **No new module categories** without sign-off. If a piece doesn't fit the
  taxonomy, stop and raise it.

## Acceptance criteria

- A developer can open the CMS surface in the SPA (own tab) on the existing
  session, no second login.
- The explorer lists both trees; expanding a folder lists its children
  (templates and source files) under one model.
- Opening a template loads its `data` into Monaco (JSON/YAML); opening a
  source file loads its raw bytes. Monaco is observably **lazy-loaded**
  (loads only on entering the editor).
- Editing and saving a **template** persists via `TemplateApi` (validated;
  folder-leaf + reserved-path checks fire) and the change is reflected in
  the running world via `HotReloadApi.reload`.
- Editing and saving a **source file** persists via `SourceTreeApi`
  (sandbox-enforced) and reloads.
- A **non-developer** is denied source writes; template writes are denied
  where `can()` / `canMutateZone` denies. Gate denials surface as errors,
  not silent no-ops.
- Every CMS read/write flows over the REST data API and through the
  **attribution bridge**: a REST mutation is attributed to the session
  player (an event fired during the op carries that provenance; `can()`
  resolves the acting subject).
- **Tests cover:** `CmsApi` `listTree` / `read` / `write` (both backends);
  the run-as-session-player attribution wrapper; the access gate
  (developer vs non-developer write); the save→reload path.
- **Subsystem doc `docs/subsystems/cms.md` exists**, describing the CMS
  surface, the REST data API + WS split, the attribution bridge, the
  `CmsApi`/`CmsLogic` surface, and the explicit deferral boundary to the
  access / authoring-intelligence slates.

## Cross-references

- **Seeding slate:** [`cms-slate.md`](../slates/builds/cms-slate.md)
  (Wave 1; this build is its first cut).
- **Consumed-later backends:**
  [`access-slate.md`](../slates/tails/access-slate.md) (lease model,
  holodeck, op-log versioning),
  [`authoring-intelligence-slate.md`](../slates/builds/authoring-intelligence-slate.md)
  (LSP / engine-typed intelligence).
- **Subsystem docs:**
  [`shell-workspace.md`](../subsystems/shell-workspace.md),
  [`shell-author.md`](../subsystems/shell-author.md),
  [`templates.md`](../subsystems/templates.md),
  [`hot-reload.md`](../subsystems/hot-reload.md),
  [`access.md`](../subsystems/access.md),
  [`response-envelope.md`](../subsystems/response-envelope.md),
  [`mql-subscription.md`](../subsystems/mql-subscription.md),
  [`client-shell.md`](../subsystems/client-shell.md).
- **Forward (later waves, in the slate):** the law==code / forums-review
  publish gate (slate *The review gate* section);
  [`forums.md`](../subsystems/forums.md).
