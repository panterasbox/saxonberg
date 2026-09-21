# Slate-compaction pass — scripting batch ledger

Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `docs/subsystems/scripting.md`.

---

## docs/slates/tails/scripting-slate.md — 416 → 309 · Status PARTIAL → PARTIAL

Code-verified before any cut: `PersistentHydrator`-unrelated — this is
the v1 scripting engine. Confirmed shipped: `lib/script/ast.ts`,
`Block.ts`, `Scope.ts`, `Expression.ts`, `Interpreter.ts` (generator,
takes `actor: Stuff & CommandGiver`), `Coroutine.ts` (4 shapes: `wait`,
await-engaged, `every`, `when` — no `expect`), `AbortReason.ts`,
`Transcriber.ts`, `RecipeKnowledge.ts`, `builtins.ts` (`SCRIPT_BUILTINS
= [set, if, each, while, def, wait, every, when]`), `Value.ts`.
Confirmed **still unbuilt**: no `improv` anywhere in `lib/script/` or
`packages/content`; no `inlet`/`outlet` declarations anywhere; `Pipeline`
AST node exists but `evalPipeline` executes single-stage only (no
value→field binder, no streaming); no `on`-event hook builtin (only
`when`'s poll).

### Cut (SHIPPED · DOCUMENTED)
- `## The first use case — recipes as banked command-scripts (Dave's
  Bar)` (56 lines) — code: `Transcriber.ts`, `RecipeKnowledge.ts`,
  `packages/content/saxonberg-lounge/content/msh/*.msh`; doc:
  scripting.md §§ Demonstration capture (P8) / The chronicle knowledge
  ladder (P9) / Authored demo content (P10) — matches point for point
  (banked recipe, `known-of`/`can-make`, replay via `invoke`). Heading +
  pointer left
- `## Safe by grammar, not by trust` (12 lines) — doc: scripting.md §
  Resource governance (the sandbox) — same resource-exhaustion-not-
  arbitrary-execution split, same `AppSettings script.*` mechanism.
  Heading + pointer left
- `## The grammar: command-native` intro (32 lines) + `### Two Tcl
  warts to avoid` (10 lines) + `### Follow-on decisions` (10 lines) —
  code: `ast.ts`, `Block.ts`, `Scope.ts`, `Expression.ts`,
  `lib/command/parsers/script.ts`; doc: scripting.md §§ Grammar & the
  parser (P1) / The block keystone and `( )` island / Scope, frames &
  `$`. Heading + pointer left; `### Blocks (keystone)` subsection kept
  (below)
- `### Blocks (keystone)` direction bullets (5 bullets, ~14 lines) — same
  doc sections; the closure/first-class-value/child-scope/coroutine/
  last-value-yield shape is exactly what shipped. One correction folded
  into the pointer: `pipe-value`/`expect-match` `it`-binding is NOT yet
  true (both wait on unbuilt work) even though `each-item` binding is.
  **`Open forks (deferred)` paragraph kept** — genuinely still open
- Design-surface items #1 (primitive vocabulary), #3 (conditions), #6
  (execution model), #7 (resource & isolation), #9 (HMR/path-resolution)
  (~24 lines) — doc: scripting.md §§ Grammar & the parser / The block
  keystone (MQL-emptiness in `isTruthy`) / Coroutines / Resource
  governance / The store. #1's "how it grows" answer came from
  `builtins.ts`'s own docstring (see Graduated below, same fact)
- `## What this slate does NOT cover` bullet 4 (`The concrete grammar —
  deliberately open`) — **SUPERSEDED by the code**: the grammar shipped
  in full (command-native, above). One-line note left in place of the
  bullet

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- The "how the builtin set grows" answer (design-surface item #1's
  second half) — code: `lib/script/builtins.ts`'s module docstring
  states it precisely, but scripting.md never said it → inserted a new
  `### Growing the language` subsection into scripting.md (between
  "Control flow as commands (P3)" and "Coroutines (P5)"), ~9 lines,
  quoting the docstring's rule (grow by adding affordance verbs over
  the bus; a new intrinsic builtin is rare and authored out-of-band)

### Kept (UNBUILT)
- Canonical status block (re-stamped), intro paragraph
- `## The piping model` in full (all 7 subsections, ~105 lines) — the
  value-output channel, the binding-seam note, type-compatibility
  rules, ByValue/inlet-outlet design, direct-object default, and "What's
  left to build" are all confirmed unbuilt (no inlet/outlet anywhere,
  single-stage `Pipeline` only)
- Design-surface items #2 (control flow's `on`-event-vs-polling half),
  #4 (actor binding's director-forcing half), #5 (`improv` seam), #8
  (grammar's error-semantics + authoring-intelligence half) — each kept
  whole because part of the bullet is shipped and part isn't (paragraph
  granularity; splitting would go below it)
- `## What this slate does NOT cover` bullets 1-3 (director/force,
  brain ladder, authoring intelligence) — each still points at a
  separate, still-open slate

### Doctrine — kept, labelled
- `The load-bearing decisions` (1-6, ~48 lines) — the thesis for why a
  designed language beats eval-or-menu, why it conducts the bus, why
  timing is control flow, why conditions are MQL, why `improv` unifies
  choreography/live-generation, why humans and the LLM share one
  authoring surface. Argumentative "why," not a checklist — a candidate
  for scripting.md's own "why" framing or `docs/design-philosophy.md`
- `## Why a language (and why now)` (11 lines) — the LLM's-native-medium
  / round-trip-cost / stated-goal argument for building this at all

### Uncertain — kept
- None this batch. Every ambiguous item (the mixed design-surface
  bullets, the Blocks-keystone open forks) resolved to "kept whole" by
  the paragraph-granularity rule rather than needing an Uncertain entry.

### Handoff (belongs in a doc outside my list)
- None. `command-spec.md`'s "pluggable-parser seam" / `{command,
  model}` pre-bound path (referenced by "The binding seam already
  exists," kept as UNBUILT piping design) is **already** documented at
  `command-routing.md:702` (`{ bound } → skip match + assemble; run
  resolve → execute`) and `command-spec.md:189` — verified present, no
  graduation needed.

### Status block
- Left: *the piping model over the built `Pipeline` AST node + the
  value→field binder · the block forks (`it`-only vs explicit params) ·
  the `improv` seam · LLM-director authoring* → *the piping model (+
  the two-channel/ByValue design) · the block-VALUE fork (`it`-only vs
  explicit params — `def`'s named params are separate and already
  shipped) · the `improv` seam · LLM-director authoring · actor-
  binding's director-forcing half · on-event hooks vs. polling · error
  semantics + authoring-intelligence understanding* — the body wins:
  three items (director-forcing, on-event-vs-polling, error-semantics)
  were unrepresented in the old Left despite being live sections in the
  body
- Size: a tail → a tail (unchanged)
- Status: PARTIAL → PARTIAL (unchanged)

---

## Findings for the coordinator

- No migrations proposed anywhere in this slate.
- The `def`/`ScriptDef` vs generic `Block` distinction (that `def`'s
  named params are a *separate* mechanism from the generic `it`-only
  `Block` value) was not stated anywhere in the original slate or in
  scripting.md — I surfaced it while resolving the "block forks" Left
  item because otherwise a reader would think the `it`-only-vs-named-
  params fork was already closed by `def`. Left as a slate note (not
  graduated — it's a clarification of an open fork, not a shipped
  decision) but flagging in case the coordinator wants it in
  scripting.md's Block section too.
