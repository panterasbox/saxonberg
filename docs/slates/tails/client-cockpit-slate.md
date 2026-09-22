# Client cockpit slate (working doc)

> **Status: PARTIAL** — the tracks shipped: MQL subscriptions, MML
> semantic tags + the click model, the widget shelf, the inspection card,
> the prompt stack, char-gen, and the one `cockpit`
> verb with its mode × arrangement axes →
> [cockpit.md](../../subsystems/cockpit.md) +
> [card-surface.md](../../subsystems/card-surface.md)
> **Left:** the `study` and `classroom` modes + their diegetic
> `mode-changed` trigger (⚠ contradicts cockpit.md's no-auto-switch rule;
> this is the *Educational* row of client-shell-slate's use-case matrix,
> tracked only here since the cluster pass)
> · the content surface (video + transcript payloads, diegetic triggers,
> completion events) · the live-tutor / classroom shape · the `<mql>` /
> `mudq:` sleeper, still inert by design · the navigation panels (sketch
> map · compass) · tell history · the notification chip / tray (client-slate's
> tray rule absorbed here; the substrate is notification-slate) ·
> tutorial overlays · the author/admin panel set
> (uncertain against cms.md / diagnostics.md) · the post-intake identity
> verbs (`rename` / pronouns / appearance — contradicted by client-shell.md
> § Character select) · envelope status / note rendering (uncertain) ·
> the self-state panels not on a card (status effects · skills · quest log)
> **Size:** a wave

Working slate for the **reference web client** — the affordance-first
cockpit that sits on top of the existing command-bus + MML wire and
turns the server's structured world model into a UI that's intuitive
for new players and powerful for power users, while staying honest
about what this app actually is: a CLI-in-a-browser whose primary
audience is investors getting demoed the engine.

**Audience.** The reference app's primary demo audience is potential
investors. The secondary audience is a generic education vertical
whose learners consume content primarily through video and transcripts.
A content-author persona exists but is explicitly **not** the client's
target — content authors use the same player client with elevated
permissions and the in-game shell, until the shell strains under real
authoring pressure and a dedicated CMS is justified.

See also:

- [docs/subsystems/response-envelope.md](../../subsystems/response-envelope.md)
  — the structured per-dispatch wire channel. Cockpit consumes it to
  render `Status` color signals and `Note` chips alongside prose.
- [docs/slates/mql-subscription-slate.md](../tails/mql-subscription-slate.md)
  — the client-driven live-state substrate. Cockpit's right-
  sidebar widgets are MQL-subscription consumers. Each widget
  declares its query + field-set; the substrate ships the
  initial result and diff deltas.
- [docs/subsystems/messaging.md](../../subsystems/messaging.md) — MML
  prose channel + Scene composer. Cockpit's prose card is an MML
  consumer that gets new semantic tags from this slate.
- [docs/subsystems/command-parsing.md](../../subsystems/command-parsing.md)
  + [command-routing.md](../../subsystems/command-routing.md) — the
  command bus. Cockpit's central principle is **everything routes
  through here.**
- [docs/runtime-model.md](../../runtime-model.md) — wire timing and
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

The three corollaries are settled: no special-case UI primitives ([cockpit.md](../../subsystems/cockpit.md) — *the client owns zero command semantics*); client-side batching is superseded by real server-side scripting ([scripting.md](../../subsystems/scripting.md)); mobile is the same wire ([client-shell.md § The command sheet](../../subsystems/client-shell.md)).

---

## The click model — shipped in a different shape

→ [cockpit.md § The preview surface + click model](../../subsystems/cockpit.md) and [client-shell.md § The command sheet](../../subsystems/client-shell.md): hover previews in the **status bar**, click sends un-moded, **shift-click / right-click copy**, right-click / long-press on a named thing opens the **affordance radial**; on a phone a tap opens the **command sheet** naming the verbatim command before it sends.

---

## Modes

The cockpit reshapes around what the player is currently doing.
Modes exist because cognitive load — not pixel real estate — is the
design constraint. A player engaged with a video lesson is not also
parsing the prose card at full attention; a player walking through
a dungeon is not also consuming structured study content. So the
layout reflects mode.

### Mode catalogue (v1 and later)

| Mode | Trigger (diegetic) | Layout shape | v1? |
|---|---|---|---|
| **World** | Default | Terminal large, widgets sidebar | v1 |
| **Study** | `study <thing>`, examine a textbook, interact with study NPC | Content card large, terminal compressed | v1 |
| **Classroom** | `attend lecture`, enter a classroom location | Content huge, roster panel, lecture-scoped chat | later |
| **Tutor** | `call tutor`, summon a live tutor NPC | Tutor stream + tutor chat prominent | later |

### Mode-switching is server-driven

The server tells the client what mode it's in via an
`mode-changed`-shaped envelope (mode is high-level cockpit state,
not really MQL-queryable; it rides a small dedicated push channel
alongside the subscription substrate). The client never decides on
its own. This means:

- Same verb (`study textbook`) flips the layout automatically,
  because the verb fires a server-side mode change that ripples to
  the client.
- A quest gate that drops a player into a classroom does so without
  the client having to know it's a classroom.
- A `cancel` or `dismiss` from the player flips back to world mode
  on the server first, then the client follows.

### Admin `mode` verb — superseded by `cockpit mode <name>` ([cockpit.md § One verb](../../subsystems/cockpit.md)), an ordinary ungated command: *a mode is a view, never a gate*.

---

## Cockpit layout

### Always-on minimum — shipped in a different shape: the `Frame` bar (seal · connection chip · identity · widget shelf · Views · Settings), a command bar, and the status bar → [client-shell.md § The top bar](../../subsystems/client-shell.md). The notification chip is **cut, not deferred** (§ The top bar: *no notification bell*).

### World mode — shipped as `play` with the card FEED in the right column → [cockpit.md § The two axes](../../subsystems/cockpit.md), [card-surface.md](../../subsystems/card-surface.md).

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

### Mobile — shipped, and not as a stream + button bar: cards inline in the feed, named views on the strip, the two-row bar + pull-down, the command sheet → [client-shell.md § The mobile bar](../../subsystems/client-shell.md), § The phone's play surface.

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

#### Absorbed from client-slate — § 7.2 (the notification tray)

> Deferred, designed but not scheduled: […] notifications — designed only
> as a stub, and `NotifyPolicy` / `NotifyRule` should be read before the
> UI is designed, because what belongs in that tray is *whatever the
> receiver said they wanted*, not everything that happened.

(The tray's absent-tense substrate is
[notification-slate](../builds/notification-slate.md);
[client-shell.md § The top bar](../../subsystems/client-shell.md) records
why no bell is even placeholdered.)

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

A single card that renders one of several payload kinds, summoned
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

The server emits a `mode-changed` envelope (small dedicated mode
channel) with a content payload when a verb / NPC / item summons
content:

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

### Tag taxonomy — superseded by the shipped `KNOWN_TAGS` (`api/mml/tags.ts`: `player` · `npc` · `thing` · `location` · `exit` · `direction` · `quantity` …; `item`/`object`/`name` collapsed, `actor` is an authoring face) → [messaging.md § The identity tags](../../subsystems/messaging.md). `<mql>` and `<lesson>` are not in the vocabulary.

### The `<mql>` sleeper

Whenever a server-emitted description points at a set of things, it
wraps the relevant phrase in an `<mql>` with the exact query. The
player clicks to re-run the query, copies the syntax to learn it, or
modifies and adapts. This is how MQL provides utility to both new
players (they use it without knowing) and power users (they see
the queries and copy them).

---

## MQL-subscription consumer (Track 2) — superseded by [card-surface.md § One birth path](../../subsystems/card-surface.md): widgets do NOT issue MQL; the client's one self-opened subscription is `chrome: 'self'` (the shelf), every card is server-pushed by a command, and reconnect replays only that one subscription (§ Reconnect behavior).

---

## Character creation (Track 3) — superseded by [char-gen.md](../../subsystems/char-gen.md): the `enroll` draft machine + `enroll confirm` commit/spawn, the species dossier + NameBank, `startLocation` ([location.md](../../subsystems/location.md)); the archetype is a stamp ([identity.md](../../subsystems/identity.md)).

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

---

## Prompt line — shipped as `prompt.format`, a **Liquid** template (default `{{ focus }}>`), rendered by `PromptStrip` → [prompt.md](../../subsystems/prompt.md), [shell-environment.md](../../subsystems/shell-environment.md). Further context variables (posture · location · time) land additively in the prompt-context builder; the `%token` grammar above did not ship.

---

## Interactive prompt stack (Polish A) — shipped → [prompt.md](../../subsystems/prompt.md); the prompt card opens PINNED and auto-releases when answered ([card-surface.md § What the five holds became](../../subsystems/card-surface.md)).

---

## Envelope rendering (Polish B)

The response envelope ([response-envelope.md](../../subsystems/response-envelope.md))
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
6. **Subscription reconnect semantics.** Client maintains a list
   of active subscription kinds; on reconnect, re-subscribes each.
   First result envelopes hydrate widgets. Mid-reconnect message
   loss is invisible because each subscription's initial-result
   is authoritative. Pin freshness contract at requirements.

---

## Dependencies

- **[mql-subscription-slate](../tails/mql-subscription-slate.md)** —
  sister slate; cockpit's right sidebar can't update truthfully
  without it.
- **[response-envelope subsystem](../../subsystems/response-envelope.md)**
  — already shipped; cockpit's Polish B consumes it.
- **Markup language semantic tags** (roadmap v1 punch list) — server
  emits the tags this slate's renderer expects.
- **Interactive prompt stack (Framework 11)** (roadmap v1 punch list)
  — server-side substrate for inline prompts.
- **World clock** ([time.md](../../subsystems/time.md)) —
  feeds `%time` token in prompt + status header.
- **Eternal University content** (server-side; out of slate scope)
  — provides the actual starting location and progression. Cockpit
  doesn't know about it directly.
