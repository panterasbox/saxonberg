# Clinical medicine — blood, the operating table, and the two hands of care

> **Status: UNBUILT — scoped 2026-09-24** — the umbrella for the next
> physiology-thread build, downstream of recovery (MR !278). Pulls together
> [blood-slate](./blood-slate.md) (the deep blood design) and the surgery
> thread (re-pitched here toward concrete operations, not the theatre as a
> concept), and adds the nurse/doctor profession split.
> **Left:** all of it — three coupled legs (blood · operations · the two
> professions) plus a filing pass.
> **Size:** a build. Physiological, combat-relevant, kernel-led with a
> `trade-medicine` tail.

The recovery build made a body that heals and a clinic that treats. It left
two holes it deliberately did not fill: a **rupture bleeds you out with only
a one-tick field `operate` to stop it**, and **lost blood only comes
part-way back by rest** (`PLASMA_RESTORE_CEILING_FRAC = 0.85`, held on
purpose). This build fills both — blood you can give and receive, and
operations that are real procedures — and in doing so splits the medical
trade into the two professions it has always implied.

---

## The thesis

> ⭐⭐⭐⭐⭐ **Blood is the resource a body runs out of, an operation is the
> act that spends it to save it, and the two hands at the table — the doctor
> who intervenes and the nurse who keeps you alive while it happens — are
> different practices, not one job at two skill levels.**

Three claims that make this one build, not three:

1. **Blood + operations are the same loop.** An operation costs blood; a
   fighter loses blood; transfusion is the counterplay that buys the time to
   finish. Build either alone and it is half a mechanic. The combat payoff —
   a medic with compatible blood on hand keeps a bleeding fighter in the
   fight — is the reason blood matters here and not just in a clinic.
2. **Surgery is a *catalogue of operations*, not a theatre.** We are
   **not** building the abstract operating-theatre/team meta as a system
   (user direction, 2026-09-24). We are building concrete operations, each a
   gameplay loop with real inputs and a real during-state. Anaesthesia,
   asepsis and instrument grade enter as **per-operation inputs**, not as a
   designed subsystem.
3. **Nursing is its own Discipline.** Recovery already shipped the seam:
   the **carer** (continuous presence that buys recovery *rate*) versus the
   **treater** (the episodic intervention). Care is a genuinely different
   competency from diagnosis and surgery, and a nurse should advance *as a
   nurse* on the axis recovery already made valuable.

---

## What already exists (do not rebuild)

- **Blood as a vital** — `bloodVolume` (`lib/vitals`), drained by every bleed
  toward the exsanguination window ([harm.md](../../subsystems/harm.md)).
  Platform. The transfusion *door* does not exist yet.
- **The `PLASMA_RESTORE_CEILING_FRAC = 0.85` seam** (`Metabolic.ts`) — rest
  restores lost blood only part-way, ON PURPOSE, so transfusion has a reason
  to exist. ⚠ This build honours it: transfusion is how you close the last
  15%, not rest.
- **`operate`** (recovery, `trade-medicine`) — the one-tick field act that
  closes a rupture. The honest minimum; this build deepens it into the first
  row of the operation catalogue (durative, blood-costing, interruptible).
- **The carer/treater seam** — `TendingEngagement` + `_setCarer` (the nurse
  role, mechanically) vs `applyTreatment` (the doctor role). Already distinct
  in code; this build names them.
- **The `medicine` Discipline** (platform content) + `competenceBandFor` /
  `creditDeed`. The doctor's axis. No `nursing` Discipline yet.
- **The medical `Business`** — the Terminus infirmary, one `physician`
  position + roster + appointing authority. No nurse position, no blood bank.
- **[blood-slate](./blood-slate.md)** — the deep blood design (genotype/
  phenotype endowment, per-`Species` allele frequencies, the compatibility
  cost curve, screening, gift-credits, the blood-bank shortage economy). This
  umbrella takes the **combat/clinical core** from it and DEFERS the deep
  economy back to it (see Leg 1).
- **[medic-judgment-slate](./medic-judgment-slate.md)** — diagnosis as the
  graded act. Stays its own thread; this build consumes its `assess` surface,
  does not re-own it.
- **The `nurses.ts` brain** — currently used by the *physician* NPC. The
  naming already conflates the two roles; Leg 3 sorts it out.

> **Therefore what is genuinely new here is:** blood you can draw, store and
> transfuse (with type + a real incompatibility reaction); a catalogue of
> concrete operations over a durative, blood-costing `operate`; and the
> `nursing` Discipline + the nurse position that formalises the shipped
> carer seam — all filed into the right namespaces.

---

## Leg 1 — Blood (the combat spine)

**In this build:**
- **Blood type as a heritable endowment.** Platform, sits with species/race
  (per-`Species` allele frequencies, `untested` until tested). A `test` act
  learns your own type.
- **Compatibility + the incompatibility reaction.** Platform (harm/vitals).
  Wrong-type transfusion is a graded harm, not a lookup failure — the
  values/consequence hook. Non-hierarchical across species; a volume-expander
  floor (saline buys time without cells).
- **The acts:** `draw` (needle/kit → a blood unit), store (a blood unit as a
  `Bulkable`/`Contaminable` good with a shelf life), `transfuse` (the line →
  raises `bloodVolume`). `trade-medicine`, instrument-afforded like `operate`.
- **Donation as the supply.** Giving costs the donor's biological `Reserve`
  and reads on the body; rest brings it part-way back (the 0.85 seam).
- **The combat loop.** A bleeding fighter + a compatible unit on hand =
  transfusion buys survival/uptime. Blood as a carried, stockpiled,
  spend-under-pressure resource. This is the leg's reason to exist.

**Deferred (stays in [blood-slate](./blood-slate.md)):** the blood-**bank
economy** — the shortage summons, the recipient→donor loop, gift-only
chronicle/renown credits, formal screening programs, the disposition/trait
payoffs. Supply exists (draw→store→transfuse); the institution's *social
economy* is a later cut.

---

## Leg 2 — Operations (concrete, not the theatre)

**Deepen `operate`** from the one-tick stub into a **durative, interruptible
engaged step with a during-clock that consumes blood** — the patient keeps
bleeding while you work, so a severe case on a low-blood body is a race, and
transfusion (Leg 1) is the thing that buys you the time. Then a **catalogue
of operations**, each a row, not a new engine per operation.

**The row shape** (what makes an operation "game out"):
*the wound/condition it addresses · the instrument · the competence gate
(which Discipline, which band) · the blood it costs · the during-clock /
duration · the failure mode (interrupted, under-skilled, dirty field) · the
anaesthesia input (conscious vs not — pain and thrash if not).*

**The starting catalogue** (combat-adjacent; refine at requirements):
| operation | addresses | seam |
|---|---|---|
| **bleed control** | an arterial/heavy bleed still draining | the caustic "still-happening" during-model; the first thing a medic does |
| **foreign-body extraction** | an embedded round/blade/splinter | the injury→wound the ranged/combat build leaves |
| **amputation** | a limb too destroyed to save | ⭐ the clean seam to the future **prosthetics/augmentation** build — we do the REMOVAL (`severPart`, shipped), that build does the replacement |
| **rupture repair** | the internal bleed `operate` shipped for | deepen the shipped verb into row #1 |
| **compound-fracture setting** | a break that broke the skin | beyond a `splint`; the surgical version |

**Out (deferred):** the abstract theatre/team/anaesthesia *meta as a
system*. Anaesthesia is a per-operation input here, not a designed subsystem;
the surgical *team* (an assistant passing instruments, a dedicated
anaesthetist) is a richness a later build can add on top of the catalogue.
⭐ This is the deliberate re-pitch of the earlier surgery draft: operations
that game out, not surgery as a concept.

---

## Leg 3 — The two professions

- **`nursing` Discipline** (NEW, platform content) — advances on the **care**
  axis: the continuous carer loop recovery already made valuable (tend,
  dress, administer meds/blood, monitor, keep the field clean). A nurse
  advances by *keeping people alive and comfortable over time*, not by
  cutting. `creditDeed` on the tending acts.
- **`medicine` Discipline** (exists) — the doctor's axis: diagnose
  (`assess`/medic-judgment), operate (the catalogue), prescribe/dose, make
  the transfusion decision.
- **Two positions in the medical `Business`** — the infirmary gains a
  `nurse` position beside `physician`, each gated on its own Discipline; the
  business gains a blood-bank dimension (donation intake + a store of units).
- **Fix the conflation** — the `nurses.ts` brain currently drives the
  *physician*. Sort the brains: a nurse brain that tends/administers on the
  care axis, a doctor brain that diagnoses/intervenes.

⭐ The two roles are **complementary at the table**: the doctor operates
(spends blood, races the clock), the nurse keeps the patient alive during and
after (transfuses, tends, buys rate). This is the game's natural
two-person clinical scene, and it is combat-relevant (a field medic pair).

---

## Filing — the pass this build owes (your "file it correctly")

A first-class part of the build: put each piece in its honest namespace.

| layer | what lands there |
|---|---|
| **platform / kernel** (`lib/vitals`, `lib/harm`, `lib/race`) | how the body works: blood type (heritable), the transfusion *effect* on `bloodVolume`, the incompatibility *reaction*, blood loss during an operation |
| **platform content** (`Discipline/`) | the *skills*: `nursing` (new) + `medicine` (exists) |
| **`trade-medicine`** (pack) | the *acts*, instrument-afforded: `draw` · `transfuse` · `test` · the operation catalogue over a deepened `operate`; the needle / line / blood unit |
| **business + `employment`** | the *professions* + supply: the nurse & physician positions, the blood-bank dimension on the medical Business |

⭐ The test that keeps it honest: a second clinic (or a battlefield tent)
needs **zero pack code** — it is rows + positions. Biology never lives in the
pack; the pack only holds the acts and the instruments.

---

## Lens pass (`docs/design-lenses.md`)

1. **Pedagogy** — two Disciplines now exercised: `nursing` (care over time)
   and `medicine` (diagnosis + intervention). Blood-type compatibility is a
   real, derivable rule (a genuine ABO-shaped teachable, non-hierarchical
   across species). The operation catalogue teaches triage and sequencing
   under a bleed clock.
2. **Creative expression** — operations are authored rows; a second clinic
   is rows + positions; the ordinary case (stop a bleed) needs no code, the
   bespoke (a species-specific operation) is a row.
3. **Immersion & roleplay** — the two-hand clinical scene (doctor + nurse),
   the field-medic pair, the race against a bleed clock. Emerges from the
   sim, never a gauge.
4. **Values & self-improvement** — consent to operate (the unconscious
   emergency exception → [accountability.md](../../subsystems/accountability.md));
   the wrong-type transfusion as a real harm; who is licensed to cut (the
   College of Physic, [health-vertical](./health-vertical-slate.md)); giving
   blood as a cost borne for another.
5. **Technology & magic (epochs)** — blood transfusion and asepsis are
   modern markers; the arcane fork already exists (the `mend` spell). The
   dials (type known/unknown, anaesthesia available or not) sit per-operation,
   so one engine spans battlefield-crude to modern.
6. **Economy & governance** — blood as a produced/consumed resource
   (donation → store → transfuse); the surgeon and nurse as two scarce
   `employment` vocations; care priced by the shipped `labourIndexed` tariff.

---

## Collisions

- **recovery / harm.md** — `operate`, `applyTreatment`, the carer/treater
  seam, the bleed model, `severPart`, the 0.85 plasma ceiling. Build ON
  them; do not fork the treatment primitive.
- **[blood-slate](./blood-slate.md)** — this umbrella takes the combat core;
  the deep economy stays there. Keep them in sync.
- **combat / ranged** ([combat.md](../../subsystems/combat.md),
  [ranged.md](../../subsystems/ranged.md)) — the bleed-out that transfusion
  answers; foreign-body extraction addresses the wounds they leave; the field
  medic pair.
- **augmentation** ([augmentation-slate](../tails/augmentation-slate.md)) —
  amputation is the removal seam; that build owns the replacement
  (prosthetics). We stop at the stump.
- **[medic-judgment-slate](./medic-judgment-slate.md)** — diagnosis stays
  its own thread; we consume `assess`.
- **The infirmary Business** (Terminus) — gains the nurse position + the
  blood-bank dimension; a first venue, not a new place.
- **[mind-slate](./mind-slate.md) / [psychology-slate](./psychology-slate.md)**
  — mental health is explicitly OUT of this thread (less physiological). The
  only future bridge is combat trauma.

---

## Open questions (for requirements, not now)

1. **How many operations ship in v1?** The five above, or a tighter three
   (bleed control · extraction · rupture) with amputation/compound-fracture
   as fast-follows?
2. **Blood unit shape** — a `Bulkable` liquid good, a `Contaminable`
   (it can be tainted / go off), and a `Stackable` store? How much of the
   spoilage/contamination stack does a blood unit reuse?
3. **Species compatibility** — how far does cross-species blood go? Same-clade
   only, a graded penalty, or the volume-expander floor for all? (blood-slate
   has the cost-curve design.)
4. **Nurse vs doctor affordance boundary** — exactly which acts each
   Discipline gates. First cut: nurse = tend/dress/administer/transfuse/
   monitor; doctor = diagnose/operate/prescribe. Where does transfusion sit
   (both?).
5. **The during-clock's floor** — how deep before it becomes a dexterity
   minigame? Hold the line: a situation the sim resolves from honest inputs
   (skill, blood, field, anaesthesia, severity), never a twitch/QTE
   ([uncertainty.md](../../uncertainty.md)).

---

## Adjacent verticals — design-considered, deferred

- **Veterinary medicine** — NOT a separate trade and NOT a substrate
  question: the clinical substrate is **species-agnostic** (`VitalsMixin`
  on `Creature`, blood per-`Species`), so vet is a **Discipline branch**
  (`veterinary` under `health`) applying the same acts to an animal
  patient. The constraint that keeps it open: no medical act gates on
  personhood. Its own future slate; collides with husbandry/ranching/pets.
- **The pedagogy anchor (study.com / StudyWorld).** ⭐ Nursing here is the
  **NGN/NCLEX clinical-judgment cycle** (recognize cues → prioritize → act
  → evaluate), and it honours the teachability boundary — the sim teaches
  the **decision**, the real practicum owns the **motor** (phlebotomy/
  surgical hands), and study.com owns the **referent** (real pharmacology;
  our drugs are invented on purpose). A `nursing` competence is a portable
  Transcript row — the federation's transferable-competence promise. This
  is why nursing is a flagship StudyWorld vertical.
- **The SBAR handoff + the shift-long deteriorating-patient lab quest**
  (NGN Q5) — the **scenario layer** (eternal-university / demo /
  health-vertical), riding this build's two-role scene and worsening
  clocks. The build leaves the seam; it does not build the scenario.

## Cross-references

- [blood-slate](./blood-slate.md) — the deep blood design (deferred economy).
- [recovery-slate](./recovery-slate.md) — where `operate`, the carer/treater
  seam, `medicine`, and the 0.85 plasma ceiling shipped.
- [health-vertical-slate](./health-vertical-slate.md) — the College of
  Physic (who may cut), public health, the teaching theatre.
- [medic-judgment-slate](./medic-judgment-slate.md) — diagnosis (not this
  build's).
- [augmentation-slate](../tails/augmentation-slate.md) — the prosthetics the
  amputation seam feeds.
- [physiology-slate](./physiology-slate.md) — the body's function/intervention
  substrate.
- [harm.md](../../subsystems/harm.md) · [vitals.md](../../subsystems/vitals.md)
  · [mortality.md](../../subsystems/mortality.md) — the body.
- [advancement.md](../../subsystems/advancement.md) — the Discipline catalog
  (`nursing` is new here) · [employment.md](../../subsystems/employment.md) —
  positions · [reserve.md](../../subsystems/reserve.md) — the donation cost ·
  [race.md](../../subsystems/race.md) — heritable blood type.
- [design-lenses.md](../../design-lenses.md) — the six-lens pass above.
