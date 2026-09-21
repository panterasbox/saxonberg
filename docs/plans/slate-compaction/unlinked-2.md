# Slate-compaction pass — unlinked-2 batch ledger

Eight slates whose status block names NO subsystem doc. Branch
`design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: **none** — every
graduation is in a Handoff section below, verbatim, with its target doc
named. Line numbers below are the ORIGINAL file's. Originals saved under
the scratch dir `unlinked-2/orig/` for diffing. Code was verified under
`packages/server/src/mud/**`, `packages/content/**`,
`packages/server/src/schema/*.yaml` and `packages/server/scripts/**`;
every class below names what the grep found or failed to find.

Batch-wide findings, up front:

- **The batch is what the brief predicted: mostly UNBUILT, verified.**
  Six of eight slates lost nothing but a stale duplicate status line
  and gained a longer, body-derived `Left`. The two with real cuts are
  `api-normalization-slate` (a refactor whose census numbers moved) and
  `instrumentation-slate` (whose *shipped instruments* register had
  drifted from the code).
- **`Left` grew in every slate.** The body wins: each slate's design
  sections named more unbuilt things than its stamp did.

---

## docs/slates/builds/guild-slate.md — 698 → 702 · Status UNBUILT → UNBUILT

Entirely UNBUILT, verified: no `Guild` class or Idea anywhere under
`packages/server/src/mud` or `packages/content/*/src`; `guild:` appears
only as a forward-looking comment (`lib/social/GroupProvider.ts:59`
*"a future guild provider with leader / officer…"*,
`platform/idea/SubjectCatalogue.ts:61`, `lib/forum/Subject.ts:15`,
`lib/social/Contacts.ts:32`); `lib/advancement/TranscriptEntry.ts` has no
focus/context field (the word `focus` does not occur in
`lib/advancement/*.ts`); `platform/idea/Discipline.ts:8` still says *"the
map guilds will later project over"*; claim gates are in `contract.md`'s
deferred list (l.354–356 *"standing/competence claim gates"*); no
`charter` outside `Government.charter` (a document-store pointer, the
civics build's); no marshal credential (`grep -i marshal` hits only
marshalling code). The `Party` shape the slate rides is shipped
(`platform/idea/Party.ts`, `lib/party/PartyGroupProvider.ts`) as the
slate says. The Substrate-mapping table's *"what exists"* claims all
check (`JobBoard` at `platform/thing/JobBoard.ts`; four GroupProviders;
group-titled parcels per `parcel.md`).

### Cut (SHIPPED · DOCUMENTED)
- the second status line `> **Status: design settled in conversation (2026-07-28), pre-requirements.**` (11, 1 line) — history under the one-status-block rule. ⚠ Only that sentence was cut: the rest of the blockquote (12–18, the *supersedes and extends advancement-slate § Guilds; the affiliation-slate § Guild sketch is two supersessions deep*) is spine framing and is KEPT verbatim, now as a plain framing blockquote.

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none

### Superseded — cut
- none

### Kept (UNBUILT)
- `## What a guild is` (see Doctrine) · `## The formation rule — vocation = discipline × livelihood` · `## The four layers` · `## No magic guild` · `## Invariants and divergence axes` · `## Membership — three tiers` · `## The conferred advantage — a chartered training budget` · `## Proportionality` · `## The guild job board` · `## The balance ledger` · `## Wizards and the Worldwrights` · `## Corpos — labor and capital` · `## The charter schema` · `## Lifecycle` · `## Substrate mapping — what exists, what's new` (its *exists* column verified; its *new* row is the build) · `## The launch roster` and all six subsections · `## Open questions` (all eight still open — Q3's *resolved by deconstruction* is resolved inside the slate, not in code, and carries a residual) · `## Cross-references`

### Doctrine (kept, labelled — for the coordinator's home decision)
- `## What a guild is` → *"The design center is wish fulfillment, not skill acceleration"* + the three parts (mysteries, calls, marks) (31–46) — a thesis about what the institution layer is FOR
- `### What fell out of the audit` → finding 1 *"trust-work is engine-work; labor-work is player-work"* (603–613) — a general thesis about vocations in an honest engine, wider than guilds (overlaps `vocations.md`'s demand test)

### Uncertain — kept
- `## Wizards and the Worldwrights` — its first paragraph (*wizardhood is a security clearance, not an expertise*) IS shipped and documented (`access.md`, the code-trust axis), but the paragraph is one sentence of framing for the unbuilt Worldwrights' guild and the hard wall; kept whole at paragraph granularity
- Overlaps for the cluster pass: the Marshalcy credential + writ-contracts ↔ `legal-code-slate` / courts (memory); the Landwrights ↔ `property-slate` Phase 3 tenancy economics; the Delvers' Union / Watermen ↔ `mining-slate` / `fishing-slate`; the College of Physic ↔ `health-vertical-slate`

### Handoff (belongs in a doc outside my list)
- none

### Status block
- Status: UNBUILT → UNBUILT (unchanged text)
- Left: *the `Guild` Idea + charter schema · the `guild:` GroupProvider + ranks · focus-tagged `TranscriptEntry` + charter-weighted `Competence` · contract claim gates · the hall and the job board · the 10 day-one institutions + 8 standing charters* → *the `Guild` Idea + charter schema (+ the charter validation pass) · the `guild:` GroupProvider + ranks · the three membership tiers + the witnessed rank exam · focus-tagged `TranscriptEntry` + charter-weighted `Competence` · the advancement gym · contract claim gates · the hall (group-titled parcel + keyway tiers) and the job board · lifecycle (founding paths · schism · dormancy · merger · standing charters) · the Marshalcy credential + writ-contract stream + the calls mechanism · the Worldwrights on-ramp · the 10 day-one institutions + 8 standing charters* (the body wins: § Membership, § The balance ledger #1, § Lifecycle, § Force in an administered realm and § Wizards were unrepresented)
- Size: a build → a build

---

## docs/slates/builds/api-normalization-slate.md — 612 → 613 · Status UNBUILT → UNBUILT

A refactor slate; the brief asked that its census numbers be verified
where stated. Verified at HEAD (2026-09-19): `ls packages/server/src/mud/api/*.ts`
= **93** (unchanged); `api/identity.ts` is still `export const Identity =
Object.freeze({})` under commentary; `api/array.ts` (75 l., paired with
`ArrayLogic.ts`) and `api/path-pattern.ts` present; `api/scheduler.ts:140`
still `export class SchedulerApi` (no `ActivityApi`); `api/attendant.ts:35,40`
still exactly `sweepNowForTesting` + `disconnectForTesting`; the five
standing facades (`influence` · `renown` · `producer` · `conviction` ·
`provenance`) still separate over one `lib/standing/` (14 value classes);
`api/mql-subscription.ts` 395 l. vs `MqlSubscriptionLogic.ts` 186 l.
(Part 7's 170% finding still stands in shape); a crude re-count gives
~1,211 public statics and `mixin.ts` at ~187 (the slate's 1,097 / 175 at
2026-09-13) — the one-directional drift 6.0 describes has continued. The
class-name pairing check finds 16 unpaired facades (slate: 19 in 7.3, 15
in Q5 — the slate's own two numbers disagree by definition, not by
drift). **No refactor has been made**; the slate's Status is honest and
every Part is UNBUILT. No subsystem doc carries the Part 3 cohesion rule,
the 6.1 scannability term, the 6.2 shared-`lib/`-boundary test or the
Part 7 facade-work measure (`grep -i 'scannab\|facade work\|lib/standing'
docs/architecture.md` → nothing).

### Cut (SHIPPED · DOCUMENTED)
- the second status block `> **Status: measured baseline + analysis, captured. Not requirements.** … re-run it rather than trusting these figures later.` (23–26, 4 lines + blank) — history under the one-status-block rule; its one instruction (*re-run before acting*) is Part 5 step 5 and Part 6's opening sentence

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none

### Superseded — cut
- `⚠ **Related work in flight:** design/api-oo-sweep (build-1) carries oo-calling-conventions-slate and api-boot-retirement-slate…` (39–41, 3 lines) — by the code: the OO sweep landed (MR!228) and both slates were retired at `d2e44e803` (*docs: pre-merge sweep for the Api OO sweep build*); neither file exists under `docs/slates/`. One-line note left in place saying so

### Kept (UNBUILT)
- the status block (re-stamped) · the *Captured 2026-09-02* framing · *Provenance* · *Sits on*
- `## Part 0` (with the 2026-09-13 correction) · `## Part 1` · `## Part 2` · `## Part 3` + both subsections · `## Part 4` · `## Part 5` · `## Open questions` (all five still open) · `## What this slate does NOT cover` (see Uncertain) · `## Appendix — the full 93-row baseline` (the reproducible baseline the slate says to diff against)
- `# Part 6` → `## 6.0` – `## 6.6` all kept · `# Part 7` → `## 7.1` – `## 7.3` all kept

### Doctrine (kept, labelled)
- `## Part 3` → the blockquote *"split on COHESION, not on density"* (150–155) — a rule for the pass, wider than any one Api
- `## 6.1` → *Scannability = can you predict the member's name before you look?* + *uniformity is a kind of cohesion the numbers cannot see* (381–389) — a metric term; the coordinator may want it in `architecture.md § The Api ↔ logic-singleton split`
- `## 6.2` → *"when a cluster of thin Apis shares one `lib/` directory, the directory is the honest system boundary"* (424–428) — a placement test (memory carries it as *a shared `lib/` dir IS the system boundary*)
- `## 6.3` → *the export-discipline rule MANUFACTURES type-shaped Apis* (430–452) — an argument about a standing CLAUDE.md rule, unresolved
- `## 6.5` → the *Grouping, not merging* blockquote + `### ⛔ …the pattern is RETIRED` (479–511) — kept explicitly as *a record of a road not taken*; the security fact inside it goes to Handoff below
- `# Part 7` intro → *facade work is work that silently does not hot-reload* (533–545) — the WHY of the facade:logic measure; CLAUDE.md states the split but not this consequence

### Uncertain — kept
- `## What this slate does NOT cover` → the first two bullets point at `design/api-oo-sweep` (build-1) and `api-boot-retirement-slate`, both gone (retired at `d2e44e803`; `Api.boot()` retirement is now `antipatterns.md § Api.boot() — an Operator Act`). Kept because the bullets are scope exclusions that still hold; the pointers are stale. Left for the cluster pass to repoint rather than cut a scope statement
- `## 7.3` says **19** unpaired Apis and `## Open questions` Q5 says **15 of 93** — both are the slate's own numbers, at different definitions (Q5 predates the corrected Part 0); my class-name check finds 16 today. Kept both; requirements should re-run the script, as the slate itself says
- Overlaps for the cluster pass: `value-object-statics-slate` (6.3's second candidate home for system-less utilities); memory's *Api layer SHAPE doctrine* note carries the same 2-axis goal

### Handoff (belongs in a doc outside my list)
- → `call-security.md § decorateApiClass` (or wherever the frame-attribution rule is stated): *"`decorateApiClass` wraps each static in place and attributes the frame from the class's **defining module, captured at decoration time** — never from the access path. The class stays the unit of security. ⚠ Never route a `lib/` → `api/` back-call through a barrel — it makes a value-import cycle."* (from 6.5, l.479–490; the slate notes this fact was *only ever written down in a file scheduled for deletion*, `api/identity.ts`, whose commentary still carries it). The slate keeps its copy as the road-not-taken record; the doc should carry the fact independently of that file's deletion

### Status block
- Status: UNBUILT → UNBUILT; the parenthetical *"(`identity.ts`, `array.ts`, `path-pattern.ts` all still present)"* → a 2026-09-19 re-verification line naming what was checked (above)
- Left: *Part 7 first … · rename `SchedulerApi` → `ActivityApi` · `AttendantApi`'s surface is two test hooks · answer where a system-less utility lives · merge the influence cluster · delete `api/identity.ts` · split `command` + `banking`* → the same, plus *the layer-wide shared-`lib/`-directory cluster check (6.2) · … split `command` + `banking` on cohesion + uniformity, and record why `combat`/`pack` stay whole · the broad-thin member-list read (open Q1)* (the body wins: 6.2's closing paragraph, 6.6 #5, Part 5 #4 and open Q1 were unrepresented)
- Size: a build → a build

---

## docs/slates/builds/amendment-library-slate.md — 561 → 566 · Status UNBUILT → UNBUILT

Constitutional doctrine per the brief: kept, labelled. Verified UNBUILT:
`docs/governance/draft-constitution.md` exists (a document, no runtime);
`civics.md:22` (*"no legal machinery (no statute engine…"*) and `:178`
(*"Never (doctrine): legal machinery — statute engine, trials…"*) still
rule the engine out; `grep -i 'veto\|amendment\|ratif\|disenfranch\|totalStanding'`
under `packages/server/src/mud` hits only `VetoResult` (the residency /
destruct veto type) — nothing governmental; `api/compact.ts`'s statics
are offices + committees only (`holdsOffice`, `assignOffice`,
`committeeOf`…), no module registry, no catalog Document, no presets.
Every *See also* / in-body slate link resolves (cooperative · economy ·
argument-map · enforcement · press · prison · saxonberg-city ·
legal-code · freight · delivery · zoning · insurance).

### Cut (SHIPPED · DOCUMENTED)
- the second status sentence `> **Status: the concept is settled; the *catalog* is the open, growing work.**` (12, 1 line) — history under the one-status-block rule. ⚠ Only that line was cut; the rest of the blockquote (13–20, *the draft constitution ships as a bare-bones kernel… governance-as-config for non-lawyers*) is the slate's framing paragraph and is KEPT verbatim

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none

### Superseded — cut
- none

### Kept (UNBUILT)
- *See also* · `## The catalog (initial legos)` · `## Presets (distros)` · `## Standard-model situation` · `## Buildable now — the small-scale slice (v1)` · `## Open problems — deferred to scale` · `## The US-amendment walk` + `### Already kernel` + `### Already in the catalog` + `### The gaps — drafting candidates` (both tables + the three-urgent note) · `## The executive veto` + all five subsections (its `### Open` two questions still open) · `## The roll` · `## Elections` · `## Free movement of goods` + `### Sibling: the common-carrier duty` · `## Statutory right-of-way` · `## Full faith and credit`

### Doctrine (kept, labelled — constitutional design, per the brief)
- `## The spine` (40–74) — the six principles (kernel ships to all / a module is an amendment / most modules remove operator discretion / composability / curation tiers / presets are distros); the thesis of the layer
- `## Prior art` (155–171) — model legislation · registries · CC chooser · Constitute · DAO frameworks, with the throughline argument
- `### The pocket veto is excluded by construction` → the blockquote *"The executive's power is to stop, never to complete"* (341–349) — a constitutional consequence of a machine-enacted pipeline (designed in `legal-code-slate § The sweep`, itself unbuilt)
- the four *pedagogy* blockquotes — elections (431–434), free movement (468–471), the common carrier (482–483), right-of-way (526–528) — the library's thesis *discovering why beats being told*, restated per module
- `### Already kernel` (211–221) — claims three US amendments are already guaranteed by shipped design (open floor = petition; traits inadmissible; exit is bedrock). The first two rest on `forums.md`'s open organizer and the enforcement slate's intrinsic/social split — design claims, not code claims; left as written

### Uncertain — kept
- Overlaps for the cluster pass: the veto mechanic, the roll and the sweep are *designed in full* in `legal-code-slate` and summarized here (the slate says so at 313, 361); the two slates say the same open thing — kept in both per the rule. `cooperative-slate § How the prime minister is chosen` is cited for the parliamentary kernel
- `## The catalog` → *"Everything this build deferred is a slot"* — *this build* is the cooperative/constitution design pass, not a code build; no ambiguity in the body, noted only because a reader might parse it as a shipped build

### Handoff (belongs in a doc outside my list)
- none

### Status block
- Status: UNBUILT → UNBUILT (unchanged text; `civics.md` claim re-verified)
- Left: *the module registry + an adoption path over Art. X · the presets (distros) · drafting the named gaps — executive veto, the roll, elections, free movement of goods, statutory right-of-way, full faith and credit* → *the catalog Document + module registry + the adoption path over Art. X · the v1 standard-library modules as amendment documents (due process · free expression · term limits · the economy module) · the presets (distros) · the six drafted modules as amendment documents (executive veto with its two flavors · the roll · elections · free movement of goods + the common-carrier duty · statutory right-of-way · full faith and credit) · the undrafted gaps from the US-amendment walk (speedy trial · succession & incapacity · incorporation first) · the deferred-to-scale problems (compose-check · curation · versioning · portability · capture-resistance)* (the body wins: the old stamp called the six modules *named gaps* to draft, but the body has drafted them — what is left is authoring them as documents; the v1 slice, the 25-row gaps table and § Open problems were unrepresented)
- Size: a build → a build

---

## docs/slates/builds/institutions-slate.md — 552 → 560 · Status UNBUILT → UNBUILT

Written 2026-09-18; the brief expected nothing to cut. Confirmed. Verified
UNBUILT: no cap table / shares / shareholder anywhere under
`packages/server/src/mud` (`grep -i 'capTable\|shareholder\|\bshares\b'`
hits only prose in `Organization.ts:17` etc.); the Part 3 finding is still
the live state — every `packages/content/corpo-*/pack.yaml` has
`maintainers: { organization: /corpo/<key> }` with the comment *"The
organization holds its own branch — which is what makes it the committee
over /corpo/<key>"*, and no `<key>-committee` group exists; no charter
document; `economic-bootstrap-requirements.md` exists (the money layer
this sits on); every *See also* slate resolves. The status block's
*substrate shipped* clause (organizations · appointing authority ·
committee-as-title-holder · pack title claims · maintainers) checks
against `employment.md` / `access.md` / `content-packs.md`. One status
block only.

### Cut (SHIPPED · DOCUMENTED)
- none

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none

### Superseded — cut
- none

### Kept (UNBUILT)
- everything: `## The principle everything below is an instance of` (see Doctrine) · `# Part 1` + five subsections · `# Part 2` + three subsections · `# Part 3` + four subsections · `# Part 4` + `## The bundle, separated` · `# Part 5` · `# Part 6` + three subsections · `# Open questions` (all five open) · `# Build cut` (Stage A / Stage B + the two DRIVEs)

### Doctrine (kept, labelled)
- `## The principle everything below is an instance of` → *"The platform never decides who. It only sets how long."* + *author the ethos, never the outcome* (66–82) — the slate's governing thesis; overlaps `measurement.md`'s layer-3 doctrine and memory's *standing = a RATE*
- `# Part 3` opening blockquote → *"Title over an extent is the only real power. Every seat… is theater performed on that extent — and theater is the product."* (272–274) + the user's frame (28–33)
- `## Committees are gods in exactly one place` → *"No authored field may create money"* (311–312) — stated as a rule *the lint family holds*; no such lint exists yet (the build item is in `Left`)

### Uncertain — kept
- Overlaps for the cluster pass: the wall / the 13th module / charter terms ↔ `amendment-library-slate`; the publish covenant ↔ `attestation-slate` (the admit act) and `land-compute-and-license`; Goodkin's local underwriting ↔ `credit-slate` Part 6; Part 6 supersedes `corpos-slate`'s roster LORE (the slate says so; `corpos-slate` is not in my batch — flagged for whoever compacts it)

### Handoff (belongs in a doc outside my list)
- none

### Status block
- Status: UNBUILT → UNBUILT (unchanged text)
- Left: *the entity-form ladder over a cap table · the charter as a document with grants, duties and a term · committee/show separation · title escheat-up + the vacancy board + intake · the publish covenant · the no-authored-faucet rule · the five corpos re-authored as forms* → the same, plus *the partnership deed + sweat equity · the registry + the general-incorporation act · the managing-position trading rule · equity minimally (primary/secondary · dividends ≤ retained earnings · escheated interests do not vote) · renewal · the wall module · … over the attestation slate's admit act · (a lint) · NPC-floor / player-apex locality seats + municipal paper · … and the four disposition brains* (the body wins: § Formation, § One trading rule, § Equity, § Renewal, § The wall, Part 5 and § What the rewrite touches were unrepresented)
- Size: a build (two stages) → a build (two stages)

---

## docs/slates/builds/blood-slate.md — 551 → 553 · Status UNBUILT → UNBUILT

Verified UNBUILT: `grep -i 'bloodType\|genotype\|transfus\|donat'` under
`packages/server/src/mud` hits only the *comments* in
`lib/metabolism/Metabolic.ts:223,228,903,910` that name transfusion as
the reason the hydration ceiling sits below baseline — no type, no
donation, no bag, no `test`. The substrate table checks:
`introduceToxin` (`Metabolic.ts:437`, called from `CombatLogic.ts:2916`),
`bloodVolume` (`lib/vitals/Vitals.ts:1257`), `forensics` Discipline
(`packages/content/platform/content/platform/idea/Discipline/forensics.yaml`)
+ `analyze postmortem` (`cmd/perception/analyze.yaml:134`) — so *Q1 has a
reader* is true. The *Renown is materialized* warning (200–204) still
holds (`renown.md` l.71 *the materialized per-{subject, scope} aggregate…
refreshed by each recompute*). `physiology-slate § Part 7e` is a stub
pointing here (l.1194–1201), so *sole home* is true. Every linked slate
resolves.

Two of the consequence build's decisions the slate leans on were checked
against code AND doc:
- **D22** (species with no blood) — code `Vitals.hasVitalSign`
  (`Vitals.ts:838`, guard at `:1257` *"deliberate no-op rather than a
  missing branch"*), doc `harm.md` l.410–418. SHIPPED · DOCUMENTED → Q6
  cut with a pointer.
- **D21** (hydration restores plasma volume, never red cells; the ceiling
  below 1.0 is a shape decision) — code `Metabolic.ts:218–232`
  (`PLASMA_RESTORE_HYDRATION_PCT`, `restorePlasma`), **no doc**:
  `grep -i plasma docs/subsystems/*.md` → nothing; `metabolism.md` never
  mentions `bloodVolume`. SHIPPED · UNDOCUMENTED → Handoff below. ⚠ The
  slate's bullet (26–33) is KEPT, not cut, because it is the slate's
  stated premise (*"a sharper motivation than the gap above states"*),
  i.e. spine; the graduation is the doc's gain, not the slate's loss.

### Cut (SHIPPED · DOCUMENTED)
- the second status fragment `**Status: design proposed, nothing built.**` (13, a bold fragment at the head of the blockquote) — history under the one-status-block rule. The rest of that blockquote (the *transfusion economy* framing + the *v1 scope decided: gift-only* paragraph) is spine and KEPT verbatim
- `## Open questions` → Q6 *Species with no blood — ANSWERED by D22…* (512–518, 7 lines) — code: `Vitals.ts:838,1257`; doc: `harm.md` l.410 *"A `vital` effect naming a sign the body does not have is a deliberate silent no-op"*. Replaced by a one-line pointer

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none in the slate itself (D21 goes to Handoff and stays in the slate as premise — see above)

### Superseded — cut
- none

### Kept (UNBUILT)
- the status block (re-stamped) · the framing blockquote · `> ⭐⭐ What the consequence build hands this one` · `## The gap` · `## What already exists` (verified) · `## ⭐ Blood type — the first endowed value` + `### Genotype is stored; phenotype derives` + `### Where the value comes from` · `## ⭐ Compatibility is a cost curve, not a gate` · `## How you get people to give blood` · `## ⭐ Traits — where the thesis actually lives` · `## ⚠ The Titmuss lever — designed-for, NOT v1` · `## The economy` · `## ⭐ Absorbed from physiology-slate § Part 7e` and all of its subsections · `## v1 scope` · `## Open questions` Q1–Q5 · `## What this slate does NOT cover` · `## Cross-references`

### Doctrine (kept, labelled)
- `## ⭐ Blood type` → *"Endow what creates a relationship. Never endow what creates a ranking."* (83–84) — the endowment rule, owned by `lineage-slate § The four kinds of value`; restated here
- `#### Objection 2 — "it reads as blood purity" — INVERTS` → *RULE: blood type is independent of species* + the species-slate refinement *difference that COSTS is character; difference that RANKS is essentialism* (374–395) — species doctrine, also in `species-slate`
- `### The blood economy` → *"Blood donation is the cleanest possible TEST OF THE SOFT-SKILLS THESIS"* (401–406) — a measurement thesis
- `### ⭐⭐⭐ Where CONSENT finally lands` → *implied consent in an emergency; a substance administered without consent is harm* (437–456) — medical-consent doctrine that generalizes past blood (`accountability.md` is the ledger it names; nothing codes the predicate yet — it is in `Left`)

### Uncertain — kept
- `## How you get people to give blood` → mechanism 4 *"Standing, not cash"* relies on renown being movable by a donation; the ⚠ paragraph that follows correctly says renown is materialized and must be recomputed. Both hold today; noted so requirements pick the recompute path, not the append-only assumption
- Overlaps for the cluster pass: the genotype model and the precedence chain ↔ `lineage-slate`; the compatibility graph's *no hierarchy* ↔ `species-slate`; the sell-blood legislative object ↔ `legal-code-slate` / `amendment-library-slate`; the cold-chain courier ↔ `freight-slate`

### Handoff (belongs in a doc outside my list)
- → `metabolism.md` (§ the hydration reconcile, beside the survival reserves): *"Drinking restores plasma VOLUME, not red cells. A body that has lost a lot of blood and taken on water has its volume back and its oxygen-carrying capacity still gone — dilutional anaemia. So hydration's plasma restore (`Metabolic.restorePlasma`, `PLASMA_RESTORE_HYDRATION_PCT` / `PLASMA_RESTORE_L_PER_HOUR`) climbs only to a **fraction** of the species baseline, never baseline. ⚠ That the ceiling sits below 1.0 is a **shape** decision, not tuning: at baseline the world could replace blood by drinking and waiting, which deletes the premise of the blood build (transfusion as the only route back to whole). Raising it is arguing that."* (consequence build D21; the code comment at `lib/metabolism/Metabolic.ts:218–230` is currently its only written home besides `blood-slate` l.26–33)

### Status block
- Status: UNBUILT → UNBUILT (unchanged text)
- Left: *the genotype/phenotype endowment · the compatibility cost curve · the donation loop + the bag · screening · the trait payoff · the Titmuss paid-market lever* → *the genotype/phenotype endowment (`untested` until tested, per-`Species` allele frequencies + the provenance stamp) · the compatibility cost curve (non-hierarchical across species · graded failure · the volume-expander floor) · draw / store / transfuse over `Bulkable` + the `introduceToxin` seam · donation cost on the biological `Reserve` · the summons + the clinic as demand (named shortages · the recipient→donor loop) · screening · the gift-only credits (chronicle deed · disposition credit · the renown move) · the trait payoff · the consent predicate (implied consent in an emergency) · a `test` for your own type · the Titmuss paid-market lever (designed-for, explicitly not v1)* (the body wins: `## v1 scope`'s eight *In* items and § Where CONSENT lands were unrepresented)
- Size: a build → a build

---

## docs/slates/builds/legibility-slate.md — 550 → 552 · Status UNBUILT → UNBUILT

Written 2026-09-16/18; the brief expected nothing to cut. Confirmed.
Verified UNBUILT against HEAD: no `extends:` key on any row under
`packages/content` (`grep -rln '^extends:'` → nothing) and nothing in
`TemplateLogic.ts` / the Hydrator reads one; `cmd/perception/sense.yaml`
and `platform/idea/cmd/perception/SenseController.ts` still ship (Part D's
cut has not happened); no `count`/`as` on a `props:` entry;
`packages/client/src/components/cards/CardBodies.tsx:603` still renders
`` `+${rest} more` `` (Part C's *dead `+N more`*). The slate's own
measurements were taken at `c8c4d5056` and it says to re-take them; a
crude re-count today gives 1,339 rows carrying the `PersistentHydrator`
`hydratorClass` line (slate: 1,214) — the tree grew, the argument did
not change. One status block after the cut below.

### Cut (SHIPPED · DOCUMENTED)
- the second status fragment `**Status: sketch / pre-requirements.**` (15, a bold fragment at the head of the blockquote) — history under the one-status-block rule. The rest of the blockquote (*Written 2026-09-16 out of a design conversation…* + the ⚠ `c8c4d5056` measurement provenance) is spine and KEPT verbatim

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none

### Superseded — cut
- none

### Kept (UNBUILT)
- everything else: *See also* · `## Principle` (see Doctrine) · `## Part A` + its six subsections + `### Open` · `## Part B` + five subsections · `## Part C` + four subsections + `### Open` · `## Part D` + five subsections + `### Open` · `## Why one build`

### Doctrine (kept, labelled)
- `## Principle` → *"Multiplicity has no representation anywhere in this stack"* + the corollary *the authored count and the rendered group are not the same fact* (50–72) — the thesis that makes four parts one build

### Uncertain — kept
- `### ⚠⚠ No content has ever used the substrate that was meant to differentiate them` (431–440) — a **census claim** (*zero* `<sense channel>` regions, *zero* per-channel detail slots across 1,559 rows) measured at `c8c4d5056`; I did not re-run it. Kept as written; requirements should re-take it per the slate's own instruction
- `### Decided: no new gate — and it pays for an old one` says Part A delivers `access.md`'s *deferred v2 relaxation* as a side effect; `access.md` still lists it as deferred — consistent, since nothing shipped. Noted so the access compaction (another batch) does not read this slate as evidence it landed
- Overlaps for the cluster pass: Part D's multi-sense authoring ↔ `senses-slate` (the slate says they are disjoint — physics vs verbs); Part B's `props:` entry shape ↔ `templates.md`'s *don't lock the props entry shape* note

### Handoff (belongs in a doc outside my list)
- none

### Status block
- Status: UNBUILT → UNBUILT (unchanged text)
- Left: unchanged items, plus *(… folded into access.md's transitive set — and the `cp`/`mv` D5 relaxation it delivers)* on the `extends:` item (§ Decided: no new gate was unrepresented)
- Size: a build → a build

---

## docs/slates/tails/language-slate.md — 540 → 464 · Status PARTIAL → PARTIAL

The batch's one slate with real shipped-in-a-different-shape sections.
Verified: the written half is `lib/description/Marked.ts` (`MarkedMixin`
— `getMarkText` · `getMarkForm` · `getMarkModalities` ·
`requiresLightToRead` · `getMarkScript`; `MARK_SCRIPTS` at l.93,
`COMMON_SCRIPT = 'common'` at l.106; the docstring at l.7 *"read =
perceive(the marks) + decode(the script)"* and l.86 *"v1 has exactly one
script and no literacy"*), `cmd/perception/read.yaml` (its `help:` states
the perceive/decode split for players) and
`platform/idea/cmd/perception/ReadController.ts` (l.19 *"Decode. A no-op
pass in v1"*; the perceive step gates light by form via
`requiresLightToRead()`). **No subsystem doc owns any of it**:
`grep -rln 'MarkedMixin\|markScript' docs/subsystems/` → only
`logistics.md` (a consumer mention). The unbuilt half is verified absent:
no `speechLanguage`, `LanguagePath`, `Character.languages`, `Language`
Idea or proficiency anywhere under `packages/server/src/mud` (the only
`proficiency` hit is `Competence.ts:9`'s prose). Every *See also* link
and the study-com cx doc resolve.

### Cut (SHIPPED · DOCUMENTED)
- the second status block `> **Status: design captured, deferred — unbuilt.** …marked future/deferred in-body.` (10–14, 5 lines + blank) — history; it says *unbuilt* of a slate whose written half shipped; the canonical PARTIAL block + the 2026-08-08 audit block are the current state

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none cut on this ground (the write list is empty); the shipped half goes to Handoff below. ⚠ The `> **⚠ AUDIT 2026-08-08**` block (16–48) is KEPT in the slate: it is the only prose statement of the shipped half outside code comments, and it is the PARTIAL slate's *what remains* framing (spine). It should leave the slate once `perceiver.md` (or wherever the coordinator homes it) carries the Handoff paragraph

### Superseded — cut
- `## Layer 3 — Readable tag` body (195–201, 7 lines) — by the code: `Readable.language` shipped as `MarkedMixin.markScript` over `MARK_SCRIPTS` with a `COMMON_SCRIPT` default; `form` / `script` independent axes. Heading + note left (what remains — the `Language` catalogue over `MARK_SCRIPTS` — is in `Left`)
- `## The `read` verb` → `### Shape` · `### Actor-side` · `### Target-side — Readable (new)` · `### Verb controller sketch` (305–369, 65 lines) — by the code: `read.yaml` + `ReadController` over `MarkedMixin`, as perceive + decode with the light gate riding the FORM (not `LightApi.lightAt(actor) < MIN_READ_LUX`), decode a no-op in v1. The sketch's `getReadText`/`getLanguage`/`MixinApi.isReadable` names did not ship. Heading + note left; the note names the `{ language }` rider as still this slate's (§ Layer 5 keeps the design). The durative-`read` pointer to `host-slot-activities-slate` is preserved in the note (`activity.md` l.686 still lists bookmark-on-abort as deferred)
- `### Register-tagged English content` body (384–390, 7 lines) — by the 2026-08-07 decision the slate's own audit records: TOEFL cut as a vertical (`docs/study-com/cx-and-the-aspiring-teacher.md` §1). Heading + note left. ⚠ The framing bullet at 62–64 (*Pedagogical content … English-register variants as a TOEFL-friendly content layer*) is spine and was left; see Uncertain
- `## What ships in this slate` → the `Readable` mixin bullet + the `read` verb bullet (424–426, 3 lines) — shipped as above; replaced by a two-line note
- `### Q6. Light gate for `read`` body (493–496, 4 lines) — by the code: the light requirement follows the mark form (`requiresLightToRead`), not a hardcoded lux constant or a per-Readable `minReadLux`. Heading + note left
- `## Once shaped into formal requirements` → the *`Readable` mixin + `read` verb + light gate* bullet (531, 1 line) — shipped; replaced by a one-line note

### Kept (UNBUILT)
- the status block (re-stamped) · the audit block (see above) · the framing + use cases + *does NOT cover: player-to-player speech* · *See also*
- `## Principle` (see Uncertain) · `## Layered design` (the table's Layer 3 row is now the shipped one; kept whole — it is one table) · `## Layer 1 — Language singleton` + `### v1 roster` + `### Property axis` + `### common is special` (see Uncertain) · `## Layer 2 — NPC speaker tag` + `### Open question: does Vocal actually own this?` · `## Layer 4 — Character proficiency` + three subsections · `## Layer 5 — Render gate` + `### Speech gate` + `### Read gate` + `### Partial-comprehension extension (deferred)` · `## Pedagogical surfaces` → `### Real languages as in-game Readables` · `### Translation tools as content` · `## What ships in this slate` (the rest, incl. the acceptance tests — the first three `read X` tests now exist in shape but the language-mismatch ones do not) · `## Open questions` Q1–Q5, Q7 · `## What this slate does NOT cover` · `## Once shaped into formal requirements` (the rest)

### Doctrine (kept, labelled)
- `## Principle` → *"Languages are data, not behavior… the render-side gate is the only piece of code the system grows"* (92–104)

### Uncertain — kept
- ⚠ **Kept-but-contradicted:** `## Principle`, `## Layered design`, `## Layer 1` and `### Real languages` all place `Language` templates at **`/lib/language/<name>`**. That contradicts the shipped invariant *nothing instances `/lib/`* (`pnpm lint:instanceable`; CLAUDE.md § Instanceable lives in `platform/<branch>/`). The rows belong at `/platform/idea/language/<name>` (or a pack root); flagged in `Left` so requirements move them rather than inherit the path
- `## Layer 1` → *`Language extends SingletonMixin(PropertiedMixin(Idea))` — same shape as `LocomotionMode`, `Material`, `Species`* — those three are now reference Ideas warmed by catalogues (`MaterialCatalogue.warm()`); the shape claim is dated but not wrong. Kept
- `### Q3. Per-language writing system fields` — says `writingSystem` *"is in the schema but not yet consumed"*; the shipped substrate already split `form` from `script` (`MARK_FORMS` / `MARK_SCRIPTS`), so half of Q3 (recognising the letters without the language) has its axis. Kept as still open on the proficiency side
- the framing bullet at 62–64 names the TOEFL-register content layer as a use case; the audit block (44–48) says that justification is stale. Both left in place (spine vs its own correction); requirements should read the audit
- Overlaps for the cluster pass: `Vocal.speechLanguage` and the garble gate ↔ `comms.md` / `messaging.md` (the audit names them); the spellbook comprehension floor ↔ `magic-items.md` (Marked.ts l.21,33 say the mechanic is the same gate); durative `read` ↔ `host-slot-activities-slate`; Q5 (NPC responds in which language) ↔ `npc-dialogue.md` / the LLM-NPC design

### Handoff (belongs in a doc outside my list)
- → `perceiver.md` (a new `### read` beside look/scry/locate — or wherever the coordinator homes the marks substrate), verbatim from the slate's audit block: *"**The `Readable` mixin + `read` verb shipped — as `MarkedMixin`** (`lib/description/Marked.ts`, registered `Marked`) plus `cmd/perception/read.yaml`. **`Readable.language` shipped as `markScript`** — a real field over a `MARK_SCRIPTS` vocabulary with a `COMMON_SCRIPT` default. `form` (how a thing is made — inked vs embossed) and `script` (what system it is in) are already **independent axes**, which is the decomposition this substrate needs and would otherwise have had to introduce. **`read` already decomposes into perceive + decode.** Inked text needs light; embossed text reads in the dark by touch, so the modality falls out of the form. `Marked.ts` reserves the insertion point in so many words: 'v1 has exactly one script and no literacy… a literacy gate would slot into `decode` without disturbing `perceive`.' The spellbook comprehension floor is 'already a decoding gate in all but name'."* — plus the WHY from `Marked.ts` l.67–91: *collapsing form and script is the thing that makes braille and a ciphered dispatch inexpressible; the symmetry (embossed common lettering reads by touch AND vision) is the reason to ship the split before any literacy.* Once a doc carries this, the slate's audit block (16–48) can be cut to a pointer

### Status block
- Status: PARTIAL → PARTIAL (unchanged text; *no owning subsystem doc* re-verified true)
- Left: *the `Language` Idea + catalogue · `Character.languages` proficiency · the `decode` literacy gate · `Vocal.speechLanguage` + the speech garble render-gate · the spellbook comprehension floor* → *the `Language` Idea + catalogue (today `MARK_SCRIPTS` is a bare vocabulary; ⚠ the slate's `/lib/language/<name>` rows must move — nothing instances `/lib/`) · `BodyPlan.nativeLanguages` defaults · `Character.languages` proficiency (binary in v1) · the `decode` literacy gate · `Vocal.speechLanguage` + the speech garble render-gate (+ the `{ language }` rider on `.toSelf`) · the spellbook comprehension floor · proof-of-content rows (a Khazadic sign, a Khazadic-speaking merchant, a Spanish menu)* (the body wins: § What ships names `BodyPlan.nativeLanguages`, the rider and the content rows)
- Size: a wave → a wave

---

## docs/slates/builds/instrumentation-slate.md — 478 → 495 · Status UNBUILT → UNBUILT

The brief flagged the shipped-instruments register as likely drifted. It
has, but only in its COUNTS; the design is wholly UNBUILT. Verified:
no `MeasuringMixin` / `readings` anywhere (`grep -rl` over server + content
→ nothing); `platform/thing/instrument/Sextant.ts:12–15` still affords
the whole `platform/cmd/perception/measure.yaml` on `environment` +
`peers`; `MeasureAltitudeController.ts:51` (`instanceof Altimeter`) and
`:147` (`instanceof Sextant`) still re-check by hand;
`Avatar.ts:231` still contributes `analyze.yaml` on self and not
`measure` (the *accidentally right* split holds); the geological
`strike`/`dip` stanzas still live in the platform view naming
`trade-mining` controllers, with the exact *dies on dispatch with a
controller-error* caveat the slate predicts written into
`measure.yaml:127–143`; `mining.md` l.197–198 records the shipped shape.
`analyze power` shipped (`analyze.yaml:246`) — the closing grain-chain
note's *wheel speed on `look`* has not.

**Count drift (recorded, not rewritten — the counts sit inside kept
UNBUILT paragraphs):** *"the ten instruments in `platform/thing/instrument/`"*
→ eleven (`Balance.ts` and `Hydrometer.ts` landed 2026-09-01 with the
ferment build's W7); *"zero of the 22 `measure`/`analyze` controllers band
on a discipline"* → the kernel tree has 18 `Measure*`/`Analyze*`
controllers today (32 at 2026-09-01 by `git ls-tree`; the paths sweep and
the mining pack moved several), none of which band — but
`trade-mining/src/idea/cmd/perception/{MeasureStrike,MeasureDip,AnalyzeGround}Controller.ts`
DO band by `geology`, so *zero* is no longer literally true of the verb
family. The status block now says so; the retrofit's step 1 is the
inventory that re-takes them.

### Cut (SHIPPED · DOCUMENTED)
- none (one status block already; no section is shipped)

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none cut (write list empty); one Handoff below, its section KEPT as doctrine

### Superseded — cut
- none

### Kept (UNBUILT)
- everything: the framing + *Related* · `## The architecture already exists` (its shipped claims verified — it is the retrofit's premise) · `## ⚠ The aether line` · `## The three gates` · `## Siting` · `## The trades` · `## The social layer` · `## The convergence` · `## Constraints` · `## Where to start — the analyze retrofit` · `## Open questions` (1 partially and 7 answered by USER RULING inside the addendum, not by code — kept, since the addendum's own *Two of this slate's open questions, answered* is the record) · `# Session addendum` → `## The root cause` · `## One thing that is accidentally right` · `## The model` + `### The line between a channel and a bespoke verb` · `## Perceive vs. interpret` + `### Modalities closed, channels open` · `## The implant rung` · `## ⚠ Why this is blocking a build today` (see Uncertain) · `## Two of this slate's open questions, answered` + the grain-chain note

### Doctrine (kept, labelled)
- `## ⚠ The aether line — a modem is not a sense organ` → *Rule: physical sensing can never ride the aether base* + *the aether is the textbook; the instrument is the lab* (54–85) — a base-assignment rule for augments; no doc states it (`grep -i 'physical sens\|aether base' docs/subsystems/augmentation.md` → nothing). Candidate home: `augmentation.md § the three bases`
- `## One thing that is accidentally right, and should be doctrine` → *`analyze` is what you can work out. `measure` is what an instrument tells you.* (278–286) — shipped by accident (`Avatar.ts:231` vs the instruments' contributions), undocumented → Handoff
- `### The line between a channel and a bespoke verb` → *Readings are channels. Procedures are verbs.* (317–327)
- `## Perceive vs. interpret` → *You smell to notice. You analyze to know.* + *the sensorium and the instrument set are one continuum* (329–379)
- `## The convergence` (176–188) — the gamification/transhumanism thesis; overlaps `docs/measurement.md`'s Mara/Aletheia property (*the mirror shows you*)
- `## The two of this slate's open questions, answered` → #7's ruling *asymmetric capability between species is fine; "difference that ranks is essentialism" is about characterization, not capability spreads* (455–463) — species doctrine, ruled by the user; overlaps `species-slate`

### Uncertain — kept
- `## ⚠ Why this is blocking a build today` (434–451) — the *today* is 2026-09-01 and the build it blocked (metal chain, MR!218 / MR!258) has shipped with the workaround the section predicts (`measure.yaml:127–143`; the section itself already says *the plan is retired*). The FINDING (*a pack cannot contribute a subcommand*) is still the current state and is the spec of the wart in `Left`. Kept verbatim; the heading's urgency is history
- `## The root cause` → the two counts above are stale (11 not ten; 18 not 22; the mining trio bands). Kept inside the paragraph per paragraph-granularity; the status block carries the correction
- `## The architecture already exists` → *"The `TravelCard`/`PaymentCard` pair is the worked example: a physical card or an aether update"* — `credential.md` is the doc; the TPA reform moved the travel credential into the `tpa` pack (`fasttravel.md`); the pair-as-exemplar claim is dated but the mechanism (`AugmentMixin.confers()`) is unchanged. Kept
- Overlaps for the cluster pass: the implant rung ↔ `augmentation.md § Wave 2+` (l.14–16, 308) which cites *the slate*; the certification hook ↔ `press-slate`; the labor question (employer-installed mounts) ↔ `employment-arrangements` / livelihood; the search-and-seizure-of-your-body question ↔ `amendment-library-slate`'s 4A gap row

### Handoff (belongs in a doc outside my list)
- → `command-routing.md § Affordance attribution` (beside `commandContributions`): *"`Avatar.commandContributions` includes `analyze` on `self` — and not `measure`. `measure` is afforded solely by the instruments in `platform/thing/instrument/`. The split is deliberate doctrine, not an accident to tidy: **`analyze` is what you can work out. `measure` is what an instrument tells you.** A new instrument affords `measure`; nothing should ever put `measure` on a body."* (from 278–286; code `platform/agent/Avatar.ts:231`, `platform/thing/instrument/*.ts` `commandContributions`)

### Status block
- Status: UNBUILT → UNBUILT; a 2026-09-19 re-verification paragraph added naming what was checked and the count drift
- Left: *the `analyze`/`measure` channel → capability + competence table · the instrument-declared dial (so a pack contributes a subcommand) · the readout ladder · honest refusals · the author/test bypass · the implant rung (Wave 2+)* → *… table (the step-1 inventory) · `MeasuringMixin` on a Thing (`channels` + `read`) with one `measure` verb over a string positional, no subcommands · the instrument-declared dial (so a pack contributes a channel, and the `strike`/`dip` platform-view stanzas retire) · the `readings` companion verb · eyeballing as the body's coarse instrument · route-gated `analyze` (each analysis declares which modalities answer; the output names its route) · the readout ladder · honest refusals · the calibration / certification gate · the author/test bypass, decided before the gates land · the implant rung (Wave 2+ — carried upgradeable, mounted frozen at install) · wheel speed on `look` at a working mill (presentation)* (the body wins: the addendum's § The model, § Perceive vs. interpret, § The three gates #3 and the grain-chain note were unrepresented; *contributes a subcommand* → *contributes a channel* because the addendum's own model retires subcommands)
- Size: a build → a build

---

## Batch totals

| slate | lines | Status | Left items | Size |
|---|---|---|---|---|
| guild | 698 → 702 | UNBUILT → UNBUILT | 6 → 12 | build → build |
| api-normalization | 612 → 613 | UNBUILT → UNBUILT | 7 → 9 | build → build |
| amendment-library | 561 → 566 | UNBUILT → UNBUILT | 3 → 6 | build → build |
| institutions | 552 → 560 | UNBUILT → UNBUILT | 7 → 14 | build → build |
| blood | 551 → 553 | UNBUILT → UNBUILT | 6 → 12 | build → build |
| legibility | 550 → 552 | UNBUILT → UNBUILT | 7 → 7 (+1 clause) | build → build |
| language | 540 → 464 | PARTIAL → PARTIAL | 5 → 8 | wave → wave |
| instrumentation | 478 → 495 | UNBUILT → UNBUILT | 6 → 13 | build → build |

Counts: 7 stale duplicate status lines/blocks cut · 1 answered open
question cut with a pointer (blood Q6) · 1 in-flight note superseded
(api-normalization) · 6 shipped-in-a-different-shape sections cut with
notes (all in language-slate) · 0 graduations written (write list
empty) · 4 Handoffs (call-security.md · metabolism.md · perceiver.md ·
command-routing.md) · 0 ABSORBED · 0 deletions.

Hardest calls, for the reviewer:
1. **Cutting a status SENTENCE below paragraph granularity** (guild,
   amendment-library, blood, legibility). Each older status block was one
   blockquote whose first sentence was a stale status and whose remainder
   was the slate's framing paragraph. Cutting the whole paragraph would
   have removed spine; keeping it would have left two status blocks. I
   cut exactly the `**Status: …**` sentence and nothing else. Every one
   is named above and trivially reversible.
2. **Keeping SHIPPED · UNDOCUMENTED text in three slates** (blood D21,
   language's audit block, instrumentation's *accidentally right*
   section) instead of cutting after Handoff. With an empty write list
   the graduation cannot land in this batch; cutting would have left the
   design living only in this ledger and a code comment until the
   coordinator inserts it. All three are also the slate's own premise or
   what-remains framing. Each is marked *cut to a pointer once the doc
   carries it*.
3. **language-slate's `## The read verb`** — 65 lines of controller
   sketch whose verb shipped under other names with a better light gate.
   Cut as SUPERSEDED with a note that preserves the two things in it that
   are still this slate's (the `{ language }` rider; the durative-`read`
   pointer).
4. **Not rewriting stale counts inside kept paragraphs**
   (api-normalization, instrumentation, legibility). The corrections are
   in the status blocks and this ledger; the paragraphs stay as measured,
   dated, and each slate already tells its reader to re-measure.
