# Slate-compaction pass — money batch ledger

Six slates. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `banking.md`. Line
numbers below are the ORIGINAL file's. Originals saved under the scratch
dir `money/orig/` for diffing. Code was verified in
`packages/server/src/mud/**`, `packages/server/src/schema/*.yaml` and
`packages/content/**`; the docs read against were `banking.md`,
`retail.md`, `employment.md`, `contract.md`, `crafting.md`, `corpo.md`,
`holding.md`, `governance.md`, `credential.md`, `advancement.md`,
`materials-response.md`, and the superseding
`docs/requirements/economic-bootstrap-requirements.md` (2026-09-18) +
`docs/slates/builds/institutions-slate.md`.

## Findings (coordinator decides)

1. **`economy-slate` Law 2 vs the shipped shell clock.** Law 2 says *"No
   property tax, no rent on owned space, no upkeep-or-it-decays"*; the
   residences build shipped a **shell that weathers on the calendar**
   and tenure terms that say who owes the upkeep (`holding.md § Two
   clocks, and they must never touch` — which itself cites Law 2 for the
   *good*, not the shell). Kept verbatim as doctrine; the doc that
   restates the law should carry the shell exception. Not mine to insert
   (`holding.md` outside my list).
2. **`banking.md` and `holding.md` cite the economy slate as the HOME of
   Law 1 / Law 2** (`banking.md` l.29, l.81, l.432; `holding.md` l.305).
   The two-laws section therefore cannot leave the slate until a doc owns
   it — a `docs/design-philosophy.md` candidate. Labelled Doctrine below.
3. **`banking.md § Module layout` names `obj/Coin.ts` / `obj/CentralBank.ts`**;
   the files are at `platform/thing/Coin.ts` and `platform/idea/CentralBank.ts`
   (the obj→platform move). A stale path, not a false decision — left for
   the sweep, not edited.
4. **`banking.md § The Attendant + Goodkin cycle`** still says the civic
   credit mints as `credit`/`crown`/`sovereign`; the currency build's own
   section (l.86–92) says those names were retired. Internal
   contradiction in the doc, left as-is (history paragraph); flagging.

---

## docs/slates/builds/economy-slate.md — 847 → 804 · Status PARTIAL → PARTIAL

An umbrella slate, mostly doctrine. The shipped surface was the currency
slice, the custodial bank, the priced offer + consignment, employment +
compensation bases, and crafting with Grade + condition; the slate's own
`Left` under-counted the open body by eleven items. Lending is now the
requirements doc's.

### Cut (SHIPPED · DOCUMENTED)
- second status block *"physics settled, build the currency slice"* (11–19, 9 lines) — history; the slice shipped
- `## Banking` → *Cash* + *Accounts* bullets (246–255, 10) — code: `platform/thing/Coin.ts` (`StackableMixin(Thing)`, per-coin mass), `lib/banking/Coinage.ts`, `lib/banking/Bank.ts`; doc: `banking.md § The money model`, `§ Custodial bank ops`, `§ The Attendant + Goodkin cycle` (coinage, the mass cap). Pointer left
- `## Banking` → *Central bank = the reserve* bullet (267–270, 4) — code: `platform/idea/CentralBank.ts`, `reserve.yaml` (`requiresGovernor`); doc: `banking.md § Conservation`, `governance.md`. Its lender-of-last-resort / insurer clause → superseded (below). Pointer left
- `## Banking` → *v1: custodial + payments* bullet (282–284, 3) — doc: `banking.md § Custodial bank ops` (*"can't fail"*). Pointer left
- `## Quality is a verdict` → *Honesty discipline (props real or cut)* para (323–329, 7) — code: `lib/craft/Grade.ts`, `lib/craft/Durable.ts` (`condition`), `KeenMixin`, `FreshnessMixin`; doc: `crafting.md § Value-objects & vocabulary`, `§ The lifecycle`, `§ Deferred` (*"a field nothing reads…"*). Pointer left
- `### The skill seam` → the provenance para (354–358, 5) — code: `CraftedMixin.maker`, `BrandedMixin`; doc: `crafting.md § "Grade is the only quality axis"`, `provenance.md`, `corpo.md`. Pointer left
- `### When is employment viable?` → *Contract structure dissolves "output > wage"* bullet (638–642, 5) — code: `lib/employment/Compensation.ts` (`COMP_BASES`), `EmploymentApi.settlePiecework` / `flowSplitsFor` / `payDraw`; doc: `employment.md § Compensation bases`. Pointer left
- `## Buildable now — the currency slice (v1)` (731–751, 21) — code: `Coin.ts`, `platform/thing/Stock.ts` / `Menu` / `Tariff`, `retail/buy.yaml`, `Grade.ts`, `Durable.ts`; doc: `banking.md`, `retail.md § The counter`, `§ The buy loop`, `crafting.md § The offer`. Heading + pointer left; the handshake open call survives in `§ Speech is free`
- `## Open problems` → *Recipes as knowledge* bullet (767–769, 3) — code: `lib/craft/` recipe-spread by watching; doc: `crafting.md § The knowledge ladder, generalized`, `§ Deferred` (the remaining vectors). Pointer left

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none into `banking.md` — every shipped decision the slate made about money is already stated there (the mass cap, the 1:1 bridge, the only-mint, Law 1's *price is an event between two parties* at the peg note)

### Superseded — cut
- `## Banking` → the reserve's *insurer / lender of last resort* role (inside 267–270) — by `economic-bootstrap-requirements § Lane one — the window` (the reserve lends against eligible paper by rule) and `§ Banks lend what they hold` (the deposit guarantee as a stated promise). Note in the pointer
- `### Crafting venues — the concrete value-add (Dave's Bar)` (654–680, 27) — by the code: `crafting.md § The model: crafting is location-agnostic` (no venue concept, no `CraftingVenueMixin`, Dave's Bar emergent from `Menu` + on-shift maker + reachable matter); the DIY path shipped as the by-hand manual build. Heading + note left
- `### Substrate` (719–729, 11) — by the code: `lib/employment/Employed.ts` (actor-agnostic), `lib/behavior/shifts.ts` / `covers.ts`, and a gig board that DID ship (`work/job.yaml`, `fulfill.yaml`, `contract.md § The board`) against *"no labor market to build"*. Heading + note left
- `## Open problems` → *The whole advancement / skill system* bullet (764–766, 3) — by `advancement.md` (Discipline catalog, Transcript, Competence bands shipped); the seam's `_control` stays open in `§ The skill seam`. Note left
- `## Open problems` → *Banking beyond custodial rails* bullet (779–786, 8) — by `economic-bootstrap-requirements` (the ladder; banks lend what they hold; runs / failure / deposit insurance / interest on deposits → *"a later banking build, deliberately"*) and `banking.md § Deferred seams` (player-run banks, the grey market). Note left

### Kept (UNBUILT)
- `## Banking` → *The payoff / grey market* bullet (mixed: anti-laundering-by-mass shipped; the frictional grey market is `banking.md § Deferred seams`) · *Commercial banks = corpo-run* (the affiliation key ships; the standing-approval consequence is a named deferred seam; player-run banks deferred) · *Later: lending* (the runs / failure / insurance science — the requirements' *later banking build*)
- `### The skill seam` paras 1–2 + the ordinal-grade blockquote — `Grade.deriveAtFixedControl(_control?)` takes the parameter and nothing supplies it (`crafting.md § Deferred`: *"the declared next crafting wave"*)
- `### Pricing is characterization` — every shipped price is a flat authored `PricedOffer` / `Menu.priceFor`; no stance varies by who-you-are
- `### Speech is free; settlement is sacred` → the *Maybe-build* handshake para — no `trade` verb anywhere under `packages/content/**/cmd/`
- `## Player shops are the apex` — `retail.md § Deferred`: *"player-owned shops / franchising / the market arena (retail S4)"*
- `## Corpo retail — producers, franchisers, and the market arena` — same S4; `Business.ts:31` mentions a franchise only as a possible host comment; `corpo.md` l.189 names *"a store franchised by a corpo"* as content-only
- `## Employment & economic engagement` → intro + the four-relationship table (mixed: NPC→NPC and NPC→player ship; player→NPC — a player business with NPC staff — does not; see Uncertain)
- `### Idle activities — the low-attention bottom tier` — nothing in code
- `### The reserve-governed labor faucet/sink` — see Uncertain
- `### When is employment viable?` — the value-add rule (doctrine, with the two corollaries minus the shipped one)
- `### Wages as monetary policy — the dual mandate, and paying for roles` — see Uncertain
- `## Open problems` → faucet/sink balance · standalone vs education-vertical anchoring · P2P at scale / the directory watch item · *Multiple currencies* (mixed — the refinement is `banking.md § The money model` + the currency slate; the **currency-reset event** lives ONLY here, nowhere in `currency-slate.md`) · *Capital markets — bonds before equity* (overlaps `auction-slate` § the debt market and `institutions-slate`; cluster pass)

### Doctrine — kept and labelled
- `## The two laws` (Law 1 · Law 2 · `### The two scarcities`) — the house style `banking.md` and `holding.md` cite by name (finding 2). ⚠ Law 2's *no upkeep-or-it-decays* is contradicted by the shipped shell clock (finding 1)
- `## The economy is a closed conservation loop` (stages 1–4) — stage 3's *bounded merchant* is `retail.md § Deferred` (S2); consignment shipped
- `## Currency: hybrid (soft coin + barter)` — soft coin shipped; barter is the bespoke path, unbuilt
- `## Quality is a verdict, not a property` → the thesis + three bullets — see Uncertain (observer-relativity)
- `## Transaction clearing: stance, not property` + the three-ways list — path 1 shipped as the standing `PricedOffer`; paths 2–3 unbuilt
- `## The bazaar must be worth the walk`
- `### NPCs are both bootstrap scaffold and disengagement backstop` — the `covers` brain is the shipped instance for the bar
- the closing throughline

### Uncertain — kept
- `## Quality is a verdict` → *"Quality is the fit between that bundle and a purpose, rendered by an observer… different verdicts on the same object"* — shipped in a different shape: `Grade` is ONE band stamped on the object at craft-resolve (weakest-link of inputs), rendered as a band-word; observer-relative appraisal is listed at `crafting.md § Deferred` (*"viewer-relative appraisal"*). Kept inside the doctrine section; added to `Left` as *observer-relative quality verdicts*
- `## Employment` intro — *"don't codify a labor market until players force it"* is contradicted by the shipped gig board (`contract.md`); the table's player→NPC row (NPC staff running a player's business) has no player-owned `Business` path yet. Kept because the table is mixed
- `### The reserve-governed labor faucet/sink` — *"NPC-business liquidity, which the reserve floats"* shipped as opening capital + `reserve mint` subsidy (`banking.md § The Attendant + Goodkin cycle`), and `economic-bootstrap-requirements` RETIRES both (*"Nothing mints at a venue ever again"*; NPC businesses borrow at rung 1–2; the treasury appropriates). The counter-cyclical *keep NPC businesses hiring* thesis has no home in the requirements. Requirements/plan for the bootstrap must reconcile or the slate inherits a retired mechanism
- `### Wages as monetary policy — the dual mandate` — the requirements chose *money per active member* + the window rate as the reserve's instruments and say nothing about a wage rate; not contradicted, not adopted. The *paying for governance roles* half overlaps the executive slate (stipends) — cluster pass
- `## Banking` → *"choosing a bank is a standing corpo-affiliation (passive approval)"* — looked for a standing/approval write on `openAccount` in `platform/idea/api/BankingLogic.ts` and `lib/standing/`; found only the recorded `corpoKey` on the account row. `banking.md § Deferred seams` names it. Unbuilt, kept
- Overlaps for the cluster pass: capital markets ↔ `auction-slate` / `institutions-slate`; multiple currencies ↔ `currency-slate` / `multi-currency-slate`; the two scarcities ↔ `amendment-library-slate` (tenure) / `cooperative-slate`

### Handoff (belongs in a doc outside my list)
- → `holding.md § Two clocks, and they must never touch` (or wherever Law 2 is restated): the shipped exception to Law 2 should be stated as such — *the shell clock is the one calendar decay the economy allows, on a held thing's SHELL, never on a good; tenure terms name who owes the upkeep.* No slate paragraph moves — this is finding 1, a doc-side gap

### Status block
- Left: *faucet/sink + inflation balance · the bazaar · market aggregation · the currency-reset event · bonds-before-equity capital markets* → 17 items (body wins; *market aggregation* was a never-build, not a remainder — dropped; eleven open sections were unrepresented)
- Size: a build → a build (an umbrella; noted as such)

---

## docs/slates/builds/credit-slate.md — 795 → 357 · Status PARTIAL → PARTIAL

Superseded almost wholesale by `docs/requirements/economic-bootstrap-
requirements.md` (2026-09-18, merged), which is itself a design doc (no
code yet — grepped `packages/server/src/mud/**` and `packages/content/**`
for `EnrollmentNote`, `treasurer`, `windowRate`: nothing). Per the task's
own instruction, a requirements doc counts as a superseding source, and
this one is explicit about what it carries from credit-slate (its own
cross-references section names Part 2 superseded, Parts 3–6 and 8–9
carried, steps 6–7 deferred) — I verified that framing against the actual
requirements text rather than trusting the label, and split "Part 6"
(local underwriting, build-order step 7) back out as still-open once I
found cooperative-slate does not yet contain that material (grepped
`Raiffeisen|Grameen|local underwriting`: no hits).

### Cut (SHIPPED · DOCUMENTED)
- `# Part 0 — What actually ships today` incl. the 2026-08-05 refresh (60 lines) — code: `platform/idea/CentralBank.ts`, `LedgerEntry.currency`, `BankingApi.compactCurrency()`; doc: `banking.md § Currency`, `§ Conservation`, `§ Reporting consumers` (fullReconcile/vault float already documented); superseding survey: `economic-bootstrap-requirements § What already exists`. Pointer left
- `## ⚠⚠⚠ The clause that decides the shape` (Part 1, 25 lines) — the Art. V §9 clause and "could a member read the Schedule and predict the reserve's next action" test are established constitutional doctrine (`docs/governance/draft-constitution.md`, `docs/compact-political-science.md`, `docs/subsystems/governance.md` all cite Art. V §9) and the test itself is now the requirements doc's own surface decision verbatim (`§ The reserve has one officer and two rules`). Pointer left
- `## ✅ The "same cockpit" seam exists and works` (Part 10 subsection, ~40 lines) — code: `lib/npc/tree.ts` `dispatch` effect, `CommandApi.forceCommand`; doc: `npc-dialogue.md § The dispatch effect — NPCs do their jobs` carries this verbatim, including the corrected `forced:true` claim, the `preloadAll` trap, and a pointer to `residence.md` for the live `provision`/`requiresWizard` defect (confirmed still present: `packages/content/eternal-university/content/world/eternal/duncan-hall/cmd/provision.yaml:19` still has `requiresWizard`). Pointer left
- Part 8 item 3, *the bank/corpo indirection already exists* — code: `lib/banking/Bank.ts` `corpoKey`; doc: `banking.md` l.189 (*"a bank is affiliated to a corpo, not a branded product"*). Folded into the Part 8–9 pointer
- Part 9's property floor / 13th module / authorship-inalienable rows — doc: `docs/stewardship-doctrine.md`, `docs/governance/eotl-history.md` l.131, `balance-slate.md` (all already state these as settled). Folded into the Part 8–9 pointer
- Part 7's RETRACTION + firewall-breach + path/locality subsections (~50 lines) — the RETRACTION cites `land-compute-and-license.md`'s entitlement formula as its own source (*"already settled it"*); the firewall point restates that doc's Art. I §2 discussion; the path/locality point is a direct corollary of `parcel.md`'s shipped `transfer` + longest-prefix jurisdiction walk. Pointer left

### Superseded — cut
- Part 2, *the Governor seat collapses into a Treasurer* (27 lines) — by `economic-bootstrap-requirements § The reserve has one officer and two rules` (the seat is KEPT; a treasurer chartered beside it — the task brief's own framing, verified against the requirements text). Heading + note left
- Part 3, *the base liability* (perpetual, no-debt-ceiling, the denominator) (77 lines) — by `economic-bootstrap-requirements § Lane two — the perpetual` (money per active member, no debt ceiling stated as a consequence, the perpetual instrument). Note left
- Part 3b subsections 1–4 (CB-doesn't-set-prime, where a rate may live, no rate in v1 + penalty window, the ~5%/game-year number) (61 lines) — by `economic-bootstrap-requirements § Rates are the lender's own standing offer` (bank ~5%/game-year, window = bank+3, no benchmark object, journalism framing, the 12× conversion note) — nearly verbatim adoption. Subsection 5 (the land-value=rent/rate bridge, correcting Part 7) kept — not covered by the requirements doc (collateral there is inventory-only) and still feeds the open parcel-collateral question. Note left
- Part 4, *the lanes, and which carry risk* (20 lines) — by `economic-bootstrap-requirements §§ Lane one / Lane two / The ladder` (resolves Open Q1 "one institution or two" as *two*, with the ladder replacing the three-lane risk table). Note left
- Part 5, *the fiscal side: stabilizers, not stimulus* (60 lines) — by `economic-bootstrap-requirements § NPC businesses borrow first` (the stocking rule is the mechanized standing facility the taper/eligibility argument called for). Note left
- Part 8, *the guardrails* (24 lines, all 3 items) — items 1–2 by `economic-bootstrap-requirements §§ Banks lend what they hold / Debts first, then situs` (deposit guarantee and limited-liability both decided on); item 3 already shipped/documented (above). Note left
- Part 9, *constitutional protections* (35 lines) — the discharge question resolved by `economic-bootstrap-requirements § Non-goals` (non-recourse Note + limited liability meet the 13th-module obligation by construction; a discharge *procedure* still waits); the "is seizure necessary" conclusion echoed by the requirements' rung-1 repossession description; the rest already documented (above). Note left
- Build-order rows 1 (split `reserve mint`), 2 (name the perpetual), 3 (charter treasurer/retire Governor), 5 (standing facility) — by the same requirements sections; row 3 additionally corrected (retiring the Governor is now wrong). Rows 4, 6, 7, 8 kept — the requirements doc's own non-goals list names these as still deferred (governance backlog, content-packs-slate, cooperative-slate)
- Open questions 1 (one institution or two — *two*), 2 (debt ceiling — none, stated), 3 (denominator — money per active member), 5 (limited liability — on), 6 (debt market rides auction-slate — confirmed non-goal), 7 (benchmark rate — confirmed never) — all resolved by name in `economic-bootstrap-requirements`. Questions 4 (parcel pledgeability) and 8 (taxes) kept — both still genuinely open per the requirements' own non-goals (collateral is inventory-only for now; taxes stay the demo tax, a fiscal build is separately seeded)

### Kept (UNBUILT)
- `# Part 6 — Local underwriting is the primary channel` (full, ~50 lines) — `economic-bootstrap-requirements § Non-goals` explicitly defers this to the cooperative slate, but the substantive design (neighbours-as-underwriters, Raiffeisen/Grameen precedent, the joint-liability guard) is not yet written anywhere else — checked `cooperative-slate.md` directly, no hits
- Part 3b's final subsection, *the reason the rate matters more than lending does* (land value = rent ÷ rate, the collateral bridge)
- Part 7's *What the market actually is: location*, *Land vs. improvements*, *Where the content goes: a personal pack* (~95 lines) — the requirements doc's non-goals explicitly exclude foreclosure-on-content and the personal pack; `content-packs.md` has no personal-pack concept yet (grepped)
- Part 10's *An NPC cannot hold an office* + the principal-path-offices fix proposal + the NPC-eligibility guard note — verified still true in code: `packages/server/src/mud/platform/idea/api/CompactLogic.ts:45` still has `playerIdOfQuick`, unchanged; `economic-bootstrap-requirements § Non-goals` names this as the governance backlog, not this build's
- Part 10's `ReserveController.execute()` has no authorization of its own — minor, undocumented elsewhere, still true
- Open questions 4 (parcel pledgeability) and 8 (taxes)

### Uncertain — kept
- Part 7's *What the market actually is: location* (von Thünen / footfall-as-collateral) overlaps `freight-slate.md` (von Thünen rings, already extensive) and `land-compute-and-license.md` (entitlement = f(demand)) without being fully subsumed by either — both those slates are themselves unbuilt design, not shipped code, so this isn't SHIPPED·DOCUMENTED; flagged for the cluster pass rather than cut

### Handoff (belongs in a doc outside my list)
- none — every graduation candidate here landed on already-existing doc statements (pointers only, no new insert needed) except items that belong to `npc-dialogue.md`, `parcel.md`, `land-compute-and-license.md`, `stewardship-doctrine.md`, `eotl-history.md`, `balance-slate.md` — all of which **already state the decision**, so nothing new needs inserting anywhere, in or out of my list

### Status block
- Left: *splitting `reserve mint` · naming the perpetual · chartering `treasurer`/retiring Governor · principal-path offices + NPC-eligibility guard · the standing facility · relocatable content/personal packs · local underwriting · discharge · the Treasury cycle* (9 items, largely resolved-elsewhere) → *local underwriting at the committee · relocatable content/personal packs · NPC principal-path offices + the eligibility guard · whether the parcel stays pledgeable · where taxes come from* (5 items, all still genuinely open)
- Size: a build → a tail (the remaining design rides the economic-bootstrap build or waits on cooperative-slate/content-packs-slate; nothing left here is its own build)

---

## docs/slates/builds/currency-slate.md — 562 → 232 · Status PARTIAL → PARTIAL

The rare case where nearly every concrete finding actually shipped, and
shipped in the exact shape the slate specified — code-verified line by
line against `lib/banking/Currency.ts`, `lib/banking/Money.ts`,
`platform/thing/Coin.ts`, `lib/banking/AccountBalance.ts`, and
`banking.md`. Several code comments quote this slate's own reasoning
back (the `?? 1` fallback fix cites the exact failure mode this slate
predicted), which is about as strong as "shipped" evidence gets.

### Cut (SHIPPED · DOCUMENTED)
- `# The name: the currency is the zorkmid` (25 lines) — code: `DEFAULT_CURRENCY`/`Currency.ts` registry; doc: `banking.md` § Currency (*"v1 registers exactly one currency: the ZORKMID… `credit` was retired"*). Pointer left
- `# Denominations are structural, not authored` + its two subsections (62 lines) — code: `lib/banking/Currency.ts`'s `CurrencyRecord` (`{value, massKg, label?}`); doc: `banking.md` (*"Denomination identity is `(currency, faceValue)` — structural, not an authored name"*, near-verbatim). Pointer left
- `# CORRECTION — the expensive part is not already paid for` (62 lines) — the migration this section warned about happened: `currency: { persistent: true }` now on `AccountBalance.ts:36`, `LedgerEntry`, and `bank_supply` per `banking.md` § Conservation. Pointer left
- `# What is actually left` table + the conservation-invariant subsection (37 lines) — all 6 build items shipped (verified individually below under hazards/acceptance); item 7 (exchange) is the doctrine `banking.md` and this slate's own "Do not build exchange" section both carry. Pointer left
- `# Three concrete hazards the survey found` (all 3, 59 lines) — code: `Coin.ts:27` `stackIdentityFields = ['currency', 'denomination']` (glob-merge fixed); `Currency.ts:143` `faceValueOf` throws on an unknown pair, its doc comment quoting this slate's own failure-mode language; `Currency.ts:186` `describeDenomination` derives *"a 25-zorkmid piece"*. Pointer left
- `## Reconciling…` table's *world oracle* and *currency-crossing-leg* rows, and `# Reserve status is FUNCTIONAL, never decreed` (21 lines) — `banking.md` § Conservation (*"nothing in this codebase asks what one currency is worth in another"*) and § Currency (*"Reserve status is functional, never decreed… payable only in zorkmids… by construction"*, near word-for-word). Rows cut individually inside the kept table; the Reserve-status section cut whole. Pointers left
- `# The acceptance test` (16 lines) — both named violations fixed: `Money.render()` → `Currency.renderMinor`; `Coin.denomination` is now a numeric face value (`= 0`), not a currency-string default. Pointer left
- `# Scope recommendation` (15 lines) — executed: v1 shipped with exactly one currency, no exchange. Pointer left
- Risks table rows *temptation to build FX*, *per-currency conservation is subtle*, *the rename is a live-data migration* (3 rows) — all resolved by the same shipped invariants/throw-fix above. Pointer left
- Open Q1 (account-per-currency, already marked CLOSED in-doc) — code: `AccountBalance.ts:66-77` (*"An account holds exactly one currency"*). Pointer left
- Open Q6 (does the fallback throw) and Q7 (do `sovereign`/`crown` survive) — both resolved: it throws; they didn't (`banking.md`: *"never seen by a player"*). Pointer left

### Superseded — cut
- `# Credit — WANTED, deferred, not rejected` + its rename-argument subsection (46 lines) — by `docs/requirements/economic-bootstrap-requirements.md` (2026-09-18) and the (now-compacted) `credit-slate.md`: credit is no longer merely "wanted," it has a full requirements doc. Pointer left

### Kept (UNBUILT)
- `## Reconciling this with the tail's Half B` (the money-changer row, the `convert`-verb row, the "changer survives" closing quote) — kept WHOLE rather than surgically split down to just those two rows: the peg-promise row says *"See below,"* pointing at the very next kept section, so removing that section while leaving the pointer would have left a dangling reference. No second currency/scrip exists in code, so none of this is built
- `## The peg is a promise, and the promise can break` (full, 37 lines) — same reasoning: no redeem mechanism, no second currency, nothing built; kept alongside Half B for the cross-reference above
- `# The use case worth building toward is SCRIP, not municipal money` (full) — no `scrip`/`moneyChanger` anywhere in `packages/server/src/mud` or `packages/content` (grepped; hits were all `script`/`description` false positives)
- Risk rows *two prices is bad UX* and *a second currency nobody uses is dead weight* — both still forward-looking, contingent on a second currency existing
- Open Q2 (who may authorize an issuer), Q3 (acceptance default), Q4 (wages-in-scrip consent), Q5 (floor on issuer obligations) — no acceptance-list field found anywhere (`grep acceptedCurrenc`), no second-issuer authorization path exists

### Handoff (belongs in a doc outside my list)
- none — every graduation candidate is already stated in `banking.md`, which is in my write list, and nothing here needed a fresh insert (all pointers, no new text)

### Status block
- Left: *a second issuer + who may authorize a mint · opt-in acceptance lists / corpo scrip · the peg as a redeemable standing offer · wages-in-scrip consent* (unchanged in substance — this was already the accurate remainder; only the surrounding Status prose changed to point at `banking.md` first and note the peg is designed-not-built)
- Size: a build → a build, but flagged as much smaller than it reads — the substrate shipped in full; what's left is one currency instance's content and policy, not machinery

---

## docs/slates/tails/multi-currency-slate.md — 358 → 221 · Status PARTIAL → PARTIAL

This tail already knew it was mostly done — its own opening callout says
*"HALF A IS BUILT AND MERGED… do not build from the Half-A sections
below."* I verified that claim against the actual code (not just trusted
the callout) and cut the sections it was talking about, which the
callout itself hadn't gotten around to removing.

### Cut (SHIPPED · DOCUMENTED)
- `## What it is — and isn't` + `## The gap — the ledger spine is currency-blind` + `## The one decision Half A must make first` (67 lines, contiguous) — code: `AccountBalance.ts` (`currency` field, single-currency-per-account exactly as recommended), `LedgerEntry`/`bank_supply` per-currency, `BankTransaction.assertConserving`; doc: `banking.md` §§ Currency / Conservation. Pointer left (folded into a fix of the now-stale "do not build from the sections below" callout, which referenced content that no longer exists post-cut)
- `### Half A — the multi-currency substrate` (build-order steps 1–7, 48 lines) — same evidence as above, plus the three hazards (glob-merge, `?? 1` fallback, denomination presentation) already verified shipped while compacting `currency-slate.md`. Pointer left
- The "Naming (decided 2026-08-04)" callout + the "Read the claim below precisely" correction callout + the "it stays a tail" paragraph (28 lines) — the rename shipped; the correction callout's forward reference (*"the gap table two sections down"*) points at content now cut, so keeping the callout without its referent would dangle. Folded into the same pointer
- Open Q1 (account model) — code: `AccountBalance.ts` (*"An account holds exactly one currency"*), shipped exactly as this doc recommended. Pointer left
- Open Q4 (peg vs. float) — already marked resolved in-doc; the underlying doctrine (no world rate, ever; peg = standing offer) ships word-for-word in `banking.md` § Currency. Pointer left
- "per-currency statement views" (a `Left` item, not a section) — `banking.md` § Reporting consumers: *"Money supply + reconciliation — all per currency… never sum across."* Since accounts are single-currency by construction, a statement is inherently per-currency; moved out of `Left` with a note in the status block rather than left silently stale

### Kept (UNBUILT)
- `## Half B — currency markets (FX) — SUPERSEDED` (full, including the numbered rate-source/money-changer/convert-verb design, 65 lines) — no `moneyChanger`/`scrip`/`convert` verb anywhere in code (grepped). Kept WHOLE rather than trimmed to match `currency-slate.md`'s parallel table: this section carries several rounds of its own internal corrections (*"marked wholly refused on 2026-08-04; that was too broad a cut and is corrected here"*) that reference each other across the section and the Build-order recap below it; row-level surgery risked breaking a correction trail already stitched together once
- `### Half B — FX (build order recap)` (full) — same reasoning, same evidence
- Open Q2 (who issues a second currency), Q3 (does the 2nd currency have cash), Q5 (cross-currency in one statement), Q6 (spread/fee home) — no second issuer, no money-changer, no `Terms`-based spread fee anywhere in code
- `## What this slate does NOT cover` — a short, still-accurate boundary list; not backlog material, left untouched

### Uncertain — kept
- The kept Half B section here and `currency-slate.md`'s kept "Reconciling this with tail's Half B" section are substantially the same design (money-changer, peg, convert-verb) told twice, neither one fully subsuming the other (this one has the deeper rate-source/mechanics detail; that one is the tighter summary). Flagged for the cluster pass rather than merged now — per the calibration rule, two slates keeping the same open thing stays as-is until then
- Q2 here (who issues a second currency) and `currency-slate.md`'s Q2 (who may authorize an issuer) are the same open governance question from two angles — same cluster-pass flag

### Handoff (belongs in a doc outside my list)
- none — all pointers land on `banking.md`, in my write list, with nothing new to insert (the decisions are already stated there)

### Status block
- Left: *a second issuer and the corpo scrip that motivates one (with its coinage) · the money-changer as a merchant · the pegged issuer's redemption window · per-currency statement views* → same minus *per-currency statement views* (shipped, see Cut above)
- Size: a tail → a tail (unchanged — genuinely small: a second currency's content plus one NPC merchant)

---

## docs/slates/builds/money-integrity-slate.md — 290 → 256 · Status PARTIAL → PARTIAL

The lightest cut in this batch — this slate's own status block already
knew exactly what shipped and what didn't, and the code confirmed it
exactly: `lib/banking/__tests__/money-integrity.test.ts`'s own header
comment says *"See docs/slates/builds/money-integrity-slate.md for the
full surface — most of it is a later cycle. This file covers only what
this build claims."* The census/gates/property-test cycle (the slate's
actual deliverable) has not happened — no `ValueBearingMixin`, no
object-layer conservation property test, no uncloneable-Coin decision
anywhere in code.

### Cut (SHIPPED · DOCUMENTED)
- Finding 1 (`setQuantity` is ungated) full write-up (22 lines) — code: `platform/thing/Coin.ts` `setQuantity` now `@CallSecurity(CoinQuantityMutators) @Final @Unshadowable`; test: `money-integrity.test.ts` (*"refuses an ungated caller"*); doc: this slate's own `§ What the currency build already fixes` item 1 already summarizes it. Pointer left
- Finding 2 (`reconcile()` blind to snapshotted coin) full write-up (10 lines) — code/doc: `fullReconcile(currency)`, `banking.md` § Reporting consumers (non-resident snapshot coin counted). Pointer left
- `## Why finding 2 matters more than it looks` (18 lines) — historical justification for a shipped sequencing decision; folded into the same pointer
- Open Q3 (two reads: circulating vs. total) — shipped exactly as proposed: `reconcile()` (sync, circulating) vs. `fullReconcile()` (async, complete identity, vault float reported not added) — `banking.md` § Reporting consumers. Pointer left

### Kept (UNBUILT)
- `# The governing distinction: two conservation domains, only one sealed` (full) — still accurate: one gate (`setQuantity`) closed, but creation (clone/recipes/packs), persist/restore idempotency, sandbox crossing and destruction-side draining are all still unaudited
- `# The reframe: the threat is an unreviewed call site, not an attacker` (full) — doctrine framing the remaining audit work; not shipped, not contradicted
- `# The audit surface` §§ A–E (full, all five tables) — the actual backlog; confirmed still a census, not a sweep
- `# What the currency build already fixes` (kept as the short authoritative "already done, don't re-scope" boundary marker, rather than cut — it's 17 lines and demarcates scope for the kept audit-surface work more usefully than a pointer would)
- `# Scope recommendation` (the three-pass plan) — none of the three passes has run
- Open Q1 (uncloneable Coin), Q2 (value-bearing marker), Q4 (unbalanced-reconcile response), Q5 (hostile wizard vs. mistakes-only boundary) — none decided or built; Q5's "leaning mistakes-only" view isn't contradicted by anything in `access.md` but isn't stated there either

### Doctrine — kept and labelled
- Finding 3's retrospective paragraph (*"a term that looks like a missing reservoir may be a duplicate of one already counted elsewhere"*) — a general conservation-identity design lesson, not itself a backlog item; kept inside the Finding-3 subsection rather than pulled out, since it's short and load-bearing context for why the finding was withdrawn

### Handoff (belongs in a doc outside my list)
- none

### Status block
- Left: unchanged in substance, extended to also name Q4 and Q5 (unbalanced-reconcile response; hostile-wizard-vs-mistakes boundary) since the body already carried both and the old Left list omitted them
- Size: a build → a build (unchanged — the three-pass sweep is real, un-shrunk work)

---

## docs/slates/builds/auction-slate.md — 252 → 252 · Status PARTIAL → PARTIAL (no edits)

`find . -iname "*auction*"` outside `docs/` returns nothing — no `auction`
or `bid` verb, no lot/contract mapping, no `SustainedEngagement` for an
auctioneer, anywhere in `packages/server/src/mud` or `packages/content`.
The status block's own claim (only the substrate it rides — `contract.md`
escrow/custodian/clauses, `retail.md` consignment — has shipped; the
auction surface itself has not) checked out exactly. Every "Left" item
verified independently absent. File is byte-identical to the original;
no cut, no graduation, no supersession found.

### Kept (UNBUILT)
- The entire body — every section, every open question. Nothing to classify differently than the slate's own status block already does.

### Uncertain — kept
- Not a contradiction, but a gap worth the coordinator's attention: `economic-bootstrap-requirements.md` (§ Non-goals) now says *"A player-to-player debt market → the auction slate: a debt is a claim and the auction rides contracts. This build creates the paper it will trade."* — a forward dependency onto this slate that didn't exist when it was written (2026-07-31, before the requirements doc). `auction-slate.md` itself has zero mentions of debt/loan/paper (grepped). I did not add this myself — compaction is cuts-only, and this is new design surface, not a cut — but the coordinator or the cluster pass should probably fold a "loan paper as a lot" bullet into `## What gets auctioned` when this slate is next touched

### Handoff (belongs in a doc outside my list)
- none

### Status block
- Left: unchanged
- Size: unchanged (a build)
