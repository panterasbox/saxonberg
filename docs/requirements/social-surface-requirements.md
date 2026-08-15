# Social surface (client rebuild, Wave 6) — requirements

Wave 6 of the client rebuild is the **social third** of the product:
reacting to what somebody just did, arguing about it on a board, looking
it up in the wiki, and watching somebody play. It is seeded by
[client-slate](../slates/builds/client-slate.md) § 7 (wave 6) and its
four reference screens — `Reactions and Emotes.dc.html`, `Reactions -
Mobile.dc.html`, `Apps - Forums and Wiki.dc.html`, `Livestream.dc.html`.

The slate calls this wave *"almost pure client — every server half is
already shipped."* **That is not quite true, and the differences are the
reason this doc exists.** Rendering all four mocks and auditing them
against the tree found four real server gaps (a player-readable emote
catalogue, a client-facing subjects/surfaces read, no structured
tuned-target state, per-arrangement pane resolution), one client/server
drift (`act.combat` reactable but never offered), and one mock feature
with no server half at all (wiki page standing). Wave 6 is a client wave
with a server tail, not a restyle.

⚠ **One earlier finding is retracted.** `StreamEmbed` was reported here
as Twitch/YouTube-only. It handles Kick as well — the *file's doc
comment* is stale ("Both platforms are wired" sitting above a
three-platform switch). That is a comment fix, not a feature gap. It is
recorded rather than quietly dropped because the error came from reading
a header instead of the code, which is the exact failure this project
has paid for before.

It is **one build**, not three: the three surfaces are independent
products but they share the frame migration, and splitting them would
make three waves each pay for the same `cockpit.layout` retirement.

Load-bearing background: [forums.md](../subsystems/forums.md),
[reactions.md](../subsystems/reactions.md),
[emotes.md](../subsystems/emotes.md), [wiki.md](../subsystems/wiki.md),
[streaming.md](../subsystems/streaming.md),
[livestream.md](../subsystems/livestream.md),
[cockpit.md](../subsystems/cockpit.md),
[client-shell.md](../subsystems/client-shell.md).

---

## Goals

### The reaction / emote surface

- **The emote picker exists and is server-fed.** Opening the picker on a
  frame shows the catalogue's emoji-bearing emotes as a grid, each cell
  labelled with the canonical verb it sends. The grid's contents come
  from the server, not from a client array.
- **The picker is slot-aware.** An emote whose grammar declares slots
  (`;wave <at> <manner>`) offers those slots rather than being
  unreachable from the grid; typed `stuff` slots resolve by MQL, free
  slots are free text.
- **The picker previews exactly what it sends.** The command bar fills
  with the verbatim command — including the explicit `--msg <gutter#>`
  selector, because the picker is attached to a *specific* frame and an
  implicit "most recent" preview would be a lie by the time it is sent.
- **Every reactable frame offers the affordance, and only reactable
  frames do.** `act.combat` is reactable server-side and is currently
  not offered by the client; a non-reactable frame (a `tell`) says so
  rather than showing a dead control.
- **The phone gets the gesture.** Desktop reveals the bare `+` on hover;
  touch has no hover, so long-pressing a frame opens a bottom sheet with
  a quick row of the most-used emotes and an `all` pull to the full
  slot-aware palette. Existing chips stay tappable inline — a chip is
  its own affordance, so only the *empty* case needs the gesture.
- **Your own acts get a coalesced delta line.** A chip attaching to a
  frame far up the scroll is invisible; the frame is never re-surfaced
  (that would destroy the log), so a single summarising line lands for
  acts of your own only.
- The three channel modes (`prose always` / `threshold` / `counter
  only`) are rendered as the state they are, defaulted from audience
  size, and the running tally is shown as always accruing — the
  threshold governs the prose line, never the count.

### Forums

- **The client learns the Subject model.** The forum surface is
  organised as *one Subject → up to four surfaces*, not as a board list:
  a subject rail, the subject's identity (grain, handle, audience
  binding) in the header, and its lit surfaces as tabs that change the
  *rendering* rather than the room.
- **Unlit surfaces are affordances, not absences.** A subject with no
  argument board shows `+ Argument` as a command the reader can send,
  subject to permission.
- **The argument lens ships as the neutral default.** An argument board
  renders its typed claim graph (`supports` / `objects-to` /
  `responds-to`), marks objections that nothing answers, and derives the
  open count once — the header badge, the row flags and the maturity
  gate copy all read the same array.
- **The popularity board ships its comment tree.** Reddit-shape nesting
  with per-node collapse, a depth ceiling past which the tail becomes a
  *continue this thread* link, and the comment sort axis.
- **The chat surface is the same channel the rest of the client shows.**
  The composer states the command it sends (`chan <handle> <msg>`), and
  the honest boundary between held frames and server history is stated
  rather than papered over.

### Wiki

- The wiki reads inside the same shell as forums, restyled to the civic
  design system, keeping everything
  [wiki.md](../subsystems/wiki.md) already guarantees: the body arrives
  **already rendered and already gated**, and every affordance is a
  command the pane composes.
- **Search is hatched, not faked.** There is no wiki search port; the
  sidebar tree is the only way in and the field says so.

### Livestream

- **`watch` becomes a real mode with two arrangements** (`viewer`,
  `streamer`) rather than two peer layouts.
- **The tuned rail reads structured state.** The set of targets a viewer
  is tuned to — with each one's platform and whether it is read-only or
  read-and-post — exists only as prose from a bare `tune`. The rail
  needs it as state, the way `cockpit.watch` already carries the focal
  target.
- The split between the focal embed and the world feed is
  reader-controlled — `reading` / `even` / `theater` presets plus a
  drag — and the world keeps running underneath it (the never-blind
  law).
- The tuned rail lists every tuned target with its **per-target
  capability** (read-only vs read-and-post) and the interleaved chat is
  tagged per line by platform.
- Standby renders as an overlay with the countdown, never as a frozen
  feed.

### The frame

- **`cockpit.layout` stops driving the client frame.** The client
  renders from `cockpit.mode` + the active arrangement.
  `ForumLayout` / `LivestreamViewerLayout` / `StreamerLayout` become
  arrangements of the `chat` and `watch` modes, and `LAYOUT_REGISTRY`
  is retired from the client. This lands **last**, after the three
  surfaces are rebuilt, so each surface is built against a working
  frame.

### The server tail

- A **player-readable emote catalogue** read surface carrying verb,
  emoji, aliases and declared grammar slots.
- A **client-facing subjects read** carrying, per visible subject:
  title, grain, handle, audience binding, lit surfaces, and the
  unanswered-objection count.
- **A structured tuned-target projection** — a `cockpit.tuned`
  clientState key beside the existing `cockpit.watch`, carrying each
  tuned target's platform and post capability.
- **Per-arrangement pane resolution** — `SHIPPED_ARRANGEMENT_PANES` is
  keyed by mode alone, which cannot express `watch`'s two arrangements.

---

## Non-goals

- **Wiki search and forum search.** Both are recorded unwired in the
  slate's Track C audit. They hatch. Building the ports is its own
  cycle.
- **Wiki page standing / canon (`OFFICIAL`).** The mock badges pages as
  adopted-by-the-Make-chamber. No such concept exists anywhere in the
  wiki subsystem — this is an unbuilt governance feature, not an unwired
  read. **Cut the widget** per the unbuilt-state convention's second
  preference (a badge that says nothing without data). Recorded as a
  design question for the wiki tail.
- **The wiki mock's three derived blocks** — *what it affords*, *seen in
  play*, *composed by*. None is in `WikiPageFrame` and each is a real
  derivation (class-level affordance introspection, per-viewer
  encounter memory, reverse composition index). Cut, not hatched —
  hatching three blocks on one page would make the page read as broken.
- **`rules-chat`.** Parked server-side ([forums.md](../subsystems/forums.md)
  § The four surfaces). It appears in the surface vocabulary as an unlit
  option and nothing more.
- **Voting UI beyond what exists**, and the deferred vote layer the
  maturity gate hands off to.
- **Durable clips + attestation.** Deferred by the handoff and by the
  slate; see [attestation-slate](../slates/builds/attestation-slate.md).
- **The notification bell / held-commands queue.** Both cut in Wave 1C
  for reasons that still hold.
- ⚠⚠ **A `traits` widget, in any form.** The slate forbids it and a
  guard test enforces it; nothing in this wave may introduce a
  subscribable field matching `trait|disposition|personality`.
- **A phone-native redesign of forums, wiki and livestream.** The
  handoff supplies a mobile mock for reactions only. Those three
  surfaces must render *usably* on a phone (single column; the subject
  rail and tuned rail disclose rather than occupy) but the
  interleave-vs-switch redesign that Convention 6 demands waits for
  mocks. **Stated as a scope decision, not an omission.**

---

## Surface decisions

### One build, not three

Reactions, forums/wiki and livestream share almost no code. They do
share the `cockpit.layout` retirement, and cutting the wave into three
would make three builds each carry a partial frame migration or make two
of them wait on the third. One build, three phases, the frame migration
last.

### Forums rebuild to the Subject model rather than restyling the board view

The server has carried *one subject → up to four surfaces* since the
forums build; the client has only ever known Board → Thread → Post and
has **zero references** to the surface vocabulary. Restyling the board
view would leave the client permanently behind its own server and would
have to be undone the first time a subject lights up two surfaces. The
mock is emphatic on the same point (*"the tabs are not navigation …
switching between them changes the rendering, not the room"*), so the
data model and the design agree; only the client dissents.

### The picker's command is the explicit selector form

`re ;nod` — the mock's preview — is a real command (`re` is a shipped
alias of `react`) but it means *the most recent act in view*, which is
not what a picker opened on message 112 does. The preview must be the
`--msg <gutter#>` form. This is the command-line axiom applied at the
place the slate says it binds hardest: *"the most-used interaction in
the product; it is the last place the command line should go quiet."*

### The emote catalogue needs a new read surface, not `soul list`

`soul list` exists and would answer the question, but it is gated by
`requiresCoreAccess` — it is the *authoring* face of the catalogue.
Players need to see the palette, so this is a player-readable read of
the same `EmoteSpec` data (verb, emoji, aliases, grammar), not a
loosening of the author verb.

⚠ The client's current six-emote `QUICK` array with hardcoded emoji is
the anti-pattern this replaces: a hardcoded emoji/verb pair drifts from
the catalogue silently, and the convention is explicit that "just for
now" is not a carve-out.

### The wiki lives in `chat` mode as a second arrangement

The mode vocabulary is closed and shipped (`chat` · `play` · `watch` ·
`build` · `govern`), and the wiki is a reading surface for the social
half, not a sixth mode. `chat` grows a second arrangement the way
`watch` already carries `viewer` + `streamer` — the precedent is
already in `COCKPIT_ARRANGEMENTS`.

### Forums, wiki and livestream do NOT ride the MQL pane catalogue

`Panes.ts` serves MQL subscriptions over **Stuff**. Forum subjects are
Documents, the wiki page arrives on its own `world.wiki.page` channel,
and stream state is pushed as `StreamStateEnvelope`. These surfaces keep
their existing channels; an arrangement in `chat` or `watch` selects a
**composition**, not a pane set. `SHIPPED_ARRANGEMENT_PANES` stays empty
for those modes, which is what its own comment already says it is for.

### The frame migration lands last

`cockpit.layout` is a compatibility projection that is *meant to die*,
and forum / livestream-viewer / streamer are the three non-`world`
values left on it. Retiring it first would put a large refactor before
any visible progress and would force each surface to be built twice;
retiring it last means the surfaces are built against a frame that
works, and the deletion is the closing move.

### `REACTABLE_TOPICS` carries three copies of `speech.vocal`

A leftover of the S2 topic collapse — three distinct speech topics
collapsed onto one name and the duplicates were never removed. Harmless
(a `Set` dedupes) but the literal states a set size that is not real, and
the same pattern sits in the client's livestream `CHAT_TOPICS`. Both are
corrected in this wave, since this is the wave that reads them.

---

## Constraints

- ⭐⭐ **Never render a figure the server did not send**
  ([client-slate](../slates/builds/client-slate.md) § 3.1, `CONVENTIONS.md`
  § 1). Three states must look nothing alike: live, empty-with-a-reason,
  and hatched-not-wired. Order of preference: ship the surface and hatch
  the value; cut the widget if it says nothing without data; seed the
  world. **Never hardcode, including "just for now"** — which is
  precisely what the current `QUICK` palette does.
- ⭐ **Derive every figure from the data that produces it.** The
  argument board's open count appears in three places (header badge, row
  flags, maturity gate copy) and must be one derivation over the
  rendered array.
- ⭐ **The command line is never silent.** Every clickable previews the
  exact command it sends — desktop in the status bar on hover, mobile in
  the command sheet.
- **The client owns zero command semantics.** A mode switch, a surface
  switch, a vote, a reaction and a tune are all real commands on the
  wire.
- **Registers are mode-scoped, not frame-scoped** (§ 3.7) — the terminal
  keeps a neutral ground in every mode.
- ⚠⚠ **A component test proves rendering, never wiring.** The Wave 4
  build shipped an entire dead mobile pane surface with every mobile
  component test green. Any hook that must run for a surface to be alive
  belongs at the layout, with a source-level guard test in the
  `layouts/__tests__/wiringAtTheLayout.test.ts` shape, plus a live drive
  before "done".
- **Prose never hedges** and **commands refuse honestly** — the two
  carve-outs from the hatching rule.
- The `Api` ↔ logic-singleton split is mandatory for any new server
  surface; no new free-floating modules
  ([CLAUDE.md](../../CLAUDE.md) § Module Categories).
- Safe areas on mobile: 62px top, 34px bottom, with the sticky-footer
  bleed the shipped mobile chrome already uses.

---

## Acceptance criteria

**Reactions / emotes**

1. Opening the picker on a frame renders a grid whose cells come from a
   server read, each labelled with its canonical verb; a test asserts no
   emoji/verb literal survives in `ReactionBar`/picker source.
2. Selecting a slot-bearing emote renders one control per declared slot
   and composes a command containing them.
3. The composed command is the `--msg <gutter#>` selector form, and a
   test asserts the previewed string equals the sent string.
4. A `act.combat` frame offers the reaction affordance; a `tell` frame
   does not.
5. Long-pressing a frame on a touch viewport opens the sheet with the
   quick row and the `all` pull; tapping an existing chip reacts without
   the gesture.
6. A reaction to one of your own acts produces exactly one coalesced
   line; a reaction to somebody else's produces none.
7. `REACTABLE_TOPICS` and the client's `CHAT_TOPICS` contain no
   duplicate entries.

**Forums**

8. The subject rail lists visible subjects with their lit surfaces, and
   selecting one renders that subject's header (grain, handle, audience
   binding) from server data.
9. A subject's unlit surfaces render as `+ <Surface>` controls that
   preview a real command.
10. An argument board renders the typed claim graph, flags objections
    nothing answers, and the open count in the header, the row flags and
    the maturity-gate copy are provably one derivation (a test changes
    the array and asserts all three move).
11. A popularity post opens its comment tree with working collapse and a
    *continue this thread* link past the depth ceiling.
12. The chat surface's composer states its command and the
    held-vs-server-history boundary is rendered as a real statement.

**Wiki**

13. The wiki renders inside the shared shell; the body is the exact
    gated MML the server sent (unchanged from today's guarantee).
14. The search field renders in the hatched not-wired treatment, and a
    test asserts it is not an input that silently does nothing.

**Livestream**

15. The tuned rail renders from structured server state, not from parsed
    prose, and a test asserts a newly-tuned target appears without a
    reconnect.
16. The three split presets and the drag all change the focal share, and
    the world feed remains visible in every one of them.
17. The tuned rail renders each target's read/post capability from
    server state, and the composer for a read-only target is not live
    (Convention 3: controls branch on the state their copy describes).
18. Standby renders the countdown overlay over the last frame, never a
    frozen feed presented as live.

**The frame**

19. Nothing in `packages/client` reads `cockpit.layout`;
    `LAYOUT_REGISTRY` is deleted and the frame renders from
    `cockpit.mode` + arrangement. A grep-shaped guard test enforces it.
20. `layout forum` / `layout streamer` (legacy strings a player may have
    persisted) still land the player in the right place through
    `LEGACY_LAYOUT_MIGRATION`.

**Cross-cutting**

21. Every wiring hook the three surfaces need is called at the layout,
    asserted by a source guard in the
    `wiringAtTheLayout.test.ts` shape.
22. No subscribable field name matching `trait|disposition|personality`
    is introduced; the existing guard still passes.
23. The build is driven live — all three surfaces, on a desktop viewport
    and a phone viewport — before it is called done.
24. Subsystem docs updated: `reactions.md`, `emotes.md`, `forums.md`,
    `wiki.md`, `streaming.md`, `livestream.md`, `cockpit.md`,
    `client-shell.md`. The client-slate's wave table marks Wave 6
    shipped and records where the build diverged from the mocks.

---

## Cross-references

- **Seeding slate** — [client-slate.md](../slates/builds/client-slate.md)
  § 7 (wave 6), § 3.5 (the command line is never silent), § 6 (a
  reaction is an ordinary emote), § 4.3 (Track C's unwired list).
- **Reference screens** — `docs/design_handoff/`: `Reactions and
  Emotes.dc.html`, `Reactions - Mobile.dc.html`, `Apps - Forums and
  Wiki.dc.html`, `Livestream.dc.html`, plus `CONVENTIONS.md` and
  `DESIGN-SYSTEM.md`.
- **Subsystem docs** — [reactions.md](../subsystems/reactions.md),
  [emotes.md](../subsystems/emotes.md),
  [forums.md](../subsystems/forums.md),
  [chat.md](../subsystems/chat.md), [wiki.md](../subsystems/wiki.md),
  [streaming.md](../subsystems/streaming.md),
  [livestream.md](../subsystems/livestream.md),
  [cockpit.md](../subsystems/cockpit.md),
  [client-shell.md](../subsystems/client-shell.md),
  [mql-subscription.md](../subsystems/mql-subscription.md).
- **Deferred neighbours** —
  [attestation-slate](../slates/builds/attestation-slate.md) (clips),
  the wiki tail (page standing / canon), and whatever cycle builds the
  wiki and forum search ports.
