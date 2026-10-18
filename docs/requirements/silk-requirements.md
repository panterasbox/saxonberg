# Silk — requirements

**Kind:** feature
**Leads from:** content — a new trade pack, a new venue, and rows across
four existing trades. The kernel-adjacent work is integration: the
textile chain carrying a fibre's material through, and one unified verb.

Silk is a third shape of raw-goods trade: a **leaf crop** (mulberry), a
**population you feed indoors** (a tray of silkworms), and a take that
**ends the animal** (the pupa is stifled before the moth breaks the
thread). It joins the shipped textile chain at the reel and leaves it
cloth that takes colour as linen never can. It is also the first trade
whose price honestly comes from the **hours** it embodies, so it carries
the game's first measurement of what a luxury is. Seeded by
[silk-slate](../slates/builds/silk-slate.md) — rulings in its § 0, lens
pass in its § 10. The owner deferred to the slate's recommendations and
called this build mostly integration; the survey below agrees.

## What already exists

**Verbs** a silk player will use, all shipped: `harvest` (cut leaf),
`put` (leaf on a tray, cocoons in an oven), `ignite`/`stoke` (the oven),
`get`, `spin`, `weave`, `boil`, `mordant`, `dye`, `buy`, `consign`,
`look`, `feed` (compost into a bed — the frass's consumer), `apply` and
`clock` (the seats). ⚠ Three words a silk design reaches for are taken:
**`reel`** (fishing — *take line in*), **`feed`** (compost a bed, not an
animal), **`throw`** (hurl an object).

**Trades it joins:** `trade-textiles` (spin, weave, the Wharfside mill and
its spinner and weaver), `trade-dyeing` (the dyehouse; dyestuffs are rows
only, and the mordant rule already treats any non-cellulose fibre as
taking alum directly), `trade-farming` (the fruiting-tree cycle every
orchard row uses), `trade-forestry` (the coppice panel — a stool cut on a
yearly cycle), `trade-apiculture` (the population-as-body precedent:
buy a nuc at the general store, put it in a hive).

**Mechanisms that carry it:** the polycarp cycle (a mulberry whose
"fruit" is cut leaf is rows), temperature-driven rates (the maturation
profile's rate-by-temperature and the growth model's cold factor), ovens
and kilns a player can light (the malt kiln's gentle heat is the
stifling precedent), the textile chain's grade-by-weakest-link, NPC hands
on shift paid from the house's own account (the `stokes` and `weaves`
brains are the shape), and the general store stocking a living thing
(the nuc).

**Places:** Hinkley Hills is residential lots only — a yard with a
garden bed and a house with a farmhouse kitchen — with no outbuilding,
no business and no human NPC. Hearts Delight is the valley's farm
country: Quist's farm, the orchard close (cherries and clover, and an
apiary-shaped vacancy), the dairy, the creamery, the sawmill. Terminus
Wharfside has the mill, the dyehouse and the tinker.

**Disciplines:** `agriculture`, `horticulture`, `stockmanship`,
`apiculture`, `silviculture`, `textiles`, `dyeing`. No sericulture.

**Overlapping slates:** markets-slate § open 5 (status demand, the
finite labour pool — lifted from the silk slate), optics-slate (the
microscope), disease-slate (contagion), textiles-slate (cotton,
patterned weaving).

**Two defects the survey found, both in this build's path:**
1. **Spinning and weaving always produce LINEN.** Yarn and cloth are
   made from fixed linen rows and the input's material is not carried —
   so spun wool is linen yarn today, and reeled silk would be too.
2. **Nothing in the game carries a hidden infection from its origin** on
   anything but food, and nothing reveals one — deliberately, which is
   exactly right for pébrine before optics.

**Therefore what is genuinely new here is:** the silkworm (a fed, aging
population with a deadline), the egg lot (a good that carries a seeded
infection and a strain), the mulberry and its leaf, `reel` (unified with
fishing's), degumming, the silk house and its hands, a reeler at the
mill, the labour bench, kermes as two rows, and the textile chain
learning to keep a fibre's material.

## Goals

- A player can rear silkworms **alone, as a hobby**: one tray in their
  own kitchen, fed by hand, giving a little silk that is entirely theirs.
- A **silk house** runs in Hearts Delight **with no player present**: its
  hands feed the trays, stifle the cocoons and sell them on, and silk
  cloth reaches the Terminus general store with nobody playing.
- **Reeling is a judgment**: how many cocoons to the thread decides how
  fine and how even the silk is, and the reeler's competence shows in it.
- **The take ends the animal, and the player chooses**: stifle a cocoon
  to reel it, or keep it — a moth emerges, the cocoon is pierced (spun
  silk only) and a new egg lot is laid. Peace silk is simply never
  stifling.
- **Silk stays silk** through spin, weave, degum and dye — and so does
  wool, which today does not.
- **Disease is real and seeded, never rolled**: an egg lot carries its
  infection from where it was laid; a heavily infected tray shows it late
  and collapses; moths from it lay infected eggs.
- **A line responds to selection**: keeping the heaviest cocoons for seed
  moves the next generation toward them, by the breeder's equation.
- **The luxury is measured, not asserted**: a bench reports the hours a
  kilo of linen, wool and silk each embodies, and silk's prices derive
  from it.
- **Kermes** — crimson — is gathered and dyed with **no new code**.
- The byproducts have consumers: frass works into a bed like compost;
  pupae are food and bait.

## Non-goals

- **The microscope, and certifying an egg lot by it** →
  [optics-slate](../slates/builds/optics-slate.md) Half A. Detection here
  is by outcome, by provenance and by the late visible signs.
- **Muscardine and other damp-borne disease** → [disease-slate](../slates/builds/disease-slate.md)
  (needs a room's humidity and hygiene, unbuilt).
- **The conditioning house** (silk weighed dry) → [markets-slate](../slates/builds/markets-slate.md):
  it presupposes trade **by weight**, which nothing does yet.
- **Status demand and whether NPC hands are a finite pool** →
  markets-slate § open 5.
- **Silkworm gut for fishing leaders, silk sutures, silk bolting cloth**
  → nowhere yet, deliberately: rod lines are prose, sutures are linen,
  bolting is a dial. Each is a one-row follow-on when its trade wants it.
- **Patterned weaving (drawloom → Jacquard)** and **cotton** →
  [textiles-slate](../slates/builds/textiles-slate.md)'s tail.
- **Dyeing yarn or skeins** → nowhere, deliberately: the dyehouse dyes
  cloth, and silk is dyed in the piece.
- **Wild silks, cochineal, lac, spider and sea silk** → silk-slate § 8,
  later rows.
- **Full genetics** — one trait responds to selection →
  [lineage-slate](../slates/builds/lineage-slate.md).
- **A mulberry-dyke fish pond** → nowhere yet, deliberately (silk-slate
  § 11).

## Placement

- **`trade-sericulture`, root `/trade/sericulture`** — the silkworm, the
  egg lot and its strains, the mulberry and its leaf, the rearing tray,
  the reeling basin and hand reel, `reel`'s silk half, degumming, the
  `sericulture` Discipline, the house's tending brain. Depends on
  `trade-textiles`.
- **Hearts Delight** (its locality pack) — the **silk house**: a lit
  rearing loft, a mulberry walk, a stifling oven, a counter, a keeper and
  a hand. ⭐ A second party in the valley beside Quist's farm, not inside
  it — the orchard close's apiary vacancy is the precedent.
- **Terminus Wharfside** (terminus) — a **reeling basin and a reeler**
  added to the mill; the mill weaves silk as well as linen.
- **Terminus general store** — stocks egg lots, a rearing tray, a hand
  reel and a mulberry sapling, as it stocks the nuc.
- **`trade-dyeing`** — kermes as a dyestuff.
- **`trade-textiles`** — spin and weave keep the fibre's material.
- ⭐ **The second-instance test:** a second silk house elsewhere is rows
  in that locality's pack — no pack code. Kermes is the second-shape
  test: rows only.

## Collisions

- **Hinkley Hills lots** — the hobbyist rears in their own kitchen and
  may plant a mulberry in the yard's garden bed. Nothing at Hinkley Hills
  changes.
- **Quist's farm and the orchard close** — the silk house is its
  neighbour. It does not take the close or the bench.
- **The Wharfside mill** — gains a basin and a reeler; its spinner and
  weaver now handle silk as well; it still consigns, never retails.
- **The dyehouse** — gains kermes; silk cloth comes to its vats.
- **The general store** — four new stock lines.
- **Fishing's `reel`** — unified, not displaced (below). A player with a
  hooked fish still reels it in.
- **`feed`** (compost a bed) — untouched; feeding the worms is `put leaf
  on tray`. Frass becomes one more thing `feed` accepts.
- **`throw`** — untouched; twisting raw silk rides `spin`.
- **Spun wool** — becomes woollen yarn and woollen cloth. A visible change
  to a shipped chain, and the correct one.

## Surface decisions

### Feeding is `put leaf on tray`
`feed` already means working compost into a bed, and the decision in
feeding is the *supply*, not the motion. Leaf put on a tray is eaten over
the following hours; cut leaf wilts within about a game day and wilted
leaf feeds worse. No new verb.

### `reel` is one verb, and the thing in front of you decides
Fishing's `reel` (take line in) and silk's (draw filament off cocoons onto
a reel) are the same bodily act — winding a line onto a reel — and both
trades call it that. Rung 2 of the collision ladder, unify: `reel` with a
hooked fish reels the fish; `reel cocoons` at a basin or a pot with a
hand reel reels silk. Neither trade gives up the word.

### Reeling's decision is the count
`reel cocoons` takes how many cocoons go to the thread. More is coarser
and faster; fewer is finer and slower and harder to keep even. The reeler
keeps it even by adding a cocoon as the filament thins; how even is the
reeler's competence. The silk reads its fineness in words, banded by
competence — never a bare number. Two rungs, as every textile verb: a pot
and a hand reel anywhere (rung 0), the mill's basin (rung 1, more even).

### Stifling is heat, and it is the player's choice
Put cocoons in a lit oven held warm for a while and the pupae die; the
cocoons keep and can be reeled. Too hot scorches the silk. Cocoons left
alone open about ten game days after spinning: the moth emerges, the
cocoon is pierced and can only be spun, and the moths lay a new egg lot
where they emerged. The deadline is visible coming on the cocoons.

### The rearing reads in words
A tray says what its worms are doing: their age (first through fifth),
asleep for a moult, eating, restless and hungry, the fifth-age sound
like rain on leaves, wandering to spin. Ages advance with warmth — a cold
room slows them — and with feeding; underfed worms grow slower and spin
lighter cocoons, and are never killed outright by hunger. Fifth-age worms
given brush or straw on the tray climb it and spin; without it they spin
worse. Cocoons are judged by heft in the hand.

### The egg lot is a good with a past
An egg lot names its strain and where and when it was laid. It carries a
pébrine load from its origin that **no sense reports**. Bought lots come
from away and are mostly clean; a lot laid by your own moths carries what
those moths carried. Eggs hatch when kept warm long enough; a one-brood
strain must first have had its winter.

### Pébrine shows late, to the eye
A heavily infected tray is peppered with dark specks by its fourth age,
eats poorly and collapses before it spins; a lightly infected one spins
a lighter crop. Moths from an infected tray lay infected eggs. The
lesson before optics is provenance — buy from a clean source, never seed
from a spotted tray.

### Selection: keep the heaviest
The cocoons kept for seed decide the next lot's mean shell weight, moved
toward them by heritability × the difference — the breeder's equation.
One trait responds; strains differ in heritability, brood count (one or
two a year) and cocoon colour.

### Degumming is done in the piece, by boiling
Raw silk is woven in the gum and the cloth is boiled to take the gum off:
it comes out soft, lustrous and about a quarter lighter, and the gum's
colour goes with it — gold cocoons give white silk. Under-boiled cloth
stays stiff and dyes poorly; the moment is the dyer's or weaver's
judgment. Silk is then dyed with the shipped verbs and takes alum
directly, so the same dye gives a brighter shade on silk than on linen.

### The silk house runs without players
A keeper owns it; a hand on shift feeds the trays from the walk, puts
brush up, stifles the crop and sells cocoons on; the mill's reeler buys
and reels them; the mill weaves and consigns silk cloth to the general
store. The hand's wage is real money out of the house's account — so
silk's price carries its hours. A player may take the hand's or the
reeler's seat, buy leaf, egg lots or cocoons at the house's counter, or
rear alone.

### Standing only by your own hand
Silk carries the mark of whoever reeled it and whoever wove it. Silk you
bought carries theirs. Nothing about buying silk confers the standing of
making it.

### The labour bench
A bench reads the shipped rows and reports the attended hours in a kilo
of linen, wool and silk cloth, and the prices of the silk lines are
derived from those hours at the shipped wages — the textiles precedent,
where prices come from wages rather than being picked. If the rows do
not produce a large gap, the bench says so and the rows are wrong.

### Kermes is rows
Kermes is gathered off the kermes oak — the insects live below the
resolution anything acts at, as the worms on a tray do — and dyes crimson
on alum. A kermes oak cut on its cycle yields kermes; the dyehouse can
use it. No code.

### The Discipline
`sericulture` (ISCED-F 0811, specializes agriculture) is exercised by
rearing — the hatch, the feeding, reading the tray, the stifle, grainage.
Reeling exercises `textiles`.

## Lens pass

1. **Pedagogy** — sericulture, textiles (the reel), the pathology of the
   worms, selection. **Dominant: observation** — reading a tray's age and
   hunger, the deadline, the late signs. Derivable: ages from warmth, the
   deadline from emergence, alum on protein, the line by R = h²S, gold
   gum boiling off white. Disease seeded at the egg, never rolled.
2. **Expression** — strains are rows; a player's own line drifts by what
   they keep; a second silk house is rows. The named works (silk-slate
   § 9): *Silk* passes (egg lots with a provenance and a seeded load);
   Lombe passes on the recipe ladder; the Lyon weavers pass on seats.
3a. **Immersion** — every state is words; the loft is lit; heft, not a
   number. Nothing asserted in prose that the trays do not do.
3b. **Participation** — the hand, the reeler, the keeper; buying leaf,
   eggs, cocoons; the house runs with nobody on and every seat is
   takeable.
4. **Values** — stifle or not; the house's wages tell the truth (the
   reeler is the bottleneck); standing only by your own hand.
5. **Continuity** — `reel` at a pot, at a basin, in a later steam
   filature: one verb; nylon enters at the spin seam; the obsolete half
   (the drawboy, Europe's sericulture, Japan's households) is the
   slate's.
6. **Economy** — produces cocoons, raw and spun silk, silk cloth, pupae,
   frass, kermes; consumes leaf, wages, fuel, water. ⚠ Status demand is
   absent (recorded → markets-slate); the bench is what makes the price
   honest.
7. **Governance** — nothing here judges a person yet: certification
   waits for optics, the conditioning house for trade by weight. Recorded
   as the gap.

## The drive

A test-world player with money, the test clock, and a lot at Hinkley
Hills. Each step names what they should see.

1. **The silk house.** Walk to Hearts Delight and into the silk house.
   `look`: a lit loft of trays, the mulberry walk outside, an oven, a
   counter, the keeper and a hand. `look tray`: words for the worms' age.
   The hand on shift is seen laying leaf on the trays.
2. **Buy in.** At the house's counter `buy leaf`. At the Terminus general
   store `buy egg lot` and `buy tray`. `look egg lot`: its strain, where
   and when it was laid — and nothing about disease.
3. **Hatch.** In your own kitchen, `put egg lot on tray`. Advance the
   clock: the eggs hatch — *a tray of worms in their first age*.
4. **Feed, and neglect.** `put leaf on tray`; the tray reads as eating.
   Leave it a day unfed: *restless, heads raised*; its worms are an age
   behind a fed control tray, and alive.
5. **Through the ages.** Feed across the clock to the fifth age: the
   tray sounds like rain. `put brush on tray`; they climb and spin. Next
   day `get cocoons from tray`; heft them.
6. **Stifle, and keep some.** Set three cocoons aside. `put cocoons in
   range`, light it, wait, take them out: stifled. (A second batch
   overheated reads scorched.)
7. **The deadline.** Advance ten game days: the three kept cocoons open,
   moths emerge, and a new egg lot lies where they were — with three
   pierced cocoons. The stifled ones are unchanged.
8. **Reel.** At the Wharfside mill, `reel cocoons` at the basin with a
   chosen count: a skein of raw silk, gold, its fineness in words. Pupae
   remain. Once more at home over a pot with a hand reel: coarser, less
   even.
9. **Silk stays silk.** `spin` the skein (twisted), `weave` it: the cloth
   is **silk** — not linen — and stiff with gum.
10. **Degum.** Boil the cloth: soft, lustrous, lighter — and white.
11. **Dye.** At the dyehouse, `mordant` with alum and `dye` with madder:
    a brighter shade than linen given the same bath.
12. **Spun silk.** `spin` the pierced cocoons: spun silk yarn.
13. **Wool.** `spin fleece`: woollen yarn, and woven, woollen cloth.
14. **Pébrine.** Hatch a lot known to be heavily infected: by its fourth
    age it is peppered with dark specks, eats poorly and collapses before
    it spins. Moths kept from a lightly infected tray lay a lot that
    carries the infection on.
15. **Selection.** Keep the heaviest cocoons of a lot for seed; the next
    generation hefts heavier on average than its parents' lot.
16. **The house runs alone.** With no player near, advance the clock: the
    house's trays are fed, its crop is stifled and sold, the mill reels
    and weaves it, and silk cloth appears on the general store's shelf.
    The hand was paid from the house's account.
17. **Kermes.** Gather kermes from a kermes oak, `mordant` cloth with alum,
    `dye` it with kermes: crimson.
18. **Byproducts.** `feed` a garden bed with frass; eat a handful of
    pupae.
19. **Fishing still reels.** At the river with a hooked fish, `reel`
    takes line in as before.
20. **The bench.** The labour bench reports hours per kilo for linen,
    wool and silk, with silk far above both; the silk lines' prices match
    the hours at the wages.

## Acceptance criteria

1. A player can buy an egg lot and a tray, hatch, feed, rear and harvest
   cocoons alone in their own kitchen.
2. A tray's state — age, moult, eating, hunger, wandering, spinning — is
   readable in words, and none of it as a number.
3. Worms in a colder room age more slowly than in a warm one; underfed
   worms age more slowly and spin lighter cocoons, and do not die of it.
4. Cut leaf wilts within about a game day and wilted leaf feeds worse.
5. Stifled cocoons never open; unstifled ones open about ten game days
   after spinning, leaving pierced cocoons and a new egg lot.
6. Over-heated cocoons are scorched and give worse silk.
7. `reel cocoons` with a count yields raw silk whose fineness reads in
   words and whose evenness reflects the reeler's competence; the mill's
   basin reels more evenly than a pot.
8. Silk spun and woven is silk cloth, spun wool is wool yarn, woven wool
   is wool cloth.
9. Boiling raw-silk cloth makes it softer, lighter and white; under-boiled
   cloth dyes poorly.
10. Silk mordanted with alum dyes a brighter shade than linen in the same
    bath.
11. Pierced cocoons spin into spun silk.
12. An egg lot reveals nothing about its infection; a heavily infected lot
    shows dark specks late and collapses; an infected tray's moths lay
    infected eggs.
13. Keeping the heaviest cocoons for seed raises the next generation's
    cocoon weight.
14. With no player present, the silk house feeds, stifles and sells, the
    mill reels and weaves, and silk cloth reaches the general store; the
    hand's wage comes out of the house's account.
15. A player can take the hand's or the reeler's seat.
16. Silk carries the mark of its reeler and weaver.
17. Kermes dyes crimson with no new code.
18. Frass can be worked into a bed; pupae can be eaten.
19. Fishing's `reel` behaves exactly as before.
20. The labour bench reports hours per kilo for linen, wool and silk, and
    the silk prices follow from it.

## Cross-references

- Seeding slate: [silk-slate.md](../slates/builds/silk-slate.md)
- Subsystems: [textiles.md](../subsystems/textiles.md),
  [taps.md](../subsystems/taps.md) (the feedback law silk is the fourth
  row of), [apiculture.md](../subsystems/apiculture.md),
  [husbandry.md](../subsystems/husbandry.md),
  [forestry.md](../subsystems/forestry.md) (the panel),
  [maturation.md](../subsystems/maturation.md),
  [spoilage.md](../subsystems/spoilage.md),
  [employment.md](../subsystems/employment.md),
  [thermal.md](../subsystems/thermal.md)
- Related slates: markets, optics, disease, lineage, textiles
