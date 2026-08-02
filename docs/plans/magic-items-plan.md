# Magic items — implementation plan

Phase 2 for [magic-items-requirements.md](../requirements/magic-items-requirements.md)
(7 waves, 34 decisions D1–D34, 41 acceptance criteria). This plan says
**how**; the requirements say what and why, and are not re-litigated
here.

**One open question remains — Q6 (`K`).** Q2 (thrown carriers) and Q5
(subsystem folders) are resolved in §11, along with five smaller ones;
§12 records what requirements D34 changed after this plan was written.


---

## 0. D30 settled: does eviction remove an item from circulation?

**Eviction destroys.** `ResidencyLogic` culls with `StuffApi.destruct`,
and residency.md is explicit that the culler never promises rehydration
— an evicted object is simply gone, and a re-entered room re-clones its
authored set dressing rather than the drifted item someone dropped.

**But there is a second, orthogonal exit from memory that is not
destruction**, and it is the one that matters: the **persistence
spine**. `ContainerMixin.canEvict` falls through for a `PersistableMixin`
host and the sweep awaits `PersistableApi.capture` before destructing.
So everything in an avatar's pack, a dorm room, or any persistable chest
leaves memory **alive**, parked in `holder_snapshots`, re-materializing
on next reference. Add the logged-off avatar and there is a real
population of items that exist, are owned, and are invisible to a live
scan.

Third fact: the eviction sweep ships in **`observe` mode**
(`residency.eviction.mode`), so in production today nothing is culled at
all and a live count is exactly the resident population.

### The decision

**Build the census as a live, region-scoped query over resident Stuff.
Do not reach into persistence.** And state the semantics rather than
treating it as a compromise:

> **Circulation = what is reachable in the world now.** A wand in a
> logged-off player's pack is a *withdrawal* from circulation until they
> log in, and re-enters when they do.

That is the discovery slate's own stock model (accumulation minus
withdrawal), and it is the right quantity for the decision being made —
both injection channels place into *live* regions, so the thing they
must not over-fill is live regional stock.

Supporting:

1. Eviction destroying means a live count needs no correction for the
   cull path.
2. The snapshot-parked tail is self-correcting and bounded — a captured
   holder re-materializes on first reference, so a transient undercount
   costs at most one extra spawn per sweep, which D30 already declares
   tolerable.
3. Reaching into persistence is a worse problem: `holder_snapshots` rows
   are per-mixin capture blobs, not an item index. Counting from them
   means a new index plus a write-path obligation on every item move.
4. Global stock still gets its say — D30 assigns the slow decay-side
   equilibrium to global stock, and the D7 dial absorbs regional
   over-spawn.

### The hard constraint this creates

`scripts/check-world-scan.ts` is **CI-gating** and allowlists exactly
three files for `StuffApi.getAllObjects()` (`api/stuff.ts`,
`api/mql/resolver.ts`, `obj/api/ResidencyLogic.ts`). *(Verified.)*

**The census must therefore be an MQL system-mode query**
(`world:[mixin.Circulating]`, region-filtered) — the sanctioned
engine-sweep form — **not a bespoke registry walk**. If profiling later
shows it too costly per decision, the fallback is to fold the count into
`ResidencyLogic`'s existing sweep (already allowlisted, already walking
every object once) and cache per-region per-sweep. Start with MQL: no
allowlist edit, no new exception.

Shape: `lib/residency/Census.ts`, `censusFor(regionKey, censusKey)`.
Both channels consult it. `Stock.reset()` already reads on-hand before
topping to par — that is the pattern, generalized from per-shelf to
per-region. Authored placement **counts and spends nothing**, as D30
requires.

---

## 1. Wave sequencing

```
W1 effect spine ──┬── W2 consumables ──┬── W4 BUC + conditions
                  ├── W3 charge/decay ─┘
                  └── W6 spellbooks (needs W2 read/modality, W5 identity)
W5 identification ── (needs W2 for instances to identify)
W7 distribution ── (needs W1 tags, W3 decay, W5 classes)
```

- **Wave 1 is a hard precondition.** Nothing else starts.
- **Waves 2 and 3 are independent** and can run in parallel. Land 2
  first if serial — it is lower risk and produces the first non-cast
  trigger, which is the first real test of the spine.
- **Wave 4 needs both 2 and 3** (a consumable to buy a fixed term, a
  charged host to sustain).
- **Wave 5 needs 2** and **must precede 6** (D29). Its **descriptor-bank
  authoring is the long pole — start it and the lint early, in parallel
  with wave 2**, because D32 warns the banks cannot be authored blind
  against a moving materials vocabulary.
- **Wave 7 is last.**

---

## 2. Wave 1 — the trigger-agnostic effect spine

Blast radius measured: only **12 files** mention
`MagicApi.`/`MagicProvenance`/`magicOrigin`.

### New

| File | Category |
|---|---|
| `lib/magic/EffectContext.ts` | Named value-object — `{origin, actor, source, potency, tag}` + a static holder with `forCast` / `forItem`. The `Grid`/`Resists`/`Faculty` shape. |
| `lib/magic/CastingProfile.ts` | Named value-object — D3's `{requiredBand, castSeconds}`, mirroring `Faculty.validateProfile`. |

Neither invents a category.

### Modified

- **`lib/magic/Grid.ts`** — `MagicProvenance` gains `specifiedBy` /
  `firedBy`, replacing `caster` (D2). ⚠ **Persisted shape change**: the
  tag is stored on `Trauma.magicOrigin`, `AfflictionRecord.magicOrigin`
  and `SustainedEffect.magicOrigin`, all round-tripping through
  `holder_snapshots`. Ship a read-tolerant hydrate normalizer reading a
  legacy `caster` as both fields. **Do not keep `caster` as a live
  alias** — that recreates the ambiguity D2 exists to kill.
- **`lib/magic/Spell.ts`** — the two fields move into a `castingProfile`
  blob; nine seeds re-authored, single-form read (nine files is not
  worth a shim).
- **`obj/SpellCatalogue.ts`** — warm-time validation of the new shape.
- **`obj/api/MagicLogic.ts`** — the core. `executeEffect(ctx, target,
  spell, effect)`; `deliverAt` compares `sceneOf(ctx.origin)`;
  `appendHarmRow(ctx.actor, victim)`; `execCloak`/`execEmitField`
  install on `ctx.actor`; `resolveCastImpl` builds the context and reads
  the band gate off the profile.
- **`api/magic.ts`** — one gated item entry point (`MagicApi.discharge`).
  **The actor derives from `ExecutionContextApi` inside `MagicLogic`,
  never passed** — the `ProvenanceApi.recordAuthoring` precedent. The
  context is internal plumbing beneath the gate.
- **`obj/command/magic/CastController.ts`, `SpellsController.ts`,
  `lib/magic/CastActivity.ts`** — profile reads.

### Order

1. `CastingProfile` + `Spell` + seeds + catalogue (smallest, gets seed
   churn out of the way).
2. `Grid` provenance split + hydrate normalizer.
3. `EffectContext`.
4. `MagicLogic` threading. **Unblocks every later wave.**
5. `api/magic.ts` item entry. **Unblocks waves 2 and 3.**

### Risk — one of the two riskiest waves

- **The reachability check** is a no-op for casts *only if* `forCast`
  sets origin = caster. Pin with a test before touching.
- **The self-effect fallback** (`target ?? caster`) appears in four
  executors; each becomes `ctx.actor`, and one mistake silently
  retargets a spell at a wand.
- **The accountability row** must use `ctx.actor`, never `ctx.origin` —
  a wand must not initiate a harm row. AC 2 pins this.
- **Persisted provenance** — the normalizer is the mitigation; a
  round-trip over a pre-change `holder_snapshots` fixture is the proof.
- **The Practicum integration test is the canary** — it drives the five
  shipped labs end to end. Run after every step.

---

## 3. Wave 2 — consumables

### New

| File | Category |
|---|---|
| `lib/magic/Consumable.ts` | Mixin |
| `lib/magic/Potable.ts` | Mixin — the `Bulkable`-composed potion leg (D4) |
| `lib/description/Marked.ts` | Mixin — D33: `{text, modality}`; modality vocabulary reused from `lib/perception/`, not re-declared |
| `lib/magic/Dose.ts` | Named value-object — the graded/threshold split, pure |
| `cmd/perception/read.yaml` + `obj/command/perception/ReadController.ts` | Command YAML + Controller |

### Modified

- **`cmd/bulk/drink.yaml`** — add `quaff` to the `verbs:` list rather
  than minting a second view (**Q1**).
- **`lib/metabolism/Metabolic.ts`** — **no change.** The `ingest` seam is
  already the front door and a flask routes through it exactly as a mug
  does. This requirement is *already satisfied* — assert it, don't build
  it.
- **`obj/api/CommandLogic.ts` + the command schema** — the D23 parser
  floor. On bind failure, consult `allDefinitions()` for a view whose
  `verbs` contains the token; if found, emit `command-rejected` with a
  new reason `unafforded` and prose from a new optional YAML field.
  **One general mechanism satisfies AC 5a for every capability verb at
  once.**
- ⚠ **`lib/identification/IdentifyScroll.ts`** — retire its
  `commandContributions`. *(Verified: it declares `inventory:
  ['perception/identify.yaml']`.)* It is the one shipped **item template
  declaring a use-verb**, which AC 5a forbids. `identify` moves to the
  capability mixin. **Sequence with the replacement in one commit** or
  the identify demo breaks.
- **`lib/perception/`** — `read` resolves perceive-through-the-light-gate
  then decode (a no-op pass in v1). Embossed bypasses the light gate.

### Order

1. `Marked` + modality (unblocks `read` and wave 6's books).
2. The parser floor (unblocks AC 5a for everything after).
3. `Consumable` + `Dose`.
4. `read.yaml` + controller + scroll content.
5. Potion content; `IdentifyScroll` verb retirement.

### Risk

Moderate. The parser floor touches a shipped hot path — **keep the
change to the failure branch only, never alter successful binds.**

---

## 4. Wave 3 — charge, decay, and the item economy

### New

| File | Category |
|---|---|
| `lib/magic/Charged.ts` | Mixin — charge as a `Reserve` (kJ) + reconcile-on-read decay + passive-draw flag |
| `lib/magic/Focus.ts` | Mixin — pattern rot on its slower schedule |
| `lib/magic/Charge.ts` | Named value-object — `decayed`, `equilibrium`, `standbyDrain`. **Pure**, and what AC 6's convergence test drives |
| `cmd/magic/recharge.yaml` + `obj/command/magic/RechargeController.ts` | D23 standalone diegetic verb |

### The D10 decision, made explicitly

**(A) Local fuel-spend in `recoverMana`** — ~30 lines, low risk, but two
integrators drain the same fuel in the same window without seeing each
other, and the sub-stepping differs (metabolism slices at 60 s; the
faculty integrates the gap in one shot).

**(B) Fold mana into the coupled-recovery keystone** — `coupledRecovery`
gains a `@hook` `coupledConsumers()` returning
`[{key, maxPerMin, satiationCost, hydrationCost}]`, defaulting to
`[endurance]`; `CasterMixin` appends `mana` via the super-chain when the
faculty is active; the fuel limit is computed across the whole set in
priority order (body before gift). Mana recovery leaves
`reconcileFaculty` entirely, and the duplicated stamp guards (both 4 h,
copy-pasted in both files) collapse to one.

**Recommend (B).** D10's own words are *"a second consumer of the
existing coupled-recovery keystone"*; (A) is a second mechanism wearing
the keystone's clothes. Verify composition order puts `CasterMixin`
outside `MetabolicMixin` before starting.

> ⚠ **Write characterization tests for the shipped `coupledRecovery`
> before touching it** — basal drain, hydration throttle, fuel-limit
> clamps, cascade hysteresis, far-past and linkdead guards. This is a
> live, player-visible loop with no second consumer today.

### Two decay details that are easy to get wrong

1. **Charge decay must have NO far-past absence guard.** Metabolism's
   guard exists for fairness to an absent *body*; an item must decay
   while nobody is looking — that is the entire basis of `S* = inflow/d`.
   **Follow husbandry** (documented as reconcile-on-read with no
   far-past guard), not metabolism. Copying metabolism's guard here
   silently breaks wave 7.
2. **Game time, not real time** — the 12× factor applies. A rate quoted
   per month must be divided through before comparison to a physical
   rate; `arcane-science.md` names this the likeliest dishonest number
   in the system.

### Risk — the second riskiest wave

- **AC 7 changes shipped `shove`.** Today `execMove` only sets the
  target prone; a focus-endpoint recoil now displaces the caster. That
  is a deliberate behaviour change to a live spell, required by content
  rule 7 — **call it out in the MR.**
- **Waste heat on an item endpoint** routes through `ThermalApi` +
  `FireApi.tryAutoignite` on an item — a path that today only fires for
  object-target heat. Cracking must come from a materials-response read,
  not an invented rule.

---

## 5. Wave 4 — BUC and the condition/shadow line

### New

| File | Category |
|---|---|
| `lib/magic/Blessing.ts` | Named value-object — **direct copy of the `Grade` shape**: ascending band tuple, private ordinal, `of()`/`isBand()`, persisted as the band word |
| `lib/magic/Blessable.ts` | Mixin — opt-in per template |

`scale(potency, lo, hi)` and `pick(potency, steps[])` are **statics on
`Blessing`**, not a third file.

### Modified

- **`lib/vitals/Vitals.ts`** — the veto layer: a `canAfflict(record)`
  **`@hook`**, default `{ok: true}`, composed via `super`. **Exactly the
  `canEvict` shape** — same doctrine (engine asks, object decides), same
  doc tier, same default bias. Do not invent a registry.
- **`api/condition.ts` / `obj/api/ConditionLogic.ts`** — `inflict`
  consults the veto.
- **`lib/vitals/Condition.ts`** — `SustainedEffect` gains
  `sustainedBy?` (host durable id) vs `sustainedFor?` (term seconds).
- **The wearable release gate** — a cursed `Blessable` vetoes unequip,
  plus D11's discharge into the holder.
- **`lib/stuff/Globbable.ts`** — BUC-bucket enters `globIdentityFields`.
  Land the field here; the merge semantics land in wave 5.

### Risk

The veto sits on the **hottest write path in vitals** — `inflict` is
called by harm, hazard, fire, electricity, metabolism, combat and magic.
A `{ok: true}` default plus super-chaining keeps it inert for existing
callers, but **pin the ordering by test: veto after the covering-stack
fold, before the write**, or immunity silently stops attenuating armor.

---

## 6. Wave 5 — identification

Largest by file count, and the one with real content lead time.

### New

| File | Category |
|---|---|
| `lib/identification/Appearance.ts` | Named value-object — `appearanceFor(classKey, generation, seed)`, pure |
| `lib/identification/DescriptorBank.ts` | Document, **exact `NameBank` shape** — own collection, key-cached, pack-installed |
| `lib/description/Labelled.ts` | Mixin — D28 labels (**Q7**) |
| `cmd/inventory/label.yaml` + controller | Category `inventory` |
| `packages/content/arcane-descriptors/` | Content pack mirroring `species-and-names`; six banks per D32 |
| `packages/server/scripts/check-descriptor-banks.ts` | Script, same shape as `check-boundary-exemptions.ts` |

### Modified

- **`lib/identification/Identifiable.ts`** — `knownAttributes` is the
  state; **no `identificationLevel` scalar** (drop it before it exists).
  Appearance becomes derived.
- **`lib/belief/BeliefStore.ts` / `api/recognition.ts`** — the
  `IDENTIFICATION` realm payload gains `knownAttributes` and
  `learnedGeneration`. The store stays dumb CRUD; **the hedge display is
  consumer logic in `RecognitionApi.describe`.** The store already keys
  on `templatePath` — **no new realm, no new store.**
- **`lib/stuff/Globbable.ts`** — `globIdentityFields` = class +
  BUC-bucket (both persistent, satisfying the `⊂ persistentFields`
  constraint the framework enforces at registration). **The
  rendered-appearance comparison goes in `canMergeWith`** — D27 is right
  and the framework would reject it anyway. A `Labelled` item vetoes
  auto-merge.
- **`obj/api/PackLogic.ts`** — a `descriptor-banks` content kind
  alongside `name-banks`.
- **`obj/api/MagicLogic.ts`** — `execSense` gains the D24 identify
  variant: **writes to the belief store, not a message.**

### The turnover-seed problem — not settled by D26/D27

D27 hashes the window position from "its instance id", but **`stuffId`
is a fresh UUID per construction** — not durable across reload or
re-clone. Hashing it makes every item's flip moment jitter on every
reboot, and items visibly flip *back*.

**Fix: a persisted `turnoverSeed` minted at clone time.** Not a stored
appearance (D26 holds — appearance is still derived from class ×
generation × seed, and all current-generation items of a class still
look identical), and **excluded from `globIdentityFields`** or stacks
stop merging. Merging shifts the absorbed item's seed to the survivor's,
which D27 already declares invisible. **Q3.**

### Order

1. **Descriptor banks + the lint first, in parallel with wave 2** — the
   content is the long pole, and the lint must exist *before* the banks
   are written or D32's authoring trap gets baked in.
2. `Appearance` + the generation clock.
3. Belief payload + `describe` hedging.
4. `Globbable` identity/veto.
5. `Labelled` + `label`.
6. The identify effect.

### Risk

- **`canMergeWith` is on the merge-on-arrival ripple**, firing on every
  move into a container holding globbables. Adding a derived read there
  puts work on a hot path — **cache the rendered descriptor per (class,
  generation)**; it is identical for every instance in a generation, so
  the cache is tiny and the window compare is a cheap integer.
- **AC 21 is the subtle one.** Two unknown-BUC items must merge
  regardless of true state, then split on reveal. Getting it wrong is a
  free curse-identification exploit. **Test adversarially.**
- **The lint must run in both directions** — a material added later
  colliding with a shipped descriptor is the direction nobody checks.

---

## 7. Wave 6 — spellbooks and memory

### New

| File | Category |
|---|---|
| `lib/magic/SpellKnowledge.ts` | Static holder — **verbatim `RecipeKnowledge` sibling**: `knowsOf` (claim), `noteKnown` (idempotent `recordOnce`), distinct keys, never a deed |
| `lib/magic/Memorized.ts` | Mixin — `{sharpness, maturity, stamp, defective}` per spell, reconcile-on-read |
| `lib/magic/Fade.ts` | Named value-object — the four-axis fade function, **pure**, and the only honest way to test AC 30 |
| `lib/magic/StudyActivity.ts` | The `CastActivity` shape exactly — slots, interruptible, resolve at completion |
| `lib/magic/Spellbook.ts` | Stuff — composes `Marked` (W2), `Identifiable` (W5), `Graded` (quality → refresh speed, **not** fade rate), mass |
| `cmd/magic/study.yaml` + controller | Standalone verb |

### The one design call

**Claim lives in the chronicle; sharpness lives on the mixin.** The
chronicle is append-only and idempotent — right for *you have read of
this*, useless for a decaying quantity. Sharpness is specification
state, which D15 explicitly permits to be stored and to decay
(*competence never fades; specifications do*). Derive-don't-track stays
intact: competence still derives from Transcript deeds only, and AC 26
asserts reading writes **no Transcript entry**.

### Risk

Low-to-moderate, mostly additive. The hazard: **the cost multiplier
lands in the spend leg of `resolveCastImpl`**, which wave 1 rewrote and
wave 3 coupled to metabolism. **Land it last and re-run both suites.**

---

## 8. Wave 7 — distribution

### New

| File | Category |
|---|---|
| `lib/residency/Circulating.ts` | Mixin — the two tag sets + `censusKey()`. Worn by every item class so books, potions and wands all count |
| `lib/magic/PriceList.ts` | Static holder — the arcane price list as code. **Spawn weight = inverse of stored labour**; multi-effect takes the max cell. Doubles as the authoring check for content rule 1 |
| `lib/residency/Census.ts` | Static holder over the MQL query. **Not a new Api tier** |
| `lib/residency/SpawnTable.ts` | Named value-object — the weighted draw; consults `Census`, declines at target |

### Modified

- **`obj/api/ResidencyLogic.ts`** — a third sweep in the shipped family:
  `installSpawnSweep()` alongside eviction and reset, on the game-time
  clock, `observe`/`enforce` disciplined. Natural home: same shape, same
  file, and the one file allowlisted for raw enumeration if the count
  ever needs to become sweep-cached.
- **`api/residency.ts`** — one gated read. A method on an existing Api.
- **`Stock.reset()`'s pattern generalized** to any resettable holder.
  **`populates:` untouched** (D31) — assert in a test.
- **`lib/config/AppSettings.ts`** — the dials, *calibrate at launch*.

### Risk

- **Census query cost** — compute the region→count map **once per
  sweep** and pass it to both channels, not per candidate.
- **AC 34's "not globally"** is the test that keeps D30 honest.
- **`ParcelRecord.allowance` must not be touched** — worth a one-line
  comment where someone would be tempted.

---

## 9. Cross-cutting risk register

| Risk | Wave | Mitigation |
|---|---|---|
| Provenance is a persisted shape on three condition kinds | 1 | Read-tolerant normalizer + fixture round-trip |
| `coupledRecovery` is a live keystone with no second consumer | 3 | **Characterization tests before touching**; the hook approach; composition-order check |
| Charge decay copying metabolism's far-past guard | 3 | Follow husbandry; pin with AC 6 |
| Game-time vs real-time (12×) | 3, 5, 7 | Every rate constant carries its unit in its name |
| Shipped `shove` gains caster displacement | 3 | Call out in the MR; required by AC 7 |
| Veto ordering vs the covering-stack fold | 4 | Pin by test |
| `canMergeWith` on the merge hot path | 5 | Per-(class, generation) cache |
| BUC leaking through merge | 5 | Adversarial test |
| `stuffId` is not durable | 5 | Persisted `turnoverSeed` (**Q3**) |
| Census cost per decision | 7 | Once per sweep, shared |

## 10. Test strategy

| Kind | ACs |
|---|---|
| **Unit (pure)** | 6, 25, 30, 32 — highest value in the build. Keep `Charge`, `Fade`, `Dose`, `Appearance`, `PriceList` pure and these are trivial and exact |
| **Unit (mixin/logic)** | 1, 2, 4, 5, 5a, 5b, 7–11, 14–18, 20–23, 26, 27, 29, 33 |
| **Integration** | 3, 12, 13, 19, 28, 31, 34, 35 — each crosses ≥2 subsystems; 13 and 19 also cross persistence |
| **Lint test** | 24 — assert the script fails on a colliding fixture, **both directions** |
| **Live drive** | end of 3, 5, 7 — banding (no raw kJ to players); the identification loop; regional stock does not run away |
| **Characterization** | `coupledRecovery` before wave 3. Not an AC; the thing that keeps wave 3 from regressing silently |

**AC 38 note:** no new `no-restricted-syntax` exception may be added.
Every module here is a class, a mixin factory, or a value-object with a
static holder. The place to watch is `Dose`/`Fade`/`Charge`/
`Appearance`/`PriceList` — **write them as classes with static methods**
(the `Faculty`/`Grade`/`Resists` idiom), never as exported free
functions.

---

## 11. Questions — resolved 2026-08-02

All but one are settled. Recorded here so the resolutions travel with
the plan.

**Q2 — thrown carriers. ✅ DEFERRED.** The requirements premise was
false: no `throw` verb and no delivery model exist *(verified)*.
Requirements D17 is corrected — the delivery half goes to the ranged
build; only the **route** declaration (oral · contact · vapour) lands
here, because retrofitting it across every potion later is expensive.
AC 35 rewritten accordingly.

**Q5 — new subsystem folders. ✅ NONE MINTED.**

| Was proposed | Lands in | Why |
|---|---|---|
| `lib/magicitem/` | **`lib/magic/`** | it all rides the same disciplines |
| `lib/blessing/` | **`lib/magic/`** | not worth a folder for two files |
| `Census` · `SpawnTable` · `Circulating` | **`lib/residency/`** | the spawn sweep is the **third self-maintenance sweep**, next to eviction and reset; distribution is not magic and will outgrow `lib/magic/` |
| `Marked` · `Labelled` | **`lib/description/`** (unchanged) | neither is magic — a signpost bears marks, labels serve storage and shops |

On BUC's home specifically: a BUC-bearing thing is **an object**, **used**,
**with a gradable potency**. Rooms and NPCs fail the second test, so not
`lib/stuff/`; and material is *what a thing is made of*, a different
kind of fact, so not there either. Our own reform defines BUC as *a
potency level on the item's own **effect axis*** — and an effect axis is
magic's. That scopes it to `lib/magic/` by definition rather than by
convenience. A cursed *mundane* blade, if ever wanted, is a different
mechanic (a curse condition on an item).

**Q1 — `quaff`. ✅** Alias in `drink.yaml`'s `verbs:` list; no second
view.

**Q3 — turnover seed. ✅** Persisted `turnoverSeed`, minted at clone
time, excluded from `globIdentityFields`. It stores a *position*, not an
appearance, so D26 holds.

**Q4 — AC 24 wiring. ✅** `lint:descriptors` as a sibling script in the
CI `lint` job, matching every existing precedent. Root `pnpm lint` is
unchanged.

**Q7 — `Labelled`. ✅** `lib/description/`.

**Q8 — census semantics. ✅** Accepted, and the framing goes into
`docs/subsystems/magic-items.md` in those words so nobody later "fixes"
it by querying `holder_snapshots`.

**⚠ Q6 — `K` (D32). STILL OPEN.** Provisional at 3. The 10×10 product
supplies N×(K+1) ≈ 80 comfortably and could carry K=4 (100) without
re-authoring, but not beyond. **Confirm before the banks are authored** —
it is the one number that decides whether the authored word count is
right.

## 12. Added after planning — D34, and what it costs

**Requirements D34** landed after this plan was written and changes two
things in it.

**The rule:** *a conferred verb keys on what the holder can SEE, never
on what is hidden.* Verbs key on **kind**, effects key on **class**.

- **Wave 2's `IdentifyScroll` change is a deletion, not a relocation.**
  The plan said its `commandContributions` moves to a capability mixin.
  It doesn't — **there is no `identify` verb at all.** A scroll affords
  `read`; the identify effect fires through reading it. Otherwise the
  affordance identifies the scroll for free.
- **Wave 3 gains a constraint:** a **depleted** charged item must still
  afford its verb and fail audibly. If a flat wand stopped affording
  `zap`, the affordance list would be a free charge meter — and charge is
  meant to need an instrument.

New acceptance criterion **5c** covers all three cases (identify scroll,
per-class verb variation, depleted wand). Treat it as an invariant that
will regress silently the first time someone adds a convenience.

## Critical files

`obj/api/MagicLogic.ts` · `lib/metabolism/Metabolic.ts` ·
`lib/magic/Caster.ts` · `lib/stuff/Globbable.ts` ·
`obj/api/ResidencyLogic.ts`
