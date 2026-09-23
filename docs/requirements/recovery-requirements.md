# Recovery — requirements

**Kind:** feature
**Leads from:** kernel — first consumer is the **already-shipped injury
system and the Terminus infirmary**. A body already gets hurt (MR !260) and
the town already has a clinic with a physician, a counter and a tariff; this
build makes the clinic *do* something for the wound. Content tails ship in the
medicine trade (instruments, prosthetics, the nurse's work) and in Terminus
(the infirmary upgrade).

We can hurt a body but we cannot meaningfully mend one. Time heals everything
on its own, at the same flat rate whether you are lying on a clinic cot or
face-down in a ditch; the gravest wounds cannot be treated at all; and the
physician you can pay has no idea how to help you. This build delivers the
*"everything else"* in physiology's floor — **"time is the free heal;
everything else buys time"** — and, past the mechanics, makes recovery
something a body *carries*: a bill, a scar, a limp, a lost limb, a debt of
gratitude to whoever mended you. Seeded by
[recovery-slate](../slates/builds/recovery-slate.md).

⭐ **The one-line proof this build must make true:** *someone breaks their arm,
cannot work, gets it set, and works again — with a bill.* Today every clause of
that sentence fails.

---

## What already exists

Surveyed 2026-09-18 at the product level (three fan-out surveys over the code,
the content, and the design docs).

**The wound, and the first aid for it — already shipped.** A body carries real
wounds of nine kinds (cuts, punctures, breaks, bruises, tears, burns,
ruptures, frostbite, and the still-eating caustic), each affecting a body part
and the capacities it serves — you cannot grip with a wrecked hand, cannot walk
on a failing leg. A medic can already **look a body over** (`assess`), **dress
a bleed and pour fluid on a burn** (`treat`/`bind`/`dress`), **rinse a caustic**
(`rinse`), and **peel a dressing back off** (`undress`), and doing it well is
gated on a real **`medicine`** skill that improves by doing. Getting the
diagnosis right is graded; a wrong call quietly wastes the supply.

**The clinic — already a complete building.** Terminus has an **infirmary**: a
ward (also called the clinic/surgery), a physician named **Aldis Verrow**, a
business with opening hours and a ledger, a **price list** (treatment 12,
repair 8), and a counter where you `order treatment`. There is a **cot**, a
**cabinet of bandages**, and a **bandage** you can buy where people get cut.

**Recovery — but only the free floor.** Every wound simply fades with time at a
fixed rate; a dressing speeds a bleed's clot and that is the only accelerant.
Resting in a good bed rebuilds your *stamina* — but does nothing for a *wound*.

**What is missing, and is this build:**
- The clinic **heals no better than anywhere else** — its cot is, if anything,
  worse than a bed at home. Care changes nothing.
- **Grave wounds cannot be treated.** The game tells you a break "wants
  setting" or a rupture "wants surgery" — and then offers you no way to do it.
  You can suffer wounds you cannot recover from except by waiting.
- **The physician cannot actually treat you** — he keeps hours and takes your
  coin; the healing is faked around him.
- **A body carries nothing away.** No scar, no limp, no lost limb, no debt.
  Injury has no memory.
- Healing **stops while you are logged off**, even though resting does not.
- There is **no infection** — a wound cannot go bad, so cleanliness buys
  nothing and hand-washing means nothing.
- **Magic cannot mend**, though the substrate to let it (at a price) just
  shipped with the injury build.

> **Therefore what is genuinely new here is:** the *rate* of recovery becoming
> a thing care and setting change; a treatment for *every* wound the world can
> inflict; recovery that runs while you are away; a physician who really
> practises; wounds that leave a mark, a limp, or a missing limb; wounds that
> can fester on a deadline unless hands are clean; and magic as a way to buy a
> mend by spending yourself instead of your purse.

---

## Goals

The outcomes this build delivers, all observable by a player:

- **Care buys rate.** How fast a wound mends depends on where you lie and who
  tends you — bare ground, a bed, a clinic cot, a skilled carer present — never
  on a hidden dice roll. The clinic finally sells the one thing a clinic sells.
- **Every wound is treatable.** A break can be set, a rupture operated on, a
  burn cooled, a frostbite warmed, a poison dosed. No wound leaves a player
  permanently stuck with "it wants surgery" and no surgery to be had.
- **Recovery keeps running while you are away**, the way rest already does —
  splint a wound, log off, come back mended.
- **A visit to the infirmary actually shortens your recovery** — the physician
  practises, he does not merely bill.
- **A wound can go bad.** Left dirty or badly dressed it can fester on a
  deadline; washing hands before treating is the cheapest, most powerful thing
  a carer does. (No spreading disease — a wound of your own, on a clock.)
- **A healer's magic can mend a wound — at a cost to the healer.** Medicine
  spends money; magic spends *you*.
- **The bill fits the harm.** The same injury costs more to treat for someone
  whose livelihood it stops; a clinic by the mine is a different business from
  one downtown; and nobody dies of poverty — the destitute still heal at the
  free, unaided rate.
- **A body remembers.** A cleared grave wound leaves a **scar** that is part of
  who you are, not a penalty; going back to hard labour on a half-knit bone
  **re-breaks** it; and a wound grievous enough can cost you a **limb** for
  good — which a **prosthetic** can replace. Time heals everything except what
  is gone.

---

## Non-goals

Every one names where it lives instead.

- **Deciding the diagnosis for you, and grading the clinical judgment** →
  [medic-judgment-slate](../slates/builds/medic-judgment-slate.md). We keep the
  existing "read the body / a wrong call wastes the supply"; the graded
  reasoning surface is theirs.
- **Making medicines — the pharmacy, the apothecary, the credence-good
  economics, quality you can never assess** →
  [pharma-slate](../slates/builds/pharma-slate.md). We *apply* care and *dose*
  an antidote; we do not manufacture the drug.
- **Catching a disease from someone — contagion, epidemics, quarantine** →
  [disease-slate](../slates/builds/disease-slate.md). Our infection
  is your own wound going bad, needing no one else.
- **Transfusion, blood types, the blood bank; fully restoring lost blood by
  resting** → [blood-slate](../slates/builds/blood-slate.md). Rest brings blood
  part-way back on purpose, so transfusion keeps its reason to exist.
- **The public-health department, the College of Physic, the animal doctor** →
  [health-vertical-slate](../slates/builds/health-vertical-slate.md).
- **A full washing-and-bathhouse system** →
  [bathroom-slate](../slates/builds/bathroom-slate.md). We ship only the thin
  "are your hands / is the body clean enough to treat" state the medic reads.
- **Chronic illness, aging, the mind's long conditions** → physiology's stated
  boundary and [mind-slate](../slates/builds/mind-slate.md). Everything here is
  acute and resolves; the one thing that persists is *loss* (a scar, a limb).

---

## Placement

**Kernel-led**, with two content tails. The recovery mechanics (rate,
treatment for each wound, recovery-while-away, infection, the mend spell's
cost) are the engine's — they are how *every* body heals, not one town's
content. The **instruments** (splint, sutures, the wash basin), the
**prosthetics**, and **the nurse's line of work** ship in the **medicine
trade** pack. The **infirmary upgrade** (a cot worth lying on, a physician who
practises, a price that fits the harm) is **Terminus** content.

⭐ **A second clinic needs zero pack code** — it is rows: a room, a cot, a
price list, a healer. The test passes.

---

## Collisions

- **The Terminus infirmary** — Aldis Verrow, the ward, the business, the price
  list, the cot, the bandage cabinet. ⭐ We **upgrade what is there**; we do not
  add a second clinic beside it.
- **Beds everywhere** — the first home's dorm bed, a house bed, the clinic cot.
  Making a bed help you *heal* must not break the way a bed already restores
  *stamina*.
- **The bandage** sold in the glass alley, and the dressing the medic already
  consumes — infection gives the dressing's *cleanliness* something to mean.
- **The magic grid** shipped last week — the mend spell is a new working on it,
  and a wand can carry it like any other.
- **The body's wearable slots** — a prosthetic fills the place a lost limb
  leaves, the same way anything else is worn.
- ⚠ **build-3 is building nutrition & fitness right now**, on the same body —
  see the sequencing note in Cross-references.

---

## Surface decisions

The slate's open questions, closed at product level.

### Full scope in one requirements doc; the plan stages delivery
The build's product intent is the whole lens-maxed scope. Whether it *ships* in
one MR or stages (a wiring core first — care buys rate, every wound treatable,
recovery-while-away, the practising physician, infection — then the
identity/economic depth) is a delivery decision for the plan, not a change to
what the product needs. Reasoning: requirements state the outcome; the plan
sequences the work.

### Hygiene ships thin, and before disease
A wound going bad needs no one else and no contagion model, so it ships now;
hand-washing is its counter. The full washing system and any transmitted
disease wait for their own slates. Reasoning: it is the richest single lesson
in the space (the highest-value real-world intervention) and it stands alone.

### Rest brings blood only part-way back
A body low on blood recovers toward — but not all the way to — full by resting
and drinking. Full recovery is what a future transfusion build is *for*.
Reasoning: closing the gap here would delete that build's premise.

### Magic mends by spending the healer, and adds no new medical verb
A cure is cast like any working; its price is paid by the caster (their
vigour), and its effect is to buy the patient recovery rate. Reasoning:
physiology's rule — *"medicine spends money; magic spends you"* — keeps magic
one axis with technology rather than a free bypass of the whole vertical.

### Loss is permanent and answered by a prosthetic
A wound grievous enough costs a limb for good; a prosthetic fills the slot. We
do **not** model a temporary limp from an un-set break in this build (physiology
hints at it; it can come later). Reasoning: the values beat is "living with
what is gone," which needs permanence, not a fiddly reversible limp.

---

## Lens pass

1. **Pedagogy** — exercises the **medicine** skill (learned by doing), and
   teaches **triage** (who gets the cot), the **diagnosis gap** (you feel "I
   can't walk," an expert knows "the supply is cut, not the bone"), real
   **health economics** (care priced by the work it restores), and **germ
   theory** (clean hands change outcomes). Several Disciplines in one loop.
2. **Creative expression** — a clinic is rows anyone can author; a healer is a
   line of work; **scars and prosthetics are authored identity**; a battlefield
   aid tent or a back-room surgeon composes from the same acts with no new code.
3. **Immersion & roleplay** — the medic's importance **emerges from an honest
   sim**: you genuinely cannot work with a broken arm, and a nurse genuinely
   shortens your downtime. The scarred veteran, the peg leg, the debt to whoever
   set your bone — all real, none scripted.
4. **Values** — the space is dense with forced choices: **who gets treated
   first**, the **free floor vs the paid rate**, **back to work now or heal
   properly**, **spend coin or spend yourself** (magic), and **living with what
   is gone**.
5. **Epochs** — **care buys rate** holds from a Roman sick-bay to a modern ER;
   **magic is a payment method on the same axis as technology**; and the
   geography of clinics (near the patient, or near the healer) derives the same
   economic map a mill or a mine does. Only the instruments and the drugs
   change.

No gap headings — the scope fills all five.

---

## The drive

What a person does, in order, and what they should see. Run against the live
game at the end of the build, before the MR opens.

1. **Break a bone.** Confirm you cannot treat it today. Then **`set`/`splint`**
   it — the break is stabilised and begins to knit.
2. **Lie on the infirmary cot.** Watch the break mend **faster than it did on
   bare ground**, and faster than in a bed at home. The clinic is now worth the
   trip.
3. **Have the physician (or a nurse) tend you.** The recovery clock speeds up
   again with a skilled carer present.
4. **Log off** wounded and dressed; **come back later** — the wound has healed
   further while you were gone.
5. **Take a rupture** (untreatable today) → **`operate`/surgery** resolves it.
6. **Get poisoned** → **`dose`** with an antidote clears it.
7. **Be treated with dirty hands** → the wound **festers on a deadline**; be
   treated with **washed hands** → it does not. See/learn the difference.
8. **Be mended by a caster's magic** → *they* tire while *you* mend — the cost
   lands on the healer.
9. **Pay for the same injury as a miner, then as a scribe** → different bills;
   and a **penniless** body still heals, unaided, for free.
10. **Go back to swinging a pick on a half-knit bone** → it re-breaks. Survive a
    grievous wound → wear a **scar** thereafter; lose a limb → fit a
    **prosthetic**.

---

## Acceptance criteria

Observable from outside the code.

- A wound left on bare ground and the same wound on a clinic cot show
  **different recovery times a player can watch**; a skilled carer present
  shortens it further.
- **Every** wound the world can inflict has a treatment that resolves it — a
  player can never be left with a wound the game says needs a treatment it does
  not offer.
- A player can dress or splint a wound, **log off, and return to find it
  further along**.
- Being treated at the infirmary **measurably shortens recovery** versus not
  being treated — the physician's presence does real work.
- A wound treated with dirty hands can be seen to **fester** later; one treated
  cleanly does not — and the player can tell which.
- A caster who mends another **visibly pays for it** (their own vigour drops)
  while the patient improves.
- The **bill for the same injury differs** by whose work it interrupts, and a
  destitute player **still recovers** without paying.
- A survived grave wound leaves a **scar in how the character is described**;
  returning to hard work on a half-healed break **re-injures** it; a lost limb
  can be **replaced by a prosthetic** the character then wears.

---

## Cross-references

- **Seeding slate:** [recovery-slate](../slates/builds/recovery-slate.md)
- **Substrate & doctrine:** [physiology-slate](../slates/builds/physiology-slate.md)
  (the care economy, the recovery rules), [harm.md](../subsystems/harm.md),
  [vitals.md](../subsystems/vitals.md), [mortality.md](../subsystems/mortality.md),
  [magic.md](../subsystems/magic.md) (the mend working)
- **Boundary owners (non-goals):**
  [medic-judgment-slate](../slates/builds/medic-judgment-slate.md),
  [pharma-slate](../slates/builds/pharma-slate.md),
  [disease-slate](../slates/builds/disease-slate.md),
  [blood-slate](../slates/builds/blood-slate.md),
  [health-vertical-slate](../slates/builds/health-vertical-slate.md),
  [bathroom-slate](../slates/builds/bathroom-slate.md)
- ⚠ **Sequencing:** build-3 is building **nutrition & fitness**
  (`design/nutrition-fitness`) on the same body substrate. This build should
  **begin after that one merges** — ✅ build-3 **MERGED 2026-09-23**, so this is now **UNGATED**; the overlap is in the base, or carve an explicitly non-overlapping
  surface first — two branches editing one subsystem is the worktree hazard.
