# Autopsy slate — safe surgery, and what a body will still tell you

> **Status: UNBUILT — and it needs no slate of its own for the mechanism,
> only for the decisions.** Every piece is shipped or already slated: the
> **act** is a row on the shipped `Operation` catalogue; the **external
> read** ships (`analyze postmortem`); the **clock** ships
> (`FORENSIC_READABILITY`); the **bench** is
> [sampling-and-labs](../builds/sampling-and-labs-slate.md)'s pathology
> leg; the **standing** is [attestation](../builds/attestation-slate.md).
> **Left:** the post-mortem `Operation` row + **evidence as its stake** ·
> the **interior-injury** reading channel · **per-channel readability** ·
> who may open a corpse · whether animal autopsy credits `forensics` or a
> veterinary sibling.
> **Size:** a tail — three small pieces and two governance questions; the
> heavy lifting belongs to three other slates.

Opened 2026-09-28, out of *"what does surgery mean for the concept of
autopsies, and is there a medical examiner?"* — with the standing caveat
that **narrative and NPC personality are up in the air** (the staged
morgue character and its questline predate most of these systems and will
be rethought), so **nothing here depends on an authored occupant.**

---

## ⭐⭐⭐ The act: an `Operation` row with the danger zeroed

The clinical-medicine build (MR !290) shipped `operate` as a **durative,
blood-costing, interruptible** act over a **data `Operation` catalogue**,
gated on **posture · competence · kit · anaesthesia** — and *a second
operation is a ROW.*

> **An autopsy is that row with its danger parameters set to zero:
> no anaesthesia to give, no blood to lose, no patient to keep alive.**

Which is exactly the user's original framing — *autopsy is safe surgery*
— **expressed as data rather than as a separate mechanic.** The gates
that make surgery dangerous are per-row, so zeroing them is authoring,
not engineering.

### ⚠ But it is not a free action — the stake SWAPS

> ⭐⭐⭐ **Surgery on the living risks the patient. Surgery on the dead
> risks the EVIDENCE.**

A clumsy dissection destroys what it was opened to read. So the row swaps
one cost for another rather than dropping it, and three things fall out:

- ⭐ **The first-examiner-degrades-it property gets its real cause** — not
  just exposure to air, but **the cut itself.** A bad examiner does not
  merely fail to find the poison; they make it unfindable by anyone.
- ⭐ **Skill becomes legible with no number.** A master recovers more from
  the same body than a novice *because they did not wreck it.*
- ⭐⭐ **The teaching loop closes.** You learn on animal corpses, and the
  feedback is **how much of the body you could still read afterwards.**
  The corpse grades the incision — no instructor, no score.

⚠ **A superseded finding, recorded so it is not re-derived:** an earlier
pass in this conversation argued the autopsy should ship *before*
surgery-the-practice as a safe proving ground for the durative engine.
**Wrong — that engine already shipped**, and `harm.md`'s stale passage
(corrected in the same commit) is what made it look unbuilt. The autopsy
is a **consumer** of the catalogue, not its pathfinder.

---

## The yield: TWO channels, because injury and poison are not alike

The shipped external read (`analyze postmortem`, `discipline: forensics`,
`instrument: ""`) reads **wounds** — surface marks, `ceil(readability ×
wounds)`, worst first, **inferred and never read off the `causeOfDeath`
stamp**, so it can be wrong and gets worse as the body goes.

⭐⭐⭐ **It therefore cannot see a poisoning — and another subsystem
guarantees that.** `spoilage.md`'s silent population reports to *"no sense
at all: no reading, no smell, no taste."* **A murder by poison is
currently unsolvable by any means the game has.** That is the whole case
for opening a body, and it needs no character to motivate it.

| | rung | Discipline | why |
|---|---|---|---|
| **interior injury** — a ruptured liver, a crushed heart | ⭐ `analyze` on an **opened** body | `forensics` | an anatomical fact, **visible** once exposed |
| **toxicology** — what was in the blood | `sample` → `assay` at a bench → **a paper** | `chemistry` | invisible by construction; needs the bench |

⭐ **The anatomy already exists.** `BodyPlan.bodyParts` is sixteen parts
on a biped — **brain · spine upper/lower · heart · lungs · liver** — and
**`BodyPlan.isInterior(key)`** is a shipped predicate. *An autopsy is the
act that makes interior parts readable.* The depth ladder already orders
which organ a deep wound reaches, by authored mass.

⭐⭐ **Two competences means two examiners who can disagree** — the
anatomist and the chemist — which is historically exact and is where the
drama lives.

⚠ **The lab half is NOT this slate's.** Pathology is already named in
[sampling-and-labs](../builds/sampling-and-labs-slate.md)'s Left (*"the
medical diagnostic lab — blood typing, panels, cultures, pathology"*),
together with the **sample object + its provenance field** and
**chain-of-custody**. Build it there; this slate only asserts that a
corpse is one of its subjects.

⭐ Sixth instance of this programme's recurring pattern: **`assay-shed`
already ships in Rejection** as the ore assayer. *The toxicologist is the
assayer with a different sample.*

---

## The clock: per-channel readability

`MORTALITY_DEFAULTS.FORENSIC_READABILITY` ships — `fresh 1 · stale 0.6 ·
decomposed 0.25 · spent 0` — with difficulty `1 − readability`, and its
own comment already frames the politics: *somebody who wants the truth
has a reason to hurry, and somebody who does not has a reason to wait.*

⭐⭐ The honest extension is that **one scalar should not gate
everything**, because a body stops telling you different things at
different times:

| evidence | keeps |
|---|---|
| fracture, bone | long after flesh is gone |
| soft tissue, organ damage | with the decay stage |
| toxins | some nearly forever, some hours |

⭐⭐⭐ A **per-channel multiplier** on the shipped scalar — **three bands,
not a curve** (*expression is inelastic*) — buys the best decision in the
design:

> **Which question do you ask first, because you may not get to ask the
> second.**

With opening accelerating decay, the examiner has a body, a clock and an
ordering choice: a real skill with no number attached.

---

## Standing: the office confers WEIGHT, never ACCESS

The instrumentation doctrine is already explicit and settles the
medical-examiner question without a character:

> ⭐⭐⭐ **Competence resolves DETAIL. It never resolves ACCESS.** Every
> channel is open to everybody… where a reading is out of reach it is a
> **route** you are missing, and the refusal names it.

So an ME needs **no special verb and no special permission.** Three
distinct things, each with a shipped or slated home:

| | what | where |
|---|---|---|
| **the finding** | what you concluded | ephemeral |
| **the paper** | the assay's own output — transferable, loseable, suppressible | the shipped `assay` rung |
| **the attestation** | who vouches, on the record | [attestation-slate](../builds/attestation-slate.md) |

⭐⭐ **The office confers exactly one thing: whose attestation is
official.** A coroner's finding *is* an attestation —
`approves`/`objects`/`notes`, **superseded but never retracted**, with the
Art. VI judiciary already a named consumer of that slate.

### ⭐ Corruption needs no lying mechanic and no authored villain

An examiner who does not look hard enough attests to a shallow reading;
the ledger records **what was done and what was not**; `objects` lets a
second examiner contest it non-blockingly; and *superseded, never
retracted* keeps the first finding visible. **A contradicting second
attestation is the entire drama, generated by play.**

On forgery: **do not build lying.** `inquiry-slate` already settled the
general case — *a false paper fails verification; the sim will not
cooperate with a lie* — and the teeth are **verification cost**.

> ⭐⭐⭐ **Here the verification cost is the highest anywhere in the design,
> because the body decays.** Re-assay may be *impossible*. That is what
> makes forensic evidence precious, contestable, and worth fighting over
> — and it is why who reaches the body first matters. The whole thing
> closes on itself.

⚠ **And the floor holds without effort:** *nothing load-bearing may depend
on a player institution existing.* With no examiner at all, any competent
person can still open and read a body; what is missing is an
**authoritative filing**. The world is less settled, not broken — the
same shape as a guild nobody joined. ⭐ Which argues, per the Saxonberg
principle, for **shipping the seat and not the occupant**: an authored
rubber-stamper is a good story that also pre-decides what every realm's
morgue is like.

---

## Decided

1. **The act is an `Operation` row**, not a new verb and not a bare
   `sample` — the catalogue's first non-therapeutic consumer.
2. **Safe surgery is the danger parameters zeroed** — as data.
3. ⭐⭐ **The stake swaps to the evidence.** It is not a free action.
4. **Two yields, two Disciplines** — interior injury by eye (`forensics`),
   toxicology by bench (`chemistry`).
5. **Per-channel readability**, three bands.
6. **The office confers standing, not access.**
7. **No forgery mechanic** — provenance plus verification cost.
8. **Ship the seat, not the occupant.**

## Open

1. ⚠ **Who may open a corpse.** Consent, next of kin, the undertaker, the
   necropolis, species custom. A **governance** question, not a
   mechanical one — and it wants the Office/parcel machinery, not a flag.
2. **Does animal autopsy credit `forensics` or a veterinary sibling?**
   Matters because **animals are where the practice volume is** —
   clinical-medicine's own Left already names **veterinary** as *a
   `health` Discipline branch, not a trade*, so the answer probably lives
   there.
3. **Does butchery and autopsy share the act?** `ButcherController`
   already opens bodies. Same act, different question asked — worth
   checking before a second opening mechanism is written.
4. **What an opened body looks like to `look`** — the presentation
   question, and the one most likely to be distasteful if unconsidered.

---

See also: [harm.md](../../subsystems/harm.md) (the `Operation` catalogue)
· [mortality.md](../../subsystems/mortality.md) (`PostmortemMixin`, the
decay clock) ·
[instrumentation.md](../../subsystems/instrumentation.md) (the ladder) ·
[surgery-specialty-slate](../builds/surgery-specialty-slate.md) ·
[sampling-and-labs-slate](../builds/sampling-and-labs-slate.md)
(**pathology is there**) ·
[attestation-slate](../builds/attestation-slate.md) ·
[vitals.md](../../subsystems/vitals.md) (`isInterior`)
