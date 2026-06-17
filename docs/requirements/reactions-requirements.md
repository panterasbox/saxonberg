# Reactions — requirements

**A reaction is an ordinary emote, scoped to a specific prior act — an
emote with teeth.** A plain emote is social confetti: seen, gone, costs
nothing. A reaction is the same gesture aimed at *something an actor just
said or did*, and because it's tied to that act it can be **counted,
attributed, and — eventually — folded into the target's reputation**.
That consequence is the whole reason a player reaches for it instead of
just waving. This build delivers the gesture, the attribution, and the
aggregation that keeps it from drowning a busy channel; it emits the
reputation signal but does not yet consume it.

The reaction reuses the [emote](../subsystems/emotes.md) machinery
*wholesale* — vocabulary, grammar, targeting, customization, rendering.
The only thing added is an **`inReactionTo: <commandId>`** scope: the
emote knows which act it answers. Everything reaction-specific (the tally,
the toggle, the scale aggregation, the renown event) hangs off that scope;
the emote itself is untouched. There is exactly **one** behavioral
divergence from a normal emote, and it is volume-gated (see below).

This is the next brick on the **reputation / cooperative** track. The
[regard belief facet](../subsystems/belief.md) shipped the *private,
per-viewer attitude* leg; reactions are the *public, momentary signal*
leg — the "afferent sensor layer" the
[cooperative slate](../slates/deferred-rpg/cooperative-slate.md) names as
the substrate under trust-weighted feedback.

Seeded by [reactions-slate.md](../slates/tails/reactions-slate.md). The
build is **completionist over the acts the engine emits today** — chat
posts, room speech (`say`/`whisper`/`shout`), and emotes are all
reactable in one cycle, with the full client surface (prose at low volume;
counter + train at scale; expand, tag-grouping, palette, controls). Not
split into waves.

## Goals

- **A reaction is an act-scoped emote.** It dispatches through the emote
  path with an added `inReactionTo: <commandId>` scope; the emote's
  vocabulary, grammar, targeting, customization, and rendering are
  inherited unchanged.
- **The one divergence is scale.** Below a volume threshold, an
  act-scoped emote behaves exactly like a normal emote (it fans out as a
  diegetic line) and is *also* tallied. **At/above the threshold its
  per-emote fan-out is suppressed** and it feeds a batched counter
  instead — this is what makes "hundreds reacting on one channel"
  survivable.
- **Reactions key on the existing `commandId` — no new identifier.**
  Every frame already carries `meta.commandId` (nanoid, minted once per
  dispatch, shared across the whole fan-out, 1:1 with one utterance,
  `CommandGiver.ts:497` → `Scene.ts:234`). It is the act key; the
  **subject** is the existing `payload.speaker`. The message fan-out core
  is left alone.
- **Completionist over current act-kinds.** `say`/`whisper`/`shout`,
  emotes, and chat posts are all reactable this cycle. Combat deeds and
  broadcast moments are *absent sources* (those subsystems emit no acts
  yet), not deferred reaction work; they opt in for free when built.
- **Renown is the motive, and the linkage is transparent.** Each applied
  reaction emits a renown-ready `ReactionFiredEvent`. The *consumer* is
  deferred, but the mechanic's consequence is **legible to players** —
  reactions are public and attributed — because understanding that "this
  counts" is what drives players to use it.
- **The architecture is bounded by audience × cadence, not reaction
  throughput.** 1,000 reactions/sec on a 300-user channel costs the same
  on the wire as 100/sec.
- **Reacting is as low-friction as a bare emote.** Load-bearing, not
  polish: if `react` is clunkier than typing `;smile iffy`, dramatic
  high-volume responses route to bare emotes and forfeit *both*
  aggregation (the channel floods anyway) *and* the renown signal (no
  event fires). So the implicit "react to what was just said" path must
  be at least as cheap as the bare emote — `react ;emote` with no
  selector, a short verb alias, and the one-key palette.
- **The full client surface is observable** — prose events, the animated
  counter/train, attributed reactors, expand-to-see-who, tag-grouped
  buckets, a quick-react palette, per-user controls.
- **The substrate is overlay-ready** — the aggregate/delta stream is
  consumable by a separate read-only bus client (the broadcast overlay
  app) subscribing by audience-scope; render deferred to the livestream
  build.
- **Runtime reaction state is ephemeral**, tied to the act's presence in
  the message ring; GC'd when the act ages out. Nothing in Mongo.

## Non-goals

- **Renown / reputation computation.** No aggregator, no trust-weighting,
  no per-circle math, and **no provisional score.** A naive "reactions
  received" count is exactly the Sybil-gameable metric the
  [reputation](../slates/builds/reputation-slate.md) /
  [cooperative](../slates/deferred-rpg/cooperative-slate.md) slates exist
  to avoid; shipping one would entrench the wrong thing. We emit the
  event; the weighted, Sybil-resistant consumer is the (next) reputation
  build.
- **Anything new on the emote API beyond the scope hook.** Reactions
  inherit whatever emotes support (including custom text); we do **not**
  design a separate reaction grammar, dispatch, or annotation system.
- **Reactions feeding regard.** A reaction is act-bound and momentary;
  [regard](../subsystems/belief.md) is person-bound and standing. Wiring
  one to the other is the aggregator's job, deferred.
- **Reactions on non-acts.** Narration, system notices, prompts, command
  echoes, and any single-viewer-private frame are never reactable.
- **Combat / broadcast act-kinds.** Not deferred *reactions* — the
  *sources don't exist yet*. Each inherits the substrate for free when it
  begins emitting acts.
- **Machine-generated aggregate prose.** The threshold flips between
  individual emote lines and a counter; no NL crowd-summary tier.
- **Room-readability / repetition control.** The threshold is a
  *wire-scale* safety valve (the 300-user channel), **per-context**
  tunable — not a room-readability dial. A room-scale pile-on (5–8 people
  reacting at once) renders in full **by design**: that drama is the
  point, not spam to collapse. Per-user collapse of repetitive lines is
  the console-filtering domain, orthogonal to this build.
- **Collapsing emote-floods into reactions.** The future bridge — at chat
  scale, folding a flood of the same bare emote at one target into a
  reaction aggregate (salvaging the intent, not merely filtering it) — is
  a named direction in
  [reactions-slate.md](../slates/tails/reactions-slate.md), deferred. It
  needs an emote-convergence detector atop this build's reaction
  substrate.
- **Pre-interpreted valence / polarity.** The event carries the raw emote
  + `tags`; mapping to a signed/weighted renown contribution is the
  aggregator's job.
- **The broadcast overlay rendering of reactions.** This build makes
  reactions consumable by the overlay; rendering, scene selection, and
  content-forwarding are the livestream build's. See
  [livestream.md](../subsystems/livestream.md).
- **The analytics / data-warehouse ETL**, **persistent reaction
  history**, **threads** — all out (per slate / chat's own deferral).
- **Extracting a shared batched-delta scheduler** — reactions build a
  parallel batched loop (the mql-subscription pattern), not a refactor of
  it.

## Surface decisions

### A reaction is an act-scoped emote — the model

`react` is sugar: `react <act-selector> <emote-expression>`. The
act-selector picks the prior act; the emote-expression is a **100% normal
emote**, parsed by the existing emote grammar, and dispatched through the
existing emote path with `inReactionTo: <commandId>` attached. The
reaction-specific behavior (tally, toggle, scale aggregation, renown
event) is a thin layer the emote dispatch pokes **only when the scope is
present**; a scope-less emote is unaffected. So the emote API gains
essentially one optional field plus a "if scoped, notify the registry
(which may suppress my fan-out)" hook — nothing else is reconciled.

The act is a **scope, not a target.** The emote keeps its own grammar and
its own optional target. So `react 113 ;wave bob` is well-defined: *wave
at bob, in response to act 113* — two orthogonal vectors (emote-target =
bob; act-scope = 113), no collision. Custom text rides exactly as it does
on any emote; there is no separate annotation concept.

### Only the explicit `react` makes a reaction

`wave iffy` is a **plain emote at a person** (emote grammar, no act
scope) — it is *never* a reaction. There is no way for the parser to
distinguish bare `<emote> <person>` "emote at person" from "react to
person's last act"; they are the same shape. So reactions come **only**
from the explicit `react` verb (or a distinct, unambiguous scope syntax).
A person may be named *as `react`'s act-selector* (`react iffy ;wave` →
iffy's most-recent reactable act) — unambiguous because `react` is
explicit — but bare/implicit emote forms are not reaction forms.

### The act key is the existing `commandId`

Per-recipient frame ids are useless as an act key (both `Scene.send`
`Scene.ts:241` and `ChannelCatalogue` `ChannelCatalogue.ts:271` mint one
per recipient). `meta.commandId` is the stable cross-viewer key: minted
once per dispatch (`CommandGiver.ts:497`), stamped on every frame of the
fan-out, shared across all recipients, 1:1 with one utterance, present on
NPC command-dispatches too. The **subject** is `payload.speaker` — a
durable `StuffRef`, viewer-blind, pointing at the true actor even under
disguise/non-recognition. So two witnesses who saw *different* rendered
names (per-viewer late-bound `Mml` naming) react → one aggregate keyed on
the shared `commandId`, crediting the one true author.

**Rule: an act is reactable iff it has a `commandId`.** Acts emitted
outside a command dispatch carry none and aren't reactable in v1; we do
**not** fall back to `causingCommandId` (one cause can fan into many later
acts, which would collapse them). Forward-constraint: future autonomous
NPC speech routes through `executeCommand` to earn reactability.

### Reactability is derived, not a new stamp

An act-frame is reactable iff its topic is a known act-kind (speech /
emote / chat) **and** it has a `commandId` **and** its audience is a
broadcast (not single-viewer). Subject = `payload.speaker`;
audience-scope (a channel `GroupRef` for chat; the **location** for room
speech — a circle of co-present witnesses) is captured by the registry on
first reaction. **Eligibility to react = membership in the act's
audience.** The only messaging-side work is settling which topics count as
act-kinds — a classification, not new fan-out threading.

### Prose-first, two-tier render

A single primary threshold (tunable, sensible default, bounded range,
server default via [`AppSettings`](../subsystems/app-settings.md)) flips
an act between:

- **Below → individual emote lines.** The act-scoped emote fans out
  normally, a real diegetic line via the emote/[`ProseApi`](../subsystems/prose.md)
  render (*"Iffy nods at Vera's words"*), and is tallied. Room reactions
  live here and need no broadcaster.
- **At/above → counter + train.** Per-emote fan-out is suppressed; the
  act flips to the aggregate. No generated crowd-prose.

A reaction is **never itself reactable** (its frame isn't stamped), which
stops any regress.

### Aggregation — server aggregates numbers, client aggregates drama

**Server (the count truth, bounds the wire).** On a **fixed-cadence tick
(~150–250 ms — a timer, not `setImmediate`; the window is what collapses
a burst into ~10 flushes regardless of volume)**, the `ReactionRegistry`
takes the acts that changed, and for each recipient packs all the acts
that moved *in their view* into one envelope. The envelope carries the
**tag-grouped counts** (the bounded backbone) **plus a small, capped,
familiar-biased sample of attributed reactions** — `(reactor, emote,
inherited custom text)` — selected *per-recipient* toward the people that
viewer recognizes / has in [contacts](../subsystems/contacts.md), rendered
via `RecognitionApi.describe`. A stranger stays in the count, unnamed
(correct for the anonymity-by-default world). The full reactor-set is
pull-only, **on expand**.

**Client (the experience).** It does not sum — counts are authoritative.
It applies deltas, **synthesizes the train** (animate the rising counter,
a burst, the sampled known names) from sparse deltas, renders tag buckets,
applies user controls (intensity, mute, grouping, collapse threshold),
and echoes your own toggle optimistically.

### Toggle, attribution, customization

Each `(reactor, act, emote)` is a toggle on the *recorded tally* — react
again to remove (count drops). Below threshold the emote already
*rendered* once (you can't un-say a scrollback line); toggle governs the
tally, not the rendered line. Attribution: known reactors surface live in
the sample; everyone on expand. Customization: whatever the emote already
supports, surfaced in the prose line (low vol), in the sampled entries
(scale), and on expand.

### The renown-ready event (shape now, no consumer)

Every applied reaction emits `ReactionFiredEvent` on `EventApi`:
**reactor**, **subject** (`payload.speaker.stuffId`), **raw signal**
(emote + `tags`, uninterpreted), **circle-context** (the act's
audience-scope — channel `GroupRef` or location). Self-reactions
(`reactor == subject`) are emitted but identifiable. No aggregator,
persistence, or weighting is built — the event is the seam, and shaping it
now is near-free.

### What persists (and what doesn't) in this build

**Nothing reaction-related is written to Mongo.** The `ReactionRegistry`
is the **in-memory authority** for live reaction state (not a cache — no
DB sits behind it), keyed by `commandId`, retained while the act is in the
ring, GC'd when it ages out. The `ReactionFiredEvent` is emitted and
**durable-*ready*** but consumed by nothing this cycle. So reactions bite
*socially* (public, attributed, in the moment) but not yet *durably*; the
durable bite arrives with the reputation build. (Persistence would also
be pointless here — the messages reactions hang off of aren't persisted
either; the durable record of a streamed reaction is the video archive,
via the overlay.)

### Surfaces: verb, registry, controls

`ReactionApi` (`api/reaction.ts`) is the thin gated facade; runtime state
+ the batched loop live in a `ReactionRegistry` singleton (`obj/`, the
`MqlSubscriptionRegistry` precedent), mutators `FromModule`-gated. The
`react` verb is a YAML view (`mud/cmd/social/react.yaml`) + controller
(`obj/command/social/ReactController.ts`); a quick-react palette
(frequent/recent + full `SoulApi` catalog) and per-user controls on the
[`EnvironmentMixin`](../subsystems/shell-environment.md) keyspace
(intensity, mute-on-channel, always-aggregate, tag-group, collapse).

### Client scope — behaviors in, visuals to implementation

The client is **in scope at full UX**, but the requirements fix
*behavior and integration points*, not visual design.

**In (behavioral contract — must be observable):** the local
delta-applying view-model; the counter that attaches to a message and
animates from deltas (the train / burst); the attributed-sample display
(recognized reactors surface by name); expand-to-see-who; tag-grouped
buckets; the quick-react palette; the per-user controls.

**Inherited (free):** below-threshold reactions render as ordinary emote
lines through existing [message rendering](../subsystems/message-rendering.md)
— no new path.

**Out (implementation, not requirements):** the exact visual treatment —
animation curves, the burst look, layout/placement, theming, keybindings.
No mockup; the feel is iterated live against the behavioral contract.

**Integration points:** rides the existing transcript/console
([client-shell](../subsystems/client-shell.md), the
[client-cockpit](../slates/tails/client-cockpit-slate.md) /
[console-filtering](../slates/tails/console-filtering-slate.md) slates);
the counter attaches to a transcript message; gutter-ids come from the
existing console; the palette lives in the input area; per-user controls
in the `EnvironmentMixin` keyspace.

## Constraints

- **Reuse the emote path; don't fork it.** The emote dispatch gains an
  optional `inReactionTo` scope + a registry hook; the reaction-specific
  tally/toggle/scale/renown live in `ReactionRegistry`, not a parallel
  dispatch. No de-grammaring, no separate annotation system.
- **Minimal messaging-core change.** No id minted (key on
  `meta.commandId`); subject is `payload.speaker`. The only messaging work
  is classifying which **topics** are reactable act-kinds (touches
  [messaging.md](../subsystems/messaging.md) lightly). Don't disturb the
  late-bound per-viewer render.
- **Module taxonomy / `callable == visible == cared-about`.**
  `ReactionApi` ends with `SecurityApi.decorateApiClass`; internals
  `@internal`. No free-floating scheduler/helper — the batched loop is a
  method on the registry.
- **Controllers return `void`** — `react` reports via `ctx.note(...)`;
  feedback is the emote line (low vol) or the batched delta (high vol).
  See [response-envelope.md](../subsystems/response-envelope.md).
- **Fixed-cadence, sink-agnostic broadcaster.** Coalesce per-recipient
  per-tick; per-tick wire count scales with *audience*, not reactions.
  Emits to any bus connection including the non-`Interactive` read-only
  broadcast principal. Aggregates keyed by `commandId`, indexed by
  audience-scope (so an overlay can subscribe by scope).
- **Ephemerality.** In-memory, keyed by `commandId`, ring-tied; recent
  acts keep the full reactor-set, aged acts GC. No Mongo.
- **Identity durability.** Event reactor/subject are durable identifiers.
- **Settings.** Threshold/cadence defaults via `AppSettings`; per-user
  controls via the `EnvironmentMixin` keyspace.

## Acceptance criteria

- **Cross-viewer act aggregation:** two witnesses whose frames rendered
  the speaker's name *differently* both `react` → one aggregate on the
  shared `meta.commandId`, crediting the one true author.
- **Reaction = act-scoped emote:** `react 113 ;wave` dispatches the wave
  emote with `inReactionTo`; `react 113 ;wave bob` waves at bob scoped to
  113 (both vectors honored); `wave iffy` is a plain emote, not recorded
  against any act.
- **No-command acts aren't reactable:** an act-kind frame lacking a
  `commandId` is rejected; the key is never `causingCommandId`.
- **Completionist coverage:** say/whisper/shout, an emote, and a chat post
  are each reactable; a non-act frame is rejected with a clear note.
- **Toggle:** re-reacting the same emote removes; count drops.
- **Below threshold:** the reaction is a diegetic emote line (not a
  counter), and is itself not reactable.
- **Above threshold:** per-emote fan-out is suppressed; deltas carry
  tag-grouped counts + a familiar-biased attributed sample; the full
  reactor-set is pull-only on expand.
- **Scale bound (headline):** 1,000 reactions/sec on a 300-user channel →
  per-tick wire-message count bounded by audience × cadence, provably
  independent of reaction throughput.
- **Attribution:** a reactor the viewer recognizes / has in contacts
  surfaces by name in the live sample; an unrecognized reactor stays in
  the count.
- **Train + controls:** the client renders a rising counter/burst from
  deltas; per-user intensity, mute, tag-group, and collapse are each
  observable.
- **Renown event:** each applied reaction emits `ReactionFiredEvent` with
  reactor + subject + raw emote/tags + circle-context, all durable; a test
  asserts the payload shape (no consumer asserted).
- **Overlay-ready:** a non-`Interactive` read-only connection can be fed a
  scope's reaction deltas via a scope-keyed subscription; rendering not
  asserted.
- **GC:** when an act ages out of the ring, its reaction state is gone.
- **Docs:** `docs/subsystems/reactions.md` exists; the `react` verb is
  discoverable, and its help text makes the act-scope + public/attributed
  nature legible (transparency-drives-adoption).

## Cross-references

- **Seeding slate:** [reactions-slate.md](../slates/tails/reactions-slate.md)
- **The emote substrate reactions extend:**
  [emotes.md](../subsystems/emotes.md) (`SoulApi`, grammar, `Emote.tags`)
- **Message substrate:** [messaging.md](../subsystems/messaging.md)
  (`Scene`/`ChannelCatalogue`, `meta.commandId`, `payload.speaker`,
  late-bound per-viewer `Mml`), [chat.md](../subsystems/chat.md) (ring,
  ephemerality), [belief.md](../subsystems/belief.md)
  (`RecognitionApi.describe`; regard — the standing sibling),
  [contacts.md](../subsystems/contacts.md) (the familiar-bias source)
- **Prose:** [prose.md](../subsystems/prose.md)
- **Scale precedent / wire / settings:**
  [mql-subscription.md](../subsystems/mql-subscription.md),
  [response-envelope.md](../subsystems/response-envelope.md),
  [app-settings.md](../subsystems/app-settings.md),
  [shell-environment.md](../subsystems/shell-environment.md)
- **Overlay consumer (deferred):** [livestream.md](../subsystems/livestream.md)
- **Downstream (deferred consumers):**
  [reputation-slate.md](../slates/builds/reputation-slate.md),
  [cooperative-slate.md](../slates/deferred-rpg/cooperative-slate.md),
  [social-graph-slate.md](../slates/builds/social-graph-slate.md)
