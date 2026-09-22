# Slate-compaction ledger — batch: display

Insert-doc (may write): `docs/subsystems/display.md`
Slate: `docs/slates/tails/display-manifestation-slate.md`

## `docs/slates/tails/display-manifestation-slate.md` — 183 → 84 lines · Status PARTIAL → PARTIAL

Verified against code and against `docs/subsystems/display.md` (which is
already extremely thorough — it appears to have absorbed most of this
slate's content directly at build time). Code checked:
`packages/server/src/mud/lib/display/Display.ts`,
`packages/server/src/mud/platform/thing/{Tablet,Screen,Remote}.ts`,
`packages/server/src/mud/world/common/tpa/TpaTerminal.ts`,
`packages/server/src/mud/lib/display/__tests__/Display.test.ts`.
Confirmed: `DisplayKind = 'video' | 'card' | 'prose'` is a real,
exhaustively-switched type; `pairing` is still a closed 4-value enum on
the mixin (`held | remote | staff | open`) with no `AccessApi.can`
routing — the deferred item is genuinely still open.

### Cut (SHIPPED · DOCUMENTED)
- `## The founder's model, which is the right one` (the quoted founder
  design note, 13 lines) — the decision ("a display is any screen
  anywhere, and its contents manifest three ways, which are three client
  components") is stated compactly in `display.md` § *The three arms —
  `DisplayKind`* ("The founder's model is the right one: …").
- `## What shipped instead — four axes fused into one mixin` (the
  diagnostic table) and `### The gap, precisely` and `### ⭐ The symptom
  that proves it` (the TPA-terminal-board-as-costumed-card finding) —
  code: `Display.ts` (`DisplayKind`, `project`), `TpaTerminal.ts`
  (`readScreen` override); doc: `display.md` § *The three arms* (states
  the same two-hardcoded-paths-and-no-third diagnosis) and § the
  `teleport` verb entry (states the departures-board defect and fix
  nearly verbatim, including the `renderDepartures(viewer)` /
  travel-credential detail). Only `### ⚠ And pairing is a fourth kernel
  list` survived — the one part of this trio still unbuilt — renamed to
  a top-level `## ⚠ pairing is a fourth kernel list` heading so it stands
  alone.
- `**The one move that unlocks it:**` paragraph (under *The
  decomposition*) — code: `Display.ts` `DisplaySource`/`project`; doc:
  `display.md` § *The three arms* ("carried, explicit and total…a fourth
  arm is a compile error").
- `## Scope` § *This MR (!206) — ✅ BUILT* (all four numbered items) —
  all four are stated as shipped in `display.md` (the `DisplayKind`
  three-arm type, the prose arm + terminal move, `sourcePolicy` →
  `shows: DisplayKind[]`, and item 4's "dissolving, not building" answer
  — see the Q1 cut below).
- `## Scope` § *Deferred, with reasons* (network/channel layer; driver
  policy off the kernel enum) — both bullets are restated near-verbatim
  in `display.md` § *Non-goals (v1)*, so the reasoning is preserved
  there; the backlog items themselves survive in the slate's `Left` list
  and in the kept `⚠ pairing is a fourth kernel list` section and open
  question 4.
- Consequences bullet *"Prose becomes real, and the terminal board stops
  pretending"* — doc: `display.md` § *Prose has no projection, and that
  is the finding* + the `teleport` verb entry.
- Consequences bullet *"Video stays dumb…"* — doc: `display.md` § *The
  three arms* ("video — an embed the client renders… Live vs recorded is
  a property of the CONTENT") and § *Non-goals* (the network/guide layer
  above video is separately tracked, unaffected by this cut).
- Open question 1 (*"Does prose project per-viewer…"*, already marked
  "✅ ANSWERED" in the slate with three paragraphs of explanation) — per
  the pilot calibration ("answered open questions are cut with a
  pointer"): the full answer (readScreen, the departures-board defect,
  why the "third wire shape" idea dissolved) is now doc content, word for
  word, in `display.md` §§ *Prose has no projection, and that is the
  finding* and the `teleport` verb entry. Reduced to a one-line pointer.

### Kept (UNBUILT)
- `## ⚠ pairing is a fourth kernel list` (retitled from a subsection) —
  verified: `Display.ts`'s `pairing` field is still the closed
  `'held' | 'remote' | 'staff' | 'open'` union; no `AccessApi.can` routing
  exists for it anywhere in `packages/server/src`.
- `## The decomposition` diagram — the `Screen`/`Content` arms match
  what shipped, but the `Network / channel` arm ("OPTIONAL, LATER") is
  still unbuilt and is the reference spec for that future work; kept
  whole (a single fenced code block, and splitting it would cut below
  paragraph granularity).
- `### Consequences worth stating` bullets 1 (*one projection, one wire
  shape*) and 2 (*driver policy leaves the kernel enum*) — both
  confirmed still open. Bullet 1 is explicitly called out as open in
  `display.md` § *What the client changed* ("stays open, and would be
  its own build") — annotated with that pointer rather than cut, since
  the *design content* (why one shared wire shape matters) is not
  restated in the doc, only the fact that it remains open.
- `## ⚠ Open questions the build must answer` items 2, 3, 4 — none
  resolved in code or doc. Item 3 (`showing` one slot vs many) and item 4
  (where driver policy lives) both map onto `display.md`'s *Non-goals*
  list, which defers rather than answers them.
- Framing italic paragraph (the founder's quote about the original
  substrate being "conflating a lot of things") — kept as the slate's
  provenance/spine per the procedure.

### Uncertain
- None.

### Handoff (belongs in a doc outside my list)
- None. Everything graduated in this pass belongs in `display.md` itself,
  which is already in my insert-doc list.

### Status block
- Left: grew by one item. Old: *driver policy off the closed `pairing`
  enum and onto `AccessApi.can` · the network / channel / guide
  addressing layer · multiple simultaneous sources per screen*. New: adds
  *one shared wire shape for display projection (video push / card push
  / prose-read stay three mechanisms)* — this item is in the body
  (Consequences bullet 1, kept) and is explicitly still open per
  `display.md` itself, but was not previously represented in `Left`. Per
  the pilot calibration, "Left usually grows… that is the pass working."
- Size: unchanged — *a wave*.
- Status: unchanged — *PARTIAL* (the mechanism substrate shipped; driver
  policy, addressing, multi-source, and wire-shape consolidation remain).

**Net effect:** cut the shipped diagnosis/fix narrative (now duplicated,
better, in `display.md`) and the answered Q1; kept everything still
architecturally open, including the one item (`pairing` as a kernel
list) that is load-bearing backlog. No rewriting; INSERT was not needed
in `display.md` since it already carries every graduated decision.
