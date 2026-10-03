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
 * docs/architecture.md § The import boundary). What this file still
 * owns is the part that matters for review: `SANDBOX_NAMES` and the
 * `self`/`target` bindings ARE the sandbox surface.
 * Not the security boundary (that's `@CallSecurity` on whatever Apis
 * the eval'd code touches), but the moat that prevents trivially
 * reaching `process` / `require` / `globalThis`.
 *
 * Migration target: `isolated-vm` for real V8-isolate sandboxing. The
 * public surface (`setCode`, async `run`) is designed to stay stable
 * across the swap; only internals change.
 */

import { Idea } from '../../lib/stuff/Idea';
import { ScriptApi, type CompiledSandbox } from '../../api/script';
import type { Stuff } from '../../lib/stuff/Stuff';
import { StuffApi } from '../../api/stuff';
import { MqlApi } from '../../api/mql';
import { ContainmentApi } from '../../api/containment';
import { MixinApi } from '../../api/mixin';
import type { FieldMeta } from '../../lib/mixin';

/**
 * The list of identifiers exposed inside the sandbox context. A list
 * — not a literal object — so the migration to `isolated-vm` only
 * touches the binding plumbing, not the curation choice. Anything not
 * on this list is unreachable from inside eval'd code.
 *
 * Start narrow: enough to do useful authoring (`StuffApi`, `MqlApi`,
 * `ContainmentApi`, `MixinApi`), with `console` for output. Tighten
 * or expand based on what playtesting actually wants.
 *
 * ⛔⛔⛔ **`WorldClockApi` IS NOT HERE, and the story of why is worth the
 * paragraph.**
 *
 * The taps build added it so a drive could skip a season, then spent
 * three review rounds learning that it was wrong three different ways:
 *
 *  1. ⚠⚠ **The justification was fabricated.** The first version of this
 *     comment claimed *"`setScale` was always reachable from here;
 *     `advance` is the same authority stated honestly."* It was not —
 *     before that binding **nothing in the sandbox could touch the clock
 *     at all**, and the only reference to `setScale` outside the clock's
 *     own files was that sentence asserting it. A premise stated once
 *     and then cited.
 *  2. ⛔ **It was a category error.** A clock jump is *scaffolding*, not
 *     a capability: nothing in the game moves the realm's clock, and
 *     binding it here made the fiction owe an explanation for a player
 *     who can skip a month.
 *  3. ⛔ **And it could never have worked.** An `eval` always runs inside
 *     a sandbox boundary — a quarantined circle (`/home/<player>`, the
 *     default) or a parcel-bound jurisdiction (`--parcel`) — and a jump
 *     of GLOBAL time is precisely the thing a bounded context must not
 *     do. The quarantined route is refused by
 *     `WorldClockRegistry.assertNotQuarantined`; the governed route dies
 *     on the jurisdiction boundary when the drain creates a Stuff
 *     outside the extent. ⚠ Both failed SILENTLY (no note, no matching
 *     prose) while the drive reported 15/15.
 *
 * ⭐ The clock now lives where scaffolding belongs:
 * `backend/TestHooks.advanceClock` behind `POST /auth/test-clock`, a
 * route mounted only when `AUTH_MODE === 'test'`, called by the harness
 * from OUTSIDE the fiction — where a root frame carries no scope and no
 * jurisdiction, which is exactly what a global jump needs.
 *
 * ⭐ So nothing in-world can read or move the clock through this list at
 * all, which is the containment the build should have started with.
 * `shutdown` keeps its `SystemRoot` gate; `assertNotQuarantined` stays
 * on every mutator for the callers that are not this list (a
 * circle-born schedule's callback re-roots under its birth scope).
 */
const SANDBOX_NAMES = [
  'StuffApi',
  'MqlApi',
  'ContainmentApi',
  'MixinApi',
  'console',
] as const;

/**
 * Bind the sandbox names to actual values for one execution. Returns a
 * plain object; turning it into a real context is `ScriptApi`'s job (the
 * `vm` capability lives in the Api tier). Deciding *what goes in it* is
 * this file's job, and stays here. Pulled out so the `isolated-vm`
 * migration replaces only this function and its Api counterpart.
 */
function buildSandbox(receiver: Stuff): Record<string, unknown> {
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
  return sandbox;
}

export default class EvalScript extends Idea {
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
      this._compiled = ScriptApi.compileSandboxed(wrapped);
    }
    return ScriptApi.runSandboxed(this._compiled, buildSandbox(receiver));
  }
}
