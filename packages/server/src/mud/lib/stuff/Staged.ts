/**
 * StagedMixin — declarative born-with content for Container hosts,
 * in the theatre vocabulary: **props** and **cast**.
 *
 * ## ⭐⭐ Why `Staged` and not `Populates`
 *
 * Renamed at review (2026-09-25), and the motif was already here waiting
 * for it: `platform/location/Offstage` is a real clonable room and
 * `lib/employment/OffstageMixin` is the role, so **off-shift cast are
 * already parked offstage**. A host that has laid out its set and filled
 * it with people is therefore *staged*, and the two words are each
 * other's counterpart rather than two metaphors sharing a codebase.
 *
 * `Populates` said only that something got filled in, which is true of
 * any write; it named the mechanism's effect rather than the concept, and
 * it did not survive contact with the third designation — nobody would
 * guess that *populating* a person means dressing them. ⭐ In the theatre
 * reading the family is one sentence: **staging a scene means dressing
 * the set (`props:`), filling it with the troupe (`cast:`), and putting
 * them in costume (`costume:`).** The last of those is
 * {@link CostumedMixin} (`./Costumed`), because its host is a body rather
 * than a place. The props half alone is {@link PropsMixin} (`./Props`).
 *
 * `Scene` was the other candidate and is taken — `MessageApi.scene` and
 * the Scene composer, 49 files of it.
 *
 * ⚠ `_propsStaged` / `_castStaged` are **persistent** fields, so this
 * rename orphans their old keys on any existing row. No migration, by
 * project rule: a dev DB is dropped and reseeded.
 *
 * Composes onto `Container` (`Stuff & Container`) and declares two
 * instruction fields, applied by Phase 2 of the applier's two-phase
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
 *     singleton lives wherever it was first placed (a seat,
 *     another host's list, player action).
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
import type { Propped, PropSpec } from './Props';


/**
 * A `cast` or `costume` entry. The object form exists for ONE reason:
 * `as` — the entry's identity, so a child row can say *the same jacket
 * slot, a different jacket* rather than appending a second one.
 */
export type CastSpec = string | { template: string; as?: string };


/**
 * Public shape provided by StagedMixin: the props half plus the troupe.
 */
export interface Staged extends Propped {
  /**
   * @hook Invoked by the `TemplateApplier`'s Phase-2 instruction dispatch from
   *   a template's `cast` field. **Instruction applier** — mints the
   *   host's troupe. Throws on an entry whose class does NOT compose
   *   `Behaved` (that is a prop, not cast).
   *
   *   ⭐ Runs **once per instance**, same guard discipline as
   *   {@link Propped.applyProps}.
   */
  applyCast(specs: CastSpec[]): Promise<void>;

  /** Whether this host has already laid down its born-with contents
   * (props, cast, or both). */
  isStaged(): boolean;

  /** Storage for the cast once-guard (public for the applier). */
  _castStaged: boolean;
}

/**
 * ⭐ A PLACE that is born dressed and peopled: `props:` AND `cast:`.
 * Flat, not `cast` over {@link PropsMixin} — one more level of nested
 * mixin inference collapses the deep stacks (`GardenBed`, `PlantPot`) to
 * `never` (re-measured at controllers-are-io). Over an `NPC` (the loadout
 * classes, `CastMixin(StagedMixin(NPC))`) its `applyProps` simply
 * overrides the props half's: one field, one once-flag, one walk
 * (`Template.stageEntries`).
 */
export function StagedMixin<
  TBase extends MixinConstructor<Stuff & Container>,
>(Base: TBase) {
  return class StagedMixin extends Base {
    static _mixinName: string = 'StagedMixin';

    static fieldMeta: FieldMeta = {
      props: { instruction: true, authorable: true, inherit: 'by-entry' },
      cast: { instruction: true, authorable: true, inherit: 'by-entry' },
      _propsStaged: { persistent: true, runtimeState: true },
      _castStaged: { persistent: true, runtimeState: true },
    };

    public _propsStaged: boolean = false;
    public _castStaged: boolean = false;

    /** Phase 2 applier for `props:` — the same walk {@link PropsMixin} runs. */
    async applyProps(specs: PropSpec[]): Promise<void> {
      if (!Array.isArray(specs)) return;
      if (this._propsStaged) return;
      const { Template } = await import('./Template');
      await Template.stageEntries(
        this as unknown as Stuff & Container,
        specs,
        'props',
      );
      this._propsStaged = true;
    }

    /** True once this host has laid down any born-with contents. */
    public isStaged(): boolean {
      return this._propsStaged || this._castStaged;
    }

    /** Phase 2 applier for `cast:`. See class docstring. */
    async applyCast(specs: CastSpec[]): Promise<void> {
      if (!Array.isArray(specs)) return;
      if (this._castStaged) return;
      const { Template } = await import('./Template');
      await Template.stageEntries(
        this as unknown as Stuff & Container,
        specs,
        'cast',
      );
      this._castStaged = true;
    }
  };
}
