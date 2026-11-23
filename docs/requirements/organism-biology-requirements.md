# Organism biology — requirements

**Kind:** feature
**Leads from:** kernel. First consumers ship in this build: ranching's
livestock (sex, castration into the ox, the udder that gives only while
lactating), the bullfrog and the silkworm (metamorphosis), the fish and the
shore crab (fin sets, the swim bladder, chitin, a regrown claw), and a new
whale. Next consumer: the whaling build.

A creature's abilities come from its parts. Today a body plan is a flat
list of parts with tissue shares, and a lot of what a creature can do is
listed on the side: senses on the plan, yields on the species, breathing on
the plan, a hand-written butchery list per animal. This build makes the body
the source. A plan is composed from reusable modules. Every part governs,
serves or produces. Every part has an integument that is at once armor, a
face, the pelt and insulation. The body changes with sex, age, season and
stage, and a severed part is a thing you can pick up. The payoff is
economic as much as biological: a carcass yields a pelt, glands, fat to
render, horn, bone, chitin and shell, the feedstock list for tanning,
rendering, chandlery, soap, glue, lime and isinglass. A new animal is rows,
and it is butcherable the day it is authored.

Seeding slate: [organism-biology-slate](../slates/engine/organism-biology-slate.md)
(every ruling decided 2026-11-09). It also absorbs the sense-organs-as-parts
half of [site-conditions-slate](../slates/engine/site-conditions-slate.md).
The reuse ledger for the plan is in the organism-biology slate,
§ *Reuse ledger for the plan*.

## What already exists

- **Body plans:** nine, not the four the slate's header names (avian,
  biped, canid, fowl, quadruped, sessile, swine; fish and crustacean in the
  fishing pack). Each is a flat part list. A left and a right leg are each
  written out in full. Shares are a fraction of whole-body mass, and a gate
  holds them summing to one.
- **Species:** 91 rows across 15 packs: 41 plants on the sessile plan, 17
  bipeds, 12 quadrupeds, 5 fish, and one each of canary, hen, dog, pig and
  shore crab. The bee and the silkworm name no plan at all. There are no
  skeleton or zombie species.
- **What a part does today:** a part *governs* a capacity (every one is
  needed) or *serves* one (each contributes). Parts are innervated and
  supplied, a wound lowers a part's function and everything downstream of
  it, excess harm walks inward through the depth ladder, and a severe
  enough blow severs a part, which today is only an absence.
- **Senses:** declared on the plan as ports, not parts. No wound can blind
  anything. The plan authors a port's position and nothing reads it.
  Acuity exists only as an authored smell grade and an authored vision
  profile against light.
- **Yields:** the taps (milk, wool, eggs, honey, sap, gum, latex) read a
  production list on the species. Butchery's cuts claim muscles, but each
  species hand-writes its own yield list (15 of them). Hides and bones come
  off four species. Nothing yields a pelt, a gland, horn, chitin or shell,
  and nothing skins, plucks or scales.
- **Sex and age:** sex lives on the body already and is validated by the
  species' determination system. Age is a birth date with a growth curve
  and life stages. Ranching treats the individual animal as the base case
  and the herd as its compression. Lactation is milk's event window. Breed
  records *served* and nothing after. The ox exists only as a working-animal
  role. There is no castration, pregnancy or per-animal reproductive state.
- **Materials:** horn, leather, rawhide, wool, down, bone, flesh, muscle,
  blood, bone meal, animal fat, leaf fat, tallow, beeswax, eggshell and
  quicklime exist. Keratin (as a tissue), chitin, cartilage, dentine,
  enamel, ivory, blubber, shell, feather, fur, scale and pelt do not. The
  shore crab's carapace is authored as bone.
- **Insulation:** no creature is insulated by its own coat. Only worn
  clothing counts, through textiles' per-part, wet-aware insulation model,
  which is ready to take an integument.
- **The sinks that ship:** tanning (`salt-hide`, `tan`), tallow rendering
  as a cooking recipe, chandlery's candles and soap over potash lye, bone
  to bone meal on the field, sausage and black pudding.
- **Overlapping slates:**
  - bestiary: keeps the catalog, sentience and encounters, and handed the
    model here;
  - hunting: consumes sex, season and the pelt;
  - physiology: owns sever gameplay and the living way back;
  - site-conditions: planned eyes and ears as parts, which is absorbed
    here;
  - senses and cover-and-concealment: own the new channels and their
    reading side;
  - decomposition, mana-economy and spellbook: own bindings, charge and
    polymorph;
  - rendering and butchery: own horn, glue and gelatin as trades.
- **Builds in flight:** none designs bodies or species. naming-overhaul
  touches the species catalogue's name bank, which is a merge seam, not a
  design overlap.

**Therefore what is genuinely new here is:**
- module composition;
- the *produces* role and glands as stores;
- the integument and the tissue materials it needs;
- skinning, gland yields and cut maps derived from the body;
- the redundant combination rule;
- parts that regrow and cycle, and the severed part as a thing;
- per-animal dimorphism, castration and reproductive states;
- the square-cube check and module fill;
- sense organs as parts, with vision's acuity and field of view derived
  from the eye;
- body states;
- metamorphosis as one identity across per-stage plans, and the form swap
  it performs.

## Goals

- **A body plan is a composition of modules**, and the nine shipped plans
  are re-expressed that way. A new animal is a list of modules with counts
  and adjustments, needing no code. Shares hold by construction.
- **Every ability a creature has is derived from its parts**, or declared
  where physics cannot produce it (temperament, drives, diet, habitat,
  lore). Senses, breathing, locomotion and yields stop being lists on the
  side.
- **Every part has an integument in a real material**, and that one layer
  acts as natural armor, as a face that takes dirt, blood and paint, as the
  pelt that records the wounds it took, and as insulation. A wet coat loses
  most of it, and a shorn or plucked animal is colder.
- **A carcass yields what its body is made of.** The pelt (or feathers, or
  scales, or a shell) comes off first, per part, carrying its wounds and the
  skinner's hand. Glands come off as named yields. Cuts come from the
  modules, so every animal with a limb pair yields shank and shoulder, and a
  newly authored animal is butcherable on arrival. Fat and blubber render,
  horn and hoof come off as keratin, shell is shell, and the crab's carapace
  is chitin.
- **Glands fill stores and use drains them.** The udder, the wool coat, the
  silk gland, the spermaceti organ and the venom sac are parts. The taps
  read the organ, and the taps' feedback law becomes a fact about the organ.
  Wounding a gland stops it.
- **Sense organs are parts.** Wound an eye and the sight it served falls.
  Eye size gives acuity, and eye placement gives how much of its
  surroundings a creature watches at once, so a wide-eyed grazer is harder
  to sneak up on or slip past than a forward-eyed hunter.
- **Parts combine three ways:** every one needed (one heart), each
  contributing (two legs), and ⭐ any surviving one sufficing (two kidneys).
- **Parts change.** A crab regrows a lost claw at its moult. A coat cycles
  with the season, and the winter pelt is the better pelt. A severed part is
  a thing in the world, with its tissues, which can be butchered and which
  spoils. A burned or dissolved stump does not regrow.
- **Bodies vary within a species.** Sex adds and scales modules and glands.
  Castration removes the dimorphism, so a castrated bull calf grows into the
  ox, heavier and calmer. Age follows a real growth curve with stage changes
  in proportions, coat and drives. In season, pregnant, lactating and with
  young are states of the body, and lactation is what turns the udder on.
- **Body states:** a state carries its own metabolic rate, trigger and
  effects. The bullfrog dens in the mud over winter, livestock come into
  season and the rut, and a cold-blooded body is slow when it is cold.
- **Metamorphosis:** a species may have a plan per stage, and one creature
  keeps one identity across the change. Mass carries over and none is
  created. Capabilities swap because the organs do: a tadpole's gills
  become a frog's lungs, and what it can breathe follows. The silkworm is an
  individual creature that moves larva → pupa → moth. Its cocoon is spun
  from its own silk gland, and the tray stays the place a keeper rears
  thousands of them.
- **An honesty check over every species:** bone stress, breathing by
  diffusion, flight and heat against size. It never refuses a creature; one
  over the limit must declare what pays for it. Every module has a fill
  (solid, sparse, hollow), and a point attack against a sparse or hollow
  part delivers only the share of its energy that meets tissue.
- **The whale exists:** a cetacean, built from modules as rows, with
  blubber, a spermaceti organ, baleen or teeth and the melon. It is
  butcherable for all of them, and its rendered blubber becomes lamp oil.

## Non-goals

- **The four new sense channels** (echolocation, electroreception,
  vibration, scent on the wind), and the reading side of every channel →
  the concealment-by-channel build (organism-biology § 8a) with
  [senses-slate](../slates/engine/senses-slate.md). Nothing would read them
  before that build.
- **Concealment and disguise per channel**, and per-viewer attention
  weighting → concealment-by-channel, after this.
- **Everything magic pays for:**
  - the mana organ, a part's charge and the mana sense →
    [mana-economy-design-pack](../slates/engine/mana-economy-design-pack.md);
  - bindings: skeletons and zombies as animated corpses, the troll's paid
    regrowth, the dragon's lightning and cold →
    [spellbook-slate](../slates/engine/spellbook-slate.md) with
    [decomposition-slate](../slates/engine/decomposition-slate.md);
  - polymorph and the curse's condition trigger → spellbook-slate. This
    build ships the form swap with development as its only trigger, and
    names the attach point.
- **A part's function from a mark or from its contents** (the golem's word,
  the kappa's dish) → [bestiary-slate](../slates/world/bestiary-slate.md).
  No creature in content uses either.
- **The *added* part state** (the hydra's two-for-one) → bestiary-slate.
  Nothing outside magic and myth adds a part.
- **Cryptobiosis** (a body becoming a thing and reviving when wetted) →
  bestiary-slate. No creature in content needs it yet.
- **Conception, gestation and birth** → [ranching-slate](../slates/trades/ranching-slate.md)'s
  breeding loop. This build ships the states; a served cow does not yet
  calve.
- **Tattoos and henna on the integument's face** → nowhere yet; it wants a
  tattooist's trade slate. The face takes soil and coats now.
- **Horn, glue and gelatin as trades** → [butchery-slate](../slates/trades/butchery-slate.md)
  and [rendering-slate](../slates/trades/rendering-slate.md). This build
  yields the tissues; it does not open the horner's or the glue-boiler's
  shop.
- **The hunt, the whaleboat, the try-works and the cutting-in** → the
  whaling build. This build authors the whale they hunt.
- **Sever gameplay beyond the severed part being a thing** (reattachment,
  the living way back, prosthetics) →
  [physiology-slate](../slates/engine/physiology-slate.md) §7h and
  [recovery-slate](../slates/engine/recovery-slate.md).

## Placement

**Kernel and the species pack.** The body model (modules, roles,
integument, combination, part states, body states, the swap, the honesty
check) is kernel substrate. No trade owns biology, and every animal RGO
sits on it (review question R3: it makes sense with no trade at all).
Modules and shared base rows live with the species catalogue, in the
species-and-names pack. Tissue materials go in the commons with the other
tissues. Yields and the trades they feed stay in their packs: ranching's
livestock, fishing's fish and crab, sericulture's silkworm,
the whale in the fishing pack beside the other sea creatures until whaling
gives it a home.

**A second instance needs no code:** a new animal is a species row naming
modules, a new module is rows, and a new tissue is a material row whose
kind already exists.

## Collisions

- **All 91 species rows and the nine plans** are re-expressed. The owner
  accepted the retrofit: shapes the slate names are retired, not preserved.
  The 41 plants keep the sessile plan.
- **Ranching:** the herds of cattle, sheep, goats, pigs and hens at
  Hearts Delight and the university, the herdbooks, the ox register (which
  authors no females), the dogs, milking and shearing. Milking now reads a
  lactating udder. A castration in a herd is recorded in its herdbook. The
  working ox becomes a castrated animal rather than a role alone.
- **Butchery:** the hanging hog carcass and every cut on the 15 species
  that have yield lists. The same cuts must still come off, now derived
  from the body. The pelt comes off before the cuts.
- **Tanning:** `salt-hide` and `tan` receive pelts carrying their wounds
  instead of a flat hide.
- **Fishing:** the five fish and the shore crab on the world's waters.
  Their landing, keepnet and cleaning are untouched. The crab's carapace
  becomes chitin, and a crab missing a claw regrows it.
- **Sericulture:** the rearing trays, egg lots, stifling and `unwind`.
  Individual worms become the base case, with the tray as their
  compression (ranching's precedent). The deadline, the stifle and the reel
  must come out the same.
- **Apiculture:** the bee gets a body plan. The colony stays the hive's
  state.
- **The bullfrog at Hollow Mere** becomes a creature that was a tadpole and
  dens over winter.
- **The newbie-wilds wolf, the cat, the canary and the pit pony, the mule
  and the draft horse:** re-expressed and given integuments. The wolf is
  the combat case for an eye wound and a severed foreleg.
- **Persons:** all 16 human species and the *sensitivus* NPCs move to the
  composed biped and gain sense organs as parts, so an eye wound affects
  a player. Skin as an integument takes the body's existing soiling.
- **The tutor-bot** is a biped with no tissue anatomy. Its row must stay
  valid.

There are no new places, so there is no new light to check.

## Surface decisions

### What ships (scope)

Every mechanism that runs without magic; the pieces magic pays for get a
named attach point and a destination slate (owner, 2026-11-21).

### Senses: organs, plus vision now

Sense organs become parts, and vision derives acuity from eye size and how
much it watches at once from eye placement. Both have readers today:
acuity through how much a viewer sees in a light, and the watched share
through the detection check that sneaking and hiding run. There is no
facing anywhere in the game, so *behind* is not a direction. It is the
blind share of a creature's surroundings. The four new channels wait for
the build that reads them (owner, 2026-11-21).

### Reproduction: states, not birth

In season, pregnant, lactating and with young are states that do things:
lactation turns the udder on, season and the rut change behavior, and game
law can read them. Birth stays with ranching's breeding loop (owner,
2026-11-21).

### Metamorphosis: the bullfrog and the silkworm both

The frog is the plain proof: tadpole to frog, one identity, gills to lungs.
The silkworm becomes individual creatures moving larva → pupa → moth, its
cocoon spun from its own gland (owner, 2026-11-21). *The nearest pattern
decides the shape:* ranching made the individual the base case and the
herd its compression, so a tray holds worms as a compression and a keeper
can still rear thousands without the world holding thousands of bodies.
Sericulture's deadline, stifle and reel must read the same to a keeper.

### The whale ships here

It is authored as rows to prove that a new animal needs no code and is
butcherable on arrival, and so that whaling builds the hunt on a whale that
already exists (owner, 2026-11-21).

### Skinning is a butchery step, not a new verb

Taking the integument off is the first step of breaking a carcass down, so
it goes through `butcher <carcass> for pelt`, and likewise for feathers,
scales or a shell. The integument decides what comes off, so plucking and
scaling are the same act on a different coat. *One verb per act:* the act
is breaking the carcass down. The skinner's hand carries its own risk, the
same rule as the joint versus the trim.

### Castration is an operation, not a new verb

Castration is one more operation in medicine's catalogue:
`operate <animal> for castration`. Medicine's rule is that a second
operation is a file, and amputation already severs a part the same way.
It works on any male body (a bull calf, a pit pony, a dog), it is a real
act with a season and a risk, and the body answers a refusal in its own
words. On a herd animal it is recorded in the herdbook (owner, 2026-11-22,
replacing the earlier `castrate` verb).

### Rendered oil is dead oil (ruling 12.1)

Charge sits in water-rich tissue, not in fat, so whale oil carries none.
That correction to the mana pack's table is recorded, and nothing in this
build reads charge.

### Regrowth needs a non-magic consumer, and has two

The crab's claw at its moult, and the coat's seasonal cycle. Antlers wait
for a deer (hunting); the troll and the hydra wait for magic and myth.

### The redundant rule needs a consumer, and has one

Paired kidneys in the composed biped and quadruped: lose one and the body
carries on. The hydra's nine brains wait for the bestiary.

## Lens pass

1. **Pedagogy.** Real anatomy and physiology become derivable:
   - why a deer is hard to stalk (eye placement);
   - why an ox is a castrated bull;
   - why a whale is all fat (heat against volume in cold water);
   - why insects stay small (breathing by diffusion);
   - why a winter pelt is worth more;
   - why a tadpole drowns in air and a frog in a pond's mud doesn't.

   The disciplines exercised are the butcher's hand, animal husbandry,
   sericulture and the anatomical faculty. Every number has a real source:
   tissue densities, growth curves, square-cube scaling.
2. **Creative expression.** In the ordinary case, a new animal is rows: a
   list of modules, an integument per module, glands, and adjustments. No
   code, and it is butcherable, skinnable and tappable on arrival. In the
   bespoke case, a new module or a new tissue whose kind exists is still
   rows; a new kind is one class in the author's pack. ⭐ *Personalization
   is a derivative of supply-chain depth:* one carcass now feeds a dozen
   trades.
3. **Immersion and participation.** 3a: the fiction stops betraying itself.
   A blinded wolf no longer sees, a shorn sheep is cold, a skinned pelt
   shows the arrow hole, and a crab is no longer made of bone. 3b: players
   can do things we did not plan: geld a herd to sell oxen, prize a
   flawless winter pelt over a summer one, trade spermaceti before anyone
   hunts a whale.
4. **Values.** The square-cube check never refuses an author. It asks what
   pays, so the impossible creature is priced, never forbidden. Castration
   is a real husbandry act shown plainly, with no euphemism and no gore
   beyond what butchery already shows. *Grain, not invariant:* a realm may
   author creatures that break physics, provided they declare what pays.
5. **Continuity.** Biology does not change with the epoch; what changes is
   what the yields are used for. Whale oil gives way to kerosene, horn
   panes to glass, tallow to paraffin. Every yield is a row, so the obsolete
   half is just a row nobody buys, and the whale is still a whale when
   nobody renders it.
6. **Economy.** It produces pelts, feathers, down, horn, hoof, bone,
   cartilage, chitin, shell, fat, blubber, glands and the ox. It consumes
   the slaughter that ranching, fishing and soon whaling already make. The
   demand was there first: tanning, chandlery, soap, the field's bone meal
   and lamp oil all ship and were short of feedstock. Who pays: the
   butcher's labor and the skinner's hand.
7. **Governance.** Nothing here judges a person. Game law (*stags only, in
   season*) can now be written against observable body state, and the
   criterion it would read is on the animal.

## The drive

Each step is tagged **pace** (`instant` · `short` · `staged` · `span`) and
**assertion** (`player` · `staged`).

### Blocking drive

1. *instant · staged.* A wizard stages a freshly killed cow carcass with an
   arrow wound in its flank. The player `butcher`s it `for pelt`. A pelt
   comes off, recording the hole in the flank and any nick from the
   player's own hand. `look` at the pelt says so.
2. *instant · player.* The same player butchers the cow for its cuts. No
   cut it yielded before this build is lost (shank, shoulder, loin …); they
   are now derived from the body, and the carcass shrinks as they do. A wolf
   or a hog now yields named cuts, not generic stew-meat (owner,
   2026-11-21).
3. *instant · player.* The player salts and tans the pelt (`salt-hide`,
   `tan`). The leather keeps the flank's flaw.
4. *instant · staged.* A hen carcass. `butcher … for feathers` yields
   feathers and down, and `look` at the plucked carcass shows bare skin.
5. *instant · staged.* A shore crab. `look` reads its shell as chitin, and
   butchering yields chitin, not bone.
6. *short · staged.* A crab missing a claw is staged to its next moult. It
   has the claw again. A second crab whose stump was burned does not regrow
   it.
7. *instant · staged.* A whale carcass is staged on a shore. It yields
   blubber, spermaceti, baleen (or teeth) and cuts from its modules, with
   no code written for the whale. The player renders blubber and gets lamp
   oil that fills a lamp.
8. *instant · staged.* The player rides the cow's udder through the milk
   tap. A cow that is not lactating gives nothing, and the refusal says
   why. A lactating cow gives milk.
9. *instant · player.* The player `operate`s on a bull calf in a herd
   `for castration`. The
   herdbook records a steer. A staged steer at adult age is an ox: heavier
   than a bull of the same age and the calmer animal, and the ox register
   counts it.
10. *instant · staged.* The newbie-wilds wolf takes a staged eye wound. Its
    sight falls (it is easier to slip past in the dark than an unwounded
    wolf). A grazing cow, with eyes on the sides of its head, spots a
    sneaking player that a forward-eyed wolf misses.
11. *instant · staged.* The wolf's foreleg is severed in a staged fight.
    The foreleg lies in the place as a thing. The player picks it up,
    butchers it for a shank, and `look`s at it as it spoils.
12. *short · staged.* A sheep is shorn and left out on a cold wet night,
    beside an unshorn sheep. The shorn sheep reads colder. A wet wolf reads
    colder than a dry one.
13. *short · staged.* A tadpole in the pond is staged to its change. It is
    the same creature (same name, same record), now a frog that breathes
    air, and it drowns in no water it could live in before. A frog staged
    into winter dens in the mud, and its rate falls.
14. *short · staged.* A tray of silkworms is staged to spinning. A keeper
    takes one worm out and `look`s at it: a fifth-age larva. The tray's
    cocoons are spun from the worms' own silk. The keeper stifles the
    cocoons, and `unwind` reels them as before this build. A cocoon left
    unstifled is staged to emergence: a moth comes out and the cocoon's
    thread is broken.
15. *instant · player.* A player takes a staged eye wound. Their own sight
    is reduced, and `look` at themselves says so. A player of a dark-sighted
    species sees in a dark place where a plain human sees nothing: the
    species' authored vision now reaches live perception (owner,
    2026-11-21).
16. *short · staged.* **Restart.** Restart the world, then read back:
    - the flawed pelt and leather;
    - the ox;
    - the silkworm tray's worms at the stage they had reached;
    - the severed foreleg, still lying where it was;
    - the lactating cow, still lactating;
    - the wounded player's eye.

### Soak drive

1. *span · player.* A lamb is born at Hearts Delight's spring flush (staged
   start), grows across a game year by its growth curve, and reads its
   stage changes: proportions, coat and the drive of the young.
2. *span · player.* A sheep's coat cycles across a winter. Its winter pelt
   is thicker and insulates better, and by summer it has cast it.
3. *span · player.* A bullfrog winters in the mud and comes out in spring.
4. *span · player.* A silkworm generation runs from egg lot to moth on the
   tray's own degree-days, with no staging.

## Acceptance criteria

- **Animals:**
  - No cut an animal yielded before this build is lost; cuts derive from its
    body, so a wolf yields named cuts, not stew-meat.
  - Every animal in the world can be looked at and butchered, and every one
    with fur, feathers, scales or a shell yields that coat first.
  - A newly authored species with no code is butcherable, skinnable and
    insulated on arrival.
  - A pelt shows every wound its animal took, in the part where it took it,
    and the flaw survives tanning.
  - The crab is chitin. The whale exists, and its blubber renders to lamp
    oil.
- **Yields and states:**
  - Milking needs a lactating animal, and the refusal names the reason.
  - Castration exists, and a castrated bull calf becomes an ox that the ox
    register counts.
  - Wounding a gland stops what it makes.
- **Senses and wounds:**
  - Wounding an eye costs sight, on an animal and on a player.
  - A dark-sighted person species sees in the dark as its row says.
  - A wide-eyed grazer detects a sneaking player that a forward-eyed hunter
    misses.
  - A severed part lies in the world as a thing that can be carried,
    butchered and spoils.
  - A lost crab claw regrows at the moult unless the stump was burned.
  - Losing one kidney leaves a body standing.
- **Bodies over time:**
  - A shorn, plucked or wet animal is colder than one in its coat.
  - The tadpole becomes the frog as the same creature and breathes what its
    organs breathe. (Wild animals are re-created at boot by design, so the
    restart proves stage persistence on the silkworm tray, not the wild
    frog: owner, 2026-11-21.)
  - The silkworm moves larva → pupa → moth. Sericulture's deadline, stifle
    and reel read the same to a keeper.
- **Persistence and the whole roster:**
  - Every one of these survives a restart.
  - No species in the world is rejected by the honesty check. Any creature
    over a physical limit names what pays for it.

## Cross-references

- Seeding: [organism-biology-slate](../slates/engine/organism-biology-slate.md) ·
  [site-conditions-slate](../slates/engine/site-conditions-slate.md) (sense
  organs as parts) · [the bestiary pilot](../bestiary/pilot.md) Part II
- Subsystems:
  - bodies and harm: [race](../subsystems/race.md) ·
    [vitals](../subsystems/vitals.md) · [harm](../subsystems/harm.md) ·
    [butchery](../subsystems/butchery.md);
  - yields: [taps](../subsystems/taps.md) ·
    [ranching](../subsystems/ranching.md) ·
    [sericulture](../subsystems/sericulture.md) ·
    [fishing](../subsystems/fishing.md);
  - body and senses: [senses](../subsystems/senses.md) ·
    [stealth](../subsystems/stealth.md) ·
    [concealment](../subsystems/concealment.md) ·
    [thermal](../subsystems/thermal.md) ·
    [textiles](../subsystems/textiles.md) ·
    [respiration](../subsystems/respiration.md) ·
    [reserve](../subsystems/reserve.md) ·
    [cleanliness](../subsystems/cleanliness.md) ·
    [faces](../subsystems/faces.md).
- Downstream: [hunting-slate](../slates/trades/hunting-slate.md) ·
  [bestiary-slate](../slates/world/bestiary-slate.md) · the whaling build ·
  concealment-by-channel.
