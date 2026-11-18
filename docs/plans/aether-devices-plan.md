# Aether devices — implementation plan

Executes [aether-devices-requirements.md](../requirements/aether-devices-requirements.md)
(**kind: feature, mostly debt · leads from: kernel**; first consumers the
phone, the new player's starting kit, and the lounge's NPCs). The build
gives a player a phone that tunes them while they carry it in hand or
ready, runs installed apps (Messages, day one), runs only for its
title-holder, drains and charges in real watt-hours, and can be switched
off; retires the free implant for everyone but guests; makes an emote
reach every sensor in its room; and holds any message that cannot cross
until it can. Seeding slate:
[aether-devices-slate](../slates/engine/aether-devices-slate.md) — § 11 is
the reuse ledger every item below answers to.

Branch `build/aether-devices`. Sibling in flight: `build/navigation-server`
edits `Avatar.ts` (`enter`), `Carrying.ts` and `PerceptionLogic.ts` — this
plan touches `Avatar.ts` in named places only, `PerceptionLogic.ts` at two
one-word lines, and `Carrying.ts` not at all (§ Risks R9).

**Revised 2026-11-18 after the owner's review** — re-cut so no concept has
two homes (§ For the owner; § New substrate, *Retired and moved*).

---

## ⚠ For the owner

**Ruled 2026-11-18 (the plan review).** Item 1 is decided as recommended;
items 2–6 stand. The owner's rule for this revision: *"I don't want two
competing designs for the same thing."* The plan was re-cut to it — every
concept below has one home, and what a new piece supersedes is retired or
moved in this build (§ New substrate, *Retired and moved*).

1. **RULED — where the chargers' power comes from.** Neither place the
   requirements put a charger had electric power: Duncan Hall's dorms are
   declared `powerBand: off-grid`
   (`packages/content/eternal-university/pack.yaml:41`) and the lounge has
   a paid **mana line** and no grid. Decided: the dorms parcel joins the
   grid on the University Avenue node (the mana lamp stays); the lounge's
   charger runs on its mana line. The phone charges from anything that
   answers the kernel's shipped *powered* question and never knows which.
2. **Nobody is billed for charging.** Metered billing does not exist
   (energy.md defers it). A charger works exactly while its supply is live.
3. **Blindness does not exist in the engine.** The reading rule is built as
   *can perceive by sight and is conscious*; drive step 16 is staged with
   unconsciousness. A blindness condition joins later with no change here.
4. **`dm`, `reply` and `chat` are the person's words.** Step 2b needs `dm`
   to answer *"install Messages"* and hold the message while Messages is
   uninstalled, so the verb cannot come from the app. After the re-cut
   this is simply where comms lives: one mixin, on the person; Messages is
   the app it looks for.
5. **The phone is not a `watch`-able screen on day one** — a screen has no
   idea of a battery, so a dead phone would play a stream.
6. **The bound title** binds only the title; the object still moves, drops
   and is stolen.

**New with the re-cut — for the owner to know, none blocks:**

7. **`apps` works on a device you carry, not on yourself.** The wallet,
   calendar and forums stay attached to the person, are not listed by
   `apps`, and cannot be uninstalled. A shade's Messages is the same.
8. **An augment can now say why it is not working** (packed, off, dead,
   not yours). Today the phone is the only augment that ever answers; the
   implant joins when the epoch build gives it a power state (*"you power
   it down, it's a law"*). It is on the augment, not the phone, because the
   person's refusal has to ask a device it knows only as an augment.
9. **The re-cut edits two lines in `PerceptionLogic.ts`**, a file the
   navigation build is also editing (§ Risks R9). They are one-word
   changes, done in one early wave.
10. **A phone left on the lounge's charger at logout** sits in a room that
    does not persist; W9 checks what the shipped rules do with it before
    that charger is placed.

---

## Grounding

Verified by opening files this cycle (2026-11-18). Where this corrects the
brief or the requirements, it says so.

### Attunement and conferral

- `lib/message/Aether.ts` — `AetherMixin`: `_augmentGated = true`,
  `_grantsModalities = ['verbal-esp','emotive-esp']`, and the **host side**
  (`_hostedUpdates`, sealed `hostUpdate` / `unhostUpdate`,
  `getHostedUpdates`, `_dropHostedUpdate`). Its `AetherHost` doc already
  names *"a corporeal `Thing` like the future radio via intrinsic
  composition"* as a host. Composed in exactly one place:
  `lib/character/Avatar.ts:190`. No NPC class composes it.
- ⚠ **`MixinApi.isAether` is composition-only** (`api/mixin.ts:1182`,
  `hasMixin`) — augmentation.md says the predicates route through
  `isActive`; this one does not. *Tuned* is
  `MixinApi.isActive(x, 'AetherMixin')` or the sensorium read. So the
  wallet, calendar, forums and TPA reads that narrow on `isAether`
  (`FastTravel.ts:300`, `TeleportController.ts:445`, `CalendarApp.ts:50`,
  `Forums.ts:69`) keep working for an untuned player with no change.
- `api/mixin.ts` `collectAugmentConferralNames` (~l.3105) has three legs:
  slot occupants composing `AugmentMixin` (`confers()`, read through
  `getAllOccupants`), `Species.getInnateMixins()`, and a per-host leg
  `getConferredMixinNames()` whose one implementer is
  `platform/agent/ShadeAvatar.ts:99`. **Hands are slots**, so a held
  augment is already walked.
- `platform/idea/api/PerceptionLogic.ts:238` — `sensorium()` calls
  `MixinApi.getActiveMixins(viewer)` on **every** call, and
  `SensorMixin.filterMessage` (`lib/message/Sensor.ts:85`) calls it for
  every frame that carries a modality. Conferral is a hot path.
- `PerceptionLogic.reachOf` (~l.1785) already descends into every carried
  thing that composes `AetherMixin` and pushes its hosted updates
  (`pushHosted`), at any depth — the reach leg augmentation.md describes.
- `platform/thing/AetherImplant.ts` —
  `AugmentMixin(SlottableMixin(TangibleMixin(Good)))`, row at
  `packages/content/generic-objects/content/stuff/thing/AetherImplant.yaml`
  (`TemplatePaths.aetherImplant`). ⚠ augmentation.md gives its path as
  `lib/augmentation/AetherImplant.ts`.
- `packages/content/generic-objects/src/thing/Headset.ts` —
  `WearableMixin(AetherImplant)`; it inherits whatever the implant becomes.

### The loadout

- `Avatar.installDefaultLoadout` (`Avatar.ts:1345`) — seats the implant
  when `AetherMixin` is not active, then hosts `CommsUpdate`,
  `ForumsUpdate`, `CredentialWalletUpdate`, `CalendarUpdate` on the person.
  Called from `Avatar.onCreate` (every vessel body) and twice from
  `PrimaryAvatar.onCreate` (`:124` with no snapshot, `:157` after
  `materialize`).
- Guests are `isGuest` bodies minted by `Login.mintRandomGuestAvatar`;
  `shouldPersist()` is false for guests, shades and circle bodies.
- Char-gen: every aspiration's outfit in `mud/config/char-gen.yaml`
  includes `/stuff/thing/clothes/student-trousers`, which has two pockets
  (mouth 0.12 × 0.035 m, 0.0006 m³). `EmbodyController` step 5 calls
  `avatar.wearGarments(aspiration.outfit)`. **Every new character has a
  pocket.**

### Comms, chat, emotes

- `lib/comms/Comms.ts` — `CommsMixin.tell` sends as `getHost()` and throws
  when that host is not an aether host; its `commandContributions.self`
  names `dm`, `reply`, `broadcast`, `chat`. `self` reaches a hosted
  update's host only when that host is a command giver
  (`CommandLogic.applyHostedUpdateDeltaImpl`), so on a device it is dead.
- `dm.yaml`, `reply.yaml`, `broadcast.yaml`, `chat.yaml`, `forum.yaml`
  carry the verb-level validator `requiresVerbalESP` (fixed text *"You have
  no way to send a thought."*). `chat`'s validator sits on the verb, so it
  gates every subcommand. `requiresEmotiveESP` exists and no view uses it.
  There is no `tell` view. `dm`'s target is `scope: online`.
- `DmController.resolveComms` finds the comms update through the MQL
  `person` pool — which would find Messages inside a packed, dead or
  stolen phone.
- `lib/social/Soul.ts:255,303` — `emote` and `emoteFree` stamp one scene
  `.modality('emotive-esp')` covering self, peers and target alike. A
  directed emote resolves its target `scope: online`
  (`EmoteGrammar.ts:119`) and reaches it with `toTarget`, with no check on
  the sender.
- `lib/behavior/brain.ts:312` — `WITNESS_TOPIC.emote = 'act.emote'`, read
  off the NPC's own `handleMessage` stream (`Behaved.ts:703`). Remy's
  `reacts` brain on `trigger: emote`
  (`saxonberg-lounge/content/world/lounge/agent/remy.yaml:84`) never fires
  because the frame is dropped at `filterMessage`.
- **No held-message mechanism exists in code.** *Held until they return*
  appears only in slates. `docs/subsystems/client-shell.md:1243` records
  *"no mailbox, no notice queue"*. The record layer's frame store is
  written **after** `filterMessage`, so it holds only what was delivered.

### Commands

- A carried thing's verbs reach its carrier through the `environment`
  bucket at **any depth**, maintained on every `ContainmentApi.move` by
  `CommandLogic.applyContainmentDeltaImpl` (it walks the moved subtree).
  The carrier's recency stack is therefore an exact, maintained record of
  what it bears.
- `SwitchableMixin` (`lib/boundary/Switchable.ts`) affords `switch` through
  `peers`, `environment` and `inventory`.
- `apps`, `install` and `uninstall` name no view. `tune`, `call` and
  `unlock` are taken.
- `CommandContext.commandText` is the raw line; `CommandGiver.executeCommand`
  runs one.

### Power

- No electrical battery exists. `lib/magic/Charged.ts` is denominated in τ,
  leaks in proportion to its stock, has no absence guard by design, and is
  coupled to `MagicApi`. `lib/reserve/Reserved.ts` is the shared store
  under it (`ReservedMixin`, persistent `reserves`).
- `lib/supply/Powered.ts` — the kernel `Powered` shape (`isPowered`,
  `availablePowerW`, `poweredTrajectory(fromS, toS)`); `lib/Trajectory.ts`
  `Piecewise.integrate` exists.
- `packages/content/energy/src/lib/GridPowered.ts` — resolves its premises'
  band and feeder **once, on first read, and caches them**. Every composer
  today is a fixture.
- Metered billing is a deferred seam (energy.md § Deferred seams, Tier C).
- Game time is 12× real (`docs/subsystems/time.md`): a game day is two real
  hours.

### Ownership and shops

- `lib/chattel/Chattel.ts` — `stampedOwner()` is a sync read;
  `stampChattel` / `transferChattel` are sealed and return
  `{ ok: false, reason }` on refusal; every transfer funnels through
  `ChattelLogic.transfer`. Six callers of `transferChattel`
  (`ContractLogic.ts:1821`, `ConsignmentShelf.ts:378`, `Stock.ts:581,778`,
  `trade-farming Tract.ts:828`, `trade-potash ashes.ts:130`). Nothing
  marks a title as untransferable today.
- The `chattel` collection refuses under the sandbox
  (`schema/chattel.yaml`), so a circle cannot stamp a title.
- `title transfer` (`civics/title.yaml`, `TitleTransferController`) reads a
  greedy string and branches on its shape: a path is a parcel, `<n> shares
  of <ship>` is a ship.
- The Terminus general store's stock is `stockLines` on
  `terminus/content/world/terminus/general-store/counter.yaml`.
- Brand rows: `packages/content/corpo-*/content/stuff/idea/corpo/Brand/*.yaml`
  (`key`, `name`, `owner`, `category`, `positioning`, `descriptor`); a good
  carries one through `BrandedMixin`'s `brand` key.

### Places

- ⚠ The dorm room row is
  `eternal-university/content/world/terminus/eternal/duncan-hall/unit/room.yaml`
  (the brief's `location/dormroom.yaml` does not exist). Its `props:` list
  holds a mana lamp, the wardrobe and the bed.
- ⚠ Duncan Hall's dorms are `powerBand: off-grid`; the lounge has a mana
  line and no feeder (see *For the owner* 1). Feeder nodes are in
  `world-seed/content/stuff/idea/Feeder/terminus-main.yaml`; `crossing` is
  on University Avenue.
- The lounge location is a warren of repeated, non-persistent clones
  (`saxonberg-lounge/content/world/lounge/location/lounge.yaml`).

### Client and tests

- The status bar carries the **shelf** (`components/frame/Shelf.tsx`,
  client-shell.md § The widget shelf); a live row reads a field off the
  `self` card (`BODY` reads `bodyState`).
- Wire files are named `<feature>.dirty.wire.test.ts` when they consume
  state and `<feature>.soak.dirty.wire.test.ts` for the soak lane ⚠ (the
  brief's `aether-devices.wire.test.ts` is not the convention).
  `restartWorld()` is a per-file helper
  (`documents-path-identity.dirty.wire.test.ts:155`). The harness has
  `advanceClock`, `stage(path, method, args)` and `afflict`
  (`api/test-harness.ts`).

---

## ⭐⭐ New substrate

**New: one mixin, four classes, one verb.** Everything else is a re-cut of
a piece that already exists, and each re-cut retires what it replaces. No
Api, no logic singleton, no registry, no document kind, no collection, no
eslint exception.

### New

| # | item | where | ledger |
|---|---|---|---|
| N1 | **`BatteryMixin`** | `lib/supply/Battery.ts` | *the battery* — **genuinely new**, over the shipped `Reserve`. Searched `battery`, `Wh`, `capacityWh`, every `ReservedMixin` and `PoweredMixin` composer |
| N2 | **`Phone`** class | `platform/thing/Phone.ts` | *the phone* — a class because conferral needs one (the ledger's own condition) |
| N3 | **`Charger`** class | `packages/content/energy/src/thing/Charger.ts` | *the charger* — `GridPowered` plus a surface |
| N4 | **`ManaCharger`** class | `packages/content/arcana/src/thing/ManaCharger.ts` | *the charger*, on a mana line (For the owner 1) |
| N5 | **`apps`** verb | view `platform/cmd/device/apps.yaml`; `AppsListController`, `AppsInstallController`, `AppsUninstallController` in `platform/idea/cmd/device/` | requirements |

### Re-cut (an existing piece changes shape; nothing stands beside it)

| # | item | what changes | ledger |
|---|---|---|---|
| R1 | **`AetherMixin` splits in two** | `AetherMixin` (`lib/message/Aether.ts`) keeps only *perceiving*: the gate and the two modalities. *Hosting* moves, whole, to **`AetherHostMixin`** (`lib/augmentation/AetherHost.ts`) — the graduation augmentation.md already names | *apps* |
| R2 | **`AetherHostMixin` owns the app list** | the hosted set gains its durable half: persistent `installedApps`, authored `offersApps`, `installApp` / `uninstallApp` / `hasApp` / `availableApps`, authored `manifestsAs`; it affords `apps` | *apps* — the host side *is* the app list; it was only unpersisted |
| R3 | **`CommsMixin` moves onto the person** | composed on `Avatar` instead of on a hosted update; it keeps `tell` and the cohorts, keeps the four verbs, and gains what waits (held outbound, held inbound), the two questions (`sendOrHold`, `receptionRefusal`) and the status word | *held messages* — the held lists are **genuinely new** state (searched `held`, `outbox`, `mailbox`, `while you were away`); their home is not |
| R4 | **`CommsUpdate` becomes `App`** | the class loses `CommsMixin`, is renamed `platform/idea/App.ts` (`AetherHostedMixin(Idea)` + `appName`), and Messages is its first row, `/platform/idea/app/messages` | *apps* — an app as a row on one generic class |
| R5 | **`AugmentMixin` can say why not** | one member, `conferralRefusal()`, default `null` | *conferral by carrying* |
| R6 | **the acquired conferral leg widens** | `collectAugmentConferralNames` asks every augment the body **bears** — slot occupants, as today, and carried ones — instead of slot occupants only. One leg, not a second | *conferral by carrying* |
| R7 | `CommandGiver.getCommandSources(bucket)` | a read of the recency stack the containment chokepoint already keeps | reuse |
| R8 | **a title can be bound** | `stampChattel(owner, { bound })`, `isTitleBound()`, `bound` on the `chattel` row | requirements |
| R9 | `title transfer` takes a good | an arm in `TitleTransferController` | reuse of the shipped verb |
| R10 | `Avatar.isBornTuned()` | the body's own conferral answer, read by the one per-host leg | replaces `ShadeAvatar`'s method |
| R11 | `Avatar.installDefaultLoadout` | installs through `installApp`; the implant only for guests | *starting kit* |
| R12 | shelf row `AETHER`, `self`-card field `aetherState` | `Shelf.tsx`; `CommsMixin` | client-shell's shelf |
| — | unit `Wh`, if the catalogue lacks it; an instance handle on `stage`, if it lacks one | `lib/quantity.ts`; `api/test-harness.ts` | quantities.md; a tool the drive owes |

### Retired and moved — in this build, none left beside its replacement

| retired | replaced by | wave |
|---|---|---|
| the host half of `AetherMixin` (`_hostedUpdates`, `hostUpdate`, `unhostUpdate`, `getHostedUpdates`, `hostsUpdate`, `_dropHostedUpdate`, the `AetherHost` interface) | `AetherHostMixin` — the members move, they are not copied | W2 |
| every `MixinApi.isAether(x)` that means *hosts software* (`CommandLogic` ×1, `PerceptionLogic` ×2, `TeleportController`, `CalendarApp`, `Forums`, `Avatar`, tpa's `FastTravel` ×3) | `MixinApi.isAetherHost(x)` | W2 |
| the four hand-rolled clone-then-`hostUpdate` blocks in the loadout | `installApp` | W2 |
| `CommsUpdate` (class, row, `TemplatePaths.commsUpdate`) | `App` + the Messages row | W3 |
| `CommsMixin` composed on a hosted update; its soft pairing cast to `AetherHosted`; `tell`'s `getHost()` | `CommsMixin` on the person — the sender is `this` | W3 |
| `DmController.resolveComms` and `tell`'s MQL lookup of the recipient's comms update | `MixinApi.isComms(person)` | W3 |
| `requiresVerbalESP` on `dm`, `reply`, `chat`; its fixed text everywhere | the person's refusal | W4 |
| `ShadeAvatar.getConferredMixinNames` | `Avatar.getConferredMixinNames` over `isBornTuned()` | W5 |
| the implant in every player's skull | the phone; the implant for guests only | W8 |

**Not built** (the first draft had them; the re-cut removed the need):
`TunerMixin`, `CorrespondentMixin`, `AetherHost.getOperator()`,
`AetherHosted.appName`.

### P1 and P2, for each changed item

| item | P1 — ledger, or why it is not a method in the wrong place | P2 — does every host mean it? |
|---|---|---|
| `AetherMixin` (perceive) | ledger *attunement*; smaller than before | `Avatar` only; every played body can be tuned |
| `AetherHostMixin` | ledger *apps*; three composers on day one | `Avatar` (the wallet, calendar and forums live there), `Phone`, `AetherImplant`. Each really hosts software. Nothing inert: the modalities stayed behind |
| `CommsMixin` on the person | ledger *held messages* + shipped comms; one mixin, one concept | `Avatar` only — every played body talks at a distance; ⚠ never `Character` (NPCs never do) |
| `App` | ledger *apps*; a rename and a slimming of `CommsUpdate`, with Messages as its row | instanced onto hosts; every app means *a host runs me* |
| `conferralRefusal()` | ⚠ one overrider today (`Phone`). It is on `AugmentMixin` because the person's refusal must ask a device it knows only as an augment, and because the implant gains a power state in the epoch build. Said in For the owner 8 | every augment can honestly answer `null` — *nothing is stopping me* — which is an answer, not a "no" |
| the widened leg | not new substrate — the existing loop reads a larger set | n/a |
| `Phone` | ledger *the phone* | the tuning rule (packed, off, dead, not yours) is in its body. A second tuner class is the signal to lift it; one consumer does not make a mixin |
| `BatteryMixin` | genuinely new | `Phone` only — not the implant, not `Good` |
| `Charger`, `ManaCharger` | ledger *the charger*; each a composition, no members beyond *I supply only where I am set down* | each means *a powered surface* |
| `isBornTuned()` | replaces one method with one | only a shade and a born-attuned species answer yes — the same single case the retired method existed for |

### P9–P14, per item

| item | P9 predictable | P10 document? | P11 no branching caller | P12 no synonym | P13 fits its header | P14 nothing invisible |
|---|---|---|---|---|---|---|
| `AetherHostMixin` + app list | `apps` lists it; `look` shows it | the offered list is an authored reference on the row | `installApp` is the one way software gets onto any host — the loadout uses it too | `installApp` is not `hostUpdate`: it clones a row, hosts it and records it; `hostUpdate` stays the instance chokepoint beneath it | *this thing hosts aether software* — the list, its persistence and `apps` are that sentence | never installs by itself |
| `CommsMixin` on the person | each view's help says a message that cannot go is held and when it goes | n/a — written per message | one question, `sendOrHold`; controllers ask and render | none | *a person's comms: the words, who they last spoke with, what is waiting* | a held line is re-run **visibly**; nothing is sent the player did not type |
| `App` / Messages | `apps` names it | instanced onto a host and destroyed with it — a template, not a vocabulary. ⚠ If `lint:data-ideas` counts it, that is a finding to bring back, not a ceiling to raise | — | — | *a piece of software a host runs* | — |
| `conferralRefusal()` | the refusal line names the fix | n/a | the device answers; no caller sorts devices | `confers()` stays the one conferral call | *what an augment activates, and why it is not* | read only |
| widened leg, `getCommandSources` | internal | n/a | — | not `getAffordances` (that flattens verbs; this lists sources) | the stack's own read | read only |
| `BatteryMixin` | `look` shows the charge | n/a | charges from whatever `Powered` thing it rests on | none | *holds electrical energy, spends it, takes it from a powered thing it rests on* | settles on read; no timer |
| `Phone`, `Charger`, `ManaCharger` | a row plus the mixins' reads; a carried charger says it is not plugged in | n/a | — | — | named for what each is | — |
| `apps` | one view, three forms, each in help | — | the host decides | new word, new act | category `device` | free, instant |
| bound title | `title transfer` and `sell` refuse in words | a registry fact beside the owner it qualifies | one refusal, inside `transfer` | none | chattel.md: title lives in the registry | refuses; never retitles |
| `title transfer` goods | help gains the form and an example | n/a | the controller's existing shape test gains an arm (D10) | the shipped verb | — | consent asked |
| `AETHER` row | a word, poked when it changes | n/a | — | — | the shelf's contract | — |

---

## Plan-level decisions

### D1 — One conferral leg: every augment a body bears

**Choice.** The acquired leg of `collectAugmentConferralNames` stops at
slot occupants today. It widens to **every augment the body bears**: slot
occupants as now, plus augments among
`CommandGiver.getCommandSources('environment')`. It is still one loop
calling `confers()`; a held phone (a slot occupant) and a pocketed one are
the same case.

**The device decides** (P5). `Phone.confers()` returns `['AetherMixin']`
only when `conferralRefusal()` is `null`:

| reason | when |
|---|---|
| `not-borne` | no carrying body is above it in its container chain |
| `packed` | its bearer's `tierOf(this)` is neither `hand` nor `ready` |
| `off` | it is switched off |
| `dead` | its battery is empty |
| `not-yours` | its row is `ownerLocked` and its stamped owner is somebody else (D10) |

The implant's `confers()` is unchanged: seated, it confers.

**Why the recency stack is the enumerator.** A carried thing's
`environment` verbs reach its carrier at any depth, kept exact on every
move, nested move and restore by `CommandLogic.applyContainmentDeltaImpl`.
`AetherHostMixin` affords `apps` that way (D3), so every device a body
bears is already a source on its stack. Reading that record costs an
array scan. The alternatives were measured against the hot path
(`sensorium()` runs for every modality-stamped frame): a walk of the
carried tree pays the call-security gate per container per frame; a
device-registers-with-its-bearer scheme misses a bag moved with the
device inside it.

**The hot path.** `Phone` memoizes its own answer per game second and
clears it on the acts it sees (`setOn`, its own `onMoved`). Charge
running out and a title changing are read fresh the next second.

**The innate side** is one method. `Avatar.getConferredMixinNames()`
answers from `isBornTuned()` (`ShadeAvatar` overrides that to `true`), and
`ShadeAvatar`'s own copy is deleted. Species `innateMixins` stays as it is.

### D2 — Hosting splits from perceiving; the host owns its app list

**The split (R1).** `AetherMixin` keeps `_augmentGated` and
`_grantsModalities` and nothing else — *this body can perceive the aether*.
The host half moves to `AetherHostMixin`, composed by `Avatar` (where the
wallet, calendar and forums stay), `Phone` and `AetherImplant`. Every
reader that meant *hosts software* moves to `MixinApi.isAetherHost`
(§ Retired and moved); every reader that meant *tuned* already asks
`isActive` or the sensorium.

**The app list (R2).** `AetherHostMixin` gains the durable half of what it
already holds:

- `installedApps` — persistent list of app row paths. Live instances stand
  up from it at `onCreate` and again in `onRestored`.
- `offersApps` — authored: what this host's own list offers.
- `installApp(path)` / `uninstallApp(key)` — clone the row, host it through
  the sealed `hostUpdate`, record it; and the reverse. Idempotent.
  `hasApp(key)`, `availableApps()`.
- `manifestsAs: 'known' | 'read'` — authored, default `known` (D9).

There is now **one way software gets onto a host**. The loadout's four
clone-then-host blocks become four `installApp` calls.

**Comms is one mixin, on the person (R3).** `CommsMixin` is composed on
`Avatar`. `tell` sends as `this`; the cohorts are the person's; a
recipient's cohort is stamped with `MixinApi.isComms(recipient)` instead
of an MQL search. The four verbs stay in its `self` bucket, where a
person's own verbs belong.

**Messages is a thin app (R4).** `App` is `AetherHostedMixin(Idea)` with an
authored `appName`. Messages is the row `/platform/idea/app/messages`, no
brand. It does nothing by itself: it is what `CommsMixin` looks for. Its
key is its last path segment.

**What the person's comms asks** — `aetherHostNow()`, private to
`CommsMixin`: the host whose Messages would carry a message right now.

1. A born-tuned body: itself.
2. Otherwise the first augment it bears whose `conferralRefusal()` is
   `null`, that confers `AetherMixin`, and that is an aether host.
3. None: the most fixable reason among the devices it bears (`off` before
   `packed` before `dead` before `not-yours`), or `none`.

Then `hasApp('messages')` on that host, else `no-messages`.

**What stays put.** `ForumsUpdate`, `CredentialWalletUpdate` and
`CalendarUpdate` stay hosted on the person, as rows of their own classes,
untouched except for how they are installed.

### D2a — One word: every hosted piece of software is an *app* (the owner, 2026-11-18)

**Choice.** The rename is folded in so the vocabulary is one word. `ForumsUpdate`,
`CredentialWalletUpdate` and `CalendarUpdate` become apps: their classes
and rows move under the `App` vocabulary and the `/platform/idea/app/`
root (`forums`, `wallet`, `calendar` beside `messages`), and *hosted
update* becomes *app* in code comments and docs (augmentation.md,
comms.md, calendar.md, forums.md, credential.md). They stay hosted on the
**person** and are not offered by `apps` (For the owner, review item 1) —
only their names change. ⚠ **Name collision to resolve in the wave:**
`lib/calendar/CalendarApp.ts` already exports the mixin `CalendarAppMixin`;
the concrete class takes a name that does not shadow it (e.g. keep the
mixin's file and call the class by its row), and `lint:mixin-names` must
stay green. Grep `packages/` for every old class name and row path before
the commit (B4).

### D3 — `apps`

One view, `platform/cmd/device/apps.yaml`, `verbs: [apps]`, category
`device`. Bare `apps` lists what is installed and what is offered;
`apps install <app>` and `apps uninstall <app>` act on a host the actor
bears. An optional `on <device>` argument (scope `person`, requires
`AetherHostMixin`) picks one when a body bears two; without it the
affording source is used.

**Afforded by the host**: `AetherHostMixin.commandContributions.environment`
— a device hands the verb outward to whoever bears it. A person's own
host is never in its own container chain, so `apps` never lists or
removes the wallet, calendar or forums (For the owner 7).

The host decides, asking its own augment side when it has one: a device
that is `not-yours`, `off` or `dead` refuses with the fix; `packed`
refuses with *ready it first*. An unknown key answers with what is
offered. Both acts are free and instant.

### D4 — Power state is `SwitchableMixin`

`Phone` composes it; `switch phone off` / `on` is the shipped verb, already
afforded from inventory. `Phone` overrides `setOn` only to settle the
battery first and clear its own memo.

### D5 — The battery is a new mixin over the shared `Reserve`

**Choice.** `BatteryMixin` (`lib/supply/Battery.ts`, beside `Powered`),
storing a `battery` reserve in **Wh** on `ReservedMixin`.

**Why not generalize `ChargedMixin`.** Design-lenses § 5 says a wand and a
wall socket are one mechanism — and they are, at the level the engine
already shares: both keep their stock in a `Reserve`. Above that,
`ChargedMixin` is a different law, not a different parameter: it leaks in
proportion to its stock whether or not anything uses it (the equilibrium
its economy rests on), it has *no* absence guard on purpose, it is
denominated in τ, and a non-caster holds no reserve to feed it. The
requirements ask for the opposite on each count — no self-discharge worth
modeling, no drain while offline, watt-hours, and no barrier. That is the
lens's own failing case: *rewritten rather than re-parameterized*.

**The arithmetic** (authored per row):

| field | meaning | Hollis | Aevex |
|---|---|---|---|
| `capacityWh` | stored energy when full | 12 | 16 |
| `standbyW` | draw while running | 0.10 | 0.10 |
| `useWh` | energy per message sent or read | 0.002 | 0.002 |
| `acceptW` | the most it will take from a charger | 10 | 15 |

At 12× game time: 12 Wh ÷ 0.10 W = 120 game hours = five game days = ten
real hours of standby. Five hundred messages cost 1 Wh. A 10 W charger
fills it in 1.2 game hours (six real minutes). Numbers are a grain.

**When it drains.** Only when a live body that bears it asks whether it
is tuned — which is the phone's own `confers()`, asked about once a game
second for every online player and never for anyone else. The phone
settles there: it draws `standbyW` from the later of its stamp and the
start of *this bearer's* bearing (a transient note of who last asked; a
different body, or a phone newly stood up, starts a fresh interval with
no back-charge). So an offline body drains nothing by construction — no
guard, no timer, no reverse search — and a clock jump while online drains
the whole jump. Every act on the device (a move, a switch) settles and
stamps first. Off, or borne by nobody, it draws nothing.

**Heavier use** is `spendUse()` per message sent or read through it,
called by the person's comms on the host it used when that host has a
battery.

### D6 — The charger

- A phone charges from **its container, when that container answers the
  kernel `Powered` shape**. `put phone on charger` is the shipped `put`
  with the `on` placement; the charger row declares that placement.
- Settling: `charge += min(acceptW, host.availablePowerW()) × powered
  seconds in [stamp, now]`, read off `host.poweredTrajectory`, capped at
  capacity. There is no online bound on this branch, so **a phone on a
  charger keeps charging while its owner is logged out**, across a room
  unloading and a restart: the stamp is the moment it was put there.
- ⚠ A battery arriving **from nowhere** (a restore) does not touch its
  stamp. Restored into a pocket, the next settle is bounded by the body's
  live-since; restored onto a charger, the next read charges across the
  whole absence.
- `Charger` (energy pack) is `GridPowered` plus a placing surface. It
  supplies only while it sits in a place — carried in a bag it answers 0
  W and `look` says it is not plugged in.
- `ManaCharger` (arcana pack) is the same surface on a mana line: it
  composes the kernel `PoweredMixin` over arcana's `ManaPowered` stack and
  answers its rated watts while its line supply is good. The phone cannot
  tell the two apart.
- ⚠ `GridPoweredMixin` caches its premises on first read. A charger is the
  first composer that is sold and carried home, so the mixin gains an
  `onMoved` that drops the cached band and feeder. One change, for every
  composer.

### D7 — The room carries emotes

`SoulMixin.emote` and `emoteFree` send **two scenes instead of one**:

- **the room** — self, peers (or contents) and a target standing in the
  same place — with **no modality at all**. Every sensor in the room
  receives it, NPCs included; the `emote` witness fires. No device, no
  sense, no gate.
- **past the room** — when the target is elsewhere, one `toTarget` scene
  stamped `emotive-esp`. The receiver's own reception (D8, D9) decides
  whether it arrives or waits.

The sender's half of *a tuner at both ends* is asked by the two emote
controllers through `sendOrHold` (D8) before `emote` runs; `Soul` itself
sends the remote scene only when the actor is tuned, and otherwise sends
none (an NPC never is — a skip, with the comment saying why).

Emotes get no sense of their own: the room scene carries **no** modality,
which is a statement about the carrier and is true of every emote anyone
will ever write.

### D8 — Held, never silent

**Where.** `CommsMixin`, on the person (D2). Nothing new is composed.

**Outgoing.** `sendOrHold(commandText): AetherRefusal | null` is the one
question. `null` means go. Otherwise the line has been appended to
`heldOutbound` (persistent `string[]`) and the refusal carries the words
and the fix:

| reason | line |
|---|---|
| `none` | *You have nothing that reaches past this room. A phone does — the general store sells one.* |
| `packed` | *Your phone is in your pack — ready it to send.* |
| `off` | *Your phone is off — `switch phone on`.* |
| `dead` | *Your phone is dead — charge it.* |
| `not-yours` | *That phone runs only for its owner.* |
| `no-messages` | *Messages isn't installed — `apps install messages`.* |

followed by *"Held — it goes when you can send."* `DmController`,
`ReplyController`, `ChatPostController` and the two emote controllers (for
a target elsewhere) ask it first and render what comes back; none of them
decides anything. `requiresVerbalESP` leaves `dm`, `reply` and `chat`; it
stays on `forum` and `broadcast`, and its fixed text is replaced by the
same refusal line (it asks the person).

**What is held is the command the player ran** — its raw line. When the
person can send again the lines are re-run in order through
`executeCommand`, each under *"Sending what you held: `dm bob hi`"*. Nothing
is invented at send time, the line survives a restart as a string, and a
line that no longer resolves (the friend logged off) fails with its own
ordinary words. The list is capped at 50; past it, the refusal says the
line was **not** kept.

**Incoming.** `CommsMixin` overrides the shadowable `filterMessage`. A
frame carrying an aether modality (`verbal-esp`, `emotive-esp`) that is not
the person's own act is asked `receptionRefusal()`; if it cannot be taken
now it is appended to `heldInbound` (persistent array of plain frames,
capped at 200) and dropped from delivery. Every producer — `dm`, a channel
line, a remote emote, a forum notice, a broadcast — is covered without
being touched.

**The flush.** `filterMessage` sees every frame the person receives, and
every act that re-tunes a person tells them something (readying, switching
on, installing, waking). So the same pass checks: *is anything held, and
can I take it now?* — and schedules one flush through `ScheduleApi`, after
the current frame. The flush delivers *"While you were away…"*, the held
frames in order (and how many were lost to the cap, if any), then re-runs
the held lines. It also runs once at `enter`.

**Persistence.** Both lists are plain persistent fields on the mixin and
ride the `PrimaryAvatar` snapshot. Guests, shades and circle bodies do not
persist, and none of them can be untuned by a lost phone.

### D9 — Reading needs sight

`AetherHostMixin` has an authored `manifestsAs: 'known' | 'read'` (default
`known`; phone rows say `read`) — the device decides how what arrives
through it shows. `receptionRefusal()` on the person:

1. no host can carry it now (D2's `aetherHostNow()`) → that reason;
2. a `speech.comms`, channel or remote-emote frame with no Messages on the
   that host → `no-messages`;
3. that host manifests as `read` and the person is unconscious or
   cannot perceive by sight → `cannot-see`.

Sight is the shipped `PerceptionApi.canPerceive` over the sight modality —
an organ question with no light read in it, so a lit screen reads in the
dark. A born-tuned body is `known`. Sending is not gated on sight.

### D10 — Ownership is the lock

- **The lock** is `not-yours` in D1: `ownerLocked` on the phone row
  (a field of `Phone`; the implant has no lock), read against the sync
  `stampedOwner()`. A device with **no stamp** runs for its bearer — which
  is what lets a circle's owner hand a body a phone (a circle cannot stamp
  a title), and what a shop's stock is not (it is stamped to the house).
- **Bound.** `stampChattel(owner, { bound: true })` writes `bound` on the
  registry row. `ChattelLogic.transfer` refuses a bound row with reason
  `bound` — the one chokepoint every transfer already passes.
  `isTitleBound()` is the sync dry read.
- **The six transfer callers** are audited in W6: each that moves money or
  goods before it transfers asks `isTitleBound()` first
  (`Stock.buyFrom`, `ConsignmentShelf`'s consign, `ContractLogic`'s pledge),
  so a refusal is never discovered after the money moved.
- **`title transfer <good> to <player>`.** The controller's shape test
  gains an arm: not a path, not a shares phrase → resolve the phrase among
  what the giver carries. It refuses a good that is not the giver's, a
  bound one, and a stack; then asks the recipient's consent exactly as the
  parcel arm does, and calls `good.transferChattel(recipient)`. ⚠ This is
  an existing string-shaped argument growing a third meaning; the
  alternative, a typed object argument, cannot share the slot with a
  parcel path. Recorded so review meets it here.

### D11 — The starting kit

- `mud/config/char-gen.yaml` gains a top-level `startingKit` list (not
  per aspiration — the starter is the same for everyone until lineage):
  `- { item: /stuff/thing/gear/hollis-pal, bound: true, into: pocket }`.
- `PrimaryAvatar.receiveStartingKit(kit)` — called by `EmbodyController`
  straight after `wearGarments`: clone, stamp to the new person (bound when
  the row says so), then move into the first worn pocket it fits, by the
  same call `put … in pocket` makes; with no pocket, `move` onto the body
  and let the routing decide. The row ships with Messages installed and a
  full charge.
- `Avatar.installDefaultLoadout`, already installing through `installApp`
  since W2:
  - **implant** — seated only for a guest (and put back if carried, as
    today). The implant row lists Messages in `installedApps`.
  - **Messages on the person's own host** — only when `isBornTuned()`.
  - **forums, wallet, calendar** — installed on the person for every body.
  - `installApp` is idempotent by path, so the old *already hosts a comms
    update* guard is deleted, not re-keyed.
- A circle body therefore gets no tuner and no Messages; a shade keeps
  both by nature. No migration.

### D12 — Content rows and who owns them

| row | pack | path |
|---|---|---|
| Brand `hollis-pal` | `corpo-hollis` | `/stuff/idea/corpo/Brand/hollis-pal` |
| Brand `aevex-meridian` | `corpo-aevex` | `…/Brand/aevex-meridian` |
| Brand `vionne-soir` | `corpo-vionne` | `…/Brand/vionne-soir` |
| the three phone rows (class `/platform/thing/Phone`) | `generic-objects` | `/stuff/thing/gear/hollis-pal`, `…/aevex-meridian`, `…/vionne-soir` |
| the charger row (class `/system/energy/thing/Charger`) | `generic-objects` (it gains `energy` as a package dependency) | `/stuff/thing/fixture/charger` |
| Messages app row (class `/platform/idea/App`) | `platform` | `/platform/idea/app/messages` |
| implant row gains `installedApps`, `offersApps` | `generic-objects` | `/stuff/thing/AetherImplant` |
| stock and price lines: Hollis, Aevex, charger | `terminus` | `general-store/counter.yaml` |
| dorm room `props:` gains the charger; dorms parcel → `domestic`, `feeder: terminus-main:crossing` | `eternal-university` | `duncan-hall/unit/room.yaml`, `pack.yaml` |
| lounge charger (class `/system/arcana/thing/ManaCharger`) | `saxonberg-lounge` | `world/lounge/thing/charger.yaml` |

Brand keys and model names are a grain — the owner may rename them. The
Vionne model ships as a row and is sold nowhere yet. Prices are set
against the counter's shipped lines: the charger in the torch's tier, the
Hollis several times the dearest carried good, the Aevex about three times
the Hollis; the wave records the numbers here.

### D13 — `look phone` and the status bar

- `look` — `AetherHostMixin` (the apps), `BatteryMixin` (the charge) and
  `Phone` (on or off, whose it is) each add a `markupAugmenters` line (the shipped per-mixin `look` seam): on or off; the charge as a
  percent when it is on, *dead* when it is; the installed apps by name;
  *bound to you* / *not yours*. The brand line is `BrandedMixin`'s, already.
- **Status bar** — a shelf row `AETHER` (not `PHONE`: that word is the
  client's name for its mobile layout). It reads `aetherState` off the
  `self` card: `tuned 82%`, `tuned` (implant or born), `packed`, `off`,
  `dead`, `no tuner`. `CommsMixin` pokes the card when the word
  changes or the charge crosses a ten-percent step. It answers from day
  one, so it joins the default pins.

### D14 — The drive

Three files, all written in W10, each checkpoint made to fail once on
purpose before it is trusted (B2):

- `packages/wire/tests/aether-devices.dirty.wire.test.ts` — the blocking
  drive, steps 1–18 with 2a, 2b, 15, 15a, 15b.
- `packages/wire/tests/aether-devices.soak.dirty.wire.test.ts` — the soak
  drive.
- `e2e/tests/aether-devices-walk.spec.ts` — the browser walk, once, at
  code-complete.

Paces, twins and tools are in § Test & gate strategy.

### D15 — Docs

Written in W10, in the docs' own files (never the CLAUDE.md map — that line
is the sweep's):

- **new** `docs/subsystems/aether-devices.md` — the phone, apps and hosts,
  the battery and the two chargers, the lock.
- `augmentation.md` — the implant's path; the perceive/host split and
  `isAetherHost`; the acquired leg reads every borne augment;
  `conferralRefusal`; the shade's leg replaced by `isBornTuned`; a carried
  augment needs an `environment` verb to be seen.
- `emotes.md` — the two scenes; *local emote works without any implant*
  becomes true.
- `comms.md` — comms is one mixin on the person; Messages is the app it
  looks for; held messages; the retired per-NPC implant note.
- `calendar.md`, `residence.md` — *on the implant* → *the person's*.
- `chattel.md` (bound titles), `energy.md` (the charger; `onMoved`),
  `client-shell.md` (the `AETHER` row), `char-gen.md` (the kit),
  `command-routing.md` (`getCommandSources`).
- `docs/arcane-science.md` — the sharpened clause of rule 1 (*every place
  carries what is expressed in it*).

---

## ⭐⭐ Host placement

| item | host | what composing it claims of every other composer |
|---|---|---|
| `AetherMixin` (perceive only) | `Avatar` | *this body can perceive the aether when something tunes it.* Every played body. No longer on anything that is not a sensor. |
| `AetherHostMixin` | `Avatar`, `Phone`, `AetherImplant` (and so `Headset`) | *this thing hosts aether software.* True of all three: a person hosts their wallet, calendar and forums; a device hosts what is installed on it. |
| `installedApps`, `offersApps`, `manifestsAs` | `AetherHostMixin` | every host has a list of what it runs and a way what arrives through it shows; `offersApps` is empty on a person, by authoring. |
| `CommsMixin` | `Avatar` (the abstract root — every played body) | *this person talks at a distance, and things wait for them.* True of the primary body, a guest, a shade and a circle body. ⚠ **Not `Character`**: no NPC ever talks at a distance, so every Cast and Extra would answer *no* forever. |
| `heldOutbound`, `heldInbound` | `CommsMixin` | persisted only where the body persists (the primary); empty elsewhere. |
| `conferralRefusal()` | `AugmentMixin` | every augment can say whether something is stopping it; *nothing is* is the honest answer for the implant today. |
| the tuning rule, `ownerLocked` | the `Phone` class body | a phone is the one thing that tunes by being carried. Not on `AugmentMixin` (the implant is not carried), not a mixin (one consumer). |
| `BatteryMixin` and its five fields | `Phone` only | *runs on stored electrical energy.* Not the implant (lens 5: the tuner that cannot run out), not `Good`. |
| `SwitchableMixin`, `BrandedMixin`, `ReservedMixin`, `AugmentMixin` (existing) | `Phone` | each true of every phone. |
| `appName` | `App` | every app has a name. The wallet, calendar and forums keep their own classes and gain nothing. |
| `bound` | the `chattel` **row**, never the good | a fact about a title, kept where titles are kept; it exists only on rows that are bound, like `pin`. No class gains a field. |
| `isBornTuned()` | `Avatar` | every body can say it; only a shade and a born-attuned species answer yes — the single case the method it replaces existed for. |
| `Charger` | energy pack | *draws grid power and holds a thing on it.* |
| `ManaCharger` | arcana pack | *draws from a mana line and holds a thing on it.* |

**The guard test.** No guard re-narrows a host. `AetherHostMixin` asks
`MixinApi.isAugment(this)` before it asks `conferralRefusal()` — that is a
host that is also a device reading its own other half, not a narrowing of
who may compose it.

**The quiet form.** Of the composers, how many will ever answer yes?
`AetherHostMixin` 3 of 3. `CommsMixin` every played body.
`BatteryMixin` 1 of 1. `conferralRefusal` 1 of 2 until the epoch build —
called out, and the reason it is where it is (For the owner 8).
`AetherMixin` on a device with its senses inert — the first draft's
defect — is gone.

---

## Convention conformance

Checked this cycle, not recalled.

- **`props:` / `cast:`** — the chargers are placed through `props:`;
  nothing authors `container:`.
- **Locations, not rooms** — "the room" in this doc is the fiction's word;
  the code asks for the actor's enclosing place.
- **Paths** — `Phone` and `App` are kernel (`/platform/thing/Phone`,
  `/platform/idea/App`); phone rows are the commons'
  (`/stuff/thing/gear/…`); `Charger` and `ManaCharger` sit under their
  packs' roots; the Messages row is `/platform/idea/app/messages`.
- **Module scope, imports** — two new `lib/` mixin files export a factory,
  an interface and constants; packs import the kernel by package specifier
  only.
- **Verbs on objects** — install, hold, settle, transfer are methods on
  the host, the person, the battery, the good. No new Api static.
- **One view, one word; `verb subcommand target`** — `apps`,
  `apps install <app>`, `apps uninstall <app>`.
- **Member privacy** — mixin state is TypeScript `private` or public
  persistent fields; no `#` (proxy receiver).
- **P3 refuse / skip / throw** — every send path refuses in words and
  holds; a full hold list refuses and says the line was not kept; a
  dropped held frame is counted and said; an NPC's remote emote leg is a
  skip; `installApp` of a path with no row throws.
- **P4 no duck typing** — the battery reads its charger through the kernel
  `Powered` shape; nothing reaches into energy or arcana.
  `collectAugmentConferralNames` already reads its three surfaces
  structurally to avoid an import cycle; the widened read follows the
  file's existing form and adds no new duck outside it.
- **P5 the mixin decides** — `conferralRefusal` (the device), `sendOrHold`
  and `receptionRefusal` (the person), `installApp` (the host),
  `transfer`'s `bound` (the registry). Controllers ask and render.
- **P6 persistence per content** — the held lists and a person's installed
  list ride the primary's snapshot; a device's installed list rides the
  device; the phone persists as any stamped good does.
- **P7 load on use** — an app row is loaded when a host installs or lists
  it, by the path the host names; no catalogue, no boot entry.
- **P8 names** — `Phone`, `Charger`, `App`, `Battery`, `AetherHost` are
  nouns for what the thing is; `AETHER` avoids the client's *phone*.
- **American English** throughout.

**Gates** (`pnpm -C packages/server lint:family`; the ones this build can
trip): `lint:mixin-names` (`Mixins.AetherHost`, `Mixins.Battery`),
`lint:instanceable`, `lint:view-keys`, `lint:one-word`,
`lint:command-views`, `lint:reachability` (`apps` named by the host;
`dm`/`reply`/`broadcast`/`chat` still named by `CommsMixin`),
`lint:self-contributions` (`CommsMixin`'s `self` is now on a command
giver), `lint:mixin-clusters` (`CommsMixin` grows; a split there is
evidence, not a ceiling), `lint:data-ideas` (`App`), `lint:schema` (the
`bound` field; run `pnpm gen:schema`), `lint:counters`,
`lint:power-posture`, `lint:carry-moves`, `lint:object-verbs`,
`lint:lib-statics`, `lint:imports`, `lint:module-scope`,
`lint:test-bootstrap`, `lint:wizard-axis`. No ceiling rises; a gate that
wants one is a finding to record.

---

## Waves

Each wave ends at one commit, staged by name, pushed. Between waves:
`pnpm test:near`, every touched pack's own vitest, `lint:family`.

⭐ **The world can talk at every commit.** The implant stays in every
player's skull until W8. From W3 it is a host with Messages installed, so
the person's comms finds its app there; before W3 nothing has changed.

### W1 — The room carries emotes (D7)

- `lib/social/Soul.ts` — split the scene in `emote` and `emoteFree`; a
  private `sendPastRoom` for the remote leg. Until W4 the sender's check
  is the shipped `MixinApi.isActive(actor, 'AetherMixin')`.
- `lib/social/__tests__/Soul.test.ts` — the room scene carries no
  modality; an NPC sensor receives it; the remote scene carries
  `emotive-esp` and only a tuned actor sends it.
- A behavior test: an `emote`-triggered `reacts` brain fires.
- **Accepts:** AC 6, the receiver half of AC 7.
- **Commit:** `feat(emotes): the room carries emotes — NPCs perceive them`

### W2 — Hosting splits from perceiving (D2: R1, R2) — a refactor, no behavior change

- New `lib/augmentation/AetherHost.ts`: the host members **moved** out of
  `lib/message/Aether.ts`, plus `installedApps`, `offersApps`,
  `installApp`, `uninstallApp`, `hasApp`, `availableApps`, `manifestsAs`.
  `Mixins.AetherHost`; `MixinApi.isAetherHost`.
- `Aether.ts` shrinks to the gate and the modalities.
  `AetherHosted.ts`'s host type follows.
- `Avatar.ts` — `AvatarBase` composes `AetherHostMixin` beside
  `AetherMixin`; `installDefaultLoadout`'s four blocks call `installApp`
  (the implant logic is untouched until W8).
- Every *hosts software* reader moves to `isAetherHost`:
  `CommandLogic.ts` (`collectHostedUpdateDefsImpl`), `PerceptionLogic.ts`
  (two sites — one word each; § Risks R9), `TeleportController.ts`,
  `CalendarApp.ts`, `Forums.ts`, `Comms.ts`, and the tpa pack's
  `FastTravel.ts` (three sites).
- Tests move with their subject; add: a person's installed list survives
  capture and restore without doubling; `installApp` is idempotent.
- **Accepts:** nothing by itself — it is the ground W3 and W5 stand on.
- **Commit:** `refactor(aether): hosting is its own mixin; the host owns its app list`

### W3 — Comms is the person's; Messages is an app; `apps` (D2: R3, R4; D3)

- `lib/comms/Comms.ts` — composed on `Avatar`; `tell` sends as `this`;
  the recipient's cohort through `isComms`; `aetherHostNow()` and a first
  `sendOrHold` that **refuses without holding** (the hold is W4).
- `platform/idea/CommsUpdate.ts` → `platform/idea/App.ts`; the old row and
  `TemplatePaths.commsUpdate` retired; row `/platform/idea/app/messages`.
  Grep `packages/` for the old path and class (B4).
- **D2a — the rename:** `ForumsUpdate`, `CredentialWalletUpdate`,
  `CalendarUpdate` → apps under `/platform/idea/app/` (`forums`, `wallet`,
  `calendar`); *update* → *app* in comments and the five docs; the
  `CalendarAppMixin` name collision resolved; every old name grepped out of
  `packages/`.
- `platform/thing/AetherImplant.ts` composes `AetherHostMixin`; its row
  lists Messages in `installedApps` and `offersApps`. The loadout stops
  installing comms on a person unless `isBornTuned()` (added here, default
  from species; `ShadeAvatar` overrides).
- `DmController`, `ReplyController`, `ChatPostController` — take comms
  from the person; `resolveComms` deleted.
- `AetherHostMixin` affords `apps`; `apps.yaml`, the three controllers and
  their rows.
- Tests: `dm` through an implant with Messages; uninstall refuses with
  *install Messages*; reinstall sends; a shade sends from its own host;
  the cohorts survive the move.
- **Accepts:** the install half of AC 9a.
- **Commit:** `refactor(comms): one mixin on the person; every hosted piece is an app; the apps verb`

### W4 — Held, never silent; reading needs sight (D8, D9)

- `Comms.ts` — `heldOutbound`, `heldInbound`, the holding half of
  `sendOrHold`, `receptionRefusal`, the `filterMessage` override, the
  flush.
- Views `dm.yaml`, `reply.yaml`, `chat.yaml` — drop `requiresVerbalESP`;
  help gains the held rule. ⚠ `chat`'s other subcommands still need a
  working tuner: put the validator on each subcommand if `lint:view-keys`
  pins a subcommand `validators:` key, else ask once in
  `ChatControllerBase`.
- `requiresVerbalESP.ts` — its text comes from the person's refusal.
- `EmoteController` and the soul emote controller ask `sendOrHold` for a
  target elsewhere; `Soul.ts`'s sender check becomes the person's.
- Tests: each refusal's words; a held line survives capture and restore
  and re-runs; the cap refuses; an inbound frame is held and flushed in
  order under *While you were away*; an implant reads while unconscious, a
  `read` host waits.
- **Accepts:** AC 8, 11, the sender half of 7, the rest of 9a.
- **Commit:** `feat(comms): a message that cannot go is held and says why`

### W5 — The phone; carried augments confer (D1, D4)

- `lib/augmentation/Augment.ts` — `conferralRefusal()`.
- `lib/command/CommandGiver.ts` — `getCommandSources(bucket)`.
- `api/mixin.ts` — the acquired leg reads borne augments.
- `Avatar.getConferredMixinNames()` over `isBornTuned()`;
  `ShadeAvatar`'s copy deleted.
- New `platform/thing/Phone.ts` (augment, host, switch, brand, the tuning
  rule; the battery joins in W7). Row `/stuff/thing/gear/hollis-pal` and
  its Brand row.
- Tests: the five refusals; a phone in a pocket confers, in a rucksack
  does not, in a hand does; a bag moved with the phone inside re-tunes;
  off and on; the phone's apps survive capture and restore.
- **Measure** a chat line fanned to many players before and after, and
  record it under § Risks R1.
- **Accepts:** AC 2 (but dead), 3.
- **Commit:** `feat(aether): a phone tunes whoever carries it ready`

### W6 — Ownership is the lock (D10)

- `Chattel.ts`, `ChattelLogic.ts`, `ChattelRegistry.ts`,
  `schema/chattel.yaml` (+ `pnpm gen:schema`) — `bound`.
- The six `transferChattel` callers audited; `Stock.buyFrom`, the consign
  path and the pledge path refuse a bound title before anything moves.
- `Phone.ts` — the `not-yours` rung goes live.
- `TitleTransferController` + `title.yaml` help and example — the goods
  arm.
- Tests: a bound title refuses every path; a stolen phone tunes nobody; an
  unstamped phone runs for its bearer; `title transfer` of a bought phone
  with consent and without.
- **Accepts:** AC 9b.
- **Commit:** `feat(chattel): a title can be bound; title transfer hands on a good`

### W7 — The battery and the grid charger (D5, D6)

- New `lib/supply/Battery.ts`; `Mixins.Battery`; the `Wh` unit if absent.
- `Phone.ts` composes it: the `dead` rung, the settle inside its own
  `confers()`, `spendUse` on send and delivery (called by `CommsMixin`
  through the host it used).
- `packages/content/energy/src/lib/GridPowered.ts` — `onMoved` drops the
  cached premises. New `energy/src/thing/Charger.ts`. Row
  `/stuff/thing/fixture/charger`.
- ⚠ **Verify first:** that a stamped good left `on` a fixture in a
  persisted room comes back *on that fixture* after the room unloads. If
  it comes back on the floor, the fix is the overlay restoring the
  placement pair, and it is this wave's.
- Tests: the arithmetic; offline drains nothing; a jump online drains the
  jump; a restore onto a charger charges across the absence; a carried
  charger supplies nothing.
- **Accepts:** AC 4 (the arithmetic), 5, 12 (charge).
- **Commit:** `feat(power): an electrical battery, and a charger on the grid`

### W8 — The starting kit; the implant retired (D11)

- `char-gen.yaml` (`startingKit`), `EmbodyController` (one call),
  `PrimaryAvatar.receiveStartingKit`.
- `Avatar.installDefaultLoadout` — the implant only for a guest; its doc
  comment, and the stale comments at `Avatar.ts:~156` and `:~829`.
- Tests: a new character has a bound phone in a pocket, no implant, and
  can `dm`; a guest has an implant with Messages and no phone; a shade
  sends; a circle body has neither; a relog doubles nothing.
- **Accepts:** AC 1, 10.
- **Commit:** `feat(char-gen): a phone in your pocket; the free implant retired`

### W9 — Content (D12)

- The two remaining Brand rows and phone rows.
- `general-store/counter.yaml` — three stock lines with prices.
- `duncan-hall/unit/room.yaml` `props:`; `eternal-university/pack.yaml`
  (the dorms: `domestic`, `feeder: terminus-main:crossing`).
- `packages/content/arcana/src/thing/ManaCharger.ts` and the
  `saxonberg-lounge` row on the lounge's `mana-main`. ⚠ First check what
  the shipped rules do with an owned good left in a lounge clone at logout
  (R4); the charger is placed only once the answer is *it is never
  destroyed*.
- Both places `look`ed at in their own light, day and night.
- **Accepts:** AC 9, 9c, the content half of 5.
- **Commit:** `content(aether): phone models, chargers, and where they stand`

### W10 — `look`, the status bar, the drive, the docs (D13, D14, D15)

- `markupAugmenters` on `AetherHostMixin` (the apps), `BatteryMixin` (the
  charge) and `Phone` (on, off, whose); `aetherState` on the `self` card
  and its poke from `CommsMixin`.
- `packages/client/src/components/frame/Shelf.tsx` and its test — the
  `AETHER` row, default-pinned.
- The three drive files; any harness tool they owe.
- The docs of D15.
- **Accepts:** the display half of AC 4; the drive.
- **Commit:** `feat(aether-devices): look, the status bar, the drive and the docs`

Then code-complete: the blocking drive, the browser walk, one `pnpm test`,
and the MR opens ready, naming the soak drive.

---

## Reachability wiring

| capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| tune by carrying | none — `dm` just works | `AetherHostMixin` → `apps` in `environment` puts the device on its bearer's stack, which is what the conferral leg reads. ⚠ A carried augment with no `environment` verb is invisible to it | phone rows; `ownerLocked`, `manifestsAs` | a carried instance; nothing to load | — |
| `apps` | `apps.yaml` | `AetherHostMixin.commandContributions.environment` | `offersApps`, `installedApps` on the device row | an app row is cloned from the path the host names | `on <device>`: scope `person`, `requires: [AetherHostMixin]` — the name must be in `Mixins` and `MixinApi` or the gate fails closed |
| `dm` / `reply` / `chat` / `broadcast` | the shipped views | `CommsMixin.commandContributions.self` — unchanged in text, but it now reaches the person because the person composes it. ⚠ If `CommsMixin` is not in `AvatarBase` the four verbs vanish for everyone | — | — | unchanged |
| send through Messages | — | `aetherHostNow()` → `hasApp('messages')` | the Messages row | hosted at the host's `onCreate` / `onRestored` from `installedApps` | — |
| the person's own software | `calendar`, `wallet`, `forum` (shipped) | the hosted-update delta, now reading `isAetherHost` — ⚠ a missed rename here drops those verbs silently | shipped rows | `installApp` in the loadout | shipped |
| `switch phone` | shipped | `SwitchableMixin` on `Phone` | `on` on the row | — | shipped |
| `put phone on charger` | shipped `put` | shipped | the charger row's `placements: [on]` — without it `put` has nowhere to put | a prop of its room, or a bought good | shipped |
| charge | — | — | `acceptW`; the premises' band and feeder, or the mana line the row names | `GridPowered` resolves on first read, and again after a move | — |
| `title transfer <good>` | `title.yaml` (shipped) | shipped | — | — | the greedy string's new arm |
| the kit | — | `EmbodyController` → `receiveStartingKit` | `startingKit` in `char-gen.yaml` | cloned at embody | — |
| emote reactions | shipped | `Behaved`'s `emote` witness | shipped rows (Remy) | — | — |
| `AETHER` row | `client-shelf` (shipped) | — | `aetherState` on the `self` card | subscribed with the card | — |

---

## Acceptance-criteria coverage

| AC | waves |
|---|---|
| 1 phone in a pocket, no implant, `dm` at once | W3, W5, W8 |
| 2 hand or ready tunes; packed, off, dead do not | W5 (packed, off), W7 (dead) |
| 3 `switch phone off` / `on` | W5 |
| 4 outlasts a session; `look` and the status bar show charge | W7, W10; soak |
| 5 `put phone on charger`, incl. logged out | W7, W9 |
| 6 NPCs perceive emotes; reactions fire; no phone needed in the room | W1 |
| 7 an emote past the room needs a tuner at both ends | W1 (receiver), W4 (sender) |
| 8 held with a refusal naming the fix; *while you were away* | W4 |
| 9 buy a phone and a charger | W9 |
| 9a `look` shows apps; uninstall and reinstall; without it you cannot send | W3, W4, W10 |
| 9b title-holder only; starter bound; no shop buys it; `title transfer` | W6, W8 |
| 9c the phone shows its brand; Messages carries none | W5, W9 |
| 10 guests keep an implant; the shade is tuned; a circle body has nothing | W8 |
| 11 a message read off a phone waits while you cannot see | W4 — ⚠ *cannot see* is unconsciousness today (For the owner 3) |
| 12 phone and charge survive a restart | W7; drive step 14 |

Nothing is unmapped. AC 5's *the premises' meter pays* is met as *works
only where the supply is live* (For the owner 2).

---

## Test & gate strategy

**Unit** — every decision above has its test in its wave. The battery's
session-length claim is **arithmetic in a unit test** (capacity ÷ draw at
the row's numbers ≥ four game days), never a wait.

**Only the drive proves** — the restart, the kit through real char-gen,
buying over a real counter, a second player's reception, Remy.

### The blocking drive — `aether-devices.dirty.wire.test.ts`

| step | pace | asserted by | notes |
|---|---|---|---|
| 1 spawn with a phone | instant | player | `i`, `look phone` |
| 2 `dm` works | instant | player | |
| 2a built in and installed | instant | player | |
| 2b uninstall, refused and held, install, sent | instant | player | |
| 3 no implant | instant | player | |
| 4 remote emote | instant | player | |
| 5 Remy reacts | instant | player | in the lounge |
| 6 packed: refused, held; B's `dm` unseen | instant | player | needs a rucksack — bought, or staged into A's hands |
| 7 ready: held goes out; *while you were away* | instant | player | |
| 8 local emotes with no phone | instant | player | an NPC's idle emote is forced with the harness if none comes |
| 9 off and on | instant | player | |
| 10 the battery drains | short | player | `advanceClock` three game hours **with A online** |
| 11 dead | **staged** | staged | set the charge to empty |
| 12 charge | short | player | `advanceClock` one game hour |
| 13 charging while logged out | short | player | A logs out; `advanceClock` two game hours; A logs in |
| 14 restart | **staged** | staged | `restartWorld()`; phone, charge and a held line read back |
| 15 theft is a brick | instant | player | |
| 15a buy one | instant | player | A is staged the money |
| 15b pass it on | instant | player | B confirms the prompt |
| 16 cannot see | **staged** | staged | unconsciousness (For the owner 3) |
| 17 guest | instant | player | |
| 18 the chargers are seen | instant | player | dorm and lounge, lit |

**Tools the drive needs, and which it owes**

| state | tool | status |
|---|---|---|
| empty charge (11) | `stage(<phone>, 'setChargeFraction', [0])` | ⚠ `stage` loads by path; a carried phone is one of many of its kind. If it cannot address an instance, **this build owes** an instance handle on `stage` (same `@TestOnly` gate, no new static) |
| a low charge (13) | the same | as above |
| unconscious (16) | `afflict(handle, <condition>)` | the wave names the shipped condition that puts a body out; if none can be afflicted directly, the build owes the staging |
| restart (14) | `restartWorld()` | shipped pattern, copied per file |
| money, a rucksack (6, 15a) | `stage` / the shipped staging kit | shipped |
| clock (10, 12, 13) | `advanceClock` | shipped |

**Staged twins.** The one span is the soak's *a session's battery*; its
twin is step 10 (a short jump shows the charge falling at the row's rate)
plus the unit arithmetic. Steps 11 and 16 are the staged twins of running
flat and of losing sight.

### The soak drive — `aether-devices.soak.dirty.wire.test.ts`

*A session's battery* — **span**. A plays game days of mixed use without
charging; the phone is alive at the end. The MR names it; the soak lane
runs it after merge. Never run by `/build`, a review round or `/finalize`.

### The browser walk — `e2e/tests/aether-devices-walk.spec.ts`

Once, at code-complete: a new character, the phone in the inventory
ledger, `look phone`, the `AETHER` row changing on `switch phone off`, a
held `dm` and its release, the charger in the dorm room, buying at the
general store.

**`pnpm test`** runs at code-complete and at `/finalize`, and nowhere
between.

---

## Risks & opens

- **R1 — the hot path.** The widened leg runs for every modality-stamped
  frame to every player: one scan of the body's recency stack, then each
  borne augment's `confers()`. The phone memoizes its answer per game
  second. W5 measures a chat line fanned to many players before and after
  and records the number here. If it is not enough, the cure is the body
  keeping its borne augments as the stack pushes and pops them — never a
  wider memo.
- **R2 — a carried augment with no `environment` verb is invisible to the
  leg.** Every device today is an aether host and affords `apps`; a test
  pins it. A future carried augment that hosts nothing would need its own
  `environment` verb — said in augmentation.md in W10.
- **R2a — a person is a host too, and `environment` grants outward.** A
  body's own host hands `apps` to any command giver that *contains* the
  body (a mount under a rider). W3 tests that `apps` run from there finds
  nothing to act on and says so; if it reads wrong, the affordance moves
  from the mixin to the two device classes.
- **R3 — the W2 rename.** A reader left on `isAether` that meant *hosts*
  fails closed and silent (a missing verb, an empty wallet). W2 greps
  `isAether(` across `packages/` and accounts for every hit in the commit
  message.
- **R4 — a phone left in the lounge at logout.** A lounge clone does not
  persist. If the shipped answer loses the phone, record it and place no
  lounge charger until it is fixed — do not work around it here.
- **R5 — the flush has no event of its own.** It rides the next frame the
  person receives and `enter`. If a silent re-tune shows up, the cure is
  that the act says something, not a timer.
- **R6 — re-running a held line.** `reply` reads who last wrote to you at
  run time; after a restart that memory is gone and the line fails with
  its ordinary words. Accepted, and said in `reply`'s help.
- **R7 — `chat`'s subcommands** (W4's fork on where the validator sits).
- **R8 — the dorms' feeder.** A unit is a child parcel of the dorms;
  confirm it inherits the feeder as well as the band, or cite it on the
  unit claim.
- **R9 — the sibling build.** `PerceptionLogic.ts` is now edited at two
  lines (`isAether` → `isAetherHost`, ~l.685 and ~l.1785) in W2 — land W2
  early and tell `build/navigation-server`. `Avatar.ts` is touched in the
  `AvatarBase` composition, `installDefaultLoadout`,
  `getConferredMixinNames` and `isBornTuned` — none near `enter`.
  `Carrying.ts` is not edited. Merge master before W8.
- **R10 — `CommsMixin` grows.** If `lint:mixin-clusters` splits it, that
  is evidence the held lists want their own home; bring it back as a
  finding with the cluster report, do not raise the ceiling.
- **R11 — `App` and `lint:data-ideas`** (the P10 line above).
- **R12 — a placed good's placement after its room reloads** (W7's
  verify-first).

**Stop and ask rather than guess:** nothing. Every open above has a
default the build can run.

---

## Deferred seams

- **An app that brings its own verb to its carrier.** The attach point is
  `CommandLogic.applyHostedUpdateDeltaImpl`, which returns early for a
  host that is not a command giver → the first app that needs it;
  aether-devices-slate § 6.
- **The wallet, calendar and forums as `App` rows on a device** →
  aether-devices-slate. They keep their own classes until then.
- **The phone as a held screen**, gated on its battery →
  display-manifestation-slate.
- **A power state on the implant** — `conferralRefusal()` is where it
  answers → the epoch build (content-declaration-slate § 3.0).
- **A second carried tuner** (the needle, the aether-radio) — the signal to
  lift the tuning rule out of `Phone`'s body → aether-devices-slate § 5.
- **Modes, the flashlight, the camera, the map app** →
  aether-devices-slate §§ 4, 6; privacy-slate.
- **Metered billing for a charger** → power-utility-slate.
- **Blindness** as a condition — it meets the reading rule at
  `receptionRefusal` with no change here.
- **Battery wear and cold** → aether-devices-slate.
- **Unlocking somebody else's phone; the fence** → a content pass.
- **The starter phone as a value leak** → money-integrity-slate.

---

## Critical files

Read first, in this order:

1. `docs/requirements/aether-devices-requirements.md`
2. `docs/subsystems/augmentation.md`, `carrying.md`, `comms.md`,
   `emotes.md`, `chattel.md`, `energy.md`, `command-routing.md`
   (§ `CommandContributions`), `persistence.md`
3. `packages/server/src/mud/lib/message/Aether.ts`,
   `lib/augmentation/AetherHosted.ts`, `lib/augmentation/Augment.ts`
4. `packages/server/src/mud/api/mixin.ts` (`getActiveMixins`,
   `collectAugmentConferralNames`)
5. `packages/server/src/mud/lib/message/Sensor.ts`
6. `packages/server/src/mud/lib/comms/Comms.ts`,
   `platform/idea/CommsUpdate.ts`,
   `platform/idea/cmd/social/DmController.ts`
7. `packages/server/src/mud/lib/social/Soul.ts`
8. `packages/server/src/mud/lib/character/Avatar.ts`
   (`AvatarBase`, `installDefaultLoadout`),
   `platform/agent/PrimaryAvatar.ts`, `platform/agent/ShadeAvatar.ts`
9. `packages/server/src/mud/platform/idea/api/CommandLogic.ts`
   (`applyContainmentDeltaImpl`, `collectHostedUpdateDefsImpl`),
   `lib/command/CommandGiver.ts`
10. `packages/server/src/mud/lib/chattel/Chattel.ts`,
    `platform/idea/api/ChattelLogic.ts`, `lib/retail/Stock.ts`
11. `packages/server/src/mud/lib/supply/Powered.ts`,
    `lib/reserve/Reserved.ts`,
    `packages/content/energy/src/lib/GridPowered.ts`,
    `packages/content/arcana/src/lib/ManaPowered.ts`
12. `packages/server/src/mud/platform/idea/cmd/civics/TitleTransferController.ts`
13. `packages/server/src/mud/config/char-gen.yaml`,
    `platform/idea/cmd/charactergen/EmbodyController.ts`
14. `packages/content/terminus/content/world/terminus/general-store/counter.yaml`,
    `packages/content/eternal-university/pack.yaml`,
    `…/duncan-hall/unit/room.yaml`,
    `packages/content/saxonberg-lounge/content/world/lounge/`
15. `packages/client/src/components/frame/Shelf.tsx`
16. `packages/wire/tests/documents-path-identity.dirty.wire.test.ts`
    (the restart pattern), `e2e/tests/energy-walk.spec.ts`

---

## Drive record

*(appended at build time)*
