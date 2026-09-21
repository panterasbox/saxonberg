# Slate compaction ledger — batch `command-spec`

Assigned slate: `docs/slates/tails/affordance-suggestion-slate.md`

Doc-insert allowlist: `docs/subsystems/command-spec.md`. Anything
belonging in another doc goes to this file's *Handoff* section, never
into that doc directly.

No prior ledger for this batch key exists in this directory as of
2026-09-20.

---

## docs/slates/tails/affordance-suggestion-slate.md — 284 → 208 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- Duplicate second status block (`> **Status: design surface, not a
  build.** ...`) — stale narrative stamp; superseded by the canonical
  block at the top (pilot rule: one status block).
- `### ✅ Half of this is now BUILT — requires: on the slot` (34 lines,
  inside § 3) — code: `packages/server/scripts/check-arg-kinds.ts`
  (reads `requires:`, no hardcoded name list), `Mixins` registry +
  `MixinRefusals` in `packages/server/src/mud/lib/mixin.ts`; doc:
  `command-spec.md` § "⭐ `requires:` — every object field states what
  it accepts" (lines 687–738) states the shape, the synthesised check,
  `MixinRefusals`, and the pack-mixin federation verbatim-equivalent.
- `### The three axes, and why the third one matters` (14 lines,
  inside § 3) — doc: `command-spec.md` § "The three axes — `requires:`
  is only the first" (lines 792–811) carries the same table plus the
  `state`-axis exclusion rationale (the ignition-gate example) in more
  detail than the slate.
- `## 4. ⚠ Scope: the menu sees less than you think` (29 lines) — code:
  `packages/server/scripts/check-arg-kinds.ts` (menu vs all-fields
  tiers, `menuVisible` flag); doc: `command-routing.md` § "The gate
  reports two tiers" (lines 1740–1759) — reduced to a one-line pointer
  stub kept as `## 4.` so numbering and the slate's own internal
  cross-references didn't have to be renumbered past it. **Doc is
  outside my insert allowlist but already carries this** — no
  graduation needed, cut only.
- `## 6. ✅ The one cheap piece — BUILT` (11 lines) — pure duplicate of
  § 3's shipped-content summary; same code/doc citations as above. Cut
  entirely (no remaining content not already covered by § 3's pointer).
- Open question Q1 (`~~Does the two-tier gate (§ 4) become two
  scripts...~~ **Answered:**...`) — already struck through and answered
  in the slate's own text; reduced to a one-line pointer per the pilot
  rule (answered questions cut with a pointer, only still-open
  questions are spine).
- Candidacy-stage "already good" claim's supporting citation added
  as a pointer (not a cut, but worth noting): `command-routing.md`
  § "Why discovery is a per-giver recency stack" documents the recency
  stack in full; the slate's one-sentence claim about it was already
  compressed enough to keep as framing, so I only added the pointer
  rather than cutting the sentence.

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
(none — every SHIPPED claim in this slate was already fully documented,
in `command-spec.md` directly or in `command-routing.md`; nothing
needed a fresh insert)

### Superseded — cut
(none)

### Kept (UNBUILT)
- `## 1. The question` — the four-shape entry-point problem (palette,
  partial context, CMS context-menu with no world target) is unbuilt;
  `resolveAffordances(target, viewer)` is still the only shape. Grepped
  `packages/server/src/mud/api/command.ts` and
  `packages/client/src/**` for a context-object / palette resolver —
  none found.
- `## 2. Four stages, currently collapsed into one function` — table +
  both bullets. Binding/Admissibility/Relevance rows verified still
  true: no `$focus`/MQL-scope/cwd/history wiring into
  `resolveAffordancesImpl`; `canReach` and siblings are still plain
  `FieldValidator`s (checked
  `packages/server/src/mud/lib/command/validators/canReach.ts`); no
  ranking/relevance code anywhere under
  `packages/server/src/mud/lib/command/`.
- `## 3` intro + `### ❌ What requires: did NOT close` (all three
  bullets) — verified each still open: grepped for `narrow(` under
  `mud/lib/command/` and `mud/api/command.ts` — no generative filter
  consumer exists; `canReach.ts` still returns `string | undefined`
  (rejective); grepped for `structuredReason`/`reasonCode` on the
  affordance path — none (the only `candidates-filtered` structured
  note that exists is `onFiltered`'s dispatch-time note in
  `CommandLogic.ts`, a different mechanism from the menu's disabled-row
  sentence).
- `## 5. Command history — server-side` — entire section. Grepped
  `packages/server/src`, `packages/client/src`,
  `packages/server/src/schema` for `CommandHistory` /
  `command_history` / `commandHistory` — no hits. Still a client-local
  array in `CommandBar` today.
- `## 6. Cross-cutting constraints` (renumbered from § 7) — kept whole.
  Three of its four bullets restate now-shipped, now-documented facts
  (the resolver's honest-fog rule, `resolveAffordances` as
  snapshot-never-gate, validator side-effect-freedom, cockpit mode vs
  attention) — each is independently documented already
  (`command-routing.md` § "What it is not" and § "Why discovery...",
  `social-graph.md` § "Attention is idleness"). I kept the section
  anyway because its function here is forward-looking design
  *constraint* on the still-unbuilt suggester (the "suggestion is more
  dangerous than the menu" framing has no shipped counterpart), not a
  restatement of shipped fact for its own sake — cutting it would strip
  the one place that names the risk a future suggester must respect.
  Flagged in *Uncertain* below in case the coordinator judges
  differently.
- `## 7. Open questions` (renumbered from § 8) — Q2–Q5 (now numbered
  1–4) kept verbatim; all confirmed still open by the same greps above.

### Uncertain — kept
- `## 6. Cross-cutting constraints` — see note above. Three of its four
  bullets are, strictly, restatements of already-documented shipped
  behavior; I kept the whole section as forward design guidance for the
  unbuilt suggester rather than splitting it, since three of four
  bullets share one paragraph's worth of interdependent reasoning and
  splitting below paragraph granularity is against the rule. If the
  coordinator judges this pure restatement, the three bullets could be
  cut to a pointer at `command-routing.md` § "What it is not" +
  `social-graph.md` § "Attention is idleness", leaving only the
  "suggestion is more dangerous than the menu" sentence as spine.

### Handoff (belongs in a doc outside my list)
(none — the one candidate insert, the menu/dispatch-hygiene two-tier
gate, was already fully present in `command-routing.md`; nothing new to
hand off)

### Status block
- Left: *the generative `narrow()` direction (no consumer yet) · the
  relational axis still only says no · a structured reason on a
  disabled row · server-side command history · reporting menu-honesty
  and dispatch-hygiene as two tiers* → *the generative `narrow()`
  direction (no consumer yet) · the relational axis still only says no
  · a structured reason on a disabled row · server-side command history
  (retention/privacy/persistence all undecided) · what a "context" is
  concretely for a target-less caller (CMS, palette) · where relevance
  ranking lives (server vs server-scores/client-orders)* — the
  menu-honesty/dispatch-hygiene item is removed (shipped, documented);
  the two open-question items (context shape, relevance-ranking
  location) are added since the body already carried them but `Left`
  didn't represent them.
- Size: a wave → a wave (unchanged — still rides its own requirements +
  plan per the slate's own framing, not opportunistic)
