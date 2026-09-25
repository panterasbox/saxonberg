# Instrumentation slate — you are as good as your toolkit

> **Status: PARTIAL** — what shipped →
> [instrumentation.md](../../subsystems/instrumentation.md) (MR !292,
> 2026-09-24). The reading ladder is built: `analyze` / `measure` /
> `readings` / `sample` / `assay` flat over a `Reading` **row any pack
> ships**, 31 channels, competence resolving detail and never access, the
> instrument as a ceiling, the seeded bracket, `SampledMixin` provenance,
> and the bench that keeps nothing of yours. The eleven instrument
> CLASSES are gone — an instrument is a row over `ToolItem` declaring a
> capability — and the `strike`/`dip` platform-view stanzas retired with
> them.
> **Left:** ⭐ **the implant rung** (Wave 2+ — carried upgradeable,
> mounted frozen at install; the attach point is real, `AugmentMixin.
> confers()` already returns mixin names and a channel names a
> capability) · the calibration / certification gate · attunement vs.
> mount capacity (#3) · reversibility of mounts (#4) · certification
> authority (#5) · wheel speed on `look` at a working mill
> (presentation) · and the eight deferred seams recorded at the foot of
> this file.
> **Size:** a wave

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
[press-slate](../builds/press-slate.md) (the recording instrument, the
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

*Homed 2026-09-22 → [augmentation.md § The three-base capability model · the base-assignment rule](../../subsystems/augmentation.md).*

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

## Absorbed from sampling-and-labs-slate — Part 7 — What this answers in the parent slate

> Moved verbatim from [sampling-and-labs-slate](../builds/sampling-and-labs-slate.md) § *Part 7* by the cluster-merge pass (2026-09-21); its "Part 1/2/3" references are that slate's sections.

Resolves, or sharpens, several of
[instrumentation-slate](../tails/instrumentation-slate.md)'s open questions:

- **Q1 (channel/instrument mapping)** — Part 1 gives the organizing axis:
  **environment-readers are portable; sample-eaters are bench.** The
  mapping should be built along that split, not as one flat table.
- **Q5 (certification authority)** — Part 3: certification exists because
  **salting** exists. The reason precedes the institution.
- **Q6 (instrument crafting / does Grade buy precision)** — the three-tier
  ladder wants Grade to buy **precision** at the bench and **portability**
  in the field; two different goods from one axis.
- **Its "where to start" step 2 (author the instrument set)** — Part 2's
  hand-tool rung is the cheapest, highest-value first content.

---

# Session addendum — 2026-09-01: the mechanism, and why the retrofit is now urgent

> Captured while planning the metal-chain build, when the user reopened
> this: *"all those analyze and measure commands that we've been putting
> more and more shit into, I'm not really sure I want that as our model…
> the way we're using subcommands here is maybe regrettable."*
>
> Everything above stands. This adds **the root cause**, **the concrete
> model**, and **the reason it is blocking a build today**. Two of this
> slate's open questions are answered at the bottom.

## ⭐⭐⭐ The root cause: affordance and capability are at different grains

This slate said *"`analyze` is what bypasses the architecture"* but not
**why** the bypass was structurally invited. It is one mismatch:

> **The unit of affordance is the VIEW. The unit of capability is the
> SUBCOMMAND. They do not line up.**

Verified in the code: `Sextant.commandContributions` names
`platform/cmd/perception/measure.yaml` — **the whole view** — so a
sextant on the table affords `measure temperature` and
`measure humidity` too. The controller then re-checks by hand what the
affordance system was never told:
`MeasureAltitudeController` does `inv.some(i => i instanceof Altimeter)`.

Every symptom follows from that one gap:

- **controllers cross concerns** — each re-derives its own instrument check
- **packs cannot extend** — a pack contributes a *view*, and the view is
  the wrong grain (see § *Why this is blocking a build*)
- **tool vs. eyeball cannot be expressed** — a tool affords a whole family
- **the competence gate never got wired** — there is nowhere natural to
  put it, and the evidence is stark: **zero of the 22 `measure`/`analyze`
  controllers band on a discipline**, while `assess`, `feel`, `search` and
  `hide` all do

## One thing that is accidentally right, and should be doctrine

*Graduated (doctrine-homing pass, 2026-09-21): the `analyze`-on-self /
`measure`-on-instrument split and its rule now live in
[command-routing.md § Affordance attribution](../../subsystems/command-routing.md).*

## ⭐⭐ The model: the instrument holds the capability, not the view

**`MeasuringMixin` on a Thing** — declares `channels: string[]` and
implements `read(channel, ctx) → Reading`. The instrument owns *what it
reads* and *how*.

**One `measure` verb, one controller, no subcommands.** The channel is a
**string positional**, resolved against the instruments in reach. This is
the shipped **`cast <spell>`** shape — a free-text name resolved against
real capability — and `cast` ships *from a pack* (`arcana`), so the
precedent covers extension too.

`cast` also brings the discoverability answer: *"`spells` lists what you
can currently shape, **and how well**."* The same companion verb here —
`readings` — lists what you can read and at what precision. **More honest
than a static help list, and in-world: you learn what a dial does by
examining the dial.**

**Eyeballing is the body as an instrument**: the body composes the same
mixin with a coarse precision and two or three channels (warm/cold,
bright/dim). One model; tool-vs-eyeball becomes *which instrument
answered*. The user's *"most measurement needs tools, eyeballing is the
rare case"* falls out — the body declares almost nothing.

⭐ **And the pack/platform split stops being a policy.** It is just where
the instrument lives: platform ships the raw-physics instruments and their
channels; a pack ships specialised ones. **No platform edit, no subcommand
contribution, no kernel change.**

### The line between a channel and a bespoke verb

> **A reading is instant, non-destructive and repeatable — point the
> instrument, get a number. A procedure costs time, material or risk to
> produce knowledge.**
>
> **Readings are channels. Procedures are verbs.**

So `measure strike` is a channel; **`assay` is a verb** (it crushes and
roasts and consumes the sample); **sounding the back is a verb** (you
strike the roof and listen).

## ⭐⭐ Perceive vs. interpret — how this meets the sensory verbs

The user's question: if `analyze` is self-conferred, it implies a
modality — and we already have per-modality active-perception verbs. How
do they play together?

**They are not rivals. `PerceptionApi.sensorium` already is this model one
rung in** — it *"walks BodyPlan organs + active-mixin `_grantsModalities`
— organ-gates-modality with the augmentation widening."*

> ⭐⭐ **The sensorium and the instrument set are one continuum — ways the
> world becomes legible to you. Organs you were born with, augments you
> had installed, instruments you carry.** Two of the three tiers ship.

Two layers, cleanly separated:

- **Perceive** — `look` / `smell` / `listen` / `feel` / `taste`, with
  `sense` the gestalt. Acquire a percept through one modality.
  Qualitative, free, no discipline. *"Acrid, sulfurous."*
- **Interpret** — `analyze`. Reason about a fact. Discipline-banded.

So `analyze` is rightly **self-conferred** — interpretation is always
yours — and must be **route-gated**: you cannot interpret what you have no
channel to. The route is *a modality or an instrument*, which is the same
continuum again.

> **You smell to notice. You analyze to know.** And a character with no
> nose can still `analyze chemistry` — **with a gas analyzer.**

**Each analysis declares which modalities can answer it** — one authored
field, large payoff:

| Question | Routes |
|---|---|
| ore grade | vision (colour) · an assay scale |
| chemistry | smell · taste · a gas analyzer |
| a weapon's balance | **touch** (heft) |
| rot | smell · vision |
| the back is drummy | **sound**, with a bar |

⭐ **The output names the route it used.** *"You turn the lump over — by
the weight of it, this is rich"* vs. *"the sourness on the air says
sulfides."* Same question, different route, different prose: it teaches
the model and hands authors variety for free. An optional explicit form
(`analyze chemistry by smell`) costs nothing.

⚠ **The failure must be loud.** `feel` and `taste` had *never run* because
no body plan granted touch — a feature whose enabling data was missing
failed closed and **silent**. No route means *"you have no way to tell,"*
naming what is missing. This is the same warning as step 5 above, at the
other end.

### Modalities closed, channels open

Seven `Modality` singletons versus a `ToolCapability`-style open
vocabulary for instruments. Not an inconsistency: **bodies do not grow new
senses by authoring, and instruments do.** A pack ships a dial with a new
channel; a pack does not ship a new sense.

## The implant rung — and it is this slate's own Wave 2+

The user: *"people that go deep into one vocation may want to augment
their bodies so they are always afforded the tools they use most often.
there's limited aug slots so they have to choose carefully, but we want
that path to be open to developers."*

`augmentation.md` already names it — Wave 2+ adds *"the generalized
'contribute capability' surface beyond modalities (verbs, motor, vital
functions)."* **The instrument model is that surface's first real
consumer.** The mechanism is the shipped `AugmentMixin.confers()`
returning mixin names:

- an augment conferring a **modality-granting** mixin widens the
  **sensorium** (`AetherImplant` does this today);
- an augment conferring **`MeasuringMixin`** widens the **instrument
  set**.

⭐ **User ruling: these stay separate mechanisms.** Same substrate, two
distinct capabilities, no merging.

**An implant is the same instrument, differently carried** — a pack ships
one class and two rows, one wieldable and one mountable. Which extends
this slate's carried-vs-mounted table with the rung above it:

| Rung | Precision | Cost |
|---|---|---|
| **eyeball** | crude | free — two or three channels is all a body has |
| **carried** | good, **upgradeable** | a hand; losable, stealable, loanable |
| **mounted** | good, **frozen at install** | anatomy, visibility, permanence |

⭐ **The tradeoff that keeps the tool economy alive: a carried tool can be
upgraded, lent, sold or replaced by a better craftsman's work; an implant
is frozen at the quality you installed.** Mastery buys convenience and
pays in flexibility, so the smith keeps a market.

⭐⭐ **And it answers a friction the instrument model creates.** A working
surveyor needs a dial, a compass, a lens and an assay kit — four things to
carry. **The trade gives you tools; mastery lets you stop carrying them.**
Earned, not granted, and filling a slot with a miner's dial says *I am a
surveyor* by giving something up.

Competence is untouched: the implant grants the **channel**, the
discipline still bands the **reading**. A novice with an implanted dial
still reads ±15°.

## ⚠ Why this is blocking a build today

The metal chain hit the mismatch head-on and had to work around it (its
plan's § P1 — the plan is retired; the shipped shape is recorded in
[mining.md](../../subsystems/mining.md) § *The trade/locality line*). The
finding is correct and worth keeping — **a pack cannot contribute a subcommand**, because a
command view is one document per file with no verb-level merge, the schema
forbids extension, and an `unknown-subcommand` **stops the chain** rather
than falling through. Its workaround is to edit the platform view and have
each stanza name a controller the mining pack ships, which means:

> in an install without `trade-mining`, `measure strike` is advertised in
> `measure`'s help and dies on dispatch with a `controller-error`.

**Under this slate's model that wart evaporates**: mining ships a dial
that declares `['strike','dip']`, and nothing in the platform pack
changes. So **the `analyze` retrofit wants to land before metal-chain's
wave M7**, and doing so retires that plan's risk R4.

## Two of this slate's open questions, answered

- **#7 — the species-intrinsic roster, "balance lever or purely flavor."**
  **Answered: not a balance concern.** User: *"if some species are
  'better' that's fine. that was the case on the MUDs I used to play but
  people still picked the lower powered races."* Asymmetric capability
  between species is fine; players pick for identity, not optimisation.
  ⚠ The species doctrine's *"difference that ranks is essentialism"* is
  about **characterization** — never ship a species that reads as the dumb
  one — **not about capability spreads.** The two are different problems.
- **#1, partially — which reads stay universal.** The perceive/interpret
  split above is the answer's shape: **the sensory verbs stay free**
  (they are senses, not instruments, exactly as this slate says), `look`
  stays the medium, and what gets gated is *interpretation* — by route,
  not by permission.

Still open and untouched by this session: **#2** (does `analyze time` want
a timepiece), **#3** (attunement vs. mount capacity), **#4**
(reversibility of mounts), **#5** (certification authority), **#6**
(instrument crafting — and note the metal-chain build ships two
instruments, so this one is arriving whether or not it is answered).

**From the grain chain (2026-09):** the legibility of head-and-flow. Ours
is a reading off `ρ·g·Δh·Q·η` (`analyze power`); Timberborn's is a wheel
you watch turn. `analyze power` is the honest minimum; a wheel speed on
`look` at a working mill is a presentation wave for this slate.

---

## ⭐⭐ SHIPPED 2026-09-24 — the reading ladder (MR !292)

Wave 1 of this slate is built. The subsystem doc is
[instrumentation.md](../../subsystems/instrumentation.md) and is now the
live reference; the requirements and plan retired at the sweep.

**What shipped:** `analyze` / `measure` / `readings` / `sample` / `assay`
as flat verbs over a `Reading` **row any pack can ship** (31 channels
across the platform and seven packs); competence resolving **detail and
never access**; an instrument as a **ceiling** competence realizes; a
seeded bracket on every instrumented read; `SampledMixin` provenance; and
a bench that consumes samples over game-time and hands back a paper while
you walk away.

**Slate questions this answered, beyond the two already recorded above:**

- **#2 — does `analyze time` want a timepiece?** Yes in principle, no in
  content: the `time` channel ships with `instrument: ""` and the reason
  written into its `stakes`. A timepiece is a row when content wants one.
- **#6 — instrument crafting.** Moot as a blocker: the ten platform
  instruments are **rows over `ToolItem`** now, not classes, so crafting
  one is the ordinary recipe question rather than a kernel one.

**Still open and untouched:** **#3** (attunement vs. mount capacity),
**#4** (reversibility of mounts), **#5** (certification authority).

### ⭐ The implant rung is this slate's Wave 2+, and it is unbuilt

Everything under *"The implant rung"* above stands. The ladder's third
rung — **mounted** — has no code: the shipped build has `eyeball` and
`carried` only. The attach point is real and deliberate: a channel names
a **capability**, and `AugmentMixin.confers()` already returns mixin
names, so an augment that confers a capability-bearing mixin widens the
instrument set with no change to any channel.

### Deferred seams the build left as clean attach points

Attach points, not stubs — ⚠ nothing in the shipped tree anticipates
these, because a hook several builds ahead of its consumer is what
`lint:unconsumed-seams` exists to find.

| seam | where it goes |
|---|---|
| **Samples of a bulk medium** — a flask of mine air, a bottle of river water, milk from a vat. `BulkPayload` takes provenance the way `CraftedMixin` echoes onto it; `sample` gains a case for a `Bulkable` subject into a carried vessel | here (parent) |
| **A soil portion + the soil bench rung** — farming has no spadeful class, so the bench rung for `acidity`/`texture` waits on one | here, cross-ref [smallholding.md](../../subsystems/smallholding.md) |
| **The multimeter** (`electrical`'s measure rung) and **a timepiece** (`time`'s) — a row each when content motivates; both channels already carry `instrument: ""` with the reason in `stakes` | here |
| **Attestation and the certified assayer** — `ReadingRecord` carries taker + band; a credential kind and a seat are institutions' | [credential.md](../../subsystems/credential.md), [institutions-slate](../builds/institutions-slate.md) |
| **An attended bench** — a human assayer serving in person, a lease, a visible queue; `AttendantMixin` on the bench when a position wants attention rather than a fee | [employment.md](../../subsystems/employment.md) |
| **The courier** — demand only; freight's mechanism | [freight-slate](../builds/freight-slate.md) |
| ⭐⭐ **The laboratory as a venue, and the calibration mirror** — the build leaves three things and no stubs: a **bench** that is a placeable object, a **field-call note** keyed on the same `sampledAt` the sample carries, and a **`ReadingRecord`** naming its taker and band. The venue multiplier applies to the credit call that already fires; the mirror is arithmetic over the two records | [advancement-slate](../builds/advancement-slate.md) § *Declared focus* |
| **Sensor augments, medical instruments, acoustic reads** | the requirements' non-goals, already homed |

### ⚠ Findings handed to other trades

- **A prospector who walks into Ferrow without stopping at provisioning
  dies of the damps**, and nothing on the way in says so. The canary and
  the provisioning room both exist; the prompt at the mouth does not.
  → mining.
- **A dressed character affords `wear`/`remove`/`equip`/`unequip`
  everywhere** — intake hands out a shirt, trousers and shoes and
  `WearableMixin` grants on `inventory`. → embodiment.
- **The general store's sewing-machine stock sits ON the counter**, so it
  is in the room's environment and arms every customer with `repair`.
  Whether a shop should is shopkeeping's call; a smithy's anvil is the
  same mechanism and is right. → shopkeeping.
- **Nothing hands competence back**, so any drive that must *earn* a band
  is dirty by construction. → advancement.
