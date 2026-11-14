# Tooltip slate — one model that carries the informational load

**Status:** slated 2026-11-14, from the navigation-pane conversation; the
first design is on the owner's design canvas (private) and accepted as a
starting point (*"this looks good to me to start with — at least we have
something real now"*). **Size:** a build — cross-cutting, ahead of the
navigation build, which is its first big consumer.

## The ask **[DECIDED — the owner]**

*"Tooltips on our app are going to be a really big part of it. Think of
what Paradox games have to do in terms of carrying the informational load
— that's where we're at. They need to be big legible things that can nest
and have images and iconography and links and all sorts of other things
good tooltips should have. Basically every glyph on the map needs a tooltip
telling you all about it, so you don't need to click through the layers.
We need a tooltip model that's going to work for the whole app."*

## What exists (2026-11-14)

- **No tooltip system.** A few native `title=` attributes
  (`GutterStripe`, `TabStrip`, `InspectionBody`, `ConnectionChip`).
- **Glossary-shaped sources that already serve:** the help rulebook
  ([help.md](../../subsystems/help.md) — structured, server-served,
  spoiler-gated), wiki snippets ([wiki.md](../../subsystems/wiki.md) — the
  reveal model), MML identity tags the client already makes clickable.
- ⚠ **The touch rule** ([client-shell.md](../../subsystems/client-shell.md)):
  touch has no hover, so a reason that lives only in a tooltip is a reason
  nobody on a phone can read.

## The model **[LEAN — accepted as the start]**

1. **A tooltip is a small document, not a string.** Blocks: a **header**
   (icon, title, what kind of thing) · **fact rows**, each with its
   **source and date** · **breakdowns** (a number and why it is that
   number) · **prose** (MML, so it carries identity links) · **images**
   (an illustration thumbnail, a portrait) · **links** (a *term* opens a
   nested tooltip, a *thing* opens its card, a *command* shows the command
   a click runs) · a **hint footer**.
2. **Nesting, Paradox-style.** Hover a term inside a tooltip and a child
   opens. A tooltip **locks** after a short dwell or at once on a key, so
   the pointer can move into it; a locked stack carries a breadcrumb; Esc
   closes one level; **pin** turns a tooltip into a card.
3. **Three sources, one honesty rule — only what you know:**
   - **composed on the client** from the knowledge model
     ([client-knowledge-model-slate](./client-knowledge-model-slate.md)) —
     every map glyph; instant, no round trip;
   - **glossary terms** from help topics and wiki snippets, fetched once
     and cached, their reveal gates respected — an author gets a tooltip
     by writing the help or the wiki;
   - **live things** (an item, a person, a door you are looking at) — a
     tooltip-sized, perception-gated describe from the server.
4. **Legible.** About 320–360 px wide, real body type (14 px), scrolling
   past a maximum height, placed so it never covers what it describes,
   icons from the one icon map.
5. **Reachable without a mouse.** Keyboard focus opens it; a long press
   opens it as a bottom sheet on touch; **nothing exists only in a
   tooltip** — every tooltip previews a card or a glossary page you can
   also click through to.
6. **One component everywhere** — the map's glyphs, the terminal's
   identity links, card chips, the status bar, lens chips, the top bar. A
   separate legend is unnecessary: hover any mark.

**The visual grammar** (the canvas): a *term* is dotted blue (hover for a
nested tooltip); a *thing* is a gold underline (hover for its tooltip,
click for its card); a command is boxed (what a click runs).

## Open

1. **The lock gesture** — dwell time, the key (Shift? middle-click?), and
   whether a locked tooltip follows the pointer at all.
2. **The describe query** for live things — reuse `look`'s perception path
   at tooltip size, or the MQL subscription's projected fields.
3. **The block model's home** — client-only, or a shared type the server
   can also send (the glossary and the describe both come from the server).
4. **Images** — which media a tooltip may show (illustrations via
   `mediaUrl`, portraits) and how big.
5. **Breakdowns as data** — which numbers in the game ship their *why*
   (route cost, the step beat, prices, a reading's bracket), and in what
   shape.
6. **The terminal** — whether hovering an item or person link in the
   transcript opens its tooltip (likely yes), and what that costs in
   describe queries.
7. **Spoiler and reveal** — a nested term pulled from the wiki must obey
   the reveal gate exactly as the wiki does.

## Cross-references

- [map-slate](./map-slate.md) and [navigation-requirements](../../requirements/navigation-requirements.md)
  — the first consumer
- [help.md](../../subsystems/help.md) · [wiki.md](../../subsystems/wiki.md) ·
  [client-shell.md](../../subsystems/client-shell.md) ·
  [message-rendering.md](../../subsystems/message-rendering.md) ·
  [iconography-slate](./iconography-slate.md)
