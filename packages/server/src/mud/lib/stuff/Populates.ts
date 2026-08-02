/**
 * PopulatesMixin — declarative content-spawn for Container hosts.
 *
 * Composes onto `Container` (`Stuff & Container`). Declares
 * `static instructionFields = ['populates']` and exposes
 * `applyPopulates(specs: string[]): Promise<void>` — Phase 2 of the
 * Hydrator's two-phase dispatch invokes the applier with the YAML-
 * declared `populates: [path, ...]` list.
 *
 * For each entry, the applier dispatches by the source template's
 * class:
 *
 *   - Singleton-shaped (composes `SingletonMixin`):
 *     `StuffApi.singleton(path)` returns the unique instance; if
 *     the instance is already placed somewhere
 *     (`getContainer() !== null`), the move is skipped — the
 *     singleton lives wherever it was first placed (its own
 *     `applyContainer`, another `populates:` parent, player action).
 *   - Non-singleton: `StuffApi.clone(path)` mints a fresh instance,
 *     unconditionally moved into self via `ContainmentApi.move`.
 *
 * Cycle protection: inherited from `StuffApi.clone`'s existing
 * in-flight-clone-paths guard. A populates → populates cycle
 * surfaces a clear diagnostic naming the path chain.
 *
 * v1 spec entries are bare path strings. Richer shapes
 * (`{ template, count }`, conditional spawns) are out of scope; see
 * `docs/slates/declarative-content-slate.md` § Future.
 *
 * `populates` is an instruction field (consumed by `applyPopulates`
 * to produce runtime placements). There is NO paired `getPopulates()`
 * accessor on the runtime instance — the spec is discarded after
 * Phase 2.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from './Stuff';
import type { Container } from '../spatial/Container';
import type { Containable } from '../spatial/Containable';
import { Mixins } from '../mixin';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { ContainmentApi } from '../../api/containment';

/**
 * One `populates` entry. A bare path string moves the spawned instance
 * **into** self (containment); the object form places it **on** a surface —
 * `onto` names another entry's path (a `Surfaced` host) that must appear
 * **earlier** in the list (so it's already populated). The surface itself is
 * populated by a bare-string entry first; its resting items follow with
 * `onto` pointing at it.
 */
export type PopulateSpec = string | { template: string; onto: string };

/**
 * Public shape provided by PopulatesMixin.
 *
 * The applier is the only public surface. The spec is consumed
 * during Phase 2 hydration and not retained.
 */
export interface Populates {
  /**
   * @hook Invoked by the `Hydrator`'s Phase-2 instruction dispatch from
   *   a template's `populates` field. **Instruction applier** — consumes
   *   the spec during hydration to spawn/populate; the spec is not
   *   retained and there is no paired getter (not a property).
   */
  applyPopulates(specs: PopulateSpec[]): Promise<void>;
}

export function PopulatesMixin<
  TBase extends MixinConstructor<Stuff & Container>,
>(Base: TBase) {
  return class PopulatesMixin extends Base {
    static _mixinName = 'PopulatesMixin';

    /**
     * Instruction field consumed by `applyPopulates`. The YAML data
     * is an array of templatePath strings; Phase 2 dispatches by
     * source-template singleton-shape and moves the resulting
     * instance into self.
     */
    static fieldMeta: FieldMeta = {
      populates: { instruction: true, authorable: true },
    };

    /**
     * Phase 2 applier. See class docstring for dispatch semantics.
     *
     * Class resolution goes through `StuffApi.loadClassByPath` — the
     * existing public class-loading Api surface. The Template lookup
     * is a separate `Template.findByPath` call so we have `tpl.class`
     * to feed into `loadClassByPath`.
     */
    async applyPopulates(specs: PopulateSpec[]): Promise<void> {
      if (!Array.isArray(specs)) return;
      // Lazy import to dodge any cycle through Stuff.
      const { Template } = await import('./Template');
      // Track populated instances by source path so a later `onto` entry can
      // resolve the surface populated earlier in the list.
      const placed = new Map<string, Stuff & Containable>();
      for (const spec of specs) {
        const path = typeof spec === 'string' ? spec : spec?.template;
        if (typeof path !== 'string' || path.length === 0) continue;
        const onto = typeof spec === 'string' ? undefined : spec.onto;
        const tpl = await Template.findByPath(path);
        if (!tpl) {
          throw new Error(
            `PopulatesMixin.applyPopulates: no template at '${path}'`
          );
        }
        const cls = (await StuffApi.loadClassByPath(tpl.class)) as new (
          ...args: unknown[]
        ) => Stuff;
        const singleton = MixinApi.hasMixin(cls, Mixins.Singleton);
        let inst: Stuff & Containable;
        if (singleton) {
          inst = await StuffApi.singleton<Stuff & Containable>(path);
          // A move-into-self singleton already placed elsewhere is left be;
          // an `onto` placement always (re)stamps the resting relation.
          if (inst.getContainer() !== null && !onto) continue;
        } else {
          inst = await StuffApi.clone<Stuff & Containable>(path);
        }
        if (onto) {
          const surface = placed.get(onto);
          if (!surface) {
            throw new Error(
              `PopulatesMixin.applyPopulates: '${path}' onto '${onto}' — ` +
                `the surface must be populated earlier in the list`
            );
          }
          if (!MixinApi.isSurfaced(surface)) {
            throw new Error(
              `PopulatesMixin.applyPopulates: onto '${onto}' is not a Surfaced host`
            );
          }
          ContainmentApi.placeOn(inst, surface);
        } else {
          ContainmentApi.move(inst, this as unknown as Stuff & Container);
        }
        placed.set(path, inst);
      }
    }
  };
}
