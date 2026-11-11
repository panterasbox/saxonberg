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
> staging's recall ([staging](./staging-slate.md)).
> ⭐ **Holds and sentences (2026-11-10, § 14a):** mods are the executive and impose HOLDS; lasting
> deprivations are SENTENCES that need a case; holds last until the weekly court day (the stream,
> always public, the audience an advisory jury).
> **Left:** everything in § 19 (the go-live list) · the raid dial's shape · what the mod queue shows ·
> channel domains · mod tiers · rehabilitation's own conversation · the re-entry ladder (§ 9, general)
> · Kick's moderation events (unverified). [prison-slate](./prison-slate.md) — whose guardrail this
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
  reach past what a witness saw is the surveillance question ([privacy-slate](./privacy-slate.md)),
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
education platform heading for Study.com students:

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
  ([sanitation-slate](./sanitation-slate.md)'s `collect` + yard; [auction-slate](./auction-slate.md)'s
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
- **Rehabilitation** — its own conversation ([prison-slate](./prison-slate.md) § 12). The prison
  conversation itself is done (prison-slate, rewritten 11-07).

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

## Cross-references

- [prison-slate](./prison-slate.md) — reversed guardrail; the prison conversation.
- [mortal-vessel-slate](./mortal-vessel-slate.md) Thesis 4 — moderation as capability state.
- [cooperative-slate](./cooperative-slate.md) § *Moderation is the on-ramp* — the organs in
  moderation coats; rule-of-law moderation as a gift to the operator.
- [emotes-slate](./emotes-slate.md) § Moderation · [comms-slate](../tails/comms-slate.md) § Moderation ·
  [chat-slate](../tails/chat-slate.md) · [access-slate](../tails/access-slate.md).
- [scoped-authoring-slate](../tails/scoped-authoring-slate.md) — `describe` is blocked on a
  moderation validator; this slate is that substrate's home.
- [privacy-slate](./privacy-slate.md) · [assessment-slate](./assessment-slate.md) ·
  [sanitation-slate](./sanitation-slate.md) · [auction-slate](./auction-slate.md) ·
  [staging-slate](./staging-slate.md).
- [measurement.md](../../measurement.md) — Tier A (A2, A5, A15, A16); Part 6.
