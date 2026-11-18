# Call security performance — the investigation, and what it found

> **Status: PARTIAL** — the five gate optimizations (50 µs → 2.1 µs) and
> the boot work shipped →
> [call-security.md](../../subsystems/call-security.md) ·
> [persistence.md](../../subsystems/persistence.md)
> **Left:** in requirements 2026-11-18 →
> [call-security-performance-requirements.md](../../requirements/call-security-performance-requirements.md):
> the per-read descriptor walk (⭐ the world's largest item, not the
> smallest) · the proxy read trap · the frame push + async context · the
> static-Api apply thunk · hoisting the viewer-invariant checks out of
> `describeCore` · the double describe in the keyword path
> **Size:** a tail

*2026-08-30, from the libations live drive (MR !206). The founder's
framing: "it's probably not just one thing, it's probably a few
optimizations working together." That turned out to be exactly right —
five changes, each worth between 1.3x and 10x, and none of them the
thing the first profile pointed at.*

**Result: a proxied method call went 50 µs → 2.1 µs. 2000x a raw call →
424x. And flat in stack depth, where it used to double.**

---

## 1-3, 5-6 — SHIPPED, graduated to call-security.md § What a gated call costs

The instrument (`bench-gate.ts`, the four benchmarking gotchas), the
five findings (caller proof per call site not per call; the gate no
longer gates its own `ShadowApi` collaborators; five closures per
dispatch collapsed to one; `resolveCallPolicy` cached with a generation
stamp; the frame stack as a linked list), the measured arc (50 700 ns →
2 140 ns, 424x), the rule ("a loop over N objects that makes a gated
call per object costs N gate dispatches"), and what was NOT traded away
(tamper resistance, viewer-relative naming, the destroyed-object inert
guard) are all in
[call-security.md § What a gated call costs](../../subsystems/call-security.md#what-a-gated-call-costs)
— code-verified: `claimFramePush` / `_frameMutatorAllowlist`
(`lib/security/execution-context.ts`), `ShadowApi._gateEntries()`,
`resolveCallPolicy`'s generation-stamped cache, `FrameNode`'s linked
list — all present exactly as described. Not reproduced in the doc: the
per-step intermediate arc (7300 → 4500 → 3500 → 3150 ns as each of the
five changes landed) and the specific per-site percentage table from
the live drive (`GetController` 96.5%, etc.) — both are measurement
provenance for a decision already fully stated, recoverable from git.

---

## 4. The boot-time finding — SHIPPED, graduated to persistence.md

**Boot is not CPU-bound, and the gate was never its problem** — a fresh
boot's CPU profile was 76% idle while 96% blocked on Mongo round trips
(`StuffApi.clone` → `Template.findByPath` reading uncached, every time).
Built 2026-08-31 (`perf/boot-time`, MR!209): the resident whole-`content`
cache (991 rows, <600 KB, so a MISS is an answer not a reason to ask)
and the permanent `SAXONBERG_QUERY_TRACE=1` instrument — both in
[persistence.md § The resident `content` cache](../../subsystems/persistence.md)
and § The query trace. Warm boot 270 s → 35 s; fresh boot 5.7 min → 109 s
to world open. One reasoning paragraph from this section is NOT yet in
persistence.md — see Handoff in the compaction ledger.

---

## 7. Left on the table

- **`findDescriptor`** walks the prototype chain and allocates a
  descriptor per level, on every property access. ~55 ns of the
  remaining 2.1 µs. The safe form caches only *accessor-ness* per
  prototype (a method does not become a getter under HMR) and skips the
  walk entirely for the common case. Not done: the reward no longer
  justifies touching the get trap.
- **The static-Api wrapper's apply thunk** — one closure per static Api
  call, off the dispatch path but everywhere else.
- **Recognition, and the walk around it.** Salvaged from the retired
  `gate-cost-slate`, which measured the MQL scope walk before the gate
  was fixed and named two candidates the pass above never took:
  - **Hoist the viewer-invariant checks out of `describeCore`.**
    `isSensor(viewer)` / `isPerception(viewer)` are the same for all ~35
    candidates in one walk and are re-asked per candidate.
  - **`pushDirect` calls `describe` AND `perceivedKeywords`**, and for an
    ORGANISM the latter re-enters `describeCore` a second time
    (`RecognitionLogic:390`).
  - Caching recognition per (viewer, target) per resolve was considered
    and is **low value**: each candidate is visited once per resolve, so
    the win is smaller than it looks.

---

## 8. The overnight drive — moved to libations-slate

The libations drive record and its three loose ends (dilution over a game
hour, the mojito's `muddled` marker, the bitters debit, `put ice in bin`'s
message) moved to
[libations-slate § The overnight drive](../trades/libations-slate.md) on
2026-11-18. They were the bar's, not the gate's.

## Cross-references

[call-security.md](../../subsystems/call-security.md) ·
[templates.md](../../subsystems/templates.md) ·
[residency.md](../../subsystems/residency.md) ·
[persistence.md](../../subsystems/persistence.md) ·
[antipatterns.md](../../antipatterns.md) ·
[testing.md](../../testing.md) ·
*(supersedes the retired `gate-cost-slate` — its surface is salvaged above)*

## Second measurement — crowded-rooms (2026-11-17)

Profiles of a Terminus world (busy box, shares only): in the idle window,
the crowd of thirty and the last five logins alike, **~60% of SELF time**
sits in the call-security / proxy machinery — `findDescriptor`, the proxy
`get`, policy resolution, `_pushFrame`. It is the floor under every class
crowded-rooms cut; after that build the empty world idles at 0.17 of a core,
and what remains is the cast's own acts at content's cadence running on this
tax (the owner accepted 0.17 against the 0.15 target rather than pull either
lever).

## Reuse ledger for the plan (2026-11-18)

Every concept the build needs, and what already does it. Line numbers are
from master at a6cf85555.

| concept | what does it today | this build |
|---|---|---|
| a per-class cache that hot reload invalidates | `SecurityApi.resolveCallPolicy`'s `#policyCache`, keyed weakly on the constructor and stamped with `#policyGeneration` that every policy writer bumps | **reuse the shape** for the descriptor (accessor-ness) cache. ⚠ Its invalidation must also follow a hot-reload prototype swap, not just a policy write: check what `HotReloadApi` mutates (a new class, or methods on the old prototype) before choosing the key |
| the per-read getter test | `findDescriptor` (`api/proxy.ts`): walks the prototype chain with `getOwnPropertyDescriptor`, allocating a descriptor per level, on EVERY get-trap read that is not a passthrough key | **replace** with a cached accessor-or-not answer per (prototype, prop). An own instance field still answers from the instance first |
| the per-proxy method-wrapper cache | `wrapperCache` (a `WeakMap` per `ProxyApi.wrap`), keyed by the raw function | **reuse**; it already keeps `obj.foo === obj.foo` |
| the single-interceptor fast path | `ProxyApi.#runPipeline`'s `length === 1` branch | **reuse**; no chain is built |
| the caller-proof-per-call-site claim | `claimFramePush` / `_frameMutatorAllowlist` (`lib/security/execution-context.ts`) | **reuse**; untouched |
| the frame stack | `FrameNode` linked list, `_pushFrame` (`api/execution-context.ts:42`), over `AsyncLocalStorage.run` | **measure first**; ALS `run` + `getStore` + `executionAsyncResource` were ~6% together. A cut here must keep async propagation exact |
| the static-Api wrapper | `decorateApiClass` → `wrapped` (`api/security.ts` ~660), one `body.apply` thunk per call | **cut the thunk**; keep `_callSecWrapped` and the name |
| the static-policy lookup | `resolveStaticCallPolicy` (1.5% of busy) | **cache** with the same generation stamp as the instance form, if it is not already |
| the gate's unwrapped collaborators | `ShadowApi._gateEntries()` | **reuse**; untouched |
| the recognition entry checks | `describeCore` (`platform/idea/api/RecognitionLogic.ts:372`, checks at :406) and the twin at :539: `MixinApi.isSensor(viewer)` / `isPerception(viewer)` per candidate | **hoist** to once per walk where the walk has one viewer |
| the keyword path's double describe | `perceivedKeywordsImpl` (:548) calls `describeCore` twice (`concise`, `distinguishing`, :560–561) and `pushDirect` calls `describe` beside it | **share** one result per (viewer, target) within the call, not across resolves (the per-resolve cache was rated low value) |
| the instruments | `scripts/bench-gate.ts`; `WIRE_CPU_PROF` (`packages/wire/runner/boot.ts`); `crowd-timing.dirty.wire.test.ts`, the quiet-box procedure | **reuse**; the drive is these, before and after |
| the tamper / inert / self-heal guarantees | the destroyed-object guard in the security interceptor; R2.3 self-heal in the get trap; the `_isMockFunction` passthrough | **reuse unchanged**; each is a drive step or a test that must stay green |

Outside this layer, seen in the same profile, NOT this build's: the
`PathTrie.#walk` (3.5%) and `MixinApi.hasMixin` (2.6%). Recorded for
whichever build owns the path index and the mixin registry.

