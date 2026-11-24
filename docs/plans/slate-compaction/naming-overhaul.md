# Slate compaction ledger — naming-overhaul sweep (MR !650)

Compacted against the code on `build/naming-overhaul`, 2026-11-23.

## docs/slates/tech-debt/document-traits-slate.md  — 301 → 67  · Status UNBUILT → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- `## The rules` rules 1, 2, 4 (11 lines) — code: `lib/document/DocumentKind.ts`, 43 `content/kinds/*.yaml`; doc: `document-store.md § Kinds are declared`
- `## The survey (2026-11-20, all 42 kinds)` (41 lines: the three families, *Code that depends on the list being closed*, the five defects, *Doctrine conflict*) — code: `DocumentKinds.ts` deleted; `NON_TEMPLATE_DIRS` (`lib/paths.ts:264`) is four non-document dirs; `check-template-census.ts:70` derives its set; `kinds/{recipe,archetype,help-concept,blueprint,name-bank}.yaml` are `catalogued`; `kinds/instrument.yaml` has a `paper` template; doc: `document-store.md § Kinds are declared`, `§ Idea or document — the test` (limb 1 restated), `§ The catalogue card`
- `### titled` (10 lines) — code: `DocumentKind.titleOf`; doc: `§ Kinds are declared` (trait table, *Every document has a title, a date and a page*)
- `### keyworded` (21 lines) — code: `DocumentKind.keywordsOf`, `DocumentCatalogue.named`; doc: `§ Kinds are declared`, `§ The catalogue card`
- `### filed` (22 lines) — code: `DocumentLogic.writeDocument`, `water/content/kinds/water-right.yaml`; doc: `§ The one write funnel`, the `water-right` paragraph
- `### dated` all but the expiry bullet (13 lines) — code: `kinds/release.yaml` (`publishedAtS`, indexed), `kinds/edition.yaml` (`frozenAtS`); doc: trait table, `§ The catalogue card`
- `### Where a kind is declared` all but the `requires` bullet (33 lines) — code: `PackLogic.activeDocumentKinds`, `DocumentKindCatalogue`; doc: `§ Kinds are declared`, `§ The one write funnel` step 6
- `### The installer trio` (41 lines) — code: `PackLogic` (no `DOCUMENT_VALIDATORS`, no `fromData` validation; `invalidateDocumentKind` reads `servedBy()`); doc: trait table, funnel steps 3–4, 8
- `### The small ones` (20 lines) — code: `kinds/{instrument,bore,edition,rate-card,stream-token,topic,aroma}.yaml`; doc: trait table
- `### Herd, water-right, warehouse-receipt stay documents` (10 lines) — code: their `kinds/*.yaml`; doc: `§ Idea or document — the test` limb 1
- `## The vocabulary, complete` (8 lines) — doc: the trait table
- `## Related` → the naming-overhaul requirements link (the doc retires at this sweep)

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `### Undeclared kinds are refused` (7 lines) — code: `lib/behavior/enforces.ts:152`, `platform/content/kinds/venue-eighty-six.yaml` → `document-store.md § Kinds are declared` (the `venue-eighty-six` paragraph; the refusal itself was already funnel step 1)
- the whys under `### dated` (game time), `### The installer trio` (*validated is not a trait*; a caching reader is the catalogue) and `### The small ones` (`ledger` = A2) → inserted at `document-store.md § Kinds are declared`, *Four decisions the declarations carry, and why* (21 lines)

### Superseded — cut
- (within the cuts above, shipped in a different shape — the doc describes what shipped) `venue-eighty-six` "likely `filed: business`" → declared plain; map claims as `ledger: grows` → `map` is `filed: map` only; `reason` as a `tree` → `tree` is on `topic`, `aroma`, `command-view`; emote's `keywords: searchTerms` → `keyworded: { unique: true }`

### Kept (UNBUILT)
- `## The rules` rule 3 — the test and the four kinds failing it
- `### dated` — the expiry bullet (a lifecycle trait)
- `### Where a kind is declared` — the installer bullet whose second sentence (a pack must `requires` the declarer) did not ship
- `### First consumers of keyworded` — kept whole (one paragraph; its last sentence is the open rule-3 question)

### Kept (spine)
- `## Terms`, `## Related`

### Uncertain — kept
- `### Where a kind is declared` (the `requires` bullet) — looked for a refusal in `PackLogic.ts` (`activeDocumentKinds` reads every discoverable pack's `kinds/`, no dependency check); `content-packs.md` still lists `requires.kinds:` as deferred. Plan D-A5 says it would be refused; found no code. The bullet's FIRST sentence (kinds read first) shipped — kept because splitting a bullet is below paragraph granularity.
- `### dated` expiry bullet names `expiresAt`; the field is `expiresAtS` since D-A10. Kept verbatim.

### Handoff (belongs in a doc outside my list)
- none

### Status block
- Left: retiring the closed `DOCUMENT_KINDS` list and everything that enumerates it · the five defects → whether `recipe`/`maturation-profile`/`fraction-schedule`/`archetype` are content (rule 3) · expiry as a lifecycle trait · a pack must `requires` the declarer of a kind it ships
- Size: a build → a tail
- Dropped the *In requirements* line.

## docs/slates/engine/mql-anchors-slate.md  — 197 → 98  · Status UNBUILT → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- `## Today (2026-11-20)` (12 lines; heading kept over a pointer) — falsified by the code: the seed words and both resolver branches are gone (`api/mql/relations.ts`, `resolver.ts:applyColon`); doc: `mql.md § Seeds — the root and the anchors`
- `## Decided` 1, 2 (8 lines) — code: `api/mql/relations.ts`, `PlayerNode`/`StuffIdNode` in the parser; doc: `mql.md § Seeds`
- `## Decided` 6 (1 line) — `~reachable` in `api/mql/relations.ts`; doc: `mql.md § Relations` table
- `## Decided` 7, 8 (16 lines) — code: `lib/relation/Relating.ts`; doc: `mql.md § Relations`
- `## Decided` 9 (6 lines) — the `source::verb` selector; doc: `command-routing.md` (affordance selector), `mql.md § History — naming overhaul`
- `## Decided` 10–13 (20 lines) — `:members` deleted, `thing:~`, bare `~name`, seeds as relations; doc: `mql.md § Seeds`, `§ Relations`, `§ Query aliases`; `mql-grammar.md`
- `## Decided` 15–18, 20 (25 lines) — code: `ContactsAddController` (the built-in-name warning), `via.relation` in `contacts remove`, `Relating.groupRefOf`, `HomePathNode`, `ContactsMixin` resident groups, `CommandController.named`; doc: `mql.md § Relations`, `social-graph.md § Policy subject`, `contacts.md`
- `## Decided` 22, 23 (7 lines) — doc: `mql.md § Relations` (`~here` is ONE thing), `§ Query aliases`
- `## Consequences to plan for` → the 23-`online`-views bullet (6 lines) — doc: `mql.md § online is retired`

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- the whys inside `## Decided` 1, 2, 7, 8, 13, 14, 15, 19 (lens 3a; a sigil never a reserved word and the rejected `:members` shape; built-ins cannot be masked, soft limit; per-asker answers; a person reached through the view's default scope; `~` vs the shell's home) → inserted at `mql.md § Relations`, new `##### Why relations look like this` (22 lines)

### Superseded — cut
- `## Decided` 4 (`:members` generalized into a protocol) — by decisions 7 and 10 of the same slate, as shipped: `mql.md § Relations`
- `## Decided` 19 (`~all`) — shipped as `~contacts` (review of !650): `mql.md § Relations` table

### Kept (UNBUILT)
- `## Decided` 3 — the who-is-online replacement (player-kept lists; its own build, unslated)
- `## Decided` 5 — `hail` rebuilt as an emission
- `## Decided` 14 — `@name`; kept whole (the `@id` half shipped, one paragraph)
- `## Decided` 21 — offline people wait for the person handle
- `## Consequences to plan for` → the `look` bullet

### Added (not a rewrite — carried from the retiring plan's `## Deferred seams`, verbatim)
- `## Left open by the naming overhaul (2026-11)` — *groups you are not in, and `mql:` notify subjects*; *who is online*. The plan says the slate keeps these and the slate had no sentence stating them; without the insert they would exist nowhere once the plan retires.

### Doctrine — kept
- `## What MQL is (owner, 2026-11-20)` — argues for a shipped boundary; `mql.md § What MQL can and cannot see` covers storage shapes, not this sentence
- `## ⭐ The standing question for an unresolved expression`

### Uncertain — kept
- `## Decided` 5 overlaps `signalling-slate` (the owner of the `hail` rebuild) — same open item in two slates; left for the cluster pass.
- `## Decided` 21 overlaps `person-targeting-slate § 3` — same.
- `## Decided` 14 still says *"the first build makes the id work"* — it did; kept verbatim because `@name` is in the same paragraph.

### Handoff (belongs in a doc outside my list)
- none

### Status block
- Left: `~reachable`'s shape · every view `scope:` and typed seed moves to `~` · the 23 views that scope to `online` → `@name` · who is online as player-kept lists · offline people as targets · a relation for a group you are not in · `mql:` notify subjects cannot be typed · `hail` as an emission
- Size: a build → a tail here; the who-list is its own build
- Dropped the *In requirements* line.

## docs/slates/tech-debt/one-resolution-rule-slate.md  — 346 → 203  · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- the *Counts, by verdict* paragraph under `## The rule` (6 lines) — a tally of §§ 1–3 as audited on 2026-11-03; the sections it counts are cut or reduced below
- `## 1. This MR's own carve-outs` — all 16 rows + `### ⭐ Rows 4–10 are ONE finding` (35 lines; heading kept over a pointer) — code: `api/grammar.ts` (`nameAmong`, `rank`, `scoreAll`), `lib/command/CommandController.ts:407` (`named`), `api/mql/types.ts:317` (`MqlOneResult.defaulted`), `BuyController` (no `.raw` read), `rent.yaml` (`type: duration`), `scripts/check-hand-matchers.ts` (every ceiling 0); doc: `presentation.md` (the naming rule), `mql.md § Match-quality scoring`, `retail.md § Naming a good`, `lint-family.md § lint:hand-matchers`
- `## 3. MQL` rows 1–8, 10–18 + the *Verdict* paragraph (21 lines) — rows 5, 6, 7, 11, 12 were already marked done (W2); rows 13, 14 are falsified by the code (the seed words and `:members` are gone — `api/mql/relations.ts`); doc: `mql.md § Match-quality scoring`, `§ Seeds`, `§ Relations`
- `## The build` steps 1, 3, 4, *The ratchet*, *Size* (21 lines) — code: `scripts/check-controller-resolution.ts` (`RAW_REREAD_CEILING = 0`, `VIA_AND_WORDS_CEILING = 0`), `check-hand-matchers.ts`; doc: `lint-family.md § lint:hand-matchers`
- `## 5. MQL reads only Perceptible` rows 1, 2, 5–14 + the *Verdict* paragraph (16 lines) — rows 1, 2, 5, 6, 7, 14 were marked done; rows 9, 10 are falsified (`$$`, the seed words); doc: `mql.md § Match-quality scoring`, `§ Pronoun memory`
- `## 6. Reuse ledger for the plan` (24 lines; heading kept over a pointer) — plan input, consumed by the build; doc: `presentation.md`, `command-spec.md`, `lint-family.md`
- `## 7` bullets: *real objects in reach* · *the naming rule* · *documents a player names* · *lists of things that do not exist yet* · *a holder's own parts* · *labels a player gave* (22 lines) — code: `GrammarApi.nameAmong`; `DocumentCatalogue.named`; `AetherHost.appNamed`, `Expanse.nodeNamed`, `HullBook`, `Tariff`; doc: `presentation.md`, `document-store.md § The catalogue card`, `mql.md § Relations`
- the old status block's *Done (controllers-are-io W2 …)* narrative and the *In requirements* line

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `## 7` *Durations* + `## 1` row 11 — code: `CommandDefinition.durationRefusal`, `CommandLogic.ts:2973`, `reasons/bad-duration.yaml`, `rent.yaml`/`fire.yaml` → inserted at `command-spec.md`, new `### ⭐ type: duration — one reading, game seconds` (20 lines)
- `## 1` row 3 (`defaulted` on a single bound result) — code: `api/mql/types.ts:317` → inserted at `command-spec.md § default:` after *One fact rides the result* (7 lines)
- `## 7` — who supplies candidates, and *nothing is made `Visible` to carry a description* (D-C4/D-C5) → inserted at `presentation.md`, a third bullet under the naming rule (14 lines)

### Corrected in a subsystem doc (a statement the code proves false)
- `command-spec.md § type:` table — the `duration` row said the bound value is **milliseconds**; `CommandLogic.ts:2973–2986` returns game seconds. One word changed (`milliseconds` → `game seconds`).

### Superseded — cut
- `## 1` ⭐ *The fix is in MQL, once* (the `Listing` protocol + a `listed` MQL scope) and `## 6`'s direction — by `## 7` of the same slate, as shipped: `presentation.md` (who supplies the candidates)
- `## 7` *A shop's inventory is real objects … `lineForWord`/`pricedKeyFor` retire* — by the code (plan D-C7 not taken; `buy`'s word stays a word, `Stock.lineForWord` names through the one rule): `retail.md § Naming a good`
- `## 7` *No `defaulted` fact* — by the code (`MqlOneResult.defaulted` shipped): `command-spec.md § default:`
- `## 7` *Durations … `StreamApi.parseDuration` retire* — it stays (owner: the stream verbs are on the wall clock): `command-spec.md § type: duration`

### Kept (UNBUILT)
- `## 2. LookController, entirely` — whole (the `look` half; `LookController.ts:686,741,763` still carry the class-specific appends)
- `## 3` row 9 — the tract rule's slow path (`resolver.ts:672 candidatesForAnchor`)
- `## The build` steps 2 and 5
- `## 5` the rule paragraph + rows 3, 4
- `## 7` intro + bullets: *real objects out of reach* (kept whole for `hail`) · *Ideas a player names by word* · *Brand, Locality, Organization compose `NamedMixin`* · *Organizations are reached by relation* · *Collection records*

### Kept (spine / already a pointer)
- `## 4. The scorer's NAME tiers` (a pointer stub since 2026-11-07)

### Doctrine — kept
- `## ⭐⭐⭐ The rule (user, 2026-11-03)` — the rule, what it buys, the sibling doctrine, what prompted it

### Uncertain — kept
- `## 7` *Ideas a player names by word* — looked for `PerceptibleMixin` on Spell; the plan's C3 note records that spells did NOT gain it (*descriptors carry keywords instead*) and calls it a review item. Did not check Reading, Condition, Lane, Species, App one by one. Kept whole.
- `## 7` *Brand, Locality, Organization compose `NamedMixin`* — plan C3 note: *the Organization `name` field is unchanged*. Kept.
- `## 7` *Organizations are reached by relation … No global name search* — `EmploymentApi.organizationNamed(text, paths)` scopes to the houses in hand, but `~employers`/`~business` were not minted and `EmploymentLogic.findOrganizationImpl` (`:428`) is still a global name read. Partly shipped in a different shape; kept because the stated end (no global search) is not met.
- `## 7` *Collection records* — channels, subjects, groups and parties name through `GrammarApi` (plan C6 ✅); did not find the *published directory to join*. Kept whole (one bullet).
- `## 7` *real objects out of reach* — everything but `hail` shipped; kept whole (one bullet). Overlaps `signalling-slate` and `mql-anchors-slate § 5`.
- `## 7` intro still says *"as settled so far"* and the closing line *"Every family in § 7 is settled"* — true of the design, kept verbatim.
- `## The build` step 5 still names rows 5, 7 beside row 9 (its own note marks them ✅ W2). Kept verbatim.
- Table rows were cut individually in §§ 3 and 5 (a row replaced by one pointer row). That is row granularity inside a table — finer than a section, coarser than a rewrite; flagged so the coordinator can restore the tables whole from git if it prefers.

### Handoff (belongs in a doc outside my list)
- → `employment.md` (naming a house): The naming overhaul left two things open here. `job apply`, `job quit` and `clock` name a house among the ones in hand (`EmploymentApi.organizationNamed(text, paths)` — the openings here, your employers), but the `~employers` / `~business` relations were not minted, and `findOrganization` is still a global name read for the record verbs (`chronicle`, `competence`) and `house appoint`. The slate's end state is *organizations are reached by relation, else by path; no global name search* (one-resolution-rule-slate § 7).
- → `lint-family.md § lint:hand-matchers`: the gate's three named exemptions and what retires each — `hail`'s matchers (signalling-slate), the stream verbs' `StreamApi.parseDuration` (the wall clock; nothing retires it until something else shows what real time needs), and a search (`help search`, `who --country` — not a name). (Check whether the section already lists them; the gate's header does.)

### Status block
- Left: dropped — the `defaulted` fact · one listing protocol + one scorer for entries (eleven matchers) · a `type: quantity` time arg for `rent` · the `lint:controller-resolution` census of `.raw`/`.via`/lower-casing. Kept — `look` renders what MQL bound (§ 2) · § 3 row 9's slow path + the tract candidate (§ 5 row 3) · the recognition tokens, `[keyword.x]`, a mid-chain literal (§ 5 row 4). Added (in the body, unrepresented) — § 7's unfinished families: Ideas by `PerceptibleMixin` keywords · Brand/Locality/Organization `NamedMixin` · organizations by relation · a published directory for collection records · `hail`'s matchers.
- Size: a build → a build (the `look` half), with the § 7 remainders a tail
- Dropped the *Done (W2)* narrative and the *In requirements* line.

## Notes for the coordinator

- No slate was ABSORBED; nothing was deleted.
- `docs/subsystems/command-spec.md` and `contacts.md` already carried unstaged edits from elsewhere when this pass began; mine in `command-spec.md` are the two inserts and the one-word correction above. `contacts.md` and `command-routing.md` were not touched.
- Nothing committed. Index files untouched.

### Coordinator follow-up (the sweep)
- `### Where a kind is declared` — the declarer rule (D-A5) was found unenforced by this pass; the sweep implemented it (`PackLogic.kindDeclarerFailures`, step `kind-declarer`, `PackLogic.kinddeclarer.test.ts`; platform-declared kinds exempt — pack zero is always installed) and cut the section and its `Left` item. Documented at `document-store.md` § Kinds are declared.
