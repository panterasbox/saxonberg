# Tenancy design pack — stewardship of what you don't own

> **Status: design, planner-ready, captured 2026-08-11. Not requirements.**
> Closes a hole *inside* work already written. The
> [residence ladder](./residence-ladder-design-pack.md) ships **two
> non-ownership rungs** (dorm, apartment) and the
> [household pack](./household-design-pack.md) draws the **tenure vs
> domicile** distinction — so a reader of both immediately asks *who is
> answerable for condition when the holder is not the occupant*, and finds
> nothing.
>
> ⭐ **It turns out to be nearly free**, because the attribution constraint
> room-condition already carries is the whole mechanism (Part 2).

See also: [residence-ladder](./residence-ladder-design-pack.md) (**the rented
rungs, and the "landlord reference" it already names**) ·
[household](./household-design-pack.md) (tenure ∪ domicile; the commons
argument this scales) · [room-condition](./room-condition-design-pack.md)
(⭐ **the attribution constraint that pays for this**) ·
[stewardship-doctrine](../../stewardship-doctrine.md) (the recurring-charge
call) · substrates: [parcel](../../subsystems/parcel.md) (`UseGrant`, live) ·
[contract](../../subsystems/contract.md) (escrow) ·
[furnishing](../../subsystems/furnishing.md) + [chattel](../../subsystems/chattel.md)
(the structure/contents split, already modelled) ·
[credit-slate](./credit-slate.md) (the property floor) ·
[diegetic-government §8](../../staging/diegetic-government.md) (**the
shelter** — the floor under eviction).

---

## Part 0 — The gap, and why it is a coherence problem

The ladder's gate is *"the condition of what you already hold."* Its rungs:

| Rung | Tenure | Gate to next |
|---|---|---|
| **Dorm** | granted lease | none — the tutorial |
| **Apartment** | **rented** | money |
| **Townhome** | owned | money **+ condition of the last** |

⭐ Read that third row carefully: **"the condition of the last" means the
condition of the apartment you RENTED.** The ladder already gates ascent on
how you kept somebody else's property — and already names what that is:

> *"This is a landlord reference and a lender's look at how you kept the
> collateral."*

The concept is in the pack. **The mechanism is not**, and neither is any
answer to the obvious follow-up: *why would a tenant tend a place they will
leave?* That is the moral-hazard problem, and it is the reason housing law
exists.

---

## Part 1 — The split already exists in the persistence model

Real tenancy divides responsibility, and the division is what every deposit
dispute is about. The game does not need a new one — **it already stores
things this way:**

| | Who is answerable | Already modelled as |
|---|---|---|
| **The structure** — the room, its fixtures, the roof | ⭐ **the landlord** | the **parcel** and its fixtures |
| **The contents and the mess** — your furniture, your dirt | ⭐ **the tenant** | the **estate slice** ([furnishing](../../subsystems/furnishing.md) persists by owner) + [chattel](../../subsystems/chattel.md) |

> **The estate slice is the tenant's; the room is the landlord's.** That line
> is already drawn by the persistence layer, for entirely unrelated reasons,
> and it is exactly the line tenancy needs.

**Habitability falls out of it.** If a landlord will not repair the roof, the
damp is *structural* and is not the tenant's to answer for. A tenant is
answerable for what they deposited, never for what the building did.

---

## Part 2 — ⭐⭐⭐ Attribution is the mechanism, and it is already required

[room-condition](./room-condition-design-pack.md) already carries this as a
hard build constraint:

> **Deposits and clears must both attribute to the actor** — `(actor, target,
> extent)`, both directions.

That constraint was written for the household commons. **It pays for tenancy
outright:**

- Who made the mess in a rented flat? **The record knows.**
- Was this fixture wear *fair use* or abuse? **The record knows how much use
  and by whom.**
- Did the condition fall during *this* tenancy or before it? ⭐ **`UseGrant`
  already carries `grantedAt`** — so "during this term" is a timestamp
  comparison, not a new ledger.

> ⭐⭐ **No new bookkeeping.** Tenancy is a *query* over records that another
> pack already requires, bounded by a term that the shipped lease row already
> carries.

### ⚠ And it does not violate "aggregate, never report"

The household pack bans a **ranked leaderboard among co-occupants**, and that
stands. A deposit dispute is a different object: a **claim about one extent
over one term**, which is precisely the query that makes the dispute
*resolvable* rather than a shouting match.

**The real-world institution this reproduces is the check-in inventory** —
you record condition at move-in, and the dispute is the **diff**. Snapshot the
condition band at `grantedAt`; the diff at revocation is the claim. One field.

---

## Part 3 — ⭐⭐ Why a tenant tends: three incentives, three different kinds

Moral hazard is only a problem if neglect is free. It is not, and the three
reasons are deliberately of *different kinds*, so a player who shrugs off one
still feels another:

| Incentive | Kind | Mechanism |
|---|---|---|
| **You live there** | **immediate comfort** | filthy rooms cost `restQuality`; a dirty home is lower immunity ([disease](./disease-design-pack.md)) |
| ⭐ **The reference** | **delayed progression** | the ladder gate reads the condition of the place you held — **neglecting a rental blocks your ascent** |
| **The deposit** | **contractual money** | escrow at risk (Part 4) |

⭐ The middle one is the interesting one and it is *already in the ladder
pack*: a tenant who trashes their apartment cannot buy a townhome, not because
a rule forbids it but because the thing that gates ascent is the record of how
they kept what they had.

---

## Part 4 — The deposit: a contract with an escrow leg

A tenancy is **a lease plus a contract**, and both halves ship:

- the **lease** is `UseGrant` — holder, `grantedAt`, `expiresAt`, live and
  gated;
- the **contract** is [contract.md](../../subsystems/contract.md), which
  already ships **clauses over verifiable conditions and escrow**.

> **A security deposit is escrow against attributable damage.** The clause is
> verifiable because Part 2 made it so, and the claim resolves against a
> record rather than a memory.

⭐ **And it is the same substrate as the household pack's roommate
agreement** — one contract vocabulary covering the two domestic instruments a
real adult actually signs. That is the [insurance
slate](./insurance-slate.md)'s scrivener thesis paying off twice.

---

## Part 5 — ⚠⚠ Eviction, and the tension with the property floor

The [recurring-charge call](../../stewardship-doctrine.md) says non-payment's
ceiling is **credit and comfort, never the asset**. The
[credit-slate](./credit-slate.md) property floor says title is **never
seized**. But a tenant evicted for non-payment loses their home — which looks
like exactly what those rules forbid.

**It is not, and the distinction is worth stating carefully:**

> ⭐⭐ **Law 2 bans rent on space you OWN. Rent on space you do not own is
> simply the price** — otherwise renting could not exist at all. And the
> property floor protects **title**. A tenant holds a *term grant*, and a term
> ending is not a seizure.

Three things keep it humane, and all three already exist:

1. ⭐ **You can be evicted but never stripped.** The household pack's safety
   property holds unchanged: your estate slice and your chattel survive
   revocation. `revokeUse` reaps you from the extent; it takes nothing you own.
2. **There is a floor to land on.** [diegetic-government
   §8](../../staging/diegetic-government.md) already designs **the shelter** —
   *"a bed and an address their records can point at."* Eviction has a
   destination, so it is a setback rather than a deletion.
3. **The term is knowable.** `expiresAt` is on the row; nothing expires by
   surprise.

⚠ **Renting is therefore genuinely more precarious than owning — and that is
the lesson, not a bug.** The ladder's lower rungs *should* feel less secure
than its upper ones; that asymmetry is the most honest thing about the whole
progression, and it is what makes reaching the owned rung mean something.

---

## Part 6 — The commons, one scale up

The household pack: *"with one holder condition is a mirror; with two it is a
commons."* A tenement is that argument at twenty — **halls, stairs, the yard,
the standpipe.**

**Common parts are the LANDLORD's obligation, not a metered charge.** Rent
covers them. That keeps the recurring-charge call clean (no standing service
charge, which rule 1 would refuse) and it is honest: a landlord who lets the
stairwell rot is failing their end of the bargain, and a tenant has a *claim*
rather than a chore.

⭐ Which produces the genuinely political version of this pack: **a slum is a
landlord's neglect, not a tenant's.** The condition read over common parts
attributes to the party who owes them, and the record says so.

---

## Part 7 — Designed to the format

**1–2. What it is / composition.** A **query** (attributed events bounded by a
grant term), a **snapshot** (condition at `grantedAt`), and a **contract
clause kind**. No new substrate.

**3. New / updated surfaces.**

| | Work | State |
|---|---|---|
| ⭐ **Condition snapshot at grant** | the check-in inventory — one field on the tenancy | **new (small)** |
| ⭐ **Term-bounded attribution query** | who deposited what, between `grantedAt` and now | **derived — rides room-condition's required events** |
| ✳ **Deposit clause + escrow** | verifiable against the query | **rides [contract](../../subsystems/contract.md)** |
| ✳ **Structure vs contents split** | landlord = parcel + fixtures; tenant = estate slice | **already modelled — no work** |
| ✳ **Habitability claim** | structural neglect attributes to the holder, not the occupant | **the same query, inverted** |
| ⛔ **A standing service charge** | — | **refused — the recurring-charge call** |

**4. Verbs & affordances.** **No new verbs.** `grantUse`/`revokeUse` ship;
the deposit is a contract; the claim is a read.

**5. Persisted fields.** The condition snapshot on the tenancy. Escrow lives
in the contract row. Nothing else.

**6. Seams & dependencies.** ⚠ **Hard: room-condition's actor attribution** —
without it, every claim in this pack is unresolvable. Soft: contract (ships),
the ladder gate, the shelter (content).

**7. Fault line.** The **structure/contents split and the reference incentive
are free today**. The **deposit + inventory** needs room-condition. **Common
parts** wants a multi-unit building, which the city rungs' region-parcel
blocker gates.

---

## Part 8 — ⚠ Dangers

**1. The deposit becoming a scoreboard.** Guarded by Part 2: term-bounded,
extent-bounded, claim-shaped. Never a running tally, never a ranking.

**2. Landlord griefing.** A holder who revokes capriciously. `expiresAt` and
the contract are the guard — and note the asymmetry is *real*, so the answer
is a **claim**, not a mechanic that prevents it.

**3. ⚠⚠ Slum-lording as a strategy.** A player-landlord who never repairs and
pockets deposits. Part 6 is the answer — structural condition attributes to
the *holder* — but this wants watching, because the incentive is real and the
record must be legible to the tenant, not only to the owner.

**4. Precarity fatigue.** The lower rungs are meant to feel less secure, not
miserable. The shelter floor, surviving chattel, and knowable terms are what
keep it on the right side.

---

## Part 9 — Pedagogy

- ⭐⭐⭐ **The security deposit dispute** is the most common legal
  disagreement a young adult has, and here it is **computable** — the record
  knows who deposited what and when. Learning that *documentation settles
  disputes* is worth more than learning any statute.
- ⭐ **Fair wear and tear** — the genuinely contested line between use and
  abuse, made inspectable.
- **Moral hazard**, lived: why people tend what they own more than what they
  rent, and what institutions exist to close the gap.
- **Habitability and the landlord's side of the bargain** — that obligations
  run *both* ways is the half most tenancy fiction omits.
- ⭐ **Why owning differs from renting**, felt rather than told: same room,
  same acts, different security.

---

## Open questions

1. ⭐ **Does the ladder read a rented place's condition at all, or only an
   owned one?** The rungs table implies rented condition *does* gate (the
   townhome reads "the last," which was the apartment). *Lean: it gates* —
   that is the reference, and it is the whole reason a tenant tends.
2. **Is the condition snapshot a band or the full derived read?** *Lean: the
   band* — a dispute is about crossing a threshold, and storing a scalar
   invites false precision about a derived value.
3. **Who arbitrates a contested deposit?** Contracts have a custodian rule;
   courts are deferred. *Lean: the custodian for now*, with the court as the
   later appeal — and note this is the first domestic case that genuinely
   wants a judiciary.
4. **Can a tenant improve a place, and does it count?** Patina says objects
   improve with care; a *rented room* improving raises who owns the
   improvement — real law calls them fixtures and it is genuinely contested.
   *Lean: defer*, but flag it, because [patina](./patina-design-pack.md) makes
   it askable for the first time.
5. **Does a subletting tenant become a landlord?** The grant model permits it
   structurally (a grant holder issuing a grant). *Lean: allow, and let the
   chain of obligations be the interesting part* — it is how real tenancies
   actually stack.
