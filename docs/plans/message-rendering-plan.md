# Message Rendering — Wave 1 Implementation Plan

> Graduates [docs/requirements/message-rendering-requirements.md](../requirements/message-rendering-requirements.md)
> (seeded by [docs/slates/message-rendering-slate.md](../slates/message-rendering-slate.md)).
> Scope: Wave 1 only — MML extensions + `<sys>` retirement, nested-aware
> client parser, markdown→MML pipeline, stylesheet engine + two themes, the
> `style` verb backed by a new `styleOverlay` field on `HasInteractiveMixin`,
> per-message-type templates (chat / say / tell / emote / default). Wave 2
> (layout library) and Wave 3 (channel stylesheets) are OUT.

## 1. Summary

This plan implements Wave 1 of `docs/requirements/message-rendering-requirements.md` — every cockpit message painted through one renderer that maps semantic MML → styled output via a reader-owned stylesheet, with the wire body always a tagged-complete-string that flattens to a failsafe line. The work touches `Mml` (new tag helpers, flatten serializer, markdown parser as static methods — no new Api), retires `Mml.sys`, replaces the flat-regex `MmlRenderer.tsx` with a nested-aware state-machine + recursive renderer, adds a stylesheet engine + two themes + per-message-type templates as plain client modules, adds one `styleOverlay` field to `HasInteractiveMixin` plus a server→client push, and adds a `style` controller + `style.yaml` view. Acceptance criteria 1–28 each have a buildable test path or a `verify` step.

The build is split into nine chunks (0 + A–I). The MML extensions and `<sys>` retirement are server-only and unblock most client work; the nested parser is client-only and unblocks the renderer + templates + stylesheet; the markdown pipeline + mention resolution sit on the server's MML extensions; the `style` verb + overlay push wire close the loop. Query-scheme links are namespace-reserved but inert in v1 (D3) — no wire path, no click handler.

---

## 2. Planner-level decisions

### D1. Custom URI scheme spellings

Pick **`mudcmd` / `mudref` / `mudq`**.

Rationale: `mud-` prefix is project-owned and won't collide with any registered or de-facto scheme; three short words to keep `[label](URI)` markdown legible. `mudref` is preferred over `mudstuff` — "stuff" is project jargon; "ref" is the conventional name for an in-world identity reference (mirrors the `StuffRef` wire type) and reads better in author-facing docs. `mudq` over `mudquery` to keep MQL links short in chat where players will type them.

### D2. URI syntactic form

Pick **opaque** (`scheme:payload`, no `//`).

Rationale: these URIs are payload-only — no authority, no path hierarchy, no port. RFC 3986 spells that as the opaque form. `mailto:`, `tel:`, `urn:`, `data:` are the precedents. `new URL("mudcmd:look%20sword").pathname === "look%20sword"` parses cleanly; `.protocol === "mudcmd:"`. Apply consistently:

- `mudcmd:look%20sword` — percent-encoded command line
- `mudref:s_12345` — stuff-id
- `mudq:guard%20in%20here` — percent-encoded MQL

### D3. MQL query-link click target — DEFERRED

**Query-scheme links are inert in v1** per the requirements doc revision:
the parser recognizes `mudq:`, produces a `<link href="mudq:…">` tag, and
the renderer paints it as **styled-but-non-clickable text**. No click
handler is registered for the query scheme.

Rationale: at requirements time we tried to spec inline-resultset
rendering and discovered we'd invented behavior the user never asked for.
The MQL-result UX is a real open question (shell out to `find`, CMS-edit
reshape, dedicated panel — none decided) and forcing a v1 answer would
bake in churn. The scope clamp is deliberate: namespace the scheme so
future wiring is additive; ship zero click semantics now.

Concrete: the renderer's scheme switch returns `null` (non-clickable) for
`mudq:`. A distinct `InertLinkSpan` styled component lets the engine paint
it as a known inert kind — **deliberately not styled like a clickable
link**: no underline, no cursor:pointer, no hover state. A subtle
background tint or muted accent color is enough to signal "this is a
known link kind that doesn't do anything yet" without misleading the
reader into clicking. No `sendMqlQuery`, no `system.query.result` topic,
no synthetic-frame plumbing.

### D4. User overlay JSON schema (exact shape)

Pick a **flat-key map**: `Record<string, string | boolean | TreatmentLeaf>` where `TreatmentLeaf` is a small fixed-keys object. Concrete TypeScript:

```ts
export type StyleColor = string;         // theme-token name OR "blue" / "red" / ... (bounded palette)
export type StyleWeight = 'normal' | 'bold';
export interface StyleTreatment {
  fg?: StyleColor;
  bg?: StyleColor;
  weight?: StyleWeight;
  italic?: boolean;
  prefix?: string;       // e.g. "── "
  chip?: boolean;        // render the value as a chip
  indent?: 'hang' | 'block' | 'none';
}
export interface StyleOverlay {
  // Scalars
  'theme'?: 'default' | 'high-contrast';
  'plain'?: boolean;
  'mention.self'?: boolean;             // default: true (own-name highlight ON)
  // Per-channel treatments
  [k: `channel.${string}.color`]: StyleColor;
  [k: `channel.${string}.plain`]: boolean;
  // Per-element / topic / mention treatments (the bigger surface)
  [k: `element.${string}`]: StyleTreatment;
  [k: `topic.${string}`]: StyleTreatment;
  [k: `attribute.${string}.${string}`]: StyleTreatment;   // attribute → bucket (v1: bucket.friend/foe/neutral)
  'mention.match'?: StyleTreatment;
  'mention.other'?: StyleTreatment;
}
```

Rationale:
- Flat-key map (one level of dotted strings) is the same shape the existing `clientState` slice already speaks (`console.tabs`, `console.activeTab`). Mutations are localized — `style channel gossip color blue` writes `overlay['channel.gossip.color'] = 'blue'`. Selector lookup is O(1).
- Empty overlay = `{}` per the requirements doc.
- Bounded JSON: the engine's selector resolver consults a fixed key-prefix switch (`channel.*.color`, `channel.*.plain`, `element.*`, `topic.*`, `attribute.*`, `mention.*`, `theme`, `plain`); unknown prefixes are silently dropped, unknown treatment props are ignored.
- The shape is forward-compatible with a future visual editor (the editor reads/writes the same flat-key bag).
- Rules-array shape was considered and rejected — it makes per-channel edits O(n) and ergonomically wrong for the `style channel X color Y` mutation pattern.

### D5. Mention scope resolution predicate

Pick a **new static helper on `Mml`** (where the markdown parser lives), delegated to a small `MentionResolver` interface implemented by the scene composer's caller chain. Concrete:

```ts
// On Mml:
static markdownToMml(text: string, resolver: MentionResolver): Mml { ... }

// Resolver interface:
export interface MentionResolver {
  // Return stuff-id for a literal `@<word>` (case-insensitive), or null.
  resolveMention(word: string): string | null;
}
```

Scope resolution lives at the caller (the `say` / `tell` / `emote` / chat-channel emit sites pass their own resolver):

- **Chat topics** (`world.chat.*`) — the channel call site builds a resolver that enumerates the channel's tuned-in set and matches against each participant's display name (case-insensitive on first name; falls back to honorific-or-surname disambiguation if multiple match — silent on tie, per "silent on miss").
- **say / tell / emote** — the call site builds a resolver from `PerceiverMixin.getPerceivable(speaker)` (same set MQL's pronoun resolver walks). For tell, also accept the explicit `target` as a candidate.

We do NOT introduce a `ChannelApi` in this build — no channels exist yet (no Topic constants for `world.chat.*`, no `ChannelMixin`). The chat call site for the acceptance test (#17) lands as a small test-only emitter wired through the existing `say`/`tell` composition path with a stub channel resolver — Wave 2 of the chat-slate will replace it with a real channel manager. The `MentionResolver` interface is the seam.

This keeps the parse-time resolution server-authoritative, silent on miss, and per the requirements doc; the chat-topic acceptance criteria are exercised through a test-resolver fixture.

### D6. Style verb's overlay-push wire mechanism

Pick a **dedicated `client-state-update` outbound message** (server→client push), parallel to the existing `client-state-write` inbound.

Rationale: the existing client-state plumbing is already optimistic (client mutates `clientState` then sends `client-state-write`). The `style` verb runs server-side and has no client-optimistic mutation to start from — we need a push. The existing `system.connection.established` welcome payload carries the dense snapshot, but waiting for reconnect violates acceptance criterion 20 ("survives reconnect" plus immediate re-render). Concrete:

- Add an outbound `ClientStateUpdateMessage` in `@saxonberg/types`: `{ type: 'client-state-update', payload: { key: string, value: unknown } }`.
- Server side: extend `HasInteractiveMixin` with `pushClientStateUpdate(key, value)` that walks `getInteractives()` and calls a new `Application.sendClientStateUpdateToInteractive(interactive, key, value)` — sends through `Backend.sendMessageToSocket` (raw shape, no `frameId`; this is wire-substrate plumbing, not a Sensor MessageFrame).
- The mixin's `setClientState` does NOT automatically push (avoids feedback loop with `client-state-write` from the client). The `style` controller explicitly calls `holder.pushClientStateUpdate(key, value)` after `setClientState`, then `holder.save()`. (This pattern is one line per write; the `console.*` `client-state-write` path stays unchanged.)
- Client side: register a handler in `services/websocket.ts` for `client-state-update` that calls `useStore.getState().setLocalClientState(key, value)`.

This keeps the wire surface tight (one new message type), reuses every existing optimistic-update path, and supports both immediate re-render and reconnect-snapshot via independent mechanisms.

---

## 3. Build waves / chunks

Ordered to minimize cross-chunk blocking. Chunks A–D can run in parallel after Chunk 0; E depends on B+C; F depends on B; G depends on A+E.

### Chunk 0 — Topic constants + types shims (server + types)

Tiny prep chunk; everything else builds on these.

- Add to `MessageApi.Topics` (in `packages/server/src/mud/api/message.ts`):
  - `world.chat.root = 'world.chat'` (prefix-match anchor for topic-cascade selectors)
  - `world.emote.root = 'world.emote'`
  - `system.style = 'system.style'` (frames the `style` verb emits)
- Add to `@saxonberg/types/src/index.ts`:
  - `ClientStateUpdateMessage` (D6)
- Lands: prerequisite for #1, #3, #4, #5, #20

### Chunk A — MML extensions + flatten serializer + `<sys>` retirement (server)

**Files modified:**
- `packages/server/src/mud/api/mml.ts`
- `packages/server/src/mud/obj/command/LookController.ts` (the two `Mml.sys(...)` call sites)

**Files created:**
- `packages/server/src/mud/api/__tests__/mml.extensions.test.ts`
- `packages/server/src/mud/api/__tests__/mml.flatten.test.ts`

**Changes to `mml.ts`:**

1. Remove `static sys(text)` (acceptance #8, #26).
2. Add new tag helpers (each emits the failsafe per the requirements table; raw values are escaped):
   - `static chan(id: string, label: string): Mml`
   - `static msg(text: Mml | string): Mml`
   - `static player(stuff: Stuff): Mml` (mirror of `name`, falls back the same way)
   - `static npc(stuff: Stuff): Mml`
   - `static mention(stuffId: string, label: string): Mml`
   - `static link(href: string, label: Mml | string): Mml` (href validated against the three custom schemes — `mudcmd:` / `mudref:` / `mudq:` — else throws; this is the server-internal compose surface, not user input)
   - Emphasis: `static strong(body)`, `static em(body)`, `static code(body)`, `static pre(body)`, `static blockquote(body)`, `static strike(body)`
   - List: `static unorderedList(items: Mml[]): Mml`, `static orderedList(items: Mml[]): Mml`, `static li(body): Mml`
3. Add `static flatten(body: string): string` — failsafe serializer. State-machine over the body; for each tag, look up its flatten template; emit it with children recursively flattened. The current `stripTags` is a subset of this (drops all tags); `flatten` instead emits per-tag failsafe text per the requirements table. Move `stripTags` to call `flatten` for back-compat, or keep both (`stripTags` = bare-plain, `flatten` = markdown-preserving). Decision: keep both. `stripTags` stays the "bare plain" emit path (used by the `style plain on` v1 collapse contract — emits the linear-labeled string without emphasis markdown); `flatten` is the markdown-round-trip path (emphasis preserved as `**bold**` etc., used by `style plain on` flat-and-markdown contract if the renderer wants both modes). v1 uses `stripTags` for the plain-mode collapse to match "no italic, no bold; only the linear string" wording in #23; `flatten` is exposed for tests + logs that want emphasis preserved.

**Per-tag flatten table (in code):**
| Tag | Flatten |
|---|---|
| `<chan id="…">[X]</chan>` | `[X]` |
| `<msg>…</msg>` | children verbatim |
| `<player>…</player>`, `<npc>…</npc>` | children verbatim (same as `<name>`) |
| `<mention>…</mention>` | children verbatim |
| `<link href="…">…</link>` | children as plain text |
| `<strong>…</strong>` | `**…**` |
| `<em>…</em>` | `*…*` |
| `<code>…</code>` | `` `…` `` |
| `<pre>…</pre>` | `` ```…``` `` |
| `<blockquote>…</blockquote>` | `> …` (prefixed on each newline-separated line) |
| `<strike>…</strike>` | `~~…~~` |
| `<list ordered="true">…</list>` | block (children join with `\n`); `<li>` numbered |
| `<list>…</list>` | block (children join with `\n`); `<li>` dashed |
| `<li>…</li>` | `- ` (or `N. `) prefix |
| existing identity tags | children verbatim |
| `<speech>`, `<direction>`, `<exit>`, `<detail>`, `<item>`, `<name>`, `<location>`, `<object>` | unchanged from existing behavior |

4. Replace `Mml.list(items, …)` markup it emits (the auto-list helper for inline / block) only if it'd clash with the new `<list>` semantic tag. It won't — `Mml.list` emits a flat comma-string today, not `<list>` markup. Leave it alone.

**Changes to `LookController.ts`:**

- Line 220: `Mml.sys('You also see:')` → plain text `'You also see:'` inside `Mml.fromMarkup` or compose body. The simplest replacement:
  ```ts
  body = Mml.compose`${body}\nYou also see: ${list}.`;
  ```
- Line 294: `Mml.sys('Obvious exits:')` → `Mml.compose`Obvious exits: ${joined}.``

**Acceptance landed:** #7 (parser test data uses new tags), #8 (sys grep test), #10/11 (markdown round-trip), partial #20–25 (renderer tests can build against these tag shapes).

### Chunk B — Nested-aware client parser (client)

**Files modified:**
- `packages/client/src/components/MmlRenderer.tsx` (parser swap-out)

**Files created:**
- `packages/client/src/lib/mml/parseMml.ts` — state-machine parser
- `packages/client/src/lib/mml/__tests__/parseMml.test.ts`

**Parser shape:**

```ts
export type MmlTree =
  | { kind: 'text'; text: string }
  | { kind: 'tag'; tag: string; attrs: Record<string, string>; children: MmlTree[] };

export function parseMml(input: string): MmlTree[];
```

State machine: track `text` / `tag-open` / `tag-name` / `attr-name` / `attr-value` / `text-content` / `tag-close`; maintain a stack of open tags; close-tag mismatches are recovered by silently dropping the mismatched close (matches current renderer's "tolerate unclosed tags" behavior). Entity decoding (`&lt;` `&gt;` `&amp;` `&quot;` `&apos;`) preserved verbatim in text + attribute values per the existing `decodeEntities` contract (#9).

**Recursive renderer in `MmlRenderer.tsx`:**

The current `MmlRenderer` body is replaced. New shape:

```tsx
function renderTree(nodes: MmlTree[], ctx: RenderCtx): React.ReactNode[]
```

Where `RenderCtx` carries `onCommandClick`, `onCommandPreview`, the resolved stylesheet, and the viewer's own `stuffId`. (No `onQueryClick` — query links are inert; see D3.) Tag handlers:

- existing handlers (`<exit>`, `<detail>`, `<item>`, `<name>`, `<location>`, `<object>`) preserved verbatim (acceptance #8 — preserved set)
- new handlers wire into the stylesheet engine for visual treatment; clickable tags wrap the recursively-rendered children in a `ClickableSpan`
- `<link href="…">` dispatches by scheme: `mudcmd:` and `mudref:` go through `onCommandClick`; **`mudq:` returns no command — the renderer paints the children through an `InertLinkSpan` (distinct CSS treatment from `ClickableSpan`) with no click/preview handlers attached** (#12, #14)
- `<mention>` checks `stuff-id === viewer.stuffId` → applies `mention.match` treatment; else `mention.other`
- `<chan>` applies the channel chip treatment + per-channel color from overlay
- `<sys>` handling is **removed** (criterion #8)

Hover preview for clickable `<link>` shows the resolved command (`mudcmd:` payload, decoded `mudref:` look) (#12). `mudq:` links have no hover preview.

**Acceptance landed:** #7, #8 (preserved set side), #9 (entity decoding), partial #12–16 (link routing).

### Chunk C — Stylesheet engine + themes (client)

**Files created:**
- `packages/client/src/lib/style/Theme.ts` — `Theme` type, both theme bundles inline
- `packages/client/src/lib/style/themes/default.ts` — default theme (lifts current `tokens.ts` palette)
- `packages/client/src/lib/style/themes/highContrast.ts` — high-contrast theme
- `packages/client/src/lib/style/BucketResolver.ts` — interface + stub
- `packages/client/src/lib/style/Stylesheet.ts` — selector→treatment lookup, cascade order
- `packages/client/src/lib/style/applyTreatment.ts` — render-time helper: takes a treatment + children, returns styled JSX
- `packages/client/src/lib/style/useStylesheet.ts` — React hook: reads overlay from store, picks theme, returns the resolved `Stylesheet` instance
- `packages/client/src/lib/style/__tests__/Stylesheet.test.ts`
- `packages/client/src/lib/style/__tests__/themes.test.ts`

**Key types/interfaces:**

```ts
export interface Treatment { fg?: string; bg?: string; weight?: 'bold'|'normal'; italic?: boolean; prefix?: string; chip?: boolean; indent?: 'hang'|'block'|'none'; }
export interface Theme { name: string; rules: Record<string, Treatment | string | boolean>; }
export interface BucketResolver { resolveBucket(stuffId: string): 'friend' | 'foe' | 'neutral'; }
export const NEUTRAL_BUCKET_RESOLVER: BucketResolver = { resolveBucket: () => 'neutral' };
export class Stylesheet {
  constructor(theme: Theme, overlay: StyleOverlay, opts: { resolver: BucketResolver; viewerStuffId: string | null });
  // Resolve treatment for a frame topic
  topicTreatment(topic: string): Treatment;
  // Resolve treatment for an MML element tag
  elementTreatment(tag: string, attrs: Record<string, string>): Treatment;
  // Resolve treatment for a channel chip
  channelTreatment(channelId: string): Treatment;
  // Plain-mode check: returns true if styling should collapse to identity
  isPlain(topic: string, channelId?: string): boolean;
}
```

**Cascade order (per the requirements doc):** theme → overlay → plain-mode override (collapses to identity / empty treatment).

**Selector resolution algorithm (per kind):**
- **topic** (longest-prefix cascade): walk `topic` down the dots (`world.chat.gossip` → `world.chat` → `world` → `''`), merge treatments from longest match wins direction; overlay layered on top.
- **channel**: look up `channel.${id}.color` and `channel.${id}.plain` in overlay; theme provides defaults.
- **element**: `element.${tag}` straight key lookup.
- **attribute→bucket**: when a tag carries `stuff-id`, call resolver, look up `attribute.stuff-id.${bucket}` (so `attribute.stuff-id.friend` / `.foe` / `.neutral`).
- **content-match** (v1: own-name + mention-target only): the `mention.match` / `mention.other` keys; the renderer evaluates the predicate.

**Plain-mode override:** `Stylesheet.isPlain(topic, channelId)` checks `overlay.plain === true` OR `overlay[`channel.${channelId}.plain`] === true`. When true, `applyTreatment` returns the children un-styled (no fg/bg/weight/italic/chip/prefix); the parent template still lays them out in the failsafe shape (per #23 "linear string").

**Themes:**

- `default.ts` exports the current `tokens.ts` palette as theme rules — `topic.system: { fg: '#888', prefix: '── ', italic: true }` (this is where the retired `<sys>` styling moves, per the requirements doc's note that `system.*` whole-frame muting lives on the topic cascade); `element.speech: { italic: true }`; `element.strong: { weight: 'bold' }`; `element.em: { italic: true }`; etc.
- `highContrast.ts` exports the accessibility variant: high-contrast fg/bg pairs, larger weight deltas, prefix markers everywhere a color difference exists in default (acceptance #27 — no color-alone semantics).

**Acceptance landed:** #5 (system.* topic-cascade), #20–24 (overlay-driven stylesheet effects), #27 (high-contrast).

### Chunk D — Markdown→MML pipeline + mention resolver (server)

**Files modified:**
- `packages/server/src/mud/api/mml.ts` — add `static markdownToMml(text, resolver?): Mml` and `MentionResolver` interface + `perceiverMentionResolver` / `channelMentionResolver` factories

**Files created:**
- `packages/server/src/mud/api/__tests__/mml.markdown.test.ts`

**Parser shape:**

Discord-dialect subset, single-pass tokenizer + state machine. Recognizes:
- block: `> quote` (line-leading); `- ` / `1. ` list items; ` ```…``` ` fenced code
- inline: `**bold**`, `*italic*` / `_italic_`, `` `code` ``, `~~strike~~`, `[label](URI)`, `@<word>`
- Nested-list edge cases dropped per non-goal; one level only

URI handling for `[label](URI)`:
- if URI starts with `mudcmd:` / `mudref:` / `mudq:` → emit `<link href="URI">label</link>`
- else (http://, https://, javascript:, anything unknown) → strip URI, keep label as plain text (#15, #16)

Mention handling: `@<word>` (word boundary, ASCII alnum + apostrophe + dash) → call `resolver.resolveMention(word)`; on hit emit `<mention stuff-id="X">@Word</mention>`; on miss leave the literal `@Word` text in place (#17, #18).

**MentionResolver factory methods on `Mml`:**

```ts
// On Mml (api/mml.ts):
static perceiverMentionResolver(speaker: Stuff & Perceiver): MentionResolver { ... }
static channelMentionResolver(participants: Iterable<Stuff>): MentionResolver { ... }
```

`perceiverMentionResolver` is wired up at the `SayController` / `TellController` / `VocalMixin` call sites (they parse the user text through `Mml.markdownToMml(text, Mml.perceiverMentionResolver(speaker))` before passing to `Mml.speech` — which now wraps the parsed MML, not the raw text).

Adjust `VocalMixin.say` (and `TellController` analog) so the user-supplied text region runs through `markdownToMml` before being wrapped in `<speech>`. This is one line of plumbing per emit site.

**Acceptance landed:** #10–12, #15–18.

### Chunk E — Per-message-type templates (client)

**Files created:**
- `packages/client/src/lib/templates/TemplateRegistry.ts` — `registerTemplate(topicPrefix, fn)`, longest-prefix dispatch, `defaultTemplate`
- `packages/client/src/lib/templates/chatTemplate.ts`
- `packages/client/src/lib/templates/sayTemplate.ts`
- `packages/client/src/lib/templates/tellTemplate.ts`
- `packages/client/src/lib/templates/emoteTemplate.ts`
- `packages/client/src/lib/templates/defaultTemplate.ts`
- `packages/client/src/lib/templates/__tests__/TemplateRegistry.test.ts`
- `packages/client/src/lib/templates/__tests__/templates.test.ts`

**Template shape:**

```ts
export interface TemplateCtx {
  frame: Frame;
  tree: MmlTree[];
  stylesheet: Stylesheet;
  onCommandClick: (cmd: string) => void;
  onCommandPreview: (cmd: string | null) => void;
}
export type Template = (ctx: TemplateCtx) => React.ReactNode;
```

- `defaultTemplate` renders the tree inline through the recursive renderer + stylesheet. Used for `system.*` and everything not chat/say/tell/emote.
- `chatTemplate` walks the tree; finds the first `<chan>` (gutter column), the first `<player>`/`<name>` (sender), the first `<msg>` (content); lays them out via flex columns with a hanging-indent CSS rule under the name (#1).
- `sayTemplate`, `tellTemplate`, `emoteTemplate` — inline layouts per the requirements table.

**Wiring in `Terminal.tsx`:** the `Body` for each frame switches on `frame.topic` via `TemplateRegistry.pickTemplate(topic)`; defaults to `defaultTemplate`. The current `MmlRenderer` direct invocation becomes the inner recursive call inside `defaultTemplate`. `MmlRenderer.tsx` shrinks to "render this MML tree through the stylesheet" — the old top-level component becomes a small wrapper.

**Acceptance landed:** #1–6.

### Chunk F — `styleOverlay` field on `HasInteractiveMixin` + server→client push (server + client + types)

**Files modified:**
- `packages/server/src/mud/lib/connection/HasInteractive.ts` — add overlay schema entry + `pushClientStateUpdate`
- `packages/server/src/backend/Application.ts` — add `sendClientStateUpdateToInteractive`
- `packages/types/src/index.ts` — add `ClientStateUpdateMessage`
- `packages/client/src/services/websocket.ts` — register handler that calls `setLocalClientState`
- `packages/client/src/store/index.ts` — already has `setLocalClientState`; nothing to change

**Schema entry added to `HasInteractiveMixin.clientStateSchema`:**

```ts
{
  key: 'style.overlay',
  defaultValue: {} as StyleOverlay,
  description: 'Reader-owned visual customization overlay (themes, channel colors, plain-mode, mention prefs).',
  validator: (v) => isBoundedStyleOverlay(v) === true ? true : 'unknown selectors',
}
```

The `isBoundedStyleOverlay` validator is permissive: it checks the top-level shape is an object, but does NOT reject unknown keys at write time (so mid-edit partial states from a future GUI editor don't trip it). The `Stylesheet` resolver does per-value defensive parsing — unknown selector prefixes and unknown treatment properties no-op silently. This split keeps the validator simple and the runtime forgiving.

**New mixin method:**

```ts
public pushClientStateUpdate(key: string, value: unknown): void {
  for (const interactive of this.getInteractives()) {
    Application.get().sendClientStateUpdateToInteractive(interactive, key, value);
  }
}
```

**Acceptance landed:** plumbing for #20 (persists + survives reconnect), #23–25 (real-time push), #26 (no `console.*` keys touched; this is `style.*`).

### Chunk G — `style` verb (controller + YAML + seed)

**Files created:**
- `packages/server/src/mud/cmd/style.yaml`
- `packages/server/src/mud/obj/command/StyleController.ts`
- `packages/server/src/mud/seeds/obj/command/StyleController.yaml`
- `packages/server/src/mud/obj/command/__tests__/StyleController.test.ts`

**YAML (subcommands per the requirements doc's table):**

```yaml
verbs: [style]
controller: StyleController
description: "Visual customization — theme, per-channel color, plain mode."
subcommands:
  show: { description: "Print current overlay as readable JSON" }
  theme:
    description: "Set theme to default or high-contrast"
    args:
      - { name: name, type: string, required: true }
  channel:
    description: "Per-channel color / clear"
    args:
      - { name: channelKey, type: string, required: true }
      - { name: action, type: string, required: true }      # "color" | "clear"
      - { name: value, type: string, required: false }
  mention:
    description: "Toggle own-name highlight"
    args:
      - { name: target, type: string, required: true }       # "self"
      - { name: state, type: string, required: true }        # "on" | "off"
  plain:
    description: "Global or per-channel plain-mode toggle"
    args:
      - { name: a, type: string, required: true }            # "on" | "off" | "channel"
      - { name: b, type: string, required: false }           # channel key when a == "channel"
      - { name: c, type: string, required: false }           # "on" | "off" when a == "channel"
  reset: { description: "Clear overlay to {}" }
```

(Subcommand surface uses positionals; CLAUDE.md and command-spec.md allow it. An alternative is splitting `plain` into `plain` and `plain channel` subcommands — both work; the unified form keeps the YAML shorter.)

**Controller surface:**

Mirrors `SettingsController` shape: narrow giver to `HasInteractive & Stuff` (or just check via `MixinApi.isHasInteractive`), mutate `getClientState('style.overlay')`, `setClientState('style.overlay', next)`, `pushClientStateUpdate('style.overlay', next)`, `holder.save()`, send a confirmation scene at `system.style`.

**Validation:** unknown theme name → fail with `controller-rejected` reason `'unknown-theme'`; unknown channel-action → similar.

**Seed file:** mirrors the existing `AliasController.yaml` shape.

**Wiring:** the verb needs to be discovered for any logged-in Avatar. Add `'style.yaml'` to the `commandContributions` of either `HasInteractiveMixin` (since style is a client-UI concept that lives on the same mixin) or `Avatar` directly. Recommendation: add to `HasInteractiveMixin.commandContributions.self` — that way the verb travels wherever the mixin does (Avatar today, future cockpit-bearing classes tomorrow), matching the mixin's role as the substrate for client-attached state.

`HasInteractiveMixin` doesn't currently declare `commandContributions`; add the static field alongside `clientStateSchema`.

**Acceptance landed:** #19 (`style mention self off`), #20 (channel color), #21 (theme swap), #23, #24, #25.

### Chunk H — Topics catalogue entries for new topics (server, low-stakes)

Add `Topic` template docs (per `docs/subsystems/topics.md`) for `world.chat` (family root, used by chat-template topic-prefix match), `world.emote`, `system.style`. These are leaf-template additions under `/lib/messaging/Topic/`; the `TopicCatalogue` self-loads at boot. Acceptance criteria don't require this strictly, but it lets `verify` of #5 (`system.command.info` topic-cascade) hit a defined family.

### Chunk I — Tests (acceptance coverage)

Tests are colocated per CLAUDE.md (`__tests__/`). See the test strategy section for the criterion → test map.

---

## 4. File-by-file inventory

### New files

| Path | Category | Purpose |
|---|---|---|
| `packages/client/src/lib/mml/parseMml.ts` | client module | State-machine MML parser → tree |
| `packages/client/src/lib/mml/__tests__/parseMml.test.ts` | test | parser unit tests (#7, #9) |
| `packages/client/src/lib/style/Theme.ts` | client module | Theme type + cascade rules type |
| `packages/client/src/lib/style/Stylesheet.ts` | client module | Selector→treatment resolver |
| `packages/client/src/lib/style/applyTreatment.ts` | client module | Treatment→React node helper |
| `packages/client/src/lib/style/useStylesheet.ts` | client module | React hook bridging store overlay → Stylesheet |
| `packages/client/src/lib/style/BucketResolver.ts` | client module | Friend/foe interface + stub |
| `packages/client/src/lib/style/themes/default.ts` | client module | Default theme bundle |
| `packages/client/src/lib/style/themes/highContrast.ts` | client module | High-contrast theme bundle |
| `packages/client/src/lib/style/__tests__/Stylesheet.test.ts` | test | selector cascade tests (#20–24) |
| `packages/client/src/lib/style/__tests__/themes.test.ts` | test | per-treatment audit (#27) |
| `packages/client/src/lib/templates/TemplateRegistry.ts` | client module | longest-prefix template dispatcher |
| `packages/client/src/lib/templates/chatTemplate.ts` | client module | chat layout (#1) |
| `packages/client/src/lib/templates/sayTemplate.ts` | client module | say layout (#2) |
| `packages/client/src/lib/templates/tellTemplate.ts` | client module | tell layout (#3) |
| `packages/client/src/lib/templates/emoteTemplate.ts` | client module | emote layout (#4) |
| `packages/client/src/lib/templates/defaultTemplate.ts` | client module | inline default (#5, #6) |
| `packages/client/src/lib/templates/__tests__/TemplateRegistry.test.ts` | test | dispatch tests |
| `packages/client/src/lib/templates/__tests__/templates.test.ts` | test | per-template render snapshots |
| `packages/server/src/mud/cmd/style.yaml` | Command YAML | `style` verb view |
| `packages/server/src/mud/obj/command/StyleController.ts` | Controller | `style` verb execution |
| `packages/server/src/mud/seeds/obj/command/StyleController.yaml` | Controller seed | clone template |
| `packages/server/src/mud/obj/command/__tests__/StyleController.test.ts` | test | subcommand coverage (#19–25) |
| `packages/server/src/mud/api/__tests__/mml.extensions.test.ts` | test | new tag helpers + flatten (#7, #10, #11) |
| `packages/server/src/mud/api/__tests__/mml.flatten.test.ts` | test | per-tag flatten table |
| `packages/server/src/mud/api/__tests__/mml.markdown.test.ts` | test | markdown→MML (#10–18) |
| `packages/server/src/mud/api/__tests__/mml.sysRetired.test.ts` | test | grep test (#8, #26) |

### Modified files

| Path | What changes |
|---|---|
| `packages/server/src/mud/api/mml.ts` | Remove `Mml.sys`; add new tag helpers, `markdownToMml`, `flatten`, `MentionResolver` interface, `perceiverMentionResolver` / `channelMentionResolver` factories |
| `packages/server/src/mud/api/message.ts` | Add new topic constants (`world.chat.root`, `world.emote.root`, `system.style`) |
| `packages/server/src/mud/obj/command/LookController.ts` | Replace two `Mml.sys(...)` call sites with plain text |
| `packages/server/src/mud/lib/message/Vocal.ts` | Run `text` through `Mml.markdownToMml(text, Mml.perceiverMentionResolver(speaker))` before wrapping; `<speech>` body becomes the parsed MML, not raw text |
| `packages/server/src/mud/obj/command/TellController.ts` | Same treatment for tell |
| `packages/server/src/mud/lib/connection/HasInteractive.ts` | Add `style.overlay` schema entry + `pushClientStateUpdate` method + `commandContributions` static carrying `'style.yaml'` |
| `packages/server/src/backend/Application.ts` | Add `sendClientStateUpdateToInteractive(interactive, key, value)` |
| `packages/types/src/index.ts` | Add `ClientStateUpdateMessage`, `StyleOverlay` type, `StyleTreatment` type |
| `packages/client/src/components/MmlRenderer.tsx` | Replace flat-regex parser with `parseMml` import; rewrite to recursive renderer; integrate `useStylesheet`; remove `<sys>` `SysSpan`; add `<link>` scheme dispatch + `<mention>` viewer-match treatment |
| `packages/client/src/components/Terminal.tsx` | Replace direct `MmlRenderer` call with `TemplateRegistry.pickTemplate(topic)(ctx)` |
| `packages/client/src/services/websocket.ts` | Add `client-state-update` inbound handler |
| `packages/client/src/App.tsx` | No changes for query click (deferred); minor passthrough adjustments as needed for the stylesheet hook |

### Files explicitly NOT touched

- `packages/server/src/mud/lib/shell/Environment.ts` and `settings.yaml` — per constraint "no `console.*` keys, do not extend EnvironmentMixin for this build".
- Any `<sys>`-emitting site OUTSIDE `LookController.ts` — grep confirmed those are the only two. The grep test in `__tests__/mml.sysRetired.test.ts` gates against regression.

---

## 5. Critical-path call-out

**Hard sequencing:**

- Chunk 0 (topic constants + types) blocks everything else.
- Chunk A (MML extensions + sys retirement) blocks D (markdown emits the new tags), E (templates render the new tags), and the test fixtures for B.
- Chunk B (parser) blocks E (templates need the tree) and G (the `style show` controller composes a JSON string that the parser eventually reads — minor coupling but the controller's tests need it).
- Chunk C (stylesheet) and Chunk E (templates) are mutually dependent on each other's contracts; the `Stylesheet` interface + `Treatment` shape must be agreed first, then both can build in parallel. Lock contracts in a shared `lib/style/types.ts` early.
- Chunk F (overlay field + push) blocks G (verb push mechanism).
- Chunk G (style verb) depends on A, C, F.
- Chunks H (topics catalogue) and I (tests) are essentially independent and can land at the end.

**Parallelizable bundles:**

- Bundle 1 (kick off after Chunk 0): A, B, C-types-only.
- Bundle 2 (after A): D.
- Bundle 3 (after A + B): E.
- Bundle 4 (after F): G.

A solo implementer can run A → B → C → D → E → F → G → H → I end-to-end; the bundles matter for splitting across two implementers.

**Critical-path single thread:** Chunk 0 → A → C → F → G is the longest chain.

---

## 6. Test strategy

All tests colocated under `__tests__/` siblings of their source (Vitest). Three test classes: server-side unit (composition + markdown), client-side unit (parser + stylesheet + templates), and integration (verify steps for behaviors that need a running cockpit).

### Acceptance criterion → test map

| # | Test | Location |
|---|---|---|
| 1 | Chat-topic frame renders gutter chip + hanging indent; flatten correct | `client/components/__tests__/chatTemplate.test.ts` + flatten in `server/__tests__/mml.flatten.test.ts` |
| 2 | `world.speech.say` renders italic speech inline; flatten correct | `client/lib/templates/__tests__/templates.test.ts` (say case) |
| 3 | `world.speech.tell` template renders quieter than say | `client/lib/templates/__tests__/templates.test.ts` (tell vs say snapshot) |
| 4 | `world.emote.*` template renders italic action-shaped | `client/lib/templates/__tests__/templates.test.ts` (emote case) |
| 5 | `system.command.info` uses default template + topic-cascade styling | `client/lib/style/__tests__/Stylesheet.test.ts` (topic-cascade `system.*` resolves to muted+prefix treatment) + `client/lib/templates/__tests__/templates.test.ts` (default template wires the topic styling) |
| 6 | Other topic families render via default | `client/lib/templates/__tests__/TemplateRegistry.test.ts` (longest-prefix falls back to `defaultTemplate`) |
| 7 | Nested MML parses correctly | `client/lib/mml/__tests__/parseMml.test.ts` (nested `<item>` containing `<quantity>` snapshot equals tree) |
| 8 | Preserved set renders identically; `<sys>` removed everywhere | `server/api/__tests__/mml.sysRetired.test.ts` (greps server source for `Mml.sys` / `<sys>` and asserts zero matches outside `__tests__`); `client/components/__tests__/MmlRenderer.preservedSet.test.ts` (each of `<exit>` / `<detail>` / `<item>` / `<name>` / `<location>` / `<object>` renders with the same click target as the baseline) |
| 9 | MML entity decoding survives | `client/lib/mml/__tests__/parseMml.test.ts` (every entity round-trips) |
| 10 | Markdown round-trip | `server/api/__tests__/mml.markdown.test.ts` (compose → MML → flatten matches input markdown) |
| 11 | ` ```block``` ` → `<pre>` round-trip | same test file |
| 12 | command-scheme link dispatches | `client/components/__tests__/MmlRenderer.links.test.ts` (mocked `onCommandClick` + `onCommandPreview`) |
| 13 | stuff-scheme link clicks registry-aware | same file; vary `stuffRegistry` |
| 14 | query-scheme link is inert | `client/components/__tests__/MmlRenderer.links.test.ts` — renders `<link href="mudq:...">` and asserts: (a) the rendered output uses `InertLinkSpan`, not `ClickableSpan`; (b) `onCommandClick` / `onCommandPreview` are never called; (c) the `RenderCtx` type has no `onQueryClick` prop (type-level guard against re-introduction); (d) the rendered span has no `onClick` / `onMouseEnter` / `cursor: pointer` / underline styling |
| 15 | `[evil](https://attacker.com)` strips URI | `server/api/__tests__/mml.markdown.test.ts` |
| 16 | `[bogus](javascript:alert(1))` strips URI | same |
| 17 | `@Bobalu` in chat scope produces `<mention>` | `server/api/__tests__/mml.markdown.test.ts` with a stub `ChannelMentionResolver` |
| 18 | `@Unknown` stays plain | same file |
| 19 | `style mention self off` suppresses own-name | `server/obj/command/__tests__/StyleController.test.ts` (overlay write) + `client/lib/style/__tests__/Stylesheet.test.ts` (treatment goes empty when key set) |
| 20 | `style channel gossip color blue` persists | `server/obj/command/__tests__/StyleController.test.ts` (overlay value present after exec, `setClientState` called, `pushClientStateUpdate` called); `client/lib/style/__tests__/Stylesheet.test.ts` (overlay-driven channel chip styling); `verify` step for reconnect persistence (load `Avatar`, restart, re-read overlay) |
| 21 | `style theme high-contrast` swaps; no settings keys read | `server/obj/command/__tests__/StyleController.test.ts` + `client/lib/style/__tests__/themes.test.ts` |
| 22 | Friend/foe resolver is exercised but inert | `client/lib/style/__tests__/Stylesheet.test.ts` (spy on `NEUTRAL_BUCKET_RESOLVER.resolveBucket`; assert non-zero calls; assert no non-neutral overlay key produced) + production grep test that the stub is the only wired resolver |
| 23 | `style plain on` collapses all styling | `client/lib/style/__tests__/Stylesheet.test.ts` (plain-mode returns empty treatment for every selector); `client/lib/templates/__tests__/templates.test.ts` (each template renders without italic/bold/color when plain) |
| 24 | `style plain channel gossip on` scoped | same test file (channel-scoped plain check) |
| 25 | `style show` prints overlay; `style reset` clears | `server/obj/command/__tests__/StyleController.test.ts` |
| 26 | No `console.*` keys introduced for visual customization | `server/__tests__/noConsoleStyleKeys.test.ts` (grep `EnvironmentMixin` schemas and any `clientStateSchema` arrays for new `console.theme` / `console.channel.*` / `console.plain*` / `console.mention*` keys; asserts only `console.tabs` / `console.activeTab` remain in clientStateSchema, and no settings entry under those prefixes) |
| 27 | High-contrast theme is legible without color | `client/lib/style/__tests__/themes.test.ts` (for every treatment in the theme that sets `fg`, assert it also sets at least one of `weight`, `italic`, `prefix`, `chip`); manual `verify` step |
| 28 | Flatten of every test frame parses as a single readable line | `server/api/__tests__/mml.flatten.test.ts` (assert no `\n\n` runs, no `|` grid characters, no ASCII art codepoints) |

### `verify` steps (manual, before MR ready)

- Run the cockpit; type `say hello, @<self>` → confirm own-name highlight + speech italic.
- `style theme high-contrast` → confirm wholesale palette change without reconnect (#21).
- `style channel gossip color blue` (with a synthetic gossip frame fed via the test harness or a dev-mode command stub) → confirm chip styled blue; disconnect/reconnect → confirm overlay survives (#20).
- `style plain on` → confirm collapse to failsafe across all on-screen frames (#23).
- Render a query-scheme link in a synthetic message → confirm it appears as styled but non-clickable text (no cursor change, no hover behavior, no command emission) (#14).
- Visual audit of high-contrast theme (#27).

---

## 7. Risks / unknowns

1. **No chat / channel substrate exists yet.** No `world.chat.*` topic, no channel-tuning, no `Mml.chan` emit site, no `ChannelApi`. Acceptance #1 (chat frame) and #17 (channel-scope mention) need a real channel frame. Mitigation: build a tiny dev-only emitter behind a hidden command (e.g. `eval`-script-able) or a test fixture that composes a chat frame directly through `MessageApi.scene`. The `chatTemplate` and `ChannelMentionResolver` ship complete; the Wave 2 chat-slate will wire them to a real channel. **Flag for implementer:** explicitly include a `world.chat.gossip` topic-catalogue entry and a test fixture under `client/lib/templates/__tests__/fixtures.ts` that emits a sample chat frame.

2. **Validator interaction with `style.overlay` writes from the client.** Today the `client-state-write` inbound calls `setClientState` which runs the validator. If a player wires up a future GUI that writes the overlay directly via `client-state-write`, the validator must reject malformed blobs. The `isBoundedStyleOverlay` validator must be careful not to reject mid-edit partial states — it accepts any subset of known keys plus any-shape values (and lets the consumer's `Stylesheet` resolver silently no-op unknown values). **Flag for implementer:** validator is permissive (rejects only at the top-level shape — must be an object); the resolver does the per-value defensive parsing.

3. **`MentionResolver` for chat depends on a real channel participant set.** Until chat ships, the resolver gets a stub iterable. Tests are fine; production is gated on chat. Not a Wave 1 blocker if the chat call site is deferred — but #17 is an acceptance criterion. **Resolved** by the test-fixture approach above; the criterion is satisfied by the resolver behaving correctly given any iterable.

4. **`style channel <k> plain on` syntax conflict.** The YAML uses positional `a` / `b` / `c` for the `plain` subcommand to handle both `style plain on` and `style plain channel <k> on`. If the YAML positional-shape doesn't disambiguate well, split into two subcommands (`plain` flat-arg and a `plainChannel` subcommand) — both shapes are CLAUDE-compatible. **Flag for implementer:** pick whichever reads better in the help output; tests assert on overlay-blob shape, not on YAML.

5. **`<link>` security and the existing `commandFor` contract.** Resolved by deferral — `mudq:` is inert in v1 (no click handler, no async dispatch, no hover preview). The `onCommandPreview` contract stays as-is (string-or-null) since only command-bus links use it. When query-link click behavior is designed in a follow-up, the preview contract may need a discriminator — flagged for that future build, not this one.

6. **Mention regex word-boundary.** `@<word>` matching needs ASCII-alnum + apostrophe + hyphen; the requirement of "matches what the user could plausibly target" is loose. **Recommend** `[A-Za-z][A-Za-z0-9'-]*` as the word; everything else terminates the match. Document this in the markdown helper's header.

7. **`Mml.flatten` vs `Mml.stripTags`.** Two related but distinct functions risk confusion. **Recommend** documenting in `Mml.flatten`'s header comment that `flatten` preserves markdown emphasis while `stripTags` collapses to bare-plain — the v1 plain-mode collapse uses `stripTags`; flatten is for log capture and the future `verify`-friendly markdown round-trip.

8. **Theme swap mid-session re-render.** `useStylesheet` reads the overlay from the store; when `setLocalClientState('style.overlay', …)` fires, store subscribers re-render. **Verify** that every cockpit component that consults the stylesheet is subscribed to the right slice (Zustand selectors). If perf becomes a concern, the stylesheet can memoize through `useStylesheet` returning a stable reference.
