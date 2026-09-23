# Press — cluster-merge ledger

Cluster: **press**. Files: `docs/slates/builds/press-slate.md` (461
lines) · `docs/slates/builds/gazette-slate.md` (174 lines). Procedure:
`.claude/skills/compact-slate/SKILL.md` § *The cluster-merge pass*.
Prior compaction pass (already done, not repeated here):
`docs/plans/slate-compaction/press.md`, which cut both files down from
their originals and flagged, in its own *Uncertain* sections, exactly
the duplicate this pass resolves: *"The PULL→PUSH record/docket/ticker
table appears near-verbatim in both … a future cluster pass should
merge them into one doctrine home."*

**Canonical: `press-slate.md`.** It is the larger remaining design (461
vs 174 lines), gazette-slate's own status block and body repeatedly
name it as the authority for Wave 2 ("*already designed in
press-slate. Do not re-derive it here*"), and its subject (the press as
a vocation) is the superset — gazette-slate is about one publisher (the
state's) inside that same design.

Scope check: only **duplicated OPEN design** is in scope. Everything
already marked SHIPPED · DOCUMENTED / RESOLVED by the prior compaction
pass (the launch problem, Wave 0, most of Wave 1) is untouched here —
it isn't open design, so it isn't a cluster-merge candidate, duplicated
or not.

---

## docs/slates/builds/gazette-slate.md — secondary

### Conservation table

| secondary heading / item | outcome |
|---|---|
| Title, status block, intro paragraph ("System news is just the publishing arm of the state"), *Related* list | KEPT — spine; not open-design duplication. Status block re-stamped below. |
| `## ⚠ The launch problem — RESOLVED` | KEPT untouched — already a SHIPPED/RESOLVED pointer from the prior pass, not open design; out of this pass's scope. |
| `## ⭐⭐⭐⭐ And press-slate already protects the vocation` — intro sentence + the "events, never significance" rule blockquote | DUPLICATE → `press-slate.md § ⚠ The structural threat: an auto-generated ticker` (identical rule, already kept there, word-for-word: *"the default feed reports events, never significance"*). Cut, replaced with a one-line pointer. |
| … — the Layer/Character/**State** three-column table | DUPLICATE → `press-slate.md`'s Layer/Character table in the same section. The one differing detail (the **State** column: record "largely shipped", docket "missing — the gap", ticker "shipped as one hard-coded publisher") is current build-status color, not a design decision, and press-slate's own status block already tracks the same status (`Left`: … *classification/sealing + the FOIA loop (needs the docket)* …) — nothing substantive to move. Cut, folded into the same pointer. |
| … — "Nobody reads the Federal Register" blockquote | DUPLICATE → the identical sentence already sits inside `press-slate.md`'s docket table cell (§ *The structural threat*) and is repeated again at § *What "you can see something is there" actually requires: the docket*. Cut, no separate pointer needed (covered by the section pointer above). |
| `### ⭐⭐⭐ And the docket being PULL is by design, not a concession` (full subsection: the wire-service-analogy-was-wrong argument, "the state publishes to a PLACE, a publisher pushes to PEOPLE", "system news is genuinely the smallest part") | **MOVED, verbatim** → `press-slate.md § ⚠ The structural threat`, new subsection `### Absorbed from gazette-slate — And the docket being PULL is by design, not a concession`. This is gazette's own argument and press-slate carried nothing like it. One mechanical link fix on the move: the subsection's own parenthetical cited "`[press-slate § What a publication is](./press-slate.md)`", which would have been a self-reference once landed inside press-slate itself — repointed to a same-document reference ("the *real evolution is PULL → PUSH* section above") rather than a markdown link to itself. No wording else touched. |
| `# ~~Wave 0~~ · SHIPPED` | KEPT untouched — already SHIPPED/RESOLVED, out of scope. |
| `# Wave 1 — still open` — intro/blockquote framing | KEPT untouched — SHIPPED/RESOLVED framing paragraph, not itself a design item. |
| … — bullet "The events-not-significance rule enforced structurally" | DUPLICATE → same item as `press-slate.md § The structural threat`'s kept rule (already listed there as unenforced). Cut, folded into the section pointer above. |
| … — bullet "The docket — unedited, chronological, complete… what makes journalism necessary rather than decorative" | DUPLICATE → `press-slate.md § FOIA — a complete loop` / § *What "you can see something is there" actually requires: the docket* (same characterization: unedited, chronological, public, boring, complete). Cut, replaced with a one-line pointer. |
| … — bullet "Locality-scoped gazettes as shipped content" | **KEPT** — gazette's own subject (per-locality state press orgs); press-slate never designs this, it designs the vocation generally. Stays, becomes gazette's sole remaining `Left` item of its own. |
| `# Wave 2 — the press` (full section: "already designed in press-slate, do not re-derive" + subscription/stance-action/source-paths-and-recording-instrument bullets) | DUPLICATE → every named item is already designed in `press-slate.md` (subscription: § *The form, decomposed*; stance action: § *The structural threat*; source paths + recording instrument: § *Why journalism is a real activity* and § *The recording instrument*). Reduced to a one-line pointer. The closing sizing caution ("must not be sized off Wave 1's momentum") is gazette's own editorial note, not duplicated content — **KEPT**, folded into the same line. |
| Open question 1, 2, 4, 5 | KEPT untouched — already RESOLVED stubs from the prior pass, not open design. |
| Open question 3 ("Is the docket a new surface or a projection of existing ledgers? … Still open") | **MOVED** → `press-slate.md § Open questions`, new item 8, verbatim (*"leans projection … still open — the docket itself is unbuilt"*). This question doesn't exist anywhere in press-slate's own Open questions list. Left in place in gazette with a one-line "moved" pointer (numbering left as-is: item 3 is now the pointer, not renumbered, so nothing downstream shifts). |

Nothing lost: every heading/bullet above is accounted for as
DUPLICATE, MOVED, or KEPT. Nothing retired — gazette-slate.md keeps a
genuine remainder of its own (locality-scoped gazettes; the Wave 2
pointer; the RESOLVED sections the prior pass already produced), so
rule 4's retirement does not apply.

### Re-stamp — docs/slates/builds/gazette-slate.md

- **Status:** PARTIAL → PARTIAL (unchanged — a non-empty `Left` survives).
- **Left:** *the docket … · the events-not-significance rule … ·
  locality-scoped gazettes as shipped content · Wave 2, the press
  industry (worked in press-slate, not here)* → **locality-scoped
  gazettes as shipped content** (gazette's only remaining item of its
  own; the docket and events-not-significance rule are now tracked
  solely in press-slate, which already owned their design; Wave 2
  remains a pointer, not an owned item).
- **Size:** *a build* → **a tail** (riding press-slate's build) — the
  only remaining item of gazette's own is a small content-seeding task
  (locality press orgs on the already-shipped organization/publisher
  substrate); the docket and Wave 2 were never gazette's own build,
  only tracked here redundantly.

### Links

No file links to gazette-slate.md by section anchor (`gazette-slate.md#…`),
and gazette-slate.md is not retired, so no re-pointing is required. The
5 external files citing gazette-slate.md by whole-document reference
(`balance-slate.md`, `flowers-slate.md`, `logistics-slate.md`,
`household-design-pack.md` ×2) all cite either the doctrine
("the state aggregates, never reports" — itself already SHIPPED ·
DOCUMENTED in `press.md`, untouched by this pass) or the file as a
whole; none target the moved/cut sections specifically. Left as-is.

---

## docs/slates/builds/press-slate.md — canonical, re-stamped

### What it absorbed

- New subsection under `## ⚠ The structural threat: an auto-generated
  ticker`: `### Absorbed from gazette-slate — And the docket being PULL
  is by design, not a concession` — the full argument moved verbatim
  (see conservation table above for the one link-target fix).
- New item 8 under `## Open questions (for requirements)`: the
  docket-new-surface-vs-projection question, moved verbatim from
  gazette-slate's Open question 3.

### Re-stamp — docs/slates/builds/press-slate.md

- **Status:** PARTIAL → PARTIAL (unchanged).
- **Left:** unchanged. The moved content elaborates on items already
  named there (the docket, the FOIA loop) rather than naming new work;
  no new `Left` item is warranted.
- **Size:** a build → a build (unchanged — still substantial; the
  cluster merge only added ~20 lines of doctrine + one open question).

---

## `git diff --stat` (self-check)

Touched: `docs/slates/builds/press-slate.md`,
`docs/slates/builds/gazette-slate.md`, this ledger. Nothing else.
