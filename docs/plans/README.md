# Plans — transient build artifacts

This directory holds **implementation plans** (`<feature>-plan.md`), one
per active build cycle. Each is self-contained: written so a fresh-context
build agent who has read the requirements + relevant subsystem docs can
execute it without seeing the conversation it came from.

⭐ **These are ENGINEERING requirements** — the counterpart to the
product doc in `../requirements/`. Load-bearing sections: **Grounding**
(verified, with paths), ⭐⭐ **Host placement** (which class carries
what — the largest single source of post-MR rewrites in this repo),
**Waves**, **Reachability wiring** (verb · affordance · data · boot),
and the **drive record** appended at build time.

Planning runs on **Fable** by project convention — the `planner` agent
at `.claude/agents/planner.md`, invoked by `/plan`.

⚠ A plan is a *living* document during the build: waves get marked
done, and a wave whose premise turns out wrong gets re-planned in
place. Keep it current.

They are **ephemeral** — always retired at the pre-merge sweep (see
[../workflow.md](../workflow.md)). Deferred-wave design intent does *not*
stay in a plan; it's extracted back into one or more slates under
`docs/slates/`. The directory is normally empty between cycles; this
README keeps it tracked.
