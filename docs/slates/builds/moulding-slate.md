# Moulding slate — the shape, the pattern, and the pour

> **Status: UNBUILT** — opened 2026-10-16. The dairy build (`reqs/dairy`,
> dev complete, unmerged at writing) ships the **mould mechanism** with
> three consumers; this slate is the **lens pass moulding never had**,
> across every trade that moulds, and the build it implies.
> **Left:** ✅ five rulings (§ 0) · **impressions** — a mould taken from
> any object (shape copies, identity never) · **pressing** as a load on a
> mould · **the pour can fail**, on physics already in the rows (a mould
> that cannot survive the pour, a misrun, a damp mould, shrinkage, draft)
> · **consumed moulds** (sand, lost wax, plaster) · the **set processes**
> dry · cure · bake beside freeze and drain · **melts again or does not**
> (thermoplastic vs thermoset, derived) · moulds and **assembly** (a cast
> part's maker, interchangeable parts, the two-piece mould) · **dies as
> authority** (coin, seal, hallmark, standard) · the trade catalogue (§ 9)
> **Size:** a build — after the repair build, which takes one seam from
> it (§ 7).

---

## 0. The rulings (the owner, 2026-10-16)

> ⭐⭐ **Impressions: yes.** A player may take a mould from any object. The
> SHAPE copies; the IDENTITY never does (a pewter cast of a named blade is
> a nameless replica — seats are authored only, `repair-slate` § 0).
>
> ⭐⭐ **Pressing is in the mould system**, as a load on a mould — the
> extension of what dairy already does with the hoop and the press stone.
>
> ⭐⭐ **Brickmaking is the first new consumer** — the settlement's most
> basic building need, met by nobody (§ 9).
>
> ⭐⭐ **Cure works rubber's way:** anything set by HEAT (bake, vulcanise,
> fire) is a recipe fired with its charge in a mould, and the mould gives
> the output its shape; a *set process* is only what happens with no act
> (freeze, drain, dry) (§ 5).
>
> ⭐⭐ **Sequencing:** this is its own build, after repair. Repair takes one
> seam now — **a cast part is mended under the discipline its mould
> credits** (repair plan D1's third read, § 7).

---

## 1. What ships (dairy, `docs/subsystems/mould.md` on `reqs/dairy`)

- **The container decides the shape.** A mould row names its cast
  (`castTemplate`); how the contents SET is the material's business —
  **freeze** (metal, wax, water) and **drain** (curd) ship. A plain
  vessel falls back to the material's lump.
- **What rides onto the cast:** maker (the payload's, else the mould's),
  **the mould's grade → the cast's grade**, freshness, pathogens, water
  state, made-from.
- **Reusable** (wears per cast, `repair` mends it; a cracked mould casts
  a lump) **or consumed** (broken to release — the property ships, no
  row uses it).
- **No verb:** `pour` in, `put` a weight on, `look` (*filled · setting ·
  set*), `get` the cast out. A pour into a mould that authors a
  discipline credits it at `standard`.
- **Three consumers:** the cheese hoop (drain, takes a press), the ingot
  mould at the smelt (freeze), the ice pan (freeze).
- ⚠ Its own recorded finding: **nothing refuses molten metal into a
  vessel that cannot take it.**

⚠ **Dairy's lens pass is a cheese pass** — the kill curve, the co-op,
pasteurising. Its deferred list (*candles, soap, bricks, baking tins,
press-moulded ceramics, glass — each a Mould row plus a set process*)
assumes every other moulded good is the same mechanism. This slate tests
that assumption.

## 2. Three acts are called moulding

| act | what happens | examples | here? |
|---|---|---|---|
| **casting** | a liquid sets in a cavity | ingots, bells, shot, pewter, ice, jelly, candles, soap, slip-cast pottery, rubber goods | ✅ shipped — dairy's system |
| **pressing** | a plastic solid is forced into a form | bricks, butter prints, pressed glass, struck coins, compression-moulded rubber, a pressed cheese | ✅ **in** (§ 0) — a load on a mould; the hoop + stone is the first |
| **forming over a form** | material worked over a shape | a shoe on a last, a hat on a block, boiled leather, steam-bent wood, slumped glass | ⛔ out — not a container; each trade's own act (cobbling, millinery, cooperage's bending) |

⭐ The pressing line: a **load** on a mould (a stone, a screw press, a
drop hammer) is what makes a plastic charge take the cavity. Struck coin
is the extreme case — the charge is solid metal and the load is a hammer
blow on a die (§ 8).

## 3. ⭐⭐ The pattern — a mould taken from a thing

Real casting rarely starts from a mould row. It starts from a **pattern**:
sand rammed round a carved wooden pattern, a clay shell over a wax model
that is melted out, plaster laid over anything. The mould is a **copy of
an object's shape**.

- **Taking an impression** makes a mould whose cast is *the pattern's
  shape* in whatever is poured. A carver makes one pattern; a founder
  casts it in tin, bronze, wax or soap.
- ⭐ **Lens 2's strongest yes in this slate**: a player authors a shape
  with no code and no row — *personalization is a derivative of
  supply-chain depth*, literally (carpentry makes the pattern, the
  founder the thing).
- **Shape copies; identity never.** The cast has the pattern's form,
  parts list and description of shape — never its name, seat, maker's
  mark, grade or history. A replica is a replica.
- **Consumed vs permanent** maps onto the mould's material: a sand or
  plaster impression is broken to release the cast (one use); a die sunk
  in steel lasts thousands. Lost wax consumes the PATTERN too (the wax
  model is melted out) — the wax goes back to the chandler.
- Open: does an impression of an **assembly** cast the whole as one
  piece (a cast-iron copy of a pick, head and haft fused — honest: that
  is what you would get), or refuse? ⭐ Recommendation: one piece; the
  look says so.

## 4. ⭐⭐ The pour can fail — on physics the rows already hold

Dairy credits the pourer and lets their skill change nothing. Casting's
skill is **judging the heat and the mould**, and every failure is
derivable from numbers that already ship — no band, no draw
([uncertainty.md](../../uncertainty.md)):

1. **The mould must survive the pour** — its material's melting (or
   ignition) point above the pour's temperature. Wood holds butter, ice
   and wax and burns under bronze; bronze holds pewter; iron wants sand.
   This closes dairy's own finding.
2. **Misrun / cold shut** — poured too close to the melting point, the
   metal freezes before it fills: a short, flawed cast.
3. **A damp mould** — water in sand under molten metal turns to steam:
   a blown cast, and a hazard to the pourer (a real foundry killer).
4. **Shrinkage** — metal shrinks as it sets; without a **riser** the cast
   is porous (a grade).
5. **Draft** — a shape that cannot slide out of a one-piece mould wants a
   **two-piece** mould (§ 7).

The founder's competence then resolves what they can READ about these
(instrumentation: *detail, never access*) — the colour of the melt, the
dryness of the sand — not the outcome.

## 5. The set processes

| process | how it sets | moulded goods | state |
|---|---|---|---|
| **freeze** | cools through its melting point | metal, wax, water, sugar, chocolate, thermoplastics | ✅ ships |
| **drain** | the mould takes the water out | cheese (hoop), ⭐ **slip-cast pottery** (a plaster mould drinks the slip), ⭐ **paper** (pulp on the paper-maker's mould) | ✅ ships for cheese — the other two are the SAME physics |
| **dry** | gives water to the air | bricks, tiles, clay before firing | deferred by dairy |
| **cure** | a chemical set with no act | plaster and concrete (hydration) | deferred by dairy |
| *fired* (not a set process) | a heat recipe, shaped by the mould the charge sits in | ✅ rubber's vulcanising (`reqs/rubber`), bread in a tin, thermosets, fired brick and pottery | § 0 — rubber's way |

⚠ **The rubber fork.** `reqs/rubber` makes **vulcanising a recipe fired in
the works' oven**, with *"the mould decides the shape: a boot, a glove, a
sheet, a ring, a tube."* That is consistent with this system only if a
firing of a mould's contents asks the mould for its shape. ✅ **Decided (§ 0): rubber's way.** Every heat-driven
set (bake, vulcanise, fire) is a recipe fired with its charge in a mould,
shaped by that mould; *set process* stays for what happens with no act
(freeze, drain, dry). Plaster and concrete hydration (a chemical set with
no heat and no act) is a set process — the one *cure* that stays on the
mould.

## 6. Melts again, or does not

Whether a cast can be **recast** is derivable from whether its material
has a melting point: wax, metal, sugar and thermoplastics melt back to a
pool (salvage → a pool, recast); vulcanised rubber, thermosets and fired
clay do not (salvage → scrap). Lens 1: the plastics era's central
distinction falls out of a field the materials already carry.

## 7. Moulds and assembly

- **A cast part's maker.** A part that came out of a mould has no recipe;
  its trade is the **discipline the mould credits**. ⭐ The repair build
  takes this now (§ 0): its D1 reads recipe → output-row index → **the
  mould**.
- **Interchangeable parts.** Two casts from one pattern are the same
  shape; a part cast from a pattern fits any whole built to it **without
  re-making the joint** (or at a fraction of the cost). That is the
  historical origin of interchangeable parts, the attach point for the
  assembly tail's `interchangeable` joint field, and what makes the
  tinker's drawer of parts work.
- **The two-piece mould is an assembly** — cope and drag, two halves
  under a joint that opens freely; it wears at the joint and is
  repaired like any assembly. Draft (§ 4) is why it exists.
- **A monolith's origin** — repair's ruling that a one-piece thing is an
  assembly of one stands; most one-piece things are CAST, and their
  maker is the mould's discipline.

## 8. Dies are authority

A die, a matrix or a punch is a means of production that is also a
**credential**:

- the **mint's coin dies** — who may strike coin ([banking.md](../../subsystems/banking.md) coinage);
- a **seal matrix** — a city's, a guild's, a person's; the impression in
  wax authenticates;
- the **hallmark punch** — the assay office's word on a metal's fineness;
- **standard weights and measures** cast from the master (assembly's
  gauger and `Government.standards`).

**Counterfeit** is exactly an unauthorised impression of an authorised
object (§ 3 makes it possible). Lens 7: the criterion is *who holds the
die*, the remedy the polity's, the entrenchment **tier C**. The engine
records whose impression a thing is; it decides nothing.

## 9. The trade catalogue — what the lenses generate

| trade | moulded goods | process | notes |
|---|---|---|---|
| **smelting / founding** | ingot ✅, sand-cast pots and pans, a **bell**, cast iron firebacks | freeze | the founder and the pattern-maker; moulding sand; risers |
| **pewterer** | plates, tankards, spoons | freeze | low melting point → reusable metal (bronze) moulds |
| **ranged** | **shot and bullets** | freeze | the bullet mould is the first mould a player owns |
| **printing** | **type** cast from a matrix in a hand mould | freeze | ⚠ printing is not modelled; the historical first interchangeable part |
| **mint** | coin | press (struck) / freeze (cast) | § 8 |
| **dairying** | cheese ✅, **butter prints** (the dairy's mark in the butter — a brand) | drain / press | |
| **sugar** | **sugar loaves** (the refinery's cone moulds) | drain + dry | cross-check `sugar-requirements` |
| **cooking / baking** | jelly, aspic, tins | freeze / bake | |
| **chandlery / rendering** | **moulded candles** (dipping's second rung), **soap** | freeze / cure | wax is also lost-wax's pattern |
| **brickmaking** ⚠ no trade | **bricks**, tiles | press + dry, then fire | the settlement's most basic building need, met by nobody |
| **pottery** ⚠ no trade | press-moulded and **slip-cast** ware | press / drain + fire | plaster moulds |
| **glass** | pressed glass, blown into a mould | press / blow | glass-slate § 8 |
| **paper** ⚠ no trade | sheets on the paper mould | drain | |
| **leather** | boiled leather (the hide jerkin already says *moulded*) | forming — ⛔ out (§ 2) | |
| **rubber** (`reqs/rubber`) | boots, gloves, sheet, rings, tube | cure in the oven, shaped by the mould | § 5 fork |
| **plastics** (later) | everything | freeze (thermoplastic) / cure (thermoset) | drilling's crude is the feedstock; the press is the machine |
| **masonry / building** | plaster casts, **concrete** formwork | cure | building-scale moulds |

## 10. Lens pass

1. **Pedagogy** — casting is physics the rows hold: melting points decide
   which mould holds which pour, heat decides the misrun, water decides
   the steam, shrinkage decides the riser, shape decides the draft;
   drain is one law across cheese, slip and paper; recastability is a
   melting point. Disciplines: smithing (founding is a branch of it until
   a trade claims it), dairying, chandlery, glasswork, carpentry (the
   pattern), and the gaps — pottery, brickmaking, paper.
2. **Creative expression** — the ordinary case is rows (a mould and a
   material); the bespoke case is an **impression** — any shape a player
   can make once, castable in anything that will take it, no code.
3. **3a immersion** — a wooden mould burns under bronze; a cast copy is
   not the original. **3b participation** — the pattern-maker, the
   founder, the mould-maker, the die-sinker, the brickmaker are economy-
   shaped holes; and a polity *can* do something we did not want —
   counterfeit, or license, or ban the copying of a design.
4. **Values** — moulding moves skill from the hand into capital: a cast
   is as good as its mould, so the founder's band matters only for the
   heat (deskilling — the oldest argument in industrial history, and it
   is ours to make visible, not to settle). Copying: allowed (§ 0);
   identity never copies; a counterfeit mark is the polity's to punish
   (grain).
5. **Continuity** — `pour` into a clay mould, a sand flask, a die-caster,
   an injection press: the commands do not change; the machine supplies
   the pour and the load.
6. **Economy** — produces uniform goods and interchangeable parts;
   consumes sand, plaster, wax, patterns, fuel; mould capital rewards
   volume and undercuts handmade on price. Demand first: bricks, tiles,
   pots and shot are needed already; nobody makes them.
7. **Governance** — dies (§ 8): the criterion is who holds the die; the
   remedy the polity's; tier C. The engine records provenance and
   decides nothing.

## 11. Open questions (to close at requirements)

1. The impression of an assembly — one piece (recommended) or refused.
2. ~~The rubber fork~~ — ✅ rubber's way (§ 0).
3. Pressing's load: a stone, a screw press, a drop hammer — one load
   scale, or kinds?
4. Where founding lives — a branch of smithing, smelting's, or its own
   trade pack.
5. ~~The first new consumer~~ — ✅ **brickmaking** (§ 0): press + dry in
   the mould, then fire in a kiln (a fired recipe, rubber's way).
6. How a die's authority is recorded (whose impression a coin bears) —
   the attestation slate may already own the shape.
7. The deskilling question made legible: does a moulded good's look say
   *moulded* (a buyer can tell cast from forged)? ⭐ Lens 1 says yes.

## Cross-references

- `docs/subsystems/mould.md` (ships with dairy) · `reqs/dairy` plan D9.
- `reqs/rubber` — `rubber-requirements.md` (the mould decides the shape;
  ⚠ it routes *footwear as a trade (a cobbler)* to textiles-slate, while
  the repair build ships a Terminus cobbler — reconcile at the next
  rubber review).
- [repair-slate](./repair-slate.md) — § 5 (one piece), § 6 (seats); the
  repair plan's D1 takes § 7's first seam.
- [assembly-slate](../tails/assembly-slate.md) — the `interchangeable`
  field (the threaded fastener).
- [destructive-distillation-slate](./destructive-distillation-slate.md)
  · glass-slate · rendering-slate · guild-slate (the foundry) ·
  [uncertainty.md](../../uncertainty.md) ·
  [instrumentation.md](../../subsystems/instrumentation.md) ·
  [banking.md](../../subsystems/banking.md) (coinage).
