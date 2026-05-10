# Runtime model

Reference doc for the platform constraints Saxonberg lives within
— how Node.js actually executes code, what timing primitives
mean, how the wire transmits state, what concurrency is possible
and what isn't, and what isolation does and doesn't buy us.

This is **not a slate** — there's nothing here being designed.
It's the substrate that informs other slates' decisions. The
activity slate consumes it explicitly; locomotion / embodiment
implicitly.

See also:

- [docs/slates/activity-slate.md](./slates/activity-slate.md) — explicit
  consumer; the activity framework's design pivots on the
  constraints captured here.
- [docs/architecture.md](./architecture.md) — static architecture
  of the codebase. This doc is the dynamic complement.
- [docs/subsystems/connection.md](./subsystems/connection.md) —
  the WebSocket upgrade flow this doc describes the wire side of.
- [docs/subsystems/call-security.md](./subsystems/call-security.md)
  — the proxy / interceptor framework that runs on the JS thread
  with the synchronous-block-as-transaction property described
  below.

---

## Old MUDs vs Node — the contrast

The old single-threaded MUD model is the reference point. A
single OS thread; a single command processor; commands resolve
fully before the next runs. A heartbeat tick of 1 second drives
ambient effects. Anything taking longer than the heartbeat blocks
everything; anything shorter completes within the tick budget.

The 1-second granularity wasn't fundamental — it was the simplest
scheduling abstraction available with the toolkit of the day.
Node breaks all the limits that justified it, but the *property*
old MUDs had — strictly serial command execution, predictable
ordering — needs to be re-earned in Node, not assumed.

---

## Node.js — what it actually is

Node is **single-threaded for JavaScript code, multi-threaded for
I/O**. That distinction is the whole story.

The JS engine (V8) runs your code on one thread — the main thread,
also called the event loop thread. While your code runs, no other
JS code runs. Period.

Around that single JS thread, **libuv** runs:

- A pool of worker threads (default 4) for things the OS can't do
  truly async — file system, DNS lookups, crypto, zlib.
- OS-level async I/O for network sockets, pipes — `epoll` on
  Linux, `kqueue` on macOS, IOCP on Windows. The OS notifies
  libuv when sockets are readable or writable; libuv translates
  that into a callback queued for the JS thread.

The JS thread is a **dispatcher** as well as an executor. It runs
your code, then checks for ready I/O, due timers, queued
callbacks, and runs those. Then loops.

### The event loop phases

Each loop iteration cycles through phases in fixed order:

1. **Timers** — `setTimeout` / `setInterval` callbacks whose
   time has come.
2. **Pending callbacks** — small set of system-level callbacks
   (some TCP errors).
3. **Idle / prepare** — internal libuv.
4. **Poll** — main I/O phase. Asks OS for ready descriptors,
   runs their callbacks. If nothing's ready and no work
   scheduled, blocks here waiting — that's why an idle Node
   server uses ~zero CPU.
5. **Check** — `setImmediate` callbacks.
6. **Close callbacks** — `'close'` events on sockets.

Between phases, two micro-task queues drain:

- **`process.nextTick` queue** — runs before any other queue,
  including microtasks. "ASAP, before anything else."
- **Promise microtask queue** — `await` continuations, `.then`
  callbacks.

### The mental model

Whenever JS yields (returns from a function, hits `await`,
completes a callback), the event loop has an opportunity to run
something else queued. **Until then, it can't.**

This is why a 50ms synchronous loop blocks every other player's
command for 50ms. The loop hasn't yielded; nothing else can run.

It's also why I/O is "free" — when you `await db.query()`, the
JS thread isn't waiting; it's running other stuff. The OS / libuv
runs the query; the result triggers a callback; the callback gets
queued; the JS thread picks it up next time it's in the poll
phase.

---

## Timing primitives

Five common ones, with real semantics:

| Primitive | Earliest fire | Common skew | Use |
|---|---|---|---|
| `process.nextTick(fn)` | Before next phase | <1µs | Defer to "after this stack unwinds" |
| Microtask (`Promise.then`) | After current sync work | <1µs | Awaited continuations |
| `setImmediate(fn)` | Next iteration's check phase | <1ms | "After I/O this iteration" |
| `setTimeout(fn, ms)` | At least `ms` later | 1–N ms | Scheduled future work |
| `setInterval(fn, ms)` | Every `ms` later (drifting) | 1–N ms | Periodic, with drift |

The two with `ms` arguments are the load-bearing ones for
scheduled work. Their semantics are **"no sooner than"**:

```ts
const t0 = Date.now();
setTimeout(() => {
  console.log(Date.now() - t0);
  // 100? maybe. 105? often. 250? possible if loop is busy.
}, 100);
```

`setTimeout(fn, 100)` means *at least* 100ms before `fn` runs.
The actual fire time depends on:

- How busy the event loop is when the timer expires.
- Whether other timers / I/O callbacks are queued ahead of it.
- Whether long synchronous code is mid-execution when the timer
  would have fired.

**Sub-50ms precision is achievable on an idle loop and
unachievable on a busy one.** Practical activity granularity is
comfortably 100ms+; targeting 10ms is asking for trouble. 1s and
above is fine and gives you slack.

`setInterval` drifts: if your callback takes 30ms and you set
100ms intervals, you get callbacks at 100, 230, 360, 490 — not
100, 200, 300. For steady cadence, use a `setTimeout`-loop with
explicit time accounting:

```ts
function tick() {
  const start = Date.now();
  doWork();
  const elapsed = Date.now() - start;
  setTimeout(tick, Math.max(0, 100 - elapsed));
}
```

The "self-correcting tick" pattern. Use this for periodic
emission updates and similar cadenced work.

### `Date.now()` vs `performance.now()`

- `Date.now()` — wall-clock milliseconds since epoch. Subject to
  system clock changes (NTP, manual resets). Right for *when did
  this happen* logging.
- `performance.now()` — monotonic milliseconds, sub-ms precision,
  never goes backwards. Right for *how long did this take* and
  for `progress = (now - start) / duration` calculations.

For activities: `startedAt: Date.now()` for serialization /
logging, `progress = (performance.now() - startMonotonic) /
duration` for runtime progress.

---

## The wire — what gets transmitted

Saxonberg uses WebSocket via the `ws` library on the server, plus
the existing express-session middleware reused for upgrade auth
(see `subsystems/connection.md`). The wire format is MML — the
markup language in `api/mml.ts` — sent as text frames.

### Full lifecycle of a command

```
[client]  user types "walk west"             t=0
          keystroke → React state → ws.send(frame)
          frame goes to OS socket buffer
[wire]    OS sends TCP segment(s)            ~1-50ms (LAN typical)
[server]  OS hands frame to ws library
          ws fires 'message' event
          JS event loop picks it up (next poll phase)
          CommandLineApi parses the line
          shell expands aliases
          dispatcher routes to controller
          controller runs validators
          executes (synchronously) or starts an Activity
          server.send(start-message) to client
          OS socket buffer
[wire]    OS sends TCP segment(s)            ~1-50ms back
[client]  ws.onmessage fires
          Zustand state updates
          React re-renders
          user sees the response                t=2-100ms typical
                                                t=200-400ms cross-continent
                                                t=600-800ms satellite
```

The user's perceived "instant response" is the first message
back, **regardless of activity duration.** They typed something;
they got an acknowledgment.

### Activity completion

```
[server]  scheduler fires onComplete
          actor moves rooms / slot occupants ripple
          scene composer generates messages for everyone affected
          server.send(arrival-message) to walking actor
          server.send(departure-message) to old room's onlookers
          server.send(arrival-message) to new room's onlookers
[wire]    parallel TCP sends per connection
[clients] each receives with its own latency
```

Multi-client reality: **everyone sees events with their own
network latency.** The actor walking sees arrival ~50ms after
server-canonical-time; another player in the room sees it ~80ms
after server-canonical-time; both happen in their own "now."

From either client's perspective, time is internally consistent
— TCP guarantees per-connection ordering. From a god's-eye view,
two clients are seeing slightly-out-of-sync simulations.

This isn't a bug; it's the universe. **The server is the
authority on canonical time and ordering;** clients render
whenever messages arrive. Design as-if-eventually-consistent
across clients.

### Network latency reality

| Scenario | Typical RTT |
|---|---|
| Localhost | <1ms |
| LAN | 1-2ms |
| Same continent | 30-80ms |
| Cross-continent | 100-200ms |
| Satellite | 600-800ms |

Network latency dominates "perceived responsiveness." If the
user has 80ms RTT, no amount of server-side optimization makes
the perceived response faster than 160ms. Get the start-message
out fast (acknowledge first, simulate second); after that,
gameplay timing is fine.

---

## Concurrency model

### Per-connection serial

A player's WebSocket connection delivers commands in order — TCP
guarantees this. The handler reads them one at a time and
dispatches. The natural shape:

```ts
ws.on('message', async (raw) => {
  const line = decode(raw);
  await executeCommand(interactive, line);
});
```

`executeCommand` is async. The handler awaits it before pulling
the next message. **Player A's command N completes before
command N+1 starts processing.** The old MUD's per-connection
ordering guarantee survives.

### Cross-connection interleaved

Player B's command can run between Player A's commands. A's
command N completes; a message from B's socket fires; B's handler
starts; A's N+1 fires when A types again. **Cross-player
ordering is event-loop-arrival order, not wall-clock order.**

That's fine; players never expected synchronization across each
other.

### `await` yields the loop

The wrinkle in "per-connection serial." When a command handler
hits `await`, control yields. Other things can run. When the
handler resumes, the world might have changed.

```ts
async function attackController(ctx) {
  const target = await mqlResolve('the goblin');     // ← yields
  if (target.isDead()) return 'It is already dead.';
  target.takeDamage(weapon.damage);
}
```

Between the `await` and `takeDamage`, another player's command
might have killed the goblin. A handler that yields takes on
responsibility for re-validating after.

Most current Saxonberg controllers complete synchronously. As
long as a chunk of code runs without awaits, it has exclusive
access to all state for its duration. The JS thread is
single-threaded; nothing else can interleave.

### Synchronous code blocks are implicit transactions

This is the load-bearing property:

- A controller body that runs synchronously to completion runs
  with exclusive access to the entire world state. No other
  command, activity callback, or event handler can interleave.
  This gives **atomicity for free.**
- The moment you `await`, you yield. Other things can run.
  Atomicity is broken across the await.

Practical implications:

- Most state mutations should be in synchronous blocks.
- If you must await, gather inputs first, then mutate
  synchronously after awaits resolve.
- For complex multi-step operations that can't all be done
  synchronously, re-validate after each await.

This is the framework's transactional discipline. Saxonberg's
call-security framework relies on it: the proxy / interceptor
pipeline gates per-call, and the controller body's synchronous
structure ties those gates together into per-command atomicity.

### Activities don't change command ordering

An activity is *not* a long-running command. The command that
starts an activity completes quickly; the activity runs in
parallel on the scheduler. The connection is free to handle the
next command immediately.

So a player typing `walk west` and then immediately `look`:

- `walk west` runs sync, starts a `TraverseActivity`, returns.
- `look` runs sync immediately after.
- The traverse fires several seconds later, after the look.

This is correct. The player retains agency during activities.
What the new command does about the in-progress activity is the
activity slate's concern (engagement-slot conflict checks).

---

## What's cheap, what's expensive

### Cheap

- Scheduling thousands of `setTimeout`s. libuv keeps timers in a
  min-heap.
- Many concurrent activities. Each is a small object with a
  scheduled completion timer.
- Frequent small WebSocket messages. Each frame has minimal
  overhead; the OS batches.
- Cancelling timers (`clearTimeout`).

### Expensive — and the loop will punish you

- Synchronous work over ~10ms. Other actors' commands queue
  behind it.
- A tick that walks every Stuff in the world. Don't do this every
  second.
- Synchronous JSON parsing of large payloads. Use streaming if
  it grows.
- Synchronous file I/O (`fs.readFileSync`). Always async
  (`fs.promises.readFile`).

### Sneaky-expensive

- A `for` loop over a 10,000-element array doing `something()`
  per element. 10k × 10µs = 100ms loop block.
- Shadow-heavy MQL queries on big rooms.
- Recursive light propagation (`LightApi.lightAt` already runs
  depth-bounded — good).

### General rule

**Break large work into chunks separated by `await` or
`setImmediate`.** The loop yields between chunks, lets I/O run,
lets other commands progress. This is how a real-time MUD with
many players manages to feel responsive.

---

## Wall-clock vs game-clock

A design choice worth making explicit.

- **Wall-clock** — `setTimeout(complete, 4000)` means 4 real
  seconds. The world advances at the rate the server clock
  advances.
- **Game-clock** — a separate `gameTime` that can be paused,
  accelerated for fast-travel, slowed for time-dilation effects.
  Completion is scheduled by gameTime; the scheduler converts
  gameTime to wall-clock per current speed.

For Saxonberg as a multi-user real-time MUD, **wall-clock is
the right answer for v1.** No global pause; players interact in
real time. The complications game-clock buys (time-dilation
effects, server-controlled fast travel) aren't on the roadmap.

If we ever want a "you doze off; 8 hours pass" mechanic, we'll
fast-forward gameTime independently of wall-clock as a one-off,
not as a permanent system layer.

---

## Defensive programming for "I don't trust myself"

The kit Node gives you against runtime errors and crashes:

### Dispatch try/catch — the universal defense

Wrap every command execution and activity callback in try/catch
+ promise rejection handling:

```ts
async function safeExecuteCommand(line) {
  try {
    await executeCommand(line);
  } catch (e) {
    log(e);
    player.send('Something went wrong with that command.');
  }
}

process.on('unhandledRejection', (reason, promise) => {
  log('UnhandledRejection:', reason);
});
```

Catches **every** exception path — thrown errors, rejected
promises, stack overflows. The server stays up; the player gets
a polite "oops" message; the bug shows up in logs for fixing.

This is the 95% defense.

### Watchdog — for runaway loops

A timer wraps synchronous controller execution; logs warnings
above N ms; alerts at 10×N. Without forking a worker you can't
*force-kill* a runaway loop in pure Node — but you can detect it,
log it, and fix it.

### Heap monitoring — for memory leaks

Periodic heap snapshots (Node's `--inspect` or programmatic
`v8.getHeapSnapshot`) catch slow leaks. Most leaks are obvious
in profiling; the GC is good at the rest.

### Together

Dispatch try/catch + watchdog + heap monitoring covers the
practical threat model for a development / personal project.
Isolated-vm provides stronger guarantees but at architectural
cost — see below.

---

## Isolation options

Three tiers, ordered by isolation strength:

### Tier 0 — no isolation (current)

All controllers, activities, and event handlers run on the host
JS thread. Defended only by the dispatch try/catch.

What this defends against:

- Exceptions, rejected promises, stack overflows. ✓ All caught.
- Logic bugs (off-by-one, wrong field). ✓ Don't crash; just
  produce wrong output.

What it does NOT defend against:

- Infinite loops in controllers — block the loop.
- Memory leaks in controllers — accumulate; eventually OOM.

### Tier 1 — single shared isolate for game logic

All game logic (controllers, activities, event handlers, mixin
state) runs in *one* isolate; the host has only the network
listener, persistence, and the bridge. One round trip per call
into game logic.

What it adds over Tier 0:

- An infinite loop in game logic crashes the *isolate*, not the
  host. Network listener stays up; you can restart the isolate
  cleanly.
- Memory leaks bounded by isolate's `memoryLimit`.

Cost: every call from the host into game logic crosses the
bridge (~100µs each). Architectural shift to game logic
hosting in an isolate.

### Tier 2 — per-component isolation

Each controller in its own isolate. Each mod in its own isolate.

What it adds: granular CPU/memory caps; one bad component
doesn't take down others.

Cost: every cross-component call crosses a bridge. The
architectural cost is significant — controllers can't easily
extend host Stuff classes; mixins span the bridge; persistence
spans the bridge.

### v1 recommendation

**Tier 0 with strong dispatch defenses.** The threat model
"bobalu writes a bug that crashes the server" decomposes:

- Crashes from exceptions → dispatch try/catch ✓
- Crashes from rejected promises → `unhandledRejection` ✓
- Crashes from stack overflow → dispatch try/catch ✓
- Crashes from infinite loops → watchdog + manual fix
- Crashes from memory leaks → heap monitoring + manual fix

The last two have softer mitigations than isolation, but they
also occur much less frequently than the first three. Most
"crashing bugs" are exceptions, not runaway loops.

**Mods land in Tier 2 isolates** as planned in
`docs/roadmap.md`. The threat model there is different (third-
party untrusted code).

**Forward compatibility for Tier 1.** Don't shape interfaces in
ways that preclude later moving game logic into an isolate. The
activity slate's `Activity` interface is shaped this way already
— hooks are plain functions; state is serializable; a future
scheduler can dispatch hooks via bridge calls instead of direct
calls without breaking changes.

If a real production crash ever traces to a runaway loop or
memory leak, Tier 1 is the escalation. Until then, the
architectural cost isn't justified.

---

## Practical numbers

Quick reference values for design decisions:

| Quantity | Practical value |
|---|---|
| Activity duration floor | 100ms (below: complete synchronously) |
| Activity duration ceiling | hours (no hard limit) |
| Synchronous controller budget | 10ms (above: warn; 50ms: alarm) |
| Wire frame round trip | 50-200ms typical |
| `setTimeout` precision (idle) | 1-5ms |
| `setTimeout` precision (busy) | up to seconds |
| Bridge call (isolated-vm) | 100µs - 1ms |
| Concurrent activities | thousands trivially |
| Concurrent connections | hundreds-to-thousands per host |

These values inform timing budgets in slates that schedule work.

---

## Summary

What the Node model gets us:

- **Sub-second precision activity scheduling.** Practical floor
  ~100ms; comfortable range 200ms–hours.
- **Many concurrent activities.** No upper bound that matters.
- **Cheap interruption.** `clearTimeout` + cleanup.
- **Single-threaded simulation.** All world state mutations
  serialized on one thread; no race conditions in JS code; no
  locks needed.
- **Async I/O is free.** DB queries, file ops, network — fold
  around them with `await`.

What the model constrains:

- **Network latency dominates "instant response."** Sub-50ms
  perceived responsiveness is wishful thinking once a real
  network is involved.
- **Don't block the loop with synchronous work.** The whole
  simulation pauses if you do.
- **Be honest about what the server can guarantee.** It can
  guarantee its own canonical ordering; it can't guarantee that
  two clients see events at the same wall-clock instant.
- **`await` breaks atomicity across the yield.** Either keep
  mutations synchronous or re-validate after awaits.
- **Granularity matches gameplay needs.** Sub-second is precise
  enough; sub-50ms is wishful thinking.

What this leaves the activity slate to design:

- The Activity interface and lifecycle.
- The engagement-slot model for concurrent activities.
- The cancel verb and per-activity policies.
- The wire-model conventions: derivable progress, server-pushed
  mid-events, ack-first dispatch.
- The completion-as-transaction-boundary discipline.

These all happen on top of the model captured here. They're
constrained by it but not dictated by it.
