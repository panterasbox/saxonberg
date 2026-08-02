# Auction slate — price discovery as a player capability

**Captured 2026-07-31**, out of the second-hand/salvage chain. Players
will want to auction things. **Consignment already ships**
([retail.md](../../subsystems/retail.md)) — but consignment is a *fixed
price on someone else's shelf*, and an auction is a different animal:
it exists where **the price is not known.**

> **Status: direction set, nothing built.** The substrate answer is the
> load-bearing part; most of the rest already exists.

Related: [contract.md](../../subsystems/contract.md) (**the substrate
this rides**), [retail.md](../../subsystems/retail.md),
[activity.md](../../subsystems/activity.md),
[chattel.md](../../subsystems/chattel.md),
[sanitation-slate](./sanitation-slate.md) (impound → auction → salvage;
the second-hand market), [freight-slate](./freight-slate.md) (the
business chain this completes), [press-slate](./press-slate.md) (the
catalogue as a publication).

## What an auction is *for*

**Price discovery** — not asymmetry, and not convenience. You auction
when the value is **unknown or contested**: a unique item, no reference
price, several interested buyers.

> **The precondition is COMPETING DEMAND.** With one bidder an auction
> is a sale with extra steps.

## ⭐⭐ The design risk, stated first: the auction house as a menu

That is what most games ship. It is convenient and **it kills the
thing**. An auction is worth building only as **an event with people in
it** — scheduled, attended, with an auctioneer.

So: **two honest modes**, not one.

| Mode | Character | Population |
|---|---|---|
| **silent** (sealed / async) | bids private until close, no reaction, a clock | works at **any** population — **ships first** |
| **live** (English, ascending) | bids public and immediate; **reaction is the point** | needs presence |

## The substrate answer — ⭐⭐⭐ NOT forums, NOT chat: CONTRACTS

The sharp reason:

> **Forums and chat carry SPEECH. An auction carries COMMITMENTS.**

A thread cannot hold escrow, cannot enforce ordering, and cannot
settle. Build the auction *as* a thread and you have built a place
where people **say** numbers — and then you bolt on an enforcement
layer, which is the contract substrate anyway, badly attached.

### ⭐⭐⭐ An auction is a contract whose counterparty is decided by competition

A normal gig posts terms and **someone accepts**. An auction posts terms
and **many compete, highest wins.** Everything else is already there:

| Auction piece | Contract substrate |
|---|---|
| **the lot** | escrowed goods + **the custodian rule** |
| **a bid** | an offer with **its own escrow** |
| **close** | a **clause over a verifiable condition** (time elapsed / no better bid) |
| **settlement** | escrow release |

**Almost nothing new to build**, and it inherits **bindingness** for
free.

### ⭐⭐ Separate the venue from the notice

**The lot lives in contracts; the announcement rides comms** — a forum
post, a channel, the ticker, a crier in the street. Conflating them is
exactly what produces the forum-thread-as-auction.

**The same record-vs-publication split as the docket** — with a nice
consequence: **an auction house's catalogue is a publication**, which
plugs into the publisher work.

## The live auction

> **⭐ A live auction is the AUCTIONEER'S engagement** — a
> `SustainedEngagement` with a recurring beat (the going-going-gone
> countdown) that ends when the condition is met.

**Structurally identical to the Journey**, including the slot logic:
**the auctioneer is engaged; the bidders stay free**, exactly as the
driver is engaged and the passengers are not.

- **⭐ Reset-on-bid does two jobs at once** — it is the
  going-going-gone **drama**, *and* it is the **anti-snipe fix** (any
  bid extends the clock). One mechanic, two problems, and what real
  auction sites converged on independently.
- **⭐⭐ A bid is an act that produces an utterance.** The commitment
  goes through contracts; the *"Fifty!"* goes through
  `MessageApi.scene`. So a live sale is **fully visible in the room
  without being built on the chat substrate** — the same way an emote
  is a mechanical act with a narrated face.

### ⭐⭐⭐ The proxy bid solves timezones diegetically

The real problem with live auctions in a game: **nobody can be online at
20:00 every night.** The fix is what actual auction houses do — **leave
your maximum with the auctioneer and they bid on your behalf.** An
absentee bid.

> **Presence becomes REWARDED rather than REQUIRED.** There, you can
> react to the room; absent, your proxy still competes.

An honest diegetic answer to a scheduling problem instead of a UI hack.

## ⭐⭐ Anyone can auction; the house sells audience and credibility

**The gate is escrow** — you can only auction what you have and will
lock up. **Self-limiting with no permission system**, the same logic as
an empty caucus being nothing.

Which makes the auction house **not a gatekeeper but a service**: it
sells **reach** (its audience) and **trust** (its reputation) — precisely
why you would use one instead of shouting in the street.

## Abuse, and what handles it

| Abuse | Handled by |
|---|---|
| **non-payment** | **both sides escrow** — what makes a bid *binding* rather than a claim |
| **shill bidding** (bidding on your own lot) | identity is on the record → **detectable**; and a locality may prohibit it outright |
| **sniping** | the **reset-on-bid** rule already covers it |
| **the ring** (bidders agreeing not to compete, then re-auctioning privately) | **hard to detect — deliberately.** Structurally a **cartel**; content for the antitrust thread, not a bug |

## Surfaces

- **`auction`** — the dispatch verb for management (create, list,
  inspect, close), per the *prefer subcommands* rule.
- **`bid`** — **its own verb**, because shouting a number at a sale is a
  **diegetic act**, not an administrative one.

## ⭐⭐ Auction *type* is meaningful content, not a UI choice

The formats exist for reasons, and each teaches something:

| Format | Why it exists |
|---|---|
| **English** (ascending, open) | social, dramatic, **reveals information as it runs** — the estate sale |
| **Dutch** (descending) | **fast, because the goods spoil** — the fish market, the flower market |
| **sealed-bid** | **anti-collusion** — nobody can react to anybody |

**Dutch auctions exist because fish rots**, and we model spoilage: a
format whose *reason* is already in the simulation.

> **⭐⭐⭐ And sealed-bid is how the STATE buys things.** Public
> procurement runs sealed competitive bidding precisely to prevent
> corruption — so **the tender is an auction**, connecting this to the
> legislature and the **fiscal cycle**: the road-repair contract, the
> LULU host payment, the supply contract.

## ⭐⭐⭐ The winner's curse — the lemons problem's sibling

The winner is **by definition the most optimistic bidder**, so they
systematically **overpay** when value is uncertain.

> **Lemons is asymmetry between BUYER and SELLER; the winner's curse is
> asymmetry between BIDDERS.** Both are cured by better information.

Which hands **the appraiser a second market**, and makes the auction the
natural venue for the information economy the second-hand work set up.

**Reserve prices** matter for a thin market — *"reserve not met"* is an
honest outcome that stops a unique item going for nothing on a quiet
night.

## ⭐⭐ The auction house owns nothing and sells confidence

Revenue is **commission** (plus a **buyer's premium** if the legislature
allows one — mildly resented in life, which makes it a nice small
political object). It is a **bailee** again, holding goods it does not
own — the third instance after the warehouse and the impound yard.

The contrast with the other three businesses is the point:

| Business | Sells |
|---|---|
| turnpike | access to an asset it **owns** |
| depot | service on goods it **holds** |
| salvage | material it has **transformed** |
| **auction house** | **nothing at all — the credibility of the process** |

**The purest reputation business in the chain**, and correspondingly
fragile: **one fake lot or one exposed shill and it is finished.**

### ⭐⭐ Provenance flips sign here

In the salvage yard, murky title is a **discount**. At auction,
documented title is a **premium** — *"from the estate of…"* is the
catalogue's whole art, and **chattel chain-of-title plus the chronicle
makes it verifiable rather than asserted.**

> **Same data, opposite effect, depending on venue** — a genuine reason
> for both venues to exist.

## What gets auctioned

- **unique crafted items** (a master's work);
- **salvage job lots** (real practice);
- **impounded goods** — see the pipeline fix in
  [sanitation-slate](./sanitation-slate.md): *collect → hold →
  unclaimed → **auction** → salvage.* **You try to sell it whole before
  you break it**, which is exactly what police and impound auctions are;
- ⚠ **estates** — a dead character's unclaimed goods. **Belongs to the
  mortality build**; named, not scoped here.
- ⚠ **land / parcels** — **belongs to the property build**; named, not
  scoped here.

## Open questions (for requirements)

1. **Must a silent bidder be present to bid?** (Instinct: **no** for
   silent, **yes** for live — presence is what the live format *is*.)
2. **Does the clock run on game-time or real-time?** (Instinct:
   **real-time** for a live sale — it is a *human* event, like
   participation's real-time decay.)
3. **Where do proxy maxima live** — on the lot, or on the bidder? And
   are they secret from the auctioneer (they should be, or the house
   can shill against them).
4. **Bid increments** — a fixed step, a percentage, or auctioneer's
   discretion? (The last is the most diegetic and the most abusable.)
5. **Does an unsold lot auto-route to salvage**, or return to the
   consignor? (Depends on venue: an impound lot should route on; a
   private consignment should return.)
6. **Multi-lot sales** — a scheduled *sale* with many lots in sequence
   is the real auction-house shape, and it wants a running order. Is
   that one engagement or many?
