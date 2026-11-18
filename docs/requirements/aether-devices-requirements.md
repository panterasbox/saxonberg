# Aether devices — requirements

**Kind:** feature (mostly debt — it carries out decisions made 2026-10-28 and 2026-11-18 that the
code never followed)
**Leads from:** kernel — first consumer: **the phone** and the new player's starting kit, in this
build; and the lounge's NPCs, whose emote reactions come alive here.

Every player today wakes with an aether implant wired into their skull, given free, and nothing
about how they talk at a distance can be lost, run down, switched off or stolen. The owner decided
on 2026-10-28 that a player starts with a **phone** instead, and on 2026-11-18 worked out what the
aether is for: it is the reason chat, DMs and emotes work at a distance, and a social player should
never meet a mechanic that stops them talking unless they walk into one. This build gives players the
phone — a real object that tunes you into the aether while you carry it, that you can power off, that
needs charging, and that can be lost — retires the free implant, and makes emotes in a room reach
everyone in it, NPCs included. Seeding slate: [aether-devices-slate](../slates/engine/aether-devices-slate.md)
(its reuse ledger is § 11).

## What the phone is

- **A carried good of the Signal rung** — it runs on a battery and electronics, and was made with
  them ([content-declaration-slate](../slates/platform/content-declaration-slate.md) § 3.0).
- **A tuner.** In your hand, or *ready* — worn, pocketed, on your belt — it tunes you into the
  aether, so `dm`, chat and a remote emote work. Packed in a rucksack, powered off or dead, it does
  not.
- **A screen.** What reaches you through it, you *read* off it. Only the implant is truly
  extra-sensory.
- ⭐ **Built in vs installed** (the owner: *"we need to have a clear concept of what's built into
  the phone and what's installed on it from day one"*):
  - **built into the phone** — the tuner, the power switch, the battery and the screen. They are the
    phone; nothing removes them;
  - **installed on it** — **apps**. Day one ships one: **Messages**, which carries `dm`, `reply`,
    chat channels and remote emotes. Without it, a tuned phone reaches nobody.
- **Activated to its owner.** A phone works only for the person it is activated to; in anyone else's
  hands it tunes nobody and runs nothing. The free starter phone is activated to its new player for
  good, so it is worthless to anyone else.
- **Supply:** no electronics trade exists, so it is a bought-in good — given to you at the start,
  sold at the Terminus general store.
- **Scale:** one is enough; carrying two adds nothing.
- **What it touches:** comms and emotes, carrying, power and the grid, ownership and theft, screens.

## What already exists

- **Talking at a distance** — `dm`, `reply`, `broadcast`, `chat`, `forum` — all refuse with *"You
  have no way to send a thought"* when you are not tuned in
  ([comms.md](../subsystems/comms.md), [chat.md](../subsystems/chat.md)). `calendar` and `wallet`
  need no tuner and keep working.
- **The free implant** — every player body is fitted with one at every login, and it hosts the
  player's comms, forums, wallet and calendar. Guests get the same ([augmentation.md](../subsystems/augmentation.md)).
- **Emotes** — the `emote` verb and the soul catalogue ([emotes.md](../subsystems/emotes.md)). Every
  emote today needs the receiver to be tuned, so **NPCs miss every emote, even in their own room**;
  Remy in the lounge has a reaction to emotes that has never fired.
- **Remote emotes** — only an emote aimed at a named person crosses rooms, and the sender's tuning is
  never checked.
- **On and off** — `switch` already turns anything switchable on or off, from your inventory too.
- **Carrying** — the hand · ready · packed tiers ([carrying.md](../subsystems/carrying.md)).
- **Power** — premises draw from the grid through a meter and somebody pays
  ([energy.md](../subsystems/energy.md)). ⚠ There is **no electrical battery** anywhere; the only
  charge system is denominated in mana.
- **Screens** — the tablet, the wall screen and the departures board
  ([display.md](../subsystems/display.md)).
- **The starting kit** — clothes and gear from your aspiration at character creation
  ([char-gen.md](../subsystems/char-gen.md)); the dorm room's furniture
  ([residence.md](../subsystems/residence.md)).
- **Builds in flight** — none touches the aether, emotes, the starting kit or screens.
  `build/navigation-server` edits neighboring lines of the body and carrying code only.

- **Apps today** — comms, forums, the wallet and the calendar are attached to the *person*, not to
  any device. They are not moved in this build.

**Therefore what is genuinely new here is:** a tuner that works because you carry it rather than
because it is in a body slot; **an app installed on a device**, which the device runs; a phone
activated to its owner; a battery that runs down and charges; the room carrying emotes to everyone
in it while the aether carries them past it; and the phone itself, with a charger.

## Goals

- A new player starts with a **phone in their pocket**, and talks at a distance exactly as easily as
  today.
- **Carrying the phone in hand or ready tunes you in**; packed, powered off or dead, it does not.
- **You can power a phone off and on** with `switch`.
- **A phone runs apps.** What is built in and what is installed is clear from day one; the
  **Messages** app carries DMs, chat and remote emotes, and you can uninstall and reinstall it.
- **A phone works only for the person it is activated to**, and the free starter phone is worthless
  to anyone else.
- **The phone has a battery** that lasts a full play session of ordinary use and charges cheaply and
  easily — *"this isn't the place in the game where we want to put up barriers"* (the owner).
- **A phone left on a charger keeps charging while you are logged out.**
- **An emote reaches everyone in its room, NPCs included, with no device on either side.** An emote
  sent past the room needs a tuner at both ends.
- **A message that cannot go out never fails silently.** It waits, the refusal says why and what to do,
  and it is delivered the moment it can be; messages to you wait the same way.
- **A phone can be bought** at the Terminus general store, easy to reach and not cheap.
- **Guests keep a forced implant** — it can never be sold, so nothing leaks into the economy.
- **The shade stays tuned intrinsically**; a holodeck circle body gets **nothing by default**.
- **Reading a message off a phone needs sight**; while you cannot see, messages wait for you. The
  implant is unaffected.

## Non-goals

- **`help ask` — reaching staff** → customer service, later (the owner: *"we'll handle customer
  service later"*); the routing is [moderation-slate](../slates/society/moderation-slate.md) § 13's
  `report`, and the item is registered in
  [guarantees-of-play-slate](../slates/society/guarantees-of-play-slate.md) § 5.
- **Getting an implant** (a process, surgery) → [surgery-specialty-slate](../slates/trades/surgery-specialty-slate.md)
  and a later content pass; the owner wants *"a cool process"*.
- **Moving the calendar, wallet and forums onto the phone** → a later build (the owner: *"we don't
  have to migrate all the calendar or other stuff"*). They stay attached to the person.
- **Where else apps come from** — buying them, an app store with prices, apps that players make →
  [aether-devices-slate](../slates/engine/aether-devices-slate.md) § 6, a later build. Day one, the
  phone's own list offers Messages, free.
- **Unlocking someone else's phone** (a reset trade, a fence) → a later content pass. Day one, only a
  phone's owner can reset it.
- **The phone's other features** (flashlight, camera, map) **and its modes**
  (speaker, earbuds, silent) → [aether-devices-slate](../slates/engine/aether-devices-slate.md) §§ 4, 6,
  a later build. The modes carry a privacy question (a speaker reads real players' messages to the
  room) that belongs with the [privacy-slate](../slates/platform/privacy-slate.md).
- **The screen cleanup** → [display-manifestation-slate](../slates/client/display-manifestation-slate.md).
- **Calls and video** → aether-devices-slate § 7, when players ask.
- **Tuners for the other rungs, the town's node, and the *power it down* law** → the epoch build
  (content-declaration-slate § 3.0). This build gives tuners a power state; the law that asks you to
  use it comes with the ladder.
- **Battery wear and cold** → aether-devices-slate, later.
- **The starter phone as a value leak** (make throwaway characters, sell their phones — the same leak
  as today's starter clothes) → [money-integrity-slate](../slates/tech-debt/money-integrity-slate.md)'s
  census of where value enters.
- **Custody may hold your phone but may not let it die** → guarantees-of-play-slate (P2).

## Placement

- **Kernel:** the tuner rule (carried tuners), the power state, the battery, the room carrying
  emotes, held messages and their refusals, and the starting kit.
- **Content:** the phone and the charger as rows, the generic-objects pack's — a second phone model
  is a row with a different capacity and draw, and needs no code. The Terminus general store's offer
  and the chargers' placements are the terminus and eternal-university packs'.

## Collisions

- **Every player body** — the free implant is removed from new characters and from returning ones
  (no migration: the world is reset).
- **Guests** keep the implant; **the shade** keeps its intrinsic tuning; **holodeck circles** get
  nothing by default, and the circle's owner equips the body as they like (the circle's rule that
  nothing made inside it can leave already stops leaks).
- **The dorm room** (Duncan Hall) gains a charger; Duncan Hall's meter pays for it.
- **The lounge** gains a charger — it is where people log in.
- **The Terminus general store** gains the phone and a charger on its shelf.
- **Remy and every NPC with an emote reaction** start reacting — content that never ran.
- **NPC idle emotes** are seen by a player with no phone.
- **The headset row** stays (guests' worn implant) until the modes build turns it into earbuds.
- **Docs that are wrong today:** augmentation.md (where the implant lives), emotes.md (*"local emote
  works without any implant"* — not true until this build), calendar.md and residence.md (*"on the
  implant"* — the calendar and keys are the person's).
- ⚠ **"Phone" is also the client's name for its mobile layout**
  ([client-shell.md](../subsystems/client-shell.md)) — prose must say which.
- ⚠ **`tune` and `call` are taken** — the livestream-chat verb and the animal call. Neither is used here.

## Surface decisions

### The phone is the starting kit, the implant is retired
Every new character's starting kit includes a phone, in a pocket. **The owner, 2026-10-28.** The
implant stays in the world for guests and for a later acquisition process.

### Built in vs installed; one Messages app
- **Built in:** the tuner, the power switch, the battery, the screen.
- **Installed:** apps. **Messages** carries `dm`, `reply`, chat channels and remote emotes as one app —
  the owner left one-or-three open (*"doesn't matter too much"*), and one is the smaller surface;
  splitting it later is a row change.
- **`look phone`** lists its charge and its installed apps.
- **`install messages`** and **`uninstall messages`** act on the phone in your hand or ready. Bare
  `install` lists what is available. Installing Messages is free and instant, so uninstalling it is a
  choice, never a trap.
- **The implant runs apps the same way** — a guest's implant comes with Messages installed.
- The calendar, wallet and forums stay attached to the person, as today.

### Activated to its owner
Like a real phone's activation lock. A phone is activated to the first person who holds it new — the
new player for the free one, the buyer for a bought one. In anyone else's hands it is a brick: it
tunes nobody and runs no apps. **The free starter phone can never be reset**, so it is worth nothing
to anyone but its player — the owner's *"bind itself to the user or otherwise be worthless to anyone
but the new player."* A **bought** phone can be reset by its owner (`reset phone`) before selling it
on. Theft is still a loss to you — the stake stays — but a thief gains a brick, not a phone to sell.

### Hand or ready tunes you; packed does not
The carrying tiers already exist and players already learn them. A phone in your rucksack is a phone
you will not notice. A looser *within reach* rule was considered so a charging phone on your desk
would count; it was dropped because charging happens while you are logged out.

### Power: `switch phone off` / `switch phone on`
The shipped device verb. Powered off, the phone does not tune you, and it draws nothing.

### The battery: a session of ordinary use, charging cheap and easy
- **Drains on the game clock, only while your body is online** (an offline body is frozen) — faster
  with heavier use, slower idle. A full charge outlasts an ordinary play session.
- **`put phone on charger`** — the shipped `put` verb and a charger fixture. Charging works only where
  the premises has power, and the premises' meter pays (the amount is trivial). A phone on a charger
  **keeps charging while you are logged out**, so *plug it in when you log off at home* is the whole
  habit.
- **Chargers are everywhere ordinary:** your dorm room, the lounge, and the general store sells one
  for anyone setting up a home.
- **A dead phone does not tune you** and is otherwise an ordinary phone.
- **`look phone`** shows its charge; the status bar shows it too.

### The room carries emotes
**Every place carries what is expressed in it to whoever is there** — the second postulate's rule 1
([arcane-science.md](../arcane-science.md)). An emote reaches everyone in the room with no tuner on
either side; past the room it needs a tuner at both ends. Owner, 2026-11-18. ⛔ Emotes are never given
senses of their own.

### Distance comms are player-to-player
No NPC is ever tuned for distance comms (owner, 2026-11-18). You talk to an NPC with `say`.

### Held, never silent
A `dm`, `reply`, chat line or remote emote you cannot send is **held and sent when you can**, and the
refusal says why and what to do: *"Your phone is in your pack — ready it to send."* · *"Your phone is
off — `switch phone on`."* · *"Your phone is dead — charge it."* Messages to you wait until you are
tuned, then arrive with *"while you were away…"*. When you are tuned again, the held messages go out by
themselves — they were queued by the command you ran, so nothing acts on its own.

### Reading needs sight
What arrives through the phone is read off a lit screen, so it works in the dark and waits while you
cannot see (blinded, unconscious). The implant needs no sight.

### Guests, the shade and the circle
Guests: a forced implant (owner — *"I'm just worried about phones leaking into the economy through
guests"*). The shade: intrinsic, as today. The circle: nothing forced (owner — *"what if the whole
point is to test not having an implant"*).

### Where to buy one
The Terminus general store sells the phone (not cheap) and the charger (cheap).

## Lens pass

1. **Pedagogy** — the battery is real arithmetic: how long a phone lasts is stored energy ÷ draw, and
   charging is limited by the charger's power. No Discipline dominates; the sums are derivable.
2. **Expression** — the dead phone is a staple of stories; authors get chargers and phone models as
   rows. **Constant:** the energy sums, the room-carries rule. **Variable:** phone models, chargers,
   where they are placed.
3. **Immersion** — the phone is an object; the room carrying emotes ends the oddity of NPCs who never
   see a wave. **Participation** — the general store's phone shelf; later, charging cafés and power
   banks.
4. **Values** — how much upkeep talking should cost: as little as possible (*"this isn't the place we
   want to put up barriers"*) — a session-long battery, charging while logged out *(grain)*.
5. **Continuity** — every tuner answers the same `dm`; a tuner that runs on power can run out, the
   implant never does.
6. **Economy** — a phone is a good with a price; grid power is consumed in trivial amounts and paid by
   the premises; the starter phone's leak is recorded (non-goals).
7. **Governance** — no criterion judges a person here. Denying someone a charger would put them off
   grid by the back door → guarantee P2 (non-goals).

## The drive

Two players, **A** and **B**, both new characters; one guest, **G**. Assertions are player-verb only
unless marked *staged*.

### Blocking drive

1. **Spawn with a phone.** A is created; `i` lists a phone, ready (in a pocket). `look phone` shows a
   full charge. *instant · player*
2. **DM works.** A `dm B hello`; B receives it, read off the phone. *instant · player*
2a. **Built in and installed.** `look phone` shows its charge and one installed app, Messages.
    *instant · player*
2b. **Uninstall.** A `uninstall messages`; `dm B hi` is refused — *install Messages* — and held. A
    `install messages`; the held message goes out. *instant · player*
3. **No implant.** A's body has no implant in its cranial slot (`look me` / `i`). *instant · player*
4. **Remote emote.** From another room, A sends B a directed emote; B gets it. *instant · player*
5. **The room carries emotes to NPCs.** A, in the lounge, emotes at Remy; Remy reacts. *instant ·
   player*
6. **Packed.** A moves the phone into a rucksack worn on the back. `dm B hi` is refused — *ready it to
   send* — and held. B `dm A hey`; A sees nothing yet. *instant · player*
7. **Ready it.** A readies the phone: the held `hi` goes out and B receives it; A gets B's `hey` with
   *while you were away…*. *instant · player*
8. **Local emote with no phone.** A packs the phone again; an NPC emotes in the room and A sees it; A
   emotes and B, in the room, sees it. *instant · player*
9. **Power off.** `switch phone off`; `dm` is refused (*switch phone on*) and held; `switch phone on`
   sends it. *instant · player*
10. **The battery drains.** Online through a few game hours of use; `look phone` shows the charge has
    fallen, and by no more than an ordinary session's use. *short · player*
11. **Dead.** *staged:* set the phone's charge to empty. `dm` is refused (*charge it*) and held; local
    emotes still work. *staged*
12. **Charge.** A goes to the dorm room and `put phone on charger`; after a short wait the charge
    rises; A picks it up and the held message goes out. *short · player*
13. **Charging while logged out.** A puts the phone (low) on the charger and logs out; game time
    passes; A logs back in to a charged phone. *short · player*
14. **Restart.** The world restarts; A logs in: the phone is in the same place with the same charge,
    and anything A had held is still held. *staged (restart)*
15. **Theft is a loss, and a brick.** A drops the phone; B picks it up. B cannot use it — it tunes
    nobody, runs nothing — and B cannot reset it; the general store will not buy it. *instant · player*
15a. **Buy one.** A goes to the Terminus general store and buys a phone and a charger; the new phone
    activates to A and tunes A. *instant · player*
15b. **Reset and sell on.** A `reset phone` on the bought phone and hands it to B; it activates to B.
    *instant · player*
16. **Blind.** *staged:* A is blinded. B's `dm` waits; when A can see again it arrives. *staged*
17. **Guest.** G logs in as a guest: G can `dm` A, has an implant, and has no phone to drop or sell.
    *instant · player*
18. **Light.** The dorm room and the lounge, `look`ed at, show the charger. *instant · player*

### Soak drive

1. **A session's battery.** A plays an ordinary long session (game days of mixed use) without
   charging; the phone does not die before the session would naturally end. *span*

## Acceptance criteria

1. A new character starts with a phone in a pocket and no implant, and can `dm` at once.
2. Carrying the phone in hand or ready tunes you; packed, off or dead, it does not.
3. `switch phone off` and `switch phone on` work and change whether you can send.
4. A full phone outlasts an ordinary play session; `look phone` and the status bar show its charge.
5. `put phone on charger` charges it where the premises has power, including while you are logged out.
6. Every NPC in a room perceives an emote made there, and NPC emote reactions fire; a player with no
   phone still sees emotes in their room.
7. An emote sent past the room needs a tuner at both ends.
8. A message you cannot send is held with a refusal that names the fix, and goes out when you can;
   messages to you wait and arrive with *while you were away*.
9. A phone and a charger can be bought at the Terminus general store.
9a. `look phone` shows what is installed; Messages can be uninstalled and reinstalled, and without
    it you cannot send.
9b. A phone in anyone's hands but its owner's tunes nobody; the free starter phone cannot be reset or
    sold; a bought phone can be reset by its owner and passed on.
10. Guests keep an implant; the shade is tuned; a holodeck body has no tuner unless its owner gives
    it one.
11. A message read off a phone waits while you cannot see.
12. Phone and charge survive a restart.

## Cross-references

- [aether-devices-slate](../slates/engine/aether-devices-slate.md) — the design; § 11 is the reuse
  ledger.
- [off-grid-slate](../slates/engine/off-grid-slate.md) § 0 — the 2026-10-28 phone decision.
- [content-declaration-slate](../slates/platform/content-declaration-slate.md) § 3.0 — the rungs.
- [guarantees-of-play-slate](../slates/society/guarantees-of-play-slate.md) — P2, `help ask`.
- [comms.md](../subsystems/comms.md), [emotes.md](../subsystems/emotes.md),
  [augmentation.md](../subsystems/augmentation.md), [carrying.md](../subsystems/carrying.md),
  [energy.md](../subsystems/energy.md), [char-gen.md](../subsystems/char-gen.md),
  [residence.md](../subsystems/residence.md), [display.md](../subsystems/display.md).
