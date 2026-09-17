# Pets — implementation plan

Executes [pets-requirements.md](../requirements/pets-requirements.md).
**Kind:** feature (with content). **Leads from:** kernel for Wave 0, content
for Wave 1. **Scope:** W0 + W1 only; the slate's Wave 2 stays a slate.

What is being built: three kernel defects closed (an NPC's opinion of you
survives a restart; `[mine]` answers; a role-filler holds no personal
opinion), then the substrate for *an animal kept for itself* — a kernel
class an individual kept animal is cloned from, a bond mixin over the
shipped belief store and the shipped temperament axis, a feeding-vessel
substrate, three brains (follow · feed · go home), five verbs, and the
persistence promotion that turns an unkeyed stray into a keyed, titled,
named animal that comes back as itself. The content is one cat on Hinkley
Lane, the collie gaining the capability in place, the canary admitted as
the proto-pet it already is, two feeding vessels, and the offal that was
missing from every butchered carcass.

---

## Grounding

Every fact below was verified by opening the file this cycle. Paths are
repo-relative; `mud/` means `packages/server/src/mud/`.

> ⭐⭐ **Re-grounded 2026-09-15**, against master at the merge of the
> presentation build (MR !255) and the lib-statics build (MR !256) —
> together some 350 files. Every claim in this section was re-checked
> **by symbol**, and every `file.ts:NNN` re-pinned to where the symbol
> actually is now. What survived unchanged: the `Creature` stack, the
> Handling and Metabolic constants (so Risk 4's lethality arithmetic
> still holds exactly), `EstateEntry` carrying no `key`, the 14
> `PersistableMixin` composers, the free/taken verb split, the five
> Disciplines, and the farm-dog's `cadenceMs` — the collie's brain
> **still** has never run. What changed is recorded inline at each
> site, and the four gates added since are in § Convention conformance.
> ⚠ Line numbers are advisory: grep the symbol, not the line.

### Wave 0 — the three defects, as they stand

- **`hydrateBeliefs()`** — `mud/lib/belief/BeliefStore.ts:533`, gated
  `@CallSecurity(SecurityPolicies.SelfOnly)` (a frame whose caller is
  reference-identical to the target — `SecurityPolicies.ts:610`). Exactly
  one caller in the tree: `mud/platform/agent/Avatar.ts:853`, from
  `Avatar.enter`. The **write** path is already viewer-agnostic:
  `viewerKey()` (`BeliefStore.ts:315`) is `viewer.getIdentityPath()`, and
  `writeRecordImpl` upserts a `BeliefDocument` for any viewer with a
  non-null key. So an NPC's regard is written and never read back.
- **Who writes NPC regard today:** `mud/lib/npc/DialogueConversation.ts:385`
  (`this.npc.adjustRegard(this.player, effect.delta)`),
  `mud/platform/idea/cmd/social/IntroduceController.ts:138`,
  `mud/platform/idea/api/ContractLogic.ts:439`,
  `mud/platform/idea/api/CombatLogic.ts:5259`. Readers:
  `DialogueConversation.ts:342` (tree conditions), `ProfileLogic.ts:246`,
  `lib/trait/Dispositioned.ts:362`.
- **The five W0 consumers** are all `tree-dialogue` rows on the `Cast`
  rung: Dave / Mara / Remy (`saxonberg-lounge/.../agent/{dave,mara,remy}.yaml`,
  class `/platform/agent/Crafter`), Katie
  (`eternal-university/.../duncan-hall/agent/katie.yaml`), Odile
  (`terminus/.../registry/clerk.yaml`, `/platform/agent/Cast`). `CastMixin`
  composes `SingletonMixin` (`mud/lib/npc/Cast.ts`), and
  `CastMixin.postRegister` (`Cast.ts:157`) chains super then seeds the
  dossier — the natural hydrate seam.
- **`Extra`** — `mud/platform/agent/Extra.ts` is `class Extra extends NPC {}`.
  Four rows tree-wide: newbie-wilds sentry + wolf, rejection hewer,
  trade-mining canary. None runs regard-writing dialogue. ⚠ Because an
  Extra's `getIdentityPath()` is its shared template path, two sentries
  writing beliefs today would **collide on one Mongo key** — the write path
  is not merely unused for Extras, it is wrong for them.
- **`isMine()`** — `mud/api/mql/predicates.ts:53`, body `return false;`,
  registered in `MQL_PREDICATES` (`:90`). Predicates are **synchronous**
  (`check(target, giver): boolean`). Sync owner reads exist:
  `ChattelLogic.stampedOwnerOf(item)` (`mud/platform/idea/api/ChattelLogic.ts:108`,
  the in-memory title index — what `isOwnerPersisted()` uses) and
  `ParcelLogic.coveringParcelOf(path)` (`ParcelLogic.ts:65`). Both
  `ChattelApi.ownerOf` and `ParcelApi.ownerOf` are async and unusable here.
- **`find`** — `packages/content/platform/content/platform/cmd/shell/find.yaml`
  → `mud/platform/idea/cmd/shell/FindController.ts`. One row per match,
  `Mml.thing(stuff)` only (`:97`), template path appended for
  `MixinApi.isAuthor` viewers (`:100`). No container, no location. The
  wire's `REF_FIELDS` (`mud/api/mql-subscription.ts:106`) are
  `displayName · quantity · primaryKeyword`; `DETAIL_FIELDS` add
  descriptions and illustration. Nothing on either surface locates.
- **`getIdentityPath()`** — `mud/lib/stuff/Stuff.ts:409`,
  `#identityPath ?? getTemplatePath()`. `Avatar` is the only stamped
  identity (`/platform/agent/Avatar/<playerId>` ≠ its seed template path).
  The mint seam `Stuff._stampIdentityPath` (`:489`) is caller-gated and
  driven by `StuffApi.clone(path, { asIdentityPath })`
  (`mud/api/stuff.ts:436`), used only by `PlayerLogic.ts:192`.

### Wave 1 — hosts and substrate

- **`BeliefStoreMixin`** — factory `BeliefStoreMixin<TBase extends MixinConstructor>`
  (`BeliefStore.ts:371`), composed at `mud/lib/character/Character.ts:112`
  innermost of the agency stack; the composition comment (`:80`) says
  *"it reads nothing from the other mixins, so position is free."* Imports
  only Stuff / StuffApi / PersistApi / BeliefDocument / security. Realms:
  `RECOGNITION · IDENTIFICATION · REGARD · DISCOVERY`. Regard face
  `regardFor / adjustRegard / setRegard / clearRegard / regardsHeld`
  (`:605–660`), sealed `@Final @Unshadowable`, keyed on the subject's
  `getIdentityPath()`. `isLearned` (`:292`) persists a record only when
  `knownAs` is set, `typeKnown` is true, or `regard ≠ 0`.
  `MixinApi.isBeliefStore` at `mud/api/mixin.ts:1475`.
- **The per-mixin persistence hooks** — `PersistenceContributor`
  (`mud/api/mixin.ts:239`) carries optional static `captureSlice(host, ctx)`
  / `restoreSlice(host, slice, ctx)`; `getPersistenceContributors` (`:623`)
  walks own-`_mixinName` layers. `EstateMixin` (`mud/lib/chattel/Estate.ts:166`)
  is the exemplar of both.
- **`HandlingMixin`** — `mud/lib/husbandry/Handling.ts`. Fields
  `handling` (0–1, default 0.4, authorable) + `handlingStamp`;
  reconcile-on-read decay. ⚠ `DECAY_FLOOR = 0.15`, `DECAY_PER_GAME_DAY = 0.01`,
  `HANDLING_PER_ACT = 0.06` are **module constants**; the header's
  "per-species floor and ceiling authored nowhere yet" describes a slot
  that does not exist on `Species`. Bands `wild · flighty · wary · steady · quiet`
  with phrases (`HANDLING_PHRASE`). The factory's base constraint is
  `MixinConstructor<Stuff>` — reading the species must narrow through
  `MixinApi.isOrganism`.
- **`Species`** — `mud/platform/idea/species/Species.ts`. `fieldMeta`
  (`:522–546`): `lifespanMin` / `lifespanMax` are `{ persistent: true }`
  without `authorable`. ⚠ Rows *do* author them today (dog `lifespanMax: 15`,
  wolf 15, canary 10) and the Hydrator writes any **persistent** field —
  the `authorable` flag gates the studio schema, not YAML hydration.
  `LIFE_STAGES = ['newborn','juvenile','adult','aged']` (`:226`);
  `AgeCurveSpec.senescentAt` (`:160`) exists and **nothing in the tree
  reads it**. `lifeStageAt(ageDays)` (`:745`) returns `aged` for anything
  past `agedAt`. `getLifespanMax` has one reader, the char-gen dossier
  (`SpeciesLogic.ts:144`). `sentient` (`:424`, default `false`) is what
  `SpeciesApi.isSentient` (`mud/api/species.ts:116`) reads; ⚠ it answers
  `false` for an un-warmed species. `olfactoryProfile.acuity` is authored
  per species (`OLFACTORY_ACUITY_VALUES`). `butcheryYield` is authorable;
  `getButcheryYield()` ships.
- **`OrganismMixin`** — `mud/lib/species/Organism.ts`. `getLifeStage()`
  (`:258`) returns `null` for a `HasInteractive` body (a player) and for a
  species with no curve; `isMature()` (`:265`) tests `adult || aged`.
  Age is a date (`getAgeDays`), stored nowhere.
- ⭐⭐ **Nothing dies of age.** `docs/subsystems/race.md § DECIDED — curves
  without lifespans` says `lifespanMax` deliberately does not bite, for the
  succession problem of named *persons*, and asks that it not be quietly
  wired. No animal dies of age today either — the requirements' "on the
  same terms as every other animal" describes a term that does not exist.
  See D9 and § Risks.
- **`Creature`** — `mud/lib/creature/Creature.ts:134`. Composes (outer→inner)
  `Chattel · Branded · Postmortem · Concealable · LoadBearing · Container ·
  Containable · Disguisable · **Perceptible** · Visible · ThermalRegulation ·
  Thermal · Respiration · Metabolic · Vitals · Reserved · Posed · Slottable ·
  Attired · BodyPlanSlots · Slotted · Organism · Propertied` over `Agent`
  (22 layers; re-verified in order 2026-09-15).
  ⚠⚠ **Superseded by the presentation build (2026-09-10), and in both
  directions:** `Named` is **off** `Creature` (a body is not a somebody
  — it composes on `CastMixin` and on `Avatar`), and `Perceptible` is
  **on** it (every body is addressable by keyword; 48 shipped agent rows
  had been authoring `primaryKeyword:` into a void). So `KeptAnimal`
  composes `NamedMixin` **explicitly** — which is exactly what naming a
  pet should cost — and must **not** compose `PerceptibleMixin`, which
  now arrives from the base and would be a double declaration.
  ⚠ It still composes **no** `Behaved`, `PostRegistration`, `Mobile`,
  `Engaged`, `Sensor`, `Status` or `Persistable`. `Character`
  (`Character.ts:95`) adds the agency stack including `Mobile`, `Engaged`,
  `Sensor`, `BeliefStore`, `Persona`, `Vocal`, `Caster`.
- ⚠⚠ **The farm dog's brain has never run.** `WorkingAnimal`
  (`packages/content/trade-ranching/src/agent/WorkingAnimal.ts`) is
  `HandledMixin(HandlingMixin(Creature))` — no `BehavedMixin`, no
  `PostRegistrationMixin`. ⚠ It read
  `HandledMixin(HandlingMixin(PerceptibleMixin(Creature)))` when this
  plan was written; the presentation build deleted the local
  `PerceptibleMixin` from both `WorkingAnimal` and `Livestock` when it
  put `Perceptible` on `Creature` — ⭐ *a fix that needs a local
  re-composition usually means the host is wrong one level up*. The row
  (`trade-ranching/content/trade/ranching/agent/farm-dog.yaml`) authors
  `behaviors: [{ brain: /trade/ranching/behavior/herds, cadenceMs: 300000 }]`:
  the `behaviors` field is `BehavedMixin`'s (`Behaved.ts:117`) so the
  Hydrator discards it, and `cadenceMs` is not a key `Behaved._parseTrigger`
  knows (it wants `trigger: cadence:300s`). `working-animals.test.ts`
  imports the `herds` brain directly (`:22`) and never composes it onto the
  class. `Livestock` (`Livestock.ts`) is the same shape plus
  `ProducingMixin` + herd binding; it is untouched by this build.
- **`PitPony`** (`trade-mining/src/agent/PitPony.ts`) is the one Behaved
  animal: `BehavedMixin(HaulingCreature)`, and `HaulingCreature`
  (`mud/platform/agent/HaulingCreature.ts:29`) is
  `MountableMixin(PostRegistrationMixin(Character))` — a **Character**-tier
  body. Not a precedent for a Creature-tier kept animal.
- **The canary** (`trade-mining/content/trade/mining/agent/canary.yaml`) is
  `/platform/agent/Extra` with `behaviors: [{ brain: /trade/mining/behavior/reads-air, trigger: cadence:20s }]`,
  species `.../serinus/canaria` (`adultMass: 0.02`, `diet: herbivore`,
  `lifespanMax: 10`). `reads-air.ts` emits behaviour lines through
  `MessageApi.scene` directly — the shipped precedent for *an animal whose
  reaction is the instrument*, emitted as behaviour, not as a report.
- **Brains** — contract at `mud/lib/behavior/brain.ts` (sole export
  `export const brain = class {…}`, statics `label / claims / requiresFree /
  presenceGated / ambient / act`). `BrainContext.say/emote/emoteFree` are
  **no-ops on a host without Vocal/Soul** — an animal's behaviour must be
  emitted with `MessageApi.scene(host)`. `wanders.ts` is the traversal
  exemplar (`LocomotionApi.traverseWithDefault(mob, exit)` requires
  `Stuff & Mobile & Containable`). `Behaved._currentPlayers` (`Behaved.ts:499`)
  counts a room occupant as audience iff it is a `Sensor` and **not**
  `Behaved` — so a Behaved animal never keeps another brain awake.
  Cadence fires gate on `AppApi.isWorldOpen()` (`:405`). Witness triggers
  ride the host's own `SensorMixin.handleMessage` — the host must compose
  `SensorMixin`. Slot contention rides `EngagedMixin`. No `follows` brain
  exists; `shifts` teleports (`shifts.ts:82`, `mob.teleport(dest)`).
  Roster: kernel `lib/behavior/` (23 brains) + pack `src/behavior/`.
- **Locomotion** — `LocomotionLogic.traverseWithDefault` (`:455`) preloads
  anatomy, resolves the default mode and runs `engageAround`, which calls
  `actor.setEngagedMode` — a `Mobile` method (`Mobile.ts:177`), so
  `EngagedMixin` is needed only for brain slot contention.
  `Exit.canTraverse(mover, mode?)` (`Exit.ts:806`) reports `blocked ·
  locked · closed …`; `Exit.getDestination()` (`:320`) is sync,
  `resolveDestination()` (`:727`) is `StuffApi.singleton(path)` — rooms are
  lazy and clone on first resolve. Only pack `boot:` entries are eager
  (`backend/BootstrapManager.ts:201`). No kernel pathfinding exists; the
  only BFS is transport's `ServiceRoute` (a pack).
- **Doors** — `Door = LockableMixin(SealableMixin(Boundary))`; all three
  conduits and `Exit.canTraverse` gate on `isOpen()`
  (`docs/subsystems/boundary.md:378–420`). A closed door stops a brain's
  traverse with no code.
- **Picking up an animal** — `GetController.ts` has no living-thing
  refusal; the only creature-aware gate is the giver's encumbrance lift
  (`:386`). `Creature` is Containable. Carrying a cat works today, gated
  by mass alone.
- **`give`** force-moves (`GiveController.ts:100`, one `ContainmentApi.move`).
- **Eating** — `EatController.ts` discrete arm (`:60–120`): edibility is
  `material.getEdibility() === true`; portion `METABOLIC_DEFAULTS.EAT_PORTION_LITRES`;
  payload `Freshness.withDose(null, material, load)` then
  `Contamination.withLoads(payload, pathogens)` (`:140–151`);
  `BulkableApi.ingestSolid(giver, material, portion, payload)`
  (`mud/api/bulk.ts:168`); then `StuffApi.destruct(target)`. The dish arm
  uses `Freshness.ingestPayloadOf(slot)`. `MetabolicMixin.ingest` is
  `Metabolic.ts:1236`. Gauges: `getFreshnessBand()`
  (`mud/lib/material/Freshness.ts:803`, bands
  `fresh · tainted · spoiled · rotten`), `getPathogenLoads()`
  (`mud/lib/material/Contaminable.ts:613`). A contaminated thing renders
  **identically** to a clean one (`docs/subsystems/spoilage.md § What a
  player sees`) — the silent population the requirements build on.
- ⭐⭐ **Metabolism and absence.** `MetabolicMixin.reconcileMetabolism`
  (`Metabolic.ts:579`) drops any gap over `MAX_REASONABLE_GAP_SEC = 4 game
  hours` (`:203`) **unless `integratesLongAbsence()`** (`:669`), which is
  `isChattel && isStamped()` — *"yes iff somebody owns it."* Full→empty at
  basal: hydration 2.3 game-days, satiation 3.5 game-days; then
  `DEHYDRATION_LETHAL_SEC = 8 game h`, `STARVATION_LETHAL_SEC = 24 game h`
  (`:243, :272`). At 12×, a **stamped** animal nobody waters is dead in
  roughly 2.6 game-days ≈ 5 real hours; unfed, ≈ 9 real hours. An
  **unstamped** one only integrates while something reads its metabolism.
  Consequences in D5, D12 and § Risks.
- **`PersistableMixin`** — `mud/lib/persistence/Persistable.ts:161`.
  `setPersistenceKey(key, explicit=true)`, `isPersistenceKeyExplicit()`
  (sticky), `shouldPersist()`, `capturesAtShutdown()`, `markForRevert()`,
  `seedBornWith()`, `reseedCast()`. Composed **outermost** by all 14
  composers; none is a Creature. `Plant.ts:222` mints a uuid key lazily
  on `getPersistenceKey()`. `postRegister` no longer auto-drives; the
  establishing context does (`PersistableApi.restoreOrSeed`, or
  `cloneHost` for a nested `{ref,key}`).
- **The spine's shape that a pet fits** — `captureItem`
  (`PersistableLogic.ts:467`) emits `{ ref, key }` for an explicitly keyed
  nested host; `cloneHost(scope, key)` (`:~717`) clones a fresh shell,
  stamps the key, `materializeImpl`s it. `assertUniqueKey` (`:137`) scans
  `StuffApi.findAllByTemplatePath(scope)` for a live sibling with the same
  key. `capturePlacement` (`:159`) records a top-level Containable host's
  own `place` (`{container}` or `{container, containerKey}`) and records
  `null` for a host nested under another persistable host.
  `restorePlacement` (`:198`) lands it via `ContainmentApi.resolveLanding` /
  `StuffApi.singletonOrClone`. `placeIdOf(host)` (`:840`) is
  `scope` or `scope#key` (explicit keys only).
- **The estate** — `EstateEntry` (`mud/lib/persistence/PersistenceSlice.ts:110`)
  is `{ chattelId, templatePath, state, place, mounted? }` — **no `key`**.
  `Estate.captureSlice` (`Estate.ts:166`) re-captures every live good's
  full `state`; `restoreSlice` (`:190`) mints only `place === inventory`
  entries and leaves a room `place` for that room's overlay.
  `overlayOwnedGoods` (`PersistableLogic.ts:869`) runs only inside
  `restoreRecord` — i.e. only for **persistable** rooms — and
  `flushSkippedOwnedGoods` (`:385`) pushes a skipped good's `captureState`
  into its owner's estate. ⚠ So a stamped good standing in a **public,
  non-persistable** room (Hinkley Lane is `/platform/location/SingletonCartesianLocation`)
  is carried in its owner's estate with a `place` no materialize ever
  looks up. That is a pre-existing gap for lanterns; for a pet it is
  fatal, and D12 answers it.
- **The container-slice skip rule** (`ContainerMixin.captureSlice`, and
  `docs/subsystems/persistence.md § Props and cast`) drops a live avatar,
  a player-stamped good, and a **`Behaved`** occupant (cast, never
  content). A Behaved, stamped animal is skipped twice over and reported
  through `noteOwnedGood`.
- **`ChattelMixin`** — `mud/lib/chattel/Chattel.ts`: `isStamped()` (sync),
  `isOwnerPersisted()` (sync), `setChattelPlace(place)` (the one write
  path), `followCustody()`, `stampChattel(owner)` (mints `_chattelId`),
  `chattelOwner()` (async). The `chattel` row carries the by-room `place`
  index (`ChattelRegistry.placedIn`, `ChattelRegistry.ts:84`).
  `ChattelApi` statics: `evictToStorage · placedIn · release`.
- **Recognition** — `mud/platform/idea/api/RecognitionLogic.ts:345`: the
  instance-recognition branch runs for **every `Organism`** — a stranger
  sees an unrecognized organism's `strangerStem` (its `shortDescription`),
  never its `Named.name`. `MixinApi.isPersona` (`mixin.ts:973`) narrows to
  the `PersonaMixin` composers (Character only). `Stuff.getPresentation()`
  (`Stuff.ts:252`) is `Named.name ?? shortDescription`.
- **Look prose** — `MarkupAugmenter = (text, host, viewer, opts?) => string`
  (`mud/api/mml.ts:130`); `Mml.augment` walks every contributing mixin's
  `static markupAugmenters` (Freshness, Cured, Dyed, Maturing, Bulkable are
  the composers). `StatusMixin` (`docs/subsystems/belief.md § StatusMixin`)
  is the presence affix the room roll-call renders; `MixinApi.isStatus`
  at `mixin.ts:1487`. `Livestock.stockmanRead()` renders the handling
  phrase only inside ranching verbs' own scene lines.
- **`PopulatesMixin`** composes on `CartesianLocation` (`:55`) so the lane
  takes `props:` / `cast:`; a Behaved entry must be `cast:` (the class is
  the check; a Behaved entry under `props:` is a hydrate-time error).
- **Two butcher controllers.**
  `trade-ranching/src/idea/cmd/ranching/ButcherController.ts:49` — live
  animal, `instanceof Livestock`, hardcoded `YIELDS` of live-mass fractions
  (meat .42 × finish, tallow .05, hide .07, bone .12 = 0.66); walked by
  `trade-ranching/src/__tests__/carcass-rows.test.ts`.
  `trade-cooking/src/idea/cmd/crafting/ButcherController.ts:160` — a
  corpse, reads `species.getButcheryYield()` units × skill, seeds the cut's
  freshness from time since death and **its contamination from the gut**
  (`spillGut`, `GUT_FLORA`, `:265`). Three species rows author
  `butcheryYield` (`species-and-names/.../species/{hog,wolf}.yaml`,
  `trade-mining/.../equus/caballus-pumilus.yaml`). No `offal` exists as a
  row or a material anywhere in `packages/content`; the word appears only
  in the ranching controller's comment and help text.
- **Content homes.** `species-and-names/content/stuff/idea/species/` holds
  animals as flat leaves (`wolf.yaml`, `hog.yaml` → `/stuff/idea/species/wolf`)
  beside the taxonomic `animalia/...` tree; `pack.yaml` says the pack owns
  the catalogue and *a trade's domesticates ship in that trade's pack*.
  `generic-objects/content/stuff/agent/` holds exactly `Corpse.yaml`;
  `generic-objects/pack.yaml` claims `/stuff/thing/vessel` and
  `/stuff/thing/items` (and the loose rows ride the host's `/stuff`).
  `hinkley-hills/package.json` already depends on `generic-objects`;
  `generic-objects` depends only on `platform` (it does **not** depend on
  `species-and-names`). The terminus general store's own goods are rows
  under `terminus/content/world/terminus/general-store/thing/`
  (`waterskin.yaml`, `lantern.yaml`, …).
- **Verb names.** Taken: `feed` (`bulk/feed.yaml` — compost onto ground),
  `walk`, `play`, `handle`, and ⚠ **`stay`** — an alias on
  `platform/cmd/combat/intervene.yaml` (`verbs: [intervene, stay]`, arg
  `requires: VisibleMixin`, which binds an animal too). Free (verified):
  `pet · call · name · offer · wait · settle · heel · hold · tame · adopt`.
  Same-verb collisions across sources resolve at assemble by shape, then
  recency (`docs/subsystems/command-routing.md:8–17`); two `stay` views
  whose args both bind a visible animal cannot be told apart by shape.
- **Command categories** (`platform/content/platform/cmd/`): author,
  banking, boundary, bulk, charactergen, civics, combat, crafting, device,
  employment, governance, inventory, medical, movement, perception,
  posture, retail, shell, social, stream, system, tpa, work. `social`
  holds `introduce`, `talk`, `emote` (acts directed at another being);
  `inventory` holds `give`, `put`, `drop`. A verb affordance is a
  **static on a class or mixin** (`HandledMixin` is the pure-carrier
  exemplar); a row's `commandContributions:` is dead.
- **The gates.** 39 `lint:*` scripts in `packages/server/package.json`
  (29 when this plan was written), run as one by `lint:family` (derived
  roster — never enumerate them; `lint:family --list` prints it). `check-perishable.ts` is
  the textual data→class gate to mirror: it walks every pack's rows,
  finds enabling data (`spoilActivationEnergy`), and fails a row whose
  class's composition (followed through `extends` and imports) does not
  reach the required mixin. `check-identity.ts:285` censuses characters
  **by `behaviors:`**, classifies `Cast` vs `Extra` by whether the class
  composes `CastMixin`, and applies the article rules — a non-Cast animal
  row with an indefinite `shortDescription` and no `name` passes.

---

## Plan-level decisions

Numbered so waves and commits can cite them. The ten open engineering
questions from the handoff are answered at D3 (Q1), D14 (Q2), D8 (Q3),
D6 (Q4), D4 (Q5), D15 (Q6), D11 (Q7), D2 (Q8), D13 (Q9), D12 (Q10).

### D1 — A belief store persists under a durable **unique** key, or not at all

`viewerKey(viewer)` (`BeliefStore.ts:315`) becomes the *durable-unique*
key:

| viewer | key | where its beliefs live |
|---|---|---|
| an explicit persistence key (`isPersistable && isPersistenceKeyExplicit`) | — | ⭐ **its own `holder_snapshots` record**, via a new `BeliefStoreMixin.captureSlice / restoreSlice` pair (D2) — never the `beliefs` collection |
| a stamped identity (`getIdentityPath() !== getTemplatePath()`) — an Avatar | `getIdentityPath()` | the `beliefs` collection (unchanged) |
| a singleton (`MixinApi.hasMixin(ctor, Mixins.Singleton)`) — every `Cast` | `getIdentityPath()` | the `beliefs` collection (unchanged) |
| anything else — an `Extra`, an unnamed stray, a generic clone | `null` | **session-local only**: `know`/`forget` still work in memory; no write-through, no hydrate |

Why: the shipped rule ("durable-`templatePath` NPCs persist; generic
clones are session-ephemeral by construction") was true only while every
NPC row happened to be a singleton. Two sentries share one template path
and would share one Mongo record. The slate's *"identity and durability
arrive together or neither"* is exactly this table: a viewer whose
identity is not unique by itself gets no durable memory. ⭐ A stray cat's
regard for you accumulates **in memory** before it is named — that is
what makes naming possible — and is discarded at reboot, which is the
requirements' *"an unnamed animal is free."*

### D2 — Hydration seams: `postRegister` for a singleton, the slice for a keyed host

- **Singleton NPCs (W0):** `CastMixin.postRegister` (`Cast.ts:157`) gains
  `await this.hydrateBeliefs()` after the super chain — a self-call from
  an instance method, which is what `SelfOnly` admits (the `Avatar.enter`
  shape). Write-through per record is already live, so no flush seam is
  needed for an NPC that never destructs.
- **Keyed hosts (W1):** `BeliefStoreMixin` gains static `captureSlice`
  (every learned record, `{ beliefs: BeliefRecord[] }`) and `restoreSlice`
  (`host.loadBelief(rec)` for each — an ungated install). No call to
  `hydrateBeliefs` is needed, and its `SelfOnly` gate is untouched. ⚠ The
  restore frame is `ExecutionContextApi.run(host, principal, …)`, whose
  *caller* is the host but whose executing target is the principal, so
  `host.hydrateBeliefs()` from a restore hook would be denied whenever the
  owner is online — do not go that way.
- Why not one path: a keyed host's opinion *is its state* and belongs in
  the capture the slate named ("the pet's regard for you is the pet's own
  state and belongs in its capture"); an NPC has no record of its own.

### D3 — A role-filler holds no personal regard: a declared hook on the rung, not a key trick

`BeliefStoreMixin` gains a `@hook` `keepsPersonalRegard(): boolean`
(default `true`), consulted by the sealed `adjustRegard` / `setRegard`
(a `false` host no-ops — the record is never created, so nothing
accumulates in memory either). `platform/agent/Extra` overrides it to
`false`. Recognition (`learnIdentityOf`) stays session-local on an Extra
(D1 gives it no key) so a sentry can still greet you once per session —
a role behaviour, not an opinion. The institution-held opinion the slate
designed (`EmployedMixin.institutionPath()` as the viewer) is Wave 2 and
attaches at this same hook.

Why declared: the cat is also a non-singleton non-Cast and **must** hold
regard, so "not Cast ⇒ no regard" is false; the mask is a fact about the
rung, and `Extra` is the rung.

### D4 — One kernel class for a kept individual animal; the cat and the collie both clone from it

`mud/lib/creature/KeptAnimal.ts` (substrate) with the shared-name twin
`mud/platform/agent/KeptAnimal.ts` (`import { KeptAnimal as KeptAnimalBase }`
— the `Thing`/`Vessel`/`Corpse` twin rule). Composition, outer → inner:

```
PersistableMixin(                // outermost — the documented host rule
  BehavedMixin(                  // its postRegister chains super, then wires
    PostRegistrationMixin(       // the clone-pipeline marker
      BondedMixin(               // D7 — the bond, the verbs, the home
        StatusMixin(             // legible attention (D13, AC 8)
          BeliefStoreMixin(      // regard, keyed by D1
            HandlingMixin(       // the shipped temperament axis
              EngagedMixin(      // brain slot contention
                MobileMixin(     // traverse — follows / homes
                  SensorMixin(   // witness triggers
                    NamedMixin(Creature)))))))))))   // ⭐ a pet HAS a name
```

⚠⚠ **Corrected by the presentation build (2026-09-10).** It was
`PerceptibleMixin(Creature)`, on the reasoning that an animal is
addressed by what it is. Both halves moved underneath this plan:

- `PerceptibleMixin` is **on `Creature`** now — every body is
  addressable, and composing it here would declare `fieldMeta` twice.
  `Livestock` and `WorkingAnimal` dropped their local copies for the
  same reason.
- `NamedMixin` is **off `Creature`** — a body is not a somebody — so a
  kept animal has to say it composes one. ⭐ That is the right cost:
  naming the cat is the moment it stops being *a* cat, and the class
  that can hold a name declares so.

See [presentation.md](../subsystems/presentation.md) — the presentation
plan is retired; the composition it settled is documented there.

`Persistable` outer of `Behaved` is safe: `Persistable.postRegister` only
chains, `Behaved.postRegister` chains super *then* wires, so the single
call the clone pipeline makes reaches both. `Mobile` requires a
Containable base (Creature). No `Vocal`, `Soul`, `Caster`, `Persona`,
`Advancement` — an animal does not speak, cast, hold a job or a
transcript (the slate's objection to `Character`).

- The cat row names `/platform/agent/KeptAnimal`.
- `trade-ranching`'s `WorkingAnimal` becomes `HandledMixin(KeptAnimal)`
  (importing `@saxonberg/server/mud/lib/creature/KeptAnimal`) — *the
  collie moves nowhere and gains the capability in place*, and its brain
  finally runs. The farm-dog row's `behaviors:` entry is corrected to
  `trigger: cadence:300s`.
- The canary row's class moves from `/platform/agent/Extra` to
  `/platform/agent/KeptAnimal`. ⚠ This is the one place the requirements'
  "nothing else about it changes" is not literally true: an `Extra` is by
  D3 the thing that holds no opinion, so a canary that bonds cannot stay
  one. Its brain path, species, description and mass are unchanged;
  `reads-air` keeps working because `KeptAnimal` composes `Behaved`.
- `Livestock` is untouched: a drafted head's durability is the herdbook,
  not a record of its own, and it has no brain.

Why kernel: the composers (`generic-objects`' cat, `trade-ranching`'s
collie, `trade-mining`'s canary) have no common pack ancestor — the
standing test. Why a class and not a bag of mixins per row: ten mixins in
a fixed order is exactly what a `platform/` concrete class is for, and
"a second companion species is two rows and no code" (AC 25) needs a
class to name.

### D5 — The stray is an unkeyed clone; **naming** is the promotion, and it does four things at once

`name <animal> <name>` (the `NameController`, D14), once the animal has
chosen you (D7), in one act:

1. `setName(name)` — public thereafter (D10);
2. `stampChattel(giver)` — title, chain of title, and ⭐ the
   `integratesLongAbsence()` flip: from this moment its clock runs while
   you are away;
3. `setPersistenceKey(SecurityApi.uuid())` (explicit) + `setChattelPlace(placeIdOf(room))`;
4. `PersistableApi.capture(animal, key)` — the first record; the owner's
   estate gains a `{ key }` reference entry (D12).

Nothing else transitions. Before naming: real, present, interactable, no
record, no title, no key, session-local regard (D1). After: a keyed,
titled, named host that comes back as itself. This is the slate's
*clone → keyed clone*, and "identity and durability arrive together"
is literally steps 2–4 being one method.

### D6 — The feeding vessel is a marker over the shipped vessel shape

`mud/lib/husbandry/Feeder.ts` — `FeederMixin`, a pure carrier
(`_mixinName = 'FeederMixin'`, `Mixins.Feeder`, `MixinApi.isFeeder`),
composed on one concrete class `mud/platform/thing/Feeder.ts`:

```
FeederMixin(BulkableMixin(ContainerMixin(DetailedMixin(Thing))))   // the PlantPot / CraftVessel shape
```

Interior bulk for water and milk (`fill`, `pour`, `drink` all ship),
contents for scraps and cuts (`put` ships). What it adds: the thing the
`feeds` brain looks for (D13), and a concept a gate can name. What it
deliberately does not add: any hunger read, any schedule, any "for cats".
Rows: `/stuff/thing/vessel/saucer` and `/stuff/thing/vessel/trough`
(generic-objects), both `class: /platform/thing/Feeder` — the second row
is AC 26's proof and ships in W1d. The campus farm's scenery trough stays
a bare `Thing`. A Thing is Chattel, so a bought saucer persists with its
owner and its contents (a `Provision` with `Freshness`) spoil on the
shipped clock — the neglect signal, with no code.

### D7 — The bond is regard × handling; `BondedMixin` carries the rest

`mud/lib/husbandry/Bonded.ts` — `BondedMixin` (`Mixins.Bonded`,
`MixinApi.isBonded`). It **requires** `BeliefStoreMixin` and
`HandlingMixin` beneath it (composed side by side on `KeptAnimal`, never
nested — the `Handled`/`Handling` inference lesson) and narrows with the
two predicates inside.

- `bondWith(person): number` in `[0,1]` = `clamp01(regardFor(person)/100) × getHandling()`.
  ⭐ **Cooling is the shipped handling decay**: regard (the memory of you)
  does not decay; tractability does, to the species floor (D8). *"It
  becomes harder, not feral."*
- Fields (persistent): `home: string` (a place identity, D11);
  `homeCandidate`, `homeCandidateDays`, `homeCandidateLastDay` (D11);
  `waiting: boolean` (D14); `followedKeys: string[]` — the identity paths
  of persons it has followed home at least once (the naming gate).
- Thresholds are **documented module constants** (dials, not fields):
  `TOUCH_BAND = 'wary'` (handling band at or above which a hand is
  permitted), `FOLLOW_BOND = 0.5`, `NAME_BOND = 0.6`, `PET_REGARD = +6`,
  `HAND_FEED_REGARD = +10`, `ILL_FROM_HAND_REGARD = −25`, `FEEDER_REGARD = 0`.
- `wouldComply(person): boolean` = `getSpecies().getBiddability() × bondWith(person) ≥ 0.5`
  — deterministic, never a roll (uncertainty.md bans resolutional
  randomness). A cat at `biddability 0.1` never complies; a collie at
  `0.9` complies once well bonded; a half-bonded collie does not.
- `canEvict` vetoes while stamped and alive — a named animal is not a cold
  object (the `HasInteractive`/`WarrenMember` shape).
- `static commandContributions.peers = ['platform/cmd/social/pet.yaml', 'platform/cmd/social/call.yaml', 'platform/cmd/social/stay.yaml', 'platform/cmd/social/name.yaml', 'platform/cmd/inventory/offer.yaml']`
  — the verbs are afforded by the animal, to whoever stands beside it.
- A `markupAugmenter` appending the bearing line to `look`: handling band
  phrase (`handlingPhrase()`, shipped) plus one of three bond sentences
  toward the **viewer** (it moves off · it holds its ground · it comes to
  you). Band words, no number.

### D8 — Species carries the two dials; both nullable; the gate closes the triangle

On `Species` (`platform/idea/species/Species.ts`), authorable:

- `handlingRange: { floor: number; ceiling: number } | null` — read by
  `HandlingMixin.reconcileHandling` (floor, else `DECAY_FLOOR`) and
  `HandlingMixin.handle` (clamp to ceiling, else 1). *Winnability rides
  the existing slot*, exactly as the requirements say.
- `biddability: number | null` (0–1) — read by `BondedMixin.wouldComply`.
- `lifespanMin` / `lifespanMax` gain `authorable: true` (rows already
  hydrate them; this only makes the studio schema honest).

Three states, as the slate demands: a species authoring neither is *not
in the conversation*; `{ floor: 0, ceiling: 0.2 }` is *declared
unwinnable*; a real range is *winnable*. The new gate
`packages/server/scripts/check-kept-animals.ts` (`lint:kept-animals`,
auto-joined to `lint:family`) fails CI in **both** directions: a species
that authors either dial but is named only by agent rows whose class does
not reach `BondedMixin`; and an agent row whose class reaches
`BondedMixin` but whose species authors no `biddability`. Textual, the
`check-perishable.ts` shape.

### D9 — Age: a `senescent` stage reads as old; death of age bites for **non-sentient animals only**

- `LIFE_STAGES` gains `'senescent'` after `aged`; `lifeStageAt` returns it
  at `≥ senescentAt` (the field that exists and nothing reads);
  `isMature()` includes it (its one other reader, `BreedController.ts:78`,
  is unaffected).
- `OrganismMixin` gains a `markupAugmenter` that appends a stage sentence
  for `aged` / `senescent` bodies only — *"It is grey about the muzzle and
  slow to rise"* / *"It is very old."* Band words; players never reach it
  (`getLifeStage()` is `null` for them). ⚠ This claims that **every
  organism whose species authors a curve** reads its age when old — the
  farm species today. That is the honest scope; narrowing it to companions
  would be a guard re-narrowing the host.
- `OrganismMixin.reconcileSenescence()`: when `getLifeStage() === 'senescent'`,
  the species is **not sentient**, and `getAgeDays() ≥ lifespanMax × 365`,
  call `ConditionApi.die(host, 'old age')`. Driven by the `feeds` beat
  (D13), so in W1 it fires for kept animals; any later ranching beat can
  drive it for stock. Persons are excluded by the `sentient` test, which
  is precisely the succession problem `race.md` reserved — this build
  leaves it reserved.

⚠ **Flagged for the user** (see § Risks): the requirements decided death
of age; `race.md` decided against wiring it. D9 satisfies the former
inside the boundary the latter drew. The sweep must update `race.md`.

### D10 — An animal's name is public: recognition withholds names from **persons** only

`RecognitionLogic.ts:345`: the instance-recognition branch narrows from
`MixinApi.isOrganism(target)` to `MixinApi.isPersona(target)`. A
non-person organism renders its presentation (`Named.name`, else
`shortDescription` rendered through its `register:`) to every viewer: an
unnamed stray is "a thin cat" to all, and Mouse is "Mouse" to all. `NameController` also runs
`learnIdentityOf` over everyone present (the `introduce` shape) so the
naming is a witnessed act. Why: recognition exists so a *person* can be a
stranger, disguised, or impersonated; an animal cannot be any of those
and the requirements say plainly *"it has a name, and names are public"*
— the finder's second route. `isPersona` is structural (no dependence on
a warmed species), which is why it and not `isSentient` is the test.

### D11 — Home is a place identity, and it moves by feeding

`home` is a string in exactly the form `PersistableApi.placeIdOf` produces
(`scope` or `scope#key`), resolved with the routine `restorePlacement`
uses (`StuffApi.singletonOrClone` for a plain scope; `ContainmentApi.resolveLanding`
for a keyed one — expose as `PersistableApi.resolvePlace(placeId)`, a
forwarding shell to the logic). Set at first `postRegister` from the
birth room when null. **It moves** when the animal has eaten from a
`Feeder` in one room on **three distinct game days** (`homeCandidate*`
fields) — the requirements' "where it has been fed and kept". A closed
door makes the third day arrive; nothing about the door is a feature.

### D12 — Persistence of a named animal: its own keyed record, the estate as coordinator, a boot roll for public rooms

Three changes to the spine, all additive:

1. `EstateEntry.key?: string` (`PersistenceSlice.ts:110`). `Estate.captureSlice`
   and `flushSkippedOwnedGoods` write `{ chattelId, templatePath, key, state: {}, place }`
   for a good that is a Persistable host with an explicit key — a
   **reference**, since the good persists itself. `Estate.restoreSlice`
   (owner login) and `overlayOwnedGoods` (a persistable room's
   materialize) branch on `key`: if no live instance carries
   `(templatePath, key)` (the `assertUniqueKey` scan, exposed on the
   logic as `liveKeyed(scope, key)`), `cloneHost(templatePath, key)` — the
   animal's own record lands it (`restorePlacement`) wherever it was.
2. ⭐ `mud/platform/idea/KeptAnimalRegistry.ts` (`/platform/idea/KeptAnimalRegistry`,
   a platform-pack row, added to `platform/pack.yaml § boot:` with
   `role: producer, reason: named animals stand in public rooms nothing
   else materializes`). Its `postRegister` reads
   `PersistedRecord.find({ 'state.BondedMixin': { $exists: true } })` and
   `cloneHost`s each record not already live. The `ChattelRegistry`
   precedent exactly: a singleton index warmed from its collection at
   boot. Why it is needed: rooms are lazy and public rooms have no
   record, so nothing else would ever stand Mouse back up on the lane —
   and a friend must be able to feed it, a stranger find it, while its
   person is offline.
3. The animal captures itself on its own mutating acts —
   `PersistableApi.captureHostOf(host)` after naming, a traverse, a meal,
   a home move — and at shutdown / eviction through the shipped seams.
   After every self-move it also calls `followCustody()` so the chattel
   row's by-room index and the estate entry's `place` stay true.

Not changed: `Estate.restoreSlice`'s rule that a plain room `place` is
that room's job. ⚠ The latent lantern-on-the-street gap this grounding
found is **not** fixed here; it is recorded as a seam (§ Deferred).

### D13 — Three kernel brains, and the perception channel is behaviour emitted as scene lines

All under `mud/lib/behavior/`, generic (no content word), emitting only
through `MessageApi.scene(host)` since the host has no Soul:

- **`follows`** — trigger `departure`. If the departed subject is a
  person with `bondWith ≥ FOLLOW_BOND` and `waiting` is false: find the
  exit whose (already-resolved) destination now contains them; if the
  destination holds an armed `Hazard` (`MixinApi.isHazard && isArmed()`),
  stop at the threshold — one fixed line, *"<it> stops at the doorway
  and will not go in"* — else `traverseWithDefault`. Records the person
  in `followedKeys`. ⭐ The line names the act, never the cause: no
  template ever carries "danger", "trap" or "poison".
- **`feeds`** — cadence `60s`, `presenceGated = false`, `ambient = false`.
  Reads the room for a `Feeder` and for a pending hand-offer. ⚠ **For an
  unstamped animal with nothing to eat in reach it returns before reading
  metabolism** — otherwise the beat itself would integrate the stray to
  death on the lane (Grounding, metabolism). With food present: refuse
  when not hungry (satiation high — *"it sniffs and walks off"*), refuse
  `getFreshnessBand() !== 'fresh'` (*"it will not touch it"*), refuse
  **silently-contaminated** food when any `getPathogenLoads()` value
  exceeds the species' olfactory threshold (`keen → 0.10`, `ordinary →
  0.35`, `dull → never`) — the same words, so the refusal never explains
  itself; otherwise ingest via the EatController discrete arm exactly
  (`Freshness.withDose` + `Contamination.withLoads` + `BulkableApi.ingestSolid`,
  destruct the item), or drink from the feeder's interior bulk (the
  `DrinkController` arm). A hand-offer eaten credits `HAND_FEED_REGARD`
  and `handle(0.5)` to the offerer; contaminated food eaten from a hand
  (a dull nose) costs the offerer `ILL_FROM_HAND_REGARD`. Feeder meals
  credit nobody (`FEEDER_REGARD = 0`) and advance the home candidate
  (D11). Each beat ends with `reconcileSenescence()` (D9).
- **`homes`** — cadence `90s`, `presenceGated = false`, `ambient = false`.
  If `home` is set, the animal is not there, `waiting` is false, and no
  person with `bondWith ≥ FOLLOW_BOND` is in the room: breadth-first over
  `getExits()` to eight hops, admitting an exit only when
  `exit.canTraverse(host, 'walk').ok`; take **one step per beat** toward
  home (visible, room by room, through doors that are open). No path —
  stay put. That is the whole of "lost": a closed door and no announcement.

The brains are wired by the **rows** (`behaviors:` on the cat, the collie,
the canary), not by the class — data, as `behavior.md` insists.

### D14 — Verbs: four social, one inventory; `stay` (freed from combat 2026-09-08)

Controllers in `mud/platform/idea/cmd/social/` and `.../inventory/`,
views in the platform pack, arg `requires: BondedMixin`, validators
`requiresAnimate` + `requiresConscious` (the `handle.yaml` shape). No new
category: these are acts directed at another being (`social`) and a
hand-over (`inventory`).

| verb | controller | does | refuses (always legibly) |
|---|---|---|---|
| `pet <animal>` | `PetController` | `handle(0.5)` + `adjustRegard(giver, PET_REGARD)` | handling band below `TOUCH_BAND`, or `bondWith < 0.15`: *it moves off* |
| `offer <food> to <animal>` | `OfferController` | at `wary`+ it takes from the hand (the `feeds` refusal rules run inline); below, the food is set down and `pendingOffer` is recorded for the next beat — *"it waits until you step back"* | not edible; not hungry; turned; silently contaminated |
| `call <animal>` | `CallController` | if `wouldComply` and the animal holds no status: it comes (a traverse into your room when adjacent, else a step toward you); clears `waiting` | not bonded: *it looks at you*; not biddable: *it looks at you* (the same line — the cat); attending: the refusal line **quotes its status** (D7's `StatusMixin`) |
| `stay <animal>` | `StayController` | if `wouldComply`: `waiting = true` (it stays until called or until you `pet` it) | as `call` |
| `name <animal> <name>` | `NameController` | D5's four steps, then `learnIdentityOf` over everyone present | `bondWith < NAME_BOND` or giver not in `followedKeys` (*it has not chosen you*); already named; a name matching a live `Cast`'s `getName()` or any online player's name, case-insensitively (the naming slate's Defence B, partially — see § Deferred) |

✅ **`stay` is this build's, ruled 2026-09-08.** It was an alias on
combat's `intervene.yaml`, whose arg binds anything Visible, so the two
could not be separated by shape — one of them had to give it up.

**Drop `stay` from `intervene.yaml`'s `verbs:` list** (leaving
`[intervene]`) in the same wave that adds `StayController`; check
`intervene`'s `help` prose and any test asserting the alias. `wait` /
`settle` are retired from this plan.

⭐ The reasoning generalised into
[command-spec.md § Choosing between them](../subsystems/command-spec.md):
*a bare verb is something your body does; a subcommand is something you
operate* — and **a collision is evidence that one of the two is on the
wrong side of that line.** Telling a companion to stay is your voice to a
creature in front of you. Combat's sense is a standing tactical
instruction, and combat's own doctrine is already set-policy-then-watch.
⚠ Re-homing the tactical sense onto the formation surface is **not this
build's job**; dropping the alias is.

### D15 — Offal is a row, in both yield tables; the two butcher models are **not** unified here

- New material `/stuff/idea/material/food/offal` (beside the `stew-meat`
  material row; perishable, `edibility: true`) and new Provision
  `/stuff/thing/items/offal` (generic-objects, class `/platform/thing/Provision`,
  mirroring `items/stew-meat.yaml`).
- Ranching `ButcherController.YIELDS` gains
  `{ row: '/stuff/thing/items/offal', fraction: 0.12, what: 'offal' }`
  (real offal is 10–15 % of live weight; the rest of the missing third is
  blood and gut contents, which stay unmodelled). `carcass-rows.test.ts`
  walks the table and covers it.
- The three `butcheryYield` rows (hog, wolf, pit pony) gain an
  `{ cut: /stuff/thing/items/offal, units: n }` line, so the cooking
  `butcher` yields it too, gut-seeded like every other cut.
- **Deferred, said plainly:** the ranching controller stays on live-mass
  fractions × condition and the cooking one on authored units × skill.
  They encode two different truths (dressing by condition vs. cuts by
  skill) and reconciling them is ranching's D28 follow-on. AC 11 holds by
  either verb without it.

### D21 — A place asks for its goods; it does not persist to get them — ⚠ REVERSED by D22

⚠⚠ **Added 2026-09-16, in review**, when the user asked which collection
persistence uses and pushed on `findWithLayer`; **reversed 2026-09-17**
(D22) when the user asked what actually loads a pet.

**What was wrong.** D12 stood named animals up with a boot roll —
`KeptAnimalRegistry` scanning `holder_snapshots` for
`{'state.BondedMixin': {$exists: true}}`. ⚠ That collection is indexed on
`scope`, `owner` and `(scope, owner)` — **identity lookups** — so the roll
was an unindexed scan at every boot, asking an identity-keyed store *"give
me every record of a KIND"*. A query shape against the grain is the tell
of a special case, and this was one.

**What D21 did, and why it was the same problem again.** It put
`PersistableApi.reclaimOwnedGoods(this)` on `CartesianLocation.postRegister`
— **every** room, on load, asking the `chattel` index *"who is recorded as
standing in me"*. Indexed, so cheap per call; but 439 point queries at boot
and one on every lazy room load, which is the room doing work to find
things that are not its own state — *the room scan wearing a different
face*, in the user's words. The user's rule (persist on the CONTAINABLE,
which remembers where it spawns; the container manages nothing but its
own hydration) was right, and D21 honoured it on the wrong side: the
containable remembered, and then the container went looking anyway.

**Kept from D21:** the `chattel.place` index (the D4 overlay inside the
four self-persisting location classes and `evictToStorage` read it), the
deletion of `KeptAnimalRegistry` and `findWithLayer`, and the
`EstateEntry.key` reference shape. **Deleted:** the `postRegister` hook,
`PersistableApi.reclaimOwnedGoods`, its allowlist row.

---

### D22 — The residency pin: the load half, on the object, rolled once at boot

⚠⚠ **Added 2026-09-17, in review.** The user: *"the cat loads whenever
something needs to load it. the room doesn't need to load it — if it did
we would have made the room persistable not the cat."* Then: *"something
needs to load before the pet in order for the pet to load… if the game
reboots, your pets don't get created until you log in. if we're trying to
simulate care then that's a hole."*

**The reframing that decided it.** *What loads X* already has one answer
in this game: whatever needs to observe X — and nearly everything
reconciles on read, so an unloaded thing still ages; what it cannot do is
**emit**. The care hole is exactly the set of objects with a brain whose
events must happen while nobody is looking: the cat wandering, coming to
a door, being fed by a neighbour, dying in front of somebody. A chair is
never in that set; a cask is not (maturation reconciles); a named animal
is. So the opt-in is not "eager with the estate" — it is **the load half
of residency**, the mirror of `canEvict`.

**The mechanism (this MR):**

- `Persistable.pinsResidency()` — a `@hook`, default false; `KeptAnimal`
  answers true (on the class, because `Persistable` is the outermost
  layer and a mixin further in could not override its default).
- `ChattelRecord.pin: {scope, key} | null` — stamped on the **same gated
  write as `place`** (`ChattelLogic.applyPlace`), when the class opts in,
  the good persists itself, and it has an explicit key; cleared when the
  good goes to `storage` or `inventory`. So a pinned good carried off and
  dropped elsewhere is re-pinned where it now stands, and the index can
  never drift from the field.
- A **partial index** `{pin.key: 1}` on `chattel` — exactly the pinned
  set; a world with no pets pays nothing.
- `ResidencyLogic.pinNow()` — the roll, armed once by `ResidencyWarden`
  at boot beside the eviction/reset/spawn sweeps (the manifest's
  `dependsOn` now names the chattel and parcel registries, because
  standing a good up resolves its place, which reads title). Reads the
  index, `standUpKeyed` per pin (resolve-or-mint), counts, and a pin whose
  place cannot resolve logs and skips — the animal reads as *lost*, which
  is a thing that can happen to an animal, rather than a boot failure.
- `Estate.restoreSlice` — a **keyed** room-placed entry is stood up by the
  owner's login through `RestoreContext.standUpKeyed`, resolving first;
  usually a resolve, because the roll got there. A keyless one (a chair)
  stays deferred to its room's D4 overlay as before.
- `NameController` sets the persistence key **before** the place, so the
  pin lands on the row at the promotion.

⭐ **What it is, said honestly: pinning, not swap.** Page-in at boot and
at login (a process start or a human act — never an *access*); page-out
only through the ordinary cold-tail sweep once the pin lapses;
**no fault** — nothing in the game can trigger a load by touching a
good, and no room asks for what stands in it. The day a fault is wanted
("the neighbour walks onto the lane, so load the lane's cats"), that is a
pager, and the room scan wearing a third face; the design says so in
writing so nobody builds it by accident.

**What is slated, not built** (`eager-residency-slate`): the roll admits
**every** pin today. Who may honour one — the owner's activity tier (two
tiers of account, with what membership may and may not mean), the
parcel's compute allowance (the committee's say over its own ground), the
degradation order under pressure — is governance the user named and the
property slate already has the vocabulary for.

**Driven live, twice, on the final code** (drive record below). ⚠ It also
found that this plan's **drive record overclaimed**: the wire file was
`.dirty.` with a reason naming three acts it never performs, and its
suite 9 ("the refusal must LIFT") asserted only that `offer` was a word
— the keeper holds no food, so the verb asks *what*. Corrected: the file
is `pets.wire.test.ts` (clean), suite 9 asserts the `no-food` refusal by
note and records the **producer gap** (nothing on the lane yields food a
stray would take — a finding for `hinkley-hills`), and the lift stays
`Bonded.test`'s.

---

### D20 — `call` is a sound; `stay` is a sign

⚠⚠ **Added 2026-09-16, in review.** The user asked whether calling and
staying a pet *"actually exercise audibly"*, whether anything sets how far
you can call from, whether this wants a shared `shout` instead of its own
verb, and — the sharpest of the four —

> **"what about the 'stay' command some dogs that's not even an audible
> command its a gesture that they're trained with"**

**The answer to the first was no.** Both verbs emitted
`MessageApi.scene(...).topic('act.deed')` — a modality-neutral frame,
same room only. A mute player could call a dog, a deaf one heard it, a
shut door meant nothing, and the dog next door heard nothing. ⚠ The
engine has a full acoustic model none of it used: `Scene.toAudible` →
`AudienceGather`, with a dB source level, per-recipient hearing
threshold, per-hop attenuation and a directional line in farther rooms.
**A whistle was modelled better than calling your dog.**

⭐⭐ **Making `call` an emission dissolved a problem D14 could not solve.**
It had been narrowed to `scope: [reachable]` because MQL has no adjacency
scope, so an animal next door could not be *named* by the player — which
killed the plan's "it comes from next door". A sound has no targeting
problem: **you call, and whatever hears you decides.** `animalName` is a
`string` now — a word you shout, matched against a name or a keyword —
and omitting it reaches everything in earshot that knows you, because
that is what shouting in a yard does. `CALL_DB = 85`; the walk takes
~20 dB per room, so it carries next door and not much further.

⭐⭐ **`stay` is a gesture, so it needs line of sight.** The two verbs now
fail in different places, which is the honest difference between a word
and a sign rather than a cosmetic one:

| | channel | stopped by |
|---|---|---|
| `call` | earshot | a shut door · distance |
| `stay` | line of sight | a corner · the dark · its back turned |

⚠ **And the check runs the other way**: `PerceptionApi.perceives(animal,
actor)` — *the animal seeing YOU*, not you seeing it. Those come apart
exactly where it matters: in an unlit room you can know perfectly well
where your dog is and still have no way to signal it. The refusal names
what you observe — *it is not looking at you* — so a missed sign and an
ignored one read alike, which is this build's standing rule about never
explaining an animal.

**Kept as its own verb, not folded into `shout`.** A dog answers to a
SIGNAL, not to language; `shout` is free-form prose, and folding them
would mean parsing intent out of words an animal does not understand.
They share the acoustic path without sharing a verb.

⚠ **No voice vitals.** `emit` takes its level per call and no body carries
a loudness attribute, so range is a constant on the verb rather than
something a character modulates. Whether a body should have one is real
and wider than pets; not opened here.

---

### D19 — An animal knows the way home; it does not solve a graph

⚠⚠ **Added 2026-09-16, in review.** D18 moved the `homes` BFS onto
`MobileMixin` and flagged it as the shakiest change in the cleanup. The
user stopped it:

> **"is this pathfinding? Because if we're going to introduce pathfinding
> into the game let's do it in one place for every consumer to share."**

It was. And the tree already had **three independent graph searches** —
`FireLogic` (rooms, flood fill), transport's `LaneCatalogue.planRoute`
(a compiled lane network, shortest in legs), and this one — over three
different graphs with three different admission rules.

⭐⭐ **But the better finding is that `homes` did not need one.** The BFS
worked and was wrong: a cat carried across the city computed an optimal
route home through streets it had never seen. That is a satnav, not a
cat — and it quietly made **lost impossible**, since any animal within
eight hops always solved it.

**The replacement is memory.** `BondedMixin.trail` holds the places the
animal has been since it was last home; `homes` steps toward the earliest
one reachable from where it stands. `rememberPlace` runs **before every
early return**, so a room it was merely carried through is recorded —
without which an animal set down would have no way back at all.

The rules fall out rather than being specified:

- revisiting a remembered place **rewinds** the trail to it, so walking
  in a circle forgets the circle;
- arriving home **clears** it — there is nothing to find your way back
  from;
- the earliest reachable entry is taken, so it uses any shortcut it
  recognises and never walks away from home;
- the trail is **capped** at 16, because a week-lost animal must not be
  better at getting home than one that stepped out this morning.

⭐ And *lost* is now real rather than nominal: **an animal carried
somewhere it has never been cannot get back**, and nothing announces it.
⚠ This narrows drive step 24 honestly — a carried-off animal returns if
it recognises ground along the way, and if it was carried far and fast it
is lost. That is better drama than the guarantee the search gave, but it
is a change to what the step asserts and the sweep must say so.

The general question is slated: `pathfinding-slate` carries the
three-walk census and, as its first acceptance test, *do the two shipped
walks actually migrate?* — because a shared primitive with one consumer
should not exist.

---

### D18 — Five bespoke helpers, and where each of them belonged

⚠⚠ **Added 2026-09-16, in review.** The user asked why `NameController`
minted a `witnesses()` function for something the codebase has several
solutions for, and asked what else in the MR was doing that. Five things
were. Each already had a home, and one of them was **wrong** as well as
bespoke.

| minted | the home it belonged in |
|---|---|
| `NameController.witnesses()` | **`MessageApi.getSensors(env)`** — what `IntroduceController` uses three files away. ⚠ The private version walked `room.getContents()`, so it would have called `learnIdentityOf` on the saucer and the food |
| `NameController.refuse()` + `OfferController.say()` | **`CommandController.refuse()`** |
| the handling-band comparison, verbatim in `Pet` + `Offer` | **`HandlingMixin.handlingAtLeast(band)`** — the band ORDER is that file's fact |
| `edible(thing)`, in the brain and again in `Feeder.offerings()` | **`Tangible.isEdible()`** — the thing knows what it is made of |
| `firstStepHome()` BFS in `homes.ts` | ⚠ first `Mobile.firstStepToward()` — then **reverted entirely**; see D19 |

⭐ **The `refuse` collision was diagnostic.** Adding it to the base broke
the build: *"Property 'refuse' is private in `AnalyzePostmortemController`
but not in `CommandController`"* — a **fourth** controller had minted the
same helper. A subclass shadowing a concept the base should own is the
signal. Folded (3 call sites, its suite green).

⚠ **Not done here, deliberately: the tree-wide migration.** 164
controllers do the scene+note pair by hand; the base method is used by
six. The seam now exists and nothing is forced through it, which is an
honest half-measure rather than a finished one. It wants a census and a
ratchet of its own — `docs/lint-family.md`'s pattern — not a sweep buried
inside a pets MR.

⚠ **`Mobile.firstStepToward` was flagged for the user and the user
rejected it.** See D19 — it was pathfinding, and it is gone.

⭐ Moving the BFS also fixed the test shape: the brain test had been
standing up rooms and exits to exercise a search it merely CALLS. It now
asserts the decision — asks, acts, holds when waiting — and `Mobile` owns
six tests for the search, including *a closed door is not a longer way
round, it is no way at all*.

---

### D17 — Feeding is a LADDER, and the rungs are a species fact

⚠⚠ **Added 2026-09-16, in review, after the user asked why `FeederMixin`
conferred nothing.** Chasing that question found a dead loop.

**The bug.** The cat ships at `handling 0.25` — *flighty*. `TOUCH_BAND`
is `wary` (0.40). `pet` refuses below the band; `offer` below the band
set the food down and returned *before* `eatFood`; the `feeds` brain ate
with `offerer: null`, which credited nothing; and `KeptAnimal` composes
no `HandledMixin`, so ranching's `handle` verb cannot reach a cat.
**Handling could only decay.** The cat was untameable — the one thing the
build exists for — and every suite was green, because the collie ships at
0.55 and was already over the line. ⭐ The drive asserted that `pet`
refuses and never that the refusal **lifts**: it tested the closed door
and called it a feature.

**The rule, chosen by the user.** A meal nobody handed over raises
**handling** and **no regard at all** (`FEED_HANDLING_QUALITY = 0.25`, a
quarter of a hand). Feeding an animal makes it less *afraid* of you; it
does not make it *fond* of you. Those are the bond's two factors and they
are earned differently — proximity and routine buy tractability, only a
hand buys affection. ⭐ So *the floor stays delegable and the bond does
not*: a friend who keeps the dish filled keeps your cat alive and
approachable and wins none of it. Drive step 15, preserved exactly, and
now with a bottom rung under it.

**The rungs.** `Species.feedingStyle: FeedingStyle[] | null` over
`hand · ground · graze · bowl · trough · hopper`. Absent means *not in
this conversation*, the same rule the other two dials follow.

| | rungs |
|---|---|
| cat | `bowl · ground · hand` |
| collie | `bowl · ground · hand` |
| canary | `hopper` — ⭐⭐ **no hand rung, ever**, and no ground |

⚠ **Stock is deliberately left absent.** The illustration that opened
this conversation had `stock → [graze, trough]`, but nothing reads
`graze` in this build, and authoring a rung no code consumes is the exact
dead-declaration shape this build kept finding in shipped content. It
goes in when a grazer reads it.

**`FeederMixin` confers the other half** — `feederKind`
(`bowl · trough · hopper`), `offerings()`, `lastFilledBy` and a
markup augmenter. ⚠ It was a bare marker, the only mixin in the tree that
conferred nothing, and the file justified itself by citing `HandledMixin`
as a "pure carrier" — which carries `commandContributions` and confers a
verb. There was no such category; I invented one.

**The gate grew a third direction:** a species naming a vessel kind no
shipped row provides. That is the same triangle as the other two, and
without it the canary's `hopper` would have been a rung nothing could
satisfy — a bird refusing every bowl in the game and starving silently.

---

### D16 — `[mine]` is the explicit stamp, plus title over an extent

`isMine(target, giver)`: true when `ChattelLogic.stampedOwnerOf(target)`
is `{ kind: 'player', templatePath: giver.getIdentityPath() }`; or, for a
target with a template path under a parcel, when
`ParcelLogic.coveringParcelOf(path)?.holder` is the same player arm. Not
the author rung (`authorOf`) — a row you wrote is not a possession — and
not group-held title. Both reads are synchronous and in-memory.
⭐ The test pins that `find world:mine` renders a name per row and that
neither the rendered MML nor `REF_FIELDS`/`DETAIL_FIELDS` carries a
container or location field.

---

## ⭐⭐ Host placement

| new thing | host | what composing it claims about everything else on that host |
|---|---|---|
| `viewerKey` rule (D1) | `lib/belief/BeliefStore.ts` (module) | every `BeliefStore` viewer without a durable-unique key is session-local — Extras, strays, generic clones. Avatars and singletons unchanged. |
| `keepsPersonalRegard()` hook (D3) | `BeliefStoreMixin`, overridden `false` on `platform/agent/Extra` | only the role rung is masked; every other belief host holds regard as before |
| `BeliefStore.captureSlice / restoreSlice` (D2) | `BeliefStoreMixin` | a keyed persistable host's beliefs ride its record; Avatar (keyless) contributes an empty slice — byte-identical records |
| `KeptAnimal` (D4) | `lib/creature/KeptAnimal.ts` + twin `platform/agent/KeptAnimal.ts` | an individual kept animal behaves, moves, senses, can be handled, can bond, persists when keyed. Nothing already composes it. `Livestock` does **not** move onto it. |
| `BondedMixin` (D7) | `KeptAnimal` only (kernel) and, through it, `WorkingAnimal` (ranching) | every kept animal can be won over; the species row says how far (D8). Not on `Creature` — the slate's three-states argument: a wolf must be able to *not apply*. |
| `handlingRange`, `biddability` (D8) | `Species` | every species may declare; the gate makes a declaration on a bond-less class a CI failure |
| species floor/ceiling reads (D8) | `HandlingMixin` | every handling host that is an Organism honours its species' range; a non-Organism host or a silent species keeps the module constants — no behaviour change for shipped stock |
| `'senescent'` + `reconcileSenescence()` + the age augmenter (D9) | `Species.LIFE_STAGES` / `OrganismMixin` | every curved organism reads old when it is; only non-sentient organisms die of it, and only when something drives the reconcile |
| `FeederMixin` (D6) | `platform/thing/Feeder` | a vessel an animal feeds from; content adds vessels, never code |
| `EstateEntry.key` (D12) | `lib/persistence/PersistenceSlice.ts` / `EstateMixin` / `PersistableLogic` | an owner's estate may hold a reference to a good that persists itself; every existing entry (no `key`) is unchanged |
| `KeptAnimalRegistry` (D12) | `platform/idea/KeptAnimalRegistry.ts`, boot-listed by the platform pack | named animals are live from boot wherever they stand |
| the three brains (D13) | `lib/behavior/{follows,feeds,homes}.ts` | generic: any Behaved host a row wires them onto; they narrow with `isBonded` / `isMobile` / `isMetabolic` and no-op otherwise |
| the five verbs (D14) | afforded by `BondedMixin.commandContributions.peers`; controllers in the platform categories `social` / `inventory` | anyone beside a bonded animal may try; the animal answers |
| `isMine` (D16) | `api/mql/predicates.ts` | every giver may ask; ownership never locates |
| recognition narrowing (D10) | `platform/idea/api/RecognitionLogic.ts` | a non-person organism's name is public to every viewer; persons unchanged |
| `offal` (D15) | rows in generic-objects; a line in ranching's `YIELDS`; lines in three species rows | nothing structural |

**The narrowing test, applied.** No new guard in this plan re-narrows a
host set: the age line is on `Organism` because every old organism looks
old; the bond is on `KeptAnimal` and not on `Creature` because a wolf
must be able to not apply; the feeder is a class of its own and not a flag
on `Vessel` because a wine barrel is not something an animal feeds from.
The one guard that *looks* like a narrowing — `feeds` not reading an
unstamped animal's metabolism — is a clock rule the metabolism doc
already states (*"only the inhabited body gets the guard"*), applied to
the one host whose beat would otherwise read it to death.

---

## Convention conformance

Checked at plan time against the current tree:

- **`props:` / `cast:`** — the lane's stray is a `cast:` entry
  (`KeptAnimal` composes `Behaved`; a `props:` entry would fail at
  hydrate). `populates:` is retired.
- **Locations, not rooms** — nothing here is a room; the lane is a
  `SingletonCartesianLocation` and stays one. `home` is a place identity,
  never a "room" field.
- **`<root>/<branch>/`** — `/platform/agent/KeptAnimal`,
  `/platform/thing/Feeder`, `/platform/idea/KeptAnimalRegistry`,
  `/stuff/agent/cat`, `/stuff/idea/species/cat`, `/stuff/thing/vessel/{saucer,trough}`,
  `/stuff/thing/items/offal`, `/stuff/idea/material/food/offal`;
  controllers at `/platform/idea/cmd/<category>/<Name>Controller`, views
  at `platform/cmd/<category>/<verb>.yaml`. Brains at `/lib/behavior/<name>`.
- **Module scope declares** — the brains export one named
  class-expression; the registry initializes in `postRegister`; no
  module-scope statements.
- **Import boundary** — nothing new imports `fs`/`path`/backend;
  `KeptAnimalRegistry` reads through `PersistedRecord` (a `Document`);
  ranching imports `KeptAnimal` by package specifier.
- **Verbs on objects** — `bondWith`, `wouldComply`, `handle`,
  `adjustRegard`, `stampChattel`, `followCustody` are all methods on the
  animal; controllers call them. No `XApi.verb(host, …)` — `lint:object-verbs`
  stays at zero.
- **No new module category, no free helper.** One new mixin subsystem
  folder is *not* needed: `Bonded.ts` and `Feeder.ts` join
  `lib/husbandry/` beside `Handling.ts` (the concern they model is
  husbandry — the requirements' own placement of the axis). A module-
  private (non-exported) BFS inside `homes.ts` is not an exported helper.
  `PersistableApi.resolvePlace` and `KeptAnimalRegistry` are the only Api
  / singleton additions, both forwarding shells in existing subsystems.
- **`Collections`** — no new collection (`holder_snapshots`, `beliefs`,
  `chattel` carry everything); `lint:schema` unaffected.
- **`_mixinName` widens to `string`** on both new mixins.
- **Lint gates this build must pass** (the derived family; named because
  each is touched): `lint:instanceable` (two new platform twins, one
  registry, six new rows), `lint:census` (every new path-valued field:
  `_speciesPath`, `cast:`, `behaviors[].brain`, `butcheryYield[].cut`,
  `_materialPath`), `lint:identity` (the cat and collie rows are censused
  by `behaviors:` as non-Cast characters — indefinite article, no name,
  non-sentient: pass), `lint:field-meta` (every new field declared),
  `lint:arg-kinds` (five new views), `lint:perishable` (`offal` rots on a
  `Provision`), `lint:pathogens`, `lint:topics` (reuse `act.deed` for the
  social acts and `sense.survey` for refusals — no new topic key),
  `lint:untitled` (`/stuff/thing/vessel` and `/stuff/thing/items` are
  claimed by generic-objects; `/stuff/agent/cat` rides the host's
  `/stuff` like `Corpse`), `lint:imports`, `lint:module-scope`,
  `lint:object-verbs`, `lint:test-bootstrap`, `lint:does-nothing`,
  `lint:world-scan` (the registry's warm reads the collection, not a
  world scan), plus the new `lint:kept-animals`.
- ⚠⚠ **Ten gates were added after this plan was written** (29 → 39;
  the roster is DERIVED from `package.json`, so they all run whether or
  not a plan names them). Baseline re-verified 2026-09-15: **all 39
  pass** on master. The four that bite this build:
  - **`lint:verb-collisions`** — two views may not claim one verb. This
    is now the mechanical enforcement of Risk 5: the wave that adds
    `stay.yaml` must drop `stay` from `intervene.yaml` in the same
    commit, or the gate fails. ⭐ It exists because a second view
    claiming a verb used to **shadow the first silently** — nine
    collisions had shipped.
  - **`lint:binder-models`** — five new arg-bearing views land here, and
    a controller test that builds its model by hand skips the binder
    entirely. The gate exists because a declared arg on `consign` broke
    `farms`, `cellars` and `restocks` mid-branch with every test green.
  - **`lint:presentation`** — no article on a stem, ceiling 0. See W1d.
  - **`lint:drive-scripts`** — ceiling 0. See W1e.
  Satisfied already: **`lint:mixin-names`** (W1a puts `Mixins.Bonded` /
  `Mixins.Feeder` in the kernel const, which is exactly what it
  demands — ⚠ and note a *pack* mixin may no longer go there since the
  2026-09-14 federation; both of these are kernel). Not a constraint:
  **`lint:lib-statics`** (ceiling 337) **excludes statics declared
  inside a mixin factory's returned class expression**, so `Bonded`'s
  and `Feeder`'s `captureSlice` / `restoreSlice` /
  `commandContributions` do not count against it.

---

## Waves

Each wave lands independently and ends at a commit. `pnpm test:near` +
every touched pack's own vitest + `pnpm -C packages/server lint:family`
between waves; the full suite once, before the MR.

### W0 — the ground is clear (kernel)

**Goal.** AC 23, 24, and the role-filler goal. Decisions D1, D2 (the
singleton half), D3, D16.

**Files.**
- `mud/lib/belief/BeliefStore.ts` — `viewerKey` per D1's table; the
  `keepsPersonalRegard` hook consulted by `adjustRegard`/`setRegard`; the
  `captureSlice`/`restoreSlice` statics (D2 — landed here with a keyed
  fixture test, consumed in W1b).
- `mud/lib/npc/Cast.ts` — `await this.hydrateBeliefs()` in `postRegister`
  after the super chain, before `_seedDossier`.
- `mud/platform/agent/Extra.ts` — `keepsPersonalRegard(): false`.
- `mud/api/mql/predicates.ts` — `isMine` per D16 (import `ChattelLogic`
  / `ParcelLogic` through their Apis' sync faces: add
  `ChattelApi.stampedOwnerOfSync(item)` and `ParcelApi.coveringParcelOfSync(path)`
  as forwarding statics if the logic methods are not already reachable
  from the predicate module without a boundary breach — check
  `lint:imports` first; `predicates.ts` is under `api/`, so importing the
  logic singletons via `StuffApi.singletonSync` is the shipped pattern).
- `docs/mql-grammar.md` — `:mine` is no longer a stub (a one-line edit;
  index files are swept, this is not one).

**Tests.** `BeliefStore.test.ts`: (a) a `Cast` fixture's regard survives
`clearBeliefs` + `hydrateBeliefs`; (b) two Extras writing regard produce
zero `BeliefDocument`s and zero in-memory records; (c) an unkeyed clone's
`adjustRegard` accumulates in memory and writes nothing; (d) a keyed
fixture's slice round-trips. `predicates.test.ts`: a stamped good is
`mine` to its owner and to nobody else; a parcel-titled location likewise;
an authored-but-unstamped good is not. `FindController` test: the rows
for `world:mine` contain no location, and `REF_FIELDS` ∪ `DETAIL_FIELDS`
contain no `container` / `location` name.

**Acceptance.** Drive steps 1–5 pass against the running game.

**Commit.** `build(pets W0): NPC regard survives a restart, [mine] answers, a role holds no opinion`.

> ✅ **DONE 2026-09-15** — `36b8cb2a3`. 2,720 tests green, all 39 gates.
>
> **What surprised the build.** Two gates refused the first draft and
> both were right, so both were taken the compliant way:
> `lint:object-verbs` refused `ChattelApi.stampedOwnerOf(Stuff)` — the
> read belongs ON the good, so it became `ChattelMixin.stampedOwner()`
> and the Api static is gone; `lint:whole-table` refused
> `allBeliefs().filter(isLearned)` inside the new capture, so the store
> answers the question itself via `learnedBeliefs()`.
>
> ⚠ **The belief fixtures were modelling the bug.** Seven tests failed on
> the D1 change, and none of them was a regression: the suite faked an
> Avatar by registering at an Avatar-SHAPED *template* path with no
> minted identity — structurally a generic clone — and one assertion read
> `expect(doc.viewerId).toBe(viewer.getTemplatePath())`, which is the
> keying antipattern `CLAUDE.md` names in capitals. `makeStuffAtPath`
> gained an optional identity argument so a fixture can model the D17
> split, and the assertions now read `getIdentityPath()`. ⭐ The lesson
> is the recorded one: a fixture that fakes the shape instead of
> composing it passes until the rule it fakes gets stricter.
>
> `ParcelApi.coveringParcelOf` turned out to be `async` over a wholly
> synchronous registry read; rather than change a signature ~every caller
> awaits, W0 added `coveringParcelOfSync` beside it. Noted as a tidy-up,
> not fixed here.

### W1a — the substrate (kernel)

**Goal.** Everything the content needs to exist, with no content yet.
Decisions D4, D6, D7, D8, D9, D10, D14.

**Files.**
- `mud/platform/idea/species/Species.ts` — `handlingRange`, `biddability`
  (fieldMeta authorable, setters with range checks, getters);
  `lifespanMin/Max` authorable; `LIFE_STAGES` + `lifeStageAt`.
- `mud/lib/species/Organism.ts` — `isMature` includes `senescent`;
  `reconcileSenescence()`; the age `markupAugmenter`.
- `mud/lib/husbandry/Handling.ts` — read the species range when the host
  is an Organism with a species that authors one.
- `mud/lib/husbandry/Bonded.ts` (new), `mud/lib/husbandry/Feeder.ts` (new),
  `mud/lib/mixin.ts` (`Mixins.Bonded`, `Mixins.Feeder` + the two
  "isn't" phrases), `mud/api/mixin.ts` (`isBonded`, `isFeeder`).
- `mud/lib/creature/KeptAnimal.ts` (new, substrate),
  `mud/platform/agent/KeptAnimal.ts` (new, twin),
  `mud/platform/thing/Feeder.ts` (new).
- `mud/platform/idea/api/RecognitionLogic.ts` — D10.
- Controllers: `mud/platform/idea/cmd/social/{Pet,Call,Stay,Name}Controller.ts`,
  `mud/platform/idea/cmd/inventory/OfferController.ts`. Views:
  `packages/content/platform/content/platform/cmd/social/{pet,call,stay,name}.yaml`,
  `.../inventory/offer.yaml`. ⚠ `stay.yaml` carries `verbs: [stay]` and
  nothing else — `wait`/`settle` are **retired** (Risk 5, ruled
  2026-09-08), and this wave is also the one that drops `stay` from
  `intervene.yaml`. `lint:verb-collisions` is what proves the drop
  happened before the new view lands.
- `packages/server/scripts/check-kept-animals.ts` (new) +
  `"lint:kept-animals"` in `packages/server/package.json`.
- `packages/content/platform/content/platform/idea/KeptAnimal.yaml`? — **no**:
  `KeptAnimal` is a class rows name, not a row; the twin needs no template.
  `Feeder` likewise.

**Tests** (`__tests__` beside each): `Bonded.test.ts` — `bondWith` is
regard × handling; cooling comes from handling decay to the species floor
and never from regard; `wouldComply` is deterministic across the
cat/collie table in the requirements. `Handling.test.ts` — the range
clamps and the silent-species fallback. `Organism.test.ts` — senescent
stage, `reconcileSenescence` dies for a non-sentient curved species past
its span and never for a sentient one or a player. `RecognitionLogic`
test — a named `KeptAnimal` fixture renders its name to a stranger; a
named Character does not. `check-kept-animals` test — both directions
fail on synthetic rows. Controller tests for each verb's refusal table
(⚠ controller tests skip the binder — the affordance itself is proven in
W1d's live drive and by a `CommandApi` affordance test on a `KeptAnimal`
fixture).

**Acceptance.** Every test above green; `lint:family` green with the new
gate in the roster (`lint:family --list`); a `KeptAnimal` fixture affords
the five verbs.

**Commit.** `build(pets W1a): KeptAnimal, the bond over regard × handling, the feeder, five verbs, the species dials`.

> ✅ **DONE 2026-09-15.** All 40 gates pass — `lint:kept-animals` joined
> the roster **by existing**, which is the derived-roster property doing
> its job.
>
> **Decisions the build made that the plan did not:**
>
> 1. ⭐⭐ **`ingestPayload()` moved onto the FOOD.** `OfferController` and
>    the `feeds` brain both need the discrete-item ingest payload, and
>    `EatController`'s private `ingestPayloadFor` carried a docstring
>    warning that a fact not copied across that line "fails silently and
>    completely: the suite stays green, the food is bad, the eater is
>    fine." A second copy was exactly that failure, so the synthesis
>    became `Fresh.ingestPayload()` — a verb on the object, read entirely
>    from the food's own mixins — and `EatController` now calls it. ⭐ The
>    reason it was ever private is that there was only one mouth; there
>    are two now.
> 2. **`wouldEat` / `eatFood` live on the animal**, not in the
>    controller, for the same reason: the verb and the beat must reach an
>    identical answer or a player learns to launder food through a dish.
> 3. **The name-collision defence is partial and says so.** It refuses a
>    connected player's name; the live-`Cast` half needs a name index
>    nobody has built, and the naming slate owns Defence B. Recorded
>    rather than faked.
> 4. **`offer`'s food arg takes `requires: VisibleMixin` +
>    `mustBeEdible`** — the pair `eat` already uses. `lint:arg-kinds`
>    caught the missing `requires:`; edibility is a fact about the
>    MATERIAL, so no mixin can gate it and the validator is what reads it.
> 5. `SURPLUS_SATIATION = 70` mirrors `METABOLIC_DEFAULTS.FLESH_SURPLUS_AT`
>    — an animal in *maintenance* still takes a scrap; refusing at
>    anything less would make a well-kept animal untreatable.
>
> ⚠ **A second fixture that modelled the shape instead of composing it.**
> Eight recognition tests failed on D10. None was a regression: `Being`
> in `describeFor`/`describeForm` is a fixture named *Bob* standing in
> for a person, composing `Organism + Named` and **not** `Persona` — so
> the moment recognition became a person-only gate it read as an animal
> and published its name. Composing `PersonaMixin` fixed all eight. That
> is now twice in one build (the belief fixtures in W0), which is a
> pattern worth naming in the sweep.
>
> ⚠ The senescence tests assert **the decision, not the choreography**:
> `ConditionApi.die` owns the dying arc and is tested where it lives, and
> a bare `OrganismMixin(Thing)` has none of the body a real death needs.
> What this file proves is the three conditions.

### W1b — naming is the promotion (kernel persistence)

**Goal.** AC 3, 4, 25's durability half. Decisions D5, D11, D12, and D2's
keyed half now consumed.

**Files.**
- `mud/lib/persistence/PersistenceSlice.ts` — `EstateEntry.key?`.
- `mud/lib/chattel/Estate.ts` — capture emits a reference for a keyed
  host; restore materializes it when not live.
- `mud/platform/idea/api/PersistableLogic.ts` — `flushSkippedOwnedGoods`
  and `overlayOwnedGoods` branch on `key`; `liveKeyed(scope, key)`;
  `resolvePlace(placeId)`; `mud/api/persistable.ts` forwards `resolvePlace`.
- `mud/platform/idea/KeptAnimalRegistry.ts` (new) +
  `packages/content/platform/content/platform/idea/KeptAnimalRegistry.yaml`
  (the trivial platform-pack row every framework registry rides) +
  `packages/content/platform/pack.yaml § boot:` entry.
- `NameController` finishes D5 (it was a stub refusing everything in W1a
  if the build prefers to land W1a without persistence; otherwise it lands
  here whole).
- `BondedMixin` — `home` seeding at `postRegister`, the home-candidate
  bookkeeping, `canEvict`.

**Tests.** `Persistable.test.ts` / `Estate.test.ts`: a keyed `KeptAnimal`
in an owner's estate captures as a `{ key }` reference with empty state;
owner materialize with the animal not live clones + materializes it into
its recorded room; with it live, does nothing; a persistable room's
overlay does the same and never double-mints. `KeptAnimalRegistry.test.ts`:
boot warm stands up every bonded record and skips live ones. A round-trip
test: name → capture → destruct → registry warm → same name, same regard
for the namer (through the belief slice), same handling, same home.

**Acceptance.** Drive step 25 (log out, log in — and a server restart —
the animal is itself) passes with a fixture animal named in the
test-login seam.

**Commit.** `build(pets W1b): naming is the promotion — a keyed record, a titled animal, a boot roll`.

> ✅ **DONE 2026-09-15.**
>
> ⭐⭐ **The plan proposed new surface that turned out to already exist.**
> D12 called for `liveKeyed` + `resolvePlace` on the logic. But the
> **`{ ref, key }` ContentEntry** shape was already there, already
> documented as *"a nested host is a reference — never absorbed, because
> it persists itself"*, and `cloneHost` already did the keyed
> resolve-or-mint. The estate needed the same idea, not a new mechanism.
> So W1b added `EstateEntry.key` beside the existing container-slice
> concept and reused the machinery underneath.
>
> ⚠ The one genuinely new thing is **`PersistableApi.standUpKeyed`**, and
> `restoreItem` is why: its ref branch moves the resolved host INTO the
> caller, which is right for a nested chest and would teleport a pet into
> its owner's inventory on login. `standUpKeyed` resolves without moving,
> and resolve-FIRST is the load-bearing half — three unrelated callers
> (owner login, room materialize, boot roll) must all ask it, or the
> world gets two identical cats sharing one record.
>
> ⚠ **`persistence-spine.test.ts` refused it**, correctly: `PersistableApi`
> carries an enumerated surface allowlist where every entry states why it
> is not a raw record write. `standUpKeyed` is a resolve-or-materialize —
> it reads a record and reconstitutes, writing none — and now says so in
> the list.
>
> The estate-capture tests stub the host to its two reads rather than
> fighting the `SelfOnly` gate on `_putEstateEntry`: what is under test is
> the **decision** (copy or reference), and the security machinery has its
> own suite.

### W1c — the brains (kernel)

**Goal.** Following, feeding, going home, the reactions. Decision D13.

**Files.** `mud/lib/behavior/follows.ts`, `feeds.ts`, `homes.ts` (new);
`docs/subsystems/behavior.md` canned-brains table rows (a doc the build
owns — not an index file).

**Tests** (`lib/behavior/__tests__/`): `follows` traverses behind a bonded
person and not behind a stranger; stops at a threshold whose room holds
an armed hazard and emits a line containing no cause word; `waiting`
holds it. `feeds` — the four refusals in order; an unstamped host with
nothing in reach leaves `metabolicClockStamp` untouched; a feeder meal
credits nobody; a hand-offer credits the offerer; a contaminated
hand-offer eaten by a `dull` nose costs the offerer; home moves on the
third distinct game day and not the second. `homes` — one step per beat
along an open path; no step when every path crosses a closed door; no
step while a bonded person is present.

**Acceptance.** All green; `lint:instanceable` invariant 8 (brain shape)
green.

**Commit.** `build(pets W1c): follows, feeds, homes — an animal that decides`.

> ✅ **DONE 2026-09-15.** 14 brain tests, stubbed in the `enforces` shape
> (the world reads faked so each brain's own choices are what is under
> test). Three assertions carry the wave:
> the unstamped-with-nothing-to-eat beat never reaches the clock; the
> balk line contains none of `danger·trap·poison·bad air·sick·afraid`;
> and `homes` finding no path simply does nothing, which IS "lost".
>
> ⚠ `OrganismMixin`'s interface needed `reconcileSenescence` declared —
> the method existed on the class but not on the narrowing contract, so
> `MixinApi.isOrganism(host)` did not thread it. A method a brain calls
> through a predicate has to be on the interface, not just the impl.

### W1d — the content (packs)

**Goal.** The cat on Hinkley Lane, the collie in place, the canary
admitted, two vessels, the offal. Decisions D4 (the rows), D6 (rows),
D15.

**Files.**
- `packages/content/species-and-names/content/stuff/idea/species/cat.yaml`
  — `/stuff/idea/species/cat`, the `wolf.yaml` shape: `binomial: Felis
  catus`, quadruped plan, `adultMass: 4`, `diet: carnivore`,
  `olfactoryProfile.acuity: keen`, `lifespanMin: 0`, `lifespanMax: 15`,
  `ageCurve: { weanedAt: 8, matureAt: 120, agedAt: 1300, senescentAt: 1600 }`
  (senescent is *visible* before the span ends — the warning),
  `handlingRange: { floor: 0.15, ceiling: 0.9 }`, `biddability: 0.1`.
- `packages/content/generic-objects/content/stuff/agent/cat.yaml` —
  `/stuff/agent/cat`, `class: /platform/agent/KeptAnimal`,
  `shortDescription: thin cat`, `register: indefinite`,
  `primaryKeyword: cat`, keywords, `handling: 0.25`, `behaviors:` wiring
  `/lib/behavior/{follows,feeds,homes}`.
  ⚠⚠ **The article is NOT in the stem.** The presentation build
  (2026-09-10) moved it out of 634 authored descriptions and into
  `register: indefinite | definite | proper`, and `lint:presentation`
  holds *no article on a stem* at **ceiling 0**. Every new row in this
  wave carries `register:` — the cat, both vessels, the store saucer and
  both offal rows. ⭐ The same build is why `primaryKeyword:` is worth
  authoring at all: `PerceptibleMixin` reached `Creature` only then, and
  before it every agent row's keyword was discarded at hydration.
  ⚠ `generic-objects/package.json` gains `@saxonberg/content-species-and-names`
  as a dependency (the row names a species in that pack; a pack rename or
  new dependency needs `pnpm install` — project memory).
- `packages/content/hinkley-hills/content/world/terminus/hinkley-hills/location/lane.yaml`
  — `cast: [/stuff/agent/cat]`.
- `packages/content/generic-objects/content/stuff/thing/vessel/saucer.yaml`
  and `trough.yaml` — `class: /platform/thing/Feeder`, an interior bulk
  slot each (the `PlantPot` row is the bulk-slot exemplar), each with a
  stem and `register: indefinite`.
- `packages/content/terminus/content/world/terminus/general-store/thing/saucer.yaml`
  — the store's own good, mirroring `waterskin.yaml` line for line
  (class `/platform/thing/Feeder`), so the drive can buy one.
- `packages/content/generic-objects/content/stuff/idea/material/food/offal.yaml`
  and `.../stuff/thing/items/offal.yaml` (D15).
- `packages/content/trade-ranching/src/agent/WorkingAnimal.ts` —
  `HandledMixin(KeptAnimal)`; `.../agent/farm-dog.yaml` — `trigger:
  cadence:300s`, plus `follows`/`feeds`/`homes` wired; the dog's species
  row gains `handlingRange: { floor: 0.2, ceiling: 1 }`, `biddability: 0.9`.
  `.../ButcherController.ts` — the offal line; `carcass-rows.test.ts`
  covers it. `herds.ts` — `setStatus('watching the stock')` while stock
  is in the room and `clearStatus` otherwise (narrow with
  `MixinApi.isStatus`), so `call`'s refusal can quote it (AC 8, drive 29).
- `packages/content/trade-mining/content/trade/mining/agent/canary.yaml`
  — `class: /platform/agent/KeptAnimal`; its species row gains
  `handlingRange: { floor: 0.3, ceiling: 0.8 }`, `biddability: 0` (a
  canary cannot be asked anything). Run trade-mining's vitest.
- `species-and-names/.../{hog,wolf}.yaml`, `trade-mining/.../caballus-pumilus.yaml`
  — an offal `butcheryYield` line each.

**Tests.** Each touched pack's own suite; `working-animals.test.ts` gains
the assertion the build found missing: `WorkingAnimal` composes
`BehavedMixin` and the farm-dog row's `behaviors:` parses. A content test
that the cat row's species authors both dials (the gate proves it at CI;
the test proves it at `test:near`).

**Acceptance.** Every pack suite green; `lint:family` green; the boot
log shows the lane's cast minted and the canary's `reads-air` still
firing.

**Commit.** `build(pets W1d): a thin cat on Hinkley Lane, the collie's brain finally runs, the canary admitted, two vessels, the offal`.

> ✅ **DONE 2026-09-15.**
>
> ⭐⭐ **`lint:kept-animals` failed on its own first real content — and it
> was the GATE that was wrong.** It reported ranching's `WorkingAnimal`
> as unable to bond on the very commit that gave the collie its bond,
> because it read only the `extends` clause. The shape this codebase
> actually recommends is `const FooBase = SomeMixin(Bar); class Foo
> extends FooBase {}` — naming the intermediate stack, because inference
> through nested generic factories collapses to `never` (the `PlantPot`
> lesson). So the walk finds `FooBase`, finds no import for a local
> const, and concludes nothing. It now resolves an extends identifier
> through a local `const` first, and follows package specifiers
> (`@saxonberg/server/mud/…`) as well as relative paths — a pack imports
> the kernel only by specifier, so without that half the gate could never
> have followed any pack class into the kernel at all.
>
> ⚠ Both directions then proven the only way worth trusting: by breaking
> them. Removing the cat's `biddability` fires direction 2; pointing the
> cat row at `/platform/agent/Extra` fires direction 1.
>
> **Two dead links found in shipped content**, both silent, both now
> asserted in `working-animals.test.ts`: the farm-dog row's `cadenceMs:`
> (not a key `_parseTrigger` knows) and `WorkingAnimal` composing no
> `BehavedMixin` (so the Hydrator discarded the whole `behaviors:` block).
> Either alone was enough. **The collie has been standing in the yard
> doing nothing since the ranching build shipped.**
>
> `terminus`'s store-goods allowlist refused `/platform/thing/Feeder` —
> correctly, since it exists to keep Stackable-risking classes off the
> shelf. A Feeder is a Receptacle an animal eats from, no more Stackable
> than the waterskin beside it, and now says so in the list.

### W1e — the drive

Run the requirements' thirty steps against the running game, two
characters, a fresh world (a named-animal record from a previous world
would restore into a lane that has since re-minted a stray — reset the
dev DB, which is the project's stated policy). Append the record under
§ Drive record. Fix what it finds; commit `drive(pets): <what driving
found>`. Then `pnpm test` once, push, open the MR.

⭐⭐ **The drive is BORN a wire file** — added 2026-09-08, after this
plan was written. `lint:drive-scripts` holds a **ceiling of 0** one-off
`scripts/drive-*.ts`, because five of the nine that existed were dead the
day after their MR merged and two had been silently failing on master.
So the steps land as:

```
packages/wire/tests/pets.dirty.wire.test.ts
```

`.dirty.` because this flow **consumes** its world: it stamps a stray
that the lane's `cast:` will not re-mint while a live instance exists
(§ Risks 7), it names an animal into `holder_snapshots`, and it butchers
a carcass for the offal. Export a `DIRTY_REASON` that says what is
consumed, declare the packs the flow needs, and ⭐ offer the reason to
the owning trade's slate as a one-line finding — a dirty reason is a
question about a producer that should be producing.

⚠ Two steps need the friend: step 15 and step 26 (§ Risks). Step 26 must
be run with the second character refilling the saucer — water and
scraps — at least once per game day of the absence, or the animal is dead
on return by the shipped clock, which is the requirements' own rule.

---

## Reachability wiring

Each capability, the four links, each of which fails closed and silent.

| capability | verb | affordance | data | boot |
|---|---|---|---|---|
| NPC regard survives restart | (none — `talk` already writes) | — | the `beliefs` collection, existing | `Cast.postRegister` hydrates when the NPC's room first clones it |
| `[mine]` | `find world:mine` (shipped `find`) | `PerceiverMixin.self` (shipped) | the `chattel` in-memory index, warmed by `ChattelRegistry` at boot; the parcel registry likewise | both registries are already in the platform `boot:` list |
| a role holds no opinion | — | — | — | the `Extra` override is code; nothing to warm |
| the bond | `pet · offer · call · stay · name` | `BondedMixin.commandContributions.peers` — a static on the mixin, so both `KeptAnimal` and `WorkingAnimal` afford it and neither shadows it (the `HandledMixin` `_mixinName` lesson: the mixin **must** carry `_mixinName` or the affordance is lost on the class that declares its own static) | the species dials on `cat`, `familiaris`, `canaria` | the species Idea is warmed by `SpeciesApi.preloadAnatomy` on the animal's first traverse / the controllers call it before reading `biddability` (the reference-Ideas-inert trap, fourth recurrence — every controller and brain that reads a dial calls `preloadAnatomy` first) |
| the vessel | `put · fill · pour` (shipped) | shipped on Container / Bulkable | the two vessel rows + the store row | none needed; a Thing clones when bought or when its room's `props:` runs |
| following / feeding / going home | — | — | the `behaviors:` entries on the three rows — ⚠ the link the collie lacked for a whole build; `lint:census` resolves the brain paths | `Behaved.postRegister` wires at clone; `AppApi.isWorldOpen` releases the beats |
| the named animal comes back | `name` | as above | its `holder_snapshots` record + the estate reference + the `chattel` row | `KeptAnimalRegistry` in the platform `boot:` list, **after** `ChattelRegistry` (a `boot:` list is install order; the registry's `postRegister` must tolerate a room that has not cloned yet by resolving through `singletonOrClone`) |
| offal | `butcher` (both, shipped) | shipped | the material row, the provision row, the yield lines | none — a row |
| reads as old | `look` (shipped) | the augmenter on `Organism` | an authored curve | none |

---

## Acceptance-criteria coverage

| AC | wave | how it is met |
|---|---|---|
| 1 | W1d | the lane's `cast:` cat; the bearing augmenter reads its handling band and bond toward the viewer |
| 2 | W1a + W1d | `pet` refuses below `TOUCH_BAND` / low bond with a behaviour line; hand-feeding raises both axes; no number anywhere (D7's augmenter is band words) |
| 3 | W1b | `name` sets `Named.name`; D10 makes it public; `learnIdentityOf` over those present |
| 4 | W1b | keyed record + belief slice + estate reference + registry warm; drive 25 |
| 5 | W1a | handling decays to the species floor; regard never decays; `bondWith` falls but the animal is still named, titled, present |
| 6 | W1d | `WorkingAnimal = HandledMixin(KeptAnimal)`; `herds` still wired (now actually running) |
| 7 | W1a | `wouldComply` = biddability × bond; cat `0.1`, collie `0.9`; the same `call` view |
| 8 | W1a + W1d | `call` refuses by quoting the animal's status; `herds` sets it while stock is present |
| 9 | W1d | a Provision in a Feeder spoils on `FreshnessMixin`'s clock; `look saucer` shows the band phrase (shipped) |
| 10 | W1c | `feeds` credits `FEEDER_REGARD = 0` |
| 11 | W1d | the offal row from either `butcher`; cure/dry/smoke (trade-cooking, shipped) keep it |
| 12 | W1a + W1c | `stay` sets `waiting`; `follows` and `homes` both honour it |
| 13 | W1c | `feeds`/`offer` refuse at the olfactory threshold with the same line as any other refusal; a contaminated item renders clean (shipped) |
| 14 | W1a | `senescent` stage + the age augmenter; no message, no figure |
| 15 | W1c | nothing announces the crossing; `follows` simply fires once `bondWith ≥ FOLLOW_BOND` |
| 16 | W1c | below the threshold `follows` does nothing; `homes` walks it home; no loss event exists |
| 17 | W1c | home moves on the third feeding day; `homes` returns it there |
| 18 | shipped + W1c | a closed door blocks `homes`'s BFS; no verb, no regard write |
| 19 | W0 | `find world:mine` renders names only; pinned by test |
| 20 | W1c | `follows` fires for the owner in the finder's room; D10 makes the name public |
| 21 | W1c | `call` by a stranger fails `wouldComply` (bond ≈ 0); `homes` returns it when a path is open |
| 22 | W1a/W1c | a stranger's `pet`/`offer` earn regard exactly as the owner's; `stampChattel` is only ever the namer's; no adjudication exists |
| 23 | W0 | D1 + D2 |
| 24 | W0 | D16 |
| 25 | W1a + W1d | two rows: a species with `handlingRange` + `biddability`, an agent row naming `/platform/agent/KeptAnimal`; the gate proves the pair |
| 26 | W1d | `trough.yaml` is the second vessel, two rows, no code |

Nothing is unmapped. Not covered by any AC but in the goals and delivered:
"an animal that is not yet attached goes back where it belongs" (W1c) and
"a companion ages, and dies of it" (D9, W1a — flagged).

---

## Test & gate strategy

- **Unit** (`test:near` loop): everything listed per wave. New tests that
  touch the wired runtime import `test-bootstrap` (`lint:test-bootstrap`).
- **Content tests** in the packs they touch: generic-objects (the cat row
  hydrates onto `KeptAnimal`; the feeder rows), trade-ranching
  (`working-animals`, `carcass-rows`), trade-mining (canary), hinkley-hills
  (the lane's cast mints), terminus (the store row).
- **Only the drive can prove:** that a verb typed at the lane reaches the
  animal (controller tests skip the binder); that the beats run under the
  world-open gate; that a restart brings Mouse back onto a lane whose
  `cast:` has minted a second stray (§ Risks); that the friend's refill
  keeps the animal alive across step 26.
- **Gates:** `lint:family` between waves (39 gates, ~85s, green on
  master as of 2026-09-15); the new `lint:kept-animals` joins the roster
  by existing. `pnpm test` runs exactly twice: before the MR and at
  `/finalize`. ⚠ The four gates added since this plan that bite are
  `lint:verb-collisions`, `lint:binder-models`, `lint:presentation` and
  `lint:drive-scripts` — see § Convention conformance.
- **Benches:** none; no combat dynamics change (`lint:combat-dynamics` and
  `test:gym` untouched).

---

## Risks & opens

Things the build should price, and the places it should stop **only** if
no compliant path exists (per workflow: decide, record, continue).

1. ⚠⚠ **Ownership must never locate** (requirements' hard constraint).
   W0 pins it with a test on `find` and the wire field sets. The build
   must not add a location to `REF_FIELDS`, `DETAIL_FIELDS`, or the
   `find` row for any reason during this build; the pet-shaped
   inspection card (`look mouse`) is reachability-gated and shows
   contents, never container.
2. ⚠⚠ **React, never report.** Every scene line the three brains and the
   five controllers emit is a fixed behaviour sentence authored on the
   brain; no template interpolates the cause. The `feeds` refusal for
   turned food and for contaminated food is **the same sentence**. A
   reviewer grepping the brains for `danger|trap|poison|sick|bad air`
   must find nothing.
3. ~~⚠ **Death of age (D9) contradicts `race.md`'s standing decision**~~
   ✅ **RULED 2026-09-08 — non-sentient only is confirmed.** Proceed as
   D9 has it; the sweep rewrites `race.md`'s reservation to name the
   boundary rather than the blanket. ⭐ Note also that the *span* is a
   dial in authored content, not a doctrine cliff (requirements § A
   companion dies of old age): ship a number, watch, turn it. That is
   why `lifespanMin`/`lifespanMax` becoming authorable is load-bearing
   rather than tidy.
4. ⚠ **Drive step 26 is lethal as written.** A stamped animal integrates
   the whole absence; unwatered it dies in ≈ 5 real hours, unfed in ≈ 9.
   "Stay away a game month" (2.5 real days) is survivable only with the
   friend refilling **water and food** about once per game day (a
   `Provision` in a saucer is `tainted` within a game day or two at room
   temperature). This is the requirements' own rule ("no exemption; the
   floor is delegable") and the plan does not soften it — but the drive
   must be run that way, and the user may want to shorten the step.
5. ~~⚠ **`stay` is combat's.**~~ ✅ **RULED 2026-09-08 — free it.**
   Drop `stay` from `intervene.yaml`'s `verbs:` list (leaving
   `[intervene]`) in the wave that adds the companion verb, and **ship
   `stay` rather than `wait`**; `wait`/`settle` are retired from the
   plan. Check `help intervene`'s prose and any test asserting the alias.

   ⭐ The reasoning is now general doctrine — see
   [command-spec.md § Choosing between them](../subsystems/command-spec.md):
   *a bare verb is something your body does; a subcommand is something you
   operate*, and **a collision is evidence that one of the two is on the
   wrong side of that line.** Telling an animal to stay is your voice to a
   creature in front of you; combat's sense is a standing tactical
   instruction, and combat's own doctrine is already set-policy-then-watch.
   ⚠ Moving the tactical sense onto the formation surface is **not this
   build's** — dropping the alias is.
6. ⚠ **The cat may decline `stay`.** The requirements make every member
   of the closed vocabulary refusable, so a cat at `biddability 0.1`
   never holds; the honest tool for a cat is the door, and the drive's
   step 16 ("leave it behind and it stays") works for the cat only by
   leaving it somewhere its `homes` beat cannot exit — or by `stay` on
   the collie. ✅ **CLOSED 2026-09-08 — the requirements were reworded,
   not the design.** Drive step 16 now has the cat **refuse** `stay` and
   the player use the door; step 29 has the collie hold. `stay` stays
   subject to biddability like every other asked act — *the word is for
   the dog, the door is for the cat* — and AC 12 asserts both paths.
7. ⚠ **Stray replenishment.** The lane's `cast:` re-mints a thin cat on
   every boot in which no live instance of `/stuff/agent/cat` exists at
   hydrate time. After Mouse is adopted and the server restarts, the lane
   hydrates before the registry warms Mouse, so a second stray appears.
   Two cats on Hinkley Hills is not wrong (spawn-distribution is unbuilt
   and this is the cheapest supply), but it is unauthored. Recorded, not
   fixed; a `cast:` applier that suppresses on any live-or-recorded
   instance is a small follow-on.
8. ⚠ **The perception table's rows 2–3** (a disguised person, a concealed
   person) are not in W1: they are the animal's opinion of other people,
   which the requirements themselves put in Wave 2. W1 ships rows 1 and 4
   (food; a hazardous room). Said here so the MR does not read as a
   silent scope-down.
9. ⚠ **Names of all animals become public** (D10), not only pets': a
   named cow reads as "Daisy" to a stranger. Correct, and a change to
   every `Organism` that is not a person.
10. ⚠ **The canary changes class** (D4). Its Extra-ness was carrying
    nothing; but trade-mining's tests may assert `instanceof NPC` or
    Character-tier surfaces on it. Run its suite; fix the assertion, not
    the design.
11. ⚠ **Naming defence is partial.** `name` refuses a live Cast's name and
    any *online* player's; offline players' names are not indexed
    synchronously anywhere this plan found. The naming slate owns the
    real defence.
12. **Boot ordering** for `KeptAnimalRegistry`: it must run after the
    chattel and parcel registries and must tolerate rooms not yet cloned.
    If a materialize at boot throws for a room that cannot resolve (a
    deleted lot), log and skip — the record survives and the animal
    reads as *lost*, which is honest.
13. **`Persistable` outer of `Behaved`** is a new composition order.
    `Behaved.onDestruct` tears down timers before `Persistable`'s
    capture-on-destruct backstop sees the tree — verify the backstop
    still captures fields (it captures state, not timers; expected fine)
    and pin with a test.
14. **The stray's clock.** `feeds` must not read metabolism for an
    unstamped animal with nothing to eat, or the lane's cat starves in a
    real afternoon of uptime. Pinned by test in W1c; a reviewer adding
    "just check hunger first" reintroduces it.

---

## Deferred seams

Attach points left clean, and the slate each goes to.

- **Institution-held regard** (the Watch's opinion) → `pets-slate`
  Wave 2; attaches at `keepsPersonalRegard()` + `EmployedMixin.institutionPath()`.
- **An animal's opinion of other people; disguise and concealment
  reactions** → `pets-slate` Wave 2; `follows`/`feeds` already narrow on
  the person — the reads are `getDisguise()` and `PerceptionApi.perceives`.
- **Training as competence** → `pets-slate` Wave 2 (needs a transcript
  host below `Character`); `wouldComply` is where a band would multiply
  in.
- **Wild taming, the pet shop, combat staging, the off-screen ladder,
  lost-and-found apparatus** → `pets-slate` Wave 2, unchanged.
- **The two butcher yield models** → a note on `ranching-slate`
  (D15).
- **Owned goods in public rooms** (the lantern on the street never
  returns) → a note on the residences/furnishing slate; the pet answer
  (a boot roll) is deliberately narrower than a general overlay of every
  public room.
- **Stray replenishment / a live-or-recorded-aware `cast:` applier** →
  `spawn-distribution-slate`.
- **The naming defence** → `naming-slate` (Defence B).
- **The tactical sense of `stay`** (a standing instruction to an ally)
  → combat-formations, whose set-policy-then-watch surface is where it
  belongs. This build only drops the alias.
- **Age death for persons and succession** → stays where `race.md` left it.
- **Diet** (`Species.diet` is authored and unread): the `feeds` brain eats
  any edible Provision; a carnivore refusing bread is a one-line read once
  materials carry a diet class → `husbandry-family` notes.

---

## Critical files

Read first, in this order:

1. `docs/requirements/pets-requirements.md` — the product; closed.
2. `docs/slates/builds/pets-slate.md § Reconciliation 2026-09-08` — binding.
3. `mud/lib/belief/BeliefStore.ts` (all of it), `mud/lib/npc/Cast.ts`,
   `mud/platform/agent/Extra.ts`.
4. `mud/lib/persistence/Persistable.ts`, `mud/lib/persistence/PersistenceSlice.ts`,
   `mud/lib/chattel/Estate.ts`, `mud/platform/idea/api/PersistableLogic.ts`
   (`captureItem`, `cloneHost`, `capturePlacement`, `restorePlacement`,
   `flushSkippedOwnedGoods`, `overlayOwnedGoods`, `placeIdOf`),
   `mud/platform/thing/Plant.ts` (the keyed-clone precedent),
   `mud/platform/idea/ChattelRegistry.ts` (the boot-warm precedent).
5. `mud/lib/creature/Creature.ts`, `mud/lib/character/Character.ts`
   (composition order), `mud/lib/husbandry/Handling.ts`,
   `mud/platform/idea/species/Species.ts`, `mud/lib/species/Organism.ts`.
6. `mud/lib/behavior/brain.ts`, `Behaved.ts`, `wanders.ts`,
   `packages/content/trade-mining/src/behavior/reads-air.ts` (behaviour
   as instrument), `packages/content/trade-ranching/src/behavior/herds.ts`.
7. `mud/platform/idea/cmd/bulk/EatController.ts` (the ingest arms),
   `mud/lib/material/Freshness.ts`, `mud/lib/material/Contaminable.ts`,
   `mud/lib/metabolism/Metabolic.ts` (`reconcileMetabolism`,
   `integratesLongAbsence`, `METABOLIC_DEFAULTS`).
8. `packages/content/trade-ranching/src/agent/{WorkingAnimal,Livestock}.ts`,
   `.../lib/Handled.ts`, `.../content/trade/ranching/agent/farm-dog.yaml`,
   `.../cmd/ranching/{handle,butcher}.yaml`, both `ButcherController.ts`.
9. `mud/api/mql/predicates.ts`, `mud/platform/idea/cmd/shell/FindController.ts`,
   `mud/api/mql-subscription.ts` (`REF_FIELDS`).
10. `mud/platform/idea/api/RecognitionLogic.ts:300–335`.
11. `packages/server/scripts/check-perishable.ts` (the gate to mirror),
    `check-identity.ts:225–262` (how animal rows are censused).
12. The content homes: `packages/content/generic-objects/{pack.yaml,package.json}`,
    `.../content/stuff/agent/Corpse.yaml`, `.../stuff/thing/items/stew-meat.yaml`,
    `packages/content/species-and-names/content/stuff/idea/species/wolf.yaml`,
    `packages/content/hinkley-hills/content/world/terminus/hinkley-hills/location/lane.yaml`,
    `packages/content/trade-mining/content/trade/mining/agent/canary.yaml`,
    `packages/content/terminus/content/world/terminus/general-store/thing/waterskin.yaml`,
    `packages/content/platform/pack.yaml § boot:`.
13. `CLAUDE.md § Worktrees` before the first commit; `./tools/wt-status`.

---

## Drive record

✅ **Re-run 2026-09-17 (fourth) — the restart half, driven for the first
time.** Every earlier run was one boot; step 25's restart had stayed in
the "manual" list. Two boots on the final code, over the socket, on a
freshly dropped `saxonberg_build2` (93 indexes — the `chattel.pin.key`
partial builds clean):

| beat | seen |
|---|---|
| prime the stray by wizard `eval --parcel /world/terminus/hinkley-hills --on cat` (regard +100, forty handles, one remembered follow — the game-days the ladder needs, skipped; nothing else) | `[0.937, 1]` |
| `name cat Mouse` through the real verb | ok — *"You name a cat Mouse."* (was *"You name Mouse Mouse"*: the late-bound ref rendered the animal by its new name; now the `handle` form, which is keyword → species and never the name) |
| **restart** | boot log: `[residency] pin roll: 1/1 stood up` — before any socket opens |
| a **stranger** walks onto the lane, owner offline | *"You also see: a thin cat and Mouse"*; `look Mouse` renders her |
| the **owner** logs in | one Mouse on the lane (resolve-first held); `find reachable:mine` → *Mouse* |

⚠ **Two cats on the lane** — *"a thin cat and Mouse"*. Not the pin: the
lane's own YAML predicts it (*"after Mouse is adopted a second cat may
appear on the lane, which is unauthored rather than wrong — Risks 7"*).
A plain room's `applyCast` mints its cast at every load and Mouse is no
longer the lane's stray, she is somebody's cat who stands there. Left as
decided; observed for the record.

⚠ **The wire file's own record was wrong** — see D22. It is clean, it
never named or stamped or butchered, and suite 9 proved nothing about
the lift. 17/17 after the correction, on a world the suite booted.

✅ **Re-run 2026-09-16 (third)** after the persistence rework — fresh DB,
**92 indexes** (the new `chattel.place` builds clean), 439 rooms placed by
the spawn sweep with the owned-goods overlay then on **every** room's
`postRegister`, zero boot errors. **16/16.** ⚠ That overlay was reversed
the next day (D21 → D22); this run's number stands for the rest.

✅ **Re-run 2026-09-16** after review changed the world underneath it —
freshly reset `saxonberg_build2`, a full **43-pack** install, a live
socket. **16/16.**

⭐ Three of the sixteen did not exist at the first run, and each is a
review round made permanent: `call` reaching the cat with **no target at
all** (the acoustic emission), `stay`'s refusal admitting *not looking at
you* (the gesture channel), and — the one that matters — **step 9, that
the refusal LIFTS.** Its absence is what let an untameable cat ship.
⚠ Corrected 2026-09-17: the wire assertion never proved the lift (see
the fourth run); the lift is `Bonded.test`'s, and the wire's step 9 now
says exactly what a socket can see.

⚠ Two known warnings in the boot log, both pre-existing `terminus`
content and both documented below: `Aldis Verrow` and `Merrick Sault`
declare `shifts` with no trigger and no config.

**First run 2026-09-15** — 36-pack install, **14/14**.

⭐⭐ **The drive is a wire file now**, not a one-off script:
`packages/wire/tests/pets.wire.test.ts`. ⚠ It shipped as `.dirty.` with a
reason claiming it stamped, named and butchered; it does none of those
(see D22 and the fourth run) and is clean.

What it settles, over the socket, in one run:

| step | claim |
|---|---|
| 6–7 | a thin cat is on the lane, and looking at it reports how it is holding itself with **no number anywhere** |
| 8 | `pet` refuses — *it moves off* — and names no threshold, no band and no figure |
| 9 | `offer` with nothing in hand is refused **by shape** (`no-food`), never by the animal; and the **producer gap** is recorded green — nothing on the lane yields food a stray would take |
| 12 | `name` refuses: *it has not chosen you*; the cat is still "a cat" to everybody |
| 14, 16 | ⭐⭐ `call` and `stay` both get *it looks at you*, and **neither reads as a shortfall** — no "not enough", no "yet", no number. This is a cat, and the game does not apologise for it |
| ⚠⚠ 21 | `find world:mine` matches none of `in the · at the · located · room · lane · coords`. **If this ever fails, do not fix the test** |
| — | all five verbs resolve (a verb nothing affords answers "I don't understand" — the four-link check), and `stay` no longer answers with combat's prose |

⚠ **What the drive found, and it is not this build's:** two shipped
`terminus` rows — the infirmary physician (*Merrick Sault*) and the
necropolis undertaker (*Aldis Verrow*) — declare
`brain: /lib/behavior/shifts` with **no `trigger:` and no `config:`**, so
the boot log reads `bad trigger 'undefined'` and neither has ever
migrated on or off shift. ⭐ It is the collie's defect exactly, in two
more rows, found because this build was already looking at trigger
parsing. **Deliberately not fixed here:** `shifts` needs
`{ behindBar, offstage }` to have anywhere to go, and adding a cadence
alone would make a brain run with nowhere to migrate — which is worse
than not running. Where an undertaker stands when off shift is a terminus
content decision. Offered to that pack as a finding.

⚠ Steps needing game-days or a second player (10–11, 13, 15, 17–20,
22–31) stay manual: they are the same mechanisms these assertions
exercise, run for longer. The requirements say so themselves.

---

## Drive record — original placeholder

*(appended at build time — the output of running the requirements doc's
thirty-step drive against the running game, and what it found.)*
