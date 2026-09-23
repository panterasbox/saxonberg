# Cluster merge — kitchen / provisions

> Pass: slate cluster-merge (after compaction), 2026-09-21. Procedure:
> `.claude/skills/compact-slate/SKILL.md` § The cluster-merge pass.

## Cluster

- `docs/slates/builds/fridge-design-pack.md` — 472 lines — **canonical for cold storage**
- `docs/slates/tails/preservation-slate.md` — 194 lines — **canonical for the preserving levers that remain** (`f_pH`, sealing)
- `docs/slates/builds/room-condition-design-pack.md` — 314 lines — **canonical for room condition / hygiene** (`Soilable`, debris, `restQuality`)
- `docs/slates/tails/hearth-and-larder-design-pack.md` — 296 lines — secondary (its own subjects: the hearth, the larder's economic story, the compost heap)
- `docs/slates/builds/food-safety-slate.md` — 120 lines — secondary (its own subjects: molds, rancidity, the attach points)

## Canonicals — why three, per duplicated item

Three subjects were duplicated across the five files, and each has a
different natural owner; no single file is the authority the others name.

- **Cold storage / the fridge → `fridge-design-pack.md`.** The only file
  that DESIGNS cold storage (the cold-container substrate, `Coolbox`,
  `ClimateControl`, `Powered`, the icebox-first fault line). The other
  four only cite it: hearth Part 0 reads it *"as a template"*,
  preservation's *"it also solves the fridge problem"* is its own
  consequence (the winter/summer inversion), and the fridge pack's Part 3
  cites preservation back for the agricultural year. **Mutual citation,
  not duplicated design — nothing moved into or out of the fridge pack.**
- **Curing / drying → shipped; what remains → `preservation-slate.md`.**
  `cure`/`dry`/`smoke` shipped (`trade-cooking/…/cmd/crafting/{cure,dry}.yaml`,
  `CuredMixin` → `spoilage.md § The water state`); the compaction pass
  already cut the shipped mechanism from all three files that carried it.
  The open remainder is the fourth lever `f_pH` and the sealing decision,
  and `food-safety-slate.md` names preservation as its authority for
  exactly that (*"its § terms, not methods is the completeness doctrine and
  is inherited unchanged"*). Preservation also carries the correct carrier
  name (`MaturationProfile` — `docs/subsystems/maturation.md` l.75–78;
  there is no `FermentProfile` anywhere in `packages/`).
- **The larder's room half ↔ room-condition's hygiene half →
  `room-condition-design-pack.md`.** It carries the larger remaining
  design by far (314 lines, all UNBUILT — verified 2026-09-19 in its own
  status block and re-verified now: no `SoilableMixin`, no `sweep`/`wipe`/
  `tidy`/`dispose`/`bathe` view). Two details from the secondaries belong
  to its items: the hearth's *`restQuality` gains room temperature* (the
  `restQuality` aggregation is room-condition's Part 3 row + open Q1) and
  food-safety's *hands* attach point (Soilable on bodies — room-condition
  Part 1's *"dirty hands"* / Part 5's *"a body's own Soilable is a fomite"*).

No build is running from any of the five (`git worktree list`: build-1
`build/economic-bootstrap` · build-2 `build/fishing` · build-3 detached ·
build-4 `design/treatment`). The fishing build cites preservation as its
salt-cod interlock but does not build from it.

Verified before merging (the open items are still open): no
`CompostingMixin`, `CoolboxMixin`, `ClimateControl`, `SoilableMixin`,
`FermentProfile` under `packages/server/src` or any pack `src/`
(`PoweredMixin` hits are arcana's `ManaPowered`, a different thing); no
`turn`/`sweep`/`pickle`/`compost` view; `restQuality` exists only as
`Postured.getRestQuality` with no room/bedding input. The `Vat` collision
food-safety names is real and documented:
`spoilage.md § ⚠⚠ Fermentation is the one collision to watch` (l.753 —
*"luck resting on a decision, not a guard"*).

## Secondary headings — `hearth-and-larder-design-pack.md`, in file order

1. `# Hearth & larder design pack — the kitchen as a real place` (title)
2. status block
3. See also
4. `## Part 0 — What the fridge actually was, and why it generalises`
5. `## Part 1 — ⭐ The hearth: a room that answers to what is burning in it`
6. `### It is the fridge with the sign flipped`
7. `## Part 2 — The larder: what this pack adds, and what it must NOT re-design`
8. `## Part 3 — ⭐⭐⭐ The compost heap: closing a loop that is already open at one end`
9. `### The loop, and every link exists but one`
10. `## Part 4 — Designed to the format`
11. `## Part 5 — ⚠ Dangers`
12. `## Part 6 — Pedagogy`
13. `## Interop map`
14. `## Open questions`

## Secondary headings — `food-safety-slate.md`, in file order

1. `# Food safety slate — the second population, and what preservation actually preserves` (title)
2. status block
3. See also + Substrates
4. the Parts 0–9 cut note (italic paragraph)
5. `## Part 10 — The cut, and why`
6. `## ⭐ The attach points the build left open`

## Conservation table — `hearth-and-larder-design-pack.md`

Written row by row as each section was resolved.

| # | heading / paragraph | outcome | where |
|---|---|---|---|
| 10a | `## Part 4 — Designed to the format` → table row `✳ Preservation recipes — dry · salt · smoke · pickle; each extends a Freshness clock — rides crafting + spoilage` (l.193) | DUPLICATE (three of the four shipped; the fourth is the canonical's) | dry/salt/smoke: `trade-cooking/…/cmd/crafting/{cure,dry}.yaml` + `CuredMixin` → `spoilage.md § The water state` (already cut from this file's Part 2 at compaction); pickle: `preservation-slate.md § ⭐ Terms, not methods` (the `f_pH` lever, *"pickling as a MaturationProfile row + one read"*). Row replaced by a pointer row |
| 10b | `## Part 4` → table row `✳ restQuality gains room temperature — a second input beside bedding — update` (l.194) | MOVED, verbatim | `room-condition-design-pack.md § Part 3 — Designed to the format` → `### Absorbed from hearth-and-larder-design-pack — restQuality gains room temperature` (the row, under the same table header, plus a pointer to hearth Part 1 for the mechanism). The `restQuality` aggregation is room-condition's item (its Part 3 row *"✳ restQuality aggregation"* + open Q1 *"the restQuality curve"*); room temperature was an input it lacked. Row replaced by a pointer row. ⚠ The Part 1 sentence *"— and `restQuality` gains a second input beside bedding cleanliness"* (l.99–100) stays: it is one clause of the *What reads it* paragraph and paragraphs are not split; it now reads as the mechanism the moved row points back to |
| 4 | `## Part 0 — What the fridge actually was, and why it generalises` | KEPT (framing) | The pack's own spine — the four *template* bullets and *"why one build and not three"* say what THIS pack is for. The bullets summarise `fridge-design-pack.md § Part 3` / `§ Part 7` (passive tier first · atmospheric container · icehouse keeper · a clock given a counter) as a citation, not as a second copy of the design; the fridge pack remains the only place cold storage is designed. Mutual citation — untouched |
| 5 | `## Part 1 — ⭐ The hearth: a room that answers to what is burning in it` | KEPT | The pack's own subject (thermal.md's named Wave-2 indoor room-ambient follow-on); no other file in the cluster designs it. ⚠ Overlap for the coordinator, not merged: `fridge-design-pack.md § Part 3B` (*"ClimateControl is the whole kitchen … hot twin → oven/range/heater"*) reaches the same READ (a room's ambient answers to a heat source in it) by a different mechanism (a new `ClimateControl` setpoint mixin) than Part 1 (fire's shipped combustion driver + thermal mass/`barrier`). Two mechanisms for one read; requirements should pick one |
| 6 | `### It is the fridge with the sign flipped` | KEPT | Part 1's substrate table + the frozen-pipes refusal; its `restQuality` clause is the mechanism behind row 10b (see there) |
| 7 | `## Part 2 — The larder: what this pack adds, and what it must NOT re-design` | KEPT | The pack's own: the room and the *machine devalues the craft* economic story + the victualler. The shipped-mechanism note at its head was already the compaction pass's pointer to `spoilage.md` |
| 8 | `## Part 3 — ⭐⭐⭐ The compost heap: closing a loop that is already open at one end` | KEPT | The pack's own; no `CompostingMixin` / `turn` anywhere; `feed` + `COMPOST_TAG` still the consumer without a producer |
| 9 | `### The loop, and every link exists but one` | KEPT | as 8. Its input row *"[room-condition] debris"* is a citation of the room-condition pack (which routes debris to a bin / public litter, not a heap) — a detail for the room-condition build to honour, left where it is |
| 10 | `## Part 4 — Designed to the format` (minus rows 10a, 10b) | KEPT | the pack's own work table + items 4–7. ⚠ Stale but out of this pass's scope: item 7's *"Preservation is the largest of the three and wants the crafting-recipe branch fire.md already defers"* and item 6's *"Spoilage is the hard prerequisite"* describe a state that shipped (compaction left them; a later sweep may cut) |
| 11 | `## Part 5 — ⚠ Dangers` | KEPT | 1–3 are the pack's own; danger 4 (*preservation as busywork* — cheap/slow/changes the food vs expensive/fast/preserves as is) is the craft/machine trade of Part 2, not a preservation-mechanism duplicate |
| 12 | `## Part 6 — Pedagogy` | KEPT | the pack's own; the *food microbiology* bullet is a one-line pedagogy claim, not a restatement of preservation's terms doctrine |
| 13 | `## Interop map` | KEPT (spine) | |
| 14 | `## Open questions` (Q1–Q5) | KEPT | Q1, Q2 (heap) · Q4 (room ambient) · Q5 (mana vs restQuality) are the pack's own. ⚠ **Q3** (*does preservation change what a food IS, or only how long it lasts — lean both, salt fish a different item*) is a preservation question kept here because its last clause is Part 2's craft/machine trade; listed under *Uncertain* below — the identity half is answered by the code |
| 2 | status block | re-stamped | `Left` loses *`restQuality` gains room temperature* (moved, row 10b) with a dated pointer; `Size` a wave → a wave |
| 1, 3 | title · See also | KEPT (spine) | See-also links all still resolve (no file in the cluster was retired) |

## Conservation table — `food-safety-slate.md`

| # | heading / paragraph | outcome | where |
|---|---|---|---|
| 5a | `## Part 10 — The cut, and why` → *"Molds are OUT …"* + the two held bullets (aflatoxin, ergot) | KEPT | the slate's own; no other file in the cluster carries molds (disease-slate is outside the cluster and does not design them either) |
| 5b | `## Part 10` → *"Medicine is OUT …"* | KEPT | the slate's own boundary with pharma-slate (outside the cluster) |
| 5c | `## Part 10` → *"Rancidity is OUT and is not this law …"* | KEPT | the slate's own; `spoilage.md` records the deferral, nobody designs it |
| 5d | `## Part 10` → *"Acidity (`f_pH`) is OUT — the fourth lever … the term set stays visibly closed …"* (l.81–84) | DUPLICATE | `preservation-slate.md § ⭐ Terms, not methods` — the lever table row (*acidity `f_pH` — pickling, vinegar, lacto-fermented — ⭐ the one genuinely missing term*), consequence 1 (*a `MaturationProfile` row plus an acidity read*) and *"Completeness, concretely … any method anyone names … is checkable against the equation rather than needing design work"*. Paragraph replaced by a one-line pointer. The only detail the two differed in — `FermentProfile` vs `MaturationProfile` — is a stale name, not a design difference (`FermentProfile` exists nowhere in `packages/`; `maturation.md` l.75–78) |
| 6a | `## ⭐ The attach points the build left open` → intro paragraph + **Molds** bullet | KEPT | the slate's own |
| 6b | → **`ContagionSpec`** bullet | KEPT | a pointer at disease-slate (outside the cluster) — its own boundary record |
| 6c | → **Hands** bullet (l.103–106: *"D3 names one and this build ships no host for it. The attach point is `Creature`; the consumer is the disease build … every meal a hygiene chore …"*) | DUPLICATE → detail MOVED, verbatim | `room-condition-design-pack.md § Part 1` → `### Absorbed from food-safety-slate — Hands`. The item (Soilable on bodies; dirty hands; hands as a fomite) is room-condition's Part 1 table row + Part 5; the detail room-condition lacked — the attach point is `Creature`, the disease build is the consumer, and *composing it as a per-meal chore buys a worse game* — moved whole. Bullet replaced by a pointer |
| 6d | → **`f_pH`** bullet (l.107–109: *"the fourth hurdle … A `FermentProfile` row plus one read. ⚠ Inherits the unresolved `Vat` name collision."*) | DUPLICATE → detail MOVED, verbatim | `preservation-slate.md § ⭐ Terms, not methods` → `#### Absorbed from food-safety-slate — the f_pH attach point`. The lever is preservation's; the detail it lacked is the `Vat` collision (`spoilage.md § ⚠⚠ Fermentation is the one collision to watch`, l.753). The insert's italic note names the collision's doc home and that `FermentProfile` is the older name of `MaturationProfile`. Bullet replaced by a pointer |
| 6e | → **Irrigation contamination** bullet | KEPT | the slate's own seam (`ContaminableMixin` onto `WateringCan`) |
| 6f | → **`trade-butchery`** bullet | KEPT | the slate's own |
| 6g | → **A durative `cook`** bullet | KEPT | cooking-slate's territory is outside the cluster; the seam record stays here |
| 6h | → **Rancidity** bullet | KEPT | as 5c |
| 4 | the Parts 0–9 cut note | KEPT (spine) | the compaction pass's own pointer |
| 2 | status block | re-stamped | `Left` loses *`f_pH` + the `Vat` collision it inherits* and *hands on `Creature`* (moved, rows 6c/6d) with a dated pointer; `Size` a build → a build (molds + rancidity each *"want a build"* by the slate's own words) |
| 1, 3 | title · See also · Substrates | KEPT (spine) | See-also still names preservation as the authority for the terms doctrine — now literally true for `f_pH` |

**KEPT remains in both secondaries** — neither is retired. No file was
deleted; no link re-pointing was needed.

## Canonical — `fridge-design-pack.md` — 472 → 472 lines · Status PARTIAL → PARTIAL

Untouched. Every other file's mention of cold storage is a citation of this
one (hearth Part 0 / Interop; preservation § The agricultural year's *"it
also solves the fridge problem"*; room-condition Q5's *"the
Part-5-of-the-fridge-pack social-credit line"*), and this pack's citations
run the other way (Part 3 → preservation for the agricultural year). No
duplicated open design in either direction, so nothing moved in or out.

- Left / Size: unchanged (*the cold-container substrate · the icebox ·
  `ClimateControl` + `Powered` · the COP fork · the fridge/freezer rows ·
  the mirror inbound channel · the civic extension · the partner surface*;
  a build).

## Canonical — `preservation-slate.md` — 194 → 211 lines · Status PARTIAL → PARTIAL

Insertions (verbatim from food-safety, under a labelled heading):

- `§ ⭐ Terms, not methods` → `#### Absorbed from food-safety-slate — the f_pH attach point` (after the two-consequences list, before *Completeness, concretely*) — 13 lines: a 7-line italic provenance note (naming `spoilage.md § ⚠⚠ Fermentation is the one collision to watch` and the `FermentProfile` → `MaturationProfile` rename) + the 3-line bullet verbatim
- See-also → one labelled `food-safety` line (the slate did not link its own child) — 2 lines

No existing sentence edited or removed.

### Status block
- Left: *the acidity term `f_pH` (pickling as a `MaturationProfile` row + one read) · the sealing decision · the agricultural year (winter stores) · the trade geography spoilage creates · salt as a mined and taxed staple* → same, with the `f_pH` item widened by *⚠ inherits the fermentation/spoilage `Vat` collision — absorbed from food-safety*
- Size: a wave → a wave

## Canonical — `room-condition-design-pack.md` — 314 → 342 lines · Status UNBUILT → UNBUILT

Insertions (verbatim from the secondaries, each under a labelled heading):

- `§ Part 1` → `### Absorbed from food-safety-slate — Hands` (after the pests paragraph, before `### Every deposit and every clear carries an ACTOR`) — 13 lines: a 6-line provenance note + the 4-line bullet verbatim
- `§ Part 3` → `### Absorbed from hearth-and-larder-design-pack — restQuality gains room temperature` (directly after the *New / updated mixins* table) — 11 lines: a 5-line provenance note + the table row verbatim under its own header

No existing sentence edited or removed.

### Status block
- Left: *`SoilableMixin` · … · the `restQuality` aggregation · …* → *`SoilableMixin` (items · surfaces · bodies — hands on `Creature`, the attach point absorbed from food-safety)* · … · *the `restQuality` aggregation (bedding `Soilable` + room condition, and room temperature — absorbed from hearth-and-larder)* · … ; the other seven items unchanged
- Size: a build → a build

## Secondary — `hearth-and-larder-design-pack.md` — 296 → 297 lines · Status PARTIAL → PARTIAL

- Sections: 11 body headings + title/status/See-also. DUPLICATE 1 row (Part 4 preservation-recipes) · MOVED 1 row (Part 4 `restQuality`) · KEPT 11 headings (Parts 0–3 and their subsections, Part 4 minus two rows, Parts 5–6, Interop, Open questions).
- Not retired — its three subjects (the hearth, the larder's economic story, the compost heap) are its own; `Left` re-stamped to exactly those three. Line count grew by one because the two pointer rows and the dated `Left` note are longer than what they replaced.

## Secondary — `food-safety-slate.md` — 120 → 117 lines · Status PARTIAL → PARTIAL

- Sections: 2 body headings + title/status/See-also + the Parts 0–9 cut note. Within them: DUPLICATE 1 paragraph (Part 10 acidity) + 2 bullets with their detail MOVED (hands · `f_pH`) · KEPT 3 paragraphs (molds, medicine, rancidity) + 6 bullets (molds, `ContagionSpec`, irrigation, `trade-butchery`, durative `cook`, rancidity).
- Not retired — molds, rancidity and four attach points are its own; `Left` re-stamped to those.

## Links re-pointed

None needed — no file was deleted. The See-also additions above are new
labelled lines, not re-points.

## Uncertain / for the coordinator

- ⚠ **Two mechanisms for one read — the warm room.** `hearth-and-larder § Part 1` (fire's shipped combustion driver + thermal mass/`barrier`; explicitly *"the hearth does not depend on"* new mixins) and `fridge-design-pack § Part 3B` (*"ClimateControl is the whole kitchen … hot twin → oven/range/heater"*, a new setpoint mixin) both make a room's ambient answer to a heat source in it. Not the same text, so not merged; requirements for either build should choose whether a hearth is a `ClimateControl` host or the thermal follow-on as written.
- ⚠ **Hearth Q3 is half-answered by the code.** *"Does preservation change what a food IS, or only how long it lasts — lean both, salt fish a different item with different `Freshness` and meal tags."* Shipped: the cured thing stays the SAME row, with per-instance `moisture`/`solute` and prose bands (`spoilage.md § The water state` — *"nobody enumerating 'salt cod' anywhere"*). The identity half is decided against the lean; the meal-tags half is open. Kept verbatim in hearth (its last clause is the pack's own craft/machine argument); flagged rather than cut because this is a cluster pass, not a compaction.
- ⚠ **The sealed-jar row vs the sealing decision.** `fridge-design-pack § Part 3` lists *"Sealed jar / crock — none — just seals air + slows wetness — ships with update #1"*; `preservation-slate § Terms, not methods` consequence 2 rules that sealing *"stays binary on purpose"* until a consumer wants a hurdle multiplier. The jar row is that consumer, half-designed. Both untouched; the preservation slate is the authority on the physics.
- **Room-condition Q5 is already a pointer** (*"the Part-5-of-the-fridge-pack social-credit line, here too"*) at `fridge-design-pack § Part 5` / open Q5. DUPLICATE by content, left as written — a one-line question that names its canonical needs no further cut.
- **Room-condition's immunity wire vs disease-slate.** Room-condition keeps *"the `Resists.factor` immunity wire (after disease)"* in `Left` and Part 5's *"a clean home is immunity"*; `disease-slate.md` (absorbed the disease pack this pass; outside this cluster) lists *"care-is-immunity across every host (… the room-condition / hygiene half, both unbuilt)"*. The two name each other; the room-condition pack owns the home half, disease the seam. Pointers only, per the assignment.
- **Debris → heap vs debris → bin.** Hearth Part 3 feeds *"room-condition debris"* into the compost heap; room-condition Part 1/Part 5 route debris to *"a bin, or dumped → public litter"*. Not a contradiction (a heap is a bin the garden owns) but room-condition's `dispose` design does not know the heap exists. Left in the hearth as its own; whichever builds second should read the other.
- **Out of scope, noted for a later compaction:** `preservation-slate § Open questions` items 1–2 (*where the gauge is composed*; *what the material constant actually is*) are answered by the code (`FreshnessMixin` on `Provision`; per-material Arrhenius `Ea` — `spoilage.md § The gauge`, `§ The rate law`) and item 5 (*does sealing do physics*) duplicates the same file's consequence 2; hearth Part 4 items 6–7 describe spoilage as an unshipped prerequisite; `fridge-design-pack § Part 1.2` still says *"lives in `obj/`"* (the branch is `platform/thing/` today). None is duplicated OPEN design across files, so none was touched here.
