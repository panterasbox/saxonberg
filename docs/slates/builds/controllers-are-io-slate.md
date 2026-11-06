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
   `CraftingApi.wash` (beside `repair`), the laundress is `Garment.launderBy` + the
   `Tariff`'s house methods, the bath is `Tub.drawFrom`. ⚠ Left, named:
   `DryController.prospectFor` (the drying law — moved from trade-cooking),
   and `OrderController`'s pre-existing arms (treatment, repair are the
   repair build's).
4. ⭐ **The order of homes** (user, 2026-10-18): first the OBJECT — a public
   instance method through its mixins or its class taxonomy; only when the
   behaviour belongs to no one instance, an Api STATIC (taking a
   `…Request`). Never a `lib/` static, never a module function.

## ⭐ The ceramics review's contribution (2026-10-28)

The ceramics MR's act protocols are now input/output controllers over
object plans (`ActPlan` / `ActRefusal` / `ActOutcome`, registered marker
mixins — see [verb-interfaces § The cuts sweep](./verb-interfaces-slate.md)),
and `stir`'s compounding arm asks the tub's plan instead of choosing its
own duration. The seven cut verbs that still decide in their controllers
are listed there; they are this slate's largest single cluster.

## Open for the build

- **Outcome types** — one convention (a discriminated `ok` union, reasons
  as a closed string set per act) so a controller's wording is a `switch`.
- **Durations** — how long an act takes is arguably the act's, not the
  controller's (`SWEEP_MS`, `BATHE_MS`); decide whether the step time moves
  onto the object with the act.
- **Engaged completions** — completions already must call statics or
  objects (the dead-proxy finding, `lint:completion-this`); once acts live
  on objects, a completion is one call plus wording.

## ⭐⭐⭐ The owner's brief for the build (2026-11-05) — the whole command chain

Opened with `/requirements` on branch `reqs/controllers-are-io` (build-2).
The owner widened the build from "controllers mutate too much" to the
whole chain from a typed word to a changed world:

> *"Right now controllers simply do too much. A lot of the choices they
> make should be done in the /lib/ layer where it's shared across any
> action that needs to consume the logic. Also anything that's doing too
> much targeting itself instead of relying on MQL is also bad. Also
> controllers that are really two or more controllers smushed into one
> with a single if() or switch() block but otherwise no crossover. Or a
> syntax that's belabored. … With verb collisions, I want to make sure
> we're using the right verbs for the right things and there may even be
> places we're fine with the collision. I want to use this build to
> finally do our MQL scoping stuff `scope::verb target` or some kind of
> syntax that lets you select which object's verb affordances you're using
> when it's ambiguous. Also we should be using mixins for interfaces when
> appropriate, which means minting some new mixins that are basically
> marker interfaces. When we're looking at mixins I also want to make sure
> the mixin is actually one coherent idea. If a mixin interface is 4 props
> for feature A and 4 props for feature B and they never interact, then is
> it really one mixin or two? We may want to split up mixins that are doing
> too much as part of this build — that's where most of our affordances
> come from."*

> *"Command taxonomy is still right about subcommands. I want to use them
> more than we currently are … our command surface is really crowded and
> subcommands help fix a lot of that. Also command-line options solve a lot
> of problems when it comes to ambiguity, either inside one command def or
> across commands."* (No hard rules yet — a conversation.)

### The chain, and which complaint lives at which link

| link | defect | the owner's complaint | slate with prior design |
|---|---|---|---|
| 1 interface (the mixin) | one mixin = two unrelated ideas; a protocol that exists only as duck-typed method names | mixin coherence, split; marker mixins for interfaces | [verb-interfaces § what a protocol mixin costs](./verb-interfaces-slate.md), [mixin-slate](../tails/mixin-slate.md) |
| 2 affordance (who offers the verb) | two objects in reach offer one verb; first-come decides | right verb for the right thing; some collisions fine; `scope::verb target` | [affordance-verb](../tails/affordance-verb-slate.md) (source-scoped invocation, the sigil unsettled, the prefix an MQL string) |
| 3 resolution (what the target is) | the controller finds things itself | targeting itself instead of MQL | [one-resolution-rule](./one-resolution-rule-slate.md) |
| 4 syntax (what is typed) | belabored grammars; ambiguity with no tool | belabored syntax; options and subcommands | [command-taxonomy](./command-taxonomy-slate.md) |
| 5 controller shape | two controllers in one file behind an `if`/`switch` | smushed controllers | the "one verb per act" agreement |
| 6 controller job | rules and state changes in the controller | do too much | this slate, above |
| 7 the act | the same rule written per verb | shared in `/lib/` | [verb-interfaces § the cuts sweep](./verb-interfaces-slate.md) |

**Subcommands and "no smushed controllers" are one move, not two.** A
subcommand GROUPS related transactions on one operand under one word, and
each subcommand can have its own syntax and its own controller. A smushed
controller HIDES unrelated acts in one file. Splitting the arms, then
grouping those that share an operand as subcommands, fixes both and
uncrowds the surface. Options (`--flag`) settle ambiguity inside a view and
across views.

### Shape proposed (agreed in principle, to be refined from the scan)

A staged program, bottom-up along the chain, each stage with a
census-then-ratchet gate:
1. interfaces — mixin coherence and marker mixins (affordances come from
   mixins);
2. affordance and scoping — collisions, and `scope::verb` in MQL;
3. resolution — controllers stop targeting by hand;
4. controllers — split the smushed, lighten the syntax with subcommands
   and options, move every act onto its objects and `/lib/`.

### The scan (next, after a compaction) — one census per link

1. **Mixin cohesion** — per mixin, which fields and methods are used
   together; two clusters that never touch is "4 props for A, 4 for B".
2. **Duck-typed protocols** — method names probed with `?.()` /
   `typeof` / `in` that no marker declares: candidate marker mixins.
3. **Collisions** — every verb two or more views claim, and which object
   types claim it.
4. **Self-targeting** — controllers that walk contents, call `find*`, or
   match keywords instead of using what the binder bound.
5. **Branching** — controllers whose body is one `if`/`switch` over the
   target's type with no shared code between the arms.
6. **Syntax weight** — views by arg count, prepositions, greedy/quoting
   oddities; subcommand use today (44 of 335 views at the slate's count).
7. **Mutations** — the controller census, done properly (2026-11-05 by the
   slate's regex: 128 of 385 controllers, 364 calls, 206 in packs).

Measured so far (2026-11-05): the in-flight builds' controllers barely
overlap the heavy list (build-4 wizard-axis: shell/author verbs; build-1
water-supply: `fill`/`drink`/`open`; build-3 client-surface: `look`).
