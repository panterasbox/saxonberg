# Clinical medicine — requirements

**Kind:** feature
**Leads from:** kernel (kernel-led). First consumers: the Terminus
infirmary (gains a nurse, a blood bank, and the new acts) and
combat/the delve (the bleed→transfuse loop; penetrating wounds for
extraction).

Downstream of recovery (MR !278), this is the clinical-medicine
vertical: **blood you can give and receive, operations that are real
procedures with follow-up, and the two professions — the nurse who
keeps you alive over time and the doctor who intervenes and
prescribes.** Executes `docs/slates/builds/clinical-medicine-slate.md`,
pulling the combat/clinical core from `blood-slate` and a thin drug
slice ahead of `pharma-slate`.

## What already exists

- **Blood as a vital** — `bloodVolume`, drained by every bleed toward
  exsanguination (harm/vitals). No draw/store/transfuse door.
- **`PLASMA_RESTORE_CEILING_FRAC = 0.85`** — rest restores lost blood
  only part-way, on purpose, so transfusion has a reason to exist.
- **The medical acts shipped by recovery:** `treat`/`dress`,
  `undress`, `dose`, `cool`/`warm`, `tend`, `assess`, and (trade-
  medicine) `operate` (the one-tick rupture stub) + `splint`.
- **The carer/treater seam** — a continuous carer that buys recovery
  *rate* vs the episodic treater. The mechanical nurse/doctor split,
  unnamed.
- **`dose` + Material-tag actives** — the antivenin exemplar (a
  substance with a tag, administered by `dose`). The thin drug slice
  rides this.
- **The `medicine` Discipline**; the Terminus infirmary as a `Business`
  (one `physician` position, roster). No `nursing` Discipline, no nurse
  position, no blood bank.
- **`sew`** (trade-tailoring) — cloth, tailoring Discipline. Distinct
  from suturing flesh.
- **Autarky-relevant sources already in the world:** `salt-water` (the
  saline floor), `willow`/Salix alba (analgesic), flax→linen
  (dressings/thread), smithing (needles/kits).
- **Slates in the space:** `blood-slate` (deep blood economy, deferred),
  `pharma-slate` ("the first credence good" — the full drug economy,
  deferred), `medic-judgment` (diagnosis), `health-vertical` (public
  health/College of Physic), `mind`/`psychology` (mental health).

**Therefore what is genuinely new here is:** blood typing + the
incompatibility reaction + `draw`/store/`transfuse`; a foreign-body
wound; the durative operation + the operation catalogue; suturing +
the follow-up-care loop; the `nursing` Discipline + nurse position;
and the `prescribe`(doctor)→`administer`(nurse) authority split over a
thin drug slice.

## Goals

- A body's **blood type** is a heritable fact it can learn (`test`), and
  transfusing **incompatible** blood is a real, graded harm.
- Blood can be **drawn** into a stored unit, kept until it **spoils**,
  and **transfused** to raise `bloodVolume` — with an untyped **saline
  volume-expander floor** for emergencies.
- **Donation draws on a biological reserve** that regenerates over time;
  the combat loop (a bleeding fighter + compatible blood = survival) is
  playable in the field.
- ⭐ **The blood loop is completable in autarky** — a solo player can be
  their own donor: `test`, `draw` into a vessel they own, store it,
  replenish enough capacity, and carry it into danger, all before it
  spoils. Tight, not free; physically possible without trade. (The
  *economics* of autarky stay bad — that is intended and separate.)
- **Operations are real procedures**: `operate` becomes a durative,
  interruptible act that **consumes blood while it runs** (so a severe
  case on a low-blood body is a race transfusion can win). A catalogue
  of five: bleed control, foreign-body extraction, amputation, rupture
  repair, compound-fracture setting.
- **Suturing** closes a laceration too big for a bandage (a nursing act,
  a suture kit), and **must be followed up** — stitches come out once
  the wound knits; operations leave a post-op wound that follow-up care
  advances. The notify alarm flags when a follow-up is due.
- **Two professions, two Disciplines:** `nursing` (the care loop —
  tend, dress, `draw`, `transfuse`, `administer`, monitor, suture,
  follow-up) advances as its own thing; `medicine` (diagnose, operate,
  `prescribe`, the cross-match decision) is the doctor. **Prescribing is
  the doctor's (MD's) power; administering is the nurse's.**
- Each thin-slice drug (**anaesthetic, antibiotic, analgesic, saline**)
  has a **local, autarky-completable source** and is administered by
  `dose` under a doctor's `prescribe`.

## Non-goals

- **The full pharma economy** — pharmacopoeia breadth, extraction as a
  process, assay/the credence-good trust mechanics, the apothecary/
  assayer vocations, the illicit branch, recall records → **`pharma-
  slate`** (this build seeds it a thin slice on the shipped `dose`/tag
  substrate; pharma is its first real consumer).
- **The blood-bank social economy** — shortage summons, gift-only
  renown/chronicle credits, formal screening programs, disposition
  payoffs → **`blood-slate`**.
- **Mental-health features** (talk therapy, mental conditions, the
  psychologist) → **`trade-psychology` / `mind-slate` / `psychology-
  slate`**. ⭐ Only the **psychiatry seam** lands here: prescribing is an
  MD power, so a future psychiatrist (an MD specialization) attaches to
  it — no mental-health content now.
- **The surgical-team / operating-theatre meta as a system** (a
  dedicated anaesthetist, an instrument-passing assistant, asepsis as a
  designed subsystem) → deferred; anaesthesia is a per-operation drug
  input here, not a subsystem.
- **Prosthetics / limb replacement** → **`augmentation-slate`**.
  Amputation (the removal) is in scope; the replacement is not.
- **The economics of autarky** (whether self-sufficiency pays) →
  emerges from the general economy; this build only guarantees the loop
  is *physically* possible.

## Placement

- **Biology → platform kernel** (`lib/vitals`/`lib/harm`/`lib/race`):
  blood type (heritable), the transfusion *effect* on `bloodVolume`, the
  incompatibility *reaction*, the foreign-body wound, blood loss during
  an operation, the donation reserve.
- **Skills → platform content** (`Discipline/`): `nursing` (new),
  `medicine` (exists).
- **Acts → `trade-medicine`**: `draw`, `transfuse`, `test`, `suture` (+
  removal), `prescribe`, the operation catalogue over a deepened
  `operate`; the instruments (suture kit, blood vessel, syringe).
- **Professions + supply → business + `employment`**: the nurse &
  physician positions and the blood-bank dimension on the medical
  `Business`; the thin drug actives as `trade-medicine` content (the
  antivenin precedent), with local sources cross-referencing forestry
  (willow) / farming (herbs) / `salt-water`.
- ⭐ **Second-instance test:** a second clinic is rows + positions; a
  second drug is a Material row; a second operation is a catalogue row.
  Zero pack code. Biology never lives in the pack.

## Collisions

- **recovery / harm.md** — `operate`, `applyTreatment`, the carer/treater
  seam, the bleed model, `severPart`, the 0.85 plasma ceiling, the notify
  alarm. Build on them; do not fork the treatment primitive.
- **combat / ranged** — the bleed-out transfusion answers; penetrating
  hits now leave a **foreign-body wound** (a new consequence of the
  ranged/combat build's projectiles); the field-medic pair.
- **trade-tailoring** — `sew` (cloth) is adjacent to `suture` (flesh);
  they stay distinct verbs (different Discipline/target/instrument).
- **The Terminus infirmary** — gains the nurse position + blood-bank
  dimension; a first venue, not a new place. The `nurses.ts` brain
  (currently driving the *physician*) gets sorted into the right role.
- **trade-forestry (willow) / trade-farming (herbs) / base-library
  (salt-water)** — the autarky drug sources.
- **augmentation** — amputation is the removal seam it consumes later.
- **blood-slate / pharma-slate** — this build takes their cores and must
  not contradict their deferred designs (esp. leave the deep economies
  to them).

## Surface decisions

### The v1 operation catalogue is all five
bleed control · foreign-body extraction · amputation · rupture repair ·
compound-fracture setting. Rupture repair is `operate` deepened;
extraction requires the new foreign-body wound; amputation needs an
"unsalvageable limb" trigger (catastrophic trauma or advanced sepsis)
and reuses `severPart`. Each is a catalogue row (wound · instrument ·
competence gate · blood cost · during-clock · failure mode ·
anaesthesia input), not a bespoke engine.

### An operation is durative and spends blood
`operate` stops being one tick. It runs as an interruptible engaged act
whose duration scales with severity and shrinks with competence +
instrument grade; the patient **keeps bleeding while it runs**, so a
severe case is a race and transfusion is the counterplay. Interrupted
(patient crashes, surgeon attacked, anaesthesia lapses) → the wound is
left open, worse than before. **The outcome derives from honest inputs
(skill, blood on hand, field cleanliness, anaesthesia, severity) — never
a QTE/twitch** (uncertainty doctrine).

### Blood unit: a stored good with a shelf life; clean in v1
A drawn unit is a stored, transfusable good that **ages out** (can't be
hoarded) — the spoilage tension. **Contamination/screening is deferred**
to blood-slate (a v1 unit is clean). It needs a vessel to hold it
(a blood bag/vial).

### Blood typing within species; cross-species is the reaction, with a saline floor
Within-species **typing + compatibility** is the core teachable (ABO-
shaped, non-hierarchical). Cross-species transfusion is **incompatible →
the reaction**, except the **saline volume-expander floor** (`salt-water`)
which restores volume without cells — the untyped emergency that keeps
the loop playable when no match is on hand.

### The incompatibility reaction is a graded harm, not a lookup failure
Giving the wrong type does damage (a transfusion reaction) proportional
to volume and mismatch — the values/consequence hook, and the reason
`test`/cross-match matters.

### Nurse vs doctor: care vs intervention, and prescribe vs administer
- **Nurse (`nursing`):** tend, dress/undress, `draw`, `transfuse`,
  `administer` (`dose`), monitor, `suture` + follow-up.
- **Doctor (`medicine`):** full diagnosis, the operation catalogue
  (competent+), the cross-match decision, and **`prescribe`**.
- **Transfusion** is a nurse's *act*; doing it *safely* is gated on
  knowing the type (`test`/cross-match, either Discipline). Unmatched
  blood is where it goes wrong.
- **Prescribing is doctor-only** (the MD power); the nurse administers
  what is prescribed. This is the psychiatry seam: a future psychiatrist
  is an MD who prescribes for mental conditions.

### Suturing is a wound-closure tier with mandatory follow-up
`suture` (a suture kit + thread, nursing/medicine competence) closes an
external laceration faster/better than a bandage. Stitches must be
**removed** once the wound knits (too early reopens; left too long,
irritation/infection). Operations leave a **post-op wound** that
follow-up care advances. Follow-ups ride the shipped **notify alarm**
(it already flags a wound's next transition). ⭐ This is what makes
nursing a *returning* practice, not a one-shot.

### A thin drug slice, autarky-sourced; full pharma deferred
Four actives on the shipped `dose`/tag substrate: **anaesthetic**
(per-operation input — administer or the patient is conscious, in pain,
and may thrash), **antibiotic** (the sepsis counterplay), **analgesic**
(pain; source: willow bark, already in the world), **saline** (the
volume floor; `salt-water`, already a material). Each has a **local,
autarky-completable source** — see the supply-chain map. The full
pharmacopoeia/extraction/assay economy is `pharma-slate`.

### Design latitude — fictional remedies to nonfictional maladies
⭐ **Inventing fictional species and supply chains to satisfy player needs
that emerge from the other systems is in bounds** (user direction) — combat
creates the maladies; the remedies need not be real-world. The two source
gaps (anaesthetic, antibiotic) should be filled with **invented
Saxonberg-native medicinal species**, not forced onto real-world poppy/
penicillin. The rule is the standing one: the *mechanism* stays honest and
derivable (a substance with an effect, administered, that a player can reason
about), but the *flora and the chain* may be fictional where that serves the
lenses. Do **not** import real pharma's R&D/manufacturing complexity to look
authentic — abstract to what a player can act on.

## Supply-chain & autarky map

The design guarantee: **every consumable in the loop has a local,
autarky-completable source** — a solo player can own the whole chain.
Economics may punish it; physics must not forbid it.

| consumable | source (autarky path) | gap |
|---|---|---|
| **blood** | your own body (`draw`); replenished by the biological reserve (rest + nutrition) | a **blood vessel** to hold a unit — small add (the antivenin-vial precedent) |
| **saline** | `salt-water` (already a material) | none |
| **analgesic** | **willow** bark (Salix alba, already a species) → a simple local prep | the bark→active prep step |
| **anaesthetic** | ⚠ **no source today** | **GAP** — author a minimal source (a plant/fungus) + simple prep for v1; pharma deepens |
| **antibiotic** | ⚠ **no source today** (real-world: honey/mould; apiculture is an unbuilt RGO) | **GAP** — author a minimal source for v1; pharma deepens |
| **suture kit / needle** | smithing (needle) + textiles (flax→thread) | cross-trade; both shipped |
| **surgical kit** | trade-medicine (shipped); smithing to make | none |
| **dressings** | textiles (flax→linen) | shipped |

⭐ **The two real gaps are anaesthetic and antibiotic sources.** v1 fills
them **minimally** — a single authored source each + a simple local prep
(steep/decoct) yielding the tagged active — so autarky stays whole for
the thin slice. The full pharmacopoeia (many actives, extraction, assay,
the credence-good trust economy) is `pharma-slate`, whose first consumer
this build becomes. ⚠ v1 must not invent bespoke drug mechanics — it
reuses `dose`/Material-tags, so pharma layers economy on top, not
rework.

## Lens pass

1. **Pedagogy** — two Disciplines exercised: `nursing` (continuous care)
   and `medicine` (diagnosis/surgery/prescribing). Blood-type
   compatibility is a genuine derivable rule (ABO-shaped). The operation
   catalogue teaches triage/sequencing under a bleed clock; follow-up
   teaches a *course* of care.
2. **Creative expression** — operations, drugs, clinics are authored
   rows; a second of any needs no code. The ordinary case (stop a bleed,
   dress a cut) needs no authoring; the bespoke (a species-specific op)
   is a row.
3. **Immersion & roleplay** — the two-hand clinical scene (doctor +
   nurse); the field-medic pair; the race against a bleed clock; the
   solo autarkist banking their own blood before a hunt. Emerges from the
   sim.
4. **Values & self-improvement** — consent to operate (the unconscious
   emergency exception → accountability); the wrong-type transfusion as
   real harm; who may cut / who may prescribe (the MD line, the College
   of Physic); giving blood as a cost borne for another.
5. **Technology & magic (epochs)** — typing/asepsis/transfusion are
   modern markers; the arcane fork (the `mend` spell) already exists; the
   dials (type known?, anaesthesia available?) sit per-operation, so one
   engine spans battlefield-crude to modern.
6. **Economy & governance** — blood and drugs produced/consumed, with
   local sources (autarky-possible) and a trade alternative (autarky-
   irrational); the surgeon and nurse as two scarce `employment`
   vocations; care priced by the shipped `labourIndexed` tariff.

## The drive

A person does this in the live game, in order, and sees:

1. **Learn your type.** `test` yourself → a blood type is reported (it
   was `untested` before).
2. **Autarky blood-bank (solo).** `draw` a unit of your own blood into a
   vessel you own → your `bloodVolume` drops and the vessel now holds a
   labelled unit. `assess`/`look` at your body shows reduced blood and a
   replenishing reserve. Rest/eat; over time capacity recovers (tight,
   not instant). The unit is still good (not yet spoiled).
3. **Wait too long once** → the stored unit **spoils** and can no longer
   be transfused (the shelf-life tell).
4. **Take a bleeding wound** (walk the trapped delve corridor, or a
   combat hit) → `bloodVolume` falls toward danger.
5. **Transfuse the matched unit** → `bloodVolume` rises; the bleed is
   survivable. With no matched unit, **saline** raises volume partially
   (the floor) and buys time.
6. **Transfuse an incompatible unit** (wrong type / cross-species) →
   the **reaction** fires: a graded harm, and `assess` shows it. The game
   said `test` first for a reason.
7. **A penetrating hit leaves a foreign body** → `assess` names an
   embedded object; `treat`/dress will not resolve it and says so.
8. **An operation, with anaesthesia.** A doctor `prescribe`s an
   anaesthetic; a nurse `administer`s it; the doctor `operate`s to
   **extract the foreign body** — a durative act that spends blood while
   it runs; without the anaesthetic the patient is conscious and it
   shows. Interrupt it once → the wound is left open.
9. **Suture and follow up.** `suture` a laceration (needs a kit) → it
   closes better than a bandage. Days later the notify alarm says the
   stitches are due; **remove** them → the wound completes. Leave them
   too long → irritation/infection.
10. **The profession boundary.** As a nurse (nursing Discipline) you can
    `draw`/`transfuse`/`suture`/`administer`/`tend` but **cannot
    `operate`** (refused — not a doctor) and **cannot `prescribe`**. As a
    doctor you can. The refusals name the missing Discipline.
11. **Autarky end-to-end.** The whole of steps 1–9 is done **solo**,
    with a self-drawn unit, a self-made/owned kit, and locally-sourced
    drugs (willow analgesic, salt-water saline, the authored anaesthetic/
    antibiotic sources) — no trade required.

## Acceptance criteria

*(Observable from outside the code.)*

- A player can `test` and learn a heritable blood type.
- A player can `draw` their own blood into a vessel, see `bloodVolume`
  drop, and see it recover over time — and a stored unit **spoils** if
  kept too long.
- Transfusing a **matched** unit raises `bloodVolume`; **saline** raises
  it partially with no type; an **incompatible** unit does visible harm.
- The solo **autarky blood-bank → hunt** loop is completable by one
  player with no trade (tight but possible).
- `operate` visibly **takes time and spends blood**, can be
  **interrupted**, and is **worse conscious** than anaesthetised; all
  five operations are performable on their wounds; a **foreign-body
  wound** exists and only extraction resolves it.
- `suture` closes a laceration; the notify alarm flags **stitches due**;
  removal completes the wound; neglect is worse.
- A **nurse** can do the care acts but is **refused** `operate` and
  `prescribe`; a **doctor** can; the refusals name why. `nursing` and
  `medicine` each advance on their own acts.
- Every consumable in the drive was **locally sourced** — the supply
  chain has no autarky-blocking gap.

## Cross-references

- Slates: `clinical-medicine-slate` (umbrella), `blood-slate` (deep blood
  economy), `pharma-slate` (the full drug economy — first-consumed here),
  `augmentation-slate` (prosthetics, fed by amputation), `medic-judgment`
  (diagnosis), `health-vertical` (College of Physic), `mind`/`psychology`
  (mental health, deferred).
- Subsystems: `harm.md`, `vitals.md`, `mortality.md`, `reserve.md`,
  `race.md`, `combat.md`, `ranged.md`, `advancement.md`, `employment.md`,
  `spoilage.md`, `uncertainty.md`, `accountability.md`.
- Related in flight: none.
