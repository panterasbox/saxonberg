# Cosmetics slate — giving appearance an input, so its scarcity is grown rather than declared

> **Status: PARTIAL** — the dye chain (dyestuff × mordant × fibre,
> fastness, overdyeing as arithmetic, the dye-plant crops) shipped with
> textiles → [textiles.md](../../subsystems/textiles.md); cosmetics is
> now the second customer it was designed to be
> **Left:** the appearance-mark carrier on a body (the `Looks` cell — a
> cut, a dye job and a tattoo share it) · the personal-services vocation
> + graded cuts · hair dye as the dye chain's second customer · tattoos
> · what is changeable and what is not (eye colour never) · ⭐ **beauty**
> (§ below, 2026-09-18): the canon document, the body-impression
> augmenter (nutrition-and-fitness's `Character` body line is the attach
> point), the viewer-side regard delta — *no face, consequences yes*
> **Size:** a wave — rides lineage phase 1's appearance substrate; the
> chain it needed has shipped

**Captured 2026-08-25**, out of the [lineage](../builds/lineage-slate.md)
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

Related: [lineage-slate](../builds/lineage-slate.md) (the char-gen decision this
serves), [trade-roster-slate](../tails/trade-roster-slate.md) (the `textiles` /
`leatherwork` / `apothecary` gaps below),
[vocations.md](../../vocations.md) (the `barber / tailor` **GAP** row),
[content-packs-slate](../builds/content-packs-slate.md) (*a trade pack is
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

*Graduated 2026-09-21 → [textiles.md § The chain, as it ships](../../subsystems/textiles.md) (dye is a textiles input; cosmetics is a second customer of the same chain — no cosmetics industry, hair dye the dye chain's next customer behind lineage's appearance substrate, leather's behind a hide faucet).*

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

It looks like it contradicts [lineage-slate](../builds/lineage-slate.md) §
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
[lineage-slate](../builds/lineage-slate.md) § *describable, never selectable*.

---

# ⚠ What this slate does NOT decide

- **What any of it costs.** Dial. Layer 3 at most. The platform has no
  opinion.
- **Whether an operator monetizes cosmetics for real money.** Also not
  the platform's call — see
  [land-compute-and-license](../builds/land-compute-and-license.md) for where
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
   [lineage-slate](../builds/lineage-slate.md)'s `Looks` cell. Related to
   question 4.
8. **Can you grade a *self*-applied change above `poor`?** A competent
   `personal-services` practitioner cutting their own hair is a real
   case, and mirrors are a real constraint. *Leans: same derive, with
   the self-application as a penalty input rather than a hard cap —
   nothing here should be a rule where a modifier will do.*
9. *Resolved for the dye chain — the mill and dyehouse at Wharfside, the
   dye plants at Hinkley Hills, the tailor off Mayfield Row → textiles.md
   § Siting. Where the first personal-services content lands is open.*

---

## ⭐⭐ Beauty — the anti-gauge on the body, and one honest answer to charisma (2026-09-18)

Came out of the nutrition & fitness planning: *"surprised we've come all
this way and never really talked about beauty as an abstractable
concept."* The reason is in [lineage](../builds/lineage-slate.md): **appearance
is not modelled anywhere** — there was nothing to be beautiful. This
section decides the abstraction before the `Looks` cell lands, so the
cell is built for it. Two forks were put to the user and both are
closed: **consequences, yes; a face, no.**

### The doctrine already decides the shape

Three rules, none written about beauty, converge on one architecture:

- [measurement.md](../../measurement.md): *the engine measures · the
  subject values · the polity imposes.* "Beautiful" is a valuation. It
  is **never a field on a body.**
- [belief.md](../../subsystems/belief.md) § Regard: a per-viewer,
  per-subject attitude scalar living **on the viewer**, sealed — and its
  own doc says regard is *"the per-viewer leg D&D charisma unbundles
  into (regard + renown + susceptibility)."* Attired already renders an
  *impression* of a worn stack, seeded per (host, viewer).
- The species-allegory rule ([species-expansion](../tails/species-expansion-slate.md)):
  *model a group prejudice as viewer-side bias, never a species stat;
  the stereotype lives as projection, false-as-a-law.* A beauty standard
  is exactly that shape.

So beauty is three things, and none is new in kind:

> **FACTS on the body · a CANON in the culture · an IMPRESSION and a
> REGARD on the viewer.**

### What the body honestly has — and what it does not

The facts a canon may read are all measured things, and most of them
are shipping or slated: species and age stage · the **`Looks` cell**
(eye · hair · skin — inherited, and eye colour the one thing nobody can
dye) · the **build line** (flesh × lean — the mirror the nutrition
build holds up) · **condition** (emaciation, the harm model's scars, a
caustic burn) · **cleanliness** (soap) · **attire and its fit** (two
numbers and a stamp: a coat cut to a body you no longer have *reads*) ·
**grooming** (the barber; this slate's graded cuts).

⭐⭐ **There is no face.** No feature geometry, no symmetry, no
`comely:` on a species row, no `features` fact in the `Looks` cell.
Decided by measurement honesty: what the world calls attractiveness is
overwhelmingly health signals, grooming, dress, bearing and culture; the
residue — the face itself — is the part no honest engine can rank, and
a number for it would be a lie with a decimal point. **"Handsome" can
only ever be asserted by a viewer.** That makes beauty *contestable*,
which is the best property it could have: nobody can prove you
beautiful; they can only regard you. ⚠ The `Looks` cell stays three
inherited facts. A future ask for a fourth is this section's veto.

### The canon — content, and where the lesson lives

A **canon** is a document: *this culture reads these facts this way* —
a weighting of body facts into a described vocabulary in the culture's
register. Authored per culture, locality or species; **never a
universal table.** The same body is *"well-fed and fair"* in a famine
valley and *"soft"* in a mining camp; `lean: hard` is *"hard"* to the
stevedores and *"coarse"* to the counting-house. Rubens and the runway
are one mechanism with different weights — lens 5: the dynamics change,
the mechanism does not — and that is the teachable thing: **beauty
standards are local and historical, and the game can show two side by
side.**

The canon is also where an **allegory** lives without reproducing the
bigotry: a species' "ugliness" is a *canon's* verdict — projected,
false-as-a-law, refuted by whoever looks through a different one. The
essentialism trap is closed by construction, because there is no
species fact for it to be true of.

The **impression** is the anti-gauge, the same move as taste in the
cooking slate: a *described* reading in the canon's register, never a
score — a body-impression augmenter beside Attired's, in `look`, seeded
per (host, viewer). Mechanism: one `MarkupAugmenter` and a document
kind that already has siblings (a canon is content in the same sense
an archetype or a name bank is).

### ⭐⭐ Consequences — yes, and this is one honest answer to charisma

> **User:** *"charisma's always been the hardest thing to actually do
> right which is why a lot of games don't even try. I don't ever want to
> be cute about it — but where we do have actual measurable indicators
> that teach good choices, why not use them to increase immersion,
> roleplay and interactivity."*

A sim that describes beauty and pretends it moves nobody is a lie; the
GTA property wants regard to *follow* from looking. So the canon seeds a
**viewer-side regard delta on first impression** — a brain's, or a
player's default — and that is *pretty privilege* modelled as what it is:
a bias, on the viewer, visible in the mirror, contestable, never
confirmed as a law. The delta is one input to a regard that a hundred
other things also move; it is not a stat and it is not destiny.

⭐ **Why this is not cute:** every input to the impression is a
*measurable indicator that teaches a good choice* — the months clock,
soap, a coat that fits, a healed wound, a cut from a practitioner —
and the charisma games could never do right is exactly the sum of those
inputs read through a culture. D&D's number was a stand-in for a
mechanism it could not afford; the mechanism is: **facts the player
chose, a canon the world authored, a regard the viewer holds.** That is
charisma with the stat removed and the choices left in. The other legs
belief.md names — renown (what the polity has seen you do) and
susceptibility — stay their own subsystems; beauty is one leg.

**What it must never touch:**

- **Standing.** Regard is attitude; standing is the polity's mint, and
  the line *money cannot reach the mint* applies to looks by the same
  reasoning. Nothing in a canon is an input to renown, influence or any
  standing derivation. `lint`-shaped: a canon document has no path to
  the standing subsystems, by construction.
- **The body itself.** A canon reads facts; it writes nothing.
- **Self-image.** The mind slate's line stands — *body image stays
  deliberately unexpressed*; the mirror shows you to *others*, and what
  you feel about it is yours.

**What the polity may do about it** is the polity's: whether hiring, a
shop counter or a court may be moved by regard is a
[legal-code](../builds/legal-code-slate.md) question, and a law against it is
content — which is exactly where that argument belongs, and the values
lens's answer to "who says so."

### Who sells into it

Beauty is the *market* this slate's vocations already exist for: the
dye chain, the tailor's cut and fit, the barber's graded cut, scented
soap and glycerin ([rendering § 8](../builds/rendering-slate.md)), and — the
part the nutrition build adds — the body itself, which now has an input
(work, food, the gym) and a visible output. A canon is what makes those
purchases *mean* something to a viewer, and two canons are what make
the meaning local.

### Sequencing

1. The **`Looks` cell** (lineage, this slate) — the three facts.
2. The **body-impression augmenter** — can ship with or right after the
   nutrition & fitness build's mirror line (it reads the same bands).
3. The **canon document kind** + one authored canon per shipped culture
   (Terminus, Rejection, Heart's Delight read bodies differently
   already, in prose; the canon makes it mechanism).
4. The **regard delta** — the consequence — once brains have a first-
   impression hook (the `eats` brain and the attendant lease are the
   first two customers: a shopkeeper who is a little warmer to you).

### Open

- **Grooming as a fact vs. a grade.** Question 7 above (does a cut
  decay) is now also a beauty question: a grown-out cut is a fact the
  canon reads.
- **Does a canon read attire's *signal* channel** (station — the white
  coat) or only its fit and condition? Leans: yes, because dress is
  most of what beauty ever was, and textiles already computes the
  impression.
- **The pageant** — a judged contest is a *sport* (a match with rules
  and a winner, standing conferred by peers) and belongs to that build;
  noted so nobody builds "a beauty score" to run one.
