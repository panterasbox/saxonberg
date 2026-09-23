# Combat — the experience layer (working slate)

> **Status: PARTIAL** — Theses 2 (partial), 3, 4, 6 (via 14), 9, 10, 12
> (closed → [intervention-slate.md](./intervention-slate.md)), 13
> (individual-morale half), 14, and 17 shipped →
> [combat.md](../../subsystems/combat.md)
> **Left:** T1 doctrine (kept for the deferred aftermath work it still
> frames) · T5 composure/luck (`traits-stress`; `g(composure)` is inert)
> · T7's composition rules + T8 loadout-as-chemistry (no combos built) ·
> T11 aftermath (minus the body pipeline, covered by
> [mortality.md](../../subsystems/mortality.md)) · T13's group-morale
> (rout/rally/berserk/waver) · T15 the non-humanoid bestiary · T16
> expressive authoring (the hook grammar exists; nothing speaks it)
> **Size:** a build

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

Shipped and documented: the beat-intensity signal (silent/murmur/roar)
volume-gating the crowd, the escalating narration arc, two-stage death as
the moral-climax "turn", and directed autocombat as "planning in real
time" — see
[combat.md § The dramatic arc](../../subsystems/combat.md#the-experience-pass--poker-not-slots-the-feint-the-fog-the-gym),
§ Two-stage death, § Narration, and § "The enemy — a combat brain,
invoked directly". "The close" (yield/flight/guards pour in) is real for
yield and flight; no `guards` brain exists yet (tracked on
combat-slate.md's `Left`).

---

## Thesis 3 — Randomness: poker, not slots (epistemic, not aleatory)

## Thesis 4 — Critical hits: earned, never rolled

Both shipped and documented in full: zero aleatory randomness (no
damage rolls, no to-hit dice, no crit dice — severity is the
deterministic materials-response function), the epistemic fog fed by
competence (`CombatFog`), and the crit re-founded as the earned opening
+ called shot. See
[combat.md § The experience pass](../../subsystems/combat.md#the-experience-pass--poker-not-slots-the-feint-the-fog-the-gym)
("Zero new aleatory randomness", "The fog is the only dice") and
§ The exchange (site/called-shot). The one named-but-unbuilt residual is
rare stochastic **environmental chaos** (a beam falls, a crowd surges) —
no such mechanic exists; folds into T7/T8's still-open composition work
below.

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

Realized by the weapon-playstyle build (T14, below): weapon × species ×
skill compose into a profile vector with no "attack rating" — `WeaponProfile`
(balance/reach/guard/handedness/delivery from form × material × mass ×
length), the species-derived natural profile, and competence as the
Sharpness exchange rate. See
[combat.md § Weapon playstyle & the hand-slot economy](../../subsystems/combat.md#weapon-playstyle--the-hand-slot-economy).
The "no global who's-stronger, only matchup × terrain" payoff is the gym's
own no-loadout-strictly-dominates assertion.

---

## Thesis 7 — The chemistry set already exists (as the world's physics)

The surprising finding: **the reagent shelf is almost entirely built.**
Combat's richness is combat *reading* substrates that already ship as
drivers; the work is **coupling, not new physics.**

The reagent-shelf survey (materials-response, perception/belief, light,
thermal, bulk, respiration, encumbrance, geometry, metabolism, posture,
biome) each cited its own already-shipped subsystem and is cut here —
those docs (materials-response.md, belief.md, light.md, thermal.md,
bulk.md, respiration.md, encumbrance.md, spatial.md, metabolism.md,
posture.md, biome.md) are the source of truth for what each hands
combat, not this slate. What never shipped is the *coupling* — the
combos below.

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

Shipped: the combat gym (`scripts/combat-gym.ts`), running the
deterministic single-thread session headless at scale to find the
competence→exchange-rate numbers before players do. See
[combat.md § The combat gym](../../subsystems/combat.md#the-experience-pass--poker-not-slots-the-feint-the-fog-the-gym).
The four sim-native balancing levers (physical cost, consumability,
symmetry, banded tolerance) are general doctrine already documented
project-wide (CLAUDE.md's derive-don't-track / bands-not-numbers rules)
and not combat-specific decisions to graduate. The "honest limit" —
balance empirically, contain the rest with the consequence web — is
argued concretely in this slate's own **Thesis 11** aftermath section
and in [consequence-slate.md](../tails/consequence-slate.md).

## Thesis 10 — NPCs ≈ PCs (the same combat model)

Shipped and documented: the one clean divergence is who is steering (a
brain for the NPC, a player for the PC) over the identical model — see
[combat.md § "The enemy — a combat brain, invoked directly"](../../subsystems/combat.md#the-enemy--a-combat-brain-invoked-directly).

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

**Cut — the body pipeline.** The alive → defeat → unconscious → coup/
vitals-death → corpse → reset-sweep pipeline this subsection proposed is
shipped and documented in
[mortality.md](../../subsystems/mortality.md) (the dying arc, the corpse
as a forensic Creature, the shade) and
[residency.md](../../subsystems/residency.md) § "The corpse joins the
veto roster" (the reset sweep) — both outside my doc list, pointer only.

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

## Thesis 12 — De-escalation: real roleplay against modeled stakes (NOT a social minigame) — CLOSED

**Superseded — by the code, and by this thesis's own later finding.**
The proposed design (a mechanized "renegotiate the terms down to
no-fight" verb) was tried exactly as designed — `fight parley` — and
**cut in its own MR review** (MR!254, 2026-09-10): the engine cannot
read what a player actually says, so the verb was a persuasion check
with the check hidden. What replaced it — third parties breaking up a
fight via `Morale`'s onlooker count — is documented in
[combat.md § "Why there is no verb for talking a fight down"](../../subsystems/combat.md#-why-there-is-no-verb-for-talking-a-fight-down)
and § Onlookers. The open, buildable half (a third party who intervenes
and eats the cost) has its own slate:
[intervention-slate.md](./intervention-slate.md).

**Still open — the will-asymmetry as reusable doctrine.** One insight
outlives the closed design: physical and social conflict resolve by
*different means* (a mechanical contest vs. real interaction against
modeled stakes, one party human) — NPC de-escalation can be *modeled*
(brain + traits + regard), PC de-escalation can only be *incentivized*
(present a case, let the human decide). No diplomacy Discipline exists
yet to carry this (confirmed — nothing in the tree measures language),
so any future negotiation/persuasion/intimidation design should reuse
this pattern rather than a shared minigame engine. See also this
slate's own hand-off note below.

## Thesis 13 — Morale & surrender (the modeled will; what makes non-lethal the default)

**Shipped and documented — the individual half.** Morale as a derived
(never stored) assessment, the convergence-point inputs (poise, threat
graph, traits, terms, onlookers), yield-surrender as a bidirectional
social act, surrender+coup+blame, and "morale is the mechanism that
makes the default resolution non-lethal" all shipped exactly as
designed — see combat.md's "Morale — whether a fighter still wants to
be in this fight" section in full, and its "A beast does not take a
yield" subsection for the sentience gate.

**Still open — group morale (rout & rally).** Multi-party contagion (a
break pressuring allies, leader-down shock, ally-fleeing contagion), a
side routing, and the counter — rally via command discipline or the
`inspired` flag — never shipped: grepped `lib/combat/` and the
`combatant` brain for `rally`/`rout`/`waver`/`berserk`, zero hits beyond
substring collisions with "routing". This is the command/leadership
lane's home and stays open.

## Thesis 14 — Weapon playstyle & the hand-slot economy (derivation, not stat blocks) ✅ SHIPPED

**Realized** by the weapon-playstyle build (MR !140) — `WeaponProfile` +
the reach tier + shield-as-armor + the switch/sidearm/dual-wield hand-slot
economy + weapon-shaped gambits (`bash`/`sweep`/`entangle`) + the `whip`/
`flail` guardless forms + the gym weapon matrix — matching this thesis's
design (reach/balance/guard/shield/unarmed axes, the hand-slot allocation,
switching, dual-wield, the free-hand chemistry-set access) point for
point. See
[combat.md § Weapon playstyle & the hand-slot economy](../../subsystems/combat.md#weapon-playstyle--the-hand-slot-economy)
for the shipped shape. Deferred from Thesis 14 at the time this slate was
written: ranged/thrown (the sixth archetype) has since shipped its own
subsystem, [ranged.md](../../subsystems/ranged.md); the deep grapple/
clinch control game and spatial formation/geometry remain unbuilt.

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

- **The default is complete, not placeholder** — shipped and documented
  in [combat.md § Narration](../../subsystems/combat.md#narration--the-fight-as-an-arc).
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

Shipped and documented in full, down to this thesis's own verified
corrections: the Scene-based per-viewer narration, the condition-keyed
flavor lookup (`{aspect, key, channel, outcome}`, layered by generality
— material/species/gear/biome/character), and the competence-layered
`look`/`assess`/`status` assessment interface (own state full-fidelity,
enemy state banded/fogged). See
[combat.md § Narration](../../subsystems/combat.md#narration--the-fight-as-an-arc)
and § "The exchange" for the flavor table; the fog/assess split lives in
[combat.md § The experience pass](../../subsystems/combat.md#the-experience-pass--poker-not-slots-the-feint-the-fog-the-gym).
The multi-party room/graph glance (`sitrep`) remains undeferred-to,
i.e. still unbuilt.

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
  [concealment-detection-slate.md](../tails/concealment-detection-slate.md): one
  concealment gate on every perceivable; **stealth** (actor face — surprise =
  no-guard, three depths, assassination = compressed two-stage death) +
  **searching** (environment face — passive/active, deterministic-given-
  effort, hints-direct-attention, deduce-from-clues, the knowledge economy);
  the RPG secret door as the simplest case.

## Open threads (still not interrogated)

- **The ecology** — renewable fightable content as a managed commons (its
  own slate, sibling of farming/ranching).
- **Non-humanoid / monster combat** — bodyplan × combat as a *system*
  (swarms, oozes, constructs), not an enumerated bestiary. See Thesis 15.
- **Expressive authoring** — how signature moves / trait-driven personality /
  per-viewer narration actually get authored (the creator experience). See
  Thesis 16 and the hand-off note below (nothing speaks the hook grammar
  yet). The combat gym and weapon-playstyle depth (both listed here at
  slate-writing time) have since shipped — see Theses 9 and 14.

---

**Cut — "Corpus & build order".** This section's cycle-1 scope list and
deferred-work map described the state before cycles 2+, the experience
pass, weapon-playstyle, combat-hooks and combat-formations shipped; all
of it is now superseded by [combat.md](../../subsystems/combat.md)'s own
`## History` section, which is the current record of what shipped and
when.

## Cross-references

- [combat-slate.md](./combat-slate.md) — the mechanism half (session,
  poise, tempo, hooks, resolution & exits). This slate is its felt-experience
  companion.
- [materials-response-slate.md](../tails/materials-response-slate.md) /
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
- `docs/subsystems/combat.md` — the cycle-1 build-1 subsystem doc
  (the no-slots determinism stance shipped there; requirements retired at sweep).

---

## ⭐ Hand-off from the consequence build (MR!254, 2026-09-10)

Three seams the build opened and did not close. Salvaged here because the
plan doc retires and these would go with it.

- ⚠⚠ **`CombatResolution.disengage` has NO caller.** It was a declared
  union member with none for as long as combat has shipped; `fight
  parley` briefly became its first and then the review cut parley. Its
  right home is obvious and unbuilt: **fleeing.** `disengageImpl` already
  carries the name and the section header reads *"fleeing (disengage)"* —
  but today a flight that empties a session goes `removeParticipant` →
  `dissolve()` and records **no resolution at all**, which also means it
  fires no aftermath. ⚠ Wiring it is a behaviour change (a successful
  flight would start emitting the W6 aftermath read), so it is a wave and
  not a cleanup. ⭐ Note the collision: `intervention-slate` open question
  7 also wants `disengage` for a fight that gets broken up. Two
  claimants; whoever gets there first should say so.
- ⭐⭐ **The hook grammar is spoken by nobody — seventeen un-composed
  `@hook`s.** `Combatant` ×7, `CombatReactive` ×6, `CombatVenue` ×3,
  minus the two the build filled (`onDefeated` / `onDefeatedFoe`).
  [combat-hooks.md](../../subsystems/combat-hooks.md) calls this *"the
  wizard-facing combat extension grammar"*; it is documented, invoked
  each beat, and **implemented by nothing that ships** — not in the
  kernel and not in any of the 43+ packs. `lint:unconsumed-seams` holds
  the number (re-measured at compaction time: 18 total, ceiling 19 —
  down from 21, still mostly combat's), so the next build has it in
  front of it rather than having to notice. T15's non-humanoid bestiary
  is the obvious first consumer.
- **A diplomacy Discipline** — T12's *"face/diplomat career"* wants its
  own field of study. ⚠ Nothing in the tree measures language, which is
  why `fight parley` was cut; a Discipline here has to answer *what does
  the engine honestly count?* before it can answer what it teaches.
