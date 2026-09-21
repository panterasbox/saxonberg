# Cluster merge — mortality

> Pass: slate cluster-merge (after compaction), 2026-09-21. Procedure:
> `.claude/skills/compact-slate/SKILL.md` § The cluster-merge pass.

## Cluster

- `docs/slates/builds/mortal-vessel-slate.md` — 195 lines — **canonical**
- `docs/slates/builds/mortality-slate.md` — 154 lines — secondary
- `docs/slates/builds/end-of-life-slate.md` — 265 lines — **KEPT whole**
  (a different subject; link re-points only — see below)

## Canonical — why mortal-vessel

Both rules of the skill point the same way. **Named authority:**
mortality-slate's own (older) status block says *"That slate is the
design authority; this one is the extract that a requirements doc can be
written against"*; mortal-vessel says of itself *"This slate remains the
design authority for all of it"* — mortal-vessel is named as authority
by the other file and by itself; mortality-slate is named by nobody.
**Larger remaining design:** mortal-vessel carries ~100 lines of open
design (Theses 3, 4, 5, 7, Thesis 8's NPC half, the Deferred list);
mortality-slate carries ~45 (the re-embodiment service, the
recuperation-model tail, the three downstream bullets) — the other ~90
lines of its body are `— shipped` pointer stubs the compaction pass
left. Neither is a stub in the two-slates-rule sense.

The merge is also what mortal-vessel's own Thesis 5 claims: death and
prison are *"two skins on one substrate"* — one slate for both halves is
the design's own shape, not a filing convenience.

No build is running from either file (`git worktree list`: build-1
`build/economic-bootstrap` · build-2 `build/fishing` · build-3 detached ·
build-4 `design/treatment`, a design session). build-4's tree cites
`mortality-slate` only from its older copies of `consequence-slate.md`
and `end-of-life-slate.md` (both already compacted / re-pointed on
master) — no treatment design document names it.

Verified before merging (the open items are still open):
`PassageController.ts` ships the **floor only** (*"one route, always
available, and content is free to be better than it"*); no route
catalogue, trial/bargain, or richness-reward computation anywhere; the
only content mention of a resurrection service is a comment in
`Condition/mortality/recovering.yaml` (*"exists so that a resurrection
service has something to…"*) — no temple/clinic vendor rows; no
moderation capability-revocation, jail or prison mechanism in
`packages/server/src/mud` or any pack `src/` (the word *prison* appears
only in three "the deferred prison work re-skins this" comments —
`Incorporeal.ts:20`, `requiresEmbodied.ts:23`, `api/mixin.ts:1205`);
`mortality.md § Inside a circle` still says minting a real body from
inside a circle is the boundary the sandbox exists to hold.

## Secondary headings — `mortality-slate.md`, in file order

1. `# Mortality slate — dying, the corpse, the shade, the passage` (title)
2. status block, canonical (`> **Status: PARTIAL** … **Left:** … **Moved out 2026-09-10:** … **Size:** a wave`)
3. status block, older (`> **Status: BUILT 2026-07-31** …` + *"This slate does not re-litigate the design"* + *"The one-line justification"*)
4. See also paragraph (*"See also — the substrate this drives: …"*)
5. `## The gap — CLOSED`
6. `## The keystone — shipped`
7. `## The three objects at death — shipped`
8. `## What survives a new body — shipped`
9. `## Dying as a state with a clock — shipped`
10. `## Stabilization — shipped`
11. `## Death when nobody comes — shipped`
12. `## Recovery — shade → passage → new body — shipped`
13. `## Three hazards this design creates — all closed`
14. `## Scope — as built` (lead paragraph)
15. `### The re-embodiment service — decided as lore, unbuilt`
16. `### The recuperation model — resolved`
17. (no heading) the *"Still open, and deliberately downstream:"* list closing `## Scope — as built` — three bullets: the in-circle death arc · *"Where 'wake at your residence' plugs in"* · the route catalogue

## Conservation table — `mortality-slate.md`

Written row by row as each section was resolved.

| # | heading / paragraph | outcome | where |
|---|---|---|---|
| 15 | `### The re-embodiment service — decided as lore, unbuilt` (l.103–133: *Ruled 2026-07-31…* + the five bullets — contested metaphysics · two vendors competing (temple / clinic, the Tiebout axis) · coverage is the hook · the aether is not the mechanism · the two constraints the substrate imposes) | MOVED, whole, verbatim | `mortal-vessel-slate.md § Absorbed from mortality-slate — The re-embodiment service — decided as lore, unbuilt` (after Thesis 8, before § Deferred). The canonical had only the one-line Deferred bullet *"The patron-mint economy — what a rebirth costs and who grants it; routes through the altar/sacrifice/patron lore. Its own design."* — the 2026-07-31 ruling is the detail, so the section moved whole; a pointer was added to that bullet (see *Canonical edits* below). Byte-identical (diffed against the source range) |
| 16 | `### The recuperation model — resolved` (l.135–143: one paragraph — the shipped answer (temporary fading competence-band suppression, never a Transcript rewrite → mortality.md § The recuperation model) + *"Still open: a better diminishment for a paying service to sell…"*) | MOVED, whole, verbatim | `mortal-vessel-slate.md § Absorbed from mortality-slate — The recuperation model — resolved`. Mixed paragraph (two sentences shipped-pointer, one open); paragraph granularity keeps it whole. The open half is the re-embodiment service's own lever and the canonical lacked it; mortality.md § Deferred carries the same open sentence, so it is duplicated doc↔slate (the doc's Deferred list is not this pass's to cut). Byte-identical |
| 17 | the *"Still open, and deliberately downstream:"* list (l.145–154 — three bullets) | MOVED, whole, verbatim | `mortal-vessel-slate.md § Absorbed from mortality-slate — Scope — as built (the still-open tail)`. A list is one paragraph, moved whole: **the in-circle death arc** (canonical lacked it; mortality.md § Deferred has a one-liner) · **"wake at your residence" — resolved the other way** (a shipped pointer → mortality.md § The floor, carried because it is one bullet of the list) · **the route catalogue** (what a resurrection business charges, what the Hades journey restores, who else sells passage — the concrete companion to the canonical's Thesis 7; a pointer was added under Thesis 7, see *Canonical edits*). Byte-identical |
| 4 | See also paragraph (l.40–59: vitals.md · harm.md · race.md · tails/vitals-slate § Layer 6 · sandbox.md § The crossing · persistence.md · connection.md · chronicle.md · accountability.md · chattel.md · health-vertical-slate · combat.md) | MOVED, whole, verbatim | `mortal-vessel-slate.md § Cross-references → ### Absorbed from mortality-slate — See also` (appended). Three of its twelve targets were already in the canonical's Cross-references (connection · vitals · harm); the other nine were not, and the moved sections lean on them (sandbox.md for the in-circle arc, chattel.md for *what is on the corpse*, health-vertical for the clinic). Relative links are unchanged and still resolve — both files live in `docs/slates/builds/`. Byte-identical |
| 5 | `## The gap — CLOSED` (3 lines: *Historical.* death written seven times → `ConditionApi.die`, one call) | DUPLICATE | `mortality.md § One transition` — a shipped pointer left by the 2026-09-19 compaction, no design; the canonical's status block already points at mortality.md for the whole death arc |
| 6 | `## The keystone — shipped` (death forks the body out of the person, the mirror of the sandbox crossing) | DUPLICATE | `mortality.md § Death is the sandbox crossing, backwards` — shipped pointer |
| 7 | `## The three objects at death — shipped` (incl. the doctrinal split: NPCs one Stuff, PCs split) | DUPLICATE | `mortality.md § The corpse` · `§ The shade` · `§ The doctrinal split` — shipped pointer |
| 8 | `## What survives a new body — shipped` (ledgers key on `getIdentityPath()`; gear / vitals / world state lost by design) | DUPLICATE | `mortality.md § What survives a new body` — shipped pointer |
| 9 | `## Dying as a state with a clock — shipped` | DUPLICATE | `mortality.md § The dying clock` — shipped pointer |
| 10 | `## Stabilization — shipped` | DUPLICATE | `mortality.md § Stabilization` — shipped pointer |
| 11 | `## Death when nobody comes — shipped` | DUPLICATE | `mortality.md § One transition` — shipped pointer |
| 12 | `## Recovery — shade → passage → new body — shipped` (incl. the reversal of the `perceptualPlane` / wake-point design; the two bare transitions with no route-type vocabulary) | DUPLICATE | `mortality.md § The shade` · `§ Coming back` · `§ The floor` · `§ Deferred` ("The underworld") — shipped pointer. Also the canonical's own `§ Thesis 6 — The death arc — shipped` |
| 13 | `## Three hazards this design creates — all closed` (snapshot-must-not-record-death · `byTemplatePath` collision · dying inside a circle · the disconnect-cure trap · two-ways-to-persist confusion · circle-marked rows · `isLivingBody()`) | DUPLICATE | `mortality.md § The two ways to persist death` · `§ Inside a circle` · `§ The dying clock → The clock runs while you are disconnected` · `§ Circle-marked rows convict nobody` · `§ Reading lifecycle state` — shipped pointer |
| 14 | `## Scope — as built` lead paragraph (*Shipped as scoped* — the IN list shipped, the OUT fences hold) | DUPLICATE | `mortality.md § Deferred` (the OUT fences are that list) + the canonical's `§ Deferred / boundaries`. The section's open remainder (rows 15–17) moved; only the lead paragraph is a pointer |
| 2 | status block, canonical (`Left:` the re-embodiment service as content (temple vs clinic vendors, employer coverage, the price of walking out, a service's own diminishment lever) · the in-circle death arc · the passage ladder — the route catalogue (trial / bargain / Orpheus; what a resurrection business charges and who else sells passage); `Moved out 2026-09-10:` corpse custody / remains / the coroner economy → end-of-life; `Size:` a wave) | retired with the file | every `Left` item now appears **verbatim** in the canonical's re-stamped `Left` (see *Status block* below); the `Moved out` note is restated in the canonical's new `Absorbed 2026-09-21:` line, and its three items are end-of-life-slate's `§ Stage 1 — custody` (custody + remains) and `§ The money` (the coroner economy). `Size: a wave` folds into the canonical's *a build* (see *Status block*) |
| 3 | status block, older (`Status: BUILT 2026-07-31` — graduated to mortality.md; *"kept for its design rationale and its still-open surface"*; *"This slate does not re-litigate the design … mortal-vessel is the design authority; this one is the extract"*; *"The one-line justification: nine subsystems can kill a character and nothing can bring one back"*) | retired with the file | history. Its three claims: (a) *graduated to mortality.md* — true, and the canonical's status block says the same; (b) *mortal-vessel is the design authority* — the reason this file is the canonical, now recorded in the canonical's own older block (re-pointed, see *Canonical edits*); (c) the *one-line justification* — `mortality.md`'s opening paragraph states it word for word (*"Nine subsystems could kill a character; nothing could bring one back"*). Its *"still-open surface (the re-embodiment service's lore, the underworld, the coroner economy)"* list: the first is row 15 (moved), the underworld is `mortality.md § Deferred` (cut with reasoning), the coroner economy is end-of-life's |
| 1 | title `# Mortality slate — dying, the corpse, the shade, the passage` | retired with the file | the four nouns are the shipped arc (`mortality.md`'s title and § headings); the canonical's title already says *death, recovery* |

**Nothing KEPT** — every section of `mortality-slate.md` is either a
shipped pointer to `mortality.md` (DUPLICATE) or open death-arc design
that is the canonical's own subject (MOVED). The file is **retired**
(`rm`, not `git rm`). It had no *Open questions* section to salvage —
its open items were the three bullets of row 17, all moved.

## Canonical edits — `mortal-vessel-slate.md` (195 → 295 lines)

Beyond the four verbatim insertions (rows 4, 15, 16, 17 — 57 + 23 lines
incl. headings and rules), four small edits, each a re-stamp or a
pointer, none a rewrite:

1. **Status block re-stamped** (see *Status block* below). ⚠ Its lead
   clause *"the death arc (Theses 6–8) shipped"* was **not true** — the
   body compaction ledger (`body.md`, mortal-vessel entry, *Uncertain*)
   already found Thesis 7 unverified (no richness-reward mechanism;
   `PassageController.ts` is the floor only) and Thesis 8's NPC half
   unverified. The body wins: the clause now reads *"the death arc shipped
   (Thesis 6, Thesis 8's PC half: …)"*, and Thesis 7 + Thesis 8's NPC half
   appear in `Left` (they were kept in the body but unrepresented — the
   *`Left` usually grows* case).
2. **The older status block's paragraph** *"The death half now has a
   build extract: [builds/mortality-slate.md] takes Theses 6–8 to a
   requirements doc…"* linked the retired file and stated a present tense
   that no longer holds. Re-pointed in place (5 → 6 lines): the extract
   *took* Theses 6–8 to requirements *and shipped*; its open remainder was
   absorbed here 2026-09-21. The rest of that older block is untouched —
   ⚠ it still says *"Nothing here is a build"* against `Size: a build`;
   the status-blocks ledger ruled it *kept — unique content* for the very
   sentence I re-pointed, so collapsing it is now the coordinator's call,
   not mine.
3. **A pointer under Thesis 7** (4 lines, parenthetical, after its last
   paragraph) to the absorbed route-catalogue bullet — the two are one
   `Left` item (*the passage ladder*) and a requirements pass should find
   both from either.
4. **A pointer on the Deferred bullet *The patron-mint economy*** (2
   lines appended to the bullet) to the absorbed re-embodiment ruling —
   the one-liner was the canonical's only statement of what row 15 now
   states in full.

## `end-of-life-slate.md` — KEPT whole (265 → 269 lines; link re-points only)

Read in full. It is not the same subject: mortal-vessel / mortality own
*what happens to you* (the shade, the passage, coming back); end-of-life
owns *what your death costs everyone still standing* (custody, the rite
as an ATTENDANCE primitive, the monument, potter's field, the burial
club) — its own `§ What this slate does NOT cover` draws exactly that
line. No open design is duplicated across the boundary in either
direction:

| end-of-life heading | outcome | note |
|---|---|---|
| `## The gap` | KEPT | its own (burial as a residency fix with a price tag) |
| `## ⭐⭐⭐ There is no natural death, and it decides the shape` | KEPT | its own (`race.md`'s `lifespanMax` decision) |
| `## What already exists` | KEPT | a compaction residue paragraph, its own |
| `## ⭐⭐ Stage 1 — custody: the body is property nobody owns` | KEPT | the one place the cluster touches: custody + remains **moved here 2026-09-10** from mortality-slate's Left; mortal-vessel carries only the pointer. Not duplicated — one owner |
| `## ⭐⭐⭐ Stage 2 — the rite …` | KEPT | its own |
| `## ⭐⭐ Stage 3 — remembrance, and who could pay` | KEPT | its own |
| `## ⭐ The money — and a burial club …` | KEPT | the coroner economy lives here alone (mortal-vessel's Deferred bullet points here); its *"Not employer coverage — that is mortality-slate's re-embodiment vendor question"* fence is the correct boundary and was re-pointed to the canonical |
| `## ⚠ What must not happen` | KEPT | its own |
| `## Open questions` (1–7) | KEPT | its own; Q1 (*does a shade attend their own funeral?*) reads `requiresEmbodied` but is a funeral question, not a passage one |
| `## What this slate does NOT cover` | KEPT | the *Coming back* bullet re-pointed to mortal-vessel |
| `## Cross-references` | KEPT | the mortality-slate line re-pointed |

Status block unchanged (`UNBUILT` · its `Left` · `a build`) — nothing
left or arrived.

## Link re-points (every reference to the retired file outside `README.md` / `roadmap.md`)

- `docs/slates/builds/end-of-life-slate.md` — five mentions (l.89, 166,
  175–178, 231–235, 262–263): each now names `mortal-vessel-slate` (and,
  where the target is the vendor question, its `§ Absorbed from
  mortality-slate — The re-embodiment service`), keeping the historical
  *"moved here from mortality-slate's Left"* provenance as prose.
- `docs/subsystems/mortality.md § Deferred`, the *re-embodiment service*
  bullet (l.642) — the link now targets `mortal-vessel-slate § Absorbed
  from mortality-slate — The re-embodiment service`. ⚠ Noted, not
  touched: the next bullet down (*Corpse custody … remains … the coroner
  economy*) still carries no pointer to `end-of-life-slate.md`, which has
  owned all three since 2026-09-10 — a doc edit outside a link re-point,
  so left for the coordinator.
- `docs/subsystems/retail.md § …` (l.63, the *shade cannot buy* paragraph)
  — `→ mortality-slate` now `→ mortal-vessel-slate (§ Absorbed from
  mortality-slate — The re-embodiment service)`.
- `docs/slates/README.md` l.152–153 — **not touched** (the sweep's): its
  `mortality` row now points at a deleted file and its `mortal-vessel` row
  carries the pre-merge `Left`.
- `docs/slates/builds/combat-experience-slate.md` l.522, 577 — link
  mortal-vessel (the canonical), unaffected.

## Status block — `mortal-vessel-slate.md`

- Status: PARTIAL → PARTIAL (lead clause corrected: *"the death arc
  (Theses 6–8) shipped"* → *"the death arc shipped (Thesis 6, Thesis 8's
  PC half …)"*, per `body.md`'s Uncertain finding on Thesis 7).
- Left: *Thesis 4 · Thesis 5 · the law-enforcement half of Thesis 3* →
  the same three **+** *Thesis 8's NPC half (narrative-level cycling)*
  (was in the body, unrepresented) **+** the three moved items, in
  mortality-slate's own words: *the re-embodiment service as content (the
  temple vs clinic vendors, employer coverage, the price of walking out,
  and a service's own diminishment lever) · the in-circle death arc
  (minting a real body from inside a circle) · the passage ladder —
  Thesis 7's opt-in thresholds + the route catalogue (trial / bargain /
  Orpheus; what a resurrection business charges and who else sells
  passage)*. Every `Left` item corresponds to a section in the body
  (Theses 3, 4, 5, 7, 8; the three absorbed sections) and every open
  section is represented.
- Size: *a build* → *a build*. ⚠ For the coordinator: the body is really
  **two separable pieces of work** — the moderation / prison half (Theses
  3–5: a build of its own, platform-fundamental) and the death-content
  half (the vendors, the route catalogue, the in-circle arc: mortality-
  slate stamped it *a wave*, and it still is one — content riding a
  temple/clinic or a courts build). One stamp cannot say both; *a build*
  is the honest max.
- Added line: `**Absorbed 2026-09-21:** mortality-slate.md …`.

## Verify

- `git diff --stat`: `mortal-vessel-slate.md` +100 net (four verbatim
  insertions = 80 lines incl. headings/rules; status block +12; the older
  block's re-point +1; two pointers +6; minus 0 cut); `end-of-life-slate.md`
  +4 (re-point wraps); `mortality.md` +1; `retail.md` +1;
  `mortality-slate.md` deleted (154 lines, unstaged — `rm`); this ledger
  new. Nothing else.
- Every heading of `mortality-slate.md` (17 rows, 1–17) is in the table.
  Moved blocks diffed byte-identical against the source ranges before the
  source was deleted.
- Not committed; not staged.
