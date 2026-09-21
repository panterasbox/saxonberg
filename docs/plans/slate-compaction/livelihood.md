# Slate-compaction pass — batch `livelihood`

Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `employment.md` ·
`contract.md`. Superseding sources consulted:
`docs/requirements/economic-bootstrap-requirements.md` (2026-09-18),
`mortality.md`, `combat.md`, `banking.md` (read-only). Line numbers below
are the ORIGINAL file's (1072 lines).

## Findings for the coordinator

- **Cross-references to cut headings, left in place** (the kept text was
  not rewritten): §9 *It explains the compensation basis* quotes §6.1 (cut
  → `employment.md § Compensation bases`); §9 *Three designed pieces*
  cites §6.3 (kept) / §7.2 (kept) / §8.2 (kept); §9 *It answers §5.4's
  open question* cites §5.4 (kept, cozy downtime); §9 *Pricing* cites §3
  (kept); Open Q3 cites §5.3 (cut → `contract.md § Claim modes`, `§ Expiry
  is lazy`); the canonical status block cites §5/§6 by number (kept as the
  status block's own history line).
- ⚠ `contract.md § Deferred seams` lists *"the systemic job generator"*
  and *"NPC claiming brains"* as unbuilt. Both now have a first shipped
  instance in a narrower shape (`lib/behavior/restocks.ts` posts a supply
  bounty per short par line; `trade-haulage/src/behavior/hauls.ts`
  completes open bounties without claiming, by design). I INSERTED a
  paragraph saying so rather than editing the list.
- ⚠ **A sibling owns `banking.md`.** The slate's *Correction 1* (`payWage`
  runs red, no solvency check — still literally true in
  `BankingLogic.ts:963`) is retired by the requirements doc, not by code.
  `banking.md § The leg-kind vocabulary` still states *"`payWage`
  deliberately pays red (the deficit model)"* — true today, scheduled to
  become false. Nothing for me to insert; flagged so the banking agent
  knows the requirements doc is the superseding source.
- **Left grew** (12 → 19 items): schedule shapes, perks, liability
  scope, the grant's trust ramp + the AFK wage gate + firing-for-cause,
  cozy downtime, illicit arrangements, board pricing/gating, salience by
  place, the commissioning surface + review gate were in the body and
  unrepresented. *Death's mechanical cost* left the list (superseded by
  `mortality.md § Diminishment`); *piece-rate and share-of-flow comp
  bases* became *the mine as the first piecework venue* (the bases
  shipped as terms; no content row carries either).

---

## docs/slates/builds/livelihood-slate.md — 1072 → (pending) · Status PARTIAL → PARTIAL

### Stage 1 — the tail (§9 audit · build state · open questions · the kernel list)

#### Cut (SHIPPED · DOCUMENTED)
- `## Once shaped into formal requirements` (1025–1072, 49 incl. the leading blank) — the clause + verification core, the gig, Position/Employment, the capability grant, compensation, tips, firing, the test list. code: `lib/employment/Clause.ts`, `Condition.ts`, `ContractRecord.ts`, `Position.ts`, `Employment.ts`, `Employed.ts`, `platform/idea/api/ContractLogic.ts`, `EmploymentLogic.ts`, `platform/idea/cmd/work/{Job,Fulfill}Controller.ts`; doc: `contract.md § The clause primitive`, `§ The lifecycle + storage`, `§ Escrow`, `§ Verification`; `employment.md § Data model`, `§ Capability grant`, `§ Wage settlement`, `§ Tips`. ⚠ The one unbuilt clause inside it — *the grant ramps with relationship standing* — survives verbatim in the kept §5.4 backbone bullet.
- `## Current build state [NOW]` (955–983, 29) — a third status narrative (*refreshed 2026-07-23*, self-corrected 07-31). History under the one-status-block rule; its *"Genuinely not built"* list is now partly false (the draw as a named leg kind and piece-rate/share-of-flow as authorable terms shipped — `lib/employment/Compensation.ts`, `banking.md § The leg-kind vocabulary`). Its true remainders (entity forms, the appropriation, the floor + match) are in `Left`.
- Open question **Q2** *Death's mechanical cost* (988, 1) — code: `platform/idea/cmd/…/PassageController` / `ConditionApi.die` → `recovering`; doc: `mortality.md § The recuperation model`, `§ Diminishment, and why the floor has to hurt`. One-line pointer left in its slot.

#### Superseded — cut
- `#### ⚠ Correction 1 — "can't make payroll in winter" does not exist` (908–916, 9) — still literally true in code (`platform/idea/api/BankingLogic.ts:963` *"No employer-solvency check … the CB subsidy covering it"*), but the design it audits is retired by `docs/requirements/economic-bootstrap-requirements.md § Goals` (*no account goes negative without a named creditor*) and `§ Collisions` (Dave's Bar becomes the first borrower for wages or a refused wage with a reason). One-line note left.
- `#### ⚠ Correction 3 — no NPC produces anything, so guard rail 2 is not yet true` (927–936, 10) — by the code: production brains ship in the trade packs (`trade-farming/src/behavior/farms.ts`, `trade-mining/…/delves.ts`, `trade-textiles/…/weaves.ts`, `trade-tailoring/…/tailors.ts`, `trade-ranching/…/herds.ts`, `trade-haulage/…/hauls.ts` — `behavior.md` brain table) and the hire surface shipped (`content/platform/cmd/employment/appoint.yaml`, `employment.md § Appointment — the appoint verb`). One-line note left; guard rail 2 (*NPC hands always hireable*) itself is still open and kept.

#### Kept (UNBUILT)
- `## 9. Seasonality` — the whole section except the two corrections above: the comp-basis table, the three designed pieces, the job-guarantee demonstration, two absorbers, players as seasonal labor, the world-scale lull, the two guard rails, *the mechanism is already shipped*, pricing, the substrate audit paras 1 + 3, Correction 2, the pricing refinement, forecastability. No `months`/`season` on `ShiftEntry` (`lib/employment/Roster.ts:16` — `days` + `hours` only); no seasonal posting anywhere; `WorldClockApi.cron` does carry `month` (`api/worldclock.ts:78`) and the calendar is 12 × 30 (`lib/time/DefaultCalendar.ts:20`), as the audit says.
- `## Open questions / forks (consolidated)` — Q1, Q3–Q10 (see Uncertain for Q3/Q4/Q8).
- `## What this slate does NOT cover` — spine.

#### Uncertain — kept
- §9 *Substrate audit* para 2 — *"nothing posts a contract today but an actor typing `job post`"* and the missing `ContractApi.boot()`: `lib/behavior/restocks.ts:370` now issues `job post` per short par line on a cadence (a seat, via `forceCommand`), and `ContractApi` still has no `boot()` by decision (`api/contract.ts:16`). The paragraph's conclusion (a seasonal poster needs a systemic generator armed on a season boundary) still holds; kept whole under the paragraph rule.
- §9 *Guard rail 2* — *"NPC hands are always hireable at standard rates for a standard result"*: production brains exist now, but nothing lets a landowner hire one for their own ground. Design rule, still unbuilt.
- Open **Q3** — the *exclusive-claim vs open-bounty* and *expiry* halves are resolved (`contract.md § Claim modes`, `§ Expiry is lazy`); *discoverability* resolved as a physical board per locality (`platform/thing/JobBoard.ts`, `contract.md § The board`); *pricing* and *gating* remain (`contract.md § Deferred seams`). Kept whole.
- Open **Q4** — the *initial CB allocation* end is answered by `economic-bootstrap-requirements § Lane two` (everything fiscal spent by the treasury; opening capital = a treasury advance on the Note's terms) and `§ The reserve has one officer and two rules`; the *insolvency backstop* end is partly answered (business debt stops at the business; bank failure a non-goal) and partly deferred to credit-slate step 6 (foreclosure on authored content). Kept for requirements to reconcile.
- Open **Q8** the commissioning surface — the goods half has a first instance (`restocks` posts par shortfall); the labor/content half is open. Kept.
- Open **Q7** cites *CB Governor for the anchor* — the Governor seat ships (`banking.md`: `reserve` is `requiresGovernor`); the dials themselves do not.

---

## Stage 2 — §§1–8 body · 853 → (this stage) 853, prior stage's 979 → **853** overall · Status PARTIAL → PARTIAL

Line numbers below are the file's numbering *after* Stage 1's cuts (979
lines) unless marked original.

#### Cut (SHIPPED · DOCUMENTED)
- §1 bullet *"Defeat ≠ death... engine already commits this"* — code:
  `platform/idea/cmd/…/AttackController` incapacitation/lethal split;
  doc: `combat.md` §620–624 (the incapacitation/lethal branch),
  `mortality.md` (dying as a rescuable state, death as one transition).
  One-line pointer left.
- §1 bullet *"The engine's only jobs re: death — true/legible/
  attributable"* — code: `AccountabilityEvent`, `ChronicleEntry`; doc:
  `accountability.md` (the harm-consent ledger), `chronicle.md` (the
  deed ledger). Pointer left.
- §3 bullet *"A new player earns off an NPC job board"* — code:
  `platform/thing/JobBoard.ts`, `lib/behavior/restocks.ts`; doc:
  `contract.md` § The board. Pointer left.
- §3 bullet *"Two labor forms, one primitive: gig vs employment"* —
  code: `lib/employment/Clause.ts`; doc: `contract.md` § The clause
  primitive, `employment.md`. Pointer left.
- §4 bullet *"No NPC faucet... central bank is the only mint"* — doc:
  `banking.md` line 9 (conservation as a hard invariant; the single
  governed-but-logged central-bank mint) — **sibling's file, cited only,
  not inserted into.** Pointer left.
- §4 bullet *"NPC and player contracts are economically identical"* —
  code: `ContractParty` (player | business); doc: `contract.md`.
  Pointer left.
- §4 bullet *"Player contracts self-fund via escrow from the player's
  own balance."* (12 words) — same evidence as above; folded into the
  NPC/player-parity pointer, no separate line needed.
- §5.1 bullets 1 + 3 (`{shape, condition, observer}` primitive; "why
  employment never completes") — code: `lib/employment/Clause.ts`,
  `Condition.ts`; doc: `contract.md` § The clause primitive. Pointer
  left; bullet 2 (Role/Contract as a conjunction of clauses) kept —
  see Kept below.
- §5.2 bullets 1–3 (engine-as-observer, judgment-at-spec-time, the HARD
  RULE) — code: `Condition.validate`, `CONDITION_TEMPLATES`; doc:
  `contract.md` § The clause primitive ("the contract boundary").
  Pointer left; bullets 4–5 kept (authoring discipline, agent's job) —
  see Kept below.
- §5.3 body (the 5-state lifecycle enumeration + the exclusive/
  open-bounty and expiry forks) — already summarized by the section's
  own `[NOW]` blockquote; code/doc: `contract.md` § The lifecycle +
  storage, § Claim modes, § Expiry is lazy. The blockquote itself was
  extended with the fork resolution rather than duplicated below it.
- §5.4 bullet *"Three objects: Position/Employment/Shift"* — doc:
  `employment.md` § Data model. Pointer left.
- §5.4 bullet *"The compensation model falls straight out of the clause
  primitive"* (4 sub-items: time-wage, AFK gate, tips, firing-for-cause)
  — doc: `employment.md` § Wage settlement at shift-end, § Tips.
  Pointer left, **with a correction**: the AFK-gate sub-claim ("the
  shipped anti-AFK predicate") is not literally true — today's wage
  accrual freezes only on a *paused world* (`EmploymentApi.boot()`'s
  tick), not on a per-player idle check; `activity.md` has no AFK/wage
  cross-reference. Recorded as unbuilt in the pointer.
- §5.4 bullet *"The bartender is the right first slice"* — folded into
  the same pointer (Dave's Bar is `employment.md`'s worked example
  throughout).
- §6.1 body (the four-basis elaboration + "Dave's Bar is the canonical
  two-layer case") — already summarized by the section's own `[NOW]`
  blockquote; no new pointer needed.
- §6.2 bullets 1–3 (seat-occupancy orthogonal to ownership; draw never
  silently a wage; ledger-leg-kind discipline) — doc: `employment.md` §
  Compensation bases, `banking.md` § The leg-kind vocabulary (sibling's
  file, cited only). Pointer left; bullet 4 (entity forms) kept.
- §7.1 *"Proprietor — Dave's Bar"* (whole subsection) — it was already
  just a pointer to `employment.md` with no undocumented remainder;
  collapsed to one line, heading removed (the subsection is fully
  absorbed, unlike the other three constituency walks).
- §7.3 bullet *"The state is a business with no owner"* — code: the
  Terminus municipal city-budget `Business`
  (`/world/terminus/budget`); doc: `employment.md` § Wage settlement at
  shift-end ("Second employment consumer"). Pointer left.
- §7.3 bullet *"Office ≈ Position"* — doc: `employment.md` § The
  governing split (the seat/staff table, `OFFICE_APPARATUS` vs "a
  position nobody points at"). Folded into the same pointer as the
  bullet above; bullet body removed.

#### Superseded — cut
- §4 bullet *"Each author runs a budget account"* + §4 bullet *"Faucet
  and sink are the same account read two directions"* — superseded by
  [economic-bootstrap-requirements](../../requirements/economic-bootstrap-requirements.md)
  § Surface decisions: money reaches content through a **Business**
  account funded by treasury-issued credit, not a per-author
  "Narnia account"; balancing is the reserve's two published lanes +
  the credit ladder, not distributed per-author bookkeeping. One
  consolidated note left in place of both bullets.
- §4 bullet *"Authorship becomes an economic game... content that
  doesn't sustain itself withers"* — superseded **in shape** by the
  same requirements doc: a business that can't repay credit or meet
  payroll is refused a wage or closes on its own short clock (§
  Surface decisions, "Dormant"). The natural-selection thesis survives;
  the mechanism moved from a wizard's personal account to a business's
  borrowing history. Note left.
- §4 bullet *"[LEAN] The real monetary lever relocates to CB allocation
  policy"* — resolved by the same requirements doc § Surface decisions
  ("The reserve has one officer and two rules, and is independent"):
  `reserve mint` at a venue is retired for the treasury's
  `appropriate`. Note left.
- §5.2 closing (unlabeled) paragraph *"Both clause shapes ride the
  shipped detection seam... maintain fires on violated"* — **the code
  proves this false**: `contract.md` § The clause primitive states
  explicitly *"No violation-detection engine ships until a consumer
  (a bouncer-shaped job) exists."* Cut outright (no pointer needed;
  the accurate statement already lives in `contract.md`).

#### Kept (UNBUILT)
- §2 in its entirety — the violence/adjudication half is still
  genuinely unbuilt: no `target`-party contract type, no `cull`/
  `escort` condition templates (`Condition.validate` admits only
  `delivery`/`supply`), no institution/legitimacy/liability-laundering
  content, no frontier-law implementation. Verified by absence in
  `civics.md`/`governance.md` (jurisdiction ships; adjudication/
  magistrate content does not).
- §1's "two routes to death, salience by context" and "killing is
  economically dominated and incurs a debt" bullets, and "old age /
  succession" — no locality-salience property, no lethal-cost-debt
  mechanism found anywhere.
- §3's "NPC-bootstrap → player-goal" and "procgen + bespoke" bullets —
  doctrine/content-authoring guidance; the bespoke (non-monetary,
  NPC-surfaced) half is still unbuilt. The open bullet (discoverability/
  pricing/gating) kept whole per the paragraph rule — see Uncertain.
- §4's "two ends of an author budget" + "wizard capital market" open
  bullet — kept whole; see Uncertain (mirrors the consolidated Q4
  treatment from Stage 1).
- §5.1 bullet 2 (Role/Contract as a conjunction of clauses — a single
  Position carrying both a maintain clause and a reactive achieve
  stream) — noted inline as still unbuilt (today's Positions carry one
  comp basis and, at most, the presence-only `watch` template).
- §5.2 bullets 4–5 (diegetic-grounding authoring discipline;
  "the agent's real job is specify/pay/react/bear-spec-risk") —
  the institutionally-confirmed grounding case names a mechanism
  (bounty-authority certification) that doesn't exist yet; kept.
- §5.4's experiential-requirements subsection entire — diegetic
  discovery, first-shift teaching, cozy downtime (the open question),
  shift-model voluntary clock-in — none built. The capability-grant
  backbone bullet (trust ramps with relationship) kept whole per
  Stage 1's own precedent (same bullet, noted there as the one
  unbuilt clause surviving the "Once shaped into formal requirements"
  cut).
- §6.2 bullet 4 (entity forms) · §6.3 (schedule shapes; only the NPC
  rostered shape ships — `Roster`/`ShiftEntry` carry no
  `voluntary-within-windows`/`on-call`/`self-directed` term) · §6.4
  (perks — no `perk` field anywhere) · §6.5 (liability — no
  scope/authorization context on `accountability_events`, confirmed by
  `contract.md`'s own Deferred-seams list) — all whole, all UNBUILT.
- §7.2 (the mine co-op) — explicitly labeled unbuilt in its own
  heading; unchanged.
- §7.3's remaining three bullets (the appropriation primitive; public
  money is glass; what the state buys) — no appropriation object, no
  vote→appropriation→contract→settlement chain in code.
- §7.4 in its entirety (the franchise spectrum) — no royalty-on-gross
  mechanism; `corpo.md` confirms only branding/mark placement rules
  ship, not the economic arrangement.
- §8 in its entirety (the macro, the floor, the match) — confirmed
  unbuilt by grep across `employment.md`/`contract.md`/`retail.md`
  (Circulation Reserve referenced only as a future dependency).

#### Uncertain — kept
- §4's "two ends of an author budget" (CB allocation + insolvency
  backstop) + "wizard capital market" — same disposition as Stage 1's
  consolidated Q4: initial-allocation end answered by
  `economic-bootstrap-requirements` § Lane two; insolvency end partly
  answered (bank failure a stated non-goal; business debt stops at the
  business) and partly deferred to credit-slate step 6 (foreclosure on
  authored content). Left for requirements to reconcile — kept even
  though the sibling bullets naming the old "author budget account"
  model were cut as superseded above; this question's substance (who
  backstops a failing venture) survives the model change.
- §3's open bullet (discoverability/pricing/gating) — discoverability
  itself is resolved (the physical board), but kept whole per the
  paragraph rule since pricing and gating remain open.
- §7.4's *"The operator agreement is the ownership ladder in a
  no-credit economy. All credit is deferred wholesale"* — this
  premise is contradicted by
  [economic-bootstrap-requirements](../../requirements/economic-bootstrap-requirements.md),
  which introduces real credit (supplier terms, inventory finance,
  working capital). Kept verbatim per the kept-but-contradicted rule;
  requirements should reconcile whether the operator-agreement rung
  still makes sense once real credit exists, or whether it becomes one
  more rung *below* rung 0.

#### Doctrine (kept, labelled — not counted in Left)
- The `## Load-bearing decisions (the spine)` section (6 numbered
  items) — left untouched throughout this stage. It is explicitly
  self-labeled "(the spine)" by the slate's own author and functions as
  framing preserved under the skill's spine rule, not as a §1–8 body
  section. Item 2 ("Kill→reward is severed") is verified
  SHIPPED·DOCUMENTED verbatim in `contract.md`'s opening paragraph
  ("The income backbone the platform doctrine requires: kill→reward is
  severed") but was left in place as spine framing rather than cut,
  since the skill's spine-preservation rule takes precedence over the
  cut-when-shipped rule for this section. Flagged for the coordinator
  in case a cross-batch pass wants it trimmed later.
- §1's "The engine's only jobs re: death" bullet and §5.2's "the
  agent's real job" bullet are both design theses about where judgment
  lives (players vs. engine); the first was cut (its realization is now
  concretely documented) and the second kept (no concrete realization
  named). Noted here so the asymmetry is visible rather than looking
  like an inconsistency.

### Status block
- Left: 10 items (pre-existing wording) → 13 `·`-separated clauses,
  rewritten to name what is actually still open in the body (dropped:
  the author-budget-account model *as a model*, piece-rate/share-of-flow
  comp bases, death's mechanical cost, "§7's four constituency walks" as
  a block; added: salience-by-place + lethal-cost debt, illicit
  arrangements, board pricing/gating, the AFK wage gate + firing-for-cause
  + trust ramp + diegetic discovery + cozy downtime, schedule shapes,
  perks, liability scope, the appropriation primitive + civic
  wages/procurement/bounties, the franchise spectrum, the commissioning
  surface + review gate).
- Size: a build → a build (unchanged — still spans §§2, 3.open, 4.open,
  5.4-experiential, 6.2–6.5, 7.2–7.4, 8, 9).
- The second, historical status block (`Status: foundational design,
  conversational first pass...` / `Second pass...` / `Built...` /
  `Retire when...`, ~32 lines) was cut under the one-status-block rule —
  it narrated states superseded by the canonical block above it and by
  this stage's own edits.

### Handoff (belongs in a doc outside my list)
- None. Every SHIPPED·DOCUMENTED finding in §§1–8 already had its
  decision stated in an existing subsystem doc (mortality.md,
  accountability.md, chronicle.md, contract.md, employment.md,
  banking.md, combat.md) — nothing needed a fresh INSERT, and the one
  doc outside my write list I cited (`banking.md`) was cited only, never
  edited.

### Verification
- `git diff --stat -- docs/slates/builds/livelihood-slate.md
  docs/plans/slate-compaction/livelihood.md` — the only two files this
  agent touched.
- 979 → 853 lines (this stage's net cut, on top of Stage 1's 1072 →
  979).
- Every heading removed from the body (§7.1's) appears above with its
  pointer; every remaining heading in the file corresponds to a Left
  item or a Doctrine/spine note.

