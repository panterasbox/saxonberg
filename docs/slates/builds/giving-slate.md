# Giving slate — patronage anywhere becomes standing here

> **Status: UNBUILT** — the identity half exists: Google, Twitch and
> Kick login with account linking, encrypted tokens, the Twitch EventSub
> plumbing relay chat rides →
> [connection.md](../../subsystems/connection.md),
> [streaming.md](../../subsystems/streaming.md); the stake ledger is
> designed and unbuilt → [cooperative-slate](cooperative-slate.md)
> ⭐ **Offerings (2026-11-08):** bounded windows, two pools (recurring rate-locked ·
> bits discovered), founder matched-plus-one held to 1.0 — § Offerings. Launches with
> the Twitch stream after New Year, **once the stream proves sustainable** (the stream
> launches first, with no offering).
> **Left:** reading patronage off Twitch, YouTube, Patreon (and later
> Kick) · converting it to dollars **at net** — what reached the
> commons — with the platform's cut shown · attribution by claim: a
> held gift attaches when its giver signs in with or links that account
> · YouTube channel linking and Patreon linking (the two prerequisites)
> · the stake ledger's first slice (time-bucketed, concave,
> append-only, reversing entries) · recognition on stream and in the
> world · the wording and the operating-agreement prerequisite
> **Size:** a build

**Captured 2026-10-17.** The founder, on why this cannot wait for the
monetization push the broadcast-patronage track had queued:

> *"the worst thing in the world is to have people that want to give you
> money and not having a channel for them to do that. if people dono the
> stream … in a way that is attributable to their character in game, we
> can give them actual capital standing for it. in fact that may be the
> first thing people engage with in the game"*

And on how — **the platform takes no payments itself**:

> *"I would probably want to translate regular twitch/youtube/kick
> patronage into a dollar value and then award them standing as if they
> dono'd that in dollars. maybe we might also set up a patreon … as a
> streamer I'd rather incentive youtube and kick."*

⭐⭐ **Giving is the first act of play**, not an afterthought bolted onto
a stream. Patronage on any platform is recorded; it *counts* once a
character claims it — so the step that turns standing on is linking
your account, which is the rung on [the studio's ladder](studio-slate.md)
where a viewer becomes a player. Watch the demo → give where you already
are → link that account in the client → your standing is on the ledger
and your name on the stream → you are playing while you watch.

Related: [cooperative-slate](cooperative-slate.md) (the stake ledger,
the two markers, the concave curve, mint-at-launch),
[company-and-capital.md](../../company-and-capital.md) (capital standing
and why it is not a security), the
[founding charter](../../compact/governance/founding-charter.md) (matched-plus-one),
the [broadcast-patronage track](../../tracks/broadcast-patronage-track.md)
Phases 4–5 (pulled forward; one locked decision reopened),
[auth-providers-slate](../tails/auth-providers-slate.md) (YouTube as a
linkable provider), [broadcast-ready](broadcast-ready-slate.md) §
multistreaming, [banking.md](../../subsystems/banking.md) (the
conservation chokepoint this slate never touches).

---

## ⚠ The decision this reopens

The track locked payment intake to **Twitch-native only**. Reopened
2026-10-17: a YouTube viewer cannot give through Twitch, the founder
would rather steer patronage *toward* YouTube and Kick, and Patreon is
the place a streamer's audience already expects to give outside the
stream platforms. The track is amended to point here.

## The channels — read, never collected

| channel | what is read | how it arrives | prerequisite |
|---|---|---|---|
| **Twitch** | subs, gift subs, bits | EventSub (the relay's plumbing) | — (Twitch login + linking ship) |
| **YouTube** | memberships, Super Chat, Super Thanks | the YouTube API alongside relay chat | ⚠ **YouTube channel linking** — Google login stores no channel today |
| **Patreon** | pledges, per member, per month | Patreon's webhooks + OAuth | ⚠ **Patreon as a linkable provider** |
| **Kick** (later) | subs | Kick's webhooks | — (Kick login ships); off until the founder streams there |

- **The platform never takes a payment.** No checkout, no processor, no
  card data, no refunds to issue — the platforms do all of it, and this
  build reads their events.
- **Third-party tip services (Streamlabs, Ko-fi) are not a channel**:
  they carry a free-text name, and nobody can prove a gift was theirs.

## ⭐⭐ At net — what reached the commons

A gift converts to dollars at **what actually reached the project**,
not what the giver paid. Roughly, and to be read from each platform's
current terms at build time:

| channel | reaches the project |
|---|---|
| Kick subs | ~95% |
| Patreon | ~85–90% after its fee and processing |
| YouTube memberships, Super Chat, Super Thanks | ~70% |
| Twitch subs | ~50% standard; bits ~$0.01 each |

- **Lens 1 decides it:** net is derivable from the platform's published
  split; gross would credit money the commons never received.
- ⭐ **It is the founder's incentive stated as a fact, not a penalty.**
  *"A YouTube membership puts more into the project than a Twitch sub"*
  is simply true, and can be said on stream. Nobody is punished for
  liking Twitch's community; the platform's cut is made visible.
- ⚠⚠ **The cut is always shown.** Two people who each paid $5 see
  different standing, so every ledger line reads *paid $5.00 on Twitch ·
  Twitch kept $2.50 · $2.50 reached the commons*. Shown that way the
  difference is a civics lesson; hidden, it would read as unfair.
- The split table is **data** — one row per channel, amended when a
  platform changes its terms, with the date it took effect. A past entry
  keeps the split it was recorded under.

## ⭐⭐ Claims — patronage before you play counts later

Every channel reports the giver's **platform account**, never a
character. A gift is recorded against that account and **held**. When
that person signs in with (or links) the account, every held gift
attaches to their character — **claiming is a proof, not a request**:
the login *is* the proof, so no form, no ticket, no matching by name.

- Held standing is visible to its giver as held (*"link your Twitch to
  claim $12.50 of standing"*) — the invitation to play, honestly worded.
- A gift never claimed stays on the ledger as given, attributed to the
  platform handle. Nothing is lost; it counts for nobody.
- One character may link several platforms; their gifts sum.

## The ledger — the cooperative slate's slice, now

- **An honest counter per identity** — lifetime total and recurring
  rate, **time-bucketed** (credit per month given, not per dollar) and
  **concave**. Patreon's monthly pledges and YouTube memberships are
  exactly the shape the curve rewards.
- **Append-only.** A refund, a chargeback or a platform's reversal is a
  **reversing entry**, never an edit; the giver sees both lines.
- **Nothing is governed yet.** Entries convert to standing when the
  government that reads them comes online (mint-at-launch).
- **Matched-plus-one** ships with it.
- The firewall line item holds: standing is influence, never in-world
  currency or gameplay advantage, and the bank ledger is never touched.

## ⭐⭐⭐ Offerings: rounds, two pools, the rate lock **[DECIDED — the owner, 2026-11-08]** — supersedes the always-on faucet above

The ledger above credits every gift, always. The owner replaced that with **bounded
offerings at intervals**, for the Twitch launch after New Year: *"the whole hook is that
your twitch subs and bits can earn you standing in the game. so I need some kind of
either initial offering terms to cover my live stream donos or … some kinda window where
money earns you standing vs just going into the budget as income."* At-net conversion,
held claims, reversing entries, the wording rules and the firewall all stand.

- **An offering is a window.** Inside it, money earns capital standing; **outside it,
  money is income and earns nothing**, ever, retroactively included. It is still recorded
  as given, with the cut shown. A viewer who never links an account is just supporting
  the stream: their gift is held, counts for nobody, and that is fine. The owner: *"the
  risk is that no one donos until there's an offering … but that at least gives us demand
  signals that are valuable."*
- **A gift in the window counts even if it is claimed later.** Subscribe in January,
  link your Twitch in March, and you share January's round.
- **Two pools per round**, because the owner wants recurring patronage and gift subs
  over bits (*"they build community"*), and *"if we can't guarantee a recurring dono will
  mint the same amount of standing every month the value proposition changes"*:
  1. **Recurring and gift subs: a posted price, rate-locked.** Each round posts X units
     per net dollar per month. A patron who starts recurring in the round **keeps that
     rate every month for as long as they keep giving, until 1.0.** A lapse re-enrolls
     at the current posted price. Gift subs earn the posted price, credited to the
     gifter (never the recipient).
  2. **Bits and one-time gifts: a fixed pool of units**, shared at the round's close.
     Pool units ÷ net money in is the round's **discovered price**.
- **The next round's posted price is set from the last discovered price**, within a
  bounded step. Demand reads off the bits pool; recurring patrons are insulated from it.
- **The concave curve applies per patron per month**: $50 a month earns meaningfully less
  than 10× $5 a month, but the same every month.
- **Bounded issuance.** New rate locks open only in windows. Supply = the recurring rates
  × their months, plus one fixed pool per round, so issuance is predictable.
- **Honest urgency.** Windows are announced in advance and run fixed lengths. No
  countdown pressure on stream; the calendar is the hook.
- ⚠ **A rate lock is a promise.** An early posted price that proves generous holds until
  1.0. That is intended: founding members get the better deal.
- **Founder majority until 1.0** is the founding charter's matched-plus-one (term 3),
  unchanged; its sunset at ratification (term 4) means **ratification is held at 1.0**,
  where the owner negotiates with *"whatever constituents we have at that point."* ⚠ The
  charter's text should say so when it is next amended.

### ⭐⭐ Posted, and easy to digest **[DECIDED — the owner]**

The owner: *"it's a lot more math but as long as all this stuff is posted and easy to
digest I dont mind it it's actually somewhat I dunno honest representation of what
democracy gets you, long contracts with lots of nooks and crannies."*

Every term is published as readable content: the window dates, both prices, the pool
size, the curve, the step bound, matched-plus-one, the sunset. Each patron's ledger
shows their own lines in the same words. This is the standing-mint slate's rule applied
to money: legibility is the only lever we have (Part 6). A term that is not posted does
not exist.

### Before the first round opens

⭐⭐ **The stream launches first; the offering waits (the owner, 2026-11-08).** *"I'm not
gonna do any of this before I start livestreaming. I dont even know if I'll have the
willpower to keep up a weekly stream for more than a month … I'm not gonna go setting up
bank accounts and corporate accounts until I actually have demand and I've proven I can
keep up the demands regular livestream schedule on top of the regular commitment I give
to development every week."*

- **Until incorporation there is no offering.** Gifts are plain support for the stream,
  exactly as money outside a window already is, and are said to be so on stream.
- ⛔ **No promise that pre-offering gifts count later.** That would be a backdoor
  offering with no entity behind it; retroactive credit is already ruled out.
- **The trigger for round 1:** a regular stream schedule kept up alongside development,
  and real demand (people asking how to earn standing is that demand). Then the LLC, the
  business bank account, and round 1 as designed above.
- The stream also frames the instance: *"the only running instance of the platform is
  there to market the livestream or rather 'organize' is a better framing of which
  managing income and expenses as a community is part of what's on offer."*


- ⚠⚠ **Incorporate first.** A round sells governance voice for money, so the entity
  whose governance it is, and an operating agreement defining the units as non-economic
  governance units ([company-and-capital.md](../../company-and-capital.md) Part 3, the
  ladder's first rung), come before the first credited entry. An LLC takes days. A
  lawyer reads the offering's wording once. The owner: *"this is reason why I probably
  should incorporate when real money starts flowing in."*
- **The livestream is the company.** The owner: *"the game isn't really the company, the
  livestream is the company, it's just running the platform that provides the compact
  for governance."* Capital standing is voice in Pantera's Box, through the Compact.
- The value and risk on offer are [business-model.md](../../business-model.md).

## Recognition

- **On stream**: the overlay alert and the herald in the studio name the
  giver — the **character** when claimed, the platform handle when held.
- **In the world**: the giver's standing page lists the entries with
  each cut. A public funders' mark is a community decision, not this
  build's.
- ⚠ Recognition is not renown. Money does not feed the renown
  measurement.

## ⚠⚠ Before the first entry is credited as standing

*Not legal advice — the company doc's own caveat applies.*

- **The wording**: stake, funder, standing — never investor, share,
  equity, return, dividend; on the claim page, the alert, the ledger
  page and the Patreon tiers alike.
- **The operating agreement** says what capital standing *is* before
  the ledger promises it. Recording can start with honest copy —
  *"recorded now; what it becomes is set when the cooperative's charter
  is"*.
- Patronage is the creator's income, never a tax-deductible donation.
- **Patreon tiers sell no perks in the world.** A tier may offer
  out-of-world things (early VODs, a Discord role); it may not offer an
  item, currency, cosmetic or access in Saxonberg.

## The drive

1. A Twitch sub from an unlinked account → held, shown under the handle
   on the overlay.
2. That viewer `!join`s, signs in with Twitch → the sub attaches; the
   ledger line shows paid, Twitch's cut and the net.
3. A YouTube membership → held; the viewer links their YouTube channel
   → attaches at ~70%.
4. A Patreon pledge → linked via Patreon → attaches at Patreon's net.
5. A platform reversal → a reversing entry; both lines show.
6. A second month → a second bucket; a second gift in the same month →
   the same bucket.

## Lens pass

1. **Pedagogy** ⭐ — decides net over gross (derivable), and the ledger
   is a civics object: who funds the commons, what the intermediaries
   kept, and what it buys (a voice, not a return).
2. **Creative expression** — none.
3. **Immersion / participation** — giving is interface-tier; the
   participation is real: a funder of the polity is a hole only a
   person fills.
4. **Values** ⭐ — the claim rule (no matching by name), reversing
   entries, the cut always shown, the wording.
5. **Continuity** — none.
6. **Economy** ⭐ — produces standing; consumes real money the platforms
   collect; the payer is the giver; the demand was there first.
7. **Governance** — the ledger judges no person; the charter decides
   what standing does.

## Non-goals

- **Taking payments** — no checkout, ever, in this design.
- **The government that reads the ledger** — mint-at-launch.
- **Paid perks** in the world, on any channel.
- **Equity or any economic claim.**

## Open questions

1. **Bits and Super Chats to the curve** — what one bit or one Super
   Chat dollar credits against a month's bucket.
2. **Gift subs** — standing to the gifter (who paid), never the
   recipient. Confirm.
3. **The public ledger page** — giver-only, or a public funders list
   each giver opts into?
4. **Patreon's API terms** for reading pledges per member — confirm the
   access a creator account gets.
