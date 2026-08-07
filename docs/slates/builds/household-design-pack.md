# Household design pack — the shared holding, and condition as a commons

> **Status: design, planner-ready, captured 2026-08-06. Not requirements.**
> The stewardship pillar's unit of analysis is **the household**, and every
> household in the family so far has exactly one person in it. This pack
> designs the multi-occupant case — roommates, spouses, a commune — and finds
> that it needs **no new primitive**. Same per-object format as the
> [room-condition](./room-condition-design-pack.md),
> [spoilage](./spoilage-design-pack.md) and
> [residence-ladder](./residence-ladder-design-pack.md) packs.

See also: [stewardship-doctrine](../../stewardship-doctrine.md) (the pillar) ·
[residence-ladder](./residence-ladder-design-pack.md) (**the direct parent** —
the ascent gate this pack makes multi-occupant) ·
[room-condition](./room-condition-design-pack.md) (⚠ **carries one hard
constraint from this pack** — Part 9) ·
[stewardship-slate](./stewardship-slate.md) (land use, the ladder) ·
substrates: [parcel](../../subsystems/parcel.md) (**title + grants — the whole
structural answer**) · [residence](../../subsystems/residence.md) +
[civics](../../subsystems/civics.md) (**domicile**, derive-on-read residency) ·
[contract](../../subsystems/contract.md) (the money half) ·
[chattel](../../subsystems/chattel.md) +
[furnishing](../../subsystems/furnishing.md) (dissolution) ·
[grouping](../../subsystems/grouping.md) (co-ownership) ·
[banking](../../subsystems/banking.md) ·
[advancement](../../subsystems/advancement.md) (the individual half) ·
[access](../../subsystems/access.md). Rulings honored:
[diegetic-government §9](../../staging/diegetic-government.md) (**marriage**) ·
[credit-slate](./credit-slate.md) (the property floor) ·
[insurance-slate](./insurance-slate.md) (the scrivener thesis) ·
[gazette-slate](./gazette-slate.md) (*aggregate, never report*) ·
[motivation lens](../../lenses/motivation.md) (cheap exit).

---

## Part 0 — What it is: with one holder a mirror, with two a commons

Property condition is a **derived read over a holding's extent**
([residence-ladder](./residence-ladder-design-pack.md) Part 1). With a single
occupant that read is a mirror: it reflects your own acts back at you, and
tending it is a conversation with yourself.

> ⭐⭐⭐ **Add a second occupant and the same read becomes a commons.** Both
> deposit into it; either can restore it; one number describes both. Individual
> acts and individual costs decouple from the shared state — which is the
> textbook setup for free-riding, at the smallest and most legible scale there
> is.

That is the whole design object. It is also, not incidentally, the domestic
labor argument — and this engine can compute it, because the ledgers already
record who did what.

⚠ **The one thing to carry away if nothing else survives:** the room-condition
build has not happened yet, and **every claim in this pack depends on care acts
attributing to the actor** (Part 9). Cheap to get right up front, expensive to
retrofit.

---

## Part 1 — ⭐⭐⭐ The structural finding: two sets, not one, and both already exist

A household needs no record, no group kind, no membership roster, and no
join/leave verb. Two **derive-on-read** sets already ship, and the design is
entirely about the fact that they are *different sets*:

| Set | Derived from | Answers | Governs |
|---|---|---|---|
| **Tenure** | `ParcelRecord.owner` ∪ active `grants[]` | who has the **right** to be here | eviction, the ladder gate, the property floor, `AccessApi` |
| **Household** | **domicile** — the characters whose residence seam points at this extent | who actually **lives** here | the condition commons, deposits, the shared bill |

> ⭐⭐ **They overlap and are not the same set, and the gap between them is
> where every interesting case in this pack lives.**

- A group-owned house where three of five members live elsewhere: five hold
  tenure, **three are not in the household**. Their acts do not deposit; the
  commons is not theirs.
- A spouse on neither the title nor a grant who lives there: **in the
  household, with zero tenure.** Full participant in the commons, no security
  whatsoever. That asymmetry is real, teachable, and must not be smoothed over
  (Part 8).

**Both reads ship.** `civics.md` already derives residency **by domicile** —
*"nothing confers residency, no rows are stamped; `residentOf` derives the
chain."* Tenure rides `ParcelApi` on the coverage walk `ownerOf` already does.
The household read is a new **surface** on `ParcelApi` (`householdOf(extent)`),
never a new Api — concepts ride existing facades.

### The tenure substrate is built, and the doc says otherwise

Verified in code, 2026-08-06:

- `ParcelRecord.grants: UseGrant[]` is a **live** array —
  `{kind, holder, grantedAt, expiresAt}`, holder-keyed, one grant per holder,
  replace-on-regrant.
- `ParcelRegistry.grantUse` / `revokeUse` / `hasUseGrant` are **built, gated
  (`ParcelApiCallers`), sandbox-guarded, and persisted**. Expiry is honored
  (`ParcelRecord.hasActiveGrant(record, holder, now)`).
- `revokeUse` already **reaps a revoked occupant from the extent's sandbox
  circle** — eviction has an implemented consequence path.
- `heldUnitOf(holder)` is the reverse index (⚠ with a v1 assumption — Part 7).

> ⚠ **`parcel.md` still calls `grants[]` an "INERT 0a seam."** That is stale —
> 0b landed. A doc fix for whoever is next in that file; the design below
> assumes the built behavior.

### The two shapes of household are the two shapes of tenure

`ParcelOwner` is **single-valued** (`{kind:'player'}` | `{kind:'group'}`), so
two players cannot both hold title *as individuals*. A group can — and a group
holding title **is** what a marital estate legally is. So both shapes are free
today:

| Household shape | Substrate | Real-world analogue | Character |
|---|---|---|---|
| **Roommates; a spouse off the title** | one `owner` + N `grants` | a lease | asymmetric, revocable, term-bounded |
| **Co-owners** | `owner: {kind:'group'}` over a managed group | joint tenancy | symmetric, not unilaterally revocable |

⭐ The difference between those two rows is a **genuine property distinction**
players can feel and learn from, not an implementation artifact. And **N > 2 is
free** — three roommates, a commune, a guild house are the same two reads.
"Two-person" is the smallest interesting case, never the model.

---

## Part 2 — ⭐⭐⭐ The commons, in three lines

> **Condition is collective. Competence is individual. The exit is always
> cheap.**

| | Read | Scope | Why |
|---|---|---|---|
| **Property condition** | one derived read over the extent | **collective** | both occupants deposit into it; that *is* the commons |
| **Stewardship transcript** | `transcripts` / the Discipline | **individual** | the ledgers know who cleaned; living with a slob never stalls your competence |
| **The ascent gate** | household condition ≥ band | **collective**, but **exitable** | a shared holding below the band blocks the *household's* next rung — never your own progression, because moving out is one act |

Splitting the **gate** (collective) from the **transcript** (individual) is what
makes this humane rather than punitive, and it costs nothing: those two ledgers
are already separate systems.

The exit clause is the [motivation lens](../../lenses/motivation.md)'s *"chosen
hafta, cheaply exitable"* applied to a housemate. A co-occupant's neglect can
cost you a **shared ambition**; it can never hold your advancement hostage.
That is what keeps the whole feature inside Law 2 — and note the shape it
inherits: property condition's two biggest inputs are **act-deposited and
freeze in absence**, so a household does not rot while its members are away.
Presence is still never the meter, for either of them.

---

## Part 3 — ⭐⭐ The who-did-what read: aggregate, never report

Care acts are acts, so the split is **inherently visible** — the chronicle
publishes deeds, and participation/authoring events carry an actor. There is no
honest way to pretend the record does not exist. The line to draw is the
[gazette slate](./gazette-slate.md)'s, verbatim:

> ⭐⭐ **The household AGGREGATES; it never REPORTS.**

| Surface | Ships | Why |
|---|---|---|
| Household condition | ✅ | the point of the whole pillar |
| **Your own** contribution, in your own transcript | ✅ | it is your competence; you can always see what you did |
| The walkable event record | ✅ (already) | deeds are public by construction |
| ⛔ A ranked per-person split ("you did 27%") | **never** | a scoreboard in a domestic relationship is a weapon |

In life the accounting is *available* and asking for it is a **move**. Keeping
that true is both more honest and far less weaponizable than either extreme —
and it needs no mechanism at all, only the discipline not to build the
leaderboard.

---

## Part 4 — The money half is the contract substrate

Premises obligations — utilities, parcel tax, the shared bill — are the
**second commons**, and free-riding on the bill is structurally the same
problem as free-riding on the cleaning. It needs no new mechanism:

> **A roommate agreement is a contract**, and
> [contract.md](../../subsystems/contract.md) already ships clauses over
> verifiable conditions, escrow, the board, and the custodian rule.

⭐ This may be the **most pedagogically valuable contract in the game**, because
everyone has had a bad one — and it is the [insurance
slate](./insurance-slate.md)'s scrivener thesis landing exactly:

> *"The advocate argues AFTER the dispute. The scrivener writes BEFORE it…
> this world makes the second more important than real life does, because here
> the clause actually runs."*

A clause like *"each holder keeps the premises above `well-kept`"* is
**verifiable against a read that already exists** — which is the property that
makes the household the natural first customer for contract clauses over
derived state.

**Joint accounts** stay where the marriage ruling put them: an opt-in through
the real [banking](../../subsystems/banking.md) substrate, on its own consent
terms, behind the sealed `postTransaction` chokepoint. **No household money
mechanism** — no shared purse, no household balance, no new leg kind.

---

## Part 5 — Dissolution is already computed

Furnishing persists **by owner** (the estate slice); chattel stamps
**per-instance** ownership with a chain of title. So on move-out you take your
own estate slice and your own chattel, and:

> **No divorce algorithm is needed — the split is a fact of the record, not a
> judgment.**

Only **jointly acquired** property is genuinely contested, which is precisely
what a contract clause covers, or failing that a court (deferred).

> ⭐⭐ **And this is a SAFETY property, not a convenience.** A person holding a
> grant rather than title can be **evicted**, but cannot be **stripped** —
> their possessions survive the revocation by construction. Preserve that
> property under any future change to eviction; it is load-bearing for Part 8.

---

## Part 6 — Marriage: the same primitive, plus what you opted into

Mechanically a married couple and two roommates are **identical**, and that is
the design rather than a shortcut. The difference is entirely the bundle:
joint title (a group owner), a joint account, mutual grants, and a registry
record.

This honors [diegetic-government §9](../../staging/diegetic-government.md)
exactly — *"a Terminus institution, full stop; ceremony = content, record =
city-registry entry, effects = whatever the couple opts into through real
substrates, each on its own consent terms"* — and it states the pedagogy
cleanly:

> ⭐ **Marriage is an inspectable bundle of separately-consented arrangements,
> not a magic status.** Two roommates who opt into everything have the same
> rights; a married couple who opt into nothing have none.

It also dodges every content landmine: the game never asserts what marriage
means, who may enter one, or what it obliges. The registry record and the
substrate opt-ins are the entire mechanism.

---

## Part 7 — Designed to the format

**1–2. What it is / composition.** Two **derived reads** (tenure, household) and
one **policy split** (collective gate / individual transcript). No new Stuff, no
new mixin, no new record, no new Api.

**3. New / updated surfaces.**

| | Work | State |
|---|---|---|
| ⭐ `ParcelApi.householdOf(extent)` | the domicile ∩ extent read | **new (derived, small)** |
| ⭐ Ascent gate over a household holding | + the leave-and-ascend-alone exit | **new (a predicate + a flow)** |
| ✳ Household contract clauses | condition-band, premises-share | **rides [contract](../../subsystems/contract.md)** |
| ✳ Co-ownership | a managed group as `ParcelOwner` | **ships** ([grouping](../../subsystems/grouping.md)) |
| ✳ Move-in / move-out | `grantUse` / `revokeUse` | **ships** |
| 🧹 `parcel.md` "inert `grants[]`" claim | stale — 0b landed | **doc fix** |

**4. Verbs & affordances.** **No new core verb.** Move-in/out is a grant
operation on the existing tenancy flow; the care verbs belong to the producers
(`clean`/`repair`); the agreement is a contract action. If a household ever
wants a name ("the Smith residence") that is
[address](../../subsystems/address.md) work, not a verb.

**5. Persisted fields.** **None new.** Tenure is `owner` + `grants[]` (ship);
domicile is the residence seam (ships); condition is derived; the agreement is a
`contracts` row.

**6. Seams & dependencies.** Hard: **room condition** (unbuilt — Part 9) and the
**residence ladder** (its ascent gate is what this pack makes multi-occupant).
Soft: contracts (ships), chattel + furnishing (ship), banking (ships), civics
domicile (ships).

**7. Fault line.** The **two reads + the gate split + the safety property** are
a near-term slice the moment room condition lands. **Household contract
clauses** are a separate, later build riding the contract substrate. **A named,
addressable household** is a third, and optional.

---

## Part 8 — ⚠ Three dangers, stated so they are not discovered

**1. Grief.** A housemate who deliberately trashes a shared home. The
mitigations are already doctrine-consistent: a shared home is exclusive-use, so
`UseGrant` **is** the [anti-grief lease shape](./stewardship-slate.md), and
`revokeUse` already reaps the occupant. The commons is recoverable by one act
of care; nothing is destroyed.

**2. ⚠⚠ Coercive control.** A household where one party holds title, controls
access, and can evict is modeling something with a dark real-world version.
**The design must never make coercive control mechanically rewarding.** The
existing guardrails are the right ones and should be treated as constraints
rather than incidental properties:

- the **property floor** — title is never seized ([credit-slate](./credit-slate.md));
- the **cheap exit** — leaving is always one act;
- **chattel survives eviction** (Part 5) — you can be put out, never stripped;
- **no mechanical advantage** accrues to holding another player's tenure.

**3. The double nag.** Two occupants means two surfaces to notify about one
dirty floor. *"Care is fought, never watched"* applies twice as hard here; the
household read must not become two notification streams.

---

## Part 9 — ⭐⭐⭐ The one hard constraint on the room-condition build

Room condition is designed and **unbuilt**. When it lands:

> **Care acts must ATTRIBUTE to the actor, not merely mutate the room.**
> `clean` / `repair` emit an event carrying who performed it.

Everything in this pack rests on it — the individual transcript (Part 2), the
aggregate read (Part 3), and any contract clause over who kept the premises
(Part 4) are all unreachable without actor attribution. It is nearly free to
include at build time and expensive to retrofit onto a producer that only
mutates state.

**This constraint belongs in the
[room-condition pack](./room-condition-design-pack.md) regardless of whether
this pack is ever built.**

---

## Part 10 — Pedagogy

- ⭐⭐ **Collective action, at the most legible scale there is.** Free-riding on
  a shared resource, at N=2, in a space the player lives in. Every economics
  course teaches the commons with fisheries; this teaches it with dishes.
- ⭐ **The written instrument that actually runs** (Part 4) — the scrivener
  thesis, applied to the one contract every adult eventually needs.
- **Title vs tenancy.** The difference between owning and living somewhere,
  with real consequences attached, is among the most useful property lessons
  available — and the vulnerability of the untitled occupant is *the* thing
  people learn too late in life.
- **Marriage as a bundle** (Part 6) — institutions are inspectable, and their
  contents are separately consented.
- **The second invisible-labor asymmetry.** The
  [doctrine](../../stewardship-doctrine.md) pillar already renders the *across-
  the-wage-boundary* case (the same acts pay in another's home, not your own).
  The household renders the *within-a-home* case: labor that is real, recorded,
  and structurally uncounted.

---

## Interop map

- **[Residence ladder](./residence-ladder-design-pack.md)** — the parent; this
  pack makes its ascent gate multi-occupant and adds the exit clause.
- **[Room condition](./room-condition-design-pack.md)** — the deposit producer,
  and the carrier of Part 9's constraint.
- **[Parcel](../../subsystems/parcel.md)** — tenure: `owner` + `grants[]`, the
  built lease surface, the coverage walk.
- **[Civics](../../subsystems/civics.md) / [residence](../../subsystems/residence.md)**
  — domicile: the occupancy half of Part 1, already derive-on-read.
- **[Contract](../../subsystems/contract.md)** — the agreement; first real
  customer for clauses over derived state.
- **[Chattel](../../subsystems/chattel.md) + [furnishing](../../subsystems/furnishing.md)**
  — dissolution and the safety property.
- **[Grouping](../../subsystems/grouping.md)** — co-ownership via a managed
  group as `ParcelOwner`.
- **[Advancement](../../subsystems/advancement.md)** — the individual half of
  the collective/individual split.
- **[Vocations](../../vocations.md)** — a household is the paid steward's
  *customer*. ⚠ The "homemaker" decomposition (the register's ⭐⭐⭐⭐
  *decompose, never accept or reject wholesale* applied to domestic work — it
  fails criterion 2 wholesale, and yields **diagnosis + capacity** as the real
  vocation) is a **separate register edit, not made here.**

---

## Forks settled, and the blockers

**Settled:**

1. **Household = two derived reads** (tenure ∪ domicile), no new primitive.
2. **Co-ownership = a managed group as `ParcelOwner`** — no new owner kind.
3. **Condition collective / competence individual / exit cheap** (Part 2).
4. **Aggregate, never report** — no ranked split, ever (Part 3).
5. **The money half is contracts**; no household purse.
6. **Dissolution is the record, not an algorithm**; chattel survives eviction.
7. **Marriage = the same primitive + opt-ins + a registry record** — the
   existing ruling stands unchanged.

**Blockers:**

- **Room condition is unbuilt** — the deposit producer this pack aggregates.
  Nothing here is testable before it lands.
- ⚠ **Multi-residence.** `heldUnitOf` carries a v1 assumption (*"a player leases
  at most one dorm"*), and `civics.md` defers **primary-home designation**. A
  player holding both a dorm and a share of a house hits that gap directly —
  which makes multi-residence a **prerequisite for the city rungs**, not a
  nicety.
- **The city ladder's own blockers** (region parcels, the allowance meter) are
  inherited unchanged from the residence-ladder pack. The **frontier** shared
  holding is unblocked.

---

## Open questions

1. ⭐ **Is a two-member managed group too heavy for co-ownership?** It works
   today, but a marital estate showing up beside guilds and parties in group
   surfaces may read wrong. *Lean: acceptable* — a household **is** a legal
   entity, and making that visible is honest — but worth a look at how
   `GroupApi` surfaces it before committing.
2. **Does an expired grant silently drop you from the household?** Tenure says
   yes (`hasActiveGrant` honors expiry). Domicile probably should not follow
   automatically — being locked out is not the same as having moved out, and
   the difference matters for exactly the vulnerable occupant of Part 8.
   *Unresolved, and it is the sharpest small question here.*
3. **Should a household be addressable/nameable** ("the Smith residence")?
   [address.md](../../subsystems/address.md)'s Locality tier could carry it.
   *Lean: later* — pure flavor until something reads it.
4. **How does the condition read weight across occupants?** *Lean: it does not*
   — one limiting-factor min over the extent, per the residence-ladder pack.
   Per-occupant weighting rebuilds the scoreboard Part 3 rules out.
5. **Does the ladder gate read the household holding, or a member's best
   holding?** *Settled as household* (Part 2), but revisit if a player can
   legitimately hold two residences (blocker 2).
