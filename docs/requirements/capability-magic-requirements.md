# Magic core (capability-magic) — requirements

The first magic build: the **effect substrate + casting**, delivering the
model locked in
[capability-magic-slate.md Part IV](../slates/deferred-rpg/capability-magic-slate.md)
— magic = spend a reserve → fire a list of declarative effects → they land
in the systems we already have. Magic is a new **trigger**, never a new
**mechanism**: every Effect primitive is a thin wrapper over a gated Api
that already does the work, so a fireball is real heat that starts real
combustion ([fire.md](../subsystems/fire.md)), a spark is real current
through the real conduction graph
([electricity.md](../subsystems/electricity.md)), and fear is a real
condition gated by the target's Composure. This build is the payoff of the
frontier-physics arc (electricity → storms → fire) built expressly so magic
would have honest channels to actuate.

Scope settled 2026-07-21: **magic core only.** The
[inquiry substrate](../slates/builds/inquiry-slate.md) (discovery /
publishing / wrong-paper) and the
[magic-items tier](../slates/builds/magic-items-slate.md)
(Consumable / BUC / wands / scrolls) are each their **own later build**,
consuming this build's substrate. The effect substrate ships
**trigger-agnostic** precisely so those consumers drop in without rework.

## Goals

- **The effect substrate.** A cast is trigger-agnostic data —
  `Cast = { trigger, cost, targeting, effects: Effect[] }` — and an
  `Effect` is a member of a closed, curated catalogue where **a primitive
  exists iff a gated Api already does that work** (the governing
  invariant). v1 primitives (each a thin wrapper over its shipped Api):
  `InjectChannel` (`ConditionApi.inflict`), `Afflict`/`Relieve`
  (condition surface), `AdjustReserve` (`Reserved`), `Move`
  (`LocomotionApi`/`ContainmentApi`), `Conjure` (`StuffApi.clone`),
  `Sense` (`PerceptionApi`/`PerceiverApi`), `Cloak` (belief/
  `RecognitionApi`), `EmitField` (light/thermal/`Audible`), plus the
  code-trust-gated `Script` trapdoor. `Transform` is explicitly absent
  (no backing Api — polymorph's own build).
- **The impulse/modifier split** is first-class on every effect: impulse =
  fired-and-released (real now, cannot un-happen); modifier = sustained,
  magically-bound (installs a condition the reconcile-on-read drivers
  realize, and **drops under suppression**).
- **The resist seam.** The materials-response shape generalized to N axes:
  mitigators **subtract** (folded outside-in; a mitigator returning 1 =
  immunity), the substrate **gates** (sets stage thresholds + picks
  outcome type, scaled by a `factor()` read from live target state).
  v1 axes: **channel** (the shipped `MaterialApi` fold, unchanged),
  **mental** (substrate = Composure, **no mitigator layer** — wards
  deferred), **toxin** (the shipped metabolism banding, recognized as an
  instance of this shape), **none** (lands in full). Per-axis intensity
  units: channel carries real energy; mental carries an authored potency
  scalar.
- **The grid as advancement content.** The verb×noun grammar ships as
  Discipline leaves in the shipped advancement Catalog — 5 verbs
  (Create/Destroy/Control/Transform*/Perceive) × the active nouns — with
  `synergizes`/`requires` edges and **band-gated conferral** as spell
  access: climbing a cell's two Disciplines is what unlocks its spells
  (no spellbook economy in v1; competence IS access). Every cast credits
  an `ActSignature` against **both** its axes through the shipped
  Transcript. (*Transform's Discipline leaf may seed for the tree shape,
  but no v1 spell uses it.)
- **The anatomical casting faculty.** Casting is a bodily capability,
  not a flat stat:
  - the mana pool is an instance of the shipped `Reserve` axis (the
    engine word is reserve; "mana" is the authored content name) —
    **never a forked mechanism**;
  - a per-species **faculty profile** (the `vitalProfile` precedent)
    carries three banded attributes: **Depth** (capacity), **Serenity**
    (recovery rate), **Composure** (the mental-axis resist substrate,
    read live as profile × current reserve/calm — a drained mage resists
    fear worse);
  - recovery rides the shipped metabolism coupling (rest/calm — the
    endurance-recovery precedent), so the faculty is **fatigable**;
  - the faculty is **species-gated** (a species without it cannot cast)
    and **injurable**: casting honors impairment (the
    fracture-impairs-slot precedent), and **overchanneling** (casting at
    or past empty) inflicts a strain condition that degrades the faculty
    until recovered.
- **Casting is an interruptible engaged activity.** A cast holds an
  engagement slot for its cast time (the activity substrate); being
  disrupted mid-cast aborts it — this is how the **active gate** (the
  shipped combat model: dodge/parry/poise/interrupt) applies to magic
  with zero new combat machinery. The passive gate is the resist seam.
  There is no parallel resolution anywhere.
- **Magical provenance as a pervasive rich tag.** Everything magic
  produces is stamped `{ verb·noun, caster }` — on the cast attempt, on
  installed conditions, on in-flight effects (items when build 11
  lands). Read by:
  - the **anti-magic zone**: a `suppresses-magic` field on Location/Zone
    resolved by the outward walk (the biome/address precedent),
    optionally filtered by grid coordinate ("no fire magic here"); a
    cast-time validator vetoes casts, and ongoing **modifier** conditions
    go dormant on their next reconcile-on-read — the suppressible line
    IS the impulse/modifier line (a lit fire keeps burning);
  - **dispel/detect**: `Relieve`/`Sense` effects keyed to the tag
    (the Arcana cells), never able to touch non-magical conditions.
- **The v1 spell roster** — authored data (never bespoke classes), one
  cell per primitive, leaning on the frontier physics this arc built:

  | Spell | Cell | Primitive | Proves |
  |---|---|---|---|
  | firebolt | Create·Fire | InjectChannel(heat) | impulse; real ignition/combustion takes over |
  | spark | Create·Lightning | via `ElectricityApi.conduct` | the graduated noun; conduction graph; caster obeys own physics |
  | shove/pin | Control·Body | Move | movement effects |
  | dread | Destroy·Mind | Afflict + `resist:{mental}` | the mental axis vs Composure |
  | glowlight | Create·Light | EmitField(light) | a **modifier** (sustained; suppressible) |
  | conjure water | Create·Water | Conjure | template/bulk conjuration |
  | veil | Perceive·Sense (Cloak) | Cloak | belief-side semblance |
  | dispel | Destroy·Arcana | Relieve (tag-keyed) | provenance tag; Arcana bottoms out in a real op |

  Exact spell names/flavor are the planner's; the **cell × primitive
  coverage is the requirement.**
- **Command surface**: a `cast` verb (new `magic` command category),
  parser-typed targeting, plus a self-view (`spells` or a `magic`
  subcommand) showing castable cells and faculty state — **bands, never
  numbers** (you analyze your own resistances; an enemy's Composure you
  only feel as outcome).
- **Demonstrator content**: a small teleport-reachable **practice hall**
  where the roster is castable at authored targets (combustible dummy,
  conductive trough, a warded practice cell), plus **one anti-magic
  warded room** proving suppression (glowlight winks out, the lit brazier
  keeps burning). No new NPC (NPCs are expensive carves; a caster NPC is
  a later build's demonstrator).

## Non-goals

- **The inquiry substrate** — Law catalog, predict loop, publishing,
  wrong-paper. Its own build ([inquiry-slate](../slates/builds/inquiry-slate.md));
  magic is its first consumer. Nothing in this build blocks it: laws stay
  emergent because effects ride honest functions.
- **Magic items** — Consumable, BUC, wands/scrolls/potions/rings
  ([magic-items-slate](../slates/builds/magic-items-slate.md), build 11).
  The trigger-agnostic envelope is shaped for them; they are not authored
  here.
- **Transform / polymorph** — no backing Api; its own build
  (slot-eviction choreography per the magic-items slate).
- **Multi-cell spell composition** (steered firestorm) — a second
  combinatorial layer, deferred.
- **Wards as mental-axis mitigators** — Composure-alone in v1; wards land
  when Arcana content grows.
- **The frontier nouns Spirit and Time** — Spirit waits on
  presence-hollowing; Time stays out by design.
- **The magical-material property layer** (Part III resonance /
  per-school affinity on `Material`) — v1 spells get their consistency
  from the real subsystems; the additive magical layer waits for content
  that needs it.
- **Orders/guilds as magic gates**, player-authored spells, NPC caster
  brains, scroll/teaching economies — all later consumers.
- **No new combat machinery** — no cast-vs-cast subsystem, no counterspell
  minigame; counter-shaped play arrives via Arcana effects + the
  interrupt that already exists.

## Surface decisions

### Lightning and Storm graduate from frontier to active nouns

The slate froze them as frontier because their substrates didn't exist.
They do now — electricity (MR !139) and weather Wave 2 (MR !141) were
built expressly as these nouns' prerequisites, and the slate's own rule
("a noun that maps to no subsystem is a frontier, not a hole") promotes
them: **Lightning** actuates the conduction/shock substrate; **Storm**
actuates weather via the authored-pin tier (`Locality`/`_weatherPin` —
"call a storm" = install a weather pin, a textbook *modifier* effect that
drops under suppression). The active roster is therefore **13 nouns**;
frontier = Time, Spirit. v1 authors a Lightning spell (spark); Storm gets
its Discipline leaf but no v1 spell (pin-installation as an effect
primitive would need a gated weather-write Api — deferred until one
exists, per the governing invariant).

### Build composition: magic core only

Inquiry and items are cleanly separable (inquiry's discoverable laws
already shipped with the physics; items consume the same envelope), and
the never-half-grown rule says one substrate per cycle. Decided: this
build ships casting as the first trigger; siblings follow.

### Spell acquisition = band-gated conferral only

The slate offered conferral, a RecipeKnowledge-style ladder, or both.
Decided: **conferral only** — climbing a cell's Disciplines unlocks its
spells (the shipped `AdvancementMixin` affordance-push). The knowledge
ladder + teaching economy arrive with the inquiry build, where
learning-from-a-paper gives them their real meaning.

### Mental axis: Composure-alone

The substrate gates; no mitigator registers for the mental axis in v1.
Immunity-as-limit still holds structurally (the fold is N-axis from
day one); wards are content for a later build. The whole "mental"
exploration remains exactly one cell of the resist table.

### The anatomical faculty ships in v1

Chosen over the thinner reserve+Disciplines cut. Concretely: species
faculty profile (Depth/Serenity/Composure bands), reserve recovery
coupled to metabolism, species gating, impairment honored at cast time,
and the overchannel strain condition. **Not** in v1: a literal `BodyPlan`
organ with targeted-wound plumbing — the faculty is species-profile +
reserve + conditions; anatomy-level targeting of the faculty is deferred
richness.

### Spells are data-Idea leaves, not a new collection

Spells are authored reference data (the Discipline/Corpo/Brand
precedent): pure-data leaf `Idea`s keyed on a durable `spellId`, warmed
into a boot-time catalogue singleton, never cloned. Deliberately **not**
a new Mongo collection (the Recipe/Document precedent) — the Atlas
500-collection ceiling is already pinched, and spells need no per-row
mutation. Authored seeds ride the established config/seeder path.

### One gated Api pair fronts casting

The cast pipeline (resolve spell → validate faculty/suppression → spend
reserve → run effects → stamp provenance → credit Transcript) lives
behind a gated Api + logic singleton (the `FireApi`/`FireLogic` shape).
Effect primitives execute **as the substrate's own principal** through
the same security gate every other caller passes — magic gets no
security bypass; an effect can only do what its backing Api permits.

## Constraints

- **The governing invariant, enforced structurally:** no Effect primitive
  without a shipped gated Api behind it. The catalogue is closed (a
  union, not a plugin surface); the `Script` trapdoor is code-trust
  (`isWizard`) gated. "Gain 5 levels" must remain unwritable.
- **Caster obeys own physics.** No caster-exemption anywhere: your spark
  conducts through the puddle you stand in; your firebolt's combustion
  spreads by the real fire tick. Friendly-fire/faction-blindness is a
  feature (the electricity slate's consent/blame vector).
- **Never fork the Reserve mechanism; never add a stored CON-style
  scalar.** The slate's shipping obligation binds this build hardest of
  all. Depth/Serenity/Composure are profile bands + derive-on-read,
  never stored scalars on the creature.
- **Banding is presentation, not security** ([memory/feedback]): own
  faculty state = bands you can see; another's Composure = opacity you
  feel only as outcome.
- **Bands, never numbers** in every player surface (the advancement
  honesty firewall).
- **Actor from context**: the caster is derived from the execution
  context (`getActingAuthor` / command-frame giver), never a parameter
  ([gated-api-actor-from-context]).
- **Module taxonomy**: Api + logic-singleton pair, mixins in
  `lib/<subsystem>/`, no free-floating helpers, no new module
  categories. Magnitudes are AppSettings dials (`magic.*`), shape in
  code (the shape-vs-magnitude split).
- **All spell/faculty numbers ride existing Quantity/Reserve/condition
  substrates** — condition stages use the authored-bands (toxin `bands`)
  precedent; heat/current injections use the real units the channels
  already speak.
- **Suppression honesty**: suppression may only drop what magic is still
  holding up (modifier conditions); it must never revert impulse
  consequences. Cast-time veto = the `requiresConscious` validator
  pattern; dormancy = reconcile-on-read, no tick.
- **No new global events, no new tick loops.** Everything rides
  reconcile-on-read, the activity substrate, and existing schedule
  surfaces.
- **The demonstrator is content**, authored declaratively in `domain/`
  (seeds + `adornments:`/`populates:`), never engine special-cases.

## Acceptance criteria

- The full v1 roster is castable end-to-end in-world by a competent
  caster, and each cell's proof holds:
  - firebolt ignites a combustible practice dummy and real combustion
    (spread, smoke, char) takes over with no magic-side damage path;
  - spark shocks through the conduction graph, including shocking the
    caster standing in the same pool (caster-obeys-physics test);
  - dread lands as a staged condition whose onset stage is worse against
    a reserve-drained target than a rested one (the Composure factor);
  - glowlight is a sustained modifier; dispel removes it; it goes
    dormant in the warded room while a mundane (and any impulse-lit)
    fire keeps burning there;
  - dispel refuses to touch a non-magical condition (tag-keyed only);
  - conjure water / shove / veil each land through their backing Api
    with no bespoke mechanism.
- A cast is an engaged activity: it can be interrupted mid-cast (combat
  or displacement), aborting the effect and per the cost model settled
  in planning (at minimum: no effect fires on abort).
- Casting spends the reserve; at empty, overchanneling inflicts the
  strain condition and degraded casting is observable until recovery;
  recovery rate follows rest/calm via metabolism.
- A species without the faculty cannot cast (verb gated/absent), and a
  cast-impairing condition is honored at cast time.
- Spell access is conferral-banded: a novice lacks a high-band cell's
  spell until the Discipline bands rise; every cast writes an
  `ActSignature` crediting both the verb and noun Disciplines.
- The anti-magic zone vetoes casting inside it with a legible refusal,
  scoped by the outward walk, and grid-filtered suppression ("no
  ·Fire") blocks only matching casts.
- Player surfaces (`cast` refusals, the self-view, `analyze`-style
  reads) speak bands and prose, never raw numbers, for everything
  faculty- or resist-shaped.
- Tests cover: the effect catalogue's Api-backing (each primitive), the
  N-axis resist fold (subtract-then-gate, immunity-as-limit, per-axis
  units), impulse-vs-modifier suppression semantics, provenance stamping
  + tag-keyed dispel, faculty gating/fatigue/overchannel, conferral
  gating, and the caster-in-graph physics cases.
- `docs/subsystems/magic.md` exists as the subsystem source of truth;
  the advancement doc gains the magic-Discipline seeding note;
  CLAUDE.md's doc map and the slate index are updated; the capability-
  magic slate is annotated with what shipped vs. what stays deferred.
- `magic.*` AppSettings dials seeded for every authored magnitude
  (costs, potency scaling, overchannel severity, suppression semantics
  need no dial — it's shape).

## Cross-references

- Seeding slate: [capability-magic-slate.md](../slates/deferred-rpg/capability-magic-slate.md)
  (Part IV is the locked model this build implements)
- Sibling slates (consumers, out of scope):
  [inquiry-slate.md](../slates/builds/inquiry-slate.md),
  [magic-items-slate.md](../slates/builds/magic-items-slate.md)
- Actuated substrates:
  [fire.md](../subsystems/fire.md),
  [electricity.md](../subsystems/electricity.md),
  [weather.md](../subsystems/weather.md),
  [thermal.md](../subsystems/thermal.md),
  [harm.md](../subsystems/harm.md) + [materials-response.md](../subsystems/materials-response.md)
  (the resist seam's origin),
  [vitals.md](../subsystems/vitals.md),
  [metabolism.md](../subsystems/metabolism.md),
  [reserve.md](../subsystems/reserve.md),
  [belief.md](../subsystems/belief.md),
  [light.md](../subsystems/light.md)
- Framework: [advancement.md](../subsystems/advancement.md) (Disciplines,
  conferral, Transcript), [activity.md](../subsystems/activity.md)
  (engaged cast), [conditions via harm.md/metabolism.md],
  [biome.md](../subsystems/biome.md) + [address.md](../subsystems/address.md)
  (the outward-walk suppression resolve),
  [app-settings.md](../subsystems/app-settings.md)
