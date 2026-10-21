# Decor slate — what a room is worth looking at, and who says so

> **Status: UNBUILT** — and one half already ships, deliberately inert:
> `Archetype.satisfies(space: Container | Container[])` answers per
> capability slot *satisfied, and by what*, over contents **and** fixtures,
> across one or more spaces — and `holding.md` pins that **nothing consumes
> it**: *"An unrecognized room provisions, persists and functions
> identically; no multiplier, gate or price reads one. A source walk asserts
> it."* (D15: *an archetype is a satisfiable checklist, never a room class.*)
> **Left:** ⛔ **not** a decor score — the visitor's CHOICE as the read ·
> the high-grade branch of the shipped material chains (dressed · glazed ·
> dyed · carved) · which existing decisions consult it (custom, rent, a
> hiring) · `satisfies`' first consumer, and whether D15 survives it
> **Size:** **a build** (it touches retail, attendant, employment and four
> material chains), sequenced **third** — see § Sequencing

**Written 2026-09-24**, in the same conversation as
[structure-slate](structure-slate.md), from *"we don't have a morale score
but maybe let's talk about decor and what place it has in the world"*
(ONI and Rimworld named as the reference).

**Sits on:** [holding.md](../../subsystems/holding.md) § *Archetype
satisfaction* · [furnishing.md](../../subsystems/furnishing.md) (`place`,
the room overlay) · [boundary.md](../../subsystems/boundary.md)
(`Adornable` / `Adornment` — `getFixtures()`, the attachment surface) ·
[textiles.md](../../subsystems/textiles.md) (the dye stack) ·
[measurement.md](../../measurement.md) (the no-gauge reading rules) ·
[renown.md](../../subsystems/renown.md) · [retail.md](../../subsystems/retail.md)

---

## ⛔ Principle — the thing we are NOT building

> **ONI and Rimworld decor is a morale gauge. This project forbids that.**

*Immersion & roleplay* is *"RP **emerges** from an honest sim — the GTA
property; **never a gauge**"*, and `measurement.md` ships the no-gauge
reading rules and the Mara/Aletheia property (*the feed hides the
measurement; the mirror shows you*). A decor score feeding a mood number is
precisely what those exist to refuse.

So strip the gauge and ask what decor actually **does** in those games:

1. it **sinks surplus** into non-functional goods, and
2. it gives the player an **expression surface**.

Saxonberg already has (2) — `place`, fixtures, `Adornable`. What it lacks is
a **reason to care**, and the honest source of a reason here is **other
people**, because renown, regard and standing already ship and are
**conferred**, never computed by the thing being judged.

## ⭐⭐ Decided in principle: the visitor expresses it, the owner never reads it

A fine room does not raise your mood. It changes what visitors **choose** —
an inn's custom, a shop's trade, what a tenant will pay, whether somebody
takes the job. **The owner never reads a number; a customer says *"nice
place"* or goes somewhere else.** That is the GTA property and the
Mara/Aletheia property in one sentence, and it answers lens 4's *who confers
standing* correctly.

⭐ And `Archetype.satisfies` is already the read that would answer it —
per-slot, *by what*, over contents **and** fixtures, across a set of spaces.
⚠ Which puts D15 in play: *nothing consumes a satisfaction* is asserted by a
source walk today. This slate is the first candidate consumer, so it must
either earn the exception or find a second read. **Open.**

## ⭐ The supply chain: decor is not a chain, it is a GRADE

The precedent is already doctrine — *dye is a **textiles** chain that
cosmetics is a **second customer** of*. Decor is the same move at the
building scale: **the high-grade branch of the material chains that already
ship.**

| plain | worked one step further | whose chain |
|---|---|---|
| rubble | **dressed** ashlar | quarrying (`Block` → `split` → piece) |
| plain pot | **glazed** | quarrying's kiln + the `fire` verb |
| undyed cloth | a **dyed** hanging | textiles' subtractive dye stack |
| sawn timber | a **carved** panel | forestry → sawing → carpentry (a GAP) |

⭐ Same quarry, same kiln, same loom — one more worked step and a
craftsman's time. So decor needs **no new RGO at all**, it gives
`GradedMixin` a consumer above the level of a single tool, and it prices the
whole ladder from *a wall* to *a wall somebody meant*.

⚠ It also gives **carpenter · joiner** (a registered GAP) a second customer
beside furniture, and **monument mason** (also a GAP, at the necropolis) its
non-funerary half.

---

## Sequencing — third, and independently landable

⭐ **It does not need the structure tier.** `satisfies` takes
`Container | Container[]`, so decor judges **rooms**, and rooms ship. There
is no dependency on [structure-slate](structure-slate.md) in either
direction.

But it is sequenced **third** anyway, on two grounds:

1. **Its consumer set is thin today** — Dave's Bar, the lounge, a few shops.
   Decor's value depends on there being places people visit *and choose
   between*.
2. **Its material inputs are most naturally authored beside construction's
   bill** — same materials, one grade up. Minting dressed-stone and
   glazed-pot rows with only a decorative consumer is the thinner version of
   the same work.

## Opens

1. ⭐⭐ **Which existing decisions consult it?** The honest candidates are
   retail custom, an attendant queue's choice, rent, and a hiring. Each is a
   separate integration and probably not all of them. **The one to answer
   first**, because it decides the size.
2. ⚠ **Does D15 survive?** *Nothing consumes a satisfaction* is asserted by a
   source walk. Either this slate lifts it with a reason, or decor gets its
   own read and `satisfies` stays inert.
3. Is "worked one step further" a **material** (`dressed-granite`) or a
   **grade on the good** (`GradedMixin` on a block)? W4's lesson says let the
   material carry the outcome — but a grade is already there.
4. Exterior vs interior — does a frontage read differently from a parlour?
   Cheap to say no; the settlement model's *a city is where the general store
   fragments* argues it eventually matters.
5. ⚠ **Nothing here may write a player's trait** (narration slate's rule).
   A visitor's *choice* is a behaviour, not a disposition event.
