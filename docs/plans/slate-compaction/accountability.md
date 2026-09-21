# Slate-compaction pass — accountability batch ledger

Two slates. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `accountability.md`
only — **it needed nothing**: neither slate restates the ledger, both
ride it. Line numbers below are the ORIGINAL file's. Originals saved under
the scratch dir `accountability/orig/` for diffing. Code was verified in
`packages/server/src/mud/**`, `packages/content/**` and
`packages/server/src/schema/`; every class below names what was grepped.

Three things a reviewer should know first:

1. **Zero cuts in this batch, and that is the finding, not a failure to
   look.** The brief expected the policing slate to carry the shipped
   ledger's design; it does not — the slate names *acts and actors* once,
   as a premise, and never describes `accountability_events`,
   `deriveBlame`, the row kinds or the producers. Everything that IS in
   the body is either the institution (unbuilt end to end: no
   `escalationCeiling`/`stopThreshold`/`searchAuthority`/`dutyToAid`
   anywhere; `Government.charter` is still *"pointer only in v1"* at
   `platform/idea/Government.ts:56`; no restraint / uniform / warrant
   items; no gang, no Gray content under
   `packages/content/terminus/content/world/terminus/`; lending deferred
   at `banking.md:579`; no guild class) or doctrine.
2. **The policing status line was stale in the other direction.** It said
   *"civics ships the Watch as a charter seat form"*; `civics.md:137,181`
   say the city Watch is charter *prose* in a staging doc and its content
   is **deferred**. What actually shipped is a different watch — **the
   Watch of the Last Counted Mile**
   (`packages/content/newbie-wilds/content/world/newbie-wilds/idea/watch.yaml`),
   an `Organization` with one `picket` position, appointed by the
   committee over `/world/newbie-wilds`, fielding the watchpost sentry
   through `institution:` (`agent/sentry.yaml:24`) — plus the party half
   of every harm row (`killerFor`/`victimFor`,
   `AccountabilityLogic.ts:72,106`) and the `guarding` Discipline
   (`platform/idea/Discipline/guarding.yaml`, ISCED-F 1032). All three
   are documented (`accountability.md § Every attribution has a PERSON and
   a PARTY`, `employment.md § Who answers for you`, `identity.md § Who
   answers for you`, `advancement.md:469`). The re-stamped Status line
   says so; no insert was needed.
3. ⚠ **Three kept sections now contradict shipped code** — the Uncertain
   entries below. The sharpest: Part I's *insulation structure* ("the boss
   commits no crimes at all… we can catch the corner, we cannot touch the
   top **emerges**") was written before `killerFor` and `commandResponsible`
   existed. A gang that declares itself (an `Organization` its collectors
   name as `institution:`, or a Business roster) is now **blamed on every
   crime row by construction** and readable by `chronicle <body>`;
   insulation is therefore a *content choice* (an undeclared outfit —
   `institutionPath()` → `null`), not a property of the data model.
   Requirements must reconcile this rather than inherit the slate's claim.

---

## docs/slates/builds/policing-slate.md — 734 → 755 · Status PARTIAL → PARTIAL

(The file GREW by 21 lines: the status block is the only edit, and the
honest substrate line + the body-derived `Left` are longer than the stale
ones. No body line changed — `diff` the original against the scratch copy
shows lines 3–9 only.)

Grep record, by section noun: `charter` — `Government.ts:56,57,77`
(pointer, `getCharter` returns the string, nothing consumes it);
`escalationCeiling|stopThreshold|searchAuthority|dutyToAid|useOfForce` —
nothing under `packages/server/src` or `packages/content`; brains —
`lib/behavior/{patrols,wary,greets,introduces}.ts` all exist, no
`sentry.ts` (the ranged slate's use-of-force ladder, `ranged-slate.md:601`,
is unbuilt); `enforces.ts` exists but is the bar-fight proprietor brain
(Dave — *"the house's own peace"*), not a police brain; Disciplines —
`stealth.yaml`, `guarding.yaml`, `forensics.yaml`, `appraisal.yaml` exist,
no `policing`, no `lockcraft`; verbs — no `arrest`/`restrain`/`subdue`
yaml (but `fight subdue` is a shipped gambit, `cmd/combat/fight.yaml:18,51`,
`combat.md:425`); items — `whistle` only as the University Avenue referee
whistle (`terminus/.../university-avenue/thing/whistle.yaml`, `cmd/blow.yaml`;
`perception.md § Audible` names it the first driver of `Scene.toAudible`);
no manacle/restraint/net/uniform/warrant rows; `vanguard` preset —
`combat-formations.md:40`; suppression — `lib/magic/Suppression.ts`
(`magic.md:103`); guild — no class; exclusion — decided in
`settlement-model.md § 9` (2026-09-03), no record kind in code; lending —
`banking.md:579` *deferred*; the Gray — no row anywhere in
`packages/content` (the terminus pack's localities: budget ·
counting-houses · delight-road · estuary · general-store · goods-yards ·
infirmary · market · mayfield-row · necropolis · realty · registry ·
terminal · university-avenue · valley-road · wharfside).

### Cut (SHIPPED · DOCUMENTED)
- none

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none

### Superseded — cut
- none

### Kept (UNBUILT)
- the framing paragraphs (12–28) and every link in them (all resolve)
- **Part II — Police**: `## The aesthetic arc — each mode is an argument` (180–202: Terminus is Peelers; other modes as other localities) · `## What "police" encompasses` (204–220) · `## Organization` (222–234 — see Uncertain) · `## The aesthetic target — the constable you know by name` (236–247; the four named brains exist, the `sentry` ladder does not)
- **Part III — the policy hook**, whole: the intro (253–258; the charter claim is still literally true) · `## Three tiers` (260–273) · `## The mechanism: resolve-on-read, never push` (275–289) · `## The policy vocabulary` (291–309) · `## The loop` (311–326; no policy-version field on `AccountabilityEvent`) · `## Failure modes to build for` (328–338)
- **Part IV**: `## The dynamics that fall out` (344–356) · `## Rails (standing)` (384–396) · `## Open questions (for requirements)` 1–10 (398–427) — none answered by code. Overlaps for the cluster pass: Q2 (charter schema) ↔ `civics.md § Deferred` *the charter as a readable StoredDocument* + `enforcement-slate` Q4 (mode declaration shape); Q3 (prosecutorial discretion) ↔ `courts-slate` Part 3 (a complainant with *standing* files; there is no prosecutor — the two slates answer the same question differently and neither is built); Q7 (charter petition) ↔ `guild-slate`; Q10 (restraint and arrest) ↔ `prison-slate § PrisonMixin` *intake is a custody transfer with an accountability ledger entry*
- **Part V — The Gray**, whole (431–593): the BUILD DECIDED 2026-09-03 block (lending gate · exclusion as one system · warehouses shrink the Gray) · the district premise · `## What the gang sells` · `## Roster, and the periphery` (see Uncertain) · `## Predator *and* instrument` · `## Enforcement dynamics` · `## Five ways to play it` · naming. Overlaps: `settlement-model.md § 9` (the exclusion decision, doc-only), `credit-slate` (lending), `freight-slate` (the warehouse receipt as collateral), `venue-and-supply-slate § 6c`
- **Part VI**: `## A guild is chartered; a gang is not` (599–611; ↔ `guild-slate`) · `## Policing is a Discipline; crime is not` (613–645 — see Uncertain) · `## The levelling mechanic` (647–667; the whistle push is shipped substrate, the constable response to it is not) · `## The kit — denial, not damage` (669–701 — see Uncertain) · `## Aesthetics — multi-genre without incoherence` (703–734)

### Doctrine — kept, labelled (for the coordinator's one-pass home decision)
- `## Organized vs. ordinary: the difference is governance, not violence` (34–67) — *organized crime is unlicensed governance*; gang strength indexes state failure; a gang is a Business that commits crimes (the Business Idea is shipped substrate the thesis rides, not a claim about it)
- `## The insulation structure — mechanically true here` (69–94) — ⚠ also in Uncertain: its central mechanical claim is now contradicted
- `## Corpos and white-collar crime` (96–137) — *you cannot forge the record, but you can enter lies into it*; *the worst corpo behavior is usually legal*; the detection asymmetry (police catch what someone saw, journalists what is in the books)
- `## Is crime evil, or chaotic? Neither — it is a *social* fact` (139–174) — crime never moves alignment because it is crime; law ≠ morality
- `## The pedagogy — what everyone learned from cop shows` (358–382) — the three misconceptions; *you learn why rights matter by needing them*
- The *"Enforcement displaces. Governance dissolves."* thesis inside Part V's dynamics table (549–563) and *"the gang is the employer of last resort"* (581–587) — kept in place with their sections

### Uncertain — kept
- `## The insulation structure — mechanically true here` (69–94) — says *"the accountability ledger records acts and actors, and the boss performs no acts. So 'we can catch the corner, we cannot touch the top' **emerges**"*. Contradicted by the identity build: every harm row now carries `killerFor` (the standing institution that fields the actor, crime-gated — `AccountabilityLogic.ts:72,118`; `accountability.md § Every attribution has a PERSON and a PARTY`), `institutionRecordFor(partyId)` returns the bodies a party is `blamed` for, and `chronicle <a body of people>` reads it; separately `commandResponsible` names a captain whose recorded directive began a killing act (`AccountabilityEvent.ts:95`). So insulation holds only for an outfit that **declares no institution** (no `institution:`, no Business roster → `institutionPath()` → `null`, `employment.md § Who answers for you`). The slate's Part V roster (*"the top commits no acts — and per the ledger's shape that insulation is real"*, 521–525) inherits the same premise. Kept verbatim; requirements must decide whether the Gray's outfit is a declared `Organization` (blamed by construction — arguably the *right* answer for "a gang is a Business") or an undeclared one (insulated), because the slate's central "emerges" claim is now a content switch
- `## Organization` (222–234) — opens *"Civics already carries `departments` as Business templatePaths … so a watch is literally a Business with a roster"*. Contradicted twice by shipped code: (a) `departments` are now **Organization** templatePaths, and the conflation was fixed on purpose — *"a registry keeps records and does not trade"* (`civics.md:47–53`); (b) the one shipped watch is an `Organization`, **not** a Business, and ⚠⚠ *"only a BUSINESS roster materializes an `Employment` record … a plain `Organization`'s `rosterSlots:` resolves to nothing at runtime"* (`employment.md:676–681`; `watch.yaml:27–33` — `rosterSlots: []`, the sentry states `institution:`). The five-rank roster (Constable … Commissioner) is unbuilt and kept; the lead-in sentence is the same paragraph as the list, so the paragraph rule keeps it whole. Requirements: a paid watch with shifts and wages is a **Business** (the slate's shape) or an **Organization + `institution:`** with no roster tick (the shipped shape) — pick one
- `## Policing is a Discipline; crime is not` (613–645) — the dual-use table marks only `stealth` shipped; **`forensics`** (`Discipline/forensics.yaml`, read through the `analyze` body stanza, `cmd/perception/analyze.yaml:135`) and **`appraisal`** (`Discipline/appraisal.yaml`) have since shipped, `lockcraft` has not. And a **`guarding`** Discipline shipped at ISCED-F 1032 (*"protection of persons and property"* — `guarding.yaml`, `advancement.md:469`), authored for the watchpost sentry *"in the same pass as the watch"*. Whether "Policing" is a second Discipline beside `guarding` or `guarding` grown is undecided; the section's `study.com` test names criminal justice, which is broader than keeping a post. Kept whole (one table, one argument)
- `## The kit — denial, not damage` (669–701) — the *restraints → the arrest mechanic — custody, not damage* row has a shipped precursor: `fight subdue` (*"lock them up"*, `fight.yaml:18`; the subdued foe can then be thrown through an exit — `fight.yaml:75`; `combat.md:425,564`) and the `enforces` brain already uses it to eject; `vanguard` is a shipped preset. No restraint **item**, no custody state, no whistle-summons. Kept; the arrest mechanic should be specified as *subdue → restrain → custody* rather than from scratch
- `## The aesthetic target` (236–247) — *"plus the `sentry` use-of-force ladder from the ranged slate"*: no `sentry` brain exists (`ranged-slate.md:601` still lists it); the four named brains do. One paragraph, kept
- `## The levelling mechanic` (647–667) — *"now with the distance-honest falloff from the ranged slate"*: the push walk has a `PER_HOP_TAU` distance falloff (`perception.md § Audible`, `AudienceGather.gather`), but nothing in `ranged.md` mentions audible falloff — the attribution is to the wrong build, the fact is true. Kept
- Overlap with the two read-only siblings: `enforcement-slate` owns the **mode vocabulary, the evidence firewall, testimony-as-claims and the intrinsic/social split** — policing-slate's Part III policy hook cites *"posted law is a hard requirement per the enforcement slate"* and Part IV's pedagogy leans on the firewall, but neither restates them (no duplication to note beyond the pointers). `prison-slate` owns **custody, the three enforcement tiers (meta · locality · Compact) and the guardrail** — ⚠ the OLD `Left` item *"the three enforcement tiers"* was prison-slate's vocabulary pasted here; this slate's tiers are **kernel / law / policy** (Part III) and the re-stamped `Left` names them that way

### Handoff (belongs in a doc outside my list)
- none — the one candidate (the shipped watch as an `Organization` fielding a role via `institution:`) is already in `employment.md § Who answers for you` and `identity.md § Who answers for you`

### Status block
- Status line: *"the harm-consent ledger … ships, and civics ships the Watch as a charter seat form → accountability.md"* → *"the substrate ships, none of the institution does"* + the three shipped things with their docs (the ledger's PERSON + PARTY; the Watch of the Last Counted Mile as an `Organization`, not a Business; the `guarding` Discipline) + *"the civics `charter` is still a pointer nothing reads"*. ⚠ The "Watch as a charter seat form" clause was false — that Watch is deferred city content (`civics.md:181`)
- Left: *the three enforcement tiers · the closed policy vocabulary + resolve-on-read enforcement · arrest and custody · the constable kit bundle as a budget line · the Policing Discipline · the gang roster and its four services* → *Terminus as Peelers + the Tiebout spread of policing modes · the police bundle and the department roster (constable · sergeant · inspector · market inspector · commissioner) as a civics department · the commissioner ↔ committee policy hook — the charter's first consumer · the kernel / law / policy three tiers · resolve-on-read policy + the closed six-field policy vocabulary · the policy version stamped on the ledger row · civilian review as an amendment module · "wanted" as belief · arrest and custody — restraints + the handoff into prison-slate's intake · the whistle clock (response time is geography) · the constable kit (denial, not damage) + its per-locality skins + the kit as a budget line · the Policing Discipline + credential-to-serve · lockcraft, the last dual-use competence · the Gray — the worked gang, gated on the lending tier and landing with exclusion: its four services, roster + periphery, the enforcement-dynamics table · the gang's charter petition* (6 → 16 items; the body wins — Parts II, III and V were mostly unrepresented, and *"the three enforcement tiers"* was renamed to what this slate's tiers actually are)
- Size: a build → a build (honestly two — the institution and the Gray are separable, and the Gray's own gate is the lending build)

---

## docs/slates/builds/courts-slate.md — 319 → 325 · Status UNBUILT → UNBUILT

Verified only-unbuilt, as the brief expected. Grep record: no
`cmd/**/court*.yaml` under `packages/content`; no `docket | venire |
juror | jury | sortition | courthouse | empanel` in any non-test `.ts`
under `packages/server/src/mud` or `packages/content/*/src` beyond two
comments — `lib/governance/Office.ts:23` (*"there is no judiciary office:
a jury is a selection from a pool, not a seat"*) and
`ForumsLogic.ts:473` (*"vote / measure / docket consumer is the deferred
governance layer"*); no schema file matching `court|case|docket|jur|judg`
in `packages/server/src/schema/`; the four content hits for `court` are
Hinkley's cul-de-sac *court* (a `PlatPlan` lane branch) and Remy *holding
court*. `governance.md:71,304` carries the pool-vs-seat sentence as a
"never" on the office substrate — the doc states the principle; the
primitive does not exist. The substrate the Status line names is all
real (`accountability_events`, the Office seat + founder default, seats
as positions + `subjectTo` jurisdiction, bound channels, `NotifyPolicy`,
the chronicle, the contract breach row, `_chattelId`) and the line names
it only as substrate, not as this slate's work. **The file GREW by 6
lines: the `Left` list is the only edit.**

### Cut (SHIPPED · DOCUMENTED)
- none

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none

### Superseded — cut
- none

### Kept (UNBUILT)
- the captured-2026-09-18 framing (23–29) · See also (31–57; all eleven links resolve)
- `## What the 2026-07 design settled, and still holds` (61–83) — the pool primitive, the founding pool of one, eligibility = enfranchised humans, courts as legitimacy substrate, verdict-not-bailiff. Design premises for an unbuilt primitive; `governance.md:71,304` already says *a jury is a selection from a pool, not a seat*, which is the first bullet's sentence but not its build
- `# Part 1 — What is left for a court, after the bootstrap` (87–116) — the eight dockets; embezzlement first
- `# Part 2 — Constraints the surface inherits` (120–145)
- `# Part 3 — Roles` (149–165) — the venire + the widening rule
- `# Part 4 — The case, without a calendar` (169–186)
- `# Part 5 — The `court` verb` (190–239) — the subcommand table, `## What the clerk assembles for embezzlement`, `## The remedy menu`
- `# Part 6 — The cost of filing` (243–253)
- `# Part 7 — Where it lives on screen` (257–271)
- `# Open questions` 1–5 (275–291) — none answered by code
- `# The drive` (293–319) — the build's exit scene; spine

### Doctrine — kept, labelled
- none beyond the *settled* section above, which is design premise for a named `Left` item rather than free-standing doctrine — listed under Kept

### Uncertain — kept
- none contradicted by code. Overlaps for the cluster pass (the slate's own See-also already names them): `policing-slate` Q3 (*prosecutorial discretion's home — is charging an office?*) vs this slate's Part 3 (a complainant with **standing** files; there is no prosecutor and no judge) — two unbuilt answers to one question; `prison-slate § PrisonMixin` (*commitment appealable … the exit path points at the courts*) vs Part 5's `court appeal` (*named now, built later*) and open question 5; `enforcement-slate § Testimony` (*false accusation is an offense the courts can hear*) vs Part 6's baseless-filing mark — the same idea in two registers, neither built

### Handoff (belongs in a doc outside my list)
- none

### Status block
- Status line: unchanged
- Left: *the case object … · the pool primitive … · the clerk … · the `court` verb and its lifecycle subcommands · the closed matter vocabulary, embezzlement first · the remedy menu + the judgment debt … · the docket card, the case card, the panel channel · the filing fee and the baseless-filing rule · the courthouse in Terminus · appeal to the parent jurisdiction* → the same list plus *the no-clock lifecycle (filed → served → answered → empanelled → decided → entered) · the two-sided append-only record (facts the clerk assembles · claims people add) · jurisdiction as situs, the `/compact` court on the same substrate · then the docket list (contested repossession · contested escheat · charter breach · condemnation · disbarment · Art. VI attestation) · the summons as a notification* (10 → 15 items; Parts 1, 2, 4 and 7 were unrepresented)
- Size: a build → a build

---

## Batch totals

| | policing | courts |
|---|---|---|
| lines | 734 → 755 | 319 → 325 |
| Status | PARTIAL → PARTIAL | UNBUILT → UNBUILT |
| `Left` items | 6 → 16 | 10 → 15 |
| Size | a build → a build | a build → a build |
| cut (documented) | 0 | 0 |
| graduated | 0 | 0 |
| superseded | 0 | 0 |
| uncertain | 6 (3 real contradictions) | 0 |
| doctrine labelled | 5 | 0 |
| inserts into `accountability.md` | 0 | 0 |

Hardest calls:

1. **Not cutting Part I's insulation section as superseded.** Its
   mechanical claim is false now (`killerFor`), but the section is a
   thesis about organized crime whose *fix* is a requirements decision
   about whether the gang declares — cutting it would lose the question.
   Kept-but-contradicted → Uncertain, per the ruling.
2. **Not cutting the `## Organization` lead-in.** The stale "Business
   templatePaths" sentence is the same paragraph as the unbuilt five-rank
   list; the paragraph rule keeps it whole.
3. **Renaming a `Left` item.** *"the three enforcement tiers"* was
   prison-slate vocabulary; this slate's tiers are kernel / law / policy.
   The body wins, so the re-stamp names them correctly — recorded here so
   nobody reads it as a scope change.
4. **Both files grew.** A compaction pass that adds lines looks wrong; it
   is the honest outcome when the only defect was an under-stated `Left`
   and an over-stated Status line. The diffs are the status blocks alone.
