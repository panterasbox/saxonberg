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
import type { Stuff } from '../stuff/Stuff';
import { MixinApi } from '../../api/mixin';

/** How wet inked paper must be before the ink runs (0..1). */
const INK_RUNS_AT = 0.5;

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
  /**
   * ⭐ How many more characters this surface takes (underwater review): 0
   * for a thing that takes no writing (a printed book, a carved stone).
   */
  getWritingRoom(): number;
  setWritingRoom(chars: number): void;
  /**
   * ⭐ `write <words> on <this>` — the world's verb for putting words on a
   * thing (underwater review; the diver's slate was its first surface).
   * Added after what is there; how it reads is this surface's own form
   * (ink needs light and runs when wet; a scratch does not). Refusals in
   * words. ⛔ There is no private writing: what is written here, anyone
   * who can read it reads — a note to yourself is writing on a thing of
   * your own.
   */
  writeOn(by: Stuff, words: string): { ok: true; line: string } | { ok: false; reason: string; line: string };

  // ---------- storage (public for the applier) ----------
  markText: string;
  markForm: string;
  markScript: string;
  writingRoom: number;
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
      // ⭐ `write` beside `read`: a surface with no room says so in words.
      peers: ['platform/cmd/perception/read.yaml', 'platform/cmd/inventory/write.yaml'],
      environment: ['platform/cmd/perception/read.yaml', 'platform/cmd/inventory/write.yaml'],
    };

    static fieldMeta: FieldMeta = {
      markText: { persistent: true, authorable: true },
      markForm: { persistent: true, authorable: true },
      markScript: { persistent: true, authorable: true },
      writingRoom: { persistent: true, authorable: true },
    };

    /** What the marks say. */
    public markText: string = '';

    /** Ink is the ordinary case, so it is the default. */
    public markForm: string = 'inked';

    /** The common script is the ordinary case, so it is the default. */
    public markScript: string = COMMON_SCRIPT;

    /** Characters this surface still takes; 0 takes no writing (the default). */
    public writingRoom: number = 0;

    /**
     * ⭐ What the marks say — unless they were inked on something you can
     * carry that has been soaked (underwater D29 seam 2): the ink has run.
     * Drying it does not bring the words back; the text is still stored,
     * the reading is what failed. Fixed things (a sign in the rain) and
     * marks that are not ink (chalk, a scratched slate) are unaffected.
     */
    public getMarkText(): string {
      const self = this as unknown as Stuff;
      if (
        this.markForm === 'inked' &&
        this.markText !== '' &&
        MixinApi.isWet(self) &&
        self.getWetness() >= INK_RUNS_AT &&
        !(MixinApi.isContainable(self) && self.isFixedInPlace())
      ) {
        return 'The ink has run; nothing of it can be read.';
      }
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

    public getWritingRoom(): number {
      return Math.max(0, Math.floor(this.writingRoom || 0));
    }

    public setWritingRoom(chars: number): void {
      this.writingRoom = Number.isFinite(chars) && chars > 0 ? Math.floor(chars) : 0;
    }

    public writeOn(by: Stuff, words: string): { ok: true; line: string } | { ok: false; reason: string; line: string } {
      const self = this as unknown as Stuff;
      const text = words.trim();
      if (text === '') return { ok: false, reason: 'nothing-to-write', line: 'Write what?' };
      if (this.getWritingRoom() <= 0) {
        return { ok: false, reason: 'no-room', line: `There is nowhere to write on ${self.getPresentation()}.` };
      }
      // A thing you can carry, you write on in your hands; a fixed one
      // (a wall, a board) where it stands.
      const held = MixinApi.isContainable(self) && self.getContainer() === by;
      const fixed = MixinApi.isContainable(self) && self.isFixedInPlace();
      if (!held && !fixed) {
        return { ok: false, reason: 'not-holding', line: `You need ${self.getPresentation()} in your hand to write on it.` };
      }
      const before = this.markText.trim();
      const next = before === '' ? text : `${before} / ${text}`;
      if (next.length - before.length > this.getWritingRoom()) {
        return { ok: false, reason: 'full', line: `There is no room left on ${self.getPresentation()} for that.` };
      }
      this.writingRoom = this.getWritingRoom() - (next.length - before.length);
      this.markText = next;
      const how = this.getMarkForm() === 'inked' ? 'write' : 'scratch';
      return { ok: true, line: `You ${how} "${text}" on ${self.getPresentation()}.` };
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
