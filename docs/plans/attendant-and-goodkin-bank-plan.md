# Attendant Substrate + Goodkin Bank — Implementation Plan

Phased plan for the cycle scoped in
[docs/requirements/attendant-and-goodkin-bank-requirements.md](../requirements/attendant-and-goodkin-bank-requirements.md),
distilled from the locked design in
[docs/staging/attendant-subsystem.md](../staging/attendant-subsystem.md) +
[docs/staging/terminus-banking.md](../staging/terminus-banking.md). Code-grounded
against the shipped substrates; divergences from the design's assumptions are
called out. Read CLAUDE.md's module taxonomy + gating rules first — they are
load-bearing.

## Grounding: what the shipped code affords (and where it diverges from the design)

1. **The engagement substrate is the right primitive for being-attended.**
   `EngagedMixin` (`lib/activity/Engaged.ts`) gives every `Character` four slots
   (`body`/`hands`/`attention`/`voice`); `SchedulerApi.start/cancel`
   (`api/scheduler.ts`) drives lifecycle; a `SustainedEngagement` is untimed.
   **`DialogueConversation` (`lib/npc/DialogueConversation.ts`) is the near-exact
   exemplar** — an untimed engagement occupying the NPC's `voice`+`attention`, a
   mirror `DialoguePartnerHold` on the player, mutual teardown, co-presence
   review, disconnect teardown. Single-server serialization "falls out of the
   slot" *only if* attendance occupies a slot on the server NPC. **Divergence:**
   the bar's zero-wait service must NOT lock the bartender's `attention` for a
   durative period — an instant service is a `completed-sync` result
   (`StartResult` in scheduler.ts), not a held slot.

2. **The lease does NOT literally reuse `ResidencyLogic`.** `ResidencyLogic`
   (`obj/api/ResidencyLogic.ts`) sweeps `StuffApi.getAllObjects()` for cold-tail
   *Stuff* and calls `StuffApi.destruct`. A lease is an *engagement to abort*, not
   a Stuff to cull; its recency is not a Stuff's `getLastTouched()`. "Reuse
   residency's idle-eviction" means **reuse the pattern** (recency stamp + lazy
   real-time `ScheduleApi.recurring` sweep + default-evict), implemented as
   Attendant's own sweep calling `SchedulerApi.cancel(engagement, 'service-idle')`.
   This is the biggest place the design over-claims code reuse. `ScheduleApi.recurring`
   is the shared machinery.

3. **`AbortReason` is an augmentable registry** — new reasons (`service-idle`,
   `service-complete`) declared via `declare module '@saxonberg/types' { interface
   AbortReasonRegistry { … } }` from the attendant module (the pattern atop
   `Engaged.ts`).

4. **Coinage is genuinely unbuilt in the money-movement paths.**
   `Money.COIN_FACE_VALUES` (`lib/banking/Money.ts`) is `{credit: 1}`. Two
   `BankingLogic.ts` functions hard-assume face value 1 and must be rewritten:
   `issueCash` (~L485, clones one `/obj/Coin` stack at `setQuantity(amount.minor)`,
   always `credit`, no largest-first) and `moveCoins` (~L195, treats
   `getQuantity()` as minor units — its comment says "v1 assumes face value 1 …
   change-making deferred"); `drainCoins`/`cashOnHand` likewise. **Already
   coinage-ready:** `getTillLiquidity()`/`reconcileImpl()` sum via `stackValue()`
   (`faceValueOf × quantity`), and `Coin.getMass()` scales per-coin mass ×
   quantity through the encumbrance gauge. `COIN_PATH` is hardcoded; the `/obj/Coin`
   seed mass `0.008` (8g) is wrong for a 1cr under the new scale (→ 2g).

5. **No Terms, no quota, no royalty exist yet.** `BankMixin` (`lib/banking/Bank.ts`)
   has only `corpoKey` + till gauge. `withdraw` has the till-liquidity bound
   (AC#13) but no per-account quota. `settle` already supports `splits:
   RemittanceSplit[]` (the royalty seam) and `ensureVenueAccount` exists (the
   `ensureCorpoTreasury` template); `remitDemoTax` is the single-split precedent.
   But fees are not yet `settle()` calls — they'd be new intra-bank transfer legs.

6. **Till security has a clean hook.** `BankCounter` is a `Vessel` (Container);
   vault coin is freely `get`-able today. `Container.canRemoveContainable?(thing):
   VetoResult` (`lib/spatial/Container.ts:83`) is the veto seam to gate vault coin
   to the banking verbs only. `Sealable` is the alternative.

7. **The enrollment tree cannot run banking verbs today.** `DialogueEffect`
   (`lib/npc/tree.ts:111`) is a closed union (`set-state|regard|say|emote|goto|end`);
   guard facts are `regard|trait:|time:|state:`. The design's "verb-driven,
   officer-wrapped" enrollment needs the tree to (a) *detect* the player
   opened/funded/activated to advance, and (b) optionally prompt. An open design
   choice (below).

8. **Business / employment / hours are real and reusable.** `Business` Idea
   (`lib/employment/Business.ts`), the game-time roster tick in `EmploymentLogic`,
   `EmployedMixin.isOnShift()`/`getConferredMixinNames()`,
   `EmploymentApi.businessAt`/`ensureOperatorAt`/`shiftStateOf`. **Hours = the
   roster** is free (the TPA `budget.yaml`+`clerk.yaml` are the worked precedent).

9. **The re-home targets are seed-shaped + precedented.** `seeds/lib/address/terminus.yaml`
   (a `Locality`, eager-clone on `postRegister`) + `seeds/domain/terminus/terminal.yaml`
   (`CartesianZone`, `cellSize: 3.0`) + a `config/parcels.yaml` row = the three-part
   pattern. Old bank: `seeds/domain/eternal/university-avenue/{bank,bank-counter,npc/teller}.yaml`,
   reached by the crossing's `west` exit.

10. **The tab removal is clean + self-contained.** `TabMixin` is composed *only*
    on `domain/lounge/Bar.ts`; `OrderController` charges pay-per-drink and never
    touches the tab. Touch points: `lib/banking/Tab.ts`, `lib/mixin.ts`
    (`Tab:'TabMixin'` + `isTab`), `Bar.ts`, `obj/command/banking/{TabController.ts,
    BankingControllerBase.ts}`, `cmd/banking/tab.yaml`, the seed, and tests
    `lib/banking/__tests__/{tab,bar-loop}.test.ts`.

## Phase sequencing

**tab-removal (independent) → Attendant foundation → the lease guard →
bar/ticket retrofit → coinage → banking additions → the re-home →
Goodkin-as-Business+enrollment → old-bank retirement + migration.**

### Phase 0 — Remove the Dave's Bar tab (independent cleanup)
Holds the "zero credit anywhere" non-goal; shrinks the surface before Phase 3
touches the same file.
- Delete `lib/banking/Tab.ts`, `obj/command/banking/TabController.ts`,
  `cmd/banking/tab.yaml`, its seed, `lib/banking/__tests__/tab.test.ts`.
- `lib/mixin.ts` — remove `Tab:'TabMixin'` + `isTab`.
- `domain/lounge/Bar.ts` — drop `TabMixin`.
- `BankingControllerBase.ts` — remove the tab helper (verify no other user).
- `bar-loop.test.ts` — rebuild the test venue without `TabMixin`; assert
  pay-per-drink still settles.
- **Verify:** banking suite green; live `order` still charges; `tab` verb gone.

### Phase 1 — Attendant substrate foundation (`lib/attendant/`)
The universal service-point *except* the lease (Phase 2). Add:
- `Attendant.ts` — **`AttendantMixin`** on a service-point `Thing` fixture (the
  `BankMixin`-on-a-fixture precedent). Holds queue state + config: `discipline`
  (`reception|line|take-a-number|scrum|appointment`), `serverPositionKeys`,
  `staffingPolicy` (`close|self-service`), `skin` strings, `attendDurationMs`.
  Contributes the "am I attended here?" payload gate.
- `AttendanceEngagement.ts` — the being-attended `SustainedEngagement` (server
  side, occupies `attention`) + customer-side hold (the `DialogueConversation`
  two-engagement pattern). Instant = `completed-sync`; durative = sustained.
  Declares the `service-idle`/`service-complete` `AbortReason`s.
- `Queue.ts` — the ordered waiting set + the **poke-on-your-turn-else-free**
  keystone (membership + notify, NOT an engagement). Take-a-number = a `Ticket`
  `Thing` + a "now serving" dynamic `Detail` (the `/obj/Crossing.getDetail`
  pattern); line = presence-holds-place (`lib/slot/` `Slotted`).
- `Ticket.ts` — the take-a-number claim `Thing`.
- **Gating:** an **`AttendantApi` (`api/attendant.ts`) + `AttendantLogic`
  (`obj/api/AttendantLogic.ts`)** pair — queue mutation + lease grant/abort +
  server-selection are privileged (`FromModule`-gated). Servers resolve from the
  on-shift roster (`EmploymentApi` + `isOnShift`); "closed" = empty window.
- Verbs: a generic wait/queue surface — **confirm which existing command category
  fits (`device` is closest); do NOT invent one.**
- **Verify:** unit tests per discipline + per staffing state. **Requirements flag:**
  take-a-number/appointment/scrum/self-service have no v1 content venue → **build
  test/demo vehicles** (complete, not stubbed).

### Phase 2 — The lease guard (exclusive-resource anti-grief)
Non-optional. In `lib/attendant/` + `AttendantLogic`:
- A **recency stamp on the lease** bumped by every service act (on the lease, not
  a Stuff — finding #2).
- A **lazy real-time sweep** (`ScheduleApi.recurring`, mirroring
  `ResidencyLogic.installEvictionSweep` structurally; observe-first;
  `attendant.lease.*` AppSettings) → `SchedulerApi.cancel(attendance,
  'service-idle')` → holder bumped, next poked. **Default-evict.**
- **Linkdead release** (subscribe `PlayerDisconnected`) → drop lease/queue slot.
- **Queue idle-drop** (idle/leave/linkdead in line forfeits; `Ticket` expires).
- **Re-queue-to-the-back** on served-or-evicted (fairness-cap deferred).
- **Diegetic escalation** skinned per venue.
- **Verify:** single server can't attend two; idle hold swept+aborted; recency
  resets on a service act (legit-slow ≠ griefer); linkdead releases immediately;
  idle line-spot/ticket forfeited.
- **Risk (highest):** engagement teardown on abort — a swept lease must release
  both slots and poke the next; real-time cadence must not fight game-time.

### Phase 3 — Retrofit the bar + TPA ticket office (parity)
Both run the substrate + gain the lease, **no observable behavioral change.**
- **Bar** (`domain/lounge/Bar.ts`): Attendant `discipline: scrum,
  attendDurationMs: 0` (zero-wait); `order`/`serve`/`mix` are the payload; the
  bartender is the server. Feel unchanged; lease earned.
- **TPA ticket office** (`domain/terminus/terminal/*`, `TicketClerk`): a formal
  counter; `buy`/`procure card` the payload; Tootie the server.
- **Verify:** existing bar + TPA tests stay green (the parity AC); add a
  lease-held test. **Risk:** zero-wait must be byte-identical player-visible
  output — the integration tests are the gate.

### Phase 4 — Coinage (1/5/25 credits, masses, largest-first make-change)
- `lib/banking/Money.ts` — extend `COIN_FACE_VALUES` to the 1/5/25 set (`credit`
  stays the 1-unit; names are light content). Add largest-first make-change (a
  `Money` method or a `Coinage` value-object in `lib/banking/` — **not** a free
  helper).
- `obj/Coin.ts` + seeds — per-denomination mass. **Open choice:** three Coin
  templates vs one template + denomination→mass map. Fix the `/obj/Coin` seed mass
  `0.008`→`0.002` (2g).
- `BankingLogic.ts` — rewrite `issueCash` + `moveCoins` for **largest-first**;
  make `drainCoins`/`cashOnHand` **face-value-aware** for cash `settle`.
  Cash-payment change = **exact-cash-or-card** (payee-makes-change deferred).
- **Verify:** `issueCash(37)` → 1×25 + 2×5 + 2×1; `withdraw` dispenses
  largest-first bounded by the till's denominations; `getTillLiquidity`/`reconcile`
  still balance; a large balance is measurably too heavy (encumbrance).
  **Invariant:** conservation + 1:1 custodial till across mixed denominations.

### Phase 5 — Banking additions (Terms, common-pool guards, royalty)
Built-but-permissive for Goodkin. In `lib/banking/` + `BankingLogic` + `BankMixin`:
- **Terms** — `lib/banking/Terms.ts` value-object authored on `BankMixin`
  (`minBalance`/`openingFee`/`transactionFee`/`wire+cross-corpo`/`cardReissueFee`);
  read at each verb; each fee = a conserved intra-bank **transfer** leg (customer →
  branch account) via `postTransaction`. Goodkin nearly fee-free (only a light
  cross-corpo wire fee live). **Rate board** = a dynamic `Detail` on `BankCounter`.
- **Withdrawal quota (common-pool guard)** — in `withdraw`, a **derive-on-read**
  sum of `withdraw` legs since the `WorldClockApi` game-day boundary (`entriesFor`)
  vs a cap; over-cap → refuse + push to card/transfer. **Per-account only**, never
  collective; **scales with standing** (Circle → higher cap); no stored counter/no
  scheduler (Law-2 clean); `banking.*` AppSetting.
- **Till security** — override `canRemoveContainable` to veto vault-coin removal
  except by `BankingApi` (finding #6).
- **Royalty** — a revenue-share split at fee collection (the `RemittanceSplit`/
  `remitDemoTax` precedent). Add **`ensureCorpoTreasury(corpoKey)`** (mirror of
  `ensureVenueAccountImpl`, owner keyed on `corpoKey`, at the corpo's own bank).
  Per-corpo dial = AppSetting; invisible to the player.
- **Opening vault float** — an `issueCash` to the Goodkin till at setup.
- **Verify:** quota (per-account, standing-scaled, derive-on-read, never
  collective); till security; a fee splits a royalty to the treasury (both derive
  lazily); conservation holds across fee+royalty.
- **Note:** the lease (Phase 2, exclusive) + quota/till-security (here,
  common-pool) are the two sibling guards; the plan places each where the code
  lives and documents the sibling relationship.

### Phase 6 — The Counting-Houses re-home (locality, zone, rooms)
- `seeds/lib/address/counting-houses.yaml` — a `Locality` (terminus.yaml
  precedent).
- A Counting-Houses `CartesianZone` (terminal.yaml precedent) + a `config/parcels.yaml`
  ownership row (never on the editable zone — the security invariant).
- Rooms: a downtown University Avenue block (public street), the banking hall
  (hosts `BankCounter` + Wenna), the Circle parlor (Halloran's desk), the vault as
  glimpsed-prose `Detail`. Exits: crossing `west` → avenue block → `west` → hall;
  hall ↔ parlor.
- **Repoint** `crossing.yaml` `west` from the old bank to the avenue block (+
  reciprocal `east`).
- **Verify:** live walk crossing → downtown → hall → parlor; address resolves
  under `counting-houses/…`.
- **Open choice:** the four rival atmosphere-frontage refusal beats — requirements
  put rivals+refusal **out** → recommend Goodkin-welcome-only; leave frontages as
  prose.

### Phase 7 — Goodkin as a Business running Attendant
- A Goodkin branch **`Business`** (budget.yaml precedent): manager, positions
  (teller + officer), roster (= hours), `operatingLocations` = hall/parlor,
  `corpoKey: goodkin`; operating account via `ensureVenueAccount`
  (bank-banks-with-itself). P&L falls out.
- `BankCounter` re-homed to the hall (`corpoKey: goodkin` + Terms + opening
  float); **Wenna** (teller, re-homed) + **Halloran** (officer/Circle host, new
  carve).
- **Attendant config:** `discipline: reception` (recognition-gated skip — the
  officer receives newcomers), `staffingPolicy: close` off-hours (no machine v1;
  the card still works → never a lockout).
- **Enrollment tree** on Halloran (`tree-dialogue`, the Tootie precedent):
  welcome+name → open → fund → card → Circle. Writes recognition
  (`RecognitionApi.learnIdentity`) + the **Circle marker** (on the account / a
  per-corpo standing record), which confers reception + a higher withdrawal quota.
- **Royalty wiring:** fee collection splits to `ensureCorpoTreasury('goodkin')`.
- **Wayfinding** (content): Gus points west; crossing prose; the onboarding-coin
  grant (`EnrollController.ts`/`bankingOnboardingStipend`) carries a one-line hint.
- **Verify:** live end-to-end (integration-harness where Atlas blocks a fresh DB):
  20 coin → officer receives → `bank open` → `deposit 20` → card activates → `pay`
  at bar/fare → `withdraw` bounded by hours/till/quota; P&L runs; royalty
  accumulates.
- **Risk (enrollment integration, finding #7) — DECIDED (A):** extend the dialogue
  substrate (`tree.ts` `DialogueEffect`/`GuardFact` + `DialogueConversation`) with
  banking-aware guards/effects so the tree advances as the player runs the real
  `bank open`/`deposit`/`pay` verbs — minimally scoped. Reception-attendance for
  Goodkin **reuses the `DialogueConversation` engagement** (extended); the general
  `AttendanceEngagement` serves the quick/instant venues. This is a real (small)
  substrate extension and the fragile seam of Phase 7 — verify the tree advances
  correctly off real verb completion.

### Phase 8 — Retire the old bank + reseed migration + finalize
- Delete `seeds/domain/eternal/university-avenue/{bank,bank-counter,npc/teller}.yaml`.
- Update the referencing tests: `lib/banking/__tests__/{employment-wages,branch-seed,
  bar-loop}.test.ts`, `obj/command/employment/__tests__/tips.test.ts`,
  `domain/eternal/__tests__/crossing.integration.test.ts` (each hardcodes the old
  path); `branch-seed.test.ts` seeds the old files directly → rewrite against the
  new seeds.
- **Reseed migration:** insert-only seeder → a live DB needs delete-and-restart of
  the affected rows (fresh DBs correct automatically); mind the Atlas
  500-collection cap; document the runbook.
- **Verify:** full suite green; typecheck + lint:gates clean; fresh-DB boot lands
  the new arc. **Finalize docs** (at sweep): new `docs/subsystems/attendant.md`;
  `banking.md` updated (Terms/quota/royalty/coinage/staffing); staging docs
  graduated/retired.

## Resolved decisions (scope closed)

1. **Coin templates** — **three per-denomination seeds** (matches
   `globIdentityFields=['denomination']`; the hardcoded `COIN_PATH` becomes a
   per-denomination lookup) (Phase 4).
2. **Enrollment integration — (A) CHOSEN:** extend the dialogue substrate
   (`tree.ts` `DialogueEffect`/`GuardFact` + `DialogueConversation`) with
   **banking-aware guards/effects** so the tree advances as the player runs the
   real `bank open`/`deposit`/`pay` verbs (the faithful "officer walks you in
   while you run the verbs" beat). Keep the extension **minimally scoped**. And:
   **reception-attendance for Goodkin reuses the `DialogueConversation`
   engagement** (extended) — i.e. relationship/dialogue service rides the dialogue
   engagement, while quick/instant service (the bar, a plain deposit) rides the
   general `AttendanceEngagement`. Both are "being attended" (Phase 7).
3. **Attendant command category** — **reuse `device`** (closest existing:
   "operating a built object/mechanism"); confirm at build, **do not invent one**
   (Phase 1).
4. **Customer-side hold slot** — **a light membership** (waiting does NOT occupy
   the customer's `attention`; the keystone is "you're free while you wait")
   (Phase 1).
5. **Frontage refusal beats** — **out** (Goodkin-welcome-only, per the
   requirements' rivals-out scope); leave the frontages as prose (Phase 6).
6. **Tab-removal timing** — **its own pass (Phase 0)** — clean baseline before the
   Phase 3 bar retrofit touches the same file.
7. **Till-security mechanism** — **`canRemoveContainable` veto** (gate vault coin
   to the banking verbs; `Sealable` not needed) (Phase 5).
8. **Make-change home** — **a `Coinage` value-object in `lib/banking/`** (not a
   `Money` method, not a free helper) (Phase 4).

## Highest-risk spots (verify hard)

- **Being-attended-as-engagement + the lease sweep** (Phases 1–2): pattern reuse,
  not a `ResidencyLogic` hook — Attendant owns its recency stamp + real-time sweep;
  slot-release-and-poke on abort is the fragile seam.
- **Bar/ticket retrofit without regression** (Phase 3): the zero-wait config must
  be player-visibly identical; existing integration tests are the gate.
- **Coinage rewrite of `issueCash`/`moveCoins`/`drainCoins`** (Phase 4): the only
  place the money paths hard-assume face value 1; conservation + 1:1 till must
  survive mixed denominations.
- **The enrollment tree gap** (Phase 7): `tree.ts` needs a banking-aware
  guard/effect extension to be truly verb-driven.
- **The insert-only reseed migration** (Phase 8): live-DB delete-and-restart under
  the Atlas 500-collection cap.

## Cross-references

- Requirements: [attendant-and-goodkin-bank-requirements.md](../requirements/attendant-and-goodkin-bank-requirements.md)
- Design: [attendant-subsystem.md](../staging/attendant-subsystem.md),
  [terminus-banking.md](../staging/terminus-banking.md)
- Critical files: `obj/api/BankingLogic.ts`, `lib/activity/Engaged.ts`,
  `lib/npc/DialogueConversation.ts`, `obj/api/ResidencyLogic.ts`,
  `lib/banking/Money.ts`
