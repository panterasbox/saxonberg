# Blood slate (working doc)

> **Status: design proposed, nothing built.** The transfusion economy —
> blood types, donation, and the supply that the shipped
> [harm](../../subsystems/harm.md) vertical creates demand for but
> nothing answers.
>
> **v1 scope decided: gift-only, and blood types ship with the donation
> loop.** The paid-market policy lever is designed-for and deliberately
> **not built** — see [The Titmuss
> lever](#-the-titmuss-lever--designed-for-not-v1).

---

## The gap

Harm ships a **bleed** — a laceration opens it, `bloodVolume` drains
reconcile-on-read, and mortality's rescuable clock ends in death by
exsanguination. The medic vertical ships the other side: a `medicine`
Discipline, `treat` / `bind` / `dress`, a clinic in GlassAlley.

**Nothing replaces the blood.** You can stop a bleed; you cannot undo
one. Given how combat resolves, stab / cut / puncture wounds will be the
most common serious injury in the game, and the treatment for a big one
is a thing the world has no way to produce.

## What already exists

More than expected, and it changes what this build costs:

| piece | where | what it gives |
|---|---|---|
| `bloodVolume` (L) | [vitals.md](../../subsystems/vitals.md) | a real driven vital with a lethal floor |
| the bleed | [harm.md](../../subsystems/harm.md) | the deficit, reconcile-on-read, clot gate |
| exsanguination | [mortality.md](../../subsystems/mortality.md) | the rescuable window a transfusion competes with |
| ⭐ `introduceToxin` | [metabolism.md](../../subsystems/metabolism.md) | **"the bloodstream seam past digestion — the path a poisoned dart or needle uses."** This is the transfusion door, already built. |
| `Bulkable` | [bulk.md](../../subsystems/bulk.md) | continuous matter, measure grammar, transfer — a blood bag |
| biological `Reserve` | [reserve.md](../../subsystems/reserve.md) | what donation costs the donor, and how it recovers |
| `Species.vitalProfile` | [race.md](../../subsystems/race.md) | per-species `bloodVolume` baselines already authored |

A transfusion is `introduceToxin`'s seam with a benign payload and a
compatibility check in front of it. The substrate is not the work here.

---

## ⭐ Blood type — the first *endowed* value

Blood type is the platform's first value that is neither **derived** from
a ledger nor **declared** by the player. It is **endowed**: assigned by a
process the player does not control, fixed for life. See
[lineage-slate](./lineage-slate.md) § *The four kinds of value* for the
category and its governing rule.

The rule, restated because it is what makes blood type a *good*
endowment:

> **Endow what creates a relationship. Never endow what creates a
> ranking.**

Blood type is pure relationship — who can help whom — with no scale.
Nobody's is better. A rolled `+2 strength` would be the same category and
fail the test.

### ⭐ Genotype is stored; phenotype derives

This is not a special case. It is the house pattern one level down:

- **genotype** — the allele pair you carry (`AO`). Stored, write-once,
  opaque.
- **phenotype** — what expresses (type `A`). **Derived on read** from
  genotype + a dominance table.

Same architecture as `transcripts → Competence` and `disposition_events →
TraitPosition`: store the raw thing, derive the reading, and re-legislate
the expression rules without rewriting a row. **A genotype is a very
short, write-once ledger.**

Three things fall out free:

- **Carrier status.** `AO` carries O without expressing it. Real,
  teachable, no extra surface.
- **Inheritance** is already the right shape when lineage lands.
- **⭐⭐ You do not know your own blood type.** The phenotype derives, but
  *knowing* it is a **belief**. You learn it by being **tested** — which
  is realistic, gives the clinic a diegetic reason to exist beyond
  trauma, and turns an endowment into a first errand instead of a line on
  a sheet. Char-gen should show the slot exists and reads `untested`.

### Where the value comes from

A precedence chain, resolved at commit, then frozen:

1. **author pin** — this NPC is O− because the story turns on it
2. **lineage** — when parentage is known ([lineage-slate](./lineage-slate.md))
3. **species allele frequencies** — declared on `Species`
4. the roll

⭐ **Stamp the provenance.** "Authored" and "rolled" are different facts:
one is a story commitment that must survive a rebalance of the frequency
tables, the other is background that needn't. Content also needs to be
able to ask *why is this NPC O−* and get an answer.

⚠ **Frequencies vary by species, never by human ethnicity.** Real ABO
distributions do vary by ancestral population, and importing those
numbers lands precisely on the species slate's named worst antipattern —
*"culture as biology, the genuinely racist note."* Fictional taxonomy is
fine; real-world racial statistics are not.

---

## ⭐ Compatibility is a cost curve, not a gate

The design failure to avoid is a hard lockout: *you need blood, none is
compatible, you die.* Every "no" should be a "yes, but worse."

⚠ **Real ABO is a hierarchy** — O− strictly better as a donor, AB+
strictly better as a recipient. Ported naively across species that is a
**rank**, and the species slate is explicit that hierarchy is the hazard
and *incomparability* is the defence. A universal-donor species becomes
structurally the most valuable person in the room, which also implies
something genuinely grim about that population.

⭐ **So the inter-species graph must not be a partial order.** Make it a
cycle or overlapping clusters: everyone is a universal donor for
*someone*, nobody is universal for *everyone*. Scarcity gets distributed
instead of concentrated — and it means you can never be structurally
hard-blocked, because a donor pool always exists. **The difficulty lives
in the topology, not in a knob tuned nervously.**

The dials, roughly by how much each buys:

1. **Graded failure.** A mismatch inflicts a treatable reaction, not
   instant death — so transfusing the wrong blood and treating the
   hemolysis is a real choice against dying now. Poker, not slots.
2. **The volume-expander floor.** Saline / plasma buy time without
   carrying oxygen. A crude substitute that stabilizes but does not cure
   means you are never blocked, only on a worse clock. **This is the
   actual pressure-release valve.**
3. **Clade threshold.** `race.md`'s Linnaean `Clade` tree already exists:
   compatible within clade, graded across. Same tree
   [lineage](./lineage-slate.md) reads for reproductive compatibility, at
   its own threshold — no new vocabulary.
4. **Frequency distributions.** Flatten the rare types so nobody is born
   into a permanent crisis.
5. **Magic** as the expensive, competence-gated escape hatch.

---

## How you get people to give blood

⭐ **You do not pay them.** Four mechanisms, ordered by how much work
each actually does:

**1. ⭐⭐ The best donor is someone who has needed blood.** Transfusion
recipients and their families are heavily over-represented among real
donors. Mechanically this is nearly free: the chronicle already records
identity-impactful moments, and *"you bled out in the Delve and someone's
blood brought you back"* passes its authoring gate cleanly. **Combat
generates both the demand and the donors.** Build this loop first — it
needs no incentive system at all, just a deed and a clinic that
remembers.

**2. Named demand, not a reward.** Real donation spikes after disasters
because the pull is a *person*, not a payoff. The clinic being short of
O− should be legible — the press ticker, the notification substrate, a
named patient in the ward. That infrastructure exists.

**3. Reciprocity, not payment.** Donors get priority if *they* need
blood. Mutual aid rather than a wage; lands on the cooperative north
star.

**4. Standing, not cash.** `renown_events` is already scoped
per-locality, which is exactly the grain: *known in the dockside as
someone who gives.*

⚠ **Renown is materialized.** Unlike competence and traits, appending to
the log **does not move the figure** — see
[antecedents-slate](./antecedents-slate.md) § *the materialized-standing
trap*. A donation that should raise standing has to move the standing or
force a recompute.

---

## ⭐ Traits — where the thesis actually lives

The trait roster carries `generosity`, `compassion`, `trust`,
`temperance`, `honesty` among its 17. Four of them touch blood, and the
first is the whole design in one line:

**⭐⭐ Payment severs the disposition credit.** A gift mints `generosity`
evidence; a sale mints **nothing**. The ledger refuses to record a
transaction as an act of character. That is motivational crowding-out
stated exactly — in the character system rather than in a supply curve —
and it costs a condition on whether the `ActSignature` carries a
`dispositionValence` at all.

And on the dark side: under a paid system the donor has reason to conceal
at screening, and `honesty` is an axis. **The same act, under two
policies, writes to opposite ends of the character ledger** — gift-only
mints generosity, paid mints deceit. A stronger statement of the thesis
than any supply number, and one the player discovers about themselves
rather than reads in a tooltip.

Three more:

- **`generosity` vs `compassion` are different motivations.** Routine
  unprompted giving is generosity; donating because a *named* person in
  the ward needs it is compassion. One act, two sub-checks — which is
  what `ActSignature` is for.
- **⭐ `trust`, on the receiving side.** Accepting a stranger's blood
  into your body is an act of trust; refusing one while dying is
  paranoia. Free evidence from a moment that already happens, and it
  makes the *recipient* a character beat rather than a passive patient.
- **`temperance` as a gate, not evidence.** Metabolism already tracks
  toxins and blood-alcohol in g/dL. A gluttonous character is
  disqualified at screening — trait consequence arriving indirectly,
  which is the good kind.

**NPC side.** Brains read traits (the `converses` precedent), so a
locality's blood supply becomes a function of its population's character
— a callous neighborhood has a chronic shortage and nobody scripted it.
Trait decay is game-time, so donation reads as a **habit that lapses**,
not a permanent badge.

---

## ⚠ The Titmuss lever — designed-for, NOT v1

Richard Titmuss, *The Gift Relationship* (1970), compared the UK's
voluntary blood system against the then-commercial US one and argued the
voluntary system produced more blood **and safer** blood, because payment
drew donors who had financial reason to conceal disqualifying conditions.
It is the founding case of motivational crowding-out.

⚠ **Economists have contested the supply half ever since, and later field
experiments replicated it unevenly.** That makes it *better* teaching
material, not worse — a live argument beats a settled fact, and the
compact-political-science posture is to teach the dispute.

**The design when it lands:** a locality can legislate a paid market, and
the failure **emerges** rather than being scripted. Payment recruits from
whoever needs money; concealment already exists as a subsystem so donors
can decline to disclose; screening costs money and `medicine` competence.
A bank that pays and skips screening gets contaminated supply. The
historical result reproduced by mechanism.

**⚠ Why it is not v1:** the mechanism only works if **poverty is real in
the economy and correlates with health.** If it doesn't, the result won't
emerge and the temptation will be to fake it — which would be the bad
kind of scripting, and would turn a genuine teachable into propaganda.
Ship gift-only; revisit when the economy can carry it.

v1 should nonetheless keep the seam: **donation records *why* it
happened**, so the disposition-credit rule has something to read on the
day the lever exists.

---

## The economy

Blood is an unusually rich economic object: **perishable,
non-manufacturable, type-segmented.**

⭐ **Perishability is the load-bearing property.** You cannot stockpile
your way out, so demand is permanent and donation becomes a **civic
habit** rather than a quest you complete. Nothing else in the economy has
that shape — there is no recipe, and the only source is a person, so the
supply curve is entirely social.

Consequences worth designing for:

- **Four vocations off one substrate** — phlebotomist, bank registrar,
  screener, and a cold-chain courier (the [freight
  slate](./freight-slate.md)'s perishable cargo). Per
  [vocations.md](../../vocations.md), a vocation exists iff there is
  unmet demand; this creates four at once.
- **A first-class legal object.** Gift-only / paid / unregulated is a
  real legislative choice — see [legal-code-slate](./legal-code-slate.md).
- **A black market if sale is banned**, which the [policing
  slate](./policing-slate.md) already frames as unlicensed governance.
- **Donation cost rides the biological `Reserve`** and recovers over game
  time (real donors wait ~8 weeks), so the anti-farming property is
  **biology rather than a quota**.

---

## v1 scope

**In:**

- ABO + Rh, genotype stored / phenotype derived, `untested` until tested
- per-`Species` allele frequencies + the provenance stamp
- the compatibility graph (non-hierarchical across species), graded
  failure, the volume-expander floor
- draw / store / transfuse over `Bulkable` + the `introduceToxin` seam
- donation cost + recovery on the biological `Reserve`
- the clinic as demand: named shortages, the recipient→donor loop
- gift-only: the chronicle deed, the disposition credit, the renown move
- a `test` for your own type

**Out:** the paid market and its policy lever, the black market, the
courier/cold-chain vocation, plasma/platelet component separation,
disease transmission, and any cross-instance concern.

---

## Open questions

1. **Does blood type interact with anything else, ever?** If transfusion
   is its only consumer it is a lot of machinery for one verb. Candidates
   worth checking early: forensics (a blood trail identifying a species
   or narrowing a suspect pool), disguise, and the belief store.
2. **Shelf life in game-time or real-time?** Renown decays on the game
   clock, participation on real time. Blood is a *world* object, so game
   time — but that couples supply pressure to the clock scale, and
   `setScale` is already known to rescale metabolic rates.
3. **Who holds the inventory?** A Business, a civic office, or a
   `FurnishableRoom` fixture. This decides whether a blood bank can be
   privately owned, which is most of the politics.
4. **Can you refuse a transfusion?** Consent while unconscious is a
   genuinely hard and genuinely interesting problem, and
   [accountability.md](../../subsystems/accountability.md) is the ledger
   that would care.
5. **Do NPCs donate on their own?** The trait-driven answer says yes and
   gives the supply an emergent baseline; it also means NPC transcripts
   and standings start moving without a player involved.
6. **Species with no blood.** `constructa`, `plantae`, and `fungi` clades
   exist. Do they bleed at all, and if not, what does harm's laceration
   behavior do to them today?

---

## What this slate does NOT cover

- **The bleed itself** — harm owns it and is unaffected.
- **Component therapy** — plasma, platelets, and their separate shelf
  lives are a v2 richness, not a v1 requirement.
- **Disease transmission through the supply** — it is the Titmuss
  lever's payload and rides with it.
- **Organ transplant.** Same compatibility instinct, wholly different
  build, and it should not be designed by implication here.

---

## Cross-references

- [harm.md](../../subsystems/harm.md), [vitals.md](../../subsystems/vitals.md),
  [mortality.md](../../subsystems/mortality.md) — the bleed, the vital,
  the death seam
- [metabolism.md](../../subsystems/metabolism.md) — `introduceToxin`, the
  transfusion door; toxins and blood-alcohol at screening
- [bulk.md](../../subsystems/bulk.md) — the bag
- [reserve.md](../../subsystems/reserve.md) — donation cost and recovery
- [trait.md](../../subsystems/trait.md) — the axes the thesis is written in
- [race.md](../../subsystems/race.md) — `Species`, `Clade`, `vitalProfile`
- [lineage-slate](./lineage-slate.md) — the endowment category, the
  genotype model, and where blood type is assigned
- [antecedents-slate](./antecedents-slate.md) — the materialized-standing
  trap the renown reward hits
- [species-slate](./species-slate.md) — costs-not-ranks, and why the
  compatibility graph must not be a hierarchy
