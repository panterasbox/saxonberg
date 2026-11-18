# Failure model — implementation plan

This plan executes
[failure-model-requirements](../requirements/failure-model-requirements.md)
(owner-agreed 2026-11-18, scope closed). **Kind:** refactor/sweep with a
feature edge. **Lead end:** kernel. It gives failure a model: a reason is a
document any pack ships; a refusal is one thing whether returned or thrown;
the guarded roots word it from its row; a script stops at a refusal and can
handle it with `try … on`; a content error reaches the row's maintainer; an
outage says *try again*; and four census ratchets hold the silence that is
left. First consumers: the boundary verbs, the five ad-hoc thrown refusals,
three shell reasons, the interrupted step, and one forestry reason.

Seeding slates:
[failure-model-slate](../slates/tech-debt/failure-model-slate.md) (its
evidence items 1–10 are the defect ledger; cited below as **E1–E10**) and
[silent-write-census-slate](../slates/tech-debt/silent-write-census-slate.md)
(absorbed).

## ⚠ Requirements problems

Nothing found that makes the requirements unbuildable, and no scope is
changed here. Seven places where the requirements and the code disagree, or
where the plan had to choose a reading. The owner should confirm 1, 3 and 4.

1. **`interrupted` is not an abort reason today.** The requirements say timed
   steps *"already end with a coded abort reason (interrupted, …)"*. The
   registered reasons are `cancelled`, `replaced`, `preconditions-changed`,
   `host-destroyed`, `thrown` and subsystem ones (`lib/activity/Engaged.ts:58`);
   none is `interrupted`. **Reading taken (D5):** `interrupted` is the
   *refusal reason* a script handles, and the step's abort reason is one of
   its facts (`$why.abort`). `thrown` is excluded: it is a bug.
2. **`open north` on a locked door does not answer `locked` today.** It
   answers `cannot-open` with the door's own sentence as a fact
   (`lib/spatial/Sealable.ts:73`, `platform/thing/Door.ts:125`). Drive step 1
   therefore needs a protocol change to `Sealable.canOpen`, which the water
   pack's `Gate` also implements (D10). In scope as a first consumer; named
   here because the requirements list only the verbs.
3. **A pack's reason is written as its full path in a script**
   (`on /trade/forestry/reasons/wrong-tool`). That is the requirements'
   own rule (*"the code is the row's address … namespaced by its root and
   resolves by path when used"*) applied literally, and it matches the
   shipped `shape:` rule (a bare word is the platform's, a path is any
   pack's). It is honest and it is long. A shorter spelling would need a
   typed-word index, which the requirements ruled out.
4. **An interrupted step's handler runs when the step's expected end is
   reached, not at the interruption.** The coroutine's await-engaged wake is
   scheduled for the step's duration (`lib/script/Coroutine.ts:260`), and
   this build does not redesign that. Drive step 11 advances the staged
   clock. Recorded as a deferred seam.
5. **Late failures have no drive step and no acceptance criterion.** They are
   proved by unit tests only (W3).
6. **The census figures.** Confirmed this cycle: 34 error classes, 929
   `throw new Error(`, 2,272 `return null;`, 1,133 catch clauses, 267
   `void call(` lines, 1,670 `ok: false`. Distinct `reason: '<code>'`
   literals measure **705** by the regex the ratchet will use, against the
   requirements' *"at least 210"*. The requirements' figure is a floor, so
   there is no conflict; the ratchet's own number is the number of record.
7. **`DocumentApi.save` validates only command views today**
   (`platform/idea/api/DocumentLogic.ts:660`), so a wizard's bad recipe saved
   through the CMS is stored. Drive step 8 says the write is refused. D6
   makes a save run the installer's validator. This changes what a CMS save
   accepts for the kinds that have a validator.

## Grounding

Verified this cycle by opening each file. Paths are under
`packages/server/src/mud/` unless they start `packages/` or `docs/`.

### Refusals as they are

- `lib/errors.ts` holds `VetoResult`, `DestructError`, `DetachedError`,
  `DocumentNotResidentError`. Its header says the file is the home for
  *"we're saying no, with a reason"* shapes, thrown and returned, that any
  subsystem might use.
- `lib/craft/ActPlan.ts` declares `ActRefusal<R, X> { ok: false, reason,
  facts }`, `AnyActRefusal`, `ActOutcome`, `ActChoices`, `ActAnswer`. Its
  header states the doctrine this build changes: each protocol file declares a
  **closed** reason union, and the controller words each in an exhaustive
  `switch` with a `never` arm.
- `lib/command/CommandController.ts:391` already has
  `protected refuse(context, topic, line, reason, detail?)`: it sends the
  line and notes `controller-rejected`. **135 call sites.** `engagePlan`
  (`:193`) words a plan's refusals through `words.onRefused` and notes
  `controller-rejected`; a refusal returned by a *completion* is spoken and
  **not noted** (`:204`), and a completion that throws is `console.error`ed
  (`:233`).
- `kind: 'controller-rejected'` appears on 466 lines (kernel and pack `src/`).
- The five ad-hoc thrown refusals:
  `SettleRefused` (`lib/banking/Charge.ts:101`; six reasons; thrown nine
  times in `platform/idea/api/BankingLogic.ts`, caught only by
  `platform/idea/cmd/employment/TipController.ts:87`);
  `BoardRefusal` (`lib/forum/Board.ts:40`; thrown in `ForumsLogic`, worded by
  `platform/idea/cmd/social/ForumControllerBase.ts:114`);
  `DocumentRefusal` (`lib/document/StoredDocument.ts:62`; thrown at
  `DocumentLogic.ts:657`, worded by `SoulControllerBase.ts:38`);
  `WikiDenied` (`platform/idea/WikiRegistry.ts:143`; no reason, eleven throw
  sites with eight distinct sentences, worded by
  `platform/idea/cmd/system/WikiControllerBase.ts:91`);
  `ScriptLineRefused` (`lib/command/CommandGiver.ts:233`; an empty marker).
- Boundary: `lib/boundary/Lockable.ts:76` declares
  `LockRefusalReason = 'already-locked' | 'already-unlocked' | 'no-key'`;
  `UnlockController` and `LockController` word them inline.
  `lib/spatial/Sealable.ts:73` declares `OpenRefusal` (`cannot-open {why}`,
  `already-open`, `no-setting`, `bad-setting`); `canOpen(by): VetoResult` has
  three implementers (`Sealable.ts:221`, `platform/thing/Door.ts:125`,
  `packages/content/water/src/thing/Gate.ts:142`) and two callers
  (`Sealable.ts:227`, `lib/spatial/Throttleable.ts:144`).
- Forestry: `packages/content/trade-forestry/src/lib/Fellable.ts:86` declares
  `FellRefusal` (`wrong-tool`, `no-such-species`, `stand-empty`,
  `not-yet-a-tree`); `FellController.refusalWords` words them.

### The envelope and the guarded roots

- `packages/types/src/index.ts`: `ControllerRejectedNote { reason, detail? }`
  (`:507`), `CommandRejectedNote` with nine closed reasons and an optional
  `suggestion` (`:572`), `ControllerErrorNote { controller, detail }`
  (`:673`), the `Note` union (`:920`), `AbortReasonRegistry` (`:709`),
  `RuntimeDiagnostic` (`:4781`), `StuffRef` (`:15`).
- `docs/subsystems/response-envelope.md` § *Note kind versioning*: kinds are
  append-only and per-kind frozen; a changed shape ships under a new kind
  name.
- `platform/idea/api/CommandLogic.ts:229` holds `autoEscalationFor` and the
  private `CommandContext` implementation; `api/command.ts:115` is the
  interface (`note`, `setStatus`, `getNotes`, `getStatus`,
  `requireInteractive`).
- `lib/command/CommandGiver.ts`: `proseForFrameworkNote` (`:99`) words
  dispatcher notes; `controller-error` is worded
  `Something went wrong in ${controller}: ${detail}`, **which is the raw
  exception text**. `recordControllerThrow` (`:255`) is a module-private
  function. `emitDispatchResponse` (`:269`) is synchronous: it runs the prose
  sweep, then sends the envelope. A thrown error is caught at four sites:
  the outer catch (`:1062`), the detached script run (`:1036`), and
  `_executeOne`'s detached (`:1783`) and inline (`:1803`) bodies.
  `_dispatchBound` (`:1834`) mints a context with `commandText: ''` and never
  emits an envelope.
- `api/execution-context.ts:1021` `runRootGuarded` records through
  `_recordGuardError` (`:382`, a dynamic import of `DiagnosticApi`).
  `api/schedule.ts:145` `planRun` carries `causingCommandId` and
  `causingAuthor` onto the fresh root and uses the `swallow` policy.
- `platform/idea/SchedulerRegistry.ts:586` `safeInvokeComplete` catches a
  synchronous throw, `console.error`s it and aborts with `thrown`; a
  completion that returns a promise is not awaited (the
  silent-write-census's *async completion has no root*). `Engagement` is an
  interface (`api/scheduler.ts:61`); the registry stamps `engagementId` and
  `startedAt` onto the object. Nothing records how an engagement ended.
- The client ignores an unknown note kind (`packages/client/src/services/websocket.ts:1150`, `:1208`).

### Scripts

- `lib/script/Interpreter.ts`: `evalCommand` (`:300`) yields a `dispatch`
  effect and returns `undefined`. `bindCommand` (`:620`) notes
  `parse-failed` / `unknown-verb` / `needs-input` / `bind-failed` /
  `shape-fall-through` and returns `null`; the script continues.
  `renderScalar` (`:786`) refuses to bind a `Stuff` into a command argument.
  `ResourceLimitError` (`:135`) is a class local to this file.
- `lib/script/Coroutine.ts:173`: after a dispatch the pump records the
  context's notes and **continues**. An interpreter throw that is not a
  resource limit is `console.error`ed and the run settles with nothing said
  (`:158`). `suspendUntilEngaged` (`:241`) wakes at the step's duration and
  re-checks every 0.5 game-seconds; it cannot tell a completed step from an
  aborted one.
- `lib/script/builtins.ts` `SCRIPT_BUILTINS`: `set if each while def wait
  every when`. `lib/script/Value.ts` `ScriptValue = string | number | boolean
  | Stuff | StuffList | Block | undefined`.
- **Member access does not exist**, but the lexer already admits a dot in a
  variable name (`lib/command/parsers/script.ts:78` `isNameChar`, and
  `lib/script/Expression.ts:98`), so `$why.target` lexes as the one name
  `why.target` and misses in `Scope.get`.
- `lib/script/AbortReason.ts` already declares `step-declined`: *a dispatched
  command declined and the script chose to halt*. Nothing produces it.
- `platform/idea/api/ScriptLogic.ts`: `startAndDetach` (`:265`) threads the
  run's notes onto the ambient context and says *"The script stopped (…)"*
  on an abort. `parseSourceToScript` (`:365`) returns `null` on a parse
  error, so a stored script that does not parse is silently *not found*.
- The parser (`lib/command/parsers/script.ts`) may return a promise
  (`api/command.ts:316`); `ParseResult` (`api/command.ts:294`) carries
  `error?: string` and no suggestion.
- MQL: `#<stuffId>` names one thing for everyone
  (`api/mql/resolver.ts:395`); the binder's perception gate still applies.

### Documents, diagnostics, title

- `lib/document/DocumentKinds.ts`: the closed kind vocabulary. A document's
  path is `<pack root>/<contentDir>/<name>` (content-packs.md § root). The
  precedent for a pack-extensible vocabulary is `shape`
  (`/platform/shapes/*`; *"a bare word is the platform's, a path any
  pack's"*) and `placement`. `standby-reason` exists and is unrelated (a
  streamer's away label).
- `lib/document/DocumentCatalogue.ts`: `ensure` (async load by path), `need`
  (sync, throws `DocumentNotResidentError`), `peek`, `under(prefix)`,
  `forget`. Every family's catalogue is a singleton at
  `/platform/idea/<Family>Catalogue` reached through its domain Api
  (`ContainmentApi.shapes()`, `api/containment.ts:203`).
- `platform/idea/api/PackLogic.ts:181` `DOCUMENT_VALIDATORS`: the installer
  validates each shipped document by kind (`recipe: Recipe.fromData`).
  `lib/craft/Recipe.ts:447` `fromData` does **not** check `baseGradeBand` or
  an input slot's `minGrade`; `Grade.of` (`lib/craft/Grade.ts:53`) throws a
  `RangeError` at use (`Recipe.ts:823`). 339 recipe lines carry a band (E2).
- `platform/idea/api/DiagnosticLogic.ts`: `record` (`:294`) stamps the
  provenance author; `list` (`:358`) already shows a row only to a subject
  who holds an extent over the row's `path` (or maintains its pack); the
  live push (`:244`) goes to the provenance author or a pack's maintainers.
- `api/parcel.ts:91` `ParcelApi.ownerOf(path)`; `:125` `resolveOwnerRef`.
- `api/persist.ts` `PersistApi` is the mudlib's door to Mongo: `Document`
  reads and writes through it (`lib/persistence/Document.ts:261–332`).
- `api/test-harness.ts` `TestHarnessApi` holds the `@TestOnly` stagers; the
  wire harness reaches them over `/auth/test-*` routes
  (`packages/server/src/services/auth/TestAuthRoutes.ts:305`,
  `packages/wire/src/harness/world.ts:494`). `testharness vanish #<id>`
  exists.

### Gates this build meets

- `scripts/check-boundary-roles.ts:73` `COMMONS_CEILING = 37`; every
  document family's catalogue declares `commons`.
- `scripts/check-lib-statics.ts`: a ratchet on statics of `lib/` value
  classes.
- `scripts/check-data-ideas.ts`: a new data-only `Idea` fails (P10).
- `scripts/check-reconcile-chains.ts` is the shape a census script takes:
  an exported ceiling constant, `--lint` and `--report`, `pack-roots` for the
  walk. `lint:family` derives its roster from `package.json`.

## ⭐⭐ New substrate

Ten entries. Five classes are deleted and four added.

| # | Item | Reuses, or genuinely new |
|---|---|---|
| S1 | Document kind **`reason`** (`contentDir: reasons`) | **Genuinely new.** Searched `DocumentKinds.ts` (every kind), `standby-reason` (a stream label), the `Reading` rows (an Idea roster, pre-P10). Shape copied from `shape` / `placement`. |
| S2 | **`ReasonCatalogue`** at `/platform/idea/ReasonCatalogue` | Reuses `DocumentCatalogue<T>`: the catalogue every document family has. |
| S3 | **`Reason`** value class, `lib/command/Reason.ts` | The value class over a document (`Shape`, `Placement` precedent). |
| S4 | **`Refusal`**, **`Unavailable`**, **`ContentError`** in `lib/errors.ts` | Generalizes `SettleRefused`, `BoardRefusal`, `DocumentRefusal`, `WikiDenied`, `ScriptLineRefused`, all deleted. |
| S5 | Note kind **`refused`** in `@saxonberg/types` | **Genuinely new**, by response-envelope.md's rule that a changed shape ships under a new kind. |
| S6 | `CommandContext.refuse()` / `getRefusal()`, and the wordless overload of `CommandController.refuse` | Generalizes the existing `refuse` (135 callers) and `engagePlan`'s `turnDown`. |
| S7 | `CommandApi.reasons()` and `CommandApi.reportFailure()` | `reasons()` is the family accessor. `reportFailure` folds `recordControllerThrow`, four inline `controller-error` notes, `_recordGuardError`'s body and three `console.error` catches into one routine. |
| S8 | Script: builtin **`try`**, `ScriptHalted` (local to `Interpreter.ts`), `Refusal` as a `ScriptValue`, the dotted read in `Scope.get`, a `Stuff` rendered as `#<id>` | `try` is **genuinely new** and justified only because it needs lazy block arguments (scripting.md § Growing the language). `ScriptHalted` follows `ResourceLimitError`. |
| S9 | `Engagement.endedBy` | A third field the registry stamps, beside `engagementId` and `startedAt`. |
| S10 | `PersistApi.failNext`, `TestHarnessApi.failDatastore`, `TestHarnessApi.forceDocument` (all `@TestOnly`), two `/auth/test-*` routes | The `TestHarnessApi.stage` pattern. |

Four new lint scripts (W4) are gates, not substrate.

### P9–P14, per item

| Item | P9 predictable | P10 document | P11 no caller branching | P12 no synonym | P13 right home | P14 nothing invisible |
|---|---|---|---|---|---|---|
| S1 `reason` kind | A row is a file a player can read; `try`'s help names it | It is a document | n/a | Not `standby-reason` (a different thing, different readers) | `DocumentKinds` is the kind vocabulary | n/a |
| S2 `ReasonCatalogue` | n/a | Serves documents | Readers call `find` / `ensure`; none asks which pack | One catalogue per family | A catalogue serves one kind | Loads on use, by path |
| S3 `Reason` | n/a | Value over the document | `say(facts)` decides the wording; callers never switch on the reason | n/a | Its sentence: *one reason, its facts' shape and its wording* | n/a |
| S4 `Refusal` family | n/a | n/a | Roots classify in one routine; throwers never ask who catches | Replaces five names with one | `lib/errors.ts`'s header is exactly this | A thrown refusal words identically to a returned one (AC) |
| S5 `refused` note | The envelope a client reads; documented in response-envelope.md | n/a | n/a | Not a second `controller-rejected`: that kind keeps its frozen shape for unmigrated controllers | The `Note` union | n/a |
| S6 `context.refuse` | n/a | n/a | In-frame or late is decided inside `refuse`, never by the caller | Same method name; the wordless overload replaces the worded one | The accumulator is where a controller says what happened | Wording is the row's; nothing is added |
| S7 `reportFailure` | n/a | n/a | One classifier; a root never tests the error's class itself | Replaces `recordControllerThrow` | `CommandApi` owns the envelope | A bug is never swallowed: it always records |
| S8 `try` / `$why` | `script` and `do` help say a script stops at a refusal and how `try … on` handles one | n/a | n/a | No second spelling of `if` | `SCRIPT_BUILTINS` | `on *` never hides a bug or content error; `$x` renders as `#id` for that exact thing |
| S9 `endedBy` | n/a | n/a | n/a | n/a | The engagement's own state | Stamped where the engagement ends |
| S10 test seams | n/a | n/a | n/a | n/a | `TestHarnessApi` is the staging home | `@TestOnly`: withheld outside a test world |

## Plan-level decisions

### D1. A reason is a document, addressed by path

`reason` is a document kind (P10: nothing writes one, it is read by path).
`ReasonCatalogue` serves it; `CommandApi.reasons()` reaches it
(`StuffApi.singletonSync`, the `shapes()` shape).

- **Path:** `<pack root>/reasons/<code>`. The platform pack's are
  `/platform/reasons/<code>`; forestry's are `/trade/forestry/reasons/<code>`.
- **Code rule** (the `shape:` rule): a bare word is the platform's; anything
  else is an absolute path. The canonical code of a platform reason is the
  bare word; of a pack's, its path. The rule is two instance methods on the
  catalogue, `pathOf(code)` and `codeOf(path)`. Not statics on a value class
  (`lint:lib-statics`).
- **In TypeScript:** `new Refusal('locked', { target })` and
  `new Refusal('/trade/forestry/reasons/wrong-tool', { tool })`.
- **In the envelope:** `refused.reason` is the canonical code.
- **In a script:** `on locked`, `on /trade/forestry/reasons/wrong-tool`, `on *`.
- **Load:** on use, by path. `ensure(path)` where a row must exist;
  a new `find(code): Promise<Reason | null>` where a miss is honest (an
  unmigrated code). **No boot entry, no `needs` entry, no `words:`** (a
  reason is not a typed word; it is namespaced by root).
- **The parse-time check never searches a roster:** it calls
  `find(code)`. Only when that misses does it read the one directory the
  code names (`under(dirOf(path))`, a prefix read) to fit a suggestion.
- `ReasonCatalogue` declares `boundaryRole = 'commons'`, so
  `COMMONS_CEILING` moves 37 → 38. **Caller audit:** every refused command
  inside a circle is worded through it, and a parcel-bound script's `try`
  resolves through it. That is the role's definition, and it is what every
  other document family's catalogue declares.

### D2. The row

```yaml
# packages/content/platform/content/reasons/locked.yaml  →  /platform/reasons/locked
facts:
  target: thing
says: "{{ target | item | cap }} is locked."
```

- `facts`: a map of fact name → kind. Kinds: `thing` (a `Stuff`), `things`
  (a list of them), `text`, `number`. A trailing `?` marks an optional fact
  (`why: text?`). Absent means no facts.
- `says`: a Liquid template rendered through `ProseApi`
  (`ProseApi.compile` once at parse, `renderCompiled` per use). Thing facts
  are passed as the live `Stuff`, so the shipped presentation filters apply
  (`item`, `location`, `name`, `article`, `cap`). Text and number facts are
  escaped by the engine's output handler.
- `topic` (optional): the message topic the line is sent on. Default
  `act.deed`, which is what `open` and `unlock` use today.
- `catchable` (optional, default `true`): `false` on the two rows that word
  a defect (`content-error`, `went-wrong`). A script may never name them.
- **`ReasonCatalogue.parse` refuses** (at install and at a save): a `says`
  that does not compile; a `says` that names a variable not in `facts`; an
  unknown fact kind; an unknown key.
- `Reason` (value class) methods: `getPath()`, `say(facts): Mml`,
  `mismatch(facts): string | null` (which fact is missing or of the wrong
  kind), `toWire(facts)`, `getTopic()`, `isCatchable()`.
- **Wire facts:** a thing is a `StuffRef`, a list is `StuffRef[]`, text and
  number are themselves.
- A `Refusal` whose facts do not fit its row is a **bug**: it is still worded
  with what is there, and a diagnostic is recorded. `lint:reason-rows` checks
  literal sites statically (D7).

### D3. One thrown family, in `lib/errors.ts`

```typescript
export class Refusal extends Error {
  constructor(reason: string, facts?: RefusalFacts, opts?: { at?: string; cause?: unknown });
  readonly reason: string;          // canonical code
  readonly facts: RefusalFacts;     // Readonly<Record<string, Stuff | readonly Stuff[] | string | number>>
  readonly at?: string;             // the script line that was refused
}
export class Unavailable extends Refusal { /* reason 'unavailable', facts { what: text } */ }
export class ContentError extends Error {
  constructor(row: string, field: string | null, message: string, opts?: { what?: string; cause?: unknown });
}
```

- `lib/errors.ts` is an existing named-vocabulary module whose header is this
  concept. **No new module category, no new exported function, no statics.**
- A returned refusal stays what it is: `{ ok: false, reason, facts }`
  (`AnyActRefusal`). `Refusal` and `AnyActRefusal` share `reason` and
  `facts`, and `context.refuse` takes either (D11). That is what makes a
  thrown refusal and a returned one the same thing downstream.
- `Unavailable` is a `Refusal` because its consumers act as on a refusal
  (the player is told, a script may catch it). It is a separate class because
  one consumer acts differently: the root also records a diagnostic.
- `ContentError` is not a `Refusal`: no script may catch it.
- A bug stays a plain `Error` (or a `RangeError`, `TypeError`, …). A
  chokepoint breach stays what it is (`DetachedError`, the bank's floor): it
  reaches a player only as a bug.
- **The five fold in.** Each `throw new SettleRefused('x', msg)` becomes
  `throw new Refusal('x', facts)`; the reason *type* unions stay beside
  their subsystem (`SettleRefusalReason` in `Charge.ts`) as the list of codes
  that subsystem throws. `TipController` keeps its one decision:
  `err instanceof Refusal && err.reason === 'insufficient-coin'` falls
  through to the transfer; anything else is rethrown for the root.
  `ScriptLineRefused` becomes `new Refusal('parse-failed', { detail })`
  thrown to the same catch, which now words it (the `outer.note` before the
  throw is removed, so there are not two notes).
- **Compile-time exhaustiveness.** `ActPlan.ts`'s header is rewritten:
  a protocol file still declares a closed union of the **kernel** codes it
  answers (so the compiler still lists them), and may add an open arm
  `ActRefusal<ReasonPath, RefusalFacts>` where a pack host must be able to
  add its own; `ReasonPath` is `` `/${string}` ``, exported from
  `lib/errors.ts`. The exhaustive wording `switch` disappears from a migrated
  controller, and its job (*every reason has words*) moves to
  `lint:reason-rows`, which fails when a code a migrated site passes has no
  row. No kernel protocol takes the open arm in this build; forestry's
  protocol is the pack's own.

### D4. The envelope carries the code and the facts

A new note kind in `packages/types/src/index.ts`:

```typescript
export type RefusalFactWire = StuffRef | StuffRef[] | string | number;
export interface RefusedNote {
  kind: 'refused';
  reason: string;                               // canonical code
  facts: Record<string, RefusalFactWire>;
  at?: string;                                  // a script line, when a script stopped here
}
```

- `autoEscalationFor('refused')` → `declined`.
- **Why a new kind, not fields on `controller-rejected`:**
  response-envelope.md freezes a kind's shape and says a changed shape ships
  under a new name. It also makes migrated and unmigrated emissions
  distinguishable by kind, which the ratchet counts.
- **Coexistence.** An unmigrated controller still sends its own line and
  notes `controller-rejected`; nothing about it changes.
- **Wording moves to emit time.** `emitDispatchResponse` becomes `async`
  (all its callers are already in async bodies). For each `refused` note it
  loads the row (`reasons().ensure`), renders `say(facts)` and sends the line
  on the row's topic, before the envelope goes. A `refused` note with `at`
  is worded through the `script-stopped` row (D5).
- `controller-error` keeps its kind and shape, and **its `detail` stops
  being the exception text**: it carries the worded sentence. The exception
  message and stack live only in the diagnostic. (AC: no raw exception text.)
- Three `command-rejected` reasons get rows: `needs-input`, `parse-failed`,
  `bind-failed`, each with the fact `detail: text?`. Their arms leave
  `proseForFrameworkNote` and are worded from the row; a `suggestion` on the
  note is still appended as the tappable link. The other six reasons stay on
  the legacy arms.

### D5. Scripts stop, and can handle it

**What counts.** After a dispatch, the interpreter reads the dispatched
context's status:

| status | meaning for the script |
|---|---|
| `ok`, `partial` | continue |
| `declined` | a **refusal**: the context's `getRefusal()` when the controller is migrated; otherwise one made from the first declining note (`reason` = the note's `reason`, else its `kind`; `facts` = `{ detail }` when it has one) |
| `error` | a **defect** (a bug or a content error): not catchable |

A line the binder refuses before any dispatch (`parse-failed`,
`unknown-verb`, `bind-failed`, `needs-input`, `shape-fall-through`) is a
refusal by the same rule. So is every prompt seam, which already notes
`needs-input`, and an `ActChoices` a controller cannot ask about.

**Mechanism.** The interpreter throws inside its own generator: a `Refusal`
(with `at` set to the rendered line) for a refusal, a `ScriptHalted` for a
defect. `try` is a JavaScript `try/catch` around `yield* invokeBlock`, and
it catches `Refusal` only. The pump's existing `catch` around `gen.next`
settles the run: `Refusal` → `{ aborted: 'step-declined', stopped }`,
`ScriptHalted` → the same abort with no refusal, `ResourceLimitError` as
today, anything else → `CommandApi.reportFailure` (a bug in the
interpreter is no longer a bare `console.error`).

**The report, once.** `DriveResult` gains
`stopped?: { line: string; refusal: Refusal | null }`.

- A refusal **with a row**: nothing else has spoken (a migrated controller
  does not word, and `_dispatchBound` emits no envelope). The outer context
  gets exactly one `refused` note, the refusal's own code and facts plus
  `at`, and the emit sweep words it through the platform row
  `script-stopped` (facts `line: text`, `why: text?`).
- A refusal **without a row** (an unmigrated controller), or a defect: its
  notes are threaded to the outer context as today, so whatever worded it
  before still does, and one bare stop line is added (`script-stopped` with
  no `why`).
- A script that stops after it detached reports through
  `CommandApi.reportFailure` (the late path, D9).
- A refusal a handler caught is not noted and not said.
- `_dispatchBound` is given the rendered line as its context's
  `commandText`, so the report can name it.

**`try`.** `try { … } on <reason>[, <reason>…] { … }`, with further
`on … { … }` clauses allowed; the first clause that matches runs. `on *`
matches any refusal. `try` joins `SCRIPT_BUILTINS` because both blocks must
stay unevaluated, which the bus cannot give a verb. The handler's value is
the `try`'s value. A refusal thrown inside a handler propagates.

**`$why`.** Inside a handler `why` is bound to the `Refusal` itself, which
joins the `ScriptValue` union (truthy). `Scope.get` learns one thing: on a
miss for a dotted name whose base is bound to a `Refusal`, it answers
`reason` (the canonical code) or the named fact. Nothing else has fields;
there is no general member access. The change is in `Scope` so the
interpreter and the `( )` island read it the same way.

**A thing as an argument.** `renderScalar` renders a single `Stuff` as
`#<stuffId>`, so `unlock $why.target` binds that exact door through the
ordinary binder (its perception gate and the verb's own gates still
apply). A list still does not bind (piping, deferred as today).

**Parse time.** After `buildScript`, the script parser walks every `try`
(nested blocks included) and refuses, as a parse error: a malformed `try`;
a reason `find` cannot load; a reason whose row is not `catchable`. For an
unknown reason it fits a suggestion (the nearest code in that directory,
by edit distance, computed inside `ReasonCatalogue.nearest`) and returns it
as a new `ParseResult.suggestion`: the whole line with the word corrected.
The dispatcher copies it onto the `parse-failed` note, and the row's wording
shows it as a tappable link. `ScriptLogic.parseSourceToScript` stops
returning `null` on a parse error: a stored script that does not parse is
refused with its error.

**Never catchable**, even by `on *`: a `controller-error` status (bug,
content error), and an engaged step that ended `thrown`.

**Engaged steps.** The scheduler stamps `endedBy` (`'completed'` or the
`AbortReason`) on the engagement where it ends. The coroutine keeps the
engagement object it is awaiting and, on waking, hands the interpreter the
context and the end. An end that is an abort other than `thrown` becomes
`new Refusal('interrupted', { abort })`; `thrown` halts. A refusal the
step's *completion* returned is on the context (`getRefusal()`, D11) and is
thrown the same way. A script the player stops (`stop`) is cancelled, not
interrupted: no handler runs.

### D6. Content errors

- **Thrown** as `ContentError(row, field, message, { what })`. `what` is the
  thing in world terms (*"the horseshoe recipe"*); it defaults to the row's
  leaf with its kind.
- **At the root** (`reportFailure`): the player's line comes from the
  platform row `content-error` (fact `what: text`); the note is
  `controller-error` with that sentence as `detail`; the diagnostic is
  `DiagnosticApi.record({ path: row, code: 'content-error', message, stack })`.
  `RuntimeDiagnostic` gains an optional `code`.
- **Routing.** `DiagnosticLogic.record` leaves `author` null for a
  `content-error` row, and its push goes to whoever holds title over the
  row's path: `ParcelApi.ownerOf(path)` → `resolveOwnerRef` → the group's
  online members. `list` already shows a row only to a holder of an extent
  over its path, so the maintainer reads it in `errors` and an unrelated
  wizard does not. No new gate, no `isWizard`.
- **Refused where it can be checked.** One validator table, two callers:
  1. `Recipe.fromData` throws `ContentError` for a `baseGradeBand` or an
     input slot's `minGrade` that is not a band (`Grade.isBand`). The
     installer already calls it.
  2. `DocumentLogic.saveImpl` runs the same per-kind validator the installer
     runs, through a new `PackApi.validateDocument(kind, data, path)` that
     forwards to `PackLogic`'s `DOCUMENT_VALIDATORS` (a dynamic import, as
     the catalogue does, to avoid the hub cycle). A kind with no validator is
     stored as parsed, as today.
  3. `ReasonCatalogue.parse` joins `DOCUMENT_VALIDATORS` as `reason`.
  4. A new gate, `lint:content-refs`, checks statically across every pack
     what the installer cannot see from one pack: every recipe's bands are
     bands (the list read out of `Grade.ts` by text), every recipe's
     `outputMaterial` names a material row some pack ships, and every
     `on <reason>` in a shipped `.msh` names a reason row some pack ships.
     Ceiling 0 if the census is clean; otherwise today's count, ratcheted.
- **At play** only what was forced past those: a forced-through bad recipe
  throws `ContentError` when the recipe is first read.

### D7. The ratchets

Census scripts, not an ESLint rule: `lint:family` derives its roster from
`lint:*` scripts, a ceiling cannot be expressed as an ESLint rule, and
type-aware `no-floating-promises` over 2,400 files would be the slowest gate
in the family. Each script follows `check-reconcile-chains.ts` (exported
ceiling, `--lint`, `--report`) and walks the kernel plus every pack `src/`
through `pack-roots`, tests excluded. All four read the TypeScript AST
(syntax only, the `check-data-ideas` precedent). **Each ceiling is the
number the script measures on the wave's own tree**, written into the
script with the date.

| gate | counts | clean when |
|---|---|---|
| `lint:silent-catch` | every `catch` clause | its block contains a `throw`; or calls `reportFailure`, `DiagnosticApi.record`, `.refuse(`; or returns or builds an `ok: false` refusal or a `Refusal`; or carries a `@quiet <why>` comment (a deliberate skip, e.g. *generator already complete*) |
| `lint:floating-promises` | every `void <call>` expression statement | the outermost call is `.catch(…)`, or `.then(…, onRejected)`, or the callee is `runRootGuarded` |
| `lint:act-nulls` | every `return null` inside (a) a function whose declared return type names `null` and an identifier ending `Refusal`, `Plan`, `Answer`, `Outcome` or `Choices`; or (b) a method named `resolve[A-Z]…` outside `api/mql/**` whose declared return type names `null` | the function's TSDoc carries `@nothing <why>` (the null is an absence: *nothing to say about this act*, which `ActPlan.ts` sanctions) |
| `lint:reason-rows` | **hard, zero:** a literal code in `new Refusal('…'` or in an object literal passed to `.refuse(` with no row file; a literal fact key the row does not declare. **Ceilings:** (i) distinct `reason: '<code>'` literals with no row file; (ii) legacy wordings: `kind: 'controller-rejected'` literals plus `refuse(` calls in the worded form | — |

`lint:floating-promises` cannot see a promise dropped with no `void`; that
needs types and is named in the script's header as out of scope.
`lint:silent-catch` takes the silent-write census's catch half as an input:
its three named sites (`BulkableMixin.sufferImpact`, `Mould.creditDrainings`,
`ThermalMixin.restamp`) are each fixed or marked `@quiet` in W4.

### D8. Unavailable

- **Origin:** `PersistApi`. Its forwarding statics run through one private
  wrapper that converts a driver connectivity failure (by the error's
  `name`: the Mongo network, server-selection, not-connected, pool-cleared
  and topology-closed family) into `new Unavailable('the records')` with the
  driver error as `cause`. Nothing else is converted: a write conflict or a
  bad query stays a bug.
- **At the root:** worded from the platform row `unavailable` (*try again*),
  noted as `refused` (so a script catches `on unavailable`), and a
  diagnostic is recorded.
- **The seam:** `PersistApi.failNext(calls = 1)`, `@TestOnly`, checked in
  the same wrapper; reached as `TestHarnessApi.failDatastore` over
  `/auth/test-datastore-fail`.
- The silent `if (!connected()) return []` guards in logic singletons are
  not touched here; they are census items for `lint:act-nulls` and the slate.

### D9. Late failures

`CommandApi.reportFailure(error, context?, where?)` is the one routine every
guarded root calls. It classifies and it delivers:

| thrown | player | note | diagnostic |
|---|---|---|---|
| `Refusal` | the row's wording | `refused` | none |
| `Unavailable` | row `unavailable` | `refused` | recorded |
| `ContentError` | row `content-error` | `controller-error` | to the row's title holder |
| anything else | row `went-wrong` | `controller-error` | recorded (path = `where`) |

- **With a live context:** it notes on the context; the emit sweep words it.
- **With none, or a context whose envelope has gone:** it words the line at
  once and sends it to the causing author
  (`ExecutionContextApi.getCausingAuthor()`), composed inside the guarded
  root so the frame carries `meta.causingCommandId`, with the note in the
  frame's payload. No new envelope type.
- `CommandContext.refuse` after its envelope has gone takes the same late
  path by itself (P11: the caller never asks whether the context is closed).

Call sites: the four catches in `CommandGiver`; `ScriptLogic`'s settle
handler and the pump's unexpected-throw arm; `SchedulerRegistry
.safeInvokeComplete` (which also now attaches a rejection handler to a
completion that returns a promise, the silent-write census's B103); the
`engagePlan` completion (`land`'s catch, and a refusal the completion
returns → `context.refuse`); `_recordGuardError` for the `swallow` and
`absorb` policies (`rethrow` keeps recording only, since REST maps its own
status).

### D10. First consumers, exactly

Platform rows (`packages/content/platform/content/reasons/`):

| code | facts | from |
|---|---|---|
| `locked` | `target: thing` | `Door.canOpen`, `Gate.canOpen` |
| `no-key` | `target: thing` | `Lockable.lock` / `unlock` |
| `already-locked`, `already-unlocked` | `target: thing` | `Lockable` |
| `already-open` | `target: thing` | `Sealable.openPlanFor` |
| `no-setting`, `bad-setting` | `target: thing` | `Sealable`, `Throttleable` |
| `needs-input`, `parse-failed`, `bind-failed` | `detail: text?` | dispatcher, interpreter |
| `interrupted` | `abort: text` | the coroutine |
| `unavailable` | `what: text` | `PersistApi` |
| `script-stopped` | `line: text`, `why: text?` | the stop report |
| `content-error` (not catchable) | `what: text` | the root |
| `went-wrong` (not catchable) | — | the root |
| the bank's six: `no-payer`, `cannot-hold-coin`, `insufficient-coin`, `needs-payee`, `splits-exceed`, `inexact-cash` | grow as the wording needs (`amount: text`) | `BankingLogic.settle` |
| the board's three | `board: text` | `ForumsLogic` |
| the document store's one | `path: text` | `DocumentLogic` |
| the wiki's (one per distinct sentence, about eight) | per sentence | `WikiRegistry` |

⚠ **Before naming a row, grep its code.** `not-member` is also the chat
channel's refusal (`ChannelCatalogue.ts:489`) and `access-denied` the
template store's (`TemplateLogic.ts:79`). Where another subsystem returns the
same literal with a different meaning, the row takes a specific name
(`not-board-member`, `document-access-denied`). The door keeps `locked`:
the common word wins, and a forum thread's is renamed if it collides.

Code changes:

- `Sealable.canOpen(by)` returns `{ ok: true } | AnyActRefusal` instead of
  `VetoResult`. `OpenRefusal` loses `cannot-open { why }` (E6: prose where a
  reason belonged) and gains `locked`. `Door` and the water pack's `Gate`
  return `{ ok: false, reason: 'locked', facts: { target: this } }`.
- `OpenController`, `UnlockController`, `LockController`: every refusal the
  door answers goes through `this.refuse(context, answer)`. Their
  `missing-target`, `empty-result`, `not-sealable`, `not-lockable` arms stay
  legacy (those codes are shared by dozens of controllers; the ratchet
  counts them).
- The five thrown classes (D3) and their four wording catches
  (`TipController`, `ForumControllerBase.failFrom`,
  `SoulControllerBase.refusedByCommittee`, `WikiControllerBase.execute`).
  `WikiConflict` is not a refusal class in scope; it stays.
- **The pack reason:** forestry. `FellRefusal`'s four codes become
  `/trade/forestry/reasons/{wrong-tool, no-such-species, stand-empty,
  not-yet-a-tree}`; four rows ship in
  `packages/content/trade-forestry/content/reasons/`;
  `FellController.refusalWords` and `decline` are deleted. Facts grow to
  carry what the words needed (`tool: thing`, `word: text`, `name: text?`,
  `tree: thing?`). **No kernel file changes for this**, which is the test.
  Drive step 10 uses `wrong-tool` (a billhook on an oak).

### D11. The controller's side: one call

```typescript
// CommandContext
refuse(refusal: { reason: string; facts?: unknown; at?: string }): void;
getRefusal(): Refusal | null;

// CommandController — the wordless overload of the existing method
protected refuse(context: CommandContext, refusal: AnyActRefusal | Refusal): void;
```

- `context.refuse` notes `refused` (facts converted to wire form) and keeps
  the live `Refusal` for a script to read. It sends nothing: the root words.
- A migrated controller's whole refusal path is
  `if (!answer.ok) return this.refuse(context, answer);`.
- `engagePlan`'s `words.onRefused` becomes optional. Absent, a refused plan
  and a refused completion go to `context.refuse`.
- The burn-down is mechanical: delete the wording `switch`, pass the answer.
  The worded five-argument `refuse` stays for unmigrated controllers and is
  what `lint:reason-rows` counts.
- P5: the object decides the refusal and its facts; the row words it; the
  controller does neither.

### Build decisions (recorded at build time, 2026-11-18)

- **B1. `open` migrated whole in W0**, not just `locked`: `already-open`,
  `no-setting` and `bad-setting` got `{ target }` facts and rows with it —
  one wording switch deleted instead of half of one. (Lens 2: one call per
  controller.)
- **B2. `canOpen` returns a closed `OpenVeto`** (`{ ok: true } |
  ActRefusal<'locked', { target }>`), not `AnyActRefusal`: D3's own rule (a
  protocol lists its kernel codes). The water pack's `Gate` follows.
- **B3. Rows avoid a thing at the start of a sentence.** `{{ target | item |
  cap }}` cannot work: `item` emits a per-viewer tag that `cap` cannot reach.
  So `locked` says *"The lock holds — the oak door won't open."* A `cap` that
  reaches a thing tag is a prose-filter change, not this build's.
- **B4. `Refusal` takes an optional `message`** (for the log and a REST
  caller). `DocumentLogic`'s and the wiki's refusals keep their old
  sentences there, so a CMS route that shows `err.message` is unchanged.
- **B5. Board and store codes renamed for collisions** (D10's grep):
  `board-unowned`, `not-board-member`, `not-entry-author`,
  `document-access-denied`. The wiki's eleven sites became seven codes
  (`wiki-unnamed`, `wiki-no-section`, `wiki-no-revision`, `wiki-may-not-edit`
  carrying the wiki's own sentence as `why`, `wiki-guest`,
  `wiki-moderators-only`, `wiki-name-held`).
- **B6. The bank's `insufficient balance`** was a plain `Error` (a bug to the
  root) — it is the refusal `insufficient-funds` now; `pay` passes any
  settlement `Refusal` on. That is drive step 6's verb.
- **B7. A save's validator failure is a refusal**, `invalid-document { path,
  why }` — the author saving it is told why; it is not a content error
  (nobody played it yet).
- **B8. `tryClausesOf` is an instance method on `Interpreter`** (the parser
  makes a throwaway reader) — a public static on a `lib/` class would raise
  `lint:lib-statics`.
- **B9. `engagePlan`'s words type** takes `onRefused` optional without
  changing `ActWords` (nine other controllers call `words.onRefused` directly).
- **B10. A late completion refusal is said ONCE inside a script** (review,
  2026-11-18 — the build first shipped it said twice). A script-dispatched
  command's context carries `scriptLine`; `engagePlan`'s late path leaves the
  refusal on the context and words it at once only for a typed command, so
  inside a script the stop line is the one place it is said.
- **B11. `fell`'s `decline` stays** for its legacy codes (`no-axe`,
  `not-a-standard`, `no-stand`, `not-a-tree`); only `refusalWords` went.
- **B12. Shipped `.msh` scripts:** the lounge's three were read; the
  cocktail recipes SHOULD stop at a refused pour (no stirring an empty glass),
  and `last-call` only `say`s. No `try` added.
- **B13. `PersistApi`'s "Not connected" counts as an outage** too, alongside
  the driver's connectivity errors, so an offline store says *try again*.

- **B14. A content error is marked by the diagnostic's `channel`
  (`content-error`), not a new `RuntimeDiagnostic.code`** as D6 said: the
  row's `code` column is the compiler's numeric code, and `channel` already
  exists as a producer's override for rows that classify by mechanism. No
  schema change.
- **B15. `DriveResult.stopped` carries the stopped line's `notes`**, held back
  from the run's notes, so a refusal is said once — by the stop report — and
  a handled one is never said.

## ⭐⭐ Host placement

| Thing | Host | What that claims about everything else on the host |
|---|---|---|
| `reason` rows | The pack that owns the act: `/platform/reasons/` for kernel acts, `<pack root>/reasons/` for a pack's | Nothing: a pack with no reasons ships no directory. |
| `ReasonCatalogue` | A singleton at `/platform/idea/` | As every document family's catalogue. |
| `Reason` | `lib/command/`, beside `CommandController` and the context it serves | Thrown refusals deep in the bank never import it; they import `lib/errors.ts` only. |
| `Refusal`, `Unavailable`, `ContentError` | `lib/errors.ts` (top-level `lib/`) | The file is already *shapes any subsystem might use*. Subsystem-specific errors still stay with their subsystem. |
| `refuse` / `getRefusal` | `CommandContext` | Every context can be refused. True: any command can be. No guard. |
| The wordless `refuse` | `CommandController` (the base) | Every controller may pass a refusal. True of all of them. |
| `reasons()`, `reportFailure` | `CommandApi` / `CommandLogic` | The Api that owns the envelope and the context. The scheduler and the script logic call it; they already depend on it. |
| `try`, `$why`, the stop | `Interpreter` / `Coroutine` / `Scope` | Every script stops at a refusal. Intended (the requirements' collision list). |
| `endedBy` | The `Engagement` interface | Every engagement ends one way or the other. Always answered: no host answers *"not applicable"*. |
| `locked` on `canOpen` | `Sealable` (the hook), `Door` and `Gate` (the implementers) | ⚠ **Not on `Sealable`'s default**: a chest with no lock never answers `locked`. Only the two classes that compose `Lockable` return it. |
| `failNext` | `PersistApi` | The one door every mudlib read and write goes through. |
| The validators | `PackLogic`'s existing table, reached by `PackApi.validateDocument` | A kind with no validator is unaffected. |

**No guard re-narrows a host anywhere in this plan.** The quieter test (an
honest default that answers *no* on most hosts): `getRefusal()` is `null`
on most contexts, and that is the meaning (*this command was not refused*),
not an inapplicable capability.

## Convention conformance

Checked at plan time against `CLAUDE.md` and the gates.

- **Module categories:** `Reason` is a value class in `lib/command/`;
  `ReasonCatalogue` is a Stuff class in `platform/idea/`; errors are classes
  in `lib/errors.ts`; the four gates are scripts. **No new category, no new
  free exported function, no `eslint-disable no-restricted-syntax`, no lint
  exemption.** Edit distance lives inside `ReasonCatalogue.nearest`.
- **Api ↔ Logic:** `CommandApi.reasons()` / `reportFailure` forward to
  `CommandLogic`; `PackApi.validateDocument` to `PackLogic`;
  `TestHarnessApi` statics to its logic. No Api is collapsed.
- **Module scope declares:** nothing new runs at module scope.
- **Import boundary:** no mudlib file imports `fs`/`path`; the lint scripts
  live in `packages/server/scripts/`.
- **Verbs on objects:** the door answers; `Reason.say` words;
  `ReasonCatalogue.pathOf` resolves. No `XApi.verb(host, …)`.
- **Paths:** `<root>/reasons/<code>` is the document-kind pattern
  (`<root>/<contentDir>/<name>`).
- **`props:`/`cast:`, Locations:** the drive's staged places use `props:`
  and `Location`; no `container:`, no `hydratorClass:`.
- **No new Mongo collection, no new `isWizard`, no boot entry, no new verb
  view, no new view key.**
- **American English** in every row, name and comment.

The review questions P3–P8:

- **P3 refuse / skip / throw.** This build is that rule. Every new path:
  an unknown reason in `on` → a parse refusal; a row with a bad template →
  refused at install; facts that do not fit → a bug with a diagnostic; a
  reason with no row at wording time → `went-wrong` plus a diagnostic.
- **P4 no duck typing.** Roots classify with `instanceof` on three kernel
  classes. No `?.()`, no structural cast. Forestry imports
  `@saxonberg/server/mud/lib/errors` by package specifier.
- **P5 the mixin decides.** `Lockable` and `Sealable` decide; controllers
  pass the answer on (D11).
- **P6 persistence per content.** Nothing new persists. Reason rows are
  installed documents; `endedBy` and the live `Refusal` are in-memory.
- **P7 load on use.** D1. The suggestion's prefix read happens only on the
  failure path.
- **P8 names.** `Refusal`, `Unavailable`, `ContentError` are nouns for what
  they are; `Reason` is the row; `refuse` is the existing verb. `try`/`on`
  are the requirements' words. Row codes are checked for collisions (D10).

**Gates this build must pass:** the whole of `lint:family`, and in
particular `lint:data-ideas`, `lint:boundary-roles` (ceiling 38, with the
audit in D1), `lint:lib-statics` (no rise), `lint:closed-vocabularies`,
`lint:module-scope`, `lint:imports`, `lint:test-seams`, `lint:view-keys`,
`lint:completion-this`, `lint:controller-functions`,
`lint:controller-decisions`, `lint:authored-prose` (reason rows are prose),
`lint:untitled`, `lint:drive-scripts`, `lint:schema`, and the five it adds.

## Waves

Each wave ends at a commit, is landable alone, and is gated by
`pnpm test:near`, the touched packs' vitest and `pnpm -C packages/server
lint:family`. Add the wave's drive steps to the wire file as the wave lands;
W5 completes and runs it.

### W0 — reasons, the family, the envelope

> ✅ **Done** (28b672098, with W1). `open` migrated whole (B1); `canOpen` a closed `OpenVeto` (B2); rows never start with a thing (B3).

**Goal:** a refusal with a row is worded by the root, returned or thrown.
**Implements:** D1, D2, D3 (the classes), D4, D9 (the in-frame half), D11.

- `lib/errors.ts`: `Refusal`, `Unavailable`, `ContentError`, `ReasonPath`,
  `RefusalFacts`.
- `lib/document/DocumentKinds.ts`: the `reason` kind.
- `lib/command/Reason.ts`; `platform/idea/ReasonCatalogue.ts`
  (`parse`, `find`, `pathOf`, `codeOf`, `nearest`).
- `api/command.ts` + `platform/idea/api/CommandLogic.ts`: `reasons()`,
  `reportFailure`, `refuse` / `getRefusal` on the context,
  `autoEscalationFor('refused')`.
- `packages/types/src/index.ts`: `RefusedNote`, `RefusalFactWire`, the union.
- `lib/command/CommandGiver.ts`: `emitDispatchResponse` async with the
  `refused` sweep; the four catches call `reportFailure`;
  `recordControllerThrow` deleted; `controller-error` worded from
  `went-wrong`.
- `lib/command/CommandController.ts`: the wordless `refuse`; `engagePlan`'s
  optional `onRefused`.
- `platform/idea/api/PackLogic.ts`: `reason` in `DOCUMENT_VALIDATORS`.
- `scripts/check-boundary-roles.ts`: ceiling 38 with the audit.
- Rows: `locked`, `went-wrong`, `content-error`, `unavailable`.
- One proof consumer: `Sealable.canOpen`'s new return, `Door`, `Gate`,
  `OpenController`.
- `lib/craft/ActPlan.ts`: the header rewritten (D3).

**Acceptance:** `open north` at a locked door says the `locked` row's
sentence and the envelope carries `refused { reason: 'locked', facts:
{ target } }`; editing the row's `says` in the store changes the sentence
with no restart; a `throw new Refusal('locked', …)` from inside a controller
produces the identical line and note (unit test); a plain `throw` shows the
`went-wrong` sentence and no exception text.
**Commit:** `build(failure-model W0): reasons as rows, one refusal family, the refused note`

### W1 — the first consumers

> ✅ **Done** (28b672098). Five classes deleted; colliding codes renamed (B5); `pay` is drive step 6's verb (B6); forestry touched no kernel file. Committed with W0: the shared files (`CommandGiver`, `CommandLogic`) carry both.

**Goal:** D10 complete. **Implements:** D10, D3 (the fold).

- Boundary: `Lockable`, `Throttleable`, `UnlockController`, `LockController`,
  and the rest of `OpenController`; rows.
- Bank, forum, document store, wiki: throws converted, classes deleted,
  wording catches removed, rows shipped. Take a **before-record** of drive
  step 6 first (which verb, which words) so the after can be compared.
- Dispatcher: the three `command-rejected` rows; `ScriptLineRefused` gone.
- Forestry: rows, `Fellable.ts`, `FellController`.
- Grep `packages/content` and every pack `src/` for each renamed code
  (review question B4).

**Acceptance:** drive steps 1 and 6 pass by hand over the wire; a
`new Refusal` and a returned refusal of the same code are indistinguishable
in note and line (unit test per subsystem); forestry's diff touches no file
outside `packages/content/trade-forestry/`.
**Commit:** `build(failure-model W1): boundary, bank, board, store, wiki and forestry answer in reasons`

### W2 — scripts

> ✅ **Done** (9d21308f2). ⚠ Surprise: every script test that relied on a bad line being skipped now stops — five tests updated to the new rule. `tryClausesOf` is an instance method (B8). The lounge's scripts need no `try` (B12).

**Goal:** D5 complete. **Implements:** D5.

- `lib/script/builtins.ts` (`try`), `Interpreter.ts` (`evalTry`, the
  status check after a dispatch, the binder's refusals, `ScriptHalted`,
  `#<id>` in `renderScalar`), `Coroutine.ts` (the settle arms, the
  engagement end), `Value.ts`, `Scope.ts`, `ast.ts` if `try` wants a node
  comment, `lib/command/parsers/script.ts` (the `try` walk, the suggestion).
- `api/command.ts`: `ParseResult.suggestion`; `CommandGiver` copies it.
- `api/scheduler.ts` + `SchedulerRegistry.ts`: `endedBy`.
- `platform/idea/api/ScriptLogic.ts`: the stop report, the parse error of a
  stored script; `_dispatchBound` takes the line.
- Rows: `interrupted`, `script-stopped`.
- `script.yaml` and `do.yaml` `help:` state stop-on-refusal and `try … on`
  (P9).
- Check `packages/content/saxonberg-lounge/content/msh/*.msh` and every
  other shipped `.msh` still does what it did: each now stops at a refusal.

**Acceptance:** drive steps 2, 3, 4, 5, 7, 10, 11 pass over the wire; unit
tests: `on *` does not run for a `controller-error`; a handler's own
refusal propagates; `$why.reason` and `$why.<fact>`; a misspelled reason is
refused at parse with the fitted line; `unlock #<id>` binds the door.
**Commit:** `build(failure-model W2): a script stops at a refusal and can handle it`

### W3 — content errors, unavailable, late failures

> ✅ **Done** (15e0b03cc). The content-error marker is the diagnostic `channel`, not a new `code` (B14). A save's validator failure is a refusal, `invalid-document` (B7). Shipped recipe bands were all valid already (E2 is not present on master).

**Goal:** D6, D8, D9 complete.

- `lib/craft/Recipe.ts` (`fromData` bands); `api/pack.ts` + `PackLogic`
  (`validateDocument`); `DocumentLogic.saveImpl`.
- `packages/types` (`RuntimeDiagnostic.code`); `DiagnosticLogic` (author
  null and the title push for `content-error`).
- `api/persist.ts` (the wrapper, `failNext`); `api/test-harness.ts` +
  its logic (`failDatastore`, `forceDocument`); `TestAuthRoutes.ts`;
  `packages/wire/src/harness/world.ts` helpers.
- `SchedulerRegistry.ts`, `CommandController.engagePlan`,
  `api/execution-context.ts` `_recordGuardError`, `Coroutine` /
  `ScriptLogic`: the late path.
- `scripts/check-content-refs.ts` + `lint:content-refs`.

**Acceptance:** drive steps 8, 9, 12 pass; unit tests: a completion that
throws a `Refusal` reaches the causing author worded and records nothing; a
completion that throws a bug records a diagnostic and says `went-wrong`; a
completion returning a rejected promise is reported, not unhandled; a
`content-error` row is listed for the title holder and not for a second
wizard.
**Commit:** `build(failure-model W3): content errors to the maintainer, outages retryable, late failures owned`

### W4 — the ratchets

> ✅ **Done**. Ceilings measured on this tree: reason-rows 0 hard · 966 unrowed · 580 legacy; content-refs 0; silent-catch 1017 (restamp fixed); floating-promises 179; act-nulls 172. Each made to fail once.

**Goal:** D7. Four scripts, four `lint:*` entries in
`packages/server/package.json`, each ceiling measured on this tree.

- `scripts/check-silent-catch.ts`, `check-floating-promises.ts`,
  `check-act-nulls.ts`, `check-reason-rows.ts`.
- The silent-write census's three named sites: fixed or `@quiet`.
- Make each gate fail once on purpose (add a silent catch, a floating
  `void`, an act null, a rowless `new Refusal`) and see it fail.

**Acceptance:** `lint:family` green; `--report` prints each roster; the four
numbers are in the scripts and in the plan's drive record.
**Commit:** `build(failure-model W4): four ratchets on silence`

### W5 — the drive, the walk, the docs

- `packages/wire/tests/failure-model.wire.test.ts`: all twelve steps
  (named `.dirty.` with a `DIRTY_REASON` if it leaves shipped state changed;
  the harness's `declareFile` decides).
- `e2e/tests/failure-model-walk.spec.ts`: the player steps (1–7, 10, 11) in
  a browser, once.
- Subsystem docs: `response-envelope.md` (the `refused` kind, wording at
  emit), `scripting.md` (stop, `try`, `$why`, the value model),
  `command-spec.md` (the act convention's new doctrine, the one call),
  `diagnostics.md` (content-error routing), `document-store.md` and
  `content-packs.md` (the `reason` kind), `lint-family.md` (five gates),
  `spatial.md` § Writes on a detached subject (points at the palette).
  ⚠ `CLAUDE.md` and the slate index lines are left to the sweep.
- `failure-model-slate.md`: status PARTIAL, `Left` = the burn-down and the
  deferred seams below. `silent-write-census-slate.md`: absorbed.
- Make every drive checkpoint fail once (review question B2).
- `pnpm test` once, at code-complete.

**Commit:** `build(failure-model W5): the drive, the walk, the docs`

## Reachability wiring

| Capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| A worded refusal | every verb whose controller is migrated (`open`, `unlock`, `lock`, `fell`, the bank's, the board's) | unchanged: each verb's existing affordance | the reason row under its pack's `reasons/` | `reasons().ensure(path)` in the emit sweep, on the first refusal that names it | none added |
| A pack reason | `fell` | `trade-forestry`'s existing affordance | `packages/content/trade-forestry/content/reasons/*.yaml` | the same `ensure`, by the path the pack's code wrote | none |
| `try … on` | none: an interpreter builtin (`SCRIPT_BUILTINS`); reached from the prompt, `script`, `do`, a stored `.msh` | the script parser routes a leading builtin to the interpreter (`script.ts:356`) | the rows named in `on` | `reasons().find(code)` at parse | a reason that does not load, or is not catchable, is a parse error |
| `$why.target` as an argument | whatever verb the handler runs | that verb's | the live `Refusal` in the handler's scope | n/a | `#<id>` through the binder: perception and the arg's `requires:` still gate it |
| Content error to its maintainer | `errors` | unchanged | the diagnostic row, `code: 'content-error'`, `path` = the row | the existing `list` extent filter | none |
| Refusal at install / save | none (the installer; `DocumentApi.save`) | n/a | `DOCUMENT_VALIDATORS` | called for every shipped or saved document of a kind that has one | n/a |
| Unavailable | any verb that reads the store | unchanged | row `unavailable` | `ensure` at the root | none |
| The test seams | none in the game; `/auth/test-*` routes | test worlds only (`@TestOnly`) | n/a | n/a | n/a |

⚠ The silent failures to watch: a `reasons/` directory the installer does
not read (the kind missing from `DOCUMENT_KINDS`, or the directory missing
from `nonTemplateDirs()`, which is derived from it); a row that loads but
whose `says` names a fact the code never passes (caught at wording as a
bug, and statically by `lint:reason-rows` for literal sites).

## Acceptance-criteria coverage

| Criterion | Waves | Proved by |
|---|---|---|
| A player never sees raw exception text | W0, W3 | unit (a thrown `Error`'s message is absent from line and note); drive 6, 8 |
| Every drive refusal is worded from its row; re-wording changes it | W0, W1 | drive 1 with a store edit; unit |
| A script stops at its first refusal, reported once | W2 | drive 2, 4 |
| `$why` exposes facts as objects | W2 | drive 3 |
| An unknown reason is refused at parse, with a suggestion | W2 | drive 5 |
| No handler runs for a bug or a content error | W2, W3 | drive 9; unit |
| A pack ships a reason; scripts handle it; no kernel change | W1, W2 | drive 10; the W1 diff |
| A content error's diagnostic reaches the maintainer and no one else | W3 | drive 8 |
| Thrown and returned are indistinguishable | W0, W1 | unit per subsystem; drive 6, 7 |
| The four counts are published and can only fall | W4 | `lint:family`; `--report` |

Nothing is unmapped. Late failures (a requirements surface decision with no
criterion) are W3 unit tests.

## Test & gate strategy

**Unit tests** (colocated `__tests__/`, importing `test-bootstrap` where
they touch the wired runtime): `Reason` parse and `say`; `ReasonCatalogue`
`pathOf` / `codeOf` / `find` / `nearest`; `reportFailure`'s four arms, in
frame and late; `context.refuse` before and after the envelope; each folded
subsystem's thrown-equals-returned; the interpreter's `try`, `on *`,
non-catchable set, dotted read, `#<id>` render, the parse walk; `endedBy`;
the scheduler's rejected-promise completion; `Recipe.fromData` bands;
`validateDocument` on save; the `PersistApi` wrapper and seam; each lint
script against a fixture that should fail.

**Only the drive can prove:** the words a player reads, once; the envelope
on the wire; a script stopping across real dispatches; the diagnostic's
audience.

**The drive: every step is `instant` or `staged`, so all twelve are the
blocking drive. There is no soak drive.**

| step | pace | staged how |
|---|---|---|
| 1 `open north` | instant | a staged room with a locked door north and its key (the boundary drive's stage precedent) |
| 2 `def fetch` / `do fetch` | instant | — |
| 3 `fetch2` with the key | instant | the key in hand |
| 4 `fetch2` without | instant | the key set down |
| 5 `def bad` | instant | — |
| 6 the purchase | instant | an account short of the price |
| 7 `try { purchase } on *` | instant | — |
| 8 the bad recipe | staged | the save is refused (D6); `forceDocument` writes it under a path the maintainer wizard holds; a second wizard holds nothing there |
| 9 `try` around it | staged | as 8 |
| 10 the pack reason | instant | a wood, a billhook |
| 11 `on interrupted` | staged | `testharness vanish #<tree>` on a planted standard mid-cut (its destruction aborts the step, `host-destroyed`), then the staged clock is advanced past the cut's duration (problem 4). If no planted standard can be staged, add a `TestHarnessApi` stager that cancels a named character's engagement, and say so in the drive record. |
| 12 unavailable | staged | `failDatastore(1)`, then a verb that reads the store |

There is no reboot step: the build persists nothing new (review question
R4, not applicable). Every staged place is `look`ed at in the walk (R5).

**The walk** (`e2e/tests/failure-model-walk.spec.ts`): once, at
code-complete, beside the blocking drive. It checks what the wire cannot:
the sentence as rendered, that it appears once, and that the suggestion in
step 5 is a link that runs when tapped.

**Gates:** `lint:family` at every wave. `pnpm test` at exactly two moments:
code-complete (W5) and `/finalize`. Everything between is `pnpm test:near`,
the touched packs' vitest (`trade-forestry`, `water`, `platform`) and the
lints.

## Risks & opens

1. **`emitDispatchResponse` going async** changes when the envelope leaves
   relative to the caller's `onOutcome` and to a forced command's nested
   envelope (the `forced` marker exists because of such an ordering). Keep
   the order *prose, envelope, `onOutcome`* and run the wire suite's
   correlator-sensitive files (`nutrition-fitness`, `controllers-are-io`) in
   `test:near`.
2. **Tests that read `controller-error.detail`** for the exception text
   will fail by design. Point them at the diagnostic.
3. **Tests and wire baselines that read `controller-rejected` reasons** for
   migrated controllers (`controller-liquidity.baseline.json`,
   `controllers-are-io.baseline.json`) change kind to `refused`. Update them
   in the wave that migrates the controller.
4. **Every shipped script now stops at a refusal.** The lounge's `.msh`
   files and any NPC brain that dispatches a script may halt where they used
   to carry on. W2 reads each; a script that relied on continuing gets a
   `try`.
5. **`#<id>` under a scoped argument.** The resolver admits an id for
   everyone and leaves perception to the binder. If `unlock #<id>` fails the
   `scope: reachable` walk or `canReach` for a door hung in an exit, drive
   step 3 fails. W2's first task is that one test. If it fails, fix the
   binder's treatment of an id against a scope (the id names the thing; the
   validator still decides reach) and record it.
6. **Title over the staged recipe's path** (step 8). Confirm what
   `ParcelApi.ownerOf` answers for a path under a player's `/home/`; the
   document store's own gate treats home specially. If home is not a parcel
   extent, stage a parcel grant for the maintainer and say so.
7. **A legacy code that shares a migrated code's spelling** is matched by a
   script's `on <code>` with empty facts. D10's grep is the guard; a
   collision found later is a rename.
8. **`lint:act-nulls`' scope** is syntactic and will have false positives.
   The ceiling absorbs them; `@nothing` clears a real absence. If the first
   census is dominated by one legitimate pattern, narrow the rule in the
   script's header rather than marking hundreds of sites.
9. **The four ceilings will differ from the requirements' approximations**
   (351, 267): the gates' definitions are the precise ones. Publish the
   measured numbers.
10. **`Gate` is in the `water` pack**, which is a `/system` pack: changing
    `canOpen`'s return type is a kernel protocol change a pack must follow in
    the same wave. Run the water pack's vitest in W0.

The build does not stop for these. Where one forces a decision, decide by
lens 1 or 2, and record it in the drive record.

## Deferred seams

All leave on `failure-model-slate.md` (which stays PARTIAL).

- **The burn-down:** the unrowed codes, the legacy wordings (`PullOutcome`'s
  ~85 sentences, `TravelNode.ride`, the magic Apis: E6, E9), the silent
  catches, floating promises and act nulls. Attach point: the wordless
  `refuse` and a row.
- **A kernel protocol with an open arm for a pack host** (`TravelNode.ride`):
  the `ReasonPath` arm exists (D3); no protocol takes it yet.
- **The traverse's refusals** (`locomotion-gate-failed`, `Exit.canTraverse`'s
  `gate: 'locked'` with a sentence): the next consumer; `go north` at a
  locked door is still worded by the locomotion base.
- **The other six `command-rejected` reasons** and `PromptCancelledError`'s
  `cancelled` / `host-disconnected`.
- **An interrupted step wakes its script at the step's expected end**
  (problem 4). Attach point: `endedBy` is stamped where a wake would fire.
- **Client rendering beyond a sentence**, and **reasons in `help`**: the
  requirements' non-goals; `refused` carries what they need.
- **`if (!connected()) return []`** guards in logic singletons, and NPC
  brain throws that stop at `console.warn` (`BehavedMixin`): silence the
  ratchets count but this build does not fix.
- **A promise dropped without `void`:** needs a typed lint.

## Critical files

Read first, in this order:

1. `docs/requirements/failure-model-requirements.md`
2. `packages/server/src/mud/lib/errors.ts`
3. `packages/server/src/mud/lib/craft/ActPlan.ts`
4. `packages/server/src/mud/lib/command/CommandGiver.ts` (`:98–350`,
   `:860–1110`, `:1740–1879`)
5. `packages/server/src/mud/lib/command/CommandController.ts` (`:170–290`,
   `:380–405`)
6. `packages/server/src/mud/platform/idea/api/CommandLogic.ts` and
   `packages/server/src/mud/api/command.ts` (`:115–190`, `:294–320`)
7. `packages/types/src/index.ts` (`:500–720`, `:915–950`, `:4781`)
8. `packages/server/src/mud/lib/script/Interpreter.ts`, `Coroutine.ts`,
   `Scope.ts`, `Value.ts`, `builtins.ts`;
   `packages/server/src/mud/lib/command/parsers/script.ts`;
   `packages/server/src/mud/platform/idea/api/ScriptLogic.ts` (`:240–450`)
9. `packages/server/src/mud/lib/document/DocumentKinds.ts`,
   `DocumentCatalogue.ts`;
   `packages/server/src/mud/platform/idea/ShapeCatalogue.ts` and
   `packages/server/src/mud/api/containment.ts` (`:174–205`) as the pattern
10. `packages/server/src/mud/lib/boundary/Lockable.ts`,
    `lib/spatial/Sealable.ts`, `lib/spatial/Throttleable.ts`,
    `platform/thing/Door.ts`, `packages/content/water/src/thing/Gate.ts`,
    `platform/idea/cmd/boundary/*.ts`
11. `lib/banking/Charge.ts`, `platform/idea/api/BankingLogic.ts`
    (`:1295–1430`), `lib/forum/Board.ts`, `lib/document/StoredDocument.ts`,
    `platform/idea/WikiRegistry.ts`, and their four controller bases
12. `packages/content/trade-forestry/src/lib/Fellable.ts`,
    `src/idea/cmd/forestry/FellController.ts`
13. `platform/idea/SchedulerRegistry.ts` (`:555–630`), `api/schedule.ts`
    (`:112–180`), `api/execution-context.ts` (`:375–400`, `:1021–1047`)
14. `platform/idea/api/DiagnosticLogic.ts` (`:225–330`, `:355–395`),
    `platform/idea/api/PackLogic.ts` (`:176–210`),
    `platform/idea/api/DocumentLogic.ts` (`:650–712`),
    `lib/craft/Recipe.ts` (`:447–480`), `lib/craft/Grade.ts`
15. `api/persist.ts`, `api/test-harness.ts`,
    `packages/server/src/services/auth/TestAuthRoutes.ts`,
    `packages/wire/src/harness/world.ts`
16. `packages/server/scripts/check-reconcile-chains.ts`,
    `check-data-ideas.ts`, `check-boundary-roles.ts`, `check-lib-statics.ts`
17. `packages/wire/tests/boundary.dirty.wire.test.ts` and
    `e2e/tests/boundary-walk.spec.ts` as the drive and walk patterns
18. `docs/subsystems/response-envelope.md`, `scripting.md`,
    `diagnostics.md`, `document-store.md`, `docs/review-questions.md`,
    `docs/lint-family.md` § census-then-ratchet

## Drive record

*(appended at build time)*
