# Dossier slate — priors for a character who never lived them

**Captured 2026-09-04**, out of the `/requirements` pass on the clinic
build, which walked into this problem at its first design decision and
could not get past it.

> **User: "the general problem is for values that are derived from some
> aggregate, that's fine for players but for NPCs you need a way to write
> some single document that tells you everything you need to know about
> the npc's history and what things *would* aggregate to if real records
> were modelled."**

> **Status: design conversation, captured. Not requirements.**

**Read first:**
[cast-archetype-slate](./cast-archetype-slate.md) — ⭐⭐⭐ **this slate is
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

**Consumers waiting:** [medic-judgment-slate](./medic-judgment-slate.md) /
the clinic build (a patient's history) ·
[health-vertical-slate](./health-vertical-slate.md) ·
[npc-behavior-slate](./npc-behavior-slate.md) ·
[llm-npc-design](./llm-npc-design.md).

---

## The problem, precisely

**Derive-on-read is the house style, and it is right.** Competence bands
derive from a Transcript of deeds. Trait positions derive from
`disposition_events`. Blame derives from `accountability_events`. Renown,
participation and influence derive from their logs. Wounds reconcile on
read. Nothing stores a number somebody could have set.

For a **player** that is honest all the way down: they accumulate real
events, so the aggregate is a true statement about a lived life.

For an **authored NPC there are no events at all.** So every aggregate
reads as its floor:

> **Dave the Barkeep is a novice bartender.** Odo the cook is a novice
> cook. Mara is a novice at the bar she runs. Every venue this project has
> shipped is staffed by people who read as having never done the job.

`advancement.md` states it in plain text rather than implying it:

> ⚠⚠ *"This is uniform EXPRESSION, not uniform authoring. Nothing writes
> an NPC's Transcript except combat … and **there is currently no way to
> state that Dave is good at bartending**."*

That is not a gap in one subsystem. It is the same gap in every subsystem
that derives, and each one is currently discovering it alone.

---

## ⭐ The pattern already exists — invented twice, homed twice

**Chronicle got there first**, and it put the answer in the *data model*
rather than in a convention:

| | `deed` | `claim` |
|---|---|---|
| what it is | something that happened | authored backstory |
| `when` | game-time seconds | **`null` — backstory has no timestamp** |
| `order` | `null` | the authored prologue order |
| `text` | rendered by `ProseApi` | authored |

`recordDeed` / `recordClaim` are separate calls, and every caller must
declare which — the kind does not survive as a default.
`seedChronicleClaims(seeds)` mints prologue entries at char-gen.

**Trait copied it** and wrote the principle down:

> *"Authored NPCs need their defining character immediately, but
> derive-don't-track means a fresh ledger is near-neutral. The resolution:
> **seed disposition evidence, not a stat.**"*

`BehavedMixin.dispositions: ClaimSeed[]` (persistent, `authorable`),
applied at `postRegister` through the host's own `seedTraitClaims`, **once**
— idempotent across re-clone and CMS go-live, because it skips if any
`claim` row already exists. Mara derives *reserved and temperate* from a
seeded history rather than from a slider.

### ⭐⭐⭐ The property that makes this safe, and it is the whole idea

The `claim` marker means **the derivation never has to pretend.** `bandOf`
stays a pure function over whatever evidence exists; it simply also knows
which evidence was asserted rather than lived. Nothing is overridden,
nothing is clamped, and no reader needs a special case.

That is why *"seed evidence, not a stat"* is not a stylistic preference.
A declared stat is a second source of truth that every future consumer has
to remember to consult. A seeded claim is the *same* source of truth with
its provenance attached.

---

## The scorecard — three grades of not-solved

Verified against the tree, 2026-09-04.

| aggregate | reads from | authored priors? |
|---|---|---|
| **chronicle** | `chronicle` ledger | ✅ `kind: 'claim'` + `seedChronicleClaims` |
| **trait** | `disposition_events` | ✅ `dispositions: ClaimSeed[]` on `BehavedMixin` |
| **advancement** | `transcripts` | ❌ **nothing** — named in the doc, unresolved |
| **vitals / conditions** | the affliction record | ❌ nothing; no backward pointer to a cause |
| **accountability** | `accountability_events` | ❌ nothing (derives, so it *could* seed) |
| **renown** | ⚠ the **`renown`** collection | ⚠⚠ seeding the log is a **no-op** |
| **participation** | ⚠ materialized | ⚠⚠ same |
| **influence** (producer) | ⚠ materialized | ⚠⚠ same |

### Grade 1 — simply missing

Advancement and vitals. Advancement even names the fork it could not
settle: an authored competence could be **declared** as a floor `bandOf`
maxes against, or **seeded** as synthetic Transcript rows — *"which differ
on whether `bandOf` stays a pure derivation over real evidence, a property
this whole subsystem leans on."*

⭐ This slate's position: the chronicle/trait precedent already answered
that fork, and answered it **seed**. The reason a floor felt necessary is
that nobody had the claim marker in view.

### Grade 2 — ⚠⚠ actively booby-trapped

`RenownApi.renownOf` reads `RenownStanding.cached()`, an in-memory map
warmed at boot from the **`renown` collection** — the *materialized*
standings. It does **not** read `renown_events`. So writing rows into the
log changes nothing until a recompute folds them, and a bare restart
re-warms from a collection the seeding never wrote.

The warning is copy-pasted verbatim into **three** subsystem docs, and it
is there because it cost a whole live drive:

> ⚠ *"This is the trap that made a correctly-seeded character still read
> `dormant` through a whole live drive of the S1 build."*

A recompute does exist (`RenownLogic`, on a real-time `ScheduleApi`
cadence). What is missing is that seeding does not trigger it, and boot
does not re-derive.

### Grade 3 — fragmented

Even where it works, it works twice in two places: chronicle claims are
seeded from `char-gen.yaml`, trait claims from a field on the NPC row.
**Two homes for one idea — and a third adopter would invent a third.**
That is the fragmentation the provocation is objecting to, stated
structurally.

---

## ⭐⭐⭐ The join: this is cast-archetype's Change 2, given a home

The cast-archetype slate ran the whole 41-character cast through
`role × temperament` and found the residue:

> *"Everything the model misses is **what is true of this person that they
> did not choose**. Role is what you do, temperament is how you are, and
> the missing axis is **where you stand**."*

with the proof that it is load-bearing: **Jory Hocking and Bia Rovere
compile to an identical profile** — Publican × Connector — and are not the
same person, because Jory holds the slate and Bia does not.

And its resolution:

> ⭐⭐ **Role and temperament are the ARCHETYPE. Standing is the INSTANCE.**

It then made standing **three pointers into shipped registries** — history
→ a chronicle prologue ref; holdings → a title or a seat; relationship → a
bond — explicitly so the archetype would not become a dumping ground.

**That is exactly right and it is not enough.** Pointers work for the
three axes that already have a registry to point *at*. They do not cover:

- **competence** — there is no registry of "Dave is good at bartending" to
  point at; the Transcript is the registry, and it is empty;
- **the body** — a scar, a healed break, a bout of something years ago;
- **the materialized trio**, where a pointer resolves to a figure that the
  seed never moved.

> **So: the archetype says who this kind of person is. The dossier says
> what this particular one has been through — including the parts no
> registry is holding yet.**

The two are one build's worth of design and should be settled together.
This slate is the standing axis; that slate is the archetype axis; and
[the stamp requirement](#the-stamp-requirement) below is shared.

---

## What a dossier is

**One authored artifact per character** holding every prior that any
derive-on-read aggregate needs, expressed as **seeded evidence carrying
the `claim` marker** — never as declared values.

Sketch, deliberately not a schema:

```yaml
# the standing axis — what is true of Dave that Dave did not choose
prologue:                    # → chronicle claims
  - "Kept the Rejection bar through the bad winter."
competence:                  # → transcript claims
  - { discipline: bartending, asserting: competent }
  - { discipline: mixology,   asserting: practised }
history:                     # → condition / body claims
  - { condition: healed-fracture, part: left-wrist, era: "long ago" }
standing:                    # → pointers, per cast-archetype Change 2
  holdings: [ /world/rejection/parcel/bar ]
  bonds:    [ { to: /world/rejection/agent/mara, kind: employs } ]
renown:                      # → seeded events AND a fold, see below
  - { scope: rejection, asserting: known }
```

Four properties that matter more than the shape:

1. **Evidence, not values.** Each entry expands into the same rows a lived
   history would have written, marked `claim`.
2. **Idempotent, once.** The `dispositions` precedent exactly — applied at
   `postRegister`, skipped if claims already exist, so re-clone and CMS
   go-live cannot mint a second history.
3. **It states its intent.** `asserting: competent` is the author saying
   what this *should* read as. Which makes it checkable — see below.
4. **It is not the row.** The row says what the character *is*; the dossier
   says what they *have been*. Whether that is a separate document or a
   block on the row is [an open question](#open-questions), not settled
   here.

### <a id="the-stamp-requirement"></a>⚠⚠ The stamp requirement, inherited

From cast-archetype, and it applies to every kind of seed this slate
introduces, not only dispositions:

> *"To compute deviation from archetype, a seeded row must record **which
> archetype minted it**. `DispositionEntry` today carries `kind: 'claim' |
> 'deed'` — enough to separate authored from earned, **not enough to
> separate archetype-claim from deviation-claim**. … Stamp the minting
> archetype on the row. It costs one field now and is unrecoverable
> later."*

⭐ And the reason it generalizes: *an authored deviation and an earned
drift are the same quantity*, differing only in when they were written and
by whom. `deviation = current derived position − archetype baseline` is
computable for competence and standing exactly as it is for dispositions —
but only if the seams survive. Provenance separability is the one property
that cannot be retrofitted; unwinding a sum with no seams is not possible
later at any price.

---

## ⭐⭐ The falsifiability property — the best thing in the provocation

> *"…and what things **would** aggregate to if real records were
> modelled."*

That phrasing is the design. A dossier is not setting a reading; it is
asserting **a history that was not simulated**, from which the reading
derives exactly as it would from lived events. Which means the author's
intent and the engine's answer are two independently computable things —
so they can be **compared**:

> **`pnpm lint:dossiers`** — for every dossier that says
> `asserting: competent`, seed it and check the derived band actually
> comes out `competent`.

This is the census-then-ratchet shape, and it is doing real work rather
than tidying:

- it catches an author who wrote three claims where the band needs
  thirty — the silent-underseed failure;
- it is the only thing that stops a dossier drifting back into a stat
  sheet, because a declared value cannot disagree with itself and a seeded
  history can;
- ⚠ it is the natural home for the **materialized trio's** trap: a
  dossier that asserts `known` and derives `dormant` fails the lint, which
  is precisely the S1 drive's silent failure turned into a build error.

The nearest precedent is `lint:topics`, which found 45 of 105 emitted
topics had no authored descriptor.

---

## ⚠⚠ A shipped defect this space already contains

Independent of everything above and **shippable alone** — recorded here so
it is not lost, and credited to the cast-archetype stress test:

Five uses of four `disposition:` keys in shipped content resolve to no
axis in the closed 17-axis `DISPOSITION_AXES` (`greed`, `gregariousness`,
`candor` ×2, `warmth`). `DISPOSITION_KEYS` is exported but nothing on the
seeding path validates against it, so **five authored personality traits
are almost certainly being dropped silently.**

⭐ Fix is `pnpm lint:dispositions`, ~20 lines. ⚠ But decide first whether
`candor` and `warmth` are typos or a real gap in the 17 axes — the answer
changes whether the fix is a rename or an addition. **This is the same
failure mode this whole slate is about**: authored intent that no reader
consumes, failing closed and silent.

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
- **LLM-generated backstory.** Adjacent and tempting; the dossier is the
  artifact such a thing would *write*, not part of this build. →
  [llm-npc-design](./llm-npc-design.md).

---

## Open questions

1. ⭐ **One document, or a block on the row?** The provocation says
   *"single document"*. A block keeps one file per character and matches
   how `dispositions:` already works; a `DocumentKinds` entry (the closed
   registry — `archetype` is the recent precedent) is separable,
   reviewable, and could serve players too. ⚠ Note the hazards are
   *identical* either way: cast-archetype's deed-row hazard says a
   prologue attached on a **template** key would be read by every sibling
   instance and survive every re-mint, so **standing is cast-only and must
   be enforced rather than assumed** — a document keyed by path has
   exactly the same problem.
2. **The materialized trio — seed-and-fold, or make them derive?**
   Triggering a recompute after seeding is the cheap fix. Making
   `renownOf` derive from the log like `transcripts` does is the honest
   one, and would delete a warning that is currently copy-pasted into
   three docs. Cost unknown; the boot-warmed map exists for a reason
   nobody has restated recently.
3. **Does a seeded condition need a cause?** The clinic wants *"you have
   to reason backwards to what you did"* — but a claim has `when = null`
   by construction, and an affliction's `symptomsAt` is exactly a *when*.
   A seeded illness may be a third kind: not a deed, not timeless
   backstory, but **an asserted event with an asserted time**. Settle
   before the clinic depends on it.
4. **Do businesses and organizations get dossiers?** A firm's standing is
   as derived as a person's, and *"never half-grown"* argues for one
   substrate. Probably yes; deliberately out of the first build.
5. **Where does char-gen land?** It already seeds chronicle claims from
   `char-gen.yaml`, which is one of the two existing homes. Converging it
   onto the dossier would unify the last fragment — or would drag a
   player-facing intake flow into a content-authoring build for no gain.

---

## Build shape (sketch)

Ordered so each step is independently landable and the riskiest question
is settled by evidence rather than argument.

1. **`lint:dispositions`** — the shipped defect above. Twenty lines, no
   dependencies, and it proves the "authored intent nobody reads" failure
   is real before the slate spends a build on it.
2. **The seed spine** — one applier, the `dispositions` shape generalized:
   idempotent, `postRegister`, `claim`-marked, **archetype-stamped**.
3. **Competence claims** — advancement's unresolved fork, settled *seed*.
   The first consumer is Dave, and the acceptance is that he reads as good
   at bartending to a player who asks.
4. **`lint:dossiers`** — assert-vs-derive. Gate today's count as the
   ceiling; a later pass drives it to zero.
5. **The materialized trio** — whichever limb Q2 takes.
6. **Body/condition claims** — the clinic's slice, once Q3 is settled.

⭐ Steps 1–3 are the build; 4 is what keeps it honest; 5–6 are the
consumers. The clinic build waits on 6 and should not start before Q3 is
answered.
