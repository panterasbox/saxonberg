# Campus labs slate — the university's labs, and enrollment as the door

**Captured 2026-09-01.** What labs go on the Eternal University campus,
who may use them, and why that single access decision turns a thin
government into a working institution.

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
[civics.md](../../subsystems/civics.md) (the university's own
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

## Part 5 — What else the grounds want

Beyond the labs, and mostly already named by
[eternal-university-slate](./eternal-university-slate.md) /
[college-slate](./college-slate.md):

- **The Chancellor seat** — the Government row is explicitly waiting on
  it, and Part 3 gives it its first real decision (admissions,
  revocation, and whether measurement is withheld).
- **Lab staff** — technicians; and the assayer question of Part 3.
- **The library** — ⭐ the *aether-is-the-textbook* counterpart to the
  lab's *instrument-is-the-lab*. The two together are the whole
  epistemology of the instrumentation slate, standing on opposite sides
  of the Quad.
- **Lecture hall / exam hall / office hours** — already specified by the
  college slate; this slate does not redesign them.

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
