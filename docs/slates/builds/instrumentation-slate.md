# Instrumentation slate — you are as good as your toolkit

**Captured 2026-07-31**, out of the press session's recording
instrument. The trigger is a design-drift admission: **`analyze` grew
because we needed it for testing and for exercising subsystems, and
was never intended to be a universal free capability.** The intent
was always *"you are as good as your toolkit and your ability to use
it."* This slate is the correction, and it widens into an axis:
instrumentation, augmentation, and specialization-by-body.

Related: [augmentation.md](../../subsystems/augmentation.md) (the
three-base capability model — the architecture this all rides),
[perception.md](../../subsystems/perception.md),
[senses.md](../../subsystems/senses.md),
[embodiment.md](../../subsystems/embodiment.md) +
[slot.md](../../subsystems/slot.md) (slot claims per body plan),
[race.md](../../subsystems/race.md) (species anatomy),
[advancement.md](../../subsystems/advancement.md) (competence),
[press-slate](./press-slate.md) (the recording instrument, the
certification hook), [crafting.md](../../subsystems/crafting.md)
(Grade, Durable).

## The architecture already exists — `analyze` is what bypasses it

From augmentation.md, shipped:

> **A capability is a mixin bundle manifestable around three bases** —
> a corporeal **`Thing`** (carried), an incorporeal **`Idea`** (an
> *update* hosted on aether attunement), or **intrinsically** on a
> Creature / species — and **one reachability scan (the MQL
> `reachable` seed) finds it in any form.**

That is already "carry the instrument / install the augment / be born
with it," unified. The `TravelCard`/`PaymentCard` pair is the worked
example: a physical card **or** an aether update, same capability,
two bases.

And the codebase already half-agrees with the correction: **`measure
altitude` wants a sextant; solar elevation wants a sundial.**
Instrument-gating exists in patches. The drift is that the other
channels came in free because they were built to exercise systems.
**So this is not new machinery — it is routing `analyze` through the
model everything else already uses.**

## ⚠ The aether line — a modem is not a sense organ

**(User correction, 2026-07-31 — load-bearing, and adjacent to a
standing repeat-correction: the aether is just the internet, nothing
more.)**

The aether implant **mediates the aether**. That is its entire
purpose: communication and information unbounded by physical space.
A light meter is the *opposite* kind of device — it must **transduce
physical reality at a location**. Nothing about connecting to a
network gives you a photodiode.

> **Rule: physical sensing can never ride the aether base.**

Corrected base assignments:

| Base | Carries | Never carries |
|---|---|---|
| **Aether (`Idea`)** | comms, the credential wallet, records access, **reference lookup** | any physical measurement |
| **Corporeal (`Thing`)** | instruments that actually measure — **carried** in a pack or **installed** in a body slot (the difference is the slot, not the base) | — |
| **Intrinsic** | species senses | — |

**And the line pays for itself pedagogically, which is why it is the
right line:** over the aether you can look up *what granite's
conductivity is supposed to be.* You cannot tell whether **this rock**
is granite without an instrument.

> **The aether is the textbook; the instrument is the lab.**

Reference knowledge vs. measurement — and the competent player does
**both and compares**, which is literally how science works. The
practicum thesis, living inside a single implant.

## The three gates

1. **Capability** — do you have it, in any of the three bases?
2. **Competence** — can you read it? **This is the same rule the gun
   design landed on: *competence buys information, not outcomes.***
   The expert reading *"chambered · safety off · four rounds · light
   fouling"* where a novice reads *"a revolver"* is the same mechanic
   as a metallurgist reading an alloy's composition where a layman
   reads "a metal bar." **The gun readout ladder IS an analyze
   readout ladder** — one mechanic, two consumers.
3. **Condition / calibration** — instruments drift and need service;
   a **certified** instrument is the only one whose word counts
   legally (the press slate's certification hook, which is also a
   real and ancient government function).

## Siting — anatomy, not a slot list

The cranial slot is taken by the aether implant, so physical sensors
go **where they anatomically belong** — which is better design than
subdividing the skull:

| Site | Plausible sensing |
|---|---|
| eye socket | optical — light, magnification, thermal |
| hand / fingertip | contact — material, temperature, texture |
| forearm | a general instrument mount (a bolted-on device) |
| ear | acoustic |
| nose / throat | chemical, atmospheric |

Three consequences, all free from shipped systems:

1. **Mounted instruments are visible.** You can see someone's
   augments — so the augmented/unaugmented divide is legible on the
   street, and a miner with an assay probe **reads as** a miner.
   Same rail as a held aim and an operating recorder: the capability
   exists; wearing or using it is publicly legible.
2. **Species anatomy gates augmentation.** Different body plans,
   different available sites — the race system doing real work, and
   the allegory sharpening without a word of lore.
3. **Augments compete with worn gear.** A forearm mount and a shield
   strap want the same real estate; embodiment's multi-slot
   atomicity already arbitrates it.

## The trades

**Carried vs. mounted:**

| | Carried | Mounted |
|---|---|---|
| cost | cheap, swappable, loanable | expensive, permanent-ish |
| risk | droppable, stealable | can't be knocked away |
| cost of use | hands + encumbrance | anatomy, visibility |

**You augment what you use daily and carry what you use
occasionally** — exactly how real professionals equip.

**Portable vs. fixed** (the same trade as portable vs. static cover):
a hand lens travels; the assay furnace stays in the shop. So
**fieldwork and labwork become two phases with travel between them —
you bring the sample back.** A whole gameplay rhythm falling out of
an equipment distinction.

**Power belongs to instruments, not to the aether** — cells, per the
old `CellCode` split in `docs/newbie/`. (Aether-as-energy is left
alone deliberately; it is adjacent to a line already redrawn once.)

## The social layer — what Deus Ex promised and did not deliver

DX gave augments as a power fantasy with a social veneer. The four
things it skipped, each of which we have substrates for:

- **Economics** — who pays, who profits, what a mount costs vs. a
  tool.
- **Labor — the sharpest question in the slate.** May an employer
  *require* an instrument? **Provide and revoke one?** Capability-as-
  a-service cannot be an aether sensor update (per the aether line) —
  but it can absolutely be a **leased instrument** or a
  **company-owned mount the employer installs and removes**, which is
  worse and more concrete: they take it out of your arm. Company-town
  dynamics, with your senses in it. (Livelihood-slate problem as much
  as an augmentation one.)
- **Law** — may a locality ban an augment? Compel one? **Search what
  you have installed?** (An amendment-roster entry, and note it is a
  search-and-seizure question *about your own body*.)
- **Information asymmetry as the actual gameplay** — DX's augs were
  mostly combat and traversal; **our most interesting augment is one
  that lets you know things others don't**, which is exactly this
  world's strength.

## The convergence (why this is not merely allegory)

**(User, 2026-07-31.)** Gamification is *quantified, mediated
self-extension*; transhumanism is *technological self-extension*.
They meet at the instrument, and the proof is already built: **the
"mirror with receipts"** from the education video — a technologically
mediated view of yourself more accurate than your own self-perception
— **is a transhumanist artifact.** Not allegory; the same object.
Your phone already does it (step counts, screen time, the quantified
self); the only thing this world changes is that the instrument is
*inside* the fiction and **its costs are legible**. Which is why the
world can examine the question honestly: **what does it cost to see
more, who gets to see more, and what do you give up to keep seeing?**

## Constraints — authored and procedural

- **Authored**: which capabilities exist at all; a venue's fixed
  instruments (the lab bench, the assay furnace); what a species
  senses intrinsically; which mounts a body plan admits.
- **Procedural**: competence bands; calibration drift and service;
  power cells; encumbrance and slot contention; economic cost;
  certification status.

## Where to start — the `analyze` retrofit

1. **Inventory every `analyze` / `measure` channel** and assign each
   a capability + a competence band (chemistry, electrical, light,
   atmosphere, weather, sky, time, address, response, weapon).
2. **Author the instrument set** that satisfies them (the multimeter
   framing already exists for electrical; the sextant and sundial
   already gate two reads).
3. **Gate the verbs on capability**, with honest refusals ("you have
   nothing that could read that") — never silent failure.
4. **Apply the readout ladder** so competence resolves detail rather
   than granting access.
5. ⚠ **Keep the testing path open** — this is the practical risk of
   the whole retrofit. Authors and tests must have a bypass (the
   wizard axis / a system-mode read) or the correction will make the
   world harder to build and debug than it is to play. Decide the
   bypass *before* the gates land.

## Open questions (for requirements)

1. **The channel/instrument mapping** — the actual table from step 1,
   including which reads stay universal (`look` is the medium and
   must stay free; basic senses — smell, listen, feel — are senses,
   not instruments).
2. **Does `analyze time` want a timepiece?** Historically true and
   attractive (estimate from the sun without one), but it touches
   every scheduling affordance.
3. **Attunement capacity vs. mount capacity** — how many aether
   updates can be hosted, and is that a separate scarcity from
   anatomy?
4. **Reversibility of mounts** — removable, damaging, or permanent?
   This decides how dark the labor question gets.
5. **Certification authority** — who certifies instruments, may they
   refuse, and does an uncertified instrument still read true (yes —
   technical honesty is kernel; only *admissibility* is governed).
6. **Instrument crafting** — which crafting branch makes them, and
   whether Grade buys precision, durability, or both.
7. **The species-intrinsic roster** — which senses any species gets
   natively, and whether that is a balance lever or purely flavor.
