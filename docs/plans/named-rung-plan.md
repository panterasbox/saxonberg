# Named on the identity rung — implementation plan

Executes [named-rung-requirements.md](../requirements/named-rung-requirements.md).
**Kind:** refactor/sweep. **Leads from:** kernel. **First consumer:** the
Cast roster (30 shipped rows carrying a `name:`) and, after it lands, pets'
`KeptAnimal`.

The substance is three composition lines: `NamedMixin` leaves the
`Creature` base and is composed on `CastMixin` (the somebody rung) and on
`Avatar` (the player body). What makes the rule *enforceable* rather than
remembered is a sixth `lint:identity` clause — a body row authoring a
name-shaped field on a class that cannot hold one fails CI — and that
clause needs the shared mixin resolver to see through the `const XBase =
…` idiom, which it does not today. Three waves, each landable.

⚠ **Sizing, stated plainly.** The requirements say "deletes a line, adds
three". The grounding agrees on the source: three lines, one content edit.
The cost the requirements did not see is mechanical: **~40 test files**
subclass `Character`/`NPC`/`Creature` in a fixture and call the name
surface, and each needs `NamedMixin` composed on its own fixture (the idiom
134 other test files already use). That is a sweep, not a design change,
and it is why W1 is the wide wave.

---

## Grounding

Verified by opening files this cycle. Line numbers are at commit
`65863fe4c`.

**The mixin and its one composition.**

- `mud/lib/description/Named.ts` — `NamedMixin`, `_mixinName = 'NamedMixin'`,
  five fields all `{ persistent: true, authorable: true }`: `honorific`,
  `name`, `surname`, `nameSuffix`, `alternateNames`. `name` defaults to `''`;
  `getFullName()` returns `''` when nothing is set. Its docstring already
  lists pets/mounts/familiars as intended holders and excludes generic NPCs.
- **Exactly one production composition**: `mud/lib/creature/Creature.ts:166`
  — `NamedMixin(PropertiedMixin(Agent))`, innermost of `CreatureBase`.
  Confirmed by `grep -rn "NamedMixin(" --include='*.ts'` over kernel + pack
  `src/`, tests excluded: the only other hits are two doc-comment examples
  in `lib/stuff/Shadow.ts:24,29`. `Thing.ts`, `Location.ts`, `Character.ts`,
  `lib/mixin.ts`, `api/mixin.ts`, `Perceptible.ts` mention it in comments
  only. 134 test files compose it explicitly (unaffected).
- `Thing.ts:14` carries the rule: *"`NamedMixin` is deliberately NOT
  defaulted here"*.

**The ladder.** `Agent → Creature (lib/creature) → Character
(lib/character/Character.ts:93, `const CharacterBase`) → NPC
(lib/npc/NPC.ts:25, `BehavedMixin(PostRegistrationMixin(Character))`)`.
Rungs: `platform/agent/Cast.ts:23` = `CastMixin(NPC)`; `Extra.ts:29` =
`NPC` bare. `CastMixin` (`lib/npc/Cast.ts:96`) is
`class CastMixin extends SingletonMixin(Base) implements Cast`, four dossier
fields, no name field. `MixinApi.isCast` exists (`api/mixin.ts:1499`).
Other Cast-composed classes: `platform/agent/Crafter.ts:30`
(`CastMixin(MakerMixin(NPC))`), `platform/agent/Gus.ts:58`
(`CastMixin(NPC)`), `terminus/src/terminal/agent/TicketClerk.ts:26`
(`CastMixin(NPC)`), `terminus/src/mayfield-row/agent/Walter.ts:31`,
`terminus/src/realty/agent/Realtor.ts:70`,
`eternal-university/src/duncan-hall/agent/Katie.ts:36` (all three
`CastMixin(PopulatesMixin(NPC))`). ⭐ The Realtor row
(`terminus/content/world/terminus/realty/agent/ricky.yaml:15`) names
`/world/terminus/realty/agent/Realtor`, which resolves to that file — it
**is** Cast-composed; the parent's worry is closed.
Non-Cast Character descendants that lose the mixin: `Extra`,
`platform/agent/Mercenary.ts:21` (`PartyMemberMixin(NPC)`),
`platform/agent/HaulingCreature.ts:29` (`MountableMixin(PostRegistrationMixin(Character))`,
extended by `trade-mining`'s `PitPony` and `transport`'s `DraftHorse`),
`platform/agent/Corpse.ts:21` (`extends Creature`), `trade-ranching`'s
`Livestock.ts:54` and `WorkingAnimal.ts:52` (both `…PerceptibleMixin(Creature)`).

**The player body.** `Avatar` (`platform/agent/Avatar.ts:160`) =
`PersistableMixin(EstateMixin(…(PartyMemberMixin(SubjectSubscriberMixin(ShelledCharacter)))))`;
`ShelledCharacter` (`lib/shell/ShelledCharacter.ts:42`) =
`AuthorMixin(WorkspaceMixin(AliasMixin(EnvironmentMixin(FocusedMixin(Character)))))`.
**Avatar reaches Named only through Creature.** `Shade`
(`platform/agent/Shade.ts`) and `WireBody`
(`platform/agent/sandbox/WireBody.ts:45`) both `extends Avatar`. Avatar
reads the name surface at `:816,:824,:885-889,:946-947,:1481-1484`
(connection payload, fork slice) and writes it at `:1528-1531`
(`mergeSlice_Presentation`). Enroll lands the name by hydration:
`EnrollController.ts:684` `name: draft.name`, `:697`
`overlay.surname = draft.surname` — through `Named.fieldMeta`, so the
overlay is silently dropped on any class that does not compose the mixin.
`PlayerController.ts:58-65` (`player name …`) and `Login.ts:185,370,383`
call it on an Avatar. `StreamLogic.ts:384` and `GitLogic.ts:156` read
`getName()` on avatars (the latter through an `AuthorLike` cast).

**The nine narrowing sites, all defensive**: `SenseController.ts:150`,
`LookController.ts:158`, `SingleSenseControllerBase.ts:166` (narrow a
*location*), `IntroduceController.ts:72`, `ProfileLogic.ts:198` (name
surface only when `recognized`), `ProseLogic.ts:141`, `Soul.ts:224`,
`Stuff.ts:299`, and the predicate itself at `api/mixin.ts:773`. No
non-test site calls `getName()`/`setName()` on a value typed `Creature`,
`Character`, `NPC` or `Extra`; every other `getName()` hit in the ~91-site
census is a bespoke accessor (`Locality`, `Deposit`, `Zone`, `Material`,
`LocomotionMode`, `Party`, `Condition`, `Modality`, `Watercourse`, `Lane`,
`ServiceRoute`, `GroundCharacter`, blueprints, recipes).

**Presentation.** `Stuff.presentationCore()` (`lib/stuff/Stuff.ts:286-315`):
disguise → `isNamed(this) && getName()` → `isVisible && getShortDescription()`
→ `'something'`. The un-named path is the shipped default.

**⚠⚠ Keyword resolution — two paths, both already absent-safe.**

1. `PerceptibleMixin.keywords` getter (`lib/description/Perceptible.ts:170-190`)
   folds `name` only under `MixinApi.hasMixin(this.constructor, Mixins.Named)`,
   and `tokenizeName('')` yields `[]`; `shortDescription` tokens fold
   independently. Applies to `Livestock`/`WorkingAnimal` (Perceptible over
   Creature). `subscribableFields.dependsOnFields` lists `'name'`
   (`:150`) — an inert dependency on a host without the field; nothing
   validates it against `fieldMeta`.
2. `Extra`, `Cast`, `Corpse`, `Mercenary` compose **no** `Perceptible`
   (`Character` has none; `Thing`, `CartesianLocation`, `Material` do).
   Targeting reaches them through `Stuff.perceivedKeywordsFor` →
   `RecognitionLogic.perceivedKeywordsImpl` (`:389`): for an `Organism` it
   is `GrammarApi.tokenize(describeCore(viewer, target, true, false))`,
   whose stranger form is `strangerStem` (`:241`) = `shortDescription`,
   else the species common name, else `'someone'` — **it never reads
   `Named` for a stranger.** `wolf.yaml` (`newbie-wilds/…/agent/wolf.yaml`,
   `class: /platform/agent/Extra`, `shortDescription: a rangy grey wolf`)
   resolves as `wolf` from that stem today and after. MQL's scope walk
   (`api/mql/scope-walk.ts:282-302`) reads the same two sources.

**Corpse.** `ConditionLogic.mintCorpseFrom` (`:564-620`) clones
`/stuff/agent/Corpse` with `dataOverlay: { shortDescription: 'the body of
<presentation>', _speciesPath, causeOfDeath, diedAtGameSec }` — **no
`name`**. The comment at `:578` ("the corpse arrives already named") and
`generic-objects/content/stuff/agent/Corpse.yaml`'s header ("the name …
arrive[s] through the clone's `dataOverlay`") are both stale today.
Nothing reads a corpse's name; `trade-cooking`'s `hanging-carcass.yaml`
(`class: /platform/agent/Corpse`) authors no name-shaped field.

**The hydrator.** `PersistentHydrator.hydrate` (`platform/idea/persistence/PersistentHydrator.ts:64-77`)
iterates `MixinApi.getAllPersistentFields(ctor)` and reads `data[field]`
for each — an authored key no composed class declares is **never read**:
silent discard, no warning, no error.

**The gates.** `scripts/check-identity.ts` already refuses *"a proper
`name:` on an Extra"* (rule 1, `:262`), selecting characters *by brain*
(`row.data.behaviors`, `:245`) and resolving the rung with
`composesMixin(classPath, 'CastMixin')` from `scripts/pack-roots.ts:112`.
⚠ **`composesMixin` follows only `class X extends …` clauses through
imports** (`importedClassPath`, `:172`); a same-file `const XBase = …`
binding is invisible. Probed at plan time: `('/platform/agent/Cast',
'BehavedMixin') → false` though `NPC` composes it; `('/platform/agent/Avatar',
'NamedMixin') → false`, `('/platform/agent/Corpse', 'NamedMixin') → false`
though both reach it today. It works for the rungs only because every
`CastMixin(…)` composition is inline. `lint:dossiers` shares the function.
`check-perishable.ts:128` has its own whole-file text resolver instead.
Script tests live in `scripts/__tests__/` (pure-decision exports, the
`check-template-census.test.ts` shape).

**Content census** (parsed YAML, plan time; the script is in this
session's scratchpad, not the tree): 374 rows author one of the five keys,
almost all on Idea classes with a bespoke `name` field. Restricted to
organism rows (`_speciesPath` authored): **30 author `name:`** — 18 ×
`/platform/agent/Cast`, 7 × `Crafter`, `Gus`, `TicketClerk`, `Walter`,
`Katie`, `Realtor` — every one Cast-composed. ⭐ **One role-filler authors
a name-shaped field the requirements' `name:`-only census could not see:**
`newbie-wilds/content/world/newbie-wilds/agent/sellsword.yaml:31`
(`class: /platform/agent/Mercenary`) authors
`alternateNames: [sellsword, mercenary, merc, woman]` — plain strings, not
`{kind, value}` records, read by nothing (`ProfileLogic` shows alternates
only under a recognized `name`, which the row has not; targeting never
reads them — `sellsword` resolves from the `shortDescription`). Dead,
mis-shaped data. The same row and `wolf.yaml` author `primaryKeyword:` on
a non-`Perceptible` class — also discarded today, out of scope, noted under
§ Deferred seams.

**Studio.** `StudioLogic.describeClass` (`:590-612`) walks
`MixinApi.queryMixins(ctor)` live per call; the singleton caches only the
export-source scan and the TypeDoc artifact (`:583-585`). The one persisted
composition-derived key is the blueprint signature = base class + sorted
mixin names (`:738-739`), in the `blueprints` collection, documented as a
cache (dedup on signature, orphans reaped at `warm()`).

**Docs that state the old truth**: `Character.ts:22` (name fields "from
NamedMixin (Creature)"), `Creature.ts:1-30` header and the stack comment
(`Organism … Named … Propertied`), `docs/subsystems/race.md:721`
(Organism "inserted between `NamedMixin` and `GenderedMixin`"),
`docs/subsystems/mixins.md:378` (the stacking exemplar shows
`NamedMixin(Agent)` under `Character`), `docs/subsystems/identity.md:41`
(rung table), `:248` (gate table), `:262` (cast table),
`docs/plans/pets-plan.md:133` (lists `Named` in Creature's composition).

**Tests that assert the old truth**: `lib/creature/__tests__/Creature.test.ts:31`
(`isNamed(creature) === true`); fixtures calling the name surface on a
`Character`/`NPC`/`Creature` subclass — the top of the census by hit count:
`api/__tests__/sandbox.jurisdiction.test.ts` (16), `lib/character/__tests__/Character.test.ts`
(15, `class TestCharacter extends Character` + `setName`),
`platform/idea/api/__tests__/CombatLogic.test.ts` (6),
`lib/vitals/__tests__/Vitals.infection.test.ts` (5),
`api/__tests__/sandbox.crossing.test.ts` (4), then ~37 files with 1–3 hits
(`ElectricityLogic`, `FloodedCell.integration`, `Consumables`,
`ArmsAndArmor`, `hearthworks-venues.integration`, `CombatLogic.{range,hooks,gearwear}`,
`Wearable.fit`, `Slotted.{covering,worn}`, `Metabolic.*`, `Creature.mass`,
`CombatReactive.shadow`, `craft-served-path`, `Handcart.integration`,
`AssessController`, `GovernmentController`, `GovernmentLogic{,.flagship}`,
`material-response.inflict`, `ConditionLogic.shock`, `Vitals.anatomy`,
`Trauma.behaviors`, `Respiration.{tank,contaminant}`, `ManaPotion`,
`Charged.attention`, `HazardDelivery`, `encumbrance-fixtures`,
`Concealment.covering`, `command-animacy`). Some are false positives
(Avatar fixtures, `material.getName()`); the suites decide.

---

## Plan-level decisions

**D1 — The composition goes on `CastMixin`, not on the `Cast` class.**
`lib/npc/Cast.ts`: `class CastMixin extends SingletonMixin(NamedMixin(Base))
implements Cast`, and `export interface Cast extends Named`. The rung *is*
the mixin (identity.md: "It is a MIXIN, and that is forced" — Dave is a
`Crafter` and Cast), so a `CastMixin(X)` that could not be named would be a
somebody with no name surface. One line covers all seven Cast-composed
classes; `MixinApi.isCast(x)` now also narrows to `Named`, which is the
type-level statement of the rung. Named sits inner of Singleton because it
is a plain field carrier with no ordering needs and Singleton is the
enforcement layer that should stay outermost.

**D2 — `Avatar` composes it innermost of `AvatarBase`.**
`platform/agent/Avatar.ts:173`: `PartyMemberMixin(SubjectSubscriberMixin(NamedMixin(ShelledCharacter)))`.
Not `ShelledCharacter` (a shell-surface concern in `lib/shell/`; a name is
not a shell), not `Character` (that is `Extra`'s base — the whole point).
`Shade`, `WireBody` and guest avatars extend `Avatar` and inherit it. Enroll
(`name`/`surname` in the clone overlay), `PersistableMixin` capture/restore
(walks `fieldMeta`, order-blind), the connection payload and the fork slice
all keep working because the fields are declared by a mixin the class
composes; nothing about *where* in the stack matters to them.

**D3 — The keyword seam needs no fix; it gets two tests.** Both paths in
§ Grounding are absent-safe by construction. W1 pins them: a `Visible`-only
Creature-shaped fixture still folds its description tokens through
`Perceptible`, and an `Extra` is targetable by its description tokens
through `perceivedKeywordsFor`. The drive's step 2 is the live proof.

**D4 — The corpse changes nothing observable; two comments were already
wrong.** The name never survived death (the overlay carries none); after
the build the field does not exist on `Corpse`. W1 corrects the
`ConditionLogic.ts:578` comment and the `Corpse.yaml` header to say what
arrives: the description, the species, the cause, the moment.

**D5 — Silent discard is real, so the gate ships: rule 6 of
`lint:identity`, plus the resolver fix it depends on.**
The hydrator never reads an undeclared key (§ Grounding). Rule 6: *every
content row that authors `_speciesPath` (an organism — the exact class of
thing this build removes the field from) and any of `name`, `surname`,
`honorific`, `nameSuffix`, `alternateNames` must name a `class:` whose
composition reaches `NamedMixin`.* The selector is a data fact, not a path
(the gate's own "census by brain, never by path" lesson); no exemption
list. It lives in `check-identity.ts` because that file's charter is
"nothing an author wrote may be silently ignored" and it already has the
row walk and the resolver — rule 1 stays as the better-worded special
case for brained rows.
⭐ **The dependency:** `composesMixin` must follow a same-file
`const <Id> = <expr>` binding when an `extends` identifier is not an
import, treating the initializer as one more expression to scan and
follow. Without it, a class composed through `const XBase = …` reads as
composing nothing — and pets' `KeptAnimal` (a ten-mixin `const` stack)
would fail rule 6 on its first named cat row. The fix is ~15 lines in
`pack-roots.ts`, shared by `lint:identity` and `lint:dossiers`; W0 runs
both before and after and records any delta in this plan.
Plan-time expectation: rule 6 passes on the current tree (every organism
class reaches Named through `Creature`) and, once W1 lands, fails on
exactly one row — the sellsword's `alternateNames`.

**D6 — Nothing caches a composition signature that needs code.**
`describeClass` derives live. Blueprint signatures for `Extra`, `Corpse`,
`Mercenary`, `HaulingCreature` and their subclasses change (Named leaves
the set; `Cast`'s set is unchanged because the same mixin arrives from a
different position and the set is sorted), and the `blueprints`
collection is a cache that re-derives at warm and reaps orphans. If a
stale row confuses a drive, drop the dev DB — never write a migration.

**D7 — The sellsword's `alternateNames` block is deleted.** A content
edit the requirements said would not be needed; the requirements' census
counted `name:` only. It is dead (nothing reads it), mis-shaped (strings
where records are declared), and on a class that by design carries no
name. Removing it changes nothing a player can see, and it is the row
rule 6 would otherwise fail on. Recorded here as the one deviation.

**D8 — Wave order: gate, move, docs.** The gate lands green on the
current tree with no behaviour change (W0), so the move (W1) lands under
it and the ratchet is proven rather than promised.

**D9 — Pets hand-off** (context for that build, not scope here):
`KeptAnimal` composes `NamedMixin` explicitly, next to `Perceptible` —
`PerceptibleMixin(NamedMixin(Creature))` at the bottom of its stack, so a
named animal's keywords fold its name. `WorkingAnimal = HandledMixin(KeptAnimal)`
inherits it legitimately (a collie is named); `Livestock` does not compose
it (a herdbook entry is not a somebody). The `name` verb writes `setName`
only — never `surname`, `honorific`, `nameSuffix`, `alternateNames`; a dog
has one name. Its collision check against a live `Cast`'s name reads
`MixinApi.isCast(x) && x.getName()` (typed after D1). Rule 6 accepts its
rows because W0's resolver follows the `const KeptAnimalBase` chain.
`pets-plan.md:133` should drop `Named` from Creature's listed composition.

---

## ⭐⭐ Host placement

| what | host | what composing it claims | guard needed? |
|---|---|---|---|
| `NamedMixin` | `CastMixin` (`lib/npc/Cast.ts`) — hence `Cast`, `Crafter`, `Gus`, `TicketClerk`, `Walter`, `Katie`, `Realtor` | every somebody can be addressed by name — the rung's definition | none |
| `NamedMixin` | `Avatar` (`platform/agent/Avatar.ts`) — hence `Shade`, `WireBody`, guests | every player body has a name that enroll writes and others see | none |
| `NamedMixin` **off** `Creature` | releases `Extra`, `Mercenary`, `Corpse`, `HaulingCreature` (+`PitPony`, `DraftHorse`), `Livestock`, `WorkingAnimal`, bare `Creature` | a body is not a somebody; a role-filler, a horse, a head of cattle and a corpse have a description, not a name | none — the one guarded reader (`Stuff.ts:299`) already narrows |
| `interface Cast extends Named` | `lib/npc/Cast.ts` | `isCast` ⇒ nameable, in the type system | n/a |
| rule 6 | `scripts/check-identity.ts` | an organism row's name-shaped keys must land somewhere | n/a |
| const-follow | `scripts/pack-roots.ts` `composesMixin` | the shared resolver sees the dominant composition idiom | n/a |

Rejected hosts: `Character` (it is `Extra`'s base — composing there
re-creates the defect one rung up); `ShelledCharacter` (a shell concern;
nothing about a name is a shell); `NPC` (same as Character); a new
`Named`-carrying marker class or flag (the requirements: "not a new class,
not a marker, not a flag").

---

## Convention conformance

- **No new module category, no new free helper, no new file outside
  tests.** All edits are to existing classes, scripts and rows; the only
  new files are `scripts/__tests__/check-identity.test.ts` (and, if the
  const-follow needs its own, `scripts/__tests__/pack-roots.test.ts`).
- `_mixinName` statics untouched; `NamedMixin`'s widens already
  (`static _mixinName = 'NamedMixin'` on a class expression — verify it
  reads as `string` in the composed chain; it does today on `Creature`).
- `props:` / `cast:` — no row designation changes. `PopulatesMixin` still
  exists (`lib/stuff/Populates.ts:138`) on three Cast classes; not this
  build's business.
- Locations untouched; `Location` composes no `Named` and never did.
- `<root>/<branch>/` — no new paths.
- Module scope — no new module-scope statements.
- Import boundary — `Named.ts` is imported by `lib/npc/Cast.ts` and
  `platform/agent/Avatar.ts` with relative kernel paths, as `Creature.ts`
  does now; no pack imports change.
- Verbs on objects — no verb or Api changes.
- **Gates**: the whole derived roster, `pnpm -C packages/server
  lint:family` (29 today). The ones this build actually exercises:
  `lint:identity` (extended), `lint:dossiers` (shares the resolver),
  `lint:field-meta` (no `fieldMeta` shape changes), `lint:instanceable`,
  `lint:module-scope`, `lint:imports`, `lint:test-bootstrap` (new script
  tests do not touch the wired runtime and need no bootstrap — confirm
  against the gate's rule), `lint:census`.

---

## Waves

### W0 — the gate: the resolver sees consts, and `lint:identity` gets rule 6

**Goal.** Ship the enforcement first, green on the current tree. D5, D8.

**Files.**
- `packages/server/scripts/pack-roots.ts` — in `composesMixin`, when an
  identifier in an `extends` expression is not resolvable through
  `importedClassPath`, look for `\bconst\s+<id>\s*=\s*([^;]+);` in the same
  source and treat the captured initializer as another expression: test it
  against the wanted mixin, then recurse over its identifiers (imports and
  further consts), with the existing `seen` set guarding cycles. Update the
  docstring's "how the rung is resolved" paragraph.
- `packages/server/scripts/check-identity.ts` — a second pass over
  `contentRows()` (not gated on `behaviors`): for rows with a string
  `data._speciesPath` and any of the five keys present, `composes(class,
  'NamedMixin')` must hold; message names the row, the key, the class, and
  the fix (*"a body is not a somebody; put the row on the Cast rung, or
  compose `NamedMixin` on its class, or drop the field"*). Export the pure
  decision (`nameShapedKeysOf(data)` + the rule predicate) the way
  `check-template-census.ts` exports `refsOf`. ⚠ `check-identity.ts:343`
  calls `main()` unguarded — importing it from a test would run the gate;
  adopt `check-template-census.ts:662`'s guard
  (`if (process.argv[1] && /check-identity\.ts$/.test(process.argv[1])) main();`).
  Extend the header's numbered list with 6. Extend `--report` with a
  column showing which name-shaped keys a row authors.
- `packages/server/scripts/__tests__/check-identity.test.ts` (new) — the
  key grammar (all five keys; `data` absent; a non-organism row is ignored)
  and the const-follow resolved against real tree paths:
  `('/platform/agent/Cast','BehavedMixin')`, `('/platform/agent/Avatar','PersistableMixin')`,
  `('/platform/agent/Corpse','VitalsMixin')` all true; `('/platform/agent/Extra','CastMixin')`
  false. `scripts/__tests__` is inside `lint:test-bootstrap`'s walk
  (`check-test-bootstrap.ts:66`); a pure-decision test touches no wired
  runtime — mirror `check-template-census.test.ts`'s imports and let the
  gate decide.

**Acceptance.** `lint:identity` and `lint:dossiers` green before and after
the resolver change; any changed finding count recorded below. Rule 6
finds nothing on the current tree. `lint:identity --report` lists the
sellsword with `alternateNames`.

**Commit.** `build(named-rung W0): lint:identity rule 6 — a name-shaped field on a body that cannot hold one; composesMixin follows const bases`

### W1 — the move

**Goal.** `NamedMixin` off `Creature`, onto `CastMixin` and `Avatar`;
every test fixture that needs a name composes it; the one dead row edit.
D1, D2, D3, D4, D7. Rule 6 now bites and is green.

**Files.**
- `mud/lib/creature/Creature.ts` — drop `NamedMixin(` at `:166` and its
  import at `:40`; rewrite the header ("identity" leaves the body list)
  and the stack comment (`… Organism + Propertied + Agent`); the
  `Organism` "sits between Named and Gendered" note goes.
- `mud/lib/npc/Cast.ts` — `import { NamedMixin, type Named } from
  '../description/Named'`; `export interface Cast extends Named`; the
  class extends `SingletonMixin(NamedMixin(Base))`. Add a "What it
  carries" paragraph: the proper name — *this is where "somebody" becomes
  a field*.
- `mud/platform/agent/Avatar.ts` — compose `NamedMixin` innermost of
  `AvatarBase`; a comment beside it citing the requirements ("must not
  arrive by inheritance from a base that no longer carries it").
- `mud/lib/character/Character.ts:22` — the header line now reads
  "honorific/name/… come from `NamedMixin` on the rung (`CastMixin`) or
  the player body (`Avatar`) — a bare Character has no proper name".
- `mud/platform/idea/api/ConditionLogic.ts:578` and
  `generic-objects/content/stuff/agent/Corpse.yaml` header — say what the
  overlay carries (D4).
- `newbie-wilds/content/world/newbie-wilds/agent/sellsword.yaml:31-35` —
  delete the `alternateNames:` block; a one-line comment that a role's
  handles come from its description (D7).
- `mud/lib/description/Named.ts` docstring — one paragraph: composed by
  `CastMixin` and `Avatar`; never on a base; a named animal or artifact
  composes it on its own class; `lint:identity` rule 6.
- Test fixtures — every file in the § Grounding census whose fixture
  extends `Character`/`NPC`/`Creature`/`ShelledCharacter` and calls the
  name surface: compose `NamedMixin` on the fixture (`class TestCharacter
  extends NamedMixin(Character)`), never on a base. Find the true set by
  running the near set; do not pre-edit false positives.
- `mud/lib/creature/__tests__/Creature.test.ts:31` — flips to
  `isNamed(creature) === false`, plus: `Cast` ⇒ named, `Crafter` ⇒ named,
  `Extra` ⇒ not, `Corpse` ⇒ not, `Avatar` ⇒ named (the existing Avatar
  fixture pattern), `Mercenary` ⇒ not.
- `mud/lib/description/__tests__/Perceptible.test.ts` — a `Visible`-only
  host (no `Named`) still folds description tokens; `getPrimaryKeyword()`
  is the trailing description token.
- `mud/platform/idea/api/__tests__/RecognitionLogic*.test.ts` (or the
  nearest existing targeting test) — an `Extra` with `shortDescription: a
  rangy grey wolf` yields `wolf` in `perceivedKeywordsFor(viewer)`.
- `mud/lib/npc/__tests__/` — a `Cast` row with `name:` hydrates it; an
  `Extra` row with `name:` (a fixture row, not content) hydrates nothing
  and `isNamed` is false — the runtime half of rule 6.

**Acceptance.** Near set + pack suites green (§ Test & gate strategy);
`lint:family` green — rule 6 passes only because of the sellsword edit
(verify by temporarily restoring the block: it must fail).

**Commit.** `build(named-rung W1): NamedMixin off Creature — on CastMixin and Avatar; the fixtures compose their own`

### W2 — the docs the build changed the truth of, and the drive

**Goal.** Subsystem docs say the new composition; the drive record is
appended. Then the single full suite, push, MR.

**Files.**
- `docs/subsystems/identity.md` — `:41` rung table: "proper name" row →
  ✅ *structural: `CastMixin` composes `NamedMixin`* / ⛔ *no field to set*;
  `:248` gate table adds rule 6; `:262` cast table: `CastMixin` carries
  `SingletonMixin` + `NamedMixin` + the dossier; a short "2026-09 — the
  name moved to the rung" history note at the bottom.
- `docs/subsystems/race.md:721` — Organism is composed on `Creature`; no
  longer "between `NamedMixin` and `GenderedMixin`".
- `docs/subsystems/mixins.md:378` — the stacking exemplar: `NamedMixin` is
  shown on a rung/player class, not under `Character`.
- `docs/subsystems/mortality.md` — if it names the corpse overlay's
  contents anywhere, align with D4 (grep found no such line; confirm).
- `docs/plans/pets-plan.md:133` — drop `Named` from the listed Creature
  composition and add a one-line pointer to D9 here (a plan is a living
  document; this is the hand-off).
- This plan — the drive record.

**The drive** (the requirements' six steps, against a booted world on a
fresh dev DB): look at the sentry and the wolf (newbie-wilds) and the
canary (Ferrow Delving) — each reads by its description; `look wolf`,
`attack wolf`, `look canary`; talk to Odile and Dave — named in speech,
emotes and the roll-call; `introduce` both ways; enroll a new character
and say something; kill something and look at the corpse — "the body of
…", and `player`/profile on it shows no surname surface.

**Commits.** `docs(named-rung): the rung carries the name — identity, race, mixins`
then `drive(named-rung): <what driving found>`.

---

## Reachability wiring

This build removes a capability from most hosts and moves it; the four
links matter for the two hosts that keep it and for the gate.

| capability | verb | affordance | data | boot |
|---|---|---|---|---|
| a Cast's name | none new — `say`/`emote`/`introduce`/`look` render `getPresentation()` | n/a | the 30 rows' `name:` hydrate through `Named.fieldMeta` on `CastMixin` | the rows clone at pack install exactly as today; `Cast`'s `SingletonMixin` unchanged |
| a player's name | `enroll name`, `player name` | Avatar's own `commandContributions` (unchanged) | the enroll overlay (`name`, `surname`) + `holder_snapshots` capture/restore through `fieldMeta` on `Avatar` | unchanged |
| rule 6 | `pnpm lint:identity` | `lint:family` is derived — no list edit | every `_speciesPath` row in every pack | CI's manual `gate` job (somebody clicks ▶) |

Fails-closed check the build must actually run: after W1, `enroll` a
character and reconnect — the name must survive the round trip through
`holder_snapshots` (this is the link that would break if Avatar did not
compose the mixin, and nothing would say so but a "Welcome, ." banner).

---

## Acceptance-criteria coverage

| AC | satisfied by |
|---|---|
| 1 — a player cannot tell | W1 (no rendering path changes) + W2 drive steps 1–6 |
| 2 — every animal referable by the old words | D3 + W1's two keyword tests + drive step 2 (wolf, canary, collie) |
| 3 — every named NPC still named everywhere | D1 + W1's Cast hydration test + pack suites (terminus, lounge, hearthworks, eternal-university) + drive step 3 |
| 4 — the player's own name at creation, in speech, to others | D2 + enroll/connection/persistence tests + drive steps 4–5 |
| 5 — an author composing the mixin gets a named animal; one who does not gets no name surface | W1's `Extra`-with-`name:` fixture test (nothing hydrates) + rule 6 (W0) |
| 6 — a role-filler cannot be given a surname | structural after W1 (`Extra` has no `setSurname`); rule 6 refuses the row; the Creature test pins `isNamed(Extra) === false` |

Nothing unmapped.

---

## Test & gate strategy

- **Unit**: W0's script tests; W1's composition assertions
  (`Creature.test.ts`), the two keyword-path tests, the Cast/Extra
  hydration pair, and the ~40 fixture files brought back to green.
- **Only the drive can prove**: that the rendered world is unchanged —
  step 2 (targeting by description) and step 5 (the name round trip
  through enroll → snapshot → reconnect).
- **The near set** — `test:near` is proximity-only and **will not pick up
  the fixture files**, because nothing they import changed. Run these
  directories explicitly with `pnpm -C packages/server exec vitest run
  <dirs>` after W1: `lib/creature`, `lib/character`, `lib/npc`,
  `lib/description`, `lib/stuff`, `platform/agent`, `platform/idea/api`
  (Recognition, Condition, Profile, Persistable, Combat, Electricity),
  `platform/idea/cmd/charactergen`, `platform/idea/cmd/social`,
  `platform/idea/cmd/perception`, `api/__tests__` (sandbox, command-animacy),
  `lib/vitals`, `lib/metabolism`, `lib/slot`, `lib/equipment`, `lib/magic`,
  `lib/respiration`, `lib/hazard`, `lib/concealment`, `lib/encumbrance`,
  `world/substation`, `world/hearthworks`, `scripts/__tests__`.
  **Pack suites**: `terminus`, `eternal-university`, `saxonberg-lounge`,
  `hearthworks`, `newbie-wilds`, `trade-ranching`, `trade-mining`,
  `transport`, `trade-cooking`.
- **Lint family** after every wave: `pnpm -C packages/server lint:family`.
- ⚠ `pnpm test` runs **twice**: once before the MR opens (after W2's
  drive), once at `/finalize`. Not between waves, not because W1 is "wide".

---

## Risks & opens

1. **Fixtures fail at runtime, not compile time.** Vitest does not
   type-check; a `TestCharacter` calling `setName` throws `not a
   function` at the call. That is why the near set is explicit and wide
   rather than `test:near`.
2. **Hydration order moves for Avatar.** Phase 1 applies persistent fields
   in declared order; Named's five fields now sit at Avatar's innermost
   position rather than Creature's. No setter in the Avatar stack reads
   `name` (verified by grep for `this.name`/`getName()` in the character
   tier) — the enroll and restore tests are the tripwire.
3. **The resolver fix changes gate results.** `lint:dossiers` and rules
   1–5 may see more classes as composing something (only ever *more*,
   never fewer). Record the before/after counts here in W0; a new finding
   is a real finding, not a regression to suppress.
4. **A pack fixture I did not see.** The census covered kernel + pack
   `src/`; the pack suites are the check.
5. **`interface Cast extends Named` and `implements Cast`.** The mixin
   class satisfies `Named` through its base; if TypeScript objects to the
   class-expression's inferred return type, drop the `implements` clause
   rather than the interface extension — the interface is the
   load-bearing half.
6. **Stale blueprint rows** (D6) on a long-lived dev DB — drop the DB.
7. Nothing here should stop the build to ask. The only fork the
   requirements left — where exactly on the rung — is D1.

### W0 gate deltas *(filled in by the build)*

- `lint:identity` before / after the resolver change: …
- `lint:dossiers` before / after: …

---

## Deferred seams

- **The general silent-discard gate** → [mixin-slate.md](../slates/tails/mixin-slate.md).
  Rule 6 covers five keys on organisms. The honest general rule is *every
  authored `data:` key must be a field some composed class declares*, as a
  census-then-ratchet. Two instances seen this cycle and left alone:
  `wolf.yaml` and `sellsword.yaml` author `primaryKeyword:` on
  `/platform/agent/Extra`/`Mercenary`, which compose no `Perceptible` —
  discarded today, harmless because the description tokens carry the
  same word.
- **The two bespoke `getName()` shapes** (`Locality`, `Deposit`, and the
  further nine bespoke `name` fields the census found on Ideas) → the
  mixin slate, as the requirements said.
- **Renaming, collisions, impersonation** → [naming-slate.md](../slates/tails/naming-slate.md).
- **`Extra.ts`'s "asking for one says so plainly"** — after W1 the
  question is a compile error rather than a message; the doc line can
  stay, since a compile error says so more plainly still.

---

## Critical files

Read first, in this order:

1. `docs/requirements/named-rung-requirements.md`
2. `packages/server/src/mud/lib/description/Named.ts`
3. `packages/server/src/mud/lib/creature/Creature.ts` (`:134-190`)
4. `packages/server/src/mud/lib/npc/Cast.ts`
5. `packages/server/src/mud/platform/agent/Avatar.ts` (`:140-180`, `:880-890`, `:1479-1531`)
6. `packages/server/src/mud/lib/description/Perceptible.ts` (`:140-195`)
7. `packages/server/src/mud/platform/idea/api/RecognitionLogic.ts` (`:236-262`, `:385-392`)
8. `packages/server/src/mud/platform/idea/api/ConditionLogic.ts` (`:560-620`)
9. `packages/server/src/mud/platform/idea/persistence/PersistentHydrator.ts` (`:60-80`)
10. `packages/server/scripts/pack-roots.ts` (`:100-195`) and
    `packages/server/scripts/check-identity.ts`
11. `packages/server/src/mud/platform/idea/cmd/charactergen/EnrollController.ts` (`:676-700`)
12. `packages/content/newbie-wilds/content/world/newbie-wilds/agent/sellsword.yaml`
13. `docs/subsystems/identity.md`, `docs/subsystems/mixins.md § Stacking`

---

## Drive record

*(appended at build time)*
