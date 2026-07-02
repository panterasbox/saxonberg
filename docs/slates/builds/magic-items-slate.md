# Magic items slate (working doc) — NetHack's consumables + the BUC axis

> **Status (2026-07): design in progress — the BUC substrate is settled
> end-to-end; the item catalog is mapped but not yet spec'd.** The premise:
> NetHack's potions / scrolls / rings / amulets are a stress-test suite for
> the immsim substrate — most of the catalog *lands somewhere* on systems
> already shipped (belief, augmentation, thermal, metabolism, respiration,
> senses, teleport, reserve) rather than needing new machinery. This slate
> captures (1) the reformed **blessed / uncursed / cursed** model as a real
> system, and (2) the catalog map that is the backlog for the item-by-item
> walk.

See also:
[identification-slate](../tails/identification-slate.md) (**the sibling
axis** — item *identity*, "a blue potion" → "a potion of healing", the
deductive class-level game; BUC is the orthogonal *instance* axis) ·
[belief.md](../../subsystems/belief.md) (recognition/identification/regard
realms — known-BUC is a new realm here; `Disguisable` is the appearance mask) ·
[augmentation.md](../../subsystems/augmentation.md) (augment-confers-mixin —
**a worn ring/amulet is a wearable augment**; cursed = the release gate vetoes
unequip) · [crafting.md](../../subsystems/crafting.md) (`Grade` ordinal
value-object — the precedent for the `Blessing` value-object) ·
[vitals.md](../../subsystems/vitals.md) (no HP scalar — why "healing" defies
the model) · thermal / metabolism / respiration (resistances land here, not on
combat) · combat (being designed separately — the deferred half of the catalog).

---

## Two axes, kept apart

The single most important framing, and the one that's easy to smear:

- **Identity axis** (owned by [identification-slate](../tails/identification-slate.md)):
  *what is this?* A **blue** potion — healing or poison? The appearance→effect
  mapping is **class-level**, reshuffled per game, and it is the **deductive**
  game (price-ID, use, narrowing). If anything degenerates into
  wiki-memorization, it lives here — and the fix is to keep it *deductive*.
- **BUC axis** (this slate): *how good is this instance?* Blessed / uncursed /
  cursed is **per-instance** state. Detect it and you know it — nothing to
  deduce or memorize beyond the detection. "Reason, don't memorize" is an
  *identity-axis* goal and does **not** apply to BUC.

Both ride the same belief machinery (a fact you don't know until you learn it),
but they are different facts with different keys (identity = item class; BUC =
item instance).

## The effect substrate (Gap 0) — what "using an item" does

The most obvious correlary is the biggest hole: **there is no consumable /
effect abstraction.** What the code actually has (verified 2026-07):

- `drink`/`eat`/`sip` are **bulk-only** — a `Bulkable` slot → `ingest` →
  metabolism, which knows only *chemistry* (macros/toxins/alcohol). No "use a
  discrete item that fires an arbitrary effect."
- The only "effect" abstraction is `DialogueEffect` — a small closed union
  scoped to NPC dialogue trees.
- Effect *targets* exist but are scattered (conditions, reserves, augments,
  metabolism, regard) with no unifying "apply effect → consume item."

So a potion (and every scroll/wand) needs two new first-class concepts:
**`Consumable`** (a discrete, single-use item that affords a use-verb —
`quaff`/`read`/`apply` — resolves an effect, decrements/destroys itself, leaves
the empty vessel as content — orthogonal to `Bulkable`) and **`Effect`** (the
thing applied). `Consumable` is shared substrate for potions + scrolls + wands.

### Two effect families

The Effect grab-bag decomposes; each family maps to a mechanism already built:

- **Impulse** — mutate state once, nothing ongoing to override: *gain energy,
  teleport, heal, identify, detection, remove-curse, gain-level.* A one-shot
  verb or trusted script (run with the *item's* authority, not the user's).
  **No condition, no shadow.**
- **Modifier** — override how the host behaves for a duration: *speed,
  levitation, invisibility, disguise/polymorph, resistances, regeneration,
  slow-digestion, protection, telepathy.* These are a **`Condition`** (see
  next).

A neat convergence: **metabolism is just one impulse verb (`ingest`)**, so
potion-of-booze and a mug-of-booze feed the *same* body chemistry through
different front doors. `Bulkable` and `Consumable` stop competing.

### Condition vs Shadow — the fact/realization split (NOT redundant)

Both `ActiveCondition` (on `VitalsMixin`) and `Shadow` (call-security) are built
but **inert — nothing consumes either yet**, which makes them *look* like two
mechanisms for one job. They aren't; they're different layers:

- **`Condition` = the persisted *fact*.** A declarative record ("poison, stage
  3, elapsed 4s"), one list on the host, survives save/reload, does nothing on
  its own. Kind-A afflictions = authored `templatePath` content w/ progression;
  Kind-B trauma = closed engine vocab (`laceration`/`fracture`/`burn`…) in a
  static table. Shapes-only today.
- **`Shadow` = a runtime behavior *override*.** Code that intercepts a method
  and wraps it (`callDown` chain). Attachment does **not** persist (Tier 5).

A fact reaches behavior two ways, and **the rule is:**

> **Fact → `Condition`. Realize by *pull* by default; use a *shadow* (push)
> only when the affected behavior is owner-less.**

- **Pull** — a driver/getter reads the condition record and folds it in (vitals
  band, metabolic drain, thermal/damage intake). This is how the condition
  system is *already designed*. Cheap. The default. Covers poison, disease,
  trauma, resistances, regeneration, slow-digestion.
- **Push (shadow)** — the fact attaches a method-override so every caller sees
  modified behavior without knowing conditions exist. Needed **only** when the
  target method is scattered across many call sites with no single owner — a
  short list: **perceivability** (invisibility) and **presentation/recognition**
  (disguise/polymorph). ~3–4 effects in the whole catalog, not half.

Neither subsumes the other: shadows can't be the fact-store (attachment doesn't
persist → progression state evaporates on reload); conditions can't cleanly
override diffuse behavior (would thread condition-checks through all of
perception). They compose — **Condition is always the substrate; a shadow is an
optional realization for the diffuse minority**, re-materialized from the
persisted condition on load (so the Tier-5 "attachment doesn't persist" gap is
irrelevant — persist the condition, re-attach the shadow).

**Bonus / combat seam:** the trauma vocab already lists `laceration`/`fracture`/
`burn` — the injury model healing needs is already scaffolded. So *healing =
reduce/clear `ActiveCondition`s*, and combat produces trauma into the **same
table** healing reads. The two builds meet at `conditions`.

Potions are the **first consumer of `Consumable`, `Condition`, and `Shadow`** —
the moment to draw the pull/push line before entrenched consumers blur it.

## BUC as a system — potency on the item's own axis

The reform of NetHack's BUC is narrow and conservative. **Keep** the three
things that aren't broken:

1. **Three states.** Not a scalar, not bands. Legible.
2. **Hidden until identified.** The whole drama of "do I put this ring on."
   This is just belief pointed at the instance.
3. **Cursed sticks.** Welded weapon / un-removable ring / undroppable
   loadstone. Legible "oh no" — and it's *already* the
   `RequiresActive` / wearable-release gate. Cursed vetoes the unequip.

**Fix** exactly one thing: NetHack's cursed/blessed outcomes are inconsistent
(sometimes weaker, sometimes sign-flipped, sometimes a no-op, sometimes a
gotcha). Normalize to a strict ordering with no sign flips:

> **BUC is a *potency level* on the item's own effect axis.** The engine owns
> the ordering `cursed < uncursed < blessed`; the item owns the
> effect-as-a-function-of-potency and honors one contract: **monotonic in
> potency.**

"How bad" is never a cross-item judgment (that *was* the wrong, subjective
framing) — it's just where you sit on *that one item's* dimension. No comparing
a cursed ring to a cursed scroll; each rides its own axis.

### The two authoring shapes = the whole effect surface

Whether potency is a smooth differential or a discrete step **depends on the
object**, but `bad < ok < better` is universal. So the engine offers exactly
two primitives:

- **`scale(potency, lo, hi)`** — *continuous*. `healAmount = base × potency`.
  One knob, smooth.
- **`pick(potency, steps[])`** — *discrete*. Potency indexes ordered steps:
  teleport = `[wild, teleport, controlled]`; remove-curse =
  `[worn-only, all-worn, whole-inventory]`; identify = `[one, several, all]`.

The monotonic contract is that the author feeds these in order. It is a
**semantic** invariant — **not lintable**; the enforcement strategy is to make
the easy path the correct path (these two primitives) and document it. Don't
oversell enforcement.

### Notes on the reform's edges

- **No-ops** are now expressible precisely: a no-op is only when *uncursed*
  potency maps to zero effect — reserved for genuinely inert baselines (plain
  water: uncursed = just water, blessed = holy, cursed = unholy).
- **Cursed may be *actively* bad**, not merely weaker — as long as it's the
  low end of the item's *own* axis, never the other item's good. Best example:
  a cursed **identify** doesn't misfire randomly — it **plants a false
  identification in the belief store** (strictly worse than no info, and the
  only thing that exercises belief's false-belief modeling).

## Engine shape — all reuse, one new value-object

| Piece | Lands as | Precedent |
|---|---|---|
| **True BUC** | a `Blessing` ordinal value-object in `lib/blessing/` (rendered as *words*, never a number) + a thin `BlessableMixin` | `Grade` (crafting, weakest-link ordinal) |
| **Known BUC** | a new belief realm, sibling to recognition/identification/regard — "you don't know its BUC" falls out of `RecognitionApi.describe` | identity realm |
| **The stick** | wearable/augment release gate vetoes unequip when `getBlessing()===cursed` | `RequiresActive` / embodiment slots |
| **Effect** | `scale` / `pick` primitives on a thin `BlessingApi`, monotonic contract | — |
| **Detection** | v1 = the identify path (id scroll). Later = an *instrument* in the family you already have (`analyze *` / `feel` / Barometer) — point a sanctity reader at the item, fill the belief realm | identification-slate instrument seam |

## Opt-in, and where BUC comes from

- **Opt-in per template.** `Blessable` is a mixin an author asks for. No BUC
  unless designed — this *shrinks* the surface (fewer, more-meaningful BUC
  items) vs NetHack's stamp-everything. "Drop on altar to ID" only works on
  blessable things — fine.
- **Spawn state comes from the distribution substrate (its own future slate).**
  A generic location populates from a weighted table; once an item is selected,
  its blessing is **sampled from a (tunable, maybe depth-varying) distribution**
  as one more drawn axis. This substrate is the **dynamic sibling of the static
  `populates: onto` seeding** and is bigger than BUC:
  - *Item side*: opt-in participation, rarity weight + eligibility
    (depth / biome / tags).
  - *Location side*: draw from the global distribution, or opt out.
  - *The clever bit — "balance against the rest"*: a location expresses a
    **local bias** (boost a subset, or pin "one of these must appear") and the
    system folds it into the global table and **renormalizes** — a weighted
    overlay, not a hard override that loses global coherence.
  - **BUC only needs the seam, not the whole thing built.** → its own
    [spawn-distribution-slate](./spawn-distribution-slate.md).
- **Laundering** (remove-curse, holy water, becoming-cursed in play) is **not**
  part of the distribution system — those are just *items*, spec'd in the
  catalog walk below.

## Sanctity, holy water, and what "good/evil" means here

Holy water is the probe that forced this, and it exposes the deepest finding in
the walk. The short version of the canon (**source of truth:**
[story-bible.md](../../story-bible.md) §Alignment — two axes / §Evil — the
hollowing, both `[settled]`; the fuller design is the alignment build's
`alignment-slate.md`):

### Good/Evil is not morality — it's presence vs. the hollowing
- **Good** = *serves the conditions of experience* — recognition, presence,
  treating a person as a person. **Evil** = *"the erasure of the line between
  person and thing"* — capture, the optimizer eating experience as fuel, the
  Metric / the Feed, *"a world that runs perfectly and contains no one."*
- **The Good/Evil axis is overt and cosmic; every player is locked Good;**
  Neutral/Evil are NPC-only. (The *hidden/derived/reflective* treatment — mirror,
  never-on-the-sleeve, no-mechanical-reward — is the **Law↔Chaos** axis, and the
  private moral self-view. Do not confuse the two.)
- Evil-as-a-**principle** is **undetectable by design**: it wears any face (*"the
  face is the forgery"*), the scariest agents are *unwitting* (*"you can't tell —
  including about yourself"*). That undetectability **is** the game's central
  question, and it *can* take a human as readily as a construct (*"'constructs
  are evil' is reskinned bigotry"* — protects the synth/clone/android peoples).

### Consequence for reactive items — the operational rule
> **A consecrated item may NOT react to moral valence (undetectable — and a
> detector would gut the discernment thesis) NOR to substrate/species (bigotry).
> It reacts to *the hollow* — experiential-absence: the animate-but-no-one, the
> optimizer's soulless vessels, the hollow-passing-as-alive.**

- Keys on **is-anyone-home**, not flesh → synths/clones/androids (present) never
  react; captured *persons* (still have experience) never react — so the
  warm-faced-deceiver drama stays intact.
- Bites only the **manifest** hollow (legibly empty), silent on the masterwork
  forgery whose hollowness is the undetectable horror → *"you can't tell"* holds
  where it matters.
- **Safe by construction:** players are all Good/present, so it can only ever act
  on hollow NPC content — NetHack's "burns the unholy" smite drops in with zero
  PvP hazard, and on-theme (all-Good protagonists vs. the hollowing).

### Holy water, decomposed
- **BUC-blessing (potency)** — orthogonal, secular, the real v1: raises another
  item's blessing (the `dip`/`apply` target grammar, the laundering loop).
- **Making it** — a **Chapel consecration ritual** (the *worship* layer, kept
  strictly distinct from derived alignment; "worship vs alignment is the drama").
- **Anti-hollow reaction** — a **nature-conditional effect reading a `Condition`**
  (unifies with Gap 0), deferred behind the substrate below. Unholy water is the
  symmetric twin (an instrument of the Feed — *hollows the present*).

### The gap it exposes (bigger than a potion)
The engine has **no notion of experiential presence vs. hollowness as a physical
agent state** — not "undead" (too narrow/genre), not alignment (wrong layer,
undetectable). It sits adjacent to `getConsciousness` (vitals), the
Agent/Creature split, and belief's very *person↔thing line*, but nothing models
*the hollow*. This is the **literal physical shadow of the cosmology** → its own
[presence-hollowing-slate](./presence-hollowing-slate.md); consecrated items are
its first consumer.

## Polymorph — the body-swap (cheaper than it looks)

Predicted to be the biggest structural gap; it isn't — the architecture is
surprisingly ready, for an unplanned reason.

- **The body is fused into the one `Avatar` object** (`Avatar` →
  `ShelledCharacter` → the Agent/Creature/Organism/Vitals/embodiment stack).
  Species is **not** frozen: `OrganismMixin` holds `_speciesPath` as a mutable
  resolve-on-read pointer, and **`setSpecies()` already exists.**
- **The "`getSpecies()` HMR discipline" already makes the big derivations live**
  (nothing caches species-derived state, so it can hot-reload):
  - **Capabilities** — `MixinApi.getActiveMixins` unions the **current** species'
    `innateMixins` live (mirror of `AugmentMixin.confers()`). Free.
  - **Vitals** — reads `getSpecies().getVitalProfile()` / `.getBodyPlan()`
    *"never persisted/cached."* Bands + anatomy reprofile on read. Free.
- **No identity-transfer problem.** Same `stuffId` / chronicle / account —
  polymorph *mutates an attribute of you*; you stay you. The fusion is what makes
  it clean.

**What actually breaks = stored-state reconciliation at the swap boundary** (not
physics — `setSpecies` is a bare write that fires nothing):

1. **Capacity reprofiling** — vital *bands* re-derive, but *current* reserve
   scalars are stored (human@100/100 → dragon@100/1000). Policy needed
   (preserve-ratio / -absolute / refill). **Same gap as restore-ability** —
   polymorph is its extreme case.
2. **Slot eviction** — `slotClaims` come live from the bodyplan, but worn/wielded
   *occupants* are stored relations. Polymorph into a footless form orphans your
   boots. Embodiment has **no "slots-changed, evict" path**.
3. **Recognition break** — recognition keys on the persistent referent (still
   you), so it *won't* break on its own — wrong for polymorph. Reuse the
   **disguise seam** (appearance ≠ identity, relearn on re-perception).
4. **Driver re-stamp** — thermal (mass/material), respiration (medium),
   encumbrance (baseMass): fire the **existing move/`onMoved` restamp fan-out**;
   polymorph is just another trigger.

So the build is: **wrap `setSpecies` in a choreographed `Polymorph` transition**
firing those four reconciliations — composition over existing seams.

**The contrast worth banking:** polymorph is easy *because* body is fused to
identity; **the hollow (from sanctity, above) is hard for the same reason** — it
needs *agency absent from a body*, but the Agent layer is class-fused into
Character. Of the two body-probes, **presence-vs-hollowing is the genuinely
structural one**; polymorph just needs a choreography.

*(Object-polymorph — item → another item — is a separate, smaller thing: a
reclass/reclone through the clone pipeline.)* Thematic flag (not mechanical):
polymorphing a player *out* of their chosen species-persona brushes the
change/genocide nerve (casting-by-recognizable-persona + race-allegory) — a
deliberate "players, or NPC/enemy-only?" call, later.

## Scrolls — reading, forgetting, spawning

A scroll is a `Consumable` like a potion (no new *effect* machinery), but the
use-verb differs, and the class exposes three things:

- **Reading is a gated modality that isn't gated.** `read` needs **vision +
  light + literacy/language**; none are wired. Vision+light is the **same
  perception-gate stub** invisibility and detection hit (now three consumers
  want it); literacy/language is a soft dep on the **deferred language layer**.
  Confused-reading (the effect garbles) then falls out as a clean
  **confusion-condition × effect-resolver** interaction, not a special case.
- **Amnesia — belief already forgets; the real finding is knowledge
  fragmentation.** `BeliefStore` has `forget` / `forgetField`
  ("familiar-face-lost-name") / `clearBeliefs`, persisted — so amnesia's belief
  half is a **clean correlary, not a gap**. The insight: **there's no unified
  "what a character knows."** Knowledge is split across stores with different
  forget-semantics — **belief** (names, item-IDs: CRUD-forgettable), the
  **chronicle** (deeds, skills-known: *append-only, resists forgetting by
  design*), **map/exploration** (map-slate, likely unbuilt). So amnesia can only
  wipe the forgettable working memory and **cannot touch the append-only identity
  spine** — thematically exact (*forget faces, not competence; the ledger is the
  self*). The chronicle's durability is a **feature amnesia respects**, not a gap.
- **Create-monster — in bounds (procgen NPCs), a player-triggered procgen-NPC
  spawn.** The "expensive carves" principle guards the **bespoke named cast**,
  not the **populace**; the economy design's **procgen ⊕ bespoke** split is the
  reconciliation. Reuses char-gen `NameBank`/species-dossier/`PersonaMixin` + the
  `Login.mintRandomGuestAvatar` mint precedent; the gap = a **general reusable
  procgen-NPC generator** (drive that machinery programmatically). **Extends the
  spawn-distribution substrate from items to creatures** — likely one weighted
  populate, two output kinds (items + NPCs), the bespoke cast explicitly outside
  the table. Disposition/hostility-on-spawn = behavior/brains + deferred combat.

Rapid-clear (cross-ref covered gaps): **light/darkness** → Light subsystem
(clean) · **remove curse** → BUC laundering (un-sticks via the release gate) ·
**magic mapping** → map-slate + transient-reveal/knowledge-injection (as
detection) · **scare/tame** → regard + behavior/brains · **enchant/charging** →
grade + reserve-recharge (combat-adjacent) · **teleport/punishment/genocide** →
already walked (done / encumbrance / thematic Bucket D).

## Rings & amulets — the clean class

The wearable-augment coupling is **already wired**: `MixinApi.getActiveMixins`
walks installed augments **via slot occupancy**, and `AugmentMixin.confers()`
returns the mixins an augment activates. So a ring/amulet = **a `Wearable` +
`Augment` that `confers()` its effect-mixin while its slot is occupied** — worn →
slot fills → mixin active; removed → deactivates; cursed → the release gate won't
free the slot. **No foundational gap** (unlike `Consumable` for potions). Most
effects are conferred capabilities or pull-modifier conditions, both supported.

- **New gap — condition-application has no veto/immunity layer.** `afflict()` is a
  pure `conditions.push(...)` — no resist, no onset, nowhere to *refuse* a
  condition. **Free action** (immune to paralysis/hold), **Unchanging** (immune to
  the `Polymorph` transition), **Sustain ability** (block capacity-drain) all need
  a **guard on condition/transition application** that a worn ring *confers* an
  immunity into. Also subsumes hard resistances / save-vs-effect. Small, general,
  real.
- **Convergence — ESP is the perception-side of presence/hollowing.**
  `VerbalESPModality` / `EmotiveESPModality` already exist, so amulet-of-ESP is a
  grant-a-modality correlary. ESP senses mind-activity = senses *presence*; the
  hollow is **silent to ESP**. So the presence/hollowing substrate now has **two
  consumers from opposite ends** — sanctity *reacts* to the hollow, ESP *fails to
  perceive* it. Two independent features on one axis = build-signal.
- **Cursed exemplar — amulet of strangulation** = **stick-curse + choke
  condition**: a cursed amulet you can't remove (release gate) that afflicts an
  asphyxiation condition (respiration driver). The whole reformed-BUC + condition
  + cursed-sticks model in one item.
- Rest are conferred-while-worn modifiers over covered gaps: resistances →
  thermal/metabolism · regen/slow-digestion/hunger → vitals/metabolism pull ·
  searching/warning/stealth → perception-gate · levitation/invis/teleport/polymorph
  → covered · life-saving → death-seam · breathing/vs-poison → respiration/metabolism
  · reflection/conflict/aggravate → combat+behavior · change(sex) → SexedMixin ·
  adornment → regard.

## Gap roundup — the build work-list (ranked)

The payoff of the walk: "implement NetHack items" resolves to a small set of
**substrate gaps**, most already half-built. Ranked by how much they unlock ×
buildable-now.

**Pleasant surprises (shipped substrate that already carries the weight):** the
`getSpecies()` **HMR discipline** makes polymorph cheap (capabilities + vitals
re-derive live); **belief already forgets** (`forget`/`forgetField`); **ESP
modalities exist**; the **wearable-augment coupling is wired** (slot-occupancy →
`confers`); **conditions + shadows are both built** (inert, awaiting a first
consumer). You have more than it looked.

**Tier 1 — foundational, buildable now, unlocks the most:**
1. **`Consumable` + `Effect` substrate (Gap 0).** Every potion & scroll rides it.
   Discrete use→effect→consume; target axis (self/item/creature); declarative
   effect union + `script` trapdoor; metabolism = one `ingest` verb. Two families:
   **impulse** (one-shot) vs **modifier** (a `Condition`).
2. **The BUC substrate** (this build's named core) — `Blessing` value-object +
   `Blessable` mixin + belief realm + release-gate stick + `scale`/`pick`. Orthogonal.
3. **Condition/Shadow realization wiring** — lock the rule (*fact→Condition;
   realize by pull unless owner-less→shadow*); become the first live consumer of both.

**Tier 2 — real gaps, buildable, each lights a cluster:**
4. **Perception gate + transient override** (invisibility, detection, reading,
   searching, warning, stealth — 5+ consumers). The gate is a stub; MQL routes
   around it. Make it gate, and be transiently overridable ("perceive-as-if").
5. **Condition-application veto/immunity layer** (free action, unchanging, sustain,
   hard resistances) — a guard on `afflict` + the polymorph transition.
6. **Capacity-reprofiling policy** (restore-ability + polymorph) — when a max
   changes, what happens to current reserve/vital scalars.
7. **Actor tempo/haste** (speed) — no per-actor action-rate exists. **Shared with
   combat** (initiative).

**Tier 3 — bigger / own-pass / shared with other builds** *(both spun out
2026-07 into their own slates):*
8. **Presence-vs-hollowing agent-state** (sanctity + ESP) — the deepest, the
   cosmology's physical shadow. → **[presence-hollowing-slate](./presence-hollowing-slate.md)**.
   Shared with alignment.
9. **Spawn-distribution substrate** (BUC-state distribution + create-monster) — one
   weighted populate, two output kinds (items + NPCs). →
   **[spawn-distribution-slate](./spawn-distribution-slate.md)**. Shared world-wide.
10. **Procgen-NPC generator** (create-monster) — reusable species+traits+name+behavior
    mint (reuses char-gen/`NameBank`/`mintRandomGuestAvatar`). Folded into
    [spawn-distribution-slate](./spawn-distribution-slate.md) (the creature-output half).
11. **Polymorph choreography** — mostly reconciliations over existing seams (capacity
    reprofile #6, recognition-break=disguise, driver re-stamp=move fan-out); one new
    sub-gap: **slot-eviction on bodyplan change**.

**Decisions / deferrals (not build-gaps):** the **stat-block absence** (cut/redirect
gain-ability/gain-level — no attributes by design); **knowledge fragmentation** (amnesia
respects the append-only chronicle — no work); **language/literacy** (reading's soft dep
on the deferred language subsystem); **combat items** (enchant/protection/reflection/
damage/conflict/shock-resist wait on combat).

**Recommended v1 spine:** Tier 1 (Consumable/Effect + BUC + condition/shadow) lights up
the largest share of the catalog on its own; Tiers 2–3 are follow-on waves, several of
which are **forcing functions that de-risk combat, alignment, and world-population** —
so this build pays down debt well beyond potions.

## The catalog map — the backlog for the walk

Bucketed by *how each item lands against what's shipped*. Representative +
sharp cases; the rest of each class falls in the same bucket unless noted.

### A — Direct translation (substrate exists)
A ring/amulet is a **wearable augment that `confers()` a mixin while worn**;
cursed = stuck. Resistances are mostly *existing drivers*, not combat.
- booze → metabolism `getBAC` (done) · fruit juice/water → bulk `drink` ·
  slow digestion / hunger → metabolic basal-drain · regeneration → vitals
  recovery · magical breathing → respiration (water-breather inversion) ·
  vs-poison / poison resistance → metabolism toxin · **fire/cold resistance →
  thermal (shipped!)** · blindness → `VisionModality` off · teleport +
  control → `teleport` verb + destination prompt · see-invisible / ESP →
  senses + belief · gain energy → reserve (mana-as-content) · **enlightenment
  → un-redact your own self-views** (traits / standing / competence bands /
  chronicle, all shipped).

### B — Reconceive (the model defies NetHack)
- **healing / extra / full healing** — *the big one.* No HP scalar → nothing
  to "restore." Becomes **condition-clearing / vitals-sign restoration**. This
  is the cleanest forcing function in the exercise and it pressures the combat
  design (what *is* damage?) — worth doing early.
- **life saving** → intercept the vitals **death seam** (exists).
- **ring of adornment** (NetHack near-useless) → plug into the **regard / social
  / renown** layer. Poster child for the no-op reform.
- **punishment (ball & chain)** → *encumbrance / haulage*, not combat — a
  cursed heavy thing you can't drop, drain on locomotion. Whole load-bearing
  ladder reused.

### C — Stresses a system on purpose
- **identify** → stresses **prompt**; cardinality *is* the BUC potency
  (`[one, several, all]`).
- **object / monster detection, magic mapping, gold/food detection** →
  stresses **MQL** (scoped queries rendered to the player; reveal topology).
- **hallucination** → stresses **rendering** (a per-viewer `MarkupAugmenter` /
  recognition distortion rewriting names & descriptions — a genuinely new
  belief/render consumer).
- **confusion** → stresses **command-parsing** (garbled/misdirected input).
- **amnesia (cursed)** → stresses **belief** (wipe recognition memory / forget
  the map — belief-store deletion). Best cursed scroll.
- **stinking cloud** → lights the *contaminant* column left laid-unread in
  respiration/biome.

### D — Thematically loaded (stop and think, not mechanical)
- **genocide** — mechanically an MQL seed over the species/clade taxonomy; but
  given the deliberate **species-as-race-allegory / anti-essentialist** stance,
  "erase a species" is radioactive on purpose. Not a build question — a
  *should-we / what-does-it-mean* question. Instinct: not a power tool; either
  cut or a deliberately horrifying, narratively-weighted forbidden thing.
- **change (sex) / polymorph / unchanging** — `SexedMixin` + `OrganismMixin`
  make it mechanically fine, but species-swap touches the same nerve.

### E — Explores genuinely undesigned space
- **enchant weapon/armor, charging** → a `Grade`/quality bump once combat
  defines what enchantment *modifies*.
- **taming / scare monster** → **regard + behavior/brains** (flip an NPC's
  disposition) — a *reputation* consumer more than combat.
- **speed / haste** → activity/engagement pacing on the game-time substrate.
- **protection / increase damage-accuracy / reflection / conflict / warning /
  aggravate** → **combat** (hand to that session; conflict is a *brain* thing,
  not a stat).

## Deferred / own-slate

- **[spawn-distribution-slate](./spawn-distribution-slate.md)** — the weighted-table
  populate substrate (items + procgen-NPCs). *Spun out 2026-07.*
- **[presence-hollowing-slate](./presence-hollowing-slate.md)** — the
  presence-vs-hollowing agent-state (sanctity + ESP consumers). *Spun out 2026-07.*
- **combat items** — bucket E's combat half + resistances' shock leg.
- **the blessing economy** beyond v1 (altars, sacrifice-to-convert, holy-water
  farming) — v1 ships spawn-state + one remove-curse + honest holy water.
- **genocide's disposition** — a narrative/stance call, not a mechanics call.
