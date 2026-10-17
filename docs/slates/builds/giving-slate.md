# Giving slate — a channel for people who want to give, and standing for those who do

> **Status: UNBUILT** — the identity half exists: Google, Twitch and
> Kick login with account linking, encrypted tokens, the Twitch EventSub
> plumbing relay chat rides →
> [connection.md](../../subsystems/connection.md),
> [streaming.md](../../subsystems/streaming.md); the stake ledger is
> designed and unbuilt → [cooperative-slate](cooperative-slate.md)
> **Left:** the channels (Twitch subs/bits, YouTube Super Chat and
> memberships, and a give-from-inside-the-game checkout) · attribution:
> by construction in-game, by claim for platform gifts · the stake
> ledger's first slice (the honest counter, time-bucketed) · reversals
> (refunds and chargebacks) · recognition on stream and in the world ·
> the wording · the operating-agreement prerequisite
> **Size:** a build

**Captured 2026-10-17.** The founder, on why this cannot wait for the
monetization push the broadcast-patronage track had queued:

> *"the worst thing in the world is to have people that want to give you
> money and not having a channel for them to do that. if people dono the
> stream … in a way that is attributable to their character in game, we
> can give them actual capital standing for it. in fact that may be the
> first thing people engage with in the game"*

⭐⭐ **That last clause is the design.** Giving is not a monetization
afterthought bolted onto a stream; it is **the first act of play** — the
rung on [the studio's ladder](studio-slate.md) where a viewer becomes a
player, because giving that *counts* needs a character to count for.
Watch the demo on stream → give from inside the client → your name is on
the stream and your standing is on the ledger → you are playing while
you watch.

Related: [cooperative-slate](cooperative-slate.md) (the stake ledger,
the two markers, the concave curve, mint-at-launch),
[company-and-capital.md](../../company-and-capital.md) (capital standing
and why it is not a security), the
[founding charter](../../governance/founding-charter.md) (matched-plus-one),
the [broadcast-patronage track](../../tracks/broadcast-patronage-track.md)
Phases 4–5 (this slate pulls them forward and reopens one locked
decision), [auth-providers-slate](../tails/auth-providers-slate.md)
(YouTube as a login provider — the YouTube attribution prerequisite),
[banking.md](../../subsystems/banking.md) (the conservation chokepoint
this slate must never touch).

---

## ⚠ The decision this reopens

The track locked payment intake to **Twitch-native only** (EventSub
subs and bits), *"revisit only if off-platform capital becomes a real
need."* It has: a YouTube viewer cannot give through Twitch at all, and
the most attributable channel there is — giving from inside the game —
is off-platform by definition. **Reopened 2026-10-17** for the reason in
the founder's quote: an absent channel is the worst outcome. The track
is amended to point here.

## The channels

| channel | how it arrives | attribution |
|---|---|---|
| **Give in the game** | a `give`/`fund` act in the client opens a hosted checkout (a payment processor's page — the platform never touches a card); the processor's webhook confirms | ⭐ **by construction** — the checkout is opened *by a character*, and the identity rides the checkout's metadata |
| **Twitch** subs, gift subs, bits | EventSub over the plumbing relay chat already uses | by the Twitch account — automatic when the giver logged in with Twitch or linked it; held as a claim otherwise |
| **YouTube** Super Chat, Super Thanks, memberships | the YouTube API, read alongside relay chat | held as a claim until YouTube is a linkable provider (auth-providers' Left) |
| tips through a third-party service (Streamlabs, Ko-fi) | — | **not a channel.** It would credit a free-text name; nobody can prove it was them |

⭐ **Give in the game is the headline channel**, because it is the only
one where attribution cannot fail and the one that *is* the funnel. The
platform channels exist so nobody who wants to give is turned away.

### ⭐⭐ Claims — giving before you play counts later

A gift arrives from a Twitch or YouTube account that is not linked to
any character. It is **recorded against the platform account** and held.
When that person later signs in with (or links) that account, every
held gift attaches to their character — **claiming is a proof, not a
request** (the registry slate's rule): the login *is* the proof, so no
form, no support ticket, no matching by name.

- A held gift is shown to the giver as held (*"sign in with Twitch to
  claim your standing"*) — which is the invitation to play, honestly
  worded.
- A gift that is never claimed stays on the ledger as given, attributed
  to the platform handle. Nothing is lost; it simply counts for nobody.

## The ledger — the cooperative slate's slice, now

The cooperative slate already designed it; this build ships its
**buildable-now slice** and nothing more:

- **An honest counter per identity** — the two markers, lifetime total
  and recurring rate, **time-bucketed** (credit per month given, not per
  dollar) and **concave** — the shape that makes recurring giving the
  real model and blunts the whale.
- **Append-only.** A refund or chargeback is a **reversing entry**, never
  an edit; the giver sees both lines.
- **Nothing is governed yet.** Entries convert to standing when the
  government that reads them comes online (mint-at-launch). Until then
  the ledger records and the page shows it.
- **Matched-plus-one** ships with it — the founder's self-binding, the
  first real test of code-first self-binding.
- The firewall line item holds: standing is influence, never in-world
  currency or gameplay advantage, and the ledger never touches the bank
  ledger's conservation chokepoint.

## Recognition

- **On stream**: the overlay alert and the herald reading it in the
  studio ([studio-slate](studio-slate.md)) — the giver's **character
  name**, which is the attribution made visible.
- **In the world**: the giver's own standing page shows the entry. Any
  public mark of having given (a funder's name on a wall) is a
  community decision, not this build's.
- ⚠ Recognition is not renown. Money does not feed the renown
  measurement; the alert is a thank-you, not a score.

## ⚠⚠ Before the first dollar is credited

*Not legal advice — the company doc's own caveat applies.*

- **The wording.** Stake, funder, standing. Never investor, share,
  equity, return, dividend. The checkout page, the alert and the ledger
  page all speak it — a single "invest" on a checkout button is the
  failure.
- **The operating agreement** says what capital standing *is* (a
  non-economic governance unit) before the ledger promises it. Giving
  can open first with honest copy — *"recorded now; what it becomes is
  set when the cooperative's charter is"* — but the ledger must not
  describe a right the company has not written down.
- **Gifts to an LLC are income**, not charitable donations; the copy
  never says or implies tax-deductible.
- **The processor's terms** for creator tips/support decide the word on
  the button; pick the processor with that in mind.

## The drive

1. A guest in the studio (`!join`) runs `give 5` → refused into
   *sign in to give* (a guest has no character to count for).
2. Sign in with Twitch → `give 5` → checkout → paid → the overlay alert
   and the herald name the character; the ledger page shows one entry.
3. A Twitch sub from an unlinked account → held; that viewer signs in
   with Twitch → the sub attaches.
4. A refund → a reversing entry; the counter falls; both lines show.
5. A second month's gift → a second bucket; a second gift in the same
   month → the same bucket (concave, per month).

## Lens pass

1. **Pedagogy** — the ledger is a civics object: a public, auditable
   record of who funds the commons and what that buys (a voice, not a
   return).
2. **Creative expression** — none.
3. **Immersion / participation** — giving is interface-tier; standing is
   a meta-layer fact, not an in-world one. ⭐ The *participation* is
   real: the giver is now a funder of the polity, which is a hole only a
   person can fill.
4. **Values** ⭐ — decides the claim rule (no matching by name), the
   reversing entry (no silent edits), the wording, and that a guest is
   refused rather than shown a checkout that would credit nobody.
5. **Continuity** — none.
6. **Economy** ⭐ — produces standing; consumes real money; the payer is
   the giver; the demand was there first (the founder's quote is the
   evidence).
7. **Governance** — the ledger judges no person; mint-at-launch and the
   charter decide what standing does, under the cooperative's
   entrenchment.

## Non-goals

- **The government that reads the ledger** — chambers, votes, citizenship
  tiers. Mint-at-launch.
- **Paid perks** — no in-world item, currency, cosmetic or access is
  sold or granted for money.
- **Equity or any economic claim** — the company doc's ladder; not this.
- **Media share for money** (paid video requests) — the media queue is
  moderated and free.

## Open questions

1. **The processor** — chosen for its creator-support terms and webhook
   quality; which one?
2. **Recurring in-game** — does `give` offer a monthly option (the model
   the curve rewards), or one-off only at first?
3. **Bits and Super Chats to the curve** — what one bit or one Super
   Chat dollar credits against a month's bucket (the track's open
   Phase 4 question).
4. **Kick** — Kick login exists; does Kick's own support channel join
   the table now or later?
5. **The public ledger page** — who may see whose giving: the giver
   only, or a public funders list each giver opts into?
