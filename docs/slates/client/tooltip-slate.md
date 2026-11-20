# Tooltip slate — one model that carries the informational load

> **Status: PARTIAL** — the model, its three sources, nesting and the
> retrofit of every native hover string shipped 2026-11-19 (MR !633) →
> [tooltips.md](../../subsystems/tooltips.md); requirements and plan retired
> at the sweep. Cut in review: the **pin** (a tooltip opens no card; the
> click on the thing does).
> **Left:** map glyph tooltips, breakdowns, action buttons and one block per
> mixin (the navigation build) · facts from the knowledge model · player
> words for the interface help a gutter stripe shows · live cards gated by
> light and reach (spoiler-slate) · the scrollback's link grammar
> (message-rendering-slate) — see *Left after the build* below.
> **Size:** a tail

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

### The spoiler reveal — a standard block **[DECIDED in principle]**

Any fact in a tooltip that is a spoiler — first among them an object's
**path** — travels tagged on the appetite axis and renders as a collapsed
**"What is this, really?"** line; one click opens it, and a player whose
appetite is high sees it open. The same block everywhere — rooms, ways,
items, people ([spoiler-slate § Paths are a spoiler](../platform/spoiler-slate.md)).

### Where each tooltip's content comes from

Every field on every tooltip names its class
([navigation-server-slate](../engine/navigation-server-slate.md)): **A** on the
client today · **B** on the client after the navigation build · **C** a
round trip on hover, cached · **D** not on the server yet. A tooltip
renders what it has at once and fills C fields as they arrive; a D field
is simply absent until its server item lands — never a placeholder that
guesses.

## Open — answered (2026-11-18), built (2026-11-19)

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

## Reuse ledger for the plan

Every concept the build needs, and what already does it (survey
2026-11-18). Each row is one the plan must account for.

| concept | what does it today | reuse or generalize |
|---|---|---|
| hover timer + dismissal | `GutterStripe.tsx` (`hoveringTip`, `hoverTimerRef`, click-outside) · `TabStrip.tsx` `ConfirmPopover` | generalize into the one component; both become consumers |
| positioning / collision / portal | nothing — no floating-ui, radix or tippy in `packages/client` | genuinely new: the plan decides build vs. add a library |
| glossary fetch + cache | `InspectionBody.tsx` `useSummary()` — `GET /api/help/topic?id=…`, module-level `Map` cache | generalize into the glossary source |
| help topics | `GET /api/help/index\|topic\|search`; `HelpTopic.summary`, `spoiler`; one filter point `applyFilter` (`mud/api/help.ts`) | reuse as-is |
| wiki excerpt | `WikiRenderer` + `lib/wiki/render.ts` (ceiling deletes, appetite tags); reached only by the `wiki` verb | reuse the renderer; the excerpt path must go through it — no second ungated reader |
| live describe | one-shot `mql-query` (`MqlQueryMessage`, `backend/inbound/mql.ts`), `DETAIL_FIELDS` perception-filtered; the client never sends it | reuse; the client's first sender + a per-thing cache |
| hover → command preview | `store/index.ts` `ghostPreview` (one reader, guarded) | coexist — untouched |
| touch | `useLongPress.ts` (450 ms, pointer-type branch) · `CommandSheet.tsx` (tap confirms) · `Terminal.tsx` row long press | reuse `useLongPress`; route a link/chip long press to the tooltip sheet |
| link click | `MmlRenderer.tsx` `commandFor()` (`look`/`go`), `data-stuff-id` · `ItemChips` / `SegmentItem` | reuse — the tooltip's thing link runs the same command |
| spoiler | `MmlRenderer.tsx` `Spoiler` (local click) · `CharGenStage` `SpoilerDetails` · `spoiler.appetite` (Avatar, server-only) | generalize into the one block; the appetite reaches the client |
| icons | `ui/icons/iconMap.ts` (11 Lucide) · `Icon.tsx` (label → aria + SVG `<title>`) · `KindMark.tsx` | reuse; the SVG `<title>` gives way to the tooltip, the label stays the accessible name |
| images | `mediaUrl()` (`client/src/config.ts`), `illustrationShape` | reuse |
| pin → card | the card surface's one birth path: a command pushes (`look`, `help`, `wiki`) | reuse — pin runs the command |
| native hover strings | ~40 `title=` sites (cards, TabStrip, CommandBar, PromptStrip, ReactionBar, CharGenStage, NavigatorBody, StreamControls, FilterDrawer, MmlRenderer…) | retire — every one becomes a tooltip |

## Left after the build (2026-11-19)

- **Map glyph tooltips, breakdowns, action buttons, one block per mixin** —
  the navigation build ([navigation-requirements](../../requirements/navigation-requirements.md)).
- **Facts composed from the knowledge model** (`walked` · `told` sources)
  — the same build's knowledge-model wave.
- **Interface help reads as engine docs.** An interface's gutter stripe
  shows its `mixin.X` help topic, which is API text written for authors
  (*"Bucket-relative media key …"*), not for players. Two possible fixes:
  a player-facing summary on the topic, or a different source for the
  stripe.
- **Live cards are not light- or reach-gated** —
  [spoiler-slate § Perception on the projection seam](../platform/spoiler-slate.md).
- **The scrollback's link grammar** —
  [message-rendering-slate](./message-rendering-slate.md).
- **Portrait recognition** on a person's image —
  [media.md](../../subsystems/media.md)'s deferred gate.
- **The 74 retrofitted controls keep their old hover wording**
  (`hoverDoc`); sharpen each at its site as it comes up.

## Cross-references

- [map-slate](./map-slate.md) and [navigation-requirements](../../requirements/navigation-requirements.md)
  — the first consumer
- [help.md](../../subsystems/help.md) · [wiki.md](../../subsystems/wiki.md) ·
  [client-shell.md](../../subsystems/client-shell.md) ·
  [message-rendering.md](../../subsystems/message-rendering.md) ·
  [iconography-slate](./iconography-slate.md)
