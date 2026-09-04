---
name: requirements
description: Drive the slate-to-requirements phase of the project workflow. Use when starting a feature cycle from one or more slates in docs/slates/ to agree PRODUCT scope and produce a requirements doc at docs/requirements/<feature>-requirements.md. Product requirements only — engineering shape belongs to /plan.
---

# Requirements

Drives Phase 1 of the workflow: slate(s) → agreed **product**
requirements.

Read `docs/workflow.md` for the artifact taxonomy and phase rules.
This skill is the entry point for one phase only — it does not plan,
build, or sweep.

## ⭐ The line: product, not engineering

> **This doc says what the *product* needs. `/plan` says what the
> *code* needs.**

That line decides every "does this belong here?" question:

| belongs here (product) | belongs in the plan (engineering) |
|---|---|
| what a person can now do, and why | which classes, mixins, files |
| which **trade / realm / pack** this belongs to | which **class carries the state** |
| what a *player* would recognize as already existing | the file-level code survey (Grounding) |
| what existing places and objects this collides with | how they integrate |
| the **drive script** — what a person does, in order | the drive **record**, and the wiring that makes it run |
| acceptance observable from outside the code | tests, gates, wave-by-wave acceptance |

If a sentence names a class, a file, or a method, it is in the wrong
document. Move it to the plan.

## What to do

### 0. Name the build kind, and which end leads

Two facts, one line each, at the top of the doc. They change what the
rest of it must contain.

**Kind** — `feature` · `content` · `refactor/sweep` · `infra` ·
`client`. (A **design** build is docs-only and does not enter this
loop at all.)

**Lead end** — `content-led` or `kernel-led`. Every code build in this
repo touches both the kernel and the packs; what varies is which end
leads. Measured over nine builds: api-oo-sweep was 493 kernel files to
57 pack, metal-chain was 23 to 223. The lead end is a real fact about
the build, and it is what the staging (Stage A / Stage B, W0…Wn)
expresses.

⚠ **A kernel-led build must name its first consumer** — the content
that will actually exercise the substrate, and the build it ships in.
If nothing will exercise it, say so plainly: that is the strongest
available argument that the build is premature. This is the check that
would have caught `feel`/`taste` shipping without ever running, and
the reference-Idea roster going inert three separate times.

### 1. Identify the slate(s)

If the user named slates, load them. If they didn't, read
`docs/slates/README.md` — the index divides the backlog into
`builds/` (new substrate, grouped into named multi-phase builds),
`tails/` (deferred tails of shipped subsystems), and `deferred-rpg/`
(game-design behind the platform line) — and ask which slate(s) or
which build seeds this cycle. Slate files live in those subfolders,
not at the `docs/slates/` root. Multiple slates can feed one
requirements doc when the features are tightly coupled — a single
`builds/` build is the common case.

### 2. Survey what already exists — at the PRODUCT level

⭐ **The codebase is a product document, and it is now far too large to
hold in your head.** 136 subsystem docs, 199 mixins, 466 command
views, 37 packs, 48 Disciplines. The slate was very likely written
before some of that existed.

Survey the built surface for this feature's nouns and verbs, at the
level a *player* would recognize — not file-level (that is the plan's
Grounding section):

- **Verbs** already near this (`packages/content/**/cmd/**.yaml`).
- **Trades / packs** that own adjacent ground (`packages/content/`).
- **Subsystem docs** whose subject overlaps (`docs/subsystems/`).
- **Disciplines** already in the catalogue.
- **Slates** covering the same design space (a duplicate slate is a
  real hazard at 214 of them).

This is fan-out search, not judgment — delegate it. It ends with the
sentence that earns the section: **"therefore what is genuinely new
here is…"** Routinely this shrinks the build, which is a good outcome
that otherwise never happens.

### 3. Ideate

Creative back-and-forth. Brainstorm shape, scope, edge cases,
trade-offs. The user drives direction; you surface implications, prior
art, and antipatterns that constrain choices.

### 4. Run the five lenses

Read `docs/design-lenses.md` and interrogate the scope against all
five: pedagogy (which Disciplines, what is derivable) · creative
expression (ordinary case with no code; bespoke without breaking) ·
immersion & roleplay (what the sim affords without scripting) · values
(the choice forced; who confers standing) · epochs (the mechanism
holds, only the dynamics change).

**Scorecard, not a gate** — 1 and 2 pick the winner at a fork, and
when they do, ⭐ decide it and say which limb chose rather than asking.
A heading that is hard to fill is the finding; write the gap down.

### 5. Ask the collision question

**Which existing places and objects does this touch, and who already
lives there?**

Nobody asks this today, and it is a recurring rework class — the metal
chain shipped and then needed `the DORM was missed`, `a circle's door
belongs at your home, not in a commons`, `the wardrobe belongs where a
new player wakes up`, `the provisioning room props the COUNTER, not
the goods`. Every one is "we added a thing and forgot the world
already had one."

### 6. Write the drive script

⭐⭐ **The highest-value section in the document.** A numbered script of
what a person *does*, in the live game, in order, and what they should
see. Written now, before any code exists.

It does three jobs:

1. It is the definition of done **that is not a test**. Tests build
   state; they never use it. The two builds that were driven found
   nine defects ~10k tests could not.
2. It is the script the build phase runs at its exit — so that phase
   costs nothing to start.
3. It makes the silent-failure class **unwriteable**. You cannot write
   *"the player types `taste`"* without having decided what affords
   the verb, what data enables it, and what warms that data at boot.

A **kernel-led** build with no player-facing surface still writes one:
it drives the nearest existing content that touches the new substrate.
If nothing touches it, see step 0.

### 7. Converge on scope

Before drafting, confirm what's *in* and what's *out*. Closed scope —
no open questions left for the planner. ⚠ When a question survives
into the plan it gets closed there anyway, at a worse moment: cooking
shipped a commit literally titled `plan(cooking): close all seven open
questions`.

### 8. Write the artifact, then stop

`docs/requirements/<feature>-requirements.md` in the shape below. Show
the draft, iterate to alignment. Phase 1 ends with the artifact written
and agreed — don't volunteer to plan or implement.

## Requirements doc shape

```markdown
# <Feature> — requirements

**Kind:** feature | content | refactor/sweep | infra | client
**Leads from:** content | kernel  (kernel-led: first consumer is …)

One-paragraph framing: what this feature is, why it exists, what
problem it solves. Cross-reference the seeding slate(s).

## What already exists

The product-level survey (step 2): verbs, trades, subsystems,
Disciplines, overlapping slates. Ends with "therefore what is
genuinely new here is…".

## Goals

Bulleted. The *outcomes* this build delivers. Outcome-shaped
("X is persistable through Y"), not task-shaped.

## Non-goals

Bulleted. ⚠ **Every non-goal names its destination** — a slate, a
later build, or "nowhere, deliberately." A non-goal with no
destination is design that evaporates; across 22 retired docs only
11% of non-goal lines named where the thing would land.

## Placement

Which trade / realm / pack owns this, and which namespace root.
Kernel or pack, and why. ⭐ The test: **does a second instance need
code?** (A second venue should need zero pack code.)
Host placement — which class carries which field — is the plan's.

## Collisions

Which existing places, objects and NPCs this touches, and who
already lives there.

## Surface decisions

The agreed answers to the slate's open questions, at product level.
One subheading each: the question, the answer, the reasoning, and
(when load-bearing) the alternatives considered.

## Lens pass

Five short entries against `docs/design-lenses.md`. Gaps recorded
as gaps.

## The drive

The numbered script: what a person does, in order, and what they
should see. This is run at the end of the build phase, before the
MR opens.

## Acceptance criteria

⚠ **Observable from outside the code.** Tests, lints and gates are
the *plan's* acceptance, not this doc's — across 22 retired docs,
187 of 470 acceptance lines named a test and only 8 named a
player, which is exactly the gap the drives kept finding.

## Cross-references

- Seeding slates
- Relevant subsystem docs
- Related requirements (if any are in flight)
```

## Posture notes

- **Closed scope at the end.** Surface any surviving open question
  and resolve it before finishing the artifact.
- **Don't pre-plan.** Implementation shape is the planner's job.
  This doc says *what* and *why*; the plan says *how*.
- **Use antipatterns as a sieve.** Check `docs/antipatterns.md` and
  project-memory feedback rules as choices surface.
- **Capture decisions, not options.** Alternatives belong in the
  slate, or in the reasoning only when load-bearing.
- **Phase gates are user checkpoints.** A build brief authorizes the
  cycle; it never authorizes skipping the gates within it.
