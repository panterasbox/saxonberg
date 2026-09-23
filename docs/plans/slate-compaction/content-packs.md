# Slate-compaction pass — content-packs batch ledger

Four slates. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `content-packs.md`
only — everything that belongs elsewhere is under *Handoff*. Line numbers
below are the ORIGINAL file's. Verified against
`packages/server/src/mud/platform/idea/api/PackLogic.ts`, `mud/api/pack.ts`,
`lib/document/DocumentKinds.ts`, `lib/archetype/Archetype.ts`,
`packages/content/*/pack.yaml` (47 packs; `trade-hearth-cooking/` is a dead
directory with only `node_modules`, no manifest), `packages/server/package.json`
(the lint roster), and the subsystem docs named per entry.

---

## docs/slates/builds/content-packs-slate.md — 3323 → 922 · Status PARTIAL → PARTIAL

The slate's `Left` was 38 words; the body was 3,323 lines of which roughly
2,400 described the installer, the requires phase, the boot union, the
capability rung and the 2026-08 pack program — all shipped, and almost all
of it carried by `content-packs.md` in more detail than the slate. What
remains is genuinely open: the roster's unbuilt trades, the review tier,
install parameters, the verb-scope selector, the media kind, position
defs, contract forms, the repo split, staging, tree-qualified policies,
the pack watcher — and `Left` grew from 4 items to ~22 because the body
had them and the stamp did not. Two stale claims corrected on the way:
the slate said 43 packs, the doc says 39; there are **47**.

### Cut (SHIPPED · DOCUMENTED)
- the second status block *"design conversation, captured. Not requirements"* (30–33, 4) — history
- `# Part 3` → *"First chain to close: grain → flour → bread"* (158–160, 3) — code: `packages/content/trade-farming/…/triticum/aestivum.yaml`, `trade-milling/content/trade/milling/thing/{quern,grist-mill,flour-sack}.yaml`, `trade-baking/content/recipes/{dough,flatbread,lean-loaf}.yaml`
- `## ⚠⚠ The hard one: packs SEED, they do not OWN` (236–250, 15) — code: `PackLogic.venue-ownership.test.ts`; doc: `content-packs.md § The shipped packs` (*Packs seed, they do not own*), `§ The three-way reconcile`
- `# Part 4b — How a pack and a parcel actually wire together` (256–378, 123) — code: `PackLogic` `applyRequires` / `gateRequires` / `soldPredicateFor` (`skip-sold`), `ParcelRegistry.grant`, `AccessApi.canAtPath` (`access.md` l.211–228); doc: `content-packs.md § The requires phase` (the doc's own `CPS:308` citation points at this section), `access.md`, `parcel.md`, `chattel.md`. The judiciary example → Handoff
- `# Part 5 — Tests: the dependency direction is the design` (384–440, 57) — code: `lint:test-content` + `test-content-allowlist.txt`, `PackLogic/__tests__/pack-harness.ts` (synthetic fixture packs in a temp dir), per-pack `vitest.config.ts`; doc: `content-packs.md § Tests travel with the code`, `testing.md` l.337 (*"ugly on purpose"*)
- `# Part 7 — Ships clean` (497–541, 45) — code: `requires.groups`/`requires.title` + `ParcelApi.grant`; `e2e/playwright.platform.config.ts` (`SAXONBERG_PACKS=platform`); doc: `content-packs.md § The requires phase`, `§ Pack zero`. The 2026-08-04 inventory is history (`seeds/` gone)
- `# Part 8 — What the substrate still needs` (547–556, 10) — gaps 1 (`requiresPackInstaller`), 2 (derived `dependsOn`, topo sort), 4 (title arbiter + different-pack-stamp refusal), 5 (title claims), 7 (venue ownership) shipped; 3 and 6 are in `content-packs.md § Deferred`; 8 remains in Part 1
- `# Part 9` → the audit + `## ⭐⭐⭐ Structure vs. authority` (562–611, 50) — code: no `SeederManager` anywhere; `requires` phase; doc: `content-packs.md § The requires phase`, `§ History` (wave 3)
- `## One installer; the platform is pack zero` · `## The installer has to grow typed contributions` · `### The wiki shows the general rule` · `## Several of those collections are documents wearing a collection` · `### The index measurement` · `### kind-scoped indexes` (636–773 less the graduated § Storage vs. search, ~117) — code: `PackLogic` `KindStrategy`, `documentStrategy`, `DocumentKinds.ts` (`emote`/`recipe`/`name-bank`/`blueprint` as document kinds), `PersistenceManager`'s `{kind, data.<naturalKey>}` partial indexes, the `cas` policy; doc: `content-packs.md § The installer`, `§ Content-kind dispatch`, `§ DocumentKinds`, `§ The per-kind reconcile policy`
- `### Keeping the store general-purpose` → the two-tier + `requires:` paragraphs (777–791, 15) — doc: `content-packs.md § DocumentKinds` (*Editing it is a platform act*), `§ Deferred` (`requires.kinds:`). The *document search is coming* paragraph (793–797) KEPT
- `### ⭐⭐ RESOLVED — kill emote aliases` (799–833, 35) — code: `lib/social/Emote.ts` l.18 (*"Replaces the retired `aliases`"*), zero `aliases` keys under `expression/content/emotes/`; doc: `emotes.md` l.72–75 (`searchTerms` replaced `aliases`). The generalized rule → Handoff
- `### First, a correction: emotes are already the FALLBACK` · `### the namespace is not inherently flat` · `### How affordance collisions resolve TODAY` (843–887, 45) — doc: `emotes.md`, `command-routing.md § Affordance attribution — source, not category` (l.503), `§ There is ONE record of verb affordances`
- `## Migration order` (982–997, 16) — all four steps shipped; doc: `content-packs.md § History`
- `# Addendum 2026-08-20` intro (1032–1044, 13) — history
- `## A10.2` · `## A10.3` · `## A10.4` · `## A10.5` (1072–1140, 69) — code: `pack_installs` + `rows[recordKey]` baselines, `pack resolve --export`, the per-kind policy table, `BlueprintCatalogue.rebuild()` / `HelpCatalogue.rebuild()`, `src/schema/*.yaml` → generated `COLLECTION_POLICIES` / `RESET_DISPOSITIONS`; doc: `content-packs.md` (*The DB is a cache of the packs*), `§ The three-way reconcile`, `§ The per-kind reconcile policy`
- `## A10.9 — Reconcile ≠ go-live` (inside 1174–1215) — doc: `content-packs.md § Runtime` (*restart remains the universal go-live (A10.9)*)
- `## A10.11 — Decisions in git, the ledger in Mongo` + `## Effect on the standing lists` (1254–1289, 36) — code: `PackLogic` discovery from the deployment manifest; doc: `content-packs.md § Discovery`, `§ The install record`
- `# Addendum 2026-08-20 (2)` intro + `## A11.1`–`## A11.4` (1295–1393, 99) — code: `AppBootstrap` has zero `*Api.boot()` calls; `mud/bootstrap.ts` gone; `boot[]` per manifest; doc: `content-packs.md § The boot union`, `§ History` (wave 3), `persistence.md § Collections`
- `## A11.5` → the bucket table + *the closed kind vocabulary IS the allowlist* (1397–1412, 16) + the end-state paragraph (1427–1430, 4) — doc: `content-packs.md § Content-kind dispatch`, `§ DocumentKinds`, `§ Boot`. The *abstractions that survive* list KEPT (see Uncertain)
- `## A11.6` · `## A11.7` · `## Effect on the standing lists` (1432–1501, 70) — code: the `subject` kind, `onVanish: 'archive'`; doc: `content-packs.md § Content-kind dispatch` (*Subjects*), `§ The per-kind reconcile policy` (vanish policies)
- `# Addendum 2026-08-21 (3)` intro para 1 (1507–1512, 6) + `## A12.1` · `## A12.2` (1523–1662, 140) — code: `packages/content/{trade-smithing,trade-cooking,hearthworks}` (hearthworks has no `src/`), `eternal-university/src/duncan-hall/**`, `PackLogic.brainsNamedBy` (requires-kernel over `behaviors[].brain`); doc: `content-packs.md § The shipped packs`, `§ History`
- `## A13.4` · `## A13.5` · `## A13.6` (1767–1805, 39) — code: `Archetype.materialize()`, `trade-hospitality`'s `menu.test.ts`; doc: `content-packs.md § Content-kind dispatch` (the archetype row)
- `# Addendum 2026-08-21 (5) — the archetype, settled` (1811–1893, 83) — code: `lib/archetype/Archetype.ts`, `platform/idea/ArchetypeCatalogue.ts`, `archetype` in `DocumentKinds`, no `ArchetypeApi`; doc: same row
- `# Addendum 2026-08-21 (6) — the /trade/ root` (1899–1938, 40) — code: 20 `trade-*` packs at `/trade/<industry>`; doc: `content-packs.md § The requires phase`, `§ History` (*The path pattern*), CLAUDE.md § The five namespace axes. The layout sketch (`obj/`, `command/`) is superseded by `<root>/<branch>/` + `idea/cmd/`
- `# Addendum 2026-08-21 (7) — the world is lazy` (1944–1991, 48) — code: `Exit.resolveDestination`, `EmploymentLogic.operatorOf`; doc: `employment.md` l.279–285 (*derived lazy standup*), `content-packs.md § The boot union`, `§ Deferred` (hearthworks' inbound exit). *An unvisited venue mints nothing* → Handoff
- `## A16.1` · `## A16.2` · `## A16.3` (1997–2058, 62) — code: one file per recipe under `content/recipes/`, the hearthworks three; doc: `content-packs.md § History` (waves 4a/4b), `§ The shipped packs` (*the generic drain rule*)
- `# Addendum 2026-08-21 (9) — the install record's shape` (2102–2188, 87) — code: `PackInstallRecord` in `mud/api/pack.ts`, `PackController` (`--dry-run`, `status`, `diff`, `resolve`, `pin`); doc: `content-packs.md § The install record`, `§ The flat-key uniqueness check`, `§ Runtime`
- `# Addendum 2026-08-21 (10) — the export census` (2194–2258, 65) — code: `command-view` in `DocumentKinds`, `CommandLogic.servedFromStore`; doc: `content-packs.md § Content-kind dispatch` (*Command views*)
- `# Addendum 2026-08-21 (11) — magic is a tag` (2264–2303, 40) — code: `packages/content/{arcana,arcane-library}`; doc: `content-packs.md § The capability rung` (*Two rules the rung applies to magic*)
- `# Addendum (12) — media` → the *REQUIREMENTS-COMPLETE* paragraph (2345–2350, 6) — history
- `# Addendum 2026-08-21 (14) — the subject file` (2393–2430, 38) — code: the subject strategy (`audience` resolved by name at the pre-write gate); doc: `content-packs.md § Content-kind dispatch` (*Subjects*)
- `# Addendum 2026-08-21 (15) — eagerness` (2436–2482, 47) — code: `BOOT_ROLES` in `PackLogic`, `PackApi.bootManifest()`; doc: `content-packs.md § The boot union`
- `# Addendum 2026-08-21 (16) — the pack fence, and staffing` (2488–2547, 60) — code: the NPC-only membership fence in `gateRequires`, `PackApi.staff`, `DiagnosticLogic.packRecipients`; doc: `content-packs.md § The requires phase`, `§ Staffing and routing`, `§ Who may run it`
- `# Addendum 2026-08-21 (17) — the two renames` (2553–2583, 31) — doc: `content-packs.md § History` (wave 0, wave 4a)
- `# Addendum 2026-08-21 (18) — archetypes: the code bill` (2589–2628 less the graduated paragraph, ~34) — code: `Archetype.describe()`/`materialize()`, no predicates; the deposit fork resolved by `mining.md` (the seeded Deposit field)
- `# Addendum 2026-08-21 (19) — the mining drill` (2634–2675 + 2683–2685, 45) — code: `packages/content/trade-mining` (+ `archetypes/mining.yaml`), `trade-cooking/…/material/salt.yaml`; doc: `mining.md`. The eternal-steel paragraph KEPT (Uncertain)
- `## A26.2 — The hospitality trade cut` (inside 2691–2738) — code: `packages/content/trade-hospitality`; doc: `content-packs.md § The shipped packs`
- `# Addendum 2026-08-24 (23) — the graduation audits` (2866–2922, 57) — code: `platform/thing/{CraftVessel,GradedReceptacle,NeonSign,CocktailShaker,TipJar,Menu}.ts`, `lib/employment/Offstage.ts`, `lib/time/MechanicalMovement.ts`, `eternal-university/src/duncan-hall/idea/DormThemes.ts` (`SingletonMixin(Idea)`); doc: `content-packs.md § History` (wave 4b), `§ How a pack EXPOSES something`, `§ Deferred` (the authorable-composition bridge)
- `# Addendum 2026-08-25 (24) — the wave ordering` (2928–2979, 52) — history; doc: `content-packs.md § History`
- `# Addendum 2026-08-25 (25) — offices are heads; committees are hands` (2985–3017, 33) — code: `{ kind: 'office' }` group owner (`grouping.md` l.273–291, *slate A25*), `requiresPackInstaller` (title over `/compact/executive`); doc: `content-packs.md § Who may run it`, `governance.md` l.34–38. The doctrine sentence → Handoff
- `## A32.2 — The three test rings` (3048–3072, 25) — code: per-pack `vitest.config.ts`, `test:near`; doc: `testing.md` l.127–145 (`packages/content/` excluded from the source check), `content-packs.md § Tests travel with the code`
- `# Addendum 2026-08-25 (27) — capability packs` (3078–3148, 71) — code: `ModuleApi.registerPackSource`, `StuffApi.resolveClassFile`, `codeVersions` on the record, `dependsOn` from `package.json`; doc: `content-packs.md § The capability rung`, `§ Deferred` (third-party trust)
- `# ⛔ The pack exposure gap` → the symptoms + axes (3154–3198, 45), `## RESOLVED` → the decision, evidence and work (3202–3237, 36), `### ✅ BUILT` (3266–3323, 58) — code: `MixinApi.isDeclaredMixin`, `static _mixinRefusal`, `lint:mixin-names` (in the roster), `AnyMixinName`; doc: `content-packs.md § How a pack EXPOSES something`. `### ⚠ Why NOT path-addressed mixins` KEPT because that doc section points at it

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `## ⭐⭐ And "ambient life" is not a category` (101–111, 11; cut with the rest of Part 2, 80–111) — code: `trade-farming/src/behavior/farms.ts`, `trade-tailoring`'s `tailors` brain, `distribution`'s Tam Ferrier — every trade ships its outfit → inserted at `content-packs.md § The shipped packs` after *Packs seed, they do not own* (11 lines: *A trade pack ships its own people*)
- `## ⭐⭐ Storage vs. search — the false dichotomy` (743–763, 21) — code: `SoulCatalogue`, `RecipeCatalogue`, `BlueprintCatalogue`, `ArchetypeCatalogue` over one `documents` collection → inserted at `content-packs.md § DocumentKinds` after the vocabulary paragraph (9 lines)
- `## A10.10` → the companion-app argument (1219–1231, 13) — code: `PackController` in-world, `requiresPackInstaller`; `cms.md` has no pack panel → inserted at `content-packs.md § Runtime — the pack verb` before *This is the iteration loop* (10 lines). The staged-install shape (1232–1252) KEPT
- `# Addendum (18)` → *The YAML author's verb is CLONE-AND-COMPOSE* + the acceptance test (2615–2624) — code: hearthworks (a data pack whose rows `props:`-reference trade rows), `hearts-delight`, `rejection` (venues with no `src/`) → inserted at `content-packs.md § The capability rung` after the common-pack-ancestor paragraph (10 lines)
- `## A26.1 — The platform/content razor` (2693–2713, 21) — code: `platform/content/settings/core.yaml` (*`defaultStartLocation` is NOT here*), `saxonberg-lounge/content/settings/lounge.yaml`, `/platform/location/void` → inserted at `content-packs.md § Pack zero` (10 lines)
- `## A27.1` (the doctrine) + `## A27.2 — The Compact is PLATFORM` (2746–2791, 46) — code: `platform/content/platform/idea/Condition/**`, `species-and-names` (body plans), `platform/content/compact/`, the five `corpo-*` packs → inserted at `content-packs.md § Pack zero` after the razor (11 lines)

### Superseded — cut
- `## ⭐ The test that decides every packaging question` + `## The vocabulary this settles` (80–99) — by A13 (industry ≠ venue), itself shipped as `trade-*` + venue packs. Note left under `# Part 2`
- `# Part 3` → the sinks table + demand-first framing (117–144, 28) — by the shipped roster: every ❌ in the *industry attached* column except repair and sanitation now has a trade (`trade-cooking`/`trade-baking`, `trade-fuel`/`trade-textiles`, `trade-medicine`, `trade-haulage`); the demand test is `vocations.md`
- `## The tension dissolves` · `## Crowd vs. cast` · `## Every trade pack ships a SHOWROOM` (166–222, 57) — the tension shipped as documented (`content-packs.md § The requires phase`); crowd vs cast → `identity.md` (Cast/Extra) and Handoff; the showroom shipped in a different shape — a trade's working floor ships INSIDE the trade pack (trade-distilling's still-house, trade-textiles' Wharfside mill), not as the A13.4 sibling venue pack
- `### Packs declare their verbs — to REPORT, not to prevent` (954–962, 9) — by the code: `lint:verb-collisions` (`scripts/check-verb-collisions.ts`) REFUSES two views claiming one verb, after the shipped `watch` collision shadowed silently
- `## A10.8 — Ops is an OFFICE` (1174–1191) — by A31 and then wave 3: `pack` is gated on title over `/compact/executive` (`content-packs.md § Who may run it`); the review-tier check remains open in Part 1
- `# Addendum (4) — industry ≠ venue` intro + `## A13.1` + `## A13.2` (1708–1744, 37) — shipped as designed (the `/trade/<industry>` packs, venue packs under `/world/`), except position DEFINITIONS as a document kind, which A19 still holds
- `## A16.4` → the energy table + the *why it matters* paragraph (2062–2076, 2086–2096) — by `packages/content/trade-fuel` (the charcoal clamp, `char`, the `colliery` Discipline) — shipped without the contract forms, whose paragraph is KEPT

### Kept (UNBUILT)
- `# Part 1 — A pack is a unit of REVIEW` — `MANIFEST_KEYS` is `id version description root requires boot maintainers`; no `tier`, no detector
- `## The completeness rule that falls out` (Part 3) — no producer-without-consumer check in `PackLogic`; overlaps `venue-and-supply-slate § 3` (`lint:supply`)
- `## Reconcile, don't copy` (Part 4) — scale variants / parameters: `PackInstallRecord.parameters` is written `{}`; no schema
- `# Part 6 — The roster` (all three lists) — see Uncertain for the stale ✅ marks
- `## Requirements, and a checklist that DERIVES` (Part 9) — `requires.policy` is not a key (`readRequires`: groups/title only); `pack provision` shipped as the read-side twin
- `### Keeping the store general-purpose` → the *document search is coming* paragraph
- `## The verb namespace` → the user quote, `### So what is missing`, `### the override is a filter`, `### The rule that makes collisions non-fatal`, `### The disambiguation syntax`, `### The addition, concretely` — no selector parse position; `Left` names it
- `# Open questions` (1–9) — spine; see Uncertain
- `## A10.1 — The repo split is LAST` · `## A10.6 — Parameterization IS the venue` · `## A10.7 — The installer is a procedure` · `## A10.10` → the staged shape
- `## A11.5` → *The abstractions that survive* list
- `# Addendum (3)` → the tier-3 gaps paragraph (the overlay kind, scheduled uninstall) + `## A12.3 — The requirements shopping list`
- `## A13.3 — The materials faultline`
- `## A16.4` → the contract-forms paragraph — no `contract-form` in `DocumentKinds`, nothing under `forms/` in any pack
- `# Addendum (12) — media` — no media kind in `PackLogic`; `content-packs.md § Deferred` names it
- `# Addendum (13) — position defs` — no `position` document kind; no `positions/` dir in any pack; wages still live on the venue Business rows
- `# Addendum (19)` → the eternal-steel paragraph
- `# Addendum (22) — access across the three trees` (all of A28)
- `## A32.1 — The hot pack (dev loop)` — no pack watcher (`dev-preflight.mjs` and `tsx watch` only)
- `### ⚠ Why NOT path-addressed mixins — the option held in reserve`

### Uncertain — kept
- `# Part 6 — The roster` — its ✅ marks are stale: baking, brewing, fuel & firewood, clothing & tailoring, medicine, ranching, mining, forestry, water (as `/system/water`), milling, smithing, textiles, haulage, hospitality, retail, banking all ship (47 packs); butchery has cooking's `butcher` verb but no trade. Kept verbatim because the roster IS the `Left`; the new `Left` lists only the trades with no pack
- `# Open questions` — 1 closed (A13.6: industry = pack, venue = pack), 2 closed (A10.6, but parameters unbuilt), 3 closed and shipped (three-way), 4 answered (`seeds/obj` split into `generic-objects` + the trades), 6 answered (synthetic fixtures in `pack-harness.ts`, not a real pack), 7 answered (the allowlist), 8 answered (allowlist, CI-gating), 9 answered (smithing + cooking). Only 5 (tier self-declared vs derived) is live. Kept because open questions are spine
- `## A10.7` — bullet 1 (the derived checklist) and 3 (install never blocks) shipped; bullet 2 (prompting for parameters via `PromptApi`) unbuilt. Kept whole
- `## A10.10` → the staged shape — `status: 'staged'` is *reserved (unwritten this cycle)* in `pack.ts`, and `content-packs.md § Runtime` says *staging is a non-goal*; the doc's § Deferred lists the `staged` status anyway. Kept as the design of a deferred thing; requirements should decide whether the non-goal stands
- `## A11.5` → *The abstractions that survive* — #1 shipped; #2 (a lifecycle sequencer for the `*Api.boot()`s) is superseded by their retirement (zero `Api.boot()` calls in `AppBootstrap`; catalogues self-warm); #3 partially (`BlueprintCatalogue.rebuild`, `HelpCatalogue.rebuild`; no *forced variant and a name* for the other warms). Kept as one paragraph
- `## A12.3 — The requirements shopping list` — items 1, 2, 4, 5, 7, 8, 10, 11 shipped; 3 (cross-pack reference validation — `content-packs.md § Deferred`: *`dependsOn` on an unknown id is ignored today, deliberately*; `newbie-wilds/…/crossroads.yaml` names `/world/eternal` with no dependency line), 6 (tier detectors), 9 (the cross-pack exits rule stated nowhere — `boundary.md` has no such rule), 12 (parameters · overlay kind · scheduled uninstall) open
- `## A13.3 — The materials faultline` — the *mechanically checkable* misfiled-material test: no script in `packages/server/scripts/` mentions it; kept as an unbuilt lint idea
- `### The addition, concretely` → *a `Note` naming which affordance resolved — always* — `command-routing.md § Affordance attribution` says `CommandContext.commandSource` carries the resolved source in frame metadata; whether anything renders it to the player is unverified
- `# Addendum (19)` → eternal steel — named only in slates + `story-bible.md`; not in `mining.md` or `magic-items.md`. Still unhomed
- `# Addendum (22)` — A28.1 bullet 1 (one trie) shipped; `TreeAction` carries `write-source` (`access.md` l.217) but `mud/api/source-tree.ts` has no `canAtPath` / `write-source` consult; no `.policy` narrowing document exists (the `.policy` hits in `PackLogic` are `strategy.policy`); the commerce asymmetry is stated nowhere. `branch-policy-slate.md` (tails) owns the narrowing-policy half — overlap for the cluster pass
- Overlaps for the cluster pass: A10.1 repo split, A20 media, A19 position defs, A16.4 contract forms ↔ `content-pack-units.md`'s `Left`; Part 3's completeness rule ↔ `venue-and-supply-slate § 3`; the cross-pack exits rule ↔ `pack-seams-slate.md`

### Handoff (belongs in a doc outside my list)
- → `parcel.md` (beside `ownerOf` / the longest-prefix walk), verbatim from the cut Part 4b:

  > `ownerOf('/world/terminus/law/ordinance-3')` walks the coverage trie,
  > finds `/world/terminus` by longest prefix, and returns the locality's
  > committee. **Nobody declared "law belongs to the locality."** It falls
  > out of there being no carve-out beneath it.
  >
  > Which makes the constitutional move a *parcel operation*:
  >
  > > ⭐⭐⭐ **An independent judiciary is `subdivide /world/terminus/law` +
  > > `transfer` to the court.** The arrangement is not modelled, declared or
  > > special-cased — it is two calls that already exist, and every downstream
  > > gate follows automatically because they all read the same trie.
  >
  > That is the federalism-is-the-longest-prefix-walk finding
  > ([balance-slate](./balance-slate.md)) doing real work.

- → `employment.md` (§ *Fixture-keyed attribution + derived lazy standup*), verbatim from the cut A15.2:

  > - ⭐ **An unvisited venue mints nothing** — wage settlement only runs
  >   for stood-up businesses, so ghost venues cause no wage inflation.
  >   Lazy standup is economically load-bearing, not just a perf nicety
  >   (and it is residency's symmetric partner: fault in on demand, evict
  >   the cold tail).

- → `governance.md` (beside *whether a constitutional document points at the position*, l.34), verbatim from the cut A31:

  > > ⭐⭐⭐ **Law points at OFFICES → offices own COMMITTEES → committees
  > > hold permissions → members are appointed by whoever holds the owning
  > > seat.**
  >
  > - **Offices are heads** — one accountable holder the law can name,
  >   founder-default (governance.md). **Committees are hands** — managed
  >   groups doing work, holding operational permissions. The law never
  >   points at a committee; permissions never accumulate on an office (a
  >   permission-holding office is a bottleneck AND a prize).
  > - ⭐⭐ **The bridge: a managed group's owner can be an OFFICE**,
  >   resolved through `holdsOffice` on read (absence = founder default) —
  >   never a stamped player id, never `isFounder`. Seat changes hands ⇒
  >   every committee follows, no re-parenting.

- → `command-spec.md` (the verb-namespace guidance), verbatim from the cut § *The rule this generalizes to*:

  > > **A word occupies the global verb namespace only if it is the PRIMARY
  > > NAME OF A DISTINCT ACT.** Synonyms belong to the catalogue;
  > > preferences belong to per-character aliases.

- → `identity.md` (§ the `Cast`/`Extra` rungs), verbatim from the cut § *Crowd vs. cast*:

  > > **The trade ships the CROWD. The locality carves the CAST.**
  >
  > The trade supplies a generic occupant who bakes, keeps hours and behaves
  > like a baker. A locality may **promote** that to Marchetti — named, with
  > dialogue, history, a grudge. Consistent with *NPCs are expensive carves,
  > just-in-time* and *derive the crowd / simulate the cast*; nothing new is
  > invented.

### Status block
- Left: *the unbuilt trades (butchery · milling · forestry · fishing · medicine · sanitation · funerary · repair · papermaking · insurance) · localities-as-compositions · the scoped-verb selector syntax · the npm repo split (A10.1)* → *the unbuilt trades of the Part 6 roster (butchery · fishing · foraging · quarrying · carpentry · tanning · pottery & glass · chemistry/pharma · papermaking & printing · masonry · repair · sanitation · funerary · education · advocacy · journalism · security · cleaning & laundry · pest control · insurance · real estate · performance) · the review-tier claim + its detectors (Part 1) · the producer-without-consumer completeness check (Part 3) · scale variants / install parameters + the provisioning prompt (Part 4, A10.6, A10.7) · `requires.policy` (Part 9) · document search (Part 9) · the verb-scope announcement + the scoped-verb selector syntax (Part 9) · localities-as-compositions (Part 6) · the npm repo split (A10.1) · staged installs (A10.10) · the media kind (A20) · position defs + the proto-industry adoption lifecycle (A19) · contract forms (A16.4) · cross-pack reference validation, the cross-pack exits rule, the overlay kind + scheduled uninstall (A12.3) · tree-qualified narrowing policies, the source-write consult + git hooks (A28) · the pack watcher (A32.1) · eternal steel's home (A25) · path-addressed mixins, held in reserve* (milling, forestry and medicine left the list — `trade-milling`, `trade-forestry`, `trade-medicine` ship)
- Size: a build → a build
- The block's first line: *43 shipped packs* → *47 shipped packs*

---

## docs/slates/builds/venue-and-supply-slate.md — 552 → 463 · Status PARTIAL → PARTIAL

Two weeks old and mostly live, but three of its *this ships* sections are
now carried by subsystem docs, and two of its premises have moved under
it since 2026-09-03: the archetype `needs` vocabulary is **eleven keys**
(`Archetype.ts` `NEED_KEYS`: the closed six + `rest` · `presence` ·
`lightLux` · `cultivation` · `vesselKind`), so *no word for ground or sun*
is no longer true; and `trade-ranching` shipped (the farmstead build), so
*ranching ships first* happened.

### Cut (SHIPPED · DOCUMENTED)
- the stale status line *"direction decided, nothing built"* (18–19, 2) — history
- `### The archetype substrate ships` → paragraph 1 (159–165, 7) — code: `lib/archetype/Archetype.ts`, 15 archetype rows across `generic-objects`, `trade-{brewing,distilling,farming,haulage,hospitality,mining,ranching,winemaking}`, `transport`; doc: `content-packs.md § Content-kind dispatch` (the archetype row). The *closed six* paragraph KEPT (Uncertain)
- `## 6. The going-concern model — and the loop already runs` (276–301, 26) — code: `actor.buysFor()`, `wallet use house`, the `restocks` brain; doc: `employment.md` l.421–425 (`buysFor`, `purchases`), `behavior.md` l.418–420 (`restocks`, `consigns`), `banking.md` l.341 (`wallet use house`). The *Correction for the record* paragraph was history
- `## 6b. One PlatBook, four land uses` (307–340, 34) — doc: `settlement-model.md § 6. One PlatBook, four land uses` (the slate's own *Full model* pointer; the text is there verbatim)
- `## 6c` → the intro paragraph (344–347, 4) + the closing *warehouseman is a vocation with a duty* paragraph (368–370, 3) — code: `warehouse-receipt` in `DocumentKinds` (`onVanish: keep`); doc: `logistics.md § The warehouse receipt` (*a RECORD, and there is deliberately no object*; *what ships is the receipt and the duty*). The three-jobs list + blockquote KEPT (job 3, collateral, is unbuilt — no `collateral` in `logistics.md`, `banking.md` or `contract.md`)
- `## 10. Grounding (verified 2026-09-03, at 4e25aeb93)` (514–533, 20) — history; four bullets false today (34 packs → 47; `needs` closed six → eleven; barley/flax missing → `trade-farming/…/hordeum/vulgare.yaml`, `linum/usitatissimum.yaml` ship; `office` only in tests → 18 `kind: office` rows in 8 packs)

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none

### Superseded — cut
- none (see Uncertain for the sections that are contradicted but kept)

### Kept (UNBUILT)
- `## 1. The sellable-venue contract` + `### The four parts` + `### The uniformity sweep` — the sweep is PARTIAL: `kind: office` ×18 (executive, three corpos, `tailor-shop`, `brewing-outfit`, `vintner-outfit`, `dyehouse`, `pantry-outfit`, `campus-farm/farm-unit`) beside `kind: entity` ×16 and `committee` ×15; no price / no `appraisal` consumer
- `## 2. Bespoke vs archetype` + `### Which the basic/support split sorts for you` — of the five support archetypes only `depot` ships (`trade-haulage/content/archetypes/depot.yaml`); no general store / public house / lodging / smithy archetype
- `### The archetype substrate ships` → the *closed six* paragraph (see Uncertain)
- `## 3. Coverage is a LINT, not a list` + `### Holes visible by inspection` — no `lint:supply` in the roster (46 gates); no `yields` in `Archetype.ts` or any archetype row
- `## 4. The universal ladder` · `## 5. Farm archetypes — six shapes` (`farm.yaml` and `byre.yaml` ship; no orchard / vineyard / market-garden / coppice archetype) · `## 6c` → the three jobs · `## 7. Scaling discipline` + `### Corpos` · `## 8. Ranching ships first` (all four subsections) · `## 9. Decisions` · `## 11. Open questions`

### Uncertain — kept
- `### The archetype substrate ships` → *"But `needs` is a closed six … no word for ground, water, or sun"* — contradicted by `Archetype.ts`: `cultivation: bed | field` (read through `ParcelApi.cultivationScaleAt`) is the word for ground, `lightLux` for sun, and `bulkSource: water` was always the word for water. Kept verbatim because V6's `yields` half is still open; requirements should restate V6 as *`yields` only*
- `### Holes visible by inspection already` — the table is half stale: barley (`hordeum vulgare`) and flax (`linum usitatissimum`) ship in `trade-farming`; `malt` is still produced by no recipe (three `mash` recipes consume it; `distribution` ships the sack as the *honestly-labelled imported-input faucet*); apricot/plum still absent (`prunus/avium.yaml` only)
- `## 8. Ranching ships first` → the decision + the nitrogen paragraphs — `trade-ranching` ships (livestock, ox, byre, `HerdRegistry`, the `return` verb) but I found no manure row anywhere in `packages/content` (only `compost`), so whether the nitrogen faucet actually closed is unverified; `soil.md` l.88 names manure as the inflow. The valley design (rings, the co-op, the fence, the range) is unbuilt content — `hearts-delight` ships a bench field and no grazing
- `## 6c` → job 3 (a receipt as collateral) — the receipt is a record with no `withdraw` and no lender; `logistics.md` names `withdraw <receipt>` as *the missing seam*. Overlaps `freight-slate.md` and `policing-slate.md` for the cluster pass
- `## 9. Decisions` V9 and V11 describe things that have since shipped; kept because the decisions list is spine

### Handoff
- none

### Status block
- Left: *V6 — `needs` past the closed six (ground/water/sun) and producer `yields` · V5 `lint:supply` · V4 the five support archetypes · V2 the uniform `kind: office` sweep · what a business is worth* → *V6 producer `yields` (the `needs` vocabulary now admits `cultivation` and `lightLux`) · V5 `lint:supply` · V4 the five support archetypes (only the depot ships) · V2 the uniform `kind: office` sweep (16 `entity` rows remain) · what a business is worth (`appraisal` has nothing to appraise) · the six farm shapes as archetypes (`farm` and `byre` ship) · the universal ladder · the warehouse receipt as collateral · the valley's hills + the range*
- Size: a build → a build

---

## docs/slates/tails/pack-seams-slate.md — 189 → 171 · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- `## The directional rule` body (23–34, 12) — code: `PackLogic` derives `dependsOn` from `package.json`; `gateRequires` coverage (*a path must lie under a claim of the pack or a host*); doc: `content-packs.md § The manifest`, `§ The requires phase` (the gate, item 4). Heading + note left. ⚠ The sentence *a pack may reference template paths only in packs it depends on* is NOT enforced — cross-pack reference validation is deferred (`§ Deferred`), and `newbie-wilds/…/crossroads.yaml` names `/world/eternal` with no dependency line
- `## Add-only — annexes never modify host content` (131–135, 5) — code: *a file at a key with a row this pack did not stamp fails the pack at `reconcile`*; doc: `content-packs.md § The three-way reconcile`. Dropped from `Left` (it was listed as *add-only enforcement*)

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none

### Superseded — cut
- `## The shipping tiers (decided at capture)` (147–151, 5) — by the shipped roster: `terminus`, `eternal-university` and `saxonberg-lounge` are all packs; the lounge's *required-with-default* slot shipped as the `defaultStartLocation` setting the lounge pack contributes over pack zero's `void` shell (`content-packs.md § Pack zero`); a platform-level City of Saxonberg is `saxonberg-city-slate`'s. Heading + note left

### Kept (UNBUILT)
- `## Sockets — the host's named attachment points` — `MANIFEST_KEYS` has no `fills`; no socket declaration anywhere
- `## The two socket policies` — the table (see Uncertain for the lounge row)
- `## The provides/needs vocabulary` — no `provides`/`needs` manifest keys
- `## Reconcile symmetry` — uninstall is deferred (`content-packs.md § Deferred`)
- `## The worked example — Terminus ⊂ hosts ⊃ EU` · `## Open questions`

### Uncertain — kept
- `## The two socket policies` → the *required-with-default* row — the Lounge case shipped in a different shape (a merge-missing setting, not a kernel slot with `LoungeMixin` as its type check); kept because the policy pair is the socket design's, which is unbuilt
- `## The worked example` — `eternal-university` `dependsOn` `platform, residence` only, and `terminus` does not depend on it either; the inter-locality exits ship host-side today (`newbie-wilds` names `/world/eternal`), which is the *opposite* of the directional rule. Kept verbatim; requirements must reconcile the shipped packs with the rule before building sockets
- Open question 3 (Dave's Bar's tier) is answered by content: the bar is in `saxonberg-lounge`; kept because open questions are spine

### Handoff
- none

### Status block
- Left: *named boundary sockets + graft points · the `fills:` manifest key · one-filler-per-socket refusal at reconcile · the provides/needs capability vocabulary · add-only enforcement* → *named boundary sockets + graft points (`fills:`, one filler per socket, socket paths as API) · the provides/needs capability vocabulary + per-capability cardinality · reconcile symmetry on uninstall (closed states revert) · the worked Terminus ⊃ EU seam*
- Size: a wave → a wave

---

## docs/slates/tails/content-pack-units.md — 158 → 115 · Status PARTIAL → PARTIAL

A status index by design. The three Part A tables are mixed (most rows ✅
now) and are kept whole under the paragraph rule; the per-pack table, the
strategy interface and the wave ordering are history or documented.

### Cut (SHIPPED · DOCUMENTED)
- `# Part B — Per-pack table of contents` (79–104, 26) — every pack listed shipped or was killed as recorded (`conditions-and-afflictions` → `platform/idea/Condition/**`; `body-plans` → `species-and-names`; `compact` → the platform pack; the rest are directories under `packages/content/`); doc: `content-packs.md § The shipped packs`. Heading + note left
- `# Part C — The strategy interface` (119–132, 14) — code: `KindStrategy<F>` in `PackLogic` (target, record key, db-key query, rendered row, hash preimage, go-live, `flatKeyOf`), `computeKindPlan` / `applyKindPlan`; doc: `content-packs.md § The installer` (which cites *the content-pack-units Part C interface* — the doc's sentence now stands on its own). Heading + note left
- `# The wave ordering (A30)` (138–144, 7) — history; doc: `content-packs.md § History`. Heading + note left

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none

### Superseded — cut
- none

### Kept (UNBUILT)
- `# Part A` → all three tables (mixed; see Uncertain)
- `# Access across the trees (A28)` — a summary of the big slate's A28, which is kept there; two slates, one open thing
- `# The drilling agenda` — items 5 (kind declaration mechanics) and 6 (the media receipt format) are open

### Uncertain — kept
- `## Data units` — ✅ today: template (three-way, the fault-in trio, `restoreFromTemplate`), material, document, script (`msh`), recipe, emote, name-bank, descriptor-bank, blueprint, command-view, archetype, subject, wiki page, settings. Still open: contract form, position def, media asset. ⚠ `DocumentKinds` has since grown kinds this table never imagined — `release`, `water-right`, `herd`, `bill-of-lading`, `warehouse-receipt`, `rate-card` — all `onVanish: keep` record kinds. Kept whole; the 🔨 marks are stale
- `## Non-Mongo units` — all four ✅ (quantity, the boot manifest, TS modules at the capability rung, verb views as `command-view`)
- `## Structure & authority units` — group ✅, title ✅, staffing ✅ (the fence + the prompt), manifest ✅ (`version` inert, no tier); still open: `requires.office`, `requires.kinds:`, the tier claim
- `# The drilling agenda` — 1 (subject file), 3 (boot manifest), 4 (provision — demoted), 7 (the packs) are done
- Overlaps for the cluster pass: media, position defs, contract forms, the repo split, `requires.kinds` ↔ `content-packs-slate.md`; A28 ↔ `content-packs-slate.md` § A28 + `branch-policy-slate.md`

### Handoff
- none

### Status block
- Left: *the media-asset unit (byte sync + receipt pairing) · the position-def unit (A19) · the contract-form unit · `requires.kinds:` · `requires.office` · manifest version + `dependsOn` validation · runtime install/uninstall + marketplace · the repo split* → *the media-asset unit (byte sync + receipt pairing) · the position-def unit (A19) · the contract-form unit · `requires.kinds:` · `requires.office` · the manifest tier claim + its check · manifest version + `dependsOn` validation · runtime install/uninstall + marketplace · the repo split*
- Size: a wave → a wave

---

## Notes for the coordinator

1. **`content-packs.md`'s own header is stale** and I did not touch it (no
   existing sentence edited): it says *Nineteen packs ship today* and the
   roster table says *thirty-nine*; there are 47 (`ls packages/content/*/pack.yaml`).
   The doc's `§ Deferred` also still lists things that shipped (`eternal`
   homed, the `archetype` kind, `hearthworks`… inbound exit is still open).
   A doc-side pass is owed; it is not this ledger's.
2. **`packages/content/trade-hearth-cooking/`** is a leftover directory
   with only `node_modules` — no `pack.yaml`. Not a pack; safe to delete.
3. The doc's `§ How a pack EXPOSES something` pointer to the slate's
   `§ RESOLVED` still resolves: I kept the `### ⚠ Why NOT path-addressed
   mixins` subsection under that heading for exactly that reason.
