# Supply design pack — one model for every source, water and power alike

> **Status: PARTIAL** — the failure vocabulary, the ref-caching
> discipline, the uniform `analyze <source>` read, and the rivalry axis
> (shipped as water rights + quota, not as a generic shared-source
> object) all shipped 2026-09-02 →
> [watershed.md](../../subsystems/watershed.md), which is the live
> reference. The deliberate non-unification of Part 1 (bulk vs
> `Energized` stay separate mechanisms) held.
> **Left:** the **Connect** act (`plug`/`unplug`, binding a consumer to
> a source — rides the fridge pack) · the **power/electricity instance**
> of the supply layer (a substation/socket object actually composing
> `SupplyReporting`/`availablePowerW` — `analyze power` reads it
> duck-typed today but nothing yet answers for household electricity;
> waits on the power-utility slate) · whether `conjure-water` should
> answer to any of this (still just a lean: out of scope)
> **Size:** a tail

See also: [water-design-pack](../tails/water-design-pack.md) (the first consumer) ·
[power-utility-slate](../builds/power-utility-slate.md) (**the supply-ref this
generalizes**) · [stewardship-doctrine § the recurring-charge
call](../../stewardship-doctrine.md) (what may be metered) ·
[household-design-pack](../tails/household-design-pack.md) (**the commons argument,
reused at Part 3**) · substrates:
[bulk](../../subsystems/bulk.md) (`UnboundedSourceMixin`) ·
[electricity](../../subsystems/electricity.md) (`EnergizedMixin`) ·
[reserve](../../subsystems/reserve.md) · [weather](../../subsystems/weather.md) ·
[address](../../subsystems/address.md) (the locality resolve) ·
[husbandry](../../subsystems/husbandry.md) (the sync reconcile that forced
Part 4) · [delivery-slate](../builds/delivery-slate.md) (*coverage is legal,
connection is physical*).

---

## Part 5 — ⭐⭐ The uniform experience: two acts, one read, six failures

**Two acts, and both already exist or are already proposed:**

| Act | Means | State |
|---|---|---|
| **Draw** — take matter into a vessel or a body | `fill` / `drink` | ✅ ships |
| **Connect** — bind a consumer to a source | `plug` / `unplug` (or `switch`) | proposed by the [fridge pack](../builds/fridge-design-pack.md) |

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
| **fouled** | contaminated (→ [disease](../builds/disease-slate.md)) | — |
| **off** | the stopcock is closed | switched off |
| **overdrawn** | the well is drawn down (rivalry, Part 3) | the substation is browned out |

> **A player learns these six once and knows them for every utility
> forever.** That is what "uniform experience" has to mean to be worth
> anything — and a closed set is what stops the next utility inventing a
> seventh.

---

## Part 6 — The two instances

**Power** ([power slate](../builds/power-utility-slate.md)). An `Energized` fixture
declares its upstream ref; the source's state gates dependents; the
distribution walk rides *coverage is legal, connection is physical*, so
outages are **local and directional**. Nothing above changes for power — this
pack supplies the ref's resolution rule and the failure vocabulary it was
missing.

⭐ **The shape is identical and the physics stay separate**, which is exactly
the split Part 1 argued for.

---

## Part 9 — Open questions

1. **Should `conjure-water` respect any of this?** It mints matter from
   nowhere, which is a magic-economy question, not a supply one. *Lean: out
   of scope*, but flagged because it is the one source that answers to no
   upstream.
