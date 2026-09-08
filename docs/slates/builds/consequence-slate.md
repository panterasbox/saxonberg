# Consequence slate — what an injury costs, and who it puts to work

> **Status: PARTIAL** — the substrate is all shipped (harm · combat ·
> mortality · poise · materials-response); the **consequence layer** over
> it is not.
> **Left:** ⭐ the wound→poise edge (arrow ②) · the poise read · **the
> outcome model** (`onDefeated` has zero implementers) · morale &
> surrender · de-escalation · aftermath · the `afflict` door · the
> **eight-arm unification** behind the three dead channels (`signature` ·
> `resolution` · `contagion`) · `resolution.by` · the `governs` rename ·
> diminishment · the clinic (#38) · the repair shop (#39) · the
> necropolis (#40) · the guard contract
> **Size:** ⭐⭐ **a large build — four movements, eighteen waves.** See
> [Scope](#scope--what-this-build-takes)

**Captured 2026-09-08**, out of a design conversation that opened with
*"we don't have hitpoints"* and ended somewhere else entirely.

> **User: "so you get burned? so what? is it just a counter to 0 like
> hitpoints or is there something more dynamic at work… basically we have
> a really cool simulation modelled now we have to make an actual game
> out of it. and players have some very specific expectations for gameplay
> on a multiplayer RPG. we have to either meet them or explicitly defy
> them, but as far as I know, we've never even had the conversation."**

> **User: "the one area I do want to be more proactive on is interplay.
> the violent players need the non violent ones to exist and vice versa…
> that's all the more reason to make combat complementary, so it's
> something that can be sprinkled into any content at any level."**

**Read first:** [combat-slate](./combat-slate.md) (§ terms & consent — the
frame this slate leans on) · [combat-experience-slate](./combat-experience-slate.md)
(⭐ Thesis 5 is the `Sharpness.g(composure)` inert seam **this slate's
part D hooks from the non-martial side**) ·
[vitals-slate](../tails/vitals-slate.md) + [health-vertical-slate](./health-vertical-slate.md)
+ [disease-slate](./disease-slate.md) (⭐⭐ **the three that each describe
one of Finding 2's three dead channels** — read that finding before any of
them) · [medic-judgment-slate](./medic-judgment-slate.md) (the clinic,
W6) · [physiology-slate](./physiology-slate.md)
(the `governs` axis W5 takes over) · [blood-slate](./blood-slate.md) (the
*other* consumer of a bleed that bites — cut, deliberately).

**Issues:** [#38 the clinic](https://gitlab.com/panterasbox/saxonberg/-/issues/38)
(split — W6a in, W6b stretch) ·
[#39 the repair shop](https://gitlab.com/panterasbox/saxonberg/-/issues/39) (W7) ·
[#40 the necropolis](https://gitlab.com/panterasbox/saxonberg/-/issues/40) (W8).

**Substrates:** [harm.md](../../subsystems/harm.md) ·
[vitals.md](../../subsystems/vitals.md) ·
[combat.md](../../subsystems/combat.md) ·
[mortality.md](../../subsystems/mortality.md) ·
[materials-response.md](../../subsystems/materials-response.md) ·
[advancement.md](../../subsystems/advancement.md) ·
[activity.md](../../subsystems/activity.md) (the engagement slots part C
turns into a job) · [contract.md](../../subsystems/contract.md) (the board
the guard contract rides) · [accountability.md](../../subsystems/accountability.md).

---

## The gap — two arrows and a wake

**Damage is resolved beautifully and then does almost nothing.** Stated
precisely, that is **two different missing arrows plus their consequence**,
and the build must not let either arrow eat the other:

```
   ①  condition ──▶ body       what a wound/illness DOES to you
                               ⛔ declared (`signature`) · unconsumed
                               ⚠ and eight rival mechanisms already exist

   ②  body ──▶ contest         what your state does to your POSITION
                               ⛔ absent — poise never hears about a wound

   ③  the wake                 what a fight leaves for other people
                               ⛔ absent — no demand, no jobs
```

⚠⚠ **These are not the same mechanism and must not be unified with each
other.** ① is a body-state channel; ② is one combat-local coupling; ③ is
an economy. Collapsing them would be the same over-generalization the
[rejected fork](#-the-rejected-fork--recorded-so-nobody-re-proposes-it)
records.

⭐ **Arrow ② is the smallest work in this slate and the largest payoff,
and it is therefore the one at risk of being cut when the build
overruns.** It is W1, it ships first, and it is not a stretch. If the
window ends early, ② and ③ shipping without ① is a better build than ①
alone.

---

## ⭐ What is actually wired — verified, and more than expected

The conversation began from *"conditions don't do anything"*. That is
half true, and the true half is load-bearing enough to build on. Every
row below was read out of the tree, not remembered.

| coupling | state |
|---|---|
| competence → `Sharpness` → poise recovery + read-fog | ✅ `lib/combat/Sharpness.ts` — `0.35` untrained → `1.0` expert |
| poise band → blow energy → armor fold → tissue | ✅ `CombatLogic:1000` `energyFor()` — steady `1.2` … open `4.5` |
| endurance → caps poise recovery | ✅ `CombatLogic:1756` |
| outnumbered → poise erodes faster | ✅ `focusMultiplierFor` (focus-fire) |
| armor wears per blow | ✅ `ConditionLogic:927` `craftingWearArmorPerBlow × seamWear` |
| weapon wears per strike / per parry | ✅ `CombatLogic:2170, 2652` |
| fracture → slot unusable (`canOccupy`) | ✅ `Slotted.ts:338`, and `MagicLogic:428` for hands |
| leg wounds → endurance drain on traverse | ✅ `Vitals.drainForLimp` |
| band → carry capacity | ✅ `LoadBearing:315` |
| composure → `Sharpness` | ⭕ **present and inert** (`g() = 1`) |
| **wound → poise** | ❌ **absent** |
| **affliction `signature` → vital signs** | ❌ **absent** |

⭐ **Two corrections to claims made mid-conversation**, recorded because
they were confidently wrong and would have shaped the build: armor
**does** wear when struck, and being outnumbered **does** already shred
poise. Neither needed building.

---

## Finding 0 ⭐⭐⭐ — eight parallel mechanisms, discriminated by field presence

**This is the finding that decides the build's shape**, and it is why
this slate must be a *unification* and not a fourth solution.

`VitalsMixin.reconcileConditions` is one method containing **seven arms**,
each added by a different build, each discriminated by *which optional
field happens to be set on the record*:

```
traumas        c.kind === 'trauma'
shocks         c.kind === 'shock'
sustained      c.kind === 'sustained'                       (magic)
decayingMagic  c.kind === 'affliction' && magicOrigin  !== undefined
infections     c.kind === 'affliction' && pathogenLoad !== undefined
progressing    c.kind === 'affliction' && neither of the above
dyings         c.kind === 'dying'
```

Plus an **eighth in a different mixin** — `Metabolic.reconcileToxinConditions`
— which `progressAffliction` has to explicitly skip around to stop two
arms fighting over one row's stage.

⚠⚠ **The trap has already been sprung once, with a comment proving it.**
The `progressing` arm's own docstring:

> *"`ProgressionSpec` shipped with the comment 'no live scheduler is built
> here', was authored by three rows, and was read by nothing: starvation,
> dehydration and `recovering` all sat at stage 0 for ever… **This is the
> arm that fills it.**"*

Somebody found a declared-and-unread field and **added an arm**. That is
exactly how you reach eight, and exactly the move this build must not
repeat with `signature`.

### ⭐⭐ The unification: separate the LAW from the EFFECT

Every arm conflates two independent things:

- **a progression law** — how the record's own state advances over
  elapsed game-time. Already a small closed set: `decay` (trauma
  severity, magic), `logistic` (infection load), `stage` (a cadence),
  `integrate` (the bleed), `countdown` (dying), `burden` (toxin).
- **an effect** — what that state then does to the body. Today this is
  hardcoded per arm, and for a plain affliction it is *nothing at all*.

**`signature` is the effect channel.** So the build's governing rule:

> ⭐ **`signature` is not an eighth arm. It is the channel the existing
> seven route their effects through.**

Wiring it as a new parallel path would make the problem measurably worse
and would vindicate the fear that prompted this section.

⚠ The effect surface is **small**, which is what makes this tractable:
only four producers write a vital sign at all (`Condition.ts` bloodVolume,
`Respiration` spo2, `ThermalRegulation` coreTemperature, plus Vitals' own
internals). Eight ways to advance a clock; four ways to change a body.

### ✅ The gate — census run, ratchet shipped (2026-09-08)

The repo's own pattern ([lint-family.md](../../lint-family.md)): write the
census, **gate today's count as the ceiling**, let a later wave drive it
down.

**`lint:condition-arms` is built and green** —
`packages/server/scripts/check-condition-arms.ts`, in the derived roster
(now 30 gates), with a fixture test. **Measured on this branch, before
any build work:**

```
condition arms — 7 found
  lib/vitals/Vitals.ts
    1052  reconcileConditions() → traumas
    1055  reconcileConditions() → shocks
    1058  reconcileConditions() → sustained
    1061  reconcileConditions() → decayingMagic
    1069  reconcileConditions() → infections
    1080  reconcileConditions() → progressing
    1086  reconcileConditions() → dyings

parallel stores (enumerated): 1
    lib/metabolism/Metabolic.ts#reconcileToxinConditions

  total mechanisms = 7 arms + 1 parallel = 8
```

⭐ **`ARM_CEILING = 7`.** It may fall; it may never rise. That is what
stops a ninth arm being added by the next build that finds a field nobody
reads — **including this one.**

⚠ **The definition had to be a census of MECHANISMS, not of loops**, and
the first cut got it wrong in a way worth recording: it counted
`MagicLogic.execRelieve` (the dispel selection) and
`AssessController.execute` (the `assess` readout) as arms. Both genuinely
discriminate the condition collection and iterate it; neither advances
anything. **An arm must also progress state over time** — it sits in a
`reconcile*` method, or its loop body references a game-time cursor. The
fixture (`scripts/__fixtures__/condition-arm-shapes.ts.txt`) pins four
must-fire shapes and four must-not-fire ones, per the shipped-broken-gate
clause; the ceiling's failure path was exercised directly (lowered to 6 →
exit 1) rather than assumed.

---

## Finding 1 ⭐⭐ — the loop is open: a wound never feeds back

`CombatLogic:1829` erodes the target's poise by
`erode × focusMult × effectiveDamage`, which reads like the missing edge
and is not:

```ts
const effectiveDamage = poiseDamage * reachScale;   // :1804
```

`poiseDamage` is the **weapon playstyle factor** and `reachScale` the
reach advantage. It is the blow's *pressure*, never the wound it landed.
A resolved `Trauma` is a pure **output** of the poise contest and is
never an input to it.

**So the body is a scoreboard hanging off a skill race.** Consequences:

- **First blood means nothing mechanically**, though it is a shipped
  stop-condition — you can be opened up and fight on exactly as well.
- **Fights have no spiral, so they grind** rather than resolving. Which
  is precisely what makes lasting wounds unaffordable: the *hospital
  problem is caused by this missing edge*, not by wound durations.
- **Yielding is never signalled.** A player can't feel the moment the
  fight turned, so the shipped exits (`yield`, and the loss-free back-
  down) go unused.

⭐ Closing it is a small change with the largest single payoff in this
slate: a fresh wound spends poise proportional to severity, and a wound
above a threshold caps the poise a body can hold at all. Getting cut
staggers you; staying cut keeps you losing.

---

## Finding 2 ⭐⭐⭐ — three dead channels on one class

The `Condition` Idea is a **content schema whose behavioural half is
fully declared and entirely unconsumed.** Every authored field checked
against its real consumers — and two of them have same-named methods on
*unrelated* classes (`Blueprint.getSignature`, `CombatSession.getResolution`)
that inflate a naive grep, which is probably why this went unnoticed:

| field | what it declares | consumer |
|---|---|---|
| `progression` | stage cadence | ✅ `Vitals:920` |
| `toxinBehavior` | per-body rates | ✅ 2 sites |
| `pathogenBehavior` | population constants | ✅ 1 site |
| `mentalBands` | resist cutoffs | ✅ 1 site |
| `observableSigns` | what a looker sees | ⚠️ `AssessController:170` — reads `[0]` only |
| **`signature`** | **what it does to you** | ⛔ **none** |
| **`resolution`** | **what fixes it** | ⛔ **none** |
| **`contagion`** | **how it spreads** | ⛔ **none** |

All 23 authored rows carry `signature: []`. The only occurrence of
`getSignature()` on this class in the whole server tree is its own
declaration (`platform/idea/Condition.ts:674`).

⭐ **The three dead fields are exactly *what a condition does, what fixes
it, and how it spreads*.** The four live ones were each added later by a
build that needed something specific and grew its own field rather than
filling the declared one.

⚠ **And there is no door.** `ConditionApi` has exactly four statics —
`inflict` (trauma-only), `die`, `embodyForSession`, `reembody`. An
affliction **cannot be applied through the Api by anything**; the shipped
drivers reach past it into `VitalsMixin.afflict()` directly, which
harm.md documents as a known consequence.

### ⭐⭐ This is why three slates describe one hole

None of them names it as one thing, because each arrived from its own
side:

- [vitals-slate](../tails/vitals-slate.md) — *"the affliction driver —
  disease and poison have no `inflict` path at all"*
- [health-vertical-slate](./health-vertical-slate.md) — *"a
  `resolution.by` dispatcher"*
- [disease-slate](./disease-slate.md) — *"`Condition.contagion` is still
  `null` with no consumer"*

**That is arrow ① of the gap**, and it is the largest single body of work
here — but it is one of three, not the whole. See
[the two arrows](#the-gap--two-arrows-and-a-wake): the poise coupling is a
peer, not a preamble.

⚠ It is also the **best** state to start from: the shape was designed
correctly and never wired. The build is a wiring job plus 23 rows of
authoring, not a redesign.

---

## Finding 3 — two trauma types do nothing at all

`BURN_BEHAVIOR` and `CONTUSION_BEHAVIOR` are both
`decayingBehavior(rate)` — a number that goes down. No reserve, no
capability, no clock. A fireball's entire lasting effect on a person is a
severity float that heals.

---

## Finding 4 ⭐ — burn's real physiology converges on `bloodVolume`

Worth stating because it decides a fork the conversation raised as open
(*"can you die from burns? no but you can from infection"*).

A major burn kills in the first 24–48 hours by **plasma leaking from
damaged capillaries** — hypovolemic shock. It is why burn care is fluid
resuscitation before it is anything else. Infection is the *second* wave,
for those who survive the first.

⭐ **So a burn and a cut kill through the same vital sign**, and the fork
"does burn need its own death path" answers itself: no. What differs is
the **rate**, the **treatment** (a dressing does nothing; fluid does),
and the **clock that follows**. That is the consequence table in
miniature, and it is why the table is per-*consequence*, not per-damage-
type.

---

## Finding 5 ⭐⭐ — violence leaves no wake

A fight currently ends and the world is unchanged except for one hurt
person. Nothing that happens in it becomes anybody else's work.

This is the **interplay** half, and the mechanism is not barter — you can
buy a sword from an NPC. It is **structural inability**: things a person
cannot do for themselves. Four exist, and two are already true in code:

1. ✅ **You cannot treat yourself well.** Outcome quality is dressing
   quality × *the treater's* medicine band. A fighter who spends his
   Discipline budget on fighting structurally cannot also be his own
   doctor.
2. ⭐⭐ **You cannot guard yourself while you work.** Engagement slots are
   `body | hands | attention | voice`, one occupant each
   (`lib/activity/Engaged.ts:66`). Mining takes your hands; hauling takes
   your body. **A guard is a person engaged in nothing so that you can be
   engaged in something** — an honest job with a shipped mechanism under
   it and no content today.
3. **You cannot testify about your own killing.** Forensic readability
   decays `1 → 0.6 → 0.25 → 0` while the cause stamp stays ground truth.
   Somebody has to look before the evidence is gone, and it can't be the
   deceased.
4. **You cannot hold standing and be a thug.** `standing = max(0,
   renown) × participation`, and accountability derives crime from rows
   the violent player generates. Legitimacy cannot be self-minted.

⭐ **Violence's economic signature is two-directional** and that is what
makes it interlock: it produces **safety**, a positive good sold to
people who cannot make it, and **damage** — wounds, wrecked harness,
spent stock, bodies, court cases — every item of which is demand for
somebody else's labour.

---

## The design

### A. Close the loop *(smallest, largest payoff)*

A landed `Trauma` spends the victim's poise in proportion to severity,
and a wound above a threshold lowers the ceiling poise can recover to.
Dials on `combat.*`, the shipped idiom. Nothing else in the exchange
engine is touched.

### B. The consequence table

⭐ **Not a damage-type table — a consequence table.** A dozen insults do
not need a dozen death paths; they route into a small closed set of
consequences, and the insult decides *which*, *how fast*, and *what
treats it*.

| insult | reserve | capability | clock |
|---|---|---|---|
| blade / point | fast bleed | — | infection |
| blunt | — | **slot lost** (shipped) | — |
| heat | slow weep (plasma) | site unusable | infection |
| toxin | slow | — | — |
| asphyxiant | spo2 | — | — |

Mechanically this is **`signature` wired** — the declared channel from
Finding 2 becomes the authored route by which a condition perturbs a
vital sign — plus a `capability` term beside it, generalizing what
fracture already does bespoke.

⚠ **The club is not a weaker sword.** A mace to the shield arm is not 60%
health; it is *no shield*. That is the anti-hitpoint claim made
mechanical, and one trauma type already proves it.

**Contusion is the sparring currency.** It is what non-lethal combat
should produce and it should cost a *little* — stiffness, a small
endurance tax, something that says you were in a fight yesterday. That is
what makes the shipped gym a practice loop instead of a room.

### C. The wake — violence as demand

Each of these is a job for somebody who was not in the fight. None
invents a subsystem; each connects two shipped ones.

- **the medic** — wounds that bite give [medic-judgment](./medic-judgment-slate.md)
  its patient, and [blood](./blood-slate.md) its transfusion demand.
- **the armorer** — armor already wears per blow; what is missing is that
  worn armor is *visibly* worse and that repair is somebody's trade.
- **the coroner** — a decaying readability curve with no verb that reads
  it. Forensic examination is named-and-deferred in mortality.md.
- **the guard** — Finding 5.2, expressed through the shipped contract
  board: a standing engagement whose *whole content* is holding no other
  engagement.

### D. The non-martial hook — composure

⭐ `Sharpness = f(competence) × g(composure)`, and `g` is **already
present and inert at 1**, with two code comments naming it as the seam.
It is the slot where a non-fighter's own life pays into a fight.

**The smith who reads the weak seam does not hit harder — he does not
flinch**, and that shows up as poise he doesn't lose. The cook knows
what's in the stew; the medic knows where it will hurt. This is what
makes combat sprinkleable into any content at any level: not that the
brewer can fight, but that **the brewer's branch is their answer to a
fight**.

⚠ Coordinate with combat-experience Thesis 5, which claims the same seam
from the trait/stress side. They are the same multiplier and must not be
built twice.

---

### E. The outcome — winning and losing, with certainty

⭐⭐ **The fourth instance of this slate's one pattern, found last and the
most surprising: `onDefeated` and `onDefeatedFoe` are no-op terminals
with ZERO overrides anywhere** — not in the kernel, not in any of the
thirty-six packs. Winning a fight fires two hooks that do nothing.

The *determination* is solid and needs no work: six resolutions
(`first-blood` · `yield` · `incapacitation` · `death` · `draw` ·
`disengage`), a named victim and killer, narration, and a venue hook. The
question this build answers is what an outcome **means**.

- **Winning pays.** Renown is the obvious currency and it is shipped and
  scoped. ⚠ What a non-lethal win is *worth* is a values call, not an
  engineering one — see [Q8](#open-questions).
- **Losing costs**, and the cost is legible. At the extreme this is
  mortality's `recovering` seed, which ships **deliberately empty** —
  *"what diminishment should actually BE is undesigned."* This build
  fills it, because the cost of losing is exactly what a fight is for.
- **Somebody gives up.** A fight that can only end in incapacitation or
  death is not a fight anyone starts twice. Morale and surrender
  (combat-experience **T13**) is what makes `yield` a thing an *opponent*
  does, not just a verb the player types.
- **Somebody walks away.** De-escalation (**T12**) is the non-fighter's
  exit, and the precondition for [Q4](#open-questions) — a beast that
  refuses a yield is only honest once the other exits are real.

### F. Legibility — the poise read

The metric exists, is banded, and moves every exchange. The player is
told almost nothing.

⚠⚠ **Narration, not a card.** The pressure to render poise as a bar will
be enormous and it is the one thing that would actually betray the
design. The raw scalar is `private` and only the band is exposed — keep
it that way and let the *prose* carry it: *you give ground; his blade is
where yours should be.* **A `CombatCard` is explicitly out of scope**
(it belongs to [combat-slate](./combat-slate.md), and a card is the
gauge this design refuses wearing a client costume).

That delivers the three reads an HP bar actually gives — *can I continue ·
am I losing · did that matter* — as fiction. See
[measurement.md](../../measurement.md) § the no-gauge reading rules.

---

## ⛔ The rejected fork — recorded so nobody re-proposes it

Mid-conversation this slate's author proposed **generalizing poise into a
universal contest metric** — running negotiations, trials, crises and
performances on the same `steady → pressed → reeling → broken → open`
machine, on the grounds that `Poise.ts` is already a pure state machine
with no combat in it.

**The user rejected it, correctly:**

> **"'make everything combat' is not the solution. you're just doing what
> Griftlands did with two decks for violence and nonviolence."**

Three reasons it is wrong, kept because the idea is seductive and the
code really does look ready for it:

1. **It is the hitpoint error one level up.** The case against HP is that
   it is a contest model wearing a health costume. Putting the contest
   costume on *everything* is the same flattening, wearing better
   clothes.
2. **Adversarial is a special case, not the general one.** The weather is
   not trying to beat you. Rot is not an opponent. A crop failing is not
   a fight you lost. Most of what a player does all day is against an
   indifferent world, and modelling indifference as an antagonist is
   exactly the lie this game exists not to tell.
3. **It smuggles back the unidimensional counter.** *"There's no optimal
   path because you're not being measured by a unidimensional counter."*
   One universal contest metric **is** that counter; bands instead of
   numbers only make it harder to see.

⭐ **The design already does the right thing**: every branch has its own
**incommensurable** metric — combat measures poise, brewing and smelting
measure *grade*, farming measures *yield*, an office measures *standing*.
You cannot convert a grade into a poise, and that is the property that
makes the tree a tree rather than five skins on one deck. Branches meet
at **goods, money and standing**, not at a shared gauge.

**Poise stays in combat.**

### ⭐ What does generalize is narrow: the terms

`lethality` + `stopCondition` + `consent`, plus `CombatTerms.reconcile`
for when someone brings lethal to a non-lethal fight. That is not a
combat mechanic — it is a **legal primitive combat happens to be the
first consumer of**, and its payoff is already wired: consent is what
decides whether the accountability row derives as a crime.

It is general because *consent* is general — the difference between
surgery and stabbing, demolition and arson, an apprenticeship and
exploitation, a wager and a swindle. Lifting it is a **governance** move
next to the contract substrate, not a combat one, and it is **not in this
slate**. See [open question Q5](#open-questions).

---

## The three clocks

The picture the build should preserve, and the reason no abstract health
metagame is needed:

| clock | scope | recovers | answers |
|---|---|---|---|
| **poise** | one fight | seconds, by conceding tempo | am I dictating terms |
| **endurance** | a day | rest and food | can I keep fighting |
| **wounds** | days–weeks | treatment and time | what happened to me |

⭐⭐ **Advancement buys the first clock and never the second.** `Sharpness`
already implements this: a veteran does not survive a knife to the neck —
**he does not lose the contest, so the knife never arrives**, and when he
does lose it (ambushed, outnumbered, gassed) it kills him exactly as fast
as it kills anybody. That is the answer to the novice/veteran problem,
it is historically honest, and it is already shipped.

⚠ **Never render poise as a bar.** The raw scalar is `private` and the
only readout is the band; keep it that way and let the *narration* carry
it — *you give ground; his blade is where yours should be*. That
delivers the three reads an HP bar actually gives (can I continue · am I
losing · did that matter) as fiction instead of a number. See
[measurement.md](../../measurement.md) § the no-gauge reading rules.

---

## The lens pass

**1 · Pedagogy.** ⭐ **This lens picks the consequence table over a
damage-type table.** A consequence table teaches what happened to a body;
a damage-type table teaches which resist stat to stack. The world stays
derivable end-to-end — energy → armor fold → tissue → consequence — and
the burn's fluid loss is real trauma physiology, not a game abstraction.
Disciplines exercised: medicine (diagnosis from signs), smithing (repair),
and awareness (reading a fight before it starts).

**2 · Creative expression.** The ordinary case is **YAML only**: an author
gives a `Condition` row a `signature` and it perturbs a body. The bespoke
case has an honest ceiling — a new *affliction* (Kind A) is content, a new
*trauma* (Kind B) is a closed engine vocabulary needing a
`TRAUMA_BEHAVIOR` entry. That split already exists and this build does not
move it.

**3 · Immersion & roleplay.** The whole slate is anti-gauge: bands, named
injuries, narrated deltas. RP emerges rather than being declared — nobody
announces they are the town medic; they are the person people come to.
⭐ The wake is what makes a fight *remembered* by more people than fought
in it.

**4 · Gamification & self-improvement.** ⭐ **The choice it forces:
fighting will cost you weeks and somebody else's labour — is it worth
it?** Today it is free. And the standing arithmetic already makes
violence *cost* legitimacy, so a violent player needs people who will
speak for them. Standing is conferred by the polity, never by the engine.

**5 · Technology & magic.** The mechanism is epoch-invariant because it is
physiology: plasma leaks from a burn in Rome and in New York. Only the
dynamics move — the armor becomes a vest, the medic a surgeon, the
dressing an IV line. Magic sits on the same table (a fire effect resolves
through `heat` into a burn today) and is dangerous precisely because it
**skips the poise contest** rather than winning it.

---

## Open questions

**Q1 — how much poise does a wound cost?** Proportional to severity is
obvious; whether it also *caps* recovery (a badly wounded fighter cannot
return to `steady` at all) is the real dial and decides whether fights
end in yields or in bodies.

**Q2 — does contusion cost anything outside a fight?** A small endurance
tax is the cheap answer. The risk is a gauge by the back door: a player
tracking "am I bruised" is watching a number again.

**Q3 — what treats a burn?** A dressing does nothing for it. Fluid is the
honest answer and it routes through metabolism, which is shipped — but it
means the first-aid loop grows a second verb, and harm.md names the
medicine branch as deferred.

**Q4 — does an animal accept a yield?** `yieldFight` currently ends the
session unilaterally, which is generous. A wolf that does not take
surrenders is more honest and makes beasts genuinely different from
people — but it removes the non-fighter's main exit, so it needs the
other exits (flee, pay, rescue) to be real first.

**Q5 — where do the terms go?** The consent primitive is general and this
slate deliberately does not lift it. It wants its own slate next to
[contract.md](../../subsystems/contract.md) and the governance surface, and the
question is whether combat keeps its own `CombatTerms` as a specialization
or becomes a consumer of the general thing.

**Q8 — what does winning a non-lethal fight pay?** ⚠ **The one question
in this slate that is a values call rather than an engineering one.**
Renown is shipped, scoped, and the obvious currency — but standing is the
game's real money (`standing = max(0, renown) × participation`), and how
much of it a bar brawl mints is a statement about what the polity
rewards. An engine answer here would be the engine deciding what the game
is about. See [measurement.md](../../measurement.md) § layer 3.

**Q9 — what IS diminishment?** mortality.md ships `recovering` as a
deliberately empty seed and names four candidates: a temporary competence
penalty, a wound that heals over time, a diminished vessel, or something
a patron marks you with. Two constraints are already fixed — *unpleasant
but never dangerous* (anything that could push you back over a lethal
threshold reopens the death loop) and *legible* (a price you cannot feel
is one no temple can undercut).

**Q7 — does W14 survive requirements?** The judgment loop is the one wave
whose design is not settled. The honest test: **can a player be *wrong*
about a diagnosis in a way the world punishes, without a roll?** If W8/W9
have made conditions genuinely distinguishable, yes; if not, W14 is a
scoring rubric over a coin flip and should be cut rather than shipped
thin.

**Q6 — does the guard job need an engine seam at all?** Part C.4 may be
pure content over the shipped contract board and engagement slots. If it
is, that is a finding worth stating loudly, because it means the most
important interplay job in the game costs zero kernel code.

---

## Scope — what this build takes

**Sized 2026-09-08** against the slate backlog and the open issue queue.
The `governs` rename was the one question that reached outside this
build's blast radius; **decided: do it here and unblock physiology.**

### The waves — four movements

⚠ **This is a large build and it is meant to be.** The user's call:
*"go big… yes to everything in the slate plus anything else you want to
make room to include."* Each movement below is a build's worth on its
own; they are one build because each one's output is the next one's
input, and shipping any of them alone leaves a seam with no consumer —
the exact failure this slate exists to end.

**Movement I — the instruments.** Ship the gates before the work they
govern.

| | wave | what |
|---|---|---|
| **W0a** | ✅ the arm ratchet | **DONE** — `lint:condition-arms`, measured 7 + 1 parallel, ceiling set, in the derived roster |
| **W0b** | the couplings as tests | one characterization test per row of the table above, so the two absent edges are absent *on purpose* |
| **W0c** | ⭐ `lint:unconsumed-seams` | **the instrument that would have found all four of this slate's findings.** See below |

**Movement II — combat that resolves** (arrow ②).

| | wave | what |
|---|---|---|
| **W1** | ⭐ wound → poise | the loop closes. First, smallest, **not a stretch** (design A) |
| **W2** | the poise read | per-exchange narration of the delta — prose, never a card (design F) |
| **W3** | the outcome model | `onDefeated`/`onDefeatedFoe` get implementers; winning pays, losing costs (design E) |
| **W4** | morale & surrender | combat-experience **T13** — an opponent that gives up; answers [Q4](#open-questions) |
| **W5** | de-escalation | combat-experience **T12** — the non-fighter's exits |
| **W6** | aftermath | combat-experience **T11** — the combat-side wake |

**Movement III — the body remembers** (arrow ①).

| | wave | what |
|---|---|---|
| **W7** | the `afflict` door | `ConditionApi.afflict`/`relieve`, gated like `inflict`. **Nothing downstream is reachable without it** |
| **W8** | ⭐⭐ the 8-arm unification | law (`decay`/`logistic`/`stage`/`integrate`/`countdown`/`burden`) separated from effect; `signature` becomes the channel the seven arms route **through**, never an eighth. **The ratchet falls.** The `contagion` consumer rides here iff nearly free |
| **W9** | `resolution.by` dispatched | treatment differs by condition — a burn needs fluid, a cut needs a bandage |
| **W10** | the capability term + ⭐ the `governs` rename | `BodyPart.governsVital` → `governs`; unblocks physiology's waves 2–3 |
| **W11** | the 23 rows + the two dead traumas | burn's fluid loss · contusion's cost · `observableSigns` read past `[0]` |
| **W12** | diminishment | fill mortality's deliberately-empty `recovering` seed — the cost of losing, at the extreme |

**Movement IV — the wake** (arrow ③): violence as demand.

| | wave | what |
|---|---|---|
| **W13** | the diagnosis surface | issue **#38a** — cues without names, the `analyze` read, the instrument gate. The **read side** of W8/W9 |
| **W14** | the judgment loop | issue **#38b** — stop auto-selecting; triage under the deterioration clocks; decision-graded `ActSignature` |
| **W15** | the repair shop | issue **#39** — content pass, ~600 lines mostly YAML, no engine |
| **W16** | the necropolis | issue **#40** — content pass + the forensic examination verbs the decay curve has been waiting for |
| **W17** | the guard contract | Finding 5.2 over the shipped contract board — ⭐ possibly zero kernel code ([Q6](#open-questions)) |

### ⭐⭐ W0c — `lint:unconsumed-seams`, and why it is the most valuable wave

Four of this slate's five findings are **the same defect**: a
correctly-designed seam with nothing on the consumer end.

| seam | consumers |
|---|---|
| `Condition.signature` | 0 |
| `Condition.resolution` | 0 |
| `Condition.contagion` | 0 |
| `Combatant.onDefeated` / `onDefeatedFoe` | 0 |

Every one was found **by hand**, one at a time, across four separate
investigations — and `ProgressionSpec` was a fifth that a previous build
found the same way. That is not a discovery method; it is luck repeated.

⭐ **The doctrine already exists in this repo** — `lint:does-nothing`
enforces *"a made thing must do something"* for materials-response
constructions. W0c is that doctrine one level up: **a declared seam must
have a consumer.** Census the authored fields on data Ideas and the
`@hook` override surfaces, count the ones nothing reads or implements,
and ratchet.

⚠ It will find more than the four above, and **that is the point** — the
census result should be read before the wave order is finalized, because
a fifth or sixth unconsumed seam may belong in this build rather than the
next one.

### ⭐ Why the clinic still splits — even though both halves are in

[Issue #38](https://gitlab.com/panterasbox/saxonberg/-/issues/38) leans on
*"11 `Condition` seeds carrying `observableSigns`, with overlapping signs
— which is what makes differential diagnosis emerge."* ⚠ **Signs over
behaviourally-identical conditions are cosmetic.** Today all 23 conditions
do the same thing (nothing), so naming which one you have changes nothing
and the diagnosis is a guess at a label with no consequence.

**W8 + W9 are what make diagnosis matter.** So the split survives as a
**sequencing constraint, not a scope one**: W13 (the read side) cannot be
specified before W8/W9 settle what there is to read, and W14 (the
judgment loop) cannot be specified before W13. Building them in that order
is the difference between a diagnosis loop and a scoring rubric over a
coin flip.

⚠ W14 carries the only genuinely unsettled design in this build (see
[medic-judgment-slate](./medic-judgment-slate.md): the clinical-judgment
competence, the NGN-timeline patient, the SBAR handoff). It is **in
scope** and it is **last** — and [Q7](#open-questions) is its kill test if
the design does not close.

### ⭐ The `governs` rename — decided

[physiology-slate](./physiology-slate.md) wants `BodyPart.governsVital` →
`governs`, so a part can govern a **capacity** and not only a vital sign,
and states that its waves 2–3 are blocked on it. That is the **same axis**
as W5's capability term, and building a parallel one beside
`governsVital` is the duplication this repo exists to refuse.

Blast radius measured: **12 TypeScript references across 6 files** (3 of
them tests — `BodyPlan.ts`, `Vitals.ts`, `Attired.ts` + their tests) and
**7 YAML lines in 3 authored `BodyPlan` rows** (`biped`, `quadruped`,
`avian`). Cheap, and it unblocks a build that is otherwise stuck.

### What the slate survey folded in

| slate | its *Left* that **is** this build | stays out |
|---|---|---|
| [vitals](../tails/vitals-slate.md) *(a wave)* | the affliction driver · forensic exam verbs | medical instruments · consumable-crafting |
| [health-vertical](./health-vertical-slate.md) | the `resolution.by` dispatcher · the diagnosis surface | apothecary · public health · the College of Physic · the vet track |
| [medic-judgment](./medic-judgment-slate.md) | **both halves** → W13 + W14 | the NGN-timeline patient · the SBAR handoff (⚠ may return at W14) |
| [mortality](./mortality-slate.md) | **diminishment → W12** · the coroner economy → W16 · forensic verbs → W16 | the passage ladder · re-embodiment vendors |
| [physiology](./physiology-slate.md) | ⭐ the `governs` rename · pain as a derived reader | the organ roster · substances · prosthetics |
| [materials-response](../tails/materials-response-slate.md) *(a wave)* | repair / scrap / reforge → W15 | new channels · tissue as a construction axis |
| [combat-experience](./combat-experience-slate.md) | ⭐ **T11 aftermath → W6 · T12 de-escalation → W5 · T13 morale & surrender → W4**; T5 `g(composure)` **seam only** | T7/T8 loadout-as-chemistry · T15 the bestiary · T16 expressive authoring |
| [disease](./disease-slate.md) | the `contagion` consumer hook, iff nearly free | outbreak · quarantine · the husbandry coupling |
| [blood](./blood-slate.md) | — | all of it |

### ⛔ Still cut, and why

The scope went wide deliberately. These four stayed out, and each for a
reason that is not "no room":

- **blood / transfusion** — needs a genotype + compatibility model and a
  donation economy; that is its own build. ⭐ This build makes it *want*
  to exist, which is the correct relationship between the two.
- **composure `g()`** — ⚠ **two claimants**: combat-experience T5 and
  mind-slate's `traits-stress`. Filling it here would take another
  build's core mechanic. This build ships **the hook and does not fill
  it**; note it in both slates so it is never built twice.
- **disease content** — the `contagion` consumer may ride W8 if nearly
  free, but outbreak, quarantine and the husbandry-is-immunity coupling
  are a whole build with their own pedagogy.
- **the terms/consent lift** — [Q5](#open-questions). It is a *legal*
  primitive, it belongs next to governance and contracts, and lifting it
  from inside a combat build would give it combat's shape. Its own slate.
- **the `CombatCard`** — design F. Not a resourcing decision: a card is
  the gauge this design refuses, wearing a client costume.

---

## Not in scope

- **Generalizing poise.** See the rejected fork — the single most
  important thing this slate refuses.
- **The terms/consent lift.** Q5 — its own slate, next to governance.
- **Blood, transfusion and the donation loop.**
- **Filling `g(composure)`** — the hook ships; the axis belongs to
  `traits-stress`.
- **A `CombatCard`** — design F.
- **The limb-sever / part-promotion seam** at `AVULSION_BEHAVIOR.onset`.
- **Anything that renders poise, endurance or a wound as a number.**
