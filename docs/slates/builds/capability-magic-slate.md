# Capability & magic slate (working doc)

> **Status: PARTIAL** — the effect substrate, the casting grid as
> Disciplines, the anatomical faculty over the Reserve axis, provenance +
> suppression, the roster across every damage channel and the Practicum
> shipped → [magic.md](../../subsystems/magic.md); the science →
> [arcane-science.md](../../arcane-science.md); the item tier →
> [magic-items.md](../../subsystems/magic-items.md). Part I — physical
> capability — is unbuilt. *(Compacted 2026-09-19; ledger:
> `docs/plans/slate-compaction/magic.md`.)*
> **Left:** Part I — derived physical capacity (baseline × condition,
> per-part muscle mass as the strength baseline, the attribute readings
> vitals.md still defers) · conditioning as a bounded, bidirectional
> channel · the CHA / INT dissolution (derived presence + learned social
> skill) · the `Transform` primitive's Api (polymorph is its own build) ·
> multi-cell spell composition · wards as a mental-axis mitigator layer (+
> counterspell / ward mitigators keyed to the provenance tag) · a Storm
> spell (needs a gated weather-write Api; the noun and its Discipline
> shipped) · the Spirit / Time frontier nouns · the magical-property layer
> over Materials (resonance) · the inquiry consumer (owned by
> inquiry-slate) · the `MemorizedMixin.competenceRankFor` `return 0` seam
> — fill or delete · the MR!260 interop exercises (a frozen pool's
> consequence chain · shock through a conjured pool · caustic-pool
> re-contact · a second cold expression) · open Qs 6–8 (conditioning vs
> the healing ticks · gear as a bounded capability channel · genetics as
> the baseline source) · the three designs recovered from git below —
> readied instants as the interaction-stack baseline · training the three
> faculty attributes within a species range · the Wiz-War content-mining
> seed
> **Size:** a build

Two halves, deliberately **symmetric**:

- **Capability** — physical ability, derived from the body + learned
  skill + acquired knowledge. The "stat system," reframed to fit the
  derived-not-stored discipline.
- **Magic** — a supernatural-but-lawful physics channel, plus the
  magic-side capability (affinity, mana) that mirrors the physical
  side.

See also:

- [docs/design-philosophy.md](../../design-philosophy.md) — the
  through-lines this slate obeys: derived-not-stored, "model
  honestly" + the **invented-sciences corollary** under Principle 2
  (magic is honest if internally consistent and measurable), Principle
  4 (reality-shaped seeding — which magic *cannot* use, the honest
  break).
- [docs/slates/vitals-slate.md](../tails/vitals-slate.md) — the body
  substrate physical capability derives from; the
  **endurance ⟷ mana** reserve symmetry; CON dissolving into Vitals.
- [docs/subsystems/race.md](../../subsystems/race.md) — `BodyPlan` /
  anatomy / `Species` baselines that physical capacity reads; the
  deferred genetics that eventually source the baseline.
- [docs/subsystems/quantities.md](../../subsystems/quantities.md) — the
  `Quantity<U>` + instrument + `analyze` pattern magic reuses
  wholesale.
- [docs/slates/senses-slate.md](senses-slate.md) — the
  `PerceptionChannel` generalization (which absorbed the sound slate);
  magic joins as another channel.
- [docs/subsystems/race.md § Material substrate](../../subsystems/race.md) —
  Material's orthogonal classification layers + capability-mixin
  pattern that the magical-property layer mirrors.

---

## Principle

1. **Derived, not stored** — the through-line from Vitals. Capability
   falls out of substrate + skill, not character-sheet scalars.
2. **Horizontal mastery, not vertical inflation.** Bodies are bounded;
   depth comes from skill, knowledge, and gear — never 10 → 1000.
3. **Symmetric physical/magic.** The same four axes — capacity, skill,
   knowledge, reserve — run down both sides.
4. **Magic is honest science**, just invented: lawful, measurable,
   predictable, instrument-readable. Per the design-philosophy
   invented-sciences corollary.

---

## Part I — Capability (the stat system, reframed)

### Stats are derived and dynamic, not stored

D&D-style stored stats (STR/DEX/CON/…) are the character-sheet
equivalent of stored HP — gamey abstractions over state we model for
real. The derived treatment:

- **CON dissolves into Vitals.** Resilience, stamina, disease/poison
  resistance *are* blood volume + survivable bands + the endurance
  reserve + condition progression. A CON score beside that is two
  sources of truth — the HP anti-pattern again.
- **Physical capacity is derived** — strength (force) and
  dexterity/coordination (fine motor + agility) fall out of anatomy
  intactness + condition + endurance + a stored baseline. The pattern
  mirrors Vitals exactly: a **stored baseline** (build / species /
  later genetics) **× derived condition factors** = effective current.
  Concretely, the strength baseline *is* **per-part muscle mass** — the
  tissue composition the Vitals substrate build ships on `BodyPart`
  (`/stuff/idea/material/tissue/muscle`). Strength reads as real force
  (`N` / `kg`), instrument-measurable (a **dynamometer** reads grip the
  way a thermometer reads fever), and a *task* selects which parts'
  muscle it draws on — so grip ≠ deadlift, and a fractured limb loses
  *local* force for free off the anatomy trauma model. Dexterity's
  substrate is likewise measurable beneath the skill layer — reaction
  time (`ms`), joint range-of-motion (`degrees`) — which is the
  capacity-vs-skill split made physical: **substrate sets the ceiling,
  skill realizes performance within it.**
- **It's dynamic.** A fracture (via the part→slot/capability
  coupling), fatigue, blood loss, or disease lowers effective
  capability *continuously* — unlike a fixed D&D STR. A familiar
  readout ("Strength: 14, strong") is surfaced for accessibility, but
  it's rendered from substrate, never the truth — the HP-band trick.
- **The only genuinely *stored* capacity attributes are physical
  build-baseline and magic affinity.** Everything else is skill
  (learned), knowledge (learned), or derived state.

### Advancement — three honest channels

Advancement can't be a number inflating; there's no stored number.
It splits into:

1. **Conditioning** — bounded and *bidirectional*. Training raises the
   baseline within biological ceilings (untrained → peak athlete,
   ~2–3×, not 100×); disuse, injury, illness, and aging lower it
   (atrophy, detraining — real exercise physiology, so it's
   pedagogically honest).
2. **Skill** — deep, learned, the **main axis**, and **on-mission**
   (learning is the point of the platform). It's *competence, not
   power*: a skilled actor with average capacity beats a strong
   novice. The **capacity-vs-skill split is the core nuance** D&D's
   single STR number erases.
3. **Knowledge** — know-*what* (diagnoses, identifications, recipes,
   which antidote for which toxin) — feeds the treatment / forensics /
   crafting loops.

**Scaling is horizontal.** The power fantasy comes from breadth and
mastery (more skills, deeper technique, more knowledge) and from gear
(a bounded, complementary channel), not from magnitude. A peak human
stays a peak human; the world stays coherent; and "you learn more
things" suits an educational platform better than "your numbers get
bigger."

### What dissolves (and why)

- **CON →** Vitals.
- **INT →** the *player's* real knowledge + learned skill. An INT stat
  that does the thinking substitutes a die roll for the learning that
  is the whole point; rejected.
- **CHA →** derived presence (appearance / voice / condition — a sick
  or wounded person presents worse) + learned social skill (**bedside
  manner** is on-mission) + a magical-charm counterpart. Raw "force of
  personality" has no substrate and, like INT, doesn't become a stored
  stat.

---

## Part II — Magic as a physics channel

### Magic is invented-but-honest science

*Superseded → [arcane-science.md](../../arcane-science.md): the postulate
has no medium, no field, no propagation (§ The Postulate; § The thaumometer
— the founding null result); the pedagogy and the honest asymmetry are § The
hard rule, § The method, § Why this is better taught in an invented
science.*

### The magic-side capability (symmetric to physical)

*Superseded / shipped: affinity does not exist — species `facultyProfile`
bands + learned competence ([magic.md § The anatomical
faculty](../../subsystems/magic.md); arcane-science.md supersession note
under § The thaumometer). Mana is one `Reserve` instance on the caster
([reserve.md](../../subsystems/reserve.md) § *"Reserve" is the engine word*
carries the authored-pool seam; the plural-pool lean was overridden for the
baseline, and arcane-science.md's one-conserved-quantity budget makes a
second pool a modelling error).*

### Instruments (the seam, symmetric to vitals / sound / light)

*Superseded → [arcane-science.md § Instruments](../../arcane-science.md):
there is no field and no affinity to read — the thaumometer is the honoured
null result and measurement is done with plain physical instruments. The
reserve gauge is `spells` (bands, self only).*

---

## Part III — Elemental magic ↔ the Materials subsystem

The worry: classical elemental magic (fire/water/earth/air) is a
*folk ontology of matter* that contradicts the real chemistry the
Materials subsystem already models. The resolution: **elements are
verbs, not nouns.**

### Two moves

*Move 1 — schools actuate real channels — shipped →
[magic.md](../../subsystems/magic.md) (the opening: a new trigger, never a
new mechanism); [arcane-science.md](../../arcane-science.md) § The hard
rule, § The thirteen nouns. Real matter is never reclassified.*

**2. Materials gain an orthogonal *magical-property layer*** — the
same orthogonal-classification + capability-mixin pattern Material
already uses (tags, composition, chemistry; `RadioactiveMaterial`).
A material gets a magical resonance / per-school affinity (and maybe a
thaumic conductivity, symmetric to electrical conductivity). So magic
**enriches** Materials instead of contradicting it; elemental
interactions become grounded and learnable.

### Worked examples

*Shipped examples → [magic.md § The demonstrator](../../subsystems/magic.md)
(a firebolt chars the dummy and lights the tinder — heat, then real
combustion / phase change); the experiment → [arcane-science.md § What runs
on the shipped build today](../../arcane-science.md). Affinity is gone —
no such quantity exists (arcane-science.md § The thaumometer).*

- **Earth on granite vs. running water** → granite (dense, mineral,
  high earth-resonance) responds strongly; water doesn't. Effect
  scales with real density × magical resonance.

### Taxonomy — held open

*Decided — the locked roster (`lib/magic/Grid.ts`; [arcane-science.md § The
thirteen nouns, and how they were carved](../../arcane-science.md)): the
classical four are four of thirteen folk-named nouns, each actuating one
real subsystem.*

---

## Part IV — The effect substrate + the magic grammar

### 1. The effect substrate — spells as data

*Shipped → [magic.md § The governing invariant](../../subsystems/magic.md),
§ The pieces (the closed `Effect` union — `transform` still absent,
polymorph's own build), § Impulse vs modifier; the trigger-agnostic
envelope → [magic-items.md](../../subsystems/magic-items.md).*

### 2. The resist seam — where an effect meets combat

*Shipped → [magic.md § The resist seam (N-axis)](../../subsystems/magic.md)
+ `lib/magic/Resist.ts`; the two gates → § The cast pipeline; your own
bands via `spells` (self only). Wards — the mental-axis mitigator layer —
remain; see Left.*

### 3. The grammar = the skill tree = advancement Disciplines

*Shipped → `lib/magic/Grid.ts` (5 verbs × 13 nouns; lightning + storm
graduated from the frontier, time + spirit remain);
[magic.md § The cast pipeline](../../subsystems/magic.md) (the band gate
on BOTH axes; the grid is a lens, never an effect-builder);
[advancement.md](../../subsystems/advancement.md) (verbs `synergizes` every
noun; NO `conferrals` — the cast-time band gate superseded band-gated
conferrals; no `requires` edges shipped);
[arcane-science.md § The taxonomy](../../arcane-science.md) (Light split
from Fire, Air narrowed, Arcana reflexive).*

### 3½. Magical provenance — a pervasive tag

*Shipped → [magic.md § Impulse vs modifier; provenance;
suppression](../../subsystems/magic.md): the tag is `{verb, noun, spellId,
specifiedBy, firedBy}` ([magic-items.md § Provenance carries two
ids](../../subsystems/magic-items.md)), the anti-magic field, and the
suppressible line = the impulse/modifier line. The table below stays for
its unbuilt fourth row (counterspell / ward mitigators keyed to the tag):*

**Where it rides / what reads it:**

| The tag rides on… | so this content becomes writable |
|---|---|
| the **cast** (the attempt) | an anti-magic zone vetoes casting (a `requiresNoSuppression`-style validator, the `requiresConscious` pattern) |
| installed **conditions** | dispel, detect, *and* zones that unravel ongoing magic |
| **items** (enchanted) | detect / disenchant / "no magic items past this gate" |
| in-flight **effects** | counterspell, ward `Mitigator`s keyed to the tag |

### 4. Learning magic as a science

*Shipped — the shipped Competence model, unchanged →
[magic.md § The cast pipeline](../../subsystems/magic.md) (both axes
credited as subchecks of one `ActSignature`); the science pedagogy →
[arcane-science.md](../../arcane-science.md) § What runs on the shipped
build today.*

#### Discovery is a consumer of the inquiry substrate

Magic doesn't own "learning by experiment" — that grew, this same session,
into a platform-level substrate for how *sim-native knowledge* is
discovered, verified, trusted, and corrupted, and was **spun out to
[inquiry-slate.md](../builds/inquiry-slate.md).** Magic is its **first and
most vivid consumer**, not its owner (combat, medicine, crafting, farming
are peers). In brief, and see the slate for the full design:

- **Discovery = recovering a hidden law by experiment** — laws are
  emergent from the honest functions, never authored; the loop is
  observe → measure → hypothesize → **predict** → verify. Two keystones:
  the engine exposes *measurements, never the model*; and discovery is
  gated by **prediction of a novel case** (no equation-parsing, no NLP —
  the deduction-slate's *truth-is-shown-not-argued* spine).
- **Banking + publishing** — a confirmed law banks as Competence and
  becomes a teachable/publishable good (shoulders of giants).
- **The wrong-paper mechanic** — self-defending (a false paper fails
  verification), so misinformation is a *social/temporal* exploit gated by
  verification cost; the insidious case is the **evidential-range
  overreach** (right in-range, wrong beyond). All in the slate.
- **The learning-model unification** — magic is in the *sim-native* camp
  (answer key = the sim) alongside combat/craft, sharing one University /
  Competence / Assessment / publishing frame with the didactic (study.com)
  camp. **Decision: loose now, tight-seam reserved** — magic
  self-credentials; the transferable real thing is the *scientific method
  itself*; a null `realWorldAnalog` seam holds the future real-course
  mapping.

### 5. What this pass settled / left open

**Open:** the `Transform` primitive's missing Api (polymorph is its own
build — slot-eviction choreography, per magic-items-slate); multi-cell
spell composition (Create·Fire + Control·Air = a steered firestorm) as a
second combinatorial layer; whether wards are worth a mitigator layer at
all in v1 or Composure-alone suffices for the mental axis; the frontier
nouns' prerequisite builds (a stateful wind/weather sim for Storm, the
electricity channel for Lightning, the presence-hollowing substrate for
Spirit, and whatever safely bounds Time). *(The discovery/inquiry
sub-decisions — `Law` granularity, `analyze`-upgrade, publish economics,
misinformation — now live in inquiry-slate's open questions.)*

---

## Recovered from git — the 2026-07-25 design pass (dropped by merge `0b40d0b66`)

> Written in `b6b348c64` (the Wiz-War commit), dropped whole three days
> later by a master merge that kept the built 07-15 Part IV instead, and
> uncited for seven weeks except by pointers to a "Part IV §5 / §7 / §9"
> that no longer existed. Of the ten dropped sections, seven shipped or
> were superseded (the ledger names each); **these three exist nowhere but
> git**, so the compaction pass restored them verbatim rather than lose
> them. None is built.

### The interaction stack — readied instants are the baseline

**The interaction stack** (counterspell / reflect / dispel — the Wiz-War
probe). Is magic interruptible-via-Focus only, or is there a reaction
stack? *Not decided.*

**Revised stack lean.** 5th ed is *saturated* with counteractions —
Reflection / Blunt / Absorb / Full Shield / Reverse / Anti-Anti /
Empathy, plus out-of-turn Interrupt / Opportunity Fire. The reactive
counter-war is Wiz-War's *soul*, far more than 8th's. So: **readied
instants** (held Shield/Reflect/Absorb/Dispel, Focus-triggered when
targeted — on the reactions + activity substrates) are the **baseline,
not optional**. Full priority-war (Interrupt) stays resisted for
real-time-text pacing.

*(Where it lands today: the `wards as a mental-axis mitigator layer` and
`counterspell / ward mitigators keyed to the provenance tag` items in
`Left` are this design's mitigator half; the readied-instant — a held
reaction that fires when you are targeted — is the half nothing names.)*

### How training moves the three attributes

**How training moves the three attributes** within a species range — open
in the 07-25 pass and still open. The species profile shipped
(`Species.facultyProfile {depth, serenity, composure}`, authored on 16
rows); what moves an individual within its species' range, and whether
that is conditioning (Part I's bounded bidirectional channel) or a
Discipline, is undecided.

### Wiz-War mining pass (2026-07) — inspiration, not import

The real 5th-edition deck (`docs/WizWarALLCardsAndBacksCombined.pdf`,
~150 cards) was read in full. It's a source of **effect ideas, not a
balance model** — worth writing down:

- **Mine, don't port.** Wiz-War is chaos-and-fast because of its *format*
  (symmetric shared deck · random draw · elimination · 20-min filler), not
  its spells. Saxonberg is the opposite on every axis (gated/asymmetric
  access · learned-not-drawn · death = long recovery · persistent). So **we
  don't balance spells; the economy balances them** — access-gating +
  competence-scaled power + real-physics consequence + the Focus reserve +
  non-lethal-default stakes. A spell can be genuinely deadly and still fine.
  Treat the deck as a bestiary (the NetHack-items precedent).

- **Cards that *sing* in our engine** (emergent where the board hand-fakes
  it — the content-mining seed for a future magic build):
  - **Per-viewer belief** — Illusion Wall ("real to believers; a believer
    who breaks it breaks it only for themselves"), Sucker (your treasure was
    a fake), Decoy, Illusionary Attack → belief/shadow, native.
  - **The Warren** — Create/Destroy Wall, Create Door, Pit, Rotate/Relocate/
    Swap Sectors, Alter Reality, Door-to-Door, Permawarp → the elastic
    room-graph. Wiz-War is a Warren with wizards.
  - **Conditions (dormant→fire)** — Slow Death, Walking Dead, Hotfoot, Ward
    (treasure-trap), It (tag), **Disease** (contagion-on-contact — a shape
    we lack).
  - **Thermal/bulk chemistry** — Waterbolt / Wall of Fire / Waterwall /
    Stone-to-Water / Flame On (fire↔water emergent, not authored).
  - **Organ-strip** — Mundane / Lock in Place / No Spell → damage/suppress
    the magical faculty, not a status flag.
  - **Self-transforms** — Vampire / Werewolf / Ghost / Mist / Shrink / Big
    Man, each disabling casting (confirms "the form lacks the organ").
  - **Governance-adjacent oddballs** — Public Funds (all treasure → commons,
    ties parcel/ownership), Democratic Monster (shared-control NPC).

## The one obligation on shipping work

Everything here is deferred, but one negative obligation binds the
*current* Vitals/Materials work so this stays reachable:

- **Keep capability derivable — never add a stored CON-style scalar**
  to Vitals that duplicates the substrate.
- **Don't add fake elements to chemistry.** The magical-property layer
  is additive and lands when magic does; real Materials stay the
  single source of truth for what matter is.

---

## Open questions

1. **Elemental taxonomy** — resolved: the locked 5 verb × 13 noun roster,
   folk-named and physics-carved (`lib/magic/Grid.ts`;
   [arcane-science.md § The taxonomy](../../arcane-science.md)). *(The
   earlier "engine-domain / Evocation" annotation referred to a Part IV
   draft a 2026-07-28 merge dropped — see the compaction ledger.)*
2. **Affinity shape** — superseded: there is no affinity. Species
   `facultyProfile` bands (depth · serenity · composure) + learned
   competence ([magic.md § The anatomical faculty](../../subsystems/magic.md);
   [arcane-science.md](../../arcane-science.md) § The thaumometer,
   supersession note).
3. **Mana recovery** — resolved: coupled. Recovery is a consumer of the
   metabolism coupled-recovery keystone, spending satiation + hydration at
   the serenity-banded rate ([magic.md § The anatomical
   faculty](../../subsystems/magic.md); [magic-items.md § Mana recovery
   spends satiation and hydration](../../subsystems/magic-items.md)).
4. **One channel or many** — resolved: neither. Magic is a trigger over
   the shipped channels with no field of its own
   ([arcane-science.md](../../arcane-science.md) § The Postulate, § The
   thaumometer — the founding null result).
5. **Skill substrate sharing** — resolved: one Competence model; every
   cast credits `magic-<verb>` + `magic-<noun>` through the same Transcript
   ([magic.md § The cast pipeline](../../subsystems/magic.md),
   [advancement.md](../../subsystems/advancement.md)).
6. **Conditioning vs. vitals recovery** — does training share machinery
   with the body's healing-progression ticks? Likely yes (both are
   slow bounded curves on the body).
7. **Gear/focus** — equipment as a bounded capability channel
   (a focus boosts effective affinity; a tool boosts effective skill).
8. **Genetics as baseline source** — ties to race.md's deferred
   genetics; the physical build-baseline and innate affinity both
   eventually source there.
9. **Reserve topology** — resolved: one `mana` `Reserve` on the caster
   ([magic.md § The anatomical faculty](../../subsystems/magic.md);
   [reserve.md](../../subsystems/reserve.md) § *"Reserve" is the engine
   word* carries the authored-pool seam). [arcane-science.md § The hard
   rule](../../arcane-science.md) caps the invented budget at ONE conserved
   quantity, so a second magical pool is a modelling error there.

---

## What this slate does NOT cover

- **The Vitals substrate itself** — [vitals-slate.md](../tails/vitals-slate.md).
  This slate consumes it (capability derives from the body); it doesn't
  redefine it.
- **Combat** — combat-slate territory. Capability *feeds* combat
  (effective strength/skill resolve actions); combat mechanics are
  elsewhere.
- **The actual skill trees, spell lists, and school rosters** —
  content, authored once the substrate exists.
- **Character-creation UI** — where baselines/affinities are rolled or
  chosen.
- **Alternative magic paradigms** beyond the lawful-channel model
  (wild/chaotic magic, pact magic) — deferred; if ever wanted, each is
  its own design.

---

## Once shaped into formal requirements

When RPG work begins, this boils down to:

- The capability model: derived physical capacity (baseline × condition),
  the capacity-vs-skill split, the three advancement channels, the
  horizontal-scaling discipline.
- The elemental architecture: schools-actuate-real-channels + the
  Materials magical-property layer; the chosen taxonomy.
- Tests gating: effective capability tracks condition; conditioning is
  bounded and bidirectional; a magical law is measurable and consistent
  under `analyze`; an elemental spell actuates the correct real channel
  (fire heats/combusts per real chemistry); resonance scales effect.

---

## ⭐ Hand-off from the consequence build (MR!254, 2026-09-10)

⚠ **`MemorizedMixin.competenceRankFor` is a `return 0` terminal that no
host overrides** — found by the build's `lint:unconsumed-seams` census,
which counts exactly this shape (an extension hook nothing composes).
Its docstring says *"composed hosts supply the real read"*; no composed
host does, so every memorized working reports competence rank **0**
(`lib/magic/Memorized.ts:132`, read at :168).

⭐ It is a seam waiting for a consumer rather than a bug — but a
`return 0` that has waited long enough to be found by a census is worth
a decision: fill it, or delete it and let the caller read competence
directly. A hook one wave ahead of its consumer is good sequencing; one
several builds ahead is a claim nobody is honouring.


---

## ⭐ Hand-off from the magic-expression pass (MR!260, 2026-09-18)

The injury MR's magic-expression scope closed the four channels magic
never reached (blunt/point/edge via `create·earth`/`create·air`;
corrosion via `create·water` + the substance-contact seam). What it
proved directly (tests + drive) it kept; what it named as future
synergies it leaves here, because they are the *guild* groundwork and
each wants its own exercise:

- ⭐⭐ **Freezing a pool of water, end to end.** frost's object arm already
  does `depositHeat(−J)` + `reconcilePhase()`, and `reconcileBulkPhase`
  already freezes a `Bulkable & Thermal` floor pool
  (`Thermal.ts:756-802`). What is NOT proven is the *consequence chain*: a
  frozen pool should become walkable, block flow (`watershed`), and stop
  conducting (`ElectricityApi`). The interop test to write: *frost a
  flooded cell, assert the shock path opens/closes.* Prerequisite check —
  does the target Floor carry `ThermalMixin`? (Not all do.)
- ⭐⭐ **Chaining shock through a conjured pool.** spark imposes a potential
  and lets `conduct()` walk the conduction graph; conjure-water pools a
  real conductor. The synergy — spark into a conjured/rain pool bridges
  everyone standing in it — should fall out of the SAME walk a live wire
  uses. The test: *conjure a pool, spark it, assert the conduction set.*
- **Standing in a caustic pool (re-contact).** `Material.corrodeOnContact`
  fires on a contact EVENT (a splash, a pour). A body *standing in* a
  pooled caustic wants a `Floor.onEntered` re-contact hook, mirroring
  `FloodedCell`'s shock-on-entry. Deferred — the two active-delivery
  events (throw, conjure) shipped; the ambient pool did not.
- **A second cold expression** (a frost field / chilling touch). frost
  covers `cold` and drives the freezing-pool synergy, so a second cold
  spell was dropped from the pass as roster polish, not seam-proving.

⭐ These are *"the more content exercises the channels, the more we prove
they interoperate"* — the standing rule holds: every deliverer routes
through the ONE door (`ConditionApi.inflict`) and the ONE fold, so interop
is by construction; the risk is a new spell inventing a side path. Guilds
(a fire guild, an earth guild, an acid/alchemy guild) teach and gate a
*family* of these workings — which is why the roster breadth is the raw
material for the next social/economic layer, not polish.
