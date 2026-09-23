# Message rendering & styling slate (working doc)

> **Status: PARTIAL** — Waves 1–3 shipped nearly whole: the tagged-
> complete-string rendering model, the three tag categories (semantic /
> layout / presentational), the flatten discipline, the client
> stylesheet engine + three themes, per-message-type templates,
> Discord-dialect markdown → MML, `<list>`/`<table>`, custom URI scheme
> links, mentions, and the reader-owned `style` verb overlay (including
> per-channel color) →
> [message-rendering.md](../../subsystems/message-rendering.md).
> **Left:** the rest of the bounded layout vocabulary — `<box>`,
> `<rule>`, `<indent>`, `<columns>`/`<col>`, the `align` attribute — and
> the authoring-freedom gate (system/content free, a player in chat
> gated) that none of them have; the richer **channel-admin-authored**
> stylesheet (custom semantic tags + a constrained presentational
> palette, as channel config) and its distribution to clients — distinct
> from the reader-side per-channel color that already shipped; the
> generic-class MML hook those custom tags would need.
> **Size:** a tail — a small, speculative extensibility surface. Per the
> 2026-08-08 audit this may not be wanted at all; the theme/overlay
> cascade and the cockpit layout work plausibly already cover what it
> was for. Decide before building, don't just build it.

Working slate for **client-side message rendering**. The driver was
"different colors for different channels," but the real subject is the
whole pipeline: an MML string that **captures everything** (the founding
rule) yet can be **richly re-laid-out and styled** by the client.

See also:

- [docs/subsystems/messaging.md](../../subsystems/messaging.md) — current
  MML + the Scene composer. This slate **extends** MML (it's "not fully
  formed") and adds the rendering/flatten model; it doesn't redefine the
  composer.
- [comms-slate.md](../tails/comms-slate.md) / [chat-slate.md](../tails/chat-slate.md) /
  [emotes-slate.md](../builds/emotes-slate.md) — the message *types* this renders
  (say/tell/chat/emote); each is a per-type render template.
- [access-slate.md](../tails/access-slate.md) — **authorization gates** layout
  tags and channel presentational stylesheets (system/authors free;
  players channel-gated). Channel stylesheets are channel config set by
  admins (control-over).
- [social-graph-slate.md](../tails/social-graph-slate.md) /
  [recognition-slate.md](../tails/recognition-slate.md) — friend/foe **name
  coloring** = an MML `stuff-id` attribute resolved against the viewer's
  bucket.
- [client-cockpit-slate.md](../tails/client-cockpit-slate.md) /
  [console-filtering-slate.md](../tails/console-filtering-slate.md) — the
  buffers/tabs this renders *within*; the gutter ids.
- [docs/design-philosophy.md](../../design-philosophy.md) — Principle 3
  (layered presentation): compose semantics once, serialize per the
  reader's settings.

---

## The styling engine

Styling is a **client stylesheet** mapping semantic **selectors** →
visual **treatments**. The reader's theme is the floor; channel sheets
are scoped enrichment on top.

**Selectors:**

| Selector | Drives |
|---|---|
| **topic** (cascading by prefix) | system dim, errors red, combat orange, speech italic — style `world.speech.*`, override `…shout` |
| **channel / tags** | per-channel color (the driver), whisper dim, DM treatment |
| **MML element / class** | names, speech-quotes, items, directions, emphasis |
| **MML attribute → viewer state** | friend/foe **name coloring** (`stuff-id` → social-graph bucket), your-own-name, item rarity |
| **content match** | mentions (your name → line highlight), user highlight words |

**Treatments:** fg/bg color, bold/italic/dim/underline, chip/badge/
prefix, indent/placement — and since it's a real web terminal (React),
richer than a TTY (hover, click-expand).

**Preferences** persist as settings (`EnvironmentMixin`, cross-device)
for the meaningful ones (channel colors, highlight words, theme); the
server owns the *semantic vocabulary*, the user owns the *visual
mapping*.

---

## The layout library (bounded)

A small, terminal-appropriate, flatten-disciplined set — not a CSS box
model:

- **Block flow:** `<block>`/`<p>`, `<rule/>`, `<indent>`, `<box title?>`
- **Positional (escape hatch, low-priority):** `<columns>`/`<col>`
- **Inline:** `align` as an *attribute*; sizes **relative + clamped to
  viewport** (no absolute widths, no 80-col assumptions)

Constraints: bounded nesting, sandboxed (can't overflow / take over the
screen), responsive reflow, reader can collapse to flatten. **Authoring
freedom is gated** — system + content authors use layout freely
(`who`/score/shop/notices); a *player* using layout in a chat message is
channel-gated (the abuse surface). Tags exist in core; *emitting them in
a context* is an access decision.

---

## Channel stylesheets (the scoped opt-in)

A channel may attach a stylesheet (part of its **config block**, set by
channel admins per the access model) that extends its members' vocabulary:

- **custom semantic tags** meaningful to the community (a trade channel's
  `<listing>`, RP `<ooc>` brackets) — sugar the client renders specially;
- a **constrained presentational palette** (`<blue>`, bounded safe set —
  no raw CSS) for manual coloring;
- **presentational layout** (the heavier `<box>`/`<columns>` cases).

Scoped to that channel + its members; **unknown/declined tags degrade to
failsafe text**; the **reader can always strip to plain.** This is how
manual coloring/custom tags exist *somewhere* without polluting the
global semantic core. (Designed-for; v1 ships core semantic + reader-side
per-channel color, channel sheets later.)

---

## Open questions

Resolved and shipped, per
[message-rendering.md](../../subsystems/message-rendering.md): dialect
(Discord-style) → `Mml.markdownToMml`; flatten default (lean Markdown,
emphasis-preserving) → `Mml.flatten`; markdown subset size (lean common
set) → the "Recognised forms" list; links (restrict to in-world refs /
gate external URLs) → "Custom URI schemes" (`mudcmd:`/`mudref:`/`mudq:`,
`http(s)` stripped); reader-override granularity (both global and
per-channel) → `cockpit style plain` / `cockpit style plain channel`;
parse locus (server-authoritative) → `Mml.markdownToMml`. GFM table
input-sugar shipped in a layout-allowed context, but the wiki's article
dialect, not a chat channel — see
[wiki.md](../../subsystems/wiki.md); chat still has no `<table>` input
sugar.

Still open:

1. **`<pre>` / `<columns>`.** `<pre>` shipped; `<columns>` remains
   low-priority vs `<table>`.
2. **Generic-class MML hook** — add the mechanism now (custom channel
   tags need it) vs fixed tags only? *Lean: add the hook* so styling/
   custom-tags are extensible without minting an MML tag per need. (The
   wiki's component-candidate resolution is a related but separate
   pipeline, scoped to the wiki, not chat channels.)
3. **Channel stylesheet distribution** — how a channel's sheet reaches
   clients (fetch on tune-in? format?). New plumbing; flag.

---

## What this slate does NOT cover

- **The message/comms semantics** (what a say/chat/emote *is*) → comms/
  chat/emote slates. This renders them.
- **The MML composition / Scene pipeline internals** → messaging.md;
  extended here, not redefined.
- **Client cockpit buffers / tabs / filtering** → cockpit + console-
  filtering slates; this is per-message rendering *within* them.
- **The authorization mechanism** → access slate; consumed to gate
  layout/presentational/channel-sheets.
- **Reactions rendering** → reactions slate (the train animation etc.);
  this provides the message styling those sit on.

---

## Once shaped into formal requirements

Channel-stylesheet distribution, the generic-class-hook details, and the
rest of the layout tag vocabulary (`<box>`/`<rule>`/`<indent>`/
`<columns>`) wait for their own waves.
