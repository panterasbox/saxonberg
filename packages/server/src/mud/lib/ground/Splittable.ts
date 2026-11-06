/**
 * SplittableMixin — the `split` protocol (`_mixinKind = 'protocol'`,
 * controllers-are-io D8a).
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Tooled } from '../craft/Tool';
import type { Workable, WorkPrognosis, WorkResult } from './Workable';

/**
 * ⭐ **A thing too big or too aggregated to use, and dividing it.**
 *
 * Named because the pattern already had a second member before this build:
 * `fell bole` cross-cuts a felled trunk a length at a time under a verb
 * that means something else, as its own view admits (*"Fell a standard with
 * an axe, or cross-cut a felled one"*). A `Stackable` is the third
 * candidate. So the mandate is deliberately wider than stone:
 *
 * > **divide an oversized or aggregated thing into usable units.**
 */
export type Splittable = Workable;

/**
 * ⭐ **`SplittableMixin` — the split protocol, as a mixin.** It shipped as a
 * bare shape with a `splittable: true` marker the controller probed; three
 * implementers in three packs (a hive, a cheese wheel, a quarried block)
 * earned it a mixin, and `split` asks `MixinApi.isSplittable`.
 *
 * IS: a thing too big or too aggregated to use that comes apart into
 * usable units, a piece per act. IS NOT: ground you turn over (`dig` —
 * the working's own), nor a stack you count off (`Stackable` splits by
 * number, with no act).
 *
 * ⚠ The default REFUSES in the thing's words; a host overrides both halves.
 */
export function SplittableMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class SplittableMixin extends Base implements Splittable {
    static _mixinName: string = 'SplittableMixin';
    static _mixinKind = 'protocol' as const;

    /** @hook What one piece would be, or why not; the default refuses. */
    public async planWork(
      _by: Stuff,
      _tool: (Stuff & Tooled) | null,
      _what: string | null,
    ): Promise<WorkPrognosis> {
      return {
        kind: 'refusal',
        reason: 'not-splittable',
        prose: `${(this as unknown as Stuff).getPresentation()} does not come apart like that.`,
      };
    }

    /** @hook Land the planned piece; never reached without a plan. */
    public async completeWork(
      _by: Stuff,
      _tool: (Stuff & Tooled) | null,
      _token: unknown,
    ): Promise<WorkResult> {
      throw new Error(
        `SplittableMixin.completeWork: ${(this as unknown as Stuff).stuffId} planned no piece to land`,
      );
    }
  };
}
