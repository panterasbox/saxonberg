# Combat — the experience layer (working slate)

> **Status: design-phase companion to [combat-slate.md](./combat-slate.md).**
> That slate owns the *mechanism* — the session, poise, tempo, the hook
> catalog, resolution & exits. This one owns the *felt experience*: the
> dramatic arc, what randomness is and isn't, what "luck" means, how the
> loadout works as a chemistry-set input surface, how genres combine over
> one physics, and how a determinism-first system gets balanced. It is the
> product of a design interrogation and exists so that thinking doesn't
> evaporate in a chat log. Most of it feeds *later* combat cycles; a few
> pieces are cycle-1 constraints (flagged inline).

The one-sentence thesis: **the moment-to-moment loop is a commodity; the
experience is everything that seeds it and everything it produces.** We
farm engagement in *agency*, and agency lives in arrangement and
aftermath, not in the ticking.

---

## Thesis 1 — Three time-domains; the poise loop is the crucible, not the fun

Every combat session is a funnel across three time-domains, and agency
lives in two of them:

1. **Arrangement** (slow, pre-combat) — you *compose a plan*: loadout,
   party, where you fight, what's on the floor, the lights, a trap,
   scouting, positioning. The chemistry is *arranged*.
2. **The exchange** (real-time, directed) — the commodity crucible where
   the plan *reacts*. Short, punctuated, mostly self-running.
3. **Aftermath** (slow, post-combat) — where the reaction's products
   *propagate and cycle*: wounds, bodies, witness-memory, blame,
   reputation, contract completion, and the world resetting for the next
   player.

The discipline that follows: **spend almost nothing making the ticking
deep; spend everything making the ticking *read* a rich input set and
*emit* dramatic beats.** Trying to make the poise war itself engaging
builds a fighting game in text — an APM/optimization problem that's
tedious once solved. The tick loop is the resolution of a plan, not the
plan itself.

---

## Thesis 2 — The dramatic arc is emergent punctuation, not a script

An arc needs *punctuation* — beats where the flow stops or swells. Uniform
ticking is the enemy; but in a real-time multi-agent world beats can't be
scripted. They **emerge from thresholds crossed**, and the engine's real
job is to *detect and amplify* them:

- **First blood** — the first trauma.
- **The break** — poise shatters → the opening. The rising-action climax.
- **The down** — defeat. The physical climax.
- **The turn** — the two-stage-death window: the *moral* climax, slow and
  witnessed. You've won; now the room holds its breath while you choose
  mercy or the coup. **This is combat's emotional core**, and it is the one
  place we deliberately decelerate. Lean into it.
- **The close** — yield / flight / the guards pour in.

Mechanism: the engine emits a **beat-intensity signal** with every tick,
and narration + pacing + reaction-fanning scale to it. A `pressed` tick is
a murmur (silent/narration-only); a break is a roar — *literally*, the
reactions substrate volume-gates the crowd, so "the crowd roars" **is** the
audience telling the player it mattered. Resolve finely, **narrate coarsely
and unevenly** — the swell at beats is the arc. The crowd is the engagement
feedback loop.

**Planning in real time** = pre-commit the plan as a *policy* (tactic +
loadout + terrain prep); real-time play is *exception-handling at
punctuation points*. Directed-autocombat means you don't micro ticks (the
twitch trap we reject) — you set a standing tactic and intervene at beats.
Your attention budget buys the 3–4 decisions that matter, not the 30 ticks
between them. That is also what lets the world keep moving around a fight.

---

## Thesis 3 — Randomness: poker, not slots (epistemic, not aleatory)

Combat's uncertainty is **epistemic** (you can't *see* everything), never
**aleatory** (a die decides). This is the whole feel of the game.

- **Slot-machine uncertainty** — random *given full information*. You
  played perfectly; the RNG killed you. Steals agency; and it is the same
  un-derivable flat-number lie the codebase already rejects everywhere
  (derive-don't-track, bands-not-numbers, competence-as-exchange-rate, the
  retired HP scalar and attacks-per-round scalar). A die roll is
  un-derivable *by definition*.
- **Poker uncertainty** — outcome *determined* by inputs, but you can't see
  all the inputs: the enemy's true poise, their intent, whether an opening
  is real or a **feint**. You lose because you *misread*, not because a
  number spiked. Suspense, comebacks, and variety survive; agency survives.

And it is nearly free, because the machinery already exists:
**perception-gating + belief + the feint.** Enemy poise is banded and
hedged by *your* competence; a feint is a real gambit that presents as an
opening; the novice sees noise, the master sees signal. **The fog is the
dice, and skill is the thing that shrinks the fog.**

Concretely (all cycle-relevant constraints):

- **No random damage rolls.** Severity is deterministic — channel ×
  coverage × site × poise-state × energy (the materials-response function).
  An edge into a bare throat is catastrophic *every time* — terrifying and
  legible.
- **No to-hit dice.** Landing is decided by the poise/tempo/read contest.
  A "miss" is "you overextended" or "they parried" — a *caused* event.
- **No crit dice** (Thesis 4).
- **The uncertainty budget is spent on:** hidden enemy state, intent/feints
  (another mind's real choice), other players/NPCs (a multi-agent world is
  unpredictable because it is full of minds), and rare **environmental
  chaos** (a beam falls, a crowd surges, a third party walks in — a modeled
  cause with a stochastic *trigger*, dramatic and rare, never per-swing).

**The bright line, carved in stone:** *randomness may add texture and rare
chaos; it may never be the reason a skilled plan failed.* "I misread the
feint" / "I didn't account for the fire" is the game working. The
underdog's puncher's chance comes from **fog and terrain** (you can always
be outplayed or ambushed), not from dice.

This is *doubling down on the good half of Larian and cutting the mediocre
half*: its chemistry is deterministic (oil always burns — where the joy
is); its to-hit dice are its least interesting part.

---

## Thesis 4 — Critical hits: earned, never rolled

Keep the *dramatic payload* of a crit (the decisive, disproportionate
blow), change its provenance from rolled to earned:

- **The opening IS the crit.** Break a guard → the timed window is exactly
  when a committed gambit lands hard / inflicts real trauma. Earned by
  reading the poise state and committing into the break.
- **The called shot is the crit's targeting layer.** During an opening the
  exposed body-parts light up (hit-location); the gap in the armor is
  catastrophic *because you maneuvered to it*, not because you rolled a 20.
- **Materials-response makes severity "critical" deterministically** — an
  edge into a bare throat is lethal; the same edge into plate deflects.
  Catastrophe is a function of channel × coverage × site.

"Critical hit" means: *you earned the window and aimed at the gap.*

---

## Thesis 5 — Luck is emotional weather, not a coupon

There is no "luck" resource. There is a single **bidirectional
composure/spirit axis** — stress is its negative pole, inspiration its
positive — and it is a *state you are in*, not a token you hold. Three
properties make it **un-hoardable by construction** (want all three):

1. **It decays toward neutral** (the trait-position / regard estimator
   pattern: a game-time-decayed signed sum over an evidence ledger). You
   cannot save it for the big fight; it bleeds off.
2. **It is non-spendable.** Nothing to unleash — it *colors* the fight
   passively, it is not dumped into it. The critical fight simply goes
   better if you walked in *in the zone*, which you earned by how you lived.
3. **It is bidirectional, so chasing the high has a cost** — the same axis
   accrues stress from trauma, defeat, prolonged danger, and acting against
   your own character. You cannot farm the upside.

This is the improvement on D&D inspiration: **a mood, not a coupon.**

Where it plugs in (mostly built): it is the *completion* of the
stress/composure axis `trait.md` defers to "job 3."
- The **accrual pipe exists** — the trait layer already turns in-character
  acts into disposition evidence (`BehavedMixin`, the disposition ledger).
  Honored disposition / emotes / witnessed deeds / a good yield / social
  affirmation mint the positive pole; trauma / defeat / defied disposition
  the negative. Same ledger, both poles.
- The **estimator pattern exists** — signed scalar, derive-on-read,
  decayed, banded (regard, trait-position verbatim). No stored "luck field,"
  no grind surface.
- Its **combat effect is epistemic + recovery, never a roll** — inspired =
  the fog thins, poise recovers better, composure holds when the guard
  breaks; stressed = the inverse. It modulates the poker layer; it never
  adds dice.

Architecturally it is an **emotional reserve parallel to the physical
endurance reserve**: endurance caps poise recovery *bodily*, composure
caps/boosts it *spiritually* — one fast tactical gauge (poise) gated by two
slow reserves. Term hygiene: **poise = this fight's footing; composure =
the character's emotional state that colors every fight.**

The loop it closes: *live your character → the zone → sharper play →
dramatic deeds → the zone.* Un-gameable, because the moment you stop
*being* it, it decays.

**Mandate for the deferred `traits-stress` build:** build it as a
bidirectional emotional axis that combat reads and writes, positive pole
doing the luck-like work as a decaying state. Cycle-1 combat leaves only
the cheap seam it leaves anyway — poise recovery and read-fog take a
pluggable modulation factor (competence provides it today; composure joins
later).

---

## Thesis 6 — Profiles are vectors; the strategy layer is Paradox/Civ

There is no "attack rating." Weapon × species × skill compose into a
*profile vector*:

- **Weapon = your unit type** (the Civ/Amplitude read). Rapier = point +
  tempo-fast + cheap commits + riposte/disarm gambits; maul = blunt +
  slow + committal + guard-breaker. The loadout *is* the archetype.
- **Species = chassis + stat floor.** Innate instruments (claw=edge,
  horn=point, mass=leverage), reach, vital-band resilience, tissue
  toughness (materials-response at the tissue layer), limb→slot count,
  locomotion modes. Dual: affordance source *and* stat substrate.
- **Skill = the multiplier on all of it.** Competence is the *exchange
  rate* — how economically you spend poise, how little you erode, how fast
  you recover, how small a commit breaks a guard — plus band-gated unlocks
  plus how well you *read* (perception-gating).

The payoff: **no global "who's stronger" — only matchup × terrain.** The
duelist dismantles the troll in the open and dies grappled in a doorway.
Rock-paper-scissors depth emerges from the axes; it is not authored.

**The Paradox analogy is right about the structure, wrong about the dice.**
A strategic *arrangement* layer (the modifier stack you set beforehand —
loadout, terrain, skill, prep) feeds a tactical *resolution* layer (the
poise churn). Two deliberate departures: (1) **individuals, not armies** —
you are *in* the exchange, spending one intervention per beat, not a
spectator to the aggregate; (2) **the churn is caused, not rolled** — the
poise bands slide because of deterministic contest resolution, so every
swing has a cause you could have influenced. It *looks* like Paradox
churn; it *is* poker.

---

## Thesis 7 — The chemistry set already exists (as the world's physics)

The surprising finding: **the reagent shelf is almost entirely built.**
Combat's richness is combat *reading* substrates that already ship as
drivers; the work is **coupling, not new physics.**

### The reagent shelf (status · what it hands combat)

- **Materials-response** ✅ — the consequence engine (channel × construction
  × material × site → deterministic trauma); `DurableMixin` → weapons wear
  mid-fight. *Cycle-1 core.*
- **Perception / belief / senses** ✅ — the poker engine (banded reads,
  feints, disguise, recognition). *Cycle-1 core; most load-bearing.*
- **Light / darkness** ✅ — the direct dial on the fog. Douse lights,
  ambush from shadow, torch = light + thermal. *Highest-leverage cheap add.*
- **Thermal** ✅ — fire/brazier/campfire hazard+weapon; the burn trauma
  behavior already exists; freezing environment as attrition.
- **Bulk / liquids** ✅ — oil/water pooling on the Floor surface-bulk →
  slick footing; throw a drink; drown in a barrel.
- **Respiration / air** ✅ — drowning in water/vacuum via a
  `SustainedEngagement` drain; medium-as-death-channel. (Hand-strangulation
  channel *deferred*.)
- **Encumbrance / locomotion** ✅ — the tempo & chase substrate; heavy armor
  = slow + can't sustain a chase; mode-gated pursuit. *Tempo coupling is
  cycle-1; chase is cycle-2.*
- **Geometry / spatial / boundary** ✅ — reach, chokepoints, cover,
  surfaces, doors, the room graph (melee edge is location-local).
- **Metabolism / reserves / toxins** ✅ — endurance caps poise recovery;
  fighting drunk (BAC → worse reads); poison-on-a-blade (toxin payload on a
  wound); exhaustion decelerates a long fight.
- **Posture** ✅ — `prone` is a posture; kneeling in surrender; standing
  over a downed foe (the coup posture).
- **Biome / weather** ✅ (W1) — rain → wet floor + dimmer reads; cold snap →
  drain; mist → fog. Ambient pressure you didn't choose.

### The composition rules (the multiplicative pairs — enumerate axes, not outcomes)

`leverage × geometry` → shove into wall / off ledge / through door ·
`leverage × thermal` → shove into fire · `leverage × bulk` → shove onto
slick / into water · `grapple × respiration × bulk` → hold under → drown ·
`bulk × thermal` → hot oil / freeze-to-ice · `bulk × locomotion` → slip →
prone → exposed · `light × perception` → darkness thickens the fog · `thermal
× material` → heat the blade · `channel × toxin` → poisoned weapon · `material
× durability` → the blade chips across a long fight · `encumbrance × tempo ×
locomotion` → slow *and* can't run · `perception × disguise` → ambush /
mistaken identity · `alcohol × perception` → the drunk misreads (the bar
brawl, honestly modeled).

**Never enumerate outcomes** — that is a fighting-game move-list, finite and
tedious once mastered. Enumerate the *axes* + the *composition rules* and
let the space emerge (the chemistry-set, not the recipe-book).

### The GlassAlley template — half the marquee moves are nearly free

`onEntered → inflict` (the GlassAlley hazard room) is the shape of every
"shove into X": a **leverage gambit relocates the target, the destination's
hazard/medium inflicts.** Shove-into-fire, knock-into-water, slip-onto-ice
= one built gambit (relocate) × one built consequence (thermal burn /
respiration drown / fall trauma). We don't build environmental attacks; we
let the exchange move a body into physics that already exists.

### Slated extensions (none blocks cycle-1)

- **Trap-arming as a first-class thing** — GlassAlley is a hazard *room*,
  not an *armed device*. Pre-placing a trap (the prep phase's headline
  verb) needs a small "arm an environmental effect" bridge.
- **The residency reset sweep** — cycling spent content (corpses decay,
  cleared grounds replenish); combat is its first serious customer
  (Thesis 9).
- **capability-magic-slate** — a new reagent *class* (elemental effects)
  composing through the *same* channels-not-nouns grammar; drops onto the
  shelf for free when it lands.
- **Ranged / thrown + weather Wave 2 (wind vectors)** — deferred together;
  ranged makes wind and long-geometry tactically live.
- **Strangulation channel, contaminant/gas reader** — the choke-out and the
  smoke-out (named-deferred in respiration).

---

## Thesis 8 — Loadout is a bag of portable reagents; genre is a costume

Apply channels-not-nouns to the *whole kit*. Every loadout item is a
**delivery mechanism for a reagent the sim already runs**: weapon delivers
a channel · armor resists a channel · smoke bomb manipulates
light/perception (an occlusion volume) · caltrops a footing hazard · oil
flask a throwable bulk reagent · torch/flare a light+thermal source ·
net/bola entangle/leverage · poison vial a toxin payload · stimulant a
reserve manager. Emergent play falls out: a smoke bomb removes *witnesses*,
so it is also a murder tool the blame ledger must reckon with — nobody
authored "smoke enables murder"; two systems touched.

**Genre-blending is free, because we refused to model genres.** A flashbang
and a smoke bomb are one object (a perception-occluding emitter); a frag
grenade and a fire-flask are one object (an area thermal-kinetic emitter);
a rifle and a longbow are one object (ranged channel-delivery); NVG and a
cat's-eye potion are one object (a `VisionModality` unlock); a cryo-grenade
and a frost spell are one object (a thermal-cold emitter). **Genre is a
costume the physics wears.** The multiverse premise is *mechanically
coherent* because everything reduces to bodies-with-tissue wielding
channel-delivery instruments in rooms with light/heat/footing — the sim
does not know which world an actor walked in from. Provenance blends the
same way: modern gear carries a corpo *mark*, fantasy gear a `CraftedMixin`
maker's-mark — same model, different flavor.

**The gearing-up sequence is the arrangement phase made tactile** —
pre-commitment made physical, choosing which parts of the chemistry set you
bring to a fight you cannot yet see. It is honestly *constrained*:
**encumbrance is the loadout budget** — not "3 slots" but "everything you
carry costs weight and tempo" (encumbrance→tempo is built). Travel heavy and
slow, or light and underprepared. The budget balances itself.

---

## Thesis 9 — Balancing a determinism-first system

**HP is easy because it is arbitrary** — tune one number, the fight lasts
longer. We gave that up on purpose, so we owe an answer.

- **Grounding prunes absurdity for free.** With damage = channel × material
  × construction × site and materials carrying real hardness/toughness
  (MPa / MJ·m⁻³), a butter knife *cannot* beat a sword — the physics forbid
  it. The sim is a *constraint* that keeps the space sane; you are not
  hand-tuning every number.
- **The real problem is degenerate *compositions*, not unit stats** —
  drown-in-a-puddle, infinite-smoke-stall, shove-off-every-ledge.
  Fun-broken in single-player is grief-broken in multiplayer. Four
  sim-native levers handle most of it:
  1. **Cost is physical, not assigned** — a shove-into-fire needs
     positioning + poise + a leverage capability + *the fire being there*.
     The preconditions are the nerf; the strongest moves demand the most
     arrangement (self-limiting).
  2. **Consumability + conservation** — depleting reagents (oil gone once
     thrown, smoke spent, blade dulls) make power depletable; the
     conservation laws you already have (banking mint-only, bulk transfer)
     extend to combat.
  3. **Symmetry** — same rules for everyone → a dominant strategy is
     *universal* and therefore *counterable* (rock-paper-scissors closes).
  4. **Bands are a tolerance buffer** — outcomes are banded, so you tune to
     the right tier, not the decimal.
- **The combat gym (the big lever).** Because combat is
  *deterministic-given-information* and a *single-thread coroutine*, you can
  run it **headless at scale** — instantiate two Characters, a loadout, a
  terrain; run the session to resolution in-process; do it 10,000 times
  across skill × loadout × terrain matchups; read the outcome distribution.
  Degeneracies (plate always wins, smoke stalls, one gambit dominates)
  surface *before players find them*. **The determinism we chose for honesty
  is the same property that makes automated balance-testing possible.** This
  is a concrete buildable tool and it directly de-risks the load-bearing
  open question (`combat-slate` OQ1, the competence→exchange-rate curve —
  "structure sound, numbers are the risk"); the gym is how you find the
  numbers.
- **The honest limit:** you balance an emergent system *empirically* (gym +
  playtest) and *contain* the rest with the consequence web. Murder-via-smoke
  is not balanced away — it is made *expensive* by blame. The immsim answer
  to "overpowered" is often "yes, and the world reacts to you using it."
  **Balance = numbers + consequences.**

---

## Thesis 10 — NPCs ≈ PCs (the same combat model)

Keep NPCs and PCs on one combat model:

- **The balancing surface halves** — one system to tune, no
  monster-stats-vs-player-stats divergence.
- **It is honest** — an NPC is beatable by exactly the means a PC is; no
  hidden monster rules.
- **It makes "NPCs are expensive carves" coherent** — a dangerous enemy is
  a *Character with a combat brain and a loadout*; authoring one is
  authoring a *person*, not a stat block.
- **It enables mixed crews** — a hired-mercenary NPC and a player mercenary
  are interchangeable in a contract (the staffing model depends on it).

The **one** clean divergence — the only one you want — is *who is steering*:
a **brain (policy)** for the NPC, a **player (intervention)** for the PC.
Same poise, same channels, same reagents, same consequences; different hand
on the tiller.

---

## Thesis 11 — Aftermath & cycling (the fight's debt to the world)

### The arc ⊥ stakes ⊥ recovery decomposition

Three orthogonal axes, and conflating them is the trap:

- **The arc is invariant** — setup → poise war → the break → the turn →
  resolution — *the same shape* whether the stakes are hurt ego or death.
  You do **not ration drama by rationing danger**; low-stakes fights are
  constant *and* dramatically complete. Drama comes from the arc, weight
  from the stakes. (And the arc has a **floor**: even a quick fight is
  arc-complete — a literal instakill is *no arc*, which is why two-stage
  death exists. The arc-floor and the anti-instakill guarantee are the same
  thing.)
- **The stakes = the recovery cost** — you do not set an abstract "stakes"
  number, you set *how costly the recovery is*. A bruise recovers in
  minutes, a maiming in weeks, death is the longest arc. Independently
  scalable: crank the recovery cost from a scratch to a catastrophe without
  touching the fight's shape.
- **Recovery is its own dramatic arc** — the falling action the climax
  *seeds* (convalescence, the medic, the scar, the retraining, the return),
  and it *reshapes your choices while it runs*. **Defeat does not end a
  story; it starts one.** Partly built: harm's persistent trauma + the medic
  vertical + metabolism-coupled healing already *is* a recovery arc. The
  honest property is **plasticity** — heals given time and effort, scars can
  linger, but rarely *forever*.

### The aftermath is a fan-out, not a system

Combat is a *producer* writing the fight's facts into a dozen existing
consumers — almost no new machinery, just *emission*. Products of a fight:
bodies (downed/dead), wounds on *survivors including the victor*, litter
(dropped gear, a dropped torch that is now a live fire), spent arrangements
(sprung traps, spilled oil, blood-as-floor-bulk), witness memory
(belief-store writes, identity leaks), standing (regard/renown/blame/
chronicle/presence-relay), economic (contract completion, stakes transfer,
sunk gear), emotional (the composure/stress axis moves). Most of it is
shipped or seamed.

### The body pipeline

**alive → (defeat) → unconscious (recoverable) → (coup / vitals-death) →
dead Creature = the corpse → (reset sweep / labor) → reaped.** Death does
**not** destruct the Creature — it flips lifecycle and the body persists
*as* the corpse: it **cools** (thermal, built), is **lootable/movable**
(containment/haulage), and is **evidence** (cause-of-death via the blame
ledger — a body in the street is a crime scene). The PC-death *consequence*
is a separate subsystem (see
[mortal-vessel-slate.md](./mortal-vessel-slate.md)); combat produces the
event, the vessel is unmade, everything downstream is selfhood.

### Ending well regardless of outcome

**Every ending is a story-seed, not a score.** Every resolution gets a
composed arc-closing beat — *never* a hard cut (even dissolution/linkdead
gets "the moment breaks"). Defeat wakes you with *interesting consequence*
(the wound reshapes your choices, disarm sends you to recover a blade,
capture is a whole situation) — content, not a timer. The witnessed story
is the payoff win-or-lose (a **loss can be legendary**). And **the victor's
aftermath is not free** — bleeding, spent gear, blame if it was murder, a
body to deal with, wary witnesses. **Winning has a tail**, which is what
kills the murderhobo loop: every fight *costs*, in the aftermath, not by a
rule.

### Cycling is layered player labor, not a garbage collector

Do not silently delete the mess — **make processing it a job.** Coroners/
undertakers dispose of bodies; animal control manages the ecology;
scrappers recycle litter back into the material supply. **The mess is
demand** — the aftermath *feeds* the economy (someone is paid to clear the
dead; scrap re-enters crafting), which is combat-serves-the-economy at the
tail (reuses the employment engine + banking + material economy). Cycling
becomes **layered**: (1) player labor (primary, diegetic, economic) → (2)
NPC laborers (the employment engine fills the gap) → (3) the residency
**reset sweep** (the *fallback* for untended wilds). The sweep is the safety
net, not the mechanism — and tending vs. neglecting the world becomes real
player agency in constructing/deconstructing the narrative.

Ownership is the persistence line (durable-on-owned-ground persists =
property; transient-on-public-ground resets). **Renewable content is an
ecology, not a spawner** — beasts come from a source, over-hunting depletes,
a hunting ground is a *managed commons* (on-brand with the cooperative /
stewardship north-star; its own deferred slate). The reset cycles the
*renewable* (rats regenerate) but **never resurrects the *authored*** (a
slain named villain stays slain — a narrative event, not a respawn); the
line is *narrative-level* cycling (named) vs. *ecology-level* cycling
(generic).

---

## Thesis 12 — De-escalation: real roleplay against modeled stakes (NOT a social minigame)

De-escalation is a first-class, advanceable, rewarded resolution path — the
immsim multi-pathway (the bouncer who *talks the drunk down* and the one who
*subdues him* complete the same contract; "de-escalation is a combat skill").
But the mechanization is a trap. **A symmetric social-combat minigame — a
"resolve" gauge you attack with instrument-vs-disposition "armor" — is the
Deus Ex: HR contrivance and must be avoided.**

**Why the minigame is contrived:** physical combat abstracts *because the
real act is impossible in text* (you can't swordfight through a keyboard, so
poise is an accepted stand-in). Social conflict feels fake as a minigame
*because the real act — talking — is native to text.* A resolve-gauge
competes with the genuine article ("why deplete a bar when I can just *say*
something?") and loses. The error is forcing a symmetry between physical and
social conflict that isn't real.

**The honest version:** de-escalation is *real* social interaction (actual
words / threats / offers / mercy / reputation) whose **stakes and
consequences the engine models, but whose content it does not.** The engine
holds the space, models the world's response, and provides the
terms-renegotiation hook (`terms.yieldOffered`/parley); the persuading is
roleplay, witnessed. No gauge, no instrument-puzzle — this is the
"fair-boring core + creators clothe it" doctrine the minigame version
violated. Mechanically, de-escalation = **renegotiating the terms *down to
no-fight*.**

**The PC/NPC will-asymmetry (interchangeability holds for *bodies*, not
*wills*):**
- **NPC de-escalation** — the target's will is *modeled*: brain + traits +
  emotional state + regard + belief evaluate your *real acts* and respond.
  Legit; no real psychology to offend.
- **PC de-escalation** — you *cannot* model a human's resolve. Pure roleplay
  + **incentive**: present a case, the real human decides, weighing the
  stakes. You don't *break* a player — **you give them a reason** (make peace
  mechanically attractive: avoid the injury / blame / recovery-cost /
  reputation-hit).

**Stress/inspiration** modulates *capacity and posture* (read, composure,
credibility) for both — but the *decision* is modeled for NPCs, real for
PCs. State colors the board; will stays with whoever owns it.

**The needs split the design work:** NPC needs are *authored* → de-escalation
is a *reading* problem → build brains with readable needs. PC needs are
*real/emergent* → an *incentive* problem → make the peaceful path serve their
goals.

**Advancement stays honest:** competence = *capacity* (NPCs weight a skilled
orator's acts more; you *read* the target's needs/state better; you *unlock*
deal-framing options) — **never a coercion stat, never forces a player.**
Still a full face/diplomat career, still no-blame-rewarded, sentience-gated
(a mindless beast has no will to reach → the cull stays pure physical).

**Physical and social conflict are both resolution paths that resolve by
*different means*** — one a mechanical contest (bodies), one real interaction
against modeled stakes (minds, one of them human) — **and that asymmetry is
the honest design, not a flaw to paper over.** The generalization
(negotiation / persuasion / intimidation / interrogation) reuses the
*pattern* (situation + modeled stakes + NPC-brain-response + PC-incentive),
**not** a shared minigame engine.

## Thesis 13 — Morale & surrender (the modeled will; what makes non-lethal the default)

Morale is a **derived assessment, not a gauge** (we rejected the resolve-
gauge in Thesis 12 — don't smuggle it back). Each beat an NPC brain re-judges
"should I still be fighting?" from state that already exists — a derive-on-
read readout like a condition-band, never stored morale points.

**It is the convergence point of every substrate:** the body (poise / vitals
/ reserves), the situation (the threat graph — focus-fired? outnumbered?
leader down?), the emotional weather (stress/composure), the disposition
(traits — brave / craven / loyal / zealous / wrathful, which change the
morale *function*, not just a threshold), the stakes (a mercenary yields, a
zealot dies), and belief/reputation (facing a known killer tanks morale).

**Decision space** (disposition-shaped): fight on / **yield-surrender** (a
bidirectional social act — offered + accepted-or-refused) / **flee-rout** (→
the chase) / **berserk / last stand** (morale break as *fury* not flight —
the cornered rat, the fanatic) / **waver** (pre-break effectiveness decay —
the *tell* a skilled fighter reads).

**Group morale = rout & rally** (multi-party): one break pressures the others
(leader-down shock + ally-fleeing contagion) → a side *routs*; the counter is
*rally* (command discipline / a heroic stand / the `inspired` flag). The home
of the command/leadership lane.

**PC/NPC asymmetry** (the will-line, from Thesis 12): NPCs *decide* (modeled);
PCs *choose* — morale degrades a PC's *capacity* (a `shaken` status, worse
reads/commits) and shifts the *incentive*, but never seizes the decision.
**Compulsion on PCs is a hazard** — fear makes fighting harder and fleeing
smarter, never automatic (a hard mind-control effect is an opt-in extreme,
not baseline).

**Surrender + coup + blame:** surrender is the social off-ramp; a surrendered
foe is at your mercy (a *voluntary* down-state) → the victor chooses
mercy-or-execute (the moral climax). Executing a yielded sentient is *the
crime* (blame). It is a trust transaction priced by reputation (do you
surrender to a known killer?).

**The payoff:** without morale, fights run to the death seam; **with morale,
combatants break — yield / flee / rout — long before death**, making death
the *exception* (the cornered, the fanatic, the executed) and realizing the
vitals thesis. **Morale is the mechanism that makes the default resolution
non-lethal.** Mostly reuse (the inputs exist); new = the assessment logic (a
brain capability), the surrender/rout mechanics, the `shaken`/`wavering`
status. Cycle-1: individual NPC yield-when-losing (the consented-duel demo
needs it); rout / rally / berserk are multi-party, later.

## Thesis 14 — Weapon playstyle & the hand-slot economy (derivation, not stat blocks)

A weapon is a **derived playstyle bundle**, not a stat block: you author a
*shape* (long, balanced, double-edged steel) and the playstyle **computes**
from form × material × dimensions — legible + previewable (the `analyze`
surface). Each axis is an *input to a system we already built*:

- **Reach** → the threat graph: a discrete *control-until-closed* tier (the
  spear owns the approach — strike before they form an edge; the dagger owns
  the clinch — reach becomes a liability closed). Composes with geometry
  (no pike in a doorway) + formation (the spear wall).
- **Balance** → the poise economy + tempo: heavy/committal = **guard-breaker**
  (high poise-dmg, slow, high overextend — *create* openings); light/quick =
  **exploiter** (fast, precise, punishes overextend — *cash* openings). The
  `balanceFactor` tempo input. Complementary in a party (breaker+exploiter =
  tank+striker).
- **Guard** → the parry/riposte (defense-is-generative): crossguard parries;
  flail/whip bypasses guards but can't self-guard. An offense↔defense axis
  orthogonal to balance.
- **Shield** = **wielded armor-construction** (pure materials-response reuse):
  *directional* coverage (face one edge → strong 1v1, weak focus-fired), high
  guard, costs a hand, sunderable (durability), shield-bash = blunt/leverage.
- **Unarmed/grapple** = the **bypass floor** (always available → disarmed ≠
  helpless, fight in prison) + the **anti-reach clinch** (bypasses spear/
  sword, sets `grappled`, the control game, the drown/choke delivery).
- **Ranged/thrown** = **freedom from the melee edge** (vulnerability =
  being-closed-on; the kite; thrown = one-shot loadout-reagent; ammo =
  consumability lever; cover-as-status; poker hit-resolution, no coordinates;
  the protect-the-archer VIP tactic).

**The unifier — the hand-slot economy** (embodiment/Wieldable/slots): you
have two hands, and every armament is an *allocation* — 2H / 1H+shield /
dual-wield / 1H+free-hand / 1H+sheathed-sidearm — each a tradeoff, none
dominant.

- **Switching = dynamic reallocation** — a **vulnerable durative beat**
  (spends tempo, guard down; a *read*, not a menu-swap). Driver = the **range
  transition** (spear→dagger closed, blade→bow kiting): switching keeps you
  optimally armed as the fight flows through ranges → reach is *dynamic*. A
  sheathed **sidearm** draws fast (the disarm answer → disarm is a tempo
  setback, not a fight-ender); a dropped weapon is a slow, geometry-contested
  pickup.
- **Dual-wield = the doubled case** — trades defense/versatility for tempo/
  pressure. Two styles: aggressive (two offense) or **sword-and-dagger**
  (off-hand parries = a tiny shield). **Attention-split → band-gated mastery
  playstyle** (novice worse; grow into it). Clever build: sword+dagger =
  *carry both ranges* = the **anti-switching** build.
- **The free hand is chemistry-set access** — grapple / throw the reagent /
  grab the torch / quaff / snatch an **improvised weapon** (chair/bottle,
  playstyle *derives* from materials-response). So dual-wield/2H **costs you
  the chemistry set** (both hands full); 1H+free-hand keeps it (less output,
  more agency). Another un-authored tradeoff.

Net: combat is a **range × hand-allocation dance** riding on top of the poise
contest — all built substrate (hand slots, `hands`/`attention` engagement
slots, tempo, reach, durative acts, encumbrance for carrying backups,
geometry for pickups), all costed, no new mechanic. **Deferred** with weapon-
playstyle (cycle-2/3); cycle-1 = single Wieldable delivery-form + the
`balanceFactor` seam; leave the hand-slot-allocation + durative-switch seam.

## Thesis 15 — Non-humanoid / monster combat (the bestiary is data, not code)

The trap: hand-authoring a stat block (and special code) per monster. The
fix: **a monster *is* its BodyPlan, and combat *reads* the BodyPlan** —
zero per-monster code. The BodyPlan substrate is already data (typed anatomy,
tissue composition, slot↔part relations, per-plan vital profile), so combat
*derives* how a creature fights.

- **Anatomy → moveset (already derived):** the affordance model — a
  creature's gambits *are* its parts as instruments (claw=edge/rend,
  tail=blunt/leverage, tentacle=grapple, stinger=point+toxin). The anatomy is
  the moveset; the {capability+band} gate resolves it. No moveset authoring.
- **The contest *shape* is derived, not assumed humanoid** (the key move).
  The BodyPlan expresses a few properties and the system picks the contest:
  **has-guard?** → the poise contest, *scaled* by coordination (duelist=full
  feint-game / beast=reactive-dodge / ooze=none); **has-vitals?** → vital-
  strike vs. **attrition** (swarm/ooze = distributed, "vitals" are numbers/
  mass); **has-morale?** → yield/rout, *scaled* by mind (sentient trait-driven
  / beast instinctive / construct none = fights to destruction); **bleeds?** →
  the trauma cascade vs. **structural failure** (a golem doesn't exsanguinate).
  Same substrate → a fencing duel, an attrition grind, or a demolition,
  because the body chose.
- **Scale → reach/mass/tissue (derived, not "giant rules"):** a giant =
  humanoid-plan scaled → huge reach/mass/thick-tissue → *close inside its
  reach, target the gaps, avoid the stomp* — all from reach+mass+materials-
  response+graph. Swarm = the inverse.
- **Swarm = a bounded graph-abstraction:** one swarm-entity applying N edges
  of focus-fire pressure, N gated by your space (a chokepoint limits how many
  reach you — the formation rule). Bounded; no 50-node sim.
- **Movement modes → graph/chase** (flyer=free-kite=ranged-problem,
  burrower=ambush=stealth-problem) — reuse of locomotion+graph+stealth.
- **Weaknesses via materials-response (the honest NetHack):** the skeleton
  resists edge (bone → glances, blunt shatters), the ooze ignores slashing
  (fluid), fire evaporates it — "weakness" is the creature's *tissue-as-
  material* meeting the channel, deterministic, no weakness-table.
- **Reconciles NPCs-are-carves via two tiers:** **Characters** (sentient,
  named, personality carves — the cast) vs. **Creatures** (BodyPlan-driven,
  data, derived combat — the fauna, cheap, populated by bodyplans + ecology).
  Non-humanoid combat is the creature tier; the carve budget stays on the
  named cast.

Payoff: a new monster = a new **BodyPlan**; all reuse (materials-response
tissue, affordance instruments, threat graph, morale, locomotion). Systems-
not-content at the bestiary. **Cycle-1** needs only the simplest beast (the
cull-vermin: a BodyPlan, minimal/reactive poise, attrition-or-vital defeat, a
beast-brain, lethal-ok); swarms/oozes/scale/distributed-vitals/structural-
constructs/weakness-via-materials are the deferred bestiary layer.

## Thesis 16 — Expressive authoring (the soul is content; the discipline is restraint)

Mostly already designed (Thesis 5) — this is the creator experience + the one
hard discipline. The engine ships a fair-boring resolution + **labeled
two-faced hooks** (outward = per-viewer narration + reaction; inward = an
extension call the brain/script/contributor answers); creators clothe it
through surfaces they already use. **No combat-VFX system, no combat-specific
authoring tool.**

- **The default is complete, not placeholder:** with zero authoring, combat
  narrates per-viewer / perception-gated / register-styled (scene composer +
  MML + markupAugmenters + RecognitionApi + ProseApi). Authoring is
  *enrichment on a working default*, never filling a void.
- **The authoring layers (each a reuse):** signature moves (ProseApi Liquid
  bound to `{actor/weapon/species, gambit, hook}` via `InstanceContributor`) ·
  NPC combat personality (brain + traits → *fights like a character*) ·
  trait-driven emotes · weapon/species flavor (markupAugmenters/prose + the
  corpo mark) · scripted set-pieces (scripts hooked to combat events — boss
  phases) · per-viewer narration templates (ProseApi — customize the voice,
  the engine keeps the perception-gating). Authoring = *attaching content to
  hooks*; nothing combat-specific to learn.
- **The witness is a co-author (emergent):** the volume-gated reactions
  substrate makes every dramatic beat witnessed/reacted-to. The product =
  authored fighter-flavor + **emergent witness-expression** + engine
  per-viewer narration — two of the three are free.
- **Tone is authored; the engine is tone-agnostic:** same mechanics read
  gritty / heroic / comedic / horror per the authored skin (genre-as-costume
  at the tonal layer); one world holds many tones.
- **Two variety levers, separated:** systemic/emergent (reactive-triggers +
  transient state — the fight *plays* differently, engine-owned) vs. authored/
  expressive (creators clothe — it *reads* differently). Independent.
- **THE DISCIPLINE (load-bearing):** *resist building spectacle into the
  engine.* A text MUD wins on the swing **meaning something / being witnessed
  / reading differently to every viewer**, not on spectacle. Engine = hooks +
  honest routing; **all** spectacle = authored. When tempted to build a
  combat-flourish, build the *hook* and let creators author the flourish —
  this keeps the engine small and the content surface infinite.

**Graduated creator experience:** free (complete + emergent-witness) → light
(traits + brain + a few signature lines = personality) → rich (custom brain /
set-piece / narration templates = the named-villain carve). **Cycle-1** ships
the baseline (Phase 5 routing + witness reactions); rich authoring is
*continuous creator activity*, not a build phase.

## Thesis 17 — Combat narration & the assessment interface (the terminal experience)

**Combat prose is a new *consumer* of the messaging stack, not its own
system.** A combat message is a **Scene** (`MessageApi.scene`), fanned
per-viewer + perception-gated, exactly like speech/emotes: `RecognitionApi.
describe` names subjects per-viewer (name vs. description); perception-gating
decides which variables populate for whom (the "opening" flag, the trauma
severity — server-authoritative, no hidden data reaches the client); **ProseApi
Liquid** templates carry the content (the `social.presenceFormat` precedent);
**MML** carries styling/register; **`noteReactableAct`** (the Vocal/Soul seam)
makes each dramatic beat reactable for free. Naming/pronoun conjugation reuses
the emote grammar; content reuses ProseApi. The same moment reads differently
to every viewer (recognition + perception + side + competence).

**Loadout affects messaging via condition-keyed authored fragments** (an
algorithmic frame + bespoke decoration — the answer to "generated vs.
authored": *both, layered*). The engine always generates a complete honest
frame; content devs attach **flavor fragments keyed to the mechanical
condition** they describe. A **material** carries a table indexed by
`{channel × outcome}` (`mail·edge·deflected` → "the rings catch the blade and
shrug it away"; `mail·point·punctures` → "the point threads the gap");
**species** carry body-flavor (troll hide skids, construct sparks); **gear**
carries delivery-flavor (rapier darts / cleaver hews); **biome** carries
ambient flavor; **characters** carry signature-move Liquid. **The same
`channel × material × construction` that computes the outcome selects the
fragment**, so flavor is always mechanically-true and composes correctly.
Layered by generality (engine default → material/channel [**base-library
content pack** — author-once, flavors ALL combat] → species [content pack] →
gear [type/instance] → character signature); each decorates the one below;
nothing required. **Prose = legible physics** (the log teaches *why* your edge
bounced off mail → next time bring a point) — the Andy-Weir "derive from
principles" thread in the combat log. **Only new code = the narration
adapter** (resolve exchange → gather participants' condition-keyed fragments →
weave into the frame via Liquid → fan per-viewer); everything it pulls is
authored data on objects, everything it renders through is the existing stack.

**The assessment interface** (the at-a-glance snapshot — a *query*, distinct
from the event-feed spam), competence-layered:
- **`look <target>`** — the glance, layered by YOUR competence: general
  perception → visible condition band + posture + wielded/worn gear +
  **obvious** carried items (concealed needs `search`/`frisk`); medical
  competence → the wound read / is-he-dying; combat competence → the tactical
  layer (poise band, "guard cracking", openings). One verb; the fog lifts with
  skill (layman: "bloodied & still swinging"; veteran: "guard about to go —
  there's your opening").
- **`assess <target>`** — the deliberate DEEP read: a **costed engaged act**
  (spends a beat, vulnerable — a tactical choice), competence-graded (mints an
  ActSignature).
- **`status`** (own) — **full fidelity** (you know your own body: condition/
  poise bands, flags, endurance, wounds). Own-state precise; **enemy state
  banded/hedged/server-authoritative** (no raw numbers on others — you *earn*
  the read; the honest fog).
- **No net-new combat verb** — combat *contextualizes* look/assess (the
  tactical layer appears because you're a combat-competent viewer in a fight);
  a `size up` bar-alias via `InstanceContributor` is the same machinery. The
  multi-party room/graph glance (`sitrep`) defers with multi-party.

**[Verified against `origin/master` — three corrections to the mechanism above]** (1) Per-viewer *content* is not one Scene: a Scene fans by audience *bucket* (all peers get the same body), so only per-viewer *naming* is automatic (late-bound `Mml` refs → `RecognitionApi`). Per-viewer content (hide the severity band from some witnesses) needs the adapter to **loop over witnesses in perception tiers and emit N Scenes** (the `social.presenceFormat` relay pattern). (2) `noteReactableAct` is **not** automatic on `Scene.send` — combat calls it itself at the producer site. (3) Flavor can't live as fields on `Material` (closed `persistentFields`) — it lives in a **flavor lookup keyed by `{aspect, key, channel, outcome}`** (content-pack data) that `CombatNarration` consults; `Material` untouched, and one lookup serves material/species/gear/biome. See `docs/plans/combat-core-plan.md` §1.5.

## Interrogated → spun out into sibling slates

- **The arrangement phase** — *interrogated.* Resolved: it is **not a
  phase** but the *inherited world-state* combat ignites into (diegetic
  prep, subject to consent/blame + parcel gating; the central balance is
  **arrangement vs. initiative**). Two substrates spun out (deferred
  siblings, not combat scope): **deployables** (traps/barricades — a
  deployed reagent + trigger + concealment; traps read locomotion-mode +
  momentum) and **wayfaring** (travel-as-durative-activity: pathfind +
  journey-as-activity + a speed rate + edge-distance; the deferred combat
  **chase** = a contested journey on this substrate).
- **Aftermath & cycling** — *interrogated* (Thesis 11 above); the death/
  selfhood consequence spun out to
  [mortal-vessel-slate.md](./mortal-vessel-slate.md).

- **Concealment & detection** — *interrogated* → spun out to
  [concealment-detection-slate.md](./concealment-detection-slate.md): one
  concealment gate on every perceivable; **stealth** (actor face — surprise =
  no-guard, three depths, assassination = compressed two-stage death) +
  **searching** (environment face — passive/active, deterministic-given-
  effort, hints-direct-attention, deduce-from-clues, the knowledge economy);
  the RPG secret door as the simplest case.

## Open threads (still not interrogated)

- **The combat gym** — as a buildable tuning/CI tool (headless
  matchup-sweep over the deterministic coroutine).
- **The ecology** — renewable fightable content as a managed commons (its
  own slate, sibling of farming/ranching).
- **Weapon-playstyle depth** — reach / guard / balance / shield / unarmed /
  grapple / ranged (deferred in materials-response).
- **Non-humanoid / monster combat** — bodyplan × combat as a *system*
  (swarms, oozes, constructs), not an enumerated bestiary.
- **Expressive authoring** — how signature moves / trait-driven personality /
  per-viewer narration actually get authored (the creator experience).

---

## Corpus & build order (the combat design index)

**Artifacts on disk:**
- `docs/requirements/combat-core-requirements.md` — the cycle-1 contract (1v1)
- `docs/plans/combat-core-plan.md` — the cycle-1 7-phase implementation plan
- `combat-slate.md` — the **mechanism** (session / poise / tempo / hook
  catalog / resolution & exits / 16 settled decisions)
- `combat-experience-slate.md` — **this**, the **experience** (16 theses)
- `mortal-vessel-slate.md` — selfhood / death / recovery / moderation
  (downstream of combat)
- `concealment-detection-slate.md` — stealth + searching + secrets (sibling)
- **named but unwritten** deferred siblings: **deployables** (traps/
  barricades), **wayfaring** (travel-as-activity + the chase), **ecology**
  (renewable fightable content)

**Cycle-1 (in scope — the 1v1 vertical slice):** the session (DialogueConversation
twin) · poise + one exchange through `inflict` · emergent tempo · gambits-as-
affordances (minimal) + reactive dispatch · the expressive baseline + a
brain-driven NPC · severity three-case + blame ledger + two-stage death ·
advancement disciplines + the summoned pane + the cull & consented-duel demos.

**Deferred → owning thesis/slate:** multi-party / threat-graph / focus-fire /
party / Master-Apprentice → combat-slate + party-slate + combat-tactics-slate ·
the chase → wayfaring · weapon-playstyle + hand-slots → Thesis 14 · group
morale (rout/rally/berserk) → Thesis 13 · de-escalation → Thesis 12 · stealth/
searching → concealment-detection · non-humanoid bestiary → Thesis 15 ·
aftermath cycling + coroner economy → Thesis 11 + ecology · death/recovery/
moderation → mortal-vessel · the combat gym → Thesis 9 · rich expressive
authoring → Thesis 16 · numbers/tuning → always deferred (the gym finds them).

**Rough build order after cycle-1:** threat-graph / multi-party (unlocks
party, focus-fire, Master-Apprentice) → weapon-playstyle + hand-slots →
full morale + de-escalation → stealth / concealment → wayfaring / the chase →
non-humanoid bestiary → death / recovery + moderation. The combat gym rides
alongside as the tuning tool throughout.

## Cross-references

- [combat-slate.md](./combat-slate.md) — the mechanism half (session,
  poise, tempo, hooks, resolution & exits). This slate is its felt-experience
  companion.
- [materials-response-slate.md](./materials-response-slate.md) /
  [../../subsystems/materials-response.md](../../subsystems/materials-response.md)
  — the deterministic consequence engine (built).
- [../../subsystems/trait.md](../../subsystems/trait.md) — the disposition
  layer; the deferred stress/composure axis Thesis 5 completes.
- [../../subsystems/belief.md](../../subsystems/belief.md),
  [../../subsystems/perception.md](../../subsystems/perception.md) — the
  poker/fog engine.
- [../../subsystems/light.md](../../subsystems/light.md),
  [../../subsystems/thermal.md](../../subsystems/thermal.md),
  [../../subsystems/bulk.md](../../subsystems/bulk.md),
  [../../subsystems/respiration.md](../../subsystems/respiration.md),
  [../../subsystems/encumbrance.md](../../subsystems/encumbrance.md) — the
  reagent shelf.
- [../../subsystems/corpo.md](../../subsystems/corpo.md),
  [../../subsystems/crafting.md](../../subsystems/crafting.md) — loadout
  provenance (marks / maker's-marks) blending across genres.
- [capability-magic-slate.md](./capability-magic-slate.md) — the magic
  reagent class over the same grammar.
- [mortal-vessel-slate.md](./mortal-vessel-slate.md) — the selfhood
  architecture (participant/vessel/shade), death & recovery, rebirth, and
  moderation-as-diegetic — the death/aftermath consequence of this slate.
- `docs/requirements/combat-core-requirements.md` — the cycle-1 contract
  (the no-slots determinism stance lands there as a surface decision).
