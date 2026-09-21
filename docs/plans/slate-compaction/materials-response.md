# Slate-compaction ledger — batch key: materials-response

## docs/slates/tails/materials-response-slate.md — 524 → 212 lines · Status PARTIAL → PARTIAL

Verified against code: `packages/server/src/mud/lib/material/{Channel,Construction,Constructed,Durable}.ts`,
`packages/server/src/mud/lib/combat/WeaponProfile.ts`, `platform/idea/api/{MaterialLogic,CraftingLogic}.ts`,
`platform/idea/cmd/crafting/{RepairController,SalvageController}.ts`, `platform/thing/Scrap.ts`,
content rows under `packages/content/generic-objects/content/stuff/thing/armor/*.yaml` (no
Recipe-authored `constructionForm`, confirming it's still authored data, not a craft output),
and a negative check: `crush` appears only as an explicitly-rejected `Channel` value in
`Channel.test.ts` (`for (const bad of ['thermal', 'crush', ...])`), confirming the channel does
not exist. Cross-checked docs: `materials-response.md`, `combat.md` (Weapon playstyle §, Deferred
§, Poise §), `crafting.md` (§ The lifecycle: two wear axes, repair, broken, salvage), `encumbrance.md`
(no armor↔poise link found).

### Cut (SHIPPED · DOCUMENTED)
- Old narrative `> **Status: design-phase, deferred-rpg.**` block (13 lines) — its content
  (motivation, "chainmail and plate are the same steel", channels-not-nouns framing) is
  graduated near-verbatim into `materials-response.md`'s opening two paragraphs.
- `## Principle` (19 lines) — code: `lib/material/{Channel,Material,Construction}.ts`; doc:
  `materials-response.md § The three axes` (the curve/shape/height framing, lines 22-26).
- `## Legibility & authoring (the balance surface)` (37 lines) — code:
  `AnalyzeResponseController`, `Construction.doesNothing`, `scripts/check-does-nothing.ts`; doc:
  `materials-response.md § The legibility surface (mandatory — Settled 11)`.
- `## The three axes` incl. all three `###` subsections (38 lines) — code:
  `lib/material/Channel.ts`, `Material.ts` (hardness/toughness), `Construction.ts`; doc:
  `materials-response.md § The three axes`.
- `## The response function: one model, two v1 consumers` (26 lines) — code:
  `MaterialApi.attenuate`/`resolveTrauma` in `platform/idea/api/MaterialLogic.ts`; doc:
  `materials-response.md § The response function (the Api home)` — the doc explicitly states the
  taxonomy grid is "transcribed verbatim from the slate."
- `## Armor (the origin consumer)` — 3 of 4 bullets (intro + Coverage + Layered + Gaps, 23 lines)
  — code: `ConstructedMixin`, `ConditionApi.inflict`'s `resolveCoveringStack`, `LAYER_DEPTH`; doc:
  `materials-response.md § Armor mitigation — emergent, layered, outside-in`. "Aim the gap" (the
  called-shot gambit) verified in `combat.md` lines 402, 913.
- `## Weapons — the symmetric dual ✅ SHIPPED` incl. all three `###` subsections (93 lines) — the
  slate's own heading already claimed shipped; code: `lib/combat/WeaponProfile.ts`; doc:
  `combat.md § Weapon playstyle & the hand-slot economy` (MR !140) — reach classes, handedness,
  balance, guard, gambits, archetypes-via-content, shield-as-wielded-armor-construction all
  confirmed present there in detail exceeding the slate's own account.
- `## Lifecycle` — intro + 3 of 4 bullets (wear-from-use, maintenance/repair, break→scrap→reforge,
  19 lines) + closing "Two payoffs" paragraph (7 lines) — code: `DurableMixin`, `RepairController`
  (`CraftingApi.repair`, deficit-priced reverse-craft), `SalvageController`
  (`CraftingApi.salvage` → `Casting`/`Scrap`); doc: `crafting.md § The lifecycle: two wear axes,
  repair, broken, salvage` (which itself cites `materials-response.md` back for the wear-on-use
  fold) — "reforge" = re-melting salvaged `Casting` back through an ordinary recipe, no separate
  verb needed.
- `## The taxonomy at the start` (grid, 15 lines) — doc: `materials-response.md § The taxonomy
  grid (shape, in code)` explicitly states "transcribed verbatim from the slate."
- `## How it grows` — "Two independent axes" + "Rough wave order" (16 lines), and the "Weapons" +
  "Thermal insulation" bullets under "The other consumers" (3 lines) — doc:
  `materials-response.md § The seven channels, and the THREE folds` (heat/cold via `clo`,
  corrosion via material-match, shock via circuit) supersedes this forward-looking sketch with
  the actual, more detailed growth record.
- `## Settled decisions` (26 lines) — all 11 items are cited by number in `materials-response.md`
  itself (`Settled-4` at "no `ArmorMixin`", `Settled-6` at "one function, two consumers",
  `Settled-11` at "The legibility surface (mandatory — Settled 11)"), confirming graduation
  happened at the numbering level, not just in substance.
- `## Open questions` Q1, Q2, Q3, Q4, Q6 (14 lines) — all five are answered-and-resolved per the
  code: Q1 by the actual channel growth (heat/cold/corrosion/shock landed, `crush` is the one
  gap); Q2 by `MaterialApi`/`MaterialLogic`; Q3 by "the channel driving a given `inflict` is
  explicit at the call site (Settled: no auto-pick)" in `materials-response.md § Weapon
  delivery`; Q4 by `attenuate`'s residual-energy fold; Q6 by "`grade × condition` scales the
  response and never its shape" in `materials-response.md § The response function`.
- `## Once shaped into formal requirements` items 1–5, 8 (23 lines) and items 7, 9 (9 lines) —
  same evidence as above (weapon-form bundle/reach/shield confirmed shipped in `combat.md`;
  condition field + wear→repair→salvage confirmed shipped in `crafting.md`). Item 7's one
  still-open clause (unarmed/grapple as a full armor-bypass) and item 9's one still-open clause
  (solid-state-at-rest / opt-in decay) are **not lost** — both are carried forward in the new
  status block's `Left` line and (for the decay clause) in the kept Lifecycle bullet below.
- Trailing "Tests gating: ..." paragraph + closing "Structures, thermal `clo`, vessels..."
  sentence (12 lines) — the specific assertions match already-shipped mechanics (edge/plate/mail
  interactions, called shot, reach control, repair/condition), and the closing sentence's
  "thermal `clo`" claim is now false (shipped) — remaining backlog is captured in the new status
  block and the kept body sections instead.

### Kept (UNBUILT)
- Armor § "Two honest costs" bullet — armor-mass→`LoadBearingMixin`→endurance-reserve→poise-cap,
  and armor-protects-affordances (covering a limb prevents disarm/impair trauma there). Looked
  for a `LoadBearing`↔`Poise` link in `encumbrance.md`/`combat.md`'s Poise section: found none —
  `Poise.restore` is capped by the endurance ratio generically, never by armor mass specifically,
  and no covering-protects-affordance mechanic exists.
- Lifecycle § "Solid-state at rest" bullet (passive environmental decay, opt-in, off by default)
  — `crafting.md § Deferred (non-goals)` lists "environmental decay (rust/rot at rest)" as a
  non-goal too, confirming no code exists; kept verbatim since the *why* (presence-freeze
  discipline, opt-in `material × medium`, off by default) isn't captured anywhere else.
- `## How it grows` → "The other consumers" bullets: Structures/destructibility, Vessels/
  containers, Tool durability (construction-driven wear rate), Tissue (maybe) — confirmed no
  code for any of the four (`crush` channel absent; no `Sealable`/`Flask` construction-integrity
  link found; `crafting.wear.*` rates are flat AppSettings, not construction-derived; tissue
  stays material-only per the doc's own named seam).
- `## The crafting / economy bridge` (whole section, 13 lines) — no Recipe row or `RecipeCatalogue`
  code lets a smith choose `mail` vs `plate` output from the same material; armor rows are
  authored `constructionForm:` directly (confirmed via `packages/content/generic-objects/
  content/stuff/thing/armor/*.yaml`). Matches the still-open `Recipe` craft-stamp item.
- `## Open questions` Q5 (tissue as construction or material-only) — matches
  `materials-response.md`'s own "named seam," kept verbatim.
- `## What this slate does NOT cover` (whole section) — scope-framing spine, not a decision to
  graduate or cut; still accurately bounds the remainder.
- `## Once shaped into formal requirements` item 6 (the `Recipe` craft-stamp) — kept verbatim,
  UNBUILT.

### Corrections logged (doc statement the code proved false)
- `materials-response.md § Deferred (named seams)` listed "Combat playstyle + loop" as fully
  deferred, "The economic lifecycle tail" as including repair/scrap-reforge, and "Other channels"
  as including `heat`/`cold`/`corrosion` — all three are stale: those all shipped and the *same
  document* already describes them as shipped earlier (§ Weapon delivery / § The seven channels /
  crafting.md's lifecycle section). Corrected in place to say what remains: the deep grapple/
  choke bypass floor; the `Recipe` craft-stamp; and `crush` alone, respectively. This is an
  in-place fix to an existing sentence, not a new insertion — logged per the skill's exception
  for "a statement the code proves false."

### Status block
- Left: `Recipe` craft-stamp · repair/scrap/reforge · `crush`/`heat`/`corrosion` channels ·
  weapon reach+guard+gambits and shield-as-armor · tissue as a construction axis
  → `Recipe` craft-stamp of {material, construction, grade} · the `crush` channel (structural
  destructibility) · tissue as a construction axis · armor weight→fatigue→poise +
  armor-protects-affordances wiring · vessels/containers construction-response ·
  construction-driven tool-wear rate · the deep grapple/choke armor-bypass · opt-in passive
  environmental decay (rust/rot). (Grew from 5 named items to 8, per the pilot's "Left usually
  grows" — the previously-bundled "repair/scrap/reforge" and "heat/corrosion channels" and
  "weapon reach+guard+gambits and shield-as-armor" items turned out to be SHIPPED; four
  previously-unlisted UNBUILT items surfaced from the body: the armor↔poise/affordance wiring,
  vessels, tool-wear-by-construction, the grapple bypass floor, and the opt-in decay clause.)
- Size: a wave → a wave (unchanged — the remaining items are still consumer-pulled slices, not a
  quick tail: `crush`/destructibility in particular is its own small build).

## Handoff (belongs in a doc outside my list — never inserted, no doc edited)

None. Every graduation target for this slate's shipped content (`combat.md`, `crafting.md`) was
already fully documented — nothing required a fresh insertion outside `materials-response.md`.
The two doc corrections above were made inside `materials-response.md`, which is on my list.
