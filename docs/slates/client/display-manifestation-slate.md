# Display manifestation — a screen shows content; the content knows how it renders

> **Status: PARTIAL** — the three-arm `DisplayKind`, prose as a real
> arm and `shows` shipped 2026-08-30 (MR !206) →
> [display.md](../../subsystems/display.md)
> **Left:** driver policy off the closed `pairing` enum and onto
> `AccessApi.can` · the network / channel / guide addressing layer ·
> multiple simultaneous sources per screen · one shared wire shape for
> display projection (video push / card push / prose-read stay three
> mechanisms) · ⭐ (2026-11-18) the page boundary — one screen for on-page
> and off-page sources, the on-page relay source, glance and watch, the
> off-page program guide, video mode for off-page only
> **Size:** a wave

*Design slate, 2026-08-30, from the libations review (MR !206). The
founder, on the substrate I shipped in D12: **"DisplayMixin is all over
the place… it's conflating a lot of things and none of them are super
well defined."** Correct. This document is written **before** the
context compact deliberately, so the design survives in the repo rather
than in a conversation summary — the same rule every other ruling in
this review followed.*

## ⚠ `pairing` is a fourth kernel list

A closed four-value enum the kernel owns, so a pack that wants a fifth
pairing edits the kernel. That is structurally identical to three things
this same review deleted — `ToolCapability`'s verb table, the closed
`Technique` union, `GENERIC_*_MATERIAL` — under the rule *when a
peripheral thing needs a central list edited, the list is in the wrong
place*. See [antipatterns.md](../../antipatterns.md).

## The decomposition

```
Screen (Thing)            location, look-at — thin
  ├─ driver policy        who may change it: authored, not a kernel enum
  └─ showing → Content

Content                   carries its KIND, which decides the client component
  ├─ video    live | recorded   → the video surface
  ├─ card     an app: controls + feedback → the card rail
  └─ prose    ordinary game text → the text stream

Network / channel         OPTIONAL, LATER: how content is organised and found
                          (a guide, a feed) — addressing, never rendering
```

### Consequences worth stating

- **One projection, one wire shape.** "The display you can see shows X"
  becomes a single per-viewer projection carrying a discriminated kind,
  rather than `cockpit.watch` for one arm and `CardApi.push` for another.
  The `display` marker on `WatchTarget` stops being an inference. Still
  open — [display.md](../../subsystems/display.md) § *What the client
  changed* confirms this consolidation "stays open, and would be its own
  build."
- **Driver policy leaves the kernel enum.** Either authored on the row,
  or expressed through `AccessApi.can(actor, action, resource)` — which
  is already the project's answer to "who may do this to that."

## From the smell and taste requirements (2026-11-07)

The owner: screens get a full design conversation of their own, which will probably
change how they work dramatically. So `DISPLAY_KINDS` and `DISPLAY_PAIRINGS` stay
counted by `lint:closed-vocabularies` until then. One input for that conversation:
pairings look like the conditions in [locks](../../requirements/locks-requirements.md).
`held` and `remote` are "a thing held", and `staff` is "named in a record", so a screen
might declare conditions the way a lock does rather than keep a second list.

## ⭐⭐⭐ The page boundary — one screen, on-page and off-page (2026-11-18) **[DECIDED in shape — the owner]**

Talked through with the owner out of the recording thread
([photography-slate](../trades/photography-slate.md) — *off-page* work is real-world creative work brought into
the game, *on-page* is what the game renders) and broadcasting ([broadcasting-slate](../trades/broadcasting-slate.md)).
The owner: *"The interesting thing is we want a single screen that can be used for off-page or on-page video,
and both are explained and justified despite coming from different sources."*

### The three crossings of the page

| direction | what it is | built? |
|---|---|---|
| **off-page → on-page** | real media shown in the world — a stream on a screen, uploaded art | ✅ `watch`, `tune`, video on displays |
| **on-page → off-page** | the game's own content leaving into real media — a streamer's client on Twitch | ✅ the overlay, and **redaction** ([broadcast-ready-slate](../platform/broadcast-ready-slate.md) § *The page boundary*) |
| **on-page → on-page** | the world recording and broadcasting itself — a camera in the Assembly hall feeding Dave's Bar, a reporter live, radio, television | ❌ nothing yet |

### ⭐⭐⭐ One screen, any source **[DECIDED — lenses 2, 3a]**

**A screen is a receiver: it shows what it is tuned to, and the source carries its own origin.** Off-page and
on-page are two kinds of signal arriving at the same screen, never two kinds of screen.

- ⭐ **One rule justifies both: every signal says where it came from.** **On-page** comes from a camera or
  microphone in the world, carried by the town's aether node or a station's transmitter — inside the fiction,
  obeying perception (whispers out of range uncaptured; tells and DMs never captured — they travel on the aether,
  not through the room), so it needs no redaction. **Off-page** comes from beyond the world — a real person on a
  real camera; the aether reaching everywhere is the in-fiction reason it arrives at all, and **the screen marks
  it out of fiction**. The fiction never pretends one is the other.
- ⭐ **A new source kind: the on-page relay** — a place's perception relayed live, in prose, to a screen elsewhere:
  the recording model ([photography-slate](../trades/photography-slate.md)) played back with no delay, carried by
  the aether node anywhere it is allowed, a television station (Signal), or radio for sound only (Electric).
- **A venue programs its screen** with the command that exists — `watch … on <screen>`; a bar showing the Assembly
  floor live is civic life (the C-SPAN idea). **Whether the Compact's floor is televised is the polity's choice.**
- **A screen in a covenant town is dark** where its operation is forbidden.

### ⭐⭐⭐ Glance and watch — what the client does **[DECIDED — the owner]**

The owner: *"If a screen is showing on-page content, it's just rendered as prose like any other content. But if
it's off-page content, perhaps there's prose, but you can also switch your client cockpit into live video mode
where you actually get a video player. This option is not available for on-page content. The UI needs to handle
this."*

| | **glancing** (you are in the room) | **watching** (you attend to the screen) |
|---|---|---|
| **on-page** | one line — *"the screen shows the Assembly floor, live"* | **the relay in prose**, like any other content — *"On the screen, the member for Hinkley rises to speak…"*; **no video mode exists for it** |
| **off-page** | one line, marked out of fiction | **switch the cockpit into video mode** — a real player — with prose alongside |

Both kinds share the two steps; only what *watch* opens differs, so a screen is always a thing you look at or
attend to.

**Off-page prose is a program guide** — the game never captures or judges off-page work, so its prose is only what
the streamer declares about their own show, which the stream already carries: **its topic, its agenda and the
current segment, its live phase** — *"On the screen:* Saturday Night at the Bowl*. Now: 'The Fork,' segment three
of five."* Honest, from metadata the streamer controls, updating as segments advance. (This is this slate's
*network / channel / guide* layer, given its first content.)

**What the UI must handle:**

1. **Each source declares its side of the page**; the client reads that one flag to decide the rest.
2. **The room line** for an off-page source carries the out-of-fiction mark and a **watch action that opens video
   mode**; an on-page source's watch action opens its prose relay — the same action, a different result.
3. **Video mode only for off-page sources** — an on-page feed has no video, only the world's prose.
4. **Watching an on-page screen is attention** — ambient, one line or an occasional summary, so a live feed never
   floods the room; watching gives the full relay ([social-graph.md](../../subsystems/social-graph.md)'s attention
   model).
5. ⚠ **Nobody is ever required to use video** — text-only clients, screen readers and slow connections get the
   program guide, and nothing in the game depends on seeing the video: accessibility, and the honest version of *a
   text game that is not only text*.
6. **Viewer controls** — video mode is the viewer's choice, never autoplay; sound the viewer's too; on mobile, video
   mode fits the mobile layout.
7. **Leaving video mode** returns the cockpit to how it was ([cockpit.md](../../subsystems/cockpit.md)).

### Lens pass

1. **Pedagogy** — the page boundary as a learnable concept, three crossings with their own rules; a screen as a
   receiver is derivable; an on-page feed obeys the recording rules.
2. **Expression** — one screen, any source; the on-page relay a new source kind; venues program screens with the
   existing command.
3. **3a Immersion** — one rule justifies both; off-page marked out of fiction; on-page within perception.
   **3b Participation** — venues programming, the legislature on television, reporters live, streamers on screens
   wherever venues choose.
4. **Values** — what a venue shows; whether the floor is televised.
5. **Continuity** — an on-page feed's carrier by rung (aether node, television, radio); covenant screens dark; one
   command on every rung.
6. **Economy** — venues as outlets, channels as producers, sponsors; the cost is a build (a new source kind; the
   stream split in broadcast-ready).
7. **Governance** — see broadcast-ready-slate § *The page boundary*: the person's stream, redaction as the
   boundary control, reaching every player as a granted tool.

### Open

1. **Relayed chat as captions** under an off-page screen — yes, no, or the viewer's choice? It is off-page content
   too, needing the relay's moderation of external chatters.
2. **How often an ambient on-page screen summarizes**, and in what words.

## ⚠ Open questions the build must answer

1. **Does prose project per-viewer, or is it an ordinary scene message?**
   — Answered: neither. Prose does not project at all — see
   [display.md](../../subsystems/display.md) §§ *Prose has no projection,
   and that is the finding* and the `teleport` verb entry.
2. **What happens when a viewer cannot render a kind?** A text client
   and a video source; an interactive card pushed to something with no
   rail. The kind being explicit is what makes this answerable at all.
3. **Is `showing` one slot or many?** A screen showing a card *and* a
   ticker is a real thing. One slot is the current assumption and may be
   wrong.
4. **Where does the driver policy live** once it leaves the enum — an
   authored predicate on the row, or an `AccessApi` action?

## Cross-references

[display.md](../../subsystems/display.md) (what shipped; the mixin is
the subject since `DisplayApi` was deleted) ·
[card-surface.md](../../subsystems/card-surface.md) (the card arm's
birth path) · [streaming.md](../../subsystems/streaming.md) +
[cockpit.md](../../subsystems/cockpit.md) (the video arm and
`cockpit.watch`) · [messaging.md](../../subsystems/messaging.md) (the
prose arm's likely mechanism) ·
[access.md](../../subsystems/access.md) (where driver policy may belong)
· [antipatterns.md](../../antipatterns.md) (the kernel-list rule).
