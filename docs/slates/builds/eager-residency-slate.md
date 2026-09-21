# Eager residency slate — who may keep a thing loaded while nobody is looking

> **Status: PARTIAL** — the mechanism shipped, the policy did not: the pin (`pinsResidency`
> → the `chattel` row → one roll at boot, the owner's login as the other
> ask) landed in the pets build (MR !257, D22). It admits **every** pin
> (re-verified 2026-09-19: `ResidencyLogic.pinNow` reads no tier and no
> allowance; `Bonded.canEvict` still vetoes any stamped, living animal
> outright; `ParcelRecord.allowance` is an inert seam).
> **Left:** ⭐⭐ the **two tiers of account** and the may/may-not table +
> the recency-consumer ceiling ·
> the **three-party admission** (object · owner · parcel) over the property
> slate's allowance + the commons budget line · the **degradation order**
> under pressure · the pin
> **lapsing** (the veto learning to let go) · the keyless good in a public
> room (a / b / c) · the never-fault doctrine written into a gate
> **Size:** **a build** — it touches residency, chattel, the estate, the
> parcel allowance (inert today), civics, and the mirror

**Captured 2026-09-17**, in review of the pets MR, when the user asked
what loads a pet if not its house — and then asked to be honest about
what that is.

**Provenance:**

> **User: "everything in the game is lazy loaded if we can help it, so
> something needs to load before the pet in order for the pet to load.
> first instinct would be the owner, but then if the game reboots, your
> pets don't get created until you log in. if we're trying to simulate
> care then that's a hole."**

> **User: "whenever I think swap I think there be dragons. so let's be
> honest about what we're proposing."**

> **User: "I actually want to be very explicit about the fact that we're
> creating two tiers of users. we need to be very transparent about how
> and why people are promoted or demoted and what membership in one tier
> or the other is allowed to mean, or more importantly not allowed to
> mean. remember that every user is also a maker and a funder so they're
> represented three ways at the account level."**

> **User: "a residence is still part of a locality, e.g. hinkley hills,
> and the committee that manages hinkley hills parcel and its runtime
> limits is gonna wanna have a say in what gets loaded into mem
> eagerly."**

**Sits on:** [residency.md](../../subsystems/residency.md) (the unload
half, and now § the load half) ·
[property-slate](../tails/property-slate.md) (§ the compute model — count
heartbeats; § enforcement is dormancy; § governance — scarcity is a
tuned policy) · [measurement.md](../../measurement.md) (the three
layers; Tier C's *disenfranchisement by inactivity*; the surveillance
edge) · [chattel.md](../../subsystems/chattel.md) ·
[furnishing.md](../../subsystems/furnishing.md) (the estate, D3/D4) ·
[civics.md](../../subsystems/civics.md) (a Locality's jurisdiction) ·
**compute is a metaresource** — machine-level, outside the
fiction, subdivided by parcels; never themed.

---

## 1. The question, and the answer that decides the rest

*The answer (whatever needs to observe X; the emit set) shipped and is
stated in `residency.md § The load half — the residency pin`.*

That set is the opt-in, and it is not "eager with the estate": it is
**the load half of residency**, the mirror of `canEvict`. The pets build
shipped the mechanism under that reading; this slate is everything the
mechanism deliberately does not decide.

## 2. ⭐ Honest about what it is: pinning, not swap

*The pager table (page-in at boot + login, page-out the cold-tail sweep,
no pressure policy) shipped as stated — `residency.md § The load half`
→ "Pinning, not swap", and `§ Deferred` (memory pressure).*

⚠⚠ **The never-fault rule.** The pets build tried "a room, on load, asks
the index who stands in it" (D21) and reversed it the next day: 439
indexed point queries at boot, the room scan wearing a different face.
The moment somebody wants *"the neighbour walks onto the lane, so load
the lane's cats"*, the design has become demand paging and a third face
of the same scan. **A gate should say so**: no `postRegister`, no
`materialize`, no traversal may call `standUpKeyed` or read `placedIn`
for goods it does not persist itself. The four self-persisting location
classes' D4 overlay is the one sanctioned exception and it is bounded by
construction.

## 3. ⭐⭐ Two tiers of account — what membership may and may not mean

The tier is a **layer 1 measurement** (`measurement.md`): the engine
counts recency and nothing else. Whether anything follows is **Tier C**
— *disenfranchisement by inactivity* is already on that list — so the
threshold and the consequence are the polity's, and the build ships a
default.

**The rule:**

- **Mechanical, published, symmetric.** *Active* = logged in within *N*
  days (default to ship: 14). Login promotes **instantly and
  completely**; *N* days of silence demotes. No committee decides it,
  nobody can be demoted early or held active late.
- **Visible to you, and to nobody as a judgment.** The mirror shows it
  (*"your estate has been dormant since the 3rd"*). It is **not a
  deed**: it never enters the chronicle, renown, trait, or participation.
- **The signal is a login timestamp, not standing activity** — open
  (§ 8): the user asked whether the polity should key on something it
  can already see. A raw timestamp is the least gameable and the least
  meaningful; standing activity is the reverse.

**What dormancy is allowed to mean:** your pinned goods lose their pin.
That is the whole list. Their clocks keep running; they integrate the
absence when you return (*difficult, not feral* — already the design);
nothing is lost, nothing is moved.

**What it is NOT allowed to mean — the three representations, explicitly:**

| you as | dormancy may not touch |
|---|---|
| **player** | standing, vote, title, tenure. Your lease clock runs on the shell clock (`holding.md`) exactly as before; dormancy does not evict you from a residence — **insolvency** does, through the tenure contract, a different act |
| **maker** | your authored content. A row you wrote in Hinkley Hills is Hinkley Hills' — warmed by the parcel it stands in, charged to that parcel. The property slate's *un-fuse author from owner* is exactly this: a maker going quiet must not dim a town |
| **funder** | anything. Standing conferred by funding has no residency dimension, and the tier may never be read by anything that computes standing — not a tie-breaker, not a weight, not a filter. This is the surveillance edge `measurement.md` flags: the engine may *count* recency; nothing but the pin may *consume* it |

⭐ **A gate for the last row:** the recency read has one consumer
(`ResidencyLogic`), and `lint:unconsumed-seams`'s cousin should refuse a
second — census-then-ratchet at a ceiling of one.

## 4. ⭐ Three-party admission — the committee's say

The property slate's Layer B: **count heartbeats, not instructions**. A
cadenced brain is the expensive thing, and its cost depletes *the
parcel's allowance*. A pinned cat is a cadenced brain standing on
somebody's ground. So the pin on the object is a **request**, and three
parties agree before it is honoured:

1. **The object** opts in — `pinsResidency()`, the class saying *I emit
   while unobserved*.
2. **The owner** is active — § 3.
3. **The parcel admits it** — the locality's allowance policy, over the
   ground the good stands on.

**Where the good stands decides whose allowance it draws.** At home, the
owner's own parcel — nobody else's business. On the lane, Hinkley
Hills', and the committee holding that parcel sets policy: whether
owner-pinned chattel is admitted at all, how many, at what cadence
floor. That is Tier C's *allowance cascade* — the same lever as zoning,
and the same doctrine: *zoning exists because of density, not order*.

**The commons.** A cat pinned in an unowned public lane draws on the
treasury-subsidised commons allowance (the Dave's-Bar deficit-mint
precedent, `reserve mint` governor-gated). *How many stray pets does the
town carry* becomes a municipal budget line, which is where it belongs.

**Degradation order, under pressure.** Layer A: over-budget parcels
degrade first. *Within* a parcel the order is the committee's; the
default to ship is **visitors' pinned chattel before the parcel's own
content** — Hinkley Hills' shopkeeper keeps her brain before somebody's
cat does. Degrade = the freeze pattern (brains quiescent), then the
lapse (§ 6), never a destruct.

## 5. The house — dissolved, and the hearth that would reopen it

The user asked what loads a residence while the player is away, and
whether that needs to happen at all. Under § 1 it does not: nothing in a
house needs to emit, so nothing loads it; a pinned cat at home pulls its
room in by its own `place`, and the room does nothing. The day something
in a house must be *seen* happening while the owner is away — a hearth
burning down, a still running over — **that object opts in**, not the
house. Persisting the container stays the rare, expensive model the four
location classes already are.

## 6. The lapse — the veto learning to let go

Today a stamped, living animal vetoes eviction outright
(`BondedMixin.canEvict`), which with the roll means *pinned forever once
loaded*. That is the KeptAnimalRegistry policy on a better instrument,
and it is honest for launch scale; it is not the design. The lapse is:

- the veto reads the pin, and the pin reads §§ 3–4 — a dormant owner's
  cat, or one a parcel has stopped admitting, is *eligible*;
- eligibility is not eviction: the cold-tail sweep takes it only when
  cold, and never mid-scene;
- the row's `pin` stays written — a lapsed pin is a fact about the
  *owner's tier* and the *parcel's policy*, not about the good, and the
  next promotion re-honours it without a write.

## 7. The keyless good in a public room — the gap the pin does not close

A chair dropped on a public lane is carried in its owner's estate with
`place = lane`, and — since the lane never materializes a record — nothing
ever stands it up: not the room (never-fault), not the owner's login
(only keyed entries are asked for there). Pre-existing, and now
*deliberately* pre-existing. Options, for the build: (a) the owner's
login stands up **every** room-placed entry, lazy-loading the rooms it
names — bounded by the estate, no room work, but "logging in loads every
room you left something in"; (b) a keyless good in a non-persistable
room is **swept to storage** on the room's eviction, so it is never lost
and never invisible, only *put away*; (c) leave it, and let the lane's
`cast:` answer supply. The user's philosophy leans (b): *the containable
remembers where it spawns*, and *storage is the absence of a placement*.

## 8. Open questions

1. **The demotion signal** — login timestamp (least gameable) or a
   standing-activity read the polity can already see (more meaningful,
   and a measurement consumer § 3 forbids)? The user raised it; not
   decided.
2. **Where the pin is honoured** — the roll (boot-time, all owners) vs
   per-owner at their promotion. Ship both; the roll is bounded by
   *active* owners once § 3 lands.
3. **Is a `pin` on the chattel row the right index long-term**, or does
   the estate become the index once § 7(a) is chosen? The row is
   already the containable-side record and the partial index is exactly
   the pinned set; the estate would make the roll ∝ owners.
4. **The commons' budget line** — who sets it, the Locality or the
   realm? Civics: a Locality declares its jurisdiction; the treasury is
   the realm's.

## 9. What the build looks like

- **W0 — the gate.** Never-fault as a lint (`standUpKeyed` / `placedIn`
  callers censused and ratcheted to today's set); the recency-consumer
  ceiling of one.
- **W1 — the tier.** `lastSeen` on the account (layer 1); the mirror
  line; `ResidencyLogic.pinNow` filters by it; `Bonded.canEvict` reads the
  pin's standing rather than the stamp. Default *N* as an `AppSettings`
  key, Tier C-amendable.
- **W2 — the parcel.** `pinNow` asks `ParcelApi` whether the place's
  parcel admits, over the allowance field the property slate makes live;
  the commons line; the in-parcel degradation order as a Locality
  declaration.
- **W3 — the keyless good** (§ 7), whichever the requirements choose.

Pets is the exemplar the build cites; it should not be the thing that
ships the policy.
