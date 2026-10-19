# Room condition & cleanliness design pack — the "condition model," dissolved

> **Status: PARTIAL** — the decomposition shipped in the cleanliness build
> (MR !380, 2026-10-19): `SoilableMixin` on items, fixtures, the floor and
> the body (hands via `HygieneMixin` on `Creature`), debris as a dirt form
> on the floor (not a room field), pests derived, `sweep`/`strew`/`dispose`/
> `brush`/`scrub`/`wash`/`bathe`, `restQualityAsKept` = bed × floor, the
> water precondition — [cleanliness.md](../../subsystems/cleanliness.md) is
> the live doc. Compacted 2026-10-19.
> **Left:** the attributed `(actor, target, extent)` deposit/clear events,
> both directions, and where they land (Part 1, Q6 — ⚠ clears credit a
> `domestic-services` deed to the actor today; deposits are unattributed
> except the blood sample) · tidiness from placement + `tidy` (Q3) · the
> `Resists.factor` immunity wire — *a clean home is immunity* (Part 5,
> after disease) · `restQuality` gaining room temperature (Part 3,
> absorbed from hearth-and-larder) · the residence-ladder condition gate
> and the Stewardship read (Part 5) · a guest's regard of a filthy room
> (Part 5) · the civic/mirror read, individual or aggregate (Q5) · dumped
> debris → public litter → the scavenger (Part 5; owned by
> [waste-slate](./waste-slate.md) / [sanitation-slate](./sanitation-slate.md))
> **Size:** a wave — each item rides another build (disease, residence,
> waste); none is a cycle of its own

See also: [stewardship-doctrine](../../stewardship-doctrine.md) (**this pack amends
its archetype table**) · [furnishing](../../subsystems/furnishing.md) (the
`restQuality` consumer; "cleanliness to items and bodies, not the room") ·
[disease-slate](./disease-slate.md) (**hygiene → infection; "care is
immunity"**) · [sanitation-slate](./sanitation-slate.md) (debris → the
collection pipeline) · [spoilage.md](../../subsystems/spoilage.md) (debris
+ exposed food; *the spoilage design pack retired into it*) · [health-vertical-slate](./health-vertical-slate.md) (the
public-health pedagogy payoff).

---

## Part 0 — What it is, and the two reframes

**Room condition is how well-kept your space is** — and it drives sleep
(`restQuality`), the residence-ladder gate (*"the condition of what you hold"*),
disease risk, and how a guest regards you. Two reframes make it tractable:

*Both reframes shipped: the decomposition and the act-only rule —
[cleanliness.md](../../subsystems/cleanliness.md) (epigraph, § The model);
the archetype correction is in
[stewardship-doctrine.md](../../stewardship-doctrine.md) Part 1's amendment.*

---

## Part 1 — The decomposition + the deposit-and-clear model

*Shipped, in a different shape for one row — `SoilableMixin` on items,
fixtures, the body (per part, `HygieneMixin` on `Creature`) and the
`Floor` twin; **debris is a `DirtKind` form on the floor's own `Soilable`
(`form: debris`, `sweep` → a `Heap` → `dispose` into a `Midden`), not a
room-level field**; pests derived from debris + open food, never a field;
rest reads the bed × the floor (`Postured.restQualityAsKept`) —
[cleanliness.md § The model · § Places](../../subsystems/cleanliness.md).
The one unbuilt row is tidiness from placement (Open question 3).*

### ⭐⭐⭐ Every deposit and every clear carries an ACTOR

**(Constraint carried in from the [household
pack](../tails/household-design-pack.md), 2026-08-06 — the one thing that build asks
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

*The correction to the doctrine is applied —
[stewardship-doctrine.md](../../stewardship-doctrine.md) Part 1's amendment
(2026-08-06).*

---

## Part 3 — Designed to the format

*Items 1–3 shipped (`SoilableMixin`; debris on the floor's `Soilable`, not
a room field; `restQualityAsKept` = the bed's band × the floor's band;
pests derived) — [cleanliness.md § The model · § Places](../../subsystems/cleanliness.md).
Still open from the table: the `Resists.factor` read (Part 5) and the
attributed deposit/clear events (Part 1).*

### Absorbed from hearth-and-larder-design-pack — `restQuality` gains room temperature

*(Moved here at the 2026-09-21 cluster pass: the `restQuality` aggregation
is this pack's row above, and the hearth pack's second input belongs
beside it. The mechanism — a hearth warms its room, `ThermalRegulationMixin`
cascades body temperature into conditions — is
[hearth-and-larder § Part 1](../tails/hearth-and-larder-design-pack.md).)*

| | Work | State |
|---|---|---|
| ✳ **`restQuality` gains room temperature** | a second input beside bedding | **update** |

*Items 4–5 shipped: `wash` · `scrub` (the `wipe` of the list) · `bathe` ·
`sweep`/`muck` · `strew` · `brush`/`beat` · `dispose`, each conferred by
what performs it, water as a precondition (a tap, else a filled vessel —
`fill tub from bath tap`, `Tub.drawFrom`); the state scalar-decomposed
and clockless, kept by `PersistentLocale` —
[cleanliness.md § Places · § People · § Persistence](../../subsystems/cleanliness.md).
`tidy` is unbuilt (Open question 3); `clean` is the contract verb (`job
post clean`). The attributed events remain Part 1's.*

**6. Seams & dependencies.** Consumes acts from cooking (crafting), eating
(metabolism), entering (movement + wetness), sleeping (posture). Feeds
`restQuality` (furnishing), disease (routes + growth term), sanitation (debris),
stewardship condition (the ladder), and — via the attributed events —
[advancement](../../subsystems/advancement.md) (the Stewardship transcript) plus
the [household](../tails/household-design-pack.md) commons read. The **disease payoff**
waits on the disease build; everything else is near-term.

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

- *Furnishing and spoilage shipped: `Postured.restQualityAsKept` (bed ×
  floor), pests from `Floor.hasPests()` speeding loose food's spoilage, a
  board or hand short of sanitised inoculating the food it touches —
  [cleanliness.md § Places · § The clean tiers](../../subsystems/cleanliness.md).*
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
- *Persistence shipped — [cleanliness.md § Persistence](../../subsystems/cleanliness.md).*

---

*Part 6 (the forks, settled) and the build order are history: all five
forks shipped as settled — freezes in absence (the byre's stalls the ONE
declared calendar exception), decomposed (debris on the floor, not a room
field), per-act on the target, pests derived, no time-dust —
[cleanliness.md](../../subsystems/cleanliness.md); spoilage → cleanliness
have landed, the immunity wire waits on disease (Part 5).*

---

## Open questions / forks

*Q1 resolved: `Postured.restQualityAsKept` = bed band × floor band, floor
0.6 at filthy, never to nothing — cleanliness.md § Places (Rest). Q2
resolved and shipped: the `Tub` + `bath-tap` / the copper make `bathe`
available — cleanliness.md § People (a bath at home).*

3. **Tidiness from placement** — is it truly derivable from item `place`/resting
   state, or does it need a light gauge? *Lean: derive it; a scattered room is
   one whose items aren't in their `place`.*
*Q4 resolved for now: the trigger is `cleanliness.pests.debrisAt` + open
food in the room, the effect `cleanliness.pests.ratePerHour` on loose food
and the floor's line — cleanliness.md § Places (Pests); pests as a disease
vector → disease-slate.*

5. **Does the civic/mirror layer read room condition individually or in
   aggregate** — the Part-5-of-the-fridge-pack social-credit line, here too.
6. ⭐ **Where the attributed deposit/clear events land** (Part 1). Candidates:
   `transcripts` (the natural home for the *competence* half — clears are
   advancement evidence), `participation_events`, or a producer-local log.
   Deposits fit none of them cleanly, since they are evidence of *living there*
   rather than of skill. *Unresolved, and it is a collection choice, not a
   design one* — the constraint that binds the build is the event **shape**
   (`actor, target, extent`, both directions), not its destination.
