# Console filtering slate (working doc)

Working slate for **console filtering** — the suite of client-side
tools that let players manage what they see in the terminal scroll.
Sister surface to the inspection pane: that slate handles "show me
the structured state of the world"; this one handles "let me
control the firehose of prose."

**Status — core SHIPPED; deferred tail lives here.** The load-bearing
core (topic toggles → tabbed terminal, filter drawer, per-topic gutter,
topic catalogue) was promoted into the **console-foundations build** and
shipped: `TabStrip`, `FilterDrawer`, `GutterStripe`, and the
`Topic` / `TopicCatalogue` substrate (see
[docs/subsystems/topics.md](../subsystems/topics.md)). This slate
continues for the **deferred tail** below — search, sender filter,
compact mode, timestamps, brief mode / `prose.verbose`, and per-room
verbosity memory — which has no other home now that the
console-foundations requirements/plan docs are retired. Builds on the
cockpit slate's terminal component and the existing per-topic emit
discipline on the server.

See also:

- [docs/subsystems/inspection-pane.md](../subsystems/inspection-pane.md)
  — the persistent inspection surface that obviates the need to
  re-`look` for state queries. The filtering tools here manage
  the *narrative* scroll (events, actions, speech), where the
  pane manages *state*.
- [docs/slates/client-cockpit-slate.md](./client-cockpit-slate.md)
  — terminal component, topic taxonomy, MML renderer.
- [docs/slates/chat-slate.md](./chat-slate.md) — **channels** (a
  filtering axis this slate predates — see Reconciliation note).
- [docs/slates/reactions-slate.md](./reactions-slate.md) — reaction
  display controls that coordinate with this surface.
- [docs/slates/message-rendering-slate.md](./message-rendering-slate.md)
  — the rendering model whose "server sends complete, client decides
  display" matches this slate's founding principle.
- `packages/server/src/mud/api/message.ts` — server-side topic
  vocabulary that anchors most of the filtering surface.

> **Reconciliation note (added post-comms-design).** This slate filters
> on **topics** only; later work added two axes it should grow into:
> (1) **channels** — muting/tuning a *channel* (gossip/guild/DM) is a
> distinct axis from toggling a *topic*. **Resolved:** channels
> (chat-slate) are a **separate axis that shares the tab strip** — a
> channel gets its own tab alongside the topic tabs rather than folding
> into the topic toggle surface; per-channel subscription/tuning stays
> owned by chat. Not one unified mute surface: two axes, one strip.
> (2) **reactions** — the reactions slate's per-user controls (train
> intensity, mute-reactions-on-channel, collapse threshold) are display
> controls that belong with / coordinate with this surface. Both are
> additive (the founding principle is unchanged); not yet folded into
> the sections below.

---

## Principle

**The server prints everything; the client decides what to show.**
Filtering is cheap because it lives on the client — no server
round-trip, no policy negotiation, instant feedback. The server's
job is to emit cleanly-categorized frames with stable topics; the
client's job is to give the player tools to slice that stream
however suits them.

Always-print on the server, always-categorize on the wire, always-
filterable on the client. The same prose is available to anyone
who wants it (audit trails, replay, log capture); the player's
session view is just a filter on the firehose.

---

## Filtering surfaces

A toolbox, not a single feature. Each entry is its own UI gesture
the player can engage with independently.

The **topic-toggle** surface shipped (console-foundations:
`TabStrip` + `FilterDrawer` + `GutterStripe`, see
[topics.md](../subsystems/topics.md)). The rest of this section is the
**deferred tail this slate now carries** — each of these is *not* built
and survives here as the live remainder: **search** (Ctrl-F), **sender
filter**, **family mute / compact mode**, **timestamps**, **brief mode
/ `prose.verbose` verbosity**, and **per-room verbosity memory**.

### Topic toggles

Per-topic on/off controls. Server topics today (partial list):

- `world.speech.{say,tell}` — speech
- `world.perception.{look,inventory,scry,locate}` — perception output
- `world.narration.{movement,teleport,action}` — narration
- `world.identity.change` — identity changes
- `system.shell.{fs,author,help,movement}` — system replies
- `system.command.error` — dispatcher errors
- `system.log.command.{info,warn}` — local echoes

UI shape: a collapsible filter panel (gear icon? sidebar drawer?)
with a tree of topics, each with a checkbox. Default all on.
Player can uncheck to mute. Per-topic checkbox shows a small count
badge of frames muted since this session started. **Shipped** as the
`FilterDrawer` over the `TabStrip` in the console-foundations build.

Mute state persists per-tab so it survives reconnect. **Correction
(what shipped):** the per-tab `muted` lists route through
`ClientStateMixin` — server-persisted client-view state keyed per tab
— **not** a flat `console.filters.muted: string[]` *settings* key as
this slate originally proposed. Per-tab mute is client-UI state, not a
player-tunable `settings` knob; see the Settings keyspace correction
below.

### Search

Ctrl+F-style content search over the visible scroll. Highlights
matching lines, optionally filters the view to matches only.

Open questions: scope to current scroll only, or remember across
sessions? Lean current-scroll-only — search is for "find what just
happened," not historical research. The historical research surface
is MudlogApi (server-side).

### Sender filter

Filter speech / narration by sender. UI: clicking a `<player>`
or `<npc>` tag in the terminal opens a small menu with
"show only this person," "mute this person," etc.

Uses the `stuff-id` attribute on the existing MML tags. Cheap
because the client already has the metadata.

### Family mute (collapse)

Higher-level toggle: collapse an entire topic family to a count
badge, expand on click. Useful for "I don't care about system
chatter until I'm debugging."

```
[system.* — 14 frames hidden] ▶
```

Click the badge → expand to show all the collapsed frames inline.

Different from per-topic mute: mute drops the frames entirely;
collapse keeps them in scrollback, just not visible.

### Author / admin frames toggle

When the author role is active, structural metadata frames
(`system.log.author.*` future) are visible by default. Non-admin
sessions don't see them. Single toggle to hide/show even for
admins (useful when demoing to non-admin colleagues).

### Verbosity setting

Server-side setting (`prose.verbose: brief | full`) that controls
how much prose `LookController` (and similar) emits. Classic MUD
`brief` mode:

- `full` — short + long description + exits + occupants (current
  behavior)
- `brief` — short description + exits only (no long body, no
  occupant list)

Persisted via the normal `settings` verb. Distinct from the
filtering tools above because it changes what the *server*
sends, not just what the client shows. Players who want minimum
spam set `brief` AND mute non-essential topics.

A `glance` verb (or `look --brief` flag) gives the same trimmed
output on a per-command basis without changing the global setting.
v1: pick one approach — probably the verbosity setting + `look
--brief` flag is cleaner than a separate `glance` verb.

### Per-room verbosity memory

Variant of brief mode. Server (or client?) remembers which rooms
the player has seen this session; first-visit emits full, revisit
emits brief automatically. The cockpit slate already noted this as
a candidate; gets owned here.

Tension: deferred per the user's "always print, filter elsewhere"
position. Probably a Wave-2 thing — ship the simpler always-emit
path first, evaluate whether per-room memory actually feels
better, add it later if it does.

### Timestamps

Toggle to show / hide a timestamp prefix on each frame. Off by
default; on for debugging or for players who want a chat-log feel.
Player setting (`console.timestamps: boolean`).

### Compact mode

Toggle to collapse multi-line frames to single-line summaries.
Useful in busy rooms — "5 people walking around" becomes one
event per move instead of three lines per move.

Lower priority than the rest. Lean ship when content asks.

---

## Wire impact

Most filtering is purely client-side — the client receives every
frame and decides what to show. Some surfaces require server help:

### Server-side

- **Verbosity setting** (`prose.verbose`) — `LookController` and
  any other verbose-prose emitters read the setting via
  `resolveSetting` and adjust output accordingly. Setting lives
  in `EnvironmentMixin`.
- **Per-room visit memory** (if shipped) — server-side state on
  the avatar (`Set<roomStuffId>` of seen rooms). Cleared on
  session boundary or persistent — TBD.

### Client-side only

- Topic toggles
- Search
- Sender filter
- Family mute / collapse
- Author/admin frames toggle
- Timestamps
- Compact mode

The client subscribes to all topics regardless of filters (so a
mute toggle is reversible without server re-emission) and renders
according to local filter state.

---

## Settings keyspace

> **Correction (what shipped).** This section originally routed per-tab
> mute through a flat `console.filters.muted: string[]` *settings* key.
> That is **not** what shipped: per-tab `muted` lists are **client-UI
> view state**, persisted server-side through **`ClientStateMixin`**
> keyed per tab — not a player-tunable `settings` knob. The `settings`
> keyspace is for player-facing tunables surfaced by the `settings`
> verb; per-tab mute isn't one. Only the genuinely-player-tunable knobs
> below (timestamps, compact, prose verbosity) belong in `settings`.

The split that *does* hold is between client-view state and server
emit policy:

- **Per-tab mute / collapse** → `ClientStateMixin` (client-view state,
  not a `settings` key). Reversible instantly client-side.
- **Player-tunable view knobs** → `console.*` settings, surfaced by the
  `settings` verb:

```
console.timestamps: boolean
console.compact: boolean
console.verbosity: 'brief' | 'full'   # alias for prose.verbose (or vice versa)
```

- **Server emit policy** → `prose.*`:

```
prose.verbose: 'brief' | 'full'
```

`prose.*` controls what the server actually emits (wire content per
command); the `console.*` knobs and `ClientStateMixin` view state are
the player's display layer.

---

## UI sketch

The filter surface should be unobtrusive — most players will never
touch it. A small gear / sliders icon on the terminal header opens
a side drawer:

```
┌── Terminal ─────────────────────────────────[⚙]──┐
│ ...                                              │
│ (terminal output)                                │
│ ...                                              │
└──────────────────────────────────────────────────┘

Drawer (when opened):
┌── Filters ───────────────────────────────────────┐
│ ☑ World                                          │
│   ☑ Speech (say, tell)                           │
│   ☑ Perception (look, inv, scry)                 │
│   ☑ Narration (movement, action)                 │
│   ☑ Identity                                     │
│ ☐ System (mute all 14 frames)                    │
│   ☐ Shell                                        │
│   ☐ Errors                                       │
│   ☑ Command echoes                               │
│                                                  │
│ Search: [____________________]                   │
│ ☐ Timestamps                                     │
│ ☐ Compact mode                                   │
│                                                  │
│ Verbosity: ( ) brief  (•) full                   │
└──────────────────────────────────────────────────┘
```

Lightweight. Doesn't take terminal space when closed.

Right-click on any frame in the scroll opens a quick context menu:
"mute this topic," "show only sender X," "search forward / back,"
etc. — the right-click is the discovery surface; the drawer is the
configuration surface.

---

## Non-goals

- **Server-side per-player filtering** — pushing filter state to
  the server so it doesn't emit muted frames. The "always print,
  filter on client" position is principled: same audit trail,
  trivial cost, reversible muting. Server-side filtering belongs
  on egress-policy (moderation), not user preference.
- **Cross-session search** — search is current-session-scope.
  Historical/cross-session log search lives in a future
  MudlogApi-driven surface, not the terminal filter.
- **AI-driven filtering / summarization** — "summarize the last 5
  minutes of action" is a real demand but out of scope for v1
  filtering substrate.
- **Replacement of MudlogApi** — server-side log capture stays;
  this slate manages the *display* of the wire, not the persistent
  audit record.

---

## Open questions

1. **Default filter state** — anything off by default? Probably
   no — fresh players should see everything until they decide to
   trim. But author / admin frames maybe default off for non-admin.
2. **Mute granularity** — per-topic or per-topic-family? Both?
   Lean both, tree-shaped UI.
3. **Search across muted content** — if a topic is muted, does
   search still find it (with a "found in muted topic, unmute to
   show?" prompt)? Or does muting hide from search too? Lean
   "search ignores mutes, offers to unmute." More useful, less
   confusing.
4. **Brief mode and the inspection pane** — if brief mode is on
   but the inspection pane is showing the full long description,
   is the brief just a terminal-scroll thing? Lean yes — pane
   gets full content always; brief mode only affects scroll-prose
   verbosity.
5. **Topic discovery** — how does the player learn what topics
   exist to filter on? **Resolved (console-foundations):** the
   `TopicCatalogue` ships labels/descriptions/families to the client
   at session-establish; the `FilterDrawer` populates from that
   catalogue. See [topics.md](../subsystems/topics.md).
6. **Mute survives reconnect?** — yes, via per-tab `ClientStateMixin`
   view state (not a `console.filters.muted` setting; see the Settings
   keyspace correction). Across DEVICES (multi-device session)?
   `ClientStateMixin` is per-avatar server-side, so yes by default.
   Worth noting.

---

## Dependencies

- **MessageApi topic vocabulary** (existing) — the categorization
  anchor for all topic-based filtering.
- **EnvironmentMixin settings** — the player-tunable `console.*` view
  knobs and `prose.*` (server emit verbosity) live here.
- **ClientStateMixin** — per-tab `muted` / `collapsed` view state
  (what shipped) lives here, *not* in `settings`.
- **MML semantic tags** (shipping incrementally) — the
  `stuff-id` attribute on `<player>` / `<npc>` / `<item>` is
  what powers per-sender filtering and right-click context
  menus.
- **MudlogApi** — orthogonal but related; the audit-trail surface
  the filters explicitly do NOT replace.

---

## Suggested build order

1. **Topic toggles + drawer UI** — the load-bearing 80% surface.
   Client-only; subscribes to all, renders per filter state.
2. **`console.*` settings keyspace** — wire the existing
   `settings` verb to read/write the filter list.
3. **`prose.verbose = brief | full` setting + `LookController`
   adjustment** — first server-side verbosity control.
4. **`look --brief` flag** — per-command verbosity override.
5. **Search** — Ctrl+F on the terminal, highlight + optionally
   filter to matches.
6. **Right-click context menus on frames** — "mute this topic,"
   "show only this sender," etc.
7. **Sender filter / family mute / compact mode / timestamps** —
   smaller tools, pull as content demands them.

Waves 1-3 are the meaningful chunk. The rest layer in as use
cases sharpen.
