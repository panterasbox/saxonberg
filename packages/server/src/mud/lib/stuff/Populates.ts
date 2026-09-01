/**
 * PopulatesMixin — declarative born-with content for Container hosts,
 * in the theatre vocabulary: **props** and **cast**.
 *
 * Composes onto `Container` (`Stuff & Container`) and declares two
 * instruction fields, applied by Phase 2 of the Hydrator's two-phase
 * dispatch:
 *
 *   - **`props:`** — the set dressing: fixtures, stock, furniture,
 *     anything inanimate the host is born holding. Props are ordinary
 *     content — on a persistable host they are CAPTURED and written
 *     back (a barrel a player half-drained stays half-drained).
 *     A `Behaved`-composing class may never be a prop; the applier
 *     throws before cloning one (list it under `cast:`).
 *   - **`cast:`** — the troupe: `Behaved` NPCs staffing the host. Cast
 *     is never content — never captured into a persistence record
 *     (capture's third skip), conserved-live and re-seeded on restore
 *     by `Persistable.reseedCast`. A non-`Behaved` class may never be
 *     cast; the applier throws before cloning one (an inert dummy is a
 *     prop).
 *
 * The designation is DECLARED, and the class is the check: each applier
 * resolves the entry's template class and gates on `Mixins.Behaved`
 * before minting, so a mis-filed entry is an authoring error at
 * hydrate, not a latent lifecycle bug.
 *
 * For each entry, the applier dispatches by the source template's
 * class:
 *
 *   - Singleton-shaped (composes `SingletonMixin`):
 *     `StuffApi.singleton(path)` returns the unique instance; if
 *     the instance is already placed somewhere
 *     (`getContainer() !== null`), the move is skipped — the
 *     singleton lives wherever it was first placed (its own
 *     `applyContainer`, another host's list, player action).
 *   - Non-singleton: `StuffApi.clone(path)` mints a fresh instance,
 *     unconditionally moved into self via `ContainmentApi.move`.
 *
 * Cycle protection: inherited from `StuffApi.clone`'s existing
 * in-flight-clone-paths guard. A props → props cycle surfaces a clear
 * diagnostic naming the path chain.
 *
 * `props` and `cast` are instruction fields (consumed by `applyProps` /
 * `applyCast` to produce runtime placements). There are NO paired
 * getters on the runtime instance — the specs are discarded after
 * Phase 2 (except on a persistable host, whose override retains them
 * for the establishing context — see `Persistable`).
 *
 * ## ⭐ Run ONCE, at birth — props and cast are initial furnishing
 *
 * Each applier no-ops once its flag is set. This is load-bearing, not
 * hygiene: `TemplateApi.restoreFromTemplate` — the CMS save go-live and
 * the pack reconcile go-live — re-runs the FULL `hydrate`, which
 * re-dispatches every instruction applier. Without the guard, editing a
 * `props` row and publishing minted a fresh set into every live
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
 * One `props` entry. A bare path string moves the spawned instance
 * **into** self (containment); the object form places it **on** a surface —
 * `onto` names another entry's path (a `Surfaced` host) that must appear
 * **earlier** in the list (so it's already populated). The surface itself is
 * populated by a bare-string entry first; its resting items follow with
 * `onto` pointing at it.
 *
 * A `cast` entry is a bare path string only — the troupe stands in the
 * room; it does not rest on furniture.
 */
export type PopulateSpec = string | { template: string; onto: string };

/**
 * Public shape provided by PopulatesMixin.
 *
 * The appliers are the only public surface. The specs are consumed
 * during Phase 2 hydration and not retained.
 */
export interface Populates {
  /**
   * @hook Invoked by the `Hydrator`'s Phase-2 instruction dispatch from
   *   a template's `props` field. **Instruction applier** — consumes
   *   the spec during hydration to spawn the host's born-with props;
   *   the spec is not retained and there is no paired getter (not a
   *   property). Throws on an entry whose class composes `Behaved`
   *   (that is cast, not props).
   *
   *   ⭐ Runs **once per instance**: a no-op once this host's props are
   *   laid, so a go-live re-hydrate does not mint a second set.
   *   See the class docstring.
   */
  applyProps(specs: PopulateSpec[]): Promise<void>;

  /**
   * @hook Invoked by the `Hydrator`'s Phase-2 instruction dispatch from
   *   a template's `cast` field. **Instruction applier** — mints the
   *   host's troupe. Throws on an entry whose class does NOT compose
   *   `Behaved` (that is a prop, not cast).
   *
   *   ⭐ Runs **once per instance**, same guard discipline as
   *   {@link Populates.applyProps}.
   */
  applyCast(specs: string[]): Promise<void>;

  /** Whether this host has already laid down its born-with contents
   * (props, cast, or both). */
  hasPopulated(): boolean;

  /** Storage for the props once-guard (public for the Hydrator). */
  _propsPopulated: boolean;

  /** Storage for the cast once-guard (public for the Hydrator). */
  _castPopulated: boolean;
}

export function PopulatesMixin<
  TBase extends MixinConstructor<Stuff & Container>,
>(Base: TBase) {
  return class PopulatesMixin extends Base {
    static _mixinName = 'PopulatesMixin';

    /**
     * Two instruction fields, one per designation. The YAML data is an
     * array of specs; Phase 2 dispatches by source-template
     * singleton-shape and moves the resulting instance into self.
     * The once-flags are runtime state, never authored: set by the
     * appliers themselves so a go-live re-hydrate cannot mint a second
     * set. Persistent so the fact survives a capture/restore round trip.
     */
    static fieldMeta: FieldMeta = {
      props: { instruction: true, authorable: true },
      cast: { instruction: true, authorable: true },
      _propsPopulated: { persistent: true, runtimeState: true },
      _castPopulated: { persistent: true, runtimeState: true },
    };

    public _propsPopulated: boolean = false;
    public _castPopulated: boolean = false;

    /** True once this host has laid down any born-with contents. */
    public hasPopulated(): boolean {
      return this._propsPopulated || this._castPopulated;
    }

    /** Phase 2 applier for `props:`. See class docstring. */
    async applyProps(specs: PopulateSpec[]): Promise<void> {
      if (!Array.isArray(specs)) return;
      if (this._propsPopulated) return;
      await this.populateList(specs, 'props');
      // Set after a successful run: a throw mid-list is a content bug
      // that aborts the clone, and leaving the flag clear keeps the
      // half-populated shell out of the "already done" state.
      this._propsPopulated = true;
    }

    /** Phase 2 applier for `cast:`. See class docstring. */
    async applyCast(specs: string[]): Promise<void> {
      if (!Array.isArray(specs)) return;
      if (this._castPopulated) return;
      await this.populateList(specs, 'cast');
      this._castPopulated = true;
    }

    /**
     * The shared minting walk. Class resolution goes through
     * `StuffApi.loadClassByPath` — the existing public class-loading
     * Api surface — which is also where the designation gate sits:
     * the class is checked against `Mixins.Behaved` BEFORE anything is
     * cloned, so a mis-filed entry never leaves a half-minted NPC
     * behind.
     */
    private async populateList(
      specs: PopulateSpec[],
      kind: 'props' | 'cast'
    ): Promise<void> {
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
            `PopulatesMixin.apply${kind === 'props' ? 'Props' : 'Cast'}: ` +
              `no template at '${path}'`
          );
        }
        const cls = (await StuffApi.loadClassByPath(tpl.class)) as new (
          ...args: unknown[]
        ) => Stuff;
        // The designation gate: declared kind must match the class.
        const behaved = MixinApi.hasMixin(cls, Mixins.Behaved);
        if (kind === 'props' && behaved) {
          throw new Error(
            `PopulatesMixin.applyProps: '${path}' resolves to a Behaved ` +
              `class — that is cast, not props; list it under cast:`
          );
        }
        if (kind === 'cast' && !behaved) {
          throw new Error(
            `PopulatesMixin.applyCast: '${path}' does not resolve to a ` +
              `Behaved class — that is a prop, not cast; list it under props:`
          );
        }
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
              `PopulatesMixin.applyProps: '${path}' onto '${onto}' — ` +
                `the surface must be populated earlier in the list`
            );
          }
          if (!MixinApi.isSurfaced(surface)) {
            throw new Error(
              `PopulatesMixin.applyProps: onto '${onto}' is not a Surfaced host`
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
