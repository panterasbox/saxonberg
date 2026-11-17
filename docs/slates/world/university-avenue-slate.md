# University Avenue slate — the first unsafe room, and what happens when you try it

> **Status: UNBUILT** — talked through with the owner 2026-11-17. Of today's content, the main
> cast and scenery stay (Gus, the crossing, the station mouth, the shut gates). The rest is
> placeholder. What ships underneath it:
> - the lounge's combat sanctuary;
> - Dave's escalation ladder and the 86 (the bar-fight build);
> - combat terms and consent, and the blame ledger;
> - regard and recognition;
> - the `blow` whistle and the crossing log;
> - rosters and shifts; contracts; jurisdiction on the locality.
>
> **Left:** the rule of the room (§ 2) · Gus's ladder and his memory for faces (§ 4) · the "find
> out" sequences (§ 5) · the corner's levers: presence, guides and touts, the whistle, the night
> shift, a watch contract, cameras, gossip (§ 6) · Terminus's received street law (§ 7)
> **Size:** a build, after the law-enforcement and safe-places conversations it points at

## 0. The ask **[DECIDED — the owner]**

The owner commits to four pieces of content: the lounge, Dave's Bar, the university, and the city of
Terminus. In Terminus, exactly two places come first, and the city will be built around them:

- **the TPA station** (designed later; at least one arrival terminal);
- **University Avenue**, the crossing between the station and the University Gate. This slate
  covers that one room, in detail, the way the bar has been designed.

The avenue runs on east and west into more city; **those stretches have no crossing guard.** The
city map waits until systems design is done.

### The ancestor

In EotL every newcomer started in the lounge, which was no-combat, and the only way into the game was
down a spiral staircase to **the Heart of Eternal City**: the crossing of the two main roads, PvP
allowed, reachable by the newbie guide's teleport from anywhere. It was the busiest room in the game
and the prime spot for player-killers to camp new characters. *"It was awful for the game but also
made EotL somewhat notorious."*

From the source (`~/play/eotl/mudlib/zone/null/eternal/common.c`): on every reset the Heart loaded
two things:
- **the EotL Player Kill Monument** (`/obj/client/pkill_w`), which ranked the top 20 player killers
  online and showed **the room each one was standing in**;
- **a Newbie Helper** that broadcast tips.

A tally of killers and a help bot, side by side, at a crossroads where newcomers had no defense.

## 1. ⭐⭐⭐ The room is bait, on purpose **[DECIDED — the owner]**

*"That room is begging for campers. I kinda did that on purpose, because I want to be very in your
face about 'here's something shitty you can do, try it and find out what happens,' and the world
will learn pretty fast. And this isn't something you need a getting started guide to know about.
All you have to do is act like a decent human being and you'll be fine."*

- **The "find out" is immediate, local, visible to everyone present, and memorable**, so the story
  spreads faster than any guide could.
- **⭐ The rule needs no guide: a decent person already knows it.** That is lens 1's derivability
  applied to manners. If a decent person wouldn't do it, the room responds; if they would, nothing
  happens.
- **"In your face" is mostly writing:** the description shows the crowd of fresh arrivals; Gus's
  eyes are always on the newcomers; his lines telegraph it (*"Watched a fella try to make a living
  off this corner once. Didn't take."*).

### The owner's stance on PvP

The owner is not a PvP fan, but designs for all players. What he hates is **routine,
unimaginative** PvP: *"some guy camped out in the busiest room in the game taking out newly minted
characters just to pump up some number that means nothing to no one."* What he admires is
**creative** PvP: EotL's Bauhaus switched guilds and found a new way to kill with each, once with
the bards' *wall of sound*, the guild everyone thought weakest.

So: **never ban PvP globally, never reward the routine version, keep inventive play open.** A camper
needed three things at the Heart: a chokepoint full of helpless targets, a number to pump, and
nobody responding. This room takes away all three.

## 2. ⭐⭐⭐ Each place states its rule, and someone enforces it **[DECIDED principle — the owner]**

*"The venues where pkilling happens or does not happen should be something expressed in the content,
so everyone knows what to expect where."*

The bar already works this way (the bar-fight build): no mechanical ban, weapons checked at the
door, Dave escalates, and the 86 bars someone. *"The bar allows combat but only fisticuffs. If you
killed someone there it would not be okay."* The lounge's sanctuary is the one mechanical ban in the
game.

**The gradient a newcomer walks:**

| place | safe by | its rule | enforced by |
|---|---|---|---|
| the lounge | **mechanism** | no violence at all | the sanctuary: a fight cannot open |
| the bar | **people** | fisticuffs; weapons checked; a killing gets you 86'd | Dave and the staff (shipped) |
| the TPA terminal | **law and property** | harm in the station costs you the network | the TPA Authority |
| **⭐ the crossing** | **people and a witness** | move along; cross with the guard | **Gus** |
| the avenue beyond | nobody in particular | the street's | — |
| the campus | **law and property** | the university's | whoever holds the campus extent |

- **⭐ Power is write access to an extent** (the owner, 2026-11-17): *"The TPA authority has exactly
  the amount of power one would have by having write access to the /extent/ that controls TPA
  travel. This is really how you need to think about power in general in this game."*
- **The crossing is Terminus's.** City streets belong to Terminus city; the university holds its
  own paths inside its own extent. Gus's powers are whatever Terminus's street extent lets him do.
- **Each rule is readable where it applies:** a sign, a line in the description, what `look` says.
- **Murder is different because it leaves no witness.** Anything short of killing Gus leaves him
  able to tell; *"so Gus can tattle on you for anything else."* That is what makes cameras
  interesting (§ 6.7).

## 3. The room as it stands (kept)

- *"A broad city crossing where University Avenue meets the mouth of the Terminus station"*: the
  terminal to the south, the shut university gates to the north, the counting-houses down the
  avenue west. Loud with strangers passing through; nobody lives there. *"The stone is … worn in a
  diagonal track, the way a hundred thousand arrivals have already crossed it."*
- **Gus**: a crossing guard with total professional gravity, a whistle, a STOP paddle, and a
  **crossing log he tallies on every arrival**. His lines are kept: *"Roads don't care how old you
  are, friend. Physics don't check ID."*
- ⭐ **The inversion stays: the Heart counted the killed; the Avenue counts the arrived.**
- The station is **passengers only**; freight goes through the wharf cargo terminal
  ([logistics-slate § Cargo through terminals](../trades/logistics-slate.md)). Whether the avenue
  carries passenger traffic waits on logistics.

## 4. ⭐⭐ Gus — the witness and the alarm **[LEAN]**

A crossing guard has **no power of his own**. He isn't a constable. What he has is presence and a
whistle:
- **presence:** harm done in front of a witness goes on the record, attributed to whoever did it;
- **the whistle:** `blow` ships. It carries to everyone in earshot, the station included. That is
  the old **hue and cry**: whoever saw a crime raised the cry, and everyone who heard was expected to
  respond. Order made by people, not by an authority.

**His ladder:**
- **Prevention: no loitering.** Camping means standing at the chokepoint. Someone who stands on the
  crossing without crossing is moved along, out loud: *"Move along, friend. Station's got
  benches."* Linger again and he walks you off, onward in the direction you were facing.
  ⚠ **Passing through is never blocked**: the crossing is the station's only way out, so a ban from
  the room would trap someone in the terminal. *You may cross; you may not stay.*
- **Protection: cross with the guard.** His crossing ritual is the safety. Under his paddle you are
  being walked across.
- **Response:** the whistle; stepping in to break it up (`fight break`); and the record. He cannot
  win a fight, so attacking Gus himself is the most visible thing you can do on that street.

**⭐ His memory (DECIDED — the owner):** today Gus forgets everyone, warmly, on purpose. He keeps
that for friendly crossers, and **never forgets a face that caused trouble.** A known troublemaker
is moved along on sight, with a greeting that says why: *"I know you."*

**Gus works a shift.** He is on a roster like everyone else, so at night the crossing is unguarded
and the risk follows the clock (§ 6.5).

## 5. ⭐⭐ What happens when you try it **[LEAN]**

**Hanging around (camping):** moved along in front of everyone; then walked off; passing through
always allowed. Gus remembers you.

**Attacking a newcomer on the crossing:**
- the whistle, heard by the station;
- Gus steps in;
- the newcomer has two protected places a few steps away: back into the station, or up to the
  campus gate;
- Gus remembers your face. What it costs beyond the room is the law-enforcement slate's.

**Attacking Gus:**
- he blows the whistle as he goes down;
- **incapacitating him** (a crime, less severe) leaves the post visibly empty: *"the crossing
  guard's post stands empty"* is a line every arrival reads until he is back. He comes to and
  remembers you;
- **killing him is murder**, the one act that silences the witness. It belongs to the
  law-enforcement slate.

**What never happens:** no score, no count of kills, no monument. Harm is on the record as blame,
never as a number.

## 6. ⭐⭐⭐ The corner's levers — players taking care of business **[LEAN]**

The owner: *"Having NPCs running protection for other NPCs and players in town is fine design, and we
will need that as a solid backstop for keeping order. But what we really want is players taking care
of business themselves."* And: *"I wanna come at this thing from all angles and really get creative
with all the different levers we have to pull in this game."*

1. **The corner is valuable.** It is where every newcomer arrives, so presence there is worth
   something: a **busker**, a **paper seller** (the press ships), a **guild recruiter** (the guild
   slate's associate tier: *"the recruiter knows your name"*), someone **campaigning**, a **guide**
   walking newcomers to the counting-houses for tips. Gus's "move along" makes that presence scarce.
   **⭐ His favor is the license to stay**, earned by deeds, never bought.
2. **Helping Gus changes your relationship with him.** The owner: *"Someone fights him and you come
   in and chase the guy off … now your relationship with Gus has fundamentally changed. Maybe you
   can hang out on that corner now and shoot the shit with him and he'll not shoo you off."* That is
   regard, which already exists and works in every direction.
3. **Two layers of permission, as in a real city.** Informal: Gus's tolerance, earned. Formal:
   Terminus's permits or pitches, since the city holds the street. They can disagree: a permit
   holder Gus can't stand, Gus's friend with no permit.
4. **Guide or tout: the same act, read by character.** Walking a newcomer to the bank for a tip is
   a service; steering them somewhere crooked is the hustle. Gus's regard tells them apart: his
   friends are trusted guides, and the touts get moved along. Lens 4 in a doorway.
5. **⭐ The night shift (the owner liked this).** At night the crossing is unguarded, and the empty
   shift is a seat: **a player can be the night crossing guard**, earned the way a barback earns
   the bar ([bar-audition § 14](./bar-audition-slate.md)), through Gus's trust.
6. **A watch contract.** Terminus can post *keep the crossing quiet, 18:00–06:00* on the contract
   system: paid protection by players, and the "keep it true over a window" clause the bar's cover
   rung also needs. Whether the city funds it is a lever, so governance.
7. **Cameras, and who watches them.** A camera is a witness that cannot be killed. Its feed can show
   on a monitor somewhere, as screens already show streams, and **watching the monitor is a job**,
   a security post in the station office held by a player. Who may watch and what happens to the
   footage is Terminus's decision and the privacy slate's question
   ([privacy-slate](../platform/privacy-slate.md)). Destroying one is a crime of its own.
8. **Answering the whistle is a deed.** Whoever comes running has done something: Gus's regard
   rises, and so does their standing in Terminus (renown is per place).
9. **What Gus tells his friends.** Depth scales with time, as at the bar: who has been causing
   trouble, who the touts are, what is happening down the avenue. Gossip as a reward that costs
   nothing to author.
10. **The first person who helped you.** A newcomer helped on the crossing remembers the helper,
    player to player. For many players it will be their first relationship in the game.

### The staged rescue, and the x-factor

Two friends: one attacks Gus, the other "saves" him, and farms Gus's favor. What counters it:
- **the accomplice pays:** they are the attacker on the record, and Gus remembers their face;
- **Gus can notice they came together:** a shared party, arriving together;
- **a rescue earns regard, not the corner outright:** Gus's favor grows with time spent being decent
  there, so one dramatic moment cannot buy it;
- **⭐ the x-factor (the owner):** *"If you have players with the authority to intervene and possibly
  use excessive force, there's an x factor there it's hard to account for. You don't know who's
  gonna show up on the scene if you go messin' around; might not be worth the risk. A lot of this
  becomes cultural, since it involves player habits."*

## 7. ⭐⭐ Terminus's street law — received law, one law for all **[LEAN — a draft]**

The owner: *"We also need guidelines for what you're allowed to do to a guy … if you down them, what
are you allowed to do with their person? Can you take their stuff? What about just their ID? Are you
supposed to call it in? To who, specifically? And all the same questions for the player apply to Gus
himself."*

**Where it lives:** Terminus's law, as content. The legal-code slate puts each extent's law at
`<extent>/law/` as prose plus typed clauses, and a city ships with **received law** on the books
([legal-code-slate](../society/legal-code-slate.md)). The street's rules are a document Terminus
holds, readable by anyone and quotable on a sign at the crossing. **The engine records what
happened; the law says which of it was lawful.** No statute engine (civics.md).

**One law for Gus and players.** NPC enforcers get no special privileges, as with Dave's ladder (no
staff exemption).

A draft, from real concepts: *Right of self-defense* (Q157479, which covers defending others), *Use
of force continuum* (Q7901769), *Citizen's arrest* (Q2669334), *Duty to rescue* (Q1037363).

| situation | you may | you may not |
|---|---|---|
| **someone loitering** | ask them to move on. Gus, acting for the city, may walk them along | lay hands on them: loitering isn't violence |
| **an attack in progress** | step in, with the force needed to stop it: non-lethal against non-lethal, lethal only against someone fighting to kill | escalate past the threat |
| **the attacker is down** | **disarm them** (weapons only); **identify them** (look at them, examine carried papers); **hold them for the authority** (citizen's arrest); **help them if they are dying**, if the law asks it | **take anything else** (robbery, recorded as theft); **keep their papers**; **keep hitting them**; **kill them** |
| **calling it in** | report to **whoever holds the place**: Terminus, on its docket. On Gus's corner the whistle is the call, and Gus's own report goes on that docket | — |

- **A responder who goes too far is on the record too**, as the offender. That is the x-factor
  working both ways.
- **"Just their ID" is identification.** Identity papers live in the implant, so they cannot be
  lifted; identifying someone is an act of looking, and a disguise can fool it. **Unmasking a downed
  assailant to identify them** is the edge case. Lean: lawful, for the report.
- **The duty to rescue is a values choice.** Most common-law places impose no general duty; several
  civil-law countries do. Terminus picks one, and a polity can change it (tier C).

## 8. The lens pass

1. **Pedagogy:** the rule is derivable from decency, so no guide is needed. The street law teaches
   real concepts (proportional force, defense of others, citizen's arrest, the duty to rescue). The
   hue and cry is real history. The gradient of safety teaches what kinds of order exist:
   mechanism, law, people.
2. **Expression:** a player can be the night guard, a guide, a busker, a recruiter, a watch
   contractor, the one who answered the whistle. Venue rules are content, so a second place states
   its own.
3. **3a Immersion:** a crossing guard with a whistle and a memory for faces; the empty post after
   he's downed; no meters. **3b Participation:** players doing the policing themselves, within a law
   the city wrote and a polity can change. The culture of how far responders go is the players'.
4. **Values:** guide or tout; how much force; whether to stop and help; whether to unmask. **No
   gauge:** no kill count, no monument; the only tally counts arrivals.
5. **Continuity:** a crossing guard, a whistle and a hue and cry hold in any epoch; cameras are the
   later epoch's witness.
6. **Economy:** the corner's presence is a scarce good allocated by relationship, not money; the
   night shift and the watch contract are paid work; buskers and guides earn tips. Whether Terminus
   funds the watch is a lever, so governance.
7. **Governance:**
   - the move-along judges a person: criterion named (standing without crossing), it lifts on its
     own, and passage is never blocked;
   - Gus's memory of a face is a judgment with no appeal yet;
   - the street law is tier C, Terminus's to amend.

## 9. Open

1. **What the move-along escalates to,** past being walked off: the owner is not sure. A wider
   question for law enforcement.
2. **What attacking Gus costs beyond the room,** and what murder costs: the law-enforcement slate.
3. **Why the other places are safe, in detail:** the terminal's law (the TPA Authority's extent),
   the campus's.
4. **The appeal for Gus's memory:** can a troublemaker ever be forgiven?
5. **Cameras:** who installs them, who watches, what the footage may be used for.
6. **Passenger traffic on the avenue:** waits on logistics.

## Cross-references

- [lounge-slate](./lounge-slate.md) — the sanctuary
- [bar-audition-slate](./bar-audition-slate.md) — the trust ladder (the night shift's model)
- [legal-code-slate](../society/legal-code-slate.md) — law as content, received law, the docket
- [moderation-slate](../society/moderation-slate.md) — leaving the lounge is the opt-in; crime in the
  fiction is the place's law
- [executive-slate](../society/executive-slate.md) — dockets
- [guild-slate](../society/guild-slate.md) — the recruiter at the associate tier
- [privacy-slate](../platform/privacy-slate.md) — who watches the cameras
- [logistics-slate](../trades/logistics-slate.md) — the passenger station and the wharf
- [live-instance-testing-slate](../tech-debt/live-instance-testing-slate.md) — the cast; Wren meets
  this room first
