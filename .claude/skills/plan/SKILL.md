---
name: plan
description: Drive the requirements-to-plan phase of the project workflow. Use when a requirements doc is agreed and the build needs an implementation plan at docs/plans/<feature>-plan.md. Produces the ENGINEERING half — grounding, host placement, wave decomposition, wiring — via the Fable planner agent.
---

# Plan

Drives Phase 2 of the workflow: agreed requirements → an
implementation plan a fresh-context build agent can execute.

Read `docs/workflow.md` for the artifact taxonomy and phase rules.

## ⭐ The line: engineering, not product

> **The requirements doc says what the *product* needs. This doc says
> what the *code* needs.**

Scope is already closed when this phase starts. If planning reveals
the requirements are wrong, **stop and say so** — reopening scope is a
return to Phase 1, not something to absorb quietly. When a question
survives into planning it gets closed here at a worse moment; cooking
shipped a commit titled `plan(cooking): close all seven open
questions`, and that was a Phase 1 failure being paid for in Phase 2.

## ⭐⭐ Planning runs on Fable

Project convention: **Opus for most things, Fable for planning.** The
`planner` agent (`.claude/agents/planner.md`) carries `model: fable`
and the planning contract. Invoke it for the authoring pass rather
than writing the plan inline — that is the whole reason this phase is
a skill.

## What to do

1. **Load the inputs.** The requirements doc, the seeding slate(s),
   and the subsystem docs the requirements cross-reference. Confirm
   the build's **kind** and **lead end** from the requirements
   header — they decide the staging.

2. **Ground it.** The file-level survey: what exists today, verified
   by opening files, with paths. This is where the deep code survey
   belongs — the product-level survey already happened in Phase 1.
   ⚠ Grounding is not optional and not from memory: `furnishing-plan`
   shipped a section literally titled *"What the code survey
   changed"*, which is a survey arriving after the decisions it
   should have informed.

3. **Invoke the `planner` agent** with the requirements doc, the
   grounding, and the open engineering questions. It authors the plan
   in the shape below.

4. **Iterate with the user** until every implementation detail is
   acceptable. This is conversational; the plan is the artifact that
   absorbs the outcome.

5. **Write it** to `docs/plans/<feature>-plan.md`.

6. ⭐⭐ **The handoff once-over — do this unprompted.** Before the user
   clears context, read the finished plan *as the build agent will*: a
   fresh reader with no memory of this conversation. Then say, briefly:

   - **Completeness** — can every wave be executed from the doc alone?
     Any step that only makes sense because you were here is a gap.
   - **Cohesion** — do the waves compose, in this order, with each
     independently landable? Does a later wave assume something an
     earlier one didn't actually establish?
   - ⚠ **Anything that needs the user's eye** — a decision the plan
     makes that they may not have registered, a risk they should price,
     a place the plan and the requirements disagree.

   This is their last checkpoint before the build runs to the MR
   without stopping, so surface it now or it surfaces in review. Say
   plainly when there is nothing — a clean bill is a useful answer.

7. **Stop.** The build is a separate phase, started with fresh context
   and `/build`.

## Plan doc shape

The shape three live plans converged on independently, plus the two
sections their absence cost the most.

```markdown
# <Feature> — implementation plan

One paragraph: what is being built, and the requirements doc it
executes. State the kind and lead end.

## Grounding

Facts verified this cycle, with file paths, current at plan time.
What exists, what it does, what it does NOT do. A fact you did not
open a file to check does not belong here.

## Plan-level decisions

The engineering decisions, numbered (D1, D2…) so waves and commits
can cite them. Each: the question, the choice, the reasoning.

## ⭐⭐ Host placement

For every new field, mixin and class: which host carries it, and
what composing it claims about everything else that composes that
host. **The largest single source of post-MR rewrites in this
repo.** The test: if a guard is needed to re-narrow the host set,
the host is wrong.

## Convention conformance

Which current conventions this build must satisfy, checked at plan
time, not recalled: props:/cast:, Locations-not-rooms, the
<root>/<branch>/ path pattern, module-scope, the import boundary,
verbs-on-objects. Name the lint gates this build must pass.

## Waves

`W0…Wn` (or `Stage A / Stage B` when the build straddles kernel and
content). Each wave: its goal, the decisions it implements, the
files it touches, its acceptance, and the commit it ends at. Every
wave independently landable.

## Reachability wiring

For each new capability, the four links — **verb · affordance ·
data · boot**. Each fails closed and silent, and each has cost this
repo a shipped-but-dead feature: a verb nothing affords, a row
nothing warms, a mixin nothing reaches.

## Acceptance-criteria coverage

Map the requirements doc's acceptance criteria to the waves that
satisfy them. Anything unmapped is a scope gap — surface it now.

## Test & gate strategy

What gets unit tests, what only the drive can prove, which lint
gates apply. ⚠ `pnpm test` runs at exactly two moments — before the
MR and at /finalize; everything between is `test:near` + the lints.

## Risks & opens

What could break, what is still uncertain, what the build should
stop and ask about rather than guess.

## Deferred seams

Clean attach points, not stubs — and the slate each deferred piece
leaves as. Deferred design does not live in a plan; the plan is
retired at the sweep.

## Critical files

The paths a fresh-context build agent should read first.

## Drive record

*(appended at build time, not at plan time)* — the output of running
the requirements doc's drive script, and what it found. Precedent:
`farming-plan.md § Checkpoint A — the drive record`.
```

## Posture notes

- **The plan is a living document during the build.** Plans are
  touched 2–15 times per build; waves get marked done, and a wave
  whose premise turns out wrong gets re-planned in place
  (`plan(bulk): W2 done; W3's premise was wrong`). That is correct
  behavior, not drift — keep it current.
- **Ask, don't invent.** A fork the requirements didn't decide and
  `docs/design-lenses.md` doesn't decide is the user's call.
- **No new module category or exported helper without sign-off** —
  see `CLAUDE.md § Module Categories`. The lint failing is the
  intended tripwire; the answer is almost always "fold it in."
