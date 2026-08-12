/**
 * LabelledMixin — a player-written name on a thing.
 *
 * ## Why this exists at all
 *
 * Derived appearance (magic-items D26) buys a great deal by storing
 * nothing, and it costs one thing: **a player's out-of-character memory
 * outruns their character's.** A flask you *know* is healing comes back
 * unlabelled after a rotation. That is a normal roguelike situation, and
 * this is the fix — a careful player's stash survives a rotation with
 * their own names intact.
 *
 * ## Built as general annotation, not a potions feature
 *
 * Deliberately (D28). It serves storage ("winter seed"), shops ("do not
 * sell"), and gifts ("for Mira") every bit as much as it serves an
 * unidentified flask, and a potions-only version would have been the
 * same code with a smaller reach.
 *
 * Lives in `lib/description/` for the same reason `Marked` does: writing
 * a name on something is not magic.
 *
 * ## Two consequences the identification build depends on
 *
 * - **A labelled item does not auto-merge** (AC 22). The label is
 *   per-instance and a player put it there on purpose; folding it
 *   silently into a stack would destroy information they created.
 * - **A label survives a generation change** (AC 19), because it is
 *   stored and appearance is not. That asymmetry is the whole point:
 *   what the *world* calls the thing rotates, what *you* call it does
 *   not.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { CommandContributions } from '../../api/command';

/** Longest label we will store. Long enough for a sentence, not a novel. */
const MAX_LABEL_LENGTH = 120;

export interface Labelled {
  /** The player's own name for this thing. `''` = unlabelled. */
  getLabel(): string;
  /**
   * Set (or, with `''`, clear) the label. Trimmed and length-capped —
   * an over-long label is truncated rather than refused, because losing
   * the tail of a note is better than losing the note.
   */
  setLabel(value: string): void;
  /** Does this carry a player-written label? */
  isLabelled(): boolean;

  // ---------- storage (public for the Hydrator) ----------
  label: string;
}

export function LabelledMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class LabelledMixin extends Base implements Labelled {
    static _mixinName = 'LabelledMixin';

    /**
     * `label` is universal-by-capability: anything that can be labelled
     * affords it wherever you can reach it. It keys on nothing hidden
     * (D34) — every labellable thing affords it identically, labelled or
     * not, so the list never tells you whether a thing is annotated.
     */
    static commandContributions: CommandContributions = {
      self: [],
      peers: ['inventory/label.yaml'],
      environment: ['inventory/label.yaml'],
    };

    static fieldMeta: FieldMeta = {
      // Persistent, and NOT a glob-identity field: identity keys on
      // class + BUC-bucket, and a labelled item is kept out of merges by
      // the `canMergeWith` veto instead. Putting it in identity would
      // let two identically-labelled stacks merge, which is fine, but
      // would also mean an UNLABELLED item and a labelled one differ by
      // an identity field rather than by an explicit refusal — and the
      // explicit refusal is what carries the intent.
      label: { persistent: true, authorable: true },
    };

    /** The player's own name for this thing. */
    public label: string = '';

    public getLabel(): string {
      return this.label;
    }

    public setLabel(value: string): void {
      const text = typeof value === 'string' ? value.trim() : '';
      this.label = text.slice(0, MAX_LABEL_LENGTH);
    }

    public isLabelled(): boolean {
      return this.label.length > 0;
    }
  };
}
