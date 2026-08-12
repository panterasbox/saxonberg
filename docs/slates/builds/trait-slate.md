# Trait slate (working doc)

> **Status: design proposed, nothing built.** A change to a **shipped**
> subsystem ([trait.md](../../subsystems/trait.md)): split the derived
> trait position into **equilibrium** and **expressed**, make the
> *writes* legible without making the *values* readable, and settle the
> valence-scale question **before** disposition-writing is wired across
> the command surface.
>
> Also settles how species and culture may express personality — the
> question the [species slate](./species-slate.md) left as an
> antipattern row.
>
> Companions: [lineage-slate](./lineage-slate.md) (seeded claims as
> upbringing), [psychology-slate](./psychology-slate.md) (the vocation
> this must not break).

---

## The gap

Traits shipped as a real substrate and are **almost invisible in play**.
Four specific problems:

1. **One half-life does two jobs.** `TraitPosition.position` is the
   signed Σ of `valence · decay(now − when)` with a single
   `traits.decayHalfLifeDays`. Short, and you are pure recency with no
   stable self; long, and recent behavior never shows. It cannot be both.
2. **Reversal is unresisted** — `trait.md` documents this. Entrenchment
   resists *more of the same* (via the clamp), but swinging an axis the
   other way is cheap. That is a farming vector competence does not have.
3. **Nothing tells you traits exist.** The only surfaces are a self-view
   verb and NPC brains. A player can play for weeks and never learn the
   system is running.
4. **Wiring is deferred and unbounded.** "Full-surface disposition-valence
   authoring" is a named deferred item, with no doctrine for *how much* a
   given act may write.

---

## ⭐ Two values, one ledger

**Equilibrium** — who you are; slow; what therapy reveals.
**Expressed** — who you have been lately; fast; relaxes toward
equilibrium.

⭐ **This is free.** It is the same ledger read twice at two half-lives.
No new storage, no new writes, no new event — derive-on-read means the
second reading is a function call. Replayability, re-legislation, and the
honesty firewall all survive untouched.

⚠ **The naive form is wrong.** A short-half-life sum relaxes toward
**zero**, not toward equilibrium — so a generous person who does nothing
for a month would read as neutral. The shape wanted is

```
expressed  =  equilibrium + recent deviation
```

so that absent new evidence the deviation decays and **expressed relaxes
back to equilibrium**. Mean-reverting, not decaying-to-neutral.

**This is the state–trait distinction**, which is real personality
psychology (state vs trait anxiety is the canonical instrument) — the
reality-seeded anchor pattern `iscedf` / `binomial` / `formula` already
follow, applied to the personality layer.

It is also the already-named deferred item: *"explicit drift-inertia (the
normalized-position variant)."* This slate is that item, with a second
reason to want it.

---

## ⭐ The write is visible; the value is not

The legibility model, and it is not a compromise — it is psychologically
accurate:

> **People have excellent access to their actions and terrible access to
> their dispositions.** You know what you just did. You do not know what
> you are like.

So a disposition write may narrate itself — *"that was a generous thing
to do"* — and **never** a magnitude or a position. Same firewall shape as
bands-not-theta, on a new surface.

That alone fixes problem 3. Traits are invisible today mostly because
nothing ever mentions them; announce the writes and players build an
intuitive self-model without ever seeing a number, which is how
self-knowledge actually works.

### ⚠ Announce the surprising, not the every

Narrating every write becomes a nag *and* a tutorial in farming — players
learn "give coin → generous" and grind it.

⭐⭐ **Announce a write when it pushes `expressed` away from
`equilibrium`** — which is computable only because the value is split.
Information-theoretically right (report what is informative), and
dramatically right (acting out of character is the moment worth
noticing). The line it produces:

> *You'd not have done that a year ago.*

**The deviation is the story.** Acting in character is unsurprising, gets
no narration, and — per the anti-farming section below — should barely
move anything either.

### What this preserves, and what it resolves

**Preserves** the psychology vocation. *Both* values stay unreadable as
numbers; only writes narrate. You still cannot read yourself, disclosure
is still discovery, and equilibrium remains the thing a practitioner
surfaces from your record. Nothing about
[psychology-slate](./psychology-slate.md) is spent.

**Resolves** the ⚠ standing in `trait.md`: the `traits` verb self-reports
today, contradicting the psychology framing, and the doc calls it a
product decision the psychology build must make. This slate offers the
answer — **the self-view shows your recent disposition-writing acts, not
your positions.** A record of what you have been doing, which you are
entitled to, instead of a readout of what you are, which you are not.

---

## ⭐ The anti-farming argument

Worth stating separately, because it is a stronger reason to build this
than legibility is.

**Traits are more farmable than competence today.** Advancement's BKT has
difficulty-modulated observation, so unsurprising evidence barely moves
the estimate. The trait estimator is a plain clamped sum: the clamp
resists moving *further* out, but moving from neutral — or reversing — is
cheap.

Two values close it:

> **Cheap to look different this week. Expensive to be different.**

`expressed` swings on a short window and relaxes back; `equilibrium` has
a long half-life and costs sustained real behavior. Correct psychology
and correct incentive, from one change.

---

## ⚠ Before wiring it everywhere — the denominator

The thing to settle **first**, because it is cheap now and unfixable once
forty subsystems have opinions:

> **The trait ledger is a shared currency, and it needs a denominator.**

If combat writes valence at one scale and conversation at another, a
character becomes whatever they **do most**, not what they chose. Five
hundred small transactions swamp one hard decision, and the
most-instrumented subsystem wins everyone's personality.

So full-surface wiring needs a **valence scale doctrine** — what
magnitude a routine act may write versus a defining one — owned in one
place rather than negotiated per subsystem. Per the balance slate: every
global ledger is a currency, and the denominator is where the design is.

Nothing is decided yet (only a starter set rides authored
`ActSignature`s), so this is the window.

---

## Species, culture, and personality

The [species slate](./species-slate.md) lists *"culture as biology —
naturally greedy / warlike / stoic"* as an antipattern, which has read as
a ban on species personality. It is narrower than that, and the
distinction is worth stating because the fun is real: **"kender are
playful" is the kind of thing that makes a species choice matter**, and a
design that gives it up entirely is worse.

Two facts settle it:

- The slate's actual test is **hierarchy**. *Playful* is lateral and
  incomparable — the sort of difference the slate says to lean **into**.
  The antipattern objects to the **biology**, not the difference.
- **There is no slot for a species trait anyway.** Traits derive from an
  evidence ledger; nothing can store a disposition. The only expressible
  form is **seeded evidence** — and evidence has a source.

So the question was never yes-or-no. It is **what seeds it.** Three
tiers, best first.

### ⭐⭐ Tier 1 — emergent from affordances

A body that makes certain acts cheap produces a population that has done
more of them. Darkvision makes moving unseen cheap → you do more of it →
stealth acts write disposition evidence → you are covert **because you
did covert things.** Author nothing.

⭐ The payoff is the species slate's own goal, reached by mechanism: the
correlation appears in the population as a *statistical fact about what
those people did*, producing **in-world stereotypes that are usually
right and specifically wrong.** Which is what prejudice actually is, and
what is worth teaching.

⚠ **Authored species traits would make the prejudice true**, and a true
prejudice is not an allegory — it is an endorsement. Emergence is what
keeps the defamiliarized-prejudice design honest.

### ⭐ Tier 2 — seed the upbringing, not the species

Where immediacy is wanted (pick kender, be playful at minute one), the
claims come from the **household / culture**, per lineage's decided rule:
*genotype is inherited; disposition is learned from.*

Mechanically identical to a species trait. Semantically different, and
**escapable**.

⭐ And it *unlocks* rather than costs: the human raised among kender, the
dwarf who grew up in the city. Character concepts a species-locked field
makes impossible, and a far more interesting gallery card than either
alone.

### Tier 3 — if authored on species, a distribution, never a value

A kender household draws playful-leaning seeds with high probability; an
individual may draw otherwise. Kender *tend* playful; no kender *is*
playful by definition; and **the outlier becomes a character concept**
instead of an impossibility. Players experience it identically.

### The carve-out

**Non-sapient species: author freely.** A wolf's wariness is instinct,
not character. The concern is about *people*; nothing is gained by making
the bestiary tiptoe. Drawing the line at sapience removes most of the
roster from the question.

### ⭐ How it composes with two values

Seeded claims set **equilibrium**; your own acts drive **expressed**.
Therefore:

> **You can grow out of your upbringing — slowly.**

Sustained contrary behavior eventually moves the long-half-life value. A
kender who spends twenty years at serious work becomes serious, and it
took twenty years. Free from the model, and the exact thing an
inescapable species field could never give.

### ⚠ The one thing to avoid

A fixed disposition field on `Species` that every member gets
identically, permanently, and by definition. Not chiefly because it is
offensive — because it is **dramatically inert**: every kender is the
same person, the outlier is foreclosed, "raised by" is impossible, and a
stereotype becomes a law of physics.

**Shortest path to build: tier 2 for immediacy, tier 1 for truth.** Seed
the culture so the choice reads instantly at char-gen; wire the
affordances so that over months the population drifts to a distribution
nobody authored — and the stereotypes players form are ones they earned.

---

## ⭐ Deviation is the general narration rule

Worth noting because it shows up twice and should be one idea:

- the trait narrator describes an **act** by how far it sits from your
  equilibrium
- the [lineage](./lineage-slate.md) gallery card describes a **person**
  by how far they sit from their species' range ("short even for a
  dwarf", "unusually long-lived even among elves")

> **Interesting means far from baseline.** A value is only characterful
> relative to its distribution.

Same function, two surfaces. Neither should print absolutes.

---

## Open questions

1. **Two half-lives, or one plus a smoothing term?** Two independent
   decay constants is the simplest statement; an explicit relaxation rate
   is the more controllable one. The dials are already AppSettings-driven,
   so either is authorable.
2. **Does `mass` / `TraitBand` split too?** Entrenchment is currently a
   property of the single position. Bands plausibly belong to
   equilibrium only — expressed has no business being "entrenched."
3. **What does `compatibility` / `regardBaseline` read?** Almost
   certainly equilibrium (who you are), but a case exists for expressed
   (who you have been to *me*, lately). This decides whether a bad month
   costs you friendships.
4. **How loud is the narrator?** A surprise threshold, a per-session cap,
   or both. Under-tuned it is a nag; over-tuned nobody ever learns the
   system exists.
5. **Does the narrator leak?** Being told "that was cruel" is a judgment
   the game is making about you. Worth checking it never reads as
   scolding — the register should be observational.
6. **What sets the denominator?** A per-subsystem budget, a global
   magnitude vocabulary (`routine` / `notable` / `defining`), or review.
   Lean: a vocabulary, because it is authorable and reviewable.
7. **Do NPC brains read expressed or equilibrium?** A brain reacting to a
   character's *recent* state is more alive; reacting to equilibrium is
   more stable. Probably expressed, which makes NPCs notice moods.

---

## What this slate does NOT cover

- **The ledger schema.** `DispositionEntry` is unchanged; this is
  entirely a change to the derivation and the surfaces.
- **Stress / composure** — the `traits-stress` follow-on owns the
  equanimity Reserve and the break condition.
- **Cross-axis propagation** and the richer compatibility kernel — still
  deferred, unaffected.
- **The psychology vocation itself** — [psychology-slate](./psychology-slate.md)
  owns it; this slate only guarantees it stays possible.
- **Which acts write what valence.** That is the wiring, and it must not
  start before the denominator is settled.

---

## Cross-references

- [trait.md](../../subsystems/trait.md) — the shipped substrate, the
  documented reversal limitation, and the deferred drift-inertia item
  this realizes
- [advancement.md](../../subsystems/advancement.md) — the shared
  `ActSignature`, and the difficulty-modulated observation that traits
  lack
- [psychology-slate](./psychology-slate.md) — you cannot read yourself;
  disclosure is discovery; the stale "privacy is free" note
- [species-slate](./species-slate.md) — costs-not-ranks, incomparability,
  and the "culture as biology" antipattern this bounds
- [lineage-slate](./lineage-slate.md) — seeded claims as upbringing;
  the gallery card and the shared deviation rule
- [behavior.md](../../subsystems/behavior.md) — the brains that read
  traits, and the `converses` precedent
- [balance-slate](./balance-slate.md) — every global ledger is a
  currency; the denominator is where the design is
