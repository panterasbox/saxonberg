# Voting slate — bills, elections and polls as one kind of question

> **Status: UNBUILT — DESIGN CAPTURED 2026-11-20** from a design conversation with the owner, with
> a real election to design for: the first Speaker of the Capital House
> ([separation-of-powers-slate § 7q](./separation-of-powers-slate.md)).
> **Left:** the question substrate · elections (phases, secret ballots with receipt codes, the
> counting method as a bylaw, conflict-free certification) · polls (`poll` verb, heads or standing
> weight, the polls card, attribution by source) · live polls on the stream · sampled polls · the
> whip count · attention controls.
> **Size:** a build — kernel-led; first consumers the first election and the show's polls.

Related: [separation-of-powers-slate](./separation-of-powers-slate.md) (§ 7a the bill, § 7b the
secret-ballot list, § 7q the Speakers and the first election),
[draft-constitution](../../compact/governance/draft-constitution.md) (Art. I §4, Art. IV, Art. V §2,
Art. VII §2), [influence.md](../../subsystems/influence.md) (conviction),
[participation.md](../../subsystems/participation.md) (D6: standing shown as a band),
[streaming.md](../../subsystems/streaming.md) and [livestream.md](../../subsystems/livestream.md)
(the relay and the overlay), [uncertainty.md](../../uncertainty.md) (*what determinism cannot teach*),
[journalism-slate](./journalism-slate.md), [notification-slate](../client/notification-slate.md).

---

## 0. The ask

The owner: *"let's talk about what we need for elections since we have an actual real one to talk
about now. First we have to talk about what an election is because it's actually a specific type of
bill right? And then … polling, which we'll want to also have right away even before we need
elections. Livestreamers love to run polls during their streams … general polling capabilities are
probably going to be pretty useful in a game of this nature with so much political apparatus. But we
don't want the player experience to be nothing but answering polls … so we need a way to balance all
this."*

## 1. One kind of thing: a question put to an electorate **[DECIDED — lens 2]**

Grounding: **investiture of a Prime Minister is a bill** (Art. V §2); a house's **own officers** are
its internal organization (Art. IV §6) — so the Speaker is the house's choice, not the floor's. **An
election is the same kind of thing as a bill, not the same thing.**

Bills, elections and polls are all a **question**: put to an **electorate**, with **options**,
counted by a **rule**, over a **window**, **binding** or **advisory**. One substrate, three settings —
shared counting, record and interface:

| | **bill** | **election** | **poll** |
|---|---|---|---|
| electorate | the whole floor, counted per house | one house (its officers), or the floor (investiture, constructive no-confidence — bills naming a person) | ⭐ **a list or directory** ([directory-slate](./directory-slate.md) § 3 — sources and `readers`): an audience, a group, a guild, a register, a sample |
| options | support · oppose | candidates | anything |
| weight | each house's standing, with conviction | the electorate's standing, by the house's bylaws | heads by default; standing in forecast mode (§ 4) |
| window | none — continuous, the survival floor and lifespan (§ 7a) | **fixed dates**: nominations, declarations, the vote | the poller's; minutes on a stream |
| secrecy | public positions, except the secret-ballot list (§ 7b) | **secret ballot** (the § 7b lean already lists votes that judge a person; the UK Commons elects its Speaker by secret ballot) | the poller's |
| result | **binding**, certified per house | **binding**, certified | **advisory**, never certified — Art. I §4: *"Tallies may be counted; they never rule."* |
| realm | `ooc` (the Compact) | `ooc` (the Compact) | ⭐ **derived from the poller**, as a release's is from its publisher — an in-fiction poll can never pass for a Compact vote |

## 2. Elections

**Phases** (§ 7q): the trigger → nominations with statements → declarations (the founder's, for the
first) → the vote → the count → certification → seating. A voter may change their ballot until the
window closes.

### Secret and verifiable at once **[LEAN]**

Art. VII §2 makes every count re-derivable by any member; a secret ballot hides who chose whom. The
simplest scheme that holds both:

- each ballot gets a **random receipt code**, shown only to its voter;
- when the window closes, **every ballot is published with its code and no name**;
- **anyone can recount**, and **every voter can check their own ballot is there and counted as cast**.

Not coercion-proof (a voter can show their code — § 7b: secrecy protects against being watched, not
against showing your own screen). ⚠ **And receipts enable vote buying**: a buyer can demand the code
and check the final ballot after the window closes; capital-weighted ballots make a big patron's
worth buying. Ballots changing until the close is only a partial answer. So ⭐ **full end-to-end
verifiable (coercion-resistant) voting comes before any election where a single ballot could decide
the result** **[DECIDED — lens 3b]**.

### The counting method — the house's bylaw **[DECIDED for the first election — lens 1: weighted ranked choice]**

- **Weighted plurality** — simple; with three candidates, a winner may lack most of the house's weight.
- ⭐ **Weighted ranked choice** — a majority winner; and it teaches voting systems (the spoiler effect,
  Condorcet, Arrow's impossibility theorem) — **the first election's method**, the founder setting it
  as caretaker; each house may change its own by bylaw afterwards.
- **Approval** — the simplest ballot that avoids vote-splitting.

### Certification without a conflict **[LEAN]**

The founder certifies the first election (caretaker, § 7q). After that, **a Speaker never certifies an
election they are a candidate in** — the Clerk of the House, or another house's Speaker, certifies.

### Contested elections **[DECIDED — lens 7]**

Anyone can recount, so arithmetic is never in dispute. Disputes of **eligibility or procedure** (a
candidate who was not a member; a window closed early) are a **case** under Art. VI — the court's
existing asynchronous process. **Certification waits** if a case is filed within a short window after
the count (organic law).

## 3. Polls

- **Who can run one:** anyone, to whoever will hear it — publishers (the Post's opinion polls),
  offices, groups and guilds, players to their own lists, **the stream**.
- **A `poll` verb:** `poll open` · `poll answer` · `poll close`; a polls card; results.

### Live polls on the stream

The founder opens a poll on the show; viewers answer **from Twitch, YouTube and Kick chat through the
relay and from inside the game**; the result goes on the overlay through the broadcast feed. One answer
per person (a chat handle per carrier; an account in the game), and ⭐ **results show where answers
came from** (*Twitch 41 · in-game 12 · YouTube 6*) so three audiences are never mistaken for one. The
carriers' own poll features stay available; ours merges every carrier with the game and is on the
record. ⭐ **Side by side, not summed** **[DECIDED — lens 1]**: a combined total of three
self-selected audiences is the *Literary Digest* mistake (§ 3, sampled polls); any combined figure is
labelled *self-selected, not a sample*. ⚠ **Brigading** (another stream's chat raiding a poll) shows
in the attribution; **chat handles cannot be verified as one person per carrier** — stream polls are
entertainment, never evidence.

### ⭐ Sampled polls — where polling teaches

A poll answered by whoever showed up is biased by who showed up. A **sampled poll** draws respondents
at random with the **verifiable random draw** the courts use for juries (Art. VII §2), invites only
that sample, and reports its **margin of error**. **Opinion polling as a trade** — sampling bias,
margins of error, a self-selected poll against a sample. The uncertainty doc says a deterministic
world cannot teach statistics; ⭐ **human opinion is real variance, so polling can.** The classic case:
the **1936 *Literary Digest* poll** — 2.4 million self-selected responses predicted Landon over
Roosevelt, and Gallup's small random sample got it right. ⭐ **Sampled polling is anyone's trade**
**[DECIDED — lens 2]**: the verifiable draw is a platform tool; the Post will simply be first. With a
tiny population the margin of error says so honestly — no timing rule needed.

### ⚠ Push polls

A "poll" written to spread a smear (*"would you still support X if you knew…"*) is propaganda in a
poll's clothes. **A poll's question text is public and attributed**; a smear in it is speech, judged as
any annotation is — defamation of a character, or conduct ([directory-slate](./directory-slate.md)
§ 7). Never refused in advance.

## 4. Weighted polls — the forecast mode **[DECIDED — the owner]**

The owner, pushing back on *"polls never weighted by standing"*: *"most polls probably just want raw
voters but if you're specifically polling to predict whether a tentative bill would pass you want to
know standing and this is probably important for the legislature to do its job."*

| mode | counts | for |
|---|---|---|
| **heads** (default) | one person, one answer | streams, opinion polling, a guild asking its members |
| **standing** (forecast) | **each house's standing, tallied per house exactly as the bill would be** | *would this carry?* — drafts, amendments, whip counts |

The forecast is only useful if it counts **the way the real count will** — per house, by each house's
kind of weight and threshold — so it reads like a bill: *Capital: would carry · Labor: abstains (no
quorum) · Consumer: would not carry.*

- **Aggregates only, never individual weight** — standing is shown as a band and never a number; the
  scalar is reserved for the ballot (register D6). A forecast reports **totals per house**; the poller
  never sees what one answer weighed unless the respondent answers publicly.
- **Still advisory** — cheap talk; nothing committed; the real count is conviction on the floor. Its
  value is testing a draft **without committing weight** — the pre-commitment window the seal protects.
- ⭐ **The whip count** — a Speaker or house committee runs a standing-weighted poll **of its own
  house's members**, results **sealed to the house** (§ 7q's namespace). The Speaker's whip
  operation: a house that knows its own count before committing negotiates better. Public forecast
  polls are allowed too; the sealed one is where the strategy lives.
- **The invariant** becomes Art. I §4's own words: **counted, never ruling.**

## 5. Keeping polls from taking over **[LEAN]**

1. **Pull by default** — polls live where you go to look (a polls card, a publisher's page, the floor),
   never as interruptions.
2. **Push only from sources you chose** — subscribed publishers and groups, under the same attention
   rules as notifications. ⭐ **The one exception: the live poll on the stream you are watching right
   now** — the moment you are already in.
3. **A personal poll setting** — *everything · sampled only · nothing* — yours, like your notify rules.
4. **Answering earns nothing** — no standing, no zorkmids, or people farm polls.
5. **Sampled polls ask each person rarely** — a small sample means most people are almost never
   invited, which makes being sampled mean something.
6. **Binding questions outrank polls everywhere** — a bill or an election is never shown as just
   another poll. The floor is the floor.

## 6. What to build

1. **The question substrate** — electorate, options, weight rule (heads · standing per house ·
   conviction), window, secrecy, bindingness, count rule; bills, elections and polls as configurations.
2. **Elections** — phases as records, candidate statements, secret ballots with receipt codes, the
   published anonymized ballot list, the counting method as a bylaw, conflict-free certification.
3. **Polls** — the `poll` verb, the polls card, results attributed by source, heads or standing mode
   with aggregates only.
4. **Live polls on the stream** — answered through the relay and in the game; shown on the overlay.
5. **Sampled polls** — the verifiable draw, sample-only invitations, the margin of error.
6. **The whip count** — a sealed, standing-weighted poll of one house.
7. **Attention controls** — the poll setting, push only from subscriptions, the live-stream exception.

## 7. Lens pass (2026-11-20, before merge)

1. **Pedagogy** — voting systems (plurality, ranked choice, approval; the spoiler effect, Condorcet,
   Arrow); ⭐ **weighted voting power is not proportional to weight** — the **Banzhaf power index**:
   a member with 30% of a house's weight can hold almost no power or nearly all of it, depending on
   how the rest is split; every house election and forecast poll can show it (the shareholder lesson,
   real here); the secret ballot's history (the "Australian ballot", 1856); sampling (the *Literary
   Digest*, 1936); whip counts. Derivable: every count and margin recomputable. **Chose** weighted
   ranked choice and side-by-side stream totals.
2. **Expression** — the ordinary case needs no code; ⭐ **electorates are lists or directories**; anyone
   can run a poll. **Chose** one substrate and sampled polling as anyone's trade.
3. **3a** — questions carry a **realm** derived from the poller. **3b** — the pollster, the election
   clerk, the campaign manager, the whip; the unwanted: **push polls** (speech, judged), **brigading**
   (attribution shows it), **alt chat handles** (stream polls are never evidence), ⚠ **vote buying
   through receipts** (end-to-end voting moved before any election one ballot could decide).
4. **Values** — polls never rule; answering earns nothing; pull by default; forecast aggregates only;
   the founder's conditional abstention, public; push polls judged as speech, never refused.
5. **Continuity** — elections and the Compact sit outside the fiction and the epochs; **polls inside
   the fiction follow them** — a show of hands at a town meeting → paper ballots → the telegraph → the
   aether; in an aether-dark town a poll is paper, counted by hand. Anonymized ballots and receipt codes
   stay verifiable as long as the record lasts.
6. **Economy** — produces information (forecasts) and legitimacy (elections); consumes attention, the
   scarcest thing players have — hence pull by default and no reward for answering; pollsters are paid
   by whoever commissions them. Demand first: stream polls and the first election, yes; sampled polls
   honest at any size through their margin.
7. **Governance** — elections judge persons (secret ballot, conflict-free certification); **contested
   elections are a case** (Art. VI), certification waiting on a filed case; **a poll is never a legal
   basis** (Art. I §4, unamendable); the counting method a house bylaw; the secret-ballot classes the
   procedure law (§ 7b).

## 8. Open

1. The dispute window after a count, and the certification hold.
2. Which end-to-end verifiable voting scheme, and how the first single-ballot-decisive election is
   recognized in advance.
3. The Banzhaf display — where a house's power distribution is shown, and to whom (aggregates only,
   D6).
