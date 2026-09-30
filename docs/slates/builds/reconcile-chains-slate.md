# Reconcile chains slate — when a rate reads a rate

> **Status: UNBUILT** — the doctrine is
> [uncertainty.md § The second abstraction law](../../uncertainty.md); this
> is the work it implies. ⚠ **Three shipped gauges integrate a long
> horizon against a single end-of-interval sample of a driver that moved**,
> and one of them (`Contaminable`) is silent by design, so the error
> surfaces as a player being poisoned by food that read as fine.
> **Left:** `restamp` on `Freshness` · `Contaminable` · `Maturing` (store
> the driver at last reconcile, integrate along `Decay.toward` as
> `ThermalDose` does) · the **step problem** — `Coolbox` and any
> supply-driven host store *when supply last changed and to what*, so the
> trajectory is closed-form · `Growing`'s start-rectangle reviewed · the
> **chain declaration** (`Freshness` reads `WaterActivity` reads ambient) ·
> a **census lint** over *gauges whose rate reads another
> reconcile-on-read quantity* · the `WaterActivity` relaxation checked
> **Size:** a build

**Captured 2026-09-30**, from a question about what happens to food in a
fridge when the power goes out. It turned out to be general, to have three
shipped instances, and to be an **A3 problem** rather than a physics one:
*derive, don't track* promises the answer does not depend on when you
look, and a sampled driver breaks exactly that promise.

Related: [uncertainty.md](../../uncertainty.md) (the law, the four answers,
the audit table) · [spoilage.md](../../subsystems/spoilage.md) ·
[thermal.md](../../subsystems/thermal.md) ·
[maturation.md](../../subsystems/maturation.md) ·
[husbandry.md](../../subsystems/husbandry.md) ·
[measurement.md](../../measurement.md) (A3, A16) ·
[lint-family.md](../../lint-family.md) (census-then-ratchet)

## The three ⛔ gauges, and why each is a different urgency

| gauge | horizon | what breaks |
|---|---|---|
| **`Contaminable`** | days–weeks | ⚠⚠ **First, because it is silent.** Its whole design is a population no sense reports; an under-count is undetectable until somebody is ill, and the player has no way to have known |
| **`Maturing`** | **weeks–months** | The longest horizon in the tree. A cellar that warmed for a day reconciles a three-month batch at whatever the thermometer says on the day you visit — and grade/mark/strain all ride the outcome |
| **`Freshness`** | days–weeks | The worked case. Also the one with **two** sampled drivers (temperature *and* `a_w`) |

⭐ **`ThermalDose` is the exemplar to copy**, in the same subsystem, with
its reasoning already written: *"it integrates, it does not sample… stores
the temperature at its last reconcile and runs Simpson along
`Decay.toward` between the two samples."*

## ⭐⭐ The step problem is the interesting half

Restamping fixes a driver that moved **smoothly**. It does not fix one
that **stepped**, and the motivating case is a step: two endpoint samples
of 4 °C are equally consistent with *nothing happened* and with *six hours
at 21 °C*.

> **Store the step, not the history.** A `Coolbox` (or any supply-driven
> host) that records **when its supply last changed and to what** has a
> closed-form temperature at any `t` — which converts it from a stateful
> driver into a **pure function of time**, the category that never had this
> problem. One field, not a ledger.

⚠ **Scope check before building:** how many hosts actually have a stepped
driver? Supply-fed thermal hosts (coolbox, furnace, any metered appliance)
are the obvious set, and it may be the whole set — in which case this rides
the energy/grid work rather than standing alone.

## Open questions

1. ⭐⭐ **Does `Growing`'s start-rectangle need fixing, or is it right?** It
   restamps `_lastAmbientK` and then rates from the **stored** value —
   `ThermalDose` says a rectangle from the start *"reads zero"*, but
   growth is a `min`-of-four limiting factor and the start value may be the
   conservative choice on purpose. **Read the intent before changing it.**
2. ⭐⭐ **Should a gauge DECLARE its drivers?** Today the dependency
   `Freshness → WaterActivity → ambient humidity` exists only as a call. A
   declared driver list is what a census lint would read, and it is the
   difference between a gate and a grep.
3. ⚠ **Does `WaterActivity` relax correctly over a long gap**, and does it
   need restamping too? It is a driver of two ⛔ gauges, so its error
   propagates into both.
4. **Is the τ-ratio justification checkable, or only assertable?**
   `Staling`'s is convincing prose. A lint can see *that* a gauge samples;
   it cannot see whether the ratio warrants it. ⭐ *Leans: the lint requires
   a justification comment and the reviewer judges it* — the shape
   `@hook`'s human-placed marker already uses.
5. ⚠ **What is the ratchet's number?** *Count of gauges that sample a
   driver without a stated justification* is the honest census: 3 today,
   ceiling 3, may fall and never rise.

## ⚠ Not in scope

**Making every gauge integrate.** Answer 3 is legitimate and `Staling`
proves it — a fast driver under a slow process is exactly a rectangle. The
build is about the ones that **cannot** justify it, and about making the
justification visible where it exists.
