# Bestiary slate — what lives in the world, translated into our systems

> **Status: UNBUILT** — designed at high level 2026-10-22 with the owner, out of the combat
> conversation ([combat-depth](./combat-depth-slate.md)). What ships: a rich species model —
> body plans, size, habitat, age, natural attacks with a mass-scaled profile, anatomy that
> butchery reads ([race.md](../../subsystems/race.md),
> [combat-hooks.md](../../subsystems/combat-hooks.md) § the species vocabulary); a roster that
> is almost all domestic (cattle, sheep, goats, pigs, horses, dogs, cats, fowl, bees,
> silkworms, fish, a rat, a cave cricket, a bullfrog) plus the newbie-wilds wolf. Wild fauna
> barely exists. combat-experience T15 lists the non-humanoid bestiary as deferred.
> **Left:** sentience split from personhood · the four quadrants · the translation template
> and the folklore rule · the recurring mechanisms (regeneration with a stopper, damage
> shaping the yield, a curse as a disease, and the rest) · creatures in the minigame · bosses
> without a bar · ⭐ difficulty derived, never set · the curve from geography · the wild roster
> · the persons side as roles · the arcane-science gaps
> **Size:** a build — and the shared substrate of combat and the
> [hunting](./hunting-slate.md)/[foraging](./discovery-slate.md) build

## 0. Why now **[DECIDED — the owner]**

*"The bestiary I think is going to be very valuable to have when we get to the hunting /
foraging conversation, which is coming up soon."* And: *"humanoid combat is still combat, but
I think the organizing principles are different between characters and creatures."*

## 1. ⭐⭐ Sentience and personhood are two properties **[LEAN]**

The owner: *"sentience maybe isn't quite right … certainly some of The Witcher's 'silver
sword' fights were just as sentient as its 'steel sword' fights."* What the code calls
`sentient` really means **personhood** — it reads terms, can yield, blame for harming it is a
crime, it does not die of old age. Real sentience is **the capacity to suffer**, which most
animals have (UK law has recognized all vertebrates, octopuses and crabs as sentient since
2022):

| property | means | read by |
|---|---|---|
| **sentience** — it can suffer | welfare, cruelty, ⭐ the hunter's ethic of a clean kill | hunting, ranching, game law |
| **personhood** — you can bargain with it | terms, consent, yield, blame as a crime | combat, accountability |

A tiger is sentient and not a person; a vampire is a person. The rename is a deliberate sweep,
and the welfare property is new.

## 2. ⭐⭐⭐ The four quadrants **[DECIDED — the owner]**

The owner: *"with creatures I think we need to further divide between real and fantasy.
Players have different expectations from fighting a tiger than fighting something from The
Witcher 3."* And: *"most hunting probably happens at range or not at all — no one wants to go
hand to hand with a tiger — but with the expanded fantasy creatures they're like bipeds, and
the whole melee fight is the point."*

| | **not a person** | **a person** |
|---|---|---|
| **real** | the tiger, the boar, the deer — **ecology and hunting** | humans and the playable peoples — **character combat** |
| **fantasy** | wyverns, drowners, griffins — **the monster puzzle** | the vampire, a cursed woman, the botchling — **the moral contract** |

- **Real animals** — hunting, not fighting: ranged, trapped, stalked or avoided. **A melee with
  a big predator is the failure mode of hunting**, and the engine says so honestly (a natural
  attack's force scales with body mass). The bestiary teaches real ethology.
- ⭐ **Most real animals do not want to fight** — a fight is the exception: cornered, guarding
  young, in the rut, or hunting you. The same act has opposite answers by species: play dead
  for a brown bear, fight back against a black bear, make yourself big and never run from a
  cougar, run from a moose and get behind a tree, never run from a dog.
- **Fantasy creatures** — designed opponents, often bipedal, where the melee is the point: the
  Witcher loop of *identify → read up → prepare → fight its pattern → claim the trophy*.
- **The persons side** — the owner notes the steel-sword half is under-explored here. Human
  opponents get their combat from **their job**: a guard, a soldier, a bandit, a mercenary, a
  duelist, a knight, a brawler, an assassin. A role sets gear, training, terms and nerve; the
  employment system's seats and the policing and garrison slates define some of them. The
  persons-side bestiary is **roles with fighting profiles**.
- **Middle cases** — a war dog or a warhorse is a creature with training
  ([horsemanship](./horsemanship-slate.md)'s two minds); constructs and the undead (the
  tutor-bot, the shade) follow what they are built or bound to do.

## 3. ⭐⭐⭐ Translation, not invention **[DECIDED — the owner]**

The owner: *"we could just steal The Witcher's bestiary — it's really good, and a lot's just
generic IP that should be public domain. … We don't need to invent this stuff on our own;
other games give us plenty of inspiration for potential combatants. Our job is just
translation."*

### The folklore rule — take the sources, not the studio

- **Folklore is public domain** — the leshy, the noonwraith (*poludnica*), the striga, the
  vodyanoy, the kikimora, the bruxa, the werewolf, the ghoul, the golem, the wraith, the
  basilisk, the cockatrice, the griffin, the wyvern, the *poroniec* (the stillborn spirit
  behind the botchling), the kappa, the hydra, the gorgon, the kelpie, the djinn, the draugr.
- **D&D's System Reference Document 5.1** is Creative Commons (CC-BY 4.0) since 2023 — usable
  with attribution, except Wizards' *product identity* (the beholder, the mind flayer, the
  displacer beast).
- **A studio's own inventions are theirs** — nekkers, alghouls, arachas, endregas, and every
  specific design, art and name.
- ⚠ **Living cultures** — some creatures belong to cultures still living (the wendigo, to
  Algonquian peoples): care, or leave them alone.

### The template — translate the story, derive the numbers

Every trait a creature is known for lands on a system we have. A trait with nowhere to land is
a gap written down, never a special-case stat (combat already lints against special cases):

| the story says | it lands on |
|---|---|
| how big, what shape | body plan, size |
| claws, fangs, a crushing blow | natural attacks — channel and reach |
| tough hide, a shell | natural armor on the covering grid (`hide`, or a new form) |
| ⭐ where it is vulnerable | **vital zones** — the same aiming system as armor gaps ([combat-depth](./combat-depth-slate.md) § 2) |
| what it senses | senses, against stealth |
| when and where it appears | rhythm (the calendar, the sun, the moon) and habitat |
| how it behaves | temperament and drives — a brain |
| its warning signs | tells, read through the fog |
| ⭐ what hurts it (*only silver*) | **a weakness grounded in arcane science, never fiat** |
| ⭐ what it lacks | our vitals answer honestly — **no blood, no bleeding out**; no lungs, no drowning; no body, none of those wounds |
| whether you can talk to it | personhood |
| what you take from it | trophies; reagents for [pharma](./pharma-slate.md) or arcana; butchery's yield |

⭐ No hitpoints is a strength here: a golem does not bleed, a wraith has no body, a vampire
closes its wounds — each fights differently **because of what it is**, not because of a
resistance table.

## 4. What each source teaches **[EVIDENCE]**

| source | its lesson | examples translated |
|---|---|---|
| **The Witcher** | the hunt as a loop; the moral contract | the werewolf — a person by day, a beast at the full moon, wounds that close unless silver, a curse to lift; the noonwraith — only at harvest noon in the fields, no body until made to manifest; the leshy — bound to the wood (forestry's wood is a place), unbeatable while its bound marker lives |
| **D&D** | the monster as one memorable trick | ⭐ the troll — regenerates unless burned or dissolved (fire and caustic exist); the gelatinous cube — unseen, engulfing (respiration), dissolving; the mimic — a disguised chest; ⭐ the rust monster — eats your gear's condition; the giant spider — webs as `grappled`; the dragon — breath, flight, and a hoard as an economy |
| ⭐ **NetHack** | **knowledge is progression** | the floating eye — melee it and you are paralyzed: some things must not be fought in melee; the cockatrice — touch is the channel, gloves the counter; the nymph and the leprechaun — theft; werecreatures — a curse spread like a disease; ⭐ eating corpses — you are what you eat (and lichen never rots); shopkeepers — a person in the dungeon; Elbereth — a word as a ward |
| **Dwarf Fortress** | our closest relative — wounds per part, tissue layers, armor by material, no hitpoints | ⭐ the **generated** monster — body plan × material × special: the template is that grammar, and a generator could make honest monsters; syndromes — a bite that causes an effect |
| **survival games, Far Cry** | animals as weather | luring a predator onto enemies with bait; ⭐ **Red Dead Redemption 2's perfect pelt** — the right shot keeps the hide intact, so the ethic and the economy are one rule; The Long Dark's wolves, flares, sprains and infection |
| **Monster Hunter, Shadow of the Colossus** | the body as the battlefield | breaking parts that become the yield; a monster that limps and flees to its nest; ⭐ a creature big enough to be **a place** you climb (the ship rule for big craft) |
| **folklore beyond Slavic** | — | ⭐ the kappa — bow and it bows back, spilling its water: manners as a weapon ([expressive acts](./expressive-acts-slate.md)); the hydra — cauterize the stump; the gorgon — gaze, and a mirror; the kelpie — a water horse that drowns its rider; the djinn — bound, bargaining; the draugr — the barrow's dead |

## 5. ⭐⭐ The recurring mechanisms **[LEAN]**

The same few keep returning, which is the useful finding:

1. ⭐ **Regeneration with a stopper** — wounds close unless a particular channel or material
   dealt them (troll, hydra, werewolf).
2. **Looking or touching as the attack** — perception and contact as harm, with counters
   (blindfold, mirror, gloves).
3. ⭐ **A curse that spreads like a disease** — lycanthropy, vampirism
   ([disease](./disease-slate.md)).
4. **Eating it changes you** — metabolism and arcane science.
5. ⭐ **Damage shapes the yield** — perfect pelts, broken parts: butchery reads the wounds.
6. **Creatures as hazards and weapons** — drives in a world with other people.
7. **A creature as a place** — the size rule.
8. **Manners and words as weapons** — expressive acts, arcane words.
9. **Creature disguise and theft.**
10. **Generated monsters** — the template as a generator.

The lean on philosophy (proposed, not yet ruled): **NetHack's** (knowledge is progression)
over **Dwarf Fortress's** (honest simulation underneath), with **Monster Hunter's** parts
economy as the way it reaches the trades.

## 6. Creatures in the minigame **[LEAN]**

Each creature bends one or two of the fight's levers — footing, the cap, endurance, morale,
reach, tempo, the fog, the moves — and that is its identity:

| creature | the lever | how the fight feels |
|---|---|---|
| troll | its cap climbs back unless fire or acid | the clock is burning its wounds |
| werewolf | the same, unless silver | the right weapon is the preparation |
| bear | sheer mass erodes footing faster than defend restores | ⭐ you cannot parry a bear — you get out of the way |
| wolf pack | numbers and a group's nerve | they test, circle, and quit if you cost too much |
| floating eye | striking it hurts you | don't, or do it from range |
| gelatinous cube | engulfed, the fight runs on your breath | respiration replaces footing |
| mimic | an ambush | you start broken |
| rust monster | its touch ruins your gear | the fight costs equipment, not body |
| dragon | range and size | you fight the approach |

**Bosses without a bar** — progress shows honestly: **parts break**, **it limps** (its cap
falling, visibly), its tells change. Phases come from state, not script: badly hurt, it
**flees to its lair** and the second fight is in its place. A truly huge creature becomes a
place you climb.

## 7. ⭐⭐⭐ Difficulty — derived, never set **[DECIDED — the owner]**

The owner: *"there's no `set_difficulty()` anywhere, but certainly there should be a
`get_difficulty()` that we can derive — probably more than one quotient the player can choose
from … You don't want an oracle; you want fights to be unpredictable but with a fulfilling
payoff."*

### The quotients **[LEAN]**

| quotient | the question | derived from |
|---|---|---|
| **odds** | will I win the footing contest? | competence gap, reach, tempo, numbers |
| **danger** | how badly can it hurt me? | its force against **my** armor on the grid; venom; size |
| **escape** | can I get out if it goes wrong? | its speed against mine; does it chase; exits; does it take a yield |
| **cost** | what will winning cost me? | expected wear, endurance, wounds |

### Not an oracle

Read through `assess` (the classic MUD `consider`): **fogged** by your sharpness; ⭐ **limited
by what you know** — against a creature you have never met it says so, and knowing the
bestiary sharpens it; **honest about its assumptions** (*"if it can't close its wounds…"*),
as the routing doctrine requires of plans. You can be wrong because an assumption was wrong,
never because a die rolled.

### Poker, not slots

The compelling half of a Skinner box is unpredictability; the ugly half is a payoff on a random
schedule. The honest version is combat's own *poker, not slots*: the unpredictability is **what
you do not know**, and it **shrinks as you learn** — the payoff is mastery. A slot machine
never gets more predictable; a poker player does.

## 8. ⭐⭐⭐ The curve comes from where you go **[DECIDED — the owner]**

The owner: *"on the old EotL someone would make an area and say 'this is for like eval 30–50'
… I always hated that. I like the Elden Ring model a lot better, where the world is full of big
threats and small threats and the ones you're not ready for you can almost always just avoid.
I'm not saying content developers can't make the 'level 30' area, but I would hope the
platform encourages them to do it differently."*

- ⭐ **There is nothing to target.** No level, no eval; competence is per Discipline, in bands.
  An author cannot write *for level 30* because the scalar does not exist — the easier path is
  to put a real creature where it would live.
- **Most creatures do not come for you** — drives and territory give danger a place you can
  go around.
- **You see it before it sees you** — sight lines, senses against stealth, tells before it
  commits.
- **Escape is real** — which moves the deferred **chase** up the combat list.
- **Danger is world knowledge** — `assess` at a distance, an NPC's warning, the field guide,
  ⭐ the **death log** (tourism-and-sport's skiing precedent): *"the fen took three people this
  week"* beats any number.
- **For authors, a profile, not a level** — the combat gym can run a creature against reference
  loadouts and say what it *takes* (*"bad odds in leather with a sword; fine with fire; don't
  melee it"*).
- **Rewards from what it really is** — never scaled.
- **Never scaling monsters to the player.**
- **Authors may still build a level-shaped area** — the Newbie Wilds is curriculum by design.
  Enable, never impose.

### Invariants **[LEAN]**

1. **No difficulty scalar exists to target** — difficulty is only ever derived.
2. **A lethal threat announces itself** — except ambushers, whose counter is awareness.
   (Elden Ring itself breaks this with its sudden ambushes; whether it is too strong is open.)

## 9. The wild roster **[LEAN]**

| role | animals |
|---|---|
| game | red deer, hare, wild boar, pheasant, duck, grouse |
| ⭐ fur | beaver, otter, fox, mink — the fur trade, half of how North America was mapped |
| predators | wolf, brown and black bear, lynx, cougar |
| the dangerous | moose, adder, wasps |
| falconry | a hawk — a method and a kept animal at once |
| water | pike, salmon; the whale ([hunting](./hunting-slate.md) claims it) |

A bestiary entry: body, natural armor, vital zones, senses, temperament and flight distance,
tells, rhythm and seasons, society (solitary, pack, herd), and what it yields. How it fights is
derived — an animal's morale is drive against cost: prey flees at the first wound, a predator
quits when you cost more than you are worth, a mother does not quit.

## 10. The lens pass

1. **Pedagogy** — ⭐ real ethology (the bear rules); the armor grid as a type chart; the field
   guide as a fallible document; a naturalist or tracking Discipline.
2. **Expression** — translation, not invention: a folklore bestiary any author can draw on.
3. **Immersion** — the giant seen across the valley; the limp; the lair. **Participation** —
   the hunter, the monster-hunter, the naturalist, the furrier, the trophy-maker.
4. **Values** — sentience and the clean kill; living cultures' creatures; the moral contract.
5. **Continuity** — bow to rifle; the same animal.
6. **Economy** — pelts, trophies and reagents; the fur trade; the hoard.
7. **Governance** — game law and close seasons ([hunting](./hunting-slate.md)); bounties.

## 11. Open

1. **The arcane-science gaps** — why silver works, what makes a spirit manifest, what a binding
   is ([arcane-science](../../arcane-science.md) says nothing of monsters).
2. **The four quotients** — the right cut.
3. **The announce invariant** — too strong?
4. **The roster and the first fantasy creatures** — which ship first, and where.
5. **The sentience rename** — and where the welfare property is read.
