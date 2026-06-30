# Plans — transient build artifacts

This directory holds **implementation plans** (`<feature>-plan.md`), one
per active build cycle. Each is self-contained: written so a fresh-context
build agent who has read the requirements + relevant subsystem docs can
execute it without seeing the conversation it came from.

They are **ephemeral** — always retired at the pre-merge sweep (see
[../workflow.md](../workflow.md)). Deferred-wave design intent does *not*
stay in a plan; it's extracted back into one or more slates under
`docs/slates/`. The directory is normally empty between cycles; this
README keeps it tracked.
