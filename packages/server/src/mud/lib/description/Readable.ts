/**
 * Readable — ⭐ **a thing you can read** (controller-liquidity W8).
 *
 * `read` was decided in its controller: a SCREEN is read off what it shows,
 * a written thing by its marks, a book at the page named — three faces told
 * apart by `isMarked`/`isDisplay`/`instanceof Book`. Each is the host's own
 * answer now: `DisplayMixin` (what the screen shows, live), `MarkedMixin`
 * (perceive the marks, decode the script — requirements D33's `read =
 * perceive + decode` — and what reading teaches), and the paper leaves over
 * it (`Book` opens at the page first).
 *
 * The answer is wordless (the act convention): the facts of what was read,
 * or a refusal and its facts. The verb words both.
 *
 * IS: the read. IS NOT: `look` (one sense channel resolving), nor `recite`
 * (a scroll fires aloud; `read` never casts).
 */

import type { Stuff } from '../stuff/Stuff';
import type { MixinConstructor } from '../mixin';
import type { ActOutcome, ActRefusal } from '../craft/ActPlan';
import type { Mml } from '../../api/mml';

/** What was read. */
export type Reading =
  /** A screen: what it shows (`null` = dark). A lit screen is its own light. */
  | { kind: 'screen'; shown: Mml | null }
  /**
   * The maker's mark felt or seen where the writing cannot be made out —
   * `hasText` says whether there is writing there too.
   */
  | { kind: 'device'; device: string; hasText: boolean }
  /**
   * The writing as THIS reader reads it (the hands named as they know the
   * writers; `''` = blank), whose mark it bears, and what reading it taught
   * the reader (a chart's places, a printed recipe's known-of), if anything.
   */
  | { kind: 'marks'; text: string; device: string | null; taught: string | null };

/**
 * ⭐ Every reason a read is refused — `read` words each.
 * `not-a-book`: a page was named of a thing with none; `no-such-page`;
 * `too-dark-to-read` (inked marks need light) · `no-channel-for-marks` (no
 * sense of the reader's reaches them); `script-unknown` (the literacy seam).
 */
export type ReadRefusal =
  | ActRefusal<'not-a-book'>
  | ActRefusal<'no-such-page', { pages: number }>
  | ActRefusal<'too-dark-to-read'>
  | ActRefusal<'no-channel-for-marks'>
  | ActRefusal<'script-unknown', { script: string }>;

/** A read done: what was read. */
export type ReadDone = ActOutcome<Reading>;

/** A thing you can read. */
export interface Readable {
  /**
   * Read it, as `viewer` — at `page` when one is named (a book opens there).
   */
  readFor(viewer: Stuff, page?: number): Promise<ReadDone | ReadRefusal>;
}

/**
 * ⭐ **`ReadableMixin` — the read protocol, as a mixin.** Composed by the
 * hosts' own mixins (`MarkedMixin`, `DisplayMixin`), never by a class.
 *
 * ⚠ The default REFUSES nothing it could not know: it reads as blank marks
 * (a host overrides `readFor`).
 */
export function ReadableMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class ReadableMixin extends Base implements Readable {
    static _mixinName: string = 'ReadableMixin';
    static _mixinKind = 'protocol' as const;

    /** @hook What reading this gives `viewer`; the default is blank. */
    public async readFor(_viewer: Stuff, page?: number): Promise<ReadDone | ReadRefusal> {
      if (page !== undefined) return { ok: false, reason: 'not-a-book' };
      return { ok: true, facts: { kind: 'marks', text: '', device: null, taught: null } };
    }
  };
}
