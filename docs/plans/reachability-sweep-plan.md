# The reachability sweep — implementation plan

Executes
[reachability-sweep-requirements.md](../requirements/reachability-sweep-requirements.md).
**Kind:** refactor/sweep. **Lead end:** mixed — the verb and grammar
halves are kernel-led (their first consumers are the shipped dead verbs
and the shop counters), the content half is content-led (eleven packs,
one row to a dozen each).

What is being built: **one instrument** — a static census over the two
corpora the game's reachability doctrine already names (the command
views and the content rows) that can see an *absence* — plus the
dispositions it forces into the open: nine verbs conferred, five held
with a reason in a field, three views made phrase-safe, thirty-odd rows
placed, declared or deleted, three tests that could not fail made able
to, and seven docs that stop asserting dead verbs work.

Branch: `reqs/reachability-sweep` off master `ebd07b70b`. Worktree
`build-1`, `WIRE_PORT=2014`.

---

## Grounding

Every fact below was verified by opening the file this cycle, against
`ebd07b70b`. Where the Phase-1 survey (reproduced in the planning
brief) was found wrong, the correction is marked **⚠ CONTRADICTS
SURVEY** — the build must work from this section, not the brief.

### The mechanism

- `docs/subsystems/command-routing.md:378-381` — *"There is ONE record
  of verb affordances… `static commandContributions` on a class and
  every mixin in its chain. Nothing else."* Dispatch filters
  `getAffordances()` by verb; an unafforded view is dead YAML.
- `command-routing.md:418-420` — *"Afford statically, decline
  diegetically… a verb that is simply absent teaches nothing."* The
  build's spine.
- `command-routing.md:1763-1765` — *"Not a gate, and it must never
  become one"* is about the **runtime affordance resolver** (the
  probe behind the radial menu), not about a static census. This plan's
  gate reads class statics on disk and never runs the resolver. Say so
  in the gate's header verbatim, or a reviewer will quote it.
- `command-routing.md:1756-1759` — do not teach the resolver a table of
  which verbs suit which targets. The gate adds no such table.
- Exemplar: `packages/server/src/mud/platform/thing/Ladder.ts:34-38` —
  `const LadderBase = ClimbableMixin(Good); const CLIMB =
  ['platform/cmd/movement/climb.yaml']; … static commandContributions =
  { environment: CLIMB, peers: CLIMB }`.
- **152 `static commandContributions` initializers** exist across the
  kernel and every pack `src/`. Exactly one builds its lists from
  something other than string literals or a same-file `const`:
  `packages/content/terminus/src/market/thing/MarketStalls.ts:49-52`
  spreads `Stock.commandContributions.peers`. Its entries are still
  literals declared in `lib/retail/Stock.ts`, so a literal scan sees
  them. No template literal, no concatenation, no computed view path
  anywhere (D4).
- The contributions buckets are `self` · `inventory` · `environment` ·
  `peers` (`Whistle.ts:35-39`, `Posed.ts:159-168`, `Mobile.ts:224-242`,
  `Persona.ts:135-160`).

### Cluster A — the fourteen views

All fourteen view files exist, and their controllers exist
(`platform/idea/cmd/movement/{Walk,Swim,Fly,Dismount}Controller.ts`,
`device/{Fold,Unfold}Controller.ts`,
`system/{Prompt,Transfer,Subdivide}Controller.ts`,
`packages/content/terminus/src/university-avenue/idea/cmd/{Wind,Adjust}Controller.ts`).
Zero `commandContributions` references to any of the fourteen paths.

Conferrers, each verified at the host:

| view | conferrer today | the host this plan picks | verified at |
|---|---|---|---|
| `platform/cmd/movement/walk.yaml` | none | `MobileMixin.self` | `lib/spatial/Mobile.ts:224-242` already lists `go`/`sneak`/`run`/`open`/`close`/`goto`/`teleport` |
| `platform/cmd/movement/dismount.yaml` | none | `PosedMixin.self` | `lib/character/Posed.ts:159-168` lists lie/sit/stand/kneel; its docstring (:150-158) records this exact bug class; the view's validators are `requiresPosed` + `requiresSlottable` + `requiresMounted` — the state is on the RIDER |
| `platform/cmd/device/{fold,unfold}.yaml` | none | `FoldableMixin` (new static, Ladder shape) | `lib/slot/Foldable.ts` has no static; the only composer is `platform/thing/FoldingChair.ts`; `fold.yaml` declares `requires: FoldableMixin` on its target |
| `world/terminus/university-avenue/cmd/{wind,adjust}.yaml` | none | `Watch` (pack class) — **not** the mixin, see D6 | `packages/content/terminus/src/university-avenue/thing/Watch.ts` has no static and its docstring argues against one; `MechanicalMovementMixin` lives in the KERNEL at `lib/time/MechanicalMovement.ts` and composes nothing but `Watch` |
| `platform/cmd/system/prompt.yaml` | none | `HasInteractiveMixin.self` | `lib/connection/HasInteractive.ts` has no static; the view's only validator is `requiresHasInteractive`; composed by the Avatar family and `Login` (`platform/idea/Login.ts:130` already carries its own static) |
| `platform/cmd/system/{transfer,subdivide}.yaml` | none | `PersonaMixin.self` | `lib/character/Persona.ts:135-160`, beside `office`/`government`/`committee`; `title.yaml` is at :189 |
| `platform/cmd/movement/swim.yaml` | none | the verb is a `self` verb of the MOVER — **the missing piece is the enablement HOST**, D7 | `swim.yaml`'s target is the exit (`LocomotionControllerBase.ts:109-130` reads `target.via?.exit`); `LocomotionMode/swim.yaml` declares `enablementMixin: SwimmableMixin`, `medium: water` |
| `platform/cmd/boundary/{lock,unlock}.yaml` | none — HELD | declared `unreachable:` | `base-class-narrowing-slate.md:471-480` § I9: *"stay unafforded ON PURPOSE"* |
| `platform/cmd/movement/fly.yaml` | none — HELD | declared `unreachable:` | zero `FlyableMixin` composers; the only bird is `/trade/mining/agent/canary` |

⚠ **`walk`/`swim`/`fly`/`climb` are `self` verbs of the mover already?**
No: `Mobile.ts:224-242` lists `go`/`sneak`/`run`, not `walk`, and lists
no `climb`/`swim`/`fly` either — `climb` reaches the mover from the
Ladder's `environment`/`peers` buckets. `swim` follows the Ladder shape
exactly: the water host confers it (D7).

Gate order in `LocomotionLogic.ts:225-235`: body-plan → posture →
`exit.canTraverse` (the **media** gate) → enablement →
haulage. So `swim north` on a dry exit is refused by the media gate
*before* any host is looked for; `findEnablementHost`
(`LocomotionLogic.ts:537-555`) looks at the actor's container and that
container's contents — the Ladder shape.

The `unreachable:` carrier on a VIEW: `CommandDefinition` parses a
view's YAML into typed objects and validates arg ORDERING
(`lib/command/CommandDefinition.ts:655-700`) and reserved option names
(:853); nothing rejects an unknown top-level key. The build pins this
with a unit test (W0).

### Cluster B — the arg-binding ladder

- Binder rules as the survey states, verified at
  `platform/idea/api/CommandLogic.ts` (`bindPositionals`, ~2369-2570):
  a non-greedy arg takes exactly one token, consumed before `default:`
  is considered; greedy slices to the first later-declared preposition.
  The binder is NOT changed (positional overflow is documented grammar).
- `validateArgOrdering` (`CommandDefinition.ts:655-700`): greedy must
  be last unless every trailing arg declares `prepositions:`. ⚠ The
  load-bearing nuance at :703-723: **`greedy` defaults an arg to
  required unless `required: false` is explicit** — `bake.loaf` is
  `required: false` today and must stay so when it goes greedy.
- `platform/cmd/retail/buy.yaml`: `thing` (string, required) →
  `counter` (object, optional, `prepositions: [from]`, MQL default,
  `requires: [ConsignmentShelfMixin]`). `reclaim.yaml` is the same
  shape. `trade-baking/…/cmd/baking/bake.yaml`: `loaf` (string,
  optional) → `oven` (object, optional, `prepositions: [at,in,on]`,
  default). All three satisfy the greedy invariant: every trailing arg
  is prepositional.
- `trade-milling/…/mill.yaml`: `grain` (**object**, required) →
  `extraction` (number, optional, no preposition) → `mill` (object,
  prepositional, default). Greedy on `grain` is forbidden by the
  invariant. ⚠ **CONTRADICTS SURVEY in one detail:** `mill.grain` is
  object-typed, not string — so it is not in the string-then-object
  shape the grammar arm gates (D1 arm G). Its remedy is rung 4 by hand
  (help text + the quoted form), exactly as the requirements say, and
  the gate does not own it.
- Arg specs (`api/command.ts` `PositionalDefinition`) carry
  `description?: string`, but `getHelpText()` renders arg
  `description` only for OPTIONS, not positionals
  (`CommandDefinition.ts:453-490`, `command-spec.md:342-356`). So
  "the help text says so" means the view's `help:` prose.
- Quoting: `"…"` is one token (`command-parsing.md:84-96`); nothing
  tests a quoted positional through `assemble` into a bound arg. Binder
  test precedent:
  `platform/idea/cmd/perception/__tests__/look-search-views.binder.test.ts`,
  `…/posture/__tests__/posture-views.binder.test.ts` — they call
  `CommandApi.assemble(parsed, view(verb), ctx)` on the real YAML.
- `Stock.resolveBuy` (`lib/retail/Stock.ts:226`) →
  `Perceptible.hasKeyword` (`lib/description/Perceptible.ts:175`), an
  exact `includes` — multi-word keywords are these goods' only purchase
  name. `general-store/counter.yaml:95` promises *"the packet still
  answers to `orange seed`"*.

### Cluster C — the rows

Reproduced the orphan census this cycle (every `thing/**` row under
every pack's `content/`, path grepped across all content YAML and all
non-test `src/**`): **79 candidates**, versus the survey's 66. The
delta is rows the survey counted as referenced but which are reached
only through a `__tests__` file or through a concatenated path in code
— both of which the row arm must treat correctly (D5). Highlights:

- `platform/agent/Gus.ts:57` — `const ROOT =
  '/world/terminus/university-avenue/thing'` and the six avenue rows
  (`crossing-log`, `paddle`, `pocket-watch`, `thermos`, `vest`,
  `whistle`) are placed by **concatenation** from a KERNEL class. A
  full-path literal scan misses them; a prefix-aware one does not. (A
  kernel class naming a locality's rows is a separate boundary smell —
  out of scope, note it in the MR.)
- `goods-yards/veshko/thing/volk.yaml:16-17` — `censusKey:
  spirit:volk`, `regionTarget: 12`, and the zone's `stocks:` map
  (`goods-yards/veshko.yaml:14-18`) names `spirit:volk: 24`.
  `ResidencyLogic.ts:280-300`: *a zone's declared count wins over the
  item's baseline*. So the census mechanism is ONE mechanism with two
  places a target can come from — not a fourth mechanism.
- `wand-of-firebolt.yaml:36-39` — `censusKey: wand`, `regionTarget:
  2`. `wand-of-firebolt-cursed` has `regionTarget: 0` — the vestigial
  one the survey named.
- `world-seed/content/stuff/idea/Feeder/terminus-main.yaml:9` names
  `/world/terminus/wharfside/thing/aqueduct-house` as its `source:` —
  a CITATION from a data Idea, not a placement. This is the case that
  decides D5's faucet/citation split: *named by a field* is not enough;
  the field must be one that **mints**.
- `wharfside/bank.yaml:126-131` props `city-intake`, `city-outfall`,
  `river-edge`; **⚠ CONTRADICTS REQUIREMENTS:** no Terminus location
  row mentions the aqueduct at all (`grep aqueduct` over
  `terminus/content` hits only the two thing rows). The only mentions
  are Hinkley's district tank (*"keeps the Cold Fell aqueduct genuinely
  out of reach"*) and the `Watercourse/cold-fell` row. So "where the
  wharfside bank already describes them" is not true today; W3 places
  both on the bank AND adds the describing sentence (D17).
- Distributor counter — **⚠ CONTRADICTS SURVEY.** There is exactly ONE
  `props:` claim on `/world/terminus/counting-houses/distributor/thing/counter`
  (`cash-and-carry.yaml:55`). `distributor/idea/business.yaml:37` is an
  `operatingLocations:` entry, which `Business.ts:273-334` stores as
  paths and does not clone. The general store has the identical shape
  (`shop-floor.yaml:33` props its counter; `general-store/business.yaml:79`
  lists it in `operatingLocations`) and its `consigns` hand (the weaver,
  `mill/agent/weaver.yaml:37`) does not throw. The prime suspect is the
  brain itself: `trade-shopkeeping/src/behavior/consigns.ts:124-125`
  does `findByTemplatePath(shelfPath) ?? singletonOrClone(shelfPath)` —
  a beat that fires before the cash-and-carry room has cloned its props
  **clones a second, unseated counter**, and every later beat's
  `findByTemplatePath` throws `expected singleton, found 2`
  (`api/stuff.ts:1443-1445`). The second suspect is the roster tick's
  `singletonOrClone(targetPath)` over operating locations
  (`EmploymentLogic.ts:853`). Deleting a line is NOT the fix (D15).
- `general-store/thing/saucer.yaml` and
  `generic-objects/…/vessel/saucer.yaml` are both `/platform/thing/Feeder`
  bowls; the store's has no `stockLines` entry and no `prices` key
  (`counter.yaml:30-160`, `:235-396`).
- `trade-apiculture/thing/honey-jar.yaml` is a `/platform/thing/Vat`,
  `interiorCapacity: 1`, `open: false`, no `interiorMaterial`, no
  `interiorAmount` — AND it is the `outputTemplate` of
  `trade-apiculture/content/recipes/crush-comb.yaml:29` (0.55 L of
  honey minted INTO it). So the row must stay empty; the shop's line
  needs a filled child (D13). Authoring a filled vessel is the shape
  `arcane-library/…/potion-of-mana.yaml:17` already uses
  (`interiorMaterial` + `interiorAmount`); `Bulkable.ts:521-533` marks
  `interiorAmount` persistent + `runtimeState`.
- `trade-ranching/…/gallus/domesticus.yaml:81-83` yields `stew-meat ×2`
  + `offal ×1` in the COUNTED shape (`Species.ts:40-110`: no `fraction`
  ⇒ counted; counted lines clone `units` and *leave the row's own mass
  alone*). `trade-cooking/thing/cut-breast.yaml` declares `mass: 1.0`
  as *"a NOMINAL default the mint overwrites"* — true of the dressed
  path, not the counted one. D14 decides.
- **⚠ There is no hen in the world.** `gallus/domesticus` is named by
  no `Herdbook` row and no `cast:` entry (the three herdbooks are the
  campus herd, the flock book and the ox book; the only bird row is the
  mine canary). Drive step 19 and AC 7's *"a hen yields poultry cuts"*
  cannot be observed by a player as the realm stands. ✅ **AUTHORIZED
  2026-10-07** — the user approved the hen and the birdseed, so the
  `hen-book` row is in scope (D22) and this is no longer an open
  question.
- The canary: `/trade/mining/agent/canary` (`KeptAnimal`,
  `feedingStyle: [hopper]` on `serinus/canaria.yaml:52`, `diet:
  herbivore`) is cast in Rejection's `ferrow/timbered-drift.yaml:34`.
  `Feeder.offerings()` is what a hopper offers; what food a herbivore
  canary accepts from a hopper is `pets.md:121-125`'s ladder — the
  build must find or stock a seed food (D18).
- Anvils: `rejection/…/location/smelter.yaml:42` props
  `/trade/smithing/thing/anvil`, which declares `capabilities: [{kind:
  anvil}]` — so `repair.yaml:28`'s `capability.anvil` IS satisfiable
  today. The generic `/stuff/thing/gear/anvil` (200 kg, no capability)
  is purely the lift-gate exemplar `encumbrance.md:286` ships. D19.
- The fifteen generic-objects orphans, reproduced: `brazier`, `stove`,
  `armor/bronze-breastplate`, `arms/oak-waster`, `cutlery/table-fork`,
  `gear/bag-of-holding`, `gear/anvil`, `vessel/thermos`, `vessel/urn`,
  `vessel/hopper`, `vessel/trough`, `vessel/compost-sack`,
  `vessel/colander`, `items/blue-vial`, `items/dotted-slate` (plus
  `Kiln` and `vessel/saucer`, the two vestigial).
- `mana-main`: three rows. `arcana/…/system/arcana/thing/mana-main.yaml`
  is the GENERIC row (its header: *"a locality that wants a line seats
  its own copy with its own `seatIn`"*), no `seatIn`. The lounge and
  terminal copies carry `seatIn:` and are cited by `mainsRef` from the
  terminals. Both packs already `dependsOn` arcana
  (`saxonberg-lounge/package.json:8`, `terminus/package.json:13`), which
  `PackLogic.assertParentsResolve` (:1245-1290) requires for a
  cross-pack `extends:`.
- `mixer-bottle`: `trade-bottling`'s bottled mixers (`cola.yaml`,
  `tonic.yaml`, `ginger-beer.yaml`, `cranberry-juice.yaml`) do NOT
  `extends:` it, while `can-of-cola.yaml:12` does `extends:
  /trade/bottling/thing/can` — the sibling pattern already shipped.
- `basket`: `/trade/farming/thing/crate` is the parent of nine
  `crate-of-*` rows (`crate-of-mint.yaml:12`); the basket is its
  "second empty container", extended by nothing.

### Cluster D — the gate family and the carrier

- `packages/server/package.json:29-96` — the `lint:*` roster;
  `lint:family` (`scripts/lint-family.ts`) runs every one. A new
  `lint:reachability` script registers itself.
- `scripts/pack-roots.ts` exports the shared readers this gate reuses:
  `packSources`, `classFileOf`, `composesMixin` (text over `extends`
  expressions incl. same-file `const XBase = …`), `declaredMixins`,
  `templateRows` (every row under every pack's `content/` via the
  derived `nonTemplateDirs`), `effectiveRow`, `inheritanceIndex`,
  `walkYamlFiles`.
- `scripts/check-template-census.ts` owns reference→row: `refsOf`
  (:108-…) enumerates the designation fields, and `UNREAD_PATH_FIELDS`
  (:675-690) is a shrink-only list of path-valued fields it does not yet
  resolve (`container`, `seatIn`, `seedTemplatePath`, `interiorMaterial`,
  …). Its header: *"No exemption list, by design."*
- `scripts/check-verb-collisions.ts` — `commandViews()` walk (a `cmd`
  dir holds views unless its parent is `idea`), exported `claimsIn`,
  `KNOWN_COLLISIONS` allowlist-with-reason. Untouched by this build;
  the glass build adjudicates `dip` there.
- `scripts/check-arg-kinds.ts` — header calls itself *"the
  affordance-honesty gate"*; gates the ARG link (`requires:` on
  object slots). `ROOTS` (:76-80) = `mud/world/**` + every pack's
  `cmd/` dirs. The new gate is a different link and must not borrow the
  name.
- `scripts/check-unconsumed-seams.ts` counts `static fieldMeta` keys on
  `platform/idea/**` data Ideas and `@hook` methods — a YAML top-level
  key is invisible to it.
- `scripts/check-instanceable-placement.ts:363-376` invariant 13
  refuses only the retired `hydratorClass` key, both top-level and
  under `data`. Nothing validates template top-level keys against a
  closed set.
- **The carrier, verified end to end (D2):**
  `PackLogic.ts:959-976` reads `doc.class`, `doc.extends`, `doc.data`
  from a row file and nothing else; `:1582-1617` writes the Mongo row
  as `{path, class?, extends?, data, sourcePack}` and hashes
  `{class, extends, data}` — so a top-level `unreachable:` key never
  reaches Mongo, never changes a row's hash, and never reaches the
  runtime. ⚠ **CONTRADICTS SURVEY on the `data:` alternative:**
  `TemplateApplier.ts:123-170` iterates the host's DECLARED persistent
  fields and reads `data[field]` — an undeclared `data:` key is NOT
  bracket-assigned; instead `reportUnapplied` (:227-248) records a
  diagnostic per `(templatePath, key-set)` visible at the `errors`
  verb. A `data.unreachable` would therefore light a diagnostic on
  every clone of the row. Same conclusion, stronger reason: **top-level
  key**.
- `lint-family.md:47-110` (three ways a census lies), `:1403-1411` (a
  ratchet over a content-scaling figure is a bare count), `:1309-1310`
  (a clause with zero coverage), `:794-800` (the listing is the
  catalogue).

### Tests that cannot fail today

- `packages/wire/tests/world-scan.dirty.wire.test.ts:188-201` — `if
  (moved.status === 'ok') { … }` swallows the unknown verb; the mode
  loop asserts `.not.toBe('error')`, which a declined unknown verb
  satisfies.
- `packages/content/terminus/src/__tests__/watershed.test.ts:320` —
  `conduitFrom('world/terminus/wharfside/thing/cold-fell-aqueduct.yaml')`
  builds the aqueduct from its file.
- `packages/server/src/mud/__tests__/integration/locomotion.test.ts:37-40`
  manufactures `SwimZoneLocation`/`FlyZoneLocation` — the only
  composition of either mixin in the repo.
- **⚠ A fourth, not in the survey:**
  `packages/wire/tests/carcass-chain.dirty.wire.test.ts:1129-1168`,
  step 16, is titled *"the WAX half has no supply in the realm"* and
  its comment asserts the beeswax finding this build retracts. It must
  be rewritten in the same commit as the slate retraction or the suite
  pins a falsehood.
- The apiculture drive **exists**: `packages/wire/tests/apiculture.dirty.wire.test.ts`
  walks buy kit → nucleus → road → install → sting → veil → smoke read →
  super → `rob` → consign a jar. It stops at `rob`. **⚠ CONTRADICTS
  REQUIREMENTS slightly:** *"no drive has ever walked it"* is true of
  the tail — crush → melt → dip — not of the chain. The tail is the
  recipes `trade-apiculture/content/recipes/crush-comb.yaml`
  (output honey-jar + residue `beeswax-cake`) and
  `trade-chandlery/content/recipes/melt-wax.yaml` (output into
  `dip-pot`, keywords `melt`), then `dip`.

### Wire harness

`packages/wire/src/harness/index.ts` exports `Session`, `uniqueHandle`,
`declareFile({file, packs, dirtyReason})`, and from `assertions.ts`:
`expectOk`, `expectRefused`, `expectNote(result, kind, {reason})`,
`expectOkOr`, `describe`. `refusedFor` is a per-file local helper
(`taps.dirty.wire.test.ts:219` etc.) that reads only
`controller-rejected`. A `DIRTY_REASON` export + `dirtyReason:` in
`declareFile` is the convention (`blood-economy.dirty.wire.test.ts:25-40`).

### Slates and docs

- `docs/slates/tails/butchery-slate.md:5` status block + `:144-172` body:
  the beeswax claim. `docs/slates/builds/base-class-narrowing-slate.md:449-452`
  § L9 ("Ten verbs"), `:471-480` § I9.
  `docs/slates/tails/affordance-verb-slate.md:104-110` records the
  timepiece verbs' shape. `docs/slates/README.md` is GENERATED by
  `./tools/slate-index` from each slate's `Status/Left/Size` block —
  never hand-edited; `Size:` takes a singular word.
- `docs/subsystems/time.md:602-618` (claims the mixin "affords neither
  verb" and cites a path `domain/eternal/university-avenue/command/`
  that does not exist), `slot.md:144-148`, `architecture.md:1281`,
  `locomotion.md:5-18, 27-32` and `:312-321` (the four-step recipe that
  omits `commandContributions`), `conveyance.md:162-167`,
  `prompt.md:156-166`, `card-surface.md:240,261`, `access.md:72-75,740`,
  `sandbox.md:187-189`, `smallholding.md:248,475`, `furnishing.md:289`,
  `parcel.md:341`, `boundary.md:487-496`. NOT `mining.md:415` (names the
  Api, correct) and NOT `banking.md:220` (a live `bank transfer`
  subcommand).

---

## Plan-level decisions

**D1 — The gate: one script, three arms, one carrier.**
`packages/server/scripts/check-reachability.ts` → `"lint:reachability":
"tsx scripts/check-reachability.ts"` in `packages/server/package.json`
(the derived roster picks it up). Three arms over two corpora, sharing
one view walk and the `pack-roots` row reader:

- **Arm A (affordance)** — every command view is conferred by a
  `commandContributions` static somewhere, or declares `unreachable:`.
- **Arm G (grammar)** — the string-then-object-with-default shape, a
  ratchet.
- **Arm R (rows)** — every `thing`-branch row is reachable by a
  mechanism, or declares `unreachable:`.

The collision arm already exists as `lint:verb-collisions` and stays
there untouched (the glass build is adjudicating `dip` in its
`KNOWN_COLLISIONS`; moving the file mid-flight is a collision of our
own). The requirements' *"not three gates and not three exemption
lists"* is satisfied by the thing that matters: **no allowlist is added
anywhere** — the disposition for a view or a row is a field ON the view
or row (D2), and the family is derived. Rejected: (b) three arms bolted
onto three existing scripts — `check-template-census` is the
reference→row direction and its header forbids an exemption list, so
the row→reference arm bolted onto it would either violate that or carry
the carrier logic in a script about resolution; `check-arg-kinds` is
the arg-gate link under a name this arm must not inherit. Rejected:
(c) a shared reader plus three thin gates — three scripts for one
question, and the reader already exists (`pack-roots.ts`).

Not named "affordance honesty" anywhere. The gate's doc section is
titled *`lint:reachability` — a verb nothing confers, a row nothing
reaches*.

**D2 — The carrier is a top-level YAML key, `unreachable:`, on rows and
on views alike.** A sibling of `class:`/`extends:`/`data:` on a row, of
`verbs:`/`controller:` on a view. Vocabulary, closed in the script:

- `exemplar` — a substrate exemplar cited by a subsystem doc and built
  by tests; not meant to stand in the world.
- `parent` — a base row that exists to be `extends:`-ed; the gate also
  auto-detects a parent with a reachable child, so this value is for a
  base nothing extends yet. Views never use it.
- `awaiting:<slate-basename>` — held for a named slate. The gate checks
  `docs/slates/**/<slate-basename>.md` exists; a stranded reason (the
  cursed-wand failure) is a finding.

Verified (Grounding § Cluster D): the installer drops the key before
Mongo, the hash is unchanged, the runtime never sees it,
`lint:unconsumed-seams` cannot see it, nothing validates top-level
keys, and a `data:`-level carrier would light a diagnostic on every
clone. ⚠ The one honest objection — *a key only a script reads* — is
accepted and said in the key's doc: it is an authoring declaration the
same way a `# comment` was, except greppable and gated. No
`gen:schema` work: the key is not a collection field.

**D3 — Ratchet shapes, and why none is a bare count.**

- Arm A ends at **zero undeclared**: every view is conferred or
  declared. A new view costs its author one static or one key — the
  figure does not scale with content.
- Arm R ends at **zero undeclared** for the same reason: a reachable row
  costs nothing and an unreachable one costs one line the author
  writes. This is the only shape `lint-family.md:1403-1411` permits —
  a *declaration*, not a ceiling — and it is what the requirements ask
  for ("declared unreachable in a field").
- Arm G is a **ratchet** (`PHRASE_SHAPE_CEILING`), opened at the W1
  figure (13 after the three conversions), may fall, never rise. A verb
  shape is a per-view authoring decision, not content volume; a rise
  wants a caller audit (`lint-family.md` ratchet lesson 4).
- **Gate-first, ratcheted down per wave (D9):** W0 lands the script
  with `UNCONFERRED_CEILING = 14`, `UNDECLARED_ROW_CEILING = <W0
  census>`, `PHRASE_SHAPE_CEILING = 16`; W1 lowers G to 13; W2 lowers A
  to 0 and deletes the A constant (zero becomes the invariant); W3
  lowers R to 0 and deletes its constant. The gate's test asserts the
  INVARIANT (at or below the ceiling, above zero where a ceiling
  exists), never the number (`lint-family.md:58-66`).
- The gate must be **seen to fail** before it is trusted
  (`lint-family.md:71-78`): W0's test runs the arms over fixture trees
  under `scripts/__fixtures__/reachability/` that contain one of each
  violation, and asserts the POSITIVE.

**D4 — Static scan over the source, not a booted prototype walk.** The
record the doctrine names is a class static on disk; a source scan
reads the record itself. Implementation: the TypeScript scanner (`ts`,
as `check-unconsumed-seams.ts` does) over every non-test `src/**` file
in the kernel and every pack, collecting every string literal that ends
`.yaml` and contains `/cmd/`. A view is conferred iff its pack-relative
path (`platform/cmd/movement/walk.yaml`,
`world/terminus/university-avenue/cmd/wind.yaml`,
`trade/ranching/cmd/ranching/draft.yaml`) is in that set. Comments are
not literals, so a docstring quoting a view does not confer it.
**Residual risk, stated:** a view path assembled at runtime
(concatenation, template literal, a call) would be undercounted as
unconferred — which fails LOUD, not silent, so the first such entry is
a finding rather than a hole. The scan additionally REPORTS (never
skips) any `commandContributions` initializer whose list elements are
not string literals, identifiers, or spread elements — the
`declaredMixins` discipline. A booted walk
(`check-composition-census.ts`) answers a different question (which
rows compose which mixin) and is not reused.

**D5 — The row arm's corpus and its mechanisms.** Corpus: every row
whose template path has `thing` as its branch segment
(`/<root…>/thing/**` — `/stuff/thing/…`, `/trade/<x>/thing/…`,
`/world/…/thing/…`, `/system/<x>/thing/…`, `/platform/thing/…`).
Agents, ideas and locations have their own gates (`lint:locations`,
clause (d) of the census, the catalogues) and are out of this arm's
corpus — say so in the header. A row R is **reachable** when any of
these holds, in this order, and `--list` prints WHICH:

1. **faucet-named** — R's path is a value of a FAUCET field in any
   template row or document in any pack's `content/`. The faucet list
   is enumerated in the script with a reason each, seeded from
   `check-template-census.refsOf`: `props`, `cast` (string and
   `{template, as}` forms), `stockLines[].itemTemplatePath`,
   `adornments`, `exits.*.door`, `floor.template`, `roomTemplate`,
   `corridorTemplate`, floorplan `room`, recipe `outputTemplate` and
   `outputResidue.template`, species `butcheryYield[].cut` and
   `production[].yieldRow`, `bornWithCell`, `trapTemplate`,
   `harvestTemplatePath`, `growsIntoPath`, `seedTemplatePath`, a zone's
   `stocks:` (by key, see 3). The CITATION list — path fields that name
   without minting — is enumerated beside it: `_biomePath`,
   `_speciesPath`, `_bodyPlanPath`, `_materialPath`, `_parentCladePath`,
   `_defaultMaterialPath`, `interiorMaterial`, `surfaceMaterial`,
   `bulkMaterial`, `mainsRef`, `source`, `institution`,
   `projectileTemplate`, `reachRef`, `prices` (keys), `operatingLocations`,
   `holderRef`, `shelf`/`stock`/`counter` (brain config), `businessPath`,
   `lobbyPath`, `warren`, `parentExtent`, `charter`, `treasury`, `routes`,
   `destination`. ⭐ A path-valued field in NEITHER list is **reported as
   a finding** (the field is unknown to the census), never silently
   counted either way — the only way a new faucet can be added is by
   naming it.
2. **self-placed** — R declares `container:` or `seatIn:` whose target
   is a location row, or a thing row that is itself reachable.
3. **census-drawn** — R declares `censusKey:`, R's effective class
   composes `CirculatingMixin` (`pack-roots.composesMixin`), and the
   target is positive: R's `regionTarget > 0` **or** any zone row's
   `stocks:` map names R's key with a count > 0 (the override
   `ResidencyLogic.ts:289-299` applies). A `regionTarget: 0` with no
   zone override is a finding (the cursed wand).
4. **parent** — some row `extends:` R and that child is reachable.
5. **code-named** — a string literal in non-test kernel or pack
   `src/**` equals R's path (`StuffApi.clone('/…')`, a `TemplatePaths`
   constant), **or** equals a directory prefix of R's path (the
   `Gus.ts:57` concatenation). Both count; `--list` labels the second
   `prefix`, so a reviewer can see it is weaker.
6. **declared** — the `unreachable:` key (D2).

Everything else is a finding. A `__tests__` reference never counts
(requirements: *"a test or a doc mentioning a row is not
reachability"*); a `.md` never counts.

**D6 — `wind`/`adjust` are conferred by `Watch`, not by
`MechanicalMovementMixin`.** The mixin is kernel substrate
(`lib/time/MechanicalMovement.ts`) and the views are the terminus
locality's; `command-routing.md:418-424` is explicit that *each pack's
classes name only its own views, so the kernel can never name a trade's
verb*. The mixin keeps its capability-gate role (the controllers'
`hasMixin` check); the pack's concrete timepiece carries the static.
Both docstrings are rewritten: `Watch.ts`'s *"Watch contributes none"*
is the sentence that caused the bug, and `MechanicalMovement.ts`'s
header gains one line — *the mixin is the GATE; the CONFERRER is the
concrete timepiece class in the pack that owns the verbs*. A future
second mechanical timepiece in another pack carries its own static
naming its own pack's views (or the terminus ones if it depends on
terminus).

**D7 — The water host is a Thing in the room, `platform/thing/OpenWater`
= `SwimmableMixin(Thing)`, the Ladder shape — not a Location subclass
and not either existing water thing.** Rows: one,
`/world/terminus/estuary/thing/open-water`, propped in the four rooms
that own the six water exits. See Host placement for the claims.
Rejected: a Location subclass — `lint:locations` enumerates location
classes; `bank.yaml` is the city wharf with many exits and props, and
re-classing four rooms is four code-adjacent edits where the
requirements' test is *a second instance needs no code*. Rejected:
composing `Swimmable` onto `WaterFixture` (the tide) — that claims
every receptacle of water (a well, a trough) lets you swim; the guard
that would re-narrow it is the tell. Rejected: the water pack's `Shore`
— it carries the fishery's reach and the requirements forbid claiming
it.

**D8 — `mana-main`: convert, do not delete.** The lounge and terminal
rows become `extends: /system/arcana/thing/mana-main` and keep only
what differs (`seatIn`, their own `shortDescription`/`keywords`/prose).
The arcana row becomes reachable as a parent (D5 rule 4) and its own
header already describes exactly this use. Both packs already depend on
arcana. Verify after the change that `mainsRef` still resolves and
`analyze grid` reads the same supply (`energy.md`); the effective row is
unchanged in every field the runtime reads.

**D9 — Wave order: gate first, ratcheted down per wave.** The house
pattern; each wave's commit lowers a constant, which is the
self-documenting proof the wave did what it says. The alternative (gate
last with final figures) hides the burn-down and is how a gate ships
unseen-to-fail.

**D10 — The three tests are fixed, not left; the fourth is rewritten.**
See W2/W3/W4 and Test & gate strategy.

**D11 — The drive is ONE new dirty wire file for steps 1–22, and step
23 is APPENDED to the existing apiculture drive.** Boot cost argues for
one world per file; the apiculture file already stands up the bees,
and the tail (crush → melt → dip) belongs with the chain it completes.
`carcass-chain`'s step 16 is rewritten to the retraction (D16). Every
checkpoint asserts UNDERSTOOD + STATE CHANGED (Test & gate strategy).

**D12 — Grammar: `buy.thing`, `reclaim.thing`, `bake.loaf` go greedy;
`mill` goes rung 4 by hand.** The three satisfy `validateArgOrdering`
(every trailing arg is prepositional). `bake.loaf` keeps its explicit
`required: false`. `mill.yaml`'s `help:` gains the quoting sentence and
the build verifies the bare `mill sack of wheat` refusal is the shape
error ("too many arguments" → no known command shape), not a complaint
about a millstone. The thirteen single-token views are left and listed
by arm G's ratchet.

**D13 — The watch is vended by a new row; the jar of honey by an
`extends:` child.** `/world/terminus/general-store/thing/pocket-watch`
(class `/world/terminus/university-avenue/thing/Watch`, its own prose,
no engraving, a wrong `setTo`, `rate: 0.995`, a `mass`) — a standalone
row rather than `extends:` of Gus's, because Gus's carries the
AUGUSTUS engraving in `details:`. `/world/terminus/general-store/thing/jar-of-honey`
`extends: /trade/apiculture/thing/honey-jar` with `interiorMaterial:
/trade/apiculture/idea/material/honey`, `interiorAmount: 0.55`
(matching `crush-comb`'s portion), and the counter's line 131 + price
387-ish move to the child. The apiculture row stays empty because the
recipe mints into it.

**D14 — The hen's yield names the poultry cuts; the mass question is
decided by a test, in order.** Change
`gallus/domesticus.yaml:81-83` to `cut-breast ×1`, `cut-thigh ×2`,
`cut-drumstick ×2`, `offal ×1`. Then a pack unit test in
`trade-ranching` dresses a hen and reads each cut's mass: if the
counted shape leaves `cut-breast`'s nominal 1.0 kg on a ~2.5 kg bird,
switch the three MUSCLE lines to the dressed shape (`fraction:` 0.20 /
0.08 / 0.06 per piece, `conditioned: true`), keep `offal` counted, and
rewrite the row's *"a hen is COUNTED, not dressed"* comment to say what
is now true (the giblets are counted; the muscle is dressed). The
cross-pack line: the species row is `trade-ranching`'s, the cut rows
are `trade-cooking`'s; `trade-ranching` already names
`/stuff/thing/items/stew-meat` so naming `/trade/cooking/thing/cut-*`
needs `trade-ranching` to depend on `trade-cooking` — it already does
(`trade-ranching/package.json:11`). `lint:anatomy` must stay green.

**D15 — The distributor counter is DIAGNOSED from the boot log, and the
fix is in the brain, not a deleted line.** Boot the world, find
`expected singleton, found 2` in the log, confirm which call cloned the
second instance. Expected fix: `consigns.ts:124-125` drops the
`?? singletonOrClone(shelfPath)` fallback — a shelf that is not live is
*nothing to carry this beat*, exactly as the same function already
treats the floor stock two lines above (*"live only (the sweep fills
it; nothing to carry until it has)"*). A brain must never clone a
fixture that a room's `props:` owns. If the log instead points at
`EmploymentLogic.ts:853`, the fix is there and the same shape. The
`operatingLocations` entry stays: the general store has the identical
shape and `ensureOperatorAt` keys on the fixture by design.

**D16 — Docs and slates land in one wave (W4), including the
carcass-chain test rewrite.** The slate retraction and the test that
asserts the retracted claim change in the same commit.

**D17 — The aqueduct and its house go on the wharfside bank, and the
bank gets the sentence.** Props after `river-edge` in
`bank.yaml:126-131`, plus a `details:` entry (`aqueduct:` keywords
`[aqueduct, channel, "cold fell"]`) and one sentence in the bank's
prose so the place describes what stands in it. `watershed.test.ts:320`
then resolves the aqueduct the way the world does (W3).

**D18 — The hopper is stocked, and the canary's food is found or
stocked.** `/stuff/thing/vessel/hopper` par 2 on the general store
counter with a price. Then the build reads `pets.md:121-190` and
`Feeder.offerings()` to learn what a hopper must hold for a herbivore
canary; if a reachable seed food exists (a grain sack, bran), the
drive buys it; if none does, the general store gains ONE row,
`/world/terminus/general-store/thing/birdseed` (a `Provision` stack of
seed on an existing material), and the MR says so. Content, no code.

**D19 — The generic anvil stands in the goods yard.** Props in
`goods-yards/yard.yaml:64-74` beside the wagon — a load that wants a
cart, which is the encumbrance doc's own pairing (the lift gate and the
haulage draft term). No `capabilities:` added: `repair`'s anvil is the
smithing anvil at the Rejection smelter, already propped.

**D20 — The remaining generic-objects orphans are declared
`unreachable: exemplar`**, each with the doc that cites it named in a
comment above the key: `brazier`, `stove`, `armor/bronze-breastplate`,
`arms/oak-waster`, `gear/bag-of-holding`, `vessel/thermos`,
`vessel/urn`, `vessel/trough`, `vessel/colander`, `items/blue-vial`,
`items/dotted-slate`. The four that break a mechanism are PLACED
(hopper, compost-sack, anvil, table-fork). The arcane-library five
(`brass-conduit`, `charging-bench`, `potion-of-blistering`,
`potion-of-veiling`, `potion-of-mana`) are `unreachable:
awaiting:magic-items-slate`.

**D21 — Deletions:** `/stuff/thing/Kiln`, `/stuff/thing/vessel/saucer`,
`/stuff/thing/magic/wand-of-firebolt-cursed`, `/trade/fuel/thing/oil-cask`,
`/world/lounge/thing/bandage`. Before each deletion the build greps
the path once more (content, src, docs) and fixes any doc that cites
it. `mana-main` is NOT deleted (D8).

**D22 — The hen and the birdseed ship. AUTHORIZED by the user
2026-10-07**, in answer to this plan's one open question.

*The question.* No hen exists in the realm — `gallus/domesticus` is
named by no `Herdbook` and no `cast:`, and the only bird row is the
mine canary. So the requirements' drive step 19 and AC 7's *"a hen
yields poultry cuts"* were unobservable, and `trade-cooking`'s three
authored poultry-cut rows had no path into the world even after D14
fixed the yield. The requirements also say *"Nothing else moves"* at
Heart's Delight, so adding a bird there needed the user's word.

*The choice.* A `/world/terminus/hearts-delight/thing/hen-book`
(`Herdbook`, `speciesPath` `gallus/domesticus`, tally 6, `homeExtent`
the farmstead yard), propped in the farmstead yard and carrying a
`pack.yaml` warm line — **the ox-book shape exactly** (D16): a row and
no code. Plus, if and only if no reachable herbivore-acceptable food
already satisfies a hopper, a `/world/terminus/general-store/thing/
birdseed` row with a counter line and a price (D18).

*The reasoning.* A farm that keeps sheep, dogs and oxen and no
chickens is a stranger thing than the row is expensive, and without it
three authored cut rows stay dead content — which is the exact defect
class this build exists to close. ⭐ It also makes the build's own
medicine consistent: a fix that leaves a row unreachable is the thing
the gate would flag.

*Consequences.* Drive step 19 is a live checkpoint, not a
`trade-ranching` unit test. AC 7's hen clause is met rather than
recorded unmet. The hen is a `Herdbook` row, so `draft`/`return` and
`slaughter` reach it on the one shipped path — **no new verb, no new
class, and `Species.ts` is untouched** (the yield is a row edit in
`trade-ranching`, which keeps this build clear of the location-graph
build's file).

**⚠ D2 AMENDED AT BUILD TIME (W0) — a command VIEW has a CLOSED schema.**
The plan's Grounding said *"nothing rejects an unknown top-level key"*
and told W0 to pin that with a unit test. The test found the opposite for
half the corpus: `CommandDefinition.fromView` validates every view
against `src/mud/lib/command/command.schema.json`, which carries
`"additionalProperties": false`, so a view with `unreachable:` **throws at
load** — *"/ must NOT have additional properties"*. The row half of D2 is
correct as written (`PackLogic` reads only `class`/`extends`/`data`).

The fix, and it is better than what was planned: `unreachable` is now a
**declared property of the command-view schema**, with a
`^(exemplar|awaiting:[a-z0-9-]+)$` pattern and its reason in the schema's
own `description`. A row's carrier stays an undeclared top-level key
(rows have no closed schema); a view's is part of the view vocabulary.
⭐ That is strictly stronger than the plan's version — on a view the
disposition is now schema-validated as well as gated, so a typo fails at
boot rather than at the next lint run. `CommandDefinition.unreachableKey.test.ts`
pins the inertness: same verbs, same controller, same bound model, and
the key is neither an arg nor an option.

**D23 — `drive` and `flourish`: two dead views the Phase-1 census
missed, decided at build time.** Arm A's first run reported **15**
unconferred views, not fourteen. The two extra are real, and each was
verified by grep: no `commandContributions` names either path, and the
only other references are a trade-mining test and a kernel test fixture.

*`platform/cmd/movement/drive.yaml` → `DrivableMixin`, `environment` +
`peers`.* `MountableMixin` (`lib/slot/Mountable.ts:41-46`) confers
`mount` and `ride`, and its own comment records this exact bug class
found in the nutrition-fitness drive — *"view, controller and arg gate
all shipped; nothing named the files"*. `drive` is the sibling of that
pair and was missed on the same pass: `DrivableMixin`
(`lib/slot/Drivable.ts`) has no static at all, so `drive north` has
answered *"I don't understand"* since conveyance shipped. BOTH buckets,
unlike Mountable's `peers`-only: the view's own help says *"you have to
be aboard first"*, and a vehicle you are aboard is your CONTAINER, which
is the `environment` bucket — `peers` additionally covers the coach you
walk up to, and the arg's `requires: DrivableMixin` narrows the target
either way.

*`platform/cmd/social/flourish.yaml` → `BarStation` (trade-hospitality),
plus a competence refusal in the controller, plus `mixology.yaml`'s dead
`conferrals:` entry emptied.* ⚠ This one is the **residue of a retired
mechanism**. `FlourishController`'s docstring says the verb *"is afforded
only through competence conferral (it is in no static
`commandContributions`)"*, and `platform/idea/Discipline/mixology.yaml:12-15`
still carries `conferrals: [{band: competent, verbs: [social/flourish.yaml]}]`
— but **band-gated verb conferral was retired in MR !285**, and
`refreshConferrals`, which `Discipline/wind.yaml`'s own prose still cites,
no longer exists in the source. So `flourish` is a verb whose only
conferrer was deliberately deleted, and nothing noticed.

The retirement's doctrine decides the disposition outright: *a band must
never confer verbs — **the refusal IS the progression UI**, so if
something lifts a verb, the verb must EXIST in order for you to be told.*
Therefore: the **rail** affords it (`BarStation` already confers
`muddle`/`strain`/`mix`/`serve` — *the instrument affords the verb*), and
**Mixology competence lifts it**, as a refusal in the controller on the
shape `DoseController.ts:139-142` already ships
(`giver.competenceBandFor('mixology')` + `CompetenceBand.atOrAbove(…,
'competent')`). Conferring it with no gate would have deleted the
pedagogy the view's own help text promises; leaving it unafforded would
have kept a shipped verb unsayable. ⚠ The conferral MACHINERY
(`Advancement.conferredVerbs`, `Discipline.conferrals`) is left standing
and unconsumed — retiring it is a separate cut, recorded in the MR.

---

## ⭐⭐ Host placement

For every new static, class, row-key and field. The test: if a guard
is needed to re-narrow the host set, the host is wrong.

| what | host | what composing it claims about everything else on that host |
|---|---|---|
| `walk.yaml` in `self` | `MobileMixin` (`lib/spatial/Mobile.ts:224`) | Every Mobile — Avatar, every NPC, vehicles, the barge — can *try* to walk, exactly as every Mobile can already try `sneak`/`run`/`go`. A vehicle "walking" is refused by `requiresBodyPlanMode` in the mode gate, which already refuses its `sneak`. No guard. |
| `dismount.yaml` in `self` | `PosedMixin` (`lib/character/Posed.ts:159`) | Every Posed body can try to dismount, as it can try to `stand`; `requiresMounted` declines on the rider's own posture. The state is the rider's, which is why `Mountable` (the horse) is the wrong host: you dismount a horse that has walked out from under you. No guard. |
| `fold.yaml` + `unfold.yaml` in `environment` + `peers` | `FoldableMixin` (`lib/slot/Foldable.ts`) | Anything foldable in the room or beside you offers the two verbs; `fold.yaml`'s `requires: FoldableMixin` narrows the target at the binder. Claims nothing about non-foldable chairs. The Ladder shape (`environment` + `peers`, a same-file `const FOLD`). |
| `wind.yaml` + `adjust.yaml` in `inventory` + `environment` | `Watch` (`terminus/src/university-avenue/thing/Watch.ts`) | A watch you carry or one on a table offers the verbs; the controllers' `hasMixin(MechanicalMovement)` guard is the capability gate, not a host narrowing — it is what makes `wind clock` decline intelligibly while carrying a watch. Claims nothing about `MechanicalMovementMixin`'s other composers (there are none). |
| `prompt.yaml` in `self` | `HasInteractiveMixin` (`lib/connection/HasInteractive.ts`) | Anything with a human on the other side — the Avatar family and `Login` — can cancel the prompts addressed to that connection. `Login` getting it is RIGHT (its prompts are the enroll machine's); the view's `requiresHasInteractive` is the same predicate, so no narrowing. Not `SaxonbergClientMixin` (that is our client's vocabulary; prompts are a connection fact). |
| `transfer.yaml` + `subdivide.yaml` in `self` | `PersonaMixin` (`lib/character/Persona.ts:135`) | Every player, universally, as `title` and `government` already are: *the gate is the authority, not the affordance*. The controllers' `AccessApi.can` refusal is the authority. Not `AuthorMixin` — its own comment records the inverse mistake. |
| `SwimmableMixin` | new class `platform/thing/OpenWater` = `SwimmableMixin(Thing)` (`Thing` as `platform/thing/WaterFixture.ts:51` imports it) | A piece of open water standing in a room is something you can swim from; it claims nothing about the room, the tide (`WaterFixture`) or the shore (`Shore`). Rows set `fixedInPlace: true`, a large `mass`, `axes: ['*']` (the media gate, which runs first, is what refuses a dry exit), `difficulty: null`. Keywords must not collide with the tide's (`water`, `channel`, `sea`) or the shore's (`river`, `bank`): use `[deeps, "deep water", "open water"]`. |
| `unreachable:` top-level key | the YAML row / view FILE, never the class | Claims nothing at runtime by construction (D2). |
| `jar-of-honey` row | `/world/terminus/general-store/thing/jar-of-honey` `extends:` the apiculture jar | The shop's jar is full; the trade's jar stays the empty vessel a recipe fills. |
| hen cuts | `trade-ranching`'s species row names `trade-cooking`'s cut rows | The yield is the species' fact; the cut is the cook's. Same split the ox/ewe already use. |

Nothing new goes on `Thing`, `Good`, `Stuff` or any base class. The one
new class composes one existing mixin onto the concrete `Thing` twin.

---

## Convention conformance

Checked at plan time, not recalled:

- **`props:` / `cast:`** — every placement this build authors is a
  `props:` entry (fixtures) or a `stockLines[]` + `prices` pair;
  `populates:` is retired and appears nowhere here. A `cast:` entry
  names an agent only (census clause (d)).
- **Locations, not rooms** — no new location rows; the swim host is a
  Thing propped in four existing `SingletonCartesianLocation` rows.
- **`<root>/<branch>/`** — `platform/thing/OpenWater.ts` is the class
  (instanceable → `platform/thing/`); its row is the realm's,
  `/world/terminus/estuary/thing/open-water`. The general store's new
  rows sit under `/world/terminus/general-store/thing/`. The script is
  a `scripts/check-*.ts` like its siblings — not a module category.
- **Module scope declares** — the script is outside `src/mud/**`; the
  new class declares a `const` base and a class; the new statics are
  pure value construction.
- **Import boundary** — `OpenWater.ts` imports `SwimmableMixin` from
  `../../lib/locomotion/Swimmable` and `Thing` from `../../lib/stuff/Thing`
  (the kernel); `Watch.ts` keeps its `@saxonberg/server/…` specifiers.
  `lint:imports` is run.
- **Verbs on objects** — no `XApi.verb(host, …)`; the build adds no Api,
  no logic singleton, no free helper. The script's helpers are
  script-local functions (the house shape for `scripts/check-*.ts`).
- **No new module category, exported helper, lint exemption or Mongo
  collection.** If `lint:lib-statics` counts the new `FoldableMixin`
  static, the build compares with how `PosedMixin`'s identical static is
  classified today and makes the classifier treat them alike — it does
  not raise the ceiling.
- **Gates this build must satisfy** (run `pnpm -C packages/server
  lint:family` after every wave; the ones most likely to speak):
  `lint:reachability` (new), `lint:verb-collisions` (unchanged; `dip`
  stays the glass build's), `lint:arg-kinds` (the swim host adds no
  object slot), `lint:census` (every new path resolves),
  `lint:instanceable` (OpenWater is instanceable and in `platform/thing/`),
  `lint:untitled` (new rows are under claimed roots), `lint:mass` (every
  new Tangible row declares `mass` or `_materialPath`),
  `lint:perishable` (the jar of honey), `lint:anatomy` (the hen's cuts
  claim muscles the fowl plan has), `lint:lib-statics` (above),
  `lint:test-content` (no kernel test names `/world/…` — binder tests
  for `bake` live in `trade-baking`'s own `src/__tests__/`),
  `lint:drive-scripts` (none added), `lint:module-scope`,
  `lint:imports`, `lint:mixin-names` (no new mixin).

---

## Waves

Every wave is independently landable and ends at a commit. Push every
turn. Mid-build verification is `pnpm test:near` + each touched pack's
own vitest + `pnpm -C packages/server lint:family`; `pnpm test` runs
once before the MR opens.

### W0 — the instrument, opened at today's figures

**Goal.** `lint:reachability` exists, is in the roster, has been seen to
fail, and reports the three censuses with `--list`.

**Implements.** D1, D2, D3, D4, D5.

**Files.**
- `packages/server/scripts/check-reachability.ts` (new).
- `packages/server/scripts/__tests__/check-reachability.test.ts` (new) +
  `packages/server/scripts/__fixtures__/reachability/**` (one fixture
  pack tree with: a view no static names; a view with `unreachable:
  awaiting:nonexistent-slate`; a row named by `props:`; a row with
  `container:`; a row with `censusKey` + a zone `stocks:` override; a
  row with `regionTarget: 0`; a parent/child `extends:` pair; a row
  named only by a `.md` and a `__tests__` file; a row named only by a
  CITATION field; a row with `unreachable: exemplar`; a view in the
  string-then-object shape; a `commandContributions` built from a
  template literal). Assert the POSITIVE for each.
- `packages/server/package.json` — `"lint:reachability": "tsx
  scripts/check-reachability.ts"`.
- One kernel unit test proving a view carrying a top-level
  `unreachable:` key still loads through `CommandApi.getCommand` (next
  to the binder tests).

**Shape of the script.** Header states: what each arm counts; that the
runtime affordance resolver is untouched and must never become a gate
(quote `command-routing.md:1763`); that the census reads STATICS on
disk (D4) and its one undercount risk; the faucet and citation field
lists with reasons; the carrier vocabulary; and that the roster of
mechanisms is enumerated *and anything outside it is reported*.
`--list` prints every view with its conferrer(s) or disposition, every
row with its mechanism or disposition, and every arm-G view with the
suggested rung. Exit 1 on: any arm over its ceiling; any
`unreachable:` value outside the vocabulary; an `awaiting:` naming no
slate file; a path-valued field in neither list; a non-literal
contributions initializer.

**Ceilings opened — the REAL figures, measured at W0's first run:**
`UNCONFERRED_CEILING = 15`, `PHRASE_SHAPE_CEILING = 9`,
`UNDECLARED_ROW_CEILING = 45`. Corpus: **301 command views, 668 `thing`
rows.**

### ✅ W0 DONE — what the first run changed

- **Arm A found 15, not 14.** The two extra are `drive` and `flourish`
  (D23). The plan's fourteen were themselves a miscount — the
  requirements enumerate thirteen.
- **Arm G found 9, not 16.** The detection is deliberately narrower than
  the Phase-1 survey's *"vulnerable"* count: it requires the trailing
  object arg to be **optional AND carry a `default:`**, because that is
  precisely the case where the bare form OUGHT to work and silently does
  not. A trailing *required* object has no bare form to break — the
  grammar demands two tokens, so a two-word name there is genuinely
  ambiguous and belongs at rung 4 (quote it), not in a ratchet. The nine:
  `buy`, `order`, `reclaim`, `bake`, `issue`, `operate`, `prescribe`,
  `hew`, `stake`. ⭐ `mill` is correctly absent — its `grain` arg is
  object-typed, as the Grounding noted.
- **Arm R found 45, not 79.** The difference is the five mechanisms
  working: the nine `crate-of-*` rows, the blood units and the magic
  census rows all resolve, and the `Gus.ts` prefix rule reaches the six
  avenue rows. ⚠ **Six rows the Grounding does not list**, each triaged
  by the same three dispositions in W3: `/stuff/thing/Campfire`,
  `/stuff/thing/clothes/hood`, `/stuff/thing/clothes/lab-hoodie`,
  `/stuff/thing/gear/backpack`, and — the ones that matter —
  **`/trade/cooking/thing/cleaver` and `/trade/cooking/thing/meat-saw`.**
  Those two are the BUTCHERY TOOLS the carcass-chain build shipped last
  week, and neither is purchasable anywhere: `butcher` has a tool gate on
  depth and no reachable tool to satisfy it. They are a PLACE, not a
  declare.
- **The faucet/citation lists were classified from a census, not from
  memory**: a throwaway walk over every content YAML collecting every
  field whose value is a `thing`-row path found **54 fields**, each of
  which is now in `FAUCETS` or `CITATIONS` with a reason. The gate
  reports an unlisted one as a finding, and the finding quotes the
  `populates:` disaster so the next person knows what a rename costs.
- **D2 was wrong about views** — see the amendment above. The key is a
  declared schema property now.
- **The ratchet runs in BOTH directions.** A ceiling that has gone slack
  fails too, with the number to lower it to. That is what makes the
  per-wave burn-down self-proving rather than a thing someone remembers
  to do.

**Acceptance.** `pnpm -C packages/server lint:family` green; the
fixture test fails the gate on every violation class; `--list` names
the fourteen views and every orphan row the Grounding lists.

**Commit.** `build(reachability W0): lint:reachability — three arms,
one carrier, opened at the census`.

### W1 — the grammar ladder

**Goal.** A newcomer can `buy dog loaf`, `buy orange seed`, `reclaim
dog loaf`, `bake lean loaf` bare, and `mill` tells them to quote.

**Implements.** D12.

**Files.**
- `packages/content/platform/content/platform/cmd/retail/buy.yaml` —
  `thing: greedy: true`; a comment citing `OrderController.ts:72-77`'s
  rationale and this plan; `help:` gains one sentence (*a two-word name
  works bare — `buy dog loaf` — and `buy "dog loaf"` works too*).
- `…/cmd/retail/reclaim.yaml` — the same.
- `packages/content/trade-baking/content/trade/baking/cmd/baking/bake.yaml`
  — `loaf: greedy: true` with `required: false` kept explicit.
- `packages/content/trade-milling/content/trade/milling/cmd/milling/mill.yaml`
  — `help:` gains: *a multi-word name needs quotes here — `mill "sack of
  wheat"` — because the number after it is the extraction.*
- `docs/subsystems/command-spec.md` — a new `### The phrase ladder`
  after `### greedy:` (:500-526): the four rungs verbatim from the
  requirements, with the three converted views and `mill` as the worked
  cases, and the load-time invariant as the reason rung 4 exists.
- Binder tests, real YAML through `CommandApi.assemble`:
  `platform/idea/cmd/retail/__tests__/retail-views.binder.test.ts`
  (`buy dog loaf` binds `thing = "dog loaf"` and `counter` to its
  default; `buy "dog loaf"` the same; `buy torch from second counter`
  binds both; `reclaim dog loaf`), and
  `packages/content/trade-baking/src/__tests__/bake-view.binder.test.ts`
  (`bake lean loaf` → `loaf = "lean loaf"`, `oven` defaulted; `bake` →
  loaf unbound). ⚠ A quoted multi-word positional through `assemble`
  has never been tested; this is where it is.
- `check-reachability.ts` — `PHRASE_SHAPE_CEILING` 16 → 13.

**Acceptance.** Binder tests green; `lint:reachability --list` shows
the three views out of arm G; `lint:family` green.

**Commit.** `build(reachability W1): buy, reclaim and bake take a
phrase; mill says to quote`.

### ✅ W1 DONE — the binder tests found THREE defects, not zero

The plan said *"a quoted multi-word positional through `assemble` has
never been tested; this is where it is."* It was, and it paid.

**1. Quoting a GREEDY arg kept the quote marks** — and this build would
have shipped the regression. `buy "dog loaf"` bound the string
`"dog loaf"`, punctuation included, against a `hasKeyword` that does an
exact `includes` on `dog loaf` without them. ⚠⚠ The reason it had never
been seen: a NON-greedy positional binds `token.value`, which the
tokenizer has already unquoted, so quoting worked perfectly on every
one-token arg in the game — and W1's whole job was to make `buy.thing`
greedy. The bare form and the quoted form would have **traded places** in
one commit, which is worse than either.

The fix is in `CommandLogic.bindPositionals` and is deliberately narrow:
a greedy span of **exactly one token whose `raw` differs from its
`value`** binds the value. One quoted token means the player used quoting
for the thing it is for — *treat this phrase as one argument*. SEVERAL
tokens is free text, where an interior quote is part of what was written
(a headline, a line of dialogue) and the source slice stays verbatim.
`CommandLogic.greedyQuoting.test.ts` pins both halves. ⚠ This is a
binder change, which the plan said not to make — but the plan's
prohibition is about **positional overflow**, which is documented grammar
and is untouched. Making greedy honour quoting is a different thing and
was a precondition for W1 being correct rather than a trade.

**2. `buy torch from the counter` was a shape error** — and so were
`bake at the brick oven` and `mill wheat at the quern`. A non-greedy arg
takes one token, so the article and the noun had nowhere to go. ⚠⚠ **All
three forms are promised by the view's own help text or its own arg
comment** — `bake`'s help has said *"where there is more than one fire in
reach, say which: `bake at the brick oven`"* since the oven arg shipped,
and `mill`'s arg comment calls a second set of stones being ADDRESSABLE
the whole point of declaring it. A help text documenting a form the
binder refuses is the same failure class as a verb nothing confers.

The remedy was already doctrine:
`docs/subsystems/command-spec.md:507-515` — *"THE ARTICLE DEFECT — every
object arg a player may put an article in front of needs this,
INCLUDING plural and prepositional ones"* — with 45 shipped views
carrying `greedy` for exactly that reason. So the four trailing args
(`buy.counter`, `reclaim.shelf`, `bake.oven`, `mill.mill`) are greedy
too. Every form the four help texts promise now binds.

**3. D25 — and it is a POPULATION: 106 more.** A census of every
`object`/`objects` arg declaring `prepositions:` without `greedy:` found
**106** across the view corpus (after this build's four), in medicine,
mining, smithing, textiles, tailoring, tanning, smelting, ranching… every
one of them a verb that invites you to name an instrument and then
refuses the article. ⭐ So arm G grew a **second ratchet**,
`ARTICLE_SHAPE_CEILING = 106`, rather than this build sweeping a hundred
views' grammar on the way past — `lint-family.md`'s own rule: *gate
today's count as the ceiling; step 2 is what makes stopping the growth
affordable before anyone has time to fix it.* It is a legitimate ratchet
and not a bare count: a prepositional object arg is a per-view authoring
decision and a new one should be born greedy, so the ceiling never needs
to rise. The detector reads **subcommand** arg lists as well as flat ones.

**4. `mill`'s help was rewritten twice.** The first draft said the
unquoted form gives *"that doesn't match any known command shape"*. It
does not: `mill sack of wheat` binds `grain = sack`, `extraction = of`,
`mill = wheat`, because the binder applies **no type gate to a
positional** — a `number` arg accepts the word `of` without complaint. So
the help now says the true thing, which is worse and more useful: *it does
not refuse you, it mills the wrong thing.* ⚠ A type gate on numeric
positionals is a real missing check and is NOT in this build's scope; the
binder test pins the current behaviour so that whoever adds it is told the
help text needs rewriting with it. Recorded for the MR.

**Ceilings after W1:** `PHRASE_SHAPE_CEILING` 9 → **6**;
`ARTICLE_SHAPE_CEILING` opened at **106**.


### W2 — the verbs

**Goal.** Nine verbs reachable, five held with a reason in a field, the
water host in the world, the watch for sale, and the two tests that
hid the dead verbs able to fail.

**Implements.** D6, D7, D10 (two of three), D13 (the watch).

**Files.**
- `lib/spatial/Mobile.ts:224-242` — add
  `'platform/cmd/movement/walk.yaml'` beside `sneak`/`run`, with a
  comment: *the third ground pace; a player who followed `sneak.yaml`'s
  own advice (`set movement.defaultMode sneak`) had no verb to walk one
  exit.*
- `lib/character/Posed.ts:159-168` — add
  `'platform/cmd/movement/dismount.yaml'`; extend the docstring's
  bug-class note with this instance.
- `lib/slot/Foldable.ts` — `import type { CommandContributions }`; `const
  FOLD = ['platform/cmd/device/fold.yaml',
  'platform/cmd/device/unfold.yaml']; static commandContributions = {
  self: [], inventory: [], environment: FOLD, peers: FOLD }` (match the
  bucket shape Ladder/Whistle use).
- `lib/connection/HasInteractive.ts` — `static commandContributions = {
  self: ['platform/cmd/system/prompt.yaml'], … }`, comment: *a prompt is
  addressed to a connection; whoever has a human on the other side can
  cancel it. `Login` composes this too, and that is right.*
- `lib/character/Persona.ts:135-160` — add
  `'platform/cmd/system/transfer.yaml'`,
  `'platform/cmd/system/subdivide.yaml'` beside `committee.yaml`, with
  the `title` doctrine sentence as the comment.
- `packages/content/terminus/src/university-avenue/thing/Watch.ts` —
  `const TIMEPIECE = ['world/terminus/university-avenue/cmd/wind.yaml',
  'world/terminus/university-avenue/cmd/adjust.yaml']; static
  commandContributions = { self: [], inventory: TIMEPIECE, environment:
  TIMEPIECE, peers: [] }`; rewrite the docstring paragraph (D6).
- `lib/time/MechanicalMovement.ts` header — the one added line (D6).
- `platform/thing/OpenWater.ts` (new): `const OpenWaterBase =
  SwimmableMixin(Thing); export default class OpenWater extends
  OpenWaterBase {}` with a docstring naming the Ladder as its shape and
  the two rejected hosts (D7). Unit test beside it over synthetic
  fixtures: an actor in a room with an `OpenWater` and a `media:
  [ground, water]` exit can engage `swim`; the same actor at a
  `media: [ground]` exit is refused at the media gate first.
- `packages/content/terminus/content/world/terminus/estuary/thing/open-water.yaml`
  (new; class `/platform/thing/OpenWater`; `register: definite`;
  keywords per Host placement; `axes: ['*']`; `fixedInPlace: true`;
  `mass` large; prose).
- Props: `estuary/estuary-mouth.yaml:34-37` (after the salt pans),
  `estuary/reach.yaml`, `estuary/lower-towpath.yaml`,
  `wharfside/bank.yaml:126-131` — one line each.
- `packages/content/platform/content/platform/cmd/boundary/lock.yaml`,
  `unlock.yaml` — `unreachable: awaiting:base-class-narrowing-slate`
  (top-level) with a two-line comment pointing at § I9.
- `…/cmd/movement/fly.yaml` — `unreachable:
  awaiting:base-class-narrowing-slate` (the verb list already lives in
  its § L9, which W4 edits to say "a flying species"); if a species or
  locomotion slate exists that is a better home, name that one instead
  and say which in the commit.
- `packages/content/terminus/content/world/terminus/general-store/thing/pocket-watch.yaml`
  (new, D13) + `counter.yaml` stock line (par 2) + price.
- `packages/wire/tests/world-scan.dirty.wire.test.ts:188-201` — replace
  the `if` with an unconditional `expectOk(moved)` and a `queryOne`
  state change; the mode loop asserts each of `run`/`sneak`/`walk` is
  UNDERSTOOD (no `command-rejected` note), not merely non-error.
- `packages/server/src/mud/__tests__/integration/locomotion.test.ts:37-40`
  — keep the manufactured hosts (it is a unit test of the walk), but
  rename the swim/fly cases to say they test the MECHANISM over a
  synthetic host and point at the drive for the real one.
- `check-reachability.ts` — `UNCONFERRED_CEILING` deleted; arm A is a
  zero invariant from here.

**Acceptance.** `lint:reachability --list` shows every view conferred
or declared; `lint:lib-statics` unchanged (or the classifier fixed,
never the ceiling); `lint:family` green; `pnpm test:near` green;
`terminus`'s own vitest green.

**Commit.** `build(reachability W2): nine verbs conferred, five
declared, the estuary swims, the store sells a watch`.

### ✅ W2 DONE — **arm A is a ZERO INVARIANT**

Eleven verbs conferred, three declared. `UNCONFERRED_CEILING` is gone:
the constant is `0` and the comment says why a zero is possible here
where a ceiling was not — *a ceiling over a population nobody can finish
drifts up; a zero over a declaration costs an author one line and
cannot.*

**Conferred (11, two more than planned):** `walk` → `MobileMixin.self` ·
`dismount` → `PosedMixin.self` · `fold`/`unfold` → `FoldableMixin`
(inventory + environment + peers) · `prompt` →
`HasInteractiveMixin.self` · `transfer`/`subdivide` →
`PersonaMixin.self` · `wind`/`adjust` → `Watch` (inventory +
environment) · **`drive` → `DrivableMixin`** (environment + peers, D23) ·
**`flourish` → `BarStation`** (D23).

**Declared held (3):** `lock`, `unlock`, `fly`, each with a multi-line
comment above the key explaining what is held and what lifts it. ⭐ The
`fly` reason is worth reading: it is the one case where *afford
statically, decline diegetically* does NOT apply, because the thing the
refusal would point at does not exist in any form — no `media: ['air']`
exit, no flying species, no composer of the mixin. `swim` was the
opposite case and is conferred, because everything but the host was
already there.

**The water host.** `platform/thing/OpenWater` = `SwimmableMixin(Thing)`,
one row at `/world/terminus/estuary/thing/open-water`, propped in four
rooms (estuary mouth, reach, lower towpath, and the wharfside bank).
`OpenWater.test.ts` asserts the thing that makes a Thing the right host:
**water in the room makes a water exit swimmable, and the same room
without it does not** — and that the MEDIA gate runs first, which is why
`axes: ['*']` on the row claims every axis without claiming every exit.
Keywords deliberately avoid the tide's and the river edge's: three water
objects stand in these rooms and each answers to its own name.

**The two tests that could not fail, fixed.**
- `world-scan.dirty.wire.test.ts` step 8 was `if (moved.status === 'ok')
  { …assert… }` over a verb afforded by nothing, so the `if` never opened
  and the only assertion never ran — and the companion loop's
  `.not.toBe('error')` is satisfied by an unknown verb DECLINING. It is
  unconditional now and asserts, per mode, that no `command-rejected`
  note came back. A test titled *"walking, running and sneaking all move
  you"* had been passing nightly over a verb the game did not understand.
- `__tests__/integration/locomotion.test.ts` keeps its manufactured
  `SwimZoneLocation`/`FlyZoneLocation` — a synthetic host is the right
  way to unit-test an enablement walk — but both cases are **relabelled**
  to say they test the mechanism over a host the test built itself, with
  a header explaining that being the only composition in the repo is
  exactly why nobody noticed the realm had no water. *A test that
  manufactures what the world lacks hides the lack.*

**`CommandGiver.affordances.test.ts` grew five cases** over the affordance
WALK, not the census: a `Mobile`+`Posed` actor affords `walk` and
`dismount`; a camp chair in the room lights up `fold`/`unfold` and an
empty room does not; a cart lights up `drive`; a connection affords
`prompt` and a body with no human behind it does not.

**Two docstrings rewritten, because the prose is what shipped the bug.**
`Watch.ts` used to end *"so Watch contributes none"* — every clause true
except the conclusion, which picks the right GATE and forgets to pick a
CONFERRER. `MechanicalMovement.ts` gained the missing half: **the mixin
is the gate, the concrete timepiece in the pack that owns the verbs is
the conferrer.** Saying only the first is what cost the locality its two
verbs for its whole life.

**D13, the watch.** `/world/terminus/general-store/thing/pocket-watch`,
par 2 at 18 coin — a standalone row, not an `extends:` of Gus's, because
his carries the AUGUSTUS engraving in `details:` and inheriting it would
put a private inscription on every watch on the shelf. Reason for the row
in one line: *a verb whose only instrument belongs to an NPC is reachable
in theory and unreachable in fact.*

⚠ **One finding the gate's own fixtures produced:** naming a fixture file
`widget.test.ts` made vitest collect it, and
`lint:test-bootstrap:verify` compares its walk against vitest's roster —
so a fixture wearing the test suffix reads as a real test file with no
tests in it. Renamed `names-a-row.ts`; it only has to live inside a
`__tests__` directory, which is what `packSrcFiles` skips.


### W3 — the rows

**Goal.** Every `thing` row is reachable by a mechanism, declared, or
gone; arm R flips to zero.

**Implements.** D5 (the data side), D8, D13 (the jar), D14, D15, D17,
D18, D19, D20, D21, D22.

**Files, by pack.**
- `hearts-delight`: `location/farmstead-yard.yaml:34-38` props
  `/world/terminus/hearts-delight/thing/ox-book` after the flock book;
  `pack.yaml:63` a second warm line (`role: producer`, reason: *the ox
  book is the only thing affording `draft` on the team*). **The hen
  (D22, authorized): a `hen-book` row + props + warm line, the same
  shape as the ox book — not optional, not a default.**
- `terminus`: `wharfside/bank.yaml` props + details (D17); the
  `jar-of-honey` row + counter line/price swap (D13); `general-store/thing/saucer`
  stock line (par 3) + price (1); counter lines + prices for
  `/stuff/thing/vessel/hopper` (D18), `/stuff/thing/vessel/compost-sack`
  (beside `soil-sack`, :81/:286), `/trade/dyeing/thing/household-vat`,
  `/trade/textiles/thing/drop-spindle`, `/trade/farming/thing/basket`,
  `/trade/haulage/thing/supply-crate` (the realm's importer stocks the
  empty crate a gig needs); `goods-yards/yard.yaml:64` props
  `/stuff/thing/gear/anvil` (D19); `wharfside/bank.yaml` props
  `/system/transport/thing/barge` (the city's wharf, where the estuary
  mouth says a barge can be); `terminal/thing/mana-main.yaml` →
  `extends:` (D8); `watershed.test.ts:320` resolves the aqueduct through
  the bank's props (walk the bank row's `props:` and build the conduit
  from the PROPPED path, so an unplaced aqueduct fails the test).
- `saxonberg-lounge`: `thing/mana-main.yaml` → `extends:` (D8); delete
  `thing/bandage.yaml` (D21).
- `hearthworks`: `location/cookhouse.yaml:118` props
  `/stuff/thing/cutlery/table-fork` beside the knife.
- `trade-ranching`: `gallus/domesticus.yaml:81-83` (D14) + the mass
  test + `package.json` dependency if needed.
- `trade-bottling`: `cola.yaml`, `tonic.yaml`, `ginger-beer.yaml`,
  `cranberry-juice.yaml` → `extends: /trade/bottling/thing/mixer-bottle`
  (the `can-of-cola` → `can` precedent, `templates.md:98-105`), each
  keeping only what differs. If a row's data cannot be expressed as a
  delta (verify with `cat`'s annotated read), fall back to a general
  store stock line for the empty bottle and say so.
- `trade-shopkeeping`: `src/behavior/consigns.ts:124-125` (D15, after
  diagnosis).
- `generic-objects`: delete `Kiln.yaml`, `vessel/saucer.yaml`;
  `unreachable: exemplar` on the eleven (D20).
- `arcane-library`: delete `wand-of-firebolt-cursed.yaml`; `unreachable:
  awaiting:magic-items-slate` on the five (D20).
- `trade-fuel`: delete `thing/oil-cask.yaml` after confirming no
  recipe/vessel-kind reader names `vessel:oil-cask` by key (the header
  claims a census it does not declare; `lamp-oil-cask` is what the oil
  works mints).
- `check-reachability.ts` — `UNDECLARED_ROW_CEILING` deleted; arm R is
  a zero invariant.

**Acceptance.** `lint:reachability` zero findings on all three arms (G
at its ceiling); `lint:census`, `lint:mass`, `lint:anatomy`,
`lint:perishable`, `lint:untitled` green; each touched pack's vitest
green; a boot of a fresh DB shows no `expected singleton, found 2`.

**Commit.** `build(reachability W3): every thing reachable, declared or
gone — arm R at zero`.

### ✅ W3 DONE — **arm R is a ZERO INVARIANT**, and the plan was wrong five times

45 → 0. The shape of the burn-down, because the shape is the argument:
**19 went on a shop shelf · 10 were placed where the world already
described them · 5 declared `exemplar` · 6 parked against
`magic-items-slate` · 4 resolved by `extends:` or `container:` · 1
deleted.**

**D26 — the rule that decided between a shelf and a declaration**, since
the plan did not state one: *if a player would plausibly own one it is
stock; if it exists only so a doc can point at it, it is declared
`unreachable: exemplar`.* It is written into the counter's own comment so
the next author inherits it rather than re-deriving it.

**⚠ D21 WAS WRONG ABOUT FOUR OF ITS FIVE DELETIONS.** Each row's own
header said where it belonged, and reading them is what caught it:

- `/world/lounge/thing/bandage` — its header says it is *"stocked in the
  glass alley (where you get cut) so the treat loop is playable
  in-world."* It was stocked nowhere and there is no glass alley. It is
  the ONLY dressing in the realm and `treat`/`bind`/`dress` CONSUMES one,
  so deleting it would have taken the treat loop with it. **Two of them
  are propped behind the lounge's rail now** — a bar is where the broken
  glass is, and two because one is a demonstration and two is a supply.
- `/stuff/thing/Kiln` — the plan said *"stood nowhere for its whole
  life"*, which its header does say, but the header's POINT is that the
  row is the standing proof the `Kiln` CLASS was unnecessary (the dials
  are all there is now, on the right parent). Deleting it deletes the
  evidence for a decision already made. **`unreachable: exemplar`.**
- `/stuff/thing/vessel/saucer` — the plan nominated the wrong twin. The
  commons' saucer is the documented AC-26 proof; the general store's was
  the near-duplicate with no price and no par. **The store's `extends:`
  the commons' now**, which makes the parent reachable by rule 4, keeps
  the exemplar where the doc points, and picks up the `mass` the store's
  row never stated.
- `/stuff/thing/magic/wand-of-firebolt-cursed` — the plan's reasoning was
  right (the odds DID land: `wand-of-firebolt` carries `blessingOdds` and
  `ResidencyLogic.rollBlessing` stamps the band on each minted instance,
  so cursed wands enter from the ordinary row and the row's *"until
  generation odds land"* comment is stale). But `arcane-library/README.md`
  lists it and `plans/slate-compaction/magic-items.md:88` cites it as the
  code evidence for *a cursed identify plants a false identification*.
  ⭐ **Deleting content two docs point at to satisfy a gate is the gate
  wagging the dog**, and whether a hand-authored cursed exemplar should
  outlive a mechanism that mints the same object is a DISTRIBUTION
  question — the slate's. **Parked with its five siblings.**

**The ONE deletion:** `/trade/fuel/thing/oil-cask`. Its header claims it
is *"what ties it to the filled `lamp-oil-cask` — burn or pour the oil and
the same cask is left, empty, ready to refill"*, and that describes a
mechanism that does not exist: nothing clones it, `lamp-oil-cask` does not
`extends:` it, and emptying the filled cask leaves the SAME object empty.
`category: oil-cask` ties them for `CategoryMeasure`'s tally, which is a
read over a tag and not a faucet. A second empty-cask row whose stated
purpose the filled row already serves. `lamp-oil.test.ts` named it and was
rewritten with the diagnosis.

**D14 resolved, and better than the plan expected.** `Species.dressOut`:
*"a CLAIMING line's share DERIVES from the muscles it takes, so `fraction`
stops being a second copy of a fact the body plan already states."* The
three poultry cuts declare `tissues:`, `BodyPlan/fowl` states their
shares, so **no `fraction:` is authored at all** — a plump hen dresses
heavy and a scrawny one light off four lines nobody tuned. The old comment
(*"a hen is COUNTED, not dressed, and the absence of `fraction` is the
whole statement"*) was half right for the wrong reason: the absence of
`fraction` is not what makes a line counted, **claiming nothing is.** The
giblets are genuinely counted; the meat is claiming. No mass test was
needed — the arithmetic decided it.

**D18 resolved: the birdseed does NOT ship**, and the plan's own
conditional is why. `Feeder.offerings()` accepts any edible Tangible and
`diet` gates nothing (it is a dossier field — `SpeciesLogic` only
DISPLAYS it). The store sells rations, which are a `Provision` and *"real,
edible food"*. So a reachable food already satisfies a hopper, the
condition for the row is not met, and adding it would have been the same
defect in the other direction. The hopper itself IS now stocked, which
was the actual gap.

**D15 deferred to the drive.** The distributor counter needs a boot log to
say which call clones the second instance, and the plan says not to guess
between its two suspects. Carried to W5.

**⚠⚠ Three things the tests found that no amount of reading would have:**

1. **A `Hearth` is not chattel-stampable**, so the brazier and the stove
   **cannot be shop stock** — `Stock` stamps title on the sale and
   consignment rides chattel, so stocking one sells somebody a thing they
   cannot own. D26's rule met a mechanism it did not know about, and the
   store's own standup test is what said so. Both are PROPPED instead (the
   goods yard and the depot hut), which is how every other `Hearth` and
   `Forge` in the realm already stands — including the one on this shop's
   own floor. The counter carries the reason where the next author will
   look.
2. **A duplicate price key.** The first counter edit added prices for the
   cleaver and the saw — which were ALREADY priced at `:258-259` by the
   carcass-chain build, with a careful comment about *"the capital cost of
   being able to take a joint at all"*, and given no `stockLines` entry.
   So par was 0, the sweep cloned none, and `buy cleaver` answered
   *"there's nothing to buy here."* ⭐ **A price with no par is a shop
   that has decided what it charges for something it never has** — and
   `ButcherController:320-326` gates the deepest breakdown on a `saw` and
   chops on a `cleaver` AND a block, so **the carcass chain's hardest step
   was unreachable by anybody from the day it merged.** See D27.
3. **Two tests that read `raw.class`**, and a third that enumerated what
   it should derive. See the test notes below.

**D27 — priced-with-no-par is NOT gated, and the census is why.** Four
instances exist, all on this counter, and only two are defects: the other
two (`cut-loin`, `stew-meat`) are the shop's BUY-side price for meat a
player brings in, which is legitimate and has no par by design. Nothing in
the authoring vocabulary distinguishes *"I sell this"* from *"I buy
this"*, so a gate would need a field that does not exist. Recorded for
`retail-slate` as a one-paragraph finding; the two real ones are fixed.

**Three tests fixed, each for the same reason in a different costume:**
- `general-store-content.test.ts` read `good.class ?? ""` and went red the
  moment a shelf good became an `extends:` child. ⚠ That is the go-blind
  failure `pack-roots.effectiveDoc` exists for and which **fifteen lint
  gates had to be fixed the same way** — *a reader selecting on
  `raw.class` skips a class-less child silently, which reads exactly like
  a pass.* Here it failed loudly instead, which is the better of two bad
  outcomes and still not right. It resolves the parent chain now.
- `general-store-standup.integration.test.ts` enumerated its shelf in
  **eight hand-written groups**, and the sweep's nineteen lines belonged
  to none of them. The list is DERIVED from the counter's own
  `stockLines` now: the counter already states its roster and a second
  copy beside the test can only drift. Its `seedDoc`/`objDoc` fold the
  parent chain too.
- The same file registered **one** fabric construction form by hand,
  `woven`, under a comment naming all three — so the knit hoodie killed
  the standup on `unknown form 'knit'`. It reads `base-library`'s fabric
  rows now, so a fourth form is a row and nothing else.

Also in: the aqueduct and its house stand on the wharfside bank with a
`details:` entry and a sentence of prose (D17), and `watershed.test.ts`
gained the assertion it never had — **the bank's `props:` must NAME both
rows**, because every other assertion in that file builds the conduit from
its FILE, which is the right way to test arithmetic and the wrong way to
learn whether a thing exists. A barge at the city wharf (the general
store's own rig comment says *"a boat in a general store is silly, and the
depot at Wharfside is where those belong"*). The table fork in the
cookhouse, whose own comment said a kitchen that hands you nothing to eat
with is a worse lie. The generic anvil beside the goods-yard wagon (D19).
`mana-main`: both locality copies `extends:` the generic row, which its own
header asked for and which nothing had ever done. `mixer-bottle` gets a
`container:` on the bottling floor — ⚠ **not** `extends:`, because the four
filled siblings would have inherited its `open: true` and every capped
bottle of cola would read as open and go flat.


### W4 — docs, slates, and the test that pinned a falsehood

**Goal.** No doc asserts a dead verb works; the locomotion recipe
teaches the affordance step; the slates are corrected; the gate is
documented.

**Implements.** D16.

**Files.**
- `docs/subsystems/locomotion.md:312-321` — step 5: *confer the verb:
  the mode's verb is a `self` contribution of the MOVER (`walk`, `sneak`,
  `run`) or an `environment`/`peers` contribution of the ENABLEMENT HOST
  (`climb` on `Ladder`, `swim` on `OpenWater`). A view no static names
  is dead YAML, and `lint:reachability` refuses it.* Cast table
  (:14-18): Swimmable is composed by `platform/thing/OpenWater` since
  this build; `:5-18, 27-32` stop implying all six verbs are reachable.
- `time.md:602-618` — the path corrected to the shipped tree; *"affords
  neither verb"* rewritten: the mixin GATES, `Watch` CONFERS.
- `slot.md:144-148`, `architecture.md:1281` — `FoldableMixin` confers
  the two device verbs.
- `conveyance.md:162-167` — `dismount` is `Posed`'s.
- `prompt.md:156-166`, `card-surface.md:240,261` — `prompt` is
  `HasInteractive`'s.
- `access.md:72-75,740`, `sandbox.md:187-189`, `smallholding.md:248,475`,
  `furnishing.md:289`, `parcel.md:341` — separate the parcel **verbs**
  (now `Persona`'s) from the parcel **Api** (always worked).
- `boundary.md:487-496` — one sentence: the two views are declared
  `unreachable: awaiting:base-class-narrowing-slate` until § I9 lands.
- `command-routing.md` — a short subsection under *"There is ONE record
  of verb affordances"*: the record is now gated (`lint:reachability`,
  static over statics, never the resolver).
- `docs/lint-family.md` — a `### lint:reachability` section after
  `lint:verb-collisions` (:800): the three arms, the carrier, why A and
  R are zero invariants and G a ratchet, the faucet/citation split and
  the `Feeder.source` case that forced it, the `Gus.ts` prefix case,
  and *"it was seen to fail on fixtures before it was trusted"*.
- `docs/subsystems/templates.md` — the `unreachable:` top-level key
  documented beside `extends:` (what it is, the vocabulary, that the
  installer drops it).
- `docs/subsystems/command-spec.md` — the same key on a view, beside
  the top-level shape (:194).
- `docs/slates/tails/butchery-slate.md:5` status block + `:144-172`:
  the beeswax claim retracted with the chain written out (nuc →
  `hive` → `rob` → comb → `crush-comb` → `beeswax-cake` → `melt-wax` →
  `dip`), citing `general-store/counter.yaml:139` and the apiculture
  drive. Poultry cuts moved from *Left* to shipped.
- `docs/slates/builds/base-class-narrowing-slate.md:449-452` § L9 —
  edited in place: the fourteen, which nine this build conferred,
  which five are declared and why; `fly` waits on a flying species.
- `docs/slates/tails/affordance-verb-slate.md:104-110` — the timepiece
  verbs never ran until this build; conferred by `Watch`.
- `packages/wire/tests/carcass-chain.dirty.wire.test.ts:1129-1168` —
  step 16 retitled and its comment rewritten: the wax half HAS a supply
  (the apiculture drive proves it); what this step owns is the alias.
- `./tools/slate-index` run at the sweep, not here (README is swept).

**Acceptance.** `grep -rn "affords neither\|Watch contributes none"
docs/ packages/` empty; every `:line` above re-read after the edit;
`./tools/slate-index --check` passes.

**Commit.** `docs(reachability W4): no doc claims a dead verb works;
the locomotion recipe teaches the affordance step`.

### W5 — the drive

**Goal.** The requirements' 23 steps run against the live game, every
checkpoint able to fail, and the record appended below.

**Implements.** D11.

**Files.**
- `packages/wire/tests/reachability.dirty.wire.test.ts` (new) — steps
  1–22. `DIRTY_REASON`: *buys from par (watch, hopper, vat, spindle,
  saucer, dog loaf, jar of honey, compost), subdivides and transfers a
  parcel, drafts and slaughters a hen, and leaves an ox drafted.*
  `declareFile` lists every pack touched (terminus, hearts-delight,
  rejection, hearthworks, generic-objects, trade-ranching,
  trade-cooking, trade-dyeing, trade-textiles, trade-baking,
  trade-milling, trade-shopkeeping, arcana, water, transport, …).
- `packages/wire/tests/apiculture.dirty.wire.test.ts` — step 23's tail
  appended after the `rob` checkpoint: `crush` the comb (the apiculture
  recipe via the platform's `make`/craft verb — read
  `crush-comb.yaml`'s `keywords` and `crafting.md` for which verb
  resolves it), hold the beeswax cake, `melt` it at the chandlery's dip
  pot, `dip` a candle made of beeswax.
- `docs/plans/reachability-sweep-plan.md § Drive record`.

**Checkpoint discipline** (every step): a local
`expectUnderstood(r)` asserts no `command-rejected` and no
`validator-failed` note; then `expectOk` or the expected
`controller-rejected` reason via `expectNote`; then a state read via
`queryOne` that differs from the read taken before. For step 8 the
assertion is the POSITIVE `expectNote(r, 'command-rejected')` for
`lock north` and `fly up`, plus `lint:reachability --list` naming both
with their reason (asserted by running the script from the test or
pinned in the script's own test).

**Acceptance.** 23/23, the output pasted into the Drive record with the
count and what each failure was on the way there.

**Commit.** `drive(reachability): 23 checkpoints — <what driving found>`.

### ✅ W5 DONE — the drive found a **kernel defect that broke the realm's main shop**

Seven runs. 22/22 on `reachability.dirty.wire.test.ts` and 21/21 on the
apiculture file with its appended tail, both on a fresh DB.

#### ⛔⛔⛔ What it found, and nothing else could have

**`buy` was broken for EVERY good at the general store.** Every purchase
answered *"Something went wrong in BuyController:
`StuffApi.findByTemplatePath('/world/terminus/general-store/counter')`:
expected singleton, found **3**."* On a fresh boot. For every player.

This is D15's bug — and the plan had it at the DISTRIBUTOR's counter with
two suspects and "the boot log decides". The log decided: it is the
general store too, the count is three, and there are **three different
cloners** for that one path:

1. `trade-shopkeeping/src/behavior/consigns.ts` — `findByTemplatePath(shelf)
   ?? singletonOrClone(shelf)`. A beat that fires before the room has
   minted its `props:` finds nothing live and clones a second counter.
   The wharfside weaver's `consigns` config points at this counter.
2. `trade-farming/src/behavior/farms.ts` — the identical `??` fallback,
   found by grepping for the shape rather than the file.
3. ⭐⭐ `EmploymentLogic.moveForShift` — and this one is worse than a
   duplicate. It took `business.getOperatingLocations()[0]`, which for
   the general store is **the COUNTER** (deliberately: a house that
   listed only the room was unfindable as a supplier),
   `singletonOrClone`d it, and **teleported the shopkeeper inside the
   till**, a `Stock` being a `Container`.

⭐ The fixes. The two brains drop the fallback: *a shelf that is not live
is nothing to carry this beat*, which is exactly how `consigns` already
treats the floor stock three lines above it — **a brain must never mint a
fixture a room's `props:` owns.** `moveForShift` splits its two cases
(offstage keeps its clone, which is correct and documented — an offstage
room is materialized on demand), and a station must now resolve LIVE and
**not be a Thing**. ⚠ `!isThing()` rather than `isLocation()`, and the
branch taxonomy is the reason: what has to be excluded is furniture, and
asking `isLocation()` would be true of the real world and false of every
test stand-in — a gate that only fails for the people writing tests.
`EmploymentLogic.shiftMove.test.ts` gained the regression, through the
real roster tick: the worker stands in the room, and
`findByTemplatePath` of the counter still resolves to one thing.

⚠⚠ **And the counter duplication was ALSO killing the keeper's stocking
beat** — its `stocks` brain reads the same path — so the two `sold-out`
answers the drive got were a consequence, not a second bug.

#### ⭐⭐⭐ D28 — the NAMING ratchet: 71 goods print a name they cannot answer to

`buy drop spindle` bound correctly after W1 and came back *"The shelf is
bare of 'drop spindle'."* The shelf was not bare. The row's keywords are
`[spindle, drop-spindle, whorl, drop]` — **no spaced form** — and
`Stock.resolveBuy` → `hasKeyword` is an exact `includes`.

⭐ So W1 traded one misleading refusal for another, and **the second is
worse**: the first said something irrelevant about a counter, the second
asserts something FALSE about the world. A census found **71 stocked
goods across every counter in the realm** whose printed
`shortDescription` is a phrase their keywords do not contain — the dyeing
pot, the supply crate, the bronze breastplate, the canvas backpack, the
crate of limes, nine fishing lines. The 34 that DO carry the spaced form
(`"dog loaf"`, `"orange seed"`, `"mana cell"`) are the ones the
requirements named, and those work.

A fourth ratchet, `UNNAMEABLE_GOOD_CEILING = 71`, scoped to rows on a
counter's `stockLines` — only a good with a printed price has a name a
player reads and types; a prop may be called what it likes. The two this
build put on a shelf itself are fixed (the spindle and the vat), because
finishing your own work is not scope creep.

#### ⛔⛔ And the apiculture chain does NOT close — the crush rung was never built

W4's retraction said the beeswax chain was whole end to end. **That was
wrong, and the drive is what caught it.** Typing `crush` gets *"I don't
understand."* `crush` is a KEYWORD on `recipes/crush-comb.yaml`, and
every trade in the game resolves its own catalogue recipes through its
OWN verb's controller — `Bake`, `Mill`, `Dip`, `Cook`, `Forge`, each
calling `CraftingApi.craft`. Apiculture ships exactly one verb and
`apiculture.md` says so: *"`rob` is the trade's ONE verb."* `make` is no
fallback — it dispatches a recipe SCRIPT, the same wall AC 1 hits with
`make leather-jerkin`.

So `crush-comb` and `spin-comb` — two authored recipes with slots, a tool
capability, outputs and a residue, written up as a table and called *the
epoch ladder* — are **resolved by nothing.** ⭐ A sixth reachability link
wearing a familiar shape: not a verb nothing confers, but a RECIPE no
verb resolves. All five gated links pass it, and `lint:reachability`
cannot see it either (a recipe is a `recipe` DocumentKind, not a `thing`
row).

⚠ **This build does not ship a `crush` verb**, and the reason is the
collision ladder: a second verb for a trade is a laddered decision, the
first rung is *unify behind an interface*, and whether crushing is a
verb, a `rob` subcommand, or one verb whose TOOL selects the recipe is a
question about what the trade teaches. The third shape looks right on the
doc's own words (*"nothing in the code branches on the tool"*) and is one
view and one controller. → `apiculture-slate`, with all three shapes
written out. The drive asserts as a POSITIVE that `crush` is unknown, so
it FAILS the day the act lands and asks for the real walk in its place.

⚠⚠ **The correction is the sweep's own thesis turned on its own prose:**
the rows were all present, so the chain read as whole, and nobody had
typed the verb. *Rows being present is not a chain being walkable.* The
butchery slate, the carcass test comment and the apiculture slate all
say the accurate thing now.

#### What the drive taught about drives

- **`validator-failed` is NOT a dead verb.** `dismount` came back
  `{validator: 'verb', detail: "you aren't mounted"}` — heard, bound and
  gated, which is *afford statically, decline diegetically* working. Only
  `command-rejected` means nothing can hear the word. The file's
  `expectUnderstood` draws that line and says why.
- **A verb unknown in the WRONG ROOM is the doctrine working.** `bake`
  answered `unknown-verb` at the hearthworks cookhouse (an oven, no dough
  trough) and `mill` at the wharfside mill (which is a TEXTILE mill).
  Both correct; the drive was standing in the wrong place. *The
  instrument affords the verb* means a drive has to go where the
  instrument is.
- **`feed` is the COMPOST verb**, conferred by `CultivableMixin`. The
  requirements' English ("feed the canary") is not the game's vocabulary
  — the acts are `offer <food> to <animal>` and putting food in a
  `Feeder` for the `feeds` brain to find.
- ⚠⚠ **An unanswered prompt poisons the whole session**, and this file
  learned it TWICE, at a cost of 13 checkpoints and then 4. A bare noun
  target can raise a disambiguation prompt; `me:i:watch` cannot. Every
  object target is scoped now and every state read is a QUERY rather than
  prose.
- **Three apiculture checkpoints failed on a second run and passed on a
  fresh DB** — the file's own `.dirty.` reason says it cannot run twice.
  Verified by dropping the DB rather than assumed.
- ⚠⚠ **And the drive caught a regression THIS BUILD caused**, which is
  the collision question arriving as a wedged test instead of as a
  paragraph. W3 hung the ox book and the hen book in the farmstead yard
  beside the shipped flock book, and all three carried `book` and
  `register` — and the hen book carried **`flock`**, because a flock of
  hens is perfectly good English. So `look flock book` matched two
  things, raised a disambiguation prompt, and wedged the carcass-chain
  drive's session: **22 of its checkpoints failed to one cascade.**
  Narrowed to `[henbook, "hen book", hens, chickens, poultry]` and
  `[oxbook, "ox book", oxen, team]`, with the reason in both rows.

  ⭐ Stated honestly: in PLAY this was never a defect. A disambiguation
  prompt is a designed feature — the game asks which one and the player
  answers. What it breaks is a test, which cannot answer. ⚠ But the
  content polish is real either way: a hen book should not answer to
  *flock* while the sheep register is hanging next to it, and *"which
  existing objects does this touch, and who already lives there?"* is the
  question the requirements phase asks for exactly this.

  ⭐ A gate is tempting and is NOT built: *two props in one room sharing a
  keyword* is derivable from the rows, but it would flag a designed
  behaviour, and the realm is full of legitimate shared keywords (every
  room with two chairs). The honest finding is the test hazard, and it
  belongs with the drive discipline above.


Then: `pnpm test` once; push; open the MR against `master`.

---

## Reachability wiring

The five links — verb · affordance · data · boot · arg gate — for each
new capability. This build's own subject, so it is exhaustive.

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| `walk` | `platform/cmd/movement/walk.yaml` exists; `WalkController` row exists | `MobileMixin.self` (W2) | mode row `LocomotionMode/walk.yaml` (`enablementMixin: null`) | mode roster warmed by path glob already | `target` `requires: any`, `canReach` |
| `dismount` | view + controller exist | `PosedMixin.self` (W2) | targets: `/platform/agent/DraftAnimal` rows (`draft-horse`, `pit-pony`) | cast where they are | validators `requiresPosed`/`requiresSlottable`/`requiresMounted` — no object arg |
| `fold`/`unfold` | views + controllers exist | `FoldableMixin` env+peers (W2) | `camp-chair.yaml` propped at `crossing.yaml:123` | the crossing boots with the avenue | `target` `requires: FoldableMixin` |
| `wind`/`adjust` | locality views + controllers (`WindController`, `AdjustController`) exist, with controller rows | `Watch` inventory+environment (W2) | Gus's watch (code-placed) + the vended `general-store/thing/pocket-watch` (W2) + its stock line + price | the general store is warmed (its standup test asserts it) | `requires: any`; the `MechanicalMovement` check is controller-local and declines intelligibly |
| `prompt` | view + controller exist | `HasInteractiveMixin.self` (W2) | none | none | `requiresHasInteractive`; subcommand `cancel` |
| `transfer`/`subdivide` | views + controllers exist | `PersonaMixin.self` (W2) | a parcel the player holds (`AccessApi.heldExtents`) | the parcel registry | `transfer.recipient` `requires: class:Agent`; authority via `AccessApi.can` in the controller — the drive asserts the refusal is `controller-rejected`, not a validator |
| `swim` | view + controller exist | `swim.yaml` is in no static today; the HOST (`OpenWater`) confers it `environment`+`peers`, exactly as `Ladder` confers `climb` — the mover affords nothing for the three enablement modes (W2) | `OpenWater` class (new) + `estuary/thing/open-water` row + four `props:` lines; six exits already `media: [ground, water]`; `biped.yaml:56-59` has `swim` | the estuary rooms are singletons booted with Terminus; `lint:census` proves the props resolve | `target` `requires: any`, `canReach`; the media gate refuses a dry exit before enablement |
| the gate | — | — | `scripts/check-reachability.ts` + `package.json` script | the derived roster (`lint:family`) | the fixtures prove each arm fires |
| `unreachable:` | — | — | read by the script only; dropped by `PackLogic` before Mongo | n/a | n/a |
| ox-book | `draft` (`Herdbook` env+peers, `Herdbook.ts:70-74`) | already | `farmstead-yard.yaml` props (W3) | `hearts-delight/pack.yaml` warm line (W3) — *a prop nothing warms is a prop that is not there* | `draft`'s own |
| aqueduct + house | `look` | — | `bank.yaml` props + details (W3) | the bank is a singleton; `Feeder/terminus-main.yaml` cites the house | — |
| jar of honey | `buy` | `Stock` | the `extends:` child + line + price (W3) | the store | `buy.thing` greedy (W1) |
| hen cuts | `butcher` (trade-cooking) | already | `domesticus.yaml` yield (W3); a hen in the world (Risks) | the species is warmed where the herdbook is warmed (`pack.yaml:64-75`'s own warning) | — |
| hopper → canary | `feed` | already | hopper stock line + price; a seed food (D18) | the drift is Rejection's | `feed`'s own |

---

## Acceptance-criteria coverage

| AC | wave(s) |
|---|---|
| 1 — walk / dismount / fold / unfold / wind / adjust / cancel / subdivide / transfer / swim | W2 (+W5 proves) |
| 2 — lock, unlock, fly still unknown; reason written where the next person looks | W2 (`unreachable:` on the views) + W4 (§ L9, boundary.md) |
| 3 — every promised verb usable or recorded; no third category | W0 (arm A) + W2 (zero) |
| 4 — buy a dog loaf, an orange seed, a mana cell bare | W1 (+W5). *mana cell* is a general-store line (`counter.yaml:184`, price `:329`) and `mana-cell.yaml:16` carries the two-word keyword `"mana cell"` — the drive buys it bare in step 9's company |
| 5 — where quoting is the answer the help says so | W1 (`mill.yaml`, and the three converted views say both forms work) |
| 6 — no refusal names an unmentioned counter/shelf/instrument | W1 (the default is no longer discarded) + W5 step 13 |
| 7 — oxen draftable; canary eats; dye at home; spin by hand; hen → cuts; aqueduct standing; jar has honey | W3 (+W5). ✅ the hen clause is covered — the `hen-book` row is authorized (D22) |
| 8 — the apiculture chain end to end | W5 (apiculture file, the appended tail) |
| 9 — every thing reachable, declared or gone; a reviewer can tell by reading the row | W0 (arm R) + W3 (zero) |
| 10 — a dead view, a second claimant, a one-token phrase slot cannot merge silently | W0 (arms A, G) + `lint:verb-collisions` (existing) |
| 11 — no doc asserts a dead verb works; the locomotion recipe includes the step | W4 |

Unmapped: **nothing.** Every clause of every criterion maps to a wave.
AC 7's hen clause was the one gap at plan time and D22 closed it.

---

## Test & gate strategy

- **Unit (kernel):** the gate's fixture test (positive assertions, one
  per violation class); the `unreachable:`-key-loads test; `OpenWater`
  over synthetic fixtures; the retail binder test; the `walk` entry
  visible in `Mobile`'s affordances (extend an existing affordance
  test, do not add a controller test — controller tests cannot see
  this).
- **Unit (packs):** `trade-baking` bake binder test; `trade-ranching`
  hen dress-out mass test (D14); `terminus` watershed test rewired to
  the bank's props; `terminus` crossing test unchanged.
- **The three tests that could not fail** are fixed in W2/W3 as named;
  the fourth (carcass step 16) in W4.
- **Only the drive can prove:** that the verbs are reachable from a
  real body in a real room; that `buy dog loaf` reaches the loaf
  through `Stock.resolveBuy`; that the oxen can be drafted, the canary
  fed, the aqueduct seen; that no floor hand throws. The wire drive is
  the build's exit criterion and is written to fail: UNDERSTOOD + STATE
  CHANGED on every step, never "not refused".
- **Gates:** every wave ends with `pnpm -C packages/server lint:family`
  green. `pnpm test` runs exactly once, before the MR opens, and once
  more at `/finalize`. A green run stays valid until a source file
  changes — check with the `git status` filter in `CLAUDE.md` before
  re-running.
- **The wire runs:** `WIRE_BOOT=1 WIRE_PORT=2014 WIRE_FRAME_TIMEOUT=60000
  pnpm -C packages/wire exec vitest run tests/reachability.dirty.wire.test.ts`
  and the apiculture file likewise. One world per file. `dev:server`
  kills a sibling on any port — use the wire boot, not `pnpm dev`.

---

## Risks & opens

- **✅ The hen — RESOLVED, authorized 2026-10-07.** See **D22**. No
  longer a risk: the `hen-book` row ships, drive step 19 is a live
  checkpoint rather than a unit test, and AC 7's hen clause is met
  rather than recorded unmet.
- **✅ The canary's food — authorized 2026-10-07** alongside the hen.
  D18's conditional branch is now unconditional if no reachable seed
  food exists: the general store gains the `birdseed` row. Content
  only. ⚠ Still verify first whether an existing reachable food already
  satisfies a herbivore from a hopper — if one does, stock nothing and
  say so in the commit.
- **The distributor counter (D15).** The survey's cause is wrong; the
  plan names two suspects and the boot log decides. If neither is it,
  the build records what the log says and does not guess.
- **Arm R's W0 figure.** The survey's 66 and this cycle's 79 differ by
  test-only and prefix-only references; the arm's own number is the one
  that counts, and the W0 commit records it. If the arm finds rows the
  Grounding does not list, the build triages each by the same three
  dispositions — place, declare, delete — and says so in the commit.
- **The faucet/citation lists are a declaration.** A path-valued field
  the lists do not know is a FINDING, so the first run may surface
  fields to classify (`stocks`, `yieldRow`, `trapTemplate`, …). Classify
  them in W0 with a reason each; never silently default.
- **`lint:lib-statics`** may count `FoldableMixin`'s new static.
  `PosedMixin`'s identical static is the precedent: whatever
  classification it has, Foldable's gets the same. No ceiling rise.
- **The subdivide/transfer drive step** needs ground the test character
  holds. Use the founder session the other dirty drives use (the
  `FOUNDER_*` memory note) and `AccessApi.heldExtents`; the second
  player accepts the transfer.
- **`Login` + `prompt`:** harmless and correct, but verify the enroll
  machine's prompts are what `prompt cancel` cancels there (a quick
  read of `PromptController`).
- **Greedy `buy` and `2 torches`?** Not a shipped grammar; `buy`'s
  quantity is not an arg. No change.
- **In-flight builds.** Do not touch `lib/maturation/Maturing.ts`, the
  air Reserve, `Species.ts` (the hen change is a ROW in
  `trade-ranching`, not the class), `MaturationProfileCatalogue`, or
  `KNOWN_COLLISIONS` (`dip` is the glass build's).
- **`Gus.ts` naming a locality's rows from the kernel** — a boundary
  smell found on the way; recorded in the MR, not fixed here.

---

## Deferred seams

- **The `stocks:`-keyed and `censusKey` population mechanism as a
  catalogue** — arm R's `--list` prints every census-drawn row with its
  key and target, which is the derived catalogue the magic pack never
  had. Nothing further; `magic-items-slate` owns the potion faucet.
- **Singleton-claimed-once gate** — the honest general gate for the
  distributor class of bug is *a path read as a singleton is claimed by
  exactly one `props:`*, which needs constant resolution. Note for
  `docs/slates/tails/affordance-verb-slate.md` (one paragraph under its
  open questions), not a gate here — most duplicate `props:` claims are
  legitimate (a works-board in twelve yards).
- **`KNOWN_COLLISIONS` → `unreachable:`-style per-view dispositions** —
  the same carrier could absorb the collision allowlist later (a
  shadowed view declaring `shadowed-by:`). Not now; the glass build is
  in that file.
- **Help rendering positional `description:`** — `getHelpText()`
  renders option descriptions only; a positional's `description` is
  dead surface. One line in the command-spec doc's phrase ladder
  section; a future build may make it render.

---

## Critical files

Read first, in this order:

1. `docs/requirements/reachability-sweep-requirements.md`
2. `docs/subsystems/command-routing.md:370-425` and `:1745-1775`
3. `docs/lint-family.md:30-110` and `:1382-1420`
4. `packages/server/scripts/pack-roots.ts` (the readers), then
   `scripts/check-template-census.ts:1-140, 660-700`,
   `scripts/check-verb-collisions.ts:1-120`,
   `scripts/check-arg-kinds.ts:1-125`, `scripts/check-unconsumed-seams.ts:1-60`
5. `packages/server/src/mud/platform/idea/api/PackLogic.ts:950-980,
   1240-1292, 1570-1620` and `platform/idea/TemplateApplier.ts:108-250`
6. `packages/server/src/mud/platform/thing/Ladder.ts`,
   `lib/locomotion/Swimmable.ts`,
   `platform/idea/api/LocomotionLogic.ts:225-310, 480-560`,
   `platform/idea/cmd/movement/LocomotionControllerBase.ts:95-135`
7. `lib/spatial/Mobile.ts:215-245`, `lib/character/Posed.ts:150-170`,
   `lib/character/Persona.ts:130-165`, `lib/slot/Foldable.ts`,
   `lib/connection/HasInteractive.ts`,
   `packages/content/terminus/src/university-avenue/thing/{Watch,Whistle}.ts`,
   `lib/time/MechanicalMovement.ts:1-40`
8. `lib/command/CommandDefinition.ts:640-730`,
   `platform/idea/api/CommandLogic.ts:2369-2570`,
   `platform/idea/cmd/perception/__tests__/look-search-views.binder.test.ts`
9. The content rows named in Grounding § Cluster C, and
   `packages/content/terminus/content/world/terminus/general-store/counter.yaml`
10. `packages/wire/src/harness/{index,assertions}.ts`,
    `packages/wire/tests/apiculture.dirty.wire.test.ts`,
    `packages/wire/tests/carcass-chain.dirty.wire.test.ts:1125-1170`,
    `packages/wire/tests/world-scan.dirty.wire.test.ts:175-205`

---

## Drive record

Run on `WIRE_PORT=2014`, each on a **freshly dropped DB** (these files are
`.dirty.` and say so):

```
tests/reachability.dirty.wire.test.ts       22 passed (22)
tests/apiculture.dirty.wire.test.ts         21 passed (21)   [+ the step-23 tail]
tests/carcass-chain.dirty.wire.test.ts      32 passed | 2 skipped (34)
```

`lint:reachability` on the same tree:

```
check-reachability: ok — 301 view(s) (0 unconferred, ceiling 0);
  670 thing row(s) (0 unreached, ceiling 0);
  6 phrase-shape view(s), ceiling 6;
  106 article-shape arg(s), ceiling 106;
  71 unnameable good(s), ceiling 71.
```

⚠ `lock`, `unlock` and `fly` are named by `--list` as
`declared awaiting:base-class-narrowing-slate`, and drive step 8 asserts
as a POSITIVE that all three still answer *"I don't understand"* — an
absence nobody records reads as somebody's oversight.

### The ledger of runs — and what each one bought

| run | result | what it found |
|---|---|---|
| 1 | 9/22 | ⛔⛔⛔ **`buy` broken for every good at the general store** — `expected singleton, found 3` out of `BuyController`, on a fresh boot. Three different cloners of one counter path. |
| 2 | 9/22 | A wedged session: `look watch` raised a disambiguation prompt (`watch` is also a verb), and the unanswered prompt poisoned **13** later checkpoints. Also: `subdivide` takes a NAME, not a path. |
| 3 | 19/22 | The counter fix cleared every buy. `feed` is the COMPOST verb; `bake` and `mill` were being typed in rooms without their instruments. `buy drop spindle` → *"the shelf is bare"*, falsely. |
| 4 | 18/22 | `look hopper` wedged the session — the same lesson, a second time, 4 checkpoints. |
| 5 | — | A shadowed `const` broke the file's transform. |
| 6 | 21/22 | An assertion of mine: the vat PRINTS as *"dyeing pot"*. |
| 7 | **22/22** | — |
| 8 | **22/22** | After the herdbook work: two farmstead reads were light-dependent, and one was **vacuous** — it matched the FLOCK book's name while claiming to prove the ox book's. Both are queries by the row's own name now. |

⭐ Three of the eight runs went on the drive's own instrument rather than
on the game. The two that did not — runs 1 and 3 — between them found a
kernel defect, two brain defects, a roster-tick defect that put the
shopkeeper inside the till, and a 71-row content census. **That ratio is
the argument for driving:** the suite was green through every one of
them.

### ⚠⚠ What the FULL SUITE then found — two of mine, both load-bearing

The suite runs once before the MR, and it earned it.

**1. `say "hello world"` must keep its quotes, and my binder rule broke
it.** `command-assembly.test.ts > keeps quotes literal inside the greedy
slice` asserts `say "hello world"` → `"hello world"`, **with the
punctuation** — and that test is right: if you say *she said "no"* you
want the quotes in your speech. W1's rule unquoted a lone quoted token on
ANY greedy field, which is too broad.

⭐ The discriminator is the phrase ladder's own, and it is structural:
a **BOUNDED** greedy field (rung 1 — one the grammar stops with a later
field's `prepositions:`) holds a NAME, and quoting it means *treat this
phrase as one argument*; a **TRAILING** greedy field (rung 2 — `say`,
`tell`, `press post`) is free text and the quotes are content.
`collectLaterPrepositions` is the test, and deliberately so: whether the
grammar CAN bound the field, never whether the player used the boundary.
⚠ My own greedy-quoting test had asserted the trailing case; it asserts
the correct rule now, with the `say` behaviour pinned beside it.

**2. `Login.verbs.test.ts` asserts its `self` bucket EXACTLY** — *"and
nothing else"* — so `prompt` arriving via `HasInteractiveMixin` failed
it. ⭐ The addition is right and the test's expectation moved: the enroll
machine is built out of prompts, and the one moment a player most needs
to dismiss a stuck question is before they have a body. A `prompt cancel`
that worked only after `embody` would be the hatch locked on the inside.
The test now carries that reasoning, because it is the record of what the
pre-world phase may say.

⭐ Both failures are a test doing exactly the job the file was written
for, and neither was reachable from `test:near`. 12,918 server tests,
1,003 client; two failures, both mine, both fixed with the reason written
down.

⚠⚠ And the carcass-chain file had to be run four times before it was
green, for a reason that is this build's doing: W3 hung two more
herdbooks on the farmstead shelf, and three of that file's reads said
`look flock book`. `look`'s matcher scores loosely across near-identical
records, so the read raised a prompt and 22 of its checkpoints went down
in one cascade. ⭐ Narrowing the keywords did not fix it and renaming the
display names did not fix it — **measured, with the props removed as the
counterfactual.** The prompt is correct behaviour; the loose read was
the defect, and all three are scoped to `here:i:flockbook` now.
