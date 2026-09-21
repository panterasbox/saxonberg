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

