# Lineage slate (working doc)

> **Status: design proposed, nothing built.** A restructure of char-gen
> around a single idea: **you choose a family, not a stat sheet.**
> Everything else — species, aspiration, starting capital, body
> configuration — becomes either a *filter* over that choice or an
> optional refinement behind it.
>
> **Decided in this pass:** no hybrid species (option A below); the
> gallery offers same-species parents; the point budget is spendable on
> body/faculty, banked as starting capital, or spent on rerolls.
>
> Companion: [blood-slate](./blood-slate.md), which consumes the
> endowment category this doc defines.

---

## The gap

Char-gen today collects five **declared** fields — `species`, `sex`,
`name`, `pronouns`, `aspiration` — and nothing else. There is no roll
anywhere in character creation; `husbandry.md` notes even its seed lots
carry *"no inherited variation."*

Two problems with that:

1. **It shows off none of the depth.** A player meets the platform's
   systems at hour twenty, not minute one. The one field that *sounds*
   like depth — `aspiration` — produces exactly two strings
   (`claimSeeds` and `bioSeed`) and touches nothing else.
2. **It produces a character with no world attached.** You arrive
   knowing nobody, from nowhere, having done nothing. Every relationship,
   every competence, every fact about your past has to be built from
   zero — which is also the [antecedents](./antecedents-slate.md)
   problem, arriving from the player side.

---

## ⭐ The four kinds of value

The platform has three and is missing one:

| kind | who sets it | example |
|---|---|---|
| **derived** | nobody — computed from a ledger, never stored | competence, traits, renown |
| **declared** | the player, deliberately | species, name, pronouns |
| ⭐ **endowed** | a process the player does not control | ← **the gap.** blood type |
| **state** | play | wounds, money, location |

**Endowed** is what "genotype" means, and it needs a rule to keep it from
being arbitrary:

> ⭐⭐ **Endow what creates a relationship. Never endow what creates a
> ranking.**

Blood type passes cleanly — pure relationship, no scale, nobody's is
better. A rolled `+2 strength` is the same *category* and fails; an
unchosen rank is the worst of both worlds. The rule also pre-filters
future endowments: metabolic quirks, allergies, and handedness pass
(they cost without ranking); sensory acuity and raw strength do not.

**Genotype is stored; phenotype derives** — the house pattern one level
down, identical in shape to `transcripts → Competence`. See
[blood-slate](./blood-slate.md) § *Blood type* for the worked case.

---

## The gallery

**One screen, one choice: pick a family.** That single act yields
species, genotype, a home locality, an antecedents budget shaped by the
household's trade, chronicle prologue claims, a starting kit, and **two
live relationships**.

⭐ **The payoff that no stat allocation can match: char-gen produces
relationships instead of numbers.** You arrive in the world already known
by two people who have names and an address. That also chips at the
authored-acquaintance gap in
[antecedents-slate](./antecedents-slate.md) — a new character starts with
real edges in the belief store instead of introducing themselves to
everyone.

### What a card has to carry

Enough to be a person, not a stat bundle:

- name, species, **trade**, **place**
- two or three pronounced traits — `TraitApi.pronouncedFor` already
  returns exactly this shape
- a sketch of what they know (their Disciplines)
- their standing, where it is legible ("well-regarded in the dockside")
- ⭐ **a hook** — a debt, a feud, a shop with their name on it

The hook is what makes the gallery *characters* rather than sheets, and
it is what a player will actually choose on.

⚠ **The pair must read as a plausible household.** Two parents whose
localities and trades make no sense together break immersion faster than
any stat ever could. This is the real procgen constraint, and it is
harder than generating either parent alone.

### Controls, so it is a search and not a slot machine

- **Lock one, reroll the other.** Keep the mother, spin fathers. Halves
  the space and turns rerolling into a search.
- **Filters** on the legible axes — locality, trade, species.
- ⭐ **Aspiration survives as the gallery's query.** You say *"I mean to
  be a medic"* and the gallery biases toward households where that is
  plausible. It stops being a meaningless field and becomes the search
  term — which is what it was always trying to be. The declaration
  survives; only the dead-end field retires.

### Reroll is priced, not capped

You cannot charge money to a character who does not exist yet — so
charge it to the **starting-capital allotment**. Each reroll spends from
the same pool you would otherwise bank.

⭐ No arbitrary cap, no scarcity theater: reroll twenty times and you
arrive broke but exactly the person you wanted. Being picky costs, the
way it does everywhere else.

---

## ⭐ One budget, three sinks

Everyone gets the same budget. It goes to **body/faculty**, **starting
capital**, or **patience** (rerolls) — all three priced against each
other, none of them a designer's balance number.

### Body: composition, not magnitude

A single mass slider is a stat. **Fat / muscle / bone at one mass** is a
body:

- **fat** — thermal insulation, energy reserve, famine tolerance
- **muscle** — force, and a markedly higher metabolic burn
- **bone** — fracture resistance, and dead weight

Same total, completely different creature, and no ranking between them.
Incomparability in the species slate's sense, applied *within* a
character.

### ⭐⭐ The world already charges

The reason this does not need invented drawbacks:

| choice | who charges for it |
|---|---|
| more mass | [metabolism](../../subsystems/metabolism.md) — more food, a real economic cost |
| more mass | [thermal](../../subsystems/thermal.md) — Newton cooling; better in cold, worse in heat |
| more mass | [encumbrance](../../subsystems/encumbrance.md), [respiration](../../subsystems/respiration.md) |
| more mass | [vitals](../../subsystems/vitals.md) — more `bloodVolume`, so **you survive a bleed longer** |
| stature | ranged bands, tight spaces, concealment, heat dissipation |

None of those are balance numbers. They are consequences, and players can
smell the difference.

⭐ **And the optimum has to depend on the life.** A high-mass, high-fat
body is excellent in the cold Delve and miserable in a hot biome. A wiki
can tell you the best body *for a given life*; it cannot tell you what
your life will be. **The allocation is a claim about how you intend to
live** — and you can be wrong.

⭐ **The body is public.** Perception and the belief store already
describe characters to each other, so the allocation is a *social fact*,
not a private optimization. People minmax numbers freely; they do not
minmax their appearance in front of others nearly as freely.

**The structural cap:** you can buy a body; you can never buy a
competence. Everything that decides most encounters — competence bands,
gambits, tools, positioning — is earned from evidence and unpurchasable.
Even a perfectly solved body is a modest edge on a substrate, which is
what makes it safe to be generous with the budget.

### Faculty: the mental category already exists

`Species.facultyProfile` is `{depth, serenity, composure}` — an
anatomical casting faculty, species-declared, three bands; mana is a
`Reserve` whose capacity derives from `depth`. So the question is not
"invent mental attributes," it is **does the player move within the
species range**, exactly as with body composition.

⚠ **Faculty must stay capacity, never access.** Per-spell access is a
band gate at cast time on both grid axes — *competence IS access*. If a
configured `depth` ever gated which spells you can cast, you would have
bought progression.

⚠ **Mental capacity is closer to a pure ranking than physical capacity
is**, because nothing obviously charges for it. The clean answer is that
it **shares the one budget with the body** — arcane capacity costs you
tissue — so incomparability lives at the budget level and no drawback
needs inventing.

> Worth checking: `composure` is both a faculty band *and* a trait axis
> (Calm/Wrathful). If that is a deliberate coupling — derived temperament
> modulating innate faculty — it is lovely. If it is a name collision it
> will confuse authors.

### ⭐ Capital: the counter-cyclical pin

Unspent budget banks as **starting capital**. Starting cash already
exists, so this changes an existing faucet's variance, not its category.

⚠ If the conversion floats *with* the money supply you get a feedback
loop: money abundant → points buy more money → more money enters → worse.

⭐ **Invert it and it becomes an automatic stabilizer.** High supply →
points buy *less* cash → new characters take body instead. Scarce money →
points buy more → new characters arrive capitalized. The char-gen faucet
becomes counter-cyclical, run by nothing but the conversion table.
`bank_supply` is already tracked, so the input exists.

It is also the most teachable thing in char-gen: the player who notices
starting cash was better last month has discovered monetary policy
without being taught it.

⚠ Cap per account, and give guests nothing — otherwise registration is a
mint.

---

## Species — decision A: no hybrids

Sixteen `Homo` species ship, of which two — `semieldarinus` (half-elf)
and `semiorcus` (half-orc) — are **hybrids modeled as species rows.**

**The taxonomy is not the problem.** Congeneric hybridization is real:
*H. sapiens* × *H. neanderthalensis* produced fertile offspring, and
non-African humans carry roughly 1–2% Neanderthal ancestry today.

⚠ **A hybrid is not a species** is the problem. A binomial asserts a
population that **breeds true**, which is the one thing a hybrid
definitionally isn't. Symptoms: half-elf × half-elf yields another
`semieldarinus`; half-elf × elf has no row and never can; and sixteen
species is **120 pairs, of which two are authored.**

### Why blending was rejected

The tempting fix — derive hybrids from parent pairs, the way materials
derive blends — **breaks against the direction the species slate is
going.** `innateMixins: ["CasterMixin"]` is already a *capability list*,
not a number: union it and every hybrid strictly dominates, intersect it
and every hybrid is strictly worse. Specials, vocation affinities, and
"where you can go" differences are discrete by nature. **Half a gill is
nothing.**

Building blend machinery now would also pressure species to *stay*
numeric — letting the implementation constrain the design.

### The decision

**A. No hybrids.** Species stay discrete and get maximally distinct. The
gallery offers **same-species parents**. Mixed heritage, if it ever
returns, is narrative and social — never a blended stat line.

Consequences:

- ⭐ **Species becomes a gallery filter, not a char-gen field** — the
  same demotion aspiration gets. You say "elf" and get elf-heavy
  households; the lineage settles what you are.
- ⚠ **Store the parent species anyway.** Redundant today, since both
  match. It makes a future mixed-parentage option a *content* change to
  the generator rather than a schema migration. Cheapest insurance in the
  design.
- **Retire the two hybrid rows** — see the migration note below.

> **Considered and not taken:** the gallery showing *mixed-species
> parents with a single-species child* (you are human; your mother was an
> elf). It costs nothing mechanically and preserves the
> belonging-nowhere fiction, which is the most cited reason players want
> half-elves. Recorded here because the door is one generator constraint
> wide, and reopening it requires no engine work — **provided the parent
> species is stored.**

### ⚠ Traits from lineage are upbringing, not genes

*"You are greedy because your father was"* is exactly the essentialism
[species-slate](./species-slate.md) fights — and it costs nothing to
avoid, because the trait ledger is already **evidence**-shaped. A seeded
disposition claim reads as *things that happened in that household*.

> **Genotype is inherited. Disposition is learned from.** Same card, two
> mechanisms.

### The migration

`semieldarinus` and `semiorcus` are **shipped, playable roster entries in
a content pack**, and the seeder is insert-only — editing the rows does
nothing.

⭐ **Unlist before you delete.** Removing them from the char-gen roster
is a config change that stops new half-elves immediately at near-zero
risk. Deleting the `Species` rows is a separate migration with live
characters possibly holding those class refs, and can happen on its own
schedule. See [species-expansion-slate](../tails/species-expansion-slate.md).

---

## Friction — check the funnel first

Auth happens **before** char-gen: signup creates zero avatars, and
`Login` runs the enroll flow once a session exists. There is already a
`mintRandomGuestAvatar` on the guest path, sharing config with char-gen.

**So char-gen abandonment is not a lost signup — it is a registered user
with no character.** Still a real loss, more recoverable, and it means
there is more depth budget available than a registration-funnel framing
suggests.

The shape that gets both goals:

> ⭐ **The gallery is the fast path. Allocation is advanced mode.**

One choice completes a character. Everything else lives behind a
*customize* affordance most players never open, and the minority who do
get the full body/faculty budget.

**Start the A/B work at the gallery**, because the gallery is *content* —
gallery size, reroll pricing, and how discoverable advanced mode is can
all be iterated without shipping code. The allocation system is the
expensive half; let the cheap half measure the appetite first.

---

## Open questions

1. **Are the parents *real*?** Alive, addressed, meetable. It is the
   difference between a character sheet and a hometown — and a much
   bigger build, since it means char-gen mints persistent NPCs.
2. **Do siblings exist?** Free-ish if parents do, and the fastest route
   to a populated world. Also: are two players who picked the same family
   related?
3. **What does the budget actually buy in units?** The slate argues for
   real units within a species-declared range; the ranges, and whether
   the species-typical center is the default, are unwritten.
4. **Does anything else become endowed with this build**, or does blood
   type ship alone? Allergies and metabolic quirks pass the rule and
   would each need a consumer.
5. **Can a player see the roll?** Showing it is drama; hiding it makes
   `untested` an invitation. Lean: show the *slot*, not the value.
6. **How much does the household's trade give you?** An antecedents
   budget shaped by the parents is the natural link to
   [antecedents-slate](./antecedents-slate.md), but a childhood spent
   around a trade is not the same as practicing it.

---

## What this slate does NOT cover

- **The advancement prior itself** — [antecedents-slate](./antecedents-slate.md)
  owns the effort→prior mapping; this doc only supplies a source for it.
- **Blood type mechanics** — [blood-slate](./blood-slate.md).
- **Reproduction in play.** Inheritance here is *backward-looking* only:
  choosing where you came from, never producing children.
- **The species roster itself** — which species exist is
  [species-expansion-slate](../tails/species-expansion-slate.md)'s
  question, not this one's.

---

## Cross-references

- [char-gen.md](../../subsystems/char-gen.md) — the `enroll` draft
  machine this restructures
- [race.md](../../subsystems/race.md) — `Species`, `Clade`, `BodyPlan`,
  `facultyProfile`
- [species-slate](./species-slate.md) — costs-not-ranks, incomparability,
  and the quality criterion the body budget has to satisfy
- [species-expansion-slate](../tails/species-expansion-slate.md) — the
  roster, and the hybrid-retirement note
- [trait.md](../../subsystems/trait.md) — `dispositions` claim-seeding,
  the upbringing mechanism
- [antecedents-slate](./antecedents-slate.md) — the background prior, and
  the authored-acquaintance gap the gallery partly closes
- [blood-slate](./blood-slate.md) — the first endowed value
- [banking.md](../../subsystems/banking.md) — `bank_supply`, the
  conservation chokepoint the capital sink draws from
- [magic.md](../../subsystems/magic.md) — `facultyProfile`, mana as a
  `Reserve`, competence-is-access
