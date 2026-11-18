# Aether devices slate — the field, the tuners, and the screens

> **Status: UNBUILT** — opened 2026-11-02 out of the lock design (lock-slate § 7) as *instruments
> driven by mind*; ⭐ **re-founded 2026-11-18** in a design conversation with the owner on aether
> connectivity, screens and the implant. Shipped and still right: the aether transport (`dm`/`tell`,
> chat channels, remote emotes — [comms.md](../../subsystems/comms.md),
> [chat.md](../../subsystems/chat.md)); attunement as a state of the **person**, with comms, forums,
> the wallet and the calendar hosted on the person ([augmentation.md](../../subsystems/augmentation.md));
> born-attuned species; screens and their by-mind ladder ([display.md](../../subsystems/display.md)).
> **Left:** the phone as the starting tuner and the free implant retired (§ 5) · a carried tuner
> confers attunement (§ 5) · local emotes carried by the room, so NPCs emote and perceive (§ 3) ·
> one kind of app (§ 6) · the screen cleanup (§ 6) · calls designed, not built (§ 7) · ⭐ **the
> epochs — a phone is modern, so what do you carry elsewhere** (§ 9, the next conversation) · the
> original question: instruments driven by mind (§ 10)
> **Size:** a build (§§ 3, 5, 6) plus a design pass (§ 9)

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
- **Apps are not installed on the device.** Attunement is a state of the person, and comms, forums,
  the wallet and the calendar are hosted on the person. The shipped architecture was right.

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

## 4. What a person feels **[DECIDED]**

The tuner tunes; it is not how you perceive. What arrives on the aether arrives extra-sensorily
whichever tuner you carry — a phone does **not** make messages visual. A draft said it did (*the
phone is a screen, so it has to be visual*), and that was the tension the owner raised; it dissolves
once the phone is a tuner first and a screen second (§ 6).

## 5. The tuners

| epoch | tuner | it is |
|---|---|---|
| prehistory | the standing stones | a **place** that carries further |
| medieval | the sympathetic needle | an **object** |
| industrial | the aether-radio | a **device** |
| modern | ⭐ the phone — the starting tuner | a device in your pocket |
| future | the implant | an **organ** — the tuner you cannot lose |

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

## 6. Screens, and one kind of app

- **The phone is also a held screen** — a `Tablet`-shaped display in your hand, so it shows your
  apps' cards and casts to a room's screen the way driving by mind does today
  ([display.md](../../subsystems/display.md) § the implicit-screen ladder).
- **One kind of app.** Two exist today and do not know about each other: a **hosted update** that
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
   the lounge screen is the counter-move. And § 9 is this lens's open question.
6. **Economy** — produces devices and apps; consumes power (a phone has a battery, and the charge
   economy exists); was the demand there first — yes for text and presence, not yet for video.
7. **Governance** — a carrier ban is a posted covenant, appealable to the Compact courts where it
   breaks the comms floor (a Tier B guarantee of play, 2026-10-28); isolation is geography, never a
   sanction *(lean — awaiting the owner)*; a public call box redistributes reach from those who own a
   phone *(civic infrastructure)*.

## 9. ⭐⭐ Open — the epochs: a phone is modern, so what do you carry? **[NEXT]**

The owner, 2026-11-18: *"The phone is modern so you can't take it everywhere. Does this mean you
have to have a bunch of different devices for different content? That's not awful but we might be
able to make it better. On the other end is making the phone some sort of magic device that changes
its epoch and capability on the fly with location. That's extreme but it also solves the problem.
The reality is probably somewhere in the middle."* — the next conversation.

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
| conferral by carrying | only slot occupants confer (`MixinApi.getActiveMixins`); `Headset` is the worn workaround | ⭐ generalize to hand + ready tier; retire `Headset` as a class |
| apps | hosted updates (`CommsUpdate`, `ForumsUpdate`, `CredentialWalletUpdate`, `CalendarUpdate`) + display cards (`Cards.ts`) | unify; an app as a row |
| the phone | `Tablet` (`Display(Good)`) | a tuner row on it — not a new class unless the conferral needs one |
| local emotes | every emote frame stamped `emotive-esp` | the room carries; reception gated only past the room |
| starting kit | `Avatar.installDefaultLoadout` seats the implant | seat the phone instead |
| the room as carrier | a place is a carrier in arcane-science rule 1 | write the clause |
| screens | `DisplayMixin`, `CommandController.resolveScreen` | the access-check, rows and one-wire-shape cleanup |
