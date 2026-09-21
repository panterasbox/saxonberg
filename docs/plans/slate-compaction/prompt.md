# Slate-compaction pass — prompt batch ledger

One slate. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `prompt.md` only
(two inserts: a file-layout table extension + a "slot picker, not
sigils" section, ~20 lines). Original saved for diffing at
`/tmp/claude-1000/-home-bobalu-play-saxonberg-master/…/scratchpad/prompt-stack-slate.orig.md`.
Code verified in `packages/server/src/mud/api/prompt.ts`,
`packages/server/src/mud/platform/idea/api/PromptLogic.ts`,
`packages/types/src/index.ts`, and the full client prompt surface
(`packages/client/src/store/index.ts`,
`packages/client/src/components/{CommandBar,PromptStrip,PromptFormatBar}.tsx`
+ their `__tests__`).

**The headline finding**: this slate's own `Left` line was stale on
arrival. It claimed "multi-prompt stacking visuals + dismissal UX"
remained — `PromptStrip.tsx` (waiting-queue cards, `askedBy`
attribution, elapsed time, the `×`-vs-`prompt cancel` split, a phone
sticky-sheet variant) and `CommandBar.tsx` (slot-picker dropdown,
per-kind chip affordances, Esc-backs-out semantics, a `compose`
textarea) fully ship it. The slate was ~19% remaining work (150 of 775
lines) once checked against code rather than its own stamp — almost
the entire body (Architecture, Prompt kinds' `base`, worked example,
wire shape, server substrate, cancellation, client build, most of
non-goals) had shipped, much of it in a **different shape** than
designed (a boolean `foreground` replaced the three-way
`demanding`/`passive`/`toast` priority; a slot-picker dropdown replaced
the two-mode `>`/`?` sigil input design; MUD-style per-command refresh
replaced the MQL-subscription-based base prompt).

---

## docs/slates/tails/prompt-stack-slate.md — 775 → 150 · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- `## Principle` (17 lines) — the "stack, not a single slot" doctrine;
  what shipped is documented as `prompt.md § The prompt strip — one
  slot, three occupants`.
- `### Stack model` (42 lines, incl. TS sketch) — code:
  `packages/client/src/store/index.ts` `PromptEntry` union +
  `prompts`/`activeSlot`; doc: `prompt.md § File layout` (client rows,
  inserted this pass) + `§ The prompt strip`.
- `### Component shape` (22 lines) — code: `CommandBar.tsx` (chip
  affordances, slot picker, submit-label flip via `submitButtonLabel`)
  + `PromptStrip.tsx` (badges, stack-depth count); doc: `prompt.md §
  File layout` (inserted) + `§ The prompt strip`.
- `### Inline-in-terminal AND prompt component` (15 lines) — code:
  `shell.prompt` MessageFrame (`prompt.ts` push lifecycle); doc:
  `prompt.md § Body MessageFrame correlation`.
- `### Snapshot-on-send` (13 lines) — code: `EchoSnapshot` +
  `pushEchoSnapshot`/`shiftEchoSnapshot` (`store/index.ts`); doc:
  `prompt.md § Body MessageFrame correlation` ("the slate's
  snapshot-on-send pattern handles response-side terminal echo
  client-side").
- `### The kind canon (tiered)` Tier 1 table (9 lines) — code:
  `PromptApi.choice/confirm/text/mqlObject`
  (`packages/server/src/mud/api/prompt.ts`); doc: `prompt.md § Surface`.
- `mqlMany` row of the Tier 2 table (1 line, replaced with a one-line
  note) — code: `PromptApi.mqlMany` ships in the same surface block as
  Tier 1, not gated behind content demand; doc: `prompt.md § Surface`.
- `### The validator + retry pattern` (34 lines) — code: `prompt.ts`
  `PromptValidator<T>` + async validator handling in `PromptLogic`;
  doc: `prompt.md § Validator semantics` (near-verbatim match,
  including the async-vs-sync-command-validator rationale).
- `## Worked example: MQL object disambiguation` (23 lines) — code:
  `CommandApi.applyCardinalityPolicy` (`onExcess: prompt` →
  `promptMqlObject`); doc: `prompt.md § Cardinality vocabulary`.
- `### `PromptEnvelope` (exists)` (10 lines) — code:
  `packages/types/src/index.ts:908`; doc: `response-envelope.md` +
  `prompt.md` intro.
- `### Missing: prompt-content Note kinds` (22 lines) — code: all five
  named Note kinds (`ChoicePromptNote`, `ConfirmPromptNote`,
  `TextPromptNote`, `MqlObjectPromptNote`, `PromptDismissedNote`) ship
  in `types/src/index.ts:701-810`, plus `ComposePromptNote` and
  `MqlManyPromptNote` beyond what the slate asked for; doc: `prompt.md
  § File layout` + `§ Surface`.
- `### Two-channel inbound protocol` (42 lines) — code:
  `PromptResponseMessage`/`PromptCancelMessage`
  (`types/src/index.ts:1535,1547`) routed in
  `backend/inbound/prompt.ts`; doc: `prompt.md § Two-channel inbound`
  (same routing table).
- `### Validation-failed envelope` (15 lines) — code:
  `PromptValidationFailedNote`; doc: `prompt.md § Validator semantics`.
- `## Server substrate (Framework 11)` — State/Surface/Push/Response/
  Cancellation lifecycle/Ordering (98 lines) — code: `PromptApi` +
  `PromptLogic` in full; doc: `prompt.md § Surface` + `§ Lifecycle`
  (near line-for-line match, including `#resolvers`/`#byInteractive`
  shape, the 5-step push/response/cancel sequences, and disconnect
  ordering via `Application.handleUserDisconnect`).
  - The "Replace-vs-push" sub-paragraph on `priority: 'preempting'`
    specifically: doc's `§ What ships unused or deferred` lists
    "preempting" as a deferred behavior flag.
- `## Cancellation + kill` (21 lines) — code: `PromptCancelledError`,
  `cancelPrompts`/`prompt cancel` verb; doc: `prompt.md § Two cancels,
  and they are different acts` + `§ Error class`.
- `## Client build (this slate's first wave)` (41 lines, 8 numbered
  items) — every item confirmed shipped: (1) store slice — `prompts`/
  `activeSlot`/`pushPrompt`/`dismissPrompt`/`setActiveSlot`; (2) `Prompt`
  UI — realized as `CommandBar` (active) + `PromptStrip` (waiting); (3)
  mode-switching — slot picker + Esc semantics (see Superseded, below);
  (4) CommandBar wiring — `onSendPromptResponse`/`onCancelPrompt` props;
  (5) echo snapshot — `EchoSnapshot` FIFO; (6) inline-in-terminal —
  `shell.prompt` MessageFrame; (7) validation error rendering —
  `validationError` field on `PromptEntry`, rendered in both
  `CommandBar` and `PromptStrip`; (8) debug hooks —
  `window.__pushPrompt`/`__popPrompt`/`__validateFail`
  (`packages/client/src/App.tsx:713-756`, comment cites "Client build
  wave 1" verbatim). Doc: `prompt.md § File layout` (client rows
  inserted this pass).
- `## Dependencies` (16 lines) — all four listed prerequisites
  (`PromptEnvelope`, MessageApi/Scene, MQL cardinality, cockpit prompt
  component) are satisfied by the now-shipped surface above; the doc
  no longer needs to track them as dependencies.
- `## Suggested build order` (43 lines, 8 waves) — waves 1-6 shipped
  per the cuts above; wave 7 (Tier 2 kinds) and wave 8 (token-format
  base prompt) survive as the slate's `Left` / Non-goals respectively.
- 4 of 6 `## Non-goals` bullets (Token-format base prompt, Preempting
  priority, Prompt timeout/expiry, Modal prompts, Multi-Interactive
  prompt sync — 5 bullets, ~25 lines) — code: none of these built;
  doc: `prompt.md § What ships unused or deferred` lists exactly this
  set ("cancelable: false, prompt timeouts, modality, multi-Interactive
  sync, preempting... Token-format prompt richness beyond `{{ focus
  }}`"). The deferral decision, not the feature, is what's documented —
  correctly, since none of these shipped.

### Superseded — cut, one-line note kept
- `### `base` (always present)` (36 lines) — designed as an MQL
  subscription on `me.focus`; shipped as **MUD-style per-command
  refresh** instead (`renderPromptRefresh` appends a `PromptRefreshNote`
  to every `DispatchResponseEnvelope`; no live subscription). Fully
  documented at `prompt.md § Base-prompt rendering` + `§ Why MUD-style
  and not subscription`, which states the rationale (cost: "many
  redundant deltas per second" for a 5+-token format) — the same
  rationale this slate's own "Future" paragraph anticipated needing
  eventually. Note left in the slate's status stamp; no pointer needed
  in-body since nothing else in the trimmed body references it.
- `### Input routing — two-mode model` incl. Mode gestures / Default
  behavior when a new prompt arrives / Random-order answering (64
  lines) — designed as an explicit `>`/`?` sigil two-mode toggle with a
  three-way `demanding`/`passive`/`toast` push priority; shipped as a
  **slot-picker dropdown** (`CommandBar`'s `SlotPicker` +
  `SlotDropdown`) with a boolean `PromptOpts.foreground`. Same
  guarantees carried over exactly (Esc backs out without killing —
  `CommandBar.tsx:666-671` comment literally cites "per slate, Esc is
  back-out, not kill"; random-order addressing by `promptId`). Graduated
  into `prompt.md § Slot picker, not sigils` (inserted this pass, 13
  lines) rather than silently dropped, since the *why* (fewer modes to
  remember vs. a pick-list) wasn't stated anywhere in code comments as
  cleanly as the doctrine deserved.
- Open question 1, "active-prompt visual selection when stack > 1" —
  the slate posed a binary (reorder-to-top vs. stay-in-place-highlighted)
  that the shipped design sidesteps: an activated prompt leaves the
  waiting queue for the separate input slot, so neither option applies.
  One-line pointer kept in the slate body to `prompt.md § The prompt
  strip`.

### Kept (UNBUILT)
- `### The kind canon (tiered)` — Tier 2 rows `numeric` / `multiChoice`
  / `password` (grep: no matches anywhere in `prompt.ts` or
  `types/src/index.ts`) and all of Tier 3 (`paginated`, `quiz`).
- Open questions 2 (choice rendering at scale — `paginated` unbuilt), 3
  (confirm/choice unification — still two kinds), 4 (author/admin
  overrides — no `mode prompt <kind>` or eval-shaped push found in
  `packages/content` or `packages/server`), 5 (quiz kind design).
- Non-goals: "async-command flag" (no `--async` command flag found;
  the `foreground: false` hook it's built on exists but the flag itself
  doesn't).

### Doctrine (kept, labelled)
- `### Compose vs. custom` — the "canonize sparingly" argument for why
  authors compose Tier 1-3 kinds rather than inventing new ones. Not a
  backlog item; a standing authoring principle. Not counted in `Left`.
- Non-goals bullet "Custom prompt kinds outside the canon" — same
  doctrine, restated as a boundary. Kept alongside Compose vs. custom
  rather than folded in, since the slate already separates "why compose"
  from "what's off the table."

### Uncertain
- The Tier 1 `mqlObject` table row (cut as SHIPPED·DOCUMENTED) carried
  a forward-looking clause — "richer disambiguation cues (short
  description, salient feature) when DescribeApi v2 ships." No
  `DescribeApi` exists anywhere in `packages/server/src/mud/api/`. This
  is a genuine, still-open micro-enhancement that rode inside an
  otherwise-shipped table row; I judged it too small to preserve as its
  own kept fragment (it names a piece of substrate — "DescribeApi v2" —
  that isn't even slated elsewhere) but flag it here since git history
  is now the only place it lives. Coordinator call: worth a one-line
  future note in `prompt.md`, or genuinely below the bar.

### Handoff (belongs in a doc outside my list)
- None. Every graduation this pass made belongs in `prompt.md` (the
  client CommandBar/PromptStrip/PromptFormatBar architecture is prompt-
  substrate-specific, not general client-shell chrome — `client-
  shell.md` covers the cockpit shell/widgets/reconnect machine, not
  this substrate's own input-mode design). Nothing here reads as
  command-routing.md, response-envelope.md, or card-surface.md's to
  own instead; each of those docs is already the right home for the
  narrow slice they'd want (cardinality → command-spec.md/command-
  routing.md, envelope family → response-envelope.md) and none of the
  cut content added new decisions in those areas beyond what `prompt.md`
  already cross-references.

### Status block
- Status: PARTIAL → PARTIAL (Tier 2/3 kinds + open UX questions are
  real remaining work; not ABSORBED).
- Left: `Tier 2 kinds numeric/multiChoice/password · Tier 3 paginated+quiz
  · multi-prompt stacking visuals + dismissal UX` (the last clause was
  false — already shipped) → `Tier 2 kinds numeric/multiChoice/password
  · Tier 3 paginated+quiz · the open questions (choice-list scaling,
  confirm/choice unification, author test-prompt overrides, quiz design)`.
- Size: a tail → a tail (unchanged; correct — remaining work is small,
  content-gated additions, not a build cycle).

### Graduated into `docs/subsystems/prompt.md` (this pass)
1. `§ File layout` — 4 new rows for the client files
   (`store/index.ts`, `CommandBar.tsx`, `PromptStrip.tsx`,
   `PromptFormatBar.tsx`), which the doc previously omitted entirely
   despite already having a `§ The prompt strip` design section that
   presumes their existence.
2. `§ Slot picker, not sigils` (new subsection under `§ The prompt
   strip`) — records that the slate's two-mode `>`/`?` sigil design and
   three-way `demanding`/`passive`/`toast` priority both shipped in a
   different, simpler shape (slot-picker dropdown; boolean
   `foreground`), and that `toast` specifically never shipped.
