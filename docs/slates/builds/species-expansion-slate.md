# Species expansion — the casting palette (sketch)

> **Status: sketch / pre-requirements.** A **later, separate build** — this doc
> captures the *design philosophy* and a *casting palette* to build from, not a
> spec. Authored 2026-06-27 in a design pass while carving the EU murder arc's
> cast (the medical examiner). The substrate (`lib/species`, the Linnaean
> `Clade` tree, `BodyPlan`, `Species`, `NameBank`) is **already built** — see
> [race.md](../../subsystems/race.md); this is about *content* (more species)
> and the principle for choosing them.
>
> **Scope:** roster expansion, **NPC-first** (player-playability per species is
> a separate, later question). Influence: **NetHack** (its race/monster personas,
> D&D/Tolkien-derived) + the casting principle below.
>
> **First pass BUILT (2026-06-29, `feature/species-and-names-pack`).** Per
> Open-Q6 (EU corner first), the two casting calls — **troll** (`homo/trollius`,
> Katie) and **ghoul** (`homo/ghulius`, Dr. Vance) — landed as NPC-first
> `Species` seeds. Then a cheap, data-only roster expansion: **gnome / half-elf
> / orc** added **playable** (in the char-gen roster), plus NPC-first **ogre /
> kobold / satyr**. All mundane living-people (the "brute"/"undead" framings are
> slander, not biology). New `gnomish` + `sylvan` name banks; the rest reuse
> existing pools. Shipped alongside the migration of the whole `Species`/`Clade`
> tree + the name banks out of the kernel seed tree into the
> `@saxonberg/content-species-and-names` content pack. The deeper *personhood*
> casts (flesh-golem, doppelganger, zombie, synth — they want mechanics) and the
> rest of the palette below stay deferred (JIT, carve-by-carve).

---

## The principle: cast species by persona

A species is **not** primarily biology in this design — it is **casting.** Pick
a species whose **pop-culture persona** instantly characterizes the role, the
way casting a known character actor pre-loads a part. Say "troll" and the player
already feels the gruff, territorial, immovable threshold-guardian before a line
is written. **The archetype does the negative-space carving work for free** — it
carries the parts you'd otherwise chisel by hand (and NPC carves are expensive,
so this is leverage).

The test for a good cast: **the archetype matches the role's *function.*** Katie
reads as a *troll* not randomly but because a troll *is* a bridge-keeper who
decides who crosses and can be won over — which is exactly her job (she holds
the keys, gates the room, "gang when she wants, boss when she has to"). When the
persona and the function rhyme, the casting feels inevitable.

## The gate: recognizability (audience-relative)

The persona only does its work **if the audience holds it.** A reference the
player doesn't recognize loads *nothing* — the shortcut fails and you've spent a
"weird" slot for no payoff. And recognition is **audience-relative**: for this
game's audience (Western, gamer, NetHack/D&D-literate), the shared vocabulary is
essentially the **D&D / Tolkien / NetHack canon.** Cast from the library they
actually own.

This does **not** mean a monocultural world. Diversity comes from:

1. **The breadth of the canon itself** — it's deep and full of distinct personas.
2. **Mainstreamed global creatures** — ones that crossed into recognition
   *through* D&D / anime / games and now read instantly: **naga, kitsune, oni,
   djinn, ghoul.** These keep the world genuinely cross-cultural *without*
   betting on obscurity.
3. **Obscure folklore as *spice*** — domovoi, rusalka, kappa, leshy, selkie,
   tengu, banshee, draugr, peri… used **only** when a *specific character*
   carries the recognition load (the species isn't doing it alone) or with
   in-world support. Never as load-bearing instant-cast. The cross-cultural
   sentiment is on-brand; it's just subordinate to recognizability.

**Respectful casting:** for personas from **living or sacred traditions** (naga,
rakshasa, djinn, the spider-trickster), cast the *archetype* with care — evoke
it, don't caricature a faith.

## The allegory layer: stereotypes at a safe remove

Beneath casting sits the *why*. Species are **defamiliarized vehicles for racial
/ group allegory**: a real-world stereotype gets to *express itself* through a
species' traits, so the game can **comment on** prejudice without dragging in
real-life politics directly (the Le Guin move; §5's "strip the tribal triggers so
people actually reason"). The engine fits it — **belief/recognition is "how a
person is seen vs. who they are," and prejudice *is* that gap** (a viewer's
projection), so a group bias is modeled **viewer-side, never as a species stat.**

The craft that keeps it *commentary* and not *reproduction* (load-bearing):

1. **The essentialism trap.** The allegory dies — and validates the bigotry —
   the moment the stereotype is **true in the fiction** (orcs really evil = a
   biological alibi). The prejudice must live as **projection, false-as-a-law.**
2. **Abstract the dynamic; never reskin a real group 1:1** (caricature — and it
   collapses the protective remove). A species carries the *mechanism* of a
   prejudice, not a costume over one people.
3. **Honest underdetermination** (§5) — leave "is it true?" unresolved
   (*true-of-some, false-as-a-law* — how prejudice is actually wrong).
4. **No "good one who escaped her kind"** (the model-minority trap) — an
   admirable member is excellent *as* their kind, not by transcending it.

Exemplar: **the ghoul** = the stigmatized death-caste (Dr. Vance) — necessary
death-work, despised for its deathliness, falsely feared as predatory; *the
contempt is the cover.* See her [sheet](../../staging/eternal-university/npcs/medical-examiner.md).

A general aesthetic rides alongside: **lean into genre conventions hard, up to
but not including cliché** — ride the recognizable convention, then swerve right
before it goes predictable.

## Why this is the who-counts canvas, not just flavor

The EU arc's engine is **personhood / who-counts** (see
[eternal-university-narrative-slate.md](./eternal-university-narrative-slate.md)
§5, §7). A world of many *kinds* of person is the canvas that question is painted
on — so the **highest-value casts carry a recognizable persona *and* press on
"what is one person?"** They earn their keep twice. The standouts (all
NetHack/D&D-recognizable):

- **Flesh golem** † — Frankenstein: a person *assembled from dead bodies.* The
  §14 corpse-laundering made a species.
- **Doppelganger** † — wears your shape, isn't you. The §7 phantom/Sybil.
- **Zombie** † — the body with the person *gone*; the question literalized.
- **Lycanthrope / werewolf** † — which self is the real one?
- **Mind flayer** † — the alien intellect that *wears or eats* a person; quietly
  resonant with the §11/§15.1 banal handler.
- **Succubus / incubus** † — the false-face.
- **Clone** † / **uplift** † / **synth-android** † — the copy, the lifted, the
  made.

## What we have now (the gap)

A **D&D roster reskinned as Homo subspecies** + token non-humanoids:

- **`homo/`** — `sapiens` (human), `eldarinus` (elf), `khazadicus` (dwarf),
  `periannath` (halfling), `semiorcus` (half-orc), `draconicus` (draconic),
  `infernalis` (tiefling), `sensitivus` (**attuned — a throwaway STUB**, flagged
  in-seed for replacement by a real attuned-lineage pass).
- **Non-homo tokens** proving the taxonomy works — `animalia/…/catesbeianus`
  (bullfrog), `plantae/…/wallisii` (peace lily, sessile), `constructa/…/tutor-bot`
  (robot).
- **Clades** stand ready and near-empty: `animalia` (non-mammal), `plantae`,
  `fungi`, `constructa`.

The roster is ~all humanoid-fantasy. The expansion fills the personas the D&D
core misses and lights up the empty clades — *cast by persona, gated by
recognizability.*

## The casting palette (by bucket)

`†` = also stresses personhood (who-counts double-dipper). Origin noted only
where it's a mainstreamed-global or spice.

**Guardians & muscle** (threshold / home / brute)
- **Troll** (→ Katie; bouncers, supers, the bridge you win over) · **Ogre**
  (the dim or gentle heavy) · **Minotaur** (the labyrinth guardian) · **Golem**
  † (clay/stone/iron — the made protector) · **Oni** (mainstreamed JP — the
  disciplined martial enforcer, distinct from the ogre)

**Schemers & mercantile** (the corpo layer)
- **Goblin** (the teller, the fixer — Gringotts already made goblins finance)
  · **Kobold** (the sneaky servant/pest) · **Leprechaun** (the greedy
  gold-thief) · **Gnoll** (the savage pack) · **Imp / quasit** (the
  contract-bound functionary)

**Scholars & makers** (the *university* writes these in)
- **Gnome** (the tinkerer / eccentric professor — the NetHack Mines) ·
  **Centaur** (the scholar-archer / wandering mentor)

**Tricksters & shapeshifters** (identity = the theme †)
- **Doppelganger** † · **Werewolf / lycanthrope** † · **Succubus / incubus** †
  · **Nymph** (NetHack's thieving charmer) · **Kitsune** (mainstreamed JP —
  the nine-tailed shapeshifter) · **Fae** (glamour, bargains, alien morality)

**The dead & the dread** (morgue / roll-clock †; the `undead` lifecycle exists)
- **Ghoul** (→ the ME's native habitat) · **Vampire** (old-money predator) ·
  **Lich** (the undead archmage) · **Mummy** (the cursed dead) · **Zombie** †
  (the body without the person) · **Wight / wraith** (the hungry dead)

**The uncanny / feared** (the outcast, the un-looked-at)
- **Mind flayer** † (the alien intellect) · **Gorgon / medusa / cockatrice**
  (the petrifying outcast nobody will *look* at — and looking is the whole arc)
  · **Naga** (mainstreamed — the D&D sage-guardian)

**The attuned & the bound** (the aether; replacing the `sensitivus` stub)
- **Djinni / efreeti** (mainstreamed Persian/Arabic — bound, elemental, tricky)
  · *(the real born-attuned lineage lives here)*

**The bar & the revel** (Dave's)
- **Satyr** (the hedonist reveler) · **Nymph** · **Leprechaun**

**The made & the copied** (the AI core †)
- **Synth / android** † (extends the tutor-bot — the allegory in a person-shaped
  body) · **Flesh golem** † · **Doppelganger** † · **Clone** † · **Uplift** †
  · **Cyborg** (between flesh and machine)

## Casting calls so far

- **Katie (dorm property manager) → Troll.** Apt: the threshold-guardian
  archetype *is* her function. See
  [property-manager.md](../../staging/eternal-university/npcs/property-manager.md).
- **The medical examiner → Ghoul.** The morgue is the ghoul's native habitat;
  the persona and the setting rhyme. See
  [medical-examiner.md](../../staging/eternal-university/npcs/medical-examiner.md).

These feed the **`Species` field of the character-sheet format** directly — the
field is a *casting slot*, filled by persona.

## How a species expresses mechanically (the substrate is ready)

A `Species` seed already speaks through real hooks, so a cast carries weight, not
just a name (see a seed like `homo/sensitivus.yaml`, `tutor-bot/mk-iv.yaml`):

- **`_bodyPlanPath`** — biped / quadruped / sessile / … (a sessile sapient, a
  swarm) · **`_defaultMaterialPath`** — flesh / alloy / … (a golem of stone, a
  synth of cultured tissue) · **`innateMixins`** — e.g. `AetherMixin` for
  born-attuned (the djinn/attuned lineage), or its absence for the *aether-blind*
  (a mind no comm can reach — outside the Sybil channel by nature) ·
  **`vitalProfile`** — the ecto- vs endotherm split is live in
  [thermal.md](../../subsystems/thermal.md) (a saurian/cold-blood genuinely
  *plays* differently: torpor, the regulation system) · **`lifecycleStates`** —
  `alive/dead/undead` vs `powered/unpowered/destroyed` (a construct's "death" is
  decommissioning — no certificate; the §7 uncounted made mechanical) ·
  **`reproductiveMode`** — `sexual` vs `manufactured` · **`circadianBand`** —
  diurnal / nocturnal / aperiodic · **`diet`**, **`visionProfile`**,
  **`nameBankKeys`** (a `NameBank` per culture/species).

## Open questions / dials (for the build)

1. **NPC-only vs. playable** — which casts are world-texture only, and which
   graduate to player species (char-gen polish, NameBank, portraits, dossier).
2. **The attuned lineage** — the real species that *replaces* `sensitivus`
   (djinn/peri register), and whether to also author an **aether-blind** species
   (mechanically rich, thematically loaded).
3. **Constructa depth** — the obsolete servitor, the grown/wetware synth — how
   far to push the made-person vein that feeds the who-counts arc.
4. **Clade buildout order** — which empty clades (`fungi`, non-mammal
   `animalia`, `plantae`) get a first real sapient, and whether any are pure
   spice.
5. **The spice budget** — how many obscure-folklore casts the world can carry
   before recognizability erodes (lean: few, each character-carried).
6. **EU corner first** — scope the first pass to the species the EU murder arc
   actually needs (troll, ghoul, + whoever the next carves demand), JIT, rather
   than building the whole palette up front.

---

*See also:* [race.md](../../subsystems/race.md) (the built substrate) ·
[eternal-university-narrative-slate.md](./eternal-university-narrative-slate.md)
(the who-counts engine the diversity serves) · the character sheets under
`docs/staging/eternal-university/npcs/` (the `Species` casting slot in action).
