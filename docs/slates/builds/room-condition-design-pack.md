# Room condition & cleanliness design pack — the "condition model," dissolved

> **Status: design, planner-ready, captured 2026-08-06. Not requirements.**
> The genuinely **un-designed** archetype-2-adjacent producer — the *"condition
> model"* `furnishing.md` keeps deferring room state and `restQuality`-from-
> tidiness to. This pack designs it outright, and in doing so **corrects the
> stewardship doctrine's classification of a dirty room** (Part 2). Same
> per-object format as the [fridge](./fridge-design-pack.md) and
> [spoilage](./spoilage-design-pack.md) packs.

See also: [stewardship-doctrine](../../stewardship-doctrine.md) (**this pack amends
its archetype table**) · [furnishing](../../subsystems/furnishing.md) (the
`restQuality` consumer; "cleanliness to items and bodies, not the room") ·
[disease-slate](./disease-slate.md) (**hygiene → infection; "care is
immunity"**) · [sanitation-slate](./sanitation-slate.md) (debris → the
collection pipeline) · [spoilage-design-pack](./spoilage-design-pack.md) (debris
+ exposed food) · [health-vertical-slate](./health-vertical-slate.md) (the
public-health pedagogy payoff).

---

## Part 0 — What it is, and the two reframes

**Room condition is how well-kept your space is** — and it drives sleep
(`restQuality`), the residence-ladder gate (*"the condition of what you hold"*),
disease risk, and how a guest regards you. Two reframes make it tractable:

1. ⭐ **It is not one system — it decomposes**, exactly as `furnishing.md`
   already hinted (*"spoilage to food, pests to debris+food, cleanliness to
   items and bodies — none of them to the room"*). "Room condition" is a
   **derived read** over a few small producers, not a single room gauge.
2. ⭐⭐ **It is NOT archetype 2.** The doctrine filed "a dirty room" beside the
   rotting fish (flux, runs over absence). **Wrong** — and designing it is what
   surfaced the error (Part 2). Dirt is *deposited by acts*, so it **freezes in
   absence**. It is archetype-**1**-shaped (act-driven, no clock), not
   archetype-2.

---

## Part 1 — The decomposition + the deposit-and-clear model

Five pieces, and only two are new gauges:

| Piece | Lives on | Shape | Cleared by |
|---|---|---|---|
| ⭐ **`Soilable`** (grease, grime, soiled bedding, dirty hands) | **items / surfaces / bodies** | act-deposited band (`clean/soiled/filthy`) | `wash` / `wipe` / `bathe` |
| ⭐ **Debris** (crumbs, offcuts, litter) | **the room** (room-level field) | act-deposited band | `sweep` / `clean` → a bin |
| **Pests** | emergent | a **threshold consequence** of debris + exposed food | remove the cause |
| **Tidiness** | emergent | derived from item **placement** (`place`d vs scattered) | `tidy` (put things away) |
| **Room condition** | derived-on-read | an **aggregation** of the above | — (it's a read) |

**The model is deposit-and-clear, not reconcile-over-time.** An *act* deposits:
cooking greases the stove and adds smoke; eating drops crumbs (→ debris);
entering with wet/muddy feet soils the floor; sleeping soils the bedding;
handling raw meat soils the hands. **No act → no new dirt.** Cleaning is the
inverse act. This is the same event-driven, no-clock shape as `DurableMixin`
use-wear — *deposition* where Durable has *wear* — not the continuous rate of
spoilage.

**Pests are an emergent consequence, never a breeding sim.** Debris + exposed
food above a threshold → pests *appear* (on presence/return) as a disease vector
and spoilage accelerant. There is deliberately **no field** (furnishing's call)
and no "your house is overrun while you were away" — that would be exactly the
tax-on-absence Part 2 forbids.

### ⭐⭐⭐ Every deposit and every clear carries an ACTOR

**(Constraint carried in from the [household
pack](./household-design-pack.md), 2026-08-06 — the one thing that build asks
of this one.)**

The deposit-and-clear model above is stated as *state mutation*: an act soils
the stove, another act cleans it. **That is not sufficient.** The build must
emit, for both directions:

> **`(actor, target, extent)` on every deposit and every clear** — not just a
> mutated band.

Half of this is obvious and half is not. **Clears** must be attributed or the
individual half of stewardship has no evidence: the Discipline's transcript,
the *"you got better at tending by tending"* claim, and any contract clause
over who kept the premises all read the actor off these events. **Deposits**
must be attributed too, and that is the part easy to skip — an unattributed
deposit gives you a record that knows who cleaned but not who made the mess,
which is exactly half a commons.

⚠ **It is nearly free now and expensive later.** A producer that only mutates a
band cannot be retrofitted with attribution without re-deriving history it
never kept. This costs a field on an event at build time.

### ⚠ And it must NOT become a blame ledger — the accountability shape, reused

Attributing mess is one short step from a per-person scoreboard, which the
household pack rules out flat (*aggregate, never report*). The corpus already
solved this exact problem once, and the answer transfers verbatim:

> **[accountability](../../subsystems/accountability.md)'s shape: events are
> recorded with their actor; BLAME DERIVES ON READ and is never stamped.**

So: record `(actor, target, extent)`; derive whatever a consumer legitimately
needs (competence, a clause check, the household's aggregate condition); and
**never** materialize a ranked per-occupant split. The single-occupant case is
unaffected — it is your own record either way — and the multi-occupant case
stays a commons rather than a leaderboard.

---

## Part 2 — ⭐⭐ The Law-2 line, and the doctrine correction

The governing decision, and it is the whole reason this stays un-miserable:

> **We model the mess you MAKE, not the mess TIME makes.**

Real rooms accumulate two kinds of dirt: **act-dirt** (grease, crumbs, tracked
mud — from *living*) and **time-dust** (settling dust, mildew, slow decay — from
*elapsed time*). We model the first and **deliberately omit the second**, because
time-dust is precisely *"no upkeep-or-it-decays"* — the survival-MMO treadmill
Law 2 was written to ban. A room left alone neither dirties nor cleans; it
**freezes**. That is Law-2-clean by construction (no tax on absence, no
attendance meter) *and* honest (real dirt does come from use).

### The correction to the doctrine

[stewardship-doctrine](../../stewardship-doctrine.md) Part 1 put *"a dirty room"* in
**archetype 2** (flux — *"runs over absence"*). Building it shows that is wrong:

> ⭐⭐ **A dirty room does not run over absence.** Its driver is *acts*, and no
> acts happen while you are gone, so it **freezes** — the opposite of the fish.
> It is **archetype-1-shaped** (act-driven, no clock, cleared by an act), not
> archetype 2.

The refinement worth folding back into the doctrine: **archetype 2's
absence-behavior depends on whether the decay process is CONTINUOUS-NATURAL
(microbes, growth → runs over absence: spoilage, the herd, the plant) or
ACT-DEPOSITED (dirt, mess, wear → freezes in absence: room condition, Durable).**
The fish rots because biology runs without you; the kitchen gets dirty only
because *you* cook in it. Same pillar, opposite clocks — and the difference is
the driver, not the domain.

---

## Part 3 — Designed to the format

**1. What it is.** Above.

**2. Composition.** Two new mixins + a derived read:
- `Soilable` composes on fixtures/surfaces/bodies that acts soil (the stove, the
  bedding, a `Body`) — a banded soiling level.
- Debris is a **room-level field** on `FurnishableRoom` (the `postedAs`/`air`
  precedent — a room already carries declared fields of its own).
- Room condition is a **derived read** (no stored field) aggregating them.

**3. New / updated mixins.**

| | Work | State |
|---|---|---|
| ⭐ **`SoilableMixin`** | banded soiling, act-deposited, `wash`/`wipe`-cleared; the `Durable`/`Keen` sibling but deposition not wear | **new** |
| ⭐ **Debris room-field** | a room-level accumulator + band; `sweep`-cleared, disposes into sanitation | **new (room field)** |
| ✳ **`restQuality` aggregation** | `PosturedMixin.getRestQuality` reads bedding `Soilable` + room condition (furnishing's flagged seam) | **update** |
| ✳ **Pest threshold** | a derived check on (debris + exposed food) → a pest consequence; no field | **new (derived)** |
| ✳ **Disease resistance read** | occupant disease susceptibility reads home condition (Part 6) | **wire into `Resists.factor`** |
| ⭐ **Actor-attributed deposit/clear events** | `(actor, target, extent)` emitted both directions; blame derives on read, never stamped (Part 1) | **new — required at build time, not retrofittable** |

**4. Verbs & affordances (the stewardship gameplay).** `wash` / `wipe` /
`bathe` / `sweep` / `clean` / `tidy` / `dispose` — **acts of care, "fought not
watched."** Each is a legible act that clears a gauge; none is a bar you stare
at. `dispose` hands debris to sanitation (a bin, or dumped → public litter).

⭐ **The water-using ones (`wash`/`wipe`/`bathe`) take a PRECONDITION, not a
consumable** — see [water-design-pack § Part 4](./water-design-pack.md). Where
there is a tap the act simply works; where there is not, you need a filled
vessel. Deliberately **not** metered water: the shipped taps are `∞` on
purpose, and charging the care loop an errand per wash is the friction this
pack exists to avoid.

**5. Persisted fields.** The `Soilable` band per item/body; the room's debris
level. **No clock stamp** (it's event-accumulated, not time-integrated) — they
persist as plain state and are correct across dormancy *because they froze.*
⭐ Plus the **attributed deposit/clear events** (Part 1) — an append-only log
beside the bands, never a per-occupant tally.

**6. Seams & dependencies.** Consumes acts from cooking (crafting), eating
(metabolism), entering (movement + wetness), sleeping (posture). Feeds
`restQuality` (furnishing), disease (routes + growth term), sanitation (debris),
stewardship condition (the ladder), and — via the attributed events —
[advancement](../../subsystems/advancement.md) (the Stewardship transcript) plus
the [household](./household-design-pack.md) commons read. The **disease payoff**
waits on the disease build; everything else is near-term.

**7. Fault line.** A near-term build on shipped substrate (furnishing room-
fields + the `Durable`/`Keen` mixin precedent). Its *disease* half waits on the
disease build; its *aesthetic + restQuality + sanitation* halves do not.

---

## Part 4 — Physics & pedagogy: this is the home's PUBLIC-HEALTH surface

Where spoilage teaches food science and the fridge teaches thermodynamics,
**room condition teaches public health and germ theory** — and it is honest
because it runs on the *same* infection machinery the disease build ships.

- **Hygiene → the chain of infection.** Dirty hands + food prep → contamination
  → **foodborne/contact disease** (shipped routes + spoilage's growth term).
  *"Handwashing IS the chain of infection"* (furnishing) — and handwashing is the
  single highest-impact intervention in the history of public health
  (Semmelweis). A student *lives* the chain rather than reading about it.
- **Debris → pests → vector.** Litter + food → vermin → a disease reservoir.
  This is the sanitation revolution — Snow's cholera map, the Great Stink, why
  cities built sewers. **Cleanliness is not aesthetics; it is epidemiology.**
- **What a student can be wrong about:** does washing hands before cooking
  matter (yes — it breaks the chain); does a filthy kitchen raise food-poisoning
  risk (yes, computably, via contamination → load); will debris + exposed food
  bring pests (yes, above a threshold).
- **Item hooks** (keys computed by the sim): *"You prep food with unwashed hands
  after handling raw meat — contamination risk?"* (the cross-contamination
  chain); *"Filthy vs clean kitchen, same fish — compare time-to-hazard"* (the
  dirty surface seeds load); *"Debris X + exposed food — do pests appear?"* (the
  threshold).

---

## Part 5 — ⭐⭐ Interop, and the unification: "a clean home is immunity"

Same principle as always — **no special cases; every system reacts through its
own model.** The standout is a direct unification with the disease design:

> ⭐⭐⭐ **A well-kept home is immunity — exactly as good husbandry is.**
> disease-slate's keystone is *"the condition score the husbandry family computes
> becomes the resistance factor — disease is the consequence of care, not a dice
> roll."* Point that at the home: **your household's disease susceptibility reads
> your home's condition.** A clean, tidy, pest-free home lowers the occupants'
> risk; a filthy one raises it. The *same* `Resists.factor` seam, pointed at the
> residence instead of the paddock. Care → resistance, one model, herd and home.

The rest of the map:

- **Furnishing.** `restQuality` finally aggregates from bedding `Soilable` +
  room condition (its flagged-but-unbuilt seam); the room overlay carries the
  debris field (the `postedAs`/`air` precedent).
- **Spoilage.** Debris + exposed food is the pest trigger; a dirty prep surface
  seeds microbial load onto food (cross-contamination) → faster spoilage. The two
  packs interlock.
- **Sanitation.** `dispose` feeds the debris into the shipped pipeline — a bin,
  or dumped on public ground → litter → the **scavenger/cart** collects it. The
  private-interior/public-ground seam is clean (yours until you dump it).
- **Metabolism / disease.** Hygiene drives the **foodborne/contact routes**
  (shipped) + the growth term (spoilage) → the `ptomaine`/pathogen payoff. A
  body's own `Soilable` (dirty hands) is a fomite.
- **Stewardship + the ladder.** Room condition **is** the property-condition that
  gates the residence ladder (*"you don't get a bigger place while the current
  one is falling apart"*); the Stewardship Discipline reads it; the mirror/civic
  layer reads its real twin (a well-kept property = the "better resident"
  signal, and a filthy one is a real public-health externality).
- **Regard / renown.** A guest in a filthy room reacts (belief/regard); the
  living-room-as-audience gets teeth.
- **Persistence / residency.** `Soilable` + debris survive dorm/reap as plain
  frozen state — **no reconcile needed** because they don't integrate time. The
  one interop that's *simpler* than the reconcile family, not harder.

---

## Part 6 — The forks, settled

1. ⭐⭐ **Absence behavior → freezes** (act-deposited, archetype-1-shaped). *The*
   call; corrects the doctrine (Part 2). Model the mess you make.
2. **Where it lives → decomposed** (Part 1): `Soilable` on items/bodies, debris
   a room field, pests emergent-threshold, tidiness emergent-from-placement,
   room condition a derived aggregation. Not one room "dirtiness" scalar.
3. **Deposits are per-act on the specific target** (cooking soils *the stove*;
   mud soils *the floor*) → aggregated into the room read. Honest and legible,
   not a vague ambient room level.
4. **Pests → emergent threshold consequence** (appear on presence/return), never
   a breeding sim. Law-2 safe.
5. **Continuous room-decay (mildew, dust) → omitted** as tax-on-absence. Stated
   plainly, in docs, out of fiction: *we model act-dirt, not time-dust.*

---

## Fault line / build order

**Near-term, mostly on shipped substrate** — the `Durable`/`Keen` mixin
precedent + furnishing's room-fields. Splits: the **aesthetic + `restQuality` +
sanitation** half ships now (it makes the home stress-test whole and gives the
residence ladder its condition gate); the **disease** half (hygiene → infection,
clean-home-is-immunity) waits on the disease build, which itself waits on
spoilage's growth term. So the sequence is: **spoilage → room condition
(aesthetic/rest/sanitation) → disease → room condition (the immunity wire).**

---

## Open questions / forks

1. **The `restQuality` curve** — how bedding `Soilable` + room condition combine
   into the multiplier furnishing wants (bounded, forgiving; a filthy bed is a
   worse floor, never a punishment cliff).
2. ✅ **Body `Soilable` ↔ the bathroom — ANSWERED 2026-08-11.** The tub/basin
   is **the fixture that makes `bathe` available** (the water precondition,
   [water pack § Part 4](./water-design-pack.md)). That is a real modelled
   function with no needs-bar, and it makes *running water* a residence-ladder
   rung feature rather than a `prestige` number.
3. **Tidiness from placement** — is it truly derivable from item `place`/resting
   state, or does it need a light gauge? *Lean: derive it; a scattered room is
   one whose items aren't in their `place`.*
4. **The pest threshold + effect** — what pests *do* (contaminate food, spread
   disease, gnaw goods) and the exact debris+food trigger. Content calibration.
5. **Does the civic/mirror layer read room condition individually or in
   aggregate** — the Part-5-of-the-fridge-pack social-credit line, here too.
6. ⭐ **Where the attributed deposit/clear events land** (Part 1). Candidates:
   `transcripts` (the natural home for the *competence* half — clears are
   advancement evidence), `participation_events`, or a producer-local log.
   Deposits fit none of them cleanly, since they are evidence of *living there*
   rather than of skill. *Unresolved, and it is a collection choice, not a
   design one* — the constraint that binds the build is the event **shape**
   (`actor, target, extent`, both directions), not its destination.
