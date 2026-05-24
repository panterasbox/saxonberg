# Client cockpit slate (working doc)

Working slate for the **reference web client** — the affordance-first
cockpit that sits on top of the existing command-bus + MML wire and
turns the server's structured world model into a UI that's intuitive
for new players and powerful for power users, while staying honest
about what this app actually is: a CLI-in-a-browser whose primary
audience is investors getting demoed the engine.

**Status.** Design surface staked out. Implementation broken into
independent tracks that can be built in parallel. The client today
is a four-component shell (App, Terminal, CommandBar, ConnectionStatus)
that renders raw MML as literal text and ignores the response envelope
+ state-sync channels the server already emits or has designed. This
slate is the spec for what to build instead.

**Audience.** The reference app's primary demo audience is potential
investors. The secondary audience is a generic education vertical
whose learners consume content primarily through video and transcripts.
A content-author persona exists but is explicitly **not** the client's
target — content authors use the same player client with elevated
permissions and the in-game shell, until the shell strains under real
authoring pressure and a dedicated CMS is justified.

See also:

- [docs/subsystems/response-envelope.md](../subsystems/response-envelope.md)
  — the structured per-dispatch wire channel. Cockpit consumes it to
  render `Status` color signals and `Note` chips alongside prose.
- [docs/slates/state-sync-slate.md](./state-sync-slate.md) — the
  parallel world-delta channel. Cockpit's right-sidebar widgets are
  state-sync consumers. The slate's design is taken as given;
  cockpit work doesn't reshape it.
- [docs/subsystems/messaging.md](../subsystems/messaging.md) — MML
  prose channel + Scene composer. Cockpit's prose pane is an MML
  consumer that gets new semantic tags from this slate.
- [docs/subsystems/command-parsing.md](../subsystems/command-parsing.md)
  + [command-routing.md](../subsystems/command-routing.md) — the
  command bus. Cockpit's central principle is **everything routes
  through here.**
- [docs/runtime-model.md](../runtime-model.md) — wire timing and
  multi-client reality. The cockpit lives downstream of the
  per-Interactive frame counter (`Interactive.nextFrameId`).

---

## Principle

**Command-bus primacy.** Every interaction in the client emits a
command on the wire. There is no parallel mouse-event channel, no
client-only state machine that mutates the avatar, no special API
for the modal or the wardrobe. Everything is a command, and the
command is **visible in the input** before (or as) it sends.

This is the educational lever. New players learn the command
protocol because they watch their clicks materialize as text they
could have typed. Power users skip the click and type directly.
The two populations use the same surface; the surface teaches.

Three corollaries fall out of this principle:

1. **No special-case UI primitives.** The character-creation modal,
   the wardrobe, the lesson player — none of them are exempt from
   showing the command they send. They're just sequences of
   prepared clickable affordances.
2. **No server-side "transaction" or multi-command primitive.** A
   workflow that needs multiple commands batches them client-side
   ("just a really fast typist"). Each command executes
   independently on the server. True server-side scripting is
   deferred to a future scripting-language pass.
3. **Mobile is the same wire.** When the mobile client ships, it'll
   be a different layout (stream + button bar instead of cockpit)
   but the same wire model: tap = preview + send. The cockpit's
   architectural decisions assume mobile inherits.

---

## Archetype

**Affordance-first cockpit**, not pure terminal. The choice was
between:

- **(A) Polished telnet** — single prose pane, single input, status
  header. Honest about the MUD-shaped server. Cheap. Doesn't show
  off what the engine knows.
- **(B) Affordance-first cockpit** — prose pane in the middle, right
  sidebar with state-sync-driven widgets (slots, engagement,
  lighting, atmosphere, who's-here, exits, inventory), every clickable
  element in either pane routes through the command bus.

Picked **(B)** because the engine's depth needs visible surface for
the investor audience, and because the affordances are the educational
on-ramp from clicker → typist.

---

## The click model

Three behaviors on every clickable element (prose-pane MML tags,
sidebar widget items, modal affordances, future map elements):

| Gesture | Behavior |
|---|---|
| **Hover** | Input previews the command that would send. Hover-off restores prior contents. |
| **Click** | Sends the previewed command. Input flashes briefly with the sent text, then clears. |
| **Shift-click** | Populates the command in the input without sending. Cursor at end. User edits, presses Enter. |
| **Right-click** | Context menu of alternative commands. Each menu entry obeys hover / click / shift-click. |

Educational design notes:

- The input is the **single source of truth** for "what is about to
  happen." Never an exception. The character-creation modal obeys.
  The wardrobe obeys. The future map obeys.
- Hover previews are reversible — moving off the element restores
  what was in the input. If the user was mid-typing when they
  hovered, their text is not lost.
- Right-click menus also teach: each menu entry shows the command
  it would send (e.g., `examine sword`, `take sword`, `wield sword`
  on the same `<item>`).
- On mobile, the equivalent is **tap = preview + send** (one
  gesture, both effects, no hover). Long-press substitutes for
  shift-click.

---

## Modes

The cockpit reshapes around what the player is currently doing.
Modes exist because cognitive load — not pixel real estate — is the
design constraint. A player engaged with a video lesson is not also
parsing the prose pane at full attention; a player walking through
a dungeon is not also consuming structured study content. So the
layout reflects mode.

### Mode catalogue (v1 and later)

| Mode | Trigger (diegetic) | Layout shape | v1? |
|---|---|---|---|
| **World** | Default | Terminal large, widgets sidebar | v1 |
| **Study** | `study <thing>`, examine a textbook, interact with study NPC | Content pane large, terminal compressed | v1 |
| **Classroom** | `attend lecture`, enter a classroom location | Content huge, roster panel, lecture-scoped chat | later |
| **Tutor** | `call tutor`, summon a live tutor NPC | Tutor stream + tutor chat prominent | later |

### Mode-switching is server-driven

The server tells the client what mode it's in via a state-sync delta
of kind `mode-changed`. The client never decides on its own. This
means:

- Same verb (`study textbook`) flips the layout automatically,
  because the verb fires a server-side mode change that ripples to
  the client.
- A quest gate that drops a player into a classroom does so without
  the client having to know it's a classroom.
- A `cancel` or `dismiss` from the player flips back to world mode
  on the server first, then the client follows.

### Admin `mode` verb (override)

Permission-gated direct override. Parallel to how `teleport` exists
alongside diegetic movement verbs:

```
mode study
mode world
mode classroom
```

For authors testing flows, demos that need to jump into a mode
without staging the diegetic trigger, and the cases where the
diegetic path is half-built. Regular players never need it.

---

## Cockpit layout

### Always-on minimum

The smallest set of UI that's present in every mode, because the
player needs them to issue *any* next command:

1. **Status header** — avatar name, current location name, time,
   lighting band, mode indicator. Drains state-sync.
2. **Prompt line** — composable format (see [Prompt line](#prompt-line));
   shows vitals + engagement at minimum.
3. **Input** — the always-focused command entry.
4. **Notification chip** — quiet indicator for world events that
   matter even in non-world modes (called by name, attacked,
   addressed in `tell`). Click to peek; expanded click → world mode
   and scroll to the relevant frame.

Everything else is mode-dependent.

### World mode

```
┌───────────────────────────────────────────────────────────────┐
│ Status header: avatar · location · clock · lighting · 🔔 chip │
├──────────────────────────────────────────┬────────────────────┤
│                                          │  Exits             │
│   Terminal (prose + envelope notes)      │  Here              │
│                                          │  Inventory         │
│                                          │  Slots             │
│                                          │  Focus / Engagement│
│                                          │  Atmosphere        │
├──────────────────────────────────────────┴────────────────────┤
│ Prompt:  [HP MV Posture Loc] >  _____________________________ │
└───────────────────────────────────────────────────────────────┘
```

### Study mode

```
┌───────────────────────────────────────────────────────────────┐
│ Status header (always-on minimum)                             │
├───────────────────────────────────────────┬───────────────────┤
│                                           │ Notification chip │
│  Content surface                          ├───────────────────┤
│   - Video player                          │ Terminal          │
│   - Transcript                            │  (compressed,     │
│   - Captions                              │   recent frames)  │
│                                           │                   │
├───────────────────────────────────────────┴───────────────────┤
│ Prompt + input                                                │
└───────────────────────────────────────────────────────────────┘
```

### Classroom mode (later)

```
┌───────────────────────────────────────────────────────────────┐
│ Status header (always-on minimum)                             │
├───────────────────────────────────────────┬───────────────────┤
│                                           │ Roster (students) │
│  Content surface (lecture stream — huge)  ├───────────────────┤
│                                           │ Lecture chat      │
│                                           │  (say-scoped)     │
├───────────────────────────────────────────┴───────────────────┤
│ Prompt + input                                                │
└───────────────────────────────────────────────────────────────┘
```

### Mobile (out of scope for v1, architecturally accommodated)

Mobile cockpit will be a stream + button bar, not a multi-pane
cockpit. Same wire model (tap = preview + send), different
layout. Cockpit slate does not specify the mobile shape; the
slate flags that decisions in this doc must not assume desktop
real estate (e.g., no "always show 4 sidebar columns").

---

## Panel inventory

Categorized. **[v1]** = ships with the cockpit slate work.
**[later]** = documented but deferred. Content surface and
mode-bound panels are tracked separately below.

### Self-state (about the avatar)

| Panel | Notes | v1? |
|---|---|---|
| Vitals | HP, fatigue, hunger, typed properties; minimum in prompt | v1 (in prompt) |
| Inventory | Carry list, clickable items | v1 |
| Slot map | Worn / wielded / mounted; clickable to remove/unwield | v1 |
| Engagement | Current activity (walking, climbing, watching lesson, idle); click to cancel | v1 |
| Posture | Sitting / standing / lying / kneeling; folds into prompt | v1 (in prompt) |
| Status effects | Active modifiers | later |
| Skills / mastery | Long-term progression | later |
| Quest log | Current quests + gate state | later |

### Room-state (about the location)

| Panel | Notes | v1? |
|---|---|---|
| Room name + brief | Location title; in status header | v1 |
| Exits | Clickable; `<direction>`-tagged | v1 |
| Things here | Objects in room; clickable | v1 |
| People here | NPCs + players; clickable | v1 |
| Lighting | Band + source attribution | v1 |
| Atmosphere | Temperature, gas mix, pressure, gravity | v1 (demoable) |
| Sound | Ambient + sources | later (with sound subsystem) |
| Time | Local clock | v1 (in header, if world-clock-slate ships) |

### Inspection (focus panel)

| Panel | Notes | v1? |
|---|---|---|
| Focus | When player `examines` / `focuses`, deep-dive: description, details, properties, slots, lighting emitted, contents, ownership, template path (author mode). Auto-updates as focus changes. | v1, central |

### Navigation

| Panel | Notes | v1? |
|---|---|---|
| Local sketch map | Current zone's local cells, exits sketched (text- or SVG-shaped) | v1 |
| Compass | Direction indicator (last move + facing) | v1 (cheap polish) |
| 3D rendered map | "Fancy but separate project" — own slate, own build | later |
| Zone map | Broader campus / region view | later |

### Communication

| Panel | Notes | v1? |
|---|---|---|
| Tell history | Private messages, threaded by partner | v1 if cheap; else terminal-only |
| Say / channel history | Room-scope chatter, scrollable | later; v1 keeps it in terminal |
| Lecture chat | Classroom-mode only | later (with classroom mode) |

### Notifications (always-on)

| Panel | Notes | v1? |
|---|---|---|
| Notification chip | Counts + last few items; click expands; click expanded → mode switch + scroll | v1 |

### Help / education

| Panel | Notes | v1? |
|---|---|---|
| Verb help inline | `?` next to focus panel showing verbs applicable to the focused thing | v1, low-cost |
| MQL examples | Byproduct of the `<mql>` semantic tag — one click reveals the query | v1, byproduct |
| Tutorial overlays | First-30-seconds hints, dismissible | v1 minimal (tooltip-shaped) |

### Author / admin (permission-gated, hidden for normal users)

| Panel | Notes | v1? |
|---|---|---|
| Workspace tree | `pwd` / `ls` rendered as a tree | later |
| Eval scratchpad | Pasted-in `eval` runs with output | later |
| Mudlog / event tap | Server event stream | later |
| Template browser | Browse `/obj/`, `/lib/` | later (big) |
| Reload status | HMR state | later |

---

## Content surface (mode-bound)

A single pane that renders one of several payload kinds, summoned
diegetically (verb / NPC / item). Reserved for non-world content
modes (study, classroom, tutor). Replaces the right widget column
in those modes.

### Payload union (v1 + extensible)

```typescript
type ContentPayload =
  | { kind: 'video'; url: string; transcriptUrl?: string; captions?: string; completionEvent?: string }
  | { kind: 'quiz';   /* later */ }
  | { kind: 'live-stream'; /* later */ }
  | { kind: 'screenshare'; /* later */ }
  | { kind: 'classroom'; /* later */ };
```

v1 ships only the `video` kind (video + transcript). Future kinds
extend the union; the cockpit layout stays the same.

### Diegetic triggers

The server emits a state-sync delta of kind `mode-changed` with a
content payload when a verb / NPC / item summons content:

```typescript
{ kind: 'mode-changed', mode: 'study', content: { kind: 'video', url: '…', transcriptUrl: '…' } }
```

The client switches to study mode and renders the payload. Closing
the content (`dismiss`, `stop watching`, exit the room) is also a
verb that fires another `mode-changed` back to world mode.

### Bidirectional: completion events

Quests need to gate on "you watched the lesson." The content surface
fires a `lesson-completed` event back to the server when the player
finishes the video (configurable threshold). The server stores the
fact on the avatar (probably via a property), and quest validators
read it.

### Future shape: live tutor + classroom

Architecturally accommodated. The payload union extends; the
cockpit layout already has the slot. Live tutor adds video stream
+ screenshare + tell-scoped chat. Classroom adds roster panel +
lecture-scoped chat. Both are content work, not substrate work,
once the substrate ships.

---

## MML semantic tags (Track 1)

The single highest-leverage decision in this slate. Today the
prose pane renders MML as literal text. With semantic tags + a
renderer, every noun in every description becomes a clickable
affordance teaching its own command.

### Tag taxonomy

| Tag | Click preview | Right-click menu |
|---|---|---|
| `<command verb="X">` | `X` | run / copy |
| `<direction dir="X">` | `X` (e.g. `north`) | move / examine exit |
| `<exit id="…" dir="…">` | `look <dir>` | go / examine |
| `<item id="…">` | `examine <name>` | examine / take / drop / put / give |
| `<npc id="…">` | `examine <name>` | examine / talk / follow / attack |
| `<player id="…">` | `examine <name>` | examine / tell / follow / friend |
| `<quantity unit="…" value="…">` | (no click) | copy formatted value |
| `<mql query="…">` | `<query>` | run / copy |
| `<lesson id="…">` | `study <name>` | study / preview |

### The `<mql>` sleeper

Whenever a server-emitted description points at a set of things, it
wraps the relevant phrase in an `<mql>` with the exact query. The
player clicks to re-run the query, copies the syntax to learn it, or
modifies and adapts. This is how MQL provides utility to both new
players (they use it without knowing) and power users (they see
the queries and copy them).

### Renderer contract

- The server emits MML strings; the client parses them into a
  small AST (text spans + tag nodes).
- The renderer maps each tag to a React component that registers
  hover / click / shift-click / right-click handlers per the
  click model.
- Unknown tags render as their text content (forward-compat).
- Colors / sizes / links remain present-day formal tags
  (`<color>`, `<size>`, `<link>`); semantic tags compose with them.
- The renderer is theme-aware: color tokens, not literal hex.

---

## State-sync consumer (Track 2)

The state-sync slate is the source of truth for the wire shape.
This slate covers only the **client-side consumption** pattern:

- Each sidebar widget subscribes to one or more delta kinds at the
  store layer (Zustand).
- Deltas update the store; widgets re-render on store changes.
- The store also drives the prompt format and the always-on
  status header (so they update without re-`look`-ing).
- A widget never re-queries the server to refresh — if state-sync
  isn't telling it something, the widget shows the most recent
  state and waits.

The widgets are small (~50–150 LoC each). Build them in priority
order rather than as one block.

### Initial-state hydration

When the client connects (or reconnects), the server emits an
initial set of state-sync deltas to bring the client up to the
current truth (current room, contents, inventory, slot map,
engagement, lighting, atmosphere, mode). This is the same wire
shape as a normal delta stream — no separate "snapshot" message
type. Just deltas that happen to flow in a burst at connect time.

---

## Character creation (Track 3)

### Hybrid path

Two surfaces, but the modal isn't special — it's a guided sequence
of clickable affordances that each emit real commands.

**(1) Modal wizard.** Three pages, ~30 seconds:

- **Page 1: Identity.** Name (input pre-loads `rename <name>`),
  pronouns (chip pre-loads `set pronouns <choice>`). Each commits
  as its own command on click. Default values from Google profile.
- **Page 2: Look / archetype.** N preset archetypes shown as chips;
  each pre-loads `apply archetype <preset>` (or whatever the
  server-side verb shape becomes). One click = one command =
  starting body plan + outfit + kit applied to the avatar.
- **Page 3: Confirm + enter.** Shows the first-person description
  the engine generates for the avatar after the prior commands.
  "Enter" button pre-loads the server-side ritual command (e.g.,
  `begin` or `look`) — also a real command, no UI exception.

**(2) Diegetic refinement.** After the modal completes, the avatar
lands at the server-configured starting location (today: a freshman
dorm room; later: the campus lounge — entirely a server decision
about where new avatars spawn). From here, every change to the
avatar uses normal in-world verbs.

### Client-side batching when needed

A modal page may need multiple commands (e.g., name + pronouns on
Page 1). The client batches these sequentially: clicking "Continue"
emits the queued commands one at a time, each visible in the input
as it sends. The server treats each as an independent command.
**No server-side multi-command primitive.** This is "just a really
fast typist."

True server-side scripting / batched-execution is deferred to a
future scripting-language pass and explicitly out of scope here.

### Archetypes are content

The slate names the *shape* only:

```
Archetype: {
  name: string,
  bodyPlan: BodyPlanRef,
  outfit: StuffRef[],
  startingKit: StuffRef[],
  description: MmlString,
}
```

Authors fill in the actual presets. The reference app expects
4–5 archetypes spanning the audience's verticals (a degree-track
undergrad, a professional / pro-track, a returning/older student,
a newcomer / language-learning-friendly archetype, and a wildcard
/ custom-later). Specific archetype names and contents are
content-team work; the client doesn't know or care.

### Starting location is server-configured

The cockpit makes no assumption about where new avatars spawn. A
server-side configuration (probably a setting on the Application
or a designated template path) names the starting location. Today
the dorm; later the lounge; the client renders whatever the
server delivers.

### Re-entry and post-modal changes

The modal is one-shot. Subsequent changes (rename, pronoun update,
new outfit, body-plan change, hair, gender) are all in-world verb
work. The verbs **ship universally available** in v1 (permissive).
Future content adds gating via standard means (specific locations,
specific NPCs, payment) — no special "character-services" verb
mechanism. The `rename` verb works the same whether you're typing
it directly or interacting with the campus registrar's clerk; the
clerk just runs the same verb on your behalf after taking your
gold.

### "Enter the world" is a command (open question)

Pinned for awareness, not closed: the "Enter" button on Page 3 of
the modal needs to map to *some* command on the server side. The
options are:

- A new `begin` / `enter` ritual verb that the server treats as
  the end-of-creation handshake.
- A standard `look` (the first observation of the world).
- The existing `Avatar.enter` server-side flow surfaced as a
  client-emitted command.

Decision deferred to requirements / planning. The principle that
*some* command represents this is fixed by the slate.

---

## Prompt line

Always-on. Format is a player-themeable string driven off
`EnvironmentMixin` settings (probably `prompt.format` or similar
keyspace). State-sync feeds the values:

```
[HP:42/50 MV:88/100 Library, sitting on chair (focused: thermometer)] >
```

Format tokens (proposed; concrete vocabulary lands in requirements):

- `%hp` / `%maxhp` / `%mv` / `%maxmv`
- `%location` (current room name)
- `%posture` (standing / sitting / etc.)
- `%engagement` (walking, climbing, watching, idle)
- `%focus` (currently focused thing)
- `%mode` (world / study / classroom / tutor)
- `%time` (local clock)

Default format ships with a sensible subset. Power users theme
freely via the `settings` verb. Same wire principle: changing the
prompt is a real command (`set prompt.format "%hp/%mv %location >"`).

---

## Interactive prompt stack (Polish A)

Builds on the punch-list item "Interactive prompt stack (Framework 11)".
The cockpit-side decision is rendering shape:

- **Inline-in-terminal**, classic MUD style. A prompt appears as a
  numbered list or a yes/no question in the prose pane, the input
  takes the response, the prose pane shows the resolution.
- Not a popover or modal — those break the prose flow and feel
  inconsistent with the rest of the cockpit.

Used for: MQL disambiguation, `are you sure?` confirmations,
multi-step content workflows. Server-side substrate is what
ships first; cockpit just renders.

---

## Envelope rendering (Polish B)

The response envelope ([response-envelope.md](../subsystems/response-envelope.md))
is already flowing. Cockpit-side rendering:

- **Status color signals** on the command that triggered:
  - `ok` — no visual (the prose is the result)
  - `partial` — yellow marker on the affected output line
  - `declined` — orange marker; the command echo shown clearly
  - `error` — red highlight on the input briefly; error chip in
    the terminal with the note `kind` visible
- **Note chips** inline with prose for important kinds
  (`mql-no-match`, `controller-rejected`, `validator-failed`).
  Click to expand for detail.
- **Input echo** stays in the terminal at `system.log.command.*`
  topics. Echoes show the actual command sent, useful for the
  click-to-send teaching loop.

---

## Non-goals

Explicitly out of v1 cockpit scope. Documented so future work
knows where to add them and so investor demos know what's
deferred:

- **3D rendered map** — own project. Renders spatial subsystem to
  a Three.js scene or similar. Demoable but separable.
- **AI-generated location illustrations** — own project. Calls an
  image-gen API on `look`, caches per-location-state, renders in
  a new pane. Demoable but separable.
- **Dedicated content CMS** — content authors use the player
  client + in-game shell (`pwd` / `ls` / `cat` / `clone` /
  `reload` / `eval`) until shell strain justifies a dedicated CMS.
- **Server-side multi-command transactions / scripting language** —
  deferred to a future scripting pass. Cockpit batches client-side
  ("fast typist") in the meantime.
- **Mobile cockpit** — different layout (stream + button bar), same
  wire model. Architecturally accommodated by command-bus primacy;
  layout work is its own slate when it lands.
- **Voice / audio output** — text + visual only in v1.
- **Persistent player profile UI** — character sheets, achievements,
  leaderboards. Later.

---

## Open questions

Pinned for resolution at requirements time.

1. **"Enter the world" verb shape.** What command does the Page-3
   "Enter" button send? (`begin` / `look` / existing
   `Avatar.enter` surfacing.)
2. **Tutorial overlay shape.** First-30-seconds hints — tooltips
   on widgets, an in-prose hint pass, or a dismissible
   highlighted-elements first-load mode?
3. **Notification chip semantics.** What server topics drive it,
   and what's the player-side scoring for "this matters enough to
   ping the chip"? (My instinct: any `world.*` topic where the
   sensor target is the player and the sender is not the player.)
4. **Theme tokens.** One theme for v1 (existing VS-Code-dark is
   fine) or two-three (dark + light + parchment)? Don't oversell;
   pick one well.
5. **Sidebar widget collapsibility.** Each widget collapsible /
   reorderable, or fixed order in v1?
6. **State-sync reconnect snapshot semantics.** What deltas
   replay on reconnect, what's the freshness contract? (Probably
   defers to state-sync slate.)

---

## Suggested build order

The three tracks are largely independent. Track 1 + Track 2 can
be built in parallel by different agents. Track 3 depends on
neither but produces visible product value, so worth slotting
early for demo readiness.

1. **Track 2 substrate first**: state-sync wire shape lands on the
   server (its own slate's build); cockpit's store layer registers
   subscribers and the always-on header + prompt line consume the
   first deltas. No widgets yet.
2. **Track 1 — MML semantic tags**: server emits the new tags in
   existing prose paths; client renderer turns them into clickable
   affordances. Click model implemented here.
3. **Track 2 — widget catalogue**: build the v1 widgets in priority
   order (Exits, Here, Inventory, Slots, Focus, Engagement,
   Atmosphere, Lighting). Each is small and independent.
4. **Polish A — prompt line**: format tokens + setting + state-sync
   feed. Already partly enabled by Track 2 substrate.
5. **Polish B — envelope rendering**: color signals + note chips +
   input flash.
6. **Track 3 — character creation**: modal wizard + archetype
   chips + Page-3 "Enter" verb decision. By this point the
   click-to-send loop is fully built; the modal is just more
   buttons.
7. **Content surface**: payload type `video`, transcript renderer,
   completion event. The `study` mode shipped end-to-end.
8. **Interactive prompt stack rendering**: depends on Framework 11
   server-side punch-list landing first.

---

## Out-of-scope reminders for future selves

Things that are tempting to add but should be resisted in v1:

- **Don't invent new free-floating client modules**. Client follows
  React + Zustand + styled-components conventions already in tree.
  Add new components under `packages/client/src/components/`;
  add stores under `src/store/`; services under `src/services/`.
- **Don't bake content into the client.** Archetypes, starting
  location, mode triggers, lesson catalog — all server-driven.
  The client renders whatever the server sends.
- **Don't add client-only state machines.** Mode is server-driven.
  Engagement is server-driven. Anything the server has authority
  over, the client doesn't shadow.
- **Don't bypass the command bus.** Every mouse interaction emits
  a command. No exceptions for "convenience."
- **Don't pre-empt the mobile slate.** Cockpit is desktop. Mobile
  is its own slate when it lands.

---

## Dependencies

- **[state-sync-slate](./state-sync-slate.md)** — sister slate;
  cockpit's right sidebar can't update truthfully without it.
- **[response-envelope subsystem](../subsystems/response-envelope.md)**
  — already shipped; cockpit's Polish B consumes it.
- **Markup language semantic tags** (roadmap v1 punch list) — server
  emits the tags this slate's renderer expects.
- **Interactive prompt stack (Framework 11)** (roadmap v1 punch list)
  — server-side substrate for inline prompts.
- **World clock** ([world-clock-slate](./world-clock-slate.md)) —
  feeds `%time` token in prompt + status header.
- **Eternal University content** (server-side; out of slate scope)
  — provides the actual starting location and progression. Cockpit
  doesn't know about it directly.
