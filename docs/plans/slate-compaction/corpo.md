# Slate compaction ledger — batch `corpo`

Assigned slate: `docs/slates/builds/corpos-slate.md`

Doc-insert allowlist: `docs/subsystems/corpo.md`. Anything belonging in
another doc goes to this file's *Handoff* section, never into that doc
directly.

A prior batch already inserted into `corpo.md` (see the `corpo.md`
mentions in `docs/plans/slate-compaction/{bulk,crafting,livelihood,
maturation,money,unlinked-3}.md`) — most notably the crafting-slate
ledger's handoff of the "three axes" preface, which I found **already
present** in `corpo.md` § "Why three axes — trade, brand, capital"
(marked "Graduated from the libations slate, 2026-09"). No further
insert was needed from that queue; verified by reading the current
`corpo.md` in full before starting.

⚠ **Special handling per assignment brief**: `docs/slates/builds/
institutions-slate.md` (2026-09-18) rewrites the corpo roster's LORE —
entity forms + charters over a cap table, `<key>-committee` title
instead of the organization holding its own title. I verified
`institutions-slate.md`'s own status block: **it is UNBUILT** (its own
words: "no entity form exists... no charter exists as a document...").
Grepped the tree for `CapTable`/`EntityForm`/`Charter`/"credit union" —
no hits outside `institutions-slate.md` and one unrelated `Government.ts`
match. So the "supersession" here is a **later design decision**
replacing an **earlier design decision**, not code disproving the
slate — treated as SUPERSEDED per the assignment brief's explicit
instruction, with both the current shipped shape (documented in
`corpo.md`) and the future rewrite (`institutions-slate.md` Part 6)
pointed to.

---

## docs/slates/builds/corpos-slate.md — 242 → 163 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- `## The world frame` (12 lines) — code: `packages/content/corpo-*`
  (the five `Corpo` rows: `veshko.yaml`, `goodkin.yaml`, `vionne.yaml`,
  `hollis.yaml`, `aevex.yaml`); doc: `corpo.md` lines 65–67 ("A corpo is
  distinguished by *sector + ethos + aesthetic*, **not** Good/Evil —
  the fault line is tribal, not moralistic") is a near-verbatim match.
- `## The model — a mark + a multipolar approval vector` → the **mark**
  bullet only (8 lines) — code: `lib/corpo/Corpo.ts`, `lib/corpo/
  Brand.ts`, `lib/corpo/Branded.ts`, `CorpoCatalogue.ts`; doc:
  `corpo.md` § "Why three axes", § "The mark is diegetic, not the
  provenance ledger", § "The mark: `BrandedMixin`" — fully documented,
  in more depth than the slate. The sibling **approval-vector** bullet
  in the same section is not shipped, but is a compressed duplicate of
  the fuller "The player axis" section below — folded into the merged
  pointer paragraph rather than kept as a second, thinner copy of an
  UNBUILT design (no information lost: the fuller version survives
  verbatim below).
- `## The roster (v1)` (49 lines, including the rivalries table and the
  "legibility payoff" paragraph) — code: `packages/content/corpo-veshko/
  content/corpo/veshko.yaml` + siblings (five `Corpo` rows with the same
  epithets: Ruthless Optimizer / Paternalist / Prestige House / Populist
  / Disruptor), `packages/content/trade-distilling/content/stuff/idea/
  corpo/Brand/{volk,old-hollis,crowsfoot-gin}.yaml` + siblings (six
  brands); doc: `corpo.md` § "Authored content (v1, the booze slice)"
  lists the same five corpos, six brands, and both rivalry pairs
  verbatim-equivalent. Cut with a pointer noting the roster's *shape*
  (ethos-only, no form) is what `institutions-slate.md` Part 6 will
  rewrite — SUPERSEDED-pending, not yet actually superseded (see the
  special-handling note above).
- `## Scope` (7 lines) — stale meta-narrative: restated the
  near-term-vs-Phase-2 split the status block and the section
  restructuring now make redundant. History, not design; cut.
- `## Open (residual)` → the **"Portfolios beyond booze"** bullet
  (3 lines) — doc: `corpo.md` § Deferred: "Portfolios beyond booze
  (augments, food, tools, media) are authored as consumers need them" —
  verbatim match. Reduced to a one-line pointer (kept in place rather
  than deleted outright, since the *Open (residual)* heading would
  otherwise lose a line count that made the section's shape confusing).

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
(none — every SHIPPED claim in this slate was already fully documented
in `corpo.md`, several in more depth than the slate itself; nothing
needed a fresh insert)

### Superseded — cut
- (folded into the `## The roster (v1)` cut above, per the special
  handling note) — the roster's ethos-only shape is superseded, going
  forward, by `institutions-slate.md` Part 6's entity-form/charter
  rewrite. Not a code-proven supersession — `institutions-slate.md` is
  itself unbuilt — so I did not simply delete the roster silently; the
  new "The world frame, the mark, and the v1 roster — shipped" section
  says explicitly that the roster below (i.e., what's now in `corpo.md`)
  matches what ships today, and that the shape will change later. The
  slate's own top-of-file note (2026-09-18) already flagged this; I
  added one clarifying sentence noting institutions-slate is itself
  unbuilt, since a reader could otherwise mistake "superseded" for
  "already replaced in code."

### Kept (UNBUILT)
- `## The player axis — closed (Phase 2 design)` — kept in full (all ~9
  subsections: standing-vector substrate, employment-as-conduct-input,
  market+prestige-not-territory, prosocial-by-construction, the rivals
  fault-line consumption, sponsorship, what-standing-does, the mark
  extending to venues/people, independents-as-a-region,
  player-founded-corpos-deferred, the governance wall). Verified each
  claim still unbuilt:
  - No `corpoKey`/`corpo`-scoped field on any renown/regard/trait
    mixin — grepped `packages/server/src/mud/lib/renown`,
    `lib/trait`, `platform/idea/api/RenownLogic.ts` for `corpo` — no
    hits (only `banking.ts`'s unrelated `corpoKey` on bank accounts,
    which is account affiliation, not a standing/approval vector).
  - No sponsorship mechanism anywhere — grepped `sponsor` across
    `packages/server/src/mud` and `packages/content` — no hits.
  - `BrandedMixin` is composed only by decor (`NeonSign.ts`,
    `neon-veshko.yaml`) and product vessels, never by a `Business` or
    venue — "the mark extends to venues by ownership" is unbuilt.
  - `corpo.md` itself states: "The `rivals` edges are authored canon
    with no runtime consumer this build" — confirms the fault-line
    consumption bullet is still open.
  - No cap-table / entity-form / charter code anywhere (see the
    special-handling note) — the governance-wall paragraph and the
    market/prestige/territory split are pure design, not yet
    contradicted or fulfilled by anything shipped.
- `## Open (residual)` → **Player-founded corpos** and **Numeric
  tuning** bullets, plus the closing parenthetical — all confirmed
  still open by the same greps above (no player-corpo-minting seam, no
  tuned rates anywhere).

### Uncertain — kept
(none)

### Handoff (belongs in a doc outside my list)
(none — the one candidate, the institutions-slate supersession pointer,
belongs in `corpos-slate.md` itself per the assignment brief, not in
`corpo.md`; `corpo.md`'s own content needed no change since everything
SHIPPED was already documented there, in most cases in more depth than
the slate)

### Status block
- Left: *the multipolar approval vector · competition + rival-tanking ·
  sponsorship · approval→access gates · player-founded corpos ·
  portfolios beyond booze* → *the multipolar approval vector ·
  competition + rival-tanking · sponsorship · approval→access gates ·
  player-founded corpos · portfolios beyond booze · numeric tuning*
  (added "numeric tuning" — it was in the body's `## Open (residual)`
  section and unrepresented in `Left`; portfolios-beyond-booze stays in
  `Left` even though the *decision to defer it* is now documented,
  because the portfolio work itself is still literally undone — the
  cut only removed the duplicate restatement, not the backlog item).
- Size: a build → a build (unchanged)
