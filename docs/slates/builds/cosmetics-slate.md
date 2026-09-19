# Cosmetics slate — giving appearance an input, so its scarcity is grown rather than declared

> **Status: PARTIAL** — the dye chain (dyestuff × mordant × fibre,
> fastness, overdyeing as arithmetic, the dye-plant crops) shipped with
> textiles → [textiles.md](../../subsystems/textiles.md); cosmetics is
> now the second customer it was designed to be
> **Left:** the appearance-mark carrier on a body (the `Looks` cell — a
> cut, a dye job and a tattoo share it) · the personal-services vocation
> + graded cuts · hair dye as the dye chain's second customer · tattoos
> · what is changeable and what is not (eye colour never)
> **Size:** a wave — rides lineage phase 1's appearance substrate; the
> chain it needed has shipped

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

Related: [lineage-slate](./lineage-slate.md) (the char-gen decision this
serves), [trade-roster-slate](../tails/trade-roster-slate.md) (the `textiles` /
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

The [trade roster](../tails/trade-roster-slate.md) already needs `textiles` and
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

*The cloth half shipped → [textiles.md § The chain, as it
ships](../../subsystems/textiles.md): `dyeing` is its own Discipline
(not `apothecary`), the dye plants are `trade-farming` crops, the bath
is a `DyeVat` / `WoadVat`, `mordant` then `dye` are the verbs. The
**apply to hair / skin** step is the carrier below.*

---

# ⭐⭐⭐ The mordant — why this is a trade and not a vending machine

*Shipped — the colour is `f(dyestuff, mordant, fibre)` and never a
palette; four independent entries per dye because the metal ion is part
of the chromophore → textiles.md § Dye, wash and fade.*

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

1. *Resolved — `dyeing` got its own Discipline
   (`trade-dyeing/content/trade/dyeing/idea/Discipline/dyeing.yaml`);
   there is no `apothecary` Discipline.*
2. *Resolved for cloth — two mordant dyes × four mordants plus woad as
   the vat-dye exception → textiles.md § Dye, wash and fade. Hair rides
   the same dyestuffs.*
3. *Resolved — yes: cellulose needs a tannin pre-mordant, protein takes
   alum directly → textiles.md § Dye, wash and fade. Hair is keratin,
   i.e. wool's chemistry; whether the carrier models it as a fibre is
   its call.*
4. *Resolved for cloth — colour fades per wash in proportion to
   `1 − fastness` → textiles.md § Dye, wash and fade. Whether `Looks`
   drifts back toward the inherited value is the carrier's (see 7).*
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
9. *Resolved for the dye chain — the mill and dyehouse at Wharfside, the
   dye plants at Hinkley Hills, the tailor off Mayfield Row → textiles.md
   § Siting. Where the first personal-services content lands is open.*
