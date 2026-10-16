# Repair — assemblies, part two — requirements

**Kind:** feature
**Leads from:** kernel — the mend, the parts model and the paid service
are engine; first consumers in this build: the pick, the axe and the
sword (mended, honed, re-hafted), the Hearthworks smith (the paid
mend), a **tinker** on the roads and a **cobbler** in Terminus (the
mender as somebody's job), and one **named heirloom** (a seat).

Everything wears — the engine drains condition on every use, every
blow, every tool — and mending today asks nothing of anybody: one
verb puts any good back to new for anyone with stock and a forge, and
the three paid repair counters in the world do not even employ the
hand: the customer mends their own pick at the house's anvil and pays
for the privilege. This build makes **mending a skill** (it can be done
badly, and the trade that made a part is the trade that mends it), makes
**a paid mend somebody's work**, puts **menders in the world**, and
finishes what the assembly build started: **one kind of thing, one
class** (a monolith is a thing of one part), **identity that lives in a
part** (Excalibur re-hilted is still Excalibur), and **upkeep that
reaches the part it is about** (hone a loose blade and it keeps its edge
in the haft).

Seeded by [repair-slate](../slates/builds/repair-slate.md) (all of its
questions closed, § 0); it supersedes GitLab **#39**. The tail of
[assembly-slate](../slates/tails/assembly-slate.md) rides where § 5
touches it.

---

## What already exists

| part | state |
|---|---|
| **`repair` / `mend`** | ships (platform). Restores any worn good to new for anyone; the material decides the gate (metal → a hot forge; else a mending kit); costs same-kind stock by the damage, double if broken. ⚠ **Skill changes nothing.** |
| **assembly's repair steps** | ship (!361). A failed part is refused — *named* only above the joint's band (*"something about the staves"* below it); a slack joint tightens on its band; a spent cask re-fires on its own joints' band. The only part of mending that asks anything of a person. |
| **`salvage`** | ships; already band-dependent — an assembly comes apart joint by joint, a short hand gets members back a grade worse. |
| **`fit`** | ships; replace one part of a whole, joints re-made under the fitter. |
| **`sharpen` / `hone`** | ships (smithing pack, a whetstone in hand). ⚠ **Weapons only**: the scythe, billhook, axe and drawknife cannot be sharpened. Always restores fully. |
| **paid repair** | three priced counters offer it: the Hearthworks smithy (5), the Rejection shed (7), and — oddly — the Terminus infirmary ward (8). ⚠ **None needs anybody on shift**; the customer does the work. (A menu order, by contrast, is made by the on-shift hand.) |
| **wear a buyer can see** | ⚠ **almost none.** `look` on an assembly lists failed and slack parts and *"the work of A and B"*; a weapon's pips silently fold its condition in. **No condition word, no grade word, no mend history** anywhere. |
| **second-hand goods** | the general store's consignment shelf sells used goods today. No salvage yard, no scrap buyer (the sanitation slate's). |
| **named objects** | ⚠ **none.** `name` names a bonded animal; `label` writes on a thing. No authored named, heirloom or relic item exists. A magic item's working sits on the whole item. |
| **NPCs on the road** | ⚠ **none walks a round.** The carter journeys on demand for bounties; nothing keeps a timetable. The roads exist: Terminus → Delight Road → the crossroads → Hearts' Delight, the crossroads → Kestrel Road → Rejection, Terminus → Valley Road → Hinkley Hills. |
| **Disciplines** | smithing, carpentry, coopering, tailoring, leatherwork, glasswork, textiles, appraisal (*a merchant's eye*). **No mending Discipline, and none is wanted** (§ Surface decisions 1). |
| **overlapping slates** | sanitation (scavenger, salvage yard, the lemons problem), freight (the roadmender's on-shift repair), patina (seasoned tools worth more), auction / warranty / insurance (second-hand title), trade-roster (a pedlar), textiles (the cordwainer). |

⭐ **Therefore what is genuinely new here is:** a mend whose result
depends on the hand and is legible afterwards; a paid mend performed by
a person whose skill you are buying; two menders and an NPC that keeps a
round; keenness that edged tools have and loose parts keep; every made
tool, weapon, garment and vessel being either parts or one piece; and a
named thing whose name lives in one of its parts.

---

## Goals

- **A mend can be done badly.** The hand's band, in the trade that made
  the part, decides how far it comes back and what it costs the piece;
  an unskilled mend of an unskilled mend sinks lower. Derived, never
  rolled.
- **The trade that made a part mends it.** A pick's head is a smith's
  problem and its haft a carpenter's; mending the whole pick well takes
  both, or a mender who has both.
- **Wear is legible.** Anyone looking at a thing sees how worn it is and
  whether it has been mended; an appraising eye sees how well, and how
  often. A second-hand buyer can tell a botched pick.
- **A paid mend is somebody's work.** The hand on shift diagnoses the
  piece, names what is wrong and what it will cost, and — if you agree —
  mends it at *their* band. Nobody on shift, no mend.
- **Menders exist.** A tinker walks the roads on a round you can learn,
  mending at his stops; a cobbler keeps a shop in Terminus and re-soles
  boots. A player can take the cobbler's seat.
- **One kind of thing, one class.** Every made tool, weapon, garment,
  vessel, lamp, seat, container and shield is either made of parts or
  made in one piece, and says which; a one-piece thing refuses a part in
  words. The sword is a blade, a guard, a grip and a pommel.
- **Upkeep reaches the part.** Edged tools take an edge; honing an axe
  hones its head; a head honed loose keeps its edge when it is hafted,
  and a part's wear, grade and edge travel with it in and out of a
  whole.
- **A named thing's name lives in a part.** An authored heirloom keeps
  its name through any re-hilting; draw the blade and the name goes with
  it. A broken named blade reforged loses its name, and the smith who
  reforged it may name it.

## Non-goals

- **A mending Discipline** — nowhere, deliberately: mending is the
  maker's knowledge (§ Surface decisions 1).
- **The salvage yard, scrap buyers, the scavenger** →
  [sanitation-slate](../slates/builds/sanitation-slate.md).
- **Pawn, warranty, auction, insurance of used goods** → their slates
  (auction · warranty · insurance).
- **Earned names** (a long-kept thing acquiring a name) — nowhere,
  deliberately (seats are authored only, slate § 0).
- **The seat of an assembled MAGIC item** (a working cast into one part)
  — ruled (slate § 0) but **no assembled magic item exists**, so nothing
  would exercise it → the magic-items tail, to land with the first such
  item. ⚠ Recorded here so it is not mistaken for forgotten.
- **Treatment and burial performed by an on-shift hand** — the same
  defect as repair's on the infirmary's and the necropolis's counters →
  [clinical-medicine-slate](../slates/builds/clinical-medicine-slate.md)
  and [end-of-life-slate](../slates/builds/end-of-life-slate.md); this
  build fixes the repair arm only.
- **A player founding their own repair business** (their own tariff,
  their own shop) → the business ladder in
  [settlement-model.md](../settlement-model.md); here a player can hold
  the cobbler's seat or mend by hand for whoever asks.
- **Buildings** (`maintain`) — not assemblies here; unchanged.
- **Tailoring's `alter`** — stays its own act (it changes whom a garment
  fits, not its condition).
- **Furniture as assemblies, casks that are not vats** → the
  assembly-slate tail, unless the family rule (§ 5) reaches them for
  free.

## Placement

- **The mend, the parts model, legible wear, the paid service by a
  person, and an NPC keeping a round** are **kernel**: every trade's
  goods wear, every venue sells service the same way, and a round is
  wanted by the postman and the roadmender as much as the tinker.
  ⭐ The test holds: a second mender is rows.
- **Which trade mends which part** is the trades' own: each part's
  recipe already names its Discipline.
- **The tinker, the cobbler, their rounds and their shop** are
  **Terminus** content (the terminus pack): the roads are Terminus's,
  and the cobbler is a city trade. ⭐ The cobbler is the *second venue*
  and must need no code — that is its job in this build.
- **The heirloom** is locality content (Hearthworks, below).
- **Edges on tools, the sword's parts** are the trades' rows (smithing,
  carpentry, tailoring for boots).

## Collisions

- **The Hearthworks smithy** — its repair counter now needs the smith on
  shift; the smith NPC who already stands there becomes the hand. Its
  price list changes from a flat fee to a quote by diagnosis.
- **The Rejection provisioning shed's mending slate** — needs somebody on
  shift to mend; the shed's existing provisioner takes the seat (the
  plan checks the roster; if nobody can, the counter honestly says so).
- **The Terminus infirmary ward's repair line** — ⚠ an infirmary mending
  your pick betrays the fiction (lens 3a); **the line is removed** and
  the ward keeps treatment.
- **The general store** — sells clasp-knives, tools and boots; every one
  of them now says how worn it is, and the tools gain bills or say they
  are one piece. Its consignment shelf is where a botched pick will be
  sold on, legibly.
- **The narrow assembled kinds shipped by !361** (an assembled tool,
  weapon, launcher, garment, chair; the cask; the lantern; two pack
  ones) fold back into their families — every billed row keeps working
  and keeps its parts.
- **Every edged tool row** (scythe, billhook, axe, adze, drawknife,
  froe, knives) gains an edge.
- **Boots** (tailoring's) gain a sole as a part, so the cobbler has
  something to re-sole.
- **The roads** — Delight Road, the crossroads, Kestrel Road: the tinker
  walks them; nobody lives on them now.
- **Freight's roadmender** (designed, unbuilt) — the same "repair on
  shift" shape; this build makes it rows when it comes.

## Surface decisions

### 1. Who can mend a part — the trade that made it
Every part is mended under the Discipline of the recipe that made it,
with that trade's instrument: an iron head at a forge by smithing, an ash
haft with an edge by carpentry, a boot's sole by leatherwork, cloth by
tailoring. **No mending skill exists**; a mender is somebody with bands
in several trades. A one-piece thing is mended by the trade that made
it. Lens 1 decided it: mending is the maker's knowledge read backwards,
so it teaches the same thing the trade does.

### 2. How badly — by band, and it compounds

| the hand | the part comes back to | and it costs the part |
|---|---|---|
| untrained | about three-fifths sound | a grade band; any joint it touches is left slack |
| novice | about three-quarters | a grade band |
| competent | sound | nothing |
| proficient, expert | sound | nothing, and less stock |

A botched mend of a botched mend loses another band each time. Derived
from the band, the instrument and the part — two novices mending the
same haft get the same haft ([uncertainty.md](../uncertainty.md)). The
diagnosis rung (naming the failed part) keeps its band, so an untrained
hand may not even know *what* it is mending. The numbers are the plan's
to tune; the shape is this.

### 3. What anyone can see, and what an eye for it can
`look` gives every worn or mended thing a plain condition word (*sound ·
worn · badly worn · broken*) and says if it has been mended (*"it has
been mended"*). **Appraisal** resolves the detail — *by an unpractised
hand*, *twice*, its grade — the instrumentation rule: competence
resolves detail, never access. The mend's history survives a restart and
a sale.

### 4. The paid mend
`order repair <thing>` at a counter: the on-shift hand looks it over,
**names what is wrong and the price**, and you agree before anything is
taken. The price follows the diagnosis — a slack joint is cheap, a split
haft costs a haft, a broken head costs the iron — not the item's mass.
The hand's band sets the result, the hand's name goes on the mend, and
the house pays the hand. Nobody on shift: *"There's nobody here to do the
work."* A hand who cannot diagnose a part quotes only what they can see.

### 5. Parts or one piece
Every made tool, weapon, garment, vessel, lamp, seat, container and
shield is made of parts or made in one piece. A one-piece thing (a
whetstone, a cast pot, a fired bowl, a rivet) is mended as a whole, comes
apart only by melting, and refuses a part: *"It is one piece."* A found
thing in those families (a stone picked up to use as a hammer) is one
piece and has no maker. **Clothing is one piece unless it has a part
worth replacing** (boots: the sole). The sword becomes a blade, a guard,
a grip and a pommel, made by a smith and a carpenter. The ruling: these
are the families we write recipes for, and nothing else composes it.

### 6. Upkeep reaches the part
`sharpen` works on anything with an edge — knives, swords, axes,
billhooks, scythes, drawknives, adzes, froes — and on the edged part
inside a whole. A part keeps its own wear, grade, edge and name in and
out of a whole: hone a loose axe head, haft it, and the axe is keen; take
a worn head off and it is still worn.

### 7. The named heirloom
One authored named blade in the world: **an heirloom over the
Hearthworks smithy's hearth**, re-hilted more times than anyone
remembers (its look says so). Its name lives in the blade:
- re-hilted, it is still itself;
- drawn from its hilt, the blade keeps the name and the hilt is a hilt;
- **broken and reforged, it loses the name**, and the smith who reforged
  it may name it once.
It can be taken — taking it is theft, as it is of anything.

### 8. The tinker
A tinker walks a **round** — Terminus wharfside → Delight Road → the
crossroads → Hearts' Delight, back to the crossroads, up Kestrel Road to
Rejection and home the way he came — stopping at known places at known hours. His round is **readable**: a
notice at the crossroads says where he stops and when. At a stop he
mends for a price, by diagnosis, at his own bands: **good with metal**
(a competent smith), **poor with wood** (a novice carpenter) — so he
will mend your pick's head well and its haft badly, and tell you the
haft is beyond him if he cannot see what is wrong. He carries no forge
he cannot build on the road: hot metalwork waits for a smithy.

### 9. The cobbler
A cobbler keeps a shop in Terminus (the plan picks the room). He re-soles boots, mends leather and
cloth at his bands, and his seat can be applied for: a player cobbler is
paid a wage and their band does the work. ⭐ Built from rows only — it is
the proof that a second mender needs no code.

## Lens pass

1. **Pedagogy** — the Discipline exercised is the trade that made the
   part; the lesson is *what is wrong, whose problem it is, and is it
   worth it*. Derivable: a split haft is wood, a cracked head is iron.
   The band decides the result, which is the progression a player can
   feel.
2. **Creative expression** — the ordinary case is rows: a recipe makes
   a bill, a one-piece thing needs nothing, a mender is a seat and a
   priced counter, a round is stops and hours. The bespoke case — a
   named relic — is an authored seat, no code.
3. **3a immersion** — an infirmary no longer mends picks; a re-hilted
   heirloom is still the heirloom; a mend is done by a person who is
   standing there. **3b participation** — the economy now has a
   mender-shaped hole: every worn thing, and a seat at the cobbler's.
   ⚠ Test: *can the polity do something we did not want?* — a polity
   may license menders (the cordwainer/cobbler line) without code.
4. **Values** — care is a skill, so cheap care is worse care; we chose
   that a bad mend exists (the grain: a realm may tune the bands; the
   law: a mend is never rolled).
5. **Continuity** — a part outlives the whole it was in; a name outlives
   every part around it but its own. The new object answers the same
   commands: a reforged blade still hones, fits and mends.
6. **Economy** — produces restored goods and a reason to buy new;
   consumes stock, time and the tinker's wage; paid by owners of worn
   things, through counters that pay their hands. The demand was there
   first: the engine wears everything. ⚠ Gap: no scrap buyer, so a
   botched pick's best exit is the consignment shelf.
7. **Governance** — judges no person: the band is measured, the quote
   is the hand's word. Entrenchment: the mender licence is tier C (a
   polity's), never engine.

## The drive

A funded player, a fresh world, the real socket.

1. Buy a **pick** and a **billhook** at the general store. `look pick` —
   it is a head and a haft, *sound*. `look whetstone` (also bought) — *one
   piece*. `fit haft to whetstone` — refused: *"It is one piece."*
2. Work the pick at a face until `look pick` says *worn*.
3. At the Hearthworks forge with iron and an ash billet in reach, the
   untrained player types `repair pick`. The head comes back to roughly
   three-fifths, the pick loses a grade, and `look pick` says *it has
   been mended*. Repair it again: it loses another grade.
4. `sharpen billhook` with the whetstone — it takes an edge (it could
   not before). Take the billhook apart (`salvage`), `sharpen` the loose
   head, `fit` it to a new haft: `analyze billhook` reads keen.
5. Wait for the smith's shift. `order repair pick`: the smith names what
   is wrong and the price; `yes`; it comes back *sound*, *mended by* the
   smith. Off shift, `order repair pick` says nobody is there to do the
   work.
6. Read the tinker's notice at the crossroads; be at his stop at the
   hour. `order repair pick` from the tinker with a worn head and a split
   haft: he mends the head well and quotes the haft as beyond him, or
   mends it badly — and says which.
7. In Terminus, at the cobbler's, `order repair boots` with a worn
   sole: re-soled, *sound*.
8. `apply` for the cobbler's seat, `clock on`, and as the on-shift
   cobbler mend another player's boots through the counter: the result
   reads at *your* band and the wage lands in your account.
9. `look` at the heirloom over the smithy hearth: its name and its
   re-hilting history. Take it. `salvage` it at the joint: the blade
   keeps the name, the hilt is *a hilt*. `fit` a new grip: the whole
   answers to its name again.
10. Consign the twice-botched pick on the general store's shelf; a
    second player `look`s at it — *mended* — and with appraisal sees *by
    an unpractised hand, twice*.
11. Restart the server. The pick's grade and mend history, the
    billhook's keen head, the heirloom's name in its blade: all as left.

## Acceptance criteria

1. An untrained hand's mend leaves a worn part short of sound and a
   grade lower; a second such mend leaves it a grade lower again; a
   competent hand's mend leaves it sound — observable by `look` /
   `analyze` on the thing.
2. Two hands of the same band mending the same part get the same result.
3. A pick whose haft is split cannot be fully mended by someone with no
   carpentry, however good a smith they are.
4. Every worn or mended thing says so on `look`; appraisal reveals how
   well and how often; both survive a restart and a sale.
5. A paid mend names the fault and the price before money is taken; the
   price differs between a slack joint and a broken head on the same
   item.
6. A paid mend with nobody on shift is refused in words; with a hand on
   shift, the result reads at that hand's band and the hand's name is on
   the mend.
7. The infirmary no longer offers repair.
8. The tinker is at each posted stop at its posted hour, in a world
   nobody is watching as well as one they are; his notice is readable
   at the crossroads.
9. The tinker mends metal parts well and wooden ones poorly, and says
   so before taking money.
10. The cobbler re-soles boots; a player can hold the cobbler's seat and
    be paid for the work, at their own band.
11. Every edged tool can be sharpened; a part honed loose is keen once
    fitted; a worn part removed from a whole is still worn.
12. Every made tool, weapon, garment, vessel, lamp, seat, container and
    shield either lists its parts or refuses one as *one piece*; the
    sword lists blade, guard, grip, pommel.
13. Every assembled thing the assembly build shipped still lists its
    parts and still mends, fits and salvages as it did.
14. The heirloom keeps its name when re-hilted and when its blade is
    drawn; the drawn hilt has no name; broken and reforged, the blade
    loses its name and its reforger can name it once.
15. The drive passes end to end, including the restart.

## Cross-references

- [repair-slate](../slates/builds/repair-slate.md) — the seed; all
  rulings in § 0.
- [assembly.md](../subsystems/assembly.md) ·
  [crafting.md](../subsystems/crafting.md) § the lifecycle ·
  [retail.md](../subsystems/retail.md) § the priced SERVICE ·
  [employment.md](../subsystems/employment.md) ·
  [instrumentation.md](../subsystems/instrumentation.md) (detail, never
  access) · [uncertainty.md](../uncertainty.md) ·
  [behavior.md](../subsystems/behavior.md) ·
  [logistics.md](../subsystems/logistics.md) (the roads) ·
  [magic-items.md](../subsystems/magic-items.md).
- [vocations.md](../vocations.md) — the five criteria; ⚠ its cooper and
  carpenter rows are stale (both Disciplines ship).
- Overlapping slates: sanitation · freight · patina · textiles ·
  trade-roster · assembly (tail) · carpentry.
- GitLab #39 — superseded.
