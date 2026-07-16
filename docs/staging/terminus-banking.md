# Terminus Banking & the Business Landscape (staging)

> **Status: BUILT + GRADUATED (2026-07-16).** Shipped in the Attendant+Goodkin cycle; the source of truth is now [../subsystems/banking.md](../subsystems/banking.md) + [../subsystems/attendant.md](../subsystems/attendant.md). Retained for design rationale.
>
> _(original: locked design, 2026-07-15.)_ Captured from a design
> conversation that started as "move the rubber-stamped Dave's-Bar bank into its
> permanent home" and became the deliberate design of (a) how economic activity
> in Terminus is modelled at all, (b) the bank as a repeated, corpo-flavored
> institution, and (c) how all of it manifests as **Stuff objects** (§10).
> Extends [terminus-city.md](./terminus-city.md) §6 (the Atmosphere/Ledger
> economy) with the first fully worked institution. Feeds a future
> requirements → plan → build cycle; nothing here is code yet.
>
> Corpo identities are canon (`seeds/lib/corpo/Corpo/*.yaml`). The banking
> substrate is shipped ([docs/subsystems/banking.md](../subsystems/banking.md));
> this doc is design *on top of* it.

---

## 0. The correction that started it

The premise was wrong on contact: the bank is **not** in Dave's Bar. On disk it's
already a standalone room — `/domain/eternal/university-avenue/bank` ("Goodkin
Bank"), one cell west of the crossing (Gus's room), its comments literally
tagged "temp… placeholder pending downtown." So the real work isn't *relocating a
stranded prop* — it's (1) giving civic banking a **deliberate permanent home** in
the right sphere, and (2) deciding, in a principled way, **what economic activity
the city actually has** and therefore what gets built for real.

---

## 1. The business-landscape model (the governing principle)

This is the load-bearing output; the bank is just its first instance. It
supersedes any per-building "is this a business?" judgement call.

- **Everything is a business.** The city is a uniform fabric of businesses —
  economic agents competing for demand. There is no business/non-business divide
  to adjudicate. ("Either everything's a business or nothing is" → the answer is
  *everything*.)
- **The only distinction is a property of the *money*, not the entity:**
  - **Atmosphere (Layer A)** — notional money. Per-neighborhood aggregate NPC
    circular flow. Never touches real money (architecturally cannot call
    `postTransaction`). The *many*.
  - **Ledger (Layer B)** — real, conserved, **player-touched** money. Real
    `Business` Stuff with real accounts, employed NPCs, a P&L. The *few*.
  - The conservation firewall runs *through* the fabric as the notional/real
    money line — not as a wall between businesses and not-businesses.
- **What puts a business on the real side is player participation** — and that is
  **fixed at birth.** A business's money-tier never changes. **No graduation:**
  an Atmosphere business is never later "upgraded" to a real one. If we ever want
  a real version, it's a *from-scratch* build in its own right.
- **Atmosphere is a destination, not a stage.** A notional business is a
  *complete* business that does its business in notional money — **not** a stub
  of a real one. This is why "atmosphere-forever or unbuilt, never a sketch."
- **We never design half-grown systems.** Whatever we build is complete at its
  tier. **Minimize the *set*; complete every *member* of it.** Few things, each
  finished — never a large set of half-things. (A complete venue on top of a
  *complete subset* of systems is fine — e.g. a bank with no lending, because
  lending doesn't exist *anywhere* yet; it lands everywhere at once when it
  lands, never as a per-venue patch.)
- **What's "real" is derived, not chosen per building.** It is read off the
  **player money-loops** we ship:
  - **Earn** — wages, selling what you make, contracts/bounties (labor market).
  - **Spend** — buying goods and services.
  - **Bank** — storing/moving money (the enabler between the other two).
  - **Rent** — housing, the recurring sink.
  - Each loop *touches down* at a venue; **that set of touchdowns is the entire
    real-business landscape.** Everything not on a player loop is notional
    weather. Enumerate the loops and the loops name the businesses.

This is what keeps a whole city tractable: hand-author the few real venues; the
hundreds of others cost a few numbers per neighborhood.

---

## 2. The five banks

Each corpo runs a retail bank as its finance arm (the captive-finance pattern;
none of the five is a "bank" by sector, they all *have* one). The ethos projects
straight onto "what it's like to bank here."

| Corpo | Ethos | The bank |
|---|---|---|
| **Goodkin** | The Paternalist | Warm company bank. Easy to open, a teller who knows your name. The warmth is real and it **binds** (ties you into the Goodkin world — store, Enclave housing, clinic). **The bank that *wants* the newcomer.** |
| **Hollis** | The Populist | The everyman's check-casher. No minimums, loud "FREE!", a jingle — and nickel-and-dimes you behind the cheer. Wants your *volume*, not to own you. |
| **Vionne** | The Prestige House | The private bank. You're *received*, not admitted — recognition/status-gated, gold-on-black, hushed. The account is the status symbol; the fees are the sacrament. A newcomer can't bank here. |
| **aevex** | The Disruptor | The fintech. No counter, no teller — glassy self-serve terminals, everything through the wallet. Free money-terms; you pay in **data**. The anti-Goodkin (a screen, not a warm human). |
| **Veshko** | The Ruthless Optimizer | The corporate treasury that barely does retail. Brutalist grey, no jingle, no velvet — just terms. Best rates *if you're worth it*, cut without mercy if you're not. The most *honest* bank in town. |

**Legibility axes** (they read against each other): *do they want you?*
(Goodkin/Hollis want everyone · Vionne excludes · aevex wants your data · Veshko
doesn't care) — *human or machine?* (Goodkin warm teller ⟷ aevex no human) —
*class tier* (Hollis+Goodkin working/everyman · Vionne+aevex East-Bank
prestige/tech · Veshko industrial). Canon rivalries give the drama:
**Hollis ⚔ Vionne** (the class war), **aevex ⚔ Veshko** (hype vs results);
Goodkin's only rival is your own autonomy (the velvet cage).

**Which is real:** exactly **one** — Goodkin, the newcomer's bank (Layer B, built
complete). The other four are **permanent Atmosphere frontages** on the downtown
block (finished set-dressing that makes the district legible and defines Goodkin
by contrast) — never enterable *here*, ever. A real Vionne, if ever, is a
from-scratch build in Vionne Heights, not an upgrade of the frontage.

---

## 3. Banks are places (immersion-first)

A bank is **not** one room. Designing from the `BankCounter` fixture up produces
a service kiosk; nobody who transacts in one cell feels they've *been to the
bank*. The few real venues are exactly where we **spend** the immersion budget
(the Dave's-Bar precedent). Design from the *walk*, not the fixture: doors →
hall → the hush → a glimpse of the vault → somewhere quieter you actually open
an account.

**Layout is characterization** — the differing floor plans *are* the immersion
and the class probe at once (you'd read the ethos by walking the floor):
Vionne's foyer→salon (received or turned away), aevex's humanless terminal
lobby, Veshko's single cold window, Hollis's chaotic queue-hall, Goodkin's warm
hall + parlor. Not an "earned exception" to a one-room rule — for real banks
it's the point.

**Goodkin (what we build):**
- **Frontage & doors** — warm sunrise stone among the grey rival slabs, mascot
  in the window, doors propped *open* (the others' shut).
- **The banking hall** — honey wood and brass where rivals are cold marble; the
  counter (fixture) with Wenna; soft chairs and a coffee urn; a rate board
  written like a friendly note; Goodkin Homes / Clinic / Circle pamphlets; the
  vault door glimpsed through the grille (sunrise engraved on the brass).
- **The Circle parlor** — a cozy carpeted back room you're *ushered* into to
  "get you set up": armchairs, a fire, photos of the smiling Goodkin "family,"
  the officer's desk where accounts are opened *and* you're enrolled into the
  Circle. Where the warmth thickens into the leash.

Grain: **two real rooms** (hall + parlor) + the **vault as glimpsed prose** (it
becomes a third, enterable room the day heists/safe-deposit exist — never a
speculative empty room now).

---

## 4. NPCs

Discipline: **a few rich carves + ambient life as prose.** A bank is *quiet* —
the hush does the peopling cheaply (a short queue, a murmur, someone ahead of
you), so the carve budget goes on the two you actually deal with.

- **Wenna, the teller** *(hall — the transaction face)*. Already seeded. Brisk,
  warm, "has counted a great deal of other people's money and judged none of
  it." One deepening: a faint tell that the warmth is *corporate-issued* (a
  Goodkin script she's said ten thousand times).
- **The branch officer / Circle host** *(parlor — the relationship face, the new
  carve)*. Avuncular, remembers everything about you, pours coffee, opens your
  account personally, welcomes you "to the family," gently asks whether you've
  got somewhere to stay. The paternalism made flesh.
- **Ambient customers as prose.** Optional single flourish: one light NPC being
  enrolled-into-the-family in the parlor while you wait (the velvet cage
  happening to someone else) — not the cast.

**Hooks that keep them from being furniture** (all shipped substrate): the bank
is a real **`Business`** (staff on a roster, wages, P&L); **enrollment is a
dialogue tree** (the officer *walks* you into the Circle); **recognition =
paternalism, mechanized** (Goodkin *knows you* — the belief system — which is
the whole of "the relationship" now that credit is deferred, see §7).

---

## 5. The common bank systems (the archetype)

One bank system; the corpo is params on two of its surfaces. Most of the
substrate is already shipped.

**Substrate — uniform across all five, ~shipped:**
1. **Accounts** — open (identity-keyed `{owner, bankPath}`; opening *mints the
   corpo affiliation*), deposit, withdraw, transfer, balance, statement.
2. **The vault** — physical cash till backing customer deposits 1:1; withdrawals
   bounded by till liquidity.
3. **Credentials & settlement** — the bank links your account to your wallet;
   `settle` a Charge; spend-cap, freeze, reissue.
4. **The bank-as-business** — its own P&L, staff on a roster, viability.

**Differentiation layer — where the five diverge (the design work):**
5. **Terms** — the fee/minimum schedule (§6).
6. **Relationship & access** — who they serve, and how they come to *know* you
   (§7). Designed; **credit is explicitly NOT part of it** (see below).

**Deferred common systems — named, not stubbed; land everywhere at once:**
7. **Credit** — the tab / short-term credit / eventually lending, interest
   (reputation-gated), creditworthiness, insolvency, deposit insurance. **All of
   it deferred as one system** — credit is a real design (debt, consequences, the
   bind) and we build *no* form of it until we design it for real (§7). This is a
   deliberate reversal of an earlier lean to ship a tab.
8. **Safe deposit** — storing non-money valuables (a vault room + boxes; ties to
   future robbery).

---

## 6. Terms (designed)

**Model.** A per-bank schedule, authored on the bank, read at the moment of each
verb. Every fee is a **conserved `fee` leg** (player account → the bank's own
account) → the bank's P&L as income, your statement as a line, and one of the
player→economy sinks. Law-1-clean (terms live on the *bank*, never stamped on
money). And **diegetic**: each bank *posts* its schedule on a board in the hall —
same data, five voices — so you comparison-shop by *walking the Counting-Houses*.

**v1 schedule** (each dimension fully wired to an already-shipped verb — no dead
fields; **no tab/credit line — deferred, §7**):
- **minimum balance** — the open/withdraw gate; the exclusion lever (Terms ∩
  Access). Zero for Goodkin, a wall for Vionne.
- **opening fee**
- **transaction fee** — per deposit/withdraw.
- **transfer / wire fee** — intra-bank free; cross-bank and *cross-corpo* priced
  (the TPA network-fee shape; rivalry has a cost).
- **card reissue fee**

**Fee philosophy (tread lightly — fees are a good sink but can be unfun):**
- **The core custodial loop is free everywhere** — open, deposit, withdraw *your
  own* money, check balance. That's the behavior we *encourage* (money on the
  ledger); taxing it is self-defeating and regressive (hits newcomers hardest).
- **Fees live only on movement/convenience** — wires, cross-bank, cross-corpo —
  which scales with how much you move (a sink on the active/wealthy, avoidable by
  banking smart). A new player basically never fights a fee.
- **Each corpo levies its price in a different currency:** Goodkin — the *bind*
  (~no fees; the "bind" itself is the deferred credit, §7) · Hollis — *usage*
  (per-transaction, behind a loud "FREE!") · Vionne — *belonging* (clear the
  minimum, then move freely) · aevex — *data* (free terms; you're the product) ·
  Veshko — *risk* (lean flat; overdraft cut). Only **Hollis** leans on the unfun
  monetary transaction fee — the deliberate, learnable "free-checking-that-isn't"
  trap (the financial-literacy lesson). The unfun surface is contained to one
  bank and opt-in.
- **v1 Goodkin is nearly fee-free.** The fee *mechanism* is built and conserved;
  Goodkin's schedule is permissive. The sink's economic weight scales up as
  fee-charging banks and the city reserve arrive (light until there's a city to
  drain — not half-grown, just dormant-light).

**Maintenance (time) fees — deferred, built complete when first needed.** A
recurring "cost of holding an account" is real-finance-accurate and how Vionne
charges for the privilege, but it means an idle balance *shrinks over time*,
which breaks shipped **Law-2** ("idle balances unchanged"). v1 stays
**event-driven only** — balances idle-stable. When we build the first bank that
charges maintenance (Vionne), we build it *complete* as a **reconcile-on-read
accrual** (the metabolism/harm derive-on-read idiom, no scheduler). Goodkin has
no maintenance fee, so v1 doesn't need the mechanic — not a dead field, a
dimension that arrives with the bank that uses it.

---

## 7. Relationship & access (designed)

The sibling of Terms, with a satisfying symmetry: **Terms prices in a currency;
Relationship grants trust on a basis.** *Price and Trust*, each corpo-flavored.
The object is **your standing with a bank** — a per-`(player, corpo)`
relationship that **gates access** at the door and **is your affiliation** once
you're in.

**Two axes each corpo sets:** *the door* (what it takes to get in — open /
status-gated / value-gated) and *the knowing* (the basis trust is earned on).

**Five profiles** (same substrate, five relationships):
- **Goodkin** — door wide open; trust on **loyalty/time**, and it *starts*
  generous. Unlocks the Circle (§ affiliation). The trust would *be* the bind —
  but the bind is credit, which is deferred, so v1 Goodkin is warmth with the
  leash **implied, not mechanical**.
- **Hollis** — door open; **no real knowing** (one of millions). A gimmick
  loyalty card, not a relationship.
- **Vionne** — door **status-gated** (recognized/vouched/standing — a newcomer
  refused at the foyer). Trust on **who you are**.
- **aevex** — door open, frictionless; it knows you by **data**, not a handshake.
- **Veshko** — door **value-gated** (a minimum of business — worth, not status).
  Trust = your **computed value**, coldly; falls when you're not worth it.

**Sub-systems (the archetype):**
- **a. Access gate** — a per-bank eligibility predicate at `openAccount`, plus a
  *spatial* face (which back rooms you may enter). *New but small.* Goodkin's is
  trivially-true (live but permissive, like `minBalance = 0`); Vionne's
  status-gate and Veshko's value-gate arrive **with those banks**, not stubbed.
- **b. Standing** — how the bank *knows* you. Built on **shipped** substrate:
  **recognition** (belief — does it know your face; the auto-introduce) + later
  **regard** (the bank's private, graded trust; referent = the corpo so it
  persists across staff/branches). Rides **regard, not renown** — the bank's
  *private* view, not public fame — so it's **independent of the deferred
  reputation system** (only interest needs that). Goodkin v1 uses
  recognition-binary (known → known); graded regard (Veshko's computed worth,
  Vionne's threshold) arrives with the banks that grade.
- **c. Affiliation** — opening records `corpoKey` (**shipped**); the relationship
  *is* your corpo standing. The consequences (faction approval, the enfolding,
  rival friction) are the **deferred** corpo-faction system; the record and the
  standing exist now. Goodkin's is the **Circle** (a persistent membership marker
  set by the enrollment ceremony). **The Circle is NOT inert in v1** — it's the
  recognized-standing *key* the perks we already designed hang off: **reception**
  (skip the queue — the recognition-gated Attendant config) + a **higher cash quota**
  (the standing-scaled withdrawal limit §8). So being in the Circle *does
  something* (you're received, you can pull more cash) without building the
  deferred faction system — a complete record with deferred *further* consumers
  (faction approval, housing), not half-grown.

**Credit is NOT here.** No tab, no short-term credit, no lending in v1 —
deferred wholesale as its own real design (§5.7). And that deferral **resolves
"how dark is Goodkin v1?" by construction**: the mechanical bind *was* the tab,
so with credit gone, **v1 Goodkin is all-warmth with the leash implied** — not a
choice, a consequence. The teeth arrive when credit is designed for real.

### The open-and-fund enrollment scene

The Goodkin onboarding beat, each step with its **delta**. The 20 onboarding coin
isn't *required* to open (Goodkin's minimum is 0 — even the broke are welcomed);
it's what makes the account (and the card) actually *work*.

1. **Intercept (hall)** — the officer (Halloran) crosses to the newcomer rather
   than let them queue. *(Goodkin's Attendant config: the recognized / newcomers are
   **received**, not lined up — see the queue/skin note below.)*
2. **Welcome + name (parlor)** — coffee you didn't ask for; you give your name →
   **recognition begins** (a belief write; he greets you by name next time).
3. **Open** (`bank open`) → **account opened** (empty, `corpoKey: goodkin`);
   *"you're one of ours now."*
4. **Fund** (`deposit 20`) → **20 physical `Coin` → the till; balance = 20** (you
   watch cash become a number; amount is your call — agency).
5. **The card lights up** (`pay`) → **your born-with payment credential is
   linked + active on the funded account**; cash-fumbler → pay-by-card (*the
   payoff*, and it's free — it just happened by depositing).
6. **The Circle** → **affiliation / Circle marker set**; he enrolls you *without
   really asking* and slides across the Enclave-housing pamphlet — the velvet cage
   in one gesture, **all implication, no mechanism** (credit deferred).
7. **Depart** — you leave with an account, a live card, a Circle membership, and a
   bank that knows your name: four **bleeding records** stamped onto *you* (§10),
   vs the Vionne frontage's no-trace refusal.

**Decisions this commits:** (a) **verb-driven, officer-wrapped** — the player runs
the real `bank open`/`deposit`/`pay` (learning the CLI, via UI-preview + natural
prompting); the officer supplies the *warmth*, not the *doing* (fully-mediated
would teach nothing and foster the exact dependence that is the cage — so the
leash lives in the Circle/housing steer, not in hiding the mechanics). (b)
**relationship in the parlor, the mechanical act at the counter** (one till), so a
little parlor↔hall movement. (c) the enrollment is a **dialogue tree**
(`SustainedEngagement`) with the banking verbs run inside its frame.

### Queuing / being-served = the Attendant subsystem

"You queue up and get heard one at a time" is **not** a bank feature — it's a
universal storefront-attention pattern now designed as its own foundational
substrate: [attendant-subsystem.md](./attendant-subsystem.md). The bank *runs* it; the
per-corpo queue behavior (Goodkin **reception** / Veshko **take-a-number** /
Hollis scrum / Vionne appointment) is **config** on the shared subsystem, and the
**anti-grief lease/eviction** (exclusive attention is a lease, not a lock — revoked
on idle) is core to it. Build Attendant *before* the bank so the bank is one clean
instance.

### The Dave's Bar tab — remove it

The shipped `TabMixin` tab is the exact half-grown thing: skippable (leave
without paying; skipping just costs regard while the debt "stays on the books") —
soft credit with no real enforcement. And it's **redundant**: Dave's already
charges **pay-per-drink at order time** (shipped, complete). **Decision: rip out
the tab, keep pay-as-you-go** — zero credit anywhere until it's designed. (The
hard-enforcement alternative — "can't leave the building until you settle" — is a
legitimate *complete* mechanic and notably *isn't* credit, just deferred-within-
visit payment; but pay-as-you-go already covers the function. Only build the hard
tab if we specifically want the "running a tab" bar texture.) A small
self-contained cleanup — do it as its own pass or fold into the bank build (open).

### The refusal ⟷ success experience

**Do banks refuse you? Yes — it's the emotional core of the district.** Refusal
*is* the access gate: Goodkin/Hollis/aevex welcome everyone; **Vionne refuses on
status, Veshko on value.** Designing it well is what makes access mean anything.

**Refusal** — four things make it land: (1) **in character, never a system
message** — Vionne's discreet functionary, impeccably polite ("by introduction
only"); the courtesy is what stings. Veshko blunt ("we don't open accounts under
[threshold]"). (2) **legible** — you learn the bank's currency (status / worth).
(3) **a goal, not a dead end** — plants aspiration (Vionne) or a number (Veshko).
(4) **meant to sting** — being turned away by a bank is a status wound; that's
the point.

**Success** — a spectrum of belonging; the bank holds up a mirror to where you
stand: **Goodkin** — *wanted* (enfolded, coffee, "the family"; too warm — the
cage) · **Hollis** — *processed* (one of the crowd) · **aevex** — *harvested* (a
frictionless profile) · **Vionne once you qualify** — *arrival* (the salon opens;
you've made it) · **Veshko** — *respect* (a cold nod; worth the terms).

The Counting-Houses is where the city's class map becomes a *feeling* — you walk
in wanting money-services and the district tells you where you stand.

---

## 8. Account architecture

- **The bank banks with itself.** Its operating account is held *at its own
  branch* (`bankPath` = the branch's own path). A fee is then an **intra-bank
  transfer** (customer balance → the bank's own balance, both on the branch's
  books) — total branch balances unchanged, the till backs them 1:1 trivially.
  (Routing income to *another* bank, e.g. the CB, is a cross-bank transfer that
  moves ledger balances without cash → over-backs the till → a deferred
  interbank-settlement obligation. The CB *is* the real-finance destination for
  reserves, but only once reserve requirements / interbank settlement exist. Not
  v1.)
- **Who owns it: the branch `Business`.** `{owner: the Goodkin-branch Business,
  bankPath: the branch}` — the shipped `ensureVenueAccount` pattern. Same P&L
  machinery as Dave's Bar / the TPA budget. A bank is a `Business` whose product
  is banking.
- **Two reserves kept distinct:** the **till** (physical coin in the
  `BankCounter`, backs *customer* deposits 1:1) vs the **operating account** (the
  bank's own money). Keeping them apart is what keeps "vault == customer
  balances" true.
- **Ownership ladder:** the manager *operates* it (an employee) < the branch
  `Business` *owns* it < the **corpo** is the parent above (§9).

### Withdrawal, liquidity, and the till quota

- **Where the till's coin comes from.** The till *is* the `BankCounter`'s physical
  `Coin` contents (`getTillLiquidity()` = Σ vault coin). It fills from **deposits**
  (customer cash → vault, 1:1); all coin ultimately traces to CB `issueCash` (the
  only mint). **Build item: seed an opening vault float** (an `issueCash` to the
  till at setup) — the seed populates *zero* coin today, so a fresh-world till
  starts empty and early withdrawals would fail before deposits accumulate. A bank
  opens with cash in the drawer.
- **Can the till run dry? Yes — the liquidity ≠ solvency lesson (shipped, AC#13).**
  `withdraw` is bounded by the till. A cash-depositor can *always* get their cash
  back (their coin is in the vault), but a balance funded by **ledger credits**
  (wages, transfers, subsidies — not cash) can exceed vault coin → **solvent but
  illiquid**, the withdrawal refused (*"the branch can't cover that in cash right
  now"*). Newcomers (cash-in) essentially never hit it; it bites depth-game and is
  the **bank-run seam**. Make the refusal **graceful + diegetic + alternatives**
  (pay-by-card / transfer don't touch the till), skinned per corpo. The
  sophisticated restock (CB reserve-lending / interbank cash settlement) is the
  deferred banking wave.
- **The till is a common-pool resource → it needs a quota (anti-grief).** A single
  actor draining the whole reserve to deny others is a **commons-drain** grief —
  the sibling of the Attendant lock-hog (see
  [attendant-subsystem.md](./attendant-subsystem.md) §8 + the anti-grief-resource-guards
  memory). Guard = a **per-account cash-withdrawal cap per period** (real-finance:
  ATM / daily limits, for exactly this liquidity + fraud reason). Over the cap →
  diegetic refusal + push onto the ledger (transfer / card) — which *also*
  reinforces *keep-large-value-on-the-governed-ledger* (the same lever as the
  denomination ceiling). It converts a burst-drain into at-most-a-cap-per-period
  (deposit inflow absorbs it); the residual (a whale slowly cashing out their
  *own* balance) is legit. **Per-account only — never cap the collective** (many
  withdrawers = a bank run = a *feature*, not grief). **Scales with standing**
  (stranger low, Circle high — a status perk; ties Relationship §7). **Distinct
  from till-low:** till-low protects the *bank* (can't hand out coin it lacks); the
  quota protects *other users* (one actor can't drain the shared pool), and it
  binds *even when the till is full*.
- **Implementation is free** (shipped substrate, no new state): "withdrawn this
  period" is a **derive-on-read** sum over the append-only ledger (`entriesFor`,
  `withdraw` legs since the `WorldClockApi` game-day boundary) vs the cap — no
  stored counter, no scheduler (no Law-2). **v1/Goodkin:** the quota *mechanism*
  ships (the till is a common pool, can't go unguarded), cap **generous**
  (20-coin newcomers never near it) — built-but-permissive, like the fee
  mechanism.
- **Till security (a third grief vector).** The till is real `Coin` in a
  `Container`, so its contents must be **secured** — never loose-`get`table: only
  the banking verbs move vault coin (the diegetic grille made mechanical — vault
  contents `FromBankingApi`-gated / a sealed vessel). Otherwise "loot the drawer"
  is free money with no withdrawal at all. (Full heist/robbery deferred; this is
  just "you can't trivially grab the vault.") Sits alongside the lease (exclusive)
  and the quota (common-pool) as the third anti-grief guard here.

---

## 9. Corpo income — start early

**Goal:** give corpos a real balance sheet **as early as possible**, because
corpo income *compounds* — start the ledger now and the faction/spending systems
inherit real, *earned* war chests later, no retrofit. Cheap to start: one
account, one split.

- **Mechanism — a revenue share (royalty).** Every fee the branch collects
  **splits at collection**: a small % off the top to the **corpo treasury**, the
  rest to the **branch operating account** (working capital — pays branch wages
  and costs). Reuses the shipped **remittance-split seam** (the TPA fare
  precedent) → event-driven (no scheduler, no Law-2 issue), conserved, and the
  corpo has income from the **first transaction**.
- **Invisible to the player.** It's an internal split of money *already
  collected* — adds nothing to what anyone pays.
- **Per-corpo dial** (an AppSetting) — a characterization lever later (a corpo
  that bleeds its branches vs one that reinvests).
- **Ownership.** The corpo owns the treasury — an account keyed on `corpoKey`
  (the `Corpo` stays a pure-data Idea; the treasury is a well-known account it
  owns, the TPA-account pattern), created lazily via an `ensureCorpoTreasury`
  mirror of `ensureVenueAccount`. Held at the corpo's own bank (Goodkin's
  treasury at Goodkin Bank — intra-bank, 1:1 clean).
- **Real Layer-B money** — fed by real player fees, so Goodkin-corp's treasury
  grows from real play. The other four corpos' income stays notional (Layer A);
  the firewall holds.
- **v1 just accumulates** — the point is the ledger *begins*. Spending is
  deferred. (Macro note for later: a hoarding corpo is a sink; it recirculates
  when the corpo spends, and the reserve manages it at city scale.)
- *(The literal "wholly-owned branch remits **net** profit up" is more realistic
  but needs a periodic sweep and delays income — an optional realism layer for
  later.)*

---

## 10. How it manifests as Stuff (the object model)

The whole design sorts along two axes — **persistent vs transient**, and
**self-contained in the building vs bleeds outside**. The headline: **the
building is physical Stuff (self-contained); the relationship is records (they
bleed).**

**Physical Stuff — persistent, self-contained to the building:**
- **The rooms** — `Location`s (banking hall, Circle parlor), under a
  Counting-Houses `CartesianZone`. The downtown avenue block is also a `Location`
  but is *public street* (bleeds — the connective tissue to the crossing). The
  vault is a dynamic `Detail` (prose), not a room, until heists make it real.
- **The teller counter** — a `Thing` fixture (`BankCounter` / `BankMixin`) in the
  hall; the banking verbs come off *it*, not the room. **Terms** live as a
  value-object *on it*; the posted rate board is a **dynamic `Detail`** rendering
  that data live (the crossing `tower`-reads-the-clock pattern), not its own
  Thing.
- **The till** — actual `Coin` Things inside the counter. The one and only place
  the bank's money is physical, self-contained, robbable Stuff. Everything else
  about money is records.
- **The NPCs** — Wenna and the officer are `Character`s (`Behaved`; the officer's
  enrollment tree is brain *config*, not its own Stuff; `Employed` by the
  Business). Bodies self-contained; their *memory of you* is not.
- **Gated doors** (refusal machinery) — `Door`/`Boundary` Stuff with an access
  veto on traverse (the crossing's locked-gate pattern). Goodkin has none;
  Vionne's salon door is one.

**Records — persistent, but they *bleed* (they're about *you*, not the
building), and none is Stuff or lives in a room:**
- **Accounts & ledger** (`bank_accounts` / `bank_ledger`) — your account, the
  bank's operating account, the corpo treasury. The bank's money *as balances*
  isn't in the building; only the till coin is.
- **The bank knowing you** — `belief`/recognition (later regard) on the NPCs via
  `BeliefStoreMixin`, in the `beliefs` collection, per-`(viewer, you)`. Global
  memory.
- **Affiliation / Circle membership** — a marker on the account (or a per-corpo
  standing record). You're a Goodkin customer *everywhere*.
- **The Business & Corpo** — `Idea`s (data), owning roster/positions/account and
  treasury respectively.

**Transient — not persisted, gone after the moment:** `Scene`s/messages (the
welcome, the officer's greeting, *the refusal line*); the enrollment
`SustainedEngagement` (its *outcome* — Circle membership — persists as a record;
the conversation doesn't); per-viewer `clientState` (board render, inspection
pane).

**Shadows — the per-viewer override seam:** access *presentation* (the salon door
open-to-worthy / closed-to-unworthy per viewer); recognition-driven naming
already rides this. **Goodkin v1 needs none** — it welcomes everyone identically.

### The refusal ⟷ success asymmetry, in objects

This is the deep version of the contrast, and it's visible right in *which kind
of object each produces*:

- **Refusal is self-contained and transient** — a gated `Door` + a per-viewer
  access predicate + a `Scene` (the polite line), optionally a doorman
  `Character` or a `Shadow`. All inside the building, and **when you leave,
  nothing followed you out.** No record was written about you; you were nobody to
  them and you leave still nobody. (Unless we deliberately persist the sting — a
  belief note — which we do **not** in v1.)
- **Success writes persistent, bleeding state onto you** — you walk out with an
  **account** (ledger record), the bank's **memory** of you (belief), and an
  **affiliation** (standing): three records the building stamped onto *you*, now
  true everywhere. Doing business *makes you someone*.

**Success is the building writing records onto you that outlive the visit;
refusal is a closed door that leaves no trace.** Belonging changes you and
follows you home; exclusion is self-contained and forgotten. The asymmetry *is*
the meaning — legible in "which of these produced a persistent record about the
player."

---

## 11. The v1 build scope (when we build it)

Geography — re-home from the `eternal/university-avenue` placeholder into the
**Terminus civic core**, sphere-correct (`domain/terminus/`), as the downtown
**Counting-Houses** financial quarter *off* University Avenue (its own street,
the way money districts work — Lombard off Cheapside):

```
   N → Campus
        │
 [CROSSING] ─W─▶ [University Ave, downtown] ─W─▶ [Counting-House Row → Goodkin branch]
        │            (the avenue has length)      (hall + Circle parlor + glimpsed vault)
   S → TPA (the hub)
```

**Objects we actually build (per §10):**
- Self-contained Stuff: 2 `Location`s + a downtown avenue `Location` + the
  Counting-Houses `Zone`; the `BankCounter` `Thing` with `Coin` till contents;
  Wenna + the officer `Character`s; **no gated doors** (open access).
- Data on fixtures: the **Terms** value-object + its dynamic board `Detail`.
- `Idea`s + records: the branch **`Business`**, the **`Corpo`** treasury account
  (the royalty target), and — written *by using it* — customer accounts, NPC
  belief, the Goodkin affiliation/Circle marker.
- Live end-to-end: the shipped banking loop, Terms (nearly fee-free), the
  bank-banks-with-itself architecture, and the **corpo royalty** wired so
  Goodkin-corp starts accumulating.
- **Refusal machinery: none for Goodkin.** If we want the accepted-vs-refused
  contrast in v1, it's a small **atmosphere-frontage** beat on the avenue block —
  a closed `Door` + a refusal `Scene` at the Vionne/Veshko frontages (complete
  set-dressing that refuses you, *not* a stub of a real bank). **Open decision:**
  include the frontage refusal beats, or keep v1 to Goodkin's welcome alone.

**Cleanup:** retire the old `eternal/university-avenue/{bank,bank-counter,
npc/teller}` seeds + fix the four tests referencing them; **remove the Dave's Bar
tab** (§7). **Reseed hazard:** the seeder is insert-only, so moving seeds needs a
live-DB migration (delete-and-restart the affected rows); Atlas is at its
500-collection cap — see the `university-avenue-crossing-mr-state` memory.

**Not a `feature/university-avenue-crossing` follow-on** — that MR is merged;
this is fresh work off `origin/master`.

---

## 12. The new-player money arc + why you bank

- **Wayfinding.** The newcomer isn't force-routed (agency preserved), but the
  world **signals** the bank: **Gus** — the crossing guard already standing at the
  crossing, a traffic-director by trade — points newcomers west (*"counting-houses
  are down the avenue, friend"*); the crossing prose already names downtown to the
  west; the onboarding-coin grant can carry a one-line hint. **Discovery, not a
  quest marker.**
- **The loop.** Arrive with 20 coin → you're fumbling cash → walk downtown →
  open + deposit (the enrollment, §7) → the card activates → `pay` by card
  everywhere. **Deposit is the rich beat; withdrawal is the deliberate inverse** —
  you pull physical cash only when you genuinely need it: **hand-to-hand to another
  player** (the one thing cash does that a card can't — off-ledger), cash-only /
  informal vendors (the grey market), tips. A functional teller op (gated by hours
  / till / quota), not a scene.
- **Why you bank — the lasting pull is PHYSICS, not a rule.** Cash has **mass**
  (shipped `Coin` weight + the `LoadBearing` encumbrance gauge); a fortune in coin
  is literally too heavy to carry, so **wealth must go on the ledger.** That's the
  anti-laundering-by-mass thesis realized as honest physics — the primary, *shipped*
  answer to "why keep banking past the tutorial": you physically *can't* hold much
  cash, and the card lets you spend the ledger anyway. The **denomination ceiling**
  is the tuning dial. Amplifiers (deferred): robbery / theft. (Death-drop: per the
  kill-loot-severed rule, cash is *not* dropped to killers; the death-cash
  interaction rides the deferred death design.)
- **Persistence.** The account (ledger) persists (Mongo); cash-in-pocket persists
  across logout (the shipped inventory persist-back / persistence spine). Neither is
  lost to a logout — the account is the *safe, weightless* store, cash the
  *carried, heavy* one.

### The coinage (grounding the physics)

The `Money`/`Coin` model already supports a denomination set (a `COIN_FACE_VALUES`
map; per-denomination `Coin` stacks, each with its own mass via `Tangible`;
`globIdentityFields = ['denomination']` so denominations stack separately). v1
ships only `credit = 1` — so today a drink is *twelve* one-credit coins and a
fortune is a mountain of them. The design = populate the richer set.

- **Cash is coins only — no bills.** This *is* the anti-mass mechanism: physical
  money is heavy metal, and there is no light high-value paper. The highest coin
  (the **ceiling**) sets the best value-density; above it, value lives only on the
  weightless ledger. (Notes/bills are deferred/unlikely — they'd defeat the mass
  limit; only ever a special instrument with its own justification.)
- **A tight, legible set (tunable): 1 / 5 / 25 credits** (add a 10 if making change
  feels clunky), each a `Coin` with its own denomination + per-coin mass. Higher
  denominations are *more value-dense* (heavier absolute, far lighter per-credit),
  so you prefer the ceiling coin — and the ceiling caps how light cash can ever be.
- **The physics (starting masses, tunable): ~1cr = 2 g, 5cr = 4 g, 25cr = 8 g** →
  the ceiling coin ≈ **3 credits/gram** (~3000 credits/kg), the best density cash
  can reach. So **max carriable cash ≈ carry-capacity × ~3000 credits** — a *hard
  physical ceiling* set by the coinage — with a **comfort gradient** below it: a
  few hundred credits is nothing, a few thousand a noticeable pocketful, ~10k+ a
  heavy bag you'd bank, and past the capacity limit you *physically cannot* carry
  it. **Banking-past-the-tutorial is thus physics.** The **denomination ceiling is
  the CB's cash-limit policy dial** (raise it → lighter cash, less forcing, more
  off-ledger value; lower → more forcing) — calibrate the ceiling to the economy's
  "what's a fortune" as content fills in.
- **Newcomers never feel it:** the onboarding 20 = ~4 five-credit coins (~20 g); a
  drink a couple of coins. Weight bites only at wealth (the depth-game intent).
- **Dispensing + change (implementation):** `withdraw` / `issueCash` should dispense
  **largest-first make-change** (a real cash machine — efficient coins, not a pile
  of 1s); the vault holds mixed-denomination stacks; `getTillLiquidity` sums face
  values. Cash-*payment* change v1 = **exact-cash-or-card** (pay cash if you hold
  the denominations to make the amount — the 1-credit coin makes exact usually
  possible — else the card); payee-makes-change is a refinement.
- **Flavor (content):** the currency is the CB-minted civic **credit** — orthogonal
  to the corpos (corpos *affiliate* accounts; they don't issue currency).
  Denomination names + mint designs are light content.

## 13. Deferred seams (named, so we don't stub them)

**Credit — the whole system** (the tab / short-term credit / lending / interest
[reputation-gated] / creditworthiness / insolvency / deposit insurance): built as
one real design, never a per-venue tab. Removing the Dave's Bar tab is part of
holding this line. · Maintenance (time) fees (reconcile-on-read, with the first
bank that charges them) · **graded regard** (with the first bank that grades
trust) · safe-deposit + the enterable vault · the **corpo spending / faction /
approval** consequences of affiliation · the full city **Atmosphere economy +
Circulation Reserve autopilot** (terminus-city.md §6–7) · the **other four real
banks** (each a from-scratch build in its own district, never a frontage
upgrade) · the **net-profit sweep** and **multi-branch** corpo treasury · the
traveler's-exchange kiosk at the terminal (map-faithful, optional).
