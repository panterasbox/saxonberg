# Compile diagnostics slate (working doc)

> **Status: design-exploration, pre-requirements — unbuilt.** Proposes
> the wiring to surface TypeScript compile errors to in-game developers;
> a formal requirements doc follows once the open questions at the bottom
> are resolved.

Working slate for surfacing TypeScript compile errors to in-game
developers in a way that fits Saxonberg's existing subsystems
(hot reload, mudlog, workspace, environment settings). The
problem statement is short: a developer editing code through
the in-game shell has no automatic feedback path for TypeScript
type errors, only for syntax and runtime errors. This slate
proposes the wiring to close that gap.

This document is a design-exploration slate. A formal
requirements document follows once the open questions at the
bottom are resolved.

See also:

- [docs/subsystems/hot-reload.md](../../subsystems/hot-reload.md) —
  the existing reload pipeline that tsx serves; this slate adds
  the missing typecheck signal alongside it.
- [docs/subsystems/messaging.md](../../subsystems/messaging.md) and
  `mud/api/mudlog.ts` — the delivery channel for diagnostics.
- [docs/subsystems/shell-environment.md](../../subsystems/shell-environment.md)
  — where the per-author `compile.subscribe` setting lives.
- [docs/subsystems/shell-workspace.md](../../subsystems/shell-workspace.md)
  — `cwd`, `SourceTreeApi.resolvePath`, the `$cwd` synthetic
  channel hook.
- [docs/subsystems/shell-author.md](../../subsystems/shell-author.md)
  — `AuthorMixin` is the home for the new settings entries.
- [docs/subsystems/persistence.md](../../subsystems/persistence.md) —
  `PersistenceManager` owns the Mongo collection used for the
  diagnostic store.

---

## Motivation

`pnpm dev` runs `tsx watch src/index.ts`. tsx is a
type-stripping transpiler — it compiles `.ts` to `.js` on
import and does **not** typecheck. `HotReloadApi.reload` uses
the same loader chain (cache-busted `import()`), so it inherits
tsx's behavior: it surfaces *syntax* errors as
`Events.ModuleReloadFailed` and *runtime* errors at clone time,
but it silently swallows TypeScript *type* errors.

The result: an in-game developer can edit a source file via
the workspace verbs (`write`, `mkdir`, `mv`) or the author
verbs (`reload`, `eval`), succeed in reloading, and have no
indication that the file no longer typechecks. Type errors
only become visible when `pnpm build` (i.e., `tsc`) runs,
typically in CI — long after the in-game session is over.

The mechanism in this slate runs `tsc` continuously alongside
the dev server, captures its diagnostics structurally, and
routes them into mudlog scoped per author. Type errors become
part of the in-game development feedback loop, not a CI
afterthought.

---

## Producer options considered

Three approaches exist for getting type-error data into the
running server. Listed in increasing ambition; option (2) is
the recommendation.

1. **Run `tsc -w --noEmit` in a separate terminal.** Cheap,
   no in-game plumbing, diagnostics print to a terminal the
   developer can read. The flaw: the in-game developer often
   doesn't *own* a terminal — they're connected via web
   client. Ergonomically a non-starter for the use case.

2. **Spawn `tsc` from the server, capture diagnostics
   structurally, route into mudlog. (Recommended.)** A single
   long-running process feeding an event stream. Costs
   nothing per edit, fits the "subscribe via `Events.*`"
   pattern hot-reload.md already calls out as the audit-log
   seam. Same plumbing extends naturally to lint output and
   runtime warnings later.

3. **Run typechecking inline at reload time.** Before/after
   `HotReloadApi.reload(path)`, ask the TypeScript Compiler
   API for diagnostics on that file and its dependents. More
   accurate (the diagnostic is bound to the user action that
   caused it), but slower per-edit and re-implements what a
   long-running `tsc` already does well. Re-evaluate if the
   "diagnostic for *this specific* edit" UX becomes important.

---

## Storage: Mongo collection with TTL

Filesystem storage is rejected on three counts: no schema, no
free rotation, painful to query, and no multi-process
coordination. A Mongo collection (`compile_diagnostics`) is
the right shape — Mongo is in the stack, persistence is
solved, and TTL indexes give free rotation.

Collection: `compile_diagnostics`. Add to the `Collections`
enum in `backend/PersistenceManager.ts`.

Document shape:

```ts
{
  _id: ObjectId,
  ts: Date,
  path: string,            // absolute source path
  versionId: string,       // sha256 truncated to 16 hex chars
  channel: string,         // pre-computed routing key
  severity: 'error' | 'warning',
  line: number,
  col: number,
  code: number,            // TS diagnostic code, e.g. 2304
  message: string,
  expiresAt: Date,         // TTL anchor
}
```

Indexes (created on first `init` via PM's existing
collection-index pattern):

- `{ path: 1, versionId: 1 }` — supersede operation
- `{ channel: 1, ts: -1 }` — tail-by-channel reads
- TTL: `{ expiresAt: 1 }` with `expireAfterSeconds: 0`

### Rotation

Two layers:

1. **TTL on `expiresAt`** (default 7 days). Mongo handles
   eviction; no cron job. Severity could drive different TTLs
   later (`warning` shorter than `error`) but v1 keeps it
   uniform.
2. **Supersede on recheck.** When `tsc` re-emits diagnostics
   for a file, the producer deletes any earlier docs for that
   `path` whose `versionId` differs, then inserts the new
   batch. The collection then reflects "current state" plus a
   short TTL-bounded tail. Without supersede, fixing an error
   would silently bury the old row in noise instead of
   clearing it.

### Per-row vs per-batch granularity

Rows are per-diagnostic, not per-file-snapshot. Per-row makes
"all errors in zone X right now" cheap, leaves room to
extend per-diagnostic state later (acknowledged, suppressed),
and the storage cost difference is negligible.

---

## Channels: derivation from path

A "channel" is a routing key computed once from the path at
write time and stored on the doc. It also feeds the mudlog
category (see Mudlog integration). The mapping is a pure
function on the absolute path:

| Path pattern                                  | Channel          |
|-----------------------------------------------|------------------|
| `…/seeds/domain/zones/<zone>/…`               | `zone.<zone>`    |
| `…/lib/<subsystem>/…`                         | `lib.<subsystem>`|
| `…/obj/command/…`                             | `command`        |
| `…/api/…`                                     | `api`            |
| anything else                                 | `global`         |

Pure, unit-testable, lives next to `CompileApi`. No YAML
configuration in v1 — if a future mod system needs to inject
channel rules, the function takes a registry of additional
prefix → channel mappings at boot. The current rules are
authored in code because the directory layout is part of
Saxonberg's architecture and isn't expected to change.

---

## Subscriptions: per-author setting

Each author has a list-typed setting `compile.subscribe`
declared on `AuthorMixin`. Default:

```
compile.subscribe = ["$cwd", "global"]
```

Pattern grammar (four shapes, evaluated in order):

| Pattern                  | Match                                       |
|--------------------------|---------------------------------------------|
| `*`                      | any channel                                 |
| `$cwd` (synthetic)       | `pathToChannel(authorCwd)` at filter time   |
| `lib.*` (dot-star suffix)| exact prefix match                          |
| `zone.cliffside`         | exact match                                 |

`$cwd` is the same flavor as `$PWD` in shell-workspace.md —
resolved live by the listener so cd'ing into a zone re-routes
diagnostics automatically without the author's settings being
silently mutated.

Subscriptions are static config; movement does not write to
them. If an author wants to broaden temporarily,
`settings set compile.subscribe '*' --session` (per the
shell-environment.md persistent/session split).

### Settings declaration on `AuthorMixin`

```ts
{
  key: 'compile.subscribe',
  type: SettingTypes.List,
  default: ['$cwd', 'global'],
  description:
    'Channels to subscribe to for live compile diagnostics ' +
    'in mudlog. Patterns: "*" (all), literal channel ' +
    '("zone.cliffside"), prefix ("lib.*"), or synthetic ' +
    '"$cwd" (resolves to the channel for your current cwd).',
},
```

`SettingTypes.List` is accepted by the schema today, but
shell-environment.md notes the player-facing `settings set`
command rejects list types pending structured-value syntax.
That means the default is honored from day one, but mutation
goes through a future `compile subscribe …` subcommand or
direct schema edit until list-set lands. See open questions.

---

## Mudlog integration

Mudlog is the delivery channel. Real call shape (per
`mud/api/mudlog.ts`):

```ts
MudlogApi.error(category, body, { to: recipients, payload });
MudlogApi.warn(category, body, { to: recipients, payload });
```

The category argument folds into the topic
(`system.log.<category>.<level>`). The compile-diagnostics
listener uses `compile.<channel>` as the category, so a
diagnostic for `seeds/domain/zones/cliffside/Goat.ts` lands on
topic `system.log.compile.zone.cliffside.error`.

`opts.to` does the recipient targeting. Mudlog itself doesn't
do topic-based subscription; "who hears this" is the
listener's responsibility. The listener walks online avatars,
filters by their `compile.subscribe` patterns expanded with
their cwd, and passes the matching avatars as `to` (one frame
per recipient, fanout for free).

`opts.payload` carries structured diagnostic data —
`{ path, diagnostics }` — so a future client renderer can
format them richly (collapsed / clickable / linked to the
file). The visible Mml body is still composed by the
listener for the terminal client.

### Severity mapping

- TS diagnostic `category === Error` → `MudlogApi.error`
- TS diagnostic `category === Warning` → `MudlogApi.warn`
- "File went clean" (zero diagnostics, supersede deleted prior
  rows) → suppress mudlog by default. Optional
  `MudlogApi.info('compile.${channel}', '✓ Foo.ts cleared')`
  if you want it visible. Toggleable on the listener.

---

## Reader surface: the `errors` verb

`mud/cmd/errors.yaml`:

```yaml
verbs: [errors]
controller: ErrorsController
description: "Show TypeScript compile errors from the dev watcher"
subcommands:
  list:
    description: "List recent diagnostics matching your subscriptions"
    options:
      path:
        type: string
        description: "Filter to a path or path prefix"
      channel:
        type: string
        description: "Override your subscription with an explicit channel"
      severity:
        type: string
        description: "error | warning"
      limit:
        type: number
        description: "Max rows (default 50)"

  clear:
    description: "Drop diagnostics for a path"
    args:
      - name: path
        type: string
        required: true
```

`errors` with no subcommand resolves to `list` (same default
as `alias`). No `tail` subcommand — live tailing is the
subscription, not a separate verb; if an author wants to
watch live they set their `compile.subscribe`.

`--path` is workspace-relative, resolved via
`SourceTreeApi.resolvePath(giver.getCwd('source'), arg, { home })`
— the same convention `cat` and `cd` use. `.` means cwd, bare
relative is cwd-relative, leading `/` is absolute.

---

## `CompileApi` shape

Lives at `mud/api/compile.ts`. Static-utility surface; ends
with `SecurityApi.decorateApiClass(CompileApi)`.

```ts
export class CompileApi {
  // Producer-side. ApiOnly. Called only by CompileWatcher.
  static async recordDiagnostics(
    path: string,
    versionId: string,
    diagnostics: RawDiagnostic[],
    opts: { live: boolean },
  ): Promise<void>;

  // Reader-side.
  static async list(filter: ListFilter): Promise<DiagnosticDoc[]>;
  static async clear(path: string): Promise<number>;

  // Pure utilities.
  static pathToChannel(absPath: string): string;
  static expandSubscription(
    patterns: readonly string[],
    ctx: { cwd?: string },
  ): readonly string[];
  static matches(channel: string, expanded: readonly string[]): boolean;

  // Listener registration. Idempotent.
  static startMudlogRouter(): void;
}

interface RawDiagnostic {
  severity: 'error' | 'warning';
  line: number;
  col: number;
  code: number;
  message: string;
}

interface ListFilter {
  channels?: readonly string[];
  pathPrefix?: string;
  severity?: 'error' | 'warning';
  since?: Date;
  limit?: number;
}
```

Key invariants:

- `recordDiagnostics` is the *only* write path. It performs
  delete-stale + insert-new + (optional) emit in one call.
  The `live` flag exists for the cold-start window (see
  Watcher).
- `startMudlogRouter()` registers exactly one
  `EventApi.on(Events.CompileDiagnostic, …)` per process and
  is idempotent; calling it twice is a no-op.
- The Api accesses Mongo via
  `PersistenceManager.get().getCollection(Collections.CompileDiagnostics)`,
  matching the HotReloadApi convention. No private `Db`
  field.

---

## Event payload

In `lib/events.ts`, alongside `ModuleReloaded`:

```ts
// Events const map:
CompileDiagnostic: 'compile.diagnostic',

// EventPayloads interface:
[Events.CompileDiagnostic]: CompileDiagnosticEvent;

// _policies map:
[Events.CompileDiagnostic]: emittableBy(CompileApi),

// Payload type, beside ReloadEvent:
export interface CompileDiagnosticEvent {
  path: string;             // absolute
  versionId: string;
  channel: string;          // pre-computed by CompileApi
  diagnostics: RawDiagnostic[]; // [] valid → file went clean
  ts: Date;
}
```

One event per file recheck. Empty `diagnostics` is valid;
the listener suppresses mudlog output for empty events but
the collection write still happens (delete-stale clears prior
rows for that path).

---

## Watcher: TS Compiler API

`backend/CompileWatcher.ts` owns the long-running tsc
process. Compiler API rather than parsing `tsc -w` stdout —
text parsing is fragile and re-implements what
`ts.SemanticDiagnosticsBuilderProgram` already gives in
structured form.

```ts
import * as ts from 'typescript';
import { CompileApi } from '../mud/api/compile';
import { hashFileBytes } from './hash';

export class CompileWatcher {
  #ready = false;
  #watcher?: ts.WatchOfConfigFile<ts.SemanticDiagnosticsBuilderProgram>;

  start(configPath: string): void {
    const host = ts.createWatchCompilerHost(
      configPath,
      { noEmit: true },
      ts.sys,
      ts.createSemanticDiagnosticsBuilderProgram,
      /* reportDiagnostic */ undefined, // we drive batches
      this.#onWatchStatus,
    );
    const origAfter = host.afterProgramCreate;
    host.afterProgramCreate = (program) => {
      void this.#flushAffected(program);
      origAfter?.(program);
    };
    this.#watcher = ts.createWatchProgram(host);
  }

  async stop(): Promise<void> {
    this.#watcher?.close();
  }

  #onWatchStatus = (d: ts.Diagnostic): void => {
    // 6193: "Found 0 errors. Watching for file changes."
    // 6194: "Found N errors. Watching for file changes."
    if (d.code === 6193 || d.code === 6194) this.#ready = true;
  };

  async #flushAffected(
    program: ts.SemanticDiagnosticsBuilderProgram,
  ): Promise<void> {
    while (true) {
      const next = program.getSemanticDiagnosticsOfNextAffectedFile();
      if (!next) break;
      if (!('fileName' in next.affected)) continue;
      await this.#flushFile(next.affected.fileName, [...next.result]);
    }
  }

  async #flushFile(
    path: string,
    diags: readonly ts.Diagnostic[],
  ): Promise<void> {
    const versionId = await hashFileBytes(path);
    const raws = diags.map(toRaw);
    await CompileApi.recordDiagnostics(path, versionId, raws, {
      live: this.#ready,
    });
  }
}
```

### Cold-start populates the collection silently

When the watcher boots, the Compiler API emits diagnostics
for the entire program. Routing those live to mudlog would
firehose every author with the project's existing baseline.
The compromise:

- Each cold-start file flows through
  `recordDiagnostics(..., { live: false })` — the row lands
  in the collection but no `Events.CompileDiagnostic` is
  emitted.
- TS reports steady state via `WatchStatusReporter` (codes
  6193 / 6194). `#ready` flips on first observation.
- Subsequent rechecks pass `{ live: true }`, and mudlog gets
  the live notification stream.

Authors running `errors list` immediately after boot see the
real baseline; mudlog only fires for changes during the
session.

### Syntactic vs semantic diagnostics

`getSemanticDiagnosticsOfNextAffectedFile` is semantic-only.
Parse errors don't flow through it. To pick them up, sweep
`program.getSyntacticDiagnostics()` per affected file in
`afterProgramCreate`. v1 may ship semantic-only and add
syntactic in a follow-up; the design works either way. See
open questions.

### Watcher lifecycle and crash recovery

If `tsc` crashes mid-session, the watcher should restart
itself with backoff (3 attempts, exponential), then surface
a single `MudlogApi.fatal('compile', …)` if it gives up. The
collection retains the last known-good diagnostic state until
TTL expiry.

---

## Initialization and ownership

### Where the watcher is owned

`CompileWatcher` is its own backend singleton, parallel to
`PersistenceManager`. It does not live inside PM (different
domain — TS compilation lifecycle vs. Mongo lifecycle).

`Application.start()` boots it conditionally on
`process.env.NODE_ENV !== 'production'`, after PM is
connected. `Application.stop()` calls `watcher.stop()` before
`pm.disconnect()`.

In production (`node dist/index.js`), the watcher is never
started — there is no TypeScript source to watch and no
loader to recompile against. `errors list` against an empty
collection is a graceful degradation; no special-case logic
in the verbs.

### Where the collection is owned

`PersistenceManager` owns Mongo lifecycle. `CompileApi` asks
PM for the collection on each operation (or memoizes after
first call), matching `HotReloadApi`'s pattern at
`mud/api/hot-reload.ts:208`. Add
`CompileDiagnostics = 'compile_diagnostics'` to the
`Collections` enum, and add the three indexes to PM's
boot-time index-creation block.

### Wiring sequence

```
Application.start():
  1. PersistenceManager.connect()                    [prod + dev]
  2. PM creates indexes for compile_diagnostics      [prod + dev]
  3. CompileApi.startMudlogRouter()                  [prod + dev]
  4. if (NODE_ENV !== 'production'):
       CompileWatcher.start(tsconfigPath)            [dev only]
  5. WebSocket accept loop begins                    [prod + dev]

Application.stop():
  1. WebSocket accept stops
  2. CompileWatcher.stop()                           [if started]
  3. PersistenceManager.disconnect()
```

`startMudlogRouter` is safe in production even though the
watcher isn't running — it registers a listener that nothing
will ever fire. Cheap idempotent.

---

## Path resolution

`SourceTreeApi.resolvePath(cwd, userInput, { home })` is the
existing convention used by `CatController:128` and
`CdController:89`. The `errors` verb uses it identically:

```ts
const cwd = giver.getCwd('source');
const home = giver.getHome();
const abs = SourceTreeApi.resolvePath(cwd, model.path, { home });
const docs = await CompileApi.list({ pathPrefix: abs, ... });
```

`.` → cwd. Bare `lib/spatial` → relative to cwd. Leading `/`
→ absolute. Same rules as every other workspace verb. No
invention.

---

## Test plan

Vitest, colocated under `__tests__/` per project convention.

- **`compile.test.ts`** — `pathToChannel`, `expandSubscription`,
  `matches`, `recordDiagnostics` write/supersede/emit,
  `list` filter combinations, `clear`. Mock the Mongo
  collection via PM.
- **`compile-watcher.test.ts`** — drive the watcher with
  fixture programs (good source, bad source, transition
  good→bad→good); assert `recordDiagnostics` calls.
- **`errors-controller.test.ts`** — list/clear subcommand
  routing, `--path` resolution against a workspace fixture,
  empty-result message.
- **`compile-mudlog-routing.test.ts`** — install fake online
  avatars with assorted `compile.subscribe` settings, fire
  `Events.CompileDiagnostic`, assert mudlog calls.

---

## Open questions

1. **Admin gating for `errors clear`.** No verb-level
   capability mechanism exists in the YAML schema today;
   admin-shaped verbs (`eval`, `clone`, `destruct`) gate
   inside the controller via mixin checks. We deferred
   pinning this until "admin" is more concretely defined
   elsewhere; provisional plan is a controller-level check
   matching the precedent.

2. **`compile.subscribe` storage type.** `SettingTypes.List`
   is the natural shape but `settings set` rejects list
   types pending structured-value syntax. Options:
   (a) declare as `List`, accept that mutation requires a
   future `compile subscribe …` subcommand;
   (b) declare as `String` (comma-separated), parse on read,
   migrate to `List` later. (a) is the recommendation; (b)
   is the fallback.

3. **Syntactic diagnostics in v1.** Semantic-only is
   simpler. Syntactic diagnostics (parse errors) catch
   missing-brace-style bugs but in practice tsx already
   surfaces those at module load via
   `Events.ModuleReloadFailed`. Possibly redundant. v1 may
   ship semantic-only and add syntactic if the gap shows.

4. **"File went clean" notifications.** When a recheck
   produces zero diagnostics for a previously-broken file,
   suppress (default) or emit a positive `info`-level
   message. Suppression keeps mudlog quiet; emitting helps
   live tailers know they can stop worrying. Toggle via
   `compile.notifyOnClear` setting if both audiences exist.

5. **Multi-process / multi-server dev.** If two devs each
   run their own server pointing at the same Mongo, both
   watchers populate the same collection. The supersede
   logic dedups so this is correct, but it's churn. Could
   namespace by process ID or by author session. Probably
   YAGNI.

6. **TS configuration discovery.** `CompileWatcher.start()`
   takes a `configPath`. Reasonable defaults to find: the
   monorepo's `tsconfig.json`, or `packages/server/
   tsconfig.json`. The watcher should fail loudly on boot
   if no tsconfig is found rather than silently
   no-oping.

7. **Memory growth.** `tsc -w` running against a multi-pkg
   monorepo holds significant memory. In a 12-hour dev
   session this can grow. Acceptable for v1; revisit if
   actual measurements justify a periodic restart.

---

## What's intentionally out of scope

- **Production deploys.** The watcher is dev-only. A
  production server has no TS source on disk and no loader
  in the chain. `errors list` against an empty collection
  in prod is a graceful no-op.
- **Cross-platform paths.** Linux-only for now, mirroring
  hot-reload.md. The collection keys absolute paths
  verbatim.
- **Persistent audit log of compile activity.** Subscribers
  to `Events.CompileDiagnostic` keep their own ledger if
  they want one — same posture as hot-reload.md takes for
  `Events.Module*`.
- **Authoring-time integration with editor tooling
  (LSP).** A future concern. This slate is about the
  in-game shell experience, not browser-IDE integration.
- **Lint diagnostics.** Same shape would extend, but v1 is
  TypeScript-only. The channel taxonomy and listener
  pattern are designed to accommodate ESLint output later
  without API changes.
