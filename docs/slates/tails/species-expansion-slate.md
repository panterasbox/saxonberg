# Species expansion — the casting palette (sketch)

> **Status: PARTIAL** — the substrate shipped
> ([race.md](../../subsystems/race.md)) and the first roster pass landed
> 2026-06-29: troll + ghoul NPC casts, gnome/half-elf/orc playable,
> ogre/kobold/satyr NPC, new name banks, the species-and-names pack.
> **Left:** the personhood casts (flesh golem · doppelganger · zombie ·
> synth · mind flayer) · the rest of the casting palette (guardians ·
> schemers · scholars · tricksters · the dead · the uncanny · the bar) ·
> the real attuned lineage replacing the `sensitivus` stub (still used by
> shipped NPCs, still unreplaced) · first sapients for the empty
> `fungi`/`plantae`/non-mammal `animalia` clades · retiring the two hybrid
> rows (`semieldarinus`/`semiorcus`, DECIDED 2026-08-11 — still shipped,
> still playable, unretired)
> **Size:** a wave

---

> **Casting doctrine — graduated.** The principle (cast species by
> persona), the recognizability gate, and the allegory layer's craft rules
> now live in [race.md § Why the roster is cast by persona](../../subsystems/race.md#why-the-roster-is-cast-by-persona).

## Why this is the who-counts canvas, not just flavor

The EU arc's engine is **personhood / who-counts** (see
[eternal-university-narrative-slate.md](../builds/eternal-university-narrative-slate.md)
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

*(The pre-expansion roster this section once audited is stale; the current,
accurate picture is [race.md](../../subsystems/race.md)'s Species roster
table — the `sensitivus` stub and the empty/near-empty clades it describes
are both still true today, just no longer novel.)*

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

*(The casting calls that motivated this — Katie → Troll, the ME → Ghoul —
shipped and are documented in [race.md](../../subsystems/race.md)'s roster
table, which names both as "Katie's cast" / "Dr. Vance's cast". The species
seed fields a cast draws on — `_bodyPlanPath`, `_defaultMaterialPath`,
`innateMixins`, `vitalProfile`, `lifecycleStates`, `reproductiveMode`,
`circadianBand`, `diet`, `visionProfile`, `nameBankKeys` — are all documented
on the `Species` template in [race.md](../../subsystems/race.md) § Species —
capability.)*

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
6. *(resolved — the first pass scoped to troll/ghoul, the EU arc's own needs;
   see the canonical status block above.)*

---

## ⭐ DECIDED (2026-08-11) — no hybrid species

`semieldarinus` (half-elf) and `semiorcus` (half-orc) ship as **hybrids
modeled as `Species` rows**, and that is wrong. **They are to be
retired**; the roster stays a closed set of true species and gets
*more* distinct, not less.

**The taxonomy was never the problem.** All sixteen are `hominidae/homo/`
— congeners, and congeneric hybridization is real (*H. sapiens* ×
*H. neanderthalensis* produced fertile offspring; non-African humans
carry ~1–2% Neanderthal ancestry). **A hybrid just isn't a species.** A
binomial asserts a population that breeds true, which a hybrid
definitionally isn't: half-elf × half-elf yields another `semieldarinus`,
half-elf × elf has no row and never can, and sixteen species is **120
pairs of which two are authored.**

⚠ **Deriving hybrids by blending parent species was considered and
rejected** — because it breaks against *this slate's own direction*.
`innateMixins: ["CasterMixin"]` is already a capability list, not a
number: union it and every hybrid strictly dominates, intersect it and
every hybrid is strictly worse. Specials, "where you can go" differences,
and vocation affinities are **discrete by nature — half a gill is
nothing.** Building blend machinery would also pressure species to stay
numeric, letting the implementation constrain the design.

**Migration — ⭐ unlist before you delete.** Removing the two from the
char-gen roster is a config change that stops new half-elves immediately
at near-zero risk. Deleting the `Species` rows is a separate migration:
the seeder is **insert-only** (editing the rows does nothing), and live
characters may hold those class refs. The two steps are independent and
should stay that way.

**Vocation synergy, when it lands, should be *access* not *aptitude*** —
elven workshops hiring elves, elven guilds admitting elves — because
access changes *who you need* (the quality criterion) while an aptitude
bonus is a rank. It also rides the shipped groups/access/contacts stack
instead of minting a new mechanic.

Full reasoning, and the char-gen restructure this came out of:
[lineage-slate](../builds/lineage-slate.md).

---

*See also:* [race.md](../../subsystems/race.md) (the built substrate) ·
[eternal-university-narrative-slate.md](../builds/eternal-university-narrative-slate.md)
(the who-counts engine the diversity serves) · the character sheets under
`docs/staging/eternal-university/npcs/` (the `Species` casting slot in action).
