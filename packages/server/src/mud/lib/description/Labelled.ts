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
import type { Stuff } from '../stuff/Stuff';
import type { ActOutcome, ActRefusal } from '../craft/ActPlan';
import type { PartChoices, PartRefusal, Soil } from '../husbandry/Soil';

/** Longest label we will store. Long enough for a sentence, not a novel. */
const MAX_LABEL_LENGTH = 120;

/** What `label` asks: the words to write (`''` clears) and the part of a field named (`at`). */
export interface LabelRequest {
  text: string;
  part: (Stuff & Soil) | null;
}

/** What the label act did — the controller words each. */
export type LabelFacts =
  | { kind: 'cleared'; had: boolean }
  | { kind: 'written'; label: string }
  /** ⭐ A crop in a field: ONE plant marked out of the stand, named by the label. */
  | { kind: 'marked'; called: string; label: string; part: (Stuff & Soil) | null; ground: Stuff };

/**
 * Every reason a label act refuses (controller-liquidity W7c) — closed.
 * `part-not-ground` — `at <part>` names a part of a field, and this is not a
 * crop standing in one; `not-rooted` — the crop stands in nothing;
 * `nothing-sown-there` — nothing of its kind stands at the part named.
 */
export type LabelRefusal =
  | ActRefusal<'part-not-ground'>
  | ActRefusal<'not-rooted'>
  | ActRefusal<'nothing-sown-there', { part: (Stuff & Soil) | null }>
  | PartRefusal;

/** What `labelBy` answers. */
export type LabelAnswer = ActOutcome<LabelFacts> | LabelRefusal | PartChoices;

export interface Labelled {
  /**
   * ⭐ The `label` act (controller-liquidity W7c): write `req.text` on this
   * (or clear it), or — a crop standing in a field (`Plant` overrides) —
   * mark one plant of it out under the label. The thing decides which.
   */
  labelBy(actor: Stuff, req: LabelRequest): Promise<LabelAnswer>;
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

  // ---------- storage (public for the applier) ----------
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
      peers: ['platform/cmd/inventory/label.yaml'],
      environment: ['platform/cmd/inventory/label.yaml'],
    };

    static fieldMeta: FieldMeta = {
      // Persistent, and NOT a stack-identity field: identity keys on
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

    /** @hook The label act. Default: write it on this (or rub it off); a part names nothing here. */
    public async labelBy(_actor: Stuff, req: LabelRequest): Promise<LabelAnswer> {
      if (req.part !== null) return { ok: false, reason: 'part-not-ground' };
      const text = req.text.trim();
      if (text.length === 0) {
        const had = this.isLabelled();
        this.setLabel('');
        return { ok: true, facts: { kind: 'cleared', had } };
      }
      this.setLabel(text);
      // What was STORED, not what was typed: the setter trims and caps.
      return { ok: true, facts: { kind: 'written', label: this.getLabel() } };
    }
  };
}
