# Capability & magic slate (working doc)

> **Status: deferred — RPG.** This is the RPG capability layer:
> how a being's abilities are modeled, how they advance, and how
> magic works. RPG is on hold; physics and biology ship first.
> The design is captured because decisions in the *shipping*
> Vitals and Materials substrate must not preclude it — there is
> exactly one negative obligation (below), and the rest is parked
> design space. When RPG work begins, this slate is the starting
> point.
>
> **Update (2026-06):** the shipping Vitals *substrate* build now
> generalizes reserves into one `Reserve` axis (`lib/reserve/`) — so
> the magic-side reserve (mana) already has its mechanism built ahead
> of RPG. What's parked is the magic *content* riding it, not the
> reserve substrate. See Part II's reserve note + the obligation.
>
> **Update (2026-07):** a focused design pass pinned the *baseline
> shipping* model — a single **Focus** reserve (mental, coupled to the
> body via a magical metabolism), capacity and recovery as **separate**
> knobs, a discipline taxonomy carved by **engine-domain**, and an
> orders-vs-guilds access split. Captured in **Part IV**, which resolves
> Open Qs 1 / 3 / 9 and, on two points (single pool; mana coupled to the
> body), **supersedes earlier leans** in Parts II and the Open Questions.

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
- [docs/slates/vitals-slate.md](../builds/vitals-slate.md) — the body
  substrate physical capability derives from; the
  **endurance ⟷ mana** reserve symmetry; CON dissolving into Vitals.
- [docs/subsystems/race.md](../../subsystems/race.md) — `BodyPlan` /
  anatomy / `Species` baselines that physical capacity reads; the
  deferred genetics that eventually source the baseline.
- [docs/subsystems/quantities.md](../../subsystems/quantities.md) — the
  `Quantity<U>` + instrument + `analyze` pattern magic reuses
  wholesale.
- [docs/slates/senses-slate.md](../tails/senses-slate.md) — the
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
  (`/lib/material/tissue/muscle`). Strength reads as real force
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

Magic behaves by laws, is measurable, and is predictable — it is
*supernatural only in that its laws are authored*, not drawn from a
textbook. So it gets the full channel treatment: real (invented)
units, conservation, propagation through conduits, attenuation,
instruments that read it, an `analyze` that reveals its math. It joins
the `PhysicsChannel` generalization the sound slate anticipates — a
thaumic field is just another channel alongside light, sound, heat.

The pedagogy (per the design-philosophy corollary) is the **scientific
method itself** — hypothesize, measure, predict, verify — taught in a
clean, learnable sandbox, plus transferable structure (conservation,
fields, equilibrium, falloff). The discipline: rigorous internal
consistency; magic never becomes the fudge layer.

The honest asymmetry with the physical side: physical capability
*derives from real substrate* (and can seed from real datasets,
Principle 4); magic has **no real-world dataset** — its substrate and
laws are authored. That's fine and appropriate: magic is overtly
fictional, so an authored-but-lawful substrate is legitimate where an
authored INT stat was not.

### The magic-side capability (symmetric to physical)

| Axis | Physical | Magic |
|---|---|---|
| **Capacity (baseline)** | body build + condition (derived) | **affinity** (measurable coupling to the field) |
| **Skill (applied)** | learned technique | learned spellcraft |
| **Knowledge** | techniques, materials | spells, lore |
| **Reserve (fatigue)** | **endurance** — a `Reserve` instance | **mana** — magic-side `Reserve` instance(s) |
| **Advancement** | bounded conditioning + deep skill | (mostly-fixed) affinity + deep skill |

- **Affinity** is a *measurable* property — coupling strength to the
  thaumic field — not a die roll. Likely **per-school/element** (so
  several small affinities, not one scalar), an innate baseline,
  possibly marginally trainable (symmetric to conditioning). Read by
  an instrument the way vitals are read by a thermometer.
- **Mana** is the magical reserve, depleting and recovering on a
  lawful curve — **endurance's mirror**. Both ride **one generalized
  `Reserve` substrate** (`lib/reserve/`, shipped by the Vitals build): a
  depletable-replenishing capacity axis whose instances differ only in
  what drains them, what replenishes them, and their theme.
  Endurance/satiation/hydration are the *biological* instances; mana is
  *magic-side*. The split is instance-level, not substrate-level — mana
  isn't biology, but it isn't a second mechanism either.
- **Magic reserves are plural and authored, not one universal pool.**
  Rather than a single MP scalar, a tradition/guild/school *defines its
  own reserve* — a capacitor guild's "charge" (recharged at a source), a
  necromancer's "essence" (replenished by death), a cleric's "favor"
  (granted, not earned). Each is content on the shared axis;
  **"mana" is a content word, never an engine primitive** (the engine
  has reserves). This is the affliction-vs-trauma authored-content move
  applied to reserves — the substrate ships the axis + the authored
  seam; the thematic pools are content.

### Instruments (the seam, symmetric to vitals / sound / light)

| Instrument | Reveals |
|---|---|
| Thaumometer | ambient thaumic field at a location |
| Affinity-meter | a being's coupling (per school) |
| Mana gauge | current reserve vs. capacity |
| Spell-`analyze` | the "equations" of a cast — cost, output, falloff |

---

## Part III — Elemental magic ↔ the Materials subsystem

The worry: classical elemental magic (fire/water/earth/air) is a
*folk ontology of matter* that contradicts the real chemistry the
Materials subsystem already models. The resolution: **elements are
verbs, not nouns.**

### Two moves

**1. Elemental schools actuate *real* physical channels.** The
supernatural part is the actuator; the consequences are real physics.

| School | Actuates (real channel) |
|---|---|
| Fire | thermal energy / combustion |
| Water | fluids, phase, pressure |
| Earth | solid matter (the Materials subsystem) |
| Air | gases, pressure (the biome atmosphere substrate) |
| Lightning | electricity (a real channel to add) |

A Fire spell *injects real thermal energy*; what happens next obeys
real chemistry. Real matter is never reclassified — iron stays Fe.

**2. Materials gain an orthogonal *magical-property layer*** — the
same orthogonal-classification + capability-mixin pattern Material
already uses (tags, composition, chemistry; `RadioactiveMaterial`).
A material gets a magical resonance / per-school affinity (and maybe a
thaumic conductivity, symmetric to electrical conductivity). So magic
**enriches** Materials instead of contradicting it; elemental
interactions become grounded and learnable.

### Worked examples

- **Fire on an oak door** → thermal injection → oak (real flammable
  material) heats, ignites, combusts. Teaches flammability/combustion.
- **Fire on iron** → heats (real), does *not* combust, eventually
  melts at iron's real melting point. Teaches phase change.
- **Earth on granite vs. running water** → granite (dense, mineral,
  high earth-resonance) responds strongly; water doesn't. Effect
  scales with real density × magical resonance.
- **Measuring affinity** → an affinity-meter reads a mage's coupling
  the way a thermometer reads a patient's temperature: the magical
  "vitals check."
- **Deriving a law by experiment** → a student measures a spell's
  falloff at increasing distance, hypothesizes inverse-square,
  verifies with the thaumometer. The method *is* the lesson.

### Taxonomy — held open

Classical four, **wu xing** (wood/fire/earth/metal/water, whose
*generating/overcoming cycles* are exactly the complementary,
relational structure to aim for and map cleanly onto resonance), or a
fully invented set — all are content choices. **The architecture is
taxonomy-agnostic** (schools-actuate-channels + magical-layer), so the
taxonomy is deliberately **left open** until the build picks one.

---

## Part IV — 2026-07 design pass (the shipping baseline model)

A focused pass fixed the concrete baseline the shipping arts will use. It
**resolves** several Open Questions below and, on two points, **overrides
earlier leans** (single pool; mana coupled to the body). The earlier Parts
remain the fuller design space; this Part is what the build starts from.

### 1. What magic *is*, mechanically

**Effect without apparatus.** Casting is a *new trigger* for effects the
engine already simulates — never a parallel spell-damage system. A fire
spell hands off to thermal + materials-response; a force spell delivers the
same blunt mechanism as a club plus knockback (movement/spatial); a mend
spell runs the same condition-relief as a bandage. This is Part III's
"schools actuate real channels," generalized past the elemental four.
Magic-vs-technology is a **skin** (function over form) — the aether is
magic-as-technology; "pyromancy" and a "heat-implant" are mechanically
identical, only costumed differently.

### 2. The reserve: one pool, and it is *Focus*

*(Overrides the plural-reserve lean for the baseline; Open Q 9.)* The
shipping baseline is a **single reserve per caster**, representing
**Focus** — sustained mental concentration — **not** bodily energy (that is
endurance, which already exists; a second body-energy reserve is
redundant). One instance of the shipped `Reserve` axis. Focus represents
capacity-to-exert-*now*, nothing cosmic. **No special magic fuel** at
baseline. Part II's per-tradition authored-reserve seam (charge / essence /
favor) is **retained for exotic traditions** — but the default arcane
caster runs on one Focus pool.

### 3. Two layers: Focus over a magical metabolism

*(Resolves Open Q 3 toward coupling.)* Focus is the fast, spendable
**combat-layer** reserve (spend per cast, refills in minutes of calm).
Beneath it a **magical metabolism** rebuilds Focus on a slower **bodily**
timescale — mirroring endurance riding on metabolism (coupled recovery).
It runs on the **ordinary body** — calm, sleep, food ("not eating drains
you mentally" — true), no special fuel. The magical faculty is
**anatomical** (lives in the `BodyPlan`): **trainable** (advancement),
**fatigable** (metabolism coupled-recovery), **injurable** (harm — a called
shot on a caster), and **species-gated**. Two timescales: *Focus handles
the fight; the magical metabolism handles the week.*

### 4. Capacity and recovery are separate knobs — the mental statline

The physical → mental interrogation: our physical capacities are derived
(Part I); their mental correlaries are the **mental half of the
species/`BodyPlan` profile** — a baseline per species, trained within a
species range, modulated by current state, **shown as bands, never
numbers**. Three **locked, load-bearing** attributes:

| Mental attribute | Physical correlary | Governs | Knob |
|---|---|---|---|
| **Depth** | stamina *ceiling* (fitness) | Focus pool **size** | **capacity** |
| **Serenity** | metabolic recovery (rest/food) | Focus **refill rate** (calm + rest + nutrition) | **recovery** |
| **Composure** | toughness / shock-resistance | resisting **disruption** (pain, fear, interrupt) | defense |

Capacity (Depth) and recovery (Serenity) have **different inputs**, so the
two knobs never collapse into one. **Will** (potency; physical: strength)
and **Acuity** (cast speed/precision; physical: agility) are *folded into
competence*, not stored — a better mage of any species hits harder and
faster.

*Tension w/ Part II:* this reframes Part II's loose "reserve/capacity"
axes and does **not** use a distinct per-school **affinity**. Whether
per-school affinity survives alongside the three general attributes +
per-art competence is left open — *lean: fold per-school talent into
competence + order-access, drop a separate affinity stat.* (See Open Q.)

### 5. Discipline taxonomy = the slice of engine physics an art reaches into

*(Advances Open Q 1 past the elemental framing.)* Not one "Magic" skill,
not arbitrary schools — **each art is named for the subsystem it
actuates**, which is what makes the taxonomy non-arbitrary:

| Art | Reaches into | Sample spells |
|---|---|---|
| **Evocation** | thermal + materials-response | firebolt, frost, shock |
| **Force** | movement + spatial (blunt) | push, pull, levitate, force-wall |
| **Biomancy** | harm + vitals + metabolism | mend, wither, venom, vigor |
| **Glamour** | belief + shadow + light + senses | invisibility, illusion, darkness |
| **Dominion** | behavior + belief | fear, sleep, compel |
| *(later)* **Shaping** | materials + species + boundary | shape stone, transmute, passwall |

Ship **2–3 first** — Evocation + Force + Biomancy is a complete kit
(attack / control / heal). Depth comes from the **advancement graph**:
within an art, competence unlocks tiers (band-gated `conferrals`:
candle → firebolt → firestorm); across arts, `synergizes` gives combos
(Force + Evocation = a blast wave); `requires` gates the advanced spells.
Single pool: **per-art competence sets cost + access**; pool *size* grows
with overall magical competence. The classical-four / wu-xing framing
survives only as an optional content sub-flavor inside an Evocation-type
art, not as the top-level taxonomy.

### 6. Access — orders vs. guilds (magic's place in the guild tapestry)

A craft **guild** is an open union shop: a **learn-rate buff** on a
universally-learnable discipline. A magic **order** is **gated** and grants
a **channel/capability** you cannot otherwise have — mechanically an
**attunement/augment conferral** (the augment-confers-mixin substrate).
*A guild teaches you faster; an order lends you power — an order is the
key.* Three layers, each on a system we have:

- **Access** = order membership → a gated conferral (augment/attunement).
- **Skill** = advancement competence within the art.
- **Power** = the Focus reserve.

### 7. Casting pipeline + counterplay

Invoke the spell verb → an **engaged action** (interruptible, takes a beat
— the activity substrate) → spend Focus → competence check
(difficulty-modulated; mints an `ActSignature`, feeds advancement) → on
success, call the real effect API (materials-response / thermal / harm /
spatial / belief) with the caster as source. You beat a mage by **breaking
Focus** — hurt, frighten, blind, or exhaust them; interrupting a cast *is*
breaking concentration. This is exactly why the mental-reserve (not
body-energy) choice matters: it gives magic three attack surfaces.

### 8. Species mental profiles (sketch)

The mental statline sits beside the physical one on `Species`/`BodyPlan`;
it's most characterful when the two echo or contradict:

| Species | Physical thumbnail | Depth | Serenity | Composure | Playstyle |
|---|---|---|---|---|---|
| **Human** | balanced, omnivore | moderate | steady | steady | generalist baseline — no edge, no hole |
| **Troll** | massive, regenerating, slow | shallow | sluggish | **unshakable** | few casts, un-interruptible; one big unstoppable spell; loses to attrition |
| **Ghoul** | gaunt, cold, carrion-fed | **deep** | glacial | moderate | reservoir — burst a torrent then long spent; recovery gated on its carrion diet |
| **Sylph** * | slight, quick, warm | moderate | **quick** | brittle | nimble, fast-refilling, precise — shatters when hurt or frightened |

<sub>* illustrative, to show the far corner.</sub> The **ghoul is where the
system pays off**: Serenity is fed by *nutrition*, and a ghoul's metabolism
runs on carrion, not bread — so its mental recovery is gated on its diet,
an **emergent** detail that falls out of the metabolism tag-system, not one
we designed.

### 9. Deferred / still open (this pass)

- **The interaction stack** (counterspell / reflect / dispel — the Wiz-War
  probe). Is magic interruptible-via-Focus only, or is there a reaction
  stack? *Not decided.*
- **Per-school affinity** — subsumed into competence + access, or a
  distinct axis? (See §4 tension.)
- **Tier ladders per art** (novice → master spell lists) — content, unwritten.
- **How training moves the three attributes** within a species range.
- **Mind-attack spells** (Dominion: fear/charm) reading/writing Composure —
  the concrete read/write contract.
- **Divine / belief-powered ("American Gods") magic** — raised as a
  possible *additional* tradition (power = a patron's aggregate worship via
  renown/belief); explicitly **not** the baseline model; parked.
- **Design probe:** the model was interrogated against **Wiz-War** (Tom
  Jolly) — energy-as-cards, the interactive stack, board/maze manipulation,
  transformation, theft-objectives.

### 10. Wiz-War mining pass (2026-07) — inspiration, not import

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

- **Revised stack lean** (updates §7 / §9's open stack question). 5th ed is
  *saturated* with counteractions — Reflection / Blunt / Absorb / Full
  Shield / Reverse / Anti-Anti / Empathy, plus out-of-turn Interrupt /
  Opportunity Fire. The reactive counter-war is Wiz-War's *soul*, far more
  than 8th's. So: **readied instants** (held Shield/Reflect/Absorb/Dispel,
  Focus-triggered when targeted — on the reactions + activity substrates)
  are the **baseline, not optional**. Full priority-war (Interrupt) stays
  resisted for real-time-text pacing.

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

---

## The one obligation on shipping work

Everything here is deferred, but one negative obligation binds the
*current* Vitals/Materials work so this stays reachable:

- **Keep capability derivable — never add a stored CON-style scalar**
  to Vitals that duplicates the substrate.
- **All reserves ride one generalized `Reserve` substrate** (shipped by
  the Vitals build), differing by instance, not mechanism:
  endurance/satiation/hydration are biological, mana/charge/essence are
  magic-side and *authored*. The shipping obligation: build the reserve
  axis *generally* (not hardcoded to biology) so magic reserves drop in
  as instances — never fork a second reserve mechanism for magic, and
  never add a stored CON-style scalar that duplicates the substrate.
- **Don't add fake elements to chemistry.** The magical-property layer
  is additive and lands when magic does; real Materials stay the
  single source of truth for what matter is.

---

## Open questions

1. **Elemental taxonomy** — classical four / wu-xing cycles /
   invented. *Held open per user; architecture doesn't care.*
   **→ Advanced in Part IV §5:** top-level taxonomy is by **engine-domain**
   (Evocation/Force/Biomancy/…); the elemental sets survive only as content
   sub-flavor inside an Evocation-type art.
2. **Affinity shape** — per-school vector vs. single scalar; innate-
   fixed vs. marginally trainable. *Lean: per-school + marginally
   trainable, to preserve symmetry with conditioning.*
3. **Mana recovery** — does it interact with bodily fatigue/vitals at
   all (e.g., exhaustion slows mana regen), or is it a fully separate
   curve? *Lean: separate curve, with an optional condition coupling.*
   **→ Resolved in Part IV §3:** coupled — Focus rides a magical metabolism
   fed by ordinary calm / rest / nutrition; pain and fear disrupt it.
4. **One channel or many** — is magic a single thaumic field, or one
   propagating channel per school/element? *Affects the PhysicsChannel
   shape; lean single field + school as a property of casts.*
5. **Skill substrate sharing** — physical skill and spellcraft are
   almost certainly *one* skill system with different content. Confirm
   at build.
6. **Conditioning vs. vitals recovery** — does training share machinery
   with the body's healing-progression ticks? Likely yes (both are
   slow bounded curves on the body).
7. **Gear/focus** — equipment as a bounded capability channel
   (a focus boosts effective affinity; a tool boosts effective skill).
8. **Genetics as baseline source** — ties to race.md's deferred
   genetics; the physical build-baseline and innate affinity both
   eventually source there.
9. **Reserve topology — one pool or plural authored?** A single
   universal mana scalar, or per-tradition authored reserves
   (charge / essence / favor) on the shared `Reserve` axis? *Lean:
   plural + authored — the capacitor-guild "charge" precedent; one MP
   pool flattens flavor and re-introduces a stored scalar by the back
   door.* **→ Part IV §2 overrides this lean for the baseline:** a single
   **Focus** pool, with the plural-authored seam retained only for exotic
   traditions. (The "flattening" worry is answered by carving *disciplines*
   by engine-domain and by the mental statline, not by splitting the pool.)

---

## What this slate does NOT cover

- **The Vitals substrate itself** — [vitals-slate.md](../builds/vitals-slate.md).
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
- The skill substrate (shared physical + magical) and the knowledge
  axis.
- Magic as a `PhysicsChannel`: the thaumic field, its units, its
  propagation/conservation laws, the instrument suite.
- The magic-side capability: affinity (per-school, measurable) + mana
  (the reserve), and their symmetry with the physical side.
- The elemental architecture: schools-actuate-real-channels + the
  Materials magical-property layer; the chosen taxonomy.
- Tests gating: effective capability tracks condition; conditioning is
  bounded and bidirectional; a magical law is measurable and consistent
  under `analyze`; an elemental spell actuates the correct real channel
  (fire heats/combusts per real chemistry); resonance scales effect.

The taxonomy, the spell/skill content, and the combat coupling wait
for their own work.
