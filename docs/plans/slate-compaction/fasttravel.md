# Slate-compaction pass — fasttravel batch ledger

Three slates. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `fasttravel.md` only
(one insert). Line numbers below are the ORIGINAL file's. Originals saved
under the scratch dir `fasttravel/orig/` for diffing. Code was verified in
`packages/content/tpa/**`, `packages/content/arcana/**`,
`packages/server/src/mud/{lib/travel,lib/credential,lib/magic,platform/idea/api/MagicLogic.ts}`,
the terminal rows under `packages/content/{saxonberg-lounge,terminus,newbie-wilds,hinkley-hills}/content/**`,
and the docs of record `fasttravel.md` · `magic-items.md` · `banking.md` ·
`docs/arcane-science.md`.

Batch-wide findings a reviewer should know first:

1. **The two mana-economy documents are on opposite sides of a science
   change, and `arcane-science.md` is the doc that decided it.** The
   mana-economy-slate (2026-08-04) rests on *"Mana IS energy; it costs
   whatever energy costs"*. The design pack (2026-08-11) replaced that with
   *mana is a second conserved quantity, one-way coupled at `k = 1 kJ/τ`,
   extractive, held by matter* — and that edit **LANDED** in
   `docs/arcane-science.md` (its 2026-08-11 audit-log entry, § The second
   quantity, § Halloway Equivalence + § the field over-read it, § Kell's
   Partition's economic corollary, § Control·Body and the terminal network,
   § The caster's budget, § The power level). So the slate's Parts 0, 1, 5,
   6 and the pack's Parts 0, 1, 2, 5c, 8 are cut with pointers to
   `arcane-science.md` — a shipped doc, not merely the sibling slate. The
   two are NOT merged; the overlap is recorded under *Uncertain* for the
   cluster pass.
2. **None of the design pack's BUILD surface exists in code.** Grepped
   `packages/server/src` + `packages/content` (non-test): `manaDensity` /
   `manaConductivity` / `ambientMana` / `ManaNode` / `ManaDeposit` / *magic
   water* / *mana crystal* / *phytomin* → 0 hits each (`magic-water` hits are
   the arcana `Discipline` rows `magic-water.yaml` etc.); mining's
   `Deposit` is metal-only (`rejection/.../idea/deposit/ferrow.yaml`);
   `terminus-city.md` has the Confluence and the fog but no mana. So the
   pack's Parts 3–7, 9, 10 and its open questions are KEPT nearly whole,
   and its `Left` grows.
3. **`DrawMode = 'impulse' | 'binding'` is declared and only half
   exercised.** `arcana/src/lib/ManaPowered.ts:79` declares both; nothing
   outside `ManaPowered.ts` reads `'binding'` (grep) and no shipped row
   authors it — every device is impulse. The pack's *devices that hold
   effects* section is cut for the impulse half (shipped, documented in
   `fasttravel.md § The gate runs on mana` + `§ The arming floor`) and its
   home paragraph is KEPT (the binding half is unbuilt) — see Handoff.
4. **The `fasttravel.tpaAccount` key and "`Charge` carries a currency"
   (mana-economy-slate Part 5) are both false today**: the key is
   `fasttravel.tpaBusinessPath` (`tpa/content/settings/fasttravel.yaml`)
   and `lib/magic/Charge.ts` has no currency field. Both claims left with the
   Part 5 cut; noted so nobody re-cites them.

---

## docs/slates/tails/fast-travel-slate.md — 280 → 159 · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- the second status block *"Status: SHIPPED (v1) → graduated…"* + the ⚠⚠ *"Two 'settled: deferred' rows below are now WRONG"* paragraph (12–36, 25) — history; the canonical block is kept and re-stamped; the rows it warned about are cut below
- `The load-bearing decisions` → items 1–4 (45–70, 26) — 1 directed network, per-terminal authoring, Authority owns standard + health: code `tpa/src/lib/FastTravel.ts` (`routes` instruction field, `applyRoutes`), `tpa/content/system/tpa/idea/teleport-authority.yaml`; doc `fasttravel.md § The network model` (*no central planner*), `§ Seams & deferred surface` (*the Authority owns standard + health, never topology*) · 2 public infrastructure, last mile on foot: `§ The network model` bullet 4 · 3 scan-to-register: `RegisterController.ts`, `register.yaml`; `§ Unlock = scan-to-register` · 4 implant + card: `tpa/src/thing/TravelCard.ts`, `platform/idea/CredentialWalletUpdate.ts` (born-with, `Avatar.installDefaultLoadout` l.1185); `§ The two halves`, `§ Identity-bound clearance`. One-line pointer left; item 5 (the living-infrastructure intent — seam shipped, loop not) is KEPT as a mixed paragraph
- `## Principle` → items 1–4 (106–111, 6) — restate the decisions above; pointer left, item 5 kept
- `## The model` body (145–172, 28) — Terminal directionality / interaction mode / operator / state, Route, Credential, the travel act, the discovery loop: code `FastTravel.ts` (`directionality`, `advanceMode` ∈ manual/scheduled/cycle, `departures` cron, `ride()`), `TpaTerminal.ts` (`getStatus()` derived); doc `fasttravel.md § The two halves`, `§ The network model`, `§ Targeting and the departures board`, `§ The verbs`, `§ Timetable & advance policy`. Heading + pointer left. ⚠ the `scheduled`/`cycle` modes shipped as MECHANISM only — `grep advanceMode packages/content/*/content` finds one comment (`arrival-terminal.yaml:6`, *"No advanceMode → manual"*) and no row authoring one
- `## What it reuses vs reveals` → the *Reuses* paragraph (190–195, 6) — a list of substrate the shipped build reused; history
- `## Open questions / forks (mostly settled)` → Q1–Q6 (213–224, 12) — all answered in code and doc: Q1 both (`§ The two halves`) · Q2 (`§ Unlock`) · Q3 *deferred* overtaken (Superseded, below) · Q4 the seam shipped, `status` derives (`§ The condition, and why there are two reads`; wear + the round stay in `Left`) · Q5 on-demand + the timetable modes (`§ Timetable & advance policy`) · Q6 `directionality` is authored content (`§ The two halves`; Terminus arrival gate is the first `arrival`). One resolution line left
- `## Build order` → Wave 1 (230–235, 6) — shipped end to end; pointer left
- `## Once shaped into formal requirements` (257–280, 24) — the Wave 1 requirements pre-shape, incl. the test list whose *"no fee charged in v1"* is now false; every bullet is `fasttravel.md`. The closing *"…wait for their own waves"* line is represented by the re-stamped `Left`

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `## Why teleport (and why it's magic)` → paragraph 1 (119–127, 9) — the WHY of *teleport, not conveyance*: destinations in an un-genred world share no continuous ground, so only a discontinuous hop can join them. Code: the whole network is `Mobile.teleport` hops (`FastTravel.ride()` → `getArrivalRoom()`); `fasttravel.md` carried the what (*discontinuous hops across an authored network*) without this why → inserted at `fasttravel.md` as a new `### Why teleport, and not a train` directly under the intro paragraph (12 lines). Pointer left; paragraph 2 (the reach thesis + the route map as its content surface) is KEPT — see Doctrine

### Superseded — cut
- `## Why teleport` → the *Naming note* (136–139, 4) — by the realm-neutral pack: `/system/tpa`, content-named *Teleport Authority* (`fasttravel.md` intro; the slate's own framing paragraph says the *Eternal City* naming is historical; the only remaining mention is a comment nod in `terminus/.../agent/clerk.yaml:2`). Note left; *"whether the surround city shares 'Eternal'"* stays the EU slate's question
- `## The lounge tie` body (178–184, 7) — by the code: the lounge terminal (`saxonberg-lounge/content/world/lounge/thing/terminal.yaml`) is `both`, fee-0, and routes to the **Terminus arrival gate** only; there is no dorm-lobby terminal (`grep -i lobby` over content finds only prose) and no onboarded-state routing — the born-with floor (`fasttravel.bornWithNodes`: lounge · Terminus · the crossroads) does that job, and home is a walk into the dorm room (`residence.md`). Heading + note left
- `## What it reuses vs reveals` → Reveals item 1 *Economy / fees — v1 is free/comped* (197–200, 4) — by the TPA reform: fares, the network fee, the arrival surcharge, the mana charge (`FastTravel.ride()` → `settleFare`; `fasttravel.md § The transit-fare economy`). Struck line + pointer left
- `## What this slate does NOT cover` → the *economy* bullet (250, 1) — same; struck + pointer

### Kept (UNBUILT)
- the status block (re-stamped) · the framing paragraph · *See also* (every link is to a live doc or slate; none pointed only at a cut section)
- `The load-bearing decisions` item 5 + `## Principle` item 5 — the living-infrastructure LOOP (wear, breakdowns, sabotage); `TpaTerminal.ts` composes no `Durable`/wear (grep), the Authority ships `positions: []` (`teleport-authority.yaml:45`)
- `## What it reuses vs reveals` items 2 (condition / maintenance / repair — the loop) and 3 (published schedules / route maps / hubs — the Terminus hall's departures board is a described detail, `hall.yaml:30` *"stays a described detail"*; no Readable schedule or route map exists)
- `## Build order` Wave 2 and Wave 3+ — mixed paragraphs, kept whole (paragraph rule); see Uncertain
- `## What this slate does NOT cover` — the four remaining scope bullets

### Doctrine — kept, labelled
- `## Why teleport` → paragraph 2 (129–134): *the network's reach is the un-genre thesis made navigable; the route map is a content surface for it (the EU staging Stop)*. Half thesis, half the unbuilt route map; the coordinator decides whether the thesis half belongs beside the graduated why in `fasttravel.md` or in `design-philosophy.md`

### Uncertain — kept
- `## Build order` Wave 2 — *scheduled terminals (world-clock)* and *transport hubs* shipped (`§ Timetable & advance policy`; Terminus); *published schedules + route maps (Readables)* did not. One paragraph; `Left` names only the wayfinding half
- `## Build order` Wave 3+ — *the Authority as a faction/maintainer* shipped in a different shape (a self-governing `Business` with `positions: []` — `§ The transit-fare economy`), and *"economy/fees land whenever that subsystem does"* is done. The loop (breakdowns · repair · delays · rerouting · sabotage) is the live remainder; ⚠ `ManaMain.severed`/`closed` (`arcana/src/thing/ManaMain.ts`) already produce `cut`/`off`, so a *line* can be disrupted today — what is missing is wear, rerouting and any event that does it
- *See also* → onboarding-slate bullet says *"dorm-lobby home-routing ride this network"* — that routing did not ship (Superseded above); left because *See also* is spine
- Overlaps for the cluster pass: the maintenance round ↔ `vocations.md` *water/sewer worker* gap (`fasttravel.md` names it); cross-restart credential durability ↔ `credential.md` l.77 + persistence (the `CredentialWalletUpdate` is re-cloned every login — `Avatar.installDefaultLoadout`); the Terminus canon ↔ `mana-economy-design-pack.md § Part 5b`

### Handoff
- none

### Status block
- Left: *scheduled mode + wayfinding (published schedules, route maps, hubs) · terminals that WEAR · the maintenance round the self-governing Authority now owes · disruption/rerouting/sabotage · cross-restart credential durability* → *wayfinding (published schedules + route maps as Readables — the `scheduled`/`cycle` advance modes and the Terminus hub shipped) · terminals that WEAR · the maintenance round the self-governing Authority now owes · disruption events / rerouting / sabotage (beyond a cut or closed line) · cross-restart credential durability*
- ⚠ *cross-restart credential durability* has NO body section — it never did; it lives only in the status block, and `fasttravel.md § Credential caveat (v1)` + `§ Seams & deferred surface` point back at this slate for it. Kept in `Left` with that pointer rather than dropped under the body-wins rule, because dropping it would retire a live backlog item the subsystem doc defers to this file
- Size: a wave → a wave

---

## docs/slates/builds/mana-economy-slate.md — 570 → 401 · Status PARTIAL → PARTIAL

The slate's spine is the 2026-08-04 conversation that priced magic as
energy; the design pack a week later, and the `arcane-science.md` revision
that landed with it, moved mana to a second conserved quantity. Every cut
below is either *shipped in the charge economy / TPA reform* or *superseded
by that revision*; the unbuilt half (nodes, the grid, the charger trade, the
vehicle) is untouched.

### Cut (SHIPPED · DOCUMENTED)
- the second status block *"design conversation, captured… one proposed change to the arcane science (Part 6)"* (33–36, 4) — history; Part 6 was resolved and then overtaken (below)
- `## ⭐⭐ Guard 1 — demurrage: charge self-discharges` body (121–134, 14) — code: `lib/magic/Charge.ts` (`standbyDraw`), `ChargedMixin.reconcileCharge`; doc: `magic-items.md § The charge economy` (*decay is load-bearing*, `S* = inflow/d`, *you find shells and buy charge*, *recharging is a service*). Heading + pointer left
- `## ⭐⭐⭐⭐ Guard 3 — mana CANNOT become money` body (158–177, 20) — code: `lib/banking/Currency.ts` registry, `BankingLogic.postTransaction`'s same-currency check; doc: `banking.md` l.66–74 (*currency records are code… a code edit at the wizard tier*), l.126 (*a ledger leg may never cross currencies*). Heading + pointer left
- `## ⭐⭐ And Guard 1 is now citable` → the money/charge table (181–189, 9) — doc: `banking.md § Law 2` (l.434 *nothing decays*), `magic-items.md § The charge economy`. Pointer left; the `PricedOffer` currency-gap paragraph (191–195) is KEPT — still true: `lib/commerce/PricedOffer.ts:59–64` authors *flat prices per offer key, in minor units*, no currency
- `# Part 2b` → the intro *"Written against the slate; the subsystem doc now supersedes it"* (199–202, 4) — history
- `## ⭐⭐⭐ The equilibrium is now an equation` (204–224, 21) — doc: `magic-items.md § The charge economy` verbatim (the equation, *two dials whose ratio is the answer*, *magic perishes, matter doesn't*, the ⚠ no-far-past-guard box). Heading kept as *— shipped* + pointer
- `## ⭐⭐⭐⭐ A FOURTH guard` (226–246, 21) — code: `MagicApi.transferCharge`, `lib/magic/PriceList.ts`; doc: `magic-items.md § Recharging: three things, and a coupling that loses some` (the coupling table 0.6/0.85/0.98, *a lossless pump is a perpetual-motion machine*, `transfer` gated at `novice`), `§ Distribution` (`PriceList`). Heading kept as *— shipped* + pointer
- `# Part 5 — ⭐⭐⭐ The TPA on mana` body (341–371, 31) — code: `arcana/src/lib/ManaPowered.ts` (`resolveSupply`, `SupplyMode` cell/main/contact), `tpa/src/thing/TpaTerminal.ts`, `tpa/content/settings/fasttravel.yaml` (`tpa.manaRate.mains 0.002` / `.cell 0.01`), `MagicLogic.relocationCostImpl` (mass + borne burden); doc: `fasttravel.md § ⭐ What the TPA reform changed`, `§ The gate runs on mana`, `§ The three supplies`, `§ The arming floor`, `§ The mana charge (D8a) — the rate is DERIVED`, `§ Terminus` (city gates line-fed, frontier posts on cells). All four of the slate's "buys" shipped. ⚠ Two stale facts left with it: `fasttravel.tpaAccount` is now `fasttravel.tpaBusinessPath`, and `Charge` carries **no** currency (`lib/magic/Charge.ts`, grep). Heading + pointer left; the *grid coverage = network coverage* half (a grid as a TREE) is carried by the kept Part 4
- `## Capacitors as a storytelling primitive` body (504–518, 15) — code: `arcana/src/thing/ManaCell.ts` (`Slottable + Charged`, `Circulating`), the general-store row; doc: `magic-items.md § ChargedMixin's second consumer` (*a cell IS a charged shell, differing from a wand only in fitting a bay*), `fasttravel.md § The gate runs on mana`. Heading + pointer left; the narrative-tool rationale → Handoff (below)
- `# Open questions` Q1 *the endpoint clause* (547–549, 3) — resolved: the traveller is the caster (`arcane-library/.../Spell/teleport.yaml` AC5; `arcane-science.md § Control·Body and the terminal network`) and the exemption is locality (`§ The Postulate`, revised 2026-08-11). Struck + resolution left
- `# Open questions` Q2 *charge one fungible quantity, or typed by form?* (550–553, 4) — resolved: one quantity — a shell's tank and a caster's pool share the τ denominator (`Unit` `'pt'`), form is priced at the effect by `PriceList` (`magic-items.md § The denominator is τ`). Struck + resolution left

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none into my write list

### Superseded — cut
- `# Part 0 — ⚠ The correction that opened it` body (61–87, 27) — by the 2026-08-11 revision: the correction's mechanism (*storage obeys ordinary energy density*) rested on `τ = kJ`; now matter holds mana by **mana density** and a device's ceiling is *what you can source, refine and carry* (`arcane-science.md § The second quantity`, `§ The caster's budget`). The `Focus` cut + *Charged is the only powered class* are `magic-items.md § The mana potion is metabolic` (the ⚠ box). Heading + note left
- `# Part 1 — ⭐⭐⭐⭐ The governing principle` body (93–113, 21) — by `arcane-science.md § The second quantity` (*mana becomes energy; no amount of fuel becomes mana. There is no such thing as a mana generator*) and `§ The power level` (*you cannot build a mana plant; you can only own a mana deposit*). The slate's *"where does mana come from? wherever energy comes from — falling water, a furnace bank"* is exactly what the revision forbids. Heading + note left; the anti-deflation conclusion survives as the kept Guard 2 (rent-bearing, not manufacturable)
- `# Part 6 — the endpoint clause` body incl. `## RESOLVED — the traveler IS the caster` + `## On teleporting matter at all` (377–427, 51) — the resolution shipped (`FastTravel.ride()` quotes `MagicApi.relocationCost` on the traveller; `relocate` lands on `ctx.actor` only; `fasttravel.md § 2 · The TPA ride`), and the *"real amendment to a shipped document"* the second half asked for was made the other way round — the exemption is LOCALITY, so no widening to matter was needed (`arcane-science.md § The Postulate`, `§ Control·Body`; the doc's audit log names the design pack). Heading + note left

### Kept (UNBUILT)
- the status block (re-stamped) · the *Captured 2026-08-04* framing + user quote · *Related* · *Not related: compute*
- `## ⭐⭐ Guard 2 — rent: nodes are Ricardian land` — no node class, no inflow/stock node (grep `ManaNode`/`mana node`/`ambientMana` → 0); `ManaMain` *refills to capacity unless severed or closed* (`ManaMain.ts` docstring: *the mains is abundant by construction… where the city's line mana comes from is explicitly off-stage*)
- `## And Guard 1 is now citable` → the `PricedOffer` currency-gap paragraph (two-slates overlap with `supply-chain-slate § the offer layer has no currency`, which owns it)
- `## ⚠⚠⚠ The tension: a city-scale node breaks S*` + `### But the coupling already resolves it` — see Uncertain
- `# Part 3 — The stack` · `# Part 4 — Grid vs. cell is a GEOGRAPHY` (see Uncertain) · `# Part 6b` §§ framing, Axis 1, Axis 2, *The portfolio* — no terminus-condition or access-mode anywhere in code
- `# Open questions` Q3–Q6 — Q6: no `Drivable` composes `ChargedMixin`/`ManaPowered` (grep across `lib/slot/Drivable.ts` composers → none)

### Doctrine — kept, labelled
- `# Part 7 — What this does to the wood question` — a thesis about magic's economic role (*magic does not replace an industry; it relocates one*). ⚠ Its second bullet's reason — *"because mana is energy"* — is now false (see Uncertain); the conclusion (*the postulate moves the energy you have; it does not make more* — `arcane-science.md § The power level`) still holds

### Uncertain — kept
- `## ⚠⚠⚠ The tension` + `### But the coupling already resolves it` (248–293) — kept whole and **contradicted in part**: the section's premise *"a node has no reserve; charge requires a caster's reserve"* and its ⚠ open call *"whether anything may ever BE a reserve that is not a body"* are answered by canon — *mana can be held by matter* (`arcane-science.md § The second quantity`) and the general store sells charged cells whose provenance is *"deliberately a recipe and a price, not an economy"* (`magic-items.md § ChargedMixin's second consumer`). What the section correctly still holds open is the consequence it names: if a non-body reserve exists, `S* = inflow/d` needs the polity to govern `inflow` (quota/rent). Added to `Left` in that form. Requirements must read this against Guard 2 and the design pack's decision 3, not inherit *"items are charged by people, full stop"*
- `# Part 4 — Grid vs. cell is a GEOGRAPHY` — half shipped: the *cell vs line* dichotomy with a real price gap (`tpa.manaRate.cell 0.01` vs `.mains 0.002`; `fasttravel.md § The mana charge`) makes *on-grid is cheap, off-grid pays the premium* true per gate today; the *utility tree rooted at a source* and *extending the line* as a locality's act have no code (`ManaMain` is a per-room fixture named by `mainsRef`, not a network). Kept whole; `Left` keeps *distribution as a tree and the grid edge*
- `# Part 7` bullet 2 — *"mana does not lift that ceiling, because mana is energy"* contradicts `arcane-science.md § The second quantity`; the ceiling claim itself survives on the extractive footing (*a mana grid fed by waterwheels* is now impossible — fuel does not make mana; a grid fed by DEPOSITS is limited by the deposits). One bullet inside a doctrine section; kept
- `# Open questions` Q4 (*demurrage on a GRID or only on stored charge*) — `ManaMain` refills to capacity and has no standby draw of its own, cells decay via `Charge.standbyDraw`, so the shipped pair already behaves as the lean (*storage decays, flow does not*) — but there is no grid to apply a rate to, so the question is not answered in the shape asked. Kept
- Overlaps for the cluster pass (⚠ two documents on one design — NOT merged): Guard 2 / Part 6b's Axis 1–2 / Q3 / Q5 ↔ `mana-economy-design-pack.md` Part 3 (deposits are land), Part 4 (refinement), Part 5 (volume-tiered sale; the mana farm), Part 6 (the three vocations), Q1/Q3/Q6; the grid as a utility tree ↔ `delivery-slate` + `power-utility-slate` (the middle tier the pack's Part 5 defers to); the charger trade ↔ the pack's *mana refiner*; the vehicle ↔ `logistics-slate` (*a vehicle is a room that moves*)

### Handoff (belongs in a doc outside my list)
- → `magic-items.md § ChargedMixin's second consumer: the wall socket` (the why of the cell as a NARRATIVE tool, beside *where a charged cell comes from is deliberately a recipe and a price*), verbatim from the cut *Capacitors as a storytelling primitive*:

  > **User: "I think we're going to need capacitors right away even if we're
  > still pre-industrial, just as a narrative tool. It's like how cell phones
  > changed screenwriting — batteries change what stories people can tell in
  > an open world (see TPA again)."**
  >
  > ⭐ The analogy is exact. A battery **decouples power from place**, which is
  > what lets an author put a powered thing on the frontier *without lying about
  > it* — and the cost is a clock, which is the story. It also mints the
  > **dead battery**: a failure that is nobody's fault and is recoverable.

### Status block
- Left: *the SOURCE — sited mana nodes on the terminus-condition × access-mode grid (a `ManaMain` just refills today) · the CHARGER as a trade · distribution as a tree and the grid edge as an economic boundary · node title, rent and the first natural monopoly · whether nodes deplete · demurrage on flow vs storage · the magic vehicle (a charged `Drivable` priced against feed)* → the same seven **plus** *the reserve-that-is-not-a-body call (Part 2b — matter now holds mana by canon, so whether the polity governs a node's `inflow` by quota/rent must be decided deliberately) · the offer layer's currency (`PricedOffer.prices` is bare minor units — owned by supply-chain-slate)* (the body wins: both were in the body and unrepresented)
- Size: a build → a build

---

## docs/slates/builds/mana-economy-design-pack.md — 943 → 728 · Status PARTIAL → PARTIAL

A decision record whose SCIENCE half landed in `docs/arcane-science.md` on
2026-08-11 (the doc's own audit log names this pack) and whose BUILD half
has no code at all (batch finding 2). So the cuts are the science parts
(0, 1, 2, the two Decision subsections, 5c's teleport half, 8) and the two
paragraphs the TPA reform / magic-items build shipped; everything from
deposits to the Confluence stays, and `Left` roughly doubles because the
body's build items were under-represented.

### Cut (SHIPPED · DOCUMENTED)
- the second status block *"design + a DECISION RECORD… ⚠ arcane-science.md is NOT edited by this pack"* (11–22, 12) — history, and its ⚠ is false since the pack's own Part 8 recorded the edit as landed
- `## Part 0 — What this costs: numerically, nothing` body (56–74, 19) — doc: `arcane-science.md` audit entry (*no numbers changed, k = 1 kJ/τ*), `§ Units and quantities`, `§ The second quantity`; code/doc: `magic-items.md § The denominator is τ` (`Unit` `'pt'`; *no shipped number moved*, asserted by the four charge suites). Heading + pointer left
- `## Part 1 — Halloway was right. The field over-read him.` body (80–112, 33) — doc: `arcane-science.md § Halloway Equivalence` + `§ ⚠ And the field over-read it for a century` (`E = η·k·M`, the basin measures `k`, *it takes mana that did not come from a caster*). Heading + pointer left
- `## Part 2 — The two quantities` → the table + the two paragraphs (118–134, 17) — doc: `arcane-science.md § The second quantity` (every row). Heading + pointer left
- `### ⭐⭐ Decision 6 — nonlocality is ENERGY-ONLY` body (138–162, 25) — doc: `§ The second quantity` (*mana itself moves by contact, not nonlocally*; the ⚠ *two clauses point opposite ways* box; *mana density* and *mana conductivity* named as material properties). ⚠ the two **fields** on `Material` do not exist in code (`grep manaDensity|manaConductivity` → 0) — the build item is Part 7's table and is now in `Left`. Heading + pointer left
- `### ⭐⭐⭐ The corollary law: magic is good at ONCE and terrible at HELD` body (166–187, 22) — doc: `arcane-science.md § Kell's Partition` l.576–590 (*excellent at what happens ONCE and poor at what must be HELD; structure beats sustained assertion*). Heading + pointer left
- `## Part 3` → *"The anti-chug guard already ships"* (236–238, 3) — code: `potion-of-mana` is a `Potion` whose `mana-draught` is a meal chemistry riding the digestion buffer; doc: `magic-items.md § The mana potion is metabolic` (*recovers nothing on the tick and more than a control across the window*). Replaced by a 4-line pointer paragraph
- `### ⚠ What this does to "recovering is exercise" — mostly preserved` body (245–263, 19) — doc: `arcane-science.md § The caster's budget` (*CASTING is exercise*; the ⚠ *Revised 2026-08-11* box carries the stock/coupling split verbatim). Heading + pointer left
- `### Two utilities, not one` body (357–368, 12) — doc: `arcane-science.md § The power level, and why it is canon` (*You cannot build a mana plant. You can only own a mana deposit* — the industrialization argument replaced, as Part 8 asked). Heading + pointer left
- `## Part 5c` → the owner's call + *the apparent blocker* + `### The one exemption is LOCALITY` + `### The cost is SPECIFICATION` + `### What the fare depends on` + `### The vocabulary was already there: Control·Body` (622–696, 75) — code: `MagicLogic.relocationCostImpl` (mass incl. `getBorneBurden` × g × Δh; no distance term), `arcane-library/content/stuff/idea/magic/Spell/teleport.yaml` (`control`·`body`, `cost: 40` = the survey floor, `costModel: potential`, `relocate` on `ctx.actor` only — AC5), `FastTravel.ride()`; doc: `fasttravel.md § ⭐ What the TPA reform changed`, `arcane-science.md § The Postulate` (revised: LOCALITY; *magic never creates matter* survives as an affordability argument), `§ Control·Body and the terminal network` (✅ IMPLEMENTED box; the surveyed-destination rationale; the fare table altitude/mass/no-distance; *you can only teleport yourself*). One pointer paragraph left under the heading
- `### The general category: devices that hold effects` → the impulse/binding table + *TPA is an impulse device… chosen on throughput* + *Going offline is already half-built* (708–724, 17) — code: `arcana/src/lib/ManaPowered.ts:79` `DrawMode`, `resolveSupply`, `TpaTerminal.getStatus()` derived; doc: `fasttravel.md § The gate runs on mana`, `§ The three supplies`, `§ The arming floor` (`drawMode` is a separate fact from the floor), `§ The condition, and why there are two reads`, `§ Terminus` (line-fed city gates, cell-fed frontier). Replaced by an 8-line note that also records the **unbuilt** half (nothing reads `'binding'`; no per-second draw; no lapse). The section's first paragraph (*a device does not cast; it sustains a binding a caster established*) is KEPT
- `## Part 8 — ✅ What the edit to arcane-science.md touched` → the ✅ box + the scope table + fix 1 (799–828, 30) — every row verified in `arcane-science.md`: the Postulate (l.139 revised box), the thirteen nouns / Control·Body (l.851), the specification problem (l.837), *magic never creates matter* (l.644–647 of the pack → `§ The Postulate`), Kell's corollary (l.580), Halloway reinterpreted (l.518), units (l.271), the caster's budget (l.302), the power level (l.379), the audit log (l.40). Fix 1: `power-utility-slate.md § ⭐ Generation — DECIDED: Terminus runs on hydro` (*Recorded 2026-08-11*). Heading + note left; fix 2 (the Confluence in `terminus-city.md`) is KEPT — see Uncertain

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none into my write list (the one candidate — the home paragraph's *a resident is a sufficient battery* — is mixed with the unbuilt binding rule, so it is kept in the slate AND handed off; see Handoff)

### Superseded — cut
- none. ⚠ Two statements in KEPT paragraphs are stale (see Uncertain); neither section was cut

### Kept (UNBUILT)
- the status block (re-stamped) · *See also* · `## The decisions on record` (the pack's spine — decisions 1, 2, 3, 4, 6 are canon in `arcane-science.md`; 5 and 7 (refinement, partition) appear nowhere in code or doc; kept whole as the record requirements reads)
- `## Part 3` → the two-sources list · the banana question · the three consequences (soil reserve · husbandry-as-extraction · the `mana` meal tag — the shipped potion feeds coupled recovery via `water`/`sugar`/`carb`, NOT a `mana` tag; `SoilMixin` has no mana reserve) · *Recovery rate depends on WHERE YOU ARE* (canon in `arcane-science.md` l.302–306, but `lib/magic/Caster.ts` recovery is serenity-banded and reads no place — grep `ambient|biome|locality` → 0)
- `## Part 4 — Refinement` whole (the chain, Decision 7 partition, the 2×2) — no refining transform, no `Grade` on a mana material
- `## Part 5` → *the mana industry is MUNDANE* · *How it is sold: volume-tiered* · *The arbitrage floor* · *The dam and the refinery* · *The mana farm* (all four subsections) — no bulk mana material, no contract or pipe for it
- `## Part 5b` whole (see Uncertain) · `## Part 5c` → the first paragraph of *devices that hold effects* + `### What this means for a home` (mixed; see Handoff) · `## Part 6` (vocations.md: prospector *shipped* for metal — l.125; mana refiner *designed*, pointing at this pack — l.135; no assayer row) · `## Part 7 — Designed to the format` whole (see Uncertain) · `## Part 8` fix 2 · `## Part 9 — Dangers` · `## Open questions` Q1–Q8 (Q3's ✅ is a DESIGN answer — the soil reserve is unbuilt — so it is not cut)

### Doctrine — kept, labelled
- `## Part 10 — Pedagogy` — the teaching argument for the whole pack; no backlog item, nothing shipped. Home is the coordinator's call (`arcane-science.md`'s course table at l.75 already carries the *conserved quantities and coupling constants* row)
- `## Part 5` → `### The consequence that shapes everything: the mana industry is MUNDANE` — a thesis (*mages are CUSTOMERS, not producers*; the spice model) that follows from decision 6; kept under UNBUILT above because the industry it describes is unbuilt, flagged here as doctrine too

### Uncertain — kept
- `## Part 5b` → *"⚠ The hydro decision is NOT in the corpus — power-utility-slate still lists 'who owns supply?' as genuinely open"* (517–520) — now false: `power-utility-slate.md § Generation — DECIDED` records it (the pack's own Part 8 fix 1 says so). Inside the canon paragraph; paragraph rule
- `## Part 5b` as a whole vs `arcane-science.md` l.305 — the science doc ALREADY says *"Terminus, whose Confluence vents into the air, is a rich place to recover"*, i.e. the Confluence-as-source and the fog-as-venting are canon in one shipped doc while `terminus-city.md` (grep `mana` → 0) still lacks them. `Left` keeps *the Confluence in Terminus canon* for the staging doc; requirements should know half the dependency inversion Part 8 fix 2 worries about has already happened
- `## Part 8` fix 2 → *"for the same reason arcane-science.md is untouched"* — stale (it was edited); one sentence inside the kept item
- `## Part 7 — Designed to the format` table — three rows shipped and are not struck (a table is one paragraph): *The coupling — ConduitMixin already IS this* (shipped: `MagicApi.transferCharge`, `magic-items.md § Recharging`); *Device mana reservoirs* — the impulse/battery half shipped as `ManaPoweredMixin`, the binding/wired half did not; *TPA retrofit* — shipped whole (`fasttravel.md`). The other eleven rows have no code. Also `**7. Fault line**`'s *"the unit-semantics change… is a near-term slice"* is done (the unit change landed; magic water did not)
- `## Part 3` → *"Ingestion is one more meal tag… A `mana` tag routing to the mana reserve rides the same seam"* — the shipped potion took a different road (meal chemistry feeding coupled recovery, with `adjust-reserve` on `mana` REFUSED at authoring — `magic-items.md § The mana potion is metabolic`). Whether a `mana` meal tag is still wanted, or the coupled-recovery route IS the design, is for requirements; kept in `Left` as written
- Overlaps for the cluster pass (⚠ two documents on one design — NOT merged): Part 3 deposits / Part 5 tiers / Part 6 vocations / Q1, Q3, Q6 ↔ `mana-economy-slate` Guard 2, Part 3, Part 4, Part 6b, its Q3–Q5; the piped tier ↔ `power-utility-slate` / `supply-design-pack` (*mana becomes its third commodity*); the mana farm ↔ `smallholding.md` / `farmstead`; the Confluence ↔ `terminus-city.md` staging + `fast-travel-slate` (Terminus is the hub)

### Handoff (belongs in a doc outside my list)
- → `magic-items.md § ChargedMixin's second consumer: the wall socket` (beside the dorm-room sconce sentence — the WHY a home has no line, shipped as the lamp row's *D5's third row: a resident is a sufficient battery*, `arcana/content/system/arcana/thing/mana-lamp.yaml` header, and documented nowhere — `grep -i resident docs/subsystems/magic-items.md` → 0), verbatim from the kept `### What this means for a home`; the second paragraph is the UNBUILT binding rule and should be marked so if inserted:

  > **Domestic devices are IMPULSE devices** — a lock that opens, a lamp you
  > light, a hearth that kindles. Small per-use costs, topped up **by contact
  > from the resident's own pool** (`ConduitMixin` doing exactly its job). So a
  > home needs **no mana connection at all**, and the reason is not "homes do not
  > use magic" but **"homes use impulses, and a resident is a sufficient
  > battery."**
  >
  > **Binding devices need a real supply**, and those are institutional — a
  > permanent ward is a guild's problem, never a homeowner's.

- → `magic-items.md § ChargedMixin's second consumer` (or `fasttravel.md § The gate runs on mana` if the coordinator prefers — it is the *impulse ⇒ battery-shaped* rationale the `DrawMode` docstring states in one line), verbatim from the cut *devices that hold effects* table paragraph, in case the doc wants the Kell derivation rather than just the fact:

  > ⭐⭐⭐⭐ **And impulse-vs-binding IS the battery-vs-wired distinction** — the two
  > supply shapes are not arbitrary, they follow from Kell:
  >
  > | Device kind | Draw | Supply |
  > |---|---|---|
  > | **Impulse** — fires, then the world takes over (a teleport, a trap's firebolt) | **per use** | a **battery**: a charge replaced or recharged |
  > | **Binding** — a state held from equilibrium (a ward, a held glowlight, a climate vault) | **per second** | a **wired connection**: continuous supply |
  >
  > **TPA is an impulse device**, so it is battery-shaped by nature — and a busy
  > city terminal has enough throughput to justify a wire while a frontier terminal
  > does not. **Same device, different supply, chosen on throughput**: the
  > industrial-gas tiering from Part 5, unchanged.

### Status block
- Left: *mana deposits + prospecting/refining · magic water as a traded bulk good · the piped-mana utility tier · the Confluence in Terminus canon · the three vocations* → *the two Material fields (mana density · mana conductivity — canon in arcane-science.md, no field on `Material` yet) · mana deposits + prospecting/refining (partition + volatility, purity as a `Grade`) · ambient mana density of place driving recovery · the soil mana reserve + the `mana` meal tag · magic water / the mana crystal as traded bulk goods · the volume-tiered sale (bulk contract · the piped-mana utility tier) · the mana farm · the Confluence in Terminus canon · the three vocations · binding devices (a per-second draw that lapses when the reservoir runs dry — `'binding'` is declared on `DrawMode`, nothing reads it)* (the body wins: Part 7's table had nine unrepresented rows)
- Size: a build → a build

---

## Totals

| slate | lines | Status | Left items | Size |
|---|---|---|---|---|
| `tails/fast-travel-slate.md` | 280 → 159 | PARTIAL → PARTIAL | 5 → 5 | a wave → a wave |
| `builds/mana-economy-slate.md` | 570 → 401 | PARTIAL → PARTIAL | 7 → 9 | a build → a build |
| `builds/mana-economy-design-pack.md` | 943 → 728 | PARTIAL → PARTIAL | 5 → 10 | a build → a build |

Cuts: 31 entries SHIPPED·DOCUMENTED · 1 graduated (→ `fasttravel.md`, +12 lines) · 7 superseded · 0 ABSORBED · 15 Uncertain entries · 3 handoff paragraphs (2 → `magic-items.md`, 1 that could go either way). ⓘ Two kept headings were shortened when their body was cut and replaced by a pointer — `### ⚠ What this does to "recovering is exercise" — mostly preserved` → `### What this does to "recovering is exercise"` (design pack) and the two mana-economy-slate Part 2b headings → `## The equilibrium is an equation — shipped` / `## The fourth guard — shipped` — so a heading grep of the diff shows them as deleted; their bodies are accounted for above.

Hardest calls:
1. Cutting the mana-economy-slate's Part 1 (*mana IS energy*) as SUPERSEDED. It is the slate's title thesis, but `arcane-science.md § The second quantity` says the opposite in so many words and is the doc of record; leaving it would have requirements inherit a falsified premise. The anti-deflation conclusion it was for survives as Guard 2, which is kept.
2. Keeping the mana-economy-slate's *"But the coupling already resolves it"* (the caster-only cap) despite canon now saying matter holds mana — kept whole under Uncertain because the *consequence* it names (the polity must govern `inflow`) is the live design, and cutting the premise would have lost the consequence.
3. The design pack's *devices that hold effects*: `DrawMode` declares `binding` but nothing exercises it. Split at the paragraph — the shipped table + throughput paragraph cut, the binding-lapses paragraph and the home paragraph kept — rather than calling the whole section shipped on the strength of a type union.
4. Classifying the `scheduled`/`cycle` advance modes as shipped when no row authors one. The mechanism is in `FastTravel.ts` and `fasttravel.md § Timetable & advance policy`; content not using it is the locality's business, not a backlog item — but the ledger and the pointer both say so.
