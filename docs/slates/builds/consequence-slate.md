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

## ⭐⭐ Combat is a minigame — the scope statement

> **User: "combat is essentially a minigame, that's how I approach
> incorporating it into the larger design… if you play a martial style of
> game, you can expect to be constantly fighting. but you don't have to
> play those games that way at all… the game still affords you a sense
> that you're competing in the same space with all the other players."**

The Paradox model: combat is resolved *inside* the grand game, not as the
grand game. Two consequences this build is bound by:

- **Cadence is content's call, not the engine's.** How often anybody
  fights is decided by what content developers write, so the engine must
  make a fight *affordable to lose* rather than assume a frequency.
- ⚠ **The D&D loop is the failure to design against, and it recurs one
  level down.** D&D's XP comes from violence and is spent on violence — a
  sealed economy. Disciplines break that at the top level, but **if
  martial Disciplines are advanced only by fighting and useful only for
  fighting, the fighter is in the same sealed room with better
  furniture.** Every design in this slate should be checked for whether
  it leaks *into and out of* the martial branch.

---

## ⭐⭐⭐ Player expectations — meet or defy, stated

> **User: "players have some very specific expectations for gameplay on a
> multiplayer RPG. we have to either meet them or explicitly defy them,
> but as far as I know, we've never even had the conversation."**

**This table is that conversation.** Every row is a defiance we are
choosing, or a convention we are keeping, and the point is that none of
them should be discovered by a player as a surprise.

| expectation | verdict | what we do instead |
|---|---|---|
| an HP number | ⛔ **defied** | a derived band + named injuries; poise carries the per-exchange read |
| damage is a race to 0 | ⛔ **defied** | poise is the race; the wound is the stake |
| a potion/heal returns you to full | ⛔ **defied** | healing is time, treatment and a Discipline |
| XP loss on death | ⛔ **defied** | the Transcript survives; the cost is a temporary global suppression (design G) |
| levels buy survivability | ⛔⛔ **defied hardest** | advancement buys the **contest** (`Sharpness` → poise recovery + read-fog), never the body. A knife in the neck kills a veteran |
| elemental resists as a character stat | ⛔ **defied** | resistance is a property of your **armor and tissue**, not of you |
| a corpse run | ✅ **met, and better** | your gear is on a decaying **forensic** object others may loot *or examine* |
| you can flee / surrender | ✅ **met** | `yield` (records a loss) and backing down (records none) both ship |
| gear degrades and needs a smith | ✅ **met** | armor wears per blow; the repair shop is W15 |

⚠ **The one that will hurt most is levels-buy-survivability**, and it is
the one to state loudest in player-facing material. It is also the one
the design is most confident about — see
[the three clocks](#the-three-clocks).

---

## ⚠ The armour failure mode — the case content must be designed for

> **User: "you can mitigate this with armor and such, and that's how
> humans really dealt with a violent world. but then it flips from
> everyones in the hospital to no one ever gets hurt unless their armor
> fails. not a dealbreaker but we have to design content for that
> specific failure mode."**

Both horns are real and the shipped `energyFor(band)` already resolves
them — **armour does not buy immunity, it buys a margin in the poise
contest.** At `steady`/`pressed` an armoured fighter takes 1.2–1.6 and
the fold eats it; at `broken`/`open` it is 3–4.5 and the fold does not.
**You bleed when you are losing, not when you are touched.**

But that only holds if armour stays *costly*, so this is a content
obligation as much as an engine one:

- **it wears** — already true (`craftingWearArmorPerBlow × seamWear`), and
  W15 gives the wear a shop to be repaired at;
- **it is heavy** — encumbrance ships and bites;
- **it is hot, and it is expensive** — content's job.

⭐ And the interesting consequence is not a failure at all: **a world
where a blade cannot beat plate is a world where you poison the wine.**
The routes around armour are all shipped and all more interesting than a
bigger sword — fire, electricity, poison, drowning, falling, the gap in
the harness. ⚠ **Content that wants a threat against armoured people
should reach for one of those**, not for a bigger number.

⭐⭐ **Who can afford not to get hurt is then a political question**, in a
game about political questions — lenses 1 and 4 choosing the limb, not a
compromise.

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

## Finding 6 ⭐⭐⭐ — competence can only go up

**The fifth instance of this slate's one pattern, and the one that
answers [Q8](#open-questions).**

`Outcome` declares four values:

```ts
export type Outcome = "failure" | "partial" | "success" | "critical";
```

**Production code has never written `failure` or `partial`.** Every
`ActSignature` minted anywhere in the kernel or the thirty-six packs
carries `success` or `critical`; the only four `failure` literals in the
tree are in `lib/advancement/__tests__/`.

⭐⭐ So the BKT estimator's entire **negative-evidence path** — documented
in its own header, *"a master can fail a formidable task… a formidable
failure is unsurprising and barely moves the estimate"* — **has never
been exercised outside a unit test.** Competence is a ratchet that only
ratchets one way, and nothing in the world can make you worse at
anything.

Combat already mints per-exchange signatures
(`CombatLogic:4946`, `:4955`, and a captain's at `:4566`). All
`outcome: "success"`.

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

- **Winning pays — ✅ decided: the disciplines you used.** Not a purse,
  not a token: you get better at what you actually did, and **losing
  makes you worse at it**. `Outcome` already has `failure`; nothing has
  ever written one (Finding 6). The BKT's difficulty coupling means
  losing to a monster barely dents you while losing to your equal
  stings, and its ZPD gate means beating novices teaches nothing — so
  the rule cannot be farmed and cannot spiral. See
  [Q8](#open-questions).
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

### G. ⭐⭐⭐ Losing ≠ dying — two layers that must never be one

> **User: "losing a fight may hurt you but it hurts you along whatever
> disciplines you needed to win… dying should be something different…
> the repercussions for dying aren't the game trying to be honest or
> teach you, it's just punishment. negative reinforcement… I kinda want
> the dying to punish you across the board."**

| | **losing a fight** | **dying** |
|---|---|---|
| what it is | **measurement** — honest evidence | **punishment** — negative reinforcement |
| scope | the disciplines you needed to win | ⭐ **across the board** |
| writes to | the **Transcript** (the ledger) | a **Condition** on the body |
| must be honest? | **yes** | ⭐ **no — and it cannot be** |
| recovers? | no, but **floored** | **fully**, on its own |
| seam | `ActSignature` at `onDefeated` | a suppression term on `competenceBandFor` |

#### Why "punishment" is not a betrayal of the sim here

⭐⭐ **An honest simulation of death is that you are gone.** This game
already refuses that — the shade, `reembody`, the `passage` floor. So
**the entire death-recovery arc is an abstraction, not a simulation**,
and you cannot be *honest* about a death you are undoing. Once that is
true, what death costs is a **design** choice, and the governing rule is
already written: [uncertainty.md](../../uncertainty.md)'s abstraction law
— *an abstraction is legitimate while it still costs somebody the
activity.*

⚠ This is worth stating because it will otherwise be relitigated by
someone (reasonably) applying the honest-sim doctrine to the one place it
does not reach.

#### ⚠⚠ The invariant: punishment may be arbitrary; the RECORD may never be false

So death must **not** write failure evidence across every Discipline.
That would put a lie in the Transcript — *you failed at cooking* because
you died in a mineshaft — and every downstream reader (competence, the
dossier, the clinic's graded judgment, standing) would then reason from a
falsehood. Ledgers in this codebase are re-scorable precisely because
nothing false is ever appended.

**Suppress expression; never falsify the record.** That single rule is
what keeps a punitive death from corrupting a measured world.

#### The seam — one method, already there

⭐⭐ `competenceBandFor` is the **single read surface** for competence, and
**nothing modifies it anywhere today**. Every consumer goes through it:
`Spell.requiredBand` (competence *is* access), stealth
(`ArmController`/`HideController`), medicine (`Treat`/`Assess`),
awareness (`PerceptionLogic`), `practice`, and combat sharpness.

So a suppression term applied there is **across-the-board by
construction**, with zero per-consumer work. That is the mechanism the
user's *"whatever that means for us"* resolves to.

#### `recovering` becomes this build's reference implementation

The seed already ships with everything it needs and uses none of it:

```yaml
signature: []                       # ⛔ dead channel — this build wires it
progression: { intervalMs: 3600000 }  # an hourly stage clock → it can TAPER
resolution: { by: rest }              # ⛔ dead channel — self-clearing
```

⭐ So `recovering` is a condition whose stage decays hourly, suppressing
`competenceBandFor` by a margin derived from that stage, tapering to
nothing. It keeps mortality's two shipped constraints (*unpleasant never
dangerous* — it touches no vital sign; *legible* — `assess` reads it),
and it exercises **three** of this build's own mechanisms (the effect
channel, a progression law, `resolution.by`) on the one condition that
most needs them.

⭐ **The floor and the suppression never conflict, because they are at
different layers.** The floor protects the *record*; suppression operates
on *expression*. You can be an expert swordsman who currently cannot
hold a sword.

#### On rarity

⚠ The severity of the penalty and the length of the rescue window are
**one decision, not two**: harsh-and-rare is tension, harsh-and-common is
why people quit. And death is made rare by the **dying clock** — most
lethal events are survivable if somebody is there — which means *"death
should be rare"* is a consequence of the wake (movement IV) existing, not
a separate dial.

---

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

**Q8 — what does winning pay? ✅ DECIDED.**

> **User: "winning pays is advancing the disciplines you used for the
> win. and losing regresses those disciplines."**

⭐⭐ **This needs almost no new machinery, because it is the unused
three-quarters of a vocabulary that already shipped** (Finding 6). The
reward is *intrinsic* — you get better at what you actually did — which
is the anti-XP move stated as a mechanism: no points, no purse, just
competence, measured.

⚠⚠ **CORRECTION, measured 2026-09-08.** An earlier draft of this section
claimed the difficulty coupling prevents a death spiral. **It does not.**
The per-observation damping is real; the *accumulation* is not bounded,
and the estimator was run to find out:

```
200× easy successes            → competent (θ=0.612, saturated)   ✓ farming is dead
50× hard✓ then 1 loss          → Δθ = −0.0001                     ✓ the bike property
one loss: easy −0.22 · formidable −0.036                          ✓ difficulty coupling

20× hard✓ (expert, θ=0.9975) + 4 standard failures   → novice     ✖
                             + 6 standard failures   → untrained  ✖
10× standard✓ (proficient)   + 10 formidable failures → untrained ✖✖
```

**Six losses erase a genuine expert**, and losing repeatedly to people
*far above* you takes you from proficient to untrained — exactly
backwards. Classic BKT assumes a learner moving through a curriculum, not
a master with a decade of record: no floor, no recency weighting.

⭐ **Two invariants fix it, and they are the user's own objections made
explicit rather than left to emerge:**

1. **A floor — the high-water mark.** The estimate may fall, but never
   below one band under your best-ever. *You do not forget how to ride a
   bike*, stated rather than hoped for.
2. **Failures above your band contribute nothing** (rather than a
   little). Losing to your betters can then never reduce you, by
   construction.

**What the couplings DO give for free** — all verified above:

| situation | difficulty | what the estimator does | why that is right |
|---|---|---|---|
| lose to someone far above you | formidable | high slip → the failure was *expected* → **barely moves** | no punishment for being outmatched; **no death spiral** |
| lose to someone you should have beaten | standard | surprising → **this is what regresses you** | the loss that should sting, does |
| beat a novice as an expert | trivial | high guess → success expected, **and ZPD learn rate ≈ 0** | ⭐ **it cannot be farmed** |
| beat someone at your edge | hard | the surprising evidence dominates | you learn where learning happens |

**The user's rule is safe precisely because the estimator was built right
and then only half-used.**

**What the work actually is** — all of it lands on **W3**, in the two
empty hooks:

1. `onDefeated` mints the loser's signature with `outcome: 'failure'`;
   `onDefeatedFoe` mints the victor's. The hooks stop being no-ops and
   the outcome model gets its first implementers.
2. ⭐ **Difficulty derived from the opponent** (their competence band
   against yours). This is the genuinely new piece, and it is the term
   that makes the whole thing fair.
3. ⚠ **"Disciplines" is plural and the code has one hardcoded string.**
   `MELEE_COMBAT_DISCIPLINE = "melee-combat"` is a lone constant, while
   `ActSignature.discipline` is already a **list** of per-discipline
   sub-checks with per-discipline outcomes. So a fight can honestly
   record *footwork went well, swordsmanship did not* — but something has
   to declare which disciplines a given fight exercised. Weapon profiles
   are the obvious home; command and awareness are the obvious
   additions.

⚠ **The one consequence worth staring at before building it: nothing in
this game has ever taken competence away.** Regression is a genuinely
new player experience, it interacts with Q9's diminishment, and it is the
first mechanism that can make a character *worse*. That is the right
design — a world where practice only ever pays is not one where losing
means anything — but it should ship with its numbers visible and
deliberately gentle at the formidable end.

**Q9 — what IS diminishment? ✅ DECIDED** — see [design G](#g--losing--dying--two-layers-that-must-never-be-one).
A **global, temporary suppression of `competenceBandFor`**, carried by the
`recovering` condition, tapering on its shipped hourly `progression`
clock, clearing itself through `resolution: { by: rest }`. It is
punishment rather than measurement, it is uniform rather than
cause-specific, and it **never touches the Transcript**.

⚠ **Open sub-questions, all tuning rather than shape:** how many bands
(one is the obvious start); over how many hours; whether it floors at
`untrained` or can suppress below it; and whether a *service* revival
(a temple, a clinic) buys a shallower suppression, a shorter taper, or
both — that is the competitive axis mortality.md wants and it needs no
engine work.

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
| **W3** | ⭐ the outcome model + **the floor** | `onDefeated`/`onDefeatedFoe` get implementers. **Q8 decided:** winning advances the disciplines you used, losing regresses them — via `outcome: 'failure'`, which production has never written (Finding 6). Difficulty from the opponent's band (design E) |
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
| **W12** | ⭐ diminishment | **Q9 decided:** a global, temporary suppression on `competenceBandFor` carried by `recovering` — punishment, not measurement; uniform, not cause-specific; **never touches the Transcript** (design G). ⭐ It exercises the effect channel, a progression law and `resolution.by` at once — this build's reference implementation |

**Movement IV — the wake** (arrow ③): violence as demand.

| | wave | what |
|---|---|---|
| **W13** | the diagnosis surface | issue **#38a** — cues without names, the `analyze` read, the instrument gate. The **read side** of W8/W9 |
| **W14** | the judgment loop | issue **#38b** — stop auto-selecting; triage under the deterioration clocks; decision-graded `ActSignature` |
| **W15** | the repair shop | issue **#39** — content pass, ~600 lines mostly YAML, no engine |
| **W16** | the necropolis | issue **#40** — content pass + the forensic examination verbs the decay curve has been waiting for |
| **W17** | the guard contract | Finding 5.2 over the shipped contract board — ⭐ possibly zero kernel code ([Q6](#open-questions)) |

### ⭐⭐ W0c — `lint:unconsumed-seams`, and why it is the most valuable wave

Five of this slate's six findings are **the same defect**: a
correctly-designed seam with nothing on the consumer end.

| seam | consumers |
|---|---|
| `Condition.signature` | 0 |
| `Condition.resolution` | 0 |
| `Condition.contagion` | 0 |
| `Combatant.onDefeated` / `onDefeatedFoe` | 0 |
| `Outcome.failure` / `.partial` | 0 (tests only) |

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
