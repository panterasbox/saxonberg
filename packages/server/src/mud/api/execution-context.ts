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

/**
 * The omni scope sentinel — system roots (boot, seeding, maintenance,
 * relay ingest) plant this so framework work passes the sandbox
 * boundary check everywhere. Distinct from `null` (field scope): omni
 * means "trusted system context," null means "the ordinary world."
 */
export const OMNI_SCOPE = '*';

/**
 * Optional scope opts for `runRoot` / `runRootGuarded`. The sandbox
 * containment build's taint carrier: a root planted with `circleScope`
 * runs its whole async tree as circle-context work; one planted with
 * `jurisdictionBound` runs as governed-eval work bounded to a parcel
 * extent. Both are read via `getCircleScope()` /
 * `getJurisdictionBound()` — never passed as parameters to downstream
 * APIs.
 */
export interface RunRootOpts {
  circleScope?: string;
  jurisdictionBound?: string;
}

/**
 * One link of the call stack.
 *
 * ⭐ A linked list, not an array, and that is the whole point: a push is
 * one allocation regardless of how deep the stack already is. The array
 * form copied its parent on every push (`[...parent, frame]`), which is
 * O(depth) work on the hottest path in the engine — and play runs deep.
 * Measured on `bench-gate`'s depth sweep: a dispatch cost 3.96 us at the
 * top of an empty stack and 8.2 us two hundred frames down, and the
 * difference was the copy.
 *
 * `root` is carried on every node rather than walked to, because the
 * sandbox boundary reads frame-0's metadata on every single dispatch and
 * that read must stay O(1).
 */
interface FrameNode {
  readonly frame: CallFrame;
  readonly parent: FrameNode | null;
  /** Frame 0. Self on a root node. */
  readonly root: FrameNode;
}

/** ALS-backed storage — the innermost frame; walk `parent` for the rest. */
const _als = new AsyncLocalStorage<FrameNode>();

/**
 * Link `frame` beneath the current node (or start a fresh stack).
 *
 * A class rather than an object literal for one reason: `root` on a root
 * node is the node ITSELF, and a literal cannot name itself while it is
 * being built — expressing it that way needed a
 * `null as unknown as FrameNode` placeholder to satisfy the field's type
 * and then overwrite it. A constructor has `this`.
 */
class LinkedFrame implements FrameNode {
  readonly root: FrameNode;
  constructor(
    readonly frame: CallFrame,
    readonly parent: FrameNode | null
  ) {
    this.root = parent !== null ? parent.root : this;
  }
}

function _linkFrame(frame: CallFrame, parent: FrameNode | null): FrameNode {
  return new LinkedFrame(frame, parent);
}

/**
 * The frames outermost-first, as an array. Only the three readers that
 * genuinely need the whole stack pay for it (`getCallStack`,
 * `getCommandStack`, `dumpCallStack`) — none of them is on a hot path.
 */
function _materialise(node: FrameNode | undefined): CallFrame[] {
  if (!node) return [];
  const out: CallFrame[] = [];
  for (let n: FrameNode | null = node; n !== null; n = n.parent) {
    out.push(n.frame);
  }
  out.reverse();
  return out;
}

/**
 * The capability handed back by {@link ExecutionContextApi.claimFramePush}
 * — the body of `run` with the per-call caller proof already taken.
 */
export type FramePush = <T>(
  caller: unknown | null,
  target: unknown | null,
  method: string,
  opts: RunFrameOpts | undefined,
  fn: () => T
) => T;

/**
 * Push a frame and run `fn` beneath it. The shared body of `run` (which
 * proves its caller every call) and of the claimed {@link FramePush}
 * capability (whose holder proved it once). Module-private: the only way
 * out of this file is `claimFramePush`, which is itself proof-gated.
 */
function _pushFrame<T>(
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
  return _als.run(_linkFrame(frame, _als.getStore() ?? null), fn);
}

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
  // callbacks, event-listener dispatch). Each lives at `/platform/idea/<X>` and
  // is the storage backend for a thin Api facade. The Api gates who
  // can call the Registry via `@CallSecurity`; this allowlist entry is
  // the orthogonal trust that the Registry's body is engine code, not
  // content. Keep narrow — add the bare name, not a wildcard.
  /\/mud\/platform\/idea\/(EventSubscriptions|MqlSubscriptionRegistry|SchedulerRegistry|WorldClockRegistry)\.(ts|js)$/,
  // The persistence-spine logic singleton plants a principal frame around
  // restore (`run` + `tagActingAuthor`) so capture/restore executes AS the
  // owning principal — the single reviewed frame-mutator touchpoint of the
  // persistence build. Lives at `/platform/idea/api/persistable`; `PersistableApi`
  // gates who may call it. Same narrow trust as the registries above: this
  // entry asserts the singleton's BODY is engine code, not content.
  /\/mud\/platform\/idea\/api\/PersistableLogic\.(ts|js)$/,
  // The sandbox logic singleton plants circle-scoped roots for the
  // crossing choreography (mint/park/reap under the circle's scope) and
  // the eval scope root — the sanctioned root-level scope assignment.
  // Same narrow trust as PersistableLogic: this entry asserts the
  // singleton's BODY is engine code, not content.
  /\/mud\/platform\/idea\/api\/SandboxLogic\.(ts|js)$/,
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

/**
 * Build root-frame metadata from scope opts, or `undefined` when no
 * scope rides this root (the common case — zero allocation).
 */
function _scopeMetadata(
  opts: RunRootOpts | undefined
): Record<string, unknown> | undefined {
  if (!opts || (opts.circleScope == null && opts.jurisdictionBound == null)) {
    return undefined;
  }
  const md: Record<string, unknown> = {};
  if (opts.circleScope != null) md.circleScope = opts.circleScope;
  if (opts.jurisdictionBound != null) {
    md.jurisdictionBound = opts.jurisdictionBound;
  }
  return md;
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
    const node = _als.getStore();
    return node ? node.frame.caller : null;
  }

  /**
   * Look up the current target — the `target` of the frame at the top
   * of the stack. Useful inside guarded method bodies to confirm
   * `this` matches the framework's view.
   */
  public static getCurrentTarget(): unknown | null {
    const node = _als.getStore();
    return node ? node.frame.target : null;
  }

  /**
   * Read the entire call stack as a frozen, read-only snapshot.
   * Always returns an array (empty if no context).
   */
  public static getCallStack(): CallStack {
    return _materialise(_als.getStore());
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
    for (let n = _als.getStore() ?? null; n !== null; n = n.parent) {
      if (n.frame.kind === kind) return n.frame;
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
    const node = _als.getStore();
    if (!node) {
      throw new SecurityError(
        `tagCurrentFrame(${kind}): no frame on the stack to tag`
      );
    }
    node.frame.kind = kind;
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
   *     giver. A forced dispatch (`forceCommand` (the giver's own method since the OO sweep)) or a
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
    for (let n = _als.getStore() ?? null; n !== null; n = n.parent) {
      const author = n.frame.metadata?.actingAuthor;
      if (author != null) return author;
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
    const node = _als.getStore();
    if (!node) {
      throw new SecurityError(
        'tagActingAuthor: no frame on the stack to tag'
      );
    }
    const top = node.frame;
    if (!top.metadata) top.metadata = {};
    top.metadata.actingAuthor = principal;
  }

  /**
   * Walk the call stack outermost-to-innermost and return every
   * Command frame's contextual data. The returned tuples carry the
   * frame's `CommandContext` (already includes `commandId` and
   * `executionId`) plus the `forced` flag — `true` for system-fired
   * commands invoked through `forceCommand` (the giver's own method since the OO sweep), `false` (or
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
    const stack = _materialise(_als.getStore());
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
   * The ambient circle scope for the current execution tree, or `null`
   * for ordinary field work. Read from the **frame-0 root's** metadata —
   * one ALS load plus a constant index, no walk (frame 0 is the root by
   * construction; scope is minted only at execution roots and never
   * moves). Returns `OMNI_SCOPE` (`'*'`) for system roots that planted
   * it, a parcel path (`/home/<playerId>` / `/studio/<groupId>`) for
   * circle roots, and `null` when no root planted a scope (including
   * `run()` without any enclosing context — correct: no root, no scope).
   *
   * This is the sandbox containment build's single scope oracle: no API
   * accepts scope as a parameter; everything derives it from here.
   */
  public static getCircleScope(): string | null {
    const node = _als.getStore();
    if (!node) return null;
    return (node.root.frame.metadata?.circleScope as string | undefined) ?? null;
  }

  /**
   * The governed-eval jurisdiction bound (a parcel extent) for the
   * current execution tree, or `null`. Same frame-0 slot discipline as
   * {@link getCircleScope}; planted only by the governed-eval root, so
   * this is null on every ordinary path.
   */
  public static getJurisdictionBound(): string | null {
    const node = _als.getStore();
    if (!node) return null;
    return (
      (node.root.frame.metadata?.jurisdictionBound as string | undefined) ?? null
    );
  }

  /**
   * Both boundary fields in ONE store access — the security gate's
   * per-dispatch read (zero-circle worlds pay one `getStore()` + one
   * metadata load, exactly what the lone scope read cost). @internal
   */
  public static _boundaryContext(): {
    scope: string | null;
    bound: string | null;
  } {
    const node = _als.getStore();
    if (!node) return { scope: null, bound: null };
    const md = node.root.frame.metadata;
    if (!md) return { scope: null, bound: null };
    return {
      scope: (md.circleScope as string | undefined) ?? null,
      bound: (md.jurisdictionBound as string | undefined) ?? null,
    };
  }

  /**
   * Establish the circle scope on the **current root frame** — the
   * command-boundary seam, where the root is planted before the giver
   * (and therefore the giver's stamped scope) is known. Set-once:
   * establishing over an already-present scope throws (a circle frame
   * under a field root — or a re-scoped root — is a contradiction, and
   * silently overwriting would be a taint-laundering primitive).
   *
   * Gated by the same frame-mutator allowlist as {@link tagCurrentFrame};
   * throws when called outside any frame context.
   */
  public static establishCircleScope(scope: string): void {
    _assertFrameMutatorAllowed('establishCircleScope');
    const node = _als.getStore();
    if (!node) {
      throw new SecurityError(
        'establishCircleScope: no frame on the stack to establish scope on'
      );
    }
    const root = node.root.frame;
    const existing = root.metadata?.circleScope;
    if (existing != null) {
      throw new SecurityError(
        `establishCircleScope: scope already established (${String(
          existing
        )}); re-establishing (${scope}) is a contradiction`
      );
    }
    if (!root.metadata) root.metadata = {};
    root.metadata.circleScope = scope;
  }

  /**
   * Walk the call stack top-down and return the first
   * `metadata.causingCommandId` we hit. Set on the Command frame by
   * `CommandGiverMixin.executeCommand`, and re-planted on a fresh
   * Root frame by `ScheduleApi` when a propagating callback fires —
   * either way, the live "originating command id" surfaces here.
   */
  public static getCurrentCausingCommandId(): string | null {
    for (let n = _als.getStore() ?? null; n !== null; n = n.parent) {
      const id = n.frame.metadata?.causingCommandId;
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
    const node = _als.getStore();
    if (!node) {
      throw new SecurityError(
        'updateCurrentFrameMetadata: no frame on the stack to update'
      );
    }
    const top = node.frame;
    if (!top.metadata) top.metadata = {};
    Object.assign(top.metadata, patch);
  }

  /**
   * Pretty-print the call stack for debugging. Intentionally
   * human-formatted; do not parse this output.
   */
  public static dumpCallStack(): string {
    const stack = _materialise(_als.getStore());
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
    return _pushFrame(caller, target, method, opts, fn);
  }

  /**
   * Take the frame-push proof ONCE and hand back the capability.
   *
   * `run` proves from the call stack, on every single call, that its
   * caller is framework code. That proof costs a stack capture, and the
   * proxy gate pays it three times per method dispatch in the entire
   * engine — to re-derive a fact that is fixed at the call site and
   * cannot change between calls. Measured: 88% of the gate's cost, and
   * the gate is 2000x a raw call.
   *
   * So the hot paths take the proof once, at first use, and keep what
   * it yields: the raw push function, a closure over module-private
   * state that nothing outside this file can otherwise name or reach.
   *
   * This is not a weaker check, it is the same check taken at the right
   * frequency. The stack walk still gates the *claim*, so an unallowlisted
   * file gets a `SecurityError` here exactly as it would from `run`; the
   * three public frame mutators (`tagCurrentFrame`, `tagActingAuthor`,
   * `establishCircleScope`) keep their per-call walk, since they are
   * rare and they are what a forge would actually target. The handle
   * itself is an opaque capability of the kind the mudlib already uses
   * for sealed operations (`ScriptApi.compileSandboxed`,
   * `PersistApi.sealString`) — holding one is a code-review fact, not a
   * runtime one.
   *
   * Claim it lazily at first use and cache it in a private static; a
   * module-scope claim would be an executable statement at module scope.
   *
   * @internal — framework only. Two holders today: the proxy security
   * gate and the static-method wrapper, both in `api/security.ts`.
   */
  public static claimFramePush(): FramePush {
    _assertFrameMutatorAllowed('claimFramePush');
    return _pushFrame;
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
    fn: () => T,
    opts?: RunRootOpts
  ): T {
    _assertFrameMutatorAllowed('runRoot');
    const root: CallFrame = {
      caller: null,
      target,
      method,
      timestamp: Date.now(),
      kind: FrameKind.Root,
      metadata: _scopeMetadata(opts),
    };
    return _als.run(_linkFrame(root, null), fn);
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
    policy: 'absorb' | 'rethrow' | 'swallow',
    opts?: RunRootOpts
  ): Promise<T | undefined> {
    _assertFrameMutatorAllowed('runRootGuarded');
    const root: CallFrame = {
      caller: null,
      target,
      method,
      timestamp: Date.now(),
      kind: FrameKind.Root,
      metadata: _scopeMetadata(opts),
    };
    try {
      return await _als.run(
        _linkFrame(root, null),
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
    _als.enterWith(undefined as unknown as FrameNode);
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
