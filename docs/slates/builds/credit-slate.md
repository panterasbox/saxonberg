# Credit slate — standing up lending, and the autopilot that runs the mint

> **Status: PARTIAL — LENDING SHIPS (economic bootstrap, MR !272).** The
> money substrate, the reserve and treasury, the three-rung ladder, the
> window, default-and-cure all run live → [credit.md](../../subsystems/credit.md),
> [banking.md](../../subsystems/banking.md). This slate's own
> reserve/treasury/lanes/ladder design is superseded by
> [economic-bootstrap-requirements](../../requirements/economic-bootstrap-requirements.md)
> (2026-09-18) — **read that doc first for anything it covers.**
> ⭐⭐ **What the build did NOT answer is now written down in
> [Part 11](#part-11--what-lending-actually-ships-and-the-gaps-2026-09-23)
> with the seam each gap attaches to**, and it is the most useful part of
> this file for whoever picks it up.
> **Left:** ⭐⭐ risk — a rating, a bureau, risk-based pricing (Part 11) ·
> ⭐⭐ the secondary market (buying paper) · personal credit + guarantees ·
> ⚠ nothing hires autonomously, which binds new-player absorption harder
> than credit does · local underwriting at the committee (Part 6) ·
> relocatable content / personal packs (Part 7 remainder) · NPC
> principal-path offices (Part 10) · whether the parcel stays pledgeable ·
> where taxes come from
> **Size:** ⭐ **a build** for the risk half (Part 11); the rest a tail

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

⭐ **Scope, in the user's words:** *"this isn't meant to be a permanent
model for lending long term… this is really more about getting everything
online and giving players what they need to actually engage with all the
various systems we've designed."* **A bootstrapping instrument, not a
finished financial system.**

Related: [banking.md](../../subsystems/banking.md) (**the substrate — read
it first**), [governance.md](../../subsystems/governance.md) (the Office
apparatus; the Governor seat), [currency-slate](./currency-slate.md) (the
deferral this closes; quantity-not-price),
[land-compute-and-license](./land-compute-and-license.md) (⭐ **the
entitlement function — it decides the collateral question**),
[content-packs-slate](./content-packs-slate.md) (kit ⊗ premises; the
relocation answer), [parcel.md](../../subsystems/parcel.md),
[chattel.md](../../subsystems/chattel.md),
[incapacity-slate](../tails/incapacity-slate.md) (impound on a claim),
[cooperative-slate](./cooperative-slate.md) (the mutual-credit lineage),
[behavior.md](../../subsystems/behavior.md) +
[npc-dialogue.md](../../subsystems/npc-dialogue.md) (the brain + the
`dispatch` seam).

---

> **Parts 0–3 cut 2026-09-20 — carried into
> [economic-bootstrap-requirements](../../requirements/economic-bootstrap-requirements.md).**
> The mint survey → its *What already exists* table (and `banking.md`).
> Art. V §9 / the reserve-vs-treasury test → its *The reserve has one
> officer and two rules* (same test, adopted). The Governor→Treasurer
> proposal → **superseded**: the seat is KEPT, a treasurer chartered
> beside it. The perpetual, no-debt-ceiling, and *money per active
> member* denominator → its *Lane two — the perpetual*.

# Part 3b — ⭐⭐⭐ The rate: whose it is, and why the CB has none yet

> **User: "the CB sets the prime rate. I'm not sure where all that goes in
> the rest of our design, and what should the prime rate be?"**

> The first four subsections here (CB-doesn't-set-prime, where a rate may
> live, no rate in v1 + the penalty window, the ~5%/game-year number) are
> cut 2026-09-20 — carried verbatim into
> [economic-bootstrap-requirements § Rates are the lender's own standing
> offer](../../requirements/economic-bootstrap-requirements.md).

## ⭐⭐⭐⭐ And the reason the rate matters more than lending does

[supply-chain-slate](../tails/supply-chain-slate.md) established that a parcel's
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

> **Parts 4–5 cut 2026-09-20 — carried into
> [economic-bootstrap-requirements](../../requirements/economic-bootstrap-requirements.md).**
> The lanes/risk table → its *Lane one — the window* / *Lane two — the
> perpetual* / *The ladder — four rungs*. The subsidy taper + automatic
> stabilizers → its *NPC businesses borrow first* (the stocking rule
> replaces case-by-case grants).

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

> Three subsections cut 2026-09-20, all restating decisions already
> settled elsewhere: the RETRACTION (the parcel is not the scarce
> collateral — entitlement is derive-on-read, so a stripped parcel is
> worthless) → `land-compute-and-license.md`'s entitlement formula,
> which this section itself named as the source. The firewall-breach
> warning (no market in compute allowance) → the same doc's Art. I §2
> discussion. The path/locality-survives-transfer point → `parcel.md`
> (`transfer` moves title, never the path; jurisdiction is a
> longest-prefix walk that a new owner inherits automatically).

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
`world/<sphere>/<locality>/cmd/`, controllers reference sibling paths, and
`commandContributions` key on `domain/`-prefixed strings. **A shop with
custom features has its locality baked into a dozen places.** ⭐ Not unique
to foreclosure — it is the same capability behind *"I'm moving my shop to a
better corner"*, which players will want on day one for happy reasons.
*(User: "relocatable content is just good design so we should be doing that
anyway.")*

---

> **Parts 8–9 cut 2026-09-20.** The deposit guarantee and limited-liability
> guardrails → carried into
> [economic-bootstrap-requirements § Banks lend what they hold / § Debts
> first, then situs](../../requirements/economic-bootstrap-requirements.md)
> (both decided: on by default). The bank/corpo indirection → already
> shipped and documented, `banking.md` § Custodial bank ops (*"a bank is
> affiliated to a corpo, not a branded product"*). The property floor →
> `docs/stewardship-doctrine.md`. The 13th module barring debt bondage →
> `docs/governance/eotl-history.md`. Authorship-inalienable-as-capacity →
> `balance-slate.md`. *Credit obliges discharge* → resolved: the
> requirements doc's Enrollment Note is non-recourse and business debt
> stops at the business, so the 13th-module obligation is met by
> construction; a discharge *procedure* still waits on a debt that needs
> one (requirements § Non-goals).

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
> path is already `/platform/agent/Avatar/<playerId>`, so playerId is a special case.
> Unlocks every automated seat — an NPC clerk, incapacity-slate's
> receiver/custodian, an NPC bank manager.

⚠ **Needs a guard: if an NPC may hold an office, authoring content becomes
a path to the Prime Ministership.** Probably an NPC-eligibility flag **on
the office**, never on the holder.

> **The "same cockpit" seam finding cut 2026-09-20** — fully written up,
> including the corrected `forced:true` claim and the trap that hid it,
> in [npc-dialogue.md § The `dispatch` effect — NPCs do their
> jobs](../../subsystems/npc-dialogue.md) (which also carries the live
> `provision`/`requiresWizard` defect and points it at `residence.md`).

## ⚠ `ReserveController.execute()` has no authorization of its own

All mint security is the one YAML validator. **Belt-and-braces at
`execute()` is cheap and makes the doc question moot.**

---

# Part 11 — ⭐⭐ What lending actually ships, and the gaps (2026-09-23)

Written at the economic bootstrap's MR review, from the code rather than
the plan, in answer to *"does anything actually issue credit in the game
now, and how are we reasoning about who to issue it to?"*

## What ships, and runs with nobody online

| who lends | to whom | when | underwritten? |
|---|---|---|---|
| Treasury | every new house | at `bank open` — `treasury.openingAdvance` (50) | **no** — it is the float |
| Treasury | every new player | at `embody confirm` — the Arrival Note, 20 at zero rate, discharged by the first wage | **no** — a grant with a paper trail |
| a chartered bank (Goodkin) | a business | `bank borrow`, or the shop keeper's own beat | **yes** — the ladder |
| the reserve | a chartered bank | `(1 − haircut)` of any rung-1 paper presented at the window | no — it is the collateral rule |
| a house | its own worker | an arrear, when it cannot pay a wage | n/a |

⭐ **Not test-only.** The general store's keeper runs the borrowing loop
on her own cadence with nobody connected; drive step 6 is that loop end
to end on a fresh world, and step 7 is a player through the same gate via
a rented market stall.

## The underwriting, in full

Four reads of the borrower's own ledger. **There is no score anywhere.**

- **no defaulted loan still owed** (see *the cure*, below);
- **rung 1**: `reserve.ladder.termsRequired` (3) completed supplier
  terms, a counter to pledge, and the bank holds the haircut (20%);
- **rung 2**: `reserve.ladder.loansRequired` (2) repaid rung-1 loans,
  capped at `reserve.ladder.workingCapitalCap` (5000), from the bank's
  own balance;
- **price**: the lender's posted `Terms.loanRatePerGameYear` — *the same
  for every borrower*;
- **repayment**: a share of every inflow (the bank posts it, bounded
  10–50%);
- **default**: revealed, never scheduled — `reserve.defaultHorizonGameDays`
  (30) with no inflows while a balance stands; the lender repossesses the
  pledged counter's goods. **Cured by paying the shortfall**; the breach
  stays on the record for good.

## ⭐⭐ All credit is BUSINESS credit — there is no personal lending

`bank borrow` answers *"You keep no house to borrow for."* A player
borrows **as the proprietor of a house** (the market stall is exactly
that), and `issueLoan` writes `party("business", …)`. So the NPC/player
risk split does not exist in the underwriting, **because the borrower's
kind is not an input to it** — what is underwritten is a business's
trading record.

⭐ The player-specific risk is priced at a different seam: players can
leave and NPCs cannot (D23). The estate rules are the answer — dormancy
freezes the account, escheat reconciles the loans, recovers the Note and
repossesses. **Whether that is the right place for it is a real question**
and it is the first one a personal-credit design has to answer.

## The gaps, each with the seam it attaches to

| gap | what exists to attach it to |
|---|---|
| ⭐⭐ **No score, no bureau, no ratings agency.** The score is two counts and a binary. | Both facts a rating turns on are already on the row — *it defaulted* and *whether it has cleared*. A rating is a **derive-on-read over the contracts rows and their events**, the same shape as renown standing and competence bands. ⚠ Who publishes it is a design question, not a storage one: a ratings agency is an **organization with a chart and a seat**, and the state aggregates, never reports ([gazette](gazette-slate.md)). |
| ⭐⭐ **No risk-based pricing.** One rate per bank. | `Terms.loanRatePerGameYear` is already the lender's own posted standing offer (Part 3b — and *no benchmark-rate object, ever*). Risk pricing is a per-borrower read where there is a per-bank constant, inside `issueLoanImpl`. |
| ⭐⭐ **No secondary market.** Nobody can buy or sell paper. | `ContractRecord.holder` is the creditor and `accountOfParty(holder)` already routes every repayment, so an assignment is *the holder changing* plus an event. The debt market itself is claimed by [auction-slate](auction-slate.md); this build made the paper it would trade. ⚠ An assignment also has to decide what happens to the **window advance** behind rung-1 paper. |
| **No personal credit, guarantees, or cosigning.** | `party("player", …)` already exists (the Arrival Note uses it). The shape is there; the *gate* is the open question, and it is the one that needs the risk half above. |
| **No term structure.** Every loan is open-ended; default is revealed by inactivity rather than a missed date. | A due date is a field on `terms` and a second rule in `reconcileLoans`. ⚠ Deliberate for now: a repayment share of inflows is honest for a shop and needs no calendar. |
| **One chartered bank.** | `charter: [bank]` is one row. Veshko is designed as the real bank against Goodkin's credit union ([institutions-slate](institutions-slate.md)) and is not chartered — so **competition on rate and terms is content, not code.** |
| **A new house cannot borrow to pay its first wage.** Rung 2 needs repaid rung-1 loans, which need 3 completed supplier terms. | Deliberate (the ladder is a ladder), but it means a young business pays wages from the 50-zorkmid opening advance and then owes arrears. If wage credit for young houses is wanted, it is a **fourth rung with its own security**, not a loosening of rung 2. |
| ⚠⚠ **Nothing hires autonomously.** | There is no `hires` brain. A player gets a seat when somebody with authority appoints them, or takes a gig from the `job` board. **For new-player absorption this binds harder than credit does** — an NPC house with a working-capital line and no way to offer a job employs nobody. It belongs with [livelihood-slate](livelihood-slate.md) (§3's NPC need-generator) and it is the prerequisite for the thesis below. |

## ⭐⭐⭐ The thesis this is all actually for

> **User, 2026-09-23: "it's not really player credit directly that's
> first up, it's like npc credit on a business that's employing players
> and needs to pay them. so the business needs the credit but the money
> goes to the player. hopefully I wanna have enough unemployment so that
> new players will have no trouble getting off the ground if they're
> willing to learn and work a trade."**

The money path for that **already exists**: `EmploymentApi.payHouseWage`
tries a rung-2 draw and only writes an arrear if it cannot. What is
missing is the two ends of it — **a business that can hire without a
player-with-authority in the room**, and **a young business that can
borrow against wages before it has a trading record**. Neither is a
money problem; both are in the table above.

---

# Build order

Each stage only becomes necessary when the previous has volume — which is
also the order to build them:

**state liability → CB holds it → Treasury spends it → wages → deposits →
banks → business credit.**

Steps 1, 2, 3 and 5 cut 2026-09-20 — superseded by
[economic-bootstrap-requirements](../../requirements/economic-bootstrap-requirements.md):
the reserve/treasury shape they proposed is decided there directly
(the officer seat is kept, not retired). Steps 4, 6, 7, 8 remain the
governance backlog / content-packs-slate / cooperative-slate handoffs.

| # | | Why here |
|---|---|---|
| 4 | **Principal-path offices** + the NPC-eligibility guard | Unblocks the autopilot **and** every other automated seat |
| 6 | ⚠ **Relocatable content / personal packs** | ⭐ **Prerequisite for credit** — without it foreclosure destroys improvements and borrowing is irrational |
| 7 | **Local underwriting** at the committee | Where the game is |
| 8 | **Discharge** | Ships **with** credit, never after |

---

# Open questions

Q1, 2, 3, 5, 6 and 7 resolved 2026-09-20 by
[economic-bootstrap-requirements](../../requirements/economic-bootstrap-requirements.md):
two institutions (reserve + treasury, separate levers); no debt ceiling
(the consequence stated as the treasury's budget constraint); money per
active member is the denominator (Lane two); limited liability on by
default; the debt market rides `auction-slate` (this build creates the
paper it trades); no benchmark-rate object, ever (rates are the lender's
own standing offer).

4. **Does the parcel stay pledgeable?** *Leans yes, above the kernel floor,*
   with purely locational value — which means **most lending in practice is
   unsecured and priced on reputation.** That is probably correct for this
   game.
8. **Where do taxes come from?** Art. VIII §4 grants the power; only
   `remitDemoTax` exists. Without revenue the state lane is a pure faucet
   and *"zero-risk creditor"* means *"never repays."*
