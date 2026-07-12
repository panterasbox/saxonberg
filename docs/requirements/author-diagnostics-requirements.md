# Author diagnostics — requirements

A content author working through the CMS browser surface (or the in-game
shell) today has **no feedback path for errors in the content they
authored**. Save-time compile failures on the file just saved surface
inline in Monaco, but runtime throws in authored content — an NPC brain
throwing, a script erroring, a clone failing to hydrate, a controller
blowing up mid-dispatch — dead-end at `console.warn`/`console.error` on
the server terminal (invisible to a browser author) or reach the player
as a generic *"Command execution failed"* with the real error swallowed.
Ambient TypeScript type errors are likewise invisible until CI. This
build delivers one **author-diagnostics subsystem**: three producers
(a runtime execution-context guard, a raw console tap, a TS compile
watcher) feeding one searchable store, delivered to the acting giver and
the content's author, and read from both a CMS panel and an in-game
`errors` verb.

Seeded by [diagnostics-slate.md](../slates/builds/diagnostics-slate.md)
(the reframed, formerly compile-only slate). Load-bearing subsystems:
[call-security.md](../subsystems/call-security.md) (`runRoot` / frame
model), [provenance.md](../subsystems/provenance.md) (`authorOf` for the
author push), [cms.md](../subsystems/cms.md) (the REST/no-WS surface and
`CmsSession.runAsSessionPlayer` bridge), [messaging.md](../subsystems/messaging.md)
(`MudlogApi` delivery), [hot-reload.md](../subsystems/hot-reload.md) (the
save-time reload error already covers the fourth feedback moment),
[response-envelope.md](../subsystems/response-envelope.md) (the
`controller-error` note).

## Goals

- **A single searchable diagnostics store** (`diagnostics` Mongo
  collection) holds structured diagnostics from all producers, tagged
  with a channel (pure function of path), the producing `source`, a
  severity, and — where resolvable — the `path` and its `author`, with
  TTL-based rotation.
- **Runtime throws in authored content are captured** at one chokepoint:
  a new `ExecutionContextApi.runRootGuarded` sibling of `runRoot` that
  the command inbound path, `ScheduleApi`, and the CMS REST bridge adopt.
  A caught throw is recorded to the store and delivered.
- **The acting giver sees the real error.** On the command path, the
  giver's real-error surface is the **existing `controller-error` note**
  that `CommandGiver` already emits (it renders the real message and
  escalates the turn to error); the generic *"Command execution failed"*
  socket frame is retired. `MudlogApi.error` is **not** additionally fired
  to the giver here (no double-surfacing) — it is reserved for the author
  push and for non-command runtime throws (scheduled / brain ticks, which
  have no note).
- **The content's author is notified.** A captured runtime diagnostic
  resolves the offending content's author via `ProvenanceApi.authorOf`
  and pushes a mudlog frame to them if online; if offline, the store row
  (indexed on `author`) is their record. Store-is-truth, push-is-courtesy.
- **Stray `console.*` is not lost.** A boot-time console tap keeps the
  last N lines in an in-memory raw ring, greppable by wizards, without
  suppressing terminal output.
- **Ambient TypeScript type errors surface** via a dev-only `tsc -w`
  compile watcher (TypeScript Compiler API) streaming semantic
  diagnostics into the same store, without firehosing the boot baseline.
- **Both reader surfaces exist over the one store:** an in-game `errors`
  verb (list / raw / clear, with channel/severity/source/`--mine`
  filters and a subscription tail) and a CMS diagnostics panel
  (`GET /api/cms/diagnostics`, polling, click-through to the file).
- **A subsystem doc** (`docs/subsystems/diagnostics.md`) is the source
  of truth for the shipped surface.

## Non-goals

- **Save-time reload feedback.** Already shipped — CMS `write` returns
  `reloaded:false` + the error inline in Monaco ([cms.md](../subsystems/cms.md)).
  Untouched here.
- **Promoting raw `console.error` into the structured store.** v1 keeps
  the ring strictly raw/unattributed; structured coverage comes only from
  the runRoot guard. (Decision below; revisitable.)
- **Syntactic (parse-error) compile diagnostics.** Semantic-only in v1 —
  parse errors are already caught by tsx module-load
  (`Events.ModuleReloadFailed`) and the save-time reload error.
- **A `cms-delta` WebSocket push channel.** The CMS panel polls; the WS
  upgrade is reserved, not built (matches the CMS build's REST-only shape).
- **LSP / engine-typed IntelliSense / browser-IDE integration** → the
  [authoring-intelligence-slate](../slates/builds/authoring-intelligence-slate.md).
  This is the *feedback* surface, not the *authoring-assist* one.
- **Lint (ESLint) diagnostics.** The `source`/channel/store shape extends
  to lint without API changes; v1 is runtime + semantic-TS + console.
- **Per-diagnostic lifecycle** (acknowledge / suppress / assign). The
  per-row schema leaves room; no verbs for it.
- **Production compile watching.** The watcher is dev-only (no TS source
  in prod). The runRoot guard and console tap *do* run in prod.

## Surface decisions

### Three producers, one store (locked)

The store (`diagnostics` collection) is the single source of truth. Three
producers write to it; delivery to the giver/author is a best-effort
side-effect of the structured write, never a precondition for the row.

### The runRoot guard is a sibling wrapper, not a change to `runRoot`

`ExecutionContextApi.runRoot` is a hot no-catch primitive
(`return _als.run([root], fn)`); it must stay that way so framework-internal
roots don't pay for diagnostics capture and so async rejections aren't
forced through its generic `T` return. The guard is a **new**
`runRootGuarded(target, method, fn, policy)` that awaits `fn` and, on
throw/rejection, records + delivers + applies a rethrow policy. The
command inbound path, `ScheduleApi`, and `CmsSession.runAsSessionPlayer`
switch to it; bare `runRoot` stays for internal roots that must not absorb.

### Rethrow-vs-absorb is a per-caller policy, never a global default

Capture *adds* a recording side-effect; it changes control flow only
where the caller opts in.

- **Command path** → `absorb`. The giver already got the real error via
  mudlog + the `controller-error` envelope note; no separate generic
  socket-error frame.
- **Scheduled / background work** → `record-and-rethrow` (or
  `record-and-swallow` where a throw would crash a tick loop, matching
  today's `Behaved` per-brain catch).
- **REST bridge** → `record-and-rethrow`, so `sendCmsError` still maps
  the error to an HTTP status.

### Command-path response = the existing `controller-error` note (locked)

Authored-content controller throws are **already absorbed** by
`CommandGiver.executeCommand` into a `controller-error` note
(`{ kind: 'controller-error', controller, detail }`) that renders the real
message to the giver and escalates the turn to error — they never reach
`runRoot`/`command.ts`. So the command-path capture is **additive**: at
those existing emission sites, also call `DiagnosticApi.record` (store row
+ author push). The note is the giver's surface; **no separate
`MudlogApi.error` to the giver** (avoid double-surfacing). No new note
kind. `runRootGuarded` at the `command.ts` boundary handles residual
framework escapes and retires the generic *"Command execution failed"*
socket frame. (See the plan's Risk #1 for the two-seam detail.)

### Attribution — frame → channel → author

The channel is a pure function of the offending path (taxonomy below).
The guard resolves the path in order: resolved verb-controller path →
`BehaviorBeat` brain path → script document path → frame `target`'s
`getTemplatePath()`. Unresolvable → channel `global`, author `null`
(store-only, no push). The author is `ProvenanceApi.authorOf(path)`.

Channel taxonomy (pure, unit-testable, homed by `DiagnosticApi`):

| Path pattern | Channel |
|---|---|
| zone content (`…/domain/zones/<zone>/…`, `/lib/lounge/…`) | `zone.<zone>` |
| `…/lib/<subsystem>/…` | `lib.<subsystem>` |
| `…/obj/command/…` | `command` |
| `…/api/…` | `api` |
| else / unresolved | `global` |

### Console tap stays separate from the structured store (locked)

The console tap writes only to the in-memory raw ring — never the
structured collection. Structured, attributed coverage comes solely from
the runRoot guard. A stray `console.error` outside any guarded context is
findable via the raw grep but is not filterable-by-content. Instrumented
seams (e.g. `Behaved._warn`) keep their `console.warn` for terminal
visibility, so they also appear in the ring; that overlap is accepted (the
ring is a terminal mirror; the store is the curated view). The raw ring is
**wizard-read-only** — it may carry sensitive engine strings.

### Compile watcher: semantic-only, dev-only, cold-start-silent (locked)

TypeScript Compiler API (`createWatchProgram` +
`createSemanticDiagnosticsBuilderProgram`), booted only when
`NODE_ENV !== 'production'`. Semantic diagnostics only. Cold-start rows
flow through `{ live: false }` (stored, not pushed/mudlogged) so authors
aren't firehosed with the boot baseline; `#ready` flips on TS status codes
6193/6194; later rechecks pass `{ live: true }`. Supersede-on-recheck
(delete prior rows whose `versionId` differs) clears fixed errors. Crash
recovery: backoff × 3, then one `MudlogApi.fatal('compile', …)`. Config:
`packages/server/tsconfig.json`, fail loudly on boot if absent.

### Both readers over the one store (locked)

- **`errors` verb** (`mud/cmd/system/errors.yaml` + `ErrorsController`):
  `list` (default) with `--path` (workspace-relative via
  `SourceTreeApi.resolvePath`), `--channel`, `--severity`, `--source`,
  `--mine`, `--limit`; `raw` (wizard-only console ring, `--grep`,
  `--limit`); `clear <path>`. Live tailing is the mudlog delivery + an
  opt-in `compile.subscribe` channel subscription, not a `tail`
  subcommand.
- **CMS panel:** `GET /api/cms/diagnostics?channel=&severity=&source=&mine=&path=&limit=`
  bound 1:1 to `DiagnosticApi.list` through `CmsSession.runAsSessionPlayer`
  (no new authorization surface), polled at a settable cadence, defaulting
  to `?mine=true` (the provenance index) with a toggle to subscribed
  channels. Rows click through to the file/template in the explorer.

### Residual defaults (confirmed)

- **`clear` gating** → `isWizard`, or `isAuthor` of the path (provenance).
- **`compile.subscribe` storage** → `SettingTypes.List` on `AuthorMixin`,
  default `['$cwd', 'global']`, mutated via an `errors subscribe …`
  subcommand (the `settings set` list-type gap stands).
- **Poll cadence** → an AppSetting; `cms-delta` WS deferred.
- **"File went clean"** → suppress positive notifications by default.
- **Memory / multi-process** → accept `tsc -w` memory for v1; supersede
  dedups multi-process writes.

## Constraints

- **`runRoot` stays a no-catch primitive.** The guard is additive; do not
  add try/catch to `runRoot` itself (call-security.md frame model,
  bootstrap-sensitive Api).
- **Module taxonomy — no new category.** `backend/CompileWatcher.ts` and
  `backend/ConsoleTap.ts` are backend singletons owned by `Application`;
  `mud/api/diagnostics.ts` (`DiagnosticApi`) + `obj/api/DiagnosticLogic.ts`
  are the Api/logic-singleton pair (`DiagnosticLogic` at
  `/obj/api/diagnostics`, methods gated
  `FromModule('/api/diagnostics#DiagnosticApi')`); the verb is category
  `system`; `runRootGuarded` is a new static on the existing
  `ExecutionContextApi`; one route on `CmsRoutes`; one `Events.Diagnostic`
  const. No free-floating helpers (CLAUDE.md § Module Categories).
- **Gated Apis derive the actor from context, never a parameter.** Reader
  gating resolves the subject via `getActingAuthor` (the CMS anti-spoof
  property); a `null` context fails every gate closed.
- **Gating mirrors the CMS.** `list`/CMS-panel content channels →
  `isAuthor`; source/compile channels and the raw ring → `isWizard`;
  producer writes → `ApiOnly` / gated to the producer modules.
- **Delivery is best-effort and non-blocking.** A failed mudlog push or an
  offline author never blocks or fails the store write.
- **Cold-start must not firehose.** Compile-watcher baseline rows are
  `live:false` (stored, silent). Runtime capture is always live.
- **Prod-safe.** The compile watcher never starts in production; the
  `errors` verb / CMS panel over an empty-or-runtime-only store in prod is
  a graceful read, no special-casing.
- **Linux-only paths**, mirroring hot-reload.md; the store keys absolute
  paths verbatim.

## Acceptance criteria

- A `diagnostics` collection exists (added to the `Collections` enum) with
  the per-diagnostic schema (`source`, `severity`, `channel`, `path`,
  `author`, `versionId`, `code`, `line`, `col`, `message`, `stack`,
  `ts`, `expiresAt`), the four indexes (`{channel,ts}`, `{author,ts}`,
  `{path,versionId}`, TTL on `expiresAt`), and TTL rotation.
- `ExecutionContextApi.runRootGuarded` exists; the command inbound path,
  `ScheduleApi`, and `CmsSession.runAsSessionPlayer` route through it with
  their respective policies. Tests drive a throwing `fn` under each policy
  and assert store write, giver mudlog, provenance push, and
  rethrow-vs-absorb behavior.
- A thrown command produces: the existing `controller-error` note to the
  giver with the real message (turn status escalated), a `diagnostics` row
  with the resolved channel/author, an author push when the author is
  online, and **no** generic *"Command execution failed"* frame — and **no**
  duplicate `MudlogApi.error` to the giver. Covers sync and async
  (`--async`) controllers.
- `ProvenanceApi.authorOf`-resolved author receives a live mudlog push when
  online; when offline, the row is retrievable via `errors list --mine`
  and the CMS panel `?mine=true`. Tested both ways.
- `ConsoleTap` wraps `console.*` at boot into a ring (default 1000),
  passes through to the terminal, and is wrap/unwrap idempotent; `errors
  raw` / the panel expose it wizard-only. Tested including passthrough.
- `CompileWatcher` (dev-only) streams semantic diagnostics into the store;
  cold-start rows are `live:false`; a good→bad→good fixture transition
  supersedes correctly. Tested with fixture programs.
- `DiagnosticApi` (`mud/api/diagnostics.ts`) is the gated forwarding shell
  over `DiagnosticLogic`, ending with `SecurityApi.decorateApiClass`;
  `pathToChannel` / `expandSubscription` / `matches` are pure and unit
  tested.
- The `errors` verb routes `list`/`raw`/`clear` with `--path` resolution,
  `--mine`, filters, wizard-gated `raw`, and author/wizard-gated `clear`;
  empty-result messaging is graceful. Tested.
- `GET /api/cms/diagnostics` is mounted on `CmsRoutes`, binds through the
  attribution bridge to `DiagnosticApi.list`, and adds no authorization
  surface (gate lives in `DiagnosticLogic`). The CMS client renders a
  polling diagnostics panel with click-through.
- `docs/subsystems/diagnostics.md` exists as the source of truth; CLAUDE.md
  Documentation Map + Collections list updated; the slate is retired at
  sweep per workflow rules.
- `pnpm lint`, `pnpm lint:gates`, and `pnpm test` pass.

## Cross-references

- **Seeding slate:** [diagnostics-slate.md](../slates/builds/diagnostics-slate.md)
- **Subsystem docs:** [call-security.md](../subsystems/call-security.md),
  [provenance.md](../subsystems/provenance.md), [cms.md](../subsystems/cms.md),
  [messaging.md](../subsystems/messaging.md),
  [response-envelope.md](../subsystems/response-envelope.md),
  [hot-reload.md](../subsystems/hot-reload.md),
  [shell-workspace.md](../subsystems/shell-workspace.md),
  [shell-environment.md](../subsystems/shell-environment.md)
- **Adjacent slate (deferred surface):**
  [authoring-intelligence-slate.md](../slates/builds/authoring-intelligence-slate.md)
