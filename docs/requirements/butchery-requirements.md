# Butchery & animal products — requirements

**Kind:** feature
**Leads from:** kernel (first consumer: `trade-cooking`'s `butcher` and
`trade-ranching`'s five livestock species, both shipped in the carcass
chain and both in this same branch)

The carcass chain (MR !334) built the *plumbing* for butchery and skipped
butchery. Every land animal — ewe, cow, sow — yields twelve units of one
generic `stew-meat` plus offal, suet, hide and bone; a cow and a sheep
differ only in kilograms-per-unit and a fat fraction. ⚠ The gap is named
in the tree already: `butchery.yaml` says the Discipline is *"where the
joints are, **which cut is which**, and how to open a carcass without
opening its gut"* — and two of those three shipped. This doc closes the
third, and the animal-product chain around it.

Raised by the user in review of !334: *"I don't see any actual meat? I was
expecting to see different carcasses actually carved up and trimmed and
you know, everything that actual butchers and cooks do."*

## What already exists

- **Verbs**: `butcher` (trade-cooking), `cook`, `cure`, `dry`, `smoke`,
  `plate`; `slaughter` (trade-ranching). No carving, trimming or
  breakdown act.
- **`Species.butcheryYield[]`** — `{ cut: <row path>, units, fraction?,
  conditioned? }`. ⭐ The mechanism **already takes any thing-row path**,
  so real cuts need no new plumbing; what shipped was one generic line.
- **`Species.dressOut({liveKg, fleshPct})`** → `{cut, units, kgEach}`,
  with a `finishFactor` off condition at death.
- **Anatomy**: `BodyPart { key, parent, tissues: TissueComposition[],
  governs?, serves? }` — a hierarchical part tree (`body.torso`,
  `body.arm.left`, `body.torso.liver`) whose parts already decompose into
  **named tissue materials with masses**. `governs` (an organ RUNS
  something; combines by **min**) vs `serves` (a limb is FOR something;
  combines by **mean**).
- **Trauma already reads tissues**: `partHasBoneTissue` gates blunt →
  fracture off a material tag, and `primaryTissueMaterial` is commented
  *"(v1: type-decision only)"*.
- **Recipes**: `inputSlots[{slot, category, minGrade, kind, count}]`,
  `medium` (with a real phase ceiling — water caps at boiling, fat
  higher), `holdS`, `requiresHeatK`/`maxHeatK`, `toolCapabilities`.
  ⭐ So *long moist heat vs fast dry heat* is **already expressible** in
  the shipped vocabulary.
- **Grade end to end**: inputs carry a grade, recipes gate on `minGrade`,
  the maker's `seededBandFor(discipline)` supplies the competence band.
- **Spoilage & contamination**: `FreshnessMixin`, `WaterActivityMixin`,
  `ContaminableMixin`, the butcher's `spillGut` by band, cures
  (`salt-cure`, `smoke-cure`), `treated-cut`.
- **Fishing already does cuts properly** — `fillet`, `roe` per species.
  The land chain is the outlier.
- **The products with sinks this build just closed**: hide → tanpit,
  bone → `grind` → field, offal → dog loaf, suet → render → dip.
- Rows that exist and are unused or under-used: `hanging-carcass`,
  `meat-hook`, `treated-cut`.

**Therefore what is genuinely new here is**: (1) muscles as named tissue
materials carrying the properties a cut's texture derives from; (2) a
scale-free body-mass model, because tissue masses are authored *absolute*
on a body plan shared by sheep, cattle, dogs and horses; (3) cuts as rows
that *claim* muscles, so a cut can span two; (4) tools that gate how deep
a breakdown can go; (5) a cooking rule that reads the law; and (6) the
nose-to-tail products — sausage above all — that make whole-animal use
real.

## Goals

- A carcass yields **named joints** that differ by a property a player can
  reason about, not twelve identical parcels.
- **Texture is derivable, never authored**: a cut's toughness follows from
  how hard its muscles worked. A player who knows a shoulder works and a
  loin does not can predict the cooking method and be right.
- **Cooking discriminates**: long moist heat rewards a collagen-rich cut
  and fast dry heat rewards a tender one, each punishing the mismatch.
- **The butcher's hand is visible in the output** — a poor hand yields
  trim where a good one yields a joint.
- **Tools and technique matter**: what you own decides how deep you can
  break a carcass down.
- **The animal is used nose to tail** — gut, blood and fat become goods
  with producers and consumers, not flavour text.
- A **wound changes the meat**: a beast shot through the shoulder yields a
  damaged shoulder.
- Body-part mass is **scale-correct** across species sharing a body plan,
  and consistent with whole-body mass by construction.

## Non-goals

- **A limp/cane consequence model, and nursing prognosis off a wound's
  tissue** → `recovery-slate`. ⭐ This build sites wounds at muscle
  granularity and aggregates consequences at the **limb**, which leaves
  that buildable without foreclosing it.
- **Per-muscle training or exertion reads** → nowhere, deliberately. No
  consumer exists and inventing one manufactures a declared capability
  with no reader (this build has already found three).
- **A menu of limps, or per-failure-site locomotion effects** → nowhere,
  deliberately. One limp is the right fidelity; the exercise is making a
  player care about it at all, which is the recovery vertical's.
- **Meat inspection, condemnation, a shambles ordinance** → the
  governance limb below; the platform ships the measurement
  (contamination bands) and not the ordinance.
- **Dry-aging and hanging as mechanics** (the `hanging-carcass` row
  exists) → a butchery tail slate.
- **Trimming as its own verb** → the same tail; the reducing carcass gives
  partial breakdown without a second verb.
- **Dairy** → `dairy-slate`, unchanged.
- **Primal → side → quarter as staged acts** → nowhere, deliberately:
  *abstract a lifecycle to what a player can act on*. Tool-gated depth in
  one act carries the same expression.

## Placement

- **Kernel**: the mass model (`TissueComposition.share`, the sum
  invariant, `partArea`), the muscle-material convention, `Species`
  share overrides, and `dressOut`'s derivation. These are substrate every
  pack's species rows read.
- **`trade-cooking`**: `butcher`'s depth/skill/cut selection, the cooking
  law, sausage and pudding recipes, cut and casing rows.
- **`trade-ranching`**: per-species share overrides and which joints each
  species is worth naming.
- **`base-library`**: the muscle tissue materials (`/stuff/idea/material/
  tissue/muscle/<name>`), beside the existing `flesh`/`muscle`.
- ⭐ **Does a second instance need code?** No: a new species is a row with
  share overrides and a cut list; a new cut is a row claiming muscles; a
  new regional sausage is a recipe. All three are data.

## Collisions

- **`/stuff/thing/items/stew-meat`** is referenced by shipped recipes and
  by wolf/hog yields. It becomes **trim** rather than being deleted.
- **The quadruped body plan** is shared by sheep, cattle, dogs, cats and
  horses — so muscle *topology* is shared and only *shares* vary.
- **`partArea()`** is the sole consumer of absolute tissue masses and has
  **no callers**; the mass change is therefore free of behavioural risk.
- **Fish** already have `fillet`/`roe` and a `fish` body plan; the fish
  path must keep working unchanged.
- **The dog loaf** consumes offal and bone meal — sausage must not starve
  it (both want offal; the loaf is the cheap line, sausage the dear one).
- **Contamination** already rides every cut via `spillGut` and
  `transferContaminationTo`; casings are gut and are the dirtiest input in
  the game, which the existing model should express rather than ignore.

## Surface decisions

### Muscles are named tissue materials, not a parallel profile
The anatomy tree already decomposes parts into tissue materials with
masses. Muscles are that layer **getting names** —
`/stuff/idea/material/tissue/muscle/loin` — with work and fat on the
**Material row**, because the engine's law is `response = f(mechanism,
material, construction)`. Rejected: a `Species.muscleProfile[]` parallel
structure, which would duplicate topology the anatomy already holds and
would put butchery data on every living creature.

### Tissue mass becomes a SHARE of body mass
Absolute kilograms on a flyweight shared across species of wildly
different size are already fiction (a bullock claims the same 28 kg torso
as a ewe). A share is scale-free, **sums to 1 across the body** as a
checkable invariant, and leaves BMI and fitness untouched — both read
whole-body mass (`mass / stature²`), never parts. Species may override a
share, because that is where real difference lives: a pig dresses out at
half its live weight with nearly twice a sheep's fat.

### A cut CLAIMS muscles, and its texture is derived
A cut row names one or more muscles, so a porterhouse is a two-element
list. Toughness is the mass-weighted mean of its muscles' work — **never
authored**, so an author cannot lie about a cut's texture. Mass is
`Σ(shares) × live mass × dressing loss`, so `butcheryYield.fraction`
stops being authored and becomes derived.

### The mechanic is two forms of one verb, and no minigame
`butcher <carcass>` takes the species' default breakdown; `butcher
<carcass> for <cut>` attempts a named cut. **Tools gate feasibility**
(knife: boneless and offal; + saw: bone-in joints; cleaver + block:
chops). **Skill gates whether you get the cut or trim.** ⭐ The carcass
**reduces** — claimed muscles are gone — so a side can be worked to order
and left hanging, which is how a shop behaves and gives partial breakdown
with no second verb. This is a CLI game: the judgment is which tools you
own, what you ask for, when you stop, and what you sell versus eat.

### Consequence lives at the limb, not the tissue
A wound sites on a muscle (cheap — the seam already reads tissues) and its
consequence aggregates to the limb through `serves`'s mean. One limp, no
menu of limps. *Nothing prohibits modelling more; nobody would care which
limp they have, and getting them to care about a limp at all is a
different exercise.* Stated as a **guideline, not a rule**.

### Sausage is in scope
Gut → casing → sausage closes trim, fat, offal and blood into one good
with a producer and a buyer. Blood → pudding. Lard (pig) and suet
(ruminant) separate, because the pig's own authored comment already claims
lard matters and then yields the same fat as a sheep.

## Lens pass

⭐ Answered **as if building the game the platform is for**, with the
altitude of each answer named.

**1 · Pedagogy — decides, and it supplies the law.** *(invariant)*
Disciplines exercised: `butchery` (dominant), `cooking`, `stockmanship`
upstream. ⚠ Today butchery's dominant skill is **nothing** — one verb, a
mass multiplier — which is the lens's own named failure: *a craft can
honestly exercise three Disciplines while the skill that decides the
outcome is recall.* The law this build installs is real food science and
**derivable**: a muscle's work determines its connective tissue, which
determines its cooking method (collagen → gelatin under long moist heat;
a tender cut wants fast dry heat). A player who internalizes it predicts
the outcome without a table — the Andy Weir property — and it teaches
anatomy, yield economics and whole-animal use as a by-product.

**2 · Creative expression — decides, and the ordinary case needs no
code.** *(the grain)* Personalization is a derivative of supply-chain
depth: cuts × grades × cures × methods × sausages is a surface nobody
enumerated. A new species is a row; a new cut is a row; a regional sausage
is a recipe. The bespoke case (a pack's own joint, a named charcuterie)
lands without breaking anything because cuts are rows claiming muscles.

**3a · Immersion — badly failed today.** *(invariant)* A cow, a ewe and a
sow giving identical *"wrapped cut of stew meat"* betrays the fiction to
anyone who has seen a butcher's window, and twelve parcels off a bullock
is wrong by an order of magnitude.

**3b · Participation — new ground.** *(the grain)* With real cuts a polity
can do what we did not author: a butcher corners the prime joints, a cook
builds a trade on offal as cheap protein, a town's cuisine follows what
its herds give, a sausage becomes a local style. None of that is
expressible today.

**4 · Values — a genuine undecidable, and a good one.** *(the grain)*
**Nose-to-tail versus prime**: sell the loin to the inn and eat the offal,
or keep the good meat? And kill young (tender, less of it) versus old
(more, tougher). Neither has a right answer; grade, mass and price are the
gauges that turn them into calculable choices.

**5 · Continuity — passes, because cuts and tools are rows.** *(invariant)*
Medieval → industrial keeps the cut vocabulary and changes the tools (hand
saw → band saw) and the cold chain (which re-prices aging). An epoch adds
rows; nothing re-engineers. The capability answers the same commands.

**6 · Economy — the demand is already there, which is the test.**
*(invariant)* Produces: joints, trim, offal, gut, blood, lard, suet, hide,
bone, sausage. Consumes: carcasses, tools, salt, fuel, time. Who pays:
inns and cooks for prime cuts, the poor for offal and trim, chandlers for
fat, tanners for hide, farmers for bone meal. ⭐ Was the demand there
first? **Yes** — recipes already gate on `minGrade`, so *skill → cut
grade* matters to every shipped recipe with no recipe change; and the
hide/fat/bone sinks were built last week.

**7 · Governance — one limb, named and deferred.** *(this title / Tier C)*
Meat inspection and a shambles ordinance are where contamination gets
teeth: who may sell meat, and what gets condemned. The criterion would be
the contamination band (measured, already shipped), the appeal a
re-inspection, the entrenchment tier **C** — the polity's. ⭐ At the
grain: **the platform ships the measurement and not the ordinance.**

## The drive

Run against the running game, from a standing start at the farmstead.

1. `look` at the yard; `draft 3` a head out of the flock. Expect a body
   you can look at.
2. `slaughter head`. Expect a body where the animal stood.
3. `butcher body` **with a knife only**. Expect boneless cuts, offal and
   trim — and the refusal, in words, to take bone-in joints without a saw.
4. `look body` again. Expect the carcass **still there and reduced** —
   what you took is gone, what remains is named.
5. `butcher body for shoulder` **with a saw**. Expect a shoulder.
6. `butcher body for loin` as an unskilled hand. Expect **trim**, and a
   refusal or a poor result that says why.
7. `look loin` and `look shoulder`. Expect them to read differently, and
   the difference to be about texture, in words, with no number.
8. Cook the shoulder fast and dry (`cook` over high heat, no water).
   Expect a poor result.
9. Stew the shoulder (`medium: water`, long hold). Expect a good result.
10. Reverse it: stew the loin, roast the loin. Expect the roast to be the
    good one. ⭐ **Steps 8–10 are the law, and they are the drive's point.**
11. Compare a cow's breakdown with a ewe's. Expect different joints,
    different counts, and a bullock's cuts to be heavy.
12. `butcher` a beast killed by a wound to the shoulder. Expect the
    shoulder cut to be damaged and say so.
13. Make a sausage: casing from gut, trim, fat. Expect a sausage, and
    expect the casing to be the dirtiest thing you have handled.
14. Make a black pudding from blood.
15. Buy a joint at the shop. Expect prime cuts to cost more than trim.
16. `analyze`/`look` a pig's fat and a sheep's fat. Expect lard and suet
    to be different things.

## Acceptance criteria

⚠ Observable from outside the code.

1. A ewe, a cow and a sow butchered by the same hand yield **differently
   named joints**, and a player can tell which animal they came from.
2. Two cuts off one carcass read **differently in words**, and the
   difference is about texture.
3. The same cut cooked two ways gives **two different outcomes**, and the
   better outcome is the one the cut's texture predicts.
4. A player who has never read a table can **predict** which of two cuts
   to stew and be right.
5. A knife-only butcher is told, in the world's own words, what they
   cannot do without a saw.
6. A carcass can be **partially** broken down, left, and returned to.
7. An unskilled hand visibly wastes a carcass — trim where a joint should
   be — and a skilled one does not.
8. A beast wounded in a part yields a **damaged cut from that part**.
9. A sausage can be made from gut, trim and fat, and nothing in the chain
   is conjured.
10. A black pudding can be made from blood.
11. Lard and suet are distinguishable goods with different uses.
12. A bullock's joint weighs more than a ewe's joint of the same name,
    without any number being authored twice.
13. Nothing a player could do before this build stops working: fish still
    fillet, the dog loaf still bakes, hide still tans, bone still grinds.

## Cross-references

- Seeding: this doc's own gap, found in review of MR !334; `cooking-slate`,
  `rendering-slate`, `hearth-and-larder` (the victualler half),
  `ranching-slate`.
- Subsystems: `vitals.md` (the Agent/Creature split, BodyPlan anatomy),
  `race.md` (Material substrate, Species), `harm.md` (the injury driver),
  `materials-response.md` (`response = f(mechanism, material,
  construction)`), `crafting.md` (recipes, Grade), `spoilage.md`
  (freshness, contamination), `mortality.md` (the corpse),
  `advancement.md` (Disciplines), `instrumentation.md` (competence
  resolves detail, never access).
- Related in flight: `avatar-family-slate` (the anatomy mint-parameter
  join), `recovery-slate` (the limp/cane consumer).
