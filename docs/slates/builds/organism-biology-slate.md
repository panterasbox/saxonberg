# Organism biology slate — capability derives from anatomy

> **Status: UNBUILT** — designed with the owner 2026-11-07 → 11-08, one question at a time, out of the
> bestiary pilot ([pilot](../../bestiary/pilot.md), Part II themes A, B and D are its requirements
> source). What ships: body plans as flat part lists with tissue shares that sum to 1 (biped,
> quadruped, sessile, avian); `governs` (min) and `serves` (mean); innervation and supply; the function
> axis (a wound costs a capacity); the depth ladder; the sever (`missing`, the only instance delta);
> `sensoryPorts`, `locomotionModes`, `breathableMedia` and `thermalStrategy` on the plan;
> `Species.production[]` (read by taps); `SexedMixin`; age as a date; the anatomical faculty.
> **Left:** everything below. Every ruling is decided (§ 12, 2026-11-09), so this is ready for requirements.
> **Size:** a build, and the substrate of the bestiary catalog, hunting, foraging and the
> concealment-by-channel build
> ⭐ **The owner on compatibility:** *"you don't necessarily need to try so hard to be backwards compat.
> If it improves the design I'm willing to invest in the retrofit."* Shipped shapes named below are
> **retired**, not preserved.
> ⭐ **The owner on stability:** *"a lot more to have to maintain, but I'm fine with it so long as this
> stuff doesn't really change once we lay down most of the species."* The schema closes early; species
> are rows; variation lives on shared base rows that species `extends:`.

## 0. The principle **[DECIDED, 2026-11-07]**

*"If you think you can derive all that, yes, that would be the best plan."* **A creature's abilities come
from its parts**, never from lists on its species or plan. *Derive* means declared once on a part or a
material and derived for the creature. Some things physics produces (flight from wing loading,
swimming from buoyancy, strength from muscle share × mass, bite force, acuity from organ size,
production rate, mana capacity); some it never can, and those are declared (temperament and drives,
habitat and diet, a binding's three answers, lore and culture).

## 1. The grammar — body plans composed from modules **[DECIDED — "if it works for DF it works for me"]**

- **A module is a reusable subtree of parts**, each keeping its tissues, shares and roles: head · neck ·
  torso · limb pair (fore, hind, arm) · wing pair · tail · tentacle · fin set · shell · **amorphous** (the
  slime, the cube).
- **A plan is a list of modules with counts and attachments**: a biped is head + neck + torso + 2 arms +
  2 legs; the hydra 9 head-neck pairs + torso + 4 legs + tail; the spider a cephalothorax + abdomen + 4
  leg pairs; the griffin head + torso + 2 forelimbs + 2 hindlimbs + a wing pair + tail.
- **Modules carry relative weights and the shares renormalize**, so `lint:anatomy`'s *sum to 1* holds by
  construction. A species can adjust a module (longer arms, a heavier head).
- The four shipped plans are re-expressed as compositions (retrofit welcome). A new animal is a list of
  modules.

## 2. Three roles for a part **[DECIDED]**

- **governs** — runs a capacity (shipped).
- **serves** — is *for* a capacity: limbs, and **sense organs**. A sense is a capacity served by eyes,
  ears, nose, tongue, skin. Wounding the organ costs the sense. **Position gives field of view**
  (forward eyes see depth and miss behind; side eyes see nearly all round — you cannot easily sneak up
  on a deer). **Size gives acuity** (a bigger eye gathers more light).
- **produces** — a **gland fills a reserve** (the shipped reserve axis): venom, silk, ink, milk, musk,
  sweat, the mana organ. Its share sets rate and capacity; use drains it (venom metering, the dry bite);
  wounding it stops it.
- ⭐ **Retired:** `sensoryPorts` on the plan (ports move onto organs); **`Species.production[]`** — taps
  read organs (an udder is a gland, wool grows from integument), and taps' feedback law becomes a fact
  about the organ.

## 3. Integument and tissues **[DECIDED — the owner: "this is actually great, it'll really expand our economy"]**

**Every part has an integument, its outermost tissue** — skin, hide, fur, feather, scale, shell,
carapace — in a real material. One layer, four systems:

| system | the integument is |
|---|---|
| the covering stack (materials-response, the depth ladder) | **the innermost covering, always present** — natural armor through the same grids as plate |
| faces | **a face that carries coats and marks** — dirt, blood, mud, paint, a coating; tattoos and henna |
| butchery and tanning | **the pelt**, recording its wounds per part (the perfect pelt as one rule) |
| thermal | **insulation by textiles' own model** — fur's *clo* by depth; wet fur loses most of it; a winter coat is thicker |

**New tissue materials**, each real with density, toughness, insulation and dielectric: **keratin**
(horn, claw, hoof, hair, feather, scale) · **chitin** (⚠ fixes the shore crab's carapace authored as
*bone*) · **cartilage** · **dentine and enamel** (teeth, tusk, ivory — a mana store) · **fat and blubber**
· **shell** (calcium carbonate). ⚠ Collides with **material decomposition** (build-1), which regroups
material properties into capabilities; whichever merges second reconciles.

### 3a. ⭐⭐ Butchery and the supply chain

- **Skinning is its own step**, per part, the pelt carrying its wounds and the skinner's hand adding its
  own risk (butchery's *the hand on joint versus trim*). What comes off depends on the integument:
  tanning or fur dressing; plucking; scaling; cracking a shell.
- **Glands become named yields** — the venom sac, silk glands, the ink sac, ⭐ **musk pods** (castoreum
  from the beaver, musk from the musk deer — real perfumery, tying into the smell build), the whale's
  spermaceti organ, a mana organ.
- **Modules give every species a cut map for free** — cuts claim muscles, muscles live in modules, so a
  limb pair yields shank and shoulder on every animal that has one. ⭐ **A generated monster is
  butcherable on arrival.**
- **The by-product web:**

  | tissue | becomes | the trade |
  |---|---|---|
  | keratin (horn, hoof) | combs, buttons, ⭐ **horn panes for lanterns**, hoof glue | horner, glue-boiler |
  | feathers | **fletching**; **down** (insulation by textiles' model) | fletcher, upholsterer |
  | dentine, ivory, teeth | carving, dice, **mana stores** | carver, the socket trade |
  | bone | handles, dice, **bone meal** (the farm's soil), **bone char** | knacker, farm |
  | cartilage | gelatin, glue | glue-boiler |
  | fat, blubber | **rendered**: tallow candles (`dip` ships), ⭐ **soap with the potash build's lye**, lamp oil (the whale) | renderer, chandler, soap-boiler |
  | shell | **lime** (burnt shells — quicklime for mortar); mother-of-pearl | lime-burner, button-maker |
  | chitin | plates | armorer |
  | blood | black pudding (ships), blood meal | butcher, farm |
  | fish swim bladder | ⭐ **isinglass** — glue, and the brewer's clarifier | fishmonger, brewer |

  Most land on trades that ship or are slated (rendering's *knacker → tanner → chandler*, tanning,
  chandlery, potash, the farm, brewing). In mana terms: organs, blood and fat are **reagents**; horn,
  teeth, bone and ivory are **stores** — from each tissue's material, not a rule.

## 4. How parts combine, and what can govern **[DECIDED]**

| rule | means | examples |
|---|---|---|
| **min** — serial (shipped `governs`) | every one is needed | one brain, one heart, one spine |
| **mean** — shared (shipped `serves`) | each contributes | two legs, two eyes, eight arms |
| ⭐ **max** — redundant (new) | any surviving one suffices | two kidneys; ⭐ **the hydra's nine brains** — it fights on as you cut |

**A part's function has four sources:** **tissue** (shipped — how wounded) · ⭐ **a mark on its face**
(the golem: *emet* animates it, erase one letter to *met* and it stops) · ⭐ **its contents** (the kappa's
dish — bow, it spills, its strength falls) · ⭐ **its charge** (the wyvern's mana organ — flat means
grounded; adapted creatures weaken in dead zones). Folklore's weak points — *erase the word, make it
bow, drain it* — are properties of parts, so no creature is a special case.

## 5. Parts that change **[DECIDED]**

| state | what | examples |
|---|---|---|
| present · missing | shipped | |
| ⭐ **regrowing** | returning at a rate | the troll (a binding paid from its food); real slow regrowth (the starfish, the axolotl) |
| ⭐ **added** | an extra part on this instance | the hydra — cut a neck, two grow back |
| ⭐ **cycling** | grow · harden · cast · regrow on a seasonal clock | antlers; the winter coat; a duck's flight feathers |

- **Regrowth is stopped by the wound's channel** — a burned or dissolved stump has no living tissue to
  grow from: the troll's torch and the hydra's cautery as one rule, from harm's own record.
- **A severed part becomes a Thing** (the Thing branch, as the corpse did) — tissues and all; butchery,
  decomposition and forensics read it; the kappa's arm can be bargained back. Retires harm's *"a severed
  limb is an absence."*
- ⭐ **A fragment of an amorphous body above a minimum mass becomes a new creature** — fragmentation, how
  real planarians and starfish reproduce; fusion is the rule reversed.
- **Cycling runs on the shipped calendar windows** — ⭐ a cast antler drops as a Thing (**shed hunting**);
  a molting duck cannot fly for weeks (the eclipse molt); the winter pelt is the better pelt.

## 6. Variation inside a species **[DECIDED]**

- **Sex — dimorphism as module deltas**: added modules (antlers, a mane), scaled modules, a mass factor,
  glands (an udder that produces only when lactating — taps' feedback law gaining its real trigger). ⭐
  **Castration removes the dimorphism** — a steer becomes the **ox**, calmer, heavier, a draft animal.
- **Age — a growth curve and stage deltas**: size by a real growth curve (von Bertalanffy, as fisheries
  use); proportions by stage (the young have big heads and long legs); integument by stage (a fawn's
  spots); drives by stage (the hider); capabilities from the smaller body by the square-cube law.
- **Reproductive states**: in season, pregnant, lactating, with young — behind *"a mother never quits."*
- Game law can then say *stags only, in season*; the herdbook can tell a heifer from a cow.

## 7. Honesty checks **[DECIDED]**

- **A square-cube lint** — skeleton (bone stress grows with length), breathing (diffusion caps insects
  and spiders), flight (wing loading and power), heat (surface against volume). ⭐ **It never refuses an
  impossible creature — it demands it declare what pays**, a binding or a mana organ covering the deficit
  (the bestiary's authoring rule, checked at build). **Giants exist only where the field pays for them** —
  the danger map's second independent reason to follow the field.
- **A module's fill** — solid, sparse (a ribcage, a skeleton), hollow (a shell). A point attack against a
  sparse part delivers only the share of its energy that meets tissue — derived, never rolled (A6). Maces
  beat arrows on skeletons.
- ⭐ **Skeletons and zombies are not species** (the owner's catch): **a corpse of any species at a stage of
  decay, with a binding driving it.** The corpse keeps its modules and tissues; decay removes tissue share
  by share; the binding's cost scales with the mass it moves (a skeleton's walk about 7 W, a zombie's 45 W,
  pilot batch 2), so small things animate cheaply and a skeletal dragon is a heroic expense. Their rows
  retire.

## 8. Senses **[DECIDED]**

Each a capacity served by an organ, each revealing one channel and blind to the rest:

| sense | organ | reveals | ignores |
|---|---|---|---|
| echolocation | larynx and ears; a whale's melon | shape and distance in the dark — ⚠ active, audible to others | light |
| electroreception | ampullae; electroreceptors | living bodies by their nerves, in mud or murk | sight-concealment |
| ⭐ the mana sense | a mana organ, or the faculty | **charge** — how a mage tells a live stone from a dead one | everything else |
| vibration | feet, jaw, a web | footsteps, a fly in the web | silence in the air |
| scent on the wind | the nose | sources upwind | sources downwind |
| vision with acuity | eye size (§ 2) | detail at range, scaled by light | — |

⭐ **The mana sense discloses charge through a garment** — a mage can tell you carry *something* charged,
not what. A deliberate leak, to be honored by the size build's disclosure walk.

### 8a. ⭐⭐ The forcing principle for concealment and disguise

The owner: *"this is the first forcing principle I've seen."* **Every sense is a signal from a source,
through a medium, to an organ** — what a thing emits per channel, what the place carries per channel
(light level, wind, murk, ground, walls), what a viewer receives. Build-4's smell (*one thing that travels
from a source through the air to a nose*) is the template; light and acoustic speech already work this
way. Concealment becomes reducing a signal per channel (cover against sight, silence against sound, a
cover scent against the nose, cold iron against the mana sense); **disguise becomes changing a signature
per channel** (a costume does not change how you smell — the guard dog sees straight through it);
recognition is per channel.

⭐ **The owner's correction:** *"other human agents mostly rely on look even when it lies to them, and
don't really use their other senses much — that's not a fact of their biology, it's just habit and
culture. So disguising yourself for other agents versus for beasts are probably separate conversations
that need to converge somewhere."* **Capacity is not attention.** The convergence: one signal model read
through a **per-viewer attention weighting** — beasts attend by biology and drive, persons sight-first by
habit, trainable (the awareness Discipline), and a culture may differ. → **Its own build**
(concealment-by-channel), after smell lands. *"We'll see how concealment turns out."*

## 9. States and seasons **[DECIDED]**

**A body state with its own metabolic rate, a trigger, and effects on capability and drive:**

| state | trigger | metabolism | changes |
|---|---|---|---|
| denning | season and fat reserves | basal rate falls, burning fat, no food or water | asleep, wakeable, dangerous woken |
| hyperphagia | late season | intake drive up | bolder around camps |
| the rut | season and sex | eats less, burns mass | fear overridden |
| ectotherm temperature | the body's own temperature (shipped strategy; Q10 ships) | rate follows warmth | ⭐ speed and strength follow warmth — an adder at dawn is slow |
| ⭐ cryptobiosis | drying out | about zero | **the body becomes a Thing and revives when wetted**, keeping its lineage (the tardigrade, the slime's sclerotium, seeds, eggs) |

## 10. Metamorphosis, and changing shape **[DECIDED — "I can't wait for what it does for scaled-up content like giant caterpillars"]**

- **A species may declare a body plan per stage** (complete, incomplete and amphibian metamorphosis). **One
  instance, one identity** across the change. **Mass carries; none is created** (A13 — butterflies weigh
  less than their caterpillars).
- **Capabilities swap because the organs do** — diet, locomotion, senses, and ⭐ **breathing: a tadpole's
  gills, a frog's lungs — so `breathableMedia` derives from respiratory organs** and the plan field retires.
- ⭐ **The cocoon is the larva's own silk** — its gland spins a Thing the pupa lies inside; sericulture's
  reeling and stifling now have an anatomical reason. The trigger is development by **degree-days**
  (sericulture ships the clock).
- **Scaled up:** a giant caterpillar breathes by diffusion, so the square-cube lint makes it declare what
  pays — it lives near nodes; it **defoliates a stand** (forestry's wood is a place); its cocoon is a
  **silk windfall**; its adult looks nothing like it.
- **The curse is the same swap with a condition as trigger.** **Wounds carry across forms by module
  correspondence** (unmatched parts pass to the parent) — folklore's **repercussion** tell: wound the wolf's
  forepaw, and the miller's wife has a bandaged hand. **Held things drop** (no hands); **garments tear or slip
  by fit** (textiles ships fit); a pack falls off; ⭐ **you change back naked** — Bisclavret (Marie de France,
  12th c.).

## 11. ⭐⭐ Polymorph **[DECIDED — "good stuff"]**

The swap retires the avatar swap. magic-items' D18 kept **semblance** (looking like a wolf — still valid,
the illusion) and **body-swap** (moving a presence — the presence-hollowing slate's), and left true
transformation *prohibitive*, with three follow-ons on its list (capacity reprofiling, slot eviction on a
plan change, the choreography around `setSpecies`).

- **True polymorph is the same-identity swap triggered by a working** — a **timed getter shadow** on body
  plan and species (persistent content, temporary change); destruct it and you are yourself. The three
  follow-ons fall out: capacities derive from the new anatomy; slots follow fit and grip; the choreography
  *is* the swap.
- **The mind stays; capability follows the body** — ⭐ a wizard turned mouse cannot cast (casting gates on
  hands); a wolf cannot speak (no larynx) but can emote; a hawk flies.
- **Resisted by composure** (the Reeve Line, shipped).
- **Priced by mass** (A13):

  | into | the mass | price |
  |---|---|---|
  | the same mass (a 70 kg wolf) | reshaped — structural chemistry, the affordable band | **cheap**, a single charge |
  | smaller (a mouse) | ⭐ **the excess held in a pocket place** — the bag of holding's mechanism | **dear, held** — when it lapses you **snap back to full size, wherever you are** |
  | bigger (an ogre) | matter must come from somewhere — feedstock, as with reembodiment | nearly impossible on the fly |

- **A permanent polymorph is a setter** — a real change of species, a great working, and a values call (the
  race-allegory stance).

## 12. The rulings **[DECIDED, 2026-11-09]**

1. **Whale oil vs the fat dielectric: fix the row.** Lenses 1 and 2 decided it: one rule, derivable from a
   real number. Charge sits where ε is high (water-rich blood and muscle, ε ≈ 80), not in fat (ε ≈ 2–3), so
   **rendered oil is dead oil**. The economy lens agrees: the value is fresh tissue worked at sea or on ice, a
   cold-chain trade, which beats a barrel. The mana pack's table is corrected.
2. **Capacity depends on geometry: `C = εA/d`.** A stack of thin, wide plates stores more than a lump of the
   same stuff. That is why an electric organ is a stack, and it makes the plate cut a real butchery choice.
3. **The werewolf: priced, not forbidden.** By the owner's standing rule (never forbidden, only priced), a
   same-mass change of shape is affordable (§§ 10–11); arcane-science is amended. ⚠ **There is no permanent
   polymorph.** A change of species after character creation is an administrative procedure for now,
   outside the fiction.
4. **Animating a player's corpse: no special rule.** A player's corpse is meat like any other (mortality: a
   corpse is a Thing that never gets agency back, and it decomposes), so nothing about using one touches
   player state. A binding may move any corpse.
5. **The dragon's breath families: all five.** Lenses 1 and 2 decided it.
   - **Fire, acid and gas** are anatomy: a gland makes the substance and it is breathed out.
   - **Lightning** is a binding on a real **electric organ** (the eel's physics). It discharges by contact,
     or at range through a conductive spray.
   - **Cold** is a binding that pumps heat out, with a mana price derivable from the heat moved.

   Nothing is cut and nothing is fake; the chemical dragon is the easiest one to read.

Still open, and not this build's: the remaining pilot items (how lycanthropy is caught, the mana unit, the
living-culture calls, the realm-lore suggestions, the goblin pick). They belong to the
[bestiary slate](./bestiary-slate.md) and to the realm authors.

## Cross-references

[bestiary-slate](./bestiary-slate.md) · [the pilot](../../bestiary/pilot.md) ·
[spellbook-slate](./spellbook-slate.md) · [mana-economy-design-pack](./mana-economy-design-pack.md) Part 11 ·
[magic-items-slate](../tails/magic-items-slate.md) · [size-and-carrying-requirements](../../requirements/size-and-carrying-requirements.md) ·
[rendering-slate](../tails/rendering-slate.md)
