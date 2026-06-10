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
 * Sandbox: Node's built-in `vm` module (`vm.Script` + `vm.createContext`).
 * Not the security boundary (that's `@CallSecurity` on whatever Apis
 * the eval'd code touches), but the moat that prevents trivially
 * reaching `process` / `require` / `globalThis`.
 *
 * Migration target: `isolated-vm` for real V8-isolate sandboxing. The
 * public surface (`setCode`, async `run`) is designed to stay stable
 * across the swap; only internals change.
 */

import { Idea } from '../stuff/Idea';
import { Script, createContext, type Context } from 'node:vm';
import type { Stuff } from '../stuff/Stuff';
import { StuffApi } from '../../api/stuff';
import { MqlApi } from '../../api/mql';
import { ContainmentApi } from '../../api/containment';
import { MixinApi } from '../../api/mixin';

/**
 * The list of identifiers exposed inside the sandbox context. A list
 * — not a literal object — so the migration to `isolated-vm` only
 * touches the binding plumbing, not the curation choice. Anything not
 * on this list is unreachable from inside eval'd code.
 *
 * Start narrow: enough to do useful authoring (`StuffApi`, `MqlApi`,
 * `ContainmentApi`, `MixinApi`), with `console` for output. Tighten
 * or expand based on what playtesting actually wants.
 */
const SANDBOX_NAMES = [
  'StuffApi',
  'MqlApi',
  'ContainmentApi',
  'MixinApi',
  'console',
] as const;

/**
 * Bind the sandbox names to actual values for one execution. Used
 * by `run()` to assemble the per-call context. Pulled out so the
 * `isolated-vm` migration replaces only this function.
 */
function buildSandboxContext(receiver: Stuff): Context {
  const sandbox: Record<string, unknown> = {
    StuffApi,
    MqlApi,
    ContainmentApi,
    MixinApi,
    console,
    // The eval'd script's `this` binding — the `--on` target (or the
    // avatar by default). Exposed both as a bare `this` (via the
    // outer wrapper's `.call`) and as a named binding so eval'd
    // code that wants the receiver explicitly without `this` can
    // reach it.
    self: receiver,
    target: receiver,
  };
  // Defensively strip anything not on the allowlist before context
  // creation. The list IS the contract; programmers reading this
  // file should look at SANDBOX_NAMES + the `self`/`target` carve-
  // outs to see the full surface.
  for (const k of Object.keys(sandbox)) {
    if (k === 'self' || k === 'target') continue;
    if (!(SANDBOX_NAMES as readonly string[]).includes(k)) {
      delete sandbox[k];
    }
  }
  return createContext(sandbox);
}

export default class EvalScript extends Idea {
  /**
   * The current code body. Set via `setCode`; read indirectly via
   * `run`. Public so the Hydrator (if `--save` lands later) can
   * reflect into it; reads from outside this class go through
   * `run()`.
   */
  public code: string = '';

  /**
   * Compiled `vm.Script`. Implementation-private; rebuilt when
   * `code` changes (`setCode` clears it). Cleared eagerly so the
   * `isolated-vm` migration can swap to a different compiled form
   * without touching callers.
   */
  private _compiled: Script | null = null;

  static persistentFields: string[] = ['code'];

  public setCode(code: string): void {
    this.code = code;
    this._compiled = null;
  }

  public getCode(): string {
    return this.code;
  }

  /**
   * Run the eval'd code with `this` bound to `receiver`.
   *
   * Async-by-default — `vm.runInContext` itself is sync, but the
   * future `isolated-vm` backend returns thenables. Keeping the
   * surface async means callers don't have to be re-touched on
   * swap.
   */
  public async run(receiver: Stuff): Promise<unknown> {
    if (this.code.length === 0) {
      throw new Error('EvalScript.run(): no code to evaluate');
    }
    if (this._compiled === null) {
      // Wrap in an arrow so the body sees `this === receiver` without
      // needing the eval'd code to handle the wrapper themselves.
      // The `(function(){ return ... }).call(self)` shape is the
      // minimal binding glue that `isolated-vm` will replace with
      // its own per-isolate function-call wrapper.
      const wrapped = `(function(){ ${this.code} }).call(self)`;
      this._compiled = new Script(wrapped);
    }
    const ctx = buildSandboxContext(receiver);
    return this._compiled.runInContext(ctx);
  }
}
