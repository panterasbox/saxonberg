# Reactions & aggregation slate (working doc)

> **Status:** PARTIAL — Waves 1–2 shipped: act-scoped emote, the
> fixed-cadence aggregate-delta broadcaster, threshold flip, tag-grouped
> chips, expand, the quick-react palette, the renown event →
> [reactions.md](../../subsystems/reactions.md)
> **Left:** the analytics event-stream tap (Wave 3) · the emote-flood
> salvage (Future direction, below) · reactability for act-kinds beyond
> the shipped `speech.vocal`/`act.emote`/`speech.channel`/`act.combat`
> set (e.g. system notices)
> **Size:** a tail

Working slate for **reactions** — `react 113 ;agree` and the aggregation
that keeps it from drowning a busy channel. The thing the emote and chat
slates kept carving out (they reserve the hooks: emote `tags` + a shared
message-id). It's a **generic message affordance** — anything with a
shared message-id is reactable (a `say`, a chat post, a combat event, a
system notice), not chat-only.

See also:

- [emotes-slate.md](../builds/emotes-slate.md) — the reaction vocabulary
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

## Load-bearing details

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

## Build order

**Wave 3 — reach + analytics.** Generic reactability beyond chat
(say/combat/system); the reaction event-stream emission for the future
warehouse tap.

---

## Future direction — salvage emote-floods into reactions

A bridge between the bare-emote path and the reaction substrate, surfaced
while drafting the reactions build (deferred — not in the first build).

**The problem it solves.** Reactions render full diegetic prose below
threshold and a counter above it — so a player who wants their *full
expression* seen (especially a customized emote) has an incentive to use
a **bare emote** (`;smile iffy`) instead of `react`, because the emote
always renders in full. At chat scale that route-around reintroduces
exactly the flood aggregation was meant to prevent — and it never touches
the reaction path, so neither aggregation nor the renown signal captures
it. Aggregation is a *wire-scale* mechanism; bare-emote flooding is a
*readability* problem; they intersect but are not the same.

**The idea.** Instead of merely *filtering* a flood of the same emote at
the same target (the console-filtering reflex — hide repetition), **detect
the convergence and fold it into a reaction aggregate** — collapse the
twentieth `;smile iffy` into the same counter a `react` would have built.
This *salvages the intent* rather than discarding it: the count, the
attributed sample, even the renown signal are all recovered, and the
bare-emote route-around stops mattering because the emote path *converges
on reactions at scale anyway*. Spam-prevention becomes
intent-preservation.

**What it needs.** An emote-convergence detector (same/similar emote +
same target or same prior act, within a window) sitting atop the reaction
substrate this build ships — the detector synthesizes an `inReactionTo`
scope for emotes that didn't carry one. Distinct from console-filtering
(which hides) and from this build (which only aggregates *explicit*
reactions). Keep the bare emote and the explicit `react` conceptually
distinct at the point of use (no auto-magic on the *single* emote); this
convergence collapse only triggers on a *flood*, at scale, where the
collapse is unambiguously wanted.

**The companion requirement (in the first build).** Make explicit
reacting *as low-friction as a bare emote* (selector-less `react`/`re`
form + one-key palette) so the route-around is minimized even before this
salvage layer exists.

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
