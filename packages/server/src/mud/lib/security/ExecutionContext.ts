/**
 * ExecutionContext — async-safe call stack.
 *
 * Pillar 1 of the call-security framework. Carries a stack of `CallFrame`s
 * through `await`, `setTimeout`, and `Promise.then` boundaries via
 * AsyncLocalStorage, so any guarded method body can ask "who called me?"
 * without threading a context parameter through every signature.
 *
 * Frames are pushed by the Proxy on entry to a guarded method and popped on
 * exit. Backend wraps each Application entry point in `runRoot()` to plant
 * a synthetic root frame whose `caller` is `null`. `StuffApi.create` and
 * `StuffApi.clone` push a synthetic constructor frame around hydrate +
 * postRegister.
 *
 * The CallFrame and CallStack types live alongside this class — they are
 * narrowly tied to ExecutionContext's machinery and have no other
 * consumer worth exporting them through a separate barrel.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { SecurityError } from './errors';

/**
 * One frame on the call stack.
 *
 * `caller`/`target` are `unknown` rather than `Stuff` to avoid an import
 * cycle; the framework treats them as opaque object identities for stack
 * walking. Consumers that need the real type cast at the boundary.
 */
export interface CallFrame {
  caller: unknown | null;
  target: unknown | null;
  method: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * The call stack — an ordered list of frames, frame-0 = root.
 */
export type CallStack = readonly CallFrame[];

/** ALS-backed storage. Mutating operations replace the array immutably. */
const _als = new AsyncLocalStorage<CallFrame[]>();

/** Symbol marker for the "command" frame kind, exposed for stack walking. */
export const COMMAND_FRAME_KIND = 'command';

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
   * Walk the call stack from top to bottom looking for a frame whose
   * target is the immediate `CommandGiver` (the most recent
   * `executeCommand` push). Returns `null` if no command frame is on
   * the stack.
   *
   * Cross-pause caveat: command frames live inside the synchronous
   * call chain. After a prompt resume / scheduled tick / cross-actor
   * message, the chain rebuilds fresh and this returns null.
   */
  public static getCurrentCommandGiver(): unknown | null {
    const stack = _als.getStore();
    if (!stack) return null;
    for (let i = stack.length - 1; i >= 0; i--) {
      const frame = stack[i]!;
      if (frame.metadata?.kind === COMMAND_FRAME_KIND) {
        return frame.target;
      }
    }
    return null;
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
        return `  #${i} ${callerName} → ${targetName}.${f.method}`;
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
   *   - the Proxy, when intercepting a method call;
   *   - `CommandGiverMixin.executeCommand` to push the command frame;
   *   - `StuffApi.#registerAndInit` for the synthetic constructor frame.
   */
  public static run<T>(
    caller: unknown | null,
    target: unknown | null,
    method: string,
    metadata: Record<string, unknown> | undefined,
    fn: () => T
  ): T {
    const frame: CallFrame = {
      caller,
      target,
      method,
      timestamp: Date.now(),
      metadata,
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
      metadata: { kind: 'root' },
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
