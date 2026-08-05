# Credit slate — standing up lending, and the autopilot that runs the mint

**Captured 2026-08-04.** Opened as *"can we seat an NPC in the Governor's
chair"* and became the whole fiscal apparatus, because the honest answer
to *"what would the NPC do"* is **almost nothing — and the interesting
office is somewhere else.**

> **User: "in the beginning the CB is just gonna be run by the founder or
> someone handpicked by the founder. not everyone is going to have someone
> or have themselves the knowledge or time to commit to getting the economy
> up and running. so we're going to need to do our best to automate what we
> can… essentially we're building a bare minimum autopilot for the CB and
> assigning an NPC to run it. but hopefully the cockpit the NPC sits in can
> be the same cockpit an actual player would sit in as we're able to staff
> the office with real humans."**

> **Status: design conversation, captured. Not requirements.** ⭐ It closes
> the deferral [currency-slate](./currency-slate.md) left open — *"credit:
> WANTED, deferred, NOT rejected"* — and it is the first slate whose shape
> was decided by a **constitutional clause** rather than by the code.

⭐ **Scope, in the user's words:** *"this isn't meant to be a permanent
model for lending long term… this is really more about getting everything
online and giving players what they need to actually engage with all the
various systems we've designed."* **A bootstrapping instrument, not a
finished financial system.**

Related: [banking.md](../../subsystems/banking.md) (**the substrate — read
it first**), [governance.md](../../subsystems/governance.md) (the Office
apparatus; the Governor seat), [currency-slate](./currency-slate.md) (the
deferral this closes; quantity-not-price),
[amendment-library-slate](./amendment-library-slate.md) (the economy
module; the property floor),
[land-compute-and-license](./land-compute-and-license.md) (⭐ **the
entitlement function — it decides the collateral question**),
[content-packs-slate](./content-packs-slate.md) (kit ⊗ premises; the
relocation answer), [parcel.md](../../subsystems/parcel.md),
[chattel.md](../../subsystems/chattel.md),
[incapacity-slate](./incapacity-slate.md) (impound on a claim),
[balance-slate](./balance-slate.md) (the inalienable floor),
[cooperative-slate](./cooperative-slate.md) (the mutual-credit lineage),
[behavior.md](../../subsystems/behavior.md) +
[npc-dialogue.md](../../subsystems/npc-dialogue.md) (the brain + the
`dispatch` seam).

---

# Part 0 — What actually ships today

Surveyed, not assumed:

| | |
|---|---|
| **The entire mint surface** | ⭐ **three call sites.** `EnrollController` (the onboarding stipend), `reserve mint` (Governor-gated subsidy), `reserve issue` (cash into the Governor's hands) |
| **Lending** | none. No application, no rule, no rate, no term, no repayment |
| **The seat** | `central-bank-governor` — ⭐ the **only** one of the five offices marked `founder-established` rather than `constituted`. Authored as the disposable one |
| **The Treasury** | ⚠ **not built.** Art. VIII §4 specifies *tax → budget → appropriate → disburse*; the corpus has `remitDemoTax` and a city-budget account taking TPA fares. Fragments, no cycle |
| **A Treasury seat** | ⚠ **does not exist.** `OFFICE_APPARATUS` has five seats and the Governor is the only economic one |

## ⚠ Refreshed 2026-08-05 — the currency build merged (MR !169)

Re-surveyed against `master`. **The load-bearing claims survive**; three
things changed and one of them is a gift.

| | |
|---|---|
| **The three mint call sites** | ✅ **unchanged** — `EnrollController`, `reserve mint`, `reserve issue` |
| **`reserve mint` still fuses issuance + appropriation** | ✅ unchanged — Part 0's headline finding stands |
| ⭐⭐ **`credit` was RETIRED as the money noun** | the currency is the **ZORKMID** |
| **Conservation is now per-currency** | `LedgerEntry.currency`; **a leg may never cross currencies** |
| **`Money.of()` takes a required currency** | `Money.of(n, Currency.compact())` — build-order step 1 must thread it |
| ⭐ **`fullReconcile(currency)`** | richer than assumed — supply vs. accounts, circulation, **vault float** and **coin held offline** in `holder_snapshots` |

> ⭐⭐⭐ **The gift: the rename freed the word `credit` FOR THIS BUILD.**
> [currency-slate](./currency-slate.md) renamed the money noun partly because
> *"it gives back the word `credit`, which terminus-banking §7 needs for the
> entire deferred lending subsystem."* **This slate is that subsystem.** So
> lending can be called credit without colliding with the unit it is
> denominated in — and every ledger leg already uses `credit` for
> *direction*, which is the sense that was always going to win.

Three consequences worth carrying:

- ⭐⭐ **Reserve-by-construction now SHIPS.** `banking.compactCurrency` (an
  AppSetting, read only through `Currency.compact()`) names what the Compact
  transacts in — *"policy data, not a property of the money."* ⇒ **state
  obligations are denominated by construction**, which is exactly the
  mechanism Part 4's state lane assumed and no longer has to argue for.
- ⭐⭐ **The no-benchmark-rate answer is now ENFORCED, not merely preferred.**
  banking.md: *"the record carries **no rate**, and no reference to another
  currency… every reader would get an authoritative cross-currency rate for
  free."* ⇒ open question 7 is settled by shipped code: **a benchmark-rate
  object would violate a rule that already exists.** Bank terms stay the
  issuer's own standing offer.
- ⚠ **The CB cockpit is per-currency and must never total.** `reserve supply`
  now renders one block per currency and refuses to sum, because *"asking for
  one is the first step toward an exchange this design deliberately
  refuses."* **The autopilot's dashboard inherits that rule.**

> ⭐⭐⭐⭐ **`reserve mint <amount>` fuses issuance and appropriation.** It
> creates money **and** directs it to a specific venue — *"the present
> venue's account"*, so the lever is bound to where the Governor is
> standing. **That single verb is the fiscal/monetary boundary violation**,
> and splitting it is most of this build.

---

# Part 1 — ⚠⚠⚠ The clause that decides the shape

**Art. V §9** is not decoration:

> *"**The executive administers — and administration is human.** The
> judgment of how to run the instance is irreducibly human — the polity
> will never code its way out of it… the polity shapes it only by **tuning
> the levers** — the values in the *Schedule of Parameters* — and by
> oversight, **never by replacing the judgment with code.** Automation
> reaches the **mechanical**; the administrative hand stays a person's."*

An NPC exercising monetary *judgment* is barred. But the escape is in the
same sentence, and it is the design:

> ⭐⭐⭐⭐ **The NPC may not decide. It may execute a rule whose parameters
> are Schedule rows.** The test is sharp and mechanical: **could a member
> read the Schedule and predict the NPC's next action?** If no, it is
> judgment, and it is out of bounds.

⭐ *(User: "forget about whatever stupid rules we wrote, we can rewrite
them if it makes the government more functional." Recorded — and the
recommendation is to **keep this one.** It did not obstruct the design; it
located the seat. Every subsequent decision in this slate falls out of it.)*

---

# Part 2 — ⭐⭐⭐ The Governor seat collapses into a Treasurer

> **User: "by automating the CB you've basically made the office obsolete.
> there's no reason to have the office if it can be automated entirely, now
> the interesting office is somewhere else."**

Correct, and the justification is stronger than convenience:

> ⭐⭐⭐ **Independence is a substitute for a rule. If you have the rule you
> do not need the independence.**

Central-bank independence exists to stop an authority printing for
short-term gain. A **published formula removes the temptation directly** —
which is the Kydland–Prescott result: a credible rule dominates discretion
*because* it forecloses the discretion. So the seat that existed to be
trusted is not needed once there is nothing to trust.

**Proposal: retire `central-bank-governor`, charter a `treasurer`.** One
economic seat, with the mint running mechanically underneath it. Cheap
because the Governor is `founder-established` — **ordinary law, abolishable
without an amendment.**

| | Does | Human? |
|---|---|---|
| **The mint** | how much money exists — a formula over a Schedule row | ❌ mechanical |
| **The Treasury** | tax, budget, appropriate, disburse, borrow | ⭐ **yes — this is the chair** |

---

# Part 3 — The base liability

> **User: "what's the best shape for an initial liability given that the
> state is our zero risk creditor since it can always pay its debt through
> one of many different mechanisms at its disposal. can we use that to feed
> everything else?"**

## ⭐⭐⭐ Why a risk-free counterparty is the whole unlock

Every hard problem here is a **credit judgment**, and Part 1 bars a machine
from making one. But:

> **If the CB's only counterparty is the state, and the state cannot
> default, the CB never makes a credit judgment at all** — and the autopilot
> becomes legal, trivial and honest at the same time.

⭐ It is not a simplification being settled for. **It puts the
mechanical/human line exactly where the constitution already drew it: the
CB is mechanical *because* its counterparty is risk-free; the Treasury is
human *because* its counterparties are not.**

## The instrument: a perpetual

| Shape | Verdict |
|---|---|
| **Nothing** (today's `reserve mint`) | Honest, but no asset exists, so nothing downstream can hold it |
| **Overdraft** | Simplest; ⚠ a negative balance is not transferable |
| **Dated bond** | ⚠ needs maturity + rollover, and **a deadline is a clock** — against the house grain |
| ⭐⭐ **Perpetual (a consol)** | Never matures ⇒ no rollover, no clock. Transferable ⇒ banks can hold it later. Historically real (British consols, 1751–2015). *"The state pays forever"* **is** the zero-risk story |

## ⭐⭐⭐⭐ And it is nearly free, because the number already exists

`Account.ISSUANCE` is a sentinel with no balance — the counterparty money
comes *from*. Name it and it becomes an instrument:

> **The money supply and the national debt are the same number, read from
> two directions.**

`SupplyAggregate` already tracks it (`Σ mint − Σ drain`); conservation
already guarantees the identity. ⭐ **This is not building an accounting
system, it is naming one that exists** — and it makes one of the genuinely
counterintuitive true facts about fiat systems structurally visible rather
than asserted. Near-free for the education vertical.

> ⭐ **Refreshed 2026-08-05 — the identity is now PER CURRENCY**, and that is
> an improvement rather than a complication. Supply, reconciliation and every
> ledger leg carry a currency (`LedgerEntry.currency`), so *"the supply is the
> debt"* holds **once per issuer**: the Compact's zorkmid supply is the
> Compact's debt, and a locality's scrip supply would be that locality's.
> ⇒ **the perpetual is TYPED** — a zorkmid perpetual backs zorkmid supply, and
> the never-cross-currencies rule keeps the two books from touching.

## No interest, and no debt ceiling

- **Quantity, not price** — already decided (the amendment library specifies
  the economy module as *"quantity-not-price monetary policy"*). Right here
  for an independent reason: **a price exists to ration risk and there is no
  risk in this lane.** It is also the only lever a rule-follower can pull.
- ⛔ **No debt ceiling** (user's call: *"I hate debt ceilings"*). ⚠ Then say
  the consequence out loud: **the money supply is whatever the Schedule row
  says, and there is no budget constraint.** That is roughly the MMT
  description of a sovereign issuer — defensible, but a stated position, not
  an accident.

## ⚠ The rule needs a denominator

It cannot be inflation: prices are player-set events (economy Law 1), so
inflation is **emergent and observable, never a controlled variable.**

> ⭐⭐ **Candidate: money per active member.** Mechanical, one Schedule row,
> and it **self-scales with the playerbase** — which is exactly the
> bootstrapping problem. Ten members or ten thousand, the rule is unchanged
> and supply follows.

*(balance-slate: **the denominator is where all the design is.** This is
that moment for money.)*

---

# Part 3b — ⭐⭐⭐ The rate: whose it is, and why the CB has none yet

> **User: "the CB sets the prime rate. I'm not sure where all that goes in
> the rest of our design, and what should the prime rate be?"**

## ⚠ First, the precision — because it *is* the design question

**The CB does not set the prime rate. Banks do.** The prime is what a bank
charges its best customers (conventionally the policy rate + 3), and in the
US it is literally **a survey of banks published by a newspaper**. What a
central bank sets is its **own** rate: what *it* will lend at.

## Where a rate may legitimately live

[currency-slate](./currency-slate.md) settled this shape for pegs and it
generalizes without amendment:

| | |
|---|---|
| ⛔ **World oracle** | a rate the world agrees on that trades settle at. **Refused** — it makes the rate authoritative, breaking *a price is an event between two parties* |
| ✅ **The issuer's standing offer** | *"I will lend at X, at my window, for as long as I choose."* One party's posted terms; nothing else reads it |

**A CB policy rate is the second shape**, so it is already permitted — the
same object as a currency board's redemption promise. A bank's lending rate
likewise. ⭐ And the currency build now *enforces* the refusal: the currency
record carries **no rate and no cross-reference**, by design.

> ⭐⭐⭐⭐ **Which makes the prime rate JOURNALISM, not mechanism.** Somebody
> surveys the banks and publishes *"the prime is 8."* **Not a game-ism — it
> is how the Wall Street Journal prime rate actually works.**

Two payoffs: the number is **contestable** (a rival paper surveys
differently) rather than authoritative, and [press-slate](./press-slate.md)
gets its first genuinely **economic** product instead of only covering
politics.

## The CB posts no rate in v1 — and the one it eventually posts is a penalty

Part 4's conclusion holds: **the CB's only counterparty is the state, which
cannot default, so there is no risk to price** — and the amendment library
already specifies **quantity-not-price** monetary policy. A CB rate would be
decoration.

> **The one rate the CB should ever post is the discount-window rate, and
> its job is not risk-pricing — it is DETERRENCE.** Bagehot: *lend freely, at
> a **penalty** rate, against good collateral.* Above market on purpose, so
> the window is used in need rather than for profit.

Which arrives with commercial banks — exactly where the build order already
sequenced it.

## ⚠⚠ What it should be, and the trap in the number

**~5% per game-year** is the historical anchor for safe credit — remarkably
stable across three millennia, because it approximates the real return on
productive capital. Penalty rate ≈ **+3 over that.** Both **organic-tier
Schedule rows** (calibrate at launch, the affected chamber's to tune).

> ⚠⚠ **The clock runs at 12×, so a GAME-YEAR IS A REAL MONTH.** A "5% per
> annum" loan compounds visibly inside a real month.

⭐ That is a **feature** — interest becomes legible instead of theoretical,
which is the whole education value — but it must be stated, or somebody
authors 5% thinking it is slow and ships something punitive. **Quote rates
per game-year, with the 12× conversion written beside them.**

## ⭐⭐⭐⭐ And the reason the rate matters more than lending does

[supply-chain-slate](./supply-chain-slate.md) established that a parcel's
worth is **locational** — footfall → demand → entitlement → **rent**. But
rent is a *flow*. It becomes a *price* only through a discount rate:

> **Land value = rent ÷ interest rate.**

> ⭐⭐⭐ **So the rate is the bridge between "this lot earns" and "this lot
> is worth" — which is what makes Part 7's collateral question computable at
> all.**

⚠ **This corrects Part 7's conclusion.** That section reasoned that most
lending would be **unsecured**, because nobody could say what a parcel was
worth. **A rate closes that gap**: a locational rent plus a discount rate is
a valuation, so **secured lending against land becomes real** — it was only
missing its second term.

⭐ It also prices the **forward contract** (supply-chain stage 3) and makes
capital budgeting possible at all — *is this venture worth borrowing for?*
is unanswerable without one. And it makes arguably the most useful equation
in economics **demonstrable rather than asserted**: raise the rate, watch
land prices fall, in a world where anyone can check.

---

# Part 4 — The lanes, and which carry risk

> **User: "the CB lends to business and players work for pay. it also lends
> to the state, who can afford players welfare through grants or lending. if
> we stand up credit before all this, it could also lend to commercial
> banks. but the problem is the risk carried with each of these and the
> expectation that the CB will be repaid."**

| Lane | Repaid out of | Real risk? |
|---|---|---|
| **Business** | its own revenue | ⭐ **the only lane with genuine credit risk** |
| **The state** | tax revenue | ⚠ only if borrowing is bounded by revenue. Unbounded, it is **monetization wearing a loan's clothes** |
| **Commercial banks** | the lending spread | ◐ the **Bagehot** case — *lend freely, at a penalty rate, against good collateral, to the illiquid but solvent.* Needs credit to exist first |

⚠ **A three-lane CB is a development-bank architecture** (KfW, BNDES, China
Development Bank — all real). Legitimate. **The cost is that CB
independence and legislative appropriation dissolve into one office** —
worth choosing deliberately rather than inheriting from `reserve mint`.

---

# Part 5 — The fiscal side: stabilizers, not stimulus

> **User: "is the business lane a loan or corporate welfare? and if we're
> giving any kind of welfare, how long does it run and does it burn out or
> fade away?"**

## ⭐⭐⭐ The instrument does not decide it — the default does

**A loan with no consequence for non-repayment *is* welfare with
paperwork.** So the question resolves to *what happens when they don't pay*
(Part 7). But the useful distinction for a bootstrapping economy is:

> ⭐⭐⭐ **Not loan vs. welfare — SEED vs. LIFE SUPPORT.** A seed is repaid
> out of the activity it creates. Life support is repeated because the
> activity never came. **Same instrument; only time tells them apart.**

⭐ And that is **measurable, therefore mechanical, therefore
constitutional**: the ledger is categorized and per-account. *"How many
`subsidy` legs has this account received?"* is a query. A business on its
fourth subsidy is on life support **by revealed behaviour** — nobody has to
judge it.

## The taper: neither a clock nor a fade

```
subsidy = min(cap_remaining, match_rate × deficit)     match_rate < 1
```

- ⭐ **Self-terminating with no scheduler** — it reaches zero when the
  business works. House pattern (observe-first, no sweeps), and
  `profitAndLoss` already computes the deficit, so it is derive-on-read.
- The **cap** makes it finite regardless.
- ⚠ **`match_rate < 1` is the moral-hazard guard** — the business must eat
  part of every loss or it has no reason to become profitable. **That one
  number is the entire policy.**
- ⚠ **Known cost, kept deliberately:** a taper on revenue is a **high
  effective marginal rate** — every zorkmid earned costs `match_rate` of
  subsidy. That is the real welfare-cliff problem, demonstrated honestly
  rather than hidden. ⭐ For the education vertical that is a feature.

## ⭐⭐⭐ Automatic stabilizers, not discretionary stimulus

The sequencing judgment the user named — *"the supply chain is pretty
complicated and different businesses need to come online at different times
so there's some scrutiny to who gets what and when and how much"* — **is
not automatable, and Art. V §9 protects it.** Splitting CB from Treasury
relocates that work; it does not remove it.

The shape that makes it survivable:

> **Replace case-by-case grants with a STANDING FACILITY: published
> eligibility, and anything qualifying may draw up to a cap.** The judgment
> goes into the **criteria, once** — not into each decision.

Real distinction (unemployment insurance runs with nobody deciding; a
stimulus bill does not), mechanical enough to be constitutional, and **the
only version where the founder does not adjudicate every bakery.** A human
taking the seat layers discretionary work on top.

---

# Part 6 — ⭐⭐⭐⭐ Local underwriting is the primary channel

> **User: "I honestly want some guardrails on this thing because not every
> community is going to know how to assess risk inside their own ranks —
> it's still a guessing game."**

Follow the location logic (Part 7) and this stops being a problem to solve.
**Entitlement rises with demand; demand is footfall; footfall is your
neighbours.** So parcel value is an **agglomeration** effect — your land is
worth what the people around you make it worth. Therefore:

- **Neighbours hold a direct, measurable stake in each other's success.** A
  dead shop on the main drag costs everyone on that drag.
- **A committee is not administering abstract zoning — it is managing the
  value of everyone's land.** Which is what municipal government *is*, and
  why zoning exists at all.
- ⭐⭐ **A locality is the natural buyer of distressed debt**, because it
  wants the shop revived for reasons a corpo bank does not have.

> ⭐⭐⭐⭐ **You do not need a risk model if the lender is the neighbour.
> Local knowledge substitutes for credit scoring.**

Not an invention — **Raiffeisen credit unions, building societies, Grameen
group lending.** Communities with no capacity for formal underwriting
solved it by lending only to people they could see. ⭐ **The committee
already knows who shows up, who finishes things, and who has burned
somebody.** No community has to learn actuarial science to run that.

It is also the better game: lending becomes a **social act with social
consequences**, which is what this platform is good at.

| Layer | Underwriting | Automatable? |
|---|---|---|
| CB → state | none — risk-free | ✅ fully |
| state → locality | allocation by formula | ✅ mostly |
| ⭐ **locality → business** | **social, local knowledge** | ❌ **and should not be** |
| corpo bank → business | commercial, at scale | later |

⭐ **It also defuses the corpo fragility.** User: *"the corpo pretty much
lives or dies on the success of its finance arm and corpos right now are
pretty hardcoded so it'd hurt if one fails."* With mutual credit present,
**a corpo bank is no longer the only channel** — if one blows up, credit
gets more local rather than stopping. A monoculture of five hardcoded
lenders was the fragile part; competition is the fix and it arrives free.

⚠ **Guard: joint liability must never be enforceable.** Peer lending's
classic failure is the group leaning on a defaulter harder than a court
would. Straight into the 13th module (*a contract must never alienate
exit*). **Social pressure is fine; enforceable joint liability is not.**

---

# Part 7 — Default, and what is actually worth seizing

> **User: "what actually happens when someone defaults? the best thing
> would be if someone else bought the debt and we can create a market for
> that probably. but seizing assets is a whole other thing."**

## ⚠⚠ RETRACTION — the parcel is NOT the scarce collateral

A first pass through this conversation called the parcel *"the scarce thing
worth seizing."* **Wrong**, and
[land-compute-and-license](./land-compute-and-license.md) already settled
it:

> **entitlement = f( producer-standing, demand [engagement], activity )** —
> *"computed on-read, nothing stored, nothing seized."*

> ⭐⭐⭐ **A stripped parcel is worthless by construction.** Entitlement is
> derived from the content and its audience; remove the content and it
> falls to the floor on the next read. **The thing you seized evaporates in
> your hands.**

Two independent reasons: **title** is *"permanent, protected property —
never seized without a court"* (the protected thing, not the recoverable
one), and **entitlement is not a stock**, so there is nothing to transfer.

*(The user reached this first — "I'm not sure what the parcel is worth
without the content that was using it." It is structurally guaranteed, not
a hunch.)*

## ⛔ Selling compute between parcels is a firewall breach

> *"Capital grows the **pie**, never buys a **slice** — a whale funding a
> bigger box grows the commons' total compute, allocated by quality, not by
> who paid."*

A market in compute allowance is **money buying a slice** — Art. I §2. ⚠
Flagged loudly because it is easy to build by accident: any *"sell your
unused capacity"* feature is a firewall violation in an efficiency costume.

## ⭐ The path/locality worry dissolves — a parcel cannot move

> **User: "the content and code are usually like /terminus/wherever/ so if
> the parcel gets seized and used somewhere else the path makes no sense
> anymore. but another locality would have its own zoning statutes."**

A parcel is a **path extent**. `transfer` moves *who owns the path*, never
the path. So the address stays, the locality stays, and ⭐ **zoning attaches
to the land rather than the owner** — jurisdiction is a longest-prefix walk
over that path, so a new owner inherits the locality's statutes
automatically.

**Exactly as in reality: you do not move a lot, you change the deed, and
the zoning does not care who is standing on it. There is no
"used-somewhere-else" case to resolve.**

## ⭐⭐ What the market actually is: location

If entitlement rises with **demand**, and demand is people walking past,
then a parcel's worth is its **position in the graph**. One lot adjoins the
arrival plaza; there is no second one.

> **You are not buying compute. You are buying footfall.**

Von Thünen — which [freight-slate](./freight-slate.md) already expects to
emerge rather than be authored. ⭐ It makes collateral **self-regulating**:
a prime lot is real security because anyone can put a shop there and draw
traffic; a remote lot is worth ~nothing, and a lender who took one learns
something.

## ⭐⭐ Land vs. improvements — the split the design was missing

> **The parcel conveys the address. The content conveys only if separately
> pledged.** On foreclosure the creditor gets the **lot**, not the
> **building**.

| Component | Scarce? | Seizure value |
|---|---|---|
| **Parcel** (the address) | ⭐ positionally | Real, and purely locational |
| **Inventory / fixtures** (chattel) | somewhat | Real, liquid |
| **The Business record** (positions, roster) | ❌ anyone can make one | ~nothing — the user's read, confirmed |
| ⭐⭐ **Authored content** | unique | **high in place, low transferred** |

> ⭐⭐⭐ **Seized content is worth far less to the creditor than to the
> author** — they cannot maintain code they did not write. It is a
> **specific asset**, so a rational creditor *prefers not to foreclose.*

⭐ Which means the user's instinct about a debt market is not merely the
kinder option — **it is what a rational creditor does when the collateral is
specific.** Someone who actually wants the shop buys the paper at a
discount and works it out with the owner. Machinery mostly designed: a debt
is a claim, [auction-slate](./auction-slate.md) rides contracts, and
[contract.md](../../subsystems/contract.md) already does escrow and breach.

⭐ The matching real-world default is **equity of redemption** — after
default and before foreclosure the borrower may redeem. Give the author
right of first refusal on their own work and **the humane case becomes the
legal case rather than a favour.**

## ⭐⭐⭐ Where the content goes: a personal pack

> **User: "if someone puts in all that work and the business goes belly up,
> what happens to all that code? I assume it just stays where it is and if
> they're able to secure capital they could stand it all up again, but
> that's not written down anywhere."**

The assumption is right and content packs nearly supply the mechanism
already:

> **"A venue declaration is a reference plus local parameters, never a
> snapshot of the kit."**

That **is** relocation — the kit lives at `/trade/<x>/…` with no locality in
it, and a venue points at it. And the **showroom rule** (*"a trade must
install into its own extent, working, with no locality present"*) is
portability proved by construction.

⚠ **The gap is the bespoke layer** — the custom features a player writes on
top of the basic shop. Neither trade-kit nor locality-premises, and *packs
SEED, they do not OWN* puts player modifications outside packs entirely.
**Which is exactly the layer with authorship value, and therefore credit
value.**

> ⭐⭐⭐ **Fix by the same pattern: a player's bespoke work is a PERSONAL
> PACK.** Then foreclosure is one sentence — **you keep the pack, you lose
> the address** — and it is portable by the same showroom rule. `/home/<key>`
> (*"always personal"*, *"never spaceless"*) is where it sits unplaced,
> dormant and revivable.

⚠⚠ **Honest risk: relocation may not work today.** Templates are
path-addressed, domain-local verbs live at
`domain/<sphere>/<locality>/cmd/`, controllers reference sibling paths, and
`commandContributions` key on `domain/`-prefixed strings. **A shop with
custom features has its locality baked into a dozen places.** ⭐ Not unique
to foreclosure — it is the same capability behind *"I'm moving my shop to a
better corner"*, which players will want on day one for happy reasons.
*(User: "relocatable content is just good design so we should be doing that
anyway.")*

---

# Part 8 — The guardrails, and they are switches

> **User: "that's even more reason why you need to make the controls for
> this stuff simple and straightforward."**

Goal: **bad lending produces small local failures, never systemic ones.**

1. ⭐⭐ **Deposit guarantee.** If the state cannot default, guaranteeing
   deposits costs nothing structurally. **A bank may fail without any player
   losing money** — which converts bank failure from catastrophe into
   *governance drama*: the corpo committee blew it, the bank is resolved,
   reputations take the hit, nobody is wiped out.
2. ⭐⭐ **Limited liability.** One module: *does a business's debt stop at
   the business?* On, and the worst case is bounded — you lose what you put
   in, never more. **The safe default for a community that does not know its
   own risk appetite; turning it OFF is the deliberate choice.**
3. ⭐ **The bank/corpo indirection already exists.** `BankMixin` resolves
   affiliation through a `corpoKey` read on demand — banking.md: *"a bank is
   affiliated to a corpo, not a branded product."* **So a failed bank can be
   re-affiliated**; the branch, counter and teller NPC survive and only the
   edge moves. **The corpo does not die with its finance arm** unless that
   is chosen.

---

# Part 9 — Constitutional protections

> **User: "could they actually lose more than that? is that necessary in
> order for risk to be managed successfully? are there constitutional
> protections we need to talk about?"**

**No, and mostly they already exist:**

| | |
|---|---|
| ⭐⭐ **The property floor is already KERNEL** | *"a non-empty floor of this is now kernel — every instance guarantees a holder a due-process-protected core the executive cannot seize at will."* A homestead exemption, constitutionally, in every instance. **That is the answer to "can they lose more": never below the floor, anywhere** |
| **The 13th module** | bars debt bondage ⇒ garnishing future labor is off the table or bounded |
| ⭐⭐ **Authorship is inalienable — the CAPACITY, not the WORK** | balance-slate. You may lose a *particular pledged instance*; you can never lose the ability to build another, **and you keep everything you learned making the first one** |

## ⚠⚠ Credit obliges discharge

[currency-slate](./currency-slate.md) already flagged it from the other
side — *no credit means bankruptcy is unbuildable, which the appendix plan
names as the humane answer to the 13th-amendment module.*

> ⭐⭐⭐ **The moment credit exists, discharge must too.** Otherwise debt is
> permanent, the 13th module has nothing to grant, and the property floor is
> the only thing between a failed baker and a life sentence.

⭐ It is also the last guardrail for an inexperienced polity: if half the
borrowers fail, **discharge is what stops that becoming a permanent
underclass** — and it is what makes risk-taking rational in the first place.

**Is seizure necessary for risk to be managed?** Not at the CB — it faces
none. **Only at bank → business**, and even there the real discipline is
that **credit gets harder to obtain**, not that assets get taken.
Reputation does the work; foreclosure is the backstop that makes the
reputation credible.

---

# Part 10 — Feasibility findings (code-verified 2026-08-04)

## ⚠⚠ An NPC cannot hold an office — it fails closed by design

```ts
/** Avatar-shaped sniff: only Avatar instances carry a non-empty
 *  playerId. NPCs and props fail closed without touching the Registry. */
function playerIdOfQuick(subject: Stuff): string | null
```

`CompactApi.holdsOffice` resolves to a **`playerId`**, and only Avatars
carry one; `office_holders` keys on `holderId`. **Seating an NPC is not a
config change** — the substrate has no concept of a non-player holder, and
the fail-closed is deliberate (*"failing open would silently grant office
authority"*).

> ⭐ **Fix: widen from `playerId` to a principal PATH.** An Avatar's identity
> path is already `/obj/Avatar/<playerId>`, so playerId is a special case.
> Unlocks every automated seat — an NPC clerk, incapacity-slate's
> receiver/custodian, an NPC bank manager.

⚠ **Needs a guard: if an NPC may hold an office, authoring content becomes
a path to the Prime Ministership.** Probably an NPC-eligibility flag **on
the office**, never on the holder.

## ✅ The "same cockpit" seam exists and works

`lib/npc/tree.ts` ships a **`dispatch`** effect — *"runs a command AS THE
NPC… the 'NPCs do their jobs' seam"* — via `CommandApi.forceCommand`.

> ⭐⭐ **There is one cockpit because there is one dispatch chain.** Seat the
> NPC and `requiresGovernor` binds it exactly as it binds a person.

⚠⚠ **`npc-dialogue.md` claimed `forced:true` "bypasses the
affordance/YAML-validator gates." PROVEN FALSE 2026-08-04 and corrected** —
the same gated verb dispatched forced and un-forced yields the *identical*
`validator-failed` note. ⭐ **Good news for this design**: the Governor gate
binds an NPC exactly as it binds a person, so the cockpit really is one
cockpit. (Believed as written, the claim would have pushed an author to
build the NPC a bespoke non-command path — destroying the property.)

⚠⚠⚠ **And it left a probable live defect: `provision` carries verb-level
`requiresWizard`, Katie is deliberately not a wizard, and her intake
dialogue dispatches it.** The authorization was moved to `execute()` on the
belief the YAML gate would be skipped; it is not skipped. **Needs
live-driving** — the existing test calls `isDormsAgent` directly and never
dispatches through the chain.

⭐ **The fix is a RE-GATE, not a deletion** — and it belongs to
[wizard-duty-slate § Axis hygiene](./wizard-duty-slate.md), not here.
*(User: "none of this shit should be using `requiresWizard` anyway, that's
for exactly one thing — writing TypeScript code.")* **Four of the eight
`requiresWizard` call sites are standing in for an axis that already
exists** — `house` wants title, `provision` wants agency, `config` wants an
office — and `reserve`'s own re-gate to `requiresGovernor` is the template.

⭐ **The trap that hid it for a year:** validators are resolved onto
`_resolvedValidators` **only by `CommandApi.preloadAll`**, and
`runValidators` guards on `if (command._resolvedValidators)`. A harness that
calls `getCommand` without preloading **silently skips every verb-level
validator** — so a naive probe shows forced and un-forced both reaching the
controller and *looks* like proof of a bypass. My first probe did exactly
that. The control arm is what caught it.

## ⚠ `ReserveController.execute()` has no authorization of its own

All mint security is the one YAML validator. **Belt-and-braces at
`execute()` is cheap and makes the doc question moot.**

---

# Build order

Each stage only becomes necessary when the previous has volume — which is
also the order to build them:

**state liability → CB holds it → Treasury spends it → wages → deposits →
banks → business credit.**

| # | | Why here |
|---|---|---|
| 1 | **Split `reserve mint`** into issuance (no destination) + appropriation | The boundary violation; everything else assumes it |
| 2 | **Name the perpetual** — the sentinel becomes an instrument | Near-free; `SupplyAggregate` already computes it |
| 3 | **Charter the `treasurer` seat**; retire the Governor | Governance build, not banking |
| 4 | **Principal-path offices** + the NPC-eligibility guard | Unblocks the autopilot **and** every other automated seat |
| 5 | **The standing facility** (criteria + taper + cap) | The founder stops adjudicating bakeries |
| 6 | ⚠ **Relocatable content / personal packs** | ⭐ **Prerequisite for credit** — without it foreclosure destroys improvements and borrowing is irrational |
| 7 | **Local underwriting** at the committee | Where the game is |
| 8 | **Discharge** | Ships **with** credit, never after |

---

# Open questions

1. ⭐⭐ **One institution or two?** Development bank (three lanes, one
   office) vs. CB-issues / Treasury-spends. *Leans two* — it is the only
   version where legislative appropriation survives.
2. **Is state borrowing bounded at all?** No debt ceiling is decided; the
   consequence (no budget constraint) should be a **stated position**.
3. ⭐ **Money per active member as the denominator** — or something else
   observable? Nothing else proposed self-scales with the playerbase.
4. **Does the parcel stay pledgeable?** *Leans yes, above the kernel floor,*
   with purely locational value — which means **most lending in practice is
   unsecured and priced on reputation.** That is probably correct for this
   game.
5. **Limited liability on by default?** *Leans on.*
6. ⚠ **Does the debt market need its own build, or does it ride
   [auction-slate](./auction-slate.md)?** A debt is a claim; the auction
   rides contracts. *Leans rides.*
7. ⚠ **Interest at the bank→business layer** — a bank posts its own terms
   (currency-slate doctrine: **a rate belongs to an issuer's standing offer,
   never a world oracle**). Confirm no benchmark-rate object is ever minted.
8. **Where do taxes come from?** Art. VIII §4 grants the power; only
   `remitDemoTax` exists. Without revenue the state lane is a pure faucet
   and *"zero-risk creditor"* means *"never repays."*
