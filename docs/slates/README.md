# Slates — the design backlog, sorted by what kind of work it is

**Looking for something to build?** Pick a folder by the kind of work,
then read its README: every slate in it, grouped **Unbuilt → Partial →
done?**, with its size and what is left — no need to open the slate.

| folder | pick it when you want |
|---|---|
| [tech-debt/](./tech-debt/README.md) | ⭐ refactors, sweeps, gates, performance, test tooling |
| [engine/](./engine/README.md) | a world system: body, senses, combat, movement, NPCs |
| [trades/](./trades/README.md) | an industry or a supply chain |
| [society/](./society/README.md) | governance, law, money, institutions, education |
| [world/](./world/README.md) | places, peoples, creatures, story |
| [client/](./client/README.md) | the UI |
| [platform/](./platform/README.md) | authoring tools, packs, hosting, integrations, the show |

Every slate carries a **status block** under its title:

```
> **Status: PARTIAL** — what shipped → [subsystem.md](…)
> **Left:** the named things that remain
> **Size:** a build · a wave · a tail
```

The folder READMEs and the table below are **generated** from those
blocks by `./tools/slate-index` — if a row is wrong, fix the slate's
block, never the README. (`--audit` reports blocks the generator cannot
read; `--check` fails when any index has fallen behind.)

**Status** — `UNBUILT` (nothing shipped) · `PARTIAL` (substrate shipped,
surface remains) · `ABSORBED` (nothing left; retired and deleted). A
slate marked `BUILT`/`SHIPPED` is a retirement candidate.

**Size** — `a build` (its own cycle) · `a wave` (rides another build) ·
`a tail` (small, opportunistic). Size is a column, not a folder.

⭐ **The folder is the KIND of work**, chosen when the slate is written
(2026-11-17). It replaced `builds/` and `tails/`, which sorted by size —
the one fact you cannot pick work by, and which went stale at every
sweep. A new slate goes in the folder whose README sentence describes
it; a slate that straddles two goes where its *first build* would land.

---

<!-- BEGIN GENERATED — ./tools/slate-index -->

**461 slates in 7 folders.** Open a folder: its
README lists every slate in it by status, with size and what is left.

| folder | what is in it | unbuilt | partial | done? | no block |
|---|---|---|---|---|---|
| [tech-debt/](./tech-debt/README.md) | refactors, sweeps, census-and-ratchet gates, performance, test tooling | 13 | 37 | 1 | 0 |
| [engine/](./engine/README.md) | the world's systems: bodies, senses, combat, movement, physics, NPCs, the command language | 50 | 71 | 3 | 3 |
| [trades/](./trades/README.md) | industries and their supply chains: what is made, from what, by whom | 28 | 57 | 4 | 0 |
| [society/](./society/README.md) | governance, law, money, institutions, education, faith, standing | 42 | 32 | 0 | 0 |
| [world/](./world/README.md) | places, peoples, creatures, lore and story content | 24 | 17 | 1 | 2 |
| [client/](./client/README.md) | the UI: cards, the shell, the map, rendering | 12 | 12 | 0 | 2 |
| [platform/](./platform/README.md) | authoring tools, packs, hosting, integrations, the show and the business | 27 | 23 | 0 | 0 |

<!-- END GENERATED -->

---

## Keeping this honest

- **At `/finalize`**, update the status block of every slate the build
  touched. A slate whose `Left:` is empty is `ABSORBED` — salvage any
  open question into the subsystem doc, then delete it.
- **Deferred design never lives in a plan.** Plans are execution
  artifacts and get deleted at the sweep; anything that outlives the
  build is extracted back here first. Three sections were rescued this
  way on 2026-09-06 — farming's Stage B (133 lines), farmstead's Tier 3
  criteria, and the apartment plan's deferred seams — all of which had
  been invisible to anyone reading the backlog.
- **Duplicate ground is the standing hazard.** Known pairs covering one
  subject from two ends: disease ↔ disease (pack) · recognition ↔
  identification · authored-vs-procedural ↔ spawn-distribution ↔
  discovery · argument-map ↔ forums · supply (pack) ↔ power-utility ·
  college ↔ education-integration ↔ eternal-university-narrative.
  Merge on contact rather than letting a third appear.

  ⭐ **The medicine cluster — reconciled 2026-09-15.** Six slates covered
  one subject and the index did not name them, which is how they drifted.
  Recorded here so the next reader inherits the boundaries rather than
  rediscovering them:

  | pair | resolution |
  |---|---|
  | physiology § 7e ↔ blood | ✅ **merged into blood** — physiology keeps the blood-loss *axis* (it is a vital sign); blood owns the substance, the compatibility graph and the donation economy |
  | health-vertical ↔ medic-judgment | ✅ **split by subject** — they gave *opposite* answers to "what is the diagnosis surface." medic-judgment owns the graded act (cues without names, the deed is the decision); health-vertical owns the world it is practised in (institutions, outbreaks, prevention, the vet track) |
  | physiology § 7b ↔ pharma | ✅ **already declared** — pharma cites physiology for the substance model and owns the industry (extraction, vessels, assay, vocations). No action; recorded so it is not "merged" by someone reading the two titles |
  | disease ↔ disease (pack) | ⏳ still open, listed above |

  ⚠ **The lesson worth keeping.** The health-vertical/medic-judgment pair
  was not two documents saying the same thing — it was one asking a
  question it called *"the vertical's defining design problem"* and the
  other having already answered it, six weeks apart, with neither citing
  the other. **A duplicate pair's real cost is not wasted words; it is
  that one half can be solved while the other half keeps paying for it.**
