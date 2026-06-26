# CMS shell & code editor — implementation plan

> **Scope source of truth:** [`docs/requirements/cms-editor-requirements.md`](../requirements/cms-editor-requirements.md). This plan implements exactly that closed scope and defers everything its Non-goals list defers. Read the requirements first; this plan does not re-justify scope decisions, only how to build them.

## 0. Orientation — what already exists (do not rebuild)

The build *composes* four complete Apis. Verified signatures (read them before coding; do not re-derive):

- **`SourceTreeApi`** (`mud/api/source-tree.ts`) — sandboxed FS over `packages/`. Key methods: `getSandboxRoot()`, `resolvePath(cwd, input, {home?})` (sandboxed → absolute OS path, throws `SourceTreeSandboxError` on escape), `joinLogical(cwd, input, {home?})` (virtual path arithmetic, no sandbox), `toDisplayPath(abs)`, `exists/isFile/isDir(abs)`, `read(abs): Promise<string>`, `list(abs): Promise<DirEntry[]>` (`DirEntry = {name, absolutePath, isFile, isDir}`), `write(abs, content)`.
- **`TemplateApi`** (`mud/api/template.ts`) + `Template` (`mud/lib/stuff/Template.ts`) — `Template` is a `Document` in the `domain` collection with fields `{path, class, hydratorClass?, data}`. Statics: `Template.findByPath(path)`, `Template.findDescendants(basePath)` (strict descendants), `Template.ancestorPaths(path)`. `TemplateApi.saveTemplate(path, classPath, data, hydratorClassPath?)` upserts and fires the `DomainHook` folder/leaf + reserved-path validators at the PM chokepoint. `TemplateApi.restoreFromTemplate(stuff)` re-hydrates a live Stuff from its current template.
- **`HotReloadApi`** (`mud/api/hot-reload.ts`) — `reload(path)` where **`path` is always an absolute filesystem path** (it `readFile`s + cache-bust-imports). Templates are NOT filesystem files; see §4 for the template-vs-source go-live split.
- **`AccessApi`** (`mud/api/access.ts`) — `can(subject, action, resource)`, `canMutateZone(subject, zone)`, `isDeveloper(subject)`, `resolveSourceFolderZone(sourcePath)`. **Subject is passed explicitly.** Null subject / non-Avatar fails closed.

**The exact gating recipe to mirror** lives in `mud/obj/command/shell/WriteController.ts` — `_gateContentWrite` (live Zone → `canMutateZone`, else `can(giver,'write',liveAtTarget)`) and `_gateSourceWrite` (`isDeveloper` AND `can(giver,'write',resolveSourceFolderZone(path))`). `CmsLogic` reproduces this gating verbatim — same predicates, same order — so REST adds no new authz surface.

**The Api↔logic-singleton template** to copy structurally: `mud/api/source-tree.ts` + `mud/obj/api/SourceTreeLogic.ts` (thin forwarding shell via `logic()` helper + `StuffApi.singletonSync`; `@internal` `extends Idea`; per-method `@CallSecurity(FromModule(...))`; ends with `SecurityApi.decorateApiClass`).

**The attribution-bridge model:** `ExecutionContextApi.runRoot(target, method, fn)` plants a `caller=null` Root frame; `backend/**` is on the `_frameMutatorAllowlist`. `ScheduleApi.planRun` is the precedent for *wrapping work in `runRoot` + stamping frame metadata* (it re-plants `causingCommandId`). The CMS bridge is the same shape but seeds the **session Avatar as subject**.

---

## 1. Phasing (each phase is one landable commit on branch `cms-editor`)

| Phase | Commit | Deliverable |
|---|---|---|
| **P1** | `feat(cms): CmsApi + CmsLogic unified-tree surface` | `mud/api/cms.ts`, `mud/obj/api/CmsLogic.ts`, wire types in `@saxonberg/types`, unit tests (both backends + gate). |
| **P2** | `feat(cms): REST data API + session→runRoot attribution bridge` | `backend/CmsRoutes.ts`, `backend/CmsSession.ts` (the bridge), CSRF on writes, wired into `Server.setupRoutes`. Tests for the bridge + routes. |
| **P3** | `feat(cms): client CMS surface — shell + explorer` | New surface, `CmsView`, explorer tree, store slice, REST client. |
| **P4** | `feat(cms): Monaco editor + save→reload loop` | Lazy-loaded Monaco wrapper, editor pane, save flow, dirty/error UX. |
| **P5** | `docs(cms): cms subsystem doc` | `docs/subsystems/cms.md`. |

P1 is fully testable headless. P2 depends on P1. P3/P4 are client-only and depend on P2's wire contract (frozen at end of P1 in `@saxonberg/types`). P5 is authored last when the truth is settled.

---

## 2. Phase 1 — `CmsApi` + `CmsLogic` (the gated structured surface)

### 2.1 The unified-tree projection model

Two backends, one navigation model. The projection rule:

- A **node ref** is `{ backend: 'content' | 'source'; path: string }`. `path` is the canonical identifier *within that backend*: a template path (`/obj/Avatar/foo`) for content, a sandbox display path (`/server/src/mud/...`) for source. Paths are backend-local; **there is no merged namespace** — the unified-ness is that one `CmsApi`/one explorer drives both, discriminated by `backend`.
- **Root listing** (`listTree({backend:'content', path:'/'})` and `{backend:'source', path:'/'}`) are listed independently. The client explorer shows two top-level roots ("content" / "source"), mirroring the existing dual-tree workspace. *No synthetic merged root node* — that would invent a namespace the backends don't share and complicate write-dispatch. (Decision, flagged in §9.)
- A **leaf** in content = a non-Zone template (carries editable `data`); a **folder** = a Zone template (has descendants, no editable body). In source: leaf = file, folder = directory.

### 2.2 Wire types — live in `@saxonberg/types`

Add a new section to `packages/types/src/index.ts` (the package is a single `index.ts`; append a commented section header matching the file's convention):

```ts
// ============================================================================
// CMS data surface (REST: explorer tree + read/write/stat)
// ============================================================================

export type CmsBackend = "content" | "source";
export type CmsNodeKind = "folder" | "leaf";

/** One entry in a directory/folder listing. */
export interface CmsTreeEntry {
  backend: CmsBackend;
  path: string;        // backend-local canonical path
  name: string;        // last segment, for display
  kind: CmsNodeKind;
}

/** Result of listTree — the children of one node. */
export interface CmsTreeListing {
  backend: CmsBackend;
  path: string;        // the listed node
  entries: CmsTreeEntry[];
}

/** Result of read — the editable body of one leaf. */
export interface CmsReadResult {
  backend: CmsBackend;
  path: string;
  kind: CmsNodeKind;       // always 'leaf' on success
  /** Content: pretty-printed JSON of template.data. Source: raw file bytes. */
  body: string;
  /** Editor language hint: 'json' | 'typescript' | 'yaml' | 'plaintext'. */
  language: string;
  /** Content-only: the template's backing class + hydrator, echoed back so
   *  write can round-trip them unchanged. Absent for source. */
  templateMeta?: { class: string; hydratorClass?: string };
}

/** stat — lightweight existence/kind probe (no body). */
export interface CmsStatResult {
  backend: CmsBackend;
  path: string;
  exists: boolean;
  kind?: CmsNodeKind;
}

/** write request body (REST POST). */
export interface CmsWriteRequest {
  backend: CmsBackend;
  path: string;
  body: string;            // JSON (content) | raw bytes (source)
}

/** write result — what went live. */
export interface CmsWriteResult {
  backend: CmsBackend;
  path: string;
  reloaded: boolean;       // did the go-live step run
  reloadDetail?: string;   // human note, e.g. "re-hydrated 1 live instance"
}

/** Uniform error body for the REST surface. */
export interface CmsErrorBody {
  error: string;           // machine code: 'denied' | 'not-found' | 'invalid' | 'sandbox' | 'internal'
  message: string;         // human detail
}
```

These are the **only** new wire types; they are frozen at end of P1 so the client can build against them.

### 2.3 `CmsLogic` (`mud/obj/api/CmsLogic.ts`)

`@internal`, `extends Idea`, `@Unshadowable`, every public method `@CallSecurity(FromModule('mud/api/cms#CmsApi'))`. Stateless. **All cross-backend dispatch lives here** — never in REST handlers (constraint: "the cross-backend dispatch is `CmsLogic`'s").

Every method takes `actor: Stuff | null` as its **first** parameter (the resolved session Avatar from the bridge) — that's the `subject` threaded into `AccessApi`. Mirror `WriteController`'s private gate helpers as module-private free functions (no intra-singleton self-calls — same pattern as `SourceTreeLogic`'s `sandboxRoot()`).

Method surface:

```ts
// reads
listTree(actor, backend, path): Promise<CmsTreeListing>
read(actor, backend, path): Promise<CmsReadResult>
stat(actor, backend, path): Promise<CmsStatResult>
// write (gated + go-live)
write(actor, backend, path, body): Promise<CmsWriteResult>
```

**`listTree` dispatch:**
- `content`: `Template.findDescendants(path)` then keep only *immediate* children (filter `descendant.path` whose remainder after `path + '/'` has no further `/`). Kind = folder if the child's `class` is a Zone class (`ZoneApi.isFolderClass(child.class)`), else leaf. Root `/`: descendants of `/`. Reads are **not** access-gated in this build (developer-tier surface; the whole CMS is dev-gated at the surface — see §6 decision), but writes are.
- `source`: `SourceTreeApi.resolvePath('/', path, {home:'/'})` → `SourceTreeApi.list(abs)` → map `DirEntry` to `CmsTreeEntry` via `SourceTreeApi.toDisplayPath`. Folder = `isDir`, leaf = `isFile`.

**`read` dispatch:**
- `content`: `Template.findByPath(path)`; 404 if absent. If Zone class → it's a folder, return error `invalid` ("folders have no editable body; list it"). Else `body = JSON.stringify(tpl.data, null, 2)`, `language = 'json'`, `templateMeta = {class: tpl.class, hydratorClass: tpl.hydratorClass}`.
- `source`: `resolvePath` (catch `SourceTreeSandboxError` → error `sandbox`); if `isDir` → folder error; else `body = SourceTreeApi.read(abs)`, `language` from extension (`.ts/.tsx → typescript`, `.json → json`, `.yaml/.yml → yaml`, else `plaintext`).

**`write` dispatch (the crux of save-is-authoritative):**
- `content`:
  1. Parse `body` as JSON → `data: Record<string,unknown>`; parse failure → error `invalid`.
  2. Resolve existing template (to recover `class` + `hydratorClass`; **write preserves the backing class** — this build edits `data`, not class/hydrator, since the editor only edits the data body). If no existing template → error `not-found` (creating new templates via REST is out of scope; the explorer only edits existing leaves).
  3. **Gate** (mirror `_gateContentWrite`): live-at-path Zone → `canMutateZone(actor, liveZone)`; else `can(actor, 'write', StuffApi.findByTemplatePath(path) ?? null)`. Deny → throw a typed `CmsError` carrying `'denied'`.
  4. `TemplateApi.saveTemplate(path, existing.class, data, existing.hydratorClass)` — server re-validates (folder/leaf + reserved-path + singleton-container hooks fire here; that is the authoritative validation).
  5. **Go-live:** re-hydrate every live clone of this template — `StuffApi.findByTemplatePath(path)` and, if present, `await TemplateApi.restoreFromTemplate(live)`. `reloadDetail = "re-hydrated N live instance(s)"`. (See §4 for why this — not `HotReloadApi.reload` — is the content go-live.)
- `source`:
  1. **Gate** (mirror `_gateSourceWrite`): `isDeveloper(actor)` AND `can(actor, 'write', resolveSourceFolderZone(sourceLogicalPath))`. Deny → `CmsError`.
  2. `abs = SourceTreeApi.resolvePath('/', path, {home:'/'})` (catch sandbox → error `sandbox`).
  3. `SourceTreeApi.write(abs, body)`.
  4. **Go-live:** `await HotReloadApi.reload(abs)` (filesystem path — correct here). `reloaded=true`, `reloadDetail = "reloaded module"`. If reload throws (compile error), the file is written but not live: return `reloaded:false`, `reloadDetail = err.message` — the save persisted, the reload failed, surface both (don't 500).

**`stat`:** content → `findByPath` presence + kind; source → `exists`/`isDir`/`isFile`.

**Errors — RESOLVED (no new `lib/cms/` dir).** Define **one** `CmsError extends Error` with a `code: 'denied' | 'not-found' | 'invalid'` field, **exported from `mud/api/cms.ts` itself** (the Api file speaks the error its surface throws — a class export, allowed by export discipline; the `api/*.ts` no-restricted-syntax rule restricts exported *functions*, not classes). `CmsLogic` imports `CmsError` from `mud/api/cms.ts` (one-directional: `api/cms.ts` resolves `CmsLogic` at runtime via `StuffApi.singletonSync`, never statically, so there's no import cycle). `backend/CmsRoutes.ts` catches `CmsError` and maps `code` → HTTP status. Sandbox stays the **existing** `SourceTreeSandboxError`. No new module, no new directory — collapses denied/not-found/invalid into one home-with-the-surface error class, keeping the happy-path return shapes clean.

### 2.4 `CmsApi` (`mud/api/cms.ts`)

Structural copy of `source-tree.ts`: `LOGIC_PATH = '/obj/api/cms'`, `logic()` helper via `StuffApi.singletonSync` + `HotReloadApi.getCurrentExport(LOGIC_CLASS_FILE, 'CmsLogic')`. Static methods forward 1:1 to `logic()`. Re-export `CmsError` and the wire types it speaks (per re-export discipline). End with `SecurityApi.decorateApiClass(CmsApi)`.

```ts
export class CmsApi {
  static listTree(actor, backend, path): Promise<CmsTreeListing>
  static read(actor, backend, path): Promise<CmsReadResult>
  static stat(actor, backend, path): Promise<CmsStatResult>
  static write(actor, backend, path, body): Promise<CmsWriteResult>
}
```

### 2.5 P1 tests (`mud/api/__tests__/cms.test.ts`)

Model on `source-tree.test.ts` + `access.test.ts`. Use a temp dir under the sandbox root for source ops; seed in-memory templates via `TemplateApi.saveTemplate` for content ops (the existing `template.test.ts` shows the PM-backed pattern). Cases:
- `listTree` content: seeded `/cmstest` Zone + child leaves → returns immediate children with correct kinds.
- `listTree` source: temp dir with files+subdir → correct entries.
- `read` content leaf → JSON body + `templateMeta`; folder → error.
- `read` source file → raw body + language; missing → not-found; `..` escape → sandbox error.
- `write` content (developer actor) → template `data` updated, `restoreFromTemplate` go-live invoked on a live clone (assert the clone's field changed).
- `write` source (developer actor) → file bytes written; assert `HotReloadApi.reload` called (spy) and `reloaded:true`.
- **gate:** non-developer actor → source write throws `CmsError`; content write where `can()` denies → throws. (Drive the deny path by seeding `AccessRegistry` like `access.test.ts`, or assert the `actor=null` fail-closed path.)
- `FromModule` gate: calling `CmsLogic` directly (not via `CmsApi`) throws `SecurityError` (copy `source-tree.test.ts`'s direct-call assertion).

---

## 3. Phase 2 — REST data API + the attribution bridge

### 3.1 The attribution bridge — `backend/CmsSession.ts`

This is the single reusable "run-as-session-player" wrapper. It lives in `backend/` (only `backend/**` may push frames; the REST layer is transport like the inbound handlers). It is **not** an Api class (it's transport plumbing, like `inbound/*.ts` handlers and `Application`); it exports one async function — sanctioned because `backend/**` → mudlib DI seams are a recognized export category, but to stay clean, model it as a small class with one static method `CmsSession.runAsSessionPlayer(...)` mirroring how `Application`/`Backend` expose behavior (avoids a free-floating export entirely).

```ts
// backend/CmsSession.ts
import type { Request } from 'express';
import { ExecutionContextApi } from '../mud/api/execution-context';
import { PlayerApi } from '../mud/api/player';
import type Avatar from '../mud/obj/Avatar';
import { Backend } from './Backend';

export class CmsSession {
  private constructor() {}

  /**
   * Resolve the session's acting Avatar and run `fn(actor)` inside a
   * runRoot frame so call-security gates resolve and any event fired
   * during the op is attributable to the session player.
   * Returns null actor when no in-world Avatar is loaded for the session.
   */
  static async runAsSessionPlayer<T>(
    req: Request,
    method: string,
    fn: (actor: Avatar | null) => Promise<T>,
  ): Promise<T> {
    const userId =
      (req.session as { passport?: { user?: { id?: string } } })
        .passport?.user?.id ?? null;
    // Resolve THE acting avatar for this session. v1: a session has at
    // most one in-world Avatar loaded (multiplexing aside); pick the
    // first registered avatar owned by this user.
    const actor = userId ? resolveAvatarForUser(userId) : null;
    return ExecutionContextApi.runRoot(Backend, method, () => fn(actor));
  }
}
```

**Avatar resolution detail.** `PlayerApi.findAvatarByPlayerId(playerId)` needs a playerId, but the session carries a *userId*. A `User` owns `playerIds[]`. v1 resolution: load the `User`, take its in-world Avatar via `PlayerApi.findAvatarByPlayerId(user.playerIds[0])` (the registered, already-loaded Avatar from the game tab's session). If none is loaded (CMS tab open but no game tab in-world), `actor = null`. Then:
- For **reads**: `actor=null` is fine (reads aren't gated this build).
- For **writes**: `actor=null` → `AccessApi` fails closed → `CmsError('denied')` → 403. This is the correct behavior: you must be in-world (have a live developer Avatar) to author. (Flagged §9: this couples "can author" to "has a live Avatar in the session." Acceptable for dev-tier; the alternative — cloning an Avatar on demand for a CMS-only session — is out of scope.)

`runRoot(Backend, method, fn)` gives the well-defined Root so every downstream `@CallSecurity` resolves, exactly as `Backend.processUserMessage` does for WS. Because the actor is threaded as `subject` into `AccessApi.can`, `can()` resolves the acting subject; because the op runs inside the frame, any `EventApi.emit` during e.g. `restoreFromTemplate` carries provenance through the standard frame-attribution path (same mechanism `ScheduleApi` relies on).

### 3.2 REST routes — `backend/CmsRoutes.ts`

A class with a static `setup(app, requireAuth)` mirroring `AuthRoutes.setup`. Mounted in `Server.setupRoutes()` **after** session/passport middleware and before the SPA catch-all. All routes require an authenticated session (reuse a small `requireAuth` guard: 401 if `!req.isAuthenticated()`).

> **Anon read-only — DEFERRED (seam noted, not built).** This build keeps **all** routes auth-required. Anon read-only is a trivial later toggle (drop `requireAuth` from the GET routes; the bridge already yields `actor=null` → reads work, writes fail closed), **but** ungated reads would expose the raw **source** tree publicly. When wanted, scope anon-read to the **content tree only** (`backend==='content'`), never source. Not in scope here.

Each route binds 1:1 to a `CmsApi` op; **no authz lives in the route** — it only validates payload shape, calls the bridge, maps `CmsError`/sandbox/not-found to status codes.

| Method | Path | Binds | Req | Resp (200) |
|---|---|---|---|---|
| `GET` | `/api/cms/tree?backend=&path=` | `CmsApi.listTree` | query params | `CmsTreeListing` |
| `GET` | `/api/cms/read?backend=&path=` | `CmsApi.read` | query params | `CmsReadResult` |
| `GET` | `/api/cms/stat?backend=&path=` | `CmsApi.stat` | query params | `CmsStatResult` |
| `POST` | `/api/cms/write` | `CmsApi.write` | `CmsWriteRequest` (JSON body) + CSRF header | `CmsWriteResult` |

Handler skeleton (read):
```ts
app.get('/api/cms/tree', requireAuth, async (req, res) => {
  const backend = req.query.backend as CmsBackend;
  const path = String(req.query.path ?? '/');
  if (backend !== 'content' && backend !== 'source')
    return res.status(400).json({ error: 'invalid', message: 'bad backend' });
  try {
    const out = await CmsSession.runAsSessionPlayer(req, 'cms.listTree',
      (actor) => CmsApi.listTree(actor, backend, path));
    res.json(out);
  } catch (e) { sendCmsError(res, e); }
});
```

`sendCmsError` maps: `CmsError → 403 {error:'denied'}`; `SourceTreeSandboxError → 400 {error:'sandbox'}`; an error tagged not-found → 404; JSON-parse/invalid → 400; else 500 `{error:'internal'}`. (Implement the not-found/invalid tagging by having `CmsLogic` throw small named errors OR return discriminated results; recommendation: **throw** named errors consistent with `CmsError`, keeping return types as the success shapes — re-evaluate during P1, but freeze the choice before P2.)

### 3.3 CSRF on writes

The session cookie is `sameSite:'lax'`, which blocks cross-site POST cookies from forms but **not** all CSRF vectors, and the requirements explicitly call for CSRF on writes. Minimal, dependency-free double-submit token:
- Add `GET /api/cms/csrf` (auth-required) → mints a random token, stores it in `req.session.cmsCsrf`, returns `{token}`.
- `POST /api/cms/write` requires header `X-CMS-CSRF` equal to `req.session.cmsCsrf`; mismatch → 403 `{error:'denied', message:'csrf'}`.
- Client fetches the token once on entering the CMS surface and sends it on every write.

(No new dependency; reuses express-session storage. Flagged §9: if the repo later standardizes on a CSRF lib, swap here — the seam is one route + one header.)

### 3.4 Wiring

In `Server.setupRoutes()`, after `setupMiddleware()` has run, add `CmsRoutes.setup(this.app)`. Because `setupRoutes` runs after `setupMiddleware`, session + passport are live. Routes register before the `app.get('*')` SPA fallback so they match first (same ordering the comment in `Server.ts` already relies on).

### 3.5 P2 tests

- `backend/__tests__/CmsSession.test.ts` — the bridge: with a seeded session userId + a registered developer Avatar, `runAsSessionPlayer` resolves the right `actor` and runs inside a Root frame (assert `ExecutionContextApi.getCallStack()` has a Root inside `fn`); with no avatar, `actor=null`. Model on `Application.providers.test.ts` for session/user seeding.
- `backend/__tests__/CmsRoutes.test.ts` — supertest against `server.getApp()` (the existing tests use the Express app). Authenticated read returns a listing; unauthenticated → 401; write without CSRF → 403; write with a non-developer session → 403 (the **same gated op** denies — the assertion that proves "no parallel authz"); write with developer session → 200 + `reloaded`.

---

## 4. The save→go-live split (template vs source) — the one real ambiguity

The requirements say "save → … → `HotReloadApi.reload`". But `HotReloadApi.reload(path)` reads a **filesystem path** and cache-bust-imports it. **Templates are Mongo docs, not files** — `reload` cannot apply to a `/obj/Avatar/foo` template path. The correct, behavior-equivalent go-live per backend:

- **Source file save → `HotReloadApi.reload(absPath)`** (literal; the file is on disk). New clones pick up the new class. This *is* what the requirement names.
- **Template save → re-hydrate live instances via `TemplateApi.restoreFromTemplate`.** `saveTemplate` persists the new `data`; live clones already hold the old field values, so we re-hydrate each live instance at the path so the change is "observable in the running world." This is the template analogue of reload and is exactly what the hot-reload subsystem doc describes for the "byTemplatePath index is the registry; dest + re-create" model (here: re-hydrate, since we're changing `data`, not the class).

This is surfaced (not silently chosen) in §9 and must be written into `cms.md`. Acceptance criterion "the change is reflected in the running world via `HotReloadApi.reload`" is satisfied literally for source and by the correct mechanism for content.

---

## 5. The WS live channel — explicitly minimal/deferred

The requirements keep **cross-tab live-state sync a non-goal** ("tabs share a session but do not yet push live state to each other"). Therefore:

- **This build adds NO new WS message type.** CMS reads and writes ride **REST only**. The "WS live channel" the slate envisions is scoped to *nothing new in this build*.
- The existing WS connection from the game tab is untouched; the CMS tab does not open a WS connection at all (it's REST-only). A developer who has the game tab open *will* observe the effect of a content save there, because `restoreFromTemplate`/`reload` mutate the live world the game tab already renders via its existing MQL subscriptions — that is the "author → save → live" loop, achieved without any CMS-specific WS.
- **Deferred to the access slate / a later build (state explicitly in `cms.md`):** a CMS-tab WS channel pushing live tree/file deltas, cross-tab broadcast of "someone edited X," and any SharedWorker/BroadcastChannel coherence. The plan reserves the *REST 1:1-to-gated-op* shape so a future `cms-delta` WS frame can bind the same `CmsApi` ops without rework.

This keeps the dual-channel cost the requirements accept (REST + WS) to its minimum honest form in this build: REST for CMS data, the pre-existing WS for the game tab.

---

## 6. Gating — server-authoritative, where each check fires

| Concern | Where | Check |
|---|---|---|
| Surface is developer-tier | REST `requireAuth` + write gates | Reads need auth; writes need a developer Avatar. The *whole CMS surface* is dev-tier: the client only shows the CMS entry point when the session player is a developer (UX only — see below), but the server is the truth. |
| Source write | `CmsLogic.write` (source) | `isDeveloper(actor)` AND `can(actor,'write',resolveSourceFolderZone(path))` — verbatim from `WriteController._gateSourceWrite`. |
| Template write | `CmsLogic.write` (content) | live Zone → `canMutateZone(actor,zone)`; else `can(actor,'write',liveAtPath)` — verbatim from `_gateContentWrite`. |
| Denial surfacing | REST → client | `CmsError` → HTTP 403 `{error:'denied',message}`; client renders an inline error toast/banner on the editor, **never a silent no-op** (acceptance criterion). |

**Client-side developer-tier hint (UX only, non-authoritative):** the server `/auth/status` response (and/or the in-world `system.connection.established` payload) does not currently carry an `isDeveloper` flag. Add an `isDeveloper` boolean to the auth/status `player` payload (server reads `AccessApi.isDeveloper` for the session's avatar) so the client can hide the CMS launcher for non-developers. This is purely to avoid showing a dead surface; the REST gates remain the authority. (Flagged §9 — small server-side addition to `AuthRoutes`/the connection-established payload.)

---

## 7. Phase 3 + 4 — the client surface

### 7.1 Surface placement

The CMS opens **in its own browser tab** sharing the session (requirement). Two pieces:
- **Launcher:** in the in-world cockpit chrome (the `Frame`/`AccountMenu` area), add a "CMS" link/button visible only when `auth.player?.isDeveloper`. It opens the CMS route in a new tab (`window.open('/?surface=cms')` or a dedicated path).
- **Route/surface switch:** the SPA has no router; it switches on `connectionPhase` and `mainView`. Add the CMS as a top-level surface gated by a URL query (`?surface=cms`) read at startup, OR add `mainView: "cms"` and a launcher tab. **Recommended:** read `?surface=cms` once in `App.tsx`; when present and authenticated, render `<CmsSurface/>` as a full-screen takeover (its own tab), bypassing the cockpit. This keeps the CMS isolated (own tab, own layout) and avoids entangling it with the in-world `mainView` switch. The CMS tab does NOT open a WS connection (it only needs `/auth/status` for the developer flag + the REST API).

New files under `packages/client/src/`:

```
components/cms/
  CmsSurface.tsx        // full-screen layout: explorer (left) | editor (right)
  CmsExplorer.tsx       // the dual-root tree (content / source)
  CmsTreeNode.tsx       // one expandable node (lazy children via REST)
  CmsEditor.tsx         // editor pane host: header + save bar + <MonacoLazy>
  MonacoLazy.tsx        // React.lazy wrapper around the Monaco editor
  cmsClient.ts          // REST client: tree/read/stat/write + CSRF token
store/
  cmsSlice.ts           // (or fold into store/index.ts) CMS state + actions
```

### 7.2 The REST client (`cmsClient.ts`)

Thin `fetch` wrapper, `credentials:'include'` (reuses the session cookie). Methods: `getCsrf()`, `listTree(backend,path)`, `read(backend,path)`, `stat(backend,path)`, `write(backend,path,body)` (sends `X-CMS-CSRF`). Maps non-2xx → throws `{error,message}` from `CmsErrorBody`. Base URL = `SERVER_URL` (from `config.ts`).

### 7.3 Store slice (`cmsSlice.ts` / extend `store/index.ts`)

State: `cms: { csrf: string|null; expanded: Record<string,boolean>; children: Record<string, CmsTreeEntry[]>; open: {backend,path,kind,language,body,templateMeta?}|null; draft: string; dirty: boolean; saving: boolean; error: string|null }`.
Actions: `cmsInit()` (fetch CSRF), `cmsExpand(node)` (lazy-load children, cache), `cmsOpen(backend,path)` (REST read → set `open`+`draft`), `cmsEditDraft(text)` (set dirty), `cmsSave()` (REST write → clear dirty, surface `reloadDetail` / error), `cmsCloseError()`.
Node key = `${backend}:${path}`.

### 7.4 The explorer (`CmsExplorer` + `CmsTreeNode`)

Two fixed roots: "content" (`{backend:'content',path:'/'}`) and "source" (`{backend:'source',path:'/'}`). Each `CmsTreeNode` renders its entry; folders are expandable (chevron → `cmsExpand`, which calls `listTree` and caches children); leaves are clickable (→ `cmsOpen`). Lazy: children fetched only on first expand. Theming strictly via `tokens` (`tokens.color.surface`, `fg`, `accent`, `border`, `tokens.space.*`, `tokens.font.mono` for paths) — no hex literals (CLAUDE.md token discipline).

### 7.5 Monaco, lazy-loaded (`MonacoLazy.tsx` + `CmsEditor.tsx`)

- Add `@monaco-editor/react` + `monaco-editor` as **client** deps. (New dependency — flagged §9; it's the requirement's named editor.)
- `MonacoLazy = React.lazy(() => import('./MonacoInner'))` where `MonacoInner` does `import Editor from '@monaco-editor/react'`. Wrap usage in `<Suspense fallback={<EditorSpinner/>}>`. Vite code-splits the dynamic import into its own chunk, so Monaco's bundle is fetched **only when the editor pane first mounts** — the observable lazy-load the acceptance criteria require. Confirm in P4 via the network panel (one `monaco`-named chunk loaded on first leaf open, not before).
- `CmsEditor` header shows `backend:path` + kind; the Monaco `language` prop comes from `CmsReadResult.language`; `value`=`draft`, `onChange`→`cmsEditDraft`. A **Save** button (disabled unless `dirty`, shows spinner while `saving`) calls `cmsSave()`. On save success show `reloadDetail` (e.g. "saved · re-hydrated 1 live instance"); on error show `error` inline (denial → "permission denied", sandbox → message, invalid JSON → the parse message). Stock TS/JSON/YAML support is Monaco's default — **no** engine `.d.ts` feed (deferred to the authoring-intelligence slate).
- Theme Monaco to match `tokens` (`theme="vs-dark"` is close to the existing dark surface; optionally define a custom Monaco theme from `tokens` — keep minimal in P4).

### 7.6 Save flow (end-to-end)

`cmsSave()` → `cmsClient.write(backend, path, draft)` (with CSRF) → server bridge → `CmsApi.write` → gate → persist → go-live → `CmsWriteResult`. Client clears `dirty`, keeps `open.body = draft`. A developer with the game tab open sees the live effect there via existing subscriptions (content) or on next clone (source).

---

## 8. Phase 5 — `docs/subsystems/cms.md`

Author last. Sections:
1. **Overview** — the author→save→live loop; CMS as a REST-only surface of the SPA sharing one session.
2. **The unified-tree projection** — two backends (`content` via `TemplateApi`, `source` via `SourceTreeApi`), backend-discriminated node refs, no merged namespace, folder/leaf rule.
3. **`CmsApi` / `CmsLogic`** — the gated structured surface; `listTree/read/stat/write`; forwarding-only, composes the four existing Apis; the `FromModule` gate; where wire types live.
4. **REST data API + WS split** — the four routes, 1:1 binding to gated core ops, CSRF double-submit, why no GraphQL; **WS:** nothing new this build, the game tab's existing WS carries the live effect; cross-tab CMS sync deferred.
5. **The attribution bridge** — `CmsSession.runAsSessionPlayer`, session→Avatar resolution, `runRoot` seeding, why it's mandatory (provenance + `can()` resolution), its kinship to `ScheduleApi`.
6. **Gating** — developer-tier; the `isDeveloper`/`can`/`canMutateZone` checks mirrored from `WriteController`; server-authoritative; denial surfacing.
7. **Save go-live** — the template (re-hydrate) vs source (`HotReloadApi.reload`) split and *why*.
8. **Client surface** — own-tab takeover, explorer, lazy Monaco, store slice.
9. **Deferral boundary** — explicit list pointing at the access slate (lease model, holodeck, op-log versioning, group-managed content, drafts/changesets, publish gate) and the authoring-intelligence slate (engine-typed IntelliSense / LSP). Add the "decision A: storage-agnostic review model" forward constraint as a one-liner.
10. **History note** (per workflow sweep convention) — the template-vs-source go-live divergence from the requirement's literal "`HotReloadApi.reload`".

---

## 9. Risks / ambiguities / decisions surfaced (not silently chosen)

> **Sign-off status (2026-06-25):** #1 template go-live split — **accepted** (correctness fix). #2 live-avatar coupling — **accepted** (dev-tier). #3 dual-root explorer — **accepted**. #4 errors — **resolved**, no new `lib/cms/` dir (one `CmsError` in `mud/api/cms.ts`). #6 Monaco client dep — **accepted**. #8 reads ungated — **accepted**; anon read-only **deferred** (content-tree-only seam, §3.2). #5/#7/#9 stand as written.

1. **`HotReloadApi.reload` cannot apply to template paths.** Resolved by the §4 split (source → `reload`; content → `restoreFromTemplate`). This is the single biggest divergence from the requirement's literal wording — flagged for sign-off.
2. **"Run-as-session-player" requires a *live* Avatar.** The bridge resolves the session's already-loaded Avatar; a CMS-only tab with no in-world game tab has `actor=null`, so **writes need the game tab open / an in-world developer Avatar.** Reads work regardless. Alternative (clone an Avatar on demand for CMS sessions) is out of scope. Confirm this coupling is acceptable for dev-tier.
3. **No merged tree root.** Two independent roots (content/source), not one synthetic merged namespace. Keeps write-dispatch unambiguous. Confirm the explorer-dual-root UX is what's wanted (it mirrors the existing workspace dual-tree).
4. **Errors — RESOLVED (no new module/dir).** One `CmsError extends Error` with a `code` field, exported from `mud/api/cms.ts` (homed with the surface it throws). No `lib/cms/` directory. See §2.3.
5. **CSRF mechanism.** Hand-rolled double-submit token in session (no new dep). If the repo wants a standard lib, that's a swap at one route + one header.
6. **New client dependency: Monaco** (`@monaco-editor/react` + `monaco-editor`). Named by the requirements, but it's a real bundle addition — flagged.
7. **`isDeveloper` flag on the auth/connection payload** — small server addition so the client can hide the launcher. Non-authoritative; gates stay server-side.
8. **Read gating.** This build does **not** access-gate reads (the surface is developer-tier and dev sessions see everything); only writes are gated. If reads should be gated too, that's a one-line addition per backend — but it's not in the requirement (which gates *writes*). Confirm.
9. **Reserved-path / `/obj/api/` templates.** `listTree` over content will surface engine singleton paths if any have `domain` docs; `saveTemplate`'s reserved-path validator already refuses writes there, so writes are safe, but the explorer may show noise. Acceptable v1; note in `cms.md`.

---

### Critical files for implementation

- `packages/server/src/mud/obj/command/shell/WriteController.ts` — the verbatim gating recipe (`_gateContentWrite`/`_gateSourceWrite`) `CmsLogic.write` must mirror.
- `packages/server/src/mud/api/source-tree.ts` + `packages/server/src/mud/obj/api/SourceTreeLogic.ts` — the Api↔logic-singleton template to copy for `cms.ts` / `CmsLogic.ts`.
- `packages/server/src/backend/Backend.ts` — the `ExecutionContextApi.runRoot(Backend, method, fn)` pattern the attribution bridge reproduces; `req.session.passport.user.id` access shape (also in `services/websocket/WebSocketService.ts`).
- `packages/server/src/services/Server.ts` — where `CmsRoutes.setup` mounts (after session middleware, before the SPA `*` fallback).
- `packages/client/src/App.tsx` + `packages/client/src/store/index.ts` — surface mount point, `mainView`/phase switch, `tokens`/`config` consumption for the new CMS client surface.
