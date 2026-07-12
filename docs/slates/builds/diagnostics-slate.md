# Author diagnostics slate (working doc)

> **Status: design-exploration, pre-requirements — unbuilt.** Reframed
> from the original *compile-diagnostics* slate (TS compile errors only)
> into the broader **author diagnostics** subsystem: three producers
> (runtime execution-context guard, raw console tap, TS compile watcher)
> feeding one searchable store, delivered to the acting giver + the
> content's author, and read from both a CMS panel and an in-game verb.
> A formal requirements doc follows once the residual open questions at
> the bottom are resolved.
>
> **Renamed** from `compile-diagnostics-slate.md` — the scope is now the
> whole author-diagnostics surface (runtime + console + compile), not
> compile alone.

The problem statement, restated for the wider scope: **a content author
working through the CMS browser surface has no feedback path for errors
in the content they authored.** Save-time compile failures on the file
they just touched surface inline in Monaco, but three whole classes of
signal are invisible to a browser-connected author:

1. **Runtime throws in authored content** — an NPC brain throws, a
   script errors, a clone fails to hydrate, a controller blows up
   mid-dispatch. Today these dead-end at `console.warn` / `console.error`
   on the server terminal (which a browser author never sees), or a
   generic *"Command execution failed"* reaches the player with the real
   error swallowed. **This is the primary pain.**
2. **Ambient type errors** — TS errors anywhere in the tree, not just
   the file you saved. `tsx` type-strips and never typechecks; these only
   appear when `tsc` runs in CI.
3. **Stray `console.*`** — everything that never flows through a guarded
   context and would otherwise be lost to the terminal.

This slate proposes one subsystem covering all three.

See also:

- [docs/subsystems/cms.md](../../subsystems/cms.md) — the browser
  authoring surface this build adds a diagnostics panel to; the REST /
  no-WS transport shape the panel poll rides.
- [docs/subsystems/call-security.md](../../subsystems/call-security.md)
  — `ExecutionContextApi.runRoot` and the frame model; the guard is a
  sibling wrapper of `runRoot`.
- [docs/subsystems/provenance.md](../../subsystems/provenance.md) —
  `ProvenanceApi.authorOf(path)` resolves the content's author for the
  "your item broke" push.
- [docs/subsystems/hot-reload.md](../../subsystems/hot-reload.md) — the
  existing reload pipeline tsx serves; the compile watcher adds the
  missing typecheck signal alongside it, and the save-time reload error
  is already the fourth (well-covered) feedback moment.
- [docs/subsystems/messaging.md](../../subsystems/messaging.md) and
  `mud/api/mudlog.ts` — `MudlogApi` is the in-game delivery channel; it
  already falls back to the current command giver as recipient.

---

## The four feedback moments

| Moment | Signal | Status |
|---|---|---|
| **Save-time** | reload/compile failure on the file you just saved | ✅ Covered — CMS `write` returns `reloaded:false` + the error inline in Monaco. Untouched by this slate. |
| **Runtime** | your brain / script / clone / controller throws | ❌ Producer 1 (runRoot guard) — the primary build. |
| **Console** | stray `console.*` outside any guarded context | ❌ Producer 2 (console tap). |
| **Compile (ambient)** | TS type errors anywhere | ❌ Producer 3 (compile watcher) — the original slate's content, retained. |

---

## Architecture at a glance

Three producers, one store, two-audience delivery, two readers.

```
PRODUCERS                         STORE                READERS
─────────                         ─────                ───────
runRoot guard ─┐                                   ┌─ errors verb
(commands,     │              ┌──────────────┐     │  (shell + mudlog tail)
 scheduled,    ├────record───►│ diagnostics  │◄────┤
 brains, REST) │              │  collection  │     └─ CMS panel
               │              │ (Mongo, TTL, │        (GET /api/cms/diagnostics)
console tap ───┤              │  channel-    │
(raw ring)     │              │  tagged)     │     DELIVERY (on structured write)
               │              └──────────────┘     ────────
compile watcher┘                     ▲             ├─ giver  → MudlogApi.error
(tsc -w, dev only)                   │             │           (runRoot path only)
                                     └─ push ──────┴─ author → ProvenanceApi.authorOf
                                                              (live if online, else store)
```

The store is the source of truth. Delivery (mudlog to giver, push to
author) is a side-effect of the structured write, best-effort; a missed
push never loses the diagnostic because the store retains it for the
reader surfaces.

---

## Producer 1 — the runRoot execution-context guard

**The crux of this build.** `ExecutionContextApi.runRoot(target, method,
fn)` is the boundary that already backs command dispatch, `ScheduleApi`
deferred work, NPC brain ticks (via `ScheduleApi`), and the CMS REST
attribution bridge. Wrapping a catch-all there catches all of those at
one chokepoint instead of instrumenting `Behaved._warn`, the interpreter,
and each controller separately.

### It is a sibling wrapper, not a change to `runRoot`

`runRoot` today is `return _als.run([root], fn)` — a hot primitive with
no try/catch; errors propagate. It must **stay** that way: baking a catch
into it would make every internal framework frame pay for diagnostics
capture, and it can't distinguish async rejections from sync returns
without awaiting (it's generically typed `T`).

Instead, add `ExecutionContextApi.runRootGuarded(target, method, fn,
policy)` — same frame setup, but it awaits `fn`, and on throw/rejection:

1. **Record** to the store (channel derived from the frame's content —
   see *Attribution*).
2. **Deliver to the giver** if the frame carries a command giver
   (`getCurrentCommandContext()?.commandGiver`), via `MudlogApi.error`
   with the *real* message — replacing today's generic
   *"Command execution failed"*.
3. **Push to the author** of the offending content via
   `ProvenanceApi.authorOf` (see *Delivery*).
4. **Apply the rethrow policy** (below).

The command inbound path, `ScheduleApi`, and `CmsSession.runAsSessionPlayer`
switch from `runRoot` to `runRootGuarded`. Bare `runRoot` stays available
for framework-internal roots that must not absorb.

### Rethrow-vs-absorb is a per-caller policy

Capture must not change control flow that callers rely on.

- **Command path** → `absorb`. The giver already got the real error via
  mudlog; the inbound handler's generic socket-error frame is no longer
  needed (or becomes a structured note). Tests that assert dispatch
  behavior are unaffected because the throw was user-facing, not a
  contract.
- **Scheduled / background work** → `record-and-rethrow` (or
  `record-and-swallow` where a throw would crash the tick loop —
  matching today's `Behaved` per-brain catch). The diagnostic is
  *added*; existing handling is preserved.
- **REST bridge** → `record-and-rethrow`, so `sendCmsError` still maps
  the error onto an HTTP status for the CMS client.

The policy is an explicit argument, never a global default — the guard
*adds* a recording side-effect; it changes control flow only where the
caller opts in.

### Attribution — from frame to channel to author

The frame carries the acting content. The channel is a pure function of
its path (the taxonomy below). The author is `ProvenanceApi.authorOf`
of that path. Concretely the guard tries, in order: the command's
resolved verb controller path; the brain path for a `BehaviorBeat`
frame; the script document path; else the frame `target`'s
`getTemplatePath()`. Unresolvable → channel `global`, author `null`
(store-only, no push).

---

## Producer 2 — the console tap (raw ring)

The catch-all net for what never flows through a guarded context.

`backend/ConsoleTap.ts` — a backend singleton that, at boot, wraps
`console.log/info/warn/error` (and `process.stdout`/`stderr` write if we
want lower-level coverage; v1 wraps `console.*` only). Each line is
appended to an in-memory ring buffer (last N, default 1000) **and**
passed through to the original console (terminal visibility unchanged).

The ring is **raw and unattributed** — engine internals, third-party
chatter, everything. It is deliberately *not* forced into the channel
taxonomy; that would be a lie. It surfaces as a separate "raw log" view
in the readers, greppable but not filterable-by-content.

Relationship to Producer 1: instrumented seams (`Behaved._warn` etc.)
keep their `console.warn` for terminal visibility, so they appear in the
ring too. That overlap is fine — the ring is a terminal mirror; the
structured store is the curated, attributed view. The store never
double-inserts a console line (the tap writes only to the ring, never
the structured collection).

Optionally, a raw `error`-level line whose text matches an uncaught
pattern can be *promoted* into the structured store as a `source:
'console'` row with channel `global` — the "we'd otherwise miss it"
safety valve. Deferred to a decision below.

### Gating

The raw ring is engine internals and may carry sensitive strings — it is
**wizard-tier read only**, unlike the structured store (author-tier for
content channels).

---

## Producer 3 — the TS compile watcher (retained)

The original slate's content, now one producer of three. Unchanged in
design; condensed here.

`backend/CompileWatcher.ts` owns a long-running `tsc` via the TypeScript
**Compiler API** (`ts.createWatchProgram` +
`createSemanticDiagnosticsBuilderProgram`), *not* stdout parsing.
`Application.start()` boots it only when `NODE_ENV !== 'production'`
(prod has no TS source to watch). It streams
`getSemanticDiagnosticsOfNextAffectedFile()` batches into the store via
`DiagnosticApi.recordDiagnostics(path, versionId, raws, { live })`.

- **Cold start** flows through `{ live: false }` — rows land in the store
  but no push/mudlog fires, so authors aren't firehosed with the
  project's existing baseline at boot. `#ready` flips on TS status codes
  6193/6194; subsequent rechecks pass `{ live: true }`.
- **Supersede on recheck** — re-emitting for a file deletes prior rows
  whose `versionId` differs, so "fixed" clears instead of burying.
- **Crash recovery** — restart with backoff (3 attempts), then one
  `MudlogApi.fatal('compile', …)`.
- **Config discovery** — `packages/server/tsconfig.json`; fail loudly on
  boot if absent.
- Syntactic diagnostics, memory growth over long sessions, and
  multi-process churn are residual open questions (below).

The full Compiler-API `CompileWatcher` sketch from the prior revision
stands; see git history of this file for the code block if needed.

---

## The store — one `diagnostics` collection

Generalizes the prior `compile_diagnostics`. Add
`Diagnostics = 'diagnostics'` to the `Collections` enum in
`backend/PersistenceManager.ts`.

```ts
{
  _id: ObjectId,
  ts: Date,
  source: 'runtime' | 'compile' | 'console',  // which producer
  severity: 'error' | 'warning' | 'info',
  channel: string,        // routing key (taxonomy below); 'global' if unresolved
  path: string | null,    // content/source path that produced it
  author: string | null,  // ProvenanceApi.authorOf(path) at write time — the "my items" index
  versionId: string | null, // sha256[:16] of the file bytes (compile/source only)
  code: number | null,    // TS diagnostic code (compile only)
  line: number | null,
  col: number | null,
  message: string,
  stack: string | null,   // runtime throws only
  expiresAt: Date,        // TTL anchor
}
```

Indexes:

- `{ channel: 1, ts: -1 }` — tail-by-channel
- `{ author: 1, ts: -1 }` — "diagnostics in my content" (the provenance reader)
- `{ path: 1, versionId: 1 }` — compile supersede
- TTL `{ expiresAt: 1 }`, `expireAfterSeconds: 0` (default 7d; free rotation)

Rows are per-diagnostic (not per-snapshot) — cheap "all errors in zone X
right now," room for per-row state (acknowledged/suppressed) later.

### Channel taxonomy (pure function of path)

| Path pattern | Channel |
|---|---|
| `…/domain/zones/<zone>/…` / `/lib/lounge/…` (zone content) | `zone.<zone>` |
| `…/lib/<subsystem>/…` | `lib.<subsystem>` |
| `…/obj/command/…` | `command` |
| `…/api/…` | `api` |
| anything else / unresolved | `global` |

Pure, unit-testable, homed next to `DiagnosticApi`. No YAML config in v1.

---

## Delivery — two audiences, on structured write

Fired only for `{ live: true }` structured writes (runtime always live;
compile live after `#ready`; console never pushes unless promoted).

1. **The giver** — the acting principal in the frame. `MudlogApi.error`
   already resolves `getCurrentCommandContext()?.commandGiver` as the
   fallback recipient, so the runtime guard just calls it. This is the
   "surface the real error to whoever ran the command" half.
2. **The author** — `ProvenanceApi.authorOf(path)` resolves the content's
   author (earliest authoring-ledger row). If that author is online,
   push a `MudlogApi.error` frame ("your item `Goat` threw…"); if
   offline, the store row (indexed on `author`) means they see it next
   time they open the CMS panel or run `errors list`. **Store-is-truth,
   push-is-courtesy.**

`opts.payload` carries the structured row so a client renderer can format
richly; the visible Mml body is composed by the delivery site.

---

## Readers — one store, two surfaces

### The `errors` verb (shell)

`mud/cmd/system/errors.yaml` + `ErrorsController`. Subcommands:

- `list` (default) — `--path` (workspace-relative via
  `SourceTreeApi.resolvePath`), `--channel`, `--severity`, `--source`
  (runtime/compile/console), `--mine` (author == me), `--limit`.
- `raw` — the console ring (wizard-only), `--grep <substr>`, `--limit`.
- `clear <path>` — drop diagnostics for a path (gating below).

No `tail` subcommand — live tailing *is* the mudlog delivery + an
opt-in subscription (the `compile.subscribe`-style channel grammar
carried over from the prior slate, on `AuthorMixin`).

### The CMS panel (browser)

A diagnostics pane in the CMS tab, beside Monaco. CMS is REST-only, so:

```
GET /api/cms/diagnostics?channel=&severity=&source=&mine=&path=&limit=
```

binds 1:1 to a gated `DiagnosticApi.list` through the same
`CmsSession.runAsSessionPlayer` attribution bridge every CMS route uses —
no new authorization surface. The panel polls (default cadence a setting;
a future `cms-delta` WS channel is the reserved upgrade). Rows are
click-through to the offending file/template in the explorer. A
`?mine=true` default scopes it to the author's own content (the
provenance index), with a toggle to the channels they subscribe to.

---

## `DiagnosticApi` shape

`mud/api/diagnostics.ts` — thin gated forwarding shell over the
hot-reloadable `DiagnosticLogic` singleton at `/obj/api/diagnostics`.
Ends with `SecurityApi.decorateApiClass(DiagnosticApi)`.

```ts
export class DiagnosticApi {
  // Producer-side. ApiOnly / gated to the producers.
  static async record(d: RuntimeDiagnostic): Promise<void>;        // guard + console-promote
  static async recordDiagnostics(                                   // compile watcher
    path: string, versionId: string,
    diags: RawDiagnostic[], opts: { live: boolean },
  ): Promise<void>;
  static pushRaw(line: RawConsoleLine): void;                       // console tap → ring only

  // Reader-side.
  static async list(filter: ListFilter): Promise<DiagnosticDoc[]>;
  static rawTail(filter: RawFilter): RawConsoleLine[];              // ring, wizard-gated
  static async clear(path: string): Promise<number>;

  // Pure utilities.
  static pathToChannel(absPath: string): string;
  static expandSubscription(patterns: readonly string[], ctx: { cwd?: string }): readonly string[];
  static matches(channel: string, expanded: readonly string[]): boolean;

  // Listener + delivery registration. Idempotent.
  static startRouter(): void;
}
```

`record` is the single structured write path (delete-stale + insert +
best-effort deliver). `startRouter()` registers exactly one delivery
listener per process, idempotent.

---

## Event payload

`lib/events.ts`, beside `ModuleReloaded`:

```ts
Diagnostic: 'diagnostic.recorded',
[Events.Diagnostic]: DiagnosticEvent,
[Events.Diagnostic]: emittableBy(DiagnosticApi),

export interface DiagnosticEvent {
  source: 'runtime' | 'compile' | 'console';
  channel: string;
  path: string | null;
  author: string | null;
  severity: 'error' | 'warning' | 'info';
  diagnostics: RawDiagnostic[]; // [] valid for compile → file went clean
  ts: Date;
}
```

---

## Module taxonomy — everything fits existing categories

No new module category is invented:

- `backend/CompileWatcher.ts`, `backend/ConsoleTap.ts` — backend
  singletons (siblings of `PersistenceManager`), owned by `Application`.
- `mud/api/diagnostics.ts` (`DiagnosticApi`) + `obj/api/DiagnosticLogic.ts`
  — the Api / logic-singleton pair.
- `mud/cmd/system/errors.yaml` + `obj/command/system/ErrorsController.ts`
  — the verb (category `system`).
- `ExecutionContextApi.runRootGuarded` — a new static on the existing Api.
- `GET /api/cms/diagnostics` — one route added to `CmsRoutes`; a client
  pane in the existing CMS surface.
- `Events.Diagnostic` — one event const.

---

## Security / gating

Mirrors the CMS gating (context-derived actor, never a passed value):

| Op | Gate |
|---|---|
| `list` / CMS panel (content channels) | `isAuthor` (and `?mine` needs no extra gate — it's your own rows) |
| `list` source/compile channels | `isWizard` |
| `raw` / `rawTail` (console ring) | `isWizard` only |
| `clear <path>` | `isWizard`, or `isAuthor` of that path (provenance) — residual open question below |
| producer writes | `ApiOnly` / gated to the producer modules |

A `null` (unattributable) context fails closed.

---

## Test plan

Vitest, colocated `__tests__/`.

- **`diagnostics.test.ts`** — `pathToChannel`, `expandSubscription`,
  `matches`, `record` write/supersede/deliver, `list` filters, `clear`.
- **`runroot-guard.test.ts`** — drive `runRootGuarded` with a throwing
  `fn` under each policy; assert store write, giver mudlog, provenance
  push, and rethrow-vs-absorb behavior.
- **`console-tap.test.ts`** — ring append + passthrough + wrap/unwrap
  idempotency + promote-on-error path.
- **`compile-watcher.test.ts`** — fixture programs (good/bad/good
  transition); assert `recordDiagnostics` calls + cold-start `live:false`.
- **`errors-controller.test.ts`** — subcommand routing, `--path`
  resolution, `--mine`, empty-result message, `raw` wizard-gate.
- **`diagnostics-delivery.test.ts`** — online/offline author push,
  giver mudlog, channel-subscription fan.

---

## Residual open questions

The four framing decisions are settled (structured sink + raw ring; store
+ provenance push; both readers; all three producers this cycle). What's
left:

1. **`runRootGuarded` rollout order.** Command path first (the stated
   pain), then `ScheduleApi`, then the REST bridge — or all at once?
   Incremental is safer (each opt-in is a control-flow change).
2. **Absorb vs structured-error-frame on the command path.** When the
   guard absorbs, does the inbound handler still send *any* socket frame,
   or is the mudlog line the whole response? Leaning: mudlog line only,
   with a `controller-rejected`-style note in the envelope.
3. **Console `error`-line promotion.** Auto-promote raw `console.error`
   lines into the structured store (channel `global`), or keep the ring
   strictly separate and rely on the runRoot guard for structured
   coverage? Promotion risks noise; separation risks a gap.
4. **`clear` gating.** Wizard-only, or author-of-path too? Provenance
   makes author-scoped clear cheap and correct.
5. **`compile.subscribe` storage type.** `SettingTypes.List` vs
   comma-separated `String` (the `settings set` list-type gap from the
   prior slate). Recommendation stands: declare `List`, mutate via a
   future `errors subscribe …` subcommand.
6. **Compile-watcher residuals** (carried over): syntactic diagnostics
   in v1, long-session memory growth, multi-process dev churn, "file went
   clean" positive notifications.
7. **Poll cadence + the reserved `cms-delta` WS.** Panel poll interval as
   a setting; when (if) to promote to a push channel.

---

## Out of scope

- **Production runtime capture beyond the guard.** The compile watcher is
  dev-only (no TS source in prod). The runRoot guard and console tap *do*
  run in prod — a prod runtime throw is a real diagnostic — but the CMS
  panel/`errors` verb reading it in prod is a graceful no-op-friendly read
  over whatever the store holds.
- **Cross-platform paths.** Linux-only, mirroring hot-reload.md.
- **LSP / browser-IDE IntelliSense** → the authoring-intelligence slate.
  This slate is the *feedback* surface, not the *authoring-assist* one.
- **Lint diagnostics.** The `source`/channel/store shape extends to
  ESLint output without API changes; v1 is runtime + TS + console.
- **Per-diagnostic lifecycle** (acknowledge / suppress / assign). The
  per-row schema leaves room; not built.
