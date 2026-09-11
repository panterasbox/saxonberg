/**
 * NounPhrase — ⭐⭐ **what a thing is called, before anybody decides how
 * to say it.**
 *
 * A stem, a register and a count. From those three the prose layer
 * *derives* everything it used to guess at from a string: the article,
 * the definite form, the possessive, the plural.
 *
 * ## Why this exists
 *
 * For the life of the project the article lived **inside the authored
 * text** — 611 of 634 shipped descriptions begin with one an author
 * typed by hand. That made three ordinary sentences impossible to write:
 *
 *   - *"the collie"* — you cannot say it without editing the string;
 *   - *"two collies"* — the plural has to be spliced past the article;
 *   - *"the collie's paw"* — the possessive has nowhere to attach.
 *
 * And it made one sentence wrong: the helper that adds an article was a
 * vowel check that could not tell whether the text already had one, so
 * `article(x)` on `"a heavy door"` answered **"an"**.
 *
 * ## The register is not a new taxonomy
 *
 * It is the one the content has been encoding by hand all along, and the
 * one the identity rungs are already defined by — the *somebody* rung's
 * own description leads with *"**The** collier"*, the *role* rung's with
 * *"**A** sentry."* Both rungs are defined by their article.
 *
 * | register | reads as | who |
 * |---|---|---|
 * | `proper` | `Odile` | somebody, with a name |
 * | `definite` | `the collier` | somebody, without one |
 * | `indefinite` | `a sentry` | a role, one of many |
 *
 * ⚠ **A stem never carries an article.** `lint:presentation` gates it;
 * the whole point is that the article is derived, and a stem that
 * smuggles one in renders *"a a sentry"*.
 *
 * ⭐ **Deliberately a value object, not a mixin.** It is the module's one
 * concept — the `Light` / `Quantity` home — and nothing inherits it:
 * `Stuff.presentationPhrase()` builds one on demand from whatever rungs
 * the object actually composes.
 */

/** What article a thing's identity takes. A CLOSED vocabulary. */
export const REGISTERS = ['proper', 'definite', 'indefinite'] as const;
export type Register = (typeof REGISTERS)[number];

/**
 * What form of a thing's identity a sentence is asking for — the second
 * late-bound axis, resolved beside the viewer at render time.
 *
 * ⭐ The point is that **the sentence chooses, not the delivery shape.**
 * Before this, a surface got the rich form only if it could afford to
 * give up per-recipient naming, because the rich forms were resolved
 * eagerly for one known viewer. Room surveys could have status; emotes
 * could not — and that was an implementation consequence wearing the
 * costume of a design decision.
 *
 * | form | shows | wanted by |
 * |---|---|---|
 * | `bare` | the name alone | chat, when anonymity is off |
 * | `handle` | article + the short handle | chat, when anonymity is on |
 * | `concise` | the ordinary identity | act lines, emotes — most prose |
 * | `presence` | + what they are doing | the room survey |
 * | `distinguishing` | + what they are wearing | targeting, disambiguation |
 * | `formal` | the full name, honorific and suffix | profiles, documents |
 *
 * ⚠ `bare` and `handle` consult **no perception gate**: a channel is not
 * looking at you, so a hood does not reach it. That is the whole of the
 * disguise/anonymity split.
 */
export const PRESENTATION_FORMS = [
  'bare',
  'handle',
  'concise',
  'presence',
  'distinguishing',
  'formal',
] as const;
export type PresentationForm = (typeof PRESENTATION_FORMS)[number];

/** Whether `value` is one of the three registers. */
export function isRegister(value: unknown): value is Register {
  return (
    typeof value === 'string' && (REGISTERS as readonly string[]).includes(value)
  );
}

/** Whether `value` is one of the six forms. */
export function isPresentationForm(value: unknown): value is PresentationForm {
  return (
    typeof value === 'string' &&
    (PRESENTATION_FORMS as readonly string[]).includes(value)
  );
}

export class NounPhrase {
  private constructor(
    /** The bare noun, with NO article. `collie`, `city guard`, `Odile`. */
    public readonly stem: string,
    /** Which article this identity takes. */
    public readonly register: Register,
    /** How many there are. 1 unless a Globbable says otherwise. */
    public readonly count: number = 1,
    /** The plural stem, when the host knows a better one than `+s`. */
    public readonly plural?: string,
  ) {}

  /** A phrase from a stem and a register. */
  static of(stem: string, register: Register = 'indefinite'): NounPhrase {
    return new NounPhrase(stem.trim(), register);
  }

  /** A proper name — takes no article, ever. */
  static proper(stem: string): NounPhrase {
    return new NounPhrase(stem.trim(), 'proper');
  }

  /**
   * The indefinite article for a piece of text — a vowel check on the
   * first letter.
   *
   * ⭐ It reproduces **all 476** authored `a`/`an` choices in the shipped
   * content with zero mismatches, which is why the sweep that moved the
   * articles out needed no per-row override: the content has been obeying
   * this rule by hand since the beginning.
   *
   * ⚠ It is a spelling rule, not a phonetic one, so it says *"an hour"*
   * wrong and *"a ewe"* wrong. Neither has ever shipped, and the honest
   * fix when one does is an authored override on the row, not a
   * pronunciation dictionary in the kernel.
   */
  static articleFor(text: string): 'a' | 'an' {
    return /^[aeiou]/i.test(text.trim()) ? 'an' : 'a';
  }

  /** The same phrase, at a different count. */
  withCount(count: number, plural?: string): NounPhrase {
    return new NounPhrase(this.stem, this.register, count, plural ?? this.plural);
  }

  /** The same phrase in a different register. */
  withRegister(register: Register): NounPhrase {
    return new NounPhrase(this.stem, register, this.count, this.plural);
  }

  /** The article this phrase takes, or `''` for a proper name. */
  article(): string {
    if (this.register === 'proper') return '';
    if (this.register === 'definite') return 'the';
    return NounPhrase.articleFor(this.stem);
  }

  /** The noun alone — no article, no count. */
  bare(): string {
    return this.stem;
  }

  /** `the collie`; a proper name is already definite and stays bare. */
  definite(): string {
    return this.register === 'proper' ? this.stem : `the ${this.stem}`;
  }

  /** `a collie`; a proper name stays bare. */
  indefinite(): string {
    return this.register === 'proper'
      ? this.stem
      : `${NounPhrase.articleFor(this.stem)} ${this.stem}`;
  }

  /** `the collie's`, `Odile's`, `the collies'`. */
  possessive(): string {
    const base = this.render();
    return base.endsWith('s') ? `${base}'` : `${base}'s`;
  }

  /**
   * ⭐ **The shipped string** — what `getPresentation()` answers, and the
   * one rendering the 634-row golden holds to the byte.
   *
   * A count other than 1 wins over the register, because *"2 apples"* is
   * what a stack of two apples is called and no article belongs in front
   * of it.
   */
  render(): string {
    if (this.count !== 1) {
      return `${this.count} ${this.plural ?? `${this.stem}s`}`;
    }
    if (this.register === 'proper') return this.stem;
    if (this.register === 'definite') return `the ${this.stem}`;
    return `${NounPhrase.articleFor(this.stem)} ${this.stem}`;
  }

  toString(): string {
    return this.render();
  }
}
