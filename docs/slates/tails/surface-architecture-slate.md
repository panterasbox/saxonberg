# Surface architecture slate (working doc)

Working slate for a cross-cutting refactor of **the public surface** —
how the `api/` layer, `lib/` modules, and their exported types compose
into a single, documentable boundary that content authors consume and
nothing else leaks past. The throughline: the things an author can
**call**, the things an author can **see** (generated docs), and the
things an author must **import** should be *the same boundary*, and the
code should be structured so that boundary falls out mechanically rather
than by per-symbol taste.

This is a **design-exploration slate**, captured from a single
conversation (2026-06-13). No requirements or plan yet — by explicit
decision this refactor is done **in isolation on a stable master**, with
no other builds in flight (it touches `api/`, `lib/`, call-security, and
the module taxonomy game-wide, so it cannot share a tree with active
feature work). Draft requirements only once master is quiet.

File/symbol references below were traced against `build-3` on the capture
date; treat them as orientation, re-verify before building (lines will
have drifted).

See also:

- [docs/architecture.md](../../architecture.md) — three-layer
  architecture, Manager-vs-Api split, mixin organization, file
  structure. This slate revises its module taxonomy.
- [docs/antipatterns.md](../../antipatterns.md) — "go through the Api
  layer" rules; the new placement/leakage rules land here.
- [docs/subsystems/call-security.md](../../subsystems/call-security.md)
  — `FromModule` / `ApiOnly` policies, the narrow-entry pattern, the
  four bootstrap-special Apis. The leakage guard rides this.
- [docs/subsystems/hot-reload.md](../../subsystems/hot-reload.md) —
  `HotReloadApi.getCurrentExport`, `StuffApi.clone` integration,
  controller-as-template dispatch. The singleton mechanism rides this.
- [docs/subsystems/mixins.md](../../subsystems/mixins.md) — mixin
  module shape; the type-placement rules touch it.
- [docs/subsystems/app-settings.md](../../subsystems/app-settings.md) —
  the `AppSettings`/`AppApi` state-extraction precedent that seeded
  this whole line of thinking.
- [docs/subsystems/mql.md](../../subsystems/mql.md) — path-vs-stuffId
  resolution; underwrites singleton addressing.
- [authoring-intelligence-slate](../builds/authoring-intelligence-slate.md),
  [help-slate](../builds/help-slate.md),
  [compile-diagnostics-slate](../builds/compile-diagnostics-slate.md) —
  **downstream consumers**: they document/serve the author surface this
  refactor defines. The cleaner the surface, the better those land.
- [tails/persistence-architecture-slate](./persistence-architecture-slate.md)
  — sibling "rework a shipped layer's architecture" slate; same shape.

The colocate-types memory (`feedback_mixin_interface_colocation`) and the
no-new-Apis / no-premature-registries feedback memories are the standing
constraints this slate operates inside.

---

## Thesis

> The Api/mixin **face** of a concept should be simultaneously the
> **call boundary** (call-security), the **visibility boundary**
> (generated docs), and the **import boundary** (where types resolve
> from). One line, three jobs. Everything below is in service of making
> those three coincide.

The motivation is ultimately **documentation/discoverability** (see
Thread 6): we want a small, precise, author-facing surface and a way to
find any member of it. The structural moves (HMR singletons, call-security
gating, type placement) are how the code produces that surface cleanly.

---

## Thread 1 — Api internals move to HMR `Stuff` singletons

**Problem.** Api classes are *not* hot-reloadable (static classes,
direct imports). We keep that — the Api stays the stable, typed,
secured boundary. But the **logic** inside an Api is the thing we edit
constantly, and it can't reload. Precedent: the `AppSettings`/`AppApi`
move pulled *state* out of an Api into a singleton; this does the same
for *logic*.

**Sharpening.** `AppSettings` is a `Document` with a static `_cached`
instance — and that cache is **not** HMR (editing it needs a restart).
That was fine for *state* (state should survive, not reload). Logic is
the opposite: we move it precisely to gain HMR. So the home is not a
`Document` singleton but a **`Stuff` singleton**, because only `Stuff`
flows through `StuffApi.clone()` → `HotReloadApi.getCurrentExport()` and
therefore picks up new code.

**Decision.**

- The Api class keeps: the typed public surface, `SecurityApi.decorateApiClass`, and thin forwarding. Its body moves out.
- The body becomes a **stateless `Stuff` singleton** the Api delegates to.
- **All these singletons are stateless** (state already externalized in prior waves). The genuinely-stateful Apis (`StuffApi`'s `byId`/`byTemplatePath` registry; `ScheduleApi`'s live timers) stay pinned — their state must survive reload, and `StuffApi` is the bootstrap `clone()` itself depends on (chicken-and-egg). The user is aware of, and accepts, the reload implications for those; they are explicitly out of scope.

**Reload mechanics (user's model).** No automatic invalidation routing
to design. The `dest` command (`StuffApi.destruct`) is the invalidator,
same as for any `Stuff`. Reload = `dest` the singleton; the next callsite
lazily re-creates it, picking up the new class. Statelessness makes
destruction free.

**The two-singleton shape for stateful Apis.** The deep reason the logic
singleton must be stateless: **reload == `dest` == state loss.** HMR-able
logic and pinned state therefore *cannot* share one object. So any Api
that has state ends up **two-layered**:

```
FooApi (statics, thin forwarders)
   ↓
stateless logic singleton   ← NEW, HMR-able (dest-to-reload), /obj/api/foo
   ↓
stateful singleton          ← the state home, pinned, never dest
```

The logic singleton sits in the middle and reaches down for state — the
way `AccessApi` reaches `AccessRegistry` today, just with the
orchestration logic relocated out of the Api statics into the middle
layer. Some Apis already did the state-extraction wave (`AccessApi`→
`AccessRegistry`, `SoulApi`→`SoulCatalogue`) and only the **logic** layer
remains to insert; stateful Apis whose state is still on Api statics
(e.g. `ScheduleApi` timers) must pin their state somewhere first.

**Consequence for the gate:** inserting the middle layer **re-points the
stateful singleton's caller** — from `FromModule(FooApi)` to the logic
singleton (`FromTemplate('/obj/api/foo')` or its class module). The
caller of `AccessRegistry` stops being `AccessApi` and becomes the logic
singleton. Mechanical, but the sweep must make this edit.

---

## Thread 2 — The sync singleton accessor (the one new primitive)

**Problem.** Lazy-loading the singleton at the callsite via
`StuffApi.clone()`/`singleton()` is **async**, which would force every
Api method to become `async`. Not worth it.

**Finding.** The async in `clone()` is *not* intrinsic to "make a Stuff."
It comes from things a stateless, data-less logic singleton doesn't need:

- `await Template.findByPath()` — a Mongo round-trip for the template doc.
- lazy `await import('../lib/stuff/Template')` / `await import('./zone')` — cycle-breaking imports.
- hydration over `template.data`.

The one piece we *do* need — resolving the hot-reloaded class — is
**already synchronous**: `HotReloadApi.getCurrentExport()` is a Map
lookup, called without `await` in `StuffApi.#cloneInner`. And a sync
creation path already exists: `StuffApi.createSync(factory)` (built for
"this Stuff has no async setup").

**Decision — new primitive `StuffApi.singletonSync(path, factory)`:**

- Sync `byTemplatePath.exact(path)` → return the cached instance if present.
- Else `createSync(factory)` + stamp the path (existing `Stuff._stampTemplatePath` seam) + register.
- The **factory must resolve the blueprint**, not just `new`:
  ```ts
  () => {
    const Cls = HotReloadApi.getCurrentExport(modulePath, "FooLogic") ?? FooLogicStatic;
    return new Cls();
  }
  ```
  A naive `() => new FooLogic()` would rebuild the *same old class* after a reload — the `getCurrentExport` check is the load-bearing line that makes "dest → next call is fresh" actually pick up the edit.

**Why the registry, not an Api-static cache:** keying the instance in
`byTemplatePath` means `destruct()` unregisters it for free, so the next
call sees an empty bucket and re-creates. An Api-held static field would
leave a dangling reference after `dest`.

Reuses four existing seams: `createSync`, `getCurrentExport`,
`byTemplatePath`, `_stampTemplatePath`. **One new method on `StuffApi`,
no new Api, no registry singleton, no file watcher.** Statelessness is
*load-bearing*, not convenient — stateless + data-less is exactly the
condition that lets creation skip the template/DB/hydrate pipeline and be
synchronous. Individual logic methods stay `async` iff they do async
work (unchanged); only *fetching* the singleton is sync.

---

## Thread 3 — Addressing & discovery of the singletons

**Problem (raised).** Without a template-path stamp you can only reach a
singleton by stuffId.

**Finding.** MQL path resolution (`api/mql/resolver.ts`, `case 'path'`)
consults the **runtime `byTemplatePath` index first** (`findByPathGlob`),
and only falls back to Template docs (`findTemplatesByPath`) for non-glob
misses. So a `singletonSync`-stamped singleton is **MQL-addressable by
path immediately, with no Template doc** — we do not drag the DB pipeline
back in. (The existing catalogues — `AccessRegistry`, `TopicCatalogue`,
`SoulCatalogue`, `ChannelCatalogue` — carry 2-line `class:/data:{}` YAML
seeds only because they boot through the *async* `singleton()`→`clone()`
path. Ours skip that, so they skip the seed.)

**Reframe.** The **stuffId is the wrong handle** — every `dest`+recreate
mints a new instance with a new stuffId, so a stuffId reference breaks on
exactly the reload operation the design is built around. The **path is
the stable handle.** Don't make the stuffId easy to find; make sure
nobody needs it.

**Decision.**

- **Path convention `/obj/api/<feature>`** — the exact sibling of `/obj/command/<category>` for controllers. `FooApi` → `/obj/api/foo`, derivable from the Api name, never looked up.
- **Discovery is free via glob:** `/obj/api/*` in MQL lists every *live* api singleton; `dest /obj/api/foo` works (resolver hands `dest` the resolved Stuff — path works everywhere stuffId does).
- If code ever needs the raw id: a one-liner on the Api (`findByTemplatePath(path).getId()`), flagged ephemeral.
- **Known gap:** lazy creation means `/obj/api/foo` resolves to nothing until first use (no live instance, no Template doc to fall back on). To enumerate *un-materialized* apis you'd need a static path list (a mild registry) — **deferred** until it bites; glob-over-live covers the real case.

User accepts this is "a bit of a special carve-out" and doesn't mind —
the Api layer is a first-class citizen.

---

## Thread 4 — `api/` vs `lib/`, and leakage protection

**Principle.** Limit the Api surface to methods **actual content
developers** call. If a method's only consumer is `lib`, it should live
in `lib`. Problem: `lib` must export it for the Api to use it, but
nobody else should be able to import/use it — "that's the whole point."

**Reframe that dissolves the worry.** Protection is at the **call**, not
the **import**. Call-security gates at call time on the caller's
execution-context frame, regardless of who imported. So:

> Export freely. Anyone may import. Only the owning Api can successfully
> **call** — everyone else throws `SecurityError`.

This is *stronger* than import-hiding (runtime, unbypassable, `@Final
@Unshadowable`, survives HMR because it matches the stamped module URL,
not the class object). Stop preventing imports; gate calls.

**The constraint that forces the design** (this is also the user's later
doubt, resolved): call-security gates **only two callee shapes** — a
`Stuff` instance method (via the `ProxyApi` proxy) and an Api static
method (via `decorateApiClass`). **A plain exported `lib` function — or
a static method on a plain `lib` class — cannot be gated at all.** So
protection-needing internal logic *must be `Stuff`-shaped*.

**This is exactly the Thread-1 singleton.** The two threads converge:
the HMR logic singleton is *also* the protected internal-logic home.
Gate its (instance) methods with `FromModule('mud/api/foo#FooApi')` (set
once at class level, mirroring `AccessRegistry`/`SchedulerRegistry`).
One object: hot-reloadable (T1) **and** callable only by its Api (T4).

**Caller-side doubt, verified against code.** "Call-security assumes a
`Stuff` instance" is true *for the callee* (must be a proxy-wrapped
instance method — our singleton is) but **false for the caller**:

- `resolveCallerPath` (SecurityPolicies) branch `(2b)`: `if (typeof caller === 'function') return ModuleApi.lookup(caller)` — comment literally reads *"Caller is a class itself (static-method synthesised frame)."* A static Api class is a first-class caller identity.
- The `decorateApiClass` static wrapper (`SecurityApi.#wrapStaticDescriptor`) runs the body inside `ExecutionContextApi.run(caller, cls, methodName, …)` — frame **target = `cls`**, the Api class. That's what the singleton sees as its caller.

Verified chain: `FooApi.bar()` → frame target `FooApi` → calls
`singletonProxy.doThing()` → proxy reads caller `FooApi` →
`FromModule('mud/api/foo#FooApi')` resolves via lookup → **allowed**; any
other caller → different module id → **denied**. Fully supported path,
not an edge.

**The leftover (Api-less internal logic shared between `lib` modules):**

- On a `Stuff`/mixin → gate `FromModule('mud/lib/<subsystem>/**')` or `AnyOf(...)` the specific siblings.
- A plain function → call-security can't help; complement with a **lint import-boundary rule** (only `mud/api/**` may import `mud/lib/**/internal/*`). Compile-time, not runtime, but stops the leak at review.

**Taxonomy revision.** CLAUDE.md currently says "cross-cutting helpers
default to an Api class; no free-floating helper modules." This thread
narrows it: the Api is for the **dev-facing surface**; internal
cross-cutting logic gets a legitimate non-Api home — **but
protection-needing internal logic must be `Stuff`-shaped**, because
that's the only internal shape call-security can defend. Plain helpers
stay discouraged precisely because they're undefendable.

Policy vocabulary available (call-security): `Public`, `SystemRoot`,
`SelfOnly`, `ApiOnly` (=`FromModule('mud/api/**', {includeSubclasses})`),
`FromModule(glob, opts)`, `FromTemplate(glob)`, `FromController(...)`,
`Custom`, `AllOf`/`AnyOf`/`Not`. No `FromModules([])` — compose with
`AnyOf`. `FromModule` supports globs and `includeSubclasses`.

---

## Thread 5 — Where exported types & constants live

**Survey result:** the practice is already ~99% consistent — the *only*
`types.ts` in the tree is `api/mql/types.ts`; no barrels; every other
type rides a class/mixin/Api module. So the convention exists; the fight
is that the **taxonomy never names the category an orphan type belongs
to**, so an agent finds "no module fits → dump in `types.ts`." It's a
*taxonomy gap*, not a discipline failure.

**Generative rule (one sentence that produces every case):**

> A module exists to define exactly one **named concept**; the filename
> is that concept's name; the concept is the primary export. Every other
> export is a supporting member of that one concept — the types its
> surface speaks in, the constants it's parameterized by, the vocabulary
> it operates over.

A type/constant is never itself the reason a module exists (except when
the concept *is* a value-object/registry — then the module is named for
it, e.g. `Light`, `Quantity`, `Reserve`, `TemplatePaths`, the `Mixins`
registry — never `types`). `types.ts`/`constants.ts`/barrel `index.ts`
are forbidden by construction.

**The missing 4th lib category to add to the taxonomy** (the actual
fix): alongside *Stuff class / Mixin / Api*, name the **named
value-object / vocabulary / registry module** — the sanctioned home for
a substrate primitive that isn't an instanceable `Stuff` (`Light.ts`,
`quantity.ts`, `reserve.ts`, `paths.ts`, `mixin.ts`). Naming it kills
the `types.ts` reflex.

**Decision rules:**

1. Interface/option/result/handle of a class/mixin/Api → that module.
2. Vocabulary (enum-like union + its validation array + derived type) → the concept's owning module; derive the type from the const (`type Posture = (typeof Postures)[keyof typeof Postures]`).
3. Shared across modules → the **upstream concept the others already depend on** (follow dependency arrows to source; `SenseChannel` in `Perceiver.ts`). Never a neutral middle file.
4. Constants colocate with their concept; platform-wide registries get a *named* module (`lib/mixin.ts`, `lib/paths.ts`) — still one-concept, not a dumping ground.

**Sealed subdirs (`api/mql/`, `api/mml/`, parser guts) — the don't-care
zone.** A split-Api subdir is that Api's **private implementation
package**: only the parent `api/<x>.ts` imports from `api/<x>/**`, and it
re-exports the consumer surface. Internal shape is free to churn — sealing
is what licenses not caring (the import-boundary half of Thread 4).
Enforcement is a **lint** ("only `api/<x>.ts` may import `api/<x>/**`"),
not call-security — parser modules are plain functions/classes, so the
runtime gate can't reach them (the Thread-4 "plain function → lint"
leftover, made concrete). Joins the Phase-2 lint family.

**`api/mql/types.ts` — RESOLVED: fine as sealed-internal scaffolding.**
The no-`types.ts` rule governs the *navigable/consumed* surface (so a
consumer can find a type); a `types.ts` only the parent imports is not a
discoverability problem. Keep it, on two conditions: the seal holds
(lint), and the consumer-facing subset is re-exported from `api/mql.ts`.
The naming rule applies *past the seal*, not behind it. `@saxonberg/types`
is exempt for the separate reason that it's a different *package* (cross-
package wire contracts); not precedent for an in-package `types.ts` on the
consumed surface.

---

## Thread 6 — The real motivation: a documented author surface

The point of the discoverability push is **documentation** (TypeDoc →
`api-model.json` → the in-game `help api` browser). The author surface is
exactly three things; an author should care about **nothing else** (not
backend, not random module function exports):

1. **`public static` methods of author-facing Api classes.**
2. **`public` *methods* of author-facing `Stuff` classes + the mixin-conferred interfaces** — *methods only*. Public *fields* (present for the Hydrator) and accessor pairs are **excluded**, even though `public` — this is the inter-stuff "methods are the contract" rule expressed as a doc filter.
3. **The transitive closure of input/output types referenced by the signatures in (1) and (2) — and the extension hooks in the tier below.** (An author implementing `applyX` needs its param type, so the closure walks hook signatures too.)

**Key liberation: surface (3) is *computed*, not declared.** A type is in
the author surface *iff* it appears in a documented method's signature. A
projection over the TypeDoc model walks the documented method signatures
and pulls in their param/return types **wherever they physically live**.
So the "tough decisions finding homes" are **decoupled from
discoverability** — place a type for cohesion/cycle-breaking; the
projection still surfaces it. Home-finding becomes code hygiene (Threads
5/7), not a discoverability blocker.

**The decision burden that remains is coarse — one tag per concept:** is
this Api / mixin / `Stuff` class **author-facing or engine-internal**?
Engine-internal ones get `@internal` and drop out wholesale (`ModuleApi`,
`SecurityApi`, `ProxyApi`, `HotReloadApi`, the new singleton accessor,
all of `backend/`, **and every Thread-1 logic singleton**). Not
per-symbol — per-file.

**Doc payoff of Thread 1:** TypeDoc currently emits public **and
protected**, so an Api's protected guts are *in* the docs today, crowding
them. Moving the guts to the `@internal` singleton leaves the Api with
nothing but public statics — its documented surface becomes its real
surface automatically. This was the user's stated reason for wanting the
guts moved: "cut some of the private and protected members out of the
api's interface so it's not as crowded."

**Self-consistency invariant to enforce:** *callable == visible == cared-
about.* The singleton proves it — an author can't **call** it (the
`FromModule` gate), can't **see** it (`@internal`), needn't **care**.
When the three coincide everywhere, the call-security policy *is* the
doc-visibility policy — **with one exception, the extension tier below,
which is the single place the policy can't classify and a marker must.**

### The extension (override) tier — RESOLVED: in scope, marked not derived

The three items above are the **consumer** surface (the author *calls*
them). There's a second tier the author *implements* and the **framework
invokes** — what the user called "special applied functions … applied by
them or something external like the backend." It is **in scope** and
gets documented, as its own tier.

The empirical finding that shapes it (verified against `build-3`): these
hooks are **public and ungated**, mechanically *indistinguishable* from
consumer methods.

- `Stuff.onDestruct()` — public, undecorated no-op terminal (`Stuff.ts`). The gated thing is the *entry point* `destroy()` (`@Final @Unshadowable @CallSecurity(ApiOnly)`); the hook it fires is deliberately open so you can override it.
- `postRegister()` — the `PostRegistration` mixin's public no-op default.
- `apply<Field>` instruction appliers (`Detailed`, `Perceiver`, `Light`, `VisionModality`) — Hydrator-invoked, public, **no paired getter** (not consumer surface by the property-vs-instruction rule).
- The whole **`Hook` module category** (`obj/hooks/DomainHook.ts` + `hooks.yaml`) — PM-invoked `aroundSave`/`aroundDelete`.
- **Backend-lifecycle callbacks** (`Avatar.save()`/restore, `onLinkdead`) — invoked by `backend/`.

**Why the tier can't be policy-derived (correction to the invariant
above):** these hooks carry **no** call-security policy, so the
consumer/extension split is *not* derivable from the security gate the
way internal-vs-author is. And you **can't add a gate** to fix it — a
subclass's `super.onDestruct()` is **author code calling the hook**, so a
`FromModule(framework)` policy would deny the super-chain. Super-chained
override hooks are ungateable by construction. The policy route is
closed.

**So the extension tier is the one spot that needs an explicit marker** —
a **TSDoc `@hook` tag** (decided; not a decorator) the projection reads.
The full three-tier classification:

| Tier | Signal | Doc treatment |
|---|---|---|
| internal | `@internal` (+ usually gated `FromModule(own Api)`) | hidden |
| **extension** | explicit `@hook` marker (public, framework-invoked, author-overridable) | documented **with the override contract** |
| consumer | public, unmarked | "you call this" |

The extension tier documents what the consumer tier has no analog for —
the **override contract**: *who* invokes it, *when* in the lifecycle,
whether you must `super`-chain, veto-vs-witness semantics, and return
meaning.

The refined invariant: *callable == visible == cared-about*, and the
**call direction** (you-call vs framework-calls-you) splits visible into
consumer-vs-extension — derivable from the security policy everywhere
**except** the ungateable override hooks, which is exactly where the one
human-placed `@hook` marker earns its keep.

---

## Thread 7 — Types ride their face (import predictability)

**Honest finding:** a perfect *placement* heuristic — "guess the one
canonical module a type lives in" — **does not exist** for shared /
multi-module-concept types; it bottoms out in taste. Stop chasing it.
But you don't need *placement* guessable; you need the **import site**
predictable, and that *is* achievable.

**Two facts make the import site predictable:**

1. **Structural:** by surface (3)'s own definition, every author-facing type is the I/O of some public method, and that method lives on an Api or mixin → **any author-facing type is importable from the Api or mixin whose method speaks it.** You guess *from the method you're holding*, not in the abstract.
2. **Type re-exports are weightless** (erased at compile time → zero runtime edges → can't cycle, even though `lib` imports Apis at runtime). So a shared author-facing type can be **re-exported (`export type`) from *every* public face that uses it.** "Look where you'd use it" then always finds it. You **dissolve** the need for a unique home rather than out-guessing it.

**Constant asymmetry (precision):** a re-exported *constant* is a runtime
value — it adds a real `api → definition` edge and can cycle. So
**constants are placed, not re-exported** (define at the entry point or a
dependency-leaf). This is the real reason "types in api/lib" felt
different from "constants in api/lib": types are weightless to relocate,
constants aren't.

**Naming complement (for guessing from a bare name, no method in hand):**
the name must encode the concept — `<Concept><Role>` (`TeleportOptions`,
`ScheduleHandle`, `MessageBroadcastOptions`). Generic exported type names
(`Options`, `Result`, `Spec`, `Config`) are the **actual antipattern to
ban** — more than misplaced ones, since a well-named type tells you its
face and a face tells you its import.

**Scope + enforcement:** fan-out re-exports apply to the **author surface
only**; internal `lib`-to-`lib` types keep the plain upstream-owner rule
(no fan-out). Mechanizable: a lint/codegen step asserts "every public
face re-exports the types in its own signatures," wiring import-
predictability to the same model that drives the docs — doc generator and
import convention become one check.

**Net rule for the doc:** *public types are re-exported (type-only) from
their concept's face; internal types live with their upstream owner;
constants are placed, not re-exported; exported author-surface types are
named `<Concept><Role>`.* A small extension of the existing "Apis declare
their surface types in-file" line — "declare, or re-export when
dependencies forced the definition elsewhere."

---

## Thread 8 — Api boundaries are provisional (and that's fine)

Unlike `lib/` — whose modules have **intrinsic identity** the model
forces into existence (`Container`, `Mobile`, `Light`) and which is
therefore well-settled — an Api is just a **grouping of operations**,
an organizational convenience with **no intrinsic identity**. The right
Api divisions are *not settled*; expect a lot of merging / splitting /
renaming as the codebase grows and sounder organizing principles emerge.

Nothing in this slate cuts that off — it **lubricates** it, by decoupling
the (volatile) Api grouping from everything that would make re-grouping
expensive:

- **Logic** lives in the singleton, not the Api — moving a method between Apis moves a *signature + a one-line forwarder*, not the implementation.
- **Docs** are a *computed* projection (signatures + `@internal`) — re-grouping re-derives them, no hand-curated index.
- **Type discoverability** rides the method's face and is re-exported from every face that uses it — types follow a moved method (and the doc-gen lint re-points them).

So the Api boundary is **soft** — a namespace you can churn without
disturbing logic, docs, or discoverability. That is the correct property
for a layer whose organizing principle hasn't emerged yet. Don't mistake
an Api boundary for a commitment.

**The one hard coupling that resists churn: the security string.** The
`FromModule('mud/api/foo#FooApi')` gate on a singleton — and the
`/obj/api/<feature>` path — couple to the Api's name *as a string*, with
no compiler help on rename (call *sites* update under TS rename-symbol;
the policy literal and path constant go stale silently). Mitigations:

1. **Keep Api↔singleton 1:1 by default** so the gate is a single `FromModule` that moves *with* the pair on a split/merge — no allowlist. Genuinely-shared logic between two Apis is its own concept (a `lib` module or a separate internal singleton gated `AnyOf(...)`), per Threads 4/5 — not a reason to couple two Apis.
2. **Derive the policy string from a constant**, not an inline literal — one edit site per rename.
3. **Lint/codegen that every `FromModule` string resolves to a real module** — catches stale gates after a rename (same check the doc projection wants anyway).

Net: the Api layer becomes *more* fluid everywhere except the security
gate, and the gate's stringiness is contained by a constant + a lint.

---

## Decisions (summary)

- Api = stable, non-HMR, typed + security boundary + thin forwarding. Logic moves to a **stateless `Stuff` singleton** that *is* HMR.
- New primitive **`StuffApi.singletonSync(path, factory)`** — sync, registry-keyed, HMR-aware (factory resolves blueprint via sync `getCurrentExport`). Only new machinery.
- `dest` is the reload invalidator; no auto-routing.
- Singletons live at **`/obj/api/<feature>`**, MQL-addressable by path (no Template doc); **path is the handle, stuffId is ephemeral.**
- Internal logic that needs protection must be **`Stuff`-shaped** and gated **`FromModule(its Api)`** — protect the *call*, not the import. The HMR singleton *is* this protected home (Threads 1 & 4 are one object).
- **One concept per module**; add the 4th lib category (named value-object/vocabulary/registry). No `types.ts`/`constants.ts`/barrels.
- Author surface = public Api statics + public Stuff/mixin **methods** + the **computed** closure of their I/O types. Coarse `@internal` per concept. *callable == visible == cared-about.*
- Author-surface **types** re-exported (type-only) from **every face** that uses them; **constants placed, not re-exported**; names are `<Concept><Role>`.
- **Three doc tiers:** internal (`@internal`, hidden) / extension (TSDoc `@hook` tag, framework-invoked override hooks, documented with the override contract) / consumer (public unmarked). Tier is policy-derivable **except** the extension hooks, which are public+ungated+ungateable (super-chained) and so need the one human-placed `@hook` tag.
- **Stateful Apis → two singletons** (Thread 1/2): Api statics → stateless logic singleton (HMR) → pinned stateful singleton (state survives reload). HMR-logic and state can't share an object (reload=dest=state-loss). Stateful Apis are NOT excluded — only the bootstrap-special four + `stuff` itself are. Inserting the logic layer re-points the stateful singleton's `FromModule` gate to the logic singleton.
- **Api boundaries are provisional** — soft namespaces, expected to churn (split/merge/rename). The refactor decouples grouping from logic/docs/types so churn is cheap. The one hard coupling is the `FromModule` security string + `/obj/api/<feature>` path (stringly-typed); contain it via Api↔singleton 1:1 + a derived constant + a resolves-to-real-module lint.
- **Migration is BLANKET** (every convertible Api, uniform seam for future complexity — not selective), **scriptable** (uniform transform), **behavior-preserving + batched**. Excluded: bootstrap-special (`security`/`module`/`proxy`/`execution-context`) + stateful (`stuff`/`scheduler`). Phases: infra (`singletonSync`) → 2-step pilot (`material`/`navigation` warm-up = canonical recipe, then `locomotion` = guts variant) → tooling → sweep. Kept separate from the Thread-8 Api reorg.

## Open questions

*All load-bearing design questions are resolved.* What remains is
build-phase mechanism (recipe details, lint authoring, per-Api state
pinning for the two-singleton cases) — for the requirements/plan pass,
not the slate. Resolved record kept for history:

1. ~~Subclasser/extension surface + marker mechanism~~ **RESOLVED** (Thread 6): in scope, its own tier documented with the override contract; the marker is a **TSDoc `@hook` tag** (not a decorator).
2. ~~`api/mql/types.ts`~~ **RESOLVED** — fine as sealed-internal scaffolding (lint enforces the seal; consumer subset re-exported from `api/mql.ts`). No-`types.ts` rule applies past the seal, not behind it.
3. **Un-materialized singleton discovery** — accept the lazy gap, or add a static path list later?
4. Class-level vs per-method policy declaration on the singletons — confirm class-level default works for a `Stuff` (registries currently gate per-method).
5. ~~Migration sequencing / pilot~~ **RESOLVED** — see "Migration sequencing" below.

## Migration sequencing & pilot

**Scope decision — BLANKET, not selective.** Every *convertible* Api gets
the singleton pattern, even ones carrying little logic. Rationale: the
singleton is a **standing extensibility seam** — uniform application means
a future dev who introduces complexity has an already-wired home for it,
and there's never a per-Api "should I convert this?" judgment call.
Uniformity is the feature (same instinct as `lib/` being locked-down).
Note the data reframes the *justification*: a survey found **most in-scope
Apis have ~no private surface** (logic inline in public statics), so the
Thread-1 *declutter* benefit barely applies — the real driver is the
uniform seam, not hiding guts (declutter is a bonus where guts exist,
e.g. `locomotion`).

Blanket also buys a **scriptable sweep**: the transform is uniform — for
each `public static foo(args)`, leave a one-line forwarder, move the body
to the singleton's instance `foo`, add the class-level `FromModule` gate,
stamp `/obj/api/<feature>`, re-export the types. Selective couldn't be
automated; blanket can, which makes the ~40-Api scope mostly mechanical
replication.

**Excluded (documented carve-outs, not slippery slope) — narrower than
"all stateful Apis":**
- Bootstrap-special four — `security` / `module` / `proxy` / `execution-context` (they *are* the framework; don't self-decorate either).
- `stuff` itself — the bootstrap; can't be a Stuff of itself, and `singletonSync` lives on it.

**Stateful Apis are NOT excluded — they get the two-singleton shape**
(Thread 1): the *logic* migrates to a stateless logic singleton; the
*state* stays in a pinned stateful singleton. Apis that already extracted
state (`access`, `soul`) just get the logic layer inserted (and the
stateful singleton's gate re-pointed to the logic singleton). Apis whose
state is still on Api statics (`scheduler`/`schedule` timers) must pin
the state first — case-by-case in the sweep, not a blanket exclusion.

**Survey snapshot** (build-3, orientation only): most candidate Apis are
0-private-guts, tested, low blast radius (`material` 4 importers,
`navigation` 7, `prose`/`grammar`/`quantity` ~6). `locomotion` is the
outlier with real guts (630 LOC, 20 public, 5 private helpers, 12
importers). `AccessApi`↔`AccessRegistry` and `SoulApi`↔`SoulCatalogue`
are **prior art** for the facade + `FromModule`-gate + path halves
(though async-boot + stateful); the pilot's genuinely-new risk is
concentrated in `singletonSync` (sync / lazy / stateless / HMR).

**Phases:**

- **Phase 0 — infra, zero Apis touched.** `StuffApi.singletonSync(path, factory)` + unit tests (lazy create; `dest`→recreate-fresh-via-`getCurrentExport`; `byTemplatePath` keying). Additive to the pinned `StuffApi`; unblocks everything.
- **Phase 1 — pilot, two steps:**
  1. **Warm-up — `material` or `navigation`** (small, tested, lowest blast radius, 0-guts = the *dominant* recipe). Goal: nail the **canonical repeatable transform** for the common case (clean enough to script), and prove the new mechanics — `singletonSync`, the gate (verify a non-Api caller is *denied*), path addressing, type re-exports.
  2. **Representative — `locomotion`** (real guts, in-game-observable HMR via the move verbs, realistic coupling, gameplay-time so no boot-ordering edge). Proves the **guts variant** of the recipe end-to-end before the sweep.
- **Phase 2 — tooling** with the pilot as real input: three-tier doc projection (`@internal`/`@hook`/consumer) + the lint family (`FromModule` resolves to a real module; every face re-exports its signature types; **sealed-subdir isolation — only `api/<x>.ts` imports `api/<x>/**`**). The `@hook` marker mechanism is settled here.
- **Phase 3 — sweep:** apply the recipe to remaining convertible Apis, **behavior-preserving** (tests green per Api), **batched by ascending blast radius** (central ones — `message`, `containment` — last) for tractable review.

**Hard rule:** this mechanical migration stays **separate** from the
Thread-8 Api reorg (split/merge/rename). Convert Apis as they stand;
don't re-divide while converting. Two activities; entangling them makes
both worse.

## Doc landing (when built)

- `architecture.md`: add the 4th lib module category; the one-concept-per-module rule; the definition-site-vs-import-site distinction.
- `antipatterns.md`: ban `types.ts`/`constants.ts`/barrels and generic exported type names; "protect the call, not the import"; the `<Concept><Role>` naming rule.
- `call-security.md`: the api↔singleton gating pattern as a named recipe (static caller + instance callee, verified); the note that override hooks are ungateable (super-chain) and classified by `@hook`, not policy.
- doc-gen / `help` config: the three-tier projection (internal / `@hook` extension / consumer) over `api-model.json`; the override-contract fields the extension tier renders.
- `hot-reload.md`: `singletonSync` + the `/obj/api/<feature>` convention.
- CLAUDE.md: revise "cross-cutting helpers default to an Api class"; state *callable == visible == cared-about*.

This slate is the pre-requirements capture. No build until master is
stable and a real requirements + plan are drafted against it.
