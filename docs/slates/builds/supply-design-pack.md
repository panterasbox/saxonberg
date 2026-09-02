# Supply design pack — one model for every source, water and power alike

> **Status: design, planner-ready, captured 2026-08-11. Not requirements.**
> **⭐ PARTLY SHIPPED 2026-09-02** — the water build took the **failure
> vocabulary** whole (Part 3's six words are now
> `lib/supply/SupplyState.ts` in the kernel, precedence order included,
> with `Conduit` the first reporter) and the sync/async blocker below is
> **resolved** (a promise-coalesced restamp on `CultivableMixin`, not a
> new seam). The unified source model, the rivalry axis and the power
> half are unbuilt; this pack stays the reference for them.
> Asks one question: **do a tap, a well, a standpipe, a rain cloud, a
> substation and a socket ride the same model and present the same
> experience?** Today they do not — there are two source mechanisms, three
> unmodelled axes, and no shared vocabulary for *why nothing is coming out*.
> This pack unifies the layer that can honestly be unified, and says which
> layer must stay split.
>
> ⚠ **It also resolves a blocker.** The [water pack](./water-design-pack.md)'s
> rain edge stalled on a sync/async seam (Part 4); the general answer here is
> what unblocks it, which is why this was designed first.

See also: [water-design-pack](./water-design-pack.md) (the first consumer) ·
[power-utility-slate](./power-utility-slate.md) (**the supply-ref this
generalizes**) · [stewardship-doctrine § the recurring-charge
call](../../stewardship-doctrine.md) (what may be metered) ·
[household-design-pack](./household-design-pack.md) (**the commons argument,
reused at Part 3**) · substrates:
[bulk](../../subsystems/bulk.md) (`UnboundedSourceMixin`) ·
[electricity](../../subsystems/electricity.md) (`EnergizedMixin`) ·
[reserve](../../subsystems/reserve.md) · [weather](../../subsystems/weather.md) ·
[address](../../subsystems/address.md) (the locality resolve) ·
[husbandry](../../subsystems/husbandry.md) (the sync reconcile that forced
Part 4) · [delivery-slate](./delivery-slate.md) (*coverage is legal,
connection is physical*).

---

## Part 0 — What a "source" is today

| Thing | Mechanism | Yields | Depth |
|---|---|---|---|
| dorm tap, Hinkley standpipe, coffee urn | `UnboundedSourceMixin` on a `Bulkable` | **matter** (L) | **∞** |
| live wire, stun baton, lightning, the deferred socket | `EnergizedMixin` | **a potential** (V) | n/a — a field, not a stock |
| soil moisture | a `Reserve` on `CultivableMixin` | matter (L) | finite, refilled by `waterPlant` |
| rain | — | — | **nothing; unconnected** |
| `conjure-water` | a spell | matter | minted |

Two mechanisms, and the gap between them is not an oversight.

---

## Part 1 — ⭐⭐⭐ The finding: two physics, one supply question

> **Do NOT unify the substance.** A bulk source yields **matter you carry
> away** — take a litre and you *have* a litre, conserved. An `Energized`
> source imposes a **potential** that a conduction walk reads across
> contacts; nothing is carried and nothing is conserved by the same
> arithmetic. Collapsing them into one mixin would be wrong physics, and the
> codebase is right to keep `UnboundedSourceMixin` and `EnergizedMixin`
> apart.

What *is* common — and what a player actually experiences — sits one layer
up, and it is a single question:

> ⭐⭐⭐ **"Is anything coming out of this right now, and if not, why not?"**

That question is identical for a tap, a well, a standpipe, a socket and a
substation. **That** is the layer to unify: not what a source *is*, but
whether it is **supplying**, what it **depends on**, and how it **fails**.
The [power slate](./power-utility-slate.md) already reached for exactly this
and called it the **supply-ref**; this pack generalizes it across utilities
and pins down the two things it left open — where the ref is *resolved*, and
how a consumer *reads* it.

---

## Part 2 — The five axes, and the three nobody models

| Axis | Values | Modelled today? |
|---|---|---|
| **Yield** | matter · potential | ✅ the two mechanisms |
| **Depth** | ∞ · finite-regenerating · finite-fixed | ◐ **only ∞ and plain-finite**; the regenerating well is named as deferred in `UnboundedSourceMixin`'s own docstring |
| **Gate** | always · switchable · seasonal · conditional | ◐ `SwitchableMixin` gates an `Energized` source; nothing gates a bulk one |
| **Dependency** | standalone · fed-by-an-upstream | ⛔ **nothing** — no source has ever depended on another |
| ⭐ **Rivalry** | private · shared-rivalrous · shared-non-rivalrous | ⛔ **nothing** — every source is ∞ (non-rival by construction) or privately owned |

**Dependency** and **rivalry** are the two real holes, and they are the two
that make a source *shared* rather than merely present.

---

## Part 3 — ⭐⭐ The missing axis is RIVALRY, and it is the household commons again

A tap that is `∞` is **non-rivalrous by construction**: my drawing from it
cannot affect yours. Every source in the game today is either that or
privately held. So **the village well does not exist** — a source several
people draw on, that can be drawn *down*.

That is the same design object as the [household
pack](./household-design-pack.md)'s shared property condition, one scale up,
and the corpus already ruled on how to guard it:

> **Anti-grief guards: exclusive → LEASE, common-pool → QUOTA.**

A shared home is exclusive-use, so it takes a lease (`UseGrant`). **A shared
well is a common pool, so it takes a quota** — a per-drawer cap over a
window, not a lock. That distinction is already doctrine; this pack just
points it at water.

> ⭐ **And note what rivalry buys that ∞ cannot: a reason to co-operate.** A
> non-rival tap is scenery. A well that a hot dry week can draw down is a
> thing neighbours have to *manage*, and the management is the play.

⚠ **But apply the [recurring-charge call](../../stewardship-doctrine.md)
before reaching for it.** Rivalry must never become the domestic errand the
water pack refused: **the mains stay ∞**, and rivalry belongs to
**frontier/agricultural** sources (the well, the cistern, the irrigation
share) where drawing hard is a *choice you made by farming*, not a tax on
washing your hands.

---

## Part 4 — ⭐⭐⭐ The load-bearing mechanism: cache the IDENTITY, derive the STATE

This is the part that unblocks rain, and it generalizes to every utility.

**The problem.** A consumer needs to know its supply **synchronously** —
`CultivableMixin.reconcileSoil()`, `GrowingMixin.reconcileGrowth()` and
`waterPlant()` are all sync, deliberately (*reconcile-on-read, no tick*). But
resolving *which* source serves a place is **async** (`AddressApi.resolveLocalityFor`
awaits `Zone.lookupField`; a distribution walk would await exits).

**The answer, and the codebase already does it twice.** `soilWarmth()` reads
`self.lastAmbientK` — a *cached stamped field* written by the thermal system.
`WeatherApi.deviationFor` takes a **pre-resolved** `Locality` so the biome
read stays sync. Both cache something expensive and read it cheaply.

> ⭐⭐⭐ **Cache the source's IDENTITY (async, once). Derive its STATE
> (sync, live).**
>
> Identity — *which* main, *which* substation, *which* locality — needs the
> walk and **changes almost never**. State — is it on, how full, is it
> raining — is either a pure function of time or a live read through the ref,
> and needs no walk at all.

Why this is the right cut, in the three cases:

| Consumer | Cached identity | Derived state |
|---|---|---|
| **A garden bed** | its covering `Locality` | `weatherAt(t, locality)` — **pure and replayable**, so rainfall integrates *exactly* over any absence gap |
| **A tap** | which main serves this extent | the main's live on/off |
| **A fridge** | which substation feeds this parcel | the substation's live switch state |

⭐ The bed case is the proof: because `weatherAt` is pure, caching only the
locality makes the **whole absence integrable on read** — which is precisely
what a push-tick at segment boundaries could *not* do, since an evicted bed
would silently miss rain and reconcile-on-read could never know.

### ⚠ An unresolved ref must read UNKNOWN, never ZERO

This mechanism has one failure mode, and it is [the one that has already
bitten this codebase three times](../../subsystems/vitals.md): a cache
nothing warms reads null forever, **silently**, while tests that
hand-construct the cached value stay green.

> **Non-negotiable: "not yet resolved" and "resolved to nothing" must be
> different values.** A consumer whose ref is unresolved must not silently
> behave as though its source were absent — it resolves on demand, or it is
> visibly unresolved and says so.

The self-healing shape that makes this safe: **the supply ref gets its own
checkpoint**, separate from the consumer's reconcile stamp. Until the ref
resolves, that stamp does not advance — so the first successful resolve
integrates the **full backlog** rather than losing it. No warm point is
load-bearing, and no boot ordering matters.

---

## Part 5 — ⭐⭐ The uniform experience: two acts, one read, six failures

**Two acts, and both already exist or are already proposed:**

| Act | Means | State |
|---|---|---|
| **Draw** — take matter into a vessel or a body | `fill` / `drink` | ✅ ships |
| **Connect** — bind a consumer to a source | `plug` / `unplug` (or `switch`) | proposed by the [fridge pack](./fridge-design-pack.md) |

**One read.** `analyze <source>` answers the same four things for a tap, a
well and a substation: *what it yields · how deep it is · what it depends on ·
why it is not supplying.* No per-utility verb, no bespoke phrasing.

**⭐⭐⭐ And one closed failure vocabulary** — the house pattern, twice over
(`LandUse`'s closed six, the curated Material library):

| Failure | Water | Power |
|---|---|---|
| **dry** | the source is exhausted | the generator is out of fuel |
| **cut** | the main is severed upstream | the line is down |
| **frozen** | the pipe is iced | — |
| **fouled** | contaminated (→ [disease](./disease-slate.md)) | — |
| **off** | the stopcock is closed | switched off |
| **overdrawn** | the well is drawn down (rivalry, Part 3) | the substation is browned out |

> **A player learns these six once and knows them for every utility
> forever.** That is what "uniform experience" has to mean to be worth
> anything — and a closed set is what stops the next utility inventing a
> seventh.

---

## Part 6 — The two instances

**Rain** ([water pack](./water-design-pack.md)). A source with **no fixture
at all** — the locality *is* the ref. Cache the covering `Locality` on
sky-exposed cultivable ground; integrate `weatherAt` exactly over the gap
against `getLandRequirementM2()` (1 mm × 1 m² = 1 L, no invented field).
Failure modes: none — rain does not fail, it merely does not fall.

**Power** ([power slate](./power-utility-slate.md)). An `Energized` fixture
declares its upstream ref; the source's state gates dependents; the
distribution walk rides *coverage is legal, connection is physical*, so
outages are **local and directional**. Nothing above changes for power — this
pack supplies the ref's resolution rule and the failure vocabulary it was
missing.

⭐ **The shape is identical and the physics stay separate**, which is exactly
the split Part 1 argued for.

---

## Part 7 — Designed to the format

**1–2. What it is / composition.** A **supply layer** over two untouched
mechanisms: a cached **source ref** per consuming place, a **live state read**
through it, and a **closed failure vocabulary**. Not a new substance model.

**3. New / updated surfaces.**

| | Work | State |
|---|---|---|
| ⭐⭐ **Supply ref + its own checkpoint** | resolve-once identity, unknown ≠ absent, backlog-safe | **new — the load-bearing piece** |
| ⭐ **Closed failure vocabulary** | the six, shared across utilities | **new (a vocabulary + its validation array)** |
| ⭐ **Rivalry / quota on a shared source** | common-pool guard on a drawn-down well | **new — the missing axis** |
| ✳ **Finite-but-regenerating source** | the well/cistern depth tier | **already named as deferred in `UnboundedSourceMixin`** |
| ✳ **`analyze <source>`** | the uniform four-part read | **rides the shipped `analyze`** |
| ✳ **`plug`/`unplug`** | the connect act | **rides the fridge pack** |
| ⛔ **A unified source mixin** | — | **refused (Part 1)** |

✅ **Where this lives: MIXIN + VOCABULARY, NO NEW API** (owner's decision,
2026-08-11). The supply layer spans bulk *and* electricity — and now
[mana](./mana-economy-design-pack.md) as a third commodity — so it fits no
existing subsystem cleanly; keeping it out of the Api tier is what makes that
acceptable rather than a taxonomy violation.

**4. Verbs & affordances.** `fill` / `drink` / `analyze` ship; `plug` /
`unplug` ride the fridge pack. **No new verbs from this pack.**

**5. Persisted fields.** The cached ref + its checkpoint per consuming place.
Quota state on a rivalrous source. Nothing else — state derives.

**6. Seams & dependencies.** Unblocks the **rain edge** immediately (its
identity is a locality, which resolves today). The **mains/substation** refs
wait on the power slate's middle tier + the delivery walk. **Rivalry** waits
on the regenerating-depth tier.

**7. Fault line.** ⭐ **The ref-resolution rule + rain is a near-term slice**
riding shipped substrate. The failure vocabulary is cheap and can land with
it. Rivalry and the distribution walk are separate, later builds.

---

## Part 8 — ⚠ Dangers

**1. Over-unification.** The pull toward one `SourceMixin` is strong and
wrong (Part 1). The test: *does this change conserve matter?* If yes it is
bulk; if it imposes a field it is `Energized`. Anything that needs both is
two things.

**2. Rivalry becoming an errand.** Part 3's guard: mains stay ∞; rivalry is
frontier and agricultural only. A shared well is play; a metered kitchen tap
is the treadmill the [water pack](./water-design-pack.md) refused.

**3. ⚠⚠ The silent unresolved ref** (Part 4). The single highest-risk piece
here, because its failure is invisible and its tests pass. Unknown must never
read as zero.

**4. Quota as a grief surface.** A drawn-down shared well is a griefing tool
if one drawer can empty it. The common-pool quota is what makes it a commons
rather than a race — and it should be **per-window, not first-come**.

---

## Part 9 — Open questions

1. ✅ **Where does the supply layer live? — DECIDED 2026-08-11 by the owner:
   MIXIN + VOCABULARY, NO NEW API.** The smallest thing that works, and it
   keeps the layer out of the Api tier entirely. (The alternatives — a
   `lib/supply/` subsystem with its own face, or folding onto a utility-ish
   Api — are recorded here only so the decision reads as a choice.)
2. **Does the cached ref persist, or re-resolve per boot?** Persisting risks
   staleness after re-zoning; re-resolving costs one walk per consumer per
   boot. *Lean: transient, re-resolved* — the backlog-safe checkpoint (Part
   4) makes a cold cache harmless, which is the whole reason to build it that
   way.
3. **Is rain's "source" the locality, or the sky?** Modelling it as the
   locality is cheapest and works today. A `SkyExposed`-shaped source object
   would be more uniform but buys nothing yet. *Lean: locality now, revisit
   if a second weather-fed consumer appears.*
4. **Should `conjure-water` respect any of this?** It mints matter from
   nowhere, which is a magic-economy question, not a supply one. *Lean: out
   of scope*, but flagged because it is the one source that answers to no
   upstream.
5. **Does a source know its drawers?** Rivalry needs *some* accounting of who
   drew how much. The [household pack](./household-design-pack.md)'s rule
   applies unchanged: **aggregate, never report** — the well knows its level,
   not a leaderboard of neighbours.
