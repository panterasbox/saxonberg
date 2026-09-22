# Slate compaction ledger — batch `command-routing`

Assigned slates:

- `docs/slates/tails/affordance-verb-slate.md`
- `docs/slates/tails/async-commands-slate.md`

Doc-insert allowlist: `docs/subsystems/command-routing.md`,
`docs/subsystems/spatial.md`. Anything belonging in another doc goes to
this file's *Handoff* sections, never into that doc directly.

No prior ledger for this batch key exists in this directory as of
2026-09-20 — this is the first pass over these two slates. (A prior
*build* — MR!122, MR for lib-statics — already put the async-dispatch
design into `command-routing.md`; that content is verified against code
below, not re-derived.)

---

## docs/slates/tails/affordance-verb-slate.md — 312 → 192 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- `## Verbs put / give + Surfaced — SHIPPED` (11 lines) — code:
  `packages/server/src/mud/lib/spatial/Surfaced.ts`,
  `packages/server/src/mud/platform/idea/cmd/inventory/{Put,Give}Controller.ts`;
  doc: `spatial.md § Surfaced and surface placement`.
- `## What shipped in this slate` (7 lines) — duplicate of the above; same doc.
- "**Default — shape resolution (already shipped).**" paragraph — code:
  `CommandGiver.ts` `_runChain`; doc: `command-routing.md § Stage 3 —
  Matching` + `§ Recency stack`. ⚠ The cut paragraph's own claim (`pass:
  true` as part of the shipped shape-resolution chain) is **false as of
  this pass** — `command-routing.md § Dynamic contributions (the retired
  `pass: true` replacement)` states `pass: true` is gone. Cut rather than
  carried forward.
- "**Command provenance (help).**" paragraph — code:
  `packages/server/src/mud/platform/idea/cmd/system/AffordancesController.ts`
  + `content/platform/cmd/system/affordances.yaml`; doc:
  `command-routing.md § Affordance attribution — source, not category`
  (the `affordances` verb is that section's named "live consumer").
  The slate's own `Left` line still listed this as outstanding — stale;
  the body's design (a help surface keyed on source) is exactly what
  shipped.
- `### Q1. Surfaced vs. Container ontology` — reduced to a one-line
  pointer (already marked "Resolved" in the slate itself); doc:
  `spatial.md § Surfaced and surface placement`.

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `## Detail interactions — affordances live on Stuffs, not Details`
  (42 lines) — code: `Surfaced.ts` `userFacingDetail`,
  `Slotted.ts` `userFacingDetail` (the sibling bridge); doc: nowhere
  stated the general doctrine, only the mechanism. Inserted a 13-line
  paragraph at `spatial.md § Surfaced and surface placement` → new
  subsection `### Affordances live on Stuffs, not Details` (right after
  `### Surfaced.userFacingDetail`).

### Superseded — cut
- `### How a verb reaches an object (it isn't always a mixin)` (19
  lines) and `### Worked example — the watch` (28 lines) — by the
  shipped Watch: `packages/content/terminus/src/university-avenue/thing/Watch.ts`
  + `MechanicalMovementMixin`
  (`packages/server/src/mud/lib/time/MechanicalMovement.ts`) +
  `TimekeepingMixin` (`packages/server/src/mud/lib/time/Timekeeping.ts`).
  Shipped shape differs from the slate's sketch: no `Timepiece` mixin,
  no `set` verb (ships `wind` + `adjust`, gated on
  `MechanicalMovementMixin` presence, not "carried with no mixin at
  all"). The general global-verb-vs-object-carried-command question the
  slate poses is answered — differently framed, as a reusability test —
  at `command-spec.md § Domain-local commands` (lines 120–138) and
  `time.md` (the Watch section). Both docs are outside this batch's
  insert allowlist; no graduation needed since the doctrine already
  lives there. Left a pointer in the slate body.

### Kept (UNBUILT)
- `## Principle` (framing, kept as spine)
- `## Verb collision, source-scoping, and command provenance` — the
  "Explicit — source-scoped invocation", "Syntax not locked", and
  "Multiple results = cardinality" paragraphs (the `::` design itself
  is unbuilt: no code hits found for a `::` scope operator anywhere
  under `packages/server/src/mud/api/command.ts`,
  `mud/lib/command/**`, or `mud/api/mql/**`)
- `## What this slate does NOT cover` (verified each bullet still true:
  no `ReceivingMixin` in the tree; `put.yaml` has only `in`/`on`
  prepositions — checked
  `packages/content/platform/content/platform/cmd/inventory/put.yaml`)
- `### Q2` `Q3` `Q4` `Q5` — all genuinely open; no code implements
  source-scoping so none of these can have resolved

### Uncertain — kept
(none)

### Handoff (belongs in a doc outside my list)
(none — the one candidate, the global-verb-vs-carried-command doctrine,
is already documented at `command-spec.md § Domain-local commands`;
nothing left to hand off)

### Status block
- Left: *source-scoped invocation + parse wiring · verb-provenance help
  listing · pocket-watch worked example · `Receiving` mixin · extra
  `put` prepositions* → *source-scoped invocation + parse wiring (Q3–Q5)
  · extra `put` prepositions (Q2) · `Receiving` mixin* (help-listing and
  watch-example items removed: shipped / superseded, both documented)
- Size: a tail → a tail (unchanged)

---

## docs/slates/tails/async-commands-slate.md — 283 → 83 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- `## Principle` (9 lines) — restates the shipped feature's motivation;
  doc: `command-routing.md § Async dispatch` intro paragraphs.
- `## The fact that frames the feature` (36 lines) — code:
  `Backend.ts` (`processUserMessage`/`inboundChainBySocketId`),
  `SchedulerLogic.ts`, `ScriptLogic.ts` (`startAndDetach`,
  `whenFirstYield`); doc: `command-routing.md § Async dispatch` ¶1
  ("By default `_executeOne` awaits... Sync is per-giver, never
  global.").
- `## What async means, precisely` (22 lines) — doc: same section, the
  "moves the detach point to the front — accept-time" paragraph is a
  near-verbatim match.
- `## The seam is already reserved` (20 lines) — code:
  `packages/server/src/mud/api/command.ts` (`type: boolean` options,
  the `dispatch` phase, `IMPLEMENTED_REPLACE_HANDLERS`),
  `CommandGiver.ts` `_executeOne`; doc: same section, "The reserved
  `deferred-dispatch` phase-effect handler remains a documented
  placeholder; v1 threads the async decision directly."
- `## Decisions (locked)` 1–4 (44 lines) — code verified: `async:`
  spec field, `--async`/`--sync` flags, `_executeOne` detach via
  `runDetachedBody`, the `script` verb
  (`packages/server/src/mud/platform/idea/cmd/system/` — verified the
  bare typed-script line at `CommandGiver.ts:684` is still
  unflaggable, matching decision 3's own claim); doc: same section,
  states all four decisions.
- `## Output semantics — deferred scene` (12 lines) — doc: same
  section, "an async command's Scene output lands *after* the prompt
  is back (out of order)... never `look`" is verbatim-equivalent.
- `### Q1`–`Q4` under Open questions (33 lines) — reduced to four
  one-line resolutions with pointers (pilot rule: answered questions
  cut with a pointer). Verified each lean against code/doc: Q1 (late
  throw → `controller-error` envelope, doc states it), Q2 (no
  rejection/allowlist exists in `_executeOne` — confirmed by reading
  the detach branch), Q3 (flags are framework-universal per doc), Q4
  (detach ordering — parse/alias/echo before `_executeOne`, per doc).
- `## Toward requirements` (15 lines) — this was the implementation
  checklist; all five bullets are done (`async` field on
  `CommandDefinition`, universal flags, the detach wiring, the
  `script` verb, the deferred-output caveat — the last is outside my
  doc list; see Handoff).

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `## Concurrency — the hazard, and why it's already tolerated` (18
  lines) — code: the interleave precedent is real (a detached script
  coroutine already dispatches as the actor while the player types);
  the doc's existing "exclusive actor access... uses engagement, not
  async" sentence covered the *rule* but not the *guardrail framing*
  (`async: true` as the author's claim of interleave-safety) or the
  *already-tolerated* precedent. Inserted an 8-line paragraph at
  `command-routing.md § Async dispatch`, right after the two-
  consequences paragraph, opening "**The concurrency guardrail is the
  author's, not the framework's.**"

### Superseded — cut
(none — nothing here shipped in a different shape than designed; MR
!122 built the slate's own locked decisions as written)

### Kept (UNBUILT)
- `## Remaining design` — new small section written to back the
  status block's `Left` list (the pass-1 file had cut every paragraph
  that used to carry these three items, leaving `Left` unrepresented
  in the body — fixed per the "body wins, Left must correspond to the
  body" rule). Verified all three still unbuilt: no line-level flag
  handling on the bare `parseResult.script` branch
  (`CommandGiver.ts:684`); grepped
  `packages/server/src` + `packages/content` for
  `concurrencyCap`/`maxAsync`/`asyncCap` and for
  `cancel-my-running`/`CancelAsync` — no hits either way.
- `## What this slate does NOT cover` — unchanged; every bullet still
  accurate.

### Uncertain — kept
(none)

### Handoff (belongs in a doc outside my list)
- → `response-envelope.md` (near `## Frame ordering across channels`,
  lines 576–590): **stale forward-reference.** The doc still says "If
  a **future** async controller sends Scenes after returning (via
  `ScheduleApi`)…" — async dispatch has shipped (MR !122,
  `command-routing.md § Async dispatch`), and it is a *different*
  mechanism than the `ScheduleApi`-driven "async-aftermath" frames
  this section already describes: dispatch-level async detaches the
  whole controller body at accept-time under `runDetachedBody`/
  `ExecutionContextApi.runRoot`, and its late Scene frames should
  correlate the same way (`causingCommandId`) as the aftermath frames
  already documented here — but the section's present tense treats
  this as hypothetical. Whoever owns `response-envelope.md` should
  update the paragraph to reflect that dispatch-level async now
  exists, confirm whether its late frames actually carry
  `causingCommandId` the way `ScheduleApi`-originated ones do, and
  fold the two "async can happen after the envelope" cases into one
  clear statement.
- → `command-spec.md`: the deferred-output caveat this slate asked to
  be documented there ("A command whose value *is* an immediate
  in-place response (`look`) should not be async. Author's call;
  document it in `command-spec.md` when this lands.") — confirm
  whether `command-spec.md`'s `async:` field documentation (referenced
  from `command-routing.md`) already carries this authoring guidance;
  if not, it belongs there verbatim.

### Status block
- Left: *a line-level `--async`/`--sync` prefix so a bare typed
  multi-statement script detaches without the `script` verb · a
  per-actor async concurrency cap · a generic
  cancel-my-running-async-command verb (engagement owns cancel today)*
  → unchanged in substance, re-verified true against current code; the
  status-block preamble was rewritten to point at the doc section
  instead of repeating MR !122's contents inline.
- Size: a tail → a tail (unchanged)

---

---

## Coordinator (2026-09-20) — handoffs applied

- `response-envelope.md § Frame ordering` — the "future async controller"
  clause re-worded: async dispatch shipped; the passage is about
  `ScheduleApi` aftermath frames, which are a distinct mechanism.
- `command-spec.md § async:` — already carries the "never a command whose
  value is an immediate in-place response like `look`" guidance; no
  insert.
