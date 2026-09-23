# Recovery slate — making the clinic heal you

> **Status: DRAFTED 2026-09-18** — the focused, non-duplicative cut of what
> was loosely asked for as "the treatment build," then **scope-maxed against
> the five lenses** per user directive (2026-09-18). Seeded by the harm-survey
> build (injury shipped, MR !260) and a three-way code+design survey.
> **Left:** all of it — a fresh slate; nothing here is built.
> **Size:** a build (a **wiring** core + **lens-extension** waves). ⭐ The
> core reconsumes seams already cut; the extensions each buy a lens.

Captured out of the question *"where do we go after harm — healing/treatment,
or law-enforcement?"* The survey answered the first half: **treatment is not
greenfield.** The injury build shipped a real medic loop, and the world
already has a complete infirmary. What it does **not** have is a clinic that
heals you better than a ditch. This slate is that operational layer — and, on
the user's *"include as much as maxes the lenses"* directive, the identity and
economic consequences that make recovery *mean* something.

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

### ⭐⭐⭐ Why the core is low-risk: it is almost all wiring

The survey's governing finding — **nearly everything the core needs is a seam
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
| the just-merged magic-expression grid (MR !260) | a **`mend` effect** that spends the caster |

**The core is a wiring build.** The extensions add identity and economics on
top — that is where the lenses are maxed.

---

## ⭐⭐ The boundary — why this is a NEW slate, not a fourth duplicate

Treatment is already claimed across four slates plus the shipped engine. This
slate touches **none** of their ground; it fills the operational gap
**between** physiology's substrate and health-vertical's institutions.

| Owner | Owns (OUT of scope here) |
|---|---|
| **physiology-slate** | the substrate + care economy doctrine + the five verbs (`arrest/accelerate/mask/restore/prevent`) + capacity vocabulary + the alarm-clock recovery timing + the recovery ratchet. ⭐ We **implement** these; we never re-decide them. |
| **medic-judgment-slate** | the **diagnosis / graded-decision** surface (settled 2026-09-15): cues-without-names, triage-under-the-clock, clinical judgment. We consume `assess` and ship only a **thin** NPC brain (runs the treat loop over a queue); the *graded judgment* stays theirs. It flags the hole this slate fills: *"the NPC medic — the missing half of paid treatment."* |
| **health-vertical-slate** | **institutions**: the aid post, public-health department, College of Physic, the veterinary track, outbreak reporting. We price the **shipped** infirmary business; we do not build the institution. |
| **pharma-slate** | the **medicine industry**: credence goods, statistics-at-scale, the supply chain, brands/recalls, the assayer, the therapeutic window's economics. |
| **disease-slate** | **contagion / immunity / epidemiology**: `ContagionSpec`, R0, transmission, quarantine. ⭐ We ship **wound infection without contagion** — physiology says it *"ships BEFORE disease."* |
| **blood-slate** | **transfusion / red cells / the blood bank.** ⚠ This build must **not** raise `PLASMA_RESTORE_CEILING_FRAC` (0.85) — that ceiling is deliberately blood-slate's premise. |

> ⭐ The un-owned subject, stated once: **the mechanics that turn "a body that
> heals on read" into "a place where care is administered over time — and a
> body that carries what it has survived."**

---

## The waves

Two tiers. **Core (C1–C5)** is the wiring build — the clinic starts working.
**Lens extensions (L1–L5)** each name the lens they max; they are what the
*"include as much as maxes the lenses"* directive buys. The plan decides the
real cut and order; C1 ships first regardless.

### Core — the wiring build

**C1 — Care-driven healing rate. (The keystone.)**
Make trauma `severity` decay consult the setting, not a flat constant:
`restQuality` × posture × a present carer's `medicine` competence band. Give
the infirmary cot a real **clinic-cot tier** above a home bed (fixing the
0.7 < 2.0 inversion). **Outcome:** the clinic sells *rate* — the thing
physiology says a bed's product is.

**C2 — Verbs for the orphaned resolution tokens.**
The engine already says what each wound wants; deliver it. `set`/`splint`
(fracture), `operate`/`surgery` (rupture — *the untreatable wound*),
`warm`/`cool` (burn/frostbite beyond `fluid`), `dose` (poison — wired to the
existing `applyAntidote`). Splint/suture **instruments** are `ToolMixin` rows
in `trade-medicine`. **Outcome:** no wound you can inflict is untreatable.

**C3 — The offline-heal carve.**
Split the trauma arm of `reconcileConditions` so **healing accrues while
linkdead** (mirroring the dying clock's exemption) while damage still freezes.
**Outcome:** *"log off with a splint, come back mended"* — a ~one-branch change.

**C4 — Nursing as duration-of-care + a thin NPC medic brain.**
A present carer **accelerates another body's recovery clock** — an attend/tend
engagement over the shipped attendant/activity substrate — and **triage as a
queue policy** (physiology: *"the most morally loaded queue in the game, and
its substrate already ships"*). Give **Aldis a thin brain** that runs the
shipped treat loop over that queue, so someone competent finally stands behind
the counter. **Outcome:** the medic is a **vocation**, priced by labour
restored (see L2).

**C5 — Infection-as-deadline + the body washing state.**
A dressed wound can go **septic** — an acute affliction on the live catalogue,
**not** contagion. A carer **washing hands** before treating lowers infection
chance; the **body cleanliness state** is the missing *producer* for
`dressingQuality` (today only vessels have `soiled`), riding bathroom's washing
state. **Outcome:** *"Trauma gives you a problem; infection gives you a
deadline,"* and hand-washing — *"the single most consequential medical
intervention in history"* — becomes real, before any disease model.

### Lens extensions — the scope-max

**L1 — ⭐ Magic as payment, not a verb. (Lens 5: epochs · Lens 4: values.)**
A `mend` effect that spends the **caster** (mana/fatigue) to buy a target
recovery rate — physiology rule 6, *"medicine spends money; magic spends you;
magic adds no medical verbs, only a payment method."* Reuses the
magic-expression grid merged in MR !260. **The lens hit:** magic and medicine
are one axis (a cure spell is a *bill paid in self*), and the player choice
becomes *spend coin, or spend yourself.*

**L2 — Care priced by labour restored. (Lens 1: pedagogy · Lens 4 · Lens 5.)**
Index the shipped `Tariff` to the **labour a treatment returns** — *"the same
injury is worth more to a miner than a scribe,"* so *"the clinic near the mine
is a different business from the clinic downtown."* Keep the **humane free
floor** explicit: *"nobody dies of poverty; they heal at the unassisted rate."*
**The lens hit:** real health economics (human capital), the morally-loaded
market that is *not* cruel because time is free, and von Thünen clinic
geography — a second industry deriving the same map.

**L3 — Structure remembers. (Lens 3: immersion · Lens 4: values.)**
Two cheap mechanics off the shipped structure/function split: **scars as
identity** (a cleared wound leaves a describe-time mark, never a penalty; feeds
the chronicle — *"scars are identity, not penalty"*), and **re-injury on a
half-knit bone** (function returns before structure, so acting hard too soon
re-breaks it). **The lens hit:** your body records your history, and *"get back
to work now or heal properly"* is a real recurring choice.

**L4 — ⚠ What is gone. (Lens 3 · Lens 4 · Lens 2: expression. The heavy one.)**
The recovery ratchet's floor: a wound severe enough leaves **missing tissue →
an open slot**, and a **prosthetic** (peg leg, hook) fills it — physiology's
*"amputation is a slot; time heals everything except what is gone."* Loss is
**identity, never unplayability.** **The lens hit:** the deepest values + RP
beat in the space, and prosthetics are authorable character. ⚠ **The heaviest
wave** — it touches the slot/embodiment substrate and is the **first to cut**
if lived-experience says *"I dunno about all this."* Splits cleanly to its own
build if scope balloons.

---

## Reachability wiring (the four silent-failure links)

- **verb** — C2 ships `set/splint/operate/surgery/warm/cool/dose`; C5 a wash
  step; L1 a cast path. Each is a `medical`/`magic`-category view + controller.
- **affordance** — the instrument (splint/suture/basin) confers its verb as a
  static on its class, **not** a row's `commandContributions`. The `mend`
  effect is a Spell/wand row.
- **data** — the clinic-cot tier, splint/suture rows, the sepsis seed, the
  medicine-as-resolution rows, the `mend` spell, prosthetic rows (L4). The
  `ConditionCatalogue` warms the conditions (confirmed live).
- **boot** — the catalogue self-warms; nothing new to warm.

---

## Lens pass (docs/design-lenses.md) — maxed

1. **Pedagogy** — `medicine` (ISCED 0913) improved by doing; **triage**; the
   **function-vs-structure diagnosis gap**; **health economics** priced by
   labour restored (L2); hand-washing / germ theory (C5). Multiple Disciplines
   exercised in one loop.
2. **Creative expression** — a clinic is **rows** (a second needs zero pack
   code); healer is a **vocation**; **prosthetics and scars are authored
   identity** (L3/L4); a battlefield aid tent composes from the same verbs.
3. **Immersion & RP** — the medic role **emerges from an honest sim** (you
   truly cannot work with a broken arm; a nurse truly shortens your downtime);
   scars, offline-heal, the re-injury temptation, the peg-legged veteran.
4. **Values** — **triage** (who gets the cot), the **free floor vs the paid
   rate**, **back-to-work-too-soon** (L3), **coin or self** (L1), and **living
   with what is gone** (L4). The space is dense with forced choices.
5. **Epochs** — **care buys rate** holds from a Roman valetudinarium to a New
   York ER; **magic is a payment method on the same axis as tech** (L1); von
   Thünen clinic geography (L2). Only the instruments and drugs change.

---

## Collisions (who already lives here)

- **The Terminus infirmary** — Aldis Verrow, the ward, `business.yaml`,
  `tariff.yaml` (treatment:12, repair:8), the cot, the dressing-cabinet. ⭐
  We **upgrade what exists** (C1 cot tier, C4 brain, L2 pricing); no second
  clinic is added.
- **Beds everywhere** — home bed (2.0), dorm bed (1.5), the cot (0.7). C1
  extends what `restQuality` drives; do not regress endurance recovery.
- **The glass-alley bandage** + `DressingMixin`/`Bandage` — the dressing
  `treat` already consumes; C5 gives its `dressingQuality` a producer.
- **The magic grid (MR !260)** — L1's `mend` is a new effect on the shipped
  verb×noun grid; the spell/wand shapes exist.
- **The slot/embodiment substrate** — L4 fills body slots with prosthetics
  (wearables); avulsion already models tissue loss.
- ⚠ **build-3 (`design/nutrition-fitness`, building now)** is live-editing
  `metabolism.md`, `reserve.md`, `advancement.md` and the vitals substrate —
  the **same kernel surface** C1/C3 touch, and scope-max widens the overlap.
  See Opens.

---

## Placement

Kernel-led, with content tails. The healing-rate read, the offline carve, and
the verb controllers are **kernel** (`platform/idea/cmd/medical/` + the
vitals/condition substrate). The verb **views** are platform content
(`medical` category; L1 rides `magic`). The **instruments, prosthetics and the
nurse vocation** are the **`trade-medicine`** pack. The **infirmary upgrade**
(cot tier, brain, labour-priced tariff) is **terminus** content. ⭐ A second
clinic needs **zero pack code** — the test passes.

---

## Opens

**Resolved 2026-09-18 (user: "I don't care — max the lenses"):**
- **Standalone slate**, not a harvest of physiology's 18-wave plan — keeps the
  buildable subject legible and cites physiology as the doctrine owner.
- **Hygiene (C5) is IN** — richest pedagogy + values.
- **All five lens extensions IN**, L4 flagged splittable.
- **✅ Sequence gate RESOLVED — build-3 (nutrition-fitness) MERGED 2026-09-23 (`81caf517f`); UNGATED** (was: sequence after build-3 merges) — scope-max widens the vitals/metabolism
  overlap with nutrition-fitness; two branches on one subsystem is the
  worktree hazard. build-3's session is not messageable now; the branch is the
  coordination point.

**Still for the requirements/plan phase:**
1. **The blood boundary** — confirm the build leaves `PLASMA_RESTORE_CEILING_FRAC`
   at 0.85 and adds no red-cell/transfusion path (blood-slate's premise).
2. **Where the healing-rate coefficient lives** — on the wound `tick` or as a
   per-read modifier in `reconcileConditions`. *(engineering, for `/plan`.)*
3. **L4 depth** — permanent amputation only, or also the temporary
   "un-set fracture becomes a limp" that physiology's `getSlotsCovering`
   coupling hints at. *(defer the deep end if the build is already large.)*

---

## The drive (seed — refined at requirements)

Physiology's proof, made concrete and lens-maxed:

1. Take a **fracture**. Confirm `treat` refuses it today; after C2, `set`/
   `splint` it.
2. Lie on the **infirmary cot**; confirm it now knits **faster than the floor**
   and beats a home bed (C1).
3. A **nurse (or Aldis) attends** you → the clock accelerates again (C4).
4. **Log off** dressed; return later → the wound has **progressed** (C3).
5. Take a **rupture** → `operate`/surgery resolves it (C2).
6. Get **poisoned** → `dose` clears the burden (C2).
7. Dirty hands → the wound goes **septic**; washed hands → it does not (C5).
8. A **caster** `mend`s you → *they* tire while *you* mend (L1).
9. Pay the **labour-indexed tariff** as a miner, then as a scribe — different
   bills; a destitute body still heals at the **free floor** (L2).
10. Go back to swinging a pick on a **half-knit bone** → it re-breaks (L3); a
    grievous wound leaves a **scar**, or a lost limb takes a **prosthetic** (L4).

---

## Cross-references

- Substrate & doctrine: [physiology-slate](./physiology-slate.md)
  (Parts 2, 4b, 5, 7f), [harm.md](../../subsystems/harm.md),
  [vitals.md](../../subsystems/vitals.md),
  [mortality.md](../../subsystems/mortality.md),
  [magic.md](../../subsystems/magic.md) (L1)
- Boundary owners: [medic-judgment-slate](./medic-judgment-slate.md),
  [health-vertical-slate](./health-vertical-slate.md),
  [pharma-slate](./pharma-slate.md),
  [blood-slate](./blood-slate.md),
  [disease-slate](./disease-slate.md)
- Consumed seams: [bathroom-slate](./bathroom-slate.md) (washing state),
  [metabolism-slate](../tails/metabolism-slate.md) (`restQuality`, protein→healing,
  antidote→treatment), [reserve.md](../../subsystems/reserve.md),
  [embodiment.md](../../subsystems/embodiment.md) (L4 prosthetic slots),
  [chronicle.md](../../subsystems/chronicle.md) (L3 scars)
- Live now: `ConditionCatalogue` (self-warm, boot manifest); the shipped
  medic loop (`treat`/`bind`/`dress`/`rinse`/`undress`/`assess`)
