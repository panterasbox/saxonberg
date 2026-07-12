# Author-diagnostics — implementation plan

> Phased plan derived from
> [author-diagnostics-requirements.md](../requirements/author-diagnostics-requirements.md)
> and [diagnostics-slate.md](../slates/builds/diagnostics-slate.md). Scope
> is closed; this is the *how*. One finding reshapes the command-path
> approach — see Risk #1.

## Orientation: what the code actually does vs. what the requirements assume

Three ground-truth findings that shape sequencing (details in Risks):

- **The command "chokepoint" is not `runRoot`.** `giver.executeCommand`
  (`mud/lib/command/CommandGiver.ts`) wraps controller dispatch in its own
  `try/catch` at **three** sites — the sweep-level catch (~L797), the sync
  `_dispatchResolved` catch (~L1152), and the async detached-body catch
  (~L1130) — each converting the throw into a
  `context.note({kind:'controller-error', …})` that already renders to the
  giver as *"Something went wrong in `<controller>`: `<detail>`"* (L118-119).
  Those throws **never propagate** to `command.ts`'s `catch` (L90) or to the
  `runRoot` planted in `Backend.processUserMessage` (`Backend.ts:245`). So a
  `runRootGuarded` wrapping `executeCommand` at `command.ts` sees **only
  residual framework escapes**, not authored-content controller throws. The
  substantive command-path capture must hook the existing controller-error
  emission. This is Risk #1 and drives Phase 3.
- **No TTL index exists anywhere** in `PersistenceManager.createIndexes()` —
  `expireAfterSeconds` is greppable-zero. The `diagnostics` TTL is
  first-of-kind (Phase 1).
- **`ExecutionContextApi` is bootstrap-special** (one of the four Apis that
  deliberately don't self-decorate; `CLAUDE.md` Session Notes). Adding a
  static that reaches `DiagnosticApi`/`ProvenanceApi` must use lazy/dynamic
  import to avoid a load-order cycle (Phase 2).

The frame-mutator allowlist (`execution-context.ts` L616-628) admits
`mud/lib/security/**`, `mud/api/**`, `backend/**`,
`mud/lib/command/CommandGiver`, `*.test.ts` — so `CommandGiver` *is* allowed
to plant/mutate frames, which keeps Phase 3's options open.

---

## Phase 1 — Store + Api/logic pair + pure taxonomy (foundation, independently mergeable)

No producers yet; stands up the sink and reader logic so every later phase
has a `DiagnosticApi.record`/`.list` to call.

**Files created/edited**
- `packages/types/src/index.ts` (edit) — add the wire vocabulary next to the
  existing note types: `DiagnosticSource = 'runtime'|'compile'|'console'`,
  `DiagnosticSeverity`, `DiagnosticDoc` (the per-row schema: `source,
  severity, channel, path, author, versionId, code, line, col, message,
  stack, ts, expiresAt`), `RawDiagnostic`, `RawConsoleLine`, `ListFilter`,
  `DiagnosticEvent`. **Reuse `ControllerErrorNote` (L407) verbatim** — no new
  note kind.
- `packages/server/src/backend/PersistenceManager.ts` (edit) — add
  `Diagnostics = 'diagnostics'` to the `Collections` enum (L31-66, after
  `ParcelEvents`); in `createIndexes()` (L591) add the four indexes:
  `{channel:1, ts:-1}`, `{author:1, ts:-1}`, `{path:1, versionId:1}`, and the
  TTL `{expiresAt:1}` with `{expireAfterSeconds:0}`. Mirror the commented
  block style of the `RenownEvents` section (L796+).
- `packages/server/src/mud/lib/diagnostics/DiagnosticRecord.ts` (new) — the
  row as a `Document` subclass (the `ChronicleEntry` precedent): public
  persistent fields (Hydrator reflects by name → **must be public**, never
  `#`), `static collection = Collections.Diagnostics`, `.save()`/`.find()`.
  **New subsystem folder `lib/diagnostics/`** is a legitimate Module Category
  home (Stuff class in `lib/<subsystem>/`), not a new category.
- `packages/server/src/mud/lib/diagnostics/DiagnosticChannel.ts` (new) — the
  pure channel taxonomy as a **value-object/vocabulary module**:
  `pathToChannel(absPath)`, `expandSubscription(patterns, ctx)`,
  `matches(channel, expanded)`. Pure, no gating, unit-testable in isolation.
  `DiagnosticApi` re-exports them as statics so the requirement's "homed by
  `DiagnosticApi`" holds while keeping the pure logic out of the proxy/gate
  path.
- `packages/server/src/mud/api/diagnostics.ts` (new) — `DiagnosticApi`
  forwarding shell (the `MudlogApi`/`mudlog.ts` exemplar: `StuffApi.singletonSync`
  + `HotReloadApi.getCurrentExport` resolving `DiagnosticLogic` at
  `/obj/api/diagnostics`). Statics: `record`, `recordDiagnostics`, `pushRaw`,
  `list`, `rawTail`, `clear`, `startRouter`, plus pure
  `pathToChannel`/`expandSubscription`/`matches`. Ends with
  `SecurityApi.decorateApiClass(DiagnosticApi)`. Producer-write statics
  (`record`/`recordDiagnostics`/`pushRaw`) gated to producer modules; reader
  statics forward to the logic gate.
- `packages/server/src/mud/obj/api/DiagnosticLogic.ts` (new) — `@internal
  @Unshadowable class DiagnosticLogic extends ApiLogic`, every method
  `@CallSecurity(FromModule('/api/diagnostics#DiagnosticApi'))` (the
  `MudlogLogic`/`ChronicleLogic` per-method gate pattern). Internal helpers as
  **module-private free functions** so there are no intra-singleton `this.x()`
  calls to trip the gate. `record` is the single structured-write path:
  derive `channel`/`author`, `expiresAt`, insert, supersede (`deleteMany
  {path, versionId≠}`), then best-effort deliver (Phase 3+). **Member
  privacy:** proxy-wrapped Stuff → any instance state is TS `private`, **never
  `#`** (Risk #8). The raw console ring does **not** live here — it lives on
  `ConsoleTap` (Phase 5).

**Tests**
- `lib/diagnostics/__tests__/DiagnosticChannel.test.ts` — the taxonomy table
  (zone/lib/command/api/global), `expandSubscription` `$cwd` expansion,
  `matches`.
- `mud/api/__tests__/diagnostics.test.ts` — `record` write/supersede, `list`
  filters (`channel`/`severity`/`source`/`mine`/`path`/`limit`), `clear`.

**Acceptance slice:** the `diagnostics` collection + schema + four indexes +
TTL; `DiagnosticApi` as the gated forwarding shell ending in
`decorateApiClass`; `pathToChannel`/`expandSubscription`/`matches` pure &
unit-tested.

---

## Phase 2 — `runRootGuarded` primitive (no adopters yet)

**Files**
- `packages/server/src/mud/api/execution-context.ts` (edit) — add `static
  async runRootGuarded<T>(target, method, fn: () => T | Promise<T>, policy:
  GuardPolicy): Promise<T | undefined>` as a sibling of `runRoot` (L577),
  **not** a change to `runRoot`. Same root-frame setup
  (`_assertFrameMutatorAllowed`, `_als.run([root], …)`), but it `await`s `fn`;
  on throw/rejection: resolve the offending path from the frame (resolved
  verb-controller path → `BehaviorBeat` brain path → script doc path →
  `target.getTemplatePath()`), then call `DiagnosticApi.record({source:'runtime',
  …})` (which internally derives channel + `authorOf` + delivers), then apply
  `policy`. `GuardPolicy = 'absorb' | 'rethrow' | 'swallow'`. **Use a lazy
  `import()` for `DiagnosticApi`/`ProvenanceApi`** inside the catch — not a
  top-of-module import — to avoid the bootstrap-Api cycle (Risk #3).

**Tests**
- `mud/api/__tests__/execution-context-guard.test.ts` — drive a
  throwing/rejecting `fn` under each policy; assert `DiagnosticApi.record`
  called once and `absorb` returns / `rethrow` throws / `swallow`
  returns-undefined. Assert a resolving `fn` is a transparent passthrough (no
  record).

**Acceptance slice:** `ExecutionContextApi.runRootGuarded` exists; policy
behavior tested with a throwing `fn`.

---

## Phase 3 — Command path adoption (FIRST adopter; the ordering-risk phase)

Two seams, both `absorb`, so control flow is preserved:

**Files**
- `packages/server/src/mud/lib/command/CommandGiver.ts` (edit) — **the true
  command-path capture.** At the existing controller-error emission sites —
  the sweep catch (~L791-802), the sync `_dispatchResolved` catch
  (~L1152-1158), and the async detached-body catch (~L1130-1137) — add a
  best-effort `DiagnosticApi.record({source:'runtime', message, stack, path:
  <resolved controller path>})` alongside the existing
  `context.note({kind:'controller-error', …})`. The note already delivers the
  real message to the giver (satisfies the "giver sees the real error" AC);
  `record` adds the store row + author push. `CommandGiver` is on the
  frame-mutator allowlist, so it may also read `getCurrentCommandContext()`
  for the giver. **The async site (~L1130) must be instrumented too** or
  async/`--async` command throws are silently uncaptured (Risk #6).
- `packages/server/src/backend/inbound/command.ts` (edit) — replace the `try
  { await giver.executeCommand(…) } catch { console.error(…);
  sendMessageToSocket({type:'error', message:'Command execution failed'}) }`
  (L88-96) with `await ExecutionContextApi.runRootGuarded(giver,
  'executeCommand', () => giver.executeCommand(…), 'absorb')`. This retires
  the generic *"Command execution failed"* socket frame and records the
  residual framework escapes that *do* reach here.

**Tests**
- `mud/lib/command/__tests__/command-diagnostics.test.ts` — a controller whose
  `execute` throws; assert (a) a `controller-error` note on the envelope with
  the real message, (b) a `diagnostics` row with resolved channel/author, (c)
  **no** generic *"Command execution failed"* frame. Cover both sync and
  async(`--async`) controllers.
- Extend the guard test for the `command.ts` escape path.

**Acceptance slice:** a thrown command produces the existing
`controller-error` note (real message, turn escalated) + a `diagnostics` row
+ author push (if online) + no generic *"Command execution failed"* frame +
**no** duplicate `MudlogApi.error` to the giver (Risk #1b resolved).

---

## Phase 4 — Scheduled/background + REST adoption (SECOND and THIRD adopters)

Sequenced after command per the ordering risk — each is an independent
control-flow change.

**Files**
- `packages/server/src/mud/api/schedule.ts` (edit) — `planRun` (L68-82)
  currently calls `runRoot`. Switch to `void
  ExecutionContextApi.runRootGuarded(ScheduleApi, 'fire', fn, 'swallow')`
  (record-and-swallow: a timer callback throw has no caller to rethrow to, and
  swallow also **fixes a latent bug** — a sync throw in today's
  `fireFixedDelay` kills the recurring reschedule, Risk #5).
- `packages/server/src/mud/obj/SchedulerRegistry.ts` (edit) — the emission root
  (`runRoot(SchedulerApi,'emission', …)`, L363) is where presence-gated brain
  ticks actually fire. Route through `runRootGuarded(…, 'swallow')` so
  NPC-brain throws are captured (matching today's `Behaved` per-brain catch,
  which keeps its `console.warn` for the ring).
- `packages/server/src/backend/CmsSession.ts` (edit) — `runAsSessionPlayer`
  (L56) wraps in `runRoot`; switch the inner run to `runRootGuarded(Backend,
  method, fn, 'rethrow')` so `sendCmsError` (`CmsRoutes.ts:49`) still maps the
  error to an HTTP status while the row is recorded. Keep the `tagActingAuthor`
  stamp inside.

**Tests**
- `execution-context-guard.test.ts` / `schedule-diagnostics.test.ts` — a
  throwing scheduled callback records + does not crash the loop; a recurring
  schedule survives a throwing tick.
- `CmsSession` test — a throwing REST op records **and** rethrows (status still
  maps).

**Acceptance slice:** "the command inbound path, `ScheduleApi`, and
`CmsSession.runAsSessionPlayer` route through it with their respective
policies" + the online/offline delivery matrix.

---

## Phase 5 — Console tap (Producer 2)

**Files**
- `packages/server/src/backend/ConsoleTap.ts` (new) — backend singleton
  (sibling of `PersistenceManager`; **backend layer → `#`-private is correct
  and safe**, it is *not* proxy-wrapped). `install()` wraps
  `console.log/info/warn/error`, appends each line to a `#ring` (default 1000,
  an `AppSetting`), and **passes through** to the original. `uninstall()`
  restores; wrap/unwrap **idempotent** (guard flag). Exposes `tail(filter)`.
  `DiagnosticApi.pushRaw`/`rawTail` forward here (ring lives on the backend
  singleton, not `DiagnosticLogic`, keeping the logic proxy-safe). Writes
  **only** to the ring, never the `diagnostics` collection.
- `packages/server/src/index.ts` (edit) — call `ConsoleTap.install()` as the
  **first statement** in `main()` (L38), before `AppBootstrap.run`, so boot
  logs are captured.

**Tests**
- `backend/__tests__/ConsoleTap.test.ts` — ring append + passthrough (spy the
  original) + wrap/unwrap idempotency.

**Acceptance slice:** `ConsoleTap` wraps at boot, ring default 1000,
passthrough, idempotent; `errors raw`/panel expose it wizard-only.

---

## Phase 6 — Compile watcher (Producer 3) + the event

**Files**
- `packages/server/src/mud/lib/events.ts` (edit) — add `Diagnostic:
  'diagnostic.recorded'` to `Events` (L34-51), `DiagnosticEvent` to
  `EventPayloads` (L82-127), and the `emittableBy(DiagnosticApi)` policy.
- `packages/server/src/backend/CompileWatcher.ts` (new) — backend singleton
  (`#`-private OK). TS Compiler API (`ts.createWatchProgram` +
  `createSemanticDiagnosticsBuilderProgram`) over
  `packages/server/tsconfig.json` (confirmed present; `typescript ^5.4.0` in
  deps). Semantic diagnostics only. `#ready` flips on status codes 6193/6194;
  cold-start batches → `DiagnosticApi.recordDiagnostics(path, versionId, raws,
  {live:false})`, post-ready → `{live:true}`. Supersede-on-recheck via the
  `{path, versionId}` index. Crash: backoff ×3 then one `MudlogApi.fatal('compile',
  …)`. Fail loudly if tsconfig absent.
- `packages/server/src/backend/AppBootstrap.ts` (edit) — in `run()` tail (after
  L254), boot the watcher **only when `process.env.NODE_ENV !== 'production'`**,
  and call `DiagnosticApi.startRouter()` (idempotent delivery-listener
  registration) unconditionally.

**Tests**
- `backend/__tests__/CompileWatcher.test.ts` — fixture good→bad→good programs;
  assert `recordDiagnostics` call shape, cold-start `live:false`, supersede
  clears the fixed error.

**Acceptance slice:** dev-only semantic-diagnostic stream, cold-start
`live:false`, fixture supersede.

---

## Phase 7 — Reader A: the `errors` verb

**Files**
- `packages/server/src/mud/cmd/system/errors.yaml` (new) — category `system`
  (the `clear.yaml`/`bulletin.yaml` template). Subcommands `list` (default),
  `raw`, `clear <path>`; flags `--path`, `--channel`, `--severity`,
  `--source`, `--mine`, `--limit`, `--grep`. `subscribe` subcommand reserved
  for `compile.subscribe` mutation.
- `packages/server/src/mud/obj/command/system/ErrorsController.ts` (new) —
  routes subcommands to `DiagnosticApi.list`/`rawTail`/`clear`. `--path`
  resolved via `SourceTreeApi.resolvePath` (workspace-relative). Gating lives
  in `DiagnosticLogic` (context-derived actor via `getActingAuthor`,
  `AccessApi.isAuthor`/`isWizard`): `raw`→wizard-only, `clear`→wizard-or-author-of-path,
  `list` content channels→author. Graceful empty-result messaging.
- `packages/server/src/mud/lib/shell/Author.ts` (edit) — add
  `'system/errors.yaml'` to `commandContributions.self` (L64+) and add a
  `compile.subscribe` entry to `static settings` (L42) as `SettingTypes.List`
  (confirmed in `Environment.ts:55`), `default: ['$cwd','global']`. The
  `settings set` list-write gap is acknowledged (Risk #7).

**Tests**
- `mud/obj/command/system/__tests__/ErrorsController.test.ts` — subcommand
  routing, `--path` resolution, `--mine`, `raw` wizard-gate, `clear`
  author/wizard gate, empty-result prose.

**Acceptance slice:** the `errors` verb list/raw/clear with filters, gating,
graceful empty.

---

## Phase 8 — Reader B: CMS route + client panel

**Files (server)**
- `packages/server/src/backend/CmsRoutes.ts` (edit) — add `app.get('/api/cms/diagnostics',
  requireAuth, …)` mirroring the `/api/cms/tree` handler (L90): parse query
  (`channel/severity/source/mine/path/limit`), bind 1:1 through
  `CmsSession.runAsSessionPlayer(req, 'cms.diagnostics', () =>
  DiagnosticApi.list(filter))`, `sendCmsError` on throw. **No new
  authorization surface** — the gate lives in `DiagnosticLogic`.
- `packages/server/src/mud/config/app-settings.yaml` + `AppSettingKeys` (edit)
  — add the poll-cadence knob (+ the console-ring size from Phase 5).

**Files (client)**
- `packages/client/src/components/cms/cmsClient.ts` (edit) — add a
  `diagnostics(filter)` fetch (the `tree`/`read` method shape, L78-94).
- `packages/client/src/store/cmsSlice.ts` (edit) — extend the REST-only slice
  with `diagnostics` state + a `cmsPollDiagnostics` action; **poll via
  `setInterval` in a `useEffect`** at the settable cadence (no WS — the
  `cms-delta` WS is explicitly deferred).
- `packages/client/src/components/cms/CmsDiagnosticsPane.tsx` (new) +
  `CmsSurface.tsx` (edit) — add a third `ModeTab` beside Files/Kinds
  (L94-113); rows default `?mine=true`, toggle to subscribed channels,
  click-through to the file/template in the explorer (reusing `cmsOpen`).

**Tests**
- `backend/__tests__/CmsRoutes.diagnostics.test.ts` (the
  `BulletinRoutes.test.ts`/`HelpRoutes.test.ts` harness) — route binds to
  `DiagnosticApi.list`, adds no authz.
- `client/src/store/__tests__/cmsSlice.diagnostics.test.ts` — poll action
  populates state; filter round-trip.

**Acceptance slice:** `GET /api/cms/diagnostics` mounted, bound through the
attribution bridge, polling panel with click-through.

---

## Phase 9 — Docs + sweep (at `/finalize`)

- `docs/subsystems/diagnostics.md` (new) — source of truth.
- `CLAUDE.md` (edit) — Documentation Map entry + `Diagnostics = 'diagnostics'`
  in the Collections list (L634+).
- Retire `docs/slates/builds/diagnostics-slate.md` per workflow rules.
- `pnpm lint`, `pnpm lint:gates`, `pnpm test` green.

---

## Risks & requirement-vs-code disagreements

1. **The command "one chokepoint" claim is false against the code.**
   Controller throws are absorbed into `controller-error` notes inside
   `CommandGiver.executeCommand` (L797/L1130/L1152) and never reach `runRoot`
   or `command.ts:90`. `runRootGuarded` at `command.ts` captures **only
   residual framework escapes**. The plan puts the substantive command capture
   at the existing controller-error emission sites (Phase 3) and treats
   `command.ts`'s guard as the residual-escape + generic-frame-retirement
   path. **Biggest divergence — get reviewer sign-off on the two-seam
   approach.**
   - **1b. RESOLVED — the note suffices.** The existing `controller-error`
     note (L118-119) is the giver's real-error surface on the command path;
     do **not** additionally fire `MudlogApi.error` to the giver (no
     double-surfacing). `MudlogApi.error` is reserved for the author push
     and for non-command runtime throws (scheduled/brain ticks, which have
     no note). Phase 3's `command-diagnostics.test.ts` asserts the note +
     `diagnostics` row + author-push, and **no** duplicate mudlog line to
     the giver.
2. **Async detached command bodies** (`--async`, `runDetachedBody` + its own
   `runRoot` at `CommandGiver.ts:196`) have a *separate* controller-error catch
   (~L1130). Must be instrumented or async throws go uncaptured.
3. **Bootstrap-Api cycle.** `ExecutionContextApi` is bootstrap-special and
   doesn't self-decorate; `runRootGuarded` must reach
   `DiagnosticApi`/`ProvenanceApi` via lazy import to avoid a load-order cycle.
4. **Author push resolution gap.** `ProvenanceApi.authorOf` returns a **path
   string**, not a live `Sensor`. Delivery must resolve author-path →
   `playerId` → `PlayerApi.findAvatarByPlayerId` (`player.ts:94`) → online
   Avatar (a `Sensor` for `MudlogApi.error({to})`); offline → store-only.
   `MudlogLogic.resolveRecipients` throws when there's no recipient — the
   author-push call must pass `opts.to` explicitly, never rely on the giver
   fallback.
5. **`ScheduleApi` swallow changes behavior (and fixes a bug).** Today a sync
   throw in `planRun` kills the recurring reschedule (`fireFixedDelay`
   L148-153). `swallow` fixes it; existing schedule tests may assume the
   current propagation.
6. **TTL index is first-of-kind** in `PersistenceManager` — no
   `expireAfterSeconds` precedent; verify against the Mongo Atlas deployment
   target.
7. **`compile.subscribe` has no write path.** `settings set` lacks List-type
   mutation (acknowledged in requirements). Declare the `SettingTypes.List`
   schema now; the `errors subscribe` subcommand is reserved, not built — the
   setting is inert-writable in v1.
8. **`#` vs `private` split (explicit):** `DiagnosticLogic` is proxy-wrapped
   Stuff → **all instance state TS `private`, internal helpers as
   module-private free functions** (the `ChronicleLogic` pattern; `#` on a
   mixin/Stuff method throws). `ConsoleTap`/`CompileWatcher` are backend
   singletons (not proxy-wrapped) → **`#`-private is correct**. The raw ring
   therefore lives on `ConsoleTap` (`#ring`), never on `DiagnosticLogic`.
   Persistent fields on `DiagnosticRecord` stay **public** (Hydrator reflects
   by name).
9. **Console-tap placement:** `index.ts main()` first statement (before
   `AppBootstrap`), the earliest backend boot point, so the boot baseline is
   in the ring.
