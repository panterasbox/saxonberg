# Slate compaction ledger — batch: message-rendering

Agent scope: `docs/slates/tails/message-rendering-slate.md`,
`docs/slates/tails/author-typography-slate.md`. Insert-only target:
`docs/subsystems/message-rendering.md`.

## Findings (apply to both slates)

- The 2026-08-08 audit inline in the old message-rendering-slate.md
  undercounted the remaining layout vocabulary: it checked `<list>`,
  `<table>`, and "channel stylesheets" and called `<box>` the only gap.
  Grepping `packages/server/src/mud/api/mml/tags.ts`'s `KNOWN_TAGS` shows
  `<block>`, `<rule>`, `<indent>`, `<columns>`/`<col>`, and an `align`
  attribute were never built either — none appear in `tags.ts`,
  `flatten.ts`, or `MmlRenderer.tsx`. No authoring-freedom gate (system
  free / player-in-chat gated) exists anywhere for any layout tag.
- The audit's "✅ Channel stylesheets" line conflates two different
  things. What shipped is the **reader-side** per-channel color override
  (`cockpit style channel <key> color`, `channel.<k>.color` in the
  overlay) — already documented in message-rendering.md's "Selector
  vocabulary" / "`cockpit style`" sections. What the slate actually
  designed for Wave 3 — a **channel-admin-authored** stylesheet (custom
  semantic tags, a constrained palette, presentational layout, as
  channel config, with a client-distribution mechanism) — has no code
  anywhere (`HasInteractive.ts`'s only channel-shaped state is mutes/
  tuned channels, not a stylesheet config block). This is still fully
  open design.
- `<color>` shipped as a **core, ungated** presentational tag (see
  message-rendering.md § "MML vocabulary extensions" — "Color is the one
  presentational tag"), which supersedes the slate's original stance
  ("no presentational tags in core (resist `<red>`)" / "loud styling —
  channel-scoped opt-in"). In practice `<color>` isn't even reachable
  from player markdown input at all (`markdown.ts` never emits it; only
  content code like `Dyed.ts` and the TPA terminal do) — stricter than
  "channel-scoped," and consistent with the mixed reader-overlay reality
  documented already.
- GFM pipe-table input sugar, which the slate deferred to "layout-
  allowed contexts... never chat," **has shipped** — but in the wiki's
  separate "article dialect" parser (`markdown.ts`'s article-mode pipe-
  table handling), documented in `docs/subsystems/wiki.md` (outside this
  agent's insert list). Chat still has no table input sugar, matching
  the slate's original design.
- The "styling engine" section's claim that overlay preferences "persist
  as settings (`EnvironmentMixin`, cross-device)" is **superseded** by
  the shipped decision: the overlay lives on `HasInteractiveMixin`
  `_clientState` under `'style.overlay'`, explicitly **not** an
  `EnvironmentMixin` setting (message-rendering.md § "Storage on
  `HasInteractiveMixin`" states the three-category split and says the
  overlay is "not a setting"). Section kept anyway (see Uncertain below)
  because it also names a real gap: "user highlight words" (arbitrary
  keyword highlighting, distinct from the shipped own-name
  `mention.self` toggle) has no code anywhere in `Stylesheet.ts` or the
  overlay selector vocabulary.
- Author-typography-slate.md: grepped for every named face
  (Caveat/Cinzel/UnifrakturMaguntia/etc.), any "display token" concept,
  and any token→face map. Nothing exists beyond the unrelated `FontRole`
  `'display'` register (the civic engraved-capitals UI voice — a
  sibling concept the slate itself correctly distinguishes, not an
  overlap). The slate's body is confirmed 100% UNBUILT as claimed.

---

## docs/slates/tails/author-typography-slate.md — 125 → 126 lines · Status PARTIAL → PARTIAL

Verified against the code: no display-token vocabulary, no token→face
map, no authoring attribute, and none of the six starter-palette faces
(Courier Prime / Special Elite, Caveat, Tangerine, Cinzel,
UnifrakturMaguntia, Alfa Slab One / Oswald) appear anywhere in
`packages/client/src/**` or `packages/server/src/**`. The only
"display"-named thing in the codebase is `FontRole = 'display'` (the
civic engraved-capitals UI voice, `packages/client/src/lib/style/
types.ts`) — a sibling concept the slate itself already correctly
distinguishes from author-chosen content faces, not an overlap. The
entire body is confirmed still UNBUILT as claimed; nothing to cut or
graduate.

### Cut (SHIPPED · DOCUMENTED)
- (none)

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- (none)

### Superseded — cut
- (none)

### Kept (UNBUILT)
- Everything: `## Principle`, `## The curation rule (house aesthetic)`,
  `## Open questions`, `## What this slate does NOT cover` — all still
  open design, verified against the code above.

### Uncertain — kept
- (none)

### Handoff (belongs in a doc outside my list)
- (none)

### Status block
- Left: added "which rich surface adopts it first" (Open question 3),
  which was in the body but unrepresented in the old `Left` list — the
  body wins per the compaction rule.
- Size: `a tail` → `a tail` (unchanged)

---

## docs/slates/tails/message-rendering-slate.md — 429 → 169 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- Two duplicate/narrative status blocks (old lines 3–43, the "Wave 1
  shipped (2026-06)" + inline audit block) — collapsed to one canonical
  status block per the "one status block" rule. Content preserved: the
  audit's checklist is superseded by the Findings above (it undercounted
  what's left); doc: `message-rendering.md` intro + History.
- `## The load-bearing decisions` (numbered list, 6 items) — every
  decision is the founding rule `message-rendering.md` opens by quoting
  verbatim (decision 1–2), plus flatten-per-tag (decision 4, doc §
  "MML vocabulary extensions"), markdown-as-spoke (decision 5, doc §
  `Mml.markdownToMml`), reader sovereignty (decision 6, doc § plain
  mode / contrast tests).
- `## Principle` — pure restatement of the load-bearing decisions above;
  same doc coverage.
- `## The rendering model — tagged-complete-string → flatten / reflow` —
  code: `packages/client/src/lib/templates/`, `Mml.flatten`; doc:
  `message-rendering.md` § "Per-message-type templates" +
  "`Mml.flatten` vs `Mml.stripTags`".
- `## The flatten discipline` — code: `api/mml/flatten.ts`; doc:
  `message-rendering.md` § "`Mml.flatten` vs `Mml.stripTags`" (per-tag
  flatten table, linear-labeled serialization).
- `## Markdown ↔ MML` — code: `api/mml/markdown.ts`, `api/mml/schemes.ts`;
  doc: `message-rendering.md` § "`Mml.markdownToMml`" + "Custom URI
  schemes" (mapping table, flatten-to-markdown, tables-excluded-from-
  chat all match exactly).
- `## Accessibility (first-class, near-free given the separation)` —
  code: `themes/highContrast.ts`, `contrast.test.ts`; doc:
  `message-rendering.md` § "Themes" + the four-guards table under "The
  custom-property colour layer".
- Bulleted recap under `## Once shaped into formal requirements` (the
  8-bullet summary + the "Tests" bullet) — restates content already cut
  above; the acceptance criteria are covered by `message-rendering.md`
  § "Acceptance shape (Wave 1)". Kept only the final still-accurate
  sentence about what's left.
- Layout-library bullets `**Tabular/list (preferred...)**` and
  `**Verbatim:** \`<pre>\`` — code: `Mml.table`, `Mml.pre`/`api/mml/
  tags.ts`; doc: `message-rendering.md`'s MML vocabulary tables.
- `## Build order` (Waves 1–3 build plan) — fully redundant with the
  re-stamped status block + the retained sections (layout library,
  channel stylesheets); nothing here wasn't already captured.
- Open questions 1 (dialect), 3 (flatten default), 4 (markdown subset
  size), 5 (links), 8 (reader-override granularity), 10 (parse locus) —
  each resolved and shipped exactly as leaned; one-line pointers left in
  place of the full list (see the new "Resolved and shipped" paragraph).

### Superseded — cut
- `## Three tag categories` + `### The presentational split` — the
  "no presentational tags in core / loud styling is channel-scoped
  opt-in" framing is superseded by the shipped decision to ship
  `<color>` as one core, ungated presentational tag (with its own
  documented rationale). The layout-authoring-gate point this section
  also made survives in the kept "The layout library" section, so
  nothing substantive was lost. superseded by
  `message-rendering.md` § "MML vocabulary extensions — Color is the
  one presentational tag".
- Open question 6 (GFM table input-sugar) — superseded by: shipped, but
  in the wiki's article dialect (`docs/subsystems/wiki.md`), not a chat/
  channel context as originally envisioned. One-line pointer kept.

### Kept (UNBUILT)
- `## The layout library (bounded)` (trimmed of the two shipped
  bullets) — `<block>`, `<rule>`, `<indent>`, `<box>`, `<columns>`/
  `<col>`, the `align` attribute, and the authoring-freedom gate are all
  still absent from the code.
- `## Channel stylesheets (the scoped opt-in)` — the channel-admin-
  authored stylesheet (custom tags + constrained palette + layout) and
  its distribution mechanism; the reader-side per-channel color that
  did ship is a much thinner substitute, not this.
- Open questions 2 (`<pre>`/`<columns>`, `<pre>` shipped but `<columns>`
  still open — kept whole per "don't split below paragraph"), 7
  (generic-class MML hook), 9 (channel stylesheet distribution).
- `## What this slate does NOT cover`.
- Final paragraph of `## Once shaped into formal requirements`.

### Uncertain — kept
- `## The styling engine` — kept whole. Mostly SHIPPED · DOCUMENTED
  (selectors, treatments, cascade — see `Stylesheet.ts` +
  `message-rendering.md` § "Stylesheet engine"), but (a) its claim that
  overlay preferences "persist as settings (`EnvironmentMixin`,
  cross-device)" is contradicted by the shipped decision documented in
  `message-rendering.md` § "Storage on `HasInteractiveMixin`" (the
  overlay is explicitly *not* an `EnvironmentMixin` setting), and (b)
  "user highlight words" in the content-match selector row has no code
  anywhere — looked in `Stylesheet.ts`, the overlay selector vocabulary
  table, and `HasInteractive.ts`; found only the shipped `mention.self`
  own-name toggle. Kept whole rather than split because the shipped/
  unbuilt boundary runs through one table row, below paragraph
  granularity.

### Handoff (belongs in a doc outside my list)
- (none — the one candidate, GFM table input-sugar shipping in the
  wiki's article dialect, is already documented in `docs/subsystems/
  wiki.md` per my own check; nothing to graduate there.)

### Status block
- Left: `the <box> tag` → `<box>/<rule>/<indent>/<columns>/align + the
  authoring-freedom gate · the channel-admin-authored stylesheet
  (custom tags + palette + layout) + its distribution · the
  generic-class MML hook`
- Size: `a tail` → `a tail` (unchanged — still small/speculative, per
  the retained 2026-08-08 caution that it may not be wanted at all)

---
