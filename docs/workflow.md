# Workflow

How feature work moves from product idea to merged code in this repo.
This is the source of truth; the skills under `.claude/skills/` are
thin entry points that load this doc and set posture for one phase.

## Artifact taxonomy

Four kinds of doc artifact, each with a distinct lifetime.

| Artifact | Location | Lifetime | Purpose |
|---|---|---|---|
| **Slate** | `docs/slates/<topic>-slate.md` | Long — survives many builds; retired only when fully absorbed | Product-backlog design surface; exploratory but well-developed |
| **Requirements** | `docs/requirements/<feature>-requirements.md` | One build cycle; retired at sweep | Formal, agreed scope for one build |
| **Plan** | `docs/plans/<feature>-plan.md` | One build cycle; retired at sweep unless deferred waves are preserved | Implementation spec a fresh build agent can execute against |
| **Subsystem** | `docs/subsystems/<name>.md` | Permanent | Live reference for how the subsystem works once built |

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

**Output.** A formal requirements doc at
`docs/requirements/<feature>-requirements.md` that the user and
Claude both agree on. Closed scope, no open questions left for the
planner.

**Skill.** `/requirements` — sets posture, loads the slate(s), keeps
the requirements doc in the canonical shape.

### 2. Requirements → plan

**Inputs.** The agreed requirements doc.

**Activity.** Hand the requirements doc to the `Plan` subagent to
produce an implementation plan. Iterate on the plan with the user
until every implementation detail is acceptable.

**Output.** A plan at `docs/plans/<feature>-plan.md` that drives a
fresh-context build agent.

**No skill.** This phase is thin — invoking the `Plan` subagent with
the requirements doc as input is one call. Iteration is conversational.

### 3. Clear context → build

**Activity.** Clear context. Fresh agent reads the plan (and any
subsystem docs the plan references). Implement.

**Output.** Code commits on the feature branch:
- `feat(<area>): <substrate-name>` — main implementation
- Smaller `feat/refactor/fix(<area>):` commits for sub-pieces

**No skill.** A good plan is self-bootstrapping; the user opens a
fresh session, points at the plan path, and the build proceeds.

### 4. MR review iteration

**Inputs.** GitLab merge request (`panterasbox/saxonberg!<n>`) with
inline comments from the user.

**Activity.** Fetch open comments. For each, either resolve in code
or push back in-thread. Re-fetch as the user adds more. Loop until
no open comments remain.

**Output.** Commits in the shape:
- `refactor(<area>): address MR comments (<short summary>)`
- `refactor(<area>): MR round <n> — <short summary>`

**Skill.** `/mr-iterate` — fetches comments via the GitLab MCP,
tracks open vs. resolved, keeps comment-resolution discipline.

### 5. Final branch sweep

**Activity.** Two-part pre-merge audit:

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

**Activity.** Merge the MR. Clear context.

**Output.** Merge commit on `master`.

**No skill.** One button.

## Branch & commit conventions

Observed from the recent history (`spawn-save`, `spacial`, `glob`,
`stuffref`, `activity`, `response`, `loco`):

- Branch name is a short slug for the feature.
- Commit prefixes follow Conventional Commits with the area in
  parentheses: `feat(spawn): …`, `refactor(zone): …`,
  `docs(activity): …`, `fix(ref-shapes): …`.
- MR iteration commits read `refactor(<area>): address MR comments`
  or `refactor(<area>): MR round 2 — <thing>`.
- The pre-merge sweep reads `docs: pre-merge sweep for the
  <feature> build` and may be a single combined commit when code
  and docs are tightly coupled, or split when the doc sweep stands
  alone.
- Plan + requirements retirement reads `docs: retire <feature>
  plan and requirements` when standalone.

## Where the skills come in

| Phase | Skill | What it does |
|---|---|---|
| 1 — Ideation → requirements | `/requirements` | Loads slate(s); enforces requirements-doc shape; ends with the artifact written |
| 2 — Requirements → plan | *(none)* | Hand the requirements doc to `Plan` subagent directly |
| 3 — Build | *(none)* | Fresh context reads the plan |
| 4 — MR iteration | `/mr-iterate` | Fetch comments, work through them, track resolution |
| 5 — Sweep | `/finalize` | Branch-wide code+doc sweep, retire ephemerals, commit |
| 6 — Merge | *(none)* | User merges |

The skills are entry points only. The shape of each artifact and the
retirement rules live in this doc; skills load it and run.

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
