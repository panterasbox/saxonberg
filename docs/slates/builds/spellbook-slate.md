# Spellbook slate — what every shipped system suggests to a caster

> **Status: UNBUILT** — opened 2026-11-07 with the owner, out of the prison → mana conversation.
> **Nothing gets built until the list is huge**: *"I probably will wait to build any of the spellbook
> until we have a huge list and we've really mined all our different interfaces for ways to 'break
> the rules', so to speak, the way magic can that the physical world denies."* Shipped substrate: 22
> spells in `arcane-library` (`stuff/idea/magic/Spell/*`); the closed roster of 12 effects
> (`inject-channel · afflict · relieve · adjust-reserve · move · conjure · sense · cloak · emit-field
> · relocate · confer-medium · offset-ambient`, [magic.md](../../subsystems/magic.md)); the item
> classes (charged: wand, ring, amulet · consumable: potion, scroll · the spellbook,
> [magic-items.md](../../subsystems/magic-items.md)); `SustainedEffect`, the timed condition kind.
> **Left:** clusters 5–12 of the walk (§ 4) · the NEW kernel Apis the catalog keeps naming (§ 7) ·
> `TimeBasedShadow` · the skill-buff line (§ 5b) · rune × verb × effect fit (deferred until the
> roster grows) · the bestiary requirement (§ 6)
> **Size:** unknown — the catalog is content; the NEW Apis are kernel work
> ⭐ **Sequencing [the owner]:** refactors → whaling → the RGO-unification conversation → **hunting,
> foraging and magic together**, one platform pass, because hunting asks the same questions. The
> doctrine, the moisture primitive and the mana supply are
> [mana-economy-design-pack](./mana-economy-design-pack.md) Part 11.

Sources it supersedes as the catalog: [capability-magic-slate](./capability-magic-slate.md)'s
**Wiz-War mining pass** and [magic-items-slate](../tails/magic-items-slate.md)'s **NetHack catalog
map** (buckets A–E). Both stay as sources; this is where rows land.

## 1. The method **[DECIDED — the owner]**

*"Go back through previous subsystems we've shipped … every system creating some kind of utility in
the game … and then the question becomes: if I'm a spellcaster, what spells does the system suggest,
based on its basic value proposition? We have five verbs that all can be interrogated here … the
nouns are less important to me but also there as an organizing principle. The what-kind-of-artifact
is also less important to me than how transient its effects are."*

For each system: its **value proposition** in a line → each verb (**perceive · create · destroy ·
control · transform**) — what would a caster want? (blank is an answer) → **how long it lasts** →
**what it rides**.

⛔ **The line**, held all day: **magic breaks the world's physics, never the record's integrity.**
Tier A is untouched — no spell mints money, forges a ledger, changes a title, fakes authorship, or
defeats a sanction (a ban, custody, banishment). Wiz-War's *Public Funds* stays out.

## 2. ⭐⭐⭐ How an effect is realized **[DECIDED — the owner]**

### 2a. Physics engine first; a shadow only where magic breaks physics

*"Most of these things are instant, or they're inflicting some condition that's physical, not
magical. Most physical conditions should be expressible just by the platform, or by creating new
rows and authoring them. The platform is a physics engine. But magic breaks normal physics, which is
why it needs shadows — but again, that's more of an amulet or a ring thing, not so much wands. You
solved light by putting a light source in the room, not shadowing the room's ambient light levels.
Both would be acceptable, but only the latter requires a shadow."*

**The test:** does the spell **make something the engine already simulates** (a light, a fire, a
wound, a sound) — rows, no shadow — or **change how the engine treats one host** (see without light,
can't be seen, feel no cold) — a shadow, mostly worn (ring, amulet) or timed (a potion).

### 2b. Getter shadows, never set-then-restore

*"I'd prefer a `getFoo()` shadow to a separate object that does a `setFoo()` and then another
`setFoo()` at the end to mutate state. Physical processes with these capabilities built in, that's one
thing — we can trust platform code to clean up after itself. But I don't trust the ordinary content
author to do this, which is why shadows are so great: you just destruct them and everything goes back
to normal. … It's encapsulated in one place."* Dependency: every reader of a shadowable property must
go through its getter (the methods-only rule's migration), so each property the spellbook shadows is
also a small sweep target.

### 2c. Persistent or staged decides the mechanism

| content is | change is | mechanism | ends |
|---|---|---|---|
| persistent | permanent | **a real setter** | never — nothing to undo |
| persistent | temporary | a shadow on the object | when destructed |
| staged | on what is in the scene | a shadow on the staged object | when the scene restages |
| staged | on the scene itself | ⭐ **a shadow on the stage** — shapes every restage until popped | when popped |

⭐ **A curse is a shadow on a stage** — the haunted inn restages with its ghost until somebody lifts it.

### 2d. Transience

| | what it is | rides |
|---|---|---|
| **instant** | happens and is over | one call through the system's own method |
| **timed** | lasts, then expires | a condition with an expiry (`SustainedEffect`); its shadow, if any, re-materialized from it on load. ⭐ A **`TimeBasedShadow`** base — a uniform, readable expiry — with the clock on the persisted condition |
| **held** | lasts while paid | a binding: a per-second draw that lapses when supply runs dry (`DrawMode: 'binding'`, declared, unread) |
| **permanent** | the world changed | the system's own state (a setter) |

*Once is cheap, held is dear* sorts the packages: scrolls, wands and runes for once; rings and
amulets for held — and held loses to the mundane alternative where one exists.

## 3. ⭐⭐ The world's shape, and what magic may enter **[DECIDED]**

- A **permanent** portal or room is a setter — **construction by magic**, through the same rights as
  building it by hand.
- A **temporary** portal or pocket room is an **overlay on the location graph** (furnishing's room
  overlay is the precedent) — gone when destructed, or at restage.
- **Magic may defeat physical barriers** — a portal through a vault wall is the same act as picking
  the lock (locks are physics), so it is possible and it is **burglary** under local law; it grants no
  authority.
- ⛔ **Magic never defeats a sanction.** A banned player cannot portal back into the bar; a prisoner
  cannot open a way out.

## 4. The walk — clusters by the utility they sell

| # | cluster | status |
|---|---|---|
| 1 | perception and knowledge | ✅ § 4.1 |
| 2 | space and movement | ✅ § 4.2 |
| 3 | the body | ✅ § 4.3 |
| 4 | matter and making | ✅ § 4.4 |
| 5 | time and decay (time, spoilage, maturation, fractionation, weather) | next |
| 6 | living things (husbandry … pets, butchery) | — |
| 7 | ground, water and power | — |
| 8 | mind and society (trait, renown, regard, emotes, behavior, dialogue) | — |
| 9 | communication (messaging, comms, chat, press, display) | — |
| 10 | conflict | ✅ § 5 |
| 11 | economy and ownership | — expected mostly ⛔ (the record) |
| 12 | governance and record | — expected mostly ⛔ (the record) |

ⓢ = a shadow. **NEW** = needs a kernel Api.

### 4.1 Perception and knowledge

| system · utility | perceive | create | destroy | control | transform |
|---|---|---|---|---|---|
| light · seeing in the dark | ⓢ darkvision | a light source ✅ (glowlight) | ⓢ a darkness zone | sunlight bent into a room, a beacon | a light's color |
| senses · noticing | ⓢ seeing through walls, ⓢ clairaudience; scry ✅ | a phantom sound (the postulate moves energy nonlocally) | ⓢ a zone of silence; blinding or deafening is physical | ventriloquism | — |
| concealment · hiding and finding | reveal the hidden — a `search` bought with mana | ⓢ **invisibility** | dispel concealment | misdirection | — |
| belief · knowing who's who | ⓢ true seeing | ⓢ an illusion (Wiz-War: real to whoever believes it) | amnesia (**NEW**: belief deletion) | ⚠ charm — a values question | disguise ✅ (veil) |
| the map · knowing the way | ⭐ magic mapping — **its own `scried` channel [DECIDED]**: a priced, competence-bounded sense, never the kernel's index | a waymark (a surveyed node) | — | a false trail | — |
| instruments · measuring | a reading without the instrument — magic buys access, competence still resolves detail | — | — | — | — |

### 4.2 Space and movement

| system · utility | perceive | create | destroy | control |
|---|---|---|---|---|
| locomotion | a route from scried claims | ⓢ flight, ⓢ water-walking, ⓢ spider-climb (modes on the mover) | ⓢ hold person (timed) | shove ✅; haste (**NEW**: engagement pacing) |
| boundary · doors and locks | ⭐ **knock** — perceive the bitting, move the pins | ⓢ hold portal (held, dear; the aether lock is the cheap way) | shatter (physical) | telekinesis on a door |
| containment | ⓢ see inside a closed box | ⓢ **bag of holding** — `getCapacity()` on the bag, drawing on its stone | — | apport |
| conveyance | — | a conjured disc or mount (**NEW**) | — | ⚠ charm again |
| teleport | — | a portal (§ 3) | ⓢ **dimensional anchor** — a held ward; the prison wants it | summon; relocate ✅ |
| holding | — | a pocket room (§ 3) | collapse it | — |
| water | position on a voyage | an air bubble | — | a fair wind, a calmed current — physical force held, priced by the flow |

### 4.3 The body

⭐ **Matter is the hard wall** (η ≤ 1; *transformation never creates matter*, A13): no blood or food
from nothing; every row answers *where does the matter come from?* A player's body is persistent, so
**healing is a setter**.

| system | perceive | create | destroy | control | transform |
|---|---|---|---|---|---|
| vitals | diagnose by touch | ⓢ second wind | sleep (a mental condition, like dread ✅) | ⓢ stasis (held, very dear) | — |
| harm | — | — | the damage spells ✅ | healing ✅ (a setter); ⓢ a regeneration ring | — |
| blood | typing by touch | ⛔ conjured blood | — | stanching ✅ | — |
| mortality | speaking with a shade | — | — | ⓢ delay death — freezes the dying clock, heals nothing | reembodiment (§ 4.3a) |
| metabolism | detect poison | ⓢ sustenance; ⛔ food from nothing (existing plant matter, yes) | neutralize poison | sober up | — |
| respiration | — | breathe-water ✅, an air bubble | ⚠ suffocation (physical, huge) | — | — |
| exertion | — | ⓢ bull's strength | ⓢ weakness; exhaustion | — | ⭐ **magical training** — the spell replaces the exercise stimulus; the protein still comes from food |
| encumbrance | — | ⓢ lighten load | — | telekinetic hauling | — |
| thermal | — | keep-warm ✅ | — | ⓢ fire or cold resistance | — |
| body plan | — | — | — | — | polymorph as semblance; ⚠ a permanent species change touches the race-allegory stance |

### 4.3a ⭐⭐ Reembodiment becomes a magic utility **[DECIDED — the owner]**

*"We actually want to move the entire reembody experience to be mana/magic based, even for people
that practice out of a brick and mortar building, the same way we did for teleport and the TPA."*

- **The working is the kernel's** (`ConditionApi.reembody` stays the one call); **providers** — a
  temple, a clinic, a shrine — are content and businesses, on mana from cells, a line or a reserve,
  resold at cost.
- **You must not need a temple to come back** — the free floor is the **ambient rung**.
- **A13 needs a matter source.** The floor builds you from **the ground you stand on** (dust, clay —
  poor feedstock, so you come back diminished: passage's 40% becomes **derivable**); providers build
  from **bought biomass** (a supply-chain demand: water, protein, fat); **your corpse** is the best
  feedstock but never required, so *no stranding* holds; the specification is the identity's own
  record. *"All fine for now."*

### 4.4 Matter and making

| system | perceive | create | destroy | control | transform |
|---|---|---|---|---|---|
| crafting | appraise grade by touch | — | disenchant | ⚠ a steadier hand (§ 5b) | — |
| assembly | parts and joint wear | ⓢ wear-proofing (the item's stone pays) | shatter | mend ✅ (a setter); fit at a distance | — |
| metal, glass, ceramics | read a melt's temperature | — | — | forging without a forge; shaping glass without a pipe | ⭐ **magical heat treatment** (affordable — NetHack's *enchant weapon* made real, a setter on grade); clear glass by refining out the iron |
| fire | — | conjure-flame ✅ | extinguish (cooling — priced like a heat pump) | fire-shaping | — |
| thermal | — | frost ✅, heat ✅ | — | ⓢ an always-cold box (held, dear — the coolbox wins) | — |
| faces | — | a warding coat carrying a rune | — | — | — |
| cleanliness | — | ⓢ never-dirty (held) | ⭐ **the cleaning cantrip** (near-free, a setter) | — | — |
| textiles | — | ⓢ a cloak of warmth | — | — | a dye change; ⓢ fade-proofing |
| bulk | — | conjure-water ✅ | evaporate | water uphill (`m·g·h`) | — |
| cordage | — | ⓢ an unbreakable rope | — | ⭐ the rope trick | — |

Magic is a superb craftsman's tool here without breaking anything. ⚠ It competes with the laundress —
honestly priced (*once cheap* keeps the everyday market hers).

## 5. ⭐⭐⭐ Combat — the core loop **[DECIDED]**

*"We need to figure out how all this plays out in combat. Not that combat is the only venue for magic,
but it's the game's core loop still."*

### 5a. Magic enters combat's own pieces

| combat's piece (shipped) | magic there |
|---|---|
| the exchange — a channel into `inflict`, materials-response decides the wound | spells deliver energy through the same channels; **no magic damage** |
| gambits — instrument + band, spending poise | ⭐ **a spell is a gambit**: a hand, wand or focus is its instrument (**casting competes for hand slots**); a big spell **overextends** |
| the fog — `sharpness = f(competence) · g(composure)` | ⭐ mind magic works **through the fog** (dread lowers composure → a thicker fog); blur/displacement are shadows on the band you *present*; clarity raises your own `g` |
| the three clocks | haste (tempo, **NEW**), second wind (endurance), healing (wounds) |
| the covering stack | ⭐ **a ward is a layer** with its own grid — stoneskin, a fire ward |
| ranged — bands, delivery profile, `energySource`, splash + its consent gate | bolts are projectiles on a wand's charge; ⭐ **a fireball is splash** — the consent gate and the ledger already handle the crowded bar |
| terms and consent | sleep is non-lethal subdual |
| morale | dread and fear act through morale |
| conductance (the missing fourth band) | **combat is burst-limited** — the biggest spell per beat; a big battery feeds you, never hits harder |

- **Party roles without classes** — a big spell overextends and occupies the hands, so a caster needs
  someone holding the line; the threat graph and formations already model it.
- **Cold iron, made real** — a doped-iron blade gives a caster's charge a path to ground.

### 5b. Buffs act on state, never on competence

*"Everything is on the table for me right now."* A clarity spell raises `g(composure)` and the fight
goes better, while the transcript records only what you did — strength, endurance, steadiness likewise.
The learned factor is never touched, so *we measure real competence* holds. (For crafting, the
evidence splits along `MagicProvenance` — smithing for the forging, arcana for the hardening.)

### 5c. How an item fires — the taxonomy **[DECIDED]**

*"We have to talk about more than spells — wands, potions, scrolls, and anything else that might fire
in combat."*

| how it fires | items | cost in the fight | countered by |
|---|---|---|---|
| **active** — a gambit | wands · scrolls (sight, light, a hand, a beat) · potions drunk · thrown vials | a beat and a poise commitment; a hand | disarm ✅; darkness or blinding (scrolls); striking the drinker |
| **passive** — rides your act | rings, amulets · **runed weapons** (fire on your strike) · ward layers · coatings | no beat; the store drains | a grounding blade; dispel ✅; a channel the ward doesn't cover |
| **reactive** — readied | talismans: life saving, feather fall, a contingent ward | a beat to ready, free to fire (*readied instants are the baseline*) | triggering it early; dispelling it |
| **placed** | glyphs, traps, door wards (`HazardMixin`) | paid in advance | `search`, `disarm` ✅ |
| **summoned** | conjured allies, a summoned wall | a gambit | **NEW**: conjuring a creature |

- An item gates nothing — it carries its specification, so a novice can fire it; skill shows in *when*.
- A runed weapon is how a spellsword escapes the hand-slot competition — why swords get sockets.
- Using an item is a **tell**, read through the fog.
- ⭐ **Potions are pharmacology — the route decides the onset**: a **draught** (swallowed — slow;
  before or after), a **drop under the tongue** (fast, small), a **vapor** (inhaled — fastest;
  second wind), a **dart** (injected — immediate). A combat healing potion is a vapor or a drop.

### 5d. Coatings

The owner: *"Why does the acid not eat the blade it's on? Who cares if a blade is actually on fire, it
always seemed actually worse to me."* The physics agrees, and prunes: **acid** corrodes steel (it
belongs in a thrown vial); **a burning blade draws its own temper** (past about 200–300 °C), so it
costs its own grade. The honest coats: **poison**, **silver** (the contact material), **mana-oil** (a
store on the blade). Coats are `faces.md`'s; how many hits a coat lasts derives from its mass over the
transfer per hit. ⚠ A poisoned blade breaks a duel's terms. *"A Witcher bestiary-based tonic or poison
would work for us here"* — and [bestiary-slate](./bestiary-slate.md) § 13 already decided it: *oils are
delivery — a coating carries what cuts a family's binding*, silver *the best conductor of a ward*.

## 6. ⭐ The requirement handed to the bestiary

Oils, poisons and tonics derive from the creature, never from a lookup table, so **every creature
declares** what its venoms work on, what its tissue reacts to, and its toxin tolerances. Witcher's
tonics (toxic to non-mutants) are **metabolism's toxin burden**, already shipped — the drinker's
biology decides.

## 7. The NEW kernel Apis the catalog keeps naming

belief write (illusion) · belief deletion (amnesia) · engagement pacing (haste, slow) · a weather write
(storm) · a location-graph overlay (portals, pocket rooms, create door / wall) · conjuring a creature
(summons, mounts). Each is a gated Api first — and is where the rule-breaking magic actually lives.

## 7a. ⭐⭐ The culture of magic goods **[the owner: "I buy this"]**

Speculation from the models, recorded as the design's expectation. Charge is invisible, and gems look
like their fakes, so the culture grows out of **not being sure what you're holding**.

- **Three registers of name**, on presentation's shipped forms:
  - what the eye sees: *a silver-chased broadsword set with three red stones*, which could be rubies,
    garnets or glass;
  - what the room calls it: *the ruby broadsword*;
  - the appraisal: *doped iron, damascened in silver, three rubies in plate-cut, about forty τ, low*.

  The appraisal is knowledge, and it can be wrong. Before it, the rubies might be **paste**.
- **Players talk in specs, not stones** (as with *a double-A* or *a V8*):
  - *a forty-tau blade*, *a high-draw wand*;
  - *flat* · *dead* · *topped off* · *live* or *hot* · ⭐ *a bleeder* (a leaky store);
  - *fab* (fabulite) · *Venus* or *hair* (rutilated quartz) · *a stack* (a plate-cut stone) · *a leyden*
    (a jar store);
  - *doped* or *hot iron* against *dead iron*. Folklore's *cold iron* inverts the battery slang, a nice
    regional marker;
  - for the bag of holding: *a hold* · *a deep bag* · *bottomless* (always a lie) · ⭐ *"she spilled at
    the ford"* · at customs, *"declare your holds"*.
- ⭐⭐ **The hallmark, a real institution.** When value is invisible, markets invent attestation:
  London's Goldsmiths' Hall has assayed and marked silver since about 1300, which is where the word comes
  from. **An assay office stamps a charged good with its mineral, capacity and purity**, a provenance
  mark plus a grade, on the [attestation](./attestation-slate.md) substrate. Counterfeit hallmarks are a
  crime, and trusted versus dodgy assay offices are where a market turns into a scam.
- **Authors will:**
  - build supply chains, not loot tables (a gem mine, a silversmiths' quarter, an assay office, an
    enchanters' row);
  - write geography (a strong-field town; a dead-zone camp swearing by plain tools; recharge
    expeditions);
  - write scams, heirlooms (chattel's chain of title makes *"carried by three captains"* true) and law
    (customs on holds, a ban on exporting silver, an enchanters' guild).

  ⚠ They'll push for bespoke effects, which grows the roster organically. Watch the `+5 sword` instinct:
  grade derives from materials and work.
- **Players will:**
  - optimize (capacity per kilogram, throughput, leak rate);
  - specialize (gem cutter, enchanter, assayer, silversmith, recharge runner);
  - live with fog, which makes assay and identification valuable and reputation what you trade on;
  - settle near nodes;
  - show off (a silver-filigree hilt is status even when flat);
  - ⭐ **name their gear** (*Grandmother's Needle*). Pets already have naming as a promotion; items could
    get their own handle.

## 8. Open

- Clusters 5–12.
- ⚠ Charm — magic writing someone's regard — a values question.
- `TimeBasedShadow`'s shape (the plan's).
- Rune × verb × effect fit — *"you're just burying the problem a layer deeper"* — deferred until the
  effect roster grows; *"I expect the spellbook to grow organically."*
- Stacking rules when several getter shadows sit on one method.
