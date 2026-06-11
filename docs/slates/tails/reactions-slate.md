# Reactions & aggregation slate (working doc)

> **Status: architecture set, forks resolved.** Lightweight reactions
> (attach an emote to a message) built to survive **hundreds of
> concurrent users on a channel**. A reaction is just an emote aimed at a
> message; the work is the *aggregation/scale layer* over it.

Working slate for **reactions** — `react 113 ;agree` and the aggregation
that keeps it from drowning a busy channel. The thing the emote and chat
slates kept carving out (they reserve the hooks: emote `tags` + a shared
message-id). It's a **generic message affordance** — anything with a
shared message-id is reactable (a `say`, a chat post, a combat event, a
system notice), not chat-only.

The load-bearing decisions:

1. **A reaction is an emote aimed at a message.** Reuse the `SoulApi`
   vocabulary + the ESP framing; the *target* is a message-id instead of
   a person. Diegetically (liberal diegesis): a murmur of agreement at
   what was just said. No new expression system — reactions = emote-at-a-
   message **+** the aggregation/scale layer below.

2. **Aggregate server-side; broadcast batched *deltas*, never individual
   reactions.** This is the whole scale story (next section).

3. **Toggle-once.** Each `(reactor, message, emote)` is a toggle — you're
   in the bucket or not; react again to remove (Discord semantics). Caps
   reactions-per-message, kills same-emote spam; the "train" feeling
   comes from *many distinct users'* deltas, not one person spamming.

4. **The fun is client-rendered from deltas, not fan-out.** The Twitch-
   spam joy is a *visual treatment of a rising counter* (animate +47, a
   burst, a sampled name or two), synthesized client-side from the
   aggregate delta — impact without the flood.

See also:

- [emotes-slate.md](../tails/emotes-slate.md) — the reaction vocabulary
  (`SoulApi`) + the reserved hooks: aggregation `tags` and the shared
  message-id. A reaction *is* an emote with a message target.
- [chat-slate.md](../tails/chat-slate.md) — the at-scale consumer; the gutter
  message-id (must be **shared/canonical**, see below); the
  ephemeral/ring lifetime reactions share.
- [docs/slates/mql-subscription-slate.md](../tails/mql-subscription-slate.md) /
  [docs/subsystems/mql-subscription.md](../../subsystems/mql-subscription.md)
  — the **`setImmediate`-batched diff scheduler** reactions reuse:
  reactions are another batched-delta broadcaster.
- [docs/subsystems/messaging.md](../../subsystems/messaging.md) — the
  message substrate reactions attach to; **`MudlogApi`/topics is the
  event-stream tap** for the future analytics warehouse.
- [client-cockpit-slate.md](../tails/client-cockpit-slate.md) /
  [console-filtering-slate.md](../tails/console-filtering-slate.md) — rendering:
  the gutter ids, collapse/expand, the train animation.
- [docs/design-philosophy.md](../../design-philosophy.md) — liberal diegesis
  (reacting-to-a-message is in-fiction); the "what loss is acceptable"
  user-control stance.

---

## Principle

1. **Reaction = emote-at-a-message** (reuse, don't reinvent).
2. **Scale by aggregation, not fan-out** — batched delta broadcast,
   bounded by audience × cadence, independent of reaction throughput.
3. **Aggregate canonical, detail on demand** — counts on the wire; who +
   customization on expand.
4. **Preserve the fun without the flood** — client renders impact from
   deltas; user controls intensity and what loss is acceptable.

---

## The scale architecture

The fan-out math is the killer. 300 tuned users; a hot message draws 100
reactions in 2s:

- **Naive** (each react → each user): 100 × 300 = **30,000 messages.**
  Dead.
- **Batched aggregate-delta**: the server keeps a per-message aggregate
  and, on a fixed cadence (~150–250 ms), pushes the *changed counts*,
  **coalesced per-user** across all messages that moved in the window.
  ≈ 300 × ~10 ticks = **~3,000 tiny messages — bounded by audience ×
  cadence, independent of reaction volume.** 1,000 reactions/sec costs
  the same as 100.

Reactions are just another consumer of the **batched-diff scheduler**
(mql-subscription precedent): collect deltas in a window, coalesce,
broadcast once per tick.

### Aggregate canonical; detail eager-at-low / lazy-at-high

The wire default is **counts only** — bounded at "#distinct emotes (or
tags) on this message," whatever the reactor count. *Who* reacted +
customization is fetched **on expand** (a pull).

The adaptivity: below the **aggregation threshold** (fork #2 — *tunable,
sensible default, clamped to a bounded range*; per-channel/server config)
a message is low-volume, so detail is cheap and the server pushes it
eagerly → **full fidelity** ("Iffy agrees," customizations and all).
Above the threshold the message flips to **scale-mode**: counts-only
push, tag-grouped display, sampled train, detail pull-only. One model,
eager-vs-lazy by volume — which is also the doc's "let the user choose
what loss is acceptable," made automatic.

### The train, client-side

No individual reaction events on the wire. The client **renders impact
from the delta**: animate the counter, a burst, a throttled sample of
names. The train is a rendering of a rising number, not 100 lines.
Intensity is a per-user setting (off / subtle / party-mode).

### Tag-grouping shrinks the buckets

The emote `tags` pay off: default display **groups by tag**
(`agree`/`ok`/`nod` → one 👍), so a message shows ~3 buckets not 15 —
fewer wire entries *and* less clutter. Expandable to per-emote; per-user
toggle.

---

## Load-bearing details

- **Shared canonical message-id (required plumbing).** `react 113` must
  mean the same message for all 300 viewers — so reactions need a
  **server-assigned per-channel/context id**, not the per-connection
  `nextFrameId`. This is the real "gutter id" chat/emote pointed at.
- **Live broadcast scoped to the recent/in-view window.** Don't push
  reaction-deltas for messages scrolled away or aged out of the ring;
  those are pull-on-scroll. Reaction state lives with the message ring:
  recent messages keep the full reactor-set (toggle + expand), aged ones
  keep counts-only or GC with the ring.
- **Ephemeral runtime; warehouse the *stream*, not the state (fork #3).**
  Runtime reaction state is in-memory, best-effort, tied to the ring —
  not persisted. The future analytics need ("data-warehouse this once we
  go to market") is satisfied by tapping the **reaction event stream**
  (through `MudlogApi`/topics), *not* by persisting runtime state. Keep
  the two separate: ephemeral live state vs an analytics ETL over the
  event stream. The warehouse pipeline itself is a cross-cutting,
  post-launch concern (its own future work) — reactions just emit clean
  events for it to tap.

---

## Input & controls

- **`react <msgid> ;<emote>`** — keyboard-first (the doc was adamant: no
  hands off the keyboard), **toggle** (react again to remove), optional
  click-to-react. Optional customization (lost in aggregate, surfaced on
  expand).
- **Palette (fork #4): familiar Discord/Slack patterns** — a small
  **quick-react palette** (frequent/recent) surfaced for ease, with
  access to the **full `SoulApi` catalog** behind it. Recents, hover-to-
  react, the conventions people already know.
- **Per-user controls** (the doc's core point): auto-collapse threshold,
  always-aggregate, tag-group on/off, train intensity, mute-reactions-on-
  this-channel.

---

## Worked scenarios

- **Quiet channel (below threshold):** 4 people; `react 12 ;laugh` →
  detail pushed eagerly; everyone sees "Iffy laughs at that" — full
  fidelity, cheap.
- **Hot channel (above threshold):** 300 people; a message draws 100
  `agree` in 2s → server pushes count deltas every ~200ms; clients
  animate "👍 47 → 94"; the train is a burst, not 100 lines; expand to
  see who (pull).
- **Toggle:** you `react 12 ;agree` then `react 12 ;agree` again → removed
  from the bucket; count drops.
- **Tag-group:** a message with `agree`/`ok`/`nod` shows one 👍 bucket of
  31; expand → the per-emote breakdown.

---

## What this stresses

- **emotes** — reactions consume the `SoulApi` vocabulary + the `tags`
  (grouping) + the shared message-id hook.
- **chat / messaging** — the shared canonical message-id; the ring-tied
  ephemeral lifetime; reactions as a generic affordance over any
  message.
- **the batched-diff scheduler** (mql-subscription) — reused as the
  broadcast cadence engine.
- **client / cockpit** — collapse/expand, the train animation, the
  quick-react palette, per-user controls.
- **MudlogApi / analytics** — the event-stream tap for the future
  warehouse (cross-cutting, post-launch).

---

## Open questions

Forks resolved; these remain:

1. **Threshold shape** — one primary "aggregation kicks in" threshold
   driving all scale-mode behaviors (counts-only / tag-group / sampled
   train), or separate thresholds each? *Lean one primary, tunable with a
   bounded range; split later if needed.*
2. **Reactable scope in v1** — chat only, or any message with a shared id
   (say/combat/system) from the start? *Lean: build generic, light up
   chat first.*
3. **Cadence value** — the ~150–250 ms tick; tune empirically.
4. **Expand-detail retention** — how far back the reactor-set is kept for
   pull (tied to ring depth).

---

## Build order

**Wave 1 — the core at scale.** The shared canonical message-id;
reaction state per message (toggle-once aggregate + reactor-set for
recent messages); the batched aggregate-delta broadcaster (reusing the
scheduler); `react <msgid> ;<emote>`; counts-only wire + the aggregation
threshold (default + bounds); ring-tied ephemeral lifetime.

**Wave 2 — fidelity + fun.** Eager-detail below threshold; expand (pull
who + customization); the client train animation; tag-grouped display;
the quick-react palette + per-user controls.

**Wave 3 — reach + analytics.** Generic reactability beyond chat
(say/combat/system); the reaction event-stream emission for the future
warehouse tap.

---

## What this slate does NOT cover

- **Threads / sub-conversations** — explicitly out. Reactions are
  attach-emote-to-message (a counter); threading is heavier, very
  chat-app-y, and a poor fit for an immersive MUD. Not bundled here.
- **The emote vocabulary/grammar** → emotes slate. Reactions consume it.
- **The chat channel model** → chat slate. Reactions ride its messages.
- **The analytics/data-warehouse pipeline** — a cross-cutting,
  post-launch concern; reactions just emit clean events to tap.
- **The batched-diff scheduler internals** → mql-subscription; reused.

---

## Once shaped into formal requirements

This slate boils down to:

- **Reaction = emote-at-a-message** over `SoulApi`; the shared canonical
  message-id; toggle-once `(reactor, message, emote)` state.
- The **batched aggregate-delta broadcaster** (reused scheduler);
  counts-only wire; the **aggregation threshold** (tunable, default,
  bounded) flipping eager-detail ↔ scale-mode.
- **Tag-grouped** display; **expand** (pull who + customization);
  **client-rendered train**; per-user controls (collapse/group/intensity/
  mute).
- **Ephemeral runtime** state (ring-tied); the **event-stream tap** for
  the future warehouse (state and analytics kept separate).
- The **familiar quick-palette + full-catalog** input (Discord/Slack
  patterns), keyboard-first, toggle.
- Generic reactability over any shared-message-id.
- Tests: 1,000 reactions/sec on a 300-user channel stays bounded by
  audience × cadence; toggle removes; below-threshold pushes full
  fidelity; above-threshold pushes counts-only + pull-expand; tag-group
  collapses/expands; reaction state GCs with the ring.

Threads, the analytics pipeline, and reactability-everywhere beyond
chat-first wait for their own waves.
