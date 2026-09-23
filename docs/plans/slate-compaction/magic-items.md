# Slate-compaction pass — magic-items batch ledger

One slate. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `magic-items.md` only
(one insert, which also corrects a statement the code proves false). Line
numbers below are the ORIGINAL file's. Originals saved under the scratch
dir `magic-items/orig/` for diffing. Code was verified in
`packages/server/src/mud/lib/{magic,identification,residency,vitals,species}`,
`packages/server/src/mud/platform/idea/api/MagicLogic.ts`,
`packages/content/arcana/src/**`, `packages/content/arcane-library/**`
(18 spell rows, 19 item rows, 3 potion materials), `lib/config/AppSettings.ts`
(the `magic.charge.*` dials), and the docs of record `magic-items.md` ·
`magic.md` · `belief.md` · `harm.md` · `residency.md` · `concealment.md` ·
`combat.md` · `docs/arcane-science.md`.

Batch-wide findings a reviewer should know first:

1. **`magic-items.md` says multi-target "does not ship"; it does.** § *…and
   the high end must not betray the working's identity* reads *"It needs
   multi-target, which does not ship, so the high end is deliberately the
   same cure … The real high end stays named for when multi-target lands."*
   Commit `c3d624536` (2026-08-04, *multi-target scope, false belief, and
   distinct bands per item*) landed `scope` on `adjust-blessing` and `sense`
   (`lib/magic/Effect.ts:127-145`, resolved against the actor in
   `MagicLogic.ts:1105-1125`), and both shipped rows use it:
   `remove-curse.yaml:75` `scope: [null, null, inventory]`, `identify.yaml`
   `sense: [misidentify, identify-item, identify-item]` +
   `scope: [null, null, inventory]`. The commit did not touch the doc. Fixed
   by INSERT (a ✅ paragraph under that section), not by rewriting the stale
   sentence — see *Graduated* below. This is also the one graduation: the
   slate's identify ladder `[one, several, all]` shipped as
   `[misidentify · one · whole inventory]` and no doc said so.
2. **Two `Left` items were false on arrival.** *"the afflict veto/immunity
   layer"* shipped as `Vitals.canAfflict` (`lib/vitals/Vitals.ts:478,2412`;
   `magic-items.md § The condition veto`). *"actor tempo (shared with
   combat)"* shipped in combat as `lib/combat/Tempo.ts` (a derived per-actor
   rate — `combat.md § Tempo`); what remains is a *haste modifier* on it,
   which is a catalog item. *"the perception gate + transient override"* is
   half false: the gate is the concealment build's `perceives`
   (`concealment.md § The gate`; MQL's scope-walk gates on it), the
   transient *override* is unbuilt. `Left` is re-stamped accordingly.
3. **The slate's Condition-vs-Shadow rule shipped for its PULL half and was
   contradicted on its PUSH half.** `MagicEffects.familyOf` + the
   `SustainedEffect` Condition realized by pull in `reconcileConditions`
   (`magic.md § Impulse vs modifier`) is the rule's default; but the one
   presentation effect that shipped (veil, `cloak`) went by pull too — an
   imposed `Disguisable` disguise — and **no magic effect attaches a
   call-security `Shadow`** (`ShadowApi.attach` has one caller in the whole
   tree, `PersistableLogic.ts:1339`). The rule paragraphs are KEPT under
   *Uncertain*, the stale "both inert" description and the healing/combat
   seam paragraph are cut.
4. **"Shipped in a different shape" is most of this slate.** Known-BUC is a
   per-instance `BlessingBucket` on the item, not a belief realm; rings are
   `Wearable + Charged` discharging a `sustained` Condition, not
   `Augment.confers()`; potions are `Bulkable + PotableMixin` on a material,
   not `Consumable` (only `Scroll` composes it); the item-side spawn table is
   `stocks`/`favours`/`blessingOdds` on a zone (D31, `SpawnTable.ts`). Each
   is SUPERSEDED with a pointer to the doc section describing what shipped.
5. **The charge section rests on the energy-density footing the 2026-08-11
   science revision replaced** (`arcane-science.md § The second quantity`:
   a shell holds mana by *mana density*) — same call the fasttravel batch
   made for the mana-economy slate. Its equilibrium, recoil, always-on and
   pattern-rot paragraphs are all in `magic-items.md`; cut with pointers.
   The impulse-vs-binding / cell-as-narrative-primitive rationale was already
   graduated by that batch (`§ Why a home has no line`) and is not touched.

---

## docs/slates/builds/magic-items-slate.md — 788 → 469 · Status PARTIAL → PARTIAL

The slate is the 2026-07 NetHack walk plus the 2026-08-02 charge pass; the
substrate it designed shipped on 2026-08-05 and is in `magic-items.md`
nearly paragraph for paragraph. What stays is the catalog map (the backlog
the packs read from), the sanctity/holy-water design (unbuilt, half of it
owed to presence-hollowing), the polymorph reconciliations, and the Tier-2
gaps that survived verification. Every heading survives (a heading grep of
the diff shows none deleted); each cut section carries a one-line pointer
under it.

### Cut (SHIPPED · DOCUMENTED)
- the second status block *"Status (2026-08-05): SHIPPED as a tail …"* (16–21, 6) — history; the canonical block is kept and re-stamped. Its two framing subsections (*Where the catalog work actually lives*, *how to CUT it*) and the *Original status / The premise* paragraph are spine and KEPT
- `## The effect substrate (Gap 0)` body (97–112, 16) — code: `lib/magic/Consumable.ts` (composed by arcana's `Scroll.ts:51` only), `Effect.ts`, `EffectContext.ts`, `MagicLogic.discharge`, `Potable.ts` fired from `BulkableApi.ingest`; doc: `magic-items.md § The effect context`, `§ The three item classes`, `§ Potions ride the MATERIAL`, `§ Verbs`. ⚠ shape differs: potions are NOT `Consumable` (material + `Bulkable`), and the use-verbs are `read` · `zap` · `drink`/`quaff` — no `apply`. Pointer says so
- `### Two effect families` body (116–129, 14) — code: `MagicEffects.familyOf` (`Effect.ts:344-353`); doc: `magic.md § Impulse vs modifier`; the potion/mug convergence: `magic-items.md § Potions ride the MATERIAL` (*`PotableMixin` fires from the shipped `BulkableApi.ingest` bridge*)
- `### Condition vs Shadow` → the intro paragraph + the two descriptive bullets (133–143, 11) — *"both built but inert"* is false (seven `inflict` callers, `SustainedEffect`); the mechanisms are `vitals.md`/`harm.md` (conditions) and `call-security.md` (shadows). The rule paragraphs are KEPT — see Uncertain
- `### Condition vs Shadow` → *Bonus / combat seam* + *Potions are the first consumer* (168–174, 7) — healing as condition-clearing and combat writing trauma into the one table: `harm.md` (`relieve`, `treat`, reconcile-on-read wounds); the second paragraph is history
- `## BUC as a system` body (178–199, 22) — code: `lib/magic/Blessing.ts`, `Blessable.ts`, `Slotted.tryReleaseFromSlots`; doc: `magic-items.md § BUC — a potency level on the item's own effect axis`, `§ The engine owns the ORDERING; the working owns the FUNCTION` (quotes the slate's rule verbatim), `§ Cursed sticks — the release gate`
- `### The two authoring shapes = the whole effect surface` body (203–216, 14) — code: `Blessing.pick`/`scale`, band-varying fields (`Effect.ts:363+`), `scripts/check-blessed-bands` (`pnpm lint:blessed-bands`); doc: `§ Potency: scale it if it has a size, gate it if it does not`, `§ Composing Blessable obliges you to author it` (*the lint stops silence, review stops laziness* — the slate's not-lintable monotonic contract, restated)
- `### Notes on the reform's edges` → bullet 2 *Cursed may be actively bad … a cursed identify plants a false identification* (223–227, 5) — code: `identify.yaml` `sense: [misidentify, identify-item, identify-item]`, `Effect.ts:199-204`, `wand-of-firebolt-cursed.yaml`; doc: `magic-items.md § The engine owns the ORDERING` (backfire, sign inversion), `belief.md` l.262–274 (`believedName`, the planted name), l.413. Bullet 1 (the no-op baseline, holy water) is KEPT
- `## Opt-in, and where BUC comes from` body (241–261, 21) — opt-in: `Blessable.ts` docstring l.4–7, four composers (`Wand`/`Scroll`/`Ring`/`Amulet`), `§ Scoped to things with an effect axis`; spawn state: `Blessable.applyMintOdds` + `ResidencyLogic` mint-site roll, `§ Generation odds` (item baseline · zone override); the location-side bias: `SpatialZone.stocks`/`favours` (`residency.md` l.372–374, the zone-field table); laundering as items: `§ Remove curse`. ⚠ shape differs (the *renormalizing overlay* shipped as `favours` multiplying draw weight); the creature half is `spawn-distribution-slate`'s `Left`
- `## Scrolls` → bullet 1 *Reading is a gated modality that isn't gated* (393–398, 6) — false now: `magic-items.md § read decomposes into perceive + decode`, `§ Two axes, not one` (form/script, the touch placeholder, literacy withheld-not-mangled); the gate is `concealment.md § The gate` + `VisionModality.canSee`. Confused-reading is a catalog item (§ C, kept)
- `## Scrolls` → bullet 2 *Amnesia — belief already forgets; knowledge fragmentation* (399–409, 11) — the decision (amnesia strips the held specification, never the chronicle claim) is `magic-items.md § Spellbooks and memory` (the blockquote); `BeliefStore.forget*` exists; no amnesia scroll exists — it stays in § C
- `## Rings & amulets` → the *REVISED 2026-08-03 (D8, D11)* box (429–440, 12) — code: `lib/magic/Charged.ts` (`alwaysOn`, `drawActive`, `onSlotOccupied`/`onSlotReleased`), `Blessable.tryRelease`; doc: `§ Wearing sustains; releasing releases`, `§ Cursed sticks`
- `## Rings & amulets` → bullet *New gap — condition-application has no veto/immunity layer* (450–456, 7) — code: `Vitals.canAfflict` (`lib/vitals/Vitals.ts:478, 2412`), the `canEvict` shape; doc: `§ The condition veto`, `harm.md` l.193. ⚠ no shipped ring confers an immunity (catalog); the polymorph-transition guard has no transition to guard yet — noted in the pointer. **Removed from `Left`**
- `## Charge, decay` → the *Design pass 2026-08-02* box (476–485, 10) — history (*the effect roster is deliberately NOT here* — the roster is the kept catalog map)
- `### The endpoint decides who absorbs the reaction` body (512–528, 17) — code: `EffectContext.source` (*who PAYS takes the recoil*); doc: `§ The effect context` (third consequence), `§ The three item classes` consequences list (1.7 km/s, gun-shaped, *a spark wand is safer than the equivalent cast*) — verbatim
- `### The durable-goods answer: bound the charge, not the shells` body (546–592, 47) — code: `Charge.ts` (`standbyDraw`), `Charged.reconcileCharge`, `AppSettings.magicChargeDecayPerGameSec` (*the `d` in `S* = inflow/d`* in its own docstring); doc: `§ The charge economy` (*decay is load-bearing*, the equation, *two dials whose ratio is the answer*, the three consequences) — verbatim
- `### Wearables are charged too — and they are the worst case` body (596–617, 22) — code: `magic.charge.standbyWatts` (*two orders of magnitude above the leak*), `Blessable.tryRelease` → `ReleaseRefusal`; doc: `§ Wearing sustains`, `§ ChargedMixin's second consumer` (*Always-on is the expensive mode* paragraph verbatim), `§ Cursed sticks` (D11). ⓘ the *+1.2 K core temperature* figure was on the energy footing and is not in the doc; the *discharging into you* mechanism is
- `### What it costs to build` → the list (643–650, 8) — `Charge.RESERVE_KEY = 'charge'` on `ReservedMixin`; `reconcileCharge`; `arcana/cmd/magic/recharge.yaml` (now through `chargeFrom` + a coupling — `§ Recharging`); `alwaysOn`; the dials are `magic.charge.decayPerGameSec` + `standbyWatts` (not *inflow + decay per class* — inflow is the spawn table). The *Open for the roster pass* paragraph is KEPT — see Uncertain
- `## Gap roundup` → *Pleasant surprises* (662–667, 6) — a 2026-07 description of substrate; *conditions + shadows both inert* and *the wearable-augment coupling* are false now
- `## Gap roundup` → *Tier 1* (669–677, 9) — items 1–3 shipped whole (above); `magic.md § Impulse vs modifier` for the realization wiring
- `## Gap roundup` → Tier 2 item 5 (683–684, 2) — `Vitals.canAfflict`, `§ The condition veto`
- `## Gap roundup` → *Recommended v1 spine* (711–714, 4) — history; Tier 1 shipped
- `### C` → the *identify* bullet (747–748, 2) — the mark prompt: `§ A working that needs a mark ASKS` (`PromptApi.mqlObject`); the ladder `[misidentify · one · whole inventory]`: `identify.yaml` + the ✅ note inserted below

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- the slate's identify cardinality ladder (`§ C identify`, 747–748) + the multi-target *scope* the doc says does not ship — code: `lib/magic/Effect.ts:127-145` (`AdjustBlessingEffect.scope`, `SenseEffect.scope`), `MagicLogic.ts:1105-1125` (resolved against the actor; *MQL names the SET, the EFFECT decides what it can act on*), `remove-curse.yaml:75`, `identify.yaml` → inserted at `magic-items.md § …and the high end must not betray the working's identity`, directly under the stale paragraph, as a ✅ blockquote (15 lines). ⚠ **This is the one place I touched an existing statement's truth**: the sentence *"It needs multi-target, which does not ship … stays named for when multi-target lands"* is left in place and the insert says it is history — an INSERT, per the rule, not a rewrite. The coordinator may prefer the stale sentence struck

### Superseded — cut
- `## Two axes, kept apart` body (79–93, 15) — by the code: BUC's *known* state is a per-instance `BlessingBucket` on the item (`Blessable.ts` l.11–17, `getBlessingBucket`, `revealBlessing`), world-known once revealed — NOT *"the same belief machinery"* per viewer; identity stays the belief store → `magic-items.md § Blessed means EFFICIENT` (*the two hidden axes … stay independent*), `§ BUC and merge behaviour`. Pointer left; the identity axis is `identification-slate`'s
- `## Rings & amulets` → *The wearable-augment coupling is already wired* (442–448, 7) — by the code: `arcana/src/thing/Ring.ts:38-44` is `Wearable + Slottable + Blessable + Identifiable + Labelled + Charged + Reserved + Arcane` — no `AugmentMixin`, nothing `confers()`; the effect is a `sustained` Condition discharged from the charge at the `Slotted.occupy` chokepoint (D8: *confer their mixin only while charged* needs a metered draw an augment has no notion of) → `§ Wearing sustains; releasing releases`. Note left
- `### The question the thesis leaves open: who is the endpoint?` body (489–508, 20) — by `arcane-science.md § The second quantity` (2026-08-11): *"it holds that energy by ordinary means … storage obeys ordinary energy density"* is the τ = kJ reading the revision replaced — a shell holds **mana** by *mana density*. The classes table shipped (`Focus` cut): `magic-items.md § The three item classes`. Same call as the fasttravel batch's Part 0. Note left
- `### The numbers` body (532–542, 11) — by the same revision (100 g of *energetic solid at 3 MJ/kg* is the energy-density footing); the decay clock shipped as `magic.charge.decayPerGameSec` (*calibrate at launch*), *the ruins are full of dead wands* as `§ ChargedMixin's second consumer`'s *magic perishes, matter doesn't — perfect blades and faded rings*. Note left
- `### Foci perish too — pattern rot` body (621–639, 19) — by the `Focus` cut before merge: `magic-items.md § The mana potion is metabolic` (the ⚠ box: *a second instance of an existing decision*; *no verb to fire it*), `§ ChargedMixin's second consumer` (*D9's pattern-rot clock was the Focus half and went with the class*); the *mages should have gear* intuition is `implements-slate.md`. Note left

### Kept (UNBUILT)
- the status block (re-stamped) · `### ⭐ Where the catalog work actually lives` + `⚠ how to CUT it` (the live product question) · the *Original status / The premise* paragraph · *See also* (every link is to a live doc or slate; `augmentation.md`'s parenthetical *"a worn ring/amulet is a wearable augment"* is now false — see Uncertain — but *See also* is spine)
- `### Notes on the reform's edges` → bullet 1 (the no-op baseline: plain water uncursed = water, blessed = holy, cursed = unholy) — no holy water exists (`grep -rli "holy water|consecrat|unholy" packages/` → 0)
- `## Sanctity, holy water, and what "good/evil" means here` — whole, all four subsections: no `dip`/`apply` verb (`find packages/content -path '*cmd*' -name dip.yaml` → none), no consecration, no altar row, no hollow state (`grep -rli hollow packages/server/src/mud/lib` → 0). `### Good/Evil is not morality` is a canon restatement — see Doctrine
- `## Polymorph — the body-swap` — whole, incl. its own *RESOLVED 2026-08-03* box (which IS the superseded note: item polymorph = semblance, `PriceList.ts:53` `transform: 1000` *priced out*; body-swap → `presence-hollowing-slate`). Kept because the four reconciliations are live gaps and the slate says so — see Uncertain
- `## Scrolls` → intro line · bullet 3 *Create-monster* (no procgen-NPC generator; `mintRandomGuestAvatar` is still `Login.ts`'s only mint) · the *Rapid-clear* cross-ref paragraph
- `## Rings & amulets` → the ESP/presence convergence bullet (`VerbalESPModality`/`EmotiveESPModality` exist at `platform/idea/modalities/`; no amulet grants one; the hollow is `presence-hollowing-slate`) · the *amulet of strangulation* exemplar (no row; `Respiration.ts:95` has the `strangulation` channel it would use) · the *Rest are conferred-while-worn modifiers* index
- `### What it costs to build` → *Open for the roster pass* — see Uncertain
- `## Gap roundup` → intro · Tier 2 items 4, 6, 7 (see Uncertain for 4 and 7; 6: `grep -rni reprofil packages/server/src/mud` → 0) · Tier 3 items 8–11 (11: `Organism.setSpecies` is still a bare `_speciesPath` write, `Organism.ts:230-232`, now called by `Shade.ts:72` and `WireBody.ts:86` on fresh bodies with no reconciliation; no slot-eviction path — `grep -rni "slotsChanged|evictOrphan|onBodyPlanChanged"` → 0) · *Decisions / deferrals* (see Uncertain)
- `## The catalog map` — whole, all five buckets (minus the identify bullet); see Uncertain for the shipped items inside kept bullets
- `## Deferred / own-slate` — whole

### Doctrine — kept, labelled
- `### Good/Evil is not morality — it's presence vs. the hollowing` — a restatement of `story-bible.md § Alignment` / `§ Evil — the hollowing` (both `[settled]`), here as the premise for the consecrated-item rule. Not a backlog item; the coordinator decides whether the slate keeps its own copy or points at the bible / `alignment-slate`

### Uncertain — kept
- `### Condition vs Shadow` → the rule + *Pull* + *Push (shadow)* + *Neither subsumes the other* (145–166) — **contradicted in part**. The PULL half is exactly what shipped (`SustainedEffect` realized in `VitalsMixin.reconcileConditions`, `magic.md § Impulse vs modifier`). The PUSH half names *presentation/recognition (disguise/polymorph)* as a shadow case, and the one presentation effect that shipped (veil/`cloak`) went by **pull** — an imposed `Disguisable` disguise — and nothing in the magic tree attaches a call-security `Shadow` (`ShadowApi.attach` has one caller, `PersistableLogic.ts:1339`). *Perceivability (invisibility)* is unbuilt, so whether it needs a shadow is genuinely open. `magic-items.md § Sustained: host-held vs term-bought` still speaks of *a shadow sourced from a potion* as possible. Kept whole; `Left` carries *the push/shadow realization for owner-less behaviour (invisibility)*. Requirements should read this against `magic.md`, not inherit *~3–4 effects need shadows*
- `## Engine shape — all reuse, one new value-object` (the table, 229–237) — one paragraph, four of five rows shipped **in a different shape**: *True BUC* is `lib/magic/Blessing.ts` + `Blessable.ts` (not `lib/blessing/`); *Known BUC* is the per-instance `BlessingBucket` (not a belief realm; `RecognitionApi.describe` is not involved); *The stick* is `Blessable.tryRelease` through `Slotted.tryReleaseFromSlots` (not the augment release gate); *Effect* is `Blessing.pick`/`scale` (no `BlessingApi`); *Detection* v1 shipped as identify + remove-curse revealing the band (`revealBlessing`) and its **"Later = an instrument … point a sanctity reader at the item"** has no code and no other home (the identification-slate names only the `analyze X with Y` seam) → kept whole under the paragraph rule; `Left` gains *a BUC-reading instrument*. ⚠ check `instrumentation-slate` before designing it
- `## Polymorph` — whole. Its premise is superseded by its own box (D18: semblance, not transformation; body-swap → presence-hollowing) and the *architectural findings* it says remain accurate do: `setSpecies` exists and is bare, capabilities/vitals derive live. But the section still reads as *"the build is: wrap `setSpecies` in a choreographed `Polymorph` transition"* while the box says actual body-swap is presence-hollowing's; `presence-hollowing-slate.md:78-80` names *polymorph-as-vessel-swap* as a consumer and carries NONE of the four reconciliations. So the reconciliations have exactly one home — here — and `Left` names them. Requirements must decide whether the choreography is this slate's or presence-hollowing's; two-slates overlap noted for the cluster pass
- `## Gap roundup` → Tier 2 item 4 *Perception gate + transient override* — half shipped: *"the gate is a stub; MQL routes around it"* is false (`concealment.md § The gate`: `perceives`, and `scope-walk.pushDirect` gates every candidate on it); the transient *override* (*perceive-as-if*) has no code — `sense` effects are one-shot reports. Kept whole; `Left` re-worded to the override
- `## Gap roundup` → Tier 2 item 7 *Actor tempo/haste — no per-actor action-rate exists* — false in combat: `lib/combat/Tempo.ts` accrues a derived per-combatant rate (`combat.md § Tempo`). No haste *modifier* reads into it and nothing outside combat has a tempo. Kept; `Left` re-worded to *a haste modifier on combat's derived tempo*
- `## Gap roundup` → Tier 3 item 9 *Spawn-distribution substrate* — the item half shipped as D31 (`lib/residency/SpawnTable.ts`, `stocks`/`favours`/`blessingOdds`; `spawn-distribution-slate` is PARTIAL and says so); the creature half is that slate's `Left`. Kept as the pointer it is; two-slates overlap with item 10 and the Scrolls *create-monster* bullet — all three say the procgen-NPC generator, and `spawn-distribution-slate` owns it
- `## Gap roundup` → *Decisions / deferrals* — one paragraph, contradicted in one clause: *"combat items … wait on combat"* — combat has shipped (`combat.md`); the items are still unauthored. *knowledge fragmentation* and *language/literacy* are documented decisions (`§ Spellbooks and memory`, `§ Two axes, not one`); *stat-block absence* stands. Kept; `Left` says *combat has shipped*
- `### What it costs to build` → *Open for the roster pass* — three questions, one still open: per-cell costs derive from `PriceList` (shipped, `§ Distribution`); the focus-refresh question is moot (`Focus` cut); **whether shells are craftable or only found** is open — no `Recipe` outputs a wand/scroll/ring (grep over `packages/content/**/recipe*` → none) and the doc is silent. Kept; in `Left`
- `### A — Direct translation` (one bullet) — several items inside it shipped or moved: booze (`getBAC`, done), fire/cold resistance (thermal), teleport + control (`teleport.yaml`, D-prompt), ESP modalities exist; **`gain energy → reserve (mana-as-content)` is superseded** — the mana potion is *metabolic* and a positive `adjust-reserve` on `mana` is REFUSED at authoring (`§ The mana potion is metabolic`). One paragraph; kept whole, flagged so the catalog author does not build a gain-energy potion
- `### B` → *healing* — the reconception (*condition-clearing / vitals-sign restoration*) is what `harm.md` shipped (`relieve`, `treat`, the medic vertical), but no healing potion exists (`grep -rli healing packages/content/arcane-library` → 0; `MagicLogic.ts:285` mentions one only in a comment). Kept as the catalog item it is
- `### E` → *speed / haste* and the *combat* bullet — see Tier 2 item 7 and *Decisions / deferrals* above; kept
- *See also* → `augmentation.md` *"a worn ring/amulet is a wearable augment"* and `belief.md` *"known-BUC is a new realm here"* — both false in the shipped shape (Superseded above); left because *See also* is spine
- `## Deferred / own-slate` → *"v1 ships spawn-state + one remove-curse + honest holy water"* — holy water did not ship; spawn-state and remove-curse did. One bullet; kept
- Overlaps for the cluster pass: the procgen-NPC generator ↔ `spawn-distribution-slate` (owner); the hollow / consecrated items / ESP ↔ `presence-hollowing-slate` (owner of the state; this slate owns the items); holy water's BUC-raising + consecration ↔ `alignment-slate` / `alignment-religion-slate` (the worship layer); the catalog's consumables ↔ `pharma-slate` (*potions and scrolls are pharma's product line*); the polymorph choreography ↔ `presence-hollowing-slate` (see above)

### Handoff (belongs in a doc outside my list)
- → `magic.md § Impulse vs modifier; provenance; suppression` — the WHY of realize-by-pull, which that section states as a fact (*realized by pull in `VitalsMixin.reconcileConditions`*) without the reason. Verbatim from the kept `### Condition vs Shadow` (so it is NOT lost if the coordinator declines; the slate keeps it too). ⚠ The second bullet's shadow half is unbuilt and contradicted for disguise — insert the rule and the *Pull* bullet only, or mark the *Push* bullet as the open half:

  > **Fact → `Condition`. Realize by *pull* by default; use a *shadow* (push)
  > only when the affected behavior is owner-less.**
  >
  > - **Pull** — a driver/getter reads the condition record and folds it in (vitals
  >   band, metabolic drain, thermal/damage intake). This is how the condition
  >   system is *already designed*. Cheap. The default. Covers poison, disease,
  >   trauma, resistances, regeneration, slow-digestion.
  > - **Push (shadow)** — the fact attaches a method-override so every caller sees
  >   modified behavior without knowing conditions exist. Needed **only** when the
  >   target method is scattered across many call sites with no single owner — a
  >   short list: **perceivability** (invisibility) and **presentation/recognition**
  >   (disguise/polymorph). ~3–4 effects in the whole catalog, not half.
  >
  > Neither subsumes the other: shadows can't be the fact-store (attachment doesn't
  > persist → progression state evaporates on reload); conditions can't cleanly
  > override diffuse behavior (would thread condition-checks through all of
  > perception). They compose — **Condition is always the substrate; a shadow is an
  > optional realization for the diffuse minority**, re-materialized from the
  > persisted condition on load (so the Tier-5 "attachment doesn't persist" gap is
  > irrelevant — persist the condition, re-attach the shadow).

- → `arcane-science.md`, `crafting.md`: nothing. The charge section's science is already the revision's; the only crafting question (shells craftable?) is open, not a graduation

### Status block
- Left: *the item-by-item catalog walk … the cut is undecided · Tier-2 substrate gaps still open: the perception gate + transient override · the afflict veto/immunity layer · capacity reprofiling on polymorph · actor tempo (shared with combat) · slot eviction on bodyplan change · combat items wait on combat · the blessing economy beyond v1* (8 items) → *the catalog walk + the cut · the transient perception override (the gate shipped with concealment) · the push/shadow realization for owner-less behaviour (invisibility) · capacity reprofiling on polymorph · slot eviction on bodyplan change · the polymorph choreography that wraps `setSpecies` · a haste modifier on combat's derived tempo · a BUC-reading instrument · holy water (BUC-raising by `dip`, the consecration ritual; the anti-hollow reaction waits on presence-hollowing-slate) · create-monster / the procgen-NPC generator (shared with spawn-distribution-slate) · whether shells are craftable or only found · combat items (combat has shipped) · the blessing economy beyond v1* (13 items). Dropped: *the afflict veto/immunity layer* (shipped). Re-worded: the perception gate, actor tempo, combat items. Added from the body: the shadow realization, the polymorph choreography, the BUC instrument, holy water, create-monster, shells craftable
- Size: a build → **a wave** — the slate's own § *Where the catalog work actually lives* says the remaining work is content shipped as packs, *"not here, and not in a build"*, and every substrate item rides a build another slate owns (polymorph/presence-hollowing, combat, spawn-distribution). ⓘ If the coordinator reads the catalog walk as its own cycle, *a build* is defensible; the body does not

---

## Totals

| slate | lines | Status | Left items | Size |
|---|---|---|---|---|
| `builds/magic-items-slate.md` | 788 → 469 | PARTIAL → PARTIAL | 8 → 13 | a build → a wave |

Cuts: 24 entries SHIPPED·DOCUMENTED (≈ 319 lines) · 1 graduated (→ `magic-items.md § …and the high end`, +16 lines incl. blank) · 5 superseded · 0 ABSORBED · 13 Uncertain entries · 1 doctrine section · 1 handoff paragraph (→ `magic.md`). Every original heading survives; no index file touched; `git diff --stat` on my files: slate −364/+45 (net 788 → 469 incl. the 22-line re-stamped block), `magic-items.md` +16, this ledger new.

Hardest calls:
1. **Inserting a correction into `magic-items.md` rather than leaving a stale sentence stand.** *"multi-target, which does not ship"* is disproved by two shipped rows and the executor; leaving it would have had the catalog author build remove-curse's *whole-inventory* high end a second time. The rule permits fixing a statement the code proves false; I did it as an INSERT under the paragraph and left the sentence, so the coordinator can strike it or not.
2. **Cutting `## Two axes, kept apart`.** It is the slate's "single most important framing", and the *axes* survived — but its mechanism sentence (*both ride the same belief machinery*) is exactly what did not ship (a world-known per-instance bucket), and the doc states the shipped shape. Superseded, not documented, so the pointer says what changed.
3. **Keeping the Condition-vs-Shadow rule while cutting its neighbours.** The pull half is `magic.md`'s; the shadow half was overtaken for disguise and never exercised. Kept under Uncertain (contradicted-in-part) rather than cut as superseded, because invisibility is unbuilt and might yet be the owner-less case the rule predicts.
4. **Keeping the whole Polymorph section** on the strength of its own *RESOLVED* box saying *retained for its architectural findings*. The premise is superseded; the four reconciliations have no other home (`presence-hollowing-slate` names the consumer, not the gaps). The alternative — cutting the findings and leaving the gap list — would have split paragraphs the rule forbids splitting.
5. **Re-sizing to a wave.** The old stamp said *a build*; the slate's own framing paragraph, kept, says the catalog is content and not a build. The body wins over the stamp.
