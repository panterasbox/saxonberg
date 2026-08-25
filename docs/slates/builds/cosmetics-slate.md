# Cosmetics slate — giving appearance an input, so its scarcity is grown rather than declared

**Captured 2026-08-25**, out of the [lineage](./lineage-slate.md)
phase-1 card discussion. Char-gen settled that **appearance is inherited
only** — no editor at creation — which relocates all appearance change
into the world as a purchase:

> **User: "inherited only. We have a whole cosmetics industry for
> modifying your appearance… if people want hair dye let's give them
> hair dye."**

And the framing that this slate exists to serve:

> ⭐⭐⭐ **User: "of course it's an economy — it's just one of our own
> design, we completely control scarcity. And we're a platform, this
> sort of thing is a **dial**. Game cosmetics as an industry is probably
> into the hundreds of billions of dollars; of course someone will see
> cosmetics in Saxonberg and see dollar signs. **The platform has no
> opinion on this.**"**

> **Status: design conversation, captured. Not requirements.**

Related: [lineage-slate](./lineage-slate.md) (the char-gen decision this
serves), [trade-roster-slate](./trade-roster-slate.md) (the `textiles` /
`leatherwork` / `apothecary` gaps below),
[vocations.md](../../vocations.md) (the `barber / tailor` **GAP** row),
[content-packs-slate](./content-packs-slate.md) (*a trade pack is
complete when its output has a consumer*),
[crafting.md](../../subsystems/crafting.md),
[bulk.md](../../subsystems/bulk.md),
[husbandry.md](../../subsystems/husbandry.md),
[smallholding.md](../../subsystems/smallholding.md),
[materials-response.md](../../subsystems/materials-response.md),
[belief.md](../../subsystems/belief.md).

---

# ⭐ The problem this exists to solve

**Appearance change has no natural input.** Nearly every good in
Saxonberg gets its scarcity from a chain — ore → metal → tools, crop →
grain → bread. Hair dye has nothing upstream, so left alone its price is
**a number somebody typed**, which is the one thing this economy usually
refuses.

> **The fork: an authored price, or a real input.** This slate takes the
> second, because the input turns out to be cheap, already-substrated,
> and shared with a trade the roster already needs.

⚠ **This does not decide what cosmetics costs.** Price and scarcity stay
a dial — the point is to make the dial *sit on a supply curve* instead of
on a constant.

---

# ⭐⭐⭐ The load-bearing find: dye is not a cosmetics input

It is a **textiles** input, and cosmetics is a *second* customer of the
same chain.

The [trade roster](./trade-roster-slate.md) already needs `textiles` and
`leatherwork` (both in its gap report), and `tailor` is a rostered trade
in Terminus. Cloth is dyed. Leather is dyed. Hair is dyed. **One chain,
four demands.**

> **A trade pack is complete when its output has a consumer.** This one
> has four before it ships, which is the strongest form of that test the
> content-packs slate offers.

⭐ So cosmetics does **not** want its own industry. It wants to be a
customer of the dyer's, and the register's `barber / tailor` GAP is
downstream of a chain nobody has built rather than a vocation waiting on
demand.

---

# The chain

```
grow  →  extract  →  mordant  →  apply
```

| step | Discipline | status |
|---|---|---|
| **grow** the dye plant | `horticulture` / `agriculture` | ✅ both ship |
| **extract** the pigment | `apothecary` *(or a dedicated `dyeing`)* | ⭐ gap — already on the roster's list |
| **mordant** — decide what colour it becomes | knowledge, same Discipline | ⭐ gap |
| **apply** to hair / skin | `personal-services` | ✅ ships |
| **apply** to cloth / leather | `textiles` / `leatherwork` | ⭐ gaps — already on the roster's list |

**Every gap here is a Discipline the roster already demanded**, which is
the test that says this is a real chain and not an invented one.

## Substrate it rides, all shipped

- **Pigment is a liquid** ⇒ `Material` + `Bulkable`
  ([bulk.md](../../subsystems/bulk.md)). The `obj/material/bulk/*`
  namespace already holds `water`, `coffee`, `salt-water`, `compost`;
  a dye bath is the same shape.
- **Dye plants are crops** ⇒ `GrowingMixin` / `CultivableMixin`
  ([husbandry.md](../../subsystems/husbandry.md),
  [smallholding.md](../../subsystems/smallholding.md)). ⚠ The crop
  roster is currently **one row** (`carrot`), so these are new content —
  but new content on finished machinery.
- **The dyeing act is a craft** ⇒ Recipe docs + craft-resolve
  ([crafting.md](../../subsystems/crafting.md)).
- **Selling it** ⇒ `PricedOffer` / Stock / consignment
  ([retail.md](../../subsystems/retail.md)).

---

# ⭐⭐⭐ The mordant — why this is a trade and not a vending machine

The detail that carries the whole design:

> **The same plant yields different colours depending on what you mordant
> with.** Alum, iron, tannin — one dyestuff, several outcomes.

That is real, it is teachable, and it means:

- **The colour space is DERIVED, not authored.** You do not pick from a
  palette; you get `f(dyestuff, mordant, fibre)`. Exactly the move
  [materials](../../subsystems/materials-response.md) already makes —
  *materials are a closed set; blends derive* — and the same shape as
  `response = f(mechanism, material, construction)`.
- **There is knowledge to have**, so the practitioner is not a kiosk.
  Knowing that iron saddens a colour and alum brightens it is a fact
  about the world you can learn, be taught, or get wrong.
- ⭐ **Scarcity becomes structural.** A colour is rare because its
  dyestuff is hard to grow or its mordant is hard to get — not because a
  designer priced it high. That is the whole point of the slate.

⭐ It is also the invented-but-honest register
[arcane-science.md](../../arcane-science.md) sets for magic, applied to
something entirely mundane: **one small set of real rules, consistently
applied, generating a large outcome space.**

---

# ⭐⭐⭐ The act is GRADED and MARKED — and the grading already ships

> **User: "for cutting hair we actually need like a grading system,
> right? So if you cut your own hair that's fine, but it'll be observable
> that it was not done by a professional."**

**No new system is needed**, and what
[crafting.md](../../subsystems/crafting.md) already ships is better than
a quality tier:

| shipped | what it gives |
|---|---|
| **`Grade`** | an ordinal band — `poor · fair · fine · exceptional · masterful` — and **never a number** |
| **`CraftedMixin`** | the **maker's mark**: `{maker, recipe, craftedAt}`, stamped once at craft-resolve |
| **`renderVerdict()`** | a DF-style verdict — band-word headline + grade-keyed prose + **the maker's name**, never a number |

⭐⭐ So it is observable not merely that a cut was **amateur**, but **who
did it**. *Who cuts your hair* becomes a legible social fact, which is a
far better object than a quality tier alone — and the tattoo case makes
the point obvious: signed work is real, and *who did your ink* is
something people actually ask.

⭐ `renderVerdict()` being **prose, never a number** is exactly what
appearance needs. The grade is a **description**, not a stat.

## What is actually new: the carrier, not the grade

A haircut is not an item, so `CraftedMixin` cannot ride it directly —
*"Bob, crafted by Sara"* is nonsense. The mark belongs on **the
appearance field itself**: a hair slot carrying its own grade and maker.

⭐ Which generalises for free. A **cut**, a **dye job** and a **tattoo**
are all *applied appearance changes*, and all three want the same three
things: a band, a maker, a verdict. **One small carrier**, reusing
`Grade` and the verdict render — not a second grading system.

**Self-service grades badly with no special case:** `personal-services`
untrained plus an improvised tool feeds the same derive that yields a
`poor` blade from a bad smith. Nobody is forbidden from cutting their own
hair; it simply shows.

## ⭐⭐⭐ Why this does not collide with *never selectable*

It looks like it contradicts [lineage-slate](./lineage-slate.md) §
*describable, never selectable*. It does not, and the distinction is
worth stating outright because someone will otherwise read that rule as
banning socially-legible grooming too:

> ⭐⭐⭐ **The rule protects what you did not CHOOSE, not what you
> PRESENT.**

Eye colour must never be actionable because **you were born into it** —
making it selectable is sorting people into camps. **A bad haircut is a
choice**, and the world reacting to your choices is the entire point of a
social simulation.

So grooming can be socially legible while eye colour cannot. Which is
also simply true.

⚠ **Keep it descriptive.** No regard input, no NPC reaction keyed on
grade, no derived quantity. Other players read the verdict and judge or
do not — that is the whole mechanic, and it is the *platform records, it
rarely forbids* register
([measurement.md](../../measurement.md)).

## ⭐ What grading gives the vocations test

Grading is precisely what breaks the objection that killed
`homemaker` — ***universal demand meets universal self-service***. Here
self-service **is** available and **visibly worse**, so demand survives
on its own.

⚠ That is the *evidence* [vocations.md](../../vocations.md)'s demand test
would examine. It is **not** a conclusion that `barber` ships — see §
*what this slate does not decide*.

---

# What is changeable, and what is not

⭐ **Proposal, not settled:** hair and skin presentation are changeable;
**eye colour is not.**

| axis | changeable | why |
|---|---|---|
| hair colour | ✅ | dye |
| skin — tattoo, paint, scarification | ✅ | pigment + a different application |
| hair style | ✅ | pure labour + judgment; no input at all |
| **eye colour** | ❌ | nothing in the chain reaches it |

Two payoffs:

- The `Looks` cell on the lineage card keeps **one durable inherited
  fact**, without needing blood/genotype machinery to supply it.
- ⭐⭐ **"You have your mother's eyes" starts working as recognition** —
  precisely *because* it is the one thing nobody can dye. An earlier
  draft of the lineage discussion dismissed that line as the
  fantasy-novel version; it is the opposite. In a world where everything
  else is presentation, the unchangeable axis is the only one that
  carries evidence.

⚠ Which is a real consequence to weigh, not free: it makes eye colour
the one appearance axis that could be *acted on*. It must still never be
**selectable** — no MQL predicate, never a `GroupProvider` — per
[lineage-slate](./lineage-slate.md) § *describable, never selectable*.

---

# ⚠ What this slate does NOT decide

- **What any of it costs.** Dial. Layer 3 at most. The platform has no
  opinion.
- **Whether an operator monetizes cosmetics for real money.** Also not
  the platform's call — see
  [land-compute-and-license](./land-compute-and-license.md) for where
  that question actually lives.
- **Whether `barber` is promoted from GAP to a vocation.** That is
  [vocations.md](../../vocations.md)'s demand test to run *after* the
  chain exists, not a conclusion to assume from char-gen.
- **Any appearance mechanic.** Nothing here gives an appearance a
  capability, a bonus, or a gate. Appearance remains
  **describable and never selectable**.

---

# Open questions

1. **Is `apothecary` the extraction Discipline, or does dyeing get its
   own?** `apothecary` is already a demanded gap and the chemistry
   overlaps; a dedicated `dyeing` is cleaner but adds a row nobody else
   needs. *Leans `apothecary` with a `specializes` link, the pattern
   `midwifery: specializes medicine` already uses.*
2. **How many dyestuffs and mordants?** The outcome space is
   multiplicative, so a handful of each is a large palette. ⚠ The risk
   is the opposite of scarcity — three dyestuffs × four mordants is
   twelve colours before anyone plants anything unusual.
3. **Does fibre participate?** Real dyeing behaves differently on wool
   vs linen, which would make `f(dyestuff, mordant, fibre)` genuinely
   three-dimensional — and make hair a *fibre*, which is either elegant
   or a joke that wears out.
4. **Does a colour fade?** A dye job with a duration is a repeat
   customer and a real reason for the trade to persist; a permanent one
   is a single sale. ⚠ It also decides whether `Looks` drifts back
   toward the inherited value, which touches the lineage card.
5. **Tattoos: same chain or a different one?** Ink is pigment, but
   permanence, skill and the social meaning are all different. Possibly
   its own thing riding the same pigment supply.
6. **Does the appearance-mark carrier reuse `CraftedMixin` or mirror
   it?** A hair slot needs `{grade, maker}` and a verdict render, which
   is three-quarters of `CraftedMixin` minus `recipe` and minus riding a
   Stuff. Compose it, or a thinner sibling? ⚠ The
   [collections](../../subsystems/collections.md) precedent says pick
   the shape that fits the storage, not the one that shares a name.
7. **Does a grade decay?** A `masterful` cut grows out. If grade drifts
   downward with time it is a repeat customer *and* a reason grooming is
   ongoing rather than a one-time purchase — but it also means your
   appearance changes without you acting, which touches
   [lineage-slate](./lineage-slate.md)'s `Looks` cell. Related to
   question 4.
8. **Can you grade a *self*-applied change above `poor`?** A competent
   `personal-services` practitioner cutting their own hair is a real
   case, and mirrors are a real constraint. *Leans: same derive, with
   the self-application as a penalty input rather than a hard cap —
   nothing here should be a rule where a modifier will do.*
9. **Where does the first content land?** Terminus has a `tailor`
   rostered and 52 built rooms; the dye plants want
   [smallholding](../../subsystems/smallholding.md) ground, which is
   Hinkley Hills. That is a two-locality chain, which is the honest
   shape but not the cheapest first pack.
