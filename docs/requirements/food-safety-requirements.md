# Food safety — requirements

**Kind:** feature
**Leads from:** kernel — first consumer is the **Hearthworks cookhouse**
(the kitchen the cooking build stood up: hearth, pantry chest, cellar,
Odo on shift), shipping in this build.

Food already goes off in a way you can smell. This build adds the thing
that actually hurts you: **a hazard none of your senses report**, that
never appears on its own, and that grows inside you after you swallow
it. Alongside it, the counterplay the
[preservation slate](../slates/builds/preservation-slate.md) has been
waiting on since 2026-07-31 — salting, drying and curing — and the act
that creates the pressure both answer: **butchering**, where a kill
hands you more meat than you can eat with a clock already running.

Seeded by [food-safety-slate](../slates/builds/food-safety-slate.md).
The two rules this build sits between:

> *Heat kills the population; it does not destroy what the population
> made.* — [spoilage.md](../subsystems/spoilage.md), shipped
>
> **Curing suspends the population; it does not kill it.** — this build

Neither half of "cook it or cure it" is safe alone, and knowing which
one a given piece of food needs is the curriculum.

---

## What already exists

**Verbs a player has today** near this ground: `cook`, `plate`, `eat`,
`drink`, `taste`, `smell`, `look`, `wash`, `make`, `pour`, `heat`,
`stir`, `harvest`/`pick`, `buy`, `serve`, `order`, `menu`, `treat`.
**No verb takes an animal apart, and no verb preserves anything.**

**Trades and packs** holding adjacent ground: `trade-cooking` (14
recipes, and salt — which ships as a *seasoning* and preserves nothing),
`trade-hospitality`, `trade-brewing`/`-winemaking`/`-distilling` (the
fermentation family), and the Hearthworks venue.

**Subsystems already true of this space:** spoilage (the microbial
growth law, the four bands, the smell, the poisoning dose — all shipped
with the cooking build), metabolism (the ingest path, toxins, the vomit
window), thermal (a cold cellar and a warm windowsill are already
different answers), fermentation (deliberate microbial growth, cultures,
strains), harm and mortality (the medic vertical, the rescuable dying
clock).

**Disciplines** — 48 in the catalogue, including `cooking`, `medicine`,
`agriculture`, `horticulture`, `fermenting`, `recipe-knowledge`,
`hospitality-catering`. **There is no `butchery` and nothing about food
safety.**

**Content** — 30 of 107 materials rot on the shipped curve. A `Corpse`
exists as a real object (searchable, carryable, decaying) and 23 animal
species ship, so there is prey. Nothing turns a corpse into food.

**Overlapping slates** — preservation (the parent), fridge and
hearth-and-larder (cold storage, the larder, the compost heap),
rendering (the knacker's non-meat outputs), ranching (livestock, and it
explicitly leaves the butchering seam open), disease (transmission),
pharma (medicine), sanitation.

> **Therefore what is genuinely new here is four things:** a hazard that
> no sense reports · a water state a player can *change* (rather than a
> fixed property of each ingredient) · a path from a killed animal to
> meat · and an illness that incubates and then grows in you.

---

## Goals

- **A player can change how well a thing keeps.** Salting, drying and
  curing are acts with lasting effects, and they stack — salt cod is
  drying *and* salting, and keeps better than either.
- **Salt becomes the keystone commodity** mining already decided it was,
  by finally doing something.
- **A second hazard exists that no sense reports** — not visible, not
  smellable, not tasteable — and it never appears on its own.
- **Contamination has a source you can point at**: butchering, and the
  board or knife that touched it afterwards.
- **A kill forces the preservation decision**, because it hands you far
  more meat than you can eat before it turns.
- **Cooking is a temperature held for a time**, not a threshold crossed,
  so a simmer and a sear are different acts.
- **Getting sick happens later, elsewhere, and is diagnosable by another
  person** rather than by staring at the food.
- **A served dish is attributable**, so poisoning a customer is a
  different act from poisoning yourself.
- **The rules are learnable and sufficient.** A player who understands
  them can stay safe without ever inspecting anything.

## Non-goals

- **Transmission** — no catching it from another person, no vectors,
  no contagious kitchens. → [disease-slate](../slates/builds/disease-slate.md).
- **Acquired immunity / prior exposure.** → the disease build.
- **A contaminated *room*** — a filthy kitchen as a hazard in itself.
  → the disease build (it needs the same push mechanism transmission
  does).
- **Molds and fungi**, including the blue-cheese and koji side, aflatoxin
  and ergot. → food-safety-slate Part 10, as its own build.
- **Medicine and pharmacology.** This build *creates* demand for a
  diagnostician and deliberately supplies none.
  → [pharma-slate](../slates/builds/pharma-slate.md), after molds.
- **Rancidity / staling** (oil, nuts, coffee) — not a microbial story.
  → nowhere yet, deliberately; it wants its own small law and has no
  slate.
- **Pickling and anything sour** — the acidity lever.
  → preservation-slate's remaining term, riding the fermentation
  subsystem when a consumer wants it.
- **Canning and sealed-jar physics.** Sealing stays the simple thing it
  is today. → preservation-slate, explicitly deferred there.
- **Livestock, herds, husbandry.** This build takes only the *hunting*
  side. → [ranching-slate](../slates/builds/ranching-slate.md).
- **The rest of the carcass** — hide, bone, fat past what already
  renders. → [rendering-slate](../slates/builds/rendering-slate.md).

## Placement

**The kernel owns the hazard; `trade-cooking` owns the acts.**

The microbial law, the water state and the illness are **kernel** —
they are true of food everywhere, in any locality, whether or not anyone
practises a trade. That is the `/system`-shaped test applied to the
kernel's own substrate: a ration rots in an empty room.

The **acts** are `trade-cooking`'s: curing, drying, smoking and
butchering are things a person *does*, they ship with the pack that
affords them, and their rows live under `/trade/cooking/`. The
`butchery` Discipline is platform-level, because a skill is not a pack's
property.

⭐ **Does a second instance need code?** No. A second kitchen, a second
butcher, a second cured product and a second pathogen are all **content
rows** — a recipe, a Discipline reference, a material, an affliction.
Nothing in this build makes the *next* one a code change, which is the
test that says the mechanism and the expression were separated
correctly.

**Butchering stays in `trade-cooking` for now** rather than taking a
pack of its own: it would be a pack holding one verb, and the victualler
is one trade at this tier. When ranching brings volume, `trade-butchery`
spins out — and because the Discipline already exists separately, that
move carries a verb, not a skill model.

## Collisions

- ⚠⚠ **Corpses already exist, and combat already makes them.** The
  bar-fight build produces bodies in a *social venue*. A butchering act
  that reads "a corpse" would let a player take apart a patron in Dave's
  Bar. **Settled in D14 below: you cannot butcher a person.**
- **The Hearthworks pantry chest** already holds the food rows this
  build changes (`stew-meat`, `root-vegetables`, `prime-cut`, rations).
  They gain a water state; nothing in the chest should read differently
  on day one.
- **The Hearthworks cellar** is already cold and already holds a
  fermentation vat. Cold storage becomes *useful* here rather than
  decorative — and the vat's deliberate microbial growth must not be
  confused with the undeliberate kind. (The unresolved collision between
  those two is recorded in `spoilage.md` and stays out of scope.)
- **Odo the cook** works a shift in that kitchen. Anything he makes is
  now food someone can be poisoned by, which is the point, and his own
  practice should be sound.
- **Dave's Bar serves food.** The attribution goal means a bartender who
  serves a bad dish is now visible as having done so.
- **The general store sells provisions.** Bought food must arrive sound;
  a shop is not a contamination source.
- **The medic vertical** gains its second customer, having been built
  for combat wounds.

---

## Surface decisions

*(Decision numbers are stable and cited by the plan.)*

### D1 — Only animals get sick from food

The illness is a bodily condition, so it reaches creatures and not
plants. A player, an NPC and a hunted animal can all be poisoned; a
crop cannot.

### D2 — Spoilage and contamination travel together

Pouring, decanting, mixing and blending move **both** hazards with the
matter, mass-weighted, exactly as spoilage already moves. Tipping a bad
stew into a clean pot does not clean it, and tipping half of it into a
good pot spoils the good one rather than laundering the bad.

### D3 — Contamination spreads between objects, not through rooms

A board, a knife, a hand and a vessel can carry it from one thing to
another. Rooms carry nothing. Washing clears it.

### D4 — Contamination is undetectable, and the risk is still legible

There is **no reading, no smell, no taste and no tell** — a contaminated
item is indistinguishable from a clean one by every sense.

⭐ What keeps that fair is that the *risk* is legible even though the
*hazard* is not: a player can see that the meat is raw, that the board
was used for gutting, that the stew has been out since morning. **The
information is in what you did, not in the object** — so a careful
player is reasoning, not guessing. *Invisible to the senses, knowable by
procedure.*

### D5 — Cooking is a temperature held for a time

A long hold at a lower heat and a brief moment at a higher one achieve
the same kill. A simmer, a sear and a lazy warm-through become
genuinely different acts, and a thermometer becomes worth owning.

### D6 — No food ever becomes dangerous on its own

> **Spoilage is a clock. Contamination is an event.**

Food left alone spoils — it never becomes *contaminated*. Something has
to have happened to it: an animal opened, a dirty implement, a surface.
This is what keeps an invisible hazard from being a tax on existing.

### D7 — The same ingredient can be fresh, dried, cured, or both

How well a thing keeps stops being a fixed fact about that kind of food
and becomes a **state of the individual thing** that acts can change.

Drying and salting are the same mechanism seen twice — both take away
the water a microbe can use — so they stack rather than competing, and
partial treatment earns partial benefit.

**Asymmetry:** drying reverses and curing does not. Something dried
slowly softens again in a damp place; something salted never un-salts.
This is why a dry store is worth building.

*Alternative considered:* a separate kind of food per state (fresh pork,
salt pork). Honest for one change, and it explodes the moment hurdles
stack — which is precisely what the trade practises.

### D8 — A served dish remembers who made it

Prepared food carries its maker the way a crafted object already does,
so that harm from a meal can name a person. Without this, serving
contaminated food to a paying customer is indistinguishable from eating
it alone at home.

### D9 — Butchering is a skill of its own

A new `butchery` Discipline, a specialization of cooking. Yield and
cleanliness both answer to it — gut spillage is the dominant real
contamination route and it is exactly what an unskilled butcher does.

### D10 — Botulism is a poison, not an infection

Some hazards make a toxin rather than infecting you, and the two behave
differently: boiling destroys *this* poison but not the one in rotten
food. That distinction is already expressible and gets used rather than
flattened.

### D11 — Some organisms survive cooking and wake as food cools

A properly cooked dish left out overnight can make you ill. This is the
most common real food poisoning there is, and it is the lesson nobody
believes until it happens to them.

### D12 — Resistance is thin

How well a body fights an infection depends on its condition, roughly.
No immune memory, no exposure history, no per-pathogen resistances.

### D13 — Severity is fitted to what already ships

The existing poisoning content was calibrated against authored
afflictions rather than invented, and the two agreed without either
being tuned to the other. New illnesses are fitted the same way.

### D14 — ⚠ You cannot butcher a person

Raised by the collision above. Butchering applies to animals; a sapient
corpse is not a source of meat, and the species roster already places
people and animals in a taxonomy that can say which is which.

This is a **values** decision, not a squeamishness one, and it is
consistent with the position the game already takes elsewhere (sentient
sacrifice is authored as evil). The refusal should read as the world
having a view, not as a missing feature.

---

## Lens pass

**1 · Pedagogy.** Disciplines exercised: **`cooking`** (temperature *and
hold time*, now that D5 makes the distinction real), **`butchery`**
(new — clean separation as a skill), **`medicine`** (diagnosis and
treatment). Everything derives from one law a player can internalise: a
population grows between two temperatures, faster when warm and wet, and
dies above a threshold that is really a rate. From that alone a player
predicts that a cured ham keeps, that a cooked stew left out is worse
than the raw stock was, and that boiling fixes botulism but not staph.
⭐ Nothing is rolled: **which** hazard a carcass carries is a fact about
the world (legitimate); **what your knife did** is not.

**2 · Expression.** The ordinary case is entirely data — a new hazard, a
new cure, a new perishable are all rows. **No code for any of them.**
The bespoke case is hurdle stacking: an author combining salt, smoke and
time gets a correct answer without anyone having enumerated "salt cod",
because the levers compose. ⚠ **The gap:** an organism whose survival
works in a genuinely novel way (not a rate, not a threshold) would still
need engine work. Narrow enough to accept, and named rather than
papered over.

**3 · Immersion.** The build refuses a gauge — there is no contamination
meter and by D4 no reading at all. What the simulation affords without
scripting: hanging meat in a cold cellar because you understand why;
keeping a separate board because you got burned once; a cook who insists
on washing between jobs, and a customer who notices. ⭐ The anxiety is
real and correctly placed — you are not watching a number approach a
threshold, you are remembering what you did with that knife.

**4 · Values.** The choice forced is **whether to serve it.** Eating
your own risky food is a private gamble; putting it on a menu is a
choice about other people, and D8 makes the difference legible. Who
confers standing: **the polity**, through the harm record that already
exists — a cook who poisons patrons is visible as having done so,
without a reputation stat and without anyone scripting a consequence.
D14 is the same lens answering a second question. ⭐ This is why food
safety is a *civic* system and not merely a survival one.

**5 · Epochs.** The mechanism — microbial growth and thermal death — is
identical in prehistory and in a modern kitchen. Only the *dynamics*
change: the medieval rung has salt, smoke and a cold cellar; the
industrial rung adds canning; the modern rung adds refrigeration and
pasteurisation; the future rung adds irradiation. Every one is a
parameter on levers this build ships. ⭐ Nothing about the cellar has to
be rewritten to become a fridge.

---

## The drive

Run in the live game, at the Hearthworks, before the MR opens.

1. **Hunt.** Kill an animal in the wild near Hearthworks. → It leaves a
   body.
2. **Butcher it** with a knife. → Several cuts of meat, far more than one
   meal. The cuts read as fresh. A first-time butcher makes a mess of it
   and gets less than a practised one would.
3. **Try to butcher a person.** (An NPC corpse, or a fallen patron.) →
   Refused, in the world's voice.
4. **Look at, smell and taste one cut.** → It reads sound. *It is not.*
   Nothing in this build will ever tell you otherwise.
5. **Salt a second cut** and **hang a third to dry** in the cellar. →
   Both read as treated. Salt is consumed.
6. **Salt and dry a fourth.** → Reads as more thoroughly preserved than
   either alone.
7. **Cook the first cut properly** on the hearth and **eat it at once.**
   → A good meal. No illness, ever.
8. **Cook a fifth cut properly, leave it on the table overnight**, and
   eat it in the morning. → It smells fine. **You get sick some hours
   later**, well after the meal.
9. **Wait out the illness**, or have another player `treat` you. →
   Symptoms are legible to them; treatment resolves it.
10. **Take the untreated illness to its end** on a spare character. →
    The existing dying arc, rescuable, with no new death path.
11. **Leave the salted cut a full season**, then eat it raw. → Still
    preserved. **Still makes you ill** — curing kept the hazard as well
    as the meat.
12. **Cook that same cured cut** and eat it. → Fine.
13. **Butcher with a dirty knife, then chop vegetables with it**, and
    eat them raw. → Illness, from food that never touched the animal.
14. **`wash` the knife, repeat.** → Fine.
15. **As Odo on shift, serve a bad dish to a patron.** → The patron
    sickens, and the record names Odo.

⚠ Steps 4, 8 and 13 are the three the unit suite cannot prove and the
whole build exists for.

---

## Acceptance criteria

Observable from outside the code, by a person playing.

1. A player can salt or dry an ingredient, and it keeps visibly longer
   than an untreated one in the same place.
2. Salting and drying the same item **stack** — better than either
   alone — and partial treatment gives partial benefit.
3. A dried thing left somewhere damp slowly softens back; a salted thing
   never un-salts.
4. Treated food is legible as treated, without a number.
5. Salt is consumed by curing and is worth buying.
6. A player can butcher a killed animal and gets more meat than one
   meal.
7. A player **cannot** butcher a person, and the refusal reads as the
   world's position.
8. An unskilled butcher yields less and contaminates more than a skilled
   one.
9. **No food a player owns ever becomes dangerous without something
   having happened to it.**
10. A contaminated item is indistinguishable from a clean one by `look`,
    `smell` and `taste`.
11. Food cooked properly and eaten promptly never makes anyone ill.
12. Food cooked properly, left out overnight and eaten next day **does**.
13. Contaminated meat that is cured and eaten a season later still makes
    you ill; cooking that same cured meat makes it safe.
14. Illness arrives hours after the meal, not at the table.
15. A sick player's symptoms are legible to another player, who can
    treat them.
16. Severe untreated illness reaches the existing dying arc; nothing new
    kills anyone.
17. A dirty implement carries the hazard to whatever it touches next,
    and `wash` clears it.
18. When a cook serves food that sickens a patron, the record shows who
    made it.
19. Nothing in the Hearthworks pantry, the general store or Dave's Bar
    behaves differently on day one for a player who does nothing new.

---

## Cross-references

**Seeding slates** — [food-safety-slate](../slates/builds/food-safety-slate.md)
· [preservation-slate](../slates/builds/preservation-slate.md)
· [disease-slate](../slates/builds/disease-slate.md) (the boundary)
· [ranching-slate](../slates/builds/ranching-slate.md) (the seam this cuts)
· [rendering-slate](../slates/builds/rendering-slate.md) (adjacent)
· [pharma-slate](../slates/builds/pharma-slate.md) (the demand created)
· [health-vertical-slate](../slates/builds/health-vertical-slate.md)
· [sampling-and-labs-slate](../slates/builds/sampling-and-labs-slate.md)

**Subsystem docs** — [spoilage.md](../subsystems/spoilage.md)
· [metabolism.md](../subsystems/metabolism.md)
· [vitals.md](../subsystems/vitals.md) · [harm.md](../subsystems/harm.md)
· [mortality.md](../subsystems/mortality.md)
· [thermal.md](../subsystems/thermal.md)
· [crafting.md](../subsystems/crafting.md)
· [accountability.md](../subsystems/accountability.md)
· [advancement.md](../subsystems/advancement.md)
· [race.md](../subsystems/race.md) (the taxonomy D14 reads)

**Doctrine** — [design-lenses.md](../design-lenses.md)
· [uncertainty.md](../uncertainty.md) · [measurement.md](../measurement.md)

**In flight** — [food-safety-plan.md](../plans/food-safety-plan.md)
(the engineering half).
