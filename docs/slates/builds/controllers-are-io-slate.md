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

### ⭐⭐ Decided after the scan (2026-11-05)

- **Scope: kernel first, and the packs as follow-on builds** (owner). This
  build delivers:
  - every link's census-then-ratchet gate;
  - source-scoped invocation;
  - the outcome type and the duration move;
  - the subcommand rule, applied to the 38 switch controllers;
  - the worst kernel offenders (Harvest, Plant, Put, Look, Order, Treat);
  - the clearly dated mixin splits.

  The pack burn-down (Smelt, Fell, Saw, Butcher, Mow, …) follows trade by
  trade under the ratchets.
- ⭐ **Source-scoped invocation is `verb@source`** (owner). It settles
  affordance-verb Q3. Examples: `set@watch 4:00`, `wind@'pocket watch'`,
  `pour@me:flask into glass`, `wind@all watches`.

  `::` was rejected for two reasons:
  - `:` is MQL's chain operator, so `here:bookcase:watch::set 4:00`
    is unreadable;
  - source-first breaks the verb being the first token, and the dispatcher,
    alias expansion, `help`, completion and `def` all key on that.

  `@` is in neither MQL's token table nor the shell's reserved set. Chat
  mentions (slated) are `@name` inside a message tail, never glued to the
  verb word. Q4 and Q5 stand as leaned: the scoped form is always optional,
  several matches go through the cardinality prompt, a non-interactive giver
  gets an error, and batch use is the declared cardinality many.

  Rejected alternatives:
  - `source.verb`: `.` appears in barewords and numbers;
  - a reserved `--via` option: too verbose, and `--from`/`--source` are
    taken by 11 views;
  - `>`, `!` and `^`.
- **Decided by lens 2** (an alternate controller must get identical
  behavior and must be free to word it its own way):
  - durations move onto the object, as `ActPlan` already does;
  - the object returns a reason code and data, and the controller writes
    the words, so `line: Mml` comes out of `ActRefusal`/`ActOutcome`.
- **Decided by one verb per act:** the type dispatchers become protocols
  on the model. Only Throw, Tan's lift and Read's spell tail split into
  separate acts.

### Reuse ledger for the plan

Every concept the build needs, what already does it, and whether the build
reuses it or generalizes it. The plan must account for every row. All of
these claims were verified at the scan except where marked *(verify)*.

| concept | what already does it | reuse / generalize |
|---|---|---|
| several sources match `verb@source` | `CommandApi.applyCardinalityPolicy` (cardinality, `onExcess`, `onShortage`, no-Interactive degrade) | reuse |
| resolving the source | `MqlApi.resolveOne` / `resolveMany`, the `@` side an ordinary expression | reuse; no new seed |
| narrowing the affordances to one source | affordance attribution (`affordances` verb; command-routing § Affordance attribution); `CommandGiver.getAffordances` / `_runChain` | generalize: filter the chain by source before dispatch |
| telling the player the other offer exists | `_runChain` field-refusal fall-through; the `shape-fall-through` note kind; response-envelope note kinds | generalize: one note carrying the alternative's scoped form |
| `@` in the command line | `api/command-line.ts` tokenizer (`RawToken`, `format()` round-trip) | generalize: split the verb word at its first `@`; `format()` must round-trip |
| a subcommand with its own controller | per-subcommand `controller:` (`cockpit` ×7, `house` ×6, `trace` ×2) | reuse |
| old top-level word kept working | view `verbs:`/aliases; player aliases (shell-alias) | reuse |
| options in place of prepositions | `options:` per view and per subcommand, `--name`/`short:`/`--` in the tokenizer | reuse |
| an act's plan, refusal, outcome | `lib/craft/ActPlan.ts` (`ActPlan`/`ActRefusal`/`ActOutcome`, ten controllers); 80 ad hoc `*Outcome`/`*Result` types; `{ok, reason}` at 1,045 sites | generalize: one convention; **drop `line: Mml`**, reasons a closed set per act |
| an act's duration and effort | `ActPlan.durationMs` / `effortW`; `engageStep` | reuse; move the 52 controller constants |
| an act as an object method | the cleanliness precedents (`Metabolic.eat`, `Floor.sweepInto`, `Tub.drawFrom`) | reuse the shape |
| a registered marker mixin | the ceramics planner markers; the `Mixins` registry; `MixinApi.isX` | reuse; ≥40 duck sites just use an existing `isX` |
| a split mixin keeping its old name | mixin composition order (mixins.md); `lint:mixin-names` | reuse: old factory = composition of the two |
| count-only-falls gates | `lint:object-verbs` (the pattern); `lint:verb-collisions` + `KNOWN_COLLISIONS`; `lint:instrument-args` (`BESPOKE_RESOLUTION_CEILING`); `lint:reachability`; `lint:completion-this`; `scripts/pack-roots.ts` | generalize `instrument-args` into the never-built `controller-resolution`; ⚠ the readers must cover the 10 `world/**` controllers they skip today |
| an alternate controller for one verb (drive 16) | domain-local view + controller path resolution (command-spec § Domain-local commands) | reuse *(verify that a wizard can install one in a live world)* |
| the before/after record (drive 10–15) | the wire harness (`packages/wire`) | reuse: a record captured before W1 |
| `pour` as one act | bulk `pour` (`Bulkable`) and crafting `pour` (`ManualBuild`, `DoughTrough`) | unify behind one protocol — collision ladder rung 1 |

### ⭐⭐⭐ Decided at plan review (2026-11-06, owner)

> *"I don't care about breaking tests or breaking players' data. Now is
> the time to break shit. I really don't like global aliases for verbs. I
> don't really think any controller should be claiming more than one verb
> ever at this point, and what few aliases we do mint we mint as default
> player aliases that a player can remove if they want."*

- **Breaking is accepted.** Saved scripts, player aliases and old
  command forms may stop working. There are no compatibility alias views
  and no "old form still binds".
- ⭐ **One view, one word.** No view's `verbs:` lists more than one word,
  and no controller answers more than one verb. About 65 views carry
  several words today. Each extra word is either deleted or minted as a
  **default player alias**: the shell-alias defaults tier,
  `static defaultAliases`, which a player removes with `alias unset` (a
  persisted tombstone). The machinery already exists. What has to be
  decided is where a PACK declares its default aliases, under load on
  use and with no central list.
- **Subcommand words are scoped by their noun** (my correction of the
  rule-4 overreach). `wiki read`, `bank open` and `party show` keep their
  words: the noun in front scopes them as `@` does, and reading a wiki
  page is reading. A subcommand is renamed only where it conflicts with a
  meta verb (`make` is the script runner, so `chat make` and the others
  become `create`). A subcommand that is the same act as an existing verb
  routes to it (`fight defend` → `defend`). The overlap gate counts only
  pairs that are truly different acts and are both reachable flat.
- **`throw` keeps its word in three shapes.** `throw X to Y` (catch),
  `throw X` (pitch) and `throw X at Y` (attack) are three views of one
  verb, each with its own controller. The collision ladder's test is
  whether the syntaxes conflict, and these do not. The collision gate
  learns to accept views whose shapes are disjoint. `toss` and `hurl` go.
- **The scoped source fills the slot it fits** (plan D2) stands.

### ⭐⭐⭐ Folded in at plan review: the adjacent design this build owns (2026-11-06)

The owner, after the first plan: *"there's a lot of other adjacent shit
we've talked about in the last few months you're missing."* Every item
below is already decided or slated elsewhere. This build absorbs them,
under the rule that a build takes more rather than splitting scope. Only
the work siblings hold stays out.

| link | item | source |
|---|---|---|
| 4 syntax | ⭐ **the rule, as command-taxonomy wrote it:** *an act on the world is a bare verb; a transaction with an institution's book is a subcommand of the institution's noun* (which covers `store deposit\|withdraw` and `shelf consign\|reclaim`). It supersedes the "noun you operate" wording here. There are no aliases: nothing is legacy. | command-taxonomy § The rule; items 1, 3, 4 |
| 4 | `category:` on every view, and `help` groups by it | command-taxonomy item 2 |
| 4 | ⭐ **a gate validating every view against `command.schema.json`, built FIRST**, because a sweep of views has already broken the platform pack's install once | command-taxonomy item 5 |
| 3 | scope order follows where the object lives: a world act looks in the room first, an in-hand act looks on your person first | command-taxonomy item 6 |
| 2/5 | the `reel` undo: fishing's `reel` returns to its pre-silk shape, and silk gets its own `unwind` in sericulture, ending the sericulture → fishing dependency | command-taxonomy item 7 |
| 4 | ⛔ OUT: the authoring verbs become subcommands of their trees. Wizard-axis holds them. | command-taxonomy item 8 |
| 4 | ⭐ **`make` is NOT the script runner.** `fix/script-runner-decouple` (10-18, unmerged, 1,338 commits behind, smithy drive owed) moves it to the shell's `do`. This build redoes that work on master, using the branch as reference, and retires the branch. | that branch; pottery/brickmaking § forming |
| 2 | `drive` vs `drift`: already split on master (`3e915f1d3`); what remains is the rename under one view, one word | affordance-verb § drive vs drift |
| 2 | `shadowed-by:` on a shadowed view replaces the `KNOWN_COLLISIONS` list in the linter | affordance-verb § KNOWN_COLLISIONS carrier |
| 2 | ~~the capability-keyed affordance table~~ ⛔ **not built: it was built and then reversed twice** (`b7f48eea0` → `ff9fd938b` → `85c7d47c5`, *one record of verb affordances*). command-routing.md § *There is ONE record* forbids it. My recall of it as "the end state" was stale. | the planner's grounding |
| 1 | bare verb shapes become protocol mixins (`Workable`, `Diggable`, `Splittable`, `Pumpable`, `Tappable`, `Cuttable`; about 18 `typeof x.method` controllers), each passing the earned test (more than one kind of host); a one-host protocol is a property of its host | verb-interfaces § Bare verb shapes, § 1 |
| 1 | a protocol mixin is presented as the verb it serves (`_mixinKind = 'protocol'`; the card says *answers: turn · dip*; Studio; `help turn` lists who answers) | verb-interfaces § 2 |
| 1 | `requires: affords`, probed against a dozen real verbs | verb-interfaces § Open |
| 7 | the cuts sweep (seven cut verbs through one protocol); `boil` folded into heating; `scrub` as a manner of `wash`; the single-target audit | verb-interfaces |
| 1 | ⭐ **the mixin-split test is WHO COMPOSES IT plus the IMPORT LIST** (the Slotted → Attired precedent), beside co-use. With breaking accepted, a split puts each half on its honest host instead of keeping a composite (`OnCall` → `Business`, `MadeFrom` → `Good`/`Vessel`). | slotted-split; plan P2 findings |
| 1 | ⭐ **mixin file naming:** 12 mixins live in a file not named for them (build-1's census, MR !520; `Throttleable` already fixed there). A gate holds the count, and the sweep moves each mixin to its own file. The 12: `HeldGoods` and `ConsignmentShelf` (`lib/retail/Consignment.ts`), `SeatedDrivable` (`lib/slot/Drivable.ts`), `Props` and `Costumed` (`lib/stuff/Staged.ts`), `Cutlery` (`lib/bulk/Utensil.ts`), `Tool` (`lib/craft/Tooled.ts`), `DisguiseBearing` (`lib/disguise/Disguise.ts`), `Registrar` (`lib/document/Register.ts`), `Reserved` (`lib/reserve.ts`, no subsystem folder), `Lounge` (`world/lounge/LoungeMixin.ts`, the banned suffix), and `OpenWorking` (`trade-quarrying/src/lib/Working.ts`). | build-1 hand-off |
| 3 | the reserved `--strict` / `--loose` option per invocation (options settle ambiguity) | explicit-targeting |
| 3 | the hand-rolled listing filters become MQL predicates delegating to methods | mql-predicate-parity |
| 3 | modality as a per-verb scope axis | scope-modality |
| 3 | names are not special in the scorer; MQL reads only what is perceptible | one-resolution-rule §§ 4–5 |
| scripts | fail closed when a controller would prompt with no `interactive`, naming the missing input. `verb@source` relies on this. | script-interaction |
| scripts | the line-level `--async` / `--sync` prefix | async-commands |
| 1 | the "bless `FromMixin` as the marker" question | call-security-pass |
| 1 | the composition signature becomes verb-aware | object-taxonomy |
| 2 | a structured reason on a disabled affordance row | affordance-suggestion |

Still OUT, held by siblings: `look` (client-surface) and the authoring
verbs and trees (wizard-axis).

### Scope closed (owner, 2026-11-06)

The plan was approved as it stands. Two items were named as LATER
builds, and the gates this build installs are what they will run under:
- **More mixin work:** extracting interfaces from complicated classes,
  and narrowing the mixins and classes that exist today. This goes to
  mixin-slate and base-class-narrowing.
- **Template inheritance done right:** the big template refactor, which
  may move where composition is declared. It goes to
  row-composition-slate and legibility-slate. This build's mixin splits
  name hosts by class and change no row's shape, so that refactor is not
  pre-empted.

---

## Scope-order audit (W2)

*controllers-are-io D21, built 2026-11-06.* Every object arg whose `scope:`
names `reachable` (361 rows, counting a subcommand that reuses an anchored
arg once per subcommand; 289 of them `reachable`-first), each with a
verdict. **The rule:** a verb whose target is, in the common case, underfoot
or standing — a fixture, the ground, a plant, a block, a floor, a counter, a
furnace — is a **world act** and declares `["here", "peers", "person"]`
(`["$focus", "here", "peers", "person"]` where it drilled first: `cut`). An
act on what you hold keeps `reachable`, which is person-first. No new seed,
no flag: the order is the dial, and the binder compares keyword tiers across
tries, so the order only decides a TIE.

**Room-first: 106 rows (98 view args).** ⚠ For review (plan risk 10): the
judgment calls are `bathe water`, `douse`/`light` (kept — a carried lamp and
a wall sconce are equally common), `butcher vessel` (kept), `close`/`open`
(kept), `shoot`/`throw target` (room — you never aim at your own pack), the
posture verbs (`sit`/`stand`/… on `["$focus", "reachable"]`, kept: a chair
is standing, but a tie with a carried thing named `chair` does not arise).
`scrape`, `groove`, `hew`, `mow`, `plough` were on the plan's seed list, but
their TARGET is a string (the patch, the face) — their only object arg is
the tool, which keeps `reachable`.

| view | sub | arg | scope before | verdict | why |
|---|---|---|---|---|---|
| `adjust.yaml` |  | `target` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `apiculture/rob.yaml` |  | `target` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `baking/bake.yaml` |  | `oven` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `blow.yaml` |  | `target` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `bulk/feed.yaml` |  | `part` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `bulk/feed.yaml` |  | `target` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `bulk/fill.yaml` |  | `source` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `bulk/water.yaml` |  | `part` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `bulk/water.yaml` |  | `target` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `carpentry/saw.yaml` |  | `log` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `combat/shoot.yaml` |  | `target` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `cordage/twist.yaml` |  | `jack` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `crafting/bathe.yaml` |  | `water` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `crafting/butcher.yaml` |  | `block` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `crafting/butcher.yaml` |  | `body` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `crafting/cut.yaml` |  | `target` | `[$focus,reachable]` | **room-first** | world act — underfoot or standing |
| `crafting/dip.yaml` |  | `bath` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `crafting/hammer.yaml` |  | `anvil` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `crafting/maintain.yaml` |  | `target` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `crafting/paint.yaml` |  | `target` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `crafting/quench.yaml` |  | `anvil` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `crafting/repair.yaml` |  | `item` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `crafting/scrub.yaml` |  | `target` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `crafting/sharpen.yaml` |  | `stone` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `crafting/wash.yaml` |  | `target` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `custody/store.yaml` | deposit | `book` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `custody/store.yaml` | receipts | `book` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `custody/store.yaml` | withdraw | `book` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `device/bail.yaml` |  | `target` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `device/cover.yaml` |  | `fire` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `device/draught.yaml` |  | `fire` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `device/draught.yaml` | banked | `fire` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `device/draught.yaml` | half | `fire` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `device/draught.yaml` | low | `fire` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `device/draught.yaml` | open | `fire` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `device/draught.yaml` | wide | `fire` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `device/fire.yaml` |  | `kiln` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `device/lift.yaml` |  | `device` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `device/pump.yaml` |  | `target` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `device/stoke.yaml` |  | `burner` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `device/turn.yaml` |  | `target` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `device/turn.yaml` | back | `target` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `drilling/bore.yaml` |  | `hole` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `drilling/bore.yaml` |  | `rig` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `drilling/line.yaml` |  | `hole` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `drilling/line.yaml` |  | `rig` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `dyeing/dye.yaml` |  | `bath` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `energy/sever.yaml` |  | `line` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `farming/mow.yaml` |  | `part` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `farming/plough.yaml` |  | `part` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `farming/unmark.yaml` |  | `field` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `fishing/fish.yaml` |  | `shore` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `fishing/lay.yaml` |  | `shore` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `fishing/release.yaml` |  | `shore` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `forestry/fell.yaml` |  | `target` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `forestry/rive.yaml` |  | `target` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `forestry/tap.yaml` |  | `target` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `fuel/char.yaml` |  | `clamp` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `glass/flatten.yaml` |  | `furnace` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `glass/glaze.yaml` |  | `window` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `glass/reheat.yaml` |  | `furnace` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `ground/dig.yaml` |  | `target` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `ground/split.yaml` |  | `target` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `harbor/berth.yaml` |  | `book` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `haulage/ship.yaml` |  | `desk` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `inventory/dispose.yaml` |  | `heap` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `inventory/dispose.yaml` |  | `midden` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `inventory/harvest.yaml` |  | `part` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `inventory/harvest.yaml` |  | `target` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `inventory/label.yaml` |  | `part` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `inventory/plant.yaml` |  | `part` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `inventory/plant.yaml` |  | `pot` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `inventory/sample.yaml` |  | `part` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `inventory/sweep.yaml` |  | `target` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `inventory/throw.yaml` |  | `target` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `medical/donate.yaml` |  | `window` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `medical/issue.yaml` |  | `window` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `medical/warm.yaml` |  | `source` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `milling/mill.yaml` |  | `mill` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `mining/assay.yaml` |  | `bench` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `mining/stake.yaml` |  | `register` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `papermaking/couch.yaml` |  | `post` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `perception/survey.yaml` |  | `target` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `printing/print.yaml` |  | `on` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `retail/buy.yaml` |  | `counter` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `retail/check.yaml` |  | `rack` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `retail/consign.yaml` |  | `shelf` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `retail/menu.yaml` |  | `counter` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `retail/menu.yaml` |  | `menu` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `retail/menu.yaml` |  | `target` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `retail/order.yaml` |  | `counter` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `retail/order.yaml` |  | `menu` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `retail/reclaim.yaml` |  | `shelf` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `retail/rent.yaml` |  | `boat` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `retail/rent.yaml` |  | `book` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `retail/sell.yaml` |  | `counter` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `smelting/smelt.yaml` |  | `furnace` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `sugar/clay.yaml` |  | `loaf` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `sugar/skim.yaml` |  | `copper` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `sugar/temper.yaml` |  | `copper` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `tally.yaml` |  | `target` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `tanning/tan.yaml` |  | `pit` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `textiles/spin.yaml` |  | `wheel` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `textiles/weave.yaml` |  | `loom` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `wind.yaml` |  | `target` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `work/charter.yaml` |  | `book` | `[reachable]` | **room-first** | world act — underfoot or standing |
| `author/destruct.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `author/goto.yaml` |  | `target` | `[online,/stuff/**,/platform/**,reachable]` | keep | a person, here or online |
| `banking/bank.yaml` | transfer | `recipient` | `[reachable,online]` | keep | a person, here or online |
| `banking/house.yaml` | payroll | `worker` | `[reachable,online]` | keep | a person, here or online |
| `banking/house.yaml` | price | `thing` | `[reachable]` | keep | in-hand act |
| `banking/pay.yaml` |  | `recipient` | `[reachable,online]` | keep | a person, here or online |
| `boundary/close.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `boundary/lock.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `boundary/open.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `boundary/unlock.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `bulk/drink.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `bulk/eat.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `bulk/eat.yaml` |  | `with` | `[reachable]` | keep | instrument in hand |
| `bulk/feed.yaml` |  | `source` | `[reachable]` | keep | in-hand act |
| `bulk/fill.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `bulk/pour.yaml` |  | `source` | `[reachable]` | keep | in-hand act |
| `bulk/pour.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `bulk/sip.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `bulk/spill.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `bulk/water.yaml` |  | `source` | `[reachable]` | keep | in-hand act |
| `carpentry/saw.yaml` |  | `saw` | `[reachable]` | keep | instrument in hand |
| `combat/attack.yaml` |  | `target` | `[$focus,reachable]` | keep | a person or animal — never carried |
| `combat/defend.yaml` |  | `target` | `[$focus,reachable]` | keep | drill-first inspection / body act |
| `combat/fight.yaml` | switch | `target` | `[inventory,reachable]` | keep | a person or animal — never carried |
| `combat/intervene.yaml` |  | `target` | `[$focus,reachable]` | keep | drill-first inspection / body act |
| `combat/shoot.yaml` |  | `launcher` | `[reachable]` | keep | in-hand act |
| `crafting/bathe.yaml` |  | `cleanser` | `[reachable]` | keep | in-hand act |
| `crafting/butcher.yaml` |  | `blade` | `[reachable]` | keep | in-hand act |
| `crafting/butcher.yaml` |  | `tools` | `[reachable]` | keep | instrument in hand |
| `crafting/butcher.yaml` |  | `vessel` | `[reachable]` | keep | in-hand act |
| `crafting/carve.yaml` |  | `for` | `[reachable]` | keep | in-hand act |
| `crafting/carve.yaml` |  | `knife` | `[reachable]` | keep | instrument in hand |
| `crafting/carve.yaml` |  | `of` | `[reachable]` | keep | in-hand act |
| `crafting/carve.yaml` |  | `stock` | `[reachable]` | keep | in-hand act |
| `crafting/carve.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `crafting/carve.yaml` |  | `thing` | `[reachable]` | keep | in-hand act |
| `crafting/cure.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `crafting/cut.yaml` |  | `tools` | `[reachable]` | keep | instrument in hand |
| `crafting/dip.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `crafting/dry.yaml` |  | `cloth` | `[reachable]` | keep | in-hand act |
| `crafting/dry.yaml` |  | `rack` | `[reachable]` | keep | in-hand act |
| `crafting/dry.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `crafting/fit.yaml` |  | `thing` | `[reachable]` | keep | in-hand act |
| `crafting/fit.yaml` |  | `tool` | `[reachable]` | keep | instrument in hand |
| `crafting/fit.yaml` |  | `whole` | `[reachable]` | keep | in-hand act |
| `crafting/garnish.yaml` |  | `garnish` | `[reachable]` | keep | in-hand act |
| `crafting/garnish.yaml` |  | `glass` | `[reachable]` | keep | in-hand act |
| `crafting/hammer.yaml` |  | `striker` | `[reachable]` | keep | instrument in hand |
| `crafting/hammer.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `crafting/heat.yaml` |  | `pot` | `[reachable]` | keep | instrument in hand |
| `crafting/heat.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `crafting/impress.yaml` |  | `medium` | `[reachable]` | keep | in-hand act |
| `crafting/impress.yaml` |  | `pattern` | `[reachable]` | keep | in-hand act |
| `crafting/knead.yaml` |  | `vessel` | `[reachable]` | keep | in-hand act |
| `crafting/maintain.yaml` |  | `kit` | `[reachable]` | keep | instrument in hand |
| `crafting/muddle.yaml` |  | `muddler` | `[reachable]` | keep | instrument in hand |
| `crafting/muddle.yaml` |  | `vessel` | `[reachable]` | keep | in-hand act |
| `crafting/paint.yaml` |  | `brush` | `[reachable]` | keep | instrument in hand |
| `crafting/paint.yaml` |  | `pot` | `[reachable]` | keep | in-hand act |
| `crafting/plate.yaml` |  | `dish` | `[reachable]` | keep | in-hand act |
| `crafting/plate.yaml` |  | `vessel` | `[reachable]` | keep | in-hand act |
| `crafting/pour.yaml` |  | `spirit` | `[reachable]` | keep | in-hand act |
| `crafting/pour.yaml` |  | `vessel` | `[reachable]` | keep | in-hand act |
| `crafting/quench.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `crafting/repair.yaml` |  | `kit` | `[reachable]` | keep | instrument in hand |
| `crafting/salvage.yaml` |  | `item` | `[reachable]` | keep | in-hand act |
| `crafting/scrub.yaml` |  | `brush` | `[reachable]` | keep | instrument in hand |
| `crafting/scrub.yaml` |  | `cleanser` | `[reachable]` | keep | in-hand act |
| `crafting/scrub.yaml` |  | `water` | `[reachable]` | keep | in-hand act |
| `crafting/serve.yaml` |  | `patron` | `[reachable]` | keep | a person or animal — never carried |
| `crafting/shape.yaml` |  | `instrument` | `[reachable]` | keep | instrument in hand |
| `crafting/shape.yaml` |  | `material` | `[reachable]` | keep | in-hand act |
| `crafting/sharpen.yaml` |  | `blade` | `[reachable]` | keep | in-hand act |
| `crafting/smoke.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `crafting/splice.yaml` |  | `other` | `[reachable]` | keep | in-hand act |
| `crafting/splice.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `crafting/steep.yaml` |  | `solute` | `[inventory,reachable]` | keep | in-hand (inventory first) |
| `crafting/steep.yaml` |  | `vessel` | `[inventory,reachable]` | keep | in-hand (inventory first) |
| `crafting/stir.yaml` |  | `vessel` | `[reachable]` | keep | in-hand act |
| `crafting/strain.yaml` |  | `glass` | `[reachable]` | keep | in-hand act |
| `crafting/strain.yaml` |  | `vessel` | `[reachable]` | keep | in-hand act |
| `crafting/wash.yaml` |  | `cleanser` | `[reachable]` | keep | in-hand act |
| `crafting/wash.yaml` |  | `water` | `[reachable]` | keep | in-hand act |
| `device/arm.yaml` |  | `target` | `[$focus,reachable]` | keep | drill-first inspection / body act |
| `device/bail.yaml` |  | `tool` | `[reachable]` | keep | instrument in hand |
| `device/bail.yaml` |  | `vessel` | `[inventory,reachable]` | keep | in-hand (inventory first) |
| `device/disarm.yaml` |  | `target` | `[$focus,reachable]` | keep | drill-first inspection / body act |
| `device/douse.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `device/fold.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `device/ignite.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `device/stoke.yaml` |  | `fuel` | `[reachable]` | keep | in-hand act |
| `device/switch.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `device/unfold.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `drilling/line.yaml` |  | `liner` | `[inventory,reachable]` | keep | in-hand (inventory first) |
| `dyeing/dye.yaml` |  | `target` | `[inventory,reachable]` | keep | in-hand (inventory first) |
| `dyeing/mordant.yaml` |  | `target` | `[inventory,reachable]` | keep | in-hand (inventory first) |
| `employment/appoint.yaml` |  | `target` | `[reachable,online]` | keep | a person or animal — never carried |
| `employment/dismiss.yaml` |  | `target` | `[reachable,online]` | keep | a person or animal — never carried |
| `farming/mow.yaml` |  | `tool` | `[reachable]` | keep | instrument in hand |
| `farming/plough.yaml` |  | `tool` | `[reachable]` | keep | instrument in hand |
| `forestry/fell.yaml` |  | `axe` | `[reachable]` | keep | instrument in hand |
| `forestry/rive.yaml` |  | `froe` | `[reachable]` | keep | instrument in hand |
| `forestry/tap.yaml` |  | `tool` | `[reachable]` | keep | instrument in hand |
| `forestry/tap.yaml` |  | `vessel` | `[inventory,reachable]` | keep | in-hand (inventory first) |
| `glass/crack.yaml` |  | `pipe` | `[reachable]` | keep | instrument in hand |
| `glass/flatten.yaml` |  | `cylinder` | `[reachable]` | keep | in-hand act |
| `glass/glaze.yaml` |  | `pane` | `[reachable]` | keep | in-hand act |
| `glass/groze.yaml` |  | `pliers` | `[reachable]` | keep | instrument in hand |
| `glass/groze.yaml` |  | `sheet` | `[reachable]` | keep | in-hand act |
| `glass/reheat.yaml` |  | `pipe` | `[reachable]` | keep | instrument in hand |
| `glass/scribe.yaml` |  | `sheet` | `[reachable]` | keep | in-hand act |
| `glass/scribe.yaml` |  | `wheel` | `[reachable]` | keep | instrument in hand |
| `glass/snap.yaml` |  | `sheet` | `[reachable]` | keep | in-hand act |
| `ground/dig.yaml` |  | `tool` | `[reachable]` | keep | instrument in hand |
| `ground/ditch.yaml` |  | `tool` | `[reachable]` | keep | instrument in hand |
| `ground/grub.yaml` |  | `tool` | `[reachable]` | keep | instrument in hand |
| `ground/lime.yaml` |  | `agent` | `[reachable]` | keep | in-hand act |
| `ground/split.yaml` |  | `tool` | `[reachable]` | keep | instrument in hand |
| `haulage/ship.yaml` |  | `goods` | `[$focus,reachable]` | keep | drill-first inspection / body act |
| `ice/groove.yaml` |  | `tool` | `[reachable]` | keep | instrument in hand |
| `ice/scrape.yaml` |  | `tool` | `[reachable]` | keep | instrument in hand |
| `inventory/brush.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `inventory/brush.yaml` |  | `tool` | `[reachable]` | keep | instrument in hand |
| `inventory/coil.yaml` |  | `target` | `[$focus,reachable]` | keep | drill-first inspection / body act |
| `inventory/equip.yaml` |  | `target` | `[inventory,reachable]` | keep | in-hand (inventory first) |
| `inventory/harvest.yaml` |  | `tool` | `[reachable]` | keep | instrument in hand |
| `inventory/inventory.yaml` |  | `target` | `[$focus,reachable]` | keep | drill-first inspection / body act |
| `inventory/label.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `inventory/offer.yaml` |  | `food` | `[inventory,reachable]` | keep | in-hand (inventory first) |
| `inventory/offer.yaml` |  | `recipient` | `[reachable]` | keep | a person or animal — never carried |
| `inventory/plant.yaml` |  | `drill` | `[reachable]` | keep | instrument in hand |
| `inventory/plant.yaml` |  | `seed` | `[reachable]` | keep | in-hand act |
| `inventory/pull.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `inventory/repot.yaml` |  | `plant` | `[reachable]` | keep | in-hand act |
| `inventory/repot.yaml` |  | `pot` | `[reachable]` | keep | in-hand act |
| `inventory/sample.yaml` |  | `subject` | `[$focus,reachable]` | keep | drill-first inspection / body act |
| `inventory/seal.yaml` |  | `thing` | `[inventory,reachable]` | keep | in-hand (inventory first) |
| `inventory/sweep.yaml` |  | `tool` | `[reachable]` | keep | instrument in hand |
| `inventory/tear.yaml` |  | `thing` | `[inventory,reachable]` | keep | in-hand (inventory first) |
| `inventory/throw.yaml` |  | `item` | `[reachable]` | keep | in-hand act |
| `inventory/tie.yaml` |  | `load` | `[reachable]` | keep | in-hand act |
| `inventory/untie.yaml` |  | `target` | `[$focus,reachable]` | keep | drill-first inspection / body act |
| `inventory/write.yaml` |  | `medium` | `[inventory,reachable]` | keep | in-hand (inventory first) |
| `inventory/write.yaml` |  | `surface` | `[inventory,reachable]` | keep | in-hand (inventory first) |
| `magic/cast.yaml` |  | `target` | `[$focus,reachable]` | keep | drill-first inspection / body act |
| `magic/recharge.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `magic/study.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `magic/zap.yaml` |  | `item` | `[reachable]` | keep | in-hand act |
| `magic/zap.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `medical/bleed.yaml` |  | `donor` | `[reachable]` | keep | a person or animal — never carried |
| `medical/bleed.yaml` |  | `vessel` | `[inventory,reachable]` | keep | in-hand (inventory first) |
| `medical/bleed.yaml` |  | `with` | `[reachable]` | keep | instrument in hand |
| `medical/cool.yaml` |  | `patient` | `[reachable]` | keep | a person or animal — never carried |
| `medical/cool.yaml` |  | `water` | `[reachable]` | keep | in-hand act |
| `medical/donate.yaml` |  | `bag` | `[inventory,reachable]` | keep | in-hand (inventory first) |
| `medical/dose.yaml` |  | `patient` | `[reachable]` | keep | a person or animal — never carried |
| `medical/dose.yaml` |  | `prescription` | `[inventory,reachable]` | keep | in-hand (inventory first) |
| `medical/dose.yaml` |  | `with` | `[inventory,reachable]` | keep | in-hand (inventory first) |
| `medical/issue.yaml` |  | `recipient` | `[reachable]` | keep | a person or animal — never carried |
| `medical/operate.yaml` |  | `kit` | `[reachable]` | keep | instrument in hand |
| `medical/operate.yaml` |  | `patient` | `[reachable]` | keep | a person or animal — never carried |
| `medical/prescribe.yaml` |  | `pad` | `[reachable]` | keep | instrument in hand |
| `medical/prescribe.yaml` |  | `patient` | `[reachable]` | keep | a person or animal — never carried |
| `medical/rinse.yaml` |  | `patient` | `[reachable]` | keep | a person or animal — never carried |
| `medical/rinse.yaml` |  | `water` | `[reachable]` | keep | in-hand act |
| `medical/set.yaml` |  | `patient` | `[reachable]` | keep | a person or animal — never carried |
| `medical/set.yaml` |  | `splint` | `[reachable]` | keep | instrument in hand |
| `medical/suture.yaml` |  | `patient` | `[reachable]` | keep | a person or animal — never carried |
| `medical/suture.yaml` |  | `with` | `[reachable]` | keep | instrument in hand |
| `medical/tend.yaml` |  | `patient` | `[reachable]` | keep | a person or animal — never carried |
| `medical/test.yaml` |  | `patient` | `[reachable]` | keep | a person or animal — never carried |
| `medical/test.yaml` |  | `with` | `[reachable]` | keep | instrument in hand |
| `medical/transfuse.yaml` |  | `patient` | `[reachable]` | keep | a person or animal — never carried |
| `medical/transfuse.yaml` |  | `syringe` | `[reachable]` | keep | instrument in hand |
| `medical/transfuse.yaml` |  | `vessel` | `[inventory,reachable]` | keep | in-hand (inventory first) |
| `medical/treat.yaml` |  | `target` | `[$focus,reachable]` | keep | a person or animal — never carried |
| `medical/treat.yaml` |  | `with` | `[inventory,reachable]` | keep | in-hand (inventory first) |
| `medical/undress.yaml` |  | `target` | `[$focus,reachable]` | keep | a person or animal — never carried |
| `medical/warm.yaml` |  | `patient` | `[reachable]` | keep | a person or animal — never carried |
| `milling/mill.yaml` |  | `grain` | `[reachable]` | keep | in-hand act |
| `mining/assay.yaml` |  | `samples` | `[reachable]` | keep | in-hand act |
| `mining/drain.yaml` |  | `vessel` | `[reachable]` | keep | in-hand act |
| `mining/hew.yaml` |  | `tool` | `[reachable]` | keep | instrument in hand |
| `mining/shore.yaml` |  | `timber` | `[reachable]` | keep | instrument in hand |
| `movement/belay.yaml` |  | `person` | `[reachable]` | keep | in-hand act |
| `movement/belay.yaml` |  | `rope` | `[reachable]` | keep | in-hand act |
| `movement/drive.yaml` |  | `target` | `[$focus,reachable]` | keep | drill-first inspection / body act |
| `movement/hitch.yaml` |  | `mount` | `[reachable]` | keep | in-hand act |
| `movement/hitch.yaml` |  | `target` | `[$focus,reachable]` | keep | drill-first inspection / body act |
| `movement/mount.yaml` |  | `target` | `[$focus,reachable]` | keep | drill-first inspection / body act |
| `movement/ride.yaml` |  | `target` | `[$focus,reachable]` | keep | drill-first inspection / body act |
| `movement/teleport.yaml` |  | `destination` | `[reachable,here,peers]` | keep | in-hand act |
| `movement/unhitch.yaml` |  | `target` | `[$focus,reachable]` | keep | drill-first inspection / body act |
| `papermaking/couch.yaml` |  | `mould` | `[inventory,reachable]` | keep | in-hand (inventory first) |
| `perception/analyze.yaml` |  | `subject` | `[$focus,reachable,horizon]` | keep | drill-first inspection / body act |
| `perception/analyze.yaml` |  | `tool` | `[reachable]` | keep | instrument in hand |
| `perception/assess.yaml` |  | `target` | `[$focus,reachable]` | keep | a person or animal — never carried |
| `perception/feel.yaml` |  | `target` | `[$focus,reachable]` | keep | drill-first inspection / body act |
| `perception/focus.yaml` |  | `fragment` | `[$focus,reachable]` | keep | drill-first inspection / body act |
| `perception/listen.yaml` |  | `target` | `[$focus,reachable]` | keep | drill-first inspection / body act |
| `perception/look.yaml` |  | `target` | `[$focus,reachable]` | keep | drill-first inspection / body act |
| `perception/measure.yaml` |  | `subject` | `[$focus,reachable,horizon]` | keep | drill-first inspection / body act |
| `perception/measure.yaml` |  | `tool` | `[reachable]` | keep | instrument in hand |
| `perception/query.yaml` |  | `set` | `[reachable]` | keep | in-hand act |
| `perception/read.yaml` |  | `target` | `[$focus,reachable]` | keep | drill-first inspection / body act |
| `perception/readings.yaml` |  | `tool` | `[reachable]` | keep | instrument in hand |
| `perception/ring.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `perception/scry.yaml` |  | `with` | `[reachable]` | keep | in-hand act |
| `perception/search.yaml` |  | `target` | `[$focus,reachable]` | keep | drill-first inspection / body act |
| `perception/sense.yaml` |  | `target` | `[$focus,reachable]` | keep | drill-first inspection / body act |
| `perception/show.yaml` |  | `screen` | `[inventory,reachable]` | keep | in-hand (inventory first) |
| `perception/smell.yaml` |  | `target` | `[$focus,reachable]` | keep | drill-first inspection / body act |
| `perception/taste.yaml` |  | `target` | `[$focus,reachable]` | keep | drill-first inspection / body act |
| `perception/weigh.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `posture/kneel.yaml` |  | `target` | `[$focus,reachable]` | keep | drill-first inspection / body act |
| `posture/lie.yaml` |  | `target` | `[$focus,reachable]` | keep | drill-first inspection / body act |
| `posture/sit.yaml` |  | `target` | `[$focus,reachable]` | keep | drill-first inspection / body act |
| `posture/stand.yaml` |  | `target` | `[$focus,reachable]` | keep | drill-first inspection / body act |
| `printing/compose.yaml` |  | `forme` | `[inventory,reachable]` | keep | in-hand (inventory first) |
| `printing/copy.yaml` |  | `from` | `[inventory,reachable]` | keep | in-hand (inventory first) |
| `printing/distribute.yaml` |  | `forme` | `[inventory,reachable]` | keep | in-hand (inventory first) |
| `printing/proof.yaml` |  | `forme` | `[inventory,reachable]` | keep | in-hand (inventory first) |
| `ranching/breed.yaml` |  | `target` | `[reachable]` | keep | a person or animal — never carried |
| `ranching/gather.yaml` |  | `target` | `[reachable]` | keep | a person or animal — never carried |
| `ranching/handle.yaml` |  | `target` | `[reachable]` | keep | a person or animal — never carried |
| `ranching/milk.yaml` |  | `target` | `[reachable]` | keep | a person or animal — never carried |
| `ranching/milk.yaml` |  | `vessel` | `[inventory,reachable]` | keep | in-hand (inventory first) |
| `ranching/return.yaml` |  | `target` | `[reachable]` | keep | a person or animal — never carried |
| `ranching/shear.yaml` |  | `target` | `[reachable]` | keep | a person or animal — never carried |
| `ranching/slaughter.yaml` |  | `target` | `[reachable]` | keep | a person or animal — never carried |
| `sericulture/unwind.yaml` |  | `cocoons` | `[inventory,reachable]` | keep | in-hand (inventory first) |
| `sericulture/unwind.yaml` |  | `tool` | `[reachable]` | keep | instrument in hand |
| `shell/find.yaml` |  | `query` | `[$focus,reachable]` | keep | drill-first inspection / body act |
| `social/introduce.yaml` |  | `subject` | `[reachable]` | keep | a person or animal — never carried |
| `social/name.yaml` |  | `target` | `[reachable]` | keep | in-hand act |
| `social/party.yaml` | assign | `target` | `[reachable,online]` | keep | a person or animal — never carried |
| `social/party.yaml` | enlist | `target` | `[reachable]` | keep | a person or animal — never carried |
| `social/pet.yaml` |  | `target` | `[reachable]` | keep | a person or animal — never carried |
| `social/pilot.yaml` |  | `pilot` | `[$focus,reachable]` | keep | drill-first inspection / body act |
| `social/profile.yaml` |  | `target` | `[reachable,online]` | keep | a person or animal — never carried |
| `social/stay.yaml` |  | `target` | `[reachable]` | keep | a person or animal — never carried |
| `social/talk.yaml` |  | `target` | `[$focus,reachable]` | keep | a person or animal — never carried |
| `sugar/clay.yaml` |  | `clay` | `[reachable]` | keep | in-hand act |
| `sugar/skim.yaml` |  | `pail` | `[reachable]` | keep | in-hand act |
| `sugar/temper.yaml` |  | `lime` | `[reachable]` | keep | in-hand act |
| `system/trace.yaml` | address | `location` | `[reachable]` | keep | in-hand act |
| `tailoring/alter.yaml` |  | `garment` | `[inventory,reachable]` | keep | in-hand (inventory first) |
| `tailoring/alter.yaml` |  | `kit` | `[reachable]` | keep | instrument in hand |
| `tailoring/sew.yaml` |  | `kit` | `[reachable]` | keep | instrument in hand |
| `tailoring/sew.yaml` |  | `pieces` | `[inventory,reachable]` | keep | in-hand (inventory first) |
| `tanning/tan.yaml` |  | `hide` | `[reachable]` | keep | in-hand act |
| `textiles/scutch.yaml` |  | `board` | `[reachable]` | keep | instrument in hand |
| `textiles/scutch.yaml` |  | `source` | `[inventory,reachable]` | keep | in-hand (inventory first) |
| `textiles/spin.yaml` |  | `stock` | `[inventory,reachable]` | keep | in-hand (inventory first) |
| `textiles/weave.yaml` |  | `yarn` | `[inventory,reachable]` | keep | in-hand (inventory first) |

## `requires: affords` — the twelve-verb probe (W4)

Built as a slot predicate (`CommandLogic.parseRequirement`, D8d): the
candidate itself contributes this view, read from the class chain's own
`commandContributions` and skipping any gated mixin that is not active. An
AND-term only; `affords|XMixin` throws at spec-load. The method: every view's
slots and every class naming the view were read; the term is tested against
real views in `command-requires-affords.test.ts` and terminus'
`affords-views.test.ts`. ⚠ Only `wind`, `adjust` and `blow` were opted in, so
the other nine verdicts are readings, not runs.

The four edges, as ruled:

- **Placement: "contributes the view at all", any bucket.** Scope decides
  reach. Measured: `Whistle` contributes `environment` only and `Watch`
  `inventory` + `environment`, so a per-bucket read would refuse a held
  whistle the scope had already admitted.
- **Conferred: counted, through `getActiveMixins`.** It covers augment-gated
  mixins the class COMPOSES. ⚠ A mixin the class does not compose at all is
  not read; no verb here needs one. None of the twelve is conferred today
  (the gated mixins are `Aether` and `Caster`).
- **Affording ≠ target, and two roles: `affords` cannot see either.** Both
  are the reason it is per slot. Five of the twelve are wrong on their target.

| verb | who contributes it | the slot | affording = target? | placement | conferred | two roles | verdict |
|---|---|---|---|---|---|---|---|
| `wind` | `Watch` | `target` (`any`) | yes | inventory + environment; `any` bucket holds | no | no | ⭐ **opted in** |
| `adjust` | `Watch` | `target` (`any`) | yes | same | no | no | ⭐ **opted in** |
| `blow` | `Whistle` | `target` (`any`) | yes | environment only, and a held whistle still binds | no | no | ⭐ **opted in** |
| `pump` | `Pump`, `Burner`, `AirPump`, `Well`, `BilgeWell`, `Wellhead` | `target` (`PumpableMixin\|PumpSourceMixin`) | yes | no issue | no | no | not needed: the protocol already says it |
| `turn` | `TurnableMixin`, `RopeJack` | `target` (`any`) | yes | no issue | no | no | not needed: the slot should name `TurnableMixin` |
| `stir` | `CompoundingMixin`, `HandWorkedMixin`, `ManualBuildMixin` | `vessel` (`any`) | yes | no issue | no | no | a fair candidate: three mixins and no one protocol; not opted in, an alternation also fits |
| `dip` | `DipBathMixin`, `DipPot`, `Blowpipe` | `bath` (`DipBathMixin`); `target` (`any`) | ⛔ no on `target`: a wick affords nothing, and the pipe affords `dip` without being a bath | no issue | no | ⚠ pipe and bath | no: the mixin on `bath` is the exact test |
| `carve` (on) | `CarvableMixin`, `Board`, `Blank` | `target` (`any`), `stock` (`TangibleMixin`) | yes on `target`; ⛔ no on `knife` | no issue | no | ⚠ yes: a board is carved FROM and a pot ON, and both afford it | no: the planner decides, as the slate guessed |
| `strain` | `Strainer` | `vessel`, `glass` (`ManualBuildMixin`) | ⛔ no: the strainer affords it, the drink is strained | no issue | no | no | no |
| `serve` | `BarStation` | `patron` (`class:Agent`) | ⛔ no: the station affords it, a person is served | no issue | no | no | no |
| `tap` | `Stand`, `SapStandard` | `target` (`any`) | ⚠ half: a `Stand` (a location) affords it and the tree inside is tapped | ⚠ `Stand` contributes `inventory`, its occupants' bucket | no | ⚠ place and tree | no: it would admit the wood itself |
| `switch` | `ManaLamp`, `ElectricPump`, `Stamper` | `target` (`SwitchableMixin`) | yes | no issue | no | no | ⛔ no: 11 classes compose `SwitchableMixin` and only those 3 name the view, so `affords` would refuse the rest. ⚠ A finding for the owner: nothing here established how `SconceLamp` and the others afford `switch` |

⭐ **The ruling.** `affords` fits a verb whose one thing offers it and has no
protocol of its own to name: the single-host verbs. It says less than a
protocol mixin everywhere one exists, and it is wrong for every tool verb. It
stays beside the mixin, never instead of it. ⚠ What it costs: an opted-in slot's
refusal is the binder's (*You can't wind the rock.*), where the controller said
*You can't wind that.*; those controllers' own arms stay as the type narrowing.

## Deferred from the build — salvaged from the retired plan (2026-11-07)

The plan's § Deferred seams, verbatim, so nothing it deferred depends on
the plan surviving. Each names its destination; where the destination
slate does not yet carry the item, this section is its record.

- `look`'s six arms → their objects after client-surface merges —
  **one-resolution-rule-slate** § 2.
- The pack burn-down (Smelt, Fell beyond the cross-cut, Saw beyond the
  cut, Butcher beyond the cut, Mow, Mill, Spin, Dye, Draft, Operate…) —
  **controllers-are-io-slate** keeps the scan list.
- `PumpableMixin` narrowed to `Firebox`; `SeatedDrivableMixin`'s
  deletion; `getMass`'s four definers; the other 40 split-cluster mixins
  (the gate's ranked census) — **mixin-slate**.
- The printer's forme, the herd, Katie's and Walter's nouns; the
  workspace trees after wizard-axis; `title buy` over `ForSale`; the
  five `set` subcommands if the owner rules otherwise —
  **command-taxonomy-slate**.
- `shadowed-by:` — **not needed**: the disjointness proof replaces
  adjudication and `KNOWN_COLLISIONS` empties — **affordance-verb-slate**
  (recorded as closed).
- The audit rail (`@Audited`, `audit_events`), `FromIdentity`, pack gate
  participants, interface admission — **call-security-pass-slate**
  (the decision and the hoist landed here).
- Scope-modality's per-modality permeability, transparent containers,
  the feasibility validator — **scope-modality-slate** (only `eat`'s
  `canReach` lands here).
- Object-taxonomy's mint, subtraction, the `/stuff` committee —
  **object-taxonomy-slate** (the signature and census landed here).
- Affordance-suggestion's `narrow()`, relational axis, history, ranking
  — **affordance-suggestion-slate**.
- Async-commands' per-actor cap and generic cancel —
  **async-commands-slate**.
- `@name` mentions in a message tail — **chat slate**.
- `engagement-completed` carrying the outcome's facts —
  **response-envelope** follow-on.
- The decouple branch's findings (stranded recipes, heat-tie shadowing,
  a `record` macro, rows whose class doesn't exist) — its own findings
  slate, landed with W6.

---

### Known and not fixed at merge (from MR !527)

- 12g: a transfusion collects outside the command frame, so `paid: 0` (pre-existing).
- `WalletController` keeps a three-arm switch.
- Batch under `--async`: each detached attempt fires its own envelope.
- Not on the act shape: Rope's `tie`/`untie`, `SugarLoaf.clay`, `LiftSource`'s bucket, retail/Reading/SocialLogic `line:` shapes; Mould/Gather keep a mid-act scene.
- `cut.yaml`, `dig.yaml`, `tap`, `teleport` stay `requires: any`.
- Duck findings kept: Ore's `getGrade`, Draft's herdbook probe, `asDriven`, `getReachRef?`, `Buoyant`'s `getBodyDensity?.()`.
- 11 classes compose `SwitchableMixin`, 3 name the view.
- Reason unions are closed in the kernel protocol file even for pack hosts.
- `FromMixin` re-anchoring stopped at money/record gates; NotifyPolicy, SubjectSubscriber, HasInteractive, PartyMember, Caster, Employed, Combatant stay marker + `SelfSubject`.
- Weak drive checkpoints: 24b blind; 21b passes a nonsense way; step 17's read-back room unexplained.
- Crowd timing targets: `crowded-rooms-slate`.


### Deferred from controller-liquidity (2026-11-10)

- **C60 — a refusal at arrival writes no note** (`LocomotionControllerBase.
  arriveAfter`): at arrival the command frame is gone and the engagement has
  completed, so an abort reason needs a **scheduler seam** (an engagement
  whose completion can still fail and report). The same seam carries the
  `WaterSurface` push-off (`room.pushOff`) out of the controller.
- **`PullOutcome` still carries words** across the `Pullable` hosts (kernel
  `Line`/`HaulOut`/`Capstan`, transport `Boat`, fishing `Trap`, diving
  `Hoist`): a kernel reason union would hold four packs' words behind a
  kernel MR (the `TravelNode.ride` call, lens 2). Needs a protocol-level
  answer — reasons the kernel names plus a host's own word table.
- **`course`'s heading parse** (bearing · node · landing · `upstream`/`bar`
  · `slow`) is still read in `CourseController` before it asks the frame;
  the decisions (the bar, the keeper's criteria, the steering, who may helm)
  are Ship's and the frame's. Moving the parse is a `Frame.readHeading`
  protocol method on `Expanse` and `LineFrame` — no defect behind it.
