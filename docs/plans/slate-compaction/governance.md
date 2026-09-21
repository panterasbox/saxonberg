# Slate-compaction pass — governance batch ledger

One slate. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `governance.md`
(needed **no inserts** — see finding 1). Line numbers below are the
ORIGINAL file's. Original saved under the scratch dir `governance/orig/`
for diffing. Code was verified in `packages/server/src/mud/**`,
`packages/server/src/schema/*.yaml` and `packages/content/platform/**`;
the docs read against were `governance.md`, `civics.md`, `access.md`,
`influence.md`, `participation.md`, `renown.md`, `forums.md`, `press.md`,
`chat.md`, `banking.md`, `parcel.md`, `docs/governance/draft-constitution.md`,
`docs/governance/founding-charter.md`, `docs/polity-decision-register.md`,
and the sibling slates `legal-code`, `record-integrity`,
`amendment-library`, `argument-map`, `economy`, `auth-providers`.

Five things a reviewer should know first:

1. **Nothing graduated into `governance.md`.** The Office substrate is
   the only governance code and `governance.md` already carries every
   decision the slate made about it (founder default by credential, the
   sparse handoff, `requiresFoundingAuthority`, the Governor as first
   consumer, the PM's seat-held title + `world:` grant). The slate's
   office-shaped sections are pointers now. Two SHIPPED · UNDOCUMENTED
   *whys* surfaced, both homed outside my list → **Handoff** (the no-pool
   rationale → `influence.md`; the `engagement × renown` product rationale
   → `participation.md`, which today cites the slate for it).
2. **The coordinator's ruling — a section the draft constitution
   restates is SHIPPED · DOCUMENTED with the constitution as the doc —
   accounts for most of the cut.** Every such cut names the Article. The
   constitution's own preamble says *"the slate carries the rationale;
   the constitution carries the provisions"*; where a rationale paragraph
   was the only home of a *thesis* (not the justification of one
   provision) it was kept and labelled Doctrine.
3. ⚠ **The draft constitution's Art. IV §2 is stale against the code**, and
   the slate is where that fact was recorded. `hold` is full weight / no
   pool (`ConvictionLogic.tally`, `influence.md § Conviction`, an
   entrenched invariant); Art. IV §2 still describes *"a capped,
   regenerating reservoir with continuous allocation"*, and the Schedule
   still lists `influence.cap_curve` / `influence.regen_rate`. Not my
   remit (the constitution is outside my list) → **Handoff**. The
   legal-code slate has already re-derived Art. IV §4 (bills lapse by
   time, not starvation; sponsorship gates on eligibility) — the
   cooperative slate's bill-lifecycle paragraph is Superseded by it.
4. **The `Left` list was mostly true on arrival but too coarse.** It grows
   from 6 items to 15: the body carried the flip notice, the synthetic
   constituents, the argument-map's scale work, the caretaker/deputy
   distinction, the PM-confidence-as-open-target mechanic, the
   institution roster, the recusal graph + population ladder, the
   percentile-band fix, and the NPC market floor — none represented.
   *Twitch identity binding* is **removed** from `Left`: Twitch is a
   co-equal login provider with account linking (`auth-providers-slate`
   Waves 1+2, `connection.md`, `TwitchProfile.ts`); what remains is the
   dono/sub **webhook** + the stake ledger it feeds, and `Left` says so.
5. **The NPC market-floor design lives only here.** The slate's own *Open
   problems* says the NPC-offer mediocrity margin *"moved to the economy
   slate"* — it did not (`economy-slate.md § NPCs are both bootstrap
   scaffold and disengagement backstop` has the role-slot framing, no
   *deliberately mediocre counterparty* rule). Kept, flagged for the
   cluster pass.

---

## docs/slates/builds/cooperative-slate.md — 3060 → 2025 · Status PARTIAL → PARTIAL

**Every one of the 113 headings survives**; cuts are of section *bodies*,
each replaced by a one-line pointer, because outside documents cite the
headings (`founding-charter.md` → *§ Founding vs. amendment*,
`polity-decision-register.md` → *§ Institutions are private actors* +
*§ How territory is held*, `participation.md` → the consumer thesis,
`governance.md` → the slate at large). The code that decided every class
below: `lib/governance/Office.ts` + `OfficeHolder.ts` +
`platform/idea/OfficeRegistry.ts` + `api/compact.ts` +
`cmd/governance/office.yaml` (the Office substrate);
`lib/standing/{Position,ConvictionTally,InfluenceStanding,ProducerEvent,
ParticipationEvent,RenownStanding}.ts` + `platform/idea/api/{Conviction,
Producer,Consumer}Logic.ts` (the influence substrate — `positions`,
`producer_events`, `participation_events`, `renown_events` in
`src/schema/`); `lib/forum/Board.ts` (`organizer: 'ordered'`) +
`ForumsLogic.readArgumentLens` (the argument-map); `AccessRegistry.
holdsPrimeMinister` (the PM backstop); `cmd/banking/reserve.yaml`
(`requiresGovernor`); `BankingLogic.remitDemoTaxImpl` (the only tax —
no appropriation path). **Found nothing** for: delegation / `follow` /
`affirmedAt`; a ballot, passage or chamber population; a capital faucet,
stake ledger or dono/sub webhook (`'capital'` is a reserved zero in
`api/influence.ts:60`); a jury, sortition or hash chain; a flip notice;
a caretaker/deputy distinction; polling; a floor-bot (`chat.md:121`
lists `'ordered'` recognized-speaker channels as *deferred*); a
locality/group treasury beyond the municipal budget account.

### Cut (SHIPPED · DOCUMENTED)
- the stale second status block *"model settled, build the stake-ledger slice…"* (11–29, 19) — history; the canonical block is re-stamped below, the *Consolidation* pointer block is kept
- `### Law 1 — Stake is not stock` → the provision, the no-lawyer why and the gets/never-gets bullets (190–202, 13) — doc: [draft constitution] Art. I §1, Art. VIII §2; the preamble's three-floor test carries *"can you operate this without a lawyer"*. The wording-discipline paragraph + closing quote (204–210) KEPT (doctrine)
- `## Influence` intro *"assigned to a member and spent via voting"* (243–244, 2) — stale under no-pool; replaced by a pointer covering the three cut subsections
- `### Three types, one per chamber, non-fungible` (247–273, 27) — code: `InfluenceStanding.stock ∈ consumer|producer|capital`, `ConvictionLogic.tally` partitioned by `stock` (three houses tally independently); doc: `influence.md § The three-stock output contract`, `§ Conviction` (*non-fungible* named as an entrenched invariant); Art. III §§1–2
- `### Three kinds of contribution` (275–315, 41) — code: `ProducerLogic` (engagement-only draw, `A≠P` self-credit exclusion), `ConsumerLogic.standingOf` (`engagement × renown`); doc: `influence.md § The producer stock`, `participation.md`; the *code measures the measurable, humans judge the unmeasurable* split is Art. III §7
- `### The faucets are decayed accumulators with hard rate caps` (472–485, 14) — code: `ParticipationEvent` find-or-skip `{subject, bucket}`, `RenownStanding` `receptionValence × ln(1 + Σ)`, `ProducerEvent` `{author, actor, bucket}`; doc: `participation.md` l.62, `renown.md` l.151, `influence.md § The producer stock` (*anti-inflation*) + *standing is a rate, not a total* (`influence.md § The formula: sum`)
- `### Two merit channels` → the producer merit-pay bullet + its four sub-bullets (606–626, 21) — doc: Art. III §7 restates it item for item (producer only · minted and capped by the legislature · evaluated by competence · recusal · sub-decisive · public rationale · justiciable). ⚠ Unbuilt — cut under the constitution ruling, and named in `Left`. The consumer bullet (594–604) KEPT (see Uncertain); *Why the producer bank isn't a power-pump* + the asymmetry summary KEPT
- `## The legislature — three co-equal chambers` body (647–684, 38) — doc: Art. IV §§1–3 (co-equal houses, majority of houses, one central floor, no originating house, per-house splittable voting); code: `positions` rows keyed `{subject, stock, target}` — a member's three stocks on one target are three rows
- `### Near-empty chambers — abstain, full-count, fall back` (688–720, 33) — doc: Art. IV §3 (a house below `vote.quorum` abstains; passage against the full count; sub-viability → the caretaker floor) + Art. XI / `founding-charter.md` (the self-binding completion). Code: `ConvictionApi.abstain` is the position-level abstain only; house-level abstention has no code — carried by the constitution
- `### The constitution is thin — but the voting system is kernel` (724–742, 19) — doc: Art. III §4, Art. IV §§6–7
- `## Pay-to-win` → the three provision paragraphs + the bidirectional-membrane bullets (1165–1183, 19) — doc: Art. I §2, Art. VIII §1. `### A hill, not a wall` KEPT (doctrine)
- `### Deliberation is an argument-map, not a forum` → the intro + *No ranking to game* + *Reading at scale is by structure + your delegation graph* (1361–1372, 1381–1386; 18) — code: `lib/forum/Board.ts` (`organizer: 'ordered'`, `legalRelationsFor`), `ForumsLogic.readArgumentLens` / `attachClaim` / `matureArgument`, `ForumSubscriptionRegistry.resolveCircle` (`inCircle`); doc: `forums.md § The argument organizer` (typed claim-graph · neutral default lens · open objection · delegated attention · reputation-blind). *Version-controlled proposals* + *Convergence-detection* KEPT (deferred there, owned by `argument-map-slate`)
- `### The load-bearing principle: ungameable organization` (1480–1490, 11) — doc: `forums.md § The argument organizer` quotes the principle *"from the cooperative slate"* verbatim; *no number is an authority* is Art. I §4
- `### Deliberate as equals, vote by weight` (1494–1498, 5) — doc: Art. III §5; code: claims are never vote-seeded, the tally is standing-weighted
- `### Reputation intersects the edges, never the structure` → the intro, the *Attention* + *The vote* bullets, and the closing *safe arrow* paragraph (1502–1514, 1521–1527; 20) — doc: Art. III §6 (*reputation → bounded weight, never → authority*); code: `inCircle` highlight (`forums.md § Delegated attention` — *"you delegate attention, not votes"*), `ConsumerLogic` product. *Moderation* + *Alignment* bullets KEPT
- `## Branches & separation of powers` intro (1545–1567, 23) — doc: Art. V §§1, 4
- `### The executive — a government, not a management` (1571–1582, 12) — doc: Art. V §§2–3
- `### How the prime minister is chosen` (1586–1629, 44) — doc: Art. V §§1–2 (confidence = majority of chambers; investiture; constructive no-confidence; optional term limit), Art. VII §2 (the count is universally verifiable), Art. XI; code: the founder as default holder → `governance.md § The founder default`. The cooldown stays in *Open problems → PM selection*
- `### Code-first enforcement` → the five-bullet split (1784–1805, 22) — doc: Art. IV §5, Art. V §§6–7, Art. VI §2, Art. VII. The surveillance thesis paragraphs KEPT (doctrine)
- `### The judiciary — verification and spirit` → the first paragraph + the two-competence bullets (1819–1832, 14) — doc: Art. VI §2. The dual-key / *gate, not a complaints desk* paragraph KEPT (see Uncertain)
- `### One process, two knobs — the streamer is the pool of one` (1847–1869, 23) — doc: Art. VI §§1, 3, 5 (one async process; jury pool + bindingness the only knobs; due process widens the pool and removes the override)
- `### How the judiciary is staffed` → the intro + the *Spirit-judgment → sortition* bullet (1873–1890, 18) and *The integrity branch runs the draws* (1905–1908, 4) — doc: Art. VI §4 (egalitarian; flat sortition past a tenure threshold), Art. XIII (intent from the archived record), Art. VII §2 (verifiable draws). The *Verification → sortition within the qualified* bullet (the track-record competence pool + Law-2 decay — design the constitution abstracts to *"competence-measured"*) and *Watching the watchmen* (the bootstrap ladder) KEPT
- `### Trials — async-first, sync-optional` (1921–1975, 55) — doc: Art. VI §1 (async case; verdict by deadline; no-show → judgment on the record; live hearing optional) + the Schedule (`judiciary.overdraw_factor` / `filing_window` / `verdict_deadline`)
- `### Abatement — taking live content offline` body (1979–2021, 43) — doc: Art. VI §7 restates it whole (presumption · burden on the challenger · cure order + `abatement.cure_window` · fault → clawback vs no-fault → decay · never for unpopularity). **Open work** (2023–2036) KEPT
- `### The cross-branch membrane` (2211–2219, 9) — doc: Art. III §2 (*nor into office in any branch*)
- `### The record — integrity by construction` incl. the 2026-07-31 box (2237–2322, 86) — doc: Art. VII §§1–5 (operated by the executive, integrity by construction; universally verifiable; no act on a falsified record; detectable not impossible); the build design + all four findings are `record-integrity-slate.md` (l.40 *theater*, l.54/71 *self-audit + the roll*, l.128 *our box*, l.174 *never the law*). Code: none — every ledger append-only by convention
- `## The money membrane` intro (2334–2339, 6) — doc: Art. VIII §1
- `### The budget — real dollars` (2343–2365, 23) — doc: Art. VIII §§1–2 (wages outward, never a return to backers). The bookkeeping/tax note survives in *Open problems*
- `### The reserve — a game mechanic` (2369–2377, 9) — doc: Art. VIII §§1, 3
- `### The reserve as central bank` → *The in-world fiscal cycle is code-executed end to end* (2412–2428, 17) — doc: Art. VIII §4 + Art. V §9; code today: `BankingLogic.remitDemoTaxImpl` — a seller-side demo sales tax into a placeholder treasury with **no appropriation path** (`banking.md § Tabs, wages, demo tax`). The toolkit paragraph (mint ✓ — `reserve mint` behind `requiresGovernor`; drain / seed / bounties ✗) and the two disciplines KEPT (see Uncertain)
- `### Institutions are private actors, not a tier of government` (2511–2543, 33) — doc: `civics.md` premise (*the Compact… is singular; diegetic governments are content… No tier of the fiction's hierarchy is the Compact's face*), `polity-decision-register.md` Tier 1 (sourced from this section); code: standing keys on the person's identity path (`influence.md § Durable identity`) — *influence individuates*. ⚠ The `ownerGroup / accessGroups` reference was already superseded by parcel title
- `### How territory is held — the tenure floor` (2547–2589, 43) — doc: `polity-decision-register.md` Tier 1 § Resource & territory carries all five bullets nearly verbatim (authority = protection not exclusivity; functional never territorial executive; kernel floor / module dial; the UN layer at Tier 3); code: title with no operator override → `access.md § Nearest title decides`, `parcel.md`
- `### The authorial subdivision` → the *One guard on the producer metric* paragraph (2606–2612, 7) — code: `ProducerEvent` engagement-only, deduped `{author, actor, bucket}` (a spammed empty room draws nobody and credits nothing); doc: `influence.md § The producer stock`. Second-order quality is register D2, open
- `## Amendment & entrenchment` intro + the four tiers (2735–2762, 28) — doc: Art. X §§1–3
- `### Amendment is ratified by equals` (2766–2774, 9) — doc: Art. X §2
- `### Fork is the amendment of last resort` (2778–2788, 11) — doc: Art. X §4, Art. VII §5
- `### Founding vs. amendment — the founder's self-binding` (2792–2817, 26) — doc: Art. XI + `founding-charter.md § Why bind at all` / `§ The formula` (formula-fixed · code-enforced · published · auto-sunset → wage-only; ships with the stake ledger). ⚠ The charter's *See also* cites this heading for *"the rationale"*; the heading stays, the pointer sends readers to the charter's own *Why bind at all*, which carries it
- `### The kernel and the library — amendments as political legos` (2830–2845, 16) — doc: `amendment-library-slate.md` (its framing paragraph is this section) + the constitution's three-floor test
- `## Open problems` → *The surplus bedrock — confirm and entrench* (2879–2882, 4) — resolved: Art. VIII §2, eternity by Art. X §3
- `## Open problems` → *Origination — resolved: none* (3041–3046, 6) — Art. IV §3
- `## Open problems` → *Who adjudicates producer influence?* (3047–3049, 3) — *"the founder does it now"* is false: `ProducerLogic` measures draw (`influence.md § The producer stock`); the human layer is the merit-pay exception (Art. III §7), unbuilt

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none into `governance.md`. Two undocumented *whys* belong to docs outside my list → Handoff

### Superseded — cut
- `### Law 2 — Power is earned and spent, never owned` body (214–237, 24) — by the code: there is no spend — `hold` is full weight, no pool, and *"voting consumes influence"* / *"refill"* describe a mechanic that does not exist (`influence.md § Conviction`; `ConvictionLogic.tally` never consults a holder's other targets). The law itself is Art. I §3 / Art. III §3 (*absence is never penalized; only the faucet stops*). Note left
- `### Two markers: a stock and a flow` (318–351, 34) — by no-pool: no reservoir cap, no regeneration rate to attach to (the slate's own RESOLVED section says so). Where the markers landed (honor → chronicle, voice → standing) is `#### The markers survive by splitting`, KEPT
- `### One resource, not two — continuity lives in the voting rule` (355–410, 56) — by the code + Art. III §4: the conversion rule shipped as the kernel's uniform conviction ramp (`conviction.buildPeriodSeconds`), no use-it-or-lose-it, no chamber-set rule; representation-not-rule as the chamber's layer is Art. IV §6; term limits on offices only is Art. V §2
- `### RESOLVED (2026-07-31): the kernel's conviction rule shipped — no pool` body (414–437, 24) — the record of a shipped decision (`influence.md § Conviction`, an entrenched invariant). Its two live facts are carried forward: the Art. IV §2 staleness (in the pointer + Handoff) and the no-pool *why* (Handoff → `influence.md`, verbatim below)
- `### Delegation is already built — it's allocation pointed at a person` (775–800, 26) — by `## Delegation, re-derived for no-pool` (the section's own ⚠ box says so; its surviving conclusions are restated there)
- `### Caucuses` → *And bills don't live forever* (1416–1430, 15) — by `legal-code-slate.md § The passage rule — RESOLVED` (l.1378–1417): under no-pool bills lapse by time, not starvation; sponsorship gates on eligibility, not allocation. The Art. IV §4 clause it restated is itself under revision there. Note left
- `## Founder control — transient lock, permanent check` (2698–2729, 32) — by `founding-charter.md`: the *~51% of Capital* baseline became the published formula (sole producer · 0% consumer · capital matched **plus one** · sunsets at ratification); *codify the structure, not the founder* + natural dilution are Art. XI; co-equality Art. I §5. *Devolve by seating people, not a clock* survives as Art. XI's *population-based, not date-based* threshold
- `## Open problems` → *One-time = spendable burst, or cap+honor only?* (2883–2886, 4) — by no-pool: a lump credits once, spikes, decays, and is honored in the chronicle (`#### The markers survive by splitting`)
- `## Open problems` → *Voting rule per chamber* (2892–2897, 6) — by Art. III §4 (kernel, uniform — the bullet still said *chamber-internal*) + the shipped conviction rule

### Kept (UNBUILT)
- the canonical status block (re-stamped) · the *Consolidation* block · the framing paragraph · *See also* (nothing removed — every link is to another doc)
- `#### The markers survive by splitting, not by merging` (honor → chronicle needs the capital faucet that does not exist)
- `## Standing inflation` → intro · `### And passage is scale-invariant anyway` (`support = tally / totalStanding(stock)` — no passage code; `quorumWeight` exists, no denominator) · `### Where the exposure is actually real` (1 the percentile-band fix — `influence.bandThresholds` IS stock-agnostic fixed cutoffs in `AppSettings`, the exposure is live; 2 the top-decile share query; 3 capital uncapped) · `### The capital faucet that falls out of symmetry` (credit per patron per bucket — nothing writes `'capital'`)
- `### Two merit channels` → *Why the producer bank isn't a power-pump* + the asymmetry/placement paragraph
- `## Parties & delegation` → `### Parties are delegation brands` · `### The two real dangers` (see Uncertain) · `### The design stance`
- `## Delegation, re-derived for no-pool` — all seven subsections (no `follow`, no `{subject, stock, delegate, since, affirmedAt}` collection, no `effectiveRealSince` anywhere)
- `## Synthetic constituents` — all subsections (`GroupRef` exists — `grouping.md`; a `Position` row for a group does not)
- `## Surfacing — the flip notice and the ticker` — all subsections (see Uncertain for the ticker half)
- `## Pay-to-win` → `### A hill, not a wall` (doctrine) — the generality requirement is `legal-code-slate` territory
- `## Deliberation` → `### Three surfaces, three jobs` (see Uncertain) · `### Deliberation is an argument-map` → *Version-controlled proposals* + *Convergence-detection* · `### Caucuses` (minus the lifecycle paragraph; a group-scoped argument board is expressible over the Subject audience, the caucus-recommends-never-binds rule needs delegation) · `### Synchronous deliberation` (`chat.md:121`: the `'ordered'` recognized-speaker channel is deferred; no floor-bot) · `### Reputation intersects` → *Moderation* + *Alignment* · `### The cross-slate seam` (polling has no code)
- `## Branches` → `### Confidence, expressed in the shipped substrate` (a permanently open constructive-no-confidence target, rival successors in parallel, first to cross wins — a design over `positions`, no ballot) · `### Succession` (see Uncertain) · `### The deputy` · `### "Running mates"` · `### Elections are a lego` (overlap: `amendment-library-slate`) · `### One consistency worth noting` (see Uncertain) · `### Institutions, not hierarchies` (the roster is *Open problems*) · `### Code-first enforcement` → the thesis paragraphs (doctrine) · `### The judiciary` → the dual-key paragraph (see Uncertain) · `### How the judiciary is staffed` → the verification pool + *Watching the watchmen* · `### Abatement` → **Open work** (see Uncertain) · `### Advocacy` (explicitly not founding text; overlap: `amendment-library-slate`) · `### Rule-of-law enforcement` (doctrine) · `### Moderation is the on-ramp` (doctrine) · `### The gotcha` ((identity, matter) recusal — no recusal code anywhere) · `### Separation that scales with population` · `### The root-power floor` (doctrine)
- `## The money membrane` → the *See also* box (land-compute-and-license)
- `## Bootstrapping the economy` → intro · `### The reserve as central bank` (the toolkit + the two disciplines — see Uncertain) · `### Genesis` · `### The NPC market floor` · `### Bootstrap → evolution` (see finding 5) · `### Capital pools; influence individuates` (see Uncertain) · `### The authorial subdivision` → the first paragraph (see Uncertain) · `### The consumer fault line` (whole — see Uncertain + Handoff)
- `## Employment & economic engagement` — already a pointer stub to the economy slate; spine
- `## Amendment & entrenchment` → `### Where it lives` (see Uncertain)
- `## Buildable now — the stake-ledger slice (v1)` (see Uncertain)
- `## Open problems` — every bullet not listed under Cut/Superseded above (18 of 23), incl. the ones marked *resolved in shape* that still carry an open tuning tail

### Doctrine — kept, labelled (for the coordinator's one-pass home decision)
- `## Why this shape — native-digital governance` + `### Affordances this polity has` + `### What does not dissolve` + `### The reframe: a polity is content, not overhead` — the thesis (artifact vs protective function; Sybil floor = the funding model; a polity is the payload). Candidate home: `docs/design-philosophy.md` or a `governance.md § Why`
- `## The two laws` intro + the Law 1 wording discipline (*never write investor / share / equity / return / dividend*) — an operator rule with no other home
- `### The franchise is the deepest power — and who holds it` (who measures the contribution that becomes the votes; box it from three sides)
- `## Parties & delegation` intro (elections stripped out ⇒ parties lose their function) + `### Parties are delegation brands` + `### The design stance`
- `### A hill, not a wall — and the hill *is* the game` (the friction stack IS the political gameplay)
- `## Engagement — the substrate every guardrail rests on` (whole, incl. the 2026-07-31 correction box — *delegation relieves you of attention, not of presence*; standing decays with inactivity is shipped, `participation.md`)
- `## Deliberation` intro (Robert's Rules rations a serial floor the medium lacks)
- `### Code-first enforcement` → the surveillance thesis (*a blueprint for legitimate surveillance*)
- `### Rule-of-law enforcement — the mudcopping fix` (fusion → wiz abuse; the independent-prosecutor lean is Art. V §5)
- `### Moderation is the on-ramp` (the adoption path; *the rules take the heat, not the person*)
- `### Institutions, not hierarchies` → the first three paragraphs (*institution-building IS the founder dilutes safely*; same-pool labor)
- `### The root-power floor` (make picking up the gun a visible coup; Art. VII §5 / XII carry the consequence half)
- `### Separation that scales with population` → the governing property (*never fails closed or wide open*)

### Uncertain — kept
- `### Two merit channels` → the consumer bullet (594–604) — the `engagement × regard` multiplier shipped (`ConsumerLogic`; Art. III §6), but the parenthetical *per-member award-only allowance* as a way to *source* regard is an unbuilt proposal inside the same paragraph (paragraph rule). Kept whole; register D4 (*renown gates and caps*) is the open dial
- `### Anti-oligarchy by construction` — written under the reservoir (*"refill a large reservoir and unleash a big vote once"*); the conclusion (money buys moments, not thrones; concave `influence.capital_curve`) stands, the mechanism named does not exist. Kept-but-contradicted; requirements for the capital faucet must read it against `#### The markers survive by splitting`
- `### The two real dangers` → *a cap on how much one person can hold* — retracted by the slate's own `### Two corrections to § The two real dangers` (*a disenfranchisement wearing an anti-oligarchy costume*); the *Open problems → Delegation guardrails* bullet still lists *the per-delegate weight cap* as open. Kept in all three places because the correction is in the same slate; requirements reconcile, not inherit
- `### Three tiers, all with shipped homes` + `### ⚠ Auto-generated headlines would make the press redundant` — the *ticker is a publication with a publisher* half shipped (`press.md §§ 1–3`, the `bulletin → press` rename; *the state aggregates, never reports* is documented doctrine there); the **record** (the Roll + MQL) and the **docket** (an unedited governance-events feed) have no code. Kept whole
- `### Three surfaces, three jobs` — the table is half shipped: the social forum (`forums.md`, `organizer: 'open'`) and the deliberation argument-map (`'ordered'`) exist as two organizers over one board; polling and the weighted vote do not. One table, kept
- `### Succession — the gap was disappearance, not removal` — *a vacated office reverts to the founder default* shipped (`governance.md § Sparse-handoff occupancy`); *a caretaker may execute, but may not veto* is **contradicted by the shipped shape** — the founder default holds every seat's full authority (mints via `reserve` as Governor, holds the platform's title as PM). No caretaker distinction exists. Kept; named in `Left`
- `### One consistency worth noting` — row 1 shipped (`governance.md`); row 2 *a deadlocked committee resolves upward to the Compact* — no deadlock rule anywhere in `access.md` / `civics.md` / `CompactApi`; row 3 the amendment path is unbuilt. One table, kept
- `### The judiciary` → *it's a gate, not just a complaints desk … before they go live* — the slate's own *Open problems → Judiciary staffing* lists *"whether verification is a pre-ship gate, a post-hoc review, or both"* as open. Kept as the design lean; requirements decide
- `### Abatement` → **Open work** → *Clawback mechanics — un-crediting … from the producer's lifetime cap/reservoir* — reservoir language; under no-pool the object to claw back is the `producer_events` rows the content earned (rebuildable → replay without them). Kept, flagged
- `### The reserve as central bank` → *The reserve is the only mint … every coin that enters is a legislative appropriation* — the mint chokepoint shipped (`banking.md`, `postTransaction`, `reserve mint` behind `requiresGovernor`) but the Governor mints by fiat; there is no appropriation gate. Half true; kept whole (one bullet)
- `### Capital pools; influence individuates` — *influence individuates* shipped (standing keyed on the identity path); *capital pools at several levels* partly: person + organization accounts exist (`bank_accounts` `{owner, bank}`), the municipal budget account is a locality treasury of sorts (`civics.md` `Government.treasury` → `/world/terminus/budget`), a group treasury does not exist. Kept
- `### The authorial subdivision is the shared coordinate` → the first paragraph — content ✓ (Locality / address), influence ✓ (`ProducerEvent.zonePath`, `CreditRouting` — `provenance.md`), capital ✗ (no reserve → locality seeding); and *zones give ownership + permissions (ownerGroup / accessGroups)* is stale — ownership is parcel title now (`parcel.md`). Kept (one mixed paragraph)
- `### The consumer fault line — engaged consumption` — the two-axes product shipped and is documented (`participation.md`), the cooperative-wide scope shipped (`scope = '*'`, `participation.md` l.73), but **`participation.md` cites this slate for the thesis** and does not itself carry the *why* of the product form (popularity contest vs idle grind). Kept, NOT cut; the paragraph is in Handoff so it can be cut once inserted. The bylaw + two-guards paragraphs are unbuilt (D4)
- `### Where it lives` (Amendment) — *the integrity branch attests the canonical text* is Art. VII §2 / XIII; *an amendment routes through the judiciary's dual-key greenlight before going live* is in **no** article and is the same open pre-ship/post-hoc question. Kept
- `## Buildable now — the stake-ledger slice (v1)` — *tracking the two markers (lifetime total + current recurring rate)* is the reservoir design; under no-pool the ledger records buckets per patron and the two markers become chronicle honor + standing rate. *Identity binding rides the auth-providers keystone* — that keystone **shipped** (Twitch co-equal login + account linking, `connection.md`, `TwitchProfile.ts`); the dono/sub webhook did not (no EventSub `channel.subscribe` / cheer handler anywhere — only the chat reader). Kept whole; `Left` re-worded accordingly
- `## Open problems` → *Delegation guardrails* (the cap is retracted, above) · *Deliberation — three-surface model settled* (the argument-map surface design shipped and the comms handoff happened — `forums.md` owns both organizers; convergence tuning stays open) · *The producer-contribution metric — how to weight is undesigned* (usage-weighting shipped; only D2 quality is open) · *Archives / integrity* (the same open thing as `record-integrity-slate` — kept in both) · *Employment & labor economics — moved to the economy slate* (see finding 5: the mediocrity margin did not move). Each kept; each partly answered
- Overlaps for the cluster pass: delegation ↔ `legal-code-slate § The roll`; elections / advocacy / rights ↔ `amendment-library-slate`; the argument-map's scale bullets ↔ `argument-map-slate`; the record ↔ `record-integrity-slate`; the NPC market floor + Genesis ↔ `economy-slate`; the tenure floor ↔ `land-compute-and-license` + `balance-slate` Part 3; the ops seat ↔ `balance-slate` Part 6 / `wizard-duty-slate`

### Handoff (belongs in a doc outside my list)
- → `influence.md § Conviction`, after the *full weight / no pool* sentence — the *why*, verbatim from the cut § RESOLVED (433–437):

  > **The recommendation is to keep no-pool**, because a reservoir is a
  > *simulated* scarcity stacked on a real one — **attention** — and a
  > budget turns politics into portfolio management, which is swing-voter
  > leverage moved one level up. It is also what keeps the system
  > **scale-invariant**: `support = tally / totalStanding(stock)` — double
  > everyone's standing and both sides double; no-pool means standing is
  > *only ever compared to other standing*, so absolute magnitude never
  > appears anywhere, while a reservoir reintroduces absolute numbers and a
  > permanent tuning burden.

  (The second sentence is from the kept `### And passage is scale-invariant anyway`, folded in so the insert is one paragraph; that section stays in the slate because the passage rule itself is unbuilt.)

- → `participation.md` § The pipeline (or a short *Why the product* paragraph after the intro) — the rationale `participation.md` today cites the slate for, verbatim from the KEPT `### The consumer fault line` (2628–2632). Cut it from the slate once inserted:

  > The **product** is the point. Reputation alone is a *popularity contest*
  > (charisma wins, presence doesn't); engagement alone is an *idle-farm /
  > no-life grind* (raw hours, bots, AFK); **engagement × reputation** demands
  > both — substantial participation *and* regard for it.

- → `docs/governance/draft-constitution.md` Art. IV §2 + Art. IV §7 + the Schedule (`influence.cap_curve`, `influence.regen_rate`) — the reservoir / regeneration clauses are stale against the shipped, entrenched no-pool rule (`influence.md § Conviction`). The constitution's own text flags *"the precise reconciliation … remains to be specified"*; it is specified — there is no reservoir. Not a slate matter; the coordinator or the next constitution pass. (`legal-code-slate § The passage rule` has already re-derived Art. IV §4 under the same fact.)
- → `docs/subsystems/governance.md § Deferred` (my own list, but NOT inserted — it is a backlog item, not a graduation; the coordinator may prefer the slate to keep it): the *caretaker may execute, may not veto* floor — today a vacated seat reverting to the founder default carries the seat's full authority.

### Status block
- Status line: *"the Office seats and the three-stock influence substrate (producer faucet + conviction) shipped → governance.md"* → names the founder default, sparse handoff, the Governor gate, the PM's seat-held title, the participation + producer faucets, conviction **no pool**, the argument-map v1 (`forums.md`), and points at the draft constitution for the provisions
- Left: *the capital faucet / stake ledger · Twitch identity binding · the three chambers + the ballot · delegation guardrails · the in-world reserve + the budget process · mint-at-launch* → *the capital faucet (credit per patron per bucket) + the stake ledger enforcing the founding charter + the dono/sub webhook + mint-at-launch · the honor→chronicle / voice→standing split of the two markers · the ballot over the shipped conviction substrate (passage `tally / totalStanding` · quorum · the percentile-band fix · the top-decile share metric) · delegation re-derived for no-pool (`follow`, the conviction clock, per-topic scope) + synthetic constituents · the flip notice + the docket · deliberation's scale work (version-controlled proposals, convergence-detection, polling, the sync floor-bot) · investiture / no-confidence as a standing target / the caretaker-may-not-veto floor / the deputy · the executive institution roster + the producer merit-pay bank · (identity, matter) recusal + the population ladder · abatement's open work · the in-world reserve toolkit (drain / seed / bounties / appropriation) + the NPC market floor + treasuries · the justice legos (advocacy, elections) with the amendment-library slate* (the body wins: nine open designs were unrepresented). ⚠ **`Twitch identity binding` is REMOVED** — it shipped (`auth-providers-slate` Waves 1+2 → `connection.md`); the webhook that remains is named. *"the budget process"* is dropped as a phrase — the real-dollar budget is Art. VIII and an accountant's matter (*Open problems*), not a build item
- Size: a build → a build
- Added one line under the block pointing at this ledger

### Counts
- Cut (SHIPPED · DOCUMENTED): 41 entries · Graduated: 0 · Superseded: 9 · Kept (UNBUILT): every heading, ~60 sections/paragraph-groups · Doctrine: 13 · Uncertain: 17 · Handoff: 4
