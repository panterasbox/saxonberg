# Call security performance — the investigation, and what it found

*2026-08-30, from the libations live drive (MR !206). The founder's
framing: "it's probably not just one thing, it's probably a few
optimizations working together." That turned out to be exactly right —
five changes, each worth between 1.3x and 10x, and none of them the
thing the first profile pointed at.*

**Result: a proxied method call went 50 µs → 2.1 µs. 2000x a raw call →
424x. And flat in stack depth, where it used to double.**

---

## 1. The instrument

`packages/server/scripts/bench-gate.ts` (+ `bench-gate-preload.js`).

```
env -u NODE_OPTIONS -u VSCODE_INSPECTOR_OPTIONS \
  pnpm tsx scripts/bench-gate-preload.js          # the table
  … scripts/bench-gate-preload.js --hot           # production path only, for profiling
```

Four things about it are load-bearing, each learned by getting it wrong
first:

1. **The preload is not optional.** It registers the call-security
   loader hook before any game import. Without it no class carries a
   module stamp and every `FromModule` gate denies.
2. **The editor's auto-attach debugger must be off.** `NODE_OPTIONS`
   carries VS Code's bootloader, and an attached inspector makes stack
   capture ~1.6x dearer — which was the thing being measured. Every
   profile taken during the live drive was under it.
3. **It refuses a busy machine.** The policy cache measured 8.7 µs
   against a 4.5 µs baseline — a 2x *regression* from an optimisation —
   because a vitest run had the other seven cores.
4. **It sweeps stack depth.** A benchmark run from an empty stack
   measures a call the engine never makes.

Layers are attributed by **subtraction** over **interleaved medians**: a
single pass drifts 40%, which is enough to invent a win.

---

## 2. ⭐ What was actually wrong

### 2.1 The caller proof was taken per call, not per call site

`ExecutionContextApi.run` walked the stack (`new Error()` + CallSite
capture) on every call to prove its caller was framework code. **88% of
the gate.**

The fact it was deriving cannot change between calls: `security.ts` is
in the allowlist and cannot stop being. So the proof is now taken once,
per call site — `claimFramePush()` runs the same stack proof and hands
back the push capability, which the two hot holders claim lazily and
keep. An unallowlisted file gets the same `SecurityError` from the claim
that it would have got from `run`. The three public frame mutators
(`tagCurrentFrame`, `tagActingAuthor`, `establishCircleScope`) keep the
per-call walk: they are rare, and they are what a forge would target.

**Verified before believing it:** every production caller of
`run`/`runRoot`/`tagCurrentFrame`/`tagActingAuthor`/`establishCircleScope`
is a framework file already named in `_frameMutatorAllowlist`. Zero
content callers. (The two hits in `lib/npc/DialogueConversation.ts` are
prose in comments.)

### 2.2 ⭐⭐ The proof was being paid THREE times per dispatch

The finding that changed the shape of the answer, and the first profile
had hidden it. The gate's first act is `ShadowApi._consumeBypass()` and
its last is `_shadowsFor()`. Both are statics on a decorated Api class,
so each resolved a policy, read the current target and pushed a frame —
**before the gate could decide anything about the call it was there to
gate.** The security layer was paying its own toll to ask itself a
question.

Neither buys anything: both are `@internal` helpers under the Public
fallback, and nothing reads a `ShadowApi._shadowsFor` frame. ShadowApi
now hands the two over unwrapped, captured in the one window where they
are still the functions and not the wrappers — between the class body
and its own `decorateApiClass`. `_withDispatch` / `_invokeOnShadow` stay
gated: they fire only when a shadow is attached, and they are the ones a
frame is worth having.

### 2.3 Five closures per dispatch, and the runtime named each one

Once the walk was gone, the profile showed **27% in esbuild's `__name`
and its native property setter.** The gate read as `const deny = …;
const proceed = …; run(…, () => next())` — three function allocations on
every method call in the engine, and under the `tsx` runtime the server
actually runs on, an `Object.defineProperty(fn, 'name')` apiece.

`deny` and `proceed` are static methods now, taking what they had closed
over. `next` goes to the frame push directly: it is already the zero-arg
thunk the push wants, so `() => next()` was allocating a function to
call a function it had been handed. And the proxy pipeline built a
`next` chain link per call for a chain no shipped configuration has —
production registers exactly ONE interceptor, so it hands `raw` straight
over. **Five allocations → one.**

### 2.4 A pure function of (class, method), recomputed per call

`resolveCallPolicy` walked the prototype chain twice — per-method
policies, then class defaults — and a shipped class is a dozen mixins
deep. Now cached weakly on the constructor and stamped with a generation
every policy writer bumps, so a `@CallSecurity` registered after a class
has dispatched invalidates rather than lingering as a stale allow.

### 2.5 The frame push copied the whole stack

`const next = [...parent, frame]` — O(depth), on the hottest path in the
engine, and play does not run at depth 0:

| depth | before | after |
|---|---|---|
| 0 | 3960 ns | 3572 ns |
| 25 | 4466 ns | 3809 ns |
| 100 | 4880 ns | 3445 ns |
| 200 | **8200 ns** | **3788 ns** |

The store is now the innermost `FrameNode` with the rest hanging off
`parent`. Every reader was one of four shapes: top is `node.frame`; the
reverse walks follow `parent`; frame-0 is `node.root`, carried on every
node because the sandbox boundary reads root metadata on every dispatch
and that read must stay O(1); and the three readers that want the whole
stack (`getCallStack`, `getCommandStack`, `dumpCallStack`, none hot)
materialise an array.

---

## 3. The arc, measured

| state | ns/call | vs raw |
|---|---|---|
| as the live drive ran it (debugger attached) | 75 000 | 10 000x |
| baseline, no debugger | 50 700 | 2 000x |
| + proof per call site (§2.1) | 7 300 | 1 400x |
| + closures hoisted (§2.3) | 4 500 | 870x |
| + policy cached (§2.4) | 3 500 | 680x |
| + linked-list frames (§2.5) | 3 150 | 470x |
| + gate stops gating itself (§2.2) | **2 140** | **424x** |

---

## 4. ⚠ The finding this investigation did NOT expect

**Boot is not CPU-bound, and the gate was never its problem.**

A fresh boot still takes **5.7 minutes**, and a CPU profile of one is
**76% idle**. Timestamped:

```
 152.6s  ResidencyApi boot spawn sweep — 341 placed
  73.5s  (CompileWatcher / tsc — after listen)
  62.8s  BootstrapManager — 62 entries
  30.8s  PackApi 'platform' install
  19.1s  MaterialApi.boot — 84 singletons
```

Measured Atlas round trip from this box: **33 ms** (`ping` and
`findOne` alike). 152.6 s / 341 objects = **448 ms per clone ≈ 13.5
serialized round trips each**.

`StuffApi.clone` → `Template.findByPath` → `PersistApi.find` reads the
row **from Mongo every time**, with no cache, and the hydration cascade
recurses through `clone` for `hydratorClass` and `populates:` — so one
shipped item is a dozen sequential 33 ms trips.

**Live, after the pass** (fresh boot, `AUTH_MODE=test`, one character in
the lounge over the real WebSocket):

```
auth/status      2 ms      play <id>   628 ms
look           220 ms      inventory   260 ms      who   290 ms
```

Everything works and nothing is denied — but a warm `look` at 220 ms is
about **7 x the 33 ms round trip**, which is the same shape as §4 rather
than a gate cost: at 2.1 µs a dispatch, 220 ms would be a hundred
thousand proxied calls. ⚠ Stated as a *hypothesis with a matching
order of magnitude*, not a measurement — nobody has counted the queries
a `look` makes. Counting them is the first step of the boot work, and it
would answer both.

**This is a template-read-cache design conversation, not a tweak** —
the invalidation points (CMS save, pack install, go-live,
`restoreFromTemplate`, hot reload) all exist and are chokepoints, but
naming them all is the work. Not built here; filed. It is the actual
answer to "fresh boot 5–13 min", which the call-security pass does not
touch.

---

## 5. The rule this produces

> **A loop over N objects that makes a gated call per object costs N
> gate dispatches — and one used to cost 50 µs.**

Five instances found by driving in one day. Three of the five were
written *while fixing the other two*, which is the argument that this
needed an engine answer rather than discipline:

| site | the per-item gated call | measured |
|---|---|---|
| `GetController` | `canReach` per candidate | 96.5% of the server |
| `ResidencyLogic.isInPresentRoom` | proxied `getContainer()` per hop, every object in the world | 5/5 pauses |
| `GetController` (mine) | `isFixed` per candidate | 36% |
| `CommandLogic` delta (mine) | `ancestorsOf(m)` per moved item | 21% |
| `LoadBearing → getConditionBand` | a metabolic integration per `get` | 28% |

Established mitigation, used twice: **walk RAW** (`ProxyApi.unwrap`)
when the read is plain state and no shadow could legitimately disagree —
and then the site carries the guards the proxy would have applied
(`isDestroyed()` break, a `seen` set).

---

## 6. What was NOT traded away

- **Tamper resistance.** The stack proof still gates the *claim*; what
  changed is how often it is taken, not whether.
- **Viewer-relative naming.** `RecognitionApi.describe` in the scope
  walk is why `look bob` works iff the room view says "Bob". Its 22% is
  a feature's cost, not waste.
- **The destroyed-object inert guard**, which keeps benign races from
  cascading with zero per-call-site instrumentation.

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
- **§4, the boot round trips.** The big one, and not this subsystem.

---

## 8. The overnight drive (2026-08-31) — what the fixed gate made reachable

The performance work was never the point; it was what made the world
drivable. With a dispatch at 2.1 µs and the economy funded, the whole
libations acceptance surface came within reach in one session.

**Checklist items verified live, on a world dropped and rebuilt from
nothing:** 1 (fresh boot), 2 (the back loop — Mara restocking with no
player: `cogs -309, wages -68, subsidy 20000`), 3 (the keeper loop, no
wizard), 4 (the tablet in a stranger's hands: the sheet shows, the wallet
refuses), 5 (**a drink**), 6 (the glass pool), 8 (packs + lints).

⭐ **The drink, end to end, scripted from an empty world:** a player
hired by Dave through his dialogue tree, `wallet use house`, eleven
purchases at the cash-and-carry stamped to the bar, carried back,
shelved, ice poured into the bin — then:

```
order gin & tonic  -> a highball glass is set down in front of you.
look highball      -> "A tall straight-sided glass. It is on the rocks,
                      fizzing, with a lime. It looks fair: honestly made,
                      if unremarkable. Made by Remy. It holds a gin and
                      tonic, fizzing over ice.  In it: a lime."
feel highball      -> "A highball glass feels cool."
```

Garnish, carbonation, ice, grade, crafted provenance, temperature — the
plan's own acceptance line ("a G&T colder than the rail — `feel`") in
one read.

### The bugs the drive found, in the order they mattered

1. **Nothing funded the world.** Money supply 0; every venue drifting
   negative on wages; `buy` refused. → `banking.openingCapital`.
2. **The supply aggregate raced itself** — nine businesses opening at
   once wrote six `bank_supply` rows. Exposed, not caused, by (1).
3. **A disambiguated pick anchored focus on the WORD**, so every later
   command re-asked and the session went silent. → `#<stuffId>`.
4. **`feel` and `taste` had never run.** Both verbs, both validators,
   both modality singletons ship — and no body plan granted touch or
   taste. A verb gated on a capability nothing confers fails closed and
   quietly forever.
5. **Six keyword collisions in one room**, and the substring rule
   underneath them (`kw.includes(query)` — a keyword claims every word
   inside it).

### ⚠ Still open

- Item 7: **the card arm is verified** — the clean two-socket test I
  should have run first. The keeper drives the tablet RESTING in the
  room; both sockets receive `card-opened stock/"house stock"`, and the
  bystander gets only the card, never the keeper's prose. *The display
  you can see shows X.*
  ⚠ My earlier "the bystander never got it" was two mistakes at once: a
  dead WebSocket, and a tablet in someone's POCKET (which correctly
  shows nobody — `sees()` needs to perceive the screen). The video arm
  stays undrivable: no row ships one, by ruling.
- Dilution over a game-hour, the mojito's `muddled` marker, and the
  bitters 1 mL debit: not yet driven.
- `put ice in bin` answers "an ice bin isn't a place". Correct — the bin
  is Bulkable and the verb is `pour ice into bin`, which is what the
  restocks brain does — but the message helps nobody, and the plan's own
  checklist says `put … in bin`.

## Cross-references

[call-security.md](../../subsystems/call-security.md) ·
[templates.md](../../subsystems/templates.md) ·
[residency.md](../../subsystems/residency.md) ·
[persistence.md](../../subsystems/persistence.md) ·
[antipatterns.md](../../antipatterns.md) ·
[testing.md](../../testing.md) ·
*(supersedes the retired `gate-cost-slate` — its surface is salvaged above)*
