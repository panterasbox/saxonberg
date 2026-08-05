# Ranged — Wave 1 plan: thrown effect-carriers + the minimum spine

Implementation plan for `build/ranged`, driving against
[ranged-requirements.md](../requirements/ranged-requirements.md).

**Covers D1, D2, D3, D4, D5, D7, D11, D13 (muscle branch), D14, D15,
D17/D18 (the commit gate), D37, D43.** Everything else defers to Waves
2–4, rostered in §10 so this doc doubles as the roadmap.

---

## 1. Prerequisites — read this first

### 1.1 The branch dependency (blocking)

Every magic-side seam this wave consumes exists **only on
`build/magic-items`** (worktree `/home/bobalu/play/saxonberg/build-3`,
~20 commits ahead of `origin/master`, plus uncommitted work, unmerged):

| Seam | File (build-3 only) |
|---|---|
| `MagicLogic.deliverAt` — the ranged-integration seam | `packages/server/src/mud/obj/api/MagicLogic.ts:923` |
| `EffectContext` (origin / actor / source split) | `packages/server/src/mud/lib/magic/EffectContext.ts` |
| `PotableMixin` + `POTION_ROUTES` | `packages/server/src/mud/lib/magic/Potable.ts` |
| `Dose` / `DOSE_RESPONSES` / `Dose.scaleFor` | `packages/server/src/mud/lib/magic/Dose.ts` |
| `PotionMaterial` | `packages/server/src/mud/obj/material/PotionMaterial.ts` |
| The potion roster + flask | `packages/content/base-library/content/obj/material/potion/veiling-draught.yaml`, `packages/server/src/mud/seeds/obj/items/flask-of-veiling.yaml` |
| `MagicApi.discharge` / `DischargeOptions` | `packages/server/src/mud/api/magic.ts`, `MagicLogic.ts:130` |

> **`build/ranged` MUST rebase onto `build/magic-items` (or wait for its
> merge to master) before ANY Wave 1 code starts.** Phases P7 and P8
> modify files that do not exist on `origin/master`. Starting before the
> rebase guarantees a conflict-heavy re-do of the magic seam.

**Worktree discipline** ([CLAUDE.md § Worktrees](../../CLAUDE.md)): four
worktrees share one bare repo. Do **not** check out `build/magic-items`
from build-2 — build-3 holds it, and two worktrees on one branch has
caused data loss twice in this repo. Read build-3 source read-only; run
`./tools/wt-status` first every session; stage by name, never
`git add -A`.

### 1.2 The one shipped-doc correction

[hazard.md](../subsystems/hazard.md) is explicit: **there is no
`HazardApi` / `HazardLogic`** (verified — neither file exists). A hazard
is self-resolving and reached through its own methods. Wave 1 therefore
rides `CombatApi` + `MagicApi` only, and touches hazard through
`HazardDelivery` / `HazardMixin` methods directly (the methods-only
inter-Stuff contract). Do not mint a `HazardApi` to "match" the other
two.

---

## 2. The Wave 1 cut — and why it cuts there

A thrown carrier needs, irreducibly: a **band** to cross (D1), an
**arena** that says whether a band gap exists (D3/D4), a way to
**contest** the gap (D5), an **outcome** (D7), a **profile** the payload
rides (D11), a **splash rule** (D14), a **consent gate** (D14/D17/D18),
an **opening band** (D37), the two **payload seams** (D15), and a
**verb** (D43). That is exactly the list below. Anything not on it is
out.

### 2.1 In scope

| D | What lands in Wave 1 |
|---|---|
| **D1** | `RangeState` widened `"reach"\|"close"` → `close\|reach\|near\|far`, with the full consumer audit (§5) |
| **D2** | Bands stay symmetric per pair, no composition — asserted, not re-derived |
| **D3** | Arena cap derived from room linear extent, `combat.range.*` dials |
| **D4** | Per-location optional extent override, persistent + authorable |
| **D5** | `fight advance` / `fight withdraw` gambits; the shipped `close` gambit generalizes into `advance` |
| **D7** | The **full pure aim×answer matrix** as a value-object (every cell unit-tested); only the `snap` row + `stand`/`move`/`drop` answers wired (justified in §2.3) |
| **D11** | `DeliveryProfile` with `channel` · `energy` · `stability` · `payload` · `integrity` (`penetration` deferred, §9) |
| **D13** | `energySource` vocabulary + the readiness projection, pure and fully tested; only the `muscle` branch has a live carrier |
| **D14** | Splash = target + everyone at `close` to target; magnitude via `Dose`; consent gate over the whole set |
| **D15** | `HazardRange` gains `'ranged'` (vocabulary + contact guard); `MagicLogic.deliverAt` swaps to the band model |
| **D17/D18** | The commit-time consent gate (the ND leg itself defers with guns) |
| **D37** | Opening band = arena max; ambush opens at `close` (rides the shipped `CombatOpenOptions.ambush`) |
| **D43** | `throw` standalone verb; throwing *at* a sentient runs the same terms handshake as `attack` |

### 2.2 Explicitly out (with their wave)

Guns entirely (D29–D36) → W4. Bows/crossbows/archery, the graded-fit
half of D12, readiness actions D16, elasticity D42 → W3. Cover D25/D27 →
W2. Armor D21 → W2. Less-lethal D19/D20 → W3. Acoustics D24 → W3.
Readout ladder D22/D23 → W3. Formations D38 → W2. NPC brains
D39/D40/D41 → W3. Fast-wear axis D31 → W4. Full roster in §10.

Two further deferrals settled with the user (§9): **D14's lingering
residue hazard** and **the `vapour` route** both go to W2. Wave 1's
potion roster is `contact`-route only; a thrown `oral` or `vapour`
potion is an honest wasted flask, not a stub.

**D13 is *introduced*, not *exercised*.** `EnergySource` ships as a
closed vocabulary with a pure readiness projection, unit-tested across
all three members. Only `muscle` (thrown, instantaneous readiness, aim
*is* the throw) has a carrier in Wave 1. `stored-elastic` and `chemical`
get their carriers in W3/W4. Shipping the vocabulary now is cheap and
stops W3 retrofitting an axis across an established launcher model.

### 2.3 Two cut decisions that need justifying

**(a) D7 — full matrix, reduced wiring.** A thrown flask can only ever
commit `snap` (D13: for `muscle`, aim *is* the throw), and two of the
five answers need machinery that defers (`cover` → D25, `counter` → the
reactive window, W2). Shipping only the reachable row would leave the
matrix *shape* unproven until W3, which is precisely the shape most
likely to be wrong. But the matrix is a **pure value-object** — every
cell and every step modifier is testable with no carrier at all, which
is literally what **AC 8** demands. So: ship the whole table, unit-test
the whole table, wire the reachable subset. `cover` resolves as `stand`
until D25 lands (documented in the value-object, pinned by a test that
will fail loudly when cover arrives). `counter` is unreachable in Wave 1
and asserted as such.

**(b) D14 — splash fires immediately; the *lingering* residue hazard
defers.** D14's sentence "the arrival creates a placed hazard through
the shipped self-resolving `HazardMixin`" describes a caustic pool that
harms the *next* person through. Wave 1 resolves the splash at arrival
(dose-scaled discharge per victim) and spills the remainder onto the
floor through the **shipped** `BulkableApi.floorSurfaceNear` path — the
same path `pour` already uses, which is what "spills its contents onto
real surfaces" means in the Goals. A persistent residue hazard needs a
lifetime/expiry model traps do not have (hazard.md: one-shot v1,
"resettable/rearming traps" deferred). **Confirmed deferred to W2 —
§9 Q1.**

---

## 3. Design decisions taken (resolve these from the plan, don't re-litigate)

### 3.1 `RangeBand` is a new value-object; `RangeState` keeps its name

New module `lib/combat/RangeBand.ts` (category: **Named value-object /
vocabulary**) owns `RANGE_BANDS = ['close','reach','near','far']`
(ascending) and `export type RangeState = (typeof RANGE_BANDS)[number]`.
`lib/combat/CombatGraph.ts` **re-exports the type**
(`export type { RangeState } from './RangeBand'`), so **all seven
existing import sites keep working unchanged** and the widening lands as
one line plus an audit rather than an import sweep.

`RangeBand` statics (pure, config-injected, seeded-literal fallback —
the `WeaponProfile` precedent):

- `rank(b): number`, `at(rank): RangeState`, `isMelee(b): boolean`
  (`close`/`reach` only)
- `step(b, n): RangeState` (clamped) — the advance/withdraw primitive
- `maxForExtent(metres, config): RangeState` — D3's table
- `beyond(band, envelope): boolean` — "is this past the carrier's
  effective band"

**Naming discipline:** `ReachClass = "short"|"medium"|"long"`
(`lib/combat/WeaponProfile.ts:41`) is a *different concept* — a banded
projection of authored weapon length. No band is named `short`. The
audit (§5) includes a grep confirming no conflation.

### 3.2 The arena cap reads a new `Location.getLinearExtent()`

- `lib/stuff/Location.ts` gains `getLinearExtent(): number | null`
  returning `null` (base, topology-agnostic — beside the existing
  `getSizeScale()`).
- `lib/location/CartesianLocation.ts` gains the D4 override:
  persistent+authorable `extent` field (`_extent` backing slot,
  `getExtent`/`setExtent`, `fieldMeta` entry beside the shipped
  `coords`), and `getLinearExtent()` returns
  `this._extent ?? this.getZone()?.getCellSize() ?? null`.
- `obj/location/SphericalLocation.ts` overrides `getLinearExtent()` →
  `2 × radius` (the diameter is the honest linear extent). Spherical
  rooms need no new field (D4).

**Deliberate consequence:** `CartesianLocation.getSizeScale` /
`getVolume` / `getCeilingHeight` (lines 153/163/173) are re-pointed
through `getLinearExtent()`. Absent an override this is
**byte-identical** (it still reads `cellSize`); *with* an override,
light and atmosphere move too — which is correct (a 20 m hall should
read dimmer for the same flux) and is the whole reason room extent is
one number rather than two. Pinned by a test asserting byte-parity with
no override and a measurable lux/volume change with one.

### 3.3 The graph's `close` fallback stays; a location-aware read is added

`CombatGraph.rangeBetween` defaults to `close` for an unknown pair
(`CombatGraph.ts:121`), pinned by
`lib/combat/__tests__/CombatGraph.test.ts:122`. With four bands that
default is semantically wrong for two unengaged fighters in a 20 m yard
— but `CombatGraph` is a pure value-object with no location knowledge
and **must not gain any**. So the fallback stays as documented
value-object behaviour, and `CombatLogic` gains the location-aware read:

```
CombatApi.bandBetween(a, b): RangeState
  // live edge in a shared session → graph.rangeBetween
  // else co-present → RangeBand.maxForExtent(location extent)
  // else → null (not co-present; cross-room fire is out of scope, D26)
```

Everything outside the graph asks `bandBetween`, never `rangeBetween`.

### 3.4 `advance` generalizes the shipped `close` gambit

`CombatLogic.resolveClose` (`obj/api/CombatLogic.ts:647`) already
implements a tempo-costed, poise-costed, *contested* one-step band
change with a composed-holder veto. `advance` **is** that function with
`graph.setRange(a, b, 'close')` replaced by
`RangeBand.step(current, -1)`. `withdraw` is the same shape stepping
`+1`, per-edge (D6), refused at the arena cap (AC 5). The `close` verb
is kept as an alias key onto `advance` so the shipped `combatant` brain,
`fight close`, and the `Gambit.get("close")` narration lookups keep
working.

### 3.5 Payload magnitude is `Dose`, and nothing else

The primary target takes a placement-scaled fraction of the flask's
litres; each splash victim takes a bystander fraction; the remainder
spills to the floor slot, **volume-conserving** (litres are real).
`Dose.scaleFor(spec, litres)` then does the rest — a `graded` effect
scales down honestly, a `threshold` effect may honestly not fire on a
bystander. **Do not invent a splash-magnitude rule.** Dials:

```
combat.range.splash.primaryFraction    0.60   # at `hit`
combat.range.splash.preciseFraction    0.85
combat.range.splash.grazeFraction      0.30
combat.range.splash.bystanderFraction  0.15
```

### 3.6 A thrown flask's payload must issue from the landing point

**This is the load-bearing detail, and the answer is yes.**
`MagicLogic.deliverAt` measures reachability from `ctx.origin`;
`PotableMixin.dischargeInto` fires via
`MagicApi.discharge(material, drinker)`, and a `Material` singleton has
no place of its own, so the context "issues from wherever the actor is"
— i.e. from the **thrower**, who is at `near`. A `close`-envelope
contact payload would then refuse.

Fix, minimally and in the shape the code already has:

- `DischargeOptions` (`obj/api/MagicLogic.ts:130`) gains
  `readonly origin?: Stuff` — "where this working issues from, when it
  is not the item." Exactly the sibling of the shipped `source?: Stuff`,
  and exactly the field `EffectContext` already separates.
- `EffectContexts.forItem` honours it.
- `Potable.dischargeInto(drinker, litres)` →
  `dischargeInto(drinker, litres, opts?: { origin?: Stuff })`, passed
  straight through. Default `undefined` ⇒ shipped behaviour
  byte-identical (pinned).
- The throw path passes `{ origin: victim }` — a contact delivery issues
  from the point of contact, so the band reads `close` by construction.

`dischargeInto`'s self-only narration stays untouched (magic-items
rationale: a watcher must not learn your potion's class by standing
nearby). The **throw path narrates its own scene beat** — the flask
shattering, the splash — through `MessageApi.scene`, which is the
per-viewer combat-narration pattern.

### 3.7 `deliverAt` gains a band envelope, and shipped spells are unchanged

New body:

1. Same-scene check **kept** (cross-room fire is out of scope, D26 —
   this is what makes an exit genuinely safe).
2. `band = CombatApi.bandBetween(ctx.origin, target)`;
   `origin === target` ⇒ `close` (nothing is closer to you than you).
3. Refuse when `RangeBand.beyond(band, envelope)`.
4. `envelope` is a new optional parameter defaulting to the
   `combat.range.spellEnvelope` dial, seeded `far` — so **every shipped
   spell behaves exactly as today** and AC 27 ("no change to the spell
   roster") is literally true. The thrown contact payload passes
   `close`; W3's bow passes `far`; W4's sidearm passes `near`.

Refusal prose stays legible and replaces *'Your reach ends at the scene
before you.'* only on the new band branch.

### 3.8 The consent gate — precise rule

The shipped model *permits* attacking the unwilling (that is what the
`consented: false` crime marker is for). So the gate cannot mean "refuse
all non-consented harm," or it would forbid crime. The honest
distinction is **deliberate vs collateral**:

- **The primary target** runs the ordinary terms handshake (reconcile →
  prompt a live defender → impose on an NPC with the `consented: false`
  marker). Allowed. This is AC 47.
- **Every *other* member of the splash set that is sentient** must
  already stand under terms in force with the thrower that permit this
  harm — a live edge in a shared session whose terms they consented to,
  or standing terms that reconcile `agreed`. Otherwise **refuse at
  commit**: nothing is thrown, no poise spent, no session opened,
  legible refusal.

Non-sentients never gate. This closes AC 25 (the
consenting-duelist-clinched-with-a-bystander case), AC 31, and —
critically — "area delivery must not be a cheaper route to a person than
aiming at them."

Surface:
`CombatApi.mayDeliverTo(thrower, victims): { ok: true } | { ok: false, refusedBy: Stuff }`
on `CombatLogic`. D17's ND leg reuses it verbatim in W4.

### 3.9 `throw` lives in the `inventory` category, afforded by `ContainerMixin`

Throwing operates through **containment** — an item leaves your hands
under force and lands somewhere — and ranged combat is a *consumer* of
that. Precedent supports it: `disarm` (a trap) went to `device` because
"operating a mechanism" is the substrate, and `drink` went to `bulk`
even though potions are magic. The category names the substrate, not the
drama.

So: `cmd/inventory/throw.yaml` +
`obj/command/inventory/ThrowController.ts`, contributed by
`ContainerMixin.commandContributions.self` alongside `drop`/`put`/`give`
(`lib/spatial/Container.ts:270-280`). This is what makes D43's "works
outside combat" free — a Container can throw; being a Combatant is not
required.

Parse shape (the `give`/`put` precedent):

```yaml
args:
  - name: item      # scope: inventory, mustBeInInventory
  - name: target    # required: false, prepositions: [at], scope: ["$focus","reachable"]
```

`throw <item>` (no `at`) is the throw-away parse: a ballistic
relocation, no session, no gate. `throw <item> at <target>` is
initiation. AC 47's "distinct parses" is the presence of the `at`
binding, not a second verb.

### 3.10 The initiation handshake is extracted onto `CombatApi`

D43: "`throw` at a sentient … routes exactly as `attack` does." Today
that whole sequence lives inside
`obj/command/combat/AttackController.ts` — `standingTerms` (line 65),
`resolveConflict` prompt (222), `snapshotBands` (288), `warmFormations`
(278), `resolveAmbush` (264), and the open/join/merge handshake
(172-200). Duplicating ~150 lines into `ThrowController` is exactly the
drift D43 warns against, and "identically" would be a claim rather than
a fact.

**Extract it**:
`CombatApi.initiate(initiator, target, proposal, opts?)` →
`CombatLogic.initiateImpl`, returning
`{ ok, terms, consented, session, reason? }`. It does the handshake, the
band snapshot, the formation warm, the ambush read, and the
open/join/merge dispatch. `AttackController` is refactored onto it and
becomes ~60 lines; `ThrowController` calls the same method. Pinned by a
byte-parity regression over the shipped `AttackController` tests.

`PromptApi.choice` from a logic singleton is legitimate — it is gated
cross-object orchestration, which is what the logic tier is for.

---

## 4. Phases

Each phase is independently verifiable:
`pnpm build && pnpm test && pnpm lint` plus the phase's own assertions.
Phases P1→P2→P3 are strictly sequential; **P4 and P6 can run in parallel
with them**; P5 needs P1; P7 needs P1+P2; P8 needs everything.

### P0 — Rebase (blocking, no code)

Rebase `build/ranged` onto `build/magic-items`, or wait for its merge to
master. Verify
`packages/server/src/mud/lib/magic/{Potable,Dose,EffectContext}.ts` and
`obj/material/PotionMaterial.ts` are present in build-2 before writing a
line.

### P1 — The band ladder + the widening audit (D1, D2)

Create `RangeBand`. Re-export the type from `CombatGraph`. Run the audit
(§5) and re-derive **every** binary read. No new behaviour beyond the
re-derivations — the opening band is still the shipped reach heuristic
until P3.

**Done when:** four-member vocabulary; the gym passes unchanged; the
audit checklist is fully struck; AC 1, AC 2.

### P2 — Room extent + the arena cap (D3, D4)

`Location.getLinearExtent()`, `CartesianLocation.extent` + `fieldMeta`,
`SphericalLocation` override, `RangeBand.maxForExtent`, the
`combat.range.nearMetres`/`farMetres` dials. Re-point
`getSizeScale`/`getVolume`/`getCeilingHeight`.

**Done when:** 3 m/6 m/20 m derivation tested; an extent override
persists and round-trips; no-override byte-parity for light/atmosphere
pinned. AC 3, AC 4.

### P3 — Opening band + advance/withdraw (D37, D5)

Replace `openingRangeFor` with arena-max (ambush ⇒ `close`, reading the
shipped `CombatOpenOptions.ambush`). Generalize `resolveClose` →
`resolveBandStep`; add the `advance`/`withdraw` `GambitSpec`s; wire the
`fight` subcommands; re-baseline the gym.

> ⚠ **This changes shipped melee.** Today dagger-vs-dagger opens `close`
> and spear-vs-dagger opens `reach` (`CombatLogic.ts:577` —
> `reachRankOf(a) !== reachRankOf(b) ? "reach" : "close"`). Under D37
> every fight opens at the arena's max — in a default 3 m room that is
> `reach` for everyone. The treeline cull and the hollow duel now start
> with an approach beat. That is what D37 asks for and it is playable
> (`advance` exists), but the gym's win-rate baselines and several
> `CombatLogic.test.ts` assertions move. Budget for the re-baseline; do
> not paper over it. **Confirmed with the user — §9 Q3.** Re-derive the
> expected values honestly; never relax an assertion to make it pass.

**Done when:** AC 5, AC 52 (the ambush half), gym green on a re-derived
baseline.

### P4 — The pure value-objects (D11, D13, D7) — *parallelizable*

`DeliveryProfile`, `EnergySource`, `AimResolution`. Zero wiring; three
unit-test files. This is where the shapes get proven cheaply.

**Done when:** AC 8 (every matrix cell + every step modifier), AC 9
(competence changes no placement), AC 14 (the wound path cannot
distinguish two carriers at equal profiles), `energySource`'s three
branches tested.

### P5 — Splash set + the consent gate (D14, D17/D18)

`CombatApi.splashSetFor(target)`,
`CombatApi.mayDeliverTo(thrower, victims)`. Pure graph + terms reads on
`CombatLogic`; no verb yet.

**Done when:** AC 24, AC 25, AC 31.

### P6 — The initiation extraction (D43 half) — *parallelizable*

`CombatApi.initiate`; `AttackController` refactored onto it with a
byte-parity regression.

**Done when:** the whole shipped `AttackController` test file passes
unchanged against the refactored controller.

### P7 — The two payload seams (D15)

`HazardRange` widening + `isRanged()` + the `resolveTraversal` contact
guard. `deliverAt` band model + envelope. `DischargeOptions.origin`.
`Potable.dischargeInto` opts.

**Done when:** AC 26, AC 27; every shipped magic test green (the
envelope default is `far`).

### P8 — The `throw` verb, the carrier, the demonstrator (D43)

`CombatApi.deliverThrown(thrower, item, target, placement)` on
`CombatLogic`; `throw.yaml` + `ThrowController` + its seed; the
`ContainerMixin` affordance; the content (blistering draught, its flask,
the long meadow); the glass material's missing `hardness`/`toughness`.

**Done when:** AC 23, AC 46, AC 47, and the §8 live drive runs end to
end.

### P9 — Docs, lints, drive

`docs/subsystems/ranged.md` (new, source of truth); seam edits to
`combat.md`, `hazard.md`, `magic.md`, `location.md`, `zone.md`,
`materials-response.md`, `accountability.md`, `command-spec.md`. Full
lint family. The live drive.

**Done when:** AC 55 (Wave 1 slice), AC 56.

---

## 5. The `RangeState` widening audit

**This is real work with a named discovery step, not a footnote.**
Growing a closed vocabulary 2→4 is a breaking change *by design*; the
compiler will catch almost none of it, because every consumer is a
`===`/`!==` comparison rather than an exhaustive `switch`.

### 5.1 Discovery (run these, record the output in the MR)

```bash
cd /home/bobalu/play/saxonberg/build-2/packages/server
grep -rn "RangeState" src --include="*.ts"
grep -rn "rangeBetween\|setRange\|\.range\b\|ThreatEdge" src --include="*.ts"
grep -rn "'close'\|'reach'" src --include="*.ts" | grep -v ReachClass
grep -rn "ReachClass\|REACH_CLASSES\|reachRank" src --include="*.ts"   # confirm NO conflation
grep -rn "range\|reach\|close" src/mud/lib/combat/CombatNarration.ts src/mud/lib/combat/CombatFlavor.ts
grep -rn "reach\|close\|range" ../../docs/subsystems/combat.md
```

### 5.2 The verified consumer list, and what each needs

| # | Site | Today | Wave 1 |
|---|---|---|---|
| 1 | `lib/combat/CombatGraph.ts:29` | type decl | move to `RangeBand.ts`; re-export type here |
| 2 | `CombatGraph.ts:26-28, 39-41` | docstrings say "two melee tiers" | rewrite for four bands; keep the symmetry sentence verbatim (D2) |
| 3 | `CombatGraph.ts:102` | `range: range ?? "close"` | keep as the value-object's inert default; `CombatLogic` always passes explicitly |
| 4 | `CombatGraph.ts:110-115` `setRange` | symmetric per pair | **unchanged** — D2 keeps it |
| 5 | `CombatGraph.ts:119-123` `rangeBetween` | falls back `close` | **unchanged**; add `CombatLogic.bandBetween` as the location-aware read (§3.3) |
| 6 | `CombatLogic.ts:577` `openingRangeFor` | reach-differs heuristic | **deleted**; replaced by arena-max + ambush (P3) |
| 7 | `CombatLogic.ts:599` `reachAdvantage` | `range === "reach" ? diff : -diff` | **three-way**: `reach`→`+diff`, `close`→`−diff`, `near`/`far`→ 0 **and a melee strike cannot land at all** — a new out-of-range branch beside the shipped `REACH_OUT_OF_RANGE_GAP` whiff |
| 8 | `CombatLogic.ts:647,660` `resolveClose` | binary flip to `close` | generalize to `RangeBand.step(current, −1)` (P3) |
| 9 | `CombatLogic.ts:692` `rangeStandingImpl` | passes through | type widens; the `fight` status prose gains two band words |
| 10 | `CombatLogic.ts:710` `resetReachOnDefend` | `edge.range !== "close"` → push to `"reach"` | must apply **only** between `close` and `reach`; a `near`/`far` pair is not pushed further out |
| 11 | `CombatLogic.ts:1128` `pickSustained` | `if (rangeBetween(...) === "close") seedRange(...)` | ⚠ **latent bug the widening exposes — verified.** `=== "close"` is used as a "no edge yet" sentinel, but it sits immediately after `graph.addEdge(...)`, which creates the edge defaulting to `"close"`, and there is **no `edgeBetween` guard**. A genuinely-close pair is re-seeded today. Replace with an explicit `graph.edgeBetween(...)` check. Fix, test, note in the MR. |
| 11b | `CombatLogic.ts:1147` `engageToward` | same `=== "close"` pattern | **already guarded** by `if (!graph.edgeBetween(...))`, so the inner check is redundant-but-harmless. Tidy it for symmetry; not a bug. |
| 12 | `api/combat.ts:25,108` | `RangeStanding.range: RangeState` | type flows; no code change |
| 13 | `lib/combat/WeaponProfile.ts:41-43` | `ReachClass`/`REACH_CLASSES` | **untouched** — a different concept. The audit asserts no band is named `short` and nothing indexes one vocabulary with the other's rank. |
| 14 | `lib/combat/__tests__/CombatGraph.test.ts:105-124` | 2-band assertions | extend to 4 bands + a `near`/`far` symmetry case; keep the `close`-fallback assertion at 122 |
| 15 | `obj/api/__tests__/CombatLogic.test.ts:828,834,852,890,900,908,910,923,924,2103,2111` | opening/close-gambit assertions | re-derive against arena-max opening (P3). Expect ~10 assertion edits, not rewrites. |
| 16 | `scripts/combat-gym.ts` + `scripts/__tests__/combat-gym.test.ts` | balance baseline | re-baseline after P3; the approach beat shifts win rates |
| 17 | `docs/subsystems/combat.md:616-623, 802-814` | "`reach \| close` state" prose | rewrite at the seam; point at `ranged.md` |

### 5.3 Ordering

1. Add `RangeBand.ts` with the four members but **do not change any
   behaviour** — `pnpm build` will be green because nothing switches
   exhaustively.
2. Work rows 6–11 one at a time, each with its own test, so a regression
   bisects to one read.
3. Rows 14–16 last, once behaviour is settled.
4. Row 13 is a *confirmation* pass, not an edit.

**The honest risk:** because the compiler catches nothing, row-by-row
discipline plus the greps in §5.1 *are* the safety net. A "widen the
type and fix what breaks" approach will ship silently wrong melee.

---

## 6. File-by-file manifest

Paths are repo-relative. Category names are
[CLAUDE.md](../../CLAUDE.md)'s taxonomy.

### 6.1 New files

| Path | Category | Holds |
|---|---|---|
| `packages/server/src/mud/lib/combat/RangeBand.ts` | Named value-object / vocabulary | `RANGE_BANDS`, `RangeState`, `RangeBand` statics (`rank`/`at`/`isMelee`/`step`/`maxForExtent`/`beyond`), `RangeBandConfig` + seeded default |
| `packages/server/src/mud/lib/combat/DeliveryProfile.ts` | Named value-object | D11: pure derive from `{energySource, massKg, speedMs, channel, material props, payload, band, envelope}` → bands (`stability`, `integrity`) + narrow numerics (`energyJ`, `stabilityStep`) + `toInflictSpec(target, siteSelector)`; `DeliveryProfileConfig` + seeded default |
| `packages/server/src/mud/lib/combat/AimResolution.ts` | Named value-object / vocabulary | D7: `AIM_LADDER`, `RANGE_ANSWERS`, `PLACEMENTS`, the base matrix, `AimResolution.resolve(aim, answer\|null, modifiers, config)`; the no-answer→`precise` rule |
| `packages/server/src/mud/lib/combat/EnergySource.ts` | Named value-object / vocabulary | D13: `ENERGY_SOURCES = ['muscle','stored-elastic','chemical']`, `EnergySource` statics (`holdsFree`, `readinessIsInstantaneous`, `poisePerBeatHeld`) |
| `packages/server/src/mud/lib/combat/__tests__/RangeBand.test.ts` | test | ladder + extent derivation |
| `.../__tests__/DeliveryProfile.test.ts` | test | AC 14, integrity/stability bands |
| `.../__tests__/AimResolution.test.ts` | test | AC 8 — every cell, every modifier |
| `.../__tests__/EnergySource.test.ts` | test | all three branches |
| `packages/server/src/mud/cmd/inventory/throw.yaml` | Command YAML | the `throw` view (§3.9 shape) |
| `packages/server/src/mud/obj/command/inventory/ThrowController.ts` | Controller | command machinery only: resolve, route gate, gate→initiate→deliver, prose |
| `packages/server/src/mud/seeds/obj/command/inventory/ThrowController.yaml` | Command seed | controller row |
| `packages/server/src/mud/obj/command/inventory/__tests__/ThrowController.test.ts` | test | AC 46/47 behaviour (**not** verb shape — §7.1) |
| `packages/server/src/mud/obj/api/__tests__/CombatLogic.range.test.ts` | test | arena cap, opening band, advance/withdraw, `bandBetween`, splash set, consent gate |
| `packages/server/src/mud/obj/api/__tests__/CombatLogic.thrown.test.ts` | test | AC 23/24/25 end-to-end at the Api layer |
| `packages/content/base-library/content/obj/material/potion/blistering-draught.yaml` | Content (material) | `class: /obj/material/PotionMaterial`, `route: contact`, `carriedSpellPath: /obj/magic/Spell/firebolt`, `dose: {response: graded, referenceLitres: 0.25}` |
| `packages/server/src/mud/seeds/obj/items/flask-of-blistering.yaml` | Content (item) | `class: /obj/Receptacle`, glass, 0.25 L of the above (the `flask-of-veiling` shape) |
| `packages/server/src/mud/seeds/domain/newbie-wilds/crossroads/longmeadow.yaml` | Content (room) | `extent: 12` — arms `near`; the D4 demonstrator |
| `docs/subsystems/ranged.md` | Doc | AC 55 — the source of truth, Wave 1 slice + the deferred roadmap |

### 6.2 Modified files

| Path | Category | Change |
|---|---|---|
| `packages/server/src/mud/lib/combat/CombatGraph.ts` | Named value-object | re-export `RangeState` from `RangeBand`; docstrings for four bands; keep `setRange`/`rangeBetween` semantics |
| `packages/server/src/mud/obj/api/CombatLogic.ts` | Api logic singleton | audit rows 6–11; new module-private `arenaMaxBandFor`, `bandBetween`, `resolveBandStep`, `splashSetFor`, `mayDeliverTo`, `initiateImpl`, `deliverThrownImpl`; the `combat.range.*` config builder |
| `packages/server/src/mud/api/combat.ts` | Api | new thin statics: `bandBetween`, `arenaMaxBandFor`, `splashSetFor`, `mayDeliverTo`, `initiate`, `deliverThrown`; re-export `RangeState`/`DeliveryProfile` types |
| `packages/server/src/mud/lib/combat/Gambit.ts` | Named value-object / vocabulary | `advance` + `withdraw` specs; `close` kept as an alias key onto `advance` |
| `packages/server/src/mud/cmd/combat/fight.yaml` | Command YAML | `advance` / `withdraw` subcommands + help; `close` help re-pointed |
| `packages/server/src/mud/obj/command/combat/FightController.ts` | Controller | add `advance`/`withdraw` to the `GAMBITS` set (line 33) |
| `packages/server/src/mud/obj/command/combat/AttackController.ts` | Controller | refactor onto `CombatApi.initiate` (P6) |
| `packages/server/src/mud/lib/stuff/Location.ts` | Stuff class (lib) | `getLinearExtent(): number \| null` base, beside `getSizeScale()` |
| `packages/server/src/mud/lib/location/CartesianLocation.ts` | Stuff class (lib) | `extent` field + `fieldMeta` + accessors; `getLinearExtent()`; re-point `getSizeScale`/`getVolume`/`getCeilingHeight` |
| `packages/server/src/mud/obj/location/SphericalLocation.ts` | Stuff class | `getLinearExtent()` → `2 × radius` |
| `packages/server/src/mud/lib/spatial/Container.ts` | Mixin | add `'inventory/throw.yaml'` to `commandContributions.self` (line 270) |
| `packages/server/src/mud/lib/hazard/HazardDelivery.ts` | Named value-object | `HazardRange = 'contact' \| 'ranged'`; `isRanged()`; docstring — seam is now live |
| `packages/server/src/mud/lib/hazard/Hazard.ts` | Mixin | `resolveTraversal` early-returns for a `'ranged'` delivery (walking into it does not spring it) |
| `packages/server/src/mud/obj/api/MagicLogic.ts` | Api logic singleton | `deliverAt` band model + `envelope` param; `DischargeOptions.origin`; `EffectContexts.forItem` origin override |
| `packages/server/src/mud/lib/magic/EffectContext.ts` | Named value-object | `forItem` honours an explicit origin |
| `packages/server/src/mud/lib/magic/Potable.ts` | Mixin | `dischargeInto(drinker, litres, opts?)` pass-through |
| `packages/server/src/mud/lib/config/AppSettings.ts` | Named value-object / vocabulary | the `combat.range.*` key constants |
| `packages/server/src/mud/config/app-settings.yaml` | Config data | seeded values (§6.3) |
| `packages/content/base-library/content/obj/material/glass/*.yaml` | Content (material) | add `hardness` / `toughness` — the glass row authors neither today, so vessel breakage would derive from zeros |
| `packages/server/src/mud/seeds/domain/newbie-wilds/crossroads/treeline.yaml` | Content (room) | one outbound exit to the long meadow (fresh-DB path; see §7.4) |
| `packages/server/src/mud/lib/combat/__tests__/CombatGraph.test.ts` | test | four-band coverage |
| `packages/server/src/mud/obj/api/__tests__/CombatLogic.test.ts` | test | re-derived opening-band assertions |
| `packages/server/scripts/combat-gym.ts` + `scripts/__tests__/combat-gym.test.ts` | Dev tool | re-baseline after P3 |
| `docs/subsystems/{combat,hazard,magic,location,zone,materials-response,accountability,command-spec}.md` | Docs | seam updates pointing at `ranged.md` |

### 6.3 New AppSettings (`combat.range.*`, the `combat.poise.*` convention)

```
combat.range.nearMetres              6
combat.range.farMetres               20
combat.range.advanceCost             0.18     # mirrors combat.reach.closeCost
combat.range.withdrawCost            0.22
combat.range.contestStrength         0.5      # mirrors combat.reach.contestStrength
combat.range.spellEnvelope           far      # keeps shipped spells byte-identical
combat.range.thrownEnvelope          near
combat.range.throwSpeedMs            12
combat.range.throwRefMassKg          0.4
combat.range.integrityShatterToughness   1.0   # MJ/m³ below → shatter
combat.range.integrityDeformHardness     80    # MPa below → deform
combat.range.matrix.snap             "hit,graze,graze,miss,graze"
combat.range.matrix.held             "hit,hit,graze,graze,hit"
combat.range.matrix.settled          "precise,hit,hit,graze,hit"
combat.range.step.poorStability      -1
combat.range.step.beyondEffective    -1
combat.range.splash.primaryFraction   0.60
combat.range.splash.preciseFraction   0.85
combat.range.splash.grazeFraction     0.30
combat.range.splash.bystanderFraction 0.15
```

> **One deviation from the requirements' letter, flagged.** D7 says
> "matrix cell values … are `AppSettings` dials." Fifteen keys for a 3×5
> table is unreadable; one key per **aim row**, ordered by
> `RANGE_ANSWERS`, is three keys, is still a dial, and reads like a
> table in the YAML. Every value-object keeps its seeded literal
> fallback so `AimResolution` unit-tests without booting settings.

### 6.4 Category check

Every new file lands in an existing category. **Nothing here needs a new
module category.** The only borderline call is `throw`'s command
category (§3.9), which is a placement decision inside the existing
`inventory` category, not a new category — surfaced in §9 for a one-line
confirm.

---

## 7. Test strategy per phase → ACs

### 7.1 The binder caveat (say this out loud in the MR)

**Controller tests in this repo skip the YAML binder.** They hand the
controller a pre-built model and a `CommandContext`, so they prove the
*controller body* and prove **nothing** about verb shape: whether
`throw flask at the wolf` parses, whether `prepositions: [at]` binds,
whether the optional second arg makes the throw-away parse reachable,
whether `mustBeInInventory` rejects a *wielded* flask, or whether the
affordance actually reaches a player.

This is the exact gap
[antipatterns.md § Testing the layer you wrote instead of the layer a
player reaches](../antipatterns.md) documents (four defects, all in this
gap, all invisible to a green suite). Its three reachability questions
applied here:

1. **Is the class composed?** Assert
   `ContainerMixin(Thing).commandContributions.self` contains
   `'inventory/throw.yaml'`.
2. **Is the verb contributed?** Same assertion — that seam is the only
   route.
3. **Is the content in the world?** `SeederManager` is insert-only; an
   *edited* seed never reaches an already-seeded world.

**Must be live-driven, cannot be suite-proven:**

- `throw flask at the wolf` parses and binds both args
- `throw flask` (no `at`) resolves as the throw-away parse
- `throw` is offered to a player at all
- a **wielded** flask can be thrown (or is rejected legibly)
- the room extent override reaches a live room (insert-only)
- `fight advance` / `fight withdraw` bind as subcommands
- the demonstrator's prose reads as intended

### 7.2 Per-phase

| Phase | Tests | ACs closed |
|---|---|---|
| **P1** | `RangeBand.test.ts` (ladder, `step` clamping, `isMelee`); `CombatGraph.test.ts` extended — symmetry across four bands, the `close` fallback pinned, **a crowd holding geometrically impossible band combinations** (A `far` from archer, B `close` to archer, A `close` to B) with no composition; the row-7/10/11 regressions | **1, 2** |
| **P2** | `RangeBand.maxForExtent` at 3 / 6 / 20 m; `CartesianLocation` extent round-trip through the Hydrator; zone fallback with no override; byte-parity for `getSizeScale`/`getVolume` with no override + a measurable change with one; `SphericalLocation` diameter | **3, 4** |
| **P3** | opening band = arena max in a 3 m and a 12 m room; `ambush: true` ⇒ `close`; `fight advance` steps one band at a poise+tempo cost; contested by a composed holder; `fight withdraw` refused at the cap; per-edge withdrawal (three attackers = three actions); gym re-baseline | **5, 52** (ambush half) |
| **P4** | `AimResolution`: every one of 15 cells + each step modifier + no-answer⇒`precise` + **no `Math.random` anywhere on the path** (grep assertion in the test file); `DeliveryProfile`: two carriers with equal profiles produce an identical `InflictSpec`; integrity bands from real material props; **identical placement across competence bands for identical commitments**; `EnergySource`: all three branches | **8, 9, 14** |
| **P5** | splash = target + `close`-to-target and **nobody else** (a `reach` neighbour excluded); consent gate refuses on a non-consenting sentient in the set; **the consenting-duelist-clinched-with-a-bystander case**; a non-sentient never gates; melee-with-a-non-consenting-sentient refused at commit | **24, 25, 31** |
| **P6** | the whole shipped `AttackController` test file green against the refactored controller (byte-parity) | (enables 47) |
| **P7** | `HazardRange` accepts `'ranged'`; a `'ranged'` delivery is **not** sprung by traversal; `deliverAt` refuses beyond envelope and permits within; **every shipped magic test green** (envelope default `far`); `dischargeInto` with no opts is byte-identical | **26, 27** |
| **P8** | flask crosses a band gap, vessel breaks by **its own** material (glass, not the potion's), contents spill to the floor slot, payload fires through the effect union; an `oral` potion thrown is a wasted flask; volume conservation across primary + splash + floor; graded scales / threshold honestly does not fire on a bystander; the `ContainerMixin` affordance assertion; the terms handshake on a sentient target produces the same terms + `consented:false` marker as `attack` | **23, 46, 47** (suite half) |
| **P9** | full lint family: `lint:gates`, `lint:instanceable`, `lint:imports`, `lint:module-scope`, `lint:boundary`, `lint:field-meta`, `lint:thin-forwarder`, `lint:combat-dynamics`, `lint:does-nothing` | **56**, **55** (Wave 1 slice) |

**Determinism assertion, stated once and enforced:** a CI-visible test
greps `Math.random` across
`lib/combat/{RangeBand,DeliveryProfile,AimResolution,EnergySource}.ts`
and the new `CombatLogic` resolution/splash/consent functions. Zero
hits, or the test fails.

### 7.3 ACs Wave 1 does **not** close (and must not claim)

6 (partial — per-edge withdrawal lands, the committed-held-shot half
needs D10/W2), 7, 10–13, 15–22, 28–30, 32–45, 48–51, 53, 54 (partial —
one of seven demonstrators), 52 (partial — the archer-defeat half needs
a bow).

### 7.4 The insert-only trap

`SeederManager` is insert-only. A **new** seed row (the long meadow, the
flask, the draught) inserts cleanly. **Editing** the treeline's exits
will not reach an already-seeded database. So: wire the exit in the seed
for the fresh-DB path, and use the shipped author verb `goto` for the
live drive. Say so in the MR; do not discover it at drive time.

---

## 8. The live-drive script

Boot the server, log in as a wizard, and type these. Three legs.

### Leg A — a thrown flask across a real band gap (AC 23, 24, 46, 5, 3, 4)

```
goto /domain/newbie-wilds/crossroads/longmeadow
look
        → the meadow reads as open ground (extent 12 m)
clone /obj/items/flask-of-blistering --here
clone /obj/items/flask-of-blistering --here
get flask
get flask
clone /domain/newbie-wilds/npc/wolf --here
throw flask at the wolf
        → a session OPENS at `near` (arena max, D37) — not `close`
        → the flask crosses, shatters (glass, not the draught)
        → the payload fires through the effect union (firebolt's heat)
        → the remainder pools on the floor
fight
        → range reads `near`; the wolf's condition band has moved
look floor
        → the puddle summary (BulkableApi.floorPuddleSummary)
fight advance
        → `near` → `reach`, at a poise and tempo cost
fight withdraw
        → back to `near`
fight withdraw
        → REFUSED — the arena caps at `near` in a 12 m room (AC 5)
throw flask at the wolf
        → works at `reach` too; a thrown carrier's envelope is `near`
fight yield
```

### Leg B — route is what kills the throw-everything case

```
clone /obj/items/flask-of-veiling --here
get flask
throw flask at the wolf
        → the flask breaks, the draught spills, and NOTHING fires.
          An `oral` potion is a wasted flask. This is the whole reason
          magic-items shipped `Potable.route` for this build.
```

### Leg C — the consent gate over the whole splash set (AC 25, 47)

Uses shipped multi-party content — no new NPCs needed.

```
goto /domain/newbie-wilds/crossroads/treeline
party form
party enlist the sellsword
go west
        → the fog hollow, with the gentleman duelist
attack the gentleman --lethal
        → terms reconcile silently (his standing posture is lethal) —
          a CONSENTED duel
fight
        → wait for the sellsword's `backs-up` brain to join and clinch
          the duelist (their pair reads `close`)
clone /obj/items/flask-of-blistering --here
get flask
throw flask at the gentleman
        → REFUSED at commit. The splash set is {duelist, sellsword};
          the sellsword is a sentient you have no terms with, so the
          area path is NOT a cheaper route to her than aiming at her.
          Nothing is thrown, no poise is spent, no session state moves.
fight advance
        → the sellsword's edge to the duelist opens; re-check
throw flask at the gentleman
        → now permitted; the duelist consented, and he is alone in the set
```

**What Leg C proves that no unit test can:** the refusal is legible,
arrives *before* anything commits, and the player can see why.

**Record in the MR:** the exact prose of the shatter beat, the splash
beat, the route-wasted beat, and the consent refusal. Prose that reads
wrong is a Wave 1 defect, not polish.

---

## 9. Questions — resolved 2026-08-05

All four settled with the user. Recorded here so the resolutions travel
with the plan. **Nothing in this section is open; do not re-litigate.**

**Q1 — D14's placed residue hazard. ✅ DEFERRED to W2.** D14's text says
the arrival "creates a placed hazard through the shipped self-resolving
`HazardMixin`," but no AC requires it and hazards are one-shot with no
lifetime/expiry model (hazard.md § Deferred: "resettable/rearming traps
… one-shot v1"). Wave 1 resolves the splash at arrival and spills the
remainder to the floor slot via the shipped `pour` path — which is what
"spills its contents onto real surfaces" means in the Goals. The
lingering caustic pool goes to W2 alongside cover and area, where the
expiry model can be budgeted properly rather than smuggled in.

**Q2 — the `vapour` route. ✅ DEFERRED to W2.** Wave 1 fires `contact`
only. A thrown `vapour` potion breaks and disperses with a distinct
"it wants an enclosure" line — an honest outcome, not a stub. Firing
vapour across the splash set would need a *second* splash-magnitude rule
(a gas is not a volume divided among skins), which is exactly the
invention §3.5 exists to prevent.

**Q3 — the opening-band change to shipped melee. ✅ KEPT.** D37 lands in
full: every fight opens at the arena's maximum, so in a default 3 m room
dagger-vs-dagger now opens at `reach` rather than `close`, and the
treeline cull and hollow duel gain an approach beat.

This is a deliberate change to already-shipped combat, taken with the
tradeoff stated. **The re-baseline is accepted, not absorbed** — P3 must
re-derive the gym's win-rate baselines and the ~10 `CombatLogic.test.ts`
opening assertions honestly. A build agent that finds those tests red
should re-derive the expected values, never relax the assertion.

**Q4 — `throw`'s command category. ✅ `inventory`.** Afforded by
`ContainerMixin` alongside `drop`/`put`/`give`, per §3.9. The category
names the substrate (containment), not the drama — the same reasoning
that put `disarm` under `device` and `drink` under `bulk`. It is also
what makes D43's "works outside combat" free: a Container can throw, and
being a Combatant is not required.

Minor, decided but worth a glance: `penetration` is deferred from
`DeliveryProfile` (no Wave 1 consumer — it is a sectional-behaviour axis
that only earns its keep against armor, W2); the flask's **impact
wound** (a small `blunt` `InflictSpec` from
`DeliveryProfile.toInflictSpec`) is included because it is the cheapest
real proof of the profile→inflict path.

---

## 10. Deferred waves — the roadmap this plan leaves behind

| Wave | Covers | Why here |
|---|---|---|
| **W2 — Cover, armor, the answer ladder** | **D25** cover (authored, directional, destructible, capacity-leased) · **D27** overturnable furnishings · **D21** armor on the response grid, point→blunt conversion · **D10** suppression / held aim on a zone · **D6** the committed-held-shot half · **D38** formation band preference + `skirmish`/`firing-line` · **D22/D23** the readout ladder + the cross-reading split · D14's lingering residue hazard (§9 Q1) · the **`vapour` route** and its own splash-magnitude rule (§9 Q2) · `DeliveryProfile.penetration` | Cover and armor are what make the `cover` and `counter` answers real, which is what finishes D7's matrix wiring. Armor is what makes the aim ladder *matter* (it forces the shooter up it). |
| **W3 — Bows, crossbows, less-lethal, acoustics** | **D12** graded archery fit · **D16** readiness as committed engagement actions + the bow's folded readiness · **D42** `elasticity` as a material property · **D13**'s `stored-elastic` branch, the hold window, dry-firing · **D19/D20** the incapacitation rung + the less-lethal payload family · **D24** per-metre sound attenuation · **D39/D40/D41** the four brains, brain-local morale, NPC ammunition · **D37**'s archer-defeat half of AC 52 | This is where `energySource` earns its keep: bow vs crossbow sharing `stored-elastic` while differing on who holds the draw is the model's sharpest test (**D28** names the crossbow non-optional for exactly this). |
| **W4 — Guns** | **D29** the field model · **D30** reliability-vs-output degradation · **D31** the generalized fast-wear axis (`keenness`/`fouling`) · **D32** four components · **D33** pattern keys · **D34** grade buys reliability · **D35** catastrophic failure on the readable-state rail · **D36** registration as the chattel ledger · **D17**'s negligent-discharge leg (reusing Wave 1's `mayDeliverTo` verbatim) · **D44** kernel neutrality | Guns are the largest, most content-adjacent slab and the one with the most in-world-law surface. It lands last because everything it needs — bands, profile, resolution, consent gate, readiness axis — is already load-bearing by then. |
| **Content, per D28** | The Practicum range, the armory venue, guard patrol density, the accessory catalogue, the installed launch regime | Systems over content; venues are expensive just-in-time carves. |

`docs/subsystems/ranged.md` created in P9 carries this table so the
roadmap survives this plan's retirement at sweep time.
