# Instrumentation — requirements

**Kind:** feature
**Leads from:** kernel — first consumers are the thirty-two reads that
already ship across six trades (mining, farming, haulage, medicine,
tailoring, water), every one of which is retrofitted by this build; and
the prospector's round trip, which is mining's field survey handed a
bench to answer to. It does not wait for content that does not exist.

The game models an enormous amount of state, and it is deliberately
honest about modelling it — anyone can author content, so everyone needs
to be able to find out how the world works. There is already a way to ask
an object what it knows: `eval`. It is gated twice, because it must be —
code trust decides *whether* you may run code, and parcel authority
decides *where*. That makes it private, bounded to land you hold, and
available only to people we trust with a TypeScript escape.

> **This build is the path to the same knowledge for everyone else — and
> it is the better path, because it happens in the world.**

A reading takes time. It needs a thing you had to buy or a skill you had
to earn. Someone can watch you take it. You can write it down, sell it,
or lie about it. `eval` can do none of that, and it cannot read a mine
you do not own. So the instrument is not a consolation prize for the
untrusted: it is the world's actual epistemics, of which `eval` is the
out-of-band cheat.

Being choosy about **what** is legible, **at what fidelity**, **when**,
and **who else knows you looked** is the entire design surface.

And fidelity has a **place** as well as a price. Some facts you can read
where you stand; some you must carry back to a bench that eats the
sample to answer. That round trip is not friction — it is the build's
sharpest lesson, because **deciding what is worth measuring is the
expertise**, and you cannot carry fifty rocks back to the bench. The
field read's job is choosing the three.

Seeds: [instrumentation-slate](../slates/builds/instrumentation-slate.md)
and [sampling-and-labs-slate](../slates/builds/sampling-and-labs-slate.md)
— the parent says *you are as good as your toolkit*; the companion says
*where the toolkit lives, what it costs, and what you carry to it*.

---

## What already exists

**The two verbs, and a doctrine nobody has been using as a ladder.**
`analyze` and `measure` both ship, and `command-routing.md` already
carries the line that separates them — *"`analyze` is what you can work
out. `measure` is what an instrument tells you."* Every avatar is granted
`analyze` on themselves; `measure` is afforded only by instruments. That
box was homed from this slate in 2026-09 and describes a mechanic that
was never built: today the free verb is not vaguer than the instrumented
one, it is **equally precise and costs nothing**.

**Thirty-two reads.** Fifteen `measure` channels and seventeen `analyze`
channels, spread across the platform and six trades. Twelve of the
seventeen `analyze` channels are entirely free — several say so in as
many words, one describing itself as a developer debug tool.

**Two incompatible gating mechanisms that never meet.** The platform's
nine instrumented reads check for a specific instrument by hand inside
the read itself, and **not one of them bands on competence**. The trades'
reads gate declaratively — the instrument is an argument, resolved by
what it is *capable of* — and nine of thirteen band on a Discipline.
So instrument-gating and competence-banding are disjoint today and
co-occur only outside the kernel.

**The readout ladder is built, four times.** `geology` bands the error
bar on a strike and dip reading; `soil-science` bands soil acidity;
`teamstering` bands whether a rig will fit; `medicine` bands a patient
read; `forensics` bands a postmortem. The haulage one was written *"to
the geology error-bar ladder exactly."* The pattern is proven and
copy-pasted; what is missing is that it is nobody's.

**Eleven instruments, every one portable.** Altimeter, balance,
barometer, gas analyzer, gravity meter, hydrometer, hygrometer,
photometer, thermometer, plus the sundial and sextant. The trades add a
surveying instrument (shipped as **one class and two rows** — a compass
and a miner's dial differing only in mass and keywords, on the stated
principle *"competence buys resolution; equipment buys access"*), a soil
kit, and a tailor's measure book. **No bench instrument exists at all.**

**The record rung half-exists and nobody has named it.** Two reads —
the ore-body plane and the soil aggregate — do not read the world. They
read *recorded samples*, and solve a fact no single reading contains.
That is already the survey-book pattern; it just has no name.

**Reading a person is shipped precedent.** `assess` bands a body on
`medicine` — a novice sees *bleeding badly*, an expert names the site and
severity. Combat's fog bands an opponent's poise and lets a dull reader be
**honestly wrong**, mistaking a feint for an opening. Neither shows a
number.

**No instrument carries a quality.** Nothing composes a craft grade;
nothing reads a tool's quality for precision. Where precision varies it
varies by competence alone, and the balance's own documentation defers
per-instrument calibration *"until content motivates it."*

**Nothing is bench-bound, and eight of the instruments never can be.**
Sort them by what they read: the thermometer, barometer, photometer,
hygrometer, altimeter, sextant, gravity meter and sundial read **the
environment where you stand** — you cannot carry the light level at the
mine face to a bench. Only the balance and the gas analyzer read **a
thing, or a captured medium**. So the field/bench split is not a cost
tier bolted on top; it is a **property of the fact being read**, and it
already partitions the shipped roster eight to two.

**A sample needs almost no new machinery.** Ore grade is already a real
composition fraction on the material, so a rock sample is a small
quantity of that material and a bench reads its actual composition — no
snapshot, no second source of truth. ⭐ The one genuinely new thing is
**provenance**: which seam it came from. *"17.3% magnetite"* means
nothing without *"from face three, gallery two."*

**There is no `assay` verb.** Mining's shipped "honest assay" is grade
carried truthfully through pooling and splitting, not an act anybody
performs. The name is free, and no shipped mining design needs renaming.

⭐⭐ **But the assayer's KIT is already in the world, and the survey
missed it.** *An assayer's kit — a folding balance in a fitted case, a
nest of brass weights, bone-ash cupels and a small furnace with a bellows
the size of a purse* — is a craftable object at the **top of the mining
tool ladder**, standing on the bench in the assay shed, and the mining
archetype lists an `assay` need that wants it. **Nothing can be done with
it.** So the carried rung of the grade route is not something this build
invents: it is something already built, already placed, already the
reward at the end of a crafting ladder, and unreachable by any verb —
which sharpens the framing rather than shrinking the build. What is
genuinely new is not the instrument. It is **the act**.

**Nothing is fixed in place by being a "fixture".** Non-carryable is an
authorable boolean a row declares; the fixture mixin is a different job
(self-seating). A bench needs the boolean, nothing more.

⚠ **And a venue is not "bound" by anything.** Fourteen archetypes ship,
but no binding field exists: an archetype is a document whose only reader
is `survey`, which reports a room as one when its fixtures satisfy the
declared needs. A place *is* what it can do. This build ships no
archetype (see Non-goals), so none of that machinery is touched.

**Three reads are broken, and one of them is the slate's own worked
example.**

- `measure light` never checks that the instrument in reach is a
  photometer. Carry a thermometer, read lux. The identical bug was found
  and fixed for soil texture; this one was not.
- `measure shadow`, and the sextant arm of `measure altitude`, gate on
  instruments that **have no template row anywhere**. No sundial or
  sextant can exist in the world. Verb ✓, affordance ✓, data ✗ — the
  silent reachability failure, sitting inside the slate's proof that
  instrument-gating already works.
- `measure texture` is instrument-gated but deliberately unbanded: it
  credits experience without letting competence buy anything.

**Therefore what is genuinely new here is** the ladder itself — that the
same fact is reachable by several routes at different costs, fidelities
and *places*; that skill alone is one of those routes; that a reading is
an act in the world which can be recorded, sold and lied about; and that
one field, provenance, turns a measurement into evidence. The verbs, the
banding pattern, the declarative instrument argument, the record, the
composition fraction and the venue archetype are all shipped somewhere;
none of them is anybody's, the free read is not yet honest, and nothing
in the world has ever had to be carried anywhere to be understood.

---

## Goals

- **Every fact the world holds is reachable without code trust**, by
  some route, at a fidelity the world decides.
- **The free read becomes honest rather than omniscient.** `analyze`
  stays free to attempt and answers vaguely for the unskilled; it never
  refuses for want of permission.
- **Skill alone is a route.** A trained eye reads coarsely with no tool
  at all — the expert without a meter beats the novice with one.
- **Competence resolves detail, never access** — and never a wrong
  number where the read is a preview of an outcome.
- **A better instrument raises the ceiling; competence is what you
  actually get.** Money buys the possibility of precision, never
  precision itself.
- **A channel declares what its subject must be able to do, never what
  kind of thing it is** — so a trade adds a reading without any platform
  content being edited, and a new species or a talking door needs no
  channel touched.
- **A reading is an act in the world**: it takes time where time
  matters, it is visible where visibility matters, and it can be written
  down.
- **A recorded reading carries who took it, with what, and how well they
  read** — so that a later institution has something to attest.
- **Every refusal names what is missing**, never fails silently.
- **The three broken reads work**, and no read gates on an instrument
  that cannot exist.
- **A fact that cannot be read where you stand can be carried to a place
  that can read it.** A sample is a real quantity of the real material,
  and it remembers where it came from.
- **A bench is a thing somebody owns and puts somewhere** — expensive,
  fixed in place, and buyable by anyone who can afford one. Nobody holds
  a monopoly on being able to read.
- **Assay services are worth paying for**, because the instrument is
  expensive, the trip costs time, and somebody else already has both.
- **The round trip is priced, never merely endured** — batched, timed,
  couriered or bought out of entirely.
- **A measurement can be defrauded** the way it really is: not by forging
  a record, but by submitting a sample you lie about.

---

## Non-goals

Every one names where it lands.

- **Sensor augments, the implant rung, and body sites for mounting** →
  [augmentation-slate](../slates/tails/augmentation-slate.md) (a wave).
  Only one augment ships and the biped admits only a cranial site; the
  anatomy must exist before an instrument can mount in it.
- ⭐⭐ **The laboratory as a kind of place** — the archetype, the campus
  labs, who may use one, lab staff →
  [advancement-slate](../slates/builds/advancement-slate.md), with
  [campus-grounds-slate](../slates/builds/campus-grounds-slate.md) for
  the four instances and
  [eternal-university](../slates/builds/eternal-university-slate.md) /
  [college](../slates/builds/college-slate.md) for enrolment and access.
  **The reason is that a lab is not a room with a bench in it** — it is a
  venue whose mechanical job is *deliberate practice*, which is
  advancement's unbuilt "deliberate context stacks" mechanism (the
  guild's venue, a mentor at your ZPD, sanctioned challenges). A build
  about reading instruments has no business defining it, and if it
  shipped the archetype now, advancement would inherit a venue concept
  defined by an assay bench. ⭐ **The seam:** this build credits a
  reading at the honest incidental baseline; advancement's deliberate-
  context multiplier later applies at a venue, and needs nothing here to
  change.
- **The calibration mirror** — showing a prospector how their predictions
  have tracked reality →
  [advancement-slate](../slates/builds/advancement-slate.md). It is a
  measurement of *how someone learns*, which is that slate's subject; it
  rides this build's record, which ships.
- **Certification as an institution** — who certifies, whether they may
  refuse, and what an attestation buys legally → needs a credential kind
  that does not exist and a governing seat;
  [credential.md](../subsystems/credential.md)'s deferred
  issuer-authorization ledger +
  [institutions-slate](../slates/builds/institutions-slate.md). ⭐ The
  *seam* ships here: a recorded reading carries its taker and their
  competence at the time.
- **Acoustic reads and the acoustic instrument roster** →
  [senses-slate](../slates/builds/senses-slate.md), which already owns
  them.
- **Writing what you learned into belief** (identifying a thing by
  reading it) →
  [identification-slate](../slates/builds/identification-slate.md).
- **Where findings land** — the casebook, the deduction surface →
  [deduction-slate](../slates/builds/deduction-slate.md), which named the
  postmortem read as substrate that *"lands nowhere."*
- **Medical instruments past the thermometer, and reading a patient at a
  distance** → [vitals-slate](../slates/tails/vitals-slate.md).
- **Persuasion and social manoeuvre.** We ship reading a person; the
  `read`/`persuade` social verbs stay with
  [advancement-slate](../slates/builds/advancement-slate.md). Perceiving
  what someone is feeling is instrumentation; working on them is not.
- **Employer-provided or revocable equipment, tool leasing, and any
  power to ban, compel or seize an instrument** → its own build. All four
  are greenfield: no lease clause, nothing on a position that carries a
  tool, and no prohibition or seizure concept anywhere in the world.
- **Derived physical capacity — a body's strength and dexterity as
  readings** →
  [capability-magic-slate](../slates/builds/capability-magic-slate.md)
  Part I. It is the named proof that this substrate generalizes, and it
  cannot ship here because per-part muscle mass does not exist yet.
- **A wheel you can watch turn at a working mill** — presentation, and
  it stays on the slate.

---

## Placement

**The mechanism is the kernel's**: the two verbs, the route ladder, how a
channel declares itself, how competence resolves detail, how a reading is
recorded. It is not any trade's, and every trade uses it.

**The raw-physics instruments and their channels stay in the platform
pack** — temperature, pressure, light, humidity, gravity, atmosphere.
These are facts about the world rather than about anybody's craft.

**A trade's instruments and channels ship in that trade's pack**, and
this is the load-bearing test: **a trade must be able to add a reading
with no platform content edited at all.** Today it cannot — every pack
channel is a stanza inside the two platform views, naming a controller
the pack ships, so in an install without that trade the reading is
advertised and dies on dispatch.

**Bench instruments belong to the trade that reads with them**, alongside
the samples they eat, and the first one goes where the demand already is
— the assay shed at a mine, a room that already exists, already has
daylight authored for exactly this reason, and whose description already
mentions the bench and the scale under their glass dome. The kernel owns only that a bench is fixed in
place, that a sample is carried to it, and that the act consumes both
time and the sample.

⚠ **This build ships no venue.** A bench is a thing in a room, not a
recognized kind of room — see the non-goal above.

⭐ **Does a second instance need code?** A new instrument reading
existing channels is a **row**. A new instrument reading a new channel is
a small class and a row, in its own pack. **A second bench — a rival
town's, a company's own — is a row somebody places.** None of it touches
the platform.

---

## Collisions

- **The two platform views are shared ground.** Every trade's reading is
  a stanza inside them, naming its own controller. Six trades are
  downstream of any change: mining, farming, haulage, medicine, tailoring,
  water.
- **Every avatar is granted the whole of `analyze` on themselves**, and
  fourteen classes grant the whole of `measure`. Carrying any one
  instrument currently unlocks the entire verb group.
- **The test tier leans on the free read.** Twenty-three test files and
  **seven wire drives** — crafting, consequence, metal-chain, metallurgy,
  farmstead, grain-chain, textiles — invoke these verbs. Making the free
  read vaguer changes what they see.
- **The survey book and the soil book are the existing record rung.** Do
  not mint a second way to write a reading down.
- **`assess` and combat's fog already read a person.** The person-facing
  channel must extend them, not compete with them.
- **The general store is where an instrument would be sold**, and it has
  a known hazard: a stock line answering to a bare name shadows another
  (buying an orange once bought a packet of orange seed). Any instrument
  offered for sale must be checked against the existing counter lines.
- **`measure texture` carries the fixed version of the `measure light`
  bug.** The correct pattern already exists in the world and should be
  copied rather than re-derived.
- **The tailor's measure book is a reading of a person that is free on
  purpose.** It is the precedent that not everything should band, and it
  should survive this build unbanded.
- **Mining's field survey is amended, never overturned.** Prospecting as
  deduction, the pre-reveal of sensed-but-unvisited ground, and
  competence conferring the survey acts all survive intact as the
  *qualitative* tier. The bench is added above them.
- **The campus already has four labs and an observatory promised to it**
  by another slate, and a fifth build wants the venue concept itself. We
  ship a bench and touch none of it.
- **Sample integrity rides shipped clocks.** Spoilage and thermal
  behaviour already exist and already govern how a perishable thing
  travels. A sample that degrades must use them, not a second clock.
- **The courier lever is freight's.** "Never walk it yourself" is demand
  pointed at a haulage market that already ships; this build creates the
  demand and must not grow its own delivery mechanism.
- **A lab is a workplace**, so it meets the shipped employment substrate
  — an assayer with a position, a wage and a queue — rather than being a
  bespoke NPC.

---

## Surface decisions

### D1 — This is the non-wizard read path, and it is the better one

`eval` is bounded by code trust *and* by land. The instrument reaches
places `eval` cannot, and unlike `eval` it is legible to other people —
which is what makes information a thing that can be earned, sold,
withheld, doubted and faked. The build is written from that premise
rather than from "gate the free stuff."

### D2 — `analyze` and `measure` are two rungs, not two verbs

**`analyze` is what you can work out**: free to attempt, always
available, answering at whatever fidelity your senses and skill support.
**`measure` is what an instrument tells you**: needs the object, gives
the number.

Sunny-sixteen is `analyze light`; the light meter is `measure light`.
Nobody is ever locked out of a fact by permission — the free read simply
stops being omniscient. Today a novice gets a full per-source light
breakdown for nothing; afterwards they get *"bright enough to read by"*,
a trained eye gets *"an hour of usable light, mostly off the west
window"*, and only the photometer gives lux.

**Rejected:** gating `analyze` behind capability. It contradicts the
shipped doctrine that interpretation is always yours, it would refuse
twelve reads that are free on purpose, and it makes the world harder to
author than to play.

### D3 — Channels are of three kinds, and only one gets the ladder

1. **World facts** — light, chemistry, weather, a patient, an ore body,
   a rig's load. The full ladder applies.
2. **Outcome previews** — anything reporting what *will* happen.
   Competence may buy a wider or narrower band and the band must always
   contain the truth. This is not a preference: *the preview is the
   outcome* is a Tier A integrity invariant, amendable by nobody.
3. **Engine meta** — the addressing namespace, engine provenance,
   debug state. **These are not world facts and leave `analyze`
   entirely.** An expert does not perceive a namespace more precisely.
   Banding them would be incoherent, and their presence is why "gate
   everything" felt wrong.

### D4 — A channel declares capability, never taxonomy

A reading says what its subject must be **able to do**. It never asks
which branch of the hierarchy the subject is on. The reads that gate
today already work this way; the ones that do not are checking the
*instrument*, which this build deletes anyway.

⭐ **The apparent exceptions dissolve.** *An agent can notice you reading
it* — the subject perceives. *Reading a person may be an act upon them* —
the subject can be wronged. *You read a location from inside it* — that
is the read's **scope** (yourself · where you are · a target), which is
already per-channel. Nothing anywhere asks "is this an agent"; agents
simply happen to be the only things with vitals and a sensorium. A new
species, or a door that talks, needs no channel edited.

### D5 — The trained eye is viable

Competence alone buys a coarse read with no tool. This is the rung the
engine cannot currently express: today competence only narrows the error
bar on a reading you were already permitted to take.

It has an economic consequence and it is wanted: mastery lets you stop
carrying things, so the smith sells fewer dials to experts — the same
trade the slate already makes for implants, arriving earlier and for
free.

### D6 — Routes buy different goods, which is what prevents a kingmaker

If every route bought precision and differed only in price, the ladder
collapses into a cost curve and the top of it rules. It does not,
because the rungs buy different things:

| route | costs | buys |
|---|---|---|
| the trained eye | years of competence; nothing at point of use | coarse access — instant, private, everywhere |
| a carried instrument | money, a hand, encumbrance, visibility | precision in the field |
| sample to a bench | travel, time, the sample, usually someone's premises | high precision |
| the record | the discipline of having read repeatedly | **aggregation** — a fact no single reading holds |
| an attestation | money, and trusting somebody | **admissibility** — your word counting to a third party |

Five goods, no total order. Two rules, checkable on paper before
anything is built:

- ⭐ **Anti-kingmaker** — no route may dominate another on *every* axis
  (cost, speed, precision, portability, privacy, admissibility). If one
  does, take something away from it.
- ⭐ **Anti-useless** — every route must be uniquely best on at least one
  axis for at least one real decision, or it is furniture and gets cut.

**Why precision is worth paying for**, and it is real metrology: an
instrument earns its price when *(what being wrong costs) × (how likely
you are to be wrong without it)* exceeds what it costs. The same
instrument is therefore worth buying for one job and not another — the
meter matters for the shot you cannot reshoot.

**Where a kingmaker could still arise** — a fact that is access-only,
high-stakes and has no social route — three things bound it, all already
true of this world: **substitutability** (somebody with the tool can be
paid, which is why the assayer is a vocation), **serialization** (one
reading does not make a plane; several take time and are visible), and
**leakage** (acting on private knowledge reveals it — you stake the
claim, the stake is public).

**Where uselessness comes from** — a fact the prose already carried. A
thermometer in a room described as bitterly cold buys nothing. So: **an
instrument exists where a decision needs a number the prose cannot
carry.** Cold is prose; −4 °C is a reading, and it exists because
something freezes at −4. Where no decision needs the number, ship the
prose and skip the instrument.

### D7 — Grade raises the ceiling; competence realizes it

A better instrument does not hand you a better reading. It raises the
best reading you *could* take; your skill decides what you actually get.
A masterful dial in a novice's hands still reads novice-wide; a poor dial
genuinely caps an expert.

**Why not a bonus:** if quality added precision outright, money would
buy precision and a rich novice would out-read a poor expert. Money may
buy goods; it may never buy what only practice earns. The ceiling model
also gives the tool trade its story — **you buy a better instrument when
your skill outgrows the one you have**, which is exactly when a craftsman
would and exactly when they can afford it.

### D8 — Nothing is permanently illegible

There is no never-list. Any state may be read given the right route, a
person's disposition included. What protects the social game is not
prohibition but the rest of this document: it reads in words, it can be
honestly wrong, it costs something, and the subject can tell you looked.

### D9 — The bypass is the engine's own surface, not a trust tier

Authors and tests must be able to read state, and the answer is **not** a
new permission check. Because the free read stays free — only vaguer —
almost nothing breaks: tests asserting that a read *happened* still pass,
and only those asserting exact values need to move to the engine's own
read surface, which is not a player act at all. Authors keep `eval` on
land they hold. **No new trust tier, and no new wizard check** — the
world must not be gated in a way that is honest only for players.

### D10 — A reading is an act in the world

It takes time where time matters, and it is perceptible where that
matters — taking a sample is something a bystander can see you do. This
is the difference from `eval` made mechanical, and it is where the
roleplay lives: the assayer knows which claim you sampled.

### D11 — The record ships; the institution does not

A reading can be written down, and what is written carries **who took
it, with what, when, and how well they read**. That makes aggregation
possible now and attestation possible later, without this build deciding
who is allowed to certify anything.

### D12 — Refusals name what is missing

*"You have no way to tell"* names the missing route. Never a silent
empty answer. The two dead reads in this document exist because a gate
failed closed and quietly.

### D13 — Where a fact can be read is a property of the fact

⭐⭐ The field/bench split is **not** a cost tier laid over the ladder. It
falls out of what is being read: you can carry a rock to a laboratory and
you cannot carry the light level at the mine face. Eight of the ten
shipped instruments read the environment where you stand, and **a bench
rung does not exist for them** — an environment reader locked in a lab
can only ever measure the lab.

So each channel's available routes are decided by its subject, honestly,
and the ladder is ragged on purpose. Light has a trained eye and a meter
and no bench. An ore body has all five rungs. A captured medium — a
sealed flask of mine air — is the interesting middle: the medium travels
even though the field never does.

**This is also the answer to a balance question.** Nobody has to decide
which facts are "lab facts"; physics decides, and the decision cannot
drift.

### D14 — Three tiers, and the middle one is the characterful purchase

**Naked eye** (free, competence-only) → **hand tool** (cheap, portable, a
lens or a streak plate or a hardness kit) → **bench** (expensive,
stationary, eats the sample).

The middle rung is the one the design would otherwise skip, and it earns
its place twice: qualitative field identification really does use tools,
and it gives a new player an early affordable purchase that makes them
*read* as a prospector long before a laboratory is conceivable.

### D15 — A sample is the real material, plus where it came from

Not a snapshot, not a record of a reading — a small quantity of the
actual material, which a bench reads for its actual composition. The
composition fraction is already shipped substrate, so there is no second
source of truth to drift.

⭐ **Provenance is the one new field, and it is load-bearing far past
bookkeeping**: it is what makes an assay evidence rather than trivia, and
it is what makes the fraud below possible.

### D16 — A reading is a channel; a procedure is a verb

A reading is instant, non-destructive and repeatable — point the thing,
get a number. **A procedure costs time, material or risk to produce
knowledge.** So the bench act is a verb of its own (`assay` is free — no
such verb ships), it takes game-time, and it consumes what it reads.

The shipped field survey keeps its own acts unchanged. Nothing in mining
is renamed.

### D17 — The record is truthful; people are not

The provenance stamp cannot be forged. **Salting is social fraud over an
honest record** — nothing compels you to submit the sample you claim to
be submitting, and swapping a rich stone's origin onto a worthless claim
is the oldest fraud in the trade.

This is the project's standing shape — records are honest, people lie —
and it is why certification will one day have a *reason* rather than
being an abstraction: the certified assayer exists because salting does.

### D18 — The means of measurement can be contested, because a bench is a thing

⚠ **This is required, not merely permitted.** If one institution held
every bench it would hold a veto over every access-only fact in the
economy, which the anti-kingmaker rule of D6 forbids outright. *Who owns
the means of measurement* is a political question and the honest answer
is that it can be contested.

⭐ **Contestability comes from the bench being an object, not from a
venue being a recognized kind.** Anyone who can afford a bench places
one; a second bench is a second row. That is why cutting the laboratory
venue (see Non-goals) costs this decision nothing — the archetype was
only ever the *survey* line that makes a room read as a laboratory, which
is legibility, not access.

The first bench is the assay shed at a mine, because that is where the
demand already is — and because an assay office existed at mines long
before anyone taught the subject. ⭐ The room needs no new prose: it
already describes a long bench under a north window with a scale at the
end of it. The bench is in the writing and not in the world, which is
the gap this build closes.

### D19 — A spoiled sample reads wrong, and the bench is what catches it

A rock does not degrade; a biological or chemical sample does. A sample
that travelled badly — unsealed, too long, too warm — **reads wrong
rather than reading nothing**, because that is what actually happens and
because it is the crueller, better lesson.

⭐ And it gives competence at the bench something to buy besides
precision: a good assayer notices the sample is spoiled. A poor one
reports the wrong number with a straight face.

### D20 — The calibration mirror is designed-for, and built elsewhere

*What* a prospector predicted against *what the bench found* is the
strongest argument for the field/bench split: it turns sample selection
from a character's stat into a **player's** skill. It is also, precisely,
a measurement of how somebody learns — so it belongs with advancement
(see Non-goals), not here.

⭐ **What ships here is everything it needs**: the field call is written
down as a note of its own, the bench result is written down as a record
naming its taker and band, and both are readable. The mirror is then
arithmetic over two things that already exist. Doctrine holds the line it
will be built on — **the feed hides the measurement; the mirror shows
you** — and it stays self-only when it lands.

### D21 — The round trip is a decision with a price, not a commute

A pure walk-there-walk-back loop is a chore. Four levers, each of which
adds world rather than removing it, and each riding something already
shipped:

**batch** (carry several, assay together) · **the assay takes game-time**
(drop off, go and do something else, collect) · **courier it** (demand
pointed at the haulage market) · **pay somebody who has the bench**
(which is the vocation).

⭐ Each rung of the capital ladder — field read, hand tool, someone
else's bench, rented kit, owned kit — **buys time**, which is precisely
what the round trip spends. That is a legible reason to accumulate
capital that is not a bigger number.

---

## Lens pass

**1 · Pedagogy.** The strongest lens here, and it is the reason the build
exists. Measurement *is* a discipline: what an instrument can resolve,
why error bars exist, why you calibrate, why a single reading does not
make a plane, and why being wrong costs differently in different jobs.
Disciplines exercised are the ones already banding today — `geology`,
`soil-science`, `medicine`, `forensics`, `teamstering`, `awareness` — and
the world stays derivable, because the instrument reports the same model
the world runs on. The trained-eye rung teaches the deepest thing in it:
**the expert's estimate beats the novice's instrument**, which is true
and which no stat system can express.

⭐⭐ And the round trip is the scientific method itself rather than a
metaphor for it: **the field read forms a hypothesis, the assay tests it,
the result revises your model of the deposit.** Qualitative field
identification versus quantitative laboratory analysis is a real
epistemological divide that geology, chemistry and biology students all
actually learn. Sampling is itself a skill — where, how many,
representative or biased — which is experimental design smuggled into
mining and badly under-taught everywhere. And one field carries a lesson
few games ever land: **a measurement without provenance is worthless.**

**2 · Expression.** A trade adds a reading with no platform content
edited — that is the test this build must pass and today fails. A channel
declaring capability rather than taxonomy means an author's strange new
subject inherits every reading that fits it, with nothing to register.
The one-class-two-rows surveying instrument is the shape to spread: a
compass and a miner's dial are a data difference, not a code one.

**3 · Immersion.** Readings are how the world becomes legible without a
character sheet, and the no-gauge rule is what keeps it that way — the
reading speaks in the register the world speaks in, and the companion
listing says what you can find out and how surely, never a table of error
bars. ⚠ The gap to watch: a listing verb is the closest this build comes
to a stat sheet, and it must read like the spell list (*within you* /
*beyond you yet*) rather than like a specification.

**4 · Values.** The choice forced is real and recurring: **is this worth
knowing precisely?** Buying the dial, walking the sample back, or backing
your own eye is a judgment about what being wrong will cost — and it is
the first choice in the game that money and skill both address, in
different currencies. ⭐ The round trip sharpens it into the sentence the
whole build turns on: *you cannot carry fifty rocks to campus, so
deciding which three are worth the trip **is** the expertise.* Standing
is conferred by being **right** and being known to be: the reading you
recorded is checkable, so a reputation for accuracy is earnable and
losable — and salting is the way it is lost. The calibration mirror is
the honest, self-only version of the same measurement, which is exactly
the shape doctrine reserves for a mirror.

**5 · Epochs.** Clean. A shadow and a stick, a sextant, a barometer, a
gas analyzer, an implanted sensor — one mechanism, five epochs, only the
dynamics change. The trained eye exists in every one of them, which is a
good sign the model sits at the level of the physics rather than the
technology.

**6 · Economy & governance.** **Produces** information — tradeable,
perishable and defraudable, a genuinely new good class for this economy —
and ⭐ **a vocation**: lab-bound expensive instruments plus samples that
must travel is unmet demand for assay services, which is the stated test
for whether a vocation is real. It also produces demand for the haulage
market (courier the samples) without inventing a delivery mechanism of
its own. **Consumes** money, time, hands, the sample itself, and the
years behind a Discipline. **Who pays:** whoever needs to be right, in
money (the instrument), in time (the walk to the bench), or in skill (the
years) — and the capital ladder is legible precisely because every rung
buys back time. **Was the demand there first?** Yes, and measurably: an
ore body's grade, a soil's acidity and a patient's state are already
decisions people make badly, and the prospector who cannot tell a rich
seam from a poor one is already losing money.

⚠ **When it judges a person** — the person-facing read decides something
about somebody. The criterion is their observable condition and the
reader's competence, both nameable; the refusal must say which is
missing; and ⭐ the subject can tell they were read.

⚠⚠ **And there is a second judgment, easy to miss: the bench decides
whose claim is worth anything.** If one institution held every
laboratory, it would hold a veto over every access-only fact in the
economy — a criterion nobody voted for, exercised by whoever owns the
campus. D18 is that appeal: **a lab can be built by somebody else.** What
this build does **not** do is let a reading confer standing; a reading is
evidence, and who is allowed to *attest* is deliberately left to the
institution that will own it.

---

## The drive

Run against the live game before the MR opens. Rooms named here are
anchors to confirm at build time; the *shape* of each step is the
requirement.

**A. The free read is honest, not omniscient**

1. As a fresh character in a lit room, `analyze light`. Expect a vague,
   qualitative answer in words — *bright enough to read by* — and **no
   per-source breakdown and no number**.
2. `measure light` carrying nothing. Expect a refusal that **names what
   is missing**: you have nothing that could read that.
3. Acquire a photometer, `measure light`. Expect a number with a band.

**B. The trained eye**

4. As a character competent in the relevant Discipline, `analyze light`
   in the same room. Expect a **better answer than step 1 with no tool** —
   a usable estimate, hedged.
5. Compare: the trained eye's estimate should be **coarser than the
   photometer's** and better than the novice's. All three must be
   consistent with one another; none may be wrong.

**C. Competence resolves detail, never access**

6. As a novice holding the photometer, `measure light`. Expect the
   reading to **succeed** and be **wider** than the expert's — never
   refused, never wrong.
7. Repeat with a better-quality instrument in the same novice hands.
   Expect **no improvement** — the ceiling rose, the reader did not.
8. Put the poor instrument in the expert's hands. Expect their reading to
   be **capped** by it.

**D. The three broken reads**

9. `measure light` while carrying **only a thermometer**. Expect a
   refusal. (Today it answers.)
10. Find and hold a sundial; `measure shadow`. Expect a reading. (Today
    no sundial can exist.)
11. `measure texture` on soil as a novice, then as a competent farmer.
    Expect the two readings to **differ in confidence**. (Today they are
    identical.)

**E. A channel declares capability, not kind**

12. Run a world-fact read against a subject nobody anticipated for it —
    something unusual that nonetheless has the property the read needs.
    Expect it to **work**.
13. Run the same read against something lacking that property. Expect a
    refusal that names the missing property, not a crash and not silence.

**F. The ladder is ragged, and honestly so**

14. Ask what routes exist for a **place-bound** fact — the light level,
    the temperature where you stand. Expect **no bench rung offered**,
    and if you ask to take a sample of it, a refusal that says why: you
    cannot carry this anywhere.
15. Ask the same of an ore face. Expect the full ladder — eye, hand tool,
    and a sample you may carry.

**G. The field read is for choosing what to sample**

16. At a mine face, take the free field read. Expect a qualitative,
    hedged judgment — *ore-bearing*, not a number.
17. Take the same read with a hand tool (a lens or a streak plate).
    Expect a better qualitative answer, still not a number.
18. Collect samples from three faces. Confirm you **cannot** carry an
    unreasonable number of them — the judgment must be forced.

**H. The bench, and the round trip priced**

19. `assay` a sample **in the field**, with no bench. Expect a refusal
    naming what is missing: not here, and where a bench is.
20. Carry the samples to a bench and `assay` one. Expect it to
    **take game-time**, to **consume the sample**, and to yield an actual
    number.
21. Walk away during the assay and come back. Expect to collect a result
    you did not stand and watch.
22. Assay several at once. Expect the trip to be **amortized** — the
    batch costs less than the sum of the parts.
23. Instead of assaying it yourself, **pay the assayer**. Expect a price,
    a queue, and a result you did not need the instrument for.

**I. The record, provenance and aggregation**

24. Inspect a sample. Expect it to say **where it came from**.
25. Read the assay result. Expect it to name **who assayed it, with what,
    and how well they read**.
26. Present too few results and ask for the deposit's shape. Expect an
    honest *not enough yet*, naming how many more.
27. Present enough; ask again. Expect the aggregate fact no single assay
    contains.

**J. Salting**

28. Take a rich sample from one claim and submit it as having come from
    a worthless one. Expect **the world to let you**, and the assay to
    honestly report the rich stone.
29. Confirm the provenance stamp itself **could not be edited** — the
    fraud is in what you handed over, never in a forged record.

**K. The spoiled sample**

30. Take a perishable sample, carry it badly — unsealed, slowly, warm —
    and assay it. Expect a **wrong** number, not a refusal.
31. Have a competent assayer handle the same spoiled sample. Expect them
    to **notice**, and say so.

**L. Reading a person**

32. `analyze` another character. Expect a banded, wordy read of their
    observable condition — **no numbers, no traits asserted**.
33. Confirm the subject can **tell they were read**.
34. As a novice, repeat. Expect a vaguer read, and confirm it may be
    **honestly wrong** in the way combat's fog already is.

**M. A trade adds a reading with no platform edit**

35. In an install **without** a given trade installed, confirm that
    trade's channel is **not advertised** and does not appear.
36. Install it; confirm the channel appears and works, and that **no
    platform content file changed** to make that true.

**N. A second bench needs no code**

37. Place a second bench somewhere owned by somebody else, as content
    only. Expect it to work identically, and expect **no pack code** to
    have been written for it.

**O. Engine meta has left, and discoverability**

38. Confirm the namespace and debug reads are **no longer `analyze`
    channels**, and that an ordinary player is neither offered them nor
    refused them confusingly.
39. Run the companion listing. Expect what you can find out and **how
    surely**, in words — *within you* / *beyond you yet* — and **no table
    of error bars**.


## Acceptance criteria

Observable from outside the code, by a person playing.

1. A new player can find out things about the world with **no tool and
   no trust**, and the answers are vague in a way that reads as honest
   rather than broken.
2. The same player, having learned a Discipline, gets **noticeably
   better answers with no tool**.
3. Buying an instrument visibly improves a reading, and a **better**
   instrument visibly improves it further **only for someone skilled
   enough to use it**.
4. No reading in the game refuses a player for lack of permission. Every
   refusal names a **missing route** — a sense, a skill, or a thing.
5. A player carrying the wrong instrument cannot take a reading it does
   not support.
6. Every instrument gated by a reading **exists in the world** and can be
   obtained.
7. A player can **write a reading down**, and another player can see who
   took it and how good they were.
8. A player can be **paid** to take a reading somebody else cannot.
9. A bystander can tell that a reading was taken.
10. Reading another character tells you about their **condition**, in
    words, and they know you looked.
11. Installing or removing a trade adds or removes its readings, with no
    reading ever advertised that then fails.
12. For every reading in the game, a player can say **what decision it
    improves and what being wrong would have cost** — and any reading
    where that cannot be answered has been cut or left deliberately free.
13. A player can take a **sample** of something, carry it somewhere else,
    and have that place tell them what it is — and the sample says where
    it came from.
14. A player who tries to sample something that cannot be carried is
    **told why**, in terms of the thing rather than the rules.
15. The assay **takes time the player can spend elsewhere**, and costs
    the sample. A player who wants the answer sooner has at least three
    ways to buy it: carry more at once, pay a courier, or pay somebody
    who already owns the bench.
16. A player with no instrument, no laboratory and no money can still
    make a living prospecting — **worse, but not blocked** — by being
    good at choosing what to sample.
17. A player can **make a fraudulent claim about where a sample came
    from**, and the record will not contradict them.
18. A perishable sample carried badly produces a **wrong** answer, and a
    competent assayer says the sample was no good.
19. A second bench, owned by somebody who is not the first owner, works
    exactly as well as the first — and placing one took no code.
20. A player's own field call and the bench's answer are **both written
    down and both readable**, so that comparing them later is arithmetic
    over things that already exist.

---

## Appendix — the thirty-two reads, as they stand

The step-1 inventory. Each row is retrofitted, moved out of `analyze`, or
deliberately left free, and each gains a **decision it improves** and a
**cost of being wrong**.

**`measure` — 15.** light · temperature · pressure · humidity · density ·
gravity · atmosphere · altitude · shadow · strike · texture · acidity ·
passage · figure · dip.

Gated by a hand-written instrument check and **unbanded**: light
(broken), temperature, pressure, humidity, density, gravity, atmosphere,
altitude, shadow (unreachable). Gated declaratively **and** banded:
strike and dip (`geology`), acidity (`soil-science`). Gated and
**deliberately unbanded**: texture (credits experience only), figure
(free on purpose — the tailor's loss-leader, and the precedent that not
everything bands). Banded with **no instrument at all**: passage
(`teamstering`).

**`analyze` — 17.** response · weapon · electrical · light · patient ·
postmortem · chemistry · load · atmosphere · time · sky · address ·
power · water · weather · soil · ground.

Banded already: patient (`medicine`), postmortem (`forensics`), soil
(`soil-science`), ground (`geology`), load (`teamstering`). Outcome
previews, bound by the Tier A invariant: response, and weapon in part.
Engine meta, leaving `analyze`: address, atmosphere. Free world facts to
be given the ladder: light, electrical, chemistry, time, sky, power,
water, weather.

**Record-backed rather than world-facing:** soil and ground both read
recorded samples. They are the existing record rung and the model for it.

**Samplable or not — the split that decides which reads get a bench.**
Place-bound, and therefore no bench rung ever: light, temperature,
pressure, humidity, gravity, altitude, shadow, sky, weather. Thing-bound
or medium-bound, and therefore carryable: chemistry, density, atmosphere
(a sealed flask travels even though the air does not), ore grade, soil,
and anything read off a made object. The patient is the honest third
case — carryable in principle, but the carrying is a different problem
and belongs to medicine.

---

## Cross-references

- **Seeding slates:**
  [instrumentation-slate](../slates/builds/instrumentation-slate.md) (the
  parent — the three gates, the aether line, siting by anatomy) and
  [sampling-and-labs-slate](../slates/builds/sampling-and-labs-slate.md)
  (the field/bench split, the sample, the round trip, salting). Both are
  absorbed by this build except where the non-goals say otherwise.
- **Amended, not overturned:**
  [mining-slate](../slates/builds/mining-slate.md) and
  [mining.md](../subsystems/mining.md) — the field survey becomes the
  qualitative tier and keeps every act it has.
- ⭐ **Where the laboratory went:**
  [advancement-slate](../slates/builds/advancement-slate.md) § *Declared
  focus* — the venue's mechanical job is deliberate practice, and the
  calibration mirror is a measurement of how somebody learns. This build
  leaves both a bench and two readable records for it to stand on.
- **Companions named as non-goals:**
  [augmentation](../slates/tails/augmentation-slate.md) ·
  [senses](../slates/builds/senses-slate.md) ·
  [identification](../slates/builds/identification-slate.md) ·
  [deduction](../slates/builds/deduction-slate.md) ·
  [capability-magic](../slates/builds/capability-magic-slate.md) ·
  [campus-grounds](../slates/builds/campus-grounds-slate.md) ·
  [eternal-university](../slates/builds/eternal-university-slate.md) ·
  [college](../slates/builds/college-slate.md)
- **Demand this build points at:**
  [freight-slate](../slates/builds/freight-slate.md) (couriered samples) ·
  [vocations.md](../vocations.md) (the assayer, against the demand test)
- **Subsystem docs this build must respect:**
  [command-routing.md](../subsystems/command-routing.md) (the affordance
  doctrine, and the warning against a provisioning-kind vocabulary) ·
  [augmentation.md](../subsystems/augmentation.md) (the three-base model
  and the base-assignment rule) ·
  [perception.md](../subsystems/perception.md) (one definition of reach;
  the viewer-aware query shape) ·
  [senses.md](../subsystems/senses.md) (the closed sense vocabulary — an
  instrument's reading-name must not collide with it) ·
  [advancement.md](../subsystems/advancement.md) ·
  [measurement.md](../measurement.md) (the no-gauge rules; the
  Tier A preview invariant; the mirror property D20 rests on) ·
  [crafting.md](../subsystems/crafting.md) (quality as one axis) ·
  [spoilage.md](../subsystems/spoilage.md) (the clocks a perishable
  sample must ride rather than duplicate) ·
  [employment.md](../subsystems/employment.md) (the assayer is a
  position at a workplace, not a bespoke NPC)
- **Doctrine:** [design-lenses.md](../design-lenses.md) ·
  [uncertainty.md](../uncertainty.md) (seeded not drawn; the abstraction
  law) · [antipatterns.md](../antipatterns.md)
