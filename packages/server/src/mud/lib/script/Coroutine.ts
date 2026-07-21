/**
 * Coroutine — the suspension / continuation state machine that pumps a
 * script's generator across game-clock frames.
 *
 * The interpreter is a *synchronous* generator yielding {@link Effect}s;
 * the Coroutine is the async pump that handles them and — crucially — can
 * **detach**: when the script suspends (a `wait` / `every` / `when`, or an
 * **await-engaged** step), the pump schedules its own resume on
 * `WorldClockApi` (game-time, never a bare timer) and **returns**, so the
 * host's prompt stays live. The suspended script is a detached background
 * coroutine; the scheduler fires it forward.
 *
 * Suspension is **in-memory** (a running script dies on restart — durable
 * continuations deferred). The four suspension shapes:
 *
 *  - **wait `<dur>`** — one-shot: resume after the duration.
 *  - **await-engaged** — *not yielded*; detected after a dispatch that
 *    started a timed activity. The pacing rule: the next statement waits
 *    until the engaged step completes, so a scripted build trickles out
 *    step-by-step instead of dumping.
 *  - **every `<dur> {block}`** — perpetual cadence: each tick runs the
 *    block; the main script does not resume past it.
 *  - **when `(cond) {block}`** — poll the condition; once truthy, run the
 *    block, then resume.
 *
 * **Cancellation** is real and typed: `cancel(reason)` stops the pump,
 * cancels the pending timer, and **aborts the in-flight engaged step**
 * (barge-in → the activity's effect never lands → partial matter standing,
 * no rollback). Sub-coroutines (every/when blocks) cancel with the parent.
 */

import { WorldClockApi } from "../../api/worldclock";
import type { ClockHandle } from "../../api/worldclock";
import { SchedulerApi } from "../../api/scheduler";
import { MixinApi } from "../../api/mixin";
import { Quantity } from "../quantity";
import { ScriptValues } from "./Value";
import { ResourceLimitError } from "./Interpreter";
import type {
  Interpreter,
  Effect,
  Resume,
  SuspendRequest,
  DriveResult,
  DispatchFn,
  RescheduleFn,
} from "./Interpreter";
import type { ScriptValue } from "./Value";
import type { Block } from "./Block";
import type { Eval } from "./Interpreter";
import type { AbortReason, Note } from "@saxonberg/types";
import type { ScriptAbortReason } from "./AbortReason";
import type { Stuff } from "../stuff/Stuff";
import type { Engaged } from "../activity/Engaged";

/** `when` condition poll cadence, in game-seconds. */
const WHEN_POLL_SECONDS = 1;
/** Re-check cadence after the expected engaged-completion, in game-seconds. */
const ENGAGED_RECHECK_SECONDS = 0.5;

type CoState = "running" | "suspended" | "done" | "cancelled";

export class Coroutine {
  private state: CoState = "running";
  private settled = false;
  private firstYielded = false;
  /** The current suspension's clock handle (for cancellation). */
  private pending: ClockHandle | null = null;
  /** The engaged step this coroutine is awaiting, if any (for barge-in). */
  private awaitedEngagementId: string | null = null;
  /** Live sub-coroutines (every/when blocks) — cancelled with the parent. */
  private readonly subs = new Set<Coroutine>();

  private readonly settledPromise: Promise<DriveResult>;
  private resolveSettled!: (result: DriveResult) => void;
  private readonly firstYieldPromise: Promise<void>;
  private resolveFirstYield!: () => void;

  constructor(
    private readonly gen: Eval<ScriptValue>,
    private readonly interp: Interpreter,
    private readonly dispatch: DispatchFn,
    private readonly reschedule: RescheduleFn,
  ) {
    this.settledPromise = new Promise((r) => (this.resolveSettled = r));
    this.firstYieldPromise = new Promise((r) => (this.resolveFirstYield = r));
  }

  /** Begin pumping (fire-and-forget; the pump detaches on suspend). */
  start(): void {
    void this.pump(undefined);
  }

  /** Resolves on the first suspend OR on completion — the detach point. */
  whenFirstYield(): Promise<void> {
    return this.firstYieldPromise;
  }

  /** Resolves when the run finishes or is cancelled. */
  whenSettled(): Promise<DriveResult> {
    return this.settledPromise;
  }

  /** Current lifecycle state. */
  getState(): CoState {
    return this.state;
  }

  /**
   * Whether the run was cancelled. A method (not an inline
   * `this.state === "cancelled"`) so the check survives across an
   * `await` — TS narrows the field to `"running"` after the pump's
   * opening assignment and can't see `cancel()` mutate it concurrently.
   */
  private isCancelled(): boolean {
    return this.state === "cancelled";
  }

  /**
   * Cancel the run with a typed reason. Stops the pump, cancels the
   * pending timer, aborts the in-flight engaged step (the barge-in), and
   * cancels sub-coroutines. Already-dispatched effects stand (no
   * rollback).
   */
  cancel(reason: ScriptAbortReason): void {
    if (this.state === "done" || this.state === "cancelled") return;
    this.state = "cancelled";
    this.clearPending();
    if (this.awaitedEngagementId !== null) {
      const engagement = SchedulerApi.getEngagementById(this.awaitedEngagementId);
      if (engagement) SchedulerApi.cancel(engagement, reason as AbortReason);
      this.awaitedEngagementId = null;
    }
    for (const sub of this.subs) sub.cancel(reason);
    this.subs.clear();
    try {
      this.gen.return(undefined);
    } catch {
      /* generator already complete */
    }
    this.finish({ aborted: reason });
  }

  /* ─────────────────────────── the pump ─────────────────────────── */

  private async pump(resume: Resume): Promise<void> {
    if (this.state === "cancelled" || this.state === "done") return;
    this.state = "running";
    for (;;) {
      let step: IteratorResult<Effect, ScriptValue>;
      try {
        step = this.gen.next(resume);
      } catch (error) {
        if (error instanceof ResourceLimitError) {
          this.finish({ aborted: "resource-limit", detail: error.which });
          return;
        }
        // Unexpected interpreter error — log and settle (effects stand).
        console.error("Coroutine: interpreter threw", error);
        this.finish({});
        return;
      }
      if (step.done) {
        this.finish({ value: step.value });
        return;
      }
      const effect = step.value;

      if (effect.kind === "dispatch") {
        const before = this.engagementIds();
        const ctx = await this.dispatch(effect.command, effect.model, effect.prep);
        if (this.isCancelled()) return;
        for (const note of ctx.getNotes()) this.interp.recordNote(note);
        // The await-engaged pacing rule: if the command started a timed
        // activity, suspend until it completes before the next statement.
        const engagedId = this.newEngagementId(before);
        if (engagedId !== null) {
          this.suspendUntilEngaged(engagedId, ctx);
          return; // detached
        }
        resume = ctx;
        continue;
      }

      if (effect.kind === "slice") {
        await this.reschedule();
        if (this.isCancelled()) return;
        resume = undefined;
        continue;
      }

      // suspend (wait / every / when)
      this.handleSuspend(effect.request);
      return; // detached
    }
  }

  /* ─────────────────────── suspension handlers ──────────────────── */

  private handleSuspend(request: SuspendRequest): void {
    this.markSuspended();
    switch (request.type) {
      case "wait":
        this.pending = WorldClockApi.after(
          Quantity.of(request.seconds, "s"),
          () => {
            this.pending = null;
            if (this.state === "cancelled") return;
            void this.pump(undefined);
          },
        );
        return;
      case "every":
        // Perpetual cadence — the main script does not resume past it.
        this.pending = WorldClockApi.every(
          Quantity.of(Math.max(request.seconds, 0.001), "s"),
          () => {
            if (this.state === "cancelled") return;
            void this.runBlock(request.block);
          },
        );
        return;
      case "when":
        this.pending = WorldClockApi.every(
          Quantity.of(WHEN_POLL_SECONDS, "s"),
          () => {
            if (this.state === "cancelled") return;
            const value = this.interp.evalCondition(request.source, request.scope);
            if (!ScriptValues.isTruthy(value)) return;
            this.clearPending();
            void this.runBlock(request.block).then(() => {
              if (this.state !== "cancelled") void this.pump(undefined);
            });
          },
        );
        return;
    }
  }

  /** Suspend until an engaged step completes, then resume with its ctx. */
  private suspendUntilEngaged(engagementId: string, ctx: Resume): void {
    this.markSuspended();
    this.awaitedEngagementId = engagementId;
    const durationSeconds = this.engagementDurationSeconds(engagementId);
    const schedule = (seconds: number): void => {
      this.pending = WorldClockApi.after(
        Quantity.of(Math.max(seconds, 0.001), "s"),
        () => {
          this.pending = null;
          if (this.state === "cancelled") return;
          if (SchedulerApi.getEngagementById(engagementId) === undefined) {
            this.awaitedEngagementId = null;
            void this.pump(ctx);
          } else {
            schedule(ENGAGED_RECHECK_SECONDS); // not done yet — re-check
          }
        },
      );
    };
    schedule(durationSeconds);
  }

  /** Run a block as a tracked sub-coroutine (every/when bodies). */
  private async runBlock(block: Block): Promise<void> {
    const sub = new Coroutine(
      this.interp.invokeBlock(block),
      this.interp,
      this.dispatch,
      this.reschedule,
    );
    this.subs.add(sub);
    sub.start();
    await sub.whenSettled();
    this.subs.delete(sub);
  }

  /* ─────────────────────────── helpers ─────────────────────────── */

  private markSuspended(): void {
    this.state = "suspended";
    this.signalFirstYield();
  }

  private engagementIds(): ReadonlySet<string> {
    const actor = this.interp.getActor();
    if (!MixinApi.isEngaged(actor)) return new Set();
    return new Set(actor.getEngagements().map((e) => e.engagementId));
  }

  /** A new engagement id that appeared since `before`, or null. */
  private newEngagementId(before: ReadonlySet<string>): string | null {
    const actor = this.interp.getActor();
    if (!MixinApi.isEngaged(actor)) return null;
    for (const e of actor.getEngagements()) {
      if (!before.has(e.engagementId)) return e.engagementId;
    }
    return null;
  }

  private engagementDurationSeconds(engagementId: string): number {
    const e = SchedulerApi.getEngagementById(engagementId) as
      | { duration?: number }
      | undefined;
    return e && typeof e.duration === "number"
      ? e.duration / 1000
      : ENGAGED_RECHECK_SECONDS;
  }

  private clearPending(): void {
    if (this.pending !== null) {
      WorldClockApi.cancel(this.pending);
      this.pending = null;
    }
  }

  private signalFirstYield(): void {
    if (!this.firstYielded) {
      this.firstYielded = true;
      this.resolveFirstYield();
    }
  }

  private finish(partial: {
    value?: ScriptValue;
    aborted?: ScriptAbortReason;
    detail?: string;
  }): void {
    if (this.settled) return;
    this.settled = true;
    if (this.state !== "cancelled") this.state = "done";
    this.clearPending();
    const notes: Note[] = this.interp.getNotes();
    const result: DriveResult = {
      value: partial.value,
      notes,
      ...(partial.aborted !== undefined ? { aborted: partial.aborted } : {}),
      ...(partial.detail !== undefined ? { detail: partial.detail } : {}),
    };
    this.signalFirstYield();
    this.resolveSettled(result);
  }
}
