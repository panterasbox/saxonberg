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
 *
 * ## ⭐ Run ONCE, at birth — `populates` is initial furnishing
 *
 * The applier no-ops once `_populated` is set. This is load-bearing, not
 * hygiene: `TemplateApi.restoreFromTemplate` — the CMS save go-live and
 * the pack reconcile go-live — re-runs the FULL `hydrate`, which
 * re-dispatches every instruction applier. Without the guard, editing a
 * `populates` row and publishing minted a fresh set into every live
 * instance: every crate in the world gaining six more grapefruits, every
 * non-singleton fixture in a plain room duplicated. A content edit is not
 * a faucet.
 *
 * ⚠ Deliberately **not** count-aware ("top up to the declared list").
 * The same mechanism serves a room's fixtures, which are meant to be
 * permanent, and a crate's contents, which are meant to be CONSUMED —
 * so "declared minus present" would resurrect goods somebody drank, ate
 * or sold. That is the faucet the libations build spent its whole
 * length removing from the bar.
 *
 * An author who edits the list and wants it applied **re-clones**; there
 * are no migrations. Singletons were already safe via the
 * `getContainer() !== null` skip; this covers the plain-clone branch,
 * and it makes `Persistable.seedBornWith` idempotent for free.
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
   *
   *   ⭐ Runs **once per instance**: a no-op once this host has been
   *   populated, so a go-live re-hydrate does not mint a second set.
   *   See the class docstring.
   */
  applyPopulates(specs: PopulateSpec[]): Promise<void>;

  /** Whether this host has already laid down its born-with contents. */
  hasPopulated(): boolean;

  /** Storage for {@link Populates.hasPopulated} (public for the Hydrator). */
  _populated: boolean;
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
      // Runtime state, never authored: set by the applier itself so a
      // go-live re-hydrate cannot mint a second set. Persistent so the
      // fact survives a capture/restore round trip.
      _populated: { persistent: true, runtimeState: true },
    };

    /** True once this host has laid down its born-with contents. */
    public _populated: boolean = false;

    public hasPopulated(): boolean {
      return this._populated;
    }

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
      // ⭐ Initial furnishing, once. `restoreFromTemplate` re-runs the
      // whole hydrate on go-live; without this, publishing an edit to a
      // `populates:` row mints a fresh set into every live instance.
      if (this._populated) return;
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
      // Set after a successful run: a throw mid-list is a content bug
      // that aborts the clone, and leaving the flag clear keeps the
      // half-populated shell out of the "already done" state.
      this._populated = true;
    }
  };
}
