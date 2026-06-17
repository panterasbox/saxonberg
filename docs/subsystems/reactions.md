# Reactions — act-scoped emote aggregation

The reactions subsystem turns "everyone reacting to one thing" from N
diegetic lines into one batched, attributed counter — without forking
the emote path. This doc is the source of truth for the area; read it
before editing.

## The model

**A reaction is an ordinary emote carrying one extra scope:
`inReactionTo: <commandId>`.** Everything that makes a reaction *feel*
different from a wave — the tally, the toggle, the threshold
aggregation, the renown event — is a thin layer (`ReactionRegistry`)
hung off the emote send. There is **no parallel dispatch**.
`EmoteOptions` gained exactly one optional field, and
`SoulMixin.emote`/`emoteFree` gained one "if scoped, poke the registry"
hook.

The act being reacted to is keyed by **`meta.commandId`** — the nanoid
minted once per dispatch in `CommandGiver` and stamped onto every frame
by `Scene.send`. The **subject** (credited author) of a reaction is the
act's speaker. Two witnesses who saw *different* rendered names for the
same speaker (per-viewer late-bound `Mml` naming) both react → one
aggregate on the shared `commandId`, crediting the one true author. This
cross-viewer aggregation falls out **for free** from keying on
`commandId` + capturing the subject at the producer send site.

### Reactable act-kinds (closed v1 set)

`ReactionApi.REACTABLE_TOPICS` / `ReactionApi.isReactableTopic`:

- `world.speech.say`, `world.speech.whisper`, `world.speech.shout`
- `world.expression.emote`
- `world.chat.message`

A frame is reactable iff **topic ∈ REACTABLE_TOPICS ∧ `commandId`
present ∧ a broadcast audience exists**. A whisper is reactable exactly
like say/shout — it fans a peers frame to in-range overhearers who
share the one `commandId`; the lower `acousticDb` shortens reach, it
does not make the act private.

**A reaction's own frame is never noted reactable** (the gate in
`SoulMixin` on `inReactionTo === undefined`). That stops the regress.

## The one behavioral divergence: volume-gated fan-out suppression

Below the threshold a scoped emote behaves **identically to a normal
emote**: it fans out as a real diegetic line (`"Iffy nods at Vera's
words"`) *and* is tallied. **At/above the threshold the per-emote
fan-out is suppressed** — the emote's `Scene.send()` is skipped — and
the reaction feeds only the batched counter. That is the *entire*
difference. `ReactionRegistry.onScopedEmote` returns
`{ suppressFanOut }` **synchronously** (it reads in-memory counts), and
the mixin returns early before `scene.send()` when suppressing.

`aggregated` is computed *including* the current reaction and is
**sticky** — the threshold-crossing reaction suppresses its own line
(no flicker), and once a phenomenon it stays in counter mode.

## The aggregation contract — server numbers, client drama

`ReactionRegistry.flush()` runs on a **fixed-cadence timer**
(`ScheduleApi.recurring`, `fixed-rate`, default 200 ms, clamped to
[150, 250]) — **NOT** `setImmediate`. The mql-subscription substrate
uses `setImmediate` to collapse *one synchronous burst*; reactions
instead need a *wall-clock window* that collapses an unbounded stream of
independent command dispatches (1000 reactions/sec, each its own
dispatch, never in one tick) into ~5–10 flushes/sec **regardless of
throughput**. Per-tick wire cost is a function of *audience × cadence*,
not reaction count. This is the architectural crux — the scale-bound
test exists to lock it in.

On each tick, for each recipient sink the registry packs every act that
*moved in that sink's view* into one `ReactionDeltaEnvelope` carrying
**tag-grouped absolute counts** (the bounded backbone) **plus a small
capped familiar-biased attributed sample** selected *per-recipient* via
contacts/recognition. The full reactor-set is **pull-only on expand**.

Counts are **absolute, not deltas**. The client *replaces* its bucket
counts on receipt and synthesizes animation from the change; it never
sums.

## The registry

`obj/ReactionRegistry.ts` — singleton `Idea` at `/obj/ReactionRegistry`,
in-memory authority, **nothing persisted** (the Sybil-gameable trap the
reputation build avoids). State uses `private`, not `#private` (the
call-security-proxy rule). Every public method is gated
`FromModule('mud/api/reaction#ReactionApi')` + `SelfOnly`; the thin
`api/reaction.ts` `ReactionApi` facade is the only legitimate caller.
Mirrors the `MqlSubscriptionApi ↔ MqlSubscriptionRegistry` split, minus
the HMR logic-singleton indirection (registry state survives an Api
reload because it lives on the Stuff).

Key state: `acts: Map<commandId, ActRecord>` (`{ subjectId, scope,
createdAt, reactions: Map<reactorId, ReactorReaction>, aggregated }`),
`dirty: Set<commandId>`, `scopeSinks`, `interactiveSinks`,
`lastBySubject` (for `--to`), the per-Interactive gutter ring
(`frameId → commandId`, for `--msg`), and the flush `ScheduleHandle`.

- **`onScopedEmote`** (sync): tally/toggle on `(reactorId, emote)` — a
  repeat flips `present = false` (no renown on un-reacting); a new
  reaction flips on and fires `ReactionFiredEvent`. Recomputes
  `aggregated`. Returns `{ suppressFanOut }`.
- **`noteReactableAct`** (idempotent on `commandId`): captures
  `subjectId` + `scope` the first time a producer composes a reactable
  frame. **Never keys on `causingCommandId`** (that fans one cause into
  many acts).
- **`flush`**: the fixed-cadence sink-agnostic broadcaster (above).
- **`handleExpand`**: the full recognition-named reactor set on demand.

### Scopes

`location:<containerId>` (the co-present circle) or
`channel:<groupRef>` (the channel audience).
`ReactionApi.locationScopeFor(stuff)` computes the in-room scope
(Containable → environment; pure-Container → self).

A normal player's `InteractiveReactionSink` sees a `location:` scope by
**current container match** (handles walk-in/walk-out for free) and a
`channel:` scope once the holder has engaged it. The read-only
`service:broadcast` principal — which has **no Interactive** — is
reached not by a sink but by the **`ReactionScopeDeltaEvent`** the flush
fires per moved scope; `BroadcastFeed` taps it the same way it taps
`Events.StreamStateChanged`. This keeps the registry sink-agnostic.

### GC

A single TTL pass inside `flush()` drops acts older than the TTL
(default 5 min), approximating the chat ring's 200-cap conceptual
bound. Room speech/emotes have no persistent ring, so a TTL is the
correct GC for them. No per-ring eviction listener in v1.

## The `react` verb

`cmd/social/react.yaml` + `obj/command/social/ReactController.ts`,
contributed via `SoulMixin.commandContributions.self` (reacting
dispatches an emote, so it requires Soul).

```
react [--to <person>] [--msg <#>] <emote-expression>
```

- selector-less (`re ;smile`) → the most recent act delivered in view
  (the **frictionless primary path** — low friction is load-bearing for
  adoption);
- `--to <person>` (parser-typed `object`) → that subject's most-recent
  reactable act (`lastReactableActBy`);
- `--msg <#>` → a specific gutter number → `commandId` via the
  per-Interactive ring (`resolveGutter`).

The act-selector is parser-typed — the controller never string-sniffs.
The emote-expression is the sole greedy positional, dispatched opaquely
through the existing emote path (`SoulApi.resolve` →
`EmoteGrammarRunner.bind`, or `emoteFree` on a free-form miss) with
`inReactionTo` set. The controller validates reactability + audience
membership, then goes through the emote path — it does **not** touch the
registry to mutate tallies. The `re` alias completes the cheap surface.

### Gutter → commandId (server-side)

The gutter number the client shows is the per-Interactive `meta.frameId`
(`Interactive.nextFrameId`). The durable act key is `meta.commandId`.
`Application.sendMessageToInteractive` records `(frameId → commandId)`
into the registry's bounded ring whenever a reactable-act frame is
delivered (and registers the player's sink). `react --msg <n>` resolves
through that ring; a client-UI click emits the same gutter number.
**Input never carries a client-supplied `commandId`.**

## The renown event

`lib/events/ReactionFiredEvent.ts` — fired on a **flip-on** only,
carrying raw, **uninterpreted** emote + tags (no valence/polarity, no
score), `scope`, and a `selfReaction` flag. **No consumer** is built:
the reputation build is the trap the non-goals warn against. The event
is only the typed substrate a later aggregator subscribes to.

## Wire envelopes (`@saxonberg/types`)

- `ReactionDeltaEnvelope` (`reaction-delta`) — fixed-cadence, one per
  recipient per tick; `acts: ReactionActState[]` (each
  `{ commandId, subjectId, scope, buckets, sample, total, aggregated }`,
  counts absolute).
- `ReactionExpandMessage` (`reaction-expand`) inbound /
  `ReactionExpandResultEnvelope` (`reaction-expand-result`) — the full
  reactor set on demand.
- `MessageFrame.meta.inReactionTo` — stamped on a reaction's own frame
  for client render-correlation.

## Client

`store/index.ts` `reactions: Record<commandId, ReactionActState>` slice
+ `applyReactionDelta` (**replace, never sum**) /
`applyReactionExpandResult`; `store/reactionActions.ts` wires the
envelope handlers and the outbound ops (`react --msg <#>` /
`reaction-expand`). The `Frame` carries `commandId` / `inReactionTo` for
render-correlation only. The always-on per-message indicator is
client-derived for free by grouping the reaction prose frames (each
carries `meta.inReactionTo`); above threshold the widget switches to the
delta-fed counter + tag buckets + named sample, with expand for the full
set.

### Per-user controls

`SoulMixin.settings` — `social.react.intensity`, `.muteChannels`,
`.alwaysAggregate`, `.tagGroup`, `.collapseThreshold`. Read client-side
from the settings sync and applied to the rendered widget. In v1 these
are **client-render preferences**: the server always emits both the
below-threshold line and the above-threshold delta; honoring
`muteChannels`/`alwaysAggregate` server-side is a later refinement.

## What this build deliberately is NOT

- No parallel reaction dispatch — the reaction *is* an emote with a
  scope.
- No keying on `causingCommandId`.
- No reaction-of-a-reaction (the regress gate).
- No client-side summing (counts are authoritative).
- No renown score / aggregator / persistence (raw event only).
- No overlay rendering — this build makes reactions *consumable* by the
  overlay (the scope-keyed delta seam); scene selection / rendering are
  the livestream build's (see [livestream.md](./livestream.md)).
