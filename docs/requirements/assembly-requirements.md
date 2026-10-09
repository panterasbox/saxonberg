# Assembly — requirements

**Kind:** platform
**Leads from:** [assembly-slate](../slates/builds/assembly-slate.md) ·
[fridge-design-pack](../slates/builds/fridge-design-pack.md) §
*`Chamber`* · ⛔ [crafting.md](../subsystems/crafting.md) § *DEFECT*
**First consumer, in this build:** a cask somebody made, out of staves
somebody split, which leaks if it was made badly and can be mended
instead of replaced.

⭐⭐⭐ **The thesis: transformation destroys identity; assembly preserves
it — and we only have the first.**

Every craft in the game turns one thing into another. Ore becomes metal,
flax becomes cloth, sand becomes glass, grain becomes bread, and **the
inputs lose their identity in the output.** A cask is staves and hoops
and heads, and after you make it **the staves are still staves** — which
is exactly why it can be *repaired*.

> ⭐⭐ **And the consequence is bigger than barrels: a factory is an
> assembly of assemblies, so you cannot build a factory until you can
> build a thing from parts.** Every industrial vertical sits behind this.

⭐ The cheapest proof it is missing: **an axe is a head and a haft, and
the haft is what breaks** — but wear with no parts makes every failure
total, so today an axe simply wears out and `repair` can only ever be
generic.

---

## What already exists

- **Craft-resolve** with recipes as data, grade by weakest link, tools
  resolved **by what they can do** rather than by name, a heat gate, and
  provenance on the output. ⭐ And it already states the gap: *assembly is
  a genuinely different model, still deferred — not faked.*
- **Wear, repair and salvage** all ship as verbs, afforded by
  instruments. ⭐⭐ **And `salvage` is already disassembly**, which means
  half this build's verb space exists.
- **A compartment with its own air** is fully specified and **deferred
  by decision** — because nothing in the build that designed it would
  have composed one.
- **Named occupancy positions** ship, with capacity and an accepts rule.
  ⚠ But an occupant is *independent* and a part is *constitutive*: a coat
  rack with no coats is still a coat rack, and a hammer with no haft is
  not a hammer.
- ⭐ **A body plan is already a default bill of materials**, with tissue
  as a **share** so one plan serves a canary and an ox, and butchery is
  already **disassembly by declared plan.**
- **An authorship ledger** records who made a thing, with routing for
  more than one contributor.
- **A surgical operation catalogue** is data, driven by one verb on one
  instrument, interruptible. ⭐ Which is the exact shape a joining
  vocabulary wants.
- **Casks exist as rows** — a kind, a material, a capacity, a closure —
  and the distilling pack argues at length that *the cask matters and a
  second one is a row rather than code*, with its character on the
  **vessel**.

### ⛔ What is broken or absent

1. ⛔⛔ **A crafted good minted onto a floor is invisible to
   persistence.** Custody is followed by carrying, dropping, putting,
   getting, buying and felling — and **crafting follows it zero times.**
   ⭐ Invisible for anything you pick up; **total for anything whose
   purpose is to sit still.** Fix it first.
2. ⛔ **Nobody makes a cask.** No recipe, no staves, no hoops — the
   lamp-oil pattern, in a product nine trades depend on.
3. ⚠ **A cask's own history does not exist.** The argument for putting
   character on the vessel appeals to *this barrel's own history*, and
   **there is no record of how many times it has been filled.**
4. ⚠ **Nothing can be made from parts**, so no tool has a replaceable
   part, no machine has a bill, and no part has a market.

---

## Goals

- ⭐⭐⭐ **A thing can be made FROM parts, and the parts are still
  themselves.** What it is made of is declared on the **kind** — so
  every cask is thirty staves, six hoops and two heads whether a person
  made it or found it — and **what happened to this one** is recorded
  against the instance. ⭐ One declaration serves both: the recipe reads
  it to know what to consume, and taking the thing apart reads it to know
  what comes out.
- ⭐⭐⭐ **How two parts are joined is the interesting half, and it is
  data.** A joining method says what may be joined to what, what act and
  what tool it takes, how much force it survives, ⭐ **whether it can be
  undone**, and **who did it** — so a trade ships a way of joining with
  nothing in the engine changed.
- ⭐⭐ **And the joining method is the epoch.** Wedged, pegged, hooped and
  riveted are bespoke and come apart with effort; a **threaded fastener**
  is standard, reversible and interchangeable; welded and moulded do not
  come apart at all. ⭐ One axis, and the whole industrial transition is a
  move along it.
- ⭐⭐ **Where you can do a join decides which trades can travel.** Some
  joins need only hands, some need a tool you can carry, and some need a
  machine that does not leave the premises — ⭐ which is why a cooper can
  work on a pitching deck and nobody can press a bearing out there, and
  why work centralises as the epoch turns. ⚠ **And the hand rung must be
  able to make the hand-tool rung's tools**, or the tree has no root.
- ⭐⭐ **Taking a thing apart gives you less than went in**, and how much
  less depends on how it was joined and how good you are. ⭐ Which kills
  the obvious arbitrage by arithmetic rather than by a rule, gives a
  craftsman a second income because **he recovers more than you do**, and
  makes **mending one part strictly better than taking the whole thing
  apart.**
- ⭐ **A thing tells you which part failed**, so a repair is specific:
  the haft is split, the hoop is slack, the head has dried. ⚠ And you
  **cannot inspect a part while it is inside the whole** — which is true
  in life, and makes *which one is bad* a **diagnosis** rather than a
  lookup.
- **A part is a tradeable good.** Somebody can make staves and never
  make a cask, ⭐ which is the first time the realm has a market **under**
  a market.
- ⭐⭐ **A space inside a thing can have its own air and hold its own
  gear** — a freezer compartment, a line tub, the bow of a boat — and
  **a person can occupy one**, at a cost the host decides. (A fridge
  charges nothing; a boat under way charges plenty.)
- ⭐⭐⭐ **A cooper is a real trade**, because the thing you can do badly
  is destroy somebody else's property: boiling wool felts it, bleach
  rots linen, and **a cask that leaks loses its contents for three years
  and nobody knows whose fault it was until the accounts are read.**
  ⭐ And the three grades of cooper are a **capability** ladder, not a
  quality one — a slack cask is not a bad wet cask, it is **a different
  product**, so the apprentice makes barrels for nails rather than
  inferior barrels for beer.
- ⭐⭐ **A cask wears out its character and can have it restored.** It
  gives less each time it is filled until it gives nothing — and
  **shaving and re-firing the inside brings it back**, which is the only
  place in the realm where maintenance restores a *flavour* rather than a
  function.
- ⭐ **Staves are split, not sawn**, so the fibres run unbroken — which
  makes them **a third thing a felled tree becomes**, after a length and
  firewood.

---

## Non-goals

- ⛔ **No thousand parts and no thousand decisions.** Thirty identical
  staves are **one** decision. The count that matters is **decisions per
  assembly**, and a cask should carry about **one** — the wood.
- ⛔ **No threaded fastener in this build.** The vocabulary must *admit*
  one; the medieval rung is what ships.
- ⛔ **No factory, no interchangeable-parts economy, no machine-rung
  join.** Hands and hand tools.
- ⛔ **No guns, clocks, looms, wagons or ships converted to assemblies.**
  One exemplar, done properly.
- ⛔ **No change to how a body works**, even though a body is an assembly
  whose joins are surgical. The operation catalogue is the *precedent*,
  not a consumer.
- ⛔ **No new verb for taking a thing apart**, and ⛔ **no verb for
  tightening something** — that is the cheapest rung of repair.
- ⛔ **No sawmill, no plank, no lumber grading.** A split stave, and that
  is all.

---

## Collisions

| | |
|---|---|
| ⚠⚠ **itself, at W0** | ⛔ **the craft-mint defect must land first and alone-ish**, because everything after it touches the same tail. Fix, drive it, then build |
| ⚠ **the maritime build** | it must not touch the compartment, and this build must not touch the frame. Disjoint if maritime ships **no vessels** |
| ⚠ **the climate build** | it owns the air a space resolves. A compartment **reads** the chain and must keep working when that build rewrites it |
| ⚠ **the sugar build** | both want a **mill** and a **boiling** step. ⭐ Name who ships the crushing mill — ⭐ probably sugar, since the cask does not need one |
| ⚠ **the shipped cask rows** | nine trades consume them. ⛔ **A recipe's output must name the AUTHORED row** — never a crafted-only variant — or the same object has two kinds and the inspection card shows it |

---

## The drive

1. ⭐ **W0 first: craft something, leave it where you made it, restart,
   and find it still there** — with its state intact. Then **do it with a
   sealed cask of maturing liquid** and find the clock where you left it.
2. **Fell a tree, split staves from it**, and get something that is not
   a plank.
3. **Make a cask** — raise it, set the hoops, fit the head — and have it
   hold liquid.
4. **Make a bad one** and have it leak, and be told *why* it leaks.
5. **Make a slack cask** at a competence that cannot make a tight one,
   and **put nails in it**, and be refused when you try to put beer in
   it for a stated reason.
6. ⭐ **Look at a cask and read what it is made of** — a bill — and
   **fail to inspect one stave** while it is in place.
7. **Break a stave**, be told **which one**, and **replace just that
   one.**
8. **Take a whole cask apart** and get **fewer and worse** staves than
   went in.
9. ⭐ **Take a glued thing apart** and get **scrap**, with the same verb.
10. **Have an expert take one apart** and recover more than you did.
11. **Buy staves from somebody who makes only staves.**
12. ⭐⭐ **Fill a cask repeatedly** until it gives nothing, then **have it
    shaved and re-fired**, and have it give again.
13. **Read who made a cask**, and after a repair, **read both names.**
14. ⭐ **Put something in a compartment with its own air** and have it
    read that air rather than the room's — and **stand in one.**

---

## Acceptance criteria

1. ⛔ **W0: a crafted good left where it was made survives a restart**,
   with its state. **Driven, not reasoned about.**
2. A thing can be **made from parts** declared on its kind, and the
   declaration is the **same one** the recipe consumes.
3. A **joining method is data**, carries what may join what, the act and
   tool, a strength, **a reversibility** and **a maker**, and a new one
   can be added **with nothing in the engine changed.**
4. **At most one new verb**, and taking things apart reuses the shipped
   one, with **the joint's reversibility deciding the yield.**
5. **Disassembly is lossy**, and the loss varies with the joint and with
   competence.
6. **Mending one part is cheaper than rebuilding**, measurably.
7. A failure **names its part**, and a part **cannot be inspected in
   place.**
8. A part is a **tradeable good** with its own price.
9. The three cooper grades are a **capability** ladder: a lower grade
   makes a **different product**, not a worse one, and the refusal says
   which.
10. A cask's **fill history exists**, reduces what it imparts, and is
    **restorable** by a service.
11. ⭐ A **compartment** has its own air, holds gear, and **admits a
    person** at a cost its host declares.
12. ⛔ **A crafted cask and a found cask are the same kind** — same
    composition, same bill, same behaviour — differing only in recorded
    history.
13. Nine shipped consumers of casks keep working unchanged.
