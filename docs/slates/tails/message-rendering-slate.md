# Message rendering & styling slate (working doc)

> **Status: Wave 1 shipped (2026-06).** Substrate lives in
> [docs/subsystems/message-rendering.md](../../subsystems/message-rendering.md):
> nested-aware client renderer, stylesheet engine + two themes,
> per-message-type templates (chat / say / tell / emote / default),
> Discord-dialect markdown → MML, custom URI scheme links, mentions,
> `style` verb on a per-Avatar overlay, `AetherMixin` for non-acoustic
> comms. Wave 2 (layout library) and Wave 3 (channel stylesheets +
> extensibility) remain open design surface — the build order at the
> bottom of this slate is still the working plan for those.
>
> The original framing: how a message goes from MML to what the
> player sees — while the message *string always stays complete*.
> Covers the MML structure (three tag categories + the flatten
> discipline), the client styling engine, the layout library, Markdown
> ↔ MML, channel stylesheets, and accessibility.

Working slate for **client-side message rendering**. The driver was
"different colors for different channels," but the real subject is the
whole pipeline: an MML string that **captures everything** (the founding
rule) yet can be **richly re-laid-out and styled** by the client.

The load-bearing decisions:

1. **The message string captures everything — always.** A message is a
   complete string of what happened: channel, sender, content, all of it,
   for logging / accessibility / portability with **no rendering engine
   required.** This is the founding rule; everything below preserves it.

2. **The MML carries the full content *and* the structure — the client
   reflows from the tags.** The body is the complete canonical line with
   semantic tags around the meaningful regions. **Flatten (strip tags) =
   the complete failsafe string.** The rich client uses the *same* tags to
   re-layout (columns, hanging indent) and style (color, chips). The
   complete-string and the structured-form are the **same artifact**.
   (Earlier "provenance is metadata, not prose" was an over-rotation: the
   channel label lives *in* the string as a tagged label — failsafe — not
   as bare metadata, and not as hokey narrative.)

3. **Semantic core; styling is a client stylesheet.** The server emits
   *semantics* (MML + frame metadata); the client maps semantics → visual
   treatments via a theme. **No presentational tags in the core**
   (resist `<red>`); per-channel color is a *stylesheet rule*, not
   rendering code.

4. **Every tag defines its flatten.** Layout/presentation is admitted
   only if it flattens to complete readable text — decoration drops,
   structure serializes **linear-labeled** (not ASCII-art).

5. **Markdown is input sugar (Discord dialect) + a flatten target; MML is
   the hub.** Never a storage/wire format.

6. **Reader sovereignty.** The reader can always fall back to plain/
   semantic (accessibility, anti-abuse); channels *offer* styling, the
   reader can decline.

See also:

- [docs/subsystems/messaging.md](../../subsystems/messaging.md) — current
  MML + the Scene composer. This slate **extends** MML (it's "not fully
  formed") and adds the rendering/flatten model; it doesn't redefine the
  composer.
- [comms-slate.md](../tails/comms-slate.md) / [chat-slate.md](../tails/chat-slate.md) /
  [emotes-slate.md](../tails/emotes-slate.md) — the message *types* this renders
  (say/tell/chat/emote); each is a per-type render template.
- [access-slate.md](../tails/access-slate.md) — **authorization gates** layout
  tags and channel presentational stylesheets (system/authors free;
  players channel-gated). Channel stylesheets are channel config set by
  admins (control-over).
- [social-graph-slate.md](../builds/social-graph-slate.md) /
  [recognition-slate.md](../builds/recognition-slate.md) — friend/foe **name
  coloring** = an MML `stuff-id` attribute resolved against the viewer's
  bucket.
- [client-cockpit-slate.md](../tails/client-cockpit-slate.md) /
  [console-filtering-slate.md](../tails/console-filtering-slate.md) — the
  buffers/tabs this renders *within*; the gutter ids.
- [docs/design-philosophy.md](../../design-philosophy.md) — Principle 3
  (layered presentation): compose semantics once, serialize per the
  reader's settings.

---

## Principle

1. **String captures everything** (founding rule).
2. **One artifact: tagged-complete-string** → flatten (failsafe) *and*
   reflow (rich) from the same tags.
3. **Semantic core + client stylesheet** (no presentational tags in
   core).
4. **Flatten discipline** (every tag flattens; structure → linear-
   labeled).
5. **Markdown spoke, MML hub.**
6. **Reader sovereignty + accessibility-first.**

---

## The rendering model — tagged-complete-string → flatten / reflow

The body MML is the **whole canonical line**, each element owning its
failsafe text. Worked example, a Gossip channel message:

```
<chan id="gossip">[Gossip]</chan> <name ref="123">Bobalu</name>: <msg>some very long message that goes on and on past the wrap point</msg>
```

**Flatten (strip tags) → the failsafe** (what hits logs / screen readers
/ exports — complete, no engine needed):

```
[Gossip] Bobalu: some very long message that goes on and on past the wrap point
```

**Rich render — the client reflows the tagged regions into layout slots:**

```
[Gossip] Bobalu: some very long message that goes on
         and on past the wrap point
```

The client (1) parses the MML into ordered regions, (2) maps roles →
layout slots via the **per-message-type template** (topic `world.chat` →
"chat line": `<chan>` → gutter column, `<name>`+`<msg>` → content
column), (3) reflows — `<msg>` wraps inside its column, so the hanging
indent falls out. The hang-style is a theme choice (wrap-under-name vs
wrap-under-message) over identical semantics. `<chan>`'s content
`[Gossip]` is the failsafe; a theme may replace it with a colored chip.

**Every comms type is the same mechanism**, different per-type template —
and each flattens to a complete sentence (matching what `VocalMixin`
already produces):

```
say    <name ref="123">Bobalu</name> says, "<speech>the words</speech>"   →  Bobalu says, "the words"
tell   <name ref="123">Bobalu</name> tells you, "<speech>…</speech>"      →  Bobalu tells you, "…"
emote  <name ref="123">Bobalu</name> waves at you.                         →  Bobalu waves at you.
```

Frame **metadata** (`speaker: #123`, `channel: gossip`) rides alongside
for **interactivity** (click the name/channel) but *augments* — the body
string is complete on its own.

---

## Three tag categories

| Category | Examples | Carries | Flatten | Where allowed |
|---|---|---|---|---|
| **semantic** | `<name>` `<speech>` `<chan>` `<item>` `<direction>` | domain meaning | its canonical text | core, everywhere |
| **layout** | `<block>` `<rule>` `<indent>` `<box>` `<table>` `<list>` `<pre>` (`<columns>` low-pri) | arrangement only | **defined per tag** (linear-labeled) | core vocab; *emitting* gated (system free, players channel-gated) |
| **presentational-inline** | emphasis (`<strong>` `<em>` `<code>` `<strike>`); palette (`<blue>` …) | pure style | emphasis → markdown; palette → plain | emphasis = core/global; palette = channel-scoped opt-in |

**MML stays semantic at the core.** The escape valves (loud color, heavy
layout, custom tags) are **per-channel opt-in**, never global, and always
reader-overridable.

### The presentational split (the key refinement)

- **Mild emphasis** — bold/italic/code/quote/list/strike → **core,
  global, allowed everywhere.** Universal in chat, low-abuse, screen-
  reader-friendly (emphasis is semantic-leaning), flattens cleanly. This
  is the Markdown set.
- **Loud styling** — color, heavy/manual layout → **channel-scoped
  opt-in** (Markdown can't even express it).

---

## The flatten discipline

Layout/presentation is admitted **only** if it flattens to complete
readable text:

- **Decoration drops** — borders, color, alignment, spacing vanish.
- **Structure serializes linear-labeled** — a table flattens to
  `Iron Sword — 500g`, **not** an ASCII grid (screen readers choke on
  grids; logs want lines). The 2-D grid is a *rich render*, never the
  failsafe.
- **Design pressure toward labeled-structural:** layout that carries
  labels (`<table>` with headers, `<list>`) flattens cleanly; pure-
  positional (`<columns>`) flattens poorly → discouraged. So even
  "layout" leans semantic.
- **`<pre>`** is the verbatim escape hatch (flatten = as-is). Complete
  but not accessible — allowed, discouraged, author owns the tradeoff.

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
- **Tabular/list (preferred — flatten well):** `<table>`/`<row>`/
  `<cell header?>`, `<list ordered?>`/`<item>`
- **Positional (escape hatch, low-priority):** `<columns>`/`<col>`
- **Verbatim:** `<pre>` (manual spacing / ASCII; accessibility caveat)
- **Inline:** `align` as an *attribute*; sizes **relative + clamped to
  viewport** (no absolute widths, no 80-col assumptions)

Constraints: bounded nesting, sandboxed (can't overflow / take over the
screen), responsive reflow, reader can collapse to flatten. **Authoring
freedom is gated** — system + content authors use layout freely
(`who`/score/shop/notices); a *player* using layout in a chat message is
channel-gated (the abuse surface). Tags exist in core; *emitting them in
a context* is an access decision.

---

## Markdown ↔ MML

**Discord dialect.** Markdown is parsed → MML in the **composition
pipeline** (server-authoritative; client may preview), never stored:

```
user markdown ─▶ markdownToMml() ─▶ MML (canonical) ─▶ MmlRenderer (rich)
                                                     └▶ flatten (→ markdown, emphasis-preserving)
```

Mapping (the mild, global subset; touches only the user-content region):

| Markdown (Discord) | MML |
|---|---|
| `**bold**` | `<strong>` |
| `*italic*` / `_italic_` | `<em>` |
| `` `code` `` | `<code>` |
| ` ```block``` ` | `<pre>` (the ergonomic front-end for `<pre>`) |
| `> quote` | `<blockquote>`/`<indent>` |
| `- ` / `1. ` | `<list>`/`<item>` |
| `~~strike~~` | `<strike>` |
| `[text](url)` | `<link>` (gated — see forks) |

**Flatten-to-markdown** keeps the failsafe complete *and* emphasis-
preserving — a log shows `**rare**`, readable and round-tripped:

```
input:    chat gossip got a **rare** drop, see `Excalibur`
flatten:  [Gossip] Bobalu: got a **rare** drop, see `Excalibur`
rich:     [Gossip] Bobalu: got a rare drop, see Excalibur   (bold + code-styled)
```

**Tables are NOT in the chat dialect** — they're layout (gated tier),
pipe-syntax is a poor fit for chat lines, and they flatten linear-labeled
(no round-trip). `<table>` MML serves system/authored output; **GFM
`| |` table syntax as input sugar for `<table>` is deferred to
layout-allowed contexts only** (authored docs / opted-in channels), never
chat.

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

## Accessibility (first-class, near-free given the separation)

- **Themes are a stylesheet swap** — colorblind-safe / high-contrast come
  almost free.
- **Never encode meaning in color alone** — pair with weight/prefix/icon
  so a swapped theme stays legible.
- **Linear-labeled flatten** is the screen-reader path (not ASCII grids).
- **Reader plain-mode** overrides any channel/sender styling — sovereignty.

---

## Open questions

Most forks leaned:

1. **Dialect** — *Resolved: Discord-style* (`**bold**`, `*italic*`,
   `` ` ``, ` ``` `, `>`, `-`, `~~`, `[](url)`).
2. **`<pre>` / `<columns>`** — *`<pre>` in* (verbatim need); `<columns>`
   low-priority vs `<table>`.
3. **Flatten default** — *Lean Markdown* (emphasis-preserving), with
   bare-plain available for strict-accessibility contexts.
4. **Markdown subset size** — *Lean the common set first*
   (bold/italic/code/codeblock/quote), grow.
5. **Links (`[](url)`)** — the security-sensitive one; *lean restrict to
   in-world refs / gate external URLs.*
6. **GFM table input-sugar** — *deferred* to layout contexts; never chat.
7. **Generic-class MML hook** — add the mechanism now (custom channel
   tags need it) vs fixed tags only? *Lean: add the hook* so styling/
   custom-tags are extensible without minting an MML tag per need.
8. **Reader-override granularity** — global plain-mode vs per-channel.
   *Lean both.*
9. **Channel stylesheet distribution** — how a channel's sheet reaches
   clients (fetch on tune-in? format?). New plumbing; flag.
10. **Parse locus** — server-authoritative (lean) with optional client
    preview.

---

## Build order

**Wave 1 — the core model + reader theme + markdown.** MML semantic core
+ the three categories + the **flatten discipline**; the tagged-complete-
string rendering model + region-reflow with the per-type templates
(chat/say/tell/emote); the reader theme with the core selectors (topic-
cascade, per-channel color, element, friend/foe via `stuff-id`, mentions);
**Discord markdown→MML** (mild subset) + flatten-to-markdown;
**accessibility baseline** (linear-labeled flatten, plain mode, no
color-alone).

**Wave 2 — the layout library.** `<block>`/`<rule>`/`<indent>`/`<table>`/
`<list>`/`<box>`/`<pre>` + the flatten serializers + authorization
gating; structured system output (who/score/shop) via layout MML.

**Wave 3 — channel stylesheets + extensibility.** The generic-class MML
hook; channel stylesheets (custom semantic tags + constrained palette +
presentational layout) as channel config + access-gated; richer theming;
GFM-table-input-sugar in layout contexts if wanted; the heavier
presentational palette.

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

This slate boils down to:

- The **tagged-complete-string** model: body MML is the whole canonical
  line; **flatten = complete failsafe**; the client **reflows from region
  tags** via per-message-type templates.
- The **three tag categories** (semantic / layout / presentational-
  inline) + the **flatten discipline** (decoration drops, structure →
  linear-labeled, `<pre>` verbatim).
- The **styling engine**: selectors (topic-cascade / channel / element /
  `stuff-id`→bucket / content-match) → treatments; reader theme floor +
  channel-sheet enrichment; prefs as settings.
- The **layout library** (bounded, flatten-disciplined, authorization-
  gated).
- **Markdown↔MML** (Discord dialect, server-authoritative parse, mild
  global subset, flatten-to-markdown; tables excluded from chat).
- **Channel stylesheets** (scoped opt-in: custom tags + constrained
  palette + layout; channel config + access-gated; reader-overridable).
- **Accessibility** (stylesheet-swap themes, no color-alone, linear
  flatten, plain-mode sovereignty).
- The **MML evolution** it implies (semantic core, the generic-class
  hook, `stuff-id`/attribute exposure, no presentational core tags).
- Tests: flatten of any message is complete + readable (a chat line →
  `[Gossip] Bobalu: …`); the same MML reflows to columns/hang-indent;
  per-channel color is a stylesheet rule; markdown `**x**` round-trips
  through flatten; a gated layout tag from a non-privileged player in a
  non-opted channel is refused/stripped; plain-mode collapses all styling
  to the failsafe.

Channel-stylesheet distribution, the GFM-table sugar, the heavier
palette, and the generic-class-hook details wait for their own waves.
