# Cluster merge — disease

> Pass: slate cluster-merge (after compaction), 2026-09-21. Procedure:
> `.claude/skills/compact-slate/SKILL.md` § The cluster-merge pass.

## Cluster

- `docs/slates/builds/disease-slate.md` — 342 lines — **canonical**
- `docs/slates/builds/disease-design-pack.md` — 214 lines — secondary

## Canonical — why the slate

The pack names the slate as its authority throughout (*"disease-slate's
most important call"*, *"disease-slate's keystone"*, *"disease-slate's
four rules"*; its See-also: *"disease-slate (rationale, the substrate
audit)"*), and the compaction ledger calls the pack *"the planner-ready
restatement of disease-slate"*. The slate also carries the larger
remaining design (342 vs 214 lines). Neither is a stub.

No build is running from either file (`git worktree list`: build-1
economic-bootstrap · build-2 fishing · build-3 detached · build-4
`design/treatment`, a design session — it may cite these slates but is
not building from them).

Verified before merging (the open items are still open): `ContagionSpec`
declared at `Condition.ts:1139`, field `null` with no consumer
(`Condition.ts:1173`); `openNeighboursOf` still a module-private
`function` at `FireLogic.ts:398`; no `hostRange` / `_contaminants`
anywhere in `packages/server/src/mud` or any pack `src/`;
`Resists.stageFor(residual, bands, factor)` at `Resist.ts:99` with one
live caller (`MagicLogic.ts:1573`); `TreatController.ts:260` handles
`kind === 'affliction'` (so the pack's *"`treat` is trauma-only today"*
aside is stale — noted below, not carried).

## Secondary headings — the pack's, in file order

1. `# Disease design pack — the capstone (transmission over the growth term)` (title)
2. status block (`> **Status: PARTIAL** … **Left:** … **Size:** a build`)
3. See also
4. `## Part 0 — What it is, and why it's the capstone`
5. `## Part 1 — Designed to the per-object format`
6. `` ## Part 2 — `ContagionSpec` (the one thing to design) ``
7. `## Part 3 — ⭐⭐ The two unifications that make it the capstone`
8. `## Part 4 — Keeping it un-miserable (disease-slate's four rules)`
9. `## Part 5 — Pedagogy: the public-health capstone`
10. `## Part 6 — Interop (the connective tissue)`
11. `## Part 7 — Forks settled`
12. `## Open questions`

## Conservation table — `disease-design-pack.md`

One row per heading (sub-paragraph rows where a section split). Written
row by row as each section was resolved, before the next was touched.

| # | pack heading / paragraph | outcome | where |
|---|---|---|---|
| 4 | `## Part 0 — What it is, and why it's the capstone` (l.22–33: the one-sentence definition + *capstone* paragraph; the *seam is already cut / two deltas* blockquote) | MOVED, whole, verbatim | `disease-slate.md § Absorbed from disease-design-pack — Part 0 — What it is, and why it's the capstone` (inserted directly after `§ The seam is already cut`). The blockquote restates `§ The seam is already cut` but carries two details the canonical lacks — *"a whole disease system is two deltas"* and the capstone framing (spoilage curve · room-condition hygiene · husbandry care-score · density dials all feed it) — so the section moved whole rather than splitting a 4-line blockquote. ⚠ Its *"null in all 11 condition seeds"* is 24 rows today and *"spoilage builds it"* is done (the growth term shipped) — stale text carried verbatim, per the no-paraphrase rule |
| 5a | `## Part 1 — Designed to the per-object format` (l.37–76: items 1–7 incl. the five-row work table; minus the paragraph in 5b) | MOVED, verbatim | `disease-slate.md § Absorbed from disease-design-pack — Part 1 — Designed to the per-object format` (after `§ The v1 slice`, before `§ Open questions`). The canonical had no consolidated work breakdown (what is *new* vs *wire* vs *extend*, persisted fields, seams, the fault line) — the pack's `Left` named it *the per-object specs*. ⚠ Carried stale, verbatim: table row 1 *"Growth term on `ToxinBehavior` — extend"* is superseded by the code (`pathogenLoad` under `progression.law: logistic`; the slate's `§ The core model` note and the moved Part 7 fork 1 both say so); item 6's *"requires the growth term (spoilage)"* is satisfied |
| 5b | `## Part 1` → the *"The two idioms, not one (disease-slate's most important call) …"* paragraph (l.56–60) | DUPLICATE | `disease-slate.md § Two idioms, not one` (the table + *nobody reads an empty room*) and `§ The clock does something lovely here` (*"you never log in sicker than you logged off, but you can log in to a sick herd"* — the exact sentence). Replaced in the moved block by a one-line pointer |
| 6a | `` ## Part 2 — `ContagionSpec` (the one thing to design) `` (l.80–100: the one-line struct; Routes; Host range; Reservoir) | DUPLICATE | `disease-slate.md § ContagionSpec — the one thing to design` (the five-field struct, commented) · `§ Routes — and what each already has` (the seven routes with their shipped hooks; the airborne caveat and the `_atmosphere` single-tag / contaminant-map note) · `§ Host range — the cross-species answer` (`Clade` tree; *default containment, deliberate crossing*; the zoonosis → public-health sentence; *most content contained, crossing rare, deliberate, a big deal*) · `§ Reservoir — what makes disease non-ambient` (persists between hosts; makes rule 1 enforceable and an outbreak traceable). Every clause of the pack's compression is present, longer, in the canonical |
| 6b | `## Part 2` → the fomite detail *"**a dirty hand from room-condition is a fomite**"* (l.90–91) | MOVED (detail), verbatim | `disease-slate.md § Routes — and what each already has`, a labelled one-line note directly under the routes table — the canonical's fomite row says only *chattel + containment* |
| 7a | `## Part 3 — ⭐⭐ The two unifications that make it the capstone` → **1. Care is immunity — pointed at *every* host** (l.106–113) | MOVED, verbatim | `disease-slate.md § Immunity is live — good husbandry *is* immunity` → labelled subsection `### Absorbed from disease-design-pack — Part 3 — 1. Care is immunity, pointed at every host` (appended at the end of the section). The canonical states the herd case only; the pack widens it to four hosts (herd · crop · body/hygiene · home) as *one resistance model, every host*. ⚠ Its *"we have now built that condition score for four hosts"* overclaims: the room-condition pack (body hygiene, home) is unbuilt — the pack's own `Left` said so (*the room-condition half of immunity, which is also unbuilt*); carried into the canonical's `Left` as such |
| 7b | `## Part 3` → **2. Disease is the shadow of the density dial** (l.115–120) | DUPLICATE | `disease-slate.md § The unifying frame` (the same headline, the same dial list — monoculture coverage · stocking rate · paddock concentration · pond stocking · the companion ceiling · urban population — *the price of concentration, the same price everywhere*, *the counterweight the family lacks*) + `§ Immunity` bullet 2 (*Density and care multiply. Crowded and well-kept is survivable; crowded and neglected is an outbreak*) |
| 8 | `## Part 4 — Keeping it un-miserable (disease-slate's four rules)` (l.124–139: the four rules; the *two payoffs fall out free* paragraph) | DUPLICATE | `disease-slate.md § Four rules to keep it from being miserable` (rules 1–4, each longer: *never ambient* / source · *legible before lethal* / `observableSigns` + `assess` + `medicine` · *prevention is practice, not purchase* · *forgiveness holds*) · `§ A free quarantine mechanic` (closed door = firebreak = quarantine barrier; **promote** `openNeighboursOf`) · `§ An outbreak is an investigation` (patient zero discoverable; a mystery not a debuff; the inquiry vein). The pack's only wording delta is rule 3's *"husbandry/stewardship"* for the canonical's *"husbandry"* — a paraphrase, not a design detail; the pack's heading itself credits the slate |
| 9 | `## Part 5 — Pedagogy: the public-health capstone` (l.143–161: SIR/logistic + R₀ + herd immunity; the density–transmission law; contact tracing; prevention as practice; the three *wrong-about* hooks with sim-computed keys) | MOVED, whole, verbatim | `disease-slate.md § Absorbed from disease-design-pack — Part 5 — Pedagogy: the public-health capstone` (after absorbed Part 1). The canonical had one sentence of pedagogy (*plant epidemiology is a genuine field running the same math*) and an open question on how much surfaces; the pack's section is the only statement of the discipline this exercises (lens 1) and of the wrong-about hooks |
| 10 | `## Part 6 — Interop (the connective tissue)` (l.165–181: seven bullets — spoilage · room condition/hygiene · husbandry/soil/ranching/farming · metabolism/vitals · biome/respiration · fire · belief/chronicle) | MOVED, whole, verbatim | `disease-slate.md § Absorbed from disease-design-pack — Part 6 — Interop (the connective tissue)` (after absorbed Part 5). Four bullets overlap the canonical's `§ How it plugs into each system` + See-also (husbandry/farming/ranching; metabolism/vitals; biome/respiration; fire), but three carry items the canonical has nowhere — *spoilage = disease minus transmission*, the room-condition/hygiene interlock at the chain of infection (+ the home-immunity term), and *belief/chronicle: an outbreak's investigation records; a survivor's immunity as identity memory*. A bullet list is one paragraph; moved whole rather than split |
| 11 | `## Part 7 — Forks settled` (l.185–200: fork 1 struck-through as superseded by the code; forks 2–6 — push tick · contaminant map · `Clade` host range · `Resists.factor` ← live host condition · crops first after the fish) | MOVED, whole, verbatim | `disease-slate.md § Absorbed from disease-design-pack — Part 7 — Forks settled` (after absorbed Part 6). Forks 2, 4, 5, 6 restate canonical sections (`§ Two idioms` + `§ A free quarantine mechanic`; `§ Host range`; `§ Immunity`; `§ Where to prove it — crops first`), but the *settled* status is itself the detail: ⚠ **fork 3 settles what the canonical's open question 2 still asks** (the room contaminant slot — `_contaminants` on `Atmospheric` vs a room-scoped burden: the pack chose the map, `airReserveOf` precedent). A one-line pointer added under the canonical's Q2 so requirements see the tension rather than inherit it; fork 1's strike-through is carried as written (`→ spoilage.md § In the body`). Fork 6's *"after the machinery is proven on a fish in spoilage"* is done — carried verbatim |
| 12a | `## Open questions` → Q1 *Does `resolution.by` finally get a dispatcher?* (l.206–208) | DUPLICATE | `disease-slate.md § Open questions` Q3 (*Does `resolution.by` finally get a dispatcher, and is that this build's job or the medicine branch's?*). The pack's aside *"`treat` is trauma-only today"* is FALSE now (`TreatController.ts:260` handles `kind === 'affliction'`) and is not carried; its naming of the item as *the thin medic vertical* is carried into the canonical's `Left` |
| 12b | `## Open questions` → Q2 *Herd-scale representation* (l.209–210) | DUPLICATE | canonical Q4 — same two options (aggregate prevalence scalar vs per-head `AfflictionRecord`s for a slotted breeding tier) |
| 12c | `## Open questions` → Q3 *How much epidemiology surfaces* (l.211–212) | DUPLICATE | canonical Q6 — identical wording (R₀ / prevalence as instrument reads at the farming error-bar tier, or bands only) |
| 12d | `## Open questions` → Q4 *Numeric calibration* (l.213–214) | DUPLICATE | canonical Q7 — *every rate, deferred to a running game*; the pack's *"every route's infectivity"* is an instance of *every rate*, not a new item |
| 3 | See also (l.12–18) | DUPLICATE, one link MOVED | Every target is already in the canonical's See-also (spoilage.md · metabolism.md · vitals.md · fire.md · health-vertical-slate) or IS the canonical (disease-slate) — except `room-condition-design-pack.md` (*"care is immunity" across hosts*), which the moved Parts 0/3/6 lean on: added to the canonical's See-also as one labelled line |
| 2 | status block (`Left:` `ContagionSpec` itself · the push-tick spread driver + the per-room contaminant map · the two unifications (one burden engine · one hygiene read) · the room-condition half of immunity · the four un-misery rules · the per-object specs · the medic vertical / `resolution.by` dispatcher; `Size:` a build) | retired with the file | every `Left` item now appears in the canonical's re-stamped `Left` (see *Status block* below); `Size` agrees (a build) |
| 1 | title `# Disease design pack — the capstone (transmission over the growth term)` | retired with the file | the *capstone* framing lives in absorbed Part 0's heading + body |

**Nothing KEPT** — every section is either the canonical's subject restated
(DUPLICATE) or open design the canonical lacked (MOVED). The pack is
**retired** (file deleted); its open questions were all already the
canonical's.

## Canonical — `disease-slate.md` — 342 → 478 lines · Status PARTIAL → PARTIAL

Insertions (all verbatim from the pack, each under an *Absorbed from
disease-design-pack — …* heading, or a labelled one-liner):

- `§ Absorbed … Part 0 — What it is, and why it's the capstone` (after `§ The seam is already cut`) — 12 lines
- `§ Routes` → the fomite one-liner — 2 lines
- `§ Immunity` → `### Absorbed … Part 3 — 1. Care is immunity, pointed at every host` — 10 lines
- `§ Absorbed … Part 1 — Designed to the per-object format` (after `§ The v1 slice`) — 40 lines, of which the duplicate *two idioms* paragraph is a 3-line pointer to `§ Two idioms` + `§ The clock`
- `§ Absorbed … Part 5 — Pedagogy: the public-health capstone` — 19 lines
- `§ Absorbed … Part 6 — Interop (the connective tissue)` — 19 lines
- `§ Absorbed … Part 7 — Forks settled` — 18 lines
- `§ Open questions` Q2 → one pointer line (*the design pack settled this as the map — absorbed Part 7, fork 3*)
- See-also → one labelled line (`room-condition-design-pack.md`)

No existing sentence of the canonical was edited or removed; no
subsystem doc was touched.

### Status block
- Status: PARTIAL → PARTIAL
- Left: *`ContagionSpec` (routes · host range over `Clade` · reservoir) — `Condition.contagion` is still `null` with no consumer · the between-room push tick + the per-room contaminant map · the husbandry-is-immunity coupling · quarantine (promote `openNeighboursOf`) · the outbreak investigation · the crops-first v1 slice* → same, with *the husbandry-is-immunity coupling* widened to *care-is-immunity across every host (the husbandry coupling, and the room-condition / hygiene half, both unbuilt)* and four items gained from the pack's `Left`: *the four un-misery rules* · *the per-object work table (absorbed Part 1)* · *the epidemiology pedagogy + wrong-about hooks (absorbed Part 5)* · *the thin medic vertical / `resolution.by` dispatcher (open Q3)*. Pack `Left` → canonical `Left` mapping: `ContagionSpec` itself → item 1 · push-tick + contaminant map → item 2 · the two unifications → item 3 (care-is-immunity) + `§ The unifying frame` (density; already in the body, and a doctrine section rather than a backlog item — not added to `Left`) · the room-condition half of immunity → item 3 · the four un-misery rules → item 6 · the per-object specs → item 7 · the medic vertical / `resolution.by` → item 9
- Size: a build → a build (the body grew by restatement and by the pedagogy/work-table sections, not by new mechanism; the pack's own stamp was *a build*)

## Secondary — `docs/slates/builds/disease-design-pack.md` — 214 → deleted

- Sections: 9 body headings + title/status/See-also. DUPLICATE 4 whole (Parts 2, 4; Open questions ×4 as one heading; See-also) + 2 partial (Part 1's two-idioms paragraph; Part 3's unification 2) · MOVED 5 whole (Parts 0, 1, 5, 6, 7) + 3 details (the fomite line; Part 3's unification 1; the room-condition See-also link) · KEPT 0.
- Retired: `git rm` (left unstaged, as the siblings' deletions are — the coordinator commits per batch).

## Links re-pointed (outside `docs/slates/README.md` / `docs/roadmap.md`)

- `docs/slates/tails/tenancy-design-pack.md` l.111 — `[disease](../builds/disease-design-pack.md)` → `[disease](../builds/disease-slate.md)`

Not re-pointed, deliberately:
- `docs/slates/README.md` l.126 — the `disease (pack)` row; the sweep's (README is generated).
- `docs/plans/slate-compaction/spoilage.md` (l.186, 267, 275) and `status-blocks.md` (l.12) — compaction ledgers; historical records of the file as it was, not links to a live page.

## Uncertain / for the coordinator

- ⚠ **Absorbed Part 7 fork 3 vs canonical open Q2.** The pack recorded the room contaminant slot as *settled* (a per-room `_contaminants` map, `airReserveOf` precedent); the slate still lists it as open (map vs room-scoped burden). Both are now in one file with a pointer between them — requirements should close it, not inherit both.
- ⚠ **Absorbed Part 3 unification 1 overclaims** (*"we have now built that condition score for four hosts"*): herd (husbandry) and crop (soil) shipped; body-hygiene (`Soilable`) and home are the unbuilt room-condition pack. Carried verbatim per the no-paraphrase rule; the canonical's `Left` says *both unbuilt*.
- ⚠ **Absorbed Part 1 table row 1** (*Growth term on `ToxinBehavior` — extend*) and **Part 0's blockquote** (*spoilage builds it*; *null in all 11 seeds*) are superseded/stale text, carried verbatim. The canonical's `§ The core model` note and absorbed Part 7 fork 1 both state what actually shipped (`pathogenLoad` under `progression.law: logistic` → `spoilage.md § In the body`). If the coordinator prefers, these three fragments could be struck the way fork 1 was — a compaction-pass call, not a merge-pass one.
- The canonical's open Q1 (*extend `ToxinBehavior` or a sibling `PathogenBehavior`?*) was already flagged answered-by-the-code in the compaction ledger (`spoilage.md` § disease-slate → Uncertain); left as it was.
- `design/treatment` (build-4) may cite `disease-design-pack.md`; grep of this tree found no such link outside the ones above, but that branch's own new files are not visible from here.
