# Traits build — implementation plan

> A fresh-context build agent should read **`docs/requirements/traits-requirements.md`** first, then the advancement subsystem doc on `origin/master`, then this plan. This plan is the implementation spec; the requirements doc is the closed-scope contract. All paths are relative to `packages/server/src/` unless noted. Code style: 80-col, 2-space, double quotes, semicolons, no `.js` import extensions.

## Orientation — the load-bearing seams (already verified on `origin/master`)

You will **mirror**, not invent. The advancement substrate is the template for every piece of this build:

- `lib/advancement/ActSignature.ts` — owns `ActSignature` and `DispositionSubcheck { disposition: string; valence: number }`. The `dispositionValence?: DispositionSubcheck[]` channel is declared-but-unpopulated. **You consume it; you do not touch this file.**
- `lib/advancement/TranscriptEntry.ts` — the row shape to clone: a plain `Document`, `static collectionName`, `static persistentFields`, `owner` keyed on `templatePath`, the domain key (`discipline`) keyed on the durable string key (not templatePath).
- `api/advancement.ts` + `obj/api/AdvancementLogic.ts` — the Api-forwards-to-logic-singleton pattern: thin Api with `logic()` via `StuffApi.singletonSync` + `HotReloadApi.getCurrentExport`; logic is `extends Idea`, `@Unshadowable`, methods `@CallSecurity(FromModule("mud/api/<feature>#<Feature>Api"))`, internals as module-private free functions (no intra-singleton `this.x()` — it trips the gate), `active()` = `PersistApi.isConnected()`, `ownerKey()` = `owner.getTemplatePath()`.
- `lib/advancement/Competence.ts` + `CompetenceBand.ts` — the derive-on-read static-method value-object estimator + the band value-object (`forX`, `rank`, `atOrAbove`, `isBand`, `FLOOR`). Your estimator is **simpler** (a game-time-decayed weighted accumulator, not BKT).
- `api/regard.ts` + `obj/api/RegardLogic.ts` — `getRegard`/`setRegard`/`adjustRegard`/`regardsHeldBy`. **No baseline concept exists today.** You add a derive-on-read baseline *in the trait layer*; belief gains no trait dependency.
- `lib/behavior/brain.ts` + the canned brains (`idles.ts`, `random-chatter.ts`, `greets.ts`, …) + `Behaved.ts` — brains are `export const brain = class {…} satisfies BrainStatics`, statics `label`/`claims`/`act(ctx)`, re-resolved per fire. `BrainContext` gives `host`, `config`, `state`, `say/emote/emoteFree`.
- The cast: `seeds/domain/lounge/npc/{mara,remy,sloane,augie,dave}.yaml` — pure-data `class: /lib/character/NPC` templates with a `behaviors:` list. `postRegister` (on `BehavedMixin`) wires them at spawn.
- `lib/character/Persona.ts` — `static commandContributions.self = ['charactergen/chronicle.yaml', 'social/standing.yaml']` is where self-view verbs are Persona-afforded. `cmd/charactergen/competence.yaml` + `obj/command/charactergen/CompetenceController.ts` + `seeds/obj/command/charactergen/CompetenceController.yaml` are the exact self-view triple to clone.
- `backend/PersistenceManager.ts` — `enum Collections` (~line 30) + `createIndexes()` (~line 544). You add one collection + one `owner` index. `lint:pm` is satisfied automatically because `DispositionEntry extends Document` (the framework carve-out, exactly like `TranscriptEntry`).
- `lib/config/AppSettings.ts` `AppSettingKeys` (~line 30) + `config/app-settings.yaml` — where the estimator dials go.

---

## Phase 0 — Branch (do this first, exactly once)

The advancement substrate this build depends on lives **only on `origin/master`**. This worktree is on a different branch.

```
git fetch origin
git checkout -b feature/traits-build origin/master
```

Verify `lib/advancement/ActSignature.ts` exists and contains `DispositionSubcheck` before proceeding. Do **not** assume working-tree files reflect master until after this checkout.

---

## Phase 1 — The `lib/trait/` vocabulary + ledger (substrate, no consumers)

New subsystem folder `lib/trait/` (parallel to `lib/advancement/`, `lib/standing/`). This is a **subsystem home**, not a new module category — every file inside falls under an existing category (value-object/vocabulary, Document).

### 1.1 `lib/trait/Disposition.ts` — the axis vocabulary (value-object + validation array)

The opposed-pair roster, **exactly** from `npc-behavior-slate.md § Traits` (read it via `git show origin/master:docs/slates/builds/npc-behavior-slate.md`). Each axis has a durable `key`, a `positive` pole label, a `negative` pole label. Convention to fix here (and document): **positive valence drives toward the `positive` pole**; the slate lists pairs as `Positive/Negative`.

The roster (CK3 personality core, 3 reframed, 1 dropped, 1 added):

| key | positive pole | negative pole |
|---|---|---|
| `composure` | Calm | Wrathful |
| `ambition` | Content | Ambitious |
| `diligence` | Diligent | Lazy |
| `generosity` | Generous | Greedy |
| `sociability` | Gregarious | Shy |
| `honesty` | Honest | Deceitful |
| `humility` | Humble | Arrogant |
| `patience` | Patient | Impatient |
| `temperance` | Temperate | Gluttonous |
| `trust` | Trusting | Paranoid |
| `compassion` | Compassionate | Callous |
| `forgiveness` | Forgiving | Vengeful |
| `constancy` | Fickle | Stubborn |
| `boldness` | Bold (risk-taking) | Cautious (Brave/Craven reframed) |
| `fairness` | Fair | Arbitrary (Just/Arbitrary reframed) |
| `worldview` | Idealistic | Cynical (Cynical/Zealous reframed) |
| `curiosity` | Curious | Incurious (native addition) |

> **AMBIGUITY TO REDLINE (A1):** that's 17 rows. The slate says "~15" / "three reframed, one dropped, one added." The "Direct keepers" list has 13 pairs; reframed adds 3; added adds 1 → **17**. **Recommendation: ship all 17; treat "~15" as approximate.** Confirm the exact roster and the polarity choice for each reframed axis (which pole is "positive"). For the reframed pairs the slate's wording is ambiguous about pole order — listed-first term taken as positive; redline if wrong.

File shape (mirror `CompetenceBand.ts` / `Discipline` channel vocabulary):

- `export interface DispositionAxis { key: string; positive: string; negative: string; }`
- `export const DISPOSITION_AXES: readonly DispositionAxis[]` — the roster above.
- `export const DISPOSITION_KEYS: readonly string[]` — derived validation array (`DISPOSITION_AXES.map(a => a.key)`).
- `export class Disposition` — static-method value-object: `axisFor(key): DispositionAxis | null`, `isAxis(value): value is string` (membership test), `poleLabel(key, sign): string` (positive/negative label by valence sign), `all(): readonly DispositionAxis[]`.

No instances, no Stuff. This kills the `types.ts` reflex (the value-object IS the concept).

### 1.2 `lib/trait/DispositionEntry.ts` — the ledger Document (sibling of TranscriptEntry)

Clone `TranscriptEntry.ts` structurally. A plain `Document`, one row per disposition sub-check, owner-indexed, in its **own** collection.

```
export interface DispositionEntryFields {
  kind?: "deed" | "claim";
  disposition: string;   // the durable axis key (NOT templatePath)
  valence: number;       // signed magnitude toward the positive pole
  when?: number | null;  // game-time seconds; defaults to "now"
  tags?: string[];
}

export default class DispositionEntry extends Document {
  static collectionName = Collections.DispositionEvents;
  static persistentFields = ["owner","kind","when","disposition","valence","tags"];
  owner = "";                          // durable owner key (templatePath) — indexed
  kind: "deed" | "claim" = "deed";
  when: number | null = null;          // game-time SECONDS
  disposition = "";                    // axis key
  valence = 0;
  tags: string[] = [];
}
```

`owner` keyed on `templatePath` (Phase-0 re-key precedent); `disposition` keyed on the durable axis key so the roster can be re-pathed without invalidating evidence (exactly as `TranscriptEntry` keys `discipline`).

### 1.3 `backend/PersistenceManager.ts` — collection + index

- Add to `enum Collections`: `DispositionEvents = 'disposition_events',`
  > **AMBIGUITY (A2):** single store (no materialized aggregate) because trait-position is **derive-on-read** with no cached aggregate (unlike renown's two-layer store). Name `disposition_events` mirrors `renown_events`/`participation_events`/`producer_events`. Redline if you'd prefer `dispositions`.
- In `createIndexes()`, after the Transcripts block, add an `owner` index with a comment mirroring the Transcripts comment (owner-scoped read O(rows-for-this-owner), future per-player cleanup cascade).

### 1.4 `CLAUDE.md` § MongoDB Collections

Add: ``- `disposition_events` — per-character append-only disposition-valenced-act ledger (`DispositionEntry`, one doc per sub-check, indexed on `owner`)``

### Phase 1 tests

- `lib/trait/__tests__/Disposition.test.ts` — roster has both poles per axis; `DISPOSITION_KEYS` validation array matches; `isAxis` accepts every key and rejects unknowns; `axisFor`/`poleLabel` correct; **no duplicate keys**.
- `lib/trait/__tests__/DispositionEntry.test.ts` — `persistentFields` round-trips; defaults; `collectionName === Collections.DispositionEvents`.

---

## Phase 2 — The estimator + band value-objects (derive-on-read, pure)

### 2.1 `lib/trait/TraitBand.ts` — the band value-object (mirror `CompetenceBand.ts`)

Bands: `unformed` / `defined` / `entrenched` (the form→define→entrench lifecycle). A static-method value-object over the **absolute accumulated evidence mass** (not the signed position): more mass → higher band → more inertia.

- `export type TraitBandName = "unformed" | "defined" | "entrenched";`
- `export const TRAIT_BANDS: readonly TraitBandName[]`
- `class TraitBand`: `FLOOR = "unformed"`, `forMass(mass: number): TraitBandName` (mass→band cutoffs, tunable via AppSettings — see 2.3), `rank`, `atOrAbove`, `isBand`.

### 2.2 `lib/trait/TraitPosition.ts` — the estimator (mirror `Competence.ts`)

A pure static-method value-object: a game-time-decayed weighted accumulator. **Intentionally simpler than BKT.**

The minimal evidence shape (Document-free, structurally satisfied by `DispositionEntry`):

```
export interface DispositionEvidence {
  disposition: string;
  valence: number;
  when: number | null;   // game-time seconds
}
```

Per-axis derivation (call it with `now` so decay is game-time):

- **Position** = signed Σ of `valence × decay(now − when)`, where `decay(Δ) = exp(−Δ / halfLifeScale)` (game-time exponential decay). Clamp to a normative range (e.g. `[-100, +100]`, matching regard's range so compatibility→regard maps cleanly).
- **Mass** = Σ of `|valence| × decay(...)` — the accumulated evidence weight; feeds the band and entrenchment.
- **Band** = `TraitBand.forMass(mass)`.

```
export interface AxisEstimate { disposition: string; position: number; mass: number; band: TraitBandName; }
```

Methods:
- `static deriveAxis(evidence, now): AxisEstimate` — fold one axis's evidence.
- `static derive(evidence, now): AxisEstimate[]` — group by `disposition`, derive each, sorted by key. (Empty evidence → no axes; an unqueried axis is implicitly neutral/unformed — the floor is implicit, like competence.)
- `static pronounced(estimates, threshold): AxisEstimate[]` — the defining axes (|position| ≥ threshold, or band ≥ `defined`) — what the self-view and brains read.

**Entrenchment-resists-drift** is a *consequence* of the model, not a separate rule, but it must be **observably testable**: the same new evidence valence moves a low-mass (unformed) position more than a high-mass (entrenched) one.

> **AMBIGUITY (A3):** (a) pure emergent — big denominator, new evidence is proportionally tiny (no extra term); or (b) explicit inertia damping factor `f(mass)`. **Decision baked in: position is the raw decayed signed sum (not normalized), clamped — so inertia is emergent and free.** Redline if a normalized/bounded-by-construction position is wanted (then add explicit damping).

### 2.3 `lib/config/AppSettings.ts` + `config/app-settings.yaml` — the dials

Add `AppSettingKeys` entries (with TSDoc), seeded in the YAML:
- `traits.decayHalfLifeDays` (game-time half-life of evidence weight)
- `traits.definedThreshold` / `traits.entrenchedThreshold` (mass cutoffs for the band)
- `traits.pronouncedThreshold` (|position| above which an axis is "defining")
- `traits.compatibilityScale` (Phase 4)

The estimator/band read these via `AppApi` (sync cached). Keep fixed-constant fallbacks inside the value-objects ONLY for the unit-test path that runs without a warmed AppSettings. Prefer reading `AppApi` in the Logic layer (Phase 3) and passing dials into the pure value-object, so `TraitPosition`/`TraitBand` stay pure and unit-testable with explicit dials.

> **AMBIGUITY (A4):** competence hardcodes its constants; requirements say traits' dials live in `AppSettings`. To honor both "pure value-object" and "dials in AppSettings," dials route through the Logic (Phase 3) and pass as params to the value-object methods. Confirm AppSettings-driven (recommended) vs hardcoded like competence.

### Phase 2 tests

- `lib/trait/__tests__/TraitBand.test.ts` — mass→band cutoffs, `atOrAbove`, `isBand`, `FLOOR`.
- `lib/trait/__tests__/TraitPosition.test.ts`:
  - empty evidence → no axes (floor implicit).
  - signed accumulation: +valences → positive position, −valences → negative.
  - **game-time decay**: an old act contributes less than a recent one of equal valence.
  - **band progression**: more mass crosses `unformed → defined → entrenched`.
  - **entrenchment resists drift** (the acceptance criterion): with explicit dials, assert one new act of valence V moves a high-mass ledger's position by strictly less than it moves a near-empty ledger's. The load-bearing test.

---

## Phase 3 — `TraitApi` + `TraitLogic` (the gated facade)

### 3.1 `obj/api/TraitLogic.ts` — the logic singleton (mirror `AdvancementLogic.ts`)

`extends Idea`, `@Unshadowable`, lives at `/obj/api/trait`. Gate constant: `const TraitApiCallers = SecurityPolicies.FromModule("mud/api/trait#TraitApi");`. Internals as module-private free functions. `active()` = `PersistApi.isConnected()`, `ownerKey()` = `owner.getTemplatePath()`. Dials pulled from `AppApi` here and passed into the value-objects.

Methods (each `@CallSecurity(TraitApiCallers)`):

- `recordSignature(owner, signature: ActSignature, opts): Promise<void>` — **fan the `dispositionValence` channel** (NOT the `discipline` channel — that's advancement's) into one `DispositionEntry` row per `DispositionSubcheck`, sharing a single act timestamp (`opts.when ?? WorldClockApi.getNow().rawValue()`). No-op without `active()` or `ownerKey`. Empty/absent `dispositionValence` → no rows. `RecordOptions = { kind?: "deed"|"claim"; when?: number|null; tags?: string[] }` — re-declare locally.
- `recordDeed(owner, sub: DispositionSubcheck, opts)` — convenience, forces `kind: "deed"`.
- `entriesFor(owner, disposition?)` — owner-scoped reader; with `disposition`, only that axis's rows. `[]` when inactive/keyless.
- `positionsFor(owner): Promise<AxisEstimate[]>` — derive-on-read: load owner rows, `TraitPosition.derive(rows, now, dials)`.
- `positionFor(owner, disposition): Promise<AxisEstimate>` — single-axis derive.
- `pronouncedFor(owner): Promise<AxisEstimate[]>` — the defining axes (self-view + brains).
- `compatibility(a, b): Promise<number>` — Phase 4.
- `regardBaseline(viewer, subject): Promise<number>` — Phase 4.

Build seam (module-private free fn, mirror `buildAndSave`): `buildAndSaveDisposition(ownerId, fields)` → `new DispositionEntry()`, stamp fields, default `when` to game-clock, `await entry.save()`.

**No conferral refresh** (traits confer no verbs). **No advancement import, no Character mixin.**

### 3.2 `api/trait.ts` — the thin Api (mirror `api/advancement.ts`)

`class TraitApi` with `logic()` resolving `/obj/api/trait` via `StuffApi.singletonSync` + `HotReloadApi.getCurrentExport`. Public statics forwarding: `recordSignature`, `recordDeed`, `entriesFor`, `positionsFor`, `positionFor`, `pronouncedFor`, `compatibility`, `regardBaseline`, plus `seedClaims` (Phase 5). Re-export the call-shape types (`DispositionEntryFields`, `AxisEstimate`, `RecordOptions`, `TraitBandName`). End with `SecurityApi.decorateApiClass(TraitApi)`.

**Gated-API actor-from-context:** the `owner` is the *subject of the act*, passed in by the recording call site — not an "actor" parameter and never caller-supplied identity (mirror `AdvancementApi`).

### 3.3 Confirm `lint:gates` cleanliness

The `FromModule("mud/api/trait#TraitApi")` string must resolve; `LOGIC_PATH = "/obj/api/trait"` + `LOGIC_CLASS_FILE` URL must match the real file. Run `pnpm lint:gates`.

### Phase 3 tests

`api/__tests__/trait.test.ts` (clone the `advancement.test.ts` in-memory-PM harness):
- `recordSignature` fans `dispositionValence` into one row per subcheck, sharing one `when`; the `discipline` channel is **ignored**.
- Empty/absent `dispositionValence` → no rows.
- `recordDeed` → single `kind:"deed"` row.
- `entriesFor` owner-scoped + per-axis filter.
- `claim` provenance round-trips.
- disconnected / keyless owner → no-op / `[]`.
- `positionsFor`/`pronouncedFor` derive correctly over a synthetic ledger.

---

## Phase 4 — Compatibility + the regard baseline (trait → belief, never reverse)

### 4.1 `TraitLogic.compatibility(a, b)`

Derive both characters' `positionsFor`. For each shared axis, contribution from sign-agreement weighted by magnitude, summed across axes, scaled by `traits.compatibilityScale` into the regard range `[-100, +100]`. Same pole → +; opposed → −; neutral → ~0.

> **AMBIGUITY (A5):** recommended kernel = **normalized dot product over shared axes** (`Σ posA·posB / scale`, clamped) — simple, symmetric, derive-on-read. CK3's hand-authored cross-axis attraction is out of scope. Redline if a richer kernel is wanted.

### 4.2 `TraitLogic.regardBaseline(viewer, subject)` — derive-on-read fallback in the trait layer

```
regardBaseline(viewer, subject):
  if RegardApi.regardsHeldBy(viewer) has an entry for subject's templatePath:
      return RegardApi.getRegard(viewer, subject)   // interaction governs
  else:
      return compatibility(viewer, subject)          // no stored row → compatibility
```

- **No stored seed** — compatibility computed on read; nothing written to belief.
- Uses `RegardApi.regardsHeldBy(viewer)` for the existence check; a stored row (even 0) means interaction has spoken and governs.
- **Belief gains NO trait dependency**: dependency points trait → belief only. `RegardApi`/`RegardLogic` untouched. Consumers call `TraitApi.regardBaseline`.

> **AMBIGUITY (A6):** baked in: row-present ⇒ governs (even if 0). Confirm.

### Phase 4 tests

`api/__tests__/trait.compatibility.test.ts`:
- aligned ledgers → positive compatibility; opposed → negative; one neutral → ~0.
- symmetry: `compatibility(a,b) === compatibility(b,a)`.
- `regardBaseline`: no stored row → compatibility; after `setRegard(viewer,subject,X)` → X.
- **belief source unchanged**: spy on `pm.save` for the beliefs collection — zero writes during a fallthrough read.

---

## Phase 5 — Cast personality at spawn (seeded `claim` evidence)

The cast templates are pure data; they need a declarative seed of disposition **evidence** (not a stat) consumed at spawn so derive-on-read yields their defining traits immediately. Mirror char-gen's claim-seeding (`ChronicleApi.seedClaims`).

### 5.1 `TraitApi.seedClaims(owner, seeds)` + `TraitLogic.seedClaims`

Mirror `ChronicleLogic.seedClaims`: for each seed, `buildAndSaveDisposition(ownerId, { kind: "claim", disposition, valence, when: opts.when })`. `ClaimSeed = { disposition: string; valence: number }`. No-op when inactive/keyless.

### 5.2 The spawn seam — where the cast template's seed evidence enters

> **AMBIGUITY (A7) — MOST IMPORTANT:**
> - **Option A (recommended):** a declarative `dispositions?: ClaimSeed[]` field on `BehavedMixin`, consumed in `BehavedMixin.postRegister` (after wiring behaviors, if set & not already seeded, call `TraitApi.seedClaims`). Idempotency: check `entriesFor(this)` for existing `kind:"claim"` rows OR a runtime-only `_dispositionsSeeded` flag. This introduces a **behavior → trait** edge. Behavior already reads traits (the demonstrator brain), so the edge already exists in this build.
> - **Option B:** a boot-time backend seeder (`DispositionSeeder`, mirror `EmoteSeeder`) reading a `seeds/trait/cast.yaml` map of templatePath → claims, keeping `BehavedMixin` trait-free. Heavier; splits cast identity from the cast template.
>
> **Recommendation: Option A.** Confirm, or direct to a different seam.

### 5.3 Cast seed assignments (from the slate's intentions)

Valences are `claim` magnitudes (consistent strong-claim magnitude, e.g. ±60–80, enough to land each in `defined`/`entrenched`):

- **Mara** (steady, watchful, reserved) — `diligence:+`, `patience:+`, `composure:+`, `temperance:+`, `sociability:−`. (Slate: "reserved & temperate.")
- **Remy** (gregarious, charming gossip) — `sociability:+`, `honesty:−`, `boldness:+`. (Slate: "gregarious.")
- **Sloane** (brooding, perceptive, secretive) — `sociability:−`, `composure:+`, `honesty:−` / `trust:−`, `compassion:+`.
- **Augie** (patient, wry, generous, storyteller) — `generosity:+`, `patience:+`, `worldview:+`, `sociability:+`.
- **Dave** (rehearsed charm, semi-retired showman) — `ambition:−` (Content), `boldness:+`, `humility:−`. Light touch.

> **AMBIGUITY (A8):** exact magnitudes + the precise axis picks for Sloane/Augie/Dave are authoring judgment. The slate firmly states only Mara (reserved/temperate) and Remy (gregarious). Redline the soft calls.

### 5.4 Update the five cast template YAMLs

Add a `dispositions:` block (Option A) to each of `seeds/domain/lounge/npc/{mara,remy,sloane,augie,dave}.yaml`, e.g.:

```yaml
  dispositions:
    - { disposition: diligence, valence: 70 }
    - { disposition: patience, valence: 60 }
    - { disposition: sociability, valence: -50 }
    - { disposition: temperance, valence: 60 }
```

### Phase 5 tests

- `obj/api/__tests__/TraitLogic.seed.test.ts` — `seedClaims` writes `kind:"claim"` rows; idempotency guard prevents double-seed on re-postRegister.
- `lib/character/__tests__/NPC.dispositions.test.ts` — an NPC template with `dispositions:` seeds at `postRegister`; after spawn, `TraitApi.pronouncedFor(npc)` yields the intended defining axes (Mara reserved/temperate, Remy gregarious).

---

## Phase 6 — The demonstrator brain (Job 1: visibly modulate cast behavior)

One new brain that reads trait-position and **visibly** modulates behavior.

> **AMBIGUITY (A9):** recommended = a **new** `converses` brain (doesn't risk shipped `random-chatter`, per requirements' "off the critical path of shipped brain behavior"). Redline if you'd rather extend `random-chatter`.

### 6.1 `lib/behavior/converses.ts` (new brain, the brain module category)

`export const brain = class { static label = "converses"; static claims = ["voice"]; static async act(ctx) {...} } satisfies BrainStatics;`

In `act`: read `await TraitApi.positionFor(ctx.host, "sociability")`; high (Gregarious) → emit more often / warmer-longer lines; low (Shy) → frequently decline this fire (early return) or terse lines. Config: `{ chatty: string[], terse: string[] }`. Modulation **observable in-world** — the demo. This establishes the **behavior → trait** read edge (the layering rule's allowed direction).

### 6.2 Wire the demonstrator onto a cast member

Add a `converses` behavior spec to **Remy** (gregarious → visibly chatty), contrasting **Mara/Sloane** (reserved → visibly quiet). Edit those cast YAMLs' `behaviors:` lists.

### Phase 6 tests

- `lib/behavior/__tests__/converses.test.ts` (clone `brains.test.ts` harness) — stubbed `TraitApi.positionFor` Gregarious → emits; Shy → declines/terse.
- Add a case to `lib/behavior/__tests__/brains.test.ts` if it enumerates brains.

---

## Phase 7 — The `traits` self-view verb (Persona-afforded)

Clone the `competence` self-view triple exactly.

### 7.1 `cmd/charactergen/traits.yaml`

```yaml
verbs: [traits]
controller: charactergen/TraitsController
description: "Read your own pronounced dispositions — your defining traits."
help: |
  Your defining traits — the axes your behavior has made pronounced...
```

> **AMBIGUITY (A10):** placement `cmd/charactergen/` (with `chronicle`/`competence`, recommended) vs `cmd/social/` (with `standing`). Redline if `social/` fits better.

### 7.2 `obj/command/charactergen/TraitsController.ts`

Mirror `CompetenceController.ts`: zero-arg, self-only, read-only. `const axes = await TraitApi.pronouncedFor(context.commandGiver);` Render each pronounced axis as **pole label + band** via `Mml` (e.g. `Gregarious — entrenched`), using `Disposition.poleLabel(key, position)`. Empty state: "Your character is still taking shape." `TOPIC = "world.identity"`. Send via `MessageApi.scene(actor).topic(TOPIC).toSelf(body).send()`. Surface **pole label + band, not the raw signed magnitude** (the competence honesty-firewall).

### 7.3 `seeds/obj/command/charactergen/TraitsController.yaml`

`class: /obj/command/charactergen/TraitsController` / `data: {}`.

### 7.4 `lib/character/Persona.ts`

Add `'charactergen/traits.yaml'` to `static commandContributions.self`.

### Phase 7 tests

`obj/command/charactergen/__tests__/TraitsController.test.ts` (clone `CompetenceController.test.ts`): empty ledger → beginning line; pronounced axes render with correct pole label + band; near-neutral absent; self-only, zero-arg.

---

## Phase 8 — Docs

### 8.1 `docs/subsystems/trait.md` (new permanent subsystem doc)

Cover: the `lib/trait/` home; the `Disposition` roster + validation array; `DispositionEntry` sibling-of-Transcript ledger (`disposition_events`, owner-indexed, durable axis keys); `TraitApi`/`TraitLogic` derive-on-read surface; the decayed-accumulator estimator + form→define→entrench bands + emergent entrenchment; the `dispositionValence` channel populated-and-consumed (no `ActSignature` reshape, no advancement→trait edge); compatibility → regard baseline (trait → belief one-way; `regardsHeldBy` existence switch; belief untouched); cast claim-seeding; the demonstrator brain (behavior → trait read edge); the `traits` self-view; AppSettings dials; the deferred **traits-stress** (job 3) seam. Include the layering diagram.

### 8.2 `CLAUDE.md` — doc-map + collections

Add a `[trait.md]` bullet to the Documentation Map subsystem list (mirror `[chronicle.md]`/`[renown.md]` density). Confirm the `disposition_events` collections-list entry from 1.4 is present.

---

## Phase 9 — Green gate

```
pnpm lint
pnpm --filter @saxonberg/server lint:pm
pnpm --filter @saxonberg/server lint:gates
pnpm test
pnpm build
```
(Use the repo's actual filter syntax; `lint:pm`/`lint:gates` are server-package scripts.)

---

## Build order & dependency sequencing

1. **Phase 0** (branch) — blocking, first.
2. **Phase 1** (vocabulary + Document + collection) — no deps.
3. **Phase 2** (estimator + bands + dials) — depends on 1.1.
4. **Phase 3** (Api + Logic) — depends on 1, 2.
5. **Phase 4** (compatibility + regard baseline) — depends on 3 + shipped `RegardApi`.
6. **Phase 5** (cast seeding) — depends on 3 (`seedClaims`) + the spawn-seam decision (A7).
7. **Phase 6** (demonstrator brain) — depends on 3 + 5.
8. **Phase 7** (self-view) — depends on 3.
9. **Phase 8** (docs) — last-but-one.
10. **Phase 9** (gate) — final.

Commit shape: `feat(trait): disposition substrate` (Phases 1–3), then `feat(trait): compatibility + regard baseline`, `feat(trait): cast personality seeding`, `feat(behavior): trait-aware converses brain`, `feat(trait): traits self-view`, `docs(trait): subsystem doc + CLAUDE map`.

---

## Module-category compliance check (no inventions)

| New file | Category |
|---|---|
| `lib/trait/Disposition.ts`, `TraitBand.ts`, `TraitPosition.ts` | Named value-object / vocabulary |
| `lib/trait/DispositionEntry.ts` | Document (persistence primitive, like `TranscriptEntry`) |
| `api/trait.ts` | Api |
| `obj/api/TraitLogic.ts` | Api logic singleton |
| `lib/behavior/converses.ts` | Brain |
| `obj/command/charactergen/TraitsController.ts` | Controller |
| `cmd/charactergen/traits.yaml` | Command YAML |
| `seeds/.../TraitsController.yaml`, cast YAML edits | Seed content |
| `docs/subsystems/trait.md` | Subsystem doc |

No `lib/mixins/`, no free-floating helpers, no new module category. `lib/trait/` is a subsystem home.

---

## Decisions (RESOLVED — build against these; the inline AMBIGUITY notes are now settled as below)

- **A1 — RESOLVED: ship all 17 axes.** The roster above (13 direct CK3 keepers + 3 reframed + 1 native addition) ships in full; "~15" in the slate was approximate. Positive pole = the slate's listed-first term per axis, as tabulated in 1.1.
- **A2 — RESOLVED: `disposition_events`.** Single store, derive-on-read, no materialized aggregate.
- **A3 — RESOLVED: emergent entrenchment.** Position is the raw decayed signed sum (clamped), not normalized; inertia falls out of the large-mass denominator. No explicit damping term.
- **A4 — RESOLVED: AppSettings-driven dials.** Dials read via `AppApi` in the Logic layer and passed as params into the pure value-objects (which keep fixed-constant fallbacks only for the unwarmed unit-test path).
- **A5 — RESOLVED: normalized dot-product kernel.** `Σ posA·posB / scale`, clamped to `[-100,+100]`. No CK3-style cross-axis attraction matrix.
- **A6 — RESOLVED: row-present ⇒ interaction governs** (even a stored 0); else fall back to compatibility.
- **A7 — RESOLVED: Option A.** A declarative `dispositions: ClaimSeed[]` field on `BehavedMixin`, seeded in `BehavedMixin.postRegister` via `TraitApi.seedClaims` (idempotency-guarded). The behavior → trait edge is accepted (the demonstrator brain already establishes it this build). No backend seeder.
- **A8 — RESOLVED: build the cast picks in 5.3 as written.** Mara/Remy are slate-pinned; Sloane/Augie/Dave use the readings in 5.3 — the user will redline in-world after the demo if a personality reads wrong.
- **A9 — RESOLVED: new `converses` brain.** Do not modify the shipped `random-chatter`.
- **A10 — RESOLVED: `cmd/charactergen/traits.yaml`** (with `chronicle`/`competence`).
