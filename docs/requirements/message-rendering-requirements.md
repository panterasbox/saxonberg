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
- **Player-tunable per-channel color** (the original driver) via the existing
  `settings` command and `EnvironmentMixin` keyspace; cross-device by default.
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
- **In-world refs in chat via custom URI schemes.** Three URI kinds —
  command-line, stuff-id reference, and MQL query — compile to one
  `<link href="…">` tag whose click is **scheme-routed by the renderer**:
  command and stuff URIs dispatch through the command bus *as the clicker*;
  query URIs go through the existing `mql-query` wire path (resultset
  rendering, not a command). HTTP/HTTPS links coexist as a separate scheme
  family (stripped in v1 chat). Concrete scheme names + URI syntax
  (`://` hierarchical vs opaque `:` form) are planner-level — see Surface
  decisions.
- **Mention surface.** Explicit `@<name>` in user input becomes a resolved
  `<mention stuff-id="…">` tag; the renderer highlights mentions whose target
  matches the viewer. Own-name highlight is a separate, configurable
  setting.
- **Reader sovereignty.** A `console.plain` toggle collapses the cockpit to
  the failsafe (the flatten string). Global + per-channel granularity.
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
| `<link href="…">…</link>` | label as plain text | Clickable in-world ref from `[label](…)` markdown. The `href` is a custom-scheme URI (`mudcmd://` / `mudstuff://` / `mudquery://`); the renderer dispatches by scheme. |

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
namespaced sibling stripped from v1 chat. **Three URI kinds; scheme spellings
+ syntactic form are planner decisions** (see immediately below):

| URI kind | Payload | Click effect | Routing |
|---|---|---|---|
| **command** | a percent-encoded command line | dispatches the decoded line through the regular command bus | `MmlRenderer.commandFor` → existing `onCommandClick` path |
| **stuff-ref** | a stuff-id | resolves the id in the client stuff registry; on hit → `look <primaryKeyword>`; on miss → `look #<id>` (same fallback as existing identity-tag clicks) | command bus (the look) |
| **query** | a percent-encoded MQL string | **opens the resultset directly** (no command synthesis) — the click issues an `mql-query` over the existing wire and renders the snapshot | `mql-query` wire path ([mql-subscription.md](../subsystems/mql-subscription.md)), NOT the command bus |
| **external URL** (`http(s)://…`) | n/a | **stripped from chat in v1**; label survives as plain text | n/a in v1 — reserved namespace for future channel-stylesheet / system-message contexts |
| unknown scheme | n/a | **stripped from chat** at parse time (default-deny) | n/a |

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

**Query-result rendering target (planner-level).** Where the resultset
renders when a query link is clicked — a transient pane, a popup, the
inspection pane reshaped to handle collections, an inline expansion — is a
planner decision. The wire mechanism is fixed (`mql-query` one-shot); the
UI surface is not.

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
- **Query clicks are a read-only** `mql-query` over the existing wire —
  scoped by the clicker's permission tier, same as any `mql-query`. No
  command-bus side-effects from a query link.
- **Hover-preview** shows the resolved command (or "show query results for
  …") in the input before the click commits (existing
  `MmlRenderer.onCommandPreview` plumbing, generalized). Click-jacking is
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
| `channel` | `<chan id>` attribute on the body | per-channel color; `console.channel.<key>.color` setting overrides theme default |
| `element` | tag name | `<strong>` bold, `<em>` italic, `<speech>` italic-quoted, etc. |
| `attribute → bucket` | `stuff-id` → bucket resolver | friend/foe coloring on `<player>`/`<name>` (stub returns `neutral`) |
| `content-match` | viewer-relative (own-name / `<mention>` target) | own-name highlight, self-mention emphasis |

**Theme = a stylesheet bundle.** A theme provides default rules across all
selector kinds; user-level settings (per-channel color overrides, highlight
toggle, plain-mode) layer on top. Cascade order: theme → user settings →
plain-mode override (which collapses all treatments to identity).

### Settings keyspace (EnvironmentMixin)

All v1 prefs are settings, edited via the existing `settings` / `var`
commands, persisted via `EnvironmentMixin` (cross-device per
[[settings-vs-propertied-vs-client-state]]):

- `console.theme` — `default` | `high-contrast`. Default: `default`.
- `console.channel.<key>.color` — string (palette name or hex). Per-channel
  override of the theme's channel default.
- `console.plain` — boolean. Global plain-mode override.
- `console.plain.channels` — list of channel keys to render plain (per-channel
  override). Per-channel granularity *under* the global toggle.
- `console.mention.self` — boolean. Highlight own-name in message bodies.
  Default: ON.

`ClientStateMixin` is **not** the home for these — they're player-tunable
knobs, not UI position state. (Memory: [[settings-vs-propertied-vs-client-state]].)

### Theme bundle

Two themes ship in v1:

- `default` — the existing cockpit dark palette, lifted into stylesheet form.
- `high-contrast` — accessibility-driven; strong fg/bg contrast, larger
  visible weight differences, no color-alone semantics (every distinction
  carries a non-color cue).

Theme files are TypeScript modules on the client; one object per theme. The
engine selects by `console.theme` setting at render time and re-renders on
change. No theme hot-reload, no per-channel theme override.

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
- **Reader sovereignty.** Any styling is `console.plain`-collapsible. No tag,
  no theme rule, no markdown affordance escapes this.
- **No color-alone semantics.** Every colored treatment must pair with a
  non-color cue (weight, prefix, chip, position). Verified by the
  high-contrast theme being legible without the color channel.
- **Theme prefs are settings**, not `ClientStateMixin`
  ([[settings-vs-propertied-vs-client-state]]).
- **No new XApi class.** The markdown→MML pipeline is a static method on
  `Mml` (alongside `Mml.compose` / `Mml.escape` / `Mml.stripTags`). The
  flatten serializer is a `Mml` instance / static method. Client-side parser
  + stylesheet engine + template registry are plain modules under
  `packages/client/src/`, not Apis. ([[no-new-apis-default]])
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
- **Query links bypass the command bus.** Clicking a query-scheme link
  issues `mql-query` over the existing subscription wire (see
  [mql-subscription.md](../subsystems/mql-subscription.md)); it is **not** a
  command synthesis. The resultset-rendering UI target (transient pane /
  popup / inspection-pane reshape) is also planner-level; the wire
  mechanism is fixed.
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
14. A query-scheme link wrapping the MQL `guard in here` clicks to a
    `mql-query` over the wire, NOT a command bus dispatch; the resultset
    renders in the planner's chosen target surface.
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
19. `console.mention.self = false` suppresses own-name highlight; mentions
    still light up.

**Stylesheet & themes**

20. Setting `console.channel.gossip.color = blue` paints the `[Gossip]` chip
    in blue across all `world.chat.gossip` frames; persists across reloads.
21. Setting `console.theme = high-contrast` swaps the cockpit theme;
    `default` swaps it back. No reconnect needed.
22. The friend/foe selector resolves `stuff-id` against the bucket resolver;
    stub returns `neutral` for every id; no production wire produces non-
    neutral output (i.e., the selector is exercised but inert).
23. `console.plain = true` collapses every styled output to its failsafe
    flatten — no theme color, no chip background, no italic, no bold; only
    the linear string.
24. `console.plain.channels = ['gossip']` plain-renders `gossip` while other
    channels stay styled.

**Accessibility**

25. The high-contrast theme renders every selector kind in a form
    distinguishable without color (verified by visual check + per-treatment
    pair audit).
26. The flatten of every test frame parses as a single readable line — no
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
- **Settings:**
  - [docs/subsystems/shell-environment.md](../subsystems/shell-environment.md)
    — `EnvironmentMixin` keyspace, `settings` / `var` commands.
- **Deferred neighbors (read for context, do not consume):**
  - [docs/slates/access-slate.md](../slates/access-slate.md) — Wave 2/3
    authoring tier gating (not v1).
  - [docs/slates/social-graph-slate.md](../slates/social-graph-slate.md) —
    real bucket source for friend/foe selector (stubbed in v1).
  - [docs/slates/recognition-slate.md](../slates/recognition-slate.md) —
    DescribeApi v2 names; the renderer is forward-compat (anything that
    produces `<player>`/`<name>` lights up).
- **Antipatterns / constraints:**
  - [[settings-vs-propertied-vs-client-state]] — theme prefs are settings.
  - [[no-new-apis-default]] — no new XApi class; extend `Mml` + add client
    modules.
  - [docs/antipatterns.md](../antipatterns.md) — general lookup.
