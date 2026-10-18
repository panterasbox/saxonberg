# Controllers are input and output

> **Status: UNBUILT · opened 2026-10-18 (user, during the cleanliness MR review !380).**
> **Left:** the census gate (`lint:controller-mutations`) · the burn-down, controller
> by controller, of 132 controllers / 408 mutating calls · the outcome-type
> convention · where an engaged step's DURATION lives.
> **Size:** a build.

## ⭐⭐⭐ The doctrine (user, 2026-10-18)

> *"I don't like controllers doing things that the stuff items they operate
> on should be doing themselves. … It should be very easy for me to write
> my own alternate controller for the same verb, because the controller
> should just be making calls out to other objects and coordinating. All
> the state mutation and making sure the objects involved are consistent is
> not the job of the controller — if I were to write my own controller I
> would want all that behaviour to remain constant. What does belong in the
> controller is inputs and outputs: figuring out what the input model is
> saying needs to happen, and generating the prose or whatever feedback is
> necessary to respond to the player's request."*

This is about **where logic lives**, not about anything being buggy.

- **Controller:** read the model (which target, which tool, which manner),
  pick the act, call it, and word what it returns — the scene lines, the
  response-envelope notes. Timing a step (`engageStep`) is coordination.
- **The objects:** every state change and every rule that keeps the objects
  consistent — what is edible, how much a portion is, what a broom takes up,
  what a midden accepts, that a used spoon is dirtied and a finished bowl
  kept. An act returns an OUTCOME (`{ ok: true, … } | { ok: false, reason }`)
  the controller words; it never sends prose itself.
- ⛔ **The act's internals are METHODS on the object, never module
  functions in its file** (user, the same review: *"now I'm never gonna be
  able to find this stuff — the only way is to go looking in controllers to
  see what they call"*). A hidden function cannot be found from the class,
  cannot be overridden, and is exactly as invisible as the controller code
  it replaced. The first cut of B45 did this (`isServedDish`,
  `claimUtensil`, `leaveCrumbs`, two copies of `mintHeapInto`, B44's
  `bleedOut`); each became a method on the thing it is about
  (`Bulkable.holdsFood`, `Metabolic.claimUtensil`/`leaveCrumbs`,
  `Vitals.loseBlood`, inlined in `Floor.sweepInto`/`Burner.rakeGrate`).
- **The test:** write a second controller for the same verb (or a brain that
  performs the act for an NPC) — it must get identical behaviour by calling
  the same methods.

Prior art in the repo: the *mixin authoritative, controller dumb* working
agreement (refusals RETURNED, decided in one place); `crafting.md` § *Split
by what performs the act* (the affordance half of the same idea).

## What the cleanliness build already moved (!380, B45)

`eat` → `Metabolic.eat(food, utensils)` · `strew` → `Floor.strewWith` ·
`sweep` → `Floor.sweepInto`, `Flued.sweepChimney`, `Burner.rakeGrate` ·
`dispose` → `Midden.takeRefuse` · `boil … in pot` / `heat` (the flame) →
`Soilable.holdAtHeat(K, s, {wet})` · a bath's soap → `CleanserUse.spend`
inside `Hygiene.bathe`.

## The build — census, then ratchet (`lint-family.md`)

1. **`lint:controller-mutations`** — count, per controller file, calls that
   change state: `StuffApi.destruct/clone/create`, `ContainmentApi.move`,
   `BulkableApi.transfer`, `set*(`, `soil(`, `recordHeat(`,
   `setPathogenLoads(` (the regex the census below used — refine it in the
   build). Gate today's total as the ceiling; it may fall, never rise.
2. **Burn it down**, heaviest first. Measured 2026-10-18: **341 controllers,
   132 mutate directly, 408 calls.** The top: `FellController` 24,
   `MillController` 16, `SmeltController` 14, `CutController` 12,
   `CrackController` 12, `ButcherController` 12, `SawController` 11; the
   kernel's `PutController` and `CloneController` 7 each.
3. The cleanliness build cleared its own (B48): the co-wash is
   `CleanlinessApi.washTogether`, the laundress is `Garment.launderBy` + the
   `Tariff`'s house methods, the bath is `Tub.drawFrom`. ⚠ Left, named:
   `DryController.prospectFor` (the drying law — moved from trade-cooking),
   and `OrderController`'s pre-existing arms (treatment, repair are the
   repair build's).
4. ⭐ **The order of homes** (user, 2026-10-18): first the OBJECT — a public
   instance method through its mixins or its class taxonomy; only when the
   behaviour belongs to no one instance, an Api STATIC (taking a
   `…Request`). Never a `lib/` static, never a module function.

## Open for the build

- **Outcome types** — one convention (a discriminated `ok` union, reasons
  as a closed string set per act) so a controller's wording is a `switch`.
- **Durations** — how long an act takes is arguably the act's, not the
  controller's (`SWEEP_MS`, `BATHE_MS`); decide whether the step time moves
  onto the object with the act.
- **Engaged completions** — completions already must call statics or
  objects (the dead-proxy finding, `lint:completion-this`); once acts live
  on objects, a completion is one call plus wording.
