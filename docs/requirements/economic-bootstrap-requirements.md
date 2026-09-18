# The economic bootstrap — requirements

**Kind:** feature (kernel-led)
**Leads from:** kernel — the money, credit and lifecycle substrate. First
consumers: the Terminus **Counting-Houses** (Goodkin, the one chartered
bank), the **cash-and-carry and the general store** (the first shops that
own their stock), **Dave's Bar** (the first business that borrows for
wages instead of running red), and **Duncan Hall's intake** (where every
player signs the Enrollment Note).

The supply chains are nearly complete. Farming, ranching, the metal chain,
textiles, cooking, distilling, brewing and hospitality all produce, and
the shops that should carry their goods exist — as **consignment
venues**. A shop today owns nothing: a supplier parks goods on its
counter at the supplier's price, and the shop is a room. It cannot buy
stock because it has no capital, and it cannot borrow capital because
nothing in the world lends. Meanwhile money is created three ways nobody
chose — a stipend that is banked and forgotten, an opening grant to every
business, and an account that any wage may drive negative against no
creditor at all — and it is never destroyed.

This build is **the missing link between production and a market**:
capital. It puts a central bank in charge of how much money exists and
what it costs, a treasury in charge of who gets it, a ladder of credit
that starts risk-free and climbs as histories form, and a life-cycle for
players so that money given to people who leave comes home. It is
deliberately a **bootstrapping instrument** for a world of dozens of
concurrent players, mostly in one time zone, with an economy that must
run for ten hours a day with nobody logged in.

Seeded by [credit-slate](../slates/builds/credit-slate.md) (the fiscal
apparatus; this doc supersedes its Part 2 on the seat), and by the
banking substrate in [banking.md](../subsystems/banking.md).

---

## What already exists

Surveyed against master at `63651542f`.

| part | state |
|---|---|
| **the currency** | ships — one currency, the zorkmid; conservation is a hard invariant; the reserve's log is the only thing that changes supply |
| **the reserve** | ships as a **faucet with a gate** — the Governor may mint into whatever venue they are standing in, and issue coin into their own hands. No lending, no asset, no rule |
| **the Governor seat** | ships — the one economic office, authored as the disposable one |
| **a treasury** | ⚠ does not exist. A placeholder account accumulates a demo sales tax with no way to spend it |
| **chartered banks** | one — Goodkin, at the Counting-Houses, a complete business with tellers, an officer who enrolls you, a fee schedule, a withdrawal quota and a vault |
| **accounts and payment** | ship — open, deposit, withdraw, pay, wages, tips, the proprietor's draw, escrow for gigs |
| **credit** | ⚠ **none by name — three by accident.** The enroll stipend (a gift, banked on day one). Opening capital (a gift to every business on its first account). ⭐ **The wage overdraft** — a venue may pay wages it does not have, its account goes negative, and nobody holds the claim. Dave's Bar has sat at −349 with a world money supply of zero. The reserve's own dashboard reports it as an "overdraft line" it cannot control |
| **consignment** | ships — `consign`, `buy`, `reclaim`; the farm hand walks produce to the cash-and-carry and consigns it as the outfit; the general store's counter is a shelf of other people's goods at their asks |
| **the shops** | exist as venues; none owns its stock; none sets a price on anything but its own recipes |
| **spoilage, wear, consumption** | ship — the sinks that make goods finite |
| **holdings** | ship — a house sleeps when its last occupant leaves; its shell weathers on the calendar; terms say who owes the upkeep |
| **last-seen** | ships — stamped on every logout, read by nothing that decides anything |
| **positions and shifts** | ship — a seat, a roster, a wage term; nothing vacates a seat nobody shows up for |
| **the property floor** | kernel — a due-process-protected core the executive cannot seize at will |
| **Disciplines** | `business-administration`, `retail-sales`, `appraisal` ship. ⚠ **No finance Discipline** — ISCED 0412, *finance, banking and insurance*, is an empty leaf under a branch that exists |
| **overlapping slates** | credit (seeds this), currency (closed — one currency, no exchange, ever), cooperative (mutual credit; later), auction (the debt market rides it; later), incapacity (impound on a claim — the estate-freeze machinery is a cousin) |

> **Therefore what is genuinely new here is:** a reserve that *lends*
> and *buys* by rule instead of minting by hand; a treasury that spends;
> banks that lend against goods and fund themselves at the reserve; shops
> that own what they sell; an overdraft that is a loan or is refused; a
> note every player signs on their first day; and a life for a player's
> estate that ends. Everything it moves through — the ledger, the bank,
> the shops, the holdings, the seat — is already built.

## Goals

- **All money comes from one reserve, by two published rules** — a
  temporary lane that funds credit and reverses when credit repays, and a
  permanent lane that funds the state. Nobody can type a bigger number.
- **A shop can own its stock**, set its prices and keep its margin — first
  on its supplier's terms, then on a bank's.
- **Every zorkmid of credit traces to goods on their way to market**, so
  the money supply breathes with the pipeline and the only leak is
  default.
- **No account goes negative without a named creditor.** The wage
  overdraft becomes a loan with terms or a refusal with a reason.
- **NPC businesses borrow first**, under rules, and repay predictably —
  building the banks' capital and the world's credit history before any
  player asks for a line, and keeping the economy running through the
  hours nobody is online.
- **Player credit climbs a ladder gated on the ledger**, never on a
  judgment — from supplier terms, to secured inventory finance, to
  unsecured working capital — with each rung's gate a history anyone can
  read.
- **A player's first act in the economy is signing for their money**, and
  the note teaches the whole model: money is issued against a promise,
  discharged by participation, secured by what it bought, and never
  chases the person.
- **Money given to people who leave comes home.** A player's estate has
  three states — active, dormant, escheated — derived from when they were
  last seen; escheat pays debts first, sends what has a place to the
  locality and what has none to the state, and leaves every claim
  reclaimable forever.
- **The reserve's officer governs by tuning, not by acting**: they set
  the rows the rules read, watch three numbers, and hold an override
  the ledger records.
- **A `finance` Discipline exists** and borrowing, lending, and reading
  a book exercise it.

## Non-goals

- **A player-to-player debt market.** → the [auction
  slate](../slates/builds/auction-slate.md): a debt is a claim and the
  auction rides contracts. This build creates the paper it will trade.
- **Foreclosure on authored content, and the relocatable personal pack
  it needs.** → credit-slate step 6 / the content-packs slate. This
  build's collateral is *inventory*, which is liquid and already has an
  owner stamp; nothing here pledges a building or a blueprint.
- **Taxes and the full fiscal cycle** (tax → budget → appropriate →
  disburse). → a fiscal build, seeded by credit-slate Q8 and the
  amendment library's economy module. This build gives the treasury an
  account, an inflow (the perpetual), and a way to spend; the revenue
  side stays the demo tax.
- **NPC office-holders and the principal-path office.** → the
  governance backlog (credit-slate step 4). The reserve's rules run as
  the reserve's own acts, not as an NPC in a chair; no seat needs a
  non-player holder for this build.
- **Bank failure, fractional reserve, runs and resolution.** → a later
  banking build, deliberately. Under *all money from one reserve* a bank
  lends only what it holds, so failure is impossible by construction
  here; the lesson version (banks creating deposits, the run, the
  backstop) is a different world and a chosen one.
- **Interest on deposits.** → the same later banking build.
- **A second currency, an exchange, or a benchmark rate anyone else
  reads.** → nowhere, deliberately (currency slate; banking.md — *a leg
  may never cross currencies; the record carries no rate*).
- **Mutual / cooperative credit at the committee.** → the cooperative
  slate. Local underwriting is the third rung's future, not this
  build's.
- **Personal bankruptcy.** → nowhere in this build, deliberately,
  because no loan here reaches a person: the Note is non-recourse and
  business debt stops at the business (limited liability on by
  default). The 13th-module obligation — credit obliges discharge — is
  met by construction; a discharge *procedure* waits for a debt that
  needs one.
- **An economics course.** → the college slate. This build makes the
  facts visible; teaching them is the University's.

## Placement

**Kernel**, with content consumers. The reserve, the treasury, the lanes,
the ladder, the note and the life-cycle are how the world works whether
or not anyone is participating — the `/system` test — but they are also
the money substrate every pack already rides, so they extend the
platform's banking rather than forming a pack of their own.

**The test — does a second instance need code?**

- A **second chartered bank** (Vionne, Aevex, Veshko) is a business row
  with a charter and its own terms: zero code.
- A **second shop that owns its stock** is a business row and a stocking
  rule: zero code. The cash-and-carry and the general store are the
  first; the bar's rail is the third.
- A **second locality** receiving escheated property needs nothing — the
  jurisdiction is derived from where the property sits.
- A **second player** signs the same note; the note is one row.

**Vocabulary** (product-level; the plan names the machinery): *the
reserve* · *the window* · *the perpetual* · *the treasury* · *a chartered
bank* · *supplier terms* · *inventory finance* · *working capital* · *the
Enrollment Note* · *active / dormant / escheated* · *unclaimed property*
· *situs*.

## Collisions

Who already lives where this build goes:

- **The Counting-Houses** — Goodkin's hall, Wenna at the counter,
  Halloran and the Circle. The bank gains a book of loans and a line at
  the window; the Circle's raised withdrawal quota is untouched.
- **The cash-and-carry** — the farm hand's consigning beat, the counter,
  the crates standing at target. The counter becomes a shop that *buys*
  the crate on terms and sets its own ask; the hand's beat changes from
  consigning to selling.
- **The general store** — consignment over chattel, `buy`/`consign`/
  `reclaim`, the Stock counter and its reset sweep. Consignment stays as
  one way goods reach a shelf; supplier terms become the other.
- **Dave's Bar** — runs red by design today, capitalized by an opening
  grant. It becomes the first borrower for wages: a working-capital line
  from Goodkin, or a refused wage with a reason. Its par sheet and
  `house` verbs read the same book.
- **Duncan Hall** — Katie's intake and the stipend. The stipend becomes
  the Note, signed at the desk.
- **The `reserve` verb and the Governor seat** — `reserve mint` at a
  venue goes away; the seat stays and its verb becomes the dashboard and
  the Schedule.
- **Gig escrow and the work board** — per-contract escrow accounts are
  the shape a per-loan account copies; nothing changes for a gig.
- **Holdings and the dorm** — dormancy already sleeps a house and
  weathers its shell; escheat adds where the house goes.
- **Pets and livestock** — the first *placed living things* an estate
  can leave behind; situs sends them to the locality.
- **The Gazette** — gains its first economic product, the price index.
- **The Schedule of Parameters** — gains the reserve's rows, the ladder's
  gates and the life-cycle's thresholds.

## Surface decisions

### The reserve has one officer and two rules, and is independent

The reserve is headed by a **single officer** — the seat that exists
today — who does not issue money by hand. The officer sets the **rows the
two rules read** and holds an **emergency override** that the ledger
records as the officer's act. **Independence** means one specific thing:
the reserve's rows cannot be written by whoever controls the treasury.
The published rule is most of the independence on its own — there is no
discretion left to lean on — and the seat protects what is left.

*Supersedes credit-slate Part 2.* The slate proposed retiring the
Governor into a treasurer on the argument that a rule makes the seat
obsolete. The rule is kept; the seat is kept too, because the polity
should be able to *see* who is answerable for the money, and a
**treasurer** is chartered beside it. At bootstrap one person may hold
both. The levers are separate so that one can be handed off without the
other.

**The test for what belongs to the rule and what to the seat**: *could a
member read the Schedule and predict the reserve's next action?* If yes,
it is automated. If no, the officer did it and the record says so.

### Lane one — the window: temporary money, for credit

A chartered bank that has made a **secured loan** — a shop's stock,
title retained until paid — may present that paper at the reserve's
window and receive an advance against it, **at the posted rate, less a
haircut, automatically**. When the shop repays the bank, the bank repays
the reserve, and the money is extinguished. *Any chartered bank, any
eligible paper, at the posted rate, up to the haircut.* No judgment.

This is how credit expands under *all money from one reserve*: banks
cannot conjure deposits, so the reserve funds every loan, and every
zorkmid of credit traces to goods on their way to market. The supply
breathes with the pipeline.

**Eligible paper** in this build: inventory finance (rung 1) only.
Working capital (rung 2) is funded from the bank's own capital — fees,
royalty, retained margin — so a bank's unsecured lending is bounded by
what it has earned.

### Lane two — the perpetual: permanent money, for the state

The treasury issues a **perpetual** — a claim the state pays on forever
and never redeems — and the reserve buys it by rule: **money per active
member**, the one denominator that scales with the player-base. The
proceeds land in the treasury's account. That is the injection, and it
is permanent because a perpetual never comes due.

**Everything fiscal is spent from that account, by the treasury** — the
Enrollment Note's principal, any opening capital, any subsidy, public
works, the floor. Nothing mints at a venue ever again. `reserve mint`
stops fusing *create money* with *give it to whoever I am standing next
to*; the treasurer's act is *appropriate*, and it names its destination.

No debt ceiling (decided in the slate). The consequence is stated: the
money supply is whatever the rule says, and the treasury's budget
constraint is the rule, not a limit.

### Banks lend what they hold

A chartered bank's balance sheet is **capital + deposits + window
advances**, and its loans may never exceed its capital plus its window
advances. Deposits are custodial and always payable. There is no
fractional reserve in this build, and therefore no run; the **deposit
guarantee** is a stated promise of the state that costs nothing to make
here and is what a later banking build will lean on.

Only a **chartered** bank may take deposits or present paper at the
window. This is the Ginko lesson: an unlicensed in-world bank that takes
deposits and promises returns is a Ponzi by default.

### The ladder — four rungs, gated on the ledger

| rung | who lends | secured by | who may borrow | the gate |
|---|---|---|---|---|
| **0 · supplier terms** | the supplier | the goods — title retained until paid | any shop, NPC or player | none — day one |
| **1 · inventory finance** | a chartered bank, funded at the window | the goods, with the bank's lien | a shop with a clean purchase history | *N* completed terms with no repossession |
| **2 · working capital** | a chartered bank, from its own capital | unsecured | a shop with a repayment history | *M* inventory loans repaid, none defaulted |
| 3 · the debt market | anyone | whatever is pledged | anyone | out of scope — the auction slate |

Every gate is a **read of the borrower's own ledger** — completed terms,
repayment legs, default legs. Nobody judges. The numbers *N* and *M* are
Schedule rows.

**Rung 0 is consignment grown up.** The supplier still owns the goods
until paid — which is exactly what consignment already tracks — but the
**shop sets the price and keeps the margin**. Repossession of an unpaid
crate is a query over who owns it. No money enters the world; trade
credit is the oldest and largest kind, and it is risk-free to the world
because the goods can be taken back.

**Rung 1 is the real-bills rung.** The loan buys goods, the goods secure
the loan, the sale repays it. Self-liquidating. Default means the bank
repossesses the stock, and the reserve is repaid from that or eats the
haircut.

**Rung 2 replaces the wage overdraft.** A business that cannot meet
payroll draws on a working-capital line if its history has earned one,
or the wage is **refused with a reason the proprietor reads** — never
silently paid from nowhere.

### Repayment is income-contingent, and there is no clock

A loan is repaid as a **share of each inflow** to the borrower's
account, to the creditor, until principal and interest are cleared. No
maturity, no due date — a deadline is a clock, and the house refuses
clocks. **Default is revealed, not scheduled**: a loan whose borrower has
had no inflows for a Schedule-row number of game-days while a balance is
outstanding is in default, and the creditor may act. The share and the
default horizon are Schedule rows; a bank may post its own share within
the Schedule's bounds.

### Rates are the lender's own standing offer

A bank posts its rate as its own terms, the way it posts its fees. The
reserve posts the **window rate**. There is no benchmark object; if the
Gazette wants to print "the prime is eight," it surveys the banks and
prints journalism, which is how the real prime rate works.

Rates are **quoted per game-year, with the 12× conversion written beside
them** — a game-year is a real month, and 5% per annum compounds visibly
inside one. Starting rows: **~5% per game-year** at the bank (the
three-millennia anchor for safe credit), **window rate = bank rate + 3**
(a penalty, so the window is used in need rather than for profit),
**haircut 20%**. All the officer's to tune.

### The default rate is the inflation dial

Credit that repays is created and destroyed; it is not a faucet. Credit
that defaults is money that went out against goods that never came to
market; it is the faucet. Therefore **the net money-supply effect of the
credit system is its default losses**, and the default rate — a ledger
query — is what tells the officer how far up the ladder the world can
afford to be.

### NPC businesses borrow first, and are the market-makers

At dozens of concurrent players the NPC shops are the majority of
borrowers and the *only* ones for ten hours a day. An NPC shop executing
a **stocking rule** — buy on terms when stock falls below target, sell
at an ask derived from stock against target, repay from inflows — is a
predictable repayer. NPC credit builds the banks' capital and the world's
histories before any player asks. It also makes the market: an order
book with a dozen players is empty, and a shop that always posts an ask
derived from its shelf is the market-maker a thin market needs. An NPC
following a pricing rule is still a party posting a price — an offer,
never an oracle.

### The Enrollment Note

At intake the player **issues a note to the treasury** and receives the
principal. The player is the issuer; the treasury holds the note. The
first instrument in the game is one the player wrote, and its face
teaches the model:

- **Principal** — the stipend. Money entered the world against this
  promise.
- **Rate** — 0%, *the Compact's rate for enrollees*.
- **Discharge** — forgiven when the player **earns their first wage**, or
  after a Schedule-row number of game-days active, whichever comes first.
  *You earn it into being yours.*
- **Security** — the balance it funded. Self-liquidating, secured by what
  it bought: the same instrument the shops use.
- **Recourse — none beyond the security.** ⚠ Load-bearing, not fine
  print. A note "forgiven by work" reads as an indenture unless it says
  this line. Walk away and the worst case is the unspent balance goes
  home. **No labor is ever owed.**

It is signed at the desk — Katie's intake already walks a new player
through the real verbs — and it is visible afterward in the player's
wallet as a thing they hold. It replaces the bare stipend and the bare
opening capital: a business's opening capital is the treasury's advance
on the same terms, secured by the business's account.

### Three states of a player, derived from last-seen

**Active / dormant / escheated**, computed whenever anything asks — a
login, a wage landing, a title check — never by a sweep. Thresholds are
**real time**, not game time (this is a statute about a person's absence,
and at 12× a game-year is the wrong unit), and they are Schedule rows.
Starting rows: **dormant at 30 real days; escheat at 180**. The kernel
floor is **due process only**: notice before escheat, a reclaim window
during dormancy, and money reclaimable without limit.

**Dormant** is not one switch — it is each thing's own "nobody's here"
rule, most of which already exist:

- The **account** freezes: no draws, no transfers out; only what the
  world owes lands in it.
- A **position** vacates on its own short clock — a seat nobody shows
  up for is not theirs. Days, not weeks; a Schedule row.
- A **holding** sleeps and its shell weathers, as it already does.
- A **player-owned business closes** on the same short clock as a
  position: no shifts run, no wages post, consignors may reclaim, stock
  spoils honestly, customers find a shut door. Activity-gated, not
  presence-gated. The discipline against absentee farming is that
  running a shop in your absence costs a manager's wage; the closed sign
  is the backstop for when nobody is paid to be there either.

**Escheat** is a treasury act executed as a rule, on the next touch.

### Debts first, then situs — and the estate is the limit

An estate pays what it owes before anything escheats: **senior liens
repossess** (the bank takes the stock), **the Note is recovered**, then
what remains is disposed of by **situs**:

> *Does leaving it unattended for a year cost anyone nearby?*
> **Yes → the locality. No → the state.**

| asset | → |
|---|---|
| residence, parcel, plot | the locality — it weathers on the neighbours |
| pets, livestock | the locality — they need care today |
| chattel lying in the world | the locality, or finders-keepers at the locality's option |
| a business's premises and shelf stock | the locality — a dead frontage |
| a business's account | the state |
| balances, notes, securities | the state — **reclaimable forever**, because the state cannot default |
| authored content | the state, **in custody** — authorship is inalienable; the pack stays credited and reclaimable, and the locality may license it to keep a shop open |

The jurisdiction is derived from where the thing sits; nobody assigns it.
**The estate is the limit**: nothing chases the person. Limited liability
is on by default.

**Unclaimed property.** An account is never deleted. Its balance moves
to the treasury with a durable claim record, and the owner — or their
heir — reclaims it on return, whenever that is. The escheated balance
is, in effect, an interest-free loan from the absentee to the treasury,
repayable on demand.

### Beneficiaries

A player may name a beneficiary; at escheat the estate passes to them
instead of the treasury. The beneficiary is dormancy-tested in turn (a
dormant heir chains onward), and inherits no exemption from any floor or
cap. **The Note is recovered before anything passes** — so ten one-visit
accounts naming one heir pass that heir nothing, because nothing was
earned.

### The officer watches three numbers

- **Money per active member** — the issuance rule's own input.
- **The default rate on window paper** — the inflation dial.
- **A price index over a basket of NPC-shop asks** — inflation you can
  see. Not an oracle: NPC shops post asks continuously, an index over a
  basket of them is journalism, and the Gazette prints it.

The reserve's dashboard stays **per currency and never totals**.

### A `finance` Discipline

ISCED 0412 — *finance, banking and insurance* — under the existing
business branch. Exercised by borrowing, lending, presenting paper, and
reading a book; `appraisal` (valuing collateral) and
`business-administration` (running one) already ship beside it.

## Retrofit — districting the 1.0 content

The design above is a framework; the world it lands on was authored
before it. This section is the survey the doc was light on — **who holds
what today, where the fault lines for control and liability sit, and the
redistricting the bootstrap does on its way in.** Decided in
conversation 2026-09-18; the items are content moves, two seats and two
gates, not new design.

### The doctrine it applies

Three sentences, each already the polity's:

1. **The committee is the ultimate authority over its extent, bound by
   the same economics as everyone on it — and therefore where fault lies
   when an institution on it fails.** It was that committee that should
   have moved the price, the rate or the stocking rule. It cuts both
   ways, and it is what makes *"they're not gods"* true.
2. **A committee assignment is governance; a position is a job.**
   Committees are **players only** — never an NPC, never conferred by
   being hired. A teller at Goodkin works for Goodkin; they do not author
   it.
3. **Standing follows liability.** Producer influence goes to whoever
   the failure would land on; the customer who buys out the shelf can
   never be blamed for the shop closing.

### Who holds what today

A committee is whoever holds parcel title; title is claimed in pack
manifests; every group is minted empty at boot and falls back to the
founder. So every committee below is the founder today, with one
exception noted.

| committee | extent(s) | institutions on it |
|---|---|---|
| `terminus` | terminal, counting-houses, general-store, market, registry, realty, university-avenue, mayfield-row, estuary, delight-road | the bank hall, the general store, the market + bakery, the Registry, the land agents, the haulage depot, the city budget |
| `rejection` | rejection, hanging-wood, kestrel-road | the whole metal chain — mine co-op, fringe outfit, fuel yard, provisioning, smelter |
| `hearts-delight` | hearts-delight | the farm, the mill |
| `hearthworks` | hearthworks | smithy, cookhouse |
| `lounge` | `/world/lounge` | Dave's Bar |
| `duncan-hall` | duncan-hall, dorms | intake, the dorm |
| `hinkley-hills` | the district, lot-1 | — |
| `newbie-wilds` | newbie-wilds | its budget, the watch, the long road |
| `mayfield-holdings` | seznick-house | ⚠ **Walter, an NPC, is a member** |
| each **trade** group | `/trade/<x>` | ⚠ **real premises** — Crowsfoot, the Hollis floor, Veshko's yard, the Wharfside mill and dyehouse, the tailor's shop, the farm outfit, the pantry / brewing / bottling floors, the cash-and-carry counter |
| each **corpo's organization** | `/corpo/<key>` | ⚠ the corpo itself — *being hired makes you an author of the bank* |
| the executive (`/world` fallback) | everything unclaimed | ⚠ the infirmary, the necropolis, the university farm |

Two more facts. **Every one of the 33 businesses banks at Goodkin** —
one lender, so "rates are the lender's standing offer" has one offer at
launch, which is fine and stated. And the fiction's four Governments
(realm, city, university, Hinkley) have one treasury among them; Heart's
Delight, Rejection, the Lounge and Hearthworks have Localities and no
government. **Situs therefore rides the title tree, never the fiction's
governments**: property escheats *up* to the parent extent's committee
(the institutions slate's rule), money goes to the state. "The locality"
in the situs table above means *the parent committee*.

### The fault lines

Where doctrine 1 is false on master, because the people who could have
turned the dial are not the people the failure lands on:

- **Trade groups are landlords.** The `distilling` committee answers for
  Crowsfoot *and* Hollis *and* Veshko — three rival marks on one
  mechanism-owner's ground, with no address, no locality, and nowhere for
  a dead floor to escheat to. The people who maintain the recipe
  substrate are the wrong people to be liable for a shop.
- **Goodkin's committee is Goodkin's staff.** The institutions slate's
  finding; decided there, not built.
- **Three institutions belong to nobody** and so fall to the executive
  — exactly what doctrine 1 exists to prevent.
- **An NPC sits on a committee** (Walter) — doctrine 2.

### The roots at launch

Three world roots, each a committee whose parent is the PM. Nothing
below them is subdivided further than it already is: **the Compact,
once seated, advises the PM on districting** — getting ahead of that is
the thing this section refuses to do.

| root | holds | committee |
|---|---|---|
| `/world/terminus` | **the realm — all 1.0 shipped content**: the city (`/world/terminus/terminus`), Hinkley Hills, Heart's Delight, Rejection, Hearthworks, the University, and the districts the trade premises move into | `terminus` (the realm); the existing locality committees stay as its children |
| `/world/saxonberg` | the second city | a parcel **to be seated by the Compact** — empty at launch |
| `/world/lounge` | Dave's Bar and the social front door | `lounge` |
| `/world/newbie-wilds` | parked — its future is undecided | as today |

The title tree *is* the situs tree: the bootstrap's escheat walks it,
which is why the world packs that sit beside Terminus today
(`/world/rejection`, `/world/hearts-delight`, `/world/hearthworks`,
`/world/eternal`) re-root under it. Pack root renames; the DB drops.

### The trades and the commons are physics, and get an officer

A recipe yield, a material density, a tool's epoch — changing one changes
the world for everyone, the way the window rate does. So `/trade/*` and
the commons (`/stuff/*` — the torches and chests) do **not** belong to
committees the way a locality does; they belong to a **seat**: one
officer, rules published, discretion recorded — the reserve's shape
applied to the economy's physics. **Trades are placeless.** Their
premises move into the world under locality committees, where they can
be liable; the trade itself is nobody's property.

The same shape for the corpos: **the concept gets an officer, the
instances get committees.** A seat over `/corpo` mints a
`<key>-committee` group for each of the five and seats it (the PM by
default, through the seat); the committee holds `/corpo/<key>`; the
corpo's organization is the show. A hired clerk is staff; the showrunner
may also play the CEO.

Three executive seats, then, beside the Governor: **the treasurer** (the
issuance design above), **the Board of Trade** over `/trade` + `/stuff`,
and **the Registrar of Corporations** over `/corpo`. Founder-established,
founder-default, like the Governor; names are the plan's to confirm
against the vocabulary.

### The three claims on a business

Every "who is liable / who gets paid / who has standing" question about a
business resolves by asking which of three separable claims is meant.
Stated once here because the bootstrap creates the first two on purpose
and had been carrying them unnamed:

| claim | what it is | what it earns | standing |
|---|---|---|---|
| **title** — or a lease, which is title for a term | control of the ground | the extent's engagement | producer |
| **equity** — the cap table | the residual: profits, and the estate at wind-up | dividends, in zorkmids | ⚠ **none** |
| **position** | a job | a wage | consumer, for the shifts |

⭐ **In-game capital stops at the ledger.** A partner who puts a thousand
zorkmids into Crowsfoot owns a share of its residual and nothing else —
no vote anywhere, no seat, no producer credit for the floor's
engagement. The Capital House is *funding the platform*; a distillery's
cap table never touches it. This is the firewall between *who owns the
zorkmids* and *who runs the polity*, and without it the first player with
a pile of money argues that financing shops is producing.

Corollaries: a player who **leases** a market stall holds it for the
term — producer for what it earns, liable when it fails — and their
hired hand is consumer. A player who merely **bankrolls** that stall is a
creditor (rung 3, the auction slate): interest in, no standing out. And
`openingCapital` was an equity stake by the treasury with no cap table
to record it on; the treasury's advance is a **loan** precisely so the
state never owns the residual of every business in the world.

### The labor line — a reading of Art. III, not an amendment

Players will argue that participating in the economy is labor, because
the economy is core to the engine. The answer is not that it doesn't
count — it is counted, in the Consumer House, at co-equal weight — but
that the three kinds are non-fungible by construction (Art. III §2), and
which house a contribution lands in is doctrine 3, a query over title:

| what you did | house | why |
|---|---|---|
| fixed a bug, kept the box up | producer, by **merit award** (Art. III §7) | work the instrumentation cannot see |
| held a committee | producer | the extent's content is yours; its engagement is the §1 measure |
| managed a business **for** an extent | a job — consumer for the shifts | the committee could have hired anyone; the committee holds the standing and the wage is the pay |
| a hired hand in a discipline | consumer | no title |
| bought, banked, borrowed | consumer | no title |
| kept the game fun with no code, bills or title | consumer × **regard** | the community's recognition is the multiplier that exists for exactly this; if it is not enough standing, the Compact seats them on an extent — which converts recognition into the only real power |

Managing an economy and participating in one differ in exactly one
testable way: **can you be at fault for it.** Nothing here measures
"kept it fun" directly; that would be a gauge, and it would be gamed by
morning.

### The retrofit list

Content and two gates, in the order they unblock each other:

1. **Re-root the world packs** under `/world/terminus/…` so the title
   tree is the situs tree (`rejection`, `hearts-delight`, `hearthworks`,
   `eternal`); `/world/lounge` stays a root; `/world/saxonberg` is
   declared and left for the Compact.
2. **Move the trade premises into the world** as rows under Terminus
   districts — Crowsfoot, the Hollis floor, Veshko's yard, the Wharfside
   mill and dyehouse, the tailor's shop, the farm outfit, the pantry /
   brewing / bottling floors, the cash-and-carry. Trade packs keep
   classes, recipes, materials and instrument rows. Districts need names
   (*Wharfside* is used twice and does not exist).
3. **Claim the orphans** — the infirmary and the necropolis under the
   city; the campus farm under the University.
4. **The three seats** — treasurer, Board of Trade, Registrar of
   Corporations.
5. **The corpo committees** — five `<key>-committee` groups minted and
   seated through the Registrar's seat; `/corpo/<key>` moves to them;
   each org's appointing authority becomes its committee. The bank
   ladder's *who could have moved the rate* is unanswerable until this
   lands.
6. **Walter off the committee** — `mayfield-holdings` becomes an
   Organization he is staff of; the title sits with a player group.
7. **Every Business row loses `openingCapital`** (the treasury's advance
   instead) and gains its stocking and ask rows.
8. **Two gates**, census-then-ratchet: *no group that holds title lists
   an agent path as a member*; *no authored field creates money* (the
   institutions slate's rule, held by the lint family).

What this section deliberately does **not** do: subdivide `terminus`
(one committee for the bank hall, the store, the market and the
registry is the city's showrunner, and that is fine at dozens of
players); decide newbie-wilds; or name the districts — those are the
plan's and the Compact's respectively.

## Lens pass

**1 · Pedagogy.** The Disciplines are `finance` (new), `appraisal` and
`business-administration`. The world is derivable end to end: the supply
is the sum of the reserve's two lanes; a shop's price is its shelf
against its target; a loan's balance is its inflows times a share; the
inflation is the default rate. The Note puts the entire model on one
screen in the first five minutes, and every claim on it can be checked
against the ledger. *The first screen is the syllabus.*

**2 · Creative expression.** A second bank, a second shop, a second
locality and a second player all need zero code — a row, a charter, a
stocking rule, a signature. The bespoke case — a bank with strange terms,
a shop with a strange stocking rule — is a row's own values inside the
Schedule's bounds. **Lenses 1 and 2 chose the ladder's shape**: supplier
terms first, because consignment already exists and a shop owning its
stock is content, not code.

**3 · Immersion and roleplay.** You owe *Goodkin*, not "the reserve";
your shop has a *closed* sign, not a flag; the crate on your shelf says
whose it still is; the note in your wallet has your name on it. Nothing
here is a gauge — every state is a thing in the world somebody can look
at.

**4 · Gamification and self-improvement.** The choice forced is *borrow
or don't* — and, having borrowed, *repay or don't*. **Standing is
conferred by your creditor**: your history is what a bank reads, and the
bank is a business with a name. The rating is revealed behaviour, never
expressed; nothing writes a player's trait.

**5 · Technology and magic.** Trade credit is Roman (*mutuum*); real
bills and the discount window are 18th-century; the perpetual is a 1751
consol; income-contingent repayment is a 20th-century instrument. The
mechanism is the same in every epoch and only the dynamics move.

**Gap recorded:** the lens pass finds no Discipline for the *lender's*
judgment at rung 3 — local underwriting is a social skill the
cooperative slate will have to name.

## The drive

Run against the live game before the MR opens, with the Schedule's
thresholds set low enough to reach dormancy and escheat inside the
session.

1. **A new player enrolls at Duncan Hall.** Katie walks them to the
   desk. They are shown the Enrollment Note — principal, 0%, discharge
   on first wage, secured by the balance, *no recourse beyond it* — and
   sign. Their wallet shows the balance **and the note they hold**. `look`
   at the note reads every term in words.
2. **They walk to the cash-and-carry.** The counter's crates now carry
   the *shop's* ask, not the farm's. `look` at a crate says it is held
   on the farm outfit's terms until paid. `buy` a lime; the shop's
   account, not the farm's, receives the sale, and the shop's book shows
   what it still owes the farm.
3. **They take a shift at Dave's Bar and earn a wage.** The moment it
   lands, the note discharges: a message says so, the wallet no longer
   shows a note, and the balance is theirs.
4. **As the reserve's officer, `reserve`.** The dashboard shows two
   lanes — the perpetual held and window advances outstanding — and the
   three numbers. `reserve mint` at a venue is **refused**: issuance no
   longer names a destination.
5. **As the treasurer, appropriate** from the treasury's account to
   Dave's Bar. The bar's account rises; the treasury's falls; the world
   supply is unchanged.
6. **Watch an NPC shop borrow.** The general store's stock falls below
   target; its stocking rule buys on terms; the shop presents to Goodkin;
   Goodkin presents at the window. The ledger shows the advance land,
   the sale, the repayment share flow back, and the reserve repaid.
   Goodkin's book shows the lien while it stands and its release when
   paid.
7. **Open a player shop.** Buy stock on supplier terms. Apply to Goodkin
   for inventory finance: **refused, with the reason** — no completed
   terms yet. Complete the Schedule's *N* terms; apply again; granted.
8. **Dave's Bar cannot meet payroll.** The wage is not silently paid
   into the red. With a repayment history it draws on a working-capital
   line and the proprietor is told; without one the wage is refused and
   the proprietor is told why.
9. **A borrower stops trading.** Past the default horizon with a balance
   outstanding, Goodkin repossesses the pledged stock; the reserve's
   default rate ticks; the officer's dashboard shows it.
10. **A player goes dormant.** Log out; advance past the short clock.
    Their seat at the bar is vacant on the roster; their shop shows the
    closed sign and its consignors may `reclaim`; their house is asleep
    and weathering. Log in as them: the account is frozen but whole;
    everything is reclaimable.
11. **A player escheats.** Past the long threshold, on the next touch:
    the note (if undischarged) is recovered; their balance sits in the
    treasury as unclaimed property; their house is the locality's. Log
    back in as them: the balance is reclaimed and **the treasury pays**.
12. **The Gazette prints the index.** Buy out a shelf; the next edition's
    number moves.

## Acceptance criteria

Observable from outside the code.

- A player who enrolls holds a note they can read, and it discharges
  visibly on their first wage.
- A player who enrolls, banks the stipend and never returns has, past the
  escheat threshold, **no balance and no note**; the treasury holds the
  principal; nothing passed to any beneficiary.
- No account in the world is negative without a loan on somebody's book
  naming it.
- The reserve cannot mint into a venue. The treasury can appropriate to
  one, and the supply does not move when it does.
- A shop sells goods at its own ask; the supplier's title on unpaid goods
  is readable on the goods; an unpaid crate can be taken back.
- A bank's loans never exceed its capital plus its window advances, and
  the window funds only inventory paper.
- Every rung's gate is stated as a number of ledger events, and a refusal
  says which number was not met.
- A loan has no due date; a loan in default is one whose borrower has had
  no inflows for the Schedule's horizon.
- Rates are shown per game-year with the real-time equivalent beside
  them.
- The reserve's dashboard shows money per active member, the default
  rate, and the index, per currency, and never a total across
  currencies.
- A dormant player's seat is vacant, shop is closed, and account is
  frozen and whole; nothing of theirs has been taken.
- An escheated player's placed property is the locality's, their
  placeless property is the state's, their content is credited to them,
  and their balance is paid back on return.
- An NPC shop keeps stocking, selling and repaying with no player online.
- The `finance` Discipline records the acts that exercise it.
- Every business's premises sit on an extent under `/world/terminus`,
  `/world/lounge` or `/world/newbie-wilds` whose committee is a group of
  players; no trade group and no corpo organization holds ground.
- `committee` at any corpo's extent names a `<key>-committee` group, and
  a newly hired teller is not on it.
- No group that holds title has an NPC member; no authored row carries a
  number that becomes money.
- The roster shows the treasurer, the Board of Trade and the Registrar
  of Corporations beside the Governor, founder-held.

## Cross-references

- [credit-slate](../slates/builds/credit-slate.md) — seeds this; Part 2
  superseded (the seat is kept), Parts 3–6 and 8–9 carried, step 6
  (personal packs) and step 7 (local underwriting) deferred to their own
  builds.
- [currency-slate](../slates/builds/currency-slate.md) — one currency,
  no exchange, no benchmark; the rate-as-standing-offer doctrine.
- [banking.md](../subsystems/banking.md) — the substrate: conservation,
  the ledger, the custodial bank, terms, the opening float, the
  overdraft this build retires.
- [governance.md](../subsystems/governance.md) — the Office substrate
  the reserve's officer, the treasurer, the Board of Trade and the
  Registrar sit in.
- [institutions-slate](../slates/builds/institutions-slate.md) — the
  committee/show separation, title escheats up, the cap table, the
  no-authored-faucet rule; the retrofit section applies its Stage A.
- [access.md § The committee](../subsystems/access.md) /
  [civics.md](../subsystems/civics.md) — a committee is title, derived;
  the fiction's governments are the show and hold no situs.
- [draft-constitution.md Art. III](../governance/draft-constitution.md)
  — the three non-fungible kinds the labor line reads.
- [retail.md](../subsystems/retail.md) — consignment, the shape rung 0
  grows out of.
- [contract.md](../subsystems/contract.md) — per-contract escrow, the
  precedent for a per-loan account; breach as the default precedent.
- [holding.md](../subsystems/holding.md) — dormancy, the shell clock,
  upkeep terms.
- [access.md](../subsystems/access.md) / [parcel.md](../subsystems/parcel.md)
  — title, the property floor, the locality walk situs rides.
- [char-gen.md](../subsystems/char-gen.md) — intake, where the Note is
  signed.
- [measurement.md](../measurement.md) — the no-gauge rules the dashboard
  and the index must respect.
- Related slates: [auction](../slates/builds/auction-slate.md) (the debt
  market), [cooperative](../slates/builds/cooperative-slate.md) (local
  underwriting), [incapacity](../slates/tails/incapacity-slate.md)
  (impound on a claim).
