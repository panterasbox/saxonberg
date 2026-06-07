# Message rendering — requirements

Graduates **Wave 1 of [docs/slates/message-rendering-slate.md](../slates/message-rendering-slate.md)**
into the buildable spec. The driver was "different colors for different
channels," but the real product is the whole pipeline: every cockpit message
painted through **one renderer** that maps semantic MML → styled output via a
reader-owned stylesheet, with the message body always a tagged-complete-string
that flattens to a failsafe line.

Wave 2 (layout library — rich `<table>` / `<box>` / structured system output)
and Wave 3 (channel stylesheets — community-authored custom tags + palette +
heavy layout) are explicitly out; their seams must be respected but nothing
ships against them.

This is a Track A (client cockpit) build with a server-side composition tail.
It lands on top of the shipped wire substrate
([messaging.md](../subsystems/messaging.md),
[response-envelope.md](../subsystems/response-envelope.md)) and the existing
cockpit shell. It supersedes the current flat-regex `MmlRenderer.tsx` (which
already has a `// Known limitation — flat tags only` flag in its header).

## Goals

- **One renderer, every cockpit message.** Replace the flat-tag regex
  `MmlRenderer.tsx` with a nested-aware renderer that produces rich React
  output for any semantic MML the server can emit, including nested.
- **Tagged-complete-string body.** The server-stamped `body` MML is the whole
  canonical line (channel chip + sender + content + everything); the rich
  render and the failsafe flatten are the same artifact, viewed two ways.
- **Per-message-type rich reflow.** Four concrete templates ship: `chat`,
  `say`, `tell`, `emote`. A `default` template handles every other topic
  family (including `system.*`) by rendering the body inline; whole-frame
  styling of system / sys-prefix / etc. rides the stylesheet's
  topic-cascade selector, not a per-type layout template.
- **Player-tunable visual customization via a dedicated `style` verb +
  per-Avatar stylesheet overlay.** Per-channel color (the original driver),
  own-name highlight, plain-mode, theme choice all ride one persisted JSON
  overlay edited through a new `style` controller. **No settings keyspace
  involvement for visual customization** — `EnvironmentMixin` is the wrong
  ergonomic for cascade-shaped configuration. The overlay lives on
  `ClientStateMixin`, parallel to the tabbed-terminal / mute state the
  console-foundations work already lands there. Forward-compatible with
  Wave 3 channel stylesheets (community-authored layer in the same cascade)
  and the future scoped-authoring GUI (visual editor writes the same JSON
  blob).
- **Reader-owned stylesheet engine.** Five selector kinds (topic-cascade,
  channel, MML element / attribute, `stuff-id`→bucket, content-match) map to
  visual treatments (fg/bg, weight, prefix/chip, indent).
- **Two themes.** Default + high-contrast. Theme swap is wholesale (one
  stylesheet replaces another); the swap mechanism is the load-bearing piece,
  the second theme is the proof.
- **Mild-emphasis markdown for user input.** Discord-dialect subset
  (`**bold**`, `*italic*`, `` `code` ``, ` ```block``` `, `> quote`, `- list`,
  `~~strike~~`) parsed server-side into MML; flatten round-trips through
  markdown so logs remain readable.
- **In-world refs in chat via custom URI schemes.** Two URI kinds **wired in
  v1** — command-line and stuff-id reference — compile to one
  `<link href="…">` tag whose click dispatches through the command bus *as
  the clicker*. A third kind — MQL query — is **namespace-reserved but
  inert** in v1: the parser recognizes the scheme and produces a `<link>`
  tag, the renderer styles it as non-clickable text, no click handler runs.
  Click behavior for query links is a deferred design question (candidates:
  shell out to `find <mql>`, CMS-edit reshape, dedicated results panel) —
  the v1 build does not decide. HTTP/HTTPS links coexist as a separate
  scheme family (stripped in v1 chat). Concrete scheme names + URI syntax
  (`://` hierarchical vs opaque `:` form) are planner-level — see Surface
  decisions.
- **Mention surface.** Explicit `@<name>` in user input becomes a resolved
  `<mention stuff-id="…">` tag; the renderer highlights mentions whose target
  matches the viewer. Own-name highlight is a separate overlay rule
  (toggleable via the `style` verb).
- **Reader sovereignty.** A `style plain on` toggle collapses the cockpit to
  the failsafe (the flatten string). Global + per-channel granularity, both
  expressed as overlay rules.
- **Friend/foe selector machinery, stubbed source.** The stylesheet engine
  reads a bucket source for `stuff-id` colorization. v1 ships the resolver
  hook + a stub returning `neutral`; swapping in the real source is the
  social-graph build's job, not this one.
- **Accessibility.** Linear-labeled flatten (no ASCII grids); no color-alone
  semantics (every colored treatment pairs with weight/prefix/chip); the
  high-contrast theme ships as a working swap target.

## Non-goals

- **Wave 2 layout library.** `<block>` / `<rule>` / `<indent>` / `<table>` /
  `<list>` rich layout; structured system output (`who`, `score`, `shop`); GFM
  table input sugar. The slate parks these explicitly. (`<list>`/`<li>`
  *flatten serializers* land in v1 because the markdown subset needs them;
  the *rich* renderer for them is Wave 2.) The chrome-vs-content distinction
  the retired `<sys>` tag (now removed in this build) was approximating gets
  its proper home in Wave 2 via `<box title>` / `<list>` with header /
  `<table>` with header row; in the interim, those emit sites are plain text.
- **Wave 3 channel stylesheets.** Channel-scoped custom semantic tags;
  constrained presentational palette (`<blue>`); presentational layout
  (`<box>`); the channel-stylesheet distribution mechanism. External-URL
  gating *for channels that opt in* is Wave 3 too.
- **Keyword-list mentions.** Highlighting bodies that contain a player's
  custom keyword list (`console.mentions.words`-shaped). The slate leans
  toward including it; user deferred to a separate conversation. v1 ships
  only explicit `@<name>` + own-name configurable highlight; the stylesheet's
  `content-match` selector kind is *omitted* from v1.
- **Social-graph bucket data source.** The selector machinery reads a
  `stuff-id` against a bucket resolver, but the resolver returns `neutral`
  for everything; the real source lives behind the social-graph slate.
- **Theme authoring / sharing.** Themes are stylesheet objects shipped with
  the client. No per-user theme creation, no third-party themes, no
  per-channel theme override.
- **Mobile cockpit.** Out of v1 cockpit scope per the cockpit slate; the
  stylesheet engine should not preclude it, but no responsive work happens
  here.
- **Markdown subset growth.** Tables as input sugar (deferred — never chat per
  slate); nested-list edge cases beyond a single level; HTML escape passthrough.
- **Reactions rendering.** Wave-3-of-its-own-slate territory; this provides
  the message styling those would sit on, but nothing reactions-specific
  ships here.
- **External URL handling beyond chat-strip.** No allowlist, no confirm
  dialog, no domain-aware treatment. Strip is the whole policy in v1.

## Surface decisions

### MML semantic core extensions

The semantic vocabulary grows. Each new tag has a defined flatten.

**Identity/role (existing — confirmed, not redefined):**
`<name stuff-id="…">`, `<item stuff-id="…">`, `<location stuff-id="…">`,
`<object stuff-id="…">`, `<exit dir="…">`, `<direction>`, `<speech>`,
`<detail key="…">`.

**Retired in v1:** `<sys>` (current chrome-label tag for "Exits:" / "You also
see:" prefixes in perception output). The chrome-vs-content distinction is
real but narrow, and Wave 2's layout vocabulary (`<box title>` / `<list>`
with header / `<table>` with header row) is its proper home. The v1 build
migrates every existing `<sys>` emit site to plain text (the failsafe
flatten string already produced — "Exits: north, south\n"), removes
`Mml.sys` from the server compose surface, and removes the `<sys>`
special-case from the renderer. Wave 2 brings the structured replacement.

**New in v1 (semantic):**

| Tag | Flatten | Role |
|---|---|---|
| `<chan id="…">[Label]</chan>` | `[Label]` | Channel chip. `id` is the channel key (e.g. `gossip`), the body is the failsafe label (`[Gossip]`). |
| `<msg>…</msg>` | body verbatim (recurse) | The user-content region of a chat/say/tell/emote line. Carries the markdown-derived inline emphasis. |
| `<player stuff-id="…">…</player>` | `…` | Player-identity sibling to `<name>` (for friend/foe selector dispatch). Falls back to `<name>` behavior pre-recognition slate. |
| `<npc stuff-id="…">…</npc>` | `…` | NPC-identity sibling to `<name>`. Same fallback. |
| `<mention stuff-id="…">@Name</mention>` | `@Name` | Resolved explicit mention. The `stuff-id` enables the highlight-on-match selector. |
| `<link href="…">…</link>` | label as plain text | In-world ref from `[label](…)` markdown. The `href` is one of the project's custom-scheme URIs (command, stuff-ref wired in v1; query reserved but inert); the renderer dispatches by scheme. |

**New in v1 (presentational-inline, emphasis subset):**

| Tag | Flatten | Markdown source |
|---|---|---|
| `<strong>` | `**…**` | `**bold**` |
| `<em>` | `*…*` | `*italic*` / `_italic_` |
| `<code>` | `` `…` `` | `` `code` `` |
| `<pre>` | `` ```…``` `` | ` ```block``` ` |
| `<blockquote>` | `> …` (each line) | `> quote` |
| `<strike>` | `~~…~~` | `~~strike~~` |
| `<list ordered?="true">` | (container; sees children) | `- item` / `1. item` |
| `<li>` | `- …` (or `1. `, `2. `…) | (one per list line) |

**`<list>`/`<li>` named "`<list>`/`<li>`" deliberately** — `<item>` is already
the game-item identity tag, and overloading it would break the renderer's
tag-→-treatment lookup. `<li>` follows HTML convention and is short.

**No presentational core tags.** No `<red>` / `<blue>` / `<bold>` (vs.
`<strong>`/`<em>` which are semantic emphasis). Color, alignment, size are
**stylesheet rules**, never authored prose.

### Markdown subset (Discord dialect)

The mild-emphasis subset, server-parsed at compose-time for user-content
regions only (i.e. inside `<msg>` and `<speech>`):

- `**bold**`, `*italic*` / `_italic_`, `` `inline code` ``,
  ` ```multiline``` `, `> quote`, `~~strike~~`
- `- ` and `1. ` at line-start for unordered/ordered lists
- `[label](TARGET)` for in-world refs (see below)

**Out:** tables (GFM `| | |` syntax never reaches chat; deferred to Wave 2
layout contexts); nested list indentation; arbitrary HTML; headers (`#`).

**Parse locus:** server-authoritative. The composition pipeline runs the
markdown parser before the body MML is stamped onto the frame. Clients never
re-parse markdown. Optional client preview is out for v1.

### In-world refs (`<link>`) — custom URI schemes

The `[label](URI)` markdown produces `<link href="URI">label</link>` where
`URI` is one of three project-defined custom schemes; HTTP(S) is a fourth,
namespaced sibling stripped from v1 chat. **Two URI kinds are *wired* in v1;
the third is namespace-reserved but inert. Scheme spellings + syntactic
form are planner decisions** (see immediately below):

| URI kind | Payload | Click effect | Routing |
|---|---|---|---|
| **command** (v1 wired) | a percent-encoded command line | dispatches the decoded line through the regular command bus | `MmlRenderer.commandFor` → existing `onCommandClick` path |
| **stuff-ref** (v1 wired) | a stuff-id | resolves the id in the client stuff registry; on hit → `look <primaryKeyword>`; on miss → `look #<id>` (same fallback as existing identity-tag clicks) | command bus (the look) |
| **query** (v1 inert, namespace-reserved) | a percent-encoded MQL string | **no click handler in v1**; the renderer paints the label as non-clickable styled text. The parser still recognizes the scheme so future wires don't churn the markdown layer; deciding what a click *does* is deferred (see "Query link behavior — deferred" below). | n/a in v1 |
| **external URL** (`http(s)://…`) | n/a | **stripped from chat in v1**; label survives as plain text | n/a in v1 — reserved namespace for future channel-stylesheet / system-message contexts |
| unknown scheme | n/a | **stripped from chat** at parse time (default-deny) | n/a |

**Query link behavior — deferred.** The MQL-query URI scheme is reserved
because we know we'll want it; what clicking does is an open design
question. Real candidates surfaced in scoping (none decided):

- Shell out to the existing `find <mql>` verb through the command bus
  (functionally collapses `mudq:` into `mudcmd:find <mql>` sugar with
  distinct styling).
- Route to a CMS-edit reshape (the CMS doesn't exist yet — see
  [cms-slate.md](../slates/cms-slate.md)).
- A dedicated results panel that surfaces the rich state MQL results carry
  beyond what `look` shows.
- Something else.

None of these are commitments. v1 ships zero click semantics; the namespace
reservation prevents the parser from silently stripping `mudq:` URIs and
keeps the markdown surface stable for whatever decision lands first.

**Scheme naming + syntactic form (planner-level).**

The user examples (`mudcmd://…`, `mudstuff://…`, `mudquery://…`) are
illustrative; the planner picks the actual names. Guidance:

- These payloads are **opaque** (no host, no path hierarchy — just a payload
  blob). Per RFC 3986 convention, opaque URIs use the `scheme:payload` form
  (`mailto:foo@bar.com`, `tel:+12345`, `urn:isbn:…`, `data:…`), not the
  `scheme://authority/path` form. So `mudcmd:look%20sword` is arguably more
  correct than `mudcmd://look%20sword`.
- Either form parses cleanly with the URL constructor (`new URL(href)`
  exposes `.protocol` and `.pathname` either way), so the implementation
  tax is identical.
- Whichever form is picked, **apply consistently** to all three kinds.
- Scheme names should be short, distinct from common schemes, and
  unambiguously project-owned (a `mud-` or `sb-`/`sax-` prefix; not bare
  `cmd:` which collides with anything).
- The planner picks one set of names and locks them; the contract here is
  "three custom schemes, scheme-routed dispatch, default-deny on unknown."

**Query-link click behavior — deferred.** What happens when a query-scheme
link is clicked is *not* a v1 decision. The scheme is reserved, the parser
recognizes it, the renderer paints it as styled-but-inert text; no click
handler runs. Candidate behaviors (shell-out to `find <mql>`, CMS-edit
reshape, dedicated results panel) wait for a follow-up design pass — see
"Query link behavior — deferred" earlier in this section.

**Why custom URI schemes** (not colon-prefix sugar):

- Real URI parsing — no ambiguity (sugar `look:thing` vs real `https:`), no
  special-case lexer in the markdown parser; the URL constructor parses both
  forms.
- HTTP/HTTPS coexists as a distinct scheme; future contexts that allow
  external URLs are purely additive (no v1 chat dispatch changes).
- `<a href="…">` semantics — sensible degradation in any context that
  natively parses URIs (logs, archive exports, future web previews).
- Clean dispatch surface — the renderer's click handler is a scheme switch,
  not a substring strip.

**Security model:**

- **Command-bus clicks dispatch as the *clicker*** (regular command pipeline;
  clicker's access applies). A malicious command like `rm /home/duncan` does
  whatever the clicker would do typing it; sender access does not leak.
- **Query-scheme links have no click handler in v1**; the styling-but-inert
  render means there is no attack surface to gate. (When click behavior
  lands later, security tier is part of *that* design.)
- **Hover-preview** shows the resolved command in the input before the click
  commits (existing `MmlRenderer.onCommandPreview` plumbing). Click-jacking
  is
  visible to the receiver.
- External URLs are stripped at parse time. The label survives as plain
  text; the URI does not reach the wire.
- Unknown schemes are stripped (default-deny on the URI namespace).

### Mentions

**Parse-time resolution.** `@<word>` in user input (inside `<msg>`/`<speech>`
regions only) is matched against players visible to the channel scope (or for
say/tell, the room scope). On match, the parser produces
`<mention stuff-id="X">@Word</mention>`. On miss, the literal `@Word` stays
as plain text — no error treatment, no warning style.

**Channel scope** is the resolution domain for chat-topic frames (only
players currently tuned to that channel are mentionable). For say/tell/emote
the resolution domain is "Stuff the speaker can perceive" — same set as MQL
pronoun resolution would see. The exact predicate lives in the planner's
hands; the *contract* is "matches what the user could plausibly target."

**Rendering.** The stylesheet's `<mention>` rule highlights mentions whose
`stuff-id` matches the viewer's `stuff-id`. Non-self mentions render with a
visible but quieter treatment (so the reader can see "X was mentioned" in
chat without thinking they were called out).

**Own-name highlight is separate.** The body MML for a chat line includes the
sender's name as `<player>` / `<name>` — the stylesheet's "name-of-the-viewer"
treatment lights up plain references to one's own character. Default: ON.
Setting: `console.mention.self` (boolean). This is the only piece of the
stylesheet's `content-match` selector kind that lands in v1; the broader
keyword-list version is deferred.

### Per-message-type templates

Four explicit templates in v1, keyed by topic prefix. A `default` template
catches everything else (renders the body MML inline, no special layout).

| Topic family | Template | Layout |
|---|---|---|
| `world.chat.*` | `chat` | gutter column: `<chan>` chip; content column: `<player>`/`<name>` + `:` + `<msg>` with hanging indent under the name |
| `world.speech.say` | `say` | inline: `<name> says, "<speech>"`, italic speech |
| `world.speech.tell` | `tell` | inline with directional treatment (sender → you, you → recipient); quieter color than `say` |
| `world.emote.*` | `emote` | inline italic, action-shaped (no quotes); `<name> waves at you.` |
| _(everything else, including `system.*`)_ | `default` | render `body` MML inline, theme-default treatment |

Templates live on the **client**. The server stamps the tagged-complete
string in `body`; the client's template registry decides how to lay the
regions out. Adding a new template later is purely client work.

**No `sys` template.** `system.*` frames ride `default`; whole-frame
distinction (muted color, prefix marker, etc.) is a stylesheet rule under
the `topic` cascade selector — not a per-type layout template. The retired
`<sys>` inline tag (see "MML semantic core extensions" above) means
chrome-label emit sites migrate to plain text in v1 and to Wave 2's
structured layout when it lands.

### Stylesheet engine

A reader-owned mapping from MML/topic/attribute → visual treatment. Five
selector kinds:

| Selector | Source | Example |
|---|---|---|
| `topic` (longest-prefix cascade) | `frame.topic` | `world.speech.*` italic, `world.speech.tell` dimmed |
| `channel` | `<chan id>` attribute on the body | per-channel color; user overlay rule overrides theme default |
| `element` | tag name | `<strong>` bold, `<em>` italic, `<speech>` italic-quoted, etc. |
| `attribute → bucket` | `stuff-id` → bucket resolver | friend/foe coloring on `<player>`/`<name>` (stub returns `neutral`) |
| `content-match` | viewer-relative (own-name / `<mention>` target) | own-name highlight, self-mention emphasis |

**Theme = a stylesheet bundle.** A theme provides default rules across all
selector kinds; the per-Avatar **user overlay** (see below) layers on top.
Cascade order: theme → user overlay → plain-mode override (which collapses
all treatments to identity).

### User overlay storage

The user overlay is **one persisted JSON blob per Avatar**, stored on
`ClientStateMixin` as a single field (working name: `styleOverlay`). The
shape is constrained-JSON (not raw CSS, not raw SCSS) — the planner picks
the exact schema, but the contract is:

- Keyed by **selector** (`channel.<key>`, `topic.<prefix>`,
  `element.<tag>`, `mention.self`, `theme`, `plain`, `plain.<channel>`).
- Values are **treatment objects** (`{ color, weight, prefix, chip, plain }`)
  or scalars for the toggle-style entries (`{ "theme": "high-contrast" }`,
  `{ "plain": true }`).
- Empty overlay = `{}`; the theme is the sole input.
- The shape is **bounded** — the engine parses unknown selectors / properties
  as no-ops and never executes arbitrary CSS expressions. No `position`,
  no `z-index`, no global escape hatches.
- One blob means migrations are cheap (read JSON, transform, write JSON)
  and the future visual editor has one document to bind to.

`ClientStateMixin` is the home **not** `EnvironmentMixin` settings — the
overlay is a cascade-shaped document, not a flat tunable-knobs registry.
The settings command is the wrong ergonomic for editing it; the dedicated
`style` verb (next) replaces it for this concern. Per the
[[settings-vs-propertied-vs-client-state]] memory the three-category split
still holds; this is the third category, sized larger than the per-tab /
per-mute UI fragments console-foundations landed.

### The `style` verb

A new command controller for editing the user overlay through ergonomic
single-purpose subcommands. **No settings keyspace involvement** — this
verb is the only player-facing UI for visual customization in v1.

Single-token verb (per [[no-two-word-verbs]]): **`style`**. Subcommand arg
shape (planner finalizes; minimum surface for v1):

| Usage | Effect |
|---|---|
| `style` | print short usage / current overlay summary |
| `style show` | print the resolved overlay as readable JSON |
| `style theme <name>` | set theme to `default` or `high-contrast` |
| `style channel <key> color <value>` | set per-channel color treatment (e.g. `style channel gossip color blue`) |
| `style channel <key> clear` | remove all overlay rules for the channel |
| `style mention self on\|off` | toggle own-name highlight |
| `style plain on\|off` | global plain-mode |
| `style plain channel <key> on\|off` | per-channel plain-mode |
| `style reset` | clear the overlay to `{}` (theme stays at whatever default) |

Each subcommand mutates the overlay blob, persists via
`ClientStateMixin`, and triggers a client re-render (the overlay change
rides whatever ClientState push mechanism already exists). No round-trip
chatter beyond the one mutation per command.

The verb is **ergonomic sugar over the overlay shape** — every effect could
also be achieved by editing the JSON directly via a future `style edit`
affordance (parked) or by a future visual-editor GUI (also parked). v1
ships the subcommands above; the raw-edit and GUI paths are additive.

### Theme bundle

Two themes ship in v1:

- `default` — the existing cockpit dark palette, lifted into stylesheet form.
- `high-contrast` — accessibility-driven; strong fg/bg contrast, larger
  visible weight differences, no color-alone semantics (every distinction
  carries a non-color cue).

Theme files are TypeScript modules on the client; one object per theme. The
engine selects by the overlay's `theme` key at render time and re-renders
on change. No theme hot-reload, no per-channel theme override.

### Friend/foe stub

The stylesheet's `attribute → bucket` selector calls a `BucketResolver`
interface (`resolveBucket(stuffId): 'friend' | 'foe' | 'neutral'`). v1 ships a
stub implementation returning `neutral` for everything. The selector and its
default styling exist; swapping in the real implementation is one line of
wiring when social-graph ships.

### Renderer rewrite

The flat-regex parser in `packages/client/src/components/MmlRenderer.tsx` is
replaced. New parser:

- State-machine over the MML body, returns a tree.
- Handles arbitrary nesting (the current regex breaks on any `<` inside a tag
  body — the inline TODO in MmlRenderer.tsx flags this).
- Preserves all five MML entities (`<` `>` `&` `"` `'`) and their decoding,
  exactly per the current `decodeEntities` (mirrors server `Mml.escape`).
- Outputs a structure the template registry can match against and the
  stylesheet can paint.

The `MmlRenderer.commandFor` click-routing logic (existing `<exit>`,
`<detail>`, identity-tag patterns) is preserved verbatim and extended for the
new `<link>` and `<mention>` tags.

## Constraints

- **Stay semantic at the core.** No presentational tags in the core
  vocabulary. Color/weight/alignment are stylesheet rules, period.
- **Every tag flattens.** Adding a tag without defining its flatten is a
  design bug. The flatten serializer is mandatory; the failsafe is
  the load-bearing guarantee of the model.
- **Reader sovereignty.** Any styling is `style plain on`-collapsible. No
  tag, no theme rule, no markdown affordance escapes this.
- **No color-alone semantics.** Every colored treatment must pair with a
  non-color cue (weight, prefix, chip, position). Verified by the
  high-contrast theme being legible without the color channel.
- **User overlay lives on `ClientStateMixin`, not `EnvironmentMixin`.**
  Cascade-shaped configuration is the wrong fit for the settings keyspace
  (verbose ergonomics for simple cases, no expressivity for the real ones).
  This is the third category in
  [[settings-vs-propertied-vs-client-state]] — client-UI-state, sized
  larger than the per-tab / per-mute fragments console-foundations already
  landed there.
- **No settings keyspace involvement for visual customization.** No new
  `console.*` keys; do not extend `EnvironmentMixin` for this build. The
  `style` verb is the only player-facing UI for the overlay in v1.
- **Single-token verb.** `style` per [[no-two-word-verbs]]; subcommands ride
  argument shape, not phrasal verbs.
- **One overlay blob, never N flat fields.** The overlay is a single JSON
  document on `ClientStateMixin`. Splitting it into multiple fields (one
  per concern) is the antipattern this build is escaping; do not do it.
- **Bounded JSON, not raw CSS.** The overlay's schema is constrained — known
  selectors and known treatment properties only; unknown selectors / props
  are no-ops. No CSS strings reach the engine. (Future Wave-3 channel
  stylesheets are a separate concern with their own validation.)
- **No new XApi class.** The markdown→MML pipeline is a static method on
  `Mml` (alongside `Mml.compose` / `Mml.escape` / `Mml.stripTags`). The
  flatten serializer is a `Mml` instance / static method. Client-side parser
  + stylesheet engine + template registry are plain modules under
  `packages/client/src/`, not Apis. The `style` verb is a command controller
  in `obj/command/` + YAML view in `mud/cmd/` — no `StyleApi`.
  ([[no-new-apis-default]])
- **Markdown parse is server-side.** Clients never re-parse markdown. The
  wire body is canonical MML; what reaches the client cannot be markdown.
- **External URLs in chat are stripped at parse time**, before the body MML
  is stamped. No client-side URL handling.
- **Custom URI scheme namespace, scheme-routed.** Three project-defined
  schemes (command / stuff-ref / query); the renderer dispatches by scheme,
  default-deny on unknown schemes. Scheme spellings + syntactic form
  (`://` hierarchical vs opaque `:` form) are planner-level — opaque is
  arguably more correct (no authority component); pick one form and apply
  consistently across all three. `http(s)://` is reserved for future
  channel-stylesheet / system-message contexts and stripped in v1 chat.
- **Query links are inert in v1.** The query-scheme is recognized by the
  parser and produces a `<link>` tag; the renderer paints it as
  non-clickable styled text and runs no click handler. Click semantics are
  a follow-up design question; the v1 build does not commit to any (do not
  wire `mql-query`, do not synthesize a `find` command, do not reshape the
  inspection pane on click). This is a deliberate scope clamp — the
  namespace exists so future wiring is additive.
- **Mentions resolve at parse time**, server-side. Resolution failure is
  silent — the `@word` stays as plain text in the body. No error treatment.
- **Click dispatches go through the normal command pipeline.** A `<link>`
  click is `onCommandClick(href.replace(/^cmd:/, ''))` — same path as a
  typed command. Receiver access enforces.
- **No `<item>` overload.** The markdown list-item tag is `<li>`; the
  identity `<item>` tag stays exclusive to game-item references.
- **Backward compatibility with existing emitters** (one carve-out).
  `MmlRenderer` currently handles `<exit>` / `<detail>` / `<item>` /
  `<name>` / `<location>` / `<object>` — every one of these must render
  correctly after the rewrite. The seventh tag the current renderer handles
  — `<sys>` — is **retired** in this build (see "MML semantic core
  extensions"); its emit sites migrate to plain text. Tests gate the
  preserved set; a migration test gates that no `<sys>` reaches the wire.
- **Frame ordering primitive untouched.** `meta.frameId` continues to be the
  gap-detection key per `messaging.md` / `response-envelope.md`.
- The slate's **layout/presentational gating story** lives in Wave 2/3; v1
  must not paint a gating story that locks Wave 2 in to a less general
  shape. (Practically: don't reach for a gating mechanism here; defer.)

## Acceptance criteria

Concrete; tests gate or `verify`-able in the cockpit:

**Rendering & reflow**

1. A chat-topic frame with body
   `<chan id="gossip">[Gossip]</chan> <player stuff-id="X">Bobalu</player>: <msg>some very long message that goes on past the wrap point</msg>`
   renders in the cockpit with a gutter chip and hanging-indent layout under
   the name; flatten produces `[Gossip] Bobalu: some very long message that goes on past the wrap point`.
2. A `world.speech.say` frame with body
   `<name stuff-id="X">Bobalu</name> says, <speech>"hello"</speech>`
   renders inline ("Bobalu says, *'hello'*"), italic speech; flatten produces
   `Bobalu says, "hello"`.
3. A `world.speech.tell` frame uses the directional `tell` template; renders
   with a quieter palette than `say`.
4. A `world.emote.*` frame uses the `emote` template; italic, action-shaped.
5. A `system.command.info` frame uses the `default` template (body MML
   inline); the topic-cascade stylesheet rule for `system.*` paints it
   muted with a prefix marker — the visual distinction comes from the
   selector, not a layout template.
6. Every other topic family renders via `default` (body inline, no special
   layout).

**Parser**

7. The new parser handles nested MML correctly:
   `Mml.compose\`<item stuff-id="X">${Mml.quantity(5)} apples</item>\``
   produces the right click target and visible label without dropping the
   inner tag (the current flat-regex parser breaks on this — the inline TODO
   in `MmlRenderer.tsx` is the regression case).
8. All preserved MML emitters (`<exit>` / `<detail>` / `<item>` / `<name>` /
   `<location>` / `<object>`) render identically to the flat-parser
   baseline. The `<sys>` tag is removed — every prior emit site now emits
   plain text; the `Mml.sys` compose helper is gone; the renderer's `<sys>`
   special-case is gone. A grep test gates that no `<sys>` tag survives in
   server prose or wire output.
9. MML entity decoding survives the rewrite (the existing `decodeEntities`
   contract is preserved).

**Markdown**

10. `**bold**` `*italic*` `` `code` `` `> quote` `- list` `~~strike~~`
    round-trip through compose → MML → flatten → markdown unchanged.
11. ` ```block``` ` produces `<pre>`; flatten produces the triple-backtick
    form.
12. A command-scheme link (e.g. the planner's chosen spelling of "command
    URI" wrapping `look excalibur`) compiles to a `<link href="…">` tag;
    click dispatches `look excalibur` through the command bus; hover shows
    the command in the input.
13. A stuff-scheme link with stuff-id `42` and registry-known
    `primaryKeyword: "excalibur"` clicks to `look excalibur` (registry hit);
    same link with no registry hit clicks to `look #42`.
14. A query-scheme link wrapping the MQL `guard in here` compiles to a
    `<link href="…">` tag and renders as styled-but-inert text; **clicking
    invokes no handler** (no command bus dispatch, no wire send, no UI
    state change); the test gates that `onCommandClick` / `onQueryClick`
    are never called for `query`-scheme links.
15. `[evil](https://attacker.com)` strips the URI; the label `evil` survives
    as plain text; no clickable link is rendered.
16. `[bogus](javascript:alert(1))` strips the URI (unknown scheme);
    the label `bogus` survives as plain text.

**Mentions**

17. `@Bobalu` in a chat message addressed to a channel Bobalu is tuned to
    produces `<mention stuff-id="X">@Bobalu</mention>` in the body; renders
    highlighted for Bobalu, render-styled-as-mention (quieter) for everyone
    else.
18. `@Unknown` (no matching player in scope) stays as plain text `@Unknown`
    in the body; no error frame.
19. `style mention self off` suppresses own-name highlight; mentions still
    light up.

**Stylesheet & themes (via the `style` verb)**

20. `style channel gossip color blue` paints the `[Gossip]` chip in blue
    across all `world.chat.gossip` frames; the overlay persists to
    `ClientStateMixin` and survives reconnect.
21. `style theme high-contrast` swaps the cockpit theme; `style theme
    default` swaps it back. No reconnect needed. No `EnvironmentMixin`
    settings written or read.
22. The friend/foe selector resolves `stuff-id` against the bucket resolver;
    stub returns `neutral` for every id; no production wire produces non-
    neutral output (i.e., the selector is exercised but inert).
23. `style plain on` collapses every styled output to its failsafe flatten
    — no theme color, no chip background, no italic, no bold; only the
    linear string. `style plain off` restores styling.
24. `style plain channel gossip on` plain-renders `gossip` while other
    channels stay styled.
25. `style show` prints the current overlay as readable JSON; `style reset`
    clears the overlay to `{}` (theme falls back to whatever default the
    theme key resolves to in an empty overlay).
26. No `console.*` settings keys are introduced or read by this build. A
    grep test gates that no new `console.theme`, `console.channel.*`,
    `console.plain*`, or `console.mention*` reference appears in
    `EnvironmentMixin` setting handling.

**Accessibility**

27. The high-contrast theme renders every selector kind in a form
    distinguishable without color (verified by visual check + per-treatment
    pair audit).
28. The flatten of every test frame parses as a single readable line — no
    ASCII grids, no positional layout.

## Cross-references

- **Seeding slate:** [docs/slates/message-rendering-slate.md](../slates/message-rendering-slate.md)
  (Wave 1).
- **Wire substrate (load-bearing):**
  - [docs/subsystems/messaging.md](../subsystems/messaging.md) — `MessageFrame`,
    topic vocabulary, Scene composer, `Mml.compose`.
  - [docs/subsystems/response-envelope.md](../subsystems/response-envelope.md)
    — `frameId` ordering primitive.
- **Cockpit:**
  - [docs/slates/client-cockpit-slate.md](../slates/client-cockpit-slate.md)
    — the panel inventory this paints into; the click model the renderer
    plugs into.
  - [docs/subsystems/inspection-pane.md](../subsystems/inspection-pane.md) —
    consumes the renderer for focus-body painting.
- **Persistence home:**
  - [docs/subsystems/client-state.md](../subsystems/client-state.md) (or
    wherever ClientStateMixin lives post-console-foundations) —
    `ClientStateMixin` substrate; the overlay is a new field on it.
- **Command-spec patterns** (for the `style` verb):
  - [docs/subsystems/command-spec.md](../subsystems/command-spec.md) — author
    guide for adding a verb: YAML field shape, controller conventions,
    validators, discovery wiring.
  - [docs/subsystems/command-routing.md](../subsystems/command-routing.md) —
    YAML view + controller MVC, dispatch.
- **Deferred neighbors (read for context, do not consume):**
  - [docs/slates/access-slate.md](../slates/access-slate.md) — Wave 2/3
    authoring tier gating (not v1).
  - [docs/slates/social-graph-slate.md](../slates/social-graph-slate.md) —
    real bucket source for friend/foe selector (stubbed in v1).
  - [docs/slates/recognition-slate.md](../slates/recognition-slate.md) —
    DescribeApi v2 names; the renderer is forward-compat (anything that
    produces `<player>`/`<name>` lights up).
  - [docs/subsystems/shell-environment.md](../subsystems/shell-environment.md)
    — `EnvironmentMixin` keyspace + `settings` / `var` commands. Read for
    contrast; **explicitly NOT used by this build** for the user overlay.
- **Antipatterns / constraints:**
  - [[settings-vs-propertied-vs-client-state]] — overlay is the
    client-UI-state category, not settings.
  - [[no-two-word-verbs]] — `style` is single-token; subcommands ride arg
    shape.
  - [[no-new-apis-default]] — no new XApi class; extend `Mml` + add client
    modules + one command controller.
  - [docs/antipatterns.md](../antipatterns.md) — general lookup.
