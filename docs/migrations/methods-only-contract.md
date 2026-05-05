# Migration: Methods-Only Inter-Stuff Contract

Convert every Stuff class and mixin in `lib/`, `obj/`, and `cmd/` so
that **inter-Stuff access goes through methods**. Public fields and
public accessor pairs become host-internal storage; outside callers
read and write via `getFoo()` / `setFoo()`.

The convention is documented in
[CLAUDE.md § Inter-Stuff Contract: Methods Only](../../CLAUDE.md#inter-stuff-contract-methods-only)
and the rationale (shadows intercept methods, not fields) is in
[call-security.md § Authoring shape](../subsystems/call-security.md#authoring-shape--explicit-declaration-declares-the-surface).

This document is the execution plan for the migration. Delete it once
the work has shipped.

## Starting Point

Branch `exit`, commit `cfe9b96`
(`refactor(shadow): exclude accessors from intercept set`). Working
tree clean. All 977 tests passing.

## Design Decisions (Locked)

These are settled before edits begin so the migration is mechanical.
Re-litigating them mid-migration costs more than picking imperfect
defaults and moving on.

### 1. Storage shape

**Plain field with TS `private` modifier; no `_foo` rename.**

```typescript
// Was
public name: string = '';

// Becomes
private name: string = '';
public getName(): string { return this.name; }
public setName(value: string): void { this.name = value; }
```

Rationale:
- TS `private` is compile-time only; runtime bracket access still
  works, so the `Hydrator`'s `instance['name'] = value` keeps
  functioning unchanged.
- No on-disk schema change. `persistentFields = ['name']` stays.
- Avoids a parallel `_name` slot for every field.

### 2. Invariant-bearing accessor pairs

**Keep the accessor as a `private` host-internal point; expose a
public method that delegates.**

```typescript
// Was
private _door: Door | null = null;
public get door(): Door | null { return this._door; }
public set door(value: Door | null) { /* invariant */ this._door = value; }

// Becomes
private _door: Door | null = null;
private get door(): Door | null { return this._door; }
private set door(value: Door | null) { /* invariant */ this._door = value; }
public getDoor(): Door | null { return this.door; }
public setDoor(value: Door | null): void { this.door = value; }
```

Hydrator's `instance['door'] = value` still fires the private setter
(bracket access bypasses TS visibility), so the invariant runs during
hydration.

### 3. Boolean naming

`getFoo()` for non-booleans, `isFoo()` for booleans:

```typescript
private hidden: boolean = false;
public isHidden(): boolean { return this.hidden; }
public setHidden(value: boolean): void { this.hidden = value; }
```

### 4. Mixin interfaces drop field declarations

The public interface companion to a mixin (`export interface Container`,
`export interface Containable`, etc.) drops field-shaped members and
keeps method-shaped ones only. The interface IS the contract surface;
fields aren't on it.

```typescript
// Was
export interface Containable {
  environment: Stuff & Container | null;
  getContainer(): Stuff & Container | null;
  setEnvironment(c: Stuff & Container | null): void;
}

// Becomes
export interface Containable {
  getContainer(): Stuff & Container | null;
  setEnvironment(c: Stuff & Container | null): void;
}
```

### 5. Framework carve-outs

Three slots stay accessible to framework code by name:

| Slot | Reason |
|---|---|
| `Stuff.stuffId` (readonly) | Identity pillar; in `PASSTHROUGH_KEYS`; read in every log line. Adding `getStuffId()` is gratuitous. Keep `public readonly`. |
| `Stuff.templatePath` | Read by `SecurityPolicies` and `StuffApi` indexes. Convert to method form for domain code; framework reads via bracket access (`(obj as any).templatePath`). Keep storage public. |
| `Stuff.zone` | Read by `ContainmentApi` for zone matching, by mixin code for derived exits. Convert to method form (`getZone()` / `setZone()`); framework can read via bracket. |

Domain code uses methods. Framework code (api/, security/) may bracket
the underlying field for performance. The `PASSTHROUGH_KEYS` list in
`proxy.ts` stays as-is — it's the proxy's existing carve-out for these
identity reads.

### 6. Test code is treated as external

Tests use methods like other Stuff. Where a test genuinely needs raw
state, reach for `obj[ProxyApi.RAW_TARGET]` with a `// test seam` comment.

### 7. Subclass / mixin layer access

Subclasses can't reach a parent's `private` field via TS, but they can
call inherited methods on `this`. So mixin code that needs to read
`this.foo` from a parent uses `this.getFoo()` (a method call, allowed
because methods aren't class-bounded).

A mixin's own private state stays accessible inside that mixin's class
body via `this.foo`.

### 8. `protected` is dropped

There's no remaining role for `protected`. Subclass extension points
go through methods (the parent declares a public/private method, the
child overrides it). Lifecycle hooks like `prepareDestroy()` stay
`protected` — that's a deliberate framework extension surface, not
inter-stuff state.

## Mechanical Patterns (Reference)

### Pattern A — non-invariant scalar/object field

```typescript
private foo: T = initial;
public getFoo(): T { return this.foo; }
public setFoo(value: T): void { this.foo = value; }
```

### Pattern B — boolean field

```typescript
private foo: boolean = false;
public isFoo(): boolean { return this.foo; }
public setFoo(value: boolean): void { this.foo = value; }
```

### Pattern C — optional field

```typescript
private foo?: T;
public getFoo(): T | undefined { return this.foo; }
public setFoo(value: T | undefined): void { this.foo = value; }
```

### Pattern D — invariant accessor pair

```typescript
private _foo: T = initial;
private get foo(): T { return this._foo; }
private set foo(value: T) { /* invariant */ this._foo = value; }
public getFoo(): T { return this.foo; }
public setFoo(value: T): void { this.foo = value; }
```

### Pattern E — readonly collection

```typescript
private readonly bar: Map<K, V> = new Map();
public getBar(): ReadonlyMap<K, V> { return this.bar; }
// Plus targeted mutators if external code needs them:
public addBarEntry(key: K, value: V): void { this.bar.set(key, value); }
```

### Pattern F — read-only structural field

```typescript
public readonly stuffId: string;  // exception per § 5
```

## Migration Order

Layered bottom-up. Each layer builds on the previous; running
`pnpm build` between layers surfaces every call site that needs
updating to the new method form.

### Layer 0 — base

- `lib/stuff/Stuff.ts`
  - `templatePath`: convert to method form (framework reads bracket).
  - `zone`: convert to method form.
  - `stuffId`: keep as `public readonly` (carve-out).

### Layer 1 — universal mixins

- `lib/spatial/Containable.ts` — `environment` field.
- `lib/spatial/Container.ts` — `inventory` field if present.

### Layer 2 — description mixins

- `lib/description/Visible.ts` — `shortDescription`, `longDescription`.
- `lib/description/Perceptible.ts` — `keywords` (the setter is a real
  invariant point: applies Pattern D).
- `lib/description/Detailed.ts` — `details` map.
- `lib/description/Named.ts` — `honorific`, `name`, `surname`,
  `nameSuffix`, `alternateNames`. `fullName` accessor stays as Pattern
  D internal; `getFullName()` is the public method.
- `lib/character/Gendered.ts` — `gender` field.

### Layer 3 — spatial mixins/classes

In order:

1. `lib/spatial/Sealable.ts` — `isOpen` (Pattern B with invariant ⇒ D).
2. `lib/spatial/Door.ts` — `attachedTo` set.
3. `lib/spatial/Exit.ts` — `direction`, `source`, `destination`/
   `destinationPath` (Pattern D with the existing accessor pair),
   `door` (Pattern D), `hidden`, `blocked`, `muffled`, `noFollow`,
   `oneWay`, `messageIn`, `messageOut`, `inverse`.
4. `lib/spatial/Exitable.ts` — `exits` map. (`hasPendingVerification`
   stays as readonly accessor on the interface.)
5. `lib/spatial/ExitableVessel.ts` — its own fields.
6. `lib/spatial/Vessel.ts` — fields.
7. `lib/spatial/Mobile.ts` — none today (settings-driven), confirm.
8. `lib/spatial/Zone.ts` — `name`, `locations`.
9. `lib/spatial/CartesianZone.ts` — `cellSize`, `grid` (private),
   inherited `locations` already covered.
10. `lib/spatial/SphericalZone.ts` — `focusIndex`.
11. `lib/spatial/CartesianCoordinates.ts` — `coordinates`.
12. `lib/spatial/SphericalCoordinates.ts` — `coordinates`, `radius`.
13. `lib/spatial/CartesianLocation.ts` / `SphericalLocation.ts` /
    `lib/stuff/Location.ts` — declarations they add on top.
14. `lib/spatial/DoorBearing.ts` — none expected; confirm.

### Layer 4 — other mixins & support

- `lib/message/Sensor.ts`, `lib/message/Vocal.ts` — fields.
- `lib/connection/HasInteractive.ts` — `interactive` field.
- `lib/command/CommandGiver.ts` — fields.
- `lib/persistence/Persistable.ts` — fields. Note Persistable is a
  framework concern; its CRUD methods (`save`, `find`) stay public.
  Internal state migrates.
- `lib/stuff/Propertied.ts` — internal `props`/`savedProps` storage
  becomes private; the public surface (`setProp`, `getProp`,
  `initProp`, `checkProp`) stays.
- `lib/stuff/Singleton.ts` — none expected.
- `lib/stuff/PostRegistration.ts` — none expected.
- `lib/identity/User.ts` — fields.
- `lib/identity/GoogleProfile.ts` — fields.
- `lib/stuff/Idea.ts`, `lib/stuff/Thing.ts`, `lib/stuff/Agent.ts` —
  inherited; confirm.
- `lib/stuff/Shadow.ts` — `host` and `interceptedMethods` are already
  read-only getters; check whether they migrate or stay.

### Layer 5 — concrete obj/

- `obj/Avatar.ts`, `obj/Login.ts`, `obj/Interactive.ts`,
  `obj/EventRegistry.ts`.
- `obj/command/*Controller.ts` — controllers carry view state; convert.
- `obj/hooks/DomainHook.ts`.
- `backend/Application.ts` — non-Stuff but holds wiring.

### Layer 6 — call-site fix-up

Run `pnpm build`. The compiler enumerates every external read/write
of a now-private field across:
- `api/*.ts` (framework call sites)
- `lib/**` (cross-mixin reads)
- `obj/**` (controller reads)
- `__tests__/**` (every test file)
- `backend/**`

Fix each:
- `obj.foo` → `obj.getFoo()` / `obj.isFoo()`
- `obj.foo = x` → `obj.setFoo(x)`

### Layer 7 — verification

```bash
pnpm build
pnpm test
```

977 tests pass. No regressions. Commit.

## Out of Scope / Deferred

These are NOT part of this migration. Calling them out so we don't
accidentally pull them in:

- **ESLint rule enforcement.** Codifying the rule in lint is a
  follow-up so new code doesn't drift. Not blocking the migration —
  we have the docs.
- **Hydrator runtime gate.** A frame-walking guard that throws when
  non-Hydrator code reflects into private fields would harden the
  carve-out. Not blocking.
- **Method-form for `stuffId`.** Carve-out per § 5.
- **Persistence schema renames.** `persistentFields` arrays keep their
  current names; on-disk MongoDB documents are unchanged.
- **Public accessor → method for non-Stuff types** (`Mml`, `Scene`,
  `CommandContext`, `CallFrame`, etc.). These are plain data
  structures, not Stuff. The rule doesn't apply.

## Verification Approach

- **Per-layer build.** After each Layer 0–5 batch, run `pnpm build`
  and confirm errors are confined to expected call sites. If errors
  hit unexpected files, stop and triage before continuing.
- **Final test run.** After Layer 7, `pnpm test` must pass with the
  same count (977) as the starting point (any new tests added during
  migration are explicitly noted).
- **Diff sanity.** Final diff should be predominantly
  `+ getFoo()/setFoo() pair` declarations and `s/obj.foo/obj.getFoo()/`
  call-site updates. Anything more substantive (logic changes,
  behavior shifts) is a red flag — back out and redo.

## Rollback Plan

The starting commit `cfe9b96` is the safety net. If the migration
turns up architectural issues we hadn't anticipated:

```bash
git reset --hard cfe9b96
```

Granular rollback: each Layer can be its own commit during execution,
squashed at the end. So if Layer 3 surfaces a problem after Layer 0–2
landed, we can `git revert` Layer 3 specifically.

## Estimate

Rough scale, based on a survey of the source tree:

- **Layers 0–5:** ~25 files modified, ~80–120 method pairs added.
- **Layer 6:** call-site updates across ~50–80 files (heavily skewed
  toward tests, where most accidentally-direct reads live). Most are
  one-liners.
- **Diff size:** 2,000–3,500 lines of diff is plausible. Mechanical.

Single focused branch off `cfe9b96`. Multiple commits during execution
(one per layer is a reasonable cadence); whether to squash at the end
is up to the reviewer.
