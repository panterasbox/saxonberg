# Race / Species / Organism Requirements (working doc)

> **Status: v1 shipped.** The implementation that this slate drove
> is in the tree — see
> [`docs/subsystems/race.md`](./subsystems/race.md) for the
> current state of `Material`, `TangibleMixin`, `Clade`, `BodyPlan`,
> `Species`, `OrganismMixin`, `SexedMixin`, `SpeciesApi`, the
> animacy gating mechanism, and `RadioactiveMixin` (the
> capability-mixin pattern demonstration).
>
> This slate retains: (a) **design rationale** for shipped decisions
> (the "why we picked X over Y" context that doesn't live in the
> subsystem doc), and (b) **forward-looking design** for v1-deferred
> features (death/resurrection flow, DietApi + Edible + Portable,
> tissue authoring at the Detail level, sleep/circadian, aging,
> polymorph, genetics, character-creation UI, per-Clade defaults,
> per-individual feature mixins, permission/rule machinery on
> zones). Future implementors picking up those threads start here.
>
> Where this slate's "v1 ships X" claims diverge from what actually
> shipped, the subsystem doc is authoritative.

---

Requirements for the race / species / organism subsystem (and, by
virtue of organisms reaching for it, the `Material` substrate that
all physical Stuff stands on). Intended audience: a planning agent
that will turn this into an implementation plan, and a future
implementor working in a fresh context.

This doc is not a design doc; it states what we're building and the
constraints, not the line-by-line "how." Where there's an
architectural decision that affects the public surface, it's called
out here so the plan honors it. Same shape as
[`subsystems/light.md`](./subsystems/light.md), which the
planner that ran before this one consumed.

`(have)` = already in the tree.

Cross-references:

- [docs/roadmap.md](./roadmap.md) §"Race / species / organism
  subsystem" — the original blurb this requirements doc elaborates
- [docs/zones-slate.md](./zones-slate.md) — **hard dependency.**
  The templates / zones refactor (Zone class split, Template
  subclasses, `FOLDER_CLASS_PATHS` rename) lands ahead of the
  race build. `Clade extends Zone` is defined here but slots
  into the hierarchy that zones-slate establishes.
- [docs/mixin-slate.md](./mixin-slate.md) §"Organism subsystem
  awareness" — list of mixins constrained by this design
- [docs/subsystems/light.md](./subsystems/light.md) — precedent
  shape for a requirements doc consumed by a planning agent
- [docs/subsystems/templates.md](./subsystems/templates.md) — clone
  pipeline, path-validator constraint, Hydrator
- [docs/subsystems/lifecycle.md](./subsystems/lifecycle.md) — the
  identity-after-death thread for corpses
- [docs/subsystems/perception.md](./subsystems/perception.md) —
  the `Perception` mixin's per-modality capability seams
  (`getVisionProfile`, future `getHearingProfile`, …) that
  species data feeds via shadow.

---

## Goal

A unified species / organism subsystem on top of a fresh `Material`
substrate. Real and fantasy species share one Linnaean tree;
organic agents and synthetic constructs share one mixin
(`OrganismMixin`); biology is the honest pedagogical substrate
beneath the fantasy. Material exists as its own subsystem because
it applies to *every* physical Stuff (Thing, Location, Vessel,
Agent), not just organisms — designing it once means organisms can
lean on it without inventing a tissue-type tree of their own.

Done means: a player can choose a species at character creation
(human, dwarf, elf, dragon, robot) and the engine carries that
through equipment slots (driven by body plan), sex/gender
mechanics (driven by species sex-determination system), diet and
toxicity (driven by Material tags), lifecycle (alive/dead/undead
for organics, powered/unpowered/destroyed for constructs), and
death/resurrection. An apple in the world is correctly fruit
tissue, not an organism; the apple tree is the organism. A
Frankenstein's monster is a Constructa-kingdom organism with
organic-tissue Material and the kingdom-vs-Material split is
explicit.

## Non-goals

- **Genetics layer.** Mendelian inheritance, polygenic traits,
  sex-linked inheritance, full-genome representation — deferred
  entirely. Concerns cross-generation inheritance specifically;
  per-individual variation is handled separately by mixin
  composition (see "Per-individual variation").
- **Cell-level / molecular biology.** Saxonberg never models cells
  (mitosis, meiosis, gamete fusion, protein folding). Pedagogical
  material at that level is prose / illustrations, not runtime
  simulation.
- **Population simulation / evolution.** No allele drift,
  ecosystem dynamics, or per-species migration. Year-2.
- **Cross-species hybridization.** No half-elves, half-dwarves,
  or any inter-species hybrids in the taxonomy. Each humanoid
  species is a complete, distinct lineage. A content author who
  wants hybrids reaches outside the taxonomy (custom species,
  polymorph shadow, ad-hoc trait override) — the engine doesn't
  carry the seam.
- **Per-character mutation.** Depends on genetics.
- **Real metabolism modeling.** Calorie counts, nutrient
  composition beyond toxicity tags. Touches diet but goes deeper
  than the v1 toxicity table justifies.
- **Aging effects on stats.** Stats don't exist in `Character`
  *(have)* yet; `Aged-in-game-time` defers with the stat
  conversation.
- **Polymorph implementation.** A polymorph shadow is sketched as
  a future seam (`Polymorph as a Shadow`), not built in v1.
- **Avatar character-creation UI / controller.** The UI is gated
  on the data model being ready, not the other way around. v1
  ships the data model; the creation flow is downstream content.
- **Schedule-driven sleep / circadian / aging mechanics.** The
  species template carries the slot (circadian band, lifespan
  band) but the tick-driven mixins that consume it are gated on
  the scheduling subsystem.

---

## Subsystem overview

The work splits into the following interlocking pieces. Order
in the plan should respect dependencies; see Build order at the
end of this doc for the proposed phasing.

1. **Material substrate (bulk only)** (Idea-templated tree under
   `/domain/material/`, `TangibleMixin` on physical Stuff,
   `MaterialApi.materialOf(stuff)` bulk resolver) — independent
   of the rest of the subsystem in shape, but species templates
   name a default bulk Material. Lands first. Per-Detail
   material authoring is **deferred** — see "v1 scope" under
   Material subsystem.
2. **Clade kingdom templates** (`Clade extends Zone`, four
   kingdom templates at `/obj/species/{animalia,plantae,fungi,
   constructa}/`). Lands before species so the folder/leaf
   invariant has a real ancestor to nest under. Depends on the
   zones-slate Phase Z3 having shipped.
3. **Body plans** (standalone `Idea` templates referenced by
   species; declares worn slots, held slots, locomotion modes,
   and sensory ports — anatomy only). v1 ships `biped`,
   `quadruped`, and `sessile` (the stand-in plants reference).
   Independent.
4. **Species templates** (`Species extends Idea`, taxonomic tree
   under `/obj/species/...`; carries body-plan reference,
   lifecycle states, sex-determination, reproductive mode, diet,
   lifespan, size, climate, circadian, per-modality capability
   profiles like `visionProfile`). Depends on (1), (2), (3).
5. **`OrganismMixin`** (the engine-side cut for "this is a member
   of the species tree"; carries species ref, age, lifecycle
   state). Composes onto `Agent` *(have)* OR `Thing` (orthogonal
   to agency). Depends on (4).
6. **Animacy gating at the command layer** (command-spec
   `requires-animate` metadata; command-routing refuses dispatch
   on inanimate hosts when set). Depends on (5).
7. **`SexedMixin`** (orthogonal to `Gendered` *(have)*; reads
   valid sex set from species' sex-determination system).
   Depends on (4), (5).
8. **`SpeciesApi`** (small static utility for `getKingdom`,
   `isInKingdom`, lifespan/lifecycle queries, etc.). Depends on
   (2), (4), (5).
9. **Comprehensive null-environment sweep** across MQL
   navigation, command scoping, perception walks, mudlog
   routing, and any other subsystem that walks
   `Containable.environment` chains. The mandate is "audit
   every subsystem that touches environment, fix anything
   that can't handle null cleanly." Decayed avatars motivate it
   but the fix is general (it's how the engine separates
   players from world geography).

**Deferred to follow-on builds (NOT in v1):**

- **Death and resurrection choreography.** Avatar death, ghost
  spawn at `/obj/Ghost/<playerId>`, connection handoff,
  identity links. The state machine (`alive` / `dead` /
  `undead`) ships in v1 via `OrganismMixin.lifecycleState` and
  the predicates work; what defers is the *flow* (combat-driven
  transitions, ghost spawning, persistence flush at death,
  connection transfer). Read this slate's "Death and
  resurrection" subsection as design context for that
  follow-on.
- **DietApi + diet/toxicity gating.** Defers with `Edible` and
  `Portable` from mixin-slate. Without those mixins, no v1
  content motivates the predicate. The "Diet, edibility,
  toxicity" section is design context for the follow-on.
- **Body-plan integration with `Wearable` / `Wieldable`,
  sleep / circadian, aging / life stages, Constructa-specific
  lifecycle machinery, polymorph shadow, character-creation
  UI** — all on follow-on builds, see "Build order" Future
  (gated) section.

---

## Principle

Two load-bearing claims, both worth committing to early because
later mixins inherit their consequences:

1. **Real and fantasy species share one Linnaean tree.** Not
   parallel hierarchies, not a "real biology layer with a fantasy
   adapter" — one tree. Dwarves, elves, dragons, frogs, humans, oak
   trees all branch from a common root.
2. **Players experience species; the engine experiences organisms.**
   The data model is taxonomic (`Species` as `Idea`-shaped
   templates). The runtime cut is mixin-shaped (`OrganismMixin`
   marks organic agents). The two views compose, but they're
   different abstractions and shouldn't bleed.

The pedagogical bet (the roadmap's framing): a STEM student
studying biology should be able to *exercise* their classroom
concepts inside the game — pathogens with realistic host ranges,
real toxicity tables, real metabolism. Not a simulation of reality.
A fantasy game with biology as honest substrate.

---

## Naming: race / species / organism

The three words don't mean the same thing and we shouldn't pretend
they do.

- **Race** — RPG-natural, biologically squishy. The *player-facing*
  word at character creation: "what race do you want to play?"
  Not a data type in the engine.
- **Species** — the data type. A `Species` is an `Idea`-shaped
  template (one per species, real or fantasy) referenced by
  individual organisms.
- **Organism** — the engine-side concern. `OrganismMixin` marks
  organic agents and carries the species reference, sex, age, etc.
  The opposite of `Construct` (robots, golems, ghosts).

When a character creation prompt says "choose your race," the
backing pick is a `Species` reference. The word "race" never
appears in code.

---

## The unified Linnaean tree

This is the boldest commitment in the design and worth thinking
hard about before any template lands. Real + fantasy together
forces an answer to: *where does fantasy species X branch from?*

Three placement strategies:

1. **Parallel kingdoms** — Animalia, Plantae, Fungi, Draconia,
   Magica, etc. Clean, but admits exactly the real-vs-fantasy
   divide the design is trying to erase. Pedagogically a step back —
   a student studying a magical creature is studying "the magic
   kingdom," not biology.
2. **Tucked into existing branches** — dragons as Reptilia
   variants, dwarves as Hominidae siblings to *Homo*. Biologically
   maximalist; the real biology curriculum carries through. But
   sometimes the squeeze is dishonest: a dragon's metabolism isn't
   really reptilian.
3. **Each fantasy clade gets its own deep branch high in Animalia**
   — dragons branch off Vertebrata before Reptilia, allowing them
   to share *some* anatomy with reptiles without inheriting all
   of it.

Working recommendation, phrased as defaults to argue with:

- **Option 2 for human-adjacent fantasy** — dwarves, elves, orcs,
  halflings, gnomes as sibling genera (or species) inside
  Hominidae. They share enough biology with humans that
  cross-species pedagogical content carries (Punnett squares for
  intra-species traits — eye color in elves, beard length in
  dwarves — read as straightforward genetics for any introductory
  classroom). This is the option that earns its weight
  pedagogically.
- **Option 3 for distant fantasy** — dragons, sea serpents,
  unicorns get their own deep branch in Animalia. They keep
  vertebrate basics (skeleton, organs, sex) but break free of
  reptile- or mammal-specific commitments. Lets us author wing
  anatomy without it being either "modified bat wing" or "modified
  pterosaur wing."
- **Option 1 only for the genuinely non-biological** — pure
  elementals, magical constructs, ghosts, AI. These don't go in
  Animalia at all. They go in `Construct` (see below) or get no
  species template (see "Other agent kinds").

The "tucked vs deep branch" choice is per-fantasy-species; not a
global setting. Working it out as authoring decisions, one species
at a time, is the right pace.

---

## OrganismMixin

The engine-side cut for "this is a member of the species tree."
Composes onto either `Agent` *(have)* (organisms with agency:
animals, humanoids, robots, golems, sentient creatures) or `Thing`
(organisms without agency: plants, fungi, sessile colonial animals,
corpses, unpowered statues). Crucially, **organism-status and
agency are orthogonal axes** — the mixin marks species-tree
membership, not engine animacy. See "Animacy and lifecycle
predicates" for how the two cuts interact.

Detached tissue (an apple, a leaf, a piece of meat) is **not** an
organism and does NOT compose `OrganismMixin` — see "Organism vs
detached tissue" below for the boundary and the canonical apple
example.

Note: "organism" is being stretched to its CS / sci-fi sense — a
discrete embodied entity in the unified species tree, biological
or synthetic. Constructs (Constructa kingdom) are organisms in
this engine sense, not in the strict biological sense. See
"Constructs in the species tree" for the rationale and the
`material`-vs-kingdom discriminator pattern.

Provisional surface:

- `getSpecies(): Species` — reference to the species template,
  resolved lazily via `StuffApi.singleton(path)` on each call.
- `getAge(): GameTime` — accumulated game-time age
- `getSex(): Sex | null` — delegates to `SexedMixin` if composed,
  otherwise `null` (asexual / undetermined / not modeled)
- `getLifecycleState(): string` — drawn from the species'
  declared valid set. The string type is intentional; predicates
  (`isAlive`, `isDead`, `isUndead`, `isPowered`, …) and the
  `isAnimate` cross-species predicate are how callers check.
  See "Animacy and lifecycle predicates" below.

Persistent state:
- `species` (path string referencing the species template;
  persists via custom `persistenceHandler`, mirror of
  `Containable.environment`)
- `age` (game-time accumulated)
- `lifecycleState` (string; valid set per species; initial
  value hydrated from the cloning template's `data`)

Composes into `Character` *(have)* before `MobileMixin` *(have)*
and after `NamedMixin` *(have)*; exact placement TBD when the
mixin lands but `OrganismMixin` should be deeper than mixins that
make species-aware decisions (e.g. a future `Wearable`-aware mixin).

### Non-agent organisms

Plants, fungi, sessile colonial animals (corals, sponges) and
similar never-was-an-agent organisms compose `OrganismMixin`
onto `Thing` (rather than `Agent`), and they carry full organism
state — species, age, lifecycle state, sex (for sexed plants like
dioecious trees) — but no agency mixins (`Mobile`, `Vocal`,
`Sensor`, `CommandGiver`).

This is the orthogonality payoff: `OrganismMixin` says "biology
applies"; the agency mixins say "agent surface applies." A live
houseplant has biology and no agency. A robot is also
`OrganismMixin` (in Constructa kingdom), agency on,
`lifecycleState: 'powered'`, with metal-flavoured Materials —
same mixin, different kingdom.

Concrete: a houseplant is `Thing + Named + Visible + OrganismMixin`,
species `/obj/species/plantae/.../spathiphyllum/wallisii`,
`lifecycleState: 'alive'`, with the species' bulk Material
(organic plant tissue). Future `Growing` / `Photosynthesizing`
mixins layer on if and when we want plants to develop over time.

**Important**: an organism's Thing-vs-Agent shape doesn't change
across lifecycle states. An organism that was always a Thing
(houseplant, mushroom) stays a Thing through `alive → dead`. An
organism that was always an Agent (NPC, player, animal) stays an
Agent through `alive → dead → undead`. Death does not transmute
Agent into Thing — the corpse of an NPC is the same NPC Agent
with `lifecycleState: 'dead'` and agency mixins inert (because
animacy is gated on lifecycle state). See "Death and resurrection"
below for the full choreography.

### Organism vs detached tissue

An *organism* is an autonomous biological unit (a tree, a frog,
a fungus colony, a player). A part of an organism — fruit, a
leaf, a piece of meat, a bone, hair, a feather — is **not** an
organism in its own right; it's biological tissue with an organic
Material. Tissue items don't compose `OrganismMixin`; they're
ordinary `Tangible` Things whose Material happens to live in the
organic subtree (`/domain/material/organic/...`). Diet, toxicity,
edibility, decay-of-loose-tissue all read from the Material — no
species or lifecycle state on the tissue itself.

An apple is the canonical case: the apple is a fruit body
detached from the apple tree. The tree is the organism (`Thing +
OrganismMixin`, species `Malus domestica`, `lifecycleState:
'alive'` while it lives, eventually `dead` once it dies). The
apple is a `Thing + Named + Visible + Edible + Portable +
Tangible` with `material:
'/domain/material/organic/tissue/fruit-flesh'` (or whatever the
authored path lands at) — no species, no lifecycle state, no
OrganismMixin. Same shape applies to a leaf, a piece of meat, a
chunk of bone, a feather.

The line is pragmatic: anything authored to be picked up,
carried, eaten, burned, or otherwise treated as bulk material
goes the tissue route. Anything authored to grow, age, breed,
die, or otherwise *do biology* goes the organism route. A potted
plant is an organism (it grows, photosynthesises, can die). The
fruit it produces is tissue.

Edge cases (resolved by authoring decision, not architecture):

- **Seeds** — dormant embryonic plants. Treat as tissue in v1
  (organic material with viability flags) until germination
  mechanics give us a reason to model the dormant-organism case.
- **Eggs** — same. Unfertilised egg is tissue / food. Fertile
  eggs that *hatch* via gameplay would need OrganismMixin and a
  `'embryonic'` lifecycle state, but that's deferred until
  hatching mechanics arrive.
- **Cut flowers** — tissue. Once detached, it's dying plant
  matter, not an organism.
- **Whole-plant vegetables (carrot, potato)** — author's call,
  but the simple read is "tissue" once harvested. The organism
  was the growing carrot in the field.

### Death and resurrection

> **NOT v1 scope** — the death/resurrection *flow* (combat-driven
> transitions, ghost spawn, connection handoff, decay machinery)
> is deferred to a follow-on build. The state machine
> (`alive`/`dead`/`undead`) and predicates ship in v1; the
> choreography below is design context for the follow-on. v1's
> NPC and avatar templates ship with `lifecycleState: 'alive'`
> in their `data` and stay there — there's no v1 mechanism that
> transitions them.

Same-object lifecycle transitions for everyone — NPCs, avatars,
plants. The corpse is not a separate object; it's the original
organism in `dead` state. Avatars add a connection-transfer
wrinkle, because a player needs an animate body to drive.

#### NPCs and other Agents

Straightforward state transition:

1. NPC takes fatal damage → `lifecycleState` transitions
   `alive → dead`. Persistence flushes (normal save).
2. The Agent persists in the world. Other characters see "the
   corpse of the orc" — same Agent, agency mixins inert because
   `isAnimate` returns false for `dead` state.
3. The corpse manages its own decay via events (timers, scheduled
   transitions). No central manager. As long as something holds
   the reference (loot pile, butcher's workbench, the area
   itself), the engine doesn't reclaim it.
4. Eventually decay completes — either fully decomposed (Agent
   destructs, leaving bones / remnants as separate Things if
   content authored that), or scavenged by another mechanic, or
   cleaned up.
5. Reanimation by a necromancer: `dead → undead`. Same Agent,
   agency mixins now active because `undead` is animate.

#### Avatars

Same skeleton, plus connection handoff:

1. Avatar takes fatal damage → `lifecycleState` transitions
   `alive → dead`. Persistence flushes.
2. **Spawn a ghost**: a new Agent cloned from the avatar's
   shape, instantiated with `lifecycleState: 'undead'`. The ghost
   is a **separate instance**, not the dead avatar with a
   different state — they coexist.
3. **Bidirectional identity link**: `avatar.currentGhost = ghost`,
   `ghost.originalAvatar = avatar`. The link survives both
   directions of the round trip.
4. **Connection transfer**: the player's connection(s) hand off
   from the dead avatar to the ghost via the existing connection
   handoff machinery (see [connection.md](./subsystems/connection.md)).
5. Dead avatar persists in the world (the corpse). The ghost
   walks around playing as a ghost.
6. Resurrection trigger fires →
   - Ghost flushes its persistent state.
   - Connection transfers from ghost back to the dead avatar.
   - Avatar's `lifecycleState` transitions `dead → alive`.
   - Avatar reloads from persistent state.
   - Ghost destructs (its identity link clears, the avatar's
     `currentGhost` clears).

#### What carries over

The persistence rule already in the framework is the rule for
death and resurrection too: **persistent fields survive,
transient fields don't — same as logout/login**. There's no
special death-time filter, no per-mixin opt-in.

Applied:

- Avatar dies → ghost spawns. Ghost gets the avatar's persistent
  state cloned in (settings, aliases, MQL pronoun memory if
  persistent). Transient state (combat target, prompt stack,
  current parse) is fresh on the ghost — same as if the player
  had logged out and back in.
- Ghost flushes on resurrection. Avatar reloads on resurrection.
  Persistent fields the ghost mutated (a new alias, a settings
  change) survive only if they live on the avatar's persisted
  shape — typically they don't, because the ghost is a separate
  instance writing to its own persistence path. Loss of
  ghost-side mutations is the cost the player accepts; persistence
  framework around-save hooks can carve exceptions if specific
  fields should propagate ghost → avatar at res time.

The mental model for players: "what survives death/res is what
survives logout/login." They already know that contract.

#### Decay management

No central manager. The corpse drives its own decay state
machine via events / scheduling. For non-avatar corpses, decay
eventually leads to destruction (Agent destructs once decay
completes). For avatar corpses, decay can't lead to destruction
(persistence rule: avatars are only destructed at logout, never
mid-session, because resurrection might still happen).

For "decayed but undestructable" avatars: the avatar removes
itself from its environment (unset location). It still exists in
the engine, still holds its references, but it's not in the
world — invisible, unlootable. On resurrection it's placed back
at a designated point. On logout it gets destructed via the
normal logout path.

This avoids inventing a central corpse manager — the body knows
its own decay rules; references hold the avatar in memory; the
"no environment" trick handles the visibility cleanup. It's
distinct from the roadmap's idle-eviction story
([roadmap.md](./roadmap.md) §"Idle eviction for Stuff lifecycle")
which would actually destruct — the two coexist as long as
idle-eviction has explicit "do not evict" pinning for dormant
avatars.

#### Body destruction = perma-death candidate

If something destroys the dead avatar (cremation, lava, magical
disintegration removing the reference path), resurrection becomes
impossible. Either content treats this as perma-death (the player
remains a ghost permanently, possibly with the ghost being
"promoted" to be the new persistent avatar), or there's a content
fallback. Engine-level: this is content/game-rules territory; the
engine just exposes the destruction event.

---

## Species as Idea-shaped templates

Engineering details, where the design meets the existing
template subsystem ([templates.md](./subsystems/templates.md)).

### Path scheme

`/obj/species/animalia/chordata/...`. The roadmap blurb originally
proposed `/domain/species/`, but `/domain/` is reserved for content
managed by group membership — rooms, items, NPCs authored within
a particular domain. Species (and body plans, and construct
templates) are **infrastructure**: they ship with the engine, they
don't belong to any one domain, and they're referenced from every
domain. `/obj/` is the right home.

Hierarchical depth (5–7 levels: kingdom → phylum → class → order →
family → genus → species) is fine under `/obj/` — the existing
path validator permits arbitrary depth past the prefix.

Same logic flows to body plans (`/obj/body-plans/...`). Constructs
are themselves species (Constructa kingdom under `/obj/species/`),
not a parallel tree.

### Per-species template fields

Provisional shape — every species template carries:

- **Taxonomic identity** — binomial (`'Homo sapiens'`), common
  names, parent path
- **Body plan** — reference to a body plan (see below). Drives slot
  taxonomy.
- **Lifecycle states** — the species' valid set
  (`alive/dead/undead` for organics, `powered/unpowered/destroyed`
  for constructs, etc.). See "Animacy and lifecycle predicates."
- **Sex-determination system** — see Sexed/Gendered below. May be
  `none` for asexual / agamic / construct species.
- **Reproductive mode** — `sexual / parthenogenetic / asexual /
  hermaphroditic-self / manufactured / spawned / none`. Independent
  of sex-determination. See Sexed/Gendered.
- **Consumption** — for organics, diet (`carnivore / herbivore /
  omnivore / detritivore / autotroph`) plus a toxicity table; for
  constructs, fuel type plus a compatibility table. See
  "Consumption (food / fuel)" in the Construct section.
- **Lifespan band** — typical min/max age in game-time units
- **Size band** — default mass / volume range (an individual
  varies within it)
- **Climate/habitat band** — informative for environment-driven
  effects later
- **Circadian band** — `'diurnal' | 'nocturnal' | 'crepuscular' |
  'cathemeral' | 'aperiodic'`. Constructs and microbes typically
  `aperiodic`.

The list grows. Worth being explicit about what's required for a
species template to validate vs. what's optional metadata. Defer
that schema until the first 3–4 templates are written.

---

## Body plans

Body plan is a property of *species*, not of the individual
organism. (An individual organism inherits its species' body plan;
modifications — an amputee, a winged variant — are per-individual
state.)

A body plan declares:

- **Worn slots** — head, torso, finger × 10 (humans), wing × 2
  (dragons), tentacle × 8 (octopuses), …
- **Held slots** — prehensile appendages and how many. Humans: 2
  hands. Octopuses: 8 tentacles. Dragons: 4 (forelimb claws + maw,
  with maw being a "weird hand" for `Wieldable`). Snakes: 0.
- **Locomotion modes** — walk, fly, swim, burrow, crawl, climb. The
  set determines which `Climbable`/`Swimmable`/`Flyable` traversal
  modes the organism can use (see
  [mixin-slate.md](./mixin-slate.md) §"Climbable & locomotion
  modes").
- **Sensory ports** — anatomy only: count, position, and modality
  (`{ eyes: 2, frontal }`, `{ ears: 2, lateral }`, `{ nose: 1 }`).
  *Capability* (visual range, low-light sensitivity, scent acuity)
  does NOT live on the body plan — see "Anatomy vs capability"
  below.

### Anatomy vs capability

Body plan declares the *physical layout* of sensory apparatus —
the count, position, and modality of each port. Capability (how
well a port performs) lives on the **species** template, not the
body plan, and feeds the perception subsystem through
`Perception`'s existing seams (`getVisionProfile`, future
`getHearingProfile`, etc.).

Concretely: humans, dwarves, elves, orcs, halflings all share
the `biped` body plan (same anatomy: two frontal eyes, two
lateral ears, one nose). Their species templates differ on
per-modality capability — a dwarf's `visionProfile` shifts
toward scotopic; a human's stays photopic-default. Hooked into
perception by a species-reading shadow on the organism that
intercepts `getVisionProfile()` and returns the species' value.

This keeps body plans truly canonical (no `biped-low-light`
variants per fantasy-species sensory quirk) and pushes
capability variance to the species template, where it belongs
alongside lifespan, size, and circadian. Same shape per modality
when sound, scent, etc. land in `Perception`.

Body plan is the answer to mixin-slate's "no global slot enum"
constraint. `Wearable`'s allowable slots are pulled from the
wearer's species' body plan, not from a global enum. An `Equippable`
ring fits a species with finger slots (and only as many rings as
fingers); it doesn't fit a snake regardless.

### Body plans are standalone templates

Body plans live as standalone `Idea`-shaped templates
(`/obj/body-plans/biped`, `/obj/body-plans/quadruped`,
`/obj/body-plans/quadruped-winged`, `/obj/body-plans/serpentine`,
`/obj/body-plans/sessile`, …) referenced by species. **Not**
inline on the species template.

`sessile` is the stand-in for organisms with no agency anatomy
to declare — a houseplant, a mushroom, a coral. Zero worn slots,
zero held slots, zero locomotion modes, zero sensory ports.
Default plants reference it so code that reads `species.bodyPlan`
never null-checks. A weird plant with agency (Audrey II from
*Little Shop of Horrors* — vines as held slots, a mouth-with-
teeth as a sensory port, no locomotion because it's potted)
authors its own body plan; the orthogonality of organism-vs-
agency means agency mixins compose freely on top.

Two reasons, the second of which is the load-bearing one:

1. **Authoring deduplication.** Many species share a body plan
   exactly — dwarves, elves, humans, orcs, halflings all `biped`.
   Centralizing the canonical biped means one place to evolve it.
2. **Player experience: a small canonical set.** The number of
   body plans is intentionally bounded. Players learn how
   equipment fit / locomotion / animation work *per body plan*,
   not per species. New species inherit those affordances; the
   cognitive load doesn't grow with the species count. A
   third-party content mod that adds a "froglike" species composes
   onto the existing quadruped or serpentine plan rather than
   inventing a new one for which no clothing fits.

Tax: a new fantasy species with a genuinely novel body topology
(centaur, sphinx, octopod humanoid) requires a new body-plan
template. That's the right pace — one body plan deserves one
authoring conversation, and the conversation forces explicit
choices about slots / locomotion / animations.

Per-individual variations (an amputee, a one-eyed pirate) live as
overrides on the individual organism, not as new body plans. The
body plan is the species' *typical* shape; reality varies and
the engine accepts that without forking templates.

---

## Material subsystem

`material` isn't an organism-only concept — it applies to the entire
range of physical Stuff (Thing, Location, Vessel, Agent), is finite
and curated rather than developer-customisable, and is the natural
substrate the organism subsystem reaches for when describing
tissues. Designing it once, in a way that organisms can lean on
without special-casing, is cheaper than letting the organism
subsystem invent its own tissue type tree.

### v1 scope

v1 ships only **bulk Material on Tangible Stuff**. Per-Detail
material authoring (tissues as `Detail`s, the resolver walking
Details, the body-plan-detail tree, surgery / dismemberment /
organ-targeted poisons) is **deferred to v2** — we'll revisit
when concrete content earns it. So:

- The `Material` template tree, `TangibleMixin`, and bulk
  `Tangible.material` are in v1.
- `MaterialApi.materialOf(stuff)` ships, but only the bulk
  fallback. No `detailKey` parameter, no Detail walk.
- `Detail.material` slot is **NOT** added to `Detail` in v1.
- The "Composition through Detail" / "Detail material on
  non-Tangible Stuff" subsections below describe the eventual
  v2 shape; v1 doesn't implement them.
- The diet check (`DietApi.canEat`) reads the food's bulk
  Material only. Composite-food walks (chocolate-coated
  cherry) are a v2 use case once Detail-material lands.

### Material as an Idea-shaped template

A `Material` is a singleton-loaded `Idea` subclass living in a
Linnaean-shaped tree under `/domain/material/`:

```
/domain/material/mineral/metal/ferrous/iron
/domain/material/mineral/metal/ferrous/steel
/domain/material/mineral/metal/non-ferrous/copper
/domain/material/mineral/stone/granite
/domain/material/organic/wood/oak
/domain/material/organic/tissue/flesh
/domain/material/organic/tissue/bone
/domain/material/organic/tissue/keratin
/domain/material/organic/tissue/cardiac-muscle
```

Materials carry the cross-cutting physical properties as fields:

- `density` — drives weight (`mass = volume × density`)
- `hardness` — gating for tools and weapons
- `flammability` — ignition / burn behaviour when fire mechanics arrive
- `opacity` — visibility through the substance (glass / fog / wood)
- `thermalConductivity`, `electricalConductivity` — temperature /
  current transfer when those subsystems land
- `magneticSusceptibility` — magnetism
- `edibility`, `nutrients`, `toxicity` — diet / poison interactions
- `damageResistance` — typed-damage interactions
  (silver vs lycanthrope, holy vs undead, vorpal vs anything)

Linnaean grouping pays for itself the moment MQL wants "things made
of metal" or "tissues that conduct electricity" — subtree queries
fall out for free, the same shape `species` and `zone` already use.

### The `TangibleMixin`

A new mixin, `TangibleMixin` (interface `Tangible`), composed on the
four physical top-level branches (`Thing`, `Location`, `Vessel`,
`Agent`). Adds a single field:

```ts
interface Tangible {
  getMaterial(): Material | null;
  setMaterial(value: Material | null): void;
}
```

`Idea`, `Shadow`, and `Persistable` deliberately don't compose
`Tangible` — they're abstract or out-of-world.

The mixin is a natural home for a future `mass` / `volume` pair
(computed lazily from `material.density × volume`) once size
modelling lands; v1 ships only the `material` slot.

The interface is named `Tangible` rather than `Material` because
the value-class is already `Material`. "Tangible thing" reads well
and the semantic — *this Stuff has substance* — is sharper than
*this Stuff has-a material*.

### Composition through `Detail`, not parallel slots

Saxonberg already addresses sub-aspects of multifaceted Stuff via
`Detailed` ("the hilt of the sword," "the ceiling of the room,"
"your liver"). That's the right faultline for material composition
too — players already say `look at hilt`; we don't need a parallel
materials-vocabulary.

So: the `Detail` value object gains an optional `material: Material |
null` field directly (same place its keywords / descriptions live),
and a resolver — `MaterialApi.materialOf(stuff, detailKey?)` —
handles the lookup:

- `detailKey` in hand → `detail.material ?? stuff.material`
- no detail → `stuff.material` for the bulk answer
- aggregate query → walk every detail when a caller wants the full
  bill of materials

Damage / fire / cut interactions resolve through the same detail
seam they already use. Combat that lands a hit on a body part
queries `materialOf(creature, 'liver')`. Fire that ignites a
specific roof part queries `materialOf(building, 'thatch-roof')`.
A blade that snaps queries `materialOf(sword, 'blade')`. No new
mechanics for authors to learn.

### Detail material on non-Tangible Stuff

The asymmetry: `Detail` is universal description structure, so
*every* Detailed Stuff carries a material slot per detail —
including ones whose host doesn't compose `Tangible`. This is
intentional. The resolver:

```ts
materialOf(stuff, detailKey?): Material | null {
  if (detailKey && isDetailed(stuff)) {
    const detail = stuff.getDetail(detailKey);
    if (detail?.material) return detail.material;
  }
  if (isTangible(stuff)) return stuff.getMaterial();
  return null;
}
```

`Detail.material` stays authoritative whenever a detail is in hand;
only the bulk fallback requires `Tangible`. That gives "addressable
sub-aspects with substance even when the bulk doesn't": a ghost
manifesting a silver-chain detail, an illusion with a few tangible
parts, a sky-realm Location with a substantial fountain authored
in otherwise-abstract space. Permissive — there's no compile-time
stop on `material: 'iron'` on a detail of a non-Tangible Stuff —
but blocking it would also block the legitimate weird cases. A
lint-time validator can flag the merely-suspicious if it ever
turns into a footgun.

### What this buys the organism subsystem

Tissues *are* details. Heart, liver, skin, bone, cardiac-muscle —
each an authored `Detail` on the species' body plan, each with its
own `Material` from the organic-tissue subtree. The species'
**default** material (the bulk answer for "what is this organism
made of") is the species-level `Tangible.material`, typically
`'flesh'` or whatever the species's primary tissue is; per-detail
overrides supply the rest.

This means the race subsystem doesn't need a separate
tissue-composition map; it reuses two systems organisms benefit
from anyway (Detailed for addressing, Material for substance).
Surgery, dismemberment, organ-targeted poisons, tissue-specific
diseases — all of these resolve through `materialOf(creature,
'liver')` and friends, sharing a single resolver with the
non-organic side of the world (cut a sword's blade, fire a
building's thatch roof).

### Persistence

`Tangible.material` is a `Stuff` cross-reference, not a
generic-hydratable field — so it follows the
`Containable.environment` precedent: NOT in `persistentFields`,
serialized via a custom `persistenceHandler` on the composing
class that records the material's templatePath and resolves
against `StuffApi.singleton(path)` at load. Same machinery as
`zone` and the (eventual) `species` reference; one pattern
covers the lot.

Detail materials persist with their owning Detail (which already
has a persistence story), recorded as a templatePath the
detail's hydrator resolves at load.

### Composite ≠ a separate mixin axis

There is no `CompositeMaterialMixin` or `MultiMaterialMixin`.
Composition emerges from how the Stuff is detailed, not from a
parallel mixin shape. A Detailed Tangible thing is a composite
*by capacity*; whether it's authored as single-material or
multi-material is an authoring decision, not a typing decision.
You can't statically narrow "single-material thing" vs "composite
thing" by mixin shape alone — both are `Tangible`, and the right
answer is to ask the resolver.

The tradeoff: composition is only as fine-grained as detail
authoring. A room with no authored ceiling / floor / walls details
is single-material until someone takes the time to detail it. But
that's the same constraint the description system already lives
with, so authors learn one rule, not two.

---

## Sexed vs Gendered

Two parallel mixins. The split is the design's clearest pedagogical
move — it forces the distinction between biological sex and social
gender into the data model where it actually belongs, instead of
pretending they're one axis.

| Concern | Mixin | What it carries | Authoring layer |
|---|---|---|---|
| Pronouns / social identity | `Gendered` *(have)* | `pronouns: He / She / They / It` | Per individual at character creation |
| Biological sex | `Sexed` (new) | `sex` from species' sex-determination system | Per individual; valid set comes from species |

A character with `Gendered` but no `Sexed` is a sentient being with
a social presentation but no biological commitment — fine for AI,
ghosts, asexual species, characters who decline to specify.

A character with `Sexed` but no `Gendered` is biology-only — useful
for animals where pronouns aren't a UX concern (a pet rabbit
needs sex for breeding mechanics but doesn't need a pronoun set
beyond "it").

Most player characters compose both.

### Two axes: sex-determination and reproductive mode

A species template carries two related-but-distinct fields. Pulling
them apart matters because they don't always co-vary — a
parthenogenetic lizard has a biological sex (female) but
reproduction doesn't require a partner; bacteria have neither.

#### Sex-determination system

For species that *have* biological sex, how the sex of an
individual is assigned. SexedMixin reads the valid sex set from
this field.

| System | Examples | `Sexed.sex` valid set |
|---|---|---|
| `xy` | Most mammals incl. humans | `male / female` |
| `zw` | Birds, some reptiles, some fish | `male / female` (mechanism differs; public values match) |
| `environmental` | Some reptiles (egg temperature) | `male / female`, set at hatch |
| `haplodiploid` | Bees, ants, wasps | `male / female / queen` |
| `hermaphroditic-simultaneous` | Most snails | `hermaphrodite` only |
| `hermaphroditic-sequential` | Some fish (clownfish) | `male / female`, can change at runtime |
| `dioecious` | Holly, kiwifruit (separate male / female plants) | `male / female` |
| `monoecious` | Many flowering plants (both reproductive structures on one organism) | `monoecious` only |
| `none` | Bacteria, asexual reproducers, constructs | — (`SexedMixin` not composed) |

For fantasy species, the species author picks a system. Dragons:
authoring choice — `xy` by default reads as "dragons are
vertebrates"; something more exotic is also fine.

#### Reproductive mode

How offspring get created. Independent of sex-determination —
sexual species can be hermaphroditic; sexed species can reproduce
parthenogenetically.

| Mode | Examples | Offspring source |
|---|---|---|
| `sexual` | Most animals, most plants | Two parents; gametes fuse |
| `parthenogenetic` | Some lizards, aphids, some sharks | One parent (typically female); offspring genetically near-identical to parent |
| `asexual` | Bacteria, fungi, hydras (budding) | One parent; offspring genetically identical |
| `hermaphroditic-self` | Some plants, some snails | One organism, self-fertilizing |
| `manufactured` | Constructa species | Built / assembled / cast — no reproduction proper |
| `spawned` | Magical fantasy entities | Just appear — no parent semantics |
| `none` | Sterile species, ageless beings | Don't reproduce at all |

The `breed` / `mate` / `bud` / `manufacture` command (whenever
those land) reads reproductive mode from the species and dispatches
accordingly. `DietApi`-style: species template carries the data,
an Api dispatches the predicate.

#### Mitosis vs meiosis: not at this layer

Cell-level mechanisms (mitosis, meiosis, binary fission, gamete
fusion) sit *below* the engine. The species/organism layer cares
about outcomes — "produced an offspring with these traits" — not
about which cellular machinery got there. Mitosis vs meiosis is a
genetics-layer concern, and even there it's pedagogical content
(prose, illustrations, MQL-queryable facts about a species) rather
than runtime simulation. Saxonberg never models cells.

#### Pedagogical fit

Both tables are intentionally a half-step from the biology
textbook — real undergraduate biology talks about exactly these
systems and modes, in roughly this vocabulary. A student who knows
what ZW means or what parthenogenesis is already knows what
Saxonberg means by them. The rough edges (separating mode from
system; folding monoecious-vs-dioecious where they belong) follow
how those concepts are actually taught.

---

## Animacy and lifecycle predicates

Three different through-lines that early drafts conflated. Worth
pulling apart because the names are load-bearing and get cited
from sibling subsystems. Under the unified-tree design (constructs
as a kingdom in the species tree), the lifecycle axis runs over a
*per-species state machine* rather than a fixed enum.

### Three axes

| Axis | Question | Answer source | Scope |
|---|---|---|---|
| **Organism membership** | Is this thing a member of the species tree at all? | `MixinApi.isOrganism(o)` | All Stuff |
| **Kingdom flavor** | If yes, what kingdom? Animalia / Plantae / Constructa / …? | `SpeciesApi.getKingdom(o)` (or material as the pragmatic shorthand) | Organism-only |
| **Lifecycle state** | What state is the organism in? Drawn from its species' valid set. | `OrganismMixin.getLifecycleState()` | Organism-only |
| **Animacy** | Is this agent currently functioning / has agency right now? | Cross-everything predicate, agent-only | Agent-only |

### Lifecycle state (per-species)

The species template names the valid states. There is no global
enum. Predicates are defined over states the species recognizes
and return `false` for organisms whose species doesn't model that
state.

Common states (kingdom defaults — overridable per species):

| State | Kingdoms where typical | Meaning |
|---|---|---|
| `alive` | Animalia, Plantae, Fungi | biologically functioning |
| `dead` | Animalia, Plantae, Fungi | biology ceased, not reanimated |
| `undead` | Animalia (incl. fantasy humanoids) | was alive, body reanimated by non-biological force |
| `powered` | Constructa | functioning under fuel/power |
| `unpowered` | Constructa | fuel/power exhausted, recoverable |
| `destroyed` | Constructa | physical integrity gone, not recoverable |

Stock predicates:

- `isAlive(o)` — true iff `lifecycleState === 'alive'`. False for
  organisms whose species lacks `alive` (constructs).
- `isDead(o)` — true iff `lifecycleState === 'dead'`.
- `isUndead(o)` — true iff `lifecycleState === 'undead'`. **Strict
  reading**: organism-only and species-state-only. Ghosts are not
  undead (they're not organisms); skeletal-warrior constructs are
  not undead (their species lifecycle uses `destroyed` /
  `unpowered`, not `undead`). The folkloric grouping ("anything
  that reads as undead in fiction") is a flavor tag concern, not
  an engine predicate.
- `isPowered(o)` — true iff `lifecycleState === 'powered'`.
- `isDestroyed(o)` — true iff `lifecycleState === 'destroyed'`.

Predicates that span multiple states are derived (`isFunctional`,
`isAnimate` — see below).

### Animacy (cross-species)

The "is this agent currently functioning" predicate. Bridges the
per-species state machines and gives game logic a single answer to
"can this thing act right now?"

| Composition | Animate when | Not-animate when |
|---|---|---|
| Organism + Agent (Animalia, e.g. player, NPC animal) | `lifecycleState ∈ { alive, undead }` | `dead` |
| Organism + Agent (Constructa, e.g. robot, golem) | `lifecycleState === 'powered'` | `unpowered`, `destroyed` |
| Organism without Agent (plant, fungus, plant-corpse) | never (no agency surface) | always |
| Agent without Organism (ghost, sentient weather) | "manifest" / TBD per agent type | TBD |
| Tangible tissue (apple, meat, leaf) | n/a — not an organism | n/a |

Note `undead` is animate — the zombie walks. This is the
predicate's whole point: "alive" doesn't capture it.

Naming the predicate is open — `isAnimate` is the working pick
(engineering-clean, doesn't presuppose biology). `isLiving` reads
better in English but lies for powered robots; `isFunctional` /
`isActive` lose the in-fiction read.

### Ghost vs zombie

The classic distinction. Both are post-death; both commonly called
"undead" in fiction. They cleave along the *body* axis:

- **Zombie** — the original corporeal body, reanimated. Same
  Organism. `lifecycleState: 'undead'` on a species in Animalia.
- **Ghost** — spirit/consciousness released from the body, manifest
  as an incorporeal agent. **Not** the same object as the original
  organism. The original organism is dead (or its corpse is a
  separate Thing); the ghost is a new agent that may carry an
  identity-link back to the deceased.

Working position: ghosts live outside the species tree (Agent
without OrganismMixin); zombies live in the tree (Organism with
`lifecycleState: 'undead'`). Both can be flavored as "undead" in
prose without breaking the engine distinction.

---

## Constructs in the species tree

Robots, golems, animated statues, sentient AI-with-bodies all live
in the species tree under a non-biological kingdom — working name
**Constructa**. Same data type (`Species`), same mixin
(`OrganismMixin`), same body plans, same persistence machinery as
biological species. The unified Linnaean tree is the unified
*organism* tree; "organism" is being stretched to its CS / sci-fi
sense (a discrete embodied entity), losing the word's strict
biological reading. Worth it for the simplification.

The tree gets a top-level branch parallel to Animalia / Plantae /
Fungi:

```
/obj/species/constructa/metallica/...     (metal-bodied)
                       /stoneborn/...     (golems, statues)
                       /silicate/...      (silicon AI)
                       ...
```

Sub-tree organization is an authoring decision — by material,
by manufactured-vs-conjured, by era. Whatever serves curricula
and content best.

### Organism vs construct flavor

In the unified design, "is this a construct?" is not a structural
engine question — they're all `OrganismMixin`. The distinction is
*flavor*, surfaced two ways:

1. **Authoritative**: walk the species' kingdom path. Anything
   under `/obj/species/constructa/...` is a construct. Available
   via `SpeciesApi.getKingdom(o)` /
   `SpeciesApi.isInKingdom(o, 'Constructa')` (or whatever the
   species API ends up named).
2. **Pragmatic**: read the Material via
   `MaterialApi.materialOf(stuff)`. Constructs typically resolve
   under `/domain/material/mineral/...` (metals, stones,
   crystals); organics resolve under `/domain/material/organic/...`.
   This is the right signal for content code that just wants
   "does this rot? does it burn? does it conduct?" — read the
   Material, not the kingdom.

The two normally agree. **Frankenstein-style edge cases** are
the test: an organic-tissue construct, a silicate-skinned
organism. When Material and kingdom disagree, **kingdom wins for
identity** ("what is this?"), **Material wins for behavior
queries** ("does it rot?"). Behavior logic has to read the
Material anyway — it never had a clean shortcut from kingdom
alone, and the edge cases just make the existing split visible.

### Lifecycle states are per-species

Each species template names its valid lifecycle states. The
species' kingdom typically dictates a default set; species can
override (e.g. an undead-by-default species in Animalia, or a
self-repairing construct that adds a `damaged` state).

| Kingdom (default) | Lifecycle states |
|---|---|
| Animalia (incl. Hominidae fantasy) | `alive` / `dead` / `undead` |
| Plantae, Fungi | `alive` / `dead` |
| Constructa | `powered` / `unpowered` / `destroyed` |

The `OrganismMixin` carries `lifecycleState: string` typed
against whatever set the species declares. See "Animacy and
lifecycle predicates" for how cross-species predicates work over
this.

### Consumption (food / fuel)

`DietApi` generalizes from "what does this eat" to "what does
this consume." Organic species declare a diet (herbivore /
carnivore / omnivore / detritivore / autotroph) and a toxicity
table; construct species declare a fuel type (electrical, steam,
magical essence, …) and a compatibility table.

The predicate shape is the same:
```
DietApi.canConsume(consumer: Organism, consumable: Edible | Fuel)
  → ConsumeResult
```

What changes is the vocabulary. The Edible mixin grows a `Fuel`
counterpart for non-food consumables (or absorbs fuel as another
consumable kind — bikeshed for later).

### Where incorporeal agents live

Outside the species tree. A ghost, sentient weather, raw AI
without a body — these are `Agent` *(have)* without
`OrganismMixin`. No species, no body plan, no material. The
"Agent-without-species" escape hatch is preserved; formlessness
gets to be the absence of a body, not its own kingdom.

---

## Diet, edibility, toxicity

> **NOT v1 scope** — `DietApi`, `Edible`, `Portable`, and the
> diet content (apple, meat, chocolate bar, cat) all defer to a
> follow-on build. v1 ships `Material.toxicity` tags as data
> (no consumer), bulk Material on Tangible Stuff (no eating
> mechanic). The section below is design context for the
> follow-on.

The pieces:

- The `Edible` mixin (on [mixin-slate.md](./mixin-slate.md)'s first
  wave) marks an item as nutritionally consumable.
- An eater's diet comes from species (`carnivore` / `herbivore` /
  `omnivore` / etc.).
- Toxicity / nutrient information lives on the Material, not on
  the food item. `Material.toxicity` is a tag set listing the
  species (or species-tree subtrees) the material harms;
  `Material.nutrients` is the nutritional profile. Real biology:
  chocolate-flavoured Material carries `toxicity: ['canidae']`,
  lily Material carries `toxicity: ['felidae']`, xylitol carries
  `toxicity: ['canidae']`.
- Fantasy material toxicity rides the same tag (cold iron with
  `toxicity: ['fey']`, silver with `toxicity: ['lycanthrope']`) —
  classic genre tropes that also happen to read as biological
  host-range rules.

The check, conceptually:
```
DietApi.canEat(eater: Organism, food: Edible & Thing): EatResult
  → 'nutritious' | 'tolerated' | 'toxic-mild' | 'toxic-severe' | 'inedible'
```

`DietApi` is a small static utility that consults the eater's
species' diet against the food's bulk Material (resolved via
`MaterialApi.materialOf(food)`) and runs the eater's species
through the Material's toxicity tags. Lives at `api/diet.ts`. Note
the food item itself is just a Tangible Edible Thing — no species
reference, no organism status; an apple is fruit-flesh tissue and
that's all the diet check needs.

For composite foods (a stew, a sandwich) the check walks the
food's `Detail`s for per-detail Materials and aggregates — a
chocolate-coated cherry has the chocolate detail (toxic to
canids) and the cherry-flesh detail (fine), and the per-detail
walk catches the relevant interaction.

This is a good place to reach pedagogical depth without much
implementation cost — the toxicity tags are Material content, the
predicate is one function.

---

## Sleep, circadian, rest

Roadmap notes `Sleeping` / `Resting` are species-shaped. Concrete:

- Species template carries a circadian band
- A `Sleeping` mixin (deferred — see mixin-slate "Out for now" and
  this slate's build order) reads the band when computing whether
  the avatar is naturally tired
- Same authoring model for fantasy: dragons might be cathemeral
  (active anytime), undead nocturnal, etc.
- Constructs use `Recharging` instead — driven by
  `Powered`/`battery-low` events, not circadian rhythm

Nothing to commit to until the tick / scheduling story lands. Just
making sure the species template has the slot ready.

---

## Per-individual variation

Variation *within* a species — one dwarf vs another, by eye
color, hair color, beard style, scars, build — is **not** a
"trait" concept and not a property bag. It's **mixin
composition**: each varied feature is its own mixin (`Eyed`,
`Haired`, `Bearded`, `Sized`, `Scarred`, …), composed where
applicable, holding the value as persistent state, hydrated
from the template's `data` like any other mixin field.

Concretely:

- A dwarf NPC at `/domain/.../grunk` composes `OrganismMixin +
  Eyed + Haired + Bearded` (or whichever variation mixins
  apply). Its `data` carries `eyeColor: 'brown'`, `hairColor:
  'red'`, `beardLength: 'long'`, and the standard hydrator
  copies values onto the mixin's fields.
- A houseplant composes `OrganismMixin` (Plantae) plus
  whatever feature mixins make sense for plants (`Foliated`,
  `Barked`, …). No `Eyed`, no `Haired`. Composition rules out
  features that don't apply.
- A robot composes `Eyed` if "eyes" is the right vocabulary for
  its sensors; otherwise picks a different feature mixin or
  just sets `Visible.long` directly. Authoring decision per
  content.
- A plant composing `Eyed` is an authoring error, not an
  engine concern. A lint pass could flag suspicious
  compositions later if it becomes a footgun.

`Visible`'s description fallback is what knits the composition
into prose. When `Visible.long` is unset, the rendering walks
the host's composition — each variation-bearing mixin
contributes its piece; species supplies baseline (build,
posture, default stature). Implementer of the algorithm decides
how clever to make it; the engine provides the seams.

### What this means

- **No species-side trait schema.** Composition is the schema.
  An organism either composes `Eyed` (and therefore has
  eye-color state) or it doesn't.
- **No property bag** of arbitrary trait names. Each varied
  feature is a typed field on a typed mixin.
- **No clone-time stochastic sampling.** Authored values come
  from the template's `data`. A village of N varied dwarves is
  N templates with varied data — or a clone-time helper that
  populates from a list / distribution. That's authoring
  scaffolding, not engine concern.
- **No "trait" concept in v1.** Per-feature mixins (`Eyed`,
  `Haired`, etc.) are added to [mixin-slate.md](./mixin-slate.md)
  as content motivates them. v1 ships none of them — sample
  compositions rely on hand-authored `Visible.short` /
  `Visible.long` text per individual.

Cross-generation inheritance — when feature values propagate
from parents to offspring at breeding — is a genetics concern
(see below), deferred entirely.

---

## Genetics — deferred entirely

Honest framing: the roadmap names genetics as in-bounds, but
full Mendelian / polygenic / sex-linked genetics is a large
sub-subsystem on top of organism + species, and we don't have
the domain expertise on the team to design it well today.

Genetics is specifically about *cross-generation inheritance* —
propagating parent values to offspring, allele drift, mutation.
v1 ships **nothing** in this space. Per-individual variation
(eye color, build, distinguishing features) is **not** a
genetics concern; see "Per-individual variation" above for how
the engine handles it without a trait concept.

What we'd need before designing the inheritance layer:

- A curriculum partner / consulted biology teacher to tell us
  what level of genetics serves real intro-bio classes.
- A breeding mechanic — when does inheritance fire? `mate`
  command? Time-driven population sim? Quest-rewarded mutation?
- A position on whether evolution is real (alleles drift over
  long-running play) or static (each species has fixed allele
  frequencies forever).

Until that conversation happens, genetics is deferred entirely.

---

## Decisions locked

Architectural commitments the planner does NOT relitigate. If
something here looks wrong to the planner, stop and check with
the user before improvising — same posture the Light & Boundary
plan took for its decisions section.

- **Unified Linnaean tree.** Real and fantasy species share one
  tree. Constructs (robots, golems, AI-with-bodies) are a
  kingdom in the tree (`Constructa`), not a parallel hierarchy.
- **`Species` as `Idea`-shaped templates** at
  `/obj/species/...`. Path-validator permits arbitrary depth.
- **`Body plans` as standalone `Idea`-shaped templates** at
  `/obj/body-plans/...`, referenced by species (NOT inlined on
  the species template).
- **`OrganismMixin` is the engine-side cut**, orthogonal to
  agency. Composes onto `Agent` *(have)* OR `Thing`. Marks
  species-tree membership; NOT the same axis as engine animacy.
- **Detached tissue is NOT an organism.** An apple is fruit
  tissue (Tangible Thing with organic Material); the apple tree
  is the organism. Same shape for a leaf, a piece of meat, a
  feather, a bone. `OrganismMixin` is reserved for autonomous
  biological units.
- **`Material` as an Idea-shaped template** at
  `/domain/material/...` in a Linnaean-shaped tree. Singleton-
  loaded. Carries cross-cutting physical properties (density,
  hardness, flammability, opacity, conductivities, edibility,
  toxicity, damageResistance).
- **`TangibleMixin` on the four physical top-level branches**
  (Thing, Location, Vessel, Agent). NOT on Idea, Shadow, or
  Persistable.
- **`Tangible.material` is a Stuff cross-reference** persisted
  via custom `persistenceHandler` (mirror of
  `Containable.environment`), NOT in `persistentFields`.
- **`MaterialApi.materialOf(stuff)` is the lookup resolver
  (bulk only in v1).** Returns `Tangible.material` when the
  Stuff is Tangible, null otherwise. The eventual `detailKey`
  parameter and the per-Detail material walk are documented in
  the Material subsystem section as the v2 shape but are NOT
  built in v1.
- **Sexed vs Gendered are separate mixins.** `Sexed` is biology;
  `Gendered` *(have)* is social. Independently composable; most
  player characters compose both.
- **Sex-determination system** and **reproductive mode** are
  separate species fields (a parthenogenetic lizard has
  biological sex but reproduction is single-parent). Pulled
  apart so they can vary independently.
- **No half-elves, no inter-species hybrids** in the taxonomy.
  Each humanoid species is a distinct lineage.
- **Lifecycle states are per-species**, drawn from the species'
  declared valid set. No global lifecycle enum. Common defaults
  by kingdom (`alive/dead/undead` for Animalia, `alive/dead`
  for Plantae/Fungi, `powered/unpowered/destroyed` for
  Constructa).
- **Death is a state transition, not an object swap.** A dead
  organism is the same Stuff it was alive, with
  `lifecycleState: 'dead'` and agency mixins inert (animacy is
  gated on lifecycle state). Avatar death adds the ghost spawn /
  connection-handoff wrinkle.
- **Persistence rule: what survives death/res = what survives
  logout/login.** No special death-time filter, no per-mixin
  opt-in.
- **Ghosts live outside the species tree.** Avatar-ghosts are a
  separate Agent (not the dead avatar with a different state)
  and DO compose `OrganismMixin` (cloned from the avatar's
  shape). Truly incorporeal agents (sentient weather, AI without
  a body) are `Agent` *(have)* without `OrganismMixin`.
- **Genetics is deferred entirely.** No inheritance machinery,
  no breeding mechanic, no mutation. Concerns cross-generation
  inheritance specifically.
- **Per-individual variation is mixin composition, not a trait
  concept.** Eye color, hair color, beard style, scars — each
  varied feature is its own mixin (`Eyed`, `Haired`,
  `Bearded`, …), composed where applicable, hydrated from
  template `data`. No species-side trait schema. No property
  bag. No clone-time stochastic sampling. v1 ships zero
  feature mixins; sample compositions use hand-authored
  `Visible` text. Specific feature mixins land on
  [mixin-slate.md](./mixin-slate.md) when content earns them.
- **Animacy predicate spelled `isAnimate`** (not `isLiving` —
  lies for powered constructs).
- **Animacy gating lives at the command layer, not on agency
  mixins.** Mobile / Vocal / Sensor do NOT self-gate on animacy;
  a dead organism can still be teleported, pushed through an
  exit, or have a message arrive. What it *can't* do is act of
  its own accord. Self-action command specs declare an
  animacy requirement (mechanism — validator vs new YAML field —
  is the planner's call after reading
  [command-spec.md](./subsystems/command-spec.md)); command
  routing refuses dispatch on inanimate hosts when the
  requirement applies. External-force callers (Teleport, Push)
  bypass cleanly because the action is host-external.
- **Body plan declares anatomy; species declares capability.**
  Sensory ports on the body plan carry count/position/modality
  only. Per-modality capability (vision profile, future
  hearing profile, scent acuity) lives on the species template
  and feeds `Perception` through the existing seam
  (`getVisionProfile`, etc.) via a species-reading shadow on
  the organism. No `biped-low-light` body-plan forks per
  fantasy-species sensory quirk.
- **Initial lifecycle state hydrates from the domain template's
  `data`.** Each leaf template that backs an organism declares
  its initial `lifecycleState` in `data` like any other
  persistent field; the standard hydrator copies it in.
  `postRegister` can adjust if cloning context demands
  something different (necromancer summoning a skeletal warrior
  with `'undead'` instead of `'alive'`). No species-side
  default-lifecycle-state field; no clone-time context override
  layer beyond what `postRegister` can already do.
- **Ghosts at `/obj/Ghost/<playerId>`.** Mirror of the
  `/obj/Avatar/<playerId>` convention. Generic `Ghost` class;
  per-player template carries the dying-avatar reference and
  any cloned-in persistent state. Standard clone pipeline; the
  template's `data` carries what survived the avatar's flush.
- **Cross-template references resolve lazily.** Species' `bodyPlan`,
  `parentClade`, `defaultMaterial`; OrganismMixin's `species`;
  any other Stuff-cross-reference field — all resolve via
  `StuffApi.singleton(path)` on each getter call. No caching of
  the resolved instance; HMR safety comes for free, since a
  re-cloned singleton replaces the cached entry and the next
  call sees the fresh one.
- **Tissues deferred to v2; v1 ships bulk Material only.**
  Per-Detail material authoring (tissues as `Detail`s, the
  resolver walking Details, body-plan body-part Detail trees,
  surgery / dismemberment / organ-targeted poisons) is out of
  v1 scope. `Detail.material` slot is NOT added to `Detail`.
  `MaterialApi.materialOf` ships with the bulk-only signature.
  The diet check reads only the food's bulk Material in v1.
- **Clade is a Zone subclass; v1 ships kingdom-rank Clades only.**
  See [zones-slate.md](./zones-slate.md). Four kingdom Clade
  templates ship with the race build (Animalia, Plantae, Fungi,
  Constructa). Family/genus/order Clades are added later under
  content pressure (shared metadata, pedagogical content).
  `SpeciesApi.getKingdom(o)` walks the species' template path,
  finding the nearest Clade ancestor of rank `'kingdom'`.
- **Null environment is a first-class supported state for
  Containable, comprehensively.** This build's mandate is to
  audit *every* subsystem that walks `Containable.environment`
  (MQL navigation, command scoping, perception walks, mudlog
  routing, anything else surfaced) and fix whatever can't
  handle null cleanly. Not minimum-viable — comprehensive.
- **Sessile is the default plant body plan.** Default plants
  reference `/obj/body-plans/sessile` (zero worn slots, zero
  held slots, zero locomotion modes, zero sensory ports). Code
  reading `species.bodyPlan` never null-checks. Plants with
  agency (Audrey II / Seymour-style) author their own body
  plan; the orthogonality of organism vs. agency means agency
  mixins compose freely on top.
- **Death/resurrection FLOW is deferred to a follow-on build.**
  The state machine (`alive`/`dead`/`undead` per-species,
  predicates, `lifecycleState` field) ships in v1. The
  *choreography* (combat-driven transitions, ghost spawn at
  `/obj/Ghost/<playerId>`, connection handoff, identity links,
  decay state machine) defers. The "Death and resurrection"
  subsection is design context for the follow-on, not v1 scope.
- **Diet machinery is deferred to a follow-on build.**
  `DietApi`, `Edible`, `Portable`, the diet content (apple,
  meat, chocolate bar, cat) all defer with mixin-slate's first
  wave. v1 ships `Material.toxicity` tags as data with no
  consumer. The "Diet, edibility, toxicity" section is design
  context for the follow-on.
- **Backing classes for new templates.** `Species extends Idea
  + SingletonMixin` (fields per "Per-species template fields").
  `Clade extends Zone` (defined in zones-slate, used here).
  Standard `PersistentHydrator` for both unless cross-field
  invariants force a custom hydrator later.
- **Path-shaped fields persist via custom `persistenceHandler`,**
  mirror of `Containable.environment`. Applies to `species` on
  `OrganismMixin`, `bodyPlan` / `defaultMaterial` /
  `parentClade` on `Species`, and the avatar↔ghost identity
  links (`currentGhost`, `originalAvatar`).

---

## Open design threads

Not in priority order. These are the questions the team needs to
land on before any template / mixin commits.

### Tissue composition deferred to v2

Earlier drafts flagged tissue composition as an open question
with two paths (flat material vs organism-specific override),
and a later draft resolved it through `Detail.material` plus
`MaterialApi.materialOf(stuff, detailKey?)`. The current
position: the *design* (tissues as `Detail`s with per-detail
`Material` references) is the right shape, but **none of that
ships in v1.** We don't need tissues today; revisit when
concrete content earns it (surgery, dismemberment,
organ-targeted poisons, composite-food toxicity walks). v1
ships bulk Material only — see "v1 scope" under Material
subsystem.

### Other agent kinds

A creature that's neither Organism nor Construct: incorporeal
spirits, sentient weather, an AI lacking a body. These are bare
`Agent` *(have)*. Worth confirming the design admits them as
first-class — character creation that requires a species pick
would lock them out. Suggestion: species pick is for embodied
characters (Organism + Construct); incorporeal agents take a
different creation path or just inherit a default.

### Where exactly do dwarves / elves / orcs sit?

Two sub-questions:

- **Genus or species level?** Are dwarves *Homo khazadicus* (sibling
  species in genus *Homo*) or *Khazadus rex* (separate genus in
  Hominidae)? Genus-level is more "sci-fi serious"; species-level
  is more "humans, dwarves, elves are close cousins."
- **Pedagogically**, which choice serves curricula better?
  Intra-species genetics (eye color, blood type, height
  inheritance) is what students actually study; cross-genus
  speculation is fan-fic.

Working position: humanoid fantasy species (dwarf, elf, orc,
halfling, gnome) are sibling species in genus *Homo* but are NOT
interfertile — there are no half-elves, half-dwarves, or any
inter-species hybrids in our taxonomy. Each species is a complete,
distinct lineage. This commits to option 2 from "unified Linnaean
tree" for these species without dragging in the cross-species
hybridization mechanics needed to make hybrids work.

If a content author later really wants half-elves, that's an
*invention outside our taxonomy* — they can reach for whatever
ad-hoc shape (a custom species, a polymorph shadow, an authored
trait override) suits the story. We won't bake the seam in.

### Where do dragons sit?

Per "unified Linnaean tree" recommendation: deep branch in
Vertebrata, before Reptilia. Specifics — phylum, class, order —
are an authoring call. Pedagogical concern: a student studying
"what kind of animal is a dragon" should learn something real (it
breathes, it has a skeleton, it lays eggs in some traditions) and
something genuinely fantasy (fire breath has no real anatomy
analog).

### Aging and life stages

Roadmap defers `Aged-in-game-time`. This slate's claim: the defer
is gated on race, because species lifespan is the input.
Once species templates carry lifespan bands, the aging mixin
becomes designable:

- Life stages per species (infant → child → adolescent → adult
  → elder, with species-specific ages)
- Effects per stage (size scaling, ability gates, vulnerability
  modifiers)
- Death-of-old-age as the natural endpoint

Don't ship this with the v1 race work; do make sure the species
template has `lifespan` reserved.

### Polymorph as a Shadow

Future polymorph mechanics (a wizard turning a player into a frog)
should naturally compose with the existing Shadow framework — a
shadow that overrides `getSpecies()` returns the polymorphed
species while the underlying organism is preserved. Worth
prototyping the shadow path once OrganismMixin lands; cheap and
high-pedagogical-value.

### Avatar customization UI

Character creation flow doesn't exist today (no controller for
it; seed clones at login with no per-character pick). Species
pick is the obvious first ask. Open: species pick, sex pick,
gender pick — all at creation, or some during onboarding
tutorial?

Punt the UI in v1; the data model is what this build delivers.
When the UI lands, it writes into species/sex/gender slots that
already exist. (Per-individual variation — eye color etc. — is
mixin-composition-shaped; the UI would write into whatever
feature mixins are composed on the avatar template at that
point.)

---

## Out for now

Like mixin-slate, the *why* matters as much as the cut.

- **Death and resurrection FLOW** — deferred to a follow-on
  build. State machine + predicates ship in v1; combat-driven
  transitions, ghost spawn at `/obj/Ghost/<playerId>`,
  connection handoff, decay machinery defer.
- **DietApi + Edible + Portable + diet content** — deferred
  with mixin-slate's first wave. v1 has no eating mechanic and
  no pickup mechanic; `Material.toxicity` tags ship as data
  with no v1 consumer.
- **Genetics layer** — deferred entirely; see "Genetics —
  deferred entirely" above. Concerns cross-generation
  inheritance specifically. Per-individual variation is **not**
  here — that's mixin composition, see "Per-individual
  variation."
- **Population simulation / evolution** — long-running allele
  drift, ecosystem dynamics. Pedagogically wonderful; year-2.
- **Cell-level / molecular biology** — pathogen modeling at the
  protein level, etc. Out of scope by orders of magnitude.
- **Tissues / per-Detail Material authoring** — deferred. v1
  ships bulk Material only. The `Detail.material` slot,
  body-plan body-part Detail trees, surgery / dismemberment /
  organ-targeted poisons, composite-food toxicity walks all
  defer until concrete content motivates the design. No
  `MultiMaterialMixin` either way.
- **Per-character mutation** — depends on the genetics layer.
- **Real metabolism modeling** — calorie counts, nutrient
  composition. Touches diet but goes deeper than the v1 toxicity
  table justifies.
- **Cross-species hybridization mechanics** — out, full stop. No
  half-elves, no half-dwarves, no inter-species hybrids of any
  kind in our taxonomy; each humanoid species is a distinct
  lineage. A content author who wants hybrids reaches outside the
  taxonomy (custom species, polymorph shadow, ad-hoc trait
  override) — the engine doesn't carry the seam.
- **Aging effects on stats** — no stats in `Character` *(have)*;
  `Aged-in-game-time` defers with the stat conversation.

---

## Sample compositions

Concrete inhabitants of the future race-aware sample area:

- **Human player avatar (*Homo sapiens*)** — `Avatar` *(have)* +
  `OrganismMixin` (new) + `SexedMixin` (new); species ref
  `/obj/species/animalia/chordata/mammalia/primates/hominidae/homo/sapiens`;
  body plan `/obj/body-plans/biped`; sex-determination `xy`;
  lifespan band 0–120 game-years; circadian `diurnal`.
- **Dwarf player avatar (*Homo khazadicus*)** — same composition;
  species ref `/obj/species/animalia/chordata/mammalia/primates/hominidae/homo/khazadicus`;
  same body plan (`biped` — anatomy is shared with sapiens); same
  `xy`; lifespan band 0–400; circadian `diurnal`. Differences from
  sapiens: lifespan, default size band, and a scotopic-shifted
  `visionProfile` on the species template (a species-level
  capability, NOT a body-plan tweak — see "Anatomy vs capability").
- **Wild dragon NPC** — `Character` *(have)* + `OrganismMixin` +
  `SexedMixin` + (eventually) `Mountable`; species ref
  `/obj/species/animalia/chordata/draconia/...`; body plan
  `/obj/body-plans/quadruped-winged-firebreath`;
  sex-determination `xy` (authoring choice); lifespan band
  0–2000; circadian `cathemeral`.
- **Faculty robot NPC** — `Character` *(have)* + `OrganismMixin`
  (new) + `Tangible` (slate-pending); species ref
  `/obj/species/constructa/metallica/.../tutor-bot/mk-iv`; body
  plan `/obj/body-plans/biped`; bulk Material
  `/domain/material/mineral/metal/...` (steel or whatever the
  species declares); `lifecycleState: 'powered'`; no `SexedMixin`
  (species declares sex-determination = `none`); circadian
  `aperiodic`. Same mixin as the human; the kingdom path and
  Material distinguish them.
- **Frankenstein's monster (test case)** — `Character` *(have)* +
  `OrganismMixin` (new) + `Tangible` (slate-pending); species ref
  `/obj/species/constructa/...` (it's a construct in identity —
  built, not born); bulk Material
  `/domain/material/organic/tissue/flesh` (made from biological
  tissue); `lifecycleState: 'powered'` or whatever the species
  declares. Demonstrates the kingdom-vs-Material split: identity
  reads from kingdom, behavior queries (does it rot? does it
  burn?) read from `MaterialApi.materialOf`. The two intentionally
  disagree here.
- **Apple (detached fruit)** — `Thing` + `Named` *(have)* +
  `Visible` *(have)* + `Tangible` (this build). **No
  OrganismMixin** — an apple is fruit (detached tissue), not an
  organism. `material:
  '/domain/material/organic/tissue/fruit-flesh'` (or the authored
  variant for *Malus domestica*). No species, no lifecycle state.
  The organism is the apple tree (a separate Stuff); the apple is
  the fruit body it produced. (`Edible` / `Portable` defer with
  the diet conversation; without them, an apple in v1 just sits
  there as a Tangible Thing — it can't be picked up or eaten.
  That's intentional v1 scope.)
- **Apple tree (the actual organism)** — `Thing` + `Named` *(have)*
  + `Visible` *(have)* + `Tangible` (slate-pending) +
  `OrganismMixin` (new); species ref
  `/obj/species/plantae/.../malus/domestica`; `lifecycleState:
  'alive'`; bulk Material organic-plant-tissue (or species
  default). No agency mixins. Future `Growing` /
  `Photosynthesizing` / `Fruiting` mixins layer on top when
  growth and fruit-production mechanics land.
- **House plant** — `Thing` + `Named` *(have)* + `Visible` *(have)*
  + `Tangible` (slate-pending) + `OrganismMixin` (new); species ref
  `/obj/species/plantae/.../spathiphyllum/wallisii`;
  `lifecycleState: 'alive'`; bulk Material organic-plant-tissue.
  No agency mixins. Future `Growing` / `Photosynthesizing` mixins
  layer on top if and when we want plants to develop over time.
- **Piece of meat (cut, raw)** — `Thing` + `Named` *(have)* +
  `Visible` *(have)* + `Tangible` (this build). **No
  OrganismMixin** — meat is tissue. `material:
  '/domain/material/organic/tissue/flesh'` (subtree variant by
  source species if the author cares — venison vs beef vs mutton
  surfaces as different organic-flesh materials). (`Edible` /
  `Portable` defer with the diet conversation; same v1 scope
  caveat as the apple.)
- **NPC corpse (former orc)** — same `Character` *(have)* +
  `OrganismMixin` Agent that was the live orc, now with
  `lifecycleState: 'dead'`. Same object identity. Agency mixins
  inert because `isAnimate(o)` is false for `dead`. Self-managed
  decay: the corpse runs its own decay state machine via events,
  eventually destructing once decay completes.
- **Reanimated zombie (the orc above, raised by a necromancer)** —
  same Agent again, `lifecycleState` transitioned `dead → undead`.
  Agency mixins resume because `undead` is animate. Same object
  through the entire `alive → dead → undead` arc.
- **Avatar corpse (former human player)** — same `Avatar` *(have)*
  the player has been driving, now `lifecycleState: 'dead'`.
  `currentGhost` references the spawned ghost. Persistence
  flushed at death. Cannot be destructed mid-session — survives
  until logout or resurrection. If "fully decayed" by the
  body's own decay machine, removes itself from its environment
  but stays in the engine.
- **Ghost (player playing as ghost while corpse persists)** —
  a separate `Agent` cloned from the avatar's shape, with
  `lifecycleState: 'undead'`, `originalAvatar` pointing back to
  the dead avatar. Has its own (transient + persistent) state,
  divergent from the avatar's. Holds the player's connections
  during ghost play. Destructed at resurrection.
- **Truly incorporeal spirit (sentient weather, raw AI, the
  ghost-of-an-NPC if content models it)** — `Agent` *(have)* +
  agency mixins, **no** `OrganismMixin`. Not in the species tree.
  Distinct from the avatar-ghost above, which IS in the species
  tree (it's a clone of an organism's shape). Defer until
  content needs it.
- **Elf player avatar** — `Avatar` *(have)* + `OrganismMixin` +
  `SexedMixin`; species ref `/obj/species/.../homo/elvicus` (or
  whatever the team commits to as the elf species path). Body
  plan inherits biped, sex-determination mirrors *Homo sapiens*.
  Differs from a human avatar only by the species reference and
  the per-species traits the species template carries.

---

## Build order

Calibrated to mixin-slate's first wave (which is gated on slot
taxonomy, which is gated on body plans, which is gated on this
doc). Working order:

**Phase 0 — Zones / templates refactor**

Prerequisite phase from [zones-slate.md](./zones-slate.md). The
race build assumes Phases Z1–Z3 from that slate have shipped:
`Zone` is the bare scope abstraction, `SpatialZone` carries the
spatial methods, `Template` has split into `ZoneTemplate` /
`LeafTemplate`, `FOLDER_CLASS_PATHS` / `SPATIAL_ZONE_CLASS_PATHS`
exist as separate sets.

**Pre-build design pass**

- Lock in the seven or eight tag fields a species template requires
  to validate (the rest grow with content).
- Lock in the canonical body-plan set for v1: `biped`,
  `quadruped`, `sessile`. Three is enough to exercise the
  acceptance roster (humans/dwarves/robots = biped; frogs =
  quadruped; houseplants = sessile).
- Lock in the canonical bulk-Material set for v1 (a handful of
  metals / stones / woods + the bulk organic Materials species
  default to: flesh, plant-tissue, fruit-flesh).

**First wave (the v1 race build)**

1. **Material subsystem (bulk only)** — `Material extends Idea`
   template tree under `/domain/material/`, `TangibleMixin` on the
   four physical top-level branches, `MaterialApi.materialOf(stuff)`
   bulk-only resolver. NO `Detail.material` slot in v1; NO
   per-Detail walk in the resolver.
2. **Clade class + kingdom Clade templates.** `Clade extends
   Zone` (slots into the `Zone` abstract base from zones-slate),
   added to `FOLDER_CLASS_PATHS`. Author the four kingdom Clades:
   `/obj/species/animalia`, `/obj/species/plantae`,
   `/obj/species/fungi`, `/obj/species/constructa`. Lands before
   any species template so species can save under a real
   ancestor zone (the folder/leaf invariant requires it).
3. **Body plan template skeleton** — minimal `Idea` templates at
   `/obj/body-plans/biped`, `/obj/body-plans/quadruped`,
   `/obj/body-plans/sessile`. Each declares worn / held /
   locomotion / sensory-port (anatomy only). `sessile` is the
   stand-in plants reference (zero of everything). No
   per-tissue Material authoring in v1.
4. **Species templates** — `Species extends Idea + Singleton`,
   minimum acceptance roster: *Homo sapiens*, one fantasy
   humanoid (dwarf or elf), a frog, a houseplant, a tutor robot.
   References body plans authored in (3), kingdom Clades
   authored in (2). Initial `lifecycleState` ships in each
   template's `data`.
5. **OrganismMixin** — composes onto `Agent` *(have)* (in the
   `Character` chain) and onto `Thing` (for plants, fruit, corpses).
   Carries species ref + age + lifecycle state. Lazy resolution
   for `species` via `StuffApi.singleton(path)`. Seeds for player
   avatars get `species: '.../homo/sapiens'` in their template
   `data` until creation flow lands.
6. **Animacy gating at the command layer.** Implementation likely
   a validator on command specs (planner's call after reading
   `command-spec.md`); command routing refuses dispatch on
   inanimate hosts when the spec declares animacy required.
   Audit existing command specs and tag the ones that need it
   (most self-action verbs do; teleport / push / message-receive
   do not).
7. **SexedMixin** — orthogonal to `Gendered` *(have)*. Reads sex
   options from the organism's species' sex-determination system.
8. **SpeciesApi** — small static utility for `getKingdom`,
   `isInKingdom`, lifespan / lifecycle queries. Walks the
   species' template path / parent Clade chain.
9. **Comprehensive null-environment sweep.** Mandate: every
   subsystem that walks `Containable.environment` is audited
   and fixed if it can't handle null cleanly. Not minimum-viable
   — comprehensive. Decayed-avatar use case motivates it; the
   fix is general (it's how the engine separates players from
   world geography).

**Future (gated) — explicitly NOT in v1**

- **Death and resurrection choreography.** Combat-driven
  `alive → dead` transitions, `/obj/Ghost/<playerId>` spawn,
  connection transfer, identity-link setup, decay state
  machine. Design context lives in this slate's "Death and
  resurrection" subsection. Read it plus
  [docs/subsystems/lifecycle.md](./subsystems/lifecycle.md) and
  [docs/subsystems/connection.md](./subsystems/connection.md)
  when planning the follow-on.
- **DietApi + diet/toxicity gating.** Defers with `Edible` and
  `Portable` from mixin-slate. When those mixins land and v1
  ships food content, DietApi's the predicate that consults
  species diet against bulk Material toxicity.
- **Body-plan integration with Wearable / Wieldable.** Defers
  with the rest of mixin-slate's first wave. Wearable's slot
  list comes from species' body plan, not a global enum.
- **First per-individual variation feature mixin** (`Eyed`,
  `Haired`, etc.). Lands on mixin-slate when content motivates
  it.
- **Sleep / circadian** — once the tick / scheduling story is
  designable. Species template carries the circadian band slot.
- **Aging / life stages** — once we have a tick story.
- **Genetics layer** (cross-generation inheritance) — deferred
  entirely. Per-individual variation is handled by mixin
  composition and doesn't need its own gate.
- **Tissue / per-Detail Material authoring** — `Detail.material` slot,
  per-tissue toxicity composition, surgery / dismemberment /
  organ-targeted poisons. Earned by content.
- Polymorph shadow prototype.
- Avatar character-creation UI / controller.
- Permission machinery on Zones (zones-slate non-goal).
- Runtime-rule machinery on Zones (zones-slate non-goal).

---

## Acceptance criteria

A successful v1 implementation:

- [ ] `Material` Idea-templated tree exists at `/domain/material/`
      with at minimum: a few metals (iron, steel, copper), a few
      stones (granite), a few woods (oak), and the bulk organic
      Materials species default to (flesh, plant-tissue,
      fruit-flesh).
- [ ] `TangibleMixin` is composed on `Thing`, `Location`, `Vessel`,
      and `Agent`. NOT composed on `Idea`, `Shadow`, `Persistable`.
- [ ] `Tangible.material` round-trips through the persistence
      framework via custom `persistenceHandler` (mirror of
      `Containable.environment`).
- [ ] `MaterialApi.materialOf(stuff)` resolves the bulk material
      for a Tangible, returns null for a Stuff without a
      Material. (No `detailKey` parameter in v1; per-Detail
      material defers.)
- [ ] `Clade extends Zone` exists, is registered in
      `FOLDER_CLASS_PATHS`, and is NOT in
      `SPATIAL_ZONE_CLASS_PATHS`. The four kingdom Clade
      templates (Animalia, Plantae, Fungi, Constructa) ship at
      `/obj/species/{kingdom}/`.
- [ ] `Body plans` Idea templates exist at `/obj/body-plans/...`:
      `biped`, `quadruped`, and `sessile`. Each declares worn
      slots, held slots, locomotion modes, and sensory ports
      (anatomy only — count, position, modality). `sessile`
      declares zero of each. No per-tissue Material authoring
      in v1.
- [ ] `Species` Idea templates exist at `/obj/species/...`. v1
      ships at minimum: *Homo sapiens* (biped), one fantasy
      humanoid (biped — dwarf or elf), one non-mammal (a frog —
      quadruped), one Constructa species (biped — a robot), one
      Plantae species (sessile — a houseplant).
- [ ] `OrganismMixin` composes correctly onto `Agent` *(have)*
      and onto `Thing`. The mixin carries species ref, age,
      lifecycle state. `MixinApi.isOrganism(o)` predicate works.
- [ ] `SexedMixin` reads valid sex set from species'
      sex-determination system. A character with `Sexed` but no
      `Gendered` *(have)* is biology-only; a character with
      `Gendered` but no `Sexed` is social-only.
- [ ] `SpeciesApi.getKingdom(o)`, `SpeciesApi.isInKingdom(o,
      'Constructa')` work over the species path.
- [ ] Lifecycle predicates (`isAlive`, `isDead`, `isUndead`,
      `isPowered`, `isDestroyed`) and the cross-species
      `isAnimate` predicate behave per the lifecycle table.
      `lifecycleState` initializes from each leaf template's
      `data`.
- [ ] **Animacy gating at the command layer.** Self-action
      command specs that should require animacy declare the
      requirement (mechanism — validator vs new field — is the
      planner's call after reading `command-spec.md`); command
      routing refuses dispatch on inanimate hosts when set.
      External-force callers (a teleport spell, a push verb)
      bypass cleanly because the action isn't host-driven.
- [ ] **Comprehensive null-environment support.** Every
      subsystem that walks `Containable.environment` chains
      handles null cleanly: MQL navigation, command scoping,
      perception walks, mudlog routing, anything else found
      during the audit. A Containable with `environment: null`
      is a first-class supported state.
- [ ] An apple in the world composes
      `Thing + Named + Visible + Tangible`, with `material:
      '/domain/material/organic/tissue/fruit-flesh'` (or species
      variant), no species reference, no lifecycle state, no
      OrganismMixin. The apple tree it came from is a separate
      Stuff with `OrganismMixin`. (Apple is not pickup-able or
      eatable in v1 — `Edible` / `Portable` defer.)
- [ ] All new mixins follow the codebase rules — methods-only
      contract, no `_mixinName` suffix in filenames, persistent
      fields declared, custom `persistenceHandler` for Stuff
      cross-references, security decoration on the new Apis.
- [ ] Tests colocated under `__tests__/` siblings, Vitest.
- [ ] Documentation: a `docs/subsystems/race.md` (or whatever
      the team commits to as the canonical name) covering the
      shipped subsystem; updates to zones-slate / mixin-slate
      marking shipped pieces; roadmap entry struck or restated
      as shipped.

---

## Notes for the planner

Recommendations for the planning agent that turns this into an
implementation plan; same shape as the Light & Boundary plan took
for its planner notes.

- **Read [zones-slate.md](./zones-slate.md) first.** The race
  build assumes the zones-slate Phases Z1–Z3 have shipped:
  `Zone` is the bare scope abstraction, `SpatialZone` carries
  the spatial methods, `Template` is split into `ZoneTemplate`
  / `LeafTemplate`, the class-path sets are split. `Clade
  extends Zone` slots into that hierarchy as the canonical
  non-spatial Zone subclass.
- **Order phases by dependency**, not by size. Bulk Material
  lands first; kingdom Clades second (so species have a real
  ancestor zone to nest under); body plans third; species
  fourth; OrganismMixin fifth; animacy gating, SexedMixin,
  SpeciesApi run in parallel once OrganismMixin exists; the
  null-environment sweep can run alongside.
- **The Material substrate (bulk only) is independent enough to
  ship as a preliminary phase** — same shape as Phase 1
  (Boundary infrastructure) in the Light & Boundary plan. Land
  it first with its own tests, then build clades / body plans /
  species / organism on top.
- **Constructa as a kingdom (not a parallel hierarchy) is the
  bold call.** The acceptance roster includes one Constructa
  species (a tutor robot or similar). Lifecycle predicates are
  built once and consume whatever set the species declares; no
  Constructa-special-case code in predicate land.
- **No tissue / per-Detail material work in v1.** Skip
  `Detail.material`, skip per-tissue Material refs on body-plan
  body-part Details, skip the resolver's `detailKey` parameter.
  When tempted to "while we're here," the answer is no —
  content motivation hasn't earned it.
- **No diet machinery in v1.** `DietApi`, `Edible`, `Portable`
  all defer. The toxicity story is data only — `Material`
  carries `toxicity` tags, but no v1 predicate consults them.
  Don't ship a stub `DietApi` "for forward compatibility";
  follow the slate's general rule against speculative slot
  reservation.
- **No death/resurrection choreography in v1.** The state
  machine (`alive` / `dead` / `undead`) ships, the predicates
  work, but the *flow* (combat→dead transition, ghost spawn,
  connection handoff) is a follow-on build. The "Death and
  resurrection" subsection in this slate is design context for
  that follow-on, not v1 scope.
- **Type the mixin interface name `Tangible`, not `Material`** —
  the value-class is `Material` (an Idea subclass), and Stuff
  composing the mixin is `Stuff & Tangible`.
- **`OrganismMixin.getSpecies()` resolves lazily.** Live ref at
  runtime via `StuffApi.singleton(path)` on each call; path
  persisted via custom `persistenceHandler` (mirror of
  `Containable.environment`). Same pattern for `bodyPlan`,
  `parentClade`. (The avatar↔ghost identity links defer with
  the death/res follow-on.)
- **Animacy gating is at the command layer, not on agency
  mixins.** Don't add `isAnimate` checks to Mobile / Vocal /
  Sensor. The mechanism is likely a validator on the command
  spec — confirm by reading
  [docs/subsystems/command-spec.md](./subsystems/command-spec.md)
  /
  [docs/subsystems/command-routing.md](./subsystems/command-routing.md)
  before deciding shape. External-force callers (teleport,
  push) bypass cleanly because they're not driven by the host.
- **Body plan declares anatomy; species declares capability.**
  Sensory ports are count/position/modality only. Per-modality
  capability profiles (`visionProfile`, future
  `hearingProfile`) live on the species template and feed
  `Perception` via a species-reading shadow on the organism.
  Don't add capability fields to body plans.
- **Sessile body plan is the plant default.** Default plants
  reference `/obj/body-plans/sessile` (zero of everything).
  Code reading `species.bodyPlan` never null-checks. Weird
  plants with agency (Audrey II) author their own body plan
  declaring whatever anatomy they have; agency mixins compose
  freely on top.
- **Null environment is comprehensively supported.** The build
  includes a *thorough* null-environment audit across MQL,
  command scoping, perception walks, mudlog routing, and any
  other subsystem that walks `Containable.environment`. Not
  minimum-viable — the comprehensive read is locked.
- **Tests should include integration scenarios across
  organism / species / clade / body-plan**, not just unit-mixin
  tests. Lazy-resolution behavior under HMR is worth a test —
  a re-cloned species template should be picked up by every
  organism's next `getSpecies()` call.
- **Don't try to design genetics.** Cross-generation
  inheritance is deferred entirely.
- **Per-individual variation is mixin composition, not a trait
  concept.** If implementation work reveals trait-shaped
  pressure (the dwarf NPC needs to hold an eye color, etc.),
  the answer is a per-feature mixin (`Eyed`, `Haired`, …) on
  mixin-slate, not a property bag on `OrganismMixin`. v1
  ships zero feature mixins; sample compositions use
  hand-authored `Visible` text. If content motivates the first
  feature mixin during planning, raise it as a mixin-slate
  question rather than landing it here.

---

## Cross-references

- [roadmap.md](./roadmap.md) §"Race / species / organism subsystem"
  — the original blurb this slate elaborates.
- [zones-slate.md](./zones-slate.md) — hard prerequisite. The
  templates / zones refactor (Zone class split, Template
  subclasses, `FOLDER_CLASS_PATHS` rename) lands ahead of the
  race build.
- [mixin-slate.md](./mixin-slate.md) §"Organism subsystem awareness"
  — the list of mixins constrained by this design.
- [subsystems/light.md](./subsystems/light.md) — precedent
  shape for a requirements doc consumed by the planning agent.
- [docs/subsystems/templates.md](./subsystems/templates.md) — clone
  pipeline, path-validator constraint, Hydrator.
- [docs/subsystems/perception.md](./subsystems/perception.md) —
  per-modality capability seams (`getVisionProfile`, …) that
  species data feeds via shadow.
- [docs/subsystems/lifecycle.md](./subsystems/lifecycle.md) — the
  identity-after-death thread for corpses.
- [docs/subsystems/connection.md](./subsystems/connection.md) —
  connection handoff for Avatar death/ghost spawn.
