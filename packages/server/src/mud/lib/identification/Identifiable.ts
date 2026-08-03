/**
 * IdentifiableMixin — marks an item whose **type** is hidden until
 * identified: a "blue potion" that is really "a potion of healing".
 *
 * The item's ordinary presentation (`shortDescription` →
 * `getPresentation()`) is the *unidentified* appearance — what a naive
 * observer sees. `identifiedName` is the true type, revealed by
 * `RecognitionApi.describe` only to a viewer who has identified it (an
 * `IDENTIFICATION`-realm belief record keyed by the item's
 * `templatePath`).
 *
 * This is the **type axis** — class knowledge, not instance memory. It
 * inverts the recognition (creature) direction: a creature's baseline is
 * its true name and `describe` *hides* it; an item's baseline is the
 * unidentified look and `describe` *reveals* the true type. Both compose
 * — a recognized, type-identified actor reads with both.
 *
 * v1 is binary (unidentified ↔ identified); partial identification and
 * the pedagogical instrument seam (`analyze X with Y`) are a separate
 * later build. Item-identity *illusion* (a poison masquerading as
 * healing) reuses this shape by design but ships no content here.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { SecurityApi } from '../../api/security';
import { Appearance } from './Appearance';
import { DescriptorBank } from './DescriptorBank';

export interface Identifiable {
  /** The true type name revealed on identification ("a potion of healing"). */
  getIdentifiedName(): string;
  setIdentifiedName(value: string): void;

  /**
   * Which {@link DescriptorBank} this item draws its unidentified look
   * from (`potion`, `wand`, `ring`, …). Empty = no derived appearance;
   * the item falls back to its authored short description.
   */
  getDescriptorClass(): string;
  setDescriptorClass(value: string): void;

  /**
   * **Does using this teach you what it was?**
   *
   * D24 defines the identify scroll as *"the paid shortcut past
   * experiment — the thing you buy instead of drinking the unknown
   * flask and finding out."* This is *finding out*: the experiment the
   * scroll is a shortcut past. Without it the scroll is a shortcut past
   * nothing.
   *
   * **A flag, not a derivation** — deliberately. Whether an outcome is
   * self-evident is not reliably computable: a healing draught announces
   * itself, a slow poison does not, and a potion that does nothing at
   * all is indistinguishable from one that failed. The author knows;
   * the engine cannot. Same shape as `Marked.markForm`.
   *
   * ⚠ It fires **only on a working that actually fired**. A refused
   * discharge — no mark, no charge, suppressed by a ward — must teach
   * nothing, or the failure itself becomes an identification channel:
   * exactly the D34 leak shape, one layer down.
   */
  identifiesOnUse(): boolean;
  setIdentifiesOnUse(value: boolean): void;

  /**
   * This item's stable position in the turnover window, as a persisted
   * seed string. Minted once on first read and never changed — it stores
   * a **position**, not an appearance.
   */
  getTurnoverSeed(): string;

  /**
   * **The derived unidentified appearance**, or `''` when this item has
   * no descriptor class or its bank is unseeded.
   *
   * Sync by construction: this renders inside `getPresentation` and
   * inside the merge ripple's `canMergeWith`, neither of which can
   * await. Banks are warmed at boot and read from the cache.
   */
  renderAppearance(generation: number, progress: number): string;

  // ---------- storage (public for the Hydrator) ----------
  identifiedName: string;
  descriptorClass: string;
  turnoverSeed: string;
  selfIdentifying: boolean;
}

export function IdentifiableMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class IdentifiableMixin extends Base implements Identifiable {
    static _mixinName = 'IdentifiableMixin';

    static fieldMeta: FieldMeta = {
      identifiedName: { persistent: true, authorable: true },
      descriptorClass: { persistent: true, authorable: true },
      selfIdentifying: { persistent: true, authorable: true },
      // ⚠ Persistent but deliberately NOT a glob-identity field — every
      // item carries a different seed, so keying identity on it would
      // stop stacks merging at all. It records WHEN this item crosses
      // the turnover window, which is invisible and confers nothing.
      turnoverSeed: { persistent: true },
    };

    /** The true type name revealed on identification. */
    public identifiedName: string = '';

    /** Which descriptor bank to draw the unidentified look from. */
    public descriptorClass: string = '';

    /**
     * Does using this teach you what it was? Default `false` — most
     * things reveal nothing, and a permissive default would quietly
     * identify the whole catalogue on first contact.
     */
    public selfIdentifying: boolean = false;

    /** Stable window position. Minted lazily; never reassigned. */
    public turnoverSeed: string = '';

    getIdentifiedName(): string {
      return this.identifiedName;
    }

    setIdentifiedName(value: string): void {
      this.identifiedName = value;
    }

    identifiesOnUse(): boolean {
      return this.selfIdentifying === true;
    }

    setIdentifiesOnUse(value: boolean): void {
      this.selfIdentifying = value === true;
    }

    getDescriptorClass(): string {
      return this.descriptorClass;
    }

    setDescriptorClass(value: string): void {
      this.descriptorClass = typeof value === 'string' ? value : '';
    }

    getTurnoverSeed(): string {
      if (this.turnoverSeed.length === 0) {
        // Minted on FIRST READ rather than in a constructor, so a
        // hydrated item keeps the seed it was stored with and a fresh
        // clone gets its own. Merging shifts an absorbed item's flip
        // moment to the survivor's — D27 declares that invisible, and it
        // is: a stack is a batch, and batches turn over as batches.
        this.turnoverSeed = SecurityApi.uuid();
      }
      return this.turnoverSeed;
    }

    renderAppearance(generation: number, progress: number): string {
      if (this.descriptorClass.length === 0) return '';
      const bank = DescriptorBank.cached(this.descriptorClass);
      if (!bank) return '';
      return Appearance.renderFor(
        this.descriptorClass,
        generation,
        progress,
        this.getTurnoverSeed(),
        bank,
      ).descriptor;
    }
  };
}
