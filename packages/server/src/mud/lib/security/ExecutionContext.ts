/**
 * ExecutionContext — async-safe call stack.
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
import { SecurityError } from './errors';

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

/**
 * Static-class style API. All methods are static so callers don't need to
 * instantiate or import a singleton.
 */
export class ExecutionContext {
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
    return ExecutionContext.findFrame(FrameKind.Command)?.target ?? null;
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
        const callerName = ExecutionContext.#nameOf(f.caller);
        const targetName = ExecutionContext.#nameOf(f.target);
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
  public static assertCaller(expected: Function): void {
    const caller = ExecutionContext.getCaller();
    if (
      caller === null ||
      typeof caller !== 'object' ||
      !(caller instanceof (expected as new (...a: unknown[]) => object))
    ) {
      const callerName = ExecutionContext.#nameOf(caller);
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
   * Test-only seam: clear any in-flight ALS context. Intended only for
   * Vitest cleanup; production code should never call this.
   * @internal
   */
  public static _clearForTesting(): void {
    _als.enterWith(undefined as unknown as CallFrame[]);
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
