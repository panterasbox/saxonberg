# Currency — cluster-merge ledger

Cluster: **currency**. Files: `builds/currency-slate.md` ·
`tails/multi-currency-slate.md` · `builds/money-integrity-slate.md`.
Procedure: `.claude/skills/compact-slate/SKILL.md` § The cluster-merge
pass. Prior compaction pass (already done, not repeated here): `money.md`
in this same directory, which flagged the duplication this ledger
resolves (*"the money-changer / peg design lives fully in BOTH
currency-slate and multi-currency-slate; 'who may authorize a second
issuer' is the same open question in both"*).

**Canonical: `builds/currency-slate.md`.** It is the file
`tails/multi-currency-slate.md` names as its own authority — twice: its
own opening callout frames itself as the Half-A implementation spec to
currency-slate's decision layer, and its *See also* list says outright
*"the DECISION layer above this one … where the two differ, it wins."*
Never the tail per rule 2.

`builds/money-integrity-slate.md` was cross-checked per the task's
instruction and found **not** to duplicate anything in the other two —
its subject is the object-layer (Coin/cash) conservation audit (creation,
mutation, persist/restore, sandbox crossing, destruction), never the
second-issuer/peg/money-changer design the other two share. No section
overlaps a currency-slate or multi-currency-slate open item. **KEPT
untouched** — its own subject, no merge.

---

## docs/slates/tails/multi-currency-slate.md — 221 → 164 lines · Status PARTIAL → PARTIAL

### Conservation table

| secondary heading | outcome |
|---|---|
| title + two status blocks + intro paragraph + *See also* list | KEPT — spine; status block re-stamped (below), *See also* untouched (no cut targets it) |
| `## Half B — currency markets (FX) — ⛔ SUPERSEDED 2026-08-04` — the verdict table + "the changer survives" quote | **DUPLICATE** → `builds/currency-slate.md` §§ *Reconciling this with the tail's Half B* / *The peg is a promise, and the promise can break* (same table, same peg design, near-identical wording). Pointer left |
| same heading — the numbered list (1. Rate source: fixed peg vs. live market · 2. the bureau-de-change conversion mechanics · 3. the `convert` verb + seam) + the educational-payoff paragraph | **MOVED**, verbatim → `builds/currency-slate.md` new § *Absorbed from multi-currency-slate — Half B mechanics* (inserted after § *The peg is a promise, and the promise can break*). Currency-slate's table named these components but never spelled out the rate-source options, the debit/credit walkthrough, or the throw message — genuine detail the canonical lacked |
| `## Build order` + `### Half B — FX (⛔ superseded…)` (4-item checklist) | **DUPLICATE** → same two canonical sections; item 4 (a second currency as content, corpo scrip first) is additionally carried by currency-slate's § *The use case worth building toward is SCRIP, not municipal money*. Pointer left, nothing moved (the checklist added no detail beyond the table + the moved mechanics above) |
| `## Open questions` — Q2 (*"Who issues a second currency? One CB mints all… or each currency has its own issuer… ⚠ builds/currency-slate adds a constraint: … reserved matter …"*) | **DUPLICATE + one detail MOVED** → currency-slate's own Q2 already carried the reserved-matter constraint verbatim (it originated there); the *"one CB mints all vs. each its own"* framing was the tail's own angle and lacked a home in currency-slate — moved verbatim as a new sub-bullet, *Absorbed from multi-currency-slate — Q2 (issuer structure)*, under currency-slate's Q2 |
| `## Open questions` — Q3 (does the 2nd currency have cash) | **KEEP** — the secondary's own; no equivalent in currency-slate |
| `## Open questions` — Q5 (cross-currency in one account statement) | **KEEP** — same |
| `## Open questions` — Q6 (spread/fee home — `Terms` vs. a bare rate delta) | **KEEP** — same |
| `## Open questions` — Q1, Q4 (already marked cut 2026-09-20 in the prior compaction pass, shipped) | KEPT as-is — historical one-liners, not cluster subject matter, untouched |
| `## What this slate does NOT cover` | **KEEP** — a boundary list unique to this file (capital markets, cross-currency pricing, inflation-across-currencies); currency-slate has no equivalent section |

Nothing retired — three KEEP items (Q3, Q5, Q6) plus the "does NOT
cover" boundary list are the secondary's own subject and survive the
pass. File re-stamped, not deleted.

### Status block

- **Status:** PARTIAL → PARTIAL (unchanged)
- **Left:** *a second issuer and the corpo scrip that motivates one (with
  its coinage) · the money-changer as a merchant · the pegged issuer's
  redemption window* → *whether a second currency needs its own
  cash/coinage · a combined cross-currency account statement · the
  changer's spread/fee home* (the money-changer/redemption-window items
  moved to the canonical along with their design; what remains here is
  Q3/Q5/Q6, the tail's own open questions)
- **Size:** a tail → a tail (unchanged)

---

## Canonical re-stamp — docs/slates/builds/currency-slate.md — 225 → 269 lines · Status PARTIAL → PARTIAL

Gained one new heading (`## Absorbed from multi-currency-slate — Half B
mechanics`, 32 lines) and one new sub-bullet under its existing Open
questions Q2 (5 lines). Its own stale to-do paragraph (*"⚠ Action: the
tail's Half B should be amended to match…"*) was resolved by this very
pass and replaced with a one-line completion note — not a rewrite of
kept design, a closing of a to-do this pass executed.

- **Status:** PARTIAL → PARTIAL (unchanged)
- **Left:** *a second issuer + who may authorize a mint · opt-in
  acceptance lists / corpo scrip · the peg as a redeemable standing offer
  (designed, not built) · wages-in-scrip consent* → *a second issuer +
  who may authorize a mint, and whether one issuer mints every currency
  or each gets its own · opt-in acceptance lists / corpo scrip · the peg
  as a redeemable standing offer · the money-changer's mechanics (rate
  source, settlement, the `convert` seam) · wages-in-scrip consent* (the
  money-changer mechanics item is new — absorbed from the tail; the
  issuer item gained the one-CB-vs-per-currency-issuer angle)
- **Size:** a build → a build (unchanged; still noted as smaller than it
  reads)

### Links re-pointed

None. Neither file was retired, so every existing inbound link (to
`currency-slate.md` or `multi-currency-slate.md`, by file or by anchor)
still resolves — no heading text was changed, only body content beneath
kept headings. No file outside the cluster was touched.

---

## docs/slates/builds/money-integrity-slate.md — 250 → 250 lines (no edits)

Read whole; headings checked individually against both other files'
subject matter (second issuer, peg, money-changer, acceptance lists,
wages-in-scrip). None overlap — this slate's entire body is the Coin/cash
object-layer conservation audit (§§ A–E, the census/gates/property-test
three-pass plan, the uncloneable-Coin and value-bearing-marker open
questions, the hostile-wizard-vs-mistakes boundary question). Per the
skill: *"if two slates merely cite each other, touch nothing and say so
in the ledger."* They don't even cite each other on this subject. File
byte-identical to its pre-cluster-pass state.

### Conservation table

| heading | outcome |
|---|---|
| every heading in the file (title, the two-conservation-domains finding, confirmed findings, the withdrawn finding 3, the reframe, §§ A–E of the audit surface, "what the currency build already fixes," scope recommendation, open questions) | **KEPT** — no duplication found with either currency file |
