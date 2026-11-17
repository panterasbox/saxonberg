# Species slate — making species play differently, without ranking them

> **Status: PARTIAL** — the eight axes the differences would ride are all
> shipped (Material · Clade · BodyPlan · Species · innateMixins · faculty)
> → [race.md](../../subsystems/race.md)
> **Left:** every actual difference — the ectotherm · scent-based
> recognition · cannot-metabolise-a-staple · equipment incompatibility ·
> no speech organs (aether only) · illegible emotes · and the retrofit of
> the seven interchangeable shipped humanoids · ⭐ the roster: two pools and a ratchet (§ *The
> roster*, 2026-11-17) · the form/culture split · retiring the half species · renaming the three
> Tolkien-derived binomials
> **Size:** a build

**Captured 2026-08-02**, as a tangent off the physiology slate's blood-type
question. The prompt was direct:

> **User: "I've been wanting to do things to make each species play
> different. like the aether attuned species is the only one that's really
> special."**

The finding is the same shape as the physiology audit:

> ⭐⭐⭐ **The species layer is HALF-READ too. There are eight
> differentiating axes already shipped and we have used ONE.**

Related: [race.md](../../subsystems/race.md),
[vitals.md](../../subsystems/vitals.md),
[respiration.md](../../subsystems/respiration.md),
[thermal.md](../../subsystems/thermal.md),
[metabolism.md](../../subsystems/metabolism.md),
[senses.md](../../subsystems/senses.md),
[belief.md](../../subsystems/belief.md),
[locomotion.md](../../subsystems/locomotion.md),
[embodiment.md](../../subsystems/embodiment.md),
[materials-response.md](../../subsystems/materials-response.md),
[combat-hooks.md](../../subsystems/combat-hooks.md) (the species
vocabulary hook), [char-gen.md](../../subsystems/char-gen.md) (the species
dossier), [physiology-slate](../engine/physiology-slate.md) (the worked example).

---

## The governing rules

> **Graduated** to [race.md § Why species differ without ranking](../../subsystems/race.md#why-species-differ-without-ranking)
> — difference that costs vs. difference that ranks · incomparability ·
> the quality criterion · interdependence · prejudice lives in the beholder.

---

## ⚠ The worked example: blood type, and a rule restated

**(From [physiology-slate](../engine/physiology-slate.md) § Part 7e. User: *"giving
a species its own blood type could be cool so that species has to get
blood from its kin unlike the others."*)**

That slate had first written **"blood type is independent of species"** to
avoid a purity note. The proposal looks like a violation. **It is not** —
look at what it does to the species that has it:

> **A species with its own blood type is not PURER. It is more FRAGILE.**

Smaller donor pool; in trouble far from home; dependent on its own
community in a way nobody else is. Not a supremacy note — **a minority
medical burden**, which is a real phenomenon with a real consequence:
**those communities run their own donor drives.**

> ⭐⭐⭐⭐ **A species that must organise its own blood supply is a diaspora
> practising MUTUAL AID** — true, specific, and exactly the register the
> defamiliarized-prejudice thread wants. *The burden falls on the
> minority; the answer is solidarity.*

**The rule was aimed at the right hazard and stated wrong.** Corrected
form is § *Difference that costs is character*, above. The physiology
slate's "independent of species" line stands as the **default**; a single
authored exception that imposes a **burden** is exactly the good case.

---

## The landscape — eight axes, all shipped

| System | Knob | Example difference |
|---|---|---|
| **respiration** | `breathableMedia` | breathes water · tolerates thin air · **chokes on smoke** |
| **thermal** | ectotherm / bands | **capability varies with ambient temperature** |
| **metabolism** | digestible tags, toxin tolerance | digests bark or carrion · **cannot process alcohol** · works the swamp |
| **senses** | `sensoryPorts` | lateral eyes (wide field, poor depth) · dark-adapted · **scent-dominant** |
| **locomotion** | `locomotionModes` | climbs natively · **cannot swim** · burrows |
| **slots / anatomy** | `slots`, tissue masses | **cannot wear standard boots** · a slot nobody else has · denser bone |
| **vitals** | `vitalProfile`, dying windows | bleeds out slower · **takes longer to die of cold** |
| **comms** | Vocal vs Aether | **no speech organs — aether only** |
| **emotes** | SoulMixin vocabulary | **body language others cannot read** |
| **magic** | faculty siting, suppression | attunement — *the one we have used* |
| **reserves** | capacity | sprints longer · recovers slower |
| **combat** | the species-vocabulary hook | natural weapons — ⚠ **worse than a real weapon, so it is convenience not power** |

**None of these is a stat bonus. They are different PHYSICS for the same
rules.**

## The candidates worth chasing

### ⭐⭐⭐ The ectotherm — and it already ships

> ⚠ **The heading and the first sentence are FALSE, verified
> 2026-09-19 and again 2026-09-23.** `thermalStrategy` and
> `ThermalRegulationMixin`'s ecto/endo branch are real and shipped, but
> **no species row anywhere in `packages/content` authors an
> ectotherm** — the bullfrog defaults to `endotherm` like every other
> body plan, and the only ectotherm artifact in content is the `torpor`
> condition row. The *design* below is unbuilt and still wanted; what is
> not true is that a worked example exists to build from. Left in place
> rather than rewritten (the sentence is the slate's, not a compaction
> agent's, to reword) — but flagged here, not only in the ledger, so a
> requirements pass cannot inherit the premise by reading the body.

The bullfrog is authored as an ectotherm with distinct bands. A
cold-blooded **playable** species means **capability varies by biome and
by hour** — sluggish at dawn, sharp at noon, in real trouble in the north.

> **A species whose play changes with WEATHER and TIME**, which nothing
> else in the game does — and **zero new machinery.**

### ⭐⭐⭐⭐ Scent-based recognition

Belief is **per-viewer**, so a species that identifies people by smell
**defeats visual disguise.**

- a reason to **bring one along** when impostors matter;
- **real counterplay** for disguise;
- **an entire subsystem behaves differently for one group without
  touching a number.**

### ⭐⭐⭐ Cannot metabolise a staple

**One toxin row** and a species **cannot drink with you at the bar.**
Social, daily, felt, completely un-rankable — the kind of small thing that
makes a species read as **a people** rather than a stat block.

### ⭐⭐⭐ Equipment incompatibility

Digitigrade legs, an odd torso, a tail — so standard boots and mail do not
fit. Their gear is **bespoke**.

> **Their ECONOMICS differ without their POWER differing.**

Ties into crafting and retail, and it is **a burden the community
answers** — the same shape as the blood.

### ⭐⭐ No speech organs — aether only

Interacts with the sleep/comms work (physiology § Part 7d): **implant
damage is catastrophic for them specifically**, and a whole species
depends on infrastructure others take for granted.

### ⭐⭐ Illegible emotes

**You genuinely cannot tell if they are angry.** Social friction with zero
mechanics — it earns the misunderstandings the allegory wants **without
anyone being written as unfriendly.**

---

## ⚠ What to refuse

> **Graduated** to [race.md § Why species differ without ranking](../../subsystems/race.md#why-species-differ-without-ranking)
> (the refusal table + *a synergy is a tendency, a class is a prerequisite*).

## ⭐⭐⭐ The roster — two pools, a ratchet, and form apart from culture **[DECIDED in shape — the owner, 2026-11-17]**

Talked through with the owner while crafting the first-session cast (Dave's Bar, the crossing, the
station; [university-avenue-slate](./university-avenue-slate.md)), because naming those characters
needed their species first.

### What ships today

- **Playable** (char-gen's roster, 10): human, elf, dwarf, halfling, half-orc, tiefling,
  dragonborn, gnome, half-elf, orc. Essentially D&D's Player's Handbook list, plus orc.
- **Persons, not playable** (6): attuned-born (`sensitivus`), troll (Katie in Duncan Hall is one),
  ghoul, kobold, ogre, satyr. Constructs too: the tutor-bot is a person.
- **⚠ Owned names:** three binomials are built on Tolkien's words: *eldarinus* (Eldar),
  *khazadicus* (Khazad), *periannath* (Periannath). They are renamed. Tiefling and dragonborn are
  fine: D&D's System Reference Document 5.1 is CC-BY 4.0 and includes both, used with attribution
  ([bestiary-slate § 3](./bestiary-slate.md)).

### The owner's direction

- **Half species go.** Half-elf and half-orc are retired.
- **⭐ Diversity is the priority; fairness is not.** *"I'm okay with some asymmetry between the
  species. I don't really care if some are 'worse' than others. I'd question the qualifying criteria
  there, because some species are just 'cool', and how do you measure that? Also we have a wide range
  of trades and not all of them call for the same kind of specialization. Players may find synergies
  that even we haven't anticipated."* ⚠ This revisits the graduated rule *"without ranking"*
  ([race.md § Why species differ without ranking](../../subsystems/race.md#why-species-differ-without-ranking));
  reconcile it at the build.
- **Mass gives real advantages.** *"A certain body mass will probably give some species a real
  advantage over others, at least for some tasks that require strength or reach."* Already the plan:
  organism-biology derives *strength from muscle share × mass*
  ([organism-biology-slate § 0](../engine/organism-biology-slate.md)), and size-and-carrying
  shipped mass-scaled fists and carrying capacity. The same physics charges for it: the big eat
  more, warm and cool slowly, hide and fit worse, gear is harder to fit, and **the TPA fare is by
  mass** ([fast-travel-slate § Carriers, tickets and mass](../engine/fast-travel-slate.md)).
- **The variable that matters is how often you meet your own kind**, because it flavors everything
  species touches: name cultures, enclaves, blood types, households, recognition by scent. That
  depends on how many peoples there are, how unevenly they are spread (a long tail, never equal
  shares), and where they gather.
- **Two populations, two biases, judged separately.** *"The selection bias for players vs content
  authors crafting NPCs is totally different, and we want both to be a source of diversity even if we
  may judge them independently."* Players pick for fantasy and bunch on favorites; in the lounge
  (players only) the odds of meeting your kind are the players' spread, and the world reflects it.
  Authors pick for story and place; outside the lounge the authored population sets the baseline.

### ⭐ Two pools and a ratchet

*"Keep the playable pool on the small side and then convert non-playable to playable as you start to
grow the player base and can accommodate more diversity."* Each pool spans **network TV to prestige
streaming**: *"some core D&D archetypes that are familiar to everyone and then also some more niche
species that hopefully have committed diehard audiences that will choose them just because of the
niche they're capturing."* NPCs draw from both pools (authors choose for theme).

**⭐ The order is complexity.** *"The initial roster I would want to keep very basic and easy to
learn. The ones we introduce later would introduce mechanics that are more complicated for more
experienced players. This kind of meets the audience where they are."*

**Playable at launch: basic bodies, one idea each**

| | people | the one idea |
|---|---|---|
| 1 | human | the baseline |
| 2 | elf | long-lived, keen senses |
| 3 | dwarf | dense: strength in a small frame |
| 4 | halfling | small |
| 5 | gnome | small, clever (the owner's NetHack mines; a gnome-town is culture, bestiary § 14a) |
| 6 | orc | large, strong |
| 7 | tiefling | the infernal lineage: looks, little else |
| 8 | troll | big: the simplest way to show mass matters (Katie) |

**Promoted later, in order of what they ask of a player**

1. **dragonborn:** one organ (breath is a gland, organism-biology § 12.5).
2. **kobold** and **ogre:** the extremes of mass, tiny and huge.
3. **lizardfolk:** the ectotherm (this slate's top candidate, and the thermal model already supports
   it): a day governed by temperature.
4. **catfolk:** senses (night vision, scent).
5. **attuned-born:** the aether, once the device layer exists.
6. **constructed people:** no metabolism, no blood (the tutor-bot's line): a different relationship
   with food, healing and death.
7. **centaur:** a different body plan, the module grammar's showcase: stairs, saddles and doorways
   change.

Each promotion teaches a system the player has had time to learn: mass, then an organ, then
temperature, then the senses, then the aether, then the body itself. Folklore or generic names where
D&D's are owned (*catfolk*, *lizardfolk*).

**Left out of the core sixteen:** satyr (folklore; free for any author); ghoul (the bestiary treats
vampires and zombies as conditions on any body, § 15, so a "ghoul people" may belong there).

### The attuned-born — native speakers of the aether **[LEAN]**

The story bible: ordinary mortals in whom a sensitivity surfaces, *"born touching the medium everyone
else needs an implant to reach,"* until the University mass-produced the implant (*"the wonder
becomes a clinic visit"*); the phone is now the default carrier and the implant elective
([off-grid-slate](../engine/off-grid-slate.md)). The owner: *"the aether sensitive species is weird
because it actually makes the game easier arguably … it's also something that doesn't quite have a
real life metaphor to draw from."*

- **Later, not at launch:** their difference is defined against phones, implants, coverage and
  power, none of which is built yet.
- **The metaphor: native speakers, against everyone else's translation device.** Fluent, no device,
  no battery, catching nuance a device misses (Sloane "sees everything": she reads presence). **But
  you cannot stop understanding a language you are native in**: no airplane mode, the busiest
  crossing in the city is loud to them, and in a space an author has deliberately shut the aether
  off, a phone loses signal while they feel the silence. The bible's allegory is the social cost: a
  natural talent technology made ordinary (people who calculated by hand once calculators arrived;
  traditional navigators once GPS did).
- **Sloane stays attuned-born as an NPC at launch.** Being one of the few is part of who she is.

### ⭐ Form apart from culture

The owner compared the roster to Age of Wonders 4's, grown through expansions. As I recall that
design, a people is split into a **form** (the body) and a **culture** (how its society works), and
its expansions grew both lists. That is the model the owner set for names: *"most names come from
cultures that identified with a specific species,"* a melting pot like Terminus has no naming culture
of its own (as America has none: its names are origin names, sometimes Americanized), and *"I don't
want to limit culture in the game to just culture-via-species; your culture comes from lots of places
in real life, so should the game."*

- **This roster is the form list:** bodies, mass, physiology.
- **Cultures are a separate list:** naming, customs, how a people organizes itself. Some grew up
  around one species, some are shared, some are regional or religious and have nothing to do with
  species.
- **Name banks follow culture, not form.** *"Some species want their own bank and some want to share
  and some don't even need representation along that axis."* A dwarf raised by a Terminus family
  draws from that family's culture; a dwarf from a mountain hold, from the hold's.
- **Both lists ratchet**, independently: a new form or a new culture arrives when the world is ready.
- **The peoples conversation becomes two:** which bodies (drafted here) and which cultures (not
  started). The place-names slate waits on the second
  ([place-names-slate](./place-names-slate.md)).

### Open, from the roster

1. **The cultures list:** which cultures exist, which forms they grew around, and their name banks.
2. **The binomial renames** for elf, dwarf and halfling.
3. **The playable seam:** what char-gen reads to know a species is playable, and how a promotion
   happens (a row change).
4. **Reconciling race.md's "without ranking"** with the owner's asymmetry.

## Open questions (for requirements)

1. **How many differences per species?** *Leans few and legible* — one
   opening, one burden. The NetHack recognizability gate applies: a
   species you cannot summarise in a sentence is not a species, it is a
   spreadsheet.
2. **Where is this communicated?** The **species dossier** in char-gen
   already exists and is the obvious home — but a difference you only
   learn at creation is a difference you forget. What surfaces it in play?
3. **Do differences apply to NPCs of that species?** They must, or the
   world contradicts the rule — which raises cost, since every authored
   NPC inherits them.
4. **Does any of this touch the existing seven humanoids**, or does it
   arrive with new species? *Leans: retrofit the shipped roster* — the
   humanoids are currently interchangeable, which is the actual problem.
5. **The ectotherm is the strongest candidate and the biggest change.** Is
   a temperature-variable player character acceptable, or is that too much
   for someone's first character?

---

*(The consequence build's two salvaged seams (MR!254) are resolved: the
`Species` contest-band-for-beasts design note belongs to combat, not
race, and is handed off in the compaction ledger rather than kept here;
the unconsumed-`Species`-fields census is folded into
[race.md](../../subsystems/race.md) — `lifespanMin`/`Max`'s
inert-on-purpose status was already documented there, and
`_parentCladePath`/`lifecycleStates` are now documented alongside it.)*
