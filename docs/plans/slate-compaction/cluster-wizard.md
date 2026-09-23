# Wizard / access — cluster-merge ledger

Cluster: **wizard / access**. Files:
`docs/slates/builds/wizard-axis-cleanup-slate.md` (183 lines) ·
`docs/slates/builds/wizard-duty-slate.md` (335) ·
`docs/slates/builds/wizard-bar-slate.md` (233) ·
`docs/slates/tails/access-slate.md` (329) ·
`docs/slates/builds/call-security-pass-slate.md` (231) ·
`docs/slates/builds/agency-slate.md` (215). Procedure:
`.claude/skills/compact-slate/SKILL.md` § *The cluster-merge pass*.
Prior compaction passes (done, not repeated; each carries the per-section
code verification): `unlinked-7.md` (wizard-axis-cleanup), `unlinked-4.md`
(wizard-duty), `parcel.md` (wizard-bar, access), `unlinked-5.md`
(call-security-pass), `unlinked-6.md` (agency).

No build worktree runs from any of these (`git worktree list`:
`build/economic-bootstrap`, `build/fishing`, a detached build-3,
`design/treatment`) — merging is permitted.

## Canonicals — two, by subject

This is not a parent-and-stubs cluster; it is three subjects that
overlap at two seams.

- **The `requiresWizard` / `isWizard` census and its re-gating →
  `wizard-axis-cleanup-slate.md`.** The newer (2026-09-03) and complete
  inventory (four tables, W0–W4 sequencing, the settings-tier split);
  the code itself defers to it (`AccessLogic.ts:141-147`'s comment on the
  `isAgentOf` short-circuit: *"see the wizard-axis-cleanup slate"*).
  `wizard-duty-slate § Axis hygiene` (2026-08-04) is the earlier form of
  the same census — eight rows, two since resolved (`house` seat-gated,
  `pack` on `requiresPackInstaller`), four live sites missing
  (`lease`/`unlease`/`cms`/`studio`) — and is the secondary at this seam.
- **The duty — break-glass, the conspicuous record, the recursion, the
  good-faith limit → `wizard-duty-slate.md`.** `wizard-bar-slate`
  names it *"the parent"* twice and states that the record of wizard
  reads/impersonations *"is the parent slate's break-glass extension"*.
  wizard-bar is the secondary at this seam; it KEEPS its own subject
  (the bar as an institution: admit/publish/hear/disbar, the
  configuration-not-kernel test, the safe harbour as the product).
- **The safe harbour's TEXT** is the bar's (it claims it as *"the actual
  product"* and its Q2 asks for the text); the parent's Q2 asks the
  question. Both keep their sections; the `Left` lists stop
  double-counting it (below).
- **`access-slate` · `call-security-pass-slate` · `agency-slate` —
  KEEP throughout**, each its own subject (the `can()` seam and its
  unbuilt action-level consumers · trust = TEMPLATE + FUNCTION and the
  `@Audited` rail · principal/agent in the execution context). No
  section of any of the three restates a wizard-slate section or each
  other; the only edits are appended cross-pointers, listed per file.

Doctrine that governed the calls: ⛔ never a new `isWizard` check — the
answer is a SEAT or NO CHECK; `requiresWizard` is the TypeScript-escape
axis only; everyone is an author — an *"author tier"* is a category
error; guards constrain good faith only; ⚠ code-trust never flows
through agency.

---

## docs/slates/builds/wizard-duty-slate.md — secondary at the census seam · canonical at the duty seam (336 → 310)

Secondary to `wizard-axis-cleanup-slate` for ONE section (§ *Axis
hygiene*); canonical for everything else (wizard-bar's parent). Moves
went verbatim into `wizard-axis-cleanup-slate § The inventory` as two
labelled subsections placed directly after the *✗ Must lose the axis*
table (the provision row they detail): `### Absorbed from
wizard-duty-slate — ⚠⚠ Axis hygiene (the 2026-08-04 classification)`
and `### Absorbed from wizard-duty-slate — ⚠⚠⚠ And one of them is a
probable live defect`. Byte-identity of the moved text against `git
show HEAD:…wizard-duty-slate.md` lines 269–272 · 274–285 · 298–313 was
diffed: identical.

### Conservation table

| secondary heading / item | outcome |
|---|---|
| Title · status block · *Captured 2026-08-04* + the tetrad paragraph · *Related* | KEPT — spine. Status block RE-STAMPED (below). |
| `# ⭐ The premise, stated without comfort` · `## ⭐⭐ And the case that matters most here is not snooping` | KEPT — this slate's own doctrine (the prior pass labelled it *Doctrine*). |
| `# ⭐⭐⭐⭐ The law the technology suggests: constrain by DUTY` · `## ⭐⭐ A wizard is a wizard regardless of position` · `### ⚠ And the recursion has an answer, up to a point` | KEPT — own; wizard-bar cites the recursion (*"the recursion still bottoms out in exit"*) and the second half of that bar bullet is the bar's own argument, so the bar keeps its bullet (see the wizard-bar table). |
| `# ⭐⭐⭐ Carve-outs: prohibition is the wrong shape` | KEPT — own. |
| `## ⭐⭐ Break-glass already is the corpus's vocabulary` (extend break-glass to READS and IMPERSONATION; the four-row table; approval-before is the trap) | KEPT — own and canonical: wizard-bar's *"the conspicuous record"* `Left` item was this item counted twice; the bar's `Left` now points here (see the wizard-bar table). |
| `## ⭐⭐⭐⭐ `su` should be AGENCY, not identity substitution` | KEPT — own (the wizard's use of agency, a consumer). `agency-slate § What it unblocks` did not list `su`; a one-line pointer bullet was APPENDED there (see the agency table). Nothing moved. |
| `## ⭐⭐⭐ The meta-design that makes it hold` · `## ⚠ The honest limit, and why it is acceptable` | KEPT — own and canonical; wizard-bar § *What the bar does not fix* bullet 3 restated *The honest limit* word for word and is cut there → pointer. |
| `## ⭐ The asymmetry psychology makes uncomfortable` (subject notification) | KEPT — own. |
| `# The mechanisms, ranked by whether they survive a hostile wizard` (+ *"an operator can defeat any IN-SYSTEM control"*) | KEPT — own and canonical; wizard-bar § *What the bar does not fix* bullet 1 restated the operator-defeats line and is cut there → pointer. The bar's functions table (Publish / Disbar) and its dial table (two-person rule, JIT) CITE rows of this table by name — citations, untouched. |
| `# ⭐⭐ The video: "The people who can see everything"` | KEPT — own. |
| `# ⚠⚠ Axis hygiene` → heading + *Captured 2026-08-04, found while designing credit-slate* | KEPT — heading + provenance line, followed by the one pointer paragraph *Merged 2026-09-21 (cluster pass)…* naming the canonical's sections. |
| § Axis hygiene → the user quote *"none of this shit should be using `requiresWizard`… exactly one thing — writing TypeScript code"* (2 lines) | DUPLICATE → `wizard-axis-cleanup-slate § The rule, as stated by the user` (*wizardness is TypeScript access, that is all it is* — same rule, the user's fuller statement, with the write/eval/file-ops enumeration). Cut; covered by the pointer paragraph. |
| § Axis hygiene → *⭐ The correction already has a precedent in the codebase* (banking.md `reserve`, Governor-gated; *"the template; it was simply never generalized"*) (4 lines) | MOVED → `wizard-axis-cleanup-slate § The inventory › Absorbed from wizard-duty-slate — Axis hygiene`, verbatim. The canonical lacked it (the prior wizard-axis ledger noted *"`requiresGovernor` is the shipped precedent … and is not cited by the slate"*). |
| § Axis hygiene → *Every `requiresWizard` call site, classified* + the 8-row table (12 lines) | MOVED → same subsection, verbatim, whole (a table is one paragraph). Row-level accounting: `eval` / `reload` / `git` / `practice` / `provision` rows DUPLICATE the canonical's *Keeps the axis* / *Must lose* tables; `pack` and `house` rows are RESOLVED (status line says so; `pack.yaml:43` `requiresPackInstaller`, `house.yaml` seat-gated) and travel as history; the `config` row carries a verdict that DIFFERS from the canonical (*an administrative axis (PM / ops)* vs the canonical's Tier B stays behind `config` / Tier C → an office) — the differing detail is why the table moved rather than being cut, and the labelling blockquote above it says so. |
| § Axis hygiene → the *⭐⭐ The tell: four of the eight…* blockquote | KEPT — mixed paragraph: its first half is the canonical's *"the seat is missing"* finding, its second half (*a duty attaches to a capability; it cannot if the capability means four different things*) is this slate's own bridge from axis hygiene to the duty. Kept whole in place. |
| `## ⚠⚠⚠ And one of them is a probable live defect` (heading + 3 paragraphs: Katie is not a wizard and `dispatch`es `provision`; forced dispatch does NOT skip validators; the fix is the re-gate, not deleting the validator; needs live-driving) (16 lines) | MOVED → `wizard-axis-cleanup-slate § The inventory › Absorbed from wizard-duty-slate — ⚠⚠⚠ And one of them is a probable live defect`, verbatim. The canonical's *Must lose* row named only the controller bypass (since re-homed to `AccessLogic.isAgentOf`) and lacked the Katie path, the *re-gate not delete* rule and the live-drive requirement. Still live in code: `provision.yaml:19` carries `requiresWizard`; `npc-dialogue.md § The dispatch effect` says validators run on a forced dispatch; `ProvisionController.ts:20-30`'s docblock still asserts the bypass. ⚠ `residence.md:225` linked *wizard-duty-slate § Axis hygiene* for the re-gate — RE-POINTED to the canonical (below). |
| `# Open questions` 1 (one duty or two) · 0 (`su` before/after agency) · 3 (constitution or grant) · 4 (JIT) · 5 (client witnesses) | KEPT — own, verbatim. |
| Q2 (*What is the safe harbour?*) | KEPT verbatim + a pointer APPENDED (*→ the harbour is wizard-bar-slate's product (§ What the bar does); its text is that slate's Q2*). The two slates split it: this one asks the question, the bar owns the artifact. |

### Status block (re-stamped)
- Status line: `12 views` → `11 views (re-counted 2026-09-21)` — the grep finds eleven `requiresWizard` sites under `packages/content/**/cmd/` (`git`, `config`, `cms`, `reload`, `studio`, `practice`, `eval`, `unlease`, `lease`, `provision`, `unprovision`); *"Since the table below"* → *"Since the 2026-08-04 classification (now in wizard-axis-cleanup-slate)"* because the table left.
- Left: *re-gating the non-code-trust sites … · live-driving the Katie `dispatch provision` path · break-glass … · `su` … · the duty text + safe harbour in the wizard grant · subject notification … · the appendix* → *break-glass declared-purpose logging for reads and impersonation (the conspicuous record) · `su` as an agency consumer · the duty text in the wizard grant (the safe harbour's TEXT is wizard-bar-slate's) · subject notification on record access · the "people who can see everything" appendix*, plus an explicit ⚠ line saying the axis re-gating and the Katie live drive are wizard-axis-cleanup-slate's. Two items left the list: the re-gating (DUPLICATE of the canonical's W1/W3) and the Katie drive (MOVED). One item was narrowed: the safe harbour's text is now counted once, in the bar.
- Size: a build → a build (break-glass across reads/impersonation + `su` on agency + subject notification is still its own cycle).

### Link re-points outside the cluster
- `docs/subsystems/residence.md:225` — *"the re-gate to the agency axis belongs to [wizard-duty-slate § Axis hygiene]"* → now points at `wizard-axis-cleanup-slate` (§ *The inventory*, the absorbed live-defect subsection). The only inbound link to a moved section (`grep -rn "Axis hygiene\|probable live defect"` over `docs/`).

## docs/slates/builds/wizard-bar-slate.md — secondary (233 → 239)

Secondary to `wizard-duty-slate` (its self-declared *parent*). Its own
subject — the bar as an institution — is KEPT whole. Two restatements
cut; one `Left` item re-attributed; `Size` re-derived. The file grew
by six lines because the status block now says where the record is
counted and why the size changed.

### Conservation table

| secondary heading / item | outcome |
|---|---|
| Title · status block · *Captured 2026-08-12* + the user quote · the *wizard-duty established the law…* paragraph · *Related* | KEPT — spine. Status block RE-STAMPED (below). |
| `# ⭐⭐⭐ It is a bar, not a guild` (the Worldwrights/bar table; the credential-never-clearance wall) | KEPT — own. |
| `## ⭐⭐ The test that keeps the bar clean` (burden ok / exemption = capture) | KEPT — own (applies balance-slate; not a wizard-duty item). |
| `## ⭐⭐ And it is not a caste — do not name the complement` | KEPT — own. |
| `# What the bar does — four functions and one product` (Admit · Publish · Hear · Disbar · Safe harbour; the hearing-input problem) | KEPT — own. The *Leans on* column cites `wizard-duty § mechanisms` / `§ break-glass` / `open Q2` by name — citations of the owner, not restatements. The safe harbour is claimed here as *the actual product*; wizard-duty's `Left` no longer counts its text (see the wizard-duty table). |
| `# ⭐⭐ Almost all of this is configuration, not kernel` — the amendment test, the six-row dial table | KEPT — own. |
| § Almost all… → item 1 *Evidence not captured is gone … it is the parent slate's break-glass extension. The bar is worthless without it and it is worth something without the bar* | KEPT — a mixed paragraph: it names the parent's item by attribution and then makes the bar's own argument (non-retrofittable; the bar's dependence on it). Below paragraph granularity to split; kept whole. The `Left` entry it backed is the part that was a double count — RE-STAMPED (below). |
| § Almost all… → item 2 *Entangled namespaces do not come apart by policy* | KEPT — own. (The prior compaction ledger's tension note with the shipped PM backstop still stands for requirements.) |
| `# ⚠ What the bar does not fix` → framing line *Inherited from the parent, restated so this slate cannot be read as solving it* | KEPT, reworded only to say which two limits now live once in the parent and that the restatements were cut (the pointer the rule requires). |
| § What the bar does not fix → bullet 1 *An operator defeats any in-system control. Only external anchors, external witnesses and consequence remain.* (2 lines) | DUPLICATE → `wizard-duty-slate § The mechanisms, ranked by whether they survive a hostile wizard` (the closing blockquote: *"an operator can defeat any IN-SYSTEM control. Only external anchors, external witnesses and consequence remain."*). Word-for-word; cut, pointer in the framing line. |
| § What the bar does not fix → bullet 2 *The recursion still bottoms out in exit … an argument for authoring it before it is needed* | KEPT whole — mixed: the first half restates wizard-duty § *And the recursion has an answer* (the AGPL exit), the second half (*what it does change is that the answer stops being the founder's discretion the moment there is a second archwizard*) is the bar's own. Paragraph granularity. |
| § What the bar does not fix → bullet 3 *It is a good-faith instrument. It makes a good-faith wizard legible, which makes a hostile one conspicuous by contrast. Say that rather than overselling it.* (3 lines) | DUPLICATE → `wizard-duty-slate § ⚠ The honest limit, and why it is acceptable` (*"It makes a good-faith wizard's actions legible, which makes a hostile one's conspicuous by contrast. State that rather than overselling it."*). Cut, pointer in the framing line. |
| `# Open questions` 1 (bar admits or University certifies) · 3 (disbarred keeps Worldwrights membership) · 4 (publish hearings) · 5 (an institution of one) | KEPT — own, verbatim. |
| Q2 (*What is the safe harbour's actual text?*) | KEPT — own; this is the artifact question wizard-duty's Q2 now points at. |

### Status block (re-stamped)
- Left: *⭐ the conspicuous record of wizard reads/impersonations (the one non-retrofittable piece) · the safe-harbour standard text · admit (exam + archwizard flip) · the public roster · the hearing process · advisory disbarment* → *the safe-harbour standard text (⭐ the product) · admit (exam + archwizard flip) · the public roster · the hearing process · advisory disbarment*, plus an explicit line: the conspicuous record is the parent's break-glass extension and is counted in wizard-duty's `Left`. One item re-attributed (it was the same open item as wizard-duty's *break-glass declared-purpose logging for reads and impersonation*, counted twice); nothing dropped.
- Size: a build → **a wave**. Re-derived from what remains once the record is counted with the parent: an authored standard, a roster read over the wizards group (`AccessRegistry` members), a hearing process that rides the courts/institutions slates, and a recommendation feeding a `wizard revoke` that already ships. ⚠ Coordinator may override — the bar's own body argues the record is *"engine-physics, below the constitution"*, and if the coordinator prefers the record to stay counted here the size returns to *a build*.
- Status line unchanged (*no bar, no roster, no complaint process, no break-glass record* is still true).

## docs/slates/builds/wizard-axis-cleanup-slate.md — canonical at the census seam (183 → 233)

Receives; nothing cut. Grew by 50 lines: 46 lines of insertion
(the two `### Absorbed from wizard-duty-slate — …` subsections under
`## The inventory`, placed after the *✗ Must lose the axis* table — 4 +
12 + 16 lines of verbatim text, an 8-line labelling blockquote and
headings/blank lines) and a `Left` that grew by two lines.

- Received (verbatim): the `reserve` precedent paragraph · the
  *Every `requiresWizard` call site, classified* table · the *⚠⚠⚠ And one
  of them is a probable live defect* subsection (3 paragraphs). The
  labelling blockquote states what the moved table is (the earlier
  form; `house`/`pack` since resolved; `lease`/`unlease`/`cms`/`studio`
  absent) and the one verdict that differs from the canonical's own
  (`config` → *an administrative axis* vs the Tier B/C split) — for
  requirements to reconcile, not silently merged.
- Every pre-existing section KEPT untouched: `## The rule, as stated by
  the user` · `## The inventory` (all four original subsections) ·
  `## ⭐⭐ The settings keyspace` · `## What makes it stick` ·
  `## Sequencing` · `## Open questions` 1–5.

### Status block (re-stamped)
- Left: W1 now reads *the four lease/provision views' `requiresWizard` (a dorms-agent / ownership validator that says what it means, and the Katie `dispatch provision` live drive — absorbed from wizard-duty-slate 2026-09-21)*. W0 · W2 · W3 · W4 unchanged.
- Size: a build → a build.

---

## docs/slates/tails/access-slate.md — KEEP (329 → 337)

Its own subject: the `can()` seam and its unbuilt action-level
consumers. No section restates a wizard-slate section; the wizard
slates cite `access.md` (the subsystem doc), never this slate. One
pointer APPENDED under `## Audit (a free win)` (a 7-line blockquote):
the PERMIT-side sibling is `call-security-pass-slate § The audit rail`
(`@Audited`, sampled allowed calls → `audit_events`); this section is
the DENY side (denies + `forceX` → `MudlogApi`); one audit build should
carry both. Not a duplicate — two instruments over the same Pillar 5
gap, neither restating the other — so nothing moved.

| heading | outcome |
|---|---|
| every heading (`## Principle` … `## Once shaped into formal requirements`) | KEPT — unchanged; the prior compaction pass (`parcel.md`) already carries the per-section verification and the *tier* residue flags |
| `## Audit (a free win)` | KEPT + pointer appended |

⚠ For the coordinator, not acted on (out of this pass's scope — it is a
contradiction, not a duplicate): the slate's surviving *tier* language
(`## The unification` row *`AdminOnly` stub + `forceX` → real `Admin`
policy ← tier*; `## Worked scenarios` *Wizard force (tier + bypass)*;
`## Open questions` Q5 *Tier ladder — player / builder / wizard /
owner?*; `## Build order` Wave 1 *the tier capability source*) is the
*author tier* shape the wizard-axis rule rejects, and `forceX` shipped
narrow-entry with no tier. The prior ledger flagged each in *Uncertain*;
requirements for the audit sink should strike them rather than inherit
them.

Status block unchanged — `Left` still matches the body.

## docs/slates/builds/call-security-pass-slate.md — KEEP (231 → 235)

Its own subject: trust = TEMPLATE + FUNCTION, the `@Audited`
permit-and-watch rail, the ungated-and-sealed set. Nothing here
duplicates a wizard slate: the wizard-axis-cleanup's *CMS/Studio/Git
conjunction* (`isWizard` AND `can`) is a question about WHICH axis a
door is on; this slate's design position is about WHICH CALLER a gate
admits — adjacent, not the same item. One pointer bullet APPENDED at
the end of `## The audit rail — design sketch` (4 lines): the DENY-side
sibling is `access-slate § Audit (a free win)`.

| heading | outcome |
|---|---|
| every heading | KEPT — unchanged |
| `## The audit rail — design sketch` | KEPT + pointer appended |

Status block unchanged.

## docs/slates/builds/agency-slate.md — KEEP (215 → 221)

Its own subject: principal/agent in the execution context. ⚠ *Code-trust
NEVER flows through agency* stays here as the agency guard (it is not a
wizard-slate item; the wizard slates never state it). `wizard-duty-slate
§ `su` should be AGENCY` is a CONSUMER of this slate's rule and stays in
wizard-duty (the wizard's use), but this slate's `## ⭐ What it unblocks`
list did not name it — one bullet APPENDED (6 lines) pointing at the
wizard-duty section and its Q0 (before or after agency is built). No
design moved.

| heading | outcome |
|---|---|
| every heading | KEPT — unchanged |
| `# ⭐ What it unblocks` | KEPT + `su` pointer bullet appended |

Status block unchanged — `su` is counted in wizard-duty's `Left` (*`su`
as an agency consumer*), not here.

---

## Totals

| file | before → after | DUPLICATE (cut → pointer) | MOVED | KEPT | retired? |
|---|---|---|---|---|---|
| wizard-axis-cleanup (canonical, census) | 183 → 233 | — | received 3 blocks (32 lines verbatim) | all | no |
| wizard-duty (secondary at census; canonical at duty) | 336 → 310 | 1 (the user quote) | 3 blocks out (reserve precedent · the table · the live-defect subsection) | 14 of 17 headings/items verbatim + 1 mixed paragraph kept whole | no — re-stamped |
| wizard-bar (secondary at duty) | 233 → 239 | 2 (bullets 1 and 3 of *What the bar does not fix*) | 0 | everything else; 1 mixed bullet kept whole | no — re-stamped (`Left` re-attributed the record; Size a build → a wave) |
| access | 329 → 337 | 0 | 0 | all (+1 pointer) | no |
| call-security-pass | 231 → 235 | 0 | 0 | all (+1 pointer) | no |
| agency | 215 → 221 | 0 | 0 | all (+1 pointer) | no |

Link re-points outside the cluster: `docs/subsystems/residence.md:225`
(one line, § *Axis hygiene* → wizard-axis-cleanup's absorbed
subsection). No other file touched. `docs/slates/README.md` /
`roadmap.md` left to the sweep.

### For the coordinator to decide
1. wizard-bar `Size` a build → a wave — re-derived after the record left
   its `Left`; override to *a build* if the record should stay counted
   with the bar.
2. The moved table's `config` verdict (*an administrative axis — PM /
   ops*) vs wizard-axis's Tier B stays behind `config` / Tier C → an
   office — both now sit in one file, labelled; requirements picks.
3. access-slate's *tier* residue (above) contradicts the axis rule and
   was not cut here (a contradiction is not a duplicate).
4. `ProvisionController.ts:20-30`'s docblock still asserts *"`forced`
   bypasses the `requiresWizard` YAML validator"*, which
   `npc-dialogue.md` says is false and `residence.md` now agrees is
   false — a source comment for the W1 build to fix, noted, not touched
   (documents only in this worktree).
