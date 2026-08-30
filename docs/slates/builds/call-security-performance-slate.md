# Call security performance — the investigation brief

*Working document, 2026-08-30, from the libations live drive (MR !206).
Written to disk deliberately, before a context compact, so the
measurements and the code reading survive. **Nothing here is
implemented.** The founder's framing: "it's probably not just one thing,
it's probably a few optimizations working together."*

---

## 1. What is measured, and how

Every CPU profile taken during a day of live driving bottoms out in the
same place:

```
57%   #walkExternalFrames        api/module.ts        ← self time
29%   (anon) :0                                       ← V8 CallSite materialisation
 3.5% (garbage collector)
```

Inclusive-time, same server, after five separate fixes had already
landed:

```
50.9%  executeCommand            lib/command/CommandGiver.ts
47.9%  resolveMany               api/mql/resolver.ts
47.5%  candidatesForPeers        api/mql/scope-walk.ts
47.2%    └─ pushDirect
22.0%       └─ RecognitionApi.describe
19.1%  wouldExceedCeiling        lib/encumbrance/LoadBearing.ts
```

**Method note that cost real time.** A sampling profile names what *was*
running; `Debugger.pause` names what *is*. They disagreed twice and the
pause was right both times. ⚠ But a pause script that exits racing its
own `Debugger.resume` leaves the process paused — listening, never
accepting — and that looks exactly like a product hang. Always
`setSkipAllPauses` + `resume` before exit. Scripts used:
`scratchpad/prof.mjs` (self time), `tree2.mjs` (inclusive, framework
frames filtered), `stack.mjs` (pause + full stack), `resume.mjs`,
`peek.mjs` (Mongo).

---

## 2. The call path, read end to end

Line references are to this branch.

**`api/proxy.ts` — the get trap (`~163`)**
- `RAW_TARGET` and `PASSTHROUGH_KEYS` short-circuit first.
- `findDescriptor` walks the prototype chain **on every property access**
  to spot getters before `Reflect.get` would fire them.
- Method values are wrapped and the wrapper is **cached per function**
  (`wrapperCache`), so wrapper creation is not the cost.
- Every wrapped call → `#runPipeline` → the interceptor chain.

**`api/security.ts` — `#securityGate` (`1030`)**, the sole interceptor:
1. bypass marker (`_consumeBypass`)
2. destroyed-object inert guard — `ctx.target.isDestroyed()`
3. sandbox boundary — `getCircleScope()` + `_boundaryContext()`; fast
   path is two loads and a compare
4. `resolveCallPolicy(target, prop)` then `policy.allows(...)`
5. `proceed()` → `touch()` → `_shadowsFor(proxy, prop)` →
   **`ExecutionContextApi.run(caller, proxy, prop, undefined, next)`**

**`api/execution-context.ts` — `run` (`721`)**
```ts
public static run<T>(…) {
  _assertFrameMutatorAllowed('run');        // ← line 728
  …
  const parent = _als.getStore() ?? [];
  const next = [...parent, frame];          // ← O(depth) copy per push
  return _als.run(next, fn);
}
```

**`_assertFrameMutatorAllowed` (`217`)**
```ts
const url = ModuleApi.getImmediateCallerUrl(_SELF_URL);   // ← the capture
const cached = _allowlistCache.get(url);                  // ← cache is HERE
```

**`api/module.ts` — `getImmediateCallerUrl` (`291`) → `#walkExternalFrames`**
- sets `Error.stackTraceLimit = 8`, constructs `new Error()`, reads
  `.stack` with a raw `prepareStackTrace` so CallSites come back
  unrendered (fixed earlier today — it used to render text and
  source-map-remap every frame under `tsx`).

---

## 3. ⭐ The three findings that matter

### 3.1 The allowlist cache sits downstream of the expensive part

`_allowlistCache` is keyed by **URL** — and computing the URL *is* the
stack walk. So the cache saves a handful of regex tests and nothing
else. **Every successful gated dispatch in the engine walks the stack.**

### 3.2 `run`'s caller is always the framework

`_assertFrameMutatorAllowed` exists to stop content code forging call
frames. But the hot caller — `#securityGate.proceed()` — is the security
layer itself, and it already knows it is trusted. The stack walk is
being paid to re-derive a fact the call site holds statically.

Candidate: a private capability (module-private symbol, or a
`#runTrusted` entry point reachable only from `security.ts`) that skips
the assertion. The three *public* frame mutators (`tagCurrentFrame`,
`tagActingAuthor`, `establishCircleScope`) keep the walk — they are rare
and they are the ones a forge would actually target.

⚠ Must be checked before believing: is `run` ever called from content?
`_frameMutatorAllowlist` names `mud/lib/security/**`, `mud/api/**`,
`backend/**`, `lib/command/CommandGiver`, `*.test.ts` — so today's
answer looks like "framework only", which is exactly what makes the
per-call proof redundant.

### 3.3 Frame push copies the whole stack

`const next = [...parent, frame]` allocates an array of depth N per
gated call. Observed stacks in this world run **~200 frames deep**, and
GC was 3.5% of samples. A linked-list frame (`{ frame, parent }`) with
lazy materialisation for the rare readers would make the push O(1).

---

## 4. Other candidates, cheapest first

| # | idea | evidence | risk |
|---|---|---|---|
| a | Skip the walk for trusted `run` (§3.2) | 57% self time is the walk | needs the "is it framework-only" proof |
| b | O(1) frame push (§3.3) | ~200-deep stacks, GC 3.5% | frame readers must handle the new shape |
| c | Hoist viewer-invariant checks out of `describeCore` | `isSensor(viewer)`/`isPerception(viewer)` re-asked for all ~35 candidates in one scope walk | none obvious |
| d | `pushDirect` calls `describe` **and** `perceivedKeywords`; for an ORGANISM the latter calls `describeCore` a second time | `RecognitionLogic:390` | none obvious |
| e | Memoise recognition per (viewer, target) per command resolve | each candidate visited once per resolve, so gain is small | low value |
| f | `findDescriptor` prototype walk per property access | every access, not just methods | correctness-sensitive |
| g | Cache `resolveCallPolicy(target, prop)` by (ctor, prop) | policy is static per class+method | shadows/HMR invalidation |

---

## 5. The rule this all produces

> **A loop over N objects that makes a gated call per object costs N
> stack captures.**

Five instances found by driving in one day. Three of the five I wrote
*myself*, while fixing the other two — which is the argument that this
needs an engine answer, not discipline:

| site | the per-item gated call | measured |
|---|---|---|
| `GetController` | `canReach` per candidate | 96.5% of the server |
| `ResidencyLogic.isInPresentRoom` | proxied `getContainer()` per hop, every object in the world | 5/5 pauses |
| `GetController` (mine) | `isFixed` per candidate | 36% |
| `CommandLogic` delta (mine) | `ancestorsOf(m)` per moved item | 21% |
| `LoadBearing → getConditionBand` | a metabolic integration per `get` | 28% |

Established mitigation, already used twice: **walk RAW**
(`ProxyApi.unwrap`) when the read is plain state and no shadow could
legitimately disagree — and then the site carries the guards the proxy
would have applied (`isDestroyed()` break, a `seen` set).

---

## 6. What must NOT be traded away

- **Tamper resistance is the gate's whole value.** `stamp()` reads the
  stack precisely so a file cannot lie about its own URL.
- **Viewer-relative naming is load-bearing**: *what you can name, see and
  touch can never diverge*. `RecognitionApi.describe` in the scope walk
  is why `look bob` works iff the room view says "Bob". The 22% is a
  feature's cost, not waste.
- **The destroyed-object inert guard** keeps benign races from
  cascading, with zero per-call-site instrumentation.

---

## 7. Where MR !206 stands

106 commits, all pushed, clean tree. `pnpm vitest run src/mud/lib
src/mud/api` → **6111 passed**. All 16 CI lints green at last check.

Live-verified in a browser: the 26-drink menu, `wash` end to end, the
verb split (all seven afforded), reach into open containers, the prose
departures board, single-period emotes, fixtures that cannot be
pocketed, fresh login 2.5 s.

Supply chain, decline taxonomy per boot: `unknown-verb(wallet)` 30 → 0,
`no-account` 8-trades-every-beat → 0, `nothing-picked-up` 17 → 0,
`empty-result` 20 → 3. Ten house cards dealt; `over-cap(24)` is the
anti-grief cap working.

**Not yet verified in-world:** actually ordering a drink. The greedy-arg
fix is merged and `order <cocktail…> with <brand>` now binds, but every
attempt queued behind NPC load — i.e. behind §1.

**Still open, unrelated to perf:** `not-held` in the consigns beat (the
beat consigns by keyword and something does not resolve); one
`mql-error[targets]`; `/finalize` has not run (one full-suite pass, the
`HouseStockCard` flake, retiring the plan + requirements docs).

## Cross-references

[call-security.md](../../subsystems/call-security.md) ·
[mql.md](../../subsystems/mql.md) ·
[belief.md](../../subsystems/belief.md) ·
[residency.md](../../subsystems/residency.md) ·
[antipatterns.md](../../antipatterns.md) ·
[gate-cost-slate.md](./gate-cost-slate.md) (the short version)
