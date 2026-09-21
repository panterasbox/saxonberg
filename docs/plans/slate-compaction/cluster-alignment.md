# Cluster-merge pass — alignment

Branch `design/slate-cluster-merge`. Procedure:
`.claude/skills/compact-slate/SKILL.md` § The cluster-merge pass.

**Canonical:** `docs/slates/builds/alignment-slate.md` (343 → 381 lines) —
named as the successor by every other file in the cluster, and the larger
remaining design by a wide margin.

**Secondaries:**
- `docs/slates/builds/alignment-religion-slate.md` (82 lines) — a pointer
  stub left by an earlier compaction pass (`unlinked-7.md`), which had
  already absorbed everything but one unowned block (the DRG
  interdependent-roles / co-op conflict model) and explicitly deferred
  that decision to this pass.
- `docs/slates/builds/faith-slate.md` (338 lines) — checked for duplicated
  open design against the canonical. None found.
- `docs/slates/builds/altar-slate.md` (173 lines) — checked for duplicated
  open design against the canonical. None found.

---

## `alignment-religion-slate.md` — 82 → 0 lines (file retired)

Every remaining heading in this stub disposed of. The file is deleted.

| secondary heading | outcome |
|---|---|
| status block + `⚠ SUPERSEDED` blockquote + framing paragraph | DUPLICATE → canonical's own status block + supersession note (updated to record the retirement date and that the DRG item is now absorbed) |
| `## Alignment` — the superseded-pointer paragraph (asymmetric axes / one machine two rosters / worship vs. alignment) | DUPLICATE → `alignment-slate.md § Two asymmetric axes` / `§ One machine, two rosters` / `§ Worship vs. alignment` (already the pointer target; no new text) |
| `## Alignment` — the DRG doctrine paragraph (*Harm lives OFF the alignment grid* + the three bullets + the *"no evil players" / DRG-quality community"* close) | **MOVED verbatim** → `alignment-slate.md § Absorbed from alignment-religion-slate — Alignment (the DRG lesson)` (new section, inserted between `§ Model the antidote, not the poison` and `§ What ships (fidelity)`). Flagged inline (not part of the verbatim text) that the closing *PvE-narrative* claim is contradicted by shipped consented PvP (`combat.md § Terms & consent`) and needs reconciling, not inheriting |
| `## Religion (worship + deities)` — the superseded-pointer paragraph | DUPLICATE → `alignment-slate.md § Worship vs. alignment` / `§ The pantheon as legend` / `§ The mirror` (already the pointer target) |
| `## Deferred / content` — demigod roster / favor-access-mechanics / favor's-manifestation items | DUPLICATE → `alignment-slate.md § Deferred` (roster, favor/access mechanics already listed there) |
| `## Deferred / content` — *the interdependent-roles / co-op party design (the DRG mechanics)* | **MOVED** → appended to `alignment-slate.md § Deferred` as its own bullet, cross-referencing the new absorbed section and the reconciliation flag |
| `## Connections` | DUPLICATE (mostly) → `alignment-slate.md § Connections` already lists chronicle, char-gen, and (now) combat.md; the two dead wikilinks (`[[capability-magic]]`, the legacy *Temple of the Ages*) and the *aspiration archetypes* mention carry no design content beyond what the DRG-lesson section states and are dropped as non-substantive, not moved |

**Status block:** `UNBUILT (pointer stub)` → file deleted (`Left` went to
empty once the DRG block moved — this is the skill's ABSORBED case, applied
one pass late because the prior batch correctly left the call to the
cluster pass).

**Links re-pointed** (outside `docs/slates/README.md` /
`docs/roadmap.md`, which are the sweep's):
- `docs/slates/builds/affiliation-slate.md` — table row + *Connections*
  list entry, both → `./alignment-slate.md`
- `docs/slates/builds/eternal-university-narrative-slate.md` — the
  deferred-alignment-readout citation → `./alignment-slate.md`
- `docs/slates/builds/eternal-university-slate.md` — the Chapel/Mission
  clergy citation → `./alignment-slate.md`

**Left untouched** (historical / index, not this pass's to edit):
`docs/slates/README.md` (index — the sweep's); four ledger files under
`docs/plans/slate-compaction/` (`grouping.md`, `behavior.md`,
`magic-items.md`, `narrative.md`) and `unlinked-7.md` itself, which cite
the old filename as a historical fact about a past batch, not a live
pointer.

---

## `faith-slate.md` — checked, no cut

Faith-slate designs a *different* mechanism from alignment-slate's
`DevotionMixin`: a `Tradition` row of `kind: faith` with authored
`liturgy`/`transgressions` deed-tags, a derive-on-read *fidelity* (never
readable) via the trait two-value arithmetic, a `CongregationGroupProvider`,
scheduled ritual, and the temple as an institution. It does not cite
`alignment-slate.md` anywhere (its one hit on "alignment" is a NetHack
criticism, unrelated) and states its own scope explicitly: *"It re-solves
nothing. The inherited account, the attention order, the null-law error
model — all Tradition's."* No section restates an open item alignment-slate
already carries.

| secondary heading | outcome |
|---|---|
| `## What prior art got right, in one table` | KEPT |
| `# Part 1 — Precepts and the fall` (+ `## The mechanic nobody has automated`, `## The shape`, `## The derivation — and the hardest constraint`) | KEPT |
| `# Part 2 — Congregation: the consequence is social` (+ `## How the congregation finds out — witnesses, never broadcast`) | KEPT |
| `# Part 3 — Ritual: practice at a time and place` | KEPT |
| `# Part 4 — The temple as an institution` | KEPT |
| `# Part 5 — Founding a faith` | KEPT |
| `## Objects and interactions` (+ `### New`, `### Reused unchanged`, `### New collections`) | KEPT |
| `## ⚠⚠ Dangers` | KEPT |
| `## Open questions` | KEPT |

No file changes. Flagged for a future design pass (not this one — no
literal duplicate, so out of scope): alignment-slate's `DevotionMixin`
(a single professed `patronKey` + `tone`) and faith-slate's `Tradition
kind: faith` (a full congregation/liturgy/ritual layer) are two worship
mechanisms that will eventually need to say how they compose — is
`DevotionMixin` the shallow default and `Tradition` the opt-in deep layer,
or does one supersede the other? Neither slate states it; this is a
thematic-neighbour note, not a duplicated open item, so nothing was cut
per the scope instruction (*"if two slates merely cite each other, touch
nothing and say so"* — here they don't even cite each other, which is
weaker than the assumed premise).

---

## `altar-slate.md` — checked, no cut

Altar-slate cites `alignment-slate.md` once (*"the derived alignment the
god-you-feed drives"*) — a citation, not a duplicated section. Its own
subject (the `AltarMixin` rite-instrument: witness/bind/consecrate/cost,
the butcher-or-offer sacrifice fork, consecration/desecration/taint) has
no counterpart in alignment-slate.

| secondary heading | outcome |
|---|---|
| `## The altar — object *and* class` | KEPT |
| `## What altars do — the rite-instrument` | KEPT |
| `## Sacrifice — the mechanic` | KEPT |
| `## Altar taxonomy — patron & alignment` | KEPT |
| `## Sentient sacrifice — the forbidden` | KEPT |
| `## The Ordinance mirror — the Feed as the anti-altar` | KEPT |
| `## The exemplar — the prophet's wilderness altar` | KEPT |
| `## Open (residual)` | KEPT |

No file changes. One thematic overlap flagged, not merged: `## Altar
taxonomy` reuses the same patron roster (Pan/Cernunnos, Goibniu, Vesta,
Eir, Aletheia, Mammon/Moloch) as alignment-slate's pantheon grid, but for
a different open item — *which rite fits which patron's altar* vs.
*minting the demigod roster as authored content* (alignment-slate
`§ Deferred`). Not the same open item, so KEPT rather than merged; a
future content-authoring pass for the pantheon should read both.

---

## Summary

| file | before | after | outcome |
|---|---|---|---|
| `alignment-slate.md` (canonical) | 343 | 381 | +1 section (`§ Absorbed from alignment-religion-slate`), +1 Deferred bullet, +1 Connections entry, re-stamped status block |
| `alignment-religion-slate.md` | 82 | 0 (deleted) | fully DUPLICATE/MOVED; retired |
| `faith-slate.md` | 338 | 338 | untouched — KEPT, no duplicate found |
| `altar-slate.md` | 173 | 173 | untouched — KEPT, no duplicate found |

Net: 936 → 892 lines across the cluster (before this pass, counting the
now-deleted file; 343 + 338 + 173 = 854 lines remain across the three
surviving files).
