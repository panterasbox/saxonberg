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
