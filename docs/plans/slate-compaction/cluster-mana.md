# Cluster-merge pass — mana economy

Branch `design/slate-cluster-merge`. Procedure:
`.claude/skills/compact-slate/SKILL.md` § The cluster-merge pass. Files in
scope:

- `docs/slates/builds/mana-economy-slate.md` (401 lines, post-2026-09-19
  per-file compaction — see `docs/plans/slate-compaction/fasttravel.md`)
- `docs/slates/builds/mana-economy-design-pack.md` (728 lines, same
  compaction pass)
- `docs/slates/tails/fast-travel-slate.md` (159 lines, same compaction pass)

## Canonical

**`mana-economy-design-pack.md`.** Neither file names the other as its
authority (no cross-link exists either direction — checked by grep), so the
tie-break is "the one carrying the larger remaining design": the design
pack's `Left` (10 items: material fields, deposits/refining, ambient
density, soil reserve, bulk goods, volume-tiered sale, the mana farm, the
Confluence, three vocations, binding devices) is both longer and more
concretely worked out than the slate's `Left` (9 items, mostly headline
nouns — SOURCE, CHARGER, distribution, node title, depletion, demurrage,
the vehicle) with no code behind either. The design pack is also where the
2026-08-11 `arcane-science.md` science revision is recorded as a decision
log, which the slate treats as an external event.

## fast-travel-slate.md — untouched, per the skill's scope rule

Read whole. Its `Left` (wayfinding · terminals that WEAR · the maintenance
round · disruption/rerouting/sabotage · cross-restart credential
durability) is entirely about TPA network *operations*, not mana economics.
Its one mana mention is a already-cut, already-shipped pointer ("the mana
charge shipped → fasttravel.md § The transit-fare economy"), i.e. a
citation, not duplicated open design. **Scope: duplicated OPEN design
only** — this is a thematic neighbour (both ride the TPA), not a cluster
member. Touched nothing; no link re-point needed (it does not name either
mana file).

## mana-economy-slate.md — retired

Every one of its still-present headings resolved to either **DUPLICATE**
(a shipped fact already pointed at its doc of record — banking.md,
magic-items.md, arcane-science.md, fasttravel.md — none of it "the
canonical's own subject" to preserve) or **MOVE** (open design the
canonical lacked). **Nothing came out KEEP** — no section was the slate's
own subject distinct from the canonical's. Per rule 4, the file is
retired in full; its `Left` is folded into the canonical's `Left`.

### Conservation table — every heading of `mana-economy-slate.md`

| secondary heading | outcome | destination |
|---|---|---|
| `# Part 0 — The correction that opened it` | DUPLICATE | already a shipped pointer to `arcane-science.md` § The second quantity / § The caster's budget — same shipped fact the canonical's own (already-cut) Part 0/Part 2 point to |
| `# Part 1 — The governing principle` | DUPLICATE | shipped pointer to `arcane-science.md` § The second quantity, § The power level — same fact as canonical's (already-cut) Part 2 |
| `## Guard 1 — demurrage: charge self-discharges` | DUPLICATE | `magic-items.md` § The charge economy — same shipped fact the canonical's Part 0/Part 7 already cite |
| `## Guard 2 — rent: nodes are Ricardian land` | **MOVE** | canonical, new `### Absorbed from mana-economy-slate.md — Guard 2…` (verbatim) — canonical's Part 3 asserts "a deposit is land" but has none of the Ricardian-rent argument or the manufacturable-mana guard |
| `## Guard 3 — mana CANNOT become money` | DUPLICATE | fully shipped and documented at `banking.md` (currency-as-code, no cross-currency ledger legs); canonical doesn't cover it and doesn't need to — not open design |
| `## And Guard 1 is now citable rather than asserted` (shipped half) | DUPLICATE | `banking.md` § Law 2, `magic-items.md` § The charge economy |
| — its kept `PricedOffer` currency-gap paragraph | **MOVE** | canonical, new `### Absorbed from mana-economy-slate.md — the offer layer's currency gap` — flagged as shared with `supply-chain-slate`, which owns it; recorded here only because the carrying file retired |
| `# Part 2b` intro | DUPLICATE | history note (superseded framing); no independent content |
| `## The equilibrium is an equation — shipped` | DUPLICATE | `magic-items.md` § The charge economy |
| `## The fourth guard — shipped` | DUPLICATE | `magic-items.md` § Recharging |
| `## The tension: a city-scale node breaks S* = inflow/d` + `### But the coupling already resolves it` | **MOVE** | canonical, new `### Absorbed from mana-economy-slate.md — The tension…` (verbatim, with an added ⚠⚠ note flagging that its premise is now contradicted by canon — matter, not only bodies, holds mana — while its consequence, that the polity may need to govern `inflow`, is the live design question) |
| `# Part 3 — The stack` | **MOVE** | canonical, new `### Absorbed from mana-economy-slate.md — The stack` (verbatim) — the SOURCE→CHARGER→DISTRIBUTION→CONSUMER framing has no equivalent in the canonical's deposit/refining chain |
| `# Part 4 — Grid vs. cell is a GEOGRAPHY` | **MOVE** | canonical, new `### Absorbed from mana-economy-slate.md — Grid vs. cell…` (verbatim, with a status note: the cell/line price gap is real in code today, the utility-tree/locality-spending half is not) |
| `# Part 5 — The TPA on mana` | DUPLICATE | `fasttravel.md` (shipped); canonical's own Part 5c already covers TPA-on-mana in more depth |
| `# Part 6 — the endpoint clause` (resolved) | DUPLICATE | `arcane-science.md` § The Postulate, `fasttravel.md` § 2; canonical's own (already-cut) Part 5c covers the identical resolution |
| `# Part 6b — Mana nodes: terminus conditions × access modes` (framing + Axis 1 + Axis 2 + the portfolio) | **MOVE** | canonical, new `### Absorbed from mana-economy-slate.md — Mana nodes: terminus conditions × access modes` (verbatim) — no terminus-condition/access-mode framework exists anywhere in the canonical; a dangling internal cross-reference to the slate's own retired "Part 6" was annotated in place rather than altered, to keep the move verbatim |
| `## Capacitors as a storytelling primitive` | DUPLICATE | `magic-items.md` § ChargedMixin's second consumer (the narrative-tool rationale was already handed off there by the 2026-09-19 per-file compaction) |
| `# Part 7 — What this does to the wood question` | **MOVE** (Doctrine) | canonical, new `### Absorbed from mana-economy-slate.md — What this does to the wood question (Doctrine)` (verbatim, with a ⚠ note that its second bullet's premise, *"mana does not lift the ceiling because mana is energy,"* is now false under canon while the conclusion survives on the extractive footing) |
| `# Open questions` Q1 (endpoint clause) | DUPLICATE | already-resolved, shipped; same resolution as canonical's Part 5c |
| `# Open questions` Q2 (charge fungibility) | DUPLICATE | already-resolved, shipped; `magic-items.md` § The denominator is τ |
| `# Open questions` Q3 (do nodes deplete?) | **MOVE** | canonical, appended under the new absorbed open-questions block, cross-referenced to the canonical's own Q3 (which answers the same question for a farmed soil deposit — this is the grid-power-node variant) |
| `# Open questions` Q4 (demurrage: grid vs. stored charge) | **MOVE** | canonical, appended (verbatim) — no equivalent question in canonical |
| `# Open questions` Q5 (who may own a node?) | **MOVE** | canonical, appended (verbatim) — canonical's Part 3 says deposits are "ownable" but never raises the first-natural-monopoly question |
| `# Open questions` Q6 (what is the vehicle?) | **MOVE** | canonical, appended (verbatim) — canonical never mentions a vehicle |
| Title / status block / framing paragraph / user quote / *Related* list | retired with the file | the status block's `Left` items are folded into the canonical's re-stamped `Left` (below); the *Related* list's entries not already cited by the canonical (`currency-slate.md`, `zoning-slate.md`, `magic-items-slate.md`) are tangential and already covered by shipped docs the canonical does cite (`banking.md`, `magic-items.md`) — no action |

### Re-point

- `docs/slates/builds/grid-slate.md` — its *Related* line named
  `mana-economy-slate` ("sources, nodes, capacitors"); re-pointed to
  `mana-economy-design-pack.md` with a note that the slate retired into it.
- No other live doc links to `mana-economy-slate.md`
  (`docs/plans/slate-compaction/fasttravel.md` and `unlinked-4.md` name it
  only as history inside another pass's own ledger — left alone, those are
  historical records, not navigation).
- `docs/slates/README.md` carries a row for `mana-economy-slate.md` — left
  for the sweep, per the skill (index files are not this pass's to touch).

### Canonical re-stamp

- **Status** — unchanged, `PARTIAL`. Header gained one sentence noting the
  2026-09-21 merge and pointing at the absorbed section.
- **Left** — grew from 10 items to 17: the original 10 plus sited mana
  NODES on the terminus-condition × access-mode grid · node title/rent/the
  first natural monopoly · whether a grid-power node depletes (distinct
  from the already-answered farmed-soil-deposit case) · demurrage on a grid
  vs. only stored charge · distribution as a tree + the grid edge as an
  economic boundary · the magic vehicle · the reserve-that-is-not-a-body
  call · the offer layer's currency gap (shared with supply-chain-slate).
- **Size** — unchanged, `a build`. It already was one; absorbing a second
  build-sized backlog under one roof doesn't change the unit, it just means
  the unit was mis-split across two files.
- Lines: 728 → 1031 (+303, the eight absorbed sections plus the status-block
  and header growth).

## Totals

| file | lines | outcome |
|---|---|---|
| `tails/fast-travel-slate.md` | 159 (unchanged) | KEPT untouched — thematic neighbour only |
| `builds/mana-economy-slate.md` | 401 → 0 | **retired** (`git rm`) |
| `builds/mana-economy-design-pack.md` | 728 → 1031 | **canonical**, absorbed 8 sections + 4 open questions from the retired slate |

Conservation check: every heading in the table above is accounted for —
15 DUPLICATE, 9 MOVE (8 body sections + the 4-item open-questions block,
counted as one absorbed block), 0 KEEP. `git diff --stat` on this pass
touches exactly: `mana-economy-design-pack.md` (insert + status-block
edit), `mana-economy-slate.md` (deleted), `grid-slate.md` (one link
re-point), and this ledger.

## Notes for the coordinator

- The two files were never explicitly linked to each other despite being
  on the same subject for seven weeks — worth a beat in the retro on why
  cross-slate discovery didn't catch it sooner.
- The moved "Guard 2" and "the tension" sections both touch the same open
  question from two directions (is a mana reserve ever not a body; does an
  unbounded node break the charge economy) — a requirements pass on the
  mana-node build should read them together, not sequentially.
- The `mana-economy-slate.md` name is gone; anyone searching old
  conversation logs or git blame for it should be pointed at
  `mana-economy-design-pack.md`.
