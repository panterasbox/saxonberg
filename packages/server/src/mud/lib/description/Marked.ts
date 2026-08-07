/**
 * MarkedMixin — a thing that **bears marks**: a scroll, a spellbook, a
 * label, a signpost, a gravestone.
 *
 * The decision this exists for (requirements D33):
 *
 * > **read = perceive(the marks) + decode(the script)**
 *
 * `read` is not a flavour of `look`. Looking is one sense channel
 * resolving; reading is perception **plus symbolic decoding**, and the
 * two come apart in *both* directions — a sighted illiterate perceives
 * and cannot decode; a reader of embossed text decodes fine through a
 * different channel.
 *
 * So a written thing carries a **modality**, and what falls out of it is
 * mechanical rather than gestural:
 *
 * - **An embossed text is readable in the dark.** A real advantage worth
 *   paying for on an expedition, not a courtesy.
 * - A character without functioning sight is not excluded from the
 *   spellbook economy, and the mechanic that includes them is the *same
 *   one* that makes dark-reading work.
 *
 * **The modality vocabulary is `SenseChannel`, reused, not re-declared.**
 * Inked text is `vision`; embossed text is `touch`; a thing can be both.
 * That is deliberate: light already gates visual perception per-viewer,
 * and `senses.md` already owns the vocabulary, so this composes with
 * shipped machinery rather than adding any.
 *
 * **Literacy is out of scope for v1** — everyone reads the common
 * script. The decomposition leaves the seam in place: a literacy gate
 * would slot into `decode` without disturbing `perceive`, and the
 * spellbook comprehension floor is already a decoding gate in all but
 * name.
 *
 * Lives in `lib/description/` because bearing marks is not magic — a
 * signpost bears marks, and so does a shipping label.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { CommandContributions } from '../../api/command';
import type { SenseChannel } from './Perceiver';

/**
 * The channels a written thing's marks can be taken in through. A
 * strict subset of `SenseChannel` — you cannot smell a spellbook's
 * contents, and pretending otherwise would make the vocabulary lie.
 */
export const MARK_MODALITIES: readonly SenseChannel[] = ['vision', 'touch'];

/** The authored shorthand an item seed writes, and what each means. */
export const MARK_FORMS = {
  /** Ink on a surface — needs light. */
  inked: ['vision'] as readonly SenseChannel[],
  /** Raised or incised — readable by hand, and therefore in the dark. */
  embossed: ['touch'] as readonly SenseChannel[],
  /** Both, and the expensive one to make. */
  both: ['vision', 'touch'] as readonly SenseChannel[],
} as const;

/** An authored mark form — one of the {@link MARK_FORMS} keys. */
export type MarkForm = keyof typeof MARK_FORMS;

/**
 * **The second axis: what symbol system the marks are in.**
 *
 * `form` and `script` are independent, and collapsing them is the thing
 * this field exists to undo:
 *
 * | | how it is MADE (form) | what system it is IN (script) | gates |
 * |---|---|---|---|
 * | raised common lettering | embossed | common | perceive: touch **and** vision |
 * | braille | embossed | braille | perceive: touch · decode: braille |
 * | a ciphered dispatch | inked | cipher | perceive: vision · decode: cipher |
 *
 * Braille is the case that proves they are two axes: it is touch-only
 * **and** its own system, while raised common letters are touch-*and*-
 * vision in the ordinary system. Under one field both are just
 * "embossed".
 *
 * The pleasing symmetry, and the reason to ship this before any literacy
 * content: **braille and cipher are the same field pointed in opposite
 * directions** — one includes a reader through a different channel, the
 * other excludes one through a different system. Same machinery.
 *
 * ⚠ **v1 has exactly one script and no literacy.** Everything is
 * `common` and everyone reads it; anything else is *withheld*, never
 * mangled (scrambled text in a text game is indistinguishable from a
 * bug). The reader-side lookup — "which systems does this character
 * know?" — is the one seam a literacy build adds, and it lands in
 * `decode` without disturbing `perceive`.
 */
export const MARK_SCRIPTS = {
  /** The common script. Everyone reads it; the overwhelming default. */
  common: 'common',
  /** Raised dots. Touch-native, and its own system. */
  braille: 'braille',
  /** Deliberately obscured. The exclusion case. */
  cipher: 'cipher',
} as const;

/** An authored script — one of the {@link MARK_SCRIPTS} keys. */
export type MarkScript = keyof typeof MARK_SCRIPTS;

/** The script every character can read in v1. */
export const COMMON_SCRIPT: MarkScript = 'common';

export interface Marked {
  /** The text the marks carry. Empty = blank. */
  getMarkText(): string;
  setMarkText(text: string): void;
  /** The authored form (`inked` · `embossed` · `both`). */
  getMarkForm(): MarkForm;
  setMarkForm(form: string): void;
  /**
   * The sense channels these marks can be perceived through — the
   * derived half of the form. `read` gates on this.
   */
  getMarkModalities(): readonly SenseChannel[];
  /**
   * **Does perceiving these marks need light?** True iff the marks are
   * vision-only. Embossed text bypasses the light gate entirely, which
   * is the whole mechanical payoff of the decomposition.
   */
  requiresLightToRead(): boolean;
  /** The symbol system the marks are in. See {@link MARK_SCRIPTS}. */
  getMarkScript(): MarkScript;
  setMarkScript(script: string): void;

  // ---------- storage (public for the Hydrator) ----------
  markText: string;
  markForm: string;
  markScript: string;
}

export function MarkedMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class MarkedMixin extends Base implements Marked {
    static _mixinName = 'MarkedMixin';

    /**
     * **The capability declares the verb; the item never does**
     * (requirements D23). A scroll does not say *"I grant read"* — it
     * bears marks, and that is sufficient. Written once here, and every
     * member of the capability gets it free: scrolls, spellbooks,
     * labels, signposts.
     *
     * Surfacing stays contextual (the list reflects what is actionable
     * *here*), which costs nothing because the affordance machinery
     * already computes reachability. What it must NOT do is vary with
     * anything hidden: a spent scroll still affords `read` (D34), or
     * the affordance list becomes a free state readout.
     */
    static commandContributions: CommandContributions = {
      self: [],
      peers: ['perception/read.yaml'],
      environment: ['perception/read.yaml'],
    };

    static fieldMeta: FieldMeta = {
      markText: { persistent: true, authorable: true },
      markForm: { persistent: true, authorable: true },
      markScript: { persistent: true, authorable: true },
    };

    /** What the marks say. */
    public markText: string = '';

    /** Ink is the ordinary case, so it is the default. */
    public markForm: string = 'inked';

    /** The common script is the ordinary case, so it is the default. */
    public markScript: string = COMMON_SCRIPT;

    public getMarkText(): string {
      return this.markText;
    }

    public setMarkText(text: string): void {
      this.markText = typeof text === 'string' ? text : '';
    }

    public getMarkForm(): MarkForm {
      return (this.markForm in MARK_FORMS ? this.markForm : 'inked') as MarkForm;
    }

    public setMarkForm(form: string): void {
      if (!(form in MARK_FORMS)) {
        throw new RangeError(
          `markForm: unknown form '${form}' (expected ${Object.keys(MARK_FORMS).join(' | ')})`,
        );
      }
      this.markForm = form;
    }

    public getMarkModalities(): readonly SenseChannel[] {
      return MARK_FORMS[this.getMarkForm()];
    }

    public requiresLightToRead(): boolean {
      return !this.getMarkModalities().includes('touch');
    }

    public getMarkScript(): MarkScript {
      return (
        this.markScript in MARK_SCRIPTS ? this.markScript : COMMON_SCRIPT
      ) as MarkScript;
    }

    public setMarkScript(script: string): void {
      if (!(script in MARK_SCRIPTS)) {
        throw new RangeError(
          `markScript: unknown script '${script}' (expected ${Object.keys(
            MARK_SCRIPTS,
          ).join(' | ')})`,
        );
      }
      this.markScript = script;
    }
  };
}
