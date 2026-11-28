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
import type { ContinuationClaim } from './execution-context';
import { StuffApi } from './stuff';
import { SecurityApi } from './security';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
import { SecurityError } from '../lib/security/errors';

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
  // ⭐ System work is omni by definition — boot, a named sweep — whether or
  // not a root is planted around it (call-security pass D3).
  if (ExecutionContextApi.actingSystem() !== null) return '*';
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
  /**
   * ⭐ Run every fire as the named SYSTEM (`'residency'`, `'roster'`) —
   * engine work nobody in the world asked for, admitted at any protective
   * check and named in every diagnostic (call-security pass D3). Honored
   * only from the Api tier or a kernel singleton (`/platform/idea/<X>`); a
   * pack or a controller naming the system throws.
   */
  system?: string;
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
/**
 * ⭐⭐ What a deferred callback carries from the act that scheduled it — the
 * ONE continuation capture (tropes D2): who was acting, the act (a
 * callback is the same act, never a new one), its cause, the causing
 * command and the labor-plane author. `system` names engine work instead.
 *
 * ⭐ No work starts with nobody acting (tropes D3): scheduling with nobody
 * acting and no system named throws HERE, at the site that started the
 * work, rather than at the fire an hour later where nobody could tell who.
 */
function captureAttribution(opts: ScheduleOptions | undefined): ContinuationClaim {
  const system = opts?.system;
  if (system !== undefined) {
    const caller = ExecutionContextApi.getCaller();
    if (!SecurityPolicies.SystemNamer.allows(caller, ScheduleApi, 'schedule')) {
      throw new SecurityError(
        `ScheduleApi: only the Api tier or a kernel singleton may run work as the system ('${system}')`,
      );
    }
    if (system === '') throw new SecurityError('ScheduleApi: the system must be named');
  }
  const propagate = opts?.propagateAttribution ?? true;
  const carried = ExecutionContextApi.captureContinuation();
  if (carried === null && system === undefined) {
    throw new SecurityError(
      'ScheduleApi: no one is acting — schedule from inside an act, or name the system',
    );
  }
  // `propagateAttribution: false` severs the ACT (no causing command, act
  // id or author rides along) — never who is acting.
  const keep = propagate && carried !== null;
  return Object.freeze({
    actor: system !== undefined ? { actor: null, system } : carried!.actor,
    actId: keep ? carried.actId : null,
    causeId: keep ? carried.causeId : null,
    commandId: keep ? carried.commandId : null,
    author: keep ? carried.author : null,
  });
}

function planRun(
  causing: ContinuationClaim,
  fn: () => void,
  circleScope: string | null = null
): void {
  // Continuations carry BIRTH scope: a callback scheduled from circle
  // context re-plants that scope on its fresh root, so the four
  // containment layers govern the deferred work exactly as they governed
  // the scheduling act (the `causingCommandId` precedent, verbatim).
  // A scheduled callback is a fresh root — never part of the clone tree
  // that armed it (see `StuffApi.outsideCloneTree`).
  StuffApi.outsideCloneTree(() => planRunInner(causing, fn, circleScope));
}

function planRunInner(
  causing: ContinuationClaim,
  fn: () => void,
  circleScope: string | null
): void {
  void ExecutionContextApi.runRootGuarded(
    ScheduleApi,
    'fire',
    fn,
    'swallow',
    {
      acting: { continuation: causing },
      ...(circleScope !== null ? { circleScope } : {}),
    }
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
    const causing = captureAttribution(opts);
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
    const causing = captureAttribution(opts);
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
