# Material decomposition — requirements

**Kind:** refactor/sweep
**Leads from:** kernel. **First consumers, in this build:** every process that already reads a
material — fire, smelting, cooking and spoilage, the kiln, wood seasoning, smell and taste (build-4's,
the first capability pulled out), assay and the wiki. Every material row in every pack is re-homed;
none gains new behavior except where a defect is fixed.

Over many builds every property any process needed was added to the one material, so a granite row
carries fields for heat of combustion, edibility and seasoning days, set to "not applicable". This
build gives a material only the properties it really has, groups those properties into capabilities
named for the physics they describe, and arranges materials in a shallow tree of kinds — what the
substance is — where each kind carries the capabilities its members share. It is the census's build:
[material-decomposition-slate](../slates/builds/material-decomposition-slate.md) §§ 7¾–7⅞ hold the
evidence, the measured tree and the reuse ledger, and every decision below was taken against them.

## What already exists

- **One material, ~80 authored properties, 386 rows** across every pack (census 2026-11-07, on the
  smell-and-taste tree). Each row authors a handful; the rest sit at "not applicable".
- **Four capabilities already pulled out** by the same pattern this build generalizes: smell (build-4,
  in flight), radioactivity, muscle work (butchery), and arcana's potions. Each needed its own
  combination class the moment a second capability met it — the class explosion this build ends.
- **Processes that read materials:** fire and combustion, smelting and casting, cooking, spoilage and
  freshness, the kiln's firing, wood seasoning, maturation, painting and glazing, cleaning, bulk
  (pouring, boiling, dissolving), metabolism, smell and taste, assay and `analyze`.
- **The wiki** has per-material pages planned ([wiki-content-slate](../slates/builds/wiki-content-slate.md)).
- **In flight:** build-4 (smell and taste) touches 308 material rows and adds the smell capability;
  build-2 (controllers) touches nine material tests; build-3 (client surface) one material file.

**Therefore what is genuinely new here is** the capability vocabulary as a whole, the tree of kinds,
the rule that decides where a capability lives, the gate that keeps consumers off the kinds, and the
re-homing of every row — plus the defects the census found.

## Goals

- **A material has exactly the properties it has.** No row says "not applicable" to mean absent; a
  capability a material lacks is simply not there.
- **Capabilities are named for the substance's physics** — whether it melts, burns, boils, dissolves,
  spoils, is edible, is toxic, is porous, has a pH — never for a game process that reads it.
- **Materials sit in a tree of kinds** (decided 2026-11-07, slate § 7¾): organic or mineral first, then
  metal, stone (ceramic, glass), salt, lye, soap, water, gas; plant (wood, fiber, herb), animal (flesh,
  hide and horn), food (drink, spirit), fat oil and wax, polymer, solid fuel, oil, pigment and paint,
  glue, residue. Each kind carries what its members physically share.
- **Exceptions are cheap.** A material that needs one capability its kind lacks is a one-step child of
  that kind; a capability that turns out to be widely needed moves up a level.
- **Nothing outside the tree depends on a kind.** Every process asks for a capability; the kinds exist
  for authors, the folder tree and the wiki.
- **The wiki explains capabilities and kinds**, once each, and lists the materials under them.
- **Every material reads the same as today** to a player, except where a defect is fixed.

## Non-goals

- **Moving material rows into folders that match their kind** (199 rows sit at the top of the material
  tree today). A path change ripples to every reference in every pack; it is its own deliberate sweep →
  the slate's § 8 (open item 5), in the shape of the place-taxonomy path sweep.
- **The species tree** (person, kept, aquatic) and **maturation by mechanism** → the same slate § 7, as
  the next Idea-tree pass; build-4's handed-over `MATURATION_MECHANISMS` waits there.
- **Dead fields on other trees** (condition contagion, discipline conferrals, species minimum lifespan)
  → slate § 7, with that pass.
- **The biome tree** → [biome-normalization-slate](../slates/builds/biome-normalization-slate.md),
  after this build, using its method once the unbuilt biomes (mountaineering and the rest) are surveyed.
- **Filling every data gap the census found** (biological source on half the plant and animal rows,
  fats' heat of combustion, water's phase points, the residues' physics). This build makes each gap
  visible and countable; the content burn-down follows, owned by each trade → the slate's § 8.
- **New materials, new processes, new verbs** — nowhere, deliberately.

## Placement

Kernel: the material base, the capabilities and the kinds. A pack may ship its own kind under its own
root (arcana's potions are the precedent), so a second realm's exotic substance needs one class in its
pack and no kernel change. Every pack that ships material rows is touched once, to name its row's kind.
**The test** — does a new material need code? No, if an existing kind fits; one class in the author's
own pack if it needs a capability its kind lacks; a kernel change only for a capability that does not
exist yet.

## Collisions

- **build-4 (smell and taste)** — the same rows and the same base. **This build starts after build-4
  merges**, and its smell capability is the first member of the vocabulary, not a special case. Its two
  combination classes are replaced.
- **Every pack with material rows** (~40) — each row's kind changes; nothing else in the row should.
- **Butchery's muscle**, **arcana's potions**, **uranium** — re-homed as Flesh, a pack kind, and a
  radioactive metal.
- **The live demo world and every dev database** — rows change kind, so worlds rebuild from the packs
  (no migration, per doctrine: dev databases are dropped; the demo is redeployed).
- **Wiki pages** that exist for individual materials — kept where the material is interesting in its
  own right (rubber, lye, glass); the rest are listed on their capability's page.

## Surface decisions

### Family is the kind; chemical identity is a capability

A material's class is what it IS (a metal, a food). Element, compound or mixture is a mutually
exclusive capability any kind can carry — iron and bronze are both metals, one an element and one a
mixture. **Lens 1 chose:** what a process cares about is the kind; identity is a fact chemistry reads.

### Organic or mineral is the first split

The strongest fault line in the census: the odorless rows are the mineral world, and tissue, edible,
perishable and most combustible rows are organic. Fossil fuels and mineral oils are organic (fossil
organic matter); preparations are organic.

### A kind composes what its members physically all have, or most use

A capability every member physically has belongs on the kind even where rows have not authored it yet
— that is a data gap, counted and burned down. A capability only a minority use is a one-step child.
Measured per node in the slate; the clean kinds (wood, flesh, spirit, gas, stone, metal) came out at
88–100%.

### Five capabilities the census separated

Toxicity is its own (a third of toxic rows are not food). Perishable is its own (blood and rawhide
spoil). Porosity is its own (cloth and paper are porous without being strong). Acid-base is its own.
And dietary nutrients split from a substance's constituents, which join its composition.

### Kinetics lives where the process reads it

Change over time at a rate set by temperature (firing, curing, staling) is cross-cutting: it sits on
the clay the kiln fires, the wood that seasons and the glue that sets — not on the brick.

### Drink is kept as a kind with nothing of its own yet

The kind axis is what a substance is, and a drink is a kind of food (Residue is the precedent of a kind
that adds nothing). Spirit, under it, adds combustible and toxic.

### ⭐⭐ Robust to consumers nobody has designed

The content is mostly test cases and there is no lore yet, so the tree must not encode either. Five
rules (owner, 2026-11-07; slate § 7¾): consumers depend on capabilities, never kinds, enforced by a
gate · capabilities describe the substance, not the game · the tree is chemistry, not culture (lore and
uses live in rows) · the leaves are the fragile, cheap part · a kind composes what its members
physically share.

### Defects fixed in passing

Lye, halite, saltpeter and glycerin are marked edible (lye with no toxicity at all); hard soap borrows
wood's seasoning for its cure; `iron` exists twice; metals author water absorption; and on liquids the
melting point is the freezing point, so that capability's name must read both ways.

## Lens pass

**1 pedagogy.** The tree teaches real chemistry: organic and mineral, element, compound and mixture,
why a metal melts and a stone does not, why ethanol burns. Every capability is a property a student
can look up, and each gets one page explaining it. The derivable rule (compose what members
physically share) means a new row's place is a fact, not a ruling.

**2 creative expression.** The ordinary case — a new material of an existing kind — is one row, no
code, and authors fewer fields than today. The bespoke case is one class in the author's own pack.
Materials are building blocks authors consume (owner, slate § 1), so the vocabulary is closed by design.

**3a immersion · 3b participation.** Nothing a player sees changes, except that lye stops being
food. 3b is out of reach: the polity does not author substances.

**4 values.** None at stake — physics decides every placement. The one judgment (where a leaf's
boundary falls) is recorded as revisable.

**5 continuity.** The strongest case for the build: chemistry is true in every epoch, so the tree
survives every technology change; a new epoch adds consumers of existing capabilities, not new kinds.

**6 economy.** Produces nothing, consumes nothing. It pays for the wiki and for every future process
(a new consumer finds its property already defined).

**7 governance.** Judges no person. Not applicable.

## The drive

Kernel-led, so it drives the existing content that reads materials. Every step is `instant` or
`short`; there is no clock-dependent step, so **there is no soak drive**. Wizard staging is marked.

### Blocking drive

1. `instant` `player` — On a fresh world, `look` at oak, iron, bread, granite, gin and lye where they
   stand (the yard, the smithy, the bakery, the bar, the chandlery). Each reads exactly as before.
2. `instant` `player` — `smell` the gin, the oak and the granite: gin and oak smell; granite does not.
3. `short` `player` — Light a fire with oak; feed it lamp oil; try to burn a brick. Wood and oil burn;
   the brick does not.
4. `short` `player` — Smelt ore at Rejection into a bloom and cast it; the metal melts at its own point.
5. `short` `staged` — Fire a clay pot in the kiln (staged to its firing temperature); it comes out
   fired, and the clay's change is what the kiln reads.
6. `short` `player` — Bake bread and leave a loaf; its freshness reads as before.
7. `instant` `player` — `drink lye` at the chandlery: refused, or it harms — never the meal it was.
   `taste salt`: salty, and edible.
8. `instant` `player` — `analyze` iron and bronze with the assay kit: one an element, one a mixture.
9. `instant` `player` — Open the wiki's page for combustible materials and the page for metals: the
   first explains the property and lists what burns; the second lists the metals.
10. `instant` `staged` — As an author, add a new food row with a smell and nothing else, to a pack, with
    no code; it installs and can be smelled and eaten.
11. `short` `staged` — Restart the world; repeat steps 1, 2 and 7. Everything reads back the same.

### Soak drive

None. Seasoning and spoilage over weeks are unchanged mechanisms already in their own soak drives.

## Acceptance criteria

- Every material in the world reads, smells, tastes, burns, melts and spoils as it did before, except
  the listed defects.
- No material row says "not applicable" for a capability; a capability it lacks is absent.
- Lye is not food; salt is; there is one iron.
- An author adds a material of an existing kind with one row and no code.
- The wiki has one page per capability, per chemical kind and per kind, each listing its materials.
- A world built fresh from the packs runs the drive above end to end, and again after a restart.

## Cross-references

- [material-decomposition-slate](../slates/builds/material-decomposition-slate.md) — §§ 7¾ (census,
  tree, measurement, defects, robustness) and 7⅞ (reuse ledger)
- [race.md](../subsystems/race.md) § Material substrate · [fire.md](../subsystems/fire.md) ·
  [spoilage.md](../subsystems/spoilage.md) · [ceramics.md](../subsystems/ceramics.md) ·
  [forestry.md](../subsystems/forestry.md) · [mixins.md](../subsystems/mixins.md)
- build-4's [vocabularies-to-rows requirements](./vocabularies-to-rows-requirements.md) — the smell
  capability and the hand-over
- [biome-normalization-slate](../slates/builds/biome-normalization-slate.md) — the next tree
