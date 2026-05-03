/**
 * Shadow — runtime per-instance behaviour modification.
 *
 * Shadows are the call-security framework's answer to LPMUD-style
 * function shadowing: attach a Shadow to a host Stuff and the host's
 * intercepted methods run through the shadow's chain instead of (or
 * before, around, after) the host's own implementations.
 *
 * Top-level Stuff branch alongside `Idea` and `Agent`. Shadows ARE
 * Stuff: they have stuffIds, can be cloned from templates, persist
 * via the standard Hydrator pipeline. The attachment relationship
 * itself does NOT persist (deferred to Tier 5).
 *
 * Authoring shape — composition declares the surface:
 *
 * ```ts
 * class RenamedShadow extends NamedMixin(Shadow) {}
 * // Intercepts every NamedMixin method on the host. Defaults run
 * // against the shadow's own state (firstName, lastName, fullName).
 *
 * class LiarShadow extends NamedMixin(Shadow) {
 *   override get firstName() { return 'Bob'; }
 * }
 *
 * class TraceShadow extends Shadow {
 *   @Shadowing
 *   addXp(amount: number) {
 *     console.log(`addXp(${amount})`);
 *     return this.callDown(amount);
 *   }
 * }
 * ```
 *
 * Inside a shadow's intercepting method:
 *   - `this.callDown(...args)` invokes the next layer down (next
 *     shadow in the stack, or the host's original method if at the
 *     bottom). Args are explicit: pass exactly what you want the
 *     next layer to see.
 *   - `this.callBypass(methodName, ...args)` runs the host's
 *     unmediated original method, skipping every shadow including
 *     this one. Privileged escape hatch for internal lifecycle
 *     work; rarely needed.
 *
 * Reference discipline: the host link lives in framework-private
 * WeakMaps inside `ShadowApi`. The `host` getter on this class
 * reads through that map; there is no setter — user code cannot
 * write the field. Same for `interceptedMethods`. See ShadowApi
 * for the full mechanics.
 */

import { Stuff } from './Stuff';
import { ShadowApi } from '../../api/shadow';

/**
 * Abstract base. Subclasses MUST be created via `StuffApi.create(() =>
 * new MyShadow())` or `StuffApi.clone(...)` like any other Stuff —
 * the construction sentinel rejects raw `new`.
 */
export abstract class Shadow extends Stuff {
  /**
   * The single host this shadow is attached to, or null if
   * unattached. Read-only; the framework owns the binding.
   */
  public get host(): Stuff | null {
    return ShadowApi._hostOf(this);
  }

  /**
   * The set of host method names this shadow currently intercepts.
   * Computed at attach time by the inferred-surface walk; immutable
   * for the duration of attachment. Read-only.
   */
  public get interceptedMethods(): ReadonlySet<string> {
    return ShadowApi._methodsOf(this);
  }

  /**
   * Invoke the next thing down the dispatch stack — either the next
   * shadow's same-named method, or the host's original method when
   * this shadow is at the bottom of the chain.
   *
   * Args are explicit. `callDown(...args)` re-uses the args this
   * method was called with; `callDown(modifiedArg)` substitutes.
   *
   * Throws `ShadowError` when called outside of an active dispatch.
   */
  protected callDown<T = unknown>(...args: unknown[]): T {
    return ShadowApi._callDown(this, args) as T;
  }

  /**
   * Run a method on this shadow's host bypassing ALL shadows,
   * including this one. Privileged primitive for internal lifecycle
   * work where the shadow needs the unmediated value.
   *
   * Throws `ShadowError` if `this.host` is null.
   */
  protected callBypass<T = unknown>(method: string, ...args: unknown[]): T {
    return ShadowApi._callBypass(this, method, args) as T;
  }
}
