# Terminus Terminal + travel-credential identity binding + transit-fare economy — requirements

Three tightly-coupled deliverables in one cycle:

1. **The Terminus Terminal** — a central transit hub authored as new
   content: a station hall (connective tissue) with **three departure
   gates** (two **out of service** at launch, one operational), **one
   arrival gate**, and a **ticket office** staffed by a **terminal clerk**
   (who procures replacement TPA cards *and* is the city budget's paid
   employee). It becomes the network's central interchange, **sited on
   University Avenue, across the street from the university gate** — the
   standalone University Avenue TPA stop is retired and Terminus absorbs the
   campus-arrival role. The network becomes **Lounge ↔ Terminus ↔ the
   newbie-wilds crossroads**. It is the first content to exercise the
   `departure`/`arrival`
   **directionality** feature (today every shipped terminal is `both`) and
   the first to light the authored `status` out-of-service seam.

2. **The travel-credential identity fix** — bind travel **authorization**
   (the registered-destinations set) to the *traveller's identity*, not to
   a carried, transferable card. Today a `TravelCard` (a `Thing`) can
   accumulate registered destinations and be handed to another player,
   whose `teleport` then reads the card's set — an access-escalation leak.
   The fix makes clearance a structural property of the traveller (the
   born-with aether wallet), with **card *or* implant** serving only as the
   *instrument* that lets the verbs run.

3. **The transit-fare economy** — routes can charge an **author-set fare**
   (0 = free; the lounge↔terminus hops stay free). A paid fare **splits** into
   two **operating budgets**: the **city's operating budget** (Terminus the
   municipality) takes the bulk — its account *collects*, its **wages**
   *recirculate* it (the Dave's Bar loop) — and the global **Teleport
   Authority (TPA)** takes a **network fee** (a flat base + a percentage, so it
   collects on every ride) into the **TPA's operating budget**. Both are real budgets that fund operations (the
   city pays the terminal clerk now; the TPA's network maintenance is
   deferred), **not sinks**. The city budget is realized as a **municipal
   `Business`** (proprietor-absent = public — the substrate's designed
   municipal case); the **full loop** ships this cycle (city budget +
   terminal-clerk Position + wage payout). The network fee is the first
   consumer of banking's **remittance-split** seam. The **money sink**, when
   the economy needs one, is a **CB drain** — a monetary-policy decision that
   withdraws money from a budget back to the CB (the existing central-bank
   drain; deferred), **not** passive accumulation. A small **paid
   destination** ships so the fare is player-experienceable; insufficient
   funds refuses travel.

The seeding slates are the fast-travel tail
([../slates/tails/fast-travel-slate.md](../slates/tails/fast-travel-slate.md))
and the credential-wallet tail
([../slates/tails/credential-wallet-slate.md](../slates/tails/credential-wallet-slate.md)) —
this fix is a *narrow, non-ledger* down-payment on that tail's "a
credential is a **presentation**, not the source of truth" principle.
Load-bearing subsystem docs: [fasttravel.md](../subsystems/fasttravel.md),
[credential.md](../subsystems/credential.md),
[augmentation.md](../subsystems/augmentation.md) (the three-base capability
model + aether host-descent leg), [location.md](../subsystems/location.md)
(zone/room geometry), [boundary.md](../subsystems/boundary.md) (exits),
[banking.md](../subsystems/banking.md) (`settle` / `Charge` / accounts —
the fare path), [employment.md](../subsystems/employment.md) (`Business` +
`Position` + wages — the city-budget loop),
[access.md](../subsystems/access.md) (branch = `ownerGroup` sphere).

Content reference: the original Eternal City TPA the user built —
`docs/eternal/tpa/{station,depart1,depart2,depart3,arrive,office}.c` —
station hall + three departure gates + arrival alcove + Tootie's ticket
window (`buy card`). Terminus is a from-the-bones re-realization of that
shape in the current engine, **not** a line-for-line port.

## Goals

- **A live Terminus hub** stands up at boot as network-resident content: a
  station hall, three departure-gate rooms, one arrival-gate room, and a
  ticket office, joined by walk-on-foot exits (the "last mile on foot"
  discipline — the hub is public infrastructure).
- **Terminus is sited on University Avenue**, across the street from the
  university gate. The **standalone University Avenue terminal is retired**;
  Terminus's arrival gate is the campus-edge landing — you arrive at
  Terminus and walk across the street, through the university gate, onto
  campus (last mile on foot).
- **Four terminals** seated in the gate rooms: three `directionality:
  departure` terminals and one `directionality: arrival` terminal (the
  landing point inbound travellers materialize at). **Two departure gates
  are authored out of service** (grey status light, travel refused); **one
  departure gate is operational**. The diegetic status-light colour now
  varies across a single hub (red operational-departure / grey
  out-of-service / blue arrival).
- **The network is Lounge ↔ Terminus ↔ the newbie-wilds crossroads.** The
  lounge terminal routes to the Terminus **arrival** node; Terminus's
  operational **Gate A** routes back to the lounge (free) and out to the
  crossroads (paid). Because the hub has no foot connection to the rest of the
  world, the **born-with registration floor** is a **three-node set** — the
  Terminus arrival node, **the lounge**, and the crossroads (replacing
  University Avenue) — so the interchange and the social hub are universally
  reachable by design. (The lounge is on the floor so a fresh player can always
  TPA back to Dave's Bar, having never explicitly registered it.)
- **A staffed ticket office** — a **terminal clerk** (an employed NPC of
  the city-budget Business) procures a fresh `TravelCard` for a traveller
  ("procure a card if you lose yours"); the card itself is **free** (the
  card is an instrument, not a fare). The clerk is also the wage recipient
  that closes the city budget's conserved loop (below).
- **Content is organized by zone.** Terminus is a multi-zone *area*
  (`/domain/terminus/`, a branch = the ownership sphere) whose first zone is
  the **terminal building** (`/domain/terminus/terminal`, its own coordinate
  grid). Rooms live under that zone. The area is owned by the **Terminus
  municipality** owner group (not the TPA — see D9). General rule: an area
  is bucketed by *zone*; a zone dir holds its rooms/fixtures.
- **Routes can charge an author-set fare, split two budgets.** A route
  carries a `fee` (0 = free; lounge↔terminus stays free). A paid ride
  `settle`s the fare *before* travelling, **split** via banking's
  remittance-split seam: the **city's operating budget** takes the bulk, the
  **global TPA operating budget** takes a **network fee** (a tunable
  `AppSetting` rate). Insufficient funds refuses the ride. No money is minted
  — the fare *moves* between real accounts (conserved).
- **The city-budget loop recirculates.** Terminus's terminal is operated by
  the **municipal operating budget** — a public `Business` (proprietor-absent)
  representing Terminus the municipality — that *collects* the city's share
  and *pays wages* to its terminal-clerk Position (a city employee): a
  complete conserved loop (fare in → wage out). The **global TPA** holds its
  own **operating budget** funded by the network fee — a real budget (its
  network-maintenance spend deferred), **not** a passive sink.
- **The sink is a CB drain (deferred).** No budget accumulates as a sink;
  when the economy needs tightening, the **CB drains** money from a budget
  back to itself (a monetary-policy decision — the existing central-bank
  drain) — the designed macro lever, deferred this cycle.
- **A small paid destination ships.** So the fare is player-experienceable,
  one modest **designed** public destination (its own area/zone, an arrival
  gate) is reachable from the Terminus operational departure gate for a
  `fee`, with a **free return** to Terminus. It is **floor-registered**
  (public — authorized for all; the fare, not registration, is the gate). It
  needs **no operator** of its own (the paid route's fare is Terminus's
  city budget's, by departure attribution).
- **New players start with pocket coin (not guests).** A committed char-gen
  player receives a small **hard-coin** grant (physical `Coin` via
  `issueCash` — a logged CB mint, the only faucet, conserved), **drink-sized
  and anti-farm**; **guests get nothing**. Cash is spendable everywhere (the
  bar and the fare accept it), so opening a bank account is a **convenience**
  onboarding beat, not a spending gate.
- **Travel clearance is bound to the traveller's identity.** `register`
  writes the registered node onto the traveller's *identity-bound* holder
  (the born-with, aether-hosted `CredentialWalletUpdate`); `teleport`'s
  registration check and `renderDepartures`' "not yet registered"
  annotation read *that same* identity holder. A carried `TravelCard`'s own
  registered set is **never** consulted for authorization.
- **Card *or* implant satisfies the instrument gate.** "Do you have the
  means to use the TPA at all?" remains satisfied by *any* reachable travel
  holder — a carried card **or** the born-with implant — so onboarding and
  the un-implanted are never stranded. Only *clearance* is identity-bound.
- **The leak is closed by construction, not by scan-order.** Handing a
  loaded card to another player confers no destinations they didn't already
  hold on their own identity.

## Non-goals

- **The full issuer-authorization ledger** (the credential-wallet tail's
  "validity derived on read from an `authorize`/`revoke` ledger"). v1
  clearance is still a stored set — it just lives on the identity holder,
  not a transferable card. The append-only-ledger, derive-on-read model
  stays deferred to that tail.
- **Deputization** and any new credential *kind* — untouched
  (credential-wallet tail).
- **Cross-restart credential durability.** Registration remains
  session-durable (the born-with wallet is re-cloned each login, re-flooring
  the registered set). Persisting the identity clearance across restarts
  rides the deferred persistence work already noted in
  [fasttravel.md](../subsystems/fasttravel.md).
- **Prepaid credits / stored value.** The old office sold "credits" onto a
  card (`buy <n> credits`); dropped. Fares are settled per-ride against the
  traveller's account, not a card balance.
- **The TPA's *expense* side.** The TPA holds an operating-budget account
  fed by the network fee (D9), but it employs no one, runs no maintenance, and
  is not a full `Stuff`/`Business` this cycle — the network-fee revenue simply
  accrues there. The TPA's wear/maintenance/licensing/staff spend is deferred
  (fast-travel tail, Wave 3).
- **The CB drain (the sink lever).** No budget accumulates as a designed sink;
  the tightening lever is a **CB drain** from a budget back to the CB (a
  monetary-policy decision). Wiring that drain — and any policy around it — is
  deferred; v1 just lets the budgets recirculate.
- **Non-municipal operators & a competitive transit market.** The operating-
  budget model is general (a `Business`, affiliation-tagged corpo / independent
  / municipal), but this cycle realizes only Terminus's **municipal** budget.
  Corpo/independent operators elsewhere, and **per-gate competing operators**
  (different gates, different owners/fares), are deferred.
- **A third-party split beyond the network fee.** `settle`'s remittance-split
  is wired for exactly one recipient beyond the city budget — the TPA network
  fee. Further splits (a second levy on top, multi-way remittance) are not
  wired.
- **Fare/wage cross-restart durability & tuning.** Fare amounts are authored
  demo values; balancing the transit economy is not a goal.
- **Scheduled-mode / departures-timetable content** for the Terminus gates.
  The gates are on-demand (`manual`) v1; the timetable seam already exists
  and stays unexercised here.
- **Living-infrastructure** (breakdowns/maintenance) — the `status` seam
  stays inert (fast-travel tail, Wave 3).
- **Route-map / schedule Readables**, wayfinding signage as content —
  deferred (fast-travel tail, Wave 2). Room prose may *mention* the board;
  no Readable object.
- **Collapsing the two per-kind card subclasses** into one `CredentialCard`
  — out of scope (credential-wallet tail).

## Surface decisions

### D1 — Clearance is bound to the identity holder, resolved explicitly

The registered-destinations set is authoritative **only** on the
traveller's own aether-hosted wallet (`CredentialWalletUpdate`, injected by
`Avatar.installDefaultLoadout` and hosted on the avatar's attunement — thus
bound to the avatar's identity, not carried as inventory).

Clearance resolution must **explicitly target the actor's hosted wallet**
(the aether host-descent leg — the actor's own `getHostedUpdates()`), *not*
the general `ContainmentApi.findReachable` scan. `findReachable`'s leg order
happens to hit the hosted wallet (leg 2) before carried inventory (leg 4)
today, but that is an implementation accident, not a security guarantee; the
fix must not depend on it. Resolving the hosted wallet directly makes
identity-binding **structural**.

*Reasoning:* the born-with wallet is already the natural identity anchor —
it rides the aether host, which is the avatar. Moving clearance onto the
`Avatar` as a first-class field was considered (it would also grant
cross-restart persistence for free) but rejected for this cycle as a larger
state-model change; the hosted-wallet home is the minimal, in-architecture
move and keeps persistence exactly as-is (session-durable).

### D2 — Card *or* implant is the instrument; the card carries no clearance

The **instrument gate** ("you have a Teleport Authority credential at all")
stays the general reachable-holder scan (`findReachable` for an
`isCredentialWallet` holder with a `travel` record) — so a carried
`TravelCard` **or** the born-with implant both satisfy it. This is the
user's chosen "card OR implant" model: onboarding never breaks, and the
card is a meaningful backup instrument.

The `TravelCard` **keeps** its (floored) `travel` record so it continues to
satisfy the instrument gate — but that record is never read for
*authorization* and is never written to by `register`. The card is a bearer
*instrument/presentation*, never a clearance store.

*Edge case (documented, not engineered around):* an actor with **no**
hosted wallet (un-attuned, relying solely on a carried card) has no identity
clearance store; their clearance is the born-with floor only, and `register`
has nowhere to record onto (fails gracefully with a clear message). This is
acceptable — effectively every player avatar is attuned and carries the
born-with wallet.

### D3 — `register` writes to identity; departure-only gates reject it

`register` records the node onto the traveller's **identity** holder (D1),
regardless of which instrument they happen to be carrying. The existing
arrival-only guard stands: a `departure`-directionality terminal has nothing
to register (you can never arrive there), so `register` at a Terminus
departure gate is refused, exactly as today.

### D4 — Hub topology: Lounge ↔ Terminus ↔ crossroads, on University Avenue

The standalone University Avenue terminal is **retired**; Terminus, sited on
University Avenue across the street from the university gate, becomes the
campus-arrival landing and the sole campus-edge node. The network is
**Lounge ↔ Terminus ↔ newbie-wilds crossroads**. Terminus is authored as
**distinct** departure and arrival terminals (not one `both` terminal per
gate), realizing the old EC shape and exercising the directionality feature:

- **3 departure gates — A, B, C** — `directionality: departure`. **Gate A is
  operational with two routes:** to the **lounge** (free, the return leg) and
  to the **newbie-wilds crossroads** (paid — the fare demo, and the way out to
  the frontier). **Gates B and C are out of service** (D8) — grey, non-routing;
  the hub's visible expansion capacity. The constraint is that the lounge
  (free) and the crossroads (paid) are both reachable from Gate A.
- **1 arrival gate** — `directionality: arrival`; its `getArrivalRoom()` is
  its own container (the arrival-gate room). This is the node the lounge
  terminal (and the paid destination's return leg) route **to**. It is a
  **born-with registration floor** node (replacing University Avenue) and is
  arrival-capable, so it is also `register`-able in the ordinary way.
- **The paid destination — the newbie-wilds crossroads** ("The Last Counted
  Mile", the frontier hub). This build authors a **minimal v0** of the
  crossroads (its own newbie-wilds branch/zone: one **designed** landing room
  + **one `both` terminal**) — the *arrival* target of the Gate A paid route,
  and the *departure* origin of a **free return** leg back to the Terminus
  arrival node. It is the **integration anchor the deferred newbie-wilds build
  extends** (`docs/staging/newbie-wilds/` — the TPA is diegetically "the Line",
  the terminal the sci-fi bounty came through), not a throwaway stub. A single
  `both` terminal (the lounge precedent) means it **cascade-loads as a route
  target**, needing no extra boot trigger. It is **one of the three floor
  nodes** (public — authorized for all; the *fare*, not registration, gates it), and
  needs **no operator** (it collects nothing; the paid route's fare is
  Terminus's city budget's, by departure attribution).

The born-with floor (`UNIVERSITY_AVENUE_NODE` in `Credential.ts`) is
**repointed** to a **three-node set**: `{ Terminus arrival node, the lounge
terminal (`/domain/lounge/terminal`), newbie-wilds crossroads terminal }` (and
renamed to suit). The lounge is on the floor so **anyone can TPA back to the
lounge / Dave's Bar** — Gate A's free return works even for a fresh player who
never explicitly registered the lounge (no foot path exists). Onboarding's
lounge→campus hop lands at Terminus, and the player walks across to campus; the
crossroads is reachable for a fare (affordable from starting coin — D11, so a
fresh player can head to the frontier).

### D5 — Terminus terminals stand up at boot (explicit trigger required)

Route *targets* load lazily (`StuffApi.singleton(route.ref)` on read), so
the Terminus **arrival** node cascade-loads the moment an existing terminal
renders it on a board or routes a traveller to it. But the **departure-only
gates are never route targets**, so nothing cascade-loads them; a player
standing in a departure-gate room needs the terminal already seated there
for `findReachable` to see it.

Therefore the Terminus terminals need an **explicit boot trigger** — the
`/domain/lounge/terminal` manifest-entry precedent (terminals are
network-resident singletons). The plan chooses the exact arrangement
(per-terminal manifest entries, or a single Terminus hub root whose
`postRegister` seats the set); the requirement is only that all four
terminals and their gate rooms are live and correctly seated at boot.

### D6 — The office is staffed by the terminal clerk (procurement + wages)

The ticket office is staffed by a **terminal clerk NPC** — the city-budget
Business's employee. The clerk serves **two** roles that the "full loop"
decision unifies:

- **Card procurement.** A traveller can obtain a fresh `TravelCard` from the
  clerk (the "procure a card if you lose yours" hook), **free** — the card
  is an instrument, not a fare. (Reverses the earlier dispenser-fixture-only
  plan: the wage loop needs an employed Character anyway, so the clerk both
  hands out cards and receives wages. This is Tootie, reborn as a real
  employee.)
- **Wage recipient (D10).** The clerk holds a `Position` at the city-budget
  Business and is paid wages funded by fare income — the endpoint of the
  conserved loop.

The clerk is a **proper NPC carve** (personality, not a flat functionary —
project memory *npcs-are-expensive-carves*), authored with the npc-behavior
substrate. The exact procurement verb surface (name; clerk-afforded vs.
general) is a plan detail; the requirement is that a traveller obtains a
free `TravelCard` from the staffed office, and the clerk is a live employee
of the city budget.

### D7 — Directory: area ⊃ zones ⊃ rooms; adjacency via a cross-branch exit

Three layers, each a distinct unit:

- **Area** = `/domain/terminus/` — a top-level branch, the **ownership**
  unit (`Zone.ownerGroup` / `accessGroups`, resolved by the `AccessApi`
  slice-walk — see [access.md](../subsystems/access.md)). The branch
  boundary follows the *team* boundary; Terminus and the EU campus are
  different spheres, so Terminus is its own branch, **not** nested under
  `/domain/eternal/`, even though it sits on University Avenue. Owned by the
  **Terminus municipality** group (see D9 — *not* the global TPA).
- **Zone** = a coordinate **grid** inside the area, the **geometry** unit —
  and the subdivision axis. A street and the buildings on it can't share one
  grid, so each is its own `CartesianZone`. Terminus's first (today only)
  zone is the **terminal building**, `/domain/terminus/terminal`. As the
  area grows (a forecourt on the road grid, a service level), each new grid
  is a new sibling zone.
- **Rooms / fixtures** live under their zone: `/domain/terminus/terminal/hall`,
  `/domain/terminus/terminal/office`, etc. The four `TpaTerminal` seeds and
  the clerk NPC live with the gate rooms they seat into (locality).

**General rule:** an *area* is bucketed by **zone**; a zone dir holds its
own contents. (Multi-zone area → subdivide by zone; a single-zone area is
just the degenerate case.) Layout:

```
seeds/domain/terminus/
  terminal.yaml            # /domain/terminus/terminal — the building ZONE (ownerGroup: Terminus municipality)
  terminal/                # that zone's grid
    hall.yaml
    arrival-gate.yaml      + arrival-terminal.yaml
    departure-gate-a.yaml  + departure-terminal-a.yaml   (Gate A, operational)
    departure-gate-b.yaml  + departure-terminal-b.yaml   (Gate B, out of service)
    departure-gate-c.yaml  + departure-terminal-c.yaml   (Gate C, out of service)
    office.yaml            + clerk NPC
```

The geographic siting (on University Avenue, across from the university
gate) is a **cross-branch exit** between the `terminal` zone's arrival gate
and the EU `university-avenue/plaza` — two independently-owned zones that
touch in the world, no shared zone. `SeederManager` recursively
auto-discovers the subtree (template paths mirror the file layout). Generic
`CartesianZone` / `CartesianLocation` and the generic `TpaTerminal` are
reused; bespoke classes only where genuinely necessary (the city-budget
Business, the clerk NPC, any card-procurement controller). The plan
reconciles the existing `seeds/domain/eternal/university-avenue/` content
(plaza + retired terminal seed) with the cross-branch exit.

The campus branch stays `/domain/eternal/` (the slate's "'Eternal' belongs
to the University"); renaming it to `/domain/university/` is a separate
migration, **out of scope**. Code mirrors thinly under `domain/terminus/`
(the city-budget Business + the clerk NPC classes + a `paths.ts`); no
`terminal/` code subdir until there's bespoke code for it.

### D8 — Two departure gates out of service (authored-static status)

Two of the three departure gates ship `status` non-operational; the third is
operational. Out-of-service is **authored-static** content (a seed field),
not a dynamic breakdown. The terminal already renders a grey status light
for a non-operational node; this build additionally makes the **TPA ride
fork honor the status** — a ride from a non-operational departure gate is
**refused** with an out-of-service message. That is the full extent of
lighting the seam: no maintenance / repair / disruption *loop* (still
deferred to the fast-travel tail, Wave 3), no dynamic state transitions —
the status is *read* where the ride is authorized; the value is *set* by
content.

### D9 — Fares: split into two operating budgets, over a conserved economy

The governing constraint is **conservation**: **only the CB changes total
supply** (mint/drain). A fare never destroys or creates money — it *moves* it
between real accounts. A fare **splits into two operating budgets**:

- **A route carries an author-set `fee`** (minor units; **0 = free**, the
  lounge↔terminus hops). The fee is a property of the *route* (an outbound
  edge on the departure terminal), set by the terminal's author.
- **The city's operating budget takes the bulk** (D10) — the municipal
  operating budget of the place operating the terminal, resolved un-spoofably
  from the terminal's location (**not** caller-supplied). This is the
  recirculating share (funds the clerk's wages).
- **The TPA's operating budget takes a network fee.** The **global TPA** owns
  network "standard + health" and levies a **network fee** into **its own
  operating budget** (a well-known account named by an `AppSetting`). The fee
  is a **flat base + a percentage** — `min(fee, base + floor(fee × rate))`,
  both tunable `AppSetting`s — the payment-processor shape, so the TPA
  **collects a non-zero fee on every paid ride** (a pure percentage would
  floor to zero on micro-fares). `min(fee, …)` keeps the city share ≥ 0. It is
  a legitimate operating budget (funding network maintenance/standards —
  *deferred*), **not a skim and not a sink**. The network fee is the **first
  wired consumer of `settle`'s remittance-split seam**.
- **Both budgets recirculate; the sink is a CB drain.** Neither budget is a
  passive sink — the city budget pays wages now, the TPA budget funds
  maintenance later. When the economy needs tightening, the **CB drains**
  money from a budget back to itself (a monetary-policy decision — the
  existing central-bank drain; see [banking.md](../subsystems/banking.md)).
  That drain — not accumulation — is the sink lever, and it is **deferred** (a
  CB governance feature).
- **Settlement rides banking.** A paid ride builds a `Charge` and
  `BankingApi.settle`s it (split: traveller → city budget + TPA budget)
  *before* travelling; **insufficient funds refuses the ride** (like a failed
  settle), no partial charge. Free routes skip settlement entirely (onboarding
  untouched).

### D10 — The city operating budget is a municipal `Business`; the wage loop ships

The recirculating collector that makes D9 conserved-correct is a **`Business`**
(the employment substrate — its own account *and* built-in wage expenses),
representing **Terminus the municipality's operating budget**:

- **The city operating budget is a municipal/public `Business`**
  (proprietor-absent — the substrate's designed municipal case; no `corpoKey`).
  It is the **general** municipal budget, not a single-purpose "terminal
  operator": the terminal is one **operating location** it runs and draws fare
  revenue from, and the clerk is one **city employee**; the same budget
  generalizes to more positions/locations as the city grows.
- **The full loop ships this cycle:** the city budget has a **terminal-clerk
  `Position`**, the clerk NPC (D6) holds the `Employment`, and **wages** are
  paid from the city-budget account on the employment substrate's shift/wage
  mechanism (the Dave's Bar precedent). Fare in → city budget → wage out to
  the clerk. Money recirculates; nothing is minted or sunk.
- **Fare attribution is by operating location.** The city budget lists the
  operational departure-gate room in its `operatingLocations`; the fare's city
  share attributes to whoever operates the room the departure terminal stands
  in (resolved un-spoofably, not caller-supplied). The model is general (a
  `Business`, affiliation-tagged); realizing only Terminus's municipal budget
  this cycle is a scope choice. Corpo/independent operators and per-gate
  competition are deferred (non-goals).
- **Stand-up:** the city-budget Business stands up with Terminus content (the
  `Bar.postRegister` / guarded `singletonOrClone` precedent — a Business is not
  a manifest entry). It must be live and enumerable before any fare settles.

### D11 — Char-gen onboarding coin (hard cash, non-guest, anti-farm)

A fresh **committed** player receives a small **hard-coin** grant — physical
`Coin` minted into inventory via `BankingApi.issueCash` (the CB cash faucet, a
logged mint; the only conserved way money enters). **Not** an account balance:
opening a bank account is a deliberate **onboarding beat** (a convenience —
cards, tabs, credential payments — at the existing University Avenue
bank/teller), never pre-provisioned.

- **Guests get nothing.** Only a real char-gen commit grants coin; the
  ephemeral guest avatar (`isGuest` / `mintRandomGuestAvatar`, never enrolled)
  receives zero — gated explicitly on `!isGuest`. Closes the trivial farm
  vector.
- **Anti-farm amount.** The grant is **small** (~20 minor units, a tunable
  `AppSetting` `banking.onboardingStipend`) — deliberately too small to be
  worth farming across alt characters, but enough for a real first choice: buy
  a drink (~12) *or* pay the frontier fare to the newbie wilds (~15), with a
  little change either way. (Real Sybil-resistance is account/char-creation
  gating — the one-human anchor — a **deferred** platform control, not this
  build.)

**Starting values (all demo, all tunable):**

| thing | minor units | note |
|---|---|---|
| drink (martini / daiquiri) | 12 / 10 | existing (`bar-menu.yaml`) |
| **onboarding coin** | **~20** | ≈ a drink + change; anti-farm; committed non-guests only |
| newbie-wilds fare (Gate A) | ~15 | affordable from starting coin — the frontier is newbie-reachable |
| clerk wage | ~4 / game-hour | existing plan demo |

### D12 — Cash accepted at the bar and the fare (tender-agnostic)

The starting coin is only useful if directly spendable, so both consumer
payments accept **cash** (the `settle` cash method), not just credential —
opening an account becomes a convenience, never a spending gate:

- **Bar** (`OrderController`) settles credential-only today and *floats* the
  drink when there's no credential; add a **cash** path so a coin-holder pays
  with coin.
- **TPA fare** (`settleFare`) accepts cash as well as credential.
- **The city+TPA split holds for cash.** D9's split (and the "TPA always
  collects" guarantee) is tender-agnostic: a cash fare **crosses the cash
  bridge** — the physical `Coin` is **consumed** (removed from circulation, the
  exact fare split off a divisible stack), and the **equal value is credited
  on-ledger** to the city-budget account, then split to the TPA network fee.
  **Supply-neutral:** the money is *preserved as a balance*, not destroyed —
  coin-form → ledger-form, total supply unchanged (only the CB changes supply).
  The venue banks cash instantly (no physical till this cycle — a deferred
  refinement, and unavoidable here since a *global* TPA account has no local
  till to receive a coin). The exact settle/cash-bridge wiring is a plan
  detail; the requirement is that cash fares split like credential fares.

### D13 — TPA destinations named by their covering Locality

The departures board today names each destination by the *terminal's* own
presentation ("a Teleport Authority terminal") — generic, and wrong for a
multi-destination hub. Destinations are named by the **general Locality** they
represent, not the specific terminal/room:

- **Resolve via the address path.** The board resolves a destination's
  **covering Locality** (`AddressApi.resolveLocalityFor` / `coveringLocalityOf`
  — the existing longest-prefix address walk) and shows its `getName()`. The
  `Locality` model already *expresses its name* — **no new interface/mixin.**
- **A thin label seam with fallback.** `FastTravel.getDestinationLabel()`
  (consumed by `renderDepartures` and keyword targeting): default = the
  covering Locality's name; **fall back** to the terminal's own presentation
  when no Locality covers it (the single-room / unlocalized case; the entire
  locality *being* one room is just this case); per-node override for a bespoke
  board label.
- **Keyword targeting matches the locality** too (`teleport terminus` matches
  the Terminus locality, not the generic terminal).
- **Content — a Locality per board destination.** This build authors a
  `Locality` (name + claimed address prefix) for the **three** destinations
  that appear on boards — **The Lounge**, **Terminus**, **The Last Counted
  Mile** — and gives the relevant arrival rooms addresses (`AddressableMixin`)
  so the resolve lands. (Campus is walk-only now — not a board destination — so
  it needs none.) This lights up the built address/Locality layer for these
  areas; the exact address prefixes + room-address assignment are a plan detail
  (fall back to terminal presentation wherever a Locality/address isn't wired).

## Constraints

- **Security must be structural, not scan-order.** Per D1, clearance
  resolution targets the actor's hosted wallet directly. A regression test
  must prove a loaded card handed to a second actor grants that actor
  nothing. Do not "fix" this by re-ordering `findReachable` legs — the
  vulnerability is that clearance can live on a transferable object at all.
- **Gated-API / actor-from-context discipline.** Any new resolution helper
  derives the acting traveller from execution context / the command giver,
  never from a spoofable parameter (see project memory:
  *gated-api-actor-from-context*). Prefer folding new logic into the
  existing controllers / an existing Api over a free-floating helper
  (Module Categories rule).
- **Module taxonomy.** No new module category. Room content is seed YAML +
  reused generic classes. New Stuff classes are homed under
  `domain/terminus/` per placement convention (project memory:
  *obj-vs-lib-stuff-placement*): the city-budget `Business` (the
  `BusinessEntity` precedent), the clerk NPC (the `NPC` =
  `BehavedMixin(...)` precedent), and any card-procurement controller. The
  security change lives in the existing `TravelCredential` /
  `CredentialWallet` / `RegisterController` / `TeleportController` /
  `FastTravel.renderDepartures` surfaces; the fare change lives in the TPA
  ride fork + the route data shape + `BankingApi.settle` (no new banking
  module).
- **Directionality guards already exist** — reuse them: `register`
  arrival-only, the TPA ride departure-only. Terminus is the first content
  to make both guards observable to a player.
- **Separate ownership spheres, adjacent in the world (D7).** Terminus and
  the EU campus are distinct `/domain/` branches with distinct
  `Zone.ownerGroup`s (Terminus = the **Terminus municipality** group, *not*
  the TPA); the University-Avenue adjacency is a **cross-branch exit**, not a
  shared zone. The plan wires the exit both ways without merging the branches
  or their access scopes.
- **Conservation is the hard rule (D9).** No fare mints money; the fare
  *moves* traveller → city budget + TPA budget via `BankingApi.settle`. No
  collector is a passive sink — the city budget recirculates via wages (D10),
  the TPA budget funds maintenance (deferred); the sink lever is a CB drain.
  Insufficient funds
  refuses the ride; the fare is never partially charged. Free routes (fee=0)
  perform no settlement.
- **Reuse banking + employment; add no new economic module.** Fares ride
  `Charge` / `settle`; the city budget is a `Business` with a `Position` and the
  existing wage mechanism. The fare recipient is derived from the terminal's
  ownership (not a parameter) — *gated-api-actor-from-context* discipline
  extends to "who gets paid," un-spoofable.
- **Born-with floor repoint.** The floor node moves from the University
  Avenue terminal to the Terminus arrival node: repoint (and rename)
  `UNIVERSITY_AVENUE_NODE` in `Credential.ts` and preserve the
  hydration-union behavior (saved entries union on top of the floor, never
  clearing it — see `TravelCredential.fromData`).
- **Retiring the University Avenue terminal is a coordinated change.**
  Removing the standalone node touches the floor constant, the fast-travel
  cascade integration test (`lib/fasttravel/__tests__/cascade.integration.test.ts`),
  and the `seeds/domain/eternal/university-avenue-terminal.yaml` +
  plaza seeds. On an existing world, `SeederManager` is insert-only, so the
  retired terminal must be removed by the documented delete-and-reseed, not
  assumed to vanish.
- **Out-of-service is read at authorization, set by content (D8).** The ride
  fork gains a `status === "operational"` check; it must not alter the
  status seam's storage shape or introduce any dynamic transition. The two
  dead gates are the only non-operational content shipped.
- **Naming discipline.** Terminal/gate rooms are generic places, not proper
  names — use `Visible.shortDescription`, not `NamedMixin` (project memory:
  *named-mixin-proper-names-only*). "Terminus Terminal" as a hub label is a
  short-description/room-name choice, resolved in content.
- **`SeederManager` is insert-only.** New seeds install on a fresh DB;
  existing worlds need the documented reseed (delete-and-restart) — call
  this out in the subsystem doc, don't assume live migration.
- **Prose is the bulk, objects are few.** Room descriptions (hall, gates,
  office) carry the atmosphere via `longDescription` + `Detailed` features;
  the only *realized* objects are the four terminals, the city-budget Business
  (non-spatial), and the clerk NPC (project memory:
  *room-spec-three-tiers*). Loudspeaker, benches, ad-covered walls, engraving
  → described details, not Stuff. The clerk NPC is the one full carve
  (*npcs-are-expensive-carves*) — a design pass, not a rattled-off
  functionary.

## Acceptance criteria

- **Content stands up.** At boot, the `terminal` zone's hall, three
  departure-gate rooms, arrival-gate room, and office are live under
  `/domain/terminus/terminal/…` and connected by exits; the four terminals
  are seated with correct directionality; the city-budget Business is live and
  enumerable; the terminal-clerk NPC is present and employed.
- **Directory + ownership.** Content is laid out area ⊃ zone ⊃ rooms
  (`/domain/terminus/terminal/…`); the `terminal` zone's `ownerGroup` is the
  Terminus municipality group (resolvable via `AccessApi`), distinct from the
  EU campus group.
- **Reachable + returnable.** From the lounge a traveller can `teleport
  terminus` and land in the Terminus arrival gate (on University Avenue);
  from the **operational** Terminus departure gate they can `teleport` back
  to the lounge; walking the hall between the arrival gate and a departure
  gate — and across the street through the university gate onto campus —
  uses ordinary locomotion (last mile on foot).
- **Directionality observable.** `register` at a Terminus departure gate is
  refused ("departures-only"); the TPA ride from the arrival gate is refused
  ("arrivals only"); the status-light colour differs across the hub
  (operational departure red / out-of-service grey / arrival blue).
- **Out-of-service gates refuse travel.** A TPA ride from either of the two
  out-of-service departure gates is refused with an out-of-service message;
  the one operational departure gate rides normally.
- **Destinations named by Locality.** The departures board lists each
  destination by its covering Locality's name (**The Lounge** / **Terminus** /
  **The Last Counted Mile**), not "a Teleport Authority terminal"; `teleport
  <locality>` targets by that name; an unlocalized destination falls back to
  the terminal's presentation without error.
- **Card procurement.** A traveller can procure a `TravelCard` from the
  terminal clerk (cloned to them), **free** — the card carries no fee.
- **Paid ride splits city budget + TPA network fee.** The paid route to the
  demo destination (`fee > 0`): a traveller with sufficient funds has the fare
  `settle`d and **split** — the **city-budget** balance rises by
  `fee − networkFee`, the **TPA operating-budget** account rises by
  `networkFee`, the traveller's falls by the full `fee` — then travels. Total
  money is conserved across all three accounts (no mint). The network fee is
  `min(fee, base + floor(fee × rate))` for the configured base/rate
  `AppSetting`s.
- **The TPA collects on every paid ride.** For the demo fare (and any
  `fee ≥ 1`) the TPA network fee is **≥ 1 minor unit** — the flat base
  guarantees non-zero TPA income even on micro-fares where a pure percentage
  would floor to zero.
- **The network-fee base/rate are live levers.** Changing the base or rate
  `AppSetting` changes the split on the next paid ride (tunable dials), with
  the city-budget share the complement.
- **Paid destination reachable + returnable.** The paid destination is
  floor-registered; from the operational departure gate a funded traveller
  pays the fare and arrives there; the **free return** leg brings them back
  to Terminus at no charge.
- **Insufficient funds refuses.** A traveller without the fare is refused the
  ride (clear message) and is not moved; no partial charge, no network fee
  taken.
- **Free routes charge nothing.** The lounge↔terminus hops (fee=0) perform no
  settlement and are unaffected by the traveller's balance (onboarding
  intact).
- **The wage loop closes.** The city-budget Business pays the terminal clerk's
  wage from its account (the employment shift/wage mechanism); a run of paid
  rides funding a wage payout is observable end-to-end (fare in → wage out),
  with total money conserved across the loop.
- **New players start with spendable coin; guests don't.** After a committed
  char-gen commit the new avatar carries the onboarding coin (physical `Coin`,
  one logged CB `issueCash` mint) and can pay for a drink with it (cash); a
  **guest** avatar receives none. Money supply rises by exactly the grant (the
  one mint), conserved thereafter.
- **Cash pays the fare and still splits.** A cash-paying traveller can settle a
  paid fare, and the city + TPA split still applies (the TPA collects its
  network fee on cash fares too, via the cash bridge) — conserved, no mint.
- **Identity binding — the headline test.** Actor A `register`s a
  restricted destination; the destination is recorded on A's *identity*
  holder (not on any card A carries). Actor A hands a `TravelCard` to actor
  B; B's `teleport` to that destination is **refused** ("not registered") —
  B gained nothing from the card. A's own `teleport` to it succeeds.
- **Card-or-implant instrument.** An actor carrying only a `TravelCard`
  (no implant) and an actor with only the born-with implant (no card) both
  pass the instrument gate and can ride to their own registered
  destinations.
- **No scan-order dependence.** A test demonstrates the binding holds
  regardless of `findReachable` leg order (e.g. clearance is read from the
  hosted wallet even when a card is also reachable, and vice-versa the card
  never supplies clearance).
- **Floor repointed + intact.** Every fresh credential is registered for **all
  three** floor nodes — the Terminus arrival node, **the lounge**, and the
  crossroads (University Avenue is retired); the hydration-union floor behavior
  is preserved (a saved set unions on top, never clears). The onboarding
  lounge→campus hop lands at Terminus, and **Gate A → lounge succeeds for a
  fresh player** (the lounge is floor-registered — the return to Dave's Bar
  works without an explicit `register`).
- **Docs graduated.** [fasttravel.md](../subsystems/fasttravel.md) and
  [credential.md](../subsystems/credential.md) are updated: the fasttravel
  doc's "transferable half: lend the card, lend its routes" framing is
  corrected to the identity-binding model; the Terminus hub is documented as
  network content; the repointed floor nodes are recorded; and the **fare
  model** is documented — route `fee`, the city-budget `Business` collects the
  bulk, the TPA network fee into the TPA operating-budget account via the
  (now-wired) remittance-split seam, the tunable network-fee-rate `AppSetting`,
  the CB-drain sink lever, `settle`-at-travel,
  the wage loop, and the paid destination. The credential-wallet tail notes the narrow
  presentation-vs-clearance down-payment; [banking.md](../subsystems/banking.md)
  / [employment.md](../subsystems/employment.md) note the transit-fare
  consumer if the sweep judges it load-bearing.

## Cross-references

- **Seeding slates:**
  [fast-travel-slate.md](../slates/tails/fast-travel-slate.md) (the network
  + credential + directionality),
  [credential-wallet-slate.md](../slates/tails/credential-wallet-slate.md)
  (credential-as-presentation, the deferred issuer ledger).
- **Subsystem docs:** [fasttravel.md](../subsystems/fasttravel.md),
  [credential.md](../subsystems/credential.md),
  [augmentation.md](../subsystems/augmentation.md),
  [location.md](../subsystems/location.md),
  [boundary.md](../subsystems/boundary.md) (the cross-branch exit),
  [access.md](../subsystems/access.md) (branch = `ownerGroup` management
  sphere), [zone.md](../subsystems/zone.md),
  [banking.md](../subsystems/banking.md) (`settle` / `Charge` / accounts /
  remittance-split seam), [employment.md](../subsystems/employment.md)
  (`Business` / `Position` / wages — the city-budget loop),
  [behavior.md](../subsystems/behavior.md) +
  [npc-dialogue.md](../subsystems/npc-dialogue.md) (the clerk NPC).
- **Content reference:** `docs/eternal/tpa/` (the original EC TPA — station
  hall, three departure gates, arrival alcove, Tootie's office).
- **Project memory:** *gated-api-actor-from-context*,
  *obj-vs-lib-stuff-placement*, *named-mixin-proper-names-only*,
  *room-spec-three-tiers*, *npcs-are-expensive-carves*,
  *daves-bar-integrating-vertical* (the Business+wages precedent),
  *rpg-labor-market-economy* (conservation, no faucet), *banking-model*.
