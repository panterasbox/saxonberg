# Terminus Terminal + travel-credential identity binding + transit-fare economy — implementation plan

**Artifact:** `docs/plans/terminus-terminal-plan.md` (Phase 2 / plan). Retired at the finalize sweep.
**Source of truth:** `docs/requirements/terminus-terminal-requirements.md` (deliverables 1–3, decisions D1–D13, closed scope). Read it plus `docs/subsystems/{fasttravel,credential,augmentation,location,boundary,access,zone,banking,employment,behavior,npc-dialogue}.md` before building.

This is a **single phased build in one MR** (not staged MRs). It supersedes the earlier plan (which predates the multi-zone restructure, the ownership correction, and the entire fare/operator/networkFee/clerk/paid-destination economy). Phases are ordered for build sanity; intra-branch, code can land in any order that keeps the suite green. Genuine open implementation decisions are called out inline as **[DECIDE]** and collected at the end.

---

## 0. Design resolutions the whole plan leans on

These were pinned down against the live code; the phases assume them.

- **Clearance resolver = leg-2 isolation.** `findReachable` legs (ContainmentLogic.ts:169–213) are: (1) self, (2) self's hosted updates, (3) slot occupants + their hosted, (4) carried inventory + carried hosts' hosted, (5) location. A carried `TravelCard` matches at leg 4. Identity-binding therefore needs a **leg-2-only** resolver — `findHostedUpdate(actor, predicate)` scanning exactly `actor.getHostedUpdates()` (confirmed the aether host descent at `Aether.ts:145`). This is D1's "structural, not scan-order."

- **Un-spoofable fare-recipient resolution = `EmploymentApi.businessAt(departureGateRoomPath)`.** This is the exact `OrderController.charge` precedent (OrderController.ts:97–108): the venue's Business is found from `context.location.getTemplatePath()` against each Business's authored `operatingLocations`, never a caller parameter. The Terminus city-budget Business lists the **operational departure-gate room** in `operatingLocations`; the fare attributes to whoever operates the room the departure terminal stands in. The traveller cannot influence it. The city-budget **account id** is then `BankingApi.ensureVenueAccount(businessPath, businessPath, '')` (the same call OrderController/`settleShiftWage` use; account keyed on the Business's own durable path).

- **The TPA operating-budget account** is a stable account-id string named by a new AppSetting `fasttravel.tpaAccount` (default `"tpa"`), exactly like `banking.treasuryAccount: treasury`. `postTransaction`'s `applyDelta` (BankingLogic.ts:563) find-or-creates the `AccountBalance` row for any account id named on a leg, so no pre-seed is required, and `reconcile()` counts its balance (conserved). It is a real operating budget (its maintenance spend deferred), **not** a passive sink — the sink lever is a deferred CB drain from a budget back to the CB. The **network fee** is a **flat base + a percentage** — two more new AppSettings, `fasttravel.networkFeeRate` (demo `"0.15"`) and `fasttravel.networkFeeBase` (demo `"1"`) — read the way `demoTaxConfig()` reads `banking.salesTaxRate` (try/catch → 0 fallback); the base guarantees a non-zero fee on every paid ride.

- **Fare rides `BankingApi.settle` with a remittance split.** The payer is derived inside `settle` from execution context (`actingPrincipal()`, BankingLogic.ts:253) — the command giver, un-spoofable. A `Charge` with `payeeAccountId = city-budget account`, `splits = [{ accountId: tpaAccount, amount: networkFee }]`. `settle` already debits payer the full amount, credits the city budget `fee − networkFee`, credits the TPA account `networkFee` — 3-way conserved, no mint (settleImpl.ts:302–327). Insufficient balance / no credential **throws** (BankingLogic.ts:298), which the ride fork catches and turns into a refusal *before moving the traveller*.

- **Wage loop closes via the existing roster tick.** `EmploymentApi.boot()` runs the roster tick; `settleShiftWageImpl` (EmploymentLogic.ts:148) pays `wageRate × shift-hours` from the Business account to the clerk **at the on→off shift boundary**. Two consequences the content must honor: (a) the clerk's roster shift must have an **off-boundary** (not `[0,24]` all day) or the wage never settles; (b) `payWage` throws if the worker has no account (BankingLogic.ts:344) — the clerk needs a primary account. See **[DECIDE-W]**.

- **NPC affords `procure card` to co-located players.** Confirmed at CommandLogic.ts:2250–2257: on self-move into a container, **every neighbor's** `environment` command contributions are pushed onto the arriving actor's stack — a `Character`/`NPC` neighbor included, not just Thing fixtures. So a bespoke clerk NPC carrying `static commandContributions = { environment: ['tpa/procure-card.yaml'] }` surfaces the verb, resolved as `context.commandSource` in the controller (the `RegisterController` precedent). The retired dispenser fixture is not needed.

---

## Canonical paths (pin these first — everything references them)

Fix these in Phase 1 so the floor constant, routes, seeds, and tests all agree.

| Concept | Template path |
|---|---|
| Terminus **area** (branch) | `/domain/terminus` |
| Terminus **zone** (terminal building) | `/domain/terminus/terminal` |
| Rooms | `/domain/terminus/terminal/{hall,arrival-gate,departure-gate-a,departure-gate-b,departure-gate-c,office}` |
| **Arrival terminal** (a floor node; lounge routes here) | `/domain/terminus/terminal/arrival-terminal` |
| Departure terminals (Gate A operational, B & C out of service) | `/domain/terminus/terminal/departure-terminal-{a,b,c}` |
| Clerk NPC | `/domain/terminus/terminal/clerk` |
| City operating budget (Business) | `/domain/terminus/budget` |
| Paid dest — newbie-wilds **area** (branch) | `/domain/newbie-wilds` |
| Newbie-wilds crossroads **zone** ("The Last Counted Mile") | `/domain/newbie-wilds/crossroads` |
| Crossroads landing room | `/domain/newbie-wilds/crossroads/hub` |
| Crossroads **both**-terminal (a floor node, "the Line") | `/domain/newbie-wilds/crossroads/terminal` |
| Lounge terminal (a floor node — existing; now floor-registered) | `/domain/lounge/terminal` |

---

## Phase 1 — Identity-binding security fix (D1–D3) + out-of-service (D8)

Engine-only; independent of all content. Lands first so the security regression suite sits on a stable surface.

### 1.1 `ContainmentApi.findHostedUpdate` — the leg-2 resolver (D1)

- **`obj/api/ContainmentLogic.ts`** — extract the `scanHost` closure inside `findReachable` (lines 169–177) into a private module-level helper `hostedMatch(host, actor, predicate)`. Have `findReachable`'s leg 2 call it (behavior provably unchanged). Add a new gated public method:
  ```ts
  @CallSecurity(ContainmentApiCallers)
  public findHostedUpdate<T>(actor: Stuff, predicate: (s: Stuff)=>s is Stuff&T): (Stuff&T)|null {
    return hostedMatch(actor, actor, predicate); // actor's own getHostedUpdates(), one level
  }
  ```
  Returns `null` when the actor hosts no match (un-attuned edge, D2).
- **`api/containment.ts`** — add the forwarding face static `findHostedUpdate` with the same guardrail doc language as `findReachable` ("identity-only, single-level, predicate-agnostic, **not** a query engine; exists for leg-2 isolation / structural identity binding").
- **Actor-from-context discipline:** takes `actor` as a param exactly like `findReachable`; every call site passes `context.commandGiver` / the viewer.

### 1.2 `RegisterController` — write to identity (D3)

- **`obj/command/movement/RegisterController.ts`** (lines 39–52): replace the `findReachable(giver, context.location, isCredentialWallet+travel)` holder lookup with `findHostedUpdate(giver, isCredentialWallet+travel)`. Arrival-only guard (lines 32–38) and the `register` write (lines 52–67) unchanged — the write now always lands on identity. When `findHostedUpdate` returns `null`, keep the `no-credential` refusal but reword to reflect "nowhere to record" (D2 graceful fail).

### 1.3 `TeleportController.tpaTeleport` — split instrument gate from clearance (D1/D2)

- **`obj/command/author/TeleportController.ts`** (lines 141–200):
  1. **Instrument gate (unchanged):** keep `findReachable(giver, context.location, isCredentialWallet+travel)` (lines 141–153) as "do you have the means at all?" — card **or** implant satisfies it.
  2. **Clearance (new):** resolve the identity holder separately via `findHostedUpdate(giver, isCredentialWallet+travel)`; the `cred.isRegistered(ref)` check (line 194) reads **that** record. `null` identity holder → empty clearance → existing `not-registered` refusal.
- Do **not** delete the instrument lookup — both are required. Self-powered fork untouched.

### 1.4 `FastTravel.renderDepartures` — viewer's identity for the annotation (D1)

- **`lib/fasttravel/FastTravel.ts`** (lines 260–293): change the `holder` resolution (264–269) from `findReachable(viewer, here, …)` to `findHostedUpdate(viewer, …)` so "— not yet registered" reflects identity clearance, not a carried card. `here` no longer needed for this lookup.

### 1.5 `TravelCard` keeps its record; correct its comment (D2)

- **`domain/common/tpa/TravelCard.ts`** — no behavior change (`defaultCredentialKinds = ['travel']` stays, so it satisfies the instrument gate). Its class comment ("handing it to another player hands over its registered routes — the transferable half") is now **false**; correct to "a bearer *instrument*, never a clearance store." Leave `requiresTravelCredential` validator unchanged (instrument gate, correct).

### 1.6 Out-of-service ride refusal (D8)

- **`TeleportController.tpaTeleport`**, immediately after the `isDeparture()` guard (lines 156–162):
  ```ts
  if (node.getStatus() !== "operational")
    return this.fail(context, "<out-of-service message>", "out-of-service");
  ```
  Reads via the existing `getStatus()` seam; sets nothing; no new field, no dynamic transition. The grey status-light render already exists (`TpaTerminal.statusColor/statusLine`). Status value is authored on the seed (Phase 3).

### 1.7 Tests (Phase 1)

- **`findHostedUpdate` unit** (extend `api/__tests__/containment.findReachable.test.ts` or sibling): returns the actor's own hosted wallet; returns `null` when the matching holder is only in carried inventory or on a slot occupant's host (leg-2 isolation); a `findReachable` parity assertion (unchanged after the `scanHost` extraction).
- **Headline hand-off (integration)** under `obj/command/author/__tests__/`: A `register`s a restricted node → assert it's on A's **hosted wallet** and **not** on any card A carries; A hands a `TravelCard` to B; B's `teleport` there is **refused** (`not-registered`); A's succeeds.
- **No-scan-order-dependence:** clearance read from the hosted wallet even when a loaded card is also reachable, and the card's own set is never consulted — assert independent of leg order (construct both orderings).
- **Card-or-implant instrument:** (a) attuned actor carrying only a card + identity-registered node R → rides to R; (b) actor with only the hosted wallet → rides to R. Both pass the instrument gate. (The card-only actor is **attuned** — hosted wallet = identity/clearance, card = reachable instrument.)
- **`register` writes to identity:** after `register`, a carried card's `getCredential('travel').getRegistered()` is unchanged; the hosted wallet's set contains the node.
- **`renderDepartures`:** "not yet registered" reflects the hosted wallet, not a carried card that holds the node.
- **Out-of-service:** a ride from a `status: out-of-service` departure node is refused; from the operational node it succeeds; `getStatus`/`setStatus` storage shape untouched.
- **Keep green:** `lib/credential/__tests__/{Credential,CredentialWallet}.test.ts` (floor assertions change in Phase 6), `obj/__tests__/Avatar.loadout.test.ts`, `lib/banking/__tests__/credential.ladder.test.ts`.

---

## Phase 2 — The fare model plumbing + destination naming (D9, D13)

Engine + config. Testable with fixtures before Terminus content exists.

### 2.1 Route `fee` field

- **`lib/fasttravel/FastTravel.ts`:**
  - `TravelRoute` (lines 42–45): add `fee: number` (minor units; 0 = free).
  - `RawRoute` (48–52): add `fee?: number`.
  - `applyRoutes` (184–192): set `fee: r.fee ?? 0` on each built route.
  - Optionally annotate the fare in `renderDepartures` (a `⊙N` tag next to routes with `fee > 0`).

### 2.2 Network-fee AppSettings (the macro lever)

- **`lib/config/AppSettings.ts`** — add to `AppSettingKeys`:
  - `fasttravelNetworkFeeRate: "fasttravel.networkFeeRate"` — the tunable TPA network-fee percentage.
  - `fasttravelNetworkFeeBase: "fasttravel.networkFeeBase"` — the flat base component (minor units) guaranteeing non-zero TPA income on any paid ride.
  - `fasttravelTpaAccount: "fasttravel.tpaAccount"` — the TPA operating-budget account id.
- **`config/app-settings.yaml`** — seed `fasttravel.networkFeeRate: "0.15"`, `fasttravel.networkFeeBase: "1"`, `fasttravel.tpaAccount: "tpa"`, with the banking-tax-rate comment style (authored demo values; both budgets recirculate — the sink lever is a deferred CB drain, not accumulation).
- No `AppSettingsSeeder.ts` change (it reads the YAML generically); the seeder is insert/merge-missing so a live world picks the new keys up on next boot without clobbering.

### 2.3 Fare settlement at travel (the TPA ride fork)

- **`TeleportController.tpaTeleport`**, between the clearance check (line 194–200) and `giver.teleport(arrivalRoom)` (line 208):
  ```ts
  const route = node.getRoutes().get(ref);
  const fee = route?.fee ?? 0;
  if (fee > 0) {
    const ok = await this.settleFare(context, fee, ref);   // false ⇒ refuse, do not move
    if (!ok) return;
  }
  giver.teleport(arrivalRoom);
  ```
- New private `settleFare(context, fee, destRef)`:
  1. Resolve operator: `const biz = EmploymentApi.businessAt(context.location.getTemplatePath())` → `const bizPath = biz?.getAccountPath()`. If no operator here, **[DECIDE-A]** (default: no operator ⇒ no split target ⇒ treat the whole fee as networkFee/refuse; recommended: require an operator for any `fee > 0` route — a paid route with no operator is an authoring error → refuse with a clear reason). For Terminus the operational gate always has an operator.
  2. `const cityBudgetAccount = await BankingApi.ensureVenueAccount(bizPath, bizPath, '')`.
  3. `const rate = Number(AppApi.setting(AppSettingKeys.fasttravelNetworkFeeRate)) || 0; const base = Number(AppApi.setting(AppSettingKeys.fasttravelNetworkFeeBase)) || 0; const networkFee = Math.min(fee, base + Math.floor(fee * rate));` — the flat-base + percentage (payment-processor shape), `min(fee, …)` so it never exceeds the fare; guarantees `networkFee ≥ 1` on any paid ride (`fee ≥ 1`).
  4. `const tpaAccount = AppApi.setting(AppSettingKeys.fasttravelTpaAccount) || "tpa";`
  5. Build the `Charge`: `{ amount: Money.of(fee), reason: "TPA fare", presented: true, payeeAccountId: cityBudgetAccount, splits: networkFee>0 ? [{ accountId: tpaAccount, amount: Money.of(networkFee), category: <networkFee category> }] : [], category: <fare category> }`.
  6. `try { await BankingApi.settle(charge, { kind: "credential" }); return true; } catch { this.fail(context, "you can't cover the fare", "fare-declined"); return false; }`
- Free routes (`fee === 0`) skip `settleFare` entirely — onboarding/lounge↔terminus untouched.
- **[DECIDE-C] P&L categories:** the networkFee split needs a `PnlCategory`. Cleanest is to add `"fare"` (city-budget leg) and `"networkFee"` (TPA leg) members to the `PnlCategory` union in `lib/banking/LedgerEntry.ts` (additive, one line) so the P&L reads truthfully; the low-touch alternative is to reuse `category: "sales"` (city budget) + `category: "tax"` (networkFee). Recommend adding `fare`/`networkFee`.

### 2.4 Tests (Phase 2)

- **`applyRoutes`/`TravelRoute`:** a seed with `fee` normalizes to a number; absent → 0.
- **Fare split (integration, fixture terminals + a fixture city-budget Business):** a funded traveller rides a `fee>0` route → city-budget balance +`(fee−networkFee)`, TPA account +`networkFee`, traveller −`fee`; `reconcile().balanced === true` (no mint); `networkFee === min(fee, base + floor(fee × rate))`.
- **TPA collects on every paid ride:** for the demo fare (and any small `fee ≥ 1`) the TPA network fee is **≥ 1** — assert the flat base makes it non-zero where a pure percentage would floor to 0 (e.g. `fee=3, rate=0.15` → `1`, not `0`).
- **Network-fee rate is live:** changing `fasttravel.networkFeeRate` changes the split on the next ride; the city-budget share is the complement.
- **Insufficient funds refuses:** an underfunded traveller is not moved; no partial charge, no network fee taken (assert city-budget + TPA balances unchanged).
- **Free routes charge nothing:** a `fee=0` route performs no settlement, unaffected by balance.
- **Operator un-spoofable:** the recipient is `businessAt(gate room)`, not a token the caller supplies (assert a crafted destination/keyword can't redirect the payee).

### 2.5 Destination naming by covering Locality (D13)

The board names each destination by its **covering Locality**, not the generic terminal presentation. Engine seam + three Locality seeds.

- **Seam:** add `getDestinationLabel(): string` to `FastTravelMixin` (`lib/fasttravel/FastTravel.ts`): resolve the node's covering Locality via `AddressApi` (`coveringLocalityOf` sync, or `resolveLocalityFor` — resolves outward from the node/its room) → `locality.getName()`; **fall back** to `(this as Stuff).getPresentation()` when null. Overridable per node.
- **`renderDepartures`** (lines 280–289): replace `const name = node.getPresentation()` with `const name = node.getDestinationLabel()` (display only).
- **Keyword targeting stays on the terminal's authored keywords.** `resolveRouteByKeyword` (lines 231–243) is **unchanged** — it matches the terminal's authored `keywords` (typeable: `terminus`, `crossroads`, `lounge`). The Locality supplies the **display name only**; do **not** try to match multi-word Locality names (`the last counted mile`) as keywords. Authors set each terminal's keywords to a typeable handle for its place.
- **Locality boot-warming — placement is load-bearing.** `AddressRegistry.postRegister` eagerly clones **only the Locality roster under `/lib/address/`** (bootstrap.ts:126–129), so the three seeds **must live under `seeds/lib/address/`** (the `narnia.yaml` precedent), NOT in the domain-area dirs — else they never register their prefix and every board silently falls back to "a Teleport Authority terminal". Their `_address` claims the *area's* address prefix (the namespace is independent of templatePath, so a `/lib/address/`-homed seed can claim a `/terminus`-ish address).
- **Three Locality seeds** (`class: /lib/address/Locality`, `PersistentHydrator`, `data: { name, _address: <prefix> }`):
  - `seeds/lib/address/terminus.yaml` — `name: Terminus`, `_address:` the Terminus prefix.
  - `seeds/lib/address/the-lounge.yaml` — `name: The Lounge`, `_address:` the lounge prefix (**[DECIDE-ADDR]** below).
  - `seeds/lib/address/last-counted-mile.yaml` — `name: The Last Counted Mile`, `_address:` the crossroads prefix.
- **Room addresses (actioned in the content phases, not here):** the arrival rooms get an `address:` field (via `AddressableMixin` on `Location`) under their locality's prefix so `coveringLocalityOf` lands — the **Terminus arrival-gate** address is set in Phase 3.2, the **crossroads hub** address in Phase 5. Exact prefixes are a content choice in the address namespace.
- **Lounge fallback (D13/[DECIDE-ADDR]).** The lounge arrival room is a **Warren host** (a runtime role) that may not carry a stable address. If it can't, the lounge Locality won't resolve — so **author the lounge terminal's `shortDescription` to "The Lounge"** (Phase 6.2, where the lounge seed is already touched) as the guaranteed fallback label. Either way the board reads "The Lounge".
- Campus needs **no** Locality (walk-only, not a board destination).

**Tests (integration — runs after Phase 3 + 5 content, not fixture-only):** the live board lists "The Lounge" / "Terminus" / "The Last Counted Mile" (not "a Teleport Authority terminal"); `teleport terminus` resolves by the terminal's `terminus` keyword; a destination with no covering Locality falls back to the terminal presentation without error (assert both paths, incl. the lounge fallback).

---

## Phase 3 — Terminus content, directory & boot standup (D4, D5, D7)

### 3.1 Branch, zone, ownership

- **Zone seed:** `seeds/domain/terminus/terminal.yaml` → path `/domain/terminus/terminal`. `class: /lib/location/CartesianZone`, `hydratorClass: /lib/persistence/PersistentHydrator`, `data: { name: Terminus Terminal, cellSize: 3.0 }`. **Do not** hardcode `ownerGroup` (the managed group's `_id` is runtime-minted).
- **Ownership (mirror the lounge slice):** add `seedTerminusSlice()` to **`obj/AccessRegistry.ts`** (alongside `seedLoungeSlice`, lines 431–463): mint a managed group named `terminus` (owner `system`) if absent, cache its `managed:<id>` ref, and stamp it as the `ownerGroup` on `/domain/terminus/terminal` **only when missing** (idempotent). Call it from the registry's `postRegister` seeding block. This gives the Terminus zone a real `ownerGroup` distinct from the EU campus group, resolvable via `AccessApi`, without a literal in the seed. (The EU zone keeps no `ownerGroup` — out of scope; branch separation is satisfied by the distinct zone regardless.)
- **`SeederManager`** auto-discovers the `seeds/domain/terminus/` subtree recursively (insert-only) — no seeder change; template paths mirror the file layout.

### 3.2 The six rooms (generic `CartesianLocation`, prose-first)

Under `seeds/domain/terminus/terminal/`: `hall.yaml`, `arrival-gate.yaml`, `departure-gate-a.yaml`, `departure-gate-b.yaml`, `departure-gate-c.yaml`, `office.yaml`. All `class: /lib/location/CartesianLocation` + `PersistentHydrator`. **Prose is the bulk** (`longDescription` + `details:` for the loudspeaker, benches, ad-covered walls, the departures-board mention, the engraved Authority seal — described details, not Stuff). **`shortDescription` only, no `NamedMixin`** (generic places). "Terminus Terminal" as the hub label rides `shortDescription`/room prose and the zone `name`.

- **Intra-zone exits** (explicit `exits` with `coords`, cardinals auto-reciprocate, mirroring `duncan-hall/lobby`): `arrival-gate ↔ hall`; `hall ↔ {departure-gate-a, departure-gate-b, departure-gate-c, office}`.
- **Cross-branch exit (D7 University-Avenue adjacency):** `arrival-gate ↔ /domain/eternal/university-avenue/plaza` via a **semantic (non-cardinal) exit** (e.g. `across`/`gate`) — `CartesianLocation.addExit` requires non-cardinal exits to be cross-zone, which this is. Reciprocal added on the plaza in Phase 6. `applyExits` resolves lazily and idempotently short-circuits the reciprocal cascade.
- **`office.yaml`** carries `populates: [/domain/terminus/terminal/clerk]` (the clerk NPC stands up here — Phase 4).
- **Address for the Terminus Locality (D13/§2.5):** `arrival-gate.yaml` carries an `address:` (via `AddressableMixin`) under the Terminus locality's prefix, so `coveringLocalityOf(the arrival terminal)` resolves to the "Terminus" Locality and the board names it "Terminus". (This is the room-address step §2.5 defers to here.)

### 3.3 The four terminals (generic `TpaTerminal`)

Under `seeds/domain/terminus/terminal/`, each `class: /domain/common/tpa/TpaTerminal` + `PersistentHydrator`, `shortDescription: a Teleport Authority terminal`. **No `advanceMode` set** → the `FastTravelMixin` default `manual` (on-demand) applies (D-non-goal: no scheduled mode). Each terminal carries a **typeable `keywords`** handle for `teleport <x>` targeting (§2.5): the **arrival** terminal gets `[terminus]`, the crossroads terminal (Phase 5) `[crossroads, frontier]`, the lounge terminal (existing) `[lounge]` — the board *displays* the Locality name, but targeting matches these keywords.

| Seed | Path | seatIn | directionality | status | routes |
|---|---|---|---|---|---|
| `arrival-terminal.yaml` | `…/arrival-terminal` | `…/arrival-gate` | `arrival` | operational | none |
| `departure-terminal-a.yaml` (**Gate A**) | `…/departure-terminal-a` | `…/departure-gate-a` | `departure` | operational | `[{to: /domain/lounge/terminal, fee: 0}, {to: /domain/newbie-wilds/crossroads/terminal, fee: 15}]` (demo: TPA 3 / city 12) |
| `departure-terminal-b.yaml` | `…/departure-terminal-b` | `…/departure-gate-b` | `departure` | `out-of-service` | none |
| `departure-terminal-c.yaml` | `…/departure-terminal-c` | `…/departure-gate-c` | `departure` | `out-of-service` | none |

- The operational gate's two routes satisfy D4's constraint (lounge free return + paid destination). `status: out-of-service` is any non-`operational` literal (statusColor/Phase 1.6 both compare `!== "operational"`).
- No bespoke `TpaTerminal` subclass — the generic class suffices (`LoungeTerminal` only subclassed for the Warren arrival room, which Terminus doesn't use).

### 3.4 Boot standup (D5) — per-terminal manifest entries

- **`bootstrap.ts`** (after the `/domain/lounge/terminal` entry, ~line 203): add four bare entries — `{ templatePath: '/domain/terminus/terminal/arrival-terminal' }` and the three departure terminals — with a comment mirroring the lounge note.
- **Why manifest entries, not a hub root:** the `/domain/lounge/terminal` precedent (D5 cites it) establishes network-resident terminal singletons as manifest entries. The **three departure terminals are never route targets**, so nothing cascade-loads them — these are the load-bearing entries; without them `findReachable` never sees a departure terminal for a player standing in the gate room. The **rooms need no entries**: each terminal's `postRegister → seatSelf` stands up its gate room; the arrival-gate's `applyExits` cascade (eager singletons at hydrate) pulls the hall → the other gate rooms + office. The **arrival terminal** entry is strictly redundant (it cascade-loads as the lounge route target after Phase 6) but listing it keeps the four-terminal set uniform and standup independent of lounge routing. A bespoke `TerminusHub` class was rejected: three idempotent singleton entries already do the job.

### 3.5 Tests (Phase 3)

- **Content standup (integration)** under a new `domain/terminus/__tests__/` (fixture store like `cascade.integration.test.ts`): resolving the four terminal singletons → all six rooms live (`StuffApi.findByTemplatePath`), each terminal seated with correct `directionality`, the two dead gates `status !== operational`, cross-branch exit present both ways.
- **Reachable + returnable:** from the lounge, `teleport terminus` lands in the arrival gate; from `departure-gate-a`, `teleport lounge` rides back; the two dead gates refuse (out-of-service).
- **Directionality observable:** `register` at a departure gate refused (departures-only); ride from the arrival gate refused (arrivals only); status-light colours differ (assert via `statusLine`/`getPresentationMml`).

---

## Phase 4 — City operating budget (Business), terminal clerk, wage loop + onboarding (D6, D10, D11, D12)

### 4.1 The municipal city-budget Business (seed, no bespoke class)

- **`seeds/domain/terminus/budget.yaml`** → `/domain/terminus/budget`, `class: /lib/employment/Business` (the default-export `BusinessEntity` resolves it), `PersistentHydrator`. `data`:
  - `proprietorPath: ''` — municipal, no proprietor (affiliation municipal; no `corpoKey`).
  - `positions: [{ key: clerk, label: "staffing the ticket office", wageRate: <demo, e.g. 4>, confers: [] }]` — the clerk confers no `MakerMixin` (it doesn't craft).
  - `rosterSlots: [{ positionKey: clerk, assignee: /domain/terminus/terminal/clerk, schedule: [{ days: [0,1,2,3,4,5,6], hours: [6, 22] }] }]` — a **bounded** daily shift so the roster tick hits an on→off boundary and `settleShiftWage` fires (an all-day `[0,24]` shift would never settle).
  - `operatingLocations: [/domain/terminus/terminal/departure-gate-a]` — the operational departure gate, so `businessAt(that room)` resolves this operator for fare attribution.

### 4.2 The terminal clerk NPC (bespoke `TicketClerk`, a proper carve)

- **`domain/terminus/TicketClerk.ts`** — `class TicketClerk extends NPC`. Adds two things over `NPC`:
  1. `static commandContributions = { environment: ['tpa/procure-card.yaml'] }` — affords `procure card` to co-located players (confirmed surfaces from a Character neighbor, §0).
  2. Override `postRegister`: call `super.postRegister()` (wires `behaviors:`), then stand up the city-budget Business — `if (await Template.findByPath('/domain/terminus/budget')) await StuffApi.singletonOrClone('/domain/terminus/budget')` (the exact `Bar.postRegister` guarded-`singletonOrClone` precedent; idempotent on HMR; live before `EmploymentApi.boot`'s first tick since the cascade completes before engine boot). **[DECIDE-S]** — alternative home is a bespoke office `Location`; folding standup into the already-bespoke clerk avoids a second class.
- **`seeds/domain/terminus/terminal/clerk.yaml`** → `/domain/terminus/terminal/clerk`, `class: /domain/terminus/TicketClerk`, `PersistentHydrator`. A **proper NPC carve** (per *npcs-are-expensive-carves*): name, `pronouns`, `_speciesPath`, `lifecycleState: alive`, `primaryKeyword: clerk`, `shortDescription`, a real `longDescription`, and `behaviors:` (`greets` on arrival, `idles` cadence, a small `tree-dialogue` on `engage`) — the Tootie-reborn personality pass. The plan specifies the mechanical shape; **the build writes the prose/personality** (this is the one full character carve of the build).
- **`domain/terminus/paths.ts`** — a per-domain paths file (operator, clerk, arrival-terminal, gate rooms) so seeds/tests reference from one place (the `TpaPaths`/`LoungePaths` convention).

### 4.3 Card procurement (D6)

- **`obj/command/tpa/ProcureCardController.ts`** (new `tpa/` command category — propose it per command-spec.md, or reuse `movement/` **[DECIDE-V]**): actor = `context.commandGiver`; resolve the affording clerk as `context.commandSource` (the `RegisterController` precedent). Clone a fresh `TravelCard` — `StuffApi.clone(TpaPaths.travelCard)` — and `ContainmentApi.move` it into the giver's inventory. **Free** — no `Money`, no fee gate, no banking interaction. Narrate on `world.narration.action`.
- **`cmd/tpa/procure-card.yaml`** — verb view. Pick a diegetic verb (`procure card` / `request card`); the old EC `buy card` is dropped (comped). `verbs`, `controller: tpa/ProcureCardController`, `validators: [requiresAnimate]` (no credential precondition — procuring a card is how the cardless get an instrument).
- **`seeds/obj/command/tpa/ProcureCardController.yaml`** — the controller template doc (`class: /obj/command/tpa/ProcureCardController`, `data: {}`).
- Check `docs/subsystems/command-spec.md` (five-artifact checklist) before authoring.

### 4.4 The clerk's worker account — closing the loop  **[DECIDE-W]**

`payWage` throws if the worker has no primary account (BankingLogic.ts:344), so the clerk needs one. **Recommended:** add a two-line guard at the top of `settleShiftWageImpl` (EmploymentLogic.ts, before `payWage`): if `primaryAccountIdOf(employeeKey)` is null, `ensureVenueAccount(employeeKey, employeeKey, '')` (a resource-identity primary account keyed on the worker's own path). This is general, additive, within employment/banking (no new module), and also robustifies the existing bar wage loop (whose NPCs have the same gap). **Alternative:** ensure the clerk account in `TicketClerk.postRegister`. Risk: the recommended path touches the shared wage path — re-run `lib/banking/__tests__/employment-wages.test.ts`.

### 4.5 Tests (Phase 4)

- **Operator standup:** the city-budget Business is live + enumerable after the clerk stands up (`EmploymentApi.businessAt(departure-gate-a)` resolves it).
- **Card procurement:** `procure card` at the office clones a `TravelCard` to the requester (inventory) carrying a floored `travel` record; **no banking interaction** (assert balances/ledger untouched); the verb surfaces only in the office (afforded by the clerk).
- **Wage loop (integration, mirror `employment-wages.test.ts`):** fund the city-budget account via a run of paid rides, then drive an on→off transition (`tickRoster` across the shift boundary, or `settleShiftWage` directly) → clerk primary balance rises by `wageRate × shift-hours`, city-budget balance falls by the same; `reconcile().balanced` holds across fare-in → wage-out (no mint).

### 4.6 Char-gen onboarding coin + cash acceptance (D11, D12)

Hard **coin** for fresh players (not an account — opening one is a later onboarding beat), guests excluded, and cash made spendable at the bar + fare.

**Onboarding coin (D11):**
- **AppSetting:** add `bankingOnboardingStipend: "banking.onboardingStipend"` to `AppSettingKeys`; seed `banking.onboardingStipend: "20"` in `config/app-settings.yaml` (demo; ≈ a drink + change, or the newbie-wilds fare; deliberately anti-farm).
- **Hook:** at the commit path in `obj/command/charactergen/EnrollController.ts` (the same commit/spawn point that mints char-gen claims — see `EnrollController.commit.test.ts`), **only for a real committed non-guest avatar** — guard on `!<avatar>.isGuest` (guests are minted via `Login.mintRandomGuestAvatar` and never reach char-gen commit, but assert it explicitly). Then `await BankingApi.issueCash(<avatar>, Money.of(amount))` — mint physical `Coin` into inventory (the CB cash faucet). `amount = Number(AppApi.setting(AppSettingKeys.bankingOnboardingStipend)) || 0`; skip if 0. **No account is opened.**
- **Conservation:** `issueCash` is a **mint** (supply rises by the coin — the CB faucet), logged; the one place this build increases supply, through the sealed path (no bypass).
  - **[DECIDE-CAT]** the mint's reporting tag — a `"onboarding"` category (recommended) vs an existing float category.
- **Sybil note (deferred):** a per-commit mint is a faucet scaling with char creation; the drink-sized amount + guest exclusion bound the abuse, and real Sybil-resistance is account/char-creation gating (the one-human anchor) — **out of scope**, flagged not built.

**Cash acceptance (D12):**
- **Bar** (`obj/command/crafting/OrderController.ts`, ~line 118): today `settle(charge, { kind: 'credential' })` and on failure the bar *floats* the drink. Change to **try credential, then fall back to cash** (`{ kind: 'cash' }`) from the patron's coins before floating — a coin-holder pays with coin; the float stays the last resort (no funds at all).
- **TPA fare** (`settleFare`, Phase 2.3): same — accept cash as well as credential.
- **The split must hold for cash [DECIDE-CASHSPLIT].** D9's city+TPA remittance-split is on-ledger; a cash fare must still yield the TPA network fee. Recommended: a cash fare **crosses the cash bridge** — the coin is banked into the city-budget account (supply-neutral) and the standard on-ledger split runs (city keeps `fee−networkFee`, TPA gets `networkFee`). Confirm the `settle` cash-method + cash-bridge interaction against the live `BankingLogic` at build; if the cash method can't carry a split directly, do deposit-then-split explicitly in `settleFare`. The requirement (D12): cash fares split identically to credential fares.

**Tests:**
- **Onboarding coin:** after a simulated committed commit, the new avatar carries `Coin` worth the configured amount; `moneySupply()` rose by exactly that (one `issueCash` mint); a **guest** avatar (isGuest, guest-mint path) carries **no** coin. Amount `0` → no mint, no supply change.
- **Cash at the bar:** a coin-only patron (no credential/account) orders a priced drink and **pays with coin** (the bar's till/account reflects it; the drink is not floated free); `reconcile().balanced` holds.
- **Cash fare splits:** a coin-only traveller pays a `fee>0` fare in cash → arrives; city-budget +`(fee−networkFee)`, TPA +`networkFee` (split held via the cash bridge); supply unchanged (supply-neutral bridge); `reconcile().balanced` holds.

---

## Phase 5 — The paid destination: the newbie-wilds crossroads (D4, D9)

The paid destination is the **newbie-wilds crossroads** ("The Last Counted Mile"), the frontier hub — **[DECIDE-N] resolved**. This build authors a **minimal v0** (one designed landing room + one `both` terminal) in the newbie-wilds branch; it is the **integration anchor the deferred newbie-wilds build extends** (`docs/staging/newbie-wilds/README.md` — the TPA is diegetically "the Line", the terminal the sci-fi bounty came through). Not a throwaway stub; a real, if minimal, place. No operator (collects nothing).

- **Zone:** `seeds/domain/newbie-wilds/crossroads.yaml` → `/domain/newbie-wilds/crossroads`, `CartesianZone`, `PersistentHydrator`, `data: { name: The Last Counted Mile, cellSize: 3.0 }`. (Ownership: no `ownerGroup` this cycle — it collects nothing; unowned is acceptable, and the newbie-wilds build will stamp its own owner group. Distinct branch from `/domain/eternal`.)
- **Room:** `seeds/domain/newbie-wilds/crossroads/hub.yaml` → `/domain/newbie-wilds/crossroads/hub`, `CartesianLocation`, a **designed** frontier-crossroads landing (real `longDescription` + `details:`, not a stub — a foretaste of the wilds per the staging doc), `shortDescription`, no `NamedMixin`. The full room-by-room hub is the newbie-wilds build's job; this is the arrival beat only. **Carries an `address:`** (via `AddressableMixin`) under the "The Last Counted Mile" locality's prefix so the board names the destination by locality (D13/§2.5 — the room-address step deferred to here).
- **Both-terminal:** `seeds/domain/newbie-wilds/crossroads/terminal.yaml` → `/domain/newbie-wilds/crossroads/terminal`, `class: /domain/common/tpa/TpaTerminal`, `seatIn: /domain/newbie-wilds/crossroads/hub`, `directionality: both`, `status: operational`, `routes: [{ to: /domain/terminus/terminal/arrival-terminal, fee: 0 }]` (the **free return** leg). Its `getArrivalRoom()` is the hub (the paid route's landing).
- **Standup:** none needed — the terminal **cascade-loads as the target** of Gate A's paid route edge (D4/D5); resolving that route via `armNetwork`/`StuffApi.singleton` stands it up, which self-seats and stands up the hub.
- **Floor-registered:** it is **one of the three floor nodes** (Phase 6) — travellers are *authorized* to travel there; the **fare** (~15, affordable from starting coin), not registration, gates it. No operating business of its own (the Gate A fare is Terminus's city budget's, by departure attribution).

### Tests (Phase 5)

- **Reachable + returnable:** from Gate A (`departure-gate-a`), a funded traveller pays the fare and arrives at the crossroads hub; the free return leg brings them back to the Terminus arrival gate at no charge (balance unchanged on return).
- **Floor authorization:** a fresh credential is registered for the paid-destination node (asserted in Phase 6's floor test); the ride is gated by funds, not registration.

---

## Phase 6 — Floor repoint & University Avenue retirement (D4)

Ordering: the arrival-terminal + paid-destination paths (pinned in Phase 1's path table) are referenced here.

### 6.1 Repoint + rename the floor constant to a **set**

- **`lib/credential/Credential.ts`** (lines 36–39, 206, 210–213): replace the single `UNIVERSITY_AVENUE_NODE` with a set constant, e.g.
  ```ts
  export const BORN_WITH_TRAVEL_NODES = [
    "/domain/terminus/terminal/arrival-terminal",
    "/domain/lounge/terminal",                       // the lounge is a floor node → TPA back to Dave's Bar always works
    "/domain/newbie-wilds/crossroads/terminal",
  ] as const;
  ```
  - `TravelCredential._registered = new Set(BORN_WITH_TRAVEL_NODES)`.
  - `fromData`: `new Set([...BORN_WITH_TRAVEL_NODES, ...(row.registered ?? [])])` — **preserve the hydration-union** (saved entries union on top of the floor, never clearing it).
  - Update the class/field doc comments (the born-with floor is now a **three-node set** — the Terminus arrival node, the lounge, and the paid destination; onboarding's lounge→campus hop lands at Terminus, walk across to campus; the paid destination is reachable for a fare; the lounge is floor-registered so the Gate A → lounge return works for a fresh player who never explicitly registered it).
- **Ripple (rename + values):** `lib/credential/__tests__/{Credential,CredentialWallet}.test.ts` — update the import name and assert **all three** floor nodes are present in every fresh credential and that a saved set unions on top without clearing them.

### 6.2 Repoint the lounge route + author its board label

- **`seeds/domain/lounge/terminal.yaml`** (line 15): `to: /domain/eternal/university-avenue-terminal` → `to: /domain/terminus/terminal/arrival-terminal`. Update the header comment ("routes to the Terminus arrival gate on University Avenue").
- **Lounge board label (D13 fallback):** set/confirm the lounge terminal's `shortDescription` (or keyword) reads **"The Lounge"** so, if the Warren-host address can't be assigned ([DECIDE-ADDR]) and the lounge Locality doesn't resolve, `getDestinationLabel()` still falls back to a correct label. Also give it a typeable keyword (`lounge`) for `teleport lounge`.

### 6.3 Retire the UA terminal; reconcile the plaza

- **Delete** `seeds/domain/eternal/university-avenue-terminal.yaml`.
- **`seeds/domain/eternal/university-avenue/plaza.yaml`:** remove the "A Teleport Authority terminal stands at the kerb…" sentence; add the **reciprocal cross-branch exit** back to the Terminus arrival gate (semantic `across`/`gate` → `/domain/terminus/terminal/arrival-gate`), rewording to "across the avenue, the Terminus station hall." Plaza stays in `/domain/eternal/` (its EU owner sphere). Only the *terminal* is retired; the plaza remains a campus room reachable on foot from the bank etc.

### 6.4 Update the cascade integration test + grep gate

- **`lib/fasttravel/__tests__/cascade.integration.test.ts`** (lines 30–64, 116–117): repoint the in-memory `fastTravelDocs` from lounge→UA to lounge→Terminus-arrival: rename `UA_TERMINAL`→the arrival-terminal path, `UA_ROOM`→the arrival-gate room path; keep the fixture self-contained; update the two `findByTemplatePath` assertions.
- **Grep gate:** `grep -rn "university-avenue-terminal\|UNIVERSITY_AVENUE_NODE"` must return zero non-historical hits before finishing.

### 6.5 Insert-only reseed note (R1)

`SeederManager` is insert-only, so on an existing world the repointed lounge route, the deleted UA terminal, and the plaza edit do **not** apply live. The dev/deploy step is delete-and-restart for the three affected paths (`db.domain.deleteOne({path:'/domain/lounge/terminal'})`, `…university-avenue-terminal`, and re-seed). Fresh DBs are correct automatically. Documented in Phase 7, not assumed live.

### Tests (Phase 6)

- **Floor repointed + intact:** every fresh credential is registered for all three floor nodes (Terminus arrival, lounge, crossroads); the onboarding lounge→campus hop lands at Terminus; and **Gate A → lounge succeeds for a fresh player** (lounge floor-registered — the Dave's Bar return works without an explicit `register`).
- Cascade test boots cleanly with the reciprocal cross-branch exits present (the singleton short-circuit handles the Terminus↔eternal cycle — R2).

---

## Phase 7 — Docs to graduate (at finalize)

- **`docs/subsystems/fasttravel.md`:** correct the "transferable half: lend the card, lend its routes" framing (lines 42–44, 106–110) to the **identity-binding** model (`findHostedUpdate` for clearance vs `findReachable` for the instrument gate; card/implant = instrument only). Repoint the born-with floor (lines 129–134) to the three-node set (Terminus arrival + lounge + paid destination). Document the Terminus hub as network content, the first `directionality` content exercise, the D8 out-of-service ride refusal (status read at authorization). Add the **fare model**: route `fee`, the city-budget `Business` collects `fee−networkFee`, the TPA network fee into the TPA operating-budget account via the now-wired remittance-split seam, the tunable `fasttravel.networkFeeRate`/`tpaAccount` AppSettings, the CB-drain sink lever, `settle`-at-travel, insufficient-funds refusal + conservation, the wage loop, the paid destination. Note the SeederManager reseed (R1).
- **`docs/subsystems/credential.md`:** the narrow **presentation-vs-clearance down-payment** (card carries a record for the instrument gate but is never an authorization store); note partial absorption of the credential-wallet slate; correct any "transferable routes" language.
- **`docs/subsystems/banking.md` / `employment.md`:** add a transit-fare consumer note (the fare is the first wired consumer of `settle`'s remittance-split; the city-budget Business + clerk Position/wage is the second employment consumer after Dave's Bar; the `settleShiftWage` worker-account guard if [DECIDE-W] lands there) — if the sweep judges it load-bearing.
- **In-branch:** `TravelCard.ts` class comment + `Credential.ts` floor comment corrected (Phases 1.5, 6.1), re-verified at sweep.
- **Retire** `docs/requirements/terminus-terminal-requirements.md` and this plan per `docs/workflow.md`. No deferred-wave slate extraction expected (the deferred issuer-ledger stays in `credential-wallet-slate.md`; the TPA expense/CB-drain and living-infrastructure stay in `fast-travel-slate.md`).

---

## Risks, ordering & open decisions

**Ordering / dependencies.** Phase 1 pins the canonical paths (arrival terminal, paid destination) — the floor set (Phase 6), the lounge route (6.2), the operational-gate routes (3.3), and the cascade test (6.4) all reference them. Phases 1–2 (engine + config) land before 3–6 (content) so the security + fare suites sit on a stable surface and are fixture-testable before content exists. The operator-resolution seam (2.3) is coded in Phase 2 but only exercises live once the city-budget Business exists (Phase 4); write it against a fixture Business first.

- **R1 — Insert-only reseed** (§6.5). Repointed lounge route, deleted UA terminal, plaza edit, and the new AppSetting keys need delete-and-restart / a boot on an existing DB. Fresh DBs correct automatically. Document in fasttravel.md.
- **R2 — Cross-branch cascade cycle.** The arrival-gate↔plaza reciprocal exits create a Terminus↔eternal cascade cycle; `applyExits`' singleton short-circuit handles it (boundary.md). Verify the integration test boots cleanly with both reciprocals.
- **R3 — Refactor parity.** Extracting `scanHost`→`hostedMatch` must not change `findReachable` behavior; guard with `containment.findReachable.test.ts` + a parity assertion.
- **R4 — Shared wage path** ([DECIDE-W]). If the worker-account guard lands in `settleShiftWageImpl`, re-run the bar `employment-wages` suite.
- **R5 — Bounded clerk shift.** The clerk roster must have an off-boundary (`hours: [6,22]`), or the wage never settles (settles at on→off only).

**Open implementation decisions — ALL ACCEPTED WITH THEIR RECOMMENDED DEFAULTS** (user sign-off during the pre-build audit). The build proceeds with each recommended option below; resolve the "against live code" ones at build time. Do **not** re-litigate:

- **[DECIDE-A] No-operator paid route:** a `fee>0` route with no `businessAt` operator is an authoring error → refuse the ride with a clear reason (recommended), rather than routing the whole fee to networkFee. Terminus's operational gate always has an operator, so this is a guard.
- **[DECIDE-C] P&L categories:** add `"fare"`/`"networkFee"` to `PnlCategory` (recommended, one additive line) vs reuse `"sales"`/`"tax"`.
- **[DECIDE-N] Paid-destination identity — RESOLVED:** the **newbie-wilds crossroads** ("The Last Counted Mile") at `/domain/newbie-wilds/crossroads`, reached (paid) from **Gate A**. This build ships a minimal v0 (landing room + `both` terminal); the deferred newbie-wilds build extends it. The full crossroads content + owner group are that build's; here it's the arrival beat only.
- **[DECIDE-S] Operator standup home:** fold `singletonOrClone(operator)` into `TicketClerk.postRegister` (recommended — reuses the already-bespoke clerk, no extra class) vs a bespoke office `Location`.
- **[DECIDE-V] Procurement verb category:** propose a new `tpa/` command category (recommended, keeps TPA verbs together and per command-spec.md's "propose a category rather than drop at root") vs reuse `movement/`.
- **[DECIDE-W] Clerk worker account:** ensure it in `settleShiftWageImpl` (recommended — general, also fixes the bar loop) vs in `TicketClerk.postRegister`.
- **[DECIDE-CAT] Onboarding-mint category (§4.6):** tag the `issueCash` mint `"onboarding"` (recommended) vs an existing float category.
- **[DECIDE-ADDR] Lounge Locality address (§2.5):** whether the Warren host arrival room can carry a stable address for `coveringLocalityOf`; if not, the lounge destination falls back to the lounge terminal's presentation (authored "The Lounge"). Resolve against `AddressableMixin` on the Warren host at build time.
- **[DECIDE-CASHSPLIT] Cash-fare split (§4.6):** cross the cash bridge so a cash fare banks into the city-budget account and splits on-ledger (recommended — the TPA collects on cash fares too) vs a cash `settle` method that carries the remittance-split directly — resolve against the live `BankingLogic`.

**Contradiction/infeasibility check:** a full pre-build consistency audit was run over both docs; all editing-residue contradictions (stale gate numbers, coin value, floor-node count, network-topology framing) were fixed, and two real gaps closed — (1) the **lounge is now a 3rd floor node** so the Dave's-Bar return works, and (2) the **three Locality seeds live under `seeds/lib/address/`** (else `AddressRegistry` never warms them). No build-logic infeasibility remains. Two items the requirements left to the plan are resolved above (operator resolution = `businessAt`/`operatingLocations`; the TPA operating-budget account = `fasttravel.tpaAccount`). One requirements-implicit gap surfaced — NPC workers need a primary account for the wage loop to close live, which the existing Dave's-Bar mechanism does not auto-provision — resolved by [DECIDE-W].

**Unit/integration-testable vs verify-live-in-browser.** Logic is covered by unit/integration (security binding, fare split, conservation, wage loop, standup, floor repoint). Verify **in the running app** (chrome-devtools / `/run`): (1) status-light **colours** actually render red/grey/blue across the hub (client-side MML `<color>` theme resolution isn't unit-assertable); (2) the walk-the-hall + across-the-street-through-the-university-gate foot path reads correctly (exit prose, reciprocal directions); (3) the departures-board fare annotation + out-of-service refusal read well in-scene; (4) `procure card` narrates and the card appears in inventory; (5) end-to-end a funded player pays a fare, arrives at the newbie-wilds crossroads, returns free, and (with a shift boundary crossed) the clerk's balance rises.

---

## Phase-breakdown summary

1. **Security + out-of-service (D1–D3, D8):** `findHostedUpdate` leg-2 resolver; RegisterController/TeleportController/renderDepartures read identity for clearance, keep `findReachable` for the instrument gate; ride refuses non-operational status. Engine-only.
2. **Fare plumbing + destination naming (D9/D13):** route `fee` field; `fasttravel.networkFeeRate`/`tpaAccount` AppSettings; `settleFare` in the ride fork — operator via `businessAt` (un-spoofable), 3-way `settle` split, insufficient-funds refusal, conservation; plus `getDestinationLabel()` naming the board by covering Locality (three Locality seeds: The Lounge / Terminus / The Last Counted Mile).
3. **Terminus content (D4/D5/D7):** `/domain/terminus/terminal` zone (ownerGroup minted in AccessRegistry), 6 prose rooms, 4 generic terminals (1 operational w/ free+paid routes, 2 out-of-service, 1 arrival), cross-branch exit to the EU plaza, 4 manifest standup entries.
4. **City budget + clerk + wages + onboarding (D6/D10/D11/D12):** municipal city-budget `Business` seed (clerk Position, bounded roster), bespoke `TicketClerk` NPC (affords `procure card`, stands up the city-budget Business), free card procurement verb, worker-account guard so the wage loop closes; the char-gen **onboarding coin** (`issueCash` at commit, non-guest, anti-farm ~20 — hard coin, no account); and **cash acceptance** at the bar + fare (with the city+TPA split preserved for cash via the cash bridge).
5. **Paid destination (D4/D9):** the **newbie-wilds crossroads** ("The Last Counted Mile") v0 — `/domain/newbie-wilds/crossroads` branch/zone + one designed landing room + one `both` terminal (paid arrival from Gate A + free return), cascade-loaded, floor-registered, no operator; the integration anchor the deferred newbie-wilds build extends.
6. **Floor repoint + UA retirement (D4):** `UNIVERSITY_AVENUE_NODE` → `BORN_WITH_TRAVEL_NODES` **three-node** set (Terminus arrival + lounge + crossroads; union preserved), lounge route repointed + board label, UA terminal retired, plaza reconciled, cascade test updated, grep gate, reseed note.
7. **Docs (finalize):** fasttravel.md + credential.md (identity binding, Terminus hub, fare model, networkFee, floor set); banking.md/employment.md transit-fare consumer note; retire requirements + plan.
