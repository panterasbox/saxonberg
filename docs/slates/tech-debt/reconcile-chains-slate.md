# Reconcile chains slate — when a rate reads a rate

> **Status: PARTIAL** — the doctrine is
> [uncertainty.md § The second abstraction law](../../uncertainty.md); the
> temperature half shipped with the cold-storage build (2026-10-01): the
> trajectory primitive, every temperature gauge integrating it, the stepped
> grid, and `lint:reconcile-chains` at ceiling 0 — see
> [thermal.md § The trajectory contract](../../subsystems/thermal.md). What
> remains is everything that is **not** temperature.
> **Left:** trajectories for the non-temperature drivers (light-strike ·
> pests · `a_w`) · **declared drivers** + the lint reading the declaration ·
> the ring's **reboot** and **horizon** seams
> **Size:** a tail

**Captured 2026-09-30**, from a question about what happens to food in a
fridge when the power goes out. It is an **A3 problem** rather than a
physics one: *derive, don't track* promises the answer does not depend on
when you look, and a sampled driver breaks exactly that promise.

Related: [uncertainty.md](../../uncertainty.md) (the law, the answers, the
audit table) · [spoilage.md](../../subsystems/spoilage.md) ·
[thermal.md](../../subsystems/thermal.md) ·
[measurement.md](../../measurement.md) (A3, A16) ·
[lint-family.md](../../lint-family.md) (census-then-ratchet)

*Compacted 2026-11-18.* Cut as shipped: the three ⛔ temperature gauges
(`Freshness`, `Contaminable`, `Maturing` fold over `temperatureTrajectory`;
uncertainty.md § The audit) · the step problem (`TrajectoryLog` ring +
the grid remembering its cuts; thermal.md § The trajectory contract,
energy.md) · Q1 `Growing` (answer 3 by design; the audit) · Q3 `Moisture`
(the exposed arm walks air segments; the enclosed arm is `@samples`) ·
Q4 (the `@samples` TSDoc marker is the justification, the reviewer judges
it) · Q5 (the ratchet is 0).

## 1. Drivers that are not temperature are still end samples

The trajectory primitive (`Piecewise` / `TrajectoryLog`) is
driver-agnostic, but only temperature publishes one. Three rates are
still billed over the whole gap at the value read on the day you look:

| driver | gauge | stated limit |
|---|---|---|
| **light** (`lux` × blue transmittance) | light-strike on `Freshness` | spoilage.md: *"a bottle carried from sun to cellar is aged at the cellar's light for the whole stretch… the trajectory integration is a follow-on"* |
| **pests** (room debris) | `Freshness` growth | spoilage.md § Cleanliness: *"sampled once per reconcile beside light-strike"* |
| **`a_w`** (the holder's water state) | `Freshness`, `Contaminable` | spoilage.md: *"stays an end sample (justified — no stepped state for an enclosed slot's humidity)"* — ⚠ a lid opened, or a loaf moved from a crock to the counter, is a step |

⚠ Daylight is a pure function of time (answer 1, the celestial field);
what steps is **being carried**, a lamp, a shutter. The publisher is the
holder's scope, the same shape `AtmosphericMixin` already serves for air
temperature.

## 2. ⭐⭐ Declared drivers — a gate, not a grep

`lint:reconcile-chains` finds samplers by three token names
(`getTemperature(` · `hostTemperatureK` · `getOwnTemperatureK`). A new
gauge whose rate reads light, humidity, air or another reconcile-on-read
quantity passes it unseen, and the chain `Freshness → Moisture → ambient
humidity` still exists only as a call. A gauge that **declares** the
drivers it reads gives the lint a roster to check — each declared driver
is either read as a trajectory or carries `@samples` — and makes the
chain inspectable.

## 3. The ring's two seams

- **Reboot.** The ring is runtime state; a reboot re-seeds a flat segment
  (thermal.md). The game clock pauses across downtime, so the loss is only
  the relaxation that was *in flight* at shutdown — a fridge mid-warm-up
  reads flat after the restart. Persist the ring with its publisher, or
  state the limit.
- **Horizon.** 24 breakpoints. A publisher stepped more often than that
  between a dependent's reads truncates the dependent's window (thermal.md
  already warns of it for a long re-stoked burn). Decide: a larger ring,
  a coalescing ring, or a stated limit.

## ⚠ Not in scope

**Making every gauge integrate.** Sampling is legitimate where the τ ratio
warrants it (`Staling`, the enclosed `Moisture` arm) — the work is the
gauges that **cannot** justify it, and making the justification visible
where it exists.
