# Off-grid slate — the aether, its carriers, and what going off grid costs

> **Status: UNBUILT** — designed at high level 2026-10-28 with the owner. What ships: the aether
> transport — `dm`/`tell`, chat channels, remote emotes on `AetherMixin`
> ([comms.md](../../subsystems/comms.md), [chat.md](../../subsystems/chat.md)); the baseline
> `AetherImplant` every Avatar is given at spawn. Designed elsewhere: off grid as the absence of a
> provider ([delivery-slate](./delivery-slate.md)); the carrier ladder and the cloakroom
> ([content-declaration-slate](./content-declaration-slate.md) §§ 3.8–5); the border notice
> ([enforcement-slate](./enforcement-slate.md)); delivery held until the person returns
> ([person-targeting-slate](./person-targeting-slate.md) § 3); the three enforcement tiers
> ([prison-slate](./prison-slate.md)).
> **Left:** the phone as the starting carrier, the implant elective · the corrected ladder (the
> implant is future, the cell phone modern) · what each carrier addresses · coverage as field
> strength, built by relays and nodes · off grid as a trip, behind a posted edge · the return
> (reconnect, held messages, the cloakroom hands back) · the vignette conventions · the comms floor
> and other rights across parcels · the three chambers' tug of war · voice, video and screens
> **Size:** a build

Sibling: [emergency-services-slate](./emergency-services-slate.md) — off grid is where response
time rises, and that slate holds what the risk is.

## 0. The ask **[DECIDED — the owner]**

*"I already decided we're not going to auto-implant every character with aether capability
anymore, we'll start you with a phone you can carry around. But even that strains the model right
now because we're saying Terminus is industrial and the surrounding areas are medieval."*

*"Aether is really important for the social functionality of the game, it's all of chat and dms
and emotes that may as well be the whole ballgame. … If some areas want to force you to 'go off
grid' they should be able to. But it needs to be really easy to come back. … Hinkley Hills
shouldn't be off grid if that's where most of our players have their homes."*

*"I like the idea of going off grid being riskier, like response time is gonna go up. … We're
saying all this is governance, so as long as we can write it as a uniformly applied 'law' it
should be in bounds."*

⚠ **This reopens a ruling.** On 2026-09-01: *"I don't want players getting cut off from their
peers"* — which became comms.md's *"communication is never a regulated act — strange, not
silent"* and settlement-model § 9's *"isolation is never a difficulty mechanic."* Off grid as a
risk reverses that in part; § 5 says where the line now sits.

## 1. What the aether is **[DECIDED — the owner]**

- **The aether is a physical field** that interacts with none of the five senses.
- **Chat, DMs and remote emotes are information that travels on it.** Chat was never ESP.
- **The implant is the ESP receiver** — the one carrier that delivers into the mind.
- **The phone is the default; the implant is elective** — content-declaration § 3.8's opt-in,
  now the starting posture. A phone can be left behind, taken, broken or dropped in the sea.

## 2. The carriers **[DECIDED — the owner: "we should use that"]**

The ladder of content-declaration § 5, corrected:

| epoch | carrier | it is |
|---|---|---|
| prehistory | standing stones | a **place** you go to |
| medieval | the sympathetic needle | an **object** you carry |
| industrial | the aether-radio | a **device** you operate |
| modern | ⭐ the cell phone | a device in your pocket |
| future | ⭐ the implant | an **organ** |

Magic has a carrier of its own — a mana-powered charm — under the separate magic permission
([emergency-services-slate](./emergency-services-slate.md) § 5).

### Each carrier addresses something different **[LEAN]**

| carrier | addresses | needs |
|---|---|---|
| the aether (phone, radio, implant) | **a person** | coverage |
| the needle | **a relationship** — its twin | the pair |
| a sending (magic) | **a surveyed point**, one way | a caster, and someone who paid the survey |
| a bell, horn or call box | **whoever hears it** | to be near it |

- ⭐ **The ladder answers the covenant, not coverage.** A medieval town that refuses phones still
  has an instrument, so nobody there is silent. But the deep wilds, underground and underwater
  have no instrument that reaches anything — the ladder **relocates** off grid, it does not erase
  it.
- ⚠ **A needle cannot DM anyone.** It reaches the holder of its twin. A medieval DM needs a pair,
  or a node that relays — a needle house, like a telegraph office. **[OPEN]**

## 3. ⭐⭐⭐ One line is every line **[DECIDED — the owner]**

The owner: *"as long as there's at least one line players can chat on with each other, players
will use it for whatever they deem necessary, whether it's auction or emergency response or
whatever."*

So splitting a "player line" from a "character line" buys nothing. And cutting players off from
each other does not make risk — it exports the conversation: *"Discord … that's obviously our
biggest competitor in this space and we definitely don't want that."*

The owner's alternative — *"we let people make their own rooms, so why not force them to go into
a room together if they wanna chat?"* — fails two cases: a group on the move, and someone who logs
in alone and wants to find their friends.

## 4. The vignettes — how players actually talk **[LEAN]**

| # | the player | matters | expects | off grid |
|---|---|---|---|---|
| 1 | **logs in and finds their friends** — who's on, where are you, a DM | ⭐⭐⭐ the retention moment | MUD `who`, a friends list, Discord's green dot | if this fails, the session starts on Discord |
| 2 | **a running DM thread** with a friend doing something else | ⭐⭐⭐ | whispers that work anywhere | stops mid-sentence |
| 3 | **the community channel** — gossip, newbie help, the hum | ⭐⭐⭐ where MUD communities lived | always there | the loneliest silence in a MUD |
| 4 | **party talk while moving** | ⭐⭐ | party chat | fine in one room; breaks when someone straggles |
| 5 | **"I'm dying, come help"** | ⭐ rare, high stakes | a party heal | the call does not go out — the risk wanted |
| 6 | **a private conversation** | ⭐⭐ | DMs | needs a private room — fine when together |
| 7 | **async notices** — mail, a sale, a deposit, a friend came on, a stream went live | ⭐⭐ | a phone's notifications | delayed |
| 8 | **trade and auction** | ⭐⭐ | a trade channel | trade from town |
| 9 | **a remote emote** | ⭐⭐ social glue | channel emotes | gone for the trip |
| 10 | **scheduling** — *the tavern at 8*, *brb* | ⭐⭐ | — | delayed |
| 11 | **voice while playing together** | ⭐⭐⭐ what Discord actually wins on | Discord voice | § 9 |
| 12 | **builders working an extent** | ⭐⭐ labor's channel | Slack, Discord | mostly in the CMS, unaffected |

The patterns:

- **Async degrades gracefully** (7, 10) — held, then delivered.
- ⭐ **Synchronous talk with people who are not with you** (1, 2, 3) is where off grid hurts, and
  where Discord takes the conversation. Everything worth protecting is here.
- **Synchronous talk with people who are with you** (4, 6) mostly survives — speech, rooms,
  paired needles.
- **Emergencies** (5) are the risk wanted, and the only one in the table that is.

## 5. ⭐⭐ The conventions **[LEAN]**

- **Off grid is a trip, never a residence.** People accept no signal on a backcountry hike, not
  where they live. Where vignettes 1–3 happen — homes, towns, wherever people log in — stays
  covered.
- ⭐ **Coverage is field strength, built** — weak in the wilds, strengthened by relays and nodes
  (delivery-slate's lean: *zone-varying, dead zones and high-aether sanctums*). Coverage follows
  density, because towns built it and the wilds did not. **Hinkley Hills is not an exception —
  it is covered because people live there.** A medieval town is covered without anachronism: its
  node is a temple or old stones.
- **Off grid begins at a posted edge** — the border notice the enforcement slate already
  requires. Nobody discovers it mid-sentence.
- **Isolation may be geography, never a sanction.** The wilds are off grid because nobody built
  there; no authority may *put* a person off grid. That keeps settlement-model § 9's exclusion
  rule (exclusion never touches the aether) and admits the wilds. **[LEAN — awaiting the owner]**
- **Logging in off grid** — you logged out in a cave. Does the login place matter, or is the
  first thing shown the edge and how far it is? **[OPEN]**

## 6. Coming back — it must be easy **[LEAN]**

- **Walking back into coverage reconnects at once**, with nothing to type.
- **What was sent waits** — the person-targeting slate's *held until they return* — and arrives
  as *"while you were away…"*.
- **The cloakroom hands the phone back** as you leave; the claim is automatic.
- **The status bar says *no signal*, and which way coverage lies.** Off grid is a place you know
  you are in.

## 7. ⭐⭐ The tug of war is the three chambers **[LEAN]**

The owner: *"there's a tug of war with what we want authored, with what players want authored,
with what authors themselves want authored."*

| chamber | wants |
|---|---|
| consumers — players | everything works everywhere |
| capital — us | to compete with Discord: voice, video, the client as where people live |
| producers — labor, authors | to build the areas they want, by their own rules |

The Compact's legislature passes on two of three, so **the comms floor is a constitutional
question, not a design default** — and the structure is what settles it.

## 8. ⭐⭐⭐ Rights across parcels **[DECIDED — the owner; the list OPEN]**

> ⭐ **2026-10-28 — the list is decided** as Tier B *guarantees of play*, not convention rights:
> [measurement.md](../../measurement.md) § Guarantees of play ·
> [guarantees-of-play-slate](./guarantees-of-play-slate.md).

The owner: *"If someone commits a Terminus crime in Terminus then they go to Terminus jail. What
gives Terminus the authority to jail the player? That's just a private committee, it's not the
Compact. That's why the Compact needs to ensure you have certain rights across parcels. And then
we have local courts that are just run however the local committee wants to run them — simple
appeal and response by someone on the committee, or something more elaborate. And we also have
the Compact courts, when the player challenges that their pact-granted rights have been violated.
Those are all prescribed by the constitution and are composed of player juries."*

- **Local courts** are the constitution's one process
  ([draft-constitution](../../compact/governance/draft-constitution.md) Art. VI) at local
  settings — the jury pool and bindingness the committee chooses.
- **The Compact courts** are Art. VI § 6's constitutional review: an act that infringes a
  protection is void.
- **The authority is delegated and consented to on entry** **[LEAN]** — a committee holds title by
  grant from the Compact, and you entered under posted law. Delegation is bounded by the rights
  floor.
- ⚠ **The gap** — Art. IX (rights) is open, and the draft enumerates nothing until a convention
  ratifies it. Only two protections are secured by the platform itself meanwhile: freedom from
  disenfranchisement, and exit with your data. Candidates to secure the same way **[OPEN]**:
  - **a comms floor** — vignettes 1–3 where you live;
  - **limits on confinement** — does a sentence run while you are offline, and may a gaol cut
    your comms (the prison slate's open question 2).

## 9. Voice, video and screens **[OPEN]**

The owner plans voice and video in the client, *"just to directly compete"* — and *"we have the
idea of 'screens' in fiction, so there's more to design out there"*
([display.md](../../subsystems/display.md)). In the fiction, a voice call to another town *is* a
phone call, so: does it need the modern carrier? The hardest case of authors against capital; its
own pass.

### ⏸ Deferred until players ask **[DECIDED — the owner, 2026-10-28]**

*"If it's an extra cost I'd probably wait on doing any of this until people actually ask for it.
Because if they use Discord anyway, who cares about it."* — the *wait for players to design it*
doctrine applied to infrastructure: an SFU, TURN relays and a moderation problem with no demand yet.
*"Whatever works is fine"* on the details. The starting shape, so nobody re-derives it:

- **Voice rides the two transports that exist** — room voice is acoustic (people in the room hear
  you), calls are aether (party, friends, groups); off grid, coverage and carriers apply as for text.
- **What a carrier carries** is its honest epoch property — the needle letters, the aether-radio
  voice, the cell phone video, the implant everything.
- ⭐ **A place governs what is spoken aloud in it, never the aether** — an author may set room voice
  off (quiet hours, the library); calls stay on the comms floor.
- **Voice reveals the player** past disguise and belief — room voice is a group's choice, never the
  default with strangers.
- **Video is calls only**, on a held screen; projecting a call onto a room's display needs the remote
  caller's consent.
- **Safety** — friends-only by default; record-on-report kept locally (PlayStation 5, Riot), to meta
  moderation only; minors; captions.
- **An open-source media server** (LiveKit, Apache-2.0) so any realm can run its own.

## 10. The lens pass

1. **Pedagogy** — coverage as infrastructure: why signal follows people.
2. **Expression** — an author may build an off-grid place; the carrier ladder lets every epoch
   talk in its own way.
3. **Immersion** — every carrier is an object or a place in the fiction. **Participation** —
   building relays and nodes is civilization visibly spreading.
4. **Values** — nobody cut off where they live; no one put off grid as a punishment.
5. **Continuity** — one transport, five carriers; the same `dm` from a needle house or an implant.
6. **Economy** — the aether-radio and the needle are trade goods; relays are infrastructure
   somebody pays for.
7. **Governance** — the comms floor and confinement limits as rights across parcels; the
   authority to jail as delegation, bounded.

## 11. Open

1. **The needle and DMs** — pairs only, or a relaying needle house.
2. **Logging in off grid.**
3. **Isolation as geography, never sanction** — confirm.
4. **Which rights are secured by the platform** ahead of the convention.
5. **Voice, video and screens** — deferred until players ask (§ 9).
6. **What the wilds' field is** — weak (slow and short) or absent (phones dead).
