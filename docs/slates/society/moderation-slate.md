# Moderation slate — what moderators can do, in a world that polices acts as well as words

> **Status: UNBUILT** — designed with the owner 2026-11-05 → 11-07, one question at a time. Nothing
> in code: no mute, ban, report or mod-log verb exists. Forcing function: the owner going live on
> stream and inviting viewers into the game for chat (Twitch two-way through `tune`, YouTube and
> Kick read-only through the relay). Shipped substrate it rides: the Office → committee → permission
> doctrine ([governance.md](../../subsystems/governance.md)), grants as data on a seat
> ([employment.md](../../subsystems/employment.md)), extents and `heldExtents`
> ([access.md](../../subsystems/access.md)), managed-group roles
> ([grouping.md](../../subsystems/grouping.md)), the Subject layer chat and forums share
> ([chat.md](../../subsystems/chat.md), [forums.md](../../subsystems/forums.md)), private attention
> rules ([social-graph.md](../../subsystems/social-graph.md) — `notify`), the frame store
> ([record-layer.md](../../subsystems/record-layer.md)), the estate clock
> ([credit.md](../../subsystems/credit.md)), chain of title
> ([chattel.md](../../subsystems/chattel.md)), the relay ([streaming.md](../../subsystems/streaming.md)),
> staging's recall ([staging](../platform/staging-slate.md)).
> ⭐ **Holds and sentences (2026-11-10, § 14a):** mods are the executive and impose HOLDS; lasting
> deprivations are SENTENCES that need a case; holds last until the weekly court day (the stream,
> always public, the audience an advisory jury).
> **Left:** everything in § 19 (the go-live list) · the raid dial's shape · what the mod queue shows ·
> channel domains · mod tiers · rehabilitation's own conversation · the re-entry ladder (§ 9, general)
> · Kick's moderation events (unverified) · ⭐ (2026-11-18, § 23) local jurisdiction — a document per
> information space carrying its house rules, the discoverability line, reach-bounded sentences, the
> lowest common holder, the reserved list, the conduct judge's workspace. [prison-slate](./prison-slate.md) — whose guardrail this
> slate **reverses** (§ 16) — was rewritten alongside it.
> **Size:** a build — its go-live wave is small

## 0. The ask **[the owner, 2026-11-05]**

*"We need to talk about moderation and all the tooling we need for it. I kinda look at Twitch and
YouTube and Discord as a starting point for what we need but I want to make sure it's all flavored
like Saxonberg, leaning into the systems that make our platform unique."* And, after the first
pass: *"This is why we need to go slow with this."*

## 1. ⭐⭐ Why we are not Twitch **[DECIDED]**

*"Twitch/YouTube/Discord are all communication tools. It's all dialogue and emotes and memes, no
one is policing actions. Here we have both. Stealing is wrong but so is using the n-word in mixed
company. They're different kinds of wrong."* Three consequences, each its own axis:

- **Two kinds of wrong.** A wrong done to a *character* (theft, burglary, a mugging) is the
  fiction's business — local law, or nobody's. A wrong done to a *person* (slurs, harassment,
  doxxing) is conduct, and conduct is what this slate moderates.
- **Different remedies.** Prison may rehabilitate an invested character; an hour-old one is not
  worth the investment and is simply plucked out of the experience (§ 16).
- **Scope is bounded by extent.** *"Banning someone from logging into the game entirely is extreme
  if your moderation scope is just a channel or two."* (§ 3)

### 1a. ⭐⭐⭐ There is no consent mechanism — leaving the lounge is the opt-in **[DECIDED]**

*"Someone mugging you on the street and taking all your shit is not harassment … none of it you
opted into or out of. You opted in the minute you left the safety of the lounge. Even in the bar
one room away your safety is only guaranteed by the other people there."* The world is dangerous by
design. **No opted-in-scene machinery** (the alternative examined and dropped).

- **Harassment is recognized by a person, never classified by the engine.** *"I do know harassment
  when I see it."* The engine's job is to make the **pattern** visible — the record is keyed on the
  offender **and** the target, which is what separates a mugger (any victim of opportunity) from a
  harasser (this person, again).
- **Context lives in the space.** Quoting a slur from a song on public comms is discouraged; the
  movie or song channel may declare looser norms (a setting on the destination, § 3).
- **Who is harmed when nobody hears it?** The frame store holds only frames actually *delivered*.
  Speech nobody received leaves no frame, so nothing is reportable. Whether a moderator should ever
  reach past what a witness saw is the surveillance question ([privacy-slate](../platform/privacy-slate.md)),
  and the answer at the grain is **no** (§ 17).
- *"These are questions that have to be wrestled with by the Compact."* The build makes them
  answerable; it does not answer them (§ 17's altitude table).

## 2. ⭐⭐⭐ Three families — by WHO the rule is imposed on **[DECIDED]**

*"Mute iffy on gossip channel but just for me … that's a different kind of moderation because it's
not imposed on iffy, it's imposed on me … we should be careful not to confuse moderation with
privacy."*

| family | imposed on | protects | set by | accountable? |
|---|---|---|---|---|
| **moderation** | the speaker, in a **shared** space | the space and everyone in it | whoever holds that extent | yes — reason, log, appeal; the speaker is told |
| **attention** | **yourself** | your attention | you | no — private, silent, the speaker never knows |
| **privacy / reach** | others, **only toward you** | your person: who may address, find or see you | you | no reason needed; the sender meets a refusal, not a sanction |

**The test:** switch it off — whose experience changes? Only yours → attention. Their ability to
reach *you* → privacy. Their ability to reach *anyone else* → moderation.

- **Attention already has a home**: `notify` rules are *"your private lens over any group,
  owner-private"*; today they govern presence. `mute iffy on gossip, for me` widens them to
  expression — not a new system.
- **Privacy's home** is the privacy slate plus the comms slate's stranger → acquaintance → trusted
  reach gradient.
- This slate builds **moderation** and touches the other two only where § 11 says.

## 3. ⭐⭐⭐ Every expression lands somewhere; every somewhere sits in an extent **[DECIDED]**

Say, shout, emote, chat, `tell`, a remote emote, a relayed line — each has a sender and a
**destination** (a channel, a place, a person). Destinations nest: channel ⊂ (later) channel domain ⊂
realm ⊂ platform; place ⊂ parcel ⊂ locality ⊂ realm. **A sanction sits at a node and blocks what
lands at or beneath it.** A channel owner's mute changes nothing outside the channel; a bar owner's
silence covers say, emote, and a remote emote aimed into the bar.

- ⭐⭐ **A sanction never reaches past its issuer's extent** — precisely, past the extent of the
  organization whose seat grants the power (§ 4).
- ⭐ **Escalation is the tree read upward.** *"We need some escalation path for if the offender just
  hops to another channel."* The record is keyed on the **offender**, not the channel, so the next
  channel's moderator sees the history at once; escalating hands the case to whoever holds the next
  node up. *"It might need to change over time"* — so escalation changes shape by **adding rungs**
  (a channel domain is a node inserted mid-tree), never mechanism.
- ⛔ **Automation may flag upward, never sanction upward.** *Muted in three channels in an hour*
  notifies the realm's moderators; it never bans realm-wide. A sanction comes only from someone
  whose extent covers it.

## 4. ⭐⭐⭐ Moderation is a DIMENSION of governance, not a second org chart **[DECIDED]**

*"We have a real model for governments and organizations with officers and subdivisions. I don't
want to just make another version of that for moderation; moderation is a dimension of all that
other shit that it needs to encapsulate."* (A per-node "steward" grant was proposed and **rejected**
as exactly that parallel structure.)

`employment.md`'s rule — *what a seat GRANTS is data on the seat* (`fulfills`, `purchases`) — takes
one more entry: **moderation powers are a grant a seat, position or group role carries, reaching
the extent its organization already holds.**

| who keeps order | existing carrier | reaches |
|---|---|---|
| the bar's bouncer | a position on the bar's Business | the bar — the Business holds its title |
| a town constable | a seat on the locality's Government | that locality |
| a channel or board moderator | a role in the Subject's group (`owner · admin · member`) | that Subject |
| **the realm's mod team at go-live** | a committee owned by an office the founder default holds — the owner | the realm |

Governance's doctrine already reads *law points at offices → offices own committees → committees
hold permissions → members appointed by whoever holds the owning seat*. *"One group of players with
mod privileges for everything"* is that shape at its smallest. ⭐ **Channel domains** later are nested
Subjects owned by some organization whose seats carry the grant — not a moderation feature.

⚠ **Topics route; extents empower.** Our topic classifiers are labels, not containment — nothing is
*inside* a topic — so stewarding one would be policing a subject matter wherever it appears.
A report tagged *politics* may be **routed** to whoever has the expertise; power comes only from
holding a node.

## 5. The grant set **[DECIDED]**

Split by severity, because one organization wants different seats to hold different powers (the
bouncer ejects, only the owner bars for good). *The extent says WHERE, the grant says HOW HARD.*

| grant | does |
|---|---|
| **delete** | removes a message |
| **mute** | silences the person at this node, for a duration |
| **eject** | plucks them out of the space now (§ 9) |
| **ban** | bars them, for a duration or for good, at a **target level** (§ 8) |

The ban's target level is a second dimension of its grant (character · account · network). ⭐ **Mod
tiers come later** — *"one good mod is all I really need at my scale and I'll probably do the job
myself mostly in the beginning. But I still need all the same tools."* At go-live one seat holds
every grant.

⚠ **`eject`, not `remove`** — `remove` is the shipped inventory verb (take off a worn thing); the
common word wins.

## 6. ⭐⭐ Targeting anyone, instantly **[DECIDED]**

*"Even if you're a ban hammer you need to be able to target any potential abuser in the game, even
someone you've never met … bans need to be quick and immediate, not something you wanna wait around
on or read a page of documentation to do."* Our naming is perception-bound and MQL has no
realm-wide person seed, so a moderator gets three ways in:

1. **The line.** Every frame you received carries its speaker — *act on whoever said that*, no
   name needed. Eventually a click on the line.
2. **The report.** It carries whom it is about.
3. **Meta identity.** Account, handle, linked Twitch name — resolved realm-wide.

How that resolution is spelled (MQL or something bespoke) is open; the rules are not:

- **Your extent bounds whom you can resolve** — a channel mod reaches anyone who has been in the
  channel, a realm mod anyone in the realm. The same rule as the sanction.
- ⛔ **It never reaches the character.** Resolving someone as a moderator must not make your
  character recognize them — A15's evidence firewall, applied inside the moderator's own head.
- ⭐ **Act now, cite after.** The mute lands immediately; the rule citation may follow within a short
  window, and an action left uncited shows as *uncited* in the log.

## 7. ⭐⭐ Time **[DECIDED]**

- **Mutes and bans run on real time.** Game time is irrelevant to a banned person, is not monotonic
  (A16), and runs at varying paces; a sentence must mean the same thing to the person serving it and
  to the public log.
- **Every sanction carries a duration** (`10m`, `7d`, `permanent`) and **ends on its own** — active
  iff *now < until*, derived on read; nothing is scheduled to lift it.
- **Lifting, extending or shortening is a new record entry, never an edit.** The log shows the
  original sentence and every change, with who made it.
- **Prison is the exception — served by presence** (§ 16).

## 8. ⭐⭐⭐ Ban targets — chosen by what the ban costs the offender **[DECIDED]**

The owner: *"Player-level bans only hurt when you're trying to access an experience that can only be
held by that player. If it's a new user just spamming gossip channel, anyone can do that, so a
player-level ban has no long-term impact — you have to ban the user, and maybe even their IP if they
start to get tricky with Google/Twitch/Kick auth."*

| target | costs them | right when |
|---|---|---|
| **character** | the experience only that character holds | an invested character |
| **account** (every character on it) | their identity in the game | a throwaway — *"most of the bans I'm gonna want in the beginning"* |
| **network** | coming back on a new sign-in | they rotate Google / Twitch / Kick auth |

- **One `ban` verb, the target an option** (`--character` · `--account` · `--network`; spelling is
  the plan's). **The light touch is POLICY, not mechanism** — the mod handbook says *pick the lowest
  level that costs them something*. The engine shows the evidence at the moment of banning
  (*character 40 min old · account 40 min old*); it never chooses.
- ⭐ **A character ban is a stand-in.** *"Character bans I would hope eventually get replaced with
  imprisonment when prisons exist. Preventing the character from logging in should still be a tool
  in the kit but it's not really how I want to treat punitive measures at that level."*
- **A sanction binds the account and every character on it** — switching bodies escapes nothing.

### 8a. The network ban **[DECIDED]**

IP bans are a **moderator tool** (*"I wanna make sure IP bans are available to moderators"*), shaped
against collateral damage — shared addresses, mobile carriers, VPNs and ⚠ **campuses**, on an
education platform whose players include students:

- **It blocks NEW accounts from that network**, never existing accounts in good standing. The
  evader cannot mint a fresh account; the classmate already playing from the same campus is
  untouched.
- **Time-limited by default** (days); permanent is a deliberate choice. Addresses get reassigned.
- ⛔ **The moderator never sees the address.** The tool is *ban this account's network*; it acts on
  the address without displaying it. Power without a privacy leak, and nobody holds a list of IPs.

### 8b. New accounts are not crippled **[DECIDED]**

*"I don't want to cripple new accounts unless we really have to."* Full reach from the first
minute. Narrowed reach for newcomers exists **only as the raid dial** (Twitch's shield mode): an
operator-switched tightening during a raid, off by default. Its exact shape is open (§ 20).

## 9. Removal and re-entry: where the body goes **[DECIDED]**

- ⭐⭐ **One re-entry ladder, for login and for eject** **[the owner — agreed 11-07]**. *"Sometimes you
  simply can't log back into where you signed out from due to some state change … generally I
  always fall back to the lounge but maybe there's a better, less extreme option."* The first rung
  that **admits you now** wins: where you were → **that place's declared fallback** (a ship at sea →
  its deck or home berth · a mine working → the pithead · a rented room → the lobby; undeclared, the
  default is **step outward** along the place tree) → your home → **the lounge, as last resort only**.
  Today the login fallback jumps straight to the lounge ([connection.md](../../subsystems/connection.md));
  this ladder is general and outlives moderation. Custody pins it inside the walls
  ([prison-slate](./prison-slate.md) § 7d).
- **Ejected from a place** → the same ladder from that place: the bouncer puts you on the street, not
  in the lounge. (Revises the first cut, *"back to the lounge."*) They may walk back unless also
  banned there.
- **Banned from a place** → *a place you cannot enter*, the inverse of the prison's *a place you
  cannot leave*; for the ban's duration, over that node and below.
- **Plucked from the realm** → staging's **recall** (identity, not location): the body goes
  offstage and the session ends.

## 10. ⭐⭐ The relay, and the people who never signed in **[DECIDED]**

| direction | what happens |
|---|---|
| Twitch ban → their lines into the game | automatic by nature — Twitch stops them, nothing to relay. ⭐ **Retract lines already relayed** when Twitch deletes them (Twitch emits ban and message-delete events) |
| Twitch ban → the person in the game | linked accounts only, and only within the owner's extent — the stream's relay channel, not the realm |
| game sanction → `tune` posts | free: `tune` is speech, so a game mute blocks it; a Twitch ban blocks it too (they post as themselves) |
| game sanction → Twitch ban | ⭐ **one-click "also on Twitch"** **[DECIDED]**, offered only to a mod who holds the owner's Twitch extent (is one of the owner's Twitch mods) — the click is where that is checked, and the owner's Twitch mod log names who made the call |
| YouTube | the API has bans and deletes but our integration is read-only → manual in YouTube Studio |
| Kick | ⚠ **unverified** whether its webhooks carry moderation events → manual until checked |

**Unlinked external chatters: *"whatever they can."*** A sanction attaches to the **external
identity** (their platform user id), scoped to the game-side relay channel, in the same record and
public log. ⭐ The owner: *"sometimes we can mint ghost accounts for these people even if they've
never signed in."* A ghost is a minted identity backed by a record, not a body — nowhere to stand.
When they link, they claim the ghost and everything on it. ⛔ **Linking never launders a sanction.**
⛔ **A ghost is never a citizen** — the Compact stays players-only by arithmetic
([identity.md](../../subsystems/identity.md)).

## 11. DMs and group DMs **[DECIDED]**

- **1:1 DMs have no moderation** — no shared space. Only **ignore** (attention: their messages vanish
  for you, silently) and **block** (privacy: refused, worded the same as *not accepting strangers*, so
  a harasser cannot confirm the block).
- **Moderation enters a DM only by report**, and then the realm is not moderating the DM — it is
  judging conduct toward a person, which a realm sanction can reach. ⭐ **A report is consent to
  disclose** the messages attached; moderators cannot read DMs otherwise. That is the one real
  overlap between moderation and privacy: evidence.
- **Group DMs: everybody holds it** **[the owner]** — *"if someone needs access control that's what
  chat is for. Using group DMs is sort of egalitarian by nature."* Everyone may invite, rename and
  leave; **nobody can remove anybody** (removal needs authority over a peer). The exits are leave and
  **fork** (a new group DM without them); personal mute and report still apply. ⚠ A block survives
  an invite: being added to a group addresses you, so adding someone you blocked refuses or warns.

## 12. ⭐⭐ The record and the public log **[DECIDED — option 2]**

Every action goes into one append-only record (A2) — the cooperative slate's archive, *"a
tamper-proof mod log."*

- **The offender sees their own entries**: what, which rule, which seat, how long, how to appeal.
- **Moderators see history within their extent** — what makes a channel-hopper visible.
- **A public log of actions without offender names** — *"seat X muted someone in #gossip under
  rule 4 for 10 minutes."* It holds the **seats** to account, not the offenders; hidden discretion
  is where *"mods protect their friends"* comes from, and naming offenders would add a punishment no
  rule handed down. (Mod-only like Twitch, and fully public with names, were the alternatives.)
- **Seats are named, not people** — governance's *offices are heads*.
- ⛔ **The record never feeds the fiction** (A15). No character learns from the mod log.

## 13. Reports **[DECIDED]**

- `report <who or that line> [rule] [note]` — works on a received line, like § 6.
- **It attaches only what the reporter was delivered**, from their own frame store — consent (§ 11).
- **It routes to the narrowest seat whose extent covers where it happened**; unhandled within a
  window it **flags upward** (§ 3, never a sanction).
- **The reported person never learns who reported.** **Report abuse is itself conduct** (rule 6).
- **The reporter gets nothing back for now** **[the owner — option 1]** — *"maybe the moderator that
  picks up the thing can get prompted whether they wanna send a response."* Outcome-category and
  full-outcome replies were the alternatives; revisit later.
- Discord, Twitch and YouTube keep their own report buttons and their own moderators; we do not
  pretend to unify them.

## 14. Appeals **[DECIDED]**

- **At the operator end of the dial, appeals go to the operator — labeled honestly** (*"reviewed by
  the operator"*). The judiciary takes it over when the chambers exist, as the cooperative slate's
  on-ramp says: *"the judiciary enters as ban appeals."*
- ⛔ **A moderator never hears an appeal of their own action** — if the operator made the call, the
  appeal waits for a second person or the court.
- **An appeal may challenge the remedy as well as the verdict** (§ 16a) — the public log is what
  makes disparity visible.

## 14a. ⭐⭐⭐ Holds and sentences — the executive acts, the court decides **[DECIDED 2026-11-10 — the owner, except where marked]**

The owner: *"these mod committees … are they an arm of the executive or the judiciary? initially
I'd say executive and they're basically law enforcement … but the fact that some kind of sentence
is immediately imposed makes me feel like they're judiciary and maybe our model for the courts is
lacking."*

**The answer: the mod committee is the executive, and its instant act is never the sentence.**

- **The Compact already places it.** An enforcement institution is chartered by the legislature
  and reviewable by the judiciary (Art. V §5); human enforcement is for judgment calls code cannot
  make, and is *"bounded, recorded, recusal-gated, and subject to review"* (Art. V §7). The
  judiciary is one process at every scale (Art. VI), and removing something is a deprivation that
  demands more process, not less (Art. VI §7).
- **What felt judicial is administrative adjudication.** Agencies impose penalties in-house and
  courts review them (traffic tickets, license suspensions); *SEC v. Jarkesy* (2024) drew the US
  line at penalties that resemble traditional punishment, which need a jury. A referee shows a red
  card instantly; a disciplinary body decides the suspension. Same line here.
- **A HOLD is executive.** Delete, mute, eject, a temporary ban: it stops the harm and decides
  nothing final. It acts first and is cited after (§ 6), and it is **the lightest measure that
  stops the harm** (bail's rule): mute them where they caused trouble rather than ban them
  realm-wide.
- **A SENTENCE is judicial.** A lasting deprivation needs a **case** (Art. VI) that the moderator
  brings. **[LEAN]** The line: anything over a day, or anything touching the account, the network,
  possessions or the franchise. Prison (§ 16) is always a sentence.
- ⭐ **Habeas corpus as a rule: holds expire.** A hold over the line stands **until the next court
  day** (below), with a **two-week backstop** **[LEAN]**; past it the hold lapses unless the case is
  heard. Nobody sits under an executive sanction indefinitely without a court.
- **The court has no enforcers of its own.** As the US Marshals carry out court orders, the mod
  committee carries out a verdict: the hold becomes the sentence.
- **Pleas.** The moderator files the case with a proposed sentence; the accused may accept it on the
  spot and be done. Only contested cases go to court day. A no-show is judged on the record
  (Art. VI §1).
- **Panels scale with severity** **[LEAN]**: one judge for a ban appeal, a sortition for a permanent
  ban or prison. Art. VI's two faces (verification by a competence pool, spirit by citizens) are the
  "different kinds of courts."
- **Why it holds up:** speed deters more than severity (certainty and swiftness, since Beccaria), so
  holds carry deterrence and sentences can afford to be slow; separating the arresting officer from
  the judge is the cheapest check on *"mods protect their friends"*; review disciplines the
  moderator, and each seat's **reversal rate** belongs in the public log (§ 12, which already names
  seats).

### Court day — the weekly stream **[DECIDED — the owner]**

The owner: *"I plan to livestream every week so I'd probably deal with my 'caseload' then and let
the audience weigh in. we'd need to be able to hold people at least that long."*

- **Contested cases are heard on the weekly stream.** The operator is the judge, a pool of one
  (Art. VI §3); **the audience is an advisory jury** (US civil procedure's advisory jury: the judge
  may seat one and still decide alone), its vote recorded as advice. When due process is ratified
  (Art. VI §5) the vote binds and the pool becomes a sortition: the stream format survives
  unchanged.
- ⭐ **Always public.** The owner: *"always public, how many layers of anonymity do we really
  need."* A contested hearing names the accused's **character or handle, never the real person**
  (conduct rule 4). Open court is the classic check on the judge, and making a contest public is
  part of what it costs. Holds and pleas stay in the unnamed public log (§ 12); contesting is the
  choice that puts a person on the stand.
- **Channel moderators later are the same shape one level down:** each organization's enforcers are
  its executive (§ 4); the realm keeps **one** judiciary.

**Where it starts:** one mod committee and the operator as a pool of one, but with the shape in
place from day one: every action classed as a hold or a sentence, holds that expire, anything past
the line recorded as a case labeled *"reviewed by the operator."* Growing means widening the jury
pool and adding courts, never rebuilding.

## 15. ⭐⭐⭐ The conduct code — one text, every place we gather **[DECIDED]**

*"We need [a written code] for sure … it needs to be uniform across our socials, Twitch, Discord,
YouTube, everything. This game is going to attract people that follow politics, so there's a
heightened risk of a lot of bad shit that can fester in those communities."*

- **Same text, same numbers everywhere**, so *rule 2* means one thing in Twitch chat and in the game.
- **Provisional, signed by the operator, amendable by the Compact** once the chambers exist.
- **Canonical in the in-game Compact document tree**; mirrored to panterasbox.com, Discord's rules
  screen, Twitch's chat rules, and the YouTube channel description. The mirrors follow the source.
- ⭐ **Rule numbers are never reused**, so an old log entry always points at the rule it cited.
- ⭐⭐ **No misinformation rule** **[DECIDED]**. On a governance platform, a seat ruling on what is
  true is exactly what the argument map exists to prevent: a false claim is answered by an objection
  that stays open, not removed. The cost — some ugly claims stand until answered — is accepted.

### Draft v0

> **Saxonberg Conduct Code** — provisional · v0 · set by the operator, amendable by the Compact
>
> *This code applies everywhere Saxonberg gathers: the game, Discord, Twitch and YouTube. The rules
> and their numbers are the same in every place.*
>
> **Argue about anything.** This is a game about governing, and disagreement is the point. These
> rules cover how you treat people, not what you believe.
>
> 1. **Go after ideas, not people.** No slurs, and no attacking anyone for their race, ethnicity,
>    religion, gender, sexuality, disability or nationality. A space may allow quoted media if it
>    says so.
> 2. **No harassment.** Don't single out someone who doesn't want your attention — repeated
>    messages, following them around, dogpiling, or using the game's mechanics to target them.
> 3. **No raids or brigading.** Don't bring a crowd to swamp a channel, a vote or a person, here or
>    elsewhere, and don't organize one here.
> 4. **Keep real lives out of it.** No doxxing — real names, addresses, workplaces, photos or private
>    accounts, for anyone. Criticizing public figures is fine; their private details are not. No
>    threats of violence against anyone.
> 5. **No hate movements or violent extremism.** No recruiting, promoting or symbols. Holding
>    political views is fine; organizing harm is not.
> 6. **No spam, scams, flooding or ban evasion.** An alt used to dodge a sanction extends it.
> 7. **Nothing illegal, and no sexual content involving minors, ever.** The legal floor; not
>    amendable.
>
> **What this code does not cover:** crime inside the fiction. Muggings, theft, burglary and fights
> between characters outside the lounge are a matter for that place's law in the game, or for
> nobody. The world is dangerous by design. Being disagreed with, even loudly, is not harassment.
>
> **How it's enforced:** moderators act immediately and cite a rule number. If you're sanctioned
> you'll see what was done, why, by which seat, for how long, and how to appeal. Every action goes
> into a public log without your name on it.

Rules 3 and 5 exist because of the political audience.

## 16. ⭐⭐⭐ Prison and rehabilitation — a remedy, not a penalty for a crime type **[DECIDED]**

> ⚠⚠ **REVERSAL of [prison-slate](./prison-slate.md)'s guardrail** (*"real-conduct moderation
> never gets a diegetic costume — a harasser does not go to a fictional gaol"*). The owner: *"I don't
> think prison has anything to do with the crime. It has to do with our ability to rehabilitate and
> whether the investment is worth it for the character we're talking about. Not all prisoners are
> treated equal here."* Mortal-vessel Thesis 4 (moderation as capability state, with a designed path
> out) is the half that survives. ⭐ **The place itself — the two facilities, the confinement ladder,
> the two systems, the state pen, the conversions — is [prison-slate](./prison-slate.md), rewritten
> 2026-11-07.**

### 16a. ⭐⭐ The remedy criterion is the player's investment, never their power **[DECIDED]**

Two-tier justice is the risk — regulars rehabilitated, newcomers banned, for the same act. So:

- **Evidence that counts:** the character's age and play; the account's record (prior sanctions,
  probation kept); pattern vs one-off.
- ⛔ **Excluded by name: standing, wealth, office.** Being powerful buys nothing here.
- **A person judges; the engine lays out the evidence.** The remedy (eject · ban · prison) and its
  stated reason go in the record, so whom a seat rehabilitates and whom it bans is visible over time.

### 16b. ⭐⭐ Doing time — served by presence, on the game clock **[DECIDED]**

*"Logging your character, sitting in prison and doing only things that are allowed in prison until
your sentence is served. And the only way to serve is to actually run game-clock hours … the idea is
to make prison actually feel like something."* Time served counts **only while present**, in game
hours; mutes and bans stay real-time (§ 7). ⚠ Because game time is not monotonic (A16), served time
accumulates **forward ticks only** — it never goes down.

### 16c. ⭐⭐ Rehabilitation is meant literally **[DECIDED — content open]**

*"When I say rehabilitate I mean it … some prison content we can create that actually takes some of
these people that were acting up on chat and teaches them their lesson through all the pedagogy we
have at our disposal about rehabilitative justice. Maybe the pure griefers no, but a lot of the
people that get banned just have sharp personalities that need to be smoothed out a little for
public consumption."* Lens 1 (pedagogy), with 3b (participation). Two constraints:

- ⛔ **Teach a Discipline, never grade a disposition.** [measurement.md](../../measurement.md) Part 6
  forbids a gauge on a declared standard. Release cannot hang on *seems nicer now*; it can rest on a
  measured competence — de-escalation, steelmanning an objection on the argument map, the Compact's
  political-science course — through the [assessment slate](./assessment-slate.md)'s machinery.
- **It must be worth doing.** Busywork (*write lines*) is a humiliation ritual — the costume the old
  guardrail feared. The test: would a free player choose the course?

First prison question: can demonstrated competence earn early release (parole)?

### 16d. ⭐⭐ The franchise **[DECIDED]**

*"The bigger question is if they're disenfranchised while in prison, because that can actually
affect the rules for everyone, not just them."*

- **Left alone by default.** Prison takes the body's freedom and whatever standing depends on it, by
  arithmetic: participation measures a human showing up, so a present prisoner keeps it; labor
  standing is earned by making, so a long sentence lowers it; held conviction keeps ramping; capital
  and consumer stocks are untouched.
- **Certain prisons or sentences may carry disenfranchisement as a punishment** — *"the Compact
  would have to rule on that."*
- ⛔ **The guard (uncontested, entrenched above simple majority): nothing an appeal cannot fully
  undo may be done before judgment.** *Act now, appeal after* works for a mute — the appeal restores
  the voice. It cannot work for a vote: a measure passed while someone was wrongly disenfranchised
  stays passed in an append-only record. So any sanction touching the franchise is **adjudicated**,
  never a seat's instant act — and a majority is exactly who would otherwise jail a minority before
  a vote. (Lens 7: the criterion is irreversibility, the appeal is the court, the tier is above
  majority.)

## 17. ⭐⭐ Possessions — restitution and the hock **[DECIDED]**

- **Restitution, for harassment.** Goods taken by using the mechanics to target a person (rule 2)
  can be given back; otherwise the harasser keeps the proceeds of exactly what the code bans.
  Ordinary theft stays the fiction's business. Who took what is already in chattel's chain of title.
- **The hock** **[the owner]** — *"a persistent stash somewhere we can put players' things in hock,
  same sort of deal as a future evidence room at police HQ."* A **place**, held by the moderation
  seat and persisted like any owned place — the **first instance of the impound yard**
  ([sanitation-slate](../trades/sanitation-slate.md)'s `collect` + yard; [auction-slate](./auction-slate.md)'s
  impound → auction → salvage). One mechanism, three institutions: moderation's hock, then the
  police evidence room, then sanitation's yard.
- **Custody moves; title never does** (A5) — what makes return honest.
- **Three holds:** restitution (until the owner can receive it) · during a sanction (returned at
  release) · evidence (later, until the case closes).
- **How long: the owner's estate clock** **[DECIDED]** — no new timer. Active or dormant → held;
  escheated → passes with the estate, into impound → auction; no determinable owner → the locality's
  abandonment rule, then auction. The restitution goods are the **victim's**, and a victim must not
  lose them on a shorter clock than governs everything else they own.
- **Purge means auction, never deletion.** Only contraband is destroyed, and the destruction is
  recorded.

## 18. ⭐⭐ The altitude of every answer

| altitude | who decides | what |
|---|---|---|
| **invariant** (nobody amends) | the platform | the legal floor (rule 7) · a sanction never past its issuer's extent · the record append-only · every sanction cites a rule · nothing irreversible before judgment |
| **grain** (a default the Compact may change) | what we ship | moderation works **from reports** — only what a witness perceived counts · public channels discourage slurs, a space may declare looser norms · the franchise untouched by prison · the light-touch handbook |
| **title** (the Compact's) | the Compact | what harassment is · the word list · the penalties · whether unwitnessed speech is anyone's business · which sentences disenfranchise · the conduct code's later amendments |

## 19. ⭐⭐⭐ The go-live list

What must exist before the owner invites the stream in:

1. **One office + its committee holding the realm** — the founder default holds the office.
2. **The four grants** — delete · mute · eject · ban, the ban at all three target levels including
   the network ban of § 8a.
3. **Targeting by line, report and meta identity** (§ 6), act-now-cite-after.
4. **Durations that end themselves**; lift / extend as new entries (§ 7).
5. **The record**, the offender's notice, and the **unnamed public log** (§ 12).
6. **`report`** (§ 13) and the operator appeal path (§ 14).
7. **Personal mute and block** (§ 2, § 11) — `notify` widened to expression; block on `tell` and
   remote emotes.
8. **The relay**: retract on Twitch deletion; one-click *also on Twitch*; sanctions on external
   identities (§ 10).
9. **The conduct code** published canonically and mirrored (§ 15).

**Not needed for go-live:** prisons and rehabilitation content (§ 16), the hock (§ 17 — nothing to
restitute until there is griefing to undo), channel domains, mod tiers, the raid dial, ghost
accounts (a sanction on an external id suffices first).

## 20. Open

- **The raid dial** — what it narrows, who flips it, whether it auto-expires.
- **What the mod queue shows** — reports, flags from below, active sanctions in the extent.
- **Mod tiers** — which grants a junior seat gets; ⭐ the grant set + target levels already express
  it, so this is policy.
- **Channel domains** — nested Subjects; which organization owns them.
- **Targeting's spelling** — MQL or bespoke.
- **Kick's moderation events** — verify before promising automation.
- **Dose's licensing** (deferred from controller-liquidity, 2026-11-11) — `dose` treats
  *competent in medicine* as *licensed*, which judges a PERSON: lens 7 wants the criterion,
  the appeal and the entrenchment tier named. Today it is a Competence band and nothing else.
- **Rehabilitation** — its own conversation ([prison-slate](./prison-slate.md) § 12). The prison
  conversation itself is done (prison-slate, rewritten 11-07).
- ⭐ (2026-11-18, § 23) **The reserved list** — written (the test, the list, three layers); left:
  may the Compact remove items from its own layer, or only add them?
- **Local court service and Compact standing** — only for rulings that survive appeal? (§ 23)
- **The one-to-one DM's default jurisdiction** — the narrowest extent covering both parties (§ 23).

## 21. Reuse ledger (review question R2)

| need | already doing the job | what this slate adds |
|---|---|---|
| who may moderate | Office → committee → permission ([governance.md](../../subsystems/governance.md)); grants on seats ([employment.md](../../subsystems/employment.md)); group roles ([grouping.md](../../subsystems/grouping.md)) | the moderation grant set |
| how far | extents + `heldExtents` ([access.md](../../subsystems/access.md)); parcel title; `Subject.owner` | sanctions bounded by them |
| mute here, not the group | chat-slate's per-channel override layer | — (the shape it names) |
| a gag that wins | access-slate's deny-wins `can()` + one audit stream | — |
| tight emote-only | emotes-slate's typed slots + strict mode | — (a later tool, not go-live) |
| personal mute | `notify` ([social-graph.md](../../subsystems/social-graph.md)) | widened from presence to expression |
| stranger reach | comms-slate's trust gradient | the raid dial rides it |
| evidence | the frame store ([record-layer.md](../../subsystems/record-layer.md)) | reports attach from it |
| pluck from the realm | staging's recall | — |
| hock lifetime | the estate clock ([credit.md](../../subsystems/credit.md)) | — |
| hock itself | sanitation's impound yard (designed) | its first instance |
| return | chain of title ([chattel.md](../../subsystems/chattel.md)) | — |
| external identities | the relay's speaker bridge ([streaming.md](../../subsystems/streaming.md)) | sanctions on them; ghosts |
| a place you cannot leave | prison-slate's `PrisonMixin` | its inverse for a place ban |

**Genuinely new:** the sanction (a capability state on the offender, attached to a node, with a
duration) · its record and public log · the grant vocabulary · the network ban · `report` · the
conduct code.

## 22. Lens pass

1. **Pedagogy** — rehabilitation teaches a Discipline (§ 16c); the conduct code is the first screen's
   civics.
2. **Creative expression** — a community keeps the moderation it already has (one mod, the owner)
   and grows into rungs; a venue staffs its door without handing over its deed.
3. **3a immersion** — crime in the fiction stays the fiction's; ⚠ the prison reversal moves conduct
   into a diegetic space, so its presentation (§ 20) is where immersion is decided. **3b
   participation** — newcomers are not crippled (§ 8b); doing time is presence.
4. **Values** — no misinformation rule; investment not power (§ 16a); the moderator never sees IPs.
5. **Continuity** — the same `mute`/`ban`/`report` answer in every epoch; nothing here is
   epoch-bound.
6. **Economy** — goods in hock return to the market by auction, never vanish.
7. **Governance** — every judgment names its criterion (the cited rule; investment), its appeal (the
   operator, then the court), and its tier (§ 18); franchise only by adjudication (§ 16d).

## 23. ⭐⭐⭐ The conduct track meets the courts — and jurisdiction is local (2026-11-18)

Talked through with the owner, out of the person docket
([separation-of-powers-slate](./separation-of-powers-slate.md) § 7o), whose conduct track had to meet
this slate.

### What the person docket got wrong

- **Evidence.** § 7o said conduct cases *"may use everything, the engine's logs included."* Too strong.
  Harm to a person requires **delivery**, and § 13 already holds the rule: a report attaches only what
  the reporter was delivered, and filing it is consent to disclose. **Conduct evidence is what was
  delivered to someone, disclosed by them, plus the platform's logs of the accused's acts against the
  platform** (cheating, exploits, botting), where no person's consent is needed — **never undelivered
  speech, never a private conversation nobody reported.** *Everything* would have made the conduct
  track a surveillance system.
- **The fiction.** § 7o said conduct cases *"never appear in the fiction."* Half right, given § 16's
  reversal: **the case** is out of fiction (heard on the stream, naming the character or handle, never
  the real person); **the remedy** may be in it (prison is a place); **the record** never feeds it
  (§ 12, A15).

### Where they already agree

| question | person docket | this slate |
|---|---|---|
| interim vs final | an interim rule per tool | **holds** (executive) vs **sentences** (judicial) — § 14a |
| the jury | lay, by lot | court day — the operator as judge, the audience an advisory jury, binding sortition once due process is ratified: the same design at another dial setting |
| standing | never a penalty | changes only by arithmetic; disenfranchisement possible as a *sentence* — a right taken, not a measure falsified (§ 16d) |
| records | conduct follows the account | the network ban; the public log names seats, never offenders (§ 12) |

### What this slate does better — spread to the whole person docket

- ⭐ **Holds expire everywhere** — every person-judging tool's interim rule carries an expiry, the
  in-fiction ones included (§ 14a's habeas rule), rather than an unruled case escalating.
- ⭐ **Nothing an appeal cannot fully undo happens before judgment** (§ 16d's guard) — the test for the
  whole person docket, not only the franchise.

### Remedy by investment, within a closed list

The person docket's sentences are a closed list in law; this slate's remedy is chosen by investment
(§ 16a). They compose: **the list bounds what is possible; investment chooses within it**, with
standing, wealth and office excluded by name, and the stated reason on the record.

### Griefing — the same events on both tracks

Mugging a character is fiction; mugging the same player's character every time they log in, after
they asked you to stop, is harassment of the person behind it. **An in-fiction case and a conduct case
may run on the same events** — the first on what someone could know, the second on the delivered
record and **the pattern** (offender × target, § 1a: judged by a person, never classified). The clerk
may route a case to conduct; **the routing is appealable.**

### The conduct judge's workspace

The case card (separation-of-powers § 7m) is built for code. A conduct case shows: **the delivered
lines in order, each marked with who disclosed it** · the offender × target pattern · the prior record
· the investment evidence that chooses the remedy (character age, play, probation kept) — standing,
wealth and office excluded by name.

### ⭐⭐⭐ Jurisdiction follows the extent where the harm landed **[DECIDED — the owner]**

The owner: *"There's certainly conduct whose misalignment reaches across boundaries and is just
globally bad. But most everything a player can do in this game has a limited reach — that's by design.
So most moderation can be thought of in terms of its locality. The city of Terminus is an obvious
extent that has its own interests when it comes to the adjudication of its laws. But so does a guild
over its assets. Or even an interest with no physical assets at all, just an information domain, like
whoever owns the gossip channel or Twitch chat or any other 'jurisdiction' within our information
space."*

| extent | held by | its interest |
|---|---|---|
| the city of Terminus | its committee | its laws, its streets |
| a guild | the guild | its assets, its hall, its members' conduct in its name |
| the gossip channel | its owner | its tone, its house rules |
| a Twitch chat | the streamer's committee | its audience |
| a private parcel | the owner | their home |

- **Each moderates — and, if it chooses, judges — what lands inside it** (§ 3's tree, now carrying
  courts as well as holds).
- ⭐ **What it may impose is bounded by its reach.** The gossip channel's strongest sentence is a ban
  from the gossip channel; Terminus may jail in Terminus; only the root may network-ban. § 3's *a
  sanction never reaches past its issuer's extent*, applied to sentences.
- **Appeal goes up the tree** to the next court that covers it, and ultimately the Compact.
- ⛔ **Retracted:** *conduct sentences belong only to the Compact's court* (proposed in the
  conversation, never written down).

### Globally bad conduct — two ways

1. ⭐ **Harm that spreads goes to the lowest common holder** **[DECIDED — lens 1]** — the narrowest
   extent covering every place it landed: two channels under one realm go to the realm; two realms go
   to the Compact. Computed, so anyone can predict the venue. *One level higher* would be arbitrary;
   spreading raises **the sentence** (a pattern is graver than an act), not the venue.
2. **A reserved list always goes to the root**, wherever it lands — *the reserved list* below: the
   test, the matters, and three layers of entrenchment.

**Local rules add to the conduct code (§ 15), never subtract** **[DECIDED — lens 7, Tier A]**: a
channel may forbid swearing; it may not permit doxxing.

### ⭐⭐ Paths for every jurisdiction — and discoverability **[DECIDED — lens 2]**

The owner: *"This is where your idea that everything gets a path extent actually might pay dividends.
Giving everything some kind of representation in the content or document trees gives everything a
path, which might make things a little more discoverable."*

- **The moderation tree and the committee tree become one tree.** § 3's nesting (channel ⊂ realm;
  place ⊂ parcel ⊂ locality) is path prefixes; escalation is the longest-prefix lookup read upward —
  the machinery access already runs ([separation-of-powers-slate](./separation-of-powers-slate.md)
  § 7l).
- **The lowest common holder is the longest shared prefix** of the paths where harm landed.
- ⚠ **Information spaces need representation.** Chat channels today are stored by name in their own
  collection, with no path. **Each channel, forum board, Twitch chat or other external space gets a
  document at a path** that stands for it and holds its house rules — a new kind of space needs no
  code. External spaces especially: a Twitch chat has no existence in our world until something stands
  for it.
- ⭐ **The discoverability line.** Every place and channel card answers *who moderates here · the rules
  here · where appeals go*: *moderated by the Gossip committee · house rules · appeals: Terminus → the
  Compact*. `committee show` answers it anywhere. Out-of-fiction UI, like the record's ✓; a place in
  the fiction may also show its in-world authority (*the Terminus Watch keeps order here*) as content.
- **DMs stay as § 11 decided.** A one-to-one DM has no holder, so it is moderated only by report and
  falls to **the narrowest extent covering both parties**, usually the realm **[LEAN]**; a group DM is
  held by everyone in it.

### ⭐⭐⭐ The reserved list — what always goes to the root **[DECIDED in shape — the owner]**

**The test, so the list does not just grow: a matter is reserved when no local court can be trusted with
it.** Four ways that happens:

1. **The harm escapes the game** — it lands on a real person outside the world, where no boundary in the
   game contains it.
2. **The law requires central handling** — whoever hosts the server has duties no community can waive.
3. **It attacks the machinery** — it harms every extent at once by corrupting what they all stand on.
4. **The local court is the accused** — an extent cannot judge its own holders acting in that role.

**The list, by reason**

| reason | matters |
|---|---|
| **escapes the game** | credible threats of real-world violence · doxxing · stalking or harassment that follows a person off the platform · swatting and any attempt to send real authorities at someone · sextortion and coercion · real-money fraud (phishing for logins, payment scams, selling what does not exist) · impersonating a real person |
| **the law requires it** | sexual content involving minors, and grooming (a US host must report to NCMEC — no local discretion) · credible terrorism or mass-violence content · children under the host's minimum age (an account matter; COPPA in the US) · legal process: takedown notices, subpoenas, data-protection requests |
| **attacks the machinery** | ⭐ tampering with the record ([record-integrity-slate](../platform/record-integrity-slate.md)) · ⭐ fake accounts used to manipulate the Compact — alts voting, seconding or holding standing, corrupting every chamber's tally at once · hacking, and exploiting bugs in ways that damage the world for everyone (duplicating money, crashing the world) · botting and automation at scale · evading a root-level ban |

⭐ **"The local court is the accused" is a jurisdiction rule, not an item:** **a case goes to the lowest
holder that does not include the accused among its holders.** A gossip-channel moderator abusing their
seat goes to the realm, not the gossip channel; a Terminus official goes to the level above Terminus. It
reaches the root only when the accused holds power all the way up — the PM, the operator.

⭐ **Not every reserved matter is an offense.** **Self-harm and suicide risk** reach the root **as care,
not as a case**: the person is routed to resources quickly and privately, and nothing goes on a record
or before a court. The list is of *matters* the root handles, and some are not accusations.

**Three layers, entrenched differently**

| layer | examples | who may change it |
|---|---|---|
| **the host's floor** | reporting content involving minors, legal process, age rules | **nobody in the game** — the law of wherever the server runs; the host is a separate actor with its own floor |
| **the machinery** | record tampering, fake-account manipulation, root-ban evasion, exploits | **Tier A** — it protects the system every other rule depends on |
| **the Compact's list** | threats, doxxing, off-platform stalking, fraud, impersonation | **the Compact**, at its highest amendment bar; it may add — whether it may remove is **[OPEN — the owner]** |

**Speed: some cannot wait for court day.** For a reserved matter: **an immediate hold** by the operator or
the root's seat — the strongest needed to stop the harm, logged; **referral outward** where the law
requires it, to real authorities; **the case afterward**, the hold still subject to expiry and appeal.

### Lens pass

1. **Pedagogy** — federalism, **subsidiarity** (decide at the lowest competent level), jurisdiction,
   venue, conflict of laws; the discoverability line teaches civics by being there. **Lens 1 chose the
   lowest common holder.**
2. **Expression** — any holder writes house rules over the floor, no code. **Lens 2 chose a document
   per information space.**
3. **3a Immersion** — local courts in or out of fiction by the flag; the discoverability line is
   out-of-fiction UI; the record never feeds the fiction. **3b Participation** — communities moderate in
   their own culture over a minimal floor (*soft limits — code never legislates culture*). Forum
   shopping is caught by the lowest common holder and the offender-keyed record; a hostile court is
   answered by appeal upward.
4. **Values** — the reserved list is the clearest values question here, and whether the Compact may
   remove items or only add them.
5. **Continuity** — ⭐ **a dissolved extent's open cases and records pass to its parent** **[DECIDED —
   lens 5]**: deleting a channel mid-case makes nothing disappear.
6. **Economy** — local courts cost their own extent. ⚠ Whether local court service earns Compact
   standing: lean, **only for rulings that survive the appeal window** — the clause's durability rule —
   or an extent could run a busy court to mint standing for its members.
7. **Governance** — jurisdiction is computed from where harm landed; ⭐ **a sentence beyond the
   extent's reach cannot be entered, enforced by code** **[DECIDED — lens 7]**; add-only local rules are
   Tier A; the lowest common holder's moderators already see the whole pattern within their extent;
   automation still only flags upward.

| question | answer | lens |
|---|---|---|
| conduct evidence | what was delivered, disclosed by report, plus logs of acts against the platform | owner (reconciliation) |
| holds | expire everywhere | owner (reconciliation) |
| before judgment | nothing an appeal cannot fully undo | owner (reconciliation) |
| griefing | both tracks on the same events; routing appealable | owner (reconciliation) |
| harm that spreads | the lowest common holder; spreading raises the sentence | 1 |
| information spaces | a document per space, at a path, holding its house rules | 2 |
| local courts | in or out of fiction by the flag | 3a |
| a dissolved extent | its open cases and records pass to its parent | 5 |
| a sentence beyond reach | cannot be entered; code-enforced | 7 |
| local rules | add to the floor, never subtract; Tier A | 7 |

## 24. ⭐⭐⭐ The public channels, and launch moderation (2026-11-18)

Talked through with the owner after § 23.

### Is there a gossip channel? No.

*Gossip* appears only as an example in `chat`'s help text. What shipped is three standing channels —
Help, Global and Chat — minted by the platform pack and owned by `pack:platform`. **Global and Chat are
retired** — the owner: *"I dunno what the global and chat channels even were, so nothing replaces them;
they're just gone"* (archived, as the pack reconcile does: rows and history kept, invisible).

### ⭐⭐⭐ The Compact owns only public forums **[DECIDED — lens 7]**

Public duties, private protections ([separation-of-powers-slate](./separation-of-powers-slate.md) § 7l),
applied to channels: **a channel the Compact owns is a public forum** — open records, due process, and
**no discrimination by viewpoint** (the US public-forum doctrine: a government space may regulate *how*
people speak, not *what they believe*). A privately held channel may curate. A gossip channel *wants*
to be curated — its character is its tone — so run by the government it would be state media, or a forum
unable to keep its tone.

| the Compact's | why |
|---|---|
| **Help** | a service — *nobody is ever stranded* is the Compact's promise |
| **the gazette** | its own announcements: enactments, notices, rulings (the Federal Register) |
| **the floor, and a Subject per bill on the floor** | deliberation — public forums by nature; a bill's Subject is archived when the bill is enacted or lapses |

⭐ **The Compact's channels are moderated content-neutrally** — *time, place and manner* (no flooding, no
spam, stay on topic), **never viewpoint**; holds under the conduct code still apply.

### One audience, one channel **[DECIDED — the owner]**

*"Every venue is its own channel — the `say` command. That's how you chat in a room. Why open up a
separate channel … don't give people two channels for the same thing."*

| audience | its channel | held by |
|---|---|---|
| **a room** | `say` — no separate channel | — |
| **an area bigger than a room** (a campus, a city node) | an **area channel** for whoever is present in the extent | the extent's committee |
| **a group** (guild, party, club) | the group's channel | the group |
| **the whole platform** | only what something platform-wide holds | the Compact, or an institution at Saxonberg |

The owner: *"we don't have 'global' anything except maybe the TPA. We just have the Compact, and
Saxonberg, the seat of government."* Channels are cheap and searchable; realistically they come from
**how a parcel holder carves its zones**, so chat reflects administration, and **locality nodes that want
unified comms**.

- **An area channel is administration, not physics** — membership derived on read from presence, as
  residency is: **one more provider behind the group facade** (*"our group facade would carry it fine
  probably"*). In the fiction it is **the town's aether node**, admitting whoever is within its bounds
  — the node's *policy*, not its range ([aether-devices-slate](../engine/aether-devices-slate.md)).
  Each is a document at the extent's path (§ 23).

### ⭐⭐ Reach is broadcast — real radio, never the aether **[DECIDED — lenses 1, 3a]**

The aether is everywhere by its postulate, so a channel that fades at the city limits *because of the
aether* would betray it: **reach comes from the transmitter**, by real radio physics. ⭐ **Moved 2026-11-18
to the [broadcasting-slate](../trades/broadcasting-slate.md)** — stations, receivers, propagation, spectrum
law, and broadcasting as a trade.

### ⭐⭐⭐ The Saxonberg paper runs the public square **[DECIDED — the owner]**

*"The 'public' channels probably should be all operated by the press in Saxonberg, whoever turns out to
run that on behalf of the population. It's its own estate … set up the stage and let someone perform."*
([saxonberg-city-slate](../world/saxonberg-city-slate.md) § 8a; designed in the [journalism-slate](./journalism-slate.md) § *the Saxonberg Post*.)

- **Laid out like a newspaper; every section is a Subject**, with its chat and its board — a starting
  layout for the content session: front page and news (read-only, its releases) · politics · business
  and markets · culture · society (the gossip page proper — the meta) · letters and opinion ·
  classifieds (fronting the `job` board, never duplicating it) · obituaries (characters die).
- **Its politics section is not a duplicate of the bill Subjects**: commentary and deliberation are
  different activities. The bill card links the paper's coverage; the paper links the bill.
- **Its moderators are positions on its staff** carrying the grant (§ 4); its house rules a published
  document at its path; its actions in the public log by seat (§ 12).
- ⭐ **A private holder of the main square is the Twitter problem**, answered without touching the press:
  the Compact's floor stays a content-neutral public forum; **no monopoly is granted** — anyone may found
  another paper; the conduct floor and the reserved list apply everywhere.

### ⭐⭐ Launch moderation — three teams, one shape **[DECIDED — the owner]**

| team | moderates | its rules |
|---|---|---|
| **the Saxonberg press** | the paper's sections | its house rules — curation, an editor's discretion |
| **the Compact** | Help, the gazette, the floor, the bill Subjects | content-neutral — time, place and manner |
| **the show** | the stream's chat, in game and on Twitch and YouTube | the show's house rules |

- ⭐ **The show's team is not a different kind of thing** — the owner: *"maybe I shouldn't be treating
  them as any different."* The stream is an information space like any other: a document at a path,
  held by the show's committee, moderated by its seats. Reaching into Twitch and YouTube controls is
  **tools those seats are granted** — external operations get paths too.
- **The same people may sit on more than one team at launch; each act is taken from one seat** and logged
  under it. Moderating the floor, a paper editor acts as the Compact's moderator, content-neutral; the
  public log naming seats makes it checkable. As the population grows, the teams separate.
- **Guilds and parcel committees staff their own.**
- ⚠ **Superseded in part 2026-11-20** ([separation-of-powers-slate § 7r](./separation-of-powers-slate.md)):
  the single *Compact* team splits — **the floor** (bill threads, the floor's forums and chat) under a
  **Sergeant at Arms** reporting to the legislature, and **the Constabulary** (reports with no local
  home, escalations, the reserved list) under a **High Constable** reporting to the executive; appeals go
  to the court, whose **Clerk of the Court** is elected by every citizen. The four top seats (with the
  Post's **Editor in Chief**) are incompatible.

## Cross-references

- [prison-slate](./prison-slate.md) — reversed guardrail; the prison conversation.
- [mortal-vessel-slate](../engine/mortal-vessel-slate.md) Thesis 4 — moderation as capability state.
- [cooperative-slate](./cooperative-slate.md) § *Moderation is the on-ramp* — the organs in
  moderation coats; rule-of-law moderation as a gift to the operator.
- [emotes-slate](../engine/emotes-slate.md) § Moderation · [comms-slate](../engine/comms-slate.md) § Moderation ·
  [chat-slate](../engine/chat-slate.md) · [access-slate](../platform/access-slate.md).
- [scoped-authoring-slate](../platform/scoped-authoring-slate.md) — `describe` is blocked on a
  moderation validator; this slate is that substrate's home.
- [privacy-slate](../platform/privacy-slate.md) · [assessment-slate](./assessment-slate.md) ·
  [sanitation-slate](../trades/sanitation-slate.md) · [auction-slate](./auction-slate.md) ·
  [staging-slate](../platform/staging-slate.md).
- [measurement.md](../../measurement.md) — Tier A (A2, A5, A15, A16); Part 6.
