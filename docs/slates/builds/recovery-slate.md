# Recovery slate — making the clinic heal you

> **Status: DRAFTED 2026-09-18** — the focused, non-duplicative cut of what
> was loosely asked for as "the treatment build." Seeded by the harm-survey
> build (injury shipped, MR !260) and a three-way code+design survey run
> 2026-09-18.
> **Left:** all of it — a fresh slate; nothing here is built.
> **Size:** a build. ⭐ Mostly **WIRING seams already cut**, not new substrate.

Captured out of the question *"where do we go after harm — healing/treatment,
or law-enforcement?"* The survey answered the first half: **treatment is not
greenfield.** The injury build shipped a real medic loop, and the world
already has a complete infirmary. What it does **not** have is a clinic that
heals you better than a ditch. This slate is that operational layer.

---

## The thesis

> ⭐⭐⭐⭐⭐ **The infirmary is a finished building that sells nothing, because
> the recovery clock ignores care.**

Physiology's ratified floor is *"time is the free heal; everything else buys
time."* We shipped the free heal. **We never shipped the "everything else."**
Today a wound's severity decays at a flat per-type rate that never consults
the bed you are lying on, the setting you are in, or the skill of anyone
tending you. Three tells, all confirmed in code:

1. The Terminus infirmary **cot is `restQuality: 0.7`** — *below* a home
   `bed` (`2.0`) and a dorm bed (`1.5`). **You heal faster sleeping at home
   than in the clinic.** And even that number only touches `endurance`;
   wounds ignore it entirely.
2. **Grave wounds are untreatable.** `treat` refuses a rupture with *"It
   wants surgery"* — and nothing in the game supplies surgery. The engine's
   `mismatchLine` already narrates *"it wants warmth / rest / medicine /
   surgery"* for every unmet resolution token; **no verb delivers any of
   them.** You can inflict wounds you cannot treat.
3. The physician **Aldis Verrow has "NO clinical brain"** — `order treatment`
   is kernel-orchestrated; nobody competent actually stands behind the
   counter.

> **The build makes every clause of physiology's one-line proof real:**
> *"Someone breaks their arm, cannot work, gets it set, and works again —
> with a bill."* Today they break it, it is untreatable, and it knits at a
> flat rate on the floor exactly as fast as on the cot.

### ⭐⭐⭐ Why this is a low-risk build: it is almost all wiring

The survey's governing finding — **nearly everything this needs is a seam
already cut and left unconsumed:**

| Seam that EXISTS | What it needs | 
|---|---|
| `restQuality` × posture × furniture recovery (`Metabolic.coupledRecovery`) | it drives **endurance only** — point it at wound severity too |
| `mismatchLine` names every unmet resolution token | ship the **verbs** that deliver them |
| `applyAntidote(toxinType)` primitive (`Metabolic.ts:1448`) | a **verb** wired to it (tests are its only caller today) |
| the dying clock's deliberate linkdead-exemption | **mirror the carve** for the healing branch |
| `DressingMixin.dressingQuality` (consumed by `treat`) | a **producer** — a body cleanliness state |
| live `ConditionCatalogue` at boot (the "not live" blocker is stale) | authored **infection/medicine** rows |
| the shipped attendant/activity substrate | a **nursing engagement** over it |

**This is a wiring build, not a new-clock build.** That is what makes it
sharply scoped and safe to land in waves.

---

## ⭐⭐ The boundary — why this is a NEW slate, not a fourth duplicate

Treatment is already claimed across four slates plus the shipped engine. This
slate touches **none** of their ground; it fills the operational gap
**between** physiology's substrate and health-vertical's institutions.

| Owner | Owns (OUT of scope here) |
|---|---|
| **physiology-slate** | the substrate + care economy doctrine + the five verbs (`arrest/accelerate/mask/restore/prevent`) + capacity vocabulary + the alarm-clock recovery timing + the recovery ratchet. ⭐ We **implement** these; we never re-decide them. |
| **medic-judgment-slate** | the **diagnosis / graded-decision** surface (boundary settled 2026-09-15): cues-without-names, triage-under-the-clock, clinical judgment. We consume `assess`; we do not re-own diagnosis. It also **flags the hole this slate fills**: *"the NPC medic — the missing half of paid treatment."* |
| **health-vertical-slate** | **institutions**: the aid post, public-health department, College of Physic, the veterinary track, outbreak reporting. |
| **pharma-slate** | the **medicine industry**: credence goods, statistics-at-scale, the supply chain, brands/recalls, the assayer, the therapeutic window's economics. |
| **disease-design-pack** | **contagion / immunity / epidemiology**: `ContagionSpec`, R0, transmission, quarantine. ⭐ We ship **wound infection without contagion** — physiology says it *"ships BEFORE disease."* |
| **blood-slate** | **transfusion / red cells / the blood bank.** ⚠ This build must **not** raise `PLASMA_RESTORE_CEILING_FRAC` (0.85) — that ceiling is deliberately blood-slate's premise. |

> ⭐ The un-owned subject, stated once: **the mechanics that turn "a body that
> heals on read" into "a place where care is administered over time."**
> Nobody owns making the clinic worth visiting.

---

## The waves (candidate shape — the plan decides the real cut)

**W1 — Care-driven healing rate. (The keystone; ship first.)**
Make trauma `severity` decay consult the setting, not a flat constant:
`restQuality` × posture × a present carer's `medicine` competence band. Give
the infirmary cot a real **clinic-cot tier** above a home bed (fixing the
0.7 < 2.0 inversion). **Outcome:** the clinic now sells *rate* — the one
thing physiology says a bed's product is. Nothing new is invented; the
`restQuality` read is repointed and a coefficient added to the wound tick.

**W2 — Verbs for the orphaned resolution tokens.**
The engine already says what each wound wants; deliver it. `set`/`splint`
(fracture), `operate`/`surgery` (rupture — *the untreatable wound*),
`warm`/`cool` beyond the shipped `fluid` (burn/frostbite), and `dose`
(poison — wired to the existing `applyAntidote` primitive). The
splint/suture **instruments** are `ToolMixin` rows in `trade-medicine`
(*"a splint is a row plus one vocabulary entry"*). **Outcome:** no wound you
can inflict is untreatable.

**W3 — The offline-heal carve.**
Split the trauma arm of `reconcileConditions` so **healing accrues while
linkdead** (mirroring the dying clock's deliberate exemption) while damage
still freezes. **Outcome:** *"log off with a splint, come back mended."* The
single most-cited recovery affordance, and a ~one-branch change.

**W4 — Nursing as duration-of-care.**
A present carer **accelerates another body's recovery clock** — an
attend/tend engagement over the shipped attendant/activity substrate, and
**triage as a queue policy** (physiology: *"the most morally loaded queue in
the game, and its substrate already ships"*). **Outcome:** a reason for a
competent NPC — or a player — to stand behind Aldis's counter. The medic
becomes a **vocation**, priced by the labour it restores.

**W5 — Infection-as-deadline + the body washing state. (The hygiene fork —
see Opens.)**
A dressed wound can go **septic** — an acute affliction on the now-live
catalogue, **not** contagion. A carer **washing hands** before treating
lowers infection chance; the **body cleanliness state** is the missing
*producer* for `dressingQuality`, riding bathroom's washing state (today
only vessels have `soiled`). **Outcome:** *"Trauma gives you a problem;
infection gives you a deadline,"* and hand-washing — *"the single most
consequential medical intervention in history"* — becomes real. Ships
before disease, needs no contagion model.

---

## Reachability wiring (the four silent-failure links)

- **verb** — W2 ships `set/splint/operate/surgery/warm/cool/dose`; W5 a wash
  step. Each is a `medical`-category view + controller.
- **affordance** — the instrument (splint/suture/basin) confers its verb as a
  static on its class, **not** a row's `commandContributions`.
- **data** — the clinic-cot tier, the splint/suture instrument rows, the
  sepsis affliction seed, the medicine-as-resolution rows. ⚠ The
  `ConditionCatalogue` warms them (confirmed live).
- **boot** — nothing new to warm beyond the catalogue that already self-warms.

---

## Lens pass (docs/design-lenses.md)

1. **Pedagogy** — `medicine` (ISCED 0913, nursing/midwifery) improved by
   doing; the derivable lessons are **triage**, the **function-vs-structure
   diagnosis gap** (*"your supply is cut, not your bone"*), and care
   **priced by labour restored** (health economics). Hand-washing is the
   headline intervention.
2. **Creative expression** — a clinic is **rows** (a second clinic needs zero
   pack code); the ordinary case (dress a cut) needs no code; the bespoke
   (a field surgeon, a battlefield aid tent) composes from the same verbs.
3. **Immersion & RP** — the medic role **emerges from an honest sim**: you
   genuinely cannot work with a broken arm, and a nurse genuinely shortens
   your downtime. Never a gauge.
4. **Values** — the forced choice is the **humane free floor** (*"nobody dies
   of poverty; they heal at the unassisted rate"*) against the paid rate, and
   **triage** — who gets the cot first. Standing is conferred by the priced
   care economy and by `medicine` competence earned in deeds.
5. **Epochs** — the mechanism (**care buys rate**) holds from a Roman
   valetudinarium to a New York ER; only the instruments and drugs change.
   ⭐ Magic is a **payment method, not a verb**: *"medicine spends money;
   magic spends you"* — a cure spell pays the recovery cost with yourself.

---

## Collisions (who already lives here)

- **The Terminus infirmary** — Aldis Verrow, the ward, `business.yaml`,
  `tariff.yaml` (treatment:12, repair:8), the cot, the dressing-cabinet. ⭐
  We **upgrade the thing that exists**, we do not add a second clinic.
- **Beds everywhere** — home bed (2.0), dorm bed (1.5), the cot (0.7). W1
  extends what `restQuality` drives; do not regress endurance recovery.
- **The glass-alley bandage** + `DressingMixin`/`Bandage` — the dressing
  `treat` already consumes; W5 gives its `dressingQuality` a producer.
- ⚠ **build-3 (`design/nutrition-fitness`, building now)** is live-editing
  `metabolism.md`, `reserve.md`, `advancement.md` and the vitals substrate —
  the **same kernel surface** W1/W3 touch. See Opens.

---

## Placement

Kernel-led, with content tails. The healing-rate read, the offline carve,
and the verb controllers are **kernel** (`platform/idea/cmd/medical/` + the
vitals/condition substrate). The verb **views** are platform content
(`medical` category). The **instruments and the nurse vocation** are the
**`trade-medicine`** pack. The **infirmary upgrade** (cot tier, business) is
**terminus** content. ⭐ A second clinic needs **zero pack code** — the test
passes.

---

## Opens (forks the requirements phase must close)

1. ⭐⭐ **Artifact fork — this slate, or harvest physiology's plan?**
   physiology-slate carries an **18-wave build plan** that overlaps W1–W5.
   Option (a): take this focused recovery slate to `/requirements`. Option
   (b): lift the relevant waves out of physiology's plan and skip a new
   slate. **(a)** keeps the buildable subject in one legible place and cites
   physiology as the doctrine owner; **(b)** avoids any second doc. *User's
   call.*
2. ⭐ **Is W5 (hygiene/infection) in this build or deferred?** Lean: **a thin
   version in** — infection-as-deadline + hand-washing, no contagion — because
   it is the pedagogically richest wave and physiology already designed it to
   ship before disease. The full transmission model stays with the disease
   pack regardless.
3. ⚠⚠ **Concurrency with build-3.** W1/W3 edit the same vitals/metabolism
   kernel surface nutrition-fitness is editing. **Sequence after it merges**,
   or carve an explicitly non-overlapping surface first. Two branches on one
   subsystem is the worktree hazard. build-3's session is not messageable
   right now; the branch is the coordination point.
4. **The blood boundary** — confirm this build leaves `PLASMA_RESTORE_CEILING_FRAC`
   at 0.85 and adds no red-cell/transfusion path (blood-slate's premise).
5. **Where the healing-rate coefficient lives** — on the wound `tick` or as a
   per-read modifier in `reconcileConditions`. *Engineering; for `/plan`.*

---

## The drive (seed — refined at requirements)

Physiology's proof, made concrete for this build:

1. Take a **fracture**. Confirm `treat` refuses it today; after W2, `set`/
   `splint` it.
2. Lie on the **infirmary cot**; confirm the fracture knits **faster than
   face-down on the floor** (W1 rate multiplier), and the cot now beats a
   home bed.
3. A **nurse attends** you → the recovery clock accelerates again (W4).
4. **Log off** dressed; log back in later → the wound has **progressed**
   (W3 offline-heal).
5. Take a **rupture** (untreatable today) → `operate`/surgery resolves it
   (W2).
6. Get **poisoned** → `dose` clears the burden (W2 → `applyAntidote`).
7. A carer with **dirty hands** treats you → the wound goes **septic**; with
   washed hands → it does not (W5).
8. Pay the **tariff** → confirm the clinic sells **rate**, and a destitute
   body still heals at the **unassisted free floor**.

---

## Cross-references

- Substrate & doctrine: [physiology-slate](./physiology-slate.md)
  (Parts 2, 4b, 5, 7f), [harm.md](../../subsystems/harm.md),
  [vitals.md](../../subsystems/vitals.md),
  [mortality.md](../../subsystems/mortality.md)
- Boundary owners: [medic-judgment-slate](./medic-judgment-slate.md),
  [health-vertical-slate](./health-vertical-slate.md),
  [pharma-slate](./pharma-slate.md),
  [blood-slate](./blood-slate.md),
  [disease-design-pack](./disease-design-pack.md)
- Consumed seams: [bathroom-slate](./bathroom-slate.md) (washing state),
  [metabolism-slate](../tails/metabolism-slate.md) (`restQuality`, protein→healing,
  antidote→treatment), [reserve.md](../../subsystems/reserve.md)
- Live now: `ConditionCatalogue` (self-warm, boot manifest); the shipped
  medic loop (`treat`/`bind`/`dress`/`rinse`/`undress`/`assess`)
