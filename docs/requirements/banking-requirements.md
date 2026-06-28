# Banking — requirements

The **monetary substrate**: how money is created, stored, moved, and
accounted for. This is **phase 4 ("Money") of the Dave's-Bar track** —
the build that lets a patron *pay for a drink or run a tab* and makes the
bar's **deficit-as-target P&L** run. It delivers the two-tier money model
worked out in [economy-slate § Banking](../slates/builds/economy-slate.md):
**cash** (physical coin, off-ledger, self-limiting by mass) vs.
**accounts** (weightless balances on an auditable ledger), bridged by a
**bank**; the **central-bank firewall** (one governed-but-auditable mint);
and the bar-facing surface that rides on top — **payment** (cash or
card/implant), **tabs** (the first credit history), and **wages** (the
P&L's labor line). The macro-economics (faucet/sink balance, inflation)
and the *real finance science* (lending, interest, bank runs, insurance)
are explicitly parked; this build ships the **honest substrate** and the
**custodial safe-rails** only.

This build mirrors a shipped precedent end-to-end: the money ledger is the
**`lib/standing/` append-only-event-log → rebuildable-materialized-standing**
shape ([renown.md](../subsystems/renown.md) /
[participation.md](../subsystems/participation.md) /
[provenance.md](../subsystems/provenance.md)), with one hard addition —
**conservation**: money is neither created nor destroyed except by the
central bank's logged mint/drain. Read those before planning.

Precedents to read before planning:
[glob.md](../subsystems/glob.md) (coin is already a `Globbable`; cash mints
no new stack substrate), [encumbrance.md](../subsystems/encumbrance.md)
(mass is what makes large cash untenable — the cap is physics, not rule),
the `lib/standing/` ledger pattern (above),
[corpo.md](../subsystems/corpo.md) (banks affiliate to a corpo via the
shipped `CorpoApi` / `BrandedMixin`), and
[fasttravel.md](../subsystems/fasttravel.md) (the dual-base
card-or-implant `TravelCredential` shape the payment credential copies).

## Goals

- **Cash is physical, massed, self-limiting coin.** A `Coin` is a
  `Globbable` (carry / split / merge / count already work) carrying a
  per-coin **mass**, so a large stack blows past carry capacity through
  the shipped `LoadBearing`/encumbrance gauge. No arbitrary cash cap — the
  honest physics is the cap. Cash is off the *governed* ledger (never
  secret from system logs).
- **Accounts hold weightless balances on an append-only ledger.** An
  account's balance is **derived from an append-only transaction log**
  (the `renown_events → renown` shape: a logged event stream plus a
  rebuildable materialized balance), behind a gated Api / logic-singleton
  pair, persisted through the `PersistApi` chokepoint. Every money movement
  is a logged, attributable transaction; the balance is always
  reconstructable from the log.
- **Money is conserved; the central bank is the only faucet/sink.** No
  coin enters or leaves existence except by the central bank's **mint**
  (faucet) or **drain** (sink), and every such operation is logged and
  auditable. Every other operation — deposit, withdraw, transfer, pay,
  wage — *moves* existing money and conserves the total. This is the
  crafting-slate conservation discipline applied to money.
- **A custodial bank bridges cash and accounts and cannot fail.** A
  **bank** holds deposits **1:1** against a cash vault: `deposit`
  (cash → balance, coin into the vault), `withdraw` (balance → cash, coin
  out of the vault), `transfer` (balance → balance). Because reserves
  always equal balances, a purely-custodial bank **can't fail** — the
  safe-rails point. No lending, no fractional reserve, no creditworthiness.
- **Banks are corpo-affiliated; opening an account is an affiliation.**
  A bank carries a **corpo** identity via the shipped corpo substrate
  (`CorpoApi` / `BrandedMixin`); the roster's banking arms (Goodkin retail
  · Vionne private · Aevex fintech · Veshko lender) are authored content.
  A player **opens an account** at a bank of their choice — an explicit
  onboarding interaction — and that choice **records a standing corpo
  affiliation**. (The faction-approval *consequence* of the affiliation is
  recorded-but-inert in v1 — see non-goals.)
- **The bank is a staffed place, not a faceless terminal.** The seeded
  branch is authored with at least one **placeholder NPC teller** so the
  account interactions (open / deposit / withdraw) are mediated by a
  *person* — the economy's "NPCs, not menus" texture, applied to the bank.
  This is **content composing shipped substrate** (a `Character` template +
  `Persona` + a canned `greets`/`idles` brain — npc-behavior, shipped), not
  new engine work. Deliberately a **placeholder** — name, role, a line of
  presence — recording the *intent to have a face there*; the full
  characterization (biography, traits, dialogue) is a deferred just-in-time
  content carve, not this build's job.
- **Payment is one uniform settlement primitive.** Whatever the
  transaction kind (drink purchase / tab settle / peer transfer / wage) and
  whatever the method (cash / implant / card), settlement is **one flow**.
  The thing owed is a **Charge** (amount + payee + reason), either
  **presented** (a seller/the bar prices it from its stance — the payer
  never types the number) or **stated** (a payer-initiated transfer/gift).
  Settlement: see amount → confirm → value moves → a scene names what
  happened. The **method is a parameter, not a verb-per-method**; the payee
  is indifferent to how it cleared. Mechanism is polymorphic underneath
  (cash = coin handover, off-ledger; account = ledger debit/credit,
  on-ledger) behind the uniform surface — the `ContainmentApi.move`
  uniform-surface / polymorphic-internals pattern. The drink purchase hooks
  crafting's `order`/`serve` price into this same `pay`.
- **The payment credential clears on-ledger.** The **account** method uses
  a **payment credential** — the dual-base card-or-implant shape
  (`TravelCredential` precedent: a `Thing` card ⊕ an `AetherHosted`
  implant) — which authorizes a charge against its linked account and
  routes through the owning corpo bank (weightless, traceable).
- **Credentials sit on a risk ladder with recourse.** Cash is fully bearer
  with **no recourse** (robbable, gone if lost); the **implant is
  body-bound** (not casually lost or stolen — extraction is a deferred
  dark-future hook), the secure default; the **card is a bearer
  instrument** a finder *can* spend — but it is **revocable** (report lost
  → the credential is **frozen**, the account and balance untouched,
  reissue) and **capped** (a per-card spend limit bounds the damage). A
  lost card is a real-but-recoverable stake, pointedly unlike cash. A
  `freeze`/report-lost action is part of the surface.
- **Limits are diegetic and purposeful, never arbitrary or fees.**
  **Per-credential spend caps** (card modest, implant high) bound
  lost-card exposure; **cash withdrawals are bounded by the branch's actual
  till liquidity** (a branch can run low on coin — the economy slate's
  "merchants are bounded," making the central bank's branch-float
  meaningful). No arbitrary daily gates, **no fees, no maintenance** (Law
  2). A limit is a security/liquidity cap, not a charge.
- **Settlement carries a remittance-split seam.** A transaction can route a
  portion to a **third-party account** alongside the main payer→payee
  movement. This is not tax-specific — it is immediately reusable for
  **service fees** (Law 2 permits these at point of service — a transfer
  fee, a repair) and **tips/margin** — and it is what makes a later sales
  tax a clean *graft* rather than a retrofit through every payment path.
- **A demo sales tax exercises the seam, inertly.** A purchase remits a
  token sales tax to a **placeholder treasury account** at settlement, so
  the bar's P&L visibly shows tax collected. The **rate is an authored
  placeholder, explicitly not live policy** (the corpo-affiliation-edge
  precedent: recorded and instrumented, not yet governed or consequential);
  the treasury merely **accumulates** — no appropriation/spending cycle.
  The treasury is **just another account** the ledger already holds (no new
  substrate). Live, legislated, jurisdiction-scoped taxation and the full
  tax→budget→appropriate→disburse cycle stay deferred to the
  cooperative/governance build.
- **Accounts are reached by identity, never by a memorized number.** A
  player never types an account number. An account is resolved from **who
  you are** (recognition) plus **context** — at a bank branch, "your
  account" is your account *at that bank*; a **payment credential** is a
  handle that pays from *its* linked account; and being paid (transfer,
  wages) is **addressed by identity** ("pay Bob" → Bob's account). A
  durable account id keys the ledger underneath (the `templatePath` /
  `ContactsMixin` "durable id underneath, friendly identity on top"
  pattern), shareable for precision but never memorized.
- **A player may hold multiple accounts across banks.** Each account is
  independent — its own balance, credential, and corpo affiliation; there
  is **no global "your money,"** balance is **per-account** (real-life
  true). Disambiguation when a player holds several is by **context**
  (which branch / which credential is tapped) plus a designated
  **default/primary** account for receiving. Multi-account is the general
  case the substrate is built for from the start (the ledger keys on
  account-id), not a special path.
- **A tab is a line of credit and the first credit history.** A bar (or
  any creditor) may let a known patron **run a tab** — charges accrue
  unsettled, settled later in cash or from an account. A tab is
  **recognition-gated** (a privilege of being *known* — reads the shipped
  recognition/regard layer); **skipping** a tab is possible and *priced*
  (a `RegardApi` regard hit + loss of tab privilege), not prevented. The
  tab is the smallest credit primitive and the on-ramp the deferred
  lending system will read.
- **Wages are paid as a money movement (the P&L labor line).** A
  **payroll** primitive pays a wage (flat/hourly) from an employer's
  account to a worker — the cost line the deficit P&L needs. The wage is a
  *payment*; **who is employed** is authored for v1 (the bar's NPC staff
  draw a wage line) — the employment *relationship* is out of scope (see
  non-goals).
- **The central bank floats NPC business and covers the genesis deficit.**
  A minimal, **ungoverned-but-auditable** central-bank singleton mints the
  first liquidity, floats NPC vendors/banks, and **covers the bar's red**
  (the magic-coin faucet that backs the deficit-as-target P&L). Every
  subsidy is a logged mint — the subsidy is *visible and accountable* by
  construction.
- **The ledger is the reporting substrate; money supply is queryable by
  construction.** Because money is conserved and the central bank is the
  only logged mint/sink, **total supply = Σ(mints) − Σ(drains)** over the
  central-bank log — no coin enumeration, no account walk. "In circulation"
  (excluding the central bank's own holdings) is a filter (the CB is just
  an account); cash-in-existence is `supply − Σ balances` even though cash
  *transactions* are off-ledger (hand-to-hand doesn't change the total,
  only location — totals move only at logged mint/drain/deposit/withdraw).
  Ledger entries are **tagged richly enough** (kind + from/to + amount +
  both clocks + a scope/location tag, the renown scope-tagging precedent)
  that all later reports (P&L, supply, velocity, tax collected, wages paid)
  are **derive-on-read consumers with no backfill**. A cheap running
  supply aggregate keeps the headline O(1); a **reconciliation invariant**
  (top-down minted == bottom-up Σ cash + Σ balances) is the conservation
  audit.
- **The P&L is the readable instrument of the deficit-as-target.** The
  bar's flows (booze cost in, sales in, wages out, central-bank subsidy)
  are all logged transactions against the bar's account; the **P&L is a
  read of that ledger** — categorized flows and a running balance that
  *sits red by design*. Reading a balance/tally is legitimate (Law 1: a
  count, not a worth-assertion).
- **The increment is demoable at the bar.** End-to-end: open an account,
  deposit cash, order a drink (shipped crafting), **pay** it (cash or
  implant) or **run a tab** and settle later; the bar's ledger accumulates
  the costs, the central bank covers the red, and the P&L shows the
  deficit. Verb surface and a seed of corpo banks + the bar's account are
  authored as content.

## Non-goals

- **Trade, markets, and vendor stances.** The vendor-as-located-stance-
  holder, the person-to-person **clearing handshake**, the bazaar, and
  player-owned shops are the economy slate's *circulation/trade* surface —
  a **separate build**. Banking **settles an (authored) charge**; it does
  not build price-discovery, haggling, or the safe-trade window. The bar's
  drink prices are authored flat stances (the bartender's willingness); the
  general stance/clearing model is deferred to the trade build.
  (economy-slate § *Transaction clearing* / § *Player shops*.)
- **Lending and the real finance science.** Fractional reserve, interest,
  the spread, credit creation, **bank runs, insolvency, bank failure, and
  deposit insurance** are the deferred "later" phase, gated on the
  reputation system → creditworthiness. v1 is custodial-only (can't fail).
  (economy-slate § *Banking* / *Phasing*.)
- **The employment relationship and the labor market.** Hiring, shifts /
  clock-in, the role-slot primitive, profit-share/commission contracts,
  labor disputes, and the wage-as-monetary-policy dual mandate are **out
  of scope**. Banking builds only **wage *payment***; the employment
  relationship that decides *who* draws a wage is its own later build.
  (economy-slate § *Employment & economic engagement*.)
- **Live / governed taxation.** Rate-setting, appropriation, the
  tax→budget→appropriate→disburse fiscal cycle, jurisdiction-scoped rates
  (per-Locality via the address substrate), and *spending* the treasury are
  **out of scope** — they are legislative functions of the cooperative
  build. v1 ships only the remittance seam + a demo tax at an authored,
  inert rate into an accumulating placeholder treasury. (cooperative-slate
  § *The reserve as central bank* — the fiscal cycle.)
- **The governed reserve.** The central bank's **governance wrapper** —
  legislative appropriation, the tax→budget→appropriate→disburse fiscal
  cycle, the archive, judicial review — is the **cooperative build's** job.
  v1's mint is operator-discretion-at-tiny-scale, ungoverned but logged.
  (cooperative-slate § *The reserve as central bank*.)
- **Player-run banks.** The independent-finance apex (a player operating a
  bank) is gated on a stable economy *and* the reputation system; deferred.
- **Full bank-staff characterization.** The branch is seeded with a
  *placeholder* teller (a face + a canned brain) — recording the immersion
  intent. The full just-in-time character carve (biography, traits,
  dialogue, the bank's own cast) is a later content pass, not this build.
  (memory: *NPCs are expensive carves* — carve just-in-time, not ahead.)
- **Macro tuning.** Denomination ceiling, floor prices, subsidy size, wage
  rates, faucet/sink balance, inflation — all the *numbers* — defer to a
  running game. v1 ships the structure with placeholder/authored values.
- **A reporting / analytics surface.** Dashboards, velocity, historical
  series, per-sector flow reports are **deferred consumers** over the
  ledger. v1 ships only the substrate guarantee (rich tagging → no
  backfill) plus two consumers: the bar P&L and a minimal money-supply /
  reconciliation query.
- **The corpo faction-approval game.** The account-choice records a corpo
  affiliation, but the **approval-vector / faction consequences** of that
  affiliation are deferred (corpos-slate defers faction gameplay). v1
  records the edge; nothing reads it for approval yet.
- **The grey market.** Whether to lean into off-books portable-value
  trading (gems/metals as a smuggling/tax-dodge layer) as *gameplay* is a
  deferred watch-item; v1 leaves off-ledger cash as plain inert friction.

## Surface decisions

### Build breadth — the full phase-4 surface

The build delivers the whole "Money" demo: **cash + accounts/ledger +
central-bank mint + custodial bank ops + payment (cash & card/implant) +
tabs + wage-payment + the P&L**. Each piece is small and they compose;
shipping them together makes the bar's money loop whole rather than
leaving a half-payable venue. The reusable spine (cash, accounts, ledger,
mint, conservation) is built once and every bar-facing surface rides it.

### The central bank — a minimal, ungoverned, auditable mint

We build a real central-bank singleton, but only its **monetary
mechanism**, not its governance: **mint / drain / float / seed**, every
operation logged and auditable, **the only faucet/sink** for money. The
legislative/archive/judicial governance wrapper is parked in the
cooperative build and grafts on later without disturbing the mechanism.
This keeps the deficit-as-target P&L *honest* (the subsidy is a logged
mint, visible and accountable) while staying tiny.

### Naming — `CentralBank` / `ReserveBank`, never bare `Reserve`

The monetary mint is named **`CentralBank`** (or `ReserveBank`) to avoid
collision with the shipped capacity-axis `Reserve` (`lib/reserve.ts` —
endurance / satiation / mana). The fiction may still narrate "the
reserve"; the *module* name must not be `Reserve`. (Final exact spelling
is the planner's, within this constraint.)

### Banks are corpo-affiliated

Banks carry a **corpo** identity from the start (via the shipped
`CorpoApi` / `BrandedMixin` substrate), so the roster's ethos-flavored
banking arms are authored content and **opening an account is a standing
corpo affiliation**. Chosen over a generic bank because the corpos
substrate is already shipped, so the affiliation is nearly free to record;
the *approval consequence* of the affiliation is the deferred part, not
the affiliation itself.

### Account bootstrap — open-an-account flow

There is **no born-with default account**. A new player can transact in
**cash immediately** (hand over coin needs no account); to go on-ledger
they **open an account** at a bank of their choosing — the interaction
that also picks the corpo affiliation. Chosen over a born-with default
because it makes "choosing a bank is an affiliation" true and diegetic;
the cost (an onboarding step before on-ledger payment) is acceptable
because cash covers the brand-new player.

### Account identity & resolution — no account numbers, multi-account

A player **never memorizes or types an account number**; identity does the
work, three ways:

- **At a branch** — recognition resolves "your account" as your account
  *at this bank*; deposit / withdraw / balance operate on it.
- **Paying** — the credential **is** the handle: tap implant / present card
  → pays from *that credential's* account. No number entered.
- **Receiving** — addressed by **identity** ("pay Bob" → Bob's account);
  wages land in the worker's account by identity.

A durable account id keys the ledger underneath (the `templatePath` /
`ContactsMixin` "durable id, friendly presentation" pattern), shareable for
precision but never the everyday path.

**v1 supports multiple accounts across banks** (chosen over single-account
for real-life fidelity and the "which card you tap signals which corpo"
texture). Each account is independent; balance is **per-account** (no
global total). Disambiguation when a player holds several: **context**
(branch / tapped credential) + a designated **default/primary** account for
receiving. The substrate keys on account-id, so multi-account is the native
case, not a bolt-on.

**The implant is a wallet, the card is one card.** Because the implant is
installed **once** (one `AetherHosted` device keyed to the player), it
**links all the player's accounts** (opening an account auto-registers it
to the implant) and carries one **active** account. Paying by implant draws
**silently from the active account** — no point-of-sale prompt (phone-wallet
UX, the time-respect valve) — while the settlement scene **shows what was
tapped** ("you tap your Goodkin implant"), so the spend stays visible and
the corpo-sees-it texture lands. Two ways to spend from another account: a
`wallet`/selector verb **switches the active account** (persists; changes
which corpo bank routes the spend), or `pay --from <bank>` **overrides for
one payment** without disturbing the active setting. A **physical card is
1:1 with its account** — the "present the specific card" affordance, the
alternative to switching the implant's active account. The active-spend
designation and the primary-receive designation default to the same account
but are independently settable.

### Payment credential — cash and card/implant both

The on-ledger path ships in v1 as the **dual-base credential** (the
`TravelCredential` shape): a physical **card** `Thing` ⊕ an
**`AetherHosted` implant** `Idea`, either of which authorizes a charge
against its linked account and routes through the owning corpo bank. This
lights up the off-ledger/on-ledger split, implant-routed corpo texture,
and (later) auto-settle tabs from day one.

### Uniform settlement — one primitive, the Charge model

Payment is **one settlement primitive** across every transaction kind
(purchase / tab settle / transfer / wage) and every method (cash / implant
/ card). The thing owed is a **Charge** — amount + payee + reason — that is
either **presented** (a seller/system prices it from its stance, so the
payer never types the amount: ordering a drink, settling a tab) or
**stated** (a payer-initiated transfer/gift). Settlement is a single
confirm-and-clear flow; the **method is a parameter** (`--cash` /
default-implant / `--from <bank>` / a presented card), never a verb per
method, and the payee is indifferent to it. The mechanism is polymorphic
underneath (cash = coin/`Globbable` handover, off-ledger; account = ledger
debit/credit, on-ledger) behind the uniform surface — the
`ContainmentApi.move` pattern. The drink purchase routes crafting's
`order`/`serve` price into this same flow. Chosen because a verb-per-method
/ kind-per-flow surface would fracture a single concept; one `pay` keeps it
coherent and matches the codebase's uniform-Api discipline.

### Credential risk ladder — bearer card, body-bound implant, recourse

The three payment instruments form a deliberate **risk ladder**: **cash**
is fully bearer with **no recourse** (robbable, lost-is-gone); the
**implant is body-bound** (not casually stolen — extraction is a deferred
dark-future hook), the secure default; the **card is a bearer instrument** a
finder *can* spend. The card's risk is bounded by **recourse + caps**:
report-lost **freezes** the credential (account and balance untouched,
reissue a fresh card), and a **per-card spend limit** caps pre-freeze
damage. A lost card is thus a real-but-recoverable stake (unlike cash).
Chosen over an auth-required (PIN/identity-bound) card because the bearer
model is what *makes the card distinct from the implant* and gives losing
one diegetic weight with a recovery path.

### Limits — diegetic and purposeful, never arbitrary or a fee

Limits exist only where they are **in-world and purposeful**:
**per-credential spend caps** (card modest, implant high) that bound
lost-card exposure, and **cash withdrawal bounded by the branch's actual
till liquidity** (a branch can run low on coin — the bounded-merchant
discipline, and the reason the central bank's branch-float matters). **No
arbitrary daily gates, no fees, no maintenance** — a limit is a
security/liquidity cap, not a charge, so Law 2 is honored. Chosen over both
real-bank daily-limit bureaucracy (friction without diegetic payoff) and
no-limits (loses the lost-card cap and the bounded-branch texture).

### Sales tax — demo the seam now, govern it later

Taxation is legitimate by the laws (a **sales tax rides an opted-into
transaction**, the "sink with a revenue face" — Law 2 bans taxing
*absence*, not transactions), but it is a **governance** function: in the
design the whole tax→budget→appropriate→disburse cycle is a *legislative*
act through the reserve, "an accountable policy choice, not devs patching
numbers." Since no government exists yet at this scale, we **do not impose
live tax**. Instead:

- Settlement gets a **remittance-split seam** (route a cut to a third-party
  account) — reusable now for service fees / tips / margin, and the clean
  graft point for tax later.
- A **demo sales tax** rides that seam: a purchase remits a token tax to a
  **placeholder treasury account**, instrumented into the bar's P&L, with
  the **rate authored and inert** (recorded, not governed — the
  corpo-affiliation-edge precedent) and the treasury merely accumulating
  (no appropriation cycle).

Chosen over (a) no-tax-at-all (the seam is cheap and reusable; dogfooding
the flow now is honest instrumentation) and (b) live taxation (which pulls
a governance function forward and bakes a dev-set rate + an un-spent sink
into the substrate — the anti-pattern the design rejects). The treasury is
**just an account**; live/legislated/jurisdiction-scoped taxation defers to
the cooperative build.

### Reporting — substrate-guaranteed, consumers deferred

Queryability is a property of the architecture, not a feature to build: the
typed append-only ledger + conservation + only-the-central-bank-mints means
**money supply = Σ(mints) − Σ(drains)** and every other report is an
aggregation over the ledger (the renown/chronicle "dumb store, smart
consumers" pattern). v1 ships the **substrate guarantee** — entries tagged
richly enough (kind / from-to / amount / both clocks / scope-location) that
later reports need **no backfill** — plus exactly two consumers: the bar
**P&L** and a minimal operator **money-supply / reconciliation query**
(cheap, validates conservation, useful for dogfooding the deficit). A full
reporting/analytics surface (dashboards, velocity, historical series,
per-sector flows) is a **deferred consumer**, not this build.

### Wage-payment only

Banking builds the **money movement** of payroll (employer account →
worker, flat/hourly, on a trigger/cadence) — the cost line the P&L needs —
but **not** the employment relationship. For v1 the bar's NPC staff draw
an authored wage line; the player "get hired, earn a wage" loop waits for
the employment build that will consume this payment primitive.

### The ledger shape — append-only log + rebuildable materialized balance

Accounts follow the shipped `lib/standing/` precedent exactly: an
**append-only transaction log** (one row per money movement, typed by kind
— mint / drain / deposit / withdraw / transfer / payment / wage — with
from / to / amount / memo / attribution / timestamp) plus a **rebuildable
materialized balance** (a warmed cache, reconstructable from the log),
behind a **gated Api / `*Logic` singleton pair**, persisted through the
`PersistApi` chokepoint. The divergence from renown is the **conservation
invariant**: every non-mint/drain transaction is balanced (Σ debits = Σ
credits) and the total money supply changes only by logged
mint/drain.

### Law compliance — counts yes, prices no; no tax on absence

- **Law 1 (count, don't price).** Balances and coin counts are **tallies**
  and are readable (the P&L, your balance, the till count are all legit
  counts). No object ever carries a "worth N" property; transacted amounts
  exist transiently at settlement (a stance between parties), recorded in
  the ledger as *what happened*, never stamped on a good.
- **Law 2 (never tax absence).** **No account fees, no maintenance, no
  rent, no idle-balance decay.** A service fee is permissible only at the
  point of a service rendered (v1 custodial ops are free); tabs are never
  time-taxed. Mere ownership of an account or a coin stack costs nothing.

## Constraints

- **Conservation is a hard invariant, enforced at the chokepoint.** Only
  the `CentralBank` mint/drain changes the total money supply; every other
  transaction conserves it. Programmatic violations throw (the
  containment/crafting discipline: contract violations are exceptions, not
  boolean flags). The append + balance-mutation surface is gated and
  sealed (the `PersistApi` / `lint:pm` pattern the standing ledgers use).
- **Go through the Api layer; derive the actor from context.** All money
  operations route through a thin gated `*Api` forwarding shell over a
  `*Logic` singleton; the **acting principal is derived from execution
  context** (`getActingAuthor`), never passed as a spoofable parameter
  (the gated-Api rule). The central-bank mint/drain/float ops are
  operator/developer-gated (`AccessApi.isDeveloper`-class), not player
  surface.
- **Module taxonomy — no new categories, one new subsystem folder.**
  Everything lands in the fixed taxonomy: a new `lib/banking/` subsystem
  folder (the cash / account / bank / central-bank / tab / credential
  value-objects and mixins), `api/*.ts` forwarding shells +
  `obj/api/*Logic.ts` singletons, `obj/command/<category>/` controllers +
  `mud/cmd/<category>/` YAML views for the verbs, and `Document`-backed
  ledger/account collections. The corpo banks, the bar's account, and a
  starter coin supply are **authored content** (templates / seeds), not
  classes. No free-floating helpers; fold into Api statics or value
  objects. (CLAUDE.md *Module Categories*; memory: *prefer fewer
  directories*.)
- **Coin mints no new stack substrate.** `Coin` composes the shipped
  `Globbable` + a mass; it does not reinvent quantity, split, or merge.
- **The credential reuses the shipped dual-base pattern.** The payment
  credential is the `TravelCredential` shape (card `Thing` ⊕
  `AetherHosted` implant `Idea`), not a new bespoke mechanism.
- **New Mongo collections follow the documented pattern.** Append-only
  ledger + materialized account-balance collections (indexed per the
  standing precedent); registered in CLAUDE.md's collection list and the
  persistence doc.
- **Custodial means 1:1, always.** A bank's cash vault equals the sum of
  its account balances at all times; withdraw is always honored from the
  vault. No code path lets balances exceed reserves in v1.

## Acceptance criteria

- A `Coin` is a `Globbable` with mass; a large stack measurably reduces
  carry capacity through the shipped encumbrance gauge. Tests cover
  split/merge/count and the mass→encumbrance coupling.
- An account's balance is derived from its append-only transaction log and
  is byte-identical whether read from the materialized cache or rebuilt
  from the log. Tests cover rebuild-from-log.
- Conservation holds: a property/invariant test shows total money supply
  is invariant under deposit/withdraw/transfer/pay/wage and changes only
  by `CentralBank` mint/drain; a violating call throws.
- `deposit` / `withdraw` / `transfer` work custodially; a bank's vault
  equals the sum of its balances after any sequence of operations. Tests
  cover the 1:1 invariant.
- A player can `open` an account at a corpo bank; the chosen bank's corpo
  affiliation is recorded and readable via the corpo substrate. Tests
  cover the affiliation edge.
- The seeded branch is staffed by a placeholder NPC teller (a `Character`
  template + `Persona` + a canned brain) present at the branch during the
  account interactions — the "NPCs, not menus" intent recorded; full
  characterization deferred.
- No operation requires a typed account number: at a branch the player's
  account resolves by identity; a credential pays from its linked account;
  a transfer/wage addressed by identity reaches the payee's account. Tests
  cover identity/credential resolution with no number input.
- A player may hold accounts at more than one bank, each with an
  independent balance and credential; the default/primary account receives
  identity-addressed payments and per-branch/per-credential context selects
  the right one. Tests cover the multi-account disambiguation paths.
- A single implant links all the player's accounts and pays silently from
  the **active** one (no prompt); the active account is switchable via a
  `wallet` verb and overridable per-payment via `pay --from <bank>`; a
  physical card pays 1:1 from its own account; the settlement scene names
  the credential/account tapped. Tests cover active-account routing, the
  switch, and the per-payment override.
- Settlement clears both ways: `pay` by cash (coin handed over, no account
  touched) and by credential (card or implant authorizes an on-ledger
  charge routed through the corpo bank). Tests cover both paths and the
  off-ledger/on-ledger distinction.
- A single `pay` flow settles every transaction kind (purchase / tab /
  transfer / wage) by every method (cash / implant / card): a presented
  Charge carries its amount (the payer doesn't type a purchase price), a
  stated transfer is payer-initiated, and the method is a parameter. Tests
  cover a presented-charge purchase and a stated transfer clearing through
  the same primitive by both cash and credential.
- A found/stolen card can spend (up to its cap) until it is frozen;
  `freeze`/report-lost revokes the credential without touching the account
  balance, and a reissued card works. The implant cannot be casually
  taken. Tests cover spend-before-freeze, freeze-then-denied,
  account-untouched, and reissue.
- Limits are diegetic: a per-credential spend cap rejects an over-cap
  charge; a cash withdrawal exceeding the branch's till liquidity is
  bounded by it; no fee or maintenance ever accrues. Tests cover the
  per-credential cap and the branch-liquidity bound.
- A recognition-gated `tab` accrues unsettled charges and settles later;
  skipping a tab applies a `RegardApi` regard hit and revokes the
  privilege. Tests cover accrue → settle and the skip → regard/privilege
  consequence.
- A `payroll` wage payment moves coin from an employer account to a worker
  and lands as a categorized line in the ledger. Tests cover the payment +
  the P&L line.
- Settlement can route a remittance split to a third-party account
  alongside the main movement (conservation still holds across all legs).
  Tests cover a split clearing to a third account.
- A demo sales tax remits a token amount to a placeholder treasury account
  on a purchase, visible as a P&L line; the rate is an authored/inert
  value and the treasury only accumulates (no appropriation path). Tests
  cover the tax remittance and its appearance in the P&L.
- The `CentralBank` mints (logged) to float the bar and cover its red; the
  bar's P&L is a readable categorized ledger (booze cost / sales / wages /
  subsidy) with a running balance that sits red. Tests cover a seeded
  deficit scenario end-to-end.
- Money supply is queryable as Σ(mints) − Σ(drains) over the central-bank
  log, and a **reconciliation invariant** holds: top-down minted equals
  bottom-up (Σ all coins in the world + Σ all account balances). Tests
  cover the supply query and the reconciliation equality after a mixed
  sequence of mint/deposit/withdraw/transfer/pay/wage/tax operations.
- Ledger entries carry kind / from-to / amount / both clocks / a
  scope-location tag — sufficient for derive-on-read reports without
  backfill. A test asserts the entry shape.
- Law compliance is observable: no readable "worth" property on any good;
  no fee/rent/decay accrues to an idle account or coin stack over time.
- A subsystem doc `docs/subsystems/banking.md` exists, is the source of
  truth for the substrate, and is linked from CLAUDE.md's documentation
  map; the new collections are listed in CLAUDE.md.
- The whole loop is exercisable at the bar on this branch (open account →
  deposit → order → pay/tab → settle; the P&L runs red under subsidy).

## Cross-references

- **Seeding slates:** [economy-slate § Banking / Employment /
  Transaction clearing](../slates/builds/economy-slate.md),
  [daves-bar-slate § The economics / Payments / How it's
  modeled](../slates/builds/daves-bar-slate.md),
  [cooperative-slate § Bootstrapping the economy / The reserve as central
  bank](../slates/builds/cooperative-slate.md).
- **Track:** [daves-bar-track](../tracks/daves-bar-track.md) — phase 4
  ("Money"); this build.
- **Precedent subsystem docs (read before planning):**
  [glob.md](../subsystems/glob.md),
  [encumbrance.md](../subsystems/encumbrance.md),
  [renown.md](../subsystems/renown.md) +
  [participation.md](../subsystems/participation.md) +
  [provenance.md](../subsystems/provenance.md) (the `lib/standing/`
  ledger shape), [corpo.md](../subsystems/corpo.md),
  [fasttravel.md](../subsystems/fasttravel.md) (the credential shape),
  [crafting.md](../subsystems/crafting.md) (the conservation discipline;
  the bar's order/serve/mix this payment surface follows),
  [belief.md](../subsystems/belief.md) (recognition/regard the tab reads).
- **Forward-links (deferred consumers):** the trade/clearing build
  (markets, the handshake, player shops), the lending build (the real
  finance science), the employment build (hiring; consumes wage-payment),
  the cooperative build (the governed reserve), the corpos faction-approval
  game (consumes the recorded bank affiliation).
- **Conventions:** CLAUDE.md *Module Categories*, *Go Through the API
  Layer*, *Inter-Stuff Contract*; memory: *gated-api-actor-from-context*,
  *no-logic-module-imports*, *prefer-fewer-directories*.
