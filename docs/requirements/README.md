# Requirements — transient build artifacts

This directory holds **requirements docs** (`<feature>-requirements.md`),
one per active build cycle. They are *closed scope*: exactly what a build
will ship, agreed before planning starts.

⭐ **These are PRODUCT requirements.** What a person can now do and why;
which trade or pack owns it; what it collides with in the existing
world; the drive script; acceptance observable from outside the code.
The **engineering** half — grounding, which class carries which field,
waves, wiring, tests — is the plan's, in `../plans/`. If a sentence
here names a class, a file or a method, it belongs there instead.

They are **ephemeral** — always retired at the pre-merge sweep once the
feature merges (see [../workflow.md](../workflow.md)). The directory is
normally empty between cycles; this README keeps it tracked.

The permanent record of a built feature lives in `docs/subsystems/`; its
remaining design surface lives in a slate under `docs/slates/`.
