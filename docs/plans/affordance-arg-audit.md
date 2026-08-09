# The affordance arg audit — Wave 5's table

Working artifact for
[client-server-surface-plan.md](./client-server-surface-plan.md) waves
5–6. **Retire at sweep time**; the durable statement of the rule belongs
in `command-routing.md` / `command-spec.md`.

Produced by `pnpm lint:arg-kinds --by-file`, then **every controller
read** to record what it actually refuses. The plan is emphatic that
this step cannot be skipped, and it is right: three of the entries below
refuse something other than what their verb name suggests.

## The measurement

`157` object-typed fields across `cmd/**` and `domain/**` — positionals
and options, verb level and every subcommand. `49` already carry a kind
validator; `108` did not.

⚠ **Requirements § 9 says 112 / 24 / 88.** Per category the two agree on
crafting (16), bulk (11), movement (10) and device (8) and differ on
perception (16 vs 12) and inventory (7 vs 8) — the same measurement with
a different boundary, most likely options and `domain/**`, which the
script counts. Recorded rather than reconciled by tuning the script:
fitting the instrument to a number whose derivation is unavailable would
defeat the gate.

## The rule the table applies

A validator may only state a refusal **the controller already makes**,
and the controller must then use the same predicate. Where a
controller's refusal is not a property of the target *alone* — it
depends on the actor, the spell, the recipe, or a runtime slot — the arg
gets `targetKind: any` and **says so**, rather than acquiring an invented
constraint. Over-reporting offers a verb that then refuses with a reason;
**under-reporting hides a verb the player cannot discover**, which is a
build failure.

## Cluster 1 — device (8 args → 5 validators)

| Spec | Arg | Controller refuses | Validator |
|---|---|---|---|
| `device/switch` | target | `!isSwitchable` → `not-switchable` | `mustBeSwitchable` |
| `device/fold` | target | `!isFoldable` → `not-foldable` | `mustBeFoldable` |
| `device/unfold` | target | `!isFoldable` → `not-foldable` | `mustBeFoldable` |
| `device/arm` | target | `!isHazard` | `mustBeHazard` |
| `device/disarm` | target | `!isHazard` | `mustBeHazard` |
| `device/ignite` | target | `!isCombustible && !isFurnace` → `not-flammable` | `mustBeIgnitable` |
| `device/douse` | target | `!isCombustible && !isFurnace` → `not-burning` | `mustBeIgnitable` |
| `device/pump` | target | `!isFurnace` → `not-a-furnace` | `mustBeFurnace` |

## Cluster 2 — boundary (4 → 2)

| Spec | Arg | Controller refuses | Validator |
|---|---|---|---|
| `boundary/open` · `close` | target | `!isSealable` | `mustBeSealable` |
| `boundary/lock` · `unlock` | target | `!isLockable` | `mustBeLockable` |

⚠ `OpenController` also branches on `isHazard` (a trapped door). That is
an *additional behaviour*, not a second refusal — the validator states
only the `isSealable` gate.

## Cluster 3 — the body (6 → 1)

| Spec | Arg | Controller refuses | Validator |
|---|---|---|---|
| `combat/attack` | target | `!isVitals` | `mustHaveVitals` |
| `combat/fight switch` | target | `!isVitals` | `mustHaveVitals` |
| `perception/assess` | target | `!isVitals` | `mustHaveVitals` |
| `medical/treat` | target | `!isVitals` | `mustHaveVitals` |
| `medical/undress` | target | `!isVitals` | `mustHaveVitals` |

⭐ **`attack` on a room is closed here** — one of criterion 23's four.

## Cluster 4 — bulk (11 → 1)

Every one refuses on `BulkableApi.slotFor(x) === null` (`not-a-holder` /
`nothing-to-sip` / `nothing-to-spill`). The validator calls the **same
Api**, so there is one predicate, not a restatement.

| Spec | Args |
|---|---|
| `bulk/drink` · `sip` · `spill` | target |
| `bulk/fill` · `pour` | source, target |
| `bulk/feed` · `water` | source (target is the plant — cluster 6) |

⭐ **`drink` on a room is closed here** — criterion 23's second.

## Cluster 5 — movement (10 → 3)

| Spec | Arg | Controller refuses | Validator |
|---|---|---|---|
| `go` `walk` `run` `sneak` `climb` `fly` `swim` | target | the locomotion base traverses an **Exit**; anything else has no destination | `mustBeExit` |
| `ride` | target | `!isMountable` | `mustBeMountable` |
| `drive` | target | `!isDrivable` | `mustBeDrivable` |
| `unhitch` | target | `!isHaulable` | `mustBeHaulable` *(exists)* |

## Cluster 6 — husbandry (7 → 2)

| Spec | Arg | Controller refuses | Validator |
|---|---|---|---|
| `plant` | pot | `!isCultivable` | `mustBeCultivable` |
| `repot` | pot | `!isCultivable` | `mustBeCultivable` |
| `feed` · `water` | target | `!isCultivable` | `mustBeCultivable` |
| `repot` | plant | `!isGrowing` | `mustBeGrowing` |
| `harvest` | target | `!isGrowing` | `mustBeGrowing` |

## Cluster 7 — crafting (16 → 4)

| Spec | Arg | Controller refuses | Validator |
|---|---|---|---|
| `heat` `quench` `stir` `strain` | target / vessel | `!isBuildVessel` | `mustBeBuildVessel` |
| `plate` | vessel | `!isBuildVessel` | `mustBeBuildVessel` |
| `pour` (crafting) | vessel | `!isBuildVessel` | `mustBeBuildVessel` |
| `garnish` | glass | `!isBuildVessel` | `mustBeBuildVessel` |
| `strain` | glass | `!isBuildVessel` | `mustBeBuildVessel` |
| `hammer` | target | `!isDurable` | `mustBeDurable` |
| `sharpen` | blade | `!isKeen` | `mustBeKeen` |
| `repair` | item | `!isDurable` | `mustBeDurable` |
| `salvage` | item | `!isCrafted` | `mustBeCrafted` |
| `menu` | target | `!isAttendant` | `mustBeAttendant` |
| `plate` | dish · `pour` spirit · `garnish` garnish | recipe-dependent; no target-alone property | **`targetKind: any`** |

## Cluster 8 — the remainder (→ 5)

| Spec | Arg | Controller refuses | Validator |
|---|---|---|---|
| `social/talk` | target | `!isBehaved` | `mustBeBehaved` |
| `inventory/label` | target | `!isLabelled` | `mustBeLabelled` |
| `magic/recharge` · `zap` | target / item | `!isCharged` | `mustBeCharged` |
| `banking/bank deposit` | coins | `!isGlobbable` | `mustBeGlobbable` |
| `perception/analyze response` · `weapon` | target | `!isDurable` (+ construction) | `mustBeDurable` |
| `perception/analyze electrical` | target | `!isTangible` | `mustBeTangible` *(exists)* |
| `perception/read` | target | `!isMarked` | `mustBeMarked` |

⭐ **`talk` on a room is closed here** — criterion 23's third.

## Declared universal — `targetKind: any` (34 args)

Not laziness: each is a target-alone-unconstrained arg, and declaring it
at the site is the record, the way `@hook` is. A gate can then tell
*deliberately universal* from *forgotten*.

| Group | Why |
|---|---|
| `author/` — `clone --mql --into`, `destruct target`, `eval --on`, `goto target`, `reload --mql`, `teleport destination --target` | wizard verbs act on **anything** by design |
| `shell/` — `cat` `cd` `ls` `rm` `write` `--mql`, `find query` | MQL selectors, not typed operands |
| `perception/` — `look` `feel` `listen` `smell` `taste` `sense` `search` `locate` `scry` `focus` | perception verbs **branch on** mixins to enrich output; they refuse nothing by kind. Constraining them would hide verbs that work. |
| `magic/cast target`, `magic/study target`, `magic/zap target` | the **spell** decides what it may target, not the arg |
| `combat/defend target`, `combat/intervene target` | refusal is about the *session*, not the target's kind |
| `social/react --to` | any frame-addressable subject |
| `banking/transfer recipient`, `pay recipient`, `payroll worker`, `wallet freeze card` | account-bearing, resolved at run time |
| `movement/unhitch` handled above; `domain/eternal/university-avenue` `blow` `wind` `adjust` `tally` | content verbs bound to one fixture; the fixture is the constraint |
| `crafting/` recipe-dependent args (above) | |
| `inventory/throw target`, `plant seed`, `repot`/`plant` remainder | ballistics / seed kinds are runtime facts |

⭐ **`cast` is criterion 23's fourth, and it does NOT close with a
validator.** `CastController` refuses on the *spell's* own target rule,
which is not a property of the arg — so the honest fix is
`targetKind: any` on the arg plus the spell's existing refusal. Marking
it validated with an invented kind would be exactly the "wrong validator"
the requirements call worse than a missing one.

## Totals — as shipped

| | |
|---|---|
| new validators | **23** |
| reused existing | 2 (`mustBeHaulable`, `mustBeTangible`) |
| args carrying a kind validator | 106 |
| args declared `targetKind: any` | 51 |
| **unaccounted** | **0** |

`157` object-typed fields in total — unchanged before and after, which
is the check that matters: a spec that stopped parsing would have made
the total *drop*, and a shrinking denominator is how a gate reports
success over a tree it can no longer read. `check-arg-kinds` now fails
loudly on an unparseable spec for exactly that reason.

## Two things the sweep found that the plan did not anticipate

1. ⚠ **The boundary and device controllers are door-aware, and a naive
   validator would have broken them.** MQL lands on a door two ways —
   by keyword (`open oak`) or by direction (`open north`), where the
   door rides the match's `via.exit` rather than being the matched
   Stuff. All ten of those controllers narrow through
   `MqlApi.effectiveTarget`. A validator checking `MixinApi.isSealable`
   on the matched Stuff would have passed `open oak` and **refused
   `open north`** — under-reporting, which criterion 22 calls a build
   failure. Those six validators call `effectiveTarget` too.

2. ⚠ **The bulk family does not refuse on `isBulkable`.** It refuses on
   `BulkableApi.slotFor(x) === null`, because a thing can compose the
   mixin and still expose no slot. `mustHaveBulkSlot` calls the same
   Api. Validating the mixin instead would have been a *different,
   weaker* refusal wearing the same name.

Both are the same lesson, and the reason the plan forbids guessing from
the verb name: the refusal a controller makes is frequently not the one
its name suggests.
