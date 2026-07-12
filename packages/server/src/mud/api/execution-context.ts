/**
 * ExecutionContextApi — async-safe call stack.
 *
 * Pillar 1 of the call-security framework. Carries a stack of `CallFrame`s
 * through `await`, `setTimeout`, and `Promise.then` boundaries via
 * AsyncLocalStorage, so any guarded method body can ask "who called me?"
 * without threading a context parameter through every signature.
 *
 * Frames are pushed by the Proxy on entry to a guarded method and popped
 * on exit. The framework recognises a small vocabulary of *frame kinds*
 * — `Root`, `Constructor`, `Command` and so on — that mark the meaning
 * of specific frames so stack walkers can find them without
 * string-matching method names. Most frames carry no kind; only the
 * ones that participate in a known cross-frame contract do.
 *
 * Tagging a frame as a particular kind happens one of two ways:
 *
 *   1. Synthetic frames the framework itself plants (`runRoot`,
 *      `StuffApi.#registerAndInit`'s constructor wrap) get their kind
 *      set at push time via the `kind` option to `run` / `runRoot`.
 *   2. Frames the proxy already pushed for a real method invocation
 *      can be tagged after the fact via `tagCurrentFrame(kind)` from
 *      inside that method's body. This is what
 *      `CommandGiverMixin.executeCommand` does — the proxy already
 *      pushed an `executeCommand` frame, the body just labels it.
 *
 * `findFrame(kind)` is the generic walk that all kind-specific
 * helpers (`getCurrentCommandGiver`, etc.) wrap — keep them thin so
 * adding a new kind is a one-line helper plus a `FrameKind` entry.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { SecurityError } from '../lib/security/errors';
import { SecurityApi } from './security';
import { ModuleApi } from './module';
import type { CommandContext } from './command';

// NOTE: ExecutionContextApi deliberately does NOT call
// `SecurityApi.decorateApiClass(...)` at module load — unlike StuffApi, MqlApi,
// and the other Apis. Two reasons:
//
//   1. Circularity. `decorators.ts` imports ExecutionContextApi for
//      its static-method wrapper (the wrapper pushes a frame via
//      `ExecutionContextApi.run`). If we then asked decorators to
//      wrap THIS class's methods, the wrapping itself would call
//      `ExecutionContextApi.run` to push a frame for the wrapper —
//      a bootstrap loop, and at module-load time the import binding
//      for `decorateApiClass` is still undefined.
//
//   2. Semantics. The framework's own primitives shouldn't show up
//      in the call stack as separate frames; `ExecutionContextApi.run`
//      itself is the frame-pusher. Wrapping it would mean every
//      `run()` call pushes a frame for `run()` before the body
//      pushes the frame the caller actually asked for. Noise.
//
// The same reasoning applies to `ModuleApi`.

/**
 * Recognised frame-kind labels. Each value tags a frame whose role
 * is known to a stack walker somewhere in the framework. New kinds:
 * add a const entry, write the helper that walks for it, and update
 * the doc comment.
 */
export const FrameKind = {
  /** Synthetic frame planted by `runRoot` at a network → Application boundary. caller = null. */
  Root: 'root',
  /** Synthetic frame planted by `StuffApi.create` / `clone` around hydrate + postRegister. */
  Constructor: 'constructor',
  /** Tagged by `CommandGiverMixin.executeCommand` so `getCurrentCommandGiver` can find it. */
  Command: 'command',
  /** Synthetic frame planted by `EventApi` around each listener invocation. */
  EventDispatch: 'eventDispatch',
} as const;
export type FrameKind = (typeof FrameKind)[keyof typeof FrameKind];

/**
 * One frame on the call stack.
 *
 * `caller`/`target` are `unknown` rather than `Stuff` to avoid an import
 * cycle; the framework treats them as opaque object identities for stack
 * walking. Consumers that need the real type cast at the boundary.
 *
 * `kind` is set either at push time (synthetic frames) or after the
 * fact via `tagCurrentFrame` (proxy-pushed frames whose method bodies
 * declare their role). Most frames have no kind.
 *
 * `metadata` is the open bag for any one-off attached data (e.g. a
 * future `transaction` frame might carry a transaction id). Don't
 * reach into `metadata` for kind detection — that's what `kind` is
 * for.
 */
export interface CallFrame {
  caller: unknown | null;
  target: unknown | null;
  method: string;
  timestamp: number;
  kind?: FrameKind;
  metadata?: Record<string, unknown>;
}

/**
 * The call stack — an ordered list of frames, frame-0 = root.
 */
export type CallStack = readonly CallFrame[];

/**
 * Opts for `run()`. Both fields optional. Separated from positional
 * arguments so the call site reads naturally and adding more options
 * later is non-breaking.
 */
export interface RunFrameOpts {
  kind?: FrameKind;
  metadata?: Record<string, unknown>;
}

/** ALS-backed storage. Mutating operations replace the array immutably. */
const _als = new AsyncLocalStorage<CallFrame[]>();

/* ────────────────── Caller authorisation ──────────────────
 *
 * `run`, `runRoot`, and `tagCurrentFrame` mutate the call stack — the
 * core trust surface every policy keys off. Forging a frame is the
 * same threat model as forging a module-id (see `ModuleApi`): an
 * attacker who can plant a frame whose `target` is an admin Avatar,
 * or whose `kind` is `Root`, sidesteps every policy.
 *
 * Defence: stack-walk the immediate caller's file URL on entry,
 * reject if the URL doesn't match the framework allowlist below.
 * Same mechanism `ModuleApi.stamp` uses, same trust boundary.
 *
 * Per-URL cached so the cost is one stack walk per file ever; after
 * warmup it's a Map lookup. New framework files that legitimately
 * need to push frames must be added here with a one-line note in
 * code review — keep the list narrow.
 */

/**
 * File-URL patterns whose code may push, root, or tag frames.
 * Order doesn't matter — any match passes.
 */
const _frameMutatorAllowlist: ReadonlyArray<RegExp> = [
  /\/mud\/lib\/security\//,                      // the framework itself
  /\/mud\/api\//,                                // every Api class (proxy / shadow / stuff push frames)
  /\/backend\//,                                 // Backend's runRoot at the network → Application boundary
  /\/mud\/lib\/command\/CommandGiver\.(ts|js)$/, // CommandGiverMixin tags the command frame
  // Singleton Stuff registries that hold Api state and need to plant
  // synthetic root frames for ApiOnly-gated downstream calls (timer
  // callbacks, event-listener dispatch). Each lives at `/obj/<X>` and
  // is the storage backend for a thin Api facade. The Api gates who
  // can call the Registry via `@CallSecurity`; this allowlist entry is
  // the orthogonal trust that the Registry's body is engine code, not
  // content. Keep narrow — add the bare name, not a wildcard.
  /\/mud\/obj\/(EventSubscriptions|MqlSubscriptionRegistry|SchedulerRegistry|WorldClockRegistry)\.(ts|js)$/,
  // The persistence-spine logic singleton plants a principal frame around
  // restore (`run` + `tagActingAuthor`) so capture/restore executes AS the
  // owning principal — the single reviewed frame-mutator touchpoint of the
  // persistence build. Lives at `/obj/api/persistable`; `PersistableApi`
  // gates who may call it. Same narrow trust as the registries above: this
  // entry asserts the singleton's BODY is engine code, not content.
  /\/mud\/obj\/api\/PersistableLogic\.(ts|js)$/,
  /\.test\.(ts|js)$/,                            // tests need the seam — they can't fake production identity
];

const _allowlistCache: Map<string, boolean> = new Map();

/**
 * Self-skip pattern for `ModuleApi.getImmediateCallerUrl`. Frames
 * inside `execution-context.ts` (the frame-mutator helpers, this
 * function's own caller, etc.) are dropped so the first reported
 * frame is the actual caller of the public API.
 *
 * Skipped by URL match (e.g. `/execution-context.ts:42:5` or
 * `/execution-context.js:42:5`), NOT by substring on the full
 * line — that would also skip frames from
 * `execution-context.test.ts` and any other file whose name
 * happens to contain the module name.
 */
const _SELF_URL = /\/execution-context\.(ts|js)(\?|$|:)/;

/**
 * Throw `SecurityError` if the immediate caller isn't in the
 * framework allowlist. Result cached per file URL so the second
 * call from the same site is a Map lookup.
 *
 * `op` is the frame-mutator name (`'run'`, `'runRoot'`,
 * `'tagCurrentFrame'`) used in the error message so the offender
 * sees exactly which API was misused.
 */
function _assertFrameMutatorAllowed(op: string): void {
  const url = ModuleApi.getImmediateCallerUrl(_SELF_URL);
  if (url === null) {
    // Couldn't extract a caller URL. Fail closed — better to break
    // the call than silently allow a forge.
    throw new SecurityError(
      `ExecutionContext.${op}() refused: caller URL could not be determined`
    );
  }
  const cached = _allowlistCache.get(url);
  if (cached === true) return;
  if (cached === false) {
    throw new SecurityError(
      `ExecutionContext.${op}() refused from ${url}: ` +
        `only framework files (mud/lib/security/**, mud/api/**, ` +
        `backend/**, mud/lib/command/CommandGiver, *.test.ts) ` +
        `may push or tag call frames`
    );
  }
  const allowed = _frameMutatorAllowlist.some((re) => re.test(url));
  _allowlistCache.set(url, allowed);
  if (!allowed) {
    throw new SecurityError(
      `ExecutionContext.${op}() refused from ${url}: ` +
        `only framework files (mud/lib/security/**, mud/api/**, ` +
        `backend/**, mud/lib/command/CommandGiver, *.test.ts) ` +
        `may push or tag call frames`
    );
  }
}

/** Best-effort offending-content path for a guarded root's `target`. */
function _guardPath(target: unknown): string | null {
  const t = target as { getTemplatePath?: () => string | null } | null;
  if (t && typeof t.getTemplatePath === 'function') {
    try {
      return t.getTemplatePath() ?? null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Record a caught guard error as a runtime diagnostic. Uses a **dynamic**
 * import of `DiagnosticApi` — a static import would form a load cycle
 * (`execution-context` is bootstrap-special and `DiagnosticApi` pulls the
 * logic graph back through it). Diagnostics must never break the guard, so
 * every failure here is swallowed.
 */
async function _recordGuardError(
  target: unknown,
  method: string,
  err: unknown
): Promise<void> {
  try {
    const { DiagnosticApi } = await import('./diagnostics');
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? (err.stack ?? null) : null;
    await DiagnosticApi.record({
      path: _guardPath(target),
      message: `${method}: ${message}`,
      stack,
    });
  } catch {
    // never let diagnostics capture propagate out of the guard
  }
}

/**
 * Static-class style API. All methods are static so callers don't need to
 * instantiate or import a singleton.
 */
export class ExecutionContextApi {
  private constructor() {}

  /**
   * Look up the immediate caller — the `caller` of the frame at the top
   * of the stack. Returns `null` if there's no stack (called outside a
   * `run`/`runRoot` wrapper) or if the top frame has a null caller.
   */
  public static getCaller(): unknown | null {
    const stack = _als.getStore();
    if (!stack || stack.length === 0) return null;
    return stack[stack.length - 1]!.caller;
  }

  /**
   * Look up the current target — the `target` of the frame at the top
   * of the stack. Useful inside guarded method bodies to confirm
   * `this` matches the framework's view.
   */
  public static getCurrentTarget(): unknown | null {
    const stack = _als.getStore();
    if (!stack || stack.length === 0) return null;
    return stack[stack.length - 1]!.target;
  }

  /**
   * Read the entire call stack as a frozen, read-only snapshot.
   * Always returns an array (empty if no context).
   */
  public static getCallStack(): CallStack {
    const stack = _als.getStore();
    return stack ?? [];
  }

  /**
   * Walk the stack top-to-bottom looking for the most recent frame
   * tagged with `kind`. Returns `null` when no such frame exists.
   *
   * Generic primitive that all kind-specific helpers wrap; reach for
   * this directly when you want a custom walk (e.g., "find the
   * topmost Command frame whose target is admin-flagged").
   */
  public static findFrame(kind: FrameKind): CallFrame | null {
    const stack = _als.getStore();
    if (!stack) return null;
    for (let i = stack.length - 1; i >= 0; i--) {
      const frame = stack[i]!;
      if (frame.kind === kind) return frame;
    }
    return null;
  }

  /**
   * Stamp the top-of-stack frame with `kind`. Used by method bodies
   * that want to declare "this frame, the one the proxy already
   * pushed for me, has a recognised role." Throws `SecurityError`
   * when called outside any frame context — tagging nothing is
   * almost certainly a bug, fail loud.
   *
   * Idempotent for the same kind. Re-tagging with a different kind
   * overwrites; the framework doesn't enforce single-tag uniqueness
   * because we don't yet have a use case for one frame carrying
   * multiple roles.
   */
  public static tagCurrentFrame(kind: FrameKind): void {
    _assertFrameMutatorAllowed('tagCurrentFrame');
    const stack = _als.getStore();
    if (!stack || stack.length === 0) {
      throw new SecurityError(
        `tagCurrentFrame(${kind}): no frame on the stack to tag`
      );
    }
    stack[stack.length - 1]!.kind = kind;
  }

  /**
   * The most recent CommandGiver on the stack — the actor whose
   * `executeCommand` body is currently running. Returns `null`
   * outside any command pipeline.
   *
   * Cross-pause caveat: command frames live inside the synchronous
   * call chain. After a prompt resume / scheduled tick / cross-actor
   * message, the chain rebuilds fresh and this returns null.
   */
  public static getCurrentCommandGiver(): unknown | null {
    return ExecutionContextApi.findFrame(FrameKind.Command)?.target ?? null;
  }

  /**
   * The active CommandContext stamped onto the current Command frame's
   * metadata, or `null` outside a command's synchronous span.
   * Read by `Scene.send()` / `MudlogApi` to stamp `meta.commandId` and
   * default the recipient to the command giver.
   */
  public static getCurrentCommandContext(): CommandContext | null {
    const frame = ExecutionContextApi.findFrame(FrameKind.Command);
    const ctx = frame?.metadata?.commandContext;
    return (ctx as CommandContext | undefined) ?? null;
  }

  /**
   * The principal on whose behalf the current work runs — the **acting
   * author** — resolved **transport-agnostically** for authorship
   * attribution, NEVER taken from a caller-supplied value (the only inputs
   * are frames the framework itself stamps):
   *
   *   - **in-game (command) path** — the command-frame stack's giver, but
   *     only when the chain is *non-forced* and a *single, consistent*
   *     giver. A forced dispatch (`CommandApi.forceCommand`) or a
   *     cross-actor cascade (A's command triggering B) fails closed →
   *     `null`. This is "look at the giver AND the stack around it": the
   *     bare top giver is not trusted on its own.
   *   - **REST / CMS path** — no Command frame, so the dispatched principal
   *     is whatever a transport boundary stamped via {@link tagActingAuthor}
   *     (the Avatar a session ran the op as). The stamp rides frame
   *     *metadata*, decoupled from the frame's security `target`, so a REST
   *     boundary can name its author without disturbing what downstream
   *     `@CallSecurity` gates resolve as the caller.
   *
   * Returns the principal object (a `Stuff`) or `null`. The caller validates
   * it is a real authoring identity (a durable `templatePath`). The
   * deliberate centralization the provenance write relies on: one resolver,
   * both transports, no trust in a passed argument.
   */
  public static getActingAuthor(): unknown | null {
    const commands = ExecutionContextApi.getCommandStack();
    if (commands.length > 0) {
      // Any forced frame in the chain → unattributable.
      if (commands.some((c) => c.forced)) return null;
      // A single, consistent giver across the chain, or unattributable.
      const givers = new Set(commands.map((c) => c.context.commandGiver));
      if (givers.size !== 1) return null;
      return commands[0]!.context.commandGiver;
    }
    // No command frame — a REST/`runRoot` dispatch. Read the nearest
    // `tagActingAuthor` stamp (the boundary names its Avatar in metadata).
    const stack = _als.getStore();
    if (stack) {
      for (let i = stack.length - 1; i >= 0; i--) {
        const author = stack[i]!.metadata?.actingAuthor;
        if (author != null) return author;
      }
    }
    return null;
  }

  /**
   * Stamp the **acting author** — the principal (an Avatar) on whose behalf
   * a non-command transport boundary is running — onto the current frame's
   * metadata, where {@link getActingAuthor} reads it for the REST/CMS path.
   *
   * The seam a REST boundary calls right after planting its `runRoot` frame
   * (e.g. the CMS `run-as-session-player` bridge): it dispatches the
   * execution context *as a specific Avatar* for authorship, WITHOUT making
   * that Avatar the frame's security `target` (so downstream `@CallSecurity`
   * gates are unaffected). Gated by the same frame-mutator allowlist as
   * {@link updateCurrentFrameMetadata} — only framework / `backend/` code may
   * stamp. Throws when called outside any frame.
   */
  public static tagActingAuthor(principal: unknown): void {
    _assertFrameMutatorAllowed('tagActingAuthor');
    const stack = _als.getStore();
    if (!stack || stack.length === 0) {
      throw new SecurityError(
        'tagActingAuthor: no frame on the stack to tag'
      );
    }
    const top = stack[stack.length - 1]!;
    if (!top.metadata) top.metadata = {};
    top.metadata.actingAuthor = principal;
  }

  /**
   * Walk the call stack outermost-to-innermost and return every
   * Command frame's contextual data. The returned tuples carry the
   * frame's `CommandContext` (already includes `commandId` and
   * `executionId`) plus the `forced` flag — `true` for system-fired
   * commands invoked through `CommandApi.forceCommand`, `false` (or
   * absent) for player-typed input.
   *
   * Use this for "is the current command nested inside a forced
   * command?" patterns: walk the result, check the `forced` flag,
   * decide whether to short-circuit (e.g., a cinematic-locked NPC
   * blocking auto-look). For the common "what fired me" question the
   * sugar helper {@link getParentCommandContext} skips the boilerplate.
   *
   * `causingCommandId` is deliberately NOT in the per-frame return —
   * every Command frame's `causingCommandId` equals its own
   * `commandId` by construction, so including it would mislead
   * callers into using it as a parent-pointer (which it isn't). The
   * async-boundary "originating command id" use case is served by
   * the existing {@link getCurrentCausingCommandId}.
   */
  public static getCommandStack(): ReadonlyArray<{
    context: CommandContext;
    forced: boolean;
  }> {
    const stack = _als.getStore();
    if (!stack) return [];
    const out: { context: CommandContext; forced: boolean }[] = [];
    for (const frame of stack) {
      if (frame.kind !== FrameKind.Command) continue;
      const ctx = frame.metadata?.commandContext as CommandContext | undefined;
      if (!ctx) continue;
      const forced = frame.metadata?.forced === true;
      out.push({ context: ctx, forced });
    }
    return out;
  }

  /**
   * Synchronous-stack relationship: the {@link CommandContext} of the
   * command that *fired* the currently running command, or `null`
   * when the current command is the outermost.
   *
   * Distinct from `causingCommandId`. `causingCommandId` is the
   * originating-command-id snapshot designed to propagate across
   * async boundaries (ScheduleApi replants it on a fresh Root frame
   * when a deferred callback fires). The parent context, by
   * contrast, only exists while both commands share a synchronous
   * span — once the outer command's `executeCommand` returns, no
   * parent is reachable.
   */
  public static getParentCommandContext(): CommandContext | null {
    const stack = ExecutionContextApi.getCommandStack();
    return stack.length >= 2 ? stack[stack.length - 2]!.context : null;
  }

  /**
   * Walk the call stack top-down and return the first
   * `metadata.causingCommandId` we hit. Set on the Command frame by
   * `CommandGiverMixin.executeCommand`, and re-planted on a fresh
   * Root frame by `ScheduleApi` when a propagating callback fires —
   * either way, the live "originating command id" surfaces here.
   */
  public static getCurrentCausingCommandId(): string | null {
    const stack = _als.getStore();
    if (!stack) return null;
    for (let i = stack.length - 1; i >= 0; i--) {
      const id = stack[i]!.metadata?.causingCommandId;
      if (typeof id === 'string') return id;
    }
    return null;
  }

  /**
   * Merge `patch` into the top-of-stack frame's `metadata`. Allocates
   * a `metadata` object if one isn't already present. Used by the
   * command lifecycle in `CommandGiverMixin` to stamp commandContext
   * and causingCommandId onto its own (proxy-pushed) frame, and by
   * `ScheduleApi` to plant attribution onto the Root frame it just
   * created.
   *
   * Gated by the same allowlist as `tagCurrentFrame` — only framework
   * files may mutate frame metadata. Throws when called outside any
   * frame context (mutating "no frame" is almost certainly a bug).
   */
  public static updateCurrentFrameMetadata(
    patch: Record<string, unknown>
  ): void {
    _assertFrameMutatorAllowed('updateCurrentFrameMetadata');
    const stack = _als.getStore();
    if (!stack || stack.length === 0) {
      throw new SecurityError(
        'updateCurrentFrameMetadata: no frame on the stack to update'
      );
    }
    const top = stack[stack.length - 1]!;
    if (!top.metadata) top.metadata = {};
    Object.assign(top.metadata, patch);
  }

  /**
   * Pretty-print the call stack for debugging. Intentionally
   * human-formatted; do not parse this output.
   */
  public static dumpCallStack(): string {
    const stack = _als.getStore() ?? [];
    if (stack.length === 0) return '<empty call stack>';
    return stack
      .map((f, i) => {
        const callerName = ExecutionContextApi.#nameOf(f.caller);
        const targetName = ExecutionContextApi.#nameOf(f.target);
        const kindTag = f.kind ? ` [${f.kind}]` : '';
        return `  #${i}${kindTag} ${callerName} → ${targetName}.${f.method}`;
      })
      .join('\n');
  }

  /**
   * Defensive check for the immediate caller's class. Throws
   * `SecurityError` on mismatch. Useful as belt-and-braces inside
   * sensitive method bodies that already carry `@CallSecurity`.
   */
  public static assertCaller(
    expected: (abstract new (...args: never[]) => unknown) & { name: string }
  ): void {
    const caller = ExecutionContextApi.getCaller();
    if (
      caller === null ||
      typeof caller !== 'object' ||
      !(caller instanceof (expected as new (...a: unknown[]) => object))
    ) {
      const callerName = ExecutionContextApi.#nameOf(caller);
      throw new SecurityError(
        `Expected caller to be ${expected.name}, got ${callerName}`
      );
    }
  }

  /**
   * Push a frame and run `fn` with that frame on top of the stack.
   *
   * If there's no enclosing context, this also creates a fresh stack;
   * call sites that always need a root should use `runRoot` instead so
   * the intent is explicit.
   *
   * Used by:
   *   - the Proxy, when intercepting a method call (no opts);
   *   - `StuffApi.#registerAndInit` for the synthetic constructor
   *     frame (`{ kind: FrameKind.Constructor }`).
   *
   * Body-side tagging (e.g., `CommandGiver.executeCommand` declaring
   * "this frame is a command frame") goes through
   * `tagCurrentFrame(FrameKind.Command)` instead — it mutates the
   * proxy-pushed frame in place rather than stacking a redundant
   * second frame.
   */
  public static run<T>(
    caller: unknown | null,
    target: unknown | null,
    method: string,
    opts: RunFrameOpts | undefined,
    fn: () => T
  ): T {
    _assertFrameMutatorAllowed('run');
    const frame: CallFrame = {
      caller,
      target,
      method,
      timestamp: Date.now(),
      kind: opts?.kind,
      metadata: opts?.metadata,
    };
    const parent = _als.getStore() ?? [];
    const next = [...parent, frame];
    return _als.run(next, fn);
  }

  /**
   * Plant a synthetic root frame whose `caller` is `null` and run `fn`
   * inside it. Used by Backend at the network → Application boundary
   * so that Application's own entry-method frames appear above a
   * well-defined root. Inside `runRoot`, `getCaller()` at the root
   * level returns `null`.
   *
   * Distinct from `run()` so the call-site intent is unambiguous: this
   * is "I am the boundary, plant a root here," not "I'm pushing a
   * frame on whatever happens to be on the stack."
   */
  public static runRoot<T>(
    target: unknown | null,
    method: string,
    fn: () => T
  ): T {
    _assertFrameMutatorAllowed('runRoot');
    const root: CallFrame = {
      caller: null,
      target,
      method,
      timestamp: Date.now(),
      kind: FrameKind.Root,
    };
    return _als.run([root], fn);
  }

  /**
   * Like {@link runRoot}, but catches any throw / rejection from `fn`,
   * records it as a runtime diagnostic (channel + author derived from the
   * `target`'s content path via `DiagnosticApi.record`), and then applies
   * `policy`:
   *
   *   - `'absorb'`  — swallow and return `undefined` (the command inbound
   *     path: the giver already saw the real error via the
   *     `controller-error` note; no generic socket frame is wanted).
   *   - `'rethrow'` — record and re-throw (the REST bridge: `sendCmsError`
   *     still maps the error to an HTTP status).
   *   - `'swallow'` — record and return `undefined` without re-throwing
   *     (scheduled / background work: a timer callback has no caller to
   *     rethrow to, and swallowing keeps a recurring schedule alive).
   *
   * This is a **sibling** of `runRoot`, deliberately not a change to it:
   * `runRoot` stays a hot no-catch primitive so framework-internal roots
   * pay nothing, and only the boundaries that opt in (command / schedule /
   * REST) take the capture + control-flow change.
   */
  public static async runRootGuarded<T>(
    target: unknown | null,
    method: string,
    fn: () => T | Promise<T>,
    policy: 'absorb' | 'rethrow' | 'swallow'
  ): Promise<T | undefined> {
    _assertFrameMutatorAllowed('runRootGuarded');
    const root: CallFrame = {
      caller: null,
      target,
      method,
      timestamp: Date.now(),
      kind: FrameKind.Root,
    };
    try {
      return await _als.run(
        [root],
        () => Promise.resolve(fn()) as Promise<T>
      );
    } catch (err) {
      await _recordGuardError(target, method, err);
      if (policy === 'rethrow') throw err;
      return undefined;
    }
  }

  /**
   * Test-only seam: clear any in-flight ALS context. Intended only for
   * Vitest cleanup; production code is gated by `SecurityApi.assertTestOnly`.
   * @internal
   */
  public static _clearForTesting(): void {
    SecurityApi.assertTestOnly('_clearForTesting');
    _als.enterWith(undefined as unknown as CallFrame[]);
  }

  /**
   * Test seam — invoke the allowlist gate against a *specific*
   * source URL, bypassing the real Error.stack walk. Lets tests
   * cover both the allow and deny code paths without staging real
   * source files outside the test allowlist. @internal
   */
  public static _checkAllowlistForTest(op: string, url: string): void {
    SecurityApi.assertTestOnly('_checkAllowlistForTest');
    const cached = _allowlistCache.get(url);
    if (cached === true) return;
    if (cached === false) {
      throw new SecurityError(
        `ExecutionContext.${op}() refused from ${url}: ` +
          `only framework files (mud/lib/security/**, mud/api/**, ` +
          `backend/**, mud/lib/command/CommandGiver, *.test.ts) ` +
          `may push or tag call frames`
      );
    }
    const allowed = _frameMutatorAllowlist.some((re) => re.test(url));
    _allowlistCache.set(url, allowed);
    if (!allowed) {
      throw new SecurityError(
        `ExecutionContext.${op}() refused from ${url}: ` +
          `only framework files (mud/lib/security/**, mud/api/**, ` +
          `backend/**, mud/lib/command/CommandGiver, *.test.ts) ` +
          `may push or tag call frames`
      );
    }
  }

  static #nameOf(obj: unknown): string {
    if (obj === null) return 'null';
    if (obj === undefined) return 'undefined';
    if (typeof obj === 'function') return obj.name || '<anonymous>';
    if (typeof obj === 'object') {
      const ctor = (obj as { constructor?: { name?: string } }).constructor;
      return ctor?.name ?? 'object';
    }
    return String(obj);
  }
}
