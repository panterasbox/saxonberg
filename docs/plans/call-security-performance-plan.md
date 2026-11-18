# Call security performance — implementation plan

A set of cuts inside the call-security and proxy layer, chosen by a fresh
profile of the running world and measured by instruments that already exist.
It executes
[call-security-performance-requirements.md](../requirements/call-security-performance-requirements.md).
**Kind:** refactor/sweep (performance). **Lead end:** kernel. No content
row, no pack, no verb, no view and no player surface changes. Nothing a
check decides today is decided differently afterwards; only how often a
fact already proved is re-derived.

Seeding slate and reuse ledger:
[call-security-performance-slate.md](../slates/tech-debt/call-security-performance-slate.md).

---

## Grounding

Verified at plan time on `reqs/call-security-performance` (master at
`a6cf85555`). Paths are under `packages/server/src/mud/` unless they start
with `packages/` or `docs/`.

### The read trap — `api/proxy.ts`

- `ProxyApi.wrap` builds one `Proxy` per Stuff with a single `get` trap.
  There is no `set`, `defineProperty` or `getPrototypeOf` trap, so a write
  or a `defineProperty` through the proxy lands on the raw target.
- Order inside the trap, per read: `RAW_TARGET` → `PASSTHROUGH_KEYS.has`
  (`then`, `constructor`, `stuffId`, `host`, `interceptedMethods`) →
  `findDescriptor(target, prop)` → getter path (pipeline with
  `descriptor.get.call(receiver)`) → `Reflect.get` → R2.3 weak-field
  self-heal (only when the class has `ref: 'instance'` fields; `weak` is
  `null` for nearly every class) → non-function passes through →
  `_isMockFunction` passes through → per-wrap `wrapperCache`
  (`WeakMap<rawFn, wrapper>`) → a new wrapper closure.
- `findDescriptor` is a file-private function at the bottom of the file. It
  loops `Object.getOwnPropertyDescriptor(cur, prop)` up the prototype chain
  to `Object.prototype`. What each kind of read pays today:
  - an **own field** (`this._foo`): one descriptor read, found at level 0;
  - a **method or prototype getter**: one miss per level until the class
    that declares it. Mixin-composed classes are deep; `bench-gate`'s
    `Probe` is four mixin levels over `Good`;
  - an **absent** property: the whole chain.
- Method bodies run with `this === proxy` (`value.apply(proxyRef, args)`),
  so every `this.x` inside a method is another trap read. That is why the
  world does far more reads than calls.
- `ProxyApi` is one of the four bootstrap-special Apis: no
  `decorateApiClass`, and it value-imports only `SecurityApi` (the comment
  at the `weak` hoist records the `proxy → mixin → security → proxy` cycle).

### Prototypes are fixed once a class is defined

- `api/hot-reload.ts` (header) and `docs/subsystems/hot-reload.md`: a reload
  is a cache-busting dynamic import that evaluates **new class objects**.
  Existing instances keep their old prototype chain; nothing migrates.
- A grep of `packages/server/src` and every `packages/content/*/src` for
  `defineProperty`, `setPrototypeOf` and `X.prototype.y =` outside tests
  finds only `api/security.ts:677/683/839`. Those write **statics on Api
  classes** (the wrapped static, its `name`, the `@TestOnly` stub), never an
  instance prototype.
- Tests: 100 sites call `vi.spyOn(X.prototype, 'method')`. That replaces a
  data property with a data property, so accessor-ness does not change and
  the value is still read live. **Zero** sites spy an accessor
  (`vi.spyOn(o, 'x', 'get')`); the `'get'` hits are statics named `get`.
  The only `Object.defineProperty` in any test sets a class's `name`.
  Zero `X.prototype.y =` assignments.
- So a cache keyed weakly on a prototype object is invalidated by
  construction on reload: the new class is a new key.

### The gate — `api/security.ts`

- `resolveCallPolicy` (~:391) caches per constructor in `#policyCache`,
  stamped with `#policyGeneration`, which every policy writer bumps.
- ⚠ `resolveStaticCallPolicy` (:442) **is already cached the same way**
  (`#staticPolicyCache`, same generation). The ledger row that says "cache
  it … if it is not already" is satisfied on master. Its 1.5% is the cached
  lookup itself (a `WeakMap.get` plus a `Map.get` per static call).
- `#wrapStaticDescriptor` (:637) builds `wrapped`: resolve policy →
  `getCurrentTarget()` → `policy.allows` → `#pushFrame()(caller, cls,
  methodName, undefined, () => body.apply(this, args))`. One closure per
  static call. `_callSecWrapped` and the `name` defineProperty are set once
  at wrap time.
- `#securityGate` (:1552) per instance dispatch: bypass check →
  destroyed-object guard → `ctx.target.getCircleScope()` +
  `ExecutionContextApi._boundaryContext()` → `resolveCallPolicy` →
  `getCurrentTarget()` → `policy.allows` → `#proceed` (touch, shadow
  lookup, frame push with `next` handed straight through).
- `_boundaryContext` has exactly one caller, the gate (:1617).

### Frames — `api/execution-context.ts`

(The slate's path `lib/security/execution-context.ts` is wrong; the file is
`api/execution-context.ts`. `lib/security/` holds the decorators, policies
and errors.)

- `const _als = new AsyncLocalStorage<FrameNode>()` (:161). `_pushFrame`
  (:219) allocates a `CallFrame` (with `timestamp: Date.now()`), a
  `LinkedFrame`, reads `_als.getStore()` for the parent, and calls
  `_als.run`.
- One instance dispatch therefore reads the store **three times**
  (`_boundaryContext`, `getCurrentTarget`, `_pushFrame`) and runs once. One
  static dispatch reads it twice and runs once.
- `_boundaryContext` (:750) allocates a fresh `{scope, bound}` object on
  every dispatch.
- No reader of `CallFrame.timestamp` was found in `api/execution-context.ts`
  or `lib/security/`; a repo-wide census is W3's first act.
- The box runs Node **v22.14.0**. The profile's `executionAsyncResource`
  and `lookupPublicResource` rows are the async-hooks-backed
  `AsyncLocalStorage`; each `getStore` and each `run` pays one.
- `claimFramePush()` (:967) is proof-gated by `_frameMutatorAllowlist`; the
  only holder is `SecurityApi.#framePush`. `tagCurrentFrame`,
  `tagActingAuthor` and `establishCircleScope` keep the per-call proof.

### Recognition — `platform/idea/api/RecognitionLogic.ts`

- `describeCore` (:372) is a file-private function. For a non-`bare`,
  non-`handle` form with a viewer it asks `MixinApi.isSensor(viewer)` and
  `MixinApi.isPerception(viewer)` (:406), then `canSeeGate`, `isMasked`,
  `identificationName`, and the persona recall.
- `perceivedKeywordsImpl` (:548) calls `describeCore` twice for an organism
  (`concise`, `distinguishing`, :560–561). The two runs differ **only** in
  the last branch for a true stranger (`salientFeaturesImpl` against
  `strangerStem`). Every gate and every recall before it is repeated.
- ⚠ **`pushDirect` no longer exists.** The MQL scope walk makes one
  candidate per object in `candidateFor` (`api/mql/scope-walk.ts:230`),
  which calls `stuff.perceivedKeywordsFor(viewer)` and nothing else from
  recognition. No `describeFor` call remains anywhere under `api/mql/`. The
  ledger's "`pushDirect` calls `describe` beside it" is void on master.
- ⚠ **The viewer checks are not invariant across calls.**
  `MixinApi.hasMixin(host, name)` (`api/mixin.ts:684`) walks
  `ShadowApi.getAllShadows(host)` before the constructor, so a shadow can
  confer `Sensor`. The answer is fixed only inside one synchronous walk.

### Instruments

- `packages/server/scripts/bench-gate.ts` (+ `bench-gate-preload.js`):
  times `p.bump()` (one gated **method call**) by subtraction, refuses a
  loaded box, sweeps depth 0/25/100/200, has a `--hot` mode for profiling.
  It has no row for a read that is not a call.
- `packages/wire/src/runner/boot.ts:86` — `WIRE_CPU_PROF=<dir>` puts
  `--cpu-prof` on the world's `tsx` command line; the profile is written at
  a clean exit (SIGTERM).
- `packages/wire/tests/crowd-timing.dirty.wire.test.ts` — the quiet-box
  drive. Its gates are crowded-rooms' absolute targets (idle `< 0.2`, login
  p95 `< 2 s`, `loop.over100 === 0`), several of which master misses by the
  owner's recorded ruling
  ([crowded-rooms-slate § The next ceiling](../slates/tech-debt/crowded-rooms-slate.md)).
  It cannot go green on master and its gates are not this build's.
- `packages/wire/src/harness/crowd.ts` — `runCrowd`, `quietBoxRefusal`,
  `foreignMeter`, and `CrowdRecord.marks` (server uptime at each phase
  boundary, the key that slices a profile).
- `docs/testing.md § The quiet box` — the procedure (suite lock, siblings
  asked to hold, dropped database, the precheck).
- The self-time summarizer that produced the 2026-11-17 shares lives only
  in a session scratchpad. It prints the top forty; the "layer total" was
  summed by hand. There is no durable instrument for the layer's share.
- Baseline-file precedent: `controller-liquidity.dirty.wire.test.ts` writes
  `controller-liquidity.baseline.json` beside itself under `CLIQ_RECORD=1`
  and compares against it otherwise.

### What the wire harness can stage

- `eval` binds every Api that self-decorates and **none of the four
  bootstrap-special ones** (`packages/server/scripts/check-eval-surface.ts`
  header). `ExecutionContextApi` is not reachable from `eval`.
- `Session.cmd()` sends text only. `edit` takes its body as a structured
  payload and cannot be driven (`wizard-axis.dirty.wire.test.ts` header).
  `cp -s <src.ts> <dst.ts>` is an in-game write verb that text can drive,
  and `reload <path>` is the in-game install.
- A wire file may write a probe class into the server's source tree and
  remove it afterwards (`typecheck.wire.test.ts`,
  `platform/thing/WireTypecheckProbe.ts`).
- A governed `eval --parcel` runs inside the sandbox boundary and can reach
  only what stands in that parcel.

### Siblings

`git worktree list`: build-2 `build/navigation-server` (edits
`api/mixin.ts` by 11 lines; nothing in `api/proxy.ts`, `api/security.ts`,
`api/execution-context.ts` or `lib/security/`), build-3
`build/aether-devices` (none), build-4 `reqs/reconcile-chains`
(requirements only). No overlap.

### Prior numbers (reference only; W0 replaces them)

| | 2026-11-17 profile, mid-build | crowded-rooms run 4, quiet box |
|---|---|---|
| layer share of busy self time | ≈57% | — |
| idle | — | 0.173 cores |
| `say` p95 · in-turn p95 | — | 110 ms · 68 ms |
| on-screen card | — | 1.45 s |
| thirty log in p95 · five into the full square p95 | — | 2.28 s · 3.45 s |
| freeze samples over 100 ms | — | 19 of 207 |
| restart p95 | — | 1.49 s |
| gated method call (bench) | — | 2 140 ns |

---

## ⭐⭐ New substrate

No mixin, Api, class, hook, registry, document kind, collection, verb or
view. The whole list:

| # | item | where | ledger row |
|---|---|---|---|
| S1 | `ProxyApi.#accessorCache` + `ProxyApi.#accessorOf(proto, prop)`, replacing the file-private `findDescriptor` | `api/proxy.ts` | rows 1–2: reuses `#policyCache`'s shape (a weak per-class map); **no generation stamp**, because nothing writes it — the key is the prototype object and a reload makes a new one |
| S2 | `ExecutionContextApi._dispatchContext()` returning the current frame node as an opaque exported type `FrameToken`; **replaces** `_boundaryContext` (deleted) | `api/execution-context.ts` | the frame-stack row: reuse of `FrameNode`; no new state |
| S3 | an optional trailing `parent?: FrameToken` on the existing `FramePush` capability | `api/execution-context.ts` | the frame-stack row: same call, same claim, same proof |
| S4 | `recognitionOf(viewer, target)`, a file-private split of `describeCore` into "work out the recognition state once" and "render a form from it" | `platform/idea/api/RecognitionLogic.ts` | the two recognition rows |
| S5 | `packages/server/scripts/profile-layer.ts` — the layer's share of a `.cpuprofile`, by file | a script, beside `bench-gate.ts` | the instruments row. **Genuinely new**: searched `packages/server/scripts/` and `tools/` for `prof`, `cpuprofile`, `selftime`; only `bench-*` exists, and the summarizer is a scratchpad file |
| S6 | read rows in `bench-gate.ts` (own field · method read · prototype getter · absent property, on `Probe`) | the existing script | the instruments row |
| S7 | `packages/wire/tests/call-security-performance.dirty.wire.test.ts` + its `.baseline.json` | wire tier | the instruments row (`runCrowd`, `quietBoxRefusal`, `foreignMeter` reused; the baseline-file shape is `controller-liquidity`'s) |

S2, S3 and S4 land only if W0's measurement puts their target at or above
the floor in D8. If a wave does not land, its row leaves this table in the
same commit that marks the wave skipped.

### P9–P14, per item

| item | P9 predictable from def and `help` | P10 metadata is a Document | P11 no caller branches on the destination | P12 no synonym | P13 fits the host's header sentence | P14 nothing moves or decides invisibly |
|---|---|---|---|---|---|---|
| S1 | n/a: no command; a read returns exactly what it returned | n/a: a derived cache, not a vocabulary | none: the trap asks one question of one cache | replaces `findDescriptor`, which is deleted | `ProxyApi`'s header: *owns the get-trap mechanics: descriptor lookup, wrapper caching* | caches only a fact fixed at class definition; every value is still read live (D1) |
| S2 | n/a | n/a | none | replaces `_boundaryContext`, deleted in the same commit; `getCurrentTarget` stays for its other callers | `ExecutionContextApi` is the frame stack; this is its top | a read; decides nothing |
| S3 | n/a | n/a | none: the holder passes what it just read, or nothing | the same `FramePush`, one optional argument | the push | the parent is the node the holder read in the same synchronous turn; the async-policy branch passes none and re-reads (D4) |
| S4 | n/a: `look`, targeting and every name read the same words | n/a | none | `describeCore` keeps its name and callers; the split is inside it | `RecognitionLogic`: what a viewer perceives a target as | computes the same answer once instead of twice |
| S5–S7 | n/a: tooling | n/a | none | S5 has no predecessor in the tree; S6 extends the one bench; S7 is a second file because `crowd-timing`'s gates are another build's (D9) | scripts and the wire tier | read-only against the world, apart from S7's declared `.dirty.` acts |

---

## Plan-level decisions

### D1 — The accessor cache: shape, key, and what stays live

**Question.** How does the trap learn "is `prop` a getter?" without walking
the chain, and stay exact for own accessors, symbols, absent properties and
test spies?

**Choice.** Three steps, in this order, replacing the `findDescriptor` call:

1. **Own property first, exactly as today.**
   `Object.getOwnPropertyDescriptor(target, prop)`. If it exists: an own
   accessor takes the getter path; an own data property is the value. This
   is today's level-0 iteration, at today's cost. It is what keeps a field,
   a lazily assigned slot, an instance-level spy (`obj.m = vi.fn()`) and an
   own accessor exact.
2. **Otherwise the prototype chain, from the cache.**
   `#accessorCache: WeakMap<object, Map<string | symbol, AccessorEntry | null>>`,
   keyed on `Object.getPrototypeOf(target)`. The per-prototype `Map` is
   looked up once in `wrap` and held in the handler closure beside
   `wrapperCache`; the trap compares `Object.getPrototypeOf(target)` to the
   prototype seen at wrap and falls back to the `WeakMap` if they differ, so
   a re-parented instance is still right.
   - `null` means *no accessor anywhere on the chain* (a method, a prototype
     data property, or absent). The trap then does `Reflect.get` as today,
     so the **value is always read live**: a `vi.spyOn(X.prototype, 'm')`,
     the mock passthrough, the weak-field self-heal and
     `obj.foo === obj.foo` are untouched.
   - `AccessorEntry` is `{ holder, get }`: the prototype that declares the
     accessor and the getter function. The trap needs the function itself
     (`get.call(receiver)`), not a flag.
3. **An accessor hit is confirmed before use.** One
   `Object.getOwnPropertyDescriptor(entry.holder, prop)`; if its `get` is
   not `entry.get`, the entry is recomputed by the full walk. This keeps a
   getter that is spied, replaced or turned back into a method exact, for
   one descriptor read in place of a walk.

A miss fills the entry by today's walk, starting at the prototype.

**The one stated assumption.** A property that is absent or a method on an
existing prototype object does not later become an accessor *on that same
object*. Production never does it (grounding), no test does it, and hot
reload cannot (it makes a new object). It goes into `call-security.md` in
W1 as a sentence: a test that needs a class whose method is a getter builds
a new class.

**Why not cheaper.** Skipping step 1 for speed (cache first, own property
never checked) would stop routing an own accessor through the pipeline. No
check is traded for speed; step 1 costs what it costs today. Whether an
exact form of step 1 is cheaper is W1's measurement, between three exact
candidates only: the own descriptor as above; `Object.hasOwn` then the
descriptor; `Object.prototype.__lookupGetter__.call(target, prop)` for the
whole question with no cache. The builder keeps the fastest exact one and
records the three numbers.

**Why no generation stamp.** The ledger offered `#policyGeneration`'s shape.
That stamp exists because policy writers run after a class has dispatched.
Nothing writes an accessor after class definition, so a stamp would be a
counter nobody bumps. Step 3 covers the one direction a test could exercise.

### D2 — Method reads keep the per-wrap `wrapperCache`

**Question.** Should the wrapper be cached per `(proxy, prop)` so a method
read skips `Reflect.get`, the mock check and the `WeakMap`?

**Choice.** No. The `Reflect.get` cannot be skipped: it is how a spy or a
replaced method is seen, and the wrapper must be keyed on the function it
wraps or a swapped method would keep its old wrapper. A `Map<prop>` in
front of the `WeakMap<fn>` trades one lookup for another. W2 touches the
trap's remainder only where W1's re-profile shows a named line at or above
D8's floor; its candidates are listed there.

### D3 — What "the layer" is, for the share

**Question.** The acceptance criterion is a ratio. Of what?

**Choice.** Fixed in W0 and never changed afterwards. Self time in:
`api/proxy.ts`, `api/security.ts`, `api/execution-context.ts`,
`lib/security/**`, `api/shadow.ts`'s two gate entries, and Node's
`AsyncLocalStorage` internals (`run`, `getStore`,
`executionAsyncResource`, `lookupPublicResource`, by function name and
`node:` URL). Divided by busy self time (total less `(idle)`). The
recognition walk is **not** in the numerator: it is content the layer taxes,
and its cut shows up as fewer dispatches. `PathTrie.#walk` and
`MixinApi.hasMixin` are reported on their own line and not counted.
`profile-layer.ts` takes an optional uptime window so the idle window and
the crowd are reported separately; the gate is on the **crowd** window
(requirements, acceptance 2).

### D4 — Frames and the async context: three cuts, all exact

**Question.** What is cuttable without changing async propagation or
attribution?

**Choice.** Nothing about *when* a frame is pushed or *what* it holds
changes. `AsyncLocalStorage.run` stays the one way a frame becomes current;
no `enterWith`, no skipped push. Three cuts inside that:

1. **One store read per instance dispatch, not three.**
   `_dispatchContext()` hands the gate the current node once. The gate reads
   the caller (`node.frame.target`) and the boundary fields
   (`node.root.frame.metadata`) from it, and passes the node back to the
   push as `parent`. The static wrapper does the same (two reads become
   one). When the policy is async, the continuation passes **no** parent
   and the push re-reads: the context is the same by ALS's own guarantee,
   and re-reading costs nothing on a path that already allocated a promise.
2. **No allocation for the boundary fields.** Falls out of (1): the gate
   reads two fields off the root's metadata; the `{scope, bound}` object is
   gone with `_boundaryContext`.
3. **`Date.now()` per frame**, if and only if the W3 census finds no reader
   of `CallFrame.timestamp` in `packages/` (source, tests, wire, client).
   Then the field is removed from `CallFrame` and the three writers. If
   anything reads it, it stays.

**Exposure.** `FrameToken` is the node the public `getCallStack()` already
materializes frames from; it confers nothing a caller cannot already read.
`parent` is accepted only by the claimed push, whose two holders are in
`api/security.ts` and already supply `caller` and `target` themselves.

**Reported, not adopted.** W0 also runs the bench once under
`node --experimental-async-context-frame` (Node 22's opt-in; the default
from Node 24), which replaces the async-hooks-backed store. The number goes
in the drive record and the MR as an option for the owner. Changing the
production runtime's flags is a deployment decision the requirements did
not make.

### D5 — The static wrapper

**Question.** Cut the `() => body.apply(this, args)` thunk? Cache the
static policy?

**Choice.**
- The static policy is already cached (grounding). The remaining cut is a
  **per-wrapper memo**: `wrapped` closes over `let gen = -1; let policy`,
  and re-resolves only when `gen !== SecurityApi.#policyGeneration`. The
  wrapper is created inside the class body, so it can read the private
  counter. A later `@CallSecurity` still invalidates, by the same stamp.
- The store read drops from two to one (D4.1).
- **The thunk stays unless W0 says otherwise.** Removing it needs the push
  to take `thisArg` and `args`, and `AsyncLocalStorage.run` spreads extra
  arguments into an array of its own, so one allocation is traded for
  another. If W0's static-call bench row shows the closure at or above D8's
  floor, the cut is a trailing `(thisArg, args)` on the same `FramePush`,
  never a second push function (P12). `_callSecWrapped` and the wrapper's
  `name` are untouched either way.

### D6 — Recognition: share the state, and no cross-call memo

**Question.** Hoist the viewer checks per walk; share the two describes.

**Choice.**
- **Share.** `describeCore` splits into `recognitionOf(viewer, target)`,
  which runs every gate and recall once and returns a small state (the
  fallback text when a gate ended it; otherwise the instance name, the type
  name, whether the target is a persona, the label), and the existing form
  rendering over that state. `perceivedKeywordsImpl` calls `recognitionOf`
  once and renders `concise` and `distinguishing` from it. Every other
  caller of `describeCore` is unchanged. For an organism candidate this
  halves the gated calls recognition makes (`canSeeGate`'s
  `StuffApi.findByTemplatePath` and `canSee`, `tierOf`, `perceivedHow`,
  `getPresentation`, the recall), which is where the cost is.
- **The hoist is the share, and stops there.** After the split the viewer
  checks run once per candidate instead of twice. Hoisting them to once per
  *walk* needs either a memo that outlives the call, which is unsound
  because a shadow can confer `Sensor` between calls (grounding), or a
  batch entry beside `perceivedKeywordsFor`, which is a synonym for an
  existing call (P12) and a second mixin cache beside the registry's own
  (the mixin test is another build's by the requirements' non-goals). If
  W5's re-profile still shows those two checks at or above D8's floor, that
  goes to the slate as a note for the build that owns `MixinApi.hasMixin`.

### D7 — Wave order

W0 instruments and baseline, then the cuts in the 2026-11-17 profile's
order: the descriptor walk (14.7%) and the trap around it (12.5%), frames
and the async context (~9%), the gate and the static wrapper (~11% + ~4%,
of which little is cuttable without a check), recognition. **W0's profile
re-ranks them.** W1–W5 are independent of each other; if W0 ranks them
differently the builder reorders, and says so in the wave's commit and in
this file. Whatever W0 ranks high inside D3's layer that is not on this
list becomes a wave of its own under D8's rules.

### D8 — What counts as a win, and what is left alone

A cut lands only if **both** hold on a quiet box:

- the bench row it targets improves by more than 10% (`docs/testing.md`:
  nothing under 10% is real on this machine), and
- no other bench row and no refusal test regresses.

A candidate whose target is under **1% of busy self time** in the latest
world profile is not attempted. A candidate that fails either test is
reverted in the same wave, and the wave's commit says what was measured.
This is how "measure first" is held to something.

### D9 — The drive is a new wire file

**Choice.** `packages/wire/tests/call-security-performance.dirty.wire.test.ts`,
not an extension of `crowd-timing`. `crowd-timing`'s gates are
crowded-rooms' absolute targets, some of which master misses by the owner's
ruling; this build's gates are *relative to its own baseline*, plus one
absolute (idle ≤ 0.15). The new file reuses the harness (`runCrowd`,
`quietBoxRefusal`, `foreignMeter`, `Session`, `hand`, the restart helper's
shape) and leaves `crowd-timing` untouched.

- `CSP_RECORD=1` writes `call-security-performance.baseline.json` (W0, on
  unchanged code). Without it the file compares against the baseline.
- "No worse" is **within 10% of the baseline**, the box's stated noise
  bound. Idle is absolute: ≤ 0.15.
- Timed steps run only under `WIRE_QUIET=1`, as `crowd-timing`'s do, and
  report themselves skipped by name otherwise. Steps 5 and 7 are not timed
  and run on every MR.

### D10 — Staging steps 5 and 7

One probe class, `platform/thing/WireCspProbe.ts`, written into the server
tree by the wire file's `beforeAll` and removed in `afterAll`
(`typecheck.wire.test.ts`'s precedent). It is never committed. Its variants
sit beside it as `WireCspProbe.v1.ts.txt` / `.v2.ts.txt` scratch files the
test also writes and removes.

- **5a out-of-module call** — founder `eval --parcel`: call `destroy()` on
  a thing standing in the parcel. `ApiOnly` refuses; the checkpoint reads
  the `SecurityError` text.
- **5b forged frame tag** — `eval` cannot reach `ExecutionContextApi`
  (grounding), so the forge is made from a non-framework **file**, which is
  what the requirement names: the probe has a method that calls
  `ExecutionContextApi.tagCurrentFrame(...)`. `platform/thing/` is not on
  `_frameMutatorAllowlist`. A clone of the probe is asked to run it; the
  checkpoint reads the refusal naming `tagCurrentFrame`.
- **5c destroyed object is inert** — `eval`: hold a thing, destruct it
  through `StuffApi.destruct`, call a method on the held reference; the
  result is `undefined` and nothing throws.
- **5d a pointer to a destroyed object reads as nothing** — `eval`: a host
  with a `ref: 'instance'` weak field (take the exemplar
  `api/__tests__/proxy.weakRef.test.ts` uses), point it at a thing, destruct
  the thing, read the field; it is `null`.
- **5e a spy-marked function is gated outside a test run** (D11) — `eval`:
  set a function carrying `_isMockFunction = true` as the probe's gated
  method on one instance, call it from outside its allowed caller; refused.
- **7 hot reload** — `v1` has a getter `tone` returning `'v1'`, a method
  `ring()` returning `'v1'`, and a plain method `shape()` returning
  `'method'`. Clone one probe (`old`). The founder `cp -s`'s `v2` over the
  class file (the in-game write verb text can drive) and `reload`s it. `v2`
  changes `tone` and `ring()` to `'v2'` and makes `shape` a getter returning
  `'getter'`. Clone a second probe (`fresh`). Read through `eval`, which
  reads through the proxy:
  - `fresh.tone === 'v2'`, `fresh.ring() === 'v2'`,
    `fresh.shape === 'getter'`;
  - `old.tone === 'v1'`, `old.ring() === 'v1'`,
    `typeof old.shape === 'function'` and `old.shape() === 'method'`.

Each has a unit twin (Test & gate strategy), because a wire refusal read
from prose can pass for the wrong reason. If the build finds one of these
unreachable in-game for a reason not seen here (the probe will not clone
without a row; `cp` refuses the scratch extension), it stages through
`POST /auth/test-stage` or a test-world row, says so in the drive record,
and the unit twin carries the proof. It does not drop the step.

---

### D11 — The spy passthrough holds only in a test run (owner ruling, 2026-11-18)

**Question.** The get trap returns any function carrying `_isMockFunction`
unwrapped (`api/proxy.ts:231`), in production as in tests. Anything that can
set a property on a function it places on a Stuff (or on a prototype) gets
an ungated method. Close it here?

**Choice.** Yes, the owner ruled it into this build. The passthrough is
taken only when `SecurityApi.isTestEnvironment()` is true (`VITEST` or
`NODE_ENV=test`; `api/security.ts:774`). `proxy.ts` already imports
`SecurityApi`, so no new import edge. The answer is read **once per
`ProxyApi.wrap`** into the handler closure beside `wrapperCache` (the
environment does not change within a process), so the hot path costs one
boolean test, the same as today's property read, and the flag check itself
is skipped entirely in production. Outside a test run a spy-marked function
is wrapped and gated like any method.

**Grounding.** `grep -rn _isMockFunction packages/server/src packages/content`
finds only the trap (2026-11-18): no production code sets the marker, so
production behavior changes only for a function that was forging it. The
wire world scrubs `VITEST` from the server it spawns (`api/security.ts`
~764), so the wire drive exercises the production branch.

**Not chosen.** Removing the passthrough: it is what keeps `vi.spyOn`
assertions working through a proxy, and hundreds of tests rely on it.

### Decisions the build made (recorded as they were made)

- **D12 — The spy passthrough is gated on a test RUNNER, not a test
  environment** (W1b; supersedes D11's `isTestEnvironment()`). The wire
  world sets `SAXONBERG_TEST_WORLD=1`, which `isTestEnvironment()` counts,
  so D11 as written would have left the bypass open in exactly the world
  step 5e drives — the step could never fail. A spy exists only where a
  test runner runs in the process, so the gate is `VITEST` or
  `NODE_ENV=test`: `SecurityApi.isTestRunner()`, which
  `isTestEnvironment()` now composes. Decided by the requirements (5e must
  be observable in the wire world) over the plan's wording.
- **D13 — The gate bench was dead on master; revived.** `test-bootstrap`
  reaches `backend-store.ts`, which imports `vitest` at module scope, and
  vitest throws outside its worker — so `bench-gate` died at import (since
  the fixture landed). The preload now registers a resolve hook
  (`bench-gate-hooks.js`) answering `vitest` with a stub whose every use
  throws, and sets `NODE_ENV=test` (the bench stands the world the way a
  unit test does, and `@TestOnly` seams are withheld otherwise).
- **D14 — D10's staging, as the world actually allows it.**
  - **No template row.** A wizard's eval may not write one (the sandbox
    holds it inside the founder's home circle: `writeTemplate` →
    `access-denied`, `saveTemplate` → *sandbox boundary denied
    aroundSave()*). Probes are made from the class as installed NOW:
    `StuffApi.loadClassByPath` + `StuffApi.create`, unplaced (a move would
    touch the founder, outside the circle). The probe exports its class by
    name as well as default, because the hot-reload registry is read by the
    file's basename — with only a default export `loadClassByPath` returns
    the first import forever.
  - **Eval bodies** go through an AsyncFunction built from a quoted string:
    the command line splits on `;` and a quoted `;` survives.
  - **5a uses the probe's own `FromModule` gate, not `destroy()`.** ⚠
    Found: an eval body runs under the `ScriptLogic` frame
    (`/platform/idea/api/script`), which `ApiOnly` admits — so a wizard's
    eval may call any `ApiOnly` method, `destroy()` included (the stack:
    `EvalScript → ScriptApi.runSandboxed → ScriptLogic → <target>`). That
    is eval's standing reach, not this build's to change; it is reported to
    the owner (MR description) and goes to the slate at `/finalize`.
  - **D15 — the quiet box's foreign bound.** See Drive record → Baseline:
    the timed rows are recorded with their foreign load; the gate is the
    profile's layer milliseconds, which another process cannot move.
  - **Step 7's edit is written to the file directly** (as
    `typecheck.wire.test.ts` does): the in-game `cp -s` asks for CODE title
    over `/platform/thing/`, which the founder does not hold. The install is
    the in-game `reload`, the act under test.

## ⭐⭐ Host placement

No field, mixin or class is added to any Stuff host.

| item | host | what it claims about everything else on that host |
|---|---|---|
| `#accessorCache` | a static on `ProxyApi`, keyed by prototype | Every proxied Stuff is asked the same question on every read today; the cache answers it for all of them. No class opts in, none is narrowed out, no default answers "no" |
| the per-prototype `Map` held in `wrap`'s closure | one reference per proxy, beside `wrapperCache` | Same: every wrap has a prototype |
| `_dispatchContext`, `parent` | `ExecutionContextApi`, the frame stack | Statics on the Api that owns the stack; no instance state |
| `recognitionOf` | file-private in `RecognitionLogic.ts` | Not on a host. It is called for exactly the targets `describeCore` is called for today |

The guard test: no guard re-narrows a host set. The quiet-default test: the
cache holds an entry only for a property somebody read.

---

## Convention conformance

- **`props:`/`cast:`, Locations, the `<root>/<branch>/` pattern, the five
  namespace axes** — not applicable: no row, no place, no class with a
  template path. The uncommitted probe is at `/platform/thing/` because the
  drive needs a non-framework file under the kernel root.
- **Module scope declares; lifecycles initialize** (`lint:module-scope`) —
  `#accessorCache` is a `static #` initializer on `ProxyApi`, the form the
  file already uses for `#interceptors`. No new module-scope statement.
- **Import boundary** (`lint:imports`) — `api/proxy.ts` still value-imports
  only `SecurityApi`; S1 needs no import. `api/execution-context.ts` gains
  none.
- **Module categories / export discipline** — no new module, no new
  exported function, no new `eslint-disable no-restricted-syntax`.
  `#accessorOf` is a private static, which also retires the one file-private
  function `api/proxy.ts` has. `recognitionOf` is file-private in a file
  whose existing shape is file-private functions under a logic singleton;
  the lint counts exports and none is added. `FrameToken` is an exported
  **type**. S5 is a script.
- **`#` versus TypeScript modifiers** — `api/` defaults to `#`; S1 follows.
- **Verbs on objects** (`lint:object-verbs`), **thin forwarders**
  (`lint:thin-forwarder`) — no new Api static takes a world object.
  `_dispatchContext` takes nothing.
- **`lint:eval-surface`** — `ExecutionContextApi` is bootstrap-special and
  outside that census; the count does not move.
- **`lint:test-seams`, `lint:unconsumed-seams`** — no test seam is added.
  D1 was shaped so that none is needed.
- **`lint:boundary`, `lint:gates`** — the exemption lists and gate strings
  are untouched; both must still pass, since W3 edits the code they sit in.
- **`lint:test-bootstrap`** — every new unit test imports `test-bootstrap`.
- **`lint:schema`** — no collection. **No migration, no new `isWizard`.**
- **American English** throughout.

Review questions P3–P8:

- **P3 refuse, skip or throw.** No new failure path. The existing three are
  preserved by name: a denied call throws `SecurityError`; a destroyed
  object is a skip (`undefined`); a forged frame throws. A stale accessor
  entry is recomputed, never served (D1.3). D8 reverts a cut that does not
  measure; it does not leave it in quietly.
- **P4 no duck typing.** None added. `AccessorEntry` and `FrameToken` are
  declared types. The trap's existing `_isMockFunction` and `isDestroyed`
  structural reads are unchanged and are not this build's to re-shape.
- **P5 the mixin decides.** No controller and no mixin is touched. The one
  model-side decision (what a viewer perceives) stays in `RecognitionLogic`.
- **P6 persistence per content.** Nothing persists. Every cache here is
  derived, process-local and weakly keyed.
- **P7 load on use.** The cache fills on first read of a property; the push
  capability is claimed lazily as today. No boot entry.
- **P8 names.** `accessorOf` says what it returns. `_dispatchContext`
  replaces `_boundaryContext` because it now carries the caller as well as
  the boundary. `recognitionOf` is the noun the file's doc already uses.
  `FrameToken` is opaque on purpose.

Gates this build must pass: `pnpm -C packages/server lint:family` (whole),
with `lint:module-scope`, `lint:imports`, `lint:boundary`, `lint:gates`,
`lint:test-bootstrap`, `lint:test-seams`, `lint:eval-surface` and
`lint:drive-scripts` the ones its edits sit under; ESLint
(`no-restricted-syntax`, sealed-subdir isolation for `api/mql/**`).

---

## Waves

Every wave ends at a commit, leaves the tree green on `pnpm test:near` and
`lint:family`, and is landable alone. Every cut wave re-runs `bench-gate`
(quiet box, `env -u NODE_OPTIONS -u VSCODE_INSPECTOR_OPTIONS`) and writes
its row into the table at the end of this section. Node commands in this
build are prefixed `NODE_OPTIONS= VSCODE_INSPECTOR_OPTIONS=`.

### W0 — Instruments and the baseline (no layer change) — ✅ DONE

> e0af07435 + the baseline commit. The bench was dead on master (D13);
> staging went by D14; the baseline's crowd-window layer is 40.6 s
> (54.8%), the gate 20.3 s. W0's profile keeps the plan's order.

**Goal.** A number for every acceptance criterion, taken on unchanged code,
and a ranking that can overrule this plan's order.

1. `scripts/profile-layer.ts` (S5, D3): reads a `.cpuprofile`, optional
   `--from/--to` server-uptime seconds, prints busy total, the layer's milliseconds and share
   with a line per file and per function inside it, and the two out-of-scope
   rows. Check it against the 2026-11-17 profile; it should reproduce ≈57%
   (that file is in a session scratchpad and may be gone, in which case the
   check is skipped and said so).
2. `bench-gate.ts` read rows (S6): on `Probe` add an own field, a prototype
   getter and a deliberately absent name; time `p._n`-style own read,
   `p.bump` read without calling, the getter read, the absent read. Add a
   static-Api call row (a decorated static with a `Public` policy). Record
   the whole table.
3. The wire file (S7, D9, D10), all eight steps, with `CSP_RECORD=1`
   writing the baseline. Steps 5 and 7 are written now and must pass on
   unchanged code: they are the regression net for every later wave.
4. **B2, once, now:** make each of step 5's four checks and step 7's six
   reads fail on purpose (edit the expectation, see red, restore).
5. The quiet-box run (procedure under Test & gate strategy) with
   `WIRE_CPU_PROF=<dir>`: record idle cores, `say` p95, in-turn p95, the
   on-screen card, login p95, the five into the full square, freeze
   samples, restart p95; run `profile-layer` over the crowd window and the
   idle window.
6. One extra bench run under `--experimental-async-context-frame` (D4,
   reported only).
7. Write all of it into **Drive record → Baseline** below and commit the
   baseline JSON. Re-rank W1–W5 if the profile says so.

**Files.** `packages/server/scripts/profile-layer.ts`,
`packages/server/scripts/bench-gate.ts`,
`packages/wire/tests/call-security-performance.dirty.wire.test.ts`,
`packages/wire/tests/call-security-performance.baseline.json`, this plan.
**Acceptance.** The baseline table is filled; steps 5 and 7 are green on
master's code and each has been seen red.
**Commit.** `build(call-security-performance W0): instruments and the baseline`

### W1 — The accessor cache (D1) — ✅ DONE

> As planned: own descriptor live, then the per-prototype cache, an accessor
> hit confirmed on its holder. Bench (busy box, W0 vs W1 alternated twice):
> **absent read 840→277 ns, deep method read (`isDestroyed`, declared on
> Stuff) 840→330 ns** — the row the world is made of, added to the bench
> in this wave because `Probe`'s own members sit one level up and the walk
> they paid was already short (method read 173→154, getter 593→639:
> within noise). D1's exact forms: A (own descriptor) kept; B
> (`Object.hasOwn` first) measured no better (own field 126/138 vs
> 143/150 ns); C (`__lookupGetter__`, no cache) is the whole-chain walk W0
> paid by construction, not timed. `test:near` 300 files green.

**Goal.** A method, prototype-getter or absent read stops walking the chain.

- `ProxyApi.#accessorCache`, `ProxyApi.#accessorOf`; the trap's three steps;
  `findDescriptor` deleted. The per-prototype map is hoisted in `wrap`.
- Measure D1's three exact forms of step 1 on the read rows; keep the
  fastest exact one; record all three.
- Unit tests in `api/__tests__/proxy.test.ts` (a new `describe`): an own
  field; an own accessor defined on the instance goes through the pipeline;
  a prototype getter runs with `this === proxy` and is gated; a method read
  is still wrapped and `obj.m === obj.m`; `vi.spyOn(X.prototype, 'm')`
  after a first read is seen and passes through unwrapped; `obj.m = vi.fn()`
  is seen; a getter replaced on its holder after a first read is the one
  that runs (D1.3); a symbol-keyed getter; an absent property reads
  `undefined` twice; an instance re-parented with `Object.setPrototypeOf`
  answers for its new chain; two classes of the same name, one with a
  method and one with a getter, each answer for themselves (the reload
  shape).
- `api/__tests__/proxy.weakRef.test.ts` and
  `api/__tests__/hot-reload.test.ts` stay green untouched.
- `docs/subsystems/call-security.md § What a gated call costs`: the read
  path, the cache, the one assumption.

**Files.** `api/proxy.ts`, `api/__tests__/proxy.test.ts`,
`docs/subsystems/call-security.md`.
**Acceptance.** Method-read, getter-read and absent-read rows down by more
than 10%; own-field row and the call row not worse; wire steps 5 and 7
green (not quiet-box).
**Commit.** `perf(proxy): the accessor answer is cached per prototype (W1)`

### W1b — The spy passthrough is a test-run affordance (D11)

**Goal.** Outside a test run, a spy-marked function is gated like any method.

- In `ProxyApi.wrap`, read `SecurityApi.isTestEnvironment()` once into the
  handler closure; the trap's `_isMockFunction` branch runs only when it is
  true.
- Unit test (`api/__tests__/proxy.test.ts`): with the environment answer
  forced false through the existing test-environment seam (or a child
  process with `VITEST` unset, if no seam exists — do NOT add a new
  exported seam), a gated method replaced by a function carrying
  `_isMockFunction = true` is refused from a disallowed caller; with it
  true, `vi.spyOn` still passes through and `toHaveBeenCalled` holds.
- Wire step 5e (D10's probe): `eval` places a spy-marked function on the
  probe and calls the gated method from outside its caller → refused.
- `docs/subsystems/call-security.md`: one sentence where the passthrough
  is described.

**Files.** `api/proxy.ts`, `api/__tests__/proxy.test.ts`, the wire file,
`docs/subsystems/call-security.md`.
**Acceptance.** The refusal holds in the wire world; `pnpm test:near` over
`api/` green (spies still pass in tests); bench rows not worse (D8).
**Commit.** `fix(proxy): the spy passthrough holds only in a test run (W1b)`

### W2 — The trap's remainder, by the profile

**Goal.** Whatever `get` still shows after W1. Start with a `--hot` profile
of the read rows and a short world profile (busy-box shares are fine for
ranking). Candidates, each under D8, none of which removes a branch:

- for an own data property, return the descriptor's `value` in place of a
  second `Reflect.get` (identical by definition for an own data property);
- test `typeof prop === 'string'` once and reuse it for the weak-field
  check and the method name;
- order the passthrough test so the common string read does one `Set.has`.

If nothing clears D8's floor the wave is recorded as *measured, nothing
taken* and has no commit.

**Files.** `api/proxy.ts`, `api/__tests__/proxy.test.ts`.
**Acceptance.** As D8; W1's tests untouched and green.
**Commit.** `perf(proxy): <what was taken> (W2)`

### W3 — Frames and the async context (D4)

1. Census `timestamp` readers on `CallFrame` across `packages/`. Record the
   list in the commit.
2. `_dispatchContext()` and `FrameToken`; delete `_boundaryContext`; the
   gate reads caller, scope and bound from the one node and passes it as
   `parent`; the static wrapper likewise; the async-policy branches pass
   none.
3. Drop `Date.now()` and the field only if (1) found no reader.
4. Unit tests in `api/__tests__/execution-context.test.ts`: a frame pushed
   with `parent` has the same `getCallStack()` as one pushed without; a
   frame pushed after an awaited async policy sits under the awaiting
   frame; two interleaved async chains keep separate stacks through the
   gate; `getCircleScope()` inside a dispatch under a circle root is that
   circle. `execution-context-guard.test.ts` and
   `execution-context.circle-scope.test.ts` stay green untouched.
5. ⚠ Do not move the stack capture or add a function between a caller and
   `_assertFrameMutatorAllowed`: one extra frame broke 438 tests once
   (`call-security.md § The capture itself`).

**Files.** `api/execution-context.ts`, `api/security.ts`,
`api/__tests__/execution-context.test.ts`,
`docs/subsystems/call-security.md`.
**Acceptance.** The call row and the static-call row down by more than 10%,
flat across depth 0/25/100/200; `lint:boundary` and `lint:gates` pass;
`lib/security/__tests__/**` green; wire step 5 green.
**Commit.** `perf(frames): one store read per dispatch (W3)`

### W4 — The gate and the static wrapper (D5)

- The per-wrapper policy memo in `#wrapStaticDescriptor`.
- The thunk only if W0's static-call row put it at or above the floor.
- Any gate line the post-W3 profile names at or above the floor, under D8.
  Known and **not** candidates, because each is a check: the bypass
  consume, the destroyed-object guard, the scope compare, `policy.allows`,
  `touch()`, the shadow lookup.
- Unit tests in `lib/security/__tests__/decorators.test.ts`: a
  `@CallSecurity` registered on a static **after** that static has been
  called takes effect on the next call (the memo honors the generation); a
  denied static still throws the same message; an async static with
  `needs` still awaits them.

**Files.** `api/security.ts`, `lib/security/__tests__/decorators.test.ts`.
**Acceptance.** Static-call row down by more than 10%; nothing else worse.
**Commit.** `perf(security): the static wrapper remembers its policy (W4)`

### W5 — Recognition (D6)

- Split `describeCore`; `perceivedKeywordsImpl` reads the state once.
- Unit tests in a new `platform/idea/api/__tests__/RecognitionLogic.test.ts`
  (no file there covers the logic directly today; grep for
  `perceivedKeywords` finds only consumers' tests): for a stranger, a recognized person, a
  masked person, an unseen target, a named animal and a labelled item,
  `perceivedKeywords` returns exactly what it returned before (a table
  captured from master before the edit); `describe` in all six forms is
  unchanged for the same six; a call-count assertion that `canSee` is asked
  once per `perceivedKeywords`, not twice.
- `docs/subsystems/belief.md`: one sentence where the recognition face is
  described.

**Files.** `platform/idea/api/RecognitionLogic.ts`, its tests,
`docs/subsystems/belief.md`.
**Acceptance.** Tests green; a busy-box world profile shows
`perceivedKeywordsImpl`'s inclusive share down; `look <person>` and
targeting by a worn feature behave as before in the wire file's step 3.
**Commit.** `perf(recognition): one recognition state per keyword read (W5)`

### W6 — The drive, the record, the docs

- Quiet-box run of the wire file in compare mode with `WIRE_CPU_PROF`;
  `profile-layer` over the same windows as W0; `bench-gate`.
- If the share gate (step 4) is missed, see Risks R1 before doing anything
  else.
- Append **Drive record → After**; update the MR description.
- `docs/subsystems/call-security.md § What a gated call costs`: the new
  table (bench and world), the read path, and the sentence the slate got
  backwards (a bench of one call cannot rank a world of reads).
  `docs/testing.md § The quiet box`: `profile-layer` and the second drive
  file. The slate's status line and a one-line note for the owner of the
  path trie and the mixin test are `/finalize`'s.
- `pnpm test` once, here, alongside review (`CLAUDE.md`: two moments only).

**Commit.** `drive(call-security-performance): the record`

### Per-wave bench table (filled as waves land)

| after | call ns | own-field read | method read | deep method read | getter read | absent read | static call | depth 200 |
|---|---|---|---|---|---|---|---|---|
| W0 (master; busy box, load 5–6) | 1 053 | 118 | 149 | 834–849 | 513 | 701 | 137 | 932 |
| W1 (busy box, load 9–10, two rounds) | 1 175 / 1 097 | 158 / 117 | 154 / 156 | 311 / 347 | 639 / 719 | 277 / 369 | 167 / 184 | 1 099 / 1 391 |
| W2 | | | | | | | | |
| W3 | | | | | | | | |
| W4 | | | | | | | | |

---

## Reachability wiring

There is no new capability to reach. For the record, against the five
links:

| link | this build |
|---|---|
| verb | none added; every existing verb runs on the cut path |
| affordance | none |
| data | none |
| load | `#accessorCache` fills on first read of a property through any proxy; `ProxyApi.wrap` is the only way a Stuff is handed out, so there is no instance the cache does not serve. The push capability is claimed on first dispatch as today |
| arg gate | none |

The one thing that could ship dead is a cut that is in the tree and not on
the hot path. D8's bench row per cut is the check: a cut that does not move
its row is reverted.

---

## Acceptance-criteria coverage

| requirement | waves | proved by |
|---|---|---|
| empty world idles ≤ 0.15 of a core | W1–W5 | wire step 2, quiet box (W6) |
| the layer's own CPU time ≤ half its baseline (same acts, same windows) | W1–W4 (W5 by fewer dispatches) | wire step 4 + `profile-layer`, same windows as W0 |
| `say` and in-turn no worse; thirty back after a restart, no slower | all | wire steps 3 and 6 against the baseline |
| wrong-place call, forged frame, destroyed object, pointer to one: unchanged | W0 (net), every wave | wire step 5 on every MR; unit twins |
| a running class's edit reaches every new clone, including method → getter; old instances unchanged | W0 (net), W1 | wire step 7 on every MR; W1's unit tests |
| login into a full room reported before and after, and handed on | W0, W6 | wire step 3's reported lines; the number goes to crowded-rooms-slate § The next ceiling at `/finalize` |
| gated method call below 2.1 µs, flat in depth (goal; reported) | W1–W4 | wire step 8 = `bench-gate` |
| a test's spy still replaces the method it spies (goal) | W1 | W1's unit tests; the suite's 100 prototype spies |

Unmapped: none. One criterion is at risk (R1).

---

## Test & gate strategy

### The drive's steps

All **blocking**. No span step, no staged twin owed, no soak drive
(requirements). No new place, so no light step.

| step | pace | kind | where | gate |
|---|---|---|---|---|
| 1 baseline | `short` | staged | wire file, `CSP_RECORD=1`, quiet box, W0 | recorded |
| 2 the empty world | `short` | staged | wire file, quiet box; ten-minute idle window as `crowd-timing` | ≤ 0.15 cores; foreign CPU ≤ 0.5 or inconclusive |
| 3 thirty in one place | `short` | player | wire file, quiet box (`runCrowd`, the mould looks) | `say` p95 and in-turn p95 within 10% of baseline; logins, the five into the square, freeze samples **reported** |
| 4 the profile | `short` | staged | `WIRE_CPU_PROF` + `profile-layer` over step 3's uptime marks | crowd-window layer ms ≤ half of baseline; share reported |
| 5 a refusal is still a refusal | `instant` | staged | wire file, every MR (D10) | five named refusals (5a–5e) |
| 6 the thirty come back | `short` | player | wire file, quiet box (restart, thirty relog, each where they quit) | restart p95 within 10% of baseline |
| 7 hot reload still lands | `instant` | staged | wire file, every MR (D10) | six reads |
| 8 the gate bench | `instant` | staged | `bench-gate`, quiet box | < 2 140 ns, flat in depth; reported |

Step 4 needs the profile, which is written when the world stops. The wire
file prints step 3's uptime marks and the profile directory; the share is
computed by `profile-layer` after the file's own restart (step 6) has
written the first profile. The gate for step 4 is asserted by the builder
from that output and written into the drive record with the command line
used. It is the one checkpoint that is not an `expect` in the file, and the
record must show its number.

### The quiet-box procedure

1. `./tools/wt-status`; take the suite lock (`tools/lib/suite-lock.sh`).
2. `pgrep -af preload.js`, `readlink /proc/<pid>/cwd`; ask the sessions
   that own other Saxonberg servers to stop them. Never kill a sibling's
   world.
3. Drop this worktree's database.
4. `WIRE_QUIET=1 WIRE_BOOT=1 WIRE_BOOT_TIMEOUT=900000 WIRE_PORT=2014
   WIRE_CPU_PROF=<scratch dir> pnpm wire call-security-performance`
   (`CSP_RECORD=1` added in W0 only).
5. The file's first act is `quietBoxRefusal`; a busy box fails by name. A
   phase with more than half a core of foreign CPU is inconclusive and is
   re-run, never read.

The baseline and the after run are taken on the same box, the same day if
possible, with the same procedure. The quiet-box run happens **twice** in
the build: W0 and W6. Waves in between use the bench and steps 5 and 7.

### Unit tests (what the drive cannot isolate)

- W1: the trap's read kinds, spies, the reload shape (`proxy.test.ts`).
- W3: frame identity with and without `parent`, async interleaving
  (`execution-context.test.ts`).
- W4: the memo honors the generation (`decorators.test.ts`).
- W5: recognition output unchanged over a captured table.
- Unit twins of step 5, all existing and kept green untouched:
  `lib/security/__tests__/SecurityPolicies.test.ts` (out-of-module),
  `api/__tests__/execution-context-guard.test.ts` (forged frame),
  `api/__tests__/proxy.test.ts` (inert), `api/__tests__/proxy.weakRef.test.ts`
  (weak pointer).

### Suite and lints

`pnpm test:near` and `lint:family` per wave. `pnpm test` at code-complete
(W6) and at `/finalize`, never between, never in the background. A browser
walk (B3) is not owed: nothing a person sees or does changes, and there is
no feature to walk; the crowd over the real socket is the use. `/finalize`
records that as the reason.

---

## Risks & opens

**R1 — The cost criterion (owner ruling, 2026-11-18).** The requirements
first asked for half the *share*, which at a 57% share is a ~3.3× cut of the
layer (a share is a ratio: at 28.5% the layer must cost 0.40× everything
else). The planned cuts reach a 33–41% share. The owner ruled the gate is
**half the layer's own CPU time** over the same acts and windows (≈40%
share); the share is reported. Comparability is what makes that number
honest: W0 and W6 run the identical wire file, the same windows, on the
quiet box, and `profile-layer` reports layer **milliseconds** per window as
well as the share. If W6 still misses with every wave landed, the builder
takes the next rows of the post-W5 profile inside D3's layer under D8, one
wave each, until none clears the floor; then it is a recorded miss with its
number, first paragraph of the MR. No check is removed to reach it.

**R2 — Prototype tampering.** D1's assumption is that nobody turns a method
into an accessor on a live prototype. Code that can write a prototype can
already replace any method outright today, so the cache gives such code
nothing it lacks. The mock passthrough, which handed any `_isMockFunction`
function back unwrapped in production too, is closed by D11 / W1b.

**R3 — A stray probe file.** If the wire file dies between `beforeAll` and
`afterAll`, `platform/thing/WireCspProbe.ts` stays in the tree. `beforeAll`
removes any leftover first; staging by name keeps it out of a commit; the
build checks `git status` after every wire run.

**R4 — The quiet box is shared.** Four other worktrees. A baseline taken
under load poisons every later comparison. Any phase marked inconclusive is
re-run; W0 is not finished until one clean run exists.

**R5 — `tsx`/esbuild and closures.** A named function expression or a
closure assigned to a name carries a `defineProperty(fn, 'name')` under the
production runtime (27% of the gate once). Every wave checks its diff adds
no closure on a per-dispatch path; the per-wrapper memo in W4 is two `let`
bindings, not a function.

**R6 — `recognitionOf` drift.** The split must not change a word a viewer
reads. W5 captures the before-table from master first, then edits.

**Opens (the build decides and records; none blocks):**
- which of D1's three exact forms of step 1 is fastest;
- whether `CallFrame.timestamp` has a reader;
- whether the thunk is worth a trailing argument pair;
- whether the probe clones without a template row.

**Stop and ask** only for: a cut that would need a new exported function, a
new `eslint-disable`, or a branch of the trap or gate removed. Those are
out of bounds by the requirements and `CLAUDE.md`; the plan has no such cut.

---

## Deferred seams

None of these is designed here; each leaves as a line in
[call-security-performance-slate.md](../slates/tech-debt/call-security-performance-slate.md)
at `/finalize`.

- **The structural lever: reads inside a method body.** Most trap reads are
  `this.x` from a method already admitted by the gate. Whether a body's own
  field reads need the trap at all is a question about what the shadow and
  self-call guarantees are for, and it is the owner's. It is the only item
  seen that could move the share by a factor rather than by points.
- **The async-context runtime flag** (D4): the measured number and the Node
  version it becomes the default in.
- **`PathTrie.#walk` and `MixinApi.hasMixin`** (non-goals): their shares
  from W6's profile, and the finding that one `MixinApi.isX(host)` is three
  static-wrapper dispatches (`isX` → `this.hasMixin` →
  `ShadowApi.getAllShadows`), for the build that owns the registry.
- **A per-walk viewer check** (D6): needs the registry's own answer.
- **Login into a full room**: the new number, to crowded-rooms-slate § The
  next ceiling.

---

## Critical files

Read first, in this order:

1. `docs/requirements/call-security-performance-requirements.md`
2. `docs/subsystems/call-security.md` § What a gated call costs (the
   benchmarking warnings, *do not extract the capture*, *what was not
   traded away*)
3. `packages/server/src/mud/api/proxy.ts` (whole; 334 lines)
4. `packages/server/src/mud/api/security.ts` :225–460 (policy caches),
   :600–700 (static wrapper), :1540–1760 (the gate, `#proceed`)
5. `packages/server/src/mud/api/execution-context.ts` :140–240 (nodes,
   `_pushFrame`), :470–500, :720–770, :940–1000
6. `packages/server/src/mud/platform/idea/api/RecognitionLogic.ts`
   :360–590
7. `packages/server/src/mud/api/mql/scope-walk.ts` :210–270 (`candidateFor`)
8. `packages/server/scripts/bench-gate.ts`
9. `packages/wire/tests/crowd-timing.dirty.wire.test.ts`,
   `packages/wire/src/harness/crowd.ts`,
   `packages/wire/tests/typecheck.wire.test.ts`,
   `packages/wire/tests/controller-liquidity.dirty.wire.test.ts` (the
   baseline-file shape)
10. `docs/testing.md` § The quiet box; `docs/subsystems/hot-reload.md`
    (header); `packages/server/src/mud/api/hot-reload.ts` (header)
11. `docs/review-questions.md` (the B questions, per wave)

---

## Drive record

*(appended at build time)*

### Baseline — W0, master's code

Run 2026-11-18 12:52–13:17, `quiet-run` (suite lock, dropped DB, four
siblings and the soak lane holding), `CSP_RECORD=1 WIRE_QUIET=1
WIRE_BOOT=1 WIRE_PORT=2014 WIRE_CPU_PROF=<dir>`, on the W0 commit
(`e0af07435`). The baseline JSON is committed beside the wire file.

| measure | value | load beside it |
|---|---|---|
| idle cores (uptime 401–1001 s) | **0.289** | foreign 0.71 cores → *inconclusive* by the 0.5 bound |
| `say` p95 · in-turn p95 | 75 ms · 96 ms | foreign 1.34 → *inconclusive* |
| on-screen card | not measured by this file (crowd-timing's step) | — |
| thirty log in p95 · five into the full square p95 | 2 170 ms · 2 727 ms | foreign 1.34 |
| freeze samples over 100 ms | 33 of 195 | foreign 1.34 |
| restart p95 | 1 542 ms | — |
| **layer, crowd window** (uptime 1001–1150 s) | **40 629 ms of 74 189 ms busy — 54.8%** | (CPU self time; not moved by foreign load) |
| layer, idle window (401–1001 s) | 51 698 ms of 88 029 ms busy — 58.7% | |
| out of scope: `PathTrie.#walk` · `MixinApi.hasMixin` | crowd 2 173 · 2 482 ms (2.9% · 3.3%); idle 3 037 · 2 555 ms | |
| `bench-gate` (busy box, `--force`) | see the per-wave table | load 5–6 |
| bench under `--experimental-async-context-frame` | no gain: call 1 028 vs 1 053 ns; depth 200 **1 438** vs 932 ns (worse) | same box, back to back |
| W0's ranking of the layer's rows (crowd) | `findDescriptor` 12.6% · trap `get` 12.6% · gate closure (security.ts anon) 6.4% · `_pushFrame` 3.7% · ALS `run` 3.5% · proxy wrapper 3.0% · `#proceed`-side closure 2.7% · `resolveCallPolicy` 1.9% · `#runPipeline` 1.8% · ALS lookup 1.5% · `resolveStaticCallPolicy` 1.3% | the plan's order stands |

**The gate this build must meet** (requirements, owner ruling): layer ≤
**20 315 ms** over the same crowd window's acts; idle ≤ 0.15 cores.

⚠ **Foreign CPU (D15).** With five agent sessions and the VS Code server
alive, the box's ambient foreign CPU is ~0.7 cores with every sibling
holding (the crowd window's 1.34 includes a sibling's typecheck that
resumed before it saw the hold). The 0.5 bound cannot be met while the
sessions exist, so the timed rows are recorded *with* their foreign load
and the after-run is taken the same way. The gate number — the layer's
self milliseconds — is a CPU-profile figure and is not moved by another
process's load. Idle at 0.289 is well above crowded-rooms' 0.173 (master
has grown since); the ≤ 0.15 goal is therefore a near-halving of the idle
world, which the layer cut alone may not reach (R1).

### After — W6

*(the same table, the command lines, the count of steps run and passed, and
what each failure was)*
