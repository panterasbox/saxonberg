# Economy slate (working doc)

> **Status: physics settled, build the currency slice; macro deferred to
> a real game.** The *micro-physics* of value — how it enters the world,
> how it's carried, how a transaction clears — is worked out far enough
> to build a basic currency system. The *macro-economics* — faucet/sink
> balance, inflation, whether the loops actually hold at population scale
> — is explicitly parked. Those are tuning problems, and you can't tune
> an economy against physics; you tune it against a running game with
> real players in it. Build the honest substrate now; solve the balance
> when there's something to measure.

Working slate for the **economy** — currency, value, crafting inputs,
and trade. The governing claim, and the reason this isn't filed under
the deferred RPG/game-design layer: **an economy is physics, not game
design.** Stats, progression, and combat balance are game design (and
stay deferred). But how matter and money enter, move, and leave the
world is a conservation problem with in-world rules — substrate, the
same as light or containment. Design the physics now; let the game
design that rides on top come later.

See also:

- [docs/subsystems/glob.md](../../subsystems/glob.md) — fungible stacks.
  **Coins and raw materials are already modeled.** A coin-stack is one
  `Globbable` Stuff with a `quantity` field; so is a pile of ore.
  Split / merge / `applyQuantity` already work. Currency is the
  simplest possible glob; the economy mints no new money substrate.
- [docs/subsystems/quantities.md](../../subsystems/quantities.md) —
  `Quantity<U>` value object. The shipped precedent for "numbers don't
  leak into the fiction as bare scalars."
- [docs/lenses/endogenous-value.md](../../lenses/endogenous-value.md) —
  **this slate's philosophical spine.** Effort-anchored value (skills,
  rank) must trace to real worth; pure-play value (your dorm, a maker's
  pride) may be arbitrary. The economy is where the two can get
  confused — the Goodhart seam.
- [docs/subsystems/chat.md](../../subsystems/chat.md) — Channel substrate.
  The emergent auction channel rides here (see *Transaction clearing*).
- [docs/slates/tails/recognition-slate.md](../tails/recognition-slate.md) — a
  vendor's stance varies by *who you are*; that's recognition. The
  economy forward-links to it but does not depend on it (v1 stances are
  flat).
- [docs/slates/scoped-authoring-slate.md](./scoped-authoring-slate.md) —
  player-owned shops are an authorship surface (the dorm-room
  endogenous-value move pointed at commerce).
- [docs/roadmap.md](../../roadmap.md) — the "Economy / currency" and
  "Crafting" surfaced-but-deferred entries. This slate is the design
  for that backlog.
- [docs/slates/builds/cooperative-slate.md](./cooperative-slate.md) — the
  **governed macro layer** that rides on this physics. The deferred
  macro-economics below (faucet/sink balance, inflation, deliberate
  value-injection) is handled there by the **reserve + legislature** as
  ongoing monetary policy (the reserve is the *only* mint → the money
  supply is governed and auditable; central banking as governance, not
  dev-patching). Capital injection + producer-influence both measured
  along the authorial subdivision (Locality/zone/group/access).

---

## The two laws

Everything below falls out of two rules. They're the whole house style
for this subsystem.

### Law 1 — Count things, don't price things

**Quantity is numeric and honest; value is qualitative and emergent.**

- You may read how *many* coins or how much ore you have — that's a
  tally, and tallies are legitimate (it's the `glob` count, free).
- You may **never** read a number that asserts a thing *is worth* N.
  Worth is never a stored, displayed, authoritative property of an
  object. It surfaces only through trade — what someone will give you.

The honest reading of the principle, sharpened against reality (see
*Transaction clearing*): the **system** never computes or asserts a
price. Players will *gossip* a de-facto going rate, and that's fine —
gossip is non-authoritative, laggy, gameable, and personal. What never
exists is the object-property "this blade is worth 12." A price is an
**event between two parties**, not a **property of a thing**.

This is the same trick `Quantity<U>` and the `Light` value object
already pull: the ledger underneath is perfectly numeric; the number
just never leaks into the fiction as a score.

### Law 2 — Never tax absence; never demand scheduled maintenance

The economy's sink (value leaving the world) rides on **activity the
player opted into**, never on the clock running while they're away.
Stated as the prohibition it is — call it the rule learned from the
survival-MMO upkeep treadmill that drives players out:

> **Use consumes. Neglect-of-things-in-flux degrades. Mere ownership
> and absence cost nothing.**

- **Consumables** are spent by use — food eaten, torch burned, reagent
  consumed. Expected, not punishing.
- **Tools wear with use, not with the clock.** A blade dulls because
  you cut with it, never because time passed while you were logged off.
  Repair is then an opt-in *service* (a smith — a mild, diegetic fee
  sink) or self-maintenance (a whetstone — a consumable sink). You
  never pay rent on an idle tool.
- **Things-in-flux** degrade because you put them in flux: a campfire
  burns down, cut flowers wilt, perishables spoil. Active states you
  chose, not background bills.
- **Treasured / authored / carried things don't decay.** Your dorm,
  Gus's watch, the blade on your wall. *Care is the protective force* —
  and care usually means keeping a thing close or not using it up,
  which is free and intentional, the same soft-diegetic-limit principle
  as "Gus's watch is protected by being carried, not a flag."

The test for any fee: do you pay *because you did something* (repair
after a long expedition) or *because time passed* (rent)? The former is
fine. The latter is banned. **No property tax, no rent on owned space,
no upkeep-or-it-decays.** Service fees only at the point of a service
rendered.

### The two scarcities — and the one Law 2 doesn't govern

Law 2 governs **in-game property** — a game-design conceit to respect
player time. But there is a second resource that isn't in-game matter at
all: the **real substrate** the world runs on. Two scarcities, opposite
in nature:

- **Content is non-rival.** Infinitely copyable; CC by default (on this
  instance). It is *never* the scarce thing and is never enclosed past the
  no-pay-to-win firewall — you can fork anything, make a generic, build
  your own. Idle content is cheap storage: free, per Law 2.
- **Compute / memory is rival.** The one *real* scarcity (alongside the
  self-imposed scarcity of in-game coin). This is the actual "land" — your
  running process eats RAM/CPU no one else can use at that instant.

Because compute is *real* scarcity, allocating it optimally is an
engineering necessity, and the right tools apply (a rule-bound market /
quota — see the tenure module in the
[amendment library](./amendment-library-slate.md)). Law 2's surface rule
("no rent on owned space") was written for in-game property and does **not**
straitjacket the compute substrate. The narrower kernel that *does* govern
compute is **presence is never the meter**: compute is metered by **use**
(a running zone consumes the rival resource, the way a torch burns only
while lit), and the bill is paid in **engagement + capital**, never in
player attendance — a loved zone earns its own compute; you never log in to
feed a meter.

A clean consequence: idle/inert holdings consume ~nothing, so they cost
~nothing (Law 2's "mere ownership is free," preserved) — which means you
**cannot hoard the scarce thing by squatting inert namespace**, and no
holding-tax is ever needed; the rival resource **self-rations through use.**
The only residual is name-squatting on inert claims, handled by
**abandonment-reversion**, not a fee. The *governance* of all this (the
protected tenure floor; the homestead / charter / commons regimes) is the
cooperative's job
([cooperative-slate.md](./cooperative-slate.md) § *How territory is held*);
the **physics** is just these three rules — content free, compute
metered-by-use, presence never the meter.

---

## The economy is a closed conservation loop

Four stages. Matter enters at extraction, gains value at
transformation, moves through circulation, leaves through entropy.
Conservation holds across all four — nothing is minted from nothing,
and the only true faucet is the world regrowing itself. This is the
EVE / Path-of-Exile lineage (production-and-loss) deliberately chosen
over the WoW lineage (loot-and-currency printed from respawns), because
a printed faucet inflates by construction and a gear treadmill stops
value from ever accreting.

### 1. Extraction (the faucet)

Renewable nodes — veins, forageables, wood, herbs — refill slowly. The
regrowth-vs-harvest rate is **the** macro tuning knob (and one of the
deferred-to-a-real-game problems). Discipline: raw materials are
**abundant but never free.** Value lives in the *transformation*, not
the raw input. **No monster-drop loot faucet** — high-value goods never
spawn; they're only crafted, so every valuable object has provenance.

### 2. Transformation (crafting — the value-add and the learning cash-out)

Raw → goods. This is where effort gets minted into worth, and — in the
education vertical — where learning cashes out diegetically: a recipe is
*knowledge*. Inputs are consumed (conservation); the output is stamped
with provenance (who made it, from what). **Crafting depends on the
maker's skill — but the economy does not design the skill system** (see
*The skill seam* — this is the boundary with the deferred gamification
layer). Quality is handled below; it is never a 0–100 slider.

### 3. Circulation (trade)

Goods move via the currency + clearing model below. The lever that
keeps NPCs honest: **merchants are bounded, not infinite.** A merchant
buying ore runs low on coin; a baker runs out of bread until resupplied.
NPC commerce is a *participant* in the loop, not a money printer or an
infinite sink — the opposite of the classic MUD shop with infinite
stock and infinite coin at fixed prices. Two conservation-clean shop
models fall out, and the *default* matters: a **bounded merchant** buys and
sells with real, finite coin (won't pay for junk it can't resell — the
solvency filter *is* the anti-vendor-trash rule), and a **consignment /
broker** lists your goods for a commission and **never buys** (zero capital,
no faucet). Consignment is the safe way to "sell to a shop" — because the
one thing that invites arbitrage and the vendor-trash faucet is a shop that
*buys at a fixed price*, so the default shop **sells and brokers, it does
not fixed-price-buy.** The conservation constraint isn't a limit on shops;
it's what makes worthless swords *stay* worthless — no shop can pay real
coin for what has no buyer.

### 4. Entropy (the sink)

Governed entirely by Law 2. Entropy is the honest, always-present sink
(riding on opted-into activity); judicious service fees are a mild
secondary drain charged only at the point of service. Treasured /
authored / carried things are exempt.

---

## Currency: hybrid (soft coin + barter)

- **Soft coin** — a light abstract currency (a `Globbable`) for everyday
  and NPC convenience. Gives new players a legible floor.
- **Barter + provenance** — high-value goods trade without a fixed
  price; worth is relational and carried by the maker's mark.

Chosen over both pure-commodity (PoE-style "currency *is* reagents" —
maximally anti-inflation but illegible to newcomers) and abstract-coin-
only (simplest, but the lineage that reliably inflates).

---

## Banking — cash, accounts, and the central-bank firewall

The money model is **two-tier**, and deliberately **real-finance-accurate** (the
educational bet, applied to money — it should exercise *what makes banking work,
and notably what makes it fail*).

**Cash vs. accounts — and large cash is untenable by *physics*, not rule.**

- **Cash** — the soft coin is **physical matter** (`Globbable`, with per-coin
  **mass**): hand-to-hand, immersive, small, **off-ledger**, **robbable**, and
  **self-limiting** — a big enough stack blows past your carry capacity (the
  shipped `LoadBearing`/encumbrance), so you *can't* practically haul a fortune
  in coins. No arbitrary cash cap; the honest physics *is* the cap. The
  **denomination ceiling** is the tuning dial (keep it modest → large value =
  large mass → cash stays small).
- **Accounts** — weightless **balances** on the **auditable ledger**, where the
  real economy lives (payroll, large purchases, the till, the reserve). A
  **bank** bridges the two (`deposit` cash → balance, `withdraw` → cash).
- **The payoff:** discouraging large cash *forces the big economy onto the
  governed, auditable ledger* — **anti-laundering by mass**, no rule required.
  "Off the books" means off the in-world *governed ledger* (dodges in-world
  taxation/recourse) — **never** secret from devs/system logs; a roadblock, not
  privacy. Portable stores of value (gems, metals) *will* enable an off-books
  grey market — don't fight it (you can't); make it **frictional**
  (illiquid/indivisible, robbable, uninsured, not legal tender) so the on-ledger
  economy wins on convenience.

**Two kinds of bank, firewalled.**

- **Central bank = the reserve**, operated **totally independently** from the
  commercial banks: monetary policy, the **only mint**, the auditable supply,
  and the **insurer / lender of last resort**
  ([cooperative-slate](./cooperative-slate.md) § *The reserve as central bank*).
- **Commercial banks = corpo-run** — a **competitive, ethos-flavored vertical**
  (Goodkin's warm retail bank · Vionne's elite private bank · Aevex's fintech ·
  Veshko's ruthless lender — [corpos-slate](./corpos-slate.md)). Because your
  bank is *where your money lives*, **choosing a bank is a standing
  corpo-affiliation** (passive approval, with character). **Player-run banks are
  the deferred apex / independent-finance path** — gated on a stable economy
  *and* the reputation system (no lending without creditworthiness); don't lead
  with them.

**Phasing — safe rails now, the real finance science later.**

- **v1: custodial + payments.** Banks hold deposits 1:1 and move money. No
  lending, no creditworthiness needed — and a purely-custodial bank **can't
  fail** (your money's in the vault). The rails.
- **Later: lending** (gated on the reputation system → creditworthiness):
  fractional reserve, interest, the spread, credit creation — and with it the
  **real finance science: bank runs, insolvency, failure.** A bank *can* fail,
  and the **causes are the lesson** (over-lending, bad loans, the maturity-
  mismatch run). The **consequence lands on the operator** (a corpo's banking
  arm collapsing is a *world event*; a player banker loses their bank) — but
  **depositors are insured by the reserve** (FDIC-style), so the drama never
  costs ordinary players their savings. Real science *and* fun-preserving — and
  the reserve's backstop role is *why* it's the independent central bank.

---

## Quality is a verdict, not a property

"Quality" is not a measurable thing — it's a *judgment about fit*, and
treating it as a single ladder smuggles in an objective "best," which is
false. The honest decomposition:

- **What's real and measurable is the property bundle** — a blade has a
  mass, a length, an edge geometry, a hardness, a balance point. Some in
  real units (grams, cm, degrees); some as **graded ordinal bands**,
  which is *how the real world actually grades materials* (diamond
  clarity, lumber grade, Prime/Choice/Select) precisely because the
  thing is multidimensional. A grade *is* the real unit for "how good is
  this material" — not a dodge from real units, the honest form of them.
- **"Quality" is the fit between that bundle and a purpose**, rendered
  by an observer. Different observers, different purposes, different
  verdicts on the same object. That disagreement is a market having a
  genuine argument about worth — the engine of trade. Same kind of thing
  as value (Law 1): anchored to measurable substrate, never reducible to
  a displayed number.
- **Properties are real; their *effects* are diegetic events, not stat
  math.** A brittle blade *chips or shatters on a hard parry* (a narrated
  event), not "−3 durability/hit." A keen edge *bites where a dull one
  slips.* Same pattern the Thermometer already ships: measure honestly,
  let consequences be in-world events, no damage spreadsheet. This is the
  guardrail that keeps the economy out of RPG-balance territory.

**Honesty discipline (props real or cut): don't model a property nothing
reads.** Edge-angle is vapor until cutting exists to consume it. So the
v1 surface is tiny — *material grade* (carries provenance + sets the
achievable envelope) and *condition* (the entropy state from Law 2).
Richer properties accrete only as the systems that read them ship
(combat mints edge and brittleness; cooking mints freshness and heat-
tolerance).

### The skill seam (the boundary with the deferred layer)

Crafting touches skill at exactly **one point**, and it is a *seam, not
a dependency*: "skill = control." At the moment a craft resolves, it
asks the skill system *"how good is this maker at this craft?"* and
turns the answer into how tightly the result lands on the intended
property bundle — a novice scatters and produces defects; a master hits
spec and can target the extremes of the material's envelope.

**The economy does not define the shape of that answer.** Advancement is
tied to gamification and is deliberately undesigned for now; skill may
end up a number, a band, anchored or not. Whatever it becomes feeds that
one lookup. Crucially, even if skill is "just a number," it stays on its
own side of the seam: it's consumed to produce *control*, and what comes
out is still a verdict (item quality), never a displayed score. "Skill
is a number" and "count, don't price" live on opposite sides of the
membrane and don't collide.

> Everything load-bearing in this subsystem is an **ordinal grade** or a
> **relational verdict** — material grade, item quality, value, and
> (when designed) skill rank. Nothing is a free 0–100 dial. That's one
> house rule, not four.

Provenance does the work a quality number can't: because you can't read
quality off an object, **who made it becomes the signal** — exactly why
real history used maker's marks and hallmarks. Reputation attaches to
the maker; a master's mark can't be farmed or printed (anti-inflation,
and intensely NPC-flavored).

---

## Transaction clearing: stance, not property

The linchpin that makes Law 1 coherent rather than mystical: **a price
isn't a property of an object; it's the momentary outcome of two agents'
stances meeting.** The number doesn't live on the blade — it lives in
"the maker is currently willing to let it go for twelve." Relocate the
number from the *good* to an *agent's willingness* and you keep the
number transactions need while honoring "objects have no price." The
number exists transiently, at the instant of clearing, then is gone; it
never stamps the object.

Three ways stances meet, by transaction weight (mapping onto the hybrid
currency):

1. **Commodity (soft coin)** — a standing stance you accept or walk away
   from. The baker hands over bread for a couple coins. Looks like a
   vendor price, but it's "the baker's current willingness" — varies by
   who you are, by supply, by relationship. A vendor *with a soul*, not
   a price tag. Near-zero friction (you don't haggle over bread) — the
   time-respect valve.
2. **Bespoke (barter + negotiate)** — two stances converge. Where
   provenance-laden goods trade; the rate is invented for that one
   exchange between those two parties and evaporates after. High
   friction, paid only for things that earn it. The layer where "no
   price" is literally true.
3. **Social (gift / favor / debt)** — value moves without clearing a
   number at all; settled by relationship and memory. The most diegetic
   layer, and where NPCs live.

### Pricing is characterization

A stance's seed is **not a price table — it's who the NPC is.** An NPC's
economic stance is a personality trait: the generous one, the gouger,
the soft touch for students, the one who won't sell until you've proven
yourself. The economy's surface texture is therefore *NPCs, not menus* —
content the user wants to author. (Forward-links to recognition for
stances that vary by who-you-are; v1 stances can be flat.)

### Speech is free; settlement is sacred

The moment trade and a chat channel coexist, players create an auction
channel. **This is unstoppable, and it shouldn't be fought** — and it
isn't a defeat of the model, it *is* the model in the wild: "WTS blade
500" is one player's *stance, broadcast.* The channel is a medium for
stances, not a price authority. A trade channel is a **bulletin board**,
and a bulletin board is fine (frame it diegetically — a bazaar's hubbub,
a market frequency — and keep it a *plain* channel; the moment it gets
searchable listings or a price tab, you've built the oracle by
accident).

The line we actually control isn't speech, it's **settlement**:

> **Let the bulletin board roar. Never build the stock exchange.**

The thing that poisoned Diablo 3's auction house was never the price
list — it was *instant, anonymous, fire-and-forget settlement*: list it,
walk away, trade with the faceless market, sort by cheapest. That's what
routes around the gameplay. So **no aggregation, no price history, no
cross-listing search, no buy-it-now bots.** Clearing stays a person-to-
person act — meet, agree, hand it over. The channel may *advertise* a
stance; it may never *transact* one for you.

**Maybe-build, one item on this side:** a **safe bilateral trade
handshake** — both parties see the goods, both confirm, atomic swap — so
person-to-person clearing isn't a scam minefield ("pay first, I'll send
it… *vanishes*"). That's a trade *window*, not a market; it makes the
human handshake safe without aggregating anything. **Build the handshake,
not the exchange.** (Open: whether even this is v1, or "meet in a room
and both drop the goods" is the whole mechanism for now.)

---

## Player shops are the apex of the model, not a violation

Player-owned shops / pushcarts / vendor stalls are the *best* version of
everything above — a **stance persisted and placed in the world.** You
stock it, set your own asking numbers, put it somewhere, and people buy
even while you're offline. Offline vending is **not** the Diablo poison,
because a located stall has none of the poison's properties:

- **Located** — buyers travel to it; spatial friction intact.
- **Owner-priced** — each stall its own numbers; no gamewide rate.
  Price *dispersion*, the opposite of an oracle's convergence.
- **Un-aggregated** — comparison shopping means walking the market.
- **A place** — a bazaar of player stalls is *content*: a destination,
  social space, and an **authorship** surface (a well-stocked, well-
  decorated shop is a player's pride — the dorm-room endogenous-value
  move pointed at commerce).

The owner did the human part in advance (stocked, priced, placed); the
buyer does theirs (traveled, chose). It's still a *named* stall in a
known spot — reputation attaches, nothing's faceless.

Where the oracle creeps back is the convenience layer players ask for
next: *"let me search every shop for the cheapest blade."* That is the
Grand Exchange in a costume (FFXIV's "retainers at a market board" is
nominally stalls but ships full search/sort/price-history, so it
*functions* as an AH). The refined line:

> **Build the stalls. Never build the cross-stall search-and-sort.**
> Comparison shopping costs you a walk.

**Substrate unification:** a player cart and an NPC merchant are *the
same thing* — a located holder of goods and stances. The player vendor
is just a merchant whose stock and prices a *player* authored. One
mechanism, NPCs and players both own one. No market service, no
registry — a placeable, ownable container-with-stances plus the trade
handshake. (Leans on containment, scoped-authoring/ownership, and the
clearing model; mints nothing new at the macro level.)

---

## The bazaar must be worth the walk

The dispersion above (no directory, walk to compare) is only **texture,
not tedium**, if the walk *reveals* rather than merely *costs*. "No
directory" can't mean "same information, more steps" — it must mean **you
find things by being there.** Discovery is what the walk buys: a cart you
didn't know existed, a maker whose work you suddenly want, a rumor, a
pitch.

This is the quiet payoff of refusing the oracle. With no price ticker,
*you don't know the going rate* — you learn it by walking, asking,
remembering. **Market-knowledge becomes earned and relational**: the
regular who knows which cart runs cheap, who's holding good steel this
week, which smith comes down if you're courteous. The missing ticker is
what makes the walk an *activity* (gathering information) instead of a
toll. **Imperfect information is the feature.**

So the bazaar is a **stage, not a UI** — the carts are stagecraft, the
people are the content, and every face is a mechanic wearing character:
owner-set stances → the smith who's proud and picky; provenance → the
maker everyone walks the extra row to find; bounded stock → the bread
cart gone by noon (the market has a rhythm); no oracle → gossip as price
discovery. The anti-oracle stance was never austerity — it was *making
room for the bazaar to be a place.* The mechanic and the place are the
same decision seen from both ends: get the physics honest and the
*world* falls out of it instead of being bolted on.

---

## Corpo retail — producers, franchisers, and the market arena

The commercial-banking pattern above (banks are corpo-run; choosing one is a
standing corpo-affiliation) has a **retail twin**, and it's where the corpo
market-competition ([corpos-slate](./corpos-slate.md) Phase 2, now designed)
actually plays out:

- **Corpos are the producers / wholesalers.** They manufacture the branded
  goods the shops sell (the mark — Volk, Vionne Noir, aevex augments). The
  corpo is *upstream* (production at scale); the shop is *downstream*
  (retail).
- **Corpos franchise retail outlets.** A corpo charters / funds / brands a
  shop (a "Hollis Mart") — the corp-sponsorship mechanic pointed at retail.
  This is also the **capital on-ramp** to running a merchant shop: the corpo
  fronts capital + inventory + brand, the operator (player or NPC) fronts the
  labor, they split the margin — solving "how does a broke player stock a
  shop." Running a franchise **raises your standing with that corpo** (and
  tanks its rival's) — the retail twin of "your bank is a corpo-affiliation."
- **Shops are the corpo-competition arena.** "Whose franchises win the
  street's consumers" *is* the market-share competition from the corpo
  closure. Hollis Marts vs. Vionne boutiques contesting the same shoppers —
  the rivalry made concrete and visible in the bazaar, not asserted.

None of this mints: franchise capital, wholesale purchases, and retail sales
are all transfers (the corpo's real budget → inventory → consumer coin →
back). The corpo is a **bounded participant** (the *Circulation* rule) at
production scale, never a faucet. Player-founded corpos that could *be*
franchisers are the deferred apex; v1 = the authored corpos supply and
franchise, players and NPCs operate the outlets.

---

## Employment & economic engagement

The diegetic concept is plain: **a business needs labor, and labor is
satisfied by whoever's available.** Player-to-player markets for goods and
services stay **ad-hoc and lightly touched** — the economy slate's "build
the handshake, not the exchange"; don't codify a labor market until
players force it. The canonical case is an **NPC business** (Dave's Bar)
hiring **players** to staff it. But the load-bearing generalization is:

> An employment relationship is a **role-slot whose both ends are fillable
> by either an NPC or an interactive player.**

| Relationship | Role |
|---|---|
| **NPC → NPC** | the **bootstrap floor** — the economy runs on NPCs before there's a single player |
| **NPC → player** | the **job** — a player takes a role from the NPC layer (the coin **faucet**: working for an NPC business is how players earn) |
| **player → NPC** | the **offline/scale** case — NPC staff run a player's business while they're logged off (offline-vending generalized to services; a coin **sink**) |
| **player → player** | the emergent P2P case — kept ad-hoc and light |

### NPCs are both bootstrap scaffold and disengagement backstop

Because every role is an **agent-agnostic slot**, the NPC layer plays two
roles, forward and backward:

- **Bootstrap (forward).** Genesis is a **fully NPC-staffed living
  economy** — businesses staffed, goods made, services rendered, before
  there's a single player. The first players don't hit a dead empty
  server; they walk onto a populated stage and *progressively inhabit it*,
  taking jobs and starting businesses until the lattice of role-slots is
  as player-filled as the population supports.
- **Backstop (backward).** NPCs **backfill dropped player roles.** A
  player tending the bar logs off → the NPC bartender returns → the bar
  keeps running; a player shop whose owner disengages → the NPC clerk
  keeps it open. **Player presence is additive and replaceable, not
  load-bearing and fragile** — the economy can't die from an exodus, it
  just gets more NPC-run (less vibrant, still functional) and re-vivifies
  as players return.

This is the **economic twin of the graceful-degradation philosophy** that
runs through the governance design (the separation-of-powers population
ladder, the moderation on-ramp): players present → richer and alive;
players absent → the NPC floor holds. The economic death spiral is caught
the same way quorum-to-status-quo catches the political one — dropped
roles are *caught*, not lost.

### Idle activities — the low-attention bottom tier

A big fraction of MUD logins were people parked in the lounge to *chat*,
not play. **Idle activities** give that socializer segment a low-attention
thing to accumulate — a retention hook distinct from the role/employment
hook for active players. Generalized: not just mining but a **family** of
little idle games, each a slow trickle of a different reward (ore, herbs,
fish, a little coin, progress, even study in the education vertical) — the
framework general, the activities + rewards content (the meaning-free-event
decoupling of the standard model's Part II).

The load-bearing rule, or it becomes a mandatory grind: **idle is a
retention garnish, not a production faucet.** Active play is always the
*efficient* path (need ore now → go mine, fast); idle is a *slow background
trickle* you can never *need* — so nothing is ever gated behind hours of
idling, and the deliberately-small output doesn't distort the economy as a
free faucet (Law 2: never tax absence — and never reward it richly either).

And it **converges with the employment model**: idle and hired NPC labor
are the same idea — automating the boring bottom tier — at two scales. Idle
mining is the *solo, early* form; **hiring NPC miners is the *scaled*
form.** No permanent separate idle system is needed — the personal trickle
graduates into "hire NPCs to work the bottom of your supply chain" (see the
crafting slate's *Supply chains & tiers*).

### The reserve-governed labor faucet/sink

The NPC labor market is a reserve-backed **faucet/sink pair**:
NPC-employs-player pays wages *out* (the faucet — earned coin),
player-employs-NPC takes coin *in* (the sink). Both ride NPC-business
liquidity, which the reserve floats the way it floats NPC vendors. So
"managing unemployment" is concrete and counter-cyclical: when engagement
dips, keep the NPC businesses **hiring** (faucet open, jobs available) —
governed and auditable, the same only-mint discipline. And the broader
rule holds, identical to political engagement: **economic participation is
optional but rewarding** — income is *aspirational, not survival* (no
upkeep treadmill; Law 2), so unemployment costs nice things, never your
existence, and the real churn risk is **rolelessness, not unemployment.**

### When is employment viable? — the value-add rule

A fixed wage below the value of what you produce is **dominated by
self-employment**: told to mine a *commons* gold vein for less than the
gold is worth, a min/maxer just mines it and keeps 100%. That degenerate
deal is correctly a non-starter. Employment is viable only when the
**employer adds value beyond the labor**, and takes a margin for it:
**access** to an *owned* resource (Dave's claim — you can't mine it
without him; he rents the means of production as wages), **capital/tools**
the worker lacks, **risk absorption** (a certain wage vs volatile
self-employment), **market/coordination** (he sells what you make), or **a
role** without entrepreneurial overhead.

So min/maxing doesn't break employment — the economy **sorts**: optimizers
become *self-employed entrepreneurs* (own a claim, keep the margin, eat
the risk — "player business is the apex"); employees are the risk-averse,
capital-poor, and role-seekers; **NPCs backfill the jobs players won't
take.** Two corollaries:

- **Contract structure dissolves "output > wage."** Pay a **share/royalty**
  ("keep 60% of what you mine, I take 40% rent for the claim"), not a flat
  wage — even an optimizer takes that, keeping most of the value and
  paying the owner only for access. Sharecropping/commission is the
  classic fix.
- **Employment concentrates where it's strong.** Raw extraction from a
  commons is the *weakest* case (self-employment dominates); employment is
  strongest in **transformation and services** (the workshop, the bar),
  where the employer's tools/recipes/venue/customers add value a lone
  worker can't replicate — where the economy slate already puts value.

The rule: **an employer must add value beyond the labor (access, capital,
risk, market, or role), or the job is dominated and only NPCs will fill
it** — and a min/maxer refusing a job is the correct signal that it should
be NPC-run or restructured as a profit-share.

### Crafting venues — the concrete value-add (Dave's Bar)

> A full crafting design is a **separate future doc**; this is only the
> economy-relevant hook.

Dave's Bar is the concrete form of "the employer adds value beyond the
labor." A **crafting venue** aggregates the four things a substantial
craft needs — **inputs, tools, recipes, and (optional) skilled labor** —
so the output is feasible *there* and infeasible *at home*: spirits +
mixers, shaker + glassware, cocktail recipes, bartenders. Generalize the
four-tuple per domain (smithy, kitchen, alchemy lab, loom) and it's the
spine of the whole crafting subsystem.

Why it crystallizes the economy: the venue **is** the employer's
value-add (why you buy a cocktail instead of making one at home, and why
Dave employing a bartender beats self-employment, have the *same*
answer); it's the **transformation-margin node** (buy inputs wholesale →
transform → sell retail); and it rides substrate you have (an owned
**locality**, the liquids as **bulk**, staff as **employment** slots). It
commits you to **place-based crafting** — you craft *at venues*, scaled by
complexity (trivial crafts anywhere, substantial crafts at the venue) —
which makes the *world* the economy's substrate rather than a backpack
menu. And it offers two paths at every venue: **buy the output** (the
bartender makes it — the employment path) or **rent the means and DIY**
(use the bar's stock yourself — the self-employment path), the
employ-vs-self-employ sort made concrete. NPC Dave is the bootstrap floor;
player-owned venues are the apex that grows on top.

### Wages as monetary policy — the dual mandate, and paying for roles

Once wages are the dominant coin **faucet** (working for NPC businesses is
how most players earn), the reserve inherits a **dual mandate** — the
Fed's exact pair: pay more (higher wages/bounties/role-incentives) → *more
participation* but *more coin injected* (inflation); pay less → *less
inflation* but *weaker incentive to show up.* The reserve can't minimize
inflation (it'd starve participation) or maximize participation (it'd
inflate); it **balances** them, with the **wage/incentive rate as the
policy instrument** — "managing unemployment" and "managing inflation" are
the same dial turned opposite ways. The NPC wage must also clear the
**self-employment floor** (below the value of self-employment, optimizers
won't take NPC jobs and NPCs backfill them).

**Paying for governance roles cuts both ways.** Paying gamecoin to fill
roles (mods included) is itself a monetary operation — and moderation is
the worst place for naive pay:

- **Pay-per-action is poison** — pay per ban and you've put a bounty on
  punishment (over-moderation); tie the wage to rule-breaking and you've
  made a constituency that *wants more crime.*
- **Money crowds out care** — pay turns a labor-of-love into a grind and
  draws power-seekers; the motivation-crowding effect can *lower* quality
  for trust roles.

So if you pay for roles, structure it not to break:

- **reward service, not enforcement** — a stipend for being on-duty /
  clearing the queue, decoupled from how many you punished; never
  piece-rate;
- **tie performance reward to *upheld* actions** — reward enforcement that
  survives appeal, claw back / ding reputation for what's overturned (the
  appeals judiciary + archive become the governor on the pay loop,
  aligning toward *correct* moderation, not *more*);
- **lead with standing, not coin** — reputation/honor primary, coin a
  modest honorarium, keeping money from dominating a legitimacy role.

### Substrate

Minimal: NPCs and players are both **Agents**, so the relationship is a
role with two *agent-typed* ends, indifferent to which side a connection
vs a routine drives. NPCs actually *performing* jobs depend on the
**[npc-behavior](./npc-behavior-slate.md)** brains (the real dependency,
deferred); **access/groups** handle who-may-act-where; the role-slot is a
small engine primitive, and the P2P case rides it informally — **no labor
market to build.** And where employment exists, so do **labor disputes**
(→ the appeals judiciary) and **labor policy** (→ a legislative domain):
employment is one of the seams where the economy and the polity touch.

## Buildable now — the currency slice (v1)

Enough is settled to ship a **basic currency system** without touching
the deferred macro/advancement problems:

- **Coin as a `Globbable`** (already exists) — carry, split, merge,
  count. No price display anywhere.
- **NPC vendor as a located stance-holder** — bounded stock + coin,
  owner-set stances expressed as characterization (flat by who-you-are
  for now; recognition enriches later).
- **The clearing interaction** — person-to-person, no aggregation. The
  open call is whether v1 includes the safe-trade *handshake window* or
  just "both drop goods in a room."
- **`condition`** as the first entropy field (Law 2), and **material
  grade** as the first quality band — the only two property surfaces
  until systems that read more of them ship.

What v1 deliberately does **not** ship: crafting (needs the skill seam's
far side), the player-owned shop (needs scoped-authoring + the handshake),
regrowth/extraction tuning, and any market aggregation.

---

## Open problems — deferred to a real game

The micro-physics is honest; the **macro-economics is not solved, and
can't be solved against physics alone.** Parked until there's a running
game with real players to measure:

- **Faucet/sink balance and inflation.** The regrowth-vs-harvest rate,
  whether entropy actually drains enough to offset extraction, whether
  bounded NPCs hold the line at population scale. These are tuning
  problems with no right answer in the abstract.
- **The whole advancement / skill system.** Tied to gamification,
  deliberately undesigned. The economy only consumes it through the one
  skill seam.
- **Recipes as knowledge.** How the *ability* to make things spreads
  (taught / earned-by-doing / discovered) is advancement-adjacent —
  deferred with the skill system.
- **Standalone vs. education-vertical anchoring.** The same craft skill
  is pure-play endogenous value in the standalone game (fine, arbitrary)
  but must anchor to real mastery when a vertical is attached. The
  Goodhart seam the endogenous-value lens watches; resolved by the
  advancement design, not here.
- **Player-to-player at scale, and whether players eventually demand a
  directory.** Held off (per "don't port classic MUD ergonomics" and
  "build when a real player demands it") rather than pre-built. Watch
  item, not a build.
- **Banking beyond custodial rails** (see *Banking* above). v1 ships
  custodial accounts + payments (can't fail). Deferred: **lending** (gated
  on the reputation system → creditworthiness), and with it the real
  finance science — **interest/the spread, bank runs, insolvency, failure,
  and deposit insurance**; **player-run banks** (the apex/independent path);
  the **denomination ceiling** (the cash-disincentive dial); and whether to
  lean into an off-books **grey market** as gameplay (smuggling/tax-dodging)
  or leave it inert friction.
- **Multiple currencies — dismissed 2026-07, ⭐ REFINED 2026-08-04.** See
  [currency-slate](./currency-slate.md). **The two positions do not
  actually conflict, once stated precisely** — and the distinction is the
  whole design:

  > **What was dismissed: standing multiple *live* currencies.**
  > **What is now adopted: generalizing the *issuer*, and shipping with
  > exactly ZERO second currencies.**

  ⭐ **The dismissal's reasoning below is preserved and vindicated, not
  overturned** — "every paper needs a living demand-ecosystem to be worth
  holding" is precisely *why* the new scope empowers nobody to mint a
  second currency. What changed is the recognition that the *capability*
  can sit inert and provably correct (the `grants[]` / `allowance`
  pattern), and that it is far cheaper to build against a young ledger
  than a populated one. ⚠ The Compact's currency is now the **zorkmid**
  (the rename gives `credit` back to the deferred lending subsystem).

  The original reasoning, which still stands:

  The exchange-rate/arbitrage lesson is real (corpo-treasury scrips as
  independent fiats, inventory-pressure money changers, mass-limited
  robbable arbitrage runs — the design sketch survives in this row), but
  standing multi-currency was judged **too hard to balance**: every paper
  needs a living demand-ecosystem to be worth holding, and the tuning
  surface multiplies against an economy still being balanced in one
  money. One seam stays live: **the currency reset as the CB's measure of
  last resort** — abandoning a debased currency and issuing a second (the
  Rentenmark / Plano Real move). Deliberately an *event, not a system*:
  demonetize the old paper (or let it float as collector confetti), issue
  new with a conversion window — needs only the shipped mint/drain +
  conserved supply + a governance act, no FX market. It is the ultimate
  consequence of "inflation is an accountable policy choice," and the
  cheapest honest form of the multi-currency lesson.
- **Capital markets — securities, the corpo stock exchange, monetary policy
  as a lever.** Explored and **deliberately deferred behind a working retail
  economy.** A capital market is a **derivative** — it prices claims on an
  underlying (a corpo's real earnings), so the underlying must *exist and
  produce observable value first*, or it's a **casino by construction**
  (price detached from fundamentals = pure zero-sum speculation, "robbing
  Peter to pay Paul" with no work done in between). That's also the
  real-world order — millennia of trade + banking before the ~1600s
  joint-stock exchange, and **debt before equity.** So the sequence: get the
  **retail economy circulating money productively on its own** (labor →
  consume → corpos produce & compete → *visible earnings*) → **then** the
  fundamentals exist to price. When it comes: **bonds before equity** (the
  simpler, less-speculative stepping stone); the market stays
  **fundamentals-anchored** (dividends the primary return; price tethered to
  visible corpo performance — the exchange is a *derivative of the retail
  marketplace*) and **optional depth** (never the *only* capital source —
  corpos also fund from retained earnings + reserve allocation); and it's the
  **macro layer the reserve / CB-Governor operates** as monetary-policy
  transmission (extending *Wages as monetary policy* above — idle savings →
  productive investment; a liquidity absorber; the mint/drain + a deposit
  rate as the dials). Player-founded corpo IPOs are the apex of the apex.
  Stays conserved throughout (every trade a transfer; the reserve the only
  mint) — but it is the **last** economic layer to build, not the first.

The throughline: **build the honest substrate, tune the balance against
reality.** Or, in the user's framing — you need a real game to solve the
macroeconomics, not just the physics.
