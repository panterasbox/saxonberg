# Base-class narrowing, phase 2c — the Agent branch

Addendum to [base-class-narrowing-clusters-plan](./base-class-narrowing-clusters-plan.md)
on branch `build/narrowing` (MR !303). Cites the clusters plan's
CROSS-BRANCH decisions D1–D8, D13–D15 and does not re-argue them. Its
own decisions are numbered **E1…E17**; its waves **A0…A8**. Written at
`69ca80f75`; every file fact below was taken by opening the file.

**The finding the coordinator made, verified:** `DraftHorse` and
`PitPony` are `Character`s. `packages/content/transport/src/agent/DraftHorse.ts:23`
and `packages/content/trade-mining/src/agent/PitPony.ts:30` are both
`BehavedMixin(HaulingCreature)`, and
`packages/server/src/mud/platform/agent/HaulingCreature.ts:29` is
`MountableMixin(PostRegistrationMixin(Character))`. The docstring at
`HaulingCreature.ts:2-5` says why: *"The cart-pulling capability itself
comes from `Character`"*. A class reached for a rung to get one mixin,
and took nineteen others with it. **And it is not the horse alone**: the
wolf at `packages/content/newbie-wilds/content/world/newbie-wilds/agent/wolf.yaml:7`
is `class: /platform/agent/Extra` — a `Character` that composes
`CasterMixin`, `EmployedMixin`, `PersonaMixin`, `CommandGiverMixin`,
`VocalMixin`, `AdvancementMixin`, `MemorizedMixin`. Three animal rows on
the person rung, in three packs. Three consumers is the promotion
threshold the Thing branch set.

---

## The waves at a glance — start at A0

| wave | one line | ends at |
|---|---|---|
| **A0** | `lib/creature/Actor` = `Combatant(Perception(Mobile(Engaged(Sensor(Creature)))))`; `Character` re-bases onto it and drops those five from its own stack — behaviour-identical for every person | `build(narrowing A0)` |
| **A1** | `platform/agent/Beast` = `Behaved(PostRegistration(Actor))`; `platform/agent/DraftAnimal` = `Mountable(Hauler(Beast))`; wolf → `Beast`, horse + pony → `DraftAnimal`; `HaulingCreature.ts`, `DraftHorse.ts`, `PitPony.ts` deleted | `build(narrowing A1)` |
| **A2** | `Behaved.emoteFree` falls back to an `act.deed` peers scene on a host with no `Soul` — the horse's idle beats do not go silent; `lint:dispositions` gains the `kind: say` rule | `fix(narrowing A2)` |
| **A3** | `KeptAnimal` re-bases onto `Actor` (the third consumer) | `build(narrowing A3)` |
| **A4** | the naming pass: `Gus` and `TicketClerk` extend `Cast`; four stale docstrings; the `Livestock` line that says Chattel comes from `Creature` | `refactor(narrowing A4)` |
| **A5** | docs: the branch diagram, `conveyance.md`, `behavior.md`, `combat.md`, `identity.md`, `pets.md`, `mining-slate.md`; wiki pages `hauler` / `combatant` / `employed` / `beast` / `draft-animal` | `docs(narrowing A5)` |
| **A6** | the drive, part G | `drive(narrowing A6)` |
| **A7** | the composition census re-run and its delta | `tools(narrowing A7)` |
| **A8** | the slate: E8, E11, E12, E15, E16 filed as lines | `slate(narrowing A8)` |

Every wave lands green on `lint:family` + `pnpm test:near` + each touched
pack's vitest; `pnpm test` once before the MR returns to review.

---

## Grounding

### The three classes the branch is built from

- `lib/stuff/Agent.ts:24` — `WetMixin(TangibleMixin(Stuff))`. The root.
- `lib/creature/Creature.ts:113-200` — the body stack. **Twenty-five
  layers**, not the nineteen the census table names: the coordinator's
  list omits `LoadBearing`, `Disguisable`, `Exerting`, `Slottable`,
  `Attired`, `BodyPlanSlots` — all six registered in `lib/mixin.ts`
  (`:333-335`, `:396-410`). The census counts one row per
  prototype-chain layer that declares its OWN persistent fields
  (`check-composition-census.ts:22-27`), so a layer with no fields of
  its own is invisible to it. None of the six is in question here, but
  the plan states the blindness rather than inheriting it.
  `Creature.ts:350` overrides `getMass()` to seed from the species —
  the deriver `lint:mass` exempts by composition
  (`scripts/check-mass.ts:39-43`, which corrects the clusters plan's
  guess of `OrganismMixin`).
- `lib/character/Character.ts:99-133` — the agency stack, twenty
  mixins. `:22-24`: *"NO name surface … a body is not a somebody."*
  `:69-72`: `HaulerMixin` placed on `Character` *"while keeping it off
  the broad `Creature` base (a frog / corpse never hauls)"* — the
  argument is right and the branch has had no rung between the two to
  put it on. `:136-146`: the body-line augmenter is a static on the
  `Character` CLASS so that *"it reaches every person (PC and NPC) and
  no animal"* — which today includes the horse.

### The clone targets

- `lib/npc/NPC.ts:37-39` — `Costumed(Behaved(PostRegistration(Character)))`.
- `platform/agent/Cast.ts:23` — `CastMixin(NPC)`; `platform/agent/Extra.ts:29`
  — `extends NPC`. `Extra.ts:4`: *"A rangy grey wolf."* `Extra.ts:16`:
  *"An animal answers to nobody forever"* — a sentence that is in the
  person-role's docstring only because the wolf is on it.
- `platform/agent/HaulingCreature.ts:29` — `Mountable(PostRegistration(Character))`.
  **No row names it** (the census's class list is rows-only; this
  class is invisible to it). Its two consumers are the pack classes
  above, which add `BehavedMixin` and nothing else
  (`DraftHorse.ts:4`, `PitPony.ts:2-3`: *"The class exists for one
  reason: to give it a brain."*).
- `lib/creature/KeptAnimal.ts:83-118` — composes `Sensor`, `Mobile`,
  `Engaged` itself on `Creature` (`:84`), `PostRegistration` innermost
  of its own stack (`:87-92`), and says at `:59-62` what it refuses:
  *"`Vocal`, `Soul`, `Caster`, `Persona`, `Advancement`. An animal does
  not speak, cast, hold a job or carry a transcript — which is the whole
  objection to building this on `Character`."* Twin at
  `platform/agent/KeptAnimal.ts:19`.
- `trade-ranching/src/agent/Livestock.ts:74-76` —
  `Producing(Handled(Handling(Chattel(Branded(Creature)))))`: no
  `Mobile`, no `Engaged`, no `Sensor`. ⚠ `:18-20` still says *"Ownership
  and chain-of-title it inherits from `Creature`, which gained
  `ChattelMixin`"* — stale since W3; the line beneath it (`:69-73`)
  says the opposite and is right.
- `trade-ranching/src/agent/WorkingAnimal.ts:69` — `Handled(KeptAnimal)`.
  `trade-fishing/src/agent/Fish.ts:42` — `Contaminable(KeptAnimal)`.
- `platform/agent/Corpse.ts:21` — `extends Creature`, nothing added.
  Two rows: `generic-objects/…/stuff/agent/Corpse.yaml:23` and
  `trade-cooking/…/agent/hanging-carcass.yaml:16`.
- `platform/agent/Mercenary.ts:21` — `PartyMember(NPC)`; one row, the
  sellsword. `platform/agent/Gus.ts:58` — `CastMixin(NPC)`, 111 lines
  of `postRegister` equip code; `:7-10` claims *"there is no declarative
  seed path to put gear on a creature. `props:` is composed only on
  rooms"* — **stale**: `StagedMixin` composes on any `Stuff & Container`
  (`lib/stuff/Staged.ts:243-244`) and Katie's master ring is
  `props:`-seeded into her inventory (`Katie.ts:20-23`).
- The five locality classes: `Editor.ts:16` `extends Cast`;
  `TicketClerk.ts:26` `CastMixin(NPC)`; `Katie.ts:38` and `Walter.ts:34`
  `CastMixin(StagedMixin(NPC))`; `Realtor.ts:30-32` the same three
  imports. Each exists for a `commandContributions` static (a row's is
  dead — `Walter.ts:8-11`), except `Realtor`, which carries real
  dialogue-effect code.

### The rows

- `transport/content/system/transport/agent/draft-horse.yaml:8`
  names `DraftHorse`; `:21` `mass: 700`; `:22-30` one `idles` brain
  whose pool is all `kind: free`. Fielded by the haulage-rig archetype
  (`transport/content/archetypes/haulage-rig.yaml:25`, `presence:
  draft`).
- `trade-mining/content/trade/mining/agent/pit-pony.yaml:15` names
  `PitPony`; `:27` `mass: 320`; `:28-35` the same `idles` shape. Cast
  in `rejection/…/ferrow/timbered-drift.yaml:33-36`.
- `newbie-wilds/…/agent/wolf.yaml:7` names `Extra`; `:23-30` `idles`,
  all `kind: free`; combat is *"brain-driven by the session's default
  combat brain"* (`:4-5`). Cast in `newbie-wilds/…/crossroads/treeline.yaml`.
- Neither horse species row nor the wolf's authors `sentient`,
  `biddability` or `innateMixins`
  (`transport/…/species/…/caballus-major.yaml`,
  `trade-mining/…/caballus-pumilus.yaml`, `species-and-names/…/wolf.yaml:2`
  *"a non-sentient natural killer"*). Every species that authors
  `innateMixins` is a `homo` (`species-and-names/…/homo/*.yaml`).
- ⭐ **The ten unnamed `Cast` rows** (the clusters plan's open item):
  six in `rejection` (smelterman, onsetter, collier, buyer, registrar,
  storekeeper), three in `trade-haulage` (carter, dispatcher,
  warehouseman), one in `newbie-wilds` (duelist). **All ten are
  `register: definite` and all ten are sentient `homo` species.** That is
  the `Cast` rung's second form by definition (`identity.md:58`: *"a
  proper `name:`, OR the definite article"*) and `lint:identity` rule 2
  already holds it. None is an `Extra` on the wrong rung — E14.
- The five `Extra` rows: hewer, independent (both `sensitivus`,
  indefinite), sentry (`sapiens`, `institution:` authored — the D7b
  case), the wolf, and
  `generic-objects/…/stuff/agent/costume/student.yaml` — an abstract
  costume-bundle PARENT row that clones as *"a nameless, bodiless
  `Extra`"* and whose own header hands the decision to *"the
  BASE-CLASS BUILD"* — E16.

### The readers that decide where a mixin can live

- **A target must be `Vitals` and `Engaged`, not `Combatant`:**
  `platform/idea/cmd/combat/AttackController.ts:57`. `attack.yaml:37`
  gates the arg on `[VisibleMixin, VitalsMixin]`. So today a `Livestock`
  head cannot be attacked at all (no `Engaged`) and a corpse cannot
  (right). `CombatantMixin` is the ACTOR face: hooks and consequences
  fire only through `isCombatant` (`CombatLogic.ts:3207-3216`, `:3319`),
  natural attacks come off the species via `isOrganism`
  (`CombatLogic.ts:585-594`), and a brain-driven combatant
  (`CombatLogic.ts:1688-1696`: no live Interactive) runs the default
  brain, whose first line is `if (!MixinApi.isCombatant(host)) return;`
  (`lib/behavior/combatant.ts:40`). **A body that can be attacked but
  is not a `Combatant` takes the fight in silence.**
- **A viewer must be `Sensor` and `Perception`:** `PerceptionLogic.ts:437,901,940`,
  `RecognitionLogic.ts:329,456`, `VisionModality.ts:148`,
  `LookController.ts:458`. The `wary` brain is built on `perceives`
  (`lib/behavior/wary.ts:5`). A beast without `Perception` never notices
  a hidden player.
- **Who answers for a body:** `lib/accountability/AccountabilityEvent.ts:242-246`
  — `isEmployed(subject) ? institutionPath() : NOBODY`. Not employed
  means nobody, which is `Extra.ts:16`'s sentence about animals and the
  right answer for a beast.
- **The brain's mouth:** `lib/behavior/Behaved.ts:453-462` — `ctx.say`
  narrows to `isVocal` and no-ops otherwise; `ctx.emote` / `ctx.emoteFree`
  narrow to `isSoul` and no-op otherwise. The pet brains never use
  them: `follows.ts:64`, `feeds.ts:113`, `herds.ts:86`, `raids.ts:103`
  all compose `MessageApi.scene(host).topic('act.deed').toPeers(…)`
  directly. `Soul.emoteFree` (`lib/social/Soul.ts:298-318`) sends on
  the **`emotive-esp` modality** — so today a horse shifting its foot
  is an ESP emote, which implantless bystanders drop.
- **The haulage mechanism never needed a person:** the shared test
  fixture is `HaulerMixin(SensorMixin(Creature))`
  (`lib/slot/__tests__/haulage-fixtures.ts:24`), and `HitchController.ts:57,112`
  narrows to `isHauling` only. `Mountable` requires `Stuff & Slotted`
  (`lib/slot/Mountable.ts:25`) and composing it **adds a mount slot at
  composition time** (`:1-10`) — it cannot go anywhere a thing should
  not be rideable.
- **Arg gates over the agent stack** (verified across
  `packages/content/**/cmd/**/*.yaml`): exactly three views name a
  `Character`-stack mixin — `hitch.yaml:35` `[VisibleMixin, HaulerMixin]`,
  `mount.yaml:21` and `ride.yaml:18` `MountableMixin`. `talk.yaml:27`
  gates on `BehavedMixin`; the medical and ranching verbs on
  `VitalsMixin` / `HandlingMixin` / `OrganismMixin`; the pet verbs on
  `BondedMixin`. `requires: class:Agent` appears in two views. Nothing
  else on this branch is gated by mixin at the binder.
- **Affordances:** every push-down candidate's `commandContributions`
  is `self`-bucket only — `Mobile.ts:224-241`, `Combatant.ts:389-397`,
  `Engaged.ts:110-114`, `Vocal.ts:70-76`, `Soul.ts:160-167`,
  `Perceiver.ts:137-157`, `Persona.ts:135-189`. A `self` bucket is
  collected on the GIVER's own stack, so it is inert on any host that
  is not a `CommandGiver`.
- **Gates:** `lint:identity` picks the rung by
  `composesMixin(classPath, 'CastMixin')` (`scripts/check-identity.ts:186-187`),
  so a non-Cast row is judged as an Extra (rules 1, 2, 4 — rule 4 only
  bites a SENTIENT one, `:372-380`) and rule 6 (`:402`) refuses a
  name-shaped key on any organism whose class cannot hold it.
  `lint:kept-animals` direction 2 fails a class reaching `BondedMixin`
  whose species authors no `biddability`
  (`scripts/check-kept-animals.ts:31-37`) — which is a lint-backed
  reason the draft animals must NOT extend `KeptAnimal`.

### What the drive can reach

`packages/wire/tests/base-class-narrowing.dirty.wire.test.ts:47-74`
loads `transport` and `newbie-wilds` and **not** `trade-mining` or
`rejection`. So the drive can clone the draft horse and the wagon
(`/system/transport/thing/wagon`, `HaulageRig`, `draftFactor: 0.03`)
into a street and stand a session at the treeline where the wolf is
cast; the pit pony is the same class as the horse after A1 and is
proved by the unit test and the census, not the drive. Harness facts
already recorded in the file: `look here` not `look` (`:107-125`),
`clone` in `beforeAll` (`:660-672`), `me:i:` for carried things
(`:180-190`), the `inverse()` positive-first rule (`:149-176`).

---

## E1 — the line between a body and a person is TWO lines

The coordinator's question assumes two tiers. The readers above say
three:

| tier | class | what it is | the test |
|---|---|---|---|
| **a body** | `Creature` | a living physical thing that can break, *with or without agency* (`Creature.ts:2-3`) — alive or dead, standing or hanging on a hook | it has vitals, mass, slots, a temperature; it can be looked at, carried, butchered, dressed |
| **an animate body** | **`Actor`** (new, E2) | a body that ACTS: it moves, it receives the world, it can be engaged in something, it can fight back when hurt | it can be attacked (`AttackController.ts:57` — Vitals + Engaged) and can answer; it can walk through an exit; a hidden thing can be hidden FROM it |
| **a person** | `Character` | an animate body that is *somebody or a role*: it types commands, speaks, emotes, holds a job, claims a narrative, keeps beliefs, casts, learns | it has a `CommandGiver` stack to afford verbs onto; the world can ask who answers for it |

The mirror augmenter at `Character.ts:136-146` is the project's own
statement of the third tier's boundary — *"every person and no animal"*
— and the horse is on the wrong side of it today.

**The ruling on each of `Character`'s twenty, with what composing it
claims about every other composer of the host:**

| mixin | goes | claim, and the reason |
|---|---|---|
| `Sensor` | **DOWN → `Actor`** | *every animate body receives the world* — witness triggers (`Behaved.ts:536`), scene receipt. `KeptAnimal` already composes it (`:84`); the haulage fixture does (`haulage-fixtures.ts:24`). A corpse does not receive. |
| `Perception` | **DOWN → `Actor`** | *every animate body interprets what it senses* — the detection gate needs Sensor AND Perception (`PerceptionLogic.ts:437`). Without it a wolf never notices a hidden hunter, and the `wary` ambush brain cannot run on a beast. Claims a night-vision seam on a cat; that is true of a cat. |
| `Engaged` | **DOWN → `Actor`** | *every animate body can be in the middle of something* — the attack target predicate (`AttackController.ts:57`), the respiration crisis drain (`Creature.ts:99-104`: *"the proof drownable is a Character"* — it becomes *is an Actor*), brain slot contention (`idles.ts:24`). A corpse is engaged in nothing. |
| `Mobile` | **DOWN → `Actor`** | *every animate body can traverse* — `KeptAnimal:84`, the tow ripple, the ride. Claims a fish can walk: it claims it today via `KeptAnimal`, and the body plan's locomotion modes are what refuse (`LocomotionApi.defaultModeFor`), not the mixin. |
| `Combatant` | **DOWN → `Actor`** | *every body that can be attacked can fight back* — the actor face should cover the target face (`AttackController.ts:57` vs `combatant.ts:40`). Today a cat, a canary, a fish and a collie can be attacked and cannot respond, silently. Claims combat terms on a canary; the terms are imposed on any NPC anyway (`Combatant.ts:400-407`). |
| `Hauler` | **NOT to `Actor`; to `Character` (stays) and `DraftAnimal` (E5)** | its own docstring (`Hauler.ts:8-12`) and `Character.ts:69-72` are right: hauling is a fact about a person (every player self-hauls a handcart) and about a draft beast, not about a fish or a canary. Two hosts, deliberately; the second independent tell is `hitch.yaml:35` — the binder would accept `hitch cart to canary` and the refusal would move to breakaway physics, which is a worse place for it. |
| `Perceiver` | **UP (stays)** | the perception VERBS (`look`, `search`, `hide`…) — 0 narrowings, 16 `self` affordances (`Perceiver.ts:137-157`); meaningful only on a `CommandGiver`. Not a body property. |
| `Vocal` | **UP** | speech. `KeptAnimal:59` refuses it and pets.md:65 names *"a sheepdog that … speaks"* as the objection. A horse blowing through its nose is not `say`. |
| `Soul` | **UP** | the emote GRAMMAR, `introduce`, `react`, the ESP modality (`Soul.ts:298-318`). A beast's free-form beat is a body act seen by peers — A2 gives `Behaved` that path without `Soul`. |
| `Dispositioned` | **UP** | the derive-on-read TRAIT ledger and `regardBaselineToward`; pets.md:51-66 built animal regard on `BeliefStore × Handling` instead and rejected the universal version. `dispositions:` authoring lives on `Behaved` (identity.md:163) and both rungs — and `Beast` — keep that. |
| `CommandGiver` | **UP** | 15 affordance statics, 43 narrowings; *being a thing that types commands*. `Beast` must not compose it — this is the one mixin whose presence would make every DOWN move fail OPEN (below). |
| `Employed` | **UP** | *who answers for you*; a beast answers to nobody (`AccountabilityEvent.ts:242-246`) and that is the design (`Extra.ts:16`, moving to `Beast`'s docstring). |
| `Persona` | **UP — for now (E8)** | claimed self-narrative; true of somebody, false of a role and of a beast; blocked by the 15 verbs hung on it. |
| `Advancement` | **UP** | the transcript. `WorkingAnimal.ts:38-43` names the animal transcript as a *follow-on beside pets*; not this build. |
| `Caster`, `Memorized` | **UP** | species-gated faculty; no non-`homo` species authors `innateMixins`. The "magic-taming" beast composes it in its own class when it exists. |
| `BeliefStore`, `Status` | **UP** (and `KeptAnimal` keeps its own) | pets.md:51-66 rejected universal composition by argument, not count: *"universal composition makes the capability unfalsifiable"*. The cat has both; the horse has neither; both are right. |
| `Gendered` | **UP** | pronouns are social presentation (vitals.md:50-52: sex is body, gender is person). A mare is *it* in prose; that is the existing behaviour for every animal row (none authors `pronouns:`). |
| `Hiding` | **UP** | the actor-side `hide` verb is Perceiver-afforded; an authored lurking beast keeps `Concealable` from `Creature` (D3). |

⚠ **The DOWN moves are moves of the composition SITE, never removals.**
`Character` extends `Actor` (E3), so every person keeps every one of
the five; the only class that gains them is the one this plan creates
for the beasts, plus `KeptAnimal` gaining `Combatant` and `Perception`
(A3). No `isX` narrowing in the tree loses a host.

## E2 — the rung: `lib/creature/Actor`

```ts
// lib/creature/Actor.ts — substrate, no twin, no row names it
const ActorBase = CombatantMixin(
  PerceptionMixin(
    MobileMixin(EngagedMixin(SensorMixin(Creature))),
  ),
);
export abstract class Actor extends ActorBase {}
```

*An animate body: a `Creature` that moves, receives, can be engaged and
can fight — and is nobody.* Named the way the Thing branch named
`Good`: the adjective for what the rung ADDS to the root, so that
`Creature → Actor → Character` reads *a body · a body that acts · a
body that is somebody*. `Beast` (E4) is the concrete word; `Actor` is
the substrate a person also stands on, and a class called `Beast` or
`Animal` would be the wrong thing for `Character` to extend.

**Order.** Engaged inner of Mobile as `Character.ts:75-80` has it;
Sensor innermost (Perception and Combatant read through it);
Combatant outermost of the five so its `onExchangeResolved` terminal
sits above the body and `Character`'s override at `:272-275` still
wins by being on the class. `Hiding` stays outer of `Creature`'s
`Concealable` because `Character` is outer of `Actor`. `Perceiver`
requires `Sensor` in its base (`Perceiver.ts:20-21`): satisfied,
`Actor` is inner. None of the five defines `postRegister` (verified —
`Mobile.ts`'s only match is a comment about the source room), so
`KeptAnimal`'s innermost `PostRegistration` (`:87-92`) and `NPC`'s
shadow nothing new.

**No twin.** A bare animate body with no brain is what the `cast:`
designation refuses (`PitPony.ts:13-16`), so nothing should clone it;
`ExitableVessel`'s deferral is the precedent (`CLAUDE.md § Instanceable`).
`lint:instanceable` invariant 1 holds by construction.

## E3 — `Character` re-bases onto `Actor`

`Character.ts:99-133` becomes

```ts
const CharacterBase = AdvancementMixin(
  CommandGiverMixin(
  HaulerMixin(
  CasterMixin(MemorizedMixin(SoulMixin(VocalMixin(
  PerceiverMixin(
  GenderedMixin(DispositionedMixin(PersonaMixin(StatusMixin(
  BeliefStoreMixin(HidingMixin(EmployedMixin(Actor)))))))))))))));
```

Fifteen layers over the rung instead of twenty over the body. `Hauler`
keeps its place between `CommandGiver` and the rest (position is free,
`Character.ts:69-74`). **Behaviour-identical for every person by
construction**: the same twenty mixins, five of them one rung lower.
What changes is ORDER relative to `Persona`/`BeliefStore`/`Status`/
`Gendered`/`Dispositioned`/`Hiding`/`Employed`, which now sit OUTER of
the five. None of those seven overrides a method the five define or
vice versa (each was read for this: `Hiding` overrides `getConcealment`
of `Concealable`, which is on `Creature`; the rest own fields and
readers only). Risk 1 below names the one place order can still show.

**The alternative, rejected:** leave `Character` alone and compose the
five a second time on a sibling rung for beasts. That is what
`KeptAnimal` did in 2026-09 for three of them, and it is the
"two consumers" shape; with `Beast` there would be three composition
sites of the same five. The owner's criterion — *if it is mandatory,
the whole branch wants it* — is exactly this case: the five are
mandatory for everything that acts, so they belong on the rung
everything that acts extends.

## E4 — `platform/agent/Beast`: the animal that is nobody

```ts
// platform/agent/Beast.ts — the concrete clone target
export class Beast extends BehavedMixin(PostRegistrationMixin(Actor)) {}
```

The `NPC` shape (`NPC.ts:37-39`) one rung down, without `Costumed` (an
animal is not dressed — `Character.ts:196-198`). *A rangy grey wolf, a
fox in the yard, a boar in the wood: it has a brain, it fights back, it
answers to nobody, it has no name and never will* (`lint:identity`
rule 6 refuses `name:` on it). The wolf row names it. `Extra` is what
its docstring says at `:2-3`, *a role, not a person* — and only that.

What it claims about `Actor`'s other composers: nothing — `Beast` is
a leaf. What it claims about itself: `Behaved`, so `talk.yaml:27`
affords `talk to wolf` (as it does today on the horse) and the
dialogue refusal is the controller's, not the binder's.

## E5 — `platform/agent/DraftAnimal`; `HaulingCreature` retires

```ts
// platform/agent/DraftAnimal.ts
export class DraftAnimal extends MountableMixin(HaulerMixin(Beast)) {}
```

*A beast kept in the shafts: it pulls, and it can be ridden.* Both
rows name it; `DraftHorse.ts` and `PitPony.ts` become empty subclasses
and are deleted (*"an empty subclass is what W2 deleted `Bench` for
being"* — D14), and **a second draft animal is a row** (`species`,
`mass`, a brain), which is the forestry doctrine applied to the
stable. `HaulingCreature.ts` is deleted rather than renamed: its name
claimed the one thing it did not provide, and its only contribution
(`Mountable`) is composed here directly (D14 generalised: *compose the
one mixin you want*).

- `Hauler` here, not on `Beast` or `Actor`: E1's row.
- `Mountable` here, not on `Beast`: composing it MINTS a mount slot
  (`Mountable.ts:6-8`), so on `Beast` the binder would accept
  `mount wolf`. Two rows want it and both are also haulers; the ox you
  lead but do not ride (`HaulingCreature.ts:18-20`) has no row and gets
  no class until it does.
- **Not `KeptAnimal`:** no bond, no name, no residency pin, and
  `lint:kept-animals` direction 2 would fail the class the day it
  reached `Bonded` with a species that authors no `biddability`.
- **Kernel, not pack:** the two consumers are in `transport` and
  `trade-mining` with no common pack ancestor
  (`CLAUDE.md § Module Categories`, *"substrate goes to the KERNEL when
  its composers have no common pack ancestor"*), which is also why
  `HaulingCreature` was kernel. Pack `src/agent/` directories in both
  packs go empty and are removed.
- `Chattel` / `Branded` on it: **not composed** — E11.

## E6 — `KeptAnimal` re-bases onto `Actor` (A3, its own wave)

`KeptAnimal.ts:83-85` becomes
`HandlingMixin(BeliefStoreMixin(NamedMixin(Actor)))`; the outer stack
(`:110-118`) is untouched. The cat, the collie, the canary and the fish
gain `Combatant` and `Perception`; they lose nothing. This is the
third-consumer promotion the Thing branch's rule requires and the one
wave a reviewer can drop without unwinding the others — which is why it
is its own. `Fish.ts:42` and `WorkingAnimal.ts:69` do not change.

## E7 — the keep-up list is E1's table, restated as a claim

`Character` keeps: `Perceiver`, `Vocal`, `Soul`, `Dispositioned`,
`CommandGiver`, `Employed`, `Persona`, `Advancement`, `Caster`,
`Memorized`, `BeliefStore`, `Status`, `Gendered`, `Hiding`, `Hauler`.
Composing each on `Character` claims it of every PC, every `Cast`,
every `Extra`, the `Mercenary`, the `Shade`, the `WireBody` — and after
A1 of no animal. The claim was false for three rows and A1 makes it
true.

## E8 — `Persona 60/0` is a MIXED zero, and the clusters plan's ruling holds for half of it

- **`Avatar` (1 row):** reading **3** — char-gen seeds `bio` and
  `aspiration` at enroll (`Persona.ts:5-11`); `profile`/`chronicle`
  read them.
- **`Cast` (49 rows incl. the five locality classes and Gus):**
  reading **2** — content gap, as ruled (#5). `Persona.ts:13`: *"PCs and
  any future storied NPC carry it"*; a `Cast` IS the storied NPC. ⚠ But
  note what the rows author instead: `CastMixin` carries `prologue`
  (`lib/npc/Cast.ts:115`) — a second field for the same concept as
  `bio`. That is a naming finding for the identity subsystem, filed
  (A8), not a narrowing.
- **`Extra` (5 rows):** reading **1** — `Extra.ts:6-8`: *"an Extra
  carries no proper name and no written history, and asking for one
  says so plainly."* The rung's own docstring says `Persona` is false
  of it.
- **The three beasts:** reading **1** — fixed by A1.

So #5 holds for 50 of 60 and is a misrepresentation for 8, and the
honest move is the one `Named` already made (`Character.ts:22-24`):
`Persona` off `Character`, onto `CastMixin` and `Avatar`. **It is
blocked**, and the blocker is worth naming: `Persona.ts:135-189` hangs
fifteen `self` affordances that have nothing to do with a claimed
narrative — `office`, `government`, `committee`, `appoint`, `quit`,
`apply`, `clock`, `title`, `standing`, `who`, `score` — each commented
*"universal for the same reason"*. `Persona` has become the host for
*every verb a person may type*, and taking it off `Extra` would take
`apply` and `clock` off the sentry. The verbs need a host that means
*every person who can act*; that fork (a `Citizen`-shaped mixin, or
`CommandGiver.self`, or something else) is the user's call and is
filed as a slate line (A8). **Not this build.**

## E9 — the other zeros

| zero | reading | why |
|---|---|---|
| `Combatant 60/2` | **3**, and it moves DOWN | the two rows author `standingLethality` (the sellsword and the duelist); terms are imposed on every other NPC at attempt time (`Combatant.ts:400-407`). Nothing to narrow; A0 widens the host honestly. |
| `Employed.institution 60/2` | **3** for persons, **1** for the three beasts | `Employed.ts:6-8`: *"a sparse null-default persistent field … an unemployed Character carries nothing"*; runtime `hire` writes `employments`; the two rows (sentry, sellsword) are the D7b answerability cases. A1 removes the false claim. |
| `Concealable 73/0` | **3** on persons (D3: `Hiding` writes it), **2** on beasts and corpses | `Concealable.ts`'s own example is *"a lurking beast can be hidden until noticed"* (`Creature.ts:135-138`) and no beast row authors it — a content line for `wolf.yaml`, filed. No narrowing. |
| `Vitals.bloodGenotype 73/0` | **3** | seeded on identity at mint (`blood.md`: *"ABO type seeded on identity"*); never authored. |
| `ThermalRegulation.setpointK 73/0` | **3** | a species-derived default; the value moves every tick (D4's argument). |
| `Slotted.staticSlots 73/0` | **3** | D7: `BodyPlanSlots` derives them from the species. |
| `Posed.posture 73/0` | **3** | D7: a default a verb overwrites. |
| `Containable.fixedInPlace 73/0` | **3** | D6. |

## E10 — the brain seam A1 opens, and A2 closes

Today the wolf's growl and the horse's shifted foot reach the room only
because `Extra`/`Character` compose `Soul`: `idles.ts:41` → `ctx.emoteFree`
→ `Behaved.ts:461` `if (MixinApi.isSoul(host))` → `Soul.emoteFree`. On
`Beast` that line no-ops and **every idle beat in three rows goes
silent** — the fail-closed-silent class, and A1 would ship it. A2:

- `Behaved.ts:461-463`: when the host is not `Soul`, compose
  `MessageApi.scene(host).topic('act.deed').toPeers(Mml.compose\`${Mml.actor(host)} ${text}\`).send()`
  — the exact shape the pet brains use (`follows.ts:64-67`). ⭐ This is
  also the more honest render: a horse shifting its weight is a deed
  peers SEE, not an `emotive-esp` frame implantless bystanders drop
  (`Soul.ts:302`). Persons keep the `Soul` path unchanged.
- `ctx.say` on a non-`Vocal` host stays a no-op — a beast cannot say —
  and `lint:dispositions` (it already parses every `behaviors:` block,
  `scripts/check-dispositions.ts:1-10`) gains one rule: a pool entry
  `kind: say` on a row whose class does not reach `VocalMixin` fails
  the gate, naming the row. Same for `kind: emote` without `Soul`.
  Census first: today zero rows trip it (the three beast rows are all
  `kind: free`).

## E11 — `Chattel` on `DraftAnimal`: the user's call, filed

D2 defines chattel as *bought, consigned, lent, stolen, stamped with a
chain of title* — the paradigm of which is a horse — and then
enumerates its hosts as `Good`, `KeptAnimal`, `Livestock` *"and by
nothing else"*. That list was written when no draft-animal class
existed. No stamp writer targets a horse today and the haulage rig
`default`s one into existence rather than selling it
(`haulage-rig.yaml:25`). Composing it reopens D2; not composing it
leaves a horse thief with clean title. **This plan does not compose it**
(the narrowest reading) and files the question with both halves on the
slate (A8). If the owner says yes it is a two-line change in A1's
class, plus `Branded` beside it as `Livestock.ts:74-76` does.

## E12 — the naming pass

| group | one thing or two | do |
|---|---|---|
| `Cast` · `Gus` · `TicketClerk` | **the same chain** — `CastMixin(NPC)` re-composed twice beside a class that IS it (`Cast.ts:23`); `Editor.ts:16` already extends `Cast` | A4: `extends Cast`. Behaviour-identical (`hasMixin` reads the chain either way); the `<composition>` panel's by-class listing gets honest lineage. |
| `Katie` · `Walter` · `Realtor` | **a shared chain, `CastMixin(StagedMixin(NPC))`, three consumers** — a missing superclass by the Thing branch's own vector. And `Gus` is its FOURTH consumer written as 111 lines of `postRegister` equip code against a premise that is no longer true (`Gus.ts:7-10` vs `Staged.ts:243`). | **Not this build.** The honest superclass is *a person who boots with a loadout*, and its honest mixin is a `props:`-only rail for bodies — `StagedMixin` bundles `props:` WITH `cast:` (`Staged.ts:2-3`), so composing it on a person claims that person contains a cast. That is a kernel split (`Staged` → the props half and the cast half), the `Costumed` precedent one step further, and it is a slate line with the four receipts (A8). Gus becomes a row the day it lands. |
| the five locality classes | **five**, and they should be | each carries a `commandContributions` static — the agent-branch receipts for N3 (an affordance that is data), which the clusters plan ruled a design. `Realtor` carries real code either way. |
| `Extra` · `Beast` | **two things the rung was carrying as one** — a role somebody fills vs an animal that is nobody | A1. `Extra.ts:4` and `:16` move their wolf sentences to `Beast`. |
| `HaulingCreature` | **the name does not survive** — it named hauling and provided riding | A1 deletes it; `DraftAnimal` names what the two rows are. |
| `DraftHorse` · `PitPony` | **one thing** — byte-identical classes in two packs, each existing *"to give it a brain"* the rung now carries | A1 deletes both; two rows name `DraftAnimal`. |
| `KeptAnimal` · `Livestock` · `WorkingAnimal` | **three**, per `WorkingAnimal.ts:16-29` (roles, not a taxonomy) | no change. E15 notes `Livestock`'s tier. |
| `Corpse` | see E13 | no change |
| `Avatar` · `Shade` · `WireBody` | three by design (`Shade.ts:4`: *"An `Avatar` SUBCLASS, deliberately"*) | no change |

## E13 — the Corpse row is right

`Corpse.ts:21` composes exactly `Creature`. After A0 that means: no
`Mobile`, no `Engaged` (so `AttackController.ts:57` refuses to attack
it — right), no `Sensor`/`Perception` (a corpse witnesses nothing —
right), no `Combatant`, no `Chattel` (D15: evidence, not stock), and
all of `Container` (the loadout), `Vitals`+`BodyPlanSlots` (the wound
map), `Thermal` (algor mortis), `Attired` (it wears what it died in),
`Postmortem` (the clock), `Perceptible` (`look body`), `Containable`
(carried to the morgue). **The rung is the proof of its own line:** the
five mixins A0 moves to `Actor` are exactly the five that would be
false of a corpse, and `Corpse` is the class that shows the split is
between `Creature` and `Actor`, not between `Creature` and
`Character`. `hanging-carcass.yaml:16` naming the same class for a
dressed hog is right for the same reason. Nothing missing.

## E14 — the ten unnamed `Cast` rows are `Cast`

All ten are `register: definite` on sentient species (grounding
above); `identity.md:58` makes the definite article the rung's second
form and `lint:identity` rule 2 holds it. The clusters plan's open item
closes with no change.

## E15 — `Livestock` stays on `Creature`; the tier is ranching's call

A head of stock cannot be attacked (no `Engaged`), cannot walk (no
`Mobile`) and witnesses nothing (no `Sensor`) — `Livestock.ts:74-76`.
That may be right (*"the object is the transient thing here; the
record is what persists"*, `:12-13`) and it may be why the `raids`
brain narrates a fox against a herd rather than fighting a cow. After
A0 moving it is a one-word change (`Actor` for `Creature`); this
plan does not make it. Filed (A8).

## E16 — the abstract costume parent is an abstract-ROW concept, not a class

`student.yaml`'s header hands this build the choice between *"an
abstract-row concept or a narrower base class."* A narrower base class
cannot fix it: any class a row can name is something a clone can stand
up, and a costume bundle should not be stood up at all. The fix is a
row key the clone pipeline refuses (`abstract: true`, or *a parent row
with no `class:`*), which is the templates subsystem's and the Idea
pass's. Filed with the row cited (A8).

## E17 — the wiki pages the drive reads

`wiki-starter/content/wiki/main/`: `hauler.md`, `combatant.md`,
`employed.md` (mixin pages in `branded.md`'s shape), `beast.md` and
`draft-animal.md` (template-kind pages over `/platform/agent/Beast` and
`/platform/agent/DraftAnimal`, in `movable.md`'s shape). Without them
part G has no inverse panel to read the claim from (D16's reason).

---

## ⭐⭐ Host placement

| host | carries | what composing it claims about everything on the host |
|---|---|---|
| `lib/creature/Creature` (unchanged) | the body: 25 layers | *everything on it is a body that can break.* No longer claims that every body can walk, be attacked, witness or fight — a corpse and a head of stock stop claiming those. ⚠ The test: **if a `Corpse` or `Livestock` reader ever needs `if (MixinApi.isMobile(this))` to behave, the mixin belongs on `Actor`, not on `Creature` with a guard.** |
| `lib/creature/Actor` (new) | `Sensor` · `Engaged` · `Mobile` · `Perception` · `Combatant` | *everything on it acts: it can be attacked and answers, it walks, it perceives, it can be engaged.* Composers after this build: `Character` (every person), `Beast`, `DraftAnimal`, `KeptAnimal` (A3) and therefore `WorkingAnimal`, `Fish`. ⚠ The test: **if any composer needs a guard that says "but not this one" for one of the five, it is on the wrong host** — a fish that must not be attackable would be that finding. |
| `lib/character/Character` | the fifteen person mixins (E7) | *everything on it is somebody or a role.* Stops claiming it of the horse, the pony and the wolf. `Hauler` stays here: every person self-hauls. |
| `platform/agent/Beast` (new) | `Behaved` · `PostRegistration` | *an animal with a brain, and nobody.* Leaf. |
| `platform/agent/DraftAnimal` (new) | `Mountable` · `Hauler` | *a beast you hitch and ride.* Leaf. Claims a mount slot on every row that names it (two, both ridden). |
| `lib/creature/KeptAnimal` (A3) | `Named` · `BeliefStore` · `Handling` · `Bonded` · `Status` · `Behaved` · `Chattel` · `Branded` · `Persistable` over `Actor` | *an animal kept for itself* — unchanged in meaning; gains that it fights back and perceives. |
| `lib/behavior/Behaved` (A2) | the `emoteFree` fallback | claims nothing new: a brain host with no `Soul` emits a deed to peers. |

Mixins whose host does NOT change and why: every kernel mixin not in the
two tables above; `Chattel` (D2, D15, E11); `Concealable` (D3);
`Perceptible` and `Named` (the presentation build's line,
`Creature.ts:120-133`, `KeptAnimal.ts:48-54`); `Costumed` (`NPC` only —
an animal is not dressed).

---

## Blast radius, ranked, and the fail-open check

The coordinator's counts (`isX` narrowings / affordance statics):

| move | mixin | narrowings | affordances | what actually changes for existing hosts |
|---|---|---|---|---|
| A0 | `Engaged` | 60 | 1 | nothing — every current composer keeps it; `Beast`/`DraftAnimal` had it via `Character`; `KeptAnimal` had it |
| A0 | `Sensor` | 50 | 0 | nothing, same |
| A0 | `Mobile` | 31 | 3 | nothing, same |
| A0 | `Combatant` | 17 | 1 | **gains** hosts in A3: cat, collie, canary, fish (they can fight back) |
| A0 | `Perception` | (not counted) | 0 | **gains** the same four in A3 |
| A1 | `Hauler` | 0 | 0, **1 arg gate** | the horse and pony keep it (`DraftAnimal`); the wolf loses it — `hitch cart to wolf` is refused at the binder, which is the correct answer |
| A1 | the fifteen person mixins | up to 44 each | up to 15 each | the three beast rows lose them; no narrowing in the tree targets a beast through any of them (verified: `isEmployed` in `AccountabilityEvent.ts:243` returns `NOBODY`; `isCombatant`/`isVitals`/`isEngaged` are all kept) |

So the 40+-narrowing mixins are moved in **one wave of their own (A0)**
and that wave is behaviour-identical for every host they have today:
the count of hosts losing any of them is zero. The actual narrowing —
three rows losing sixteen mixins — is A1, whose blast radius is one arg
gate and one brain seam (E10), both named.

**The fail-OPEN check (a mixin moved DOWN conferring a verb on a body
that should not have it):** every one of the five moved mixins'
`commandContributions` is `self`-bucket only (grounding above). A
`self` bucket is walked on the GIVER's own stack
(`CommandGiver.ts:1065`, `Persona.ts:127-132`), so on a host that is not
a `CommandGiver` — `Beast`, `DraftAnimal`, `KeptAnimal`, `Corpse` — the
static is inert: nothing dispatches. **The check therefore reduces to
one invariant: no rung below `Character` composes `CommandGiverMixin`.**
It is asserted by a class-level test in A0 and holds for every class
this plan creates. There is no `peers`/`environment` bucket on any of
the five, so no verb is pushed onto a BYSTANDER's stack by a beast
being present. (`talk` is afforded by `Behaved` today on the horse and
stays so on `Beast` — unchanged.)

---

## Reachability wiring

The four links, each of which fails closed and silent, for every
capability this plan moves:

| link | after A0–A3 | what would break it |
|---|---|---|
| **verb** | `hitch`/`unhitch` (`movement`), `mount`/`ride`/`dismount`, `attack`, `talk`, `look` — all pre-existing; **no new verb** | — |
| **affordance** | `hitch` is afforded to the GIVER by `HaulerMixin`? No — `hitch.yaml` has no `commandContributions` source on `Hauler`; it is afforded by … ⚠ **check at build time:** grep `hitch.yaml` across every `commandContributions` static. If it rides `Persona`/`Perceiver`/`Mobile.self`, the person side is unchanged; the DRAFT ANIMAL is never the giver, so its own affordances do not matter | a view moved between mixins in a sibling build |
| **data** | `wolf.yaml:7` → `/platform/agent/Beast`; `draft-horse.yaml:8` and `pit-pony.yaml:15` → `/platform/agent/DraftAnimal`; the `haulage-rig.yaml:25` default and `timbered-drift.yaml:35` cast lists are PATHS to rows, not classes, and do not change | a row left naming a deleted class fails at boot (`lint:instanceable` invariant 3 catches it before boot) |
| **boot** | `postRegister` chain on `Beast`: `Behaved.postRegister` chains, `PostRegistration` terminates — the `NPC.ts:13-22` order, copied; on `DraftAnimal` `Mountable` mints the slot at composition | `Behaved` composed INSIDE `PostRegistration` (the `KeptAnimal.ts:87-92` lesson) — every beast goes inert with no error |
| **arg gate** | `hitch.yaml:35` `HaulerMixin` — `DraftAnimal` composes it ✓; `ride.yaml:18` / `mount.yaml:21` `MountableMixin` ✓; `attack.yaml:37` `VitalsMixin` ✓ (Creature); `talk.yaml:27` `BehavedMixin` ✓ (Beast) | `Hauler` left off `DraftAnimal` — refused at the binder with `"{} can't pull a cart"` (`lib/mixin.ts:806`) and no controller test can see it. **This is the constraint the coordinator named and A1 satisfies it by construction; part G proves it live.** |
| **the brain's mouth** (the fifth link this branch has) | `Behaved.ts:461` fallback (A2) | without A2, three rows' idle pools go silent on the day A1 lands |

Verbs each move would break if done WITHOUT its pairing: taking
`Hauler` off `Character` (not proposed) breaks self-haul `hitch cart`
for every player; taking `Mobile`/`Engaged` off `Creature`'s
descendants below `Actor` breaks nothing because nothing below
`Actor` had them except `KeptAnimal`, which re-bases (A3) or keeps
its own (if A3 is dropped).

---

## Waves

### A0 — the rung, behaviour-identical

1. `lib/creature/Actor.ts` per E2, docstring stating E1's three tiers
   and the host-placement claim.
2. `lib/character/Character.ts:36-133`: imports for the five removed;
   `Creature` → `Actor`; the composition per E3; the stack comment
   rewritten (the `HaulerMixin` paragraph at `:69-74` becomes the
   statement that hauling is a person's and a draft animal's, the
   `EngagedMixin`/`Mobile` paragraphs move to `Actor.ts`; the
   `Respiration` line at `Creature.ts:99-104` says *Actor* where it
   says *Character*).
3. `platform/idea/api/StudioLogic.ts:83-98`: `Actor` in the palette
   between `Creature` and `Character` (the panel and `describeClass`
   read it; W0 did the same for `Good`).
4. Tests, new: `lib/creature/__tests__/Actor.test.ts` — `hasMixin`
   for each of the five on `Actor`; `hasMixin(Actor, Mixins.CommandGiver) === false`
   and the same for `Persona`, `Employed`, `Vocal`, `Caster` (the
   fail-open invariant); `hasMixin(Corpse, Mixins.Mobile) === false`.
5. Gates: `pnpm test:near`; `lint:family` (`lint:instanceable` sees a
   `lib/` class no row names ✓; `lint:mixin-names` — no new mixin).
   ⚠ Persistence: `holder_snapshots` capture is per-mixin keyed by name
   (`persistence.md`), so order does not change the snapshot shape —
   but the full-suite fix at `2cfb4c77d` touched *"a snapshot"*; run
   `lib/persistence/__tests__` and `platform/agent/__tests__` in
   `test:near` and regenerate any golden that pins composition ORDER
   (Test strategy below).

Commit: `build(narrowing A0): Actor — a body that acts, between the body and the person`

### A1 — the beasts leave the person rung

1. `platform/agent/Beast.ts` (E4), `platform/agent/DraftAnimal.ts`
   (E5), each with the docstring naming its claim and `Extra.ts:4,16`'s
   two sentences moved here.
2. Delete `platform/agent/HaulingCreature.ts`,
   `packages/content/transport/src/agent/DraftHorse.ts`,
   `packages/content/trade-mining/src/agent/PitPony.ts` and their now
   empty `src/agent/` directories. Grep both packs' `package.json` /
   manifest for a class-source table entry naming them
   (`content-packs.md § the capability rung`) and remove it.
3. Rows: `wolf.yaml:7`, `draft-horse.yaml:8`, `pit-pony.yaml:15` (and
   the header comments at `draft-horse.yaml:1-7`, `pit-pony.yaml:1-14`
   that explain the deleted class).
4. `Extra.ts:1-25`: the wolf leaves the docstring; `Cast.ts` untouched.
5. Tests: `trade-mining/src/agent/__tests__/haulage.test.ts:37-55` — the
   class assertion and its comment (Test strategy); new
   `platform/agent/__tests__/Beast.test.ts` — `hasMixin(Beast, X)` false
   for the fifteen person mixins, true for `Behaved`;
   `hasMixin(DraftAnimal, Mixins.Hauler|Mountable)` true,
   `hasMixin(Beast, Mixins.Hauler|Mountable)` false;
   `Creature.chattel.test.ts` gains `hasMixin(DraftAnimal, Mixins.Chattel) === false`
   with a comment citing E11 (so the day the owner reverses E11 the
   test is the one that changes, on purpose).
6. Gates: both packs' vitest; `lint:identity` (the wolf row is judged
   as a non-Cast: rule 4 does not bite — species not sentient; rule 6
   would bite a `name:` — none); `lint:kept-animals` (no class here
   reaches `Bonded`); `lint:instanceable` (invariant 3 on the three
   rows; invariant 8 on the emptied pack dirs).

Commit: `build(narrowing A1): Beast and DraftAnimal — a wolf is nobody and a horse is not a Character`

### A2 — the brain's mouth

1. `lib/behavior/Behaved.ts:461-463` per E10, with the pet-brain scene
   shape and a comment that the ESP modality was the wrong channel for
   a body act.
2. `scripts/check-dispositions.ts`: the `kind: say` / `kind: emote`
   rule, census-then-ratchet with today's count (0) as the ceiling.
3. Tests: `lib/behavior/__tests__/Behaved.emoteFree.test.ts` — a
   `Beast`-shaped fixture's `idles` `free` beat reaches a peer's Sensor
   as an `act.deed` frame; a `Character`-shaped fixture's still reaches
   as `act.emote`.

Commit: `fix(narrowing A2): a beast's idle beat is a deed peers see, not an ESP emote`

### A3 — the third consumer

1. `lib/creature/KeptAnimal.ts:83-85` per E6; the docstring stack
   (`:19-35`) redrawn with `Actor` at its base; `:59-62` unchanged
   and still true.
2. Tests: `KeptAnimal.postRegister.test.ts` unchanged (the chain still
   terminates at its own `PostRegistration`); `Actor.test.ts` gains
   `hasMixin(KeptAnimal|Fish|WorkingAnimal, Mixins.Combatant) === true`.
3. Gates: `trade-ranching`, `trade-fishing` vitest; `lint:kept-animals`.

Commit: `build(narrowing A3): KeptAnimal stands on Actor — the cat can fight back`

### A4 — the naming pass

1. `platform/agent/Gus.ts:58` and `terminus/src/terminal/agent/TicketClerk.ts:26`:
   `extends Cast` (E12); `Gus.ts:7-10` docstring corrected to say the
   declarative path now exists and this class predates it.
2. `trade-ranching/src/agent/Livestock.ts:18-20`: the stale Chattel
   sentence deleted (the `:69-73` block is the truth).
3. `HaulingCreature` references: `docs/subsystems/conveyance.md:193-199`,
   `docs/slates/builds/mining-slate.md:591` — A5 rewrites them; this
   wave greps `HaulingCreature|DraftHorse|PitPony` across `packages/`
   and leaves zero.

Commit: `refactor(narrowing A4): two classes that were Cast extend Cast, and four docstrings stop lying`

### A5 — the documentation and the wiki pages

- `docs/architecture.md:878-925` — the branch passage redrawn:
  `Agent → Creature → Actor → Character → Avatar`, `Beast` and
  `DraftAnimal` as the animal clone targets, `KeptAnimal` over
  `Actor`; the `Perception`/`Combatant` sentences move tiers.
- `docs/subsystems/conveyance.md:193-199` — *"composes on `Character`
  and `DraftAnimal`"*; the `HaulingCreature` sentence replaced.
- `docs/subsystems/behavior.md:388-420` — `Beast` beside `NPC` as the
  second brain-carrying rung.
- `docs/subsystems/combat.md:628` — *"composed on `Actor`"*.
- `docs/subsystems/identity.md:108-109,130-144` — the wolf example
  leaves `Extra`; a line that `Beast` is the third clone target and
  is neither rung.
- `docs/subsystems/pets.md:51-66` — still true; add that `KeptAnimal`
  now stands on `Actor` and what that brings.
- `docs/subsystems/vitals.md:48-58` — the three-tier sentence.
- `docs/subsystems/perception.md` — viewer = `Actor`.
- `docs/slates/builds/mining-slate.md:591` — `DraftAnimal`.
- Wiki pages per E17.

Commit: `docs(narrowing A5): the Actor rung in every doc that drew the agent branch`

### A6 — the drive, part G

Appended to `packages/wire/tests/base-class-narrowing.dirty.wire.test.ts`
as `suite('G — a horse is not a person, and a wolf fights back')`. No
pack added to `declareFile`. Each checkpoint can fail.

```
beforeAll (240 s):
  carter  = at(STREET, 'carter', true)           // wizard: clone
  hunter  = at('/world/newbie-wilds/crossroads/treeline', 'hunter', true)
  reader  = at(LOBBY, 'reader')
  carter: clone /system/transport/agent/draft-horse ; clone /system/transport/thing/wagon ; drainProse
  hunter: clone /stuff/thing/gear/handcart ; drainProse

G1  the street has a horse and a wagon
    roomText(carter) matches /draft horse/ and /wagon/
    ⚠ read AFTER the clone frames have landed on beforeAll's own tail (the part E lesson)

G2  ⭐⭐ `hitch wagon to horse` — the binder accepts the horse as a Hauler
    expectOk(carter.cmd('hitch wagon to horse'))
    then `look horse` matches /hitched|in the traces|wagon/ (the Hauler's look line, or the wagon's `hauledBy`)
    then expectOk(carter.cmd('unhitch horse'))
    → proves the arg gate at hitch.yaml:35 resolves on DraftAnimal. Before A1
      it passes too (Character); its job is to stay green ACROSS A1.

G3  ⭐ `hitch handcart to wolf` — refused, and refused BY NAME
    r = hunter.cmd('hitch handcart to wolf'); expectRefused(r)
    said(r) matches /can't pull a cart/   (lib/mixin.ts:806, the Hauler refusal)
    ⚠ If the binder's refusal is SILENT (no text), that is the finding, not a pass:
      assert the text; do not weaken to "not ok".

G4  ⭐⭐ the wolf fights back — Combatant on Actor, brain-driven
    expectOk(hunter.cmd('attack wolf'))
    idle(hunter, 60)  // ~5 wall-seconds at 12×; the session beat is game-time
    the hunter's frames since the attack contain a scene whose ACTOR is the wolf
    (match /wolf .*(bites|worries|lunges|snaps)/ from the species' natural attacks —
     read `species-and-names/…/wolf.yaml:31` at build time for the verbs)
    then expectOk(hunter.cmd('yield')) or leave the session; the file is dirty already
    → before A1 this passes (Extra is a Combatant); after A1 it proves the actor face
      survived the move. If it fails, the wolf is taking the fight in silence (E1).

G5  ⭐ the horse's idle beat still reaches the street (E10 / A2)
    idle(carter, 90) — cadence:70s game-seconds
    frames contain /horse .*(shifts a foot|swings its head|leans into the collar|blows out)/
    → before A2 this FAILS on a Beast (silent no-op); it is the checkpoint A2 exists for.
    ⚠ Assert on the CARTER's peer frames, not the horse's self frame (a Beast has none).

G6  ⭐⭐ the panels — what the world claims after the move
    hauler    = inverse(reader, 'hauler')
      matches /platform\/agent\/DraftAnimal/ (positive first)
      matches /agent\/Cast|lib\/character\/Character/ (a person hauls)
      not /platform\/agent\/Beast|KeptAnimal|Corpse|Livestock/
    combatant = inverse(reader, 'combatant')
      matches /platform\/agent\/Beast/ and /DraftAnimal/ and (after A3) /KeptAnimal/
      not /agent\/Corpse/ ; not /ranching\/agent\/Livestock/
    employed  = inverse(reader, 'employed')
      matches /agent\/Cast/ (positive)
      not /Beast|DraftAnimal|KeptAnimal/   ← the narrowing's claim, read off the page
    ⚠ by CLASS past 40 rows (part E's note); Employed has 60 rows.

G7  the wiki page for the beast itself renders
    page = wiki beast ; matches /Beast/ ; not /no such page/
```

Recorded under `§ Drive record` in this file, the part E way: what it
found in the PRODUCT, what it found in the DRIVE, what it could not
prove (the pit pony: same class, not loaded; the mount/ride path: needs
a rider and a body-plan `back:1` — driven by the conveyance build,
cited).

Commit: `drive(narrowing A6): part G — the horse hitches, the wolf bites, and the employed panel names no animal`

**✅ A6 DONE — 27/27** (parts 0, A–G). Seven runs; the wolf, the panels
and the beast page passed first time, and every other checkpoint found
something.

### ⚠⚠ What it found in the PRODUCT — four verbs afforded by NOTHING

`hitch`, `unhitch`, `mount` and `ride` each had a view, a controller
and an arg gate, and **no `commandContributions` anywhere in the repo
named any of the four files.** `hitch wagon to horse`, typed in a goods
yard with a wagon and a horse standing in it, answered *"I don't
understand 'hitch'."* ⭐ That is the FIRST of the five reachability
links, dead on four verbs, and it makes `conveyance.md`'s worked
example — *a horse you ride while it hauls* — unreachable for every
player since conveyance shipped. Fixed: `HaulableMixin` affords
`hitch`/`unhitch` and `MountableMixin` affords `mount`/`ride`, both to
**`peers`** (a cart and a horse stand beside you; `environment` grants
outward to your containers — the mistake `wash` shipped with).

### ⚠ What it found about the CLONE gate, twice

`clone …/wagon` and `clone …/ore-tram` answer `access-denied` while
`clone …/coach` succeeds. `CloneController.ts:161-183`: with **no live
instance** the gate is `canAtPath` (a titled root answers yes); with
one it is `AccessApi.can` through **that instance's zone**. So a wagon
standing in the Terminus goods yard makes the wagon ROW unclonable by
anyone who does not hold Terminus, and the *second* clone of the draft
horse failed in a different locality for a row nobody there had
touched. ⭐ **A row gets harder to clone the moment somebody puts one
down.** Filed, not fixed.

⚠ My first reading was *"the store stocks it, so the shop owns it"* — a
guess that fitted two data points and was wrong (the ore-tram is
stocked nowhere). Reading the controller settled it. **Two data points
and a plausible story is not a diagnosis.**

### ⚠ What it found about the DRIVE

- **A cloned thing lands in your INVENTORY, and inventory is not
  `peers`.** `mount` stayed unknown with the affordance already in
  place and correct, because the horse was in the founder's pack. The
  wagon is a room prop, which is why `hitch` worked from the first run
  and `mount` did not — and the bug reads exactly like *"the Mountable
  affordance does not work"*. One `drop horse` fixed it.
- **An unlit room renders an agent as "someone".** The goods yard is
  outdoors at midnight and a freshly-cloned lantern gives *"shapes and
  edges, no more"*, so `look horse` returned `someone` + the long
  description. Matched on the prose. ⭐ Darkness blocks the RENDER, not
  the binder — which is why the checkpoints do not depend on a listing.

### What it could not prove, stated rather than faked

- **`hitch` COMPLETING.** `HaulageRig.canHitch` demands a competence
  band — *"the ACTOR's competence decides, not the hauler's"* — and a
  fresh founder has no transcript. Shipped behaviour, not this build's.
  ⭐ But `hitch-refused` is the CONTROLLER's veto, and reaching it means
  the binder had already resolved the horse against
  `requires: HaulerMixin`, which is the whole question. A horse that had
  lost `Hauler` refuses earlier, at the gate, with no prose.
- **`mount wolf`.** Only one horse exists per run (the clone gate
  above), so the mount question is asked where the verb lives — `mount
  wagon` at the yard, refused by the same gate that refuses a `Beast`.
  The wolf's half is `Beast.test.ts` plus the `hauler` panel.
- **The pit pony.** Same class as the horse; `trade-mining` and
  `rejection` are not in this file's pack list, so it is proved by test
  and census.

### A7 — the measurement, re-run

`pnpm -C packages/server composition-census --json` before A0 and after
A6 (the W6 recipe, clusters plan `:1145-1210`), diffed:

- three rows (`Beast`, `DraftAnimal` ×2) drop from the `Character`
  set: 14 classes → 12 (`DraftHorse`, `PitPony` gone; `Extra` keeps 4
  rows);
- `Persona` 60/0 → 57/0, `Employed` 60/2 → 57/2, `Caster` 60 → 57, and
  so on for each of the fifteen;
- `Combatant` 60/2 → 73/2 (every animate body; 0 new authoring);
- `--siblings` no longer pairs `DraftHorse` with `PitPony`;
- `--cotenancy` on `Extra` unchanged (E8 is filed, not fixed).

Commit: `tools(narrowing A7): the census after — three animals stopped claiming to be people`

**✅ A7 DONE**, and ⚠⚠ **the headline is what the instrument cannot
see.**

| mixin | classes before → after | rows before → after |
|---|---|---|
| `Caster` · `Memorized` · `Employed` · `Persona` | 14 → **12** | 60 → **57** |
| `Gendered` · `Hiding` | 14 → **12** | 60 → **57** |
| `BeliefStore` · `Status` | 17 → **15** | 69 → **66** |
| `Costumed` | 9 → 9 | 55 → **54** |
| **`Combatant`** | 14 → **17** | 60 → **69** |
| new classes | `Beast`, `DraftAnimal` | |
| gone | `DraftHorse`, `PitPony` | |

Three rows — the wolf, the draft horse, the pit pony — off the person
rung, and `Combatant` picks up nine rows as the beasts and the kept
animals gain the half that answers.

⚠⚠ **`Sensor`, `Engaged`, `Mobile`, `Perception`, `CommandGiver`,
`Soul`, `Vocal`, `Advancement`, `Perceiver` and `Dispositioned` all
read 0/0 in this table, and they are not absent — the census cannot see
them.** It builds each class's layer list from
`getPersistenceContributors`, which drops any mixin with no persistent
field of its own, so **four of the five mixins A0 moved are invisible to
the instrument that is supposed to measure the move.** `Combatant` is
the only one of the five with fields, which is why it is the only one
that shows.

⭐ That is the same distinction `mixin.introspectionChoice.test.ts`
pinned in the Thing branch — `queryMixins` is IDENTITY,
`getPersistenceContributors` is SERIALIZATION — arriving here as a
limit rather than a defect. **The evidence for A0 and A3 is
`Actor.test.ts` and `Beast.test.ts`, which read `MixinApi.hasMixin`;
the census corroborates only the part that happens to persist.** Saying
otherwise would be citing a number that cannot move.

⚠ And the census sees only rows, so `Actor` itself — substrate no row
names — does not appear at all, exactly as `HaulingCreature` never did.

### A8 — the slate

Appended to `docs/slates/builds/base-class-narrowing-slate.md § Deferred,
with destinations` (its existing *"The agent chain"* and *"The Extra
taxonomy"* lines are the ones this build answers in part; rewrite them
to say what landed and what is left):

- **E8** — `Persona` off `Character` onto `CastMixin` + `Avatar` (the
  `Named` precedent), blocked by fifteen accreted `self` affordances
  that need a host meaning *every person who can act*; the fork stated
  (`CommandGiver.self` · a new mixin · leave). Plus `prologue` vs `bio`.
- **E11** — `Chattel`/`Branded` on `DraftAnimal`: D2's definition says
  yes, D2's host list says no; the owner decides.
- **E12** — the `Staged` split (a `props:`-only rail for bodies); its
  four receipts (`Katie`, `Walter`, `Realtor`, `Gus`).
- **E15** — `Livestock` over `Actor`: ranching's call, one word.
- **E16** — the abstract costume parent (`student.yaml`): a row key,
  the templates subsystem's.
- **E9** — `wolf.yaml` could author a `concealment` band (the lurking
  beast the mixin's docstring promises).
- **`WorkingAnimal`'s transcript** — `Advancement` on a working animal,
  as `WorkingAnimal.ts:38-43` files it: beside pets, not here.
- **The ox you lead** — a `Hauler(Beast)` with no `Mountable`; no row
  wants it yet.

Commit: `slate(narrowing A8): what the Agent pass found and did not decide`

---

## Test & gate strategy

**Tests that change, and why each is not a weakening:**

| test | change | why it is not a weakening |
|---|---|---|
| `trade-mining/src/agent/__tests__/haulage.test.ts:37-55` | `expect(pony.class).toBe('/platform/agent/DraftAnimal')`; the comment *"`Hauler` (the hitch) comes from `Character`"* rewritten | the test's own thesis — *"its class adds NO haulage code"* — becomes literally true: there is no class. It pinned the class PATH, which was the half of the move it did not make (the coordinator's warning); the assertion that survives is the one about mass. |
| `Creature.chattel.test.ts`, `Creature.branded.test.ts` | gain `DraftAnimal`/`Beast` negatives (E11) | additions only |
| `Character.test.ts:59-70` (Gendered/Sensor/Vocal stubs) | none | still true |
| any snapshot golden pinning `Character`'s layer ORDER | regenerated if it fires | composition order is not a contract anywhere in the tree (`mixins.md`); the golden that pins it is documenting an accident. Cite the file in the commit if this happens; if no golden fires, say so. |
| `HitchController.test.ts`, `Hauler.test.ts`, `Mobile.tow.test.ts`, `LocomotionLogic.haulage.test.ts` | none | they build their own hauler from mixins (`haulage-fixtures.ts:24`) — which is why they were never evidence that a hauler must be a person |

**Tests added:** `Actor.test.ts` (A0), `Beast.test.ts` (A1),
`Behaved.emoteFree.test.ts` (A2), the `Actor.test.ts` additions (A3).
Every class-level assertion uses `MixinApi.hasMixin(Class, Mixins.X)`,
the `Creature.chattel.test.ts:35-53` shape.

**Gates this build must satisfy** (`lint:family` runs all; these are
the ones a wave can trip): `lint:instanceable` (three rows' `class:`,
the emptied pack dirs, no `/lib/` row), `lint:identity` (the wolf row
judged as a non-Cast; rule 6), `lint:kept-animals` (no new `Bonded`
composer), `lint:mixin-names` (no new mixin, nothing to add),
`lint:mass` (agent rows are exempt via `Creature.getMass` — unchanged),
`lint:dispositions` (the A2 rule, ceiling 0), `lint:lib-statics` (no
static on `Actor`), `lint:module-scope`, `lint:imports` (pack rows
name kernel classes by path; no pack `src/` imports change).

**`pnpm test` once**, before the MR returns to review; `test:near` and
each touched pack's vitest per wave.

---

## Acceptance, in the requirements doc's terms

The requirements doc's acceptance for this branch is the Thing branch's
read across (`base-class-narrowing-requirements.md:289`, *"Inspect a
kept animal … It still does"*). Part G reads:

- a horse hitches (G2) and a wolf is refused as a hauler by name (G3);
- a wolf fights back (G4) and a horse still shifts its feet (G5);
- the `employed`/`caster`-class panels name no animal and the
  `hauler`/`combatant` panels name the right ones (G6);
- the cat still answers `name` with `not-chosen` (part E, unchanged, so
  A3 did not move the bond).

---

## Risks & opens

1. **Composition ORDER on `Character`** (A0). The five move inner of
   seven person mixins. Read for overrides — none found — but the
   proxy resolves methods by prototype order and a shadow registered
   against a mixin NAME (`ShadowApi`) resolves the same. The mitigation
   is the full `test:near` over `lib/character`, `lib/creature`,
   `lib/combat`, `lib/spatial`, `lib/activity`, `lib/message`,
   `lib/perception`, `lib/persistence`, `platform/agent` plus parts
   0/A/E of the drive before A1 starts. If a test pins order, Test
   strategy says what to do.
2. **`KeptAnimal` gaining `Combatant`** (A3): the cat in the lane can
   now be attacked AND responds through the default combat brain. Is a
   scratching cat the honest sim? Yes by E1; if the owner disagrees,
   A3 is the wave to drop, and `KeptAnimal` keeps composing its own
   three on `Creature` as today.
3. **The `emotive-esp` → `act.deed` change in A2 alters what a
   Character-tier bystander with no implant sees of a beast** (they
   now see it). That is the fix, but it is a visible change in three
   rows' output; part G5 is its witness.
4. **`lint:identity` on the wolf.** After A1 the wolf row is judged as
   "not Cast"; rules 1–2 (name/register) pass, rule 4 skips
   (non-sentient), rule 6 passes (no name). If the gate ever grows a
   *"every non-Cast organism row must be an Extra"* rule, `Beast` rows
   need a carve-out by composition, never by name.
5. **The pack class-source table** (`content-packs.md § the capability
   rung`): deleting `DraftHorse.ts`/`PitPony.ts` may leave a manifest
   entry; A1 step 2 greps for it. A stale entry fails at pack
   discovery, loudly.
6. **The `hitch` affordance source** is not verified in this plan
   (Reachability, row 2): it is afforded to the giver by SOME static
   and the giver is always a person, so A1 cannot break it; A0's
   `test:near` over `platform/idea/cmd/movement` and G2 prove it.
7. **The census's row-only blindness**: `HaulingCreature` had no row
   and was invisible; after A1 `Actor` has no row and is invisible
   too, by design. A7 states both.

## Deferred seams

Filed by A8 (above): E8, E9 (the lurking wolf), E11, E12, E15, E16,
the working animal's transcript, the ox you lead. Each leaves as a
slate line with its receipts; none stays in this file after the sweep.

---

## Critical files

Read first, in this order:

1. `docs/plans/base-class-narrowing-clusters-plan.md` (D1–D8, D13–D15, § The second pass) · this plan
2. `packages/server/src/mud/lib/creature/Creature.ts:1-200` · `lib/character/Character.ts:1-133,266-275` · `lib/creature/KeptAnimal.ts:1-136`
3. `platform/agent/HaulingCreature.ts` · `content/transport/src/agent/DraftHorse.ts` · `content/trade-mining/src/agent/PitPony.ts` · `platform/agent/{Cast,Extra,Corpse,Gus,Mercenary}.ts` · `lib/npc/NPC.ts`
4. `lib/behavior/Behaved.ts:440-470` · `lib/behavior/idles.ts` · `lib/behavior/combatant.ts:36-48` · `lib/social/Soul.ts:298-330` · `lib/behavior/follows.ts:58-72`
5. `platform/idea/cmd/combat/AttackController.ts:50-60` · `platform/idea/api/CombatLogic.ts:585-594,1688-1696,3203-3222` · `platform/idea/api/PerceptionLogic.ts:430-440` · `lib/accountability/AccountabilityEvent.ts:236-246`
6. `lib/slot/Hauler.ts` · `lib/slot/Mountable.ts:1-30` · `lib/slot/__tests__/haulage-fixtures.ts` · `platform/idea/cmd/movement/HitchController.ts`
7. `packages/content/platform/content/platform/cmd/movement/{hitch,mount,ride}.yaml` · `social/talk.yaml` · `combat/attack.yaml`
8. the rows: `wolf.yaml` · `draft-horse.yaml` · `pit-pony.yaml` · `Corpse.yaml` · `hanging-carcass.yaml` · `costume/student.yaml`
9. `packages/server/scripts/check-identity.ts:1-100,180-200,320-440` · `check-kept-animals.ts:1-45` · `check-dispositions.ts:1-30` · `check-mass.ts:36-52`
10. `platform/idea/api/StudioLogic.ts:76-100`
11. `packages/wire/tests/base-class-narrowing.dirty.wire.test.ts:37-200,632-900`
12. `docs/subsystems/pets.md:44-70` · `conveyance.md:185-215` · `architecture.md:878-925` · `identity.md:50-145` · `vitals.md:48-60`

---

## Drive record

*(appended at build time)*
