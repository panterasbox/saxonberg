# Call Security — Requirements

> First-pass requirements doc for the Call Security framework
> (originally **Framework 6** in PLAN.md, with hooks scattered across
> CLAUDE.md, ARCHITECTURE_PATTERNS.md, PROTECTED_LIFECYCLE.md,
> PERSISTENT_PATTERN.md, and Saxonberg.md). Ambitious, deliberately
> over-scoped — we will pick a slice to actually build.

---

## TL;DR

A unified, mostly-invisible interception layer that sits between *any*
caller and *any* method on a `Stuff`, and answers four questions before
the method runs:

1. **Is the target still alive?** (destroyed-object guard)
2. **Is this caller allowed to make this call?** (security policy)
3. **Is anything wrapping this method right now?** (shadow stack)
4. **What is the call chain that led here?** (execution context, for #2 and audit)

It also mediates a handful of *privileged* operations — `Stuff.destroy()`,
shadow installation, manager-level access — so the only legitimate way
to perform them is through the Api layer.

Built on **AsyncLocalStorage** for context propagation and a **decorator
+ Proxy hybrid** for interception. Targeted at sensitive surfaces, not
universal — performance-friendly by being opt-in.

---

## At a Glance

| Concern                   | Current state                                  | What CallSec adds                                      |
| ------------------------- | ---------------------------------------------- | ------------------------------------------------------ |
| Destroyed-object access   | Manual `if (obj.isDestroyed())` checks, mostly absent | Automatic; throws `DestroyedObjectError` |
| Caller identity           | None — methods don't know who called them      | `ExecutionContext.getCaller(): Stuff \| null`         |
| Method-level authorization | Convention only ("go through Api layer")     | Policies enforced at call time, not by convention      |
| Runtime behavior overrides | Ad-hoc subclassing                            | LPMUD-style shadow stack, per-instance                 |
| Privileged ops            | Locked down only by JS `private`/`#`           | Locked down by *who's calling*, not just *where from* |
| "DO NOT OVERRIDE" methods  | Comments only                                  | `@Final` enforced at class load by the loader hook     |
| Audit / debugging         | `console.log`                                  | Structured log of denied calls, shadow installs, etc.  |

---

## Goals

- **Caller-aware authorization.** A method can declare "only the
  Backend → Application boundary, only an admin, only the responsible
  Avatar, only myself, only callers from `mud/api/`, only this
  template path" and have that enforced uniformly — regardless of
  how the call arrived.
- **Async-safe call stack.** Caller identity must survive `await`,
  `setTimeout`, `Promise.then`, and event-handler boundaries.
- **Destroyed-object safety.** Touching a destroyed `Stuff` throws a
  recognizable error — not "undefined is not a function" three frames deep.
- **Runtime behavior modification (shadows).** Add/remove/replace method
  behavior on a *single instance* without subclassing — for buffs,
  debuffs, tracing, mocking, and event hooks.
- **API-layer enforcement.** "Go through `StuffApi.destruct()` / through
  `ContainmentApi.move()`" stops being convention and becomes a check.
- **Negligible cost on hot paths.** Internal/private methods should not
  pay the security tax.
- **Modder-ready.** Whatever shape this takes, it must hold up when
  untrusted blueprint code (Phase 9, mods in `isolated-vm`) starts
  calling into trusted core objects.

## Non-Goals

- **Not an ACL system.** Permissions like "admin.grant_xp" are deferred
  to a later permission layer (PLAN.md mentions Phase 11+).
- **Not a sandbox.** That's Framework 13 (`isolated-vm`). Call Security
  guards the inside of the trusted process; the sandbox guards the
  boundary to untrusted code.
- **Not a transaction system.** Rollback-on-error is a stretch goal,
  not part of the core framework.
- **Not universal.** We don't aim to wrap every method on every object —
  too costly and most calls don't need it.
- **Not a cross-pause attribution tracker.** Within a single
  synchronous chain the call stack faithfully represents
  responsibility (see §"Responsibility on the call stack" below).
  Across asynchronous gaps — prompts, scheduled events, message
  hand-offs — it does not, and we don't try to bridge them here.
  That's a separate, future "command stack" framework.

### Responsibility on the call stack

The call stack ("who called whom right now, in JS function terms")
*does* answer responsibility questions for synchronous chains, which
is the vast majority of gameplay. Distinct from the immediate
CommandGiver concept, two helpers on `ExecutionContext` walk the
frames to extract human-driven Avatars (Avatars with an `Interactive`
attached):

- **`getActingAvatar(): Avatar | null`** — walks up from the current
  frame, returns the first human-driven Avatar found as a frame
  target. The most recent human actor in the chain. In a force
  chain this is the puppet (benji); in a player-typed command this
  is the player; in an NPC-only autonomous chain this is null.

- **`getResponsibleAvatar(): Avatar | null`** — walks down from the
  bottom of the stack, returns the first human-driven Avatar found.
  The original initiator. In a force chain this is the admin who
  started it. In a reactive trigger (player walks into a monster's
  territory and the monster acts) this is still the player. Null
  only when no human is in the chain at all (server tick,
  bootstrap).

Both work because `CommandGiverMixin.executeCommand` pushes the
CommandGiver as the frame's `target`; any human-driven Avatar
somewhere in the chain therefore shows up as a frame target.

**What this covers cleanly (synchronous chains):**

- **Reactive triggers.** I `north`, room triggers monster's `kill`.
  Acting = monster (NPC, so null at the human-filter step → walk
  past); responsible = me. ✓
- **Force commands.** Admin `force benji say hi`. Acting = benji;
  responsible = admin. ✓
- **Stacked force.** `force a force b force c say hi`. Acting = c;
  responsible = a (or admin, whoever's at the bottom). ✓
- **NPC chains nested inside human commands.** Walk past the NPC
  frames; human frame is still on the stack below them. ✓

**What this does *not* cover (deferred to a future command-stack
framework):**

- **Prompts.** Command pauses for user input, JS function returns,
  call stack unwinds. When the response arrives, the command resumes
  on a fresh stack. Responsibility is lost unless explicitly
  preserved by a parallel attribution layer.
- **Scheduled / delayed effects.** Player drops a banana peel now;
  NPC slips on it next tick. Player's responsibility for the slip
  exists morally but no JS frame ties them at slip-time.
- **Cross-actor messaging.** A sends a message; B's handler runs
  later. B's stack doesn't include A.

In all three cases, `getResponsibleAvatar()` returns null at a moment
when a human ought to be on the hook. The future command-stack
framework will fill exactly this gap by propagating attribution
across pauses and async boundaries (probably ALS-based with explicit
push/pop sites at `executeCommand`, prompt-resume hooks, etc.).
Until then, callers that care about post-pause attribution must
preserve it manually.

**Terminology.** "CommandGiver" = the *immediate* issuer of the
currently-running command (might be an NPC). "Acting Avatar" / "Responsible
Avatar" = the human-driven Avatars walked from the call stack. When
people in the wild say "Interactive" or "the driving player," they
generally mean the responsible Avatar — the human at the keyboard.
The Avatar class is what the API returns; the Interactive attachment
is what makes it human-driven.

---

## Conceptual Model

Three things are always in scope when a guarded method runs:

```
   caller          target            method
  ┌──────┐       ┌────────┐         ┌─────────┐
  │ Stuff│──────▶│  Stuff │ . ─────▶│   fn()  │
  └──────┘       └────────┘         └─────────┘
     │              │                    │
     │              │                    └─ the function being called
     │              └─ the Stuff whose method is being invoked
     └─ the Stuff that initiated this call (or null = "system")
```

The framework's job is to peek at all three (plus the rest of the
call stack), decide whether the call is allowed, run any installed
shadows, then either invoke the original method or throw.

**`null` caller = the Backend → Application boundary.** Code that
runs outside of any guarded call has no caller. In practice this is
narrow and well-defined: it's the first call from `Backend` into
`Application` for any given message-handling cycle —
`handleWebSocketConnect`, `handleAuthenticationSuccess`,
`handleClientMessage`, the scheduler tick entry, the bootstrap
script. **Application is the root of the stack**, not Backend.

Backend *can* appear on the stack later — Application calls into
Backend regularly (e.g., to send messages). Those calls push normal
frames for Backend methods. The architectural property that matters
is that Backend frames are **leaves**: Backend never calls back into
Application from inside one of those calls, so a Backend frame
always has nothing further called from inside it that does
game-logic work. Stack shape:

```
[bottom] Application.handleClientMessage     ← frame 0, caller = null
         …game logic, mixin methods, command dispatch…
         Application.someMethod calls backend.sendMessageToSocket
[top]    Backend.sendMessageToSocket          ← appears as a leaf
```

Policies that want to distinguish Backend code can match on its
module ID (`FromModule('/src/mud/backend/**')`) just like any other
caller.

`null` caller is **not** a general "system context" escape hatch.
The Hydrator is itself a `Stuff` and pushes its own frames (see
§"Hydrator — no longer an exception"). Policies decide whether
`null` is privileged or anonymous; the answer is usually "privileged
at the Backend → Application boundary, denied everywhere else."

---

## The Six Pillars

### 1. ExecutionContext — async-safe call stack

`AsyncLocalStorage<CallStack>` carries a stack of `CallFrame`s through
async boundaries. Each guarded call pushes a frame on entry, pops on
exit. From inside any guarded method:

- `ExecutionContext.getCaller(): Stuff | null` — immediate caller
- `ExecutionContext.getCurrentTarget(): Stuff | null`
- `ExecutionContext.getCallStack(): CallFrame[]` — for audit/debug
- `ExecutionContext.dumpCallStack()` — pretty-printed
- `ExecutionContext.assertCaller(SomeClass)` — defensive check

A `CallFrame` is `{ caller, target, method, timestamp, metadata? }`.

> **Why ALS instead of a passed-in context object?** Because the call
> graph is too wide and too deep. Threading a `ctx` parameter through
> every method is the kind of change that gets backed out the moment
> someone forgets to pass it through a `setTimeout`.

**Constructor frames.** Object construction is special: a constructor
runs before any frame for the new object exists. The framework
handles this by pushing a synthetic frame for the duration of
construction:

```
{ caller: StuffApi, target: <the new instance>, method: 'constructor' }
```

Consequences:
- `getCaller()` inside a constructor returns `StuffApi`. The real
  cloner is one frame down, accessible via `getCallStack()`.
- `this.someMethod()` from inside the constructor pushes a normal
  frame whose caller is `<the new instance>` — i.e., a self-call
  (`SelfOnly` matches), which is the natural reading of
  "construction-time self-initialization."
- The call stack at debug time shows the construction phase
  explicitly, which helps when something blows up partway through.

Whether the `constructor` frame should itself enforce a
`@CallSecurity` is a separate decision — see Open Questions.

### 2. Destroyed-object guard

After `StuffApi.destruct(obj)`:

- Calling any guarded method on `obj` throws `DestroyedObjectError`
  (with `stuffId` and method name in the message).
- `Stuff.destroy()` becomes effectively private — see §"Privileged
  Surfaces."

This already half-exists: `Stuff` has `_isDestroyed` and `isDestroyed()`,
and `StuffApi` keeps a debug `WeakMap<Stuff, DestroyedObjectMetadata>`.
What's missing is the automatic check on every method call.

### 3. Security policy enforcement

A `SecurityPolicy` is just `{ allows(caller, target, method): boolean }`.
The decorator (or Proxy) consults the policy *before* invoking the
method body. On deny, throws `SecurityError` with caller/target/method
in the message.

Policies are not limited to inspecting `caller` directly — they have
the full `ExecutionContext` available, so they can ask questions like
"is there an `Interactive` *anywhere* in this call stack?" or "is the
current `CommandGiver` an admin?" The "caller" is the immediate frame;
"context" is the whole stack.

#### 3a. Caller Identity Model

Real-world policies do not want to be written against `instanceof
Avatar`. The user wants to write rules like:

> "Reject calls that originated from anything cloned from a template
> under `/domain/narnia/**`."

> "Reject calls from any subclass of the class loaded from
> `/mud/domain/narnia/NarniaLocation.ts` (named `NarniaLocation`)."

> "Allow calls from `Application`, `Backend`, or `Interactive`."

To support that, every `Stuff` should carry — and every guarded call
should expose — a small bundle of identity facets:

| Facet              | Source                                              | Example                                  |
| ------------------ | --------------------------------------------------- | ---------------------------------------- |
| **stuffId**        | runtime nanoid, already on `Stuff`                  | `aB7…`                                   |
| **module URL**     | the file the class was actually imported from, captured by the loader (not declared by the class) | `file:///…/mud/api/stuff.ts`, `file:///…/mud/domain/narnia/NarniaLocation.ts` |
| **template path**  | the CMS template path (only if cloned)              | `/avatar/player/abc123`, `/domain/narnia/cair-paravel` |

The constructor-name fallback was considered and dropped: it is
forgeable (any class can declare its name) and no remaining policy
needs it. If a class somehow has no module ID stamped (e.g., loaded
before the loader hook installed), identity-keyed policies fail
closed — the resolver returns `null` and `FromModule` /
`FromTemplate` deny the call.

The crucial property: **module URL must be captured by the import
machinery, not declared by the class.** A class that says
`static __isApi = true` or sets a `Symbol.for('saxonberg.api')`
marker on its prototype would let an attacker drop a `FooApi.ts` into
some random folder, set the marker, and inherit privileged access. We
don't want a flag; we want "this class actually came from `mud/api/`."

**How we capture it: Node module customization hooks.** A `module.register`-installed
loader hook intercepts every `import`, sees the resolved file URL,
and stamps every exported class into a process-global
`WeakMap<Class, ModuleId>`. The framework reads from that WeakMap
when it needs to resolve a caller's identity. Forge-proof: untrusted
code can't shortcut the import system, can't fake the module URL,
can't tag itself "Api" by setting a flag. The class actually came
from where it came from, full stop.

Walk-and-stamp at startup and per-module self-declaration via
`import.meta.url` were considered and rejected — both require
maintaining metadata on every module, either manually or via a
fragile bootstrap step. Loader hooks are the only mechanism that
doesn't.

**Canonical form.** The "module ID" we store is `path#exportName`,
covering both named and default exports:

| Class                                        | Module ID                                     |
| -------------------------------------------- | --------------------------------------------- |
| `class Foo` exported as `Foo`                | `/src/mud/lib/Foo#Foo`                        |
| `class Foo` exported as `default`            | `/src/mud/lib/Foo` *(or `…#default`; bare path is the convention for default)* |
| `class StuffApi` in `mud/api/stuff.ts` exported as `StuffApi` | `/src/mud/api/stuff#StuffApi` |
| `class NarniaLocation` in `mud/domain/narnia/NarniaLocation.ts` | `/src/mud/domain/narnia/NarniaLocation#NarniaLocation` |

This is the same form the existing Api / blueprint-resolution layer
already uses (PLAN.md's `parseBlueprint` handles `core:/path#Export`,
`/path#Export`, and `/path` for default). We're piggybacking on that
established pattern, not inventing a new one.

The framework canonicalizes the identity bundle into a single
**caller path** for matching: prefer template path if cloned,
otherwise the module ID. If neither is present the policy denies.
Policies match against this string with globs.

A glob-based matcher is the natural shape, matching against the
caller path described above:

```ts
SecurityPolicies.FromTemplate('/domain/narnia/**')              // any clone of any narnia template
SecurityPolicies.FromModule('mud/domain/narnia/NarniaLocation') // class loaded from this file
SecurityPolicies.FromModule('mud/domain/narnia/**', { includeSubclasses: true })
```

Composable: `SecurityPolicies.allOf(...)`, `anyOf(...)`, `not(...)`.

`ApiOnly` is then defined cleanly: `fromModule('mud/api/**',
{ includeSubclasses: true })`. There is no `isApi` flag and no
prototype symbol. A class is "Api" if and only if it was actually
imported from `mud/api/`. Untrusted code that creates its own
`FooApi` somewhere else fails the check by definition.

> **Static Api callers.** Api classes (`StuffApi`, `ContainmentApi`,
> etc.) are static utility modules — there's no instance to push.
> The decorator synthesizes a frame for them when a call enters an
> Api function: the synthesized "caller" is the Api class itself,
> whose module URL the WeakMap already knows. No special-casing
> needed beyond "synthesize a frame at the Api boundary."

#### 3b. Built-in policies (revised catalogue)

| Policy                          | Allows                                                                  | Example                                  |
| ------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------- |
| `Public`                        | anyone, including untrusted modder code                                 | `getName()`, `getDescription()`          |
| `SelfOnly`                      | `caller === target`                                                     | private bookkeeping                      |
| `SystemRoot`                    | `null` caller only (entry-stack root)                                   | bootstrap-only ops                       |
| `Admin` *(deferred — no consumer in v1)* | `getResponsibleAvatar()` exists and has admin flag             | `addXp()`, admin commands                |
| `ByCommandGiver(pred)` *(deferred — no consumer in v1)* | predicate over the immediate `CommandGiver`             | "only NPCs can call this"                |
| `ByActingAvatar(pred)` *(deferred — no consumer in v1)* | predicate over `getActingAvatar()` (top human in chain) | rare — see rule of thumb                 |
| `ByResponsibleAvatar(pred)` *(deferred — no consumer in v1)* | predicate over `getResponsibleAvatar()` (bottom human in chain) | `setPassword`: `(a, target) => a === target` |
| `FromTemplate(glob)`            | caller's template path matches glob                                     | trust gate for `/core/**` templates      |
| `FromModule(glob, opts)`        | caller's module URL matches glob (± subclasses)                         | "only `NarniaLocation` and subclasses"   |
| `ApiOnly`                       | call has a frame whose caller's module URL is under `mud/api/`          | `Stuff.destroy()`, manager mutations     |
| `Custom(pred)`                  | arbitrary predicate `(ctx) => boolean`                                  | "must hold the right key"                |
| `Not(p)` / `AllOf(...)` / `AnyOf(...)` | composition                                                      | combining the above                      |

`FromAny(names[])` (constructor-name match) was considered and **dropped** —
forgeable by any class declaring its name. The loader-hook-stamped
`path#exportName` form via `FromModule` is the trust signal; use that
against module IDs instead. Avatar-aware policies (`Admin`,
`ByCommandGiver`, `ByActingAvatar`, `ByResponsibleAvatar`) ship as
*specifications only* in v1 — no consumer in the current codebase needs
them, and building them speculatively means designing against
assumptions. The corresponding stack-walk helpers (`getActingAvatar`,
`getResponsibleAvatar`) are deferred for the same reason.

**Rule of thumb for choosing.**

| Function category                                         | Check what            |
| --------------------------------------------------------- | --------------------- |
| Developer-level (addXp, setPassword, admin commands)      | Responsible Avatar    |
| Player/mechanic-level (say, attack, get)                  | CommandGiver          |
| "Foreground human regardless of who pulls the strings"    | Acting Avatar         |

**Worked example: setPassword.**

```ts
@CallSecurity(SecurityPolicies.ByResponsibleAvatar((a, target) => a === target))
setPassword(newPw: string): void { … }
```

- Benji directly: responsible = benji, target = benji → allowed.
- Admin force-runs `force benji setPassword nuke`: responsible = admin,
  target = benji → denied. Admin can't change benji's password by
  hijacking benji's command channel.
- A monster somehow triggers it: responsible = the player who
  triggered the chain (or null if no human anywhere) → denied.

**Worked example: Admin.** With `Admin` defined as "responsible Avatar
has admin flag":

- Admin runs `addXp self 100`: responsible = admin → allowed.
- Admin runs `force benji addXp benji 100`: responsible = admin →
  allowed. (Admin remains accountable through the puppet.)
- Benji runs `addXp self 100`: responsible = benji → denied unless
  benji is admin.
- An NPC autonomously runs `addXp itself 100`: responsible = null
  (no human) → denied.

`OwnerOnly` and `ByDrivingInteractive` from earlier drafts are gone —
the new helpers express the same concepts more precisely, and as
predicate compositions rather than special-cased policies.

> **Cross-pause caveat.** All three of `Admin`, `ByActingAvatar`, and
> `ByResponsibleAvatar` rely on the human Avatar being somewhere on
> the call stack. They return null / fail across prompt resumes,
> scheduled events, and cross-actor messaging — the cases listed in
> Non-Goals → Responsibility on the call stack. If you find yourself
> writing a method that may be invoked across one of those gaps, the
> `Admin` check at that site is incomplete; flag it for the future
> command-stack framework.

### 4. Function shadowing (LPMUD-style)

A shadow modifies behavior on a *single instance* without subclassing.
Multiple shadows on the same method form a stack, last-installed runs
first. Each shadow can:

- modify args before calling `next`
- skip `next` to fully replace behavior
- wrap `next` in try/catch
- mutate the return value

**Shadows are `Stuff`.** Not interfaces. They get their own
`stuffId`, lifecycle (`destruct()` removes them from every target
they're attached to), can be cloned from templates, and live in the
class hierarchy as a new top-level branch alongside `Idea` and `Agent`:

```
Stuff
 ├── Idea (User, Player, Location, Door, …)
 ├── Agent (Avatar, NPCs, …)
 └── Shadow                       ← new top-level
      ├── XpDoublerShadow
      ├── TraceLoggerShadow
      └── …
```

This means:
- Buffs/debuffs are clonable game objects, not throwaway closures.
- A shadow can be inspected via `MqlApi`, listed in admin tools, etc.
- The framework gets shadow auditing for free (each Shadow is a
  registered Stuff with creation-time and caller-on-create attribution).

**Chaining is externalized — LPC-style `callDown`.** PLAN.md proposes
a middleware-style `(target, args, next) => …` shape where each
shadow calls `next()` to continue the chain. We've moved away from
that: the framework owns the chain, shadows are plain method
overrides with their natural mixin signatures, and chaining is done
via a framework-provided primitive — `this.callDown()` — rather than
a `next` parameter.

This is the LPC MUD model. In LPC, the driver provided an externalized
"call the host's version" primitive that any shadow could invoke from
inside a normal-shape method; the driver also handled walking down the
shadow stack if multiple shadows were attached. Same idea here, in
modern terms:

- Shadow methods have their natural mixin signature (`get firstName():
  string { … }`) — no `next` parameter polluting the surface.
- Inside the body, calling `this.callDown<T>(...args?)` invokes the
  next thing down the dispatch stack: either the next shadow's same
  method, or the underlying target's original method if we're at the
  bottom.
- Args default to "the args this method was called with"; you can
  pass modified args to `callDown` to mutate them on the way down.
- Not calling `callDown` ⇒ full replacement.

Why this beats phase decorators (`@before` / `@after` / `@around`):

| Concern                       | Phase decorators                         | `callDown`                             |
| ----------------------------- | ---------------------------------------- | -------------------------------------- |
| Mixin-natural shape           | `@around` breaks on getters/setters      | Works on getters, setters, methods     |
| Try/catch around inner call   | `@around` only                           | Plain `try { this.callDown() } catch …` |
| Conditional bypass            | `@around` only                           | Just don't call `callDown`             |
| Multi-shadow stacking         | Phase ordering rules                     | Natural — chain falls out of call-downs |
| Mental model                  | Plain method vs. decorated phase (two)   | One: plain method, optional `callDown` |

Phase decorators are gone from the design. `callDown` covers every
case they covered, more cleanly, and doesn't require breaking the
natural mixin shape.

**Inferred shadow surface from mixin composition.** A Shadow declares
its surface by *composition* — extending the same mixin it wants to
intercept — and the framework figures out the rest:

```ts
// Pure rename: shadow has its own NamedMixin state; intercepts ALL
// of NamedMixin's methods on the host, defaults running on the
// shadow's state.
class RenamedShadow extends NamedMixin(Shadow) {}

// Customization: override the methods you want, defaults handle
// the rest (still intercepted, just running the mixin's logic on
// the shadow's state).
class LiarShadow extends NamedMixin(Shadow) {
  override get firstName() { return "Bob"; }
}
```

The model: **every method that a composed mixin contributes is
intercepted, period.** Whatever JS prototype resolution finds on the
shadow runs — the mixin's default, an override, or a layered
mixin's override (`PoliteMixin(NamedMixin(Shadow))` works for free).

This is by design: the "rename" pattern (shadow with its own mixin
state, no overrides) is a first-class use case. Detecting "did the
subclass override?" was an earlier draft and is gone.

A planning agent should read §3.3 in the Tier 3 Detailed Spec for
the precise attach-time algorithm; the summary here is just the
mental model.

> **Footgun warning to document for shadow authors.** A shadow
> attached without overriding anything still intercepts every method
> its mixins contribute. The mixin defaults run against the
> shadow's own state — which may be empty/zero/null until the
> shadow is initialized. The host's methods may suddenly return
> blank values from the host's perspective. Initialize the shadow's
> state before attaching, or override the methods you don't want the
> defaults to apply to.

**Hybrid: `@Shadowing` decorator for non-mixin methods.** A shadow
can also mark individual methods with `@Shadowing` to add them to
the surface without composing a mixin (useful for one-off
intercepts). Composes with mixin composition. See §3.3 / §3.8 in
the Tier 3 Detailed Spec.

**Stacking semantics — multiple shadows on the same method.**
Multiple shadows compose naturally because `callDown` walks the
stack. The dispatcher invokes the *topmost* (most-recently attached)
shadow's method. That method either:

- replaces the result (no `callDown`) — the chain stops,
- modifies/observes via `callDown` — the next shadow down runs,
  recursively, until a shadow doesn't call down or we reach the
  original target's method at the bottom.

No "last-installed wins" rule. No phase ordering. The chain order is
the install order (top = newest), and each shadow chooses whether to
participate by calling — or not calling — `callDown`.

**Storage.** Per-host shadows live in a framework-private
`WeakMap<Stuff, Map<methodName, Shadow[]>>`, not as an instance
field. The list is ordered, oldest-first. The dispatcher reads from
the end (newest) and `callDown` walks toward the beginning, falling
through to the original below the first entry. See §3.1 in the
Tier 3 Detailed Spec for the full reference-discipline design.

**The `callDown` primitive.**

This is the high-level summary; §3.1 in the Tier 3 Detailed Spec
has the precise interface (including `callBypass` and the
WeakMap-backed `host` getter):

```ts
abstract class Shadow extends Stuff {
  /**
   * The single host this shadow is attached to, or null if
   * unattached. Read-only getter, backed by a framework-private
   * WeakMap. There is no setter — see §3.1 for the reference-
   * discipline design.
   */
  get host(): Stuff | null;

  /**
   * Invoke the next thing down the dispatch stack — either the next
   * shadow's same method, or the host's original method if no more
   * shadows. Args are explicit. Throws if called outside dispatch.
   */
  protected callDown<T = unknown>(...args: unknown[]): T;
}
```

**One host per shadow.** A Shadow attaches to exactly one host. If
you want a shadow's logic to apply to multiple targets, attach
multiple Shadow instances. This keeps the model simple: lifecycle
ordering is unambiguous, persistence semantics are unambiguous, and
the `this.host` reference is always meaningful.

**Args are explicit.** `callDown()` invokes the next layer with no
args; `callDown(modifiedArg)` passes one. We do not infer or default
to "the args this method was called with." Explicit is honest about
what's flowing through, and the typical case (passing exactly what
you got) is one extra spread: `callDown(...args)`.

Implementation: the dispatcher tracks dispatch state via two
mechanisms:

1. **ALS dispatch state** for `callDown`'s position-walking:
   ```ts
   { target, methodName, shadows: Shadow[], position: number, originalArgs: unknown[] }
   ```

2. **Per-shadow CallFrames pushed onto the ExecutionContext stack** —
   one frame for each shadow that actually runs, plus one for the
   original body when it runs at the bottom. **Shadows do not run as
   the target**; each runs as itself. See "Shadow identity on the
   call stack" below for why.

`callDown` reads the dispatch state, decrements `position`, pushes a
CallFrame for the next thing down (next shadow, or T at the bottom),
invokes its method, and pops the frame on return. At the bottom,
"invoking T" means calling the underlying target's original method
via a **proxy-bypass marker in ALS** — the dispatcher sets a flag in
the dispatch frame just before invoking the original; the proxy's
`get` trap honors the flag for that one call and returns the raw
method bypassing all interception. Per-target original-method maps
were considered and rejected (double the storage, no real win).

Reentrancy is handled by ALS — nested dispatches push their own
state. Concurrent dispatches on the same Shadow attached to multiple
targets are fine because state is per-async-context, not per-instance.

**Shadow identity on the call stack.** A naïve dispatch could push a
single CallFrame `{ caller: outsider, target: T, method }` and run the
entire shadow chain "as T." That's a privilege-escalation hole: an
untrusted shadow loaded from `/mods/sketchy/`, attached to a trusted
target T, would inherit T's caller identity for any onward calls.
`ApiOnly`, `FromModule('mud/api/**')`, etc. would all silently pass
through.

To prevent that, the dispatcher pushes a CallFrame *per shadow*, with
the shadow itself as the target:

```
[proxy intercepts T.method; runs T's policy with caller=outsider]
  ↓
push  { caller: outsider,  target: S_top,    method }
  S_top.method runs; this.callDown()
  ↓
push  { caller: S_top,     target: S_below,  method }
  S_below.method runs; this.callDown()
  ↓
push  { caller: S_below,   target: T,        method }
  T's original body runs
  ← pop, pop, pop
```

Consequences:

- Onward calls from inside `S_top` see `S_top` as their immediate
  caller — so `someApi.doSomething()` invoked from a sketchy shadow's
  body correctly fails `ApiOnly` when the shadow's module URL isn't
  trusted.
- Policies can directly target shadows by their identity:
  `FromModule('/mods/**')` denies onward calls from mod-loaded
  shadows; `FromTemplate('/shadows/vetted/**')` whitelists only
  approved shadow templates.
- The "caller = previous target" invariant is preserved — each
  per-shadow push obeys it.
- T's `@CallSecurity` policy is checked **once**, at entry, against the
  outside caller. It is not re-checked when T's body runs at the
  bottom (that would force every `callDown` to revalidate). The
  entry check uses the outside caller; T's body sees its immediate
  caller (the last shadow that called down). Two different "callers,"
  both correct.
- Cost: one extra ALS push/pop per shadow per dispatch. Order of
  nanoseconds; most methods have zero shadows; realistic average
  overhead is essentially zero.

**Calling `callDown` in unusual places.** Reading-only shadows:
just `const x = this.callDown(...args); /* observe */ return x;`.
Wrapping with try/catch: `try { return this.callDown(...args); }
catch (e) { … }`. Conditional bypass: `if (cond) return synthetic;
return this.callDown(...args);`. All natural.

**Direct calls to a shadow's intercepting method are illegal.**
Calling `myShadow.firstName` directly (not via dispatch through a
host) throws — there is no dispatch state for `callDown` to walk and
no host to operate against. LPC-style "treat the shadow as if it were
the host" is intentionally rejected; we want the entry point through
the host's proxy to be the only way an intercepting method runs.

**Shadow calling a method *on* its host — outside dispatch.** A
shadow may want to call methods on its host as part of its own
lifecycle (e.g., reading some state during its setup), not as a
chain-down operation. The shape:

```ts
class MyShadow extends NamedMixin(Shadow) {
  doInternalThing(): void {
    const x = this.host?.someOtherMethod(...);   // normal call through host's proxy
  }
}
```

Two paths, both supported:

1. **Default — normal call through the host's proxy.** `this.host?.someOtherMethod(...)`
   is a regular call: it goes through the host's full shadow chain,
   including `MyShadow` itself if `MyShadow` also intercepts
   `someOtherMethod`. Re-entry into the same shadow is the shadow
   author's problem to guard against.
2. **`Shadow.callBypass(host, method, ...args)` for full bypass.**
   Privileged primitive that runs the host's *original* method,
   bypassing every shadow attached to the host (including self). For
   the narrow case where the shadow needs to read the unmediated
   value — a tracer that wants to log the "real" return value
   regardless of other shadows, an internal sanity-check, etc.

Skip-self semantics ("run other shadows but not me") was rejected
as too clever.

> **Reentrancy is a developer burden under (1).** When a shadow
> calls a different host method that it *also* intercepts, the
> shadow runs again — and unless it does something different on the
> reentrant pass, it loops forever. `callDown` covers most of this
> implicitly during dispatch (the position-walking guarantees
> forward progress); the danger lives at the "method A on the
> shadow does internal lifecycle work that touches method B" seam.
> Cross-method coupling on a single shadow is genuinely weird and
> should be discouraged in code review. Most well-designed shadows
> intercept one or a small set of related methods and don't call
> sideways.

**Storage.** Per-host shadow lists live in a framework-private
`WeakMap<Stuff, Map<methodName, Shadow[]>>` (the host→shadows
direction) plus a `WeakMap<Shadow, Stuff>` (the shadow→host
direction). Both are owned and mutated only by the ShadowApi module;
neither is exposed as an instance field. The same Shadow instance
can appear under multiple keys if it covers multiple methods.
Adding/removing a Shadow updates every entry it participates in
atomically. See §3.1 in the Tier 3 Detailed Spec.

**API.**

```ts
ShadowApi.attach(target: Stuff, shadow: Shadow): void
ShadowApi.detach(target: Stuff, shadow: Shadow): void
ShadowApi.clear(target: Stuff, methodName?: string): void   // admin/system
ShadowApi.getShadows(target: Stuff, methodName: string): ReadonlyArray<Shadow>
ShadowApi.getAllShadows(target: Stuff): ReadonlyMap<string, ReadonlyArray<Shadow>>
```

Note: `attach`/`detach` instead of `add`/`remove` since one call
covers all of the shadow's methods.

**Prevent-shadow policy.** Some methods must never be shadowable.
Two layers:

1. **`@Unshadowable`** — static. Polymorphic decorator: applies to
   either a method (only that method is unshadowable) or a class
   (every method on the class is unshadowable). Throws on `attach` if
   the shadow declares the method. Framework-critical methods that
   must never be shadowed (notably `Stuff.destroy()` and
   `Stuff.isDestroyed()`) carry `@Unshadowable` directly in their
   definitions, just like any other locked-down method.
2. **`@ShadowSecurity({ attach })` with a context-aware policy** —
   dynamic. The method is shadowable in principle but specific
   contexts (e.g., calls originating from sandboxed mod code) can
   be denied. Same machinery as any other policy.

There is no separate "hard blacklist" mechanism. `@Unshadowable` is
sufficient and uniform — destroy uses it, mixin methods can use it,
domain code can use it. Constructors aren't reachable through the
inferred-surface walk anyway (they're not in any mixin's method set
and can't carry `@Shadowing`), so they need no special treatment.

> **PropertiedMixin.queryProp() / setProp() / etc.:** PropertiedMixin
> exists in part *because* shadowing `queryProp` would be a
> performance and correctness disaster — it's called everywhere and
> per-call overhead would compound. **Recommendation: mark the entire
> PropertiedMixin class with class-form `@Unshadowable`** and steer
> behavior modification toward `maskProp()` instead. Masks are scoped,
> owned (PERSISTENT_PATTERN.md:425), and intentional; shadows on
> `queryProp` would be a footgun.

This is a soft "no" — there might be a legitimate use case (admin
debug tracing, perhaps) — but the default should be ban. If we find a
real need, we can downgrade specific methods to "shadowable but only
by `Admin`."

**Lifecycle interactions.**

`prepareDestroy()` **is shadowable** — a shadow can override an
object's cleanup logic, including conditionally suppressing it.
`destroy()` is **never** shadowable: it carries `@Unshadowable` in
its definition on `Stuff`, the same mechanism any method uses to
forbid shadowing. This rules out putting shadow detach inside
`prepareDestroy` — it'd be inside the shadowable surface, which is
exactly the wrong layer for cleanup we need to guarantee runs.

Order of operations for `StuffApi.destruct(host)`:

1. `host.prepareDestroy()` runs through any installed shadow chain.
   Shadows can wrap, observe, or replace the cleanup logic via the
   normal dispatch path.
2. After `prepareDestroy` returns, the framework detaches every
   shadow currently attached to `host`. Inside the framework
   module: `_hostShadows.delete(host)` clears the host→shadows
   side; for each shadow that was attached, `_shadowHost` and
   `_shadowMethods` entries are also cleared. After this step
   `host.host` reads as `null` for every shadow, and the host has
   no shadows.
3. `host.destroy()` runs (FINAL, unshadowable, see §"Pillar 6"
   privileged-surface table). At this point the host is shadow-free;
   `destroy` only marks `_isDestroyed` and unregisters from
   `StuffApi`.

After detach, **shadows live on.** They can be reattached to a
different host. The shadow itself is only destroyed when something
explicitly calls `StuffApi.destruct(shadow)`.

The reference discipline (framework-private WeakMaps, both sides
mutated atomically by the same module function) means there is no
window where the two directions can diverge. See §3.1 in the Tier 3
Detailed Spec for the full mechanics.

When a shadow is destroyed (`StuffApi.destruct(shadow)`), its own
`prepareDestroy` detaches it from its single host (if any), then
`destroy` runs.

**Events.** Every `attach`/`detach`/`clear` dispatches an event once
the event system exists. Until then, structured log entries.

> **Persistence falls out for free.** Because `Shadow extends Stuff`,
> any mixin a shadow composes with that contributes persistent fields
> — `NamedMixin`, `PropertiedMixin`, etc. — gives that shadow
> persistence automatically through the same `Hydrator` pipeline as
> any other Stuff. Most shadows (transient buffs, debug tracers)
> won't declare persistent fields and won't persist. Some might
> (e.g., a long-running enchantment on an item). The framework
> doesn't have to do anything special; it's the existing persistence
> machinery applied to a new top-level branch. Re-attachment on
> restart (the "where was this shadow installed?" question) is a
> separate problem and remains a stretch — see Tier 5.

### 5. Audit / logging

Every denied call, every shadow install, every destroyed-object hit is
logged structured. Format:

```
{ kind: 'security_deny', caller, target, method, policy, callStack }
{ kind: 'shadow_added', target, method, by: caller }
{ kind: 'destroyed_access', target, method, by: caller }
```

Lands in `MudlogApi` once that exists; until then a thin `console.warn`
shim is fine, but the *call sites* should already use the structured form.

### 6. Privileged-surface mediation

Some methods exist but should never be called from outside the Api
layer. Today they're protected by social convention and `#`/`private`.
With CallSec, they become `@CallSecurity(ApiOnly)`:

| Surface                                  | Restrictions             |
| ---------------------------------------- | ------------------------ |
| `Stuff.destroy()`                        | `@Final @Unshadowable @CallSecurity(ApiOnly)` (no override, no shadow, only `StuffApi.destruct`) |
| `Stuff.isDestroyed()`                    | `@Final @Unshadowable` (no override, no shadow; read invariant) |
| `Stuff._addShadowInternal()` etc.        | `ApiOnly` (only `ShadowApi`) |
| `Containable.setEnvironment()` (if exposed) | `ApiOnly` (only `ContainmentApi.move`) |
| Manager-layer mutations                  | `ApiOnly`                |
| `PropertiedMixin.unmaskProp()`           | implicit owner via callstack (see PERSISTENT_PATTERN.md:425) |

The last one is interesting and already pre-baked into the codebase:
`maskProp` currently takes an explicit owner `Stuff`; once CallSec
lands, that defaults to "nearest `Stuff` on the call stack" and the
parameter becomes implicit again.

---

## `@Final` — Adjacent Decorator

`@Final` is not strictly a CallSec feature, but it rides on the same
infrastructure (the Tier 2 loader hook) and addresses an existing
pain point: methods marked "DO NOT OVERRIDE" by comment have no
enforcement. TypeScript has no `final` keyword. This decorator gives
us one.

### Purpose

Prevent subclasses from overriding a method declared `@Final` on an
ancestor. Replaces convention/comments with actual class-load-time
enforcement. The motivating case is `Stuff.destroy()`, whose
correctness invariant ("never override; always unregisters") is
currently a comment. Other "DO NOT OVERRIDE" comments in the codebase
get the same treatment.

### API

```ts
function Final(target: any, propertyKey: string): void;
class FinalViolationError extends Error { /* … */ }
```

`@Final` is a method-level decorator. No arguments. Either the
ancestor's method is final, or it isn't.

### Storage

```ts
const _finalMethods: WeakMap<Function /* class */, Set<string /* method */>> = new WeakMap();

function Final(target: any, propertyKey: string): void {
  // target is the class prototype for instance methods
  const cls = target.constructor;
  let methods = _finalMethods.get(cls);
  if (!methods) {
    methods = new Set<string>();
    _finalMethods.set(cls, methods);
  }
  methods.add(propertyKey);
}
```

### Enforcement timing

**Class load time, via the Tier 2 loader hook.** When the loader
hook stamps a newly-imported class into the module-ID `WeakMap`, it
also runs `validateNoFinalOverrides(cls)` on it. If validation
fails, the loader hook throws — which means **the import itself
throws**. The bad subclass never makes it into the module graph; no
instantiation is needed for the violation to surface. CI catches it
even for classes that aren't constructed in tests.

This is preferred over instance-creation-time enforcement (which
would only fire when someone actually `new`s the offending class).

### Validation algorithm

```ts
function validateNoFinalOverrides(cls: Function): void {
  let proto = cls.prototype;
  while (proto && proto !== Object.prototype) {
    const ancestor = Object.getPrototypeOf(proto);
    if (!ancestor || ancestor === Object.prototype) break;

    const ancestorFinals = _finalMethods.get(ancestor.constructor);
    if (ancestorFinals) {
      for (const name of ancestorFinals) {
        if (Object.hasOwn(proto, name)) {
          throw new FinalViolationError(
            `${cls.name} overrides final method ` +
            `${ancestor.constructor.name}.${name}`
          );
        }
      }
    }
    proto = ancestor;
  }
}
```

Multi-level inheritance handled correctly: `A` declares `@Final foo`,
`B extends A` doesn't override, `C extends B` overrides `foo` —
`C`'s import throws because `validateNoFinalOverrides(C)` walks all
the way up to `A` and finds `foo` is final there.

### Independence from other decorators

`@Final`, `@Unshadowable`, and `@CallSecurity` are orthogonal.
Compose freely:

| Decorator             | Prevents                                    | Checked when      | Concerns          |
| --------------------- | ------------------------------------------- | ----------------- | ----------------- |
| `@Final`              | Subclass redefining the method              | Class load        | Class hierarchy   |
| `@Unshadowable`       | Runtime shadow attaching to the method      | Shadow attach     | Runtime composition |
| `@CallSecurity(p)`    | Unauthorized callers invoking the method    | Each call         | Access control    |

`destroy` needs all three — the override is structural, the shadow
is runtime, the caller is authorization. Each decorator handles one
concern; all three apply uniformly to any method on any class:

```ts
class Stuff {
  @Final @Unshadowable @CallSecurity(ApiOnly)
  destroy(): void { /* unregister + cleanup */ }
}
```

### Wiring in `Stuff.ts`

After Tier 2 lands, we sweep `Stuff.ts` (and any other framework
core class) for "DO NOT OVERRIDE" comments and replace them with
`@Final`:

| Method                | Decorator(s)                                                |
| --------------------- | ----------------------------------------------------------- |
| `Stuff.destroy()`     | `@Final @Unshadowable @CallSecurity(ApiOnly)`               |
| `Stuff.isDestroyed()` | `@Final @Unshadowable` (read invariant)                     |

The list will grow as we audit. Anywhere the codebase currently has
"DO NOT OVERRIDE" or "FINAL — never override" in a comment is a
candidate.

### Caveats / limits

- **Doesn't prevent runtime monkey-patching.** Someone can still do
  `Stuff.prototype.destroy = (...) => …` from JS. That's a
  deliberately hostile act, not an accidental override; the goal of
  `@Final` is to catch *honest mistakes* (subclass authors not
  realizing they shouldn't override) and *test-time accidents*, not
  to defeat malicious code that already has full JS access.
- **Doesn't prevent shadowing.** A shadow can still intercept a
  `@Final` method (unless `@Unshadowable` is also applied) — shadows
  aren't class hierarchy modifications, they're runtime
  interception. Two distinct mechanisms, two distinct decorators.
- **Static methods aren't covered.** Same rationale as the rest of
  the framework — instance behavior only.

### Tests

- Subclass overrides a `@Final` method → class import throws
  `FinalViolationError`.
- Subclass doesn't override → import passes.
- Multi-level: A has `@Final foo`, B extends A and doesn't override,
  C extends B and overrides foo → C's import throws (foo's final
  marker on A is still enforced two levels down).
- Sibling subclasses: B and C both extend A, only C overrides → B's
  import passes, C's import throws.
- `@Final` + `@Unshadowable` + `@CallSecurity` on the same method:
  all three enforced, independently.
- A method NOT marked `@Final` can still be overridden — no false
  positives.
- `Object.hasOwn` discrimination: walking up the chain, an inherited
  method that hasn't been redefined doesn't trigger a false positive
  on a class further down.

### Where the loader-hook work lives

This is **Tier 2 work**, not Tier 3. The decorator and validator are
small (~30 lines). The non-trivial part — the loader hook
infrastructure — is already on the Tier 2 critical path for module
URL capture; we just add one more check inside it. About a half-day
of additional work in Tier 2.

---

## Architecture

### Interception strategy: decorator vs. Proxy

PLAN.md originally proposed a `@CallSecurity(...)` decorator alone.
We've settled on **Option C (hybrid) — decorator for authoring, Proxy
for enforcement.** The three options were:

**Option A — Decorator only.** Each guarded method is annotated
`@CallSecurity(Policy)`. Wraps the descriptor at class-definition time.
Pros: explicit, zero runtime overhead on un-decorated methods, no
per-instance allocation, plays well with TS. Cons: opt-in; an
unannotated method is a hole; doesn't catch `someMethodAddedAtRuntime`.

**Option B — Proxy only.** `StuffApi.create` / `clone` returns a
`Proxy<Stuff>`. The proxy `get` trap inspects per-method metadata
(class-level config) and applies guards uniformly. Pros: catches every
call including dynamic ones; lets us add guards without touching method
sites. Cons: every property access pays trap cost; `this` aliasing
inside a method bypasses the proxy (the trusted-method-bypass is
*intended*, but it's surprising); interacts oddly with
`instanceof` and reflection.

**Option C — Hybrid (recommended).** Decorator at definition time for
the common case; Proxy installed by `StuffApi.create` for the
destroyed-object check + as a fallback for runtime-added methods.
Trusted method bodies access fields as `this.#x` so they bypass the
proxy entirely (see CLAUDE.md:600 — this is exactly why the layer rule
mandates `#` in `mud/api/` and `mud/backend/`).

CLAUDE.md already takes the position that the framework is
"Proxy-based" (CLAUDE.md:533, 600, 606). The decorator is the
*authoring* surface; the Proxy is the *enforcement* surface.

### Component map

```
   ┌────────────────────────────────────────────────────────────┐
   │                    @CallSecurity(policy)                        │ ← authoring
   │  (TS decorator, wraps method descriptor at class def time) │
   └─────────────────────────┬──────────────────────────────────┘
                             │ produces
                             ▼
   ┌────────────────────────────────────────────────────────────┐
   │                       Proxy<Stuff>                         │ ← enforcement
   │   - destroyed check                                        │
   │   - policy lookup + caller resolution                      │
   │   - shadow stack execution                                 │
   │   - ExecutionContext.run() wrapper                         │
   └─────────────┬──────────────────┬───────────────────────────┘
                 │                  │
                 ▼                  ▼
        ┌────────────────┐  ┌──────────────────┐
        │ ExecutionCtx   │  │ ShadowApi /      │
        │ (ALS callstack)│  │ ShadowStack      │
        └────────────────┘  └──────────────────┘
                 │
                 ▼
        ┌────────────────┐
        │ SecurityPolicy │  → Public / SelfOnly / SystemRoot /
        │  (allows())    │     FromTemplate / FromModule / ApiOnly /
        │                │     Custom + AllOf / AnyOf / Not
        │                │     (Admin / ByCommandGiver /
        │                │      ByActingAvatar / ByResponsibleAvatar
        │                │      deferred — no consumer in v1)
        └────────────────┘
```

### Errors

- `DestroyedObjectError` — touching a destroyed `Stuff`
- `SecurityError` — policy denied the call
- `ShadowError` — shadow install / remove / dispatch failed
- `FinalViolationError` — class load detected a subclass overriding
  a `@Final`-marked method (Tier 2)

All extend `Error`. `DestroyedObjectError` and `SecurityError`
carry the `stuffId` and method name; `ShadowError` carries the
shadow's stuffId and host's stuffId where relevant;
`FinalViolationError` carries the offending class name and
overridden-method qualified name.

---

## Integration With Existing Systems

### `Stuff` lifecycle (PROTECTED_LIFECYCLE.md, ARCHITECTURE_PATTERNS.md:80)

The infrastructure is already half-built and *waiting* for CallSec:

- `Stuff.destroy()` is documented as FINAL and clearly scoped to "be
  locked down once the call security framework lands"
  (Stuff.ts:21–23, CLAUDE.md:359, PROTECTED_LIFECYCLE.md:73). The
  "FINAL" comment is currently convention-only.
- `StuffApi.destruct()` is the canonical entry point and the obvious
  whitelisted caller of `destroy()`.
- The `_isDestroyed` flag and the `WeakMap<Stuff, DestroyedObjectMetadata>`
  in `StuffApi` already track exactly what the destroyed-object guard needs.

**Actions on `Stuff.destroy()`:**
- `@CallSecurity(ApiOnly)` — only `StuffApi.destruct` can call it.
- `@Unshadowable` — no shadow can replace the unregistration logic.
- `@Final` — no subclass can override; the "DO NOT OVERRIDE" comment
  becomes class-load-time enforcement (Tier 2).

Automatic destroyed-check applies on every other guarded method via
the universal Proxy.

### Api layer (ARCHITECTURE_PATTERNS.md, CLAUDE.md "Critical Architectural Principles")

The "go through Api layer" rule is already the cornerstone of the
codebase: `StuffApi.destruct`, `ContainmentApi.move`, `MessageApi.*`,
`MqlApi.resolve`, etc. CallSec promotes this from convention to
enforcement.

**Action:** mark Api classes (probably a `static readonly _isApi =
true` or a `Symbol.for('saxonberg.api')` tag); `ApiOnly` policy
checks for that marker on a frame somewhere in the call stack.

### Mixin framework

Mixins are where most public methods live. We need decorator support
to survive the mixin pipeline (function-of-base-returns-class).
TypeScript decorators do work on classes returned from functions, so
this should be fine, but we should test it explicitly.

**Open question:** does shadow tracking work for mixin-defined
methods? It needs to, since most behavior is mixin-defined.

### Hydrator / persistence — *not* an exception

Earlier drafts treated the Hydrator as a privileged "system context"
that bypasses policies. **Revised position: don't.** Hydrators are
themselves `Stuff`. They have stuffIds, they have a class path
(`/lib/persistence/PersistentHydrator`), they get pushed onto the call
stack like anything else when they're invoked. Policies that care
about the hydrator can match on `FromClass('/lib/persistence/PersistentHydrator')`
or `FromClass(..., { includeSubclasses: true })`.

The cases this affects:

- **Bracket-assignment of persistent fields.** Already exempted by
  shape: setters run, but the persistent-field setter pattern (CLAUDE.md
  "Hydrator exception") just means the setter itself does the work.
  No CallSec-specific carve-out needed; the setter's own `@CallSecurity`
  annotation (if any) decides.
- **postRegister hooks.** Run in the Hydrator's frame; targets that
  want to allow/deny that can match on the class path.
- **Setter shadows during hydration.** *Will fire.* That's fine — if
  someone installed a shadow on a persistent field's setter, they
  presumably wanted it to fire on hydration too. If we discover this
  is bad in practice, we can ban shadowing setters via
  `@UnshadowableClass`.

**No** `runAsSystem()` escape hatch. The closest equivalent is "run
without pushing a frame," which we should reject — the whole point of
the framework is that there is no privileged out-of-band caller
identity.

### Command framework

Commands already build a `CommandContext { avatar, interactive,
location, … }`. The natural caller for CallSec when executing a user
command is the **CommandGiver** — which is *not always an Avatar*.
NPCs, scripted actors, and (eventually) AI-driven characters all
issue commands through `CommandGiverMixin`, and policies need to
work for all of them.

**Action:** `CommandGiverMixin.executeCommand` wraps execution in:

```ts
ExecutionContext.run(this /* commandGiver */, target, 'executeCommand', fn);
```

From that point on, every guarded call inside the command sees the
CommandGiver (Avatar *or* NPC) as the immediate caller.

**Three stack-walk helpers:**

```ts
ExecutionContext.getCurrentCommandGiver(): CommandGiver | null
ExecutionContext.getActingAvatar(): Avatar | null
ExecutionContext.getResponsibleAvatar(): Avatar | null
```

- `getCurrentCommandGiver` walks up from the current frame looking
  for any `CommandGiver` (Avatar or NPC). The immediate command issuer.
- `getActingAvatar` walks up looking for a human-driven Avatar
  (Avatar with at least one `Interactive` attached). The most recent
  human in the chain.
- `getResponsibleAvatar` walks *down* from the bottom looking for a
  human-driven Avatar. The original initiator.

All three return `null` when no matching frame exists — e.g., a
scheduler-driven tick, a server-startup script, or in the case of
the Avatar helpers, an NPC-only autonomous chain.

> **All three are call-stack walks and have the same blind spots.**
> Across prompt resumes, scheduled events, and cross-actor
> messaging, the call stack disappears and rebuilds fresh — the
> helpers will return null at moments where attribution morally
> still applies. See Non-Goals → Responsibility on the call stack.
> The future command-stack framework will provide a parallel
> attribution layer that survives those gaps; until then, treat null
> from these helpers as "I don't know" rather than "no one is
> responsible."

**Frame-marking convention.** When `executeCommand` pushes its frame,
it should annotate the frame with `metadata: { kind: 'command' }` so
the stack walker can be efficient (skip non-command frames). Cheap;
just a constant tag. The same annotation is what the future
command-stack framework will also use to identify command-issuance
events when it builds its parallel attribution stack.

### Event system (when it exists)

Shadow installs/removes dispatch events; security denials dispatch
events. ExecutionContext is available inside event handlers.

### Sandboxing (Phase 9–10)

Modder code runs in `isolated-vm`. CallSec runs in the trusted
process. Bridged APIs need to inject a `caller` corresponding to
the mod, so policies can distinguish "core code" from "mod X."
Out of scope for v1 of CallSec, but **the public API should leave
room for it** — specifically, `ExecutionContext.run` should accept
an arbitrary `Stuff`-like caller, not just objects from the trusted
heap.

---

## Developer Experience

### Authoring

```ts
class Avatar extends Character {
  @CallSecurity(SecurityPolicies.Admin)
  addXp(amount: number): void { /* … */ }

  @CallSecurity(SecurityPolicies.ByResponsibleAvatar((a, target) => a === target))
  setPassword(pw: string): void { /* … */ }

  // No decorator on a public method → defaults to Public.
  getName(): string { return this.name; }

  // Private helpers are exempt from security checks regardless;
  // CallSec only intercepts dispatched method calls.
  private checkLevelUp(): void { /* … */ }
}
```

**Naming.** The decorator is `@CallSecurity`, not `@Secured`. The
default for missing or bare-`@CallSecurity()` annotations is
**Public** — the "destroyed-check + tracking" half of the framework
runs uniformly via the Proxy and doesn't need a decorator to switch on.

**Mixin defaults + class override.** A mixin can annotate the methods
it contributes, setting a default policy; the implementing class can
redeclare the method with its own annotation to override:

```ts
// In NamedMixin
@CallSecurity(SecurityPolicies.Public)
get firstName(): string { … }

// In some class extending NamedMixin(Stuff)
@CallSecurity(SecurityPolicies.Admin)   // override: harden it
override get firstName(): string { … }
```

Three states are possible when a subclass interacts with a mixin
method:

1. **Don't redeclare** → mixin's policy applies.
2. **Redeclare with a new `@CallSecurity(...)`** → the new policy
   replaces the mixin's.
3. **Redeclare without a decorator** → mixin's policy *still*
   applies. The redeclaration overrides the body, not the security
   contract. To weaken (or strengthen) the policy you must redeclare
   *both* the method *and* its decorator.

This makes the contract safe by default: you cannot accidentally
drop security by overriding behavior. The framework's resolver walks
the prototype chain at proxy-creation time and uses the closest
decorator it finds (subclass first, mixin's as fallback, framework
default of Public only if nothing in the chain has one).

### Debugging

```ts
@CallSecurity(SecurityPolicies.Admin)
dangerousOp(): void {
  ExecutionContext.assertCaller(AdminAvatar);   // belt + suspenders
  ExecutionContext.dumpCallStack();
  // …
}
```

### Linting (stretch)

ESLint rule `require-secured-decorator`:

- Flags public methods on `Stuff` subclasses without `@CallSecurity`.
- Excludes `_`-prefixed methods, `constructor`, getters/setters.
- Configurable allowlist for trivial methods.

### Testing

Three new patterns:

1. **Policy tests.** Construct caller A, target B, assert
   `policy.allows(A, B, 'm')` is true/false. Trivial, table-driven.
2. **Integration tests.** Wrap a call in `ExecutionContext.run(caller,
   target, method, () => target.method())` and assert it throws or
   succeeds.
3. **Shadow tests.** Add shadow, call, assert order/args/return;
   remove, assert pristine behavior restored.

---

## Performance

PLAN.md's claimed budget:

- AsyncLocalStorage: 1–2% per guarded call
- Decorator destroyed+policy check: ~0.5%
- Shadow stack: O(n), n typically 0

Notes / risks:

- ALS overhead is highest when *creating* a new context. Reusing the
  parent stack via `als.getStore() ?? new CallStack()` avoids that for
  nested calls.
- Proxy traps are non-trivial. If we go hybrid, the Proxy should
  *only* trap `get` (for method dispatch + destroyed check), not
  `set` / `has` / others.
- Hot paths (e.g., per-tick AI, per-message routing) should not be
  guarded. The pattern is: guard the *entry* (the command, the message
  dispatch), not the inner loop.
- Per-instance shadow Map is allocated lazily on first `add`. Most
  instances have no shadows and pay zero memory cost.

Benchmark target: a guarded call with no policy and no shadows
should be within 5% of the unguarded baseline.

---

## Open Questions / Unresolved

Most of the original list has been resolved and folded into the body
of this doc. Two genuine open questions remain — both deferred, not
blocking:

1. **Should constructors themselves be securable?** The natural
   meaning would be: when `StuffApi.create` is invoked with a factory
   producing class `X`, the policy on `X`'s constructor is checked
   against the *real cloner* (the frame below the StuffApi synthetic
   — see §"Pillar 1 / Constructor frames"). So
   `@CallSecurity(Admin) constructor() {…}` would mean "only admins
   can clone this class." That's a clean semantic and probably what
   we want, but it interacts subtly with multi-step construction
   (subclass constructors calling `super()`, hydration assigning to
   fields, `postRegister` hooks). Pin it; revisit when we have a
   securable-constructor use case in hand.

2. ~~**Class-level decorator.**~~ Resolved: pulled forward into v1.
   `@CallSecurity` is polymorphic — applies to either a method
   (mandatory policy for that method) or a class (default policy
   for unannotated methods on the class). The decorator function
   inspects how many arguments TypeScript handed it (3 = method,
   1 = class) and forks behavior. `@Unshadowable` is polymorphic
   in the same way. Method-form always wins over class-form during
   policy resolution; the class-form serves as a fallback ahead of
   the framework default of `Public`. This is what eliminates
   per-method boilerplate on the Application/Api decoration sweep.

---

## Phasing — what to actually build

Ambitious end-state has six pillars. Realistic options for a first
cut:

### Tier 1 — Minimum viable (2–4 days)

The smallest thing that pays for itself immediately:

- `ExecutionContext` + `AsyncLocalStorage` + `CallFrame` / `CallStack`
- `@CallSecurity(policy?)` decorator (polymorphic — method or class)
- `@Unshadowable` decorator (polymorphic — method or class), as
  metadata-only stubs for Stage 3 to consume
- Destroyed-object guard
- Built-ins: `Public`, `SystemRoot`, `SelfOnly`, `Custom`,
  `AllOf` / `AnyOf` / `Not`, plus a stub `ApiOnly` (replaced in
  Tier 2 by real `FromModule('mud/api/**')`)
- `SecurityError`, `DestroyedObjectError`
- Lock down `Stuff.destroy()` with `ApiOnly`
- Wire `CommandGiverMixin.executeCommand` to push the CommandGiver frame
- `ExecutionContext.getCurrentCommandGiver()` (call-stack walk;
  null across async-pause gaps as documented). Avatar-aware
  helpers `getActingAvatar()` / `getResponsibleAvatar()` deferred
  with their consuming policies — no v1 consumer.

This unlocks: "the convention is now a check," destroyed-object
safety, command-aware policies, and the foundation for everything
else. No shadows, no Proxy, no caller-identity model yet.

### Tier 2 — Caller identity + richer policies + `@Final` (3.5–4.5 days)

- **Module-ID capture via Node loader hooks.** `module.register`-style
  customization hook intercepts every import, stamps every exported
  class into a `WeakMap<Class, ModuleId>`. Module IDs are
  `path#exportName` (matching the existing blueprint-resolution
  format). Verify compat with `tsx` / `vite` / Vitest before
  committing.
- Caller identity bundle resolver: stuffId, module ID, template path
  (if cloned). Single canonical "caller path" string for matching;
  fail closed if neither module ID nor template path is present.
- `FromTemplate(glob)`, `FromModule(glob, opts)`
- Synthetic-frame injection for static Api callers
- Audit log shim (structured `console.warn` until MudlogApi exists)
- ESLint stub — including the "redeclaration weakens policy" rule
  from Open Q #4
- **`@Final` decorator + class-load-time validation.** Decorator
  stamps method names into a `WeakMap<Class, Set<methodName>>`.
  Loader hook, when stamping a newly-imported class, also runs
  `validateNoFinalOverrides(cls)` — walks the prototype chain and
  throws `FinalViolationError` if the class has its own descriptor
  for any ancestor's `@Final`-marked method. New error type
  alongside `SecurityError` / `DestroyedObjectError`.
- **Sweep `Stuff.ts` and other framework core for "DO NOT OVERRIDE"
  comments**, replacing them with `@Final`. At minimum: `Stuff.destroy`,
  `Stuff.isDestroyed`. Audit any other "DO NOT OVERRIDE" comments
  and convert.
- Tests: subclass overriding `@Final` → import throws; multi-level
  inheritance enforcement; sibling subclasses (one overrides, one
  doesn't) — only the offender throws; `@Final` composes with
  `@Unshadowable` and `@CallSecurity` independently.

### Tier 3 — Shadows as Stuff (5–7 days, full spec below)

The Tier 3 specification is detailed enough that it has its own
section — see **§"Tier 3 — Detailed Spec"** below this Phasing
section. Tier 3 covers:

- The `Shadow extends Stuff` class and its instance state
  (WeakMap-backed reference discipline)
- Extending `MixinApi` with a per-mixin method-set registry
- Attach and detach algorithms (with the inferred-surface walk —
  all mixin methods intercepted, plus `@Shadowing`-marked methods)
- Dispatch through the proxy (per-shadow CallFrames; entry policy
  fires once at the top)
- `callDown` and `callBypass`
- `@Shadowing`, `@Unshadowable`, `@UnshadowableClass`,
  `@ShadowSecurity` (per-op for attach/detach)
- Authority for attach / detach / clear
- Lifecycle ordering on host destruct (`prepareDestroy` runs
  through chain, then framework detach, then `destroy`)
- Persistence (mixin-derived; attachment records deferred to Tier 5)
- Tests

Read the detailed spec before starting Tier 3.

### Tier 4 — Proxy enforcement layer (3–5 days)

- `StuffApi.create`/`clone` returns `new Proxy(stuff, callSecHandler)`
- Handler checks destroyed + applies decorator-declared policies
- Trusted-method bypass via `#` fields verified
- Mixin decorator behavior verified

### Tier 5 — Stretches (open-ended)

- Permission strings (`SecurityPolicies.RequirePermission('admin.*')`)
- Transactional decorator (`@Transactional` rollback)
- Persistent shadows (attachment records, re-attach on restart)
- Mod-bridging for sandboxed code (synthetic mod-caller `Stuff`s)

---

## Tier 3 — Detailed Spec

Everything needed to build shadows in one go, with no surprises. Read
top to bottom; sections cross-reference each other but assume forward
order on first read.

### 3.1 Class shape

```ts
// Framework-internal, owned by the ShadowApi module. Not exported.
const _hostShadows: WeakMap<Stuff, Map<string, Shadow[]>> = new WeakMap();
const _shadowHost:  WeakMap<Shadow, Stuff> = new WeakMap();
const _shadowMethods: WeakMap<Shadow, ReadonlySet<string>> = new WeakMap();

abstract class Shadow extends Stuff {
  /**
   * The single host this shadow is attached to, or null if
   * unattached. READ-ONLY GETTER — backed by the framework's
   * private _shadowHost WeakMap. There is no setter; user code
   * cannot write this field.
   */
  get host(): Stuff | null {
    return _shadowHost.get(this) ?? null;
  }

  /**
   * The set of host method names this shadow is currently
   * intercepting. Computed at attach time by the inferred-surface
   * walk; immutable for the duration of attachment. READ-ONLY.
   */
  get interceptedMethods(): ReadonlySet<string> {
    return _shadowMethods.get(this) ?? EMPTY_SET;
  }

  /**
   * Chain to the next thing in the dispatch stack — the shadow
   * directly below this one, or the host's original method if this
   * shadow is at the bottom. Args are explicit; pass exactly what
   * you want the next layer to receive.
   *
   * Throws if called outside of an active dispatch.
   */
  protected callDown<T = unknown>(...args: unknown[]): T {
    return ShadowApiInternal.callDown(this, args) as T;
  }

  /**
   * Run a method on this shadow's host bypassing all shadows
   * (including this one). For internal-lifecycle work where the
   * shadow needs the unmediated value.
   *
   * Throws if `this.host` is null.
   */
  protected callBypass<T = unknown>(method: string, ...args: unknown[]): T {
    return ShadowApiInternal.callBypass(this, method, args) as T;
  }
}
```

Shadows are instantiated through the standard pipeline: `StuffApi.create(() => new MyShadow())`
or `StuffApi.clone('/template/path')` — same as any other Stuff. They
get stuffIds, can be looked up by id, can be persisted (see §3.11).

### 3.2 Mixin method-set registry

`MixinApi` already records which mixins exist. We extend it to record
*which method names each mixin contributes*:

```ts
MixinApi.registerMixin(proto, name): void {
  // existing behavior +
  const methods = new Set<string>();
  for (const m of Object.getOwnPropertyNames(proto)) {
    if (m === 'constructor') continue;
    if (m.startsWith('_mixinName')) continue;
    methods.add(m);
  }
  // Object.getOwnPropertySymbols deliberately excluded — symbols
  // aren't part of the shadow surface for v1.
  // Static methods also excluded — mixins are about instance behavior.
  // …store the set under `name`…
}

MixinApi.getMixinMethods(name: string): ReadonlySet<string>;
```

That's the entire registry change. The method set is computed once
at `registerMixin` time and never recomputed.

We do **not** need to track which prototype layer in a class chain
corresponds to which mixin. Earlier drafts of this spec did, in
order to distinguish "shadow's override" from "mixin's default" —
that distinction is gone in v1 (see §3.3). All mixin methods are
intercepted; whatever prototype resolution finds runs.

Accessors (getters/setters) appear in the method set under their
property name. They are intercepted as a unit — a shadow's getter
or setter runs whichever side is invoked by the caller; the
other side falls through prototype resolution like any normal
method access.

### 3.3 Attach algorithm and inferred-surface walk

`ShadowApi.attach(host: Stuff, shadow: Shadow): void`:

**Step 1 — Reject misuse.**

- If `shadow.host` is not null: throw `ShadowError("shadow already attached; detach first")`.
- If `host` is destroyed: throw `DestroyedObjectError`.
- If shadow is destroyed: throw `DestroyedObjectError`.

**Step 2 — Compute the intercept set.**

The set is a simple union from two sources — mixin composition AND
`@Shadowing` decorator marks. Both contribute to the final
`interceptedMethods`.

**Source A — composed mixins.** Iterate registered mixins. For each
mixin M that the shadow's class composes
(`MixinApi.hasMixin(shadow.constructor, M)`), add every name in
`MixinApi.getMixinMethods(M)` to the intercept set. That's it. We
do not check whether the shadow's class overrode the mixin's
defaults — overrides and defaults are equally valid shadow
behavior. Whatever resolves on `shadow`'s prototype at dispatch time
is what runs.

This is the "renamed shadow" pattern in its purest form:

```ts
class RenamedShadow extends NamedMixin(Shadow) {}

const rs = await StuffApi.create(() => new RenamedShadow());
rs.firstName = "Bob";              // shadow's own NamedMixin state
ShadowApi.attach(alice, rs);
alice.firstName;                   // "Bob" — mixin default on shadow state
```

Layered mixin overrides (`PoliteMixin(NamedMixin(Shadow))`) work for
free: the union covers both mixins' methods; PoliteMixin's overrides
get found by prototype resolution before NamedMixin's defaults at
dispatch time.

> **Footgun warning to document for shadow authors.** A shadow
> attached without overriding anything still intercepts every method
> its mixins contribute. The mixin defaults run against the
> shadow's own state — which may be empty/zero/null until the shadow
> is initialized. From the host's perspective the methods may
> suddenly return blank values. Initialize the shadow's state before
> attaching, or override the methods you don't want the defaults to
> apply to.

**Source B — `@Shadowing` marks.** Walk the shadow's class chain
from `shadow.constructor.prototype` up to (excluding)
`Shadow.prototype`. For each prototype layer, find every property
marked with the `@Shadowing` decorator. For each:

- If `@Shadowing` is bare: add the property's name (the local method
  name) to the intercept set, mapping it to host method of the same
  name.
- If `@Shadowing('hostMethodName')`: add `hostMethodName` to the
  intercept set, mapped to this local property.

The mapping (local name → host method name) is stored in a
per-shadow lookup so dispatch knows which local method to invoke
when the host's renamed method fires. For mixin-derived methods the
mapping is identity (local name = host method name).

**Step 3 — Reject if empty.**

If `interceptedMethods` is empty: throw `ShadowError("shadow class
has no surface — compose a mixin or mark methods @Shadowing")`. A
no-surface shadow is a bug.

**Step 4 — Validate against shadowability decorators.**

For each `m` in `interceptedMethods`:

- If the host's class (or any ancestor) has class-form `@Unshadowable`:
  throw `ShadowError`.
- If the host's class (or any ancestor) has method-form `@Unshadowable`
  on `m`: throw `ShadowError`.

`destroy`, `isDestroyed`, and any other framework-critical methods
that must never be shadowed carry `@Unshadowable` directly — they're
caught by this same check, no special-case list. (Constructors
aren't reachable through the inferred-surface walk regardless: not
in any mixin's method set, can't carry `@Shadowing`.)

**Step 5 — Run `@ShadowSecurity({ attach })` checks.**

For each `m` in `interceptedMethods`:

- Walk the host's class hierarchy looking for `@ShadowSecurity` on
  `m`. (Prototype-chain walk, same semantics as `@CallSecurity`
  resolution: closest decorator wins, mixin's policy is the default
  if subclass doesn't redeclare with a decorator.)
- If found, extract the `attach` policy (or the shorthand single
  policy if not in object form). If a policy is present, run
  `policy.allows(currentCaller, host, m)`. On deny, throw
  `SecurityError`.

`@ShadowSecurity({ detach })` is checked at detach time, not here.
Only the attach policies are relevant at attach time.

**Step 6 — Atomic install.**

If steps 1–5 all passed, mutate state. All mutation happens inside
the framework module which has access to the private WeakMaps:

- Get or create `_hostShadows.get(host)` → `Map<string, Shadow[]>`.
- For each `m` in `interceptedMethods`: push `shadow` onto the
  array at key `m` (creating the array if needed).
- Set `_shadowHost.set(shadow, host)`.
- Set `_shadowMethods.set(shadow, frozen interceptedMethods)`.

Step 6 cannot fail. If anything in 1–5 throws, no state has been
mutated. **Both directions of the link are written from the same
module function in the same call, with no externally-reachable
intermediate state.** There is no API surface that would let the
maps drift out of sync.

**Step 7 — Audit.**

Log a structured audit entry: `{ kind: 'shadow_attached', shadow:
shadow.stuffId, host: host.stuffId, methods: [...interceptedMethods],
attacher: currentCaller?.stuffId }`. (Once MudlogApi exists, route
through it; until then, console.warn shim.)

### 3.4 Detach and clear

`ShadowApi.detach(shadow: Shadow): void`:

**Step 1 — Read state.** `host = _shadowHost.get(shadow)`. If
undefined: no-op (idempotent).
`methods = _shadowMethods.get(shadow)`.

**Step 2 — Run `@ShadowSecurity({ detach })` checks.**

For each `m` in `methods`:
- Resolve the host's `@ShadowSecurity` for `m` (same prototype-chain
  walk as attach; closest decorator wins; mixin default fallback).
- If a `detach` policy is present (object form) or the shorthand
  single policy applies, run `policy.allows(currentCaller, host, m)`.
- On any deny, throw `SecurityError`. The detach is atomic — no
  partial removal.

**Step 3 — Atomic remove.**

Inside the framework module:
- `methodMap = _hostShadows.get(host)`.
- For each `m` in `methods`:
  - Remove `shadow` from `methodMap.get(m)`.
  - If the array is now empty, delete the entry.
- If `methodMap` is now empty, `_hostShadows.delete(host)`.
- `_shadowHost.delete(shadow)`.
- `_shadowMethods.delete(shadow)`.

**Step 4 — Audit.** `{ kind: 'shadow_detached', shadow: shadow.stuffId,
host: host.stuffId, detacher: currentCaller?.stuffId }`.

Default authority: anyone with a reference to the shadow can call
detach, *if* no method's `@ShadowSecurity({ detach })` denies.
Methods can lock down detach (e.g., admin-installed tracers that
players shouldn't be able to yank off).

`ShadowApi.clear(host: Stuff, methodName?: string): void`:

- Authorize: `Admin` policy (responsible Avatar has admin flag) OR
  null caller (system context). Otherwise throw `SecurityError`.
- If `methodName` provided:
  - Read `_hostShadows.get(host)?.get(methodName) ?? []`. For each
    shadow in the snapshot, detach (which removes it from *all* its
    method entries, not just `methodName`).
- Otherwise (clear all):
  - Snapshot all distinct shadows attached to `host` (across all
    methods). Detach each.

`ShadowApi.getShadows(host, methodName): ReadonlyArray<Shadow>` — read-only.
`ShadowApi.getAllShadows(host): ReadonlyMap<string, ReadonlyArray<Shadow>>` — read-only.

### 3.5 Dispatch (proxy invocation)

When the host's proxy intercepts `host.method(...args)`:

**Step 1 — Bypass marker check.** If ALS has the bypass marker set
(see §3.7), clear the marker and return the raw method (the proxy's
get-trap returns the underlying function without invocation; the
calling code then calls it with args). Skip everything else.

**Step 2 — Resolve and run the entry policy.** Walk the host's class
chain to find the closest `@CallSecurity(p)` for `method`. Run
`p.allows(getCurrentTarget(), host, method)`. On deny, throw
`SecurityError`. (This is `@CallSecurity`, not `@ShadowSecurity`.)

**Step 3 — Push the host's CallFrame.** This frame's caller is the
previous target; target is the host; method is `method`. Used for
the entry-policy and for everything that runs below if there are no
shadows.

**Step 4 — Look up shadows.** Read
`_hostShadows.get(host)?.get(method)`. If empty or undefined: just
invoke the original method body, then pop the host's frame. Done.

**Step 5 — Initialize ALS dispatch state** for `callDown`:

```ts
{ host, methodName: method, shadows: orderedArray, originalArgs: args }
```

The `shadows` array is in install order — index 0 is the
first-attached, index `shadows.length - 1` is the most recent.

**Step 6 — Pop the host's CallFrame.** It served its purpose for the
entry policy. The shadow chain pushes its own frames (see below);
the host's body, if reached, gets a fresh frame at the bottom of the
shadow chain.

**Step 7 — Invoke the topmost shadow.** Push CallFrame `{ caller:
previousTarget, target: shadows[last], method }`. Resolve the
*local method name* on the shadow:

- For mixin-derived intercepts: local name = host method name
  (identity).
- For `@Shadowing` intercepts: look up the local name via the
  per-shadow `host→local` map populated at attach time
  (`@Shadowing('hostMethod') localMethod() {…}` → `host.hostMethod`
  is dispatched to `shadow.localMethod`).

Then invoke based on the resolved descriptor's type:

- Value descriptor (regular method): `descriptor.value.apply(shadow,
  args)`.
- Get-accessor: `descriptor.get.call(shadow)`. Args ignored.
- Set-accessor: `descriptor.set.call(shadow, args[0])`.

Pop the CallFrame. Pop the dispatch state. Return the result.

If the topmost shadow's method calls `this.callDown(...)`, see §3.6
for what that does.

### 3.6 callDown

`Shadow.prototype.callDown(...args)` is implemented by
`ShadowApiInternal.callDown(callingShadow, args)`:

**Step 1 — Read dispatch state.** If absent, throw
`ShadowError("callDown called outside of dispatch")`.

**Step 2 — Find self in the shadow array.**
`idx = state.shadows.indexOf(callingShadow)`. If `idx < 0`, throw —
the shadow isn't part of the current dispatch.

**Step 3 — If `idx > 0`, call the next shadow down.** Push CallFrame
`{ caller: callingShadow, target: state.shadows[idx - 1], method:
state.methodName }`. Invoke the next shadow's method (same descriptor-
type dispatch as §3.5 step 7). Pop frame. Return.

**Step 4 — If `idx === 0`, call the host's original.** Set the ALS
bypass marker. Push CallFrame `{ caller: callingShadow, target:
state.host, method: state.methodName }`. Invoke the host's method
through the proxy (which honors the bypass marker and returns the
raw method). Pop frame. Clear bypass marker. Return.

The `indexOf` lookup means re-entry is fine: a shadow that calls
down, returns, and calls down again gets the same downstream
behavior both times. No position counter to manage.

### 3.7 callBypass

`Shadow.prototype.callBypass(method, ...args)`:

**Step 1 — Validate.** If `this.host` is null, throw `ShadowError("callBypass:
shadow has no host")`. If `method` is not a string, throw.

**Step 2 — Set bypass marker** in ALS. The proxy's get-trap will
honor it for the next read on `this.host`.

**Step 3 — Push CallFrame** `{ caller: this, target: this.host,
method }`. Invoke `this.host[method](...args)`. The proxy's
get-trap, seeing the bypass marker, returns the raw method directly,
bypassing both the entry policy and the shadow chain.

**Step 4 — Pop frame, clear bypass marker, return result.**

`callBypass` deliberately bypasses the host's `@CallSecurity` —
it's a privileged operation, only callable from the shadow itself
(via `this`), and it exists for cases where the shadow needs the
unmediated value for its own internal logic. Use sparingly.

### 3.8 Decorators

**`@Unshadowable`** — method-level decorator that prevents the
method from being shadowed. The framework's own critical methods
carry it directly:

```ts
// In Stuff.ts
class Stuff {
  @Unshadowable @CallSecurity(ApiOnly)
  destroy(): void { … }

  @Unshadowable
  isDestroyed(): boolean { … }
}
```

`prepareDestroy` deliberately does **not** carry `@Unshadowable` —
shadows can override cleanup logic. Detach happens after
`prepareDestroy` runs (§3.10).

Constructors aren't reachable through the inferred-surface walk
regardless (not in any mixin's method set, can't carry
`@Shadowing`), so they need no decorator.

Stored as metadata on the method's descriptor (or in a
`WeakMap<Function, true>` keyed by the original method function) for
the method form, and in a separate `WeakSet<Function>` for the
class form. Both maps are read at attach-time-step-4.

The decorator function inspects how many arguments TypeScript handed
it (3 = method, 1 = class) and forks behavior accordingly. The class
form is inherited: a class with `@Unshadowable` OR any of its
ancestors counts.

**`@ShadowSecurity`** — method-level decorator that gates shadow
operations on the host method. Two forms:

```ts
// Shorthand: same policy for both attach and detach.
@ShadowSecurity(SecurityPolicies.Admin)
sensitiveMethod() { … }

// Per-op object form:
@ShadowSecurity({
  attach: SecurityPolicies.Admin,
  detach: SecurityPolicies.Admin,
})
sensitiveMethod() { … }
```

The object form's fields are independently optional. Omitted ops
default to Public. The shorthand `@ShadowSecurity(p)` is exactly
`{ attach: p, detach: p }`.

Same metadata mechanism as `@CallSecurity`, separate WeakMap.
Inheritance and override semantics match `@CallSecurity`: walk the
prototype chain, closest decorator wins, mixin default is fallback.

`clear` is **not** covered by `@ShadowSecurity`. It is gated
globally to Admin (or null caller) inside `ShadowApi.clear` because
it is host-wide and a sweeping action. If we ever need per-method
`clear` policies, the decorator can grow a `clear` field; deferred
for now.

**`@Shadowing`** — method-level decorator on a Shadow class's
methods, declaring that the method intercepts a host method. Two
forms:

```ts
class TraceShadow extends Shadow {
  // Bare: intercepts host.addXp (matching local name).
  @Shadowing
  addXp(amount: number) {
    console.log(`addXp(${amount})`);
    return this.callDown(amount);
  }

  // With argument: local name is `loggedTake`, intercepts host.take.
  @Shadowing('take')
  loggedTake(item: Stuff) {
    console.log(`take(${item})`);
    return this.callDown(item);
  }
}
```

The optional argument lets the local name diverge from the host
method name when there's a collision or a clearer local name.
`@Shadowing`'d methods compose with mixin-derived intercepts — a
shadow can extend a mixin AND mark additional methods.

Stored in a `WeakMap<Function, string | undefined>` keyed by the
method function, with the value being the host method name (or
undefined for the bare form, meaning "use the local name").

**Marking PropertiedMixin.** The PropertiedMixin class is annotated
with class-form `@Unshadowable` (every method on it unshadowable).
Reason: `queryProp` is hot-path-called
everywhere; `setProp` carries field-shape invariants on its setter;
shadowing them undermines `maskProp`, which is the legitimate
mechanism for property-level overrides.

### 3.9 Authority

Default authority for shadow operations:

| Operation                       | Default                    |
| ------------------------------- | -------------------------- |
| `ShadowApi.attach(host, shadow)`| Anyone — but each method's `@ShadowSecurity({ attach })` (if any) runs |
| `ShadowApi.detach(shadow)`      | Anyone with a reference — but each method's `@ShadowSecurity({ detach })` (if any) runs |
| `ShadowApi.clear(host, m?)`     | `Admin` or null caller (not method-decoratable) |
| `ShadowApi.getShadows(...)`     | `Public`                   |
| `Shadow.callDown(...)`          | Internal — only from inside a shadow's method during dispatch |
| `Shadow.callBypass(method, ...)` | Internal — only from the shadow itself (`this`) |

The `@ShadowSecurity` decorator gives method authors symmetric,
fine-grained control over both attach and detach. By default a
method has no `@ShadowSecurity` and both ops are Public — fine for
buffs, debuffs, tracing. Sensitive methods declare:

- `@ShadowSecurity({ attach: Admin })` — admin to install, anyone
  to remove. Common for "an admin can apply a debuff but the
  player can shake it off" patterns.
- `@ShadowSecurity({ detach: Admin })` — anyone to install, admin
  to remove. Common for installed monitors that players shouldn't
  be able to disable.
- `@ShadowSecurity(Admin)` — admin for both. The locked-down case.

`ShadowApi.attach` and `ShadowApi.detach` themselves are
`@CallSecurity(Public)` — the actual authority gating happens via
`@ShadowSecurity` per-method. Wrapping `attach`/`detach` themselves
in `Admin` would prevent legitimate gameplay (self-buffing,
opting out of effects).

### 3.10 Lifecycle ordering on host destruct

`StuffApi.destruct(host)`:

**Step 1 — `host.prepareDestroy()`** runs through the proxy. If the
host has shadows on `prepareDestroy`, the chain runs (since
`prepareDestroy` is shadowable). Shadows can wrap, observe, or
replace the cleanup logic.

**Step 2 — Privileged shadow detach.** After `prepareDestroy`
returns, the framework reads every shadow attached to `host` from
`_hostShadows.get(host)` (a snapshot — values across all method
keys, deduplicated). For each shadow it performs a privileged
detach: removes the entry from `_hostShadows`, removes from
`_shadowHost`, removes from `_shadowMethods`. This bypasses any
`@ShadowSecurity` checks (which are about *attach*; detach during
host destruct is unconditional).

**Step 3 — `host.destroy()`** runs through the proxy normally. Its
`@CallSecurity(ApiOnly)` decorator enforces that only Api-layer code
(in practice, `StuffApi.destruct`) can reach it. Its `@Unshadowable`
decorator guarantees no shadows can ever have been attached, so the
dispatch finds an empty shadow array and proceeds straight to the
original method body. It marks `_isDestroyed`, unregisters from
`StuffApi`.

Both decorators on `destroy()` are entirely standard. The
`@Unshadowable` is there because allowing shadows to replace
unregistration would let a destroyed object stay alive; the
`@CallSecurity(ApiOnly)` is there because we want only
`StuffApi.destruct` to call it. Same mechanisms used everywhere
else, no special cases.

`StuffApi.destruct(shadow)`:

**Step 1 — `shadow.prepareDestroy()`** runs. The default
implementation on `Shadow` is:

```ts
protected prepareDestroy(): void {
  if (this.host) {
    ShadowApi.detach(this);
  }
}
```

Subclasses can override (and themselves be shadowed by other shadows
attached to this shadow, in principle — vanishingly rare).

**Step 2 — `shadow.destroy()`** runs.

**Reference discipline.** Both directions of the host↔shadow link
live in framework-private `WeakMap`s (`_shadowHost`, `_hostShadows`),
not in instance fields. User code reads `shadow.host` through a
read-only getter; writes are impossible (no setter, no field). The
framework module is the *only* code that can mutate either map, and
it always mutates both in the same call within `attach`, `detach`,
and the privileged-detach used during destruct. There is no API
surface — public, protected, or otherwise — that would allow the two
sides to drift out of sync.

WeakMap semantics also handle GC cleanly: when a Stuff is collected,
its entry in `_hostShadows` vanishes automatically (though by the
time any Stuff is collected, it should already have been through
`StuffApi.destruct`, which detaches everything explicitly).

### 3.11 Persistence

Because `Shadow extends Stuff`, persistence falls out automatically
through the existing `Hydrator` pipeline. A shadow class that
composes mixins with persistent fields (e.g.,
`PropertiedMixin(Shadow)` for a buff with stored `duration`,
`magnitude`) gets those fields persisted with no shadow-specific
machinery.

What is **NOT** included in v1: **attachment records** — i.e.,
persisting "shadow X is attached to host Y." On server restart,
runtime-only shadows are gone; hosts come up shadow-free. Restoring
attachments requires a separate "attachment record" collection or
similar, deferred to Tier 5.

For v1, the rule is: shadows that need to survive restart must be
re-attached by whatever process attached them originally (e.g., a
buff manager that loads buff records and re-attaches on bootstrap).
Shadows themselves persist; the *attachment relationship* does not.

### 3.12 Tests

Required test coverage before Tier 3 ships:

**Inferred-surface walk:**
- Shadow that composes a mixin and overrides nothing → all of the
  mixin's methods intercepted; defaults run on shadow's own state
  (the "rename" pattern).
- Shadow that composes a mixin and overrides one method → mixin
  methods intercepted; override runs for the overridden one,
  default for the rest.
- Shadow with layered mixins (`PoliteMixin(NamedMixin(Shadow))`) →
  PoliteMixin's overrides + NamedMixin's defaults all intercepted;
  prototype resolution picks the right implementation per call.
- Shadow with `@Shadowing addXp() {…}` and no mixin → addXp
  intercepted on host.
- Shadow with `@Shadowing('take') loggedTake() {…}` → host.take is
  dispatched to shadow.loggedTake.
- Shadow that combines mixin + `@Shadowing` → union of both surfaces.
- Shadow with no mixin and no `@Shadowing` → attach throws
  ("no surface").

**Dispatch:**
- No shadows: original method runs at full speed, `@CallSecurity`
  enforced once.
- One shadow that doesn't `callDown` → original never runs.
- One shadow that `callDown`s → original runs, result passes back up.
- Two shadows; only top calls down → top → bottom → original chain
  intact, frames pushed/popped correctly.
- Three shadows, middle one bypasses (no `callDown`) → top → middle
  (no down) → others never run.

**`callDown`:**
- Out-of-dispatch call throws.
- Re-entry: shadow calls down, returns, calls down again → both
  invocations land on the same target (the next shadow or original).
- Args modification flows through.
- Try/catch wrapping works (shadow catches an exception thrown by a
  later layer).
- Conditional bypass works (shadow returns synthetic without calling
  down).
- Errors propagate up (one shadow throws, everything above sees the
  exception).

**`callBypass`:**
- Throws if `host` is null.
- Bypasses entry policy (verifiable: `@CallSecurity(deny-everyone)`
  on host, shadow's `callBypass` still works).
- Bypasses other shadows on the same method.
- Bypasses self if the same method is being intercepted.

**Attach/detach:**
- Attach to a destroyed host throws.
- Re-attach without detach throws.
- Attempt to shadow `destroy` (which carries `@Unshadowable` on
  Stuff) → throws.
- `@UnshadowableClass` host → throws.
- `@Unshadowable` method → throws.
- `@ShadowSecurity(p)` → policy runs with attacher as caller.
- Atomicity: an attach that fails on method 5 of 7 leaves no method
  in a half-installed state.
- Detach is idempotent (calling twice is fine).
- Detach when the shadow intercepts multiple methods removes from
  all of them.

**Clear:**
- Non-admin non-system caller → throws.
- Admin caller → succeeds, clears all.
- With methodName → only shadows on that method are detached
  (which detaches them from their other methods too, since
  shadow-per-host).

**Lifecycle on destruct:**
- `host.prepareDestroy` runs through shadow chain.
- After prepareDestroy, host is shadow-free.
- `destroy` is unshadowable (attempts to shadow it throw at attach).
- Shadow survives host destruct: detached, `host = null`, but the
  shadow itself is still alive and re-attachable.
- Shadow destruct calls default `prepareDestroy` which detaches
  from current host.

**Persistence:**
- Shadow with persistent fields persists across `save`/`load` like
  any Stuff.
- Shadow's `host` reference is NOT persisted (deferred).
- Hydrating a host does NOT restore its previously-attached shadows
  (deferred to Tier 5).

**Authority + `@ShadowSecurity`:**
- Method with shorthand `@ShadowSecurity(Admin)`: non-admin attach
  throws; non-admin detach throws.
- Method with `@ShadowSecurity({ attach: Admin })`: non-admin attach
  throws; non-admin detach succeeds (default Public).
- Method with `@ShadowSecurity({ detach: Admin })`: non-admin attach
  succeeds; non-admin detach throws.
- Object form policy gets the correct caller (the would-be attacher /
  detacher) as `caller`.
- Shadow whose surface spans multiple host methods, where one method
  has `@ShadowSecurity({ attach: Admin })` and another doesn't:
  non-admin attach denies atomically (no method ends up in a
  half-installed state).

**Shadow-as-Stuff sanity:**
- Shadow has a stuffId.
- Shadow appears in `StuffApi` registry.
- Shadow can be looked up by id.
- Shadow can be cloned from a template via `StuffApi.clone(...)`.

---

## Appendix A — Worked Example

```ts
// Authoring
class Door extends Thing {
  private locked = false;
  private keyId: string | null = null;

  @CallSecurity(SecurityPolicies.Custom((caller, target: Door) => {
    if (!target.locked) return true;
    if (caller instanceof Avatar) {
      return MqlApi.resolveMany('*', caller).some(i => i.stuffId === target.keyId);
    }
    return false;
  }))
  unlock(): void { this.locked = false; }
}

// Calling
ExecutionContext.run(avatar, door, 'unlock', () => door.unlock());
//   → @CallSecurity runs:
//       destroyed check ✓
//       policy: avatar holds the key? ✓
//       push frame, run shadows (none), call unlock(), pop frame
//   → door.locked = false

// Bypass attempt
door.unlock();
//   → no ExecutionContext frame; getCaller() = null
//   → policy denies (Avatar required); throws SecurityError
```

---

## Appendix B — Cross-References

- **PLAN.md:3392–4186** — Framework 6 canonical spec
- **CLAUDE.md:331–366** — Protected destruction, why `destruct()` exists
- **CLAUDE.md:586–613** — `#` vs TS modifiers, layer rule
- **CLAUDE.md:533** — "Call security framework: Proxy-based modification validation"
- **CLAUDE.md** "Hydrator exception" note — bracket-assignment of persistent fields (the carve-out is at the *setter* layer, not at CallSec)
- **CMS_TEMPLATE_PATTERN.md** — template `class:` field, the basis for class-path identity
- **PROTECTED_LIFECYCLE.md:73–75** — destroy() lockdown anticipated
- **PERSISTENT_PATTERN.md:410–433** — `maskProp` owner becomes implicit under CallSec; reason PropertiedMixin discourages shadowing `queryProp`
- **ARCHITECTURE_PATTERNS.md:80–86** — "Call Security (Future)" — manager/api/controller tiering
- **Saxonberg.md:275** — top-level pillar listing
- **Stuff.ts:9–27, 107–136** — destroy() FINAL, isDestroyed flag, prepareDestroy hook
- **api/stuff.ts:331–367** — destruct() / unregister() / destroyed-objects WeakMap
- **lib/command/CommandGiver.ts** — current CommandGiver mixin (frame source for command-driven calls)
