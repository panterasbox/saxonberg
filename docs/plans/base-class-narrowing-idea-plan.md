# Base-class narrowing, phase 2d — the Idea branch

Addendum to [base-class-narrowing-clusters-plan](./base-class-narrowing-clusters-plan.md)
and [base-class-narrowing-agent-plan](./base-class-narrowing-agent-plan.md)
on branch `build/narrowing` (MR !303). Cites the CROSS-BRANCH decisions
D1–D9 and the Agent plan's E1 without re-arguing them. Its own decisions
are numbered **I1…I12**; its waves **N0…N6** (a wave letter distinct from
the decision letter so that `I3` can only ever mean one thing). Written at
`44f0036d6`; every file fact below was taken by opening the file this
cycle. ⚠ The Location branch is being planned in parallel: this plan
touches nothing under `lib/stuff/Location.ts`, `platform/location/**`,
`location.md`, `ground.md` or `furnishing.md`. Zones are this plan's
(I6).

⭐ **The headline, stated first because it is the honest answer:** the
Idea branch needs **no rung and no root change**. Its root is
`class Idea extends Stuff {}` with nothing to strip, and the owner's
question — *who is addressable by keyword* — has an answer the code
already gives: **nothing on this branch is addressed by keyword**, so
no class decides it (I2). What the branch DOES carry that is false is
smaller and sharper: **seven singleton reference classes claim a
per-instance runtime property bag they can never use** (I5), and three
modality classes are empty bodies over one base (I8). That is the
build. The rest of this document is the evidence that it is all of it.

---

## The waves at a glance — start at N0

| wave | one line | ends at |
|---|---|---|
| **N0** | `PropertiedMixin` off `Material`, `Species`, `BodyPlan`, `Clade`, `Condition`, `LocomotionMode`, `Modality` (I5); the one test that pinned the shape inverted; `race.md § PropertiedMixin` rewritten | `build(narrowing N0)` |
| **N1** | one `platform/idea/modalities/Modality` twin; `EmotiveESPModality`, `TasteModality`, `VerbalESPModality` retired and their three rows re-pointed (I8) | `refactor(narrowing N1)` |
| **N2** | docs: `Idea.ts`'s six-branch docstring, `Condition.ts`'s *"ZERO content ships"*, `zone.md` + `Zone.ts`'s stale `lib/spatial/` paths, `topics.md`'s stale `lib/messaging/Topic.ts`, `senses.md`'s per-modality-class claim; wiki page `propertied.md` (I11) | `docs(narrowing N2)` |
| **N3** | the drive, part I (after part H) | `drive(narrowing N3)` |
| **N4** | the composition census re-run and its delta | `tools(narrowing N4)` |
| **N5** | the slate: I4's `stash`-for-exits note, I7's reference-Idea roster, I9's lock/unlock reconciliation, I10's affordance census | `slate(narrowing N5)` |
| **N6** *(optional — the coordinator's call, cross-branch)* | `lint:afforded` — census-then-ratchet over command views no `commandContributions` names, ceiling 12 (I10) | `lint(narrowing N6)` |

Every wave lands green on `lint:family` + `pnpm test:near` + each touched
pack's vitest; `pnpm test` once before the MR returns to review.

---

## Grounding

### The root, and what the branch actually is

- `lib/stuff/Idea.ts:20-37` — `export class Idea extends Stuff` with a
  constructor and `toString()`. **No mixins.** There is nothing to strip
  and nothing for a sibling rung to regain. ⚠ Its docstring (`:1-13`)
  says *"One of the six top-level branches sitting on Stuff (Thing,
  Location, Idea, Agent, Vessel, Shadow)"* — `Vessel` has not been a
  branch since `architecture.md:820-838` drew five, and the same
  paragraph calls `Thing` *"item-scale movable"*, which D13 made false.
  The root's own doc lies about the tree it roots — the tell already
  written down (N2).
- `lib/stuff/Stuff.ts:1056-1105` — the branch allowlist admits
  `lib/stuff/{Thing,Location,Idea,Agent,Shadow}`; every Idea-branch
  class traces through `lib/stuff/Idea`.
- **The census, re-run this cycle** (`scratchpad/idea-matrix.json`,
  `pnpm -C packages/server composition-census --json`): 460 classes with
  a `/idea/` path segment, 1106 rows, zero load failures. Of the 460:
  **296 are controllers** (`<root>/idea/cmd/<category>/<Name>Controller`,
  exactly one row each — the row `lint:controller-rows` requires), and
  **164 are everything else, holding 810 rows.** No `*Logic` singleton
  appears at all (no row names one; they are minted by
  `StuffApi.singleton`). See I1.
- The 164, by composed mixin set (`queryMixins`, the real chain): 48
  `PostRegistration` only (catalogues, registries, wardens — one row
  each) · 40 `Singleton` only (17 `Reading` rows, `CartesianZone` 57,
  `MaturationProfile` 15, `Placement` 3, `Fabric` 5, `Dyestuff` 3,
  `CombatFormation` 4, five warrens) · 31 with **no mixin at all**
  (`Discipline` 73, `Topic` 38, `QuantityMarshaller` 31, `Spell` 19,
  `HelpConcept` 11, `FolderZone` 9, `Brand` 8, `Operation` 5,
  `WikiNamespaceZone` 5, `Corpo` 5, `Government` 4, `Lane` 4,
  `Watercourse` 4, `ServiceRoute` 2, the rest 1) · 11
  `Propertied+Singleton` (`Species` 74, `Condition` 31, `LocomotionMode`
  11, `BodyPlan` 6, `Clade` 4, seven `*Modality` at 1 each) · 9
  `Concealable` (`Exit` 5, `SandboxCrossingExit` 2, six pack `*Exit`
  subclasses at 1 each) · and 4 `Perceptible+Propertied+Singleton`
  (`Material` 94, `ConsumableMaterial` 70, `RadioactiveMaterial` 1,
  arcana's `PotionMaterial` 3, the last two adding a capability mixin).
  Everything else is a singleton with one or two capability mixins
  (`Business` 34 + `CarrierBusiness`, `Organization` 14, `Locality` 14,
  `Biome` 4, `SkyExposedBiome` 4, `Deposit`/`GroundCharacter` 3 each,
  `HoldingWarren` 3, two `Registrar` registries, four `AetherHosted`
  update Ideas, `Party` 1, `DomainHook` 1).
- **Zero-authoring layers with an authorable field**, the whole list:
  `ConcealableMixin` on the nine exit classes (14 rows) — I4;
  `SpatialZone` on `SphericalZone` (1 row) — I6; `RegistrarMixin` on
  `FisheryRegistry` / `HerdRegistry` (1 row each) — the requirements
  doc's own ⛔ (*"DO NOT DELETE … live and gates three shipped verbs"*),
  reading 3, cited not re-argued; `Party` (1 row; every field is minted
  by `muster`, `Party.ts:1-30`) — reading 3.

### The one mixin nobody can see: `PropertiedMixin`

- `lib/stuff/Propertied.ts:1-40` and `:458-459` — a runtime property
  bag; its one persistent field is `savedProps` (`runtimeState: true`,
  never authorable). So it shows in the census with **no authorable
  field and zero authoring everywhere**, and `mixin-census` reports it
  `views 0 · ctrl 0 · inRows 0` (run this cycle). The instrument is
  blind to it in both directions; the evidence below is `grep`, per D1.
- **Composers in the whole tree** (`grep -rl "PropertiedMixin("` over
  `server/src/mud` + every pack's `src/`, tests excluded): `Creature`
  (Agent branch — keeps it, E1 does not touch it), `platform/thing/Beacon`
  (Thing branch — not this plan), `EventRegistry` (reads its own bag,
  `api/event.ts:409,534`), and **seven Idea singletons**:
  `lib/material/Material.ts:135-136`, `platform/idea/species/Species.ts:404-405`,
  `platform/idea/species/BodyPlan.ts:165`, `platform/idea/species/Clade.ts:43`,
  `platform/idea/Condition.ts:1604-1605`, `platform/idea/LocomotionMode.ts:77`,
  `lib/perception/Modality.ts:93`. Through inheritance the seven carry
  `ConsumableMaterial`, `RadioactiveMaterial`, arcana's `PotionMaterial`
  and the seven `*Modality` classes — **sixteen row-named classes, 301
  rows** (94+70+1+3 + 74 + 6 + 4 + 31 + 11 + 7).
- **Every runtime writer or reader of a prop, and its receiver**
  (`grep -rn "\.getProp(\|\.setProp(\|\.hasProp(\|\.initProp(\|\.maskProp("`,
  tests excluded): `BankingLogic.ts:1147,2975` — `member`, a person
  (`circleProp(corpoKey)`, the one production key `CLAUDE.md` names);
  `lib/locomotion/{Climbable,Flyable,Swimmable}.ts:66-73` — the `actor`;
  `lib/slot/Drivable.ts:160` — the slot occupant (`ROLE_PROP`);
  `api/event.ts:409,534` — the `EventRegistry` itself. **Not one targets
  a material, a species, a body plan, a clade, a condition, a locomotion
  mode or a modality.** Inside the seven class files: no `Prop` mention
  outside the import.
- **Narrowings** (`grep isPropertied(`): `BankingLogic` ×2 (a member),
  `Drivable.ts:159` (an occupant), and `api/mql/resolver.ts:1522`
  `readProp` — the `[prop.x = …]` predicate, which answers `undefined`
  for a non-Propertied Stuff and `undefined` for a Propertied Stuff with
  no such prop. Identical outcome either way for the seven.
- ⭐ **The tell already written down.** `docs/subsystems/race.md:268-292`
  gives the reason the four (`Material`, `Species`, `BodyPlan`, `Clade`)
  compose it: *"The deferred combat / mechanism-of-injury system's
  per-material damage resistance is the motivating example — keys like
  `resistance.slash` are content-defined … Illustrative — the convenience
  accessors were removed until combat lands."* Combat landed, and
  materials-response shipped resistance as **first-class fields and
  grids** (`docs/subsystems/materials-response.md:1-30`; `Material.ts:250-300`
  declares hardness, toughness, conductivity as `Quantity` fields). The
  motivating example was built the other way, and the mixin it motivated
  stayed. `Condition.ts:1598-1602` says the class is *"resolved by
  `findByTemplatePath` like Materials / Species"* — it copied the shape,
  including the bag.
- **The test that pins the shape:** `lib/material/__tests__/Material.test.ts:170-174`
  — *"composes SingletonMixin and PropertiedMixin"*, asserting
  `isPropertied(m) === true`. The only test in the tree that asserts
  Propertied on any of the seven (grep over every `__tests__` beside
  them).

### `PerceptibleMixin`, and who is addressed by a typed word

- **Composers on the Idea branch** (`grep -rl "PerceptibleMixin("`,
  whole tree): `lib/material/Material.ts` and nothing else. `Species`
  composes `VisibleMixin` (`Species.ts:404-405`; 36/74 rows author a
  description — the species' generic appearance, `:798-802`) and carries
  a bespoke `commonNames: string[]` (`:411`), not keywords.
  `HelpConcept.ts:35-75` declares its own `keywords` field — *"Typeahead
  corpus"* — with no mixin; `lib/craft/Recipe.ts:142` is not a Stuff at
  all and declares `keywords` for the order/serve verbs.
- **What MQL pools.** `api/mql/resolver.ts:730-780`
  (`candidatesForScopePart`): the seeds are `here`, `inventory`, `peers`,
  `reachable`, `person`, `online`, `world`, `me`, a `/path` glob and a
  `#stuffId`. An Idea enters a candidate pool **only** through `world`
  (the whole registry) or a path glob — never through the scopes a
  player's verb declares (every shipped view: `reachable`, `$focus`,
  `peers`, `inventory`, `person`, `here`; `grep "scope:"` over
  `packages/content/**/cmd/**` finds no `world` and no `/` glob).
- **How an exit is addressed.** `api/mql/scope-walk.ts:70-92` and
  `resolver.ts:686-720`: the candidate for `go north` / `open north` is
  **the location** with `name: direction, keywords: [direction],
  via: { exit }`. The `Exit` itself is never a candidate and has no
  keyword surface; `LockController.ts:1-12` says it plainly — *"a
  direction match (`lock north`) where the door is fetched from
  `via.exit.getDoor()`"*. `open oak door` matches the **Door** (a
  `Thing`, `platform/thing/Door.ts:71`, `Perceptible` via `Boundary`).
- **How a spell, a topic, a discipline, a reading are addressed:**
  `arcana/…/cmd/magic/cast.yaml` — `spell: { type: string }`;
  `platform/cmd/system/help.yaml` — `topic: { type: string }`;
  `perception/analyze.yaml` — `channel: { type: string }` and a
  `subject` that is a reachable **Thing**. Catalogue lookups by key, not
  MQL. `Discipline.ts:16-22`, `Corpo.ts:12-17`, `Government.ts:13-18`,
  `Operation.ts:14` each say *"`key`, not templatePath, is the durable
  join"*.
- ⭐ **Why `Material` has keywords at all** — `docs/subsystems/race.md:139-146`:
  *"The keywords let a bulk holder be addressed by what it holds (`drink
  coffee`) … `Material` deliberately does not compose `Visible` /
  `Named` — substance identity stays out of the perception-target
  machinery, so material keywords never leak into room scope."* The
  readers agree: `lib/craft/BlendIdentity.ts:105-106`,
  `CraftingLogic.ts:2010`, `platform/thing/Bottle.ts:73` (the bottle's
  keyword is its material's), `RecipeCatalogue.ts:108`. A material's
  keyword is **borrowed by the good made of it**; the material itself is
  never the target. 167 of 168 rows author one because every material is
  something a thing can be made of and named for.
- **Arg gates:** `grep -rhn "requires:"` over every view: no clause
  names `PerceptibleMixin`, `PropertiedMixin`, `SingletonMixin` or any
  Idea-only mixin. The five clauses naming a non-Thing/Agent mixin are
  `CultivableMixin` ×5, `SealableMixin` ×2, `LockableMixin` ×2,
  `SwitchableMixin` ×1 — all composed on Things or Locations.

### `ConcealableMixin` on the exit family

- `lib/boundary/Exit.ts:192` — `Exit extends ConcealableMixin(Idea)`;
  the twin `platform/idea/Exit` and eight subclasses (`SandboxCrossingExit`,
  residence's `FrontDoorExit`/`KeyedDoorExit`/`LotGateExit`/`UpstairsExit`,
  transport's `FordExit`, Duncan Hall's `DormDoor`/`FloorStairExit`)
  inherit it. 14 rows, 0 authoring — **every one of those rows is an
  exit KIND** (`/platform/idea/exits/passage`, `/stuff/idea/exits/archway`,
  `stair`, `vessel-in`, …), a hydration source for defaults (`Exit.ts:194-201`:
  *"a kind template's authored defaults hydrate onto a fresh clone
  before `bind()`"*).
- ⭐ **Where a concealed exit IS authored:** on the ROOM, inline.
  `newbie-wilds/…/delve/corridor-1.yaml:37-40` (`east: { destination:
  …/vault, concealment: hidden, hint: … }`), `corridor-2.yaml:39`,
  `saxonberg-lounge/…/lounge/location/bar.yaml:101`. `lib/boundary/Exitable.ts:241-246`
  declares the inline field and `:681-682` writes it onto the minted
  Exit (`concealment: spec.concealment, concealmentHint: spec.hint`).
  Three secret ways in the world, and **the census cannot see any of
  them**: it reads rows by class, and the authoring surface is a
  Location row's `exits:` block.
- Runtime writers: `Exit.ts:396,609,611,702,704` (the clusters plan's
  grounding, re-verified). Test: `lib/boundary/__tests__/Exit.concealment.test.ts:26-31`
  asserts `hasMixin(exit, Mixins.Concealable)`.

### The zones

- `lib/zone/Zone.ts:49` `abstract class Zone extends Idea`; fields
  `name`, `wire`, `elevation` (`:57-60`). `lib/zone/SpatialZone.ts:29`
  `abstract class SpatialZone extends Zone` with the eight region fields
  (`:45-61`). Concretes: `platform/idea/location/CartesianZone.ts:29`
  `SingletonMixin(SpatialZone)`, `SphericalZone.ts:25` the same,
  `platform/idea/FolderZone.ts:31` `extends Zone`,
  `platform/idea/WikiNamespaceZone.ts:44` `extends FolderZone`,
  `platform/idea/HomeZone.ts:29` `extends Zone`,
  `platform/idea/species/Clade.ts:43` `SingletonMixin(PropertiedMixin(Zone))`.
- Authoring: `CartesianZone` 57/57 author `name`+`cellSize`, 8 author a
  region field, 57 author `elevation`; `FolderZone` 8/9 author
  `elevation`; `WikiNamespaceZone` 2/5 author `protection` (declared at
  `/wiki`, inherited — `WikiNamespaceZone.ts:29-32`); `SphericalZone`
  1 row (`rejection/…/hush.yaml`) authors no region field.
- ⚠ **The docs draw a tree that is not on disk.** `zone.md:5-8` and
  `Zone.ts:9-16` say `CartesianZone`/`SphericalZone` live in
  `lib/spatial/`, `FolderZone` in `lib/zone/`, `HomeZone` in
  `lib/home/`, `Clade` in `lib/species/`; the diagram at `zone.md:64-80`
  repeats it. All six are under `platform/idea/` (above). `FolderZone.ts:19-21`
  says *"Lives in `lib/zone/`"* about itself.
- A zone composes no `Container`, no `Containable`, no perceptual
  mixin; nothing addresses one by keyword; `Stuff.zone` is stamped by
  `ZoneApi.resolveZoneForPath` from template ancestry (`zone.md § Zone
  derivation rule`). ⚠ Cross-branch: the one Idea that composes
  `ContainerMixin` is residence's `HoldingWarren`
  (`content/residence/src/idea/HoldingWarren.ts:1-16`, *"the holding as
  a warren one level down"*), a `Warren` (`lib/location/Warren.ts:1-12`:
  *"a coordinator, not a containment tier"*). Noted for the Location
  planner; not this plan's to move.

### The modality classes

- `lib/perception/Modality.ts:93` — `class Modality extends
  SingletonMixin(PropertiedMixin(Idea))`, not abstract; `:1-16`: *"Each
  concrete modality is a subclass with its own seed YAML; subclasses
  override `signalAt` / `perceiveFor` as needed (contact + network
  modalities inherit the null defaults)."*
- `platform/idea/modalities/{EmotiveESPModality,TasteModality,VerbalESPModality}.ts`
  — each is `export class X extends Modality {}` and **nothing else**.
  Referenced by name nowhere outside their own file and row
  (`grep -rn` over `src/` and every pack). The four others (`Vision`,
  `Sound`, `Smell`, `Touch`) carry real overrides. Rows:
  `platform/content/platform/idea/modalities/{emotive-esp,taste,verbal-esp}.yaml`
  name the three by class path.
- The clusters plan (§ The instrument defect) handed these three, plus
  the empty `Biome`/`MaturationProfile` twins, to this pass.
  `platform/idea/Biome.ts:12` and `platform/idea/maturation/MaturationProfile.ts:8`
  are the sanctioned platform-twin shape (`CLAUDE.md § When a substrate
  class is also cloned generically, split it` — *sharing the name is the
  default*); each has rows and a `lib/` base. The three modalities are
  **not** that: their base is itself concrete and they are three copies
  of an empty body where one twin would do (I8).

### The naming candidates the coordinator named, from their files

- `Material` (94) / `ConsumableMaterial` (70):
  `platform/idea/material/ConsumableMaterial.ts:1-22` — *"no extra
  fields — the split is taxonomy, and the fence it enforces is the
  fixed-vocabulary rule."* `CraftingLogic.ts` is its one reader by name (the
  blend/plating path); the fence is the point. A child that inherits nothing it does not want and
  exists to be a fence is not the `DraftHorse` shape.
- `Species` / `BodyPlan` / `Clade`: an organism kind (`Species.ts`), an
  anatomy shared across kinds (`BodyPlan.ts:1-9`: *"humans, dwarves,
  elves, and orcs all share the canonical `biped`"*), a taxonomic
  FOLDER (`Clade.ts:1-8`, a `Zone`). Three concepts, three classes.
- `Corpo` / `Brand`: a firm and a mark that resolves to one firm *or
  none* (`Brand.ts:5-16`, the independent as the absence of an owner
  edge). Two.
- `Topic` / `HelpConcept`: a message-topic descriptor the cockpit
  renders (`Topic.ts:1-10`) and a player-facing concept entry
  (`HelpConcept.ts:1-30`). Two; both say so.
- `Business` / `Organization`: `Organization.ts:1-12` records the split
  and why (*"a thing that does not trade, pretending to"*). Right.
- ⭐ **The family that says the same sentence eight times:**
  `Discipline.ts:10-13`, `Spell.ts:4-7`, `Corpo.ts:5-9`, `Brand.ts:5-8`,
  `Government.ts:5-9`, `Operation.ts:4-7`, `HelpConcept.ts:22-30`,
  `Topic.ts:15-19` — *a pure-data leaf, read by the catalogue from
  `template.data`, never cloned as live Stuff, joined by `key`*. Eight
  classes, no mixin, no shared code, no shared refusal. See I7.
- `platform/idea/Condition.ts:1598-1601` — *"ZERO content ships — the
  class + field shape only; the catalog is a later wave."* 31 rows ship.
- `lib/boundary/Locked.ts:47` exports `LockableMixin` — the file is
  named for a state, not the mixin (`CLAUDE.md § File Naming`: `Propertied.ts`
  for `PropertiedMixin`). Its header (`:15-24`) calls itself *"⚠ STOPGAP
  — superseded by the real lock model … `lib/lock/` … At merge,
  reconcile toward `lib/lock/`: retire this mixin … Do NOT grow this."*
  See I9.

### Lock / unlock — the coordinator's finding, verified

- `platform/cmd/boundary/lock.yaml` / `unlock.yaml`: `target` is
  `reachable`, `requires: LockableMixin`. `LockController.ts:60-90`:
  resolves a `Lockable` (a `Door`), checks nothing else, calls
  `lockable.lock()`. **No key, no credential, no title.** The header
  says so: *"v1 carries no key/credential model … lock/unlock are
  minimal no-key verbs."*
- `grep -rn "'lock'\|'unlock'\|lock.yaml\|unlock.yaml"` over every
  `commandContributions` static in `src/` and every pack: **nothing
  affords either view.** `lib/spatial/Mobile.ts:224-241` affords `go`,
  `sneak`, `run`, `open`, `close`, `goto`, `teleport` on `self`.
- The real model: `lib/lock/Lock.ts:1-20` (`{ keyway, technology }`, a
  key opens iff a bearer entry matches), `content/residence/src/idea/KeyedDoorExit.ts:1-13,53`
  (traversal admits *"whoever presents a matching key"* via
  `CredentialApi.presentsKey`), `boundary.md:47-63` (*"Locking is not a
  Boundary concern — it's a credential check"*). `Exit.canTraverse`
  (`Exit.ts:857-870`) still reads the boolean on the door beneath.
- A `Door` is **not** in either room's `getContents()`
  (`lib/boundary/Boundary.ts:8-11`); it surfaces through a
  `BoundaryAnchor` fixture. So the `peers` bucket the Agent wave used
  for a cart cannot carry a door's verbs, which is why `open`/`close`
  sit on `Mobile.self` (`Mobile.ts:220-224`). Any affordance for
  `lock`/`unlock` would go beside them — and would hand every player in
  the game a keyless lock on every door they can reach.

### The instrument the acceptance reads through

- `lib/wiki/components/composition.ts:171,326,382-446` — forward panel
  (`kind="template"`) lists `_mixinName`s of the backing class; inverse
  (`kind="mixin"`) lists templates, or classes past 40 rows. Pages:
  `wiki-starter/content/wiki/main/oak.md` is a `template`-kind page over
  `/stuff/idea/material/wood/oak` — the forward panel of a **Material**
  already ships. No `propertied.md` exists; the inverse read needs one
  (I11).
- `packages/wire/tests/base-class-narrowing.dirty.wire.test.ts` — parts
  0, A–G (`:274-979`), 27/27; `declareFile` packs (`:54-71`) include
  `newbie-wilds` (the delve corridor with the hidden east exit),
  `wiki-starter`, `platform`. Helpers: `at()` (`:127`), `roomText()`
  (`:155`), `inverse()` (`:177-207`, positive-first, guards empty /
  truncated / failed), `feel()` (`:220`).

---

## Plan-level decisions

### I1 — controllers and logic singletons are out of scope; the branch in scope is 164 classes / 810 rows (IDEA-ONLY)

296 of the 460 are controllers: an `Idea` by construction
(`command-routing.md:122-124`, *"a fresh `Idea` per execution — no state
across"*), one row each because `lint:controller-rows` demands it, no
mixin, no field an author writes. A taxonomy pass over them is a pass
over the verb roster, which is `command-spec.md`'s and not this build's.
The logic singletons name no row and are invisible to the census by
construction. **The honest count is 164 classes and 810 rows**, and
within it the taxonomy question lives in about twenty classes: the seven
Propertied singletons and their subclasses (I5), the nine exit classes
(I4), the six zone classes (I6), the seven modalities (I8), and the eight
reference-data leaves (I7). The other ~120 are catalogues, registries,
wardens, readings and per-pack singletons with one row each and nothing
to decide — they go in the census table under a rule, not a list.

### I2 — no keyword rung: nothing on the Idea branch is addressed by keyword, and the branch is already the yardstick (IDEA-ONLY, ⭐ disagrees with the framing)

The owner's sentence — *"for the idea branch you may actually have some
subclasses for deciding who gets keywords and who doesn't"* — assumed a
population of keyword-addressed Ideas to partition. Grounded, there is
none:

- an **exit** is addressed by DIRECTION, as a sub-feature of the room
  (`scope-walk.ts:84-92`: the candidate's `stuff` is the location, the
  keyword is the direction, `via: { exit }`); its door, when named, is
  a `Thing`;
- a **spell**, a **help topic**, a **reading channel**, a
  **discipline**, an **operation**, a **corpo** are addressed by a
  STRING key through their catalogue (`cast.yaml`, `help.yaml`,
  `analyze.yaml`; every reference-Idea docstring: *"`key`, not
  templatePath, is the durable join"*);
- a **material** is never the target: its keywords are lent to the
  good made of it (`race.md:139-146`, `Bottle.ts:73`,
  `BlendIdentity.ts:106`), and it is kept out of room scope on purpose;
- a **zone**, a **catalogue**, a **marshaller**, a **controller**, a
  **species**, a **condition**, a **locomotion mode** are reached by
  path or id, and no player types their name at a verb.

MQL confirms it from the other side: no shipped view declares a scope
that would ever pool an Idea (`world` and path globs appear in no
`cmd/**` file), and no `requires:` clause names `PerceptibleMixin`.

**Ruling: no rung.** `PerceptibleMixin` stays exactly where it is —
`Material` and its three subclasses — and composes onto nothing else on
the branch. This is the worked example D8 already named: *"Perceptible
sits on the one Idea subclass that earns it, and every row uses it."* A
`KeywordedIdea` rung would have one composer and would claim a
targeting surface MQL does not offer. ⭐ The owner's instinct was right
in its second half (*"if the expected MQL targeting is like just
template paths or stuff ids, you don't need keywords"*) and that is the
whole branch.

**What composing `Perceptible` on `Material` claims, stated so the panel
is honest:** *a thing made of this can be called by this word.* True of
94 materials and 70 consumables; false of nothing that composes it.

### I3 — F2b ruled: no `Detailed` on `Material` (IDEA-ONLY; closes the clusters plan's open item)

The clusters plan recommended *no* (§ D8, § What remains open) and
carried it here. **Ruled no, on three grounds, all re-verified this
cycle:**

1. **Nothing reads a material's details.** `grep -rn "isDetailed\|getDetail"`
   over `lib/material/`, `platform/idea/material/`, `MaterialLogic.ts`
   and the `analyze`/`measure` path: none.
2. **A material has no parts to key.** `Detailed`'s payload is per-part
   material, per-sense text and a touch band off a temperature
   (D8's argument). A `Material` is not `Tangible`, has no material of
   its own parts, no temperature, no room to be sensed in
   (`race.md:143-146`: kept out of the perception-target machinery
   deliberately).
3. **The rule's own words.** *Detailed goes with Perceptible* was said
   about matter with keywords — *"has keywords"* was the owner's gloss
   for *is a thing you look at*. The precise form, which this ruling
   adopts, is D8's: **`Detailed` goes with `Perceptible` on MATTER**
   (the Thing, Agent and Location roots). `Material`'s `Perceptible` is
   a lending surface, not a perception surface, so the pairing does not
   apply to it.

Consequence: none in code. F2b closes. If a future build gives a
material named parts a player can `feel` (a grain, a weave — the
textiles chain's `Fabric` is the likeliest first consumer), that build
composes it on that class and cites this decision.

### I4 — `Concealable` on `Exit`: reading 3, kept (IDEA-ONLY; cites D3)

D3 named `Exit` as one of the three carriers (*"what can be a secret
way"*). The 14 rows / 0 authoring is the census reading rows by class
while the authoring surface is a **Location row's inline `exits:`
block** (`Exitable.ts:241-246`, `:681-682`; three secret ways shipped:
`corridor-1` east, `corridor-2`, the lounge bar's north). The exit KIND
rows (`passage`, `archway`, `stair`, `vessel-in/out`, the pack kinds)
are hydration defaults for a clone that is then `bind()`-ed to a room,
and a kind that authored a band would make every archway in the game
secret — so zero on those rows is the correct zero. Runtime writers
exist (`Exit.ts:396,609,611,702,704`), readers exist
(`LookController`, `SearchController`, `PerceptionLogic`), a test pins
it (`Exit.concealment.test.ts:26-31`). **Reading 3: behaviour with no
authored surface on the row the census counts.** No action. ⚠ The
instrument gap is worth one slate line (N5): a census of concealment
authoring must read `exits[*].concealment` on Location rows, or it will
report the exit family dead forever.

### I5 — ⭐⭐ `PropertiedMixin` off the seven reference singletons: reading 1 (IDEA-ONLY; the build's one narrowing)

**The claim.** Composing `Propertied` says *this object carries a
per-instance runtime property bag* — stat sheets, buffs, quest flags,
capability tokens (`properties.md:3-8`). It is composed on seven
singleton-by-templatePath reference classes: `Material`, `Species`,
`BodyPlan`, `Clade`, `Condition`, `LocomotionMode`, `Modality`.

**D1, all three legs:**

1. **No runtime writer targets one.** Every `setProp`/`initProp`/
   `maskProp`/`getProp` in the tree has a person, a slot occupant, an
   actor or the `EventRegistry` as receiver (§ Grounding). Inside the
   seven files, no prop is touched.
2. **No reader needs it there.** `mixin-census`: views 0, controllers 0,
   rows 0. The three narrowings are on a member, an occupant and MQL's
   `readProp`, which answers `undefined` for the seven either way.
3. **The concept is false of what the class IS.** A singleton reference
   datum is *shared by every holder*: `oak` is one instance for every
   oak thing in the world (`Material.ts:1-8`: *"reach the same singleton
   … observe identical physics"*). A per-instance bag on it is a
   per-WORLD bag on every oak — global mutable state hung on a
   vocabulary entry. That is not a use nobody has found; it is a use
   the class's own contract forbids. And the reason it was composed —
   `race.md:280-290`, per-material damage resistance as content-defined
   prop keys — was **built as fields instead** when materials-response
   shipped (`Material.ts:250-300`). The motivating example refuted the
   mixin.

**Verdict: reading 1 on all seven.** Every subclass loses it by
inheritance: `ConsumableMaterial`, `RadioactiveMaterial`, arcana's
`PotionMaterial` (the pack composes `ArcaneMixin(IdentifiableMixin(
PotableMixin(...)))` over the kernel `Material` — verify it does not
re-add `Propertied` itself: `grep Propertied packages/content/arcana/src/idea/material/PotionMaterial.ts`),
the seven modalities. 301 rows stop claiming a stat sheet.

**What stays.** `EventRegistry` (`api/event.ts` reads its bag),
`Creature` (Agent branch, the locomotion capability props and the corpo
circle flag), `Beacon` (Thing branch). Nothing on this branch composes
`Propertied` after N0.

**What the player would see if this were wrong.** Nothing — and that is
the answer to the coordinator's question. No verb gates on `Propertied`,
no MQL scope pools a material, and the only MQL read (`readProp`) is
already `undefined` on the seven. A wrong strip would surface nowhere at
the binder and nowhere at resolution; it would surface as a thrown
`getProp is not a function` inside whichever Api first tried to write a
prop on a material, which is the grep in leg 1 and is empty. **The
checkpoint that can fail is the panel** (N3 — `wiki oak` must render its
forward panel AND not say `Propertied`).

### I6 — a `Zone` is an `Idea`, the family is one family with two abstract rungs, and nothing moves (IDEA-ONLY; the cross-branch seam is unchanged)

A zone is a **scope of the template tree** with identity, inherited
fields and no presence: no container, no containable, no perceptual
surface, never in a room's contents, never addressed at a verb. That is
the definition of the branch (`Idea.ts:6-8`). Placing it on `Location`
would claim `Container`/`Adornable`/`Atmospheric` for a wiki namespace;
on `Thing` it would claim mass. **`Idea` is right.**

One family: `Zone` (name · wire · elevation) → `SpatialZone` (the eight
region fields) → `CartesianZone` / `SphericalZone`; and `Zone` →
`FolderZone` → `WikiNamespaceZone`, `Zone` → `HomeZone`, `Zone` →
`Clade`. Each rung carries exactly the fields the narrowest class can
mean something by, and `zone.md § What belongs on Zone itself` records
the two times a field was moved to make that true. The zeros:

| class | zero | reading |
|---|---|---|
| `SphericalZone` (1 row) | the eight region fields | **3** — a spatial zone that stocks nothing and claims no address is a zone with defaults; the fields are inherited through `lookupField`, and declaring them on `SpatialZone` is what lets the one Spherical row take them from `/world/terminus` |
| `WikiNamespaceZone` (2/5 author `protection`) | — | **3** — declared at `/wiki`, inherited by the namespaces (`WikiNamespaceZone.ts:29-32`) |
| `Clade` | `PropertiedMixin` | **1** — I5 |

No rung is missing (the abstract pair IS the rung structure), no class
is on the wrong one, and `FolderZone`'s emptiness is its job
(`FolderZone.ts:11-16`: *"the class exists so the folder/leaf invariant
is satisfied"*). ⭐ The one thing wrong with the zone family is that
**its documentation draws it in directories that do not exist**
(§ Grounding) — N2.

**The seam, for the Location planner:** `ZoneApi.resolveZoneForPath` and
`Stuff.zone` stamping are untouched; `Clade` losing `Propertied` changes
nothing a location reads. If the Location plan concludes anything about
`HoldingWarren` (an `Idea` composing `ContainerMixin` to coordinate rooms
it does not contain), that is a Warren finding and this plan takes it as
a note, not a decision.

### I7 — the reference-Idea family is a CONVENTION, not a missing superclass (IDEA-ONLY; ⭐ names the candidate and declines it)

Eight classes say the same sentence: `Discipline`, `Topic`, `Spell`,
`Corpo`, `Brand`, `Government`, `Operation`, `HelpConcept` — *pure-data
leaf, read from `template.data`, never cloned, joined by `key`*. Eight
is past *promote at the third consumer*, and the coordinator's brief
asked for the missing superclass. The test is what the Thing branch's
`Firebox` passed and `Bench` failed: **does the shared thing have a
BODY?** Here it does not — no field, no method, no mixin, not even a
shared refusal (none overrides `canDestruct`; the never-cloned property
is enforced by nobody cloning them). A `lib/stuff/Datum` with an empty
body is what W2 deleted `Bench` for being, and it would make the eight
docstrings say *"extends Datum"* instead of a sentence that is at least
true.

**Declined, with the candidate recorded (N5):** the day the family
gains a behaviour — the obvious one is the refusal *a reference Idea
cannot be cloned* (which would have made the *reference Ideas inert at
boot* defect, three times in this repo's memory, a loud failure instead
of a silent one), or a `lint:reference-ideas` that asserts every such
class has a catalogue that warms it — that behaviour is the body, and
the class is minted then with these eight as its consumers.

### I8 — three empty modality classes collapse into one twin (IDEA-ONLY)

`EmotiveESPModality`, `TasteModality`, `VerbalESPModality` are
`class X extends Modality {}` — the `Bench` shape, three times, with the
base itself concrete and in `lib/`. After I5 their base is
`SingletonMixin(Idea)` plus the modality surface. The four modalities
with overrides stay classes (a class per behaviour is right); the three
with none become **rows over one twin**: `platform/idea/modalities/Modality`
(sharing the base's name — the default, `CLAUDE.md § split it`;
`platform/idea/Biome.ts` is the shape). Rows `emotive-esp.yaml`,
`taste.yaml`, `verbal-esp.yaml` change `class:`; the three files are
deleted. ⚠ `Modality.ts:9-11` (*"Each concrete modality is a subclass"*)
and `senses.md`'s roster line are updated in the same wave, or the doc
lies. No migration: no snapshot names a modality class (they are
singletons minted from rows; `holder_snapshots` captures Persistable
hosts only), and the wire boots a fresh DB.

### I9 — `lock`/`unlock` are NOT wired in this build; the finding is the stopgap's own header (IDEA-ONLY; ⭐ disagrees with the coordinator's instruction)

The coordinator asked for an affordance wave. Grounded, the two views
act on a boolean `LockableMixin` whose header says it is a stopgap to be
retired toward `lib/lock/` (*"Do NOT grow this into a second lock
system"*), and whose controllers check **no key**. Wiring the affordance
beside `open`/`close` on `Mobile.self` — the only bucket that can reach a
door — would ship *any player locks any door they can reach, keylessly*,
on the day the residence pack's `KeyedDoorExit` already models locking as
a credential check. **That is not a reachability fix; it is a design
regression with a verb on it.** ⭐ The unwired affordance was the system
telling the truth about a verb that should not exist in this form.

**Ruling:** no wave. Filed on the slate (N5) as the reconciliation the
header asks for: `lock`/`unlock` re-expressed over `Lock` +
`presentsKey` (a key you hold, or a title you own — `AccessApi.can`,
never a wizard check), the boolean mixin retired, `Exit.canTraverse`'s
`'locked'` gate reading the `Lock`. That is the credential subsystem's
build, with this plan's grounding as its census. ⚠ The drive **observes**
the current refusal in its record (N3) and does not assert it — a test
that pins a known defect as an invariant is the mistake the Agent plan
named (`Creature.branded.test.ts`).

### I10 — the affordance census as a gate: `lint:afforded`, census-then-ratchet at 12 (CROSS-BRANCH; offered, not claimed)

The coordinator's sweep found twelve views no `commandContributions`
names. That is the repo's own pattern — census, then ratchet
(`lint-family.md`): a script that walks every `static
commandContributions` in `src/**` (kernel + every pack; the collector at
`api/command.ts:1423-1446` is the shape to mirror, and `pack-roots.ts`
the reader) plus every content row's `commandContributions` key that
the collector honours, unions the view paths, and lists every
`<root>/cmd/**/*.yaml` not in the union. Today's count is the ceiling;
the gate's own test asserts `≤ HIGH_WATER` and never the number
(`check-mass.ts` is the precedent). It cannot see a verb afforded by
`def`/scripting or by an archetype's fixture at runtime — the header
says so. **N6 is written so any planner can land it**; it is optional
here because it is not an Idea-branch change and the coordinator may
prefer it on the branch that found it.

### I11 — the wiki page the drive reads (IDEA-ONLY)

`wiki-starter/content/wiki/main/propertied.md`, in the shape of
`branded.md` — a `subject.kind: mixin` page carrying
`<composition kind="mixin" of="PropertiedMixin"/>` — with a *"what
cannot"* section in the W4 style: *a material, a species, a condition,
a way of moving, a way of sensing — the shared vocabulary of the world —
carry no stat sheet; a body does.* Without it the inverse read has no
page and part I cannot read the claim.

### I12 — content gaps and instrument gaps leave as slate lines (IDEA-ONLY)

N5 files on `docs/slates/builds/base-class-narrowing-slate.md`: I4's
census gap (concealment authoring on Location `exits:` blocks), I7's
reference-Idea roster and the behaviour that would earn it a class,
I9's lock reconciliation, I10's twelve unwired verbs (if N6 does not
land here), and the `Locked.ts` filename (rename it when the mixin is
retired, not before — a rename on a dying file is churn).

---

## The census table — the 164 in scope, by rule

Rule first, then the exceptions the rule does not cover.

| group | classes · rows | mixins | rule | action |
|---|---|---|---|---|
| catalogues, registries, wardens, relays, standings | 46 · 46 | `PostRegistration` | a boot-time singleton that warms a roster or keeps an index; one row so `StuffApi.singleton` can clone it; nothing authored | none |
| readings | 31 · 31 | `Singleton` | one channel per class, the class IS the ladder (`Reading.ts:1-16`) | none |
| bare data leaves (`Discipline`, `Topic`, `Spell`, `HelpConcept`, `Brand`, `Corpo`, `Government`, `Operation`, `QuantityMarshaller`, pack `Lane`/`Watercourse`/`ServiceRoute`/registries) | 28 · 220 | none | never cloned, or a stateless value marshaller; nothing to narrow because nothing is composed | I7 (declined superclass) |
| zones | 6 · 77 | `Singleton` on the spatial two, `Propertied` on `Clade` | I6 | `Clade` via N0; docs N2 |
| exits | 9 · 14 | `Concealable` | I4 | none |
| reference singletons (the material four, `Species`, `BodyPlan`, `Condition`, `LocomotionMode`; `Clade` and the modalities are counted on their own rows) | 8 · 290 | `Propertied(+Singleton)`, `Perceptible` on the material four, `Visible` on `Species` | I5 · I2 · Species' `Visible` is its generic appearance (36/74 author it; `Species.ts:798-802`) — reading 2 on the rest | **N0** |
| modalities | 7 · 7 | (via `Modality`) | I8 | **N1** |
| live organisational Ideas (`Business`, `CarrierBusiness`, `Organization`, `Locality`, `Party`, `HoldingWarren`, the warrens, `Biome`/`SkyExposedBiome`, `Deposit`/`GroundCharacter`, `Placement`, `Fabric`, `Dyestuff`, `MaturationProfile`, `CombatFormation`, the four `AetherHosted` updates, `DomainHook`, `EvalScript`, `EventRegistry`) | 29 · 125 | one or two capability mixins each, every one read by its subsystem | each composes exactly what its docstring says and a reader narrows on it (spot-checked: `BusinessMixin` requires `Organization` on its base, `Organization.ts:9-11`; `SkyExposed` is `BiomeApi`'s; `GroundSource` is `ground.md`'s seam; `Registrar` gates three verbs — the requirements doc's ⛔) | none |

⚠ **Where the instrument blinds this table.** Three classes with no row
are invisible: `lib/stuff/Idea` itself, `lib/zone/{Zone,SpatialZone}`
(abstract), `lib/location/Warren`, `lib/instrument/Reading`,
`lib/perception/Modality` (all substrate — correct), and any pack class
whose row-named subclass carries the rows. A mixin with no persistent
field (`Singleton`) shows in `mixins` (from `queryMixins`, fixed at
`c32cb4db9`) but has no `layers` entry, so *"0 authoring"* can never be
said of it. `Propertied` has one `runtimeState` field, so it appears
with no authorable column — which is why the seven sat unremarked
through two passes.

---

## ⭐⭐ Host placement

| what | host | what composing / removing it claims about everything else on that host |
|---|---|---|
| `PropertiedMixin` **removed** | `Material`, `Species`, `BodyPlan`, `Clade`, `Condition`, `LocomotionMode`, `Modality` (and by inheritance `ConsumableMaterial`, `RadioactiveMaterial`, `PotionMaterial`, the seven modalities) | *a shared vocabulary entry carries no per-instance state.* True of every row on all seven: each is one instance for the whole world. ⭐ The test from the project's rules: if any of the seven ever needs `if (MixinApi.isPropertied(this))` to behave, the class has stopped being a singleton datum and that is the finding, not the guard. |
| `PropertiedMixin` **kept** | `EventRegistry` (Idea), `Creature` (Agent), `Beacon` (Thing) | unchanged; each reads its own bag or is the receiver of a documented prop key. |
| `PerceptibleMixin` **kept** | `Material` only | *a thing made of this can be called by this word* — a lending surface (I2). Composes onto no other Idea. |
| `DetailedMixin` **not added** | — | I3. |
| `ConcealableMixin` **kept** | `Exit` | *this way may be a secret way* — written by the room's inline spec (I4). |
| `platform/idea/modalities/Modality` (new twin) | the concrete over `lib/perception/Modality` | *a modality with no behaviour of its own* — the three rows. Nothing else changes host. |
| the wiki page | `wiki-starter` | not a host — a document. |

Nothing lands on `Idea`, `Stuff`, `Zone`, `SpatialZone`, `Exit`,
`Thing`, `Location`, `Agent` or `Character`. **The `Idea` root stays
`extends Stuff` with nothing** — the owner's criterion (*if a mixin is
mandatory, the whole branch wants it*) run over 164 classes finds no
mixin on more than 18 of them, so nothing is mandatory and the root is
already the bare bones.

---

## Convention conformance

Checked against the current tree, not recalled:

- **Paths** — the new twin at `platform/idea/modalities/Modality.ts`
  (instanceable, under a branch segment: invariant 7); its three rows
  keep their paths (`/platform/idea/modalities/{emotive-esp,taste,verbal-esp}`)
  and change only `class:`. `lib/perception/Modality.ts` stays the
  substrate. No `/lib/` template path is created (invariant: *nothing
  instances `/lib/`*).
- **Module categories** — one Stuff class in `platform/idea/modalities/`.
  No Api, no logic singleton, no helper, no new category, no
  `eslint-disable`. N6, if landed, is a `scripts/check-*.ts` gate in
  the shape of `check-mass.ts`.
- **Module scope declares** — the twin is `export default class Modality
  extends ModalityBase {}`; nothing executes at load.
- **Import boundary** — kernel-internal edits only; the arcana pack's
  `PotionMaterial` imports `Material` by package specifier already
  (`lint:imports` verifies nothing changes).
- **Verbs on objects** — no Api static changes; `lint:object-verbs`
  stays at 0.
- **Inter-Stuff contract** — nothing new reads a field.
- **Kernel mixin names** — none added, none removed (`Propertied` keeps
  three composers); `lint:mixin-names` unaffected.
- **props: / cast:** — the three modality rows use neither.
- **Gates this build must satisfy** (all via `lint:family`, 58 today):
  `lint:instanceable` (invariant 3 — the twin resolves; invariant 12 —
  no row authors an orphan key; `savedProps` is `runtimeState`, so no
  row could have), `lint:mixin-names`, `lint:field-meta`,
  `lint:module-scope`, `lint:imports`, `lint:census`, `lint:lib-statics`
  (the twin adds no static), `lint:test-bootstrap` (any new test beside
  wired code imports it), `lint:perishable` (`ConsumableMaterial` still
  reaches `Material`), `lint:presentation`, `lint:drive-scripts`. N6
  adds `lint:afforded` and the derived roster picks it up.

---

## Waves

Every wave lands green on `lint:family` + `pnpm test:near` + each
touched pack's own vitest, and ends at a commit. `pnpm test` runs once,
before the MR goes back to review.

### N0 — `Propertied` off the reference singletons (I5)

1. Remove `PropertiedMixin(` and its import from the seven:
   `lib/material/Material.ts:135-136` → `SingletonMixin(PerceptibleMixin(Idea))`;
   `platform/idea/species/Species.ts:404-405` → `SingletonMixin(VisibleMixin(Idea))`;
   `platform/idea/species/BodyPlan.ts:165`, `platform/idea/species/Clade.ts:43`
   (→ `SingletonMixin(Zone)`), `platform/idea/Condition.ts:1604-1605`,
   `platform/idea/LocomotionMode.ts:77`, `lib/perception/Modality.ts:93`
   → `SingletonMixin(Idea)`. Each docstring that names the composition
   is rewritten in the same edit (⚠ the W0 lesson: *a rename that skips
   comments leaves the doc lying*).
2. Before each edit, the D1 grep cited in the commit body:
   `grep -rn "getProp(\|setProp(\|initProp(\|maskProp(\|isPropertied(" packages/server/src/mud packages/content/*/src --include='*.ts' | grep -v __tests__`
   — the receivers are a member, an actor, an occupant, the registry;
   none of the seven.
3. `grep Propertied packages/content/arcana/src/idea/material/PotionMaterial.ts`
   — it must not re-compose it (none expected; the census shows it
   inheriting).
4. Tests: `lib/material/__tests__/Material.test.ts:170-174` inverts —
   *"composes SingletonMixin and is NOT Propertied — a material is one
   instance for the whole world and carries nobody's stat sheet"*,
   pointing at this decision. ⭐ Not a weakening: the assertion pinned
   the composition, not a behaviour; no test anywhere calls `getProp` on
   a material. Add the negative to the sibling class tests where one
   exists (`platform/idea/species/__tests__/`, `lib/perception/__tests__/`,
   `platform/idea/__tests__/` for `Condition`/`LocomotionMode`) as one
   `hasMixin(x, Mixins.Propertied) === false` each, and one positive
   that `EventRegistry` still composes it (so the move is a move, not a
   deletion).
5. `docs/subsystems/race.md:268-292` — the `PropertiedMixin and damage
   resistance` section is rewritten: resistance is fields
   (`materials-response.md`), the bag is gone, and why.
   `docs/subsystems/properties.md` gains one line naming the three
   composers that remain. `architecture.md`'s mixin table is checked for
   a `Propertied` row naming a material (`grep -n Propertied docs/architecture.md`).
6. `pnpm -C packages/server composition-census` — `PropertiedMixin`
   disappears from every Idea-branch class.

Acceptance: `lint:family` green; `test:near` over `lib/material`,
`lib/perception`, `platform/idea`, `platform/idea/species`, `lib/zone`,
plus `arcana`'s vitest; the census shows `PropertiedMixin` on exactly
`EventRegistry`, `Beacon`, and the Agent-branch classes. Commit:
`build(narrowing N0): a material is nobody's stat sheet — Propertied off the seven reference singletons`.

### N1 — one `Modality` twin, three empty classes retired (I8)

1. `platform/idea/modalities/Modality.ts`:
   `import { Modality as ModalityBase } from '../../../lib/perception/Modality'; export default class Modality extends ModalityBase {}`
   with a docstring in `platform/idea/Biome.ts:1-11`'s shape.
2. Rows `platform/content/platform/idea/modalities/{emotive-esp,taste,verbal-esp}.yaml`:
   `class: /platform/idea/modalities/Modality`.
3. Delete the three class files; `grep -rn "EmotiveESPModality\|TasteModality\|VerbalESPModality" packages/` must return only tests, which are updated
   (`platform/idea/modalities/__tests__/` — a test that instantiated one
   of the three by class instantiates the twin).
4. `lib/perception/Modality.ts:9-11` docstring: *"a modality with
   behaviour of its own is a subclass; one without is a row over the
   twin"*. `docs/subsystems/senses.md:16-21` (*"the seven `Modality`"*) says the same.
5. `lint:instanceable` (invariant 3 on the three rows; the emptied
   files leave no dangling class path).

Acceptance: `test:near` over `lib/perception`, `platform/idea/modalities`;
`PerceptionApi.sensorium` still lists seven modalities in a booted world
(the drive's I6 reads `trace atmosphere`-adjacent output; the unit test
is the proof). Commit:
`refactor(narrowing N1): one Modality twin — three empty classes were three copies of nothing`.

### N2 — the documentation, and the page the drive reads

- `lib/stuff/Idea.ts:1-13` — five branches, not six; `Thing` is matter,
  `Movable` the good; the list of what an Idea is gains *a zone, a
  material, a species, a spell, a controller — identity and state
  with no presence*.
- `platform/idea/Condition.ts:1598-1602` — *"ZERO content ships"* → the
  catalogue is 31 rows and where they live.
- `docs/subsystems/zone.md:1-8, 64-80` and `lib/zone/Zone.ts:9-16`,
  `platform/idea/FolderZone.ts:19-21` — every path claim matches disk
  (`platform/idea/location/{Cartesian,Spherical}Zone`,
  `platform/idea/{FolderZone,WikiNamespaceZone,HomeZone}`,
  `platform/idea/species/Clade`). The diagram is redrawn with the real
  directories. The `Clade` line drops `Propertied`.
- `docs/subsystems/topics.md:151-152` — `platform/idea/Topic.ts`,
  `platform/idea/TopicCatalogue.ts` (no `obj/`).
- `docs/subsystems/race.md` (done in N0), `senses.md` (done in N1);
  `docs/architecture.md:1021` (`Idea` row) is already true — leave it.
  ⚠ `architecture.md:1022` (`Thing` row) still lists `Concealable` on
  the Thing root — the Thing branch's W4 missed it; **noted for the
  coordinator, not edited here** (rule 5: the shared docs are swept, not
  raced).
- `wiki-starter/content/wiki/main/propertied.md` (I11).

Acceptance: `grep -rn "lib/spatial/\|lib/home/\|lib/species/" docs/subsystems/zone.md packages/server/src/mud/lib/zone` returns nothing; `wiki propertied` renders a non-empty inverse in a booted world. Commit:
`docs(narrowing N2): the Idea branch's docs draw the tree that is on disk`.

### N3 — the drive, part I

Appended to `packages/wire/tests/base-class-narrowing.dirty.wire.test.ts`
as `suite('I — an idea has no stat sheet, a secret way is still secret')`,
**after part H** (the Location planner's; do not renumber). No pack
added to `declareFile`. Each checkpoint can fail.

⚠ **Harness facts, learned the hard way, that this part obeys:**
bare `look` binds the FOCUS not the room — use `look here`; `goto`
binds through MQL and cannot reach a singleton room nobody has visited —
use `startLocation` (`at(CORRIDOR, …)`); `search` is durative; a
`clone`'s description lands on the next command's frame (drain, wait,
drain); bind carried things with `me:i:`; a cloned thing lands in your
INVENTORY and inventory is not `peers`, so peer affordances do not fire
until you `drop` it; an unlit room renders things as "something" and the
wire world boots at midnight; ⚠⚠ the clone gate — a row with no live
instance is gated by `canAtPath`, a row WITH one through that instance's
ZONE, so the second clone of anything from another locality is
`access-denied`. Part I clones nothing.

```
beforeAll (120 s):
  reader = at(LOBBY, 'reader')                      // any lit room; reads wiki pages
  delver = at(CORRIDOR, 'delver')                   // startLocation, not goto

I1  ⭐⭐ a material still has keywords and no longer has a stat sheet
    page = squash(plain(said(reader.cmd('wiki oak'))))
    expect(page).toMatch(/Singleton|Perceptible|composes|mixins/i)   // the forward panel rendered
    expect(page).not.toMatch(/Propertied/i)                           // I5
    → can fail: before N0 the panel says PropertiedMixin.

I2  ⭐⭐ the inverse agrees: bodies carry a bag, the vocabulary does not
    page = inverse(reader, 'propertied')            // needs N2's page; positive-first
    expect(page).toMatch(/platform\/agent\/|EventRegistry/i)           // the classes that keep it
    ⚠ Propertied is on Creature — hundreds of rows — so the panel answers by CLASS; assert class paths.
    expect(page).not.toMatch(/idea\/material\/Material|idea\/species\/Species|idea\/Condition|idea\/LocomotionMode|idea\/modalities\//i)
    → can fail both ways; the positive guards the "failed component" case (part E's lesson).

I3  ⭐ a secret way is still a secret way (I4 — Concealable stayed on Exit)
    room = roomText(delver)                          // `look here`, the corridor
    expect(room).toMatch(/north/i)                   // the obvious way on is listed
    expect(room).not.toMatch(/\beast\b/i)            // the hidden shortcut is not
    → can fail: had Exit lost Concealable, Exitable.ts:681 would hydrate nothing and `east` would print.
    ⚠ The room is unlit at midnight? No — corridor-1 is the delve; part E already reads it. If the
      exits line is absent because of light, assert on the exits line specifically (`Exits:`/`Obvious exits`).

I4  an exit is addressed by direction, not by keyword (I2's claim, made falsifiable)
    expectOk(delver.cmd('go north'));  roomText(delver) matches /corridor-2|second corridor/i
    expectOk(delver.cmd('go south'));  roomText(delver) matches the first corridor's title
    → proves the room-candidate + via.exit path binds after N0/N1 touched nothing near it;
      cheap, and it is the only exit traversal in the drive that goes through a hidden-exit room.

I5  a modality row over the twin still senses (I8)
    r = delver.cmd('sense here')        // `sense` gathers every modality the body has, taste included
                                        // (`perception/sense.yaml:1-12`); taste is one of the three rows
                                        // that moved onto the twin
    expectOk(r); said(r) does not match /unknown modality|no such modality|controller-error/i
    → can fail: a row whose class: points at a path that does not resolve dies at clone (invariant 3
      catches it at lint time; this is the runtime half — the sensorium resolves each modality
      singleton by path, `Modality.ts:1-8`).

I6  (OBSERVED, NOT ASSERTED — I9) at a room with a door, `lock <door>` today answers as an
    unknown verb. Recorded in the drive record with the frame text; no expect(). A checkpoint that
    pins a known defect is the mistake the Agent plan named.
```

Acceptance: parts 0, A–H unchanged and green; I1–I5 green against a
fresh DB with `WIRE_BOOT=1`; the record appended below with the run's
count. Commit:
`drive(narrowing N3): part I — the vocabulary has no stat sheet, and the secret door is still secret`.

### N4 — the measurement, re-run

`pnpm -C packages/server composition-census --json` before (this cycle's
`scratchpad/idea-matrix.json`) and after; append to § Drive record the
`PropertiedMixin` row (classes / rows before → after), the modality
class count (7 → 5), and the Idea-branch list-A count. Expected:
`Propertied` loses 16 classes / 301 rows on this branch and gains none
anywhere; `Perceptible`, `Concealable`, `Visible` unchanged. Commit
with N3 or alone:
`tools(narrowing N4): the Idea census after — the bag came off the vocabulary`.

### N5 — the slate

Lines on `docs/slates/builds/base-class-narrowing-slate.md`, per I12,
each one paragraph with the grounding above cited by path. Commit:
`slate(narrowing N5): four seams the Idea pass leaves — concealment's census gap, the reference-Idea roster, the keyless lock, the unafforded twelve`.

### N6 — `lint:afforded` (optional; I10)

1. `packages/server/scripts/check-afforded.ts` in `check-mass.ts`'s
   shape: header states the rule (*every command view is named by at
   least one `commandContributions` static, or it is a verb nobody can
   type*), the failure it closes (twelve verbs, four branches, found by
   hand), and what it cannot see. Walk `src/**` of the kernel and every
   pack (`pack-roots.ts`) for `static commandContributions` blocks;
   union the string literals; walk every `<root>/cmd/**/*.yaml` (a `cmd`
   dir is views unless its parent is `idea`); print the difference
   grouped by category.
2. `package.json`: `"lint:afforded": "tsx scripts/check-afforded.ts"`.
3. The gate's own test asserts `AFFORDED_CEILING ≤ HIGH_WATER` and
   `≥ 0`, never the number; the high-water mark is measured when it
   lands (12 expected: `hitch`, `unhitch`, `mount`, `ride` are fixed —
   so 8 — verify).
4. `docs/lint-family.md`: one entry.

Commit: `lint(narrowing N6): lint:afforded — a verb nobody can reach, counted and capped`.

---

## Reachability wiring

Per capability, the five links — verb · affordance · data · boot · arg gate:

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| `Propertied` off the seven | none (subtraction) | none | 301 rows unchanged (no row authors a prop — `savedProps` is `runtimeState`) | catalogues warm the same rows | none — no view gates on `PropertiedMixin`; ⚠ **nothing catches a wrong strip at the binder or at resolution** (I5) — the panel is the only observer, hence I1/I2 |
| the `Modality` twin | the sense verbs (existing) | `Perceiver` (existing, `self`) | three rows change `class:` | `PerceptionApi.sensorium` reads the singletons | none |
| the wiki page | `wiki propertied` | — | one `wiki-starter` row | the pack's `wiki` kind installs it | — |
| `Concealable` on `Exit` (kept) | `look`, `search` (existing) | `Perceiver` | the room's inline `exits:` band | — | none |
| `lock` / `unlock` | shipped views | **none — deliberately left** (I9) | — | — | `requires: LockableMixin` (a Door) |

⚠ The links that fail closed and silent on this branch are two: a
modality row whose `class:` names a deleted class (invariant 3 catches
it at lint; I5 of the drive at runtime), and — the general case the
coordinator asked about — **any move on this branch that was wrong would
surface nowhere a player could see**, because no verb gates on an
Idea-branch mixin and no MQL scope pools an Idea. That is why the one
narrowing here (I5) was chosen on a grep that is empty, not on a count
that is zero, and why the drive's positives are the forward panel and
the inverse, not a verb.

---

## Acceptance-criteria coverage

The requirements doc's AC1–AC8 are covered by the earlier plans and stay
green (parts A–H). Against the owner's ruling for this branch:

| criterion | wave |
|---|---|
| no Idea-branch class claims a capability nothing on it uses | N0 (the seven), N4 (the count) |
| who is addressable by keyword is decided, and the answer is written where the next author reads it | I2 (no rung); N2 (`Idea.ts` docstring) |
| F2b closed | I3 |
| a secret way is still secret; a material is still named for | N3 I1, I3 |
| the zone family is one family, on the right branch, drawn where it lives | I6, N2 |
| the naming pass: no empty class that is three copies of one | N1 |
| every verb this branch touches is reachable, or its unreachability is ruled | I9, I10, N5/N6 |
| nothing that worked stopped working | N3 I4, I5; parts A–H |

---

## Test & gate strategy

- **Unit:** `Material.test.ts:170` inverted (the shape, not a
  behaviour); one `hasMixin(…, Mixins.Propertied) === false` beside each
  of the other six; one positive on `EventRegistry`; the modality tests
  re-pointed at the twin. `Exit.concealment.test.ts` unchanged — it is
  the test that proves I4.
- **Lints:** `lint:family` at every wave (roster derived; the gates
  named under § Convention conformance are the ones that can fire).
- **Only the drive proves:** the panel's public claim (I1, I2), the
  inline band surviving on a hidden exit in a booted world (I3), a row
  over the new twin resolving at clone (I5).
- `pnpm test` exactly once, before the MR goes back to review, and at
  `/finalize`. Never between waves; never in the background. A green run
  stays valid until a source file changes —
  `git status --short | grep -vE '^.. (docs/|CLAUDE\.md|.*\.md$|packages/content/)'`.

---

## Risks & opens

- **A pack composing `Propertied` on a Material subclass of its own.**
  Only arcana's `PotionMaterial` extends `Material` outside the kernel;
  N0 step 3 checks it. A pack that re-adds it in its own class is not
  wrong by this plan (a pack's class is the pack's) — but the panel
  would show it, which is the point.
- **A row authoring a prop-shaped key.** None can: `savedProps` is
  `runtimeState`, and invariant 12 would already have failed on an
  orphan key. Zero rows on the branch author one (census).
- **`readProp` in MQL** (`resolver.ts:1522`) — a `[prop.x=…]` filter
  over a material answered `undefined` before and after. No behaviour
  change; noted because it is the one reader whose result shape does
  not change and a reviewer may ask.
- **The `Modality` twin's name.** Two classes called `Modality`
  (substrate + twin) is the sanctioned default (`Thing`, `Vessel`,
  `Exit`, `Biome`, `Material` all do it); the import aliases the base as
  `ModalityBase`.
- **Part H is not landed yet.** Part I is written to be appended after
  whatever H becomes; if H changes `declareFile` packs, I needs none of
  them. If H and I both read `LOBBY`, two sessions in one room is fine.
- **Stop and ask** only for: a D1 grep in N0 that finds a prop written
  on one of the seven (none expected); a pack test that calls `getProp`
  on a material (none found). Everything else is ruled here.

---

## Deferred seams

Each leaves as a line on `docs/slates/builds/base-class-narrowing-slate.md`
at N5:

- **Concealment's census cannot see an exit's band** (I4): the
  authoring surface is a Location row's `exits[*].concealment`; a
  census that reads rows by class reports the exit family dead. The
  fix is an instrument change (`check-composition-census` reading
  inline exit specs as authoring for `Exit`), not a class change.
- **The reference-Idea family and the class it would earn** (I7): eight
  classes, one sentence, no body. The body that would mint it is a
  clone refusal or a catalogue-warm gate (`lint:reference-ideas`) — the
  *inert at boot* defect's real fix.
- **`lock`/`unlock` over `Lock` + `presentsKey`** (I9): the
  reconciliation `Locked.ts:15-24` asks for; the boolean mixin retires
  with it, and the file is renamed then. Until it lands, the two views
  stay unafforded on purpose, and this plan's grounding is the census.
- **The unafforded twelve** (I10) — as a gate (N6) if landed, else as
  the list with the bucket each would take (`Mobile.self` for the door
  pair once keyed; the locomotion family and `Foldable` are the Agent
  and Location planners' to rule).
- **Species' generic appearance** — 38 of 74 species author no
  `longDescription`; a content gap (reading 2), the owner's own brief
  (*"write some in for immersion's sake"*).

---

## Critical files

Read first, in this order:

1. `docs/requirements/base-class-narrowing-requirements.md` · this plan ·
   `docs/plans/base-class-narrowing-clusters-plan.md` (D1, D3, D8, § What remains open) ·
   `docs/plans/base-class-narrowing-agent-plan.md` (E1, § A6 for the drive's shape)
2. `packages/server/scripts/check-composition-census.ts` (the header) · `scripts/check-mixin-census.ts`
3. `packages/server/src/mud/lib/stuff/Idea.ts` · `lib/stuff/Propertied.ts:1-40,450-460` · `lib/description/Perceptible.ts:1-40`
4. `lib/material/Material.ts:1-60,135-140` · `platform/idea/species/{Species,BodyPlan,Clade}.ts` (class lines) · `platform/idea/Condition.ts:1596-1610` · `platform/idea/LocomotionMode.ts:77` · `lib/perception/Modality.ts:1-20,93`
5. `api/mql/scope-walk.ts:25-110` · `api/mql/resolver.ts:680-780,1515-1530`
6. `lib/boundary/Exit.ts:1-40,192-215` · `lib/boundary/Exitable.ts:230-250,670-690` · `lib/boundary/__tests__/Exit.concealment.test.ts`
7. `lib/zone/Zone.ts:1-60` · `lib/zone/SpatialZone.ts:1-65` · `platform/idea/{FolderZone,WikiNamespaceZone,HomeZone}.ts` · `platform/idea/location/{CartesianZone,SphericalZone}.ts` · `docs/subsystems/zone.md`
8. `platform/idea/modalities/*.ts` · `platform/idea/Biome.ts` (the twin shape)
9. `lib/boundary/Locked.ts:1-30` · `lib/lock/Lock.ts:1-20` · `platform/idea/cmd/boundary/LockController.ts` · `lib/spatial/Mobile.ts:220-245` · `docs/subsystems/boundary.md:30-65`
10. `docs/subsystems/race.md:136-146,268-292` · `docs/subsystems/properties.md:1-20` · `docs/subsystems/materials-response.md:1-30`
11. `lib/wiki/components/composition.ts` · `packages/content/wiki-starter/content/wiki/main/{oak,branded}.md`
12. `packages/wire/tests/base-class-narrowing.dirty.wire.test.ts:40-230,307-360`

---

## Drive record

*(appended at build time)*
