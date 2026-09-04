# Workflow

How feature work moves from product idea to merged code in this repo.
This is the source of truth; the skills under `.claude/skills/` are
thin entry points that load this doc and set posture for one phase.

> ⚠ **Before any commit, see [CLAUDE.md § Worktrees](../CLAUDE.md).**
> Four worktrees share one bare repo. **One branch, one worktree**, and
> **stage by name — never `git add -A`.** Two worktrees on the same branch
> silently turns the second into a stale tree whose `add -A` records mass
> deletions; this cost a day on 2026-08-02. A tracked `.githooks/pre-commit`
> enforces it.

## Artifact taxonomy

Four kinds of doc artifact, each with a distinct lifetime.

| Artifact | Location | Lifetime | Purpose |
|---|---|---|---|
| **Slate** | `docs/slates/<topic>-slate.md` | Long — survives many builds; retired only when fully absorbed | Product-backlog design surface; exploratory but well-developed |
| **Requirements** | `docs/requirements/<feature>-requirements.md` | One build cycle; retired at sweep | **Product** scope for one build: what a person can now do, and why |
| **Plan** | `docs/plans/<feature>-plan.md` | One build cycle; retired at sweep unless deferred waves are preserved | **Engineering** spec a fresh build agent can execute: grounding, host placement, waves, wiring |
| **Subsystem** | `docs/subsystems/<name>.md` | Permanent | Live reference for how the subsystem works once built |

### ⭐ The line: product vs engineering

> **The requirements doc says what the *product* needs. The plan says
> what the *code* needs.**

That single line decides which document a sentence belongs in, and it
is the fix for the loop's most expensive failure mode — decisions that
arrive after the moment they should have shaped.

| requirements (product) | plan (engineering) |
|---|---|
| what a person can now do, and why | which classes, mixins, files |
| which **trade / realm / pack** it belongs to | which **class carries the state** |
| what a *player* would recognize as already existing | the file-level Grounding survey |
| what existing places and objects it collides with | how they integrate |
| the drive **script** | the drive **record**, and the wiring that makes it run |
| acceptance observable from outside the code | tests, gates, wave acceptance |

If a requirements sentence names a class, a file or a method, it is in
the wrong document.

Slates are *open-ended*: they capture design space, including open
questions and deferred work. They're allowed to be long, exploratory,
and forward-looking.

Requirements docs are *closed*: they specify exactly what this build
will ship. They're shorter, decision-focused, and disagreement gets
resolved here before planning starts.

Plans are *self-contained*: they're written so a fresh-context build
agent who has read the requirements + relevant subsystem docs can
work the plan without seeing the conversation it came from.

Subsystem docs are the permanent record. At sweep time, knowledge
from the build graduates here.

## The phases

The full loop, in order. Each phase produces a named artifact (or
mutates one) and ends at a clear handoff.

### 1. Ideation → requirements

**Inputs.** One or more slates from `docs/slates/` (the product
backlog). Optionally a fresh idea not yet sloated.

**Activity.** Creative back-and-forth. Brainstorm shape, scope,
trade-offs. Pull in related subsystem docs and antipatterns as the
conversation surfaces them.

Four things this phase owes the rest of the loop, each aimed at a
measured rework class:

1. **Name the kind and the lead end** — `feature · content ·
   refactor/sweep · infra · client`, and `content-led` or
   `kernel-led`. ⚠ A kernel-led build **names its first consumer**;
   substrate with no consumer is how `feel`/`taste` shipped without
   ever running.
2. **Survey what already exists**, at the level a player would
   recognize. The codebase is a product document and is now too large
   to hold in your head — 136 subsystem docs, 466 verbs, 37 packs, 214
   slates. Ends with *"therefore what is genuinely new here is…"*.
3. **Ask the collision question** — which existing places and objects
   does this touch, and who already lives there? (`the DORM was
   missed`, `the wardrobe belongs where a new player wakes up`.)
4. **Write the drive script** — what a person does, in order, and what
   they should see. It becomes Phase 3's exit criterion.

⭐ **Run the five lenses** ([design-lenses.md](./design-lenses.md)) over
the scope before converging, and carry a short lens pass into the
artifact. Lenses 1 (pedagogy) and 2 (author expressiveness) decide
forks — when they do, decide, don't ask.

**Output.** A **product** requirements doc at
`docs/requirements/<feature>-requirements.md` that the user and
Claude both agree on. Closed scope, no open questions left for the
planner — ⚠ a question that survives into Phase 2 gets closed there at
a worse moment (`plan(cooking): close all seven open questions`).

**Skill.** `/requirements` — sets posture, loads the slate(s), keeps
the requirements doc in the canonical shape.

### 2. Requirements → plan

**Inputs.** The agreed requirements doc.

**Activity.** Ground the plan in the code (the file-level survey),
then author the wave-decomposed plan and iterate with the user until
every implementation detail is acceptable.

⭐⭐ **Planning runs on Fable.** Project convention is *Opus for most
things, Fable for planning*; the `planner` agent
(`.claude/agents/planner.md`) carries `model: fable` and the planning
contract.

⚠ **This phase is not thin.** It was documented as one subagent call;
in practice plan docs are touched **2–15 times per build** and carry
three jobs at once — the spec, the place unclosed requirements
questions get settled, and a live progress tracker as waves land. The
last of those is correct behavior: keep the plan current as the build
moves.

**Output.** A plan at `docs/plans/<feature>-plan.md` that drives a
fresh-context build agent. Its load-bearing sections are **Grounding**
(verified, with paths), ⭐⭐ **Host placement** (which class carries
what — the largest single source of post-MR rewrites in this repo),
**Waves**, and **Reachability wiring**.

**Skill.** `/plan` — loads the inputs, grounds, invokes the `planner`
agent, keeps the plan in the canonical shape.

### 3. Clear context → build

**Activity.** Clear context. Fresh agent reads the plan (and any
subsystem docs the plan references). Implement.

**The build is a wave loop, not a single act.** Every build in the
recent history decomposes into `W0…Wn` (or `Stage A / Stage B` when it
straddles kernel and content) with **one commit per wave**, and the
plan updated as each lands. This was universal practice and undocumented,
so every build re-derived it.

**Output.** Code commits on the feature branch:
- `build(<feature> W<n>): <what the wave did>` — one per wave
- Smaller `feat/refactor/fix(<area>):` commits for sub-pieces

#### ⭐⭐ The exit criterion: drive it before the MR opens

**Tests build state; they never use it.** Run the drive script from
the requirements doc against the running game, and append the result
to the plan as the drive record (`farming-plan.md § Checkpoint A` is
the precedent).

This is not optional and not a formality. Every build that was driven
found defects the suite could not — cooking 6, textiles 3 — and
metal-chain's drive surfaced `five pre-existing boot-breaking defects`
that predated the build. Nine builds have shipped with one `drive(`
commit between them, and the gaps that escaped are the ones that later
cost rewrites in review.

When the drive passes, **push the branch and open the MR** against
`master` — no need to ask first. Pushing and MR creation are not gated
on the user; only the merge is.

**No skill.** A good plan is self-bootstrapping; the user opens a
fresh session, points at the plan path, and the build proceeds.

⚠ **Run the full suite once per build, not three or four times.** Use
`pnpm test:near` for the mid-build loop and `pnpm test` before opening
the MR. See [testing.md § How often to run it](./testing.md) for the
table, and for why this is not "checking less".

### 4. MR review iteration

**Inputs.** The GitLab merge request (`panterasbox/saxonberg!<n>`)
opened at the end of the build, with inline comments from the user.

**Activity.** ⭐ **Review is a conversation.** In practice the user
reads the MR and raises what they don't like in the session, rather
than marking up inline threads — so this phase is ordinary back-and-
forth, not a comment-resolution machine. (Inline threads still work
and `mcp__gitlab__mr_discussions` still fetches them when they exist.)

⚠⚠ **Classify what a comment actually implies before acting on it.**
Three kinds, and only the first is a review round:

| the comment implies | what to do |
|---|---|
| a **local fix** | fix it, commit, carry on |
| a **wave** | add a wave to the plan and land it as one |
| a **placement error** | ⭐ **stop — go back to Phase 2.** Re-plan the host placement deliberately. |

The third is the expensive one and it is common: cooking ran an entire
seven-wave sub-build (`plan(bulk)` → `build(bulk W0…W6)`) *inside*
review, after comments revealed that spoilage, the palate and freshness
were all on the wrong hosts. That work was correct; improvising it
inside a review round is what made it expensive. Re-planning is
cheaper than discovering the plan by refactoring.

**Output.** Descriptive commits naming the change — `refactor(cooking):
the palate off Bulkable — PalatableMixin on CraftVessel`. ⚠ Not
`address MR comments`: that convention was documented for a year and
used **zero times in nine builds**, because a commit that names the
change is simply better.

**No skill.** `/mr-iterate` was retired 2026-09-03 — it drove a
comment-thread loop that this project does not use.

### 5. Final branch sweep

**Activity.** Three-part pre-merge audit:

0. **The drive check.** Confirm the drive record is in the plan and
   every step was run. If the build skipped its exit criterion, run
   the drive now — and check the four reachability links (verb ·
   affordance · data · boot), each of which fails closed and silent.
1. **Code pass.** Diff the whole branch against `main`. Look for
   bad smells, missed requirements, regressions, casts that crept
   in during MR iteration, stale doc references. Fix in place.
2. **Doc sweep.** Update any `docs/subsystems/` pages that the
   build changed the truth of. Add a brief history note at the
   bottom of the subsystem doc if the design→implementation shift
   was load-bearing. Update `docs/architecture.md` /
   `docs/antipatterns.md` / `CLAUDE.md` as needed.

**Retirement at this step.** Decide per-artifact:
- **Requirements doc** — always retired. Delete from
  `docs/requirements/`.
- **Plan doc** — always retired. Deferred-wave design intent does
  NOT belong in a plan; extract it back into one or more slates
  (the proper artifact for open-ended design space) and delete the
  plan. The activity build is the precedent: Wave 1 graduated to
  `docs/subsystems/activity.md`; Waves 2 and 3 became
  `locomotion-as-activity-slate.md` and
  `host-slot-activities-slate.md`.
- **Slate** — kept by default. Retired only when *fully* absorbed
  into a subsystem doc with no remaining design surface (see the
  globbable-slate / response-envelope-slate precedents). When
  retired, salvage open questions into the consuming subsystem doc
  first.
- **Subsystem doc** — never retired; updated in place. If the slate
  graduates entirely, the subsystem doc absorbs the slate's
  surviving content ("graduate slate to subsystem doc" — see the
  activity sweep).

**Output.** One or two commits:
- `docs: pre-merge sweep for the <feature> build` — combined code
  + doc sweep + retirement, if the changes are tightly related
- Or `refactor(<area>): self-review cleanup + post-merge docs
  sweep` followed by a separate `docs: retire <feature> plan and
  requirements`

**Skill.** `/finalize` — walks the whole sweep: branch diff scan,
doc-sweep checklist, retirement decisions, the commit.

### 6. Merge

**Activity.** Merge the MR. Clear context. This is the **only**
step gated on the user — the merge is always the user's call, never
done autonomously.

> ⚠ **Merge on ORIGIN, through the GitLab tool — never the git CLI.**
> Not a preference: a CLI merge does the join in a *worktree*, which
> is the machinery this repo has already been burned by (see
> CLAUDE.md § Worktrees). It also bypasses the MR, so the merge
> commit loses the review record and the branch's approval state,
> and nothing on the remote ever observes the merge that happened
> locally. The MR *is* the merge.
>
> Catching a branch up (`git merge origin/master` **into** the
> branch, then push) is a different act and stays local — that is
> pre-merge verification, and it is what makes the MR's green tick
> mean something.

**Output.** Merge commit on `master`, created by GitLab.

**No skill.** One button — the user's.

## Branch & commit conventions

Observed from the recent history (`spawn-save`, `spacial`, `glob`,
`stuffref`, `activity`, `response`, `loco`):

- Branch name is a short slug for the feature.
- Commit prefixes follow Conventional Commits with the area in
  parentheses: `feat(spawn): …`, `refactor(zone): …`,
  `docs(activity): …`, `fix(ref-shapes): …`.
- Build commits read `build(<feature> W<n>): <what the wave did>` —
  one per wave (or `Stage A` / `A1`-style when the build straddles
  kernel and content).
- The drive commit reads `drive(<feature>): <what driving found>`.
- MR iteration commits **name the change**, not the round —
  `refactor(cooking): the palate off Bulkable`. The old
  `address MR comments` / `MR round <n>` convention is retired: it was
  used zero times in nine builds.
- The pre-merge sweep reads `docs: pre-merge sweep for the
  <feature> build` and may be a single combined commit when code
  and docs are tightly coupled, or split when the doc sweep stands
  alone.
- Plan + requirements retirement reads `docs: retire <feature>
  plan and requirements` when standalone.

## Where the skills come in

| Phase | Skill | What it does |
|---|---|---|
| 1 — Ideation → requirements | `/requirements` | Loads slate(s); the product survey, the lens pass, the collision question, the drive script; ends with the artifact written |
| 2 — Requirements → plan | `/plan` | Grounds in the code, invokes the **Fable** `planner` agent, keeps the plan in shape |
| 3 — Build | *(none)* | Fresh context reads the plan; wave loop; **drive it before the MR** |
| 4 — MR iteration | *(none)* | A conversation. Classify: local fix · wave · placement error (→ back to Phase 2) |
| 5 — Sweep | `/finalize` | Branch-wide code+doc sweep, the drive check, retire ephemerals, commit |
| 6 — Merge | *(none)* | User merges |

The skills are entry points only. The shape of each artifact and the
retirement rules live in this doc; skills load it and run.

⭐ **The skills and agents are tracked in the repo** at
`.claude/skills/` and `.claude/agents/` (2026-09-03). They were
previously a symlink to an untracked directory outside the repo — no
history, no review, and a live edit hit all four worktrees at once.
They are load-bearing process documents and now change by MR like
everything else.

⚠ **One-time step per sibling worktree** after this lands: the old
`.claude/skills` symlink blocks the checkout. Remove it —
`rm .claude/skills` — and git will materialize the tracked copies.

## When the loop breaks

Real cycles aren't always clean. A few common deviations and how to
handle them:

- **Mid-build the requirements turn out to be wrong.** Stop the
  build. Update the requirements doc. Re-run `/plan` if the change
  is structural; otherwise note the deviation in the plan and
  continue.
- **MR review surfaces a missed requirement.** Resolve it in code
  if small. If it's load-bearing, update the requirements doc
  before merging so the sweep doesn't try to retire a doc that no
  longer matches the build.
- **A deferred wave gets postponed indefinitely.** The plan stays;
  the requirements doc still retires. Add a one-line "deferred
  waves preserved here" note at the top of the plan so the next
  reader knows it's reference, not active scope.
- **Multiple features bundle.** Each gets its own requirements doc.
  Plans can be combined if the build is one branch.
