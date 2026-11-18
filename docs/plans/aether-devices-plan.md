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
plan touches `Avatar.ts` in three named places only and the other two not
at all (§ Risks R9).

---

## ⚠ For the owner

Six things the survey found that the requirements did not know. None is
absorbed quietly; 1, 2 and 3 want a ruling before `/build`.

1. **Neither place the requirements put a charger has electric power.**
   - **Duncan Hall's dorms are declared `powerBand: off-grid`**
     (`packages/content/eternal-university/pack.yaml:41`). The dorm room is
     lit by a mana lamp on purpose (`duncan-hall/unit/room.yaml`). *"Duncan
     Hall's meter pays for it"* has no meter to mean.
   - **The lounge has no electric grid at all.** `/world/lounge` declares no
     band and no feeder reaches it; what it has is a paid **mana line**
     (`saxonberg-lounge/.../thing/mana-main.yaml` — *"somebody pays a line
     bill here"*).
   - **What the plan assumes (recommended):** the phone charges from
     anything that answers the kernel's shipped *powered* question, so it
     never knows what feeds a charger. The dorms parcel flips to
     `domestic` on the University Avenue node (one manifest line; the mana
     lamp stays). The lounge gets a charger fed by its **mana line** — one
     thin class in the arcana pack. Lens 5 picks this (*does the new object
     answer the same commands* — `put phone on charger` either way).
   - **The alternatives:** electrify the lounge (needs a generator class
     and a feeder row — not planned), or a mana-fed charger in the dorm too
     (the dorm has no line, so a resident who cannot cast would have to buy
     cells — the barrier the requirements forbid).
   - Only wave **W7** changes with the answer.
   - ✅ **RULED (the owner, 2026-11-18): the recommendation** — the dorms
     parcel joins the grid on the University Avenue node (the mana lamp
     stays); the lounge's charger runs on its mana line.
2. **Nobody is billed for charging.** Metered billing does not exist
   (energy.md lists it as deferred). A charger works exactly while its
   premises' supply is live, and no money moves. *"The premises' meter
   pays"* becomes true when the power-utility build ships.
3. **Blindness does not exist in the engine** — no condition, no state, no
   tool removes sight. The plan builds the rule as *the reader can perceive
   by sight and is conscious* (both shipped questions), so a blindness
   condition joins the day one exists with no change here. Drive step 16
   is staged with **unconsciousness**, not blindness. Building blindness
   is a cross-cutting capability and is not in this build.
4. **`dm`, `reply` and `chat` become the person's words, not the app's.**
   Drive step 2b needs `dm` to answer *"install Messages"* and hold the
   message while Messages is uninstalled — so the verb cannot come from
   the app it is missing. The words always exist for a player; Messages is
   what sends them. Consequence: on day one Messages contributes no verb of
   its own, and the path by which a *device's* app hands a verb to its
   carrier is left as a named seam, not built with no consumer (§ Deferred
   seams).
5. **The phone is not a `watch`-able screen on day one.** The slate's
   ledger puts the phone on `Tablet`. A tablet's screen has no idea of a
   battery, so a dead phone would play a stream. The plan leaves the
   screen substrate off the phone until the screen cleanup can gate it on
   power; *"you read messages off it"* is built as the reading rule (D9).
6. **A bound title is the one place this build says "can never".** The
   balance slate records *"just make it soulbound"* as a reflex to refuse.
   The requirements decided it for the starter phone, and the plan keeps
   it as narrow as it can be: only the **title** is bound — the object
   still moves, drops and is stolen like any other.

Smaller, for the record: a phone left on the **lounge's** charger at
logout is in a room that does not persist (§ Risks R4) — the plan checks
what the shipped rules do with it before the lounge charger is placed.

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

Three mixins, two classes, one verb. No Api, no logic singleton, no
registry, no document kind, no collection, no hook, no eslint exception.

| # | item | where | ledger |
|---|---|---|---|
| 1 | **`TunerMixin`** | `lib/augmentation/Tuner.ts` | generalizes *conferral by carrying* and *apps* |
| 2 | **`CorrespondentMixin`** | `lib/comms/Correspondent.ts` | *held messages* — **genuinely new**; searched `held`, `outbox`, `while you were away`, `mailbox` across `packages/` and `docs/subsystems/` |
| 3 | **`BatteryMixin`** | `lib/supply/Battery.ts` | *the battery* — **genuinely new**, over the shipped `Reserve` |
| 4 | **`Phone`** class | `platform/thing/Phone.ts` | *the phone* — a class because conferral needs one (the ledger's own condition) |
| 5 | **`Charger`** class | `packages/content/energy/src/thing/Charger.ts` | *the charger* — `GridPowered` plus a surface |
| 6 | **`apps`** verb | view `platform/cmd/device/apps.yaml`; `AppsListController`, `AppsInstallController`, `AppsUninstallController` in `platform/idea/cmd/device/` | requirements |
| 7 | `AetherHost.getOperator()` | `lib/message/Aether.ts` | *apps* — two implementers (a person, a tuner) |
| 8 | `CommandGiver.getCommandSources(bucket)` | `lib/command/CommandGiver.ts` | reuses the containment delta's record |
| 9 | bound title: `stampChattel(owner, { bound })`, `isTitleBound()`, the `bound` field on a `chattel` row | `lib/chattel/Chattel.ts`, `ChattelLogic`, `ChattelRegistry`, `schema/chattel.yaml` | requirements (*can never be transferred*) |
| 10 | `AetherHosted.appName` and the Messages row `/platform/idea/app/messages` | `lib/augmentation/AetherHosted.ts`; platform pack | *apps* — an app as a row |
| 11 | the goods arm of `title transfer` | `TitleTransferController` | reuse of the shipped verb |
| 12 | shelf row `AETHER`, `self`-card field `aetherState` | `Shelf.tsx`; `CorrespondentMixin` | client-shell's shelf |
| 13 | `Avatar.isBornTuned()` | `lib/character/Avatar.ts` | replaces `ShadeAvatar.getConferredMixinNames` |
| 14 | *(pending For the owner 1)* **`ManaCharger`** class | `packages/content/arcana/src/thing/ManaCharger.ts` | *the charger*, on a mana line |
| — | unit `Wh`, if the catalogue lacks it | `lib/quantity.ts` | quantities.md |
| — | `stage` addressing a carried instance, if it cannot | `api/test-harness.ts` | a tool the drive owes |

### P9–P14, per item

| item | P9 predictable | P10 document? | P11 no branching caller | P12 no synonym | P13 fits its header | P14 nothing invisible |
|---|---|---|---|---|---|---|
| `TunerMixin` | `look` shows on/off, charge, apps; refusals name the fix | n/a — state on an instance | the tuner answers `tuningRefusalFor`; no caller sorts tuners | none — `confers()` stays the one conferral call | *a device that tunes whoever bears it and runs their apps* — every member is one of those | reads only; it never moves or switches itself |
| `CorrespondentMixin` | the views' help says a message that cannot go is held and when it goes | n/a — written per message | one question, `sendOrHold`; controllers ask and render | none | *a played person's traffic over the aether: the words, and what waits* | a held line is re-run **visibly** (*"Sending what you held: …"*); nothing is sent that the player did not type |
| `BatteryMixin` | `look` shows the charge; help for `put` unchanged | n/a | charges from whatever `Powered` host it rests on, no branch on which | none | *holds electrical energy, spends it, takes it from a powered thing it rests on* | reconciles on read; no timer |
| `Phone` | a row plus the three mixins' reads | n/a — instanced | — | — | named for what it is | — |
| `Charger` | `look` says whether it is live | n/a | answers the shipped `Powered` shape | none | a powered surface | supplies nothing while carried, and says so |
| `apps` | one view, three forms, each stated in help | the offered list is an authored reference on the device row | the tuner decides install and uninstall | new word, new act | category `device` — operating a built object | free and instant; never installs by itself |
| `getOperator()` | internal | n/a | **removes** a branch (`tell` no longer asks what its host is) | none | the host protocol: *who is this software working for* | — |
| `getCommandSources` | internal | n/a | — | not `getAffordances` (that flattens verbs; this lists sources) | the recency stack's own read | read only |
| bound title | `title transfer` and `sell` refuse in words; `look` says *bound to you* | a registry fact, beside the owner it qualifies | one refusal, inside `transfer` | none | chattel.md: title lives in the registry, never on the good | refuses; never retitles |
| `appName` / Messages row | `apps` lists it by name | a row that is **instanced** onto a host — a template, not a vocabulary | — | — | *what a hosted update is called* | — |
| `title transfer` goods | help gains the third form and an example | n/a | the controller's existing shape test gains an arm (§ D10) | the shipped verb | — | consent asked, as for a parcel |
| `AETHER` row | a status word, poked when it changes | n/a | — | — | the shelf's own contract | — |
| `isBornTuned()` | internal | n/a | — | replaces one method, adds none | a body's own nature | — |
| `ManaCharger` | `look` says whether its line is live | n/a | answers `Powered` | none | a powered surface on a mana line | — |

---

## Plan-level decisions

### D1 — A carried tuner confers through the conferral the engine already has

**Choice.** A tuner is an augment. Its `confers()` is state-aware: it
returns `['AetherMixin']` only when `tuningRefusalFor(bearer)` is `null`,
and `[]` otherwise. Two legs reach it:

- **In a hand** — the shipped slot walk, unchanged (hands are slots).
- **Ready** (pocketed, hung, in a worn bag off the back) — the per-host leg
  `getConferredMixinNames()`, implemented once on `CorrespondentMixin`:
  it asks each tuner the person bears for `confers()`.

`tuningRefusalFor(bearer)` is the whole rule, on the tuner (P5):

| reason | when |
|---|---|
| `not-borne` | no carrying body is above it in its container chain |
| `packed` | `bearer.tierOf(this)` is not `hand` or `ready` (an implant seated in a slot is exempt — it is installed, not carried) |
| `off` | it is switchable and off |
| `dead` | it has a battery and the battery is empty |
| `not-yours` | its row is `ownerLocked` and its stamped owner is somebody other than the bearer (D10) |

**Which tuners does a person bear?** `CommandGiver.getCommandSources('environment')`
filtered on `MixinApi.isTuner`. `TunerMixin` affords `apps` through
`environment`, so every tuner in a person's container chain, at any
depth, is a source on that person's recency stack — kept exact on every
move, restore and nested move by the containment chokepoint. This is the
same reach a held thing's verb has, read rather than re-walked.

**Why not a deep walk of what the body carries.** `sensorium()` runs for
every modality-stamped frame to every player; a walk of the carried tree
there pays the call-security gate per container per frame. And a
tuner-registers-with-its-bearer scheme misses a bag moved with the tuner
inside it (`onMoved` fires for the bag only).

**Re-evaluation.** Nothing is cached except a per-game-second memo of the
person's status on `CorrespondentMixin` (D8); the tuner clears it on the
acts it sees (`setOn`, its own `onMoved`, install, uninstall). Charge
running out and a title changing are read fresh at the next second.

`Avatar.isBornTuned()` (species `innateMixins` names `AetherMixin`;
`ShadeAvatar` overrides to `true`) is folded into the same leg, and
`ShadeAvatar.getConferredMixinNames` is deleted — one conferral leg on a
person, not two.

### D2 — A device hosts its apps on the host side that already exists

**Choice.** `Phone` and `AetherImplant` compose `AetherMixin` and use its
sealed `hostUpdate` / `unhostUpdate` / `getHostedUpdates` unchanged — the
shape the mixin's own doc reserved for *"the future radio"*, and the one
`reachOf` already descends into. An app is an `AetherHosted` `Idea`.

- **Built in** is what the device class composes: tuner, switch, battery.
  **Installed** is what is in its hosted set.
- `TunerMixin` adds the durable half: `installedApps` (persistent list of
  app row paths), `offersApps` (authored — what this device's own list
  offers), `installApp(key)`, `uninstallApp(key)`, `availableApps()`,
  `hasApp(key)`. Live app instances stand up from `installedApps` at the
  device's `onCreate` and again in `onRestored`.
- **Messages** is the row `/platform/idea/app/messages` over the shipped
  `CommsUpdate` class (the old row path `/platform/idea/CommsUpdate`
  retires; `TemplatePaths.commsUpdate` follows). Its key is its last path
  segment; its name is `appName: Messages`; it carries no brand.
- **Who an app works for.** `CommsMixin.tell` asks `getHost().getOperator()`
  instead of treating its host as the sender. `AetherMixin`'s default
  answers the host itself (a person); `TunerMixin` overrides it to the
  bearer it is tuning, or `null`. `tell` throws on `null`, as it does today
  for an unhosted update.
- **What moves.** Comms moves onto the device. `ForumsUpdate`,
  `CredentialWalletUpdate` and `CalendarUpdate` stay hosted on the person,
  untouched. A **born-tuned** body (a shade, a born-attuned species) hosts
  Messages on itself, as today.
- **The verbs** `dm`, `reply`, `broadcast`, `chat` leave
  `CommsMixin.commandContributions` and become `CorrespondentMixin`'s
  `self` (For the owner 4). `forum` stays on `ForumsMixin`.
- **No generic app class yet.** A row-only app (a card and verbs, no code)
  has no consumer; inventing its class now is P1's *promote at the third
  consumer*. § Deferred seams names the attach point.

### D3 — `apps`

One view, `platform/cmd/device/apps.yaml`, `verbs: [apps]`, category
`device`. Bare `apps` lists what is installed and what is available;
`apps install <app>` and `apps uninstall <app>` act on a tuner the actor
bears. An optional `on <device>` argument (scope `person`, requires
`TunerMixin`) picks one when a body has two; without it the affording
source is used. Afforded by `TunerMixin`'s `environment` bucket.

The tuner decides: it must be running for this bearer (`not-yours`, `off`
and `dead` refuse with the fix; `packed` refuses with *ready it first*).
Install looks the key up in `offersApps`, clones the row, hosts it and
writes the list; an unknown key answers with what is offered. Both are
free and instant.

### D4 — Power state is `SwitchableMixin`

`Phone` composes it; `switch phone off` / `on` is the shipped verb, already
afforded from inventory. `Phone` overrides `setOn` only to settle the
battery first and clear its bearer's memo.

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

**When it drains.** Only when the person bearing it settles it. The
person's status read (D8) touches each tuner it bears about once a game
second and calls `drainSince(person.liveSince())`: the interval is from
the later of the battery's own stamp and the moment that body came into
being this session. So an offline body drains nothing by construction —
no guard, no timer, no reverse search — and a clock jump while online
drains the whole jump. Every act on the device (a move, a switch) settles
and stamps first. Off, or borne by nobody, it draws nothing.

**Heavier use** is `spendUse()` per message sent or read through it.

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
none (an NPC never has one — a skip, with the comment saying why).

Emotes get no sense of their own: the room scene carries **no** modality,
which is a statement about the carrier and is true of every emote anyone
will ever write.

### D8 — Held, never silent

**Where.** `CorrespondentMixin`, composed on `Avatar` beside `AetherMixin`.

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
new is invented at send time, the line survives a restart as a string, and
a line that no longer resolves (the friend logged off) fails with its own
ordinary words. The list is capped at 50; past it, the refusal says the
line was **not** kept.

**Incoming.** `CorrespondentMixin` overrides the shadowable
`filterMessage`. A frame carrying an aether modality (`verbal-esp`,
`emotive-esp`) that is not the person's own act is asked
`receptionRefusal()`; if it cannot be taken now it is appended to
`heldInbound` (persistent array of plain frames, capped at 200) and
dropped from delivery. Every producer — `dm`, a channel line, a remote
emote, a forum notice, a broadcast — is covered without being touched.

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

`TunerMixin` has an authored `manifestsAs: 'known' | 'read'` (implant
`known`, phone `read`). `receptionRefusal()` on the person:

1. not tuned → the tuner's reason;
2. a `speech.comms`, channel or remote-emote frame with no Messages on the
   tuning device → `no-messages`;
3. the tuning device manifests as `read` and the person is unconscious or
   cannot perceive by sight → `cannot-see`.

Sight is the shipped `PerceptionApi.canPerceive` over the sight modality —
an organ question with no light read in it, so a lit screen reads in the
dark. A born-tuned body is `known`. Sending is not gated on sight.

### D10 — Ownership is the lock

- **The lock** is `not-yours` in D1: `ownerLocked` on the device row
  (phones `true`, the implant unset), read against the sync
  `stampedOwner()`. A device with **no stamp** runs for its bearer — which
  is what lets a circle's owner hand a body a phone (a circle cannot stamp
  a title), and what a shop's stock is not (it is stamped to the house).
- **Bound.** `stampChattel(owner, { bound: true })` writes `bound` on the
  registry row. `ChattelLogic.transfer` refuses a bound row with reason
  `bound` — the one chokepoint every transfer already passes.
  `isTitleBound()` is the sync dry read.
- **The six transfer callers** are audited in W4: each that moves money or
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
- `Avatar.installDefaultLoadout` is rewritten in place:
  - **implant** — seated only for a guest (and put back if carried, as
    today). The implant row lists Messages in `installedApps`.
  - **Messages on the person** — only when `isBornTuned()`.
  - **forums, wallet, calendar** — hosted for every body, as today.
  - the idempotency key moves from *hosts a comms update* to *hosts a
    wallet update*.
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
| Messages app row | `platform` | `/platform/idea/app/messages` |
| implant row gains `installedApps`, `offersApps` | `generic-objects` | `/stuff/thing/AetherImplant` |
| stock and price lines: Hollis, Aevex, charger | `terminus` | `general-store/counter.yaml` |
| dorm room `props:` gains the charger; dorms parcel → `domestic`, `feeder: terminus-main:crossing` | `eternal-university` | `duncan-hall/unit/room.yaml`, `pack.yaml` |
| lounge charger *(per For the owner 1)* | `saxonberg-lounge` (+ `arcana` for the class) | `world/lounge/thing/charger.yaml` |

Brand keys and model names are a grain — the owner may rename them. The
Vionne model ships as a row and is sold nowhere yet. Prices are set
against the counter's shipped lines: the charger in the torch's tier, the
Hollis several times the dearest carried good, the Aevex about three times
the Hollis; the wave records the numbers here.

### D13 — `look phone` and the status bar

- `look` — `TunerMixin` and `BatteryMixin` each add a `markupAugmenters`
  line (the shipped per-mixin `look` seam): on or off; the charge as a
  percent when it is on, *dead* when it is; the installed apps by name;
  *bound to you* / *not yours*. The brand line is `BrandedMixin`'s, already.
- **Status bar** — a shelf row `AETHER` (not `PHONE`: that word is the
  client's name for its mobile layout). It reads `aetherState` off the
  `self` card: `tuned 82%`, `tuned` (implant or born), `packed`, `off`,
  `dead`, `no tuner`. `CorrespondentMixin` pokes the card when the word
  changes or the charge crosses a ten-percent step. It answers from day
  one, so it joins the default pins.

### D14 — The drive

Three files, all written in W8, each checkpoint made to fail once on
purpose before it is trusted (B2):

- `packages/wire/tests/aether-devices.dirty.wire.test.ts` — the blocking
  drive, steps 1–18 with 2a, 2b, 15, 15a, 15b.
- `packages/wire/tests/aether-devices.soak.dirty.wire.test.ts` — the soak
  drive.
- `e2e/tests/aether-devices-walk.spec.ts` — the browser walk, once, at
  code-complete.

Paces, twins and tools are in § Test & gate strategy.

### D15 — Docs

Written in W8, in the docs' own files (never the CLAUDE.md map — that line
is the sweep's):

- **new** `docs/subsystems/aether-devices.md` — the phone, tuners, apps,
  the battery and charger, held messages, the lock.
- `augmentation.md` — the implant's path; `isAether` is composition-only;
  the carried leg; the shade's leg replaced by `isBornTuned`.
- `emotes.md` — the two scenes; *local emote works without any implant*
  becomes true.
- `comms.md` — the words are the person's, Messages sends; the retired
  per-NPC implant note.
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
| `TunerMixin` | `Phone`, `AetherImplant` (and so `Headset`) | *this thing tunes whoever bears it and runs their apps.* Two composers; both mean all of it. The implant leaves `ownerLocked` unset and has no battery or switch — those are not on this mixin. |
| `AetherMixin` (existing) newly on `Phone`, `AetherImplant` | the devices | *hosts aether software.* True of both. ⚠ Its `_grantsModalities` half is inert on a thing — a device is not a sensor. Stated, not guarded: nothing reads a device's sensorium. If a third inert composer appears, the host half graduates into its own mixin (augmentation.md already names that graduation). |
| `AugmentMixin` (existing) on `Phone` | the phone | *confers a gated mixin when borne.* Its `confers()` is the tuner's. |
| `BatteryMixin` | `Phone` only | *runs on stored electrical energy.* Not on the implant (lens 5: the tuner that cannot run out), not on `Good`. |
| `SwitchableMixin`, `BrandedMixin`, `ReservedMixin` (existing) | `Phone` | each true of every phone. |
| `CorrespondentMixin` | `Avatar` (the abstract root — every played body) | *a played person sends over the aether and things wait for them.* True of the primary body, a guest, a shade and a circle body alike. ⚠ **Not `Character`**: NPCs never talk at a distance, so on `Character` every Cast and Extra would answer *no* forever. |
| `heldOutbound`, `heldInbound` | `CorrespondentMixin` | persisted only where the body persists (the primary); empty elsewhere. |
| `installedApps`, `offersApps`, `ownerLocked`, `manifestsAs` | `TunerMixin` | every tuner has an app list and a way it manifests; `ownerLocked` is an authored choice a model makes, default off. |
| `capacityWh`, `standbyW`, `useWh`, `acceptW`, the stamp | `BatteryMixin` | every battery has all five. |
| `bound` | the `chattel` **row**, never the good | a fact about a title, kept where titles are kept. It exists only on rows that are bound, like `pin`. No class gains a field. |
| `appName` | `AetherHostedMixin` | every hosted update is something a host runs and has a name; forums, wallet and calendar gain theirs. |
| `getOperator()` | `AetherMixin` (default) / `TunerMixin` (override) | every host can say who its software works for. |
| `isBornTuned()` | `Avatar` | every body can say it; only a shade and a born-attuned species answer yes — it replaces a method that existed for the same one case. |
| `Charger` | energy pack | *draws grid power and holds a thing on it.* |

**The guard test.** No guard re-narrows a host. The one place a rule
looks like narrowing — `packed` exempting a seated implant — is a tier
fact (a slot occupant has no tier), not a host check.

**The quiet form.** Asked of each: of the composers, how many will ever
answer yes? `TunerMixin` 2 of 2; `BatteryMixin` 1 of 1;
`CorrespondentMixin` every played body; `isBornTuned` is the exception
and is called out above.

---

## Convention conformance

Checked this cycle, not recalled.

- **`props:` / `cast:`** — the chargers are placed through `props:`;
  nothing authors `container:`.
- **Locations, not rooms** — "the room" in this doc is the fiction's word;
  the code asks for the actor's enclosing place.
- **Paths** — `Phone` is kernel (`/platform/thing/Phone`), its rows the
  commons' (`/stuff/thing/gear/…`); `Charger` is under the energy pack's
  root; the Messages row is under `/platform/idea/app/`.
- **Module scope, imports** — three new `lib/` mixin files export a
  factory, an interface and constants; packs import the kernel by package
  specifier only.
- **Verbs on objects** — install, uninstall, hold, settle, transfer are
  methods on the tuner, the person, the battery, the good. No new Api
  static.
- **One view, one word; `verb subcommand target`** — `apps`,
  `apps install <app>`, `apps uninstall <app>`.
- **Member privacy** — mixin state is TypeScript `private`/public
  persistent fields; no `#` (proxy receiver).
- **P3 refuse / skip / throw** — every send path refuses in words and
  holds; a full hold list refuses and says the line was not kept; a
  dropped held frame is counted and said; an NPC's remote emote leg is a
  skip; `tell` with no operator throws.
- **P4 no duck typing** — the battery reads its charger through the kernel
  `Powered` shape and `MixinApi.isPowered`; nothing reaches into the
  energy or arcana pack. `collectAugmentConferralNames`'s existing
  structural reads are left as they are.
- **P5 the mixin decides** — one decision each: `tuningRefusalFor` (tuner),
  `sendOrHold` and `receptionRefusal` (person), `transfer`'s `bound`
  (registry). Controllers ask and render.
- **P6 persistence per content** — held lists and the kit ride the
  primary's snapshot; the phone persists as any stamped good does (carried:
  the body's inventory slice; set down: the owner's estate). No class
  persists by itself.
- **P7 load on use** — an app row is loaded when a device lists or
  installs it, by the path the device row names; no catalogue, no boot
  entry.
- **P8 names** — `Phone`, `Charger`, `Tuner`, `Battery`, `Correspondent`
  are nouns for what the thing is; `AETHER` avoids the client's *phone*.
- **American English** throughout.

**Gates** (`pnpm -C packages/server lint:family`; the ones this build can
trip): `lint:mixin-names` (three new `Mixins` constants),
`lint:instanceable`, `lint:view-keys`, `lint:one-word`,
`lint:command-views`, `lint:reachability` (`apps` named by the tuner;
`dm`/`reply`/`broadcast`/`chat` now named by the person),
`lint:self-contributions`, `lint:mixin-clusters`, `lint:data-ideas`,
`lint:schema` (the `bound` field; run `pnpm gen:schema`),
`lint:counters`, `lint:power-posture`, `lint:carry-moves`,
`lint:object-verbs`, `lint:lib-statics`, `lint:imports`,
`lint:module-scope`, `lint:test-bootstrap`, `lint:wizard-axis`. No
ceiling rises; a gate that wants one is a finding to record, not a number
to edit.

---

## Waves

Each wave ends at one commit, staged by name, pushed. Between waves:
`pnpm test:near`, every touched pack's own vitest, `lint:family`. The
implant stays in every player's skull until W6, so the world keeps talking
at every commit before it.

### W1 — The room carries emotes (D7)

- `lib/social/Soul.ts` — split the scene in `emote` and `emoteFree`; a
  private `sendPastRoom` for the remote leg. Until W3 lands, the sender's
  check is the shipped `MixinApi.isActive(actor, 'AetherMixin')`.
- `lib/social/__tests__/Soul.test.ts` — the room scene carries no
  modality; an NPC sensor receives it; the remote scene carries
  `emotive-esp` and is sent only by a tuned actor.
- A behavior test: an `emote`-triggered `reacts` brain fires.
- **Accepts:** AC 6, the receiver half of AC 7.
- **Commit:** `feat(emotes): the room carries emotes — NPCs perceive them`

### W2 — Tuners, apps and the phone (D1, D2, D3, D4)

- New `lib/augmentation/Tuner.ts`; `Mixins.Tuner`; `MixinApi.isTuner`.
- `lib/message/Aether.ts` — `getOperator()`.
- `lib/augmentation/AetherHosted.ts` — `appName`.
- `lib/comms/Comms.ts` — `tell` reads `getOperator()`.
- `lib/command/CommandGiver.ts` — `getCommandSources(bucket)`.
- New `platform/thing/Phone.ts` (tuner, switch, brand; the battery joins
  in W5); `platform/thing/AetherImplant.ts` composes `TunerMixin` and
  `AetherMixin`.
- New `lib/comms/Correspondent.ts` with **the conferral leg only**
  (`getConferredMixinNames`, the bearer read, the memo, `liveSince`);
  composed in `Avatar.ts`'s `AvatarBase` next to `AetherMixin`;
  `Avatar.isBornTuned()`; `ShadeAvatar` drops its own leg.
- `apps.yaml` + the three controllers + their `Controller.yaml` rows.
- Rows: `/platform/idea/app/messages` (and the old `CommsUpdate` row
  retired; grep `packages/content` for the old path — B4);
  `/stuff/thing/gear/hollis-pal` and its Brand row; the implant row's app
  lists.
- Tests: the tuner's five refusals; a phone in a pocket confers, in a
  rucksack does not, in a hand does; a bag moved with the phone inside
  re-tunes; install and uninstall; the apps survive capture and restore.
- **Accepts:** AC 2 (but dead), 3, the install half of 9a.
- **Commit:** `feat(aether): carried tuners confer; a device runs its apps; the apps verb`

### W3 — The words are the person's; held, never silent (D8, D9)

- `lib/comms/Correspondent.ts` — `commandContributions.self`,
  `sendOrHold`, `receptionRefusal`, the `filterMessage` override, the two
  held lists, the flush, `messagesApp()`.
- `lib/comms/Comms.ts` — its `commandContributions` removed.
- `DmController`, `ReplyController`, `ChatPostController`,
  `EmoteController`, the soul emote controller — ask `sendOrHold`; `dm`
  and `reply` take the app from `messagesApp()`.
- Views `dm.yaml`, `reply.yaml`, `chat.yaml` — drop `requiresVerbalESP`;
  help gains the held rule. ⚠ `chat`'s other subcommands still need a
  working tuner: put the validator on each subcommand if `lint:view-keys`
  pins a subcommand `validators:` key, else ask once in
  `ChatControllerBase`.
- `requiresVerbalESP.ts` — its text comes from the person's refusal.
- `Soul.ts` — the sender check becomes the person's.
- Tests: each refusal's words; a held line survives capture and restore
  and re-runs; the cap refuses; an inbound frame is held and flushed in
  order under *While you were away*; an implant reads unconscious, a phone
  waits.
- **Accepts:** AC 8, 11, the sender half of 7, the *without it you cannot
  send* half of 9a.
- **Commit:** `feat(comms): a message that cannot go is held and says why`

### W4 — Ownership is the lock (D10)

- `Chattel.ts`, `ChattelLogic.ts`, `ChattelRegistry.ts`,
  `schema/chattel.yaml` (+ `pnpm gen:schema`) — `bound`.
- The six `transferChattel` callers audited; `Stock.buyFrom`, the consign
  path and the pledge path refuse a bound title before anything moves.
- `Tuner.ts` — the `not-yours` rung goes live.
- `TitleTransferController` + `title.yaml` help and example — the goods
  arm.
- Tests: a bound title refuses every path; a stolen phone tunes nobody; an
  unstamped phone runs for its bearer; `title transfer` of a bought phone
  with consent and without.
- **Accepts:** AC 9b.
- **Commit:** `feat(chattel): a title can be bound; title transfer hands on a good`

### W5 — The battery and the charger (D5, D6)

- New `lib/supply/Battery.ts`; `Mixins.Battery`; the `Wh` unit if absent.
- `Phone.ts` composes it; `Tuner.ts` gains the `dead` rung and the settle
  call from the person's status read; `spendUse` on send and delivery.
- `packages/content/energy/src/lib/GridPowered.ts` — `onMoved` drops the
  cached premises. New `energy/src/thing/Charger.ts`.
- Row `/stuff/thing/fixture/charger`.
- ⚠ **Verify first, in this wave:** that a stamped good left `on` a
  fixture in a persisted room comes back *on that fixture* after the room
  unloads (furnishing.md's overlay). If it comes back on the floor, the
  fix is in the overlay restoring the placement pair, and it is this
  wave's.
- Tests: the arithmetic (capacity ÷ draw; a charge capped by `acceptW`; a
  cut in the trajectory); offline drains nothing; a jump online drains the
  jump; a restore onto a charger charges across the absence; a carried
  charger supplies nothing.
- **Accepts:** AC 4 (the arithmetic), 5, 12 (charge).
- **Commit:** `feat(power): an electrical battery, and a charger on the grid`

### W6 — The starting kit; the implant retired (D11)

- `char-gen.yaml` (`startingKit`), `EmbodyController` (one call),
  `PrimaryAvatar.receiveStartingKit`.
- `Avatar.installDefaultLoadout` rewritten as D11 says, and its doc
  comment; the stale comments at `Avatar.ts:~156` and `:~829`.
- Tests: a new character has a bound phone in a pocket, no implant, and
  can `dm`; a guest has an implant with Messages and no phone; a shade
  sends; a circle body has neither tuner nor Messages; a relog re-hosts
  the person's three updates and does not double anything.
- **Accepts:** AC 1, 10.
- **Commit:** `feat(char-gen): a phone in your pocket; the free implant retired`

### W7 — Content (D12) — the wave For the owner 1 decides

- The two remaining Brand rows and phone rows.
- `general-store/counter.yaml` — three stock lines with prices.
- `duncan-hall/unit/room.yaml` `props:`; `eternal-university/pack.yaml`
  (the dorms band and feeder).
- The lounge charger, as ruled: by default `arcana`'s `ManaCharger` and a
  `saxonberg-lounge` row on the lounge's `mana-main`. ⚠ First check what
  the shipped rules do with an owned good left in a lounge clone at logout
  (R4); the charger is placed only once the answer is *it is never
  destroyed*.
- Both places `look`ed at in their own light, day and night (R5).
- **Accepts:** AC 9, 9c, the content half of 5.
- **Commit:** `content(aether): phone models, chargers, and where they stand`

### W8 — `look`, the status bar, the drive, the docs (D13, D14, D15)

- `markupAugmenters` on `Tuner` and `Battery`; `aetherState` on the `self`
  card and its poke.
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
| tune by carrying | none — `dm` just works | `TunerMixin` → `apps` in `environment` puts the tuner on its bearer's stack, which is what conferral reads | phone rows; `ownerLocked`, `manifestsAs` | the phone is a carried instance; nothing to load | — |
| `apps` | `apps.yaml` | `TunerMixin.commandContributions.environment` | `offersApps`, `installedApps` on the device row | an app row is cloned from the path the device names | `on <device>`: scope `person`, `requires: [TunerMixin]` — add the name to `MixinApi` and `Mixins` or the gate fails closed |
| `dm` / `reply` / `chat` / `broadcast` | the shipped views | **moves** to `CorrespondentMixin.commandContributions.self` — if this is missed the four verbs vanish for every player | — | — | unchanged |
| send through Messages | — | `messagesApp()` finds it on the tuning device or on a born-tuned person | the Messages row | hosted at the device's `onCreate` / `onRestored` from `installedApps` | — |
| `switch phone` | shipped | `SwitchableMixin` on `Phone` | `on` on the row | — | shipped |
| `put phone on charger` | shipped `put` | shipped | the charger row's `placements: [on]` — without it `put` has nowhere to put | the charger is a prop of its room or a bought good | shipped |
| charge | — | — | `acceptW`; the charger's premises band and feeder | `GridPowered` resolves on first read, and again after a move | — |
| `title transfer <good>` | `title.yaml` (shipped) | shipped | — | — | the greedy string's new arm; the recipient arg is unchanged |
| the kit | — | `EmbodyController` → `receiveStartingKit` | `startingKit` in `char-gen.yaml` | cloned at embody | — |
| emote reactions | shipped | `Behaved`'s `emote` witness | shipped rows (Remy) | — | — |
| `AETHER` row | `client-shelf` (shipped) | — | `aetherState` on the `self` card | subscribed with the card | — |

---

## Acceptance-criteria coverage

| AC | waves |
|---|---|
| 1 phone in a pocket, no implant, `dm` at once | W2, W3, W6 |
| 2 hand or ready tunes; packed, off, dead do not | W2 (packed, off), W5 (dead) |
| 3 `switch phone off` / `on` | W2 |
| 4 outlasts a session; `look` and the status bar show charge | W5, W8; soak |
| 5 `put phone on charger`, incl. logged out | W5, W7 |
| 6 NPCs perceive emotes; reactions fire; no phone needed in the room | W1 |
| 7 an emote past the room needs a tuner at both ends | W1 (receiver), W3 (sender) |
| 8 held with a refusal naming the fix; *while you were away* | W3 |
| 9 buy a phone and a charger | W7 |
| 9a `look` shows apps; uninstall and reinstall; without it you cannot send | W2, W3, W8 |
| 9b title-holder only; starter bound; no shop buys it; `title transfer` | W4, W6 |
| 9c the phone shows its brand; Messages carries none | W2, W7 |
| 10 guests keep an implant; the shade is tuned; a circle body has nothing | W6 |
| 11 a message read off a phone waits while you cannot see | W3 — ⚠ *cannot see* is unconsciousness today (For the owner 3) |
| 12 phone and charge survive a restart | W5; drive step 14 |

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

- **R1 — the hot path.** Conferral runs for every modality-stamped frame.
  The per-game-second memo bounds it; measure a chat line fanned to many
  players before and after W2 and record the number here. If the memo is
  not enough, the fix is caching the bearer's tuners on stack push and
  pop — not a wider memo.
- **R2 — a tuner with no `environment` verb is invisible to conferral.**
  `TunerMixin` affords `apps` itself, so every composer is covered; a test
  pins it.
- **R3 — placement after a room reloads** (W5's verify-first).
- **R4 — a phone left in the lounge at logout.** A lounge clone does not
  persist. Find out what happens to an owned good set down there before
  placing a charger that invites it. If the shipped answer loses the
  phone, record it and place no lounge charger until it is fixed — do not
  work around it inside this build.
- **R5 — the flush has no event of its own.** It rides the next frame the
  person receives and `enter`. A state that changes silently (sight
  returning with no line) waits for the next frame. The drive's step 16
  proves the ordinary case; if a silent case shows up, the cure is that
  the act says something, not a timer.
- **R6 — re-running a held line.** `reply` reads who last wrote to you at
  run time; after a restart that memory is gone and the line fails with
  its ordinary words. Accepted, and said in `reply`'s help.
- **R7 — `chat`'s subcommands** (W3's fork on where the validator sits).
- **R8 — the dorms' feeder.** A unit is a child parcel of the dorms;
  confirm it inherits the feeder as well as the band, or cite it on the
  unit claim.
- **R9 — the sibling build.** `Avatar.ts` is touched in the `AvatarBase`
  composition, `installDefaultLoadout` and one new method — none near
  `enter`. `Carrying.ts` and `PerceptionLogic.ts` are not edited. Merge
  master before W6.
- **R10 — the old `CommsUpdate` row path** in tests and content (B4 grep in
  W2).
- **Open, the owner's:** For the owner 1 (where the dorm's and the
  lounge's power comes from), 3 (blindness), 5 (the phone as a screen).

**Stop and ask rather than guess:** nothing else. Everything above has a
default the build can run.

---

## Deferred seams

- **An app that brings its own verb to its carrier.** The attach point is
  the hosted-update delta (`CommandLogic.applyHostedUpdateDeltaImpl`),
  which today returns early for a host that is not a command giver → the
  first app that needs it; aether-devices-slate § 6.
- **A row-only app (a card and verbs, no class)** → aether-devices-slate
  § 6.
- **The phone as a held screen**, gated on its battery →
  display-manifestation-slate.
- **Calendar, wallet and forums onto the phone** → aether-devices-slate.
- **Modes, the flashlight, the camera, the map app** → aether-devices-slate
  §§ 4, 6; privacy-slate.
- **Metered billing for a charger** → power-utility-slate.
- **Blindness** as a condition — it meets the reading rule at
  `receptionRefusal` with no change here → the harm or medicine slate that
  builds it.
- **Battery wear and cold** → aether-devices-slate.
- **Unlocking somebody else's phone; the fence** → a content pass.
- **The starter phone as a value leak** → money-integrity-slate.
- **The host half of `AetherMixin` as its own mixin** — at the third
  composer that is not a sensor.

---

## Critical files

Read first, in this order:

1. `docs/requirements/aether-devices-requirements.md`
2. `docs/subsystems/augmentation.md`, `carrying.md`, `comms.md`,
   `emotes.md`, `chattel.md`, `energy.md`, `command-routing.md`
   (§ `CommandContributions`), `persistence.md`
3. `packages/server/src/mud/lib/message/Aether.ts`
4. `packages/server/src/mud/api/mixin.ts` (`getActiveMixins`,
   `collectAugmentConferralNames`)
5. `packages/server/src/mud/lib/message/Sensor.ts`
6. `packages/server/src/mud/lib/comms/Comms.ts`,
   `platform/idea/cmd/social/DmController.ts`
7. `packages/server/src/mud/lib/social/Soul.ts`
8. `packages/server/src/mud/lib/character/Avatar.ts`
   (`AvatarBase`, `installDefaultLoadout`),
   `platform/agent/PrimaryAvatar.ts`, `platform/agent/ShadeAvatar.ts`
9. `packages/server/src/mud/platform/idea/api/CommandLogic.ts`
   (`applyContainmentDeltaImpl`, `applyHostedUpdateDeltaImpl`),
   `lib/command/CommandGiver.ts`
10. `packages/server/src/mud/lib/chattel/Chattel.ts`,
    `platform/idea/api/ChattelLogic.ts`, `lib/retail/Stock.ts`
11. `packages/server/src/mud/lib/supply/Powered.ts`,
    `lib/reserve/Reserved.ts`,
    `packages/content/energy/src/lib/GridPowered.ts`
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
