/**
 * ForkableMixin — the fork/merge substrate, the persistence spine's
 * runtime sibling (docs/subsystems/sandbox.md, Decision Q).
 *
 * A host that can PROJECT into another body (the sandbox wire body
 * today; polymorph / possession later) composes this. State travels by
 * an explicit per-mixin protocol, never by hand-copied fields:
 *
 *   - a composed layer that wants state carried into a fork implements
 *     **`forkSlice_<Name>(): unknown`** (its slice, runtime values);
 *   - what it accepts back implements **`mergeSlice_<Name>(slice)`**.
 *
 * Discovery is by method-name convention over the prototype chain (the
 * `getAllPersistentFields` shape): a layer that implements neither
 * contributes nothing — the safe default. Policy is the CALLER's, not
 * the slice's: `forkStateTo` is permissive (a slice travels if its
 * layer offers one and the target accepts it); `mergeStateFrom` is
 * **allowlisted by the consumer** — for the sandbox the merge allowlist
 * is epistemic-only, which is the discard doctrine expressed as a list.
 * Material slices simply have no merge path back; there is no "trusted
 * mixin" escape.
 *
 * Shadows get an opt-in follow: a shadow implementing
 * **`describeFork(): (() => Shadow) | null`** returns a factory for a
 * fresh instance of itself; the FRAMEWORK constructs it (inside the
 * consumer's context, so a circle fork's follower is circle-stamped and
 * dies with the vessel) and attaches it **to the fork, and only to the
 * fork** — the shadow never names its own target. Silent shadows stay
 * dropped.
 *
 * Scope discipline: a substrate with one consumer today (the sandbox
 * crossing). Slices are RUNTIME state only — never a persistence route;
 * durable state stays PM's business under the policy table.
 */

import type { Stuff } from '../stuff/Stuff';
import { Mixins, type MixinConstructor } from '../mixin';

const FORK_PREFIX = 'forkSlice_';
const MERGE_PREFIX = 'mergeSlice_';

/** Collect every fork/merge slice method name on `host`'s chain. */
function sliceNames(host: object, prefix: string): string[] {
  const names = new Set<string>();
  let proto: unknown = Object.getPrototypeOf(host);
  while (proto && proto !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key.startsWith(prefix)) names.add(key.slice(prefix.length));
    }
    proto = Object.getPrototypeOf(proto);
  }
  return [...names];
}

export function ForkableMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase
) {
  return class ForkableMixin extends Base {
    static _mixinName = Mixins.Forkable;

    /**
     * Read every offered slice off this host, keyed by slice name.
     * Runtime values only; the caller applies them to a fork via
     * {@link applyForkedState}.
     */
    public collectForkSlices(): Record<string, unknown> {
      const out: Record<string, unknown> = {};
      const self = this as unknown as Record<string, unknown>;
      for (const name of sliceNames(this, FORK_PREFIX)) {
        const fn = self[FORK_PREFIX + name];
        if (typeof fn !== 'function') continue;
        const slice = (fn as () => unknown).call(this);
        if (slice !== undefined) out[name] = slice;
      }
      return out;
    }

    /**
     * Apply `slices` onto this host (the fork at mint, or the source at
     * rejoin). `allowlist` — when given — names the only slices applied
     * (the consumer's merge policy); omitted = permissive (the mint
     * direction).
     */
    public applyForkedState(
      slices: Record<string, unknown>,
      allowlist?: readonly string[]
    ): void {
      const self = this as unknown as Record<string, unknown>;
      for (const [name, slice] of Object.entries(slices)) {
        if (allowlist && !allowlist.includes(name)) continue;
        const fn = self[MERGE_PREFIX + name];
        if (typeof fn !== 'function') continue;
        (fn as (s: unknown) => void).call(this, slice);
      }
    }
  };
}

export type Forkable = InstanceType<ReturnType<typeof ForkableMixin>> & Stuff;
