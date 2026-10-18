# Markets slate — dealers, public spending, and imports at a ceiling

> **Status: UNBUILT** — captured 2026-10-18. What it builds on ships:
> the conserved ledger and the perpetual (the reserve mints
> `moneyPerActiveMember × active members`), the Arrival Note and the
> opening advance, escrowed gigs and the `restocks` brain, consignment
> and supplier terms, the stocking rule, inventory finance (credit's
> rung 2), appropriation, the Gazette's price index →
> [banking.md](../../subsystems/banking.md),
> [credit.md](../../subsystems/credit.md),
> [contract.md](../../subsystems/contract.md),
> [retail.md](../../subsystems/retail.md),
> [employment.md](../../subsystems/employment.md)
> **Left:** the **dealer** — one kind of business, the commodity a row,
> bid and ask from its own book · **public spending** as the primary
> faucet, through escrowed public-works gigs · **imports** — the engine's
> backstop supply named honestly, a per-commodity per-town ceiling and a
> possible sink · the **levers** as rows and settings · supply-gig
> rewards that track the supplier's price · **piecework** before hourly
> wages · a daily **price series** per dealer per commodity, printed by
> the Gazette
> **Size:** a build — after the ice build (storage-and-ice) merges; ice
> is the first commodity

**Captured 2026-10-18**, in a conversation that started from *"we just
set up credit — what comes after it?"* and went straight to the prior
question: **how does a player earn zorkmids beyond the 20 they arrive
with?** *"Jobs"* is not an answer until we can say which jobs, who pays,
and why the work is fun rather than another job.

Related: [economy-slate](economy-slate.md) (faucet/sink balance; shops
"bounded, not infinite"; the default shop "sells and brokers, it does
not fixed-price-buy"), [retail-slate](retail-slate.md) (S2 the
Circulation Reserve, S3 cost-plus and supply/demand pricing — *"a sell
price cannot break the economy, but a buy-from-player price can"*),
[credit-slate](credit-slate.md) (Part 11's open gaps — no `hires`
brain; a new house cannot pay its first wage),
[unobserved-economy-slate](unobserved-economy-slate.md) (the cadence
brains that keep the NPC economy running unobserved),
[auction-slate](auction-slate.md) (price discovery for what a bid
cannot price), [settlement-model.md](../../settlement-model.md) (every
need is a market), [vocations.md](../../vocations.md) (criterion 4:
*income that is PAID, not MINTED*; the blocked treasury column).

---

## What is true today

- **Money.** The only mint sites are the perpetual, the reserve's
  window, a recorded override and the coinage bridge
  (`lint:no-authored-faucet` holds the rest at zero). The perpetual
  grows with active members, so **a fresh realm ships broke**: ~50 NPC
  houses boot before any player exists and their 50-zorkmid opening
  advance is refused (*"treasury-short"*). Almost nothing destroys money
  — only repaying the window.
- **Earning.** Six advertised seats (the bar at 4/h, the general-store
  hand at 4/h after two gigs, the tailor at 6/h for the competent, the
  campus farm at 2/h, the Hesper's lookout at 3/h, a drilling crew);
  everything else is rostered to NPCs with no headcount. Supply gigs
  from the `restocks` brain pay 24–48, but the hauler fronts the
  purchase.
- **Nobody buys from players.** Consign and wait (15% commission), or
  sell on supplier terms and wait. NPC buying for its own coin is
  deferred behind retail S2.
- **Prices** are authored, or follow the stocking rule (`base × (1 + e ×
  (1 − onHand/par))`) on supplied lines. Supply/demand pricing is
  deferred.
- **The icehouse** (storage-and-ice, in flight) sells from stock at a
  seasonal price and stores others' ice for a fee. It does not buy ice.

## ⭐⭐⭐ The rule: money is the only scarce thing

**Anything in the game is free to clone except money.** So every
zorkmid an NPC pays a player came from one of two places: **a player
paid it earlier** (circulation), or **the treasury** — whose pool grows
only with active players. That is the one honest faucet.

It settles a danger: **an NPC that buys something in order to consume
it** needs income to pay for it, and that income is either minted (a
faucet with no reason) or taken from players (fake demand). So
**private NPC consumption is never a money flow** — an NPC household
eats cloned bread for free and nothing is lost.

## ⭐⭐ The legitimate consumer is public: spending is the faucet

Institutions consume real things for real reasons, and their money comes
from the treasury and taxes: **lamp oil for the street lights** (already
shipped — the public-works warden posts a lamp-oil bounty and street
lighting pays a supplier), **ice for the infirmary** to preserve blood,
firewood, road and bridge repair, **pest and predator bounties** (paid
by whoever is losing herds — never a monster-drop faucet), charting
commissions, a fire watch.

That is vocations.md's blocked treasury column — *tax → budget →
appropriate → disburse* — and the appropriation half ships. The budget
is **policy**: it belongs to the finance office and the polity.
**Public spending is the primary faucet into player hands, with a reason
attached to every coin.** It reaches players as **escrowed gigs**.

## Gigs first

**Wage employment is too risky to lead with.** If Dave pays 20 for a
shift and sells one drink, he is broke fast. A gig escrows its reward at
posting, so nobody can promise money they do not have.

- ⚠ **A supply gig's value can change after posting.** Today the reward
  reimburses the hauler's purchase, so a supplier price rise before
  delivery comes out of the hauler. The reward should be **a fee plus
  the supplier's price at delivery**, the price part capped by the
  escrow (or the poster escrows a margin).
- **Employment can be gig-shaped too: piecework.** Pay per drink served
  ties the wage to Dave's revenue. employment.md already has piecework
  and share-of-flow, and no venue uses it. Bartending on piecework is in
  effect a standing gig. Hourly wages come later, when a business has
  revenue to cover them.

## ⭐⭐ The dealer — one kind of business, the commodity a row

A **dealer** buys and sells one commodity on its own book. The commodity
is a row; ice, grain, fuel (charcoal, lamp oil), salt, timber, ore, fish,
hides and wool are the same dealer with a different row.

- **It is not the vendor-trash faucet the doctrine forbids.** That is an
  NPC buying anything, forever, with money from nowhere. A dealer
  **pays from its own account** (*paid, not minted*), has a **finite
  book** (when cash runs low or the store is full, its bid falls or it
  stops buying, so it cannot be farmed), and **takes inventory risk** —
  which is what makes it a *real* shop: a consignment shop brokers; a
  dealer owns stock and can lose money on it. The economy slate's
  *bounded, not infinite* covers it exactly.
- **Its book**: cash, capacity, stock on hand, its sales rate, and its
  own season-by-season history.
- **Its prices come only from its book** — *an offer, never an oracle*
  (credit.md), applied to the bid. The **bid** falls as stock fills,
  cash runs low, or spoilage or melt makes stock riskier; the **ask**
  rises as days of stock run down. It is the stocking rule extended to
  the buy side.
- **Its customers are players and institutions** (the infirmary buys from
  the ice dealer), so its money comes from consumption — player spending
  plus public budgets.
- **It borrows against its stock** through **inventory finance**,
  credit's rung 2, which was designed for exactly this — dealers are
  credit's first real customers.

**A good suits a dealer when it is** fungible (graded bulk or a stack,
so a bid means something), **consumed** (demand recurs rather than
saturating), **costly to store or perishable** (the spread pays for
something real), and **produced by many hands** (there are sellers).
Unique crafted goods stay consigned, and later go to auction.

### ⭐ Ice is the ideal first commodity

Its risks teach the model: **inventory melts**, so overbuying costs
money and the bid must track expected sales before melt; **demand is
seasonal** — harvested in winter, needed in summer — so carrying stock
across time *is* the value the house adds; capital is low and demand
obvious (blood and food preservation in the medieval epoch). *Buy at 4,
sell at 5, and every summer there is demand or the ice simply melts.*
⚠ **Not by disturbing the ice build**: storage-and-ice ships as planned,
and dealing arrives here, with ice as its first row.

## ⭐⭐ The engine's backstop is imports — a ceiling, and maybe a sink

The infirmary needs ice whether or not anyone sells it some, and the
engine can always produce it. So player supply never decides *whether*
the need is met — only **who supplies it and where the money goes**.
Every unit a player sells replaces an engine-made unit, and money flows
only for that share: **import substitution**. That gives the backstop an
honest name in the fiction — **imports**, at an **import price** (the
general store already sells *spawned imports at authored prices*).

1. **The import price is a ceiling.** A hot summer drives local ice up
   toward import parity and never past it, because the institution would
   import instead. Inflation is bounded **per commodity and per town**,
   and the zorkmid itself is untouched.
2. **Imports can be the drain the economy lacks.** If an import is paid
   for — to an off-map seller — that money **leaves the realm**: when
   players supply, money stays and circulates; when the town imports, it
   leaves. **Whether imports cost money is tunable**, not decided (an
   import price of zero is free imports, and nothing else changes).
3. **It is visible.** By the measurement doctrine the Gazette prints
   *"the infirmary imported 40 blocks this week"* — import share is
   something players can see and compete to displace.

## The levers — per commodity, per town

| lever | what it does | owned by |
|---|---|---|
| **import price** | the ceiling; how much leaves per imported unit | the realm's content |
| **import tariff** | makes imports dearer, so local supply is worth more | the polity |
| **local-buy preference** | how much an institution buys from players before importing at the same price | the polity / the institution |
| **institutional budget** | the appropriation — how much public money exists | the polity (finance office) |
| **the bid formula** | how fast a dealer's bid falls as its stock fills | the realm's content |

Every lever is a row or a setting scoped to a commodity and a locality,
so one sector in one town can be tuned without touching the zorkmid. *Game
economies are easier to keep than real ones because every dial is
ours* — the central bank, the customs house and the statistics bureau.

## Markets you can see — Offworld-style, but honest

- Each dealer records a **daily series per commodity**: bid, ask, stock,
  days of stock left, volume, imports displaced.
- **The Gazette prints it** (it already prints a price index).
- **Prices differ between towns**, so moving goods from a cheap dealer
  to a dear one *is* the haulage arbitrage — logistics pays for itself.
- There is **no global oracle**: each price comes from one book.

## How a new player earns — concretely

1. **Public-works gigs** — the town's budget buying oil, ice, firewood,
   repairs, pest control; immediate, escrowed, growing with the player
   count.
2. **Supply gigs** — businesses restocking (the `restocks` brain), with
   the price-at-delivery fix.
3. **Dealer bids** — gather a commodity and sell **on delivery**. This
   is what makes the activities players already enjoy — gathering,
   hauling, hunting, exploring — pay like a game rather than a job:
   *go fishing, sell fish, have coin in hand.* Consign-and-wait is what
   feels like a job.
4. **Piecework seats** — bartending and the like, paid per unit of work.

Wage employment, autonomous hiring (credit's missing `hires` brain) and a
house's first wage come later, on revenue this creates.

## Lens pass

1. **Pedagogy** ⭐ — import substitution, a ceiling price, a spread that
   pays for storage, seasonal arbitrage and a public budget are real
   economics a player learns by doing.
2. **Creative expression** — a dealer is rows; a second dealer is
   somebody else's commodity on the same mechanism.
3. **Immersion / participation** — imports are the honest fiction of the
   clone backstop; the town has a dealer-shaped hole a player can fill.
4. **Values** — every coin paid to a player has a reason; nothing is
   minted for activity; the Gazette shows what is imported.
5. **Continuity** — none special.
6. **Economy** ⭐ — produces money flow to players from public budgets
   and circulation; consumes goods institutions need; the payer is the
   treasury (via the polity) or a dealer's customers; the demand was
   there first — the infirmary needs ice whether or not anyone sells it.
7. **Governance** — budgets, tariffs and local-buy preference are policy,
   owned by the polity's finance office.

## Non-goals

- **Private NPC consumption as a money flow.**
- **Monster-drop loot**, or any reasonless faucet.
- **Disturbing the ice build.**
- **A global price oracle.**
- **Auctions** — [auction-slate](auction-slate.md).
- **Deciding what imports cost** — tunable.

## Open questions

1. **Where the dealer lives** — a business kind beside the producer and
   shopkeeping trades, or its own `trade-dealing` pack.
2. **The first public budget** — which institution and which commodity
   after ice (lamp oil is half-shipped already).
3. **Piecework's first venue** — Dave's Bar, paid per drink served?
4. **Multi-town from the start**, or one locality's series first.
