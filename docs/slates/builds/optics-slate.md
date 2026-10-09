# Optics slate — what a lens is for

> **Status: UNBUILT** — enabled by the glass build, which leaves the
> ROOM (a glass material row open to a `refractiveIndex`, a cold-work
> bench a `grind` act extends, and glass itself as the feedstock) and
> **ships no optics — no dead field, no unread power, no lens nobody can
> use.** Nothing reads a focal length today; the game has **no optics and
> no visual-acuity model at all** (the only `acuity` shipped is olfactory
> — `Species.olfactoryProfile`, the precedent this borrows).
> **Left:** the derivable power model (focal length from index × curvature)
> · the grind as the shaping act · **Half A** additive detail instruments
> (loupe/microscope/telescope/burning-glass) · **Half B** visual acuity as
> a NUMERIC perception modifier + the corrective lens · the firewall that
> keeps all of it off authored prose · the assemblies (spectacles, scope,
> microscope, telescope) whose glass half the glass build makes
> **Size:** a build

*Opened 2026-10-06, carved out of the glass conversation. Lenses were
named in the glass slate (pressed ware, spectacles, "optical transmission")
but the optics were never developed, and they are a different animal from a
bottle or a pane — a new sub-system, not a glass feature. The scoping call:
glass leaves the hook, optics is its own build. This slate banks what that
conversation worked out so it is not lost.*

---

## 0. The scoping decision that made this a slate

> *Do lenses belong in the glass build, or are they their own thing?*

**Their own thing.** A lens pulls in an optics model (focal length,
magnification, image formation) and a set of perception consumers that
glass does not otherwise need — folding them in would blow exactly the
bounded scope glass was chosen for. So glass does **the material and the
trade** and stops; optics does focal length and every consumer.

**What glass leaves is ROOM, not dead fields** — the "feel/taste shipped
and never ran" trap means glass must not ship a `refractiveIndex` nothing
reads or a lens-blank nothing uses. What it leaves instead:
- the glass **material row**, open to a `refractiveIndex` — optics adds
  the field *when it adds the reader* (the power model), beside glass's
  `meltingPoint`/`hardness`/`toughness`.
- the **cold-work bench** — glass ships score-snap-groze; optics adds a
  `grind`/polish act for curvature on the same bench.
- **glass itself** as the feedstock — a disc of glass is an ordinary glass
  good; optics is what grinds one into a lens with a power.

## 1. The derivable core — power is a number from two real inputs

A lens's optical power is `f(refractiveIndex, curvature)` — the
lensmaker's equation. **The refractive index is the material's** (what
glass leaves); **the curvature is the grind** (what the grinder does). So
a lens's power is derivable end to end, authored nowhere — lens 1 clean,
the same shape as "the melt is a number with a comment." Magnification,
focal length and the focal point all fall out of it.

⚠ No stored "magnification stat" that drifts from the physics. The power
is derived from index × curvature, exactly as the melt is derived from
nothing and the condition band is derived from the substrate.

## 2. ⭐⭐ Half A — lenses as ADDITIVE detail instruments (no deficit)

The clean half, and the one that dodges every text-game trap: a lens does
not *degrade* anything — it **raises the detail ceiling on a read**, which
is exactly the instrumentation doctrine already shipped (*competence
resolves detail; the instrument sets the ceiling*). The fine detail — the
maker's mark, the pathogen, the grain in the metal — is **already the top
tier of a read authored for the instrument ladder**; a lens is what grants
you that tier. No author writes anything new, nothing is degraded, and
there is no deficit to inflict — everyone benefits from a magnifier the
way everyone benefits from a thermometer.

| instrument | what it raises | lands on |
|---|---|---|
| **loupe / magnifier** | detail ceiling on a CLOSE read | the shipped `analyze`/instrument ceiling |
| **microscope** | the smallest tier — ⭐ pathology, material grain, the assay | sampling-and-labs, disease, pharma, metallurgy |
| **telescope** | perception RANGE — far reads, astronomy | `PerceiverMixin.scry`, `CelestialApi` |
| **burning glass** | a focal point concentrates flux → ignition | `FireApi` |

⭐ The microscope is the leverage headline: it is the supply side of the
labs/pharma/disease work — *seeing small* is what those builds want and
have no instrument for. The telescope opens astronomy (`CelestialApi`
ships). Both are additive, derivable, and ride existing machinery.

## 3. ⭐⭐⭐ Half B — visual acuity as a NUMERIC perception modifier

**Bad vision survives — but it lives on the numbers, never the prose.**
The conversation that opened this slate killed the prose version
decisively, and the reasoning is the firewall below. What is left is the
half that is *good*: acuity is a parameter that bears on the **range-gated
numbers the game already computes**, and the remedy (a corrective lens) is
a real, tradeable, satisfying restore.

Where it bites — all numeric, all already a function of range, none of it
touching authored description:

- **Ranged combat.** Aim/placement already resolves over the
  `close·reach·near·far` bands. Acuity is one more input: a near-sighted
  shooter's placement falls off at `far` faster. A number on the aim.
- **Detection.** Spotting a hidden thing, a trap, an ambusher at range is
  a perception threshold (the awareness/`search` Discipline). Acuity ×
  distance shifts it.
- **Recognition at range.** *Who* that is across the plaza is already a
  graded belief read by distance; acuity moves the threshold.

The remedy is the corrective lens (spectacles; eventually a scope), which
restores the number — and hands **archers, scouts, hunters and snipers** a
reason to want optics, combat/stealth/hunting leverage stacked on the labs
leverage of Half A.

### ⚠⚠ The firewall — acuity never touches prose

> **No author ever owes a "blurry" anything.**

Degrading the *description* is a non-starter: an algorithmic text
scrambler is a gimmick, and authored low-vision alternates are an absurd
tax that breaks the rule that the ordinary case costs an author nothing.
(An LLM generating degraded prose from the authored props is the only
thing that could, and it is not a dependency this should take.) So acuity
is **confined to the numeric layer** — aim, detection thresholds,
recognition gates — and the prose channel is left exactly as authored.
This is the whole reason bad vision is viable at all.

### The guards (inherited from `mind-slate`)

- ⭐ **A dial, not a diagnosis.** Near/far sight is a character
  configuration (opt-in, flavor/identity), like the olfactory-acuity
  scalar species already carry — never an affliction the engine inflicts.
- ⭐ **Change the terrain, never the possibility.** You can still shoot;
  you are just worse at distance until you get glasses. No action is
  removed.
- ⚠⚠ **Do NOT wire acuity to age.** Presbyopia is the obvious temptation
  and it would quietly re-open the deliberately-inert lifespan question
  (`race.md`: nothing dies of old age, and ability-from-age must not
  smuggle it back). Keep it a dial.

## 4. The assemblies the glass build's glass half already makes

Each is glass + another shipped half, with optics supplying the power and
the consumer: **spectacles** (+ a frame; `horn` ships) · **scope / sight**
(+ a tube, the glass lampwork rung) · **microscope** / **telescope**
(tube + lenses + a stand) · **burning glass** (a single lens). Glass makes
the blanks; optics grinds and wires them.

## 5. Lens pass (first cut — for requirements to sharpen)

1. **Pedagogy.** Real optics — focal length, magnification, the focal
   point — all derivable from index × curvature. An `optics`/lens-grinding
   Discipline. Nothing authored that physics can state.
2. **Creative expression.** Ordinary case: a lens row with a ground
   curvature. Bespoke: a composed instrument. The power is one number; the
   craft is in the grind.
3a. **Immersion.** A corrective lens that restores a number you could feel
   missing (the shot that kept drifting at range) is the honest moment —
   *provided* the firewall holds and nothing fakes blur in the prose.
3b. **Participation.** Who grinds, who prescribes, who sells scopes — a
   vocation the polity staffs, not scripted.
4. **Values.** Whether a character has an acuity deficit at all is a dial
   the player sets, not a thing the world imposes — the opt-in rule.
5. **Continuity.** Spectacles → scope → microscope → telescope → (float-era
   optics) is an epoch gradient over one mechanism; a crude lens and a fine
   one answer the same `grind`/`analyze` commands.
6. **Economy.** ⭐⭐ Demand was there first: the microscope's customers
   (labs, pathology, assay) and the scope's (ranged combat, hunting) exist
   before the supplier does — the same uniquely-non-circular case glass
   has.
7. **Governance.** Judges no person. (An optician's prescription is a
   service, never an obligation.)

## 6. Open questions (for requirements)

1. **Does acuity ship as a species scalar, a character-gen dial, or both?**
   The olfactory precedent is species-side; vision wants a player dial too.
2. **Exactly which numeric consumers in the first rung?** Ranged aim is the
   clearest; detection and recognition are the obvious next two. Likely
   one to prove the model, the rest as the build's own tiers.
3. **Is the microscope's detail-ceiling a new `Reading` tier, or does it
   raise the ceiling of existing reads?** (Leans: raises the ceiling —
   no new channel, the instrument doctrine's own shape.)
4. **Does the telescope extend `scry` range, or feed a new astronomy
   read?** Depends whether `CelestialApi` surfaces anything a lens would
   sharpen.
5. **The grind as an act** — a recipe row, or a skilled cold-work act with
   a quality that sets the curvature precision (and thus the power's
   tolerance)? The failure economics of glass (cullet is recoverable) make
   it a cheap place to measure grinding skill.

---

**See also:** [glass-slate](./glass-slate.md) (the hook: `refractiveIndex`,
the grind, the lens-blank) · [instrumentation](../../subsystems/instrumentation.md)
(the detail-ceiling doctrine Half A rides) ·
[ranged](../../subsystems/ranged.md) (the band ladder Half B's aim bites on) ·
[concealment](../../subsystems/concealment.md) / [stealth](../../subsystems/stealth.md)
(the detection threshold) · [belief](../../subsystems/belief.md) (recognition
at range) · [mind-slate](./mind-slate.md) (the dial-not-diagnosis +
terrain-not-possibility guards) · [perceiver](../../subsystems/perceiver.md)
(`scry`, the telescope's seam).
