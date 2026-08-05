# Physiology slate — the body's second half: function, time, intervention

**Captured 2026-08-02**, out of a chems/meds conversation that turned into
an audit. The trigger was practical — *mortality shipped and the world has
nothing to recover with* — but the finding underneath is structural:

> ⭐⭐⭐ **The body model is excellent at what KILLS you and nearly silent
> about what HURTS you.**

Every lethal axis is quantified in real units with per-species bands. But
there is no pain, no clearance, no immune response, and **no reader on
innervation or perfusion** — which are precisely the axes that govern
**function, recovery, and drugs.**

The cause is visible in the build order: **harm → vitals → death all came
off the physical-conflict path.** Every shipped body system answers *"what
is killing this body."* Nothing answers *"what can this body still do."*

> **User: "we probably should have had the recovery conversation when we
> first sketched out vitals and never did."** Correct, and this slate is
> that conversation.

> **Status: direction set, nothing built. FAST-TRACK.** § Part 3 was
> driven out against the source on 2026-08-02 and is requirements-ready;
> the roster is **shape**-urgent, not speed-urgent.

Related: [vitals.md](../../subsystems/vitals.md),
[harm.md](../../subsystems/harm.md),
[mortality.md](../../subsystems/mortality.md),
[metabolism.md](../../subsystems/metabolism.md),
[respiration.md](../../subsystems/respiration.md),
[thermal.md](../../subsystems/thermal.md),
[reserve.md](../../subsystems/reserve.md),
[magic.md](../../subsystems/magic.md),
[activity.md](../../subsystems/activity.md),
[residency.md](../../subsystems/residency.md),
[inquiry-slate](./inquiry-slate.md) (the science of magic),
[magic-items-slate](../tails/magic-items-slate.md),
[pharma-slate](./pharma-slate.md) (**the industry this opens**),
[discovery-slate](./discovery-slate.md) (the wild input),
[mind-slate](./mind-slate.md) (the mental layer).

---

## Where this leaves the model (consolidated 2026-08-02)

> **The old model answered "how close are you to dead." The new one
> answers "WHAT CAN YOU DO, AND WHY NOT."**

The *why not* is the load-bearing half — **you cannot treat a band.**

### Three tiers of truth

| Tier | Holds | Examples |
|---|---|---|
| **stored state** | the irreducible facts | vital signs · conditions · `bodyPartDeltas` · toxin burdens · tolerance |
| **derived reads** | everything computed on access | the health band · **function per part** · **capacity** · **pain** · the dying window · diagnosis |
| **ledger events** | what happened, append-only | accountability · transcript · chronicle |

**Nothing in tier 2 is ever stored; nothing in tier 1 is ever inferred.**
Already the house pattern — the model now *uses* it all the way up.

### The layers

| Layer | Status |
|---|---|
| **substrate** — 7 quantified vital signs, per-species profiles, anatomy tree + tissue masses, three condition kinds, reserves | **shipped** |
| **couplings** — `governs` · `innervatedBy` · `suppliedBy` · `covers` | **declared, ALL FOUR UNREAD** |
| **readers** — function per part (min along the path), capacity, pain | designed |
| **time** — derive-on-read for truth, alarms for consequence, offline healing | designed |
| **intervention** — five verbs, two payment methods, one extended command | designed |
| **economy** — labour-restored pricing, perishable stock, the free floor | designed |

### ⭐⭐⭐ Every addition is ADDITIVE

**Nothing shipped was invalidated.** Everything here is either **a reader
over a seam that already exists** or **a field on a structure that already
exists.** The four expensive decisions — no health scalar, real units,
anatomy as its own axis, derive-on-read — **all survived and got more
correct.**

> **The model was never wrong, only HALF-READ. This is the other half.**

### The rules that emerged, in order of load

1. **An organ exists iff something reads it** — and **capacities come
   before organs.**
2. **Function is the MINIMUM along the path**, not a sum — why paralysis
   and a severed artery are one mechanism.
3. **Derive on read for TRUTH; schedule the next event for CONSEQUENCE** —
   the alarm is a hint, never a fact.
4. **Time is the free heal; everything else buys time** — the humane floor,
   in the physics.
5. **Function returns fast, structure returns slow** — and **armour
   converts one into the other.**
6. **Medicine spends money; magic spends you** — magic adds **no medical
   verbs**, only a payment method.
7. **The recovery ratchet** — no path leaves you better than uninjured.
8. **Competence buys INFORMATION when you look, OUTCOMES when you act.**

### ⭐⭐ What the model deliberately CANNOT express

Boundaries, stated rather than left as silence:

| Absent | Why |
|---|---|
| **contagion / immunity** | deferred on purpose — **infection ships without it** |
| **aging** | not modelled; may matter for NPCs and the chronicle, **never for players** |
| **chronic illness** | everything designed is **acute-with-resolution** |
| **mental conditions** | ⚠ **Now its own slate → [mind-slate](./mind-slate.md)** (2026-08-02). The mind's *chronic* case is where chronic belongs — that slate deliberately reopens the boundary below |
| **sensory injury** | `sensoryPorts` still carry **no anatomy edge** |
| **reproduction** | scoped out |

### ⭐⭐⭐ One boundary that is a DECISION, not an accident

Everything in the model **resolves**. Nothing accumulates except **loss** —
missing tissue, and scars (which are **identity, not penalty**).

> **TIME HEALS EVERYTHING EXCEPT WHAT IS GONE.**

⚠ **Deliberately reopened for the mind** — see
[mind-slate](./mind-slate.md): *mental health is where CHRONIC belongs.*
The body returning to baseline and a mind condition being **managed
indefinitely** are different rules for a real reason.

Hold this deliberately: **no character slowly degrades into
unplayability**, which matters enormously in a persistent world — and even
loss has an answer, because **amputation is a slot.** The cost is that
**chronic illness and wear sit outside the model.** The right trade, but
**a choice rather than a gap.**

### ⭐ The smallest thing that proves all of it

> **Someone breaks their arm, cannot work, gets it set, and works again —
> with a bill.**

One scene exercising **anatomy · the function axis · the two timescales ·
treatment · competence · the care economy.** If that works end to end the
model is real; **if it does not, nothing downstream matters.**

---

## Part 1 — The inventory

What actually exists, read off the shipped docs rather than from memory.

| System | State |
|---|---|
| **circulatory** | **strong** — `bloodVolume` (L), `heartRate`, systolic + diastolic, heart part with `governsVital` |
| **respiratory** | **strong** — `spo2`, `respiratoryRate`, lungs, `breathableMedia`, asphyxiation |
| **digestive** | **strong** — digestion buffer, meal chemistry, toxins |
| **thermoregulatory** | **strong** — `coreTemperature`, Newton cooling |
| **musculoskeletal** | **partial** — bone/muscle/flesh tissues with per-part **masses**, `fracture` trauma; **no strength reading** |
| **nervous** | ⚠ **`innervatedBy` declared, NO READER** |
| **vascular (regional)** | ⚠ **`suppliedBy` declared, NO READER** |
| **immune** | **absent** (the `contagion: null` seam is cut) |
| **clearance (hepatic/renal)** | ⚠ **CORRECTED 2026-08-02 — NOT absent.** Per-substance clearance rates ship on the toxin path; what is absent is an **organ** that modulates them. See § Part 7b |
| **endocrine / reproductive / lymphatic** | **absent** |

Also inert today:

- `TRAUMA_BEHAVIOR` ships a **no-op exemplar for every type** — *"the
  shape, not live behavior."*
- **Nothing ticks.** `afflict`/`relieve` are pure add/remove.

### ⭐ What is RIGHT, and must not be disturbed

The expensive-to-change decisions are all correct and all
additive-friendly:

- **no stored health scalar** — the band is a rendered view;
- **quantified vital signs in real units** with per-species
  `vitalProfile` bands;
- **anatomy as its own axis** — slots *reference* parts, parts know
  nothing of slots;
- **instance-deltas over shared `BodyPlan` structure**;
- **derive-on-read everywhere**.

> **The model is not wrong. It is HALF-READ.** Most of what this slate
> wants is a *reader* over seams that are already declared.

---

## Part 2 — ⭐⭐⭐⭐ The missing primitive: a function axis

> **The anatomy already knows where you are hurt, and nothing ever asks it
> what that means.**

`SlotSpec.bodyPart` consults anatomy only for `missing` — the doc says
outright it is *"a coarse consult… no-op unless the part is gone."*

> **The body is BINARY where it should be GRADED.** A severed hand
> disables a slot; a shattered one does nothing at all.

What is absent is **capacity** — a derive-on-read answer to *what can this
part currently do*, computed from its trauma, tissue damage, perfusion and
innervation. Same pattern as everything else in the codebase.

**It unblocks four stuck things at once:**

| | |
|---|---|
| **combat** | a fractured arm degrades what that arm does — **hit location finally means something** |
| **medicine** | treatment targets a part and restores **function**, which is what medicine actually is |
| **masking** | a drug buys function you should not have — *the* chems mechanic |
| **recovery** | becomes legible: *you can grip again* |

⭐ It is also the substrate the deferred **strength/dexterity** attributes
were always going to need, and which the per-tissue **masses** were put
there to feed.

### The specification (driven out 2026-08-02)

#### ⭐⭐⭐ Two tiers, and the words earn their difference

| Tier | Question | Derived from |
|---|---|---|
| **function** — per part | *how well is this hand working* | local trauma × tissue loss × **conduction** × **supply** |
| **capacity** — whole body | *can I walk / grip / stay conscious* | composed from the parts that serve it |

`locomotion = f(function of legs, feet)`; `manipulation = f(arms, hands)`;
`consciousness = f(brain)`. **The Part 3 roster is just which parts serve
which capacity.**

#### ⭐⭐⭐ Function is the MINIMUM along the path, not a sum

> **A perfectly healthy hand on a severed nerve is zero.**

Conduction and supply are **chains**, and a chain is as strong as its
weakest link — literally, not metaphorically. That operator is what makes
the graph load-bearing instead of decorative, and it is why **paralysis
and a severed artery come out of the same read.**

#### ⭐⭐⭐ The tier split IS the diagnosis gap

> **Medicine treats PARTS. Gameplay reads CAPACITIES.**

You experience *"I can't walk."* You need an expert to say *"your supply
is cut, not your bone."* Not a contrivance to give the physician a job —
the **same competence-buys-information rule `assess` already ships**,
sitting on a real structural boundary.

#### The surface

Methods on the host (inter-Stuff contract), and **consumers never ask for
a number**:

- `creature.functionAt('body.arm.left.hand')` → band *(the physician's read)*
- `creature.capacity('manipulation')` → band *(the composed read)*
- `creature.canGrip()` / `canBearWeight()` / `isConscious()` → predicates
  *(what everything else calls)*

**Bands, not scalars** — following the health band's own precedent: *a
rendered view, never the source of truth.*

---

## Part 3 — The roster: capacities first, then organs

**Driven out 2026-08-02 against the actual data.** The shipped roster is
**13 keys across exactly two authored plans** (`biped.yaml`,
`quadruped.yaml`):

```
body.torso                    (root)
├── body.head                 severable
├── body.arm.{left,right}     severable
│   └── .hand                 severable
├── body.leg.{left,right}     severable
│   └── .foot                 severable
├── body.torso.heart          governsVital: heartRate
└── body.torso.lungs          governsVital: respiratoryRate
```

### ⚠ Correcting this slate's own first framing

An earlier pass here said *"the ROSTER has a deadline."* **Overstated.**
`body.*` keys reach persisted state two ways (`bodyPartDeltas`,
`Trauma.site`), but:

> **ADDING a part is additive and free at any time. RESTRUCTURING existing
> keys is the migration.**

`body.head.brain` costs nothing to add in a year. What costs is deciding
later that organs should not hang off their container, or that the spine
should have been segmented.

> **So the urgency is not "author every organ now" — it is GET THE SHAPE
> RIGHT NOW, and add only what has a reader.** Which lets us be
> disciplined instead of greedy.

### ⭐⭐ And the diagnosis is worse than `vitals.md` says

**`governsVital` has NO production reader.** Authored on heart and lungs,
mentioned in a comment in `Vitals.ts`, read only in tests.

> **The entire anatomy layer has ONE production consumer: the binary
> `missing` check in `SlottedMixin.canOccupy`.**

`governsVital`, `innervatedBy`, `suppliedBy`, `severable`, `covers` and
every tissue mass are authored-or-declared and unread. **The anatomy is
decorative today.**

### ⭐⭐⭐⭐ Which reorders the waves: capacities before roster

`governsVital` points at a **stored vital sign**. Consciousness is not one
(it is derived from blood volume, SpO₂ and head trauma); neither is
clearance. So brain and liver cannot use the coupling as it stands — and
that exposes the real dependency:

> **An organ exists iff it GOVERNS A CAPACITY — so you cannot pick organs
> before you pick capacities.**

The roster does not come first. **The capacity vocabulary does**, and the
roster falls out of it mechanically.

### The capacity vocabulary — derived from CONSUMERS, not from biology

| Capacity | Read by | Organ? |
|---|---|---|
| **circulation** | vitals, the dying clock | **heart** ✓ shipped |
| **respiration** | respiration, asphyxiation | **lungs** ✓ shipped |
| **consciousness** | `getConsciousness`, agency gating, dying | ⭐ **brain** — *live consumer today* |
| **locomotion** | LocomotionApi, movement modes | **legs/feet** — parts exist |
| **manipulation** | slots, crafting, combat | **arms/hands** — parts exist |
| **exertion** | metabolism (drives thirst), encumbrance | **derived** — muscle mass × circulation × respiration |
| **clearance** | chems, toxins | ⭐ **new** |
| thermoregulation | thermal | **whole-body, no organ** |

**Half of it is already anatomically covered.** The additions are exactly
two.

**Minimal field change:** `governsVital: string` → **`governs: string`**
over a namespace covering both stored signs and derived capacities. Both
existing rows stay valid unchanged.

### ⭐⭐⭐ GOVERNS vs CONDUCTS — and it needs no new field

The spine governs nothing. It **conducts**. And the fields are already on
`BodyPart`, declared and never authored:

> **Some parts GOVERN a capacity. Others CONDUCT it.** — `governs` vs
> `innervatedBy` / `suppliedBy`.

> ⭐ **Paralysis and a severed artery are the SAME MECHANISM at different
> points in one graph** — and the graph is already typed. Nothing to build
> but authored data and a reader.

⭐ **The authoring rule that keeps the data tiny:**

> **Author the graph only where it DIVERGES from the tree.**

For limbs the structural tree already *is* the supply path — a hand hangs
off an arm and is fed through it. The **only** divergence is the spine:
arms attach at the torso but innervate from the neck.

### The roster

| Key | Parent | Role | Why now |
|---|---|---|---|
| `body.head.brain` | `body.head` | **governs: consciousness** | `getConsciousness` already reads head trauma — **a live consumer today** |
| `body.torso.spine.upper` | `body.torso` | **conduit** — arms + all below | the function axis is a named wave |
| `body.torso.spine.lower` | `body.torso.spine.upper` | **conduit** — legs | quadriplegia vs paraplegia, the only playable distinction |
| `body.torso.liver` | `body.torso` | **governs: clearance** | chems have nowhere to live without it |

- **Naming stays containment-based**, matching the shipped convention — so
  brain is `body.head.brain`, never `body.torso.brain`. ⭐ It also means
  **decapitation takes the brain through the TREE** rather than by special
  case.
- ⭐ **Two spine segments, not one or three.** Asymmetric cost: shipping
  two and reading one is harmless; shipping one and wanting two is a
  migration. The parent edge (`lower` under `upper`) encodes *damage high,
  lose everything below* for free.
- ⭐ **"Liver", not "clearance organ"** — the recognizability gate. It
  abstracts the kidneys and nobody will care; a player knows what a liver
  is for.

**Deferred, and now genuinely free to defer** (additive later): throat /
vocalization, eyes-as-parts, gut, kidneys, skin. **No reader, no named
wave, no cost to waiting.**

### ⚠ Three findings from the read-through

1. **Tissue masses sum to 92.9 kg against `baseMass: 70`.** Either they
   are relative-not-absolute (then say so at the site) or it is wrong —
   and it will look wrong the first time anything aggregates them, which
   **the planned strength reading is designed to do**.
2. **`sensoryPorts` and `bodyParts` are two anatomies that do not
   reference each other.** A port carries no `bodyPart` edge, so **an eye
   cannot be injured** — the same binary/graded gap in a different place.
   Cheap fix: one optional field, mirroring `SlotSpec.bodyPart`.
3. **Does `missing` cascade down the tree?** Instance deltas are per-key.
   If it does not, you can sever an arm and keep the hand. **A CURRENT
   correctness question, not a future one.**
4. **`SlotSpec.covers` has no consumer either** — armor coverage and
   hit-location are declared seams. **Third instance of the same finding**
   (after `governsVital` and `innervatedBy`/`suppliedBy`).

---

## Part 4 — ⭐⭐ Pain is a READER, not an organ

Tempting to model as a system; should be **derived** — trauma severity ×
site × innervation × masking. Fits the house pattern, cheap to add.

Not optional, though:

> **Without pain, a painkiller has nothing to suppress, and "mask" is not
> a verb we can implement.**

---

## Part 4b — Recovery time, and why armor is the balance (2026-08-02)

### The arithmetic has to be faced

At 12×, one game day is **two real hours**:

| Injury | Real medicine | At 12× |
|---|---|---|
| minor laceration | ~7 days | **14 real hours** |
| concussion | 1–2 weeks | **28–56 real hours** |
| **fractured bone** | 6 weeks | **84 real hours** |
| blood volume restored | ~2 days | 4 real hours |

> **This slate's own thesis — *time is the free heal, everything else buys
> time* — is UNPRICEABLE until these numbers exist.** A med's value is the
> hours it saves; the hours must be real first.

### ⭐⭐⭐⭐ The linkdead freeze is BACKWARDS for healing

`mortality.md`: *"Every other arm of `reconcileConditions` freezes while a
player is linkdead… so that being away never costs you anything."*

Correct for hunger, thirst, cold — **decay**. But healing is a *benefit*,
so freezing it means being away never **helps** either — which turns 84
game-hours into 84 hours of *played* time, i.e. months of real calendar.

> **The freeze is right for DECAY and wrong for REPAIR. They are the same
> code path today.**

**A third divergence in `reconcileConditions`**, alongside the dying-clock
carve mortality already made. And it flips the problem:

> ⭐⭐⭐ **You log off with a splint and come back mended.**

#### And it lands on a design already written

> **The bed's product is RECOVERY TIME.**

*Beds optimise your logged-out state* was already the design and the
innkeeper was already a vocation looking for a reason. **This is the
reason.** Rough ground vs a real bed vs a clinic cot = **a rate
multiplier on the thing you were going to do anyway** — the best shape a
service can have: **it never gates, it only accelerates.**

### ⭐⭐⭐⭐ Function returns fast; structure returns slow

Real recovery already has the shape we need, so nothing has to be fudged:

> **You are functional long before you are healed. The gap between them is
> where medicine lives.**

| Axis | Timescale | Governs |
|---|---|---|
| **function** | **hours** | can you walk, grip, work — *playable* |
| **structure** | **days** | is the bone knit — *consequential* |

- the **disabling** window is short — nobody loses a week of play;
- the **fragile** window is long — injury still means something;
- ⭐ **re-injury becomes a real mechanic** — push on a half-knit bone and
  it breaks again, which makes **resting a choice rather than a chore.**

**Implementation is shipped**: function tracks **reserves** (refill on the
metabolism timescale, hours); structure tracks the **trauma record** (its
own clock, days). No new timing machinery, and the derive-from-principles
property survives because that *is* how bodies work.

### ⭐ Onboarding falls out with no special-casing

> **A newbie in the wilds gets contusions and lacerations — hours.
> Fractures come from falls, big animals and weapons.**

Difficulty gating for free: **the scary things are the ones that produce
the slow injuries.**

### ⭐⭐⭐⭐ Armor converts STRUCTURAL injury into FUNCTIONAL injury

**(User: *"armor is meant to mitigate a lot of this so things are allowed
to hurt, it should be impactful otherwise armor is just costume."*)**

Materials-response is already `f(mechanism, material, construction)`, so
armor does not reduce a number — it **changes which channel gets
through.** Mail against a blade: the cut never reaches flesh. Mail against
a mace: the energy transfers anyway.

| | Unarmored | Armored |
|---|---|---|
| **you get** | laceration → bleeding → **the dying clock** | contusion → **function loss only** |
| **timescale** | **days** | **hours** |

> **Armor is what keeps you out of the days-long category.**

Which resolves the worry backwards from how it first looked: the
function/structure split is **not a softener that undercuts armor — it is
what makes armor load-bearing.** ⭐ **The severity dial lives entirely on
the UNARMORED case:** being hit without armor should be genuinely
frightening; being hit with it should hurt, degrade you, and let you keep
fighting.

⚠ **`SlotSpec.covers` is declared with no consumer** — *"for future armor
/ hit-location — declared seam."* **Armor coverage is decorative too**, and
must light up in the same wave as the function axis: it is the same read —
*what is at this site, and what is protecting it.*

### The five trauma types differ in SHAPE, not magnitude

The spec the no-op `TRAUMA_BEHAVIOR` table is missing:

| Type | Function | Structure | Signature |
|---|---|---|---|
| **laceration** | mild | **bleeding → the dying clock** | blood loss |
| **fracture** | **severe** | slow (days) | cannot bear weight / grip |
| **contusion** | moderate | fast (hours) | ⭐ **the armored outcome** |
| **avulsion** | severe | **tissue is GONE** — permanent without intervention | the surgeon's case |
| **burn** | moderate | slow **+ infection risk** | the fire channel's output |

**A character each, instead of a severity number** — and a player learns
them the way you learn real injuries: by which one ruined which week.

### ⭐⭐⭐⭐ The cross-build exploit this creates

`divideBody` drains the body to baseline and **clears every condition**:

> **Death is currently a guaranteed, complete cure.**

Harmless when nothing healed slowly. The moment a fracture takes days and
`passage` takes twenty minutes, **players will kill themselves to heal**
and *field surgery by execution* becomes the meta.

The fix uses the mortality build as designed rather than fighting it:

> **The floor route's diminishment must EXCEED the worst injury it cures.**

`recovering` currently clears as metabolism refills — hours. It must
outlast what it erases. That keeps `passage` a **stranding-preventer, not
a treatment**, and **preserves the resurrection market**, whose entire
value proposition is offering less diminishment than the floor.

⚠ A real interaction between two builds that would surface only in
playtest — the physiology build must **re-read the mortality numbers, not
assume them.**

## Part 5 — ⭐⭐⭐⭐ The time problem: alarms, not a heartbeat

**(User: *"given everything is derive on read I think we'll probably need
some kinda heartbeat which we've avoided until now."*)**

Smaller than a heartbeat — and note we have not avoided ticking in
general. `ScheduleApi.recurring` is the **mandated** primitive; combat has
a cadence, reactions flush on a beat, attendant sweeps idle, residency
sweeps the cold tail. What we have avoided is **a per-object simulation
tick**, which was right.

### Mortality already proved the hard case needs none

The dying clock is the most timing-critical thing in the game, runs while
disconnected, and ships with no tick:

> **"you were dying, nobody came, and the reading resolves that when
> someone finally looks."**

`DyingRecord` persists, accrues, survives eviction, and deliberately opts
out of the linkdead freeze. **Truth is latent and surfaces on read.**

### What derive-on-read genuinely cannot do

| | |
|---|---|
| ⭐ **notify** | state resolves correctly and **nobody is told**. *"Your fever broke"* never fires |
| ⭐⭐ **couple** | an effect on **another object that was never read** — contagion, fire spread, a corpse fouling a well |
| branch | A spawns B; replayable, but the code gets ugly |
| order | interleaving of unobserved events across objects |

The first is an **experience** problem, not a correctness one — but it is
the real one: *a body that only changes when you `assess` it feels like a
spreadsheet.* The second is the genuine architectural gap, and **disease
is exactly it**, which is presumably why `contagion` was left null.

### ⭐⭐⭐⭐ The safe form: the tick is a READER, not a simulator

The danger in adding a tick is a **second path where state changes**.

> **The tick does not advance the body. It OBSERVES it — and observation
> is already what advances it.**

It calls the same `reconcileConditions` a `look` calls. No new physics, no
second code path, nothing to keep in sync. **A synthetic reader standing
in for the player who is not there.**

### ⭐⭐⭐⭐ Better than a heartbeat: an alarm clock

A polled heartbeat is O(objects). But a body with closed-form state
**knows when its next interesting moment is** — bleeding at a known rate
knows when it crosses the dying threshold; a drug with first-order
clearance knows when it drops below effect.

> **Do not poll. BOOK THE READ.**

`ScheduleApi.schedule` already exists and already wraps
`ExecutionContextApi.runRoot` for attribution.

**O(events), not O(objects)** — and precise rather than sampled.

### ⭐⭐⭐ The property that makes it safe to add

> **The alarm is a HINT, not a fact.**

Dropped, lost on restart, thrashed or wrong → **correctness is
unaffected**; the next real read still resolves the truth, exactly as
mortality proves. Alarms buy **timeliness**, never **validity**.

> **If the alarm never fires, nothing is wrong. It is just late.**

⚠ Therefore alarms must be **rebuildable from state and never persisted as
authority** — cf. the `WorldClockRegistry` guard the houseplant build
tripped over.

### Who gets read, and how often

> ⭐ **Tick rate is the derivative of how fast you are changing.**

| State | Read |
|---|---|
| healthy | **never** |
| injured / medicated | minutes |
| **dying / burning / hemorrhaging** | seconds |

The urgent set is always tiny, and the boundary is already drawn:
**residency**. An evicted body gets no alarms and re-derives on return.

### Coupling rides ACTS where it can

> ⭐⭐ **Contagion happens on contact, and contact is an act.** Fire
> spreads when something is touched, entered, or read.

Keeps the world event-sourced. The residue is the honest alarm case — **a
fire in an empty room still burns the building down** — and the fire books
its own next milestone when it starts.

### ⭐⭐⭐ The doctrine, in one line

> **Derive on read for TRUTH. Schedule the next event for CONSEQUENCE.**

An addition to the house pattern, not a retreat from it.

⭐ **What books the alarm:** cleanest is that `reconcileConditions`
**returns its own next-interesting-time** as a by-product of the
derivation it is already doing — so booking is free, always current, and
impossible to forget, because *the only way to get state is to also get
its expiry.*

---

## Part 6 — ⚠ The blocker: the Condition catalogue is not live

From `vitals.md` / `mortality.md`, verbatim:

> **"No Condition Idea is live at any path today"** — seeds are inserted
> as template ROWS and nothing clones them into Ideas at boot, so
> `findByTemplatePath` answers `null` for **every** condition.
> `starvation` as much as `recovering`.

Every consumer quietly tolerates it (`Metabolic.resolveToxinBehavior`
`?.`-chains, `MagicLogic` null-checks, `assess` falls back to the path
leaf), which is why it never failed loudly.

**Chems and meds act on conditions.** A drug's entire contract is *arrest
this, mask that, prevent the other* — and there is currently nothing
authored for it to name.

> **Instantiating the catalogue is WAVE 1.** Not a nice-to-have.

---

## Part 7 — Heals & buffs

### ⭐⭐⭐⭐ There is no "heal" — there are five verbs on a condition

No HP pool exists to refill, so the design vocabulary is not *how much*:

| Verb | Example |
|---|---|
| **arrest** | a tourniquet stops the bleed |
| **accelerate** | rest, nutrition, a clean dressing |
| ⭐ **mask** | painkiller, stimulant — suppress the **symptom**, not the cause |
| **restore** | set the bone, revive from unconsciousness |
| **prevent** | antitoxin, inoculation, prophylaxis |

A far richer surface than a heal number, and **forced by the
architecture** rather than chosen.

### ⭐⭐⭐ Time is the free heal; everything else buys time

> **The default heal is rest and shelter.**

Half-designed already — beds optimise the logged-out state, the innkeeper
exists, metabolism handles nutrition. **Recovery is diegetic downtime, not
a consumable.**

- potions-as-default ⇒ healing is a commodity purchase, the market is a
  vending machine;
- **time-as-default ⇒ every med is priced against the hours it saves**,
  which is legible, honest, self-balancing, and **never locks out a broke
  player** — they just recover slowly.

### ⭐⭐⭐ Masking is where the gameplay is

Arrest and accelerate are logistics. **Mask is a decision.**

> **Masking converts a health problem into a LATER, BIGGER health problem,
> in exchange for NOW.**

Fight with the broken rib. Stay awake through the watch. Walk out of the
delve on a leg that should not hold. A genuine tragic choice rather than a
resource spend, exactly what painkillers and stimulants really do, and the
natural home for **tolerance** — a curve, not a punishment.

⚠ **Chemistry, never morality.** Dose-response and tolerance are physics;
the game does not editorialise in either direction.

### ⭐⭐⭐ Buffs: change what is POSSIBLE, not what is OPTIMAL

Extends *add the upside, never the downside*:

> **If a buff changes what is optimal, everyone takes it always and it
> becomes a tax.**

So buffs widen **access**, not numbers. Cold chems let you go north; a
stimulant lets you take the night shift; an antitoxin lets you work the
swamp. **Nothing may be balanced around being buffed** — which keeps the
category un-inflationary and keeps the unbuffed player playing the same
game.

---

## Part 7b — What a med IS as an object (2026-08-02)

### ⚠ Correcting Part 1: the pharmacokinetics are already built

This slate first listed clearance as **absent**. Wrong — metabolism's
Wave 2 was not read closely enough. What ships on the toxin path:

| Shipped | |
|---|---|
| `Material.nutrientAmounts` (tag → mg/serving) + `toxicity: ToxinTag[]` | the **substance profile** |
| `toxinBurdens` — sparse per-body scalar, created on first exposure | the **body burden** |
| `burden += absorbed × potency / bodyMass` | **dose normalised by body mass** |
| `ToxinBehavior` — absorption / **clearance** / potency / **bands** | authored on the **`Condition` seed**, not a code table |
| *"toxin burdens fall at their clearance rate"* | **clearance exists** |
| each toxin → **one banded `Condition`** | dose-response, banded |
| `introduceToxin(type, amount)` — *"the bloodstream seam, past digestion"* | **injection, already there** |
| the alcohol / BAC exemplar + the Widmark helper | a worked case |
| `vomit` + antidote | the reversal |

**A complete pharmacokinetic model. It only lacks a sign.**

### ⭐⭐⭐⭐⭐ One substance system — the band decides help or harm

> **A drug is not a different kind of thing from a poison. It is the same
> thing at a different dose.**

So chems is a **generalisation, not a new system** — and unifying is not a
shortcut, it is the pedagogically correct model:

> ⭐⭐⭐ **One substance system, where the BAND decides whether it helps or
> harms. Overdose stops being a special case and becomes automatic.**

⭐⭐ **The therapeutic window falls out for free**: author a substance
whose low band is beneficial and whose high band is harmful and you have
expressed **the gap between enough to work and enough to hurt** — the
central concept of pharmacology — using only the band structure that
already exists. *Paracetamol is a hepatotoxin at 4 g; alcohol is already
modelled this way.* **The system was always general; it was authored
pessimistically.**

### Routes — and they mirror the function axis exactly

| Route | Scope | Onset | Status |
|---|---|---|---|
| **ingest** | systemic | slow — the digestion buffer | shipped |
| **inject** | systemic | fast — `introduceToxin`, past digestion | **shipped** |
| **topical** | ⭐ **local — one PART** | medium | `Dressing.ts` is the seam |
| **inhale** | systemic | fastest | new |

> ⭐⭐⭐ **Route decides whether an intervention is SYSTEMIC or LOCAL** —
> the same part/whole-body split as function-vs-capacity.

Which sorts the five verbs cleanly: **arrest is LOCAL** (tourniquet,
dressing, a poultice on *that* arm); **mask is SYSTEMIC** (a painkiller
does not know where it hurts).

### The object model — and what an apothecary sells

| Layer | What | Status |
|---|---|---|
| **Material** | the substance profile | **closed, curated set** |
| **BulkPayload** | the **blend** — derived profile from a combination | shipped |
| **Stuff** | vial / poultice / pill — Grade, shelf life | shipped |

⚠ The closed-Material rule looks like a problem — *can an apothecary
invent a drug?* — and resolves well:

> ⭐⭐⭐ **No new Material rows. New BLENDS. The apothecary's skill is
> CONCENTRATION, not invention.**

Pharmacologically true (preparations are combinations and concentrations
of known actives) and mechanically ideal: **Grade becomes potency** — the
same herbs in better hands yield a stronger draught. **Recipe packs still
add zero material rows**, exactly as the doctrine requires. Meds ride the
existing `recipes` collection; no new machinery.

### ⭐⭐ Dose is already a verb

The bulk `measure` grammar ships (`fill` / `pour` / `drink <measure>`).

> **You can already overdose by pouring.**

Dose-response lives in the **verb grammar** with nothing to build — the
best possible place for it: *nobody reads a tooltip; everybody notices
they poured three.*

**Shelf life** then defaults simply — **stale means WEAK**, potency
decaying toward zero rather than toward harm. Stock rotation becomes a
real business problem without making old medicine a trap.

### ⭐⭐⭐ The liver gets much cheaper

Clearance is already authored per-substance, so the organ does not
introduce it — it **modulates** it:

```
effectiveClearance = authoredRate × function('body.torso.liver')
```

One multiplier hooked to the function axis, and immediately meaningful:
**a damaged liver means everything lingers** — drink hits harder, doses
stack, a survivable poison kills. Real physiology, one line of
arithmetic, and it earns the organ by connecting two systems that already
exist.

## Part 7c — Infection, permanence, and the recovery ratchet (2026-08-02)

Between them these answer the question the slate had not: **why would
anyone bother treating a wound?**

### ⭐⭐⭐ Infection is the reason medicine exists

Not a metaphor — **the entire field of surgery was gated on antisepsis.**
And mechanically the same: if wounds always heal on their own, a medic is
a convenience.

> **Trauma gives you a problem. INFECTION GIVES YOU A DEADLINE.**

Every other injury you treat when convenient; infection you treat **now**
or it gets much worse. **The only genuine urgency in medicine outside the
dying clock** — and urgency is what makes a medic worth *calling* rather
than worth *having*.

### ⭐⭐ The local→systemic bridge, with a signature that already exists

A laceration on your arm becomes a fever in your whole body — **the
function/capacity tier crossing, running upward with bad news.** And
`coreTemperature` with *fever ↑* is a **shipped vital sign**, so the
readout needs nothing new. **The first condition that turns a part problem
into a body problem** — exactly what the two-tier model was built for.

### ⭐⭐⭐⭐ Where ENVIRONMENT finally enters the body model

Nothing else in physiology cares where you are. Risk is a product of:

| | |
|---|---|
| **the wound** | avulsion / burn > laceration > contusion |
| **the instrument** | a rusty blade, a beast's teeth, a clean scalpel |
| ⭐ **the place** | a sewer, a stable, a battlefield, a clinic |
| **the treatment** | dressed or not, and with what |

**The sewer becomes genuinely dangerous in a way that is not a monster**,
and it retroactively pays for **sanitation, biomes, and the bathroom
slate's *washing = enabling*** — this is what washing enables.

> ⭐⭐ **Hand-washing is the single most consequential medical intervention
> in history**, and we can express it as a MECHANIC rather than a fact.

One of the better pedagogical wins available, at almost no cost.

### ⭐ It needs no contagion — so it ships BEFORE disease

Wound infection is **environmental, not transmitted.** It sidesteps the
`contagion: null` seam and the Part 5 coupling problem entirely — which
makes it **the right first proof of "a burden that GROWS"** (the disease
keystone's core pattern) without any of disease's hard parts.

### ⭐⭐⭐ Permanence: a scar is IDENTITY, not penalty

The instinct is a stat malus. **Wrong subsystem.** Belief already does
per-viewer identity memory, recognition and disguise — and a scar is a
**durable identifying feature.**

> **A scar is not a stat. It is a fact about you that other people can
> see.**

Fits everything the project already believes (evidence not score, the
record is the product, add the upside), and it gives **disguise something
to defeat and recognition something to key on** — *"the one with the
burned hand."*

### ⭐⭐⭐⭐ Amputation is not an ending. It is a SLOT.

Permanent function loss is the scary case and the answer is already
built: `SlotSpec.bodyPart` disables a slot when the part is gone, so **a
prosthetic re-enables it** — and augmentation (augment-confers-mixin, the
cranial bay, the three-base capability model) is sitting right there.

> **injury → loss → prosthetic** is a real arc, and it gives augmentation
> a reason people acquire augments **that is not min-maxing.**

The surgeon also gets a signature **non-emergency** procedure: re-breaking
and setting a bone that healed wrong.

### ⭐⭐⭐ The doctrine this exposes — THE RECOVERY RATCHET

**Second time in this slate** a recovery path threatens to be *better*
than not being hurt (death clears every condition; a prosthetic could beat
a hand).

> **NO RECOVERY PATH MAY LEAVE YOU BETTER OFF THAN NEVER HAVING BEEN
> INJURED.**

Otherwise **injury becomes a strategy** and players hurt themselves on
purpose. Covers death-as-cure, prosthetic-as-upgrade, and whatever the
third instance turns out to be. For prosthetics specifically: **restore
function, never exceed it** — good, not better; no sensation, worse fine
control, a real cost to fit.

⚠ **Stated as a rule rather than fixed case-by-case**, because this family
keeps recurring.

## Part 7d — Sleep, beds, and being logged in (2026-08-02)

**(User: sleep is currently ~"necessarily logged out", but it need not be
— getting into bed WITHOUT logging out to heal is legit. So: what is the
difference between being IN bed and being ASLEEP in bed, and do we model
sleep-while-logged-in? If we do, comms/aether must still work — and how
is that justified?)**

### ⭐⭐⭐ It is not one thing with two levels — it is TWO SHIPPED AXES

> **Being in bed is a POSTURE. Being asleep is a CONSCIOUSNESS state.**

| | Awake | Asleep |
|---|---|---|
| **in bed** | **resting** — full agency, going nowhere | **best recovery** — absent |
| **not in bed** | normal life | **collapsed / drugged** — heals badly, very exposed |

Posture ships (`Postured` + `Posed` + the posture-bearing slot);
consciousness ships (`getConsciousness`), and per Part 3 **the brain
governs it**.

> ⚠ **CORRECTED (user pushback):** an earlier pass here said *"sleep is
> voluntary unconsciousness."* **Wrong on the actual science** — see §
> Sleep is not unconsciousness, below. Sleep is a distinct consciousness
> state that **filters** rather than switches off; it shares the axis with
> injury unconsciousness but is **not** the same state. **Still no new
> state machine.**

⭐ And the 2×2 surfaces the cell nobody designs — **in bed and awake** =
**convalescence**: laid up, recovering well, **completely present.** When
people read, talk, and get visited.

*(Orthogonal to the presence/hollowing axis — that slate is explicit:
"Not `getConsciousness`. An unconscious person is present-but-asleep.")*

### ⭐⭐⭐ Sleep is NOT unconsciousness — and that is why comms work

**(User, and the load-bearing constraint: *"no one wants to sleep in a
video game if they can't at least chat with their friends while they wait
it out… some basic comms need to be present all the time or the player is
just stranded."* An earlier pass here had messages merely QUEUE while you
slept — receive-only. That is the design being corrected.)**

**Anaesthesia is unconsciousness. Sleep is not.** The sleeping brain is
highly active and **filtering, not off**: you wake to your own name at
conversational volume and sleep through louder noise that means nothing.
It processes sound, forms memories, runs experiences all night.

So the state the earlier pass modelled **does not exist** — and once that
is corrected, live comms need no justification at all.

#### ⭐⭐⭐⭐ The Vocal/Aether split already does all the work

**Shipped, not invented**: acoustic speech and implant comms are
different capabilities. **Vocal needs a mouth and ears. Aether needs a
cranial implant.**

> **Sleep takes away the BODY's interface, not the BRAIN's.**

Which makes the aether **the one channel sleep does not close** —
precisely *because* it never used the body in the first place.

> ⭐⭐⭐ **SLEEP COSTS YOU YOUR BODY, NOT YOUR MIND.**

Derivable from what is already true about the aether, and it **spends
nothing** from the one-impossible-thing budget (see
`docs/arcane-science.md` — ⚠ not in the repo at time of writing, so
unchecked).

⚠ **No dream layer is needed or wanted as a JUSTIFICATION.** If a dream
surface is ever built it is **content — a place** — never the reason chat
works. Hooking the internet to dreams is exactly the mystification the
*aether is just the internet* doctrine exists to prevent.

### The balance rule that stops the distortion

> **The bed heals you. The client does not.**

**Same rate logged in or out.** The body does not know whether anyone is
watching ⇒ **no idling incentive, no penalty for leaving.** Staying
connected becomes **a choice about presence, never an optimisation.**

### ⭐⭐⭐ So the reason to sleep logged in is a clean trade

| | Comms | Body | Healing | Safe |
|---|---|---|---|---|
| **logged out** | **none** | absent | full rate | **yes** |
| **asleep, logged in** | ⭐ **full** | unattended | full rate | **no** |
| **in bed, awake** | full | yours | full rate | you are watching |

> ⭐ **Sleep is the SOCIAL rest state** — lying down with your friends in
> your ear, which is the actual thing people do while waiting anything
> out. **Logging out is what you do when you are DONE, not when you are
> WAITING.**

Vulnerability stays real without stranding anyone: **your body is
unattended, your mind is on the network.** *You can be robbed while
chatting about it.*

**What you can and cannot do asleep:**

| Can | Cannot |
|---|---|
| aether comms — `dm` / `tell` / channels | see, hear, or speak aloud |
| | move, act, use your hands |
| | perceive the room |

#### ⭐⭐⭐ RESOLVED — the question was malformed

**(User: *"you should absolutely be able to watch a livestream while
asleep. watching a livestream is not really diegetic… livestreaming is a
feature because livestreaming communities are a vertical I want to market
to and they need that medium to be part of the interface."*)**

Asking *"does the body permit watching a stream while asleep"* was the
error — **the body has no jurisdiction over the client's interface.**

> **Sleep gates what your CHARACTER can do. It has no opinion about your
> CLIENT.**

**Three tiers, and an earlier pass collapsed two of them:**

| Tier | Gated by | Asleep? |
|---|---|---|
| **body** — move, act, perceive the room, speak aloud | anatomy + consciousness | **blocked** |
| **implant / aether** — `dm`, `tell`, channels | the implant existing and working | **survives** — it never used the body |
| **client interface** — the stream pane, layouts, help, settings | **nothing in-world** | **NOT GATED AT ALL** |

> ⭐⭐ **SERVER-AUTHORITATIVE ≠ DIEGETIC.** `cockpit.layout` is
> server-driven, so the stream pane is fully server-authoritative *and*
> not part of the world. *Nothing is pure client* constrains where
> **authority** lives; it says nothing about what is **fiction**.

#### ⭐⭐⭐⭐ The product rule this implies

> **A feature that exists to serve a REAL-WORLD AUDIENCE must never be
> gated by IN-WORLD PROGRESSION.**

Streaming is in the interface because **streaming communities are a
marketing vertical** and they need the medium present. It must work for a
brand-new player in their first minute — **no TV to own, no aether upgrade
to buy, no competence to reach.** Any future proposal to put streams
behind an in-world unlock is **wrong by construction**, however
diegetically tidy. *(Education is a welcome secondary benefit, never the
reason.)*

⚠ **A real constraint on the jukebox pattern**: **the jukebox is
diegetic, so friction is a FEATURE there. Streams are not, so friction is
a DEFECT.**

#### What survives from the lounge design — all of it

The distinction was already made there (*the lounge's screen may show real
player streams, out-of-fiction; a Terminus screen shows in-world channels
only*):

> **The room's screen is diegetic furniture. Your own feed is interface.**

The remote fight is about **the shared screen**, never about access to the
medium — so the whole remote/seizure design holds intact. In-fiction
dressing stays available as flavour where it is fun (*"cute, not
load-bearing"*); **it just can never become a gate.**

### ⭐⭐⭐⭐ Which gives the inn a real product

> **You sleep logged-in where it is safe.**

The innkeeper is not selling a heal rate — **they are selling that
nothing happens to you.** Which lands exactly on the lounge finding:

> **The lounge is safe by CONSTRUCTION. The inn is safe by CONTRACT.**

Contingent, purchasable, and **it can fail** — so a break-in at an inn is
a genuine story and an innkeeper's reputation is worth something
specific.

### ⭐ Sleep ADDS; wakefulness does not subtract

Per the buff doctrine: sleep accelerates healing and refills reserves
faster; **not sleeping does no damage** — you just recover slowly. A
mandatory sleep meter would make the bed **a leash instead of a service**,
and nothing else needs player fatigue (NPC schedules are employment
rosters).

⚠ **Counter-argument on the record**: without a fatigue need the night
has no *personal* pressure. Accepted — night pressure should come from
**light, concealment and fewer witnesses**, which is where it already was.

### Waking

Perception while asleep is **reduced, not zero** — a threshold the
perception system already expresses, and now **consistent rather than
hand-waved**: the brain *filters*, so **loud OR MEANINGFUL wakes you and a
careful thief does not.** Sleeping in the open becomes genuinely risky without being
unfair, and it gives stealth its **highest-stakes check.**

## Part 7e — Blood loss, transfusion, and consent (2026-08-02)

`bloodVolume` is a first-class `Quantity` in litres with per-species
baseline and survivable floor, drained by hemorrhage, and
**exsanguination is already a 120 s dying cause.** *Nothing restores it.*

### Three interventions on one axis

| | What | Timescale |
|---|---|---|
| **arrest** | tourniquet, pressure, dressing | immediate — stops the drain |
| **transfuse** | put volume back | immediate |
| **time** | the body regenerates it | **days** |

Blood regenerates slowly in reality, which at 12× **with offline
healing** is fine — it behaves like the **structure** axis (§ Part 4b):
**stabilised in minutes, weak for days.** The *functional-long-before-
healed* pattern showing up in a shipped vital sign, for free.

*(A fast-volume / slow-carriage split — fluids restore volume, red cells
restore oxygen carriage — is more accurate still. **Over-modelling for
v1**; noted as a refinement.)*

### ⭐⭐⭐⭐ Transfusion's ingredient is a PERSON

> **Transfusion is the only treatment whose ingredient is another
> person's body.**

Not a purchased item — someone **present, willing, and paying a real
cost** (the donor loses volume too). Properties nothing else in the kit
has: **a gift with a price**, it **requires consent**, and it leaves a
debt both parties remember.

#### ⭐⭐⭐ The blood bank is an unusual business

> **Its inventory is DONATED, not bought.**

A genuine **civic object** rather than a shop — a public good with a
**free-rider problem**, where the interesting question is *who gives, and
why.* A real collective-action problem sitting in a medical building.

### ⚠ Blood types: REVERSED 2026-08-02 — DO

An earlier pass here said **don't**, on two grounds. **Both were wrong, or
too quick.** *(User: "that's cool science and it's very accessible,
everyone knows about them… we would need some kind of blood economy and
people to give blood. that might be fun though for a social game like
this.")*

**Objection 1 — "it's a matching puzzle."** It assumed the player performs
the matching. They do not: typing is **a one-time fact about your
character that a physician reads for you.**

> **Your blood type is not a puzzle to solve. It is a FACT ABOUT YOU that
> becomes relevant to OTHER PEOPLE.** — the same shape as a scar being
> identity (§ Part 7c), which this slate already argued *for*.

#### ⭐⭐⭐⭐ The real payoff is a SUMMONS, not a match

> **"Is anyone here B-negative?"**

Mechanically **a broadcast to a room** — exactly the event shape this game
is built for. Typing does not create matching work; it creates
**occasions where a SPECIFIC STRANGER becomes necessary**, which almost
nothing else in the design does. It rides comms, it is urgent, and only
one kind of person can answer.

It also produces something rare: ⭐ **an UNEARNED distinction.** Everything
else about you is earned — competence, renown, standing. Your type is just
*true*, and it can make you the most important person in the room.
**Universal donors quietly become community assets.**

#### ⭐⭐⭐⭐⭐ Objection 2 — "it reads as blood purity" — INVERTS

The whole thing turns on whether type correlates with **species**. If it
does, it is blood purity. If it does not:

> **A dwarf and an elf can share blood. Two elves might not.**

Not a mitigation — **the strongest available REFUTATION**: a mechanic
demonstrating that the meaningful biological category cuts **across** the
social one. Exactly the note the anti-essentialist species layer wants,
and **true of real human blood types.**

> ⭐ **RULE: blood type is independent of species.** The hazard was real;
> the direction was backwards. **Orthogonality turns the same mechanic
> from the bad note into the good one.**

⚠ **Refined 2026-08-02 →** [species-slate](./species-slate.md). Independent
-of-species is the **default**, not an absolute: a single authored species
whose blood is incompatible with the common pool is **more FRAGILE, not
purer** — a minority medical burden whose answer is **its own donor
drive**. The governing rule is **difference that COSTS is character;
difference that RANKS is essentialism.**

### The blood economy

Donation costs: volume down, weak for a while, and **per the recovery
ratchet it must pay nothing.** So why donate? The same reason people do in
life — **someone asked**, it is a recorded deed, and the person it saves
knows your name.

> ⭐⭐⭐ **Blood donation is the cleanest possible TEST OF THE SOFT-SKILLS
> THESIS** — a costly act, no reward, a public record, a beneficiary who
> knows who you are. If the chronicle and reception-from-others make that
> feel worth doing, **those systems work**; if not, we have learned
> something important cheaply.

#### ⭐⭐ Shelf life makes it a LIVE problem

Blood keeps ~6 weeks, so a bank **cannot hoard** — it needs continuous
donation, forever.

> **Shelf life turns the free-rider problem from SOLVED into ONGOING.**

A stockpile is a puzzle you beat once; a perishable stock is a **standing
civic obligation** — and it reuses the spoilage machinery already decided
for meds (§ Part 7b).

#### ⭐⭐⭐ "Should you be allowed to SELL blood" is a real legislative question

With a real empirical answer: **paid donation historically produced worse
safety outcomes**, because payment gives donors a reason to conceal things
about themselves.

A superb legislature object — **a policy debate where the intuitive answer
(markets clear shortages) loses to evidence** — and **our own
record-keeping could surface that evidence in-world** rather than
asserting it. A locality that pays and one that does not become **a
natural experiment somebody can go read.**

⚠ **Guard: rarity must not become a TAX ON THE RARE.** An uncommon type
must not mean a donation treadmill — **the ask stays an EVENT, not a
subscription.** Carry into requirements as a real risk.

### ⭐⭐⭐ Where CONSENT finally lands

Transfusion forces it, but it generalises — **treatment is something done
TO a body.** Real medicine already has the elegant rule:

> **IMPLIED CONSENT IN AN EMERGENCY.** A dying body may be treated by
> anyone. A conscious body must agree.

**One predicate on `getConsciousness`**, medically correct, and it
resolves the awkward case (you cannot ask permission from someone bleeding
out) **without inventing anything.**

The dark half comes free: **a substance administered without consent is
harm** — the accountability ledger's existing business, a **producer-side
append at the administration site**, no chokepoint. **That IS the
poisoner's vocation, mechanically.**

> ⭐⭐ **The ledger showing who treated whom is simultaneously a
> malpractice trail and a credential** — same record; which one it is
> depends entirely on outcomes.

### ⭐⭐⭐ The sequencing insight

Exsanguination's window is **120 s**; real transfusion takes longer. So
transfusion is **not** the emergency intervention — `treat` already is,
and mortality is explicit that it leaves you **"rescued, not healed."**

> **The field medic stops you dying. The clinic makes you useful again.**

Two moments, two skill sets, **two businesses** — so the clinic is not a
slower version of the medic.

## Part 7f — The care economy (2026-08-02)

### ⭐⭐⭐ The pricing spine

*Time is the free heal; everything else buys time* — so treatment prices
against the hours it returns:

> **A treatment is worth the LABOUR IT RESTORES.**

Not a balance heuristic — **the human-capital approach to valuing health
interventions**, i.e. real health economics, and teachable. A splint that
returns you to work two days early is worth up to two days' wages.

> ⭐⭐ **The same injury is worth more to a MINER than to a SCRIBE.**

So clinics price by clientele, and **the clinic near the mine is a
different business from the clinic downtown** — location-driven
specialisation for free, and **slightly uncomfortable in exactly the way
real health economics is.**

### ⭐⭐⭐⭐ Which is what "time is free" was really for

Priced treatment + an empty purse still recovers. Slowly, but it recovers.

> **BECAUSE TIME IS FREE, MEDICINE CAN BE A MARKET WITHOUT BEING CRUEL.**

**Nobody dies of poverty; they heal at the unassisted rate.** A humane
floor built into the *physics* rather than bolted on as a rule — which
makes the interesting question **available** to the legislature instead of
unavoidable: *should care be subsidised, and by how much?*

**The pizza line at a serious scale** — a free floor, a paid accelerator,
and an argument about where the line sits.

### The apothecary is a HARDER business than a general store

The stock **rots**, so retail becomes inventory management:

> ⭐⭐ **You stock for the epidemic that might not come.**

**Speculative inventory with a spoilage clock** — a genuine skill, a real
way to go broke, and a natural bridge to the actuarial thinking in
[insurance-slate](./insurance-slate.md). It also justifies the vocation
being **skilled** rather than a shopkeeper with different goods.

### ⭐⭐⭐⭐ Controlled substances — the best legislative object medicine offers

The **therapeutic window** (§ Part 7b) does the work: **the same substance
is medicine at one dose and poison at another.** So scheduling is not a
moral question but a **line-drawing** question, on a real continuum with
**no natural boundary.**

> **Drug scheduling is the purest "where do you draw the line" law
> available.**

And because the pharmacology is modelled, the debate **cites evidence
rather than vibes**: a locality banning a painkiller gets **more suffering
and fewer poisonings**, both visible in the record. Two localities with
different rules = **a natural experiment somebody can go read** — the same
shape as the blood-selling question (§ Part 7e).

### ⭐⭐⭐ The pattern this exposes

Blood selling · drug scheduling · mandatory treatment · quarantine, later.

> **Medicine keeps generating legislative objects because it is where
> INDIVIDUAL LIBERTY and MEASURABLE HARM collide.**

**An entire legislative agenda out of one subsystem** — and a strong
argument for this build's value well beyond the medical vertical.

### ⭐⭐ Triage is a queue policy

The **attendant substrate** already does queue-plus-lease, so a clinic
queue is free. What is not free is the **ordering rule** — first-come,
most-urgent, or highest-paying.

> **The most morally loaded queue in the game, and its substrate already
> ships.**

A small governance object at business scale: the clinic's own policy,
visible, and something a locality could legislate about.

### Insurance — named, not scoped

> ⭐ **Because time is free, health insurance insures SPEED, not
> SURVIVAL.**

Dodges the ugliest parts of real health insurance while keeping the
interesting mechanics (reserve ratios, adverse selection, concentration
risk). **Belongs to [insurance-slate](./insurance-slate.md), not here.**

## Part 7g — Who gets a body: NPCs, animals, and the cost model (2026-08-02)

Derive-on-read already solved the **runtime** half — an unobserved body
costs **nothing**. The real costs are **storage**, **authoring** and
**alarms**, and one answer covers all three.

### ⭐⭐⭐⭐ One engine, variable resolution

> **Do not build a SIMPLE MODE. Build SIMPLE BODIES.**

**Fidelity is a property of the `BodyPlan`, not of the individual.** Every
creature runs identical code against whatever its plan declares: the biped
declares 13 parts, a rat's plan could declare four, the sessile backstop
declares essentially none. **A "lightweight NPC path" would be a second
code path and therefore a divergence** — the thing this codebase reliably
refuses.

### ⭐⭐ Where the line falls

> **ANATOMY EXISTS WHERE INTERVENTION IS POSSIBLE.**

The *iff something reads it* rule, one level up. **You do not set a rat's
leg. You do set a horse's.**

> ⭐⭐⭐ **The VET's existence is what justifies livestock anatomy.** If
> nobody can treat a cow, a cow does not need a liver.

| Tier | Plan | Why |
|---|---|---|
| **players + cast** | full | diagnosable, treatable, targetable |
| **staff NPCs** (the labor-market tier) | **full** | persistent, companionable, **must be woundable to be real** |
| **livestock / pets** | reduced | ⭐ **health is a PRODUCTION INPUT** — a sick cow yields less |
| **vermin / small fauna** | minimal | alive or dead |
| **the crowd** | **none** | derived, no identity, no body — already doctrine |

### ⭐⭐⭐ The cost model: SPECIES are cheap, BODY PLANS are expensive

The biped plan already serves **seven humanoid species**, and
`UNIVERSE_DEFAULT_VITAL_PROFILE` backstops any animate species without
one.

> **Adding a species is cheap. Adding a PLAN is the expensive thing.**

Good news for [species-slate](./species-slate.md): most of its eight axes
are **per-species fields, not per-plan** — `breathableMedia`,
`vitalProfile` bands, toxin tolerance, `sensoryPorts`, reserves, dying
windows. **The ectotherm, the staple intolerance, scent-recognition and
aether-only speech are all cheap.**

⚠ **The two expensive ones are the two starred for economics**:
**equipment incompatibility** and **extra slots** are **per-plan.** Know
that before either is promised.

### The alarm cost is bounded by DRAMA, not population

Per § Part 5 — rate is the derivative of how fast you are changing, and
**residency is the boundary.**

> **A thousand healthy NPCs cost zero alarms.**

Only the injured, medicated and dying register anything; an evicted body
registers nothing and re-derives on return. **The alarm set scales with
what is happening, never with how many exist.**

### ⭐⭐ Offline healing covers NPCs too — and that is what stops depopulation

The linkdead-freeze divergence (§ Part 4b) generalises: **nobody watching
means healing runs.** An injured NPC nobody attends **recovers** rather
than quietly dying, so **the world does not erode.**

⚠ **Except dying** — mortality deliberately opts the dying clock out of
the freeze, so **an NPC left bleeding in a ditch DOES die.** *You can kill
someone by walking away.*

**Keep it**: true to life, exactly what the accountability ledger records,
and softening it would add a second exception to a rule mortality was
careful to carve **once**. But **make the call deliberately rather than
inheriting it.**

### ⚠ Read the husbandry build first

Husbandry shipped (houseplant), **pets are phase 5**, ranching is
designed. **Organisms may already have a condition/health model** this
work should align with rather than duplicate — `OrganismMixin` and the
animacy gating are in [race.md](../../subsystems/race.md).

**Unverified — flagged, not asserted.** The physiology build's first act
on the animal side should be **reading what husbandry already built.**

## Part 7h — Tolerance, withdrawal, and interactions (2026-08-02)

### Tolerance is the BANDS MOVING

`toxinBurdens` + banded Conditions already ship, so tolerance needs no new
structure:

> **Tolerance is your bands shifting. The dose that works on you is higher
> than the dose that works on a naive body.**

**One number per substance per body**, reusing the band mechanism exactly.

### ⭐⭐⭐ Withdrawal is a condition whose cause is an ABSENCE

Every other condition is caused by something **present**. This one is not:
the body adapted toward the substance, the substance is gone, the
adaptation remains.

> **Tolerance is the body moving toward the drug. Withdrawal is the drug
> leaving without the body.**

Mechanically **the gap**: tolerance high, burden zero — **that gap is the
condition.** Novel shape, real pharmacology, **no new machinery** (a
condition whose trigger reads two existing numbers).

### ⭐⭐⭐⭐ Which closes the therapeutic window over time — as ARITHMETIC

As tolerance rises the therapeutic dose climbs toward the toxic band until
they meet:

> **The dose that works becomes the dose that kills.**

**How opioid tolerance actually kills people**, here **derived rather than
scripted.** No morality tale, no cautionary content, no authored tragedy —
**the numbers do it.** The strongest version of *chemistry, never
morality*: **the game never tells you it is bad, it just charges you
correctly.**

### ⭐ Tolerance is the natural balance on MASKING

Without it, painkillers are free function forever. With it **the mask
degrades on its own** — balancing the mask verb **from inside the
simulation** rather than with a cooldown or a cap.

### ⚠ The guard, borrowed verbatim from mortality

> **Unpleasant, never dangerous.**

Withdrawal is a burden that **clears**, exactly like `recovering` from the
passage — **never permanent, never requiring a cure you might not find.**
And the escape is the one the whole build runs on:

> **Time is always the way out.**

**Dependency is a COST, never a TRAP.** Consistent with the healing floor,
and it keeps honest pharmacology without a punishment mechanic.

### ⭐⭐⭐⭐ Interactions come FREE from the liver

Four real interaction types; **three need no authoring at all**:

| Type | Where it comes from |
|---|---|
| **competitive clearance** | ⭐ **FREE** — one liver does all the clearing, so two substances clearing at once each clear **slower** |
| **additive** | **FREE** — two substances mapping to the same Condition stack automatically |
| **antagonistic** | authored **per pair, only where it matters** — **an antidote is exactly this** |
| **synergistic** | ⚠ **authored, rare** — the dangerous one; *alcohol + sedative* is the classic |

The first is the big one: **competitive metabolism is the most common and
most dangerous real interaction** (why grapefruit juice matters, why
alcohol plus anything is a bad idea) — and it arrives **the moment the
liver exists.**

> ⭐⭐ **THE LIVER IS WHAT MAKES SUBSTANCES INTERACT.** One organ, and the
> pharmacopoeia stops being a list and becomes a system.

**The strongest argument yet for the roster entry** (§ Part 3): it is not
just clearance, it is **the coupling between everything you have taken.**

### ⭐⭐⭐ And it makes one clinical question load-bearing

> **"What else have you taken?"**

The most important question in real emergency medicine becomes
**mechanically necessary** — and it lands on three things already
designed: the patient **cannot fully self-assess** (§ Part 8d), they might
**not tell you**, and if someone else dosed them they **do not know** (§
Part 7e). **The physician's information problem, the consent thread, and
the poisoner all converge on one sentence.**

## Part 8 — Medicine vs magic

### ⚠ A rejected framing of mine, and why

I proposed *"magic buys you time; it does not buy you back"* as a rail to
protect the mortality arc. **Wrong, and cutting off content the build was
deliberately designed to host.**

`reembody` is content-facing with **no route type, no terms vocabulary, no
registry**, explicitly because *"being a ghost is an authoring space."*
The floor is `passage` (free, drains reserves, leaves `recovering`), and:

> **"The competitive axis is therefore *how little you are diminished*."**

**So an expensive revival spell is simply another caller of `reembody`
competing on diminishment**, exactly like a temple or a clinic. The market
already exists and already prices it.

> **User: "I wouldn't want to cut off any kind of content, the whole point
> of magic is it sorta lets you do anything you want in a game without
> having to justify it."**

### ⭐⭐⭐ The grid already draws the line, and better

Two cells, not one axis:

| Cell | What it is | Cost |
|---|---|---|
| **control·body** | **command the body's own processes** — accelerate, arrest, purge, wake | modest |
| **create·body** | **make tissue that is not there** — regrow, reattach, restore | expensive |

Which **preserves the time economy**: a `control·body` heal buys time by
making the body work faster — it does not invent health. `create·body` is
the genuinely expensive frontier, doing the one thing medicine
structurally cannot.

### ⭐⭐⭐ Everyone casts — so the trade is not populations

**(User: *"this isn't the kind of game where some people are magic users
and others are physical. all guilds/vocations intersect with magic, anyone
can be a caster, so a wake spell is just another tool in a medic's
kit."*)**

> **Medicine spends MONEY. Magic spends YOU.**

A live decision at every point of care, **self-balancing with no numbers**:
a medic who casts all day is exhausted; a medic who stocks up is broke. In
a crisis you spend yourself; in a clinic you spend inventory.

> ⭐⭐ **Medicine's scarcity is SUPPLY. Magic's is COMPETENCE.** You can
> ship a crate of dressings to a mining camp. You cannot ship competence
> there.

Which gives the frontier/city gradient for free — and since competence is
**trainable**, it lands on the University. **Teaching medicine and
teaching magic are the same curriculum problem**, and the Practicum
already exists as the demonstrator for one of them.

### The mechanism difference that generates everything else

> **A drug is an INPUT to the body. A spell is an OVERRIDE of it.**

Medicine enters the metabolism pipeline; magic writes the condition layer
directly. **Not flavour — consequences**, and a player can *derive* why
the potion takes ten minutes:

| | Medicine | Magic |
|---|---|---|
| **speed** | slow — *because digestion is* | immediate |
| **dose–response** | yes — *the dose makes the poison* | n/a |
| **interactions** | yes — one shared buffer | n/a |
| source | **a supply chain** | **a person** |
| fails by | **shortage** | **incompetence** |
| can be | stockpiled, traded, taxed, counterfeited, **regulated** | none of those |

> ⭐⭐⭐ **Medicine generates an ECONOMY. Magic generates a
> RELATIONSHIP.** Not competitors — different content, and a town wants
> both for different reasons.

⭐ And **magic does not scale, which IS its balance**: one healer cannot
treat a city; a factory can medicate one. Better per-instance, worse
per-population.

---

## Part 8b — The `control·body` roster (2026-08-02)

### ⭐⭐⭐ The constraint that writes it

Every medical spell must be one of the **five condition verbs** (§ Part
7), which gives the cleanest statement of the whole relationship:

> **MAGIC ADDS NO NEW MEDICAL VERBS. IT ADDS A SECOND PAYMENT METHOD.**

*Medicine spends money; magic spends you* — so the roster is **a mapping
exercise, not an invention exercise**, and it constrains future spell
design permanently.

| Cell | Spell | Verb | Notes |
|---|---|---|---|
| **control·body** | **wake** | restore | consciousness — the crisis tool, the medic's most-wanted |
| | **staunch** | arrest | commands vessels closed — counters the exsanguination window |
| | **knit** | accelerate | **structure**, not function — the days axis |
| | **numb** | **mask** | ⭐ the painkiller's tragic choice, **paid by the caster** |
| | **purge** | accelerate | clearance — the magical antidote; pairs with `vomit` |
| **create·body** | **regrow** | restore | missing tissue — **expensive; the thing medicine cannot do** |
| | **transfuse** | restore | ⭐ below |
| **perceive·body** | **diagnose** | — | ⚠ below |

### ⭐⭐⭐⭐ `transfuse` — the CASTER is the donor

A spell that *creates* blood would quietly destroy the donor economy of §
Part 7e. So it does not:

> **The spell does not create blood. It moves YOURS.**

**Magic spends you, and here it spends you literally.** Preserves the
donation economy instead of undermining it, keeps `create·body` honest,
and — best of all — **the caster needs a COMPATIBLE TYPE.** Typing gates
the spell exactly as it gates the needle.

### ⚠ `diagnose` must not replace the physician

The shipped rule is **competence buys information, not outcomes.** A spell
reading deeper than `assess` would make the information vocation
pointless.

> ⭐⭐ **The diagnostic spell's advantage is REACH, not RESOLUTION.**

Same tiers, same competence gate — it just works at distance, through a
wall, or without touching. And the last of those has a sting worth
keeping:

> ⭐⭐⭐ **A body read without consent is an INTRUSION, not a service.**

Lands on the consent work (§ Part 7e) and gives the accountability ledger
something to record that **is not physical harm.**

### ⭐⭐⭐ Suppression makes the wards MEDICAL

Magic is suppressible — the warded cell already ships as the Practicum's
lesson. So:

> **A warded room is a place where only MEDICINE works.**

A structural reason for both practices to exist, and it yields a piece of
worldbuilding for free:

> ⭐⭐⭐ **The operating theatre is WARDED for the same reason it is
> STERILE — you control what enters.**

Nobody wants uncontrolled magic near an open patient. It also makes the
surgeon and the caster **specialists in different ROOMS**, not competitors
for one job.

### The medic spectrum

Everyone casts and only **competence** varies, so the vertical **spreads
rather than splits**: the **field medic** carrying dressings because
faculty is precious mid-fight · the **clinic** mixing both · the
**specialist** whose whole practice is `regrow`. Differentiated by **what
they can afford and where they work** — the same axis that already
separates the field medic from the clinic (§ Part 7e).

## Part 8c — ⚠ Roster REVISED against the arcane science (2026-08-02)

**(User: cross-reference the parallel build-3 discussion "about making
magic actually science with real rules about how spells work… some of it
fiction but some of it is actual math, it might affect your spell
roster." It does.)**

Source: **`docs/arcane-science.md` on `feature/furnishing` (build-3
worktree), 946 lines, untracked at time of reading.** Governing content:

> **THE POSTULATE — a caster relocates ENERGY between their own body and
> one chosen point.** Local conservation fails; global holds. **The caster
> is always one endpoint.**

Plus: **the second law holds** and prices delivery by exergy · **transform
is unaffordable** (*"transformation of a living body… the energy is
prohibitive and the specification is worse"*) · **patterning (Mind, Sense)
is energetically free but SPECIFICATION-limited** — the field's admitted
gap · **Tarn's Rule** (the weaker of verb- and noun-competence governs) ·
**competence = delivery efficiency, η ≤ 1** — *the second law is the
anti-power-creep mechanism.*

**The net effect on § Part 8b: the roster gets SMALLER and better
motivated.**

### ⭐⭐⭐⭐ `transfuse` — CUT, and be glad

The postulate moves **energy, not matter.** Blood is matter. The spell is
not expensive — **it is not in the physics at all.**

> **Magic cannot move matter, so blood moves the mundane way — a needle
> and a person.**

**Far better than the "caster is the donor" workaround** (§ Part 8b): the
donor economy of § Part 7e is now protected **by the physics**, not by a
design decision. **Nobody can ever propose a blood-creating spell**,
because there is no mechanism for one.

### ⭐⭐⭐⭐⭐ `regrow` + `knit` are ONE spell, and the BODY does the specifying

Regrowth looks like the transform problem — building specified biological
structure. The escape: **the body already knows the pattern.** A living
body is self-specifying; it grows itself.

> **The healer does not build the hand. They PAY for it.**

Caster supplies energy, body supplies the blueprint — **dodging the
specification problem entirely** and making healing magic `control·body`
all the way down. **Medical `create·body` does not exist.**

**And the cost is calculable rather than asserted.** Tissue synthesis runs
tens of kJ/g, so a hand is order **10–20 MJ — a week of metabolism.**
Delivered at once that **cooks the patient.**

> ⭐ **Regrowth is THERMALLY limited, not reserve limited** — the same
> shape the doc derives for cold — **so it must be slow or it kills
> them.**

Not an instant limb: **funded convalescence over days**, at a rate the
patient can dump heat at. **Which is exactly the function-fast /
structure-slow split of § Part 4b, arrived at independently.** *Two
designs converging is the best evidence either is right.*

#### ⭐⭐⭐⭐ And the PATIENT supplies the materials

Energy is not matter, so tissue is built from **the patient's own
precursors.**

> **Magic pays the energy bill. The patient supplies the materials.**

**You cannot regrow a hand on an empty stomach.** Food becomes a genuine
**medical input** — the herbalist/farmer connection this slate had been
reaching for.

### ⭐⭐⭐ `wake` and `numb` are MIND / SENSE, not BODY

Both are **patterning**, not energy relocation — pain is signal,
consciousness is state. So they reclassify out of `control·body`, fall
under the **specification problem** (energetically free, limited by what
nobody yet knows how to fix), and are subject to **the Reeve Line**: a
willing patient is easier than a resisting one.

> **Fixing the body is ENERGY. Changing what you feel is INFORMATION.**

> ⭐⭐⭐⭐ **The medic and the interrogator train the same faculty** —
> `wake` and `dread` are both **Mind**. Uncomfortable, **derived rather
> than imposed**, and unarguable because it falls out of the taxonomy.

⚠ It also constrains `wake` usefully: **it cannot fix causes it does not
address.** You cannot pattern someone awake who is unconscious from blood
loss — **fix the blood.**

### The revised roster

| Spell | Cell | Cost basis |
|---|---|---|
| **staunch** | control·body | drives clotting the body already knows — cheap |
| **purge** | control·body | drives clearance — cheap; pairs with the liver multiplier (§ 7b) |
| **mend** *(knit + regrow, one spell scaled)* | control·body | **the metabolic bill; thermally capped; runs over DAYS** |
| **numb** | control·sense | patterning — free, specification-limited |
| **wake** | control·mind | patterning — **Reeve Line applies** |
| ~~**transfuse**~~ | — | **CUT — the postulate moves energy, not matter** |
| **diagnose** | perceive·body | ⚠ open — below |

### ⚠ One question for the owner of that doc

**How does `perceive` work under the postulate at all?** Energy relocation
explains *delivery*; it does not obviously explain *reading*.
`arcane-sight` ships as perceive·arcana, so there is presumably an answer
in the noun-carving section — **asking rather than inventing, since
inventing a second exemption is exactly what that doc warns against.**

Relatedly its own prediction supports § Part 8b's *reach-not-resolution*
rule from another direction: **"a veil changes no photons, so it should
not fool an instrument."** If patterning cannot fool a device then **a
diagnostic INSTRUMENT is more trustworthy than a diagnostic SPELL** —
landing on the trusted-recording thread and giving the physician's tools a
reason to exist alongside the faculty.

## Part 8d — The player surface, and what the patient knows (2026-08-02)

### ⭐⭐⭐ One extended verb, not five new ones

Most administration **already has verbs**: ingestion is `eat` / `drink`
with the shipped **measure grammar** (*you can already overdose by
pouring*, § Part 7b). The temptation is to mint `apply` / `inject` /
`dose` / `administer`. **Resist it.**

> **`treat <target> with <item>` — and the ITEM's route determines the
> mechanism.**

Poultice → topical; syrette → injection; draught → you drink it. **One
verb, and the OBJECT carries the knowledge** — the affordance doctrine
running its usual direction: *instruments confer*, so let the instrument
determine the shape of the act.

**Net new verbs: ONE.**

| Verb | Status |
|---|---|
| `assess [target]` | **shipped** — competence-graded |
| `treat <target> [<part>] with <item>` | **shipped, extended** |
| `draw <substance> from <target>` | **new** |

#### ⭐⭐ The site argument is what makes ANATOMY REAL

> **This is the first command where a player must name a body part.**

How the anatomy stops being backend detail and becomes something the
player knows exists. It appears **only when the route is local** — which
is exactly the systemic/local split of § Part 7b, so **the grammar teaches
the pharmacology without explaining it.**

#### `draw` earns standalone status

A diegetic act, the **donation** verb, and **consent-bearing** — the
natural home for the implied-consent predicate (§ Part 7e). It serves the
**poisoner** unchanged: drawing something out of someone is the same act
whoever is doing it.

### ⭐⭐⭐ What the patient knows: you are the worst-placed observer of your own body

> **You cannot see your own back, your own pupils, or past your own
> adrenaline.**

Mechanically: **`assess` on yourself returns a WORSE read than a competent
other's.** Medically true, socially generative (**it gives you a reason to
ask someone**), and quietly dramatic — you can be wrong about yourself in
front of people who are not.

⚠ **The guard that stops it being infuriating:**

> ⭐⭐ **Pain tells you WHAT is wrong. It does not tell you HOW BAD.**

You always know the **loud** things — bleeding, a bone that is wrong. What
you cannot self-assess is the **quiet** ones: **internal bleeding,
infection taking hold, how long you have.** Exactly the gap a physician
fills — and it means **the information vocation has a customer who is
already competent.**

### ⭐⭐⭐⭐ Masking blinds the patient AND the diagnosis

> **Masking suppresses the signal the medic reads.**

You took it to keep going; now **neither of you knows how hurt you are.**
The drug is double-edged in an **information** sense on top of the
physiological one, and the physician gets something real to beat — **a
masked patient is genuinely harder to read**, a skill check with a *cause*
rather than a difficulty number.

**This resolves § Part 7's open question** (*does masking suppress the
sign or the effect?*): **both** — because **a sign IS a signal.**

## Part 8e — Becoming a medic, and failing as one (2026-08-02)

### ⭐⭐⭐ One competence rule covers both shipped verbs

`assess` grades **information**; `treat` grades **outcomes** (*"the graded
outcome gates the rescue; a failed attempt spends the dressing without
holding them"*). Not two rules:

> **Competence buys INFORMATION when you LOOK, and OUTCOMES when you
> ACT.**

Extends cleanly to `draw`, site-targeted `treat`, and the spells — **so
nothing in the medical surface needs a bespoke competence policy.**

### The Discipline roster, kept small

| Discipline | Why separate |
|---|---|
| **medicine** | assess, treat, dress, dose — the general practice |
| **surgery** | invasive and manual: setting, cutting, amputation, fitting a prosthetic. **A great diagnostician can be a poor surgeon** |
| ~~pharmacy~~ | ⭐ **crafting, not care** — the apothecary *makes* things; ride an existing crafting Discipline, do not mint a medical one |

### ⭐⭐⭐⭐ The vet question has a better answer than a Discipline

Treating a quadruped genuinely differs from treating a biped (vets and
doctors are separate professions). A `veterinary` Discipline — or
per-body-plan competence — is **grind**.

> **SPECIALIZATION IS A LENS ON THE TRANSCRIPT, NOT A SEPARATE LADDER.**

Competence at quadrupeds derives from **the subset of your transcript that
involves quadrupeds.** No new Discipline, no new gating, and it is
**automatically true**: a physician who has only treated bipeds has a
transcript that says so.

**The codebase's own pattern — don't add a track, FILTER THE EVIDENCE** —
and it likely generalises well past medicine.

### Malpractice, and the trap

Logging failed treatment as harm is the obvious move. ⚠ It is the
**defensive-medicine** problem, and it is real:

> **If failure is punished, people stop treating hard cases.**

The real world's fix:

> ⭐⭐⭐ **LIABILITY ATTACHES TO THE PROCESS, NOT THE OUTCOME.** Not liable
> for a bad result — liable for **negligence**, for failing to do what a
> competent practitioner would.

Expressible, because accountability events are **producer-side appends at
the ACT site**:

> **The record already knows what you DID, not just what happened. That is
> what makes a standard of care possible.**

A medic who did the right things and lost the patient is **clean**; one
who did not, is not. **And the protection is exactly what lets people
try.**

#### ⭐⭐⭐⭐ Which unifies it with the consent rule

*Implied consent in an emergency* (§ Part 7e) says a dying body may be
treated by anyone. *Standard of care* says treating them imperfectly in
good faith is not a crime.

> **Both exist for ONE reason: TO MAKE SURE SOMEBODY TRIES.**

Good-Samaritan protection and implied consent are the **same doctrine
pointed at the same failure mode** — the bystander who does nothing
because the safe move is to walk away.

### ⭐⭐ Reputation is the primary enforcement; the court is the exception

**Most bad practitioners lose patients long before they lose licences.**
The record is public, renown is reception from others, and people simply
stop coming. **No court, no new machinery.** The judiciary thread stays
available for cases that escalate — **the exception, not the mechanism.**

### The next legislative object in the series

> **Does a locality require a LICENCE to practise?**

Same shape as blood-selling and drug scheduling: real tradeoffs (fewer
quacks, **fewer practitioners**), measurable in the record, and localities
become **a natural experiment.** **The fourth one medicine has produced** —
the § Part 7f pattern holds.

## Part 9 — The vocations this opens

| | Sells |
|---|---|
| **herbalist / grower** | inputs — ⭐ **the live farming build's first real customer** |
| **apothecary** | manufacture, grades, **shelf life** |
| **field medic** | arrest, under pressure |
| **surgeon** | restore — structural, not chemical |
| ⭐ **physician** | **information** |
| **poisoner** | the same skill, inverted |

### ⭐ The information vocation already ships

`assess` grades by competence — *"a novice sees that someone is going, a
competent medic names what is taking them, a proficient one says how long
there is to work with"* — with the rule stated outright:

> **"Competence buys information, not outcomes."**

**Not a proposal — live**, and the model any diagnostic tooling should
follow rather than reinvent. With hidden condition state and per-viewer
perception, *knowing what is wrong* is a real epistemic problem, which
makes the physician the **third information vocation** after the appraiser
and the auditor.

⭐ **Shelf life** (user-confirmed) is what makes the supply chain a
**chain** rather than a stockpile, and it is the apothecary's whole
business problem.

---

## Proposed waves

**Reordered 2026-08-02** — capacities before roster; and the roster is
*shape*-urgent, not *speed*-urgent (§ Part 3).

1. **The Condition catalogue goes live** — instantiate the Ideas at boot.
   Unblocks authored signs, names, progression and `toxinBehavior`
   everywhere; makes `assess` stop falling back to the path leaf.
   **Prerequisite for everything else.**
2. **The capacity vocabulary + `governsVital` → `governs`** — the
   namespace both stored signs and derived capacities live in. **The
   roster is undecidable before this.** Fold in the three read-through
   findings (mass sum, sensory-port anatomy edge, `missing` cascade).
3. **The roster** — `body.head.brain`, `body.torso.spine.{upper,lower}`,
   `body.torso.liver`; author `innervatedBy` only where it diverges from
   the tree. Two YAML files.
4. **The function axis** — per-part capacity derived from trauma ×
   tissue × perfusion × innervation; readers on `governs` /
   `innervatedBy` / `suppliedBy`; the graded consult replaces the binary
   `missing` one. **This is the wave that makes the anatomy stop being
   decorative.**
5. **The alarm clock** — `reconcileConditions` returns its next
   interesting time; `ScheduleApi.schedule` books the read. Rebuildable,
   never authoritative.
6. **Pain** — derived; the precondition for masking.
7. **Substances** — ⚠ **mostly written already** (§ Part 7b). The real
   work: **generalise the sign** (beneficial bands on the same burden
   machinery) · **the topical route** (local application against a part —
   needs the function axis first) · **inhalation** (new, probably last) ·
   **the liver multiplier** (trivial once function exists). **This pulls
   chems EARLIER and cheaper than first assumed.**
8. **Chems & meds as content** — the five verbs, blends-not-materials,
   Grade-as-potency, shelf life; the apothecary and the herbalist.
9. **Infection** — environmental risk (wound × instrument × place ×
   treatment), fever on the shipped vital sign, the treat-now deadline.
   **No contagion needed; ships before disease.**
10. **Permanence** — scars as belief/recognition features; prosthetics
    re-enabling slots through augmentation. **Under the recovery
    ratchet.**
11. **Sleep & beds** — the posture × consciousness 2×2; same heal rate
    logged in or out; the sleep-perception threshold. **The bed is the
    innkeeper's product.**
12. **Blood & consent** — transfusion (donor-sourced; **typed, with type
    independent of species**), slow regeneration, the perishable blood
    bank; **implied consent in emergency** as a `getConsciousness`
    predicate; non-consented doses appending to the accountability
    ledger.
13. **The care economy** — labour-restored pricing, the perishable
    apothecary, triage as a queue policy; **controlled substances as the
    legislative object.**
14. **Animals & NPC fidelity** — reduced body plans (not a reduced code
    path); align with whatever husbandry already ships.
15. **The player surface** — `treat <target> [<part>] with <item>` (the
    item's route picks the mechanism), `draw` as the consent-bearing
    verb, self-`assess` degraded vs a competent other's read.
16. **Disciplines & malpractice** — `medicine` + `surgery` (pharmacy
    rides crafting); **specialization as a transcript lens**; liability
    on process not outcome; licensure as a locality question.
17. **Tolerance, withdrawal & interactions** — bands shift; withdrawal
    as an absence-caused condition (*unpleasant, never dangerous*);
    **three of four interaction types free from the shared liver.**
18. **The spell roster** (revised vs the arcane science, § Part 8c) —
    `staunch` / `purge` / `mend` (`control·body`), `numb`
    (`control·sense`), `wake` (`control·mind`), `diagnose`
    (`perceive·body`). **`transfuse` cut — the postulate moves energy,
    not matter.** No new verbs: **a second payment method.**

## Open questions (for requirements)

1. ~~**Brain and spine — in or out?**~~ **RESOLVED 2026-08-02: in**, with
   two spine segments — see § Part 3 § The roster.
2. ~~**One clearance organ or a rate on the body?**~~ **RESOLVED: an
   organ**, named `liver`, so it can be damaged and so tolerance has an
   anatomical home.
3. ~~**Does the function axis produce a number, a band, or a predicate
   set?**~~ **RESOLVED 2026-08-02: two tiers, bands + predicates** — see
   § Part 2 § The specification.
4. ~~**Does masking suppress the SIGN or the EFFECT?**~~ **RESOLVED
   2026-08-02: BOTH** — *a sign IS a signal.* See § Part 8d.
5. **Is there a nonmagical restore for unconsciousness?** Decides whether
   a party can function without a caster. **(User: probably both.)**
6. **Where does the herbalist end and the apothecary begin** — is a raw
   herb ever effective? *Leans: raw works, badly* — the frontier stays
   survivable, the city stays better. **(User: come back to this.)**
7. **Does the immune/contagion seam open here or stay deferred?** The
   coupling half of the alarm work is its precondition either way.
