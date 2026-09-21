# Slate-compaction pass — reactions batch ledger

One slate. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: this file plus
`docs/subsystems/reactions.md` (insert only). Code verified in
`packages/server/src/mud/api/reaction.ts`,
`packages/server/src/mud/platform/idea/ReactionRegistry.ts`,
`packages/server/src/mud/platform/idea/cmd/social/ReactController.ts`,
`packages/server/src/mud/lib/config/AppSettings.ts`,
`packages/server/src/mud/platform/__tests__/ReactionRegistry.test.ts`,
`packages/client/src/components/ReactionBar.tsx`,
`packages/client/src/store/{index,reactionActions}.ts`.

## docs/slates/tails/reactions-slate.md — 327 → 117 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- Second (narrative) status block, lines 11–24, plus its "_Original
  framing follows_" transition and the quoted echo of the old intro
  paragraph (lines 25–28) — a historical status update superseding
  itself; both named decisions ((a) add-only+`--remove`, (b) glyph-gated
  aggregation) are stated in `reactions.md` (`onScopedEmote` doc comment,
  "The one behavioral divergence"). One status block rule (pilot
  calibration).
- `The load-bearing decisions:` numbered list (4 items) — #1 (reaction =
  emote-at-message) → `reactions.md § The model`; #2 (aggregate
  server-side, batched deltas) → `§ The aggregation contract`; #4 (client-
  rendered train) → `§ Client`. #3 ("Toggle-once … react again to
  remove") is SUPERSEDED, see below.
- `## Principle` (4 bullets) — restates the model/aggregation-
  contract/expand/client-render decisions verbatim-in-spirit; all four
  are in `reactions.md §§ The model, The aggregation contract, Client`.
- `## The scale architecture` (naive-vs-batched math, eager/lazy-by-
  threshold, the train, tag-grouping) — code: `ReactionRegistry.flush`,
  `buildActState`; doc: `reactions.md §§ The aggregation contract, The
  one behavioral divergence`. The 30,000-vs-3,000-message illustration
  has no doc equivalent but is prose, not a decision — the decision
  (wire cost = audience×cadence, not reaction count) is stated verbatim
  in `§ The aggregation contract`.
- `## Load-bearing details` bullet 1 ("Shared canonical message-id") —
  code: `commandId` minted in `CommandGiver`, stamped by `Scene.send`;
  doc: `reactions.md § The model` ("keyed by `meta.commandId`").
- `## Input & controls` (all three bullets) — the verb shape → doc
  `§ The react verb` (`react [--to <person>] [--msg <#>] [--remove]
  <emote-expression>`, code: `ReactController.ts` +
  `cmd/social/react.yaml`); the quick-react palette → doc `§ The emote
  picker (Wave 6)`; the five per-user controls → doc `§ Per-user
  controls` table (exact match: collapse threshold, always-aggregate,
  tag-group, intensity, mute-channels). The bullet's "toggle (react
  again to remove)" clause is SUPERSEDED, see below.
- `## What this stresses` — a subsystem cross-reference list with no
  decision of its own; every named consumer (emotes' `SoulApi`/tags,
  chat's message-id/ring, mql-subscription's scheduler, client
  collapse/expand/train/palette) is already covered by name in
  `reactions.md`'s own sections and by this slate's kept `See also` /
  `Load-bearing details` / `Future direction` sections.
- `## Open questions` #1 (threshold shape) — resolved to one primary
  threshold: `ReactionRegistry.config().threshold` (`AppSettingKeys.
  reactionsThreshold`) is the single gate driving counts-only/tag-
  group/sampled-train together, per `reactions.md § The one behavioral
  divergence`. Graduated the threshold's config key + default (10, no
  clamp) into `reactions.md`, see below.
- `## Open questions` #2 (reactable scope in v1) — resolved: shipped
  generic over `REACTABLE_TOPICS` (`speech.vocal`, `act.emote`,
  `speech.channel`, `act.combat`), not chat-only. Code:
  `packages/server/src/mud/api/reaction.ts:47-55`; doc: `reactions.md
  § Reactable act-kinds (closed v1 set)`.
- `## Open questions` #3 (cadence value) — resolved: default 200 ms,
  clamped [150, 250] via `AppSettingKeys.reactionsCadenceMs`. Doc:
  `reactions.md § The aggregation contract`.
- `## Open questions` #4 (expand-detail retention) — resolved by a flat
  TTL GC (default 5 min), not a ring-depth-tied two-stage retention (see
  Doc-adjacent finding below). Doc: `reactions.md § GC`.
- `## Build order` Wave 1 and Wave 2 bullets — both fully shipped; Wave
  1's pieces (canonical id, toggle-aggregate → now add-only, batched
  broadcaster, `react` verb, counts-only wire + threshold, ring-tied
  lifetime) and Wave 2's (eager-detail, expand, train, tag-group,
  palette, per-user controls) are each named in `reactions.md`'s
  corresponding sections above. Wave 3 is KEPT — see below.
- `## Once shaped into formal requirements` (whole section) — a pre-
  build requirements-shape summary of every decision above, now
  redundant with the shipped+documented sections; its "Tests" bullet is
  covered by `ReactionRegistry.test.ts` (`"scale bound: one delta per
  recipient per tick, independent of reaction count"`,
  `"react is add-only/idempotent; removeReaction is the explicit
  un-react"`, `"threshold flip"`, `"tag-grouping"`, `"GC"`). Its closing
  line (threads/analytics/reactability-beyond-chat deferred) restates
  the status block's `Left`.

### Superseded — cut
- `The load-bearing decisions` #3, "Toggle-once … react again to
  remove (Discord semantics)" — by the shipped **add-only + explicit
  `--remove`** semantics (`ReactionRegistry.onScopedEmote` is add-only/
  idempotent; `removeReaction` is the only decrement path). Documented
  at `reactions.md` (`removeReaction` doc comment: "The split exists
  because toggle-on-re-react surprised").
- `## Input & controls` bullet 1's "toggle (react again to remove)"
  clause — same supersession as above.
- `## Worked scenarios` (whole section, 4 bullets) — the quiet/hot-
  channel and tag-group scenarios illustrate shipped, documented
  behavior (cut as SHIPPED·DOCUMENTED, no separate note needed); the
  **"Toggle"** scenario ("react 12 ;agree twice → removed") states the
  superseded toggle-once mechanic and is factually false of the shipped
  code — cut, by the same add-only/`--remove` supersession.
- `## Load-bearing details` bullet 2 ("Live broadcast scoped to the
  recent/in-view window … recent messages keep the full reactor-set,
  aged ones keep counts-only or GC with the ring") — the shipped GC
  (`ReactionRegistry.gc`, `packages/server/src/mud/platform/idea/
  ReactionRegistry.ts:684-`) is a **flat TTL drop** (default 5 min), not
  a two-stage "aged → counts-only, then GC" retention; no intermediate
  demotion exists in code. Doc's `§ GC` already states the simpler,
  correct shipped shape, so no doc fix was needed — only the slate's
  bullet was wrong.

### Kept (UNBUILT)
- `## Load-bearing details` bullet 3, "Ephemeral runtime; warehouse the
  *stream*, not the state (fork #3)" — the analytics event-stream tap
  through `MudlogApi`/topics is still unbuilt (no consumer found under
  `packages/server/src/mud` beyond `ReactionFiredEvent` → renown).
- `## Build order` Wave 3 — "Generic reactability beyond chat
  (say/combat/system); the reaction event-stream emission for the
  future warehouse tap." Mixed/kept whole: `say` and `combat` already
  ship (`REACTABLE_TOPICS` includes `speech.vocal`, `act.combat`), but
  `system` notices are not in the set and the event-stream emission is
  unbuilt — the bullet as a whole is still open, restamped into `Left`
  more precisely.
- `## Future direction — salvage emote-floods into reactions` (whole
  section) — no emote-convergence detector exists anywhere under
  `packages/server/src/mud` or `packages/client/src` (grepped for
  `convergence`, `emote-flood`, `floodSalvage`); explicitly named in the
  top status block's `Left` too.
- `## What this slate does NOT cover` — scope-boundary spine, unchanged.
- Framing intro paragraph + `See also` list — spine, unchanged.

### Uncertain — kept
(none)

### Doctrine
(none)

### Handoff (belongs in a doc outside my list)
(none — everything graduated stayed inside `reactions.md`, this batch's
one insert-doc)

### Status block
- Left: *the analytics event-stream tap · the emote-flood salvage ·
  reactability beyond chat-first* → *the analytics event-stream tap
  (Wave 3) · the emote-flood salvage (Future direction, below) ·
  reactability for act-kinds beyond the shipped
  `speech.vocal`/`act.emote`/`speech.channel`/`act.combat` set (e.g.
  system notices)* — narrowed to match what the body actually still
  claims; `say`/`combat` reactability, previously implied incomplete,
  is shipped.
- Size: a tail → a tail (unchanged; three small open items).
- Status: PARTIAL → PARTIAL (unchanged).

## docs/subsystems/reactions.md — insertions

Two short paragraphs inserted (SHIPPED · UNDOCUMENTED graduations),
~4 lines total:

1. After "The one behavioral divergence" section's closing paragraph:
   the aggregation threshold's `AppSettings` key
   (`AppSettingKeys.reactionsThreshold`, `reactions.threshold`, default
   10, **no clamp** — unlike cadence). Source: `ReactionRegistry.ts`
   `DEFAULTS`/`config()`.
2. In "The aggregation contract" section, appended to the sentence
   introducing the per-recipient sample: the sample cap's `AppSettings`
   key (`AppSettingKeys.reactionsSampleCap`, `reactions.sampleCap`,
   default 5). Source: same.

No existing sentence in `reactions.md` was edited or removed.
