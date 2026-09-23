# Slate-compaction pass — call-security batch ledger

Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list:
`docs/subsystems/call-security.md`.

---

## docs/slates/tails/call-security-performance-slate.md — 387 → 160 · Status PARTIAL → PARTIAL

This slate is the journal of a completed performance investigation.
Code-verified before any cut: `lib/security/execution-context.ts` has
`claimFramePush` + `_frameMutatorAllowlist`; `ShadowApi._gateEntries()`
exists (the unwrapped-handoff fix); `resolveCallPolicy`'s cache is
generation-stamped; the frame stack is a `FrameNode` linked list.
`api/proxy.ts`'s `findDescriptor` (line 317) is still a plain
uncached prototype walk — confirmed still unbuilt, matching §7's claim.
No caching found around `RecognitionLogic.describeCore` /
`pushDirect` (`api/mql/scope-walk.ts`) — confirmed still unbuilt.

`docs/subsystems/call-security.md` already carries almost the entire
technical substance of §§1-6 verbatim, under its own "## What a gated
call costs" section (added by the same MR this slate documents) — the
instrument, all five findings, the measured arc's endpoints (50 700 ns
→ 2 140 ns), the rule, and what was not traded away. §4 (the boot-time
finding) is similarly already graduated to `persistence.md § The
resident content cache` and `§ The query trace` (verified directly —
this coordinator also ran the `persistence` batch and read that doc in
full).

### Cut (SHIPPED · DOCUMENTED)
- `## 1. The instrument` (30 lines) + `## 2. ⭐ What was actually
  wrong` (2.1-2.5, 85 lines) + `## 3. The arc, measured` (12 lines) +
  `## 5. The rule this produces` (21 lines) + `## 6. What was NOT
  traded away` (9 lines) — ~157 lines total, merged into one pointer —
  doc: `call-security.md § What a gated call costs` (verified: the
  five numbered findings, the bench-gate gotchas box, the "rule"
  blockquote, and the "What was NOT traded away" list are all present,
  in some cases word-for-word). Not reproduced in the doc (noted, not
  re-graduated — measurement provenance for an already-stated decision,
  recoverable from git): the intermediate per-step ns arc (7300 → 4500
  → 3500 → 3150) and the per-site % table (`GetController` 96.5% etc.)
- `## 4. ⚠ The finding this investigation did NOT expect` + its nested
  `✅ BUILT 2026-08-31` box (~94 lines) — doc: `persistence.md § The
  resident content cache` + `§ The query trace` (991 rows / <600 KB,
  the before/after ops table, `SAXONBERG_QUERY_TRACE=1` — all verified
  present in that doc during the sibling `persistence` batch). One
  paragraph (the "writes cannot be parallelized" reasoning) is NOT in
  persistence.md — see Handoff below
- `## 7`'s struck-through boot-round-trips bullet (`~~§4, the boot
  round trips~~ ✅ Built...`, 3 lines) — redundant with the new §4
  pointer directly above it in the reorganized file

### Kept (UNBUILT)
- Canonical status block (re-stamped), the intro framing (libations
  live-drive context + the headline result — short, harmless to keep)
- `## 7. Left on the table`'s three live items: `findDescriptor`
  accessor-ness caching, the static-Api apply thunk, and the Recognition/
  `describeCore`/`pushDirect` hoisting pair — all confirmed still
  unbuilt in code
- `## 8. The overnight drive` in full, including the "Still open"
  bullets (dilution/muddled-marker/bitters-debit not driven; the `put
  ice in bin` message wording) — see Uncertain below
- `## Cross-references`

### Uncertain — kept
- `## 8. The overnight drive` (including its "bugs the drive found"
  journal, ~60 lines) is a **libations-build** bug log that landed in
  this call-security slate because both came out of the same live-drive
  session (2026-08-31). None of it is call-security subject matter, and
  `docs/slates/tails/libations-slate.md` exists as a plausible real
  home. It doesn't cleanly classify as SHIPPED·DOCUMENTED (there's no
  subsystem-doc "decision" here, just a fixed-bugs journal) or as
  clearly cuttable (the three "Still open" items may still be live
  loose ends I did not verify — dilution/muddled/bitters-debit game
  mechanics and a message-wording nit are outside this batch's
  competence to verify quickly). Kept whole per "when in doubt, keep."
  Flagging for the cluster/coordinator pass: candidate to move onto
  `libations-slate.md` rather than live here permanently.

### Handoff (belongs in a doc outside my list)
- → `persistence.md` (near § The resident `content` cache, or as a
  note on `DomainHook`/the folder-leaf invariant) — **why the
  pack-install content writes can't simply be parallelized**, verbatim
  from the cut §4 box:

  > ⚠ **Those writes cannot simply be parallelized**, and the reason is
  > worth keeping: `content`'s around-save hook validates the
  > folder/leaf invariant by walking the row's ancestors, and
  > `validateSingletonContainerTarget` requires the row named by
  > `data.container` to **already exist**. Both read rows an earlier
  > save in the same install wrote. The installer's content writes are
  > order-dependent *through the hook chain*, not by accident. Batching
  > them would mean validating serially (cheap now — those walks are
  > the cache's best customer) and bulk-writing after, which is a real
  > change to the hook contract rather than a loop rewrite.

  Verified NOT already in `persistence.md` (grepped for "parallel",
  "order-dependent", "validateSingletonContainerTarget" — only the
  unrelated `validateSingletonContainerTarget` mention at line 285, no
  reasoning about parallelization).

### Status block
- Left: *`findDescriptor` accessor-ness caching · the static-Api apply
  thunk · hoisting the viewer-invariant checks out of `describeCore` ·
  `pushDirect`'s second `describeCore` entry* → *same four, plus a
  flagged pointer to §8's three libations-drive loose ends* (the body
  wins — §8's "Still open" bullets are live UNBUILT content that had no
  representation in the old Left)
- Size: a tail → a tail (unchanged)
- Status: PARTIAL → PARTIAL (unchanged)

---

## Findings for the coordinator

- No migrations proposed anywhere in this slate.
- `call-security.md` and `persistence.md` both already cite this slate
  by name/link for "the full investigation, with the numbers at each
  step" — those cross-references still resolve correctly after this
  cut (the slate still exists, just shorter); no doc-side link needed
  fixing.
- The one real content gap (parallelization reasoning) is small — a
  single paragraph — and is recorded verbatim above for whoever next
  touches persistence.md's install/hook section.
- Recommend, for a later pass: move `## 8. The overnight drive` from
  this slate onto `docs/slates/tails/libations-slate.md`, where its
  subject matter actually lives. Not done here — out of this batch's
  write list and not clearly low-risk to relocate without reading that
  slate's own current state.

---

## Coordinator (2026-09-20) — handoff applied

- `persistence.md § DomainHook` — the "writes cannot simply be
  parallelized" paragraph inserted after the singleton-target sentence;
  the two stale `obj/hooks/` paths corrected to `platform/idea/hooks/`
  (the persistence batch's finding).
