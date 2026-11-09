# RouteController — packages/server/src/mud/platform/idea/cmd/movement/RouteController.ts (905 lines)
**What the command is:** `route to <place> [by <mode>]` / `route between <a> and <b>` plans a way over the player's own map claims and stops. Nothing moves and nothing is spent.
**Verdict:** of the ~520 non-comment lines, roughly presentation 40% · parsing/routing 22% · game rule 20% · coordination 13% · unclear 5%. The rendering half is a good swappable view. The other half is a hand-built claim resolver plus three facts about the world (map vs conveyance, open water, aboard ship), and a rewrite would have to copy all of it to keep answering correctly.

| lines | class | what it does | why this class | if misplaced: where it belongs, size of move |
|---|---|---|---|---|
| 35–92 | coordination | imports, `RouteModel`, the `Known` record | plumbing. 15 imports reaching into ship, expanse, address and clock already show how much world the file touches | — |
| 72–76, 826–835 | parsing/routing + game rule | `BY_WORDS` / `profileFor`: player words → `{mode, medium}` | the synonyms are vocabulary the view could declare. *wheeled→ground, sailed→water* is a fact about locomotion modes | synonyms go in the view (`by` as an enum arg with aliases) or as keywords on `LocomotionMode` rows. mode→medium belongs to `LocomotionApi`'s roster. Small move |
| 96–100 | coordination | no identity → "You have no map." | guard every map reader needs | — |
| 102–113 | presentation | empty destination → refusal in words | wording. The comment explains this works around the binder failing silently on a required arg | (binder defect noted in instrumentation.md) |
| 116–124 | coordination | `NavigationApi.readMap`, no-maps refusal | the one read | — |
| 609–642 | game rule | `placesIn`: folds claims into `Known`. A place claim's name, group and keywords enrich an edge claim's `toLabel` and are never replaced by it | this decides what the player's map *means*: which places they know and what each is called. It is a reading of `MapDocument`. A second consumer (`map`, `journey`) would need the same reading | a `knownPlaces(docs)` read on `NavigationApi`/`MapClaim` next to `readMap`. Medium move (the `map` verb's Cartographer likely holds a sibling) |
| 135–164 | game rule (wording is presentation) | refuses any mode except `walk`: "your map does not say what a cart could get through" | a fact about claims: they don't record media. Every map reader must refuse the same way, or it will plan routes the map can't support | `routeOnMap` returns `{ok:false, reason:'map-cannot-say'}` for a non-walk profile, and the controller words that reason. Small move |
| 166, 843–852 | unclear | `budget()`: reads `navigation.attendedSearchBudget` with a floor of 400 | the doc says *every search takes a caller-declared budget, no default*. Yet any player-facing caller would declare the same operator setting | see hard case 3 |
| 171–174, 811–822 | parsing/routing | `parseBetween`: regex on `between … and …`, and also on bare `a and b` because "the greedy arg swallows `between`" | a hand-parsed second command form. The bare `a and b` reading makes any destination containing " and " a pair | the view should declare `between` as its own arg or subcommand (`between <a>` + `and <b>` prepositions). Small move in the view, deletes 15 lines |
| 181–190, 880–891 | game rule | `seaNodeNamed`: if the asker's craft is on an expanse and a node answers the word, refuse "no road; use `course`" | what is on open water is a fact about the world (maritime D18). It also walks root container → place → craft → `liveFrame` → `Expanse` itself | `ExpanseApi`/`Voyaging` should answer "a node here named X", or `routeOnMap` should return an `open-water` reason. Medium move |
| 199–225, 869–874 | game rule | aboard a ship, the origin is `ship.getBerth()`; under way → refuse; no handle → refuse | where a plan starts from is a fact of the world (a ship's rooms are on no map). A rewrite that forgets it plans from a deck that has no graph node | an "origin for planning" read on the Place/Ship, e.g. `place.routeOrigin()` → `{handle, via:'ashore'}`, or inside `NavigationApi`. Medium move |
| 226, 278–302 | parsing/routing | `standingGroup`: the standing place's address, else its covering Locality's | a scope computation. It casts `getAddress` by hand and wraps the whole thing in try/catch | one `AddressApi.addressOf(place)` that does the declared→locality walk. Small move |
| 227, 702–808 | parsing/routing | `candidates` / `inGroup` / `sharesLocality` / `pick`: `#id`, address-prefix + keyword, collection alone, standing-locality-first, then a six-rung keyword→name→substring ladder | ~110 lines of a target resolver: scope narrowing, keyword match, widening. It's what MQL and the binder do for live Stuff, rebuilt here for map claims. Unlike MQL it returns every match | see hard case 1. If it moves: an MQL seed or binder resolver over the player's map that returns handles. Large move |
| 228–239 | presentation | "You do not know the way to 'X'" | wording. Using one refusal for "doesn't exist" and "you haven't been" is a firewall rule, but the shared message already enforces it | — |
| 243–247, 318–352 | presentation | several matches → `promptChoice` with banked names, sorted, cancel → "Never mind" | how it asks, which is the swappable part. A replacement exists precisely to change this | — |
| 248–257 | game rule | "already there"; aboard and target == berth → "go `ashore`" | the second is a consequence of the ship-origin rule above and moves with it | with the ship-origin read. Small |
| 259–267 | coordination | `routeOnMap(...)` → `renderOutcome` | the call | — |
| 356–421 | presentation | `renderOutcome`: header, numbered incomparable plans, legs, cost line, indented assumptions | wording, ordering, layout. `void here` (419) is dead | — |
| 423–485 | presentation + coordination | `renderPair`: refuses when an end is ambiguous (choosing not to prompt twice), refuses same place, calls routeOnMap, prints one cost line | the no-second-prompt policy is about asking, so it's presentation. Resolution duplicates the destination path | — |
| 494–531 | unclear | `costLine`: a walker is told legs and conditional legs and never minutes; a conveyance is told minutes, with a branch noted as unreachable from `route` | location-graph.md says the plan measures every axis and *the renderer selects*, and calls the selection "pedagogy, not presentation" | see hard case 2 |
| 533–596 | presentation, except 549–555 | `assumptionProse`, `ageOf`, `refusalProse` (mode break, budget ≠ no way, unknown) | turning structured outcomes into words | — |
| 549–555 | parsing/routing (misplaced) | `renamePlaces`: string-replaces place identities inside the engine's `assumption.text` | the engine sends a pre-rendered sentence with handles inside, and the controller patches it. Any rewrite has to copy this or leak paths ("the last line of defence") | `RoutePlan.assumptions` should carry structured `{kind, place, channel, lastSeen}` with no `text`, so the renderer composes it. Small–medium move in `RoutePlan`/`KnowledgeGraph` |
| 649–656, 876–878 | presentation | `leaf` (path → words), `nameOf`, `capitalized` | display fallbacks | — |
| 856–861, 893–900 | coordination | `say`, `declineWith` (scene + `controller-rejected` note) | every controller writes these | needlessly per-controller: a base-class `decline(context, words, reason)` already exists on `EngagedActController` (Bail uses it). Small |

**What a player rewriting it would be forced to copy today:**
- the claim folding (`placesIn`) and the whole address/keyword resolver (`candidates`…`pick`, ~150 lines), just to find out which place they meant;
- the ship-berth origin, the open-water refusal and the walk-only refusal. Without them the rewrite plans something the world contradicts;
- `renamePlaces`, or the player sees raw handles;
- `parseBetween`'s regex, the `BY_WORDS` table and the budget setting with its floor.

**Hard cases (unclear) and the question each raises for a rule:**
1. **The claim resolver (702–808).** It does what MQL does, but over map claims and not live Stuff. The firewall forbids the index, and the targets are durable handles that are often not loaded. Is "resolve a name against a corpus with a scope, and prompt on ambiguity" interpreter work for every corpus, or only for the Stuff corpus? If interpreter: MQL needs a `map:` seed returning handles. If only Stuff: every verb over a non-Stuff corpus (`map`, `journey`, forum, wiki) keeps a private resolver.
2. **`costLine`, walker never sees minutes (494–531).** The doc calls the choice of currency *pedagogy*, and puts it in the renderer on purpose. A rewrite that showed minutes would "teach a figure that does not exist". Is a display choice whose violation misleads the player about the game's rules a game rule? The test might be: *could a correct, honest replacement choose differently?* Here no, so it should sit on the plan as `plan.quoteFor(profile)`.
3. **The budget (843–852).** The doc requires the caller to declare a budget, so the planner has no hidden default. But the only legitimate value for a player-facing caller is the operator setting. When a parameter is "the caller's to declare" and every caller declares the same thing, is it still the caller's, or should the Api take "attended" as an intent?

**Rules this controller suggests:**
1. **A refusal that is true whoever asks is the Api's outcome, not the controller's branch.** Test: would a replacement that dropped the branch plan or do something the world then contradicts? Evidence: the walk-only (135–164), open-water (181–190) and under-way/berth-origin (199–225) refusals.
2. **The engine returns structure, never sentences.** Test: does the controller edit a string the engine wrote? Evidence: `renamePlaces` (549–555) patching `assumption.text`.
3. **A second command form is the view's, not a regex.** Test: does the controller test the bound string for a keyword the player typed? Evidence: `parseBetween` (811–822), and `BY_WORDS` for `by`.
4. **Resolution is the interpreter's for every corpus a verb targets.** Test: would a second verb over the same corpus have to copy the resolver? Evidence: `candidates`/`pick` (702–808). The `map` verb reads the same claims.

---

# BailController — packages/server/src/mud/platform/idea/cmd/device/BailController.ts (177 lines)
**What the command is:** `bail [<source>] [with <tool>] [into <vessel>]` fills a bucket, lifts it out of any `LiftSource` (boat, well, bore) and tips it overboard or into a vessel, as an engaged act.
**Verdict:** of the ~130 code lines, roughly game rule 40% · coordination 28% · presentation 25% · parsing/routing 7%. The source already owns its refusal and its landing words through hooks. The spell itself stays in the controller: duration, cost, bucketful size, how much is lifted, the tip into the vessel. That is the half a rewrite cannot change without changing the game.

| lines | class | what it does | why this class | if misplaced: where it belongs, size of move |
|---|---|---|---|---|
| 27–45 | coordination | imports, `BailModel` | plumbing | — |
| 47–53, 56–59 | game rule | `BASE_S`, `S_PER_M`, `BASE_COST`, `COST_PER_M`, `BUCKET_L`, `HANDS_L` | how long a spell takes, what it costs and how much it carries | the `LiftSource` mixin (a `bucketSpell(by, tool)` → `{durationMs, cost, litres}`) plus the tool's own bucketful (a `bailing` capability field). Medium move |
| 54–55 | presentation | `ROPE_M = 2`: above this depth the wording is "rope" | the comment says *"the words change, not the rule"* | — (see hard case 2) |
| 61–64 | coordination | `asLiftSource` narrow | needed only because of the implicit target | — |
| 66–74 | coordination (serves a game rule) | `setting()`: an AppSettings number with fallback | a numeric-setting reader every controller re-implements | moves with the constants it serves |
| 76–85 | game rule | `bucketfulL`: a vessel's slot capacity, else `bail.bucketL`, else `bail.handsL` | how much one bucket carries | on the tool/`LiftSource`, as above. Small |
| 87–110 | game rule | `land()` part 1: `min(bucketful, receivableL)`, `source.liftInto`, then a lenient `BulkableApi.transfer` into the vessel when the source is Bulkable; `escaped` | what the act does to the world: the mutation. It's a module function only because the controller is destroyed before the engagement completes (the `WorkedActController` scar) | `LiftSource.bucketOnce(by, tool, vessel)` → `BucketLanding`. The mixin already defines `BucketLanding`, the input to `bucketLanded`, so the shape exists. Medium move |
| 111–121 | presentation | source's `bucketLanded` words, else the verb's three defaults; scene send | wording, with the source allowed to speak first | — |
| 126–130 | parsing/routing | nothing named → the container you sit in | defaulting a target is something the view does (`default:` on `target`, like `tool` and `vessel` already have) | `default: "me:container"` (or the MQL equivalent) on `target`. Small |
| 131–138 | presentation | "Bail what?" / "There is nothing to bail out of X." | wording. `requires: LiftSourceMixin` in the view already covers a named target | — |
| 139–143 | parsing/routing | refuses a vessel that is not Bulkable | redundant with the view's `mustHaveBulkSlot` validator on `vessel` | delete. Trivial |
| 144–149 | coordination | `source.bucketRefusal(giver, tool)` → decline | the source's own refusal hook | — |
| 150–153 | game rule | refuses when the source is full and there's nowhere to tip | when the act is refused | inside `bucketRefusal`'s default / `LiftSource`. Small |
| 154–164 | presentation | depth read; begin lines for self and peers, rope vs bail | wording chosen by depth | — |
| 165–175 | coordination + game rule (166–167) | `engageAct` with duration and cost formulas; `onComplete` → `land` | engaging the plan is plumbing. The two formulas are the act's time and price | the formulas go to the spell spec above |

**What a player rewriting it would be forced to copy today:**
- the seven constants and the two formulas (duration, endurance cost);
- `bucketfulL` and the lift-then-lenient-transfer in `land` (lines 93–110), plus the module-function workaround for the destroyed controller;
- the full-source refusal;
- the implicit "the boat you sit in" target.

**Hard cases (unclear) and the question each raises for a rule:**
1. **The protocol is half-moved.** The source already owns the refusal and the landing *words* (`bucketRefusal`, `bucketLanded`), but the spell's numbers and the world mutation stay in the controller. So should the object return the whole act (`plan → engage → land` returning a landing) and leave the controller only the words? That would make `EngagedActController` take a plan from the object rather than build one. The same question applies to every `EngagedActController` subclass that computes `durationMs`/`cost`.
2. **`ROPE_M` (55, 156).** The wording switches at 2 m. Is "the bucket goes down on a rope" a fact of the world (a source deeper than an arm's reach *has* a rope) or a choice of words? If the source answered `needsRope()`, the threshold would belong to the world. The rule question: when a wording choice depends on a world threshold, who owns the threshold?
3. **The default landing words (114–120)** sit in the controller, while each source can override them. Who owns the defaults? A replacement controller that wants different words for a boat can't have them, because the boat's `bucketLanded` speaks first. So the source's words override the controller, which inverts "the controller is the swappable view".

**Rules this controller suggests:**
1. **An act's numbers live on the thing whose state they read.** Test: if changing the constant changes what a stopwatch, a ledger or a gauge would see, it is not the controller's. Evidence: `BASE_S`, `S_PER_M`, `BASE_COST`, `COST_PER_M`, `BUCKET_L`, `HANDS_L` (47–59).
2. **The mutation an engagement completes with belongs to the object, not a controller-side callback.** Test: does completion code survive only by being a module function because the controller is gone? Evidence: `land()` (87–110) and its "WorkedActController scar" comment.
3. **Don't re-check what the view declares.** Test: does a check repeat an arg's `requires:`/validator? Evidence: the `isBulkable(vessel)` check (139–143) vs `mustHaveBulkSlot`.
4. **When a hook lets the object speak, the controller's words must still be able to win.** Test: can a replacement controller change every line the player reads? Evidence: `bucketLanded`/`bucketRefusal` returning Mml (112, 147).
