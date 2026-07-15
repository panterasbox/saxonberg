# Attendant substrate + Goodkin bank — requirements

The deliberate bank experience, built on a universal storefront-service
substrate. This cycle delivers three coupled things: **(1) Attendant** — the
universal "walk into a storefront, wait, get attended one at a time" substrate
every venue runs, complete with both anti-grief guards; **(2) the Goodkin bank**,
re-homed to its permanent Terminus civic home (the Counting-Houses) as a complete
`Business` that *runs* Attendant, realizing the new-player money arc end-to-end;
and **(3) the coinage** that grounds the cash⟷ledger physics. The plan phase will
sequence this into phases (Attendant foundation → retrofits → the bank); the
requirements are one unit because the bank is Attendant's first native consumer and
the two verify together.

Seeded by the locked design in
[docs/staging/attendant-subsystem.md](../staging/attendant-subsystem.md) +
[docs/staging/terminus-banking.md](../staging/terminus-banking.md). Builds on
shipped substrates: `activity.md` (engagement = being-attended), `residency.md`
(idle-eviction pattern), `employment.md` (servers + hours), `banking.md` (money),
`npc-dialogue.md`/`belief.md` (enrollment + recognition), `address.md`/`zone.md`
(the re-home).

## Goals

- **Attendant substrate exists and is real venues' service layer.** A `AttendantMixin`
  service-point (server via employment, being-attended via the engagement
  substrate, an ordered queue) with per-venue config: the discipline framework
  (reception / FIFO line / take-a-number / scrum / appointment), staffing/hours
  (roster-derived; staffed / self-service-machine / closed), and the diegetic
  skins. `lib/attendant/`.
- **The bar + TPA ticket office are retrofitted as Attendant instances** with
  behavioral parity (the bar configured informal/zero-wait to feel unchanged; the
  ticket office a formal counter), so they *run the substrate* and gain its guards.
- **Both anti-grief guards are in place and non-optional.** Exclusive
  service-attention is a **lease** — held only while actively used, revoked on
  idle (dispatch-touch recency + lazy real-time sweep + default-evict), released on
  linkdead. The bank till is a **common pool** guarded by a per-account cash
  **withdrawal quota** (derive-on-read over the ledger). The vault coin is
  **secured** (moved only by the banking verbs, never a loose `get`).
- **Goodkin lives in its permanent home.** Re-homed from the placeholder
  `/domain/eternal/university-avenue/bank` into `domain/terminus/` — a new
  **Counting-Houses** address locality + district zone off University Avenue:
  crossing → (west) a downtown avenue block → (west) the Goodkin branch (banking
  **hall** + **Circle parlor** + a glimpsed-prose vault). The crossing's `west`
  exit repointed; the old placeholder seeds retired.
- **Goodkin is a complete `Business` running Attendant** — a manager/proprietor,
  positions (teller + officer), staff on a roster (= the bank's hours), its own
  operating account (bank-banks-with-itself, held at its own branch), a P&L.
- **The new-player money arc works end-to-end.** Arrive with the onboarding coin →
  the world signals the bank (Gus points west; crossing prose; an onboarding
  hint) → the **open-and-fund enrollment** (the officer *receives* you — a Attendant
  reception interaction → a dialogue-tree) opens + funds the account and
  **activates the born-with payment card** → `pay`-by-card works everywhere →
  `withdraw` returns physical cash (gated by hours / till / quota). Wenna (teller,
  hall) + the officer (Circle host, parlor) are the two NPC carves.
- **Terms exist and are diegetic** — a per-bank fee schedule authored on the bank,
  read at each verb, every fee a conserved `fee` leg → the P&L, posted on a
  dynamic rate-board `Detail`. Goodkin's schedule is nearly fee-free (core loop
  free; only a light cross-corpo wire fee live).
- **Corpo income begins** — a revenue-share **royalty** splits each collected fee
  to a **Goodkin-corp treasury** (owned by the corpo, keyed on `corpoKey`, held at
  its own bank), invisible to the player; the corpo accumulates from real play.
- **The Circle affiliation does something in v1** — enrollment writes recognition +
  a Circle membership marker; the Circle confers **reception** (queue skip) + a
  **higher withdrawal quota** (the perks already in the substrate). Further
  consequences (faction/housing) deferred.
- **The coinage makes wealth physical** — a **1 / 5 / 25-credit** denomination set
  with per-coin masses (ceiling ≈ 3 credits/g), largest-first make-change
  dispensing on `withdraw`/`issueCash`; a fortune is too heavy to carry, so wealth
  must go on the weightless ledger. An **opening vault float** seeds Goodkin's till.
- **Cleanups** — the Dave's Bar soft-`TabMixin` tab removed (pay-per-drink stays);
  the old university-avenue bank/counter/teller seeds retired; the re-home reseed
  migration documented.

## Non-goals

- **Credit — any form.** No tab, no short-term credit, no lending, no interest
  (reputation-gated, far out), no creditworthiness/insolvency/deposit-insurance.
  Removing the Dave's tab is *part of* holding this line. (Deferred to a dedicated
  credit design.)
- **The other four banks** (Hollis/Vionne/aevex/Veshko) and their **refusal
  frontages** — deferred. Goodkin's welcome only; the accepted-vs-refused contrast
  waits. (The substrate ships the disciplines a gated bank *would* use — take-a-
  number, appointment — but no content venue enables them here; see the surface
  decision on verification.)
- **Maintenance (time) fees, graded regard, corpo faction/approval consequences,
  the Atmosphere/Circulation-Reserve city economy, the net-profit sweep,
  multi-branch treasuries** — deferred (named in the staging docs).
- **Bills/notes, payee-makes-change, safe-deposit, the enterable vault / heists,
  the CB reserve-lending restock, the traveler's-exchange kiosk** — deferred.

## Surface decisions

### First cycle = full Attendant + Goodkin + coinage
One combined requirements unit (the plan sequences the phases). Rationale: the
bank is Attendant's first native consumer, so building them together lets Attendant
verify end-to-end against a real venue and delivers the visible payoff (the bank)
in the same cycle. Coinage folds in because cash physicality is where "why bank"
lands and the bank is where cash matters most.

### The full Attendant substrate ships (all disciplines + staffing + self-service)
Per the scope choice, the substrate is built complete — the discipline framework,
the three staffing states (incl. the self-service machine), the skins, the lease.
**Implication (a constraint, below):** disciplines/states no v1 *content* venue
exercises (take-a-number, appointment, the self-service machine) ship without a
live consumer, so they require **test/demo verification vehicles** — they are not
merely stubbed.

### Per-venue Attendant configs
Goodkin = **reception** (recognition-gated skip; the officer receives you) +
staffed-during-hours / closed-off-hours (no machine at Goodkin v1); the bar =
**informal / zero-wait** (parity with today); the ticket office = a **formal
counter**.

### Anti-grief guards are completeness requirements
The lease (exclusive attention), the withdrawal quota (common-pool till), and till
security (vault coin) all ship *with* their resources — an unguarded exclusive or
shared resource is broken by construction. Per-account quota only, never
collective (a bank run is a feature).

### Coinage = 1 / 5 / 25 credits, coins-only
No bills (the anti-mass mechanism). Higher denominations more value-dense; the
ceiling coin caps density. Masses tunable; the denomination ceiling is the CB's
cash-limit policy dial. Currency = the CB civic **credit**, orthogonal to corpos.

### Credit out, rivals out
Both deferred wholesale (above).

## Constraints

- **Never-half-grown** — each guard and each shipped discipline is complete at its
  tier (not a stub); a resource ships with its guard.
- **Reuse shipped substrates, no new primitives where one fits** — employment
  (servers/hours), the engagement/`AbortReason` substrate (being-attended + the
  lease abort), the residency idle-eviction pattern (recency touch + lazy
  real-time sweep + default-evict), belief/recognition (reception + the bank
  knowing you), the dialogue substrate (enrollment), banking (money), address/zone
  (the re-home). The Attendant lease/quota are *not* lifted into a shared primitive
  yet — Attendant owns them, built clean to lift later.
- **Banking invariants** — conservation (only the CB mints; fees/royalty conserve),
  Law-1 (no worth stamped on a good), Law-2 (idle balances unchanged — the quota is
  derive-on-read, no scheduler; no maintenance fee). The 1:1 custodial till
  invariant holds across deposit/withdraw.
- **Security/gating patterns** — Api → logic-singleton split, `FromModule` gates,
  actor-derived-from-context (never a param), the `callable == visible` invariant.
- **Bar + ticket-office retrofit must not regress** existing behavior or tests
  (behavioral parity; the bar reads zero-wait).
- **The re-home migration** — the seeder is insert-only, so retiring the old bank
  seeds + adding the Counting-Houses seeds needs a live-DB migration
  (delete-and-restart the affected rows); fresh DBs are correct automatically.
  Mind the Atlas 500-collection cap for demo DBs.
- **Module homes** follow the taxonomy — `lib/attendant/` (the substrate), banking
  additions in `lib/banking/`, the Counting-Houses content under
  `domain/terminus/` + `seeds/domain/terminus/` + `seeds/lib/address/`.

## Acceptance criteria

- A `AttendantMixin` service-point exists; a venue configures servers (from the
  employment roster), a queue discipline, staffing behaviour, and a skin. Tests
  cover each discipline (reception / line / take-a-number / scrum / appointment)
  and each staffing state (staffed / self-service / closed), including
  demo/test vehicles for the ones no content venue uses.
- Being-attended is an engagement; a single server serializes (can't attend two);
  the **lease** revokes an idle hold (recency reset on service acts; swept and
  aborted when stale) and releases on linkdead — covered by tests.
- The **withdrawal quota** refuses over-cap cash withdrawals (derive-on-read over
  the ledger), per-account, never collective, scaling with standing; **till
  security** prevents looting vault coin by any path but the banking verbs — both
  covered by tests.
- The bar + ticket office run Attendant with no observable behavioural change
  (existing tests green); they gain the lease guard.
- A player can walk crossing → downtown → the Goodkin branch; open + fund an
  account through the officer's reception/enrollment; the payment card activates;
  `pay` works at the bar and the fare; `withdraw` returns physical coin (bounded by
  hours/till/quota) — verified live end-to-end (integration-harness where the
  Atlas cap blocks a fresh DB).
- Goodkin runs a P&L; a fee splits a royalty to the Goodkin-corp treasury (both
  accounts derive lazily); the coinage seeds an opening float and dispenses
  largest-first make-change; a large cash balance is measurably too heavy to carry.
- The old `/domain/eternal/university-avenue/{bank,bank-counter,npc/teller}` seeds
  are retired and the four referencing tests updated; the Dave's Bar tab is gone
  (pay-per-drink intact).
- Subsystem docs land (finalize phase): `attendant.md` (new), banking.md updated
  (Terms, quota, royalty, coinage, staffing), and the staging docs retired/graduated
  per the workflow.
- Full suite green; typecheck + lint:gates clean.

## Cross-references

- **Seeding design:** [attendant-subsystem.md](../staging/attendant-subsystem.md),
  [terminus-banking.md](../staging/terminus-banking.md),
  [terminus-city.md](../staging/terminus-city.md) §6 (the business-landscape model).
- **Load-bearing subsystem docs:** activity, residency, employment, banking,
  npc-dialogue, belief, address, zone, corpo, credential.
- **Governing memories:** never-half-grown/everything-a-business,
  anti-grief-resource-guards.
