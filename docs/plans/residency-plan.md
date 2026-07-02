# Residency (self-eviction of the cold tail) — implementation plan

> Plan for [residency-requirements.md](../requirements/residency-requirements.md),
> seeded by [residency-slate.md](../slates/builds/residency-slate.md).
> Phase 1 (requirements) closed; this is the *how*. Retires at
> `/finalize` per [workflow.md](../workflow.md).

## Verification of the two planning risks

**Risk 1 — the `*Logic → ApiLogic` migration is clean.** Every backing
class under `obj/api/` is a bare `export class XLogic extends Idea` — all
62 (`obj/api/*Logic.ts`; the directory contains only `*Logic.ts` files
plus `__tests__/`). **None** composes a mixin over `Idea` (no
`extends Foo(Idea)` anywhere in `obj/api/`). The migration is therefore
purely mechanical: swap the base and the import. `instanceof Idea` is
preserved because `ApiLogic extends Idea`.

**Risk 2 — the touch chokepoint already exists and is wired, but not to
spec.** `api/proxy.ts` intercepts every dispatch in `ProxyApi.wrap`'s
get-trap (getter branch ~164; method-wrapper branch ~202) and runs the
pipeline via `#runPipeline`. The single registered interceptor is
`SecurityApi.#securityGate` (`api/security.ts` ~566). Inside its
`proceed()` closure (~646) it **already** calls
`SecurityApi.#touchFn?.(ctx.target)`, late-bound to `Stuff.touch` via
`_registerTouchFn`. And `lib/stuff/Stuff.ts` **already** carries an
anticipatory scaffold: `#lastTouchMs` (~484), `Stuff.touch(stuff)` static
(~500), `Stuff.getLastTouchMs(stuff)` static (~508) — with a doc comment
referencing "the future GC sweep's `considerSelfDestruct(context)`." This
build completes and corrects that scaffold. Gaps vs. requirements:
- Fires on **getters too** (`proceed()` runs for `ctx.isGetter`) → gate on `!ctx.isGetter`.
- Writes `Date.now()` **per dispatch** → switch to the cached tick.
- `#`-private + **static** seams vs. the required `private lastTouched` + instance `touch()`/`getLastTouched()` (see D-A).
- Static Api calls (no `Stuff` receiver) never enter `ProxyApi.wrap`, so they can't self-touch — sane by construction. Sweep reads via `RAW_TARGET`/`ProxyApi.unwrap` also bypass the pipeline.

### Load-bearing reconciliation decisions

- **D-A (field surface).** Requirements specify `private lastTouched` +
  instance `touch()`/`getLastTouched()`. Live code has `#lastTouchMs` +
  static seams that already work (they unwrap via `RAW_TARGET`,
  sidestepping the proxy-`this` problem). **Recommendation: follow the
  requirement** — instance surface. The gate calls `ctx.target.touch()`
  (ctx.target is the *raw* Stuff), so the body runs un-proxied with
  `this === raw`, writing `this.lastTouched` directly — no recursion, no
  self-touch, and the `_registerTouchFn` indirection can be **removed**
  (an instance-method call needs no `Stuff` value-import, so the
  `security → stuff` cycle never forms). Lower-risk alternative: keep the
  proven `#`/static scaffold, rename `getLastTouchMs → getLastTouched`,
  add `canEvict` + the cached tick. Pick one in Phase 1; the rest is agnostic.
- **D-B (the "cached tick").** Interpret as a **cached epoch-ms snapshot**
  refreshed ~1/sec, not a bare counter — so
  `EvictionContext.idleMs = Date.now() - getLastTouched()` falls out
  cleanly. Module-level `residencyNowMs` in `Stuff.ts`, refreshed by a
  gated static `Stuff._advanceResidencyClock()` (caller-allowlisted to
  ResidencyLogic, reusing the `#assertStampGateAllowed` allowlist ~326).
  `touch()` writes `this.lastTouched = residencyNowMs`. Refresh runs on a
  dedicated ~1/sec `ScheduleApi.recurring` owned by ResidencyLogic.

## Phase 1 — `Stuff` base: `canEvict`, `EvictionContext`, recency surface, cached clock

Base-class primitive in isolation; nothing sweeps yet.
- `lib/stuff/Stuff.ts`: add `public canEvict(context: EvictionContext): VetoResult { return { ok: true }; }` with `@hook` (mirrors `canDestruct` prose ~208-217; lands in the **extension** doc tier). Shadowable + ungateable like `canDestruct`/`onDestruct`.
- Reconcile the recency slot per **D-A**: `private lastTouched: number` (init to `residencyNowMs` at construction so fresh clones start warm), instance `touch()` / `getLastTouched()`. Retire/repoint the `#lastTouchMs`/static/`_registerTouchFn` scaffold + its `considerSelfDestruct` doc comment.
- Module-level `let residencyNowMs = Date.now()` + gated static `Stuff._advanceResidencyClock()` (allowlist the ResidencyLogic module in `#stampGateAllowlist`). Optional cached `dispatchTouchEnabled` flag for D-touchSignals.
- Define `EvictionContext` = `{ idleMs: number; reason: 'idle' }`, shaped to extend. Reuse `VetoResult` (lib/errors.ts:30); no new result type.

**Tests:** `canEvict` defaults `{ ok: true }` + overridable; `touch()`/`getLastTouched()` round-trip; fresh Stuff is warm; `_advanceResidencyClock` throws from non-allowlisted caller.

## Phase 2 — Proxy-dispatch touch hook (finalize existing wiring)

- `api/security.ts` `#securityGate` `proceed()` (~646): gate touch on `!ctx.isGetter` (+ cached `dispatchTouchEnabled`); switch `Date.now()` → cached-tick write (`ctx.target.touch()` per D-A). Denied calls still don't touch (write stays after the policy check).
- `api/proxy.ts` unchanged — seam is the right home; `RAW_TARGET` reads bypass via `PASSTHROUGH_KEYS` (~95).

**Tests:** dispatched method bumps `getLastTouched()`; getter read does **not**; `RAW_TARGET`/`unwrap` read does **not**; policy-denied call does not touch.

## Phase 3 — `ApiLogic` base + full `*Logic` migration

- New `lib/stuff/ApiLogic.ts`: `export class ApiLogic extends Idea { public canEvict(): VetoResult { return { ok: false, reason: 'load-bearing logic singleton; never culled' }; } }`. Framework base class (Stuff-class category, `lib/stuff/`), not a new module category; no new top-level branch. Sanctioned home for future shared logic-singleton concerns.
- Mechanically migrate all 62 `obj/api/*Logic.ts`: `extends Idea` → `extends ApiLogic`, import `../../lib/stuff/Idea` → `../../lib/stuff/ApiLogic`. `ResidencyLogic` (P5) is born `extends ApiLogic`. `WeatherLogic`'s `@Unshadowable` preserved.
- **Statefulness (extra-justified, migration unaffected):** `RenownLogic`/`ConsumerLogic`/`ProducerLogic` (ScheduleHandle loops + caches), `MqlSubscriptionLogic`/`PresenceLogic` (live subscriptions), `ScriptLogic` (AST cache), `ConnectionLogic`/`TwitchLogic`/`SchedulerLogic`/`WorldClockLogic` (bridges/handles) — all singletons resolved via `singletonSync`, all covered uniformly by the `ApiLogic` veto.

**Tests:** `ApiLogic.canEvict` vetoes; a migrated `*Logic` is `instanceof Idea` **and** `canEvict().ok === false`; an enforce sweep leaves a `*Logic` alive.

## Phase 4 — The veto roster

`Stuff.canEvict` base stays `{ ok: true }`. Every veto is a `super.canEvict()`-composed override on the mixin/class that *owns* the concern — base `Stuff` must not import Container/Shadow/Avatar/Exit knowledge. Mind mixin composition order (`Container`/`Behaved` are mixins — the override goes in the mixin body, most-derived wins).

### (A) Categorical infrastructure vetoes
- **Stateful registries (`PostRegistrationMixin(Idea)`, in `obj/`):** `ReactionRegistry`, `MqlSubscriptionRegistry`, `OfficeRegistry`, catalogues (`TopicCatalogue`, `SoulCatalogue`, `RecipeCatalogue`, `ChannelCatalogue`, `DisciplineCatalogue`, `CorpoCatalogue`, `SubjectCatalogue`, `BulletinBoard`, `HelpCatalogue`), `ForumSubscriptionRegistry`, `GroupRegistry`, `EventRegistry`, `StreamState`. Can't ride `ApiLogic` (not `*Logic`); can't blanket-protect on `PostRegistrationMixin` (also worn by cullable `NPC`). Already veto `canDestruct` — add `canEvict` as the clean consent gate; model on existing prose.
- **`Interactive`** (`obj/Interactive.ts`) — live session, bare `findByTemplatePath` (no self-heal); veto.

### (B) Relational / structural vetoes — derived from R2.x
**Principle:** the attachment relationships that require coordinated cleanup on destruct (ref-shapes.md R2.1–R2.4) are the ones that require veto-coupling on evict — **an object in an R2.1-owned / R2.2-symmetric relationship vetoes while its anchor is alive.** Self-knowable (the object sees its own side of the edge), so no reverse-ref index. Each on the owning mixin:
- **`Container`** (`lib/spatial/Container.ts`) — veto while `getContents().length > 0` (surface ~59/310). Bottom-up: cold contents cull first, the emptied container culls later; R2.4 owning-cascade never destructs a subtree from under itself.
- **`Containable` inside an interactive holder** (`lib/spatial/Containable.ts`) — walk the chain (`getContainer()`/`getRootContainer()` ~261/279); veto if any ancestor is `MixinApi.isHasInteractive` (Avatar/Login — avoids importing `Avatar` into `Containable`). Protects a *disconnected-but-in-memory* avatar's inventory that presence-touch (P6) doesn't reach. Complements the container veto.
- **A shadow while its host is alive** (the shadow class — locate under `lib/security/`/`ShadowApi`) — veto while `host.isDestroyed() === false`. **One-directional:** attached defers to anchor, never the reverse (host destruct's `_detachAllForHost` orphans the shadow, next sweep reaps it). Check `isDestroyed()`, **not** `host.canEvict()` — no recursion. Orphaned/dead-host shadow culls.
- **`Exit` / `Adornment` while its room/wall lives** (R2.1 owned; `lib/boundary/`) — veto while owner `!isDestroyed()`, else the sweep culls an exit from under a live room.
- **`Postured` host with a posed occupant / any engagement-subject** (`lib/posture/Postured.ts`, `lib/activity/`) — veto while occupied/in-use.
- **`Behaved`** (`lib/behavior/Behaved.ts`) — the actor-side engagement veto, **plus** veto while holding a behavior spec: `getEngagements()` (`lib/activity/Engaged.ts` ~70/127) non-empty, or `behaviors?.length > 0` (Behaved.ts ~94). Authored cast.
- **`Location`** (`lib/stuff/Location.ts`) — authored locations veto; ephemeral/`Warren`-bud (`lib/location/Warren.ts`) overrides back to cull-when-empty (via the `getTemplatePath()`/bud-marker distinction).

**Tests:** registries/`Interactive`/catalogue survive enforce sweep; non-empty `Container` vetoes then empties→culls; `Containable` inside an `Avatar` (connected *and* disconnected-in-memory) vetoes; shadow with a live host vetoes, orphaned shadow culls, shadow veto reads `isDestroyed()` not `canEvict()` (assert no host-defers-to-shadow recursion); `Exit` on a live room vetoes; `Postured` host with occupant vetoes; engaged/spec `Behaved` vetoes; authored `Location` vetoes, `Warren`-bud culls when empty.

## Phase 5 — `ResidencyApi` + `ResidencyLogic` + AppSettings knobs

The sweep, observe-first (goes live safely).
- **`obj/api/ResidencyLogic.ts`** (`@internal`, `extends ApiLogic`, registers at `/obj/api/residency`; module-id ≠ template per the `*Logic` exception). Owns two retained `ScheduleHandle`s: ~1/sec clock-refresh calling `Stuff._advanceResidencyClock()`, and the sweep on `residency.sweepIntervalMs` (both `ScheduleApi.recurring`, `runRoot`-wrapped; never `setInterval`).
  - **Lazy O(n) scan:** iterate `StuffApi.getAllObjects()` (~997, prunes destroyed, returns **proxies**). **Unwrap via `ProxyApi.unwrap`/`RAW_TARGET`** and read `raw.getLastTouched()` + `raw.canEvict(ctx)` on the raw target (no self-touch). `idleMs = now - lastTouched`; skip if `< idleThresholdMs`; else if `canEvict(ctx).ok`: observe → structured log; enforce → `StuffApi.destruct(obj)` (full choreography).
  - **Defensive:** wrap `destruct` so a residual `canDestruct` `DestructError` is logged and the loop continues (`canEvict`/`canDestruct` are independent).
  - Knobs via `AppApi.setting` (sync cached). Mode re-read each sweep → flip without restart. Parse `touchSignals` on the clock tick, mirror `dispatchTouchEnabled` + presence flag into `Stuff` via the gated seam (no per-dispatch AppSettings read).
- **`api/residency.ts`** — `ResidencyApi` forwarding shell (`renown.ts`/`app.ts` `logic()`+`singletonSync` pattern): `touch(stuff)`, `boot()`, sweep entry. Ends `SecurityApi.decorateApiClass`. Nothing imports `ResidencyLogic` directly.
- **Boot:** `ResidencyApi.boot()` in `backend/AppBootstrap.ts` after `AppSettings.warm()` (~166) + manifest clones. Default `observe` culls nothing.
- **AppSettings:** add keys to `lib/config/AppSettings.ts` `AppSettingKeys` + seed in `config/app-settings.yaml` (`reactions.*` block is the shape precedent): `residency.mode` (`observe`, default), `.sweepIntervalMs`, `.idleThresholdMs`, `.touchSignals`.

**Tests:** observe culls nothing + logs; enforce culls idle non-vetoing `Containable`/orphaned shadow/idle stateless clone via `destruct` (assert `onDestruct` + R2.x); recently-dispatched object skipped; sweep reads via `RAW_TARGET` w/o resetting recency; `residency.mode` toggles live; `ScheduleApi.recurring` asserted (`RenownLogic.test` precedent).

## Phase 6 — Presence-walk supplement

Pure touch-source addition; sweep works without it. Gated by `touchSignals`.
- In `ResidencyLogic`, replicate `WeatherLogic.runBoundaryFanout` (~271): `ConnectionApi.getAllInteractives()` → `getHolder()` → room `getContainer()` → `room.getDeepContents()` → `ResidencyApi.touch(each)`. Dedup rooms by `stuffId`. Touch source, not a pin.

**Test:** presence keeps an occupied room's contents warm across a sweep; removing the occupant lets them cull.

## Phase 7 — Docs + taxonomy update

- New `docs/subsystems/residency.md`: mechanism, `EvictionContext` extensibility, recency signal + cached tick + no-self-touch, lazy-scan-not-LRU rationale, eviction-is-`destruct`, observe-first + knobs, `ApiLogic`, the veto roster, deferred seams (memory-pressure trigger, retained-footprint field, incremental sweeping, the reset sibling).
- `CLAUDE.md`: add the residency row to the Documentation Map; update the **Module Categories** "Api logic singleton" row from "`extends Idea`, no `PostRegistrationMixin`" to `extends ApiLogic`.
- Retire the stale "Open Design — Idle Eviction" section in `docs/subsystems/lifecycle.md` (~447-472) → cross-reference `residency.md`.

## Ordering constraints & trade-offs

- **P1 before P2 and P3.** P4 needs P1's `canEvict` (independent of P3). P5 needs P1-P4 but ships observe-safe before vetoes are exhaustive; "registries survive" tests need P4. P6 last, additive.
- **D-A trade-off** — instance surface (delete `_registerTouchFn`, touch load-bearing base + gate) vs. the proven `#`/static scaffold (reuse tested wiring, diverge from the requirement's surface). Decide in P1.
- **One vs two timers** — dedicated ~1/sec clock-refresh honors "advanced ~once/sec" and decouples recency granularity from sweep cadence; collapsing into the sweep tick ties recency to `sweepIntervalMs`. Recommend two.
- **touchSignals enforcement** — cached boolean mirrored into `Stuff` (no per-call AppSettings read); or make dispatch-touch unconditionally on and let `touchSignals` gate only the presence supplement.
- **Constraint — sweep must unwrap.** `getAllObjects()` returns proxies; read `getLastTouched`/`canEvict` through `RAW_TARGET`/`unwrap`, or the sweep self-touches everything and nothing goes cold. The single most likely correctness bug; dedicated test.
- **Constraint — `canEvict`/`canDestruct` independence.** Enforce path tolerates `DestructError` (log + continue).

## Critical files
- `packages/server/src/mud/lib/stuff/Stuff.ts`
- `packages/server/src/mud/api/security.ts`
- `packages/server/src/mud/lib/stuff/ApiLogic.ts` (new)
- `packages/server/src/mud/obj/api/ResidencyLogic.ts` (new) + `packages/server/src/mud/api/residency.ts` (new)
- `packages/server/src/backend/AppBootstrap.ts`
- the 62 `packages/server/src/mud/obj/api/*Logic.ts` (mechanical migration)
