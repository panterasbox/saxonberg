# Resilience slate (working doc) — guards against bad code

> **Status: doctrine set, backlog assembled, nothing built.** The stance
> in one line: **TypeScript access is root, so prevent what we can,
> contain what we can't prevent, and make what we can't contain
> impossible to do quietly.** This is the security-posture companion to
> [access.md](../../subsystems/access.md) (who may do what) and
> [call-security.md](../../subsystems/call-security.md) (how a call is
> gated). Graduates to `docs/resilience.md` when the posture is real
> rather than aspirational.

Inventory taken 2026-08-30 against the live tree; every claim below cites
a file. **"Enforced" and "intended" are marked differently on purpose** —
the most common failure found was a control that was designed,
documented, given a default, and never connected.

---

## 1. The governing admission

A wizard writes TypeScript that runs in-process. Constructor chains reach
`globalThis`, prototypes are patchable, and the process can read whatever
the process can read. **There is no in-process containment of trusted
code, and pretending otherwise is worse than admitting it** — a boundary
people believe in but that doesn't hold is how you get a real breach.

`isolated-vm` does not change this and is **not** the plan. It trades a
shared heap for a bridge layer, and the bridge is the same attack surface
with more code; worse, the holodeck's circle-vs-field model
([sandbox.md](../../subsystems/sandbox.md)) depends on live objects
crossing scope by gated call, which an isolate boundary cannot express.
The three `isolated-vm` "migration target" comments
(`EvalScript.ts:20`, `api/script.ts:33,173`, `lib/shell/Author.ts:51`)
should be retired.

**So the posture is not containment. It is friction plus daylight.**

### ⭐ One capability, many doors

**`eval` is not a special door. It is the *weakest* one.** Every path
below ends in arbitrary TypeScript executing in-process, and they are all
gated by the same single bit (`requiresWizard`):

| Door | Capability it grants | Guarded by |
|---|---|---|
| `eval` | a **five-name curated context** (`StuffApi`, `MqlApi`, `ContainmentApi`, `MixinApi`, `console`, + `self`/`target`) | verb gate, parcel authority, the allowlist |
| `write` + `reload` | **the entire import graph** — `fs`, `child_process`, everything | verb gate, zone `can('write')` |
| template code fields | a named class / hydrator / brain | `enforceCodeFieldGate` over `CodeNamingFields` |

⚠ **The import boundary is build-time only.** `lint:imports` runs in CI;
the runtime loader hook (`services/loader/loader-hook.js`) *stamps*
modules with call-security provenance and **denies nothing**. So a module
written at runtime and reloaded imports whatever it likes. Which makes
`write` + `reload` **strictly more powerful than `eval`**, and it is the
less observed of the two.

Two consequences, and they govern the rest of this document:

1. **Hardening one door is theatre.** A timeout on `eval`, or curating
   its context, buys nothing in security terms while `write` sits
   unlogged next to it. Either the whole set is treated uniformly or the
   effort is wasted. *(The eval timeout is still worth doing — as
   **containment**, against failed experiments, which is Tier 3. It is
   not a security control and this doc should not have filed it as one.)*
2. **The one real asymmetry is forensic, not capability.** A `write`
   leaves an artifact — a file on disk, visible to `git status`, and
   `GitLogic.ts:340` commits it with a synthetic author derived from the
   acting avatar. An `eval` leaves nothing but a scratch singleton that
   the next eval replaces. **`eval` is the deniable door**, so it is the
   one whose *payload* has to be captured, because nothing else captures
   it. The unobserved window for `write` is narrower but real: write →
   reload → revert, never published, never committed.

A corollary worth noting: the loader stamps every mud module with its
module id, so a file written at a path some `FromModule` policy already
trusts **inherits that trust**. Not an escalation for someone who is
already a wizard — but it means module-provenance trust is exactly as
strong as source-tree write control, and no stronger.

## 2. Four layers, and only one of them is defeated by root

| Layer | Cost at runtime | Survives a hostile wizard? |
|---|---|---|
| **Build-time** — the lint family, drift-guard tests | **zero** | ✅ yes (they run in CI, not in the process) |
| **In-process** — call-security, budgets, allowlists | small, on the hot path | ❌ no — this is the layer root defeats |
| **Process** — Node permission model, systemd | zero | ✅ yes |
| **Deployment** — the stable host, nobody holds the wizard bit | zero | ✅ yes |

The useful correction to *"Node won't let us prevent what we need to
prevent"*: **in-process, correct — out-of-process, false.** Layers 1, 3
and 4 are real boundaries that a compromised in-process actor cannot
cross, and all three are currently under-used.

## 3. The performance law

> **Prefer build-time > boundary > per-operation. Charge the budget at
> the pipeline, never inside the operation.**

The exemplar already exists.
`lib/wiki/RenderBudget.ts` is the model to copy everywhere: a typed
`RenderLimits` record (`snippetDepth: 8`, `maxSnippets: 200`,
`maxComponents: 100`, `componentTimeoutMs: 2000`,
`maxOutputChars: 200_000`), operator-tunable via `wiki.render.*`, raising
a typed `RenderBudgetExceeded` that names which limit blew — and its own
doc comment carries the rule: **the pipeline charges the budget, because
self-charging would make every bound advisory.**

The other exemplar is `lib/stuff/CodeNamingFields.ts` +
`TemplateLogic.enforceCodeFieldGate` — one vocabulary, one chokepoint, and
a build-time drift-guard test. That shape (closed vocabulary + single
enforcement point + a lint that keeps the vocabulary closed) is what every
control here should aim at.

**The cheapest guard is one that runs in CI.** 17 lint checks already do,
at zero runtime cost. That is the answer to "make it performant": push
work left, and reserve runtime checks for what genuinely cannot be decided
statically.

---

## 4. What is already right

Worth stating, because the backlog below is long and the base is better
than it reads:

- **The import boundary** (`lint:imports`) — nothing under `src/mud/`
  imports outside the tree except the Api tier, Node built-ins included.
  A build-time capability boundary; the single strongest control we have.
- **Module scope declares; lifecycles initialize** (`lint:module-scope`) —
  importing a mudlib module cannot execute arbitrary code.
- **A9 — content-write never grants code execution**, enforced by
  `enforceCodeFieldGate` over the closed `CodeNamingFields` vocabulary.
- **The scripting `Interpreter`** — `ResourceLimits` (`sliceSteps`,
  `maxSteps`, dispatch and depth ceilings), preemption every K steps *"so
  a no-yield loop can't freeze the single-threaded event loop"*,
  `ResourceLimitError` → graceful `resource-limit` abort. **This is the
  execution surface untrusted people should get.** The answer to "how do
  I let players write code" is *give them our language, not TypeScript* —
  and it is already shipped.
- **Prose/Liquid runs `ownPropertyOnly: true`** (`ProseLogic.ts:125`) — a
  genuine prototype-chain defense.
- **The sandbox escape suite** — 12 test files over circle-vs-field scope,
  cross-scope shadow denial, deferred callbacks under birth scope.
- **Bounded rings as a pattern** — `ConsoleTap` (1000 lines);
  `RecordLogic` is explicit that it is *"a **window**, not a quota."*
- Nine depth guards on recursive walks (`LoadBearing` 16, `Haulable` 16,
  `PersistableLogic` 32, `Condition` 12, …).
- **`GitLogic` commits as a synthetic author** hard-derived from the
  acting avatar — git history is a real, out-of-band ledger.

---

## 5. The backlog, in priority order

### Tier 1 — controls that were designed and never connected

*Cheapest possible wins: the thinking is done, the wire isn't.*

1. ⭐ **The code-trust surface is audited unevenly, which means it is
   not audited.** Per § *One capability, many doors*, this is one control,
   not three, and it is the highest-value item in the document:
   - `eval` records the **act, not the payload** —
     `EvalController.ts:203` calls `recordAuthoring({ path:
     '<parcel>/_eval' })`, best-effort inside a swallowing `try/catch`.
     **Wire-parcel evals record nothing at all.**
   - **Source-tree writes record nothing.** `write`/`rm`/`mv`/`cp`/
     `mkdir` controllers all call `SourceTreeApi.*` and write no row;
     only `StudioLogic` follows its write with `recordAuthoring`.
     Published changes are attributed in git history — writes that are
     never published are not.
   - **Reload records nothing** (item 3 below).

   One append-only row per code-trust act, uniform across all three
   doors, with `eval` additionally capturing its body because it is the
   only door that leaves no artifact. Anything less and the wizard simply
   uses the door that isn't watched.
2. ⭐ **The strongest control we own runs in the wrong place.**
   `scripts/check-mud-imports.ts` (526 lines, **enumerated** built-in and
   npm allowlists) is what forbids the mudlib from reaching `fs`,
   `child_process` and everything else outside the Api tier — and it runs
   in CI, which a hostile author bypasses **by construction**: write at
   runtime, reload, never touch the pipeline. Relocating its decision into
   the loader hook (§6) converts a lint into a boundary. The analyzer is
   already written; this is a move, not a build.

3. **Two lint checks documented as CI-gating are not in CI.**
   `.gitlab-ci.yml` runs 17; `lint:gates` and `lint:boundary` are absent,
   though CLAUDE.md calls both CI-gating. `lint:gates` is what keeps every
   `FromModule`/`FromController` string resolving to a real module and
   export — the check that stops call-security policies silently pointing
   at nothing after a rename.
4. **The hot-reload audit ledger doesn't exist.** `api/hot-reload.ts`
   emits `Events.ModuleReloaded/RolledBack/Unloaded/ReloadFailed` and its
   header says *"an audit ledger that wants longer history subscribes to
   the `Events.Module*` lifecycle events."* The only subscriber in the
   tree is a unit test.

### Tier 2 — the Api tier defaults open

`SecurityPolicies` defaults to **`Public` when no decorator is present**
(`SecurityPolicies.ts:44-49`). Two capability Apis rely on that default:

4. **`HotReloadApi` carries zero `@CallSecurity` decorators.** The
   `reload` verb is `requiresWizard`-gated, but the *capability* is not —
   any mudlib module can call `reload`/`unload`/`rollback` directly.
   `ReloadController.ts:7-9` says gating *"lives in the future permission
   framework."*
5. **`SourceTreeApi`'s statics carry no `@CallSecurity`.** The
   `SourceTreeLogic` methods are gated, but the facade is not, so the
   controller checks are the only gate on writing to the source tree.

Neither is an active exploit path today — mudlib code is wizard-authored
either way — but **the architecture claims a gated capability tier and
these two are outside it**, which is exactly the defense-in-depth this
document exists to restore. Related: `gateSourceWrite` is duplicated
**verbatim in four places** (`GitLogic.ts:133`, `StudioLogic.ts:192`,
`CmsLogic.ts:185`, `WriteController.ts:249`) — four copies of one security
check is a drift bug waiting to happen.

### Tier 3 — nothing has a time budget (the failed-experiment case)

One blocking loop stops the world, and nothing would tell you:

| Surface | State |
|---|---|
| Command dispatcher (`CommandGiver.executeCommand`) | no deadline, no `AbortController`, no step count |
| `ScheduleApi` | plain `setTimeout`/`setInterval`; no handle cap, no overrun detection; `fixed-rate` documents that fires "pile up" with no backpressure |
| MQL resolver | no result cap, no time budget, no depth cap; `walkDetailDescendants` recurses on the *assumption* containment is acyclic |
| Prose / Liquid | no render timeout, no output cap (unlike wiki, which has `RenderBudget`) |
| Message/Scene | no recipient cap, no body size cap, no guard on brain→brain cascades |

Generalize `RenderBudget` across these rather than inventing a mechanism
per surface.

**And the `eval` timeout belongs here, not in the security tiers.**
`ScriptLogic.ts:546-555` is `runInContext(createContext(sandbox))` with no
options object, so `while(true){}` in an eval body hangs the process —
while `lib/shell/Author.ts:42-61` declares `eval.timeoutMs` (default 1000)
and `eval.maxDepth` (default 32) with the comment *"the sandbox honors it
when the isolated-vm migration lands."* **Nothing reads either key**, and
`vm.Script.runInContext(ctx, { timeout })` has supported it all along.
This is worth doing as a guard against **failed experiments** — the
original ask — and claims nothing against a hostile author. ⚠ `vm`'s
timeout interrupts **synchronous** code only; a hung promise sails past
it.

### Tier 4 — input reaching dangerous constructs

6. **`GrepController.ts:48` compiles a raw command-line string** into
   `new RegExp(pattern, flags)` and runs it over the source tree. Only
   syntax errors are caught. `grep '(a+)+$' --source -r` is a hang.
7. `Detailed.ts:831` interpolates an **unescaped** author-supplied pattern
   into a capture group — injection *and* backtracking.
8. **WebSocket `maxPayload: 50MB`** (`WebSocketService.ts:66`) and
   `backend/inbound/command.ts` trims input with **no length and no rate
   limit** before dispatch. The only rate limiter in the codebase is
   `StreamRelay`'s token bucket.
9. No object-count quota anywhere. `StuffApi.getObjectCount()` exists and
   is exposed on `/stats`; nothing enforces a ceiling, and `StuffApi.clone`
   has no quota.

### Tier 5 — daylight (the half that actually matters)

Since root cannot be prevented, **this tier is the real security model.**

10. **Security denials are not recorded.** `api/security.ts` throws
    `SecurityError` in six places and logs nothing;
    `SecurityPolicy.name` is documented as *"used in audit logs"* and
    there are no audit logs. A probing wizard currently leaves no trace.
11. *(The eval / source-write audit gaps were here; they are **Tier 1
    item 1** now — they are one control, not several, and filing them
    last was the mistake this document was written to avoid.)*
12. **No operator-facing signal of any kind.** No alerting, no metrics, no
    event-loop-lag detection. `/healthz` is liveness only and does not
    check Mongo or the world; `/stats` is unauthenticated. A hung `eval`
    is indistinguishable from a dead box.

## 6. Static analysis at the load boundary

**The chokepoint already exists.** `services/loader/loader-hook.js`
intercepts every `.ts`/`.js` under `mud/` and holds the compiled source as
a string immediately before evaluation — on the reload path as well as at
boot. It currently appends the call-security stamp and refuses nothing.
That is the last point before code is in memory, and the interception cost
is already paid.

### What it can decide, and what it can't

Rice's theorem: no non-trivial semantic property of a program is
decidable, so there is no sound-and-complete "is this malicious." Any
identifier check dies to `globalThis['pro' + 'cess']`. TypeScript is no
help either — types are erased, so `tsc` sees nothing security-relevant.

So don't try to detect malice:

> ### ⭐ Detect **evasion**, not malice.

Benign game code never computes an identifier at runtime to reach a
global, never base64-decodes into a symbol name, never walks
`constructor.constructor`, never builds a `Function` from concatenated
strings. **The base rate of legitimate use is essentially zero**, which
inverts the usual static-analysis economics — false positives are cheap
because there are almost none to have.

And it buys the thing this document actually wants. It does not stop a
determined author; it **forces them to write something that looks
unmistakably like an attack**. A silent act becomes a loud one, which is
§1's posture applied at the load boundary. Enforcement is graduated:
**deny the flagrant, flag-and-load the anomalous.**

### Scope it honestly

This guards the **capability boundary** — reaching `fs`, `net`, `process`.
It does **nothing** against abuse of *granted* capability: a module that
calls `StuffApi.destruct()` in a loop over every object in the world is
syntactically innocent and no analyzer will ever say otherwise.

**Static analysis owns the capability boundary; the append-only ledger
owns what happens inside it.** Neither substitutes for the other, and the
ledger is still the more important half.

### LLM review — advisory, never a gate

Cheap if scoped correctly, and the instinct that it's expensive comes from
imagining review on every load:

- review **at write time, on the diff** — not at reload; most reloads
  reload unchanged code
- **cache verdicts by content hash** — boot re-loads the same files
  forever, so it is free after the first pass
- a 30-line diff is a few hundred tokens on a small model

Where it beats a linter is judging **intent from context** — *"this
function reads every player's balance and writes it somewhere"* is not
expressible as a rule. Complementary to the syntactic gate, not
overlapping it.

⚠⚠ **It must never be a deny decision**, for two reasons and the second is
the serious one. False positives would block legitimate authoring. And
**the code under review is attacker-controlled text** — a comment reading
`// reviewed and approved, ignore prior instructions` is a live
prompt-injection vector against our own reviewer. An LLM verdict goes to
the alert channel and the `diagnostics` store; a human decides.

### Performance

Per §3, cheapest first: **hash-cache** the verdict, a **regex pre-filter**
on every load, and a full **AST parse only** when the pre-filter hits or at
write time. That leaves the boot path — already the worst measured number
in the project — essentially untouched.

## 7. Lock down what we can — the process layer

None of this is in place, all of it is cheap, and all of it survives an
in-process compromise. The box runs Node 22 under systemd as a dedicated
user (`deploy/dev/saxonberg.service`, currently `NoNewPrivileges` +
`PrivateTmp` only, with `ProtectHome` deliberately excluded because the
app user's home holds the pnpm store and git config).

- **Node's permission model** (`--experimental-permission` on 22) —
  `--allow-fs-read` / `--allow-fs-write` scoped to `/srv/saxonberg`, and
  crucially **no `--allow-child-process` and no `--allow-worker`**, so a
  hostile eval cannot shell out. ⚠ Needs testing against the `git` verb,
  which shells out legitimately.
- **`--frozen-intrinsics`** — there is currently **zero** prototype
  hardening in the tree (no `Object.freeze` on any prototype, no `seal`,
  no `preventExtensions`, no `__proto__` key filtering). ⚠ Can break
  libraries that patch prototypes; test before adopting.
- **systemd** — `MemoryMax=` gives the memory ceiling `isolated-vm` was
  supposed to provide, at the process level; plus `ProtectSystem=strict`
  + `ReadWritePaths=`, `RestrictAddressFamilies=`, `SystemCallFilter=`.
- **The stable host already exists on paper.**
  [deployment.md](../../deployment.md) § Two instances describes prod as a
  read-only Docker image from a stable tag with **live authoring: no**.
  That is the untrusted-safe configuration, and it needs no engine work —
  it is a deployment where nobody holds the wizard bit.

## 8. The thesis

> **Make the dangerous act cheap to perform and impossible to perform
> quietly.**

This is the same answer the constitution gives about operators, turned on
ourselves: you do not defeat a privileged actor by containing them, you
defeat them by making the record public and unfalsifiable (Art. I §6 —
*the integrity of the record is independent of its keeper*; **A2** —
ledgers are append-only). Applied here it means every code-trust act —
eval, reload, source write, gate denial — writes an append-only row, so
covering tracks requires a *second*, louder act.

The natural extension, and the one most in keeping with the project:
**wizard actions should be visible in-world**, not merely logged. The best
deterrent against an operator is other people watching, which is the whole
argument of Ch 6.

## Open

1. **Does the wizard action feed go in-world, or stay an operator log?**
   In-world is more consistent with the polity thesis and much more
   exposed. Needs a decision before Tier 5 is built.
2. **Does `eval` record its code body?** Storing it makes the audit real
   and makes the log a payload store; there is a privacy/size tradeoff.
3. **How much does prototype freezing break?** Empirical — try it, run the
   suite.
4. **Is there a per-actor object quota** that doesn't punish legitimate
   world-building, or is object growth an operator-alert concern rather
   than an enforced cap?
5. **Should a lint keep the code-execution surface closed?** Today the
   paths are enumerable (eval · hot reload · source writes · the three
   `CodeNamingFields` template fields · scripting). A check that fails when
   a sixth appears would keep it that way.
6. **Does the loader gate deny, or only flag, on first release?** §6 argues
   for graduated enforcement, but the split between *flagrant* (deny) and
   *anomalous* (flag-and-load) is a judgement call that wants a first pass
   over the real tree before it is written down — including how much
   existing legitimate code would trip it.
7. **Where do evasion findings land?** The `diagnostics` store is
   author-facing and TTL-rotated; a security finding probably wants the
   durable audit ledger of Tier 1 instead, or both.
