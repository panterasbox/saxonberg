# Console filtering slate (working doc)

> **Status: PARTIAL** — the core shipped in the console-foundations
> build: `TabStrip`, `FilterDrawer`, `GutterStripe`, and the
> `Topic`/`TopicCatalogue` substrate
> → [topics.md](../../subsystems/topics.md)
> **Left:** transcript search · sender filter · family mute (collapse a
> topic family to a count badge) · author/admin frames toggle · compact
> mode · timestamps · brief mode / `prose.verbose` · per-room verbosity
> memory
> **Size:** a wave

Working slate for **console filtering** — the suite of client-side
tools that let players manage what they see in the terminal scroll.
Sister surface to the inspection card: that slate handles "show me
the structured state of the world"; this one handles "let me
control the firehose of prose."

**Status — core SHIPPED; deferred tail lives here.** The load-bearing
core (topic toggles → tabbed terminal, filter drawer, per-topic gutter,
topic catalogue) was promoted into the **console-foundations build** and
shipped: `TabStrip`, `FilterDrawer`, `GutterStripe`, and the
`Topic` / `TopicCatalogue` substrate (see
[docs/subsystems/topics.md](../../subsystems/topics.md)). This slate
continues for the **deferred tail** below — search, sender filter,
compact mode, timestamps, brief mode / `prose.verbose`, and per-room
verbosity memory — which has no other home now that the
console-foundations requirements/plan docs are retired. Builds on the
cockpit slate's terminal component and the existing per-topic emit
discipline on the server.

See also:

- [docs/subsystems/card-surface.md](../../subsystems/card-surface.md)
  — the persistent inspection surface that obviates the need to
  re-`look` for state queries. The filtering tools here manage
  the *narrative* scroll (events, actions, speech), where the
  card manages *state*.
- [docs/slates/client-cockpit-slate.md](../tails/client-cockpit-slate.md)
  — terminal component, topic taxonomy, MML renderer.
- [docs/slates/chat-slate.md](../tails/chat-slate.md) — **channels** (a
  filtering axis this slate predates — see Reconciliation note).
- [docs/slates/reactions-slate.md](../tails/reactions-slate.md) — reaction
  display controls that coordinate with this surface.
- [docs/slates/message-rendering-slate.md](../tails/message-rendering-slate.md)
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

*Graduated to [topics.md](../../subsystems/topics.md) § *Why the filter lives on the client* — the server prints everything, categorizes on the wire, and the client filters; the shipped named-predicate views are retroactive because the server never withholds a frame.*

---

## Filtering surfaces

A toolbox, not a single feature. Each entry is its own UI gesture
the player can engage with independently.

The **topic-toggle** surface shipped (console-foundations:
`TabStrip` + `FilterDrawer` + `GutterStripe`, see
[topics.md](../../subsystems/topics.md)). The rest of this section is the
**deferred tail this slate now carries** — each of these is *not* built
and survives here as the live remainder: **search** (Ctrl-F), **sender
filter**, **family mute / compact mode**, **timestamps**, **brief mode
/ `prose.verbose` verbosity**, and **per-room verbosity memory**.

### Topic toggles — shipped, and on a different vocabulary than listed here

Per-topic on/off controls shipped as the `FilterDrawer` over the
`TabStrip` in the console-foundations build, then went further: a tab is
a **named predicate** over the whole buffer (facets + a topic-mute
allowlist/denylist), not a flat topic checkbox tree — see
[client-shell.md § One strip, and every tab is a VIEW over the whole
buffer](../../subsystems/client-shell.md#-one-strip-and-every-tab-is-a-view-over-the-whole-buffer).

⚠ **The example topic list below is STALE — the vocabulary it names is
gone.** The S2 topic-taxonomy build collapsed the ~89-topic tree this
slate was written against (`world.speech.*`, `world.perception.*`,
`system.shell.*`, …) into **seven roots and 29 leaves** with the
cross-cutting axes (who's talking, who it's for, how loud) moved to
**facets**. See [topics.md § The seven
roots](../../subsystems/topics.md#the-seven-roots). Read every topic
string in this slate (below, and in the UI sketch) as illustrative of
the mechanism, not as current vocabulary.

Mute state persists per-tab so it survives reconnect, through
`ClientStateMixin` — server-persisted client-view state keyed per tab —
**not** a flat `console.filters.muted: string[]` *settings* key as this
slate originally proposed. Per-tab mute is client-UI state, not a
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

⚠ **The drawer/tree part of this sketch is superseded by what shipped**
— the actual `FilterDrawer` editor is a per-view facet editor (three
facet axes with live per-value counts, a `SHOWING n of m` readout, a
topic-mute tree beneath it) opened from the active tab in `TabStrip`,
not a standalone gear-icon panel with a flat topic checkbox tree. See
[client-shell.md § Composing one](../../subsystems/client-shell.md#composing-one).
Kept below for the parts still unbuilt: **search**, **timestamps**,
**compact mode**, and the right-click discovery surface.

```
Search: [____________________]
☐ Timestamps
☐ Compact mode
```

Right-click on any frame in the scroll opens a quick context menu:
"mute this topic," "show only sender X," "search forward / back,"
etc. — the right-click is the discovery surface; the shipped facet
editor is the configuration surface.

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
2. **Mute granularity** — per-topic or per-topic-family? Both? Lean
   both, tree-shaped UI. **Resolved, and the lean held:** the shipped
   view model carries both — a per-tab topic-mute tree AND a
   facet-based allowlist (`FacetFilter.topics`) per named view. See
   [client-shell.md § `Aether` is a topic list, and that is a
   finding](../../subsystems/client-shell.md#-aether-is-a-topic-list-and-that-is-a-finding).
3. **Search across muted content** — if a topic is muted, does
   search still find it (with a "found in muted topic, unmute to
   show?" prompt)? Or does muting hide from search too? Lean
   "search ignores mutes, offers to unmute." More useful, less
   confusing.
4. **Brief mode and the inspection card** — if brief mode is on
   but the inspection card is showing the full long description,
   is the brief just a terminal-scroll thing? Lean yes — card
   gets full content always; brief mode only affects scroll-prose
   verbosity.
5. **Topic discovery** — how does the player learn what topics
   exist to filter on? **Resolved (console-foundations):** the
   `TopicCatalogue` ships labels/descriptions/families to the client
   at session-establish; the `FilterDrawer` populates from that
   catalogue. See [topics.md](../../subsystems/topics.md).
6. **Mute survives reconnect?** — yes, via per-tab `ClientStateMixin`
   view state (not a `console.filters.muted` setting; see the Settings
   keyspace correction). Across DEVICES (multi-device session)?
   `ClientStateMixin` is per-avatar server-side, so yes by default.
   Worth noting.

---

## Dependencies

- **The topic vocabulary** — the categorization anchor for all
  topic-based filtering. Now `TopicCatalogue` over the seven-root/29-leaf
  tree, not the ~89-topic `MessageApi` vocabulary this slate was
  drafted against. See [topics.md](../../subsystems/topics.md).
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

*(Step 1 — topic toggles + drawer UI — shipped, in a more capable shape
than sketched here: named predicate views, not a flat drawer. See
`### Topic toggles` above.)*

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
