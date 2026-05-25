# Inspection pane slate (working doc)

Working slate for the **inspection pane** — the persistent right-
column surface that displays what the player is currently focused
on. Sister to the prompt's focus token: the prompt shows what
`$focus` resolves to, the pane shows what that resolution actually
contains.

**Status.** Design surface. Builds on the cockpit slate's panel
inventory (Inspection / Room-state / Focus widgets collapse into
this one pane), the prompt-stack slate's focus-in-prompt decision,
and the existing `FocusedMixin` substrate.

See also:

- [docs/slates/client-cockpit-slate.md](./client-cockpit-slate.md)
  — original sidebar widget catalogue. This slate supersedes the
  Room-state and Focus widget entries by folding them into a
  single pane.
- [docs/slates/prompt-stack-slate.md](./prompt-stack-slate.md) —
  the prompt's focus token. Header of this pane shows the same
  live focus value.
- [docs/slates/console-filtering-slate.md](./console-filtering-slate.md)
  — sister slate covering terminal-scroll spam management
  (`brief` mode, `glance`, client-side filters). Always-print
  look prose is the policy; that slate manages the spam.
- `packages/server/src/mud/lib/command/Focused.ts` — `FocusedMixin`
  with `getFocus()` / `setFocus()`. Focus defaults to `'here'`
  and changes when `focus` / `look` / `examine` fire.

---

## Principle

**The pane shows what you're focused on, not the room you're in.**
Most of the time those coincide (default focus is `'here'`), but
the distinction is load-bearing. Focus is the MQL pointer; the pane
is the rendered view of that pointer. They are not the same thing.

Two further principles:

- **Header and body decouple.** Focus changes update the header
  (live, instant). The body only re-renders when an explicit `look`
  fires against that focus. Faithful representation of what focus
  actually is — a pointer, not a viewport. The viewport is
  populated by the looking action.
- **All updates route through real commands.** Refresh = `look`,
  history navigation = `focus <X>`, tab switches = whatever the
  underlying view is. No client-only state changes; the principle
  of command-bus primacy stays intact.

---

## Architecture

### Header

The header is the focus name — same string the prompt displays. One
source of truth (server-pushed focus value, per the prompt slate's
`system.prompt.focus` topic). Updates instantly on `setFocus`.

When focus is `'here'`, the header reads as the current room's
display name (resolved client-side from the most recent look's
location MML tag, or from the focus value if it carries one).

### Body

The most recent `look` output rendered against the current focus.
Contains the prose (short + long description) and the MML semantic
tags as clickable affordances (exits, items, NPCs, quantity chips).

The body re-renders when:

1. A `look` command fires whose focus matches the pane's header.
2. The user clicks the **Refresh** button (which sends `look`).
3. Future: the pane subscribes to `$focus` with `detail` fields
   via the MQL-subscription substrate; the substrate's diff
   deltas patch the body field-by-field as the focused thing
   changes.

Body does NOT re-render when:

- The player issues a non-look command (`take sword`, `say hi`).
  Side effects appear in the terminal scroll, not the pane.
- A `look <X> --peek` fires (peek flag — see Interaction model).

### Empty-body state (focus-without-look)

When the user runs `focus thermometer` without an accompanying
`look`, the header updates to `thermometer` and the body **clears**
to an empty / muted placeholder. Something like:

```
┌─────────────────────────────────────┐
│ thermometer            [↻ Refresh]  │
├─────────────────────────────────────┤
│                                     │
│   (focused — `look` to inspect)     │
│                                     │
└─────────────────────────────────────┘
```

The placeholder is itself clickable (sends `look`). Forces the
explicit `look` to populate, which is the honest model of focus:
it's a pointer, you have to look at what it points to.

This state is rare in practice — `look` / `examine` / movement
all set focus AND emit a look in one motion. But when a player
explicitly uses the `focus` verb, the pane respects the semantics
rather than fabricating a look that wasn't asked for.

### Refresh button

A button in the pane header that fires `look` (no args, which
re-runs against the current focus). Clickable affordance, routes
through the command bus, populates the body. Keyboard equivalent:
typing `look` and Enter — same surface.

Stays enabled in the empty-body state (that's its main use).

### Focus breadcrumbs / history

A horizontal strip of recent focus values, bounded to N entries
(probably 5-8). Each entry shows the focus name; clicking it sends
`focus <name>` through the bus, which updates the header (and
clears the body per the focus-without-look rule).

Optional back/forward arrows walk the same history with a
single-step gesture.

Entries get pushed on every `setFocus`; oldest bumps off the end
when the buffer fills.

### Tabs (future, not v1)

The pane's content model generalizes from "current focus" to
"a look context." Other contexts that could become tabs:

- A pinned MQL query result (`mql 'all items in here'` → "pin as
  tab" → the pane shifts to that result set, refreshable).
- An admin structural-inspection view.
- A pinned previous focus (so it doesn't bump off the breadcrumb
  buffer).

Tab strip across the top:

```
[ Focus ] [ Query: all items here ] [ Admin ] [ + ]
```

Focus tab is always pinned (no close button); others can be
closed. Tabs are session-scoped (not persisted across reconnects
yet).

v1 ships the focus tab only. The tab-strip UI is forward-
compatible: even with one tab, it sits there with a `[+]`
that's grayed out, telegraphing the future shape.

---

## Interaction model

### `look <thing>` (existing, modified)

Behavior:
1. Sets focus to `<thing>` (existing `FocusedMixin.setFocus`)
2. Fires the look output:
   - Prose to the terminal scroll (`world.perception.look`)
   - Structured pane payload to the new dedicated topic (see
     Wire shape below)
3. Client: prompt header + pane header update via focus push;
   pane body re-renders from the structured payload.

### `look <thing> --peek`

Additive flag. Behavior:

1. Does NOT change focus
2. Fires look output to the terminal scroll only — no pane
   update
3. Players use this to inspect something they're curious about
   without committing their MQL pointer (e.g., "what's in that
   chest" without losing the focus they were working with).

Sugar candidate: a `glance` verb that's a shortcut for some
peek-shaped variant. Slate-level call: `--peek` flag is the
canonical surface, `glance` can layer on later if a real
shortcut is wanted (sub-question of console-filtering's `brief`
mode work).

### `look` (no args)

Re-runs against the current focus. Equivalent to the Refresh
button. Populates the pane body if it was empty (post-`focus`-
only state).

### `focus <thing>` (existing, unchanged behavior; new pane consequence)

1. Sets focus
2. Emits the existing prose ("focus set to 'X' (N objects)") to
   terminal
3. Emits the new focus push frame (so prompt + pane header
   update)
4. Pane body clears to the empty-body placeholder
5. Player has to `look` to populate

### `examine <thing>` (existing)

Behaves like `look <thing>` — focuses + emits look. Same pane
update flow.

---

## Wire shape

Two emit paths from the server per look:

### Prose (existing)

`world.perception.look` MessageFrame with the rendered MML body.
Lands in the terminal scroll. Unchanged.

### Pane payload (new)

A parallel structured frame on a dedicated topic — call it
`system.inspection` — carrying the same render payload in a form
the pane can consume directly:

```ts
interface InspectionFrame {
  topic: 'system.inspection';
  body: {
    focus: string;                  // the focus value this look fired against
    title: string;                  // the focused thing's display name
    prose: string;                  // MML body identical to what the terminal got
    affordances?: AffordanceSummary[]; // future: structured exit/item/NPC list for richer rendering
    // …extensibility for future panes (atmosphere readouts, lighting, etc.)
  };
}
```

Why a parallel frame and not "parse the existing MML on the
client":

- The pane needs to know the focus this look was tied to, so it
  can decide whether the pane should update (focus-match) or not
  (peek-flagged look).
- The pane might want richer rendering than the prose pane (e.g.,
  a sortable list of exits, an atmosphere readout card).
- Server-side rendering of the structured payload lets the format
  evolve without forcing the client to re-parse MML.

v1 ships with `prose` only — the pane renders the same MML body
the terminal does, just in a different surface. `affordances` and
other fields are stubbed for future enrichment.

---

## Layout

Right column dominant:

```
┌────────────────────────────────────────────────────────────────┐
│ Status header                                                  │
├──────────────────────────────────────────┬─────────────────────┤
│                                          │ Inspection pane     │
│   Terminal (prose + envelope notes)      │  - Header (focus)   │
│                                          │  - Body (look out)  │
│                                          │  - Refresh / hist   │
│                                          ├─────────────────────┤
│                                          │ Avatar-state strip  │
│                                          │  - Inventory        │
│                                          │  - Slots            │
│                                          │  - Engagement       │
├──────────────────────────────────────────┴─────────────────────┤
│ Prompt + input                                                 │
└────────────────────────────────────────────────────────────────┘
```

The mental model: **world on top of the right column, self below.**

Inspection pane gets the bigger share (2/3 of right column);
avatar-state strip is smaller (1/3). Adjustable split if we want
that polish later; v1 ships fixed.

---

## Admin extras

When the player has author/admin role, the pane body gets an
expandable **admin section** at the bottom showing structural
metadata for the focused thing:

- `templatePath` — clickable, sends `cd <path>` (workspace verb)
- `stuffId` — copyable
- Composition (mixin list)
- Container path (where it lives)
- Raw `data` dump — expandable, with a "view raw" toggle
- Quick-action buttons:
  - `clone` (clones the template under cwd)
  - `reload` (HMR-reload the template's class)
  - `eval` (open eval scratchpad with this object pre-bound to
    `$it` or similar)

The admin section is collapsed by default; opens with a click.
Hidden entirely for non-admin users.

When the structural metadata gets long enough that an expandable
section feels cramped, this can graduate to its own tab (per the
Tabs section above).

---

## Worked example: a typical inspection flow

```
1. Player arrives in Duncan Hall Lobby (auto-look fires on move)
2. Focus → 'here'. Prompt: [here] >. Pane header: Duncan Hall Lobby.
   Pane body: room description + exits + occupants (clickable).
3. Player clicks "thermometer" (a clickable <item> in the body)
4. → sends `examine thermometer` → focus shifts to thermometer →
   prose to terminal + inspection frame to pane.
   Prompt: [thermometer] >. Pane header: brass thermometer.
   Pane body: thermometer description (clickable details).
5. Player wants to go back to looking at the room without re-typing.
   Clicks the "Duncan Hall Lobby" breadcrumb (which was just
   pushed onto the history when focus shifted).
   → sends `focus here` (or `focus 'Duncan Hall Lobby'` — TBD).
   Pane header updates to Duncan Hall Lobby. Pane body CLEARS
   (focus-without-look).
6. Player clicks Refresh, or types `look`. Pane body re-populates
   with the room.
7. Player wants to peek at the front door without losing focus.
   Types `look door --peek`. Terminal shows the door description.
   Pane stays unchanged (still showing the lobby).
```

---

## Non-goals

- **Tabs in v1** — multi-tab pane is forward-compatible architecturally
  but ships in a follow-up. v1 has the focus tab only with a
  grayed-out `[+]` telegraphing the shape.
- **MQL query results in the pane** — same as tabs, deferred.
- **State-sync-driven live updates** — pane re-renders on
  explicit look only in v1. When the MQL-subscription substrate
  ships, the pane subscribes to `$focus` and lighting changes /
  NPC arrivals / inventory changes drive automatic re-renders
  via subscription deltas — the explicit emit on look is then
  redundant but harmless to keep.
- **Multi-pane support** — single inspection pane. No split-pane
  for "compare two objects side by side." That's an author tool
  someday, not v1.
- **Persistent breadcrumb history across reconnects** — session-
  scoped only.
- **Animated focus transitions** — open question; nice-to-have,
  not v1. The pane re-renders, no transition.

---

## Open questions

1. **Layout split ratio** — fixed at ~2/3 inspection / 1/3 avatar
   state, or user-resizable? Lean fixed v1, resizable later.
2. **Breadcrumb size** — 5? 8? 12? Lean 6-8. The breadcrumb is
   for quick back-traversal, not full history (which can live in
   a history modal later if anyone wants it).
3. **`look here` vs `focus here`** — clicking the "Duncan Hall
   Lobby" breadcrumb after walking out to thermometer focus —
   does it send `focus here` (no body populate) or `look here`
   (re-populate)? Tradeoff: faithfulness vs convenience. Lean
   `look here` — clicking a breadcrumb is the gesture of
   "show me this again," not "set my pointer but don't show me."
   The focus-without-look state is for the explicit `focus`
   verb only.
4. **Refresh during another command** — can the user click
   Refresh while a command is still in-flight? Probably yes,
   the click just queues a `look` command after the current
   one. No special handling.
5. **Sticky pane state on disconnect / reconnect** — if a
   player drops and reconnects, does the pane re-populate
   automatically (server pushes a fresh inspection frame on
   connection)? Lean yes — connection-established triggers a
   fresh look against current focus.
6. **`<peek>` MML tag** — should clickable affordances in the
   terminal scroll (not the pane) default to peek-flagged
   clicks? E.g., clicking an item in old scrollback is more
   "let me peek at the history" than "let me commit my focus
   to this." Or is that overcomplicating? Lean overcomplicating
   for v1 — every click is a focus-shifting look.

---

## Dependencies

- **Cockpit slate's panel inventory** — gets revised to fold the
  Room-state / Focus widgets into a pointer at this slate.
- **Prompt-stack slate** — header here matches the prompt's focus
  token (same wire push topic).
- **MML semantic-tag renderer** (shipped) — the pane reuses the
  same renderer for clickable affordances in the body.
- **State-sync slate** — eventual live-update path. Out of scope
  for v1 but the wire shape (`InspectionFrame`) is designed to
  be superseded by the MQL-subscription substrate when it lands
  — the pane becomes a subscriber on `$focus` with `detail`
  fields and no longer needs the bespoke topic.
- **Console filtering slate** — sister; complementary surface for
  spam management.
- **DescribeApi v2** (recognition slate) — when DescribeApi v2
  ships, the affordances list gets richer disambiguation cues
  (short description, salient features). Slate-noted but not
  blocking.

---

## Suggested build order

1. **Wire shape (server)** — new `system.inspection` topic;
   `LookController` emits the structured frame alongside its
   existing prose emit. Tested against unit harness.
2. **Pane skeleton (client)** — header + body + empty-body
   state. Subscribes to `system.inspection` + the focus push
   topic. Renders MML body through the existing renderer.
3. **Refresh button** — clickable affordance routed through
   the command bus (`look`).
4. **Focus breadcrumbs** — Zustand slice holding the last N
   focus values; UI strip; click sends `focus <X>` (or
   `look <X>` per the open question).
5. **`--peek` flag on look** — argument parser + a server
   behavior tweak (skip the focus push + skip the inspection
   frame emit when `--peek` is present).
6. **Admin extras** — expandable section below body, gated by
   role check. Quick-action buttons (`clone` / `reload` /
   `eval`) are clickable affordances routed through the bus.
7. **Tab strip stub** — UI element with one (focus) tab and a
   grayed-out `[+]`. No functionality yet, just shape.

Waves 1-3 are the core. 4 + 5 are polish. 6 is admin. 7 is
forward-compat shape. Waves 1-5 likely fit in a single build
cycle; admin + tabs as follow-ups.
