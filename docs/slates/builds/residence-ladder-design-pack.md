# Residence ladder & property condition design pack — the progression spine

> **Status: design, planner-ready, captured 2026-08-06. Not requirements.**
> The spine that makes the whole stewardship pillar *matter*: **you rise by
> tending, and the gate to a bigger place is the condition of the one you
> already hold.** [stewardship-slate](./stewardship-slate.md) states the ladder
> and the "condition gates ascent" claim; this pack turns it into a planner-ready
> spec now that its inputs — [room condition](./room-condition-design-pack.md),
> [spoilage](./spoilage-design-pack.md), `Durable` wear — are designed.

See also: [stewardship-slate](./stewardship-slate.md) (the ladder, the allowance
cascade, the Stewardship Discipline) · [stewardship-doctrine](../../stewardship-doctrine.md)
· [room-condition](./room-condition-design-pack.md) + [spoilage](./spoilage-design-pack.md)
(the condition **inputs**) · [furnishing](../../subsystems/furnishing.md) +
[residence](../../subsystems/residence.md) (the rungs) ·
[parcel](../../subsystems/parcel.md) (title/tenure) ·
[credit-slate](./credit-slate.md) (the property floor — never seized) ·
[banking](../../subsystems/banking.md) (money gate, tax, utilities).

---

## Part 0 — What it is: the gate is condition, not coin

The stewardship pillar's one-line thesis is *"you hold things, and tending them
well is how you rise."* The ladder is where "how you rise" gets teeth:

> ⭐⭐⭐ **Money is necessary and not sufficient. The binding gate to the next
> rung is the CONDITION of what you already hold** (stewardship-slate). You do
> not get a bigger place while the current one is falling apart.

Three things fall out, and they are why this is the spine rather than a feature:

- **The ladder is about capability, not accumulation.** Rising means *demonstrating
  you can keep up with what you have* — honest (condition is visible, not a hidden
  stat), and real (this is a landlord reference and a lender's look at how you
  kept the collateral).
- ⭐ **Anti-hoarding falls out for free.** Obligations scale with what you hold, so
  **holding more than you can steward is negative-sum** — no ownership cap needs
  writing. A manor you can't keep clean drags your condition below the gate and
  you can't advance *or* live well in it. The obligations *are* the cap.
- **It is the payoff that makes every producer matter.** Spoilage, room condition,
  Durable wear each become *legible consequences that gate your future*, not
  isolated chores.

---

## Part 1 — Property condition: a derived read, Law-2-clean

Property condition is **not a new gauge** — it is a **derived-on-read aggregation**
over the producers already designed:

```
propertyCondition(holding) = f(
    room condition,              // act-deposited: dirt, debris, tidiness  (freezes in absence)
    fixture Durable/Keen wear,   // act-driven: worn appliances, dull tools (freezes in absence)
    stored-food / stock state,   // continuous: spoilage                   (runs over absence)
    premises standing            // utilities paid, tax current            (economic)
)
```

> ⭐⭐ **It is Law-2-clean by construction, and the room-condition build is what
> makes that true.** Its two biggest inputs (room condition, Durable wear) are
> **act-deposited and freeze in absence** — so **a home you leave does not fall
> apart.** Property condition degrades because you *live badly* (mess you don't
> clean, wear you don't repair), never because *time passed while you were away.*
> The one continuous input (stored-food spoilage) is opt-in (you chose to keep
> perishables) and defused by care (the fridge). So the ladder gate honors
> *"presence is never the meter"*: you keep your rung by tending, not by
> logging in.

Derived on read, nothing stored, degrades on a **slope not a cliff** — the family
shape. It is **visible** (the whole point — you and a prospective landlord can
*see* it), and it feeds three consumers: the **ladder gate** (below), the
**Stewardship Discipline** (Part 4), and the **mirror/civic** "better resident"
signal (Part 7).

---

## Part 2 — The ladder, and the two-part gate

The rungs (stewardship-slate §L is the real one), each with tenure, the land use
it needs, what it supports, and its gate:

| Rung | Tenure | Land use | Supports | Gate to next |
|---|---|---|---|---|
| **Dorm** | granted lease | residential (institutional) | a houseplant | none — the tutorial |
| **Apartment** | rented | residential (urban) | plants, a small companion | money |
| **Townhome / house** | owned | residential (+ yard) | a garden bed, a pet | money **+ condition of the last** |
| **Smallholding** | owned, frontier | agricultural (small) | a field, a few head | money + condition + zoning |
| **Farm / ranch** | owned, rural | agricultural | scale (the Warren buds) | money + condition + stewardship band |

**The gate is two-part: money (necessary) + condition (binding).** You can afford
the townhome, but not while your apartment is filthy and its fixtures are broken.
The condition check is a **band threshold** on your current holding's property
condition — *"is it above `well-kept`?"* — read the moment you try to ascend.

> **The frontier path is unblocked; the city middle is not.** *Dorm → go west and
> homestead* rides shipped parcels (a frontier smallholding is one `FolderZone`
> parcel). *Apartment → townhome → suburb* needs the **region-parcel** primitive
> (deferred) and the **allowance meter** (ships inert) — so **build the frontier
> rungs first** (stewardship-slate's own conclusion), and the city rungs land when
> those two substrates do.

---

## Part 3 — Designed to the format

**1–2. What it is / composition.** Property condition is a **derived read** (a new
`StewardshipApi.conditionOf(holding)` or a read on the parcel/residence), not a
mixin. The ladder is a **gated ascent action**, not an object.

**3. New / updated mixins & surfaces.**

| | Work | State |
|---|---|---|
| ⭐ **`propertyCondition` derived read** | aggregate room condition + Durable wear + stock spoilage + premises standing over a holding's extent (an MQL walk over the parcel, no stored counter) | **new (derived)** |
| ⭐ **The ascent gate** | the "acquire next rung" flow checks money **and** `propertyCondition ≥ band` | **new (a flow + a predicate)** |
| ✳ **Stewardship `Discipline`** | pure data (Part 4) — reads condition, buys precision/access | **new data** |
| ✳ **Premises obligations** | utilities (power-utility), parcel tax, fixture upkeep — the money-side inputs | **rides designed slates** |

**4. Verbs & affordances.** The *care* verbs already belong to the producers
(`clean`/`repair`/etc. — room-condition & crafting). The ladder adds an **acquire
/ lease-up** flow (buy or lease the next rung) that runs the two-part gate. No new
core verb; the ascent is a content/economic action.

**5. Persisted fields.** None new for condition (derived). The ladder's state is
just *which rungs you hold* — already the parcel `grants[]` / title.

**6. Seams & dependencies.** Inputs: room condition (near-term), Durable (ships),
spoilage (the keystone), premises/utilities (power-utility, designed), tax
(banking). The **city rungs** wait on region parcels + the allowance meter; the
**frontier rungs** do not.

**7. Fault line.** The **frontier ladder + property-condition read + the ascent
gate** is a near-term build once room-condition ships. The **city ladder** is a
separate, later build gated on two deferred substrates.

---

## Part 4 — The Stewardship Discipline (care as capability, never a multiplier)

Two things, deliberately not fused (stewardship-slate):
- **Property condition** — the *derived state* above (visible, gates the ladder).
- **Stewardship competence** — a `Discipline` on the character. It buys **precision
  and access** — *better reads on what a holding needs, wider maintenance options,
  the ability to steward more before it slips* — and **never a multiplier**
  (farming's rule: competence sharpens the instrument, never inflates the yield).

The two-learner firewall holds: **the avatar carries the band; the human makes the
decisions.** And it's cheap — Disciplines are pure data (39 ship, none agricultural
yet), so stewardship/farming/husbandry land together in the vanilla discipline pack.

> ⭐ It closes the doctrine loop: care already produces the thing *enduring* and the
> *renown* of a well-kept place; the Discipline makes **getting better at tending**
> a measured, showable competence — the applied-hours thesis in an apron.

---

## Part 5 — The consequence ladder of a neglected home (humane by design)

What a dilapidated holding actually *does* — a slope of soft consequences, and
**never seizure**:

1. **Worse living** — `restQuality` falls (filthy bedding, messy room), disease
   risk rises (a dirty home is lower immunity — the room-condition unification).
2. **Social** — guests regard you (belief/renown); the living-room-as-audience
   gets teeth; a blighted property is a **civic nuisance** (the neighbors, the
   "better resident" externality).
3. **The ladder** — you cannot ascend until you recover the band.
4. **Never the home itself.** Title is **kernel-protected** — *"never seized
   without a court"*, the property floor is inviolable (credit-slate). A neglected
   holding costs you *advancement and comfort*, **not your roof.** The discipline
   is *"credit gets harder / you live worse,"* never *"you're evicted for a messy
   room."* Forgiveness holds; recovery is always an act away.

This is the [motivation-lens](../../lenses/motivation.md) "chosen hafta, cheaply
exitable" applied to a home: the stakes are real, the floor is protected, and the
exit (clean it up) is always cheap.

---

## Part 6 — Pedagogy: personal finance, property, and citizenship

The ladder is where stewardship teaches the **most transferable** real-life skills
in the whole pillar:

- ⭐ **Don't buy more than you can maintain.** "Obligations scale with what you
  hold → over-holding is negative-sum" is a *personal-finance lesson lived rather
  than lectured* — the single most common real-world money mistake (the
  house/car/lifestyle you can't keep up), rendered as an honest mechanic.
- **Property, tenure, and underwriting** — lease vs own, the landlord reference,
  the lender's look at how you kept the collateral. Why condition gates credit is
  *real* (a maintained asset is better security).
- **Citizenship** — a well-kept property is a **positive externality**; a blighted
  one is a **negative** one (nuisance, public health, the neighbors' property
  value). This is the civic-virtue payload the mirror's "better resident" layer
  rewards.

**Wrong-about / hooks:** *"You can afford the manor — should you buy it?"* (can you
keep it above the band? — the obligations-scale calculation); *"Your apartment is at
`soiled` — what's between you and the townhome?"* (money **and** a clean-up);
*"Which costs you more — a big place you neglect or a small one you keep?"* (the
anti-hoarding trade, computable).

---

## Part 7 — Interop map

- **Room condition + spoilage + Durable** — the three condition **inputs**; this
  pack is their aggregator and their *reason to matter* (they gate your future).
- **Furnishing / residence** — the rungs (the dorm ships; the apartment build is
  the next rung; furnishing's owner-persistence carries your holdings up the
  ladder).
- **Parcel** — title/tenure is the ladder's state; `ownerOf`/`grants[]` already
  express lease-vs-own.
- **Banking** — the money half of the gate, the parcel tax (a sink), utilities
  (transfers). Never a mint.
- **Credit-slate** — the property floor (never seized) makes the consequence ladder
  humane; and *"condition gates credit"* is a real underwriting input a lender
  reads.
- **Civics / allowance** — the city rungs are apportioned from the allowance
  cascade (blocked on the meter); zoning admits the land use each rung needs.
- **Disease** — a well-kept holding is occupant immunity (the room-condition
  unification), so climbing the ladder well is *also* lowering your household's
  disease risk.
- **The mirror / civic layer** — real property condition (maintenance, energy,
  tidiness signals) → fictional stewardship standing + ladder progress: *"be a
  better resident"* made into a progression. Same guardrails (opt-in, derived,
  recognition-not-advantage, aggregate-not-individual for the civic externality).

---

## Part 8 — Forks settled, and the blockers

**Settled:**
1. **Property condition → a derived read**, aggregating the shipped/designed
   producers over the holding's extent. Not a new stored gauge.
2. **The gate → two-part** (money necessary, condition band binding), checked at
   ascent.
3. **Consequence → a humane slope, never seizure** (the property floor is kernel).
4. **Discipline → precision + access, never a multiplier.**
5. **Frontier-first** — build the unblocked rungs before the city middle.

**Blockers (from stewardship-slate, still true):**
- **Region parcels** — dense suburbia (the apartment→townhome→suburb middle) needs
  the deferred coordinate-region primitive.
- **The allowance meter** — ships inert; the city rungs' scarcity/apportionment
  ride it.
- **A second city** — the political layer (apportionment as governance) is theatre
  with one locality.

None of these block the **frontier ladder + property condition + the ascent gate**,
which is the near-term slice.

---

## Open questions

1. **The condition band that gates ascent** — one universal threshold, or per-rung
   (a manor demands `pristine`, an apartment `tidy`)? *Lean: per-rung, rising* — the
   higher you climb, the higher the bar, which is honest and self-limiting.
2. **How the four inputs weight** into one `propertyCondition` read (a min, like
   husbandry's limiting factor? a weighted blend?). *Lean: a limiting-factor min* —
   one filthy room shouldn't hide behind spotless fixtures.
3. **Does the mirror's real-property-condition drive the *ladder*, or only
   recognition?** The pay-to-win / two-tier line — real stewardship earns *standing*,
   but should it earn *rungs*? *Lean: recognition only* (mirror-slate's
   "different things, not more").
4. **Numeric calibration** — bands, weights, the tax/utility magnitudes. Deferred
   to a running game.
