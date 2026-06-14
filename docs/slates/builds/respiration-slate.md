# Respiration slate (working doc)

Working slate for **respiration** — the body drawing breathable air from its
ambient medium, and the acute crisis when it can't (**asphyxiation**:
drowning, vacuum, smoke, gas, strangulation). Surfaced while designing
metabolism, where oxygen kept being mistaken for a fourth survival reserve.
It isn't: it's a **different animal** on every axis, and its home is the
**biome medium + a small respiration driver**, not the digestion loop.

The headline finding: the substrate already pre-built **both halves** and
they're simply not wired together. This is closer to a **wiring job** than a
new system.

> **Demand-driven — deferred until content reads it.** No drowning / vacuum /
> gas content exists yet (locomotion has `swim`, but no "underwater = can't
> breathe" consequence). Build the driver when the first consumer lands;
> **drowning** is the obvious one. This slate captures the shape so it's a
> known build, not a surprise.

See also (the substrate this leans on — already present):

- [docs/subsystems/vitals.md](../../subsystems/vitals.md) — `spo2` is a real
  vital sign **today** (`Vitals.ts`: `Quantity<'%'>`, baseline 98,
  survivableMin 70) and is **already read by the death seam**
  (`spo2 <= survivableMin` contributes to death). The floor consequence is
  wired; nothing drives `spo2` down.
- [docs/subsystems/biome.md](../../subsystems/biome.md) — biome already owns
  the **medium** per location/vessel and names **breathability** as its
  headline lever ("medium — air / water / vacuum (biggest lever:
  **breathability**, pressure, density)"); `resolveAtmosphereFor()`,
  `setAtmosphere()`, and the media table exist (currently density-only).
- [thermal-slate](./thermal-slate.md) — the **sibling move**: respiration
  adds a `breathable` column to the biome media table exactly as thermal adds
  a conductivity column. "The medium has a physical property the body reads."
- [docs/subsystems/augmentation.md](../../subsystems/augmentation.md) —
  `AugmentMixin.confers()`; gills / rebreather / diving helmet / space-suit
  confer "can breathe medium X" (same seam as the encumbrance exo-frame).
- [docs/subsystems/activity.md](../../subsystems/activity.md) +
  [docs/subsystems/time.md](../../subsystems/time.md) — `SchedulerApi` /
  `EngagedMixin`; the breath-hold countdown is a **scheduled, cancellable
  engagement**, not a lazy reconcile.
- [docs/subsystems/locomotion.md](../../subsystems/locomotion.md) — `swim` /
  diving is where a body deliberately enters an unbreathable medium.
- [metabolism-slate](./metabolism-slate.md) — owns **only** the gentle
  aerobic *read* of `spo2` (low O2 throttles recovery); respiration drives it.

---

## Why it is NOT metabolism

Oxygen looks like a fourth survival reserve next to satiation/hydration, but
it diverges from the digestion loop on every axis that matters — which is the
whole reason it gets its own home:

| | hunger/thirst (metabolism) | oxygen (respiration) |
|---|---|---|
| **timescale** | hours | **seconds-to-minutes** |
| **intake** | acquired & swallowed (`ingest` → stomach buffer) | **ambient tap** — breathed automatically from the medium |
| **driver** | lazy-on-read reconcile (passive, off-screen-safe) | **acute crisis, scheduled tick** (engagement) |

You cannot lazy-reconcile drowning — it's happening *now*, while the body is
present, on a countdown. That alone rules out the metabolism reconcile and
points at the activity/scheduler substrate.

---

## The decomposition — two concerns, one shared vital sign

`spo2` is shared state: respiration **drives** it, metabolism/encumbrance
**read** it.

- **Asphyxiation** — the acute "air is cut" crisis (drowning, vacuum, smoke,
  strangulation, gas). **This slate's job.** Drives `spo2` down on a
  countdown; the existing vitals death hook catches the floor.
- **Aerobic coupling** — the gentle "low `spo2` throttles recovery rate /
  shaves carry capacity" margin. A **read**, not a driver; it stays the thin
  seam already noted in metabolism and encumbrance.

---

## How it works — three small pieces (vitals + biome did the rest)

1. **`breathable` on biome media.** A breathability attribute on the
   air / water / vacuum / smoke table (air = yes, the rest = no). The exact
   same shape as thermal's conductivity column. Modeling the medium's
   already-named "biggest lever" as real data.
2. **A breathable-set on the body.** Body-plan default `{air}`; **augments
   confer others** via `AugmentMixin.confers()` (gills → water, rebreather /
   helmet → water, suit → vacuum). A **water-breathing species inverts the
   default** and *drowns in air* — liberal diegesis (gills = rebreather).
3. **The driver.** Read the body's ambient medium
   (`BiomeApi.resolveAtmosphereFor(body)`); if it's **not** in the body's
   breathable-set, drain the existing `spo2` on a **scheduled countdown**
   (`SchedulerApi` / engagement) — breath-hold grace → desaturation →
   blackout → the **already-wired death seam** at the floor. Breathable again
   → `spo2` recovers fast; escaping cancels the engagement.

**No new reserve.** `spo2` is `Reserve`-shaped (a saturating store, danger at
the floor — *unlike* the toxin burden) but it already exists as a vital sign
with a band and a death contribution. Respiration drives the existing sign;
"breath-hold time" is just how long `spo2` takes to fall from 98 to 70 at the
drain rate. (Whether a distinct breath-hold buffer feeds it, or `spo2` drains
directly after a grace, is a build-time call — lean: drain `spo2` directly.)

---

## Composition (the payoff — it wires into four existing systems)

- **Biome** — the medium and its new `breathable` attribute (the source of
  truth for "is there air here").
- **Locomotion** — `swim` / dive is the deliberate entry into an unbreathable
  medium; the crisis engages off the medium change.
- **Toxicity** — there are **two intake channels**: `ingest` → stomach and
  **breathe → lungs**. Inhaled toxins (**smoke**, **poison gas**) route into
  the *same toxin-burden machinery* via the lung channel. Gas traps fall out
  of respiration + toxicity composed. *(Later layer; v1 is breathability →
  `spo2` only.)*
- **Augmentation** — breathing gear / gills as `confers()`-style capability,
  the encumbrance exo-frame seam reused.

---

## Fun, and the hard-limit note

Respiration **dodges the survival-meter trap by construction**: unlike
hunger, there's no maintenance — `spo2` sits pinned at baseline and is
*invisible* until the body deliberately enters an unbreathable medium. It's a
**situational crisis gated behind a choice**, not a meter to babysit.

It **is** a hard limit (no soft-taxing "no air") — a departure from the
house soft-diegetic-limits ethos — but a **legitimate** one, the same way the
encumbrance lift gate is: a hard end is honest when it's the consequence of a
clear, self-selected action (you chose to dive / open the airlock). The
hardness is gated, not ambient.

---

## Scope / sequencing

**In (when built):** the `breathable` media attribute (biome); the
body-plan breathable-set + augment-conferred additions; the
scheduled-countdown driver draining the existing `spo2` while the ambient
medium is unbreathable (recover on return); first consumer = **drowning**
content. `spo2`'s band + death contribution already exist — reused, not
rebuilt.

**Seam (read-only, already declared):** the metabolism/encumbrance **aerobic
coupling** — low `spo2` throttles recovery / shaves capacity. Inert until this
driver moves `spo2` off baseline.

**Out (deferred / later layers):** inhaled-toxin channel (smoke / gas → toxin
burden via the lungs — composes with toxicity); **altitude / graduated
hypoxia** (thin air as a partial-pressure gradient rather than binary
breathable/not — less compelling than drowning, defer); CO₂/rebreathing
buildup; pressure / decompression (diving depth); all numeric tuning
(breath-hold duration, drain/recover rates).

**Depends on:** vitals (`spo2` sign + band + death seam) — merged. Biome
(medium resolution + media table) — present. Activity/Scheduler (the
countdown) — present. Augmentation (gear) — present. **Nothing blocks it but
the absence of a consumer.**

---

## Open questions

- **Breath-hold: a distinct buffer, or drain `spo2` directly after a grace?**
  Lean drain-directly (no new reserve); pin at build.
- **Crisis granularity.** A real scheduled countdown with discrete stages
  (grace → desaturating → unconscious → death), or a single timed drain read
  against the existing `spo2` band? Lean staged-engagement (legible, and the
  blackout stage reuses the vitals consciousness surface).
- **Breathable-set storage.** A set on the body plan (default `{air}`), with
  augments adding entries — confirm the set composes cleanly with
  `AugmentMixin.confers()` and that a species can *invert* the default
  (water-breather drowns in air).
- **Presence-gating.** Does the countdown freeze on linkdead like metabolism,
  and defer to the connection layer's anti-grief window? (You can't pull the
  plug to dodge drowning, but you also shouldn't reconnect dead from an
  involuntary drop.) Inherit metabolism's presence rule; confirm.
- **Vacuum vs water vs smoke — one "unbreathable," or typed?** v1: binary
  breathable/not. Typed media (vacuum also does pressure/thermal; smoke also
  carries toxin) compose those effects from their *other* systems, not here.

---

## Cross-references

- [docs/subsystems/vitals.md](../../subsystems/vitals.md) — `spo2` sign,
  band, the death seam already reading it.
- [docs/subsystems/biome.md](../../subsystems/biome.md) — medium resolution +
  the media table the `breathable` column joins.
- [thermal-slate](./thermal-slate.md) — the sibling media-column move.
- [metabolism-slate](./metabolism-slate.md) — the aerobic-recovery
  read; why oxygen is not the digestion loop.
- [docs/subsystems/augmentation.md](../../subsystems/augmentation.md) —
  breathing-gear capability seam.
- [docs/subsystems/activity.md](../../subsystems/activity.md) — the scheduled
  breath-hold engagement.
- [docs/subsystems/locomotion.md](../../subsystems/locomotion.md) — `swim` /
  dive, the deliberate entry into an unbreathable medium.
</content>
</invoke>
