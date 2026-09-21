# Slate compaction ledger — batch `race`

Slates: `docs/slates/tails/species-expansion-slate.md`,
`docs/slates/builds/species-slate.md`. Write-list: `docs/subsystems/race.md`
only.

Prior batches already graduated into `race.md` (checked before starting,
not contradicted): the `Species.getBaseMass()`/`getStature()` Size
section (textiles batch, Decision 6), the `Age is a DATE` section incl.
the healthspan handoff (unlinked-1 batch), the `lifespanMin/Max` inert-
on-purpose decision (already present pre-batch). None of those are
touched here except by reference.

---

## `docs/slates/tails/species-expansion-slate.md`  — 297 → 258 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- The `> First pass BUILT (2026-06-29…)` paragraph (26–37, 12 lines) —
  code: `packages/content/species-and-names/content/stuff/idea/species/
  animalia/.../homo/{trollius,ghulius,gnomus,semieldarinus,orcus,ogrus,
  koboldus,satyrus}.yaml` all exist; doc: `race.md § Species — capability`
  roster table (lines 516–522, 536–540) already states the same facts
  (who shipped, playable vs NPC-first, the content-pack migration).
  Replaced with a 4-line pointer to the canonical status block + the
  race.md table (kept the "personhood casts stay deferred" sentence,
  which is still true and not duplicated elsewhere).
- `## Casting calls so far` (200–210, 11 lines) — code: the two species
  rows exist with `# Katie's cast` / `# Dr. Vance's cast`-equivalent
  framing; doc: `race.md § Species — capability` roster table literally
  says "Katie's cast" / "Dr. Vance's cast" for `trollius`/`ghulius`
  (lines 536–537). One-line pointer left.
- `## How a species expresses mechanically` (212–229, 18 lines) — every
  named field (`_bodyPlanPath`, `_defaultMaterialPath`, `innateMixins`,
  `vitalProfile`, `lifecycleStates`, `reproductiveMode`, `circadianBand`,
  `diet`, `visionProfile`, `nameBankKeys`) is documented, more precisely,
  on `race.md`'s `Species` bullet list (lines 464–514) and cross-linked
  subsystem docs (`thermal.md` for the ecto/endotherm split,
  `mortality.md` for `lifecycleStates`). Pointer left.
- Open question **6** ("EU corner first") (245–247) — resolved: the
  canonical status block already states the first pass landed scoped to
  troll/ghoul. One-line "(resolved …)" note left.

### Superseded — cut
- `## What we have now (the gap)` (134–150, 17 lines) — by the shipped
  roster: this audited the PRE-expansion roster (8 `homo/` rows, 3
  non-homo tokens) as "the gap" motivating the palette below. The
  numbers are stale (roster grew to 16 `homo/` rows); the two facts that
  still hold (`sensitivus` is still a stub, the non-`homo` clades are
  still near-empty) are preserved in a 3-line note pointing at
  `race.md`'s current roster table as the accurate picture, rather than
  leaving stale numbers next to the new ones.

### Kept (UNBUILT)
- `## The principle: cast species by persona` (Doctrine — see below)
- `## The gate: recognizability (audience-relative)` (Doctrine)
- `## The allegory layer: stereotypes at a safe remove` (Doctrine)
- `## Why this is the who-counts canvas, not just flavor` (Doctrine)
- `## The casting palette (by bucket)` (152–198, whole) — mixed
  granularity: several named casts in this list shipped (Troll, Ogre,
  Gnome, Kobold, Satyr, Ghoul) but most did not (Minotaur, Golem, Oni,
  Goblin, Leprechaun, Gnoll, Imp, Centaur, Doppelganger, Werewolf,
  Succubus, Nymph, Kitsune, Fae, Vampire, Lich, Mummy, Zombie,
  Wight/wraith, Mind flayer, Gorgon, Naga, Djinni, Synth, Flesh golem,
  Clone, Uplift, Cyborg) — each bucket is one bullet line naming several
  creatures together; splitting below that would go under the paragraph
  floor the procedure sets, so the whole section stays as the live
  backlog it mostly still is.
- `## ⭐ DECIDED (2026-08-11) — no hybrid species`, whole (251–290) — the
  DECISION is made but the retirement is not executed: verified
  `packages/content/species-and-names/.../homo/{semieldarinus,
  semiorcus}.yaml` still exist, both still commented `Playable.`, and
  `race.md`'s roster table still lists both as ordinary Homo species
  with no retirement flag. Matches the status block's `Left` item
  verbatim — kept whole, not graduated (nothing shipped to graduate).
- `## Open questions / dials` 1–5 — all still open; verified no code
  gates NPC-only-vs-playable (the "playable"/"NPC-first" distinction is
  a YAML comment only, no field), no attuned-lineage species exists
  besides the `sensitivus` stub, `constructa` has only `tutor-bot`, the
  non-`homo` clades have no first sapient, and no spice-budget policy
  exists anywhere.

### Doctrine (kept, not in Left)
- `## The principle: cast species by persona`
- `## The gate: recognizability (audience-relative)`
- `## The allegory layer: stereotypes at a safe remove`
- `## Why this is the who-counts canvas, not just flavor`

### Uncertain — kept
- (none)

### Handoff (belongs in a doc outside my list)
- (none — nothing in this slate belongs to a doc outside `race.md`)

### Status block
- Status: PARTIAL → PARTIAL
- Left: unchanged in substance, but expanded to name the rest of the
  casting palette explicitly (the body's `## The casting palette`
  section was underrepresented by the old list) and to state plainly
  that the hybrid retirement and the attuned-lineage replacement are
  each still fully unexecuted (verified, not assumed)
- Size: a wave → a wave (unchanged — still JIT/opportunistic per the
  slate's own stated build order)

---

## `docs/slates/builds/species-slate.md`  — 260 → 245 lines · Status PARTIAL → PARTIAL

Verified against code (not the slate's own claims) via a full sweep for
each candidate difference: scent-based recognition/disguise-defeat
(`lib/belief/BeliefStore.ts`, `DisguiseGarment.ts` — no scent reference
at all), species-level toxin/staple intolerance (`Material.toxicity` and
`Condition.toxinBehavior` are keyed on the food/toxin, never on the
consuming species), body-shape-driven equipment incompatibility (all 10
playable humanoids + the 6 NPC-first ones share `_bodyPlanPath: biped`
with identical `slots`; only 3 body plans exist total), species without
Vocal/aether-only comms (`Character` composes `VocalMixin`
unconditionally; no species disables it), species-keyed illegible emotes
(`SoulMixin` composes identically on every Character), and the ectotherm
axis (no content anywhere authors `BodyPlan.thermalStrategy` — not even
the bullfrog, see Uncertain). Every "Left" item in the status block is
confirmed still fully unbuilt.

### Cut (SHIPPED · DOCUMENTED)
- (none directly — see Graduated below)

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `## ⭐ Hand-off from the consequence build (MR!254, 2026-09-10)`, the
  second bullet's `_parentCladePath`/`lifecycleStates` half (252–255,
  ~3 lines of the 20-line section) — code: `Species.ts`
  `getParentClade()`/`getLifecycleStates()` have zero external callers
  (grepped the whole `mud/` tree); `lifespanMin`/`Max`'s half of the
  same bullet was **already** documented verbatim in `race.md`'s
  "DECIDED — curves without lifespans" section pre-batch → inserted a
  new subsection `race.md § ⚠ Two more authored-but-unconsumed Species
  fields` (12 lines) covering the two undocumented fields, alongside a
  pointer that the lifespan half was already covered. Whole hand-off
  heading replaced with a 5-line pointer (below), since nothing was left
  under it once both bullets were resolved (one to race.md, one to
  Handoff).

### Superseded — cut
- (none)

### Kept (UNBUILT)
- `## The landscape — eight axes, all shipped` (table + text) — the
  *axes* (respiration/thermal/metabolism/senses/locomotion/slots/vitals/
  comms/emotes/magic/reserves/combat) are shipped substrate, already
  documented in their own subsystem docs; the *example differences* in
  the table (chokes on smoke, scent-dominant, cannot swim, cannot wear
  standard boots, no speech organs, illegible body language…) are the
  backlog itself and are what "Left" names. Kept whole — it's the
  slate's core content, not duplicate of anything.
- `## The candidates worth chasing`, all six subsections (ectotherm,
  scent-recognition, cannot-metabolise-a-staple, equipment
  incompatibility, no speech organs, illegible emotes) — verified
  UNBUILT (see sweep above)
- `## Open questions (for requirements)` 1–5 — verified still open: no
  code distinguishes NPC-only from playable species (it is a YAML
  comment, `# Playable.` / `# NPC-first.`, not a field), no per-species
  surface for a difference exists in char-gen or elsewhere, no species
  differentiates on the 12-axis table beyond `baseMass`/`stature`/
  `visionProfile`/`lifespanMax`/`facultyProfile`/`circadianBand` +
  cosmetic `olfactoryProfile.acuity` (which has no mechanical
  consequence — see Uncertain), and no player-facing ectotherm exists.

### Doctrine (kept, not in Left)
- `## The governing rules`, all five subsections (difference-that-costs,
  incomparability, the quality criterion, interdependence, prejudice-
  lives-in-the-beholder)
- `## ⚠ The worked example: blood type, and a rule restated` — verified
  no `bloodType`/`BloodType` field exists anywhere in the codebase, so
  this is pure illustration of the governing rule, not a masked backlog
  item
- `## ⚠ What to refuse`

### Uncertain — kept
- `### ⭐⭐⭐ The ectotherm — and it already ships` — the section text
  claims *"The bullfrog is authored as an ectotherm with distinct
  bands."* This is **false as stated**: no content anywhere authors
  `BodyPlan.thermalStrategy` (grepped every `.yaml` under
  `packages/content`), so the bullfrog defaults to `endotherm` like
  every other body plan. The underlying mechanism (`thermalStrategy`,
  `ThermalRegulationMixin`'s ecto/endo branch) is real and shipped —
  only the claim that it's *already authored* on a species is wrong.
  Kept verbatim per the no-rewrite rule (a slate's own sentences aren't
  mine to correct); flagged so requirements doesn't inherit the false
  premise that a worked ectotherm example exists to build from.

### Handoff (belongs in a doc outside my list)
- → `combat-hooks.md` or `combat.md` § the species vocabulary /
  `NaturalAttack.difficultyFor`: the first MR!254 hand-off bullet,
  verbatim:

  > ⭐⭐ **A `Species` contest band for beasts.** The build needed a
  > difficulty for fighting an animal and derived it from the **body** —
  > mass, reach, natural-attack profile — rather than authoring a tag
  > (`NaturalAttack.difficultyFor`). That is the right default and it
  > should stay the default. What it cannot express is a species that is
  > harder or easier than its body implies (a thing that is *cunning*, a
  > thing that is *docile*), which is an authored band the derivation
  > yields to. ⚠ It must not become the ordinary path: the whole point
  > of deriving is that a new animal is one row with no tuning.

  Verified still undocumented: `combat-hooks.md § the species vocabulary`
  documents `naturalAttacks[]`/`deriveProfile` thoroughly but never
  mentions `difficultyFor` or this "don't make the authored band the
  ordinary path" caution.

### Status block
- Status: PARTIAL → PARTIAL (unchanged — verified accurate, not assumed)
- Left: unchanged — every item independently confirmed still fully
  unbuilt against code (see sweep note above)
- Size: a build → a build (unchanged)

---

## Coordinator (2026-09-20) — handoff applied

- `combat-hooks.md § the species vocabulary` — the contest-band bullet
  inserted after *The derived natural profile* (verified
  `lib/combat/NaturalAttack.ts:227`).
