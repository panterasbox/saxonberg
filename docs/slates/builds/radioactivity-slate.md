# Radioactivity slate — dose, contamination, and the honest Rad-X

> **Status: UNBUILT** — designed at high level 2026-10-20 with the owner, out of
> the gap walk (*"someone eventually will want postapoc content"*). What ships is a
> stub: `RadioactiveMixin` (half-life, decay mode, decay product) and one uranium
> row whose `radiation` toxin has amount 0 — used by nothing
> ([race.md](../../subsystems/race.md)). [arcane-science.md](../../arcane-science.md)
> settles the fact that shapes the rest: nuclear energies are ~10⁶ chemical ones,
> so **magic cannot touch a nucleus.**
> **Left:** radiation as the eighth channel, its fold attenuation through matter by
> decay mode · dose vs contamination · dose as a body stock, radiation sickness in
> phases over the `marrow` reserve, seeded long-term risk · contamination as a
> decaying toxin burden (effective half-life) · decontamination is washing · the
> instruments (electroscope, Geiger, scintillator, film badge) · half-lives as a
> clock, fallout's 7–10 rule · the medicine: potassium iodide, radioprotectors,
> Prussian blue, chelation, supportive care · radon and pitchblende in the Ferrow ·
> radium paint · the genre pack on top · governance
> **Size:** a build (kernel channel + body model + content)

## 1. ⭐⭐⭐ Radiation is a channel; its fold is matter, by decay mode **[DECIDED — lens 1]**

[materials-response.md](../../subsystems/materials-response.md) has seven channels
in three folds, each the honest physics of its own thing. Radiation is the
**eighth**, and its fold is **attenuation through matter** — construction already
computes light through a layer by Beer–Lambert (`e^(−α·t)`,
[construction.md](../../subsystems/construction.md)); radiation is the same
exponential with a coefficient per material. The **decay mode already on the
material row** decides what stops it:

| radiation | stopped by |
|---|---|
| **alpha** | a sheet of paper, or the dead outer layer of your skin |
| **beta** | a few millimeters of aluminum |
| **gamma** | lead, concrete or water — roughly by mass |

**Distance and time** are the other two defenses: a field weakens with distance,
and dose is field × time.

## 2. ⭐⭐⭐ Dose and contamination are different harms **[DECIDED — lens 1]**

Fallout puts everything in one meter. The split is the most important thing to
teach:

| | what it is | can you undo it? |
|---|---|---|
| **dose** | energy already deposited in your tissue | ⛔ **never** — the damage is done; the body repairs what it can |
| **contamination** | radioactive material still *in* or *on* you, still delivering dose | ✅ remove it and the dose stops |

An alpha emitter is harmless outside your skin and deadly inside your lungs —
which is why contamination, not the field, is the danger of fallout dust.

## 3. ⭐⭐ What taking rads does **[DECIDED]**

**Dose is a stock on the body**, like [exertion](../../subsystems/exertion.md)'s
slow stocks — and **dose rate matters as much as the total**: the body repairs a
slow trickle far better than the same dose at once.

- **Low and steady** (background, a long shift near pitchblende) — repaired.
- **A real burst — radiation sickness, in phases:**
  1. **within hours** — nausea and vomiting;
  2. ⭐ **the latent period** — you **feel fine for days or weeks** after a dose
     that may kill you: the cruel, honest twist;
  3. **the marrow fails** — blood counts fall; infection and bleeding follow.
     ⭐ It lands on [blood.md](../../subsystems/blood.md)'s shipped **`marrow`
     reserve**, which regrows slowly on good nutrition: radiation sickness is the
     marrow running down faster than it can regrow;
  4. **higher still** — the gut, then the nervous system.
- **On the skin** — beta burns where contamination sat.
- **Years later** — cancer and cataracts, as **seeded susceptibility × dose**
  ([uncertainty.md](../../uncertainty.md): randomness may decide what the world
  *is* — your susceptibility, seeded at birth like seasickness — never what your
  act *did*). Deterministic once seeded; nobody knows the seed.
- At 12×, a latent period of weeks is a few real days: a bad dose on Monday, fine
  on Tuesday, in trouble by the weekend.
- **Felt** through wellbeing's channels — nausea, fatigue — never a meter.

## 4. ⭐⭐ Contamination is a toxin burden that also decays **[DECIDED]**

[metabolism.md](../../subsystems/metabolism.md)'s toxin burdens already model the
path: taken in (breathed, eaten, drunk) → absorbed → a burden → cleared at a rate
→ a banded condition. A radioactive contaminant is a toxin whose burden **both
clears and decays**, which gives health physics' **effective half-life**
(biological and physical combined) from shipped machinery.

- It is **an event, and no sense reports it** — [spoilage.md](../../subsystems/spoilage.md)'s
  silent second population, minus the growth.
- ⭐⭐ **Decontamination is washing.** Contaminated dust is a dirt kind in
  [cleanliness.md](../../subsystems/cleanliness.md)'s model (dirt by site × kind),
  and the wash removes it — how real decontamination works. **The mundane remedy
  works and the magical one cannot**: magic cannot touch a nucleus, and soap
  removes the dust it rides in.

## 5. ⭐⭐⭐ The medicine — the honest Rad-X and RadAway **[DECIDED]**

### Before exposure (Rad-X) — the real versions are specific

1. ⭐ **Potassium iodide** — real, and stockpiled near every reactor. Radioactive
   iodine (I-131, an eight-day fallout product) concentrates in the thyroid; flood
   it with ordinary iodine first and it cannot take up the radioactive kind. **One
   organ, one isotope, only if taken early, nothing against external gamma** — you
   must know what you are protecting against. ⭐ **Iodine comes from kelp ash**:
   it was discovered in seaweed ash in 1811 — the
   [potash slate](../tails/potash-slate.md)'s sea-ash process.
2. **Radioprotective drugs** (amifostine is the real one) — broad protection by
   mopping up the damage chemistry; a later pharma epoch, toxic in themselves.
3. **The real Rad-X is shielding and a respirator** — a suit keeps contaminated
   dust off your skin, a mask keeps it out of your lungs. ⚠ **A suit does nothing
   against gamma**, and the model says so.

### After exposure (RadAway) — impossible for dose, real for contamination

- ⭐ **Prussian blue** binds radioactive cesium in the gut so it passes out
  instead of being absorbed. It is **also a paint pigment — the first synthetic one
  (1706)** — already on the [paint slate](./paint-slate.md)'s list.
- **Chelation** (DTPA) for plutonium and americium — a later, injected drug.
- **Water flushes tritium** — its biological half-life shortens as you drink.
- ⭐ **In our model, every decorporation agent raises the clearance rate of one
  contaminant's burden** — a clean fit, and each specific to its isotope.
- **Washing** removes what is on you.

### Treating radiation sickness — supportive care, mostly shipped

Transfusion (blood's `transfuse`) · rest and good food (the marrow regrows on
nutrition) · antibiotics (the [pharma slate](./pharma-slate.md)) · a marrow
transplant, far later. Medicine reads the dose by its phases, deeper with
competence ([harm.md](../../subsystems/harm.md)'s medic vertical).

## 6. ⭐⭐ No sense reports it; instruments do **[DECIDED — lens 3a]**

Invisible, odorless, silent. `Reading` rows on the
[instrumentation](../../subsystems/instrumentation.md) ladder: the **electroscope**,
the **Geiger counter** (its clicks the classic sound), the **scintillator**, and
⭐ the **film badge**, which **accumulates** — the worker's record of their dose.

⭐ **Before the instrument it was a correlation without an explanation.** Miners at
Schneeberg and Joachimsthal died young of a "mountain sickness" for centuries before
anyone knew why — the uncertainty doctrine's *mysticism is a correlation not yet
explained*, in its most famous real case. The perception firewall holds: no score
turns ominous near a hot spot ([performance-slate](./performance-slate.md)).

## 7. Half-lives make danger a clock **[DECIDED]**

- **Activity is quantity × ln 2 / half-life** — short-lived sources are fierce and
  soon gone, long-lived ones mild and never gone. The mixin already does the
  arithmetic.
- ⭐ **Fallout decays on a schedule** — the real "7–10 rule": every sevenfold
  increase in time cuts the dose rate tenfold. Derivable from decay chains: a zone
  lethal a week ago is survivable a year later, and the hot spots remain.
- Reconciled on read, like every clock here.

## 8. ⭐⭐⭐ The first consumer is already in the world — the Ferrow's granite **[DECIDED]**

The [metal-chain slate](./metal-chain-slate.md) puts tin *"at the bottom of the
Ferrow, against the granite"*. In Cornwall, the real tin district, granite-hosted
tin mines also produced **pitchblende** — uranium, and later radium.

- **Pitchblende veins at depth** — a second revelation beneath the tin.
- ⭐ **Radon is a damp** — a gas seeping from granite into mines and cellars, beside
  the firedamp and blackdamp [mining](../../subsystems/mining.md) ships. **The canary
  cannot detect it** — the canary warns of what suffocates, and radon does not.
  The miners' disease is real, and Rejection's deep workings are where you meet it,
  long before anyone in the realm says "radioactive".
- **Radium luminous paint** — the paint build's glowing pigment — and with it the
  **radium girls**, dial painters poisoned by pointing their brushes with their
  lips: the real case behind modern occupational-safety law.

## 9. The genre pack on top

With the substrate honest, a post-apocalyptic pack is mostly content over shipped
systems: ruins as [decomposition](./decomposition-slate.md)'s authored history ·
zones of decaying contamination with hot spots · salvage (assembly) · the Geiger
counter as the essential tool · fouled water (watershed's contamination by kind) ·
exclusion zones as a polity's declaration.

- ⚠ **Mutants are fiction above an honest mechanism.** Radiation does not grant
  powers; the commons stays honest (dose harms). A genre pack may author mutant
  species as its own rows, as arcane science invents above real physics.
- **Branded cures are claims** — the label is a claim
  ([cannery-and-bottling-slate](./cannery-and-bottling-slate.md) § 6a). And history
  outdoes fiction: **radium tonics.** *Radithor*, radium dissolved in water, was sold
  as a health drink in the 1920s; its best-known customer, Eben Byers, died of
  radium poisoning in 1932, reported as *"The Radium Water Worked Fine Until His Jaw
  Came Off."* A wasteland pharmacy selling glowing tonics is history.

## 10. Governance and epochs

- **Lens 7** — exclusion zones; worker dose limits (the film badge as the record a
  limit reads); the radium girls' labor law; who may hold a source.
- **Lens 5** — natural sources and the miners' disease → discovery (Becquerel,
  1896) → radium medicine and paint → X-rays → reactors and fallout. The same
  channel, dose and contamination at every rung.

## 11. Lens pass

1. **Pedagogy** — ⭐ dose vs contamination; alpha, beta, gamma and their shields;
   half-life and the 7–10 rule; specific antidotes; the latent period. Decided
   §§ 1–5, 7.
2. **Expression** — a genre pack's fiction above the honest substrate.
3. **Immersion** — the Geiger's clicks; the fine week before the marrow fails.
   **Participation** — the miner, the dial painter, the health physicist, the
   apothecary selling iodide (or radium water).
4. **Values** — the radium tonic's seller; a workplace's dose limit.
5. **Continuity** — the same model from the mountain sickness to fallout.
6. **Economy** — iodide from kelp ash; Prussian blue; suits and badges; pitchblende
   as a by-product of tin.
7. **Governance** — exclusion zones, dose limits, labor law.

## 12. Open

1. **Attenuation coefficients** — per material, or derived from density and
   composition.
2. **The dose stock's repair rate** — how fast a body heals a trickle.
3. **Radiation sickness as conditions** — one condition with phases, or a cascade.
4. **Neutrons** — only when reactors arrive (hydrogen-rich shielding: water).
5. **Arcane senses** — whether magic can *perceive* radiation even though it cannot
   change it (lean: no; it is chemical-scale).
