# Requirements — transient build artifacts

This directory holds **requirements docs** (`<feature>-requirements.md`),
one per active build cycle. They are *closed scope*: exactly what a build
will ship, agreed before planning starts.

They are **ephemeral** — always retired at the pre-merge sweep once the
feature merges (see [../workflow.md](../workflow.md)). The directory is
normally empty between cycles; this README keeps it tracked.

The permanent record of a built feature lives in `docs/subsystems/`; its
remaining design surface lives in a slate under `docs/slates/`.
