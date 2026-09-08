# Consequence slate — what an injury costs, and who it puts to work

> **Status: PARTIAL** — the substrate is all shipped (harm · combat ·
> mortality · poise · materials-response); the **consequence layer** over
> it is not.
> **Left:** the wound→poise edge · the consequence table (`signature`
> wired · burn's fluid loss · contusion's cost) · the wake (medic ·
> armorer · coroner · guard as *demand*) · the non-martial composure hook
> **Size:** a build

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
part D fills from the non-martial side**) ·
[blood-slate](./blood-slate.md) (the *other* consumer of a bleed that
bites) · [medic-judgment-slate](./medic-judgment-slate.md) (⭐ the demand
this slate creates is that slate's missing patient).

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

## The gap in one sentence

**Damage is resolved beautifully and then does almost nothing**, and a
fight leaves no wreckage anybody gets paid to clean up.

Both halves are the same omission seen from two ends: an injury that
costs the victim little also creates no work for anyone else.

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

## Finding 2 ⭐⭐ — the consequence channel is declared, empty, and unread

The Kind-A affliction template declares `signature: VitalEffect[]` — *how
this perturbs vital signs*. It is the dictionary the conversation went
looking for.

- **23 of 23** authored `Condition` rows carry `signature: []`.
- **Zero** call sites read `getSignature()` — the only occurrence of
  the name in the server tree is its own declaration
  (`platform/idea/Condition.ts:674`). The similarly-named
  `lib/studio/Blueprint.ts` method is unrelated.

So hypothermia, asphyxiation, ptomaine, venom, lead, carbon monoxide and
dread each declare how they change a body and each declare *nothing*, and
nothing would read it if they did.

⚠ This is the **best** state to start from: the shape was designed
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

**Q6 — does the guard job need an engine seam at all?** Part C.4 may be
pure content over the shipped contract board and engagement slots. If it
is, that is a finding worth stating loudly, because it means the most
important interplay job in the game costs zero kernel code.

---

## Rough phases

0. **The audit as a test.** Pin the couplings table above — a
   characterization test per row, so the two absent edges are absent *on
   purpose* and the ten present ones cannot silently regress.
1. **Close the loop** (design A). Wound → poise, with the recovery cap
   behind a dial.
2. **The consequence table** (design B). Wire `signature`; author the 23
   rows; burn's fluid loss; contusion's cost; the `capability` term
   generalized off fracture.
3. **The wake** (design C). Medic demand first (it consumes phase 2
   directly), then the armorer, then the guard contract.
4. **The composure hook** (design D) — coordinated with combat-experience
   Thesis 5, or deferred to whichever build reaches it first.

Phases 1 and 2 are a build on their own and phase 3 is the reason to do
them. Phase 4 is separable.

---

## Not in scope

- **Generalizing poise.** See the rejected fork.
- **The terms/consent lift.** Q5 — its own slate.
- **The forensic examination verbs.** Named-and-deferred in mortality.md;
  the coroner in part C is the *demand*, not the verb suite.
- **The limb-sever / part-promotion seam** at `AVULSION_BEHAVIOR.onset`.
- **Anything that renders poise, endurance or a wound as a number.**
