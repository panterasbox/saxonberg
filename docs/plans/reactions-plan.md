# Reactions — implementation plan

**Status:** authoritative build plan derived from
`docs/requirements/reactions-requirements.md` (CLOSED scope). This
document is the handoff to a fresh-context build agent. It describes
*how*; the requirements decide *what*. Do not re-scope.

All paths are repo-relative from the monorepo root unless noted. The
server package root is `packages/server/src/mud`.

---

## 1. Approach overview

### The model (internalize before coding)

**A reaction is an ordinary emote carrying one extra scope:
`inReactionTo: <commandId>`.** Everything that makes a reaction *feel*
different from a wave — the tally, the toggle, the scale aggregation, the
renown event — is a thin layer (`ReactionRegistry`) hung off the emote
path. There is **no parallel dispatch**. The emote API gains exactly one
optional field plus a single "if scoped, notify the registry" hook.

The act being reacted to is keyed by **`meta.commandId`** — the nanoid
minted once per dispatch at `CommandGiver.ts` (verified at the
`commandId = nanoid()` line ~497, stamped onto every frame in
`Scene.send`'s `buildFrame`, `Scene.ts` ~234). The **subject** of a
reaction is the act's **`payload.speaker`** (a viewer-blind `StuffRef`).
Two witnesses who saw *different* rendered names for the same speaker
(per-viewer late-bound `Mml` naming) both react → one aggregate on the
shared `commandId`, crediting the one true author. This is the headline
cross-viewer aggregation property and it falls out **for free** from
keying on `commandId` + subject-on-`payload.speaker`.

### The one behavioral divergence: volume-gated fan-out suppression

A scoped emote behaves **identically to a normal emote** below a volume
threshold: it fans out as a real diegetic line (`"Iffy nods at Vera's
words"`) *and* is tallied. **At/above the threshold, the per-emote
fan-out is suppressed** — the emote's `Scene.send()` is skipped — and the
reaction feeds only the batched counter. This is the *entire* difference.
The decision ("am I above threshold for this act right now?") is owned by
`ReactionRegistry` and consulted by the emote send path *before it
sends*.

### The aggregation contract (server numbers, client drama)

The `ReactionRegistry` runs a **fixed-cadence timer tick (~150–250 ms,
default 200 ms)** — a `ScheduleApi.recurring` interval, **NOT**
`setImmediate`. The mql-subscription substrate uses `setImmediate`
because it wants to collapse *one synchronous burst* into one re-resolve;
reactions instead want a *wall-clock window* that collapses an *unbounded
stream of independent commands* (1000 reactions/sec, each its own command
dispatch, never in one tick) into ~5–10 flushes/sec **regardless of
throughput**. `setImmediate` would fire per-burst and give no throughput
bound; a fixed cadence makes per-tick wire cost a function of *audience ×
cadence*, not reaction count. This is the architectural crux — get it
wrong and the scale-bound acceptance test fails.

On each tick, for each recipient the registry packs every act that *moved
in that recipient's view* into one delta envelope carrying **tag-grouped
counts** (the bounded backbone) **plus a small capped familiar-biased
attributed sample** selected *per-recipient* via contacts/recognition.
The full reactor-set is **pull-only on expand**.

---

## 2. File-by-file changes, sequenced

Implement in this order; each step compiles/tests before the next.

### Phase A — Wire types (`@saxonberg/types`)

**File: `packages/types/src/index.ts`** (append, mirroring the existing
`Mql*Envelope` block at lines ~639–700)

Add the outbound delta envelope, the expand request/response pair, and
the per-user-control echo. Follow the existing envelope conventions
exactly: `type` literal + numeric `frameId` + a correlation key.

```ts
// ─── Reactions ───────────────────────────────────────────────

/** One emote-or-tag bucket's running count on one act. */
export interface ReactionBucket {
  tag: string;          // tag-group key (e.g. 'approval') OR verb when ungrouped
  emote: string;        // canonical emote verb that dominates the bucket
  emoji?: string;
  count: number;        // authoritative running total (NOT a delta)
}

/** A capped, per-recipient attributed sample entry. */
export interface ReactionSampleEntry {
  reactorId: string;          // durable stuffId
  reactorName: string;        // RecognitionApi.describe(viewer, reactor)
  emote: string;
  emoji?: string;
  customText?: string;        // inherited from the emote (free-form / fills)
}

/** Per-act aggregate state as it stands this tick (counts are absolute). */
export interface ReactionActState {
  commandId: string;          // the act key
  subjectId: string;          // payload.speaker.stuffId
  scope: string;              // audience-scope key: 'channel:<groupRef>' | 'location:<stuffId>'
  buckets: ReactionBucket[];
  sample: ReactionSampleEntry[];   // capped, familiar-biased, per-recipient
  total: number;
  aggregated: boolean;        // true once above threshold (client switches to counter)
}

/** Fixed-cadence delta: one per recipient per tick, only moved acts. */
export interface ReactionDeltaEnvelope {
  type: 'reaction-delta';
  frameId: number;
  acts: ReactionActState[];   // every act that moved in THIS recipient's view
}

/** Client pull for the full reactor-set behind one act (expand). */
export interface ReactionExpandMessage {
  type: 'reaction-expand';
  requestId: string;
  commandId: string;
}
export interface ReactionExpandResultEnvelope {
  type: 'reaction-expand-result';
  frameId: number;
  requestId: string;
  commandId: string;
  reactors: ReactionSampleEntry[];   // the FULL set (still recognition-named per viewer)
}
```

Notes:
- Counts are **absolute, not deltas** — per the requirements the client
  "does not sum; counts are authoritative." The "delta" framing is
  *which acts moved*, not arithmetic deltas. The client replaces its
  bucket counts on receipt and synthesizes animation from the change.
- The `scope` string is the overlay subscription key. Format it once and
  use it consistently server-side.

### Phase B — The emote-path scope hook

This is the heart. The hook must (1) carry `inReactionTo` on the emote,
(2) stamp it on the frame meta for client correlation, (3) notify the
registry, (4) let the registry suppress the send above threshold.

**File: `packages/server/src/mud/lib/social/Soul.ts`**

1. Extend `EmoteOptions`:
   ```ts
   export interface EmoteOptions {
     target?: Stuff;
     fills?: Record<string, string>;
     inReactionTo?: string;   // commandId of the act being reacted to
   }
   ```

2. In `emote()` and `emoteFree()`, when `opts?.inReactionTo` (or the
   `emoteFree` equivalent — give `emoteFree` an optional 3rd arg
   `inReactionTo?: string`) is present:
   - Build the Scene as today, but **before `scene.send()`**, call the
     registry hook and let it decide suppression:
     ```ts
     if (inReactionTo !== undefined) {
       const decision = ReactionApi.onScopedEmote({
         reactor: actor,
         inReactionTo,
         verb: emote.verb,              // or freeForm marker
         emoji: emote.emoji,
         tags: emote.tags,
         customText,                    // fills / free-form text, for the sample
       });
       if (decision.suppressFanOut) return;   // above threshold: counter only, no line
       scene.meta({ inReactionTo });           // below threshold: stamp + send the line
     }
     scene.send();
     ```
   - **`scene.meta({ inReactionTo })`** is the clean carrier — `Scene`
     already has a `meta(partial)` method that merges into `#extraMeta`,
     which `buildFrame` copies onto every frame's `meta` (verified
     `Scene.ts:102` and `:237`). Add `inReactionTo?: string` to
     `MessageFrame['meta']` in `@saxonberg/types` so it is typed end to
     end. This makes the reaction's own diegetic line correlatable
     client-side, and — critically — **the reaction's own frame carries
     NO `commandId` of its own that gets registered as reactable** (see
     the reactability gate, Phase D): a reaction is never itself
     reactable, which stops the regress.

3. Import `ReactionApi` lazily (dynamic `import('../../api/reaction')`)
   to avoid a static cycle, matching the existing `SoulApi` lazy-import
   pattern in `CommandGiver.ts`.

**Why the hook lives in `SoulMixin`, not the controller or
`CommandGiver`:** all three emote dispatch paths (bare-verb catalog
inline in `CommandGiver._runChain` ~line 790; `:`/`;` prefix free-form;
the `emote.yaml`→`EmoteController` path) converge on `speaker.emote()` /
`speaker.emoteFree()`. Putting the hook in the mixin's send methods means
**every** dispatch path inherits reaction behavior with zero per-path
threading — and the `react` verb (Phase E) simply calls the same mixin
methods with `inReactionTo` set. Do not scatter the hook across the three
dispatch sites.

**`onScopedEmote` returning a *synchronous* decision** matters:
`emote()`/`emoteFree()` are sync (they call `scene.send()`
synchronously). The registry's "am I above threshold?" check reads
in-memory counts and returns immediately. The tally mutation + renown
emit also happen inside `onScopedEmote`, synchronously.

### Phase C — `ReactionApi` + `ReactionRegistry`

Follow the `MqlSubscriptionApi` / `MqlSubscriptionRegistry` precedent
*exactly* — thin Api facade over a singleton `Idea` holding state, every
registry method `FromModule`-gated, Api ends with
`SecurityApi.decorateApiClass`.

**File: `packages/server/src/mud/api/reaction.ts` — `ReactionApi`**

The thin gated facade. State lives in the registry singleton; the Api
holds only a cached pointer (resolved via
`StuffApi.findByTemplatePath('/obj/ReactionRegistry')`, same as
`SoulApi.#catalogueRef`).

Surface:
```ts
class ReactionApi {
  // Called synchronously from SoulMixin.emote/emoteFree on a scoped emote.
  // Returns { suppressFanOut } so the caller knows whether to skip its line.
  static onScopedEmote(req: ScopedEmoteRequest): { suppressFanOut: boolean };

  // Messaging-side: registers an act as reactable the FIRST time a frame
  // for that commandId is observed (captures subject + scope). Idempotent.
  static noteReactableAct(req: ReactableActRequest): void;

  // Wire-facing expand pull (routed from Application.processUserMessage).
  static handleExpand(req: ExpandRequest): void;

  // Overlay-ready: register/cancel a scope-keyed read-only subscriber
  // (an Interactive OR the broadcast principal sink).
  static subscribeScope(sink: ReactionSink, scope: string): void;
  static cancelSink(sink: ReactionSink): void;

  // Disconnect cleanup (mirror cancelAllForInteractive).
  static cancelAllForInteractive(interactive: Interactive): void;
}
SecurityApi.decorateApiClass(ReactionApi);
```

All methods 1:1 delegate to the registry singleton. Define the
request/sink types and the `ReactionSink` abstraction (see "sink-agnostic
broadcaster" below) in this file and re-export the value types the
controller/messaging need.

**File: `packages/server/src/mud/obj/ReactionRegistry.ts` —
`ReactionRegistry` (singleton `Idea`)**

Copy the header/gating skeleton from `MqlSubscriptionRegistry.ts`: lives
at `/obj/ReactionRegistry`, every public method carries
`@CallSecurity(FromModule('mud/api/reaction#ReactionApi'))` (plus the
logic-singleton self-call admission, the `AnyOf(...)` pattern),
`canDestruct` refuses, register the class via a
`registerReactionRegistryClass` call in `obj/api/` if you follow the
Logic split — but reactions can keep it simpler: a single registry
singleton + Api is sufficient (the Mql build's `*Logic` indirection
exists for HMR pointer reasons; mirror only if you want the same HMR
survival, which you do — keep state on the singleton so an Api reload
doesn't drop tallies).

State held here (all `private`, not `#private`, per the
call-security-proxy rule documented in `MqlSubscriptionRegistry`):
- `acts: Map<commandId, ActRecord>` where `ActRecord = { commandId,
  subjectId, scope, createdAt, reactions: Map<reactorId,
  ReactorReaction>, aggregated: boolean }`. `ReactorReaction = { emote,
  emoji?, tags, customText?, present: boolean }`.
- `dirty: Set<commandId>` — acts that moved since last flush.
- `scopeSinks: Map<scope, Set<ReactionSink>>` — overlay/read-only
  subscribers indexed by audience-scope.
- `interactiveSinks: Map<Interactive, ReactionSink>` — the normal
  per-player sink (an Interactive is implicitly subscribed to the scopes
  of acts in its ring; see broadcaster).
- `lastBySubject: Map<subjectId, commandId>` — the last reactable act per
  subject, for `--to` person resolution; updated in `noteReactableAct`.
- `frameIndex` — a bounded per-Interactive `frameId → commandId` ring for
  `--msg` gutter resolution, populated as reactable-act frames are
  delivered (may instead live on the Interactive).
- the recurring `ScheduleHandle` for the flush tick.

Core methods:

**`onScopedEmote(req)`** (sync):
1. Look up `acts.get(req.inReactionTo)`. If absent → the act was never
   noted reactable (no `noteReactableAct` ran for it). Reject: return
   `{ suppressFanOut: false }` and have the *Api* surface a note path so
   the `react` controller can tell the player "that act can't be reacted
   to." (The controller validates reactability *before* dispatching the
   emote — see Phase E — so `onScopedEmote` mostly trusts the act exists;
   the absence guard is defense in depth.)
2. **Toggle:** the key is `(reactorId, emote)`. If the reactor already
   has a *present* reaction with this same emote on this act → flip
   `present = false` (count drops), mark dirty, **do not** emit a renown
   event (un-reacting is not a fired reaction), return
   `{ suppressFanOut: aggregated }`. Else record/flip-on the reaction
   (`present = true`, capture `customText`), mark dirty, **emit
   `ReactionFiredEvent`** (Phase F).
3. **Threshold check:** recompute `total = ` count of present reactions.
   If `total >= threshold` set `aggregated = true`. Return
   `{ suppressFanOut: act.aggregated }`.
   - Subtlety: the *first* reaction that crosses the threshold should
     still suppress its own line (so there's no half-second where line N
     renders but N+1 doesn't) — i.e. compute `aggregated` *including*
     this reaction before deciding suppression. Below threshold returns
     `false` (line renders).
4. Mark the act dirty regardless (count moved).

**`noteReactableAct(req)`** (the messaging-side capture, Phase D): if
`acts` has no entry for `commandId`, create `ActRecord` with `subjectId`,
`scope`, `createdAt = Date.now()`. Idempotent — only the first frame per
`commandId` creates it. **Never** key on `causingCommandId`.

**`flush()`** — the fixed-cadence sink-agnostic broadcaster (the crux):
- Installed via `ScheduleApi.recurring(cadenceMs, () => this.flush(),
  { mode: 'fixed-rate', propagateAttribution: false })` in `postRegister`
  (read cadence from `AppApi.setting('reactions.cadenceMs')`).
  `propagateAttribution: false` because flush frames are background, not
  command-descended.
- If `dirty` is empty, return immediately (cheap idle tick).
- Build the set of moved acts. For each **recipient sink**, gather the
  moved acts *visible to that sink* (an act is visible to a sink iff the
  sink is subscribed to the act's scope — for a normal player
  Interactive, "subscribed" = the act's scope is one the player is a
  member of / has the act in their ring; for the broadcast principal /
  overlay sink, = explicit `scopeSinks` membership).
- For each such act, build a `ReactionActState`: absolute `buckets`
  (group present reactions by tag — using `Emote.tags`; ungrouped acts
  fall back to per-verb buckets), `total`, `aggregated`, and a
  **per-recipient `sample`**: select up to `sampleCap` (default ~5)
  present reactions, **biased toward reactors this recipient recognizes /
  has in contacts**, name them via `RecognitionApi.describe(recipientStuff,
  reactorStuff)`. Strangers stay in the count, unnamed. (Below threshold
  the sample can be the full small set; above threshold it's the capped
  biased sample.)
- Coalesce all visible moved acts for that recipient into **one**
  `ReactionDeltaEnvelope` and emit it through the sink (one wire message
  per recipient per tick — this is what makes per-tick cost = audience ×
  1, independent of reaction throughput).
- Clear `dirty` at the end of the tick.

**Per-recipient sample selection** (helper `sampleFor(act, viewer)`):
- Partition present reactions into "familiar to viewer" (viewer is a
  Perceiver/`Contacts` host and `allContacts()` contains the reactor's
  durable ref, OR `RecognitionApi.describe(viewer, reactor)` yields a
  recognized name rather than salient features) and "stranger".
- Take familiar first (most-recent first), fill remaining cap with
  strangers *only if* you want unnamed strangers in the sample — per
  requirements, the *count* carries strangers; the *sample* is the
  named/known surface, so prefer familiar and stop. Name each via
  `RecognitionApi.describe`.

**`handleExpand(req)`**: resolve the act, build the **full**
`ReactionSampleEntry[]` (every present reactor, recognition-named for the
requesting viewer), emit `ReactionExpandResultEnvelope` via that
Interactive's sink.

**GC tied to the ring**: reaction state must die when the act ages out of
the message ring. Two mechanisms, use the simpler:
- Time-based GC matching the ring's effective retention: on each flush,
  drop `acts` entries whose `createdAt` is older than a TTL derived from
  ring depth, OR
- (preferred, exact) hook the chat ring's eviction. The chat ring is
  FIFO cap 200 (`ChannelCatalogue.ts` `HISTORY_CAP = 200`,
  `appendToHistory`). For room speech/emotes there is no persistent ring
  — those acts are transient, so a TTL (e.g. a few minutes, or N flushes)
  is the correct GC for them. Implement a **single TTL-based GC pass
  inside `flush()`** keyed on `createdAt`; document that the chat ring's
  200-cap is the conceptual bound and the TTL approximates it. Do not
  over-engineer a per-ring eviction listener for v1.

**The sink-agnostic broadcaster — `ReactionSink`:** define a minimal sink
interface in `api/reaction.ts`:
```ts
interface ReactionSink {
  emitDelta(env: ReactionDeltaEnvelope): void;
  // identity for de-dup / cancel
}
```
- The **normal player sink** wraps an `Interactive`: `emitDelta` calls
  `MessageApi.sendEnvelope(interactive.getHolder(), env)` (the same path
  `MqlSubscriptionRegistry` uses — `sendEnvelope(viewer, template)` at
  line ~300; envelopes ride the parallel Sensor pipeline and pick up
  `frameId` at the Application send-time chokepoint).
- The **broadcast-principal sink** must reach the read-only
  `service:broadcast` connection, which **has no Interactive** (confirmed
  in `livestream.md`: registered straight with `BroadcastFeed`, reached
  via `Backend.sendEnvelopeToSocket`). So the broadcaster cannot assume
  an Interactive. Two clean options — pick **the event-bus route** to
  stay decoupled (mirrors how `StreamState` reaches `BroadcastFeed` via
  `Events.StreamStateChanged` rather than a direct call):
  - Have `flush()` additionally `EventApi.fire(new
    ReactionScopeDeltaEvent({ scope, env }))` for each scope that moved.
    `BroadcastFeed` (in `packages/server/src/backend/BroadcastFeed.ts`)
    lazily installs a listener and forwards to its broadcast sockets via
    `Backend.sendEnvelopeToSocket`, filtered by the scopes the overlay
    subscribed to. This keeps the registry sink-agnostic (it emits to
    Interactive sinks directly + fires a scope event for any
    non-Interactive consumer) and satisfies "reach the non-`Interactive`
    read-only broadcast principal."
  - **Acceptance-test note:** the overlay-ready test asserts a scope-keyed
    subscription can be *fed* a scope's deltas to a non-Interactive sink —
    assert at the event/sink seam, not at a rendered overlay (rendering is
    out of scope).

### Phase D — Messaging-side reactability derivation

**No new id, no new fan-out threading.** The only work is (1) classifying
which topics are reactable act-kinds, and (2) calling `noteReactableAct`
when such a frame is composed, capturing subject + scope. Do this at the
**producer** send sites where `commandId`, `payload.speaker`, and the
audience-scope are all in hand — *not* in the per-recipient
`Scene.buildFrame` loop (that runs per recipient and lacks the scope
abstraction).

Reactable act-kinds (the closed v1 set):
- `world.speech.say`, `world.speech.whisper`, `world.speech.shout` (from
  `Vocal.ts`)
- `world.expression.emote` (from `Soul.ts`)
- `world.chat.message` (from `ChannelCatalogue.postToChannel`)

Define this set once: `ReactionApi.REACTABLE_TOPICS:
ReadonlySet<string>` (or a `isReactableTopic(topic)` predicate). A frame
is reactable iff **topic ∈ REACTABLE_TOPICS ∧ commandId present ∧
audience is broadcast (not single-viewer-private)**.

Capture sites:

1. **`Vocal.ts`** (say/whisper/shout): after composing the Scene and
   reading the active `commandId`, call `ReactionApi.noteReactableAct({
   commandId, subject: speaker, scope: locationScope(speaker) })`.
   `commandId` is read via
   `ExecutionContextApi.getCurrentCommandContext()?.commandId` (verified
   accessor, `execution-context.ts:311`). `locationScope(speaker)` =
   `'location:' + speaker.getContainer()?.stuffId` (the circle of
   co-present witnesses). Skip if no `commandId` (e.g. NPC background
   speech outside a command) — that's the "no-command acts aren't
   reactable" gate.
   - **Whisper is reactable, exactly like say/shout.** A whisper is a
     *perceptible act*: `Vocal.whisper` already fans a peers frame
     (`toPeers`/`toContents`, `Vocal.ts:162–164`) to overhearers in
     acoustic reach — the lower `acousticDb` (30) shortens the
     sound-walk's *reach*, it does not make the act private. So whisper
     has a room audience: speaker, target, and in-range overhearers all
     receive a frame sharing the one `commandId`. Note the act reactable
     **once** at location-scope, same as say/shout; anyone who received a
     frame may react. (The "senses the whisper but can't make out the
     words" content-fidelity degradation for distant overhearers is a
     future perception refinement on `acousticDb` — it is *orthogonal* to
     reactability, which keys on the act, not the words. Today overhearers
     even get the full text in the peers frame; that doesn't change the
     reaction model.)

2. **`Soul.ts`** (`emote`/`emoteFree`): after composing the Scene, **for
   non-reaction emotes only** (`inReactionTo === undefined`), call
   `noteReactableAct({ commandId, subject: actor, scope:
   locationScope(actor) })`. **A reaction's own frame is NOT noted** —
   this is the regress-stopper. Gate on `commandId` present.

3. **`ChannelCatalogue.postToChannel`**: scope = `'channel:' +
   channel.groupRef` (the channel's backing `GroupRef`; verified
   `c.groupRef = 'managed:<group._id>'`). Subject = `speaker`. **Critical
   bug to fix:** the chat witness fan-out builds `baseMeta` **manually
   and omits `commandId`** (verified `ChannelCatalogue.ts` ~256 —
   `baseMeta = { timestamp, modality, channelId }`, no `commandId`).
   Without `commandId` on chat frames, chat posts cannot be correlated
   client-side and the act key would be missing. **Fix:** read `const
   commandId = ExecutionContextApi.getCurrentCommandContext()?.commandId`
   once in `postToChannel`, add it to `baseMeta` (and the history-ring
   frame), and call `noteReactableAct({ commandId, subject: speaker,
   scope })` when `commandId` is present. The self-frame already goes
   through `Scene` so it gets `commandId` for free; only the manual
   witness/history frames need the stamp. This is the one genuine
   messaging-core edit and it's a pre-existing omission, not new
   threading.

`noteReactableAct` is idempotent on `commandId`, so calling it once per
send site (before the fan-out loop) is correct and cheap.

### Phase E — The `react` verb

**File: `packages/server/src/mud/cmd/social/react.yaml`** (mirror
`chat.yaml` / `emote.yaml` structure)

```yaml
verbs: [react, re]    # 're' = the low-friction alias; confirm no collision
controller: social/ReactController
description: >
  React to something someone just said or did. A reaction is an emote
  aimed at a specific prior act — it is PUBLIC and ATTRIBUTED, counted
  against that act, and (eventually) folded into the actor's standing.
  Grammar:  react [--to <person>] [--msg <#>] <emote-expression>
  With no selector you react to the most recent act in view; --to picks a
  person's most-recent act; --msg picks a specific message by its gutter
  number. The <emote-expression> is any ordinary emote, exactly as you'd
  type it bare (`;wave`, `nod`, `cheer happily`), and may carry its own
  target: `react --msg 113 ;wave bob` waves at bob in response to msg 113.
validators:
  - /lib/command/validators/requiresAnimate
options:
  - name: to        # react to a person's most-recent reactable act
    type: stuff
    scope: online
  - name: msg       # react to a specific message by its gutter number
    type: number
args:
  - name: expression
    type: string
    required: true
    greedy: true
```

The act-selector is parser-typed — `--to` is a `stuff` option (MQL-
resolved), `--msg` is a `number` — so the controller never string-sniffs
a positional to guess gutter-vs-person. The emote-expression is the sole
greedy positional, handed opaquely to the emote dispatcher (preserving
its own grammar). This mirrors the existing `say --to <stuff> <text>`
shape.

**Low-friction is load-bearing** (see requirements): the **implicit
selector-less form is the primary path** — `re ;smile` (or `react
;smile`) reacts to the most recent act in view, no target needed, at
parity-or-cheaper than the bare emote `;smile iffy`. The `re` alias + the
one-key UI palette complete the cheap surface. If reacting costs more
keystrokes than a bare emote, dramatic responses route around `react` and
forfeit aggregation + renown — so keep the selector-less form frictionless
and discoverable.

The help/description text is load-bearing per the acceptance criteria
(transparency-drives-adoption): make the act-scope, the public/attributed
nature, and the two-vector example explicit.

**File:
`packages/server/src/mud/obj/command/social/ReactController.ts`**
(controller returns `void`, reports via `ctx.note`)

Flow:
1. **Resolve the act → `commandId` (parser-typed; no string-sniffing).**
   The grammar hands the controller already-typed inputs: an optional
   resolved `to` Stuff, an optional numeric `msg`, and the greedy
   `expression`. Pick in precedence:
   - **`--msg <n>` present** → resolve the gutter number → `commandId`
     via the bounded **per-Interactive `frameId → commandId` ring** kept
     for reactable acts delivered to this Interactive (the server already
     stamps `meta.frameId` per Interactive, `Interactive.ts:59`). The
     same path serves a client-UI click (it emits the gutter number it
     displays). Server-owned; no client-supplied `commandId` for input.
   - **`--to <person>` present** (already MQL-resolved by the parser) →
     that subject's most-recent reactable act the reactor witnessed —
     `ReactionRegistry.lastReactableActBy(subjectId)` validated against
     audience membership. Maintain a `Map<subjectId, commandId>` (last
     reactable act per subject) in the registry, updated in
     `noteReactableAct`.
   - **neither** → the reactor's most-recent reactable act in view.
2. **Validate reactability + audience membership:** the resolved
   `commandId` must be a known reactable act (`acts.has(commandId)`)
   **and** the reactor must be in that act's audience (member of its
   scope). On failure → `ctx.note({ kind: 'command-rejected', reason:
   ..., detail: '...' })` with a clear message ("you can't react to that
   — it isn't a reactable act / you didn't witness it"). This is the gate
   test (non-acts + no-`commandId` rejected).
3. **Parse the emote-expression through the existing emote path:** strip
   a leading `:`/`;` if present, split into verb + rest,
   `SoulApi.resolve(verb)`. On a catalog hit, `EmoteGrammarRunner.bind(
   emote, rest, reactor)` for target+fills (reuse the exact binding logic
   from `CommandGiver._runChain` ~790 — consider extracting a shared
   `dispatchEmote(speaker, verb, restTokens, { inReactionTo })` helper so
   the controller and the router don't duplicate). On a free-form miss,
   `reactor.emoteFree(text, undefined, commandId)`.
4. **Dispatch with the scope:** `reactor.emote(emote, { target, fills,
   inReactionTo: commandId })` (or `emoteFree(..., inReactionTo)`). The
   mixin hook (Phase B) does the tally/toggle/suppression/renown. The
   controller does **not** touch the registry directly beyond
   resolution/validation — it goes through the emote path, honoring
   "reactions inherit the emote path wholesale."
5. Return `void`. Feedback is the emote line itself (below threshold) or
   the batched delta (above threshold), per the response-envelope
   constraint.

**Wire the verb onto the affordance surface** the same way
`emote.yaml`/`introduce.yaml` are contributed — `react` is a social verb
available to any animate `SoulMixin` host. Add `'social/react.yaml'` to
`SoulMixin.commandContributions.self` (alongside `social/emote.yaml`) in
`Soul.ts`, since reacting requires Soul (it dispatches an emote).

### Phase F — The renown event

**File:
`packages/server/src/mud/lib/events/ReactionFiredEvent.ts`** (mirror
`FieldChangedEvent.ts` DTO shape exactly)

```ts
export interface ReactionFiredPayload {
  reactorId: string;       // durable stuffId
  subjectId: string;       // act's payload.speaker.stuffId
  commandId: string;       // the act
  emote: string;           // raw verb (or free-form marker)
  tags: string[];          // raw, UNINTERPRETED — no valence mapping
  customText?: string;
  scope: string;           // circle-context: 'channel:<groupRef>' | 'location:<id>'
  selfReaction: boolean;   // reactorId === subjectId (emitted but identifiable)
}

export class ReactionFiredEvent {
  static readonly KIND = 'reaction.fired';
  readonly kind = ReactionFiredEvent.KIND;
  constructor(public readonly payload: ReactionFiredPayload) {}
}
```

Fired from `ReactionRegistry.onScopedEmote` **only on a flip-on** (a
newly-present reaction), via `EventApi.fire(new
ReactionFiredEvent({...}))`. **No consumer** is built. A test asserts the
payload shape only (Phase H). Carry raw `tags` (no polarity/valence), per
the non-goals. Self-reactions are emitted with `selfReaction: true`.

### Phase G — Client (`packages/client`)

Behavioral contract only; visuals are implementation. The client rides
the existing transcript/console.

1. **Surface `commandId` (and `inReactionTo`) on the client `Frame`**
   (`packages/client/src/store/index.ts`, the `Frame` interface ~line
   168): add `commandId?: string` and `inReactionTo?: string`, populated
   from `meta` when the websocket service ingests a `MessageFrame`. This
   is for **render-correlation** — matching incoming `reaction-delta`
   acts (keyed by `commandId`) to the displayed message so the counter
   renders on the right line. **Input does NOT use it:** a clicked or
   typed reaction emits `react --msg <gutter#>` (the per-Interactive
   `frameId` the client already shows), and the server resolves the
   gutter number → `commandId` via its ring. Gutter→commandId stays
   server-side.

2. **Envelope routing** (`packages/client/src/services/websocket.ts`):
   register handlers for `'reaction-delta'` and `'reaction-expand-result'`
   alongside the existing `mql-subscription-delta` handlers (~line 680).
   Route into new store actions.

3. **State** (`packages/client/src/store/`, new `reactionActions.ts` peer
   to `consoleActions.ts`): a `reactions: Map<commandId, ReactionActState>`
   slice. On `reaction-delta`, **replace** each act's
   buckets/sample/total/aggregated (counts authoritative — do not sum)
   and record a "moved" marker the widget animates from. On
   `reaction-expand-result`, store the full reactor list for that act.

4. **The counter/train widget** attached to a transcript message: a
   component keyed by the message's `commandId` that reads
   `reactions.get(commandId)`. Below threshold (`aggregated === false`)
   the reactions already rendered as ordinary emote lines (inherited,
   free — no new path); above threshold it renders the **counter +
   train**: animate the rising total from successive deltas (synthesize
   the burst client-side from sparse absolute counts), show **tag-grouped
   buckets**, and the **attributed sample** (recognized reactors by
   name). **Expand** sends `reaction-expand` and renders the full set.
   Observable behaviors required by acceptance: rising counter from
   deltas, named sample, tag buckets, expand, per-user controls.

5. **Quick-react palette** in the input area: frequent/recent emotes +
   the full `SoulApi` catalog (fetch via the existing catalog surface).
   Selecting one emits a `react <commandId> ;<verb>` command for the
   focused/selected transcript message.

6. **Per-user controls** read from the `EnvironmentMixin` settings (Phase
   H): intensity, mute-on-channel, always-aggregate, tag-group on/off,
   collapse threshold — each applied client-side to the rendered widget,
   observable.

### Phase H — Settings

**File: `packages/server/src/mud/config/app-settings.yaml`** (append,
following the existing `key`/`value` insert-only shape):
```yaml
  - key: reactions.threshold
    value: "10"          # at/above this many reactions on one act → counter mode
  - key: reactions.cadenceMs
    value: "200"         # fixed-cadence flush window (bounded 150–250)
  - key: reactions.sampleCap
    value: "5"
```
Read via `AppApi.setting('reactions.threshold')` (returns string; parse
to number) in the registry. Document the bounded range (clamp cadence to
[150, 250]).

**File: `packages/server/src/mud/lib/shell/Environment.ts`** is the
schema *type* home; the per-user reaction controls are contributed as a
`static settings: SettingsSchemaEntry[]` block on the mixin that owns the
reaction surface. Add them to **`SoulMixin.settings`** in `Soul.ts`
(alongside the existing `social.emote.render` entry) — Soul is composed
on every Character and already owns the emote-render preference, so
reaction display controls belong there:
```ts
{ key: 'social.react.intensity', type: SettingTypes.Enum, default: 'normal', enumValues: ['off','subtle','normal','vivid'], description: '...' },
{ key: 'social.react.muteChannels', type: SettingTypes.Boolean, default: false, description: '...' },
{ key: 'social.react.alwaysAggregate', type: SettingTypes.Boolean, default: false, description: '...' },
{ key: 'social.react.tagGroup', type: SettingTypes.Boolean, default: true, description: '...' },
{ key: 'social.react.collapseThreshold', type: SettingTypes.Number, default: 25, description: '...' },
```
These are read client-side from the settings sync (the client already
receives settings). `alwaysAggregate`/`muteChannels` are client-render
preferences in v1 (server always emits both the line below-threshold and
the delta above); document that server-side honoring is a later
refinement.

### Phase I — Wiring

- **`Application.processUserMessage`**: route inbound `'reaction-expand'`
  → `ReactionApi.handleExpand`, mirroring the `'mql-query'` route.
- **`Application.handleUserDisconnect`**: call
  `ReactionApi.cancelAllForInteractive(interactive)` **before**
  `ConnectionManager.removeInteractive`, mirroring the mql-subscription
  disconnect ordering.
- **`bootstrap.ts`**: seed `/obj/ReactionRegistry` (`{ class:
  /obj/ReactionRegistry, data: {} }`) and ensure its `postRegister`
  installs the recurring flush tick. Register the class export in the obj
  barrel as the mql registry is.
- **`BroadcastFeed`** (`packages/server/src/backend/`): add the
  `ReactionScopeDeltaEvent` listener + scope-filtered forward (Phase C
  broadcaster). This is the overlay-ready seam.
- **Docs:** create `docs/subsystems/reactions.md` (acceptance criteria
  require it exists) covering the act-scoped-emote model, the threshold
  divergence, the registry, the verb, and the wire envelopes.

---

## 3. Tests (Vitest, colocated `__tests__`)

Place server tests under `packages/server/src/mud/.../__tests__/` next to
each unit; client tests under `packages/client/src/.../__tests__/`.

1. **Cross-viewer aggregation** (`ReactionRegistry.test.ts`): two
   witnesses whose frames rendered the speaker's name differently both
   react to the same `commandId` → one `ActRecord`, `subjectId ===
   payload.speaker.stuffId`, `total === 2`. Asserts the headline
   property.
2. **Reaction = act-scoped emote** (`ReactController.test.ts` +
   `Soul.reaction.test.ts`): `react 113 ;wave` dispatches a wave with
   `inReactionTo: '113'`; `react 113 ;wave bob` honors both vectors
   (emote target = bob, scope = 113); a bare `wave iffy` records against
   **no** act (no `inReactionTo`, registry untouched).
3. **No-command / non-act gate**: an act-kind frame lacking `commandId`
   is never noted reactable; a non-act topic (`world.perception.look`) is
   rejected by the controller with a clear note; assert the key is never
   `causingCommandId`.
4. **Completionist coverage**: say, whisper, shout, an emote, and a chat
   post are each noted reactable and react-able (whisper via its peers
   frame, so an overhearer can react); assert chat now carries
   `commandId` on witness frames (the `ChannelCatalogue` fix).
5. **Toggle**: same `(reactor, emote)` reacting twice → `present` flips,
   `total` drops; no second `ReactionFiredEvent`.
6. **Threshold flip (prose ↔ counter)**: below threshold `onScopedEmote`
   returns `{ suppressFanOut: false }` and a diegetic line sends; the
   reaction crossing the threshold returns `{ suppressFanOut: true }` and
   no line sends; assert the reaction's own frame is itself not reactable
   (no `noteReactableAct` for it).
7. **Scale bound (headline)**: drive 1000 `onScopedEmote` calls/sec worth
   of mutations across 300 audience members within one cadence window;
   assert exactly one `ReactionDeltaEnvelope` per recipient per tick (≤
   300 wire messages/tick), provably independent of reaction count. Use a
   fake `ScheduleApi`/clock and a counting sink.
8. **Attribution sampling**: a viewer with reactor A in contacts and
   reactor B a stranger → A surfaces by name in the per-recipient sample,
   B stays in the count unnamed; assert `RecognitionApi.describe` is the
   naming source and the cap is honored.
9. **Renown event shape** (`ReactionFiredEvent.test.ts`): a flip-on emits
   one `ReactionFiredEvent` with reactor, subject, raw emote + raw
   uninterpreted tags, scope/circle-context, `selfReaction` flag; **no
   consumer asserted**. Un-react emits none.
10. **Overlay-ready scope subscription**: a non-Interactive sink
    subscribed by scope receives that scope's deltas via the
    `ReactionScopeDeltaEvent` seam; rendering not asserted.
11. **GC**: an act past its TTL is dropped from `acts` on a flush pass;
    its state is gone (a subsequent expand returns empty / rejects).
12. **Client** (`reactionActions.test.ts`): a `reaction-delta` replaces
    counts (no summing), marks the act moved; `reaction-expand-result`
    stores the full set; controls toggle observable render state.

---

## 4. Critical files

- `packages/server/src/mud/lib/social/Soul.ts` — the emote-path scope
  hook (`EmoteOptions.inReactionTo`, the `onScopedEmote` call + fan-out
  suppression in `emote`/`emoteFree`, the `react.yaml` contribution, the
  per-user settings).
- `packages/server/src/mud/obj/ReactionRegistry.ts` — the
  tally/toggle/scale/renown state + the fixed-cadence sink-agnostic
  broadcaster + per-recipient sampling + GC.
- `packages/server/src/mud/api/reaction.ts` — the thin gated
  `ReactionApi` facade (`onScopedEmote`, `noteReactableAct`,
  `handleExpand`, scope subscription, `REACTABLE_TOPICS`, `ReactionSink`).
- `packages/server/src/mud/obj/command/social/ReactController.ts` +
  `packages/server/src/mud/cmd/social/react.yaml` — act-selector
  resolution (gutter/person → `commandId`), reactability/membership
  validation, dispatch through the emote path with the scope.
- `packages/server/src/mud/obj/ChannelCatalogue.ts` — the
  `commandId`-on-witness-frames fix + `noteReactableAct` capture for chat
  (the one genuine messaging-core edit).
- `packages/types/src/index.ts` — `ReactionDeltaEnvelope`, expand
  request/result, `MessageFrame.meta.inReactionTo`.

Supporting: `packages/server/src/mud/lib/message/Vocal.ts` (say/shout
capture), `packages/server/src/mud/lib/events/ReactionFiredEvent.ts`,
`packages/server/src/backend/BroadcastFeed.ts` (overlay seam),
`packages/client/src/store/reactionActions.ts` + the counter/train widget
+ palette.

---

## 5. Trickiest integration points (get these right)

1. **Fan-out suppression timing.** `onScopedEmote` must return its
   suppression decision *synchronously* and *before* `scene.send()`,
   computing `aggregated` *including* the current reaction so the
   threshold-crossing reaction suppresses its own line (no flicker). The
   mixin returns early on suppression — no Scene sent at all.

2. **Fixed tick vs `setImmediate`.** Use `ScheduleApi.recurring` at
   150–250 ms (`fixed-rate`, attribution severed). `setImmediate` (the
   mql pattern) is **wrong here** — it batches per synchronous burst, but
   reactions arrive as a stream of *independent command dispatches*,
   never in one tick, so `setImmediate` gives no throughput bound. The
   wall-clock window is what collapses 1000/sec into ~5 flushes/sec. The
   scale-bound test exists to lock this in.

3. **Per-recipient personalized sample.** The sample is computed *per
   recipient per tick* via `RecognitionApi.describe(viewer, reactor)` +
   contacts membership — the *same* late-binding the prose path uses. The
   counts are recipient-independent (the bounded backbone); only the
   sample is personalized. Don't pre-bake names server-wide.

4. **Sink-agnostic broadcaster reaching the broadcast principal.** The
   `service:broadcast` connection has **no Interactive** — it's a
   `BroadcastFeed` push target reached via `Backend.sendEnvelopeToSocket`.
   The registry must not assume an Interactive: emit to Interactive sinks
   directly (`MessageApi.sendEnvelope`) **and** fire a scope-keyed
   `ReactionScopeDeltaEvent` that `BroadcastFeed` taps (mirroring
   `StreamStateChanged` → `BroadcastFeed`). Index aggregates by
   audience-scope so an overlay subscribes by scope.

5. **Gutter → commandId resolution (server-side).** The gutter number is
   the per-Interactive `meta.frameId` (`Interactive.ts:59`); the durable
   act key is `meta.commandId`. Keep a bounded **per-Interactive
   `frameId → commandId` ring** (on the Interactive or the registry,
   populated as reactable-act frames are delivered); `react --msg <n>`
   resolves through it, and a client-UI click uses the same path (it
   emits the displayed gutter number). The server validates the resolved
   `commandId` is a known reactable act *and* the reactor is in its
   audience (membership = eligibility). `--to <person>` resolves to that
   subject's last witnessed reactable act via the registry's per-subject
   map. The act-selector is never type-sniffed — the parser types `--msg`
   (number) and `--to` (stuff) distinctly; the emote-expression is the
   sole greedy positional.

---

## 6. Architectural risks the builder must avoid

- **Forking the emote path.** Do not build a parallel reaction dispatch.
  The reaction *is* an emote with a scope; the registry is a layer the
  emote send pokes. One optional field + one hook.
- **Keying on `causingCommandId`.** Only `meta.commandId` keys an act.
  `causingCommandId` fans one cause into many acts and would collapse
  distinct utterances.
- **Making a reaction reactable.** A reaction's own frame must never be
  noted reactable (gate in `Soul.ts` on `inReactionTo === undefined`).
  Otherwise infinite regress.
- **`#private` state on the registry.** The registry is a
  call-security-proxied Stuff host; use `private`, not `#private` (the
  mql registry documents exactly this).
- **Summing on the client.** Counts are authoritative absolute totals;
  the client replaces and animates, never sums.
- **Building a provisional renown score.** Emit `ReactionFiredEvent` with
  raw tags only. No aggregator, no count-received metric, no valence
  mapping, no persistence — all explicitly out of scope (the
  Sybil-gameable trap the reputation build exists to avoid).
- **Persisting anything.** The registry is the in-memory authority,
  ring-tied, GC'd. Nothing to Mongo.
- **New emote grammar.** The emote-expression is parsed by the existing
  grammar unchanged. The only addition anywhere is the `inReactionTo`
  scope hook.
- **Rendering the overlay.** This build makes reactions *consumable* by
  the overlay (the scope-keyed delta seam); scene selection / rendering /
  content-forwarding are the livestream build's.
