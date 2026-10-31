/**
 * EvalScript — a Stuff-wrapped sandboxed code container that powers
 * the `eval` verb.
 *
 * The eval'd code becomes a real world entity: addressable by MQL via
 * its templatePath, security-frame-able like any other Stuff,
 * destroyable through `StuffApi.destruct`. This shape sets the stage
 * for `--save` (named persistent scripts) and `--mixin` (composable
 * capability) without needing a redesign — both are additive.
 *
 * Sandbox: Node's `vm`, reached through `ScriptApi.compileSandboxed` /
 * `runSandboxed` — `vm` is a capability and lives in the Api tier (see
 * docs/architecture.md § The import boundary). What this file owns is
 * the sandbox SURFACE (`buildSandbox`): ⭐ every Api class that
 * self-decorates (`SecurityApi.decoratedApiClasses()` — the runtime's
 * roster, never a hand-kept list), each as a frozen facade of its own
 * statics, plus `console`, `self` and `target`.
 * Not the security boundary — that is `@CallSecurity` on whatever the
 * eval'd code touches, so binding an Api exposes exactly what its own
 * per-static gates allow and nothing more — but the moat that keeps
 * `process` / `require` / `globalThis` unreachable.
 *
 * ⛔ **`@TestOnly` statics are bound as STUBS that name their door.**
 * `WorldClockApi.advance` and every `TestHarnessApi` static throw, from
 * eval, a message pointing at the `testharness` command. History worth
 * keeping: the taps build put `WorldClockApi` on the old four-name
 * allowlist so a drive could skip a season, and it was wrong three
 * ways — the justification was fabricated, a clock jump is scaffolding
 * and not a capability (nothing in the game moves the realm's clock),
 * and it could never work, because an eval always runs inside a
 * boundary and a GLOBAL jump is what a bounded context must not do. The
 * containment is the `@TestOnly` mark and the test-world predicate, and
 * the back doors (`setWeatherPin`, the clock registry) refuse an eval
 * frame by name (`SecurityApi.assertNotFromEval`).
 *
 * ⭐ **Every promise a facade static returns is HELD.** A rejection the
 * eval'd code dropped (a `StuffApi.clone` written as a statement, denied
 * at the sandbox boundary) is recorded on the run and reported on the
 * result line — never left unhandled, because an unhandled rejection
 * ends the process (`Server.ts`), which is how a refused clone used to
 * take the world down. ⚠ A promise from a method on `self` or on a Stuff
 * the code holds is NOT netted (a wrapper would break identity); await it.
 *
 * Migration target: `isolated-vm` for real V8-isolate sandboxing — what
 * would also make host work cancellable. The public surface (`setCode`,
 * async `run`) is designed to stay stable across the swap.
 */

import { Idea } from '../../lib/stuff/Idea';
import { ScriptApi, type CompiledSandbox } from '../../api/script';
import type { Stuff } from '../../lib/stuff/Stuff';
import { SecurityApi } from '../../api/security';
import { MudlogApi } from '../../api/mudlog';
import { Mml } from '../../api/mml';
import type { FieldMeta } from '../../lib/mixin';

/** A rejection the eval'd code did not hold, caught by the net. */
export interface EvalLateError {
  readonly api: string;
  readonly name: string;
  readonly message: string;
}

/** What one invocation produced. */
export interface EvalOutcome {
  readonly value: unknown;
  /** Rejections dropped by the code, landed before the result. */
  readonly late: readonly EvalLateError[];
}

/** One invocation's record: the net writes here. */
interface EvalRun {
  late: EvalLateError[];
  reported: boolean;
  label: string;
  /** Wall-clock ms past which every facade call refuses. */
  deadline: number;
  budget: number;
}

const STATIC_SKIP = new Set(['length', 'name', 'prototype']);

/**
 * The name an Api is bound under: its class name. ⚠ With the leading
 * underscores stripped — the TS transform renames a class whose body
 * refers to its own binding (`StuffApi` runs as `_StuffApi`), and the
 * name an author types is the one in the source.
 */
function apiName(cls: object): string {
  return ((cls as { name?: string }).name ?? '').replace(/^_+/, '');
}

/**
 * Wrap a facade function so a promise it returns is HELD: the original
 * promise goes back to the caller unchanged (an awaiting caller still
 * sees the rejection), and a rejection nobody awaited lands on `run`
 * instead of on the process.
 */
function observed(
  fn: (...args: unknown[]) => unknown,
  api: string,
  name: string,
  run: EvalRun,
): (...args: unknown[]) => unknown {
  return (...args: unknown[]) => {
    // ⭐ Past the budget, the world refuses the eval: an awaited tail
    // runs on the host's queue where V8's `timeout` cannot reach, so a
    // runaway that keeps calling Apis is stopped HERE.
    if (Date.now() > run.deadline) {
      throw new Error(
        `eval: timed out after ${run.budget} ms (eval.timeoutMs) — ` +
          `${api}.${name} refused past the deadline`,
      );
    }
    const out = fn(...args);
    const then = (out as { then?: unknown } | null)?.then;
    if (out !== null && typeof then === 'function') {
      (out as Promise<unknown>).then(undefined, (err: unknown) => {
        const message = (err as Error | null)?.message ?? String(err);
        if (!run.reported) {
          run.late.push({ api, name, message });
          return;
        }
        // Landed after the result was reported: never silent, never fatal
        // — and this handler must not throw, or ITS promise is the next
        // unhandled rejection.
        const line = `${run.label}: ${api}.${name} — ${message}`;
        try {
          MudlogApi.warn('sandbox.eval.late', Mml.text(line));
        } catch {
          console.warn(`[sandbox.eval.late] ${line}`);
        }
      });
    }
    return out;
  };
}

/** The pointer stub for a `@TestOnly` static: eval does not bind seams. */
function testSeamStub(api: string, name: string, guidance: string): () => never {
  return () => {
    throw new Error(
      `${api}.${name} is a test seam (@TestOnly) and eval does not bind it. ` +
        guidance,
    );
  };
}

/** A frozen facade of `cls`'s own statics, bound to `cls`, netted. */
function facadeOf(cls: object, run: EvalRun): Readonly<Record<string, unknown>> {
  const api = apiName(cls) || '?';
  const seams = SecurityApi.getTestOnlyMembers(cls);
  const out: Record<string, unknown> = {};
  for (const name of Object.getOwnPropertyNames(cls)) {
    if (STATIC_SKIP.has(name)) continue;
    const d = Object.getOwnPropertyDescriptor(cls, name);
    if (!d || !('value' in d)) continue; // accessors are not surface
    const guidance = seams?.get(name);
    if (guidance !== undefined) {
      out[name] = testSeamStub(api, name, guidance);
    } else if (typeof d.value === 'function') {
      // `bind(cls)` keeps `this === cls` through the security wrapper, so
      // an Api's `#`-static fields keep working.
      out[name] = observed(
        (d.value as (...a: unknown[]) => unknown).bind(cls),
        api,
        name,
        run,
      );
    } else {
      out[name] = d.value;
    }
  }
  return Object.freeze(out);
}

/**
 * Bind the sandbox names to actual values for one execution. Returns a
 * plain object; turning it into a real context is `ScriptApi`'s job (the
 * `vm` capability lives in the Api tier). Deciding *what goes in it* is
 * this file's job, and stays here. Built per invocation, because the net
 * writes to THIS run's record.
 */
function buildSandbox(receiver: Stuff, run: EvalRun): Record<string, unknown> {
  const sandbox: Record<string, unknown> = {};
  for (const cls of SecurityApi.decoratedApiClasses()) {
    const name = apiName(cls);
    if (name) sandbox[name] = facadeOf(cls, run);
  }
  sandbox.console = console;
  // The eval'd script's `this` binding — the `--on` target (or the
  // avatar by default). Exposed both as a bare `this` (via the outer
  // wrapper's `.call`) and as a named binding.
  sandbox.self = receiver;
  sandbox.target = receiver;
  return sandbox;
}

export default class EvalScript extends Idea {
  /** `eval.timeoutMs`'s default: the wall-clock budget of one invocation. */
  public static readonly DEFAULT_TIMEOUT_MS = 5_000;

  /**
   * The current code body. Set via `setCode`; read indirectly via
   * `run`. Public so the applier (if `--save` lands later) can
   * reflect into it; reads from outside this class go through
   * `run()`.
   */
  public code: string = '';

  /**
   * Compiled script handle, opaque by design (see
   * {@link CompiledSandbox}). Implementation-private; rebuilt when
   * `code` changes (`setCode` clears it). Cleared eagerly so the
   * `isolated-vm` migration can swap to a different compiled form
   * without touching callers.
   */
  private _compiled: CompiledSandbox | null = null;

  static fieldMeta: FieldMeta = {
    code: { persistent: true },
  };

  public setCode(code: string): void {
    this.code = code;
    this._compiled = null;
  }

  public getCode(): string {
    return this.code;
  }

  /**
   * Run the eval'd code with `this` bound to `receiver`; the value.
   * See {@link runReporting}.
   */
  public async run(
    receiver: Stuff,
    opts?: { timeoutMs?: number },
  ): Promise<unknown> {
    return (await this.runReporting(receiver, opts)).value;
  }

  /**
   * Run the eval'd code with `this` bound to `receiver`, and report the
   * value with any rejection the code dropped.
   *
   * ⭐ The body is an ASYNC function, so `await` is legal in an eval;
   * and a body that is one EXPRESSION returns it (`eval 1 + 1` → 2) —
   * a body of statements returns what it `return`s. `opts.timeoutMs`
   * bounds the whole invocation, the awaited tail included.
   */
  public async runReporting(
    receiver: Stuff,
    opts?: { timeoutMs?: number },
  ): Promise<EvalOutcome> {
    if (this.code.length === 0) {
      throw new Error('EvalScript.run(): no code to evaluate');
    }
    if (this._compiled === null) {
      // An expression returns itself; anything that does not parse as
      // one is a body of statements. The `.call(self)` is the minimal
      // binding glue that `isolated-vm` will replace.
      try {
        this._compiled = ScriptApi.compileSandboxed(
          `(async function(){ return (\n${this.code.replace(/;\s*$/, '')}\n); }).call(self)`,
        );
      } catch {
        this._compiled = ScriptApi.compileSandboxed(
          `(async function(){ ${this.code}\n }).call(self)`,
        );
      }
    }
    const budget = opts?.timeoutMs ?? EvalScript.DEFAULT_TIMEOUT_MS;
    const run: EvalRun = {
      late: [],
      reported: false,
      label: `eval at ${this.getTemplatePath() ?? '?'}`,
      deadline: Date.now() + budget,
      budget,
    };
    try {
      const value = await ScriptApi.runSandboxed(
        this._compiled,
        buildSandbox(receiver, run),
        { timeoutMs: budget },
      );
      return { value, late: [...run.late] };
    } finally {
      run.reported = true;
    }
  }
}
