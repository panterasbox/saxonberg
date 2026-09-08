# Consequence — requirements

**Kind:** feature *(with one refactor movement and one content movement —
see Placement)*
**Leads from:** kernel — ⭐ **and its first consumer is inside the build.**
Movement IV (the clinic, the repair shop, the necropolis, the guard
contract) is the content that exercises everything Movements I–III build.
A kernel-led build that has to name an external first consumer is usually
premature; this one contains its own.

Damage in this game is resolved beautifully and then does almost nothing.
A blow is traced through armour into tissue and produces a real, sited,
lasting wound — and that wound then fails to change the fight you are in,
fails to change what you can do afterward, and leaves nothing behind that
anybody else gets paid to deal with. This build makes an injury cost
something, makes winning and losing mean something, and turns the
wreckage into other people's work.

Seeded by
[consequence-slate](../slates/builds/consequence-slate.md), which
carries the full design record, the rejected forks, and the measured
evidence behind every decision here.

---

## What already exists

⭐ **Far more than the slate assumed, and the survey shrank the build
twice.** What follows is the player-visible surface, not a code survey.

**A fight already works.** Two people can agree terms — lethal or
non-lethal, and how it stops (first blood, a yield, incapacitation,
death) — and a fight refuses to start where the world forbids it. Inside
it, a tactical contest runs: you press, you overextend, you give ground,
you can be caught open, and being outnumbered wears you down faster. A
long weapon controls until you close. Skill makes you read the fight
better and recover your footing faster; it does **not** make you harder
to kill. Six different endings are distinguished, with a named winner and
loser.

**A body already works.** Wounds are sited on real anatomy, resolved
through whatever you are wearing, and they bleed, heal, or break a limb
so you cannot hold a shield with it. You can be dying — a rescuable
window, not a flip — and a medic can pull you out of it. You leave a
corpse that decays and can be examined, and you come back as a shade.
Nine different things can kill you.

**A medic already works,** as far as three verbs go: you can look someone
over, dress a wound, and take a dressing off too early and re-open it.
Treatment quality depends on *the treater's* competence, so nobody is
their own best doctor.

**Twenty-three afflictions are authored** — hypothermia, asphyxiation,
food poisoning, venom, lead, carbon monoxide, dread — each with the signs
a looker would notice.

**Fifty-eight Disciplines are catalogued,** including `blades`, `darts`,
`unarmed`, `sports`, `guarding`, `awareness`, `stealth` and `medicine`.
Competence in each is *estimated from what you have actually done*, and
the estimator is already sophisticated: you learn most at the edge of
your ability, and grinding easy repetitions is worth nothing.

**Armour already wears out** every time it is struck, and weapons wear
with use. Repair, salvage and sharpening are shipped verbs.

⭐⭐ **Therefore what is genuinely new here is not mechanism — it is
consequence.** Almost every part named above ends in a seam that nothing
is on the other side of:

- an affliction declares **what it does to you**, and nothing reads it;
- it declares **what cures it**, and nothing reads it;
- winning a fight **notifies the winner and the loser**, and nobody is
  listening;
- the record of what you have done can record a **failure**, and nothing
  has ever written one, so nothing in the world can make you worse at
  anything;
- a burn and a bruise are **numbers that count down** and do nothing
  else;
- being wounded **does not affect the fight you are losing**;
- armour wears out and **nobody sells the repair**;
- a corpse's evidence decays and **there is no examiner**.

Six of those are the same defect wearing different clothes. This build's
first act is an instrument that finds the rest of them.

---

## Goals

- **A wound changes the fight it happened in.** Being cut costs you
  position; staying cut keeps you losing. First blood means something.
- **An injury takes something away.** Not a number — a capability, a
  reserve, or a treatment you now need. Different insults take different
  things.
- **An affliction does what its author says it does**, and is cured by
  what its author says cures it — with no engine work per affliction.
- **A new kind of affliction is authorable.** Today each one has needed
  its own engine mechanism; after this, an author writes a row.
- **Winning and losing are certain, legible, and consequential.**
  Everyone knows who won, both sides feel it, and what it costs is
  visible to the person paying.
- **Winning advances the Disciplines you actually used; losing sets them
  back** — bounded so that a long record cannot be erased by a bad week.
- **Dying punishes you across the board, temporarily, and never rewrites
  your history.**
- **Somebody gives up.** An opponent can break, surrender, or be talked
  down, so a fight is survivable by someone with no martial skill.
- **A fight leaves work for people who were not in it** — a patient, a
  broken harness, a body, a contract to stand guard.
- **A person can find out what is wrong with somebody**, and be wrong.
- **Every expectation a multiplayer-RPG player arrives with is either met
  or deliberately defied, and written down** (see Surface decisions).

## Non-goals

- **Blood typing, donation and transfusion** → [blood-slate](../slates/builds/blood-slate.md).
  This build creates the demand; the supply is its own cycle.
- **Outbreaks, quarantine and contagion content** → [disease-slate](../slates/builds/disease-slate.md).
  The route by which an affliction *could* spread may be wired if it is
  nearly free; nothing that spreads ships here.
- **The stress/composure axis** (how being frightened, exhausted or
  inspired changes your fighting) → [mind-slate](../slates/builds/mind-slate.md)
  and combat-experience Thesis 5. ⚠ **Two builds claim this and it must
  not be built twice.** This build leaves the slot open and empty.
- **Lifting terms-and-consent into a general agreement primitive** →
  a new slate beside contracts and governance. It is a *legal* idea, and
  lifting it from inside a combat build would give it combat's shape.
- **A combat panel in the client** → [combat-slate](../slates/builds/combat-slate.md).
  Deliberate: a panel is the gauge this design refuses, wearing a client
  costume. The fight is narrated.
- **Severing limbs** → nowhere yet, deliberately. The seam exists and
  stays unfilled.
- **Apothecary, public health, the College of Physic, the veterinary
  track** → [health-vertical-slate](../slates/builds/health-vertical-slate.md).
- **Ageing, illness of old age, natural death** → nowhere, deliberately.
  Characters do not age out; death here is violent or accidental.

## Placement

**Kernel**, for Movements I–III: a body, a fight, and what an affliction
does are engine concerns that every pack composes. No pack owns injury.

**Packs**, for Movement IV, and this is the test the build must pass:
⭐ **a second clinic, a second repair shop, a second necropolis must need
zero new code.** If a second one needs a class, the substrate is in the
wrong place. Each is a business with premises, positions, priced services
and a demand anchor — the same shape the shipped bar and general store
already use.

The **guard contract** is the sharpest instance of that test: it may well
need no engine work at all, because standing watch is exactly *holding no
other engagement*, and the work board already exists. If it does need
engine work, that is a finding worth stating loudly.

## Collisions

**Who already lives where this build reaches:**

- **The gym** — the shipped sparring venue is where non-lethal combat
  already happens. Bruises becoming a real (small) cost changes what
  training there feels like; the gym's balance benches assert outcomes
  and will move.
- **The bar** — the shipped bar-fight content is the most likely place a
  player first loses a fight. Non-lethal terms, a yield, and a bruise the
  next morning is the scene this build must make good.
- **The mine** — a cave-in and a bad blow are the same kind of injury.
  The damps, the canary and the fall are already there; they become the
  strongest non-combat consumer of everything in Movement III.
- **The dorm room** — a new player's first home is where they will wake
  up diminished. Coming back the cheap way must read correctly there.
- **The lounge** — a sanctuary that refuses fights. Nothing here may make
  the lounge a place where injury can arrive.
- **Existing NPCs with authored competence claims** — a great many
  characters assert a Discipline band in their dossier. Introducing
  *failure* as evidence must not silently re-score them.
- **Anyone currently mid-fight or dying at deploy time** — the shape of a
  wound and a fight changes; the world must not need a migration, so the
  dev database is dropped rather than migrated.

## Surface decisions

### What does winning pay? — the Disciplines you used

> **User: "winning pays is advancing the disciplines you used for the
> win. and losing regresses those disciplines."**

The reward is **intrinsic**: you get better at what you actually did, and
worse at it when you fail. No points, no purse. A fight can honestly
record that your footwork was good and your swordwork was not.

**Why this is safe** — the estimator already refuses to be farmed: two
hundred easy victories leave you *competent* and no further, and you only
learn near the edge of your ability. So the only route up is fighting
people who might beat you, and the only reason that is a *decision* is
that losing costs something.

⚠⚠ **Bounded, and this was measured rather than assumed.** Run as it
stands, six ordinary losses reduce a genuine expert to untrained, and
losing repeatedly to people far above you is the *worst* case rather than
the mildest. Two limits are therefore part of the product:

1. **You do not forget how to ride a bike.** A long record of doing
   something well cannot be erased by a bad run — there is a floor
   beneath which failure cannot push you.
2. **Losing to your betters never diminishes you.** Being outmatched is
   not evidence about you.

**Alternative rejected:** a purse, a token, or renown alone. Renown is
*standing*, which the polity confers; competence is *measurement*, which
the world takes. Paying a win in standing would have the engine deciding
what the polity values.

### What does dying cost? — everything, briefly, and it is punishment

> **User: "the repercussions for dying aren't the game trying to be
> honest or teach you, it's just punishment. negative reinforcement…
> I kinda want the dying to punish you across the board."**

**Losing a fight and dying are different in kind**, and must be:

| | losing a fight | dying |
|---|---|---|
| what it is | honest measurement | punishment |
| how wide | the Disciplines you needed | **everything** |
| honest? | yes | **no — and it cannot be** |
| recovers? | no, but floored | **fully, on its own** |
| touches your history? | **yes, truthfully** | **never** |

⭐⭐ **Why punishment is legitimate here.** An honest simulation of death
is that you are gone. This game already refuses that — you come back. So
the death-and-return arc is *already* an abstraction, and one cannot be
"honest" about a death one is undoing. What it costs is therefore a
design choice, governed by the standing rule that an abstraction is
legitimate while it still costs somebody the activity.

⚠⚠ **The invariant that keeps this from corrupting a measured world:
punishment may be arbitrary; the record may never be false.** Dying in a
mineshaft must not write *"failed at cooking"* into your history — every
later reader would reason from a lie. So death **suppresses what you can
currently express**, uniformly, and tapers away. Your history is
untouched.

You can be an expert swordsman who currently cannot hold a sword.

**Rarity:** dying should be rare, and it is made rare by the rescuable
window rather than by a dial — which is another reason the medic in
Movement IV is not decoration.

### Player expectations — meet or defy, stated

> **User: "players have some very specific expectations for gameplay on a
> multiplayer RPG. we have to either meet them or explicitly defy them,
> but as far as I know, we've never even had the conversation."**

⭐ **This table is that conversation**, and it is a deliverable: none of
these should be discovered by a player as a surprise.

| expectation | verdict | instead |
|---|---|---|
| a hitpoint number | ⛔ defied | a described condition, and named injuries |
| combat is a race to zero | ⛔ defied | the *contest* is the race; the wound is the stake |
| a potion heals you to full | ⛔ defied | healing is time, treatment, and somebody's skill |
| dying costs you experience | ⛔ defied | your history survives; you are briefly diminished |
| levels make you harder to kill | ⛔⛔ **defied hardest** | skill wins you the *contest*; a knife in the neck kills anyone |
| elemental resistances are a character stat | ⛔ defied | resistance belongs to your armour and your flesh |
| a corpse run | ✅ met, and better | your gear is on a body that decays and can be *examined* |
| you can flee or surrender | ✅ met | yielding records a loss; backing down records none |
| gear degrades; a smith matters | ✅ met | armour wears every time it is struck |

⚠ **Levels-buy-survivability is the one that will hurt**, and it is the
one to say loudest in player-facing material.

### Combat is a minigame

Combat is resolved *inside* the larger game, not as it. How often anyone
fights is content's decision, so the engine must make a fight
**affordable to lose** rather than assume a frequency.

⚠ And the failure to design against: violence that only ever advances
violence is a sealed economy. Every part of this build is checked for
whether it leaks *into and out of* the martial branch — which is what
Movement IV is for, and why a non-martial Discipline must be able to
matter in a fight.

### The armour case

> **User: "it flips from everyones in the hospital to no one ever gets
> hurt unless their armor fails… we have to design content for that
> specific failure mode."**

Both horns are already answered by how a blow is resolved: **armour does
not buy immunity, it buys a margin in the contest.** Steady on your feet,
an armoured fighter takes nothing; caught open, the same armour does not
save you. You bleed when you are *losing*, not when you are touched.

That holds only while armour stays costly, which makes it a **content
obligation**: it wears, it is heavy, it is hot, and it is expensive.

⭐ And the consequence is not a failure mode at all: **a world where a
blade cannot beat plate is a world where you poison the wine.** Every
route around armour already exists — fire, poison, drowning, falling,
electricity, the gap in the harness — and content wanting a threat
against armoured people should reach for one of those rather than a
bigger number. **Who can afford not to get hurt then becomes a political
question**, in a game about political questions.

---

## Lens pass

**1 · Pedagogy.** Exercises `medicine` (diagnosis from signs, where the
signs overlap and the answer is not given), `smithing` (repair as a
trade), `awareness`, and the martial branch. ⭐ The consequence model is
per-*consequence* rather than per-damage-type, because that teaches what
happened to a body rather than which resistance to stack — and a burn
killing by fluid loss is real trauma physiology, not a game abstraction.
The world stays derivable: blow → armour → flesh → consequence, readable
at every step. ⚠ Lens 1 is also what demands the floor on regression:
ten defeats by a master making you a beginner teaches demoralization, not
learning.

**2 · Creative expression.** The ordinary case is a row an author writes:
what an affliction does, what cures it, what it looks like. Today every
new affliction has needed engine work, which is the plainest possible
statement that this lens is currently failing. The bespoke case survives:
an act can record several Disciplines at several difficulties with
different outcomes each. ⚠ Gap: the martial Disciplines that already
exist as content are not what a fight credits; a weapon should say what
skill it exercises.

**3 · Immersion & roleplay.** Everything here is narrated, nothing is
gauged. *"I have been off my game since he beat me"* is a story; a number
going down is not. ⭐ The floor is what makes it *feel* honest — a veteran
who loses is rusty, not reset, and players will notice if the model lies
about them. Roles emerge rather than being declared: nobody announces
they are the town medic, they are the person people come to.

**4 · Gamification & self-improvement.** ⭐⭐ **The choice it forces: do I
take this fight?** Today that is free — there is no cost to losing, so
there is no reason to weigh an opponent. With consequence on both sides,
opponent selection becomes the decision, and the pedagogy and the
gameplay want the same thing: fight slightly above yourself. Standing is
conferred by the polity, never by the engine; competence is measured, not
awarded. ⚠ Gap recorded: how *much* a win advances you is a tuning
question this build will have to answer with numbers it does not yet
have.

**5 · Epochs.** Physiology is epoch-invariant: plasma leaks from a burn
in Rome and in New York. Only the dynamics move — the armour becomes a
vest, the medic a surgeon, the dressing a drip. Magic sits on the same
table and is dangerous precisely because it **skips the contest** rather
than winning it. Nobody in the fiction ever sees a number; a Roman knows
they lost.

---

## The drive

Run against the live game before the MR opens.

**A fight that resolves**

1. Spar someone at the gym under non-lethal terms. → Every exchange
   tells you where you stand — you press, you give ground, he is where
   your blade should be. Nothing shows you a bar or a number.
2. Keep pressing until you are caught open, and take a hit. → You are
   told you were cut, *and* that it cost you your footing. The fight
   turns audibly against you.
3. Yield. → The fight ends, unambiguously, and you are told you lost.
4. Look yourself over. → You are bruised and it is described. You are not
   in danger.
5. Check what you are good at. → The Disciplines that fight exercised
   have moved, and the ones it did not are untouched.

**Losing to someone far better**

6. Pick a fight with somebody far above you, and lose it badly. → You are
   beaten. **Your competence is not reduced** — being outmatched says
   nothing about you.
7. Now lose five ordinary fights to an equal. → You *have* slipped, and
   you can see it. But you are not returned to untrained, and a long
   record shows.

**An injury that takes something away**

8. Take a heavy blow to the arm you carry a shield on. → You cannot use
   the shield. Not a penalty — the option is gone.
9. Get burned. → It is described as a burn, not a cut. A bandage is
   refused or useless; you need fluid and time.
10. Get poisoned or chilled instead. → What is wrong with you actually
    changes your body, and it is a *different* thing from the burn.

**The medic**

11. Have somebody with no medical training look you over. → They can see
    something is wrong and cannot name it.
12. Have a trained medic look at the same body. → They name it, and they
    are reading the same signs.
13. Present a body whose signs fit two different afflictions. → The medic
    must **choose**, and can choose wrong, and the body's course tells
    them which it was.
14. Treat correctly. → It works, it consumes supplies, and the medic is
    paid by a patient rather than by the world.

**Dying**

15. Die — of anything, not a fight. Bleed out, or freeze, or fall.
16. Come back the cheap way. → You are diminished at **everything**, not
    just at what killed you, and you can feel it immediately.
17. Check your history. → It is **unchanged**. Nothing recorded that you
    failed at anything.
18. Wait, and check again. → The diminishment is lifting on its own.
19. Ask what a temple or clinic would have charged. → There is a better
    way back, and it is somebody's business.

**The wake**

20. Take your dented harness to a repair shop. → Somebody fixes it, for
    money, and the wear was real.
21. Visit the body of somebody who died. → It can be examined, what
    killed them can be read from it, and the reading gets worse the
    longer it lies there.
22. Post a job to have somebody guard you while you work. → Somebody can
    take it, standing watch is genuinely all they can do while doing it,
    and they are paid.

**The non-fighter**

23. As a character with no martial skill, walk into a fight you cannot
    win. → You can yield, back down, or be talked out of it, and you
    survive it.
24. Try the same against an animal. → It behaves differently from a
    person, and the difference is honest.

---

## Acceptance criteria

- A player who is cut mid-fight **can tell the fight turned**, from prose
  alone, without any number being shown.
- A player who loses a fight **can name which of their skills it cost
  them**, and it is the ones the fight used.
- A player with a long record of doing something well **cannot be reduced
  to a beginner** by a run of bad luck, and can say so from what the game
  shows them.
- A player who is beaten by someone far better **is not diminished for
  it**.
- A player who dies **is worse at everything for a while, and their
  history is intact** — both facts visible to them.
- A player can tell **a burn from a cut from a poisoning** by what it does
  to them and what fixes it, not by a label.
- An author can add a new affliction — what it does, what cures it, what
  it looks like — **by writing a row, with no engine change**, and a
  player then meets it in the world.
- A medic can be **wrong** about a diagnosis, find out they were wrong,
  and the world does not tell them the answer up front.
- A character with **no martial skill can be present at violence and
  survive it** without winning.
- Somebody who was not in the fight **earns money because it happened** —
  at minimum a repair, a treatment, and a burial.
- A second clinic, a second repair shop, and a second necropolis are
  **authored with no new code**.
- Every row of the meet-or-defy table is **true of the shipped game**.

---

## Cross-references

- [consequence-slate](../slates/builds/consequence-slate.md) — the design
  record, the rejected forks, the measured evidence
- [combat-slate](../slates/builds/combat-slate.md) ·
  [combat-experience-slate](../slates/builds/combat-experience-slate.md)
- [medic-judgment-slate](../slates/builds/medic-judgment-slate.md) ·
  [health-vertical-slate](../slates/builds/health-vertical-slate.md)
- [mortality-slate](../slates/builds/mortality-slate.md) ·
  [physiology-slate](../slates/builds/physiology-slate.md)
- [vitals-slate](../slates/tails/vitals-slate.md) ·
  [disease-slate](../slates/builds/disease-slate.md) ·
  [blood-slate](../slates/builds/blood-slate.md)
- Subsystems: [harm](../subsystems/harm.md) ·
  [combat](../subsystems/combat.md) ·
  [mortality](../subsystems/mortality.md) ·
  [vitals](../subsystems/vitals.md) ·
  [advancement](../subsystems/advancement.md) ·
  [materials-response](../subsystems/materials-response.md)
- Issues: #38 (the clinic) · #39 (the repair shop) · #40 (the necropolis)
