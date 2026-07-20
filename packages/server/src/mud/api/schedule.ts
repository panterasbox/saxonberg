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
import { SecurityApi } from './security';

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
  fn: () => void
): void {
  if (causingId === null) {
    void ExecutionContextApi.runRootGuarded(ScheduleApi, 'fire', fn, 'swallow');
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
    'swallow'
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
    const id = SecurityApi.uuid();
    let cancelled = false;

    const timer = setTimeout(() => {
      if (cancelled) return;
      planRun(causing, fn);
    }, delayMs);

    return {
      id,
      cancel: () => {
        cancelled = true;
        clearTimeout(timer);
      },
    } satisfies InternalHandle as InternalHandle;
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
    const initialDelay = opts?.initialDelayMs ?? intervalMs;
    const mode = opts?.mode ?? 'fixed-delay';
    const id = SecurityApi.uuid();
    let cancelled = false;

    let timeout: ReturnType<typeof setTimeout> | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;

    const fireFixedDelay = (): void => {
      if (cancelled) return;
      planRun(causing, fn);
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
        planRun(causing, fn);
      }, intervalMs);
    };

    if (mode === 'fixed-delay') {
      timeout = setTimeout(fireFixedDelay, initialDelay);
    } else {
      timeout = setTimeout(() => {
        timeout = null;
        if (cancelled) return;
        planRun(causing, fn);
        startFixedRate();
      }, initialDelay);
    }

    return {
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
      },
    } satisfies InternalHandle as InternalHandle;
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
}
