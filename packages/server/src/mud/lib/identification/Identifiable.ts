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

import type { MixinConstructor } from '../mixin';

export interface Identifiable {
  /** The true type name revealed on identification ("a potion of healing"). */
  getIdentifiedName(): string;
  setIdentifiedName(value: string): void;
}

export function IdentifiableMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class IdentifiableMixin extends Base implements Identifiable {
    static _mixinName = 'IdentifiableMixin';

    static persistentFields = ['identifiedName'];

    public identifiedName: string = '';

    getIdentifiedName(): string {
      return this.identifiedName;
    }

    setIdentifiedName(value: string): void {
      this.identifiedName = value;
    }
  };
}
