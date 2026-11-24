# Aether devices slate — the field, the tuners, and the screens

> **Status: PARTLY BUILT** — the aether-devices build (MR !615, 2026-11-19) shipped §§ 3, 5, 6's
> one kind of app, and § 9's power state: the room carries emotes so NPCs perceive them; the phone
> is the starting tuner and the free implant is a guest's; a carried tuner confers attunement and
> says why not; apps are one kind (`App` rows, `apps` verb); held, never silent; the battery and the
> charger; ownership as the lock; every shade the shade species. Reference:
> [aether-devices.md](../../subsystems/aether-devices.md).
> **Left:** `help ask` and the social promise (§ 1 → guarantees-of-play-slate, customer service) ·
> the screen cleanup (§ 6 → display-manifestation-slate) · calls designed, not built (§ 7) · the
> *power it down* law and the town's node (§ 9 → the epoch build, content-declaration-slate § 3.0) ·
> the original question: instruments driven by mind (§ 10) · ⭐⭐⭐ **the Exchange** (§ 12, designed
> 2026-11-24): apps on your line, never on a person or a device; one app store and identity
> authority, TPA-shaped; corpos make hardware only; how an app's verbs show
> **Size:** design (§§ 7, 10); a build (§ 12); the rest rides other slates

## 0. The asks

**2026-11-17, the owner:** *"I really need to figure out what we're doing for aether connectivity,
screens, and your implant. This is mostly debt but some of it might be some new content like a
cell phone that's a platform for all sorts of other software. … I'd also like to maybe try to have
p2p video chat in the game long-term though we have to figure out the privacy implications of that.
… I really want to try and displace discord as where business gets done. … if there's saxonberg
business that needs to get done, I'd like it done on saxonberg. … None of that is needed right now
… we need this build to be forward looking as well as revisiting a bunch of past decisions."*

**2026-11-02 (the original ask, kept in § 10):** *"Is it basically just like real life where some
things take keys and some unlock with your phone? Do we model things like IoT?"*

## 1. ⭐⭐⭐ The aether has one job **[DECIDED — the owner, 2026-11-18]**

> *"The aether is set up to do one main thing in this game: provide a reason for chat, dms and
> emotes to work at a distance. For emotes it also helps that the modality is extra-sensory because
> emotes don't carry a modality of their own. This extra-sensory perception also makes it more
> resilient to things that might try to isolate you. A dm should pretty much always work unless
> there's an extreme reason not to. I don't want the player to just be walking around and then find
> he can't talk to anyone and can't find his way out of whatever condition he got himself stuck in.
> So that's the load-bearing part of the aether, everything else serves that. And the phone is a
> device that tunes you into that field so you can read and write to it."*

**The test every aether design answers first:** *can this leave someone unable to talk, or unable
to find their way out?*

Consequences, each a reversal of something proposed earlier in the same conversation:

- **No signal-strength capacity, no coverage as something people build.** Both could leave someone
  unable to talk. Lens 1 argued for deriving capacity from field strength (Shannon); lens 4 outranks
  it here. The aether is a postulate that keeps the social game working, and the pedagogy lives
  elsewhere.
- **Off grid is rare, extreme and posted, never ordinary friction** — reversing
  [off-grid-slate](./off-grid-slate.md)'s *off grid as risk* lean.
- **Messages are addressed to people, never to devices or lines**, and the true sender is the person.
  (*The Wire*'s burner phones are unmakeable over the aether, deliberately; a burner, if anyone
  ever wants one, is some other, non-aether thing.)
- ⚠ **Superseded by § 12.1 (2026-11-24) — apps are on your line, not the person.** ~~**Apps are not installed on the device.**~~ Attunement is a state of the person, and comms, forums,
  the wallet and the calendar are hosted on the person. The shipped architecture was right.

### ⭐⭐⭐ Reframed the same day: two promises, and a `dm` carries neither alone **[DECIDED — the owner, 2026-11-18]**

Working through the epochs (§ 9) showed that *"a dm should pretty much always work"* asked the aether
to carry a safety guarantee. The owner: *"I just don't want people to ever feel like they're
stranded and can't ask for help. Maybe the answer is that we don't consider dms load bearing for
this … when you're stuck somewhere and scrambling you're not thinking about what command to best
use, you just want to send a message to your buddy or an admin."* And: *"I want social players to
never have to worry about mechanics that prevent them from talking. If I'm 100% social … I can just
sit in an epoch-free area all the time chatting to whomever I want. I don't have to engage with
these other systems. That should be the other promise."*

1. **Nobody is ever stranded without a way to ask for help** — and that net sits **outside the
   fiction**: the player talking to staff, not the character talking to anyone (EverQuest's
   `/petition`, WoW's *character stuck* service). It needs no tuner, no coverage and no epoch, and
   like logout (guarantee P9) it always works. Nothing like it exists today. ⭐ **It lives in `help`**
   **[DECIDED — the owner: *"I'd rather just build it all into the help system. Why have multiple
   things"*]** — a `help ask <what's wrong>` subcommand beside `verb`, `api` and `search`
   ([help.md](../../subsystems/help.md)), and the bare `help` card offers it. A player who types
   their trouble at `help` in plain words (`help I'm stuck in a cave and my phone is dead`) finds no
   topic, and the answer hands them the exact `help ask …` line to run — the way a phrase typed bare
   is handed back quoted. Nothing is sent without the player running it (the command definition
   predicts everything) →
   [guarantees-of-play-slate](../society/guarantees-of-play-slate.md).
2. **A social player never meets a mechanic that stops them talking, unless they walk into one.**
   Every restriction on talking belongs to a place you enter on purpose, past a posted edge. Where
   you start, live, log in and gather stays free of them, and a player who never leaves it never
   engages with any of this. This is the comms floor (P2) stated from the player's side.
3. **So a `dm` may honestly fail** inside a place that restricts it — and it never fails silently. It
   is held and sent the moment it can go, and the refusal names the way out: *"Your phone is off —
   this goes when you power it on or reach the needle house. Stuck? `help ask` reaches a person."* The scrambling
   instinct is caught and pointed somewhere.

**Losing your phone** — theft can reach even a social player. **[DECIDED — the owner]**:
*"replacement should be easy but not necessarily cheap. And … if you're a purely social player you
probably try to stay out of areas where your device is vulnerable."* No protection; an easy
replacement; the stake is money and caution.

## 2. ⭐⭐ Who talks at a distance: players, and only players **[DECIDED — the owner, 2026-11-18]**

> *"I don't ever want dms to go to npcs. That's a player to player thing and only that. If you talk
> to an npc you do it with 'say', the reason real communication works. There's no reason to message
> an npc at a distance or we'd have to scan the entire npc keyword space every message."*

- `dm`, channels and remote emotes are player-to-player. No NPC carries a tuner.
- ⚠ This retires comms.md's note that *"the per-NPC implant is content the `npc-dialogue`
  `addressed`/`tell` entry will need."* It will not.

## 3. ⭐⭐⭐ Places carry; a tuner reaches past the place **[DECIDED — the owner, 2026-11-18]**

> *"NPCs can and should emote, at least locally."*

Emotes are extra-sensory **for every emote, whatever it contains**.

> ⛔ **Never give emotes senses.** Per-emote modalities (a wave is seen, a shout heard) were proposed
> and refused: *"if I wanted to give emotes modalities I would have done it already … it has to work
> for every emote we might ever possibly make. What about a meme that quotes a movie? Is that visual
> or audio?"* Any rule here must hold for every emote anyone will ever author.

The rule, written as a sharpening of the second postulate's rule 1
([arcane-science.md](../../arcane-science.md) — *"reached only through a carrier — a place, an
object, a device, an organ — or by a kind of creature born attuned"*):

> **Every place carries what is expressed in it to whoever is there.** A tuner — a phone, an
> implant, a needle — or being born attuned is what reaches past the place you stand in.

- **Local:** an emote reaches everyone in the room, with no tuner on either side. NPCs emote and
  perceive emotes this way.
- **At a distance** (channels, a remote emote, a `dm`): a tuner on both ends — players only, by § 2.
- **No new biology.** An earlier draft made every species faintly attuned; the owner: *"it invents a
  little biology I'm not thrilled on."* A place being a carrier is already in the postulate, and the
  standing stones (the prehistoric rung) were always *a place that carries further*.
- **It is not a fourth invented item** — it sharpens a clause of the second postulate, so
  arcane-science's budget of three holds.
- **Reach is the room, exactly** — which is how emotes already behave.
- ⚠ **A defect this fixes.** Today every emote, local ones included, is stamped `emotive-esp`, and
  only an implant grants that modality — so **an NPC misses even a wave in its own room**
  ([emotes.md](../../subsystems/emotes.md) § Topic and modality).
- **Losing your phone shrinks your reach to the room** — the owner: *"it also means you can still
  emote in the room if you lose your phone, which I do like."*

## 4. ⭐⭐ What a person feels: the device decides how it manifests **[DECIDED — the owner, 2026-11-18]**

> *"Although the aether is extra-sensory, the phone itself is not. You're always experiencing a dm
> or an emote or any of the other content of the message frame as reading it off a screen. Only the
> implant is truly ESP. … It's all just information, but how it's manifested changes per device."*

(This reverses an earlier draft of this section, which said a phone does not make messages visual.)

- **The message has no sense; the recipient's device gives it one.** This passes the meme test (§ 3):
  any emote, any message, read off a phone is *read*, felt through an implant is *known*. The rule
  is per device, never per emote.
- **It is the display's three-arm idea again** ([display.md](../../subsystems/display.md)): content
  carries no manifestation of its own, and the thing that shows it decides.
- **What arrives through the room itself** (a local emote, § 3) needs no device, and stays
  extra-sensory.

| device | manifests as | what follows |
|---|---|---|
| implant | extra-sensory — you *know* it | private; works blind, in the dark, in a fight |
| phone | **sight** by default — a lit screen you read; or sound or vibration, by its mode (below) | someone close can read over your shoulder; a lit screen shows in the dark (a hider who reads their phone gives themselves away); unread while you cannot see |
| needle | sight — letters turned on a dial | slow, short |
| aether-radio | sound from a speaker the room overhears; headphones if you have them | the ladder forbids a radio *coupling* to the aether through hearing — *playing* as sound is a different thing |

### ⭐⭐ A phone does everything a phone can do **[DECIDED — the owner, 2026-11-18]**

*"It's a phone, it should do everything a phone can do."* So:

- **The owner sets the mode, as on a real phone:**
  - **screen** — read by sight; someone beside you can read over your shoulder;
  - **speaker** — the room hears it (reading aloud to someone who cannot see is one use of it);
  - **earbuds** — private sound; the shipped `Headset` row becomes an earbud accessory instead of
    the worn-implant workaround;
  - **silent or vibrate** — felt, not heard.

  A phone that rings in a theater, or in your pocket while you hide, is your own setting — stealth
  content, never a rule.
- **Writing:** type with a hand (silent) or dictate (aloud — the room hears what you say). Nothing is
  blocked; with both hands on a weapon you dictate and everyone hears. A soft limit with an honest
  cost.
- **The implant does everything a phone does, inside your head** — private, hands-free, never
  overheard. Asleep, messages wait like notifications; an alarm can wake you, as a phone's can.
- **The aether-radio is a radio** — the table above.

### The lens pass on *a phone does everything*

1. **Pedagogy** — a phone is a corporeal `Thing`, so it may carry physical sensors (camera, compass,
   light sensor, location) without touching the rule that the aether never carries a measurement
   ([augmentation.md](../../subsystems/augmentation.md) § the three-base model). Under
   [instrumentation.md](../../subsystems/instrumentation.md)'s *the instrument sets the ceiling*, the
   phone is a cheap, **low-ceiling** instrument for many readings and a dedicated instrument reads
   higher — true to life, and it keeps the instrument trades.
2. **Expression** — every feature is an app, and an ordinary app is a row (§ 6): flashlight, camera,
   map, compass, clock. Found-footage horror (*Blair Witch*, *Cloverfield*) needs exactly the
   flashlight and the camera. ⚠ **The map app shows your own map document** — walked, seen, searched,
   published — **never the world's index**; [location-graph.md](../../subsystems/location-graph.md)'s
   firewall applies.
3. **Immersion** — a lit screen in the dark, a ring at the wrong moment, shoulder-surfing: all
   honest. **Participation** — the repairer, the app maker, the thief, the spy reading your screen.
4. **Values** — a phone that does everything is the attention device: notifications only for what
   you subscribed to, and do-not-disturb *(grain)*.
5. **Continuity** — ⭐⭐ **the phone is the great obsoleter, and that is Terminus's modern arc.** It
   eats the flashlight, the camera and the photographer, the compass, the map shop, the watch — and
   **the town clock**, lens 7's own example of civic infrastructure that made time common, which the
   phone makes private again. Those people and institutions are the content, best lived through.
6. **Economy** — the battery is the consumable; the flashlight and video drain it faster, which
   drives chargers and power demand. The phone takes the low end of every instrument market, not
   the high end.
7. **Governance** — *no phones in the theater* and *no cameras in the bathhouse* are **the same
   mechanism as the epochs** (§ 9): a law on operation, obeyed or broken in front of witnesses. One
   rule covers period towns and private venues; the [privacy-slate](../platform/privacy-slate.md)'s
   private room is where it matters most.

## 5. The tuners

| band | tuner | it is |
|---|---|---|
| Muscle | the standing stones | a **place** that carries further |
| Draft | a speaking-stone — a carried shard of the stones | an **object** **[LEAN]** |
| Wheel | the sympathetic needle | an **object** |
| Engine | the aether-telegraph — an office with a key and a tape | a **place** you go to again **[LEAN]** |
| Electric | the aether-radio | a **device** that draws power |
| Signal | ⭐ the phone — the starting tuner | a device in your pocket |
| Future | the implant | an **organ** — the tuner you cannot lose |

(Bands are the prime-mover epochs, [content-declaration-slate § 3.0](../platform/content-declaration-slate.md).)

(The ladder is content-declaration-slate § 5's, as corrected in off-grid-slate § 2.)

- **Every tuner answers the same `dm`.** Continuity passes by construction.
- ⭐ **The phone is the starting kit; the free implant is retired** — carrying out the owner's
  2026-10-28 decision ([off-grid-slate](./off-grid-slate.md) § 0), which the code never did:
  `Avatar.installDefaultLoadout` still seats an `AetherImplant` in every new player's cranial slot.
- **A carried tuner confers attunement.** Today only a slot occupant confers (`getActiveMixins` reads
  slot occupants' `confers()`), which is why the worn `Headset` exists as `WearableMixin(AetherImplant)`.
  The rule wanted: a tuner in your **hand** or **ready** tier tunes you
  ([carrying.md](../../subsystems/carrying.md) § the tiers); one **packed** in a rucksack does not,
  and what was sent waits until you ready it. **[LEAN — the owner has not ruled on ready vs anywhere
  on the body]**
- **Seamless:** nobody ever types *take out phone*. `dm` and a remote emote go straight through.
- **Losing your phone is really bad** — the owner: *"losing your phone is really bad, don't do it."*
  It is a real stake, and nothing engineers around it; § 3 is what keeps it from being mute.
- **The implant can't be lost** — that is its whole case, and someone has to choose it (medicine
  fits it).

### Decided for the first build (2026-11-18, the requirements conversation)

→ built; see [aether-devices.md](../../subsystems/aether-devices.md) (the requirements and plan retired at the sweep, 2026-11-19).

- **The battery is in the first build** (the owner). It lasts a full play session of ordinary use,
  drains on the game clock only while your body is online, and charges with `put phone on charger`
  wherever the premises has power — **including while you are logged out**. *"Keeping your phone
  charged should be cheap and easy — this isn't the place in the game where we want to put up
  barriers."*
- **Guests keep a forced implant** — *"I'm just worried about phones leaking into the economy through
  guests … or anything for that matter."*
- **The shade is tuned intrinsically; a holodeck circle body gets nothing by default** — *"you
  shouldn't be forcing any decisions on a holodeck user. What if the whole point is to test not having
  an implant?"* The circle's owner equips it; the circle's rule that nothing made inside can leave
  stops leaks.
- **`help ask` waits for customer service** — *"we'll handle customer service later."*
- **Getting an implant** waits for *"a cool process"* and the surgery slate.
- **The starter phone is a value leak** like today's starter clothes →
  [money-integrity-slate](../tech-debt/money-integrity-slate.md).
- ⚠ **Superseded by § 12.1** — software is on your line and runs at the Exchange. ⭐ **Apps run on the device, from day one** (the owner, reversing § 1's *apps are not installed on
  the device* for new apps): *"I do want to make sure we design and build the concept of an app
  running on the phone now … a clear concept of what's built into the phone and what's installed on
  it."* Built in: the tuner, power, battery, screen. Installed: **Messages** (DMs, chat, remote
  emotes). The calendar, wallet and forums stay on the person — *"we don't have to migrate"*.
- ⭐ **Activated to its owner** — a phone tunes and runs apps only for the person it is activated to;
  the free starter phone can never be reset (*"bind itself to the user or otherwise be worthless to
  anyone but the new player"*). A bought phone can be reset by its owner.
- **One new verb, `apps`** (`apps`, `apps install`, `apps uninstall`) — the noun is the apps, not
  the phone, because the implant runs apps too. Everything else uses a shared verb: `switch`, `put …
  on charger`, `title transfer`.
- **Ownership is the lock** — a phone runs for whoever holds its title (chattel); the starter's title
  cannot be transferred. No `reset` verb.
- **Brands** — phone models are corpo brands (Aevex premium and the implant's maker, Hollis budget,
  Vionne luxury); **Messages is no corpo's** — an open standard, so a corporation never owns the
  comms floor. Your starting phone's brand comes from your lineage
  ([lineage-slate](../society/lineage-slate.md)).
- **A tuner within reach was dropped** — hand or ready tunes you; charging happens while you are
  logged out.

## 6. Screens, and one kind of app

- **The phone is also a held screen** — a `Tablet`-shaped display in your hand, so it shows your
  apps' cards and casts to a room's screen the way driving by mind does today
  ([display.md](../../subsystems/display.md) § the implicit-screen ladder).
- ⚠ **§ 12.6 replaces the *app as a row with verbs* half of this bullet** — an app's verbs are its class's; a row app is a card. **One kind of app.** Two exist today and do not know about each other: a **hosted update** that
  contributes verbs (`calendar`, `dm`, the wallet) and a **card on a display** (the house tablet's
  `stock` sheet). An app is the first, and on a carrier with a screen it may also show the second.
  ⭐ **Lens 2:** an ordinary app should be a **row** — a card (a live MQL query) and the verbs it
  contributes, on one generic class — with a class only for a bespoke one. *"A platform for all
  sorts of other software"* means packs and players ship apps without a kernel edit.
- **The screen debt** (from [display-manifestation-slate](../client/display-manifestation-slate.md)
  and [vocabularies-to-rows](../tech-debt/vocabularies-to-rows-slate.md)): who may drive a screen is
  a closed four-value `pairing` enum, wanted as an access check; `DISPLAY_KINDS` and
  `DISPLAY_PAIRINGS` are hard-coded lists, wanted as rows; the three content kinds reach the client
  by three mechanisms, wanted as one.
- The lounge rulings stand: **a screen grants attention in common, never access** — you never need
  a screen to watch a stream ([lounge-slate](../world/lounge-slate.md) § Screens).

## 7. Calls and video — designed now, built when asked **[LEAN]**

The owner's direction is to displace Discord *for Saxonberg business*, and none of it is needed
now. [off-grid-slate](./off-grid-slate.md) § 9's starting shape holds, sharpened:

- **Voice and video are information**, so they reach as far as text: a call is a session among
  players over the aether, and every tuner can hold one.
- **Room voice is acoustic** (the people in the room hear you); a place may set room voice off. Calls
  stay on the comms floor.
- ⛔ **Never peer-to-peer.** Direct WebRTC exposes each player's IP address to every other player on
  the call. All media goes through a relay server (LiveKit, Apache-2.0, with TURN), so no player
  learns another's address, and any realm can run its own.
- **The privacy floor** (plane 1, real people — an invariant): the platform never records; a report
  clip stays on the reporter's own machine; calls are friends-only by default; minors are handled;
  captions are offered.
- **Voice gives the player away** past disguise and belief — a known gap in the
  [privacy-slate](../platform/privacy-slate.md); room voice is never on by default with strangers.
- **A real face on a dwarf is where immersion cracks** — so video is a call between people, and
  showing one on a room's screen needs the caller's consent. Rendering your character's face is far
  future.
- **What *Saxonberg business* needs first** is the off-grid slate's vignettes 1–3 (finding your
  friends, a running DM, the community channel) plus an organization's own channels — chat has them;
  **presence** (*who's on, where*) and calls are what is missing.
- **Who pays:** real media servers cost real money — the founding offering for ours; a realm runs its
  own.

## 8. The lens pass

1. **Pedagogy** — honestly thin, by decision: the aether is the one postulate that keeps the social
   game working, and § 1 refuses the signal-strength physics that would have taught. What remains to
   teach is security, where people are the weak point (a passcode, a stolen phone).
2. **Expression** — named works: *Her* fails by § 2 (no NPC at a distance), deliberately; Harry
   Potter's two-way mirror and the palantír pass (a paired tuner); *Phone Booth* and *Severance* pass
   (a phone of a place; a building that refuses devices); *Mean Girls*' three-way ambush needs a rule
   for who can see who is on a call; *The Wire* fails by § 1, deliberately; *Stranger Things*'
   walkie-talkies fail — there is no short-range physical radio, and nowhere is that gap's home.
   **Constant:** the aether's reach, the true sender, the privacy floor. **Variable:** which tuners a
   realm allows, what they look like, which apps exist (rows, § 6).
3. **Immersion** — every tuner is an object or a place; nobody is mute in the room they stand in.
   Video is where it cracks (§ 7). **Participation** — phone seller, repairer, thief and fence, the
   implant surgeon, app makers; a polity may refuse tuners by covenant.
4. **Values** — how loseable connection should be: the phone is a real stake, the room a floor that
   never goes (§ 3). Notifications only for what you subscribed to *(grain)*; real faces opt-in per
   call *(grain)*.
5. **Continuity** — every tuner answers the same `dm`. ⭐ **Who holds the obsolete half:** the
   needle-house keeper, the switchboard operator, the town crier, the letter carrier — and the
   institution, the needle house as a public place where news met people. A phone serves one person;
   the lounge screen is the counter-move. Across epochs, a modern tuner is powered down by law and
   the town's node or a bought needle carries you (§ 9).
6. **Economy** — produces devices and apps; consumes power (a phone has a battery, and the charge
   economy exists); was the demand there first — yes for text and presence, not yet for video.
7. **Governance** — a carrier ban is a posted covenant, appealable to the Compact courts where it
   breaks the comms floor (a Tier B guarantee of play, 2026-10-28); isolation is geography, never a
   sanction *(lean — awaiting the owner)*; a public call box redistributes reach from those who own a
   phone *(civic infrastructure)*.

## 9. ⭐⭐ The epochs — you power it down; it's a law **[DECIDED — the owner, 2026-11-18]**

The owner's question: *"The phone is modern so you can't take it everywhere. Does this mean you
have to have a bunch of different devices for different content? … On the other end is making the
phone some sort of magic device that changes its epoch and capability on the fly with location.
That's extreme but it also solves the problem. The reality is probably somewhere in the middle."*

The decision came from the implant: *"an implant you can't just check at the door, it's wired into
your skull. But an implant is undoubtedly future tech that has no place in a medieval town. So the
only possible option is you can enter but with it powered down."* And: **"You power it down, it's a
law."**

- **A covenant regulates operation, never possession.** You walk into a medieval town with your
  phone or your implant; you power it down at the posted edge. Nothing is checked, swapped, sealed
  or stored, and one rule covers the phone and the implant alike.
- **It is a law, so it can be broken.** Running a modern tuner inside is a crime people can witness —
  the enforcement ladder's `witness` / `norm` rungs ([content-declaration-slate](../platform/content-declaration-slate.md)
  § 3.8), never a `wall`. Nothing in the engine switches your device off for you.
- **Talking inside the town:**
  - **in the room** — always; the place carries (§ 3);
  - **at a distance, at the town's node** — the bottom rung of the ladder, *a place you go to* (a
    needle house, a temple, the post office). Messages to you wait there. Ordinary civic
    infrastructure, like the well — not a service for visitors;
  - **or with a tuner you bought** — needles are sold in the market, like a local SIM card abroad.
    Someone who spends time in medieval places keeps one; a day-tripper uses the node.
- **Honest cost:** distance talk in a medieval town is slower and needs you to go somewhere, unless
  you bought a needle. *Strange, not silent.*
- **A world medieval all the way through** starts its players with a needle instead of a phone.

⚠ **What it needs:** a **power state** on a tuner — augmentation lists it as unbuilt (*Wave 2+*,
[augmentation.md](../../subsystems/augmentation.md)) — so that a powered-down phone or implant
really does not tune you, and powering it on inside is the act a witness sees.

### Rejected on the way, so nobody re-derives them

- **The cloakroom swap** (the town keeps your phone and lends its tuner at the edge) — still a
  different device per epoch; the owner: *"the cloakrooms just make it so you don't have to carry
  all of them at the same time."*
- **The phone check at a door** — breaks on getting it back (a back door, crossing A → B → C), and
  puts stashes on authors and juggling on players.
- **The sealed pouch, and a duty on the town to supply tuners** — *"imagine if my city has to have
  people … at every city crossing swapping out my car for a horse and buggy because of a law they
  could easily change. No city would ever do that."*
- **"Talking is exempt from epochs"** — stated as a rule with no source. The real source is
  guarantee of play P2 / arcane-science rule 6 (*regulate the instrument, never leave a person with
  none*), which the town's node and the room now satisfy without a swap desk.
- **The phone that changes its epoch with location** — the fiction betraying itself (lens 3a) and
  every older tuner trade erased (lens 6).

### Still open

- **Widen P2?** As written the comms floor protects you *"where you live and log in"*; § 1's *"a dm
  should pretty much always work unless there's an extreme reason"* is wider.

## 10. Open — instruments driven by mind (the original question, 2026-11-02)

Unchanged from this slate's first version, and still open:

1. Any instrument by mind, or only one that declares it (a smart lock, a smart meter)?
2. Which instruments first, and does each have a demand already there?
3. What a device reports, and to whom — the [mirror-slate](../platform/mirror-slate.md)'s devices are
   the *player's*, out of fiction; these are the *character's*.
4. ⚠ **The two lines:** no out-of-fiction control panel (every act is a verb through a carrier the
   actor holds), and no automation through the back door
   ([standing-instructions-slate](./standing-instructions-slate.md) comes first).
5. Defeats — jamming, spoofing, forging the record: another trade, or nowhere? ⚠ Now bounded by § 1:
   no defeat may leave a player unable to talk.

Also open: **isolation is geography, never a sanction** (confirm) · **what counts as an extreme
reason** for a `dm` not to work (the lean: only a place an author posts, entered knowingly, with an
exit you can find without help).

## 11. Reuse ledger for the plan

| concept | already does it | this build |
|---|---|---|
| attunement | `AetherMixin`, `_augmentGated`, conferred by `AetherImplant` or `Species.innateMixins` | reuse |
| conferral by carrying | only slot occupants confer (`MixinApi.getActiveMixins`); `Headset` is the worn workaround | ⭐ generalize to hand + ready tier; `Headset` stops being a worn implant and becomes the phone's earbuds |
| apps | hosted updates (`CommsUpdate`, `ForumsUpdate`, `CredentialWalletUpdate`, `CalendarUpdate`) + display cards (`Cards.ts`) | unify; an app as a row |
| the phone | `Tablet` (`Display(Good)`) | a tuner row on it — not a new class unless the conferral needs one |
| local emotes | every emote frame stamped `emotive-esp` | the room carries; reception gated only past the room |
| starting kit | `Avatar.installDefaultLoadout` seats the implant | seat the phone instead |
| the room as carrier | a place is a carrier in arcane-science rule 1 | write the clause |
| screens | `DisplayMixin`, `CommandController.resolveScreen` | the access-check, rows and one-wire-shape cleanup |
| the battery | no electrical battery exists; `ChargedMixin` is denominated in τ (mana) | ⭐ genuinely new, or a generalized charge economy — the plan decides |
| power on/off | `SwitchableMixin` and the `switch` verb | reuse for the phone's power state |
| the charger | `put` with a placement; the energy pack's `GridPowered` and the premises meter | a charger row on the grid |
| held messages | the person-targeting slate's *held until they return* | the plan decides whether it exists in code |
| a phone's modes and sensors | `LightSource` (the flashlight), the `Reading` rows (instrumentation), the per-player map document, `ChargedMixin` (the battery) | reuse — each feature an app row over what exists |

## 12. ⭐⭐⭐ The Exchange — your line, the app store, and how an app's verbs show **[2026-11-24]**

The owner's ask: *"the rest of the cellphone build and the app store and whatever needs to get
converted to apps. plus we need to figure out verb affordances via app … does the phone afford the
verb or does the app? the answer is both and we need to figure out the presentational language for
all that."*

⚠ **This section supersedes** § 1's *apps are not installed on the device … hosted on the person*,
§ 5's *apps run on the device* and *activated to its owner* as the home of software, and § 6's *an
ordinary app is a row … and the verbs it contributes*. Where they disagree, this section wins.

### 12.1 Nothing is on the person, and nothing is on the device **[DECIDED — the owner]**

> *"nothing should be on the person and we shouldn't need to distinguish anything … the device can
> change with epoch (implant, needle, whatever) and whatever the device you're using needs to
> interoperate with the app store and your app store account has whatever apps installed …
> information is information and software should work everywhere. but a needle can't compute it can
> only report."*

- **Your apps belong to your account — your line at the Exchange (§ 12.2) — never to a body and
  never to a device.** A new phone, a lost one, an implant, a needle at an epoch edge: the same
  apps, with nothing to keep per device and nothing to migrate.
- **The software runs at the Exchange, not on the device** (§ 12.4). A device is a window onto your
  line: it shows what it can and takes in what it can.

| device (its kind, "the mold") | shows | takes in |
|---|---|---|
| implant | anything — *known* | thought |
| phone | a screen, sound, vibration | touch, voice |
| radio | sound the room hears | voice |
| needle | a few letters, slowly | very little |
| the telegraph office (a place) | tape | the key, at the counter |

- **An app needs information** — text, a card, a picture, input — and **degrades or declines
  honestly** on a device that cannot carry it (*the needle can't show a picture*). It never
  silently disappears.
- **The aether never cares what device you use** **[DECIDED]**: *"a phone and an implant shouldn't
  change a person's CLI and 'with implant' or 'with phone' has no meaningful distinction."* No verb
  takes a device option; there is no `dm --with`.
- **Kind and brand are two concerns** **[DECIDED]**: *"manufacturer and the mold a device fits into
  aren't the same concern."* The **kind** (phone, implant, needle) decides how a message manifests
  (§ 4) and what slot it takes; the **brand** (Hollis, Aevex, Vionne) decides the hardware's quality
  — how much it shows, its battery, its price. Neither changes what you can type.
- **Two devices borne: both at once** **[DECIDED]**. A message goes to your line, so every carrier
  you bear shows it together, each in its own manifestation — two lit screens, twice the
  shoulder-surfing, an honest cost of carrying two. Sending is from your line too; the device you
  typed on matters to the fiction (whose screen was lit, whether you dictated aloud), never to the
  command.
- **Hardware is the device's own, not an app** **[LEAN]** — a lamp, a lens, a compass are not
  information; the device has them or does not (*a flashlight is a lamp, not software*). Their verbs
  are the device's.

### 12.2 The Exchange — one store, a single authority, shaped like the TPA **[DECIDED — the owner]**

> *"we probably dont want or need to accomodate more than one app store in the game. multiple
> messaging apps maybe, if someone thinks they can improve on the basic dm. so the store needs a
> single authority … The TPA sounds like the closest relative here, infrastructure with a real
> narrative placement in the game and staffed by the compact but otherwise operating
> independently."*

- **The Exchange** — the name puns twice: a telephone exchange (it switches your traffic) and a
  market (it is the store). In plain words it is **the app store**; the UI says *app store*.
- **Its shape is the TPA's** ([fasttravel.md](../../subsystems/fasttravel.md) § the transit-fare
  economy): a `/system/` pack; a public utility that is **not the state**, banking commercially;
  self-governing — appointed by a committee over its own extent that names no realm, the group owned
  by the Prime Minister's office; no staff until a position arrives with a reason. The kernel keeps
  the shapes (what a device shows and takes in, the `apps` verb); the pack keeps the store, the
  lines and the works, meeting over a protocol the way `teleport` meets `TravelNode`.
- **Vocabulary** **[DECIDED]** — *your line* (your account: *you have a line at the Exchange*),
  *your line is cut* (suspended), *operators* (its staff). The verbs stay plain (`apps`, `apps
  install`); the puns live in the prose and the fiction. ⚠ § 1's *messages are addressed to people,
  never to devices or lines* still holds — a line here is the person's account, never an address.
- **Its first positions, when they come** **[LEAN]**: app review (someone judges what is listed)
  and line support — where `help ask` (§ 1) lands.
- **Its place** **[LEAN]**: the Exchange building in Saxonberg City — a window onto a live system,
  like every building there; in earlier epochs its storefront is the telegraph office and its clerk.
- **Corpos make hardware only** **[DECIDED]**: *"hardware only, corpos just make the devices."*
  Nothing stands between you and the Exchange. A corpo decides what its device can show and take
  in; it never curates or blocks, and ⛔ **corpos do not publish apps** **[DECIDED]** — a corpo earns
  by its devices and the maker's royalty (§ 12.2a), and no corpo is ever the toll on `dm`. A walled-garden
  device (a prison phone, a pager) exists only as one bespoke authored row, for a story **[LEAN]**.
- **Apps are free for now** **[DECIDED]**; the payment framework they will run on is § 12.2a.

### 12.2a Paying for apps **[DECIDED — the owner, 2026-11-24, except where marked]**

Scope: paying **for** apps, and nothing else — an app that takes payment for something else (remote
ordering, a tip jar, person-to-person transfers beyond `pay`) is its own design, because ordering
at a distance meets logistics.

- **A sale is a license — a credential on your line.** Copying software costs nothing, so a sale
  moves the right to run it, issued by the Exchange like every credential (§ 12.3). Three kinds,
  all data: **free** (no license), **owned** (one payment, kept), **subscription** (a license with
  a term that renews). Uninstalling keeps the license; reinstalling is free. A lapsed subscription
  leaves the app installed and declined (*"your Calendar Plus subscription lapsed — renew it"*).
- **`apps install` is the purchase**, settled before anything installs, the way the TPA settles a
  fare before the ride: confirm the price, settle, issue the license, install. Every refusal comes
  before any money moves. No second verb.
- **Zorkmids, on the ledger.** You pay from the account your wallet's payment credential links;
  coin cannot cross the aether (you could pay coin at the Exchange's counter). Every leg is a
  conserved transfer — no new faucet.
- **Anyone may publish and set a price** — a player, a business. The publisher is the one named on
  the app's row (the authorship ledger already records who wrote it).
- **The split** (one paid install):

  | leg | to | why |
  |---|---|---|
  | price − the Exchange's cut | the publisher | they made it |
  | the Exchange's cut − the royalty | the Exchange | its works and operators — the fee exists because computing costs power (§ 12.4) |
  | the royalty | the **makers of the carriers that reached the sale, split equally** | the hardware that reached your line |

  The Exchange's cut takes the TPA's network-fee shape (a flat base plus a percentage) as Terms its
  committee posts; the maker's royalty is banking's corpo-royalty-off-the-top shape (a bank's
  Terms). A subscription pays the royalty at each renewal, to the makers of the carriers then.
  Free apps carry no royalty. Taxes are the polity's to levy, as on any sale.
- **Fixed for everyone — invariants, not grain:**
  - no ads, no in-app purchases, no paid randomness — an app is free, owned or subscribed;
  - zorkmids only — real money never enters the app store (the founding offering is the only
    real-money door);
  - Messages and the Wallet are free forever — they are the floor;
  - a license outlives its app's delisting — what you bought stays yours.

### 12.3 The Exchange is the one identity and issuing authority **[DECIDED — the owner]**

> *"the TPA shouldn't be handling accounts, it should all be through the app store and your TPA
> credential is just an app on your phone."* And, choosing the single authority over the issuer as
> the source of truth: *"is there a single issuing authority or isnt there, we shouldn't be trying
> to have it both ways."*

- **Every institution's standing on you is a credential on your line.** The TPA decides to clear you
  (`register` at a terminal), the Exchange issues the credential, and the line is the only record.
  The TPA keeps no accounts.
- **One wallet** **[DECIDED]** holds every credential on your line — a new kind is data, so a guild,
  a club or a landlord issues with no code. An institution may also publish a **service app** (the
  TPA's departures board in your pocket) that reads the wallet and never keeps a copy **[LEAN]**.
- **Banks keep the money; the line keeps the link.** `bank_ledger` stays the bank's; the payment
  credential that links you to an account is on your line.
- **Forgery becomes fraud against a line** — breaking into someone's account at the Exchange.
- **Possession is not identity — physical credentials are not the Exchange's** **[DECIDED]**: *"we
  still want to have other forms of credential in the game. the entire locksmithing build is about
  just that … the Exchange … has no authority over a key on your keyring, only your phones
  capabilities and maybe a watch too or something if we want to have other app carriers."*
  - **One authority per credential, decided by the lock's technology** — the shipped key entry
    already carries `technology` (*a brass key can't turn a keycard reader*). An **aether** lock
    trusts your line (any carrier shows it; revoked per person at the Exchange); a **brass or
    keycard** lock trusts the key you hold (the cutter's; possession is access; revoked by
    re-keying). A lock may take either, or demand both.
  - The building's owner chooses by the trade-off — clean revocation that depends on the Exchange,
    or a key that works in any epoch and is copied out of its sight. For aether locks, the line is
    the [lock-slate](./lock-slate.md) § 2 record of who holds access, for free. ⛔ The locksmithing
    build stays whole; it needs only an `aether` technology to exist.
  - The shipped wallet keychain splits on the same line: its entries become aether credentials; the
    physical `Key` stays a bearer key. The shipped `TravelCard` stands in for identity today, so it
    becomes a cheap device that shows your line (tap to ride), or it goes.

### 12.4 What does the computing — the Exchange's works, on the grid **[DECIDED — the owner]**

The owner: *"compute does not run on mana, I want to try and keep mana and aether kinda separate
unless there's some specific physics overlapping the two systems … if that needs a power source to
explain itself then I'd rather it be magic that can run on any epoch."* It needs no magic:

- **The second postulate already answers it** ([arcane-science.md](../../arcane-science.md)): the
  aether is not magic and carries **information and nothing else**. Computing costs energy in our
  own physics (Landauer: erasing a bit has a floor of heat), so the field carries for free and
  cannot think for free. **The thinking happens in real machines in one real place — the
  Exchange's works, on the grid** — and the aether carries your input in and the result out.
- **Epochs stop mattering for compute.** A needle in a period town reaches a modern machine room the
  way a telegraph reaches the city; a realm that rejects magic has nothing to reject, and a realm
  that rejects the aether already powers devices down at its edge (§ 9).
- **The economy** (lens 6): the Exchange is the grid's largest customer — operators, cooling,
  outages as content.

### 12.5 A `dm` is always an app — and the floor still holds **[DECIDED — the owner]**

- **`dm`, channels and remote emotes are the Messages app's**, on your line like every app. Others
  may publish a better messenger above it (*"multiple messaging apps maybe, if someone thinks they
  can improve on the basic dm"*).
- **The floor:** arcane-science rule 6 says no authority may refuse the field or leave a person
  with no way to talk. So **Messages rides the field's own routing** (rule 5: *it routes by
  address*) and needs none of the works' compute — it keeps working through an outage of the works
  and through a cut line. Every other app is the Exchange's to run, and to lose.

### 12.6 How it shows **[DECIDED — the owner, except where marked]**

- **The app gives the verb; the carrier reaches it.** That is the "both". It is **not** the same
  relation as a thing's place, and the two are **not unified** **[DECIDED]**: *"the link between a
  rod and your hand is not the same as a phone and its apps, don't try too hard to unify them."*
  - **"in"** — where a thing is: *fish — the rod in your right hand*, *program — the desk here*.
    `which`'s naming, unchanged.
  - **"through"** — how your line reaches you. Messages is not *in* the phone.
- **`which`** gives apps their own section, the carrier named once in its heading:

  ```
  Your line, through your Hollis Pal
    Messages   dm, reply, chat
    Calendar   calendar
    Wallet     pay, wallet
  ```

  A carrier that cannot reach is marked in the heading with its fix (*dead — charge it*) and the
  section's verbs grey out beneath it — still listed, because the command line still accepts them
  and declines. The phone's own verbs are a thing's, with the other things: *switch — your Hollis
  Pal, in your pocket*. `which dm` answers both relations: *dm — Messages, on your line, through
  your Hollis Pal*; two carriers: *…through your Hollis Pal and your implant*. `which phone` answers
  what it is (`switch`) and what it carries (*your line: Messages, Calendar, Wallet*) as two parts.
- **A declined app verb names the link that broke**: *Messages can't reach your line: your Hollis
  Pal is dead. Charge it.* — the held-never-silent rows, reused.
- **Chatting never shows the plumbing** **[DECIDED]**: *"none of this should matter for chatting
  with people except maybe as tooltip data on the message frame."* At most the frame's tooltip
  carries *arrived through your Hollis Pal*.
- **Apps and cards are separate concepts** **[DECIDED]**: *"not all cards are apps and not all apps
  are cards."* An app is software on your line that gives verbs; it may push no card at all (a
  credential and `register`). A card is a client surface a command pushes; most come from no app
  (`which`, `here`, the navigation card). Where they meet, a card pushed by an app's verb carries
  *app · through carrier* in its header and goes dark — greyed with the reason, never vanishing —
  when the carrier does **[LEAN]**.
- **An app's verbs are declared by its class**, the one record of affordances
  ([command-routing.md](../../subsystems/command-routing.md) § *There is ONE record*). A row-only
  app is a card — a live query whose controls send verbs you already have **[LEAN]**. This replaces
  § 6's *an ordinary app is a row … and the verbs it contributes*, which would revive the retired
  second record.
- **The radial is out of scope** **[DECIDED]** — it is broken and undecided; nothing here adds to it.
- **Unread and mention counts** (open in the [modes-slate](../client/modes-slate.md), required by
  the mobile client) get their server source from Messages **[LEAN]**.
- **Two "phones"** — the in-game device is called by its name (*Hollis Pal*; *carrier* in docs); the
  real phone running the client is *mobile*.
- **Scoped to a device — dropped.** `phone::dm bob` implying a device was floated and falls with
  *the aether never cares what device you use*; the "through" attribution `which` needs is a runtime
  record for the plan, not a new way to declare an affordance.

### 12.7 The lens pass

1. **Pedagogy** — real computing: the work happens elsewhere and the device is a terminal; what a
   device can show follows from what it physically is; Landauer prices the works. ⚠ **Gap:** no
   computing or signals Discipline exists to exercise.
2. **Expression** — a new device row declares what it shows and takes in and every app works on
   it; a new card app works on every device; neither needs code. Named works: *Cloverfield* (the
   lamp and lens are hardware), the Victorian telegraph-office drama (the office is the device) pass;
   a corpo walled garden passes only as one bespoke row.
3. **Immersion** — a lost phone replaced with your apps intact is how real phones work. **Participation**
   — the clerk, the operator, the repairer, the app maker, the screen-reading spy; NPC and player at
   the same seats.
4. **Values** — the forced choice is which device to carry: private but surgical, cheap but
   overheard, period-true but slow. ⚠ *Everything follows you everywhere* is the attention device —
   do-not-disturb and subscriptions are per line *(grain)*.
5. **Continuity** — the strongest: one line, every carrier, the same verbs — the test passes by
   construction. Who holds the obsolete half: the needle-maker, the telegraph office and its clerk.
6. **Economy** — hardware carries it (made, sold, repaired, charged, stolen); software is free to
   copy and free for now; the works are a real power load. The demand for paid apps is not there
   yet.
7. **Governance** — ⚠ **cutting a line or delisting an app judges a person**: the Exchange owes a
   posted criterion and an appeal (the Compact courts), and an entrenchment tier — open. The floor
   (§ 12.5) means a cut line never strands anyone.

### 12.8 What this changes elsewhere — owed, not done here

- **[arcane-science.md](../../arcane-science.md)** — rule 5 (*it does not vouch for things: it opens
  no door*) still holds and wants one line: the **Exchange** vouches and opens an aether lock, as an
  institution using the field; the field itself never does.
- **The Eternal University lore (§ 8, *the aether is identity-blind*) and
  [credential.md](../../subsystems/credential.md)'s *a credential is a presentation, the issuer is
  the truth*** — retired by § 12.3; the deferred issuer-authorization ledger is dropped, not built.
- **The shipped code is debt against § 12.1** — the wallet, calendar and forums apps hosted on the
  person; the TPA's clearance read from the person's hosted wallet (`getHostedApps()`); per-device
  `installedApps`.
- ⚠ **stream-arrival (build-2, in review)** — its D16 (an app's verbs reach whoever bears its
  device, declined with the device's reason) is the mechanism this needs and stands; its D21 (one
  store: the published app rows) agrees with § 12.2. Its **per-device installed list** is the one
  piece § 12.1 moves to the line — a follow-up after it merges, not a reason to reopen it.

### 12.9 Still open

- **The Exchange's criterion, appeal and entrenchment tier** for cutting a line or delisting an app
  (§ 12.7).
- **The Exchange's privacy duty** — it runs your software, so who may read what it runs →
  [privacy-slate](../platform/privacy-slate.md).
- **What converts to apps beyond the four shipped** — candidates: a watch app (`tune`, `tune-follow`,
  `tune-post`), a news app (`press`, `press-read`), `notify` and contacts inside Messages, the map
  (your own map document only, never the index).
- **A computing / signals Discipline** (§ 12.7, lens 1).
