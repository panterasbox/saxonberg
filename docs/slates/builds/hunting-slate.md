# Hunting slate — the fugitive resource

> **Status: design surface, unbuilt, no phase gate passed.** Spun out of the
> [farmstead](../../requirements/farmstead-requirements.md) design pass
> (2026-09-03), whose D60 put deer, rabbits and boar on a farm as **ongoing
> pest pressure** and then had nowhere to send them. Hunting is where they go —
> and it turns out to carry the hardest property question in the game.
>
> ⚠ **Foraging is NOT here.** [discovery-slate](./discovery-slate.md) owns
> gathering in full and this slate does not restate it. What hunting adds is
> the one thing forage does not have: **the resource moves.**
>
> **Owner: the Wardens.** The [guild slate](./guild-slate.md) already assigns
> survival, tracking, awareness/stealth, hazard-craft and taming to them, with
> a demand anchor of *"hazard abatement for landholders — parcel owners pay to
> clear traps/beasts"* plus the pet supply chain. Hunting is their core, not
> the Grange's.

See also: [discovery-slate](./discovery-slate.md) (**foraging — the sibling,
and the pattern this borrows**) · [guild-slate](./guild-slate.md) (the Wardens)
· [pets-slate](./pets-slate.md) (taming is the same encounter, other outcome) ·
[legal-code-slate](./legal-code-slate.md) + [policing-slate](./policing-slate.md)
+ [enforcement-slate](./enforcement-slate.md) (game law) ·
[field-substrate-slate](./field-substrate-slate.md) (seeded × derived) ·
[species-slate](./species-slate.md). Substrates:
[stealth.md](../../subsystems/stealth.md) (`TrapKit`, ambush) ·
[hazard.md](../../subsystems/hazard.md) · [ranged.md](../../subsystems/ranged.md)
(the band ladder, aim × answer) · [parcel.md](../../subsystems/parcel.md) ·
[watershed.md](../../subsystems/watershed.md) (**the rights precedent**) ·
[behavior.md](../../subsystems/behavior.md) · [harm.md](../../subsystems/harm.md).

---

## The frame — the pest *is* the resource

Farmstead D60 gives a holding ongoing animal pressure: deer and rabbits in the
crop, birds on the grain, boar rooting a field overnight. Those are **meat.**

> **You do not have a deer problem. You have a deer opportunity — and which one
> it is depends entirely on whether you can take it.**

That closes a loop the farm otherwise leaves open, at no extra cost, and it is
historically exact: subsistence agriculture always included taking game, and the
question of *who was allowed to* is the rest of this slate.

---

## ⭐⭐⭐ Ferae naturae — the property question the rest of the game lacks

Everything in farmstead is crisply owned. Ground has title, stock has a chattel
id, a crop belongs to whoever grew it. **Game belongs to nobody.**

A deer standing in your field walked there and will walk off. Under
*ferae naturae* a wild animal is owned by no one until **reduced to
possession** — which makes game the classic **fugitive resource**, the same
doctrine as water and as oil and gas, and the same reason both are governed by a
*rule of capture* that nobody is happy with.

**The machinery precedent already ships.** The water build models rights over a
resource that crosses titles — prior appropriation **recorded**, riparian
**derived** — so a resource whose ownership cannot be settled by looking at the
ground beneath it is not a new problem here. Game is that problem with legs.

> This is the property surface the farmstead build could not produce, because
> everything it models sits still.

---

## ⭐⭐ Game law — and the ambiguity is the content

Forest law, the Game Acts, the Black Act. The historically interesting thing
about game law is its *shape*:

> **It protects a resource by restricting WHO may take it, not HOW MUCH is
> taken.**

Which means the identical statute is legible two ways, and **both readings are
true at once**:

- as **conservation** — a limit that keeps a shared stock from collapsing;
- as **privilege** — a rule that reserves a commons for the people who already
  have land.

That is not a manufactured dilemma; it is the actual historical argument, and it
ran for six centuries. A polity in this game can pass such a law, mean the first
thing, and be accused of the second — with both sides able to point at real
consequences. **Superb civics content**, and it needs no authored villain.

**Open, and it is the good question:** *whose* crime is poaching — the
landholder's, or the polity's? The answer decides whether enforcement is
private (a gamekeeper the holder employs, i.e. a Warden contract) or public (an
office with a warrant). Both are expressible on shipped substrate, and the
choice is a real constitutional one rather than an implementation detail.

---

## ⭐⭐ Depletion is shared whether you like it or not

Discovery-slate settled foraging's version: **depletion is a choice, not a
tragedy** — you can decide to strip a patch, and that is a legitimate decision
with a cost you bear.

**Game breaks that, and the break is the whole reason this is a separate
slate.** Because the animals move, *your neighbour's hunting depletes your
deer*. You cannot fence it, you cannot husband it privately, and restraint by
one party is a gift to everyone else. That is the tragedy of the commons
proper — the version foraging deliberately avoids — and it is why real game
regimes are always **collective**: close seasons, bag limits, licences,
gamekeepers, or a lord who owns the deer outright.

So the two slates are complements, not duplicates: **forage teaches that
depletion is a decision; game teaches that some depletion decisions are not
yours alone.**

---

## The method ladder — and tracking is the fourth instance of the house pattern

The instrumentation split applies: readings are channels, procedures are verbs.

| Rung | What it is |
|---|---|
| **Sign** | reading the ground — spoor, scat, browse lines, gait, how old the track is |
| **The stand** | patience: knowing where they will be and being there first |
| **The stalk** | shipped `stealth` — motion degrades concealment, and ambush already exists |
| **Traps and snares** | `TrapKit` and `HazardMixin` ship; a set trap works while you are away |
| **The bow** | shipped `ranged` — the `close·reach·near·far` band ladder, aim × answer, the delivery profile |
| **The dog** | pointing, flushing, retrieving — **the dog's fourth job** after herding, guarding and deterring |

⭐ **Tracking is reading a field**, and it lands on the same ladder the farmstead
build kept rediscovering — the soil ribbon test, body-condition palpation,
cooking's spoon. *Expertise is discrimination, and precision costs an act.*
**Fourth independent instance.** It should be called out as house style rather
than reinvented a fifth time.

---

## What you get, and the ethic carries over

Meat and offal to cooking, hide to leather and the tailoring chain, sinew, bone,
horn, fur, feathers. Farmstead D28's rule transfers without amendment:
**the animal is used entirely, and waste is what feels bad — not the killing.**
No minigame, no trophy counter.

---

## Taming is the same encounter with a different outcome

The [pets slate](./pets-slate.md)'s taming encounter and a hunt are the **same
approach to the same animal**, resolved differently — which is what the
domesticability axis (wild → pet → livestock) already implies. The Wardens hold
both, and their second demand anchor is *the pet supply chain*.

> **A hunter and a tamer do identical work right up to the last moment.**

That is a genuinely elegant unification and it means the tracking, stalking and
reading investment serves two careers.

---

## Seasonality falls out of the calendar

Close seasons exist because taking breeding animals collapses the stock, and
farmstead D11 already derives **photoperiod** from shipped celestial geometry —
which is what sets the breeding season for wild animals exactly as it does for
sheep. So a close season is not an arbitrary date on a law: it is a law that
either **matches the biology or does not**, and a player can check. A polity that
sets its close season wrong is making a discoverable mistake.

---

## ⭐ A wild population is a record that materializes on encounter

The **third consumer** of a pattern this design family keeps producing: the herd
is a herdbook (farmstead D20), a hive is that record with the individual end
amputated (D34), and a wild population is the same shape again — **a population
with strength and composition over an area, from which an individual
materializes when you actually meet one.**

Its two halves compose the way soil's do (D2): **seeded character** — which
species live here, from biome — × **derived state** — how many are left, from
what has been taken. Cold-start correct, and nobody pays for animals nobody has
gone looking for.

⚠ **No respawn timers.** The stock is a derived field, per discovery-slate's
model; a timer would be a distribution pretending to be a population.

---

## What must not happen

- **No XP for kills**, no trophy score, no bestiary completion meter.
- **Hunting must not be the efficient food source.** If it were, agriculture
  would never have happened — and the player should be able to feel *why* it
  did (see farmstead D61). Hunting is supplementary, high-variance, and
  seasonal.
- **No monster-hunt reskin.** These are animals, they are *inhabitants* (D60),
  and some of them were here before the farm.
- **No respawn timers** (above).
- **No authored villain in the game-law argument.** Both readings must be
  genuinely available or the civics content is worthless.

---

## Open questions

- **Whose crime is poaching?** Private enforcement (a gamekeeper on contract)
  or public (an office)? *Constitutional, not incidental.*
- Does an animal need to be an instanced `Creature` before you engage it, or can
  the population stay a record until the encounter resolves? *(Lean: record
  until encounter — see above.)*
- How does a close season express itself in the legal-code substrate, and can a
  polity get it **wrong** in a way players can demonstrate? *(Lean: yes, and
  that is the point.)*
- Does hunting need a `hunt` verb at all, or is it `track` + shipped stealth +
  shipped ranged + a butchering act? *(Lean: no `hunt` verb. A hunt is a
  sequence of acts, not one.)*
- Where does **fishing** sit? It is the same fugitive-resource doctrine on water
  and the fishing slate exists; the rights half may want to be shared.
- Does the pet supply chain pull taming into this slate or keep it in pets?

## Scope guardrails

- **Do not restate discovery-slate.** Foraging is designed; cite it.
- **Reuse before inventing**: `stealth`, `ranged`, `TrapKit`, `HazardMixin`,
  `behavior` brains and `harm` all ship. A hunt should need very little new
  mechanism, and if it seems to, the design is wrong.
- **The rights half is the valuable half.** If this ever gets cut for scope,
  cut the method ladder before cutting *ferae naturae* — the property question
  is the thing no other system in the game can teach.
- **No new Mongo collections.**
