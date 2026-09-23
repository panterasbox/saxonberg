# Ledger: encumbrance batch

Slate: `docs/slates/tails/encumbrance-slate.md`
Doc I may insert into: `docs/subsystems/encumbrance.md` (only)
Handoff targets found (not touched): conveyance.md, logistics.md, forestry.md

## Pre-pass findings

- The subsystem doc (`docs/subsystems/encumbrance.md`, 301 lines) is
  comprehensive and already states almost the entire "Left" list from the
  slate's own status block verbatim in its closing **Deferred tails**
  section: *"Environmental (gravity) margins, tissue-derived mass,
  augment-conferred capacity, numeric tuning, the per-item placement
  refinement (a frame pack beating the worn floor) — genuinely undriven;
  land when a consumer appears."* Confirms the slate's status claim is
  accurate.
- Verified in code (`packages/server/src/mud/lib/encumbrance/LoadBearing.ts`):
  `LoadBearingMixin`, `getBorneBurden`/`getCarryCapacity`/`getStrainCeiling`/
  `getLoadRatio`/`wouldExceedCeiling`/`drainForTraversal`, the weighted
  tree-walk, `LOAD_BEARING_DEFAULTS` dials, haul-draft term
  (`MixinApi.isHauling`/`getHaulDraft`) — all shipped, all match the doc.
  No augment-capacity term, no gravity/hypoxia margin term anywhere in the
  file — confirms those two Left items are genuinely still unbuilt.
- `packages/server/src/mud/lib/slot/Haulable.ts` + `Hauler.ts` confirm the
  cart/haulage handoff (`draftFactor`, `getHaulDraft`) shipped exactly as
  the doc's Haulage section describes.
- `packages/server/src/mud/lib/boundary/Exit.ts` / `Exitable.ts` confirm
  `wheelPassable` shipped — resolves the slate's open question about
  terrain-trade ownership.
- No `PorterMixin` anywhere in the tree — confirms the slate's "there is no
  PorterMixin" doctrine claim still holds.
- **Finding for the coordinator, not acted on**: the client's cockpit
  `Shelf.tsx` (the widget-shelf HUD) explicitly and deliberately excludes
  `borneBurden`/`carryCapacity`/`loadRatio` from the live self-figure
  catalogue ("deliberately not here"). The slate's "surfaced in the
  cockpit vitals readout like a condition" claim does not match — the
  actual shipped surface is the generic inspection-card fallback row
  (`CardBodies.tsx`) via `subscribableFields`, not a persistent HUD gauge.
  Classified as SUPERSEDED below.
- **Finding for the coordinator, not acted on**: `LoadBearing.ts` also
  carries a `TIGHT_FIT_SURCHARGE` dial (textiles fit-tightness burden,
  `fitOn().tightness`) that is not in the slate at all and is not listed
  in `encumbrance.md`'s "Engine dials" enumeration. Out of my scope to
  graduate (not slate content), flagging so the doc's dial list can be
  extended by whoever owns that pass.
- **Cleanup, not a design cut**: the slate file's last two lines were
  literal stray text `</content>` / `</invoke>` — a tool-output artifact
  that had leaked into the file, not real content. Removed.

---

## `docs/slates/tails/encumbrance-slate.md` — 463 → 158 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- `## Principle` (27 lines) — code: `LoadBearing.ts` (derived-on-read gauge); doc: `encumbrance.md` intro + § The gauge.
- `## Units: mass → effective-kg → ratio` (35 lines, minus the Footgun callout which graduated — see below) — code: `LoadBearing.ts` (transmission/placement coupling produce the same effect the "effective-kg" framing describes); doc: `encumbrance.md` § Borne burden.
- `## The model is mass — not RPG slots` intro paragraph + consequence-ladder table + closing sentence (~20 lines) — code: `GetController.pickUpOperand`, `LocomotionApi.canTraverseExit`/`engageAround`; doc: `encumbrance.md` § The consequence ladder. (The "cockpit vitals readout" clause in this paragraph is separately flagged SUPERSEDED below — the paragraph as a whole is cut under this heading since the rest of it matches shipped behavior.)
- `### The spiral (flagged for tuning)` (7 lines) — code: `enduranceMargin()` in `LoadBearing.ts`; doc: `encumbrance.md` § Carry capacity, `enduranceMargin` bullet. The steepness *dial* remains open — kept under Open questions.
- `## The load side: through what coupling, onto which bearer?` intro table (13 lines) — code/doc: same as below (Two gauges, honest-physics, bearers).
- `### Two gauges, one coupling` (36 lines) — code: `LoadBearing.ts` `walk()`; doc: `encumbrance.md` § Borne burden — the weighted tree-walk.
- `### The honest-physics stance` (17 lines) — code: `LOOSE_CARRY_SURCHARGE`, `Vessel.transmissionFactor`; doc: `encumbrance.md` § The v1 loose-carry model. The "top-tier pack dips below the floor" tail already pointed at Open questions (kept there).
- `### Capacity is not a stat` — paragraph 1 (formula + `capability-magic` boundary) + paragraph 2 ("capacity barely moves") — **graduated then cut**, see below.
- `### The terms` — "Physiological baseline" bullet (5 lines) — code: `Species.getBaseMass()`/`Creature.getMass()`; doc: `encumbrance.md` § Body mass. The tissue-derived alternative it flags remains open — kept as its own fuller Open-questions entry, so nothing is lost.
- `## The cart is the hinge` (30 lines, already self-flagged "Shipped" in the slate) — code: `HaulableMixin`/`Hauler.ts` (`draftFactor`, `getHaulDraft`), `Exit.wheelPassable`; doc: `encumbrance.md` § Haulage + `conveyance.md` § Haulage.
- `## Scope` — "Settled structure (this build)" bullets (9 lines) — code/doc: as above; replaced with a one-line pointer.
- Open questions: "Where does the gauge live?" — resolved: `LoadBearingMixin` (code: `LoadBearing.ts`; doc: `encumbrance.md` § The gauge). Note: the shipped answer is *not* what the question's own "lean" predicted (it did add a new mixin) — resolved either way, no live ambiguity remains.
- Open questions: "Container transmission vs placement coupling — one field or two?" — resolved: two distinct mechanisms, not two authored fields (transmission is a stored `Vessel.transmissionFactor`; placement is derived from the slot's `accepts`, never stored) — doc: `encumbrance.md` § Borne burden.
- Open questions: "The cart's terrain-trade ownership" (tabled) — resolved: conveyance-declares/boundary-answers, exactly the lean stated — `Exit.wheelPassable` + `Exit.media` (code: `Exitable.ts`, `Exit.ts`; doc: `encumbrance.md` § Haulage).
- Open questions: "Does load touch movement speed?" — resolved: non-goal (doc states this as a flat decision, not a "for now") — doc: `encumbrance.md` § The consequence ladder, locomotion-veto bullet.
- `## Hypothetical acceptance roster (for shape)` (30 lines) — every scripted line matches shipped behavior + demo content — code: `packages/content/generic-objects/content/stuff/thing/gear/{backpack,bag-of-holding,anvil,handcart}.yaml`-equivalent demo templates; doc: `encumbrance.md` § Demo content.

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `> **Footgun.**` callout under "Units: mass → effective-kg → ratio" (5 lines) — code: `Quantity<'kg'>` used for both `Tangible.mass` and `LoadBearing` burden/capacity, no branded distinction — inserted at `encumbrance.md` § Borne burden — the weighted tree-walk (4 lines, as a `⚠ Footgun` callout).
- `### Capacity is not a stat` paragraphs 1–2 (14 lines: no-stat decision, the `carryCapacity = f(...)` formula, the `capability-magic` boundary, and the "capacity barely moves / fun comes from the interaction library" consequence) — code: `LoadBearing.ts` `getCarryCapacity()` (no stat term in the formula); doc had the formula but not the boundary-decision or its why — inserted at `encumbrance.md` § Carry capacity — physiology-derived (9 lines, prose paragraph before the formula).

### Superseded — cut
- `### Hands-free is not special-cased` — by the shipped **v1 loose-carry model**: the slate designed literal hand-slot claiming ("loose-carry claims hand slots"); what shipped instead is a surcharge on general-contents items with **no slot claimed at all** (`GetController` never occupies a hand slot — see `encumbrance.md` § The v1 loose-carry model, and the code comment in `LoadBearing.getBorneBurden()`: "v1 has no hand-slot-claiming on `get`"). Cut with this note rather than filed as a plain shipped-documented cut, since the *shape* differs from the design, not just its location.
- "surfaced in the cockpit vitals readout like a condition" (clause inside The-model-is-mass intro, cut above under SHIPPED·DOCUMENTED for the rest of the paragraph) — by the shipped **Shelf.tsx** exclusion: `packages/client/src/components/frame/Shelf.tsx` explicitly and deliberately excludes `borneBurden`/`carryCapacity`/`loadRatio` from the cockpit widget-shelf HUD ("deliberately not here"). What actually shipped is exposure via `subscribableFields` → the generic inspection-card fallback row (`CardBodies.tsx`), not a persistent HUD gauge. Noted here since it rides inside a paragraph classified SHIPPED·DOCUMENTED overall — flagging so the distinction isn't lost.

### Kept (UNBUILT)
- `### The terms` — "Augmentations" bullet — matches Left: augment-conferred capacity. Verified no augment-capacity term anywhere in `LoadBearing.ts`.
- `### The terms` — "Margin conditions" bullet (mixed: exhaustion/injury margins are shipped, hypoxia/gravity are not — kept whole per the mixed-paragraph rule) — matches Left: gravity/environmental margins.
- `## Scope` — "Deferred dials" + "Out of scope" paragraphs — matches Left: numeric tuning; and records the bearer-behavior / movement-speed / container-capacity boundary notes.
- Open questions — "Physiology baseline — authored or tissue-derived?" (the tissue-derived direction stays genuinely open; annotated in place that the authored half is now shipped, per doc pointer) — matches Left: tissue-derived mass.
- Open questions — "The spiral's steepness" (tabled) — matches Left: numeric tuning.
- Open questions — "Mundane floor: sacred, or a little gear relief?" (tabled) — matches Left: numeric tuning.
- Open questions — "Worn-distribution fidelity tier" — matches Left: per-item placement refinement.

### Doctrine — kept, labelled (not added to Left)
- `## What is *not* special: bearers` — the "no `PorterMixin`" argument (verified true: no `PorterMixin` anywhere in `packages/server/src/mud` or `packages/content`). A scope-boundary thesis, not a backlog item.

### Uncertain — kept
- (none)

### Handoff (belongs in a doc outside my list)
- (none) — every mechanism this slate describes is owned by `encumbrance.md` itself; the cart/haulage relationship graduated in an earlier build already lives correctly split across `encumbrance.md` § Haulage (the encumbrance-side term) and `conveyance.md` § Haulage (the vehicle/verb side) — no new handoff needed from this pass.

### Cleanup (not a design cut)
- Removed two stray trailing lines (`</content>` / `</invoke>`) — a tool-output artifact that had leaked into the file, not real content.
- Cut the top "See also" bullet for `embodiment.md`/`slot.md` and the matching bottom "Cross-references" bullet — both existed solely to support the now-superseded "Hands-free is not special-cased" design (literal hand-slot claiming), which is not what shipped.

### Status block
- Status: PARTIAL → PARTIAL (unchanged — substrate shipped, a real design/backlog remainder stays)
- Left: unchanged (all five items still verified undriven in code and each still has a body section to back it: augment-conferred capacity, gravity/environmental margins, tissue-derived mass, numeric tuning, per-item placement refinement)
- Size: a tail → a tail (unchanged)

### Doc growth
- `docs/subsystems/encumbrance.md`: 301 → 320 lines (+19): the Footgun callout (+9 incl. blank lines) and the "capacity is not a stat" boundary paragraph (+10 incl. blank lines), both inserted, nothing replaced.

---

## Coordinator (2026-09-20) — the flagged doc gap closed

- `encumbrance.md § Engine dials` — `TIGHT_FIT_SURCHARGE` paragraph added
  (`LoadBearing.ts:85`, read at l.276 via `textilesFitTightnessBurden`).
