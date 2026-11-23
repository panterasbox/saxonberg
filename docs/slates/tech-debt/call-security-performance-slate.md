# Call security performance — the investigation, and what it found

> **Status: PARTIAL** — two passes shipped: the gate (50 µs → 2.1 µs,
> 2026-08-30) and the reads (call-security-performance, MR !610,
> 2026-11-18: the layer's crowd cost halved, the read trap's chain walk
> cached, one store read per dispatch, the spy passthrough closed) →
> [call-security.md](../../subsystems/call-security.md) ·
> [persistence.md](../../subsystems/persistence.md)
> **Left:** ⭐ the structural lever (reads inside an admitted method body —
> the owner's question) · eval passes `ApiOnly` · wire worlds inherit
> `NODE_ENV=test` · `PathTrie.#walk` + `MixinApi.hasMixin` for the
> registry's owner · the per-walk viewer check
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
(`api/execution-context.ts`), `ShadowApi._gateEntries()`,
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

## 7. The second pass — SHIPPED, graduated to call-security.md

The call-security-performance build (MR !610, 2026-11-18) took the rows
this section used to list: the accessor answer cached per prototype (the
walk was the world's largest single line, though the bench had priced it
at ~55 ns), an own property read once, one store read per dispatch, the
static wrapper's policy memo, recognition worked out once per keyword read
(`pushDirect` no longer existed; the double describe was
`perceivedKeywords`' own), and the spy passthrough closed outside a test
run. Numbers and the lesson — *a bench of one call cannot rank a world of
reads* — are in
[call-security.md § What a gated call costs](../../subsystems/call-security.md#what-a-gated-call-costs).
The static wrapper's apply thunk was measured as not worth a trailing
argument pair, and Node's `--experimental-async-context-frame` as no gain
(worse at depth 200).

**What it did not reach: idle.** The empty world idles at 0.244 cores
against crowded-rooms' 0.15 target, and the layer is 0.054 of that — the
layer could vanish and the world would still idle near 0.19. The idle
world's remaining cost is the cast's labor at content's cadence, garbage
collection, the worker thread and the Mongo driver. **The next idle build
is not a call-security build.**

## 7½. Left

- ⭐⭐ **The structural lever: reads inside a method body.** After the
  second pass the trap's own `get` is the largest line in the world
  profile (18.9% of a crowd's busy time). Most trap reads are `this.x`
  from a method the gate has ALREADY admitted, because a method runs with
  `this === proxy`. Whether a body's own field reads need the trap at all
  is a question about what the shadow and self-call guarantees are for —
  the owner's, not a measurement's. It is the only item seen that could
  move the layer by a factor rather than by points.
- ⚠ **A wizard's `eval` passes every `ApiOnly` gate**, `destroy()`
  included: eval code runs under the `ScriptLogic` frame
  (`EvalScript → ScriptApi.runSandboxed → ScriptLogic → <target>`), which
  `ApiOnly` admits because logic singletons are the Api tier. That is
  eval's standing reach; whether it should be is a sandbox question
  (sandbox.md), found by the drive's step 5a.
- ⚠ **Every wire world runs with `NODE_ENV=test`**, inherited from the
  vitest process that spawns it (the runner scrubs `VITEST`, not
  `NODE_ENV`, and dotenv never overrides an inherited value; the worktree
  `.env` says `development`). One consequence:
  `ReactionRegistry.ensureTimer` returns early, so **the reaction flush has
  never armed in a wire world**. The fix belongs to the wire runner
  (`packages/wire/src/runner/boot.ts`'s `serverEnv`), with a check of
  every `NODE_ENV === 'test'` reader.
- **`PathTrie.#walk` and `MixinApi.hasMixin`** — 2.5% and 4.2% of the
  crowd's busy time after the pass, outside this layer (non-goals). One
  `MixinApi.isX(host)` is three static-wrapper dispatches (`isX` →
  `hasMixin` → `ShadowApi.getAllShadows`). For the build that owns the
  registry.
- **A per-walk viewer check.** `isSensor(viewer)` / `isPerception(viewer)`
  now run once per candidate (was twice), but they cannot be hoisted to
  once per walk without the registry's own answer: `hasMixin` consults
  shadows, and a shadow can confer `Sensor` between calls.
- Caching recognition per (viewer, target) per resolve stays **low
  value**: each candidate is visited once per resolve.

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

## The measurements (2026-11-17 and -18)

The world profile is the instrument (`scripts/profile-layer.ts` over a
`WIRE_CPU_PROF` profile of `call-security-performance.wire.test.ts`
on the quiet box). In a thirty-body crowd the layer was 54.8% of busy
(40.6 s) before the second pass and 45.2% (20.3 s) after, over the same
acts; `say` p95 75 → 53 ms, freeze samples over 100 ms 33/195 → 3/162.
The committed baseline beside the wire file is master's code at
`e0af07435`; a later build re-records it with `CSP_RECORD=1`.
