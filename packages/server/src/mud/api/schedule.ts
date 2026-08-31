/**
 * ScheduleApi — opt-in propagation of command attribution across
 * scheduled async work.
 *
 * One-shot and recurring callbacks run via Node's setTimeout/setInterval.
 * When `propagateAttribution` is true (the default), the scheduler
 * captures `ExecutionContextApi.getCurrentCausingCommandId()` at schedule
 * time and re-plants it onto a fresh Root frame inside the callback —
 * so frames composed inside the callback carry the originating command's
 * `causingCommandId` even though `commandId` is absent (we're no longer
 * inside synchronous command execution).
 *
 * A callback that itself calls `ScheduleApi.schedule` with propagation
 * extends the chain. Pass `propagateAttribution: false` to sever it.
 *
 * Single-purpose for v1: schedule, recurring, cancel. Game-time
 * scheduling, calendar-aware fires, "reset" mechanics layer on top.
 */

import { ExecutionContextApi } from './execution-context';
import { StuffApi } from './stuff';
import { SecurityApi } from './security';

/**
 * Per-scope index of live handles registered from circle contexts —
 * consulted by `cancelAllForScope` at circle reap. Field/omni
 * registrations are never indexed, so this map holds zero entries when
 * no circle exists.
 */
const _handlesByScope: Map<string, Set<InternalHandle>> = new Map();

function _indexHandle(scope: string | null, handle: InternalHandle): void {
  if (scope === null || scope === '*') return;
  let set = _handlesByScope.get(scope);
  if (!set) {
    set = new Set();
    _handlesByScope.set(scope, set);
  }
  set.add(handle);
}

/**
 * The scope a callback registered *now* should fire under.
 *
 * Three cases, and the third is the one that needs saying:
 *   - registered inside a circle → that circle (continuations carry
 *     birth scope, so deferred work stays governed);
 *   - registered inside any other execution context (a command, a
 *     session root) → that context's scope, `null` for ordinary field
 *     work;
 *   - registered with **no execution context at all** → `OMNI_SCOPE`.
 *     That is boot: the maintenance sweeps (residency eviction, the
 *     standings recomputes, the attendant idle sweep) install before
 *     any root exists, and they are system work by definition — they
 *     walk the whole world, circle-resident objects included. Without
 *     this they would run field-scoped and be boundary-denied on every
 *     circle object (found live: the residency presence walk throwing
 *     on a wire body).
 */
function _registrationScope(): string | null {
  const scope = ExecutionContextApi.getCircleScope();
  if (scope !== null) return scope;
  return ExecutionContextApi.getCallStack().length === 0 ? '*' : null;
}

function _unindexHandle(scope: string | null, handle: InternalHandle): void {
  if (scope === null || scope === '*') return;
  const set = _handlesByScope.get(scope);
  if (!set) return;
  set.delete(handle);
  if (set.size === 0) _handlesByScope.delete(scope);
}

export interface ScheduleOptions {
  /**
   * When true (default), captures
   * `ExecutionContextApi.getCurrentCausingCommandId()` at schedule
   * time and restores it on a Root frame for the callback. When
   * false, the callback runs with no command attribution — the chain
   * is severed.
   */
  propagateAttribution?: boolean;
}

export interface RecurringOptions extends ScheduleOptions {
  /**
   * Optional initial delay before the first fire. Defaults to
   * `intervalMs` (first fire after one full interval). Set to 0 for
   * fire-now-then-recur semantics.
   */
  initialDelayMs?: number;

  /**
   * Drift handling.
   * - `fixed-delay` (default): next fire = previous-completion + interval.
   *   Drift-tolerant; cadence depends on callback runtime.
   * - `fixed-rate`: next fire = scheduled-time + N*interval. Predictable
   *   cadence; if callback runs long, fires can pile up.
   */
  mode?: 'fixed-rate' | 'fixed-delay';
}

export interface ScheduleHandle {
  readonly id: string;
}

interface InternalHandle {
  readonly id: string;
  cancel(): void;
}

/**
 * Wrap `fn` so it runs inside a guarded `runRoot` with the captured
 * `causingCommandId` planted on the new Root frame's metadata.
 * When `causingId` is null (no propagation, or no ambient command),
 * still run inside `runRootGuarded` so the callback has a fresh,
 * well-defined call-stack root — just without the metadata.
 *
 * Uses `runRootGuarded('swallow')`: a scheduled callback has no caller to
 * rethrow to, so a throw is recorded as a runtime diagnostic and
 * swallowed. This also fixes a latent bug — a *sync* throw from `fn`
 * under the old `runRoot` propagated out of `planRun` and killed the
 * caller's reschedule (`fireFixedDelay` never re-armed its timer). fn is
 * `() => void`, so its synchronous body still completes before the guard
 * yields; only the error path changes.
 */
function planRun(
  causingId: string | null,
  fn: () => void,
  circleScope: string | null = null
): void {
  // Continuations carry BIRTH scope: a callback scheduled from circle
  // context re-plants that scope on its fresh root, so the four
  // containment layers govern the deferred work exactly as they governed
  // the scheduling act (the `causingCommandId` precedent, verbatim).
  const opts = circleScope !== null ? { circleScope } : undefined;
  // A scheduled callback is a fresh root — never part of the clone tree
  // that armed it (see `StuffApi.outsideCloneTree`).
  StuffApi.outsideCloneTree(() => planRunInner(causingId, fn, opts));
}

function planRunInner(
  causingId: string | null,
  fn: () => void,
  opts: { circleScope: string } | undefined
): void {
  if (causingId === null) {
    void ExecutionContextApi.runRootGuarded(
      ScheduleApi,
      'fire',
      fn,
      'swallow',
      opts
    );
    return;
  }
  void ExecutionContextApi.runRootGuarded(
    ScheduleApi,
    'fire',
    () => {
      ExecutionContextApi.updateCurrentFrameMetadata({
        causingCommandId: causingId,
      });
      fn();
    },
    'swallow',
    opts
  );
}

export class ScheduleApi {
  private constructor() {}

  /**
   * One-shot delayed callback. Returns a handle for cancellation.
   *
   * `propagateAttribution` defaults to true. When the callback fires,
   * it runs inside a fresh `runRoot` — there is no live CommandContext,
   * but `causingCommandId` is restored from schedule time so frames
   * composed inside the callback can correlate to the originating
   * command.
   */
  public static schedule(
    delayMs: number,
    fn: () => void,
    opts?: ScheduleOptions
  ): ScheduleHandle {
    const propagate = opts?.propagateAttribution ?? true;
    const causing = propagate
      ? ExecutionContextApi.getCurrentCausingCommandId()
      : null;
    const birthScope = _registrationScope();
    const id = SecurityApi.uuid();
    let cancelled = false;

    const timer = setTimeout(() => {
      if (cancelled) return;
      _unindexHandle(birthScope, handle);
      planRun(causing, fn, birthScope);
    }, delayMs);

    const handle: InternalHandle = {
      id,
      cancel: () => {
        cancelled = true;
        clearTimeout(timer);
        _unindexHandle(birthScope, handle);
      },
    };
    _indexHandle(birthScope, handle);
    return handle;
  }

  /**
   * Recurring callback. Default: first fire after `intervalMs`, then
   * every `intervalMs` (fixed-delay). See `RecurringOptions`.
   *
   * Attribution is captured at schedule time and reused for every
   * fire. The chain doesn't decay across iterations; if the
   * originating command is "lighting a candle that ticks once a
   * second," every tick reads back the same `causingCommandId`.
   */
  public static recurring(
    intervalMs: number,
    fn: () => void,
    opts?: RecurringOptions
  ): ScheduleHandle {
    const propagate = opts?.propagateAttribution ?? true;
    const causing = propagate
      ? ExecutionContextApi.getCurrentCausingCommandId()
      : null;
    const birthScope = _registrationScope();
    const initialDelay = opts?.initialDelayMs ?? intervalMs;
    const mode = opts?.mode ?? 'fixed-delay';
    const id = SecurityApi.uuid();
    let cancelled = false;

    let timeout: ReturnType<typeof setTimeout> | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;

    const fireFixedDelay = (): void => {
      if (cancelled) return;
      planRun(causing, fn, birthScope);
      if (cancelled) return;
      timeout = setTimeout(fireFixedDelay, intervalMs);
    };

    const startFixedRate = (): void => {
      if (cancelled) return;
      // setInterval gives us bounded fixed-rate cadence out of the
      // box — Node coalesces or queues fires if the callback runs
      // long, depending on the runtime's policy.
      interval = setInterval(() => {
        if (cancelled) return;
        planRun(causing, fn, birthScope);
      }, intervalMs);
    };

    if (mode === 'fixed-delay') {
      timeout = setTimeout(fireFixedDelay, initialDelay);
    } else {
      timeout = setTimeout(() => {
        timeout = null;
        if (cancelled) return;
        planRun(causing, fn, birthScope);
        startFixedRate();
      }, initialDelay);
    }

    const handle: InternalHandle = {
      id,
      cancel: () => {
        cancelled = true;
        if (timeout !== null) {
          clearTimeout(timeout);
          timeout = null;
        }
        if (interval !== null) {
          clearInterval(interval);
          interval = null;
        }
        _unindexHandle(birthScope, handle);
      },
    };
    _indexHandle(birthScope, handle);
    return handle;
  }

  /**
   * Cancel a previously scheduled callback. Idempotent. For recurring
   * schedules, cancels all future fires.
   */
  public static cancel(handle: ScheduleHandle): void {
    // The handle returned from schedule/recurring carries its own
    // cancel closure; cast back to the internal shape.
    (handle as InternalHandle).cancel?.();
  }

  /**
   * Cancel every live handle registered from `scope`'s circle context —
   * the reap seam `SandboxLogic` invokes when a circle session ends, so
   * no deferred callback outlives its circle. Returns the cancel count.
   * A no-op for scopes with no indexed handles (the map is empty when no
   * circle exists). @internal
   */
  public static cancelAllForScope(scope: string): number {
    const set = _handlesByScope.get(scope);
    if (!set) return 0;
    // cancel() unindexes as it goes; snapshot first.
    const handles = [...set];
    for (const h of handles) h.cancel();
    return handles.length;
  }
}

SecurityApi.decorateApiClass(ScheduleApi);
