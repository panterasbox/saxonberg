# Dossier slate — priors for a character who never lived them

> **Status: PARTIAL** — shipped 2026-09 (MR !248) →
> [identity.md](../../subsystems/identity.md)
> **Left:** Q2 the materialized trio (participation + influence still
> seed-and-fold; make `renownOf` derive) · Q3 a seeded condition's cause ·
> Q4 dossiers for organizations · Q5 converging char-gen's claim seeding
> **Size:** a tail

**Captured 2026-09-04**, out of the `/requirements` pass on the clinic
build, which walked into this problem at its first design decision and
could not get past it.

> **User: "the general problem is for values that are derived from some
> aggregate, that's fine for players but for NPCs you need a way to write
> some single document that tells you everything you need to know about
> the npc's history and what things *would* aggregate to if real records
> were modelled."**

**Read first:**
[cast-archetype-slate](../builds/cast-archetype-slate.md) — ⭐⭐⭐ **this slate is
its Change 2 given a home.** That slate reached the same missing axis from
the opposite direction (*"role is what you do, temperament is how you are,
and the missing axis is where you stand"*) and settled two things this one
inherits rather than re-argues: **standing is the INSTANCE**, and **the
minting archetype must be stamped on every seeded row**.

**Substrates:** [chronicle.md](../../subsystems/chronicle.md) (deed vs
claim — **the origin of the pattern**) ·
[trait.md](../../subsystems/trait.md) (its second adopter) ·
[advancement.md](../../subsystems/advancement.md) (§ *Competence is
expressed uniformly for players and NPCs* — where it is missing, and says
so) · [renown.md](../../subsystems/renown.md) ·
[participation.md](../../subsystems/participation.md) ·
[influence.md](../../subsystems/influence.md) (⚠ the three that are
booby-trapped) · [vitals.md](../../subsystems/vitals.md) ·
[behavior.md](../../subsystems/behavior.md) (the shipped seeding path) ·
[char-gen.md](../../subsystems/char-gen.md) (the player-side precedent) ·
[document-store.md](../../subsystems/document-store.md) (the closed
`DocumentKinds` vocabulary, if the answer is a document).

**Consumers waiting:** [medic-judgment-slate](../builds/medic-judgment-slate.md) /
the clinic build (a patient's history) ·
[health-vertical-slate](../builds/health-vertical-slate.md) ·
[npc-behavior-slate](../builds/npc-behavior-slate.md) ·
[llm-npc-design](./llm-npc-design.md).

---

*§ The problem, precisely · § The pattern already exists · § The scorecard — cut 2026-09-18, shipped → [identity.md § The problem it solves, § The dossier — evidence, never values, § The Compact stays players-only by ARITHMETIC](../../subsystems/identity.md); [advancement.md § Seeding a band](../../subsystems/advancement.md); [renown.md § Seeding an authored reputation](../../subsystems/renown.md). The open halves live in Q2 · Q3 · Q5 below.*

## ⭐⭐⭐ The join: this is cast-archetype's Change 2, given a home

*Shipped as the dossier → [identity.md § The dossier](../../subsystems/identity.md); the archetype half and the pointer axis stay with [cast-archetype-slate § Change 2](../builds/cast-archetype-slate.md); body claims are Q3. Kept: the vocabulary note.*

⚠ **A word collision worth heading off.** cast-archetype uses *"standing"*
in its plain sense — *where you stand*: what you hold, what happened to
you, who you are bound to. But **`standing` is a taken term** in this
codebase: it is the derived reputation figure a `standing` verb reports
and the political-influence stock consumes. Reading the two together
implies NPCs participate in the Compact's influence economy, which they do
not and should not (Grade 2). **This slate therefore says
"circumstance"** for cast-archetype's axis — *what is true of this person
that they did not choose*, which is that slate's own definition. The
rename is local to this document; cast-archetype keeps its word.

---

*§ What a dossier is · § The stamp requirement — shipped → [identity.md § The dossier — evidence, never values, § The archetype stamp](../../subsystems/identity.md). The shipped block is `archetype · prologue · competence · renown` (+ `dispositions` on `BehavedMixin`); the sketch's `history:` is Q3 and its `circumstance:` pointers are cast-archetype's Change 2.*

---

*§ The identity rung … § The victim mirror — shipped → [identity.md § The two rungs, § Promotion is an authoring act, § Who answers for you](../../subsystems/identity.md); [accountability.md](../../subsystems/accountability.md) (the `getIdentityPath()` re-key, #42, `institutionRecordFor`); [mortality.md § A corpse's own identity](../../subsystems/mortality.md) (#40: deceased + moment). Superseded: the `ParcelApi.ownerOf` third tier (dropped — `Employed.ts` § Why there is no parcel tier) and the identity-projection mechanism (already self-marked). Graduated: the `Extra`-not-prop naming and the one-thing class difference → identity.md § The two rungs.*

---

*§ The falsifiability property — shipped as `pnpm lint:dossiers` (assert-vs-derive, `Competence.seedRunFor` run for real; renown checked at seed time) → [identity.md § The three gates](../../subsystems/identity.md).*

---

*§ A shipped defect — shipped as `pnpm lint:dispositions`; `candor`/`warmth` were real gaps and were added, `greed`/`gregariousness` renamed → [trait.md](../../subsystems/trait.md).*

---

## Non-goals

- **Retro-fitting histories onto the existing cast.** The substrate first;
  authoring 41 dossiers is a content pass. → a follow-on content pass.
- **A stat-block editor.** If the dossier ever grows a field that is read
  directly rather than seeded, the design has failed. → nowhere,
  deliberately.
- **Player dossiers as an authoring surface.** Char-gen already seeds
  claims for players and that path stays as it is; whether the two
  converge is an open question below, not a goal.
- **Reworking `accountability` around extras.** The victim mirror (§ the
  identity rung) is named there and settled with Q0; the ledger's own
  keying is not this build's to change. → `accountability.md` + Q0.
- **LLM-generated backstory.** Adjacent and tempting; the dossier is the
  artifact such a thing would *write*, not part of this build. →
  [llm-npc-design](./llm-npc-design.md).

---

## Open questions

0. Resolved 2026-09 — both attribute to the institution, as a SECOND derived attribution beside `directedBy`; the accountability producers now key on `getIdentityPath()` → [identity.md § Who answers for you](../../subsystems/identity.md), [accountability.md](../../subsystems/accountability.md).
1. Resolved 2026-09 — a block on the row (`CastMixin`'s `archetype · prologue · competence · renown` fields) → [identity.md § The dossier](../../subsystems/identity.md). *Revisit only if a dossier must be edited independently of its row (a CMS surface).*
2. ⚠ **STILL OPEN — the build took seed-and-fold.** `RenownApi.seedTo`
   appends evidence and schedules a **debounced** recompute (33 characters
   seeding at boot produce one fold). Participation and influence stay
   untouched, so their share of the trap stays somebody else's. The honest
   fix below is unchanged, and the warning still lives in three docs.

   **The materialized trio — seed-and-fold, or make them derive?**
   Triggering a recompute after seeding is the cheap fix. Making
   `renownOf` derive from the log like `transcripts` does is the honest
   one, and would delete a warning that is currently copy-pasted into
   three docs. Cost unknown; the boot-warmed map exists for a reason
   nobody has restated recently.
3. ⏸ **DEFERRED to the clinic by scoping** (plan § D3) — it is a third
   shape and the build that needs it should settle it.

   **Does a seeded condition need a cause?** The clinic wants *"you have
   to reason backwards to what you did"* — but a claim has `when = null`
   by construction, and an affliction's `symptomsAt` is exactly a *when*.
   A seeded illness may be a third kind: not a deed, not timeless
   backstory, but **an asserted event with an asserted time**. Settle
   before the clinic depends on it.
4. ⚠ **STILL OPEN.** ⭐ The build made it more answerable rather than
   less: a body of people now *has* a readable record
   (`institutionRecordFor` — what it lost, what it answers for), so the
   question narrows to whether it also gets an authored *history*.

   **Do businesses and organizations get dossiers?** A firm's standing is
   as derived as a person's, and *"never half-grown"* argues for one
   substrate. Probably yes; deliberately out of the first build.
5. ⚠ **STILL OPEN**, and unchanged by the build — the dossier seeder and
   `EmbodyController` both call `seedChronicleClaims` and neither knows
   about the other.

   **Where does char-gen land?** It already seeds chronicle claims from
   `char-gen.yaml`, which is one of the two existing homes. Converging it
   onto the dossier would unify the last fragment — or would drag a
   player-facing intake flow into a content-authoring build for no gain.

---

*Steps 1–4, 7 and 8 shipped (MR !248); step 5 is Q2 and step 6 is Q3, above.*
