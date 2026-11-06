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

### ⭐⭐ The scan — results (2026-11-05, master 4b20f2ce5)

Seven censuses, run read-only. Each count comes from a heuristic script,
and what that script misses is noted. The scripts lived in the job's
scratch directory and are not kept: re-derive them when the gates are
written.

**Link 1: mixin cohesion.** 280 mixins, of which **45 have two or more
disconnected clusters**. A cluster is a set of members linked through
`this.`, with each field merged with its own accessors. Most second
clusters are dated: **a later build added a feature to an existing
host**, and the feature's verbs fall inside one cluster.

| mixin | the clusters | the build that added the second |
|---|---|---|
| `Organization` | roster and positions · the call | agent-coordination |
| `WaterPlace` | water and tide · pull-out rescue | river review D22 |
| `Metabolic` | digestion · eating as an act | cleanliness |
| `LoadBearing` | burden · buoyancy | underwater |
| `Chattel` | title · made-from and made-by | potash |
| `Display` | content · pairing and control | — |
| `Bonded` | bond · feeding by hand · hunger | — |
| `Marked` | text · writing device · hands | paper |
| `Mobile` | arrival messaging · engaged mode (no caller uses both) | — |
| `Business` | four clusters, and no caller uses two of them | — |

`Atmospheric` has seven clusters. `Persistable` and `Advancement` have three.
`Comminuting` is probably one idea split by the heuristic.

**Link 1: duck-typed protocols.** There are **940 probe sites across 404
names** (`?.(`, `typeof … === 'function'`, `'x' in`, shape casts).
Of these, **702 are protocol-shaped**. Of the method-shaped probes,
**222 sites across 152 names** have no `MixinApi.isX` behind them.
**25 names (61 sites) are declared by nothing at all**, which is the
`?.()` on a name nobody defines (`heatK`, `bulkSource`, `lightLux`,
`vesselKind`, `getVentilated`, …). At least 40 sites probe a name whose
predicate already exists (`getContainer` ×27, `getContents`, `getQuantity`,
`getMass`), so those are non-use, not a missing marker. A separate block of
155 sites probes Stuff-base members (`stuffId` ×57), and one `isStuff`
guard would cover them. The genuinely missing markers are:
- power and grid (`generationW`, `getReachRef`, `availablePowerW`);
- zone geometry (`getCellSize`);
- `getGrade`, `getSampling`, `canBeNamedBy` (four definers).

⚠ **No gate counts duck typing.** The rule is prose only.

**Link 2: collisions.** There are 371 views and 445 words. **Only 3 words
are claimed by two views**: `lease` and `unlease` (two localities, never
in reach together) and `pour`, where bulk and crafting are the same act
with different instruments, which is rung 1, unify. The ratchet holds.
Dispatch order is **newest affordance first**:
- a shape error falls through to the next view;
- a field-validator refusal also falls through, but the first refusal
  stands if no view takes the line;
- nobody is told that a collision happened.

⚠ `lint-family.md` still names the nine pairs from before the cut. The
open ambiguity has moved into **subcommand names**: 50 subcommand words
are also top-level verbs (`fight disarm` vs `disarm`, `bank transfer` vs
`transfer`).

**Link 3: self-targeting.** ⚠ **`lint:controller-resolution` does not
exist.** It was proposed in one-resolution-rule § 176 and never built.
The live `lint:instrument-args` reads 1, but about **34 controllers
self-resolve**: 16 hunt the player's own target (about 26 sites) and 18
hunt an implied instrument. ⚠ Both gates skip the 10 domain-local
`world/**` controllers. Three shapes:
- MQL called on player text inside the controller, because the view
  declared the arg `type: string` (Job ×4, Order, Journey, Print, Query);
- private word scorers, about seven distinct rules (Route's six-rung
  scorer, Hail, Call, Butcher, Harvest, Fit, Equip sets);
- fixed `reachable:[class.X]` hunts that belong in a view `default:`
  (TipJar ×2, JobBoard, Pilot, Comms ×3, Treat).

Also seen: duck-typed room walks (Title's `constructor.name === 'DeedDesk'`,
Draft's `getHerdId?`).

**Link 4: syntax.** Of 371 views:
- 43 use subcommands;
- **69 declare options**, and the parser already supports `--name`,
  `short:` and a stop token;
- 131 use `greedy`. Of their 201 greedy args, **124 exist only so that
  an object name can be several words**. That is a binder concern, not
  free text.

The heaviest views are all bench verbs, where each tool role takes its
own preposition: `carve` has 8, `butcher` and `plant` 7, `fit` 7, `write`
6. Subcommands cluster in the social and system views. Physical verbs are
flat, even in un-/dis- pairs on one operand. Families that could take
subcommands:
- **Nouns you operate:** the business seat (appoint/dismiss/quit/apply/tip/collect
  beside `clock`), money (`draw`/`pay` beside `bank`/`wallet`/`treasury`),
  Katie's three, Walter's two, parcel (`subdivide`/`transfer` beside
  `title`), the printer's forme (compose/proof/print/distribute), the herd,
  and the workspace tree (item 8).
- **English verbs on a thing:** door, slots, rope, burner, trap, fold.

**Link 5: smushed controllers.** There are **38 subcommand dispatchers**
(a `switch(sub)` or an `if` chain). Their arms share nothing but a
preamble, so they split mechanically: per-subcommand `controller:` already
works, and `cockpit` routes 7 controllers that way. The largest are Wiki
(17 arms, 1,063 lines), Party 15, Chat 13, Forum 11, Pack, Bank, Group,
Soul and Fight 8 each. There are also **14 dispatchers on type or kind**,
and most of those are ONE act on different objects, so they want a
protocol on the model rather than a split: Order's five services, Treat,
Rive, Print, Smelt, Put, Look's six append arms, Feed/Water,
Harvest/Label, Saw. ⭐ **Only Throw** (catch / pitch / attack), **Tan**
(an already-tanned hide is *lifted*) **and Read's spell tail** are
genuinely different acts hiding behind one verb.

**Links 6–7: mutations and decisions.** The census covered 375
controllers.
- **155 mutate directly, with 589 calls**: 235 through a mechanism Api,
  308 through setter-shaped calls, and 46 as field writes on another
  object.
- **1,011 decision tokens** (arithmetic, `Math.*`, thresholds,
  constants, tables). 36 controllers carry ten or more.
- **97 controllers hold 269 module-level functions**, the hidden shape
  the doctrine bans. The worst are Smelt 22 and Assay 12.
- ⭐ **The packs have 30% of the controllers and half of both counts.**

The worst controllers hold a whole physical model:
- Smelt: a=22, d=76, 17 kinetics constants, 1,037 lines.
- Fell: 32 and 27.
- Harvest and Plant in the kernel.
- Saw, Butcher, Mow (hay chemistry), Treat, Operate (writes
  `wound.severity` directly), Mill, Spin, Dye, Draft.

There are **52 duration constants across 44 controllers**, plus inline
duration math. Outcomes:
- `{ ok, reason }` unions are already the norm on the object side: 1,045
  sites and 80 `*Outcome`/`*Result` types, with no shared type.
- `ActPlan`/`ActRefusal`/`ActOutcome` reach 10 controllers. They put the
  **duration on the object**, which settles the slate's open question in
  the object's favor. ⚠ But they also put **the words on the object**
  (`line: Mml`), which contradicts "an act returns an outcome the
  controller words".

The heavy targets are clear of every in-flight sibling: water-supply
touches none of the top 20, and client-surface and wizard-axis touch only
two false positives.
