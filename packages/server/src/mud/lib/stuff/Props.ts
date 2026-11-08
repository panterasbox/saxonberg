/**
 * PropsMixin — a host BORN WITH things: the `props:` designation, the set
 * dressing of a room and the loadout of a person. The theatre vocabulary
 * (`props:` · `cast:` · `costume:`), the run-once rule and the designation
 * gate are told in full at `./Staged` (`StagedMixin` composes this half
 * under the troupe) and `./Costumed`.
 *
 * ⭐ The minting walk — class resolution, the `Behaved` designation gate,
 * singletons, `count:`, placement keys — is ONE static,
 * `Template._stageEntries`, beside the `by-entry` merge that reads the same
 * entries; the cast half calls it with `'cast'`.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from './Stuff';
import type { Container } from '../spatial/Container';

/**
 * One `props` entry. A bare path string moves the spawned instance
 * **into** self (containment); the object form places it under a
 * **placement** — ⭐ the key IS the member's name, so
 * `{ template: …, on: …/well }` sets it on the well,
 * `{ template: …, from: …/meat-hook }` hangs it from the hook, and a
 * member a pack adds tomorrow needs no change here.
 *
 * The value names another entry's `as` or path (a `Placing` host) that
 * must appear **earlier** in the list, so it is already populated. Exactly
 * one placement key per entry; two is an authoring error.
 *
 * Reserved keys — `template`, `as`, `count` — are the entry's own; every
 * other key is read as a member name.
 *
 * A `cast` entry is a bare path string only — the troupe stands in the
 * room; it is not placed on furniture.
 */
export type PropSpec =
  | string
  | ({ template: string; as?: string; count?: number } & {
      [member: string]: unknown;
    });

/**
 * ⭐ **The props-only half — a host BORN WITH things** (split out of
 * `StagedMixin` at the storage-and-ice sweep; its own file since
 * controllers-are-io). `props:` is the set
 * dressing of a room AND the loadout of a person; `cast:` is people, and
 * only a place has a troupe. Bundled, a person who boots holding a saw had
 * to claim it contains a cast (the reason `Gus`, `Katie`, `Walter`, the
 * `Realtor` and the `Tinker` each grew a class) — and a plain `Cast` row's
 * `props:` was dropped in SILENCE, because the field was undeclared on it
 * (the ice crew, the Rejection hewers, the wharfside fisher: authored with
 * tools, born with empty hands). `NPC` composes this half; `StagedMixin`
 * ({@link ./Staged}) composes it under the cast half.
 */
export interface Propped {
  /**
   * @hook Invoked by the `TemplateApplier`'s Phase-2 instruction dispatch from
   *   a template's `props` field. **Instruction applier** — consumes
   *   the spec during hydration to spawn the host's born-with props;
   *   the spec is not retained and there is no paired getter (not a
   *   property). Throws on an entry whose class composes `Behaved`
   *   (that is cast, not props).
   *
   *   ⭐ Runs **once per instance**: a no-op once this host's props are
   *   laid, so a go-live re-hydrate does not mint a second set.
   */
  applyProps(specs: PropSpec[]): Promise<void>;

  /** Storage for the props once-guard (public for the applier). */
  _propsStaged: boolean;
}

export function PropsMixin<
  TBase extends MixinConstructor<Stuff & Container>,
>(Base: TBase) {
  return class PropsMixin extends Base {
    static _mixinName: string = 'PropsMixin';

    /**
     * One instruction field. The once-flag is runtime state, never
     * authored: set by the applier itself so a go-live re-hydrate cannot
     * mint a second set; persistent so the fact survives a capture/restore.
     */
    static fieldMeta: FieldMeta = {
      props: { instruction: true, authorable: true, inherit: 'by-entry' },
      _propsStaged: { persistent: true, runtimeState: true },
    };

    public _propsStaged: boolean = false;

    /** Phase 2 applier for `props:`. See class docstring. */
    async applyProps(specs: PropSpec[]): Promise<void> {
      if (!Array.isArray(specs)) return;
      if (this._propsStaged) return;
      const { Template } = await import('./Template');
      await Template._stageEntries(
        this as unknown as Stuff & Container,
        specs,
        'props',
      );
      // Set after a successful run: a throw mid-list is a content bug
      // that aborts the clone, and leaving the flag clear keeps the
      // half-populated shell out of the "already done" state.
      this._propsStaged = true;
    }
  };
}
