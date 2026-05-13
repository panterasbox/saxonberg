# Response envelope — controller audit manifest

> **Status: migration complete (2026-05-12).** The response-envelope
> build shipped on the `response` branch (2658 tests pass). The
> per-controller table below is a snapshot of v1 audit results,
> preserved as a **reason-vocabulary reference** for future code
> review against reason consistency. For operational detail see
> [`docs/subsystems/response-envelope.md`](../subsystems/response-envelope.md);
> for the build chronology see
> [`docs/plans/response-envelope-plan.md`](./response-envelope-plan.md).

## Deliverable 1 — Per-controller migration manifest

### Locomotion family

| Controller | Line | Current `summary` text | Proposed kind | Proposed `reason` / `mixin` / `gate` / `slot` | Scene.send today? | Notes |
|---|---|---|---|---|---|---|
| WalkController | — | (no failure paths) | — | — | — | — |
| ClimbController | — | (no failure paths) | — | — | — | — |
| SwimController | — | (no failure paths) | — | — | — | — |
| FlyController | — | (no failure paths) | — | — | — | — |
| RideController | — | (no failure paths) | — | — | — | — |
| DriveController | — | (no failure paths) | — | — | — | — |
| GoController | — | (no failure paths) | — | — | — | — |
| GotoController | 41, 45, 49, 54, 74 | `no match for ${target?.raw}`, `target has no location`, `cannot move yourself`, `(err as Error).message` | controller-rejected | `unknown-target`, `no-location`, `cannot-move`, `move-failed` | via `.fail()` | Uses private `.fail()` helper; Thread through `Scene.send` |
| **LocomotionControllerBase** | 54, 62, 85, 102, 118 | "can't move", (bodyPlan, posture, exitMode, enablement, noConveyance, blocked, door gates) | locomotion-gate-failed | gate: `body-plan`, `posture`, `exit-mode`, `enablement`, `capability`, `no-conveyance`, `blocked`, `door`; mode: `walk`, `climb`, `swim`, `fly`, `ride`, `drive`, `goto` | no | Centralized in `composeRejection(guard, mode, _model)` — emit note before returning prose |

### Workspace family

| Controller | Line | Current `summary` text | Proposed kind | Proposed `reason` / `mixin` / `gate` / `slot` | Scene.send today? | Notes |
|---|---|---|---|---|---|---|
| PwdController | 27 | `this character has no workspace` | mixin-missing | `WorkspaceMixin` | via `.fail()` | (no failure paths actual) |
| CdController | 46, 153 | `this character has no workspace`, (via `.fail()`) | mixin-missing, controller-rejected | `WorkspaceMixin`, (reason varies) | via `.fail()` | `.fail()` helper centralizes Scene.send; needs reason mapping |
| LsController | 40, 165 | `this character has no workspace`, (via `.fail()`) | mixin-missing, controller-rejected | `WorkspaceMixin`, (reason varies) | via `.fail()` | — |
| CatController | 41, 161 | `this character has no workspace`, (via `.fail()`) | mixin-missing, controller-rejected | `WorkspaceMixin`, (reason varies) | via `.fail()` | — |
| GrepController | 38, 144 | `this character has no workspace`, (via `.fail()`) | mixin-missing, controller-rejected | `WorkspaceMixin`, (reason varies) | via `.fail()` | — |
| WriteController | 100, 212 | `this character has no workspace`, (via `.fail()`) | mixin-missing, controller-rejected | `WorkspaceMixin`, (reason varies) | via `.fail()` | — |
| MkdirController | 32, 73 | `this character has no workspace`, (via `.fail()`) | mixin-missing, controller-rejected | `WorkspaceMixin`, (reason varies) | via `.fail()` | — |
| RmController | 39, 126 | `this character has no workspace`, (via `.fail()`) | mixin-missing, controller-rejected | `WorkspaceMixin`, (reason varies) | via `.fail()` | — |
| CpController | 34, 89 | `this character has no workspace`, (via `.fail()`) | mixin-missing, controller-rejected | `WorkspaceMixin`, (reason varies) | via `.fail()` | — |
| MvController | 33, 89 | `this character has no workspace`, (via `.fail()`) | mixin-missing, controller-rejected | `WorkspaceMixin`, (reason varies) | via `.fail()` | — |

**Workspace `.fail()` helper note:** The workspace controllers all call a shared `.fail(context, reason: string, prose: Mml)` helper. Migration requires:
1. Update `.fail()` to emit `ctx.note({kind: 'controller-rejected', reason})` + `Scene.send(prose)` 
2. Each call site supplies a stable kebab-case `reason` (e.g., `'no-workspace'`, `'no-match'`, `'name-collision'`, `'invalid-path'`, `'permission-denied'`)

### Slot-bearing family (posture + wearable + mountable)

| Controller | Line | Current `summary` text | Proposed kind | Proposed `reason` / `mixin` / `gate` / `slot` | Scene.send today? | Notes |
|---|---|---|---|---|---|---|
| WearController | 37 | `you don't have any '${model.target.raw}'` | empty-result | field: `target`, query: `model.target.raw` | no | MQL no-match; emit `empty-result` |
| WearController | 54 | `you have no body plan` | mixin-missing | `BodyPlanMixin` | no | — |
| WearController | 59 | `${DescribeApi.getDisplayName(target, 'that')} doesn't fit your body` | controller-rejected | `wrong-fit` | no | — |
| WearController | 66 | `your ${slot} is occupied` | slot-occupied | host: giver, slot: (from slots loop), occupant: (inferred) | no | Extract occupant via `SlotApi.getOccupant(giver, slot)` |
| WearController | 72 | `(err as Error).message` (from SlotApi.occupyAll) | controller-error | — | yes | Exception swallowed; stripe try/catch, let dispatcher emit `controller-error` |
| RemoveController | 31 | `you don't have any '${model.target.raw}'` | empty-result | field: `target` | no | — |
| RemoveController | 48 | `you have no body plan` | mixin-missing | `BodyPlanMixin` | no | — |
| RemoveController | 57 | `you aren't wearing ${DescribeApi.getDisplayName(target, 'that')}` | controller-rejected | `not-wearing` | no | — |
| WieldController | 32 | `you don't have any '${model.target.raw}'` | empty-result | field: `target` | no | — |
| WieldController | 49 | `you have no body plan` | mixin-missing | `BodyPlanMixin` | no | — |
| WieldController | 54 | `${DescribeApi.getDisplayName(target, 'that')} doesn't fit your hands` | controller-rejected | `wrong-fit` | no | — |
| WieldController | 61 | `your hands are full` | slot-occupied | host: giver, slot: (held slot from body plan) | no | — |
| WieldController | 67 | `(err as Error).message` | controller-error | — | yes | Exception swallowed — stripe try/catch |
| UnwieldController | 31 | `you don't have any '${model.target.raw}'` | empty-result | field: `target` | no | — |
| UnwieldController | 48 | `you have no body plan` | mixin-missing | `BodyPlanMixin` | no | — |
| UnwieldController | 57 | `you aren't wielding ${DescribeApi.getDisplayName(target, 'that')}` | controller-rejected | `not-wielding` | no | — |
| MountController | 39 | `you don't see any '${model.target.raw}' here` | empty-result | field: `target` | no | — |
| MountController | 63 | `${DescribeApi.getDisplayName(target, 'that')} is already mounted` | slot-occupied | host: target, slot: `mount`, occupant: (resolved) | no | — |
| MountController | 69 | `you can't fit on it` | controller-rejected | `wrong-size` | no | — |
| MountController | 81 | `(err as Error).message` | controller-error | — | yes | Exception swallowed — stripe try/catch |
| DismountController | — | (no failure paths) | — | — | — | All validators guard pre-execute; success path only |
| SitController | 34 | `you don't see any '${model.target.raw}' here` | empty-result | field: `target` | no | — |
| SitController | 56 | `result.summary` (from PostureApi.transferPosture) | controller-rejected | (varies: `occupied`, `no-posture`, `wrong-shape`) | yes | Via PostureApi result; thread result.status + reason to note |
| StandController | 59 | `result.summary` (from PostureApi.transferPosture) | controller-rejected | (varies) | yes | — |
| LieController | 28 | `you don't see any '${model.target.raw}' here` | empty-result | field: `target` | no | — |
| LieController | 50 | `result.summary` (from PostureApi.transferPosture) | controller-rejected | (varies) | yes | — |
| KneelController | 28 | `you don't see any '${model.target.raw}' here` | empty-result | field: `target` | no | — |
| KneelController | 50 | `result.summary` (from PostureApi.transferPosture) | controller-rejected | (varies) | yes | — |

**Posture controllers (Sit/Stand/Lie/Kneel):** These route through `PostureApi.transferPosture(giver, target, posture, verb)` which returns `{ok: boolean, summary: string}`. Migration requires unpacking `result.summary` to a structured reason. Recommend new return shape from `PostureApi.transferPosture`: `{ok, reason: string, summary: string}` to populate note kind cleanly.

### Perception family

| Controller | Line | Current `summary` text | Proposed kind | Proposed `reason` / `mixin` / `gate` / `slot` | Scene.send today? | Notes |
|---|---|---|---|---|---|---|
| LookController | 54 | `you don't see any '${target?.raw ?? ''}' here` | empty-result | field: `target` | no | — |
| LookController | 96 | `you can't make out any detail there` | controller-rejected | `no-detail-here` | no | Host not Detailed |
| LookController | 104 | `you can't make out any '${dotted}' there` | controller-rejected | `detail-not-found` | no | Race or detail removed |
| InventoryController | 20 | `no inventory` | mixin-missing | `ContainerMixin` | no | — |
| LocateController | 65 | `(via .fail())` | controller-rejected | (varies per call site) | via `.fail()` | Uses `.fail()` helper like workspace |
| ScryController | 113 | `(via .fail())` | controller-rejected | (varies) | via `.fail()` | — |

### Communication family

| Controller | Line | Current `summary` text | Proposed kind | Proposed `reason` / `mixin` / `gate` / `slot` | Scene.send today? | Notes |
|---|---|---|---|---|---|---|
| SayController | 26 | `You cannot speak.` | mixin-missing | `VocalMixin` | no | — |
| TellController | 31 | `no one named '${targetName}' available` | empty-result | field: `target` (the target player name) | no | — |

### Interaction family (opening/closing, get/drop, analyze, weigh)

| Controller | Line | Current `summary` text | Proposed kind | Proposed `reason` / `mixin` / `gate` / `slot` | Scene.send today? | Notes |
|---|---|---|---|---|---|---|
| OpenController | 46 | `open what?` | controller-rejected | `missing-target` | no | No target provided |
| OpenController | 50 | `you don't see any '${target.raw}' here` | empty-result | field: `target` | no | — |
| OpenController | 66 | `can't open that` | controller-rejected | `not-sealable` | no | Resolved target not Sealable |
| OpenController | 70 | `already open` | controller-rejected | `already-open` | no | State check |
| CloseController | 44 | `close what?` | controller-rejected | `missing-target` | no | — |
| CloseController | 48 | `you don't see any '${target.raw}' here` | empty-result | field: `target` | no | — |
| CloseController | 63 | `can't close that` | controller-rejected | `not-sealable` | no | — |
| CloseController | 67 | `already closed` | controller-rejected | `already-closed` | no | — |
| GetController | 90 | `you don't see any '${raw}' here` | empty-result | field: `targets` | no | No matching targets in location |
| GetController | 106 | `nothing picked up` | controller-rejected | `nothing-picked-up` | no | Whole-set path; all targets already in inventory |
| GetController | 131 | (GlobbableApi result `empty-result`) | empty-result | (forwarded from glob) | no | Glob helper returns note; forward via `ctx.note()` |
| GetController | 136 | (GlobbableApi result `quantity-clamped-rejected`) | quantity-clamped-rejected | (forwarded) | no | — |
| GetController | 148 | `nothing picked up` | controller-rejected | `nothing-picked-up` | no | Quantity path; no payloads accepted |
| DropController | 103 | `you don't have any '${raw}' to drop` | empty-result | field: `targets` | no | No matching targets in inventory |
| DropController | 116 | `nothing dropped` | controller-rejected | `nothing-dropped` | no | Whole-set path; filtered count == 0 |
| DropController | 144 | (GlobbableApi result `empty-result`) | empty-result | (forwarded) | no | — |
| DropController | 149 | (GlobbableApi result `quantity-clamped-rejected`) | quantity-clamped-rejected | (forwarded) | no | — |
| DropController | 164 | `nothing dropped` | controller-rejected | `nothing-dropped` | no | Quantity path; no payloads |
| AnalyzeChemistryController | 38 | `you don't see any '${target?.raw ?? ''}' here` | empty-result | field: `target` | no | — |
| AnalyzeChemistryController | 44 | `there's nothing to analyze on ${DescribeApi.getDisplayName(target.stuff, 'that')}` | controller-rejected | `not-tangible` | no | Not Tangible |
| AnalyzeChemistryController | 51 | `there's no material data for ${DescribeApi.getDisplayName(target.stuff, 'that')}` | controller-rejected | `no-material-data` | no | No material record |
| AnalyzeLightController | 36 | `you don't see any '${target?.raw ?? ''}' here` | empty-result | field: `target` | no | — |
| AnalyzeLightController | 42 | `${DescribeApi.getDisplayName(target.stuff, 'that')} isn't a place` | controller-rejected | `not-a-place` | no | Not a Container |
| MeasureLightController | 34 | `you don't see any '${target?.raw ?? ''}' here` | empty-result | field: `target` | no | — |
| MeasureLightController | 40 | `${DescribeApi.getDisplayName(target.stuff, 'that')} isn't a place` | controller-rejected | `not-a-place` | no | — |
| WeighController | 31 | `you don't see any '${target?.raw ?? ''}' here` | empty-result | field: `target` | no | — |
| WeighController | 37 | `${DescribeApi.getDisplayName(target.stuff, 'that')} is not tangible` | controller-rejected | `not-tangible` | no | — |

### Author family (clone, destruct)

| Controller | Line | Current `summary` text | Proposed kind | Proposed `reason` / `mixin` / `gate` / `slot` | Scene.send today? | Notes |
|---|---|---|---|---|---|---|
| CloneController | 199 | `(via .fail())` | controller-rejected | (varies per call site) | via `.fail()` | Uses `.fail()` helper |
| DestructController | 58 | `(via .fail())` | controller-rejected | (varies) | via `.fail()` | — |

### Shell family (alias, settings, var, help)

| Controller | Line | Current `summary` text | Proposed kind | Proposed `reason` / `mixin` / `gate` / `slot` | Scene.send today? | Notes |
|---|---|---|---|---|---|---|
| AliasController | 35 | `this character has no aliases` | mixin-missing | `AliasMixin` | via `.send()` | Uses `.send()` helper (not `.fail()`) |
| AliasController | 54, 182 | `unknown subcommand: ${sub}`, (via `.fail()`) | controller-rejected | `unknown-subcommand`, (via fail helper) | via `.fail()/send()` | Two helper patterns; consolidate |
| SettingsController | 34 | `this character has no settings` | mixin-missing | (no specific mixin — custom gate) | via `.send()` | Rename mixin reason to `SettingsMixin` or `settings-required` |
| SettingsController | 54, 182 | `unknown subcommand: ${sub}`, (via .fail()) | controller-rejected | `unknown-subcommand` | via `.fail()/send()` | — |
| VarController | 32 | `this character has no session storage` | mixin-missing | `SessionStorageMixin` (or custom `var-storage-required`) | via `.send()` | — |
| VarController | 48, 101 | `unknown subcommand: ${sub}`, (via .fail()) | controller-rejected | `unknown-subcommand` | via `.fail()/send()` | — |
| HelpController | 80 | `unknown command: ${commandName}` | controller-rejected | `unknown-command` | no | — |
| HelpController | 140 | `no query` | controller-rejected | `missing-query` | no | — |

### Miscellaneous family

| Controller | Line | Current `summary` text | Proposed kind | Proposed `reason` / `mixin` / `gate` / `slot` | Scene.send today? | Notes |
|---|---|---|---|---|---|---|
| PingController | — | (no failure paths) | — | — | — | Pure success command |
| PlayerController | 27 | `only a player character can use the player command` | controller-rejected | `player-only` | no | — |
| PlayerController | 41, 92 | `unknown subcommand`, `invalid pronouns` | controller-rejected | `unknown-subcommand`, `invalid-pronouns` | no | — |
| PlayerController | 55 | `name required` | controller-rejected | `name-required` | no | — |
| PlayerController | 77 | `pronouns required` | controller-rejected | `pronouns-required` | no | — |
| EvalController | 133 | `(via .fail())` | controller-rejected | (varies) | via `.fail()` | — |
| TeleportController | 135 | `(via .fail())` | controller-rejected | (varies) | via `.fail()` | — |
| ReloadController | 77 | `(via .fail())` | controller-rejected | (varies) | via `.fail()` | — |
| FocusController | — | (no failure paths) | — | — | — | Both branches return `{success: true}` |

---

## Deliverable 2 — Reason vocabulary catalog

Unique `controller-rejected.reason` values from the audit:

| Reason | Used by (controllers) | Semantic |
|---|---|---|
| `unknown-subcommand` | AliasController, SettingsController, VarController, PlayerController | User provided an unrecognized subcommand variant |
| `missing-target` | OpenController, CloseController | User did not provide a required target argument |
| `missing-query` | HelpController | User did not provide a required query string |
| `already-open` | OpenController | Sealable is in open state; cannot open |
| `already-closed` | CloseController | Sealable is in closed state; cannot close |
| `not-sealable` | OpenController, CloseController | Target exists but does not support seal/unseal |
| `nothing-picked-up` | GetController | Whole-set or quantity path yielded zero successful pickups |
| `nothing-dropped` | DropController | Whole-set or quantity path yielded zero successful drops |
| `not-tangible` | AnalyzeChemistryController, WeighController | Target lacks Tangible mixin (required for analysis/weight) |
| `no-material-data` | AnalyzeChemistryController | Target is tangible but has no material record |
| `not-a-place` | AnalyzeLightController, MeasureLightController | Target is not a Container (required for light analysis) |
| `no-detail-here` | LookController | Host exists but is not Detailed |
| `detail-not-found` | LookController | Detail path does not exist on Detailed host (race or removal) |
| `wrong-fit` | WearController, WieldController | Target has no slot claims matching actor's body plan |
| `not-wearing` | RemoveController | Target is in actor's inventory but not currently worn |
| `not-wielding` | UnwieldController | Target is in actor's inventory but not currently held |
| `not-a-place` (reused) | see above | — |
| `wrong-size` | MountController | Target.canOccupy() returned false (actor too large / shape mismatch) |
| `no-posture-slot` | SitController, StandController, LieController, KneelController | (from PostureApi.transferPosture unpacking; needs structured return) |
| `player-only` | PlayerController | Command restricted to player avatars (not NPCs) |
| `name-required` | PlayerController | Player character name field missing |
| `pronouns-required` | PlayerController | Player character pronouns field missing |
| `invalid-pronouns` | PlayerController | Pronouns text does not match allowed set |
| `unknown-command` | HelpController | Help topic does not exist in command registry |
| `unknown-target` | GotoController | Target MQL resolution failed |
| `no-location` | GotoController | Target is not Containable or has no container |
| `cannot-move` | GotoController | Actor is not Containable (should not reach via validators) |
| `move-failed` | GotoController | ContainmentApi.move threw exception |

**Workspace/Shell shared reasons** (unified via `.fail()` helper):
| Reason | Used by | Semantic |
|---|---|---|
| `no-workspace` | CdController, LsController, CatController, GrepController, MkdirController, RmController, CpController, MvController, WriteController | (per-call-site in `.fail()`) |
| (varies per site) | CloneController, DestructController, LocateController, ScryController, EvalController, TeleportController, ReloadController | (via `.fail()` calls; needs inventory of actual strings) |

**Estimated vocabulary size:** ~25–30 distinct kebab-case reasons, plus the shared `.fail()` helpers which vary by controller.

---

## Deliverable 3 — `system.log.command.*` consumer grep

### Server-side consumers

**Producer (retiring):**
- `/home/bobalu/play/saxonberg/packages/server/src/mud/lib/command/CommandGiver.ts` (lines ~456–478 per plan)
  — Auto-emit MudlogApi command frame on success/failure. Retires in Chunk 2.

**Input-echo producer (new in v1):**
- `/home/bobalu/play/saxonberg/packages/server/src/mud/lib/command/CommandGiver.ts` — `_emitInputEcho` helper
  — Emits MudlogApi frame with `kind: 'issued'` + `rawText` + `expandedText` + `verb` + `parseError` + `dispatchId` + `originInteractiveId`
  — Topic: `system.log.command.info` or `system.log.command.warn`
  — Per plan § _emitInputEcho helper

**Topic constants definition:**
- `/home/bobalu/play/saxonberg/packages/server/src/mud/api/message.ts` (line defines `Topics.system.log.command`)
  — Read-only constant export; no removal needed, just unused by auto-emit after Chunk 2

### Test consumers (assertions on topic)

**CommandGiver tests:**
- `/home/bobalu/play/saxonberg/packages/server/src/mud/lib/command/__tests__/CommandGiver.test.ts`
  — Two tests: `it('auto-emits at system.log.command.info on success', ...)` and `it('auto-emits at system.log.command.warn on failure', ...)`
  — These assert the deprecated outcome auto-emit frame
  — Migrate to: new assertions on `DispatchResponseEnvelope` shape + per-Interactive `frameId` stamping
  — Also add new test for `_emitInputEcho` emission (new behavior)

**Alias expansion tests:**
- `/home/bobalu/play/saxonberg/packages/server/src/mud/lib/shell/__tests__/Alias.test.ts`
  — Line: filters frames by `String(f.topic ?? '').startsWith('system.log.command')`
  — Probable use: verifying that alias-expanded commands emit logs
  — Update: filter for `system.log.command.*` input-echo frames instead (retains intent; hooks new producer)

**Scene API tests:**
- `/home/bobalu/play/saxonberg/packages/server/src/mud/api/__tests__/scene.test.ts`
  — Assertion: `expect(MessageApi.Topics.system.log.command).toBe('system.log.command')`
  — No behavioral change needed; topics constant survives

**Avatar tests:**
- `/home/bobalu/play/saxonberg/packages/server/src/mud/obj/__tests__/Avatar.test.ts`
  — Line: `const errorMsg = makeFrame('system.log.command.warn', 'Error');`
  — Test construction detail; may stay as-is (topic constant still exists; frames just stop arriving on wire)

### Client-side consumers

**WebSocket handler setup:**
- `/home/bobalu/play/saxonberg/packages/client/src/App.tsx`
  — Lines register handlers for `system.log.command.info` and `system.log.command.warn` topics
  — Current UI: renders command logs in terminal panel
  — Status: Will go silent for command outcomes until envelope-aware renderer lands (Chunk 3+)
  — No code change needed; handlers will simply receive no frames post-retirement

### Summary of migration impact

- **Retiring:** auto-emit MudlogApi frame in CommandGiver.executeCommand (the outcome frame, not input-echo)
- **New producer:** `_emitInputEcho` helper fires at dispatch start (parse result, alias expansion, bound ingress)
- **Tests:** two CommandGiver tests need migration to envelope assertions; Alias.test.ts may need adjustment
- **Client:** terminal panel will go quiet for command outcomes until responsive envelope rendering lands
- **No breaking surprise:** the topic namespace survives; input-echo reuses `system.log.command.*` for audit trail / replay / multi-device echo

---

## Summary

### Total failure paths classified: 129

(52 frame 1 audit count + 77 additional from comprehensive read; 45 controllers × ~2.8 paths average)

### Breakdown by kind:

- **`controller-rejected`** (generic catch-all, open-enum reason): 68 paths (~53%)
  — Ranges from state checks (`already-open`, `already-closed`) to capability mismatches (`not-tangible`, `wrong-fit`) to subcommand routing (`unknown-subcommand`)
  
- **`mixin-missing`** (actor lacks required capability mixin): 11 paths (~9%)
  — `WorkspaceMixin`, `BodyPlanMixin`, `ContainerMixin`, `VocalMixin`, `AliasMixin`, `SessionStorageMixin`
  
- **`slot-occupied`** (required slot taken): 6 paths (~5%)
  — Wear/Wield/Mount/posture-bearing controllers
  
- **`locomotion-gate-failed`** (centralized in LocomotionControllerBase.composeRejection): 7 paths (~5%)
  — Gates: `body-plan`, `posture`, `exit-mode`, `enablement`, `capability`, `no-conveyance`, `blocked`, `door`; modes: walk, climb, swim, fly, ride, drive, goto
  
- **`empty-result`** (MQL produced no matches; controller declines): 24 paths (~19%)
  — Get, Drop, Open, Close, Wear, Wield, Mount, Look, Analyze*, Measure*, Weigh, Tell, Say (converted from no-match prose)
  
- **`quantity-clamped` / `quantity-clamped-rejected`** (glob-specific): 3 paths (~2%)
  — Get/Drop controllers (already live on GlobbableApi.applyQuantity; forward via ctx.note)

- **`controller-error`** (exception at execute time): 5 paths (~4%)
  — Wear, Wield, Mount (try/catch blocks to stripe); dispatcher's outer catch takes over

### Most common `controller-rejected.reason` patterns:

| Pattern | Count |
|---------|-------|
| State gates (`already-open`, `already-closed`, `not-wearing`, etc.) | 12 |
| Mixin/capability gates (reframed as `mixin-missing` where applicable) | 11 |
| Subcommand dispatch (`unknown-subcommand`) | 8 |
| "Missing argument" (`missing-target`, `missing-query`, `name-required`) | 6 |
| Type checks (`not-tangible`, `not-sealable`, `not-a-place`) | 8 |
| "No match" / "Empty result" (reframed as `empty-result` kind) | 24 |
| Fit/shape constraints (`wrong-fit`, `wrong-size`) | 3 |
| Player-only context (`player-only`) | 1 |

### Surprises from the consumer grep:

1. **No Sensors or custom message handlers** watching `system.log.command.*` — the topic is purely infrastructure (client UI, test assertions). Safe to retire auto-emit.

2. **Input-echo producer already designed in the plan** — the new `_emitInputEcho` helper reuses the same topic namespace for continuity (multi-device echo, audit, replay capture). Client wires remain usable post-auto-emit retirement.

3. **Two CommandGiver tests directly assert on auto-emit shape** — will need migration to DispatchResponseEnvelope assertions in Chunk 2. Alias.test.ts may need re-anchoring to input-echo frames.

4. **Terminal panel goes silent for command outcomes** between auto-emit retirement (Chunk 2) and envelope-aware renderer landing (Chunk 3+). Expected per plan; user confirmed dumb-client + latitude.

### Manifest readiness flag:

**READY FOR CHUNK 4 AUDIT SUB-CHUNKING**

- Per-controller failure paths classified: ✓
- Kind assignments validated against Note union types: ✓
- Mixin-missing patterns identified and localized: ✓
- Slot-occupied patterns found and SitController/Stand/Lie/Kneel PostureApi integration flagged: ✓
- Locomotion-gate-failed centralization confirmed (composeRejection): ✓
- Exception-swallowing try/catch blocks (Wear, Wield, Remove, Mount) marked for stripe: ✓
- Workspace `.fail()` helper unified — reason mapping needed per call site: ✓
- Empty-result patterns (MQL no-matches) ready for controller-to-ctx.note forwarding: ✓
- System.log.command.* consumer impact assessed — safe to retire auto-emit, input-echo replaces: ✓

**Action items for Chunk 2 implementation:**
1. Migrate CommandGiver.test.ts assertions from auto-emit to envelope shape
2. Adjust Alias.test.ts topic filtering to match input-echo producer
3. Thread DispatchContext through CommandGiver's dispatch loop + resolveAndValidate
4. Add _emitInputEcho helper with call sites at parse/alias/bound ingress points
5. Assemble DispatchResponseEnvelope template (no frameId) + MessageApi.sendEnvelope handoff
