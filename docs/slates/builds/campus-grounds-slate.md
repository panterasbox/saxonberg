# Campus grounds slate — the labs, the archive, the field sites, and enrollment as the door

**Captured 2026-09-01.** What goes on the Eternal University grounds —
labs, an archive, teaching field sites, and the combat facilities — who
may use them, and why one access decision turns a thin government into a
working institution.

⭐ **The grounds resolve into three layers**, and the layering is the
design: **the labs measure · the archive remembers · the field sites are
where you get something worth measuring.**

⭐⭐ **The teaching rooms are not a fourth layer — they are what routes
you through the three.** Magic 101's chapters map onto them exactly
(theory in the hall, Ch 6 in the lab, Ch 7 in the archive), which is
Part 8's finding and the strongest corroboration this design has. The
combat facilities sit alongside as the practicum for a different set of
disciplines.

> **Status: design conversation, captured. Not requirements.**

**Provenance:**

> **User: "what labs do we need to put on campus? … there's different
> kinds of labs for different studies no?"**
> **and, on who gets in: "enrollment."**

**Sits on / amends:**
[eternal-university-slate](./eternal-university-slate.md) (the campus —
topology, the Quad, services, Duncan Hall; **this adds the academic
buildings it left out**), [college-slate](./college-slate.md) (the
academic apparatus — courses, assessment, enrollment-as-contract; ⚠
**see Part 4, a real conflict**),
[sampling-and-labs-slate](./sampling-and-labs-slate.md) (the field/bench
split that makes labs matter — **this closes two of its open
questions**), [instrumentation-slate](./instrumentation-slate.md),
[magic-101-course.md](../../magic-101-course.md) (**752 lines of
authored curriculum — Part 8; it independently corroborates Parts 1 and
6**), [civics.md](../../subsystems/civics.md) (the university's own
government), [contract.md](../../subsystems/contract.md) (the substrate
enrollment rides), [advancement.md](../../subsystems/advancement.md).

---

## Part 0 — How the roster gets picked (not from a department chart)

Two shipped lists, and they **barely overlap**:

- **23 platform Disciplines** (+10 arcana) are **vocational** —
  agriculture, bartending, smithing, medicine, cooking, horticulture,
  appraisal, mixology. The study.com taxonomy: what you *do*.
- **18 analyze/measure channels** are **physical** — chemistry,
  electrical, response, atmosphere, weather, light, shadow, sky, time,
  altitude, density, gravity, pressure, humidity, address. What you can
  *measure*.

⭐ **A lab lives at the intersection: measuring something in service of a
trade.** So the roster comes from *which channel serves which shipped
chain* — never from a real-university department list, which would be
authoring tech ahead of demand.

---

## Part 1 — The roster, tiered by whether a consumer exists

### Build (a live chain needs it)

| lab | channels | serves |
|---|---|---|
| **Assay / materials** | chemistry (composition), density, response | mining · smelting · smithing · appraisal. ⭐ [sampling-and-labs](./sampling-and-labs-slate.md)'s round-trip loop **requires** this one |
| **Fermentation bench** | density (**specific gravity**), chemistry, thermal | distilling · brewing · winemaking · mixology — **libations is shipped**. The hydrometer is the real instrument; specific gravity is literally how fermentation is measured |
| **Agronomy / soil** | chemistry, humidity, growth | agriculture · horticulture · smallholding — **farming Stage A shipped** |
| **Medical / pharma** | chemistry, vitals, metabolism | the medic vertical, [pharma-slate](./pharma-slate.md) — designed, unbuilt |

### Build, on a different justification

| **Observatory** | sky, time, altitude (**sextant + sundial already ship**) | ⚠ there is **no navigation or astronomy trade** — so this would be tech-ahead-of-demand *except* that it has a shipped consumer: **civic timekeeping** (`WorldClockApi` + `CelestialApi` + the calendar + the Timekeeping display seam). An observatory that establishes official time is a real and ancient government function, and it gives the University a **civic** role rather than only an academic one. Freight navigation is a later second consumer. |

### Bind, do not author

| **The Practicum** | — | ⚠⚠ **already exists** ([magic.md](../../subsystems/magic.md)); the college slate already names it as the Laboratory (five runnable experiments + a calorimeter). **Wire it in; do not re-author it.** |

### Do not build

Optics/photometry bench, geodesy/gravity. Instruments exist; **no trade
does**. Authoring these is the thing the trades doctrine forbids.

---

## Part 2 — ⭐ The university owns them, and that is a content decision

An earlier framing put lab archetypes in **trade packs**
(`/trade/hospitality/location/bar` precedent). **That was wrong here.**

The `bar` archetype ships with hospitality because libations shipped a
*trade pack with capability* — verbs and classes — and the archetype
travelled with it. **The labs ship no trade. They ship a place that
teaches**, and the University is a coherent unit of content: one
locality, one owner, one zone, one staff, one access policy. Splitting
that across four trade packs is worse content design even where it
scores better against the placement rule.

> ⭐ **And the future case is already covered by doctrine: code is
> shared, CONTENT IS COPIED.** If a mining company ever builds its own
> assay office, it *copies* the lab content. No archetype extraction is
> needed — possibly ever.

**Structurally** a lab is still a `FurnishableRoom` row with a
`populates:` of its bench instruments — the shipped trade-bundle pattern
(`bar` / `cellar` / `warehouse`). **Zero new classes.** They just live in
the `eternal-university` pack.

---

## Part 3 — ⭐⭐ Access by enrollment: the decision that does the work

The campus already declares a government that **holds its own charter** —
*"governing its campus by academic privilege the realm's charter
recognizes rather than grants"* — with the jurisdiction chain
`[university, city, realm]`. And the Government row says outright it is
thin in v1: *"a Chancellor seat and college structure are later
content."*

So this build is **the first real exercise of a government that today is
identity + jurisdiction only.** The labs give it something to govern.

**Access is by enrollment, not by payment.** Consequences:

| who | access |
|---|---|
| enrolled student | included — this **is** the practicum |
| faculty | free, plus authority to **certify** (the instrumentation slate's third gate) |
| outsider | ⛔ not for sale — see the ecosystem below |
| expelled | revoked |

### ⭐⭐ Retention by obligation is what makes it a school

**Enrollment grants access; failing your obligations revokes it.** The
university has standing to expel, and that is the enforcement.

Which means the miner who enrolled *purely to get his ore assayed* must
actually do the coursework to keep the bench — **and in doing so, learns
geology.** Self-interest converts into education with nobody being
lectured. That is the practicum thesis as a mechanism rather than a
mission statement, and it is the strongest thing in this design.

It also kills the obvious exploit: *enroll once, mine forever.* A student
who never studies stops being a student.

### ⭐⭐⭐ The ecosystem: the University monopolizes TRAINING, not MEASUREMENT

| path | cost |
|---|---|
| **enrolled** | free bench, but you owe time |
| **graduated + own kit** (the sampling slate's capital ladder) | you are now an **independent assayer**, selling to anyone who will not enroll |
| **won't enroll** | you buy from that independent, at their price |

Two real paths with a genuine trade-off — *free but obligating* vs *paid
but unobligated* — and **neither is strictly better.** This also answers
[sampling-and-labs](./sampling-and-labs-slate.md)'s open question (is the
certified assayer a university employee or an independent?) with **both,
in tension**, which is a better answer than either alone.

⚠ **And the University can refuse.** Deny a claim-jumper lab access and
measurement becomes a political instrument. That is a lever a **Chancellor
seat** can actually pull — which is why the seat is worth minting, and
what it should be minted *for*.

---

## Part 4 — ⚠⚠ The conflict with the college slate, and the synthesis

**Recorded prominently because a reader must not miss it.**
[college-slate](./college-slate.md) states two load-bearing decisions
that appear to collide with Part 3:

> **"Enrollment costs money."** — enrollment-as-contract: clauses over
> verifiable conditions, escrow, tuition, financial aid.
>
> **"The course gates nothing."** — *"Worth stating precisely because it
> prevents a whole class of bad design… The College is not a new
> authority."* Its reason: stay off the turning-homework-into-a-toll-booth
> side of the gamification mirror.

### On "the course gates nothing" — no real conflict

That guardrail is about coursework being the **sole route to a
capability**. Lab access is not a capability; it is **access to a
building the University owns** — property, not power. And the guardrail's
own requirement (*"a course is never the only path"*) is **satisfied by
the independent assayer** of Part 3. The university lab becomes precisely
what the college slate says a course should be: *"the fast, social,
credentialed path, not the gate."*

### On tuition — the conflict is real, and it dissolves

⚠ **This one was mine, not the user's.** The user decided *enrollment
gates lab access*; the follow-on *"so enrollment costs obligation, not
tuition"* was an inference from the four-question pass. **That inference
is what collides**, not the access decision.

⭐ **Synthesis: enrollment-as-contract already accommodates it.** A
contract is *"clauses over verifiable conditions"* — and an obligation
("maintain applied hours") **is** a verifiable condition. So obligation
does not replace the contract model; it is a **clause inside it**, and
expulsion is termination for breach on the substrate that already
enforces gig work. Tuition, aid and sponsorship remain available as other
clauses.

> **Enrollment is a contract whose consideration may be money, time, or
> both — and no new mechanism anywhere.**

⚠ **Residual decision (Open question 1):** whether lab access specifically
keys on the *obligation* clause, the *tuition* clause, or merely on
enrollment being live. This slate assumes the obligation clause because
that is what produces the miner-learns-geology loop; a tuition-keyed
version reduces to "money buys access with extra steps," which is the
option the user rejected.

---

## Part 5 — ⭐⭐⭐ The teaching field sites (the missing tier)

**Provenance — lived examples, taken as the spec:**

> **User: "UC berkeley has an old mine shaft on campus that leads to the
> steam tunnels. cal poly had horticulture on campus and I think davis
> does too. my high school even had a small fenced in 'nature reserve'
> sorta thing that was local flora and fauna and a water source."**

All three have one thing in common: **they are working field sites *on*
campus.** Not classrooms, not labs — *the field, brought to the school.*
Berkeley's adit is a teaching mine; Cal Poly's orchard is a teaching
plot; a fenced reserve is a curated sample of the local biome with water
in it.

> ⭐⭐ **This is the missing tier of
> [sampling-and-labs](./sampling-and-labs-slate.md).** That design hangs
> on a field↔bench round-trip that costs time. A teaching site *on
> campus* makes that cost ~zero.

### The difficulty ramp falls out of siting, for free

A student learns the whole loop — field read → choose a sample → carry →
bench → result — with the round-trip dialed to two minutes. Then the real
mine is an hour away and **the identical loop suddenly has a price**.

**The campus field site teaches the loop; the world charges for it.** No
new mechanic, no tutorial text, no difficulty setting — it is purely
*where things are*. And since the campus is the first content a player
walks into ([eternal-university-slate](./eternal-university-slate.md)),
every field skill gets learned adjacent to safety before the stakes turn
on.

### The three sites

| site | rides | teaches |
|---|---|---|
| **The adit** — a short teaching mine into the hillside | seams, ore composition, the assay loop ([mining-slate](./mining-slate.md)) | prospecting: field read, sample selection, provenance |
| **Horticulture grounds + greenhouse** | smallholding, husbandry, **thermal** (a greenhouse is a *controlled environment*, genuinely instrument-rich) | growing, soil, the limiting-factor model |
| **The reserve** — fenced, local flora and fauna, a water source | [biome](../../subsystems/biome.md), weather, species, the field substrate | observation, water chemistry, identification |

⭐ **The steam tunnels past the adit earn their place precisely because
they are not academic.** Campus utility tunnels are lore, trespassing and
low-stakes transgression — the thing every real campus has and no course
catalogue mentions. They also give campus *infrastructure* a physical
existence, which is a hook for the power/utility side later.

---

## Part 6 — ⭐⭐ The archive (and why a campus library is not the town's)

A town public library will exist. A campus library needs a reason not to
be a duplicate, and the standing doctrine forces one:

> **If the aether is the textbook, general reference is already free to
> everyone, everywhere.** So no library justifies itself by holding
> general knowledge.

Which splits them cleanly:

| | holds | for |
|---|---|---|
| **Public library** | general, current | anyone — it is *access* |
| **Campus library** | ⭐ **the record of what has already been measured** | the institution — it is *the archive* |

Decades of students have assayed samples, surveyed seams, logged the
reserve's water chemistry. The campus library holds **that** — primary
records, prior surveys, old field notebooks. Not what the aether has
(never published); not what the public library has (specialist and
institutional).

### ⭐⭐⭐ The mechanic: checking the literature substitutes for fieldwork

Before riding out to assay a seam, you look up whether someone already
did — and if they did, **you skip the trip.** That is real research
skill, it is literally how science works, and it makes *the lab makes
measurements, the archive remembers them* a working pair rather than a
metaphor.

And it runs in the other direction: **your assays go into it.** Student
fieldwork accumulates into an institutional record later students read —
so the University **becomes more valuable over time from play**, which is
a rare and good property for authored content to have.

⚠ It also gives salting ([sampling-and-labs](./sampling-and-labs-slate.md)
Part 3) a second victim: a falsified provenance that reaches the archive
poisons everyone who trusts it afterwards. Which is another reason
certification exists.

### ⭐⭐ Spellbooks: the organizing principle, and why arcana is the University's noun

**Provenance:**

> **User: "one thing the library will have … is spellbooks. I dunno maybe
> different books in different libraries tho I dunno what the organising
> principle would be there … I think that the magic disciplines are going
> to need a guild. not the nouns, those disciplines can go in the trades
> where they're exercised, but the verbs are kinda just 'magic as magic'
> they dont connect to anything."**

#### ⚠ The guild question, resolved against a mages guild — twice over

[guild-slate § No magic guild](./guild-slate.md) already argues this, and
the argument holds:

> *"A 'mage's college' would be the genre-guild mistake wearing robes: an
> institution formed around a **branch of the map** instead of a
> vocation… Where do pure mages go? — **nowhere, correctly.** Magic as a
> subject of study belongs to the scholars' vocation (a researcher of
> magic is a real vocation; 'mage' is not). **The University teaches
> magic fundamentals to everyone as feeder material, like letters.**"*

⭐ **And the mechanism already delivers the verb-training the observation
was reaching for.** `MagicLogic` credits **both** grid axes on every cast
— its own comment reads *"Credit BOTH grid axes on the Transcript (one
act, two subchecks)"*, recording `magic-<verb>` **and** `magic-<noun>` at
the same difficulty.

So a verb is never trained alone and **never needs to be**: a smith
working fire/create and a healer working body/create raise the *same*
`magic-create`. A guild for the verbs would be an institution built
around a score that already accrues from everyone's ordinary work.

> ⭐⭐ **The good consequence: the verb is what transfers between
> trades.** A smith who ground `magic-create` at the forge picks up
> create/light far faster than someone starting cold — cross-trade
> mobility, earned rather than granted.

**Verdict: no magic guild. Unchanged.**

#### Where each grid piece lives

| grid piece | home | why |
|---|---|---|
| **nouns with a trade** — fire, plant, beast, body, earth, water, lightning | the trade | smithing, horticulture, husbandry, medicine, delving — a guild's **mystery tier** |
| **nouns without one** — ⭐ **arcana**, mind, sense, storm | the University / the scholars | `Grid.ts` defines arcana as *"the machinery of magic itself"* — magic's reflexive noun, with **no possible trade**, and precisely what a *scholar* studies |
| **all five verbs** | everywhere, + University fundamentals | credited on every cast; taught "like letters" |

⭐ **So the thing a "mages guild" was reaching for exists — it is the
arcane college — and it is a *school* rather than a guild because it
teaches everyone rather than gatekeeping a vocation.** Which is exactly
where Part 1 already sites the Practicum.

#### The spellbook principle

Spell distribution is **not** arbitrary and needs no new vocabulary — it
follows the same three-way split as everything else on these grounds:

| shelf | holds | axis |
|---|---|---|
| **Town public library** | published, general, low-band — what anyone may know | *access* |
| **Campus archive** | fundamentals, the verbs, and **arcana** — the theory | *institution* |
| **A guild's inner hall** | its craft's high-band verb×noun pairs — the smiths' fire/create, the healers' body/perceive | *the mysteries* |

> **A spellbook sits wherever its cell's institution sits.**

⚠ And the slate's **institutionally homeless** magic (mind, arcana
residue — *"the hedge-witch corner of the map, where the tapped-and-secret
institutions recruit"*) is what gives you **illicit spellbooks with a
reason to be illicit**: not contraband by fiat, but by having no lawful
shelf to sit on.

⭐ This also answers the campus-vs-town library worry directly: they hold
**different shelves of the same subject**, so neither is a duplicate.

---

## Part 7 — The combat facilities (the practicum for a different set)

⚠ **First, a correction:** combat.md's *"gym"* is
`scripts/combat-gym.ts`, a **balance bench** — a dev harness proving no
loadout dominates. It is **not** an in-world place, and **there is no
training or sparring mechanic at all**; the shipped verbs are `attack`,
`defend`, `fight`, `intervene`.

### The derivation: which Disciplines have no home?

Running Part 0's method on facilities rather than labs — most disciplines
already have a venue somewhere in the world (bartending → the bar;
cooking → the shipped `kitchen` archetype; magic → the Practicum;
agriculture → fields; darts → a bar game). That leaves exactly six with
nowhere to be:

> **`blades` · `melee-combat` · `sports` · `command` · `awareness` ·
> `stealth`**

So the combat facilities are not a flourish — they are the only home
several shipped disciplines have.

### What they can actually be, with no training mechanic

1. **Bounded combat** — a salle/ring where the harm outcome is *capped*:
   consent-scoped, non-lethal, no accountability consequence. Rides
   shipped consent + the harm-consent ledger. ⭐ **The world currently
   has nowhere you can fight someone safely**, and a place fills that gap
   with no new mechanic.
2. **An audience** — ⭐⭐ the more interesting half. A public bout before
   spectators is the purest **renown** generator available; reaction and
   reception signals are already the substrate. *An arena is a reputation
   facility, not a training one.*
3. ⚠ **Not a competence grind.** Do not build a room where you farm
   `blades` by hitting a dummy. That is the anti-pattern, and it is what
   "arena" usually degenerates into.

⭐ **The framing that keeps the campus coherent: the salle is the
practicum for combat** — learn by doing, under supervision, stakes
bounded. Identical in shape to the lab, so the combat buildings are
*consistent* with the academic ones rather than a genre bolted on. The
same enrollment logic then applies: a fencing team, an intramural league,
a boxing club — campus life that makes enrollment worth more than bench
access alone.

**`command` gets a drill ground**, which is where
[combat-formations](../../subsystems/combat-formations.md)' party-strategy
layer has a reason to exist outside a real fight.

---

## Part 8 — ⭐⭐⭐ The teaching rooms, and the curriculum that already specifies them

**Provenance:**

> **User: "we'll want at least one lecture hall and a couple class rooms
> on campus as well. not sure what we're gonna do with em yet, but we do
> have our magic cirriculum to teach."**

They are not a blank. **`docs/magic-101-course.md` is 752 lines of fully
authored curriculum** — eight chapters, LO coding, study.com item format,
worked generated items — and its structure maps onto the buildings this
slate derived independently.

### The room roster falls out of the chapter list

| chapters | room | assessed by |
|---|---|---|
| **1–5** — the one impossible thing · energy accounting · the price list · heat & phase change · momentum & recoil | **lecture hall** | lesson quizzes |
| **6 — Measurement & modelling** | ⭐ **the lab** (Part 1) | the *Reeve-line Practical* |
| **7 — Reading the literature** | ⭐ **the archive** (Part 6) | essay / oral viva on a shelf paper |
| **8 — Ethics of a measured intercept** | **a seminar room** — discussion-shaped, not practical | essay |

So: **one lecture hall, sited lab-adjacent, plus two classrooms** (a
seminar room for Ch 8 and one spare) is precisely the course's shape.

### ⭐ It completes a designed-but-unbuildable sequence

[college-slate](./college-slate.md) already specified the mechanic, and
flagged that it costs nothing:

> *"**The video card is free.** The client already has a watch embed for
> streams. A study.com video lesson plays there while the player sits in
> the hall; **then they walk down the corridor to the lab and do it.**
> That is a complete demo sequence with no new client work."*

⚠ **That sequence has been undeliverable because there were no labs on
campus.** Part 1 supplies the other half — so siting the lecture hall
adjacent to the assay/fermentation benches makes the whole demo
literally walkable. **This is the cheapest high-value thing on the
grounds**, and it is the study.com demo.

### ⭐⭐⭐ Three curriculum findings that corroborate this slate

Magic 101 was authored **2026-08-07**, before any of this design pass,
and independently specifies things Parts 1–6 derived. **Cite these; do
not re-derive them.**

**1. LO.6.5 is the field/bench split, under other names.**

> *"Classify an instrument as **primary** (value from first principles,
> e.g. the calorimeter) or **secondary** (fast, convenient, meaningless
> until calibrated); explain traceability."*

A *secondary* instrument is [sampling-and-labs](./sampling-and-labs-slate.md)'s
portable hand tool; a *primary* one is the bench. The three-tier ladder
was already in the curriculum. (**LO.6.6** likewise names *"survey meter
→ spatial-sampling artifacts"* — representative sampling, already
taught.)

**2. LO.7.5 gives the archive a reliability gradient, for free.**

> *"**The cost of checking** — classify a claim by how expensive it is to
> verify, and explain the design rule that **wrong papers live where
> checking is dear**."*

⭐⭐ The archive mechanic (Part 6) stated from the other end — and it
hands the design something it did not have: **error concentrates at
distance.** Records about the campus adit are cheap to verify, so they
stay sound; records about the far mine are expensive to verify, so *that
is where the wrong ones survive.* A reliability gradient that tracks the
Part 5 field-site ramp, emerging rather than authored — and it is where
salting hides.

**3. LO.7.2 is an authoring instruction for seeding the archive.**

> *"a shelf that is all-traps mistrains (distrust) as badly as one that
> is all-solid (credulity); the honest ratio is **≈5 solid : 2 flawed : 1
> wrong**."*

Not a design question any more — a **specified ratio** for what the
archive's shelves contain.

⚠ **Preserve the `[re-verify]` markers.** Several of the course's figures
carry them; the author flagged their own uncertain numbers deliberately.
Do not quietly resolve them into confident values.

---

## Part 9 — The rest of the grounds

- **The Chancellor seat** — the Government row is explicitly waiting on
  it, and Part 3 gives it its first real decision (admissions,
  revocation, and whether measurement is withheld).
- **Lab staff** — technicians; and the assayer question of Part 3.
- **Athletic grounds** — the `sports` discipline's only possible home.
- **A refectory** — cooking + metabolism, and the one campus building
  whose entire point is that people are in it together.
- **Lecture hall / exam hall / office hours** — already specified by the
  college slate; this slate does not redesign them.

⭐ **The library and the labs stand on opposite sides of the Quad** — the
*aether-is-the-textbook* building facing the *instrument-is-the-lab*
building. That is the instrumentation slate's entire epistemology, made
architectural.

---

## Open questions

1. ⚠ **Which enrollment clause keys lab access** (Part 4's residual).
2. **What are the obligations, concretely?** Attendance, submitted
   practicals, a minimum of applied hours? It must be measurable, since
   revocation depends on it — and the Transcript is the obvious evidence.
3. **Can enrollment be refused, or only revoked?** Admissions-as-a-political-act
   is powerful and also a griefing surface; it may want the same
   good-faith constraint the wizard-duty doctrine puts on guards.
4. **Is the observatory's timekeeping role official?** If the University
   sets the realm's clock, that is a civic power with a jurisdiction
   question attached — and possibly a dispute worth having with the city.
5. **Do all five labs ship together?** They share a locality, an owner and
   an access policy, which argues yes; but only assay has a designed loop
   waiting on it.
6. **Where does the Practicum physically sit** once it is bound — its own
   building, or a room inside the arcane college?
7. ⚠ **Does the arena have stakes?** A salle with capped harm is safe,
   cheap and clearly right. An arena with **purses, betting and real
   injury** is a far better renown engine and a better story — but it
   needs accountability and banking wired in, and it turns a campus
   facility into a business. **Bounded-and-safe, or
   real-stakes-with-an-audience?** Unresolved.
8. **Do the teaching field sites yield real goods?** If the adit produces
   sellable ore, students farm it and it stops being a teaching site. The
   likely answer is *real data, negligible yield* — but that is a dial
   somebody has to set deliberately.
9. **Is the archive writable by students, or curated?** Auto-deposit
   makes the University compound in value; curation makes it trustworthy.
   Salting (Part 6) argues for at least a review step.
10. **Who runs the reserve?** A groundskeeper is a vocation, and a fenced
    reserve with a water source is a natural home for the husbandry and
    biome systems to be *observed* rather than exploited.
11. **Is a spellbook readable in place, or borrowable?** The archive
    principle (Part 6) says the shelf is institutional; whether learning
    requires *being there* is the difference between a library that is a
    place and one that is an inventory.
12. **Does the arcane college's shelf gate on enrollment too?** Part 3's
    ladder says yes by default — but "the University teaches magic
    fundamentals to **everyone**" (guild slate) may argue the low-band
    shelf is open to the public, like letters.
13. **Is Magic 101 the *first* course to build, or the exemplar?** It is
    the only fully authored curriculum, which argues first. But it is
    also the one whose Ch 6/7 practicals need the lab and archive
    *finished*, which argues it should follow them.
14. **What does a lecture hall do when no lecture is scheduled?** The
    college slate's model is "scheduled, many-to-one." An empty hall the
    rest of the time is either fine (a real building) or dead space
    (a room that is only ever a cutscene venue).

---

## What this slate does NOT cover

- **The campus's feel, topology and the Quad** —
  [eternal-university-slate](./eternal-university-slate.md) owns it.
- **Courses, assessment, the item generator, teaching-as-employment** —
  [college-slate](./college-slate.md) owns them.
- **The field/bench split, the sample object, the three tiers** —
  [sampling-and-labs-slate](./sampling-and-labs-slate.md) owns them; this
  slate only sites the bench end.
- **The general instrument gating model** —
  [instrumentation-slate](./instrumentation-slate.md).
- **Duncan Hall / the dorm** — shipped, and its Katie-fronted intake is
  the pattern an enrollment flow should copy rather than reinvent.
- **The combat system itself** — [combat.md](../../subsystems/combat.md)
  owns sessions, poise, gambits; Part 7 only sites it and notes that no
  training mechanic exists to site.
- **The town's public library** — Part 6 only argues why the campus
  archive is not a duplicate of it.
- **The power/utility system** the steam tunnels gesture at.
