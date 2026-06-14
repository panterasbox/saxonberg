# Excluded-Api unblock — COMPLETED RECORD

Severed the bootstrap-cycle edges that forced ~15 Apis to stay excluded
from the surface-architecture logic-singleton conversion, then converted
them. Branch `feature/excluded-api-unblock` (off `feature/surface-architecture`).
Done 2026-06-14.

## Outcome

**Phase A — sever the keystone (`shadow → command`).** `ShadowApi.attach`/
`detach` drove the command recency-stack delta by statically importing
`CommandApi` — a layering inversion that value-pulled the whole command
closure (~16 Apis) onto the `lib/stuff/Stuff.ts` boot path. Replaced with
a late-bound DI seam (`ShadowApi._registerCommandShadowHook`, mirroring
`SecurityApi._registerShadowApi`); `command.ts` registers
`CommandApi.applyShadowDelta` at module-load (eager-loaded at boot via
`AppBootstrap`). Sync (not event-driven — `EventApi.emit` is async via
`queueMicrotask`, which would make the affordance update lag a command
issued right after attach). Cycle BFS from `Stuff.ts`: **27 → 11**
value-reachable Apis.

**Phase B — convert the 15 freed Apis** to thin forwarding shells over
`/obj/api/<feature>` logic singletons (the locked recipe). In commit
order: array · prose · mudlog · group · access · belief · recognition ·
command-line · quantity · shell · containment · message · mql · prompt ·
command. Notes:
- **mql** sealed-subdir: added `obj/api/MqlLogic.ts` to the
  `no-restricted-imports` `excludedFiles` — the logic singleton is the
  Api's own impl, so it shares the facade's `api/mql/` import privilege.
- **access** / **containment**: registry/chokepoint gates widened to
  `AnyOf(FromModule(...), FromTemplate('/obj/api/<feature>'))` so the
  logic singleton can drive `AccessRegistry` / `Containable.setContainer`.
- **prompt**: per-Interactive registry → module-level state; the
  `*ForTesting` `assertTestOnly()` caller-check stays on the FACE statics
  (its bounded stack window can't see the `.test.ts` frame through the
  singleton's forwarding frames).
- **command** (3519 → ~1490-line face + ~1730-line logic): the ~30
  exported types + the 2 white-box-test functions stay on the face; the
  Phase-A shadow-hook registration stays at the face bottom.
- Brittle timing test fixed: `command.disambiguation.test.ts` waited a
  fixed 2 microtasks for the prompt push; the extra forwarding hops made
  that flaky → replaced with a bounded `flushUntil(envelope)` poll.

**Reserved-namespace guard.** `/obj/api/` is now rejected at the
domain-save chokepoint (`DomainHook.aroundSave` →
`TemplateApi.validateReservedPath`, `ReservedTemplatePrefixes` in
`lib/paths.ts`). The logic singletons live at runtime template-paths
`/obj/api/<feature>` (runtime indexes only, never a DB write); this stops
an authored Template from ever colliding with `singletonSync`'s
`byTemplatePath` lookup.

## Phase C — NOT pursued (the remaining set is substrate)

After Phase A the cycle-bound set was 11; **5 are not convertible and
stay static substrate**, documented here so this isn't re-litigated:

| module | why it stays static |
|---|---|
| `event` | **Structurally impossible.** `EventApi.emit` fires inside `StuffApi.create`/`destruct` on *every* Stuff creation. A logic singleton would recurse at its own creation: `emit` → `logic()` → `singletonSync` → `createSync` → `register` → `emit` → … (the bucket isn't stamped yet, so the re-entrant `singletonSync` re-creates). Same hard-wall class as `hot-reload`. |
| `hot-reload` | The singleton-resolution machinery itself calls `HotReloadApi.getCurrentExport`; a logic singleton can't depend on the thing that builds logic singletons. |
| `shadow` | The method-dispatch shadow substrate — every proxied method call routes through it; foundational like the bootstrap-special set. |
| `grammar` | Convertible *in principle*, but only after a DI seam on the core `lib/stuff/Stuff.ts` (`getPresentation` → `GrammarApi.pluralize`) plus a pluralize fallback for the pre-registration window. High risk on the hottest core method to convert a small pluralize/article utility — **deferred as not worth the core-class destabilization** (decided 2026-06-14). The `Stuff._registerTouchFn` seam is the precedent if it's ever wanted. |
| `path-pattern` | A `lib/` glob-matching primitive, not an Api forwarding shell. |
| bootstrap-6 (`security`, `module`, `proxy`, `execution-context`, `stuff`, `mixin`) | The substrate every Idea is built from (chicken-and-egg). Stay forever. |

**`mml` was also dropped from Phase B** on inspection: `Mml` is a value
class (factory statics + instance methods, like `Quantity`/`Prose`/
`Scene`), not an `*Api` forwarding shell — there is no `MmlApi`. It stays
a value class; nothing to convert.

## Net result

Every genuinely-convertible Api in the codebase is now a thin,
security-gated forwarding shell over an HMR-able `/obj/api/<feature>`
logic singleton. What remains static is substrate (above), with a
structural reason per module. Full suite green throughout (final
**4153 passed | 2 todo**); tsc + `lint:gates` + eslint clean per commit.
