# Law — cluster-merge ledger

Cluster: **law**. Files: `docs/slates/builds/legal-code-slate.md` (1627
lines) · `docs/slates/builds/policing-slate.md` (755) ·
`docs/slates/builds/enforcement-slate.md` (204) ·
`docs/slates/builds/prison-slate.md` (161) ·
`docs/slates/builds/intervention-slate.md` (289). Procedure:
`.claude/skills/compact-slate/SKILL.md` § *The cluster-merge pass*.
Prior compaction passes (done, not repeated): `civics.md` (legal-code),
`accountability.md` (policing), `unlinked-7.md` (enforcement),
`unlinked-8.md` (prison), `unlinked-4.md` (intervention) in this
directory — each already carries the per-section code verification and
the *Uncertain* overlap notes this pass resolves or confirms.

**Canonical: `legal-code-slate.md`** — the largest remaining design, and
the file every other member names as the authority for *the law itself*
(enforcement: *"upstream of prison-slate"*, policing: *"the policy hook —
the charter's first consumer"* is legal-code's phrase; intervention:
*"adjudicating them is → legal-code-slate.md"*). ⚠ But this cluster is
not a parent-and-stubs cluster: per-item ownership was already recorded
by the compaction passes and holds — **enforcement-slate owns** the
mode vocabulary, the evidence firewall, testimony-as-claims and the
intrinsic/social split; **prison-slate owns** confinement, the three
enforcement tiers (meta · locality · Compact) and the guardrail;
**policing-slate owns** the institution (crime, the department, the
policy hook, the Gray, the kit); **intervention-slate** is a combat
slate that only touches law at one pointer. `courts-slate.md`
(2026-09-18, merged; NOT merged into) owns a filing, the clerk, the
pool, jurisdiction by situs — an item in this cluster that is now that
slate's subject gets a pointer, never a cut into it.

**Scope check.** Only duplicated OPEN design is in scope. A phrase census
across the five files (`hooded` · `wall/camera` · `posted law` · `meta
moderation` · `guardrail` · `custody` · `whistle` · `venire` · `courts`
· `prosecut` · `honest error` · `firewall` · `restrain` · `charter`)
found **no section restated in a second file** — every cross-file hit
is a one-line citation of the owner (*"per the enforcement slate"*,
*"(prison-slate)"*, *"the policing hook's requirement"*). The
compaction ledger for policing had already concluded the same
(*"neither restates them — no duplication to note beyond the
pointers"*). So the outcome is **KEEP throughout**: no section cut, no
section moved, no file retired, no status block re-stamped. What this
pass does do is the one thing the cluster pass owns besides moves —
**re-point references to a design that has since acquired a file**:
four members refer to *"the courts/venire primitive"* or state that
*"there is no courts/judiciary slate in the tree"*; `courts-slate.md`
now exists, and each such reference gets a link **appended** (never
replacing the original words). Every appended pointer is listed per
file below and is the only edit made.

Not touched (out of cluster; pointers only, per the assignment):
`guild-slate` (policing Part V–VI: *a guild is chartered, a gang is
not*; the charter petition), `freight-slate` (the barricade — `wall`
mode's physical form; the takings path), `cooperative-slate`
(delegation), `amendment-library-slate` (the veto, the roll),
`branch-policy-slate` (the `writers` policy), `combat-slate` /
`combat-experience-slate` (intervention's siblings).

---

## docs/slates/builds/enforcement-slate.md — secondary (204 → 205)

### Conservation table

| secondary heading / item | outcome |
|---|---|
| Title, status block, *Captured 2026-07-31* paragraph, *Related* list, *Institutional sibling* paragraph | KEPT — spine. One edit in the *Related* list: *"the courts/venire primitive"* now reads *"the courts/venire primitive — now [courts-slate](./courts-slate.md)"* (link appended; original words kept). |
| `## The enforcement-mode vocabulary (closed set)` — the wall/camera/witness/norm table, the speed-camera doctrine, the barricade blockquote, *posted law is a hard build requirement* | KEPT — this slate's own (the owner of record). legal-code's instrument table cites it (*"with a mode (wall/camera/witness/norm)"*) and legal-code's clause example carries `mode: wall` — citations of the owner, not restatements. The barricade blockquote is a pointer into `freight-slate` (out of cluster), untouched. |
| `## The evidence firewall` | KEPT — owner. policing Part IV's pedagogy (*"the evidence firewall makes that honest"*) and policing § Corpos (*"you cannot forge the record, but you can enter lies into it — the testimony model applied to business records"*) are applications that cite it; nothing duplicated. |
| `## Testimony — reports are claims, never queries` — the three categories, the lie discriminator, the scope rail, the four costs, the meta rail | KEPT — owner. policing § pedagogy item 2 (*honest misidentification … the hooded figure at dusk*) is a one-sentence use of the *honest error* category, not a second design. ⚠ Overlap for requirements, not merged: *"false accusation is an offense the courts can hear"* ↔ `courts-slate` Part 6's baseless-filing rule — the same idea in two registers, neither built (already flagged in the courts compaction ledger). courts-slate Part 2 adopts this section's rule verbatim in spirit (*"Facts are the engine's; testimony is claims … A claim is never a query"*) and cites this slate as its source — the ownership runs the right way. |
| `## The two layers — intrinsic vs. social` | KEPT — owner. policing § *Is crime evil, or chaotic* (*"opposite sides of the enforcement slate's firewall"*) and Part VI (*"the intrinsic/social split holding at the competence layer"*) apply it by citation. |
| `## Open questions (for requirements)` Q1 (assertion surface), Q2 (trait magnitudes), Q3 (instrument evidence rules), Q5 (wall-mode honesty) | KEPT — this slate's own. Q3 (chain-of-custody for recordings, a locality barring instrument evidence) touches courts-slate's *fact record the clerk assembles* — the evidence rules stay here; courts-slate cites this slate for them. |
| Q4 (*mode declaration shape — where a rule's enforcement mode lives on the Government/Locality data, and how the border notice renders it*) | KEPT whole (the question is one paragraph; cutting the answered half would be below paragraph granularity). ⚠ **Half-answered by the canonical**: `legal-code-slate § A law is prose plus typed clauses` places the mode on the prohibition clause (`clauses[].mode`) of a `kind: law` document under `<extent>/law/`, and § *The docket → Two small calls* names `government` as the posted-law reading surface. The *render* half (the border notice) remains this slate's. No text added to the question — the prior policing compaction ledger already ties Q4 to policing Q2 and `civics.md § Deferred`; the coordinator's requirements pass should read the three together. |

Nothing lost: every heading is KEPT. Not retired (the whole body is
this slate's own subject). Status block unchanged — `Left` still
matches the body (the compaction pass re-stamped it on 2026-09-19 and
nothing here moved).

## docs/slates/builds/prison-slate.md — secondary (161 → 167)

### Conservation table

| secondary heading / item | outcome |
|---|---|
| Title, status block, *Captured 2026-08-01* paragraph, *Related* list | KEPT — spine. One edit in the *Related* list: *"the courts/venire primitive (the appeal path)"* now reads *"the courts/venire primitive (the appeal path) — now [courts-slate](./courts-slate.md)"* (link appended). |
| `## The three enforcement tiers — and the guardrail above all of them` | KEPT — owner. policing § Rails cites it in one bullet (*"The meta guardrail stands … ([prison-slate])"*); legal-code § *The founding corpus → B* cites it (*"precisely the layer confusion prison-slate forbids"*); enforcement's *Meta rail* is a different rail (weaponized reporting) that applies the same doctrine. No restatement anywhere. |
| `## PrisonMixin — a locality you cannot leave` — the boundary, the custody book, cells on the residence spine, interior law, the panopticon skin, visitation + appeal, the skin checklist, the experience rule | KEPT — owner. Two seams to note, neither a duplicate: (a) *intake is a custody transfer with an accountability ledger entry* is the far end of policing Q10 (*the actual custody handoff into the prison slate's intake*) — complementary halves of one seam, correctly split between the two owners; (b) *"the exit path points at the courts (the venire primitive): commitment appealable, parole petitionable"* ↔ `courts-slate` Part 5 `court appeal` (*named now, built later*) and its open question 5 — the appeal mechanism is courts-slate's, the fact that confinement must have one is this slate's. Text untouched (the Related-list link covers the re-point). |
| `## The federal facility — Saxonberg's, of its own design` | KEPT — owner (the reserved parcel is `saxonberg-city-slate`'s; out of cluster). |
| `## Timing — the split` | KEPT — owner. Consistent with legal-code § *The founding corpus → B/C* (a minimal criminal code + institutional authorization ship at founding), so *"built alongside the first criminal-code act"* stays coherent. |
| `## Open questions` Q1 (*Are Compact crimes diegetically prosecuted at all?*) | KEPT verbatim, **pointer appended**: `courts-slate` (2026-09-18) puts the Compact's Art. VI court on the same substrate with `/compact` as its jurisdiction and lists **disbarment** (code-trust abuse) and Art. VI attestation on its docket — a partial answer from the newer slate, recorded under the question so requirements do not re-derive it. Not a DUPLICATE: the question (meta-handled with a visible face vs. diegetic trial) is still open for record-tampering and conservation fraud, which courts-slate does not list. |
| Q2 (what confinement restricts), Q3 (interim committal authority), Q4 (escape), Q5 (fines vs. terms), Q6 (mixin placement) | KEPT — this slate's own. Q3 sits beside legal-code § *founding corpus → C* (enabling acts ship) — a dependency, not a duplicate: legal-code says the watch and the reserved prison site are *authorized* at founding; this slate's instinct that the facility *does not operate until law does* is compatible with received law being on the books from day one. |

Nothing lost: every heading is KEPT. Not retired. Status block
unchanged (nothing moved; the 2026-09-19 compaction re-stamp stands).

## docs/slates/builds/intervention-slate.md — secondary (289 → 291)

A combat slate, placed in this cluster for its one law-facing seam (the
law after the fact) and the constable/bouncer standing question. It
duplicates nothing in the other four.

### Conservation table

| secondary heading / item | outcome |
|---|---|
| Title, status block | KEPT — spine, unchanged. |
| `## The gap` (incl. the *fight parley* lesson) | KEPT — own subject (combat). |
| `## What already exists` | KEPT — own (code table; the `enforces` omission is already flagged in the unlinked-4 compaction ledger). |
| `## ⭐⭐⭐ The three things the model cannot say` — §1 sideless participant · §2 pair relation · §3 restraint terms | KEPT — own. ⚠ Overlap for requirements, not merged: §3 (*terms that authorize force to stop force — restraint, a kind a court would treat differently*) is the substrate policing-slate's arrest needs — policing § *The kit* (*restraints → the arrest mechanic — custody, not damage*) and policing Q10 (*a resisted arrest … without becoming a damage race*) name the same missing terms kind from the institution's side; the policing compaction ledger already asks for *subdue → restrain → custody*. Two owners of two ends of one seam; neither restates the other. |
| `## ⭐⭐ The two poles that exist, and the hole between them` | KEPT — own. |
| `## ⭐⭐ The experience` | KEPT — own. *Going through a peacemaker is a DIFFERENT ACT* lands on `accountability_events`, which is shipped substrate; no law slate designs it. |
| `## ⭐⭐ Standing — who may do this` | KEPT — own. Names *a constable (an office)* among candidates; policing-slate models the constable as a **position in a department** (Business/Organization roster), not an office, and this slate itself concludes *"the cheaper answer is positions"* — consistent; noted so requirements do not read *office* as a governance seat. |
| `## ⚠ What must not happen` | KEPT — own. |
| `## Open questions` Q1–Q7 | KEPT — own (all combat-shaped; Q6's `guards` brain is `combat-slate`'s, out of cluster). |
| `## What this slate does NOT cover` — *The law after the fact* bullet | KEPT verbatim, **pointer appended**: the bullet says *"⚠ There is no courts/judiciary slate in the tree, and this build will hand one a reason to exist"* — there is one since 2026-09-18; a parenthetical link to [courts-slate](./courts-slate.md) is appended after the sentence (original words kept; the `legal-code-slate` pointer for adjudication stays, since legal-code is still where the offence would be defined and courts-slate is where it would be heard). |
| … the other five bullets (de-escalation, group morale, pursuit, crowd behaviour, the bar's staffing) | KEPT — own; pointers to out-of-cluster combat slates and shipped `employment.md`. |
| `## Cross-references` | KEPT — spine. |

Nothing lost: every heading is KEPT. Not retired. Status block
unchanged.

## docs/slates/builds/policing-slate.md — secondary (755 → 759)

The institution; the cluster's second-largest design. Its compaction
ledger (`accountability.md`) already established that it cites but
never restates enforcement-slate's four owned items or prison-slate's
tiers. Confirmed on a whole read.

### Conservation table

| secondary heading / item | outcome |
|---|---|
| Title, status block, *Captured 2026-07-31* paragraph, the siblings paragraph | KEPT — spine, unchanged. |
| **Part I** `## Organized vs. ordinary: the difference is governance, not violence` | KEPT — own (doctrine, already labelled so by the compaction pass). legal-code § *Each charter declares its own enactment process* (*"a gang → whatever the boss says (unchartered, but written)"*) and § *The substrate* (*"a gang keeping a written code is mechanically identical to a guild keeping one"*) are the law-side consequences of this thesis, not restatements. |
| `## The insulation structure — mechanically true here` | KEPT — own (kept-but-contradicted per the compaction ledger: `killerFor` now blames a declared institution; unchanged here). |
| `## Corpos and white-collar crime` | KEPT — own. *"you cannot forge the record, but you can enter lies into it — the testimony model applied to business records"* cites enforcement § Testimony; *wage theft* is one item in legal-code's minimal criminal code list — a citation each way. |
| `## Is crime evil, or chaotic? Neither — it is a *social* fact` | KEPT — own; applies enforcement's intrinsic/social split to the alignment axes by citation (*"opposite sides of the enforcement slate's firewall"*). |
| **Part II** `## The aesthetic arc — each mode is an argument` | KEPT — own. |
| `## What "police" encompasses (a bundle nobody knows is a bundle)` | KEPT — own. ⚠ Kept-but-diverging from the newer slate: *"NOT in the bundle: prosecution (a separate office with separate discretion), judgment (sortition juries)"* — `courts-slate` (2026-09-18) designs **no prosecutor**: a complainant with standing files, a clerk executes, a drawn panel judges. The *judgment* half agrees (the pool); the *prosecution-as-office* half is this slate's contrary position. Not cut (one paragraph, own subject); flagged with Q3 below. |
| `## Organization` | KEPT — own (kept-but-contradicted per the compaction ledger: departments are `Organization`s; unchanged here). |
| `## The aesthetic target — the constable you know by name` | KEPT — own. |
| **Part III** `## Three tiers — and the middle one is the pedagogical prize` (kernel / law / policy) | KEPT — own. ⚠ Not prison-slate's tiers (meta / locality / Compact) — the compaction pass already separated the two vocabularies; no duplicate. The *Law → a crime → the courts* cell is a pointer word. |
| `## The mechanism: resolve-on-read, never push` | KEPT — own. |
| `## The policy vocabulary (small and closed, because it must execute)` | KEPT — own. Distinct from enforcement's mode vocabulary (wall/camera/witness/norm sets how a *rule* is enforced; these six fields set what an *officer* is instructed to do). |
| `## The loop — every link shipped or designed` | KEPT — own. *"the record carries the policy version in force at the time"* is the requirement legal-code § *History* and § *"As it stood" comes free* cite as *"the policing hook's requirement"* — legal-code supplies the mechanism (derive the code as of a date), this slate the consumer. Complementary, not duplicated. |
| `## Failure modes to build for` | KEPT — own (civilian review → amendment-library, out of cluster). |
| **Part IV** `## The dynamics that fall out` | KEPT — own. |
| `## The pedagogy — what everyone learned from cop shows` | KEPT — own (doctrine). Items 1–2 cite the firewall and *honest error* (enforcement's) in one sentence each; *prosecutorial discretion … an office with a name and a record* carries the same divergence from courts-slate noted above. |
| `## Rails (standing)` | KEPT — own; the meta-guardrail bullet is a one-line citation of prison-slate (owner). |
| `## Open questions (for requirements)` Q1 (*wanted* as belief), Q4 (gang content shape), Q5 (civilian review), Q6 (order-maintenance loop), Q8 (credential-to-serve), Q9 (whistle response) | KEPT — own. |
| Q2 (*the charter document schema — how policy is authored in the CMS, versioned, rendered readable*) | KEPT — own. Overlap noted, not merged: legal-code § *A law is prose plus typed clauses* + § *The Code* is the natural template for a readable, versioned governance document, but a commissioner's **policy** is by this slate's own three tiers not a **law** (a job matter, not a crime) — so legal-code does not answer it. Sits beside enforcement Q4 and `civics.md § Deferred` (the charter as a readable StoredDocument); requirements read the three together. |
| Q3 (*prosecutorial discretion's home — is charging an office, and who holds it?*) | KEPT verbatim, **pointer appended**: `courts-slate` Part 3 answers the same question differently (no prosecutor — a complainant with standing files). Two unbuilt answers to one question; the pointer names the divergence under the question so requirements reconcile rather than inherit one by accident. Not a DUPLICATE (the answers differ; cutting would drop this slate's position). |
| Q7 (*the charter petition*) | KEPT — own; ↔ `guild-slate` (out of cluster; pointers only). |
| Q10 (*restraint and arrest — the custody handoff into the prison slate's intake*) | KEPT — own. The near end of the seam whose far end is prison § PrisonMixin's *intake is a custody transfer with an accountability ledger entry*; the terms kind it needs is intervention § *3. Terms that authorize force to stop force*. Three slates, three ends of one seam — none restates another. |
| **Part V** the BUILD DECIDED 2026-09-03 blockquote (lending gate · exclusion as one system · warehouses shrink the Gray) + the district premise | KEPT — own; ↔ `credit-slate`, `freight-slate`, `settlement-model.md § 9/11`, `venue-and-supply-slate` (all out of cluster). |
| `## What the gang sells — four services the city doesn't provide *there*` | KEPT — own. |
| `## Roster, and the periphery where it touches the legitimate world` | KEPT — own (inherits the insulation premise flagged above). |
| `## Predator *and* instrument (the nuance that makes it good)` | KEPT — own. |
| `## Enforcement dynamics — including one counterintuitive result` | KEPT — own. |
| `## Five ways to play it, all live` (incl. naming) | KEPT — own. |
| **Part VI** `## A guild is chartered; a gang is not` | KEPT — own; ↔ `guild-slate` (out of cluster; pointers only). legal-code's `charter` instrument row is the law-side object; the petition is this slate's. |
| `## Policing is a Discipline; crime is not` | KEPT — own (the `guarding` Discipline question is in the compaction ledger). |
| `## The levelling mechanic — police don't need to win, they need to not lose` | KEPT — own. |
| `## The kit — denial, not damage` | KEPT — own (see Q10 / intervention §3 for the restraint seam). |
| `## Aesthetics — multi-genre without incoherence` | KEPT — own. |

Nothing lost: every heading is KEPT. Not retired. Status block
unchanged (the 2026-09-19 re-stamp stands; nothing moved).

## docs/slates/builds/legal-code-slate.md — canonical (1627 → 1627, untouched)

Nothing was moved in, so no `## Absorbed from …` section exists and no
re-stamp is due. Tabled at the `##` level as the assignment allows, so
the reviewer can see what each section's cross-file relationship is.

| canonical `##` heading | relationship to the cluster |
|---|---|
| Title, status block, brief, *Related* list | KEPT — spine. ⚠ The *Related* list names enforcement- and policing-slate but not prison-slate or `courts-slate` (which names legal-code as its seam: *"a matter vocabulary is the seam between them"*). Not added by this pass — a See-also entry is the sweep's/coordinator's call, not a re-point. |
| `## The substrate` (`<extent>/law/`, the 2026-08-04 correction) | KEPT — own. The *any institution gets a code at its own root* clause is what makes policing's *a gang is a Business that commits crimes* hold on the law side. |
| `## The instrument taxonomy — the type *is* its consumer` | KEPT — own. The *prohibition … with a mode (wall/camera/witness/norm)* row cites enforcement (owner); the *adjudicative … issues from courts* row is now `courts-slate`'s object. |
| `## Shipping with laws on the books: model received law` | KEPT — own. |
| `## A law is prose plus typed clauses` | KEPT — own. Carries `clauses[].mode` — the *where* half of enforcement Q4 (see that table). |
| `## History: append-only, so the code has a past` | KEPT — own; cites *the policing hook's requirement* (policing § The loop) as a consumer. |
| `## Deliberation pointers — legislative history, first-class` | KEPT — own. |
| `## Each charter declares its own enactment process` | KEPT — own; the gang/guild lines are consequences of policing Part I / VI, not restatements. |
| `## Hierarchy is declared, never assumed` | KEPT — own. |
| `## Codification and chronology — both, and the code is derived` (Roll · Code · as-it-stood · subject placement · three layers · conflict lint · the story) | KEPT — own. |
| `## The docket — the third sibling` (placement · the sweep · kind vocabulary · press payoff · sealing · sweep rules · two small calls) | KEPT — own. ⚠ Vocabulary collision for the coordinator: this *docket* (the legislature's journal of state changes) and `courts-slate`'s *docket* (the list of pending cases, *"the docket is public"*) are two things with one word. Neither slate is wrong; a requirements pass touching either should pick the names. |
| `## Prose ⊗ clause authority — RESOLVED` | KEPT — own. |
| `## Sunsets — expiry, and what it does to power` | KEPT — own. |
| `## The founding corpus — what ships on the books` | KEPT — own. B cites prison-slate's guardrail (owner); C authorizes the watch and the reserved prison site (policing/prison content); D's *procedural minimums* is the law that `courts-slate`'s lifecycle would run under — courts designs the mechanism, this section only says a minimum ships and that burden-of-proof and standing are amendment material, not defaults. |
| `## Storage — the tree, because law is jurisdictional` (Compact exception · `writers` → branch-policy-slate · residual gap · sibling candidates) | KEPT — own (branch-policy-slate out of cluster). |
| `## The catalog and adoption — laws are shared, histories are local` | KEPT — own. |
| `## The enactment check — one system, three weight resolvers` | KEPT — own (veto ↔ amendment-library-slate, out of cluster). |
| `## Conviction weighting — shipped, and what actually remains` (delegation → cooperative-slate) | KEPT — own (out-of-cluster pointer). |
| `## The vote as spectacle — and the play chamber` | KEPT — own. |
| `## The passage rule — RESOLVED` | KEPT — own (the reservoir conflict stays a requirements decision per the civics compaction ledger). |
| `## The roll — disenfranchisement by inactivity` | KEPT — own (↔ amendment-library-slate, out of cluster). |
| `## Worked example: the turnpike trust` | KEPT — own (↔ freight-slate, out of cluster). |
| `## Open questions (for requirements)` | KEPT — spine. Q6 (*citation format — in argument, testimony, and contract clauses*) is the one that meets enforcement's assertion surface (Q1) and courts-slate's claim record; noted for requirements. |

---

## Re-stamps

None. No section moved into or out of any file, so every `Left` still
describes its body exactly as the 2026-09-19 compaction pass left it.
Line counts moved only by appended pointers: enforcement 204 → 205,
prison 161 → 167, intervention 289 → 291, policing 755 → 759,
legal-code 1627 → 1627.

## Retirements

None. Every secondary keeps a body that is its own subject.

## Edits made (the complete list)

1. `enforcement-slate.md` *Related* list — appended *"— now
   [courts-slate](./courts-slate.md) (2026-09-18)"* after *"the
   courts/venire primitive"*.
2. `prison-slate.md` *Related* list — the same appended link after
   *"the courts/venire primitive (the appeal path)"*.
3. `prison-slate.md` Open question 1 — appended a parenthetical pointer
   to courts-slate's `/compact` jurisdiction + disbarment (partial
   answer; the question stays as asked).
4. `intervention-slate.md` § *What this slate does NOT cover*, *The law
   after the fact* — appended a parenthetical after *"There is no
   courts/judiciary slate in the tree"*: there is now.
5. `policing-slate.md` Open question 3 — appended a parenthetical
   pointer naming courts-slate's contrary answer (no prosecutor).

Nothing was deleted, reworded or reflowed in any of the five files.

## For the coordinator

- **Prosecution.** policing-slate (Q3, § the bundle, § pedagogy) wants a
  prosecutor's office; `courts-slate` has none (complainant files, clerk
  executes, panel judges). Two unbuilt answers; whichever requirements
  pass comes first decides. Pointer left under policing Q3.
- **Two dockets.** legal-code's *docket* (the legislature's journal —
  `government docket`) and courts-slate's *docket* (pending cases) share
  a word. Pick names before either builds.
- **Collection.** courts-slate's See-also says enforcement-slate holds
  *"where collection lives — the court enters a judgment, enforcement
  collects it."* enforcement-slate has no such section; the nearest
  owners are policing (arrest/custody, Q10) and the credit/takings work
  (out of cluster). Somebody should own *collection of a judgment*
  explicitly; today no slate does.
- **legal-code's See-also** lacks prison-slate and courts-slate; sweep's
  call.
- **The restraint seam** spans three files (intervention §3 restraint
  terms · policing Q10 + § the kit · prison intake). No duplication, but
  a requirements pass for any one of them should read all three.
