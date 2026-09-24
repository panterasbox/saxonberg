# Surgery-specialty slate (working doc)

> **Status: UNBUILT** — the clinical-medicine build shipped the surgical
> TRUNK: `operate` as a durative, blood-costing, interruptible act over a
> data `Operation` catalogue (5 rows), gated on posture/competence/kit/
> anaesthesia, with the biology in `applyTreatment`/`severPart`. A second
> operation is a ROW, so the extensible spine is done. This slate is the
> RICHNESS the trunk was deliberately kept thin of.
> **Left:** the operations-demand audit (which ops, and is there demand) ·
> the harm-profile / violent-engagement gap check · the theatre (a room
> that matters) · the surgical team (anaesthetist + assistant) · asepsis
> as a system · instrument grade (the `gradeConditionScale(kit)` hook left
> at 1.0) · complications (an op that CAUSES a new problem) · elective vs
> only-when-unsalvageable amputation.

## ⭐ The two audits this build owes (user direction, 2026-09-24)

The user's framing when reviewing the clinical-medicine MR: *"we'll want a
whole surgery build and actually talk about all the different operations
we want to support and what there's demand for, and if there's any gaps in
our harm profiles and violent engagements."* Two concrete audits lead this
build:

1. **The operations catalogue vs. DEMAND.** The shipped 5 (bleed-control,
   extraction, rupture-repair, compound-fracture setting, amputation) were
   chosen because combat + the delve produce their wounds today. Before
   adding rows, ask the vocations question (`docs/vocations.md`): *what
   wound exists that no operation answers, and who is producing it?* An
   operation with no wound-source is `feel`/`taste` shipping unrun.

2. **The harm profile vs. the catalogue — the gap check.** Walk every
   `TraumaType` and every violent-engagement producer (combat, ranged,
   hazards, fire, electricity, caustic, the delve) and ask which leave a
   wound only surgery should resolve, and whether the catalogue answers
   it. Today `rupture` → surgery and `foreign-body` → extraction are the
   two surgical-only wounds; a burn, a caustic, a frostbite all resolve
   without surgery. Is that right, or is there (e.g.) a debridement op a
   deep burn should want? This is where the harm model and the surgery
   model are reconciled — a gap in one is a gap in the other.

## The specialty richness (each its own leg)

- **The theatre** — a `theatre` capability on a Location that buys
  duration / efficacy / asepsis. Today an op is as good in a ditch as in a
  ward; the room should matter. (The catalogue row's `instrument` +
  `anaesthesia` fields are the dials; a room bonus is the new axis.)
- **The team** — a dedicated anaesthetist (so the surgeon is not also
  managing the drug and the patient's consciousness) and an
  instrument-passing assistant. The two-role clinical scene shipped; a
  three-role operating scene is the extension.
- **Asepsis as a system** — the dirty-hands sepsis seed exists
  (`applyTreatment` inoculates on a filthy hand); a real sterile-field
  discipline (scrub-in, a sterile instrument, contamination of the field)
  is its own mechanic.
- **Instrument grade** — `OperateController`'s duration/efficacy formula
  has a `gradeConditionScale(kit)` hook left at 1.0. A finer/keener kit
  should operate faster and cleaner (the `Grade`/`Durable` axis the
  crafting trades already carry).
- **Complications** — an operation can be interrupted or go poorly, but
  cannot yet CAUSE a new problem (a nicked vessel → a new bleed, a
  post-op infection beyond the generic sepsis clock). Complications are
  what make surgery a skill with stakes rather than a timed button.

## Cross-references

- [clinical-medicine-slate](./clinical-medicine-slate.md) — the umbrella;
  where the surgical trunk shipped.
- `docs/subsystems/harm.md` — the ten trauma behaviors + the operation
  catalogue; the surgical-only resolutions (`surgery`, `extraction`).
- [health-vertical-slate](./health-vertical-slate.md) — the College of
  Physic (who may cut), the teaching theatre.
- `docs/vocations.md` — the demand test the operations audit runs.
